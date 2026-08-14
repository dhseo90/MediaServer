#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.7.0 S02 Incident Decision Scorecard와 deterministic priority reason 경계를 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const serverPages = readText("src/ingress/product_ui_server_pages.cpp");
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
const decisionScorecardViewBlock = extractCppFunctionBlock(server, "std::string OpsIncidentDecisionScorecardViewJson(");
const decisionScorecardItemBlock = extractCppFunctionBlock(server, "std::string OpsIncidentDecisionScorecardJson(");

check("roadmap records V270-S02 as active/completed Decision scorecard work", () => {
  const hasCurrentRoadmapRow = /\| 2 \| V270-S02 \| P0 \| (진행|완료) \| Decision scorecard \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V270-S02 | 완료 | Incident Decision Scorecard |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V270-S02 row must be present in current or archived roadmap format");
  for (const snippet of [
    "media-server.ops.incident-decision-scorecard.v1",
    "priority reason chips",
    "provider 호출",
    "raw JSON/source URL",
    "verify-v270-incident-decision-scorecard",
  ]) {
    assertIncludes(roadmapEvidence, snippet, "V270-S02 roadmap evidence");
  }
});

check("Ops events API exposes deterministic decision scorecard", () => {
  assert(decisionScorecardViewBlock.includes("scorecardCount") &&
    decisionScorecardViewBlock.includes("media-server.ops.incident-decision-scorecard.v1"),
  "LAB-075 incident decision scorecard scorecardCount block readback mismatch");
  const start = server.indexOf("std::string OpsIncidentDecisionScorecardViewJson(");
  const end = server.indexOf("std::string OpsOperationalActionPackViewJson(", start);
  assert(start >= 0 && end > start, "EVT-051 decision scorecard projection block missing");
  const evt051ProjectionBlock = server.slice(start, end);
  assertIncludes(evt051ProjectionBlock, "media-server.ops.incident-decision-scorecard.v1", "EVT-051 block-scoped canonical projection");
  for (const snippet of [
    "event_record_score",
    "source_health_score",
    "similar_incident_score",
    "vlm_summary_score",
    "vlm_rule_score",
    "operator_review_age_score",
    "decision_score =",
    "event_record_score + source_health_score + bounded_similar_incident_score +",
    "vlm_summary_score + vlm_rule_score + operator_review_age_score",
    "generated_at_ms - review.updated_at_ms",
    "source_reliability.source_health_status",
    "vlm_summary_candidate_count > 0",
    "bounded_similar_incident_score",
    '"\\"score\\":" << decision_score',
  ]) {
    assertIncludes(decisionScorecardItemBlock, snippet, "EVT-051 deterministic score basis");
  }
  for (const snippet of [
    "std::sort(scorecards.begin(), scorecards.end()",
    "OpsV320SourceReliabilityInfoFor(event_json, source_health_snapshot)",
    "OpsSimilarIncidentScore(base, related, nullptr)",
    "OpsVlmSummaryCandidateReviewJson(search_query, source_id)",
    'ParseInt64Field(vlm_summary_review, "matchedCandidates")',
    "left_score > right_score",
    "ParseStringField(left, \"eventId\")",
    "ParseStringField(right, \"eventId\")",
    "\\\"scoreRank\\\"",
    "std::to_string(index + 1)",
  ]) {
    assertIncludes(decisionScorecardViewBlock, snippet, "LAB-075 scoreRank ordering and rank readback");
  }
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-051 canonical review route");
  for (const snippet of [
    "OpsIncidentDecisionScorecardViewJson",
    "OpsIncidentDecisionScorecardJson",
    "OpsIncidentDecisionScorecardReasonChipsJson",
    "media-server.ops.incident-decision-scorecard.v1",
    "\\\"incidentDecisionScorecard\\\":",
    "\\\"eventRecordBasis\\\":",
    "\\\"sourceHealthBasis\\\":",
    "\\\"similarIncidentBasis\\\":",
    "\\\"vlmSummaryCandidateStatus\\\":",
    "\\\"vlmRuleCandidateStatus\\\":",
    "\\\"operatorReviewAgeMs\\\":",
    "\\\"priorityReasonChips\\\":",
    "\\\"deterministicPriorityReasons\\\":true",
    "\\\"rawJsonExposed\\\":false",
    "\\\"sourceUrlExposed\\\":false",
    "\\\"runtimeVlmCallPerformed\\\":false",
    "\\\"cloudProviderApiCalled\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops incident decision scorecard API");
  }
});

