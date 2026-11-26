import { defineConfig } from "@playwright/test";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://127.0.0.1:4173" + basePath + "/",
    launchOptions: { executablePath: process.env.PRISMLAB_CHROMIUM },
    trace: "retain-on-failure",
    actionTimeout: 30_000,
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173" + basePath + "/",
    reuseExistingServer: !process.env.CI,
  },
});
