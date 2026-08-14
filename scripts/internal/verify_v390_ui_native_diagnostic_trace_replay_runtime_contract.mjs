// 파일 용도: 최신 actual diagnostic run의 12개 runtime/adapter 실패를 SHA 고정 evidence로 재생한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";

import * as exactRuntime from "./v390_ui_exact_oracle_runtime.mjs";
import * as completionRuntime from "./v390_ui_completion_oracle_lib.mjs";
import * as caseRuntime from "./v390_ui_case_runtime.mjs";
import { clientSafeExactOracleFor } from "./v390_ui_exact_client_safe_oracles.mjs";
import { eventExactOracleFor } from "./v390_ui_exact_event_oracles.mjs";
import {
  loadDiagnosticReplayCase,
  loadDiagnosticReplayRun,
} from "./v390_ui_diagnostic_replay_projection_loader.mjs";

const recordedRun = loadDiagnosticReplayRun("base-125");
const manifest = recordedRun.manifest;
const targetIds = [
  "EVT-041", "EVT-048", "EVT-070", "SAFE-038",
  "CLIENT-002", "CLIENT-005", "CLIENT-019", "CLIENT-021",
  "MEDIA-016", "MEDIA-017", "SAFE-016", "SAFE-017",
];
const expectedFailures = Object.freeze({
  "EVT-041": "memorySearch.hits[fixture-identity][mismatch]",
  "EVT-048": "contains-fixture-source sourceHealth",
  "EVT-070": "equals-request unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters",
  "SAFE-038": "equals-fixture $..candidateId",
  "CLIENT-002": "required-action-request-missing",
  "CLIENT-005": "semantic-readback-observation-mismatch",
  "CLIENT-019": "Cannot destructure property 'selector' of 'undefined'",
  "CLIENT-021": "exact response path missing",
  "MEDIA-016": "Cannot destructure property 'selector' of 'undefined'",
  "MEDIA-017": "Cannot destructure property 'selector' of 'undefined'",
  "SAFE-016": "NAVIGATION_LIFECYCLE_MISMATCH",
  "SAFE-017": "NAVIGATION_LIFECYCLE_MISMATCH",
});
const expectedArtifactSha256 = Object.freeze({
  "EVT-041": ["18416c357a92cc00904b4c6425849972396f92ef5edd11470542c72da75d9ca5", "69fb8041f62861266e4e67633d6f46c45e62422052f8789c61da3741c951bec5"],
  "EVT-048": ["3a4e28ab372b00b7f3167aacefa4dcfd040496b261e00949d6209542a20538fe", "55603769cf87faa05c3117c002ccd241622cbeeadd0878d0f6cda835fb9d88a3"],
  "EVT-070": ["223e28dd8283feb9f431609cbd5bea9546dcbd981c242734747a343eb3b2bdb6", "efa377ff98abc9ef4c96503fc8a64433cf6e30a58d44bd2753f1fd0929e021a6"],
  "SAFE-038": ["db8c8926e590ea250c37bf44eb3136971535357a0eba660d0af6f5c6dec5a86f", "f60d0af17c16b47b02808dd77e6dbd651422865c10456492e7948d34d0b2db2e"],
  "CLIENT-002": ["f2949f4b86d437cea35455fe5edd9d7d6756e4e1b7ff978d259a99c35457b80a", "fcde5b63f1cbe141e2063593fc494f33ba8c1941365f35c197d2ec57f0e99c61"],
  "CLIENT-005": ["f2d094b5dcb054cd1ff00aa440e22dee7afedf731f17c91a702be51ebd86d594", "5aadb2f078e46f4dcb7e17a204ddf06f6af5c4655c22705b4d34a3015d83a6a8"],
  "CLIENT-019": ["bb1f5d7fcba51c9f009d362aad1810017f909c0f2616226b1a3a76cb00a569d1", "3e6c8c2517a5eb24b11ae632f090e8198cb0e12096a2334c617135d1c95ed554"],
  "CLIENT-021": ["5d551c019279680a636f0ea0e3c9c456b52418fc5278c58c8a8d3002600b04e4", "cb5f3b57940cf4f133df69eeb051ca0185bc66c8edfd4152a521dd30d6010c78"],
  "MEDIA-016": ["2421f01e6ed53b67d296cab1df4bc5ab3bd71d4959747a288c96d29412aca784", "27e550e8318a534d2bf9a3d1a2b9f402b8c498fc524ed86ddcc311ce7ec3e155"],
  "MEDIA-017": ["bfe160a3a1b86648d4f2e962db5f22c7f1921c189a2c6df53adff526d4294ba8", "abdcb5d67b249f15b960c79dae8db6cf07a1c8dadae3fc152e994470d3febc1c"],
  "SAFE-016": ["89ef0eea9a268d2d214d43870ccba271d8708e39947620bd53a0a06fdcc8195e", "0812b7239f89f64c5fa8092c40e43645b161d81f9d383c8112db1243177c05fd"],
  "SAFE-017": ["1a6d31ea33e2b292c4604508edfbccd0558f3fb2c2d0bcc0b4e4f26cab274a0b", "2deae92dba62c67eb9542bf3d2d41e9fab5eab2aafa790bc7bb0f6a7d93fbf53"],
});

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function semanticValueDigest(value) {
  return sha256(stableSerialize({ present: value !== undefined, value }));
}

