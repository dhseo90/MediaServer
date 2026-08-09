#!/usr/bin/env node

// 파일 용도: 7f2eb532 actual batch의 최종 잔여 10건을 실제 trace와 공통 runtime 계약으로 replay한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditEventExactTemplateUsage,
  auditResponseDerivedDomProjectionContracts,
  evaluateEventExactResponseAssertion,
  evaluateResponseDerivedDomFieldProjection,
  responseDerivedDomProjectionContractFor,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  resolveEventDomAssertionForRuntime,
  selectEventDomResponseBaselines,
} from "./v390_ui_exact_oracle_runtime.mjs";
import {
  buildNavigationTrustEvidence,
  domSnapshotDigest,
  evaluateCompletionOracle,
} from "./v390_ui_completion_oracle_lib.mjs";
import { traceSafeWorkflowInputs } from "./v390_ui_native_exact_cases_lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runId = "v390-ui-diagnostic-20260806130704-74153";
const runRoot = path.join(root, ".media_server.test/v3.9.0/ui-diagnostic-sweep", runId);
const cases = Object.freeze([
  ["EVT-041", "32283c89d43eb755eff5cff8edb861cb6c1b7dba96848b3f3b966b074ec1dfbf", "69fb8041f62861266e4e67633d6f46c45e62422052f8789c61da3741c951bec5", "memorySearch.hits[0].sourceId[identity]"],
  ["EVT-046", "d580f44f551d070d014cede88206cb94741a2cd23e0266dfd28279e5492a3495", "2fe93db5cb6bf4ba4bd848f4f692db8991420addf1ba54a94ded7560ccd256d9", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-048", "7feba36566653b891e442902d7a9f47f15c049dac168bc97f02ddbd13b595b97", "fe8d3777506ea48a8a20531da389d85c8b5797d41e342ff81ad558fc6a40b71b", "contains-fixture-source sourceHealth"],
  ["EVT-051", "0b432cbc00f560998fb5d7ca40219fcbb17c9e0fcc21157749ab0ee0340cba41", "d47d4a1843564b96b25b3fd09dfa057db2d4de03a5877655a78eb2b184b58a29", "equals-seed-derivation incidentDecisionScorecard.scorecards[].priorityReasonChips"],
  ["EVT-064", "ef37468af754b1136d6e7656723d63b27e7816d395e73ace685858236e980179", "c95cd9cdb2138c67404ac12b8f5b682a106121ebd248e84bbcb20003045cf5ea", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-070", "81a3e0e193576bd7f8cd84e0a092dd07c0fe334be0ef3d68fcc5e7b7629ea31a", "b76a66061b6af3d22336c99c75ef3ab1eeb78874e8cca11dbb9d6bb49ad75e4e", "RENDERER_PROJECTION_VALUE_MISMATCH"],
  ["EVT-075", "c0b729cc5915f9f0e100bec78e34d4c03b5fa14558aaf5e1ba91cc46e3d4ce3f", "a34c854f57cb9deed5917bd131aab44cf8d95aea23cbe0c1c0ed8a6ddfae19ec", "request-correlation-missing"],
  ["CLIENT-019", "48445dd5106a7753643096db47d8c72858a386ac120f1bf3c4037b620b9bd2fd", "70f96fb908e022fb4e46044afe67dec49b7936f52f0a5048f07fdc0e89decc16", "boundingRectWithinViewport/equals"],
  ["SAFE-016", "469a97f1c73ca9dc8d428295d2d2e68baeda9493cfb090850922cef351452ba1", "9e5949dd8407e9c3d7403cbbd9bdeb2661ce305fab3292dd774d8c76bc8428ba", "NAVIGATION_LIFECYCLE_MISMATCH"],
  ["SAFE-017", "5b91063711edb602c101f85f7f02329241bc67a6aef6f55f0365ba2848604a81", "88734c6e95b1b60226b948c6488286e9804ac71fda765655188b4de55bbed53a", "NAVIGATION_LIFECYCLE_MISMATCH"],
]);

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readCase = ([caseId, summarySha, traceSha, failureSignature]) => {
  const caseRoot = path.join(runRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const summary = JSON.parse(summaryBytes);
  const tracePath = summary.case?.diagnosticArtifacts?.trace?.path;
  assert.equal(sha256(summaryBytes), summarySha, `${caseId} summary digest drift`);
  assert(tracePath, `${caseId} trace attestation missing`);
  const traceBytes = fs.readFileSync(path.join(caseRoot, tracePath));
  assert.equal(sha256(traceBytes), traceSha, `${caseId} trace digest drift`);
  const trace = JSON.parse(traceBytes);
  assert.equal(trace.caseId, caseId, `${caseId} trace identity drift`);
  assert.equal(summary.case?.status, "FAIL", `${caseId} actual RED status drift`);
  const failureText = `${summary.case?.failureDetail || ""}\n${JSON.stringify(summary.case?.eventDomSemanticEvidence || {})}`;
  assert(failureText.includes(failureSignature), `${caseId} actual failure signature drift`);
  return { summary, trace };
};

assert.equal(sha256(fs.readFileSync(path.join(runRoot, "summary.json"))),
  "ec1dde87b5c5e9179485d52b7a09d0133a69cd46ccbacab179300d151287486f");
const runSummary = JSON.parse(fs.readFileSync(path.join(runRoot, "summary.json")));
assert.deepEqual(runSummary.counts, { target: 125, attempted: 125, pass: 115, fail: 10, notRun: 0 });
assert.equal(runSummary.sourceBinding?.gitCommit, "7f2eb53286c0421fa5b9bf80ae9dda7657a59ac1");
const actual = new Map(cases.map(entry => [entry[0], readCase(entry)]));
const manifest = JSON.parse(fs.readFileSync(path.join(runRoot, "diagnostic-native-manifest.json")));
const source = name => fs.readFileSync(path.join(root, name), "utf8");
const evaluatorSource = source("scripts/internal/v390_ui_exact_event_oracle_evaluator.mjs");
const runtimeSource = source("scripts/internal/v390_ui_exact_oracle_runtime.mjs");
const caseRuntimeSource = source("scripts/internal/v390_ui_case_runtime.mjs");
const completionSource = source("scripts/internal/v390_ui_completion_oracle_lib.mjs");
const adapterSource = source("scripts/internal/v390_ui_native_adapter.mjs");
const runnerSource = source("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const rendererSource = source("src/ingress/product_ui_page_scripts.cpp");
const incidentSource = source("src/ingress/webrtc_http_server_ops_incidents.cpp");
const eventRecordImpactArtifactPath = path.join(
  root,
  "test/fixtures/v390_ui_event_record_owner_impact_20260809.json",
);
const eventRecordImpactArtifact = JSON.parse(fs.readFileSync(eventRecordImpactArtifactPath));
const currentAcceptanceRoot = path.join(
  root,
  ".media_server.test/v3.9.0/ui-acceptance-current/runs/v390-test-acceptance-20260808104018-55067/ui-exact-424",
);
const currentAcceptanceSummaryBytes = fs.readFileSync(path.join(currentAcceptanceRoot, "summary.json"));
const currentAcceptanceSummary = JSON.parse(currentAcceptanceSummaryBytes);
const currentEvt007TraceBytes = fs.readFileSync(path.join(currentAcceptanceRoot, "traces/EVT-007.trace.json"));
const optionalTemplateRunRoot = path.join(
  root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep/v390-ui-diagnostic-20260808184853-81792",
);
const optionalTemplateSummaryBytes = fs.readFileSync(path.join(optionalTemplateRunRoot, "summary.json"));
const optionalTemplateSummary = JSON.parse(optionalTemplateSummaryBytes);
assert.equal(sha256(optionalTemplateSummaryBytes),
  "66e75230648b2b635a1f75737e812a113d2d0e83679ed4bd9d20812a9d30ebc5",
  "optional/template actual parent summary digest drift");
assert.deepEqual(optionalTemplateSummary.counts,
  { target: 6, attempted: 6, pass: 4, fail: 2, notRun: 0, unsupported: 0 });
assert.deepEqual(optionalTemplateSummary.cases
  .filter(item => item.status === "PASS").map(item => item.caseId),
["EVT-023", "EVT-026", "EVT-048", "EVT-049"],
"EventRecord four-case actual PASS set drift");
const readOptionalTemplateFailure = (caseId, summarySha, traceSha, signature) => {
  const caseRoot = path.join(optionalTemplateRunRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${caseId}.trace.json`));
  assert.equal(sha256(summaryBytes), summarySha, `${caseId} optional/template summary digest drift`);
  assert.equal(sha256(traceBytes), traceSha, `${caseId} optional/template trace digest drift`);
  const summary = JSON.parse(summaryBytes);
  const trace = JSON.parse(traceBytes);
  assert.equal(summary.case?.status, "FAIL", `${caseId} optional/template actual RED status drift`);
  assert.equal(trace.caseId, caseId, `${caseId} optional/template trace identity drift`);
  assert(`${summary.case?.failureDetail || ""}\n${JSON.stringify(summary.case?.eventDomSemanticEvidence || {})}`
    .includes(signature), `${caseId} optional/template failure signature drift`);
  return { summary, trace };
};
const optionalTemplateActual = new Map([
  ["EVT-007", readOptionalTemplateFailure(
    "EVT-007",
    "6cdcd91f75cbe607ce635ad46db2c37fd03a9473c03c03113a97350a0fc1a472",
    "aedce87e229e2354ef4df35ec40a7e0938f79dfa032c16d930775742b7b41ce3",
    "RENDERER_PROJECTION_VALUE_MISMATCH",
  )],
  ["EVT-020", readOptionalTemplateFailure(
    "EVT-020",
    "a7e3602521b8ef7d3284d6dc3d16608c66fc43a14acfe4a5a60284be9c8bc53f",
    "57e9d8b8ae6582a8034c5c66aa75c560e7610ebb943a38396ece4a489428eef8",
    "RESPONSE_BASELINE_MISSING",
  )],
]);

const failures = [];
const closures = new Set();
const close = (ids, predicate, label) => {
  if (!predicate) {
    failures.push(`${ids.join("/")}: ${label}`);
    return;
  }
  ids.forEach(id => closures.add(id));
};

close(["EVT-041"],
  caseRuntimeSource.includes("incidentMemoryHitSourceId") &&
    runtimeSource.includes("bindings.incidentMemoryHitSourceId"),
  "memory search request source and projected hit source are not independently bound");

const evt046Contract = responseDerivedDomProjectionContractFor({
  caseId: "EVT-046", operator: "candidate-count-equals-response", target: "candidates.length",
});
const evt046Projection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-046", operator: "candidate-count-equals-response", target: "candidates.length",
  fixtureIdentity: "evt-046-review4-fixture", fixtureCandidates: ["evt-046-review4-fixture"],
  responseBodies: [{ memorySearch: { vlmSummaryCandidateReview: { sourceCandidateReport: {
    candidates: [{ eventId: "evt-046-review4-fixture" }],
  } } } }],
  observation: { count: 1, visibleCount: 1, semanticNodes: [{
    eventId: "evt-046-review4-fixture", attributes: { candidateCount: "1" }, fields: {},
  }] },
});
close(["EVT-046"], Boolean(evt046Contract) && evt046Projection.pass,
  "fixture-owned candidate collection cardinality is not projected by its exact DOM node");

const sourceAssertion = { operator: "contains-fixture-source", path: "sourceHealth", value: true };
const sourceContext = { fixtureId: "evt-048-review4-fixture", seedByPath: { sourceHealth: "9001" } };
const wrongSourceOwner = evaluateEventExactResponseAssertion({
  caseId: "EVT-048", assertion: sourceAssertion, responseJson: {},
  context: { ...sourceContext, rowLocalActualByPath: { sourceHealth: { reason: "source 9001 degraded" } } },
});
const exactSourceOwner = evaluateEventExactResponseAssertion({
  caseId: "EVT-048", assertion: sourceAssertion, responseJson: {},
  context: { ...sourceContext, rowLocalActualByPath: { sourceHealth: { sourceId: "9001", status: "degraded" } } },
});
close(["EVT-048"], !wrongSourceOwner.pass && exactSourceOwner.pass,
  "contains-fixture-source is not fail-closed on the authoritative sourceId field");

close(["EVT-051"],
  incidentSource.includes("operator-review-age:recent") &&
    !incidentSource.includes('"operator-review-age:" + std::to_string(operator_review_age_ms)'),
  "priority reason chips still derive a volatile millisecond label");

const evt064Contract = responseDerivedDomProjectionContractFor({
  caseId: "EVT-064", operator: "marker-order-equals-response", target: "timelineMarkers",
});
const evt064Projection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-064", operator: "marker-order-equals-response", target: "timelineMarkers",
  fixtureIdentity: "evt-064-review4-fixture", fixtureCandidates: ["evt-064-review4-fixture"],
  responseBodies: [{ unifiedResolutionWorkspace: { resolutionTimeline: [{
    eventId: "evt-064-review4-fixture", timelineMarkers: [{ key: "opened" }, { key: "reviewed" }],
  }] } }],
  observation: { count: 2, visibleCount: 2, semanticNodes: [
    { eventId: "evt-064-review4-fixture", attributes: {}, fields: { timelineMarkers: ["opened"] } },
    { eventId: "evt-064-review4-fixture", attributes: {}, fields: { timelineMarkers: ["reviewed"] } },
  ] },
});
close(["EVT-064"], Boolean(evt064Contract) && evt064Projection.pass,
  "timeline marker fragments are not exactly owned and ordered by one fixture row");

close(["EVT-070"],
  rendererSource.includes('data-event-semantic-field="activeFilters" data-event-semantic-value="${escapeHtml(String(value))}"'),
  "active filter renderer does not expose its authoritative value to semantic observation");

const { digest: eventRecordImpactDigest, ...eventRecordImpactPayload } = eventRecordImpactArtifact;
assert.equal(
  eventRecordImpactDigest,
  sha256(stableJson(eventRecordImpactPayload)),
  "EventRecord impact artifact immutable digest drift",
);
assert.equal(
  sha256(currentAcceptanceSummaryBytes),
  eventRecordImpactArtifact.sourceBinding.parentSummarySha256,
  "EventRecord impact parent summary digest drift",
);
assert.equal(
  sha256(currentEvt007TraceBytes),
  eventRecordImpactArtifact.sourceBinding.evt007TraceSha256,
  "EVT-007 actual trace digest drift",
);
assert.deepEqual(currentAcceptanceSummary.coverage, {
  ...currentAcceptanceSummary.coverage,
  attempted: 292,
  pass: 291,
  fail: 1,
  notRun: 132,
  unsupported: 0,
});
assert.equal(currentAcceptanceSummary.cases[290]?.testId, "EVT-004");
assert.equal(currentAcceptanceSummary.cases[290]?.rawOutcome, "completed");
assert.equal(currentAcceptanceSummary.cases[291]?.testId, "EVT-007");
const actualEvt007Projection = currentAcceptanceSummary.cases[291]
  ?.failureLifecycleEvidence?.primaryFailureEvidence?.structuredEvidence
  ?.eventDomSemanticEvidence?.responseDerivedDomProjection;
assert.equal(actualEvt007Projection?.failureCode, "RESPONSE_FIELD_OWNER_MISSING");
assert.deepEqual(
  actualEvt007Projection?.fieldEvidence?.map(field => field.responseOwnerCount),
  [2, 0, 2, 2],
  "EVT-007 actual RED owner counts drift",
);
assert.deepEqual(
  actualEvt007Projection?.fieldEvidence?.map(field => field.projectedValueCount),
  [2, 0, 2, 46],
  "EVT-007 actual RED projection counts drift",
);

const eventRecordFixtureId = "evt-007-review4-fixture";
const evt007Projection = evaluateResponseDerivedDomFieldProjection({
  caseId: "EVT-007",
  operator: "row-fields-equal-response",
  target: "eventId/ruleId/scenarioName/evidence",
  fixtureIdentity: eventRecordFixtureId,
  fixtureCandidates: [eventRecordFixtureId],
  responseBodies: [{
    records: {
      records: [
        {
          eventId: eventRecordFixtureId,
          scenarioName: "review4 fixture scenario",
          scenarioPhase: "review",
          snapshotPath: "/test-owned/evt-007-snapshot.jpg",
          clipPath: "/test-owned/evt-007-clip.mp4",
          metadata: {},
        },
        {
          eventId: `${eventRecordFixtureId}-state-1`,
          scenarioName: "archived scenario",
          snapshotPath: "/test-owned/unrelated.jpg",
          clipPath: "/test-owned/unrelated.mp4",
          metadata: { ruleId: "unrelated-rule" },
        },
      ],
    },
  }],
  observation: {
    count: 1,
    visibleCount: 1,
    semanticNodes: [{
      eventId: eventRecordFixtureId,
      attributes: {},
      fields: {
        scenarioName: ["review4 fixture scenario · review"],
        evidence: ["evt-007-snapshot.jpg", "evt-007-clip.mp4"],
      },
    }],
  },
});
close(["EVT-007"],
  responseDerivedDomProjectionContractFor({
    caseId: "EVT-007",
    operator: "row-fields-equal-response",
    target: "eventId/ruleId/scenarioName/evidence",
  })?.collectionPath === "records.records" && evt007Projection.pass &&
    optionalTemplateActual.get("EVT-007").summary.case?.actualBrowserExecution === true &&
    auditResponseDerivedDomProjectionContracts().optionalEmptyUseCount === 1 &&
    auditResponseDerivedDomProjectionContracts().implicitOptionalUseCount === 0,
  "EventRecord fields are not bound to one fixture-owned collection row and DOM owner");

const evt020FixtureId = "evt-020-review4-fixture";
const evt020Baseline = {
  schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
  identityKind: "event-record",
  collectionPath: "records.records",
  identityPaths: ["eventId"],
  identityValue: evt020FixtureId,
  projectionPaths: ["eventId", "snapshotPath", "clipPath"],
  expectedProjection: {
    eventId: evt020FixtureId,
    snapshotPath: "snapshots/evt-020.jpg",
    clipPath: "clips/evt-020.mp4",
  },
};
const evt020RuntimeContext = {
  templateValues: { fixtureId: evt020FixtureId },
  domResponseBaselineByTarget: { [evt020FixtureId]: evt020Baseline },
  rowLocalResponseTargets: [evt020FixtureId],
};
const evt020ResolvedAssertion = resolveEventDomAssertionForRuntime({
  caseId: "EVT-020",
  assertion: { operator: "contains-event-and-evidence", target: "{fixtureId}" },
  bindings: {},
  eventRuntimeContext: evt020RuntimeContext,
});
const evt020SelectedBaseline = selectEventDomResponseBaselines(
  evt020ResolvedAssertion,
  evt020RuntimeContext,
);
const templateAudit = auditEventExactTemplateUsage();
close(["EVT-020"],
  optionalTemplateActual.get("EVT-020").summary.case?.actualBrowserExecution === true &&
    evt020ResolvedAssertion.target === evt020FixtureId &&
    evt020SelectedBaseline[evt020FixtureId] === evt020Baseline &&
    templateAudit.canonicalCaseCount === 424 &&
    templateAudit.responseBaselineTemplateUseCount === 80 &&
    templateAudit.unresolvedTemplateCount === 0 &&
    templateAudit.unknownVariableCount === 0 &&
    templateAudit.recursiveSubstitutionCount === 0,
  "typed response/baseline target remained unresolved or selected a stale owner");

const fullSrc031Inputs = [{
  kind: "endpoint-action-fixture",
  actualValue: {
    method: "POST",
    path: "/ops/api/sources/onvif",
    body: { sourceUrl: "rtsp://viewer:credential@example.invalid/live", credentialRef: "secret-ref" },
    setup: { profileToken: "sensitive-profile" },
    readback: { sourceUrl: "rtsp://example.invalid/live" },
  },
}];
const src031TraceInputs = traceSafeWorkflowInputs(fullSrc031Inputs);
const src031TraceText = JSON.stringify(src031TraceInputs);
close(["SRC-031"],
  fullSrc031Inputs[0].actualValue.body.sourceUrl.startsWith("rtsp://") &&
    src031TraceInputs[0].actualValue.method === "POST" &&
    src031TraceInputs[0].actualValue.path === "/ops/api/sources/onvif" &&
    src031TraceInputs[0].actualValue.body.retention === "digest-only" &&
    /^[0-9a-f]{64}$/.test(src031TraceInputs[0].actualValue.body.sha256) &&
    !src031TraceText.includes("rtsp://") &&
    !src031TraceText.includes("credentialRef") &&
    !src031TraceText.includes("profileToken"),
  "endpoint fixture execution input is not retained as digest-only trace evidence");

const evt075Action = actual.get("EVT-075").trace.actions[0];
const evt075Observation = { actual: evt075Action.observed };
const evt075Completion = evaluateCompletionOracle({
  action: evt075Action,
  before: null,
  after: evt075Action.observed,
  networkResponses: [],
  semanticReadback: {
    schema: "media-server.v390-ui-semantic-readback.v2",
    identity: evt075Action.expectedReadbackIdentity,
    correlationId: evt075Action.correlationId,
    actionId: evt075Action.actionId,
    expectedBehaviorSha256: evt075Action.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: evt075Action.controlSelector,
    observation: evt075Observation,
    observationSha256: domSnapshotDigest(evt075Observation),
  },
});
const evt075Response = evt075Action.observed.exactRuntimeOracle.responses[0];
close(["EVT-075"], evt075Completion.pass &&
    evt075Response.requestCorrelationEvidence?.pass === true &&
    completionSource.includes("requestTarget(response.urlPath) === requestTarget(expected.urlPath)"),
  "query-bearing authoritative response is not bound to its actual 1/1 correlation evidence");

close(["CLIENT-019"],
  runtimeSource.includes("prepareExactViewportObservation") &&
    runtimeSource.includes("document.scrollingElement") &&
    runtimeSource.includes("block: 'center'") &&
    runtimeSource.includes("requestAnimationFrame(() => requestAnimationFrame(resolve))"),
  "viewport observation is not centered on the authoritative document scroller before strict measurement");

for (const caseId of ["SAFE-016", "SAFE-017"]) {
  const manifestCase = manifest.cases.find(item => item.caseId === caseId);
  const expected = manifestCase.actions.find(action => action.kind === "navigate-negative")
    .semanticCompletion.navigationBinding;
  const replay = buildNavigationTrustEvidence({
    navigation: actual.get(caseId).trace.navigation,
    expected,
  });
  close([caseId], replay.pass &&
      adapterSource.includes("lifecycleScope = \"operation\"") &&
      adapterSource.includes('lifecycleScope === "case" ? documentNavigationLedger') &&
      runnerSource.includes('lifecycleScope: Array.isArray(navigationBinding.caseLifecycleNavigationSequence) ? "case" : "operation"'),
    "negative target request and its exact two-document case lifecycle are not jointly bound");
}

assert(evaluatorSource.includes("RESPONSE_FIELD_OWNER_AMBIGUOUS") &&
  evaluatorSource.includes("DOM_PROJECTION_OWNER_AMBIGUOUS") &&
  evaluatorSource.includes("RENDERER_PROJECTION_VALUE_MISMATCH"),
"response/DOM fail-closed failure classes were removed");

if (failures.length > 0 || closures.size !== 13) {
  failures.forEach(failure => console.error(`RED ${failure}`));
  console.error(`v390 UI native diagnostic final trace replay: FAIL ${closures.size}/13`);
  process.exit(1);
}
console.log(`v390 UI native diagnostic final trace replay: PASS ${closures.size}/13`);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
