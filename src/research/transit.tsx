"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { Chart, category, chartColors, defaultGrid, ink, line, scale, tip, yearMarker } from "./charts";
import { Export, Metrics, Panel, Picker, TimeControl, Toggle, format, mean } from "./parts";

type Day = [date: string, weekend: boolean, modes: [count: number | null, ratio: number | null][]];
export type TransitData = { rows: Day[]; modes: [id: string, label: string][] };
const percent = (ratio: number | null) => ratio == null ? null : ratio * 100;
const share = (value: number | null) => value == null ? "—" : format(value, 0) + "%";
const monthName = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01T00:00:00Z"));

export default function Transit({ data }: { data: TransitData }) {
  const [month, setMonth] = useState("2024-12");
  const [mode, setMode] = useState("subway");
  const [metric, setMetric] = useState("Recovery");
  const observed = useMemo(() => {
    const grouped = new Map<string, Day[]>();
    for (const day of data.rows) {
      const month = day[0].slice(0, 7);
      const days = grouped.get(month) ?? [];
      days.push(day);
      grouped.set(month, days);
    }
    return [...grouped].map(([month, days]) => ({ month, modes: data.modes.map(([, label], index) => {
      const counts = days.map(day => day[2][index][0]);
      return { label, count: mean(counts), share: percent(mean(days.map(day => day[2][index][1]))),
        weekday: mean(days.filter(day => !day[1]).map(day => day[2][index][0])),
        weekend: mean(days.filter(day => day[1]).map(day => day[2][index][0])), };
    }) }));
  }, [data]);
  const months = observed.map(entry => entry.month);
  const modeIndex = data.modes.findIndex(entry => entry[0] === mode);
  const selected = observed.find(entry => entry.month === month)!;
  const detail = selected.modes[modeIndex];
  const recovery = metric === "Recovery";
  const series = recovery ? data.modes.map(([, label], index) =>
    ({ ...line(label, observed.map(entry => entry.modes[index].share), chartColors[index]),
      lineStyle: { color: chartColors[index], width: index === modeIndex ? 3.3 : 1.8, opacity: index === modeIndex ? 1 : .55 } })) :
    [line(detail.label, observed.map(entry => entry.modes[modeIndex].count), chartColors[modeIndex])];
  const chart: EChartsOption = {
    grid: { ...defaultGrid, left: recovery ? 54 : 74 },
    tooltip: { ...tip, trigger: "axis", valueFormatter: value => typeof value === "number" ?
      recovery ? share(value) : format(value, 0) : "Missing" },
    xAxis: category(months, 8), yAxis: scale(value => recovery ? value + "%" : format(value, 0), 0),
    series: series.map((item, index) => index === 0 ? { ...item, markLine: {
      ...yearMarker(month), data: [{ xAxis: month }, ...(recovery ? [{ yAxis: 100 }] : [])],
    } } : item),
  };
  const weekendChart: EChartsOption = {
    grid: { ...defaultGrid, left: 80 }, xAxis: category(["Weekdays", "Weekends"]), yAxis: scale(value => format(value, 0), 0),
    tooltip: { ...tip, trigger: "axis", valueFormatter: value => typeof value === "number" ? format(value, 0) : "Missing" },
    series: [{ type: "bar", barMaxWidth: 67, data: [detail.weekday, detail.weekend].map((value, index) => ({
      value, itemStyle: { color: index === 0 ? chartColors[modeIndex] : "#7e95ae" },
    })) }],
  };
  const ranked = selected.modes.map((entry, index) => ({ ...entry, id: data.modes[index][0], color: chartColors[index] }))
    .sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
  const max = Math.max(100, ...ranked.map(item => item.share ?? 0));
  return <>
    <div className="case-controls">
      <Picker label="Mode" value={mode} set={setMode}>{data.modes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Picker>
      <TimeControl label="Month" values={months} value={month} set={setMonth} />
      <Export filename={`mta-${mode}-${month}`} rows={[["Date", "Mode", "Estimated ridership or vehicle crossings", "Comparable pre-pandemic day ratio"],
        ...data.rows.filter(day => day[0].startsWith(month)).map(day => [day[0], detail.label, ...day[2][modeIndex]])]} />
    </div>
    <Metrics items={[
      { label: "Recovery level", value: share(detail.share), note: detail.label + " · " + monthName(month) },
      { label: "Estimated daily volume", value: format(detail.count, 0), note: mode === "bridges" ? "Mean vehicle crossings" : "Mean estimated ridership" },
      { label: "Weekend daily volume", value: format(detail.weekend, 0), note: "Saturday and Sunday mean" },
    ]} />
    <div className="case-panels">
      <Panel wide title="The recovery trajectories" detail={recovery ? "Mean daily percentage of a comparable pre-pandemic day" : detail.label + " · mean estimated daily volume"}
        controls={<Toggle options={["Recovery", "Daily volume"]} label="Transit chart measure" value={metric} choose={setMetric} />}>
        {recovery && <div className="case-legend" aria-label="Transit modes">{data.modes.map(([id, label], index) =>
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}><i style={{ background: chartColors[index] }} aria-hidden />{label}</button>)}</div>}
        <Chart option={chart} label={recovery ? "Monthly recovery patterns for five MTA modes" : detail.label + " monthly daily volume"}
          chooseX={index => { if (months[index]) setMonth(months[index]); }} />
        <p className="case-chart-note">{recovery ? "The 100% line indicates the comparable pre-pandemic level. Early-2020 bus estimates warrant extra caution." : "Ridership and vehicle crossings are different measures. Only the selected mode is plotted."}</p>
      </Panel>
      <Panel title="Recovery by mode" detail={monthName(month) + " · comparable pre-pandemic day"}>
        <ol className="case-rank" aria-label="Transit modes by recovery">{ranked.map(item => <li key={item.id}>
          <button type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
            <span>{item.label}</span><strong>{share(item.share)}</strong>
            <i style={{ "--bar": (item.share ?? 0) / max * 100 + "%", "--bar-color": item.color } as React.CSSProperties} aria-hidden />
          </button>
        </li>)}</ol>
      </Panel>
      <Panel title="Weekday vs. weekend" detail={detail.label + " · " + monthName(month)}>
        <Chart option={weekendChart} label={detail.label + " mean daily volume by weekday or weekend"} className="short" />
        <div className="case-chart-values" style={{ color: ink }}>Weekdays <strong>{format(detail.weekday, 0)}</strong> · Weekends <strong>{format(detail.weekend, 0)}</strong></div>
      </Panel>
    </div>
  </>;
}
