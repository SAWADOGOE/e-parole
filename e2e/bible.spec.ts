import type { Page } from "@playwright/test";
import pg from "pg";
import { e2eEnv } from "./support/env";
import { completeTwoFactorSignIn, enableTwoFactor, expectAccessible, signIn, signUp, uniqueEmail, waitForEmailLink } from "./support/helpers";
import { expect, randomClientIp, test } from "./support/test";

const PASSWORD = "un-mot-de-passe-solide";
const JOHN_3 = "/bible/lsg/jean/3";
const ATTRIBUTION = "Louis Segond 1910 — domaine public";

/** L'îlot client a pris la main : le texte reste lisible avant, mais la sélection n'existe qu'après. */
async function readerReady(page: Page): Promise<void> {
  await expect(page.locator("#verses")).toHaveAttribute("role", "listbox");
}

async function createVerifiedMember(page: Page, name: string): Promise<string> {
  const email = uniqueEmail(name.toLowerCase());
  await signUp(page, { name, email, password: PASSWORD, birthYear: "1990" });
  await expect(page).toHaveURL(/\/verification/);
  await page.goto(await waitForEmailLink(email, "Confirmez votre adresse email"));
  await expect(page.getByRole("status")).toContainText("Ton adresse email est confirmée");
  return email;
}

/** Attribution directe en base de test : le parcours d'attribution de rôle est couvert par access-control.spec. */
async function grantRole(email: string, role: string): Promise<void> {
  const client = new pg.Client({ connectionString: e2eEnv()["MIGRATION_DATABASE_URL"] });
  await client.connect();
  try {
    await client.query(`INSERT INTO "user_role" ("userId", "role") SELECT id, $2::"GlobalRole" FROM "user" WHERE email = $1`, [email, role]);
  } finally {
    await client.end();
  }
}

async function openSelector(page: Page, reference: string): Promise<void> {
  await readerReady(page);
  await page.keyboard.press("g");
  await page.getByLabel("Référence ou mots à chercher").fill(reference);
  await page.keyboard.press("Enter");
}

test.describe("US-1 lire un chapitre", () => {
  test("Jean 3 : texte, numéros, attribution, métadonnées", async ({ page }) => {
    await page.goto(JOHN_3);
    await expect(page.getByRole("heading", { level: 1, name: "Jean 3" })).toBeVisible();
    await expect(page.locator("#v16 .verse-text")).toHaveText(/^Car Dieu a tant aimé le monde/);
    await expect(page.locator("#v16 sup")).toContainText("verset 16");
    await expect(page.getByText(ATTRIBUTION).first()).toBeVisible();
    await expect(page).toHaveTitle(/Jean 3 · Louis Segond 1910/);
    await expectAccessible(page);
  });

  test("se lit sans JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(JOHN_3);
    // toBeVisible et non toHaveText seul : un texte présent mais caché par Suspense passerait à tort.
    await expect(page.locator("#v16 .verse-text")).toBeVisible();
    await expect(page.locator("#v16 .verse-text")).toHaveText(/^Car Dieu a tant aimé le monde/);
    await expect(page.locator("#verses")).not.toHaveAttribute("role", "listbox");
    await expect(page.getByRole("link", { name: /Chapitre suivant/ })).toHaveAttribute("href", "/bible/lsg/jean/4");
    await context.close();
  });

  test("l'ancre #v16 cible le verset et un lien de plage le met en évidence", async ({ page }) => {
    await page.goto(`${JOHN_3}#v16`);
    await expect(page.locator("#v16")).toBeInViewport();
    await page.goto(`${JOHN_3}?v=16-17#v16`);
    await expect(page.locator("#v16")).toHaveAttribute("data-focus", "");
    await expect(page.locator("#v17")).toHaveAttribute("data-focus", "");
    await expect(page.locator("#v18")).not.toHaveAttribute("data-focus", "");
  });

  test("navigation entre livres : Jean 21 mène à Actes 1, Apocalypse 22 n'a pas de suivant", async ({ page }) => {
    await page.goto("/bible/lsg/jean/21");
    await page.getByRole("link", { name: "Chapitre suivant : Actes 1" }).click();
    await expect(page).toHaveURL(/\/bible\/lsg\/actes\/1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Actes 1" })).toBeVisible();
    await page.goto("/bible/lsg/apocalypse/22");
    await expect(page.getByRole("link", { name: /Chapitre suivant/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Chapitre précédent/ })).toBeVisible();
  });

  test("les flèches du clavier changent de chapitre", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/4$/);
    await readerReady(page);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/3$/);
  });

  test("les variantes d'URL redirigent et un passage inexistant répond 404 avec suggestion", async ({ page, request }) => {
    for (const variant of ["/bible/lsg/JHN/3", "/bible/lsg/jn/3", "/bible/lsg/jean/03"]) {
      const response = await request.get(variant, { maxRedirects: 0 });
      expect(response.status(), variant).toBe(308);
      expect(response.headers()["location"], variant).toBe(JOHN_3);
    }
    const response = await page.goto("/bible/lsg/jean/30");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Jean compte 21 chapitres.")).toBeVisible();
    await page.getByRole("link", { name: "Aller à Jean 21" }).click();
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/21$/);
    expect((await page.goto("/bible/lsg/inconnu/1"))?.status()).toBe(404);
    await expect(page.getByText("Nous ne connaissons pas ce livre.")).toBeVisible();
    await expectAccessible(page);
  });

  test("/bible ouvre Jean 1 pour un nouveau lecteur", async ({ page }) => {
    await page.goto("/bible");
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/1$/);
  });
});

