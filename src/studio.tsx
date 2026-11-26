"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useState, type DragEvent } from "react";
import { demos, type Demo } from "./assets";
import type { Card, Project, Result } from "./contracts";
import { types } from "./contracts";
import { FieldShelf, FilterBar, number, Table, TimeBrush } from "./controls";
import { sections, type Section } from "./navigation";
import { createFact, exportProject, exportStory, exportTable } from "./persistence";
import { datasetRevision, describe } from "./query";
import { useWorkspace } from "./workspace";

const Chart = dynamic(() => import("./chart"), { ssr: false, loading: () => <p role="status">Loading chart</p> });
const studioHref = (section: Section) => "/studio/" + section + "/";

function Upload({ compact = false }: { compact?: boolean }) {
  const { openFile, busy } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void openFile(file);
  }
  return <div className={compact ? "upload-small" : "upload-area"} data-dragging={dragging}
    onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <input ref={input} type="file" accept=".csv,.parquet,.json" hidden onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (file) void openFile(file);
    }} />
    {!compact && <><span className="upload-icon" aria-hidden="true">⇧</span><p>Drop a CSV, Parquet or project JSON here.</p></>}
    <button className={compact ? "" : "primary"} type="button" disabled={!!busy} onClick={() => input.current?.click()}>
      {compact ? "Import file" : "Choose a file"}
    </button>
    {!compact && <small>Files are processed on this device. Dataset limit 30 MiB.</small>}
  </div>;
}

function Home({ example }: { example?: Demo }) {
  const { project, openDemo, busy } = useWorkspace();
  if (example) {
    const demo = demos[example];
    return <>
      <section className="hero example-hero">
        <div><Link className="text-link" href="/studio/">All examples</Link><h1>{demo.name}</h1><p>{demo.description}</p>
          <button className="primary" disabled={!!busy} onClick={() => void openDemo(example)}>Load example</button>
          {project?.dataset.name === demo.name && <Link className="button" href={studioHref("explore")}>Explore dataset</Link>}
        </div>
        <DemoArt variant={example} />
      </section>
      <div className="panel"><h2>Source and method</h2><p>{demo.source}</p><p>{demo.license}</p>
        <p>{example === "retail" ? "Compare sales across channels and regions, then inspect the rows behind a month." :
          "Select Map and choose average magnitude to inspect individual locations. The catalog covers the chosen time window and magnitude threshold."}</p></div>
    </>;
  }
  return <>
    <section className="hero">
      <div>
        <h1>Make your data<br />tell a clearer story<span>.</span></h1>
        <p>Explore a dataset, build a chart, and show the evidence behind every claim.</p>
        <a className="button primary" href="#workspace-import">Import data</a>
        <Link className="button" href={studioHref(project ? "explore" : "datasets")}>{project ? "Resume workspace" : "Open studio"}</Link>
      </div>
      <DemoArt variant="retail" />
    </section>
    <section aria-labelledby="examples-heading" className="home-section">
      <div className="section-title"><h2 id="examples-heading">Example datasets</h2>{project && <span className="muted">Open dataset · {project.dataset.name}</span>}</div>
      <div className="demo-grid">
        {(Object.keys(demos) as Demo[]).map(key => <article className="demo-card" key={key}>
          <DemoArt variant={key} /><div><h3>{demos[key].name}</h3><p>{demos[key].description}</p>
            <div className="button-row"><button disabled={!!busy} onClick={() => void openDemo(key)}>Load {key === "retail" ? "retail" : "earthquake"} demo</button>
              <Link className="text-link" href={`/examples/${key}/`}>About this dataset</Link></div>
          </div>
        </article>)}
      </div>
    </section>
    <section id="workspace-import" className="home-section"><h2>Import a dataset or saved project</h2><Upload /></section>
  </>;
}

function DemoArt({ variant }: { variant: Demo }) {
  const bars = [22, 34, 28, 46, 52, 40, 62, 71, 56, 79, 71, 88];
  return <div className={"demo-art " + variant} aria-hidden="true">
    <div className="art-grid" />
    {variant === "retail" ? <div className="art-bars">{bars.map((value, index) => <i key={index} style={{ height: value + "%" }} />)}</div> :
      <div className="art-dots">{bars.map((value, index) => <i key={index} style={{ left: ((index * 31 + 13) % 94) + "%", top: ((value * 7) % 88) + "%", width: 5 + value / 11, height: 5 + value / 11 }} />)}</div>}
    <div className="art-label">{variant === "retail" ? "Retail performance" : "Global earthquakes"}</div>
  </div>;
}

