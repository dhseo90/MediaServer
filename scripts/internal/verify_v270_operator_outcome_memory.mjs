#!/usr/bin/env node
// 파일 용도: v2.7.0 S05 Operator outcome memory와 review/audit 기반 history hint 경계를 검증한다.

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
const serverSh = readText("server.sh");
const roadmapEvidence = [backlog, inventory, manualChecklist, streamVerification].join("\n");

check("roadmap records V270-S05 as active/completed Operator outcome memory work", () => {
  const hasCurrentRoadmapRow = /\| 5 \| V270-S05 \| P1 \| (진행|완료) \| Operator outcome memory \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V270-S05 | 완료 | Operator outcome memory |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V270-S05 row must be present in current or archived roadmap format");
  for (const snippet of [
    "media-server.ops.operator-outcome-memory.v1",
    "accept/dismiss/review-needed",
    "deterministic history hint",
    "Ops review state/audit",
    "EventRecord top-level 변경 없음",
    "client/viewer 비노출",
    "verify-v270-operator-outcome-memory",
  ]) {
    assertIncludes(roadmapEvidence, snippet, "V270-S05 roadmap evidence");
  }
});

check("Ops events API exposes operator outcome memory without EventRecord/schema/media side effects", () => {
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
    assertIncludes(server, snippet, "Ops operator outcome memory shell");
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
  for (const snippet of [
    "| V270-S05 Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` | `verify-v270-operator-outcome-memory` |",
    "| UI-054 | `/ops/events` Operator Outcome Memory |",
    "| EVT-054 | Ops operator outcome memory view model |",
    "| LAB-078 | V270-S05 operator outcome memory static guard |",
    "| SAFE-062 | V270-S05 operator outcome memory boundary |",
    "verify-v270-operator-outcome-memory",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S05 row");
  }
  assertIncludes(manualChecklist, "| V270-S05 Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` |", "manual UI checklist S05 row");
  assertIncludes(coverageVerifier, "verify-v270-operator-outcome-memory", "feature inventory coverage S05 command");
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
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
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
