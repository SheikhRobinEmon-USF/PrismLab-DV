import { querySchema, type Dataset, type Query } from "./contracts";

export function identifier(name: string) {
  return '"' + name.replaceAll('"', '""') + '"';
}

export const numeric = (field: string) =>
  `CASE WHEN isfinite(TRY_CAST(${field} AS DOUBLE)) THEN TRY_CAST(${field} AS DOUBLE) END`;
export const temporal = (field: string) =>
  `CASE WHEN regexp_full_match(${field}, '[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9]{2}:[0-9]{2}(:[0-9]{2}(\\.[0-9]+)?)?(Z|[+-][0-9]{2}:[0-9]{2})?)?') THEN TRY_CAST(${field} AS TIMESTAMPTZ) END`;

export function defaultQuery(dataset: Dataset): Query {
  const date = dataset.columns.find(column => column.type === "date");
  const number = dataset.columns.find(column => column.type === "number");
  return {
    x: (date ?? dataset.columns[0]).name, measure: number?.name ?? "", group: "", size: "",
    aggregate: number ? "sum" : "count", chart: date ? "line" : "bar", filters: [],
    missing: "exclude", timezone: "UTC", unit: "", grain: "raw", sort: "key",
  };
}

export type Selection = { key: string; group: string };
export type Compiled = { sql: string; params: string[] };

