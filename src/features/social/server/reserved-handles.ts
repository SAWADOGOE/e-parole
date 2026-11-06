import "server-only";

/** Identifiants réservés : routes, rôles, marque, usurpation pastorale. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin", "administrateur", "moderateur", "moderation", "support", "aide", "eparole", "e_parole", "parole",
  "officiel", "equipe", "staff", "root", "system", "systeme", "securite", "manage", "api", "bible", "prieres",
  "communautes", "publier", "profil", "parametres", "connexion", "inscription", "notifications", "favoris", "membres",
  "publications", "pasteur", "pastor", "apotre", "prophete", "eveque", "jesus", "christ", "dieu",
]);
