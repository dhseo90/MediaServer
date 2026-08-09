#!/usr/bin/env node

// 파일 용도: remaining actual census/closure의 실패 입력을 공통 response-owner lifecycle로 재생한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eventExactOracleFor } from "./v390_ui_exact_event_oracles.mjs";
import {
  buildEventRequestQueryOwnerBaseline,
  resolveEventBoundResponseRows,
} from "./v390_ui_case_runtime.mjs";
import {
  evaluateEventExactDomAssertion,
  evaluateResponseDerivedDomFieldProjection,
  responseDerivedDomProjectionContractFor,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  buildAuditDetailLifecycleEvidence,
  buildDeclaredEventDomBindingEvidence,
  buildEventDomSemanticCompositeEvidence,
  evaluateEventDomActionReadback,
  selectEventDomResponseBodies,
} from "./v390_ui_exact_oracle_runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809031330-49276");
const closureRunRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809040016-62650");
const latestRunRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809054053-83497");
const remaining4RunRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-remaining4-629fddf0");
const final7RunRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-final7-9e43fd27");
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

const latestActual = Object.freeze({
  parentSha256: "11b2e530f63bfd0bbe312b7a0163d0229029fce175f1aae31d8ffed4ebbd0af7",
  cases: Object.freeze({
    "EVT-007": Object.freeze({
      summarySha256: "054c46a595155d50171e4a6006df81f4a73ccb86a2c8ae80b0c1b62fd17b1d26",
      traceSha256: "c73e8ff5a9cea09e2dce720f17502b4c1e8408eed1c22e45b1240ccaeafc2acc",
      status: "FAIL", failure: "RESPONSE_BASELINE_MISSING",
    }),
    "EVT-017": Object.freeze({
      summarySha256: "f74bbd00e11a1754e29fb50554e998ac6c837fc668ed3b8cfce3601c09827455",
      traceSha256: "c02818243a93229a77a8f591d6ba02026bf354b18e6d62513253b48f0f9e92f9",
      status: "FAIL", failure: "RESPONSE_BASELINE_MISSING",
    }),
    "EVT-019": Object.freeze({
      summarySha256: "f6c6cb6c05aad08c85e002a4d68e1571ab1f91a3fe0406a29b4aec254ff0f2ef",
      traceSha256: "57fbd81c59f9645fef5d09a923cd7b111f02fffabc12bb6f0bb2128daa051413",
      status: "FAIL", failure: "RESPONSE_BASELINE_MISSING",
    }),
    "EVT-022": Object.freeze({
      summarySha256: "eca36f9a1e0bc9c62e61d82d359581dbacea2762ec1ce2bef1c989d0e4495b04",
      traceSha256: "2281ff78967e650dac327f582796c34c5e61dd8e25f28664340b24c607e9af50",
      status: "FAIL", failure: "bound response row cardinality mismatch",
    }),
  }),
});
const latestParentBytes = fs.readFileSync(path.join(latestRunRoot, "summary.json"));
assert.equal(sha256(latestParentBytes), latestActual.parentSha256,
  "latest actual parent summary digest drift");
const latestParent = JSON.parse(latestParentBytes);
assert.deepEqual(latestParent.counts,
  { target: 7, attempted: 6, pass: 3, fail: 3, notRun: 1, unsupported: 0 });