test.describe("US-2 aller à une référence", () => {
  for (const [input, url] of [
    ["jn 3 16", /\/bible\/lsg\/jean\/3\?v=16#v16$/],
    ["Jean 3:16", /\/bible\/lsg\/jean\/3\?v=16#v16$/],
    ["Jean 3.16", /\/bible\/lsg\/jean\/3\?v=16#v16$/],
    ["1 Co 13:4-7", /\/bible\/lsg\/1-corinthiens\/13\?v=4-7#v4$/],
    ["Psaume 23", /\/bible\/lsg\/psaumes\/23$/],
    ["ps23", /\/bible\/lsg\/psaumes\/23$/],
  ] as const) {
    test(`« ${input} » ouvre le passage`, async ({ page }) => {
      await page.goto(JOHN_3);
      await openSelector(page, input);
      await expect(page).toHaveURL(url);
    });
  }

  test("une référence invalide explique et propose, sans page d'erreur", async ({ page }) => {
    await page.goto(JOHN_3);
    await openSelector(page, "Jean 30");
    await expect(page).toHaveURL(/\/bible\/recherche/);
    await expect(page.getByText("Jean compte 21 chapitres.")).toBeVisible();
    await page.getByRole("link", { name: "Aller à Jean 21 ?" }).click();
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/21$/);
  });

  test("le sélecteur parcourt livres et chapitres, et se ferme à Échap", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.getByRole("button", { name: /Changer de livre ou de chapitre/ }).click();
    const dialog = page.getByRole("dialog", { name: "Aller à un passage" });
    await expect(dialog.getByRole("heading", { name: "Ancien Testament" })).toBeVisible();
    await expectAccessible(page);
    await dialog.getByRole("button", { name: "Romains" }).click();
    await dialog.getByRole("link", { name: "Romains 8" }).click();
    await expect(page).toHaveURL(/\/bible\/lsg\/romains\/8$/);
    await readerReady(page);
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("US-3 rechercher", () => {
  test("« grace » trouve « grâce », avec surlignage et filtres", async ({ page }) => {
    await page.goto("/bible/recherche?q=grace");
    await expect(page.getByRole("heading", { level: 1, name: "Rechercher dans la Bible" })).toBeVisible();
    await expect(page.locator("mark").first()).toHaveText(/gr[aâ]ces?/i);
    await expect(page.locator("#contenu").getByText(ATTRIBUTION)).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("link", { name: "Nouveau Testament" }).click();
    await expect(page).toHaveURL(/testament=NT/);
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("une expression exacte entre guillemets", async ({ page }) => {
    await page.goto(`/bible/recherche?q=${encodeURIComponent('"bon berger"')}`);
    await expect(page.getByRole("link", { name: "Jean 10:11" })).toBeVisible();
  });

  test("un nom de livre seul garde sa recherche, avec un lien vers le livre", async ({ page }) => {
    await page.goto("/bible/recherche?q=Nombres");
    await expect(page).toHaveURL(/\/bible\/recherche/);
    await expect(page.getByRole("link", { name: "Ouvrir le livre : Nombres" })).toBeVisible();
    await page.goto("/bible/recherche?q=Jean");
    await expect(page.getByRole("link", { name: "Ouvrir le livre : Jean" })).toHaveAttribute("href", "/bible/lsg/jean/1");
  });

  test("la saisie d'une référence ouvre le passage ; aucun résultat donne un état vide", async ({ page }) => {
    await page.goto("/bible/recherche?q=jn+3+16");
    await expect(page).toHaveURL(/\/bible\/lsg\/jean\/3\?v=16#v16$/);
    await page.goto("/bible/recherche?q=xyzzyqwerty");
    await expect(page.getByRole("heading", { name: "Aucun verset trouvé" })).toBeVisible();
  });

  test("le contenu de la requête n'est jamais interprété", async ({ page }) => {
    await page.goto(`/bible/recherche?q=${encodeURIComponent("<img src=x onerror=alert(1)>")}`);
    await expect(page.locator("img[src='x']")).toHaveCount(0);
  });
});

test.describe("sélection au clavier", () => {
  test("flèches, Espace et Échap, avec annonce", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v1").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#v2")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.locator("#v2")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("1 verset sélectionné")).toBeAttached();
    await page.keyboard.press("Shift+ArrowDown");
    await expect(page.locator("#v3")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("group", { name: "Actions sur la sélection" })).toContainText("Jean 3:2-3");
    await expectAccessible(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("#v2")).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("group", { name: "Actions sur la sélection" })).toHaveCount(0);
  });

  test("le focus ne se perd jamais : barre, panneaux, changement de chapitre", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v1").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByRole("group", { name: "Actions sur la sélection" })).toBeVisible();

    // Tab depuis le texte atteint la barre, placée juste après lui.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Effacer la sélection" })).toBeFocused();

    // Fermer la barre rend le focus au verset, et l'effacement est annoncé.
    await page.keyboard.press("Enter");
    await expect(page.locator("#v2")).toBeFocused();
    await expect(page.getByText("Sélection effacée")).toBeAttached();

    // Échap dans un panneau rend le focus à son déclencheur et ne touche pas à la sélection.
    await page.keyboard.press("Space");
    const settings = page.getByRole("button", { name: "Réglages de lecture" });
    await settings.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(settings).toBeFocused();
    await expect(page.locator("#v2")).toHaveAttribute("aria-selected", "true");

    // Après un changement de chapitre, le focus rejoint le titre.
    await page.getByRole("link", { name: "Chapitre suivant : Jean 4" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Jean 4" })).toBeFocused();
  });

  test("un élément focalisé ne passe pas sous la barre d'actions", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v36").click();
    await page.getByRole("button", { name: "Surligner" }).click();
    await page.getByRole("link", { name: /Chapitre suivant/ }).focus();
    const link = await page.getByRole("link", { name: /Chapitre suivant/ }).boundingBox();
    const bar = await page.getByRole("group", { name: "Actions sur la sélection" }).boundingBox();
    expect((link?.y ?? 0) + (link?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
  });

  test("Maj+clic étend la sélection et Maj+flèche la réduit", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v2").click();
    await page.locator("#v5").click({ modifiers: ["Shift"] });
    await expect(page.locator("#v4")).toHaveAttribute("aria-selected", "true");
    await page.locator("#v5").focus();
    await page.keyboard.press("Shift+ArrowUp");
    await expect(page.locator("#v5")).toHaveAttribute("aria-selected", "false");
    await expect(page.locator("#v4")).toHaveAttribute("aria-selected", "true");
  });

  test("les raccourcis à une touche se désactivent (WCAG 2.1.4)", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.getByRole("button", { name: "Réglages de lecture" }).click();
    await page.getByRole("dialog").getByText("Désactivés", { exact: true }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("g");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("f");
    await expect(page.locator("html")).not.toHaveAttribute("data-reader-focus", "");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("le mode focus garde l'attribution, et Maj+G ne déclenche rien", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.keyboard.press("Shift+G");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("f");
    await expect(page.locator("#contenu").getByText(ATTRIBUTION)).toBeVisible();
  });

  test("copie au format attendu", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v16").click();
    await page.getByRole("button", { name: "Copier" }).click();
    await expect(page.getByText("Passage copié")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^« Car Dieu a tant aimé le monde.* » — Jean 3:16 \(Louis Segond 1910\)$/);
  });

  test("un visiteur est invité à se connecter pour surligner", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v16").click();
    await page.getByRole("button", { name: "Surligner" }).click();
    await page.getByRole("button", { name: "jaune" }).click();
    await expect(page).toHaveURL(/\/connexion\?retour=/);
  });
});

test.describe("réglages de lecture", () => {
  test("un visiteur retrouve ses réglages après rechargement", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.getByRole("button", { name: "Réglages de lecture" }).click();
    const dialog = page.getByRole("dialog", { name: "Réglages de lecture" });
    await expect(dialog.getByText("Ces réglages sont gardés sur cet appareil.")).toBeVisible();
    await dialog.getByText("Sépia", { exact: true }).click();
    await dialog.getByRole("button", { name: "Agrandir le texte" }).click();
    await dialog.getByText("Masqués", { exact: true }).click();
    await dialog.getByText("Sans", { exact: true }).click();
    await expectAccessible(page);
    await page.keyboard.press("Escape");

    await page.reload();
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-reader-theme", "sepia");
    await expect(html).toHaveAttribute("data-reader-numbers", "off");
    await expect(html).toHaveAttribute("data-reader-font", "sans");
    await expect(page.locator(".reader-text")).toHaveCSS("font-size", "20px");
    await expect(page.locator("#v16 sup")).toContainText("verset 16");
  });

  test("quitter le lecteur rend le thème global", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("eparole-reader-prefs", JSON.stringify({ fontSize: 19, lineHeight: 1.7, theme: "SEPIA", font: "SERIF", showVerseNumbers: true }));
    });
    await page.goto(JOHN_3);
    await readerReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-reader-theme", "sepia");
    await page.getByRole("link", { name: "Rechercher dans la Bible" }).click();
    await expect(page).toHaveURL(/\/bible\/recherche/);
    await expect(page.locator("html")).not.toHaveAttribute("data-reader-theme", "sepia");
  });

  test("le mode focus masque la navigation, et F le bascule", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.keyboard.press("f");
    await expect(page.locator("html")).toHaveAttribute("data-reader-focus", "");
    await page.keyboard.press("f");
    await expect(page.locator("html")).not.toHaveAttribute("data-reader-focus", "");
  });
});

