#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.2.0 Step 3 Unified Ops Events Workspace 구현, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.2.0 Unified Ops Events Workspace verification

Usage:
  ./server.sh verify-v320-unified-ops-events-workspace

Checks:
  - /ops/events exposes a Step 3 resolution queue/detail/timeline workspace shell
  - /ops/api/events/reviews returns an Ops-only unifiedResolutionWorkspace view model
  - product UI script renders the queue/detail/timeline without source URL/raw JSON/debug/client exposure
  - CSS provides responsive queue/detail/timeline workspace layouts
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
  - PASS is limited to v3.2.0 Step 3 local/static UI evidence and does not imply UI 풀테스트, 30분/120분, evidence quality, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-unified-ops-events-workspace";
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

check("ops events page exposes Step 3 unified workspace shell", () => {
  for (const snippet of [
    'data-testid="ops-v320-unified-events-workspace"',
    'data-v320-unified-events-workspace="resolution-queue-detail-timeline"',
    'id="opsV320UnifiedWorkspaceSummary"',
    'id="opsV320UnifiedWorkspaceBadges"',
    'id="opsV320ResolutionQueue"',
    'id="opsV320ResolutionDetail"',
    'id="opsV320ResolutionTimeline"',
    "Unified Resolution Workspace",
    "resolution queue",
    "resolution detail",
    "resolution timeline",
  ]) {
    assertIncludes(files.server, snippet, "V320 unified workspace UI shell");
  }
});

