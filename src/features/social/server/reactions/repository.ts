import { Prisma, type TransactionClient } from "@/server/db";
import type { ReactionKindName } from "../../constants";

const COUNTER: Readonly<Record<ReactionKindName, string>> = { AMEN: '"amenCount"', LOVE: '"loveCount"', ENCOURAGED: '"encouragedCount"' };

export type ReactionTarget = { kind: "post"; id: string } | { kind: "comment"; id: string };

export type ReactionChange = "created" | "changed" | "removed" | "unchanged";

function bump(tx: TransactionClient, target: ReactionTarget, kind: ReactionKindName, delta: 1 | -1): Promise<number> {
  const column = Prisma.raw(COUNTER[kind]);
  return target.kind === "post"
    ? tx.$executeRaw`UPDATE "post" SET ${column} = ${column} + ${delta} WHERE "id" = ${target.id}`
    : tx.$executeRaw`UPDATE "comment" SET ${column} = ${column} + ${delta} WHERE "id" = ${target.id}`;
}

/**
 * Une réaction par personne et par cible (US-12), modifiable et retirable. Le verrou consultatif par (personne, cible)
 * sérialise les clics concurrents d'un même membre ; les compteurs sont incrémentés atomiquement dans la même
 * transaction, donc exacts même quand beaucoup de membres réagissent en même temps.
 */
export async function setReaction(tx: TransactionClient, userId: string, target: ReactionTarget, kind: ReactionKindName | null): Promise<ReactionChange> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`reaction:${userId}:${target.kind}:${target.id}`}, 0))`;
  const where = target.kind === "post" ? { userId, postId: target.id } : { userId, commentId: target.id };
  const existing = await tx.reaction.findFirst({ where, select: { id: true, kind: true } });
  if (!existing) {
    if (kind === null) return "unchanged";
    await tx.reaction.create({ data: { ...where, kind } });
    await bump(tx, target, kind, 1);
    return "created";
  }
  if (kind === existing.kind) return "unchanged";
  if (kind === null) {
    await tx.reaction.delete({ where: { id: existing.id } });
    await bump(tx, target, existing.kind, -1);
    return "removed";
  }
  await tx.reaction.update({ where: { id: existing.id }, data: { kind } });
  await bump(tx, target, existing.kind, -1);
  await bump(tx, target, kind, 1);
  return "changed";
}

export async function readCounts(tx: TransactionClient, target: ReactionTarget): Promise<Record<ReactionKindName, number>> {
  const row =
    target.kind === "post"
      ? await tx.post.findUnique({ where: { id: target.id }, select: { amenCount: true, loveCount: true, encouragedCount: true } })
      : await tx.comment.findUnique({ where: { id: target.id }, select: { amenCount: true, loveCount: true, encouragedCount: true } });
  return { AMEN: row?.amenCount ?? 0, LOVE: row?.loveCount ?? 0, ENCOURAGED: row?.encouragedCount ?? 0 };
}
