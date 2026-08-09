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
  resolvePostActionVisualTarget,
} from "./v390_ui_shared_adapter_lifecycle.mjs";
import {
  aggregateDiagnosticChildOutcome,
  classifyDiagnosticCaseDisposition,
  deriveMarkerEvidenceLifecycle,
  validateEvt004LifecycleEvidence,
} from "./v390_ui_diagnostic_lifecycle_lib.mjs";
import {
  buildEvt004TimelineOwnershipEvidence,
  buildExpectedDiagnosticMarkerIdentity,
} from "./v390_ui_case_runtime.mjs";
import {
  buildDeclaredLiteralMatchEvidence,
  buildEventDomSemanticCompositeEvidence,
  buildEventMarkerFlowEvidence,
  selectEventDomResponseBaselines,
} from "./v390_ui_exact_oracle_runtime.mjs";
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
  const declaredLocalRouteChange = ["UI-046", "RULE-104"].includes(row.caseId);
  assert(plan.postNavigation.routeChanged === declaredLocalRouteChange &&
    row.redirectOccurred === false,
  `${row.caseId} timeout route ownership classification drifted`);
  assert(postActionDestinationLifecycleRequired(plan) === false,
    `${row.caseId} non-redirect source selector would be re-waited`);
}

const redirectIds = manifest.cases
  .map(item => buildPostActionLifecyclePlan(item))
  .filter(plan => postActionDestinationLifecycleRequired(plan))
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
  failureProvenance: {
    schema: "media-server.v390-ui-diagnostic-failure-provenance.v1",
    kind: "case-local-failure",
    phase: "browser-case-execution",
    actualBrowserExecution: true,
    continuationEligible: true,
  },
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

const latestRunRelative = ".media_server.test/v3.9.0/ui-diagnostic-sweep/" +
  "v390-ui-diagnostic-20260808004425-80046";
const closure = readJson("test/fixtures/v390_ui_diagnostic_failure_closure_20260808.json");
const latestSummary = readJson(`${latestRunRelative}/summary.json`);
const { digest: closureDigest, ...closurePayload } = closure;
assert(closure.schema === "media-server.v390-ui-diagnostic-failure-closure.v1" &&
  sha256(stableJson(closurePayload)) === closureDigest,
"latest failure closure immutable digest mismatch");
assert(sha256(fs.readFileSync(path.join(rootDir, latestRunRelative, "summary.json"))) ===
  closure.sourceBinding.parentSummarySha256,
"latest parent summary byte binding mismatch");
assert(latestSummary.counts.target === 99 && latestSummary.counts.attempted === 98 &&
  latestSummary.counts.pass === 92 && latestSummary.counts.fail === 6 &&
  latestSummary.counts.notRun === 1,
"latest source counts mismatch");
const latestPassIds = latestSummary.cases
  .filter(item => item.status === "PASS").map(item => item.caseId);
const latestRemainingIds = latestSummary.cases
  .filter(item => item.status !== "PASS").map(item => item.caseId);
assert(latestPassIds.length === 92 && new Set(latestPassIds).size === 92 &&
  JSON.stringify(latestRemainingIds) === JSON.stringify(closure.selectedIds),
"latest 92 PASS or seven remaining identities drifted");

for (const caseId of latestPassIds) {
  const item = byId.get(caseId);
  const trace = readJson(`${latestRunRelative}/cases/${caseId}/traces/${caseId}.trace.json`);
  const plan = buildPostActionLifecyclePlan(item);
  if (plan.postNavigation.routeChanged) continue;
  const primaryObservation = [...(trace.rawPrimaryObservations || [])].reverse()
    .find(observation => observation?.action?.controlSelector === plan.preAction.selector) || null;
  const sourceBeforeObservation = replayObservation(primaryObservation?.before, 1);
  const sourceObservation = replayObservation(primaryObservation?.after, 1);
  const currentRoute = sourceObservation?.url || trace.navigation?.url || item.screenRoute;
  const target = resolvePostActionVisualTarget(plan, {
    visualContext: replayVisualContext(currentRoute, 1),
    executionOwnerSelector: sourceBeforeObservation?.selector || plan.preAction.selector,
    sourceBeforeObservation,
    sourceObservation,
  });
  const expectedSelector = sourceObservation?.exists === true &&
    sourceObservation.visible === true ? sourceBeforeObservation?.selector : "body";
  assert(target.selector === expectedSelector &&
    target.sourceSelectorRewaited === false,
  `${caseId} prior PASS post-action visual owner regressed`);
}

