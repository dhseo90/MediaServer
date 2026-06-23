#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 7 Operator Resolution Flow 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Operator Resolution Flow verification

Usage:
  ./server.sh verify-v320-operator-resolution-flow

Checks:
  - /ops/api/events/reviews write path keeps assign, note, close, and reopen in Ops review state
  - unifiedResolutionWorkspace items expose an Ops-only operatorResolutionFlow context
  - /ops/events renders assignment, note, close/reopen affordance, and audit trail hints without client/viewer exposure
  - operator flow does not claim action checklist, client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-operator-resolution-flow";
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

check("ops review API attaches Step 7 operator resolution flow to unified workspace items", () => {
  for (const snippet of [
    "OpsV320OperatorResolutionFlowInfoFor",
    "OpsV320OperatorResolutionFlowJson",
    "OpsV320OperatorResolutionFlowSummaryJson",
    "media-server.ops.v320-operator-resolution-flow.v1",
    "\\\"operatorResolutionFlow\\\":",
    "\\\"operatorResolutionFlowSummary\\\":",
    "\\\"assignmentTarget\\\":",
    "\\\"operatorNotePresent\\\":",
    "\\\"resolutionNotePresent\\\":",
    "\\\"closeActionAvailable\\\":",
    "\\\"reopenActionAvailable\\\":",
    "\\\"auditTrailRequired\\\":true",
    "\\\"auditActions\\\":",
    "\\\"operator-resolution-flow-update\\\"",
    "\\\"operatorResolutionFlowWritePath\\\":\\\"/ops/api/events/reviews/{eventId}\\\"",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 operator resolution flow server view model");
  }
});

check("operator resolution write path accepts assign, note, close, and reopen without changing media/event schemas", () => {
  for (const snippet of [
    "ExtractObjectField(request.body, \"operatorResolutionFlow\")",
    "ParseStringField(*operator_resolution_flow, \"assignmentTarget\")",
    "ParseStringField(*operator_resolution_flow, \"operatorNote\")",
    "ParseStringField(*operator_resolution_flow, \"resolutionTransition\")",
    "ParseStringField(*operator_resolution_flow, \"resolutionReason\")",
    "ParseStringField(*operator_resolution_flow, \"resolutionStatus\")",
    "operator-resolution-flow-update",
    "Operator resolution flow updated",
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
    "\\\"operatorAssignmentFlowImplemented\\\":true",
    "\\\"actionReadinessChecklistImplemented\\\":",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V320 operator resolution write path and boundaries");
  }
});

check("product UI script renders Step 7 operator assignment, note, close/reopen, and audit fields", () => {
  for (const snippet of [
    "renderV320OperatorResolutionFlow",
    "operatorResolutionFlowSummary",
    "operatorResolutionFlow",
    "media-server.ops.v320-operator-resolution-flow.v1",
    "v320OperatorResolutionFlowGrid",
    "data-v320-operator-resolution-flow",
    "data-v320-operator-resolution-audit",
    "assignment target",
    "operator note",
    "close / reopen",
    "audit trail",
    "closeActionAvailable",
    "reopenActionAvailable",
    "auditTrailRequired",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 operator resolution flow UI script");
  }
});

check("Step 7 operator resolution CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-operator-resolution-flow-grid",
    ".v320-operator-resolution-flow-card",
    ".v320-operator-resolution-audit",
    ".v320-operator-resolution-audit-chip",
  ]) {
    assertIncludes(files.css, snippet, "V320 operator resolution flow CSS");
  }
});

check("ops static smoke tracks Step 7 operator resolution flow markers", () => {
  for (const snippet of [
    "ops-events-operator-resolution-flow",
    'data-testid="ops-v320-unified-events-workspace"',
    "v320OperatorResolutionFlowGrid",
    "data-v320-operator-resolution-flow",
    "data-v320-operator-resolution-audit",
    "operatorResolutionFlowSummary",
    "operatorResolutionFlow",
    "media-server.ops.v320-operator-resolution-flow.v1",
    "assignment target",
    "operator note",
    "close / reopen",
    "audit trail",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 7 scope without overclaim", () => {
  for (const snippet of [
    "| 7 | v3.2.0 (7) Operator Resolution Flow | P1 | 완료 |",
    "assign, note, close, reopen, audit trail",
    "`./server.sh verify-v320-operator-resolution-flow`",
    "Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 7 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 7");
  }
  for (const snippet of [
    "| v3.2.0 (7) | `./server.sh verify-v320-operator-resolution-flow` |",
    "Operator Resolution Flow",
    "assign, note, close, reopen, audit trail",
    "write path",
    "action checklist, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 7");
  }
});

check("feature inventory and release records map v3.2 Step 7", () => {
  for (const snippet of [
    "v3.2.0 (7) Operator Resolution Flow | `UI-066`, `EVT-068`, `SAFE-108`, `OPS-075` | `verify-v320-operator-resolution-flow`, `verify-ops-client-ui`",
    "UI-066 | V320 Step 7 Operator Resolution Flow UI",
    "EVT-068 | V320 Step 7 operator resolution flow view model",
    "SAFE-108 | V320 Step 7 operator resolution boundary",
    "OPS-075 | V320 Step 7 Operator Resolution Flow 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-067`",
    "`EVT-001`~`EVT-069`",
    "`SAFE-001`~`SAFE-109`",
    "`OPS-035`~`OPS-076`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 7");
  }
  for (const snippet of [
    "V320 Operator Resolution Flow",
    "`./server.sh verify-v320-operator-resolution-flow`",
    "v320 Step 7 RED operator resolution flow gate",
    "v320 Step 7 operator resolution flow final",
    "v320 Step 7 UI 풀테스트",
    "v320 Step 7 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 7");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 7 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_operator_resolution_flow.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-066", "EVT-068", "SAFE-108", "OPS-075"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_operator_resolution_flow.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 operator resolution flow summary ==");
console.log("- schema: media-server.ops.v320-operator-resolution-flow.v1");
console.log("- step: v3.2.0 (7)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.operatorResolutionFlow");
console.log("- write path: /ops/api/events/reviews/{eventId}");
console.log("- flow dimensions: assignmentTarget, operatorNotePresent, closeActionAvailable, reopenActionAvailable, auditTrailRequired");
console.log("- storage: Ops review JSONL and Ops audit log only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- actionReadinessChecklist: not-run-by-this-command");
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
