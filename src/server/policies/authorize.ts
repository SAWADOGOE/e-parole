import { AppError } from "../errors/app-error";
import {
  COMMUNITY_PERMISSIONS,
  GLOBAL_PERMISSIONS,
  type CommunityPermission,
  type GlobalPermission,
} from "./permissions";
import { communityRank, globalRank, MEMBER, type EffectiveGlobalRole } from "./roles";
import type { Actor, CommunityMembership, Condition, PermissionSpec, PolicyResource, Rule } from "./types";

type Decision = { allowed: true } | { allowed: false; reason: "FORBIDDEN" | "EMAIL_NOT_VERIFIED" };

const ALLOW: Decision = { allowed: true };
const DENY: Decision = { allowed: false, reason: "FORBIDDEN" };

function checkCondition(condition: Condition, actor: Actor, resource: PolicyResource): Decision {
  switch (condition.kind) {
    case "verifiedEmail":
      return actor.emailVerified ? ALLOW : { allowed: false, reason: "EMAIL_NOT_VERIFIED" };
    case "own":
      return resource.ownerId === actor.userId ? ALLOW : DENY;
    case "selfAssign":
      return resource.assigneeId === actor.userId ? ALLOW : DENY;
    case "maxDurationDays":
      return resource.durationDays !== undefined && resource.durationDays <= condition.days ? ALLOW : DENY;
    case "notOwnDecision":
      return resource.decidedById !== undefined && resource.decidedById !== actor.userId ? ALLOW : DENY;
    case "notOwnContent":
      return resource.authorId !== undefined && resource.authorId !== actor.userId ? ALLOW : DENY;
    case "canPublishFlag":
      return actor.canPublishEditorial ? ALLOW : DENY;
    case "nonCriticalFlag":
      return resource.flagIsCritical === false ? ALLOW : DENY;
    case "ownActionsOnly":
      return resource.auditActorId === actor.userId ? ALLOW : DENY;
    case "analyticsScope":
      return resource.analyticsScope === condition.scope ? ALLOW : DENY;
    case "linkedToCase":
      return resource.linkedToCase === true ? ALLOW : DENY;
    case "targetRankBelow":
      return resource.targetCommunityRole !== undefined &&
        communityRank(resource.targetCommunityRole) < condition.rank
        ? ALLOW
        : DENY;
    case "notSelf":
      return resource.targetUserId !== undefined && resource.targetUserId !== actor.userId ? ALLOW : DENY;
    case "memberInvitesAllowed":
      return resource.communityAllowsMemberInvites === true ? ALLOW : DENY;
    default: {
      const exhaustive: never = condition;
      return exhaustive;
    }
  }
}

function checkRule(rule: Rule, actor: Actor, resource: PolicyResource): Decision {
  if (rule === true) return ALLOW;
  for (const condition of rule) {
    const decision = checkCondition(condition, actor, resource);
    if (!decision.allowed) return decision;
  }
  return ALLOW;
}

/** Combine les règles de plusieurs rôles : autorisé si au moins un rôle autorise. */
function bestDecision(decisions: Decision[]): Decision {
  if (decisions.some((d) => d.allowed)) return ALLOW;
  return decisions.find((d) => !d.allowed && d.reason === "EMAIL_NOT_VERIFIED") ?? DENY;
}

function effectiveRoles(actor: Actor): EffectiveGlobalRole[] {
  return [MEMBER, ...actor.globalRoles];
}

export function evaluateGlobal(
  actor: Actor,
  permission: GlobalPermission,
  resource: PolicyResource = {},
): Decision {
  const spec: PermissionSpec<EffectiveGlobalRole> = GLOBAL_PERMISSIONS[permission];
  if (spec.never === true) return DENY;
  if (spec.write && actor.status !== "ACTIVE") return DENY;

  if (resource.targetUserId === actor.userId && permission.startsWith("role:grant:")) return DENY;
  if (spec.hierarchical === true && resource.targetUserId !== undefined) {
    const targetRank = globalRank(resource.targetGlobalRoles ?? []);
    if (globalRank(actor.globalRoles) <= targetRank) return DENY;
  }

  const decisions = effectiveRoles(actor).flatMap((role) => {
    const rule = spec.rules[role];
    return rule === undefined ? [] : [checkRule(rule, actor, resource)];
  });
  return decisions.length === 0 ? DENY : bestDecision(decisions);
}

export function evaluateCommunity(
  actor: Actor,
  membership: CommunityMembership | null,
  permission: CommunityPermission,
  resource: PolicyResource = {},
): Decision {
  const spec: PermissionSpec<CommunityMembership["role"]> = COMMUNITY_PERMISSIONS[permission];
  if (spec.never === true) return DENY;
  if (membership?.status !== "ACTIVE") return DENY;
  if (spec.write && (actor.status !== "ACTIVE" || membership.communitySuspended)) return DENY;
  const rule = spec.rules[membership.role];
  return rule === undefined ? DENY : checkRule(rule, actor, resource);
}

function raise(decision: Decision): void {
  if (decision.allowed) return;
  throw new AppError(decision.reason);
}

/**
 * Vérification d'autorisation côté serveur, à appeler dans chaque service / action.
 * Règle préalable : une ressource invisible pour l'acteur doit déjà avoir produit NOT_FOUND.
 */
export function authorize(actor: Actor, permission: GlobalPermission, resource?: PolicyResource): void {
  raise(evaluateGlobal(actor, permission, resource));
}

export function authorizeCommunity(
  actor: Actor,
  membership: CommunityMembership | null,
  permission: CommunityPermission,
  resource?: PolicyResource,
): void {
  raise(evaluateCommunity(actor, membership, permission, resource));
}

/** Variante booléenne pour l'affichage (confort uniquement, jamais une protection). */
export function can(actor: Actor, permission: GlobalPermission, resource?: PolicyResource): boolean {
  return evaluateGlobal(actor, permission, resource).allowed;
}
