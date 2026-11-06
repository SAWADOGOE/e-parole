export const NOTIFICATION_TYPES = ["REACTION", "COMMENT", "REPLY", "MENTION", "FOLLOW", "MODERATION", "REPORT_REVIEWED"] as const;
export type NotificationTypeName = (typeof NOTIFICATION_TYPES)[number];

/** Types déclenchés par un autre membre, désactivables dans les préférences. */
export const PREFERENCE_TYPES = ["REACTION", "COMMENT", "REPLY", "MENTION", "FOLLOW"] as const;
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];

export const PREFERENCE_COLUMN: Readonly<Record<PreferenceType, "reaction" | "comment" | "reply" | "mention" | "follow">> = {
  REACTION: "reaction",
  COMMENT: "comment",
  REPLY: "reply",
  MENTION: "mention",
  FOLLOW: "follow",
};

/** Canal PostgreSQL LISTEN/NOTIFY : la charge utile est l'identifiant du destinataire, jamais un contenu (ADR-013). */
export const NOTIFY_CHANNEL = "eparole_notifications";

export const NOTIFICATIONS_PAGE_SIZE = 20;
/** Repli si le flux SSE est indisponible. */
export const POLL_INTERVAL_MS = 60_000;
/** Battement du flux SSE (les proxys mobiles coupent les connexions muettes). */
export const SSE_HEARTBEAT_MS = 25_000;
/** Une connexion SSE est recyclée après ce délai (le navigateur se reconnecte seul). */
export const SSE_MAX_DURATION_MS = 10 * 60_000;
/** Au-delà de ce nombre d'erreurs consécutives, le client passe au polling. */
export const SSE_MAX_FAILURES = 3;
