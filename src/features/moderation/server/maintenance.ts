import { recordAudit } from "@/server/audit/audit";
import { db } from "@/server/db";
import { expireSuspensions } from "./repository";

/** Job moderation.sanctions.expire : réactive les comptes dont la suspension est échue, audit dans la même transaction. */
export async function expireDueSuspensions(now: Date = new Date()): Promise<number> {
  return db.$transaction(async (tx) => {
    const reactivated = await expireSuspensions(now, tx);
    for (const userId of reactivated) {
      await recordAudit({ actor: null, action: "user.suspension.expired", targetType: "user", targetId: userId }, tx);
    }
    return reactivated.length;
  });
}
