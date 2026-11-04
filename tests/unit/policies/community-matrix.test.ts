import { describe, expect, it } from "vitest";
import {
  COMMUNITY_PERMISSIONS,
  evaluateCommunity,
  type CommunityMembership,
  type CommunityPermission,
  type CommunityRoleName,
  type PolicyResource,
} from "@/server/policies";
import { makeActor } from "../../factories/actor";

/*
 * Transcription indépendante de la matrice de communauté (docs/admin/ADMIN-ROLES-PERMISSIONS.md).
 * Colonnes : MEMBER, MODERATOR, ADMIN, OWNER.
 */
type Cell = "Y" | "C" | "N";
interface Case {
  row: readonly [Cell, Cell, Cell, Cell];
  pass?: PolicyResource;
  fail?: PolicyResource;
  actor?: { emailVerified: boolean };
}

const VERIFIED_CASE = { pass: {}, fail: {} };

const MATRIX: Record<CommunityPermission, Case> = {
  "community:read": { row: ["Y", "Y", "Y", "Y"] },
  "community:post:create": { row: ["C", "C", "C", "C"], ...VERIFIED_CASE },
  "community:post:hide": { row: ["N", "Y", "Y", "Y"] },
  "community:comment:hide": { row: ["N", "Y", "Y", "Y"] },
  "community:member:approve": { row: ["N", "Y", "Y", "Y"] },
  "community:member:remove": {
    row: ["N", "C", "C", "C"],
    pass: { targetUserId: "target", targetCommunityRole: "MEMBER" },
    fail: { targetUserId: "actor_1", targetCommunityRole: "MEMBER" },
  },
  "community:member:ban": {
    row: ["N", "C", "C", "C"],
    pass: { targetUserId: "target", targetCommunityRole: "MEMBER" },
    fail: { targetUserId: "actor_1", targetCommunityRole: "MEMBER" },
  },
  "community:role:grant:moderator": { row: ["N", "N", "Y", "Y"] },
  "community:role:grant:admin": { row: ["N", "N", "N", "Y"] },
  "community:settings:update": { row: ["N", "N", "Y", "Y"] },
  "community:invite:create": {
    row: ["C", "Y", "Y", "Y"],
    pass: { communityAllowsMemberInvites: true },
    fail: { communityAllowsMemberInvites: false },
  },
  "community:stats:read": { row: ["N", "Y", "Y", "Y"] },
  "community:manage:access": { row: ["N", "Y", "Y", "Y"] },
  "community:editorial:create": { row: ["N", "N", "Y", "Y"] },
  "community:editorial:update:own": { row: ["N", "N", "Y", "Y"] },
  "community:editorial:publish": { row: ["N", "N", "Y", "Y"] },
  "community:editorial:schedule": { row: ["N", "N", "Y", "Y"] },
  "community:editorial:archive": { row: ["N", "N", "Y", "Y"] },
  "community:transfer_ownership": { row: ["N", "N", "N", "Y"] },
  "community:delete": { row: ["N", "N", "N", "Y"] },
  "community:prayer:read_anonymous_author": { row: ["N", "N", "N", "N"] },
};

const COLUMNS: readonly CommunityRoleName[] = ["MEMBER", "MODERATOR", "ADMIN", "OWNER"];

function membership(role: CommunityRoleName, overrides: Partial<CommunityMembership> = {}): CommunityMembership {
  return { communityId: "c1", role, status: "ACTIVE", communitySuspended: false, ...overrides };
}

describe("matrice des permissions de communauté", () => {
  it("couvre exactement les permissions définies dans le code", () => {
    expect(Object.keys(MATRIX).sort()).toEqual(Object.keys(COMMUNITY_PERMISSIONS).sort());
  });

  for (const [permission, spec] of Object.entries(MATRIX) as [CommunityPermission, Case][]) {
    spec.row.forEach((cell, index) => {
      const role = COLUMNS[index]!;
      it(`${permission} : ${role} → ${cell}`, () => {
        const actor = makeActor();
        if (cell === "Y") expect(evaluateCommunity(actor, membership(role), permission, spec.pass).allowed).toBe(true);
        if (cell === "N") expect(evaluateCommunity(actor, membership(role), permission, spec.pass).allowed).toBe(false);
        if (cell === "C") {
          expect(evaluateCommunity(actor, membership(role), permission, spec.pass).allowed).toBe(true);
          const failActor = permission === "community:post:create" ? makeActor({ emailVerified: false }) : actor;
          expect(evaluateCommunity(failActor, membership(role), permission, spec.fail).allowed).toBe(false);
        }
      });
    });
  }
});

describe("isolation et statut", () => {
  it("refuse tout à un non-membre, y compris la lecture", () => {
    expect(evaluateCommunity(makeActor(), null, "community:read").allowed).toBe(false);
  });

  it("refuse tout à un membre en attente d'approbation", () => {
    expect(evaluateCommunity(makeActor(), membership("MEMBER", { status: "PENDING" }), "community:read").allowed).toBe(false);
  });

  it("n'accorde rien à un SUPER_ADMIN global qui n'est pas membre", () => {
    const actor = makeActor({ roles: ["SUPER_ADMIN"] });
    expect(evaluateCommunity(actor, null, "community:manage:access").allowed).toBe(false);
  });

  it("met une communauté suspendue en lecture seule", () => {
    const m = membership("OWNER", { communitySuspended: true });
    expect(evaluateCommunity(makeActor(), m, "community:read").allowed).toBe(true);
    expect(evaluateCommunity(makeActor(), m, "community:settings:update").allowed).toBe(false);
  });

  it("un ADMIN local ne peut pas retirer un autre ADMIN", () => {
    const resource: PolicyResource = { targetUserId: "target", targetCommunityRole: "ADMIN" };
    expect(evaluateCommunity(makeActor(), membership("ADMIN"), "community:member:remove", resource).allowed).toBe(false);
  });

  it("un MODERATOR local ne peut pas retirer un autre MODERATOR", () => {
    const resource: PolicyResource = { targetUserId: "target", targetCommunityRole: "MODERATOR" };
    expect(evaluateCommunity(makeActor(), membership("MODERATOR"), "community:member:remove", resource).allowed).toBe(false);
  });
});
