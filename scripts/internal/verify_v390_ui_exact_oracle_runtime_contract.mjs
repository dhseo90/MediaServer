#!/usr/bin/env node
// 파일 용도: exact 424 runtime oracle 실행기가 status/DOM/network 누락을 거짓 PASS로 처리하지 않는지 검증한다.

import {
  bindDashboardRuntimeTrendBaseline,
  assertExclusiveRequestScopedCorrelation,
  buildExclusiveRequestScopedCorrelationEvidence,
  buildEventDomSemanticCompositeEvidence,
  buildEventMarkerFlowEvidence,
  containsForbiddenResponseMaterial,
  containsForbiddenStructuredDomMaterial,
  dashboardRuntimeTrendSample,
  executeCatalogRuntimeOracle,
  executeCatalogRuntimeOracleAtSourceRoute,
  evaluateRuntimeStatusPseudoFieldAssertion,
  responsePseudoFieldValues,
  selectEventDomResponseBaselines,
  validateEventDomSemanticCompositeEvidence,
  validateRuntimeAttributeOwners,
  validateClientRuntimeFixtureBindings,
  waitForClientVaOverlayProjection,
} from "./v390_ui_exact_oracle_runtime.mjs";
import { usesEventExactRuntimeBindings } from "./v390_ui_case_runtime.mjs";
import {
  bindFixtureResponseToInitiatingRequest,
  captureEndpointOwnedResponseProjection,
  createCaseOwnedRequestIdentityRegistry,
} from "./v390_ui_native_adapter.mjs";

const checks = [];

await check("EVT-004 correlation is request-scoped to one authoritative log-tail fetch", async () => {
  const correlationId = "EVT-004:assert-product-state:completion";
  const path = "/ops/api/diagnostics/log-tail?limit=50";
  const request = {
    phase: "request-start",
    requestId: "evt-004-log-tail",
    caseRequestIdentity: "EVT-004:request-1",
    caseRequestSequence: 1,
    requestKind: "application-fetch",
    correlationId,
    correlationSource: "request-header",
    method: "GET",
    url: `http://runtime.invalid${path}`,
  };
  const exactEntries = [
    request,
    {
      ...request,
      phase: "response",
      status: 200,
      responseRequestObjectObserved: true,
      requestIdentitySource: "playwright-response-request",
      correlationSource: "request-header",
      responseCorrelationSource: "initiating-request-identity",
    },
  ];
  const evaluate = entries => assertExclusiveRequestScopedCorrelation({
    browser: { networkEntries: () => entries },
    item: { caseId: "EVT-004" },
    correlationId,
    actionId: "EVT-004:assert-product-state",
    networkStart: 0,
    method: "GET",
    urlPath: path,
  });
  const passed = evaluate(exactEntries);
  assert(passed.pass &&
    passed.logTailRequestCount === 1 &&
    passed.logTailResponseCount === 1 &&
    passed.correlationLeakRequestCount === 0 &&
    passed.correlationDigest &&
    !JSON.stringify(passed).includes(correlationId),
  "exact request-scoped log-tail correlation did not pass safely");
  const fixtureRegistry = createCaseOwnedRequestIdentityRegistry({
    caseId: "EVT-004",
    requestIdPrefix: "fixture-request",
  });
  const fixtureRequestHandle = {};
  const fixtureIdentity =
    fixtureRegistry.registerFixtureRequestHandle(fixtureRequestHandle);
  const fixtureResponseBinding = bindFixtureResponseToInitiatingRequest({
    initiatingRequestHandle: fixtureRequestHandle,
  }, fixtureRegistry);
  const fixtureEntries = [{
    ...request,
    ...fixtureIdentity,
  }, {
    ...request,
    ...fixtureResponseBinding.initiatingRequest,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    requestIdentitySource: "fixture-initiating-request-handle",
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
  }];
  const fixturePassed = evaluate(fixtureEntries);
  assert(fixturePassed.pass === true &&
    fixturePassed.orderedLedger[1]?.requestIdentitySource ===
      "fixture-initiating-request-handle",
  "fixture initiating request handle did not use the common identity matcher");
  for (const [label, initiatingRequestHandle] of [
    ["different fixture handle", {}],
    ["missing fixture handle", undefined],
  ]) {
    const binding = bindFixtureResponseToInitiatingRequest({
      initiatingRequestHandle,
    }, fixtureRegistry);
    await expectReject(() => Promise.resolve(evaluate([
      fixtureEntries[0],
      {
        ...fixtureEntries[1],
        requestId: binding.initiatingRequest?.requestId || "",
        caseRequestIdentity:
          binding.initiatingRequest?.caseRequestIdentity || "",
        caseRequestSequence:
          binding.initiatingRequest?.caseRequestSequence || null,
        responseRequestObjectObserved: Boolean(binding.initiatingRequest),
      },
    ])), "request-scoped correlation failed", label);
  }
  for (const [label, entries, code] of [
    ["document leak", [
      ...exactEntries,
      {
        ...request,
        requestId: "evt-004-document",
        requestKind: "document-navigation",
        url: "http://runtime.invalid/ops/events",
      },
    ], "CORRELATION_SCOPE_LEAK"],
    ["other API leak", [
      ...exactEntries,
      {
        ...request,
        requestId: "evt-004-other-api",
        url: "http://runtime.invalid/ops/api/events/status",
      },
    ], "CORRELATION_SCOPE_LEAK"],
    ["duplicate log-tail", [
      ...exactEntries,
      {
        ...request,
        requestId: "evt-004-log-tail-2",
        caseRequestIdentity: "EVT-004:request-2",
        caseRequestSequence: 2,
      },
      {
        ...request,
        phase: "response",
        requestId: "evt-004-log-tail-2",
        caseRequestIdentity: "EVT-004:request-2",
        caseRequestSequence: 2,
        status: 200,
        responseRequestObjectObserved: true,
        requestIdentitySource: "playwright-response-request",
        correlationSource: "request-header",
        responseCorrelationSource: "initiating-request-identity",
      },
    ], "AUTHORITATIVE_REQUEST_BINDING_MISMATCH"],
    ["other-case identity", [
      { ...request, caseRequestIdentity: "OTHER-CASE:request-1" },
      {
        ...exactEntries[1],
        caseRequestIdentity: "OTHER-CASE:request-1",
      },
    ], "REQUEST_CASE_OWNERSHIP_MISMATCH"],
  ]) {
    await expectReject(() => Promise.resolve(evaluate(entries)), code);
  }
  const fullLedger = buildExclusiveRequestScopedCorrelationEvidence({
    entries: [
      ...exactEntries,
      {
        ...request,
        requestId: "evt-004-other-api",
        caseRequestIdentity: "EVT-004:request-2",
        caseRequestSequence: 2,
        correlationId: "OTHER-CORRELATION",
        url: "http://runtime.invalid/ops/api/events/status",
      },
    ],
    correlationId,
    actionId: "EVT-004:assert-product-state",
    method: "GET",
    urlPath: path,
  });
  assert(fullLedger.pass === false &&
    fullLedger.orderedLedger.length === 3 &&
    fullLedger.orderedLedger.some(entry =>
      entry.path === "/ops/api/events/status" &&
      entry.caseRequestIdentity === "EVT-004:request-2"),
  "correlation scope failure did not preserve the full bounded request ledger");
  const redactedLedger = buildExclusiveRequestScopedCorrelationEvidence({
    entries: [
      ...exactEntries,
      {
        ...request,
        requestId: "safe-query-projection",
        caseRequestIdentity: "EVT-004:request-2",
        caseRequestSequence: 2,
        correlationId: "",
        correlationSource: "none",
        url: "http://runtime.invalid/cleanup?token=raw-secret&limit=1",
      },
    ],
    correlationId,
    actionId: "EVT-004:assert-product-state",
    method: "GET",
    urlPath: path,
  });
  assert(!JSON.stringify(redactedLedger).includes("raw-secret") &&
    redactedLedger.orderedLedger.some(entry =>
      entry.path.includes("token=%5BREDACTED%5D") &&
      entry.path.includes("limit=1")),
  "bounded correlation ledger retained a sensitive query value");
});

await check("EVT-004 marker flow binds one authoritative response row to one visible timeline node", async () => {
  const marker = "REVIEW4-evt-004-review4-fixture-LOG-MARKER";
  const matching = buildEventMarkerFlowEvidence({
    marker,
    responseBodies: [{ lines: [`[review4] auth incident ${marker} [redacted]`] }],
    observed: {
      semanticNodeTexts: [`로그 단서 ${marker} diagnostics log-tail`],
      visibleSemanticNodeTexts: [`로그 단서 ${marker} diagnostics log-tail`],
    },
  });
  assert(matching.pass && matching.responseMarkerObserved.matchedCount === 1 &&
    matching.timelineProjectionObserved.matchedCount === 1 &&
    matching.domMarkerObserved.matchedCount === 1,
  "exact response/timeline/DOM marker binding did not pass");

  const failureCases = [
    ["materialization", { marker: "", responseBodies: [], observed: {} },
      "FIXTURE_MARKER_NOT_MATERIALIZED"],
    ["response missing", { marker, responseBodies: [{ lines: ["auth unrelated"] }],
      observed: { semanticNodeTexts: [marker], visibleSemanticNodeTexts: [marker] } },
    "RESPONSE_MARKER_NOT_OBSERVED"],
    ["projection missing", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: [], visibleSemanticNodeTexts: [] } },
    "TIMELINE_MARKER_NOT_PROJECTED"],
    ["DOM missing", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: [marker], visibleSemanticNodeTexts: [] } },
    "DOM_MARKER_NOT_OBSERVED"],
    ["different marker", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: [`${marker}-other`], visibleSemanticNodeTexts: [`${marker}-other`] } },
    "TIMELINE_MARKER_NOT_PROJECTED"],
    ["partial marker", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: [marker.slice(0, -7)], visibleSemanticNodeTexts: [marker.slice(0, -7)] } },
    "TIMELINE_MARKER_NOT_PROJECTED"],
    ["duplicate response", { marker, responseBodies: [{ lines: [marker, marker] }],
      observed: { semanticNodeTexts: [marker], visibleSemanticNodeTexts: [marker] } },
    "RESPONSE_MARKER_DUPLICATE"],
    ["duplicate node", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: [marker, marker], visibleSemanticNodeTexts: [marker, marker] } },
    "TIMELINE_MARKER_DUPLICATE"],
    ["unrelated row", { marker, responseBodies: [{ lines: [marker] }],
      observed: { semanticNodeTexts: ["auth unrelated"], visibleSemanticNodeTexts: ["auth unrelated"] } },
    "TIMELINE_MARKER_NOT_PROJECTED"],
    ["distributed fragments", { marker, responseBodies: [{ lines: [marker] }],
      observed: {
        semanticNodeTexts: [marker.slice(0, 20), marker.slice(20)],
        visibleSemanticNodeTexts: [marker.slice(0, 20), marker.slice(20)],
      } },
    "TIMELINE_MARKER_NOT_PROJECTED"],
  ];
  for (const [label, input, failureCode] of failureCases) {
    const evidence = buildEventMarkerFlowEvidence(input);
    assert(!evidence.pass && evidence.failureCode === failureCode,
      `${label} marker boundary did not fail closed: ${evidence.failureCode}`);
  }
  const escaped = buildEventMarkerFlowEvidence({
    marker,
    responseBodies: [{ lines: [`auth (${marker})`] }],
    observed: {
      semanticNodeTexts: [`로그 단서 · ${marker}.`],
      visibleSemanticNodeTexts: [`로그 단서 · ${marker}.`],
    },
  });
  assert(escaped.pass, "allowed punctuation/localization around the exact marker did not pass");
  assert(!JSON.stringify(matching).includes("auth incident") &&
    !JSON.stringify(matching).includes("diagnostics log-tail"),
  "marker evidence exposed raw response or DOM text");
});

