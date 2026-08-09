#!/usr/bin/env node

// 파일 용도: remaining-133 actual census의 7개 실패 입력을 네 공통 owner 경계로 재생한다.

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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runRoot = path.join(root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260809031330-49276");
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
