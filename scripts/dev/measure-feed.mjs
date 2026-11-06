/**
 * Mesures locales du fil (docs/29) : JS initial de / connecté (budget 170 Ko gzip), lecteur (175 Ko), temps de réponse
 * du fil p95, poids des images servies. Données « [Démo] » uniquement.
 *   node scripts/dev/measure-feed.mjs <baseUrl> <email> <motDePasse>
 */
import { gzipSync } from "node:zlib";

const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) throw new Error("usage : measure-feed.mjs <baseUrl> <email> <motDePasse>");
/** IP de documentation (RFC 5737) aléatoire : chaque mesure a son propre compteur de connexion. */
const IP = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} Ko`;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil((values.length * p) / 100) - 1];

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base, "x-real-ip": IP },
  body: JSON.stringify({ email, password }),
});
if (!signIn.ok) throw new Error(`connexion : ${signIn.status}`);
const cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
const headers = { cookie, "x-real-ip": IP };

async function jsOf(path) {
  const response = await fetch(`${base}${path}`, { headers });
  const html = await response.text();
  if (!response.ok) throw new Error(`${path} : ${response.status}`);
  const scripts = [...new Set([...html.matchAll(/<script(?![^>]*noModule)[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  let total = 0;
  for (const src of scripts) {
    const res = await fetch(new URL(src, base));
    if (!res.ok) throw new Error(`${src} : ${res.status}`);
    total += gzipSync(Buffer.from(await res.arrayBuffer())).length;
  }
  return { total, count: scripts.length, html };
}

const home = await jsOf("/");
console.log(`/ (connecté) : JS initial gzip ${kb(home.total)} en ${home.count} fichiers (budget 170 Ko)`);
const reader = await jsOf("/bible/lsg/jean/3");
console.log(`/bible/lsg/jean/3 (connecté) : JS initial gzip ${kb(reader.total)} (budget 175 Ko)`);

const images = [...new Set([...home.html.matchAll(/\/api\/media\/[a-z0-9]+\/\d+\.(?:avif|webp)/g)].map((m) => m[0]))];
for (const src of images) {
  const res = await fetch(`${base}${src}`, { headers: { ...headers, "sec-fetch-site": "same-origin" } });
  console.log(`  image ${src.split("/").slice(-1)[0]} : ${res.status} ${kb((await res.arrayBuffer()).byteLength)}`);
}

for (const feed of ["/", "/?fil=decouvrir"]) {
  const timings = [];
  for (let i = 0; i < 60; i += 1) {
    const start = performance.now();
    const res = await fetch(`${base}${feed}`, { headers });
    await res.text();
    if (i >= 10) timings.push(performance.now() - start);
  }
  console.log(`${feed} : réponse complète p50 ${percentile(timings, 50).toFixed(1)} ms · p95 ${percentile(timings, 95).toFixed(1)} ms (50 mesures)`);
}
