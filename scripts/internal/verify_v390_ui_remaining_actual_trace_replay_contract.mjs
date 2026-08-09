#!/usr/bin/env node

// 파일 용도: remaining actual census/closure의 실패 입력을 공통 response-owner lifecycle로 재생한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eventExactOracleFor } from "./v390_ui_exact_event_oracles.mjs";
import {
  evaluateResponseDerivedDomFieldProjection,
  responseDerivedDomProjectionContractFor,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  selectEventDomResponseBodies,
} from "./v390_ui_exact_oracle_runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809031330-49276");
const closureRunRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809040016-62650");
const censusPath = path.join(root,
  "test/fixtures/v390_ui_remaining_actual_failure_census_20260809.json");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const source = name => fs.readFileSync(path.join(root, name), "utf8");

const censusBytes = fs.readFileSync(censusPath);
const census = JSON.parse(censusBytes);
const digestInput = { ...census, artifactDigestSha256: "" };
assert.equal(sha256(JSON.stringify(digestInput)), census.artifactDigestSha256,
  "failure census artifact digest drift");
assert.deepEqual(census.counts, {
  selected: 133, attempted: 133, pass: 126, fail: 7, notRun: 0, unsupported: 0,
  clusterCount: 4,
});
assert.deepEqual(census.assignmentCoverage,
  { failureCount: 7, assignedCount: 7, missingIds: [], duplicateIds: [] });
const parentSummaryBytes = fs.readFileSync(path.join(runRoot, "summary.json"));
assert.equal(sha256(parentSummaryBytes),
  census.source.summarySha256, "actual parent summary digest drift");
const parentSummary = JSON.parse(parentSummaryBytes);

const signatures = new Map([
  ["EVT-007", "RENDERER_PROJECTION_VALUE_MISMATCH"],
  ["EVT-017", "RENDERER_PROJECTION_VALUE_MISMATCH"],
  ["EVT-019", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-020", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-022", "RESPONSE_BASELINE_MISSING"],
  ["EVT-023", "API_DOM_FIXTURE_IDENTITY_MISMATCH"],
  ["EVT-026", "API_DOM_FIXTURE_IDENTITY_MISMATCH"],
]);
for (const failure of census.failures) {
  const caseRoot = path.join(runRoot, "cases", failure.caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${failure.caseId}.trace.json`));
  assert.equal(sha256(summaryBytes), failure.summarySha256,
    `${failure.caseId} actual summary digest drift`);
  assert.equal(sha256(traceBytes), failure.traceSha256,
    `${failure.caseId} actual trace digest drift`);
  const summary = JSON.parse(summaryBytes);
  const trace = JSON.parse(traceBytes);
  const actualCase = summary.case;
  assert.equal(trace.caseId, failure.caseId, `${failure.caseId} trace identity drift`);
  assert.equal(actualCase.status, "FAIL", `${failure.caseId} actual RED status drift`);
  assert.equal(actualCase.actualBrowserExecution, true,
    `${failure.caseId} browser execution attestation drift`);
  assert.equal(actualCase.cleanupAttestation?.pass, true,
    `${failure.caseId} cleanup attestation drift`);
  assert.equal(summary.rawCaptureValidation?.status, "PASS",
    `${failure.caseId} raw capture validation drift`);
  assert.equal(parentSummary.cases.find(item => item.caseId === failure.caseId)?.secretScan?.status, "PASS",
    `${failure.caseId} secret scan drift`);
  assert(JSON.stringify(actualCase.eventDomSemanticEvidence).includes(signatures.get(failure.caseId)),
    `${failure.caseId} failure signature drift`);
}

const closureActual = Object.freeze({
  parentSha256: "f360bfa787a4adaa26b91f99d7e6b5d48fe76adb925379a105d09d89d0df0b58",
  cases: Object.freeze({
    "EVT-007": Object.freeze({
      summarySha256: "e51055fda778f7b234a6825f5fcf08e2fe1dfb07e930d35d02db734edb03aa32",
      traceSha256: "f210a55eb021d01b921801ad0e1637382f60a4b639b976730f8d64b3037a1af9",
      failure: "RESPONSE_BASELINE_MISSING",
    }),
    "EVT-017": Object.freeze({
      summarySha256: "5f745e055a9d908fa1241eda9ef1ce78fb1e5107d79c7e173baddaea556e4fe6",
      traceSha256: "08e94c6ac01dd38532ced579a69107ddaa02b520ffdb942436e3aaa4b9aa2599",
      failure: "RESPONSE_FIELD_OWNER_MISSING",
    }),
    "EVT-019": Object.freeze({
      summarySha256: "09093d54593d6001e2f3c6e70fbad6a93b272b2ca26e3091356358717820c27f",
      traceSha256: "be11a0f079b33d977b9b0ec4b8ea4126df8579904b8886baf44ab0ca5d2ba4d0",
      failure: "RESPONSE_FIELD_OWNER_AMBIGUOUS",
    }),
    "EVT-020": Object.freeze({
      summarySha256: "aa29b4b6829afbf265a0967fa798825c9d0a1df6326f42c7f4748e6fc74b2e84",
      traceSha256: "39919e9261760c5e6c54286df61f4ea25ecf40714104c3577ca809a4aaab9e91",
      failure: "RESPONSE_BASELINE_MISSING",
    }),
    "EVT-022": Object.freeze({
      summarySha256: "7b8d4efaf50a39d66b332d576369d397b135faeb1e9c6e7cae5df71b7417a33c",
      traceSha256: "2281ff78967e650dac327f582796c34c5e61dd8e25f28664340b24c607e9af50",
      failure: "bound response row cardinality mismatch",
    }),
  }),
});
const closureParentBytes = fs.readFileSync(path.join(closureRunRoot, "summary.json"));
assert.equal(sha256(closureParentBytes), closureActual.parentSha256,
  "closure actual parent summary digest drift");
const closureParent = JSON.parse(closureParentBytes);
assert.deepEqual(closureParent.counts,
  { target: 7, attempted: 6, pass: 2, fail: 4, notRun: 1, unsupported: 0 });
for (const [caseId, expected] of Object.entries(closureActual.cases)) {
  const caseRoot = path.join(closureRunRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${caseId}.trace.json`));
  assert.equal(sha256(summaryBytes), expected.summarySha256,
    `${caseId} closure actual summary digest drift`);
  assert.equal(sha256(traceBytes), expected.traceSha256,
    `${caseId} closure actual trace digest drift`);
  const summary = JSON.parse(summaryBytes);
  const trace = JSON.parse(traceBytes);
  assert.equal(trace.caseId, caseId, `${caseId} closure trace identity drift`);
  assert.equal(summary.case?.status, "FAIL", `${caseId} closure RED status drift`);
  assert(String(summary.case?.failureDetail || "").includes(expected.failure) ||
    JSON.stringify(summary.case?.eventDomSemanticEvidence || {}).includes(expected.failure),
  `${caseId} closure failure signature drift`);
}

