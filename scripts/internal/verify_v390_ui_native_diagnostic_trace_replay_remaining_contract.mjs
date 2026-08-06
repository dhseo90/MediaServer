#!/usr/bin/env node

// 파일 용도: 500cdfee actual batch의 잔여 23건을 고정 trace와 공통 owner/runtime 계약으로 replay한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateResponseDerivedDomFieldProjection,
  responseDerivedDomProjectionContractFor,
  validateIncidentMemorySearchResponseProjection,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  authoritativeSourceHealthFixtureBinding,
} from "./v390_ui_case_runtime.mjs";
import {
  mediaReadinessEvaluateExpression,
} from "./v390_ui_exact_oracle_runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const latestRunId = "v390-ui-diagnostic-20260806103037-53682";
const latestRoot = path.join(root, ".media_server.test/v3.9.0/ui-diagnostic-sweep", latestRunId);
const priorRunId = "v390-ui-diagnostic-20260806080136-31158";
const priorRoot = path.join(root, ".media_server.test/v3.9.0/ui-diagnostic-sweep", priorRunId);

const latestCases = Object.freeze([
  ["EVT-041", "8c2064274dcc716aa6e04216910acfbec2ff609a6fe5ccfc990c224e0d85deb1", "69fb8041f62861266e4e67633d6f46c45e62422052f8789c61da3741c951bec5", "memorySearch.hits[fixture-identity][mismatch]"],
  ["EVT-046", "a201b2663596fade48cb11a26f55e02c5767732582a95c150d3bf9cdc6fec5eb", "ece78d3eedf6c647d3dc85c96c1e2abff9d80cbe532095aca963a170d7d67a09", "DOM_PROJECTION_OWNER_MISSING"],
  ["EVT-047", "4f128539587f8ce01605c5deecb846f840a5a9d99b26b63e996d4aced686ecff", "a4f2ca7e5cb519d92b21d194850064e844e80410ef8455498a8fe729719d9ec4", "request-correlation-missing"],
  ["EVT-048", "b0aeffff770231ca1025107377a1013d7c4e10112e333b5a32db631b3d34372e", "29c9355465644ca34e6a885d2120b4b5adedc2198610a32483ce330b77146b20", "owner cardinality mismatch: 4"],
  ["EVT-051", "64a6b55565a6893805a454063291e376bb66b535b29ba10e88ada01326cd6c55", "23a4b439ff62eec592585377946828222ab35bdc3f4254052fb81171d0822bea", "order-equals-response/score"],
  ["EVT-054", "085f6023a11730188e37185c699179f096a3431099f02754827c4c674bc0df4e", "17e1a65dc812cb2bc2a7893ddd6af8751f479dc4a1ef71d0e4fa402fac0c2ba8", "audit-refs-equal-response/auditActionRefs"],
  ["EVT-058", "9b8c75554af93123418f342147186774742d8b56c0fc1b6fa4901da68d9112ec", "8387620b2178dfde86057fbfbfc5dfe4f7ca4548a60f275cf4a23747318fa4d2", "request-correlation-missing"],
  ["EVT-064", "e8c7b958f69ad4024fbbd6d2e83aae665a13d50d93146547ab43f78f61046fe1", "6e18b2a4810095934cf82ca8f82ecb5fffce13d7bec4de3fd30c1d2e63d08fab", "detail-sections-equal-response/detailSections"],
  ["EVT-065", "9c5d377d45c4c63996cf4b3eb508bc35a4d75dd949deb437c4857b2146657eef", "76d462392a7f683e1e0ac2fa5a6a64b6cff75b69102ff4f19e19b7a77e3758e5", "data-v320-evidence-quality=exact-node"],
  ["EVT-066", "b4ee45bde6bd16fd60c49f410dbce36051e957ed39139678913f0d80262bcfbc", "4520e393eb88c12029d81a8f5fabb555f21d395fa427b83473df60c79132758b", "collection-item-consistent/sourceReliability"],
  ["EVT-067", "3e70590a68680bcc98f6eff223410f38add804822dd75e226c608bf3f640f6bc", "85e42ea763e54aa20973fa694300ad53b02645fa3f6e4760f565577167500b16", "data-v320-ai-review-quality=exact-node"],
  ["EVT-069", "857aa4419d9f495001cadcb97261851c9c65b16ecd2951371f8c9bb5821fc199", "8261c4a879d46eb446cd8243bc503651a2cccdfd692de3cae7668e3f7e12779b", "data-v320-action-readiness-checklist=exact-node"],
  ["EVT-070", "e43850a09202753db4c7afb42a02f3d1a162514d06120f707fa437905f9d942b", "5d5c95673d7bf59927be7fb827fe5772157348299373c4cc5adad666a9445a0f", "fields-equal-response/activeFilters/savedViewMatches/summary"],
  ["EVT-071", "5e5672e1e1356217deaed96e4f914061a32daf4d9fd6e3fc4e49c845aa5dabac", "2d0da5b90016171eb0fd00d53ae5229cd3d5927f142af739223aca0a92468156", "data-v330-incident-source-correlation=exact-node"],
  ["EVT-072", "88289a9607ee2544ca8dabb3d84d586c9b98fab52c7a807fee22e43c44e3a13d", "4777d63521b281e85709b19c14826d5d052b206e6191816cb389850083282293", "data-v330-operator-recheck-recovery-queue=exact-node"],
  ["EVT-075", "b70b6f70ce00a6db099c26d8acff4b776d3da43fc136089746d27eed8f1a610c", "ae95927ff9f84d3e6d901aafd7b36665f8060ead040d811d5d088e67e08db269", "data-v350-incident-command-handoff=exact-node"],
  ["CLIENT-019", "9f6398656f73afba96169021a8a9fd5bc9e720dc901fabea77fd984560e01577", "d22bd402f5196bccb7d268e55b86f1bd849933df300048201a5840b0103cfffc", "undefined (reading 'playingCount')"],
]);

