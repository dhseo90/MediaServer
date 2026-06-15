#!/usr/bin/env node
// 파일 용도: v2.6.0 S01 VLM summary candidate의 Ops incident memory productization 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const summaryDoc = readText("docs/vlm-summary-search-candidates.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");

check("roadmap and docs record V260-S01 productization boundary", () => {
  assert(/\| 1 \| V260-S01 \| P0 \| (진행|완료) \| Incident memory productization \|/.test(backlog),
    "backlog V260-S01 row must be 진행 or 완료 while S01 is under development");
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