for (const [caseId, expected] of Object.entries(latestActual.cases)) {
  const caseRoot = path.join(latestRunRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${caseId}.trace.json`));
  assert.equal(sha256(summaryBytes), expected.summarySha256,
    `${caseId} latest actual summary digest drift`);
  assert.equal(sha256(traceBytes), expected.traceSha256,
    `${caseId} latest actual trace digest drift`);
  const summary = JSON.parse(summaryBytes);
  assert.equal(summary.case?.status, expected.status, `${caseId} latest RED status drift`);
  assert(String(summary.case?.failureDetail || "").includes(expected.failure) ||
    JSON.stringify(summary.case?.eventDomSemanticEvidence || {}).includes(expected.failure),
  `${caseId} latest failure signature drift`);
}

const remaining4ParentBytes = fs.readFileSync(path.join(remaining4RunRoot, "summary.json"));
assert.equal(sha256(remaining4ParentBytes),
  "06c70fcc94293a8a533abd9bdd6b1986ac92f9ed1520c2e0e570ca0cc042e038",
  "remaining4 actual parent summary digest drift");
const remaining4Parent = JSON.parse(remaining4ParentBytes);
assert.deepEqual(remaining4Parent.counts,
  { target: 7, attempted: 7, pass: 6, fail: 1, notRun: 0, unsupported: 0 });
assert.equal(remaining4Parent.sourceBinding?.gitCommit,
  "629fddf0957f24c8d25c4e90e6ea1b73650a5299");
assert.deepEqual(remaining4Parent.selection?.selectedIds,
  ["EVT-007", "EVT-017", "EVT-019", "EVT-020", "EVT-022", "EVT-023", "EVT-026"]);
for (const caseId of ["EVT-007", "EVT-017", "EVT-019", "EVT-020", "EVT-023", "EVT-026"]) {
  assert.equal(remaining4Parent.cases.find(item => item.caseId === caseId)?.status, "PASS",
    `${caseId} remaining4 control status drift`);
}
const remaining4Evt022Root = path.join(remaining4RunRoot, "cases", "EVT-022");
const remaining4Evt022SummaryBytes = fs.readFileSync(path.join(remaining4Evt022Root, "summary.json"));
const remaining4Evt022TraceBytes = fs.readFileSync(
  path.join(remaining4Evt022Root, "traces", "EVT-022.trace.json"));
assert.equal(sha256(remaining4Evt022SummaryBytes),
  "46606193312930dc64c2b8dd1de730355d7e6f58d8bacf060fece53411957bb0",
  "EVT-022 remaining4 actual summary digest drift");
assert.equal(sha256(remaining4Evt022TraceBytes),
  "6ba2afe900fc8dce6e48fee473765a3c3a70aa83a4088b08036f0b5393cd1a49",
  "EVT-022 remaining4 actual trace digest drift");
const remaining4Evt022Summary = JSON.parse(remaining4Evt022SummaryBytes);
const remaining4Evt022Trace = JSON.parse(remaining4Evt022TraceBytes);
const remaining4Evt022Evidence = remaining4Evt022Summary.case?.eventDomSemanticEvidence;
assert.equal(remaining4Evt022Trace.caseId, "EVT-022");
assert.equal(remaining4Evt022Summary.case?.status, "FAIL");
assert.deepEqual(remaining4Evt022Evidence?.causeCodes,
  ["FIXTURE_SOURCE_ROW_MISSING", "DECLARED_DOM_FIELD_PROJECTION_MISMATCH"]);
assert.deepEqual(remaining4Evt022Evidence?.responseBaselineMatched?.mismatchPaths,
  ["eventId/action"]);
assert.equal(remaining4Evt022Evidence?.responseBaselineMatched?.candidateCount, 0);
assert.equal(remaining4Evt022Evidence?.observationPresent?.exists, true);
assert.equal(remaining4Evt022Evidence?.observationPresent?.visible, true);

const final7ParentBytes = fs.readFileSync(path.join(final7RunRoot, "summary.json"));
assert.equal(sha256(final7ParentBytes),
  "d04f4015f2ca657a22def026b417fcb824568965e148877175108d63285edb9b",
  "final7 actual parent summary digest drift");
const final7Parent = JSON.parse(final7ParentBytes);
assert.deepEqual(final7Parent.counts,
  { target: 7, attempted: 7, pass: 6, fail: 1, notRun: 0, unsupported: 0 });
assert.equal(final7Parent.sourceBinding?.gitCommit,
  "9e43fd274b5ebde91f116ce5477b558bcc577ab6");
assert.deepEqual(final7Parent.selection?.selectedIds,
  ["EVT-007", "EVT-017", "EVT-019", "EVT-020", "EVT-022", "EVT-023", "EVT-026"]);
for (const caseId of ["EVT-007", "EVT-017", "EVT-019", "EVT-020", "EVT-023", "EVT-026"]) {
  assert.equal(final7Parent.cases.find(item => item.caseId === caseId)?.status, "PASS",
    `${caseId} final7 control status drift`);
}
const final7Evt022Root = path.join(final7RunRoot, "cases", "EVT-022");
const final7Evt022SummaryBytes = fs.readFileSync(path.join(final7Evt022Root, "summary.json"));
const final7Evt022TraceBytes = fs.readFileSync(
  path.join(final7Evt022Root, "traces", "EVT-022.trace.json"));
assert.equal(sha256(final7Evt022SummaryBytes),
  "00b7e090028258dd61036721802399a38ad166928486d15dfec824e51887215d",
  "EVT-022 final7 actual summary digest drift");
assert.equal(sha256(final7Evt022TraceBytes),
  "c0d7a1a875e60bdf821ddceb7c72e511a15762ad4470557c0a9cd748a7ad4ad1",
  "EVT-022 final7 actual trace digest drift");
const final7Evt022Summary = JSON.parse(final7Evt022SummaryBytes);
const final7Evt022Trace = JSON.parse(final7Evt022TraceBytes);
const final7Evt022Evidence = final7Evt022Summary.case?.eventDomSemanticEvidence;
assert.equal(final7Evt022Trace.caseId, "EVT-022");
assert.equal(final7Evt022Summary.case?.status, "FAIL");
assert.deepEqual(final7Evt022Evidence?.causeCodes,
  ["DOM_OBSERVATION_MISSING", "AUDIT_DETAIL_RESPONSE_MISMATCH"]);
assert.equal(final7Evt022Evidence?.responseBaselineMatched?.pass, true);
assert.equal(final7Evt022Evidence?.observationPresent?.exists, false);
assert.equal(final7Evt022Evidence?.declaredDomBinding?.failureCode,
  "AUDIT_DETAIL_RESPONSE_MISMATCH");

const lifecycleMatrix = Object.freeze({
  "EVT-007": Object.freeze({
    seed: "active-and-archived-event-records",
    steps: ["seed-active-and-archive", "toggle-archives", "filter-evidence", "page-forward-back", "compare-order"],
    api: ["status/equals", "records.records/contains-fixture-events", "records.matchedRecords/number-gte"],
    dom: ["row-fields-equal-response/eventId/ruleId/scenarioName/evidence", "archive-toggle-changes-result/fixtureArchiveEventId", "pagination-offset-equals-request/offset"],
  }),
  "EVT-017": Object.freeze({
    seed: "alert-delivery-integrations",
    steps: ["seed-two-integrations", "filter-search", "filter-kind", "filter-enabled", "assert-empty"],
    api: ["status/string-non-empty", "integrations/contains-fixture-integrations", "integrations[].endpointMasked/redacted", "integrations[].endpointRedacted/equals"],
    dom: ["row-fields-equal-response/id/kind/enabled/label", "filter-result-exact/kind", "filter-result-exact/enabled", "unmatched-query-produces-empty/fixture-unmatched"],
  }),
  "EVT-019": Object.freeze({
    seed: "event-record-and-review",
    steps: ["seed-event", "seed-review", "capture-record-hash", "load-inbox", "compare-joined-row", "assert-record-unchanged"],
    api: ["records/contains-fixture-review", "storage.separateFromEventRecords/equals", "records[].event.eventId/equals-fixture", "records[].review.eventId/equals-fixture", "records[].review.reviewStatus/equals-seed", "records[].review.classification/equals-seed"],
    dom: ["fields-equal-response/event/review", "contains-descendant/[data-testid=ops-vlm-event-review-card]"],
  }),
  "EVT-022": Object.freeze({
    seed: "review-audit-actions",
    steps: ["seed-two-audits", "refresh-audit", "filter-fixture", "open-detail", "export-json-csv-diff", "compare-exports"],
    api: ["entries/contains-fixture-event", "entries[].action/contains-seed-action", "$text/csv-contains-fixture", "$contentType/starts-with", "entries/contains-fixture-diff", "entries[].after/object"],
    dom: ["contains-fixture-audit/eventId/action", "detail-equals-response/before/after", "export-download-matches-api/fixtureId"],
  }),
});
for (const [caseId, expected] of Object.entries(lifecycleMatrix)) {
  const spec = eventExactOracleFor(caseId);
  assert.equal(spec.seed.kind, expected.seed, `${caseId} fixture role drift`);
  assert.deepEqual(spec.action.steps, expected.steps, `${caseId} ordered action sequence drift`);
  assert.deepEqual(spec.requests.flatMap(request => request.assertions.map(assertion =>
    `${assertion.path}/${assertion.operator}`)), expected.api, `${caseId} API assertion waterfall drift`);
  assert.deepEqual(spec.domAssertions.flatMap(contract => contract.assertions.map(assertion =>
    `${assertion.operator}/${assertion.target}`)), expected.dom, `${caseId} DOM assertion waterfall drift`);
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
assert.deepEqual(auditAssertion?.binding?.identityFields, [
  { responsePath: "target", ownerPath: "identity", prefix: "event:" },
  { responsePath: "action", ownerPath: "auditAction", seedPath: "entries[].action" },
], "EVT-022 audit owner is not target/action exact");
const auditDetailAssertion = eventExactOracleFor("EVT-022").domAssertions
  .flatMap(entry => entry.assertions)
  .find(assertion => assertion.operator === "detail-equals-response");
assert.equal(auditDetailAssertion?.binding?.domKind, "audit-detail-modal");
assert.equal(auditDetailAssertion?.binding?.action?.kind, "click");
assert.equal(auditDetailAssertion?.binding?.responseSource?.path,
  "/ops/api/audit?format=diff-json&eventId={fixtureId}");
assert.equal(auditDetailAssertion?.binding?.action?.waitForSelector,
  '#opsAuditDetailDialog[open][data-audit-detail-state="rendered"]' +
  '[data-audit-detail-owner-target="event:{fixtureId}"]' +
  '[data-audit-detail-owner-action="{auditAction}"]');
const auditExportAssertion = eventExactOracleFor("EVT-022").domAssertions
  .flatMap(entry => entry.assertions)
  .find(assertion => assertion.operator === "export-download-matches-api");
assert.deepEqual(auditExportAssertion?.binding?.formats, ["json", "csv", "diff-json"]);

const filterAssertions = eventExactOracleFor("EVT-017").domAssertions
  .flatMap(entry => entry.assertions)
  .filter(assertion => ["filter-result-exact", "unmatched-query-produces-empty"]
    .includes(assertion.operator));
assert.equal(filterAssertions.length, 3);
assert(filterAssertions.every(assertion =>
  assertion.binding?.mode === "direct-dom" &&
  assertion.binding?.validator === "filter-action-readback" &&
  assertion.binding?.responseSource?.path === "/ops/api/alerts/deliveries" &&
  assertion.binding?.identitySource === "fixture-owner"),
"EVT-017 filter action/readback lifecycle is incomplete");
const filterBody = { integrations: [{ id: deliveryIdentity, kind: "webhook", enabled: true }] };
assert.deepEqual(selectEventDomResponseBodies(filterAssertions[0], {
  templateValues: { fixtureId: "evt-017-review4-fixture" },
}, [{ method: "GET", urlPath: "/ops/api/alerts/deliveries" }], [filterBody]), [filterBody]);
assert.throws(() => selectEventDomResponseBodies(filterAssertions[0], {
  templateValues: { fixtureId: "evt-017-review4-fixture" },
}, [{ method: "GET", urlPath: "/ops/api/alerts/deliveries?stale=1" }], [filterBody]),
/cardinality mismatch: 0/, "stale filter response owner did not fail closed");
assert.throws(() => selectEventDomResponseBodies(filterAssertions[0], {
  templateValues: { fixtureId: "evt-017-review4-fixture" },
}, [
  { method: "GET", urlPath: "/ops/api/alerts/deliveries" },
  { method: "GET", urlPath: "/ops/api/alerts/deliveries" },
], [filterBody, filterBody]), /cardinality mismatch: 2/,
"duplicate filter response owner did not fail closed");

const descendantBinding = eventExactOracleFor("EVT-019").domAssertions
  .flatMap(entry => entry.assertions)
  .find(assertion => assertion.operator === "contains-descendant")?.binding;
assert.deepEqual(descendantBinding,
  { mode: "direct-dom", validator: "exact-visible-descendant-owner" });

assert(runtimeSource.includes("routeLocalRendererIdentityMatched") &&
  runtimeSource.includes('rendererOwner === "renderDashboardIncidentTimeline"'),
"EVT-023/026 route-local renderer identity proof is not admitted at the fixture boundary");

const paginationPath = "/ops/api/events/status?limit=100&offset=0&evidence=snapshot&includeArchives=1";
const paginationBaseline = buildEventRequestQueryOwnerBaseline({
  method: "GET", requestPath: paginationPath, target: "offset",
});
assert(paginationBaseline, "single-key pagination query owner baseline is missing");
const paginationActionId = "EVT-007:assert-product-state";
const paginationCorrelation = "EVT-007:pagination-contract";
const paginationCorrelationDigest = sha256(paginationCorrelation);
const paginationRequest = {
  phase: "request-start", requestId: "request-1", caseRequestIdentity: "EVT-007:request-1",
  caseRequestSequence: 1, requestKind: "application-fetch", sameOrigin: true, method: "GET",
  url: `http://runtime.invalid${paginationPath}`, correlationId: paginationCorrelation,
};
const paginationResponse = {
  ...paginationRequest, phase: "response", responseRequestObjectObserved: true,
  requestIdentitySource: "playwright-response-request",
};
const paginationCorrelationEvidence = {
  schema: "media-server.v390-ui-request-correlation-evidence.v1", pass: true,
  requestIdentityMatched: true, responseRequestObjectObserved: true,
  expectedCaseId: "EVT-007", expectedMethod: "GET", expectedPath: paginationPath,
  expectedActionId: paginationActionId, caseRequestIdentity: "EVT-007:request-1",
  caseRequestSequence: 1, responseRequestIdentity: "EVT-007:request-1",
  responseRequestSequence: 1, correlationDigest: paginationCorrelationDigest,
  expectedCorrelationDigest: paginationCorrelationDigest,
  initiatingRequestCorrelationDigest: paginationCorrelationDigest,
  responseRequestCorrelationDigest: paginationCorrelationDigest,
  requestCandidateCount: 1, matchedRequestCount: 1,
  responseCandidateCount: 1, matchedResponseCount: 1,
  requestAttemptCount: 1, requestReissued: false,
};
const paginationEvidence = ({ entries = [paginationRequest, paginationResponse],
  actionId = paginationActionId, correlation = paginationCorrelationEvidence } = {}) =>
  buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-007", selector: "#eventRecordsPrev, #eventRecordsNext",
    observed: { count: 2, visibleCount: 2, text: "previous next", attributes: [{}, {}], values: ["", ""] },
    priorResponseByPath: { offset: paginationBaseline }, networkEntries: entries,
    requestCorrelationEvidence: correlation, requestActionId: actionId,
    actualBrowserExecution: true,
  });