test.describe("accessibilité et affichage", () => {
  const THEMES = ["LIGHT", "DARK", "SEPIA"] as const;

  for (const theme of THEMES) {
    test(`le lecteur et une sélection sont accessibles en thème ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("eparole-reader-prefs", JSON.stringify({ fontSize: 19, lineHeight: 1.7, theme: value, font: "SERIF", showVerseNumbers: true }));
      }, theme);
      await page.goto(JOHN_3);
      await readerReady(page);
      await expectAccessible(page);
      await page.locator("#v16").click();
      await expect(page.getByRole("group", { name: "Actions sur la sélection" })).toBeVisible();
      await page.getByRole("button", { name: "Surligner" }).click();
      await expect(page.getByRole("button", { name: "violet" })).toBeVisible();
      await expectAccessible(page);
    });
  }

  test("@mobile aucune page Bible ne déborde à 320 px, même au plus grand corps de texte", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.addInitScript(() => {
      localStorage.setItem("eparole-reader-prefs", JSON.stringify({ fontSize: 28, lineHeight: 1.9, theme: "SYSTEM", font: "SERIF", showVerseNumbers: true }));
    });
    for (const path of [JOHN_3, "/bible/lsg/psaumes/23", "/bible/recherche?q=grace", "/bible/lsg/jean/30"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto(JOHN_3);
    await readerReady(page);
    await page.locator("#v16").click();
    await page.getByRole("button", { name: "Surligner" }).click();
    await expect(page.getByRole("button", { name: "violet" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("@mobile l'en-tête se masque en descendant et revient en remontant", async ({ page }) => {
    await page.goto(JOHN_3);
    await readerReady(page);
    const header = page.locator("[data-reader-header]");
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveAttribute("data-hidden", "true");
    await page.mouse.wheel(0, -300);
    await expect(header).toHaveAttribute("data-hidden", "false");
  });
});

test.describe("US-4 surligner et annoter", () => {
  test("surlignage, note et favori survivent au rechargement, et restent privés", async ({ page, browser }) => {
    await createVerifiedMember(page, "Ruth");
    await page.goto(JOHN_3);
    await readerReady(page);

    await page.locator("#v16").click();
    await page.getByRole("button", { name: "Surligner" }).click();
    await page.getByRole("button", { name: "jaune" }).click();
    await expect(page.locator("#v16")).toHaveAttribute("data-highlight", "YELLOW");
    await expect(page.locator("#v16").getByText("surligné en jaune")).toBeAttached();

    await page.locator("#v17").click();
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await expect(page.getByText("Cette note est strictement privée")).toBeVisible();
    await page.getByLabel("Ta note").fill("Dieu n'envoie pas son Fils pour juger.");
    await expectAccessible(page);
    await page.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByRole("heading", { name: "Mes notes sur ce chapitre" })).toBeVisible();

    await page.locator("#v18").click();
    await page.getByRole("button", { name: "Favori" }).click();
    await expect(page.locator("#v18").getByText("verset en favori")).toBeAttached();

    await page.reload();
    await expect(page.locator("#v16")).toHaveAttribute("data-highlight", "YELLOW");
    await expect(page.getByText("Dieu n'envoie pas son Fils pour juger.")).toBeVisible();
    await expect(page.locator("#v17").getByText("note personnelle sur ce verset")).toBeAttached();

    await page.goto("/bible/mes-notes?onglet=notes");
    await expect(page.getByText("Dieu n'envoie pas son Fils pour juger.")).toBeVisible();
    await expectAccessible(page);
    await page.goto("/bible/mes-notes");
    await expect(page.getByRole("link", { name: "Jean 3:16" })).toBeVisible();
    await expect(page.getByText(ATTRIBUTION).first()).toBeVisible();

    const visitor = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": randomClientIp() } });
    const other = await visitor.newPage();
    await other.goto(JOHN_3);
    await expect(other.locator("#v16")).not.toHaveAttribute("data-highlight", "YELLOW");
    await expect(other.getByText("Dieu n'envoie pas son Fils pour juger.")).toHaveCount(0);
    await other.goto("/bible/mes-notes");
    await expect(other).toHaveURL(/\/connexion/);
    await visitor.close();
  });

  test("réglages et reprise de lecture suivent le compte, sans le navigateur", async ({ page }) => {
    await createVerifiedMember(page, "Lydie");
    await page.goto("/bible/lsg/romains/8");
    await readerReady(page);
    await page.getByRole("button", { name: "Réglages de lecture" }).click();
    await page.getByRole("dialog").getByText("Sépia", { exact: true }).click();
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.clear());

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Reprendre : Romains 8" })).toBeVisible();
    await page.goto("/bible");
    await expect(page).toHaveURL(/\/bible\/lsg\/romains\/8$/);
    await expect(page.locator("html")).toHaveAttribute("data-reader-theme", "sepia");
  });
});

test.describe("US-42 verset du jour", () => {
  test("un éditeur avec MFA programme le verset, visible sur l'accueil avec son attribution", async ({ page, browser }) => {
    const email = await createVerifiedMember(page, "Editeur");
    await grantRole(email, "CONTENT_EDITOR");
    const secret = await enableTwoFactor(page, PASSWORD);
    await page.context().clearCookies();
    await signIn(page, email, PASSWORD);
    await completeTwoFactorSignIn(page, secret);

    await page.goto("/admin/bible/daily-verses");
    await expect(page.getByRole("heading", { level: 1, name: "Verset du jour" })).toBeVisible();
    await expectAccessible(page);

    await page.getByLabel("Référence", { exact: true }).fill("Jean 3");
    await page.getByRole("button", { name: "Aperçu" }).click();
    await expect(page.getByText("Cette référence n'est pas valide")).toBeVisible();
    await expect(page.getByLabel("Référence", { exact: true })).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Référence", { exact: true }).fill("Psaume 23:1");
    await page.getByLabel("Phrase éditoriale (facultative)").fill("Une promesse pour aujourd'hui.");
    await page.getByRole("button", { name: "Aperçu" }).click();
    await expect(page.getByText("Aperçu exact")).toBeVisible();
    await expect(page.getByRole("blockquote")).toContainText("Éternel est mon berger");
    await expect(page.getByText(ATTRIBUTION)).toBeVisible();
    await page.getByRole("button", { name: "Programmer" }).click();
    await expect(page.getByText(/Verset du jour programmé/)).toBeVisible();
    await expect(page.getByLabel("Référence", { exact: true })).toBeFocused();

    await page.goto("/admin/bible/translations");
    await expect(page.getByRole("heading", { name: /Louis Segond 1910/ })).toBeVisible();
    await expect(page.getByText(ATTRIBUTION)).toBeVisible();
    await expect(page.getByRole("button", { name: "Dépublier" })).toHaveCount(0);
    await expectAccessible(page);

    const visitor = await browser.newContext({ extraHTTPHeaders: { "x-real-ip": randomClientIp() } });
    const home = await visitor.newPage();
    await home.goto("/");
    const card = home.getByRole("region", { name: "Verset du jour" }).first();
    await expect(card).toContainText("Éternel est mon berger");
    await expect(card).toContainText("Psaumes 23:1");
    await expect(card).toContainText(ATTRIBUTION);
    await expect(card).toContainText("Une promesse pour aujourd'hui.");
    await visitor.close();
  });

  test("un visiteur ne voit pas l'administration Bible", async ({ page }) => {
    for (const path of ["/admin/bible/daily-verses", "/admin/bible/translations"]) {
      expect((await page.goto(path))?.status(), path).toBe(404);
    }
  });
});
