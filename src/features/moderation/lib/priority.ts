import { MINOR_PRIORITY_CAP, REASON_PRIORITY, type ReportReasonName } from "../constants";

/** Priorité d'un dossier : la plus urgente des raisons signalées, relevée à 1 au moins si la cible concerne un mineur. */
export function casePriority(reasons: readonly ReportReasonName[], targetIsMinor: boolean): number {
  const base = reasons.reduce<number>((best, reason) => Math.min(best, REASON_PRIORITY[reason]), 3);
  return targetIsMinor ? Math.min(base, MINOR_PRIORITY_CAP) : base;
}

/** Motif dominant : le plus fréquent ; à égalité, le plus urgent. */
export function dominantReason(counts: Readonly<Partial<Record<ReportReasonName, number>>>): ReportReasonName {
  let best: ReportReasonName = "OTHER";
  let bestCount = -1;
  for (const [reason, count] of Object.entries(counts) as [ReportReasonName, number][]) {
    if (count > bestCount || (count === bestCount && REASON_PRIORITY[reason] < REASON_PRIORITY[best])) {
      best = reason;
      bestCount = count;
    }
  }
  return best;
}

/** Faut-il masquer provisoirement ? Seuls les contenus (pas les profils), une seule fois par dossier. */
export function shouldAutoHide(trustedReports: number, threshold: number, alreadyHidden: boolean, targetIsContent: boolean): boolean {
  return targetIsContent && !alreadyHidden && trustedReports >= threshold;
}
