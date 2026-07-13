#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 8 Action Readiness Checklist 구현, 문서, inventory 연결을 검증한다.
import { exactBooleanFlagValue, extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Action Readiness Checklist verification

Usage:
  ./server.sh verify-v320-action-readiness-checklist

Checks:
  - /ops/api/events/reviews returns an Ops-only actionReadinessChecklist inside unifiedResolutionWorkspace items
  - the checklist exposes rule draft, evidence bundle, and notification readiness without auto action or external delivery
  - /ops/events renders action readiness status, blockers, checklist items, and boundary flags
  - the context does not claim client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-action-readiness-checklist";
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

check("ops review API attaches Step 8 action readiness checklist to unified workspace items", () => {
  const start = files.server.indexOf("std::string OpsV320ActionReadinessChecklistJson(");
  const end = files.server.indexOf("std::string OpsV320ActionReadinessChecklistSummaryJson(", start);
  assert(start >= 0 && end > start, "EVT-069 action readiness projection block missing");
  const evt069ReadinessBlock = files.server.slice(start, end);
  assertIncludes(evt069ReadinessBlock, "media-server.ops.v320-action-readiness-checklist.v1", "EVT-069 block-scoped canonical readiness projection");
  assert(!evt069ReadinessBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt069ReadinessBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-069 readiness checklist must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/events", "OPS-076 canonical page route");
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-069 canonical review route");
  for (const snippet of [
    "OpsV320ActionReadinessChecklistInfoFor",
    "OpsV320ActionReadinessChecklistJson",
    "OpsV320ActionReadinessChecklistSummaryJson",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "\\\"actionReadinessChecklist\\\":",
    "\\\"actionReadinessChecklistSummary\\\":",
    "\\\"readinessStatus\\\":",
    "\\\"ruleDraftReady\\\":",
    "\\\"evidenceBundleReady\\\":",
    "\\\"notificationReady\\\":",
    "\\\"manualApprovalRequired\\\":true",
    "\\\"readinessBlockers\\\":",
    "\\\"checklistItems\\\":",
    "\\\"ruleDraftRoute\\\":\\\"/ops/rules\\\"",
    "\\\"notificationDryRunRequired\\\":true",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 action readiness checklist server view model");
  }
});

check("action readiness checklist preserves schema, media, action, and delivery boundaries", () => {
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
    "\\\"ruleDraftCreated\\\":false",
    "\\\"autoActionApplied\\\":false",
    "\\\"autoActionWritePerformed\\\":false",
    "\\\"externalDeliveryPerformed\\\":false",
    "\\\"notificationSent\\\":false",
    "\\\"actionReadinessChecklistImplemented\\\":true",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":",
  ]) {
    assertIncludes(files.server, snippet, "V320 action readiness checklist boundary flags");
  }
});

check("product UI script renders Step 8 rule draft, evidence bundle, notification, and blockers", () => {
  for (const snippet of [
    "renderV320ActionReadinessChecklist",
    "actionReadinessChecklistSummary",
    "actionReadinessChecklist",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "v320ActionReadinessChecklistGrid",
    "data-v320-action-readiness-checklist",
    "data-v320-action-readiness-blocker",
    "data-v320-action-readiness-item",
    "readiness status",
    "rule draft",
    "evidence bundle",
    "notification readiness",
    "manualApprovalRequired",
    "autoActionWritePerformed",
    "externalDeliveryPerformed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 action readiness checklist UI script");
    assertIncludes(extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist"), "actionReadinessChecklist", "UI-067 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 no-write explicit absence oracle");
    assert(!["send(","sendClientNotice","deliveryQueueWritePerformed: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 no-send explicit absence oracle");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 source-url-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 debug-redaction explicit absence oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV320ActionReadinessChecklist").includes(marker)), "UI-067 client-viewer-boundary explicit absence oracle");
    assertIncludes(files.pageScript, "/ops/events", "UI-067 canonical route obligation");
    assertIncludes(files.pageScript, "media-server.ops.v320-action-readiness-checklist.v1", "UI-067 canonical schema obligation");
  }
});

check("Step 8 action readiness CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-action-readiness-checklist-grid",
    ".v320-action-readiness-checklist-card",
    ".v320-action-readiness-items",
    ".v320-action-readiness-item",
    ".v320-action-readiness-blocker",
  ]) {
    assertIncludes(files.css, snippet, "V320 action readiness checklist CSS");
  }
});

