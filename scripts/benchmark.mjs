import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import os from "node:os";
import { chromium } from "@playwright/test";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const origin = "http://127.0.0.1:4173" + base;
const browser = await chromium.launch({ executablePath: process.env.PRISMLAB_CHROMIUM });
const protocol = await browser.newBrowserCDPSession();

async function rss() {
  const { processInfo } = await protocol.send("SystemInfo.getProcessInfo");
  const processes = await Promise.all(processInfo.map(({ id }) => readFile("/proc/" + id + "/status", "utf8").catch(() => "")));
  return processes.reduce((total, status) => total + Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0), 0) / 1024;
}

console.log(JSON.stringify({ browser: browser.version(), platform: os.platform(), cpu: os.cpus()[0].model, node: process.version }));
try {
  for (const count of [10_000, 100_000, 1_000_000]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto(origin + "/studio/datasets/");
    await page.getByRole("button", { name: "Choose a file" }).waitFor({ state: "visible" });
    const csv = ["month,region,sales\n"];
    for (let index = 0; index < count; index++) {
      csv.push(`2024-${String(index % 12 + 1).padStart(2,"0")}-01,${["N","S","E","W"][index % 4]},${index % 97}\n`);
    }
    const data = Buffer.from(csv.join(""));
    const label = "benchmark-" + count + ".csv";
    const initial = await rss();
    let peak = initial;
    let sampling = false;
    const timer = setInterval(async () => {
      if (sampling) return;
      sampling = true;
      try { peak = Math.max(peak, await rss()); }
      finally { sampling = false; }
    }, 100);
    try {
      const start = performance.now();
      await page.locator('input[type="file"]').setInputFiles({ name: label, mimeType: "text/csv", buffer: data });
      await page.getByText(label + " loaded.", { exact: true }).waitFor({ timeout: 90_000 });
      const importMs = Math.round(performance.now() - start);
      await page.getByRole("link", { name: "Build a chart" }).click();
      await page.getByRole("button", { name: "Add to storyboard" }).waitFor({ timeout: 60_000 });
      await page.getByLabel("Filter field").selectOption("region");
      await page.getByLabel("Value", { exact: true }).fill("S");
      const queryStart = performance.now();
      await page.getByRole("button", { name: "Add filter" }).click();
      await page.getByRole("button", { name: "Add to storyboard" }).waitFor({ timeout: 60_000 });
      console.log(JSON.stringify({ count, bytes: data.length, importMs, filteredQueryMs: Math.round(performance.now() - queryStart), peakRssDeltaMiB: Math.round(peak - initial) }));
    } finally {
      clearInterval(timer);
      await context.close();
    }
  }
} finally { await browser.close(); }
