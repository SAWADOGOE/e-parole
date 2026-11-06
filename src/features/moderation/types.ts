import type { z } from "zod";
import type { MediaImage } from "@/features/media";
import type { CaseStatusName, DecisionName, ReportReasonName, ReportTargetName } from "./constants";
import type { caseListQuerySchema } from "./schemas";

export type CaseListQuery = z.infer<typeof caseListQuerySchema>;

export interface CaseListItem {
  id: string;
  targetType: ReportTargetName;
  status: CaseStatusName;
  priority: number;
  dominantReason: ReportReasonName;
  reportCount: number;
  createdAt: Date;
  assigneeHandle: string | null;
  autoHidden: boolean;
  targetAuthorMinor: boolean;
  /** Extrait du contenu figé au premier signalement (160 caractères). */
  excerpt: string;
}

/** Copie figée de la cible : seule donnée de contenu vue par la modération (jamais de message ou prière privés). */
export type EvidenceSnapshot = Readonly<Record<string, unknown>> | null;

export interface CaseDetail {
  id: string;
  targetType: ReportTargetName;
  targetId: string;
  status: CaseStatusName;
  priority: number;
  dominantReason: ReportReasonName;
  reportCount: number;
  createdAt: Date;
  resolvedAt: Date | null;
  autoHidden: boolean;
  assigneeId: string | null;
  assigneeHandle: string | null;
  targetAuthorMinor: boolean;
  snapshot: EvidenceSnapshot;
  /** Images référencées par la copie figée (avatar, bannière, images de publication). */
  snapshotImages: MediaImage[];
  reports: { id: string; reason: ReportReasonName; details: string | null; createdAt: Date; trusted: boolean; reporterHandle: string | null }[];
  actions: { id: string; decision: DecisionName; publicReason: string; internalNote: string | null; durationDays: number | null; createdAt: Date; moderatorHandle: string | null }[];
  /** Métadonnées de modération uniquement : ni email, ni messages, ni prières, ni notes. */
  author: {
    userId: string;
    handle: string | null;
    displayName: string | null;
    createdAt: Date;
    status: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_DELETION";
    suspendedUntil: Date | null;
    roles: string[];
    sanctions: { kind: "WARNING" | "SUSPENSION" | "BAN"; startsAt: Date; endsAt: Date | null }[];
    reportsReceived30d: number;
  } | null;
  state: { exists: boolean; isHidden: boolean; deleted: boolean; removedByModeration: boolean; current: Readonly<Record<string, unknown>> | null };
}
