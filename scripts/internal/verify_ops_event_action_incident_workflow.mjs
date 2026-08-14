#!/usr/bin/env node
// 파일 용도: V240-S02 Event Action and Incident Workflow의 Ops-only state/audit/UI 경계를 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";
import { resolveWebRtcHttpServerSource } from "./webrtc_http_server_source_bundle.mjs";

import fs from "node:fs";
import process from "node:process";

const failures = [];

const reviewStateSource = resolveWebRtcHttpServerSource(readText, {
  tokens: [".media_server.event_reviews.jsonl", "std::string OpsEventReviewStateJson("],
});
const reviewInboxSource = resolveWebRtcHttpServerSource(readText, {
  tokens: ["bool OpsEventReviewInboxJson(", "incidentActionSchema"],
});
const reviewMutationSource = resolveWebRtcHttpServerSource(readText, {
  tokens: ["incident-action-update", "previous.present ? OpsEventReviewStateJson(previous)"],
});
const reviewStateBlock = extractCppFunctionBlock(
  reviewStateSource.source, "std::string OpsEventReviewStateJson(");
const pageShell = ownedSource(
  "src/ingress/product_ui_server_pages.cpp", readText("src/ingress/product_ui_server_pages.cpp"));
const pageScript = ownedSource(
  "src/ingress/product_ui_page_scripts.cpp", readText("src/ingress/product_ui_page_scripts.cpp"));
const css = ownedSource("src/ingress/product_ui_css.cpp", readText("src/ingress/product_ui_css.cpp"));
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventStorage = readText("src/analysis/event_storage.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");
const featureInventory = readText("docs/project-feature-test-inventory.md");

check("incident action state is stored in ops-only review storage", () => {
  assertIncludes(reviewStateBlock, "incident-action-state", "/ops/api/events/reviews incident action state schema");
  for (const snippet of [
    ".media_server.event_reviews.jsonl",
    "incident_status",
    "action_target",
    "media-server.ops.incident-action-state.v1",
    "incidentStatuses",
    "NormalizeOpsIncidentStatus",
    "NormalizeOpsIncidentId",
    "NormalizeOpsEventActionTarget",
  ]) {
    assertIncludes(reviewStateSource.source, snippet, "incident action state owner");
  }
  for (const snippet of [
    "incidentActionSchema",
    "incidentActionPersistent",
    "incidentAuditAction",
  ]) {
    assertIncludes(reviewInboxSource.source, snippet, "incident inbox projection owner");
  }
});

check("incident workflow supports the V240-S02 status set", () => {
  for (const status of [
    "new",
    "review-needed",
    "acknowledged",
    "in-progress",
    "closed",
    "false-positive",
  ]) {
    assertIncludes(reviewStateSource.source, status, "incident workflow storage status owner");
    assertIncludes(pageScript.source, status, "incident workflow UI behavior status owner");
  }
});

check("incident action audit is persisted separately from EventRecord payloads", () => {
  const actionBlock = extractNamedFunctionBlock(pageScript.source, "bindEventReviewActions");
  assertIncludes(reviewStateSource.source, '\\"eventPostPayloadChanged\\":false',
    "eventPostPayloadChanged must remain absent/false in incident action state");
  for (const snippet of [
    "incident-action-update",
    "AppendOpsAuditRecord",
    "OpsEventReviewStateJson(previous)",
  ]) {
    assertIncludes(reviewMutationSource.source, snippet, "incident mutation/audit owner");
  }
  for (const snippet of [
    '\\"separateFromEventRecords\\":true',
    '\\"separateFromEventPostPayload\\":true',
    '\\"eventPostPayloadChanged\\":false',
  ]) {
    assertIncludes(reviewStateSource.source, snippet, "incident persistence separation owner");
    assertIncludes(reviewInboxSource.source, snippet, "incident inbox separation owner");
  }
  assertIncludes(actionBlock, "incident-action-update", "UI-037 block-scoped canonical product state");
  assert(!["method: 'POST'", "method: 'PATCH'", "method: 'DELETE'"].some(marker => actionBlock.includes(marker)), "UI-037 no-write explicit absence oracle");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => actionBlock.includes(marker)), "UI-037 client-viewer-boundary explicit absence oracle");
  assertIncludes(pageScript.source, "/ops/events", "UI-037 canonical route obligation");
  assertIncludes(pageScript.source, "new", "UI-037 canonical field obligation");
});

