import { db, Prisma, type TransactionClient } from "@/server/db";
import { NOTIFY_CHANNEL, PREFERENCE_COLUMN, type NotificationTypeName, type PreferenceType } from "../constants";
import type { NotificationActorView, NotificationPreferences, NotificationRow } from "../types";

/**
 * Notifications in-app (ADR-013). Règles appliquées ICI, en SQL, quel que soit l'appelant :
 * jamais de notification d'un compte bloqué ou vers lui (dans un sens comme dans l'autre), ni d'une personne
 * mise en sourdine, ni d'un type désactivé. Les mêmes filtres sont réappliqués à la lecture (blocage postérieur).
 */

function blockedBetween(a: Prisma.Sql | string, b: Prisma.Sql | string): Prisma.Sql {
  return Prisma.sql`EXISTS (SELECT 1 FROM "block" bl WHERE (bl."blockerId" = ${a} AND bl."blockedId" = ${b}) OR (bl."blockerId" = ${b} AND bl."blockedId" = ${a}))`;
}

export interface MemberEvent {
  type: PreferenceType;
  recipientId: string;
  actorId: string;
  groupKey: string;
  postId?: string | null;
  commentId?: string | null;
}

/** Regroupe l'événement dans le groupe non lu de même clé (index unique partiel), ou en ouvre un. Renvoie true si enregistré. */
export async function recordMemberEvent(tx: TransactionClient, event: MemberEvent): Promise<boolean> {
  if (event.recipientId === event.actorId) return false;
  const preference = Prisma.raw(`"${PREFERENCE_COLUMN[event.type]}"`);
  const rows = await tx.$queryRaw<{ notificationId: string }[]>`
    WITH allowed AS (
      SELECT 1 FROM "user" r
      WHERE r."id" = ${event.recipientId} AND r."deletedAt" IS NULL
        AND NOT ${blockedBetween(event.recipientId, event.actorId)}
        AND NOT EXISTS (SELECT 1 FROM "mute" m WHERE m."muterId" = ${event.recipientId} AND m."mutedId" = ${event.actorId})
        AND COALESCE((SELECT np.${preference} FROM "notification_preference" np WHERE np."userId" = ${event.recipientId}), true)
    ), grouped AS (
      INSERT INTO "notification" ("id", "recipientId", "type", "groupKey", "postId", "commentId", "updatedAt")
      SELECT replace(gen_random_uuid()::text, '-', ''), ${event.recipientId}, ${event.type}::"NotificationType", ${event.groupKey},
             ${event.postId ?? null}, ${event.commentId ?? null}, now()
      FROM allowed
      ON CONFLICT ("recipientId", "groupKey") WHERE "readAt" IS NULL DO UPDATE SET "updatedAt" = now()
      RETURNING "id"
    )
    INSERT INTO "notification_actor" ("notificationId", "actorId")
    SELECT "id", ${event.actorId} FROM grouped
    ON CONFLICT ("notificationId", "actorId") DO UPDATE SET "createdAt" = now()
    RETURNING "notificationId"`;
  if (rows.length === 0) return false;
  await tx.$executeRaw`SELECT pg_notify(${NOTIFY_CHANNEL}, ${event.recipientId})`;
  return true;
}

/** Notification de la plateforme (décision de modération, retour au signaleur) : pas d'acteur, pas de préférence. */
export async function recordSystemEvent(
  tx: TransactionClient,
  event: { type: Extract<NotificationTypeName, "MODERATION" | "REPORT_REVIEWED">; recipientId: string; groupKey: string; data: Prisma.InputJsonObject; postId?: string | null; commentId?: string | null },
): Promise<void> {
  await tx.notification.create({
    data: {
      recipientId: event.recipientId,
      type: event.type,
      groupKey: event.groupKey,
      data: event.data,
      postId: event.postId ?? null,
      commentId: event.commentId ?? null,
      readAt: null,
    },
  });
  await tx.$executeRaw`SELECT pg_notify(${NOTIFY_CHANNEL}, ${event.recipientId})`;
}

/** Acteurs encore visibles du destinataire (ni bloqués, ni en sourdine, ni supprimés). */
function visibleActorCondition(recipientId: string, actorColumn: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`NOT ${blockedBetween(recipientId, actorColumn)}
    AND NOT EXISTS (SELECT 1 FROM "mute" m WHERE m."muterId" = ${recipientId} AND m."mutedId" = ${actorColumn})
    AND EXISTS (SELECT 1 FROM "user" au WHERE au."id" = ${actorColumn} AND au."deletedAt" IS NULL AND au."status" IN ('ACTIVE', 'SUSPENDED'))`;
}

