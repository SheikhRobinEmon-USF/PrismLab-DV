import worldData from "./world.json";

export const fuels = [
  { name: "Coal", color: "#f3a46e" },
  { name: "Gas", color: "#da776f" },
  { name: "Other fossil", color: "#9c695f" },
  { name: "Hydro", color: "#54a8c1" },
  { name: "Solar", color: "#d6f477" },
  { name: "Wind", color: "#84d9b6" },
  { name: "Nuclear", color: "#9f99ed" },
  { name: "Bioenergy", color: "#6fba83" },
  { name: "Other renewables", color: "#77a1a9" },
] as const;

export type Row = [year: number, total: number, clean: number, fossil: number, windSolar: number | null, ...fuels: (number | null)[]];
export type Area = { code: string; name: string; continent: string; rows: Row[] };
export type Unit = "share" | "twh";
export type Metric = "generation" | "clean" | "change";
export const world = worldData as Area;
export const firstYear = world.rows[0][0];
export const recentYear = world.rows.at(-1)![0];
export const years = Array.from({ length: recentYear - firstYear + 1 }, (_, index) => firstYear + index);
export const percent = (value: number, total: number) => 100 * value / total;
export const observation = (area: Area, year: number) => area.rows.find(row => row[0] === year);
export const locale = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const number = (value: number, digits = 1) => digits === 1 ? locale.format(value) :
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
export const signed = (value: number, digits = 1) => (value > 0 ? "+" : value < 0 ? "−" : "") + number(Math.abs(value), digits);
export const whole = (value: number) => number(value, 0);

export function getMix(row: Row) {
  return fuels.map((fuel, index) => ({ ...fuel, value: row[5 + index] ?? null }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}

export function annualChanges(current: Row, previous: Row) {
  return fuels.flatMap((fuel, i) => {
    const now = current[5 + i];
    const before = previous[5 + i];
    return now == null || before == null ? [] : [{ ...fuel, value: now - before }];
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function rankAreas(areas: Area[], year: number, metric: Metric, continent: string) {
  return areas.flatMap(area => {
    if (continent && area.continent !== continent) return [];
    const row = observation(area, year);
    if (!row) return [];
    const clean = percent(row[2], row[1]);
    const before = observation(area, year - 5);
    if (metric === "change" && !before) return [];
    const value = metric === "generation" ? row[1] : metric === "clean" ? clean : clean - percent(before![2], before![1]);
    return [{ area, row, value, clean }];
  }).sort((a, b) => b.value - a.value || a.area.name.localeCompare(b.area.name));
}

export function downloadArea(area: Area) {
  const escape = (value: string) => '"' + (/^[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  const headers = ["Area", "ISO3", "Year", "Total (TWh)", "Clean (TWh)", "Fossil (TWh)", "Wind and solar (TWh)",
    ...fuels.map(fuel => fuel.name + " (TWh)")];
  const contents = [headers.map(escape).join(","), ...area.rows.map(row =>
    [escape(area.name), escape(area.code), ...row].join(","))].join("\r\n");
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  link.href = url;
  link.download = `grid-atlas-${area.code.toLowerCase()}-ember.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
