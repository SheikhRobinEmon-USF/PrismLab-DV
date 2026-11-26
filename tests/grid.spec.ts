import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("dashboard links the year, economy, chart, map, and export", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "The global power transition." })).toBeVisible();
  const metrics = page.getByLabel("Electricity metrics");
  await expect(metrics).toContainText("31,984");
  await expect(metrics).toContainText("42.5");
  const year = page.getByRole("combobox", { name: "Year", exact: true });
  await page.getByRole("slider", { name: "Timeline year" }).press("ArrowLeft");
  await expect(year).toHaveValue("2024");
  await expect(metrics).toContainText("31,121");
  await expect(page.getByRole("region", { name: "Generation mix" })).toContainText("2024");
  await expect(page.getByRole("region", { name: "What drove the change?" })).toContainText("2024 vs. 2023");

  const canvas = page.locator(".grid-timeline canvas").first();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await canvas.click({ position: { x: Math.round(bounds!.width * .47), y: 95 } });
  await expect(year).not.toHaveValue("2024");
  await year.selectOption("2025");
  await page.getByRole("button", { name: /China/ }).click();
  await expect(page.getByRole("combobox", { name: "Geography" })).toHaveValue("CHN");
  await expect(metrics).toContainText("10,506");
  await expect(page.getByRole("region", { name: "Clean vs. fossil power" })).toContainText("China");
  await page.getByRole("button", { name: "TWh", exact: true }).click();
  await expect(page.getByRole("region", { name: "Clean vs. fossil power" })).toContainText("Generation in terawatt-hours");
  const fossil = page.getByRole("button", { name: /^Fossil [\d,]+ TWh/ });
  await fossil.click();
  await expect(fossil).toHaveAttribute("aria-pressed", "false");
  const coal = page.getByRole("button", { name: /^Coal [\d.]+%/ });
  await coal.click();
  await expect(coal).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("combobox", { name: "Region", exact: true }).selectOption("Asia");
  await page.getByRole("combobox", { name: "Ranking metric" }).selectOption("change");
  await expect(page.getByLabel("Ranked economies")).toContainText("pp");
  await page.getByRole("button", { name: "Map view" }).click();
  const map = page.getByRole("img", { name: /^World map colored/ });
  await expect(map.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Map view" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Rankings view" }).click();
  await expect(page.getByLabel("Ranked economies")).toBeVisible();

  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("grid-atlas-chn-ember.csv");
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain('"China","CHN",2025,10505.74');
  expect(errors).toEqual([]);
});

test("playback, missing years and accessible methodology", async ({ page }) => {
  await page.goto("./");
  const year = page.getByRole("combobox", { name: "Year", exact: true });
  await year.selectOption("2023");
  await page.getByRole("button", { name: "Play timeline" }).click();
  await expect(year).toHaveValue("2025");
  await expect(page.getByRole("button", { name: "Play timeline" })).toBeVisible();

  await page.getByRole("combobox", { name: "Geography" }).selectOption("BDI");
  await expect(page.getByText(/no observation for Burundi in 2025/)).toBeVisible();
  await page.getByRole("button", { name: "Use 2024" }).click();
  await expect(year).toHaveValue("2024");
  await expect(page.getByLabel("Electricity metrics")).toContainText("76.8");

  await page.getByRole("button", { name: "Methodology", exact: true }).click();
  const method = page.getByRole("dialog", { name: "Data and methodology" });
  await expect(method).toBeVisible();
  await expect(method.getByRole("link", { name: "Ember dataset" })).toHaveAttribute("href", /ember-energy.org/);
  await page.keyboard.press("Escape");
  await expect(method).toBeHidden();
  await expect(page.getByRole("button", { name: "Methodology", exact: true })).toBeFocused();
});

for (const width of [320, 768, 1440]) {
  test("dashboard has no horizontal overflow and passes axe at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.getByLabel("Ranked economies")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to dashboard" })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}
