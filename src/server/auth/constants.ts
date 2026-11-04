/** Âge minimal d'inscription. ⚠️ Hypothèse H4 (docs/28) à valider juridiquement. */
export const MINIMUM_AGE = 13;
export const ADULT_AGE = 18;

export const AUTH_LIMITS = {
  minPasswordLength: 10,
  maxPasswordLength: 128,
} as const;

/** Session membre : 30 jours glissants. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Session portant un rôle global : 12 heures maximum depuis la connexion. */
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Ré-authentification exigée pour les actions sensibles. */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;