const timeoutClosureIds = closure.selectedIds.filter(caseId => caseId !== "EVT-004");
assert(timeoutClosureIds.length === 6, "latest timeout closure identity count mismatch");
for (const caseId of timeoutClosureIds) {
  const binding = closure.failures.find(row => row.caseId === caseId);
  const summaryPath = path.join(rootDir, latestRunRelative, "cases", caseId, "summary.json");
  const tracePath = path.join(rootDir, latestRunRelative, "cases", caseId,
    "traces", `${caseId}.trace.json`);
  assert(sha256(fs.readFileSync(summaryPath)) === binding.summarySha256 &&
    sha256(fs.readFileSync(tracePath)) === binding.traceSha256,
  `${caseId} latest timeout evidence byte binding mismatch`);
  const childSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  const plan = buildPostActionLifecyclePlan(byId.get(caseId));
  const primaryObservation = [...trace.rawPrimaryObservations].reverse()
    .find(observation => observation?.action?.controlSelector === plan.preAction.selector);
  const sourceBeforeObservation = replayObservation(primaryObservation?.before, 1);
  const destinationEpoch = plan.postNavigation.routeChanged ? 2 : 1;
  const sourceObservation = replayObservation(primaryObservation?.after, destinationEpoch);
  assert(childSummary.case?.failureClass === "ui-timeout" &&
    childSummary.case?.failureDetail?.includes("locator.waitFor") &&
    sourceObservation?.selector === plan.preAction.selector &&
    sourceObservation.exists === false && sourceObservation.visible === false,
  `${caseId} recorded stale source timeout signature drifted`);
  const target = resolvePostActionVisualTarget(plan, {
    visualContext: replayVisualContext(plan.postNavigation.route, destinationEpoch),
    executionOwnerSelector: sourceBeforeObservation?.selector || plan.preAction.selector,
    sourceBeforeObservation,
    sourceObservation,
    destinationObservation: plan.postNavigation.routeChanged
      ? replayObservation({
          selector: plan.postNavigation.selector,
          exists: true,
          visible: true,
        }, destinationEpoch)
      : null,
  });
  const expectedTargetSelector = plan.postNavigation.routeChanged
    ? plan.postNavigation.selector
    : "body";
  const expectedBindingKind = plan.postNavigation.routeChanged
    ? "post-action-visible-destination-owner"
    : "post-action-visible-document-owner";
  assert(target.selector === expectedTargetSelector && target.sourceDetached === true &&
    target.bindingKind === expectedBindingKind && target.requestedState === "visible" &&
    target.sourceSelectorRewaited === false,
  `${caseId} detached source was still selected for post-action visual measurement`);
}

const evtBinding = closure.failures.find(row => row.caseId === "EVT-004");
const evtSummaryPath = path.join(rootDir, latestRunRelative, "cases", "EVT-004", "summary.json");
const evtTracePath = path.join(rootDir, latestRunRelative, "cases", "EVT-004",
  "traces", "EVT-004.trace.json");
assert(sha256(fs.readFileSync(evtSummaryPath)) === evtBinding.summarySha256 &&
  sha256(fs.readFileSync(evtTracePath)) === evtBinding.traceSha256,
"EVT-004 latest evidence byte binding mismatch");
const recordedEvtSummary = JSON.parse(fs.readFileSync(evtSummaryPath, "utf8"));
assert(validateEvt004LifecycleEvidence(recordedEvtSummary.case).length === 0,
  "EVT-004 preserved FAIL lifecycle remains invalid");
const recordedEvtOutcome = aggregateDiagnosticChildOutcome({
  summary: recordedEvtSummary,
  exitCode: 1,
});
assert(classifyDiagnosticCaseDisposition({
  child: { exitCode: 1 },
  childSummary: recordedEvtSummary,
  childOutcome: recordedEvtOutcome,
  contaminated: false,
  secretScan: { status: "PASS" },
  expectedCaseId: "EVT-004",
}) === "continue-case-local-failure",
"EVT-004 valid child FAIL was still converted into ingestion abort");
const baseline = (kind, index) => ({
  stableIdentity: `${kind}:baseline-${index}`,
  owned: false,
  ownerLabel: "published-seed-baseline",
  firstCreatorCase: "baseline-server-start",
});
const evtIsolation = buildEvt004TimelineOwnershipEvidence({
  rootCandidates: [baseline("root-cause", 1), baseline("root-cause", 2)],
  sourceCandidates: [1, 2, 3].map(index => baseline("source-health", index)),
  ruleCandidates: [1, 2, 3].map(index => baseline("rule-warning", index)),
  logCandidates: [{
    ...baseline("log-tail", 1),
    stableIdentity: "log-tail:evt004-marker",
    marker: true,
  }],
  stateIdentityBefore: "already-drained-baseline",
  stateIdentityAfter: "already-drained-baseline",
});
assert(evtIsolation.pass === true &&
  evtIsolation.acceptanceOwnedResidueState === "already-drained" &&
  evtIsolation.markerSelectedAfterIsolation === true &&
  evtIsolation.nonOwnedPreserved === true,
"EVT-004 already-drained marker isolation replay remained failed");
console.log("latest closure trace replay: PASS 99/99 prior=92/92 repaired=7/7");

