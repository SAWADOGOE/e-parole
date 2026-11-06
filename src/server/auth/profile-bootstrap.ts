import { randomInt } from "node:crypto";
import { db } from "../db";
import { ADULT_AGE } from "./constants";
import { handleBaseFromName } from "./handle";


/**
 * Crée le profil initial ; le membre peut ensuite changer son @handle. Un mineur (ou une année absente) n'est pas
 * découvrable par défaut (docs/20) : il n'apparaît ni dans la recherche ni dans l'autocomplétion des mentions.
 */
export async function createProfileForUser(userId: string, name: string, birthYear: number | null): Promise<void> {
  const isMinor = birthYear === null || new Date().getUTCFullYear() - birthYear < ADULT_AGE;
  const base = handleBaseFromName(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const handle = `${base}_${randomInt(1000, 99999)}`;
    const taken = await db.profile.findFirst({ where: { handle: { equals: handle, mode: "insensitive" } } });
    if (taken) continue;
    await db.profile.create({ data: { userId, handle, displayName: name.trim().slice(0, 60), isDiscoverable: !isMinor } });
    return;
  }
  throw new Error("Impossible de générer un identifiant de profil unique");
}