function DatasetView() {
  const { project, profiles, preview, changeType } = useWorkspace();
  const dataset = project?.dataset;
  return <>
    <Upload />
    {dataset && <>
      <div className="metrics"><Metric title="Rows" value={number(dataset.rowCount)} /><Metric title="Columns" value={number(dataset.columns.length)} />
        <Metric title="File size" value={number(dataset.size / 1024) + " KiB"} /></div>
      <section className="panel"><h2>Column profile</h2><p className="muted">Invalid values stay visible in the source preview and count as missing in typed queries.</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Column profiling">
          <table><thead><tr>{["Column", "Type", "Missing", "Invalid", "Approx. distinct"].map(name => <th scope="col" key={name}>{name}</th>)}</tr></thead>
            <tbody>{profiles.map(profile => <tr key={profile.name}>
              <th scope="row">{profile.name}</th><td><select aria-label={"Type for " + profile.name}
                value={dataset.columns.find(column => column.name === profile.name)?.type} onChange={event => changeType(profile.name, event.target.value as typeof profile.type)}>
                {types.map(type => <option key={type}>{type}</option>)}</select></td>
              <td>{profile.nulls} ({number(100 * profile.nulls / dataset.rowCount)}%)</td><td>{profile.invalid}</td><td>{profile.distinct}</td>
            </tr>)}</tbody></table>
        </div>
      </section>
      <section className="panel"><h2>Source preview</h2><Table rows={preview} label="Source preview" /></section>
      <Link className="button primary" href={studioHref("build")}>Build a chart</Link>
    </>}
  </>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="metric"><span>{title}</span><strong>{value}</strong></div>;
}

function Evidence({ result }: { result: Result }) {
  const { project, drill, selection, choose } = useWorkspace();
  if (!project) return null;
  const { query } = project;
  const summary = selection ? drill?.summary : result.summary;
  return <aside className="panel inspector" aria-labelledby="evidence-title">
    <h2 id="evidence-title">Evidence</h2>
    {selection && <div className="selected"><strong>{selection.key} {selection.group}</strong><button onClick={() => choose()}>Clear selection</button></div>}
    <dl><dt>Method</dt><dd>{describe(query)}</dd><dt>Value</dt><dd>{number(summary?.value)} {query.unit}</dd>
      <dt>Contributing rows</dt><dd>{number(summary?.denominator)} of {number(summary?.rows)}</dd>
      {summary?.numerator != null && <><dt>Numerator</dt><dd>{number(summary.numerator)}</dd></>}
      <dt>Source columns</dt><dd>{[query.x, query.measure, query.group, query.size].filter(Boolean).join(", ")}</dd>
      <dt>Dataset</dt><dd>{project.dataset.name}</dd><dt>Missing measures</dt><dd>{query.missing === "exclude" ? "Excluded" : "Treated as zero"}</dd>
      <dt>Active filters</dt><dd>{query.filters.length || "None"}</dd></dl>
    <p className="muted">The matching record preview shows up to 100 rows. Missing or invalid x values are excluded.</p>
  </aside>;
}

function PointTable({ result }: { result: Result }) {
  const { choose, selection } = useWorkspace();
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(result.points.length / pageSize));
  const current = Math.min(page, pages - 1);
  return <section className="panel"><h2>Chart data</h2>
    {result.truncated && <p className="muted">Showing the first 5,000 ordered groups. Summary totals include all matching groups.</p>}
    {result.points.length ? <>
      <div className="table-scroll" tabIndex={0} aria-label="Chart data table" role="region">
        <table><thead><tr>{["X", "Group", "Value", "Rows"].map(name => <th scope="col" key={name}>{name}</th>)}</tr></thead>
          <tbody>{result.points.slice(current * pageSize, (current + 1) * pageSize).map(point => <tr key={JSON.stringify([point.key, point.group])}>
            <th scope="row"><button className="cell-button" aria-pressed={selection?.key === point.key && selection?.group === point.group}
              aria-label={`Inspect ${point.key}${point.group ? ", " + point.group : ""}`} onClick={() => choose(point)}>{point.key}</button></th>
            <td>{point.group || "—"}</td><td>{number(point.value)}</td><td>{number(point.rows)}</td>
          </tr>)}</tbody></table>
      </div>
      {pages > 1 && <div className="button-row table-nav"><button disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
        <span>Page {current + 1} of {pages}</span><button disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Next</button></div>}
    </> : <p>No chart points match the current filters.</p>}
  </section>;
}

