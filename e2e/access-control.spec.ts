import { expect, randomClientIp, test } from "./support/test";
import { E2E_ADMIN } from "./support/env";
import {
  completeTwoFactorSignIn,
  enableTwoFactor,
  expectAccessible,
  signIn,
  signUp,
  totp,
  uniqueEmail,
} from "./support/helpers";

const PASSWORD = "un-mot-de-passe-solide";

test.describe("contrôle d'accès", () => {
  test("un visiteur et un MEMBER reçoivent 404 sur /admin et /manage", async ({ page }) => {
    for (const path of ["/admin", "/admin/users", "/admin/audit-logs", "/manage/communaute-inexistante"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
    await signUp(page, { name: "Daniel", email: uniqueEmail("daniel"), password: PASSWORD, birthYear: "1978" });
    await expect(page).toHaveURL(/\/verification/);
    for (const path of ["/admin", "/admin/users", "/manage/communaute-inexistante"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    }
  });

  test("SUPER_ADMIN : bloqué sans MFA, accès avec MFA, attribution de rôle auditée ; un ADMIN ne voit pas SUPER_ADMIN", async ({
    page,
    browser,
  }) => {
    // 1. Sans double authentification, /admin redirige vers la sécurité du compte.
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/parametres\/securite\?mfa=requis/);
    await expect(page.getByText(/La double authentification est obligatoire/)).toBeVisible();

    // 2. Activation de la 2FA puis reconnexion avec code.
    const secret = await enableTwoFactor(page, E2E_ADMIN.password);
    await page.context().clearCookies();
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await completeTwoFactorSignIn(page, secret);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expectAccessible(page);

    // 3. Un membre s'inscrit ; le SUPER_ADMIN lui attribue ADMIN (ré-authentification exigée).
    const memberContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": randomClientIp() } });
    const member = await memberContext.newPage();
    const memberEmail = uniqueEmail("samuel");
    await signUp(member, { name: "Samuel Admin", email: memberEmail, password: PASSWORD, birthYear: "1990" });
    await expect(member).toHaveURL(/\/verification/);

    await page.goto("/admin/users?q=Samuel%20Admin");
    await page.getByRole("link", { name: "Samuel Admin" }).first().click();
    await page.getByTestId("role-ADMIN-grant").click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    const reauth = page.getByRole("alertdialog", { name: "Confirme ton identité" });
    await expect(reauth).toBeVisible();
    await reauth.getByLabel("Mot de passe").fill(E2E_ADMIN.password);
    await reauth.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Rôle mis à jour.")).toBeVisible();
    await expect(page.getByTestId("role-ADMIN-revoke")).toBeVisible();

    await page.goto("/admin/audit-logs?action=role.grant");
    await expect(page.getByRole("cell", { name: "role.grant" })).toBeVisible();

    // 4. Le nouvel ADMIN a été déconnecté (changement de rôle) ; il se reconnecte et doit activer la MFA.
    await member.goto("/");
    await expect(member.getByRole("link", { name: "Se connecter" })).toBeVisible();
    await signIn(member, memberEmail, PASSWORD);
    await expect(member).toHaveURL(/\/$/);
    const memberSecret = await enableTwoFactor(member, PASSWORD);
    await memberContext.clearCookies();
    await signIn(member, memberEmail, PASSWORD);
    await member.getByLabel("Code de vérification").fill(totp(memberSecret, Date.now() + 30_000));
    await member.getByRole("button", { name: "Vérifier" }).click();
    await expect(member).toHaveURL(/\/$/);

    // 5. L'ADMIN accède à /admin mais ne peut ni attribuer SUPER_ADMIN ni ADMIN (réservés au SUPER_ADMIN).
    await member.goto("/admin/users?q=Admin%20E2E");
    await member.getByRole("link", { name: "Admin E2E" }).first().click();
    await expect(member.getByTestId("role-SUPER_ADMIN-revoke")).toHaveCount(0);
    await member.goBack();
    await member.goto("/admin/users");
    await expect(member.getByRole("heading", { name: "Utilisateurs" })).toBeVisible();
    await memberContext.close();
  });
});
