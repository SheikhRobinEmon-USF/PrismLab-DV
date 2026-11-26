import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const directory = path.resolve("out");
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".wasm":"application/wasm", ".json":"application/json", ".txt":"text/plain", ".csv":"text/csv",
  ".geojson":"application/geo+json", ".svg":"image/svg+xml",
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (!url.pathname.startsWith(base + "/")) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(base.length));
    let file = path.resolve(directory, "." + relative);
    if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(404).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const info = await stat(file);
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Content-Length": info.size });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end("File not found"); }
}).listen(4173, "127.0.0.1");
