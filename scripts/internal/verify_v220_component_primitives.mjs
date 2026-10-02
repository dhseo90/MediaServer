#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 UI primitives 계약·구현 연결을 확인한다. CLI 이름은 호환을 위해 유지한다.

import { validateUiComponentDocumentation } from "./documentation_contract_lib.mjs";
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

검사 범위:
  - 현행 UI 기술 안내와 정확한 명령 연결
  - 기존 소스·helper·모듈 계약
  - 정적 결과를 실제 UI/장시간 PASS로 사용하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("현행 UI 안내·정책·명령 연결", () => {
  const errors = validateUiComponentDocumentation({
    document: readText("docs/product-shell-component-examples.md"), kind: "primitives",
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});

check("component primitive source files exist and are wired", () => {
  for (const file of [
    "include/ingress/product_ui_components.h",
    "src/ingress/product_ui_components.cpp",
    "docs/product-shell-component-examples.md",
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
  const server = readWebRtcHttpServerBundle(readText);
  assert(server.includes('#include "ingress/product_ui_components.h"'), "missing component helper include");
  // renderer 이동 뒤에도 실제 소비 파일을 확인한다. 문서·다른 helper의 동일 문자열로 대체하지 않는다.
  for (const [file, snippets] of [
    ["src/ingress/product_ui_server_pages.cpp", ["ProductUiToolbarHtml(", "ProductUiSectionCardHtml(", "ProductUiBadgeRowHtml(", "ProductUiEmptyStateHtml("]],
    ["src/ingress/product_ui_auth_pages.cpp", ["ProductUiFormRowHtml(", "ProductUiStatusBadgeHtml("]],
  ]) {
    const source = readText(file);
    for (const snippet of snippets) assert(source.includes(snippet), `${file} missing component helper usage: ${snippet}`);
  }
});

check("component guide documents public helper APIs", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  for (const snippet of [
    "ProductUiSectionCardHtml",
    "ProductUiToolbarHtml",
    "ProductUiNavTabsHtml",
    "ProductUiSegmentedControlHtml",
    "ProductUiTableShellHtml",
    "ProductUiDetailsPanelHtml",
    "ProductUiFormRowHtml",
    "ProductUiStatusBadgeHtml",
    "ProductUiEmptyStateHtml",
  ]) {
    assert(doc.includes(snippet), `S04 doc missing: ${snippet}`);
  }
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
