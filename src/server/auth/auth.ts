import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { recordAudit } from "../audit/audit";
import { db } from "../db";
import { getEnv } from "../env";
import { enqueueEmail } from "../jobs/enqueue";
import { logger } from "../logger";
import { consumeRateLimit, refundRateLimit } from "../rate-limit/rate-limit";
import { AUTH_LIMITS, MINIMUM_AGE, SESSION_MAX_AGE_SECONDS, TRUSTED_IP_HEADER } from "./constants";
import { accountSubject, emailSendingLimit, SIGN_IN_PATH, signInFailureLimits } from "./account-limits";
import { createProfileForUser } from "./profile-bootstrap";
import { markSessionMfaVerified, revokeOtherSessions } from "./session-repository";

const MFA_VERIFICATION_PATHS = new Set(["/two-factor/verify-totp", "/two-factor/verify-backup-code"]);
const MFA_CHANGE_PATHS = new Set(["/two-factor/enable", "/two-factor/disable"]);

function isTooYoung(birthYear: unknown): boolean {
  if (typeof birthYear !== "number") return true;
  return new Date().getUTCFullYear() - birthYear < MINIMUM_AGE;
}

function tooManyRequests(retryAfterSeconds: number): APIError {
  return new APIError("TOO_MANY_REQUESTS", { message: "RATE_LIMITED", headers: { "Retry-After": String(retryAfterSeconds) } });
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
      // autoSignIn désactivé : Better Auth renvoie alors une réponse identique que l'adresse existe ou non
      // (pas d'énumération). La vérification de l'email connecte ensuite l'utilisateur.
      autoSignIn: false,
      onExistingUserSignUp: async ({ user }) => {
        // Limite par destinataire : empêche d'inonder la boîte d'un membre existant.
        const { allowed } = await consumeRateLimit("auth.account_exists.account", accountSubject(user.email));
        if (!allowed) return;
        await enqueueEmail({ to: user.email, template: "account-exists", url: `${getEnv().APP_URL}/connexion` });
      },
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
        mfaVerifiedAt: { type: "date", required: false, input: false },
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
    // Limites par compte (email haché), en complément de la limite par IP ci-dessus (docs/19-SECURITY.md).
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === SIGN_IN_PATH) {
          const ip = ctx.request?.headers.get(TRUSTED_IP_HEADER) ?? null;
          // Réservation atomique d'un créneau AVANT la vérification (pas de course entre tentatives simultanées).
          const reserved: { name: (typeof limits)[number]["name"]; subject: string }[] = [];
          const limits = signInFailureLimits(ctx.body, ip);
          for (const limit of limits) {
            const { allowed, retryAfterSeconds } = await consumeRateLimit(limit.name, limit.subject);
            reserved.push(limit);
            if (!allowed) {
              for (const r of reserved) await refundRateLimit(r.name, r.subject);
              throw tooManyRequests(retryAfterSeconds);
            }
          }
          return;
        }
        const limit = emailSendingLimit(ctx.path, ctx.body);
        if (!limit) return;
        const { allowed, retryAfterSeconds } = await consumeRateLimit(limit.name, limit.subject);
        if (!allowed) throw tooManyRequests(retryAfterSeconds);
      }),
      // Seuls les ÉCHECS de connexion sont comptés : un tiers ne peut pas verrouiller un compte avec de bonnes requêtes,
      // et le compteur email+IP n'affecte pas l'utilisateur légitime connecté depuis une autre adresse.
      after: createAuthMiddleware(async (ctx) => {
        const failed = isAPIError(ctx.context.returned);
        if (ctx.path === SIGN_IN_PATH) {
          // Succès : le créneau réservé est rendu. Échec : il reste compté.
          if (!failed) {
            const ip = ctx.request?.headers.get(TRUSTED_IP_HEADER) ?? null;
            for (const limit of signInFailureLimits(ctx.body, ip)) await refundRateLimit(limit.name, limit.subject);
          }
          return;
        }
        if (failed) return;
        // Le second facteur est attesté PAR SESSION : /admin exige mfaVerifiedAt (docs/admin/ADMIN-SECURITY.md).
        if (MFA_VERIFICATION_PATHS.has(ctx.path)) {
          const sessionId = ctx.context.newSession?.session.id;
          if (sessionId) await markSessionMfaVerified(sessionId);
          return;
        }
        // Activer ou désactiver la 2FA révoque toutes les autres sessions du compte.
        if (MFA_CHANGE_PATHS.has(ctx.path)) {
          const current = ctx.context.session?.session;
          if (current) await revokeOtherSessions(current.userId, current.id);
        }
      }),
    },
    advanced: {
      // Seul l'en-tête posé (et écrasé) par le reverse proxy est pris en compte ; X-Forwarded-For est ignoré.
      ipAddress: { ipAddressHeaders: [TRUSTED_IP_HEADER] },
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
            const birthYear = (user as { birthYear?: unknown }).birthYear;
            await createProfileForUser(user.id, user.name, typeof birthYear === "number" ? birthYear : null);
          },
        },
        update: {
          // L'année de naissance n'est fixée qu'à l'inscription : toute modification ultérieure est ignorée.
          before: (data) => {
            const rest: Record<string, unknown> = { ...data };
            delete rest["birthYear"];
            return Promise.resolve({ data: rest });
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const owner = await db.user.findUnique({
              where: { id: session.userId },
              select: { status: true, deletedAt: true, suspendedUntil: true },
            });
            // Suspension échue mais pas encore levée par le worker : le compte retrouve son accès dès maintenant.
            if (owner?.status === "SUSPENDED" && owner.suspendedUntil && owner.suspendedUntil <= new Date()) {
              await db.$transaction(async (tx) => {
                const { count } = await tx.user.updateMany({ where: { id: session.userId, status: "SUSPENDED" }, data: { status: "ACTIVE", suspendedUntil: null } });
                if (count === 1) await recordAudit({ actor: null, action: "user.suspension.expired", targetType: "user", targetId: session.userId }, tx);
              });
              owner.status = "ACTIVE";
            }
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
        // Verrouillage par compte, tous défis confondus (NIST SP 800-63B §5.2.2).
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 15 * 60 },
        // Pas d'« appareil de confiance » : il permettrait d'ouvrir une session sans second facteur.
        trustDeviceMaxAge: 1,
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
