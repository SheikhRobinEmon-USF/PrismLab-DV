"use client";

import { useState } from "react";
import type { EChartsOption } from "echarts";
import { Chart, category, chartColors, defaultGrid, ink, line, scale, tip, yearMarker } from "./charts";
import { Export, Metrics, Panel, TimeControl, Toggle, mean, signed } from "./parts";

export type TemperatureData = { rows: [number, number, ...(number | null)[]][] };
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const chartFormat = (value: number) => signed(value, 2) + "°C";
const cold = "#79a9f1";
const hot = "#ff9b73";
const monthlyColor = (value: number) => value < 0 ? cold : hot;

export default function Temperature({ data }: { data: TemperatureData }) {
  const rows = data.rows;
  const [year, setYear] = useState(String(rows.at(-1)![0]));
  const [range, setRange] = useState("All years");
  const [month, setMonth] = useState("Jan");
  const rangeRows = range === "All years" ? rows : rows.filter(row => row[0] >= 1970);
  const focus = rows.findIndex(row => String(row[0]) === year);
  const selected = rows[focus];
  const decades = rows.map((_, index) => index < 9 ? null : mean(rows.slice(index - 9, index + 1).map(entry => entry[1])));
  const peak = rows.reduce((a, b) => a[1] >= b[1] ? a : b);
  const calendarStart = Math.min(rows.at(-1)![0] - 15, Math.max(rangeRows[0][0], Math.floor(+year / 10) * 10 - 3));
  const recent = rangeRows.filter(row => row[0] >= calendarStart).slice(0, 16);
  const trend: EChartsOption = {
    grid: defaultGrid, tooltip: { ...tip, trigger: "axis", valueFormatter: value => typeof value === "number" ? chartFormat(value) : "Unavailable" },
    xAxis: category(rangeRows.map(row => String(row[0])), range === "All years" ? 19 : 9),
    yAxis: scale(value => value + "°", -.6, 1.4),
    series: [
      { ...line("Annual anomaly", rangeRows.map(row => row[1]), hot), markLine: yearMarker(year) },
      line("Trailing 10-year mean", decades.slice(rows.length - rangeRows.length), chartColors[0]),
    ],
  };
  const calendar: EChartsOption = {
    grid: { top: 12, left: 59, right: 18, bottom: 62 },
    xAxis: category(months), yAxis: { ...category(recent.map(row => String(row[0])), 1), inverse: true },
    tooltip: { ...tip, formatter: raw => {
      if (Array.isArray(raw) || !Array.isArray(raw.value)) return "";
      const [x, y, value] = raw.value as number[];
      return months[x] + " " + recent[y][0] + " · " + chartFormat(value);
    } },
    visualMap: { min: -1.6, max: 1.6, orient: "horizontal", bottom: 2, left: "center", itemWidth: 9, itemHeight: 120,
      text: ["+1.6°C", "−1.6°C"], textStyle: { color: ink }, inRange: { color: ["#497bc7", "#273b55", "#f1aa78", "#d84843"] } },
    series: [{ type: "heatmap", data: recent.flatMap((row, y) => row.slice(2).flatMap((value, x) => value == null ? [] : [[x, y, value]])),
      emphasis: { itemStyle: { borderColor: "white", borderWidth: 2 } } }],
  };
  const monthly: EChartsOption = {
    grid: defaultGrid, tooltip: { ...tip, trigger: "axis", valueFormatter: value => typeof value === "number" ? chartFormat(value) : "Unavailable" },
    xAxis: category(months), yAxis: scale(value => value + "°", -.6, 1.6),
    series: [{ type: "bar", name: year, data: selected.slice(2).map(value => ({
      value, itemStyle: { color: value == null ? cold : monthlyColor(value) },
    })) }],
  };
  return <>
    <div className="case-controls">
      <TimeControl label="Year" values={rangeRows.map(row => String(row[0]))} value={year} set={setYear} />
      <Export filename="nasa-gistemp-anomalies" rows={[["Year", "Annual anomaly (°C)", ...months], ...rangeRows]} />
    </div>
    <Metrics items={[
      { label: "Annual anomaly", value: chartFormat(selected[1]), note: year + " vs. 1951–1980" },
      { label: "Trailing 10-year mean", value: decades[focus] == null ? "—" : chartFormat(decades[focus]!), note: "Through " + year },
      { label: "Warmest year in this release", value: chartFormat(peak[1]), note: String(peak[0]) + " · all years" },
    ]} />
    <div className="case-panels">
      <Panel wide title="A warming trend through time" detail="Annual anomalies in orange · trailing 10-year mean in blue"
        controls={<Toggle options={["All years", "Since 1970"]} label="Temperature date range" value={range} choose={value => {
          setRange(value); if (value !== "All years" && +year < 1970) setYear("1970");
        }} />}>
        <Chart option={trend} label="Annual global temperature anomalies and a trailing ten-year mean" chooseX={index => {
          if (rangeRows[index]) setYear(String(rangeRows[index][0]));
        }} />
      </Panel>
      <Panel title="Heat across the calendar" detail="Select a cell to inspect that month and year">
        <Chart option={calendar} label="Heatmap of monthly temperature anomalies by year" choose={hit => {
          if (Array.isArray(hit.value)) {
            const [x, y] = hit.value as number[];
            setYear(String(recent[y][0]));
            setMonth(months[x]);
          }
        }} />
      </Panel>
      <Panel title={`The months of ${year}`} detail="Choose a bar or use the month selector"
        controls={<label className="case-picker">Month<select value={month} onChange={event => setMonth(event.target.value)}>{months.map(item => <option key={item}>{item}</option>)}</select></label>}>
        <Chart option={monthly} label={`Monthly temperature anomalies in ${year}`} choose={hit => setMonth(hit.name)} />
        <p className="case-chart-note">{month} {year} · {selected[2 + months.indexOf(month)] == null ? "Unavailable" : chartFormat(selected[2 + months.indexOf(month)]!)}</p>
      </Panel>
    </div>
  </>;
}
