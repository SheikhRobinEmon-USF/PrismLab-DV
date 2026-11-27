"use client";

import { useState } from "react";
import type { EChartsOption } from "echarts";
import { Chart, category, chartColors, defaultGrid, line, scale, tip, yearMarker } from "./charts";
import { Export, Metrics, Panel, Picker, TimeControl, Toggle, format, signed } from "./parts";

type Economy = { id: string; name: string; region: string; values: Record<string, number | undefined> };
export type ConnectivityData = { rows: Economy[]; release: string };
const years = Array.from({ length: 25 }, (_, index) => String(2000 + index));
const percentage = (value: number | null | undefined) => value == null ? "—" : format(value) + "%";

export default function Connectivity({ data }: { data: ConnectivityData }) {
  const [year, setYear] = useState("2024");
  const [id, setId] = useState("IND");
  const [region, setRegion] = useState("");
  const [metric, setMetric] = useState("Adoption");
  const world = data.rows.find(area => area.id === "WLD")!;
  const places = data.rows.filter(area => area.id !== "WLD");
  const area = places.find(area => area.id === id)!;
  const regions = Array.from(new Set(places.map(item => item.region))).sort();
  const observation = area.values[year];
  const baseline = area.values[+year - 5];
  const global = world.values[year];
  const levels = metric === "Adoption";
  const comparable = places.flatMap(place => {
    if (region && place.region !== region) return [];
    const now = place.values[year];
    const before = place.values[+year - 5];
    if (now === undefined || (!levels && before === undefined)) return [];
    return [{ ...place, value: levels ? now : now - before! }];
  }).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const ranked = comparable.slice(0, 8);
  const axisMax = levels ? 100 : Math.max(1, ...ranked.map(item => Math.abs(item.value)));
  const trend: EChartsOption = {
    grid: defaultGrid, tooltip: { ...tip, trigger: "axis", valueFormatter: value => typeof value === "number" ? percentage(value) : "No observation" },
    xAxis: category(years, 4), yAxis: scale(value => value + "%", 0, 100),
    series: [
      { ...line(area.name, years.map(key => area.values[key] ?? null), chartColors[2]), markLine: yearMarker(year) },
      line("World", years.map(key => world.values[key] ?? null), chartColors[0]),
    ],
  };
  return <>
    <div className="case-controls">
      <Picker label="Economy" value={id} set={setId}>{places.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Picker>
      <TimeControl label="Year" values={years} value={year} set={setYear} />
      <Export filename={`internet-use-${area.id.toLowerCase()}`} rows={[["Year", area.name + " (%)", "World (%)"],
        ...years.map(key => [+key, area.values[key], world.values[key]])]} />
    </div>
    <Metrics items={[
      { label: area.name + " online", value: percentage(observation), note: year + " · share of population" },
      { label: "World online", value: percentage(global), note: "Published population-weighted aggregate" },
      { label: "Five-year change", value: observation == null || baseline == null ? "—" : signed(observation - baseline) + " pp", note: `${area.name} · ${+year - 5}–${year}` },
    ]} />
    <div className="case-panels connectivity-panels">
      <Panel title="The expansion of internet use" detail={area.name + " in violet · World in cyan"}>
        <Chart option={trend} label={`Internet use in ${area.name} compared with the world from 2000 to 2024`}
          chooseX={index => { if (years[index]) setYear(years[index]); }} />
        <p className="case-chart-note">{observation != null && global != null ? `${area.name} vs. the world in ${year} · ${signed(observation - global)} percentage points` : "No comparable observation for the selected year."}</p>
      </Panel>
      <Panel title="Rank economies" detail={`${comparable.length} comparable economies in ${year}`}
        controls={<Picker label="Region" value={region} set={setRegion}><option value="">All regions</option>
          {regions.map(item => <option key={item}>{item}</option>)}</Picker>}>
        <Toggle options={["Adoption", "5-year gain"]} label="Internet ranking measure" value={metric} choose={setMetric} />
        {ranked.length ? <ol className="case-rank" aria-label="Ranked economies">
          {ranked.map(item => <li key={item.id}><button type="button" aria-pressed={id === item.id} onClick={() => setId(item.id)}>
            <span>{item.name}</span><strong>{levels ? percentage(item.value) : signed(item.value) + " pp"}</strong>
            <i style={{ "--bar": Math.abs(item.value) / axisMax * 100 + "%" } as React.CSSProperties} aria-hidden />
          </button></li>)}
        </ol> : <p className="case-chart-note">No observations in this selection.</p>}
      </Panel>
    </div>
  </>;
}
