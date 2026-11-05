/**
 * Mesures de performance locales du lecteur et de la recherche (docs/29-PERFORMANCE.md).
 *   node scripts/bible/measure.mjs http://localhost:53200
 * Compte le JavaScript réellement référencé par la page, compressé gzip, et le poids du document.
 */
import { brotliCompressSync, gzipSync } from "node:zlib";

const base = process.argv[2] ?? "http://localhost:53200";
const READER = "/bible/lsg/jean/3";
const SEARCHES = 200;
const WARMUP = 20;
const TTFB_RUNS = 50;

const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} Ko`;
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil((values.length * p) / 100) - 1];

async function assets(html, linkHeader) {
  // noModule : polyfills ignorés par tout navigateur moderne, donc hors de la charge initiale.
  const scripts = [...new Set([...html.matchAll(/<script(?![^>]*noModule)[^>]+src="([^"]+)"/g)].map((match) => match[1]))];
  const styles = [...new Set([...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((match) => match[1]))];
  const fonts = [...new Set([...linkHeader.matchAll(/<([^>]+\.woff2)>/g)].map((match) => match[1]))];
  const load = async (paths) =>
    Promise.all(
      paths.map(async (path) => {
        const response = await fetch(new URL(path, base));
        // Un fichier absent compté pour 0 Ko fausserait silencieusement le budget.
        if (!response.ok) throw new Error(`${path} : statut ${response.status}`);
        return { path, bytes: Buffer.from(await response.arrayBuffer()) };
      }),
    );
  return { scripts: await load(scripts), styles: await load(styles), fonts: await load(fonts) };
}

const response = await fetch(new URL(READER, base));
const html = await response.text();
const { scripts, styles, fonts } = await assets(html, response.headers.get("link") ?? "");
const jsGzip = scripts.reduce((sum, { bytes }) => sum + gzipSync(bytes).length, 0);
const jsBrotli = scripts.reduce((sum, { bytes }) => sum + brotliCompressSync(bytes).length, 0);
const cssGzip = styles.reduce((sum, { bytes }) => sum + gzipSync(bytes).length, 0);
const fontBytes = fonts.reduce((sum, { bytes }) => sum + bytes.length, 0);
const htmlGzip = gzipSync(Buffer.from(html)).length;

console.log(`Lecteur ${READER} (statut ${response.status})`);
console.log(`  JS initial gzip : ${kilobytes(jsGzip)} en ${scripts.length} fichiers (budget 175 Ko) · brotli : ${kilobytes(jsBrotli)}`);
for (const { path, bytes } of [...scripts].sort((a, b) => gzipSync(b.bytes).length - gzipSync(a.bytes).length).slice(0, 8)) {
  console.log(`    ${kilobytes(gzipSync(bytes).length).padStart(9)}  ${path.split("/").pop()}`);
}
console.log(`  HTML gzip : ${kilobytes(htmlGzip)} · CSS gzip : ${kilobytes(cssGzip)} · polices préchargées : ${kilobytes(fontBytes)} (${fonts.length})`);
console.log(`  HTML + CSS + polices : ${kilobytes(htmlGzip + cssGzip + fontBytes)} (budget 120 Ko hors JS)`);

const ttfb = [];
for (let run = 0; run < TTFB_RUNS; run += 1) {
  const started = performance.now();
  const reply = await fetch(new URL(READER, base));
  const reader = reply.body.getReader();
  await reader.read();
  ttfb.push(performance.now() - started);
  await reader.cancel();
}
console.log(`  TTFB local : p50 ${percentile(ttfb, 50).toFixed(1)} ms · p95 ${percentile(ttfb, 95).toFixed(1)} ms (budget 200 ms)`);

const search = [];
const clientIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
for (let run = 0; run < SEARCHES + WARMUP; run += 1) {
  const started = performance.now();
  // Une IP simulée par tranche : le test mesure la requête, pas la limite de débit.
  const ip = `${clientIp.slice(0, clientIp.lastIndexOf("."))}.${run % 250}`;
  const reply = await fetch(new URL("/bible/recherche?q=grace", base), { headers: { "x-real-ip": ip } });
  await reply.text();
  if (run >= WARMUP) search.push(performance.now() - started);
}
console.log(`Recherche « grace » de bout en bout (page complète) : p50 ${percentile(search, 50).toFixed(1)} ms · p95 ${percentile(search, 95).toFixed(1)} ms (budget 150 ms)`);
