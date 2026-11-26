import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { compile, defaultQuery, describe, identifier, numeric, temporal } from "../src/query";
import type { Dataset, Query } from "../src/contracts";
import { csvCell } from "../src/persistence";

const dataset: Dataset = {
  id: "gold", name: "Golden data", digest: "0".repeat(64), format: "CSV", rowCount: 7,
  size: 1, source: "Synthetic", license: "CC0", columns: [
    { name: "month", type: "date" }, { name: "region", type: "text" }, { name: 'sales"usd', type: "number" },
    { name: "latitude", type: "number" }, { name: "longitude", type: "number" },
  ],
};
const query = defaultQuery(dataset);
let connection: DuckDBConnection;
before(async () => {
  connection = await (await DuckDBInstance.create(":memory:")).connect();
  await connection.run(`SET TimeZone='UTC';
    CREATE TABLE records(month VARCHAR, region VARCHAR, "sales""usd" VARCHAR, latitude VARCHAR, longitude VARCHAR);
    INSERT INTO records VALUES
      ('2024-01-01T01:00:00Z','South','10','35','-80'),
      ('2024-01-04','South','20','35','-80'),
      ('2024-01-01T01:00:00Z','North','-5','45','-90'),
      ('2024-02-01','South',NULL,'35','-80'),
      ('2024-02-01','North','not a number','50','-90'),
      ('2024-02-02',NULL,'40','999','-90'),
      ('not a date','South','50','35','-80');`);
});
after(() => connection.closeSync());

async function run(patch: Partial<Query> = {}, mode: "points" | "summary" | "records" = "summary", selection?: { key: string; group: string }) {
  const { sql, params } = compile(dataset, { ...query, ...patch }, selection)[mode];
  return (await connection.runAndReadAll(sql, params)).getRowObjects();
}

const cases: Array<[string, Partial<Query>, number | null, bigint, bigint]> = [
  ["sum excludes missing measures", {}, 65, 4n, 6n],
  ["average denominator excludes invalid measures", { aggregate: "average" }, 16.25, 4n, 6n],
  ["average zero policy counts invalid measures", { aggregate: "average", missing: "zero" }, 65 / 6, 6n, 6n],
  ["minimum preserves negative numbers", { aggregate: "min" }, -5, 4n, 6n],
  ["maximum excludes the bad date", { aggregate: "max" }, 40, 4n, 6n],
  ["count of typed values", { aggregate: "count" }, 4, 4n, 6n],
  ["count of rows", { aggregate: "count", measure: "" }, 6, 6n, 6n],
  ["count with zero policy", { aggregate: "count", missing: "zero" }, 6, 6n, 6n],
  ["exact region", { filters: [{ field: "region", kind: "equals", value: "South" }] }, 30, 2n, 3n],
  ["empty match", { filters: [{ field: "region", kind: "equals", value: "West" }] }, null, 0n, 0n],
  ["numeric filter string binds", { filters: [{ field: 'sales"usd', kind: "equals", value: "20" }] }, 20, 1n, 1n],
  ["inclusive numeric range", { filters: [{ field: 'sales"usd', kind: "range", value: "-5", end: "10" }] }, 5, 2n, 2n],
  ["inclusive date range", { filters: [{ field: "month", kind: "range", value: "2024-01-01", end: "2024-01-31" }] }, 25, 3n, 3n],
  ["unknown input text stays data", { filters: [{ field: "region", kind: "equals", value: "unmatched ' category" }] }, null, 0n, 0n],
  ["map rejects out-of-range locations", { chart: "map" }, 75, 4n, 6n],
  ["histogram measures cohort size", { chart: "histogram", x: 'sales"usd', aggregate: "count", measure: "" }, 5, 5n, 5n],
  ["scatter uses numeric x", { chart: "scatter", x: 'sales"usd' }, 115, 5n, 5n],
  ["grouping retains missing groups", { group: "region" }, 65, 4n, 6n],
  ["count keeps empty values out of denominator", { x: "region", aggregate: "count" }, 4, 4n, 6n],
  ["zero-filled sum", { missing: "zero" }, 65, 6n, 6n],
];
for (const [name, patch, value, denominator, rows] of cases) test(name, async () => {
  const [summary] = await run(patch);
  assert.equal(summary.value, value);
  assert.equal(summary.denominator, denominator);
  assert.equal(summary.rows, rows);
});

test("timezone changes calendar month boundary", async () => {
  const utc = await run({ grain: "month" }, "points");
  const west = await run({ grain: "month", timezone: "America/Los_Angeles" }, "points");
  assert.equal(utc[0].key, "2024-01-01");
  assert.equal(west[0].key, "2023-12-01");
  assert.equal(west[0].value, 5);
});
test("drilldown returns exact record group", async () => {
  const points = await run({ grain: "month", group: "region" }, "points");
  const point = points.find(item => item.key === "2024-01-01" && item.group === "South")!;
  const selected = { key: String(point.key), group: String(point.group) };
  const rows = await run({ grain: "month", group: "region" }, "records", selected);
  assert.equal(rows.length, Number(point.rows));
  assert.deepEqual(rows.map(row => row['sales"usd']).sort(), ["10", "20"]);
});
test("descending order maintains stable tie-breaker", async () => {
  const points = await run({ sort: "descending", grain: "month" }, "points");
  assert.deepEqual(points.map(p => p.value), [40, 25]);
});
test("invalid field and timezone are rejected", () => {
  assert.throws(() => compile(dataset, { ...query, x: "unknown" }), /Unknown field/);
  assert.throws(() => compile(dataset, { ...query, timezone: "invalid-zone" }), /timezone/);
  assert.throws(() => compile(dataset, { ...query, measure: "region" }), /numeric measure/);
});
test("identifier quoting and scalar expressions", async () => {
  assert.equal(identifier('a"b'), '"a""b"');
  const result = (await connection.runAndReadAll(`SELECT ${numeric("'Infinity'")} AS x, ${temporal("'2024-02-30'")} AS t`)).getRowObjects();
  assert.deepEqual(result, [{ x: null, t: null }]);
});
test("CSV export quoting neutralizes formula prefixes", () => {
  assert.equal(csvCell(" =1+1"), '"\' =1+1"');
  assert.equal(csvCell(-5), '"-5"');
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(describe(query), 'Sum of sales"usd');
});
