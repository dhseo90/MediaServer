#!/usr/bin/env node
// 파일 용도: exact 424 runtime oracle 실행기가 status/DOM/network 누락을 거짓 PASS로 처리하지 않는지 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";

import {
  applyDeclaredVisibleControlValue,
  bindDashboardRuntimeTrendBaseline,
  assertExclusiveRequestScopedCorrelation,
  buildExclusiveRequestScopedCorrelationEvidence,
  buildEventDomSemanticCompositeEvidence,
  buildEventReviewRenderRequestBindingEvidence,
  materializeEventReviewProductRenderPath,
  buildExactDomAttributeBindingEvidence,
  buildEventMarkerFlowEvidence,
  buildEvt004MarkerStageEvidence,
  buildCatalogRuntimeMutationOwnershipPlan,
  buildMarkerEvaluatorLifecycleFailureEvidence,
  buildOwnedRefreshStabilityEvidence,
  buildRequestSemanticAssertionEvidence,
  buildResponseDerivedEventDomProjectionEvidence,
  containsForbiddenResponseMaterial,
  containsForbiddenStructuredDomMaterial,
  dashboardRuntimeTrendSample,
  executeCatalogRuntimeOracle,
  executeCatalogRuntimeOracleAtSourceRoute,
  evaluateEventMarkerFlowEvidence,
  evaluateRuntimeStatusPseudoFieldAssertion,
  responsePseudoFieldValues,
  selectCatalogRuntimeMutationResponse,
  selectEventDomResponseBaselines,
  validateEventDomSemanticCompositeEvidence,
  validateRuntimeAttributeOwners,
  validateClientRuntimeFixtureBindings,
  waitForClientVaOverlayProjection,
} from "./v390_ui_exact_oracle_runtime.mjs";
import * as exactRuntime from "./v390_ui_exact_oracle_runtime.mjs";
import {
  buildDiagnosticMarkerFileStageEvidence,
  buildEvt004TimelineOwnershipEvidence,
  eventTypedResponseBinding,
  usesEventExactRuntimeBindings,
} from "./v390_ui_case_runtime.mjs";
import * as caseRuntime from "./v390_ui_case_runtime.mjs";
import {
  bindFixtureResponseToInitiatingRequest,
  buildDiagnosticMarkerResponseStageEvidence,
  captureEndpointOwnedResponseProjection,
  createCaseOwnedRequestIdentityRegistry,
} from "./v390_ui_native_adapter.mjs";
import {
  validateIncidentMemorySearchResponseProjection,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";

const checks = [];
const runtimeSource = fs.readFileSync(
  new URL("./v390_ui_exact_oracle_runtime.mjs", import.meta.url),
  "utf8",
);
const browserCallbackSource = fs.readFileSync(
  new URL("./v390_ui_browser_callback_boundary.mjs", import.meta.url),
  "utf8",
);
const runtimeBrowserSource = `${runtimeSource}\n${browserCallbackSource}`;
const dynamicRegExpAudit = auditInternalDynamicRegExpBoundaries();

await check("event review renderer materializes the exact product query envelope", async () => {
  assert(materializeEventReviewProductRenderPath(
    "/ops/api/events/reviews?q=fixture&ruleId=1&sourceId=9001&incidentStatus=new",
  ) === "/ops/api/events/reviews?limit=25&offset=0&q=fixture&ruleId=1&sourceId=9001&incidentStatus=new&v300Q=fixture",
  "event review product query did not preserve the canonical paging prefix");
  assert(materializeEventReviewProductRenderPath(
    "/ops/api/events/reviews?selectedEventId=fixture",
  ) === null,
  "authoritative selected-event readback was misclassified as a renderer filter request");
  assert(materializeEventReviewProductRenderPath(
    "/ops/api/events/reviews?limit=99&q=fixture",
  ) === null,
  "declared paging override was accepted as a product renderer request");
});

await check("event review renderer owns and awaits one dedicated product fetch", async () => {
  const executeStart = runtimeSource.indexOf("async function executeTrustedInteraction(");
  const executeEnd = runtimeSource.indexOf("\nasync function completeDeclaredObservationInteraction(", executeStart);
  const begin = runtimeSource.indexOf("async function beginEventReviewRenderProjection(");
  const start = runtimeSource.indexOf("async function materializeEventReviewRenderProjection(");
  const end = runtimeSource.indexOf("\nexport function correlatedMutationRequestResponseEnvelope", start);
  assert(executeStart >= 0 && executeEnd > executeStart &&
    begin >= 0 && begin < start && end > start,
    "event review renderer pre-interaction ownership function is missing");
  const execute = runtimeSource.slice(executeStart, executeEnd);
  const preInteraction = runtimeSource.slice(begin, start);
  const source = runtimeSource.slice(start, end);
  assert(preInteraction.includes("beginRequestActionOwnership") &&
    preInteraction.includes("registerRequestActionEnvelope") &&
    source.includes("waitForRequestActionResponses") &&
    source.includes("endRequestActionOwnership"),
  "event review renderer does not own one awaited product request lifecycle");
  assert(preInteraction.includes("event-review-render") &&
    source.includes("ownership.requestActionContext") &&
    execute.includes("event-review-render-deferred") &&
    execute.indexOf("event-review-render-deferred") < execute.indexOf("browser.click(selector)") &&
    runtimeSource.includes("const ownsEventReviewRender = Boolean(eventReviewRenderOwnership)") &&
    !preInteraction.includes('"selectedEventId"') &&
    runtimeSource.indexOf("eventReviewRenderOwnership,") <
      runtimeSource.indexOf("materializeEventReviewRenderProjection({"),
    "event review renderer ownership or pre-interaction ordering is not explicit");
});

await check("page-owned refresh does not require an unused action context", async () => {
  const executeStart = runtimeSource.indexOf("async function executeTrustedInteraction(");
  const executeEnd = runtimeSource.indexOf(
    "\nasync function completeDeclaredObservationInteraction(",
    executeStart,
  );
  const execute = runtimeSource.slice(executeStart, executeEnd);
  assert(!execute.includes("refresh interaction request-action context is missing"),
    "page-owned refresh still requires an unused action context");
});

await check("fixture-derived literals use one serializable non-RegExp matcher", async () => {
  assert(typeof exactRuntime.matchesDeclaredLiteral === "function",
    "shared declared literal matcher is missing");
  assert(typeof exactRuntime.buildDeclaredLiteralMatchEvidence === "function",
    "shared declared literal audit evidence builder is missing");
  const literals = [
    "[", "]", "{", "}", "(", ")", "*", "+", "?", ".", "^", "$", "|", "\\", "/",
    "[]{}()*+?.^$|\\/",
  ];
  for (const literal of literals) {
    const containing = `prefix (${literal}) suffix`;
    assert(exactRuntime.matchesDeclaredLiteral(containing, literal, "marker-token") === true,
      `literal metacharacter did not match exactly: ${JSON.stringify(literal)}`);
    assert(exactRuntime.matchesDeclaredLiteral(`prefix (${literal}x) suffix`, literal, "marker-token") === false,
      `literal metacharacter accepted a substring: ${JSON.stringify(literal)}`);
    const browserExpression = `(${exactRuntime.matchesDeclaredLiteral.toString()})(${JSON.stringify(containing)},${JSON.stringify(literal)},"marker-token")`;
    assert((0, eval)(browserExpression) === true,
      `serialized browser literal matcher drifted: ${JSON.stringify(literal)}`);
  }
  const sensitiveInput = "fixture[meta]{value}(literal)*+?.^$|\\/";
  const evidence = exactRuntime.buildDeclaredLiteralMatchEvidence({
    callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
    input: sensitiveInput,
    flags: "none",
    intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
  });
  assert(evidence.callsite === "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker" &&
    /^[0-9a-f]{64}$/.test(evidence.patternSourceDigest) &&
    /^[0-9a-f]{64}$/.test(evidence.inputDigest) &&
    evidence.inputLength === sensitiveInput.length &&
    evidence.regexMetacharacterKinds.join("") === "[]{}()*+?.^$|\\/" &&
    evidence.flags === "none" &&
    evidence.intendedMatchingSemantics === "nfkc-collapse-whitespace-exact-literal-token-boundary" &&
    !JSON.stringify(evidence).includes(sensitiveInput),
  "literal matcher audit evidence is incomplete or retained raw input");
});

await check("canonical exact runtime has zero dynamic RegExp constructors", async () => {
  const constructorSites = [...runtimeSource.matchAll(/\bnew\s+RegExp\s*\(/g)];
  assert(constructorSites.length === 0,
    `unsafe dynamic RegExp constructor count is ${constructorSites.length}, expected 0`);
  assert(dynamicRegExpAudit.bareConstructorSites === 0 &&
    dynamicRegExpAudit.pageEvaluateDynamicConstructorSites === 0 &&
    dynamicRegExpAudit.fixtureDerivedLiteralConstructorSites === 0 &&
    dynamicRegExpAudit.canonicalEvaluatorUnsafeConstructorSites === 0 &&
    dynamicRegExpAudit.canonicalEvaluatorExplicitValidatedConstructorSites === 1 &&
    dynamicRegExpAudit.canonicalEvaluatorStaticSourceConstructorSites === 1,
  `scripts/internal dynamic RegExp audit failed: ${JSON.stringify(dynamicRegExpAudit)}`);
});

await check("owner/provenance baseline registration rejects duplicate declared owners", async () => {
  assert(typeof caseRuntime.registerEventOwnerProvenanceBaseline === "function",
    "registerEventOwnerProvenanceBaseline is missing");
  const byAssertionKey = {};
  const entries = [];
  const baseline = {
    schema: "media-server.v390-ui-event-request-row-local-baseline.v1",
    provenance: "response",
    requestMethod: "GET",
    requestPathTemplate: "/ops/api/source-health",
    assertionOperator: "equals-seed",
    assertionPath: "sourceHealth[].status",
    collectionPath: "sourceHealth",
    identityPaths: ["sourceId", "id"],
    identityPathMode: "any",
    identityValue: "stream-fixture",
    projectionPath: "status",
    expectedValue: "offline",
    cardinality: { collectionOwner: 1, fixtureRow: 1, value: 1 },
  };
  caseRuntime.registerEventOwnerProvenanceBaseline({ byAssertionKey, entries, baseline });
  assert(entries.length === 1,
    "one declared owner did not register exactly once");
  await expectReject(() => Promise.resolve(
    caseRuntime.registerEventOwnerProvenanceBaseline({ byAssertionKey, entries, baseline }),
  ), "duplicate owner/provenance baseline");
});

await check("EVT-025 response provenance selects one fixture row only inside sourceHealth", async () => {
  const fixtureRow = {
    sourceId: "stream-fixture",
    status: "offline",
    reason: "subscription-missing",
  };
  const response = {
    ok: true,
    schema: "media-server.ops.source-health.v1",
    summary: { sourceId: "stream-fixture", status: "offline" },
    sourceHealth: [fixtureRow],
    diagnostics: { sourceHealth: [structuredClone(fixtureRow)] },
  };
  const binding = eventTypedResponseBinding({
    assertionPath: "sourceHealth[].status",
    operator: "equals-seed",
    fixtureId: "evt-025-review4-fixture",
    sourceId: "stream-fixture",
    responseJson: response,
  });
  assert(binding?.provenance === "response" &&
    binding.collectionPath === "sourceHealth" &&
    binding.identityPaths.join("/") === "sourceId/id" &&
    binding.projectionPath === "status" &&
    binding.expectedValue === "offline" &&
    binding.cardinality?.collectionOwner === 1 &&
    binding.cardinality?.fixtureRow === 1 &&
    binding.cardinality?.value === 1,
  "EVT-025 owner/provenance projection contract is incomplete");

  const duplicateOwnerRow = structuredClone(response);
  duplicateOwnerRow.sourceHealth.push(structuredClone(fixtureRow));
  await expectReject(() => Promise.resolve(eventTypedResponseBinding({
    assertionPath: "sourceHealth[].status",
    operator: "equals-seed",
    fixtureId: "evt-025-review4-fixture",
    sourceId: "stream-fixture",
    responseJson: duplicateOwnerRow,
  })), "typed response fixture cardinality mismatch");
});

await check("EVT-041 typed owner uses documentId and preserves sourceId type/value", async () => {
  const fixtureId = "evt-041-review4-fixture";
  const sourceId = "stream-review4-fixture";
  const fixtureHit = {
    documentId: `event-record:${fixtureId}`,
    sourceKind: "event-record",
    incidentId: `incident:${fixtureId}`,
    sourceId,
    title: "EventRecord presence open",
    summary: "fixture incident memory summary",
    score: 1,
    matchedTerms: ["evt", "041", "review4", "fixture"],
    highlightFragments: ["evt 041 review4 fixture"],
  };
  const sibling = {
    documentId: `review-note:${fixtureId}`,
    sourceKind: "review-note",
    incidentId: `incident:${fixtureId}`,
    sourceId: null,
    title: "review note",
    summary: "legitimate same-incident sibling",
    score: 0.5,
    matchedTerms: ["review4"],
    highlightFragments: ["review4"],
  };
  const response = { memorySearch: { hits: [fixtureHit, sibling] } };
  const bind = body => eventTypedResponseBinding({
    assertionPath: "memorySearch.hits",
    operator: "contains-fixture-document",
    fixtureId,
    sourceId,
    responseJson: body,
  });
  const binding = bind(response);
  assert(binding?.provenance === "response" &&
    binding.collectionPath === "memorySearch.hits" &&
    binding.identityPaths.length === 1 &&
    binding.identityPaths[0] === "documentId" &&
    binding.identityValue === `event-record:${fixtureId}` &&
    binding.authoritativeValuePath === "sourceId" &&
    binding.authoritativeExpectedValue === sourceId,
  "EVT-041 typed fixture owner is not documentId/sourceId bound");

  for (const hits of [
    [sibling],
    [fixtureHit, { ...fixtureHit }],
    [{ ...fixtureHit, documentId: `event-record:other` }, sibling],
    [{ ...fixtureHit, sourceId: 41 }, sibling],
    [{ ...fixtureHit, sourceId: "wrong-source" }, sibling],
  ]) {
    await expectReject(() => Promise.resolve(bind({ memorySearch: { hits } })),
      "typed response");
  }
});

await check("EVT-041 DOM projection binds one typed memorySearch hit to one rendered node", async () => {
  const fixtureId = "evt-041-review4-fixture";
  const documentId = `event-record:${fixtureId}`;
  const fixtureHit = {
    documentId,
    sourceKind: "event-record",
    incidentId: `incident:${fixtureId}`,
    sourceId: "9001",
    matchedTerms: ["evt", "041", "review4", "fixture"],
    highlightFragments: ["evt 041 review4 fixture"],
  };
  const sibling = {
    documentId: `review-note:${fixtureId}`,
    sourceKind: "review-note",
    incidentId: `incident:${fixtureId}`,
    sourceId: null,
    matchedTerms: ["review4"],
    highlightFragments: ["review4"],
  };
  const observed = {
    count: 1,
    visibleCount: 1,
    text: "evt 041 review4 fixture",
    attributes: [{ "data-incident-memory-hit": documentId }],
    values: [""],
    descendantCount: 6,
    semanticNodes: [{
      eventId: documentId,
      attributes: {},
      fields: {
        matchedTerms: [...fixtureHit.matchedTerms],
        highlightFragments: [...fixtureHit.highlightFragments],
      },
    }],
  };
  const evaluate = (operator, target, hits = [fixtureHit, sibling], observation = observed) =>
    buildResponseDerivedEventDomProjectionEvidence({
      caseId: "EVT-041",
      assertion: { operator, target },
      observed: observation,
      responseBodies: [{ memorySearch: { hits } }],
      fixtureCandidates: [fixtureId],
      fixtureIdentity: fixtureId,
      selectedResponseBaselines: {
        [target]: {
          schema: "media-server.v390-ui-event-response-baseline-missing.v1",
        },
      },
    });
  for (const [operator, target] of [
    ["matched-terms-equal-response", "matchedTerms"],
    ["highlight-fragments-equal-response", "highlightFragments"],
  ]) {
    const valid = evaluate(operator, target);
    assert(valid?.pass === true && valid.fieldEvidence?.[0]?.responseOwnerCount === 1,
      `EVT-041 ${target} did not bind one typed response/DOM owner`);
    for (const hits of [
      [sibling],
      [fixtureHit, { ...fixtureHit }, sibling],
      [{ ...fixtureHit, documentId: "event-record:wrong" }, sibling],
    ]) {
      assert(evaluate(operator, target, hits)?.pass === false,
        `EVT-041 ${target} owner mutation unexpectedly passed`);
    }
    assert(evaluate(operator, target, [fixtureHit, sibling], {
      ...observed,
      count: 2,
      visibleCount: 2,
      semanticNodes: [observed.semanticNodes[0], structuredClone(observed.semanticNodes[0])],
    })?.pass === false, `EVT-041 ${target} duplicate DOM owner unexpectedly passed`);
  }
});

await check("EVT-041 product refresh binds one initiating request/response to the rendered owner", () => {
  const correlationId = "evt-041-product-render-correlation";
  const fields = {
    q: "evt-041-review4-fixture",
    ruleId: "1",
    sourceId: "9001",
    incidentStatus: "new",
    startTimeMs: "0",
    endTimeMs: "1786037141023",
  };
  const url = `http://runtime.invalid/ops/api/events/reviews?${new URLSearchParams({
    limit: "25",
    offset: "0",
    ...fields,
    v300Q: fields.q,
  })}`;
  const request = {
    phase: "request-start",
    requestId: "evt-041-product-request",
    caseRequestIdentity: "EVT-041:request-16",
    caseRequestSequence: 16,
    requestKind: "application-fetch",
    sameOrigin: true,
    method: "GET",
    url,
    correlationId,
  };
  const response = {
    ...request,
    phase: "response",
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
  };
  const evaluate = (entries, observation = {
    renderBound: true,
    fixtureOwnerCount: 1,
  }) => buildEventReviewRenderRequestBindingEvidence({
    entries,
    caseId: "EVT-041",
    actionId: "EVT-041:assert-product-state",
    correlationId,
    fields,
    observation,
    ownerKind: "incident-memory",
  });
  assert(evaluate([request, response]).pass === true,
    "EVT-041 product refresh request/response did not bind");
  for (const entries of [
    [],
    [request],
    [request, response, { ...request }, { ...response }],
    [{ ...request, correlationId: "wrong" }, { ...response, correlationId: "wrong" }],
    [{ ...request, caseRequestSequence: 0 }, { ...response, caseRequestSequence: 0 }],
  ]) {
    assert(evaluate(entries).pass === false,
      "EVT-041 invalid product refresh owner unexpectedly passed");
  }
  assert(evaluate([request, response], { renderBound: false, fixtureOwnerCount: 0 }).pass === false,
    "EVT-041 missing product render owner unexpectedly passed");
});

await check("EVT-070 request provenance binds one Playwright request/response identity and exact query map", async () => {
  const expectedQuery = {
    q: "evt-070-review4-fixture",
    ruleId: "1",
    sourceId: "9001",
    incidentStatus: "new",
  };
  const query = "q=evt-070-review4-fixture&ruleId=1&sourceId=9001&incidentStatus=new";
  const url = `http://runtime.invalid/ops/api/events/reviews?${query}`;
  const request = {
    phase: "request-start",
    requestId: "evt-070-request-1",
    caseRequestIdentity: "EVT-070:request-1",
    caseRequestSequence: 1,
    requestKind: "application-fetch",
    resourceType: "fetch",
    sameOrigin: true,
    method: "GET",
    url,
  };
  const response = {
    ...request,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
  };
  const correlationId = "evt-070-correlation";
  Object.assign(request, {
    correlationId,
    correlationSource: "request-header",
  });
  Object.assign(response, {
    correlationId,
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
  });
  const correlationDigest = crypto.createHash("sha256").update(correlationId).digest("hex");
  const requestCorrelationEvidence = {
    schema: "media-server.v390-ui-request-correlation-evidence.v1",
    pass: true,
    expectedActionId: "EVT-070:assert-product-state",
    expectedCaseId: "EVT-070",
    expectedMethod: "GET",
    expectedPath: `/ops/api/events/reviews?${query}`,
    correlationDigest,
    expectedCorrelationDigest: correlationDigest,
    initiatingRequestCorrelationDigest: correlationDigest,
    responseRequestCorrelationDigest: correlationDigest,
    caseRequestIdentity: request.caseRequestIdentity,
    caseRequestSequence: request.caseRequestSequence,
    responseRequestIdentity: response.caseRequestIdentity,
    responseRequestSequence: response.caseRequestSequence,
    requestIdentityMatched: true,
    responseRequestObjectObserved: true,
    requestCandidateCount: 1,
    matchedRequestCount: 1,
    responseCandidateCount: 1,
    matchedResponseCount: 1,
    requestAttemptCount: 1,
    requestReissued: false,
  };
  const baseline = {
    schema: "media-server.v390-ui-event-owner-provenance-baseline.v1",
    provenance: "request",
    collectionPath: "networkEntries",
    fixtureIdentityPaths: ["caseRequestIdentity", "caseRequestSequence", "requestId"],
    valuePath: "url.searchParams",
    cardinality: { collectionOwner: 1, fixtureRow: 1, value: 4 },
    requestMethod: "GET",
    requestPathname: "/ops/api/events/reviews",
    expectedQuery,
  };
  const observed = {
    count: 1,
    visibleCount: 1,
    text: "filtered resolution search",
    attributes: [{}],
    values: ["filtered"],
    descendantCount: 1,
  };
  const unrelatedEntries = [2, 3, 4].flatMap(sequence => {
    const unrelatedUrl = `${url}&ledger=${sequence}`;
    const unrelated = {
      ...request,
      requestId: `evt-070-request-${sequence}`,
      caseRequestIdentity: `EVT-070:request-${sequence}`,
      caseRequestSequence: sequence,
      url: unrelatedUrl,
      correlationId: `unrelated-${sequence}`,
    };
    return [unrelated, { ...unrelated, phase: "response" }];
  });
  const evaluate = (
    networkEntries,
    responseBodies = [],
    correlationEvidence = requestCorrelationEvidence,
    requestActionId = "EVT-070:assert-product-state",
  ) =>
    buildEventDomSemanticCompositeEvidence({
      caseId: "EVT-070",
      selector: "#v320ResolutionSearchMetricsGrid",
      observed,
      networkEntries,
      responseBodies,
      priorResponseByPath: { "q/ruleId/sourceId/incidentStatus": baseline },
      requestCorrelationEvidence: correlationEvidence,
      requestActionId,
      actualBrowserExecution: true,
    });
  const valid = evaluate([...unrelatedEntries, request, response]);
  assert(valid.pass === true &&
    valid.responseBaselineMatched.paths[0]?.bindingMode === "request-query-exact-identity" &&
    valid.responseBaselineMatched.paths[0]?.candidateCount === 1,
  "EVT-070 exact request provenance did not pass");

  const urlFor = value => `http://runtime.invalid/ops/api/events/reviews?${value}`;
  for (const badUrl of [
    urlFor("q=evt-070-review4-fixture&ruleId=1&sourceId=9001"),
    urlFor("q=evt-070-review4-fixture&ruleId=1&sourceId=9001&incidentStatus=new&incidentStatus=open"),
    urlFor("q=evt-070-review4-fixture&ruleId=1&sourceId=9001&incidentStatus=open"),
  ]) {
    const failedEvidence = {
      ...requestCorrelationEvidence,
      expectedPath: new URL(badUrl).pathname + new URL(badUrl).search,
    };
    const failed = evaluate(
      [...unrelatedEntries, { ...request, url: badUrl }, { ...response, url: badUrl }],
      [],
      failedEvidence,
    );
    assert(failed.pass === false,
      `EVT-070 malformed query unexpectedly passed: ${badUrl}`);
  }
  const wrongProvenance = evaluate([], [{
    q: expectedQuery.q,
    ruleId: expectedQuery.ruleId,
    sourceId: expectedQuery.sourceId,
    incidentStatus: expectedQuery.incidentStatus,
  }]);
  assert(wrongProvenance.pass === false &&
    wrongProvenance.responseBaselineMatched.paths[0]?.candidateCount === 0,
  "request provenance was incorrectly satisfied from a response candidate");
  for (const [label, evidence, action] of [
    ["missing-identity", { ...requestCorrelationEvidence, caseRequestIdentity: "" }, requestCorrelationEvidence.expectedActionId],
    ["zero-sequence", { ...requestCorrelationEvidence, caseRequestSequence: 0 }, requestCorrelationEvidence.expectedActionId],
    ["wrong-action", requestCorrelationEvidence, "EVT-070:wrong-action"],
    ["wrong-correlation", { ...requestCorrelationEvidence, correlationDigest: "0".repeat(64) }, requestCorrelationEvidence.expectedActionId],
  ]) {
    assert(evaluate([...unrelatedEntries, request, response], [], evidence, action).pass === false,
      `EVT-070 ${label} binding unexpectedly passed`);
  }
  assert(evaluate([...unrelatedEntries, request, response, { ...request }, { ...response }]).pass === false,
    "EVT-070 duplicate exact request identity unexpectedly passed");
});

await check("incident memory search response evidence is typed, identity-bound, and digest-only", async () => {
  const fixtureId = "evt-041-review4-fixture";
  const query = fixtureId;
  const valid = {
    memorySearch: {
      schema: "media-server.ops.incident-memory-search-view.v1",
      query,
      hits: [{
        documentId: `event-record:${fixtureId}`,
        sourceKind: "event-record",
        incidentId: `incident:${fixtureId}`,
        sourceId: "9001",
        title: "EventRecord presence open",
        summary: "presence person",
        score: 4,
        matchedTerms: ["evt", "041", "review4", "fixture"],
        highlightFragments: ["safe fixture summary"],
      }],
    },
  };
  const evidence = validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: valid,
    fixtureId,
    expectedIncidentId: `incident:${fixtureId}`,
    query,
    sourceId: "9001",
  });
  assert(evidence.hitCount === 1 && evidence.fixtureHitCount === 1 &&
    evidence.matchedTermCount === 4 && evidence.highlightFragmentCount === 1 &&
    /^[a-f0-9]{64}$/.test(evidence.matchedTermsDigest) &&
    /^[a-f0-9]{64}$/.test(evidence.highlightFragmentsDigest) &&
    !JSON.stringify(evidence).includes(fixtureId) &&
    !JSON.stringify(evidence).includes("safe fixture summary"),
  "incident memory response evidence retained raw values or missed typed counts/digests");

  const negatives = [
    ["memorySearch.hits[0].matchedTerms[type]", body => { body.memorySearch.hits[0].matchedTerms = "evt"; }],
    ["memorySearch.hits[0].matchedTerms[count]", body => { body.memorySearch.hits[0].matchedTerms = []; }],
    ["memorySearch.hits[0].matchedTerms[duplicate]", body => { body.memorySearch.hits[0].matchedTerms.push("evt"); }],
    ["memorySearch.hits[fixture-identity]", body => { body.memorySearch.hits[0].incidentId = "other"; }],
    ["memorySearch.hits[0].sourceId", body => { body.memorySearch.hits[0].sourceId = "9002"; }],
    ["memorySearch.hits[documentId][duplicate]", body => {
      body.memorySearch.hits.push(structuredClone(body.memorySearch.hits[0]));
    }],
    ["memorySearch.hits[0].highlightFragments[type]", body => { body.memorySearch.hits[0].highlightFragments = null; }],
    ["memorySearch.hits[0].passwordHash", body => { body.memorySearch.hits[0].passwordHash = "forbidden"; }],
  ];
  for (const [expectedPath, mutate] of negatives) {
    const body = structuredClone(valid);
    mutate(body);
    await expectReject(() => validateIncidentMemorySearchResponseProjection({
      caseId: "EVT-041",
      responseJson: body,
      fixtureId,
      expectedIncidentId: `incident:${fixtureId}`,
      query,
      sourceId: "9001",
    }), expectedPath);
  }
  const sameIncidentSibling = structuredClone(valid);
  sameIncidentSibling.memorySearch.hits.push({
    documentId: `event-review:${fixtureId}`,
    sourceKind: "event-review",
    incidentId: `incident:${fixtureId}`,
    sourceId: null,
  });
  const siblingEvidence = validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: sameIncidentSibling,
    fixtureId,
    expectedIncidentId: `incident:${fixtureId}`,
    query,
    sourceId: "9001",
  });
  assert(siblingEvidence.hitCount === 2 && siblingEvidence.fixtureHitCount === 1,
    "same-incident non-fixture hit changed exact fixture owner cardinality");
});

