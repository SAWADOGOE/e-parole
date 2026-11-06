import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { Page } from "@playwright/test";
import { createMember, MEMBER_PASSWORD, queryTest, type TestMember } from "./support/accounts";
import { completeTwoFactorSignIn, enableTwoFactor, expectAccessible, signIn } from "./support/helpers";
import { expect, test } from "./support/test";

/** Données de test uniquement (« [E2E] »). Chaque test crée ses propres comptes. */

async function login(page: Page, member: TestMember): Promise<void> {
  await signIn(page, member.email, MEMBER_PASSWORD);
  await expect(page).toHaveURL(/\/$/);
}

async function noHorizontalScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function testImage(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "eparole-e2e-"));
  const file = join(dir, "lever-de-soleil.jpg");
  writeFileSync(file, await sharp({ create: { width: 1400, height: 900, channels: 3, background: { r: 44, g: 130, b: 115 } } }).jpeg().withExif({ IFD0: { Make: "E2E" } }).toBuffer());
  return file;
}

async function publishText(page: Page, body: string): Promise<void> {
  await page.goto("/publier");
  await page.getByLabel("Ton message").fill(body);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("réseau social", () => {
  test("US-10 : témoignage avec image et verset, au clavier, sans violation axe", async ({ page }) => {
    test.setTimeout(120_000);
    const ruth = await createMember("Ruth");
    const paul = await createMember("Paul");
    await login(page, ruth);
    await expectAccessible(page);

    await page.getByRole("link", { name: /Partager une parole/ }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle publication" });
    await expect(dialog).toBeVisible();
    await dialog.getByText("Témoignage", { exact: true }).click();
    const body = dialog.getByLabel("Ton message");
    await body.fill(`[E2E] Dieu a ouvert une porte. Merci @${paul.handle.slice(0, 5)}`);
    await expect(dialog.getByRole("option", { name: new RegExp(paul.handle) })).toBeVisible();
    await body.press("Enter");
    await expect(body).toHaveValue(new RegExp(`@${paul.handle} `));
    await dialog.getByLabel("Référence biblique").fill("Jean 3:16");
    await dialog.getByRole("button", { name: "Afficher le verset" }).click();
    await expect(dialog.getByText(/Car Dieu a tant aimé le monde/)).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles(await testImage());
    await expect(dialog.getByLabel("Description de l'image 1 (pour les personnes malvoyantes)")).toBeVisible();
    await dialog.getByLabel("Description de l'image 1 (pour les personnes malvoyantes)").fill("[E2E] Couleur verte");
    await expect(dialog.locator("img")).toBeVisible({ timeout: 40_000 });
    await expectAccessible(page);
    await dialog.getByRole("button", { name: "Publier", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    const article = page.getByRole("article").filter({ hasText: "Dieu a ouvert une porte" }).first();
    await expect(article).toBeVisible();
    await expect(article.getByText("Témoignage", { exact: true })).toBeVisible();
    await expect(article.getByText(/Car Dieu a tant aimé le monde/)).toBeVisible();
    await expect(article.getByText(/Louis Segond 1910/)).toBeVisible();
    await expect(article.getByRole("img", { name: "[E2E] Couleur verte" })).toBeVisible();
    await expect(article.getByRole("link", { name: `@${paul.handle}` })).toBeVisible();
    const exif = await queryTest<{ variants: { format: string; bytes: number }[] }>(`SELECT variants FROM media_asset WHERE "ownerId" = $1`, [ruth.id]);
    expect(exif[0]?.variants.length).toBeGreaterThan(0);
  });

  test("US-5 : publier un verset depuis le lecteur biblique", async ({ page }) => {
    const ruth = await createMember("Ruth");
    await login(page, ruth);
    await page.goto("/bible/lsg/jean/3", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "verset 16", exact: true }).click();
    await page.getByRole("group", { name: /Actions/ }).getByRole("button", { name: "Publier" }).click();
    await expect(page).toHaveURL(/\/publier\?verset=JHN\.3\.16$/);
    await expect(page.getByText(/Car Dieu a tant aimé le monde/)).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Publier", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("article").first().getByText(/Car Dieu a tant aimé le monde/)).toBeVisible();
  });

  test("US-11, US-12 : commentaire, réponse, trois réactions modifiables, notifications regroupées", async ({ page, browser }) => {
    const ruth = await createMember("Ruth");
    const paul = await createMember("Paul");
    await login(page, ruth);
    await publishText(page, "[E2E] Une question sur la grâce");
    const postHref = await page.getByRole("article").first().locator('a[href^="/publications/"]').first().getAttribute("href");
    expect(postHref).toBeTruthy();

    const paulContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.201" } });
    const paulPage = await paulContext.newPage();
    await login(paulPage, paul);
    await paulPage.goto(postHref ?? "/");
    await paulPage.getByLabel("Ton commentaire").fill("[E2E] La grâce nous est donnée");
    await paulPage.getByRole("button", { name: "Commenter" }).click();
    await expect(paulPage.getByText("[E2E] La grâce nous est donnée")).toBeVisible();
    const reactions = paulPage.getByRole("group", { name: "Réagir à cette publication" });
    await reactions.getByRole("button", { name: /Amen/ }).click();
    await expect(reactions.getByRole("button", { name: /Amen/ })).toHaveAttribute("aria-pressed", "true");
    await reactions.getByRole("button", { name: /Encouragé/ }).click();
    await expect(reactions.getByRole("button", { name: /Encouragé/ })).toHaveAttribute("aria-pressed", "true");
    await expect(reactions.getByRole("button", { name: /Amen/ })).toHaveAttribute("aria-pressed", "false");
    await expect(reactions.getByRole("button", { name: /Encouragé/ })).toContainText("1");
    await expectAccessible(paulPage);

    await page.goto(postHref ?? "/");
    await page.getByRole("button", { name: "Répondre" }).click();
    await page.getByLabel(/Ta réponse à Paul/).fill("[E2E] Amen, merci frère");
    await page.getByRole("button", { name: "Répondre", exact: true }).last().click();
    await expect(page.getByRole("list", { name: /Réponses au commentaire de Paul/ })).toContainText("[E2E] Amen, merci frère");

    await expect(page.getByRole("link", { name: /Notifications, \d+ non lue/ })).toBeVisible({ timeout: 70_000 });
    await page.goto("/notifications");
    await expect(page.getByText(/Paul a réagi à ton contenu/)).toBeVisible();
    await expect(page.getByText(/Paul a commenté ta publication/)).toBeVisible();
    await expectAccessible(page);
    await paulContext.close();
  });

  test("US-13 : suivre un auteur ; son fil Abonnements le montre", async ({ page }) => {
    const ruth = await createMember("Ruth");
    const esther = await createMember("Esther");
    await login(page, ruth);
    await publishText(page, "[E2E] Publication de Ruth pour ses abonnés");
    await page.context().clearCookies();
    await login(page, esther);
    await expect(page.getByText("[E2E] Publication de Ruth pour ses abonnés")).toHaveCount(0);
    await page.goto(`/@${ruth.handle}`);
    await expectAccessible(page);
    await page.getByRole("button", { name: "Suivre" }).click();
    await expect(page.getByRole("button", { name: /Ne plus suivre/ })).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("[E2E] Publication de Ruth pour ses abonnés")).toBeVisible();
  });

  test("US-14 : bloquer — le bloqué ne voit plus rien et n'est pas notifié", async ({ page, browser }) => {
    const ruth = await createMember("Ruth");
    const paul = await createMember("Paul");
    await login(page, ruth);
    await publishText(page, "[E2E] Contenu invisible pour Paul");
    const postHref = await page.getByRole("article").first().locator('a[href^="/publications/"]').first().getAttribute("href");
    await page.goto(`/@${paul.handle}`);
    await page.getByRole("button", { name: /Plus d'options pour le profil/ }).click();
    await page.getByRole("menuitem", { name: /Bloquer/ }).click();
    await expectAccessible(page);
    await page.getByRole("alertdialog").getByRole("button", { name: "Bloquer" }).click();
    await expect(page).toHaveURL(/\/$/);

    const paulContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.202" } });
    const paulPage = await paulContext.newPage();
    await login(paulPage, paul);
    expect((await paulPage.goto(`/@${ruth.handle}`))?.status()).toBe(404);
    expect((await paulPage.goto(postHref ?? "/"))?.status()).toBe(404);
    await paulPage.goto("/?fil=decouvrir");
    await expect(paulPage.getByText("[E2E] Contenu invisible pour Paul")).toHaveCount(0);
    await paulPage.goto(`/membres?q=${ruth.handle}`);
    await expect(paulPage.getByText(ruth.handle)).toHaveCount(0);
    await paulPage.goto("/notifications");
    await expect(paulPage.getByRole("heading", { name: "Rien de nouveau" })).toBeVisible();
    const notified = await queryTest(`SELECT 1 FROM notification WHERE "recipientId" = $1`, [paul.id]);
    expect(notified).toEqual([]);
    await paulContext.close();

    await page.goto("/parametres/confidentialite");
    await expect(page.getByText(paul.handle)).toBeVisible();
    await expectAccessible(page);
  });

  test("US-41 : signalement puis décision d'une modératrice avec MFA", async ({ page, browser }) => {
    // Trois comptes, activation de la double authentification puis reconnexion : parcours long.
    test.setTimeout(180_000);
    const ruth = await createMember("Ruth");
    const esther = await createMember("Esther");
    const moderator = await createMember("Moderatrice", { role: "MODERATOR" });
    await login(page, ruth);
    await publishText(page, "[E2E] Envoie 5000 F pour recevoir ta bénédiction");

    const estherContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.203" } });
    const estherPage = await estherContext.newPage();
    await login(estherPage, esther);
    await estherPage.goto("/?fil=decouvrir");
    const article = estherPage.getByRole("article").filter({ hasText: "Envoie 5000 F" });
    await article.getByRole("button", { name: "Plus d'options pour cette publication" }).click();
    await estherPage.getByRole("menuitem", { name: "Signaler" }).click();
    const dialog = estherPage.getByRole("alertdialog", { name: "Signaler cette publication" });
    await dialog.getByLabel("Escroquerie ou demande d'argent").check();
    await expectAccessible(estherPage);
    await dialog.getByRole("button", { name: "Envoyer le signalement" }).click();
    await expect(dialog).toBeHidden();
    await estherContext.close();

    const modContext = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": "198.51.100.204" } });
    const mod = await modContext.newPage();
    await signIn(mod, moderator.email, MEMBER_PASSWORD);
    await mod.waitForURL((url) => !url.pathname.startsWith("/connexion"));
    const secret = await enableTwoFactor(mod, MEMBER_PASSWORD);
    await mod.context().clearCookies();
    await signIn(mod, moderator.email, MEMBER_PASSWORD);
    await completeTwoFactorSignIn(mod, secret);
    await mod.goto("/admin/moderation");
    await expectAccessible(mod);
    await mod.getByRole("link", { name: "Escroquerie ou demande d'argent" }).first().click();
    await expect(mod.getByText("Envoie 5000 F pour recevoir ta bénédiction").first()).toBeVisible();
    await expectAccessible(mod);
    await mod.getByLabel("Masquer").check();
    await mod.getByLabel("Motif communiqué à l'auteur").fill("Les demandes d'argent en échange de prière sont interdites.");
    await mod.getByRole("button", { name: "Appliquer la décision" }).click();
    await expect(mod.getByText("Ce dossier est traité.")).toBeVisible();
    const audit = await queryTest<{ metadata: Record<string, unknown> }>(`SELECT metadata FROM audit_log WHERE action = 'moderation.decision' AND "actorId" = $1`, [moderator.id]);
    expect(audit[0]?.metadata["decision"]).toBe("HIDE");
    expect(JSON.stringify(audit)).not.toContain("5000");
    await modContext.close();

    await page.goto("/notifications");
    await expect(page.getByText("L'un de tes contenus a été masqué par l'équipe de modération.")).toBeVisible();
    await expect(page.getByText(/Motif : Les demandes d'argent/)).toBeVisible();
  });

  test("un membre reçoit 404 sur /admin/moderation", async ({ page }) => {
    const member = await createMember("Membre");
    await login(page, member);
    expect((await page.goto("/admin/moderation"))?.status()).toBe(404);
  });

  test("320 px, thème sombre : accueil, publication et profil sans débordement ni violation axe @mobile", async ({ browser }) => {
    const ruth = await createMember("Ruth");
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, colorScheme: "dark", extraHTTPHeaders: { "x-real-ip": "198.51.100.205" } });
    const page = await context.newPage();
    await login(page, ruth);
    await publishText(page, "[E2E] Un verset pour la route : Psaume 23:1 https://exemple.org/une-adresse-tres-longue-qui-ne-doit-pas-deborder");
    await noHorizontalScroll(page);
    await expectAccessible(page);
    const href = await page.getByRole("article").first().locator('a[href^="/publications/"]').first().getAttribute("href");
    await page.goto(href ?? "/");
    await noHorizontalScroll(page);
    await expectAccessible(page);
    await page.goto(`/@${ruth.handle}`);
    await noHorizontalScroll(page);
    await expectAccessible(page);
    await page.goto("/profil");
    await noHorizontalScroll(page);
    await expectAccessible(page);
    await context.close();
  });
});