await check("EVT DOM semantic composite distinguishes safe failure evidence without raw values", async () => {
  const rawBaseline = "rtsp://baseline.invalid/live?token=raw-baseline-secret";
  const rawCandidate = "https://candidate.invalid/source?credential=raw-candidate-secret";
  const fixtureIdentity = "evt-003-credential-raw-fixture";
  const matchingResponse = [{ sourceHealth: [{ status: rawBaseline }] }];
  const matchingBaseline = { "sourceHealth[].status": rawBaseline };
  const visibleObservation = {
    count: 1,
    visibleCount: 1,
    text: `source health ${fixtureIdentity}`,
    attributes: [],
    values: [],
    descendantCount: 1,
  };

  const domMissing = buildEventDomSemanticCompositeEvidence({
    selector: "#dashHealthBadges",
    observed: { ...visibleObservation, count: 0, visibleCount: 0 },
    responseBodies: matchingResponse,
    priorResponseByPath: matchingBaseline,
    fixtureCandidates: [fixtureIdentity],
    fixtureRequired: true,
  });
  assertCompositeFailure(domMissing, "observationPresent");
  assert(domMissing.observationPresent.reasonCode === "DOM_OBSERVATION_MISSING",
    "DOM absence did not retain its structured reason code");

  const baselineMismatch = buildEventDomSemanticCompositeEvidence({
    selector: "#dashHealthBadges",
    observed: visibleObservation,
    responseBodies: [{ sourceHealth: [{ status: rawCandidate }] }],
    priorResponseByPath: matchingBaseline,
    fixtureCandidates: [fixtureIdentity],
    fixtureRequired: true,
  });
  assertCompositeFailure(baselineMismatch, "responseBaselineMatched");
  assert(baselineMismatch.responseBaselineMatched.mismatchPaths.join("|") === "sourceHealth[].status",
    "response baseline mismatch path evidence is missing");
  assert(baselineMismatch.responseBaselineMatched.reasonCodes.includes("RESPONSE_BASELINE_MISMATCH"),
    "response baseline mismatch did not retain its structured reason code");

  const fixtureMismatch = buildEventDomSemanticCompositeEvidence({
    selector: "#dashRootCauseList .root-cause-item",
    observed: { ...visibleObservation, text: "source health without fixture identity" },
    responseBodies: matchingResponse,
    priorResponseByPath: matchingBaseline,
    fixtureCandidates: [fixtureIdentity],
    fixtureRequired: true,
  });
  assertCompositeFailure(fixtureMismatch, "fixtureObserved");
  assert(fixtureMismatch.fixtureObserved.reasonCode === "DOM_FIXTURE_IDENTITY_NOT_OBSERVED",
    "DOM fixture identity absence did not retain its structured reason code");

  const fixtureBindingMissing = buildEventDomSemanticCompositeEvidence({
    selector: "#dashRootCauseList .root-cause-item",
    observed: visibleObservation,
    responseBodies: matchingResponse,
    priorResponseByPath: matchingBaseline,
    fixtureCandidates: [],
    fixtureRequired: true,
  });
  assertCompositeFailure(fixtureBindingMissing, "fixtureObserved");
  assert(fixtureBindingMissing.fixtureObserved.reasonCode === "FIXTURE_BINDING_MISSING" &&
    fixtureBindingMissing.fixtureObserved.candidateCount === 0 &&
    fixtureBindingMissing.fixtureObserved.matchedCandidateCount === 0,
  "missing fixture binding did not retain its distinct structured evidence");

  for (const evidence of [domMissing, baselineMismatch, fixtureMismatch, fixtureBindingMissing]) {
    const serialized = JSON.stringify(evidence);
    for (const raw of [rawBaseline, rawCandidate, fixtureIdentity]) {
      assert(!serialized.includes(raw), "composite evidence exposed raw material");
    }
    assert(!serialized.includes("raw-baseline-secret") &&
      !serialized.includes("raw-candidate-secret") &&
      !serialized.includes("credential-raw-fixture"),
    "composite error evidence exposed a raw secret, URL, or credential value");
    assertCompositeDigestsAreSha256(evidence);
  }
});

await check("EVT-003 source-health baseline is row-local to the acceptance-owned source", async () => {
  const sourceId = "39065003";
  const baseline = {
    schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
    collectionPath: "sourceHealth",
    identityPaths: ["sourceId", "id"],
    identityValue: sourceId,
    projectionPaths: ["status", "reason"],
    expectedProjection: {
      status: "offline",
      reason: "no-subscriber",
    },
  };
  const observed = {
    count: 1,
    visibleCount: 1,
    text: "source health offline",
    nodeTexts: ["source health offline"],
    attributes: [],
    values: [],
    descendantCount: 1,
  };
  const evidenceFor = sourceHealth => buildEventDomSemanticCompositeEvidence({
    selector: "#dashHealthBadges",
    observed,
    responseBodies: [{ sourceHealth }],
    priorResponseByPath: {
      "sourceHealth[].status": baseline,
    },
    fixtureCandidates: [sourceId],
    fixtureRequired: false,
  });
  const selected = selectEventDomResponseBaselines("sourceId/status/reason", {
    priorResponseByPath: {
      sourceHealth: [{ sourceId: "unrelated" }],
      "sourceHealth[].status": ["unrelated-status"],
    },
    domResponseBaselineByTarget: {
      "sourceId/status/reason": baseline,
    },
    rowLocalResponseTargets: ["sourceId/status/reason"],
  });
  assert(Object.keys(selected).join("|") === "sourceId/status/reason" &&
    selected["sourceId/status/reason"] === baseline,
  "EVT-003 DOM assertion did not select only its row-local target baseline");
  await expectReject(() => Promise.resolve(selectEventDomResponseBaselines(
    "sourceId/status/reason",
    {
      priorResponseByPath: { sourceHealth: [{ sourceId: "whole-array-fallback" }] },
      domResponseBaselineByTarget: {},
      rowLocalResponseTargets: ["sourceId/status/reason"],
    },
  )), "row-local response baseline is missing or invalid");

  const unrelatedDrift = evidenceFor([
    { sourceId, status: "offline", reason: "no-subscriber" },
    { sourceId: "9001", status: "online", reason: "unrelated-source-drifted" },
  ]);
  assert(unrelatedDrift.pass === true,
    "unrelated source-health drift invalidated the EVT-003 row-local baseline");
  const rowEvidence = unrelatedDrift.responseBaselineMatched.paths[0];
  assert(rowEvidence.bindingMode === "row-local-identity-projection" &&
    /^[0-9a-f]{64}$/.test(rowEvidence.identityDigest) &&
    /^[0-9a-f]{64}$/.test(rowEvidence.projectionPathsDigest),
  "EVT-003 row-local binding evidence is incomplete");

  const statusDrift = evidenceFor([
    { sourceId, status: "online", reason: "no-subscriber" },
  ]);
  assertCompositeFailure(statusDrift, "responseBaselineMatched");
  assert(statusDrift.responseBaselineMatched.paths[0].reasonCode ===
    "FIXTURE_ROW_PROJECTION_MISMATCH" &&
    statusDrift.responseBaselineMatched.paths[0].mismatchProjectionPaths.includes("status"),
  "fixture status mismatch did not retain its row-local structured reason");

  const reasonDrift = evidenceFor([
    { sourceId, status: "offline", reason: "unexpected-reason" },
  ]);
  assertCompositeFailure(reasonDrift, "responseBaselineMatched");
  assert(reasonDrift.responseBaselineMatched.paths[0].reasonCode ===
    "FIXTURE_ROW_PROJECTION_MISMATCH" &&
    reasonDrift.responseBaselineMatched.paths[0].mismatchProjectionPaths.includes("reason"),
  "fixture reason mismatch did not retain its row-local structured reason");

  const fixtureMissing = evidenceFor([
    { sourceId: "9001", status: "offline", reason: "no-subscriber" },
  ]);
  assertCompositeFailure(fixtureMissing, "responseBaselineMatched");
  assert(fixtureMissing.responseBaselineMatched.paths[0].compared === false,
    "missing EVT-003 source row was not distinguished from a compared projection");
  assert(fixtureMissing.responseBaselineMatched.paths[0].reasonCode ===
    "FIXTURE_SOURCE_ROW_MISSING",
  "missing EVT-003 source row did not retain its distinct structured reason");
  const fixtureDuplicate = evidenceFor([
    { sourceId, status: "offline", reason: "no-subscriber" },
    { sourceId, status: "offline", reason: "no-subscriber" },
  ]);
  assertCompositeFailure(fixtureDuplicate, "responseBaselineMatched");
  assert(fixtureDuplicate.responseBaselineMatched.paths[0].reasonCode ===
    "FIXTURE_SOURCE_ROW_DUPLICATE" &&
    fixtureDuplicate.responseBaselineMatched.paths[0].candidateCount === 2,
  "duplicate EVT-003 source rows did not fail closed");

  const serialized = JSON.stringify({
    unrelatedDrift,
    statusDrift,
    reasonDrift,
    fixtureMissing,
    fixtureDuplicate,
  });
  for (const raw of [
    sourceId,
    "no-subscriber",
    "unrelated-source-drifted",
    "unexpected-reason",
  ]) {
    assert(!serialized.includes(raw), "EVT-003 row-local evidence exposed a raw identity or value");
  }
});