const lifecycleAssertions = Object.freeze([
  Object.freeze({
    caseId: "EVT-007", operator: "archive-toggle-changes-result", target: "fixtureArchiveEventId",
    requestPath: "/ops/api/events/status?limit={limit}&offset={offset}&evidence={evidence}&includeArchives=1",
    ownerKind: "event-record", ownerRole: "archive",
  }),
  Object.freeze({
    caseId: "EVT-017", operator: "row-fields-equal-response", target: "id/kind/enabled/label",
    requestPath: "/ops/api/alerts/deliveries", ownerKind: "alert-delivery", ownerRole: "primary",
  }),
  Object.freeze({
    caseId: "EVT-019", operator: "fields-equal-response", target: "event/review",
    requestPath: "/ops/api/events/reviews/{fixtureId}",
    ownerKind: "event-record", ownerRole: "primary",
  }),
  Object.freeze({
    caseId: "EVT-020", operator: "field-value-equals-response", target: "reviewStatus/note",
    requestPath: "/ops/api/events/reviews/{fixtureId}",
    ownerKind: "event-record", ownerRole: "primary",
  }),
  Object.freeze({
    caseId: "EVT-020", operator: "evidence-links-match-seed", target: "snapshotPath/clipPath",
    requestPath: "/ops/api/events/status?limit=50",
    ownerKind: "event-record", ownerRole: "primary",
  }),
  Object.freeze({
    caseId: "EVT-022", operator: "contains-fixture-audit", target: "eventId/action",
    requestPath: "/ops/api/audit?eventId={fixtureId}",
    ownerKind: "event-record", ownerRole: "primary",
  }),
]);
for (const expected of lifecycleAssertions) {
  const assertion = eventExactOracleFor(expected.caseId).domAssertions
    .flatMap(entry => entry.assertions)
    .find(candidate => candidate.operator === expected.operator && candidate.target === expected.target);
  assert(assertion, `${expected.caseId} lifecycle assertion missing: ${expected.operator}/${expected.target}`);
  assert.equal(assertion.binding?.responseSource?.method, "GET",
    `${expected.caseId} response owner method is not declared`);
  assert.equal(assertion.binding?.responseSource?.path, expected.requestPath,
    `${expected.caseId} authoritative response owner is not exact`);
  assert.equal(assertion.binding?.identitySource, "fixture-owner",
    `${expected.caseId} materialized fixture owner is not propagated`);
  assert.equal(assertion.binding?.fixtureOwner?.kind, expected.ownerKind,
    `${expected.caseId} fixture owner kind drift`);
  assert.equal(assertion.binding?.fixtureOwner?.role, expected.ownerRole,
    `${expected.caseId} fixture owner role drift`);
}

