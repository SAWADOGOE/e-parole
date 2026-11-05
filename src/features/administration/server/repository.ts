import { db, type TransactionClient } from "@/server/db";
import type { AccountStatusName, GlobalRoleName } from "@/server/policies";
import { maskEmail } from "../lib/mask-email";
import { ADMIN_PAGE_SIZE, type AuditListQuery, type UserListQuery } from "../schemas";

export interface AdminUserRow {
  id: string;
  displayName: string;
  handle: string | null;
  maskedEmail: string;
  status: AccountStatusName;
  roles: GlobalRoleName[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
}


export async function listUsers(query: UserListQuery): Promise<{ rows: AdminUserRow[]; total: number }> {
  const q = query.q;
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { email: { equals: q.toLowerCase() } },
            { profile: { handle: { contains: q.replace(/^@/, ""), mode: "insensitive" as const } } },
            { profile: { displayName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        roles: { select: { role: true } },
        profile: { select: { handle: true, displayName: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return {
    total,
    rows: users.map((u) => ({
      id: u.id,
      displayName: u.profile?.displayName ?? u.name,
      handle: u.profile?.handle ?? null,
      maskedEmail: maskEmail(u.email),
      status: u.status,
      roles: u.roles.map((r) => r.role),
      emailVerified: u.emailVerified,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
    })),
  };
}

export async function findAdminUser(userId: string): Promise<AdminUserRow | null> {
  const u = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      roles: { select: { role: true } },
      profile: { select: { handle: true, displayName: true } },
    },
  });
  if (!u) return null;
  return {
    id: u.id,
    displayName: u.profile?.displayName ?? u.name,
    handle: u.profile?.handle ?? null,
    maskedEmail: maskEmail(u.email),
    status: u.status,
    roles: u.roles.map((r) => r.role),
    emailVerified: u.emailVerified,
    twoFactorEnabled: u.twoFactorEnabled,
    createdAt: u.createdAt,
  };
}

export async function findUserRoles(userId: string): Promise<GlobalRoleName[] | null> {
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { roles: { select: { role: true } } },
  });
  return user ? user.roles.map((r) => r.role) : null;
}

export async function grantRole(tx: TransactionClient, userId: string, role: GlobalRoleName, grantedById: string) {
  await tx.userRole.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role, grantedById },
    update: {},
  });
  // Un changement de rôle révoque les sessions de la cible (docs/admin/ADMIN-SECURITY.md).
  await tx.session.deleteMany({ where: { userId } });
}

export async function revokeRole(tx: TransactionClient, userId: string, role: GlobalRoleName): Promise<void> {
  await tx.userRole.deleteMany({ where: { userId, role } });
  await tx.session.deleteMany({ where: { userId } });
}

export async function hasRole(tx: TransactionClient, userId: string, role: GlobalRoleName): Promise<boolean> {
  return (await tx.userRole.count({ where: { userId, role } })) > 0;
}

export interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  actorLabel: string | null;
  actorRoles: string[];
  createdAt: Date;
  requestId: string | null;
}

/** Liste du journal ; restrictToActorId limite aux actions propres (MODERATOR). */
export async function listAuditLogs(
  query: AuditListQuery,
  restrictToActorId: string | null,
): Promise<{ rows: AuditRow[]; total: number }> {
  const where = {
    ...(query.action ? { action: { startsWith: query.action } } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(restrictToActorId ? { actorId: restrictToActorId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        actorRoles: true,
        createdAt: true,
        requestId: true,
        actor: { select: { profile: { select: { handle: true } } } },
      },
    }),
    db.auditLog.count({ where }),
  ]);
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      actorLabel: r.actor?.profile?.handle ? `@${r.actor.profile.handle}` : null,
      actorRoles: r.actorRoles,
      createdAt: r.createdAt,
      requestId: r.requestId,
    })),
  };
}

export interface DashboardCounts {
  users: number;
  newUsers7d: number;
  activeUsers7d: number;
  suspendedUsers: number;
  communities: number;
}

/** KPI réels du MVP minimal (aucune valeur fictive). */
export async function getDashboardCounts(now = new Date()): Promise<DashboardCounts> {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [users, newUsers7d, activeUsers7d, suspendedUsers, communities] = await Promise.all([
    db.user.count({ where: { deletedAt: null, status: { in: ["ACTIVE", "SUSPENDED"] } } }),
    db.user.count({ where: { deletedAt: null, emailVerified: true, createdAt: { gte: since } } }),
    db.user.count({ where: { deletedAt: null, sessions: { some: { updatedAt: { gte: since } } } } }),
    db.user.count({ where: { deletedAt: null, status: "SUSPENDED" } }),
    db.community.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);
  return { users, newUsers7d, activeUsers7d, suspendedUsers, communities };
}
