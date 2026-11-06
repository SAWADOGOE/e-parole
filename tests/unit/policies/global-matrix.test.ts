import { describe, expect, it } from "vitest";
import {
  evaluateGlobal,
  GLOBAL_PERMISSIONS,
  type Actor,
  type EffectiveGlobalRole,
  type GlobalPermission,
  type GlobalRoleName,
  type PolicyResource,
} from "@/server/policies";
import { makeActor } from "../../factories/actor";

/*
 * Transcription indépendante de docs/admin/ADMIN-ROLES-PERMISSIONS.md (matrice globale).
 * Y = autorisé, C = autorisé sous condition (cas « pass » autorisé, cas « fail » refusé), N = refusé.
 * Colonnes : MEMBER, CONTENT_EDITOR, MODERATOR, ADMIN, SUPER_ADMIN.
 */
type Cell = "Y" | "C" | "N";
type Row = readonly [Cell, Cell, Cell, Cell, Cell];

interface Case {
  row: Row;
  pass?: { resource?: PolicyResource; actor?: Partial<Actor> };
  fail?: { resource?: PolicyResource; actor?: Partial<Actor> };
  passFor?: Partial<Record<EffectiveGlobalRole, { resource?: PolicyResource }>>;
}

const VERIFIED: Pick<Case, "pass" | "fail"> = {
  pass: { actor: { emailVerified: true } },
  fail: { actor: { emailVerified: false } },
};
const OWN: Pick<Case, "pass" | "fail"> = {
  pass: { resource: { ownerId: "actor_1" } },
  fail: { resource: { ownerId: "someone_else" } },
};
const SUSPEND: Pick<Case, "pass" | "fail"> = {
  pass: { resource: { durationDays: 30, targetUserId: "target", targetGlobalRoles: [] } },
  fail: { resource: { durationDays: 31, targetUserId: "target", targetGlobalRoles: [] } },
};
const LINKED: Pick<Case, "pass" | "fail"> = {
  pass: { resource: { linkedToCase: true } },
  fail: { resource: { linkedToCase: false } },
};
const TARGET_MEMBER: PolicyResource = { targetUserId: "target", targetGlobalRoles: [] };