assert.equal(paginationEvidence().pass, true, "exact pagination action/request owner remains RED");
assert.equal(paginationEvidence({ entries: [] }).responseBaselineMatched.reasonCodes[0],
  "REQUEST_OWNER_MISSING", "zero pagination request owner did not fail closed");
assert.equal(paginationEvidence({ entries: [paginationRequest, paginationRequest, paginationResponse] })
  .responseBaselineMatched.reasonCodes[0], "REQUEST_OWNER_DUPLICATE",
"duplicate pagination request owner did not fail closed");
assert.equal(paginationEvidence({ actionId: "EVT-007:wrong-action" })
  .responseBaselineMatched.reasonCodes[0], "REQUEST_CORRELATION_BINDING_INVALID",
"wrong pagination action did not fail closed");
const wrongOffsetRequest = { ...paginationRequest,
  url: "http://runtime.invalid/ops/api/events/status?limit=100&offset=25&evidence=snapshot&includeArchives=1" };
const wrongOffsetResponse = { ...paginationResponse, url: wrongOffsetRequest.url };
assert.equal(paginationEvidence({ entries: [wrongOffsetRequest, wrongOffsetResponse] })
  .responseBaselineMatched.reasonCodes[0], "REQUEST_RESPONSE_IDENTITY_MISMATCH",
"wrong pagination offset did not fail closed");

