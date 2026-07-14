import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([
  { id: "transport-main", path: "src/ingress/webrtc_http_server.cpp" },
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
  const sources = orderedSources(rootOrReader).map(item => item.source);
  return sources.join("\n");
}

export function resolveWebRtcHttpServerSource(rootOrReader = defaultRoot, options = {}) {
  const tokens = options.tokens;
  if (!Array.isArray(tokens) || tokens.length === 0 ||
      tokens.some(token => typeof token !== "string" || token.length === 0)) {
    throw new Error("source token resolution failed");
  }
  const matches = orderedSources(rootOrReader, options.layout || WEBRTC_HTTP_SERVER_SOURCE_LAYOUT)
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