function assertExactDescendantCaptureContract(source) {
  for (const token of [
    "const descendantSelectors = [...new Set((assertion.assertions || [])",
    "descendantMatches: descendantSelectors.map(descendantSelector =>",
    "const ownerNodes = nodes.filter(node => node.querySelector(descendantSelector))",
    "matches.length === 1 && visibleCount === 1",
    "rootCount: observed.count",
    "visibleRootCount: observed.visibleCount",
    "descendants: observed.descendants",
    "descendantMatches: observed.descendantMatches",
  ]) {
    assert(source.includes(token), `exact descendant capture contract missing: ${token}`);
  }
}

await check("event review descendant capture reaches the semantic evaluator and mutations fail closed", () => {
  assertExactDescendantCaptureContract(runtimeSource);
  for (const [label, mutated] of [
    ["owner-cardinality", runtimeSource.replaceAll(
      "const ownerNodes = nodes.filter(node => node.querySelector(descendantSelector))",
      "const ownerNodes = nodes",
    )],
    ["exact-cardinality", runtimeSource.replaceAll(
      "matches.length === 1 && visibleCount === 1",
      "matches.length > 0 && visibleCount > 0",
    )],
    ["semantic-forwarding", runtimeSource.replaceAll(
      "descendantMatches: observed.descendantMatches",
      "descendantMatches: []",
    )],
  ]) {
    let rejected = false;
    try {
      assertExactDescendantCaptureContract(mutated);
    } catch {
      rejected = true;
    }
    assert(rejected, `${label} descendant capture mutation passed`);
  }
});

