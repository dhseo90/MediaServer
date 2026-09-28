#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.7.0 S05 Operator outcome memory와 review/audit 기반 history hint 경계를 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const serverPages = readText("src/ingress/product_ui_server_pages.cpp");
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

const definitionIds = ["UI-054","EVT-054","LAB-078","SAFE-062"];
const currentDefinitions = inventory.split(/\r?\n/).filter(line => definitionIds.includes(line.split("|")[1]?.trim())).join("\n");

check("현행 계약·기능 정의·검증 명령 연결", () => {
  const errors = validateFeatureDocumentation({
    document: reviewDoc, identifiers: ["media-server.ops.operator-outcome-memory.v1"],
    command: "verify-v270-operator-outcome-memory", script: "verify_v270_operator_outcome_memory.mjs",
    featureIds: ["UI-054","EVT-054","LAB-078"], inventory, implementation: implementationManifest,
    verification: streamVerification, server: serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 runtime 검사의 결속을 확인할 뿐 여기서 실행하거나 정적 검사로 대체하지 않는다.
  for (const [id, expectedCommand] of [["SAFE-062","verify-auth-routes"]]) {
    const rows = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementationManifest.items.filter(item => item.id === id);
    assert(rows.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand,
      id + " 독립 실행 정의/명령 연결 누락 또는 중복");
  }
});

check("Ops events API exposes operator outcome memory without EventRecord/schema/media side effects", () => {
  const start = server.indexOf("std::string OpsOperatorOutcomeMemoryViewJson(");
  const end = server.indexOf("std::string OpsIncidentReviewProjectionJson(", start);
  assert(start >= 0 && end > start, "EVT-054 operator outcome memory projection block missing");
  const evt054ProjectionBlock = server.slice(start, end);
  assertIncludes(evt054ProjectionBlock, "media-server.ops.operator-outcome-memory.v1", "EVT-054 block-scoped canonical projection");
  assert(evt054ProjectionBlock.includes("media-server.ops.operator-outcome-memory.v1"), "LAB-078 operator outcome memory schema block readback mismatch");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-054 canonical review route");
  for (const snippet of [
    "OpsOperatorOutcomeMemoryViewJson",
    "OpsOperatorOutcomeMemoryItemJson",
    "OpsOperatorOutcomeMemoryHistoryHintJson",
    "OpsOperatorOutcomeMemoryCountsJson",
    "media-server.ops.operator-outcome-memory.v1",
    "\\\"operatorOutcomeMemory\\\":",
    "\\\"deterministicHistoryHint\\\":",
    "\\\"reviewStateBasis\\\":",
    "\\\"auditActionRefs\\\":",
    "\\\"acceptedCount\\\":",
    "\\\"dismissedCount\\\":",
    "\\\"reviewNeededCount\\\":",
    "\\\"eventReviewUpdate\\\"",
    "\\\"incidentActionUpdate\\\"",
    "\\\"eventRecordSchemaChanged\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops operator outcome memory API");
  }
});

check("/ops/events UI renders operator outcome memory history hints", () => {
  for (const snippet of [
    'data-testid="ops-operator-outcome-memory"',
    'data-operator-outcome-memory="review-audit-history-hint"',
    'id="opsOperatorOutcomeMemoryBadges"',
    'id="opsOperatorOutcomeMemoryRows"',
    "Operator Outcome Memory",
  ]) {
    assertIncludes(serverPages, snippet, "Ops operator outcome memory shell");
  }
  for (const snippet of [
    "renderOperatorOutcomeMemory",
    "operatorOutcomeMemory",
    "opsOperatorOutcomeMemoryRows",
    "deterministicHistoryHint",
    "reviewStateBasis",
    "auditActionRefs",
    "acceptedCount",
    "dismissedCount",
    "reviewNeededCount",
  ]) {
    assertIncludes(script, snippet, "Ops operator outcome memory script");
    assertIncludes(extractNamedFunctionBlock(script, "renderOperatorOutcomeMemory"), "operatorOutcomeMemory", "UI-054 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderOperatorOutcomeMemory").includes(marker)), "UI-054 no-write explicit absence oracle");
    assertIncludes(script, "/ops/events", "UI-054 canonical route obligation");
  }
  for (const snippet of [
    ".operator-outcome-memory",
    ".operator-outcome-memory-list",
    ".operator-outcome-memory-card",
    ".operator-outcome-memory-hint",
  ]) {
    assertIncludes(css, snippet, "Ops operator outcome memory CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S05", () => {
  for (const snippet of [
    'data-testid="ops-operator-outcome-memory"',
    'id="opsOperatorOutcomeMemoryRows"',
    "operatorOutcomeMemory",
    "deterministicHistoryHint",
    "reviewStateBasis",
    "auditActionRefs",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  assert(manualChecklist.split(/\r?\n/).some(line => definitionIds.every(id => line.includes("`" + id + "`")) && line.includes("verify-v270-operator-outcome-memory")), "manual UI checklist S05 row: 기능 ID·명령 연결 누락");
  for (const id of ["UI-054", "EVT-054", "LAB-078"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v270-operator-outcome-memory", `${id} manifest verifier command drift`);
  }
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v270-operator-outcome-memory", "stream verification S05 command");
  assertIncludes(serverSh, "verify-v270-operator-outcome-memory", "server.sh S05 command");
  assertIncludes(serverSh, "verify_v270_operator_outcome_memory.mjs", "server.sh S05 script target");
});

check("S05 keeps forbidden persistence/client/provider/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/operator-outcome-memory",
    "operatorOutcomeMemoryPersistentWrite\\\":true",
    "eventRecordSchemaChanged\\\":true",
    "eventPostPayloadChanged\\\":true",
    "webrtcDataChannelSchemaChanged\\\":true",
    "sseMetadataSchemaChanged\\\":true",
    "wsMetadataSchemaChanged\\\":true",
    "rtspOrWebrtcMediaPathChanged\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "EventRecord top-level 변경 완료",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !serverPages.includes(forbidden) && !script.includes(forbidden) && !currentDefinitions.includes(forbidden),
      `forbidden S05 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.7.0 S05 operator outcome memory 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("[scope] uiFulltest: not-run-by-this-command; longrun30Or120: not-run-by-this-command");
console.log("== v2.7.0 S05 operator outcome memory 통과 ==");

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
