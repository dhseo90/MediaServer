#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.6.0 S01 VLM summary candidate의 Ops incident memory productization 경계를 검증한다.
import { extractCppFunctionBlock, exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const summaryDoc = readText("docs/vlm-summary-search-candidates.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");
const incidentMemory = readText("src/analysis/incident_memory.cpp");
const incidentMemoryHeader = readText("include/analysis/incident_memory.h");
const eventProjectionBlock = extractCppFunctionBlock(incidentMemory, "IncidentProjectionDocument ProjectEventRecordIncidentText(");
const memorySearchBlock = extractCppFunctionBlock(incidentMemory, "bool IncidentMemoryIndex::Search(");
const summaryCandidateReviewBlock = extractCppFunctionBlock(server, "std::string OpsVlmSummaryCandidateReviewJson(");

check("canonical incident projection and memory index source flows remain bound", () => {
  assert(eventProjectionBlock.includes("FinalizeDocument") && incidentMemory.includes("media-server.incident-text-projection.v1") && !eventProjectionBlock.includes("WebRTC") && !eventProjectionBlock.includes("SSE"), "Event POST/WebRTC/SSE incident projection finalization must remain local-only");
  assert(memorySearchBlock.includes("impl_->Search") && incidentMemoryHeader.includes("media-server.incident-memory-index.v1"), "incident memory search delegation schema mismatch");
});

check("roadmap and docs record V260-S01 productization boundary", () => {
  const hasCurrentRoadmapRow = /\| 1 \| V260-S01 \| P0 \| (진행|완료) \| Incident memory productization \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V260-S01 | 완료 | VLM summary candidate의 Ops-only incident memory productization |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V260-S01 row must be present in current or archived roadmap format");
  for (const snippet of [
    "media-server.ops.vlm-summary-candidate-review.v1",
    "ops-manual-review-not-auto-applied",
    "sourceCandidateReport",
    "viewer/client 비노출",
    "verify-v260-incident-memory-productization",
  ]) {
    assertIncludes(summaryDoc, snippet, "summary search productization doc");
  }
});

check("ops events API wraps VLM summary candidates as Ops-only manual review view model", () => {
  assertIncludes(summaryCandidateReviewBlock, "media-server.ops.vlm-summary-candidate-review.v1", "/ops/api/events/reviews Ops VLM summary candidate review API");
  assert(summaryCandidateReviewBlock.includes("sourceCandidateReport"),
    "LAB-069 summary candidate sourceCandidateReport block readback mismatch");
  assert(exactBooleanFlagValue(summaryCandidateReviewBlock, "eventPostPayloadChanged") === false, "summary candidate review must not change Event POST");
  for (const snippet of [
    "OpsVlmSummaryCandidateReviewJson",
    "media-server.ops.vlm-summary-candidate-review.v1",
    "BuildVlmSummarySearchCandidatesJson",
    "DefaultVlmObservationStorePath",
    "\\\"vlmSummaryCandidateReview\\\":",
    "\\\"sourceCandidateReport\\\":",
    "\\\"candidateStatus\\\":\\\"ops-manual-review-not-auto-applied\\\"",
    "\\\"manualReviewRoute\\\":\\\"/ops/events\\\"",
    "\\\"sourceCandidateSchema\\\":\\\"media-server.vlm-summary-search-candidates.v1\\\"",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"runtimeVlmCallPerformed\\\":false",
    "\\\"cloudProviderApiCalled\\\":false",
    "\\\"autoRuleApplied\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops VLM summary candidate review API");
  }
  for (const forbidden of [
    "/client/api/vlm/summary-search",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "autoRuleApplied\\\":true",
  ]) {
    assert(!server.includes(forbidden), `forbidden server snippet present: ${forbidden}`);
  }
});

check("ops events UI renders VLM summary candidate review without exposing it to clients", () => {
  for (const snippet of [
    'data-testid="ops-vlm-summary-candidate-review"',
    'data-vlm-summary-candidate-review="ops-only-manual-review"',
    'id="opsVlmSummaryCandidateSummary"',
    'id="opsVlmSummaryCandidateBadges"',
    'id="opsVlmSummaryCandidateRows"',
    "VLM Summary Candidate Review",
  ]) {
    assertIncludes(server, snippet, "Ops VLM summary candidate review shell");
  }
  for (const snippet of [
    "renderVlmSummaryCandidateReview",
    "vlmSummaryCandidateReview",
    "sourceCandidateReport",
    "opsVlmSummaryCandidateRows",
    "ops-manual-review-not-auto-applied",
    "manualReviewRoute",
  ]) {
    assertIncludes(script, snippet, "Ops VLM summary candidate review script");
  }
  assertIncludes(extractNamedFunctionBlock(script, "renderVlmSummaryCandidateReview"), "media-server.vlm-summary-search-candidates.v1", "UI-045 block-scoped canonical product state");
  assertIncludes(script, "media-server.vlm-summary-search-candidates.v1", "UI-045 canonical product state");
  assertIncludes(script, "/ops/events", "UI-045 canonical route obligation");
  assertIncludes(server, "media-server.ops.vlm-summary-candidate-review.v1", "UI-045 canonical schema obligation");
  assertIncludes(script, "VLM", "UI-045 canonical field obligation");
  for (const snippet of [
    ".vlm-summary-candidate-review",
    ".vlm-summary-candidate-list",
    ".vlm-summary-candidate-card",
  ]) {
    assertIncludes(css, snippet, "Ops VLM summary candidate review CSS");
  }
});

check("smoke, inventory, and command catalog track S01", () => {
  for (const snippet of [
    'data-testid="ops-vlm-summary-candidate-review"',
    'id="opsVlmSummaryCandidateRows"',
    "vlmSummaryCandidateReview",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| UI-045 | `/ops/events` VLM Summary Candidate Review |",
    "| EVT-046 | Ops VLM summary candidate review view model |",
    "| LAB-069 | V260-S01 VLM summary productization fixture/static guard |",
    "| SAFE-052 | V260-S01 VLM summary candidate productization boundary |",
    "verify-v260-incident-memory-productization",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S01 row");
  }
  assertIncludes(streamVerification, "verify-v260-incident-memory-productization", "stream verification S01 command");
  assertIncludes(serverSh, "verify-v260-incident-memory-productization", "server.sh S01 command");
  assertIncludes(serverSh, "verify_v260_incident_memory_productization.mjs", "server.sh S01 script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.6.0 S01 incident memory productization 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.6.0 S01 incident memory productization 통과 ==");

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