const MATRIX: Record<GlobalPermission, Case> = {
  "post:create": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "comment:create": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "prayer:create": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "post:update": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "post:delete": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "content:hide": { row: ["N", "N", "Y", "Y", "Y"] },
  "content:remove": { row: ["N", "N", "Y", "Y", "Y"] },
  "report:create": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "moderation:case:read": { row: ["N", "N", "Y", "Y", "Y"] },
  "moderation:case:assign": {
    row: ["N", "N", "C", "Y", "Y"],
    pass: { resource: { assigneeId: "actor_1" } },
    fail: { resource: { assigneeId: "other_moderator" } },
  },
  "moderation:sanction:warn": { row: ["N", "N", "Y", "Y", "Y"], pass: { resource: TARGET_MEMBER } },
  "moderation:sanction:suspend": { row: ["N", "N", "C", "Y", "Y"], ...SUSPEND },
  "moderation:sanction:ban": { row: ["N", "N", "N", "Y", "Y"], pass: { resource: TARGET_MEMBER } },
  "moderation:appeal:decide": {
    row: ["N", "N", "C", "Y", "Y"],
    pass: { resource: { decidedById: "other_moderator" } },
    fail: { resource: { decidedById: "actor_1" } },
  },
  "user:read:admin": { row: ["N", "N", "C", "Y", "Y"], ...LINKED },
  "user:pii:reveal": { row: ["N", "N", "N", "Y", "Y"] },
  "user:suspend": { row: ["N", "N", "C", "Y", "Y"], ...SUSPEND },
  "user:reactivate": { row: ["N", "N", "C", "Y", "Y"], ...SUSPEND },
  "user:export": { row: ["N", "N", "N", "N", "Y"] },
  "role:grant:moderator": { row: ["N", "N", "N", "Y", "Y"], pass: { resource: TARGET_MEMBER } },
  "role:grant:editor": { row: ["N", "N", "N", "Y", "Y"], pass: { resource: TARGET_MEMBER } },
  "role:grant:admin": { row: ["N", "N", "N", "N", "Y"], pass: { resource: TARGET_MEMBER } },
  "role:grant:super_admin": { row: ["N", "N", "N", "N", "Y"], pass: { resource: TARGET_MEMBER } },
  "badge:grant": { row: ["N", "N", "N", "Y", "Y"] },
  "community:suspend": { row: ["N", "N", "C", "Y", "Y"], ...LINKED },
  "community:restore": { row: ["N", "N", "N", "Y", "Y"] },
  "church:verify": { row: ["N", "N", "N", "Y", "Y"] },
  "editorial:create": { row: ["N", "Y", "N", "Y", "Y"] },
  "editorial:update:own": { row: ["N", "C", "N", "C", "C"], ...OWN },
  "editorial:review": {
    row: ["N", "C", "N", "Y", "Y"],
    pass: { resource: { authorId: "another_editor" } },
    fail: { resource: { authorId: "actor_1" } },
  },
  "editorial:publish": {
    row: ["N", "C", "N", "Y", "Y"],
    pass: { actor: { canPublishEditorial: true } },
    fail: { actor: { canPublishEditorial: false } },
  },
  "editorial:schedule": {
    row: ["N", "C", "N", "Y", "Y"],
    pass: { actor: { canPublishEditorial: true } },
    fail: { actor: { canPublishEditorial: false } },
  },
  "daily_verse:manage": { row: ["N", "Y", "N", "Y", "Y"] },
  "reading_plan:manage": { row: ["N", "Y", "N", "Y", "Y"] },
  "bible:translation:read": { row: ["N", "Y", "N", "Y", "Y"] },
  "bible:translation:publish": { row: ["N", "N", "N", "N", "Y"] },
  "bible:import": { row: ["N", "N", "N", "N", "Y"] },
  "bible_annotation:create": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "bible_annotation:update": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "bible_annotation:delete": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "bible_reading_state:update": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "settings:read": { row: ["N", "N", "N", "Y", "Y"] },
  "settings:update": { row: ["N", "N", "N", "Y", "Y"] },
  "settings:update:critical": { row: ["N", "N", "N", "N", "Y"] },
  "feature_flag:update": {
    row: ["N", "N", "N", "C", "Y"],
    pass: { resource: { flagIsCritical: false } },
    fail: { resource: { flagIsCritical: true } },
  },
  "audit:read": {
    row: ["N", "N", "C", "Y", "Y"],
    pass: { resource: { auditActorId: "actor_1" } },
    fail: { resource: { auditActorId: "someone_else" } },
  },
  "analytics:read": {
    row: ["N", "C", "C", "Y", "Y"],
    pass: { resource: { analyticsScope: "editorial" } },
    passFor: { MODERATOR: { resource: { analyticsScope: "moderation" } } },
    fail: { resource: { analyticsScope: "global" } },
  },
  "comment:update": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "comment:delete": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "comment:hide_on_own_post": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "reaction:set": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "relation:follow": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "relation:block": { row: ["Y", "Y", "Y", "Y", "Y"], pass: { actor: { emailVerified: false } } },
  "relation:mute": { row: ["Y", "Y", "Y", "Y", "Y"], pass: { actor: { emailVerified: false } } },
  "bookmark:manage": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "profile:update": {
    row: ["C", "C", "C", "C", "C"],
    pass: { resource: { ownerId: "actor_1" }, actor: { emailVerified: true } },
    fail: { resource: { ownerId: "actor_1" }, actor: { emailVerified: false } },
  },
  "media:upload": { row: ["C", "C", "C", "C", "C"], ...VERIFIED },
  "notification:preferences:update": { row: ["C", "C", "C", "C", "C"], ...OWN },
  "moderation:case:resolve": { row: ["N", "N", "Y", "Y", "Y"] },
  "admin:access": { row: ["N", "Y", "Y", "Y", "Y"] },
  "private_message:read": { row: ["N", "N", "N", "N", "N"] },
  "private_prayer:read": { row: ["N", "N", "N", "N", "N"] },
  "bible_note:read": { row: ["N", "N", "N", "N", "N"] },
};