function Analysis({ explore }: { explore: boolean }) {
  const { project, result, drill, baseline, queryBusy, queryError, selection, choose, dark, updateProject, setNotice, setError } = useWorkspace();
  if (!project) return null;
  const { query, dataset, comparison } = project;
  async function addCard() {
    const captured = selection ? drill : result;
    if (!project || !captured) return;
    try {
      const evidence = await createFact(project, captured, selection);
      const card: Card = { id: crypto.randomUUID(), title: describe(query), claim: "", caveat: "", alternative: "",
        evidence, datasetName: dataset.name, points: captured.points };
      updateProject(previous => ({ ...previous, cards: [...previous.cards, card] }));
      setNotice("Chart and evidence added to storyboard.");
    } catch (reason) { setError(String(reason)); }
  }
  const summary = selection ? drill?.summary : result?.summary;
  const difference = summary?.value != null && baseline?.summary.value != null ? summary.value - baseline.summary.value : null;
  const percent = difference != null && baseline?.summary.value != null && baseline.summary.value !== 0
    ? 100 * difference / Math.abs(baseline.summary.value) : null;
  return <>
    {!explore && <section className="panel"><h2>Fields and encodings</h2><FieldShelf /></section>}
    <section className="panel"><h2>Filters</h2><FilterBar datasetKey={dataset.digest} />{explore && <TimeBrush key={query.x + dataset.digest} />}</section>
    {queryBusy && <p role="status">Running query</p>}
    {queryError && <p role="alert" className="alert">{queryError}</p>}
    {result && <>
      <div className="metrics" aria-label="Query summary"><Metric title={selection ? "Selected value" : describe(query)} value={number(summary?.value) + (query.unit ? " " + query.unit : "")} />
        <Metric title="Matching rows" value={number(summary?.rows)} /><Metric title="Contributing rows" value={number(summary?.denominator)} /></div>
      <div className="analysis-grid">
        <section className="panel plot-panel"><div className="section-title"><h2>{describe(query)}</h2><button disabled={!!selection && !drill} onClick={() => void addCard()}>Add to storyboard</button></div>
          <Chart query={query} points={result.points} chosen={selection} onChoose={choose} dark={dark} />
          <p className="muted chart-hint">Select a mark or use the Chart data table to inspect its source.</p>
        </section>
        <Evidence result={result} />
      </div>
      {explore && <section className="panel">
        <h2>Contributing rows by group</h2>
        <Chart query={{ ...query, chart: "bar", measure: "", aggregate: "count", unit: "rows" }}
          points={(selection ? drill?.points ?? [] : result.points).map(point => ({ ...point, value: point.denominator }))}
          chosen={selection} onChoose={choose} dark={dark} />
      </section>}
      {explore && <section className="panel">
        <div className="section-title"><h2>Compare filter states</h2><div className="button-row">
          <button onClick={() => updateProject(previous => ({ ...previous, comparison: previous.query }))}>Set current view as baseline</button>
          {comparison && <button onClick={() => updateProject(previous => ({ ...previous, comparison: undefined }))}>Clear baseline</button>}
        </div></div>
        {comparison && baseline && <>
          <div className="comparison">
            <div><h3>Current</h3><p>{describe(query)} · {query.filters.length} filters</p>
              <Chart query={query} points={selection && drill ? drill.points.filter(p => p.key === selection.key && p.group === selection.group) : result.points} dark={dark} /></div>
            <div><h3>Baseline</h3><p>{describe(comparison)} · {comparison.filters.length} filters</p>
              <Chart query={comparison} points={baseline.points} dark={dark} /></div>
          </div>
          {query.aggregate === comparison.aggregate && query.measure === comparison.measure && query.unit === comparison.unit
            ? <p>Change {number(difference)} · {percent === null ? "No percentage available" : number(percent) + "% of baseline magnitude"}</p>
            : <p>Use the same measure, unit and aggregation to calculate a change.</p>}
        </>}
        {!comparison && <p className="muted">Capture this view, then change the filters to compare totals and charts.</p>}
      </section>}
      <PointTable result={result} />
      <section className="panel"><h2>{selection ? "Selected records" : "Matching records"}</h2>
        {selection && !drill ? <p role="status">Finding source records</p> : <Table label="Matching source records" rows={(selection ? drill : result)?.records ?? []} />}
      </section>
    </>}
  </>;
}