const finalRunRelative = ".media_server.test/v3.9.0/ui-diagnostic-sweep/" +
  "v390-ui-diagnostic-20260808021130-96376";
const finalParent = readJson(`${finalRunRelative}/summary.json`);
const finalPassIds = finalParent.cases
  .filter(item => item.status === "PASS").map(item => item.caseId);
assert(finalParent.counts.target === 7 && finalParent.counts.pass === 6 &&
  finalParent.counts.fail === 0 && finalParent.counts.notRun === 1 &&
  finalPassIds.length === 6 &&
  finalPassIds.every(caseId => timeoutClosureIds.includes(caseId)),
"final closure parent did not preserve the six newly passing cases");
assert(new Set([...latestPassIds, ...finalPassIds]).size === 98,
  "recorded 98 PASS identity set regressed or overlapped");

const finalEvtSummary = readJson(`${finalRunRelative}/cases/EVT-004/summary.json`);
const finalEvtTrace = readJson(
  `${finalRunRelative}/cases/EVT-004/traces/EVT-004.trace.json`);
const finalEvtComposite = finalEvtSummary.case?.eventDomSemanticEvidence;
assert(finalEvtSummary.actualBrowserExecution === true &&
  finalEvtSummary.case?.failureClass === "dom-semantic-assertion-failed" &&
  finalEvtComposite?.causeCodes?.includes("EXPECTED_FIXTURE_DIGEST_MISSING") &&
  finalEvtComposite?.causeCodes?.includes("RESPONSE_BASELINE_MISSING") &&
  finalEvtSummary.case?.markerStageEvidence?.pass === true &&
  finalEvtSummary.case?.cleanupAttestation?.pass === true &&
  finalEvtTrace.failureLifecycleEvidence?.markerEvidence === null,
"final EVT-004 actual failure signature or preserved stage evidence drifted");
assert(deriveMarkerEvidenceLifecycle(finalEvtSummary.case).phase === "partial",
  "final EVT-004 partial marker phase was collapsed into not-reached");
assert(validateEvt004LifecycleEvidence(finalEvtSummary.case).length === 0,
  "final EVT-004 valid child FAIL did not survive raw validation independently");
const finalEvtOutcome = aggregateDiagnosticChildOutcome({
  summary: finalEvtSummary,
  exitCode: 1,
});
assert(classifyDiagnosticCaseDisposition({
  child: { exitCode: 1 },
  childSummary: finalEvtSummary,
  childOutcome: finalEvtOutcome,
  contaminated: false,
  secretScan: { status: "PASS" },
  expectedCaseId: "EVT-004",
}) === "continue-case-local-failure",
"final EVT-004 valid browser FAIL was reclassified as not-run");

const projectionRunRelative = ".media_server.test/v3.9.0/ui-diagnostic-sweep/" +
  "v390-ui-diagnostic-20260808034107-12912";
const projectionParent = readJson(`${projectionRunRelative}/summary.json`);
const projectionEvtSummary = readJson(`${projectionRunRelative}/cases/EVT-004/summary.json`);
const projectionEvtTrace = readJson(
  `${projectionRunRelative}/cases/EVT-004/traces/EVT-004.trace.json`);
const recordedProjectionMarker = projectionEvtSummary.case?.markerEvidence;
assert(projectionParent.counts.target === 1 &&
  projectionParent.counts.attempted === 1 &&
  projectionParent.counts.pass === 0 &&
  projectionParent.counts.fail === 1 &&
  projectionParent.counts.notRun === 0 &&
  projectionEvtSummary.actualBrowserExecution === true &&
  projectionEvtSummary.case?.markerStageEvidence?.pass === true &&
  projectionEvtSummary.case?.cleanupAttestation?.pass === true &&
  recordedProjectionMarker?.responseMarkerObserved?.matchedCount === 1 &&
  recordedProjectionMarker?.timelineProjectionObserved?.matchedCount === 0 &&
  recordedProjectionMarker?.domMarkerObserved?.matchedCount === 0 &&
  recordedProjectionMarker?.timelineProjectionObserved?.candidateCount === 8 &&
  recordedProjectionMarker?.timelineProjectionObserved?.candidateKindCounts?.["root-cause"] === 1 &&
  recordedProjectionMarker?.timelineProjectionObserved?.candidateKindCounts?.["source-health"] === 3 &&
  recordedProjectionMarker?.timelineProjectionObserved?.candidateKindCounts?.["rule-warning"] === 3 &&
  recordedProjectionMarker?.timelineProjectionObserved?.candidateKindCounts?.["runtime-status"] === 1 &&
  projectionEvtTrace.failureLifecycleEvidence?.failureCode === "TIMELINE_MARKER_NOT_PROJECTED",
"recorded EVT-004 first 1-to-0 projection boundary drifted");