const filterContract = {
  actionKind: "select", controlSelector: "#alertDeliveryKindFilter",
  expectedValue: "webhook", expectedOwnerIdentity: deliveryIdentity,
  expectedVisibleOwnerCount: 1, field: { name: "kind", expected: "webhook" },
};
const filterObservation = {
  actionKind: "select", controlSelector: "#alertDeliveryKindFilter", controlValue: "webhook",
  visibleRows: [{ identity: deliveryIdentity, fields: { kind: ["webhook"] } }],
};
assert.equal(evaluateEventDomActionReadback(filterContract, filterObservation).pass, true,
  "exact filter action/readback remains RED");
assert.equal(evaluateEventDomActionReadback(filterContract,
  { ...filterObservation, controlValue: "email" }).failureCode, "FILTER_VALUE_MISMATCH");
assert.equal(evaluateEventDomActionReadback(filterContract,
  { ...filterObservation, actionKind: "fill" }).failureCode, "FILTER_ACTION_MISMATCH");
assert.equal(evaluateEventDomActionReadback(filterContract,
  { ...filterObservation, visibleRows: [] }).failureCode, "FILTER_RESULT_OWNER_MISSING");
assert.equal(evaluateEventDomActionReadback(filterContract,
  { ...filterObservation, visibleRows: [filterObservation.visibleRows[0],
    { identity: "other", fields: { kind: ["webhook"] } }] }).failureCode,
"FILTER_RESULT_OWNER_DUPLICATE");

