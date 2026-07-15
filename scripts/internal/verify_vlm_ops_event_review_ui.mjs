#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V200-S10 Ops 이벤트 리뷰 화면이 EventRecord evidence와 VLM 설명을 Ops 전용으로 표시하는지 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM Ops event review UI verification

Usage:
  ./server.sh verify-vlm-ops-event-review-ui

Checks:
  - /ops/api/events/reviews attaches an Ops-only media-server.ops.vlm-event-review.v1 object.
  - Ops /ops/events review inbox renders EventRecord, snapshot/clip evidence, VLM explanation, false-positive hints, and operator questions.
  - viewer/client pages do not expose the Ops VLM review marker.
  - EventRecord storage and Event POST payload remain unchanged.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const server = readWebRtcHttpServerBundle(readText);
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const serverPage = readText("src/ingress/product_ui_server_pages.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventStorage = readText("src/analysis/event_storage.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");

check("ops review API attaches VLM review object without mutating EventRecord", () => {
  for (const snippet of [
    "OpsVlmEventReviewJson",
    "media-server.ops.vlm-event-review.v1",
    "vlmReview",
    "QueryVlmObservationStore",
    "snapshotPathPresent",
    "clipPathPresent",
    "vlmEvidenceRefsPresent",
    "falsePositiveHints",
    "operatorReviewQuestions",
    "media-server.ops.vlm-review-action-state.v1",
    "vlmAction",
    "vlmActions",
    "vlmActionTargets",
    "viewerClientExposureAdded",
    "eventPostPayloadChanged",
    "autoRuleApplied",
  ]) {
    assertIncludes(server, snippet, "Ops VLM review API");
  }
  assert(!eventStorage.includes("\"vlmReview\""), "EventRecord storage must not contain vlmReview");
  assert(!eventPost.includes("vlmReview"), "Event POST dispatcher must not contain vlmReview");
  assert(!eventStorage.includes("vlmAction"), "EventRecord storage must not contain vlmAction");
  assert(!eventPost.includes("vlmAction"), "Event POST dispatcher must not contain vlmAction");
});

check("ops events UI renders VLM review panel in review inbox", () => {
  const reviewBlock = extractNamedFunctionBlock(pageScript, "eventReviewVlmHtml");
  for (const snippet of [
    'data-vlm-review-state="ops-only-event-record-evidence"',
    'data-vlm-review-action-workflow="ops-only-review-state"',
    "EventRecord evidence, VLM 설명",
    "<th>Evidence / VLM</th>",
  ]) {
    assertIncludes(serverPage, snippet, "Ops events markup");
  }
  for (const snippet of [
    "eventReviewVlmHtml",
    'data-testid="ops-vlm-event-review-card"',
    'data-testid="ops-vlm-review-action-controls"',
    'data-vlm-review-contract="ops-only-no-client-exposure"',
    'data-vlm-review-action-workflow="ops-only-review-state"',
    "VLM review panel",
    "VLM_REVIEW_ACTIONS",
    "media-server.ops.vlm-review-action-state.v1",
    "falsePositiveHints",
    "operatorReviewQuestions",
  ]) {
    assertIncludes(pageScript, snippet, "Ops events script");
  }
  assertIncludes(reviewBlock, "ops-vlm-event-review-card", "UI-032 block-scoped canonical product state");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => reviewBlock.includes(marker)), "UI-032 client-viewer-boundary explicit absence oracle");
  assertIncludes(pageScript, "/ops/events", "UI-032 canonical route obligation");
  assertIncludes(pageScript, "VLM", "UI-032 canonical field obligation");
  assertIncludes(css, ".ops-vlm-event-review", "Ops events CSS");
});

check("ops smoke and server command are wired", () => {
  for (const snippet of [
    'data-vlm-review-state="ops-only-event-record-evidence"',
    "verify-vlm-ops-event-review-ui",
    "verify_vlm_ops_event_review_ui.mjs",
    'data-vlm-review-action-workflow="ops-only-review-state"',
  ]) {
    assert(uiSmoke.includes(snippet) || serverSh.includes(snippet),
      `smoke/server wiring missing snippet: ${snippet}`);
  }
});

check("viewer/client markup does not expose the Ops VLM review panel", () => {
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("void AppendOpsVlmModelEstimate");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart
    ? server.slice(clientStart, clientEnd)
    : "";
  assert(clientRegion.length > 0, "client region not found");
  for (const forbidden of [
    'data-testid="ops-vlm-event-review-card"',
    'data-testid="ops-vlm-review-action-controls"',
    'data-vlm-review-state="ops-only-event-record-evidence"',
    "media-server.ops.vlm-event-review.v1",
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
console.log("== VLM Ops event review UI summary ==");
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
