#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.3.0 Step 9 Source Reliability Search and Metrics 구현, UI, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.3.0 Source Reliability Search and Metrics verification

Usage:
  ./server.sh verify-v330-source-reliability-search-metrics

Checks:
  - /ops/api/source-registry/reliability-search-metrics exposes an Ops-only read-only search/metrics model
  - the view model exposes source health filters, saved reliability view presets, and reconnect/stale/offline metric summary
  - /ops/sources renders filter summary, saved views, metrics, and boundary flags
  - the context does not write saved views, mutate SourceRegistry/PublishedView, expose client/viewer material, or change EventRecord/Event POST/media schemas
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-source-reliability-search-metrics";
const schema = "media-server.ops.v330-source-reliability-search-metrics.v1";
const route = "/ops/api/source-registry/reliability-search-metrics";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  registry: readText("src/ingress/source_view_registry.cpp"),
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

check("Ops server builds the v3.3 source reliability search and metrics read model", () => {
  assert(route === "/ops/api/source-registry/reliability-search-metrics", "OPS-088 canonical route drift");
  for (const snippet of [
    "struct OpsV330SourceReliabilitySearchMetricItem",
    "struct OpsV330SourceReliabilitySavedView",
    "struct OpsV330SourceReliabilitySearchMetricsSummary",
    "BuildV330SourceReliabilitySearchMetrics",
    "BuildV330SourceReliabilitySavedViews",
    "BuildV330SourceReliabilitySearchMetricsSummary",
    "AppendV330SourceReliabilitySearchMetricItemJson",
    "AppendV330SourceReliabilitySavedViewJson",
    "OpsV330SourceReliabilitySearchMetricsJson",
    schema,
    "sourceReliabilitySearchMetricsSummary",
    "sourceReliabilitySearchResults",
    "sourceHealthFilters",
    "savedReliabilityViews",
    "reconnectMetricSummary",
    "staleMetricSummary",
    "offlineMetricSummary",
    "matchedSourceCount",
    "savedViewsPersisted",
    "savedViewWritePerformed",
  ]) {
    assertIncludes(files.server, snippet, "v330 source reliability search metrics server model");
  }
});

check("source reliability search metrics preserves write/schema/media/client boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV330SourceReliabilitySearchMetricsJson",
    "std::string OpsAuditSearchIndexJson"
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "savedViewsPersisted",
    "savedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
    "automaticRecoveryPerformed",
  ]) {
    assertIncludes(block, snippet, "v330 source reliability search metrics boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "savedViewsPersisted",
    "savedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
    "automaticRecoveryPerformed",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `search metrics JSON must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the source reliability search metrics route as guarded read-only no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/onboarding-quality\")");
  assertIncludes(block, route, "source reliability search metrics route");
  assertIncludes(block, "request.method == \"GET\"", "source reliability search metrics route");
  assertIncludes(block, "require_ops_principal()", "source reliability search metrics route");
  assertIncludes(block, "OpsV330SourceReliabilitySearchMetricsJson(", "source reliability search metrics route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "source reliability search metrics route");
  assertIncludes(block, "Cache-Control", "source reliability search metrics route");
  assertIncludes(block, "no-store", "source reliability search metrics route");
  assert(!block.includes("require_source_write_principal"), "source reliability search metrics route must not require or perform source writes");
});

check("/ops/sources renders Step 9 search filters, saved views, metrics, and boundaries", () => {
  for (const snippet of [
    "source-reliability-search-metrics",
    "source-reliability-search-status",
    "source-reliability-search-filter-list",
    "source-reliability-saved-view-list",
    "source-reliability-search-result-list",
    "renderSourceReliabilitySearchMetrics",
    "requestJson('/ops/api/source-registry/reliability-search-metrics')",
    "sourceReliabilitySearchMetricsSummary",
    "sourceHealthFilters",
    "savedReliabilityViews",
    "sourceReliabilitySearchResults",
    "reconnectMetricSummary",
    "staleMetricSummary",
    "offlineMetricSummary",
    "savedViewsPersisted",
    "savedViewWritePerformed",
    "data-source-reliability-filter",
    "data-source-reliability-saved-view",
    "data-source-reliability-metric",
  ]) {
    assertIncludes(files.opsSourcesScript + files.server, snippet, "ops sources source reliability search metrics UI");
    assertIncludes(extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics"), "savedViewWritePerformed", "UI-073 block-scoped canonical product state");
    const savedViewWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker));
    assert(savedViewWritePerformed === false, "UI-073 saved reliability view must remain read-only");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker)), "UI-073 no-write explicit absence oracle");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker)), "UI-073 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker)), "UI-073 source-url-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker)), "UI-073 debug-redaction explicit absence oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderSourceReliabilitySearchMetrics").includes(marker)), "UI-073 client-viewer-boundary explicit absence oracle");
    assertIncludes(files.opsSourcesScript, "/ops/sources", "UI-073 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v330-source-reliability-search-metrics.v1", "UI-073 canonical schema obligation");
  }
  for (const snippet of [
    ".source-reliability-search-grid",
    ".source-reliability-search-card",
    ".source-reliability-filter-list",
    ".source-reliability-saved-views",
    ".source-reliability-search-result-list",
  ]) {
    assertIncludes(files.css, snippet, "source reliability search metrics CSS");
  }
  for (const forbidden of [schema, "savedReliabilityViews", "sourceReliabilitySearchResults", route]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 9 search metrics material: ${forbidden}`);
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "savedReliabilityViews",
    "sourceReliabilitySearchResults",
    "sourceHealthFilters",
    "rawLocator",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap records v3.3 Step 9 as implemented without overclaiming Step 10 or release gates", () => {
  for (const snippet of [
    "| 9 | v3.3.0 (9) Source Reliability Search and Metrics | P2 | 완료 |",
    "source health filter, saved reliability view, reconnect/stale/offline metric summary",
    "## v3.3.0 Step 9 개발 기록",
    route,
    "OpsV330SourceReliabilitySearchMetricsJson",
    "`./server.sh verify-v330-source-reliability-search-metrics`",
    "이번 Step 9는 Source Reliability Search and Metrics read model/API/UI/verifier 연결입니다",
    "Ops Backup and Recovery Source Handoff 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 9");
  }
});

