import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { evaluateAdminGate } = await import("@/server/auth/session");
const { makeActor } = await import("../../factories/actor");

function session(
  overrides: Parameters<typeof makeActor>[0] = {},
  createdAt = new Date(),
  mfaVerifiedAt: Date | null = new Date(),
) {
  return {
    sessionId: "s1",
    createdAt,
    reauthenticatedAt: null,
    mfaVerifiedAt,
    actor: makeActor(overrides),
    displayName: "Test",
    handle: "test",
    email: "test@exemple.test",
  };
}

describe("garde d'accès à /admin", () => {
  it("renvoie not_found pour un visiteur", () => {
    expect(evaluateAdminGate(null)).toEqual({ kind: "not_found" });
  });

  it("renvoie not_found pour un MEMBER", () => {
    expect(evaluateAdminGate(session()).kind).toBe("not_found");
  });

  it("renvoie not_found pour un admin suspendu", () => {
    expect(evaluateAdminGate(session({ roles: ["ADMIN"], status: "SUSPENDED" })).kind).toBe("not_found");
  });

  it("exige la double authentification d'un SUPER_ADMIN", () => {
    expect(evaluateAdminGate(session({ roles: ["SUPER_ADMIN"], twoFactorEnabled: false })).kind).toBe("mfa_required");
  });

  it("expire une session d'administration de plus de 12 heures", () => {
    const old = new Date(Date.now() - 13 * 60 * 60 * 1000);
    expect(evaluateAdminGate(session({ roles: ["ADMIN"] }, old)).kind).toBe("session_expired");
  });

  it("refuse une session ouverte sans second facteur, même si le compte a la MFA", () => {
    expect(evaluateAdminGate(session({ roles: ["SUPER_ADMIN"] }, new Date(), null)).kind).toBe("mfa_reverify");
  });

  it("autorise un admin avec MFA et session récente", () => {
    expect(evaluateAdminGate(session({ roles: ["MODERATOR"] })).kind).toBe("ok");
  });
});
