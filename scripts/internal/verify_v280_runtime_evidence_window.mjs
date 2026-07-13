#!/usr/bin/env node
// 파일 용도: v2.8.0 S05 Runtime Evidence Window와 bounded/no-longrun/no-archive 경계를 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("roadmap records V280-S05 as active/completed runtime evidence window work", () => {
  assert(/\| 5 \| V280-S05 \| P1 \| (진행|완료) \| Runtime Evidence Window \|/.test(backlog),
    "backlog V280-S05 row must be 진행 or 완료 while S05 is under development");
  for (const snippet of [
    "media-server.ops.runtime-evidence-window.v1",
    "bounded runtime/source/event evidence window",
    "Ops-only runtime evidence packet",
    "page/session or bounded local buffer",
    "longrun substitute 아님",
    "verify-v280-runtime-evidence-window",
  ]) {
    assertIncludes(backlog, snippet, "V280-S05 backlog");
  }
});

check("Ops events API exposes bounded runtime evidence packets without archive/longrun claims", () => {
  const start = server.indexOf("std::string OpsRuntimeEvidenceWindowViewJson(");
  const end = server.indexOf("std::string OpsRuleWhatIfPreviewViewJson(", start);
  assert(start >= 0 && end > start, "EVT-058 runtime evidence projection block missing");
  const evt058ProjectionBlock = server.slice(start, end);
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assert(evt058ProjectionBlock.includes("media-server.ops.runtime-evidence-window.v1") && routeBlock.includes("/ops/api/events/reviews"), "LAB-082 runtime evidence window schema and review route readback mismatch");
  assertIncludes(evt058ProjectionBlock, "boundedLocalBuffer", "EVT-058 block-scoped canonical projection");
  assert(!evt058ProjectionBlock.includes("\\\"ruleRegistryWritePerformed\\\":true") && evt058ProjectionBlock.includes("\\\"ruleRegistryWritePerformed\\\":false"), "EVT-058 runtime evidence window must not write registry state");
  assertIncludes(evt058ProjectionBlock, "webrtcDataChannelSchemaChanged", "EVT-058 WebRTC SSE boundary");
  assert(!evt058ProjectionBlock.includes("\\\"persistentArchiveCreated\\\":true") && evt058ProjectionBlock.includes("\\\"persistentArchiveCreated\\\":false"), "EVT-058 no-write runtime archive boundary");
  for (const snippet of [
    "OpsRuntimeEvidenceWindowViewJson",
    "OpsRuntimeEvidenceWindowItemJson",
    "OpsRuntimeEvidenceWindowPacketJson",
    "media-server.ops.runtime-evidence-window.v1",
    "\\\"runtimeEvidenceWindow\\\":",
    "\\\"runtimeEvidencePacket\\\":",
    "\\\"windowScope\\\":",
    "\\\"boundedLocalBuffer\\\":true",
    "\\\"pageSessionOnly\\\":true",
    "\\\"eventWindowMs\\\":",
    "\\\"persistentArchiveCreated\\\":false",
    "\\\"longrunSubstitute\\\":false",
    "\\\"thirtyMinutePassClaimed\\\":false",
    "\\\"oneHundredTwentyMinutePassClaimed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops runtime evidence window API");
  }
});

check("/ops/events UI renders bounded runtime evidence window and no-longrun markers", () => {
  for (const snippet of [
    'data-testid="ops-runtime-evidence-window"',
    'data-runtime-evidence-window="bounded-ops-only-packet"',
    'id="opsRuntimeEvidenceWindowBadges"',
    'id="opsRuntimeEvidenceWindowRows"',
    "Runtime Evidence Window",
  ]) {
    assertIncludes(server, snippet, "Ops events runtime evidence window shell");
  }
  for (const snippet of [
    "renderRuntimeEvidenceWindow",
    "runtimeEvidenceWindow",
    "opsRuntimeEvidenceWindowRows",
    "runtimeEvidencePacket",
    "boundedLocalBuffer",
    "pageSessionOnly",
    "eventWindowMs",
    "persistentArchiveCreated",
    "longrunSubstitute",
    "thirtyMinutePassClaimed",
    "oneHundredTwentyMinutePassClaimed",
  ]) {
    assertIncludes(script, snippet, "Ops runtime evidence window script");
    assertIncludes(extractNamedFunctionBlock(script, "renderRuntimeEvidenceWindow"), "runtimeEvidenceWindow", "UI-058 block-scoped canonical product state");
    const longTermWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderRuntimeEvidenceWindow").includes(marker));
    assert(longTermWritePerformed === false, "UI-058 bounded runtime window must not create a long-term store");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderRuntimeEvidenceWindow").includes(marker)), "UI-058 no-write explicit absence oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(script, "renderRuntimeEvidenceWindow").includes(marker)), "UI-058 client-viewer-boundary explicit absence oracle");
    assertIncludes(script, "/ops/events", "UI-058 canonical route obligation");
  }
  for (const snippet of [
    ".runtime-evidence-window",
    ".runtime-evidence-window-list",
    ".runtime-evidence-window-card",
    ".runtime-evidence-window-grid",
    ".runtime-evidence-packet",
  ]) {
    assertIncludes(css, snippet, "Ops runtime evidence window CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S05", () => {
  for (const snippet of [
    'data-testid="ops-runtime-evidence-window"',
    'id="opsRuntimeEvidenceWindowRows"',
    "runtimeEvidenceWindow",
    "runtimeEvidencePacket",
    "boundedLocalBuffer",
    "pageSessionOnly",
    "longrunSubstitute",
    "persistentArchiveCreated",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V280-S05 Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` | `verify-v280-runtime-evidence-window`",
    "| UI-058 | `/ops/events` Runtime Evidence Window |",
    "| EVT-058 | Ops runtime evidence window view model |",
    "| LAB-082 | V280-S05 runtime evidence window static guard |",
    "| SAFE-068 | V280-S05 runtime evidence window boundary |",
    "verify-v280-runtime-evidence-window",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S05 row");
  }
  assertIncludes(manualChecklist, "| V280-S05 Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` |", "manual UI checklist S05 row");
  assert(implementationManifest.items.find(item => item.id === "LAB-082")?.verifierEvidence?.command === "verify-v280-runtime-evidence-window", "LAB-082 manifest verifier command drift");
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v280-runtime-evidence-window", "stream verification S05 command");
  assertIncludes(serverSh, "verify-v280-runtime-evidence-window", "server.sh S05 command");
  assertIncludes(serverSh, "verify_v280_runtime_evidence_window.mjs", "server.sh S05 script target");
});

check("S05 keeps forbidden archive/longrun/schema/media/client side effects absent", () => {
  for (const forbidden of [
    "/client/api/runtime-evidence-window",
    "/ops/api/runtime/evidence-window",
    "persistentArchiveCreated\\\":true",
    "longrunSubstitute\\\":true",
    "thirtyMinutePassClaimed\\\":true",
    "oneHundredTwentyMinutePassClaimed\\\":true",
    "localStorage.setItem('mediaServerRuntimeEvidenceWindow",
    "localStorage.setItem(\"mediaServerRuntimeEvidenceWindow",
    "sessionStorage.setItem('mediaServerRuntimeEvidenceWindow",
    "sessionStorage.setItem(\"mediaServerRuntimeEvidenceWindow",
    "indexedDB.open('mediaServerRuntimeEvidenceWindow",
    "indexedDB.open(\"mediaServerRuntimeEvidenceWindow",
    "30분 테스트 PASS 완료",
    "120분 테스트 PASS 완료",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S05 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.8.0 S05 runtime evidence window 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.8.0 S05 runtime evidence window 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
