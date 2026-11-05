import type {
  AccountStatusName,
  CommunityRoleName,
  GlobalRoleName,
  MembershipStatusName,
} from "./roles";

export interface Actor {
  userId: string;
  globalRoles: readonly GlobalRoleName[];
  status: AccountStatusName;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  isMinor: boolean;
  /** Droit de publication éditoriale accordé à un CONTENT_EDITOR (stockage prévu en Phase 6). */
  canPublishEditorial: boolean;
}

/** Condition attachée à une cellule « ◐ » de la matrice. */
export type Condition =
  | { kind: "verifiedEmail" }
  | { kind: "own" }
  | { kind: "selfAssign" }
  | { kind: "maxDurationDays"; days: number }
  | { kind: "notOwnDecision" }
  | { kind: "notOwnContent" }
  | { kind: "canPublishFlag" }
  | { kind: "nonCriticalFlag" }
  | { kind: "ownActionsOnly" }
  | { kind: "analyticsScope"; scope: "editorial" | "moderation" }
  | { kind: "linkedToCase" }
  | { kind: "targetRankBelow"; rank: number }
  | { kind: "notSelf" }
  | { kind: "memberInvitesAllowed" };

/** true = autorisé sans condition ; une liste = toutes les conditions doivent être remplies. */
export type Rule = true | readonly Condition[];

export interface PermissionSpec<R extends string> {
  /** Écriture : refusée à tout compte non ACTIVE. */
  write: boolean;
  /** L'acteur doit avoir un rang global strictement supérieur à celui de la cible. */
  hierarchical?: boolean;
  /** Toute attribution est interdite, quels que soient les rôles. */
  never?: boolean;
  rules: Partial<Record<R, Rule>>;
}

/** Informations sur la ressource nécessaires à l'évaluation des conditions. */
export interface PolicyResource {
  ownerId?: string;
  assigneeId?: string | null;
  durationDays?: number;
  decidedById?: string;
  authorId?: string;
  flagIsCritical?: boolean;
  auditActorId?: string | null;
  analyticsScope?: "editorial" | "moderation" | "global";
  linkedToCase?: boolean;
  targetUserId?: string;
  targetGlobalRoles?: readonly GlobalRoleName[];
  targetCommunityRole?: CommunityRoleName;
  communityAllowsMemberInvites?: boolean;
}

export interface CommunityMembership {
  communityId: string;
  role: CommunityRoleName;
  status: MembershipStatusName;
  communitySuspended: boolean;
}
