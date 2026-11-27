import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the collection links to five complete cases", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Five questions. Public data." })).toBeVisible();
  const links = [
    [/Grid Atlas/, "grid-atlas", "The global power transition."],
    [/A hotter planet/, "warming", "A hotter planet"],
    [/The digital divide/, "digital-divide", "The digital divide"],
    [/New York rides again/, "transit-recovery", "New York rides again"],
    [/The seismic atlas/, "seismic-atlas", "The seismic atlas"],
  ] as const;
  for (const [name, slug, title] of links) {
    await page.getByRole("main").getByRole("link", { name }).first().click();
    await expect(page).toHaveURL(new RegExp("/cases/" + slug + "/$"));
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Conclusion/ })).toBeVisible();
    await page.getByRole("navigation").getByRole("link", { name: "All cases" }).click();
  }
  await page.getByRole("link", { name: /A hotter planet/ }).click();
  await expect(page.getByLabel("Case metrics")).toContainText("+1.19°C");
  await page.getByRole("link", { name: /Next case · The digital divide/ }).click();
  await expect(page.getByLabel("Case metrics")).toContainText("71.2%");
});

test("temperature controls link the annual trend, heatmap and monthly view", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("cases/warming/");
  const metrics = page.getByLabel("Case metrics");
  await expect(metrics).toContainText("+1.19°C");
  await expect(metrics).toContainText("+1.01°C");
  await expect(page.getByRole("img", { name: /Heatmap of monthly/ }).locator("canvas").first()).toBeVisible();
  await page.getByRole("slider", { name: "Year timeline" }).press("ArrowLeft");
  await expect(page.getByRole("combobox", { name: "Year", exact: true })).toHaveValue("2024");
  await expect(page.getByRole("heading", { name: "The months of 2024" })).toBeVisible();
  await page.getByRole("combobox", { name: "Month" }).selectOption("Feb");
  await expect(page.getByText("Feb 2024 · +1.43°C")).toBeVisible();
  await page.getByRole("button", { name: "Since 1970" }).click();
  await expect(page.getByRole("combobox", { name: "Year", exact: true }).locator("option")).toHaveCount(56);
  expect(errors).toEqual([]);
});

test("digital divide compares a selected economy against the World aggregate", async ({ page }) => {
  await page.goto("cases/digital-divide/");
  const metrics = page.getByLabel("Case metrics");
  await expect(metrics).toContainText("71.2%");
  await expect(metrics).toContainText("+35.4 pp");
  await page.getByRole("combobox", { name: "Economy" }).selectOption("KEN");
  await expect(metrics).toContainText("Kenya online");
  await expect(metrics).toContainText("35%");
  await page.getByRole("combobox", { name: "Region" }).selectOption({ label: "Sub-Saharan Africa" });
  await page.getByRole("button", { name: "5-year gain" }).click();
  const ranked = page.getByRole("list", { name: "Ranked economies" });
  await expect(ranked).toContainText("pp");
  await ranked.getByRole("button").first().click();
  await expect(page.getByRole("combobox", { name: "Economy" })).not.toHaveValue("KEN");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^internet-use-.+\.csv$/);
});

test("transit links the recovery, mode rankings and daily comparisons", async ({ page }) => {
  await page.goto("cases/transit-recovery/");
  const metrics = page.getByLabel("Case metrics");
  await expect(metrics).toContainText("77%");
  await page.getByRole("list", { name: "Transit modes by recovery" }).getByRole("button", { name: /Long Island Rail Road/ }).click();
  await expect(metrics).toContainText("94%");
  await expect(page.getByRole("region", { name: "Weekday vs. weekend" })).toContainText("Long Island Rail Road");
  await page.getByRole("button", { name: "Daily volume", exact: true }).click();
  await expect(page.getByRole("img", { name: /Long Island Rail Road monthly daily volume/ }).locator("canvas").first()).toBeVisible();
  await page.getByRole("slider", { name: "Month timeline" }).press("ArrowLeft");
  await expect(page.getByRole("combobox", { name: "Month", exact: true })).toHaveValue("2024-11");
  await expect(page.getByRole("region", { name: "Recovery by mode" })).toContainText("November 2024");
});

test("the seismic atlas filters the catalog and selects event records", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("cases/seismic-atlas/");
  const metrics = page.getByLabel("Case metrics");
  await expect(metrics).toContainText("3,874");
  await expect(page.getByRole("img", { name: /World map of filtered earthquake/ }).locator("canvas").first()).toBeVisible();
  await page.getByRole("button", { name: "7.0", exact: true }).click();
  await expect(metrics).toContainText("387");
  await page.getByRole("combobox", { name: "Year" }).selectOption("2025");
  await expect(page.getByRole("region", { name: "How much counts vary by year" })).toContainText("qualifying events in 2025");
  await page.getByRole("combobox", { name: "Event", exact: true }).selectOption({ index: 1 });
  await expect(page.getByRole("link", { name: "USGS event record" })).toHaveAttribute("href", /earthquake\.usgs\.gov\/earthquakes\/eventpage\//);
  expect(errors).toEqual([]);
});

for (const path of ["./", "cases/warming/", "cases/digital-divide/", "cases/transit-recovery/", "cases/seismic-atlas/"]) {
  test("mobile keyboard and axe checks for " + path, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 830 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    if (path !== "./") await expect(page.getByLabel("Case metrics")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /^Skip to/ })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);
  });
}