export function compile(dataset: Dataset, input: Query, selection?: Selection) {
  const parsed = querySchema.parse(input);
  const query: Query = parsed.chart === "histogram" ? { ...parsed, aggregate: "count", measure: "" } : parsed;
  const columns = new Map(dataset.columns.map(column => [column.name, column.type]));
  const field = (name: string) => {
    const type = columns.get(name);
    if (!type) throw new Error("Unknown field: " + name);
    const quoted = identifier(name);
    return type === "number" ? numeric(quoted) : type === "date" ? temporal(quoted) : quoted;
  };
  const measure = query.measure ? field(query.measure) : "1.0";
  if (query.aggregate !== "count" && columns.get(query.measure) !== "number") {
    throw new Error("Select a numeric measure for this aggregation.");
  }
  if (query.size && columns.get(query.size) !== "number") throw new Error("Size must be numeric.");
  try { new Intl.DateTimeFormat("en", { timeZone: query.timezone }); }
  catch { throw new Error("Choose a valid IANA timezone."); }
  const x = field(query.x);
  const dated = columns.get(query.x) === "date";
  const params: string[] = [];
  let key = x;
  if (dated && query.grain !== "raw") {
    key = `DATE_TRUNC('${query.grain}', timezone(?, ${x}))::DATE`;
    params.push(query.timezone);
  }
  let group = query.group ? field(query.group) : "''";
  let eligibility = "";
  if (query.chart === "map") {
    const latitude = dataset.columns.find(column => /^(lat|latitude)$/i.test(column.name) && column.type === "number");
    const longitude = dataset.columns.find(column => /^(lon|lng|longitude)$/i.test(column.name) && column.type === "number");
    if (!latitude || !longitude) throw new Error("Map requires numeric latitude and longitude columns.");
    key = field(longitude.name);
    group = field(latitude.name);
    eligibility = `WHERE ${key} BETWEEN -180 AND 180 AND ${group} BETWEEN -90 AND 90`;
    params.length = 0;
  }
  if (query.chart === "heatmap" && !query.group) throw new Error("Choose a group field for the heatmap.");
  if ((query.chart === "histogram" || query.chart === "scatter") && columns.get(query.x) !== "number") {
    throw new Error("Choose a numeric X field for this chart.");
  }
  const predicates = query.filters.map(filter => {
    const expression = field(filter.field);
    const type = columns.get(filter.field);
    const parameter = (value: string) => {
      if (type === "number" && (!value.trim() || !Number.isFinite(Number(value)))) {
        throw new Error("Enter a finite number for " + filter.field + ".");
      }
      if (type === "date") {
        if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value)) {
          throw new Error("Enter an ISO date or timestamp for " + filter.field + ".");
        }
        if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
          params.push(query.timezone, value);
          return "timezone(?, ?::TIMESTAMP)";
        }
      }
      params.push(value);
      return type === "number" ? "?::DOUBLE" : type === "date" ? "?::TIMESTAMPTZ" : "?";
    };
    const start = parameter(filter.value);
    if (filter.kind === "equals") return `${expression} = ${start}`;
    if (!filter.end) throw new Error("Enter both range endpoints.");
    const end = parameter(filter.end);
    if (filter.kind === "window") return `${expression} >= ${start} AND ${expression} < ${end}`;
    return `${expression} BETWEEN ${start} AND ${end}`;
  });
  const withFilters = [eligibility.replace(/^WHERE /, ""), ...predicates].filter(Boolean);
  const where = withFilters.length ? "WHERE " + withFilters.join(" AND ") : "";
  const size = query.size ? field(query.size) : "NULL::DOUBLE";
  const value = query.missing === "zero" ? `COALESCE(${measure}, 0)` : measure;
  const countValue = query.measure && query.missing === "exclude" ? measure : "1";
  const calculation = {
    sum: "SUM(prism_value)", average: "AVG(prism_value)", count: "COUNT(prism_count)",
    min: "MIN(prism_value)", max: "MAX(prism_value)",
  }[query.aggregate];
  const numerator = query.aggregate === "count" ? "COUNT(prism_count)" :
    ["sum", "average"].includes(query.aggregate) ? "SUM(prism_value)" : "NULL";
  const denominator = query.aggregate === "count" ? "COUNT(prism_count)" : "COUNT(prism_value)";
  const statistics = `${calculation}::DOUBLE AS value, COUNT(*) AS rows, ${numerator}::DOUBLE AS numerator, ${denominator} AS denominator, AVG(prism_size) AS size`;
  const cte = `WITH base AS (
    SELECT r AS prism_record, CAST(${key} AS VARCHAR) AS prism_key, CAST(${group} AS VARCHAR) AS prism_group,
           ${query.aggregate === "count" ? "NULL::DOUBLE" : value} AS prism_value, ${countValue} AS prism_count,
           ${size} AS prism_size
    FROM records r ${where}
  ), points AS (${query.chart === "histogram" ? `
    SELECT * REPLACE (CAST(CASE WHEN high = low THEN low ELSE
      ROUND(low + LEAST(11, FLOOR((prism_key::DOUBLE-low)/(high-low)*12))*(high-low)/12, 10)
      END AS VARCHAR) AS prism_key)
    FROM (SELECT *, MIN(prism_key::DOUBLE) OVER () AS low, MAX(prism_key::DOUBLE) OVER () AS high
          FROM base WHERE prism_key IS NOT NULL)` : "SELECT * FROM base WHERE prism_key IS NOT NULL"})`;
  const order = query.sort === "descending" ? "value DESC NULLS LAST, key, \"group\"" :
    (columns.get(query.x) === "number" || query.chart === "map" ? "key::DOUBLE" : "key") + ', "group"';
  const drill = selection ? " WHERE prism_key = ? AND COALESCE(prism_group,'') = ?" : "";
  const recordParams = selection ? [...params, selection.key, selection.group] : params;
  return {
    points: { sql: cte + ` SELECT prism_key AS key, COALESCE(prism_group,'') AS "group", ${statistics}
      FROM points${drill} GROUP BY 1,2 ORDER BY ${order} LIMIT 5001`, params: recordParams },
    summary: { sql: cte + ` SELECT '' AS key, '' AS "group", ${statistics} FROM points${drill}`, params: recordParams },
    records: { sql: cte + ` SELECT UNNEST(prism_record) FROM points${drill} ORDER BY prism_key, prism_group, CAST(prism_record AS VARCHAR) LIMIT 100`, params: recordParams },
  } satisfies Record<string, Compiled>;
}

export function describe(query: Query) {
  if (query.chart === "histogram") return "Count of records in 12 equal-width bins";
  if (query.aggregate === "count") return query.measure ? `Count of ${query.measure}` : "Count of records";
  return `${query.aggregate[0].toUpperCase() + query.aggregate.slice(1)} of ${query.measure}`;
}

export function datasetRevision(dataset: Dataset) {
  return JSON.stringify([dataset.digest, dataset.columns.map(column => [column.name, column.type])]);
}
