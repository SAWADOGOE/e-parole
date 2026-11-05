/**
 * LCP du lecteur sous contraintes réseau et CPU, via Chromium et le protocole DevTools.
 *   node scripts/bible/measure-lcp.mjs http://localhost:53200
 * Approximation locale de Lighthouse mobile (Slow 4G + CPU x4) : ne remplace pas une mesure sur appareil réel.
 */
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:53200";
const RUNS = 5;
const SLOW_4G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil((values.length * p) / 100) - 1];

const browser = await chromium.launch();
const results = [];
const transferred = [];
for (let run = 0; run < RUNS; run += 1) {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", SLOW_4G);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let bytes = 0;
  client.on("Network.loadingFinished", (event) => {
    bytes += event.encodedDataLength;
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(new URL("/bible/lsg/jean/3", base).toString(), { waitUntil: "load" });
  await page.waitForTimeout(1_500);
  const { lcp, cls } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
  results.push({ lcp, cls });
  transferred.push(bytes);
  await context.close();
}
await browser.close();

const lcp = results.map((result) => result.lcp);
console.log(`LCP (Slow 4G, CPU x4, ${RUNS} essais) : médiane ${percentile(lcp, 50).toFixed(0)} ms · max ${Math.max(...lcp).toFixed(0)} ms (budget p75 2 500 ms)`);
console.log(`CLS max : ${Math.max(...results.map((result) => result.cls)).toFixed(4)} (budget 0,1)`);
console.log(`Transfert total médian : ${(percentile(transferred, 50) / 1024).toFixed(0)} Ko`);
