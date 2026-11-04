import { db } from "@/server/db";
import type { CommunityMembership } from "@/server/policies";

export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  isPrivate: boolean;
  suspended: boolean;
}

/** Communauté non supprimée, ou null. */
export async function findCommunity(communityId: string): Promise<CommunitySummary | null> {
  const community = await db.community.findFirst({
    where: { id: communityId, deletedAt: null },
    select: { id: true, slug: true, name: true, isPrivate: true, status: true },
  });
  if (!community) return null;
  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    isPrivate: community.isPrivate,
    suspended: community.status === "SUSPENDED",
  };
}

export async function findMembership(communityId: string, userId: string): Promise<CommunityMembership | null> {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true, status: true, community: { select: { status: true, deletedAt: true } } },
  });
  if (!member || member.community.deletedAt) return null;
  return {
    communityId,
    role: member.role,
    status: member.status,
    communitySuspended: member.community.status === "SUSPENDED",
  };
}

/** Communautés que l'utilisateur peut gérer (rôle MODERATOR ou plus, adhésion active). */
export async function listManagedCommunities(userId: string): Promise<CommunitySummary[]> {
  const rows = await db.communityMember.findMany({
    where: { userId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "MODERATOR"] }, community: { deletedAt: null } },
    select: { community: { select: { id: true, slug: true, name: true, isPrivate: true, status: true } } },
    orderBy: { community: { name: "asc" } },
    take: 50,
  });
  return rows.map(({ community }) => ({
    id: community.id,
    slug: community.slug,
    name: community.name,
    isPrivate: community.isPrivate,
    suspended: community.status === "SUSPENDED",
  }));
}
