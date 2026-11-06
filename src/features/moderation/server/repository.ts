import type { Prisma} from "@/server/db";
import { db, type TransactionClient } from "@/server/db";
import type { CaseStatusName, DecisionName, ReportReasonName, ReportTargetName } from "../constants";
import type { CaseDetail, CaseListItem, CaseListQuery } from "../types";

export interface OpenCaseRow {
  id: string;
  targetType: ReportTargetName;
  targetId: string;
  targetAuthorId: string | null;
  targetAuthorMinor: boolean;
  status: CaseStatusName;
  priority: number;
  trustedReportCount: number;
  autoHiddenAt: Date | null;
  assigneeId: string | null;
}

const CASE_SELECT = {
  id: true,
  targetType: true,
  targetId: true,
  targetAuthorId: true,
  targetAuthorMinor: true,
  status: true,
  priority: true,
  trustedReportCount: true,
  autoHiddenAt: true,
  assigneeId: true,
} as const;

/** Dossier ouvert de la cible, verrouillé pour la transaction ; créé s'il n'existe pas (index unique partiel). */
export async function lockOrOpenCase(
  tx: TransactionClient,
  target: { type: ReportTargetName; id: string; authorId: string; authorMinor: boolean; reason: ReportReasonName; priority: number },
): Promise<OpenCaseRow> {
  await tx.$executeRaw`
    INSERT INTO "moderation_case" ("id", "targetType", "targetId", "targetAuthorId", "targetAuthorMinor", "priority", "dominantReason", "updatedAt")
    VALUES (replace(gen_random_uuid()::text, '-', ''), ${target.type}::"ReportTarget", ${target.id}, ${target.authorId}, ${target.authorMinor},
            ${target.priority}, ${target.reason}::"ReportReason", now())
    ON CONFLICT ("targetType", "targetId") WHERE "status" IN ('OPEN', 'IN_PROGRESS') DO NOTHING`;
  const rows = await tx.$queryRaw<OpenCaseRow[]>`
    SELECT "id", "targetType", "targetId", "targetAuthorId", "targetAuthorMinor", "status", "priority", "trustedReportCount", "autoHiddenAt", "assigneeId"
    FROM "moderation_case"
    WHERE "targetType" = ${target.type}::"ReportTarget" AND "targetId" = ${target.id} AND "status" IN ('OPEN', 'IN_PROGRESS')
    FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new Error("dossier introuvable après création");
  return row;
}

/** Un signalement par personne et par cible : false si la personne a déjà signalé cette cible. */
export async function insertReport(
  tx: TransactionClient,
  data: { reporterId: string; caseId: string; targetType: ReportTargetName; targetId: string; reason: ReportReasonName; details: string | null; evidence: Prisma.InputJsonObject; trusted: boolean },
): Promise<boolean> {
  const inserted = await tx.$executeRaw`
    INSERT INTO "report" ("id", "reporterId", "caseId", "targetType", "targetId", "reason", "details", "evidenceSnapshot", "reporterTrusted")
    VALUES (replace(gen_random_uuid()::text, '-', ''), ${data.reporterId}, ${data.caseId}, ${data.targetType}::"ReportTarget", ${data.targetId},
            ${data.reason}::"ReportReason", ${data.details}, ${JSON.stringify(data.evidence)}::jsonb, ${data.trusted})
    ON CONFLICT ("reporterId", "targetType", "targetId") DO NOTHING`;
  return inserted === 1;
}

export async function reasonCounts(tx: TransactionClient, caseId: string): Promise<Partial<Record<ReportReasonName, number>>> {
  const rows = await tx.report.groupBy({ by: ["reason"], where: { caseId }, _count: true });
  return Object.fromEntries(rows.map((row) => [row.reason, row._count]));
}

export async function updateCaseAfterReport(
  tx: TransactionClient,
  caseId: string,
  data: { priority: number; dominantReason: ReportReasonName; trusted: boolean },
): Promise<{ trustedReportCount: number }> {
  const updated = await tx.moderationCase.update({
    where: { id: caseId },
    data: {
      reportCount: { increment: 1 },
      trustedReportCount: { increment: data.trusted ? 1 : 0 },
      priority: data.priority,
      dominantReason: data.dominantReason,
    },
    select: { trustedReportCount: true },
  });
  return updated;
}

export async function markAutoHidden(tx: TransactionClient, caseId: string): Promise<void> {
  await tx.moderationCase.update({ where: { id: caseId }, data: { autoHiddenAt: new Date() } });
}

export async function findAccountInfo(userId: string): Promise<{ createdAt: Date; birthYear: number | null } | null> {
  return db.user.findUnique({ where: { id: userId }, select: { createdAt: true, birthYear: true } });
}

/** File : priorité puis ancienneté ; filtres de docs/admin/ADMIN-MODERATION.md. */
export async function listCases(query: CaseListQuery, actorId: string, pageSize: number): Promise<{ rows: CaseListItem[]; total: number }> {
  const where: Prisma.ModerationCaseWhereInput = {
    ...(query.statut === "ouverts" ? { status: { in: ["OPEN", "IN_PROGRESS"] } } : { status: query.statut }),
    ...(query.priorite !== undefined ? { priority: query.priorite } : {}),
    ...(query.motif ? { dominantReason: query.motif } : {}),
    ...(query.type ? { targetType: query.type } : {}),
    ...(query.assigne === "moi" ? { assigneeId: actorId } : query.assigne === "personne" ? { assigneeId: null } : {}),
    ...(query.q
      ? { OR: [{ id: query.q }, { targetAuthor: { profile: { handle: { equals: query.q.replace(/^@/, ""), mode: "insensitive" } } } }] }
      : {}),
  };
  const [cases, total] = await Promise.all([
    db.moderationCase.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * pageSize,
      take: pageSize,
      select: {
        ...CASE_SELECT,
        dominantReason: true,
        reportCount: true,
        createdAt: true,
        assignee: { select: { profile: { select: { handle: true } } } },
        reports: { select: { evidenceSnapshot: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.moderationCase.count({ where }),
  ]);
  return {
    rows: cases.map((c) => ({
      id: c.id,
      targetType: c.targetType,
      status: c.status,
      priority: c.priority,
      dominantReason: c.dominantReason,
      reportCount: c.reportCount,
      createdAt: c.createdAt,
      assigneeHandle: c.assignee?.profile?.handle ?? null,
      autoHidden: c.autoHiddenAt !== null,
      targetAuthorMinor: c.targetAuthorMinor,
      excerpt: excerptOf(c.reports[0]?.evidenceSnapshot),
    })),
    total,
  };
}

function excerptOf(snapshot: Prisma.JsonValue | undefined): string {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return "";
  const body = snapshot["body"] ?? snapshot["bio"] ?? snapshot["displayName"];
  return typeof body === "string" ? body.slice(0, 160) : "";
}

export async function findCase(caseId: string, tx: TransactionClient = db): Promise<(OpenCaseRow & { dominantReason: ReportReasonName }) | null> {
  return tx.moderationCase.findUnique({ where: { id: caseId }, select: { ...CASE_SELECT, dominantReason: true } });
}

export async function lockCase(tx: TransactionClient, caseId: string): Promise<OpenCaseRow | null> {
  const rows = await tx.$queryRaw<OpenCaseRow[]>`
    SELECT "id", "targetType", "targetId", "targetAuthorId", "targetAuthorMinor", "status", "priority", "trustedReportCount", "autoHiddenAt", "assigneeId"
    FROM "moderation_case" WHERE "id" = ${caseId} FOR UPDATE`;
  return rows[0] ?? null;
}

/** Détail d'un dossier : signalements, historique et contexte de modération de l'auteur — rien de ses contenus privés. */
export async function findCaseDetail(caseId: string): Promise<Omit<CaseDetail, "state" | "snapshotImages"> | null> {
  const found = await db.moderationCase.findUnique({
    where: { id: caseId },
    select: {
      ...CASE_SELECT,
      dominantReason: true,
      reportCount: true,
      createdAt: true,
      resolvedAt: true,
      assignee: { select: { profile: { select: { handle: true } } } },
      reports: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { id: true, reason: true, details: true, createdAt: true, evidenceSnapshot: true, reporterTrusted: true, reporter: { select: { profile: { select: { handle: true } } } } },
      },
      actions: {
        orderBy: { createdAt: "asc" },
        select: { id: true, decision: true, publicReason: true, internalNote: true, durationDays: true, createdAt: true, moderator: { select: { profile: { select: { handle: true } } } } },
      },
    },
  });
  if (!found) return null;
  const author = found.targetAuthorId
    ? await db.user.findUnique({
        where: { id: found.targetAuthorId },
        select: {
          id: true,
          createdAt: true,
          status: true,
          suspendedUntil: true,
          roles: { select: { role: true } },
          profile: { select: { handle: true, displayName: true } },
          sanctions: { orderBy: { createdAt: "desc" }, take: 20, select: { kind: true, startsAt: true, endsAt: true } },
        },
      })
    : null;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const reportsReceived30d = found.targetAuthorId
    ? await db.report.count({ where: { case: { targetAuthorId: found.targetAuthorId }, createdAt: { gte: since } } })
    : 0;
  const first = found.reports[0];
  return {
    id: found.id,
    targetType: found.targetType,
    targetId: found.targetId,
    status: found.status,
    priority: found.priority,
    dominantReason: found.dominantReason,
    reportCount: found.reportCount,
    createdAt: found.createdAt,
    resolvedAt: found.resolvedAt,
    autoHidden: found.autoHiddenAt !== null,
    assigneeId: found.assigneeId,
    assigneeHandle: found.assignee?.profile?.handle ?? null,
    targetAuthorMinor: found.targetAuthorMinor,
    snapshot: (first?.evidenceSnapshot ?? null) as CaseDetail["snapshot"],
    reports: found.reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      createdAt: r.createdAt,
      trusted: r.reporterTrusted,
      reporterHandle: r.reporter.profile?.handle ?? null,
    })),
    actions: found.actions.map((a) => ({
      id: a.id,
      decision: a.decision,
      publicReason: a.publicReason,
      internalNote: a.internalNote,
      durationDays: a.durationDays,
      createdAt: a.createdAt,
      moderatorHandle: a.moderator.profile?.handle ?? null,
    })),
    author: author
      ? {
          userId: author.id,
          handle: author.profile?.handle ?? null,
          displayName: author.profile?.displayName ?? null,
          createdAt: author.createdAt,
          status: author.status,
          suspendedUntil: author.suspendedUntil,
          roles: author.roles.map((r) => r.role),
          sanctions: author.sanctions,
          reportsReceived30d,
        }
      : null,
  };
}

export async function findTargetRoles(userId: string): Promise<("SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "CONTENT_EDITOR")[]> {
  const roles = await db.userRole.findMany({ where: { userId }, select: { role: true } });
  return roles.map((r) => r.role);
}

export async function assignCase(caseId: string, assigneeId: string, tx: TransactionClient): Promise<number> {
  const result = await tx.moderationCase.updateMany({
    where: { id: caseId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    data: { assigneeId, status: "IN_PROGRESS" },
  });
  return result.count;
}

export async function closeCase(tx: TransactionClient, caseId: string, status: "RESOLVED" | "DISMISSED"): Promise<void> {
  await tx.moderationCase.update({ where: { id: caseId }, data: { status, resolvedAt: new Date() } });
}

export async function insertAction(
  tx: TransactionClient,
  data: { caseId: string; moderatorId: string; decision: DecisionName; publicReason: string; internalNote: string | null; durationDays: number | null },
): Promise<string> {
  const action = await tx.moderationAction.create({ data, select: { id: true } });
  return action.id;
}

export async function insertSanction(
  tx: TransactionClient,
  data: { userId: string; kind: "WARNING" | "SUSPENSION" | "BAN"; caseId: string; actionId: string; issuedById: string; endsAt: Date | null },
): Promise<void> {
  await tx.sanction.create({ data });
}

export async function setAccountStatus(tx: TransactionClient, userId: string, status: "SUSPENDED" | "BANNED", until: Date | null): Promise<void> {
  await tx.user.update({ where: { id: userId }, data: { status, suspendedUntil: until } });
}

export async function reporterIds(tx: TransactionClient, caseId: string): Promise<string[]> {
  const rows = await tx.report.findMany({ where: { caseId }, select: { reporterId: true } });
  return rows.map((r) => r.reporterId);
}

/** Fin des suspensions échues (job horaire). Renvoie les comptes réactivés. */
export async function expireSuspensions(now: Date): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "user" SET "status" = 'ACTIVE', "suspendedUntil" = NULL, "updatedAt" = now()
    WHERE "status" = 'SUSPENDED' AND "suspendedUntil" IS NOT NULL AND "suspendedUntil" <= ${now.toISOString()}::timestamp
    RETURNING "id"`;
  return rows.map((r) => r.id);
}

export async function findHandle(tx: TransactionClient, userId: string): Promise<string | null> {
  const profile = await tx.profile.findUnique({ where: { userId }, select: { handle: true } });
  return profile?.handle ?? null;
}
