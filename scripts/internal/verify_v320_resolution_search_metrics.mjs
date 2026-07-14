#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.2.0 Step 10 Resolution Search & Metrics 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Resolution Search & Metrics verification

Usage:
  ./server.sh verify-v320-resolution-search-metrics

Checks:
  - /ops/api/events/reviews returns Ops-only resolutionSearchMetrics inside unifiedResolutionWorkspace
  - the view model exposes active resolution filters, saved view presets, and operations metric summary
  - /ops/events renders filter summary, saved views, metric cards, and boundary flags
  - the context does not write saved views, expose client/viewer material, or change EventRecord/Event POST/media schemas
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-resolution-search-metrics";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  implementationEvidence: readJson("test/fixtures/project_feature_implementation_evidence.json"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("ops review API attaches Step 10 resolution search metrics to unified workspace", () => {
  const start = files.server.indexOf("std::string OpsV320ResolutionSearchMetricsJson(");
  const end = files.server.indexOf("std::string OpsV320ResolutionSearchMetricsSummaryJson(", start);
  assert(start >= 0 && end > start, "EVT-070 resolution search metrics projection block missing");
  const evt070SearchMetricsBlock = files.server.slice(start, end);
  assertIncludes(evt070SearchMetricsBlock, "media-server.ops.v320-resolution-search-metrics.v1", "EVT-070 block-scoped canonical search metrics projection");
  assert(!evt070SearchMetricsBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt070SearchMetricsBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-070 search metrics must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/events", "OPS-078 canonical page route");
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-070 canonical review route");
  for (const snippet of [
    "OpsV320ResolutionSearchMetricsInfoFor",
    "OpsV320ResolutionSearchMetricsJson",
    "OpsV320ResolutionSearchMetricsSummaryJson",
    "media-server.ops.v320-resolution-search-metrics.v1",
    "\\\"resolutionSearchMetrics\\\":",
    "\\\"resolutionSearchMetricsSummary\\\":",
    "\\\"activeResolutionFilters\\\":",
    "\\\"savedViews\\\":",
    "\\\"operationsMetricSummary\\\":",
    "\\\"matchedQueueCount\\\":",
    "\\\"readyForApprovalCount\\\":",
    "\\\"blockedActionCount\\\":",
    "\\\"sourceRecheckCount\\\":",
    "\\\"reviewRequiredCount\\\":",
    "\\\"savedViewsPersisted\\\":false",
    "\\\"savedViewWritePerformed\\\":false",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 resolution search metrics server view model");
  }
});

check("resolution search metrics preserves schema, media, storage, and client boundaries", () => {
  for (const snippet of [
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"sourceUrlExposed\\\":false",
    "\\\"rawJsonExposed\\\":false",
    "\\\"debugMaterialExposed\\\":false",
    "\\\"clientDigestChanged\\\":false",
    "\\\"searchMetricsImplemented\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 resolution search metrics boundary flags");
  }
});

