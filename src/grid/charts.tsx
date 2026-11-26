"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, MapChart, PieChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, MarkPointComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { asset } from "../assets";
import { firstYear, getMix, number, percent, recentYear, whole, years, type Area, type Row, type Unit } from "./data";

echarts.use([LineChart, MapChart, PieChart, GridComponent, MarkLineComponent, MarkPointComponent,
  TooltipComponent, VisualMapComponent, CanvasRenderer]);

export const cleanColor = "#d4f475";
export const fossilColor = "#f4a67b";
const text = "#a3b4c7";
const border = "#26384a";

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduce(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduce;
}

type Hit = { name: string; value?: unknown; componentType?: string };
function Surface({ option, label, onPick, onPlotPick, className }: {
  option: EChartsOption | null; label: string; onPick?: (hit: Hit) => void; onPlotPick?: (index: number) => void; className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.EChartsType | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!root.current) return;
    const instance = echarts.init(root.current, undefined, { renderer: "canvas" });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(root.current);
    chart.current = instance;
    return () => { observer.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => {
    if (option) chart.current?.setOption({ ...option, animation: !reduce });
  }, [option, reduce]);
  useEffect(() => {
    const instance = chart.current;
    if (!instance || !onPick) return;
    instance.on("click", onPick);
    return () => { instance.off("click", onPick); };
  }, [onPick]);
  useEffect(() => {
    const instance = chart.current;
    if (!instance || !onPlotPick) return;
    const renderer = instance.getZr();
    const pick = (event: { offsetX: number; offsetY: number }) => {
      const point = [event.offsetX, event.offsetY];
      if (!instance.containPixel({ gridIndex: 0 }, point)) return;
      const index = instance.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
      if (typeof index === "number" && Number.isInteger(index)) onPlotPick(index);
    };
    renderer.on("click", pick);
    return () => { renderer.off("click", pick); };
  }, [onPlotPick]);
  return <div className={className} role="img" aria-label={label}><div ref={root} aria-hidden="true" /></div>;
}

const tooltip = {
  backgroundColor: "#101e2d", borderColor: "#3b4f62", textStyle: { color: "#edf3f9", fontSize: 12 },
  appendToBody: false, confine: true,
};
const safe = (value: string) => value.replace(/[&<>"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
})[character] ?? "");

export function Timeline({ area, row, year, unit, enabled, choose }: {
  area: Area; row?: Row; year: number; unit: Unit; enabled: string[]; choose: (year: number) => void;
}) {
  const option = useMemo<EChartsOption>(() => {
    const series = [
      { id: "clean", name: "Clean", index: 2, color: cleanColor },
      { id: "fossil", name: "Fossil", index: 3, color: fossilColor },
    ] as const;
    const values = new Map(area.rows.map(entry => [entry[0], entry]));
    const getValue = (entry: Row, index: 2 | 3) => unit === "share" ? percent(entry[index], entry[1]) : entry[index];
    return {
      textStyle: { fontFamily: "system-ui, sans-serif" },
      animationDuration: 700, animationDurationUpdate: 320,
      grid: { left: unit === "share" ? 49 : 65, right: 18, top: 25, bottom: 30 },
      tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: "#7890a5", type: "dashed" } },
        valueFormatter: value => typeof value === "number" ? number(value, unit === "share" ? 1 : 0) + (unit === "share" ? "%" : " TWh") : "No observation" },
      xAxis: { type: "category", data: years.map(String), boundaryGap: false,
        axisLabel: { color: text, interval: 4, hideOverlap: true, fontSize: 11, margin: 13 },
        axisLine: { lineStyle: { color: border } }, axisTick: { show: false }, triggerEvent: true },
      yAxis: { type: "value", min: 0, max: unit === "share" ? 100 : undefined, interval: unit === "share" ? 25 : undefined,
        splitNumber: 4, axisLabel: { color: text, fontSize: 11, formatter: unit === "share" ? "{value}%" : value => whole(value) },
        splitLine: { lineStyle: { color: border, type: "dashed" } } },
      series: series.map((item, index) => ({
        id: item.id, name: item.name, type: "line", connectNulls: false, smooth: 0.19,
        showSymbol: false, symbol: "circle", symbolSize: 7, color: item.color,
        lineStyle: { width: item.id === "clean" ? 3 : 2.4, color: item.color },
        data: years.map(time => {
          const entry = values.get(time);
          return entry && enabled.includes(item.id) ? getValue(entry, item.index) : null;
        }),
        areaStyle: item.id === "clean" ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(212,244,117,.23)" }, { offset: 1, color: "rgba(212,244,117,0)" },
        ]) } : undefined,
        markLine: index === 0 ? { silent: true, symbol: "none", label: { show: false },
          lineStyle: { color: "#71889b", type: "dashed", opacity: .75 }, data: [{ xAxis: String(year) }] } : undefined,
        markPoint: { silent: true, symbol: "circle", symbolSize: 12, label: { show: false },
          itemStyle: { color: item.color, borderColor: "#111d2a", borderWidth: 2.5 },
          data: row && enabled.includes(item.id) ? [{ name: String(year), coord: [String(year), getValue(row, item.index)] }] : [] },
      })),
    };
  }, [area, row, year, unit, enabled]);
  const label = `${area.name} electricity generation from ${firstYear} to ${recentYear}. ${row
    ? `${year} clean ${number(percent(row[2], row[1]))} percent, fossil ${number(percent(row[3], row[1]))} percent.` : `No published value for ${year}.`}`;
  return <Surface option={option} label={label} className="grid-timeline"
    onPlotPick={index => { if (years[index] !== undefined) choose(years[index]); }}
    onPick={hit => { const year = String(hit.name || hit.value); if (/^\d{4}$/.test(year)) choose(+year); }} />;
}

