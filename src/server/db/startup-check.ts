import { logger } from "../logger";
import { findExcessPrivileges } from "./privileges";

/**
 * Refuse de démarrer si le rôle de DATABASE_URL peut réécrire la Bible ou l'audit.
 * Une base injoignable n'empêche pas le démarrage : c'est une panne passagère, pas un défaut de sécurité.
 */
export async function verifyDatabaseRoles(service: "web" | "worker"): Promise<void> {
  let excess: string[];
  try {
    excess = await findExcessPrivileges();
  } catch (error: unknown) {
    logger.warn({ err: error, service }, "contrôle des droits PostgreSQL impossible au démarrage");
    return;
  }
  if (excess.length === 0) return;
  logger.fatal({ service, tables: excess }, "le rôle applicatif a des droits d'écriture interdits : démarrage refusé");
  process.exit(1);
}
