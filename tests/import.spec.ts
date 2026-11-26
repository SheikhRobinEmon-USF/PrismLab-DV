import { expect, test } from "@playwright/test";

test("validates source rows, applies type overrides, and rejects malformed input", async ({ page }) => {
  await page.goto("studio/datasets/");
  await page.locator('input[type="file"]').setInputFiles("fixtures/golden.csv");
  await expect(page.getByText("golden.csv loaded.")).toBeVisible();
  await expect(page.getByRole("row", { name: /sales.*number.*1 \(33.3333%\)/ })).toBeVisible();
  await page.getByLabel("Type for region").selectOption("number");
  await expect(page.getByRole("row", { name: /region.*number.*0 \(0%\).*3/ })).toBeVisible();
  await page.locator('.upload-area input[type="file"]').setInputFiles("fixtures/malformed.csv");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source preview" })).toBeVisible();
  await expect(page.getByLabel("Source preview")).toContainText("South");
});

test("time window, chart variants and downloaded project round-trip", async ({ page }, testInfo) => {
  await page.goto("studio/datasets/");
  await page.locator('input[type="file"]').setInputFiles("fixtures/golden.csv");
  await expect(page.getByText("golden.csv loaded.")).toBeVisible();
  await page.getByRole("link", { name: "Linked analysis" }).click();
  const querySummary = page.getByLabel("Query summary");
  await expect(querySummary).toContainText("25");
  await page.getByRole("slider", { name: /Window end/ }).press("ArrowLeft");
  await page.getByRole("slider", { name: /Window end/ }).press("ArrowLeft");
  await page.getByRole("button", { name: "Apply time window" }).click();
  await expect(querySummary).toContainText("10");
  await page.getByRole("link", { name: "Chart composer" }).click();
  for (const chart of ["bar", "heatmap", "scatter", "histogram"]) {
    await page.getByRole("combobox", { name: "Chart type" }).selectOption(chart);
    await expect(page.locator(".chart-canvas svg")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /error/i })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Export & provenance" }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project JSON" }).click();
  const filename = testInfo.outputPath("roundtrip.json");
  await (await exported).saveAs(filename);
  await page.getByRole("link", { name: "Datasets" }).click();
  await page.locator('.upload-area input[type="file"]').setInputFiles(filename);
  await expect(page.getByText("golden.csv loaded.")).toBeVisible();
  await page.getByRole("link", { name: "Chart composer" }).click();
  await expect(page.getByRole("combobox", { name: "Chart type" })).toHaveValue("histogram");
  await expect(querySummary).toContainText("Count of records in 12 equal-width bins");
});

test("saved retail workspace reloads offline after a connected visit", async ({ page, context }) => {
  await page.goto("studio/datasets/");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole("button", { name: "Load retail demo" }).click();
  await expect(page.getByText("Retail performance loaded.")).toBeVisible();
  await page.getByRole("button", { name: "Save workspace" }).click();
  await expect(page.getByText("Workspace saved on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Source preview" })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Source preview" })).toBeVisible();
  await expect(page.getByText("Retail performance loaded.")).toBeVisible();
});
