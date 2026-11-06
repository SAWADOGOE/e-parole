import { recordAudit } from "@/server/audit/audit";
import { expireSuspensions } from "./repository";

/** Job moderation.sanctions.expire : réactive les comptes dont la suspension est échue, et l'audite. */
export async function expireDueSuspensions(now: Date = new Date()): Promise<number> {
  const reactivated = await expireSuspensions(now);
  for (const userId of reactivated) {
    await recordAudit({ actor: null, action: "user.suspension.expired", targetType: "user", targetId: userId });
  }
  return reactivated.length;
}
