"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { asset } from "../assets";
import { caseHref, cases, type NewCase } from "./cases";
import { notes } from "./notes";
import type { TemperatureData } from "./temperature";
import type { ConnectivityData } from "./connectivity";
import type { TransitData } from "./transit";
import type { SeismicData } from "./seismic";
import "./research.css";

const Temperature = dynamic(() => import("./temperature"), { ssr: false });
const Connectivity = dynamic(() => import("./connectivity"), { ssr: false });
const Transit = dynamic(() => import("./transit"), { ssr: false });
const Seismic = dynamic(() => import("./seismic"), { ssr: false });

function CaseCharts({ slug, data }: { slug: NewCase["slug"]; data: unknown }) {
  switch (slug) {
    case "warming": return <Temperature data={data as TemperatureData} />;
    case "digital-divide": return <Connectivity data={data as ConnectivityData} />;
    case "transit-recovery": return <Transit data={data as TransitData} />;
    case "seismic-atlas": return <Seismic data={data as SeismicData} />;
  }
}

export default function CaseDashboard({ item }: { item: NewCase }) {
  const [data, setData] = useState<unknown>();
  const [error, setError] = useState(false);
  const [attempt, tryAgain] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(asset(`research/${item.slug}.json`), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Unable to load dataset.");
      return response.json() as Promise<unknown>;
    }).then(setData).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [item.slug, attempt]);
  const narrative = notes[item.slug];
  const next = cases[(cases.findIndex(candidate => candidate.slug === item.slug) + 1) % cases.length];

  return <div className="research-site" data-theme={item.theme}>
    <a className="research-skip" href="#case-charts">Skip to charts</a>
    <header className="research-header">
      <div className="research-width research-header-inner">
        <Link href="/" className="research-brand"><span><Activity size={20} aria-hidden /></span>PrismLab</Link>
        <nav aria-label="Case navigation"><Link href="/"><ArrowLeft size={15} aria-hidden />All cases</Link><a href="#case-method">Sources</a></nav>
      </div>
    </header>
    <main className="research-width case-main">
      <section className="case-hero" style={{ "--cover": `url("${asset(item.image)}")` } as React.CSSProperties}>
        <div>
          <p className="research-kicker">{item.category} · {item.period}</p>
          <h1>{item.name}</h1>
          <p>{item.question}</p>
          <a className="research-button primary" href="#case-charts">Explore the data <ArrowDown size={16} aria-hidden /></a>
        </div>
        <aside className="case-stat"><strong>{item.result}</strong><span>{item.resultLabel}</span></aside>
      </section>
      <section id="case-charts" className="case-data" aria-labelledby="case-charts-title">
        <div className="research-section-head"><h2 id="case-charts-title">Explore the data</h2><a href="#case-findings">Jump to findings <ArrowDown size={16} aria-hidden /></a></div>
        {data ? <CaseCharts key={item.slug} slug={item.slug} data={data} /> :
          error ? <div role="alert" className="case-panel"><p>This dataset could not load.</p>
            <button type="button" onClick={() => { setError(false); tryAgain(value => value + 1); }}>Retry data load</button></div> :
            <p role="status" className="case-panel">Loading {item.source} observations…</p>}
      </section>
      <section id="case-findings" className="case-findings" aria-labelledby="case-findings-title">
        <div className="research-section-head"><h2 id="case-findings-title">What the data shows</h2></div>
        <div className="case-findings-list">{narrative.findings.map(note => <article key={note.title}><h3>{note.title}</h3><p>{note.text}</p></article>)}</div>
        <article className="case-conclusion"><BookOpen size={27} aria-hidden /><div><h2>Conclusion</h2><p>{narrative.conclusion}</p></div></article>
      </section>
      <section id="case-method" className="case-panel case-method" aria-label="Sources and methodology">
        <h2>Sources and methodology</h2><p>{narrative.method}</p><p>{narrative.caveat}</p>
        <div className="case-source-links">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source} <ArrowUpRight size={15} aria-hidden /></a>
          <a href={narrative.reference} target="_blank" rel="noreferrer">Source methodology <ArrowUpRight size={15} aria-hidden /></a>
        </div>
      </section>
    </main>
    <footer className="research-width research-footer">
      <Link href="/"><ArrowLeft size={15} aria-hidden />All cases</Link><Link href={caseHref(next.slug)}>Next case · {next.name} <ArrowRight size={16} aria-hidden /></Link>
    </footer>
  </div>;
}
