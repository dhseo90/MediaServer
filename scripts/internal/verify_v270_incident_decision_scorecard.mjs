#!/usr/bin/env node
// 파일 용도: v2.7.0 S02 Incident Decision Scorecard와 deterministic priority reason 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");
const roadmapEvidence = [backlog, inventory, streamVerification].join("\n");

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
  for (const snippet of [
    'data-testid="ops-incident-decision-scorecard"',
    'data-incident-decision-scorecard="deterministic-priority-reasons"',
    'id="opsIncidentDecisionScorecardBadges"',
    'id="opsIncidentDecisionScorecardRows"',
    "Decision Scorecard",
  ]) {
    assertIncludes(server, snippet, "Ops incident decision scorecard shell");
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
  assertIncludes(coverageVerifier, "verify-v270-incident-decision-scorecard", "feature inventory coverage S02 command");
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
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
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
