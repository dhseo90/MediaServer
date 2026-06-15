#!/usr/bin/env node
// 파일 용도: v2.6.0 S04 Runtime dashboard baseline/sparkline 후보와 비범위 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const pageScripts = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");

check("roadmap records V260-S04 runtime dashboard trend boundary", () => {
  assert(/\| 4 \| V260-S04 \| P2 \| (진행|완료) \| Runtime dashboard trends \|/.test(backlog),
    "backlog V260-S04 row must be 진행 or 완료 while S04 is under development");
  for (const snippet of [
    "Runtime dashboard baseline/sparkline",
    "장기 녹화 없이",
    "verify-v260-runtime-dashboard-trends",
  ]) {
    assertIncludes(backlog, snippet, "backlog S04 boundary");
  }
});

check("/ops/dashboard renders runtime trend card without persistent storage claims", () => {
  for (const snippet of [
    "data-testid=\"ops-runtime-trend-card\"",
    "data-runtime-trend-scope=\"page-session-only\"",
    "data-longrun-evidence=\"not-provided\"",
    "id=\"dashRuntimeTrendBadges\"",
    "id=\"dashRuntimeTrendText\"",
    "id=\"dashRuntimeTrendSparkline\"",
    "id=\"dashRuntimeTrendBaseline\"",
    "런타임 추세",
  ]) {
    assertIncludes(server, snippet, "ops dashboard S04 trend card");
  }
});

check("dashboard script keeps trend samples page-local and renders baseline deltas", () => {
  for (const snippet of [
    "MAX_RUNTIME_TREND_SAMPLES",
    "dashboardRuntimeTrendSamples",
    "runtimeTrendSampleFrom",
    "runtimeTrendSparklineHtml",
    "renderDashboardRuntimeTrend",
    "page-session-only",
    "longrun evidence 아님",
    "renderDashboardRuntimeTrend(runtime, sourceHealth, eventsStatus)",
  ]) {
    assertIncludes(pageScripts, snippet, "dashboard runtime trend script");
  }
  for (const forbidden of [
    "localStorage.setItem('mediaServerRuntime",
    "localStorage.setItem(\"mediaServerRuntime",
    "sessionStorage.setItem('mediaServerRuntime",
    "sessionStorage.setItem(\"mediaServerRuntime",
    "indexedDB.open('mediaServerRuntime",
    "indexedDB.open(\"mediaServerRuntime",
    "/ops/api/runtime/trends",
    "/lab/runtime/trends",
  ]) {
    assert(!pageScripts.includes(forbidden) && !server.includes(forbidden),
      `runtime trend must stay page-local; forbidden snippet present: ${forbidden}`);
  }
});

check("CSS and UI smoke track the runtime trend card", () => {
  for (const snippet of [
    ".runtime-sparkline",
    ".runtime-spark-bar",
    ".runtime-trend-baseline",
  ]) {
    assertIncludes(css, snippet, "runtime trend CSS");
  }
  for (const snippet of [
    "data-testid=\"ops-runtime-trend-card\"",
    "id=\"dashRuntimeTrendSparkline\"",
    "id=\"dashRuntimeTrendBaseline\"",
    "runtimeTrendSparklineHtml",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke S04 marker");
  }
});

check("feature inventory and command catalog track S04", () => {
  for (const snippet of [
    "| V260-S04 Runtime dashboard trends | `UI-048`, `EVT-048`, `LAB-072`, `SAFE-055` | `verify-v260-runtime-dashboard-trends` |",
    "| UI-048 | `/ops/dashboard` Runtime dashboard trend card |",
    "| EVT-048 | dashboard runtime baseline/sparkline summary |",
    "| LAB-072 | V260-S04 runtime dashboard trend static guard |",
    "| SAFE-055 | V260-S04 runtime trend storage/schema boundary |",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S04 row");
  }
  assertIncludes(streamVerification, "verify-v260-runtime-dashboard-trends", "stream verification S04 command");
  assertIncludes(serverSh, "verify-v260-runtime-dashboard-trends", "server.sh S04 command");
  assertIncludes(serverSh, "verify_v260_runtime_dashboard_trends.mjs", "server.sh S04 script target");
});

check("S04 keeps longrun, schema, media, and client exposure side effects absent", () => {
  for (const forbidden of [
    "longrun evidence PASS",
    "30분 테스트 PASS 완료",
    "120분 테스트 PASS 완료",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
    "/client/api/runtime/trends",
  ]) {
    assert(!server.includes(forbidden) &&
      !pageScripts.includes(forbidden) &&
      !inventory.includes(forbidden) &&
      !backlog.includes(forbidden),
    `forbidden S04 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.6.0 S04 runtime dashboard trends 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.6.0 S04 runtime dashboard trends 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
