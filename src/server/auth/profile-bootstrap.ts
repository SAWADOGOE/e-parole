import { randomInt } from "node:crypto";
import { db } from "../db";

const HANDLE_MAX_BASE = 24;

/** Dérive un @handle valide (^[a-z0-9_]{3,30}$) à partir du nom affiché. */
export function handleBaseFromName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX_BASE);
  return base.length >= 3 ? base : `membre${base}`;
}

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