/** Une notification de membre n'existe pour le lecteur que si au moins un acteur reste visible et la cible existe encore. */
function displayableCondition(recipientId: string): Prisma.Sql {
  return Prisma.sql`(
    n."type" IN ('MODERATION', 'REPORT_REVIEWED')
    OR EXISTS (SELECT 1 FROM "notification_actor" na WHERE na."notificationId" = n."id" AND ${visibleActorCondition(recipientId, Prisma.sql`na."actorId"`)})
  ) AND (n."postId" IS NULL OR n."type" IN ('MODERATION', 'REPORT_REVIEWED')
         OR EXISTS (SELECT 1 FROM "post" tp WHERE tp."id" = n."postId" AND tp."deletedAt" IS NULL))`;
}

export async function countUnread(recipientId: string): Promise<number> {
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS "count" FROM "notification" n
    WHERE n."recipientId" = ${recipientId} AND n."readAt" IS NULL AND ${displayableCondition(recipientId)}`;
  return Number(rows[0]?.count ?? 0);
}

interface RawNotification {
  id: string;
  type: NotificationTypeName;
  postId: string | null;
  commentId: string | null;
  data: unknown;
  readAt: Date | null;
  updatedAt: Date;
  actorCount: bigint;
  actors: unknown;
}

export async function listNotifications(recipientId: string, cursor: { updatedAt: Date; id: string } | null, limit: number): Promise<NotificationRow[]> {
  const cursorCondition = cursor
    ? Prisma.sql`AND (n."updatedAt", n."id") < (${cursor.updatedAt.toISOString()}::timestamp, ${cursor.id})`
    : Prisma.empty;
  const rows = await db.$queryRaw<RawNotification[]>`
    SELECT n."id", n."type", n."postId", n."commentId", n."data", n."readAt", n."updatedAt",
      (SELECT count(*) FROM "notification_actor" na WHERE na."notificationId" = n."id" AND ${visibleActorCondition(recipientId, Prisma.sql`na."actorId"`)}) AS "actorCount",
      COALESCE((
        SELECT json_agg(json_build_object('handle', x."handle", 'displayName', x."displayName") ORDER BY x."createdAt" DESC)
        FROM (
          SELECT pr."handle", pr."displayName", na."createdAt"
          FROM "notification_actor" na JOIN "profile" pr ON pr."userId" = na."actorId"
          WHERE na."notificationId" = n."id" AND ${visibleActorCondition(recipientId, Prisma.sql`na."actorId"`)}
          ORDER BY na."createdAt" DESC LIMIT 2
        ) x
      ), '[]'::json) AS "actors"
    FROM "notification" n
    WHERE n."recipientId" = ${recipientId} AND ${displayableCondition(recipientId)}
      ${cursorCondition}
    ORDER BY n."updatedAt" DESC, n."id" DESC
    LIMIT ${limit + 1}`;
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    postId: row.postId,
    commentId: row.commentId,
    data: typeof row.data === "object" && row.data !== null ? (row.data as Record<string, unknown>) : {},
    read: row.readAt !== null,
    updatedAt: row.updatedAt,
    actorCount: Number(row.actorCount),
    actors: Array.isArray(row.actors) ? (row.actors as NotificationActorView[]) : [],
  }));
}

export async function markAllRead(recipientId: string, before: Date): Promise<number> {
  const result = await db.notification.updateMany({ where: { recipientId, readAt: null, updatedAt: { lte: before } }, data: { readAt: new Date() } });
  return result.count;
}

export async function findPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await db.notificationPreference.findUnique({ where: { userId } });
  return {
    REACTION: row?.reaction ?? true,
    COMMENT: row?.comment ?? true,
    REPLY: row?.reply ?? true,
    MENTION: row?.mention ?? true,
    FOLLOW: row?.follow ?? true,
  };
}

export async function savePreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  const data = {
    reaction: preferences.REACTION,
    comment: preferences.COMMENT,
    reply: preferences.REPLY,
    mention: preferences.MENTION,
    follow: preferences.FOLLOW,
  };
  await db.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}