const COLUMNS: readonly EffectiveGlobalRole[] = ["MEMBER", "CONTENT_EDITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

function actorFor(role: EffectiveGlobalRole, overrides: Partial<Actor> = {}): Actor {
  const roles: GlobalRoleName[] = role === "MEMBER" ? [] : [role];
  return makeActor({ roles, ...overrides });
}

describe("matrice des permissions globales", () => {
  it("couvre exactement les permissions définies dans le code", () => {
    expect(Object.keys(MATRIX).sort()).toEqual(Object.keys(GLOBAL_PERMISSIONS).sort());
  });

  for (const [permission, spec] of Object.entries(MATRIX) as [GlobalPermission, Case][]) {
    spec.row.forEach((cell, index) => {
      const role = COLUMNS[index]!;
      if (cell === "Y") {
        it(`${permission} : ${role} est autorisé`, () => {
          const actor = actorFor(role, spec.pass?.actor);
          expect(evaluateGlobal(actor, permission, spec.pass?.resource).allowed).toBe(true);
        });
      } else if (cell === "N") {
        it(`${permission} : ${role} est refusé`, () => {
          const actor = actorFor(role, spec.pass?.actor);
          expect(evaluateGlobal(actor, permission, spec.pass?.resource).allowed).toBe(false);
        });
      } else {
        it(`${permission} : ${role} est autorisé seulement si la condition est remplie`, () => {
          const passResource = spec.passFor?.[role]?.resource ?? spec.pass?.resource;
          expect(evaluateGlobal(actorFor(role, spec.pass?.actor), permission, passResource).allowed).toBe(true);
          expect(evaluateGlobal(actorFor(role, spec.fail?.actor), permission, spec.fail?.resource).allowed).toBe(false);
        });
      }
    });
  }
});

describe("règles transverses", () => {
  it("refuse toute écriture à un compte suspendu, même SUPER_ADMIN", () => {
    const actor = makeActor({ roles: ["SUPER_ADMIN"], status: "SUSPENDED" });
    expect(evaluateGlobal(actor, "settings:update").allowed).toBe(false);
    expect(evaluateGlobal(actor, "post:create").allowed).toBe(false);
  });

  it("signale EMAIL_NOT_VERIFIED plutôt que FORBIDDEN pour une création", () => {
    const decision = evaluateGlobal(makeActor({ emailVerified: false }), "post:create");
    expect(decision).toEqual({ allowed: false, reason: "EMAIL_NOT_VERIFIED" });
  });

  it("interdit d'agir sur un compte de rang égal (ADMIN ne suspend pas un ADMIN)", () => {
    const actor = makeActor({ roles: ["ADMIN"] });
    const resource: PolicyResource = { targetUserId: "target", targetGlobalRoles: ["ADMIN"], durationDays: 3 };
    expect(evaluateGlobal(actor, "user:suspend", resource).allowed).toBe(false);
  });

  it("interdit d'agir sur un compte de rang supérieur (MODERATOR ne suspend pas un ADMIN)", () => {
    const actor = makeActor({ roles: ["MODERATOR"] });
    const resource: PolicyResource = { targetUserId: "target", targetGlobalRoles: ["ADMIN"], durationDays: 3 };
    expect(evaluateGlobal(actor, "user:suspend", resource).allowed).toBe(false);
  });

  it("interdit à un ADMIN d'attribuer le rôle SUPER_ADMIN", () => {
    const actor = makeActor({ roles: ["ADMIN"] });
    expect(evaluateGlobal(actor, "role:grant:super_admin", TARGET_MEMBER).allowed).toBe(false);
  });

  it("interdit de s'attribuer un rôle à soi-même, même SUPER_ADMIN", () => {
    const actor = makeActor({ roles: ["SUPER_ADMIN"] });
    const resource: PolicyResource = { targetUserId: "actor_1", targetGlobalRoles: [] };
    expect(evaluateGlobal(actor, "role:grant:admin", resource).allowed).toBe(false);
  });

  it("cumule les rôles : MODERATOR + CONTENT_EDITOR obtient les droits des deux", () => {
    const actor = makeActor({ roles: ["MODERATOR", "CONTENT_EDITOR"] });
    expect(evaluateGlobal(actor, "content:hide").allowed).toBe(true);
    expect(evaluateGlobal(actor, "editorial:create").allowed).toBe(true);
  });

  it("n'accorde jamais la lecture des messages privés, prières privées et notes", () => {
    const actor = makeActor({ roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CONTENT_EDITOR"] });
    for (const permission of ["private_message:read", "private_prayer:read", "bible_note:read"] as const) {
      expect(evaluateGlobal(actor, permission).allowed).toBe(false);
    }
  });
});
