import { expect, test } from "./support/test";
import { expectAccessible } from "./support/helpers";

test.describe("espace membre", () => {
  test("@mobile navigation inférieure et états vides réels", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "La Parole au cœur de la communauté" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navigation principale" }).last();
    for (const label of ["Accueil", "Bible", "Publier", "Prières", "Communautés"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await nav.getByRole("link", { name: "Prières" }).click();
    await expect(page).toHaveURL(/\/prieres$/);
    await expect(page.getByRole("heading", { name: "Portez les fardeaux les uns des autres" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Prières" })).toHaveAttribute("aria-current", "page");
  });

  test("@mobile aucune page ne déborde horizontalement à 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of ["/", "/bible", "/prieres", "/communautes", "/connexion", "/inscription"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("pages publiques accessibles en clair et en sombre", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ["/", "/bible", "/prieres", "/communautes", "/publier"]) {
        await page.goto(path);
        await expectAccessible(page);
      }
    }
  });

  test("le lien d'évitement mène au contenu principal au clavier", async ({ page }) => {
    await page.goto("/bible");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
  });

  test("en-têtes de sécurité présents", async ({ request }) => {
    const response = await request.get("/connexion");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-request-id"]).toBeTruthy();
  });
});