await check("EVT-003 API row and DOM identity bind to the same degraded source", async () => {
  const sourceId = "39065003";
  const baseline = {
    schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
    collectionPath: "sourceHealth",
    identityPaths: ["sourceId", "id"],
    identityValue: sourceId,
    projectionPaths: ["status", "reason"],
    expectedProjection: { status: "offline", reason: "no-subscriber" },
  };
  const fixtureIdentity = {
    schema: "media-server.v390-ui-event-dom-fixture-identity.v1",
    sourceId,
    status: "offline",
    reason: "no-subscriber",
    expectedNodeTokens: [`#${sourceId}`, "오프라인", "구독 세션 없음"],
  };
  const observed = {
    count: 1,
    visibleCount: 1,
    text: `라이브 소스 상태 확인 필요 #${sourceId} 오프라인:구독 세션 없음`,
    nodeTexts: [`라이브 소스 상태 확인 필요 #${sourceId} 오프라인:구독 세션 없음`],
    attributes: [],
    values: [],
    descendantCount: 4,
  };
  const evidenceFor = ({ row = baseline.expectedProjection, identity = fixtureIdentity, dom = observed } = {}) =>
    buildEventDomSemanticCompositeEvidence({
      selector: "#dashRootCauseList .root-cause-item",
      observed: dom,
      responseBodies: [{ sourceHealth: [{ sourceId, ...row }] }],
      priorResponseByPath: { "sourceId/status/reason": baseline },
      fixtureCandidates: [sourceId],
      fixtureIdentity: identity,
      fixtureRequired: true,
      actualBrowserExecution: true,
    });

  const passing = evidenceFor();
  assert(passing.pass === true &&
    passing.fixtureObserved.bindingMode === "api-row-to-single-dom-node" &&
    passing.fixtureObserved.apiFixtureIdentityMatched === true &&
    passing.fixtureObserved.domCandidateCount === 1 &&
    passing.fixtureObserved.candidateCount === 3 &&
    passing.fixtureObserved.matchedCandidateCount === 3 &&
    passing.fixtureObserved.matchedNodeCount === 1 &&
    Object.values(passing.fixtureObserved.fieldMatches).every(field => field.pass),
  "EVT-003 API/DOM row-local identity did not pass with one exact DOM node");

  const englishPunctuation = evidenceFor({
    dom: {
      ...observed,
      text: `Live source status needs attention\n#${sourceId}   Offline :  No subscriber session.`,
      nodeTexts: [`Live source status needs attention\n#${sourceId}   Offline :  No subscriber session.`],
    },
  });
  assert(englishPunctuation.pass === true &&
    englishPunctuation.fixtureObserved.matchedNodeCount === 1,
  "allowed renderer language, punctuation, and whitespace did not preserve exact identity");

  const sourceIdMissing = evidenceFor({
    dom: { ...observed, text: "오프라인:구독 세션 없음", nodeTexts: ["오프라인:구독 세션 없음"] },
  });
  assertCompositeFailure(sourceIdMissing, "fixtureObserved");
  assert(sourceIdMissing.fixtureObserved.reasonCode === "DOM_FIXTURE_SOURCE_ID_NOT_OBSERVED",
    "missing EVT-003 sourceId did not fail distinctly");

  const statusMissing = evidenceFor({
    dom: { ...observed, text: `#${sourceId} 구독 세션 없음`, nodeTexts: [`#${sourceId} 구독 세션 없음`] },
  });
  assertCompositeFailure(statusMissing, "fixtureObserved");
  assert(statusMissing.fixtureObserved.reasonCode === "DOM_FIXTURE_STATUS_NOT_OBSERVED",
    "missing EVT-003 status did not fail distinctly");

  const statusDrift = evidenceFor({
    dom: {
      ...observed,
      text: `#${sourceId} 지연:구독 세션 없음`,
      nodeTexts: [`#${sourceId} 지연:구독 세션 없음`],
    },
  });
  assertCompositeFailure(statusDrift, "fixtureObserved");
  assert(statusDrift.fixtureObserved.reasonCode === "DOM_FIXTURE_STATUS_NOT_OBSERVED",
    "drifted EVT-003 status did not fail distinctly");

  const reasonMissing = evidenceFor({
    dom: { ...observed, text: `#${sourceId} 오프라인`, nodeTexts: [`#${sourceId} 오프라인`] },
  });
  assertCompositeFailure(reasonMissing, "fixtureObserved");
  assert(reasonMissing.fixtureObserved.reasonCode === "DOM_FIXTURE_REASON_NOT_OBSERVED",
    "missing EVT-003 reason did not fail distinctly");

  const reasonDrift = evidenceFor({
    dom: {
      ...observed,
      text: `#${sourceId} 오프라인:연결 불가`,
      nodeTexts: [`#${sourceId} 오프라인:연결 불가`],
    },
  });
  assertCompositeFailure(reasonDrift, "fixtureObserved");
  assert(reasonDrift.fixtureObserved.reasonCode === "DOM_FIXTURE_REASON_NOT_OBSERVED",
    "drifted EVT-003 reason did not fail distinctly");

  const distributedIdentity = evidenceFor({
    dom: {
      ...observed,
      count: 3,
      visibleCount: 3,
      text: `#${sourceId}\n오프라인\n구독 세션 없음`,
      nodeTexts: [`#${sourceId}`, "오프라인", "구독 세션 없음"],
    },
  });
  assertCompositeFailure(distributedIdentity, "fixtureObserved");
  assert(distributedIdentity.fixtureObserved.reasonCode === "DOM_FIXTURE_IDENTITY_DISTRIBUTED" &&
    distributedIdentity.fixtureObserved.matchedNodeCount === 0,
  "distributed EVT-003 identity fields were combined across DOM nodes");

  const duplicateIdentity = evidenceFor({
    dom: {
      ...observed,
      count: 2,
      visibleCount: 2,
      text: `${observed.nodeTexts[0]}\n${observed.nodeTexts[0]}`,
      nodeTexts: [observed.nodeTexts[0], observed.nodeTexts[0]],
    },
  });
  assertCompositeFailure(duplicateIdentity, "fixtureObserved");
  assert(duplicateIdentity.fixtureObserved.reasonCode === "DOM_FIXTURE_IDENTITY_DUPLICATE" &&
    duplicateIdentity.fixtureObserved.matchedNodeCount === 2,
  "duplicate EVT-003 identity nodes did not fail closed");

  const unrelatedOnly = evidenceFor({
    dom: {
      ...observed,
      text: "#39065999 오프라인:구독 세션 없음",
      nodeTexts: ["#39065999 오프라인:구독 세션 없음"],
    },
  });
  assertCompositeFailure(unrelatedOnly, "fixtureObserved");
  assert(unrelatedOnly.fixtureObserved.reasonCode === "DOM_FIXTURE_SOURCE_ID_NOT_OBSERVED",
    "unrelated root-cause node satisfied EVT-003 identity");

  const partialSourceId = evidenceFor({
    dom: {
      ...observed,
      text: `#${sourceId}7 오프라인:구독 세션 없음`,
      nodeTexts: [`#${sourceId}7 오프라인:구독 세션 없음`],
    },
  });
  assertCompositeFailure(partialSourceId, "fixtureObserved");
  assert(partialSourceId.fixtureObserved.reasonCode === "DOM_FIXTURE_SOURCE_ID_NOT_OBSERVED",
    "partial sourceId substring satisfied EVT-003 identity");

  const domControlMissing = evidenceFor({
    dom: { ...observed, count: 0, visibleCount: 0, text: "", nodeTexts: [], descendantCount: 0 },
  });
  assertCompositeFailure(domControlMissing, "observationPresent");
  assert(domControlMissing.observationPresent.reasonCode === "DOM_OBSERVATION_MISSING",
    "missing EVT-003 DOM control did not fail distinctly");

  const apiDomMismatch = evidenceFor({
    identity: { ...fixtureIdentity, status: "stale" },
  });
  assertCompositeFailure(apiDomMismatch, "fixtureObserved");
  assert(apiDomMismatch.fixtureObserved.reasonCode === "API_DOM_FIXTURE_IDENTITY_MISMATCH",
    "EVT-003 API/DOM identity mismatch did not fail distinctly");

  const sensitiveDom = evidenceFor({
    dom: {
      ...observed,
      text: `${observed.nodeTexts[0]}\nrtsp://user:password@example.invalid/live?token=secret`,
      nodeTexts: [`${observed.nodeTexts[0]}\nrtsp://user:password@example.invalid/live?token=secret`],
    },
  });
  const sensitiveSerialized = JSON.stringify(sensitiveDom);
  for (const raw of ["rtsp://", "password", "token=secret", sourceId, "오프라인", "구독 세션 없음"]) {
    assert(!sensitiveSerialized.includes(raw),
      `EVT-003 structured identity evidence exposed raw material: ${raw}`);
  }

  const missingStructuredField = structuredClone(passing);
  delete missingStructuredField.fixtureObserved.identityDigest;
  await expectReject(
    () => Promise.resolve(validateEventDomSemanticCompositeEvidence(missingStructuredField)),
    "required structured fields are missing",
  );
});

await check("response pseudo-fields include status and reject an invalid status assertion", async () => {
  const body = { ok: true };
  assert(JSON.stringify(responsePseudoFieldValues({ body, contentType: "application/json", status: 201 }, "$body")) === JSON.stringify([JSON.stringify(body)]),
    "$body pseudo-field mismatch");
  assert(responsePseudoFieldValues({ body, contentType: "application/json", status: 201 }, "$text")[0].includes('"ok":true'),
    "$text pseudo-field mismatch");
  assert(responsePseudoFieldValues({ body, contentType: "application/json", status: 201 }, "$contentType")[0] === "application/json",
    "$contentType pseudo-field mismatch");
  assert(responsePseudoFieldValues({ body, contentType: "application/json", status: 201 }, "$status")[0] === 201,
    "$status pseudo-field mismatch");
  assert(evaluateRuntimeStatusPseudoFieldAssertion({ path: "$status", operator: "equals", expected: 201 }, 201, { caseId: "EVT-CONTRACT" }).pass,
    "$status exact assertion did not pass");
  assert(!evaluateRuntimeStatusPseudoFieldAssertion({ path: "$status", operator: "equals", expected: 201 }, 500, { caseId: "EVT-CONTRACT" }).pass,
    "$status exact assertion accepted the wrong status");
});

await check("GET response correlation, debug leaf policy, and nested attribute owners fail closed", async () => {
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser(),
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "ACTION_ID_MISMATCH");

  const uncorrelated = eventBrowser();
  uncorrelated.setCorrelationId = async () => {};
  const correlatedRequest = uncorrelated.request;
  uncorrelated.request = input => correlatedRequest({ ...input, correlationId: "" });
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: uncorrelated,
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "CORRELATION_NOT_ATTACHED");

  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body: { ...eventBody(), debugCounters: { activeRequests: "two" } } }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "response field policy requires a finite numeric or typed string leaf");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body: { ...eventBody(), debugCounters: {
      activeRequests: 2,
      unexpectedMaterial: "rtsp://secret.example/live",
    } } }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "response field policy requires a finite numeric or typed string leaf");

  const ownerBrowser = {
    evaluate: async source => String(source).includes("[data-event-review-row]")
      ? [{ "data-event-id": "evt-owner" }]
      : [{ "data-testid": "event-review-item" }],
  };
  const ownerAssertion = {
    attributeOwners: [
      { selector: "[data-event-review-row]", attributes: [{ name: "data-event-id", value: "{fixtureId}" }] },
      { selector: "[data-testid=event-review-item]", attributes: [{ name: "data-testid", value: "event-review-item" }] },
    ],
  };
  const evidence = await validateRuntimeAttributeOwners(ownerBrowser, { caseId: "EVT-030" }, ownerAssertion, { fixtureId: "evt-owner" });
  assert(evidence.length === 2, "nested selector attribute owners were not evaluated independently");
  await expectReject(() => validateRuntimeAttributeOwners({
    evaluate: async () => [{ "data-testid": "event-review-item" }],
  }, { caseId: "EVT-030" }, ownerAssertion, { fixtureId: "evt-owner" }), "exact DOM attribute owner mismatch");
});

await check("EVT-001 actual response counts and DOM projections pass", async () => {
  const browser = eventBrowser();
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  });
  assert(result.responses.length === 1 && result.dom.length === 4, "EVT-001 evidence cardinality mismatch");
  assert(result.responses[0].assertionEvidence.length === 3, "EVT-001 request assertions were not executed");
  assert(result.dom.every(item => item.semanticEvidence.length === 1), "EVT-001 DOM assertions were not executed");
});

await check("EVT-024 executes all three bounded samples with authoritative baseline binding", async () => {
  const body = eventBody();
  const browser = eventBrowser({
    body,
    domText: { "#dashRuntimeTrendSparkline": "bounded runtime samples 3" },
  });
  let fetchCount = 0;
  const evaluate = browser.evaluate;
  browser.evaluate = async script => {
    if (String(script).startsWith("fetch(")) fetchCount += 1;
    return evaluate(script);
  };
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("EVT-024", "/ops/dashboard"),
    actionId: "EVT-024:assert-visible-read-model",
    fixtureId: "evt-024-runtime-contract",
    correlationId: "EVT-024:contract",
    catalogBindings: {
      eventExactRuntime: {
        schema: "media-server.v390-ui-event-runtime-bindings.v1",
        caseId: "EVT-024",
        seedByPath: {},
        requestByPath: {},
        priorResponseByPath: {
          "sessionManager.activeSessions": 2,
          "sessionManager.activeAnalysisTaps": 1,
        },
        sensitiveCanaries: [],
      },
    },
  });
  assert(fetchCount === 3 && result.responses[0].sampleCount === 3 &&
    result.responses[0].sampleDigests.length === 3,
  "EVT-024 bounded repeat cardinality was not executed");
});