function reviewedFixtureId({ trace, manifestCase }) {
  const traceSeed = trace.setup.find(value => value.kind === "seed-reviewed-state");
  const manifestSeed = manifestCase.workflow.setup.find(value => value.kind === "seed-reviewed-state");
  assert(manifestSeed?.fixtureId, `${trace.caseId} source-bound manifest seed is missing`);
  if (traceSeed) {
    assert.equal(traceSeed.status, "PASS");
    assert.equal(traceSeed.fixtureId, manifestSeed.fixtureId);
  }
  return manifestSeed.fixtureId;
}

function assertRequestFailureOwner(summary, { method, path, operator }) {
  const failure = summary.case.requestSemanticAssertionEvidence;
  assert(failure && failure.pass === false && failure.actualPresent === true);
  assert.equal(failure.requestMethod, method);
  assert.equal(failure.assertionOperator, operator);
  assert.equal(failure.assertionPathDigest, sha256(path));
  assert.equal(failure.failureCode, "REQUEST_SEMANTIC_ASSERTION_MISMATCH");
  return failure;
}

const evidence = new Map(targetIds.map(caseId => {
  const record = loadDiagnosticReplayCase("base-125", caseId);
  const { summary, trace } = record;
  assert(summary && trace, `${caseId} tracked replay projection missing`);
  assert.equal(record.summarySha256, expectedArtifactSha256[caseId][0]);
  assert.equal(record.traceSha256, expectedArtifactSha256[caseId][1]);
  assert.equal(recordedRun.sourceCommit, "831e7b4867c53a4657f4fa0860d673a0ac41af54");
  assert.equal(summary.case?.caseId, caseId);
  assert.equal(summary.case?.status, "FAIL");
  assert.match(summary.case?.failureDetail || "", new RegExp(expectedFailures[caseId].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(summary.case?.diagnosticArtifacts?.trace?.sha256, record.traceSha256);
  assert.equal(trace.caseId, caseId);
  const manifestCase = manifest.cases.find(item => item.caseId === caseId);
  assert(manifestCase, `${caseId} actual diagnostic manifest case missing`);
  return [caseId, { summary, trace, manifestCase, summarySha256: record.summarySha256 }];
}));

const results = [];
async function check(caseId, fn) {
  try {
    await fn(evidence.get(caseId));
    results.push({ caseId, status: "PASS" });
  } catch (error) {
    results.push({ caseId, status: "FAIL", detail: String(error?.message || error) });
  }
}

for (const caseId of ["CLIENT-019", "MEDIA-016", "MEDIA-017"]) {
  await check(caseId, async ({ summary, trace, manifestCase }) => {
    assert.equal(trace.actions.length, 0, `${caseId} failed before action evidence was appended`);
    assert.equal(trace.rawPrimaryObservationCount, 0);
    const spec = clientSafeExactOracleFor(caseId);
    assert.equal(spec.route, trace.requested.route);
    assert.equal(spec.role, trace.requested.accountRole);
    assert.equal(spec.featureMeaning, manifestCase.workflow.exactRuntimeOracle.featureMeaning);
    assert.match(summary.case.failureDetail, /Cannot destructure property 'selector' of 'undefined'/);
    const minimumPlaying = spec.action.kind === "start-two-live-tiles" ? 2 : 1;
    let actualEvaluateCall = null;
    const fakeBrowser = {
      async evaluate(expression, argument) {
        actualEvaluateCall = { expression, argument: structuredClone(argument) };
        return {
          videoCount: argument.minimumPlaying,
          playingCount: argument.minimumPlaying,
          readyStates: Array.from({ length: argument.minimumPlaying }, () => 4),
        };
      },
    };
    const result = await exactRuntime.waitForPlayingMedia(
      fakeBrowser, caseId, spec.action.target, minimumPlaying,
    );
    assert.deepEqual(actualEvaluateCall.argument, {
      selector: spec.action.target,
      minimumPlaying,
    });
    assert.equal(String(actualEvaluateCall.expression),
      String(exactRuntime.mediaReadinessEvaluateExpression()));
    assert.equal(result.playingCount, minimumPlaying);
  });
}

for (const caseId of ["SAFE-016", "SAFE-017"]) {
  await check(caseId, ({ summary, manifestCase }) => {
    const failed = summary.case.navigationLifecycleEvidence;
    const action = manifestCase.workflow.controlSequence.find(value => value.kind === "navigate-negative");
    const result = completionRuntime.buildNavigationTrustEvidence({
      navigation: failed,
      expected: action.semanticCompletion.navigationBinding,
    });
    assert.equal(result.pass, true, result.failureCode);
  });
}

for (const caseId of ["CLIENT-002", "CLIENT-005"]) {
  await check(caseId, ({ summary, trace }) => {
    const action = trace.actions.find(value => value.kind === "activate-control");
    assert(action?.expectedLocalTransition, `${caseId} trace action transition is missing`);
    const composition = completionRuntime.clientLiveCompositionFromTransition(action.expectedLocalTransition);
    assert(composition?.createsSession === true && composition?.requiresAnswer === true);
    if (caseId === "CLIENT-002") {
      assert.equal(action.executedKind, "click");
      assert.equal(action.composedClientLive, undefined);
      assert.match(summary.case.failureDetail, /required-action-request-missing/);
      assert.equal(composition.kind, "start-live-tile");
      return;
    }
    assert.equal(action.executedKind, "composed-live-start-all-stop");
    assert.equal(composition.allStop, true);
    assert(action.composedClientLive?.sessionId && action.composedClientLive?.viewId);
    assert.equal(action.before.selector, action.selector);
    assert.equal(action.after.selector, action.selector);
    const boundary = completionRuntime.composedClientRuntimeBoundary({
      transition: action.expectedLocalTransition,
      composed: action.composedClientLive,
    });
    assert(boundary && boundary.requiredRequests.length === 3);
    assert.deepEqual(boundary.requiredRequests, action.expectedLocalTransition.requiredRequests);
    assert.deepEqual(boundary.postconditionSelectors,
      action.expectedLocalTransition.postconditions.map(value => value.selector));
    assert.equal(action.composedClientLive.transitionBeforeSnapshots, undefined,
      "actual failed trace unexpectedly contained the corrected intermediate snapshots");
    assert.match(summary.case.failureDetail, /semantic-readback-observation-mismatch/);
  });
}

await check("CLIENT-021", ({ summary, trace }) => {
  const action = trace.actions.find(value => value.kind === "activate-control");
  assert(action?.composedClientLive?.sessionId && action?.expectedLocalTransition);
  assert.equal(trace.rawPrimaryObservationCount, 0,
    "failed trace unexpectedly retained a primary request/response envelope");
  assert.equal(trace.completionEvents.length, 1);
  assert.equal(trace.completionEvents[0].completionPhase, "initial-navigation");
  assert(!JSON.stringify(action).includes('"requestId"'),
    "failed action unexpectedly retained request identity evidence");
  const boundary = completionRuntime.composedClientRuntimeBoundary({
    transition: action.expectedLocalTransition,
    composed: action.composedClientLive,
  });
  assert(boundary && boundary.networkRequestIdentityRequired === true);
  assert.equal(boundary.requestProjection.overlayMode, action.composedClientLive.overlayMode);
  assert.equal(boundary.responseIdentity.sessionId, action.composedClientLive.sessionId);
  assert.deepEqual(boundary.requiredRequests, action.expectedLocalTransition.requiredRequests);
  const createSessionRequest = boundary.requiredRequests.find(required =>
    required.method === "POST" && required.urlPath.endsWith("/webrtc/session"));
  assert(createSessionRequest, "CLIENT-021 source-bound session creation request is missing");
  assert.equal(createSessionRequest.urlPath,
    `/client/api/views/${action.composedClientLive.viewId}/webrtc/session`);
  const reconstructedRequestId = `${action.actionId}:${sha256(stableSerialize({
    urlPath: createSessionRequest.urlPath,
    overlayMode: boundary.requestProjection.overlayMode,
    sessionId: boundary.responseIdentity.sessionId,
  }))}`;
  const requestEntry = {
    phase: "request-start",
    requestId: reconstructedRequestId,
    method: createSessionRequest.method,
    urlPath: createSessionRequest.urlPath,
    requestBody: { overlayMode: boundary.requestProjection.overlayMode },
  };
  const responseEntry = {
    phase: "response",
    requestId: reconstructedRequestId,
    status: createSessionRequest.allowedStatuses[0],
    safeResponseBody: { sessionId: boundary.responseIdentity.sessionId },
  };
  const envelope = exactRuntime.correlatedMutationRequestResponseEnvelope({
    requestEntry,
    responseEntry,
  });
  assert.deepEqual(envelope.requestBody, {
    overlayMode: action.composedClientLive.overlayMode,
  });
  assert.deepEqual(envelope.responseBody, {
    sessionId: action.composedClientLive.sessionId,
  });
  assert.equal(envelope.sessionId, action.composedClientLive.sessionId);
  assert.throws(() => exactRuntime.correlatedMutationRequestResponseEnvelope({
    requestEntry,
    responseEntry: { ...responseEntry, requestId: `${reconstructedRequestId}:mismatch` },
  }), /not bound to one request identity/);
  assert.throws(() => exactRuntime.correlatedMutationRequestResponseEnvelope({
    requestEntry,
    responseEntry: undefined,
  }), /not bound to one request identity/);
  assert.match(summary.case.failureDetail,
    /POST \/client\/api\/views\/9001\/webrtc\/session: \$\.\.overlayMode/);
});

await check("EVT-041", ({ summary, trace, manifestCase }) => {
  assert.equal(trace.setup.length, 0, "EVT-041 failure no longer occurs during setup/materialization");
  assert.equal(trace.actions.length, 0);
  const fixtureId = reviewedFixtureId({ trace, manifestCase });
  const spec = eventExactOracleFor("EVT-041");
  assert.equal(spec.seed.kind, "searchable-event-review");
  const defaults = caseRuntime.canonicalEventRuntimeSeedBindings({ fixtureId });
  const binding = caseRuntime.incidentMemorySearchSeedBinding({
    seedKind: spec.seed.kind,
    fixtureId,
    sourceId: defaults.sourceId,
  });
  assert.equal(binding.query, fixtureId);
  assert.equal(binding.ruleId, defaults.ruleId);
  assert.equal(binding.incidentStatus, "new");
  assert.equal(binding.incidentId, `incident:${fixtureId}`);
  assert.match(summary.case.failureDetail, /memorySearch\.hits\[fixture-identity\]\[mismatch\]/);
});

await check("EVT-048", ({ summary, trace, manifestCase }) => {
  const fixtureId = reviewedFixtureId({ trace, manifestCase });
  assert.equal(fixtureId, "evt-048-review4-fixture");
  assert.equal(trace.actions.length, 0);
  assert.equal(trace.rawPrimaryObservationCount, 0,
    "EVT-048 trace unexpectedly retained raw source-health response material");
  const spec = eventExactOracleFor("EVT-048");
  const request = spec.requests.find(value => value.path === "/ops/api/source-health");
  const assertion = request.assertions.find(value => value.operator === "contains-fixture-source");
  assert.equal(assertion.path, "sourceHealth");
  const failure = assertRequestFailureOwner(summary, {
    method: request.method,
    path: assertion.path,
    operator: assertion.operator,
  });
  assert.equal(failure.baselinePresent, false);
  const plan = caseRuntime.sourceHealthFixtureMaterializationPlan(spec.seed.kind);
  assert.deepEqual(plan.authoritativeReadEndpoints, [
    "/ops/api/sources", "/ops/api/views", request.path,
  ]);
  assert.equal(plan.joinIdentity, "sourceId");
  assert.equal(plan.requiresEnabledSource, true);
  assert.equal(plan.requiresEnabledView, true);
  const defaults = caseRuntime.canonicalEventRuntimeSeedBindings({ fixtureId });
  const source = {
    sourceId: defaults.sourceId,
    canonicalSourceKey: fixtureId,
    enabled: plan.requiresEnabledSource,
  };
  const view = {
    viewId: `${fixtureId}-view`,
    sourceId: defaults.sourceId,
    enabled: plan.requiresEnabledView,
  };
  const health = {
    sourceId: defaults.sourceId,
    status: "degraded",
    reason: fixtureId,
  };
  const binding = caseRuntime.authoritativeSourceHealthFixtureBinding({
    sources: [source],
    views: [view],
    sourceHealth: [health],
    expectedSourceId: defaults.sourceId,
  });
  assert.deepEqual(binding, {
    sourceId: defaults.sourceId,
    streamId: fixtureId,
    viewId: view.viewId,
    status: health.status,
    reason: fixtureId,
  });
  assert.throws(() => caseRuntime.authoritativeSourceHealthFixtureBinding({
    sources: [source, { ...source }],
    views: [view],
    sourceHealth: [health],
    expectedSourceId: defaults.sourceId,
  }), /owner cardinality mismatch/);
  assert.throws(() => caseRuntime.authoritativeSourceHealthFixtureBinding({
    sources: [source],
    views: [view, { ...view, viewId: `${view.viewId}-duplicate` }],
    sourceHealth: [health],
    expectedSourceId: defaults.sourceId,
  }), /owner cardinality mismatch/);
  assert.throws(() => caseRuntime.authoritativeSourceHealthFixtureBinding({
    sources: [source],
    views: [view],
    sourceHealth: [health, { ...health }],
    expectedSourceId: defaults.sourceId,
  }), /owner cardinality mismatch/);
  assert.throws(() => caseRuntime.authoritativeSourceHealthFixtureBinding({
    sources: [source],
    views: [{ ...view, sourceId: `${defaults.sourceId}-wrong` }],
    sourceHealth: [health],
    expectedSourceId: defaults.sourceId,
  }), /owner cardinality mismatch/);
});

await check("EVT-070", ({ summary, trace, manifestCase }) => {
  const fixtureId = reviewedFixtureId({ trace, manifestCase });
  assert.equal(trace.rawPrimaryObservationCount, 0);
  const spec = eventExactOracleFor("EVT-070");
  const assertion = spec.requests[0].assertions.find(value => value.operator === "equals-request");
  const failure = assertRequestFailureOwner(summary, {
    method: spec.requests[0].method,
    path: assertion.path,
    operator: assertion.operator,
  });
  const requestMatch = summary.case.failureDetail.match(/failed GET ([^:]+): equals-request/);
  assert(requestMatch, "EVT-070 actual failed request URL is missing");
  const actual = caseRuntime.typedActiveResolutionFiltersFromUrl(requestMatch[1]);
  const defaults = caseRuntime.canonicalEventRuntimeSeedBindings({ fixtureId });
  assert.equal(actual.textQuery, defaults.q);
  assert.equal(actual.ruleId, defaults.ruleId);
  assert.equal(actual.sourceId, defaults.sourceId);
  assert.equal(actual.incidentStatus, defaults.incidentStatus);
  assert.equal(semanticValueDigest(actual), failure.actualDigest);
  assert.notEqual(failure.baselineDigest, failure.actualDigest);
});

await check("SAFE-038", ({ summary, trace, manifestCase }) => {
  const fixtureId = reviewedFixtureId({ trace, manifestCase });
  assert.equal(trace.rawPrimaryObservationCount, 0,
    "SAFE-038 trace unexpectedly retained raw candidate response material");
  const failure = assertRequestFailureOwner(summary, {
    method: "GET",
    path: "$..candidateId",
    operator: "equals-fixture",
  });
  const candidateId = caseRuntime.vlmRuleSuggestionCandidateId(fixtureId);
  assert.equal(candidateId, `${fixtureId}-candidate`);
  const candidateObservation = { ruleSuggestion: { candidateId } };
  assert.equal(caseRuntime.vlmRuleSuggestionDraftBinding(candidateObservation), candidateId);
  assert.equal(failure.expectedDigest, semanticValueDigest(fixtureId));
  assert.notEqual(semanticValueDigest(candidateId), failure.expectedDigest);
  const action = trace.actions.find(value => value.kind === "activate-control");
  assert.equal(action.selector, summary.case.observed.controlAction.selector);
  assert.equal(action.executedKind, "click");
});

const pass = results.filter(value => value.status === "PASS").length;
const fail = results.length - pass;
for (const result of results) console.log(`${result.status} ${result.caseId}${result.detail ? `: ${result.detail}` : ""}`);
console.log(`actual diagnostic runtime replay: ${pass} PASS / ${fail} FAIL / ${results.length} target`);
if (fail) process.exitCode = 1;
