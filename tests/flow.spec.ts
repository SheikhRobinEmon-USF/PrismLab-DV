import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("retail workspace, linked selection, saved story and export", async ({ page }) => {
  await page.goto("studio/");
  await page.getByRole("button", { name: "Load retail demo" }).click();
  await expect(page.getByText("Retail performance loaded.")).toBeVisible();
  await page.getByRole("link", { name: "Resume workspace" }).click();
  const summary = page.getByLabel("Query summary");
  await expect(summary).toContainText("1,568,472");
  await page.getByRole("button", { name: /^Inspect 2024-01-01/ }).click();
  await expect(summary).toContainText("Selected value");
  await expect(page.getByRole("heading", { name: "Selected records" })).toBeVisible();
  await expect(page.getByLabel("Matching source records")).toContainText("North");
  await page.getByRole("button", { name: /^Inspect 2024-01-01/ }).click();
  await expect(page.getByLabel("Matching source records")).toContainText("North", { timeout: 3000 });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Clear selection" }).click();
  await page.getByRole("button", { name: "Set current view as baseline" }).click();
  await page.getByLabel("Filter field").selectOption("region");
  await page.getByLabel("Value", { exact: true }).fill("South");
  await page.getByRole("button", { name: "Add filter" }).click();
  await expect(summary).toContainText("24");
  const comparison = page.getByRole("heading", { name: "Compare filter states" }).locator("..").locator("..");
  const delta = comparison.getByText(/^Change /);
  await expect(delta).toContainText(/% of baseline magnitude/);
  const filteredDelta = await delta.innerText();
  await page.getByRole("button", { name: /^Inspect 2024-01-01/ }).click();
  await expect(page.getByLabel("Matching source records")).toContainText("South");
  await expect(delta).toHaveText(filteredDelta);
  await page.getByRole("button", { name: "Clear selection" }).click();
  await page.getByRole("button", { name: "Add to storyboard" }).click();
  await expect(page.getByText("Chart and evidence added to storyboard.")).toBeVisible();
  await page.getByRole("link", { name: "Storyboard" }).click();
  await page.getByRole("textbox", { name: "Claim", exact: true }).fill("A reproducible claim.");
  await page.getByRole("button", { name: "Save workspace", exact: true }).click();
  await expect(page.getByText("Workspace saved on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Claim", exact: true })).toHaveValue("A reproducible claim.");
  await page.getByRole("link", { name: "Export & provenance" }).click();
  for (const kind of ["project JSON", "aggregates CSV", "story HTML", "PNG", "SVG"]) {
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download " + kind }).click();
    expect(await (await downloading).failure()).toBeNull();
  }
});

test("Parquet inspection, map and stale evidence", async ({ page }) => {
  await page.goto("studio/datasets/");
  await page.getByRole("button", { name: "Load retail demo" }).click();
  await page.getByRole("link", { name: "Chart composer" }).click();
  await page.getByRole("button", { name: "Add to storyboard" }).click();
  await expect(page.getByText("Chart and evidence added")).toBeVisible();
  await page.getByRole("link", { name: "Gallery" }).click();
  await page.getByRole("link", { name: "About this dataset" }).nth(1).click();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByText("Global earthquakes loaded.")).toBeVisible();
  await page.getByRole("link", { name: "Explore dataset" }).click();
  await page.getByRole("link", { name: "Chart composer" }).click();
  await page.getByLabel("Chart type").selectOption("map");
  await page.getByRole("combobox", { name: "Measure", exact: true }).selectOption("mag");
  await page.getByLabel("Aggregation").selectOption("average");
  await expect(page.getByRole("img", { name: /Average of mag chart/ })).toBeVisible();
  await expect(page.locator(".chart-canvas svg")).toBeVisible();
  await page.getByRole("link", { name: "Storyboard" }).click();
  await expect(page.getByText(/Stale evidence/)).toBeVisible();
});

for (const width of [320, 375, 768, 1440]) {
  test("responsive gallery and keyboard at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("studio/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}
