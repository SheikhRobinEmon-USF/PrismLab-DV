import { z } from "zod";
export const types = ["text", "number", "date"] as const;
export const chartTypes = ["line", "bar", "scatter", "histogram", "heatmap", "map"] as const;
export const aggregates = ["sum", "average", "count", "min", "max"] as const;
export const columnSchema = z.object({ name: z.string().min(1), type: z.enum(types) });
export const datasetSchema = z.object({
  name: z.string().min(1), id: z.string().min(1), digest: z.string().regex(/^[0-9a-f]{64}$/),
  format: z.enum(["CSV", "Parquet"]), size: z.number().nonnegative(),
  rowCount: z.number().int().nonnegative(), source: z.string(), license: z.string(),
  columns: z.array(columnSchema).min(1),
});
const filterSchema = z.object({
  field: z.string(), kind: z.enum(["equals", "range", "window"]), value: z.string(), end: z.string().optional(),
});
export const querySchema = z.object({
  x: z.string(), measure: z.string(), group: z.string(), size: z.string(),
  aggregate: z.enum(aggregates), chart: z.enum(chartTypes), filters: z.array(filterSchema),
  missing: z.enum(["exclude", "zero"]), timezone: z.string(), unit: z.string(),
  sort: z.enum(["key", "descending"]), grain: z.enum(["raw", "day", "month", "year"]),
});
export const pointSchema = z.object({
  key: z.string(), group: z.string(), value: z.number().nullable(),
  rows: z.number().int(), denominator: z.number().int(), numerator: z.number().nullable(),
  size: z.number().nullable(),
});
export const factSchema = z.object({
  selection: z.object({ key: z.string(), group: z.string() }).optional(),
  datasetDigest: z.string(), datasetRevision: z.string().optional(), queryHash: z.string(), query: querySchema,
  value: z.number().nullable(), numerator: z.number().nullable(), denominator: z.number(),
  rows: z.number(), method: z.string(), limitations: z.string(),
});
export const cardSchema = z.object({
  id: z.string(), title: z.string(), claim: z.string(), caveat: z.string(), alternative: z.string(),
  datasetName: z.string(), evidence: factSchema, points: z.array(pointSchema).max(5000),
});
export const projectSchema = z.object({
  version: z.literal(1), dataset: datasetSchema, query: querySchema, cards: z.array(cardSchema),
  comparison: querySchema.optional(),
});
export type Dataset = z.infer<typeof datasetSchema>;
export type Query = z.infer<typeof querySchema>;
export type Filter = z.infer<typeof filterSchema>;
export type Point = z.infer<typeof pointSchema>;
export type Fact = z.infer<typeof factSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Profile = { name: string; type: Dataset["columns"][number]["type"]; nulls: number; invalid: number; distinct: number };
export type Row = Record<string, string | number | null>;
export type Result = { points: Point[]; summary: Point; records: Row[]; truncated: boolean };
