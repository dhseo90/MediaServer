#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.0.0 S08 Ops Events UI 구현, 문서, inventory, verifier 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {validateFeatureDocumentation} from "./documentation_contract_lib.mjs";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Ops Events UI verification

Usage:
  ./server.sh verify-v300-ops-events-ui

Checks:
  - /ops/events exposes V300 event evidence search/detail UI shell
  - Ops review API returns an Ops-only eventEvidenceSearch view model with evidence timeline, feature reasons, retry, pin, and retention status
  - product UI script wires V300 query controls and renders the view model without provider/vector/client exposure
  - CSS provides responsive card/timeline/reason/retention layouts
  - 현재 계약 문서의 식별자·기능 ID·검증 명령·server dispatch 연결 (과거 실행 기록 제외)
  - PASS is limited to V300-S08 static/local UI evidence and does not imply UI 풀테스트, 30분/120분, retention cleanup execution, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-ops-events-ui";
const files = {
  currentGuide: readText("docs/ui-guide.md"),
  server: readWebRtcHttpServerBundle(readText),
  serverPage: readText("src/ingress/product_ui_server_pages.cpp"),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("ops events page exposes V300 event evidence search UI shell", () => {
  for (const snippet of [
    'data-testid="ops-v300-event-evidence-search-ui"',
    'data-v300-ops-events-ui="event-evidence-search-detail"',
    'id="opsV300EventEvidenceSearchSummary"',
    'id="opsV300EventEvidenceSearchBadges"',
    'id="opsV300EventEvidenceSearchInput"',
    'id="opsV300EventEvidencePinnedOnly"',
    'id="opsV300EventEvidenceRetryFilter"',
    'id="opsV300EventEvidenceRows"',
    "Feature/Search Evidence Detail",
    "evidence timeline",
    "feature reasons",
    "retention status",
  ]) {
    assertIncludes(files.serverPage, snippet, "V300 ops events UI shell");
  }
});

check("ops review API returns V300 local-only event evidence search view model", () => {
  for (const snippet of [
    "OpsV300EventEvidenceSearchUiJson",
    "media-server.ops.v300-event-evidence-search-ui.v1",
    "\\\"eventEvidenceSearch\\\":",
    "\\\"evidenceTimeline\\\":",
    "\\\"featureReasons\\\":",
    "\\\"retryActions\\\":",
    "\\\"pinStatus\\\":",
    "\\\"retentionStatus\\\":",
    "\\\"featureSearchIndexBacked\\\":true",
    "\\\"modelProviderDependency\\\":false",
    "\\\"vectorSearchPerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"retentionCleanupExecuted\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V300 event evidence view model");
  }
});

check("product UI script wires V300 filters and renders detail cards", () => {
  for (const snippet of [
    "v300EventEvidenceSearchQueryParams",
    "renderV300EventEvidenceSearchUi",
    "opsV300EventEvidenceSearchInput",
    "opsV300EventEvidencePinnedOnly",
    "opsV300EventEvidenceRetryFilter",
    "opsV300EventEvidenceRows",
    "eventEvidenceSearch",
    "evidenceTimeline",
    "featureReasons",
    "retryActions",
    "pinStatus",
    "retentionStatus",
    "featureSearchIndexBacked",
    "retentionCleanupExecuted",
  ]) {
    assertIncludes(files.pageScript, snippet, "V300 UI script");
    assertIncludes(extractNamedFunctionBlock(files.pageScript, "renderV300EventEvidenceSearchUi"), "eventEvidenceSearch", "UI-059 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV300EventEvidenceSearchUi").includes(marker)), "UI-059 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV300EventEvidenceSearchUi").includes(marker)), "UI-059 source-url-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV300EventEvidenceSearchUi").includes(marker)), "UI-059 debug-redaction explicit absence oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV300EventEvidenceSearchUi").includes(marker)), "UI-059 client-viewer-boundary explicit absence oracle");
    assertIncludes(files.pageScript, "/ops/events", "UI-059 canonical route obligation");
  }
});

check("V300 UI has responsive card, timeline, feature reason, and retention styling", () => {
  for (const snippet of [
    ".v300-event-evidence-search-ui",
    ".v300-event-evidence-card",
    ".v300-evidence-timeline",
    ".v300-feature-reason-grid",
    ".v300-retention-status-grid",
    ".v300-retry-action-list",
  ]) {
    assertIncludes(files.css, snippet, "V300 UI CSS");
  }
});

check("ops static smoke tracks V300 markers", () => {
  for (const snippet of [
    'data-testid="ops-v300-event-evidence-search-ui"',
    'visualSelector: \'[data-testid="ops-v300-event-evidence-search-ui"]\'',
    'id="opsV300EventEvidenceSearchInput"',
    'id="opsV300EventEvidenceRows"',
    "eventEvidenceSearch",
    "media-server.ops.v300-event-evidence-search-ui.v1",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("현재 계약 문서와 기능별 검증 연결", () => {
  const errors = validateFeatureDocumentation({
    document: files.currentGuide, identifiers: ["/ops/events"],
    command, script: "verify_v300_ops_events_ui.mjs", featureIds: ["UI-059","SAFE-090","OPS-058"],
    inventory: files.featureInventory, verification: files.streamVerification,
    implementation: files.implementationManifest,
    server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
});


check("server entrypoint and inventory verifiers include V300-S08 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v300_ops_events_ui.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage verifier");
  for (const id of ["UI-059", "SAFE-090", "OPS-058"]) {
    assert(files.implementationManifest.items?.find(item => item.id === id)?.verifierEvidence?.command === command,
      `implementation manifest ${id} missing ${command}`);
  }
  assertIncludes(files.scriptInventory, "verify_v300_ops_events_ui.mjs", "script inventory");
});

check("SAFE-090 canonical Ops events UI boundary", () => {
  const opsEventsViewBlock = extractCppFunctionBlock(files.server, "std::string OpsV300EventEvidenceSearchUiJson(");
  const schemaMutationPerformed = opsEventsViewBlock.includes("\\\"eventPostPayloadChanged\\\":true");
  const safe090BoundaryObserved = opsEventsViewBlock.includes("media-server.ops.v300-event-evidence-search-ui.v1") &&
    opsEventsViewBlock.includes("\\\"vectorSearchPerformed\\\":false") &&
    files.server.includes("\\\"eventEvidenceSearch\\\":") &&
    files.server.includes("OpsV300EventEvidenceSearchUiJson(event_result.records_json, reviews, query)");
  assert(safe090BoundaryObserved && schemaMutationPerformed === false,
    "verify-v300-ops-events-ui /ops/events redacted view must not mutate WebRTC/SSE/RTSP schema");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 ops events UI summary ==");
console.log("- schema: media-server.ops.v300-event-evidence-search-ui.v1");
console.log("- step: V300-S08");
console.log("- route: /ops/events");
console.log("- searchSurface: EventRecord, FeatureSet, EvidenceManifest, operator review state");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- vectorSearch: not-run-by-this-command");
console.log("- retentionCleanupExecution: not-run-by-this-command");
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
