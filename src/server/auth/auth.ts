import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "../db";
import { getEnv } from "../env";
import { enqueueEmail } from "../jobs/enqueue";
import { logger } from "../logger";
import { AUTH_LIMITS, MINIMUM_AGE, SESSION_MAX_AGE_SECONDS } from "./constants";
import { createProfileForUser } from "./profile-bootstrap";

function isTooYoung(birthYear: unknown): boolean {
  if (typeof birthYear !== "number") return true;
  return new Date().getUTCFullYear() - birthYear < MINIMUM_AGE;
}

function buildAuth() {
  const env = getEnv();
  return betterAuth({
    appName: "e-Parole",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: prismaAdapter(db, { provider: "postgresql" }),
    user: {
      additionalFields: {
        birthYear: { type: "number", required: true, input: true },
        status: { type: "string", required: false, input: false, defaultValue: "ACTIVE" },
        locale: { type: "string", required: false, input: false, defaultValue: "fr" },
      },
    },
    emailAndPassword: {
      enabled: true,
      // Un compte non vérifié peut lire ; toute écriture est refusée par authorize() (docs/12-AUTHENTICATION.md).
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: AUTH_LIMITS.minPasswordLength,
      maxPasswordLength: AUTH_LIMITS.maxPasswordLength,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await enqueueEmail({ to: user.email, template: "reset-password", url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await enqueueEmail({ to: user.email, template: "verify-email", url });
      },
    },
    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: 24 * 60 * 60,
      additionalFields: {
        reauthenticatedAt: { type: "date", required: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 5 },
        "/sign-up/email": { window: 60 * 60, max: 5 },
        "/request-password-reset": { window: 60 * 60, max: 3 },
        "/send-verification-email": { window: 60 * 60, max: 3 },
        "/two-factor/verify-totp": { window: 5 * 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 5 * 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "eparole",
      useSecureCookies: env.NODE_ENV === "production",
      database: { generateId: false },
    },
    databaseHooks: {
      user: {
        create: {
          before: (user) => {
            if (isTooYoung((user as { birthYear?: unknown }).birthYear)) {
              return Promise.reject(new APIError("BAD_REQUEST", { message: "AGE_REQUIREMENT_NOT_MET" }));
            }
            return Promise.resolve({ data: user });
          },
          after: async (user) => {
            await createProfileForUser(user.id, user.name);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const owner = await db.user.findUnique({
              where: { id: session.userId },
              select: { status: true, deletedAt: true },
            });
            if (!owner || owner.deletedAt || owner.status !== "ACTIVE") {
              logger.warn({ userId: session.userId }, "connexion refusée : compte non actif");
              throw new APIError("FORBIDDEN", { message: "ACCOUNT_NOT_ACTIVE" });
            }
            return { data: session };
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: "e-Parole",
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof buildAuth>;

const globalForAuth = globalThis as unknown as { eparoleAuth?: Auth };

/** Instance Better Auth (construite à la première utilisation, pour lire l'environnement au runtime). */
export function getAuth(): Auth {
  globalForAuth.eparoleAuth ??= buildAuth();
  return globalForAuth.eparoleAuth;
}