const selectedBodyFor = ({ caseId, operator, target, fixtureIdentity, responses, bodies }) => {
  const assertion = eventExactOracleFor(caseId).domAssertions
    .flatMap(entry => entry.assertions)
    .find(candidate => candidate.operator === operator && candidate.target === target);
  const materializedPath = assertion.binding.responseSource.path
    .replaceAll("{fixtureId}", caseId.toLowerCase() + "-review4-fixture")
    .replaceAll("{limit}", "100")
    .replaceAll("{offset}", "0")
    .replaceAll("{evidence}", "snapshot");
  const baseline = {
    schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
    collectionPath: assertion.binding.collectionPath,
    identityPaths: assertion.binding.identityPaths,
    identityValue: fixtureIdentity,
    projectionPaths: assertion.binding.fields.map(field => field.responsePath),
    expectedProjection: {},
    responseSource: {
      method: assertion.binding.responseSource.method,
      pathTemplate: assertion.binding.responseSource.path,
      path: materializedPath,
    },
  };
  return selectEventDomResponseBodies(assertion, {
    domResponseBaselineByAssertionKey: {
      [`${operator}\n${target}`]: baseline,
    },
  }, responses, bodies);
};

const reviewCollection = { records: [{ event: { eventId: "evt-019-review4-fixture" }, review: {
  eventId: "evt-019-review4-fixture", reviewStatus: "reviewing", classification: "true-positive",
} }] };
const reviewDetail = structuredClone(reviewCollection);
const selectedReviewBodies = selectedBodyFor({
  caseId: "EVT-019",
  operator: "fields-equal-response",
  target: "event/review",
  fixtureIdentity: "evt-019-review4-fixture",
  responses: [
    { method: "GET", urlPath: "/ops/api/events/reviews" },
    { method: "GET", urlPath: "/ops/api/events/reviews/evt-019-review4-fixture" },
  ],
  bodies: [reviewCollection, reviewDetail],
});
assert.deepEqual(selectedReviewBodies, [reviewDetail],
  "EVT-019 did not select the single authoritative detail response");
assert.throws(() => selectedBodyFor({
  caseId: "EVT-019",
  operator: "fields-equal-response",
  target: "event/review",
  fixtureIdentity: "evt-019-review4-fixture",
  responses: [
    { method: "GET", urlPath: "/ops/api/events/reviews/evt-019-review4-fixture" },
    { method: "GET", urlPath: "/ops/api/events/reviews/evt-019-review4-fixture" },
  ],
  bodies: [reviewDetail, reviewDetail],
}), /cardinality mismatch: 2/,
"duplicate authoritative response owners must fail closed");

const deliveryIdentity = "evt-017-review4-fixture-delivery";
const deliveryProjection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-017",
  operator: "row-fields-equal-response",
  target: "id/kind/enabled/label",
  fixtureIdentity: deliveryIdentity,
  fixtureCandidates: [deliveryIdentity],
  responseBodies: [{ integrations: [{
    id: deliveryIdentity,
    kind: "webhook",
    enabled: true,
    label: "REVIEW4 EVT-017 delivery",
  }] }],
  observation: { count: 1, visibleCount: 1, semanticNodes: [{
    eventId: deliveryIdentity,
    attributes: {},
    fields: {
      id: [deliveryIdentity],
      kind: ["webhook"],
      enabled: ["true"],
      label: ["REVIEW4 EVT-017 delivery"],
    },
  }] },
});
assert.equal(deliveryProjection.pass, true,
  `EVT-017 materialized delivery owner remains RED: ${deliveryProjection.failureCode}`);

