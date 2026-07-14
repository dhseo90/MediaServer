import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([
  { id: "transport-main", role: "implementation", path: "src/ingress/webrtc_http_server.cpp" },
  { id: "ops-foundation", role: "implementation", path: "src/ingress/webrtc_http_server_ops_foundation.cpp" },
  { id: "ops-workflows", role: "implementation", path: "src/ingress/webrtc_http_server_ops_workflows.cpp" },
  { id: "ops-incidents", role: "implementation", path: "src/ingress/webrtc_http_server_ops_incidents.cpp" },
  { id: "transport-runtime", role: "implementation", path: "src/ingress/webrtc_http_server_runtime.cpp" },
  { id: "private-detail", role: "declaration", path: "src/ingress/webrtc_http_server_detail.h" },
]);

function sourceReader(rootOrReader = defaultRoot) {
  if (typeof rootOrReader === "function") return rootOrReader;
  if (typeof rootOrReader !== "string" || rootOrReader.length === 0) {
    throw new Error("source root or reader is required");
  }
  return file => fs.readFileSync(path.join(rootOrReader, file), "utf8");
}

function orderedSources(rootOrReader = defaultRoot, layout = WEBRTC_HTTP_SERVER_SOURCE_LAYOUT) {
  if (!Array.isArray(layout) || layout.length === 0) throw new Error("source token resolution failed");
  const paths = layout.map(item => item.path);
  if (new Set(paths).size !== paths.length) throw new Error("duplicate source layout path");
  const read = sourceReader(rootOrReader);
  return layout.map(item => {
    const source = read(item.path);
    if (typeof source !== "string") throw new Error(`source reader returned non-text: ${item.path}`);
    return { ...item, source };
  });
}

export function readWebRtcHttpServerBundle(rootOrReader = defaultRoot) {
  const sources = orderedSources(rootOrReader);
  const marker = /^\/\/ WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN (\d+) (type|constant|prototype|function)\r?\n/gm;
  const chunks = [];
  let prefix = "";
  for (const item of sources) {
    const matches = [...item.source.matchAll(marker)];
    if (matches.length === 0) throw new Error(`logical source marker missing: ${item.path}`);
    if (item.id === "private-detail") prefix = item.source.slice(0, matches[0].index);
    for (let index = 0; index < matches.length; ++index) {
      const match = matches[index];
      const kind = match[2];
      if (kind === "prototype") continue;
      const end = index + 1 < matches.length ? matches[index + 1].index : item.source.length;
      chunks.push({
        line: Number.parseInt(match[1], 10),
        kind,
        source: item.source.slice(match.index + match[0].length, end).trimEnd(),
      });
    }
  }
  chunks.sort((left, right) => left.line - right.line ||
    ["type", "constant", "function"].indexOf(left.kind) -
      ["type", "constant", "function"].indexOf(right.kind));
  return `${prefix.trimEnd()}\n\n${chunks.map(item => item.source).join("\n\n")}\n`;
}

export function resolveWebRtcHttpServerSource(rootOrReader = defaultRoot, options = {}) {
  const tokens = options.tokens;
  if (!Array.isArray(tokens) || tokens.length === 0 ||
      tokens.some(token => typeof token !== "string" || token.length === 0)) {
    throw new Error("source token resolution failed");
  }
  const scope = options.scope || "implementation";
  if (!["implementation", "declaration", "all"].includes(scope)) {
    throw new Error("source token resolution failed");
  }
  const matches = orderedSources(rootOrReader, options.layout || WEBRTC_HTTP_SERVER_SOURCE_LAYOUT)
    .filter(item => scope === "all" || item.role === scope || item.role === undefined)
    .filter(item => tokens.every(token => item.source.includes(token)));
  if (matches.length !== 1) throw new Error("source token resolution failed");
  return { ...matches[0], file: matches[0].path };
}

export function webrtcHttpServerSourceMetrics(rootOrReader = defaultRoot) {
  const files = orderedSources(rootOrReader).map(item => {
    const bytes = Buffer.byteLength(item.source);
    const lines = item.source.length === 0 ? 0 :
      item.source.split(/\r?\n/).length - (item.source.endsWith("\n") ? 1 : 0);
    return {
      id: item.id,
      file: item.path,
      sha256: crypto.createHash("sha256").update(item.source).digest("hex"),
      bytes,
      lines,
    };
  });
  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, item) => sum + item.bytes, 0),
    totalLines: files.reduce((sum, item) => sum + item.lines, 0),
    largestFileLines: Math.max(0, ...files.map(item => item.lines)),
    files,
  };
}

export function copyWebRtcHttpServerSourceFixture(targetRoot, sourceRoot = defaultRoot) {
  if (typeof targetRoot !== "string" || targetRoot.length === 0 ||
      typeof sourceRoot !== "string" || sourceRoot.length === 0) {
    throw new Error("source fixture root is required");
  }
  for (const item of WEBRTC_HTTP_SERVER_SOURCE_LAYOUT) {
    const source = path.join(sourceRoot, item.path);
    const target = path.join(targetRoot, item.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}
