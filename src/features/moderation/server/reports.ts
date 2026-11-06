import "server-only";
import type { z } from "zod";
import { findVisibleUserId, requireVisibleComment, requireVisiblePost, setTargetHidden, snapshotTarget } from "@/features/social";
import { recordAudit } from "@/server/audit/audit";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import { AUTO_HIDE_THRESHOLD, TRUSTED_REPORTER_DAYS } from "../constants";
import { casePriority, dominantReason, shouldAutoHide } from "../lib/priority";
import type { reportSchema } from "../schemas";
import { findAccountInfo, insertReport, lockOrOpenCase, markAutoHidden, reasonCounts, updateCaseAfterReport } from "./repository";

const ADULT_AGE = 18;

/** La cible doit être visible du signaleur (sinon 404) ; on ne signale pas son propre contenu. */
async function requireReportableTarget(actor: Actor, input: z.infer<typeof reportSchema>): Promise<void> {
  if (input.targetType === "POST") await requireVisiblePost(actor, input.targetId);
  else if (input.targetType === "COMMENT") await requireVisibleComment(actor, input.targetId);
  else if (!(await findVisibleUserId(actor.userId, input.targetId))) throw new AppError("NOT_FOUND");
}

/**
 * US-41 (côté membre) : un signalement par personne et par cible, copie figée de la cible, regroupement dans
 * le dossier ouvert de la cible, priorité selon le motif (relevée pour un mineur), masquage provisoire à 5 signalements
 * de comptes de plus de 7 jours. Jamais de suppression automatique, jamais de contenu dans l'audit.
 */
export async function createReport(actor: Actor, input: z.infer<typeof reportSchema>): Promise<{ caseId: string }> {
  authorize(actor, "report:create");
  await requireReportableTarget(actor, input);
  const snapshot = await snapshotTarget(input.targetType, input.targetId);
  if (!snapshot) throw new AppError("NOT_FOUND");
  if (snapshot.authorId === actor.userId) throw new AppError("VALIDATION", { fieldErrors: { targetId: ["ownContent"] } });

  const [reporter, author] = await Promise.all([findAccountInfo(actor.userId), findAccountInfo(snapshot.authorId)]);
  const trusted = reporter !== null && Date.now() - reporter.createdAt.getTime() > TRUSTED_REPORTER_DAYS * 86_400_000;
  const birthYear = author?.birthYear ?? null;
  const authorMinor = birthYear === null || new Date().getUTCFullYear() - birthYear < ADULT_AGE;

  return db.$transaction(async (tx) => {
    const opened = await lockOrOpenCase(tx, {
      type: input.targetType,
      id: input.targetId,
      authorId: snapshot.authorId,
      authorMinor,
      reason: input.reason,
      priority: casePriority([input.reason], authorMinor),
    });
    const inserted = await insertReport(tx, {
      reporterId: actor.userId,
      caseId: opened.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details.length > 0 ? input.details : null,
      evidence: snapshot.evidence,
      trusted,
    });
    if (!inserted) throw new AppError("CONFLICT", { message: "Tu as déjà signalé ce contenu. Merci, il est en cours d'examen." });

    const counts = await reasonCounts(tx, opened.id);
    const reasons = Object.keys(counts) as (keyof typeof counts)[];
    const { trustedReportCount } = await updateCaseAfterReport(tx, opened.id, {
      priority: Math.min(opened.priority, casePriority(reasons, opened.targetAuthorMinor)),
      dominantReason: dominantReason(counts),
      trusted,
    });
    const isContent = input.targetType !== "PROFILE";
    if (isContent && shouldAutoHide(trustedReportCount, AUTO_HIDE_THRESHOLD, opened.autoHiddenAt !== null, true)) {
      await setTargetHidden(tx, input.targetType === "POST" ? "POST" : "COMMENT", input.targetId, true);
      await markAutoHidden(tx, opened.id);
      await recordAudit({ actor: null, action: "moderation.auto_hide", targetType: "moderation_case", targetId: opened.id, metadata: { targetType: input.targetType, trustedReports: trustedReportCount } }, tx);
    }
    return { caseId: opened.id };
  });
}
