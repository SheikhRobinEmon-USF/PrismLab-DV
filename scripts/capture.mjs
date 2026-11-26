import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const url = "http://127.0.0.1:4173" + (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/";
const browser = await chromium.launch({ executablePath: process.env.PRISMLAB_CHROMIUM });
try {
  await mkdir("docs/screenshots", { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await page.goto(url);
  await page.getByRole("heading", { name: /Make your data/ }).waitFor();
  await page.screenshot({ path: "docs/screenshots/gallery.png" });
  await page.getByRole("button", { name: "Load retail demo" }).click();
  await page.getByRole("link", { name: "Resume workspace" }).click();
  await page.locator(".plot-panel svg").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Inspect 2024-01-01/ }).click();
  await page.getByRole("heading", { name: "Selected records" }).waitFor();
  await page.getByLabel("Matching source records").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/screenshots/linked-analysis.png" });
  await page.setViewportSize({ width: 375, height: 950 });
  await page.getByRole("link", { name: "Chart composer" }).click();
  await page.getByLabel("Chart type").waitFor();
  await page.screenshot({ path: "docs/screenshots/mobile-composer.png" });
} finally { await browser.close(); }
