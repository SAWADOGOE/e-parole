import type { NotificationMessage, NotificationRow } from "../types";

/**
 * Phrase d'un groupe : « Ruth a réagi », « Ruth et Paul ont réagi », « Ruth et 4 autres personnes ont réagi ».
 * Les acteurs bloqués ou en sourdine ont déjà été retirés par le repository : ils ne comptent jamais.
 */
export function groupMessage(row: Pick<NotificationRow, "type" | "actorCount" | "actors" | "data">): NotificationMessage {
  const [first, second] = row.actors;
  const base = row.type.toLowerCase();
  if (row.type === "MODERATION") {
    const decision = typeof row.data["decision"] === "string" ? row.data["decision"] : "WARN";
    return { key: `moderation.${decision}`, values: {} };
  }
  if (row.type === "REPORT_REVIEWED") return { key: "reportReviewed", values: {} };
  if (!first || row.actorCount <= 0) return { key: `${base}.one`, values: { name: "" } };
  if (row.actorCount === 1) return { key: `${base}.one`, values: { name: first.displayName } };
  if (row.actorCount === 2 && second) return { key: `${base}.two`, values: { name: first.displayName, other: second.displayName } };
  return { key: `${base}.many`, values: { name: first.displayName, count: row.actorCount - 1 } };
}