check("ops review API returns Step 3 Ops-only unified resolution workspace view model", () => {
  const start = files.server.indexOf("std::string OpsV320UnifiedResolutionWorkspaceItemJson(");
  const end = files.server.indexOf("std::string OpsV310ReplayTimelineItemJson(", start);
  assert(start >= 0 && end > start, "EVT-064 unified workspace projection block missing");
  const evt064WorkspaceBlock = files.server.slice(start, end);
  assertIncludes(evt064WorkspaceBlock, "media-server.ops.v320-unified-events-workspace.v1", "EVT-064 block-scoped canonical workspace projection");
  assert(!evt064WorkspaceBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt064WorkspaceBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-064 workspace must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/events", "OPS-071 canonical page route");
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-064 canonical review route");
  for (const snippet of [
    "OpsV320UnifiedOpsEventsWorkspaceJson",
    "OpsV320UnifiedResolutionWorkspaceItemJson",
    "media-server.ops.v320-unified-events-workspace.v1",
    "\\\"unifiedResolutionWorkspace\\\":",
    "\\\"resolutionQueue\\\":",
    "\\\"selectedDetail\\\":",
    "\\\"resolutionTimeline\\\":",
    "\\\"queueStatus\\\":",
    "\\\"detailSections\\\":",
    "\\\"timelineMarkers\\\":",
    "\\\"resolutionState\\\":",
    "\\\"closeReopenLifecycle\\\":",
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
  ]) {
    assertIncludes(files.server, snippet, "V320 unified workspace view model");
  }
});

check("product UI script renders Step 3 queue detail timeline", () => {
  const workspaceBlock = extractNamedFunctionBlock(files.pageScript, "renderV320UnifiedOpsEventsWorkspace");
  for (const snippet of [
    "renderV320UnifiedOpsEventsWorkspace",
    "opsV320UnifiedWorkspaceSummary",
    "opsV320UnifiedWorkspaceBadges",
    "opsV320ResolutionQueue",
    "opsV320ResolutionDetail",
    "opsV320ResolutionTimeline",
    "unifiedResolutionWorkspace",
    "media-server.ops.v320-unified-events-workspace.v1",
    "resolutionQueue",
    "selectedDetail",
    "resolutionTimeline",
    "timelineMarkers",
    "closeReopenLifecycle",
    "sourceUrlExposed",
    "rawJsonExposed",
    "debugMaterialExposed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 unified workspace UI script");
  }
  assertIncludes(workspaceBlock, "media-server.ops.v320-unified-events-workspace.v1", "UI-062 block-scoped canonical product state");
  assertIncludes(workspaceBlock, "unifiedResolutionWorkspace.rawJsonExposed === false", "UI-062 block-scoped raw JSON redaction contract");
  assertIncludes(workspaceBlock, "unifiedResolutionWorkspace.sourceUrlExposed === false", "UI-062 block-scoped source URL redaction contract");
  assert(!["rawJsonPayload", "rawPayload", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => workspaceBlock.includes(marker)), "UI-062 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl:", "sourceURL:", "sourceUrlValue", "rtsp://", "rtsps://"].some(marker => workspaceBlock.includes(marker)), "UI-062 source-url-redaction explicit absence oracle");
  assert(!["providerApiCall(", "providerResponse", "rawProviderResponse", "providerMaterialExposed: true", "rawProviderMaterialExposed: true"].some(marker => workspaceBlock.includes(marker)), "UI-062 provider-material explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => workspaceBlock.includes(marker)), "UI-062 debug-redaction explicit absence oracle");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => workspaceBlock.includes(marker)), "UI-062 client-viewer-boundary explicit absence oracle");
  assertIncludes(files.pageScript, "/ops/events", "UI-062 canonical route obligation");
});

check("Step 3 unified workspace CSS is responsive", () => {
  for (const snippet of [
    ".v320-unified-events-workspace",
    ".v320-resolution-workspace-grid",
    ".v320-resolution-queue",
    ".v320-resolution-queue-card",
    ".v320-resolution-detail",
    ".v320-resolution-detail-grid",
    ".v320-resolution-timeline",
    ".v320-resolution-timeline-marker",
  ]) {
    assertIncludes(files.css, snippet, "V320 unified workspace CSS");
  }
});

check("ops static smoke tracks Step 3 workspace markers", () => {
  for (const snippet of [
    'data-testid="ops-v320-unified-events-workspace"',
    'visualSelector: \'[data-testid="ops-v320-unified-events-workspace"]\'',
    'id="opsV320ResolutionQueue"',
    'id="opsV320ResolutionDetail"',
    'id="opsV320ResolutionTimeline"',
    "unifiedResolutionWorkspace",
    "media-server.ops.v320-unified-events-workspace.v1",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 3 scope without overclaim", () => {
  for (const snippet of [
    "| 3 | v3.2.0 (3) Unified Ops Events Workspace | P0 | 완료 |",
    "`/ops/events` resolution queue/detail/timeline workspace",
    "`./server.sh verify-v320-unified-ops-events-workspace`",
    "Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 3 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 3");
  }
  for (const snippet of [
    "| v3.2.0 (3) | `./server.sh verify-v320-unified-ops-events-workspace` |",
    "Unified Ops Events Workspace",
    "resolution queue/detail/timeline workspace",
    "UI 풀테스트 직접 조작, 30분/120분, evidence quality, source reliability, AI review quality, operator assignment flow, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 3");
  }
});

check("feature inventory and release records map v3.2 Step 3", () => {
  for (const snippet of [
    "v3.2.0 (3) Unified Ops Events Workspace | `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` | `verify-v320-unified-ops-events-workspace`, `verify-ops-client-ui`",
    "UI-062 | V320 Step 3 Unified Ops Events Workspace UI",
    "EVT-064 | V320 Step 3 unified resolution workspace view model",
    "SAFE-104 | V320 Step 3 unified workspace boundary",
    "OPS-071 | V320 Step 3 Unified Ops Events Workspace 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 3");
  }
  for (const snippet of [
    "V320 Unified Ops Events Workspace",
    "`./server.sh verify-v320-unified-ops-events-workspace`",
    "v320 Step 3 RED unified workspace gate",
    "v320 Step 3 unified workspace final",
    "v320 Step 3 UI 풀테스트",
    "v320 Step 3 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 3");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 3 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_unified_ops_events_workspace.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["UI-062", "EVT-064", "SAFE-104", "OPS-071"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_unified_ops_events_workspace.mjs", "script inventory");
});

check("SAFE-104 canonical unified workspace boundary", () => {
  const workspaceBlock = extractCppFunctionBlock(files.server, "std::string OpsV320UnifiedOpsEventsWorkspaceJson(");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  const safe104BoundaryObserved = routeBlock.includes('kOpsEventsPagePath = "/ops/events"') &&
    workspaceBlock.includes("media-server.ops.v320-unified-events-workspace.v1") &&
    workspaceBlock.includes("OpsV320UnifiedResolutionWorkspaceItemJson");
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(workspaceBlock);
  const rawMaterialExposed = /\\\"raw(?:Json|Evidence|Payload)(?:Exposed|Included)\\\":true/.test(workspaceBlock);
  const sourceUrlExposed = workspaceBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = workspaceBlock.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(workspaceBlock);
  assert(safe104BoundaryObserved && schemaMutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false,
    "SAFE-104 media-server.ops.v320-unified-events-workspace.v1 /ops/events unifiedResolutionWorkspace must remain read-only and exclude raw/source/debug/client material");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 unified ops events workspace summary ==");
console.log("- schema: media-server.ops.v320-unified-events-workspace.v1");
console.log("- step: v3.2.0 (3)");
console.log("- route: /ops/events");
console.log("- workspace: resolution queue/detail/timeline");
console.log("- storage: reads EventRecord and Ops review JSONL only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- evidenceQualityLayer: not-run-by-this-command");
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
