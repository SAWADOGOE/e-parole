/**
 * Seed de développement — aucune donnée réelle.
 * Crée un SUPER_ADMIN local (identifiants lus dans .env) et les feature flags par défaut.
 * Refuse de s'exécuter en production.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../generated/prisma/client";

if (process.env["NODE_ENV"] === "production" || process.env["APP_ENV"] === "production") {
  console.error("Seed refusé : environnement de production.");
  process.exit(1);
}

const connectionString = process.env["MIGRATION_DATABASE_URL"];
if (!connectionString) throw new Error("MIGRATION_DATABASE_URL manquant");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const FEATURE_FLAGS = [
  { key: "bible.reader", description: "Lecteur biblique (Phase 2)", isCritical: false },
  { key: "social.posts", description: "Publications (Phase 3)", isCritical: false },
  { key: "communities", description: "Communautés (Phase 4)", isCritical: false },
  { key: "prayers", description: "Demandes de prière (Phase 4)", isCritical: false },
  { key: "messaging", description: "Messagerie (Phase 7)", isCritical: true },
  { key: "registrations.open", description: "Inscriptions ouvertes", isCritical: true },
] as const;

async function seedSuperAdmin(): Promise<void> {
  const email = process.env["SEED_SUPER_ADMIN_EMAIL"]?.toLowerCase();
  const password = process.env["SEED_SUPER_ADMIN_PASSWORD"];
  const name = process.env["SEED_SUPER_ADMIN_NAME"] ?? "Administrateur e-Parole";
  if (!email || !password || password.length < 12) {
    throw new Error("SEED_SUPER_ADMIN_EMAIL et SEED_SUPER_ADMIN_PASSWORD (12 caractères min.) sont requis");
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log("SUPER_ADMIN déjà présent, aucune modification.");
    return;
  }

  const hashed = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        emailVerified: true,
        birthYear: 1980,
        profile: { create: { handle: "admin_eparole", displayName: name } },
      },
    });
    // Comme Better Auth : pour le fournisseur « credential », accountId = id de l'utilisateur.
    await tx.account.create({ data: { userId: user.id, providerId: "credential", accountId: user.id, password: hashed } });
    await tx.userRole.create({ data: { userId: user.id, role: "SUPER_ADMIN" } });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "seed.super_admin.created",
        targetType: "user",
        targetId: user.id,
        metadata: { isDemo: true },
      },
    });
  });
  console.log(`SUPER_ADMIN créé (${email}). Activez la double authentification à la première connexion.`);
}

async function seedFeatureFlags(): Promise<void> {
  for (const flag of FEATURE_FLAGS) {
    await db.featureFlag.upsert({
      where: { key: flag.key },
      create: {
        key: flag.key,
        description: flag.description,
        isCritical: flag.isCritical,
        enabled: flag.key === "registrations.open",
        rolloutPercent: flag.key === "registrations.open" ? 100 : 0,
      },
      update: {},
    });
  }
  console.log(`${FEATURE_FLAGS.length} feature flags vérifiés.`);
}

try {
  await seedSuperAdmin();
  await seedFeatureFlags();
} finally {
  await db.$disconnect();
}
