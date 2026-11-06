import { vi } from "vitest";
import { testAppUrl } from "./integration-env";

// Le client Prisma de l'application se connecte à la base de test avec le rôle applicatif.
process.env["DATABASE_URL"] = testAppUrl();

// Hors de Next.js, le cache de données (unstable_cache, revalidate*) n'a pas de magasin : il devient transparent.
// Frontière de framework uniquement ; aucun module e-Parole n'est simulé.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
  updateTag: () => undefined,
}));
