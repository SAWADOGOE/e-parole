import { testAppUrl } from "./integration-env";

// Le client Prisma de l'application se connecte à la base de test avec le rôle applicatif.
process.env["DATABASE_URL"] = testAppUrl();
