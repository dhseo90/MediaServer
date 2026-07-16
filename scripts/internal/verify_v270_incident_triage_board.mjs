#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.7.0 S01 Incident Triage Board view model/UI와 비범위 경계를 검증한다.
import { extractCppFunctionBlock, exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const serverPages = readText("src/ingress/product_ui_server_pages.cpp");
const triageBoardViewBlock = extractCppFunctionBlock(server, "std::string OpsIncidentTriageBoardViewJson(");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");
const roadmapEvidence = [backlog, inventory, streamVerification].join("\n");

check("roadmap records V270-S01 as active/completed Incident Triage Board work", () => {
  const hasCurrentRoadmapRow = /\| 1 \| V270-S01 \| P0 \| (진행|완료) \| Incident Triage Board \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V270-S01 | 완료 | Incident Triage Board |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V270-S01 row must be present in current or archived roadmap format");
  for (const snippet of [
    "media-server.ops.incident-triage-board.v1",
    "lane/filter/sort",
    "viewer/client 비노출",
    "verify-v270-incident-triage-board",
  ]) {
    assertIncludes(roadmapEvidence, snippet, "V270-S01 roadmap evidence");
  }
});

check("Ops events API exposes deterministic Ops-only triage board view model", () => {
  assertIncludes(triageBoardViewBlock, "media-server.ops.incident-triage-board.v1", "/ops/api/events/reviews incident triage board API");
  assert(triageBoardViewBlock.includes("cardCount") &&
    triageBoardViewBlock.includes("media-server.ops.incident-triage-board.v1"),
  "LAB-074 incident triage board cardCount block readback mismatch");
  assert(exactBooleanFlagValue(triageBoardViewBlock, "eventPostPayloadChanged") === false, "triage board must not change Event POST");
  for (const snippet of [
    "OpsIncidentTriageBoardViewJson",
    "OpsIncidentTriageBoardCardJson",
    "OpsIncidentTriageBoardLane",
    "OpsIncidentTriageBoardPriority",
    "media-server.ops.incident-triage-board.v1",
    "\\\"incidentTriageBoard\\\":",
    "\\\"laneFilters\\\":[\\\"all\\\",\\\"needs-triage\\\",\\\"in-progress\\\",\\\"watchlist\\\",\\\"resolved\\\"]",
    "\\\"sortOptions\\\":[\\\"priority\\\",\\\"review-age\\\",\\\"event-time\\\"]",
    "\\\"reviewState\\\":",
    "\\\"sourceId\\\":",
    "\\\"ruleId\\\":",
    "\\\"scenario\\\":",
    "\\\"similarIncidentKey\\\":",
    "\\\"vlmCandidateStatus\\\":",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"runtimeVlmCallPerformed\\\":false",
    "\\\"cloudProviderApiCalled\\\":false",
    "\\\"autoActionApplied\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops incident triage board API");
  }
});

check("/ops/events UI renders triage board lanes, filters, and sort controls", () => {
  for (const snippet of [
    'data-testid="ops-incident-triage-board"',
    'data-incident-triage-board="lane-filter-sort"',
    'id="opsIncidentTriageLaneFilter"',
    'id="opsIncidentTriagePriorityFilter"',
    'id="opsIncidentTriageSort"',
    'id="opsIncidentTriageBoardBadges"',
    'id="opsIncidentTriageBoardRows"',
    "Incident Triage Board",
  ]) {
    assertIncludes(serverPages, snippet, "Ops incident triage board shell");
  }
  for (const snippet of [
    "renderIncidentTriageBoard",
    "incidentTriageBoard",
    "opsIncidentTriageBoardRows",
    "opsIncidentTriageLaneFilter",
    "opsIncidentTriagePriorityFilter",
    "opsIncidentTriageSort",
    "similarIncidentKey",
    "vlmCandidateStatus",
  ]) {
    assertIncludes(script, snippet, "Ops incident triage board script");
  }
  assertIncludes(extractNamedFunctionBlock(script, "renderIncidentTriageBoard"), "media-server.ops.incident-triage-board.v1", "UI-050 block-scoped canonical product state");
  assertIncludes(script, "/ops/events", "UI-050 canonical route obligation");
  assertIncludes(script, "VLM", "UI-050 canonical field obligation");
  for (const snippet of [
    ".incident-triage-board",
    ".incident-triage-board-lanes",
    ".incident-triage-lane",
    ".incident-triage-card",
  ]) {
    assertIncludes(css, snippet, "Ops incident triage board CSS");
  }
});

check("smoke, inventory, coverage, and command catalog track S01", () => {
  for (const snippet of [
    'data-testid="ops-incident-triage-board"',
    'id="opsIncidentTriageBoardRows"',
    "incidentTriageBoard",
    "opsIncidentTriageLaneFilter",
    "opsIncidentTriageSort",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V270-S01 Incident Triage Board | `UI-050`, `EVT-050`, `LAB-074`, `SAFE-058` | `verify-v270-incident-triage-board` |",
    "| UI-050 | `/ops/events` Incident Triage Board |",
    "| EVT-050 | Ops incident triage board view model |",
    "| LAB-074 | V270-S01 incident triage board static guard |",
    "| SAFE-058 | V270-S01 incident triage board boundary |",
    "verify-v270-incident-triage-board",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S01 row");
  }
  for (const id of ["UI-050", "EVT-050", "LAB-074"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v270-incident-triage-board", `${id} manifest verifier command drift`);
  }
  assert(implementationManifest.items.find(item => item.id === "SAFE-058")?.verifierEvidence?.command === "verify-auth-routes",
    "SAFE-058 strongest runtime boundary verifier command drift");
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v270-incident-triage-board", "stream verification S01 command");
  assertIncludes(serverSh, "verify-v270-incident-triage-board", "server.sh S01 command");
  assertIncludes(serverSh, "verify_v270_incident_triage_board.mjs", "server.sh S01 script target");
});

check("S01 keeps forbidden client/runtime/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/incident-triage-board",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "autoActionApplied\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !serverPages.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S01 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.7.0 S01 incident triage board 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.7.0 S01 incident triage board 통과 ==");

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
