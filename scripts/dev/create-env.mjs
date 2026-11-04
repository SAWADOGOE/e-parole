#!/usr/bin/env node
/**
 * Crée .env à partir de .env.example en remplaçant chaque CHANGE_ME par un secret aléatoire.
 * Usage : node scripts/dev/create-env.mjs [--force]
 * Les secrets générés ne sont jamais affichés.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const force = process.argv.includes("--force");
if (existsSync(".env") && !force) {
  console.error(".env existe déjà (utiliser --force pour le régénérer).");
  process.exit(1);
}

const hex = (n) => randomBytes(n).toString("hex");
const ownerPassword = hex(16);
const appPassword = hex(16);

const replacements = [
  ["POSTGRES_OWNER_PASSWORD=CHANGE_ME", `POSTGRES_OWNER_PASSWORD=${ownerPassword}`],
  ["POSTGRES_APP_PASSWORD=CHANGE_ME", `POSTGRES_APP_PASSWORD=${appPassword}`],
  ["eparole_app:CHANGE_ME", `eparole_app:${appPassword}`],
  ["eparole_owner:CHANGE_ME", `eparole_owner:${ownerPassword}`],
  ["BETTER_AUTH_SECRET=CHANGE_ME_32_BYTES_MIN", `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}`],
  ["S3_ACCESS_KEY_ID=CHANGE_ME", `S3_ACCESS_KEY_ID=eparole${hex(6)}`],
  ["S3_SECRET_ACCESS_KEY=CHANGE_ME", `S3_SECRET_ACCESS_KEY=${hex(20)}`],
  ["SEED_SUPER_ADMIN_PASSWORD=CHANGE_ME_LONG_PASSWORD", `SEED_SUPER_ADMIN_PASSWORD=${randomBytes(18).toString("base64url")}`],
];

let content = readFileSync(".env.example", "utf8");
for (const [from, to] of replacements) content = content.replaceAll(from, to);
const leftovers = content.split("\n").filter((line) => !line.startsWith("#") && line.includes("CHANGE_ME"));
if (leftovers.length > 0) {
  console.error("Valeurs non remplacées :", leftovers.map((l) => l.split("=")[0]).join(", "));
  process.exit(1);
}
writeFileSync(".env", content, { encoding: "utf8", mode: 0o600 });
console.log(".env créé. Le mot de passe du SUPER_ADMIN de développement se trouve dans SEED_SUPER_ADMIN_PASSWORD.");
