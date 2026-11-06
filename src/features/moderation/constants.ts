/** Modération v1 (docs/20-PRIVACY-AND-MODERATION.md, docs/admin/ADMIN-MODERATION.md). */

export const REPORT_TARGETS = ["POST", "COMMENT", "PROFILE"] as const;
export type ReportTargetName = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "HATE",
  "FRAUD_FINANCIAL",
  "IMPERSONATION",
  "DANGEROUS_LINK",
  "SEXUAL",
  "SELF_HARM",
  "MINOR_SAFETY",
  "OTHER",
] as const;
export type ReportReasonName = (typeof REPORT_REASONS)[number];

/** Priorité 0 (critique, 4 h) … 3 (faible, 72 h). */
export const REASON_PRIORITY: Readonly<Record<ReportReasonName, 0 | 1 | 2 | 3>> = {
  SELF_HARM: 0,
  MINOR_SAFETY: 0,
  FRAUD_FINANCIAL: 1,
  IMPERSONATION: 1,
  HARASSMENT: 1,
  HATE: 1,
  SPAM: 2,
  DANGEROUS_LINK: 2,
  SEXUAL: 2,
  OTHER: 3,
};

/** Un contenu signalé concernant un mineur est traité au moins en priorité 1. */
export const MINOR_PRIORITY_CAP = 1;

/** Extrait flouté jusqu'au clic dans la file et le dossier. */
export const SENSITIVE_REASONS: ReadonlySet<ReportReasonName> = new Set(["SEXUAL", "SELF_HARM"]);

/** Masquage provisoire automatique : 5 signalements distincts de comptes de plus de 7 jours. */
export const AUTO_HIDE_THRESHOLD = 5;
export const TRUSTED_REPORTER_DAYS = 7;

export const REPORT_DETAILS_MAX = 1000;
export const PUBLIC_REASON_MAX = 500;
export const INTERNAL_NOTE_MAX = 1000;
/** Plafond de suspension d'un MODERATOR (matrice RBAC). */
export const MODERATOR_SUSPENSION_MAX_DAYS = 30;
export const SUSPENSION_MAX_DAYS = 365;

export const DECISIONS = ["DISMISS", "WARN", "HIDE", "REMOVE", "SUSPEND", "BAN"] as const;
export type DecisionName = (typeof DECISIONS)[number];

export const CASE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
export type CaseStatusName = (typeof CASE_STATUSES)[number];

export const MODERATION_PAGE_SIZE = 25;
