#!/usr/bin/env node
// 파일 용도: v2.8.0 S02 Incident Action Readiness Queue와 승인 전 조치 경계를 검증한다.
import { exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


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

check("roadmap records V280-S02 as active/completed Incident Action Readiness Queue work", () => {
  assert(/\| 2 \| V280-S02 \| P0 \| (진행|완료) \| Incident Action Readiness Queue \|/.test(backlog),
    "backlog V280-S02 row must be 진행 or 완료 while S02 is under development");
  for (const snippet of [
    "media-server.ops.incident-action-readiness-queue.v1",
    "ready/blocked/field-smoke-needed/not-run",
    "Ops-only action readiness view model/UI",
    "external delivery 미수행",
    "자동 action write 없음",
    "verify-v280-incident-action-readiness-queue",
  ]) {
    assertIncludes(backlog, snippet, "V280-S02 backlog");
  }
});

check("Ops events API exposes readiness queue view model without delivery/action side effects", () => {
  const start = server.indexOf("std::string OpsIncidentActionReadinessQueueViewJson(");
  const end = server.indexOf("std::string OpsEvidenceIntakeFieldReadinessViewJson(", start);
  assert(start >= 0 && end > start, "EVT-055 action readiness projection block missing");
  const evt055ProjectionBlock = server.slice(start, end);
  assertIncludes(evt055ProjectionBlock, "media-server.ops.incident-action-readiness-queue.v1", "EVT-055 block-scoped canonical projection");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-055 canonical review route");
  assert(evt055ProjectionBlock.includes("media-server.ops.incident-action-readiness-queue.v1") && routeBlock.includes("/ops/api/events/reviews") && exactBooleanFlagValue(evt055ProjectionBlock, "autoActionWritePerformed") === false && exactBooleanFlagValue(evt055ProjectionBlock, "externalDeliveryPerformed") === false, "LAB-079 readiness queue must remain no-write/no-send on canonical review route");
  assertIncludes(evt055ProjectionBlock, "webrtcDataChannelSchemaChanged", "EVT-055 WebRTC SSE boundary");
  for (const snippet of [
    "OpsIncidentActionReadinessQueueViewJson",
    "OpsIncidentActionReadinessQueueItemJson",
    "OpsIncidentActionReadinessFollowUpJson",
    "media-server.ops.incident-action-readiness-queue.v1",
    "\\\"incidentActionReadinessQueue\\\":",
    "\\\"readinessStatus\\\":",
    "\\\"blockerReasons\\\":",
    "\\\"fieldSmokeRequired\\\":",
    "\\\"manualApprovalRequired\\\":true",
    "\\\"autoActionWritePerformed\\\":false",
    "\\\"externalDeliveryPerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops incident action readiness queue API");
  }
});

check("/ops/events UI renders readiness queue panel and manual approval markers", () => {
  for (const snippet of [
    'data-testid="ops-incident-action-readiness-queue"',
    'data-incident-action-readiness-queue="operator-supervised-follow-ups"',
    'id="opsIncidentActionReadinessQueueBadges"',
    'id="opsIncidentActionReadinessQueueRows"',
    "Incident Action Readiness Queue",
  ]) {
    assertIncludes(server, snippet, "Ops incident action readiness shell");
  }
  for (const snippet of [
    "renderIncidentActionReadinessQueue",
    "incidentActionReadinessQueue",
    "opsIncidentActionReadinessQueueRows",
    "readinessStatus",
    "fieldSmokeRequired",
    "manualApprovalRequired",
    "autoActionWritePerformed",
    "externalDeliveryPerformed",
  ]) {
    assertIncludes(script, snippet, "Ops incident action readiness script");
    assertIncludes(extractNamedFunctionBlock(script, "renderIncidentActionReadinessQueue"), "incidentActionReadinessQueue", "UI-055 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderIncidentActionReadinessQueue").includes(marker)), "UI-055 no-write explicit absence oracle");
    assert(!["send(","sendClientNotice","deliveryQueueWritePerformed: true"].some(marker => extractNamedFunctionBlock(script, "renderIncidentActionReadinessQueue").includes(marker)), "UI-055 no-send explicit absence oracle");
    assert(!["method: 'POST'","method: 'PUT'","method: 'PATCH'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderIncidentActionReadinessQueue").includes(marker)), "UI-055 no-mutation explicit absence oracle");
    const mediaPathChanged = ["method: 'POST'", "method: 'PUT'", "method: 'PATCH'", "method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderIncidentActionReadinessQueue").includes(marker));
    assert(mediaPathChanged === false, "UI-055 readiness renderer must not mutate EventRecord or media paths");
    assertIncludes(script, "/ops/events", "UI-055 canonical route obligation");
    assertIncludes(script, "WebRTC", "UI-055 canonical field obligation");
  }
  for (const snippet of [
    ".incident-action-readiness-queue",
    ".incident-action-readiness-queue-list",
    ".incident-action-readiness-queue-card",
    ".incident-action-readiness-followups",
  ]) {
    assertIncludes(css, snippet, "Ops incident action readiness CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S02", () => {
  for (const snippet of [
    'data-testid="ops-incident-action-readiness-queue"',
    'id="opsIncidentActionReadinessQueueRows"',
    "incidentActionReadinessQueue",
    "readinessStatus",
    "fieldSmokeRequired",
    "autoActionWritePerformed",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V280-S02 Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` | `verify-v280-incident-action-readiness-queue`",
    "| UI-055 | `/ops/events` Incident Action Readiness Queue |",
    "| EVT-055 | Ops incident action readiness queue view model |",
    "| LAB-079 | V280-S02 incident action readiness queue static guard |",
    "| SAFE-065 | V280-S02 incident action readiness queue boundary |",
    "verify-v280-incident-action-readiness-queue",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S02 row");
  }
  assertIncludes(manualChecklist, "| V280-S02 Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` |", "manual UI checklist S02 row");
  for (const id of ["UI-055", "EVT-055", "LAB-079", "SAFE-065"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v280-incident-action-readiness-queue", `${id} manifest verifier command drift`);
  }
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v280-incident-action-readiness-queue", "stream verification S02 command");
  assertIncludes(serverSh, "verify-v280-incident-action-readiness-queue", "server.sh S02 command");
  assertIncludes(serverSh, "verify_v280_incident_action_readiness_queue.mjs", "server.sh S02 script target");
});

check("S02 keeps forbidden delivery/action/provider/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/incident-action-readiness-queue",
    "autoActionWritePerformed\\\":true",
    "externalDeliveryPerformed\\\":true",
    "ruleRegistryWritePerformed\\\":true",
    "sourceHealthWritePerformed\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S02 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.8.0 S02 incident action readiness queue 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.8.0 S02 incident action readiness queue 통과 ==");

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
