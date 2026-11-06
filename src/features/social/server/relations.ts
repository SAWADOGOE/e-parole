import "server-only";
import type { z } from "zod";
import { recordMemberEvent } from "@/features/notifications";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import type { relationSchema } from "../schemas";
import { findVisibleUserId, setBlock, setFollow, setMute, userExists } from "./relations/repository";

function notSelf(actor: Actor, userId: string): void {
  if (actor.userId === userId) throw new AppError("VALIDATION", { fieldErrors: { userId: ["self"] } });
}

/** US-13 : suivre une personne visible (un compte bloqué dans un sens ou dans l'autre répond 404). */
export async function follow(actor: Actor, input: z.infer<typeof relationSchema>): Promise<{ following: boolean }> {
  notSelf(actor, input.userId);
  if (input.active && !(await findVisibleUserId(actor.userId, input.userId))) throw new AppError("NOT_FOUND");
  authorize(actor, "relation:follow");
  await db.$transaction(async (tx) => {
    // Revérifié dans la transaction : un blocage concurrent ne laisse jamais naître un abonnement.
    if (input.active && !(await findVisibleUserId(actor.userId, input.userId, tx))) throw new AppError("NOT_FOUND");
    const created = await setFollow(tx, actor.userId, input.userId, input.active);
    if (created) await recordMemberEvent(tx, { type: "FOLLOW", recipientId: input.userId, actorId: actor.userId, groupKey: "follow" });
  });
  return { following: input.active };
}

/**
 * US-14 : bloquer retire les abonnements dans les deux sens. La personne bloquée n'est jamais notifiée ;
 * dès la validation, aucune surface ne lui montre plus rien de l'autre (fragments notBlocked des repositories).
 */
export async function block(actor: Actor, input: z.infer<typeof relationSchema>): Promise<{ blocked: boolean }> {
  notSelf(actor, input.userId);
  authorize(actor, "relation:block");
  if (input.active && !(await userExists(input.userId))) throw new AppError("NOT_FOUND");
  await db.$transaction((tx) => setBlock(tx, actor.userId, input.userId, input.active));
  return { blocked: input.active };
}

export async function mute(actor: Actor, input: z.infer<typeof relationSchema>): Promise<{ muted: boolean }> {
  notSelf(actor, input.userId);
  if (input.active && !(await findVisibleUserId(actor.userId, input.userId))) throw new AppError("NOT_FOUND");
  authorize(actor, "relation:mute");
  await setMute(actor.userId, input.userId, input.active);
  return { muted: input.active };
}