const descendantAssertion = { operator: "contains-descendant",
  target: "[data-testid=ops-vlm-event-review-card]", expected: true };
const descendantObservation = {
  rootCount: 1, visibleRootCount: 1,
  descendants: [descendantAssertion.target],
  descendantMatches: [{ selector: descendantAssertion.target,
    ownerNodeCount: 1, count: 1, visibleCount: 1 }],
};
assert.equal(evaluateEventExactDomAssertion({
  caseId: "EVT-019", assertion: descendantAssertion, observation: descendantObservation,
  context: { fixtureId: "fixture" },
}).pass, true, "exact descendant semantic owner remains RED");
assert.equal(evaluateEventExactDomAssertion({
  caseId: "EVT-019", assertion: descendantAssertion,
  observation: { ...descendantObservation,
    descendantMatches: [{ selector: descendantAssertion.target,
      ownerNodeCount: 2, count: 2, visibleCount: 2 }] },
  context: { fixtureId: "fixture" },
}).pass, false, "split descendant owner did not fail closed");

const auditBinding = {
  mode: "row-local-response", collectionPath: "entries",
  identityPaths: ["target", "action"], identityPathMode: "all",
  identitySource: "fixture-owner",
  fixtureOwner: { kind: "event-record", role: "primary" },
  identityFields: [
    { responsePath: "target", ownerPath: "identity", prefix: "event:" },
    { responsePath: "action", ownerPath: "auditAction" },
  ],
};
const auditOwner = { kind: "event-record", role: "primary",
  identity: "evt-022-review4-fixture", auditAction: "event-review-update" };