check("product UI script renders Step 10 filters, saved views, metrics, and boundaries", () => {
  const searchMetricsBlock = extractNamedFunctionBlock(files.pageScript, "renderV320ResolutionSearchMetrics");
  for (const snippet of [
    "renderV320ResolutionSearchMetrics",
    "resolutionSearchMetricsSummary",
    "resolutionSearchMetrics",
    "media-server.ops.v320-resolution-search-metrics.v1",
    "v320ResolutionSearchMetricsGrid",
    "data-v320-resolution-search-metrics",
    "data-v320-resolution-filter",
    "data-v320-saved-view",
    "data-v320-resolution-metric",
    "resolution filters",
    "saved views",
    "operations metric summary",
    "savedViewsPersisted",
    "savedViewWritePerformed",
  ]) {
    assertIncludes(searchMetricsBlock, snippet, "V320 resolution search metrics UI renderer block");
  }
  assertIncludes(searchMetricsBlock, "media-server.ops.v320-resolution-search-metrics.v1", "UI-069 block-scoped canonical product state");
  assertIncludes(searchMetricsBlock, "resolutionSearchMetricsSummary.rawJsonExposed === false", "UI-069 block-scoped raw JSON redaction contract");
  assertIncludes(searchMetricsBlock, "resolutionSearchMetricsSummary.sourceUrlExposed === false", "UI-069 block-scoped source URL redaction contract");
  assertIncludes(searchMetricsBlock, "resolutionSearchMetricsSummary.debugMaterialExposed === false", "UI-069 block-scoped debug material redaction contract");
  assertIncludes(searchMetricsBlock, "resolutionSearchMetricsSummary.viewerClientExposureAdded === false", "UI-069 block-scoped client viewer boundary contract");
  assert(!["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 no-write explicit absence oracle");
  assert(!["rawJsonPayload", "rawPayload", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl:", "sourceURL:", "sourceUrlValue", "rtsp://", "rtsps://"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 source-url-redaction explicit absence oracle");
  assert(!["providerApiCall(", "providerResponse", "rawProviderResponse", "providerMaterialExposed: true", "rawProviderMaterialExposed: true"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 provider-material explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 debug-redaction explicit absence oracle");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => searchMetricsBlock.includes(marker)), "UI-069 client-viewer-boundary explicit absence oracle");
  const unifiedWorkspaceBlock = extractNamedFunctionBlock(files.pageScript, "renderV320UnifiedOpsEventsWorkspace");
  assertIncludes(unifiedWorkspaceBlock, "/ops/events", "UI-069 exact route owner obligation");
});

check("Step 10 resolution search metrics CSS is responsive and scoped", () => {
  for (const snippet of [
    ".v320-resolution-search-metrics-grid",
    ".v320-resolution-search-card",
    ".v320-resolution-filter-list",
    ".v320-resolution-saved-views",
    ".v320-resolution-metric-card",
  ]) {
    assertIncludes(files.css, snippet, "V320 resolution search metrics CSS");
  }
});

check("ops static smoke tracks Step 10 resolution search metrics markers", () => {
  for (const snippet of [
    "ops-events-resolution-search-metrics",
    'data-testid="ops-v320-unified-events-workspace"',
    "v320ResolutionSearchMetricsGrid",
    "data-v320-resolution-search-metrics",
    "data-v320-resolution-filter",
    "data-v320-saved-view",
    "data-v320-resolution-metric",
    "resolutionSearchMetricsSummary",
    "resolutionSearchMetrics",
    "media-server.ops.v320-resolution-search-metrics.v1",
    "resolution filters",
    "saved views",
    "operations metric summary",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 10 scope without overclaim", () => {
  for (const snippet of [
    "| 10 | v3.2.0 (10) Resolution Search & Metrics | P2 | 완료 |",
    "resolution filters, saved views, 운영 metric summary",
    "`./server.sh verify-v320-resolution-search-metrics`",
    "Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 10 개발 기록",
    "media-server.ops.v320-resolution-search-metrics.v1",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 10");
  }
  for (const snippet of [
    "| v3.2.0 (10) | `./server.sh verify-v320-resolution-search-metrics` |",
    "Resolution Search & Metrics",
    "active resolution filters",
    "saved view presets",
    "operations metric summary",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 10");
  }
});

check("feature inventory and release records map v3.2 Step 10", () => {
  for (const snippet of [
    "v3.2.0 (10) Resolution Search & Metrics | `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078` | `verify-v320-resolution-search-metrics`, `verify-ops-client-ui`",
    "UI-069 | V320 Step 10 Resolution Search & Metrics UI",
    "EVT-070 | V320 Step 10 resolution search metrics view model",
    "SAFE-111 | V320 Step 10 resolution search metrics boundary",
    "OPS-078 | V320 Step 10 Resolution Search & Metrics 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 10");
  }
  for (const snippet of [
    "V320 Resolution Search & Metrics",
    "`./server.sh verify-v320-resolution-search-metrics`",
    "v320 Step 10 RED resolution search metrics gate",
    "v320 Step 10 resolution search metrics final",
    "v320 Step 10 UI 풀테스트",
    "v320 Step 10 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 10");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 10 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_resolution_search_metrics.mjs", "server.sh script dispatch");
  assertExactVerifierMapping(
    files.implementationEvidence,
    "UI-069",
    command,
    "scripts/internal/verify_v320_resolution_search_metrics.mjs",
  );
  for (const id of ["UI-069", "EVT-070", "SAFE-111", "OPS-078"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_resolution_search_metrics.mjs", "script inventory");
});

check("SAFE-111 canonical resolution search metrics boundary", () => {
  const metricsBlock = extractCppFunctionBlock(files.server, "std::string OpsV320ResolutionSearchMetricsJson(");
  const safe111BoundaryObserved = metricsBlock.includes("media-server.ops.v320-resolution-search-metrics.v1") &&
    metricsBlock.includes("info.resolution_status") && metricsBlock.includes("info.filter_tokens") && metricsBlock.includes("info.saved_view_matches");
  const savedViewWritePerformed = /\b(?:SaveView|Write|Persist|AppendFile)[A-Za-z0-9_:]*\s*\(/.test(metricsBlock);
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(metricsBlock);
  const rawMaterialExposed = /\\\"raw(?:Json|Evidence|Payload)(?:Exposed|Included)\\\":true/.test(metricsBlock);
  const sourceUrlExposed = metricsBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = metricsBlock.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(metricsBlock);
  assert(safe111BoundaryObserved && savedViewWritePerformed === false && schemaMutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false,
    "SAFE-111 info.saved_view_matches resolutionSearchMetrics must remain read-only without saved-view/schema/raw/client mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 resolution search metrics summary ==");
console.log("- schema: media-server.ops.v320-resolution-search-metrics.v1");
console.log("- step: v3.2.0 (10)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.resolutionSearchMetrics");
console.log("- dimensions: active resolution filters, saved view presets, operations metric summary");
console.log("- storage: reads existing EventRecord, Ops review state, and v3.2 context only");
console.log("- writes: no saved view write or resolution state write performed");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- stabilizationReleaseReadiness: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertExactVerifierMapping(manifest, featureId, expectedCommand, expectedFile) {
  const item = manifest.items?.find(entry => entry.id === featureId);
  assert(item?.verifierEvidence?.command === expectedCommand,
    `${featureId} exact verifier command mismatch: ${item?.verifierEvidence?.command}`);
  assert(item?.verifierEvidence?.file === expectedFile,
    `${featureId} exact verifier file mismatch: ${item?.verifierEvidence?.file}`);
  assert(item?.verifierEvidence?.anchor === featureId,
    `${featureId} exact verifier assertion anchor mismatch: ${item?.verifierEvidence?.anchor}`);
}
