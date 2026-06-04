#!/usr/bin/env node
// 파일 용도: v2.2.0 UI architecture inventory 문서와 S01 roadmap 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 UI architecture inventory verification

Usage:
  ./server.sh verify-v220-ui-architecture-inventory

Checks:
  - V220-S01 roadmap row points to this inventory gate
  - inventory covers C++ string UI source files, public helper APIs, route/template boundaries
  - inventory records component primitive candidates and unchanged product contracts
  - server.sh exposes this verifier
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("backlog S01 points to UI architecture inventory gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 1 \| V220-S01 \| P0 \| (진행|완료) \| UI architecture inventory \|/.test(backlog),
    "backlog S01 row must be 진행 or 완료");
  for (const snippet of [
    "verify-v220-ui-architecture-inventory",
    "v220-ui-architecture-inventory.md",
    "C++ 문자열 UI 파일, shared token, page script, asset helper, route별 template 경계",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S01 snippet: ${snippet}`);
  }
});

check("inventory document covers required UI source files", () => {
  const doc = readText("docs/v220-ui-architecture-inventory.md");
  for (const file of [
    "src/ingress/webrtc_http_server.cpp",
    "src/ingress/product_ui_css.cpp",
    "src/ingress/product_ui_page_scripts.cpp",
    "src/ingress/product_ui_js.cpp",
    "src/ingress/product_ui_assets.cpp",
    "include/ingress/product_ui_css.h",
    "include/ingress/product_ui_js.h",
    "include/ingress/product_ui_page_scripts.h",
    "include/ingress/product_ui_assets.h",
  ]) {
    assert(doc.includes(file), `inventory missing file: ${file}`);
    assert(fs.existsSync(path.join(rootDir, file)), `inventory references missing file: ${file}`);
  }
});

check("inventory document covers public helper API boundaries", () => {
  const doc = readText("docs/v220-ui-architecture-inventory.md");
  for (const symbol of [
    "ProductDesignTokensCss",
    "ProductUiCss",
    "ClientShellCss",
    "ProductThemeBootScript",
    "ProductSharedUiScript",
    "AppendProductThemeScript",
    "AppendClientAccessRequestScript",
    "AppendClientShellScript",
    "AppendOpsShellScript",
    "AppendOpsSourcesPageScript",
    "AppendOpsUsersPageScript",
    "ProductThemeToggleButtonHtml",
    "ProductLanguageSelectHtml",
    "ProductBrandMarkSvg",
    "ProductNavIconSvg",
    "ProductAccountAvatarSvg",
  ]) {
    assert(doc.includes(symbol), `inventory missing public helper symbol: ${symbol}`);
  }
});

check("inventory document covers route and template boundaries", () => {
  const doc = readText("docs/v220-ui-architecture-inventory.md");
  for (const snippet of [
    "/setup",
    "/invite/setup",
    "/login",
    "/password/change",
    "/client/request-access",
    "/ops/home",
    "/ops/dashboard",
    "/ops/events",
    "/ops/vlm",
    "/ops/sources",
    "/ops/rules",
    "/ops/users",
    "/client/live",
    "/client/dashboard",
    "/client/events",
    "OpsShellPageHtml",
    "ClientShellPageHtml",
    "BuildOpsSourcesPageHtml",
    "BuildOpsUsersPageHtml",
    "AppendOpsRulesPage",
  ]) {
    assert(doc.includes(snippet), `inventory missing route/template snippet: ${snippet}`);
  }
});

check("inventory document lists component primitive candidates", () => {
  const doc = readText("docs/v220-ui-architecture-inventory.md");
  for (const primitive of [
    "ProductShell",
    "PageSection",
    "ActionToolbar",
    "ResponsiveTable",
    "DetailDrawerPanel",
    "FormGrid",
    "StatusBadgeRow",
    "EmptyLoadingErrorState",
    "DebugDetails",
    "ResponsiveTaskShell",
  ]) {
    assert(doc.includes(primitive), `inventory missing primitive candidate: ${primitive}`);
  }
});

check("inventory document keeps S01 non-implementation and contract boundaries explicit", () => {
  const doc = readText("docs/v220-ui-architecture-inventory.md");
  for (const snippet of [
    "route/API/schema/Event POST/WebRTC/SSE/WS metadata/RTSP-WebRTC media",
    "Event POST payload",
    "WebRTC DataChannel payload",
    "SSE/WS metadata schema",
    "RTSP/WebRTC media path",
    "Auth/session/scope contract",
    "Rule/Profile payload schema",
    "`/ops/rules` smoke selector",
    "client/viewer source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics",
    "실제 브라우저 UI",
    "visual redesign mockup",
    "30분 soak",
    "120분 longrun은 실행하지 않습니다.",
  ]) {
    assert(doc.includes(snippet), `inventory missing contract boundary: ${snippet}`);
  }
});

check("stream verification exposes the S01 inventory command", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-v220-ui-architecture-inventory",
    "v2.2.0 UI architecture inventory",
    "verify-ops-client-ui --browser-mode static",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S01 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S01 inventory verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v220-ui-architecture-inventory"), "server.sh missing verify-v220-ui-architecture-inventory");
  assert(server.includes("verify_v220_ui_architecture_inventory.mjs"), "server.sh missing v2.2.0 UI inventory script dispatch");
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
console.log("== v2.2.0 UI architecture inventory summary ==");
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
