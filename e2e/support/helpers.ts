import { createHmac, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { MAILPIT_URL } from "./env";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@exemple.test`;
}

interface MailpitMessage {
  ID: string;
  To: { Address: string }[];
  Subject: string;
}

/** Attend un email pour ce destinataire dans Mailpit et renvoie le premier lien http du texte. */
export async function waitForEmailLink(to: string, subjectIncludes: string): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = (await res.json()) as { messages: MailpitMessage[] };
    const message = body.messages.find((m) => m.Subject.includes(subjectIncludes));
    if (message) {
      const detail = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as { Text: string };
      const link = /https?:\/\/\S+/.exec(detail.Text)?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Aucun email « ${subjectIncludes} » reçu pour ${to}`);
}

/** TOTP RFC 6238 (SHA-1, 30 s, 6 chiffres) à partir d'un secret base32. */
export function totp(secretBase32: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secretBase32.replace(/=+$/, "").toUpperCase()) {
    const value = alphabet.indexOf(char);
    if (value >= 0) bits += value.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const hmac = createHmac("sha1", bytes).update(counter).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/connexion", { waitUntil: "networkidle" });
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function signUp(page: Page, data: { name: string; email: string; password: string; birthYear: string }) {
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Nom affiché").fill(data.name);
  await page.getByLabel("Adresse email").fill(data.email);
  await page.getByLabel("Mot de passe").fill(data.password);
  await page.getByLabel("Année de naissance").fill(data.birthYear);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

/** Active la 2FA depuis /parametres/securite et renvoie le secret TOTP. */
export async function enableTwoFactor(page: Page, password: string): Promise<string> {
  await page.goto("/parametres/securite", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Activer la double authentification" }).click();
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Activer la double authentification" }).click();
  const manual = await page.getByText(/^Saisie manuelle : /).textContent();
  const secret = manual?.replace("Saisie manuelle : ", "").trim() ?? "";
  expect(secret.length).toBeGreaterThan(10);
  await page.getByLabel("Code de vérification").fill(totp(secret));
  await page.getByRole("button", { name: "Confirmer le code" }).click();
  await expect(page.getByRole("heading", { name: "Codes de secours" })).toBeVisible();
  await page.getByRole("button", { name: "J'ai conservé mes codes" }).click();
  await expect(page.getByText("Activée", { exact: true })).toBeVisible();
  return secret;
}

export async function completeTwoFactorSignIn(page: Page, secret: string): Promise<void> {
  await expect(page).toHaveURL(/\/connexion\/deux-facteurs/);
  await page.getByLabel("Code de vérification").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Aucune violation d'accessibilité « serious » ou « critical » (WCAG 2.x A/AA). */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}