check("event payload storage excludes incident/action review fields", () => {
  for (const forbidden of [
    "incidentStatus",
    "incidentWorkflow",
    "incident-action-update",
    "actionTarget",
  ]) {
    assert(!eventStorage.includes(forbidden), `EventRecord storage must not include ${forbidden}`);
    assert(!eventPost.includes(forbidden), `Event POST dispatcher must not include ${forbidden}`);
  }
});

check("ops events UI exposes incident/action controls and audit trail", () => {
  for (const snippet of [
    'data-incident-action-workflow="ops-only-incident-state"',
    'id="eventReviewIncidentStatusFilter"',
    'data-testid="ops-event-incident-workflow"',
    'id="event-review-audit-list"',
    "Incident / Action Audit Trail",
  ]) {
    assertOwnedIncludes(pageShell, "src/ingress/product_ui_server_pages.cpp", snippet,
      "incident action HTML owner");
  }
  for (const snippet of [
    'data-incident-action-workflow="ops-only-incident-state"',
    "eventReviewIncidentHtml",
    "INCIDENT_WORKFLOW_STATUSES",
    'data-event-review-field="incidentStatus"',
    'data-event-review-field="incidentId"',
    'data-event-review-field="actionTarget"',
    "renderOpsAuditTrail('event-review-audit-list', 'events')",
  ]) {
    assertOwnedIncludes(pageScript, "src/ingress/product_ui_page_scripts.cpp", snippet,
      "incident action behavior owner");
  }
  assertOwnedIncludes(css, "src/ingress/product_ui_css.cpp", ".event-incident-action-controls",
    "incident action CSS owner");
});

check("source-owner negatives reject omission, wrong owner, and stale combined input", () => {
  assertThrows(() => resolveWebRtcHttpServerSource(file =>
    file === reviewStateSource.file ? "" : readText(file), {
    tokens: [".media_server.event_reviews.jsonl", "std::string OpsEventReviewStateJson("],
  }), "missing canonical review-state owner was accepted");

  assertThrows(() => assertOwnedIncludes({
    file: reviewInboxSource.file,
    source: reviewStateSource.source,
  }, reviewStateSource.file, "OpsEventReviewStateJson", "review-state owner"),
  "wrong canonical review-state owner was accepted");

  assertThrows(() => assertOwnedIncludes({
    file: "synthetic-combined-product-ui.cpp",
    source: `${pageShell.source}\n${pageScript.source}\n${css.source}`,
  }, pageShell.file, "eventReviewIncidentHtml", "product UI owner"),
  "stale combined product UI input was accepted");
});

check("ops UI smoke tracks incident/action workflow markers", () => {
  for (const snippet of [
    'data-incident-action-workflow="ops-only-incident-state"',
    'data-testid="ops-event-incident-workflow"',
    'id="eventReviewIncidentStatusFilter"',
    'id="event-review-audit-list"',
  ]) {
    assertIncludes(uiSmoke, snippet, "ops events smoke marker");
  }
});

check("feature inventory names the V240-S02 action surface", () => {
  for (const snippet of [
    "| UI-037 | `/ops/events` Event Action and Incident Workflow |",
    "| EVT-037 | Event Action and Incident Workflow state |",
    "| SAFE-041 | V240-S02 EventRecord/Event POST incident workflow boundary |",
  ]) {
    assertIncludes(featureInventory, snippet, "feature inventory incident workflow row");
  }
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-ops-event-action-incident-workflow", "server.sh command");
  assertIncludes(serverSh, "verify_ops_event_action_incident_workflow.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== Event Action / Incident Workflow 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Event Action / Incident Workflow 통과 ==");

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

function ownedSource(file, source) {
  return { file, source };
}

function assertOwnedIncludes(owner, expectedFile, needle, label) {
  assert(owner.file === expectedFile, `${label} wrong owner: ${owner.file}`);
  assertIncludes(owner.source, needle, label);
}

function assertThrows(fn, message) {
  let rejected = false;
  try {
    fn();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}