await check("requested EVT binding scope is complete and excludes specialized mutation paths", async () => {
  const requested = "003,004,007,016,017,019,020,022,023,024,025,026,028,030,031,036,041,042,043,044,046,047,049,050,051,052,053,054,055,056,057,058,064,065,066,067,069,070,071,072,075"
    .split(",").map(value => `EVT-${value}`);
  assert(requested.length === 41 && requested.every(usesEventExactRuntimeBindings),
    "requested EVT exact runtime binding scope is incomplete");
  assert(["EVT-001", "EVT-018", "EVT-021", "EVT-037", "EVT-038", "EVT-048", "EVT-061", "EVT-068"]
    .every(caseId => !usesEventExactRuntimeBindings(caseId)),
  "persisted specialized EVT workflow entered the shared read-only binding path");
});

await check("cross-route primary action verifies source catalog and restores destination", async () => {
  const navigations = [];
  const browser = coreBrowser();
  let route = "/ops/rules?draftEventId=runtime-contract";
  browser.evaluate = async script => {
    if (script === "location.pathname + location.search + location.hash") return route;
    if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
    if (String(script).startsWith("fetch(")) {
      return {
        status: 200,
        text: '<section data-testid="ops-home-page">ops-workspace-home</section>',
        json: null,
        contentType: "text/html",
      };
    }
    return {
      count: route === "/ops/home" ? 1 : 0,
      visibleCount: route === "/ops/home" ? 1 : 0,
      text: "ops-workspace-home",
      attributes: [{ "data-testid": "ops-home-page" }],
      values: [""],
      formControls: [],
      descendantCount: 0,
      properties: {},
    };
  };
  browser.navigate = async target => {
    navigations.push(target);
    route = target;
    return { status: 200, url: `http://runtime.invalid${target}` };
  };
  const result = await executeCatalogRuntimeOracleAtSourceRoute({
    browser,
    item: { ...exactItem("UI-009", "/ops/home"), screenRoute: "/ops/home" },
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "source-route-contract",
    correlationId: "UI-009:contract",
  });
  assert(navigations.join("|") === "/ops/home|/ops/rules?draftEventId=runtime-contract",
    "catalog source/destination route lifecycle mismatch");
  assert(result.routeLifecycle?.sourceNavigationStatus === 200 &&
    result.routeLifecycle?.restoreNavigationStatus === 200,
  "catalog source/destination lifecycle evidence missing");
});

await check("cross-route source and restore navigation failures are fail-closed", async () => {
  const sourceFailure = coreBrowser();
  sourceFailure.evaluate = async script => script === "location.pathname + location.search + location.hash"
    ? "/ops/rules"
    : "/ops/rules";
  sourceFailure.navigate = async () => ({ status: 404, url: "http://runtime.invalid/missing" });
  await expectReject(() => executeCatalogRuntimeOracleAtSourceRoute({
    browser: sourceFailure,
    item: { ...exactItem("UI-009", "/ops/home"), screenRoute: "/ops/home" },
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "source-route-negative-contract",
    correlationId: "UI-009:contract",
  }), "catalog source route status mismatch");
});

await check("API source assertions use one fetch on the current screen without document navigation", async () => {
  const navigations = [];
  let route = "/ops/sources";
  let fetches = 0;
  let domReads = 0;
  let primaryWaits = 0;
  const selector = '[data-testid="ops-sources-page"]';
  const browser = coreBrowser();
  browser.evaluate = async script => {
    if (script === "location.pathname + location.search + location.hash") return route;
    if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
    if (String(script).startsWith("fetch(")) {
      assert(route === "/ops/sources",
        "SRC-034 exact fetch did not preserve the product screen route");
      fetches += 1;
      const json = {
        schema: "media-server.ops.v330-source-onboarding-quality-summary.v1",
        onboardingQualitySummary: { inputKinds: ["ONVIF", "WHEP", "RTSP"] },
      };
      return {
        status: 200,
        text: JSON.stringify(json),
        json,
        contentType: "application/json",
      };
    }
    assert(route === "/ops/sources", "SRC-034 DOM assertion left the product screen route");
    domReads += 1;
    return {
      count: 1,
      visibleCount: 1,
      text: "source onboarding quality",
      attributes: [{ "data-testid": "ops-sources-page" }],
      values: [""],
      formControls: [],
      descendantCount: 0,
      properties: {},
    };
  };
  browser.navigate = async target => {
    navigations.push(target);
    route = target;
    return { status: 200, url: `http://runtime.invalid${target}` };
  };
  browser.waitForSelector = async requested => {
    assert(route === "/ops/sources" && requested === selector,
      "SRC-034 primary control was not verified on the restored screen route");
    primaryWaits += 1;
  };
  browser.snapshot = async requested => ({
    exists: true,
    visible: true,
    disabled: false,
    selector: requested,
  });
  const result = await executeCatalogRuntimeOracleAtSourceRoute({
    browser,
    item: {
      ...exactItem("SRC-034", "/ops/sources"),
      workflow: {
        workflowClass: "read-only-state",
        primaryControl: {
          applicability: "required",
          selector,
          route: "/ops/sources",
          expectedVisible: true,
          expectedEnabled: true,
        },
      },
    },
    actionId: "SRC-034:assert-product-state",
    fixtureId: "src-034-route-phase-contract",
    correlationId: "SRC-034:contract",
  });
  assert(navigations.length === 0,
    `SRC-034 API source created duplicate document navigation: ${navigations.join("|")}`);
  assert(fetches === 1 && domReads === 1 && primaryWaits === 1,
    `SRC-034 phase cardinality mismatch: fetch=${fetches}, dom=${domReads}, wait=${primaryWaits}`);
  assert(result.responses.length === 1 && result.dom.length === 1 &&
    result.routeLifecycle?.splitApiAndScreen === true &&
    result.routeLifecycle?.sourceObservation === "fresh-browser-fetch" &&
    result.routeLifecycle?.screenPreparationStatus === null &&
    result.routeLifecycle?.restoreNavigationStatus === null &&
    result.nativePrimaryControl?.status === "PASS",
  "SRC-034 split API/screen evidence missing");
});

await check("API fetch and screen preparation failures remain fail-closed without duplicate requests", async () => {
  const makeBrowser = ({ apiStatus = 200, screenStatus = 200, initialRoute = "/ops/sources" } = {}) => {
    let route = initialRoute;
    const navigations = [];
    let fetches = 0;
    let domReads = 0;
    const browser = coreBrowser();
    browser.evaluate = async script => {
      if (script === "location.pathname + location.search + location.hash") return route;
      if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
      if (String(script).startsWith("fetch(")) {
        fetches += 1;
        const json = {
          schema: "media-server.ops.v330-source-onboarding-quality-summary.v1",
          onboardingQualitySummary: {},
        };
        return {
          status: apiStatus,
          text: JSON.stringify(json),
          json,
          contentType: "application/json",
        };
      }
      domReads += 1;
      return {
        count: 1,
        visibleCount: 1,
        text: "",
        attributes: [{ "data-testid": "ops-sources-page" }],
        values: [""],
        formControls: [],
        descendantCount: 0,
        properties: {},
      };
    };
    browser.navigate = async target => {
      navigations.push(target);
      route = target;
      return {
        status: target === "/ops/sources" ? screenStatus : 200,
        url: `http://runtime.invalid${target}`,
      };
    };
    return { browser, navigations, fetches: () => fetches, domReads: () => domReads };
  };
  const item = exactItem("SRC-034", "/ops/sources");
  const apiFailure = makeBrowser({ apiStatus: 500 });
  await expectReject(() => executeCatalogRuntimeOracleAtSourceRoute({
    browser: apiFailure.browser,
    item,
    actionId: "SRC-034:assert-product-state",
    fixtureId: "src-034-api-failure-contract",
    correlationId: "SRC-034:contract",
  }), "exact request status mismatch");
  assert(apiFailure.navigations.length === 0 &&
    apiFailure.fetches() === 1 &&
    apiFailure.domReads() === 0,
  "SRC-034 API failure navigated, duplicated the request, or executed DOM");

  const screenFailure = makeBrowser({ initialRoute: "/ops/api/source-registry/onboarding-quality", screenStatus: 503 });
  await expectReject(() => executeCatalogRuntimeOracleAtSourceRoute({
    browser: screenFailure.browser,
    item,
    actionId: "SRC-034:assert-product-state",
    fixtureId: "src-034-screen-failure-contract",
    correlationId: "SRC-034:contract",
  }), "catalog screen route status mismatch");
  assert(screenFailure.navigations.join("|") === "/ops/sources" &&
    screenFailure.fetches() === 0 &&
    screenFailure.domReads() === 0,
  "SRC-034 screen preparation failure fetched, executed DOM, or retried navigation");
});

await check("already executed primary action is not dispatched twice", async () => {
  let clicks = 0;
  const browser = coreBrowser();
  browser.click = async () => { clicks += 1; };
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("UI-009", "/ops/home"),
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "single-primary-contract",
    correlationId: "UI-009:contract",
    primaryAction: {
      actionId: "UI-009:primary-action",
      executedControlSelector: "#already-executed",
      executedKind: "click",
    },
  });
  assert(clicks === 0 && result.interaction.kind === "existing-primary-action",
    "catalog dispatched an already executed primary action");
});

await check("native primary control binding is enforced independently of route root", async () => {
  const selector = "#reviewed-product-control";
  const item = {
    ...exactItem("UI-009", "/ops/home"),
    workflow: {
      workflowClass: "read-only-state",
      primaryControl: {
        applicability: "required",
        selector,
        route: "/ops/home",
        expectedVisible: true,
        expectedEnabled: true,
      },
    },
  };
  const browser = coreBrowser();
  const originalSnapshot = browser.snapshot;
  browser.snapshot = async requested => requested === selector
    ? { exists: true, visible: true, disabled: false, selector: requested }
    : originalSnapshot(requested);
  const result = await executeCatalogRuntimeOracle({
    browser,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "native-control-contract",
    correlationId: "UI-009:contract",
  });
  assert(result.nativePrimaryControl?.selector === selector &&
    result.nativePrimaryControl?.status === "PASS",
  "native primary control evidence missing");

  const missing = coreBrowser();
  const missingSnapshot = missing.snapshot;
  missing.snapshot = async requested => requested === selector
    ? { exists: false, visible: false, disabled: false, selector: requested }
    : missingSnapshot(requested);
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: missing,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "native-control-negative-contract",
    correlationId: "UI-009:contract",
  }), "native primary control missing");
});