await check("EVT-004 marker lifecycle distinguishes hook, file, response, timeline, and DOM failures", async () => {
  const marker = "REVIEW4-EVT-004-LOG-MARKER";
  const file = overrides => buildDiagnosticMarkerFileStageEvidence({
    invocationCount: 1,
    ownedLogPath: "/tmp/owned/.media_server.log",
    productLogPath: "/tmp/owned/.media_server.log",
    marker,
    lines: ["prior", `[review4] auth incident ${marker} password=redacted`],
    ...overrides,
  });
  assert(file({}).pass === true, "exact marker file stage did not pass");
  assert(file({ invocationCount: 0 }).failureCode ===
    "MARKER_RELOCATION_HOOK_INVOCATION_MISMATCH",
  "missing hook was not isolated");
  assert(file({ productLogPath: "/tmp/wrong/.media_server.log" }).failureCode ===
    "MARKER_LOG_FILE_IDENTITY_MISMATCH",
  "wrong product log identity was not isolated");
  assert(file({ lines: ["prior"] }).failureCode === "MARKER_LOG_FILE_MISSING",
    "missing file marker was not isolated");
  assert(file({ lines: [marker, marker] }).failureCode ===
    "MARKER_LOG_FILE_DUPLICATE",
  "duplicate file marker was not isolated");
  const deterministicNoise = Array.from({ length: 96 }, (_, index) =>
    `[review4-noise] EVT-004-OWNED-${String(index).padStart(3, "0")}`);
  const noisyFile = file({
    lines: [...deterministicNoise, `[review4] auth incident ${marker} password=redacted`],
    ownedNoisePrefix: "[review4-noise] EVT-004-OWNED-",
    analysisIsolationEvidence: {
      schema: "media-server.v390-ui-evt004-analysis-isolation-evidence.v1",
      pass: true,
      failureCode: "PASS",
    },
  });
  assert(noisyFile.pass === true &&
    noisyFile.ownedNoiseCount === 96 &&
    noisyFile.apiWindowStartIndex === 17 &&
    noisyFile.markerApiWindowIndex === 79 &&
    noisyFile.markerReverseIndex === 0 &&
    noisyFile.rendererLogSelectedIndex === 0,
  "EVT-004 deterministic accumulated-log window did not retain the marker as the newest matching row");

  const response = captures => buildDiagnosticMarkerResponseStageEvidence({
    marker,
    method: "GET",
    urlPath: "/ops/api/diagnostics/log-tail?limit=80",
    captures,
  });
  assert(response([]).failureCode === "DASHBOARD_MARKER_RESPONSE_MISSING",
    "missing dashboard response was not isolated");
  assert(response([{
    requestId: "request-1",
    responseRequestObjectObserved: true,
    status: 200,
    markerCount: 0,
  }]).failureCode === "DASHBOARD_MARKER_RESPONSE_MARKER_MISSING",
  "dashboard response marker omission was not isolated");
  assert(response([{
    requestId: "request-1",
    responseRequestObjectObserved: true,
    status: 200,
    markerCount: 2,
  }]).failureCode === "DASHBOARD_MARKER_RESPONSE_MARKER_DUPLICATE",
  "dashboard response marker duplication was not isolated");
  assert(response([{
    requestId: "request-1",
    responseRequestObjectObserved: true,
    status: 200,
    markerCount: 1,
    rendererLogSelectedIndex: -1,
  }]).failureCode === "DASHBOARD_MARKER_RENDERER_WINDOW_MISMATCH",
  "marker outside the renderer log window was not isolated");

  const timelineMissing = buildEventMarkerFlowEvidence({
    marker,
    responseBodies: [{ lines: [marker] }],
    observed: { semanticNodeTexts: [], visibleSemanticNodeTexts: [] },
  });
  assert(timelineMissing.failureCode === "TIMELINE_MARKER_NOT_PROJECTED",
    "timeline marker omission was not isolated");
  const domMissing = buildEventMarkerFlowEvidence({
    marker,
    responseBodies: [{ lines: [marker] }],
    observed: { semanticNodeTexts: [marker], visibleSemanticNodeTexts: [] },
  });
  assert(domMissing.failureCode === "DOM_MARKER_NOT_OBSERVED",
    "DOM marker omission was not isolated");

  const stage = buildEvt004MarkerStageEvidence({
    fileStageEvidence: file({}),
    dashboardResponseEvidence: response([{
      requestId: "request-1",
      responseRequestObjectObserved: true,
      status: 200,
      markerCount: 1,
      lineCount: 1,
      rendererLogSelectedIndex: 0,
    }]),
  });
  assert(stage.pass === true, "complete EVT-004 marker stage did not pass");
  assert(!JSON.stringify(stage).includes("/tmp/owned") &&
    !JSON.stringify(stage).includes(marker),
  "marker stage evidence exposed a path or raw marker");
});

await check("declared visible-control values are applied by the exact runtime before observation", async () => {
  const calls = [];
  let selected = "";
  const browser = {
    async waitForSelector(selector, options) { calls.push(["wait", selector, options.state]); },
    async snapshot(selector) {
      calls.push(["snapshot", selector]);
      return { exists: true, visible: true, disabled: false, value: selected, selectedValues: [selected] };
    },
    async select(selector, value) { calls.push(["select", selector, value]); selected = value; },
  };
  const evidence = await applyDeclaredVisibleControlValue(browser, { caseId: "EVT-004" }, {
    visibleControl: { selector: "#dashIncidentTimelineSource", setValue: "log-tail" },
  });
  assert(evidence.status === "PASS" &&
    evidence.candidatePolicy === "exact-first-control" &&
    evidence.expectedValueDigest === evidence.observedValueDigest &&
    JSON.stringify(calls) === JSON.stringify([
      ["wait", "#dashIncidentTimelineSource", "visible"],
      ["snapshot", "#dashIncidentTimelineSource"],
      ["select", "#dashIncidentTimelineSource", "log-tail"],
      ["snapshot", "#dashIncidentTimelineSource"],
    ]),
  "declared filter value did not reach the visible control exactly once");

  let rejected = false;
  try {
    await applyDeclaredVisibleControlValue({
      async waitForSelector() {},
      async snapshot() { return { exists: true, visible: true, disabled: false, value: "source-health", selectedValues: ["source-health"] }; },
      async select() {},
    }, { caseId: "EVT-004" }, {
      visibleControl: { selector: "#dashIncidentTimelineSource", setValue: "log-tail" },
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "wrong declared filter value did not fail closed");
});

await check("EVT-004 test-owned marker digest reaches the DOM evaluator without EventRecord lifecycle crossover", async () => {
  const marker = "REVIEW4-evt-004-review4-fixture-LOG-MARKER";
  const expectedFixtureIdentity = caseRuntime.buildExpectedDiagnosticMarkerIdentity({
    caseId: "EVT-004",
    marker,
  });
  assert(expectedFixtureIdentity.schema ===
    "media-server.v390-ui-expected-fixture-identity.v1" &&
    expectedFixtureIdentity.caseId === "EVT-004" &&
    expectedFixtureIdentity.kind === "diagnostic-log-marker" &&
    expectedFixtureIdentity.markerIdentityDigest ===
      crypto.createHash("sha256").update(marker).digest("hex"),
  "test-owned marker materializer did not produce its immutable digest");

  const runtimeBindings = caseRuntime.exactOracleRuntimeBindings({
    fixtureId: "evt-004-review4-fixture",
    catalogBindings: { expectedFixtureIdentity },
  });
  assert(JSON.stringify(runtimeBindings.expectedFixtureIdentity) ===
    JSON.stringify(expectedFixtureIdentity),
  "exactOracleBindings dropped the test-owned marker identity");
  caseRuntime.assertExpectedFixtureDigestBeforeBrowser({ caseId: "EVT-004" }, {
    expectedFixtureIdentity,
    catalogBindings: {
      logMarker: marker,
      eventExactRuntime: { expectedFixtureIdentity },
    },
  });
  for (const mutation of [
    null,
    { ...expectedFixtureIdentity, markerIdentityDigest: "0".repeat(64) },
    { ...expectedFixtureIdentity, caseId: "EVT-003" },
  ]) {
    let rejected = false;
    try {
      caseRuntime.assertExpectedFixtureDigestBeforeBrowser({ caseId: "EVT-004" }, {
        expectedFixtureIdentity: mutation,
        catalogBindings: {
          logMarker: marker,
          eventExactRuntime: { expectedFixtureIdentity: mutation },
        },
      });
    } catch {
      rejected = true;
    }
    assert(rejected, "missing, wrong, or stale EVT-004 marker digest was accepted before browser startup");
  }

  const literalBaseline = selectEventDomResponseBaselines({
    operator: "text-includes",
    target: "log tail",
  }, {});
  assert(Object.keys(literalBaseline).length === 0,
    "literal text-includes was incorrectly treated as a response path");

  const badgeEvidence = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-004",
    selector: "#dashIncidentTimelineBadges",
    observed: {
      count: 1,
      visibleCount: 1,
      text: "log tail 1",
      descendantCount: 1,
      attributes: [],
      values: [],
      properties: {
        routeLocalIncidentTimeline: {
          routePath: "/ops/dashboard",
          lifecycleObserved: true,
          containerCount: 1,
        },
      },
    },
    priorResponseByPath: literalBaseline,
    expectedFixtureIdentity,
    actualBrowserExecution: true,
  });
  assert(badgeEvidence.pass === true &&
    !Object.hasOwn(badgeEvidence, "routeLocalDomBinding") &&
    badgeEvidence.responseBaselineMatched.pathCount === 0,
  "EVT-004 badge assertion crossed into EventRecord digest/baseline lifecycle");

  const markerInput = {
    caseId: "EVT-004",
    marker,
    expectedFixtureIdentity,
    responseBodies: [{ lines: [marker] }],
    observed: {
      semanticNodeTexts: [marker],
      semanticNodeKinds: ["log-tail"],
      visibleSemanticNodeTexts: [marker],
      visibleSemanticNodeKinds: ["log-tail"],
      properties: {
        routeLocalIncidentTimeline: {
          markerProjection: {
            literalMatchEvidence: exactRuntime.buildDeclaredLiteralMatchEvidence({
              callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
              input: marker,
              flags: "none",
              intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
            }),
            routeOwner: "/ops/dashboard",
            rendererContainerSelector: "#dashIncidentTimeline",
            response: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest] },
            classifier: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], result: "included", reason: "formal-incident-pattern" },
            sorted: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], exclusionReason: "" },
            filtered: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], exclusionReason: "" },
            bounded: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], exclusionReason: "" },
            rendererInput: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], exclusionReason: "" },
            dom: { inputCount: 1, outputCount: 1, markerDigests: [expectedFixtureIdentity.markerIdentityDigest], matchedNodeCount: 1 },
          },
        },
      },
    },
  };
  assert(buildEventMarkerFlowEvidence(markerInput).pass === true,
    "test-owned marker digest did not bind response/timeline/DOM");
  for (const [label, identity, code] of [
    ["missing", null, "EXPECTED_FIXTURE_DIGEST_MISSING"],
    ["changed", { ...expectedFixtureIdentity, markerIdentityDigest: "0".repeat(64) },
      "EXPECTED_FIXTURE_DIGEST_MISMATCH"],
    ["stale", { ...expectedFixtureIdentity, caseId: "EVT-003" },
      "EXPECTED_FIXTURE_DIGEST_CASE_MISMATCH"],
  ]) {
    const evidence = buildEventMarkerFlowEvidence({
      ...markerInput,
      expectedFixtureIdentity: identity,
    });
    assert(evidence.pass === false && evidence.failureCode === code,
      `${label} marker digest did not fail closed: ${evidence.failureCode}`);
  }
});

await check("EVT-004 removes only acceptance-owned canonical timeline residue", async () => {
  const owned = (kind, index) => ({
    stableIdentity: `${kind}:review4-owned-${index}`,
    owned: true,
    ownerLabel: `review4-owned-${kind}`,
    firstCreatorCase: kind === "root-cause" ? "EVT-001" : `PRIOR-${index}`,
    originRoute: `/ops/api/${kind}`,
    originService: `${kind}-service`,
    backingOwner: `${kind}-registry`,
  });
  const evidence = buildEvt004TimelineOwnershipEvidence({
    rootCandidates: [owned("root-cause", 1), owned("root-cause", 2)],
    sourceCandidates: [
      owned("source-health", 1),
      owned("source-health", 2),
      owned("source-health", 3),
    ],
    ruleCandidates: [
      owned("rule-warning", 1),
      owned("rule-warning", 2),
      owned("rule-warning", 3),
    ],
    logCandidates: [{
      stableIdentity: "log-tail:evt004-marker",
      owned: false,
      ownerLabel: "evt004-marker-fixture",
      firstCreatorCase: "EVT-004",
      originRoute: "/ops/api/diagnostics/log-tail?limit=80",
      originService: "OpsDiagnosticLogTailJson",
      backingOwner: "acceptance-owned product root log snapshot",
      marker: true,
    }, {
      stableIdentity: "log-tail:product-baseline",
      owned: false,
      ownerLabel: "product-baseline",
      firstCreatorCase: "baseline-server-start",
      originRoute: "/ops/api/diagnostics/log-tail?limit=80",
      originService: "OpsDiagnosticLogTailJson",
      backingOwner: "product log",
    }],
    stateIdentityBefore: "baseline-state",
    stateIdentityAfter: "baseline-state",
  });
  assert(evidence.pass === true &&
    evidence.markerInitiallyDisplaced === true &&
    evidence.markerSelectedAfterIsolation === true &&
    evidence.nonOwnedPreserved === true &&
    evidence.ownedKindCounts["root-cause"] === 2 &&
    evidence.ownedKindCounts["source-health"] === 3 &&
    evidence.ownedKindCounts["rule-warning"] === 3,
  "canonical root/source/rule residue was not isolated before marker selection");
  assert(evidence.candidateProvenance.every(candidate =>
    /^[a-f0-9]{64}$/u.test(candidate.identityDigest)) &&
    !JSON.stringify(evidence).includes("review4-owned-1"),
  "timeline ownership evidence exposed a stable identity instead of its digest");

  const nonOwnedRemoval = buildEvt004TimelineOwnershipEvidence({
    rootCandidates: [{
      stableIdentity: "root:product",
      owned: true,
      ownerLabel: "product-baseline",
      firstCreatorCase: "baseline-server-start",
    }],
    logCandidates: [{
      stableIdentity: "log:marker",
      owned: false,
      marker: true,
    }],
    stateIdentityBefore: "baseline-state",
    stateIdentityAfter: "baseline-state",
  });
  assert(nonOwnedRemoval.pass === false,
    "a product-baseline candidate mislabeled as owned did not fail closed");
});

