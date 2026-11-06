import type { CommunityRoleName, EffectiveGlobalRole } from "./roles";
import type { Condition, PermissionSpec } from "./types";

/*
 * Matrice des permissions — spécification : docs/admin/ADMIN-ROLES-PERMISSIONS.md.
 * Toute modification commence par le document, puis ce fichier, puis tests/unit/policies.
 */

const VERIFIED: readonly Condition[] = [{ kind: "verifiedEmail" }];
const OWN: readonly Condition[] = [{ kind: "own" }];
const ALL_ROLES_VERIFIED = {
  MEMBER: VERIFIED,
  CONTENT_EDITOR: VERIFIED,
  MODERATOR: VERIFIED,
  ADMIN: VERIFIED,
  SUPER_ADMIN: VERIFIED,
} as const;
const ALL_ROLES_OWN = { MEMBER: OWN, CONTENT_EDITOR: OWN, MODERATOR: OWN, ADMIN: OWN, SUPER_ADMIN: OWN } as const;
const OWN_VERIFIED: readonly Condition[] = [{ kind: "verifiedEmail" }, { kind: "own" }];
const ALL_ROLES_OWN_VERIFIED = {
  MEMBER: OWN_VERIFIED,
  CONTENT_EDITOR: OWN_VERIFIED,
  MODERATOR: OWN_VERIFIED,
  ADMIN: OWN_VERIFIED,
  SUPER_ADMIN: OWN_VERIFIED,
} as const;
const ALL_ROLES = { MEMBER: true, CONTENT_EDITOR: true, MODERATOR: true, ADMIN: true, SUPER_ADMIN: true } as const;
const STAFF_MODERATION = { MODERATOR: true, ADMIN: true, SUPER_ADMIN: true } as const;
const ADMINS = { ADMIN: true, SUPER_ADMIN: true } as const;
const SUPER_ONLY = { SUPER_ADMIN: true } as const;
const EDITORS = { CONTENT_EDITOR: true, ADMIN: true, SUPER_ADMIN: true } as const;
const SUSPEND_30: readonly Condition[] = [{ kind: "maxDurationDays", days: 30 }];

