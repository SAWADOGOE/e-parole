export const GLOBAL_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CONTENT_EDITOR"] as const;
export type GlobalRoleName = (typeof GLOBAL_ROLES)[number];

/** MEMBER est implicite : absence de ligne UserRole. */
export const MEMBER = "MEMBER" as const;
export type EffectiveGlobalRole = GlobalRoleName | typeof MEMBER;

export const COMMUNITY_ROLES = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"] as const;
export type CommunityRoleName = (typeof COMMUNITY_ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_DELETION"] as const;
export type AccountStatusName = (typeof ACCOUNT_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ["PENDING", "ACTIVE", "BANNED", "LEFT"] as const;
export type MembershipStatusName = (typeof MEMBERSHIP_STATUSES)[number];

const GLOBAL_RANK: Record<EffectiveGlobalRole, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MODERATOR: 2,
  CONTENT_EDITOR: 1,
  MEMBER: 0,
};

const COMMUNITY_RANK: Record<CommunityRoleName, number> = {
  OWNER: 3,
  ADMIN: 2,
  MODERATOR: 1,
  MEMBER: 0,
};

/** Rang le plus élevé parmi les rôles globaux (0 = membre). */
export function globalRank(roles: readonly GlobalRoleName[]): number {
  return roles.reduce((max, role) => Math.max(max, GLOBAL_RANK[role]), GLOBAL_RANK.MEMBER);
}

export function communityRank(role: CommunityRoleName): number {
  return COMMUNITY_RANK[role];
}

export function hasGlobalRole(roles: readonly GlobalRoleName[]): boolean {
  return roles.length > 0;
}
