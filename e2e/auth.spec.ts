import { expect, test } from "./support/test";
import { expectAccessible, signIn, signUp, uniqueEmail, waitForEmailLink } from "./support/helpers";

const PASSWORD = "un-mot-de-passe-solide";

test.describe("authentification", () => {
  test("inscription → email de vérification → vérification → connexion", async ({ page }) => {
    const email = uniqueEmail("aicha");
    await signUp(page, { name: "Aïcha", email, password: PASSWORD, birthYear: "2004" });
    await expect(page).toHaveURL(/\/verification\?statut=envoye/);
    await expect(page.getByRole("status")).toContainText("Un email de confirmation");

    const link = await waitForEmailLink(email, "Confirmez votre adresse email");
    await page.goto(link);
    await expect(page.getByRole("status")).toContainText("Ton adresse email est confirmée");

    await page.goto("/");
    await expect(page.getByText(/Que la paix soit avec toi, Aïcha/)).toBeVisible();
    await expect(page.getByText("Vérifie ton adresse email")).toHaveCount(0);

    await page.getByRole("button", { name: "Menu du compte" }).click();
    await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/connexion/);

    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Que la paix soit avec toi/)).toBeVisible();
  });

  test("refuse un mot de passe incorrect sans révéler si le compte existe", async ({ page }) => {
    await signIn(page, uniqueEmail("inconnu"), "mauvais-mot-de-passe");
    await expect(page.locator("#contenu").getByRole("alert")).toHaveText("Email ou mot de passe incorrect.");
  });

  test("refuse l'inscription d'un enfant de moins de 13 ans", async ({ page }) => {
    const year = String(new Date().getUTCFullYear() - 10);
    await signUp(page, { name: "Marc", email: uniqueEmail("marc"), password: PASSWORD, birthYear: year });
    await expect(page.getByText("Il faut avoir au moins 13 ans pour créer un compte.")).toBeVisible();
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("réinitialisation du mot de passe par email", async ({ page }) => {
    const email = uniqueEmail("ruth");
    await signUp(page, { name: "Ruth", email, password: PASSWORD, birthYear: "1990" });
    await expect(page).toHaveURL(/\/verification/);
    await page.context().clearCookies();

    await page.goto("/mot-de-passe-oublie", { waitUntil: "networkidle" });
    await page.getByLabel("Adresse email").fill(email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByRole("status")).toContainText("Si un compte existe");

    const link = await waitForEmailLink(email, "Réinitialisation");
    await page.goto(link, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/reinitialiser\?token=/);
    await page.getByLabel("Nouveau mot de passe").fill("nouveau-mot-de-passe-solide");
    await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
    await expect(page.getByRole("status")).toContainText("Mot de passe modifié");

    await signIn(page, email, PASSWORD);
    await expect(page.locator("#contenu").getByRole("alert")).toHaveText("Email ou mot de passe incorrect.");
    await signIn(page, email, "nouveau-mot-de-passe-solide");
    await expect(page).toHaveURL(/\/$/);
  });

  test("une inscription avec une adresse existante ne révèle rien et prévient le titulaire", async ({ page }) => {
    const email = uniqueEmail("existant");
    await signUp(page, { name: "Premier", email, password: PASSWORD, birthYear: "1990" });
    await expect(page).toHaveURL(/\/verification\?statut=envoye/);
    await signUp(page, { name: "Second", email, password: "un-autre-mot-de-passe", birthYear: "1991" });
    await expect(page).toHaveURL(/\/verification\?statut=envoye/);
    expect(await waitForEmailLink(email, "Tentative d'inscription")).toContain("/connexion");
  });

  test("pages d'authentification accessibles", async ({ page }) => {
    for (const path of ["/connexion", "/inscription", "/mot-de-passe-oublie"]) {
      await page.goto(path);
      await expectAccessible(page);
    }
  });
});