await check("required current-route primary control waits before its snapshot", async () => {
  const selector = "#async-primary-control";
  const item = primaryControlItem(selector, "/ops/home");
  const browser = coreBrowser();
  const order = [];
  let ready = false;
  browser.waitForSelector = async requested => {
    order.push(`wait:${requested}`);
    assert(requested === selector, "unexpected async primary selector");
    ready = true;
  };
  browser.snapshot = async requested => {
    order.push(`snapshot:${requested}`);
    assert(ready, "native primary snapshot occurred before waitForSelector");
    return { exists: true, visible: true, disabled: false, selector: requested };
  };
  const result = await executeCatalogRuntimeOracle({
    browser,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "async-primary-control-contract",
    correlationId: "UI-009:contract",
  });
  assert(result.nativePrimaryControl?.status === "PASS" &&
    order.slice(0, 2).join("|") === `wait:${selector}|snapshot:${selector}`,
  "async native primary control did not wait before snapshot");
});

await check("required hidden primary control waits for attachment without demanding visibility", async () => {
  const selector = "#opsEventRuleIdInput";
  const item = {
    ...primaryControlItem(selector, "/ops/home"),
    workflow: {
      workflowClass: "hidden-disabled",
      primaryControl: {
        applicability: "required",
        selector,
        route: "/ops/home",
        expectedVisible: false,
        expectedEnabled: false,
      },
    },
  };
  const browser = coreBrowser();
  const order = [];
  browser.waitForSelector = async (requested, options) => {
    order.push(`wait:${requested}:${options?.state || ""}`);
    assert(requested === selector && options?.state === "attached",
      "RULE-017 hidden primary selector did not use attached state");
  };
  const baseSnapshot = browser.snapshot;
  browser.snapshot = async requested => {
    if (requested !== selector) return baseSnapshot(requested);
    order.push(`snapshot:${requested}`);
    return { exists: true, visible: false, disabled: true, selector: requested };
  };
  const result = await executeCatalogRuntimeOracle({
    browser,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "rule-017-hidden-primary-contract",
    correlationId: "UI-009:contract",
  });
  assert(result.nativePrimaryControl?.status === "PASS" &&
    result.nativePrimaryControl?.visible === false &&
    result.nativePrimaryControl?.enabled === false &&
    order.slice(0, 2).join("|") === `wait:${selector}:attached|snapshot:${selector}`,
  "RULE-017 hidden primary control was not observed as attached and hidden");
});

await check("required current-route primary control keeps timeout and post-wait failures fail-closed", async () => {
  const selector = "#async-primary-control-negative";
  const item = primaryControlItem(selector, "/ops/home");
  const timeout = coreBrowser();
  let timeoutSnapshotCalls = 0;
  timeout.waitForSelector = async () => { throw new Error("adapter timeout"); };
  timeout.snapshot = async () => {
    timeoutSnapshotCalls += 1;
    return { exists: true, visible: true, disabled: false, selector };
  };
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: timeout,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "async-primary-timeout-contract",
    correlationId: "UI-046:contract",
  }), "adapter timeout");
  assert(timeoutSnapshotCalls === 0, "snapshot ran after primary control wait timeout");

  const missing = coreBrowser();
  let waitCalls = 0;
  missing.waitForSelector = async () => { waitCalls += 1; };
  missing.snapshot = async requested => ({ exists: false, visible: false, disabled: false, selector: requested });
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: missing,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "async-primary-missing-contract",
    correlationId: "UI-046:contract",
  }), "native primary control missing");
  assert(waitCalls === 1, "missing control did not wait before failing");
});

await check("required current-route primary control still rejects hidden and disabled snapshots", async () => {
  const selector = "#async-primary-visibility";
  const item = primaryControlItem(selector, "/ops/home");
  for (const [label, snapshot, expected] of [
    ["hidden", { exists: true, visible: false, disabled: false }, "native primary control visibility mismatch"],
    ["disabled", { exists: true, visible: true, disabled: true }, "native primary control disabled"],
  ]) {
    const browser = coreBrowser();
    let waits = 0;
    browser.waitForSelector = async () => { waits += 1; };
    browser.snapshot = async requested => ({ ...snapshot, selector: requested });
    await expectReject(() => executeCatalogRuntimeOracle({
      browser,
      item,
      actionId: "UI-009:assert-visible-read-model",
      fixtureId: `async-primary-${label}-contract`,
      correlationId: "UI-046:contract",
    }), expected);
    assert(waits === 1, `${label} primary control did not use waitForSelector`);
  }
});

await check("route mismatch and not-applicable primary controls do not wait or replay", async () => {
  const selector = "#route-mismatch-primary";
  const mismatch = coreBrowser();
  let mismatchWaits = 0;
  mismatch.evaluate = async script => script === "location.pathname" ? "/ops/rules" : coreBrowser().evaluate(script);
  mismatch.waitForSelector = async () => { mismatchWaits += 1; };
  const mismatchResult = await executeCatalogRuntimeOracle({
    browser: mismatch,
    item: primaryControlItem(selector, "/ops/home"),
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "route-mismatch-primary-contract",
    correlationId: "UI-009:contract",
  });
  assert(mismatchResult.nativePrimaryControl?.status === "verified-by-native-workflow-on-action-route" &&
    mismatchWaits === 0, "route mismatch replayed the primary control");

  const notApplicable = coreBrowser();
  let notApplicableWaits = 0;
  notApplicable.waitForSelector = async () => { notApplicableWaits += 1; };
  const notApplicableResult = await executeCatalogRuntimeOracle({
    browser: notApplicable,
    item: {
      ...exactItem("UI-009", "/ops/home"),
      workflow: { primaryControl: { applicability: "not-applicable" } },
    },
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "not-applicable-primary-contract",
    correlationId: "UI-009:contract",
  });
  assert(notApplicableResult.nativePrimaryControl?.status === "PASS" && notApplicableWaits === 0,
    "not-applicable primary control waited unexpectedly");
});

await check("source-route navigation waits for async primary control and restores on success and failure", async () => {
  const selector = "#source-route-async-primary";
  const makeBrowser = ({ waitError = "" } = {}) => {
    const browser = coreBrowser();
    let route = "/ops/rules?draftEventId=runtime-contract";
    const navigations = [];
    let waits = 0;
    browser.evaluate = async script => {
      if (script === "location.pathname + location.search + location.hash") return route;
      if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
      if (String(script).startsWith("fetch(")) return {
        status: 200,
        text: '<section data-testid="ops-home-page">ops-workspace-home</section>',
        json: null,
        contentType: "text/html",
      };
      return {
        count: route === "/ops/home" ? 1 : 0,
        visibleCount: route === "/ops/home" ? 1 : 0,
        text: "ops-workspace-home",
        attributes: [{ "data-testid": "ops-home-page" }],
        values: [""], formControls: [], descendantCount: 0, properties: {},
      };
    };
    browser.navigate = async target => {
      navigations.push(target);
      route = target;
      return { status: 200, url: `http://runtime.invalid${target}` };
    };
    browser.waitForSelector = async requested => {
      waits += 1;
      assert(requested === selector, "source route waited for unexpected selector");
      if (waitError) throw new Error(waitError);
    };
    browser.snapshot = async requested => ({ exists: true, visible: true, disabled: false, selector: requested });
    return { browser, navigations, waits: () => waits };
  };
  const item = primaryControlItem(selector, "/ops/home");
  const passing = makeBrowser();
  const result = await executeCatalogRuntimeOracleAtSourceRoute({
    browser: passing.browser,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "source-route-async-primary-contract",
    correlationId: "UI-046:contract",
  });
  assert(passing.waits() === 1 && passing.navigations.join("|") === "/ops/home|/ops/rules?draftEventId=runtime-contract" &&
    result.routeLifecycle?.restoreNavigationStatus === 200,
  "source-route async primary lifecycle did not wait and restore");

  const failing = makeBrowser({ waitError: "adapter timeout" });
  await expectReject(() => executeCatalogRuntimeOracleAtSourceRoute({
    browser: failing.browser,
    item,
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "source-route-async-primary-timeout-contract",
    correlationId: "UI-046:contract",
  }), "adapter timeout");
  assert(failing.navigations.join("|") === "/ops/home|/ops/rules?draftEventId=runtime-contract",
    "source-route async primary failure did not restore destination");
});

await check("core object-form requiredAttributes are enforced", async () => {
  const browser = coreBrowser();
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("UI-009", "/ops/home"),
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "runtime-contract-core",
    correlationId: "UI-009:contract",
  });
  assert(result.dom[0].count === 1, "UI-009 DOM observation missing");
  const broken = coreBrowser({ attributes: [{ "data-testid": "wrong" }] });
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: broken,
    item: exactItem("UI-009", "/ops/home"),
    actionId: "UI-009:assert-visible-read-model",
    fixtureId: "runtime-contract-core",
    correlationId: "UI-009:contract",
  }), "exact DOM attribute mismatch");
});

await check("HTML redaction code is distinct from embedded forbidden response fields", async () => {
  const safeHtml = `<!doctype html><body>
    <main data-testid="client-live-workspace">
      <section data-testid="client-live-action-reduction">viewer-safe</section>
    </main>
    <script>const auditMaterialKeys = new Set(['sourceurl']);</script>
    <script type="application/json" id="views-data">{"views":[],"sourceUrlIncluded":false}</script>
  </body>`;
  const execute = body => executeCatalogRuntimeOracle({
    browser: clientLiveBrowser(body),
    item: exactItem("UI-015", "/client/live"),
    actionId: "UI-015:assert-visible-read-model",
    fixtureId: "client-live-html-redaction-contract",
    correlationId: "UI-015:contract",
  });
  const result = await execute(safeHtml);
  assert(result.responses.length === 1 && result.responses[0].urlPath === "/client/live",
    "UI-015 safe HTML response evidence missing");

  const leakedHtml = `<!doctype html><body>
    <main data-testid="client-live-workspace">
      <section data-testid="client-live-action-reduction">viewer-safe</section>
    </main>
    <script type="application/json" id="views-data">{"views":[],"sourceUrl":"rtsp://camera.invalid/live"}</script>
  </body>`;
  await expectReject(() => execute(leakedHtml), "forbidden response material observed");
});

