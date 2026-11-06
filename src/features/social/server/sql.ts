import { Prisma } from "@/server/db";

/**
 * Fragments SQL des règles d'accès du réseau social (ADR-011), partagés par tous les repositories du module.
 * Une règle écrite une seule fois : un oubli sur une surface (fil, profil, commentaire, mention…) est impossible
 * tant que la requête compose ces fragments.
 */

/** Aucun blocage entre l'acteur et la colonne utilisateur donnée, dans un sens ou dans l'autre. */
export function notBlocked(viewerId: string, userColumn: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "block" bl
    WHERE (bl."blockerId" = ${viewerId} AND bl."blockedId" = ${userColumn})
       OR (bl."blockerId" = ${userColumn} AND bl."blockedId" = ${viewerId}))`;
}

/** L'acteur n'a pas mis cette personne en sourdine (fils et notifications seulement). */
export function notMuted(viewerId: string, userColumn: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`NOT EXISTS (SELECT 1 FROM "mute" mu WHERE mu."muterId" = ${viewerId} AND mu."mutedId" = ${userColumn})`;
}

/**
 * Compte dont le contenu reste affiché : ni supprimé, ni banni, ni en cours de suppression.
 * Un compte suspendu garde ses publications (la suspension retire l'accès, pas le contenu).
 */
export function visibleAccount(userAlias: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`${userAlias}."deletedAt" IS NULL AND ${userAlias}."status" IN ('ACTIVE', 'SUSPENDED')`;
}

export const col = (name: string): Prisma.Sql => Prisma.raw(name);