const emptyRuleProjection = fields => evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-007",
  operator: "row-fields-equal-response",
  target: "eventId/ruleId/scenarioName/evidence",
  fixtureIdentity: "evt-007-review4-fixture",
  fixtureCandidates: ["evt-007-review4-fixture"],
  responseBodies: [{ records: { records: [{
    eventId: "evt-007-review4-fixture",
    metadata: { ruleId: "" },
    scenarioName: "review4-exact",
    snapshotPath: "snapshots/evt-007-review4-fixture.jpg",
    clipPath: "clips/evt-007-review4-fixture.mp4",
  }] } }],
  observation: { count: 1, visibleCount: 1, semanticNodes: [{
    eventId: "evt-007-review4-fixture",
    attributes: {},
    fields: {
      ...fields,
      scenarioName: ["review4-exact"],
      evidence: ["evt-007-review4-fixture.jpg", "evt-007-review4-fixture.mp4"],
    },
  }] },
});
assert.equal(emptyRuleProjection({ ruleId: [""] }).pass, true,
  "renderer-owned optional empty ruleId must be accepted");
assert.equal(emptyRuleProjection({}).pass, false,
  "unowned optional empty ruleId must fail closed");

const rendererSource = source("src/ingress/product_ui_page_scripts.cpp");
const runtimeSource = source("scripts/internal/v390_ui_exact_oracle_runtime.mjs");

assert(rendererSource.includes('data-event-semantic-field="ruleId"') &&
  rendererSource.includes("data-event-semantic-value"),
"EVT-007 renderer does not preserve the authoritative empty ruleId value");
assert(rendererSource.includes("data-alert-delivery-id") &&
  rendererSource.includes('data-event-semantic-field="enabled"'),
"EVT-017 renderer lacks a typed alert-delivery owner and fields");

const projectionCases = [
  {
    caseId: "EVT-017", operator: "row-fields-equal-response", target: "id/kind/enabled/label",
    fixtureId: "evt-017-review4-fixture",
    responseBodies: [{ integrations: [{ id: "evt-017-review4-fixture", kind: "webhook",
      enabled: false, label: "Fixture delivery" }] }],
    semanticNode: { eventId: "evt-017-review4-fixture", attributes: {}, fields: {
      id: ["evt-017-review4-fixture"], kind: ["webhook"], enabled: ["false"],
      label: ["Fixture delivery"],
    } },
  },
  {
    caseId: "EVT-019", operator: "fields-equal-response", target: "event/review",
    fixtureId: "evt-019-review4-fixture",
    responseBodies: [{ records: [{ event: { eventId: "evt-019-review4-fixture" }, review: {
      eventId: "evt-019-review4-fixture", reviewStatus: "reviewing", classification: "true-positive",
    } }] }],
    semanticNode: { eventId: "evt-019-review4-fixture", attributes: {}, fields: {
      eventId: ["evt-019-review4-fixture"], reviewStatus: ["reviewing"],
      classification: ["true-positive"],
    } },
  },
  {
    caseId: "EVT-020", operator: "field-value-equals-response", target: "reviewStatus/note",
    fixtureId: "evt-020-review4-fixture",
    responseBodies: [{ records: [{ event: { eventId: "evt-020-review4-fixture" }, review: {
      eventId: "evt-020-review4-fixture", reviewStatus: "confirmed", note: "actual trace note",
    } }] }],
    semanticNode: { eventId: "evt-020-review4-fixture", attributes: {}, fields: {
      reviewStatus: ["confirmed"], note: ["actual trace note"],
    } },
  },
];
for (const replay of projectionCases) {
  const contract = responseDerivedDomProjectionContractFor(replay);
  assert(contract, `${replay.caseId} fixture-owned projection contract missing`);
  const result = evaluateResponseDerivedDomFieldProjection({
    ...replay,
    fixtureCandidates: [replay.fixtureId],
    fixtureIdentity: replay.fixtureId,
    observation: { count: 1, visibleCount: 1, semanticNodes: [replay.semanticNode] },
  });
  assert.equal(result.pass, true,
    `${replay.caseId} browser-equivalent fixture-owned projection remains RED: ${result.failureCode}`);
}

const auditAssertion = eventExactOracleFor("EVT-022").domAssertions
  .flatMap(entry => entry.assertions)
  .find(assertion => assertion.operator === "contains-fixture-audit");
assert.equal(auditAssertion?.binding?.mode, "row-local-response",
  "EVT-022 audit assertion still omits its fixture-owned response baseline");
assert.equal(auditAssertion?.binding?.collectionPath, "entries");

assert(runtimeSource.includes("routeLocalRendererIdentityMatched") &&
  runtimeSource.includes('rendererOwner === "renderDashboardIncidentTimeline"'),
"EVT-023/026 route-local renderer identity proof is not admitted at the fixture boundary");

console.log("PASS verify_v390_ui_remaining_actual_trace_replay_contract");