await check("EVT-004 marker isolation accepts an already-drained prior-case residue", async () => {
  const baseline = (kind, index) => ({
    stableIdentity: `${kind}:baseline-${index}`,
    owned: false,
    ownerLabel: "published-seed-baseline",
    firstCreatorCase: "baseline-server-start",
    originRoute: `/ops/api/${kind}`,
    originService: `${kind}-service`,
    backingOwner: `${kind}-registry`,
  });
  const evidence = buildEvt004TimelineOwnershipEvidence({
    rootCandidates: [baseline("root-cause", 1), baseline("root-cause", 2)],
    sourceCandidates: [
      baseline("source-health", 1),
      baseline("source-health", 2),
      baseline("source-health", 3),
    ],
    ruleCandidates: [
      baseline("rule-warning", 1),
      baseline("rule-warning", 2),
      baseline("rule-warning", 3),
    ],
    logCandidates: [{
      stableIdentity: "log-tail:evt004-marker",
      owned: false,
      ownerLabel: "evt004-marker-fixture",
      firstCreatorCase: "EVT-004",
      originRoute: "/ops/api/diagnostics/log-tail?limit=80",
      originService: "OpsDiagnosticLogTailJson",
      backingOwner: "acceptance-owned product root log snapshot",
      marker: true,
    }],
    stateIdentityBefore: "already-drained-baseline",
    stateIdentityAfter: "already-drained-baseline",
  });
  assert(evidence.pass === true &&
    evidence.markerInitiallyDisplaced === true &&
    evidence.markerSelectedAfterIsolation === true &&
    evidence.nonOwnedPreserved === true &&
    Object.values(evidence.ownedKindCounts).every(count => count === 0),
  "an already-drained prior-case residue incorrectly blocked EVT-004 marker isolation");
});

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
  const markerDigest = crypto.createHash("sha256").update(marker).digest("hex");
  const projection = overrides => ({
    literalMatchEvidence: exactRuntime.buildDeclaredLiteralMatchEvidence({
      callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
      input: marker,
      flags: "none",
      intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
    }),
    routeOwner: "/ops/dashboard",
    rendererContainerSelector: "#dashIncidentTimeline",
    response: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest] },
    classifier: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], result: "included", reason: "formal-incident-pattern" },
    sorted: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], exclusionReason: "" },
    filtered: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], exclusionReason: "" },
    bounded: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], exclusionReason: "" },
    rendererInput: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], exclusionReason: "" },
    dom: { inputCount: 1, outputCount: 1, markerDigests: [markerDigest], matchedNodeCount: 1 },
    ...overrides,
  });
  const matching = buildEventMarkerFlowEvidence({
    marker,
    responseBodies: [{ lines: [`[review4] auth incident ${marker} [redacted]`] }],
    observed: {
      semanticNodeTexts: [`로그 단서 ${marker} diagnostics log-tail`],
      semanticNodeKinds: ["log-tail"],
      visibleSemanticNodeTexts: [`로그 단서 ${marker} diagnostics log-tail`],
      visibleSemanticNodeKinds: ["log-tail"],
      properties: { routeLocalIncidentTimeline: { markerProjection: projection() } },
    },
  });
  assert(matching.pass && matching.responseMarkerObserved.matchedCount === 1 &&
    matching.timelineProjectionObserved.matchedCount === 1 &&
    matching.timelineProjectionObserved.selectedIndices[0] === 0 &&
    matching.timelineProjectionObserved.selectedKind === "log-tail" &&
    matching.domMarkerObserved.matchedCount === 1 &&
    matching.domMarkerObserved.selectedIndices[0] === 0,
  "exact response/timeline/DOM marker binding did not pass");
  assert(matching.projectionStages.pass === true &&
    matching.projectionStages.firstMissingStage === "" &&
    !JSON.stringify(matching.projectionStages).includes(marker),
  "digest-only marker projection stages did not pass safely");

  for (const [label, stage, failureCode] of [
    ["classifier", projection({ classifier: { inputCount: 1, outputCount: 0, markerDigests: [], result: "excluded", reason: "no-formal-incident-pattern" } }), "MARKER_CLASSIFIER_EXCLUDED"],
    ["sort", projection({ sorted: { inputCount: 1, outputCount: 0, markerDigests: [], exclusionReason: "sort-identity-lost" } }), "MARKER_SORT_IDENTITY_LOST"],
    ["filter", projection({ filtered: { inputCount: 1, outputCount: 0, markerDigests: [], exclusionReason: "source-filter-mismatch" } }), "MARKER_SOURCE_FILTER_EXCLUDED"],
    ["bound", projection({ bounded: { inputCount: 9, outputCount: 0, markerDigests: [], exclusionReason: "global-bound" } }), "MARKER_BOUNDED_OUT"],
    ["route", projection({ routeOwner: "/ops/events" }), "MARKER_ROUTE_OWNER_MISMATCH"],
    ["renderer", projection({ rendererInput: { inputCount: 1, outputCount: 0, markerDigests: [], exclusionReason: "renderer-input-missing" } }), "MARKER_RENDERER_INPUT_MISSING"],
    ["DOM zero", projection({ dom: { inputCount: 1, outputCount: 0, markerDigests: [], matchedNodeCount: 0 } }), "DOM_MARKER_NOT_OBSERVED"],
    ["DOM duplicate", projection({ dom: { inputCount: 1, outputCount: 2, markerDigests: [markerDigest, markerDigest], matchedNodeCount: 2 } }), "DOM_MARKER_DUPLICATE"],
    ["digest drift", projection({ bounded: { inputCount: 1, outputCount: 1, markerDigests: ["0".repeat(64)], exclusionReason: "" } }), "MARKER_PROJECTION_DIGEST_DRIFT"],
    ["literal evidence missing", projection({ literalMatchEvidence: null }), "LITERAL_MATCH_EVIDENCE_MISSING"],
    ["literal input digest drift", projection({
      literalMatchEvidence: {
        ...exactRuntime.buildDeclaredLiteralMatchEvidence({
          callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
          input: marker,
          flags: "none",
          intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
        }),
        inputDigest: "0".repeat(64),
      },
    }), "LITERAL_MATCH_EVIDENCE_DRIFT"],
  ]) {
    const evidence = buildEventMarkerFlowEvidence({
      marker,
      responseBodies: [{ lines: [marker] }],
      observed: {
        semanticNodeTexts: [marker],
        semanticNodeKinds: ["log-tail"],
        visibleSemanticNodeTexts: [marker],
        visibleSemanticNodeKinds: ["log-tail"],
        properties: { routeLocalIncidentTimeline: { markerProjection: stage } },
      },
    });
    assert(evidence.pass === false && evidence.failureCode === failureCode,
      `${label} projection boundary did not fail closed: ${evidence.failureCode}`);
  }

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

await check("EVT-004 marker evaluator is single-shot after correlation and DOM readiness", async () => {
  const marker = "REVIEW4-evt-004-review4-fixture-LOG-MARKER";
  const input = {
    marker,
    responseBodies: [{ lines: [marker] }],
    observed: {
      semanticNodeTexts: [marker],
      visibleSemanticNodeTexts: [marker],
    },
  };
  let evaluatorCalls = 0;
  const evaluate = markerEvaluation => evaluateEventMarkerFlowEvidence({
    ...input,
    markerEvaluation: {
      selector: "#dashIncidentTimeline",
      ...markerEvaluation,
    },
    markerEvaluator: args => {
      evaluatorCalls += 1;
      return buildEventMarkerFlowEvidence(args);
    },
  });
  const passed = evaluate({
    invocationCount: 1,
    correlationResponseBound: true,
    domReadinessConfirmed: true,
  });
  assert(passed.pass === true &&
    passed.evaluatorInvocationCount === 1 &&
    passed.correlationResponseBound === true &&
    passed.domReadinessConfirmed === true &&
    evaluatorCalls === 1,
  "marker evaluator did not run exactly once after its prerequisites");

  for (const [label, markerEvaluation, failureCode] of [
    ["zero invocation", {
      invocationCount: 0,
      correlationResponseBound: true,
      domReadinessConfirmed: true,
    }, "MARKER_EVALUATOR_NOT_INVOKED"],
    ["duplicate invocation", {
      invocationCount: 2,
      correlationResponseBound: true,
      domReadinessConfirmed: true,
    }, "MARKER_EVALUATOR_DUPLICATE_INVOCATION"],
    ["before correlation", {
      invocationCount: 1,
      correlationResponseBound: false,
      domReadinessConfirmed: true,
    }, "MARKER_CORRELATION_PREREQUISITE_NOT_MET"],
    ["before DOM readiness", {
      invocationCount: 1,
      correlationResponseBound: true,
      domReadinessConfirmed: false,
    }, "MARKER_DOM_NOT_READY"],
  ]) {
    const before = evaluatorCalls;
    const evidence = evaluate(markerEvaluation);
    assert(evidence.pass === false &&
      evidence.failureCode === failureCode &&
      evaluatorCalls === before,
    `${label} marker lifecycle did not fail before evaluator execution`);
  }

  const exceptionEvidence = evaluateEventMarkerFlowEvidence({
    ...input,
    markerEvaluation: {
      invocationCount: 1,
      correlationResponseBound: true,
      domReadinessConfirmed: true,
      selector: "#dashIncidentTimeline",
    },
    markerEvaluator: () => {
      throw new Error("raw marker exception must not escape");
    },
  });
  assert(exceptionEvidence.pass === false &&
    exceptionEvidence.failurePhase === "marker-evaluator" &&
    exceptionEvidence.failureCode === "MARKER_EVALUATOR_EXCEPTION" &&
    exceptionEvidence.evaluatorInvocationCount === 1,
  "marker evaluator exception did not produce structured failure evidence");

  const missingEvidence = buildMarkerEvaluatorLifecycleFailureEvidence({
    marker,
    invocationCount: 0,
    correlationResponseBound: true,
    domReadinessConfirmed: true,
  });
  assert(missingEvidence.pass === false &&
    missingEvidence.failureCode === "MARKER_EVALUATOR_NOT_INVOKED" &&
    !JSON.stringify(missingEvidence).includes(marker),
  "zero-invocation marker evidence was missing or exposed the raw marker");
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

await check("missing legacy DOM baselines use strict response-derived renderer projection", async () => {
  const fixtureId = "evt-runtime-projection-fixture";
  const selectedResponseBaselines = selectEventDomResponseBaselines({
    operator: "fields-equal-response",
    target: "approvalState/validationSummary",
  }, {});
  const observed = {
    count: 1,
    visibleCount: 1,
    text: "operator approved · schema valid",
    nodeTexts: ["operator approved · schema valid"],
    attributes: [],
    values: [],
    descendantCount: 2,
  };
  const responseBodies = [{ readiness: { items: [{
    eventId: fixtureId,
    approvalState: "operator-approved",
    validationSummary: "schema-valid",
  }] } }];
  const projection = buildResponseDerivedEventDomProjectionEvidence({
    caseId: "EVT-FOCUSED",
    assertion: { operator: "fields-equal-response", target: "approvalState/validationSummary" },
    observed,
    responseBodies,
    fixtureCandidates: [fixtureId],
    selectedResponseBaselines,
  });
  const passing = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-FOCUSED",
    selector: "#focused [data-event]",
    observed,
    responseBodies,
    priorResponseByPath: {},
    responseDerivedDomProjection: projection,
    actualBrowserExecution: true,
  });
  assert(passing.pass && passing.responseBaselineMatched.pathCount === 0 &&
    passing.responseDerivedDomProjection.pass,
  "response-derived renderer projection did not replace only the missing baseline");

  const selectorOnlyProjection = buildResponseDerivedEventDomProjectionEvidence({
    caseId: "EVT-FOCUSED",
    assertion: { operator: "fields-equal-response", target: "approvalState/validationSummary" },
    observed: { ...observed, text: "readiness", nodeTexts: ["readiness"] },
    responseBodies,
    fixtureCandidates: [fixtureId],
    selectedResponseBaselines,
  });
  const selectorOnly = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-FOCUSED",
    selector: "#focused [data-event]",
    observed: { ...observed, text: "readiness", nodeTexts: ["readiness"] },
    responseBodies,
    priorResponseByPath: {},
    responseDerivedDomProjection: selectorOnlyProjection,
    actualBrowserExecution: true,
  });
  assertCompositeFailure(selectorOnly, "responseDerivedDomProjection");
  assert(selectorOnly.causeCodes.includes("RENDERER_PROJECTION_VALUE_MISMATCH"),
    "selector-only projection did not retain a strict failure code");
  assert(!JSON.stringify(passing).includes(fixtureId) &&
    !JSON.stringify(passing).includes("operator-approved"),
  "runtime projection evidence retained raw response material");

  const explicitBaseline = buildResponseDerivedEventDomProjectionEvidence({
    caseId: "EVT-FOCUSED",
    assertion: { operator: "fields-equal-response", target: "approvalState" },
    observed,
    responseBodies,
    fixtureCandidates: [fixtureId],
    selectedResponseBaselines: { approvalState: "operator-approved" },
  });
  assert(explicitBaseline === null,
    "response-derived fallback replaced an explicitly owned response baseline");
});

await check("declared fixed remaining owners replace missing baselines without recursive field search", async () => {
  const fixtureId = "evt-056-review4-fixture";
  const assertion = {
    operator: "flags-equal",
    target: "noAutoSave/noAutoApply/ruleRegistryWritePerformed",
  };
  const selectedResponseBaselines = selectEventDomResponseBaselines(assertion, {});
  const observed = {
    count: 1,
    visibleCount: 1,
    text: "approval gated fixture",
    attributes: [],
    values: [],
    descendantCount: 1,
    semanticNodes: [{
      eventId: fixtureId,
      attributes: {
        noAutoSave: "true",
        noAutoApply: "true",
        ruleRegistryWritePerformed: "false",
      },
      fields: {},
    }],
  };
  const projection = buildResponseDerivedEventDomProjectionEvidence({
    caseId: "EVT-056",
    assertion,
    observed,
    responseBodies: [{
      contract: { noAutoSave: false, noAutoApply: false },
      approvalGatedRuleDraftReadiness: { items: [{
        eventId: fixtureId,
        stagedDraft: {
          noAutoSave: true,
          noAutoApply: true,
          ruleRegistryWritePerformed: false,
        },
      }] },
    }],
    fixtureCandidates: [fixtureId],
    fixtureIdentity: fixtureId,
    selectedResponseBaselines,
  });
  assert(projection?.pass && projection.matchedFieldCount === 3,
    "declared actual response owner path did not replace the missing baseline");
  const evidence = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-056",
    selector: "#fixture-draft",
    observed,
    responseBodies: [],
    priorResponseByPath: {},
    responseDerivedDomProjection: projection,
    actualBrowserExecution: true,
  });
  assert(evidence.pass && evidence.responseBaselineMatched.pathCount === 0,
    "declared fixed remaining projection retained a missing response baseline");
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

await check("response-backed DOM targets do not inherit unrelated whole-response baselines", async () => {
  const selected = selectEventDomResponseBaselines("records.matchedRecords", {
    priorResponseByPath: {
      "records.records": [{ eventId: "fixture", updatedAt: "dynamic-before" }],
      "records.records[].status": "open",
    },
    domResponseBaselineByTarget: {
      "records.matchedRecords": 1,
    },
    rowLocalResponseTargets: [],
  });
  assert(JSON.stringify(selected) === JSON.stringify({ "records.matchedRecords": 1 }),
    "EVT-023 count target inherited a dynamic whole-record baseline");
  const evidence = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-023",
    selector: "#dashIncidentTimelineBadges",
    observed: {
      count: 1,
      visibleCount: 1,
      text: "1",
      nodeTexts: ["1"],
      attributes: [],
      values: [],
      descendantCount: 1,
    },
    responseBodies: [{ records: {
      matchedRecords: 1,
      records: [{ eventId: "fixture", updatedAt: "dynamic-after" }],
    } }],
    priorResponseByPath: selected,
    fixtureRequired: false,
    actualBrowserExecution: true,
  });
  assert(evidence.responseBaselineMatched.pass === true &&
    evidence.responseBaselineMatched.paths.length === 1 &&
    evidence.responseBaselineMatched.paths[0].path === "records.matchedRecords",
  "EVT-023 target-local count baseline did not ignore unrelated record drift");
  const missing = selectEventDomResponseBaselines("records.matchedRecords", {
    priorResponseByPath: {
      "records.records": [{ eventId: "fixture" }],
    },
    domResponseBaselineByTarget: {},
    rowLocalResponseTargets: [],
  });
  const missingEvidence = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-023",
    selector: "#dashIncidentTimelineBadges",
    observed: {
      count: 1, visibleCount: 1, text: "1", nodeTexts: ["1"],
      attributes: [], values: [], descendantCount: 1,
    },
    responseBodies: [{ records: { matchedRecords: 1 } }],
    priorResponseByPath: missing,
    actualBrowserExecution: true,
  });
  assert(missingEvidence.responseBaselineMatched.pass === false &&
    missingEvidence.responseBaselineMatched.reasonCodes.includes(
      "RESPONSE_BASELINE_MISSING"),
  "missing exact DOM target baseline fell back to an unrelated response path");
  const mixedEvidence = buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-023",
    selector: "#dashIncidentTimelineBadges",
    observed: {
      count: 1, visibleCount: 1, text: "1", nodeTexts: ["1"],
      attributes: [], values: [], descendantCount: 1,
    },
    responseBodies: [
      { records: { matchedRecords: 1 } },
      { records: { matchedRecords: 2 } },
    ],
    priorResponseByPath: { "records.matchedRecords": 1 },
    actualBrowserExecution: true,
  });
  assert(mixedEvidence.responseBaselineMatched.pass === false &&
    mixedEvidence.responseBaselineMatched.paths[0].candidateCount === 2,
  "mixed response candidates passed because only one matched the baseline");
});