function Storyboard() {
  const { project, updateProject, refreshCard, dark } = useWorkspace();
  const [presenting, setPresenting] = useState(false);
  const [step, setStep] = useState(0);
  if (!project) return null;
  const { cards, dataset } = project;
  function edit(id: string, patch: Partial<Card>) {
    updateProject(previous => ({ ...previous, cards: previous.cards.map(card => card.id === id ? { ...card, ...patch } : card) }));
  }
  function move(index: number, offset: number) {
    updateProject(previous => {
      const cards = [...previous.cards];
      [cards[index], cards[index + offset]] = [cards[index + offset], cards[index]];
      return { ...previous, cards };
    });
  }
  const visible = presenting ? cards.slice(step, step + 1) : cards;
  return <>
    <div className="button-row"><Link className="button" href={studioHref("build")}>Build a chart</Link>
      {cards.length > 0 && <button onClick={() => { setStep(0); setPresenting(!presenting); }}>{presenting ? "Exit presentation" : "Present story"}</button>}
      {presenting && <><button disabled={step === 0} onClick={() => setStep(step - 1)}>Previous card</button>
        <span>{step + 1} / {cards.length}</span><button disabled={step === cards.length - 1} onClick={() => setStep(step + 1)}>Next card</button></>}
    </div>
    {cards.length === 0 && <div className="panel"><h2>Your storyboard is empty</h2><p>Add a chart from Chart composer or Linked analysis to capture its evidence.</p></div>}
    {visible.map((card, index) => <article key={card.id} className={presenting ? "panel story-card presentation" : "panel story-card"}>
      {(card.evidence.datasetRevision ? card.evidence.datasetRevision !== datasetRevision(dataset) : card.evidence.datasetDigest !== dataset.digest) &&
        <div className="status"><span>Stale evidence · This card uses a different source revision.</span>
          {!presenting && <button onClick={() => void refreshCard(card)}>Refresh evidence</button>}</div>}
      {presenting ? <><h2>{card.title}</h2><p className="story-claim">{card.claim}</p></> : <>
        <div className="section-title"><h2>{card.title || "Untitled card"}</h2><div className="button-row">
          <button disabled={index === 0} onClick={() => move(index, -1)}>Move up</button>
          <button disabled={index === cards.length - 1} onClick={() => move(index, 1)}>Move down</button>
          <button onClick={() => updateProject(previous => ({ ...previous, cards: previous.cards.filter(candidate => candidate.id !== card.id) }))}>Remove card</button>
        </div></div>
        <label>Card title<input value={card.title} onChange={event => edit(card.id, { title: event.target.value })} /></label>
        <label>Claim<textarea value={card.claim} onChange={event => edit(card.id, { claim: event.target.value })} /></label>
      </>}
      <Chart query={card.evidence.query} points={card.points} dark={dark} />
      <div className="fact"><strong>{card.evidence.method} · {number(card.evidence.value)} {card.evidence.query.unit}</strong>
        <p>{card.datasetName} · {number(card.evidence.rows)} matching rows. {card.evidence.limitations}</p>
        <details><summary>Captured query and provenance</summary><pre>{JSON.stringify(card.evidence, null, 2)}</pre></details>
      </div>
      {presenting ? <><p>{card.caveat}</p><p>{card.alternative}</p></> : <div className="fields narrative">
        <label>Caveat<textarea value={card.caveat} onChange={event => edit(card.id, { caveat: event.target.value })} /></label>
        <label>Alternative interpretation<textarea value={card.alternative} onChange={event => edit(card.id, { alternative: event.target.value })} /></label>
      </div>}
    </article>)}
  </>;
}

