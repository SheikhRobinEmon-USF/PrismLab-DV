"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import { GeoComponent, GridComponent, LegendScrollComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { asset } from "./assets";
import type { Point, Query } from "./contracts";
import { download } from "./persistence";
import { describe, type Selection } from "./query";

echarts.use([BarChart, HeatmapChart, LineChart, ScatterChart, GeoComponent, GridComponent,
  LegendScrollComponent, TooltipComponent, VisualMapComponent, SVGRenderer]);
const palette = ["#126b62", "#c64730", "#425581", "#9a651e", "#6d4f8a", "#42768f"];
let registration: Promise<void> | undefined;
function loadMap() {
  registration ??= fetch(asset("land.geojson")).then(async response => {
    if (!response.ok) throw new Error("The map basemap could not be loaded.");
    echarts.registerMap("land", await response.json());
  }).catch(error => { registration = undefined; throw error; });
  return registration;
}

const label = (key: string) => /^\d{4}-\d{2}-\d{2} /.test(key) ? key.slice(0, 10) : key;
const magnitude = (size: number | null) => size === null ? 10 : Math.max(5, Math.min(28, Math.sqrt(Math.abs(size)) * 3));
type Datum = { value: (number | string | null)[]; prism: Selection };

function options(query: Query, points: Point[], selected?: Selection, dark = false): EChartsOption {
  const groups = [...new Set(points.map(point => point.group))];
  const keys = [...new Set(points.map(point => point.key))];
  const colors = dark ? ["#79d4c5", "#ff9174", "#b0bdf8", "#ebbd74", "#d7a9f4", "#a0d9f0"] : palette;
  const axisColor = dark ? "#b6c6c3" : "#4e625e";
  const common: EChartsOption = {
    color: colors, textStyle: { color: axisColor, fontFamily: "system-ui" }, animation: false,
    tooltip: { trigger: "item", renderMode: "richText", formatter: item => {
      const data = (!Array.isArray(item) ? item.data : undefined) as Datum | undefined;
      if (!data?.prism) return "";
      const value = data.value[query.chart === "map" || query.chart === "heatmap" ? 2 : 1];
      return [data.prism.key, data.prism.group, value == null ? "—" : String(value)].filter(Boolean).join("  ·  ")
        .replace(/[{}]/g, "");
    } },
  };
  const datum = (p: Point, value: Datum["value"]) => ({
    value, prism: { key: p.key, group: p.group },
    itemStyle: selected && selected.key === p.key && selected.group === p.group ? { color: dark ? "#ff9174" : "#c64730" } : undefined,
  });
  if (query.chart === "map") {
    return { ...common, geo: { map: "land", roam: true, itemStyle: { areaColor: dark ? "#354a46" : "#d5e1dc", borderColor: axisColor } },
      series: [{ type: "scatter", coordinateSystem: "geo", data: points.map(p => datum(p, [+p.key, +p.group, p.value, p.size])),
        symbolSize: value => magnitude(value[3]) }] };
  }
  const axis = { axisLabel: { color: axisColor }, axisLine: { lineStyle: { color: axisColor } } };
  const grid = { left: 65, top: groups.length > 1 ? 65 : 25, right: 22, bottom: 68 };
  if (query.chart === "heatmap") {
    const values = points.flatMap(point => point.value === null ? [] : [point.value]);
    const min = Math.min(0, ...values);
    return {
      ...common, grid, xAxis: { ...axis, type: "category", data: keys, axisLabel: { color: axisColor, formatter: label } },
      yAxis: { ...axis, type: "category", data: groups.map(group => group || "(missing)") },
      visualMap: { min, max: Math.max(min + 1, ...values), orient: "horizontal", bottom: 2,
        left: "center", textStyle: { color: axisColor }, inRange: { color: dark ? ["#355d58", "#a5efdf"] : ["#e8f2ed", "#126b62"] } },
      series: [{ type: "heatmap", data: points.map(p => datum(p, [keys.indexOf(p.key), groups.indexOf(p.group), p.value])) }],
    };
  }
  const scatter = query.chart === "scatter";
  const seriesType = query.chart === "histogram" ? "bar" : query.chart;
  return {
    ...common, grid, legend: groups.length > 1 ? { type: "scroll", textStyle: { color: axisColor } } : undefined,
    xAxis: scatter ? { ...axis, type: "value", name: query.x, scale: true } :
      { ...axis, type: "category", boundaryGap: seriesType === "bar", data: keys, axisLabel: { color: axisColor, formatter: label, hideOverlap: true } },
    yAxis: { ...axis, type: "value", name: query.unit, splitLine: { lineStyle: { color: dark ? "#364743" : "#dde6df" } } },
    series: groups.map(group => ({
      name: group || "(missing)", type: seriesType, showSymbol: true, symbolSize: (value: (number | null)[]) => magnitude(value[2]),
      data: points.filter(p => p.group === group).map(p => datum(p, [scatter ? +p.key : keys.indexOf(p.key), p.value, p.size])),
    })),
  };
}

export async function renderChartSvg(query: Query, points: Point[]) {
  if (query.chart === "map") await loadMap();
  const instance = echarts.init(null, undefined, { renderer: "svg", ssr: true, width: 780, height: 360 });
  try {
    instance.setOption(options(query, points));
    return instance.renderToSVGString();
  } finally { instance.dispose(); }
}

export default function Chart({ query, points, chosen, onChoose, dark, downloadEnabled = false }: {
  query: Query; points: Point[]; chosen?: Selection; onChoose?: (selection: Selection) => void; dark: boolean; downloadEnabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.EChartsType | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const instance = echarts.init(host.current, undefined, { renderer: "svg" });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);
    return () => { observer.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => {
    let valid = true;
    const instance = chart.current;
    const update = async () => {
      if (query.chart === "map") await loadMap();
      if (valid) { instance?.setOption(options(query, points, chosen, dark), true); setReady(true); setError(""); }
    };
    void update().catch(reason => { if (valid) { setError(String(reason)); setReady(false); } });
    return () => { valid = false; };
  }, [query, points, chosen, dark]);
  useEffect(() => {
    const instance = chart.current;
    const click = (event: { data?: unknown }) => {
      const datum = event.data as Datum | undefined;
      if (datum?.prism) onChoose?.(datum.prism);
    };
    instance?.on("click", click);
    return () => { instance?.off("click", click); };
  }, [onChoose]);
  function saveSvg() {
    if (!chart.current) return;
    download("prismlab-chart.svg", chart.current.renderToSVGString(), "image/svg+xml");
  }
  function savePng() {
    const instance = chart.current;
    if (!instance) return;
    const url = URL.createObjectURL(new Blob([instance.renderToSVGString()], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = instance.getWidth() * 2;
      canvas.height = instance.getHeight() * 2;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = dark ? "#172321" : "#fffdf8";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => { if (blob) download("prismlab-chart.png", blob, "image/png"); }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setError("The chart could not be rasterized."); };
    image.src = url;
  }
  return <figure className="chart">
    <div role="img" aria-label={describe(query) + " chart with " + points.length + " plotted groups."}>
      <div ref={host} aria-hidden="true" className="chart-canvas" />
    </div>
    {error && <p role="alert">{error}</p>}
    {downloadEnabled && <figcaption className="button-row"><button onClick={savePng} disabled={!ready}>Download PNG</button><button onClick={saveSvg} disabled={!ready}>Download SVG</button></figcaption>}
  </figure>;
}