await check("request semantic assertion evidence contains only bound digests and typed metadata", async () => {
  const evidence = buildRequestSemanticAssertionEvidence({
    caseId: "EVT-025",
    method: "GET",
    urlPath: "/ops/api/runtime/status",
    pathTemplate: "/ops/api/runtime/status",
    assertion: { operator: "array", path: "webrtcHttp.publishSources", expected: true },
    assertionIndex: 0,
    result: { pass: false, actual: { wrong: "shape" } },
    baselinePresent: true,
    baseline: [],
  });
  assert(evidence.schema === "media-server.v390-ui-request-semantic-assertion-evidence.v1" &&
    evidence.pass === false && evidence.caseId === "EVT-025" &&
    evidence.requestMethod === "GET" && evidence.assertionOperator === "array" &&
    evidence.failureCode === "REQUEST_SEMANTIC_ASSERTION_MISMATCH" &&
    [evidence.requestPathDigest, evidence.requestPathTemplateDigest,
      evidence.assertionPathDigest, evidence.assertionIdentityDigest,
      evidence.baselineDigest, evidence.actualDigest, evidence.expectedDigest]
      .every(value => /^[0-9a-f]{64}$/.test(value)) &&
    !JSON.stringify(evidence).includes("/ops/api/runtime/status") &&
    !JSON.stringify(evidence).includes("webrtcHttp.publishSources") &&
    !JSON.stringify(evidence).includes("wrong"),
  "request semantic assertion evidence retained raw request/field/value material");
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

await check("EVT-023 binds one authoritative event row to one Ops timeline row", async () => {
  const eventId = "evt-023-review4-fixture";
  const digest = value => crypto.createHash("sha256").update(String(value)).digest("hex");
  const fixtureDigest = digest(eventId);
  const unrelatedDigest = digest("unrelated");
  const baseline = {
    schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
    identityKind: "event-record",
    collectionPath: "records.records",
    identityPaths: ["eventId"],
    identityValue: eventId,
    projectionPaths: ["eventType", "status"],
    expectedProjection: { eventType: "presence", status: "open" },
  };
  const fixtureIdentity = {
    schema: "media-server.v390-ui-event-dom-fixture-identity.v1",
    caseId: "EVT-023",
    kind: "event-record",
    eventId,
    eventIdentityDigest: fixtureDigest,
    eventType: "presence",
    status: "open",
    expectedNodeTokens: [eventId, "presence", "open"],
    apiExpectedProjection: baseline.expectedProjection,
  };
  const fixtureRow = `presence · open eventId ${eventId}`;
  const renderActionId = "EVT-023:assert-visible-read-model:ops-timeline-refresh";
  const renderCycleId = `${renderActionId}:cycle-1`;
  const renderCorrelationId = `${renderActionId}:correlation`;
  const requestEntry = {
    phase: "request-start",
    requestId: "native-request-ops-status",
    caseRequestIdentity: "EVT-023:request-2",
    caseRequestSequence: 2,
    requestKind: "application-fetch",
    correlationId: renderCorrelationId,
    correlationSource: "request-header",
    requestHeaderDigest: digest(renderCorrelationId),
    correlationRouteState: "injected-outer",
    correlationRouteActionId: renderActionId,
    correlationRouteDigest: digest(renderCorrelationId),
    initiatorActionId: renderActionId,
    renderCycleId,
    requestOwnershipKind: "case-owned-refresh-action",
    requestStartedAtMs: 1000,
    method: "GET",
    url: "http://runtime.invalid/ops/api/events/status?limit=5&includeArchives=1",
  };
  const responseEntry = {
    phase: "response",
    requestId: "native-request-ops-status",
    caseRequestIdentity: "EVT-023:request-2",
    caseRequestSequence: 2,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    requestKind: "application-fetch",
    correlationId: renderCorrelationId,
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
    requestHeaderDigest: digest(renderCorrelationId),
    correlationRouteState: "injected-outer",
    correlationRouteActionId: renderActionId,
    correlationRouteDigest: digest(renderCorrelationId),
    initiatorActionId: renderActionId,
    renderCycleId,
    requestOwnershipKind: "case-owned-refresh-action",
    requestStartedAtMs: 1000,
    responseObservedAtMs: 1100,
    method: "GET",
    status: 200,
    safeResponseProjectionSource: "playwright-response-json",
    safeResponseProjectionKind: "ops-incident-timeline-event-records",
    safeResponseForbiddenMaterialObserved: false,
    url: "http://runtime.invalid/ops/api/events/status?limit=5&includeArchives=1",
  };
  const unrelatedPair = ({
    requestId,
    identity,
    sequence,
    ownershipKind,
    initiatorActionId = "",
    correlationId = "",
    startedAtMs,
    correlationRouteState = "correlation-absent",
  }) => [{
    ...requestEntry,
    requestId,
    caseRequestIdentity: identity,
    caseRequestSequence: sequence,
    correlationId,
    correlationSource: correlationId ? "request-header" : "none",
    requestHeaderDigest: correlationId ? digest(correlationId) : "",
    correlationRouteState,
    correlationRouteActionId: initiatorActionId,
    correlationRouteDigest: correlationId ? digest(correlationId) : "",
    initiatorActionId,
    renderCycleId: "",
    requestOwnershipKind: ownershipKind,
    requestStartedAtMs: startedAtMs,
  }, {
    ...responseEntry,
    requestId,
    caseRequestIdentity: identity,
    caseRequestSequence: sequence,
    correlationId,
    correlationSource: correlationId ? "request-header" : "none",
    responseCorrelationSource: correlationId
      ? "initiating-request-identity"
      : "none",
    requestHeaderDigest: correlationId ? digest(correlationId) : "",
    correlationRouteState,
    correlationRouteActionId: initiatorActionId,
    correlationRouteDigest: correlationId ? digest(correlationId) : "",
    initiatorActionId,
    renderCycleId: "",
    requestOwnershipKind: ownershipKind,
    requestStartedAtMs: startedAtMs,
    responseObservedAtMs: startedAtMs + 50,
  }];
  const opsNetworkEntries = [
    ...unrelatedPair({
      requestId: "native-request-initial-load",
      identity: "EVT-023:request-1",
      sequence: 1,
      ownershipKind: "initial-page-load",
      startedAtMs: 100,
    }),
    requestEntry,
    responseEntry,
    ...unrelatedPair({
      requestId: "native-request-diagnostic-readback",
      identity: "EVT-023:request-3",
      sequence: 3,
      ownershipKind: "diagnostic-authoritative-readback",
      initiatorActionId: "EVT-023:diagnostic-authoritative-readback",
      correlationId: "EVT-023:diagnostic-authoritative-readback:correlation",
      startedAtMs: 1300,
      correlationRouteState: "preserved-explicit-inner",
    }),
  ];
  const observed = {
    count: 2,
    visibleCount: 2,
    text: `motion · closed eventId unrelated ${fixtureRow}`,
    nodeTexts: ["motion · closed eventId unrelated", fixtureRow],
    fixtureIdentityNodes: [{ eventId: "unrelated" }, { eventId }],
    attributes: [],
    values: [],
    descendantCount: 12,
    properties: {
      routeLocalIncidentTimeline: {
        routePath: "/ops/dashboard",
        lifecycleObserved: true,
        containerCount: 1,
        incidentUnitNodeCount: 4,
        eventRecordCandidateCount: 2,
        renderPhase: "dom-committed",
        eventRecordInputCount: 2,
        eventRecordBoundedCount: 2,
        eventRecordDomCount: 2,
        responseEventIdentityDigests: [unrelatedDigest, fixtureDigest],
        renderInputEventIdentityDigests: [unrelatedDigest, fixtureDigest],
        sortedEventIdentityDigests: [unrelatedDigest, fixtureDigest],
        boundedEventIdentityDigests: [unrelatedDigest, fixtureDigest],
        domEventIdentityDigests: [unrelatedDigest, fixtureDigest],
        incidentInputCounts: JSON.stringify({ "event-record": 2, "root-cause": 2 }),
        incidentBoundedCounts: JSON.stringify({ "event-record": 2, "root-cause": 2 }),
        ownedRenderCycle: {
          actionId: renderActionId,
          renderCycleId,
          startedAtMs: 900,
          completedAtMs: 1200,
          initialPhase: "dom-committed",
          finalPhase: "dom-committed",
          phaseMutationCount: 2,
          domMutationCount: 1,
          expectedPhaseMatched: true,
        },
        attributeNames: ["class", "data-incident-unit", "data-incident-workflow"],
      },
    },
  };
  const evidenceFor = ({ rows = [{ eventId: "unrelated", eventType: "motion", status: "closed" },
    { eventId, eventType: "presence", status: "open" }], dom = observed,
  identity = fixtureIdentity, network = opsNetworkEntries } = {}) => buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-023",
    selector: '#dashIncidentTimeline [data-incident-unit="event-record"]',
    observed: dom,
    responseBodies: [{ records: { records: rows } }],
    priorResponseByPath: { "eventId/eventType/status": baseline },
    fixtureCandidates: [eventId],
    fixtureIdentity: identity,
    expectedFixtureIdentity: identity,
    fixtureRequired: true,
    networkEntries: network,
    actualBrowserExecution: true,
  });

  const passing = evidenceFor();
  assert(passing.pass === true &&
    passing.fixtureObserved.bindingMode === "api-row-to-single-dom-node" &&
    passing.responseBaselineMatched.paths[0].candidateCount === 1 &&
    passing.fixtureObserved.domCandidateCount === 2 &&
    passing.fixtureObserved.matchedNodeCount === 1 &&
    passing.fixtureObserved.apiIdentityCandidateCount === 1 &&
    passing.fixtureObserved.apiIdentityMatchedCount === 1 &&
    passing.fixtureObserved.domIdentityCandidateCount === 2 &&
    passing.fixtureObserved.domIdentityMatchedCount === 1 &&
    passing.fixtureObserved.expectedFixtureIdentityDigest ===
      passing.fixtureObserved.apiSelectedOwnerIdentityDigest &&
    passing.fixtureObserved.expectedFixtureIdentityDigest ===
      passing.fixtureObserved.domOwnerAttributeIdentityDigest &&
    Object.values(passing.fixtureObserved.fieldMatches).every(field => field.pass),
  "EVT-023 authoritative API row and Ops timeline row did not bind exactly");
  assert(JSON.stringify(passing.fixtureObserved.matchedNodeIndices) === JSON.stringify([1]),
    "EVT-023 selected Ops timeline row index is not preserved");
  const partialIdentityBoundary = structuredClone(passing);
  delete partialIdentityBoundary.fixtureObserved.apiProjectionKindDigest;
  await expectReject(
    () => Promise.resolve(validateEventDomSemanticCompositeEvidence(partialIdentityBoundary)),
    "required structured fields are missing",
  );
  const missingApiProjectionIdentity = structuredClone(fixtureIdentity);
  delete missingApiProjectionIdentity.apiExpectedProjection;
  const missingApiProjection = evidenceFor({ identity: missingApiProjectionIdentity });
  assert(missingApiProjection.pass === false &&
    missingApiProjection.fixtureObserved.failureCode === "FIXTURE_IDENTITY_FIELDS_MISSING",
  "missing typed API identity projection did not fail closed");
  const missingDomIdentity = evidenceFor({ dom: { ...observed, fixtureIdentityNodes: [] } });
  assert(missingDomIdentity.pass === true &&
    missingDomIdentity.fixtureObserved.routeLocalRendererIdentityMatched === true &&
    missingDomIdentity.fixtureObserved.domIdentityCandidateCount === 1 &&
    missingDomIdentity.fixtureObserved.domIdentityMatchedCount === 1,
  "route-local renderer identity did not close the missing generic owner attribute boundary");
  const missingRouteLocalDomIdentity = evidenceFor({ dom: {
    ...observed,
    fixtureIdentityNodes: [],
    properties: {
      ...observed.properties,
      routeLocalIncidentTimeline: {
        ...observed.properties.routeLocalIncidentTimeline,
        domEventIdentityDigests: [unrelatedDigest],
      },
    },
  } });
  assert(missingRouteLocalDomIdentity.pass === false &&
    missingRouteLocalDomIdentity.fixtureObserved.failureCode === "API_DOM_FIXTURE_IDENTITY_MISMATCH" &&
    missingRouteLocalDomIdentity.fixtureObserved.routeLocalRendererIdentityMatched === false,
  "missing route-local DOM identity did not fail closed");
  const duplicateDomIdentity = evidenceFor({ dom: {
    ...observed,
    fixtureIdentityNodes: [{ eventId }, { eventId }],
  } });
  assert(duplicateDomIdentity.pass === false &&
    duplicateDomIdentity.fixtureObserved.failureCode === "API_DOM_FIXTURE_IDENTITY_MISMATCH",
  "duplicate DOM owner attribute identity did not fail closed");
  assert(passing.routeLocalDomBinding?.pass === true &&
    passing.routeLocalDomBinding.routeOwner === "/ops/dashboard" &&
    passing.routeLocalDomBinding.rendererOwner === "renderDashboardIncidentTimeline" &&
    passing.routeLocalDomBinding.lifecycleObserved === true &&
    passing.routeLocalDomBinding.opsEndpointMethod === "GET" &&
    passing.routeLocalDomBinding.opsEndpointPath ===
      "/ops/api/events/status?limit=5&includeArchives=1" &&
    passing.routeLocalDomBinding.opsResponseStatus === 200 &&
    passing.routeLocalDomBinding.opsRequestCandidateCount === 3 &&
    passing.routeLocalDomBinding.opsResponseCandidateCount === 3 &&
    passing.routeLocalDomBinding.opsCaseOwnedRequestCandidateCount === 1 &&
    passing.routeLocalDomBinding.opsCaseOwnedResponseCandidateCount === 1 &&
    passing.routeLocalDomBinding.opsCorrelationRequestCandidateCount === 1 &&
    passing.routeLocalDomBinding.opsCorrelationResponseCandidateCount === 1 &&
    passing.routeLocalDomBinding.opsInitiatorActionId === renderActionId &&
    passing.routeLocalDomBinding.opsRenderCycleId === renderCycleId &&
    passing.routeLocalDomBinding.opsRenderCycleMatched === true &&
    passing.routeLocalDomBinding.opsRequestLedger.length === 3 &&
    JSON.stringify(passing.routeLocalDomBinding.opsRequestLedger.map(item => item.ownership)) ===
      JSON.stringify([
        "initial-page-load",
        "case-owned-refresh-render",
        "diagnostic-authoritative-readback",
      ]) &&
    JSON.stringify(passing.routeLocalDomBinding.opsRequestLedger.map(item =>
      item.correlationRouteState)) === JSON.stringify([
        "correlation-absent",
        "injected-outer",
        "preserved-explicit-inner",
      ]) &&
    passing.routeLocalDomBinding.opsResponseRequestObjectObserved === true &&
    passing.routeLocalDomBinding.opsRequestResponseIdentityMatched === true &&
    passing.routeLocalDomBinding.clientOpsStorageOwnerShared === true &&
    passing.routeLocalDomBinding.firstExclusionPredicate === "none" &&
    passing.routeLocalDomBinding.containerCount === 1 &&
    passing.routeLocalDomBinding.incidentUnitNodeCount === 4 &&
    passing.routeLocalDomBinding.eventRecordCandidateCount === 2 &&
    passing.routeLocalDomBinding.renderPhase === "dom-committed" &&
    passing.routeLocalDomBinding.eventRecordInputCount === 2 &&
    passing.routeLocalDomBinding.eventRecordBoundedCount === 2 &&
    passing.routeLocalDomBinding.eventRecordDomCount === 2 &&
    passing.routeLocalDomBinding.authoritativeResponseCandidateCount === 2 &&
    passing.routeLocalDomBinding.renderInputEventRecordCount === 2 &&
    passing.routeLocalDomBinding.sortedEventRecordCount === 2 &&
    passing.routeLocalDomBinding.boundedEventRecordCount === 2 &&
    passing.routeLocalDomBinding.domEventRecordCount === 2 &&
    Object.values(passing.routeLocalDomBinding.stageFixtureMatches).every(count => count === 1) &&
    JSON.stringify(passing.routeLocalDomBinding.attributeNames) ===
      JSON.stringify(["class", "data-incident-unit", "data-incident-workflow"]) &&
    passing.routeLocalDomBinding.expectedFixtureDigest === fixtureDigest,
  "EVT-023 route-local Ops incident timeline evidence is incomplete");

  const missingExpectedDigestIdentity = structuredClone(fixtureIdentity);
  delete missingExpectedDigestIdentity.eventIdentityDigest;
  const missingExpectedDigest = evidenceFor({ identity: missingExpectedDigestIdentity });
  assert(missingExpectedDigest.pass === false &&
    missingExpectedDigest.routeLocalDomBinding?.failureCode ===
      "EXPECTED_FIXTURE_DIGEST_MISSING",
  "EVT-023 missing expected fixture digest did not fail closed before observation matching");

  for (const [label, identity, expectedCode] of [
    ["wrong", { ...fixtureIdentity, eventIdentityDigest: unrelatedDigest },
      "EXPECTED_FIXTURE_DIGEST_MISMATCH"],
    ["stale-event", { ...fixtureIdentity, eventId: "evt-023-stale" },
      "EXPECTED_FIXTURE_DIGEST_MISMATCH"],
    ["cross-case", { ...fixtureIdentity, caseId: "EVT-026" },
      "EXPECTED_FIXTURE_DIGEST_CASE_MISMATCH"],
  ]) {
    const failed = evidenceFor({ identity });
    assert(failed.pass === false &&
      failed.routeLocalDomBinding?.failureCode === expectedCode,
    `EVT-023 ${label} expected fixture digest did not fail closed`);
  }

  const missingDom = evidenceFor({
    dom: {
      ...observed,
      count: 0,
      visibleCount: 0,
      text: "",
      nodeTexts: [],
      descendantCount: 0,
      properties: {
        routeLocalIncidentTimeline: {
          routePath: "/ops/dashboard",
          lifecycleObserved: true,
          containerCount: 1,
          incidentUnitNodeCount: 8,
          eventRecordCandidateCount: 0,
          renderPhase: "dom-committed",
          eventRecordInputCount: 1,
          eventRecordBoundedCount: 0,
          eventRecordDomCount: 0,
          responseEventIdentityDigests: [fixtureDigest],
          renderInputEventIdentityDigests: [fixtureDigest],
          sortedEventIdentityDigests: [fixtureDigest],
          boundedEventIdentityDigests: [],
          domEventIdentityDigests: [],
          incidentInputCounts: JSON.stringify({ "event-record": 1, "root-cause": 3 }),
          incidentBoundedCounts: JSON.stringify({ "root-cause": 3, "source-health": 3, "rule-warning": 2 }),
          ownedRenderCycle: structuredClone(
            observed.properties.routeLocalIncidentTimeline.ownedRenderCycle,
          ),
          attributeNames: ["class", "data-incident-unit", "data-incident-workflow"],
        },
      },
    },
  });
  assert(missingDom.pass === false &&
    missingDom.observationPresent.reasonCode === "DOM_OBSERVATION_MISSING" &&
    missingDom.routeLocalDomBinding?.pass === false &&
    missingDom.routeLocalDomBinding.failureCode === "OPS_INCIDENT_TIMELINE_LIFECYCLE_MISMATCH" &&
    missingDom.routeLocalDomBinding.eventRecordInputCount === 1 &&
    missingDom.routeLocalDomBinding.eventRecordCandidateCount === 0,
  "EVT-023 missing event row did not preserve route-local structured evidence");

  const lifecycleEvidenceFor = overrides => evidenceFor({
    dom: {
      ...observed,
      properties: {
        routeLocalIncidentTimeline: {
          ...observed.properties.routeLocalIncidentTimeline,
          ...overrides,
        },
      },
    },
  });
  const assertLifecycleFailure = (evidence, label) => {
    assert(evidence.pass === false &&
      evidence.routeLocalDomBinding?.pass === false &&
      evidence.routeLocalDomBinding.failureCode === "OPS_INCIDENT_TIMELINE_LIFECYCLE_MISMATCH" &&
      evidence.failedChecks.includes("routeLocalDomBinding"),
    `${label} did not fail closed`);
  };
  const observedOverwrite = lifecycleEvidenceFor({ expectedFixtureDigest: unrelatedDigest });
  assert(observedOverwrite.pass === false &&
    observedOverwrite.routeLocalDomBinding?.failureCode ===
      "OBSERVED_EXPECTED_FIXTURE_DIGEST_FORBIDDEN",
  "EVT-023 observed lifecycle value overwrote the materialized expected fixture digest");
  assertLifecycleFailure(lifecycleEvidenceFor({
    eventRecordInputCount: 2,
    eventRecordBoundedCount: 1,
    eventRecordDomCount: 1,
    renderInputEventIdentityDigests: [unrelatedDigest, fixtureDigest],
    sortedEventIdentityDigests: [unrelatedDigest, fixtureDigest],
    boundedEventIdentityDigests: [fixtureDigest],
    domEventIdentityDigests: [fixtureDigest],
    eventRecordCandidateCount: 1,
  }), "input 2 to bounded 1");
  assertLifecycleFailure(lifecycleEvidenceFor({
    sortedEventIdentityDigests: [unrelatedDigest],
  }), "sorted fixture loss");
  assertLifecycleFailure(lifecycleEvidenceFor({
    boundedEventIdentityDigests: [unrelatedDigest, unrelatedDigest],
    domEventIdentityDigests: [unrelatedDigest, unrelatedDigest],
  }), "bounded fixture replacement");
  assertLifecycleFailure(lifecycleEvidenceFor({
    eventRecordBoundedCount: 3,
    eventRecordDomCount: 3,
    boundedEventIdentityDigests: [unrelatedDigest, fixtureDigest, digest("extra")],
    domEventIdentityDigests: [unrelatedDigest, fixtureDigest, digest("extra")],
    eventRecordCandidateCount: 3,
  }), "bounded count growth");
  assertLifecycleFailure(lifecycleEvidenceFor({
    eventRecordDomCount: 1,
    domEventIdentityDigests: [fixtureDigest],
    eventRecordCandidateCount: 1,
  }), "DOM and bounded count mismatch");

  const missingInstrumentation = lifecycleEvidenceFor({
    lifecycleObserved: false,
    renderPhase: "",
  });
  assert(missingInstrumentation.pass === false &&
    missingInstrumentation.routeLocalDomBinding.failureCode ===
      "OPS_INCIDENT_TIMELINE_LIFECYCLE_EVIDENCE_MISSING" &&
    missingInstrumentation.routeLocalDomBinding.firstExclusionPredicate ===
      "lifecycle-evidence-unavailable",
  "missing lifecycle instrumentation was misclassified as an authoritative zero response");

  const bindingEvidenceFor = ({ network = opsNetworkEntries, owned = {} } = {}) =>
    evidenceFor({
      network,
      dom: {
        ...observed,
        properties: {
          routeLocalIncidentTimeline: {
            ...observed.properties.routeLocalIncidentTimeline,
            ownedRenderCycle: {
              ...observed.properties.routeLocalIncidentTimeline.ownedRenderCycle,
              ...owned,
            },
          },
        },
      },
    });
  const assertResponseBindingFailure = (evidence, label) => {
    assert(evidence.pass === false &&
      evidence.routeLocalDomBinding.failureCode ===
        "OPS_INCIDENT_TIMELINE_RESPONSE_BINDING_MISMATCH" &&
      evidence.routeLocalDomBinding.firstExclusionPredicate ===
        "ops-authoritative-response-binding",
    `${label} did not fail closed`);
  };
  assert(bindingEvidenceFor().pass === true,
    "multiple unrelated same-path requests invalidated the exact owned response");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: [...opsNetworkEntries, {
      ...requestEntry,
      requestId: "native-request-owned-duplicate",
      caseRequestIdentity: "EVT-023:request-4",
      caseRequestSequence: 4,
      requestStartedAtMs: 1010,
    }, {
      ...responseEntry,
      requestId: "native-request-owned-duplicate",
      caseRequestIdentity: "EVT-023:request-4",
      caseRequestSequence: 4,
      requestStartedAtMs: 1010,
      responseObservedAtMs: 1110,
    }],
  }), "duplicate case-owned request/response");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry.initiatorActionId === renderActionId
        ? { ...entry, initiatorActionId: `${renderActionId}:stale` }
        : entry),
  }), "case-owned request missing");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry === responseEntry
        ? { ...entry, responseRequestObjectObserved: false }
        : entry),
  }), "response request object missing");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry === responseEntry
        ? { ...entry, caseRequestSequence: 99 }
        : entry),
  }), "stale response sequence");
  assertResponseBindingFailure(bindingEvidenceFor({
    owned: { actionId: `${renderActionId}:stale` },
  }), "stale render action ID");
  assertResponseBindingFailure(bindingEvidenceFor({
    owned: { renderCycleId: `${renderCycleId}:stale` },
  }), "response/render-cycle identity mismatch");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry === responseEntry ? { ...entry, status: 500 } : entry),
  }), "wrong response status");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      [requestEntry, responseEntry].includes(entry)
        ? { ...entry, method: "POST" }
        : entry),
  }), "wrong request method");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      [requestEntry, responseEntry].includes(entry)
        ? { ...entry, url: "http://runtime.invalid/ops/api/events/status?limit=50" }
        : entry),
  }), "wrong request path");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: [...opsNetworkEntries, ...unrelatedPair({
      requestId: "native-request-correlation-duplicate",
      identity: "EVT-023:request-4",
      sequence: 4,
      ownershipKind: "polling",
      initiatorActionId: "EVT-023:polling",
      correlationId: renderCorrelationId,
      startedAtMs: 1050,
    })],
  }), "same correlation duplicate");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry === responseEntry
        ? {
            ...entry,
            requestId: "native-request-initial-load",
            caseRequestIdentity: "EVT-023:request-1",
            caseRequestSequence: 1,
          }
        : entry),
  }), "unrelated polling response selection");
  assertResponseBindingFailure(bindingEvidenceFor({
    network: opsNetworkEntries.map(entry =>
      entry === responseEntry
        ? { ...entry, safeResponseProjectionSource: "" }
        : entry),
  }), "missing response projection sentinel");

  const noFixtureMatch = evidenceFor({
    dom: {
      ...observed,
      count: 1,
      visibleCount: 1,
      text: "motion · closed eventId unrelated",
      nodeTexts: ["motion · closed eventId unrelated"],
      properties: {
        routeLocalIncidentTimeline: {
          ...observed.properties.routeLocalIncidentTimeline,
          eventRecordInputCount: 1,
          eventRecordBoundedCount: 1,
          eventRecordDomCount: 1,
          eventRecordCandidateCount: 1,
          responseEventIdentityDigests: [unrelatedDigest],
          renderInputEventIdentityDigests: [unrelatedDigest],
          sortedEventIdentityDigests: [unrelatedDigest],
          boundedEventIdentityDigests: [unrelatedDigest],
          domEventIdentityDigests: [unrelatedDigest],
        },
      },
    },
  });
  assert(noFixtureMatch.pass === false && noFixtureMatch.fixtureObserved.matchedNodeCount === 0,
    "fixture matched row 0 did not fail closed");
  const duplicateFixtureMatch = evidenceFor({
    dom: {
      ...observed,
      text: `${fixtureRow} ${fixtureRow}`,
      nodeTexts: [fixtureRow, fixtureRow],
      properties: {
        routeLocalIncidentTimeline: {
          ...observed.properties.routeLocalIncidentTimeline,
          responseEventIdentityDigests: [fixtureDigest, fixtureDigest],
          renderInputEventIdentityDigests: [fixtureDigest, fixtureDigest],
          sortedEventIdentityDigests: [fixtureDigest, fixtureDigest],
          boundedEventIdentityDigests: [fixtureDigest, fixtureDigest],
          domEventIdentityDigests: [fixtureDigest, fixtureDigest],
        },
      },
    },
    rows: [
      { eventId, eventType: "presence", status: "open" },
      { eventId, eventType: "presence", status: "open" },
    ],
  });
  assert(duplicateFixtureMatch.pass === false &&
    duplicateFixtureMatch.fixtureObserved.matchedNodeCount === 2,
  "fixture matched row 2 did not fail closed");

  const missingIdentityField = structuredClone(fixtureIdentity);
  delete missingIdentityField.eventType;
  const missingField = evidenceFor({ identity: missingIdentityField });
  assertCompositeFailure(missingField, "fixtureObserved");
  assert(missingField.fixtureObserved.reasonCode === "FIXTURE_IDENTITY_FIELDS_MISSING",
    "EVT-023 missing typed identity field did not fail closed");

  const missingApiRow = evidenceFor({ rows: [{ eventId: "unrelated", eventType: "presence", status: "open" }] });
  assertCompositeFailure(missingApiRow, "responseBaselineMatched");
  assert(missingApiRow.responseBaselineMatched.reasonCodes.includes("FIXTURE_EVENT_ROW_MISSING"),
    "EVT-023 missing authoritative event row did not fail closed");

  const duplicateApiRow = evidenceFor({ rows: [
    { eventId, eventType: "presence", status: "open" },
    { eventId, eventType: "presence", status: "open" },
  ] });
  assertCompositeFailure(duplicateApiRow, "responseBaselineMatched");
  assert(duplicateApiRow.responseBaselineMatched.reasonCodes.includes("FIXTURE_EVENT_ROW_DUPLICATE"),
    "EVT-023 duplicate authoritative event row did not fail closed");

  for (const [field, value] of [["eventType", "motion"], ["status", "closed"]]) {
    const apiMismatch = evidenceFor({ rows: [{ eventId, eventType: "presence", status: "open", [field]: value }] });
    assertCompositeFailure(apiMismatch, "responseBaselineMatched");
    assert(apiMismatch.responseBaselineMatched.reasonCodes.includes("FIXTURE_ROW_PROJECTION_MISMATCH"),
      `EVT-023 authoritative ${field} mismatch did not fail closed`);
  }

  for (const [label, dom, failureCode] of [
    ["event id", { ...observed, text: "presence · open eventId unrelated", nodeTexts: ["presence · open eventId unrelated"], count: 1, visibleCount: 1 }, "DOM_FIXTURE_EVENT_ID_NOT_OBSERVED"],
    ["event type", { ...observed, text: `motion · open eventId ${eventId}`, nodeTexts: [`motion · open eventId ${eventId}`], count: 1, visibleCount: 1 }, "DOM_FIXTURE_EVENT_TYPE_NOT_OBSERVED"],
    ["status", { ...observed, text: `presence · closed eventId ${eventId}`, nodeTexts: [`presence · closed eventId ${eventId}`], count: 1, visibleCount: 1 }, "DOM_FIXTURE_STATUS_NOT_OBSERVED"],
  ]) {
    const failed = evidenceFor({ dom });
    assertCompositeFailure(failed, "fixtureObserved");
    assert(failed.fixtureObserved.reasonCode === failureCode,
      `EVT-023 wrong ${label} returned ${failed.fixtureObserved.reasonCode}`);
  }

  const distributed = evidenceFor({
    dom: {
      ...observed,
      count: 2,
      visibleCount: 2,
      text: `${eventId} presence open`,
      nodeTexts: [`eventId ${eventId}`, "presence · open"],
    },
  });
  assertCompositeFailure(distributed, "fixtureObserved");
  assert(distributed.fixtureObserved.matchedNodeCount === 0,
    "EVT-023 distributed event identity fields were combined across rows");

  const duplicateDom = evidenceFor({
    dom: {
      ...observed,
      count: 2,
      visibleCount: 2,
      text: `${fixtureRow} ${fixtureRow}`,
      nodeTexts: [fixtureRow, fixtureRow],
    },
  });
  assertCompositeFailure(duplicateDom, "fixtureObserved");
  assert(duplicateDom.fixtureObserved.reasonCode === "DOM_FIXTURE_IDENTITY_DUPLICATE",
    "EVT-023 duplicate Ops timeline row did not fail closed");

  const serialized = JSON.stringify(passing);
  for (const raw of [eventId, "presence", "open"])
    assert(!serialized.includes(raw), `EVT-023 structured row evidence exposed raw material: ${raw}`);

  for (const field of ["eventId", "eventType", "status"]) {
    const incomplete = structuredClone(passing);
    delete incomplete.fixtureObserved.fieldMatches[field];
    await expectReject(
      () => Promise.resolve(validateEventDomSemanticCompositeEvidence(incomplete)),
      "required structured fields are missing",
    );
  }
});

