"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { Chart, category, chartColors, defaultGrid, escaped, line, loadWorldMap, scale, tip, yearMarker } from "./charts";
import { Export, Metrics, Panel, Picker, Toggle, format } from "./parts";

type Event = [id: string, date: string, magnitude: number, depth: number | null, longitude: number, latitude: number, place: string];
export type SeismicData = { rows: Event[] };
const years = Array.from({ length: 26 }, (_, index) => String(2000 + index));
const colorFor = (magnitude: number) => magnitude >= 8 ? "#ff9b72" : magnitude >= 7 ? "#f7c677" : "#87dbde";
const sizeFor = (magnitude: number) => magnitude >= 8 ? 13 : magnitude >= 7 ? 8 : 4;

export default function Seismic({ data }: { data: SeismicData }) {
  const [year, setYear] = useState("");
  const [minimum, setMinimum] = useState("6.0");
  const [eventId, setEventId] = useState("");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    void loadWorldMap().then(() => { if (active) setMapStatus("ready"); }, () => { if (active) setMapStatus("error"); });
    return () => { active = false; };
  }, []);
  const threshold = useMemo(() => data.rows.filter(row => row[2] >= +minimum), [data.rows, minimum]);
  const filtered = useMemo(() => threshold.filter(row => !year || row[1].startsWith(year)), [threshold, year]);
  const ranked = useMemo(() => [...filtered].sort((a, b) => b[2] - a[2] || a[1].localeCompare(b[1])), [filtered]);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const row of threshold) {
      const year = row[1].slice(0, 4);
      result.set(year, (result.get(year) ?? 0) + 1);
    }
    return years.map(year => result.get(year) ?? 0);
  }, [threshold]);
  const select = ranked.find(row => row[0] === eventId) ?? ranked[0];
  const depth = [
    { name: "Shallow <70 km", count: filtered.filter(row => row[3] != null && row[3] < 70).length, color: chartColors[0] },
    { name: "70–<300 km", count: filtered.filter(row => row[3] != null && row[3] >= 70 && row[3] < 300).length, color: chartColors[2] },
    { name: "Deep ≥300 km", count: filtered.filter(row => row[3] != null && row[3] >= 300).length, color: chartColors[1] },
  ];
  const unknown = filtered.filter(row => row[3] === null).length;
  const map: EChartsOption = {
    geo: { map: "case-world", top: 12, bottom: 12, left: "4%", right: "4%",
      roam: false, itemStyle: { areaColor: "#263a4b", borderColor: "#506274", borderWidth: .6 },
      emphasis: { disabled: true }, silent: true },
    tooltip: { ...tip, trigger: "item", formatter: item => {
      if (Array.isArray(item)) return "";
      const row = filtered[item.dataIndex];
      return row ? escaped(row[6]) + "<br>" + row[1] + " · M" + row[2].toFixed(1) : "";
    } },
    series: [{ type: "scatter", coordinateSystem: "geo", data: filtered.map(row => ({
      name: row[0], value: [row[4], row[5], row[2]],
      symbolSize: row[0] === select?.[0] ? sizeFor(row[2]) + 6 : sizeFor(row[2]),
      itemStyle: { color: colorFor(row[2]), opacity: row[0] === select?.[0] ? 1 : .64,
        borderColor: row[0] === select?.[0] ? "#f7fbfc" : "transparent", borderWidth: 1.2 },
    })) }],
  };
  const timeline: EChartsOption = {
    grid: defaultGrid, tooltip: { ...tip, trigger: "axis" },
    xAxis: category(years, 4), yAxis: scale(value => format(value, 0), 0),
    series: [
      { ...line("Catalog events", counts, chartColors[0]), markLine: year ? yearMarker(year) : { data: [] } },
      { type: "bar", data: counts.map((value, index) => ({ value, itemStyle: { color: years[index] === year ? chartColors[1] : "#3e7288" } })) },
    ],
  };
  const depthChart: EChartsOption = {
    grid: { top: 22, right: 28, left: 112, bottom: 33 },
    xAxis: scale(value => format(value, 0), 0),
    yAxis: { ...category(depth.map(item => item.name)), inverse: true, axisLabel: { color: "#a8bacf", margin: 6, fontSize: 11 } },
    tooltip: { ...tip, trigger: "item" },
    series: [{ type: "bar", barMaxWidth: 22, data: depth.map(item => ({ value: item.count, itemStyle: { color: item.color } })) }],
  };
  const setFilterYear = (year: string) => { setYear(year); setEventId(""); };
  return <>
    <div className="case-controls">
      <Picker label="Year" value={year} set={setFilterYear}><option value="">All years</option>{[...years].reverse().map(item => <option key={item}>{item}</option>)}</Picker>
      <fieldset className="case-minimum"><legend>Minimum magnitude</legend>
        <Toggle options={["6.0", "6.5", "7.0", "8.0"]} label="Minimum magnitude" value={minimum} choose={value => { setMinimum(value); setEventId(""); }} />
      </fieldset>
      <Export filename="usgs-earthquakes" rows={[["Event ID", "UTC date", "Magnitude", "Depth (km)", "Longitude", "Latitude", "Place"], ...filtered]} />
    </div>
    <Metrics items={[
      { label: "Catalog events", value: format(filtered.length, 0), note: (year || "2000–2025") + " · magnitude ≥" + minimum },
      { label: "Magnitude 7.0 or above", value: format(filtered.filter(row => row[2] >= 7).length, 0), note: "In the current selection" },
      { label: "Shallow events", value: format(depth[0].count, 0), note: "Depth under 70 km" },
    ]} />
    <div className="case-panels">
      <Panel wide title="Where the ground moved" detail="Select a map mark or an event from the list">
        {mapStatus === "ready" ? <Chart option={map} label="World map of filtered earthquake epicenters" className="map"
          choose={hit => { if (filtered[hit.dataIndex]) setEventId(filtered[hit.dataIndex][0]); }} /> :
          <p className="case-chart-note" role="status">{mapStatus === "loading" ? "Loading map…" : "Map unavailable. Use the event list below."}</p>}
        <div className="case-chart-values case-map-legend" aria-label="Map magnitude bands">
          {[{ from: 6, label: "M6 to <7" }, { from: 7, label: "M7 to <8" }, { from: 8, label: "M8 and above" }].map(item =>
            <span key={item.from}><i style={{ background: colorFor(item.from) }} aria-hidden />{item.label}</span>)}
        </div>
        {select ? <div className="case-event">
          <Picker label="Event" value={select[0]} set={setEventId}>{ranked.slice(0, 100).map(row =>
            <option key={row[0]} value={row[0]}>{row[1]} · M{row[2].toFixed(1)} · {row[6]}</option>)}
            {!ranked.slice(0, 100).includes(select) && <option value={select[0]}>{select[1]} · M{select[2].toFixed(1)} · {select[6]}</option>}
          </Picker>
          <span><strong>M{select[2].toFixed(1)}</strong> · {select[3] == null ? "Depth unavailable" : format(select[3], 1) + " km deep"}</span>
          <a href={`https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(select[0])}/executive`} target="_blank" rel="noreferrer">USGS event record</a>
        </div> : <p className="case-chart-note">No events meet this magnitude and year filter.</p>}
      </Panel>
      <Panel title="How much counts vary by year" detail={`Magnitude ≥${minimum} · select a year to filter the map`}>
        <Chart option={timeline} label="Earthquake catalog events grouped by calendar year for the selected minimum magnitude"
          chooseX={index => { if (years[index]) setFilterYear(years[index]); }} />
        <p className="case-chart-note">{year ? `${counts[+year - 2000]} qualifying events in ${year}` : `${format(threshold.length, 0)} events across 26 calendar years`}</p>
      </Panel>
      <Panel title="How deep were the events?" detail={(year || "2000–2025") + " · catalog depth bands"}>
        <Chart option={depthChart} label="Selected earthquakes in shallow, intermediate and deep bands" className="short" />
        <div className="case-chart-values">{depth.map(item => <span key={item.name}>{item.name} <strong>{format(item.count, 0)}</strong></span>)}</div>
        {unknown > 0 && <p className="case-chart-note">{unknown} events have no recorded depth.</p>}
      </Panel>
    </div>
  </>;
}
