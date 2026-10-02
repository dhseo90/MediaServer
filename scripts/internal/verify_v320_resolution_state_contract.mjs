#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.2.0 Step 2 Resolution State Contract 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";

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
  - 현행 계약 식별자·기능 정의·검증 명령·실제 dispatch를 확인하며 과거 실행 기록은 읽지 않음
  - PASS is limited to v3.2.0 Step 2 local/API/static evidence and does not imply Unified Ops Events Workspace, UI 풀테스트, 30분/120분, operator assignment flow, client digest, search/metrics, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-resolution-state-contract";
const files = {
  documentationImplementation: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  server: readWebRtcHttpServerBundle(readText),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("ops review state persists resolution state fields separately", () => {
  const start = files.server.indexOf("std::string OpsResolutionStateJson(");
  const end = files.server.indexOf("bool OpsEventReviewNoteContainsSensitiveMaterial(", start);
  assert(start >= 0 && end > start, "EVT-063 resolution state block missing");
  const evt063ResolutionStateBlock = files.server.slice(start, end);
  assertIncludes(evt063ResolutionStateBlock, "resolutionTransition", "EVT-063 block-scoped canonical resolution state");
  assert(!evt063ResolutionStateBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt063ResolutionStateBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-063 resolution state must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-063 canonical review route");
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

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["EVT-063","SAFE-103","OPS-070"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["media-server.ops.resolution-state.v1","resolutionStatus","resolutionReason"],
    command, script: "verify_v320_resolution_state_contract.mjs", featureIds: ["EVT-063","SAFE-103","OPS-070"],
    inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
});


check("server entrypoint and inventory verifiers include v3.2 Step 2 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_resolution_state_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["EVT-063", "SAFE-103", "OPS-070"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_resolution_state_contract.mjs", "script inventory");
});

check("SAFE-103 canonical resolution persistence boundary", () => {
  const reviewStateBlock = extractCppFunctionBlock(files.server, "std::string OpsEventReviewStateJson(");
  const upsertBlock = extractCppFunctionBlock(files.server, "bool UpsertOpsEventReviewState(");
  const safe103BoundaryObserved = reviewStateBlock.includes("OpsResolutionStateJson(resolution_state)") &&
    upsertBlock.includes("OpsEventReviewStoragePath(config)") &&
    upsertBlock.includes("OpsEventReviewStateJson(next)");
  const schemaMutationPerformed = /DispatchEventRecords|EventStorage::|DataChannel|Sse|WebSocket|Rtsp/.test(upsertBlock);
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(upsertBlock);
  assert(safe103BoundaryObserved && schemaMutationPerformed === false && viewerClientExposureAdded === false,
    "SAFE-103 OpsResolutionStateJson(resolution_state) must persist only in Ops review state without EventRecord/WebRTC/SSE/RTSP or client/viewer mutation");
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