check("stream verification exposes v3.3 Step 9 command and boundary", () => {
  for (const snippet of [
    `| v3.3.0 (9) | \`./server.sh ${command}\` | Source Reliability Search and Metrics.`,
    route,
    "source health filters",
    "saved reliability view presets",
    "reconnect/stale/offline metric summary",
    "source registry write, PublishedView write, saved view write, viewer/client 노출, API/schema/media 변경",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 9");
  }
});

check("feature inventory and release records map v3.3 Step 9", () => {
  for (const snippet of [
    `v3.3.0 (9) Source Reliability Search and Metrics | \`UI-073\`, \`SRC-039\`, \`SAFE-121\`, \`OPS-088\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-073 | V330 Step 9 Source Reliability Search and Metrics UI",
    "SRC-039 | V330 Step 9 source reliability search metrics view model",
    "SAFE-121 | V330 Step 9 source reliability search metrics boundary",
    "OPS-088 | V330 Step 9 Source Reliability Search and Metrics 게이트",
    "`UI-001`~`UI-115`",
    "`SRC-001`~`SRC-068`",
    "`SAFE-001`~`SAFE-216`",
    "`OPS-035`~`OPS-184`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 9");
  }
  for (const snippet of [
    "V330 Source Reliability Search and Metrics",
    `\`./server.sh ${command}\``,
    "v330 Step 9 RED source reliability search metrics gate",
    "v330 Step 9 source reliability search metrics implementation checkpoint",
    "v330 Step 9 UI 풀테스트",
    "v330 Step 9 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 9");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 9 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_source_reliability_search_metrics.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage verifier canonical manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier command coverage summary");
  for (const id of ["UI-073", "SRC-039", "SAFE-121", "OPS-088"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-115`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-068`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-216`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-184`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_source_reliability_search_metrics.mjs", "script inventory");
});

check("SAFE-121 canonical source reliability search metrics boundary", () => {
  const metricsBlock = extractCppFunctionBlock(files.server, "std::string OpsV330SourceReliabilitySearchMetricsJson(");
  const reliabilitySearchMetricsRouteObserved = route === "/ops/api/source-registry/reliability-search-metrics";
  const safe121BoundaryObserved = reliabilitySearchMetricsRouteObserved && metricsBlock.includes("BuildV330SourceReliabilitySearchMetrics") && metricsBlock.includes("media-server.ops.v330-source-reliability-search-metrics.v1") && metricsBlock.includes("BuildV330SourceReliabilitySavedViews");
  const savedViewOrSourceWritePerformed = /\b(?:SaveView|CreateSource|UpdateSource|DeleteSource|Write|Persist)[A-Za-z0-9_:]*\s*\(/.test(metricsBlock);
  const rawMaterialExposed = metricsBlock.includes("\\\"rawJsonExposed\\\":true");
  const rawLocatorExposed = metricsBlock.includes("\\\"rawLocatorExposed\\\":true");
  const sourceUrlExposed = metricsBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = metricsBlock.includes("\\\"debugMaterialExposed\\\":true");
  const credentialMaterialExposed = metricsBlock.includes("\\\"credentialMaterialExposed\\\":true");
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(metricsBlock);
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(metricsBlock);
  const automaticRecoveryPerformed = /\b(?:Recover|Restore|Execute)[A-Za-z0-9_:]*\s*\(/.test(metricsBlock);
  assert(safe121BoundaryObserved && savedViewOrSourceWritePerformed === false && rawMaterialExposed === false && rawLocatorExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && credentialMaterialExposed === false && schemaMutationPerformed === false && viewerClientExposureAdded === false && automaticRecoveryPerformed === false,
    "SAFE-121 source-reliability-search-metrics must remain read-only without saved/source writes, raw credential, schema/client mutation, or recovery");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 source reliability search and metrics ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (9)");
console.log(`- route: ${route}`);
console.log("- model: Ops source health snapshot + source-health-state-change audit history");
console.log("- dimensions: source health filters, saved reliability view presets, reconnect/stale/offline metric summary");
console.log("- writes: no saved view, SourceRegistry, PublishedView, EventRecord, or recovery mutation performed");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
