import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { asset } from "./assets";
import type { Dataset, Point, Profile, Query, Result, Row } from "./contracts";
import { compile, identifier, numeric, temporal, type Compiled, type Selection } from "./query";

export const maxFileSize = 30 * 1024 * 1024;
const maxRows = 1_000_000;
const maxColumns = 80;

export async function digest(data: ArrayBuffer | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export class Database {
  private constructor(private db: AsyncDuckDB, private conn: AsyncDuckDBConnection, private platform: string) {}

  static async start() {
    const duckdb = await import("@duckdb/duckdb-wasm");
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: asset("engine/duckdb-mvp.wasm"), mainWorker: asset("engine/duckdb-browser-mvp.worker.js") },
      eh: { mainModule: asset("engine/duckdb-eh.wasm"), mainWorker: asset("engine/duckdb-browser-eh.worker.js") },
    });
    const worker = new Worker(bundle.mainWorker!);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    try {
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      const conn = await db.connect();
      await conn.query("SET autoinstall_known_extensions=false; SET autoload_known_extensions=false; SET memory_limit='256MB'");
      const platform = bundle.mainModule.endsWith("-eh.wasm") ? "wasm_eh" : "wasm_mvp";
      const database = new Database(db, conn, platform);
      await database.loadExtension("icu");
      await conn.query("SET TimeZone='UTC'");
      return database;
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }

  private async loadExtension(name: "icu" | "parquet") {
    const url = new URL(asset(`engine/${this.platform}/${name}.duckdb_extension.wasm`), location.origin);
    await this.conn.query(`LOAD '${url.href.replaceAll("'", "''")}'`);
  }

  async close() { await this.db.terminate(); }

  private async run(statement: Compiled) {
    if (!statement.params.length) return this.conn.query(statement.sql);
    const prepared = await this.conn.prepare(statement.sql);
    try { return await prepared.query(...statement.params); }
    finally { await prepared.close(); }
  }

  async load(file: Blob, details: { name: string; filename: string; source: string; license: string }) {
    if (!file.size || file.size > maxFileSize) throw new Error("Choose a nonempty file under 30 MiB.");
    const format = /\.csv$/i.test(details.filename) ? "CSV" : /\.parquet$/i.test(details.filename) ? "Parquet" : null;
    if (!format) throw new Error("Choose a CSV or Parquet file.");
    if (format === "Parquet") await this.loadExtension("parquet");
    const bytes = await file.arrayBuffer();
    const sha = await digest(bytes);
    const entry = format === "CSV" ? "input.csv" : "input.parquet";
    await this.db.registerFileBuffer(entry, new Uint8Array(bytes));
    const reader = format === "CSV"
      ? "read_csv('input.csv', header=true, all_varchar=true, strict_mode=true, ignore_errors=false)"
      : "read_parquet('input.parquet')";
    await this.conn.query("BEGIN");
    try {
      const schema = (await this.conn.query(`DESCRIBE SELECT * FROM ${reader}`)).toArray();
      if (!schema.length || schema.length > maxColumns) throw new Error("Files must have between 1 and 80 columns.");
      const names = schema.map(row => String(row.column_name));
      const raw = names.map(name => `NULLIF(TRIM(CAST(${identifier(name)} AS VARCHAR)), '') AS ${identifier(name)}`).join(", ");
      await this.conn.query(`CREATE OR REPLACE TABLE records AS SELECT ${raw} FROM ${reader} LIMIT ${maxRows + 1}`);
      const count = Number((await this.conn.query("SELECT COUNT(*) AS n FROM records")).get(0)?.n);
      if (count > maxRows) throw new Error("Files may contain at most 1,000,000 rows.");
      if (!count) throw new Error("The file has no data rows.");
      const textColumns = names.map(name => ({ name, type: "text" as const }));
      const dataset: Dataset = { ...details, id: sha.slice(0, 12), digest: sha, size: file.size, rowCount: count, format, columns: textColumns };
      const profiles = await this.profile(dataset, true);
      dataset.columns = profiles.map(({ name, type }) => ({ name, type }));
      await this.conn.query("COMMIT");
      return { dataset, profiles };
    } catch (error) {
      await this.conn.query("ROLLBACK");
      throw error;
    } finally {
      await this.db.dropFile(entry);
    }
  }

  async profile(dataset: Dataset, infer = false): Promise<Profile[]> {
    const stats = dataset.columns.flatMap(({ name }, index) => {
      const field = identifier(name);
      return [
        `COUNT(${field}) AS raw_${index}`, `COUNT(${numeric(field)}) AS number_${index}`,
        `COUNT(${temporal(field)}) AS date_${index}`, `APPROX_COUNT_DISTINCT(${field}) AS distinct_${index}`,
      ];
    });
    const row = (await this.conn.query("SELECT " + stats.join(", ") + " FROM records")).get(0)!;
    return dataset.columns.map(({ name, type }, index) => {
      const raw = Number(row["raw_" + index]);
      const numbers = Number(row["number_" + index]);
      const dates = Number(row["date_" + index]);
      const chosen = infer ? (raw && numbers === raw ? "number" : raw && dates === raw ? "date" : "text") : type;
      return { name, type: chosen, nulls: dataset.rowCount - raw, invalid: raw - (chosen === "number" ? numbers : chosen === "date" ? dates : raw), distinct: Math.min(raw, Number(row["distinct_" + index])) };
    });
  }

  async preview(): Promise<Row[]> {
    return (await this.conn.query("SELECT * FROM records LIMIT 25")).toArray().map(row => row.toJSON());
  }

  async query(dataset: Dataset, query: Query, selection?: Selection): Promise<Result> {
    const compiled = compile(dataset, query, selection);
    const toPoint = (row: Record<string, unknown>): Point => ({
      key: String(row.key), group: String(row.group), value: row.value === null ? null : Number(row.value),
      numerator: row.numerator === null ? null : Number(row.numerator), denominator: Number(row.denominator),
      rows: Number(row.rows), size: row.size === null ? null : Number(row.size),
    });
    const points = (await this.run(compiled.points)).toArray().map(row => toPoint(row.toJSON()));
    const summary = toPoint((await this.run(compiled.summary)).get(0)!.toJSON());
    const records = (await this.run(compiled.records)).toArray().map(row => row.toJSON());
    return { points: points.slice(0, 5000), summary, records, truncated: points.length > 5000 };
  }
}
