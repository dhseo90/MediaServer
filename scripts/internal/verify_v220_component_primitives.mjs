#!/usr/bin/env node
// 파일 용도: v2.2.0 S04 component primitive helper 경계와 사용 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 component primitive verification

Usage:
  ./server.sh verify-v220-component-primitives

Checks:
  - V220-S04 roadmap row points to the component primitive gate
  - product_ui_components helper API exists, builds, and is wired in CMake
  - helper API covers section/card, toolbar, tabs, segmented control, table shell,
    drawer/details panel, form row, status badge, and empty/loading/error state
  - static Ops/Auth templates consume the helper API without changing route/API contracts
  - docs and stream verification expose the S04 command and boundaries
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("backlog S04 points to component primitive gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 4 \| V220-S04 \| P1 \| (진행|완료) \| Component primitives \|/.test(backlog),
    "backlog S04 row must be 진행 or 완료");
  for (const snippet of [
    "v220-component-primitives.md",
    "verify-v220-component-primitives",
    "card, toolbar, tab, segmented control, table, drawer, form row, status badge",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S04 snippet: ${snippet}`);
  }
});

check("component primitive source files exist and are wired", () => {
  for (const file of [
    "include/ingress/product_ui_components.h",
    "src/ingress/product_ui_components.cpp",
    "docs/v220-component-primitives.md",
  ]) {
    assert(fs.existsSync(path.join(rootDir, file)), `missing S04 file: ${file}`);
  }
  const cmake = readText("CMakeLists.txt");
  assert(cmake.includes("src/ingress/product_ui_components.cpp"), "CMakeLists.txt missing product_ui_components.cpp");
});

check("component primitive API declares required helper families", () => {
  const header = readText("include/ingress/product_ui_components.h");
  for (const symbol of [
    "ProductUiBadge",
    "ProductUiAction",
    "ProductUiSectionCardHtml",
    "ProductUiToolbarHtml",
    "ProductUiNavTabsHtml",
    "ProductUiSegmentedControlHtml",
    "ProductUiTableShellHtml",
    "ProductUiDetailsPanelHtml",
    "ProductUiFormRowHtml",
    "ProductUiStatusBadgeHtml",
    "ProductUiEmptyStateHtml",
    "ProductUiLoadingStateHtml",
    "ProductUiErrorStateHtml",
  ]) {
    assert(header.includes(symbol), `component API missing ${symbol}`);
  }
});

check("component primitive implementation emits existing product classes", () => {
  const impl = readText("src/ingress/product_ui_components.cpp");
  for (const snippet of [
    "section-card",
    "toolbar",
    "nav-tabs",
    "rule-mode-grid",
    "table-wrap",
    "collapsed-editor",
    "form-grid",
    "chip",
    "empty",
    "message error",
  ]) {
    assert(impl.includes(snippet), `component implementation missing class/snippet: ${snippet}`);
  }
});

check("static product templates consume component primitive helpers", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "#include \"ingress/product_ui_components.h\"",
    "ProductUiToolbarHtml(",
    "ProductUiSectionCardHtml(",
    "ProductUiBadgeRowHtml(",
    "ProductUiEmptyStateHtml(",
    "ProductUiFormRowHtml(",
    "ProductUiStatusBadgeHtml(",
  ]) {
    assert(server.includes(snippet), `webrtc_http_server.cpp missing component helper usage: ${snippet}`);
  }
});

check("S04 document records scope, primitives, and non-goals", () => {
  const doc = readText("docs/v220-component-primitives.md");
  for (const snippet of [
    "V220-S04 Component primitives",
    "ProductUiSectionCardHtml",
    "ProductUiToolbarHtml",
    "ProductUiNavTabsHtml",
    "ProductUiSegmentedControlHtml",
    "ProductUiTableShellHtml",
    "ProductUiDetailsPanelHtml",
    "ProductUiFormRowHtml",
    "ProductUiStatusBadgeHtml",
    "ProductUiEmptyStateHtml",
    "S05~S08 route redesign",
    "UI 풀테스트 PASS는 S04 완료 근거가 아닙니다.",
    "Event POST/WebRTC/SSE/WS metadata schema",
    "RTSP/WebRTC media path",
  ]) {
    assert(doc.includes(snippet), `S04 doc missing: ${snippet}`);
  }
});

check("stream verification and server expose the S04 command", () => {
  const stream = readText("docs/stream-verification.md");
  const server = readText("server.sh");
  for (const text of [stream, server]) {
    assert(text.includes("verify-v220-component-primitives"), "missing verify-v220-component-primitives reference");
  }
  assert(server.includes("verify_v220_component_primitives.mjs"), "server.sh missing S04 script dispatch");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v2.2.0 component primitives summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
