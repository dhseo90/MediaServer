#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 5 Incident-to-Source Correlation Layer 구현, UI, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Incident-to-Source Correlation Layer verification

Usage:
  ./server.sh verify-v330-incident-source-correlation-layer

Checks:
  - /ops/api/events/reviews attaches an Ops-only v3.3 incidentSourceCorrelation layer to unified resolution detail items
  - the layer correlates v3.2 resolution state with source health/recent failure/audit handoff context
  - /ops/events renders source cause, closure impact, and source audit/recheck handoff without source URL/raw JSON/debug/client exposure
  - the layer does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata, Rule/Profile, recovery queue, client digest, search/metrics, or release state
  - backlog, stream verification, release records, feature inventory, ops smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-incident-source-correlation-layer";
const schema = "media-server.ops.v330-incident-source-correlation.v1";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
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

check("Ops review API builds the v3.3 incident-to-source correlation read model", () => {
  for (const snippet of [
    "struct OpsV330IncidentSourceCorrelationInfo",
    "OpsV330IncidentSourceCorrelationInfoFor",
    "OpsV330IncidentSourceCorrelationJson",
    "OpsV330IncidentSourceCorrelationSummaryJson",
    schema,
    "\\\"incidentSourceCorrelation\\\":",
    "\\\"incidentSourceCorrelationSummary\\\":",
    "\\\"sourceCauseCategory\\\":",
    "\\\"sourceCauseSummary\\\":",
    "\\\"resolutionClosureImpact\\\":",
    "\\\"sourceAuditRoute\\\":\\\"/ops/sources#auditArea=channels&auditPreset=source-health-state-change\\\"",
    "\\\"sourceRecheckRoute\\\":\\\"/ops/api/source-health\\\"",
    "\\\"correlationSignals\\\":",
    "\\\"resolutionDetailAttached\\\":true",
    "\\\"sourceReliabilityContextReused\\\":true",
    "\\\"sourceHealthAuditLinked\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "v330 incident source correlation server view model");
  }
});

check("incident-to-source correlation preserves schema, media, source write, and viewer boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV330IncidentSourceCorrelationJson",
    "std::string OpsV330IncidentSourceCorrelationSummaryJson"
  );
  for (const snippet of [
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
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
    "\\\"recoveryQueueCreated\\\":false",
    "\\\"clientDigestChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
  ]) {
    assertIncludes(block, snippet, "v330 incident source correlation false boundary value");
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
    assert(!block.includes(forbidden), `incident source correlation must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("/ops/events renders the v3.3 incident-to-source correlation layer", () => {
  for (const snippet of [
    "renderV330IncidentSourceCorrelationLayer",
    "incidentSourceCorrelationSummary",
    "incidentSourceCorrelation",
    schema,
    "v330IncidentSourceCorrelationGrid",
    "data-v330-incident-source-correlation",
    "data-v330-correlation-signal",
    "sourceCauseCategory",
    "sourceCauseSummary",
    "resolutionClosureImpact",
    "sourceAuditRoute",
    "sourceRecheckRoute",
    "resolutionDetailAttached",
    "sourceReliabilityContextReused",
    "sourceHealthAuditLinked",
  ]) {
    assertIncludes(files.pageScript, snippet, "v330 incident source correlation UI script");
  }
  for (const snippet of [
    ".v330-incident-source-correlation-grid",
    ".v330-incident-source-correlation-card",
    ".v330-correlation-signal-list",
    ".v330-correlation-signal",
  ]) {
    assertIncludes(files.css, snippet, "v330 incident source correlation CSS");
  }
});

check("client/viewer scripts and source registry UI do not expose incident correlation internals", () => {
  for (const forbidden of [
    schema,
    "incidentSourceCorrelation",
    "sourceCauseCategory",
    "sourceCauseSummary",
    "resolutionClosureImpact",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 5 material: ${forbidden}`);
  }
  for (const forbidden of [
    schema,
    "incidentSourceCorrelation",
    "resolutionClosureImpact",
  ]) {
    assert(!files.opsSourcesScript.includes(forbidden), `/ops/sources script must not own Step 5 incident detail UI: ${forbidden}`);
  }
});

check("ops static smoke tracks Step 5 incident-to-source correlation markers", () => {
  for (const snippet of [
    "ops-events-incident-source-correlation-layer",
    'data-testid="ops-v320-unified-events-workspace"',
    "v330IncidentSourceCorrelationGrid",
    "data-v330-incident-source-correlation",
    "incidentSourceCorrelationSummary",
    "incidentSourceCorrelation",
    schema,
    "source cause",
    "closure impact",
    "source handoff",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("roadmap records v3.3 Step 5 as implemented without overclaiming later steps", () => {
  for (const snippet of [
    "| 5 | v3.3.0 (5) Incident-to-Source Correlation Layer | P1 | 완료 |",
    "## v3.3.0 Step 5 개발 기록",
    "OpsV330IncidentSourceCorrelationJson",
    "`./server.sh verify-v330-incident-source-correlation-layer`",
    "v3.2 resolution event detail에서 source reliability 원인/context를 함께 표시",
    "이번 Step 5 범위 밖 기능 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 5");
  }
});

check("stream verification exposes v3.3 Step 5 command and boundary", () => {
  for (const snippet of [
    "| v3.3.0 (5) | `./server.sh verify-v330-incident-source-correlation-layer` |",
    "Incident-to-Source Correlation Layer",
    "/ops/api/events/reviews",
    "incidentSourceCorrelation",
    "source reliability 원인/context",
    "source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 5");
  }
});

check("feature inventory and release records map v3.3 Step 5", () => {
  for (const snippet of [
    `v3.3.0 (5) Incident-to-Source Correlation Layer | \`UI-070\`, \`SRC-036\`, \`EVT-071\`, \`SAFE-117\`, \`OPS-084\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-070 | V330 Step 5 Incident-to-Source Correlation UI",
    "SRC-036 | V330 Step 5 Incident-to-Source Correlation source context",
    "EVT-071 | V330 Step 5 incident source correlation view model",
    "SAFE-117 | V330 Step 5 incident source correlation boundary",
    "OPS-084 | V330 Step 5 Incident-to-Source Correlation Layer 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 5");
  }
  for (const snippet of [
    "V330 Incident-to-Source Correlation Layer",
    `\`./server.sh ${command}\``,
    "v330 Step 5 RED incident source correlation gate",
    "v330 Step 5 UI 풀테스트",
    "v330 Step 5 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 5");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 5 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_incident_source_correlation_layer.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-070", "SRC-036", "EVT-071", "SAFE-117", "OPS-084"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-018`, `UI-022`~`UI-070`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-036`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`EVT-001`~`EVT-071`", "project inventory EVT range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-117`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-084`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_incident_source_correlation_layer.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 incident-to-source correlation layer ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (5)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.incidentSourceCorrelation");
console.log("- model: resolution detail + v3.2 sourceReliability + source health audit handoff");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- recoveryQueue: not-run-by-this-command");
console.log("- clientDigest: not-run-by-this-command");
console.log("- searchMetrics: not-run-by-this-command");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
