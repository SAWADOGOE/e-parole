import type { z } from "zod";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { authorize, type Actor } from "@/server/policies";
import { NOTIFICATIONS_PAGE_SIZE } from "../constants";
import type { markReadSchema, preferencesSchema } from "../schemas";
import type { NotificationPreferences, NotificationRow } from "../types";
import { countUnread, findPreferences, listNotifications, markAllRead, savePreferences } from "./repository";

export async function unreadCountFor(actor: Actor): Promise<number> {
  return countUnread(actor.userId);
}

export async function notificationsFor(actor: Actor, cursor: string | undefined): Promise<{ items: NotificationRow[]; nextCursor: string | null }> {
  const decoded = decodeCursor(cursor);
  const rows = await listNotifications(actor.userId, decoded ? { updatedAt: decoded.createdAt, id: decoded.id } : null, NOTIFICATIONS_PAGE_SIZE);
  const items = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);
  const last = items.at(-1);
  const nextCursor = rows.length > NOTIFICATIONS_PAGE_SIZE && last ? encodeCursor({ createdAt: last.updatedAt, id: last.id }) : null;
  return { items, nextCursor };
}

/** Marque comme lues les notifications affichées (jusqu'à l'instant de l'affichage, pas celles arrivées depuis). */
export async function markReadFor(actor: Actor, input: z.infer<typeof markReadSchema>): Promise<{ unread: number }> {
  await markAllRead(actor.userId, new Date(input.before));
  return { unread: await countUnread(actor.userId) };
}

export async function preferencesFor(actor: Actor): Promise<NotificationPreferences> {
  return findPreferences(actor.userId);
}

export async function updatePreferences(actor: Actor, input: z.infer<typeof preferencesSchema>): Promise<void> {
  authorize(actor, "notification:preferences:update", { ownerId: actor.userId });
  await savePreferences(actor.userId, input);
}