await check("response redaction separates UI-068 narrative labels from structured material", async () => {
  const execute = body => executeCatalogRuntimeOracle({
    browser: clientLiveBrowser(body),
    item: exactItem("UI-068", "/client/live"),
    actionId: "UI-068:assert-visible-read-model",
    fixtureId: "client-live-response-redaction-contract",
    correlationId: "UI-068:contract",
  });
  const html = fields => `<!doctype html><body>
    <main data-testid="client-live-workspace">overlayMode=raw · raw 숨김 · raw evidence 비노출</main>
    <script type="application/json" id="views-data">${JSON.stringify(fields)}</script>
  </body>`;
  const safeHtml = await execute(html({ overlayMode: "raw" }));
  assert(safeHtml.responses.length === 1, "UI-068 raw overlay narrative HTML response was not observed");
  const safeJson = { overlayMode: "raw", narrative: "raw 숨김 · raw evidence 비노출" };
  for (const token of ["rawEvidence", "rawJson", "rawLocator"]) {
    assert(!containsForbiddenResponseMaterial(safeJson, token, "application/json"),
      `UI-068 ${token} narrative JSON was treated as material`);
  }
  assert(!containsForbiddenResponseMaterial(
    { rawEvidenceIncluded: false },
    "rawEvidenceIncluded",
    "application/json",
  ), "inactive rawEvidenceIncluded attestation was treated as response material");
  assert(containsForbiddenResponseMaterial(
    { rawEvidenceIncluded: true },
    "rawEvidenceIncluded",
    "application/json",
  ), "active rawEvidenceIncluded attestation was not rejected");
  for (const unsafeValue of ["false", null, { digest: "material" }, ["material"]]) {
    assert(containsForbiddenResponseMaterial(
      { rawEvidenceIncluded: unsafeValue },
      "rawEvidenceIncluded",
      "application/json",
    ), `non-boolean rawEvidenceIncluded attestation was not rejected: ${JSON.stringify(unsafeValue)}`);
  }
  assert(containsForbiddenResponseMaterial(
    { rawEvidenceIncluded: false, rawEvidence: { digest: "material" } },
    "rawEvidence",
    "application/json",
  ), "inactive attestation concealed actual raw evidence material");
  const safeEmbeddedAttestation =
    '<script type="application/json">{"rawEvidenceIncluded":false}</script>';
  const activeEmbeddedAttestation =
    '<script type="application/json">{"rawEvidenceIncluded":true}</script>';
  assert(!containsForbiddenResponseMaterial(
    safeEmbeddedAttestation,
    "rawEvidenceIncluded",
    "text/html",
  ), "inactive embedded rawEvidenceIncluded attestation was treated as material");
  assert(containsForbiddenResponseMaterial(
    activeEmbeddedAttestation,
    "rawEvidenceIncluded",
    "text/html",
  ), "active embedded rawEvidenceIncluded attestation was not rejected");
  for (const field of [
    "autoApply",
    "autoRuleApplied",
    "viewerClientExposure",
    "providerCall",
    "registryWrite",
  ]) {
    assert(!containsForbiddenResponseMaterial({ [field]: false }, field, "application/json"),
      `inactive ${field} response attestation was treated as material`);
    assert(containsForbiddenResponseMaterial({ [field]: true }, field, "application/json"),
      `active ${field} response attestation was not rejected`);
    assert(containsForbiddenResponseMaterial({ [field]: "false" }, field, "application/json"),
      `string ${field} response attestation was not rejected`);
  }
  const safeCredentialStatus = {
    status: "sanitizedCredentialProviderStatusSummary",
    route: "/ops/api/onvif/credential-provider-status",
    operatorAnswer: "do not expose credential reference values or secret material",
  };
  assert(!containsForbiddenResponseMaterial(
    safeCredentialStatus,
    "credential",
    "application/json",
  ), "credential status narrative was treated as response material");
  assert(containsForbiddenResponseMaterial(
    { credential: "secret-material" },
    "credential",
    "application/json",
  ), "structured credential field was not rejected");
  const ui068Material = [
    ["rawEvidence", "unredacted-value"],
    ["rawJson", { secret: "value" }],
    ["rawLocator", "rtsp://camera.invalid/live"],
    ["rawProviderResponse", { secret: "value" }],
    ["rawEvidenceIncluded", true],
    ["sourceUrl", "rtsp://camera.invalid/live"],
    ["credentialMaterial", "secret-value"],
    ["debugMaterial", "debug-value"],
  ];
  for (const [field, value] of ui068Material) {
    await expectReject(() => execute(html({ [field]: value })), "forbidden response material observed");
    assert(containsForbiddenResponseMaterial({ [field]: value }, field, "application/json"),
      `UI-068 ${field} JSON material was not rejected`);
  }
  assert(containsForbiddenResponseMaterial({ providerCall: true }, "providerCall", "application/json"),
    "provider JSON material was not rejected");
});

await check("endpoint-owned mutation requires the actual method/path/status/correlation response", async () => {
  const fixtureId = "auth-020-runtime-contract";
  const correlationId = "AUTH-020:endpoint-contract";
  const response = await actualEndpointResponseEntry({
    method: "POST",
    path: `/ops/api/users/${fixtureId}/disable`,
    status: 200,
    correlationId,
    payload: { status: "disabled", user: { username: fixtureId, enabled: false } },
  });
  const execute = entries => executeCatalogRuntimeOracle({
    browser: authMutationBrowser(),
    item: exactItem("AUTH-020", "/ops/users"),
    actionId: "AUTH-020:execute-endpoint-action",
    fixtureId,
    correlationId,
    primaryNetworkEntries: entries,
  });
  const passed = await execute([response]);
  assert(passed.responses.length === 1 && passed.responses[0].source === "correlated-browser-network",
    "AUTH-020 actual endpoint response evidence missing");
  await expectReject(() => execute([]), "exact mutation response missing");
  await expectReject(() => execute([{ ...response, method: "DELETE" }]), "exact mutation response missing");
  await expectReject(() => execute([{ ...response, url: "http://runtime.invalid/ops/api/users/wrong/disable" }]),
    "exact mutation response missing");
  await expectReject(() => execute([{ ...response, status: 409 }]), "exact request status mismatch");
  await expectReject(() => execute([{ ...response, correlationId: "AUTH-020:wrong-correlation" }]),
    "exact mutation response correlation mismatch");
  await expectReject(() => execute([{ ...response, safeResponseProjectionSource: "" }]),
    "did not pass through the native Playwright response projection");
  const missingBody = await actualEndpointResponseEntry({
    method: "POST",
    path: `/ops/api/users/${fixtureId}/disable`,
    status: 200,
    correlationId,
    payload: null,
    expectProjectionFailure: true,
  });
  await expectReject(() => execute([missingBody]),
    "did not pass through the native Playwright response projection");
});

await check("DOM redaction labels are distinct from exposed credential values", async () => {
  const selector = '[data-testid="ops-vlm-page"]';
  const execute = ({ text, formControls = [] }) => executeCatalogRuntimeOracle({
    browser: fakeBrowser({
      route: "/ops/vlm",
      status: 200,
      body: `<main data-testid="ops-vlm-page">${text}</main>`,
      observations: {
        [selector]: {
          count: 1,
          visibleCount: 1,
          text,
          attributes: [{ "data-testid": "ops-vlm-page" }],
          formControls,
        },
      },
    }),
    item: exactItem("UI-027", "/ops/vlm"),
    actionId: "UI-027:assert-visible-read-model",
    fixtureId: "ops-vlm-dom-redaction-contract",
    correlationId: "UI-027:contract",
  });

  const safe = await execute({
    text: "Cloud provider는 credential env 준비 전까지 release PASS가 아닙니다. prompt/raw response/source URL/credential 비노출",
  });
  assert(safe.dom[0].count === 1, "UI-027 safe redaction boundary DOM evidence missing");
  await expectReject(() => execute({ text: "credential=sk-live-exposed-value" }), "forbidden DOM material observed");
  await expectReject(() => execute({
    text: "credential 비노출",
    formControls: [{ id: "providerCredential", name: "credential", type: "password", value: "sk-live-input-value" }],
  }), "forbidden DOM material observed");
});

await check("client/viewer boundary labels are distinct from enabled exposure material", async () => {
  const selector = '[data-testid="ops-vlm-page"]';
  const execute = text => executeCatalogRuntimeOracle({
    browser: fakeBrowser({
      route: "/ops/vlm",
      status: 200,
      body: `<main data-testid="ops-vlm-page">${text}</main>`,
      observations: {
        [selector]: {
          count: 1,
          visibleCount: 1,
          text,
          attributes: [{ "data-testid": "ops-vlm-page" }],
        },
      },
    }),
    item: exactItem("UI-033", "/ops/vlm"),
    actionId: "UI-033:assert-product-state",
    fixtureId: "ops-vlm-client-viewer-boundary-contract",
    correlationId: "UI-033:contract",
  });

  const safe = await execute("viewer/client에는 저장하거나 노출하지 않습니다. viewerClientExposure=false");
  assert(safe.dom[0].count === 1, "UI-033 safe client/viewer boundary DOM evidence missing");
  await expectReject(() => execute("viewerClientExposure=true"), "forbidden DOM material observed");
});

await check("no-write/provider labels are distinct from enabled capability material", async () => {
  const selector = '[data-testid="ops-rules-page"]';
  const execute = text => executeCatalogRuntimeOracle({
    browser: fakeBrowser({
      route: "/ops/rules",
      status: 200,
      body: { status: "ok", rules: [] },
      observations: {
        [selector]: {
          count: 1,
          visibleCount: 1,
          text,
          attributes: [{ "data-testid": "ops-rules-page" }],
        },
      },
    }),
    item: exactItem("UI-036", "/ops/rules"),
    actionId: "UI-036:activate-control",
    fixtureId: "ops-rules-no-write-boundary-contract",
    correlationId: "UI-036:contract",
  });

  const safe = await execute("rule write 없음 · provider 호출 없음 · registryWrite=false · providerCall=false");
  assert(safe.dom[0].count === 1, "UI-036 safe no-write/provider boundary DOM evidence missing");
  await expectReject(() => execute("WritePerformed=true"), "forbidden DOM material observed");
  await expectReject(() => execute("providerCall=true"), "forbidden DOM material observed");
});

await check("all negative-boundary families distinguish narrative, inactive, and active material", async () => {
  const descriptors = [
    ["credential", "credential 비노출", "credential=false", "credential=secret-value"],
    ["Debug", "Debug 정보 비노출", "Debug=false", "Debug=true"],
    ["autoApply", "자동 적용 없음", "autoApply=false", "autoApply=true"],
    ["WritePerformed", "rule write 없음", "WritePerformed=false", "WritePerformed=true"],
    ["clientNoticeSent", "발송 없음", "clientNoticeSent=false", "clientNoticeSent=true"],
    ["viewerClientExposure", "viewer/client 비노출", "viewerClientExposure=false", "viewerClientExposure=true"],
    ["providerCall", "provider 호출 없음", "providerCall=false", "providerCall=true"],
    ["rawEvidence", "raw evidence 비노출", "rawEvidence=false", "rawEvidence=unredacted-value"],
    ["sourceUrl", "source URL 비노출", "sourceUrl=false", "sourceUrl=rtsp://camera.invalid/live"],
  ];
  for (const [token, narrative, inactive, active] of descriptors) {
    assert(!containsForbiddenStructuredDomMaterial({ text: narrative, formControls: [] }, token),
      `${token} narrative label must not be material`);
    assert(!containsForbiddenStructuredDomMaterial({ text: inactive, formControls: [] }, token),
      `${token} inactive attestation must not be material`);
    assert(containsForbiddenStructuredDomMaterial({ text: active, formControls: [] }, token),
      `${token} active material must be rejected`);
  }
});

await check("status and response semantic drift are rejected", async () => {
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ status: 503 }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact request status mismatch");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body: eventBody({ activeSessions: 0 }) }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact request assertion failed");
});

await check("DOM response mismatch and forbidden network are rejected", async () => {
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ domText: { "#dashActiveSessions": "99" } }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact DOM semantic assertion failed");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ network: [{ phase: "request-start", method: "POST", url: "http://runtime.invalid/events/leak" }] }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "forbidden network request observed");
});

await check("CLIENT fixture materialization binds assigned and blocked views independently", async () => {
  const browser = fakeBrowser({
    route: "/client/live",
    status: 200,
    body: { views: [{ viewId: "9001", name: "assigned" }] },
    observations: {
      '[data-source-view="9001"]': { count: 1, visibleCount: 1, text: "assigned" },
      '[data-source-view="99002"]': { count: 0, visibleCount: 0, text: "" },
    },
  });
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("CLIENT-001", "/client/live"),
    actionId: "CLIENT-001:assert-product-state",
    fixtureId: "client-runtime-contract",
    bindings: { assignedViewId: "9001", blockedViewId: "99002" },
    correlationId: "CLIENT-001:contract",
  });
  assert(result.dom[0].count === 1 && result.dom[1].count === 0, "assigned/blocked DOM cardinality was not bound independently");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: fakeBrowser({
      route: "/client/live",
      status: 200,
      body: { views: [{ viewId: "9001" }, { viewId: "99002" }] },
      observations: {
        '[data-source-view="9001"]': { count: 1, visibleCount: 1, text: "assigned" },
        '[data-source-view="99002"]': { count: 1, visibleCount: 1, text: "blocked" },
      },
    }),
    item: exactItem("CLIENT-001", "/client/live"),
    actionId: "CLIENT-001:assert-product-state",
    fixtureId: "client-runtime-contract",
    bindings: { assignedViewId: "9001", blockedViewId: "99002" },
    correlationId: "CLIENT-001:contract",
  }), "forbidden response value observed");
});

