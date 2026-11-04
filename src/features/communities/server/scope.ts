import "server-only";
import { notFound } from "next/navigation";
import { recordAudit } from "@/server/audit/audit";
import { getCurrentSession } from "@/server/auth/session";
import { evaluateCommunity, type Actor, type CommunityMembership } from "@/server/policies";
import { getRequestContext } from "@/server/request-context";
import { findCommunity, findMembership, type CommunitySummary } from "./repository";

/**
 * Preuve typée qu'un acteur a accès à une communauté.
 * Les repositories communautaires exigent ce scope en premier paramètre (docs/11, isolation).
 */
export interface CommunityScope {
  readonly actor: Actor;
  readonly community: CommunitySummary;
  readonly membership: CommunityMembership;
}

/** Garde de /manage : 404 si la communauté n'existe pas ou si l'acteur ne la gère pas. */
export async function requireCommunityManager(communityId: string): Promise<CommunityScope> {
  const session = await getCurrentSession();
  if (!session) notFound();
  const community = await findCommunity(communityId);
  if (!community) notFound();
  const membership = await findMembership(community.id, session.actor.userId);
  if (!evaluateCommunity(session.actor, membership, "community:manage:access").allowed || !membership) {
    const context = await getRequestContext();
    await recordAudit({
      actor: session.actor,
      action: "security.cross_community_attempt",
      targetType: "community",
      targetId: community.id,
      requestId: context.requestId,
      ip: context.ip,
    });
    notFound();
  }
  return { actor: session.actor, community, membership };
}
