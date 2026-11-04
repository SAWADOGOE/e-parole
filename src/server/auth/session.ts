import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { recordAudit } from "../audit/audit";
import { db } from "../db";
import { AppError } from "../errors/app-error";
import { getRequestContext } from "../request-context";
import type { Actor } from "../policies";
import { ADMIN_SESSION_MAX_AGE_MS, ADULT_AGE, REAUTH_WINDOW_MS } from "./constants";
import { getAuth } from "./auth";

export interface CurrentSession {
  sessionId: string;
  createdAt: Date;
  reauthenticatedAt: Date | null;
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
  if (!user || user.deletedAt) return null;

  const session = await db.session.findUnique({
    where: { id: result.session.id },
    select: { reauthenticatedAt: true, createdAt: true },
  });

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
    actor,
    displayName: user.profile?.displayName ?? user.name,
    handle: user.profile?.handle ?? null,
    email: user.email,
  };
});

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
  | { kind: "session_expired" };

/** Décision pure d'accès à /admin (testée unitairement). */
export function evaluateAdminGate(session: CurrentSession | null, now = Date.now()): AdminGateResult {
  if (!session || session.actor.globalRoles.length === 0 || session.actor.status !== "ACTIVE") {
    return { kind: "not_found" };
  }
  if (!session.actor.twoFactorEnabled) return { kind: "mfa_required" };
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
      if (current) {
        const context = await getRequestContext();
        await recordAudit({
          actor: current.actor,
          action: "security.admin_access_denied",
          targetType: "route",
          targetId: "/admin",
          requestId: context.requestId,
          ip: context.ip,
        });
      }
      notFound();
    case "mfa_required":
      redirect("/parametres/securite?mfa=requis");
    case "session_expired":
      redirect("/connexion?raison=session-admin-expiree");
  }
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
      throw new AppError("MFA_REQUIRED");
    case "session_expired":
      throw new AppError("UNAUTHENTICATED", { message: "Session d'administration expirée : reconnecte-toi." });
  }
}
