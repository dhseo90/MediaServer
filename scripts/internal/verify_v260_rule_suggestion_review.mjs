#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.6.0 S02 rule suggestion 후보의 incident-to-rule manual review/draft 연결 경계를 검증한다.
import { extractCppFunctionBlock, exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const ruleSuggestionReviewBlock = extractCppFunctionBlock(server, "std::string OpsIncidentRuleSuggestionReviewJson(");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const ruleSmoke = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const ruleDoc = readText("docs/vlm-rule-suggestion-candidates.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");

check("roadmap and docs record V260-S02 incident-to-rule boundary", () => {
  const hasCurrentRoadmapRow = /\| 2 \| V260-S02 \| P1 \| (진행|완료) \| Rule suggestion review \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V260-S02 | 완료 | Rule suggestion 후보의 manual review/draft workflow 연결 |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V260-S02 row must be present in current or archived roadmap format");
  for (const snippet of [
    "media-server.ops.incident-rule-suggestion-review.v1",
    "incident-to-rule manual review",
    "sourceCandidateReport",
    "draft-only manual save",
    "verify-v260-rule-suggestion-review",
  ]) {
    assertIncludes(ruleDoc, snippet, "rule suggestion S02 doc");
  }
});

check("Ops events review item exposes rule suggestion review wrapper only", () => {
  assertIncludes(ruleSuggestionReviewBlock, "media-server.ops.incident-rule-suggestion-review.v1", "/ops/api/events/reviews incident rule suggestion review API");
  assert(ruleSuggestionReviewBlock.includes("matchingRuleSuggestionPresent"),
    "LAB-070 matchingRuleSuggestionPresent block readback mismatch");
  assert(exactBooleanFlagValue(ruleSuggestionReviewBlock, "eventPostPayloadChanged") === false, "rule suggestion review must not change Event POST");
  for (const snippet of [
    "OpsIncidentRuleSuggestionReviewJson",
    "media-server.ops.incident-rule-suggestion-review.v1",
    "QueryVlmObservationStore",
    "ExtractJsonValueField(observation_json, \"ruleSuggestion\")",
    "\\\"incidentRuleSuggestionReview\\\":",
    "\\\"sourceCandidateSchema\\\":\\\"media-server.vlm-rule-suggestion-candidates.v1\\\"",
    "\\\"sourceCandidateReport\\\":",
    "\\\"manualReviewRoute\\\":\\\"/ops/events\\\"",
    "\\\"manualDraftRoute\\\":\\\"/ops/rules\\\"",
    "\\\"draftApiRoute\\\":\\\"/ops/api/vlm/rule-suggestion-drafts\\\"",
    "candidate-only-manual-rule-save",
    "\\\"ruleRegistryWritePerformed\\\":false",
    "\\\"autoRuleApplied\\\":false",
    "\\\"autoProfileApplied\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops incident rule suggestion review API");
  }
  const itemBlock = extractBlockAround(server, "OpsEventReviewInboxItemJson", 1800);
  assert(itemBlock.includes("incidentRuleSuggestionReview"), "review item JSON must include incidentRuleSuggestionReview");
});

check("/ops/events UI renders incident-to-rule review and links to draft workflow", () => {
  for (const snippet of [
    "renderIncidentRuleSuggestionReview",
    "incidentRuleSuggestionReview",
    "data-testid=\"ops-incident-rule-suggestion-review\"",
    "data-incident-rule-suggestion-review=\"ops-only-draft-route\"",
    "data-incident-rule-draft-route",
    "/ops/rules",
    "/ops/api/vlm/rule-suggestion-drafts",
  ]) {
    assertIncludes(script, snippet, "Ops events incident-to-rule UI script");
    assertIncludes(extractNamedFunctionBlock(script, "renderIncidentRuleSuggestionReview"), "ops-incident-rule-suggestion-review", "UI-046 report block-scoped canonical product state");
    assertIncludes(script, "/ops/events", "UI-046 canonical route obligation");
    assertIncludes(server, "media-server.ops.incident-rule-suggestion-review.v1", "UI-046 canonical schema obligation");
    assertIncludes(script, "VLM", "UI-046 canonical field obligation");
  }
  for (const snippet of [
    ".ops-incident-rule-suggestion-review",
    ".ops-incident-rule-suggestion-card",
  ]) {
    assertIncludes(css, snippet, "Ops incident-to-rule CSS");
  }
});

check("smoke, inventory, and command catalog track S02", () => {
  for (const snippet of [
    "ops-incident-rule-suggestion-review",
    "incidentRuleSuggestionReview",
    "data-incident-rule-draft-route",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "vlmDraftWorkflow",
    "attemptedDraftWrites.length === 0",
    "/ops/api/vlm/rule-suggestion-drafts",
  ]) {
    assertIncludes(ruleSmoke, snippet, "rule UI smoke keeps draft-only check");
  }
  for (const snippet of [
    "| UI-046 | `/ops/events` Incident-to-rule suggestion review |",
    "| EVT-047 | Ops incident-to-rule suggestion review view model |",
    "| LAB-070 | V260-S02 rule suggestion review static guard |",
    "| SAFE-053 | V260-S02 incident-to-rule draft-only boundary |",
    "verify-v260-rule-suggestion-review",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S02 row");
  }
  assertIncludes(streamVerification, "verify-v260-rule-suggestion-review", "stream verification S02 command");
  assertIncludes(serverSh, "verify-v260-rule-suggestion-review", "server.sh S02 command");
  assertIncludes(serverSh, "verify_v260_rule_suggestion_review.mjs", "server.sh S02 script target");
});

check("S02 keeps forbidden client/runtime/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/vlm/rule-suggestion-review",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "ruleRegistryWritePerformed\\\":true",
    "autoRuleApplied\\\":true",
    "autoProfileApplied\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !ruleDoc.includes(forbidden),
      `forbidden S02 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.6.0 S02 rule suggestion review 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.6.0 S02 rule suggestion review 통과 ==");

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

function extractBlockAround(text, needle, length) {
  const index = text.indexOf(needle);
  if (index < 0) return "";
  const start = Math.max(0, index - Math.floor(length / 2));
  return text.slice(start, index + length);
}