await check("EVT-026 reuses the exact EventRecord lifecycle preservation contract", async () => {
  const eventId = "evt-026-review4-fixture";
  const fixtureDigest = crypto.createHash("sha256").update(eventId).digest("hex");
  const fixtureRow = `presence · open eventId ${eventId}`;
  const renderActionId = "EVT-026:assert-visible-read-model:ops-timeline-refresh";
  const renderCycleId = `${renderActionId}:cycle-1`;
  const correlationId = `${renderActionId}:correlation`;
  const opsNetworkEntries = [{
    phase: "request-start",
    requestId: "native-request-ops-status",
    caseRequestIdentity: "EVT-026:request-2",
    caseRequestSequence: 2,
    requestKind: "application-fetch",
    correlationId,
    correlationSource: "request-header",
    requestHeaderDigest: crypto.createHash("sha256").update(correlationId).digest("hex"),
    correlationRouteState: "injected-outer",
    correlationRouteActionId: renderActionId,
    correlationRouteDigest: crypto.createHash("sha256").update(correlationId).digest("hex"),
    initiatorActionId: renderActionId,
    renderCycleId,
    requestOwnershipKind: "case-owned-refresh-action",
    requestStartedAtMs: 1000,
    method: "GET",
    url: "http://runtime.invalid/ops/api/events/status?limit=5&includeArchives=1",
  }, {
    phase: "response",
    requestId: "native-request-ops-status",
    caseRequestIdentity: "EVT-026:request-2",
    caseRequestSequence: 2,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    requestKind: "application-fetch",
    correlationId,
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
    requestHeaderDigest: crypto.createHash("sha256").update(correlationId).digest("hex"),
    correlationRouteState: "injected-outer",
    correlationRouteActionId: renderActionId,
    correlationRouteDigest: crypto.createHash("sha256").update(correlationId).digest("hex"),
    initiatorActionId: renderActionId,
    renderCycleId,
    requestOwnershipKind: "case-owned-refresh-action",
    requestStartedAtMs: 1000,
    responseObservedAtMs: 1100,
    method: "GET",
    status: 200,
    safeResponseProjectionSource: "playwright-response-json",
    safeResponseProjectionKind: "ops-incident-timeline-event-records",
    safeResponseForbiddenMaterialObserved: false,
    url: "http://runtime.invalid/ops/api/events/status?limit=5&includeArchives=1",
  }];
  const baseline = {
    schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
    identityKind: "event-record",
    collectionPath: "records.records",
    identityPaths: ["eventId"],
    identityValue: eventId,
    projectionPaths: ["eventType", "status"],
    expectedProjection: { eventType: "presence", status: "open" },
  };
  const fixtureIdentity = {
    schema: "media-server.v390-ui-event-dom-fixture-identity.v1",
    caseId: "EVT-026",
    kind: "event-record",
    eventId,
    eventIdentityDigest: fixtureDigest,
    eventType: "presence",
    status: "open",
    expectedNodeTokens: [eventId, "presence", "open"],
    apiExpectedProjection: baseline.expectedProjection,
  };
  const observed = {
    count: 1,
    visibleCount: 1,
    text: fixtureRow,
    nodeTexts: [fixtureRow],
    fixtureIdentityNodes: [{ eventId }],
    attributes: [],
    values: [],
    descendantCount: 4,
    properties: {
      routeLocalIncidentTimeline: {
        routePath: "/ops/dashboard",
        lifecycleObserved: true,
        containerCount: 1,
        incidentUnitNodeCount: 1,
        eventRecordCandidateCount: 1,
        renderPhase: "dom-committed",
        eventRecordInputCount: 1,
        eventRecordBoundedCount: 1,
        eventRecordDomCount: 1,
        incidentInputCounts: JSON.stringify({ "event-record": 1 }),
        incidentBoundedCounts: JSON.stringify({ "event-record": 1 }),
        responseEventIdentityDigests: [fixtureDigest],
        renderInputEventIdentityDigests: [fixtureDigest],
        sortedEventIdentityDigests: [fixtureDigest],
        boundedEventIdentityDigests: [fixtureDigest],
        domEventIdentityDigests: [fixtureDigest],
        ownedRenderCycle: {
          actionId: renderActionId,
          renderCycleId,
          startedAtMs: 900,
          completedAtMs: 1200,
          initialPhase: "dom-committed",
          finalPhase: "dom-committed",
          phaseMutationCount: 2,
          domMutationCount: 1,
          expectedPhaseMatched: true,
        },
        attributeNames: ["class", "data-incident-event-id", "data-incident-unit", "data-incident-workflow"],
      },
    },
  };
  const evidenceFor = dom => buildEventDomSemanticCompositeEvidence({
    caseId: "EVT-026",
    selector: "#dashIncidentTimeline",
    observed: dom,
    responseBodies: [{ records: { records: [{ eventId, eventType: "presence", status: "open" }] } }],
    priorResponseByPath: { "eventId/status": baseline },
    fixtureCandidates: [eventId],
    fixtureIdentity,
    expectedFixtureIdentity: fixtureIdentity,
    fixtureRequired: true,
    networkEntries: opsNetworkEntries,
    actualBrowserExecution: true,
  });
  const passing = evidenceFor(observed);
  assert(passing.pass === true && passing.routeLocalDomBinding?.pass === true &&
    passing.fixtureObserved.matchedNodeCount === 1 &&
    passing.routeLocalDomBinding.expectedFixtureDigest === fixtureDigest,
  "EVT-026 exact EventRecord lifecycle did not pass");
  const lost = structuredClone(observed);
  lost.properties.routeLocalIncidentTimeline.boundedEventIdentityDigests = [];
  lost.properties.routeLocalIncidentTimeline.domEventIdentityDigests = [];
  lost.properties.routeLocalIncidentTimeline.eventRecordBoundedCount = 0;
  lost.properties.routeLocalIncidentTimeline.eventRecordDomCount = 0;
  lost.properties.routeLocalIncidentTimeline.eventRecordCandidateCount = 0;
  const failed = evidenceFor(lost);
  assert(failed.pass === false &&
    failed.routeLocalDomBinding?.failureCode === "OPS_INCIDENT_TIMELINE_LIFECYCLE_MISMATCH",
  "EVT-026 EventRecord lifecycle loss did not fail closed");
});

