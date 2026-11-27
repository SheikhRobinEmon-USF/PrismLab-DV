"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownToLine, ChevronDown, Pause, Play } from "lucide-react";

export const format = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });
export const signed = (value: number, digits = 1) => (value > 0 ? "+" : value < 0 ? "−" : "") + format(Math.abs(value), digits);
export const mean = (values: (number | null | undefined)[]) => {
  const present = values.filter((value): value is number => value != null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
};

export function Picker({ label, value, set, children }: { label: string; value: string | number; set: (value: string) => void; children: ReactNode }) {
  return <label className="case-picker"><span>{label}</span>
    <span className="case-select"><select value={value} onChange={event => set(event.target.value)}>{children}</select><ChevronDown size={15} aria-hidden /></span>
  </label>;
}

export function TimeControl({ label, values, value, set }: { label: string; values: string[]; value: string; set: (value: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const index = values.indexOf(value);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index + 1 < values.length) set(values[index + 1]);
      else setPlaying(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [playing, index, values, set]);
  const select = (value: string) => { setPlaying(false); set(value); };
  return <div className="case-time">
    <Picker label={label} value={value} set={select}>{[...values].reverse().map(value => <option key={value}>{value}</option>)}</Picker>
    <button className="case-play" type="button" aria-label={playing ? "Pause timeline" : "Play timeline"} onClick={() => {
      if (playing) setPlaying(false);
      else { if (index >= values.length - 1) set(values[0]); setPlaying(true); }
    }}>{playing ? <Pause size={15} aria-hidden /> : <Play fill="currentColor" size={15} aria-hidden />}</button>
    <div className="case-range"><span>{values[0]}</span><input type="range" aria-label={label + " timeline"} aria-valuetext={value}
      min={0} max={values.length - 1} value={Math.max(0, index)} onChange={event => select(values[+event.target.value])} /><span>{values.at(-1)}</span></div>
  </div>;
}

export function Metrics({ items }: { items: { label: string; value: string; note: string }[] }) {
  return <div className="case-metrics" aria-label="Case metrics">
    {items.map(({ label, value, note }) => <article key={label}><h3>{label}</h3><strong key={value} data-wide={value.length >= 9}>{value}</strong><p>{note}</p></article>)}
  </div>;
}

export function Panel({ title, detail, controls, wide, children }: {
  title: string; detail?: string; controls?: ReactNode; wide?: boolean; children: ReactNode;
}) {
  return <section className={"case-panel" + (wide ? " wide" : "")} aria-label={title}>
    <div className="case-panel-head"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{controls}</div>
    {children}
  </section>;
}

export function Toggle({ options, value, choose, label }: { options: string[]; value: string; choose: (value: string) => void; label: string }) {
  return <div className="case-toggle" aria-label={label}>{options.map(option =>
    <button type="button" key={option} aria-pressed={value === option} onClick={() => choose(option)}>{option}</button>)}</div>;
}

export function Export({ filename, rows }: { filename: string; rows: (string | number | boolean | null | undefined)[][] }) {
  function download() {
    const csv = rows.map(row => row.map(cell => typeof cell === "string"
      ? '"' + (/^[=+\-@]/.test(cell) ? "'" : "") + cell.replaceAll('"', '""') + '"' : cell ?? "").join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + ".csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="case-export" onClick={download} type="button"><ArrowDownToLine size={16} aria-hidden />Export CSV</button>;
}