check("/ops/events UI renders decision scorecard and priority reason chips", () => {
  const scorecardBlock = extractNamedFunctionBlock(script, "renderIncidentDecisionScorecard");
  for (const snippet of [
    'data-testid="ops-incident-decision-scorecard"',
    'data-incident-decision-scorecard="deterministic-priority-reasons"',
    'id="opsIncidentDecisionScorecardBadges"',
    'id="opsIncidentDecisionScorecardRows"',
    "Decision Scorecard",
  ]) {
    assertIncludes(serverPages, snippet, "Ops incident decision scorecard shell");
  }
  for (const snippet of [
    "renderIncidentDecisionScorecard",
    "incidentDecisionScorecard",
    "opsIncidentDecisionScorecardRows",
    "priorityReasonChips",
    "eventRecordBasis",
    "sourceHealthBasis",
    "similarIncidentBasis",
    "vlmSummaryCandidateStatus",
    "vlmRuleCandidateStatus",
    "operatorReviewAgeMs",
  ]) {
    assertIncludes(script, snippet, "Ops incident decision scorecard script");
  }
  assertIncludes(scorecardBlock, "incidentDecisionScorecard", "UI-051 block-scoped canonical product state");
  for (const snippet of [
    "data-event-semantic-score",
    "data-event-semantic-score-rank",
    "card?.score ?? 0",
    "card?.scoreRank ?? '-'",
  ]) {
    assertIncludes(scorecardBlock, snippet, "UI-051 score and rank renderer projection");
  }
  assertIncludes(scorecardBlock, "contract?.rawJsonExposed === false", "UI-051 raw JSON explicit false state");
  assert(!["rawJsonPayload", "rawPayload", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => scorecardBlock.includes(marker)), "UI-051 raw-material-redaction block-scoped absence oracle");
  assertIncludes(scorecardBlock, "contract?.sourceUrlExposed === false", "UI-051 source URL explicit false state");
  assert(!["sourceUrl:", "sourceURL:", "sourceUrlValue", "rtsp://", "rtsps://"].some(marker => scorecardBlock.includes(marker)), "UI-051 source-url-redaction block-scoped absence oracle");
  assert(!["providerApiCall(", "providerResponse", "rawProviderResponse", "providerMaterialExposed: true"].some(marker => scorecardBlock.includes(marker)), "UI-051 provider-boundary block-scoped absence oracle");
  assertIncludes(script, "/ops/events", "UI-051 canonical route obligation");
  assertIncludes(script, "VLM", "UI-051 canonical field obligation");
  for (const snippet of [
    ".incident-decision-scorecard",
    ".incident-decision-scorecard-list",
    ".incident-decision-scorecard-card",
    ".priority-reason-chip",
  ]) {
    assertIncludes(css, snippet, "Ops incident decision scorecard CSS");
  }
});

check("smoke, inventory, coverage, and command catalog track S02", () => {
  for (const snippet of [
    'data-testid="ops-incident-decision-scorecard"',
    'id="opsIncidentDecisionScorecardRows"',
    "incidentDecisionScorecard",
    "priorityReasonChips",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V270-S02 Decision scorecard | `UI-051`, `EVT-051`, `LAB-075`, `SAFE-059` | `verify-v270-incident-decision-scorecard` |",
    "| UI-051 | `/ops/events` Incident Decision Scorecard |",
    "| EVT-051 | Ops incident decision scorecard view model |",
    "| LAB-075 | V270-S02 incident decision scorecard static guard |",
    "| SAFE-059 | V270-S02 decision scorecard boundary |",
    "verify-v270-incident-decision-scorecard",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S02 row");
  }
  for (const id of ["UI-051", "EVT-051", "LAB-075"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v270-incident-decision-scorecard", `${id} manifest verifier command drift`);
  }
  assert(implementationManifest.items.find(item => item.id === "SAFE-059")?.verifierEvidence?.command === "verify-auth-routes",
    "SAFE-059 strongest runtime boundary verifier command drift");
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v270-incident-decision-scorecard", "stream verification S02 command");
  assertIncludes(serverSh, "verify-v270-incident-decision-scorecard", "server.sh S02 command");
  assertIncludes(serverSh, "verify_v270_incident_decision_scorecard.mjs", "server.sh S02 script target");
});

check("S02 keeps forbidden client/provider/raw/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/incident-decision-scorecard",
    "rawJsonExposed\\\":true",
    "sourceUrlExposed\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !serverPages.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S02 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.7.0 S02 incident decision scorecard 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.7.0 S02 incident decision scorecard 통과 ==");

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