check("ops static smoke tracks Step 8 action readiness checklist markers", () => {
  for (const snippet of [
    "ops-events-action-readiness-checklist",
    'data-testid="ops-v320-unified-events-workspace"',
    "v320ActionReadinessChecklistGrid",
    "data-v320-action-readiness-checklist",
    "data-v320-action-readiness-blocker",
    "data-v320-action-readiness-item",
    "actionReadinessChecklistSummary",
    "actionReadinessChecklist",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "readiness status",
    "rule draft",
    "evidence bundle",
    "notification readiness",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 8 scope without overclaim", () => {
  for (const snippet of [
    "| 8 | v3.2.0 (8) Action Readiness Checklist | P1 | 완료 |",
    "rule draft/evidence bundle/notification readiness checklist",
    "`./server.sh verify-v320-action-readiness-checklist`",
    "Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 8 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 8");
  }
  for (const snippet of [
    "| v3.2.0 (8) | `./server.sh verify-v320-action-readiness-checklist` |",
    "Action Readiness Checklist",
    "rule draft",
    "evidence bundle",
    "notification readiness",
    "auto action, external delivery, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 8");
  }
});

check("feature inventory and release records map v3.2 Step 8", () => {
  for (const snippet of [
    "v3.2.0 (8) Action Readiness Checklist | `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076` | `verify-v320-action-readiness-checklist`, `verify-ops-client-ui`",
    "UI-067 | V320 Step 8 Action Readiness Checklist UI",
    "EVT-069 | V320 Step 8 action readiness checklist view model",
    "SAFE-109 | V320 Step 8 action readiness boundary",
    "OPS-076 | V320 Step 8 Action Readiness Checklist 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 8");
  }
  for (const snippet of [
    "V320 Action Readiness Checklist",
    "`./server.sh verify-v320-action-readiness-checklist`",
    "v320 Step 8 RED action readiness checklist gate",
    "v320 Step 8 action readiness checklist final",
    "v320 Step 8 UI 풀테스트",
    "v320 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_action_readiness_checklist.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["UI-067", "EVT-069", "SAFE-109", "OPS-076"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_action_readiness_checklist.mjs", "script inventory");
});

check("SAFE-109 canonical action readiness boundary", () => {
  const readinessBlock = extractCppFunctionBlock(files.server, "std::string OpsV320ActionReadinessChecklistJson(");
  const safe109BoundaryObserved = readinessBlock.includes("media-server.ops.v320-action-readiness-checklist.v1") &&
    readinessBlock.includes("info.readiness_status") && readinessBlock.includes("info.readiness_blockers") && readinessBlock.includes("info.checklist_items");
  const ruleDraftCreated = /\b(?:CreateVaRule|UpdateVaRule)[A-Za-z0-9_:]*\s*\(/.test(readinessBlock);
  const automaticActionPerformed = /\b(?:SendAlert|Deliver|Recover|Execute)[A-Za-z0-9_:]*\s*\(/.test(readinessBlock);
  const externalDeliveryPerformed = /\b(?:SendAlert|Deliver|NotifyExternal)[A-Za-z0-9_:]*\s*\(/.test(readinessBlock);
  const schemaMutationPerformed = [
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ].some(flag => exactBooleanFlagValue(readinessBlock, flag));
  const rawMaterialExposed = /\\\"raw(?:Json|Evidence|Payload)(?:Exposed|Included)\\\":true/.test(readinessBlock);
  const sourceUrlExposed = readinessBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = readinessBlock.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(readinessBlock);
  assert(safe109BoundaryObserved && ruleDraftCreated === false && automaticActionPerformed === false && externalDeliveryPerformed === false && schemaMutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false,
    "SAFE-109 info.readiness_status actionReadinessChecklist must remain deterministic without rule draft, external delivery, schema, or raw material mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 action readiness checklist summary ==");
console.log("- schema: media-server.ops.v320-action-readiness-checklist.v1");
console.log("- step: v3.2.0 (8)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.actionReadinessChecklist");
console.log("- checklist dimensions: ruleDraftReady, evidenceBundleReady, notificationReady");
console.log("- storage: reads existing EventRecord, source context, AI quality, and Ops review state only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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