const auditRow = { target: "event:evt-022-review4-fixture", action: "event-review-update",
  before: null, after: { reviewStatus: "confirmed" } };
assert.deepEqual(resolveEventBoundResponseRows({
  caseId: "EVT-022", binding: auditBinding, rows: [auditRow], fixtureOwners: [auditOwner],
}), [{ identityValue: auditRow.target,
  identityProjection: { target: auditRow.target, action: auditRow.action }, row: auditRow }]);
assert.throws(() => resolveEventBoundResponseRows({
  caseId: "EVT-022", binding: auditBinding,
  rows: [{ ...auditRow, action: "resolution-state-update" }], fixtureOwners: [auditOwner],
}), /bound response row cardinality mismatch: event:evt-022-review4-fixture\|event-review-update\/0/,
"partial audit target match did not fail closed");
assert.throws(() => resolveEventBoundResponseRows({
  caseId: "EVT-022", binding: auditBinding, rows: [auditRow, { ...auditRow }],
  fixtureOwners: [auditOwner],
}), /bound response row cardinality mismatch: event:evt-022-review4-fixture\|event-review-update\/2/,
"duplicate exact audit identity did not fail closed");

const auditBaseline = {
  schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
  identityKind: "audit-entry",
  collectionPath: "entries",
  identityPaths: ["target", "action"],
  identityPathMode: "all",
  identityValue: auditRow.target,
  identityProjection: { target: auditRow.target, action: auditRow.action },
  projectionPaths: ["target", "action"],
  expectedProjection: { target: auditRow.target, action: auditRow.action },
};
const auditCompositeEvidence = entries => buildEventDomSemanticCompositeEvidence({
  caseId: "EVT-022",
  selector: "#event-review-audit-list [data-audit-list-body] " +
    `[data-event-semantic-event-id="${auditRow.target}"]`,
  observed: {
    count: entries.filter(entry => entry.target === auditRow.target).length,
    visibleCount: entries.filter(entry => entry.target === auditRow.target).length,
    text: entries.map(entry => `${entry.target} ${entry.action}`).join(" "),
    attributes: entries.map(entry => ({ "data-event-semantic-event-id": entry.target })),
    values: entries.flatMap(entry => [entry.target, entry.action]),
    descendantCount: entries.length * 2,
  },
  responseBodies: [{ entries }],
  priorResponseByPath: { "eventId/action": auditBaseline },
  fixtureCandidates: [auditOwner.identity, auditRow.target, auditRow.action],
  fixtureIdentity: auditRow.target,
  fixtureRequired: true,
  actualBrowserExecution: true,
});
const auditSiblingRows = [
  auditRow,
  { ...auditRow, action: "operator-feature-correction-update" },
  { ...auditRow, action: "resolution-state-update" },
  { ...auditRow, action: "operator-resolution-flow-update" },
];
const exactAuditEvidence = auditCompositeEvidence(auditSiblingRows);
assert.equal(exactAuditEvidence.responseBaselineMatched.pass, true,
  `exact target/action audit row remains RED: ${exactAuditEvidence.responseBaselineMatched.reasonCodes}`);
