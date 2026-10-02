#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.8.0 S05 Runtime Evidence Window와 bounded/no-longrun/no-archive 경계를 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const productUiPages = readText("src/ingress/product_ui_server_pages.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const reviewDoc = readText("docs/vlm-ops-event-review-ui.md");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

const definitionIds = ["UI-058","EVT-058","LAB-082","SAFE-068"];
const currentDefinitions = inventory.split(/\r?\n/).filter(line => definitionIds.includes(line.split("|")[1]?.trim())).join("\n");

check("현행 계약·기능 정의·검증 명령 연결", () => {
  const errors = validateFeatureDocumentation({
    document: reviewDoc, identifiers: ["media-server.ops.runtime-evidence-window.v1"],
    command: "verify-v280-runtime-evidence-window", script: "verify_v280_runtime_evidence_window.mjs",
    featureIds: ["UI-058","EVT-058","LAB-082"], inventory, implementation: implementationManifest,
    verification: streamVerification, server: serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 runtime 검사의 결속을 확인할 뿐 여기서 실행하거나 정적 검사로 대체하지 않는다.
  for (const [id, expectedCommand] of [["SAFE-068","verify-auth-routes"]]) {
    const rows = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementationManifest.items.filter(item => item.id === id);
    assert(rows.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand,
      id + " 독립 실행 정의/명령 연결 누락 또는 중복");
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
    assertIncludes(productUiPages, snippet, "Ops events runtime evidence window shell");
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
  assert(manualChecklist.split(/\r?\n/).some(line => definitionIds.every(id => line.includes("`" + id + "`")) && line.includes("verify-v280-runtime-evidence-window")), "manual UI checklist S05 row: 기능 ID·명령 연결 누락");
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
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !currentDefinitions.includes(forbidden),
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
console.log("[scope] uiFulltest: not-run-by-this-command; longrun30Or120: not-run-by-this-command");
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