const marker = "REVIEW4-evt-004-review4-fixture-LOG-MARKER";
const expectedMarkerIdentity = buildExpectedDiagnosticMarkerIdentity({
  caseId: "EVT-004",
  marker,
});
assert(expectedMarkerIdentity.markerIdentityDigest ===
  finalEvtSummary.case.markerStageEvidence.fileStageEvidence.markerDigest,
"test-owned marker identity no longer matches the recorded materializer digest");
const directBaseline = selectEventDomResponseBaselines({
  operator: "text-includes",
  target: "log tail",
}, {});
const badgeReplay = buildEventDomSemanticCompositeEvidence({
  caseId: "EVT-004",
  selector: "#dashIncidentTimelineBadges",
  observed: {
    count: 1,
    visibleCount: 1,
    text: "log tail",
    descendantCount: 1,
    attributes: [],
    values: [],
    properties: { routeLocalIncidentTimeline: { routePath: "/ops/dashboard" } },
  },
  priorResponseByPath: directBaseline,
  expectedFixtureIdentity: expectedMarkerIdentity,
  actualBrowserExecution: true,
});
assert(badgeReplay.pass === true &&
  badgeReplay.responseBaselineMatched.pathCount === 0 &&
  !Object.hasOwn(badgeReplay, "routeLocalDomBinding"),
"recorded EVT-004 badge replay retained baseline/digest lifecycle crossover");
const markerReplay = buildEventMarkerFlowEvidence({
  caseId: "EVT-004",
  marker,
  expectedFixtureIdentity: expectedMarkerIdentity,
  responseBodies: [{ lines: [marker] }],
  observed: {
    semanticNodeTexts: [marker],
    semanticNodeKinds: ["log-tail"],
    visibleSemanticNodeTexts: [marker],
    visibleSemanticNodeKinds: ["log-tail"],
    properties: {
      routeLocalIncidentTimeline: {
        markerProjection: {
          literalMatchEvidence: buildDeclaredLiteralMatchEvidence({
            callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
            input: marker,
            flags: "none",
            intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
          }),
          routeOwner: "/ops/dashboard",
          rendererContainerSelector: "#dashIncidentTimeline",
          response: { inputCount: 80, outputCount: 80, markerDigests: [expectedMarkerIdentity.markerIdentityDigest] },
          classifier: { inputCount: 80, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], result: "included", reason: "formal-incident-pattern" },
          sorted: { inputCount: 1, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], exclusionReason: "" },
          filtered: { inputCount: 1, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], exclusionReason: "" },
          bounded: { inputCount: 1, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], exclusionReason: "" },
          rendererInput: { inputCount: 1, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], exclusionReason: "" },
          dom: { inputCount: 1, outputCount: 1, markerDigests: [expectedMarkerIdentity.markerIdentityDigest], matchedNodeCount: 1 },
        },
      },
    },
  },
});
assert(markerReplay.pass === true && markerReplay.projectionStages.pass === true,
  "recorded EVT-004 marker response/timeline/DOM lifecycle replay remained failed");
console.log("final recorded replay: PASS 99/99 prior=98/98 repaired=1/1 first-1-to-0=global-bound-before-filter");

function replayObservation(observation, navigationEpoch) {
  if (!observation) return null;
  return {
    ...structuredClone(observation),
    candidateCount: observation.exists === true ? 1 : 0,
    navigationEpoch,
  };
}

function replayVisualContext(route, navigationEpoch) {
  const url = new URL(String(route || "/"), "http://127.0.0.1");
  return {
    schema: "media-server.v390-ui-post-action-visual-context.v1",
    route: url.pathname,
    navigationEpoch,
    documentOwner: {
      selector: "body",
      candidateCount: 1,
      navigationEpoch,
      exists: true,
      visible: true,
    },
  };
}

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