await check("EVT-026 owned refresh reads the adapter renderObservation lifecycle", () => {
  const actionId = "EVT-026:assert-visible-read-model:ops-timeline-refresh";
  const renderCycleId = `${actionId}:cycle-1`;
  const cycle = {
    schema: "media-server.v390-ui-owned-request-render-cycle.v1",
    actionId,
    renderCycleId,
    method: "GET",
    path: "/ops/api/events/status?limit=5&includeArchives=1",
    status: 200,
    requestCandidateCount: 1,
    responseCandidateCount: 1,
    requestIdentityDigest: "a".repeat(64),
    requestSequence: 2,
    requestStartedAtMs: 1000,
    responseObservedAtMs: 1100,
    responseRequestObjectObserved: true,
    identityMatched: true,
    renderObservation: {
      actionId,
      renderCycleId,
      startedAtMs: 900,
      completedAtMs: 1200,
      initialPhase: "dom-committed",
      finalPhase: "dom-committed",
      phaseMutationCount: 2,
      domMutationCount: 1,
      expectedPhaseMatched: true,
    },
  };
  const evidence = buildOwnedRefreshStabilityEvidence(cycle);
  assert(evidence.pass === true, "nested owned refresh render lifecycle did not pass");
  for (const [label, mutate] of [
    ["duplicate-request", value => { value.requestCandidateCount = 2; }],
    ["response-object", value => { value.responseRequestObjectObserved = false; }],
    ["request-identity", value => { value.requestIdentityDigest = ""; }],
    ["action", value => { value.renderObservation.actionId = "EVT-048:other"; }],
    ["cycle", value => { value.renderObservation.renderCycleId = `${actionId}:cycle-2`; }],
    ["response-order", value => { value.responseObservedAtMs = 800; }],
    ["render-order", value => { value.renderObservation.completedAtMs = 1050; }],
    ["phase", value => { value.renderObservation.finalPhase = "rendering"; }],
    ["dom-mutation", value => { value.renderObservation.domMutationCount = 0; }],
  ]) {
    const invalid = structuredClone(cycle);
    mutate(invalid);
    assert(buildOwnedRefreshStabilityEvidence(invalid).pass === false,
      `${label} owned refresh drift did not fail closed`);
  }
});

await check("exact DOM attributes bind to the selected event row and fail closed", () => {
  const requiredAttributes = [{ name: "data-incident-unit", operator: "equals", value: "event-record" }];
  const candidates = [
    {
      index: 0,
      attributeNames: ["data-incident-unit", "data-incident-workflow"],
      attributeValues: {
        "data-incident-unit": "runtime-status",
        "data-incident-workflow": "cause-impact-next-action",
      },
    },
    {
      index: 1,
      attributeNames: ["data-incident-unit", "data-incident-workflow"],
      attributeValues: {
        "data-incident-unit": "event-record",
        "data-incident-workflow": "cause-impact-next-action",
      },
    },
  ];
  const evidenceFor = (overrides = {}) => buildExactDomAttributeBindingEvidence({
    selector: '#dashIncidentTimeline [data-incident-unit="event-record"]',
    requiredAttributes,
    candidates,
    nodeCount: candidates.length,
    selectedIndices: [1],
    ...overrides,
  });
  const passing = evidenceFor();
  assert(passing.pass === true && passing.candidateCount === 2 &&
    passing.selectedIndex === 1 && passing.selectedNodeCount === 1 &&
    passing.attributes[0].observations[0].observedName === "data-incident-unit" &&
    passing.attributes[0].observations[0].observedValue === "event-record",
  "selected event row exact attribute evidence did not pass");
  for (const value of [null, "Event-Record", " event-record", "event-record "]) {
    const mutated = structuredClone(candidates);
    if (value === null) {
      mutated[1].attributeNames = ["data-incident-workflow"];
      delete mutated[1].attributeValues["data-incident-unit"];
    } else {
      mutated[1].attributeValues["data-incident-unit"] = value;
    }
    assert(evidenceFor({ candidates: mutated }).pass === false,
      `exact attribute accepted missing/case/whitespace drift: ${String(value)}`);
  }
  assert(evidenceFor({ selectedIndices: [0] }).pass === false,
    "attribute validator accepted a different selector node");
  assert(evidenceFor({ selectedIndices: [1, 1] }).pass === false,
    "attribute validator accepted duplicate selected indices");
  assert(evidenceFor({ selectedIndices: [0, 1] }).pass === false,
    "attribute validator accepted duplicate selected event candidates");
  assert(runtimeSource.includes("node.getAttribute(name)") &&
    runtimeSource.includes("matchedNodeIndices"),
  "runtime does not read exact attributes from the semantically selected node");
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
  const body = eventBody();
  const browser = eventBrowser({ body });
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
    catalogBindings: eventCatalogBindings("EVT-001", body),
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
    observations: {
      "#dashRuntimeTrendSparkline": {
        count: 1,
        visibleCount: 1,
        text: "bounded runtime samples 3",
        properties: {
          runtimeTrendSamples: [
            { sessions: 2, taps: 1 },
            { sessions: 2, taps: 1 },
            { sessions: 2, taps: 1 },
          ],
        },
      },
    },
  });
  let fetchCount = 0;
  const request = browser.request;
  browser.request = async args => {
    fetchCount += 1;
    return request(args);
  };
  const evaluate = browser.evaluate;
  browser.evaluate = async script => {
    if (String(script).includes("dashboardRuntimeTrendSamples.length")) return 3;
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
        repeatedRequests: [{
          method: "GET",
          path: "/ops/api/runtime/status",
          count: 3,
          intervalMs: 250,
        }],
        sensitiveCanaries: [],
      },
    },
  });
  assert(fetchCount === 3 && result.responses[0].sampleCount === 3 &&
    result.responses[0].sampleDigests.length === 3,
  "EVT-024 bounded repeat cardinality was not executed");
});