await check("SAFE DOM structure/material and external capability boundaries are enforced", async () => {
  const makeBrowser = ({ domText = "payloadPreview deliveryAttempted=false", network = [] } = {}) => fakeBrowser({
    route: "/ops",
    status: 200,
    body: "payloadPreview deliveryAttempted=false",
    observations: {
      '[data-testid="ops-home-page"]': { count: 1, visibleCount: 1, text: domText },
      body: { count: 1, visibleCount: 1, text: domText },
    },
    network,
  });
  const execute = browser => executeCatalogRuntimeOracle({
    browser,
    item: exactItem("SAFE-042", "/ops"),
    actionId: "SAFE-042:assert-product-state",
    fixtureId: "safe-runtime-contract",
    correlationId: "SAFE-042:contract",
  });
  const result = await execute(makeBrowser());
  assert(result.dom.some(item => item.selector === '[data-testid="ops-home-page"]' && item.count === 1),
    "SAFE route-local DOM structure assertion was not executed");
  await expectReject(() => execute(makeBrowser({
    domText: "payloadPreview deliveryAttempted=false endpointSecret=live-secret",
  })), "forbidden DOM material observed");
  await expectReject(() => execute(makeBrowser({
    network: [{ phase: "request-start", method: "POST", url: "https://example.invalid/webhook/delivery" }],
  })), "forbidden external capability request observed");
});

await check("CLIENT control sequence binds POST session id to DELETE and DOM history", async () => {
  const result = await executeCatalogRuntimeOracle({
    browser: clientSequenceBrowser(),
    item: exactItem("CLIENT-020", "/client/live"),
    actionId: "CLIENT-020:assert-product-state",
    fixtureId: "client-sequence-contract",
    bindings: { assignedViewId: "9001" },
    correlationId: "CLIENT-020:contract",
  });
  assert(result.interaction.propertyHistory.ariaLabelSequence.join("|") ===
    "타일 1 정지|타일 1 재생|타일 1 정지",
    "CLIENT-020 aria-label sequence mismatch");
  assert(result.responses.some(item => item.method === "DELETE" && item.urlPath.endsWith("/live-session-1")),
    "CLIENT-020 DELETE was not rebound to the created session ID");
  assert(result.cleanup?.strategy === "stop-live-session" && result.cleanup?.paused === true,
    "CLIENT-020 final live session was not cleaned up");
});

await check("CLIENT composed sessions are UI-created and VA sample bindings fail closed", async () => {
  const activeSessionSpec = {
    caseId: "CLIENT-005",
    setup: { fixtures: ["assigned-view", "active-live-session"] },
    action: { kind: "activate" },
  };
  const active = validateClientRuntimeFixtureBindings(activeSessionSpec, { sessionId: "" });
  assert(active.uiCreatesSession === true,
    "CLIENT-005 did not require a UI-created session");
  await expectReject(() => Promise.resolve(validateClientRuntimeFixtureBindings(
    activeSessionSpec,
    { sessionId: "backend-precreated-session" },
  )), "rejects a backend-precreated session");

  const vaSpec = {
    caseId: "CLIENT-021",
    setup: { fixtures: ["assigned-view", "va-metadata-sample"] },
    action: { kind: "activate" },
  };
  const va = validateClientRuntimeFixtureBindings(vaSpec, {
    sessionId: "",
    vaMetadataSampleId: "va-sample-21",
  });
  assert(va.uiCreatesSession === true && va.vaMetadataSampleRequired === true,
    "CLIENT-021 UI-created VA session contract missing");
  await expectReject(() => Promise.resolve(validateClientRuntimeFixtureBindings(
    vaSpec,
    { sessionId: "", vaMetadataSampleId: "" },
  )), "VA metadata sample binding is missing");
  await expectReject(() => Promise.resolve(validateClientRuntimeFixtureBindings(
    vaSpec,
    { sessionId: "backend-precreated-session", vaMetadataSampleId: "va-sample-21" },
  )), "rejects a backend-precreated session");
});

await check("CLIENT-021 waits for bound product VA event projection and fails closed", async () => {
  const calls = [];
  const browser = {
    evaluate: async source => {
      calls.push(String(source));
      return {
        modeActive: true,
        statusOnline: true,
        infoOverlayVisible: true,
        apiStatus: 200,
        eventProjection: {
          eventId: "va-sample-21",
          label: "person",
          eventType: "presence",
          status: "open",
        },
        metadataReceived: true,
        trackCount: 1,
        eventCount: 1,
        safeProjectionRendered: true,
      };
    },
  };
  const observed = await waitForClientVaOverlayProjection(browser, {
    caseId: "CLIENT-021",
    tileSelector: '[data-tile="0"]',
    viewId: "9001",
    vaMetadataSampleId: "va-sample-21",
    timeoutMs: 1_000,
    pollIntervalMs: 50,
  });
  assert(observed.sampleId === "va-sample-21" &&
    observed.eventType === "presence" &&
    observed.eventStatus === "open" &&
    observed.metadataReceived === true &&
    observed.safeProjectionRendered === true,
  "CLIENT-021 safe VA event projection evidence mismatch");
  assert(calls.length === 1 &&
    calls[0].includes("while (Date.now() <= deadline)") &&
    calls[0].includes("/events?limit=6") &&
    calls[0].includes("#liveDockEvents") &&
    calls[0].includes("lastMetadataAt") &&
    calls[0].includes('[data-role="tracks"]') &&
    calls[0].includes('[data-role="events"]') &&
    calls[0].includes("statusOnline") &&
    calls[0].includes("infoOverlayVisible"),
  "CLIENT-021 bounded product wait does not bind API, DOM, and async tile state");
  await expectReject(() => waitForClientVaOverlayProjection(browser, {
    caseId: "CLIENT-021",
    tileSelector: '[data-tile="0"]',
    viewId: "9001",
    vaMetadataSampleId: "",
  }), "VA metadata sample binding is missing");
  const mismatchBrowser = {
    evaluate: async () => ({
      modeActive: true,
      statusOnline: true,
      infoOverlayVisible: true,
      apiStatus: 200,
      eventProjection: {
        eventId: "other-sample",
        label: "person",
        eventType: "presence",
        status: "open",
      },
      metadataReceived: true,
      trackCount: 1,
      eventCount: 1,
      safeProjectionRendered: true,
    }),
  };
  await expectReject(() => waitForClientVaOverlayProjection(mismatchBrowser, {
    caseId: "CLIENT-021",
    tileSelector: '[data-tile="0"]',
    viewId: "9001",
    vaMetadataSampleId: "va-sample-21",
  }), "VA overlay projection did not reach the exact terminal state");
});

await check("EVT-048 binds a deterministic response-derived baseline to current catalog state", async () => {
  const responses = [
    {
      sessionManager: {
        activeSessions: 2,
        registryActiveStreams: 3,
        resourceActiveStreams: 99,
        activeAnalysisTaps: 4,
      },
      webrtcHttp: {
        metadataSideChannel: { activeSseClients: 1, activeWebSocketClients: 2 },
        metadataDataChannel: { channels: [{}, {}] },
      },
      analysisMatching: { activeTapCount: 98 },
    },
    {
      summary: { total: 1, live: 1 },
      sourceHealth: [{ sourceId: "9001", status: "live" }],
    },
    {
      records: { records: [{ eventId: "evt-048-review4-fixture" }] },
    },
  ];
  const expected = dashboardRuntimeTrendSample(responses);
  assert(JSON.stringify(expected) === JSON.stringify({
    sessions: 2,
    streams: 3,
    taps: 4,
    metadataClients: 5,
    liveSources: 1,
    sourceTotal: 1,
    eventRecords: 1,
    loadScore: 15,
  }), `EVT-048 product-equivalent trend derivation drift: ${JSON.stringify(expected)}`);
  const catalogBindings = {};
  const runtimeBindings = { sourceId: "9001" };
  const baseline = bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: responses,
    runtimeBindings,
    catalogBindings,
  });
  assert(JSON.stringify(catalogBindings.runtimeTrendBaseline) === JSON.stringify(baseline) &&
    JSON.stringify(runtimeBindings.runtimeTrendBaseline) === JSON.stringify(baseline),
  "EVT-048 baseline did not bind to both current catalog and runtime observations");
  bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: responses,
    runtimeBindings,
    catalogBindings,
  });

  const missingSource = structuredClone(responses);
  missingSource[1].sourceHealth = [{ sourceId: "other-source", status: "live" }];
  await expectReject(() => Promise.resolve(bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: missingSource,
    runtimeBindings: { sourceId: "9001" },
    catalogBindings: {},
  })), "default published source is not uniquely present");

  const duplicateSource = structuredClone(responses);
  duplicateSource[1].sourceHealth.push({ sourceId: "9001", status: "live" });
  await expectReject(() => Promise.resolve(bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: duplicateSource,
    runtimeBindings: { sourceId: "9001" },
    catalogBindings: {},
  })), "default published source is not uniquely present");

  await expectReject(() => Promise.resolve(bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: responses,
    runtimeBindings: { sourceId: "9001" },
    catalogBindings: { runtimeTrendBaseline: { ...expected, sessions: 999 } },
  })), "current case runtime trend baseline drift");

  await expectReject(() => Promise.resolve(bindDashboardRuntimeTrendBaseline({
    item: { caseId: "EVT-048" },
    responseBodies: responses,
    runtimeBindings: { sourceId: "9001" },
    catalogBindings: null,
  })), "current case catalogBindings are required");
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`[${item.status.toLowerCase()}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 exact runtime oracle contract summary ==");
console.log(`- pass: ${checks.length - failures.length}`);
console.log(`- fail: ${failures.length}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (failures.length > 0) process.exit(1);

function exactItem(caseId, route) {
  return {
    caseId,
    workflow: {
      workflowClass: "read-only-state",
      primaryControl: { selector: "body" },
    },
    screenRoute: route,
  };
}

function primaryControlItem(selector, route) {
  return {
    ...exactItem("UI-009", route),
    workflow: {
      workflowClass: "read-only-state",
      primaryControl: {
        applicability: "required",
        selector,
        route,
        expectedVisible: true,
        expectedEnabled: true,
      },
    },
  };
}

function eventBody({ activeSessions = 2 } = {}) {
  return {
    ok: true,
    debugCounters: {
      activeRequests: 2,
      completedRequests: 4,
      analysisTapReuseKey: "profile:test|stream:test",
    },
    sessionManager: {
      activeSessions,
      activeAnalysisTaps: 1,
      registryActiveStreams: 3,
      resourceActiveStreams: 3,
    },
    analysisMatching: { activeTapCount: 1 },
    webrtcHttp: { publishSources: ["one"] },
  };
}

