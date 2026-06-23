#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 5 Source Reliability Context 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Source Reliability Context verification

Usage:
  ./server.sh verify-v320-source-reliability-context

Checks:
  - /ops/api/events/reviews returns an Ops-only sourceReliability context inside unifiedResolutionWorkspace items
  - sourceReliability exposes source health, recent failure context, and operator recheck hints
  - /ops/events renders source reliability without source URL, raw JSON, debug material, source registry writes, or client/viewer exposure
  - the context does not claim AI review quality, operator flow, client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-source-reliability-context";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
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

check("ops review API attaches Step 5 source reliability context to unified workspace items", () => {
  for (const snippet of [
    "OpsV320SourceReliabilityContextJson",
    "OpsV320SourceReliabilitySummaryJson",
    "media-server.ops.v320-source-reliability-context.v1",
    "\\\"sourceReliability\\\":",
    "\\\"sourceReliabilitySummary\\\":",
    "\\\"sourceHealthStatus\\\":",
    "\\\"recentFailureContext\\\":",
    "\\\"operatorRecheckHint\\\":",
    "\\\"operatorRecheckRoute\\\":\\\"/ops/api/source-health\\\"",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 source reliability server view model");
  }
});

check("source reliability context preserves schema, media, and viewer boundaries", () => {
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
    "\\\"sourceReliabilityContextImplemented\\\":true",
    "\\\"aiReviewQualityContextImplemented\\\":",
    "\\\"operatorAssignmentFlowImplemented\\\":",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V320 source reliability boundary flags");
  }
});

check("product UI script renders Step 5 source reliability fields", () => {
  for (const snippet of [
    "renderV320SourceReliabilityContext",
    "sourceReliabilitySummary",
    "sourceReliability",
    "media-server.ops.v320-source-reliability-context.v1",
    "v320SourceReliabilityGrid",
    "data-v320-source-reliability",
    "data-v320-source-reliability-warning",
    "sourceHealthStatus",
    "recentFailureContext",
    "operatorRecheckHint",
    "operatorRecheckRoute",
    "sourceRegistryWritePerformed",
    "sourceUrlExposed",
    "rawJsonExposed",
    "debugMaterialExposed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 source reliability UI script");
  }
});

check("Step 5 source reliability CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-source-reliability-grid",
    ".v320-source-reliability-card",
    ".v320-source-reliability-warnings",
    ".v320-source-reliability-warning",
  ]) {
    assertIncludes(files.css, snippet, "V320 source reliability CSS");
  }
});

check("ops static smoke tracks Step 5 source reliability markers", () => {
  for (const snippet of [
    "ops-events-source-reliability-context",
    'data-testid="ops-v320-unified-events-workspace"',
    "sourceReliabilitySummary",
    "sourceReliability",
    "media-server.ops.v320-source-reliability-context.v1",
    "source health",
    "recent failure",
    "operator recheck",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 5 scope without overclaim", () => {
  for (const snippet of [
    "| 5 | v3.2.0 (5) Source Reliability Context | P1 | 완료 |",
    "source health, recent failure, operator recheck hint",
    "`./server.sh verify-v320-source-reliability-context`",
    "`./server.sh verify-v320-source-reliability-runtime-sample --http-base <running-server>`",
    "AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 5 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 5");
  }
  for (const snippet of [
    "| v3.2.0 (5) | `./server.sh verify-v320-source-reliability-context`; 실행 중인 서버 대상",
    "`./server.sh verify-v320-source-reliability-runtime-sample --http-base <running-server>`",
    "Source Reliability Context",
    "source health와 recent failure context",
    "fixture EventRecord item",
    "source registry write",
    "AI review quality, operator assignment flow, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 5");
  }
});

check("feature inventory and release records map v3.2 Step 5", () => {
  for (const snippet of [
    "v3.2.0 (5) Source Reliability Context | `UI-064`, `EVT-066`, `SAFE-106`, `OPS-073` | `verify-v320-source-reliability-context`, `verify-v320-source-reliability-runtime-sample`, `verify-ops-client-ui`",
    "UI-064 | V320 Step 5 Source Reliability Context UI",
    "EVT-066 | V320 Step 5 source reliability view model",
    "SAFE-106 | V320 Step 5 source reliability boundary",
    "OPS-073 | V320 Step 5 Source Reliability Context 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-066`",
    "`EVT-001`~`EVT-068`",
    "`SAFE-001`~`SAFE-108`",
    "`OPS-035`~`OPS-075`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 5");
  }
  for (const snippet of [
    "V320 Source Reliability Context",
    "`./server.sh verify-v320-source-reliability-context`",
    "`./server.sh verify-v320-source-reliability-runtime-sample --http-base http://127.0.0.1:8081`",
    "v320 Step 5 RED source reliability context gate",
    "v320 Step 5 RED source reliability runtime sample command",
    "v320 Step 5 UI 풀테스트",
    "v320 Step 5 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 5");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 5 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_source_reliability_context.mjs", "server.sh script dispatch");
  assertIncludes(files.serverSh, "verify-v320-source-reliability-runtime-sample", "server.sh runtime sample command");
  assertIncludes(files.serverSh, "verify_v320_source_reliability_runtime_sample.mjs", "server.sh runtime sample dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.featureCoverageVerifier, "verify-v320-source-reliability-runtime-sample", "feature coverage runtime sample verifier");
  for (const id of ["UI-064", "EVT-066", "SAFE-106", "OPS-073"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_source_reliability_context.mjs", "script inventory");
  assertIncludes(files.scriptInventory, "verify_v320_source_reliability_runtime_sample.mjs", "script inventory runtime sample");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 source reliability context summary ==");
console.log("- schema: media-server.ops.v320-source-reliability-context.v1");
console.log("- step: v3.2.0 (5)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.sourceReliability");
console.log("- context dimensions: sourceHealthStatus, recentFailureContext, operatorRecheckHint");
console.log("- storage: reads SourceRegistry source health snapshot and EventRecord source identifiers only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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
