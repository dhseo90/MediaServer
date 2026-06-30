#!/usr/bin/env node
// 파일 용도: v3.5.0 Step 8 Client Impact Forecast 구현, UI, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 Client Impact Forecast verification

Usage:
  ./server.sh verify-v350-client-impact-forecast

Checks:
  - /client/api/views/{id}/events and dashboard payloads attach a PublishedView-scoped clientImpactForecast
  - client live/dashboard/events render only viewer-safe source/view/command plan impact summaries
  - forecast hides source URL, raw locator, raw JSON, debug, credential, operator notes, command plan details, and action controls
  - forecast does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, or search/metrics
  - backlog, stream verification, release records, feature inventory, ops/client smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-client-impact-forecast";
const schema = "media-server.client.v350-impact-forecast.v1";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  clientScript: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("client API emits the v3.5 viewer-safe impact forecast schema", () => {
  for (const snippet of [
    "struct ClientImpactForecast",
    "ClientImpactForecastFor",
    "AppendClientImpactForecastJson",
    "ClientImpactForecastJson",
    schema,
    "\\\"clientImpactForecast\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceImpact\\\":",
    "\\\"viewImpact\\\":",
    "\\\"commandPlanImpact\\\":",
    "\\\"liveImpact\\\":",
    "\\\"dashboardImpact\\\":",
    "\\\"eventDigestImpact\\\":",
    "\\\"summaryText\\\":",
    "\\\"severity\\\":",
    "\\\"timelineHint\\\":",
    "\\\"digestItems\\\":",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"operatorMaterialIncluded\\\":false",
    "\\\"commandPlanDetailsIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"eventSchemaChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "v350 client impact forecast API");
  }
  for (const forbidden of [
    "/client/api/impact-forecast",
    "media-server.ops.v350-impact-forecast",
    "clientImpactForecast.sourceUrl",
    "clientImpactForecast.rawLocator",
    "clientImpactForecast.rawJson",
    "clientImpactForecast.debugMaterial",
    "clientImpactForecast.credentialMaterial",
    "clientImpactForecast.operatorNote",
    "clientImpactForecast.commandPlanCandidates",
    "clientImpactForecast.actionRoute",
  ]) {
    assert(!files.server.includes(forbidden), `client impact forecast API must not include ${forbidden}`);
  }
});

check("client renderer shows forecast without raw/source/debug/operator material", () => {
  for (const snippet of [
    "renderClientImpactForecast",
    "clientImpactForecast",
    "data-testid=\"client-impact-forecast\"",
    "data-client-impact-forecast=\"viewer-safe\"",
    "viewer-safe client impact forecast",
    schema,
    "digestItems",
    "sourceImpact",
    "viewImpact",
    "commandPlanImpact",
    "liveImpact",
    "dashboardImpact",
    "eventDigestImpact",
    "summaryText",
    "timelineHint",
  ]) {
    assertIncludes(files.clientScript, snippet, "client impact forecast renderer");
  }
  for (const forbidden of [
    "sourceUrl",
    "developerUrl",
    "rawLocator",
    "rawJson",
    "debugCounters",
    "credentialMaterial",
    "operatorNote",
    "operatorNotes",
    "commandPlanCandidates",
    "stagedChangePlans",
    "drillRunLedgerEntries",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!files.clientScript.includes(`clientImpactForecast.${forbidden}`), `client impact forecast renderer must not read ${forbidden}`);
  }
});

check("forecast styling and ops/client smoke track Step 8 markers", () => {
  for (const snippet of [
    ".client-impact-forecast",
    ".client-safe-digest-list",
    ".client-safe-digest-item",
  ]) {
    assertIncludes(files.css, snippet, "client impact forecast CSS");
  }
  for (const snippet of [
    "client-impact-forecast",
    "clientImpactForecast",
    "viewer-safe client impact forecast",
    schema,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.5 Step 8 marker");
  }
});

check("roadmap records v3.5 Step 8 without overclaiming client notice", () => {
  for (const snippet of [
    "| 8 | v3.5.0 (8) Client Impact Forecast | P1 | 완료 |",
    "## v3.5.0 Step 8 개발 기록",
    "ClientImpactForecastJson",
    "renderClientImpactForecast",
    `\`./server.sh ${command}\``,
    "Client-safe Operations Notice 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 8");
  }
});

check("stream verification exposes v3.5 Step 8 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (8) | \`./server.sh ${command}\` | Client Impact Forecast.`,
    "/client/api/views/{id}/events",
    "clientImpactForecast",
    "source/view/command plan",
    "client live/dashboard/event digest",
    "source URL/raw locator/raw JSON/debug/credential/operator material",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 8");
  }
});

check("feature inventory and release records map v3.5 Step 8", () => {
  for (const snippet of [
    `v3.5.0 (8) Client Impact Forecast | \`UI-083\`, \`CLIENT-031\`, \`SAFE-142\`, \`OPS-109\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-083 | V350 Step 8 Client Impact Forecast UI",
    "CLIENT-031 | V350 Step 8 client impact forecast API/UI",
    "SAFE-142 | V350 Step 8 client impact forecast boundary",
    "OPS-109 | V350 Step 8 Client Impact Forecast 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 8");
  }
  for (const snippet of [
    "V350 Client Impact Forecast",
    `\`./server.sh ${command}\``,
    "v350 Step 8 RED client impact forecast gate",
    "v350 Step 8 client impact forecast final",
    "v350 Step 8 UI 풀테스트",
    "v350 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_client_impact_forecast.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-083", "CLIENT-031", "SAFE-142", "OPS-109"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_client_impact_forecast.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 client impact forecast ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (8)");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed fields: sourceImpact, viewImpact, commandPlanImpact, liveImpact, dashboardImpact, eventDigestImpact, summaryText, severity, timelineHint");
console.log("- hidden fields: source URL, raw locator, raw JSON, debug material, credential material, operator material, command plan details, action controls");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
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
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
