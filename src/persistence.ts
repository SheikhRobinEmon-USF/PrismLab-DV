import { projectSchema, type Project, type Result } from "./contracts";
import { digest, maxFileSize } from "./database";
import { datasetRevision, describe, type Selection } from "./query";

export type Snapshot = { project: Project; file: Blob };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("prismlab", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspaces");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function access<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("workspaces", mode);
      const request = action(transaction.objectStore("workspaces"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? Error("Storage transaction aborted."));
      transaction.onerror = () => reject(transaction.error ?? Error("Storage transaction failed."));
    });
  } finally { db.close(); }
}

export const readWorkspace = () => access<Snapshot | undefined>("readonly", store => store.get("current"));
export const saveWorkspace = (snapshot: Snapshot) => access("readwrite", store => store.put(snapshot, "current"));
export const clearWorkspace = () => access("readwrite", store => store.delete("current"));

export function download(name: string, contents: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportProject({ project, file }: Snapshot) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  download("prismlab-project.json", JSON.stringify({ project, data }), "application/json");
}

export async function importProject(file: File): Promise<Snapshot> {
  if (file.size > maxFileSize * 2) throw new Error("Project bundle is too large.");
  const bundle = JSON.parse(await file.text());
  const project = projectSchema.parse(bundle.project);
  if (typeof bundle.data !== "string" || bundle.data.length > Math.ceil(maxFileSize / 3) * 4) {
    throw new Error("Invalid project dataset.");
  }
  const bytes = Uint8Array.from(atob(bundle.data), character => character.charCodeAt(0));
  if (bytes.byteLength !== project.dataset.size || await digest(bytes.buffer) !== project.dataset.digest) {
    throw new Error("The bundled data does not match the recorded dataset digest.");
  }
  return { project, file: new Blob([bytes]) };
}

export function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  const neutral = typeof value === "string" && /^([\x00-\x20]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]|[\t\r\n])/.test(text)
    ? "'" + text : text;
  return '"' + neutral.replaceAll('"', '""') + '"';
}

export function exportTable(result: Result) {
  const data = [["Key", "Group", "Value", "Rows", "Denominator"],
    ...result.points.map(p => [p.key, p.group, p.value, p.rows, p.denominator])];
  download("prismlab-aggregates.csv", data.map(row => row.map(csvCell).join(",")).join("\r\n"), "text/csv");
}

const htmlText = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export async function exportStory(project: Project, renderChart: (card: Project["cards"][number]) => Promise<string>) {
  const sections: string[] = [];
  let size = 0;
  for (const card of project.cards) {
    const chart = await renderChart(card);
    const article = `<article><h2>${htmlText(card.title)}</h2><p>${htmlText(card.claim)}</p>
      <p>${htmlText(card.evidence.method)}: ${htmlText(card.evidence.value)} ${htmlText(card.evidence.query.unit)}
      · ${card.evidence.rows} matching rows</p>
      <img alt="${htmlText(card.evidence.method)} chart" width="780" height="360" src="data:image/svg+xml,${encodeURIComponent(chart)}">
      <p>${htmlText(card.caveat)}</p><p>${htmlText(card.alternative)}</p>
      <p>Source: ${htmlText(card.datasetName)} · Dataset SHA-256: ${htmlText(card.evidence.datasetDigest)}</p>
      <p>Query SHA-256: ${htmlText(card.evidence.queryHash)}</p>
      <pre>${htmlText(JSON.stringify({ query: card.evidence.query, selection: card.evidence.selection }, null, 2))}</pre>
      <table><thead><tr><th>Key</th><th>Group</th><th>Value</th></tr></thead><tbody>
      ${card.points.map(point => `<tr><td>${htmlText(point.key)}</td><td>${htmlText(point.group)}</td><td>${htmlText(point.value)}</td></tr>`).join("")}
      </tbody></table></article>`;
    size += new Blob([article]).size;
    if (size > 2 * 1024 * 1024) throw new Error("The story exceeds the 2 MiB HTML export limit.");
    sections.push(article);
  }
  const article = sections.join("");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>PrismLab story</title><style>body{font:1rem/1.6 system-ui;margin:3rem auto;max-width:70ch;padding:0 1rem;color:#172522}article{margin:2rem 0;padding:1rem;border-top:1px solid #784}img{width:100%;height:auto}td,th{padding:.25rem .7rem;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>PrismLab story</h1>${article}</html>`;
  if (new Blob([html]).size > 2 * 1024 * 1024) throw new Error("The story exceeds the 2 MiB HTML export limit.");
  download("prismlab-story.html", html, "text/html");
}

export async function createFact(project: Project, result: Result, selection?: Selection) {
  const { summary } = result;
  return {
    datasetDigest: project.dataset.digest, datasetRevision: datasetRevision(project.dataset),
    queryHash: await digest(JSON.stringify({ query: project.query, selection })), query: project.query, selection,
    value: summary.value, numerator: summary.numerator, denominator: summary.denominator, rows: summary.rows,
    method: describe(project.query), limitations: [
      "Missing or invalid X values are omitted.",
      project.query.missing === "exclude" ? "Missing or invalid measures are excluded." : "Missing or invalid measures are treated as zero.",
      result.truncated ? "The chart shows the first 5,000 ordered groups." : "",
    ].filter(Boolean).join(" "),
  };
}
