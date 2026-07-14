#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.2.0 Step 4 Evidence Quality Layer 구현, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.2.0 Evidence Quality Layer verification

Usage:
  ./server.sh verify-v320-evidence-quality-layer

Checks:
  - /ops/api/events/reviews returns an Ops-only evidenceQuality layer inside unifiedResolutionWorkspace items
  - evidenceQuality exposes evidence completeness, deterministic confidence, and replay coverage hints
  - /ops/events renders the evidence quality layer without source URL, raw JSON, debug material, or client/viewer exposure
  - the layer does not claim full replay, source reliability, AI review quality, operator flow, client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-evidence-quality-layer";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
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

check("ops review API attaches Step 4 evidence quality layer to unified workspace items", () => {
  assert(files.pageScript.includes("/ops/events"), "OPS-072 canonical /ops/events route missing");
  const start = files.server.indexOf("std::string OpsV320EvidenceQualityJson(");
  const end = files.server.indexOf("std::string OpsV320EvidenceQualitySummaryJson(", start);
  assert(start >= 0 && end > start, "EVT-065 evidence quality projection block missing");
  const evt065EvidenceQualityBlock = files.server.slice(start, end);
  assertIncludes(evt065EvidenceQualityBlock, "media-server.ops.v320-evidence-quality.v1", "EVT-065 block-scoped canonical evidence quality projection");
  assert(!evt065EvidenceQualityBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt065EvidenceQualityBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-065 evidence quality must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-065 canonical review route");
  for (const snippet of [
    "OpsV320EvidenceQualityJson",
    "OpsV320EvidenceQualitySummaryJson",
    "media-server.ops.v320-evidence-quality.v1",
    "\\\"evidenceQuality\\\":",
    "\\\"evidenceQualitySummary\\\":",
    "\\\"evidenceCompleteness\\\":",
    "\\\"evidenceConfidence\\\":",
    "\\\"replayCoverage\\\":",
    "\\\"replayCoverageHint\\\":",
    "\\\"completenessScore\\\":",
    "\\\"confidenceScore\\\":",
    "\\\"snapshotPathPresent\\\":",
    "\\\"evidenceManifestPresent\\\":",
    "\\\"frameBundlePresent\\\":",
    "\\\"encodedClipPresent\\\":",
    "\\\"bboxCropPresent\\\":",
    "\\\"vlmEvidenceRefsPresent\\\":",
    "\\\"fullReplayEngineExecuted\\\":false",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 evidence quality server view model");
  }
});

check("evidence quality layer preserves schema, media, and viewer boundaries", () => {
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
    "\\\"rawEvidenceMaterialExposed\\\":false",
    "\\\"evidenceQualityLayerImplemented\\\":true",
    "\\\"sourceReliabilityContextImplemented\\\":",
    "\\\"aiReviewQualityContextImplemented\\\":",
    "\\\"operatorAssignmentFlowImplemented\\\":",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":",
  ]) {
    assertIncludes(files.server, snippet, "V320 evidence quality boundary flags");
  }
});

check("product UI script renders Step 4 evidence quality fields", () => {
  const evidenceQualityBlock = extractNamedFunctionBlock(files.pageScript, "renderV320EvidenceQualityLayer");
  for (const snippet of [
    "renderV320EvidenceQualityLayer",
    "evidenceQualitySummary",
    "evidenceQuality",
    "media-server.ops.v320-evidence-quality.v1",
    "v320EvidenceQualityGrid",
    "data-v320-evidence-quality",
    "data-v320-evidence-quality-ref",
    "evidenceCompleteness",
    "evidenceConfidence",
    "replayCoverage",
    "replayCoverageHint",
    "fullReplayEngineExecuted",
    "rawEvidenceMaterialExposed",
    "sourceUrlExposed",
    "rawJsonExposed",
    "debugMaterialExposed",
  ]) {
    assertIncludes(evidenceQualityBlock, snippet, "V320 evidence quality UI renderer block");
  }
  assertIncludes(evidenceQualityBlock, "evidenceQuality.rawEvidenceMaterialExposed === false", "UI-063 block-scoped raw evidence redaction contract");
  assertIncludes(evidenceQualityBlock, "evidenceQuality.rawJsonExposed === false", "UI-063 block-scoped raw JSON redaction contract");
  assertIncludes(evidenceQualityBlock, "evidenceQuality.sourceUrlExposed === false", "UI-063 block-scoped source URL redaction contract");
  assertIncludes(evidenceQualityBlock, "evidenceQuality.debugMaterialExposed === false", "UI-063 block-scoped debug material redaction contract");
  assert(!["rawJsonPayload", "rawPayload", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => evidenceQualityBlock.includes(marker)), "UI-063 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl:", "sourceURL:", "sourceUrlValue", "rtsp://", "rtsps://"].some(marker => evidenceQualityBlock.includes(marker)), "UI-063 source-url-redaction explicit absence oracle");
  assert(!["providerApiCall(", "providerResponse", "rawProviderResponse", "providerMaterialExposed: true", "rawProviderMaterialExposed: true"].some(marker => evidenceQualityBlock.includes(marker)), "UI-063 provider-material explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => evidenceQualityBlock.includes(marker)), "UI-063 debug-redaction explicit absence oracle");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => evidenceQualityBlock.includes(marker)), "UI-063 client-viewer-boundary explicit absence oracle");
  const unifiedWorkspaceBlock = extractNamedFunctionBlock(files.pageScript, "renderV320UnifiedOpsEventsWorkspace");
  assertIncludes(unifiedWorkspaceBlock, "/ops/events", "UI-063 exact route owner obligation");
});