assert.equal(exactAuditEvidence.responseBaselineMatched.candidateCount, 1,
  "exact target/action audit row cardinality is not one");
assert.equal(auditCompositeEvidence([
  { ...auditRow, action: "resolution-state-update" },
]).responseBaselineMatched.reasonCodes[0], "FIXTURE_SOURCE_ROW_MISSING",
"wrong audit action did not fail closed");
assert.equal(auditCompositeEvidence([
  { target: auditRow.target },
]).responseBaselineMatched.reasonCodes[0], "FIXTURE_SOURCE_ROW_MISSING",
"partial audit identity did not fail closed");
assert.equal(auditCompositeEvidence([auditRow, { ...auditRow }])
  .responseBaselineMatched.reasonCodes[0], "FIXTURE_SOURCE_ROW_DUPLICATE",
"duplicate exact audit projection did not fail closed");

const auditSemanticNode = entry => ({
  eventId: String(entry.target || ""),
  attributes: { eventId: String(entry.target || "") },
  fields: Object.fromEntries(["target", "action"]
    .filter(field => Object.prototype.hasOwnProperty.call(entry, field))
    .map(field => [field, [String(entry[field])]])),
});
const auditDomEvidence = entries => buildDeclaredEventDomBindingEvidence({
  assertion: auditAssertion,
  observed: {
    count: entries.length,
    visibleCount: entries.length,
    semanticNodes: entries.map(auditSemanticNode),
  },
  responseBodies: [{ entries }],
  eventRuntimeContext: {
    domResponseBaselineByAssertionKey: {
      [`${auditAssertion.operator}\n${auditAssertion.target}`]: auditBaseline,
    },
  },
  bindings: { fixtureId: auditOwner.identity },
  interaction: null,
});
const exactAuditDomEvidence = auditDomEvidence(auditSiblingRows);
assert.equal(exactAuditDomEvidence.pass, true,
  `exact target/action audit DOM row remains RED: ${exactAuditDomEvidence.failureCode}`);
assert.equal(exactAuditDomEvidence.expectedRowCount, 1);
assert.equal(auditDomEvidence([{ ...auditRow, action: "resolution-state-update" }]).pass, false,
  "wrong-action audit DOM row did not fail closed");