export function MixChart({ row, fuel, choose }: {
  row: Row; fuel: string | null; choose: (fuel: string) => void;
}) {
  const mix = useMemo(() => getMix(row), [row]);
  const option = useMemo<EChartsOption>(() => ({
    tooltip: { ...tooltip, trigger: "item", formatter: item => {
      if (Array.isArray(item) || typeof item.value !== "number") return "";
      return `${safe(item.name)} · ${number(item.value)} TWh · ${number(percent(item.value, row[1]))}%`;
    } },
    animationDuration: 650, animationDurationUpdate: 360,
    series: [{ type: "pie", radius: ["73%", "94%"], center: ["50%", "50%"], startAngle: 90, minShowLabelAngle: 360,
      label: { show: false }, labelLine: { show: false }, emphasis: { scaleSize: 5 },
      itemStyle: { borderRadius: 3, borderColor: "#111d2a", borderWidth: 3 },
      data: mix.filter(item => item.value != null && item.value > 0).map(item => ({
        value: item.value!, name: item.name, itemStyle: { color: item.color, opacity: fuel && item.name !== fuel ? .33 : 1 },
      })),
    }],
  }), [mix, fuel, row]);
  return <Surface option={option} label="Donut chart of electricity generation by source. Values are listed below."
    className="grid-donut" onPick={hit => choose(hit.name)} />;
}

let mapPromise: Promise<void> | undefined;
function prepareMap() {
  mapPromise ??= fetch(asset("grid/boundaries.geojson")).then(async response => {
    if (!response.ok) throw new Error("The world map could not load.");
    echarts.registerMap("grid-atlas-world", await response.json());
  }).catch(error => { mapPromise = undefined; throw error; });
  return mapPromise;
}

export function WorldMap({ data, selected, choose }: {
  data: { code: string; name: string; value: number }[]; selected: string; choose: (code: string) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    void prepareMap().then(() => { if (active) setStatus("ready"); }, () => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);
  const option = useMemo<EChartsOption | null>(() => status === "ready" ? {
    animationDuration: 400,
    tooltip: { ...tooltip, trigger: "item", formatter: params => {
      if (Array.isArray(params)) return "";
      const area = data.find(entry => entry.code === params.name);
      return area ? `${safe(area.name)} · ${number(area.value)}% clean` : "No data for this selection";
    } },
    visualMap: { type: "continuous", min: 0, max: 100, left: "center", bottom: 8, orient: "horizontal",
      text: ["100% clean", "0%"], textStyle: { color: text }, calculable: false, itemWidth: 9, itemHeight: 130,
      inRange: { color: ["#3b5368", "#739375", "#d4f475"] } },
    series: [{ type: "map", map: "grid-atlas-world", top: 8, bottom: 46, layoutCenter: ["50%", "46%"], layoutSize: "126%",
      roam: false, itemStyle: { areaColor: "#26384a", borderColor: "#111d2a", borderWidth: .65 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: "#f2ac82" } },
      data: data.map(entry => ({ name: entry.code, value: entry.value,
        itemStyle: entry.code === selected ? { borderColor: "#fff", borderWidth: 1.6 } : undefined })),
    }],
  } : null, [data, selected, status]);
  if (status === "error") return <p className="grid-empty">The map could not load. Use the rankings to explore country data.</p>;
  return <>
    {status === "loading" && <p className="grid-empty" role="status">Loading map…</p>}
    <Surface option={option} className="grid-map" label="World map colored by clean electricity share. The rankings and geography selector provide keyboard access to country data."
      onPick={hit => { if (data.some(entry => entry.code === hit.name)) choose(hit.name); }} />
  </>;
}