await check("requested EVT binding scope is complete and excludes specialized mutation paths", async () => {
  const requested = "003,004,007,016,017,019,020,022,023,024,025,026,028,030,031,036,041,042,043,044,046,047,048,049,050,051,052,053,054,055,056,057,058,064,065,066,067,069,070,071,072,075"
    .split(",").map(value => `EVT-${value}`);
  assert(requested.length === 42 && requested.every(usesEventExactRuntimeBindings),
    "requested EVT exact runtime binding scope is incomplete");
  assert(["EVT-001", "EVT-018", "EVT-021", "EVT-037", "EVT-038", "EVT-061", "EVT-068"]
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
  const request = browser.request;
  browser.request = async args => {
    assert(route === "/ops/sources",
      "SRC-034 exact fetch did not preserve the product screen route");
    fetches += 1;
    const result = await request(args);
    const json = {
      schema: "media-server.ops.v330-source-onboarding-quality-summary.v1",
      onboardingQualitySummary: { inputKinds: ["ONVIF", "WHEP", "RTSP"] },
    };
    return { ...result, status: 200, text: JSON.stringify(json), json, contentType: "application/json" };
  };
  browser.evaluate = async script => {
    if (script === "location.pathname + location.search + location.hash") return route;
    if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
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
    const request = browser.request;
    browser.request = async args => {
      fetches += 1;
      const result = await request(args);
      const json = {
        schema: "media-server.ops.v330-source-onboarding-quality-summary.v1",
        onboardingQualitySummary: {},
      };
      return { ...result, status: apiStatus, text: JSON.stringify(json), json, contentType: "application/json" };
    };
    browser.evaluate = async script => {
      if (script === "location.pathname + location.search + location.hash") return route;
      if (script === "location.pathname") return new URL(route, "http://runtime.invalid").pathname;
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
  }), "RESPONSE_STATUS_MISMATCH");
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

await check("catalog runtime mutation binds the declared action request object instead of a path peer", async () => {
  const caseId = "CLIENT-019";
  const actionId = "CLIENT-019:assert-product-state";
  const correlationId = "CLIENT-019:assert-product-state:completion";
  const path = "/client/api/views/9001/webrtc/session";
  const plan = buildCatalogRuntimeMutationOwnershipPlan({
    item: { caseId },
    spec: {
      action: { kind: "start-live-tile" },
      requests: [{ method: "POST", path, allowedStatuses: [200] }],
    },
    actionId,
    correlationId,
    primaryAction: null,
  });
  assert(plan.length === 1 && plan[0].method === "POST" &&
    plan[0].urlPath === path && plan[0].expectedRequestCount === 1 &&
    plan[0].expectedResponseCount === 1 &&
    plan[0].initiatorActionId === actionId &&
    plan[0].correlationId === correlationId,
  "CLIENT-019 runtime mutation ownership plan is incomplete");

  const backgroundRequest = {
    phase: "request-start",
    requestId: "background-request",
    caseRequestIdentity: "CLIENT-019:request-8",
    caseRequestSequence: 8,
    method: "POST",
    url: `http://runtime.invalid${path}`,
    correlationId: "",
    initiatorActionId: "",
    ledgerOwner: "page",
    exactActionRequestOwned: false,
    requestBody: { offer: "background" },
  };
  const backgroundResponse = {
    ...backgroundRequest,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    safeResponseBody: { sessionId: "background-session", offerReceived: true },
  };
  const ownedRequest = {
    ...backgroundRequest,
    requestId: "owned-request",
    caseRequestIdentity: "CLIENT-019:request-9",
    caseRequestSequence: 9,
    correlationId,
    initiatorActionId: actionId,
    correlationRouteActionId: actionId,
    correlationRouteState: "injected-outer",
    ledgerOwner: "page",
    exactActionRequestOwned: false,
    requestBody: { offer: "owned" },
  };
  const ownedResponse = {
    ...ownedRequest,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    safeResponseBody: { sessionId: "owned-session", offerReceived: true },
  };
  const binding = selectCatalogRuntimeMutationResponse({
    entries: [backgroundRequest, backgroundResponse, ownedRequest, ownedResponse],
    caseId,
    actionId,
    correlationId,
    method: "POST",
    urlPath: path,
    allowedStatuses: [200],
    expectedResponseCount: 1,
  });
  assert(binding.requestEntries.length === 1 && binding.responseEntries.length === 1 &&
    binding.requestEntry.requestId === "owned-request" &&
    binding.responseEntry.requestId === "owned-request" &&
    binding.responseEntry.safeResponseBody.sessionId === "owned-session",
  "CLIENT-019 runtime mutation selected a path-identical background response");

  await expectReject(async () => selectCatalogRuntimeMutationResponse({
    entries: [ownedRequest, ownedResponse, { ...ownedRequest, requestId: "duplicate-request",
      caseRequestIdentity: "CLIENT-019:request-10", caseRequestSequence: 10 }],
    caseId,
    actionId,
    correlationId,
    method: "POST",
    urlPath: path,
    allowedStatuses: [200],
    expectedResponseCount: 1,
  }), "runtime mutation request owner cardinality mismatch");
  await expectReject(async () => selectCatalogRuntimeMutationResponse({
    entries: [{ ...ownedRequest, correlationId: "wrong" },
      { ...ownedResponse, correlationId: "wrong" }],
    caseId,
    actionId,
    correlationId,
    method: "POST",
    urlPath: path,
    allowedStatuses: [200],
    expectedResponseCount: 1,
  }), "runtime mutation request owner cardinality mismatch");
  await expectReject(async () => selectCatalogRuntimeMutationResponse({
    entries: [{ ...ownedRequest, correlationRouteActionId: "CLIENT-019:wrong-action" },
      { ...ownedResponse, correlationRouteActionId: "CLIENT-019:wrong-action" }],
    caseId,
    actionId,
    correlationId,
    method: "POST",
    urlPath: path,
    allowedStatuses: [200],
    expectedResponseCount: 1,
  }), "runtime mutation request owner cardinality mismatch");
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
  const body = eventBody();
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body, domText: { "#dashActiveSessions": "99" } }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
    catalogBindings: eventCatalogBindings("EVT-001", body),
  }), "exact DOM semantic assertion failed");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body, network: [{ phase: "request-start", method: "POST", url: "http://runtime.invalid/events/leak" }] }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    actionId: "EVT-001:assert-visible-read-model",
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
    catalogBindings: eventCatalogBindings("EVT-001", body),
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

await check("client media readiness and nullable fields preserve their product ownership", async () => {
  for (const snippet of [
    'operator === "path-present"',
    "root.closest?.('[data-tile]')",
    "video.readyState >= 2",
    "prepareExactViewportObservation",
    "document.scrollingElement",
    "scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })",
    "requestAnimationFrame(() => requestAnimationFrame(resolve))",
  ]) {
    assert(runtimeBrowserSource.includes(snippet),
      `client runtime lifecycle source missing ${snippet}`);
  }
  assert(!runtimeSource.includes("videoCount >= minimumPlaying"),
    "client media readiness accepts merely present, non-playing videos");
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
console.log(`- scriptsInternalRegExpConstructors: ${dynamicRegExpAudit.constructorSites}`);
console.log(`- pageEvaluateRegExpConstructors: ${dynamicRegExpAudit.pageEvaluateConstructorSites}`);
console.log(`- pageEvaluateDynamicRegExpConstructors: ${dynamicRegExpAudit.pageEvaluateDynamicConstructorSites}`);
console.log(`- fixtureDerivedLiteralRegExpConstructors: ${dynamicRegExpAudit.fixtureDerivedLiteralConstructorSites}`);
console.log(`- canonicalEvaluatorRegExpConstructors: ${dynamicRegExpAudit.canonicalEvaluatorConstructorSites}`);
console.log(`- canonicalEvaluatorExplicitValidatedRegExpConstructors: ${dynamicRegExpAudit.canonicalEvaluatorExplicitValidatedConstructorSites}`);
console.log(`- canonicalEvaluatorStaticSourceRegExpConstructors: ${dynamicRegExpAudit.canonicalEvaluatorStaticSourceConstructorSites}`);
console.log(`- canonicalEvaluatorUnsafeDynamicRegExpConstructors: ${dynamicRegExpAudit.canonicalEvaluatorUnsafeConstructorSites}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (failures.length > 0) process.exit(1);

function auditInternalDynamicRegExpBoundaries() {
  const directory = new URL("./", import.meta.url);
  const fileNames = fs.readdirSync(directory)
    .filter(name => name.endsWith(".mjs"))
    .sort();
  let constructorSites = 0;
  let bareConstructorSites = 0;
  let evaluateCallsites = 0;
  let evaluateFiles = 0;
  let pageEvaluateConstructorSites = 0;
  let pageEvaluateDynamicConstructorSites = 0;
  let canonicalEvaluatorConstructorSites = 0;
  let canonicalEvaluatorExplicitValidatedConstructorSites = 0;
  let canonicalEvaluatorStaticSourceConstructorSites = 0;
  let canonicalEvaluatorUnsafeConstructorSites = 0;
  const canonicalEvaluatorFiles = new Set([
    "v390_ui_case_runtime.mjs",
    "v390_ui_completion_oracle.mjs",
    "v390_ui_diagnostic_lifecycle_lib.mjs",
    "v390_ui_exact_event_oracle_evaluator.mjs",
    "v390_ui_exact_oracle_runtime.mjs",
    "v390_ui_native_adapter.mjs",
    "v390_ui_native_exact_cases_lib.mjs",
    "v390_ui_shared_adapter_lifecycle.mjs",
    "v390_ui_visual_evidence.mjs",
  ]);
  for (const fileName of fileNames) {
    const source = fs.readFileSync(new URL(fileName, directory), "utf8");
    const constructors = [...source.matchAll(/\bnew\s+RegExp\s*\(/g)];
    const bare = [...source.matchAll(/(?<!new\s)\bRegExp\s*\(/g)];
    const callsites = [...source.matchAll(/\b(?:browser|page|locator)\.evaluate\s*\(/g)];
    constructorSites += constructors.length;
    bareConstructorSites += bare.length;
    evaluateCallsites += callsites.length;
    if (callsites.length > 0) evaluateFiles += 1;
    if (canonicalEvaluatorFiles.has(fileName)) {
      canonicalEvaluatorConstructorSites += constructors.length;
      for (const match of constructors) {
        const context = source.slice(Math.max(0, Number(match.index) - 120),
          Math.min(source.length, Number(match.index) + 180));
        if (fileName === "v390_ui_visual_evidence.mjs" &&
            context.includes("descriptor.source") &&
            source.includes("explicitRegexPatternSchema") &&
            source.includes("EXPLICIT_REGEX_COMPILE_INVALID")) {
          canonicalEvaluatorExplicitValidatedConstructorSites += 1;
        } else if (fileName === "v390_ui_native_exact_cases_lib.mjs" &&
            context.includes("dynamicSelectorPattern")) {
          canonicalEvaluatorStaticSourceConstructorSites += 1;
        } else {
          canonicalEvaluatorUnsafeConstructorSites += 1;
        }
      }
    }
    for (const body of evaluateTemplateBodies(source)) {
      const bodyConstructors = [...body.matchAll(/\bnew\s+RegExp\s*\(([^)]*)\)/g)];
      pageEvaluateConstructorSites += bodyConstructors.length;
      pageEvaluateDynamicConstructorSites += bodyConstructors.filter(match =>
        !/^\s*["']/.test(match[1])).length;
    }
  }
  return Object.freeze({
    scriptsInternalMjsFiles: fileNames.length,
    constructorSites,
    bareConstructorSites,
    evaluateFiles,
    evaluateCallsites,
    pageEvaluateConstructorSites,
    pageEvaluateDynamicConstructorSites,
    canonicalRuntimeConstructorSites:
      [...runtimeSource.matchAll(/\bnew\s+RegExp\s*\(/g)].length,
    fixtureDerivedLiteralConstructorSites:
      [...runtimeSource.matchAll(/\bnew\s+RegExp\s*\(/g)].length,
    canonicalEvaluatorConstructorSites,
    canonicalEvaluatorExplicitValidatedConstructorSites,
    canonicalEvaluatorStaticSourceConstructorSites,
    canonicalEvaluatorUnsafeConstructorSites,
  });
}

function evaluateTemplateBodies(source) {
  const bodies = [];
  const startPattern = /\b(?:browser|page|locator)\.evaluate\s*\(\s*`/g;
  for (const match of source.matchAll(startPattern)) {
    const start = Number(match.index) + match[0].length;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === "`") {
        bodies.push(source.slice(start, index));
        break;
      }
    }
  }
  return bodies;
}

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

function eventCatalogBindings(caseId, body) {
  const paths = {
    "sessionManager.activeSessions": body.sessionManager.activeSessions,
    "sessionManager.activeAnalysisTaps": body.sessionManager.activeAnalysisTaps,
    "sessionManager.registryActiveStreams": body.sessionManager.registryActiveStreams,
    "webrtcHttp.publishSources.length": body.webrtcHttp.publishSources.length,
  };
  return {
    eventExactRuntime: {
      schema: "media-server.v390-ui-event-runtime-bindings.v1",
      caseId,
      seedByPath: {},
      requestByPath: {},
      priorResponseByPath: paths,
      domResponseBaselineByTarget: { ...paths },
      rowLocalResponseTargets: [],
      repeatedRequests: [],
      sensitiveCanaries: [],
    },
  };
}

function eventBrowser({
  status = 200,
  body = eventBody(),
  domText = {},
  observations = {},
  network = [],
} = {}) {
  const texts = {
    "#dashActiveSessions": String(body.sessionManager?.activeSessions ?? 0),
    "#dashActiveStreams": String(body.sessionManager?.registryActiveStreams ?? 0),
    "#dashActiveTaps": String(body.sessionManager?.activeAnalysisTaps ?? 0),
    "#dashPublishSources": String(body.webrtcHttp?.publishSources?.length ?? 0),
    ...domText,
  };
  return fakeBrowser({
    route: "/ops/dashboard",
    status,
    body,
    texts,
    observations,
    network,
  });
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
  let activeRequestActionContext = null;
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
    beginRequestActionOwnership: async scope => {
      if (activeRequestActionContext) {
        throw new Error("nested request action ownership is forbidden");
      }
      activeRequestActionContext = Object.freeze({
        schema: "media-server.v390-ui-request-action-context.v1",
        ...scope,
      });
      correlationId = String(scope.correlationId || "");
      return activeRequestActionContext;
    },
    endRequestActionOwnership: async context => {
      if (!activeRequestActionContext || context !== activeRequestActionContext) {
        throw new Error("request action context is stale or wrong");
      }
      activeRequestActionContext = null;
      correlationId = "";
      return { status: "attested" };
    },
    cleanupRequestActionOwnership: () => {
      const clearedActiveOwner = Boolean(activeRequestActionContext);
      activeRequestActionContext = null;
      correlationId = "";
      return { status: "PASS", clearedActiveOwner };
    },
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
        descendants: observation?.descendants ?? [],
        descendantMatches: observation?.descendantMatches ?? [],
        descendantCount: observation?.descendantCount ?? 0,
        properties: observation?.properties ?? {},
      };
    },
  };
}

function clientSequenceBrowser() {
  const entries = [];
  let clickCount = 0;
  let state = { ariaLabel: "타일 1 재생", paused: true };
  let activeRequestActionContext = null;
  const envelopes = [];
  let requestSequence = 0;
  const response = (method, path, body) => {
    requestSequence += 1;
    const identity = `CLIENT-020:request-${requestSequence}`;
    const requestId = `client-sequence-request-${requestSequence}`;
    const common = {
      requestId,
      caseRequestIdentity: identity,
      caseRequestSequence: requestSequence,
      method,
      url: `http://runtime.invalid${path}`,
      correlationId: activeRequestActionContext?.correlationId || "",
      initiatorActionId: activeRequestActionContext?.actionId || "",
      correlationRouteActionId: activeRequestActionContext?.actionId || "",
      correlationRouteState: "injected-outer",
      ledgerOwner: "action",
      exactActionRequestOwned: true,
    };
    entries.push({
      ...common,
      phase: "request-start",
      requestBody: method === "POST" ? { offer: "contract" } : null,
    }, {
      ...common,
      phase: "response",
      status: 200,
      responseRequestObjectObserved: true,
      safeResponseBody: body,
    });
  };
  return {
    networkEntries: () => entries,
    setCorrelationId: async () => {},
    beginRequestActionOwnership: async scope => {
      if (activeRequestActionContext) {
        throw new Error("nested request action ownership is forbidden");
      }
      activeRequestActionContext = Object.freeze({ ...scope });
      return activeRequestActionContext;
    },
    registerRequestActionEnvelope: (context, envelope) => {
      assert(context === activeRequestActionContext,
        "CLIENT-020 contract registered an envelope outside its action context");
      envelopes.push(structuredClone(envelope));
      return envelope;
    },
    waitForRequestActionResponses: async context => {
      assert(context === activeRequestActionContext && envelopes.length === 2,
        "CLIENT-020 contract mutation response barriers are incomplete");
      return envelopes;
    },
    endRequestActionOwnership: async context => {
      if (context !== activeRequestActionContext) {
        throw new Error("request action context is stale or wrong");
      }
      activeRequestActionContext = null;
      return { status: "attested" };
    },
    cleanupRequestActionOwnership: () => {
      activeRequestActionContext = null;
      return { status: "PASS" };
    },
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
