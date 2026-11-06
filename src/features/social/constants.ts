/** Réseau social (Phase 3) — limites et listes fermées. */

export const POST_TYPES = ["TEXT", "TESTIMONY", "QUESTION", "MEDITATION", "ANNOUNCEMENT"] as const;
export type PostTypeName = (typeof POST_TYPES)[number];

/** Exactement trois réactions (REQ-SOC-3), toujours affichées avec un libellé. */
export const REACTION_KINDS = ["AMEN", "LOVE", "ENCOURAGED"] as const;
export type ReactionKindName = (typeof REACTION_KINDS)[number];
export const REACTION_EMOJI: Readonly<Record<ReactionKindName, string>> = { AMEN: "🙏", LOVE: "❤️", ENCOURAGED: "💪" };

/** Visibilité d'un champ de profil : public, abonnés, moi. */
export const FIELD_VISIBILITIES = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;
export type FieldVisibility = (typeof FIELD_VISIBILITIES)[number];

export const POST_BODY_MAX = 5000;
export const COMMENT_BODY_MAX = 2000;
export const BIO_MAX = 280;
export const DISPLAY_NAME_MAX = 60;
export const ALT_TEXT_MAX = 300;
export const MAX_POST_IMAGES = 4;
export const MAX_MENTIONS = 10;
/** Un passage cité couvre au plus 30 versets (contrainte SQL post_verse_ref_chk). */
export const MAX_QUOTED_VERSES = 30;

export const FEED_PAGE_SIZE = 15;
/** La page suivante est demandée quand 80 % de la page courante a défilé (docs/29). */
export const FEED_PREFETCH_RATIO = 0.8;
/** Au-delà, le fil affiche « Tu es à jour » et ne charge plus seul (docs/14). */
export const FRESH_WINDOW_HOURS = 48;
export const COMMENTS_PAGE_SIZE = 20;
export const REPLIES_PER_COMMENT = 50;
export const PEOPLE_PAGE_SIZE = 20;
export const MENTION_SUGGESTIONS = 6;

/** Un compte de moins de 7 jours a des limites de publication réduites (docs/19). */
export const NEW_ACCOUNT_DAYS = 7;
/** Un changement d'@handle par 24 h au plus. */
export const HANDLE_CHANGE_COOLDOWN_HOURS = 24;

export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
