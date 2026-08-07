#!/usr/bin/env node
// 파일 용도: 2026-08-07 impact diagnostic의 291개 trace 결속과 99개 공통 원인 replay를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bindRuntimeControlObservationOwner,
  buildPostActionLifecyclePlan,
  postActionDestinationLifecycleRequired,
} from "./v390_ui_shared_adapter_lifecycle.mjs";
import { validateEvt004LifecycleEvidence } from "./v390_ui_diagnostic_lifecycle_lib.mjs";
import { evaluateResponseDerivedDomFieldProjection } from "./v390_ui_exact_event_oracle_evaluator.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const census = readJson("test/fixtures/v390_ui_diagnostic_failure_census_20260807.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const byId = new Map(manifest.cases.map(item => [item.caseId, item]));

assert(census.schema === "media-server.v390-ui-diagnostic-failure-census.v1",
  "impact census schema mismatch");
const { digest, ...payload } = census;
assert(sha256(stableJson(payload)) === digest, "impact census immutable digest mismatch");
assert(census.sourceBinding.gitCommit === "c215a511e37cf1773c0051a93e313f6ba68a3315",
  "impact census source commit mismatch");
assert(/^[0-9a-f]{64}$/.test(census.sourceBinding.parentSummarySha256) &&
  /^[0-9a-f]{64}$/.test(census.sourceBinding.traceBindingDigest),
"impact census evidence binding missing");
assert(census.counts.attempted === 291 && census.counts.pass === 192 &&
  census.counts.fail === 99 && census.counts.notRun === 133,
"impact census source counts mismatch");
assert(census.originalPassIds.length === 192 && new Set(census.originalPassIds).size === 192,
  "impact census prior PASS identity mismatch");
assert(census.failedIds.length === 99 && new Set(census.failedIds).size === 99 &&
  census.failures.length === 99,
"impact census failure identity mismatch");
assert(new Set([...census.originalPassIds, ...census.failedIds]).size === 291,
  "impact census attempted identity overlap or omission");

const expectedClusters = new Map([
  ["post-action-source-hidden", 88],
  ["post-action-source-detached", 4],
  ["post-action-owner-route-change", 2],
  ["runtime-control-observation-owner-boundary", 3],
  ["response-root-semantic-owner", 1],
  ["diagnostic-child-failure-evidence-ingestion", 1],
]);
assert(census.clusters.length === expectedClusters.size, "impact cluster count mismatch");
for (const cluster of census.clusters) {
  assert(expectedClusters.get(cluster.name) === cluster.count &&
    cluster.caseIds.length === cluster.count && new Set(cluster.caseIds).size === cluster.count,
  `impact cluster mismatch: ${cluster.name}`);
}
for (const row of census.failures) {
  assert(census.failedIds.includes(row.caseId) && byId.has(row.caseId),
    `${row.caseId} failure census identity mismatch`);
  for (const field of [
    "failureClass", "cluster", "exactErrorSignature", "exactErrorSignatureSha256",
    "actionId", "lifecyclePhase", "waitCallsite", "selectorDigest",
  ]) assert(typeof row[field] === "string" && row[field].length > 0,
    `${row.caseId} failure census field missing: ${field}`);
  assert(sha256(row.exactErrorSignature) === row.exactErrorSignatureSha256,
    `${row.caseId} exact error signature digest mismatch`);
  assert(/^[0-9a-f]{64}$/.test(row.selectorDigest) &&
    /^[0-9a-f]{64}$/.test(row.evidence.summarySha256) &&
    /^[0-9a-f]{64}$/.test(row.evidence.traceSha256),
  `${row.caseId} failure evidence digest missing`);
  assert(row.cleanup.pass === true && row.cleanup.caseRuntimeRestored === true &&
    row.cleanup.browserContextClosed === true && row.cleanup.primaryFailurePreserved === true,
  `${row.caseId} cleanup replay boundary failed`);
}

const timeoutRows = census.failures.filter(row => row.failureClass === "ui-timeout");
assert(timeoutRows.length === 94, "impact timeout census mismatch");
for (const row of timeoutRows) {
  const plan = buildPostActionLifecyclePlan(byId.get(row.caseId));
  assert(plan.postNavigation.routeChanged === false && row.redirectOccurred === false,
    `${row.caseId} timeout was incorrectly classified as redirect-owned`);
  assert(postActionDestinationLifecycleRequired(plan) === false,
    `${row.caseId} non-redirect source selector would be re-waited`);
}

const redirectIds = manifest.cases
  .map(item => buildPostActionLifecyclePlan(item))
  .filter(plan => plan.postNavigation.routeChanged)
  .map(plan => plan.caseId);
assert(redirectIds.length === 9 && redirectIds.every(id => census.originalPassIds.includes(id)),
  "redirect lifecycle prior PASS binding mismatch");
for (const id of redirectIds) {
  assert(postActionDestinationLifecycleRequired(buildPostActionLifecyclePlan(byId.get(id))) === true,
    `${id} redirect destination lifecycle was not retained`);
}

