"use client";

import { useState } from "react";
import { aggregates, chartTypes, type Filter, type Row } from "./contracts";
import { useWorkspace } from "./workspace";

export const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
export const number = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" :
  Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(value);

export function Table({ rows, label, columns }: { rows: Row[]; label: string; columns?: string[] }) {
  const keys = columns ?? Object.keys(rows[0] ?? {});
  if (!rows.length) return <p className="muted">No matching records.</p>;
  return <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
    <table><thead><tr>{keys.map(key => <th key={key} scope="col">{key}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{keys.map(key => <td key={key}>{row[key] ?? "—"}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function FieldShelf() {
  const { project, changeQuery } = useWorkspace();
  if (!project) return null;
  const { dataset, query } = project;
  const numerics = dataset.columns.filter(column => column.type === "number");
  const options = dataset.columns.map(({ name }) => <option key={name}>{name}</option>);
  const numericOptions = numerics.map(({ name }) => <option key={name}>{name}</option>);
  return <div className="fields">
    <label>Chart type<select value={query.chart} onChange={event => {
      const chart = event.target.value as typeof query.chart;
      const x = ["scatter", "histogram"].includes(chart) && !numerics.some(column => column.name === query.x)
        ? numerics[0]?.name ?? query.x : query.x;
      const group = chart === "heatmap" && !query.group ? dataset.columns.find(column => column.type === "text")?.name ?? "" : query.group;
      changeQuery(chart === "histogram" ? { chart, x, group, measure: "", aggregate: "count" } : { chart, x, group });
    }}>{chartTypes.map(chart => <option value={chart} key={chart}>{titleCase(chart)}</option>)}</select></label>
    <label>X field<select value={query.x} onChange={event => changeQuery({ x: event.target.value })}>{options}</select></label>
    <label>Measure<select disabled={query.chart === "histogram"} value={query.measure} onChange={event => changeQuery({
      measure: event.target.value, aggregate: !event.target.value ? "count" : query.aggregate,
    })}><option value="">Rows</option>{numericOptions}</select></label>
    <label>Aggregation<select disabled={query.chart === "histogram"} value={query.aggregate} onChange={event => changeQuery({
      aggregate: event.target.value as typeof query.aggregate,
      measure: event.target.value === "count" ? query.measure : query.measure || numerics[0]?.name || "",
    })}>{aggregates.map(aggregate => <option value={aggregate} key={aggregate}>{titleCase(aggregate)}</option>)}</select></label>
    <label>Group and color<select value={query.group} onChange={event => changeQuery({ group: event.target.value })}>
      <option value="">None</option>{options}
    </select></label>
    <label>Size<select value={query.size} onChange={event => changeQuery({ size: event.target.value })}>
      <option value="">Uniform</option>{numericOptions}
    </select></label>
    <label>Unit<input value={query.unit} onChange={event => changeQuery({ unit: event.target.value })} placeholder="e.g. USD" /></label>
    <label>Order<select value={query.sort} onChange={event => changeQuery({ sort: event.target.value as typeof query.sort })}>
      <option value="key">X field</option><option value="descending">Value, high to low</option>
    </select></label>
    <label>Time grain<select value={query.grain} onChange={event => changeQuery({ grain: event.target.value as typeof query.grain })}>
      <option value="raw">Source timestamp</option><option value="day">Day</option><option value="month">Month</option><option value="year">Year</option>
    </select></label>
    <label>Timezone<select value={query.timezone} onChange={event => changeQuery({ timezone: event.target.value })}>
      {Array.from(new Set([query.timezone, "UTC", ...Intl.supportedValuesOf("timeZone")])).map(zone => <option key={zone}>{zone}</option>)}
    </select></label>
    <label>Missing measures<select value={query.missing} onChange={event => changeQuery({ missing: event.target.value as typeof query.missing })}>
      <option value="exclude">Exclude</option><option value="zero">Treat as zero</option>
    </select></label>
  </div>;
}

export function FilterBar({ datasetKey }: { datasetKey: string }) {
  return <FilterControls key={datasetKey} />;
}
function FilterControls() {
  const { project, changeQuery } = useWorkspace();
  const [field, setField] = useState(project?.dataset.columns[0].name ?? "");
  const [kind, setKind] = useState<Filter["kind"]>("equals");
  const [value, setValue] = useState("");
  const [end, setEnd] = useState("");
  if (!project) return null;
  const { query, dataset } = project;
  return <div className="filter-bar">
    <form className="filter-form" onSubmit={event => {
      event.preventDefault();
      changeQuery({ filters: [...query.filters, { field, kind, value, end: kind === "range" ? end : undefined }] });
      setValue(""); setEnd("");
    }}>
      <label>Filter field<select value={field} onChange={event => setField(event.target.value)}>
        {dataset.columns.map(column => <option key={column.name}>{column.name}</option>)}
      </select></label>
      <label>Condition<select value={kind} onChange={event => setKind(event.target.value as Filter["kind"])}>
        <option value="equals">Equals</option><option value="range">Between (inclusive)</option>
      </select></label>
      <label>{kind === "range" ? "Start" : "Value"}<input required value={value} onChange={event => setValue(event.target.value)} /></label>
      {kind === "range" && <label>End<input required value={end} onChange={event => setEnd(event.target.value)} /></label>}
      <button type="submit">Add filter</button>
    </form>
    {query.filters.length > 0 && <ul aria-label="Active filters" className="filters">
      {query.filters.map((filter, index) => <li key={index}>
        <button onClick={() => changeQuery({ filters: query.filters.filter((_, i) => i !== index) })}
          aria-label={`Remove filter ${filter.field} ${filter.value}`}>{filter.field} {filter.kind !== "equals" ? `${filter.value} to ${filter.end}` : `= ${filter.value}`} <span aria-hidden="true">×</span></button>
      </li>)}
    </ul>}
  </div>;
}

export function TimeBrush() {
  const { project, result, changeQuery } = useWorkspace();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  if (!project || !result || project.query.chart === "map" ||
    project.dataset.columns.find(c => c.name === project.query.x)?.type !== "date") return null;
  const dates = [...new Set(result.points.map(point => point.key.slice(0, 10)))].sort();
  if (dates.length < 2) return null;
  const low = Math.max(0, dates.indexOf(start));
  const high = dates.includes(end) ? dates.indexOf(end) : dates.length - 1;
  return <form className="time-brush" onSubmit={event => {
    event.preventDefault();
    const after = new Date(dates[high] + "T00:00:00Z");
    if (project.query.grain === "month") after.setUTCMonth(after.getUTCMonth() + 1);
    else if (project.query.grain === "year") after.setUTCFullYear(after.getUTCFullYear() + 1);
    else after.setUTCDate(after.getUTCDate() + 1);
    const suffix = project.query.grain === "raw" ? "T00:00:00Z" : "";
    changeQuery({ filters: [...project.query.filters,
      { field: project.query.x, kind: "window", value: dates[low] + suffix, end: after.toISOString().slice(0, 10) + suffix }] });
  }}>
    <label>Window start <span>{dates[low]}</span><input aria-label="Window start" type="range" min={0} max={high} value={low}
      aria-valuetext={dates[low]} onChange={event => setStart(dates[+event.target.value])} /></label>
    <label>Window end <span>{dates[high]}</span><input aria-label="Window end" type="range" min={low} max={dates.length - 1} value={high}
      aria-valuetext={dates[high]} onChange={event => setEnd(dates[+event.target.value])} /></label>
    <button type="submit">Apply time window</button>
  </form>;
}