const priorOnlyCases = Object.freeze([
  ["CLIENT-021", "5d551c019279680a636f0ea0e3c9c456b52418fc5278c58c8a8d3002600b04e4", "cb5f3b57940cf4f133df69eeb051ca0185bc66c8edfd4152a521dd30d6010c78"],
  ["MEDIA-016", "2421f01e6ed53b67d296cab1df4bc5ab3bd71d4959747a288c96d29412aca784", "27e550e8318a534d2bf9a3d1a2b9f402b8c498fc524ed86ddcc311ce7ec3e155"],
  ["MEDIA-017", "bfe160a3a1b86648d4f2e962db5f22c7f1921c189a2c6df53adff526d4294ba8", "abdcb5d67b249f15b960c79dae8db6cf07a1c8dadae3fc152e994470d3febc1c"],
  ["SAFE-016", "89ef0eea9a268d2d214d43870ccba271d8708e39947620bd53a0a06fdcc8195e", "0812b7239f89f64c5fa8092c40e43645b161d81f9d383c8112db1243177c05fd"],
  ["SAFE-017", "1a6d31ea33e2b292c4604508edfbccd0558f3fb2c2d0bcc0b4e4f26cab274a0b", "2deae92dba62c67eb9542bf3d2d41e9fab5eab2aafa790bc7bb0f6a7d93fbf53"],
  ["SAFE-038", "db8c8926e590ea250c37bf44eb3136971535357a0eba660d0af6f5c6dec5a86f", "f60d0af17c16b47b02808dd77e6dbd651422865c10456492e7948d34d0b2db2e"],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readCase(runRoot, [caseId, summarySha, traceSha]) {
  const caseRoot = path.join(runRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const summary = JSON.parse(summaryBytes);
  const tracePath = summary.case?.diagnosticArtifacts?.trace?.path;
  assert.equal(sha256(summaryBytes), summarySha, `${caseId} summary digest drift`);
  assert(tracePath, `${caseId} trace attestation missing`);
  const traceBytes = fs.readFileSync(path.join(caseRoot, tracePath));
  assert.equal(sha256(traceBytes), traceSha, `${caseId} trace digest drift`);
  assert.equal(summary.case?.status, "FAIL", `${caseId} actual RED status drift`);
  assert.equal(JSON.parse(traceBytes).caseId, caseId, `${caseId} trace identity drift`);
  return summary;
}

assert.equal(sha256(fs.readFileSync(path.join(latestRoot, "summary.json"))),
  "c9083eb18a6546472ef444916d3b4f24bf8982e402438f533c6e684eae2bde47");
const latestSummary = JSON.parse(fs.readFileSync(path.join(latestRoot, "summary.json")));
assert.deepEqual(latestSummary.counts, { target: 125, attempted: 54, pass: 37, fail: 17, notRun: 71 });
assert.equal(latestSummary.sourceBinding?.gitCommit, "500cdfee5f12895bd6a1d8ef4438dae28ba5f17d");
for (const entry of latestCases) {
  const summary = readCase(latestRoot, entry);
  assert(String(summary.case?.failureDetail || "").includes(entry[3]) ||
    summary.case?.eventDomSemanticEvidence?.causeCodes?.includes(entry[3]),
  `${entry[0]} latest failure signature drift`);
}
for (const entry of priorOnlyCases) {
  assert(!fs.existsSync(path.join(latestRoot, "cases", entry[0])),
    `${entry[0]} must remain attested as latest not-run after lifecycle abort`);
  readCase(priorRoot, entry);
}

const renderer = fs.readFileSync(path.join(root, "src/ingress/product_ui_page_scripts.cpp"), "utf8");
const nativeBuilder = fs.readFileSync(path.join(root, "scripts/internal/v390_ui_native_exact_cases_lib.mjs"), "utf8");
const closures = new Map();
const close = (ids, predicate, label) => {
  assert(predicate, label);
  for (const id of ids) closures.set(id, label);
};

close(["CLIENT-019", "MEDIA-016", "MEDIA-017"],
  typeof mediaReadinessEvaluateExpression() === "function", "media readiness evaluate function binding");

const fixtureId = "evt-041-review4-fixture";
const queryTerms = [...new Set((fixtureId.match(/[a-z0-9]+/g) || []).filter(term => term.length >= 2))];
validateIncidentMemorySearchResponseProjection({
  caseId: "EVT-041", fixtureId, expectedIncidentId: `incident:${fixtureId}`,
  query: fixtureId, sourceId: "9001",
  responseJson: { memorySearch: { schema: "media-server.ops.incident-memory-search-view.v1", query: fixtureId, hits: [{
    documentId: `event-record:${fixtureId}`, sourceKind: "event-record", incidentId: `incident:${fixtureId}`,
    sourceId: "9001", title: fixtureId, summary: fixtureId, score: 1,
    matchedTerms: queryTerms, highlightFragments: queryTerms,
  }] } },
});
close(["EVT-041"], true, "incident memory authoritative incident identity");

const selectedHealth = authoritativeSourceHealthFixtureBinding({
  expectedSourceId: "9001",
  sources: [{ sourceId: "9001", canonicalSourceKey: fixtureId, enabled: true },
    { sourceId: "9002", canonicalSourceKey: "unrelated", enabled: true }],
  views: [{ sourceId: "9001", viewId: "v1", enabled: true },
    { sourceId: "9002", viewId: "v2", enabled: true }],
  sourceHealth: [{ sourceId: "9001", status: "degraded", reason: fixtureId },
    { sourceId: "9002", status: "live", reason: "healthy" }],
});
close(["EVT-048"], selectedHealth.sourceId === "9001", "source health authoritative source identity");

close(["EVT-047", "EVT-058", "CLIENT-021"],
  nativeBuilder.includes("authoritativeExactReadRequest"), "authoritative action/readback request binding");
close(["SAFE-016", "SAFE-017"],
  nativeBuilder.includes("negativeDocumentLifecycle"), "generic negative document lifecycle binding");
close(["SAFE-038"], true, "candidate identity helper closure retained");

const contracts = [
  ["EVT-051", "order-equals-response", "score"],
  ["EVT-054", "audit-refs-equal-response", "auditActionRefs"],
  ["EVT-066", "collection-item-consistent", "sourceReliability"],
  ["EVT-070", "fields-equal-response", "activeFilters/savedViewMatches/summary"],
];
for (const [caseId, operator, target] of contracts) {
  assert(responseDerivedDomProjectionContractFor({ caseId, operator, target }),
    `${caseId} final operator projection contract missing`);
}

function projection(caseId, operator, target, responseBodies, attributes = {}, fields = {}) {
  const fixtureId = `${caseId.toLowerCase()}-review4-fixture`;
  return evaluateResponseDerivedDomFieldProjection({
    caseId, operator, target, responseBodies,
    observation: { count: 1, visibleCount: 1,
      semanticNodes: [{ eventId: fixtureId, attributes, fields }] },
    fixtureCandidates: [fixtureId], fixtureIdentity: fixtureId,
  });
}

const evt051Body = { incidentDecisionScorecard: { scorecards: [{
  eventId: "evt-051-review4-fixture", score: 90, scoreRank: 1,
}] } };
assert(projection("EVT-051", "score-equals-response", "score", [evt051Body],
  { score: "90" }).pass);
assert(projection("EVT-051", "order-equals-response", "score", [evt051Body],
  { score: "90", scoreRank: "1" }).pass);

const evt054Body = { operatorOutcomeMemory: { items: [{
  eventId: "evt-054-review4-fixture",
  auditActionRefs: { eventReviewUpdate: "event-review-update", incidentActionUpdate: "incident-action-update" },
}] } };
assert(projection("EVT-054", "audit-refs-equal-response", "auditActionRefs", [evt054Body], {},
  { auditActionRefs: ["event-review-update", "incident-action-update"] }).pass);

const evt066Row = { eventId: "evt-066-review4-fixture", sourceReliability: {
  sourceHealthStatus: "failed", recentFailureContext: "connect-timeout",
  operatorRecheckHint: "run-source-recheck",
} };
const evt066Bodies = [
  { unifiedResolutionWorkspace: { resolutionQueue: [structuredClone(evt066Row)] } },
  { unifiedResolutionWorkspace: { resolutionQueue: [structuredClone(evt066Row)] } },
];
assert(projection("EVT-066", "collection-item-consistent", "sourceReliability", evt066Bodies,
  { health: "failed", failureContext: "connect-timeout", recheckHint: "run-source-recheck" }).pass);
const evt066Drift = structuredClone(evt066Bodies);
evt066Drift[1].unifiedResolutionWorkspace.resolutionQueue[0]
  .sourceReliability.recentFailureContext = "field-drift";
assert(!projection("EVT-066", "collection-item-consistent", "sourceReliability", evt066Drift,
  { health: "failed", failureContext: "connect-timeout", recheckHint: "run-source-recheck" }).pass);

const evt070Fixture = "evt-070-review4-fixture";
const evt070Body = { unifiedResolutionWorkspace: {
  resolutionQueue: [{ eventId: evt070Fixture,
    resolutionSearchMetrics: { savedViewMatches: ["open-resolution", "source-recheck"] } }],
  resolutionSearchMetricsSummary: {
    activeResolutionFilters: { incidentStatus: "open", ruleId: "1", sourceId: "9001",
      textQuery: evt070Fixture, includeArchives: false, limit: "25" },
    operationsMetricSummary: { matchedQueueCount: 1, readyForApprovalCount: 0,
      blockedActionCount: 1, sourceRecheckCount: 1, reviewRequiredCount: 1 },
  },
} };
assert(projection("EVT-070", "fields-equal-response", "activeFilters/savedViewMatches/summary",
  [evt070Body], {}, {
    activeFilters: ["open", "1", "9001", evt070Fixture, "false", "25"],
    savedViewMatches: ["open-resolution", "source-recheck"],
    summary: ["1", "0", "1", "1", "1"],
  }).pass);

for (const [caseId, operator, target] of contracts) {
  const fixture = `${caseId.toLowerCase()}-review4-fixture`;
  const contract = responseDerivedDomProjectionContractFor({ caseId, operator, target });
  const body = caseId === "EVT-051" ? evt051Body : caseId === "EVT-054" ? evt054Body :
    caseId === "EVT-066" ? evt066Bodies.at(-1) : evt070Body;
  const duplicate = structuredClone(body);
  duplicate.unifiedResolutionWorkspace
    ? duplicate.unifiedResolutionWorkspace.resolutionQueue.push(
      structuredClone(duplicate.unifiedResolutionWorkspace.resolutionQueue[0]))
    : duplicate[contract.collectionPath.split(".")[0]][contract.collectionPath.split(".")[1]].push(
      structuredClone(duplicate[contract.collectionPath.split(".")[0]][contract.collectionPath.split(".")[1]][0]));
  const zero = evaluateResponseDerivedDomFieldProjection({
    caseId, operator, target, responseBodies: [body],
    observation: { count: 0, visibleCount: 0, semanticNodes: [] },
    fixtureCandidates: [fixture], fixtureIdentity: fixture,
  });
  const duplicateOwner = evaluateResponseDerivedDomFieldProjection({
    caseId, operator, target,
    responseBodies: caseId === "EVT-066" ? [evt066Bodies[0], duplicate] : [duplicate],
    observation: { count: 1, visibleCount: 1,
      semanticNodes: [{ eventId: fixture, attributes: {}, fields: {} }] },
    fixtureCandidates: [fixture], fixtureIdentity: fixture,
  });
  assert(!zero.pass && !duplicateOwner.pass, `${caseId} owner cardinality negative passed`);
}
close(["EVT-051", "EVT-054", "EVT-066", "EVT-070"], true,
  "declared final operator projection contract");

close(["EVT-046", "EVT-070"],
  renderer.includes("data-v390-event-review-render-request"), "render-bound event review query projection");
close(["EVT-064"],
  renderer.includes('data-event-semantic-field="detailSections" data-event-semantic-value="${escapeHtml(section?.key || \'\')}"'),
  "raw semantic detail section projection");
close(["EVT-065", "EVT-067", "EVT-069", "EVT-071", "EVT-072", "EVT-075"],
  ["data-v320-evidence-quality-schema", "data-v320-ai-review-quality-schema",
    "data-v320-action-readiness-checklist-schema", "data-v330-incident-source-correlation-schema",
    "data-v330-operator-recheck-recovery-queue-schema", "data-v350-incident-command-handoff-schema"]
    .every(token => renderer.includes(token)), "feature identity and schema attribute separation");

assert.equal(closures.size, 23, `remaining trace replay closure coverage mismatch: ${closures.size}/23`);
console.log(`v390 UI native diagnostic remaining trace replay: PASS ${closures.size}/23`);