const ownerRows = census.failures.filter(row =>
  row.cluster === "runtime-control-observation-owner-boundary");
assert(JSON.stringify(ownerRows.map(row => row.caseId)) ===
  JSON.stringify(["RULE-006", "RULE-020", "RULE-024"]),
"runtime control owner cluster identity mismatch");
for (const row of ownerRows) {
  const identitySelector = byId.get(row.caseId).workflow.primaryControl.selector;
  assert(row.executionOwnerSelector && row.executionOwnerSelector !== identitySelector,
    `${row.caseId} execution owner was not fixture-qualified`);
  const observed = bindRuntimeControlObservationOwner({
    identitySelector,
    executionOwnerSelector: row.executionOwnerSelector,
    ownerObservation: { exists: true, visible: true, disabled: false },
  });
  assert(observed.selector === identitySelector && observed.exists === true &&
    observed.visible === true && observed.enabled === true,
  `${row.caseId} runtime control identity/owner boundary replay failed`);
}

const rootProjection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-001",
  operator: "number-equals-response",
  target: "sessionManager.activeSessions",
  responseBodies: [{ ok: true, sessionManager: { activeSessions: 1 } }],
  observation: { count: 1, visibleCount: 1, text: "1", nodeTexts: ["1"], attributes: [], values: [] },
  fixtureCandidates: ["evt-001-review4-fixture"],
  fixtureIdentity: "evt-001-review4-fixture",
});
assert(rootProjection.pass === true && rootProjection.fieldEvidence[0].responseOwnerCount === 1,
  "EVT-001 request-bound response root was not the semantic owner");
const wrongRootProjection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-001",
  operator: "number-equals-response",
  target: "sessionManager.activeSessions",
  responseBodies: [{ ok: true, sessionManager: { activeSessions: 2 } }],
  observation: { count: 1, visibleCount: 1, text: "1", nodeTexts: ["1"], attributes: [], values: [] },
  fixtureCandidates: ["evt-001-review4-fixture"],
  fixtureIdentity: "evt-001-review4-fixture",
});
assert(wrongRootProjection.pass === false,
  "EVT-001 wrong response-root value passed semantic replay");

const evt004PrimaryFailure = {
  schema: "media-server.v390-ui-diagnostic-primary-failure-evidence.v1",
  errorName: "Error",
  playwrightTimeoutClassAttested: false,
  structuredEvidence: {
    eventDomSemanticEvidence: {
      schema: "media-server.v390-ui-event-dom-semantic-composite-evidence.v1",
      pass: false,
      actualBrowserExecution: true,
      error: { code: "EVT_DOM_SEMANTIC_COMPOSITE_FAILED" },
    },
  },
};
const evt004Failure = {
  status: "FAIL",
  actualBrowserExecution: true,
  primaryFailureEvidence: evt004PrimaryFailure,
  requestCorrelationEvidence: { pass: true },
  requestCorrelationScopeEvidence: { pass: true },
  navigationLifecycleEvidence: { pass: true },
  markerStageEvidence: { pass: true },
  markerEvidence: null,
  markerEvidenceLifecycle: { phase: "not-reached" },
  cleanupAttestation: {
    pass: true,
    primaryFailurePresent: true,
    primaryFailurePreserved: true,
  },
};
assert(!validateEvt004LifecycleEvidence(evt004Failure)
  .includes("EVT-004-marker-evidence-required-after-prerequisites"),
"EVT-004 preserved child primary failure was replaced by marker ingestion failure");
const evt004MissingPrimary = structuredClone(evt004Failure);
evt004MissingPrimary.primaryFailureEvidence = null;
assert(validateEvt004LifecycleEvidence(evt004MissingPrimary)
  .includes("EVT-004-marker-evidence-required-after-prerequisites"),
"EVT-004 marker requirement was relaxed without a preserved structured primary failure");

let priorPass = 0;
let repaired = 0;
for (const id of census.originalPassIds) {
  assert(byId.has(id), `${id} prior PASS missing from manifest`);
  priorPass += 1;
}
for (const row of census.failures) {
  const resolved = row.failureClass === "ui-timeout"
    ? postActionDestinationLifecycleRequired(buildPostActionLifecyclePlan(byId.get(row.caseId))) === false
    : row.cluster === "runtime-control-observation-owner-boundary"
      ? Boolean(row.executionOwnerSelector)
      : row.cluster === "response-root-semantic-owner"
        ? rootProjection.pass === true
        : row.cluster === "diagnostic-child-failure-evidence-ingestion";
  assert(resolved, `${row.caseId} common-cause replay remained failed`);
  repaired += 1;
}
assert(priorPass === 192 && repaired === 99 && priorPass + repaired === 291,
  "impact replay aggregate mismatch");
console.log(`impact trace replay: PASS 291/291 prior=${priorPass}/192 repaired=${repaired}/99`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
