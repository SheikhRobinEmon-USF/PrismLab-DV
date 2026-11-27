"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import { GeoComponent, GridComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { asset } from "../assets";

echarts.use([BarChart, HeatmapChart, LineChart, ScatterChart, GeoComponent, GridComponent, MarkLineComponent,
  TooltipComponent, VisualMapComponent, CanvasRenderer]);

export const ink = "#a8bacf";
export const mutedLine = "#2b3f50";
export const chartColors = ["#83dbed", "#f7aa83", "#b6a6fc", "#d7ed89", "#f0bd62"];
export const tip = { backgroundColor: "#132336", borderColor: "#486077", textStyle: { color: "#f1f7ff" }, confine: true };
export const category = (data: string[], interval?: number) => ({
  type: "category" as const, data, axisTick: { show: false }, axisLine: { lineStyle: { color: mutedLine } },
  axisLabel: { color: ink, interval, hideOverlap: true, margin: 12, fontSize: 11 },
});
export const scale = (label: (value: number) => string, min?: number, max?: number) => ({
  type: "value" as const, min, max, axisLabel: { color: ink, fontSize: 11, formatter: label },
  splitLine: { lineStyle: { color: mutedLine, type: "dashed" as const } },
});
export const defaultGrid = { top: 24, left: 55, right: 24, bottom: 38 };
export const line = (name: string, values: (number | null)[], color: string) => ({
  type: "line" as const, name, data: values, showSymbol: false, color, lineStyle: { width: 2.6, color },
  emphasis: { focus: "series" as const }, connectNulls: false,
});
export const yearMarker = (label: string) => ({
  silent: true, symbol: "none", label: { show: false },
  lineStyle: { color: "#b8cadb", type: "dashed" as const, opacity: .8 }, data: [{ xAxis: label }],
});
export const escaped = (text: string) => text.replace(/[&<>"]/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[value] ?? "");

type Hit = { name: string; dataIndex: number; value: unknown };
export function Chart({ option, label, className = "", choose, chooseX }: {
  option: EChartsOption; label: string; className?: string; choose?: (hit: Hit) => void; chooseX?: (index: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.EChartsType | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const instance = echarts.init(host.current, undefined, { renderer: "canvas" });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(host.current);
    chart.current = instance;
    return () => { observer.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => chart.current?.setOption({ animationDuration: 500, animationDurationUpdate: 300,
      ...option, animation: !motion.matches }, { replaceMerge: ["series"] });
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, [option]);
  useEffect(() => {
    const instance = chart.current;
    if (!instance) return;
    const renderer = instance.getZr();
    const pick = (event: { offsetX: number; offsetY: number }) => {
      if (!chooseX || !instance.containPixel({ gridIndex: 0 }, [event.offsetX, event.offsetY])) return;
      const result = instance.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
      if (typeof result === "number" && Number.isInteger(result)) chooseX(result);
    };
    if (choose) instance.on("click", choose);
    if (chooseX) renderer.on("click", pick);
    return () => {
      if (choose) instance.off("click", choose);
      if (chooseX) renderer.off("click", pick);
    };
  }, [choose, chooseX]);
  return <div role="img" aria-label={label} className={"case-chart " + className}><div ref={host} aria-hidden /></div>;
}

let mapLoad: Promise<void> | undefined;
export function loadWorldMap() {
  mapLoad ??= fetch(asset("grid/boundaries.geojson")).then(async response => {
    if (!response.ok) throw new Error("Map geometry is unavailable.");
    echarts.registerMap("case-world", await response.json());
  }).catch(error => { mapLoad = undefined; throw error; });
  return mapLoad;
}