export const GLOBAL_PERMISSIONS = {
  "post:create": { write: true, rules: ALL_ROLES_VERIFIED },
  "comment:create": { write: true, rules: ALL_ROLES_VERIFIED },
  "prayer:create": { write: true, rules: ALL_ROLES_VERIFIED },
  "post:update": { write: true, rules: ALL_ROLES_OWN },
  "post:delete": { write: true, rules: ALL_ROLES_OWN },
  "content:hide": { write: true, rules: STAFF_MODERATION },
  "content:remove": { write: true, rules: STAFF_MODERATION },
  "report:create": { write: true, rules: ALL_ROLES_VERIFIED },
  "moderation:case:read": { write: false, rules: STAFF_MODERATION },
  "moderation:case:assign": {
    write: true,
    rules: { MODERATOR: [{ kind: "selfAssign" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "moderation:sanction:warn": { write: true, hierarchical: true, rules: STAFF_MODERATION },
  "moderation:sanction:suspend": {
    write: true,
    hierarchical: true,
    rules: { MODERATOR: SUSPEND_30, ADMIN: true, SUPER_ADMIN: true },
  },
  "moderation:sanction:ban": { write: true, hierarchical: true, rules: ADMINS },
  "moderation:appeal:decide": {
    write: true,
    rules: { MODERATOR: [{ kind: "notOwnDecision" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "user:read:admin": {
    write: false,
    rules: { MODERATOR: [{ kind: "linkedToCase" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "user:pii:reveal": { write: false, rules: ADMINS },
  "user:suspend": {
    write: true,
    hierarchical: true,
    rules: { MODERATOR: SUSPEND_30, ADMIN: true, SUPER_ADMIN: true },
  },
  "user:reactivate": {
    write: true,
    hierarchical: true,
    rules: { MODERATOR: SUSPEND_30, ADMIN: true, SUPER_ADMIN: true },
  },
  "user:export": { write: false, rules: SUPER_ONLY },
  "role:grant:moderator": { write: true, hierarchical: true, rules: ADMINS },
  "role:grant:editor": { write: true, hierarchical: true, rules: ADMINS },
  "role:grant:admin": { write: true, hierarchical: true, rules: SUPER_ONLY },
  "role:grant:super_admin": { write: true, hierarchical: true, rules: SUPER_ONLY },
  "badge:grant": { write: true, rules: ADMINS },
  "community:suspend": {
    write: true,
    rules: { MODERATOR: [{ kind: "linkedToCase" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "community:restore": { write: true, rules: ADMINS },
  "church:verify": { write: true, rules: ADMINS },
  "editorial:create": { write: true, rules: EDITORS },
  "editorial:update:own": {
    write: true,
    rules: { CONTENT_EDITOR: OWN, ADMIN: OWN, SUPER_ADMIN: OWN },
  },
  "editorial:review": {
    write: true,
    rules: { CONTENT_EDITOR: [{ kind: "notOwnContent" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "editorial:publish": {
    write: true,
    rules: { CONTENT_EDITOR: [{ kind: "canPublishFlag" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "editorial:schedule": {
    write: true,
    rules: { CONTENT_EDITOR: [{ kind: "canPublishFlag" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "daily_verse:manage": { write: true, rules: EDITORS },
  "reading_plan:manage": { write: true, rules: EDITORS },
  "bible:translation:read": { write: false, rules: EDITORS },
  "bible:translation:publish": { write: true, rules: SUPER_ONLY },
  "bible:import": { write: true, rules: SUPER_ONLY },
  "bible_annotation:create": { write: true, rules: ALL_ROLES_VERIFIED },
  "bible_annotation:update": { write: true, rules: ALL_ROLES_OWN_VERIFIED },
  "bible_annotation:delete": { write: true, rules: ALL_ROLES_OWN_VERIFIED },
  "bible_reading_state:update": { write: true, rules: ALL_ROLES_OWN_VERIFIED },
  "settings:read": { write: false, rules: ADMINS },
  "settings:update": { write: true, rules: ADMINS },
  "settings:update:critical": { write: true, rules: SUPER_ONLY },
  "feature_flag:update": {
    write: true,
    rules: { ADMIN: [{ kind: "nonCriticalFlag" }], SUPER_ADMIN: true },
  },
  "audit:read": {
    write: false,
    rules: { MODERATOR: [{ kind: "ownActionsOnly" }], ADMIN: true, SUPER_ADMIN: true },
  },
  "analytics:read": {
    write: false,
    rules: {
      CONTENT_EDITOR: [{ kind: "analyticsScope", scope: "editorial" }],
      MODERATOR: [{ kind: "analyticsScope", scope: "moderation" }],
      ADMIN: true,
      SUPER_ADMIN: true,
    },
  },
  "comment:update": { write: true, rules: ALL_ROLES_OWN },
  "comment:delete": { write: true, rules: ALL_ROLES_OWN },
  /** ownerId = auteur de la publication qui porte le commentaire. */
  "comment:hide_on_own_post": { write: true, rules: ALL_ROLES_OWN },
  "reaction:set": { write: true, rules: ALL_ROLES_VERIFIED },
  "relation:follow": { write: true, rules: ALL_ROLES_VERIFIED },
  /** Protection : accessibles sans email vérifié (docs/admin/ADMIN-ROLES-PERMISSIONS.md, Phase 3). */
  "relation:block": { write: true, rules: ALL_ROLES },
  "relation:mute": { write: true, rules: ALL_ROLES },
  "bookmark:manage": { write: true, rules: ALL_ROLES_VERIFIED },
  "profile:update": { write: true, rules: ALL_ROLES_OWN_VERIFIED },
  "media:upload": { write: true, rules: ALL_ROLES_VERIFIED },
  "notification:preferences:update": { write: true, rules: ALL_ROLES_OWN },
  "moderation:case:resolve": { write: true, rules: STAFF_MODERATION },
  "admin:access": { write: false, rules: { CONTENT_EDITOR: true, ...STAFF_MODERATION } },
  "private_message:read": { write: false, never: true, rules: {} },
  "private_prayer:read": { write: false, never: true, rules: {} },
  "bible_note:read": { write: false, never: true, rules: {} },
} as const satisfies Record<string, PermissionSpec<EffectiveGlobalRole>>;

export type GlobalPermission = keyof typeof GLOBAL_PERMISSIONS;

const MOD_AND_UP = { MODERATOR: true, ADMIN: true, OWNER: true } as const;
const ADMIN_AND_UP = { ADMIN: true, OWNER: true } as const;
const VERIFIED_ALL = { MEMBER: VERIFIED, MODERATOR: VERIFIED, ADMIN: VERIFIED, OWNER: VERIFIED } as const;

export const COMMUNITY_PERMISSIONS = {
  "community:read": { write: false, rules: { MEMBER: true, ...MOD_AND_UP } },
  "community:post:create": { write: true, rules: VERIFIED_ALL },
  "community:post:hide": { write: true, rules: MOD_AND_UP },
  "community:comment:hide": { write: true, rules: MOD_AND_UP },
  "community:member:approve": { write: true, rules: MOD_AND_UP },
  "community:member:remove": {
    write: true,
    rules: {
      MODERATOR: [{ kind: "targetRankBelow", rank: 1 }, { kind: "notSelf" }],
      ADMIN: [{ kind: "targetRankBelow", rank: 2 }, { kind: "notSelf" }],
      OWNER: [{ kind: "notSelf" }],
    },
  },
  "community:member:ban": {
    write: true,
    rules: {
      MODERATOR: [{ kind: "targetRankBelow", rank: 1 }, { kind: "notSelf" }],
      ADMIN: [{ kind: "targetRankBelow", rank: 2 }, { kind: "notSelf" }],
      OWNER: [{ kind: "notSelf" }],
    },
  },
  "community:role:grant:moderator": { write: true, rules: ADMIN_AND_UP },
  "community:role:grant:admin": { write: true, rules: { OWNER: true } },
  "community:settings:update": { write: true, rules: ADMIN_AND_UP },
  "community:invite:create": {
    write: true,
    rules: { MEMBER: [{ kind: "memberInvitesAllowed" }], ...MOD_AND_UP },
  },
  "community:stats:read": { write: false, rules: MOD_AND_UP },
  "community:manage:access": { write: false, rules: MOD_AND_UP },
  "community:editorial:create": { write: true, rules: ADMIN_AND_UP },
  "community:editorial:update:own": { write: true, rules: ADMIN_AND_UP },
  "community:editorial:publish": { write: true, rules: ADMIN_AND_UP },
  "community:editorial:schedule": { write: true, rules: ADMIN_AND_UP },
  "community:editorial:archive": { write: true, rules: ADMIN_AND_UP },
  "community:transfer_ownership": { write: true, rules: { OWNER: true } },
  "community:delete": { write: true, rules: { OWNER: true } },
  "community:prayer:read_anonymous_author": { write: false, never: true, rules: {} },
} as const satisfies Record<string, PermissionSpec<CommunityRoleName>>;

export type CommunityPermission = keyof typeof COMMUNITY_PERMISSIONS;

/** Permissions exigeant une ré-authentification récente (< 10 min). */
export const REAUTH_PERMISSIONS: ReadonlySet<GlobalPermission> = new Set<GlobalPermission>([
  "user:suspend",
  "moderation:sanction:suspend",
  "moderation:sanction:ban",
  "user:pii:reveal",
  "user:export",
  "role:grant:moderator",
  "role:grant:editor",
  "role:grant:admin",
  "role:grant:super_admin",
  "bible:translation:publish",
  "bible:import",
  "settings:update:critical",
]);
