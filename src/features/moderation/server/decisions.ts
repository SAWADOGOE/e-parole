import type { z } from "zod";
import { recordSystemEvent } from "@/features/notifications";
import { removeTarget, setTargetHidden } from "@/features/social";
import type { AdminActionOptions } from "@/server/actions/admin-action-core";
import { revokeAllSessions } from "@/server/auth/session-repository";
import type { TransactionClient } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import type { GlobalPermission, PolicyResource } from "@/server/policies";
import type { DecisionName } from "../constants";
import { caseRefSchema, decisionSchema } from "../schemas";
import {
  assignCase,
  closeCase,
  findCase,
  findHandle,
  findTargetRoles,
  insertAction,
  insertSanction,
  lockCase,
  reporterIds,
  setAccountStatus,
  type OpenCaseRow,
} from "./repository";

/** Permission évaluée pour chaque décision (docs/admin/ADMIN-ROLES-PERMISSIONS.md, Phase 3). */
export const DECISION_PERMISSION: Readonly<Record<DecisionName, GlobalPermission>> = {
  DISMISS: "moderation:case:resolve",
  WARN: "moderation:sanction:warn",
  HIDE: "content:hide",
  REMOVE: "content:remove",
  SUSPEND: "moderation:sanction:suspend",
  BAN: "moderation:sanction:ban",
};

type DecisionInput = z.infer<typeof decisionSchema>;

/** Ressource d'autorisation : auteur visé (hiérarchie) et durée (plafond 30 j du MODERATOR). */
async function decisionResource(input: DecisionInput): Promise<PolicyResource> {
  const found = await findCase(input.caseId);
  if (!found) throw new AppError("NOT_FOUND");
  if (!found.targetAuthorId) return {};
  return {
    targetUserId: found.targetAuthorId,
    targetGlobalRoles: await findTargetRoles(found.targetAuthorId),
    ...(input.durationDays !== null ? { durationDays: input.durationDays } : {}),
  };
}

async function applyEffect(tx: TransactionClient, decision: DecisionName, target: OpenCaseRow, input: DecisionInput, actionId: string, moderatorId: string): Promise<Date | null> {
  const content = target.targetType === "PROFILE" ? null : target.targetType;
  const authorId = target.targetAuthorId;
  switch (decision) {
    case "DISMISS":
      // Le masquage provisoire n'était qu'une précaution : il est levé si le dossier est sans suite.
      if (content && target.autoHiddenAt) await setTargetHidden(tx, content, target.targetId, false);
      return null;
    case "HIDE":
      if (!content) throw new AppError("VALIDATION", { fieldErrors: { decision: ["notApplicable"] } });
      await setTargetHidden(tx, content, target.targetId, true);
      return null;
    case "REMOVE":
      if (!content) throw new AppError("VALIDATION", { fieldErrors: { decision: ["notApplicable"] } });
      await removeTarget(tx, content, target.targetId);
      return null;
    case "WARN":
      if (!authorId) throw new AppError("VALIDATION");
      await insertSanction(tx, { userId: authorId, kind: "WARNING", caseId: target.id, actionId, issuedById: moderatorId, endsAt: null });
      return null;
    case "SUSPEND": {
      if (!authorId || input.durationDays === null) throw new AppError("VALIDATION");
      const until = new Date(Date.now() + input.durationDays * 86_400_000);
      await setAccountStatus(tx, authorId, "SUSPENDED", until);
      await revokeAllSessions(authorId, tx);
      await insertSanction(tx, { userId: authorId, kind: "SUSPENSION", caseId: target.id, actionId, issuedById: moderatorId, endsAt: until });
      return until;
    }
    case "BAN":
      if (!authorId) throw new AppError("VALIDATION");
      await setAccountStatus(tx, authorId, "BANNED", null);
      await revokeAllSessions(authorId, tx);
      await insertSanction(tx, { userId: authorId, kind: "BAN", caseId: target.id, actionId, issuedById: moderatorId, endsAt: null });
      return null;
    default: {
      const exhaustive: never = decision;
      return exhaustive;
    }
  }
}

