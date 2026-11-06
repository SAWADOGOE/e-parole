/**
 * Captures d'écran locales (données « [Démo] » uniquement) : mobile 360 px et desktop 1280 px, clair et sombre.
 * Usage : node scripts/dev/capture-screens.mjs <baseUrl> <dossier> <email> <motDePasse>
 * Signale tout statut HTTP ≥ 400 et toute erreur de console.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base, out, email, password] = process.argv.slice(2);
if (!base || !out || !email || !password) throw new Error("usage : capture-screens.mjs <baseUrl> <dossier> <email> <motDePasse>");
mkdirSync(out, { recursive: true });

const PAGES = [
  ["accueil", "/"],
  ["decouvrir", "/?fil=decouvrir"],
  ["publication", null],
  ["profil-public", "/@demo_ruth"],
  ["mon-profil", "/profil"],
  ["publier", "/publier?verset=JHN.3.16"],
  ["notifications", "/notifications"],
  ["favoris", "/favoris"],
  ["membres", "/membres?q=demo"],
  ["confidentialite", "/parametres/confidentialite"],
];

const browser = await chromium.launch();
const problems = [];
for (const [label, viewport] of [["mobile", { width: 360, height: 780 }], ["desktop", { width: 1280, height: 860 }]]) {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport, colorScheme: scheme, locale: "fr-FR", extraHTTPHeaders: { "x-real-ip": `198.51.100.${Math.floor(Math.random() * 250) + 1}` } });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`${label}/${scheme} console: ${message.text()}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().includes("/api/notifications/stream")) problems.push(`${label}/${scheme} ${response.status()} ${response.url()}`);
    });
    await page.goto(`${base}/connexion`, { waitUntil: "networkidle" });
    await page.getByLabel("Adresse email").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(`${base}/`);
    const firstPost = await page.locator('a[href^="/publications/"]').first().getAttribute("href");
    for (const [name, path] of PAGES) {
      const target = path ?? firstPost;
      if (!target) continue;
      await page.goto(`${base}${target}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/${name}-${label}-${scheme}.png`, fullPage: label === "mobile" ? false : true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (overflow) problems.push(`${label}/${scheme} débordement horizontal sur ${target}`);
    }
    await context.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "aucun problème détecté");