function Exports() {
  const { project, snapshot, result, dark, save, setError } = useWorkspace();
  if (!project || !snapshot) return null;
  const exportAction = async (action: () => void | Promise<void>) => {
    try { await action(); } catch (reason) { setError(String(reason)); }
  };
  return <>
    <section className="panel"><h2>Downloads</h2><div className="button-row">
      <button className="primary" onClick={() => void save()}>Save workspace</button>
      <button onClick={() => void exportAction(() => exportProject(snapshot))}>Download project JSON</button>
      <button disabled={!result} onClick={() => result && exportTable(result)}>Download aggregates CSV</button>
      <button disabled={!project.cards.length} onClick={() => void exportAction(async () => {
        const { renderChartSvg } = await import("./chart");
        await exportStory(project, card => renderChartSvg(card.evidence.query, card.points));
      })}>Download story HTML</button>
    </div>
      {result && <Chart query={project.query} points={result.points} dark={dark} downloadEnabled />}
      <p className="muted">Project JSON includes the source data. Story HTML includes only the captured aggregate rows and annotations.</p>
    </section>
    <section className="panel"><h2>Dataset provenance</h2><Provenance project={project} /></section>
    <section className="panel"><h2>Chart and filter definition</h2><pre>{JSON.stringify(project.query, null, 2)}</pre></section>
  </>;
}
function Provenance({ project }: { project: Project }) {
  const { dataset } = project;
  return <dl><dt>Dataset</dt><dd>{dataset.name}</dd><dt>Source</dt><dd>{dataset.source}</dd><dt>License</dt><dd>{dataset.license}</dd>
    <dt>SHA-256</dt><dd className="digest">{dataset.digest}</dd><dt>Format</dt><dd>{dataset.format}</dd></dl>;
}

export default function Studio({ section, example }: { section: Section | "home" | "example"; example?: Demo }) {
  const { project, busy, error, notice, cancel, dark, setDark, save, openDemo } = useWorkspace();
  const gallery = section === "home" || section === "example";
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <Link className="brand" href="/studio/" aria-label="PrismLab home"><span className="brand-mark" aria-hidden="true">◈</span>PrismLab</Link>
      <nav aria-label="Main navigation"><Link href="/studio/" aria-current={section === "home" ? "page" : undefined}>Gallery</Link>
        <Link href={studioHref("datasets")} aria-current={!gallery ? "page" : undefined}>Studio</Link></nav>
      <button className="theme" aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? "Light theme" : "Dark theme"}</button>
    </header>
    <main id="main" className={gallery ? "gallery-shell" : "studio-shell"}>
      {!gallery && <aside className="rail"><nav aria-label="Studio navigation">
        {Object.entries(sections).map(([key, label]) => <Link key={key} href={studioHref(key as Section)} aria-current={section === key ? "page" : undefined}>{label}</Link>)}
      </nav>{project && <div className="rail-project"><strong>{project.dataset.name}</strong><span>{project.dataset.format} · {number(project.dataset.rowCount)} rows</span>
        <Upload compact /><button disabled={!!busy} onClick={() => void save()}>Save workspace</button>
        <button disabled={!!busy} onClick={() => void openDemo("retail", true)}>Reset demo</button>
      </div>}</aside>}
      <div className="main-content">
        {busy && <div className="status" role="status"><span>{busy}…</span><button onClick={cancel}>Cancel</button></div>}
        {error && <p role="alert" className="alert">{error}</p>}
        {notice && <p role="status" className="notice">{notice}</p>}
        {gallery ? <Home example={example} /> : <>
          <div className="page-header"><h1>{sections[section]}</h1>{project && <p>{project.dataset.name}</p>}</div>
          {section === "datasets" ? <DatasetView /> : !project ? <div className="panel"><h2>Open a dataset to continue</h2>
            <p>Load an example or bring your own local file.</p><Link className="button primary" href="/studio/">Open gallery</Link></div> :
            section === "story" ? <Storyboard /> : section === "export" ? <Exports /> : <Analysis explore={section === "explore"} />}
          {!project && section === "datasets" && <div className="panel"><h2>Try an example</h2><div className="button-row">
            <button disabled={!!busy} onClick={() => void openDemo("retail")}>Load retail demo</button>
            <button disabled={!!busy} onClick={() => void openDemo("earthquakes")}>Load earthquake demo</button>
          </div></div>}
        </>}
      </div>
    </main>
  </>;
}