assert.equal(auditDomEvidence([{ target: auditRow.target }]).pass, false,
  "partial audit DOM row did not fail closed");
assert.equal(auditDomEvidence([auditRow, { ...auditRow }]).pass, false,
  "duplicate exact audit DOM row did not fail closed");

const auditDetailBaseline = {
  ...auditBaseline,
  projectionPaths: ["before", "after"],
  expectedProjection: { before: auditRow.before, after: auditRow.after },
  responseSource: {
    method: "GET",
    path: "/ops/api/audit?format=diff-json&eventId=evt-022-review4-fixture",
  },
};
const auditDetailObservation = {
  count: 1,
  open: true,
  state: "rendered",
  ownerTarget: auditRow.target,
  ownerAction: auditRow.action,
  responsePath: auditDetailBaseline.responseSource.path,
  requestId: "audit-detail-1",
  renderCycleId: "audit-detail-1",
  before: JSON.stringify(auditRow.before),
  after: JSON.stringify(auditRow.after),
};
const exactAuditDetail = buildAuditDetailLifecycleEvidence({
  observed: auditDetailObservation,
  baseline: auditDetailBaseline,
});
assert.equal(exactAuditDetail.pass, true,
  `exact audit detail lifecycle remains RED: ${exactAuditDetail.reasonCodes}`);
for (const [label, observed, reasonCode] of [
  ["missing owner", { ...auditDetailObservation, ownerTarget: "", ownerAction: "" },
    "AUDIT_DETAIL_OWNER_MISSING"],
  ["wrong selected row", { ...auditDetailObservation, ownerAction: "resolution-state-update" },
    "AUDIT_DETAIL_OWNER_MISMATCH"],
  ["swapped before/after", { ...auditDetailObservation,
    before: auditDetailObservation.after, after: auditDetailObservation.before },
    "AUDIT_DETAIL_FIELD_VALUE_MISMATCH"],
  ["missing before", { ...auditDetailObservation, before: "" },
    "AUDIT_DETAIL_FIELD_MISSING"],
  ["after type drift", { ...auditDetailObservation, after: JSON.stringify("confirmed") },
    "AUDIT_DETAIL_FIELD_TYPE_MISMATCH"],
  ["stale response", { ...auditDetailObservation, renderCycleId: "audit-detail-2" },
    "AUDIT_DETAIL_LIFECYCLE_STALE"],
  ["wrong response source", { ...auditDetailObservation,
    responsePath: "/ops/api/audit?eventId=evt-022-review4-fixture" },
    "AUDIT_DETAIL_RESPONSE_SOURCE_MISMATCH"],
]) {
  const evidence = buildAuditDetailLifecycleEvidence({ observed, baseline: auditDetailBaseline });
  assert.equal(evidence.pass, false, `${label} did not fail closed`);
  assert(evidence.reasonCodes.includes(reasonCode), `${label} reason code drift`);
}
assert.throws(() => selectEventDomResponseBodies(auditDetailAssertion, {
  templateValues: { fixtureId: auditOwner.identity },
  domResponseBaselineByAssertionKey: {
    [`${auditDetailAssertion.operator}\n${auditDetailAssertion.target}`]: auditDetailBaseline,
  },
}, [
  { method: "GET", urlPath: auditDetailBaseline.responseSource.path },
  { method: "GET", urlPath: auditDetailBaseline.responseSource.path },
], [{ entries: [auditRow] }, { entries: [auditRow] }]),
/DOM authoritative runtime response owner cardinality mismatch: 2/,
"duplicate diff response did not fail closed");

const productUiSource = source("src/ingress/product_ui_js.cpp");
for (const required of [
  "fetchOpsAuditDetail",
  "normalizeOpsAuditDetail",
  "opsAuditDetailRequestSequence",
  "data-audit-detail-state",
  "data-audit-detail-owner-target",
  "data-audit-detail-owner-action",
  "data-audit-detail-response-path",
  "data-audit-detail-request-id",
  "data-audit-detail-render-cycle",
]) {
  assert(productUiSource.includes(required), `product audit detail lifecycle missing: ${required}`);
}

console.log("PASS verify_v390_ui_remaining_actual_trace_replay_contract");
