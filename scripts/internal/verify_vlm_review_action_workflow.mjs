#!/usr/bin/env node
// 파일 용도: V210-S07 VLM review action workflow의 Ops-only 저장/API/UI 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM review action workflow verification

Usage:
  ./server.sh verify-vlm-review-action-workflow

Checks:
  - fixture records actual primary/fallback/excluded review actions for V210-S07.
  - /ops/api/events/reviews persists an Ops-only media-server.ops.vlm-review-action-state.v1 object.
  - /ops/events renders VLM action controls and sends action/target/note in the review save payload.
  - EventRecord storage, Event POST, WebRTC/SSE/WS metadata, media path, sidecar, and client/viewer exposure remain out of scope.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const fixture = readJson("test/fixtures/vlm_review_action_workflow/cases.json");
const server = readText("src/ingress/webrtc_http_server.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventStorage = readText("src/analysis/event_storage.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const reviewInboxVerifier = readText("scripts/internal/verify_ops_event_review_inbox.mjs");
const opsVlmReviewVerifier = readText("scripts/internal/verify_vlm_ops_event_review_ui.mjs");
const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
const serverSh = readText("server.sh");

check("fixture defines primary, fallback, excluded actions and invariants", () => {
  assert(fixture.schema === "media-server.vlm-review-action-workflow-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S07", "fixture targetStep mismatch");
  assert(fixture.workflow?.primaryAction === "accept", "primary action mismatch");
  assert(fixture.workflow?.fallbackAction === "review-needed", "fallback action mismatch");
  assert(fixture.workflow?.defaultAction === "not-reviewed", "default action mismatch");
  assert(fixture.workflow?.defaultAction === "not-reviewed" && Object.values(fixture.contractInvariants || {}).every(value => value === false), "VLM review action not-reviewed must preserve explicit negative contract invariants");
  const actionValues = new Set((fixture.actions || []).map(item => item.action));
  for (const action of ["accept", "dismiss", "review-needed"]) {
    assert(actionValues.has(action), `fixture missing action: ${action}`);
  }
  const excludedIds = new Set((fixture.excluded || []).map(item => item.id));
  for (const id of [
    "auto-apply-rule-from-vlm-action",
    "event-post-vlm-action-field",
    "client-viewer-vlm-review-action",
    "vlm-sidecar-action-write",
  ]) {
    assert(excludedIds.has(id), `fixture missing excluded item: ${id}`);
  }
  for (const [key, value] of Object.entries(fixture.contractInvariants || {})) {
    assert(value === false, `contract invariant must be false: ${key}`);
  }
  for (const key of ["license", "provenance", "privacy", "operation"]) {
    assert(String(fixture.review?.[key] || "").trim(), `review result missing ${key}`);
  }
});

check("Ops review state API stores VLM action object separately", () => {
  for (const snippet of [
    "OpsVlmReviewActionAllowed",
    "OpsVlmReviewActionTargetAllowed",
    "NormalizeOpsVlmReviewAction",
    "NormalizeOpsVlmReviewActionTarget",
    "vlm_action",
    "vlm_action_target",
    "vlm_action_note",
    "ExtractObjectField(request.body, \"vlmAction\")",
    "media-server.ops.vlm-review-action-state.v1",
    '\\"vlmAction\\":{',
    "vlmActions",
    "vlmActionTargets",
    "vlmReviewActionSchema",
    "separateFromEventRecords",
    "eventPostPayloadChanged",
  ]) {
    assertIncludes(server, snippet, "server review action workflow");
  }
});

check("Ops events UI renders and submits VLM action controls", () => {
  for (const snippet of [
    'data-vlm-review-action-workflow="ops-only-review-state"',
    "VLM 설명/action",
  ]) {
    assertIncludes(server, snippet, "Ops events static markup");
  }
  for (const snippet of [
    "VLM_REVIEW_ACTIONS",
    "VLM_REVIEW_ACTION_TARGETS",
    'data-testid="ops-vlm-review-action-controls"',
    'data-vlm-review-action-workflow="ops-only-review-state"',
    'data-event-review-field="vlmAction"',
    'data-event-review-field="vlmActionTarget"',
    'data-event-review-field="vlmActionNote"',
    "media-server.ops.vlm-review-action-state.v1",
    "payload.vlmAction.action",
  ]) {
    assertIncludes(pageScript, snippet, "Ops events script");
  }
  assertIncludes(css, ".ops-vlm-review-action-controls", "Ops events CSS");
  assertIncludes(uiSmoke, 'data-vlm-review-action-workflow="ops-only-review-state"', "Ops UI smoke");
});

check("existing review verifiers cover action roundtrip and UI boundary", () => {
  for (const snippet of [
    "vlmAction",
    "media-server.ops.vlm-review-action-state.v1",
    "review-needed",
  ]) {
    assertIncludes(reviewInboxVerifier, snippet, "event review inbox verifier");
  }
  for (const snippet of [
    'data-testid="ops-vlm-review-action-controls"',
    "vlmAction",
    "media-server.ops.vlm-review-action-state.v1",
  ]) {
    assertIncludes(opsVlmReviewVerifier, snippet, "VLM Ops event review verifier");
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-review-action-workflow.md"),
    readText("docs/README.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  for (const snippet of [
    "V210-S07",
    "verify-vlm-review-action-workflow",
    "media-server.ops.vlm-review-action-state.v1",
    "accept",
    "review-needed",
    "client/viewer",
  ]) {
    assertIncludes(docs, snippet, `docs snippet ${snippet}`);
  }
  assertIncludes(serverSh, "verify-vlm-review-action-workflow", "server.sh");
  assertIncludes(serverSh, "verify_vlm_review_action_workflow.mjs", "server.sh");
  assertIncludes(scriptInventory, "verify_vlm_review_action_workflow.mjs", "script inventory");
});

check("S07 workflow does not touch external event, metadata, sidecar, or client exposure", () => {
  for (const forbidden of [
    "vlmAction",
    "vlm-review-action-state",
    "review-needed",
  ]) {
    assert(!eventStorage.includes(forbidden), `EventRecord storage must not contain ${forbidden}`);
    assert(!eventPost.includes(forbidden), `Event POST dispatcher must not contain ${forbidden}`);
  }
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("std::string OpsVlmProfilesJson");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart
    ? server.slice(clientStart, clientEnd)
    : "";
  assert(clientRegion.length > 0, "client region not found");
  for (const forbidden of [
    'data-testid="ops-vlm-review-action-controls"',
    "media-server.ops.vlm-review-action-state.v1",
    "vlmAction",
  ]) {
    assert(!clientRegion.includes(forbidden), `client region exposes ${forbidden}`);
  }
});

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

console.log("");
console.log("== VLM review action workflow summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(path) {
  return fs.readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}
