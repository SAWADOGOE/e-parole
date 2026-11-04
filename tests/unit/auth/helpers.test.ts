import { describe, expect, it } from "vitest";
import { maskEmail } from "@/features/administration/lib/mask-email";
import { describeDevice } from "@/features/auth/lib/device";
import { authErrorKey } from "@/features/auth/lib/error-codes";
import { safeReturnTo } from "@/features/auth/lib/return-to";
import { signUpSchema } from "@/features/auth/schemas";
import { accountLimitFor } from "@/server/auth/account-limits";
import { handleBaseFromName } from "@/server/auth/handle";
import { renderEmail } from "@/server/email/templates";

describe("safeReturnTo (redirection ouverte)", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/x?u=https://a.b"])(
    "rejette %s",
    (value) => {
      expect(safeReturnTo(value)).toBe("/");
    },
  );
  it("accepte un chemin interne", () => {
    expect(safeReturnTo("/parametres/securite")).toBe("/parametres/securite");
  });
});

describe("handleBaseFromName", () => {
  it("retire accents et caractères spéciaux", () => {
    expect(handleBaseFromName("Aïcha Ouédraogo")).toBe("aicha_ouedraogo");
  });
  it("complète un nom trop court", () => {
    expect(handleBaseFromName("Jo")).toBe("membrejo");
  });
});

describe("maskEmail", () => {
  it("masque la partie locale", () => {
    expect(maskEmail("ruth.kabore@gmail.com")).toBe("r***@gmail.com");
  });
});

describe("accountLimitFor", () => {
  it("hache l'email normalisé (jamais en clair)", () => {
    const limit = accountLimitFor("/sign-in/email", { email: " Ruth@Exemple.test " });
    expect(limit?.name).toBe("auth.signin.account");
    expect(limit?.subject).not.toContain("ruth");
    expect(limit?.subject).toBe(accountLimitFor("/sign-in/email", { email: "ruth@exemple.test" })?.subject);
  });
  it("ignore les autres routes", () => {
    expect(accountLimitFor("/get-session", { email: "a@b.c" })).toBeNull();
  });
});

describe("renderEmail", () => {
  it("échappe l'URL dans le HTML", () => {
    const { html } = renderEmail("verify-email", { url: 'https://x.test/?a="><script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });
});

describe("authErrorKey", () => {
  it("ne distingue pas un compte inexistant d'un mauvais mot de passe", () => {
    expect(authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("invalidCredentials");
  });
  it("signale la limitation de débit", () => {
    expect(authErrorKey({ status: 429 })).toBe("rateLimited");
  });
});

describe("signUpSchema", () => {
  const base = { name: "Samuel", email: "samuel@exemple.test", password: "motdepasse-long", consent: "on" };
  it("refuse un utilisateur de moins de 13 ans", () => {
    const year = String(new Date().getUTCFullYear() - 10);
    const result = signUpSchema.safeParse({ ...base, birthYear: year });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("tooYoung");
  });
  it("exige le consentement", () => {
    expect(signUpSchema.safeParse({ ...base, birthYear: "1995", consent: undefined }).success).toBe(false);
  });
  it("accepte une inscription valide", () => {
    expect(signUpSchema.safeParse({ ...base, birthYear: "1995" }).success).toBe(true);
  });
});

describe("describeDevice", () => {
  it("reconnaît Chrome sur Android", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
    expect(describeDevice(ua)).toEqual({ mobile: true, label: "Chrome · Android" });
  });
});