/**
 * US-41 : décision sur un dossier, dans une seule transaction : effet + historique + sanction + notifications + audit
 * (l'audit est écrit par runAdminAction dans la même transaction). Ré-authentification exigée pour suspendre et bannir.
 */
export function decisionOptions(decision: DecisionName): AdminActionOptions<typeof decisionSchema, { caseId: string; decision: DecisionName }> {
  return {
    permission: DECISION_PERMISSION[decision],
    schema: decisionSchema,
    rateLimit: decision === "SUSPEND" || decision === "BAN" ? "admin.sanction" : "admin.action",
    resolveResource: decisionResource,
    handler: async ({ actor, input, tx }) => {
      if (input.decision !== decision) throw new AppError("VALIDATION");
      const target = await lockCase(tx, input.caseId);
      if (!target) throw new AppError("NOT_FOUND");
      if (target.status !== "OPEN" && target.status !== "IN_PROGRESS") throw new AppError("CONFLICT", { message: "Ce dossier est déjà traité." });
      // Séparation des tâches : on ne décide jamais d'un dossier qui vise son propre contenu ou son propre compte.
      if (target.targetAuthorId === actor.userId) throw new AppError("FORBIDDEN");
      if (decision === "SUSPEND" || decision === "BAN") {
        const expected = target.targetAuthorId ? await findHandle(tx, target.targetAuthorId) : null;
        if (!expected || input.confirmHandle.replace(/^@/, "").toLowerCase() !== expected.toLowerCase()) {
          throw new AppError("VALIDATION", { fieldErrors: { confirmHandle: ["handleMismatch"] } });
        }
      }

      const actionId = await insertAction(tx, {
        caseId: target.id,
        moderatorId: actor.userId,
        decision,
        publicReason: input.publicReason,
        internalNote: input.internalNote.length > 0 ? input.internalNote : null,
        durationDays: decision === "SUSPEND" ? input.durationDays : null,
      });
      const until = await applyEffect(tx, decision, target, input, actionId, actor.userId);
      await closeCase(tx, target.id, decision === "DISMISS" ? "DISMISSED" : "RESOLVED");

      if (decision !== "DISMISS" && target.targetAuthorId) {
        await recordSystemEvent(tx, {
          type: "MODERATION",
          recipientId: target.targetAuthorId,
          groupKey: `moderation:${actionId}`,
          data: { decision, reason: input.publicReason, until: until?.toISOString() ?? null, targetType: target.targetType },
          postId: target.targetType === "POST" ? target.targetId : null,
        });
      }
      for (const reporterId of new Set(await reporterIds(tx, target.id))) {
        await recordSystemEvent(tx, { type: "REPORT_REVIEWED", recipientId: reporterId, groupKey: `report:${target.id}`, data: {} });
      }

      return {
        data: { caseId: target.id, decision },
        audit: {
          action: "moderation.decision",
          targetType: "moderation_case",
          targetId: target.id,
          // Codes seulement : ni motif communiqué, ni note interne, ni contenu signalé.
          metadata: { decision, caseTargetType: target.targetType, durationDays: until ? (input.durationDays ?? null) : null, targetUserId: target.targetAuthorId },
        },
      };
    },
  };
}

/** S'assigner un dossier (MODERATOR : soi-même seulement). */
export const assignOptions: AdminActionOptions<typeof caseRefSchema, { caseId: string }> = {
  permission: "moderation:case:assign",
  schema: caseRefSchema,
  resolveResource: (_input, actor) => Promise.resolve({ assigneeId: actor.userId }),
  handler: async ({ actor, input, tx }) => {
    if ((await assignCase(input.caseId, actor.userId, tx)) === 0) throw new AppError("NOT_FOUND");
    return { data: { caseId: input.caseId }, audit: { action: "moderation.case.assign", targetType: "moderation_case", targetId: input.caseId } };
  },
};