check("Step 4 evidence quality CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-evidence-quality-grid",
    ".v320-evidence-quality-card",
    ".v320-evidence-quality-refs",
    ".v320-evidence-quality-ref",
  ]) {
    assertIncludes(files.css, snippet, "V320 evidence quality CSS");
  }
});

check("ops static smoke tracks Step 4 evidence quality markers", () => {
  for (const snippet of [
    "ops-events-evidence-quality-layer",
    'data-testid="ops-v320-unified-events-workspace"',
    "evidenceQualitySummary",
    "evidenceQuality",
    "media-server.ops.v320-evidence-quality.v1",
    "evidence completeness",
    "evidence confidence",
    "replay coverage",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 4 scope without overclaim", () => {
  for (const snippet of [
    "| 4 | v3.2.0 (4) Evidence Quality Layer | P0 | 완료 |",
    "evidence completeness/confidence/replay coverage hint",
    "`./server.sh verify-v320-evidence-quality-layer`",
    "Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 4 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 4");
  }
  for (const snippet of [
    "| v3.2.0 (4) | `./server.sh verify-v320-evidence-quality-layer` |",
    "Evidence Quality Layer",
    "completeness/confidence/replay coverage",
    "full replay engine",
    "source reliability, AI review quality, operator assignment flow, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 4");
  }
});

check("feature inventory and release records map v3.2 Step 4", () => {
  for (const snippet of [
    "v3.2.0 (4) Evidence Quality Layer | `UI-063`, `EVT-065`, `SAFE-105`, `OPS-072` | `verify-v320-evidence-quality-layer`, `verify-ops-client-ui`",
    "UI-063 | V320 Step 4 Evidence Quality Layer UI",
    "EVT-065 | V320 Step 4 evidence quality view model",
    "SAFE-105 | V320 Step 4 evidence quality boundary",
    "OPS-072 | V320 Step 4 Evidence Quality Layer 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 4");
  }
  for (const snippet of [
    "V320 Evidence Quality Layer",
    "`./server.sh verify-v320-evidence-quality-layer`",
    "v320 Step 4 RED evidence quality layer gate",
    "v320 Step 4 UI 풀테스트",
    "v320 Step 4 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 4");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 4 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_evidence_quality_layer.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["UI-063", "EVT-065", "SAFE-105", "OPS-072"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_evidence_quality_layer.mjs", "script inventory");
});

check("SAFE-105 canonical evidence quality boundary", () => {
  const evidenceBlock = extractCppFunctionBlock(files.server, "std::string OpsV320EvidenceQualityJson(");
  const safe105BoundaryObserved = evidenceBlock.includes("media-server.ops.v320-evidence-quality.v1") &&
    evidenceBlock.includes("info.event_frame_present") && evidenceBlock.includes("info.encoded_clip_present");
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(evidenceBlock);
  const rawMaterialExposed = /\\\"raw(?:Json|Evidence|Payload)(?:Exposed|Included)\\\":true/.test(evidenceBlock);
  const sourceUrlExposed = evidenceBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = evidenceBlock.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(evidenceBlock);
  assert(safe105BoundaryObserved && schemaMutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false,
    "SAFE-105 info.event_frame_present evidenceQuality must remain a deterministic reference hint without schema/media/raw/client mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 evidence quality layer summary ==");
console.log("- schema: media-server.ops.v320-evidence-quality.v1");
console.log("- step: v3.2.0 (4)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.evidenceQuality");
console.log("- quality dimensions: evidenceCompleteness, evidenceConfidence, replayCoverage");
console.log("- storage: reads EventRecord evidence refs and Ops review JSONL only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- sourceReliabilityContext: not-run-by-this-command");
console.log("- aiReviewQualityContext: not-run-by-this-command");
console.log("- operatorAssignmentFlow: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
