import "server-only";
import { findReadyImages } from "@/features/media";
import { targetState } from "@/features/social";
import { authorize, type Actor } from "@/server/policies";
import { MODERATION_PAGE_SIZE } from "../constants";
import type { CaseDetail, CaseListItem, CaseListQuery } from "../types";
import { findCaseDetail, listCases } from "./repository";

/** Lecture de la file : permission moderation:case:read revérifiée ici, pas seulement par la page. */
export async function moderationQueue(actor: Actor, query: CaseListQuery): Promise<{ rows: CaseListItem[]; total: number; pageSize: number }> {
  authorize(actor, "moderation:case:read");
  const { rows, total } = await listCases(query, actor.userId, MODERATION_PAGE_SIZE);
  return { rows, total, pageSize: MODERATION_PAGE_SIZE };
}

export async function moderationCase(actor: Actor, caseId: string): Promise<CaseDetail | null> {
  authorize(actor, "moderation:case:read");
  const detail = await findCaseDetail(caseId);
  if (!detail) return null;
  return { ...detail, state: await targetState(detail.targetType, detail.targetId), snapshotImages: await findReadyImages(snapshotAssetIds(detail.snapshot)) };
}

function snapshotAssetIds(snapshot: CaseDetail["snapshot"]): string[] {
  if (!snapshot) return [];
  const ids: string[] = [];
  const media = snapshot["media"];
  if (Array.isArray(media)) for (const item of media as { assetId?: unknown }[]) if (typeof item.assetId === "string") ids.push(item.assetId);
  for (const key of ["avatarId", "bannerId"]) if (typeof snapshot[key] === "string") ids.push(snapshot[key]);
  return ids;
}
