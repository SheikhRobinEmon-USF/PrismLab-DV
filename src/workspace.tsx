"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { asset, demos, type Demo } from "./assets";
import type { Card, Dataset, Profile, Project, Query, Result, Row } from "./contracts";
import { Database } from "./database";
import { clearWorkspace, createFact, importProject, readWorkspace, saveWorkspace, type Snapshot } from "./persistence";
import { datasetRevision, defaultQuery, type Selection } from "./query";

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function useWorkspaceState() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [preview, setPreview] = useState<Row[]>([]);
  const [result, setResult] = useState<Result>();
  const [drill, setDrill] = useState<Result>();
  const [baseline, setBaseline] = useState<Result>();
  const [baselineError, setBaselineError] = useState("");
  const [selection, setSelection] = useState<Selection>();
  const [busy, setBusy] = useState("Opening workspace");
  const [queryBusy, setQueryBusy] = useState(false);
  const [error, setError] = useState("");
  const [queryError, setQueryError] = useState("");
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(false);
  const database = useRef<Database | undefined>(undefined);
  const pending = useRef<Database | undefined>(undefined);
  const generation = useRef(0);
  const initialized = useRef(false);
  const project = snapshot?.project;

  async function load(
    input: () => Promise<{
      file: Blob; details: { name: string; filename: string; source: string; license: string };
      restore?: Project; reset?: boolean;
    }>,
    operation: string,
  ) {
    const attempt = ++generation.current;
    setBusy(operation); setError(""); setNotice("");
    let staged: Database | undefined;
    try {
      const { file, details, restore, reset } = await input();
      if (attempt !== generation.current) return;
      staged = await Database.start();
      if (attempt !== generation.current) { await staged.close(); return; }
      pending.current = staged;
      const loaded = await staged.load(file, details);
      if (restore && (loaded.dataset.digest !== restore.dataset.digest ||
        JSON.stringify(loaded.dataset.columns.map(c => c.name)) !== JSON.stringify(restore.dataset.columns.map(c => c.name)))) {
        throw new Error("Saved data or schema differs from this file.");
      }
      const dataset: Dataset = { ...loaded.dataset, columns: restore?.dataset.columns ?? loaded.dataset.columns };
      const profile = restore ? await staged.profile(dataset) : loaded.profiles;
      const rows = await staged.preview();
      if (attempt !== generation.current) return;
      if (reset) await clearWorkspace();
      if (attempt !== generation.current) return;
      const old = database.current;
      database.current = staged;
      pending.current = undefined;
      staged = undefined;
      if (old) void old.close();
      setSelection(undefined); setResult(undefined); setDrill(undefined); setBaseline(undefined); setBaselineError("");
      setProfiles(profile); setPreview(rows);
      setSnapshot(previous => ({ file, project: {
        version: 1, dataset, query: restore?.query ?? defaultQuery(dataset),
        cards: restore?.cards ?? (reset ? [] : previous?.project.cards ?? []),
        comparison: restore?.comparison,
      } }));
      setNotice(dataset.name + " loaded.");
    } catch (reason) {
      if (attempt === generation.current) setError(message(reason));
    } finally {
      if (staged && pending.current === staged) { pending.current = undefined; await staged.close(); }
      if (attempt === generation.current) setBusy("");
    }
  }
  function openDemo(key: Demo, reset = false) {
    const demo = demos[key];
    return load(async () => {
      const response = await fetch(asset(demo.file));
      if (!response.ok) throw new Error("The example dataset could not be loaded.");
      return { file: await response.blob(), details: { ...demo, filename: demo.file }, reset };
    }, "Loading " + demo.name);
  }

  function restoreSnapshot(saved: Snapshot) {
    const dataset = saved.project.dataset;
    return {
      file: saved.file, restore: saved.project,
      details: { name: dataset.name, filename: dataset.format === "CSV" ? "restored.csv" : "restored.parquet", source: dataset.source, license: dataset.license },
    };
  }

  function openFile(file: File) {
    return load(async () => {
      if (/\.json$/i.test(file.name)) return restoreSnapshot(await importProject(file));
      return { file, details: { filename: file.name, name: file.name, source: "Local user file", license: "User supplied" } };
    }, "Importing " + file.name);
  }

  function cancel() {
    generation.current++;
    const db = pending.current;
    pending.current = undefined;
    if (db) void db.close();
    setBusy(""); setNotice("Import cancelled.");
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register(asset("offline.js")).catch(() => {});
    }
    queueMicrotask(() => { if (localStorage.getItem("prismlab-theme") === "dark") setDark(true); });
    void (async () => {
      try {
        const saved = await readWorkspace();
        if (generation.current) return;
        if (saved) {
          await load(async () => restoreSnapshot(saved), "Restoring workspace");
          return;
        }
      } catch (reason) { setError(message(reason)); }
      if (!generation.current) setBusy("");
    })();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";

  }, [dark]);

  const dataset = project?.dataset;
  const query = project?.query;
  const comparison = project?.comparison;
  useEffect(() => {
    const db = database.current;
    if (!db || !dataset) return;
    let active = true;
    void db.profile(dataset).then(value => { if (active) setProfiles(value); }).catch(reason => {
      if (active) setError(message(reason));
    });
    return () => { active = false; };
  }, [dataset]);
  useEffect(() => {
    const db = database.current;
    if (!db || !dataset || !query) return;
    let active = true;
    const timer = setTimeout(() => {
      setQueryBusy(true); setQueryError("");
      void (async () => {
        try {
          const value = await db.query(dataset, query);
          if (active) setResult(value);
        } catch (reason) {
          if (active) { setQueryError(message(reason)); setResult(undefined); }
        } finally { if (active) setQueryBusy(false); }
      })();
    }, 80);
    return () => { active = false; clearTimeout(timer); };
  }, [dataset, query]);
  useEffect(() => {
    const db = database.current;
    if (!db || !dataset || !comparison) return;
    let active = true;
    void db.query(dataset, comparison).then(value => {
      if (active) setBaseline(value);
    }).catch(reason => {
      if (active) setBaselineError(message(reason));
    });
    return () => { active = false; };
  }, [dataset, comparison]);
  useEffect(() => {
    const db = database.current;
    if (!db || !dataset || !query || !selection) return;
    let active = true;
    void db.query(dataset, query, selection).then(value => { if (active) setDrill(value); }).catch(reason => {
      if (active) setQueryError(message(reason));
    });
    return () => { active = false; };
  }, [dataset, query, selection]);

  function updateProject(transform: (previous: Project) => Project) {
    setSnapshot(previous => previous && ({ ...previous, project: transform(previous.project) }));
  }
  function changeQuery(patch: Partial<Query>) {
    setSelection(undefined); setDrill(undefined);
    setResult(undefined);
    updateProject(previous => ({ ...previous, query: { ...previous.query, ...patch } }));
  }
  function captureBaseline(query?: Query) {
    setBaseline(undefined); setBaselineError("");
    updateProject(previous => ({ ...previous, comparison: query ? { ...query } : undefined }));
  }
  function choose(point?: Selection) {
    if (point?.key === selection?.key && point?.group === selection?.group) return;
    setSelection(point); setDrill(undefined);
  }
  function changeType(name: string, type: Dataset["columns"][number]["type"]) {
    setSelection(undefined); setDrill(undefined); setResult(undefined); setBaseline(undefined); setBaselineError("");
    updateProject(previous => ({ ...previous, dataset: {
      ...previous.dataset, columns: previous.dataset.columns.map(column => column.name === name ? { name, type } : column),
    } }));
  }
  async function refreshCard(card: Card) {
    const db = database.current;
    if (!project || !db) return;
    const revision = datasetRevision(project.dataset);
    try {
      const cardProject = { ...project, query: card.evidence.query };
      const next = await db.query(project.dataset, card.evidence.query, card.evidence.selection);
      const evidence = await createFact(cardProject, next, card.evidence.selection);
      if (db !== database.current) return;
      updateProject(previous => datasetRevision(previous.dataset) !== revision ? previous : {
        ...previous, cards: previous.cards.map(item => item.id === card.id
          ? { ...item, evidence, datasetName: previous.dataset.name, points: next.points } : item),
      });
      setNotice("Storyboard evidence refreshed.");
    } catch (reason) { setError(message(reason)); }
  }

  async function save() {
    if (!snapshot) return;
    try { await saveWorkspace(snapshot); setNotice("Workspace saved on this device."); }
    catch (reason) { setError(message(reason)); }
  }

  return { snapshot, project, profiles, preview, result, drill, baseline, baselineError, captureBaseline, selection, busy, queryBusy,
    error, queryError, notice, dark, setDark: (value: boolean) => {
      setDark(value); localStorage.setItem("prismlab-theme", value ? "dark" : "light");
    }, setError, setNotice, openDemo, openFile, cancel,
    updateProject, changeQuery, changeType, choose, refreshCard, save };
}

type Workspace = ReturnType<typeof useWorkspaceState>;
const Context = createContext<Workspace | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useWorkspaceState()}>{children}</Context.Provider>;
}

export function useWorkspace() {
  const workspace = useContext(Context);
  if (!workspace) throw new Error("Workspace context is missing.");
  return workspace;
}
