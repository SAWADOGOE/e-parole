import { defineConfig, devices } from "@playwright/test";
import { e2eEnv, E2E_BASE_URL } from "./e2e/support/env";

/**
 * E2E contre le build de production (port 53100, convention « préfixe 5 ») et la base eparole_test.
 * Prérequis : `docker compose up -d db storage mail` et `pnpm build`.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: E2E_BASE_URL,
    locale: "fr-FR",
    timezoneId: "Africa/Ouagadougou",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: "pnpm exec next start --port 53100",
      url: `${E2E_BASE_URL}/api/health`,
      env: e2eEnv(),
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm exec tsx src/worker.ts",
      env: { ...e2eEnv(), LOG_LEVEL: "info" },
      wait: { stdout: /worker démarré/ },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
