#!/usr/bin/env node
// 파일 용도: actual pixel/geometry visual evaluator의 positive/negative 계약을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { evaluateVisualArtifact, evaluateVisualMatrix } from "./v390_ui_visual_evidence.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempRoot = path.join(rootDir, ".tmp-v390-visual-contract");
const checks = [];
cleanup();
fs.mkdirSync(tempRoot, { recursive: true });
process.on("exit", cleanup);

check("actual screenshot and browser metrics compute PASS without accepting a status input", () => {
  const candidate = makeProbe(390, "light", "operator");
  assert(candidate.payload.status === "PASS", candidate.payload.failures.join(","));
  assert(candidate.payload.screenshot.width === 390 && candidate.payload.screenshot.height === 844, "actual PNG dimensions missing");
  assert(candidate.payload.measurement.sha256.length === 64, "measurement hash missing");
});

check("four viewports and light/dark matrix is exact", () => {
  const probes = [320, 390, 760, 1180].flatMap(width => ["light", "dark"].map(theme => makeProbe(width, theme, width === 1180 ? "viewer" : "operator")));
  const matrix = evaluateVisualMatrix(probes);
  assert(matrix.status === "PASS", JSON.stringify(matrix));
  assert(matrix.observedVariants.length === 8 && matrix.missingVariants.length === 0, "responsive/theme matrix incomplete");
  const missing = evaluateVisualMatrix(probes.slice(1));
  assert(missing.status === "FAIL" && missing.missingVariants.includes("320:light"), "missing viewport/theme passed");
});

check("clipping low contrast and missing focus are computed failures", () => {
  const clipping = makeProbe(390, "light", "operator", value => { value.document.scrollWidth = 500; });
  assert(clipping.payload.failures.includes("horizontal-overflow"), "horizontal clipping passed");
  const contrast = makeProbe(390, "light", "operator", value => {
    value.textSamples[0] = { foreground: "rgb(120, 120, 120)", background: "rgb(130, 130, 130)", fontSizePx: 14, fontWeight: "400" };
  });
  assert(contrast.payload.failures.includes("contrast-threshold-failed"), "low contrast passed");
  const focus = makeProbe(390, "light", "operator", value => { value.focusSamples = []; });
  assert(focus.payload.failures.includes("focus-visible-missing"), "missing focus passed");
});

check("video overlay must be ready visible and contained", () => {
  const valid = makeProbe(390, "dark", "viewer", null, true);
  assert(valid.payload.status === "PASS", valid.payload.failures.join(","));
  const escaped = makeProbe(390, "dark", "viewer", value => { value.overlays[0].rect.right = 500; }, true);
  assert(escaped.payload.failures.includes("overlay-missing-or-outside-video"), "out-of-bounds overlay passed");
});

check("PNG dimensions and measured viewport hash cannot be replaced by a self-declared PASS", () => {
  const candidate = makeProbe(390, "light", "operator", value => { value.viewport.width = 320; });
  assert(candidate.payload.status === "FAIL", "forged viewport became PASS");
  assert(candidate.payload.failures.includes("viewport-observation-mismatch") && candidate.payload.failures.includes("screenshot-viewport-dimension-mismatch"),
    "viewport/hash drift reasons missing");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 visual evidence contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- actualBrowserUiFulltest: not-run-by-this-contract");
cleanup();
process.exit(failed.length === 0 ? 0 : 1);

function makeProbe(width, theme, role, mutate = null, requireVideoOverlay = false) {
  const id = `${width}-${theme}-${role}-${checks.length}-${Math.random().toString(16).slice(2)}`;
  const screenshotPath = path.join(tempRoot, `${id}.png`);
  fs.writeFileSync(screenshotPath, createPng(width, 844));
  const measurement = {
    schema: "media-server.ui-browser-visual-measurement.v1",
    route: role === "viewer" ? "/client/live" : "/ops",
    viewport: { width, height: 844, devicePixelRatio: 1 },
    theme,
    document: { scrollWidth: width, scrollHeight: 844, clientWidth: width, clientHeight: 844 },
    target: { selector: "body", visible: true, rect: { left: 0, top: 0, right: width, bottom: 844, width, height: 844 } },
    textSamples: [{ foreground: theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)", background: theme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)", fontSizePx: 14, fontWeight: "400" }],
    focusSamples: [
      { tag: "button", id: "a", testId: "", visible: true, outlineStyle: "solid", outlineWidth: "2px", boxShadow: "none" },
      { tag: "a", id: "b", testId: "", visible: true, outlineStyle: "solid", outlineWidth: "2px", boxShadow: "none" },
    ],
    videos: requireVideoOverlay ? [{ rect: { left: 10, top: 10, right: width - 10, bottom: 400 }, readyState: 4, videoWidth: 1920, videoHeight: 1080 }] : [],
    overlays: requireVideoOverlay ? [{ rect: { left: 10, top: 10, right: width - 10, bottom: 400 }, tag: "canvas" }] : [],
  };
  if (mutate) mutate(measurement);
  return {
    id,
    role,
    payload: evaluateVisualArtifact({
      screenshotPath,
      measurement,
      caseId: id,
      correlationId: `corr-${id}`,
      expectedViewport: { width, height: 844 },
      expectedTheme: theme,
      requireVideoOverlay,
    }),
  };
}

function createPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const value = Buffer.alloc(data.length + 12);
  value.writeUInt32BE(data.length, 0);
  typeBytes.copy(value, 4);
  data.copy(value, 8);
  value.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return value;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); }
}

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
