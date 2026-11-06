import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { recordAudit } from "../audit/audit";
import { db } from "../db";
import { AppError } from "../errors/app-error";
import { getRequestContext } from "../request-context";
import { can, type Actor, type GlobalPermission, type PolicyResource } from "../policies";
import { ADMIN_SESSION_MAX_AGE_MS, ADULT_AGE, REAUTH_WINDOW_MS } from "./constants";
import { getAuth } from "./auth";
import { findSessionMarkers } from "./session-repository";
import { consumeRateLimit } from "../rate-limit/rate-limit";

export interface CurrentSession {
  sessionId: string;
  createdAt: Date;
  reauthenticatedAt: Date | null;
  mfaVerifiedAt: Date | null;
  actor: Actor;
  displayName: string;
  handle: string | null;
  email: string;
}

/** Session et acteur de la requête courante, chargés une seule fois par requête. */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result) return null;

  const user = await db.user.findUnique({
    where: { id: result.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      twoFactorEnabled: true,
      status: true,
      birthYear: true,
      deletedAt: true,
      roles: { select: { role: true } },
      profile: { select: { handle: true, displayName: true } },
    },
  });
  // Un compte non actif (suspendu, banni, en suppression) n'a plus de session utilisable.
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null;

  const session = await findSessionMarkers(result.session.id);

  const currentYear = new Date().getUTCFullYear();
  const actor: Actor = {
    userId: user.id,
    globalRoles: user.roles.map((r) => r.role),
    status: user.status,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    isMinor: user.birthYear === null ? true : currentYear - user.birthYear < ADULT_AGE,
    canPublishEditorial: false,
  };

  return {
    sessionId: result.session.id,
    createdAt: session?.createdAt ?? new Date(result.session.createdAt),
    reauthenticatedAt: session?.reauthenticatedAt ?? null,
    mfaVerifiedAt: session?.mfaVerifiedAt ?? null,
    actor,
    displayName: user.profile?.displayName ?? user.name,
    handle: user.profile?.handle ?? null,
    email: user.email,
  };
});

/**
 * Journalise un accès refusé, une seule fois par requête (layout + page) et au plus 20 fois par heure et par
 * utilisateur, pour qu'un compte ne puisse pas remplir le journal append-only.
 */
export const recordDeniedAccess = cache(
  async (
    actor: Actor,
    action: "security.admin_access_denied" | "security.cross_community_attempt",
    targetType: string,
    targetId: string,
  ): Promise<void> => {
    const { allowed } = await consumeRateLimit("audit.access_denied", actor.userId);
    if (!allowed) return;
    const context = await getRequestContext();
    await recordAudit({ actor, action, targetType, targetId, requestId: context.requestId, ip: context.ip });
  },
);

export async function getActor(): Promise<Actor | null> {
  return (await getCurrentSession())?.actor ?? null;
}

/** Pour les actions : lève UNAUTHENTICATED. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AppError("UNAUTHENTICATED");
  return actor;
}

export async function requireVerifiedActor(): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED");
  return actor;
}

export function isAdminSessionExpired(session: Pick<CurrentSession, "createdAt">, now = Date.now()): boolean {
  return now - session.createdAt.getTime() > ADMIN_SESSION_MAX_AGE_MS;
}

export function hasRecentReauth(session: Pick<CurrentSession, "reauthenticatedAt">, now = Date.now()): boolean {
  return session.reauthenticatedAt !== null && now - session.reauthenticatedAt.getTime() <= REAUTH_WINDOW_MS;
}

export type AdminGateResult =
  | { kind: "ok"; session: CurrentSession }
  | { kind: "not_found" }
  | { kind: "mfa_required" }
  | { kind: "mfa_reverify" }
  | { kind: "session_expired" };

/** Décision pure d'accès à /admin (testée unitairement). */
export function evaluateAdminGate(session: CurrentSession | null, now = Date.now()): AdminGateResult {
  if (!session || session.actor.globalRoles.length === 0 || session.actor.status !== "ACTIVE") {
    return { kind: "not_found" };
  }
  if (!session.actor.twoFactorEnabled) return { kind: "mfa_required" };
  // La MFA doit avoir été vérifiée pour CETTE session (une session ouverte avant l'activation ne suffit pas).
  if (session.mfaVerifiedAt === null) return { kind: "mfa_reverify" };
  if (isAdminSessionExpired(session, now)) return { kind: "session_expired" };
  return { kind: "ok", session };
}

/** Garde de page /admin : 404 pour les non-admins, redirection si MFA absente ou session trop ancienne. */
export async function requireAdminPage(): Promise<CurrentSession> {
  const current = await getCurrentSession();
  const gate = evaluateAdminGate(current);
  switch (gate.kind) {
    case "ok":
      return gate.session;
    case "not_found":
      if (current) await recordDeniedAccess(current.actor, "security.admin_access_denied", "route", "/admin");
      notFound();
    case "mfa_required":
      redirect("/parametres/securite?mfa=requis");
    case "mfa_reverify":
      redirect("/connexion?raison=mfa-admin");
    case "session_expired":
      redirect("/connexion?raison=session-admin-expiree");
  }
}

/**
 * Garde de page /admin avec permission (dette Phase 2 généralisée) : un membre du staff sans la permission reçoit
 * un 404 et la tentative est journalisée (security.admin_access_denied), comme un non-admin.
 */
export async function requireAdminPermission(permission: GlobalPermission, path: string, resource?: PolicyResource): Promise<CurrentSession> {
  const session = await requireAdminPage();
  if (!can(session.actor, permission, resource)) {
    await recordDeniedAccess(session.actor, "security.admin_access_denied", "route", path);
    notFound();
  }
  return session;
}

/** Garde d'action admin : lève une AppError (jamais de redirection dans une action). */
export async function requireAdminActor(): Promise<CurrentSession> {
  const gate = evaluateAdminGate(await getCurrentSession());
  switch (gate.kind) {
    case "ok":
      return gate.session;
    case "not_found":
      throw new AppError("NOT_FOUND");
    case "mfa_required":
    case "mfa_reverify":
      throw new AppError("MFA_REQUIRED");
    case "session_expired":
      throw new AppError("UNAUTHENTICATED", { message: "Session d'administration expirée : reconnecte-toi." });
  }
}
