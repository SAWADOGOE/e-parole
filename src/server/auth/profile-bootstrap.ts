import { randomInt } from "node:crypto";
import { db } from "../db";
import { handleBaseFromName } from "./handle";


/** Crée le profil initial ; le membre pourra changer son @handle plus tard (Phase 3). */
export async function createProfileForUser(userId: string, name: string): Promise<void> {
  const base = handleBaseFromName(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const handle = `${base}_${randomInt(1000, 99999)}`;
    const taken = await db.profile.findFirst({ where: { handle: { equals: handle, mode: "insensitive" } } });
    if (taken) continue;
    await db.profile.create({ data: { userId, handle, displayName: name.trim().slice(0, 60) } });
    return;
  }
  throw new Error("Impossible de générer un identifiant de profil unique");
}
