import { copyFile, mkdir } from "node:fs/promises";
const directory = "public/engine";
await mkdir(directory, { recursive: true });
for (const filename of ["duckdb-mvp.wasm", "duckdb-browser-mvp.worker.js", "duckdb-eh.wasm", "duckdb-browser-eh.worker.js"]) {
  await copyFile("node_modules/@duckdb/duckdb-wasm/dist/" + filename, directory + "/" + filename);
}

const { createHash } = await import("node:crypto");
const { execFileSync } = await import("node:child_process");
const { readFile, writeFile } = await import("node:fs/promises");
const extensions = {
  wasm_eh: {
    icu: "ecdbbb29331f72103b8eb227db5792f186b191a4f7a359db8dda9919b0a736de",
    parquet: "4845705bbd69fc9ad52878d96a505c73cae4a6c509822079cc2413e5eb437f95",
  },
  wasm_mvp: {
    icu: "e12652f2953fbf0183c5354443c8e7547ec620958baa9ad303db23f46bdd6eac",
    parquet: "b64c255a7f7d06cc234535b2f0ecab345fda91bffff5509d3179004bc13aa19a",
  },
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
await Promise.all(Object.entries(extensions).flatMap(([platform, flavors]) => Object.entries(flavors).map(async ([name, expected]) => {
  const filename = name + ".duckdb_extension.wasm";
  const folder = directory + "/" + platform;
  const target = folder + "/" + filename;
  const cached = await readFile(target).catch(() => null);
  if (cached && sha256(cached) === expected) return;
  const url = "https://extensions.duckdb.org/v1.5.4/" + platform + "/" + filename;
  const bytes = execFileSync("curl", ["--fail", "--silent", "--show-error", "--location", "--retry", "2", "--max-time", "30", url], { maxBuffer: 16 * 1024 * 1024 });
  if (sha256(bytes) !== expected) throw new Error("Unexpected DuckDB extension digest: " + filename);
  await mkdir(folder, { recursive: true });
  await writeFile(target, bytes);
})));