function eventBrowser({ status = 200, body = eventBody(), domText = {}, network = [] } = {}) {
  const texts = {
    "#dashActiveSessions": String(body.sessionManager?.activeSessions ?? 0),
    "#dashActiveStreams": String(body.sessionManager?.registryActiveStreams ?? 0),
    "#dashActiveTaps": String(body.sessionManager?.activeAnalysisTaps ?? 0),
    "#dashPublishSources": String(body.webrtcHttp?.publishSources?.length ?? 0),
    ...domText,
  };
  return fakeBrowser({ route: "/ops/dashboard", status, body, texts, network });
}

function coreBrowser({ attributes = [{ "data-testid": "ops-home-page" }] } = {}) {
  const body = '<section class="ops-workspace-home" data-testid="ops-home-page">AppendOpsHomePage</section>';
  return {
    ...fakeBrowser({
    route: "/ops/home",
    status: 200,
    body,
    texts: { '[data-testid="ops-home-page"]': "ops-workspace-home" },
    attributes: { '[data-testid="ops-home-page"]': attributes },
    }),
    runtimeCorrelationOptionalForContract: true,
  };
}

function authMutationBrowser() {
  const selector = '[data-testid="ops-users-page"]';
  return fakeBrowser({
    route: "/ops/users",
    status: 200,
    body: '<main data-testid="ops-users-page">users</main>',
    texts: { [selector]: "users" },
    attributes: { [selector]: [{ "data-testid": "ops-users-page" }] },
  });
}

function clientLiveBrowser(body) {
  const selector = '[data-testid="client-live-action-reduction"]';
  const workspaceSelector = '[data-testid="client-live-workspace"]';
  return fakeBrowser({
    route: "/client/live",
    status: 200,
    body,
    texts: { [selector]: "viewer-safe", [workspaceSelector]: "viewer-safe" },
    attributes: {
      [selector]: [{ "data-testid": "client-live-action-reduction" }],
      [workspaceSelector]: [{ "data-testid": "client-live-workspace" }],
    },
  });
}

function fakeBrowser({ route, status, body, texts = {}, attributes = {}, observations = {}, network = [] }) {
  const entries = [...network];
  let networkReads = 0;
  let correlationId = "";
  const fixtureIdentityRegistries = new Map();
  const appendFixtureRequestResponse = ({
    caseId,
    method,
    urlPath,
    requestCorrelationId,
    requestKind = "application-fetch",
  }) => {
    let registry = fixtureIdentityRegistries.get(caseId);
    if (!registry) {
      registry = createCaseOwnedRequestIdentityRegistry({
        caseId,
        requestIdPrefix: "contract-request",
      });
      fixtureIdentityRegistries.set(caseId, registry);
    }
    const requestHandle = {};
    const requestIdentity =
      registry.registerFixtureRequestHandle(requestHandle);
    const responseBinding = bindFixtureResponseToInitiatingRequest({
      initiatingRequestHandle: requestHandle,
    }, registry);
    if (responseBinding.initiatingRequest !== requestIdentity) {
      throw new Error("fixture initiating request handle binding failed");
    }
    entries.push({
      phase: "request-start",
      ...requestIdentity,
      requestKind,
      correlationId: String(requestCorrelationId || ""),
      correlationSource: requestCorrelationId ? "request-header" : "none",
      method,
      url: `http://runtime.invalid${urlPath}`,
    }, {
      phase: "response",
      ...responseBinding.initiatingRequest,
      requestKind,
      correlationId: String(requestCorrelationId || ""),
      correlationSource: requestCorrelationId ? "request-header" : "none",
      responseCorrelationSource: requestCorrelationId
        ? "initiating-request-identity"
        : "none",
      responseRequestObjectObserved: true,
      requestIdentitySource: "fixture-initiating-request-handle",
      responseEchoHeaderContract: "not-required",
      responseEchoHeaderObserved: false,
      method,
      url: `http://runtime.invalid${urlPath}`,
      status,
    });
  };
  return {
    networkEntries: () => (++networkReads === 1 ? [] : entries),
    requestListenersInstalled: () => true,
    setCorrelationId: async value => { correlationId = String(value || ""); },
    waitForSelector: async () => {},
    snapshot: async selector => ({ exists: true, visible: true, disabled: false, selector }),
    click: async () => {},
    waitForNetworkQuiet: async () => {},
    request: async ({
      method = "GET",
      urlPath,
      actionId = "",
      correlationId: requestCorrelationId = "",
    }) => {
      const caseId = String(actionId || requestCorrelationId || "CONTRACT").split(":")[0];
      const requestMethod = String(method).toUpperCase();
      appendFixtureRequestResponse({
        caseId,
        method: requestMethod,
        urlPath,
        requestCorrelationId,
      });
      return {
        status,
        url: `http://runtime.invalid${urlPath}`,
        text: typeof body === "string" ? body : JSON.stringify(body),
        json: typeof body === "object" ? body : null,
        contentType: typeof body === "object" ? "application/json" : "text/html",
        actionId: String(actionId),
        requestKind: "application-fetch",
        requestAttemptCount: 1,
        requestReissued: false,
        listenerInstalledBeforeRequest: true,
        ledgerSettled: true,
      };
    },
    evaluate: async script => {
      if (script === "location.pathname") return route;
      if (String(script).startsWith("fetch(")) {
        const source = String(script);
        const path = source.match(/^fetch\(("(?:[^"\\]|\\.)*")/s)?.[1];
        const method = source.match(/method:\s*"([A-Z]+)"/)?.[1] || "GET";
        const url = path ? JSON.parse(path) : "/contract-fetch-path-missing";
        const caseId = String(correlationId || "CONTRACT").split(":")[0];
        appendFixtureRequestResponse({
          caseId,
          method,
          urlPath: url,
          requestCorrelationId: correlationId,
        });
        return { status, text: typeof body === "string" ? body : JSON.stringify(body), json: typeof body === "object" ? body : null, contentType: typeof body === "object" ? "application/json" : "text/html" };
      }
      const selector = [...Object.keys(observations), ...Object.keys(texts), ...Object.keys(attributes)].find(value => String(script).includes(JSON.stringify(value)));
      const observation = selector ? observations[selector] : null;
      return {
        count: observation?.count ?? (selector ? 1 : 0),
        visibleCount: observation?.visibleCount ?? (selector ? 1 : 0),
        text: observation?.text ?? (selector ? String(texts[selector] || "") : ""),
        attributes: observation?.attributes ?? (selector ? (attributes[selector] || [{}]) : []),
        values: [""],
        formControls: observation?.formControls ?? [],
        descendantCount: 0,
        properties: {},
      };
    },
  };
}

function clientSequenceBrowser() {
  const entries = [];
  let clickCount = 0;
  let state = { ariaLabel: "타일 1 재생", paused: true };
  const response = (method, path, body) => entries.push({
    phase: "response",
    method,
    url: `http://runtime.invalid${path}`,
    status: 200,
    correlationId: "CLIENT-020:contract",
    safeResponseBody: body,
  });
  return {
    networkEntries: () => entries,
    setCorrelationId: async () => {},
    snapshot: async selector => ({ exists: true, visible: true, disabled: false, selector }),
    waitForNetworkQuiet: async () => {},
    click: async () => {
      clickCount += 1;
      if (clickCount === 1) {
        state = { ariaLabel: "타일 1 정지", paused: false };
        response("POST", "/client/api/views/9001/webrtc/session", { sessionId: "live-session-1" });
      } else if (clickCount === 2) {
        state = { ariaLabel: "타일 1 재생", paused: true };
        response("DELETE", "/client/api/views/9001/webrtc/session/live-session-1", { ok: true });
      } else if (clickCount === 3) {
        state = { ariaLabel: "타일 1 정지", paused: false };
        response("POST", "/client/api/views/9001/webrtc/session", { sessionId: "live-session-2" });
      } else {
        state = { ariaLabel: "타일 1 재생", paused: true };
        response("DELETE", "/client/api/views/9001/webrtc/session/live-session-2", { ok: true });
      }
    },
    evaluate: async script => {
      if (script === "location.pathname") return "/client/live";
      if (script === "Boolean(document.querySelector('video')?.paused)") return state.paused;
      if (String(script).includes("ariaLabel:") && String(script).includes("paused:")) return state;
      return {
        count: 1,
        visibleCount: 1,
        text: "",
        attributes: [{}],
        values: [""],
        descendantCount: 0,
        properties: {},
      };
    },
  };
}

async function expectReject(fn, message) {
  let error = "";
  try { await fn(); } catch (caught) { error = String(caught?.message || caught); }
  assert(error.includes(message), `expected rejection '${message}', got '${error}'`);
}

function assertCompositeFailure(evidence, expectedCause) {
  assert(evidence.pass === false, `${expectedCause} composite failure unexpectedly passed`);
  assert(evidence.error?.code === "EVT_DOM_SEMANTIC_COMPOSITE_FAILED",
    `${expectedCause} structured error code is missing`);
  assert(evidence.failedChecks.length === 1 && evidence.failedChecks[0] === expectedCause,
    `${expectedCause} was not isolated in structured failure evidence`);
  assert(evidence.error.causes.length === 1 && evidence.error.causes[0] === expectedCause,
    `${expectedCause} structured error cause is ambiguous`);
}

function assertCompositeDigestsAreSha256(evidence) {
  const sha256 = /^[0-9a-f]{64}$/;
  assert(sha256.test(evidence.observationPresent.selectorDigest) &&
    sha256.test(evidence.observationPresent.textDigest) &&
    sha256.test(evidence.fixtureObserved.observationDigest),
  "observation/fixture evidence digest is not SHA-256");
  for (const pathEvidence of evidence.responseBaselineMatched.paths) {
    assert(sha256.test(pathEvidence.baselineDigest) &&
      sha256.test(pathEvidence.projectionDigest) &&
      sha256.test(pathEvidence.candidateDigest) &&
      pathEvidence.candidateDigests.every(digest => sha256.test(digest)),
    `response baseline evidence digest is not SHA-256: ${pathEvidence.path}`);
  }
  assert(sha256.test(evidence.fixtureObserved.candidateDigest) &&
    sha256.test(evidence.fixtureObserved.matchedCandidateDigest) &&
    evidence.fixtureObserved.candidateDigests.every(digest => sha256.test(digest)) &&
    evidence.fixtureObserved.matchedCandidateDigests.every(digest => sha256.test(digest)),
  "fixture identity evidence digest is not SHA-256");
}

async function check(name, fn) {
  try { await fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", error: String(error?.message || error) }); }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function actualEndpointResponseEntry({
  method,
  path,
  status,
  correlationId,
  payload,
  expectProjectionFailure = false,
}) {
  const entry = {
    phase: "response",
    requestId: "runtime-contract-request",
    correlationId,
    correlationSource: "request-header",
    method,
    status,
    httpOk: status >= 200 && status < 300,
    url: `http://runtime.invalid${path}`,
    responseHeaders: { "content-type": "application/json" },
  };
  const pending = new Set();
  const failures = [];
  const request = { method: () => method };
  const response = {
    request: () => request,
    url: () => entry.url,
    json: async () => structuredClone(payload),
  };
  const read = captureEndpointOwnedResponseProjection({
    response,
    entry,
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
  });
  assert(read, `${method} ${path} did not enter the native response listener`);
  await read;
  assert(pending.size === 0, `${method} ${path} response projection remained pending`);
  if (expectProjectionFailure) {
    assert(failures.length === 1 && !entry.safeResponseBody,
      `${method} ${path} missing body did not fail closed`);
  } else {
    assert(failures.length === 0 && entry.safeResponseBody,
      `${method} ${path} actual response projection failed: ${failures.join(",")}`);
  }
  return entry;
}
