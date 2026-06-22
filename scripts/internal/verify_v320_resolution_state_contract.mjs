#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 2 Resolution State Contract 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Resolution State Contract verification

Usage:
  ./server.sh verify-v320-resolution-state-contract

Checks:
  - /ops/api/events/reviews persists an Ops-only resolution state contract with status, reason, close/reopen lifecycle, and boundary flags
  - the resolution contract is separate from EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, and client/viewer output
  - the review catalog exposes allowed resolution statuses, reasons, and transitions
  - roadmap, stream verification, release records, feature inventory, and server dispatch are wired
  - PASS is limited to v3.2.0 Step 2 local/API/static evidence and does not imply Unified Ops Events Workspace, UI 풀테스트, 30분/120분, operator assignment flow, client digest, search/metrics, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-resolution-state-contract";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
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

check("ops review state persists resolution state fields separately", () => {
  for (const snippet of [
    "resolution_status",
    "resolution_reason",
    "resolution_note",
    "resolution_transition",
    "resolution_closed_at_ms",
    "resolution_reopened_at_ms",
    "OpsResolutionStateFromReview",
    "OpsResolutionStateJson",
    "media-server.ops.resolution-state.v1",
    "\\\"resolution\\\":",
    "\\\"resolutionStatus\\\":",
    "\\\"resolutionReason\\\":",
    "\\\"closeReopenLifecycle\\\":",
    "\\\"canClose\\\":",
    "\\\"canReopen\\\":",
    "\\\"reasonRequired\\\":true",
    "\\\"separateFromEventRecords\\\":true",
    "\\\"separateFromEventPostPayload\\\":true",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "resolution state server contract");
  }
});

check("resolution catalog exposes allowed statuses, reasons, and transitions", () => {
  for (const snippet of [
    "OpsResolutionStatusAllowed",
    "NormalizeOpsResolutionStatus",
    "OpsResolutionReasonAllowed",
    "NormalizeOpsResolutionReason",
    "NormalizeOpsResolutionTransition",
    "\\\"resolutionStatuses\\\"",
    "\\\"resolutionReasons\\\"",
    "\\\"resolutionTransitions\\\"",
  ]) {
    assertIncludes(files.server, snippet, "resolution catalog");
  }
  for (const value of [
    "open",
    "triaged",
    "in-progress",
    "resolved",
    "reopened",
    "false-positive",
    "unreviewed",
    "operator-confirmed",
    "evidence-insufficient",
    "duplicate",
    "source-unreliable",
    "rule-tuning",
    "manual-reopen",
    "none",
    "close",
    "reopen",
  ]) {
    assertIncludes(files.server, `\\\"${value}\\\"`, `resolution catalog value ${value}`);
  }
});

check("review update API accepts resolution payload and audits resolution transitions", () => {
  for (const snippet of [
    "ExtractObjectField(request.body, \"resolution\")",
    "resolution_defaults",
    "LoadOpsEventReviewStates(config, &existing_reviews, nullptr)",
    "ParseStringField(*resolution, \"status\")",
    "ParseStringField(*resolution, \"reason\")",
    "ParseStringField(*resolution, \"note\")",
    "ParseStringField(*resolution, \"transition\")",
    "\\\"resolution-state-update\\\"",
    "\"Resolution state updated\"",
    "\\\"resolutionTransition\\\"",
    "\\\"closeReopenLifecycle\\\"",
  ]) {
    assertIncludes(files.server, snippet, "resolution update route");
  }
});

check("docs and roadmap expose v3.2 Step 2 scope without overclaim", () => {
  for (const snippet of [
    "| 2 | v3.2.0 (2) Resolution State Contract | P0 | 완료 |",
    "media-server.ops.resolution-state.v1",
    "resolutionStatus/resolutionReason/resolution.transition",
    "close/reopen lifecycle contract",
    "Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님",
    "## v3.2.0 Step 2 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 2");
  }
  for (const snippet of [
    "| v3.2.0 (2) | `./server.sh verify-v320-resolution-state-contract` |",
    "Resolution State Contract",
    "status/reason/close-reopen lifecycle",
    "EventRecord/Event POST/WebRTC/SSE/WS/media path",
    "UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 2");
  }
});

check("feature inventory and release records map v3.2 Step 2", () => {
  for (const snippet of [
    "v3.2.0 (2) Resolution State Contract | `EVT-063`, `SAFE-103`, `OPS-070` | `verify-v320-resolution-state-contract`",
    "EVT-063 | V320 Step 2 resolution state contract",
    "SAFE-103 | V320 Step 2 resolution boundary",
    "OPS-070 | V320 Step 2 Resolution State Contract 게이트",
    "`EVT-001`~`EVT-063`",
    "`SAFE-001`~`SAFE-103`",
    "`OPS-035`~`OPS-070`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 2");
  }
  for (const snippet of [
    "V320 Resolution State Contract",
    "`./server.sh verify-v320-resolution-state-contract`",
    "v320 Step 2 RED resolution state contract gate",
    "v320 Step 2 resolution state contract final",
    "v320 Step 2 UI 풀테스트",
    "v320 Step 2 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 2");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 2 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_resolution_state_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["EVT-063", "SAFE-103", "OPS-070"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_resolution_state_contract.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 resolution state contract summary ==");
console.log("- schema: media-server.ops.resolution-state.v1");
console.log("- step: v3.2.0 (2)");
console.log("- route: /ops/api/events/reviews");
console.log("- exposed fields: status, reason, note, transition, closeReopenLifecycle");
console.log("- storage: Ops review JSONL only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- unifiedOpsEventsWorkspace: not-run-by-this-command");
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
