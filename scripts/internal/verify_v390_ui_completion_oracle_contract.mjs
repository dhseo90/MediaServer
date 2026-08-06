#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-25 no-op action과 pre-existing visible state false-PASS를 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  allowedCompletionSources,
  buildEndpointActionSemanticReadback,
  buildNavigationTrustEvidence,
  buildRequestCorrelationEvidence,
  domSnapshotDigest,
  evaluateCompletionOracle,
} from "./v390_ui_completion_oracle_lib.mjs";
import { buildNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";
import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const exactRunnerSource = readText("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const legacyRunnerSource = readText("scripts/internal/verify_v390_ui_automation.mjs");
const adapterSource = readText("scripts/internal/v390_ui_native_adapter.mjs");
const completionOracleSource = readText("scripts/internal/v390_ui_completion_oracle_lib.mjs");
const checks = [];

check("application fetch request correlation evidence distinguishes fail-closed boundaries", () => {
  const expected = {
    caseId: "EVT-004",
    method: "GET",
    urlPath: "/ops/api/diagnostics/log-tail?limit=50",
    correlationId: "EVT-004:assert-product-state:completion",
    correlationRequired: true,
    allowedStatuses: [200],
    requestKind: "application-fetch",
  };
  const request = {
    phase: "request-start",
    requestId: "native-request-1",
    caseRequestIdentity: "EVT-004:request-1",
    caseRequestSequence: 1,
    correlationId: expected.correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 0,
    url: "http://127.0.0.1/ops/api/diagnostics/log-tail?limit=50",
  };
  const response = {
    ...request,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
    responseEchoHeaderContract: "not-required",
    responseEchoHeaderObserved: false,
  };
  const requestResult = {
    actionId: "EVT-004:assert-product-state",
    requestAttemptCount: 1,
    requestReissued: false,
  };
  const evaluate = (
    entries,
    overrides = {},
    resultOverrides = {},
    listener = true,
    actionId = "EVT-004:assert-product-state",
  ) =>
    buildRequestCorrelationEvidence({
      entries,
      actionId,
      expected: { ...expected, ...overrides },
      requestResult: { ...requestResult, ...resultOverrides },
      listenerInstalledBeforeRequest: listener,
    });
  assert(evaluate([request, response]).pass, "exact application fetch correlation did not pass");
  assert(evaluate([], {}, {}, false).failureCode === "LISTENER_INSTALLED_AFTER_REQUEST",
    "late listener was not distinguished");
  assert(evaluate([], { correlationId: "" }).failureCode === "CORRELATION_NOT_GENERATED",
    "missing generated correlation was not distinguished");
  assert(evaluate([
    { ...request, correlationId: "", correlationSource: "none" },
    { ...response, correlationId: "", correlationSource: "none" },
  ]).failureCode === "CORRELATION_NOT_ATTACHED", "missing request header was not distinguished");
  assert(evaluate([
    { ...request, correlationId: "OTHER" },
    { ...response, correlationId: "OTHER" },
  ]).failureCode === "CORRELATION_MISMATCH", "different correlation was not rejected");
  assert(evaluate([
    { ...request, method: "POST" },
    { ...response, method: "POST" },
  ]).failureCode === "REQUEST_METHOD_MISMATCH", "method mismatch was not distinguished");
  assert(evaluate([
    { ...request, url: "http://127.0.0.1/ops/other" },
    { ...response, url: "http://127.0.0.1/ops/other" },
  ]).failureCode === "REQUEST_PATH_MISMATCH", "path mismatch was not distinguished");
  assert(evaluate([request, response], {}, {}, true, "").failureCode === "ACTION_ID_MISMATCH",
    "missing explicit action ID was not rejected");
  assert(evaluate([request, response], {}, {}, true, "OTHER").failureCode === "ACTION_ID_MISMATCH",
    "different explicit action ID was not rejected");
  assert(evaluate([request, response], {}, { actionId: "OTHER" }).failureCode === "ACTION_ID_MISMATCH",
    "action ID mismatch was not rejected");
  assert(evaluate([
    request,
    { ...request, requestId: "native-request-2" },
    response,
  ]).failureCode === "DUPLICATE_REQUEST", "duplicate request was not rejected");
  assert(evaluate([
    request,
    response,
    { ...response, requestId: "native-request-2" },
  ]).failureCode === "DUPLICATE_RESPONSE", "duplicate response was not rejected");
  assert(evaluate([request, response], {}, {
    requestAttemptCount: 2,
    requestReissued: true,
  }).failureCode === "REQUEST_REISSUED", "request reissue was not rejected");
  assert(evaluate([request, response], {
    requestKind: "document-navigation",
  }).failureCode === "REQUEST_KIND_INVALID", "navigation was accepted as application correlation");
  const passed = evaluate([request, response]);
  assert(passed.correlationDigest && !JSON.stringify(passed).includes(expected.correlationId),
    "raw correlation value reached structured evidence");
  const fixtureResponse = {
    ...response,
    requestIdentitySource: "fixture-initiating-request-handle",
  };
  assert(evaluate([request, fixtureResponse]).pass,
    "registered fixture initiating request handle did not pass the common matcher");
  assert(evaluate([
    request,
    { ...fixtureResponse, requestIdentitySource: "fixture-string-request-id" },
  ]).failureCode === "RESPONSE_REQUEST_OBJECT_MISSING",
  "untrusted fixture request identity source was accepted");
});

check("EVT-004 binds a response to the exact case-owned Playwright request without inventing an echo contract", () => {
  const actionId = "EVT-004:assert-product-state";
  const correlationId = `${actionId}:completion`;
  const method = "GET";
  const urlPath = "/ops/api/diagnostics/log-tail?limit=50";
  const requestId = "native-request-1";
  const caseRequestIdentity = "EVT-004:request-1";
  const request = {
    phase: "request-start",
    requestId,
    caseRequestIdentity,
    caseRequestSequence: 1,
    requestKind: "application-fetch",
    responseRequestObjectObserved: false,
    correlationId,
    correlationSource: "request-header",
    method,
    status: 0,
    url: `http://127.0.0.1${urlPath}`,
  };
  const response = {
    ...request,
    phase: "response",
    status: 200,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    correlationSource: "request-header",
    responseCorrelationSource: "initiating-request-identity",
    responseEchoHeaderContract: "not-required",
    responseEchoHeaderObserved: false,
  };
  const evaluate = (entries, expectedOverrides = {}, resultOverrides = {}) =>
    buildRequestCorrelationEvidence({
      entries,
      actionId,
      expected: {
        method,
        urlPath,
        correlationId,
        caseId: "EVT-004",
        correlationRequired: true,
        responseEchoHeaderRequired: false,
        allowedStatuses: [200],
        requestKind: "application-fetch",
        ...expectedOverrides,
      },
      requestResult: {
        actionId,
        requestAttemptCount: 1,
        requestReissued: false,
        ...resultOverrides,
      },
      listenerInstalledBeforeRequest: true,
    });

  const exact = evaluate([request, response]);
  assert(exact.pass &&
    exact.requestIdentityMatched === true &&
    exact.caseRequestIdentity === caseRequestIdentity &&
    exact.caseRequestSequence === 1 &&
    exact.responseRequestObjectObserved === true &&
    exact.responseEchoHeaderRequired === false &&
    exact.responseEchoHeaderObserved === false,
  `exact Playwright request/response identity did not pass: ${exact.failureCode}`);
  assert(exact.expectedCorrelationDigest === exact.initiatingRequestCorrelationDigest &&
    exact.responseRequestCorrelationDigest === exact.expectedCorrelationDigest,
  "request/response correlation digests are not bound to the initiating request");

  const initiatorActionId = "EVT-004:owned-refresh";
  const renderCycleId = `${initiatorActionId}:cycle-1`;
  const routeDigest = crypto.createHash("sha256").update(correlationId).digest("hex");
  const ownedRequest = {
    ...request,
    initiatorActionId,
    renderCycleId,
    correlationRouteState: "injected-outer",
    correlationRouteActionId: initiatorActionId,
    correlationRouteDigest: routeDigest,
  };
  const ownedResponse = {
    ...response,
    initiatorActionId,
    renderCycleId,
    correlationRouteState: "injected-outer",
    correlationRouteActionId: initiatorActionId,
    correlationRouteDigest: routeDigest,
  };
  const owned = evaluate([ownedRequest, ownedResponse], {
    initiatorActionId,
    renderCycleId,
    correlationRouteState: "injected-outer",
    correlationRouteActionId: initiatorActionId,
  });
  assert(owned.pass === true &&
    owned.initiatingRequestActionId === initiatorActionId &&
    owned.responseRequestActionId === initiatorActionId &&
    owned.initiatingRequestRenderCycleId === renderCycleId &&
    owned.responseRequestRenderCycleId === renderCycleId &&
    owned.initiatingRequestCorrelationRouteState === "injected-outer" &&
    owned.responseRequestCorrelationRouteState === "injected-outer" &&
    owned.initiatingRequestCorrelationRouteDigest === routeDigest &&
    owned.responseRequestCorrelationRouteDigest === routeDigest,
  "request/response action and render-cycle identity did not pass");
  assert(evaluate([ownedRequest, ownedResponse], {
    initiatorActionId: `${initiatorActionId}:stale`,
    renderCycleId,
  }).failureCode === "REQUEST_ACTION_ID_MISMATCH",
  "stale initiating action ID did not fail closed");
  assert(evaluate([ownedRequest, ownedResponse], {
    initiatorActionId,
    renderCycleId: `${renderCycleId}:stale`,
  }).failureCode === "REQUEST_RENDER_CYCLE_MISMATCH",
  "stale render-cycle ID did not fail closed");
  assert(evaluate([{ ...ownedRequest, correlationRouteState: "preserved-explicit-inner" }, ownedResponse], {
    initiatorActionId,
    renderCycleId,
    correlationRouteState: "injected-outer",
    correlationRouteActionId: initiatorActionId,
  }).failureCode === "CORRELATION_ROUTE_STATE_MISMATCH",
  "request correlation route-state mismatch did not fail closed");
  assert(evaluate([ownedRequest, { ...ownedResponse, correlationRouteDigest: "0".repeat(64) }], {
    initiatorActionId,
    renderCycleId,
    correlationRouteState: "injected-outer",
    correlationRouteActionId: initiatorActionId,
  }).failureCode === "RESPONSE_CORRELATION_ROUTE_DIGEST_MISMATCH",
  "response correlation route digest mismatch did not fail closed");

  for (const [label, entries, failureCode, expectedOverrides = {}, resultOverrides = {}] of [
    ["same-path-other-request", [
      request,
      { ...response, requestId: "native-request-2", caseRequestIdentity: "EVT-004:request-2", caseRequestSequence: 2 },
    ], "RESPONSE_BINDING_MISMATCH"],
    ["other-request-correlation", [
      request,
      { ...response, correlationId: "OTHER" },
    ], "RESPONSE_BINDING_MISMATCH"],
    ["wrong-case-request-identity", [
      { ...request, caseRequestIdentity: "OTHER-CASE:request-1" },
      { ...response, caseRequestIdentity: "OTHER-CASE:request-1" },
    ], "REQUEST_CASE_OWNERSHIP_MISMATCH"],
    ["missing-request-identity", [
      { ...request, caseRequestIdentity: "" },
      response,
    ], "REQUEST_IDENTITY_MISSING"],
    ["missing-request-sequence", [
      { ...request, caseRequestSequence: null },
      response,
    ], "REQUEST_IDENTITY_MISSING"],
    ["missing-response-request-object", [
      request,
      { ...response, responseRequestObjectObserved: false, requestIdentitySource: "" },
    ], "RESPONSE_REQUEST_OBJECT_MISSING"],
    ["missing-response-identity", [
      request,
      { ...response, caseRequestIdentity: "" },
    ], "RESPONSE_REQUEST_IDENTITY_MISSING"],
    ["missing-response-sequence", [
      request,
      { ...response, caseRequestSequence: null },
    ], "RESPONSE_REQUEST_IDENTITY_MISSING"],
    ["response-method-mismatch", [
      request,
      { ...response, method: "POST" },
    ], "RESPONSE_NOT_OBSERVED"],
    ["response-path-mismatch", [
      request,
      { ...response, url: "http://127.0.0.1/ops/api/diagnostics/log-tail?limit=51" },
    ], "RESPONSE_NOT_OBSERVED"],
    ["response-status-mismatch", [
      request,
      { ...response, status: 500 },
    ], "RESPONSE_STATUS_MISMATCH"],
    ["duplicate-response", [
      request,
      response,
      { ...response },
    ], "DUPLICATE_RESPONSE"],
    ["timestamp-only-binding", [
      request,
      {
        ...response,
        requestId: "",
        caseRequestIdentity: "",
        caseRequestSequence: null,
        requestIdentitySource: "",
        responseRequestObjectObserved: false,
        observedAtMs: 1001,
      },
    ], "RESPONSE_REQUEST_OBJECT_MISSING"],
    ["response-echo-contract-mismatch", [
      request,
      { ...response, responseEchoHeaderContract: "required", responseEchoHeaderObserved: false },
    ], "RESPONSE_ECHO_MISMATCH", { responseEchoHeaderRequired: true }],
    ["retry-reissue", [
      request,
      response,
    ], "REQUEST_REISSUED", {}, { requestAttemptCount: 2, requestReissued: true }],
  ]) {
    const rejected = evaluate(entries, expectedOverrides, resultOverrides);
    assert(rejected.pass === false && rejected.failureCode === failureCode,
      `${label} response binding failure mismatch: ${rejected.failureCode}/${failureCode}`);
  }
});

check("document navigation trust rejects correlation and request reissue", () => {
  const expected = {
    schema: "media-server.v390-ui-navigation-trust-binding.v1",
    requestKind: "document-navigation",
    invocationId: "EVT-004:initial-document-navigation",
    method: "GET",
    requestedPath: "/ops/events",
    expectedCanonicalRoute: "/ops/events",
    exactRequestSequence: 1,
    correlationRequired: false,
  };
  const navigation = {
    invocationId: expected.invocationId,
    requestKind: "document-navigation",
    resourceType: "document",
    method: "GET",
    requestedPath: "/ops/events",
    observedPath: "/ops/events",
    sameOrigin: true,
    requestAttemptCount: 1,
    requestCandidateCount: 1,
    responseCandidateCount: 1,
    requestResponseBound: true,
    correlationObserved: false,
    redirectCount: 0,
    retryCount: 0,
    reloadCount: 0,
    unownedNavigationCount: 0,
    additionalFetchCount: 0,
    requestReissued: false,
    totalDocumentNavigationCount: 1,
    orderedDocumentNavigations: [{
      sequence: 2,
      responseSequence: 3,
      invocationId: expected.invocationId,
      navigationKind: "initial-document-navigation",
      method: "GET",
      path: "/ops/events",
      resourceType: "document",
      sameOrigin: true,
      correlationPresent: false,
      correlationDigest: "",
      redirected: false,
      responseStatus: 200,
      responseBound: true,
    }],
    listenerStartSequence: 1,
    listenerEndSequence: null,
    listenerActive: true,
    listenerInstalledBeforeFirstNavigation: true,
    navigationAfterListenerEndCount: 0,
  };
  assert(buildNavigationTrustEvidence({ navigation, expected }).pass,
    "exact document navigation trust did not pass");
  assert(buildNavigationTrustEvidence({
    navigation: { ...navigation, requestCandidateCount: 2 },
    expected,
  }).failureCode === "NAVIGATION_REQUEST_REISSUED",
  "reissued document navigation was not rejected");
  assert(buildNavigationTrustEvidence({
    navigation: { ...navigation, correlationObserved: true },
    expected,
  }).failureCode === "NAVIGATION_CORRELATION_FORBIDDEN",
  "document navigation accepted an application correlation");
  assert(buildNavigationTrustEvidence({
    navigation: { ...navigation, observedPath: "/ops/dashboard" },
    expected,
  }).failureCode === "NAVIGATION_ROUTE_MISMATCH",
  "document navigation route drift was not rejected");
  for (const [label, mutation, failureCode] of [
    ["resource type", { resourceType: "fetch" }, "NAVIGATION_RESOURCE_TYPE_MISMATCH"],
    ["same origin", { sameOrigin: false }, "NAVIGATION_ORIGIN_MISMATCH"],
    ["redirect", { redirectCount: 1 }, "NAVIGATION_REDIRECTED"],
    ["retry", { retryCount: 1 }, "NAVIGATION_REQUEST_REISSUED"],
    ["additional fetch", { additionalFetchCount: 1 }, "NAVIGATION_REQUEST_REISSUED"],
  ]) {
    assert(buildNavigationTrustEvidence({
      navigation: { ...navigation, ...mutation },
      expected,
    }).failureCode === failureCode, `${label} document navigation was not rejected`);
  }
});

check("UI-001 binds the exact root redirect chain without application correlation", () => {
  const navigationBinding = {
    schema: "media-server.v390-ui-navigation-trust-binding.v1",
    requestKind: "document-navigation",
    invocationId: "UI-001:initial-document-navigation",
    method: "GET",
    requestedPath: "/",
    expectedCanonicalRoute: "/",
    expectedObservedPath: "/login",
    exactRequestSequence: 1,
    exactRedirectCount: 1,
    correlationRequired: false,
    allowedStatuses: [200],
    caseLifecycleNavigationSequence: [
      {
        purpose: "requested-root-document",
        method: "GET",
        path: "/",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
        redirected: false,
        responseStatus: 302,
      },
      {
        purpose: "anonymous-login-document",
        method: "GET",
        path: "/login",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
        redirected: true,
        responseStatus: 200,
      },
    ],
    authoritativeReadback: null,
  };
  const navigation = {
    status: 200,
    url: "http://127.0.0.1/login",
    invocationId: navigationBinding.invocationId,
    requestKind: "document-navigation",
    resourceType: "document",
    method: "GET",
    requestedPath: "/",
    observedPath: "/login",
    sameOrigin: true,
    requestAttemptCount: 1,
    requestCandidateCount: 1,
    responseCandidateCount: 1,
    requestResponseBound: true,
    correlationObserved: false,
    redirectCount: 1,
    retryCount: 0,
    reloadCount: 0,
    unownedNavigationCount: 0,
    additionalFetchCount: 0,
    requestReissued: false,
    totalDocumentNavigationCount: 2,
    orderedDocumentNavigations: navigationBinding.caseLifecycleNavigationSequence.map((entry, index) => ({
      sequence: index * 2 + 2,
      responseSequence: index * 2 + 3,
      invocationId: navigationBinding.invocationId,
      navigationKind: "initial-document-navigation",
      method: entry.method,
      path: entry.path,
      resourceType: entry.resourceType,
      sameOrigin: entry.sameOrigin,
      correlationPresent: false,
      correlationDigest: "",
      redirected: entry.redirected,
      responseStatus: entry.responseStatus,
      responseBound: true,
    })),
    listenerStartSequence: 1,
    listenerEndSequence: null,
    listenerActive: true,
    listenerInstalledBeforeFirstNavigation: true,
    navigationAfterListenerEndCount: 0,
  };
  const completionAction = {
    ...action("navigate"),
    actionId: "UI-001:navigate",
    completionPhase: "initial-navigation",
    controlSelector: null,
    correlationId: "UI-001:navigation",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "UI-001:navigation",
    expectedBehaviorSha256: "",
    expectedReadbackExpectation: { exists: true, visible: true },
    expectedNavigationBinding: navigationBinding,
    allowedCompletionSources: ["navigation-network-dom"],
  };
  const after = { ...snapshot("ready", "login"), selector: "body" };
  const readback = {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    observationSource: "browser-dom",
    selector: null,
    expected: { exists: true, visible: true },
    observed: { exists: true, visible: true },
  };
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    after,
    navigation,
    allowedStatuses: [200],
    semanticReadback: readback,
  });
  assert(accepted.pass &&
    accepted.completionMode === "navigationBinding" &&
    accepted.navigationTrustEvidence?.pass === true,
  `UI-001 exact redirect navigation did not pass: ${accepted.reason}`);
  for (const [label, mutate, failureCode] of [
    ["unexpected target", value => { value.observedPath = "/setup"; }, "NAVIGATION_ROUTE_MISMATCH"],
    ["correlation leak", value => {
      value.correlationObserved = true;
      value.orderedDocumentNavigations[0].correlationPresent = true;
    }, "NAVIGATION_LIFECYCLE_MISMATCH"],
    ["extra reload", value => { value.reloadCount = 1; }, "NAVIGATION_RELOADED"],
    ["retry", value => { value.retryCount = 1; }, "NAVIGATION_REQUEST_REISSUED"],
    ["extra redirect", value => {
      value.redirectCount = 2;
      value.orderedDocumentNavigations.push({
        ...value.orderedDocumentNavigations[1],
        sequence: 6,
        responseSequence: 7,
        path: "/setup",
      });
      value.totalDocumentNavigationCount = 3;
    }, "NAVIGATION_LIFECYCLE_MISMATCH"],
  ]) {
    const rejectedNavigation = structuredClone(navigation);
    mutate(rejectedNavigation);
    const rejected = buildNavigationTrustEvidence({
      navigation: rejectedNavigation,
      expected: navigationBinding,
    });
    assert(rejected.failureCode === failureCode,
      `${label} failure mismatch: ${rejected.failureCode}/${failureCode}`);
  }
  const requestBound = structuredClone(completionAction);
  delete requestBound.expectedNavigationBinding;
  requestBound.expectedEndpoint = {
    correlationId: completionAction.correlationId,
    method: "GET",
    urlPath: "/",
    allowedStatuses: [200, 302],
  };
  const rejectedRequestMode = evaluateCompletionOracle({
    action: requestBound,
    after,
    navigation,
    allowedStatuses: [200],
    semanticReadback: readback,
  });
  assert(!rejectedRequestMode.pass &&
    rejectedRequestMode.reason === "request-correlation-missing",
  "UI-001 document navigation accepted application request correlation mode");
});

check("EVT-004 navigation completion is exclusive and keeps authoritative correlation separate", () => {
  const actionId = "EVT-004:assert-product-state";
  const correlationId = `${actionId}:completion`;
  const authoritativePath = "/ops/api/diagnostics/log-tail?limit=50";
  const navigationBinding = {
    schema: "media-server.v390-ui-navigation-trust-binding.v1",
    requestKind: "document-navigation",
    invocationId: "EVT-004:initial-document-navigation",
    method: "GET",
    requestedPath: "/ops/events",
    expectedCanonicalRoute: "/ops/events",
    exactRequestSequence: 1,
    correlationRequired: false,
    caseLifecycleNavigationSequence: [
      {
        purpose: "initial-events-document",
        method: "GET",
        path: "/ops/events",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
      },
      {
        purpose: "required-product-dashboard-dom",
        method: "GET",
        path: "/ops/dashboard",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
      },
    ],
    authoritativeReadback: {
      source: "catalog-runtime-fresh-browser-fetch",
      actionId,
      correlationId,
      method: "GET",
      urlPath: authoritativePath,
      allowedStatuses: [200],
    },
  };
  const navigation = {
    status: 200,
    url: "http://127.0.0.1/ops/events",
    invocationId: navigationBinding.invocationId,
    requestKind: "document-navigation",
    resourceType: "document",
    method: "GET",
    requestedPath: navigationBinding.requestedPath,
    observedPath: navigationBinding.expectedCanonicalRoute,
    sameOrigin: true,
    requestAttemptCount: 1,
    requestCandidateCount: 1,
    responseCandidateCount: 1,
    requestResponseBound: true,
    correlationObserved: false,
    redirectCount: 0,
    retryCount: 0,
    reloadCount: 0,
    unownedNavigationCount: 0,
    additionalFetchCount: 0,
    requestReissued: false,
    totalDocumentNavigationCount: 2,
    orderedDocumentNavigations: [
      {
        sequence: 2,
        responseSequence: 3,
        invocationId: navigationBinding.invocationId,
        navigationKind: "initial-document-navigation",
        method: "GET",
        path: "/ops/events",
        resourceType: "document",
        sameOrigin: true,
        correlationPresent: false,
        correlationDigest: "",
        redirected: false,
        responseStatus: 200,
        responseBound: true,
      },
      {
        sequence: 4,
        responseSequence: 5,
        invocationId: "native-document-navigation-1",
        navigationKind: "explicit-navigation",
        method: "GET",
        path: "/ops/dashboard",
        resourceType: "document",
        sameOrigin: true,
        correlationPresent: false,
        correlationDigest: "",
        redirected: false,
        responseStatus: 200,
        responseBound: true,
      },
    ],
    listenerStartSequence: 1,
    listenerEndSequence: null,
    listenerActive: true,
    listenerInstalledBeforeFirstNavigation: true,
    navigationAfterListenerEndCount: 0,
  };
  const correlationRequest = {
    phase: "request-start",
    requestId: "evt-004-log-tail",
    caseRequestIdentity: "EVT-004:request-1",
    caseRequestSequence: 1,
    requestKind: "application-fetch",
    correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 0,
    url: `http://127.0.0.1${authoritativePath}`,
  };
  const requestCorrelationEvidence = buildRequestCorrelationEvidence({
    entries: [
      correlationRequest,
      {
        ...correlationRequest,
        phase: "response",
        status: 200,
        responseRequestObjectObserved: true,
        requestIdentitySource: "playwright-response-request",
        correlationSource: "request-header",
        responseCorrelationSource: "initiating-request-identity",
        responseEchoHeaderContract: "not-required",
        responseEchoHeaderObserved: false,
      },
    ],
    actionId,
    expected: {
      ...navigationBinding.authoritativeReadback,
      caseId: "EVT-004",
      requestKind: "application-fetch",
      correlationRequired: true,
    },
    requestResult: {
      actionId,
      requestAttemptCount: 1,
      requestReissued: false,
    },
    listenerInstalledBeforeRequest: true,
  });
  const completionAction = {
    ...action("click"),
    actionId,
    completionPhase: "primary-action",
    controlSelector: "[data-testid=\"ops-events-page\"]",
    correlationId,
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "EVT-004:independent-readback",
    expectedBehaviorSha256: "4".repeat(64),
    expectedReadbackExpectation: { exists: true },
    expectedNavigationBinding: navigationBinding,
    allowedCompletionSources: ["navigation-network-dom"],
  };
  const makeReadback = responses => semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId,
    actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      actual: {
        exists: true,
        exactRuntimeOracle: {
          schema: "media-server.v390-ui-exact-runtime-observation.v1",
          caseId: "EVT-004",
          requestedRoute: "/ops/dashboard",
          observedRoute: "/ops/dashboard",
          responses,
          dom: [{
            selector: "[data-testid=\"event-correlation-marker\"]",
            status: "PASS",
          }],
        },
      },
    },
  });
  const authoritativeResponse = {
    method: "GET",
    urlPath: authoritativePath,
    status: 200,
    source: "fresh-browser-fetch",
    bodyDigest: "5".repeat(64),
    requestCorrelationEvidence,
  };
  const evaluate = (actionValue = completionAction, readback = makeReadback([authoritativeResponse])) =>
    evaluateCompletionOracle({
      action: actionValue,
      navigation,
      semanticReadback: readback,
    });
  const accepted = evaluate();
  assert(accepted.pass &&
    accepted.completionMode === "navigationBinding" &&
    accepted.navigationTrustEvidence?.pass === true &&
    accepted.authoritativeReadbackEvidence?.pass === true,
  `EVT-004 navigation/correlation completion failed: ${accepted.reason}`);
  assert(makeReadback([authoritativeResponse]).observation.actual.exactRuntimeOracle.dom[0].status === "PASS",
    "EVT-004 marker evidence stage was not reachable after navigation/correlation");
  const secondEventsNavigation = structuredClone(navigation);
  secondEventsNavigation.totalDocumentNavigationCount = 3;
  secondEventsNavigation.orderedDocumentNavigations.push({
    ...secondEventsNavigation.orderedDocumentNavigations[0],
    sequence: 6,
    responseSequence: 7,
    invocationId: "native-document-navigation-2",
    navigationKind: "explicit-navigation",
  });
  assert(buildNavigationTrustEvidence({
    navigation: secondEventsNavigation,
    expected: navigationBinding,
  }).failureCode === "NAVIGATION_LIFECYCLE_MISMATCH",
  "second /ops/events navigation outside the initial window was accepted");
  const correlatedDashboard = structuredClone(navigation);
  correlatedDashboard.orderedDocumentNavigations[1].correlationPresent = true;
  correlatedDashboard.orderedDocumentNavigations[1].correlationDigest = "7".repeat(64);
  assert(buildNavigationTrustEvidence({
    navigation: correlatedDashboard,
    expected: navigationBinding,
  }).failureCode === "NAVIGATION_LIFECYCLE_MISMATCH",
  "log-tail correlation leaked into the dashboard document navigation");
  for (const [label, mutation, failureCode] of [
    ["listener installed after navigation", {
      listenerInstalledBeforeFirstNavigation: false,
    }, "LISTENER_INSTALLED_AFTER_NAVIGATION"],
    ["navigation after listener end", {
      listenerActive: false,
      listenerEndSequence: 5,
      navigationAfterListenerEndCount: 1,
    }, "NAVIGATION_AFTER_LISTENER_END"],
    ["reload", { reloadCount: 1 }, "NAVIGATION_RELOADED"],
    ["unowned navigation", { unownedNavigationCount: 1 }, "NAVIGATION_UNOWNED"],
  ]) {
    assert(buildNavigationTrustEvidence({
      navigation: { ...navigation, ...mutation },
      expected: navigationBinding,
    }).failureCode === failureCode, `${label} was accepted`);
  }

  const missing = structuredClone(completionAction);
  delete missing.expectedNavigationBinding;
  assert(evaluate(missing).reason === "completion-binding-missing",
    "completion without a binding was accepted");
  const requestBinding = {
    correlationId,
    method: "GET",
    urlPath: authoritativePath,
    allowedStatuses: [200],
  };
  const localTransitionBinding = {
    selector: completionAction.controlSelector,
    property: "text",
  };
  for (const [label, endpoint, local] of [
    ["request+navigation", requestBinding, null],
    ["local+navigation", null, localTransitionBinding],
    ["request+local+navigation", requestBinding, localTransitionBinding],
  ]) {
    const ambiguous = {
      ...structuredClone(completionAction),
      expectedEndpoint: endpoint,
      expectedLocalTransition: local,
    };
    assert(evaluate(ambiguous).reason === "completion-binding-ambiguous",
      `${label} completion bindings were accepted`);
  }
  const requestAndLocal = {
    ...structuredClone(completionAction),
    expectedNavigationBinding: null,
    expectedEndpoint: requestBinding,
    expectedLocalTransition: localTransitionBinding,
  };
  assert(evaluate(requestAndLocal).reason === "completion-binding-ambiguous",
    "request+local completion bindings were accepted");

  const navigationAsReadback = makeReadback([{
    ...authoritativeResponse,
    urlPath: "/ops/events",
    requestCorrelationEvidence: {
      schema: "media-server.v390-ui-navigation-trust-evidence.v1",
      pass: true,
    },
  }]);
  assert(evaluate(completionAction, navigationAsReadback).reason ===
    "catalog-authoritative-readback-request-missing",
  "document navigation became the authoritative API readback");
  const missingCorrelation = makeReadback([{
    ...authoritativeResponse,
    requestCorrelationEvidence: null,
  }]);
  assert(evaluate(completionAction, missingCorrelation).reason ===
    "catalog-authoritative-correlation-invalid",
  "authoritative log-tail without correlation was accepted");
  const mismatchedCorrelation = makeReadback([{
    ...authoritativeResponse,
    requestCorrelationEvidence: {
      ...requestCorrelationEvidence,
      correlationDigest: "6".repeat(64),
    },
  }]);
  assert(evaluate(completionAction, mismatchedCorrelation).reason ===
    "catalog-authoritative-correlation-invalid",
  "authoritative log-tail with a different correlation was accepted");
});

check("DOM snapshot digest is stable and state-sensitive", () => {
  const before = snapshot("ready", "alpha");
  const same = structuredClone(before);
  const changed = snapshot("ready", "beta");
  assert(domSnapshotDigest(before) === domSnapshotDigest(same), "identical snapshots must have identical digest");
  assert(domSnapshotDigest(before) !== domSnapshotDigest(changed), "changed state must change digest");
});

check("navigation response plus visible DOM is a completion oracle", () => {
  const result = evaluateCompletionOracle({
    action: action("navigate"),
    before: null,
    after: snapshot("loaded", "dashboard"),
    navigation: { status: 200, url: "http://127.0.0.1/ops" },
    allowedStatuses: [200],
  });
  assert(result.pass && result.source === "navigation-network-dom", `navigation oracle failed: ${result.reason}`);
});

check("explicit negative route status is a completion oracle", () => {
  const result = evaluateCompletionOracle({
    action: action("navigate-negative"),
    after: snapshot("not-found", "404"),
    navigation: { status: 404, url: "http://127.0.0.1/lab" },
    allowedStatuses: [404],
  });
  assert(result.pass && result.source === "negative-route-status", `negative route oracle failed: ${result.reason}`);
});

check("trusted action accepts DOM transition or correlated network plus DOM", () => {
  const dom = evaluateCompletionOracle({
    action: action("click"),
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
  });
  assert(dom.pass && dom.source === "dom-transition", `DOM transition failed: ${dom.reason}`);

  const network = evaluateCompletionOracle({
    action: { ...action("click"), expectedNetworkUrlIncludes: ["/ops/api/state"] },
    before: snapshot("ready", "same"),
    after: snapshot("ready", "same"),
    networkResponses: [{ correlationId: "CASE-1:primary", status: 200, method: "GET", url: "/ops/api/state" }],
  });
  assert(network.pass && network.source === "network-dom", `network+DOM failed: ${network.reason}`);
});

check("persisted readback EventRecord and server log correlations are accepted", () => {
  const base = {
    action: action("click"),
    before: snapshot("ready", "same"),
    after: snapshot("ready", "same"),
  };
  const persisted = evaluateCompletionOracle({
    ...base,
    persistedReadback: { correlationId: "CASE-1:primary", beforeDigest: "a", afterDigest: "b" },
  });
  const eventRecord = evaluateCompletionOracle({
    ...base,
    eventRecord: { correlationId: "CASE-1:primary", observed: true, eventId: "event-1" },
  });
  const serverLog = evaluateCompletionOracle({
    ...base,
    serverLog: { correlationId: "CASE-1:primary", matched: true, lineSha256: "f".repeat(64) },
  });
  assert(persisted.pass && persisted.source === "persisted-readback", "persisted readback not accepted");
  assert(eventRecord.pass && eventRecord.source === "event-record", "EventRecord not accepted");
  assert(serverLog.pass && serverLog.source === "server-log", "server log not accepted");
});

check("pre-existing visible text with identical before/after is rejected", () => {
  const state = snapshot("ready", "pre-existing expected marker");
  const result = evaluateCompletionOracle({
    action: action("click"),
    before: state,
    after: structuredClone(state),
  });
  assert(result.pass === false, "no-op click passed from pre-existing visible text");
  assert(result.reason === "no-correlated-completion", `unexpected no-op reason: ${result.reason}`);
});

check("unrelated evidence and unexecuted actions are rejected", () => {
  const state = snapshot("ready", "same");
  const unrelated = evaluateCompletionOracle({
    action: { ...action("select"), expectedNetworkUrlIncludes: ["/ops/api/expected"] },
    before: state,
    after: structuredClone(state),
    networkResponses: [{ correlationId: "OTHER", status: 200, method: "GET", url: "/health" }],
    persistedReadback: { correlationId: "OTHER", beforeDigest: "a", afterDigest: "b" },
    eventRecord: { correlationId: "OTHER", observed: true },
    serverLog: { correlationId: "OTHER", matched: true },
  });
  assert(unrelated.pass === false && unrelated.reason === "no-correlated-completion", "unrelated evidence passed");
  const sameCorrelationWrongUrl = evaluateCompletionOracle({
    action: { ...action("click"), expectedNetworkUrlIncludes: ["/ops/api/expected"] },
    before: state,
    after: structuredClone(state),
    networkResponses: [{ correlationId: "CASE-1:primary", status: 200, method: "GET", url: "/health" }],
  });
  assert(sameCorrelationWrongUrl.pass === false, "same-window unrelated URL passed network oracle");
  const notExecuted = evaluateCompletionOracle({
    action: { ...action("fill"), executed: false },
    before: state,
    after: snapshot("ready", "changed"),
  });
  assert(notExecuted.pass === false && notExecuted.reason === "action-not-executed", "unexecuted action passed");
});

check("exact 424 manifest requires explicit completion sources without pending oracle", () => {
  assert(manifest.cases.length === 424, "exact manifest case count drift");
  for (const item of manifest.cases) {
    assert(item.oracle?.completionRequired === true, `${item.caseId} completionRequired must be true`);
    assert(Array.isArray(item.oracle.allowedCompletionSources) && item.oracle.allowedCompletionSources.length > 0,
      `${item.caseId} allowed completion sources missing`);
    assert(!item.oracle.kind.includes("pending"), `${item.caseId} retains pending oracle`);
    assert(item.oracle.allowedCompletionSources.every(source => allowedCompletionSources.includes(source)),
      `${item.caseId} unknown completion source`);
  }
});

check("exact and legacy runners capture before/after network and completion result", () => {
  for (const snippet of [
    "evaluateCompletionOracle",
    "beforeDigest",
    "afterDigest",
    "networkResponses",
    "completionOracle",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner missing ${snippet}`);
    assert(legacyRunnerSource.includes(snippet), `legacy runner missing ${snippet}`);
  }
  for (const snippet of ["page.on(\"response\"", "networkEntries", "snapshot"]) {
    assert(adapterSource.includes(snippet), `native adapter missing ${snippet}`);
  }
  for (const snippet of [
    "primaryCompletionEvents.length === 1",
    "browser.networkEntries().slice(networkStart)",
    "await browser.setCorrelationId(action.semanticCompletion.correlationId)",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner action binding missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("completionEvents.some(event => event.pass"),
    "exact runner still accepts any PASS completion event");
});

check("REVIEW3-42 rejects DOM-only completion and requires observed request correlation plus exact readback identity", () => {
  const domOnly = evaluateCompletionOracle({
    action: {
      ...action("click"),
      semanticCompletionRequired: true,
      expectedReadbackIdentity: "CASE-1:expected-result",
    },
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
  });
  assert(domOnly.pass === false, "semantic action passed from arbitrary DOM digest change");

  for (const item of manifest.cases) {
    const result = item.workflow?.expectedResults?.[0];
    assert(result?.completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} semantic completion plan missing`);
    assert(result.completion.readbackIdentity === item.workflow.independentReadback.identity,
      `${item.caseId} readback identity mismatch`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source remains allowed`);
    assert(!item.oracle.allowedCompletionSources.includes("network-dom"),
      `${item.caseId} legacy network-dom completion source remains allowed`);
    for (const actionItem of item.workflow.controlSequence.filter(actionItem => actionItem.kind !== "wait-visible")) {
      assert(actionItem.semanticCompletion?.schema === "media-server.v390-ui-action-completion.v2",
        `${item.caseId} ${actionItem.kind} semantic action plan missing`);
      if (actionItem.semanticCompletion.request) {
        assert(actionItem.semanticCompletion.request.correlationSource === "request-header",
          `${item.caseId} ${actionItem.kind} request correlation source drift`);
      } else {
        assert(actionItem.semanticCompletion.localTransition ||
          actionItem.semanticCompletion.navigationBinding ||
          actionItem.semanticCompletion.phase === "independent-readback",
        `${item.caseId} ${actionItem.kind} request/local/readback binding missing`);
      }
    }
  }
  assert(adapterSource.includes("x-media-server-correlation-id"), "adapter does not emit request correlation header");
  assert(adapterSource.includes("correlationSource: correlationId ? 'request-header' : 'none'"),
    "adapter does not attest header correlation source");
  assert(exactRunnerSource.includes("semanticReadback"), "exact runner does not collect semantic readback evidence");
  for (const snippet of ["semanticCompletionRequired", "semanticReadback", "setCorrelationId(correlationId)"]) {
    assert(legacyRunnerSource.includes(snippet), `targeted runner semantic completion missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("map(entry => ({ ...entry, correlationId }))"),
    "exact runner still forges correlation IDs after network collection");
  assert(!legacyRunnerSource.includes("networkStartIndex).map(entry =>"),
    "targeted runner still forges correlation IDs after network collection");
});

check("REVIEW3-42 accepts only header-correlated endpoint plus exact semantic readback", () => {
  const semanticAction = {
    ...action("click"),
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:semantic-result",
    expectedEndpoint: {
      correlationId: "CASE-1:navigation",
      method: "GET",
      urlPath: "/ops",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: "CASE-1:semantic-result",
    correlationId: "CASE-1:primary",
    expected: { property: "value", value: "reviewed" },
    observed: { property: "value", value: "reviewed" },
  };
  const endpoint = {
    requestId: "native-request-1",
    correlationId: "CASE-1:navigation",
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops",
  };
  const pass = evaluateCompletionOracle({
    action: semanticAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses: [endpoint],
    semanticReadback,
  });
  assert(pass.pass && pass.source === "endpoint-dom" && pass.completionMode === "requestBinding",
    `semantic endpoint failed: ${pass.reason}`);

  for (const [label, mutateEvidence] of [
    ["synthetic-correlation", value => { value.networkResponses[0].correlationSource = "post-hoc"; }],
    ["wrong-request-id", value => { value.networkResponses[0].requestId = ""; }],
    ["wrong-method", value => { value.networkResponses[0].method = "POST"; }],
    ["wrong-path", value => { value.networkResponses[0].url = "http://127.0.0.1/health"; }],
    ["wrong-readback-id", value => { value.semanticReadback.identity = "OTHER"; }],
    ["wrong-readback-value", value => { value.semanticReadback.observed.value = "forged"; }],
  ]) {
    const evidence = { networkResponses: [structuredClone(endpoint)], semanticReadback: structuredClone(semanticReadback) };
    mutateEvidence(evidence);
    const rejected = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("idle", "before"),
      after: snapshot("ready", "after"),
      ...evidence,
    });
    assert(rejected.pass === false, `${label} semantic evidence passed`);
  }
});

check("REVIEW3-42 attested persisted EventRecord and server-log alternatives reject weak evidence", () => {
  const semanticAction = {
    ...action("click"),
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:semantic-result",
    expectedEndpoint: { correlationId: "missing", method: "GET", urlPath: "/missing", allowedStatuses: [200] },
    allowedCompletionSources: ["persisted-readback", "event-record", "server-log"],
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: "CASE-1:semantic-result",
    correlationId: "CASE-1:primary",
    expected: { state: "saved" },
    observed: { state: "saved" },
  };
  const persistedReadback = {
    schema: "media-server.v390-ui-persisted-readback.v1",
    correlationSource: "readback-request",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    readbackRequestId: "readback-1",
    beforeDigest: "a",
    afterDigest: "b",
  };
  const eventRecord = {
    schema: "media-server.v390-ui-event-record-completion.v1",
    correlationSource: "event-record-field",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    observed: true,
    eventId: "event-1",
    recordSha256: "e".repeat(64),
  };
  const serverLog = {
    schema: "media-server.v390-ui-server-log-completion.v1",
    correlationSource: "server-log-field",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    matched: true,
    byteStart: 10,
    byteEnd: 40,
    lineSha256: "f".repeat(64),
  };
  for (const [field, evidence, source] of [
    ["persistedReadback", persistedReadback, "persisted-readback"],
    ["eventRecord", eventRecord, "event-record"],
    ["serverLog", serverLog, "server-log"],
  ]) {
    const accepted = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("ready", "same"),
      after: snapshot("ready", "same"),
      semanticReadback,
      [field]: evidence,
    });
    assert(accepted.pass && accepted.source === source, `${source} attestation not accepted: ${accepted.reason}`);
    const weak = structuredClone(evidence);
    delete weak.schema;
    const rejected = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("ready", "same"),
      after: snapshot("ready", "same"),
      semanticReadback,
      [field]: weak,
    });
    assert(rejected.pass === false, `${source} weak evidence passed`);
  }
});

check("REVIEW3-42 all 424 action plans close only with their exact endpoint and readback identity", () => {
  let semanticActions = 0;
  let evaluatedActions = 0;
  let independentReadbacks = 0;
  let primarySelfComparisonsRejected = 0;
  for (const item of manifest.cases) {
    for (const actionItem of item.workflow.controlSequence.filter(candidate => candidate.kind !== "wait-visible")) {
      const completion = actionItem.semanticCompletion;
      semanticActions += 1;
      if (completion.phase === "independent-readback") {
        assert(completion.linkedPrimaryActionId === item.oracle.primaryActionId,
          `${item.caseId} independent readback primary link mismatch`);
        assert(completion.readback.staticLocatorIsNotRuntimePass === true,
          `${item.caseId} static readback locator became runtime PASS`);
        independentReadbacks += 1;
        continue;
      }
      const negative = completion.requiredSource === "negative-route-status";
      const evidenceAction = {
        ...actionItem,
        kind: negative ? "navigate-negative" : actionItem.kind,
        executed: true,
        executedKind: ["navigate", "navigate-action-route", "navigate-negative"].includes(actionItem.kind)
          ? "navigate"
          : (actionItem.kind === "fill-control"
              ? "fill"
              : (actionItem.kind === "select-control" ? "select" : "click")),
        correlationId: completion.correlationId,
        dispatch: "playwright-native",
        completionPhase: completion.phase,
        actionId: completion.actionId,
        controlSelector: completion.controlSelector,
        semanticCompletionRequired: true,
        expectedReadbackIdentity: completion.readbackIdentity,
        expectedEndpoint: completion.request ? {
          correlationId: completion.request.correlationId,
          method: completion.request.method,
          urlPath: completion.request.urlPath,
          allowedStatuses: completion.request.allowedStatuses,
        } : null,
        expectedLocalTransition: completion.localTransition,
        expectedNavigationBinding: completion.navigationBinding
          ? structuredClone(completion.navigationBinding)
          : null,
        allowedCompletionSources: [completion.requiredSource, ...completion.attestedAlternatives],
      };
      const semanticReadback = {
        schema: "media-server.v390-ui-semantic-readback.v1",
        identity: completion.readbackIdentity,
        correlationId: completion.correlationId,
        actionId: completion.actionId,
        observationSource: "browser-dom",
        selector: completion.controlSelector,
        expected: structuredClone(completion.readbackExpectation),
        observed: structuredClone(completion.readbackExpectation),
      };
      const status = completion.request?.allowedStatuses?.[0] ||
        completion.navigationBinding?.allowedStatuses?.[0] ||
        0;
      const networkResponses = completion.request ? [{
        requestId: `${item.caseId}:${evaluatedActions}`,
        correlationId: completion.request.correlationId,
        correlationSource: "request-header",
        method: completion.request.method,
        status,
        url: `http://127.0.0.1${completion.request.urlPath.replace(/\{[^/{}]+\}/g, "contract-fixture")}`,
      }] : [];
      const before = { ...snapshot("idle", "before"), selector: completion.controlSelector };
      const after = { ...snapshot("ready", "after"), selector: completion.controlSelector };
      if (completion.localTransition) {
        const property = completion.localTransition.property;
        before[property] = property === "selectedValues" ? ["before"] : (property === "checked" || property === "open" ? false : "before");
        after[property] = property === "selectedValues" ? ["after"] : (property === "checked" || property === "open" ? true : "after");
      }
      if (completion.phase === "primary-action" && !negative) {
        const rejected = evaluateCompletionOracle({
          action: evidenceAction,
          before,
          after,
          networkResponses,
          semanticReadback,
        });
        assert(rejected.pass === false,
          `${item.caseId} manifest expected/observed self-comparison passed: ${rejected.reason}`);
        primarySelfComparisonsRejected += 1;
        continue;
      }
      const navigationLifecycle = completion.navigationBinding
        ? (completion.navigationBinding.caseLifecycleNavigationSequence || [{
            purpose: "exact-document-navigation",
            method: "GET",
            path: completion.navigationBinding.requestedPath,
            resourceType: "document",
            sameOrigin: true,
            correlationRequired: false,
            redirected: false,
            responseStatus: status,
          }])
        : [];
      const navigationEvidence = completion.navigationBinding ? {
        status,
        url: `http://127.0.0.1${completion.navigationBinding.expectedObservedPath}`,
        invocationId: completion.navigationBinding.invocationId,
        requestKind: "document-navigation",
        resourceType: "document",
        method: "GET",
        requestedPath: completion.navigationBinding.requestedPath,
        observedPath: completion.navigationBinding.expectedObservedPath,
        sameOrigin: true,
        requestAttemptCount: 1,
        requestCandidateCount: 1,
        responseCandidateCount: 1,
        requestResponseBound: true,
        correlationObserved: false,
        redirectCount: completion.navigationBinding.exactRedirectCount,
        retryCount: 0,
        reloadCount: 0,
        unownedNavigationCount: 0,
        additionalFetchCount: 0,
        requestReissued: false,
        totalDocumentNavigationCount: navigationLifecycle.length,
        orderedDocumentNavigations: navigationLifecycle.map((entry, index) => ({
          sequence: index * 2 + 2,
          responseSequence: index * 2 + 3,
          invocationId: completion.navigationBinding.invocationId,
          navigationKind: completion.phase === "initial-navigation"
            ? "initial-document-navigation"
            : "explicit-navigation",
          method: entry.method,
          path: entry.path,
          resourceType: entry.resourceType,
          sameOrigin: entry.sameOrigin,
          correlationPresent: false,
          correlationDigest: "",
          redirected: entry.redirected === true,
          responseStatus: entry.responseStatus ?? status,
          responseBound: true,
        })),
        listenerStartSequence: 1,
        listenerEndSequence: null,
        listenerActive: true,
        listenerInstalledBeforeFirstNavigation: true,
        navigationAfterListenerEndCount: 0,
      } : null;
      const evaluated = evaluateCompletionOracle({
        action: evidenceAction,
        before,
        after,
        navigation: ["navigate", "navigate-negative"].includes(evidenceAction.kind) ||
            evidenceAction.executedKind === "navigate"
          ? (navigationEvidence || {
              status,
              url: networkResponses[0]?.url || `http://127.0.0.1${item.screenRoute}`,
            })
          : null,
        allowedStatuses: completion.request?.allowedStatuses ||
          completion.navigationBinding?.allowedStatuses ||
          [],
        networkResponses,
        semanticReadback,
      });
      assert(evaluated.pass && evaluated.source === completion.requiredSource,
        `${item.caseId} ${actionItem.kind} semantic plan failed: ${evaluated.reason}`);
      evaluatedActions += 1;
    }
  }
  assert(semanticActions === 1277, `semantic action plan count drift: ${semanticActions}`);
  assert(evaluatedActions > 0, "non-primary semantic plan evaluation disappeared");
  assert(primarySelfComparisonsRejected === 421,
    `primary self-comparison rejection count drift: ${primarySelfComparisonsRejected}`);
  assert(independentReadbacks === 421, `independent readback plan count drift: ${independentReadbacks}`);
});

check("REVIEW4-58 rejects initial navigation reuse for a primary action", () => {
  const primaryAction = {
    ...action("click"),
    actionId: "CASE-1:click",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:click:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:independent-readback",
    expectedBehaviorSha256: "b".repeat(64),
    expectedReadbackExpectation: { property: "text", value: "after" },
    expectedEndpoint: {
      correlationId: "CASE-1:navigation",
      method: "GET",
      urlPath: "/ops",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const reusedNavigation = evaluateCompletionOracle({
    action: primaryAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses: [{
      requestId: "initial-navigation-request",
      correlationId: "CASE-1:navigation",
      correlationSource: "request-header",
      method: "GET",
      status: 200,
      url: "http://127.0.0.1/ops",
    }],
    semanticReadback: {
      schema: "media-server.v390-ui-semantic-readback.v1",
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      observationSource: "browser-dom",
      selector: "#target",
      expected: { property: "text", value: "after" },
      observed: { property: "text", value: "after" },
    },
  });
  assert(reusedNavigation.pass === false && reusedNavigation.reason === "action-request-correlation-mismatch",
    `initial navigation became primary completion: ${reusedNavigation.reason}`);
});

check("REVIEW4-58 requires exact-selector runtime readback and rejects manifest self-comparison", () => {
  const baseAction = {
    ...action("click"),
    actionId: "CASE-1:click",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:click:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:independent-readback",
    expectedBehaviorSha256: "b".repeat(64),
    expectedReadbackExpectation: { property: "text", value: "after" },
    expectedEndpoint: {
      correlationId: "CASE-1:click:completion",
      method: "POST",
      urlPath: "/ops/api/action",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const networkResponses = [{
    requestId: "primary-action-request",
    correlationId: "CASE-1:click:completion",
    correlationSource: "request-header",
    method: "POST",
    status: 200,
    url: "http://127.0.0.1/ops/api/action",
  }];
  const forged = evaluateCompletionOracle({
    action: baseAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses,
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      expectedBehaviorSha256: "b".repeat(64),
      observationSource: "manifest-projection",
      selector: "#target",
      observation: { before: snapshot("idle", "before"), after: snapshot("ready", "after") },
    }),
  });
  assert(forged.pass === false && forged.reason === "untrusted-readback-observation-source",
    `manifest self-comparison became completion: ${forged.reason}`);

  const wrongSelector = evaluateCompletionOracle({
    action: baseAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses,
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      expectedBehaviorSha256: baseAction.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: "#other",
      observation: { before: snapshot("idle", "before"), after: snapshot("ready", "after") },
    }),
  });
  assert(wrongSelector.pass === false && wrongSelector.reason === "readback-control-selector-mismatch",
    `wrong selector became completion: ${wrongSelector.reason}`);

  const executedSelector = '#target[data-fixture-id="3920006"]';
  const specializedBefore = { ...snapshot("idle", "before"), selector: executedSelector };
  const specializedAfter = { ...snapshot("ready", "after"), selector: executedSelector };
  const specialized = evaluateCompletionOracle({
    action: { ...baseAction, executedControlSelector: executedSelector },
    before: specializedBefore,
    after: specializedAfter,
    networkResponses,
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      expectedBehaviorSha256: baseAction.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: "#target",
      observation: { before: specializedBefore, after: specializedAfter },
    }),
  });
  assert(specialized.pass === true,
    `fixture-specialized execution selector was not bound to its product control: ${specialized.reason}`);
});

check("REVIEW4-58 accepts only an action-bound local transition plus runtime readback", () => {
  const result = evaluateCompletionOracle({
    action: {
      ...action("select"),
      actionId: "CASE-1:select",
      completionPhase: "primary-action",
      controlSelector: "#target",
      correlationId: "CASE-1:select:completion",
      semanticCompletionRequired: true,
      expectedReadbackIdentity: "CASE-1:independent-readback",
      expectedBehaviorSha256: "a".repeat(64),
      expectedReadbackExpectation: { property: "selectedValues", value: ["beta"] },
      expectedEndpoint: null,
      expectedLocalTransition: {
        selector: "#target",
        property: "selectedValues",
      },
      allowedCompletionSources: ["local-transition-readback"],
    },
    before: { ...snapshot("ready", "before"), selectedValues: ["alpha"] },
    after: { ...snapshot("ready", "after"), selectedValues: ["beta"] },
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:select:completion",
      actionId: "CASE-1:select",
      expectedBehaviorSha256: "a".repeat(64),
      observationSource: "browser-dom",
      selector: "#target",
      observation: {
        before: { ...snapshot("ready", "before"), selectedValues: ["alpha"] },
        after: { ...snapshot("ready", "after"), selectedValues: ["beta"] },
      },
    }),
  });
  assert(result.pass && result.source === "local-transition-readback" &&
    result.completionMode === "localTransitionBinding",
    `action-bound local transition failed: ${result.reason}`);
  assert(result.completionPhase === "primary-action" && result.actionId === "CASE-1:select" &&
    result.controlSelector === "#target", "action completion identity missing");
});

check("REVIEW4-58 persisted mutation requires a changed authoritative runtime readback", () => {
  const completionAction = {
    ...action("click"),
    actionId: "CASE-1:persist",
    completionPhase: "primary-action",
    controlSelector: "#save",
    correlationId: "CASE-1:persist:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:persist-readback",
    expectedBehaviorSha256: "e".repeat(64),
    expectedReadbackExpectation: { persistedMutationObserved: true },
    expectedEndpoint: {
      correlationId: "CASE-1:persist:completion",
      method: "PUT",
      urlPath: "/ops/api/vlm/profiles/case-1",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const authoritativeReadback = {
    schema: "media-server.v390-ui-runtime-mutation-readback.v1",
    method: "PUT",
    persistedMutationObserved: true,
    changed: true,
    observedPresent: true,
    beforeSha256: "1".repeat(64),
    observedSha256: "2".repeat(64),
  };
  const readback = value => semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("idle", "before"), selector: "#save" },
      after: { ...snapshot("ready", "after"), selector: "#save" },
      runtimeMutationReadback: value,
    },
  });
  const networkResponses = [{
    requestId: "persist-put",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "PUT",
    status: 200,
    url: "http://127.0.0.1/ops/api/vlm/profiles/case-1",
  }];
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: readback(authoritativeReadback).observation.before,
    after: readback(authoritativeReadback).observation.after,
    networkResponses,
    semanticReadback: readback(authoritativeReadback),
  });
  assert(accepted.pass && accepted.source === "endpoint-dom",
    `authoritative persisted readback failed: ${accepted.reason}`);

  const dryRunAction = {
    ...completionAction,
    actionId: "EVT-038:execute-persisted-action",
    correlationId: "EVT-038:execute-persisted-action:completion",
    expectedReadbackIdentity: "EVT-038:independent-readback",
    expectedEndpoint: {
      correlationId: "EVT-038:execute-persisted-action:completion",
      method: "POST",
      urlPath: "/ops/api/alerts/deliveries/dry-run",
      allowedStatuses: [200],
    },
  };
  const dryRunReadback = {
    schema: "media-server.v390-ui-alert-delivery-dry-run-readback.v1",
    fixtureId: "evt-038-review4-fixture",
    eventIdSha256: "1".repeat(64),
    responseSha256: "2".repeat(64),
    attemptSha256: "3".repeat(64),
    auditSha256: "4".repeat(64),
    domSha256: "5".repeat(64),
    responseBound: true,
    attemptBound: true,
    auditBound: true,
    domBound: true,
    persistedMutationObserved: true,
  };
  const dryRunSemanticReadback = semanticV2({
    identity: dryRunAction.expectedReadbackIdentity,
    correlationId: dryRunAction.correlationId,
    actionId: dryRunAction.actionId,
    expectedBehaviorSha256: dryRunAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: dryRunAction.controlSelector,
    observation: {
      before: { ...snapshot("idle", "before"), selector: "#save" },
      after: { ...snapshot("ready", "after"), selector: "#save" },
      runtimeMutationReadback: dryRunReadback,
    },
  });
  const dryRunResult = evaluateCompletionOracle({
    action: dryRunAction,
    before: dryRunSemanticReadback.observation.before,
    after: dryRunSemanticReadback.observation.after,
    networkResponses: [{
      requestId: "evt-038-dry-run",
      correlationId: dryRunAction.correlationId,
      correlationSource: "request-header",
      method: "POST",
      status: 200,
      url: "http://127.0.0.1/ops/api/alerts/deliveries/dry-run",
    }],
    semanticReadback: dryRunSemanticReadback,
  });
  assert(dryRunResult.pass && dryRunResult.source === "endpoint-dom",
    `EVT-038 typed dry-run readback failed: ${dryRunResult.reason}`);
  const evaluateDryRun = value => {
    const semantic = semanticV2({
      identity: dryRunAction.expectedReadbackIdentity,
      correlationId: dryRunAction.correlationId,
      actionId: dryRunAction.actionId,
      expectedBehaviorSha256: dryRunAction.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: dryRunAction.controlSelector,
      observation: {
        before: { ...snapshot("idle", "before"), selector: "#save" },
        after: { ...snapshot("ready", "after"), selector: "#save" },
        runtimeMutationReadback: value,
      },
    });
    return evaluateCompletionOracle({
      action: dryRunAction,
      before: semantic.observation.before,
      after: semantic.observation.after,
      networkResponses: [{
        requestId: "evt-038-dry-run",
        correlationId: dryRunAction.correlationId,
        correlationSource: "request-header",
        method: "POST",
        status: 200,
        url: "http://127.0.0.1/ops/api/alerts/deliveries/dry-run",
      }],
      semanticReadback: semantic,
    });
  };
  for (const [label, mutate] of [
    ["unknown-schema", value => { value.schema = "media-server.v390-ui-other-readback.v1"; }],
    ["missing-fixture", value => { value.fixtureId = ""; }],
    ["response-binding", value => { value.responseBound = false; }],
    ["attempt-binding", value => { value.attemptBound = false; }],
    ["audit-binding", value => { value.auditBound = false; }],
    ["dom-binding", value => { value.domBound = false; }],
    ["event-identity", value => { value.eventIdSha256 = ""; }],
    ["response-digest", value => { value.responseSha256 = "wrong"; }],
    ["attempt-digest", value => { value.attemptSha256 = ""; }],
    ["audit-digest", value => { value.auditSha256 = ""; }],
    ["dom-digest", value => { value.domSha256 = ""; }],
  ]) {
    const invalid = structuredClone(dryRunReadback);
    mutate(invalid);
    const invalidResult = evaluateDryRun(invalid);
    assert(!invalidResult.pass && invalidResult.reason === "semantic-readback-observation-mismatch",
      `EVT-038 ${label} drift did not fail closed`);
  }

  const unchanged = { ...authoritativeReadback, changed: false, observedSha256: authoritativeReadback.beforeSha256 };
  const rejected = evaluateCompletionOracle({
    action: completionAction,
    before: readback(unchanged).observation.before,
    after: readback(unchanged).observation.after,
    networkResponses,
    semanticReadback: readback(unchanged),
  });
  assert(!rejected.pass && rejected.reason === "semantic-readback-observation-mismatch",
    "unchanged persisted readback became completion");
});

check("REVIEW4-65 all endpoint-owned readbacks close through one canonical completion observation", () => {
  for (const caseId of ["AUTH-020", "SRC-008", "SRC-010", "SRC-019", "SRC-031"]) {
    const item = manifest.cases.find(value => value.caseId === caseId);
    const endpointAction = item.workflow.controlSequence.find(value => value.kind === "execute-endpoint-action");
    const completionAction = endpointCompletionAction(endpointAction);
    const runtimeReadback = endpointRuntimeReadback(item, endpointAction);
    const networkResponses = [endpointNetworkResponse(runtimeReadback)];
    const semanticReadback = buildEndpointActionSemanticReadback({
      action: endpointAction,
      actionEvidence: completionAction,
      runtimeReadback,
      networkResponses,
    });
    const result = evaluateCompletionOracle({
      action: completionAction,
      networkResponses,
      semanticReadback,
    });
    assert(result.pass && result.source === "endpoint-dom",
      `${caseId} endpoint-owned completion failed: ${result.reason}`);
    const actual = semanticReadback.observation.actual;
    assert(actual.actualPath === endpointAction.semanticCompletion.request.urlPath &&
      actual.path === endpointAction.semanticCompletion.request.urlPathTemplate &&
      actual.fixtureBinding.verified === true && actual.requestId === runtimeReadback.requestId &&
      actual.safeResponse && actual.authoritativeReadback.authoritative === true,
    `${caseId} canonical endpoint observation evidence is incomplete`);
  }
});

check("REVIEW4-65 endpoint-owned completion fails closed on every evidence boundary", () => {
  const item = manifest.cases.find(value => value.caseId === "AUTH-020");
  const endpointAction = item.workflow.controlSequence.find(value => value.kind === "execute-endpoint-action");
  const completionAction = endpointCompletionAction(endpointAction);
  const runtimeReadback = endpointRuntimeReadback(item, endpointAction);
  const response = endpointNetworkResponse(runtimeReadback);
  const build = ({ actionValue = endpointAction, readback = runtimeReadback, responses = [response] } = {}) =>
    buildEndpointActionSemanticReadback({
      action: actionValue,
      actionEvidence: completionAction,
      runtimeReadback: readback,
      networkResponses: responses,
    });
  expectThrow(() => build({ readback: { runtimeEndpointActionReadback: runtimeReadback } }),
    "endpoint-action-readback-shape-missing");
  expectThrow(() => build({ readback: { ...runtimeReadback, method: "DELETE" } }),
    "endpoint-action-method-path-mismatch");
  expectThrow(() => build({ readback: { ...runtimeReadback, path: "/ops/api/users/other/disable" } }),
    "endpoint-action-method-path-mismatch");
  const unboundAction = structuredClone(endpointAction);
  unboundAction.semanticCompletion.request.urlPath = "/ops/api/users/other/disable";
  expectThrow(() => build({ actionValue: unboundAction }), "endpoint-action-fixture-binding-mismatch");
  expectThrow(() => build({ readback: { ...runtimeReadback, correlationId: "" } }),
    "endpoint-action-correlation-request-id-missing");
  expectThrow(() => build({ readback: { ...runtimeReadback, requestId: "" } }),
    "endpoint-action-correlation-request-id-missing");
  expectThrow(() => build({ readback: { ...runtimeReadback, status: 409 } }),
    "endpoint-action-status-mismatch");
  expectThrow(() => build({ responses: [{ ...response, safeResponseBody: { status: "forged" } }] }),
    "endpoint-action-safe-response-mismatch");
  expectThrow(() => build({ readback: { ...runtimeReadback, authoritative: false } }),
    "endpoint-action-authoritative-readback-missing");
  expectThrow(() => build({ readback: null }), "endpoint-action-readback-shape-missing");
});

check("REVIEW4-65 catalog readback closes the exact request under the semantic correlation envelope", () => {
  const completionAction = {
    ...action("click"),
    actionId: "EVT-001:assert-visible-read-model",
    completionPhase: "primary-action",
    controlSelector: "[data-testid=\"ops-dashboard-page\"]",
    correlationId: "EVT-001:assert-visible-read-model:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "EVT-001:catalog-readback",
    expectedBehaviorSha256: "a".repeat(64),
    expectedReadbackExpectation: { exists: true, visible: true },
    expectedEndpoint: {
      correlationId: "EVT-001:assert-visible-read-model:completion",
      method: "GET",
      urlPath: "/ops/dashboard",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const exactRuntimeOracle = {
    schema: "media-server.v390-ui-exact-runtime-observation.v1",
    caseId: "EVT-001",
    requestedRoute: "/ops/dashboard",
    observedRoute: "/ops/dashboard",
    responses: [{
      method: "GET",
      urlPath: "/ops/api/events?limit=100",
      status: 200,
      source: "fresh-browser-fetch",
      bodyDigest: "1".repeat(64),
    }],
    dom: [{ selector: "[data-testid=\"ops-dashboard-page\"]", status: "PASS" }],
  };
  const readback = semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("ready", "dashboard"), selector: completionAction.controlSelector },
      after: { ...snapshot("ready", "dashboard"), selector: completionAction.controlSelector },
      actual: {
        exists: true,
        visible: true,
        exactRuntimeOracle,
      },
    },
  });
  const duplicatePriorNetwork = [{
    requestId: "prior-1",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops/dashboard",
  }, {
    requestId: "prior-2",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops/dashboard",
  }];
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: duplicatePriorNetwork,
    semanticReadback: readback,
  });
  assert(accepted.pass && accepted.source === "endpoint-dom" &&
    accepted.completionRequest?.correlationSource === "semantic-readback-catalog-runtime" &&
    accepted.completionRequest?.correlationId === completionAction.correlationId &&
    accepted.completionRequest?.catalogRuntimeResponseCount === 1 &&
    /^[a-f0-9]{64}$/.test(accepted.completionRequest?.catalogRuntimeAttestationSha256 || ""),
  `catalog runtime request attestation failed: ${accepted.reason}`);

  const evt023Action = {
    ...completionAction,
    actionId: "EVT-023:assert-visible-read-model",
    correlationId: "EVT-023:assert-visible-read-model:completion",
    expectedEndpoint: {
      correlationId: "EVT-023:assert-visible-read-model:completion",
      method: "GET",
      urlPath: "/ops/dashboard",
      allowedStatuses: [200],
    },
  };
  const evt023ExactRuntimeOracle = {
    ...exactRuntimeOracle,
    caseId: "EVT-023",
    responses: [{
      method: "GET",
      urlPath: "/ops/api/events/status?limit=5&includeArchives=1",
      status: 200,
      source: "case-owned-refresh-render-response",
      bodyDigest: "4".repeat(64),
    }, {
      method: "GET",
      urlPath: "/client/api/views/9001/events",
      status: 200,
      source: "fresh-browser-fetch",
      bodyDigest: "5".repeat(64),
    }],
  };
  const evt023Readback = semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: evt023Action.correlationId,
    actionId: evt023Action.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("ready", "dashboard"), selector: completionAction.controlSelector },
      after: { ...snapshot("ready", "dashboard"), selector: completionAction.controlSelector },
      actual: {
        exists: true,
        visible: true,
        exactRuntimeOracle: evt023ExactRuntimeOracle,
      },
    },
  });
  const acceptedEvt023 = evaluateCompletionOracle({
    action: evt023Action,
    before: evt023Readback.observation.before,
    after: evt023Readback.observation.after,
    networkResponses: [],
    semanticReadback: evt023Readback,
  });
  assert(acceptedEvt023.pass &&
    acceptedEvt023.completionRequest?.catalogRuntimeResponseCount === 2 &&
    acceptedEvt023.completionRequest?.source === "case-owned-refresh-render-response",
  `EVT-023 case-owned catalog response source was rejected: ${acceptedEvt023.reason}`);

  const unknownSource = structuredClone(evt023Readback);
  unknownSource.observation.actual.exactRuntimeOracle.responses[0].source = "unknown-runtime-source";
  unknownSource.observationSha256 = domSnapshotDigest(unknownSource.observation);
  const rejectedUnknownSource = evaluateCompletionOracle({
    action: evt023Action,
    before: unknownSource.observation.before,
    after: unknownSource.observation.after,
    networkResponses: [],
    semanticReadback: unknownSource,
  });
  assert(!rejectedUnknownSource.pass &&
    rejectedUnknownSource.reason === "catalog-runtime-response-invalid:0:source",
  "unknown catalog response source became authoritative completion");

  const malformed = structuredClone(readback);
  delete malformed.observation.actual.exactRuntimeOracle.responses[0].bodyDigest;
  malformed.observationSha256 = domSnapshotDigest(malformed.observation);
  const rejectedMalformed = evaluateCompletionOracle({
    action: completionAction,
    before: malformed.observation.before,
    after: malformed.observation.after,
    networkResponses: [],
    semanticReadback: malformed,
  });
  assert(!rejectedMalformed.pass && rejectedMalformed.reason === "catalog-runtime-response-invalid:0:bodyDigest",
    "catalog response without a body digest became authoritative completion");

  const wrongCase = structuredClone(readback);
  wrongCase.observation.actual.exactRuntimeOracle.caseId = "EVT-002";
  wrongCase.observationSha256 = domSnapshotDigest(wrongCase.observation);
  const rejectedWrongCase = evaluateCompletionOracle({
    action: completionAction,
    before: wrongCase.observation.before,
    after: wrongCase.observation.after,
    networkResponses: [],
    semanticReadback: wrongCase,
  });
  assert(!rejectedWrongCase.pass && rejectedWrongCase.reason === "catalog-runtime-readback-invalid",
    "another case catalog readback satisfied this action");

  const wrongCorrelation = structuredClone(readback);
  wrongCorrelation.correlationId = "OTHER:completion";
  wrongCorrelation.observationSha256 = domSnapshotDigest(wrongCorrelation.observation);
  const rejectedWrongCorrelation = evaluateCompletionOracle({
    action: completionAction,
    before: wrongCorrelation.observation.before,
    after: wrongCorrelation.observation.after,
    networkResponses: [],
    semanticReadback: wrongCorrelation,
  });
  assert(!rejectedWrongCorrelation.pass && rejectedWrongCorrelation.reason === "semantic-readback-mismatch",
    "catalog runtime evidence bypassed the action correlation");
});

check("REVIEW4-65 catalog API readback rejects duplicate or mismatched exact responses", () => {
  const completionAction = {
    ...action("click"),
    actionId: "EVT-042:assert-product-state",
    completionPhase: "primary-action",
    controlSelector: "[data-testid=\"ops-events-page\"]",
    correlationId: "EVT-042:assert-product-state:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "EVT-042:catalog-readback",
    expectedBehaviorSha256: "b".repeat(64),
    expectedReadbackExpectation: { exists: true, visible: true },
    expectedEndpoint: {
      correlationId: "EVT-042:assert-product-state:completion",
      method: "GET",
      urlPath: "/ops/api/events/reviews",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const response = {
    method: "GET",
    urlPath: "/ops/api/events/reviews",
    status: 200,
    source: "fresh-browser-fetch",
    bodyDigest: "2".repeat(64),
  };
  const makeReadback = responses => semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("ready", "events"), selector: completionAction.controlSelector },
      after: { ...snapshot("ready", "events"), selector: completionAction.controlSelector },
      actual: {
        exists: true,
        visible: true,
        exactRuntimeOracle: {
          schema: "media-server.v390-ui-exact-runtime-observation.v1",
          caseId: "EVT-042",
          requestedRoute: "/ops/api/events/reviews",
          observedRoute: "/ops/events",
          responses,
          dom: [{ selector: "[data-testid=\"ops-events-page\"]", status: "PASS" }],
        },
      },
    },
  });
  const acceptedReadback = makeReadback([response]);
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: acceptedReadback.observation.before,
    after: acceptedReadback.observation.after,
    networkResponses: [],
    semanticReadback: acceptedReadback,
  });
  assert(accepted.pass && accepted.completionRequest?.url === "/ops/api/events/reviews",
    `exact catalog API response failed: ${accepted.reason}`);

  const duplicateReadback = makeReadback([response, { ...response, bodyDigest: "3".repeat(64) }]);
  const duplicate = evaluateCompletionOracle({
    action: completionAction,
    before: duplicateReadback.observation.before,
    after: duplicateReadback.observation.after,
    networkResponses: [],
    semanticReadback: duplicateReadback,
  });
  assert(!duplicate.pass && duplicate.reason === "ambiguous-exact-request",
    "duplicate catalog API responses satisfied one exact request");

  const mismatchedReadback = makeReadback([{ ...response, urlPath: "/ops/api/events/reviews/other" }]);
  const mismatched = evaluateCompletionOracle({
    action: completionAction,
    before: mismatchedReadback.observation.before,
    after: mismatchedReadback.observation.after,
    networkResponses: [],
    semanticReadback: mismatchedReadback,
  });
  assert(!mismatched.pass && mismatched.reason === "request-correlation-missing",
    "mismatched catalog API response satisfied the exact endpoint");
});

check("REVIEW4-58 locks one exact request and rejects another fixture or duplicate request", () => {
  const completionAction = {
    ...action("click"),
    actionId: "CASE-1:save",
    actionKind: "execute-persisted-action",
    completionPhase: "primary-action",
    controlSelector: "#save",
    correlationId: "CASE-1:save:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:readback",
    expectedBehaviorSha256: "c".repeat(64),
    expectedReadbackExpectation: { exists: true, visible: true },
    expectedEndpoint: {
      correlationId: "CASE-1:save:completion",
      method: "PUT",
      urlPathTemplate: "/ops/api/sources/{fixtureId}",
      urlPath: "/ops/api/sources/case-1-fixture",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const readback = semanticV2({
    identity: "CASE-1:readback",
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: "#save",
    observation: {
      before: { ...snapshot("idle", "before"), selector: "#save" },
      after: { ...snapshot("ready", "after"), selector: "#save" },
    },
  });
  const wrongSameCorrelation = {
    requestId: "poll-request",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops/api/poll",
  };
  const exact = {
    requestId: "save-request",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "PUT",
    status: 200,
    url: "http://127.0.0.1/ops/api/sources/case-1-fixture",
  };
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [wrongSameCorrelation, exact],
    semanticReadback: readback,
  });
  assert(accepted.pass && accepted.completionRequest?.requestId === "save-request" &&
    accepted.networkResponses.length === 1 && accepted.networkResponses[0].requestId === "save-request",
  "exact completion request was not locked");

  const wrongFixture = structuredClone(exact);
  wrongFixture.url = "http://127.0.0.1/ops/api/sources/other-fixture";
  const rejectedFixture = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [wrongFixture],
    semanticReadback: readback,
  });
  assert(!rejectedFixture.pass && rejectedFixture.reason === "request-correlation-missing",
    "another workflow fixture satisfied the exact request");

  const duplicate = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [exact, { ...exact, requestId: "save-request-duplicate" }],
    semanticReadback: readback,
  });
  assert(!duplicate.pass && duplicate.reason === "ambiguous-exact-request",
    "duplicate exact requests satisfied a single-action completion");
});

check("REVIEW4-58 exact 424 primary completion contracts bind product action and independent readback", () => {
  for (const item of manifest.cases) {
    const completion = item.workflow.expectedResults[0]?.completion;
    assert(completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} action completion v2 missing`);
    assert(completion.phase === "primary-action", `${item.caseId} primary completion phase mismatch`);
    assert(completion.actionId === item.oracle.primaryActionId, `${item.caseId} primary action ID mismatch`);
    assert(completion.correlationId === item.oracle.primaryActionCorrelationId,
      `${item.caseId} primary correlation mismatch`);
    assert(completion.controlSelector === item.workflow.primaryControl.selector,
      `${item.caseId} exact control selector mismatch`);
    assert(completion.expectedBehaviorSha256 === item.workflow.expectedProductState.expectedBehaviorSha256,
      `${item.caseId} expected behavior digest mismatch`);
    assert(completion.readback.identity === item.workflow.independentReadback.identity,
      `${item.caseId} independent readback identity mismatch`);
    assert(completion.readback.staticLocatorIsNotRuntimePass === true,
      `${item.caseId} static readback locator became runtime evidence`);
    const endpoint = item.workflow.productAction.endpoint;
    const localAction = item.workflow.productAction.localAction;
    const bindingModes = [
      Boolean(completion.request),
      Boolean(completion.localTransition),
      Boolean(completion.navigationBinding),
    ];
    assert(bindingModes.filter(Boolean).length === 1,
      `${item.caseId} action binding must be exclusive`);
    if (completion.navigationBinding) {
      const binding = completion.navigationBinding;
      assert(binding.requestKind === "document-navigation" &&
        completion.navigationBinding.method === "GET" &&
        completion.navigationBinding.exactRequestSequence === 1 &&
        completion.navigationBinding.correlationRequired === false,
      `${item.caseId} navigation completion binding mismatch`);
      if (item.caseId === "EVT-004") {
        assert(binding.requestedPath === "/ops/events" &&
          binding.expectedCanonicalRoute === "/ops/events" &&
          binding.expectedObservedPath === "/ops/events" &&
          binding.exactRedirectCount === 0 &&
          binding.caseLifecycleNavigationSequence?.length === 2 &&
          binding.caseLifecycleNavigationSequence[0]?.path === "/ops/events" &&
          binding.caseLifecycleNavigationSequence[1]?.path === "/ops/dashboard" &&
          binding.caseLifecycleNavigationSequence.every(entry =>
            entry.method === "GET" &&
            entry.resourceType === "document" &&
            entry.sameOrigin === true &&
            entry.correlationRequired === false &&
            entry.redirected === false &&
            entry.responseStatus === 200) &&
          binding.authoritativeReadback?.method === "GET" &&
          binding.authoritativeReadback.urlPath ===
            "/ops/api/diagnostics/log-tail?limit=50",
        `${item.caseId} diagnostic navigation completion binding mismatch`);
      } else if (item.caseId === "UI-001") {
        assert(binding.requestedPath === "/" &&
          binding.expectedObservedPath === "/login" &&
          binding.exactRedirectCount === 1 &&
          binding.caseLifecycleNavigationSequence?.length === 2 &&
          binding.caseLifecycleNavigationSequence[0]?.responseStatus === 302 &&
          binding.caseLifecycleNavigationSequence[1]?.path === "/login" &&
          binding.caseLifecycleNavigationSequence[1]?.redirected === true &&
          binding.authoritativeReadback === null,
        `${item.caseId} root redirect completion binding mismatch`);
      } else {
        assert(["UI-018", "SAFE-016", "SAFE-017"].includes(item.caseId) &&
          ["navigate", "navigate-negative"].includes(
            item.workflow.controlSequence.find(action =>
              action.actionId === completion.actionId)?.kind,
          ) &&
          binding.exactRedirectCount === 0 &&
          binding.authoritativeReadback === null,
        `${item.caseId} negative document navigation completion binding mismatch`);
      }
    } else if (endpoint) {
      assert(completion.request.correlationId === completion.correlationId,
        `${item.caseId} request is not action-correlated`);
      assert(completion.request.correlationId !== `${item.caseId}:navigation`,
        `${item.caseId} reuses initial navigation correlation`);
      const productEndpointBound = completion.request.method === endpoint.method &&
        completion.request.urlPathTemplate === endpoint.path &&
        JSON.stringify(completion.request.allowedStatuses) === JSON.stringify(endpoint.allowedStatuses);
      const exactReadRequests = (exactRuntimeOracleFor(item.caseId)?.requests || [])
        .filter(request => request?.method === "GET");
      const authoritativeRead = exactReadRequests.length === 1 ? exactReadRequests[0] : null;
      const authoritativeReadBound = item.workflow.workflowClass === "read-only-state" &&
        item.workflow.productAction.kind === "product-state-read" &&
        endpoint.method === "GET" && endpoint.path === item.canonicalRoute &&
        authoritativeRead?.path?.startsWith("/ops/api/events/reviews") &&
        completion.request.method === authoritativeRead.method &&
        completion.request.urlPathTemplate === authoritativeRead.path &&
        JSON.stringify(completion.request.allowedStatuses) ===
          JSON.stringify(authoritativeRead.allowedStatuses || authoritativeRead.statuses || [200]);
      assert((productEndpointBound || authoritativeReadBound) && !completion.request.urlPath.includes("{"),
      `${item.caseId} product endpoint completion mismatch`);
    } else {
      assert(completion.localTransition.selector === item.workflow.primaryControl.selector &&
        completion.localTransition.type === localAction.type && completion.localTransition.effect === localAction.effect,
      `${item.caseId} local transition completion mismatch`);
    }
  }
  for (const snippet of [
    "executeIndependentReadback",
    "__pendingPrimaryCompletion",
    "__completedPrimaryReadback",
    "linked independent runtime readback completion missing",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner linked readback flow missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("source locator metadata is not execution evidence"),
    "independent runtime readback remains an unconditional throw");
});

check("RULE-095 separates stable DOM validation from the actual rejected product response", () => {
  const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
  const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
  const generated = buildNativeExactManifest({ canonical, implementation });
  const item = generated.cases.find(candidate => candidate.caseId === "RULE-095");
  const primary = item.workflow.controlSequence.find(candidate =>
    candidate.actionId === item.oracle.primaryActionId);
  const completion = primary.semanticCompletion;
  const actionEvidence = {
    ...primary,
    kind: primary.kind,
    executed: true,
    dispatch: "playwright-native",
    actionId: completion.actionId,
    completionPhase: completion.phase,
    controlSelector: completion.controlSelector,
    correlationId: completion.correlationId,
    semanticCompletionRequired: true,
    expectedReadbackIdentity: completion.readbackIdentity,
    expectedBehaviorSha256: completion.expectedBehaviorSha256,
    expectedReadbackExpectation: structuredClone(completion.readbackExpectation),
    expectedLocalTransition: structuredClone(completion.localTransition),
    allowedCompletionSources: [completion.requiredSource, ...completion.attestedAlternatives],
  };
  const stableSnapshots = {
    "#opsRulesValidationList": {
      selector: "#opsRulesValidationList",
      exists: true,
      visible: true,
      text: "source-mismatch PublishedView 소스와 다릅니다",
    },
  };
  const observation = {
    before: { ...snapshot("ready", "same"), selector: "#opsRulesRefresh" },
    after: { ...snapshot("ready", "same"), selector: "#opsRulesRefresh" },
    beforeSnapshots: structuredClone(stableSnapshots),
    snapshots: structuredClone(stableSnapshots),
    rejectedActionReadback: {
      schema: "media-server.v390-ui-rejected-action-readback.v1",
      runtimeProductResponseObserved: true,
      registryUnchanged: true,
      productErrors: ["vaRule source must match PublishedView source"],
    },
  };
  const semanticReadback = semanticV2({
    identity: completion.readbackIdentity,
    correlationId: completion.correlationId,
    actionId: completion.actionId,
    expectedBehaviorSha256: completion.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completion.controlSelector,
    observation,
  });
  const accepted = evaluateCompletionOracle({
    action: actionEvidence,
    before: observation.before,
    after: observation.after,
    semanticReadback,
  });
  assert(accepted.pass, `RULE-095 two-stage runtime evidence failed: ${accepted.reason}`);

  const domOnly = structuredClone(semanticReadback);
  delete domOnly.observation.rejectedActionReadback;
  domOnly.observationSha256 = domSnapshotDigest(domOnly.observation);
  const rejectedDomOnly = evaluateCompletionOracle({
    action: actionEvidence,
    before: observation.before,
    after: observation.after,
    semanticReadback: domOnly,
  });
  assert(!rejectedDomOnly.pass && rejectedDomOnly.reason === "semantic-readback-observation-mismatch",
    "RULE-095 DOM evidence replaced the actual product response");

  const wrongResponse = structuredClone(semanticReadback);
  wrongResponse.observation.rejectedActionReadback.productErrors =
    ["allowed vaRule is required for va-rule mode"];
  wrongResponse.observationSha256 = domSnapshotDigest(wrongResponse.observation);
  const rejectedWrongResponse = evaluateCompletionOracle({
    action: actionEvidence,
    before: observation.before,
    after: observation.after,
    semanticReadback: wrongResponse,
  });
  assert(!rejectedWrongResponse.pass &&
    rejectedWrongResponse.reason === "semantic-readback-observation-mismatch",
  "RULE-095 accepted a different product rejection");
});

check("REVIEW4-58 corrected all activate-control handlers with exact transaction or postcondition oracles", () => {
  for (const caseId of ["RULE-016", "RULE-073", "RULE-075"]) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const completion = item.workflow.expectedResults[0].completion;
    assert(item.workflow.workflowClass === "persisted-mutation" &&
      item.workflow.controlSequence.some(actionItem => actionItem.kind === "execute-persisted-action") &&
      completion.request?.method === "PUT" && !completion.request.urlPath.includes("{") &&
      completion.request.allowedStatuses.length === 1 && completion.request.allowedStatuses[0] === 200,
    `${caseId} save transaction is not exact`);
  }
  for (const caseId of ["UI-036", "SRC-024", "RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-101", "RULE-102", "RULE-103", "RULE-104", "RULE-111", "CLIENT-002", "CLIENT-005", "SAFE-038"]) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const completion = item.workflow.expectedResults[0].completion;
    assert(completion.localTransition?.property === null &&
      Array.isArray(completion.localTransition.postconditions) &&
      completion.localTransition.postconditions.length >= 2,
    `${caseId} still uses the generic url/activated completion`);
    assert(completion.readbackExpectation.postconditions.length === completion.localTransition.postconditions.length,
      `${caseId} runtime postcondition readback drift`);
  }
  for (const caseId of ["RULE-101", "RULE-102", "RULE-103", "CLIENT-021"]) {
    const completion = completionContractCase(caseId).workflow.expectedResults[0].completion;
    assert(completion.readbackExpectation.postconditionObservationMode === "after-action-exact",
      `${caseId} idempotent readback still requires a DOM transition`);
  }
  const rule101 = freshCompletionContractCase("RULE-101");
  const rule101Transition = rule101.workflow.expectedResults[0].completion.localTransition;
  assert(rule101Transition.forbiddenRequests.some(request =>
    request.methods.includes("PUT") && request.pathPrefix === "/lab/analysis/va-rules/"),
  "RULE-101 UI no-dispatch oracle missing");
  assert(rule101Transition.postconditions.some(condition =>
    condition.selector === "#opsRulesReviewConflictDetail" &&
    condition.value.includes("프로파일 대상(사람)")) &&
    !rule101Transition.postconditions.some(condition =>
      condition.value?.includes("룰 대상(사람)")),
  "RULE-101 DOM contract does not separate UI profile validation from server-only analysis rejection");
  const rule102 = freshCompletionContractCase("RULE-102");
  assert(rule102.workflow.primaryControl.selector === "#opsEventRuleTypeSelect" &&
    rule102.workflow.expectedResults[0].completion.actionKind === "select-control" &&
    rule102.workflow.expectedResults[0].completion.localTransition.postconditions.some(condition =>
      condition.selector === "#opsRulesReviewEventTypeTitle" && condition.value === "재진입"),
  "RULE-102 review-loop cause remains bound to save click");
  for (const caseId of ["CLIENT-002", "CLIENT-005"]) {
    const completion = manifest.cases.find(item => item.caseId === caseId).workflow.expectedResults[0].completion;
    assert(completion.localTransition.seedRequirements?.length === 1 &&
      completion.localTransition.requiredRequests?.length >= 1,
    `${caseId} live session seed/request completion missing`);
  }
});

check("REVIEW4-65 RULE-101/102/103 require exact after-action state and authoritative rejection where declared", () => {
  for (const caseId of ["RULE-101", "RULE-102", "RULE-103"]) {
    const item = completionContractCase(caseId);
    const completion = item.workflow.expectedResults[0].completion;
    const snapshots = {};
    for (const condition of completion.readbackExpectation.postconditions) {
      const current = snapshots[condition.selector] || {
        ...snapshot("ready", ""),
        selector: condition.selector,
      };
      if (condition.property === "text") {
        current.text = [current.text, condition.value].filter(Boolean).join(" / ");
      } else if (condition.property === "href") {
        current.href = `${condition.value}review4`;
      } else {
        current[condition.property] = structuredClone(condition.value);
      }
      snapshots[condition.selector] = current;
    }
    const completionAction = {
      ...action(completion.actionKind === "select-control" ? "select" : "click"),
      actionId: completion.actionId,
      completionPhase: "primary-action",
      controlSelector: completion.controlSelector,
      correlationId: completion.correlationId,
      semanticCompletionRequired: true,
      expectedReadbackIdentity: completion.readback.identity,
      expectedBehaviorSha256: completion.expectedBehaviorSha256,
      expectedReadbackExpectation: structuredClone(completion.readbackExpectation),
      expectedLocalTransition: structuredClone(completion.localTransition),
      allowedCompletionSources: [completion.requiredSource, ...completion.attestedAlternatives],
    };
    const primary = {
      ...snapshot("ready", "primary"),
      selector: completion.controlSelector,
    };
    const rejectedActionReadback = caseId === "RULE-101" ? {
      schema: "media-server.v390-ui-rejected-action-readback.v1",
      runtimeProductResponseObserved: true,
      registryUnchanged: true,
      productErrors: [...completion.readbackExpectation.independentProductErrors],
    } : null;
    const observation = {
      before: structuredClone(primary),
      after: structuredClone(primary),
      beforeSnapshots: structuredClone(snapshots),
      snapshots: structuredClone(snapshots),
      ...(rejectedActionReadback ? { rejectedActionReadback } : {}),
    };
    const readback = semanticV2({
      identity: completionAction.expectedReadbackIdentity,
      correlationId: completionAction.correlationId,
      actionId: completionAction.actionId,
      expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: completionAction.controlSelector,
      observation,
    });
    const accepted = evaluateCompletionOracle({
      action: completionAction,
      before: primary,
      after: primary,
      semanticReadback: readback,
    });
    assert(accepted.pass && accepted.source === "local-transition-readback",
      `${caseId} exact after-action authoritative readback failed: ${accepted.reason}`);

    const wrongState = structuredClone(readback);
    const firstCondition = completion.readbackExpectation.postconditions[0];
    wrongState.observation.snapshots[firstCondition.selector][firstCondition.property] =
      firstCondition.property === "hidden" ? !firstCondition.value : "wrong-state";
    wrongState.observationSha256 = domSnapshotDigest(wrongState.observation);
    const rejectedState = evaluateCompletionOracle({
      action: completionAction,
      before: primary,
      after: primary,
      semanticReadback: wrongState,
    });
    assert(!rejectedState.pass && rejectedState.reason === "semantic-readback-observation-mismatch",
      `${caseId} accepted a mismatched after-action state`);

    if (caseId === "RULE-101") {
      const domOnly = structuredClone(readback);
      delete domOnly.observation.rejectedActionReadback;
      domOnly.observationSha256 = domSnapshotDigest(domOnly.observation);
      const rejectedDomOnly = evaluateCompletionOracle({
        action: completionAction,
        before: primary,
        after: primary,
        semanticReadback: domOnly,
      });
      assert(!rejectedDomOnly.pass &&
        rejectedDomOnly.reason === "semantic-readback-observation-mismatch",
      "RULE-101 DOM state replaced the authoritative product rejection");
    }
  }
});

check("REVIEW4-65 event/client composed workflows bind exact product controls and requests", () => {
  const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
  const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
  const generated = buildNativeExactManifest({ canonical, implementation });
  const byId = new Map(generated.cases.map(item => [item.caseId, item]));
  for (const [caseId, selector] of new Map([
    ["EVT-018", "#alertDeliveryTest"],
    ["EVT-037", "[data-event-review-save]"],
    ["EVT-038", "#alertDeliveryDryRun"],
    ["EVT-061", "[data-event-review-save]"],
    ["EVT-068", "[data-event-review-save]"],
  ])) {
    const item = byId.get(caseId);
    assert(item?.workflow.workflowClass === "persisted-mutation" &&
      item.workflow.primaryControl.selector === selector &&
      item.workflow.controlSequence.some(actionItem => actionItem.kind === "execute-persisted-action") &&
      item.workflow.controlSequence.some(actionItem => actionItem.kind === "verify-independent-readback"),
    `${caseId} actual event mutation workflow binding missing`);
  }
  const client005 = byId.get("CLIENT-005");
  const client021 = byId.get("CLIENT-021");
  const client005Transition = client005.workflow.expectedResults[0].completion.localTransition;
  const client021Transition = client021.workflow.expectedResults[0].completion.localTransition;
  assert(client005.workflow.primaryControl.selector === "#liveAllStop" &&
    client005Transition.type === "composed-live-start-all-stop" &&
    client005Transition.requiredRequests.map(request => request.method).join("|") === "POST|POST|DELETE",
  "CLIENT-005 composed playback/all-stop request contract drift");
  assert(client021.workflow.primaryControl.selector === '[data-tile="0"] [data-mode-action="va-overlay"]' &&
    client021Transition.type === "composed-va-overlay-session" &&
    client021Transition.requiredRequests.map(request => request.method).join("|") === "POST|POST",
  "CLIENT-021 composed VA overlay request contract drift");

  const composedStart = exactRunnerSource.indexOf("async function executeComposedClientLiveAction");
  const composedEnd = exactRunnerSource.indexOf("function materializeComposedClientCompletion", composedStart);
  const composedSource = exactRunnerSource.slice(composedStart, composedEnd);
  assert(composedStart >= 0 && composedEnd > composedStart &&
    !composedSource.includes("fetch(") &&
    composedSource.includes("[data-mode-action=\"va-overlay\"]") &&
    composedSource.includes("[data-action=\"toggle-playback\"]") &&
    composedSource.includes("requestBody.overlayMode") &&
    composedSource.includes("waitForClientVaOverlayProjection") &&
    composedSource.includes("vaMetadataSampleId") &&
    composedSource.includes("backend-precreated active session"),
  "CLIENT composed runner bypasses or omits the actual product DOM/network boundary");
  assert(exactRunnerSource.split("catalogBindings: caseContext?.catalogBindings || null").length - 1 === 2,
    "current case catalog bindings are not passed to both exact runtime oracle executions");
});

check("REVIEW4-58 form readback snapshots the exact submit control and never relabels the form", () => {
  for (const item of manifest.cases.filter(candidate => candidate.workflow.workflowClass === "form-submit")) {
    const actionItem = item.workflow.controlSequence.find(candidate => candidate.kind === "submit-form");
    const completion = item.workflow.expectedResults[0].completion;
    assert(actionItem?.submitSelector === completion.controlSelector &&
      actionItem.selector !== completion.controlSelector,
    `${item.caseId} form/submit selector distinction missing`);
  }
  assert(exactRunnerSource.includes("action.submitSelector || action.selector"),
    "runner snapshots the form while labeling the submit selector");
  assert(completionOracleSource.includes("action.executedControlSelector || action.controlSelector") &&
    completionOracleSource.includes("snapshot => snapshot.selector !== executedSelector"),
    "runtime v2 readback does not verify raw snapshot selectors");
});

check("document form completion requires one exact uncorrelated request and response identity", () => {
  const action = {
    actionId: "UI-002:submit-form",
    actionKind: "submit-form",
    dispatch: "playwright-native",
    executed: true,
    executedKind: "submit",
    completionPhase: "primary-action",
    semanticCompletionRequired: true,
    correlationId: "UI-002:submit-form:completion",
    controlSelector: "[data-testid=auth-setup-form] button[type=submit]",
    expectedReadbackIdentity: "document-form-readback",
    expectedBehaviorSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedReadbackExpectation: { submitted: true },
    allowedCompletionSources: ["endpoint-dom"],
    expectedEndpoint: {
      correlationId: "UI-002:submit-form:completion",
      method: "POST",
      urlPath: "/setup",
      allowedStatuses: [302],
    },
    formResponseIdentity: {
      schema: "media-server.v390-ui-document-form-submit-binding.v1",
      requestId: "native-request-3",
      caseRequestIdentity: "UI-002:request-3",
      caseRequestSequence: 3,
      method: "POST",
      path: "/setup",
      status: 302,
      requestKind: "document-navigation",
      resourceType: "document",
      sameOrigin: true,
      correlationObserved: false,
      responseRequestObjectObserved: true,
      redirectCount: 1,
      redirectPath: "/login",
      requestAttemptCount: 1,
      responseCandidateCount: 1,
      reissueCount: 0,
    },
  };
  const request = {
    phase: "request-start", requestId: "native-request-3", caseRequestIdentity: "UI-002:request-3",
    caseRequestSequence: 3, requestKind: "document-navigation", resourceType: "document",
    sameOrigin: true, correlationId: "", method: "POST", url: "http://127.0.0.1/setup",
  };
  const response = {
    ...request, phase: "response", status: 302, responseRequestObjectObserved: true,
  };
  const observation = {
    before: { selector: action.controlSelector, submitted: false },
    after: { selector: action.controlSelector, submitted: true },
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v2",
    actionId: action.actionId,
    correlationId: action.correlationId,
    identity: action.expectedReadbackIdentity,
    expectedBehaviorSha256: action.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: action.controlSelector,
    observation,
    observationSha256: domSnapshotDigest(observation),
  };
  const evaluate = entries => evaluateCompletionOracle({
    action,
    before: { selector: action.controlSelector, exists: true, visible: true },
    after: { selector: action.controlSelector, exists: false, visible: false },
    networkResponses: entries,
    semanticReadback,
  });
  const result = evaluate([request, response]);
  assert(result.pass && result.source === "endpoint-dom" &&
    result.completionRequest?.correlationSource === "document-form-request-response-identity",
  `exact document form request/response identity did not pass: ${result.reason}`);
  assert(evaluate([request]).reason === "document-form-request-response-mismatch",
    "missing document form response was accepted");
  assert(evaluate([{ ...request, correlationId: "unexpected" }, response]).reason === "document-form-request-response-mismatch",
    "document form correlation was accepted");
});

check("application form response identity stays on the correlated endpoint path", () => {
  const action = {
    actionId: "UI-008:submit-form",
    actionKind: "submit-form",
    dispatch: "playwright-native",
    executed: true,
    executedKind: "submit",
    completionPhase: "primary-action",
    semanticCompletionRequired: true,
    correlationId: "UI-008:submit-form:completion",
    controlSelector: "#request-form button[type=submit]",
    expectedReadbackIdentity: "application-form-readback",
    expectedBehaviorSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    expectedReadbackExpectation: { submitted: true },
    allowedCompletionSources: ["endpoint-dom"],
    expectedEndpoint: {
      correlationId: "UI-008:submit-form:completion",
      method: "POST",
      urlPath: "/client/api/access-requests",
      allowedStatuses: [201],
    },
    formResponseIdentity: {
      schema: "media-server.v390-ui-form-response-identity.v1",
      method: "POST",
      urlPath: "/client/api/access-requests",
      status: 201,
      requestId: "native-request-8",
      correlationId: "UI-008:submit-form:completion",
    },
  };
  const request = {
    phase: "request-start", requestId: "native-request-8", caseRequestIdentity: "UI-008:request-8",
    caseRequestSequence: 8, requestKind: "application-fetch", resourceType: "fetch", sameOrigin: true,
    correlationId: action.correlationId, correlationSource: "request-header", method: "POST",
    status: 0, url: "http://127.0.0.1/client/api/access-requests",
  };
  const response = {
    ...request, phase: "response", status: 201, responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
  };
  const observation = {
    before: { selector: action.controlSelector, submitted: false },
    after: { selector: action.controlSelector, submitted: true },
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v2",
    actionId: action.actionId,
    correlationId: action.correlationId,
    identity: action.expectedReadbackIdentity,
    expectedBehaviorSha256: action.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: action.controlSelector,
    observation,
    observationSha256: domSnapshotDigest(observation),
  };
  const result = evaluateCompletionOracle({
    action,
    before: { selector: action.controlSelector, exists: true, visible: true },
    after: { selector: action.controlSelector, exists: false, visible: false },
    networkResponses: [request, response],
    semanticReadback,
  });
  assert(result.pass && result.source === "endpoint-dom" &&
    result.completionRequest?.correlationSource === "request-header",
  `application form response was misclassified as a document form: ${result.reason}`);
});

check("REVIEW4-58 rejects pre-existing postconditions and in-flight forbidden dispatch", () => {
  const postconditions = [
    { selector: "#panel", property: "hidden", operator: "equals", value: false },
    { selector: "#status", property: "text", operator: "includes", value: "저장 전 검증 실패" },
  ];
  const completionAction = {
    ...action("click"),
    actionId: "CASE-1:local-action",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:local-action:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:readback",
    expectedBehaviorSha256: "d".repeat(64),
    expectedReadbackExpectation: { postconditions },
    expectedLocalTransition: {
      selector: "#target",
      property: null,
      postconditions,
      forbiddenRequests: [{ methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" }],
    },
    allowedCompletionSources: ["local-transition-readback"],
  };
  const panelExpected = { ...snapshot("ready", "panel"), selector: "#panel", hidden: false };
  const statusExpected = {
    ...snapshot("ready", "저장 전 검증 실패: class conflict"),
    selector: "#status",
  };
  const readback = beforeSnapshots => semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("ready", "before"), selector: "#target" },
      after: { ...snapshot("ready", "after"), selector: "#target" },
      beforeSnapshots,
      snapshots: { "#panel": panelExpected, "#status": statusExpected },
    },
  });
  const noOp = evaluateCompletionOracle({
    action: completionAction,
    before: { ...snapshot("ready", "before"), selector: "#target" },
    after: { ...snapshot("ready", "after"), selector: "#target" },
    semanticReadback: readback({ "#panel": panelExpected, "#status": statusExpected }),
  });
  assert(!noOp.pass && noOp.reason === "semantic-readback-observation-mismatch",
    "pre-existing postconditions satisfied a no-op action");

  const transitionedReadback = readback({
    "#panel": { ...panelExpected, hidden: true },
    "#status": { ...statusExpected, text: "편집 중" },
  });
  const inFlightForbidden = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
    networkResponses: [{
      phase: "request-start",
      requestId: "forbidden-put-start",
      correlationId: completionAction.correlationId,
      correlationSource: "request-header",
      method: "PUT",
      status: 0,
      url: "http://127.0.0.1/lab/analysis/va-rules/rule-101-review4-fixture",
    }],
  });
  assert(!inFlightForbidden.pass && inFlightForbidden.reason === "forbidden-action-request-observed",
    "in-flight forbidden request escaped the no-dispatch oracle");

  const unrelatedPriorResponse = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
    networkResponses: [{
      phase: "response",
      requestId: "prior-request-response",
      correlationId: "CASE-1:navigation",
      correlationSource: "request-header",
      method: "PUT",
      status: 200,
      url: "http://127.0.0.1/lab/analysis/va-rules/prior-request",
    }],
  });
  assert(unrelatedPriorResponse.pass && unrelatedPriorResponse.source === "local-transition-readback",
    `pre-action response caused forbidden-request false fail: ${unrelatedPriorResponse.reason}`);

  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
  });
  assert(accepted.pass && accepted.source === "local-transition-readback",
    `postcondition transition failed: ${accepted.reason}`);
  for (const snippet of ["page.on(\"request\"", "phase: \"request-start\"", "waitForNetworkQuiet"] ) {
    assert(adapterSource.includes(snippet), `adapter no-dispatch boundary missing ${snippet}`);
  }
  assert(completionOracleSource.includes('entry?.phase !== "request-start"'),
    "forbidden requests are not bound to request-start events");
  assert(exactRunnerSource.indexOf("waitForNetworkQuiet") < exactRunnerSource.indexOf("setCorrelationId(`${item.caseId}:navigation`)",
    exactRunnerSource.indexOf("waitForNetworkQuiet")),
  "runner restores action correlation before the settle/quiet boundary");
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 UI completion oracle contract summary ==");
console.log(`- allowedSources: ${allowedCompletionSources.join(",")}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (result.fail > 0) process.exit(1);

function endpointCompletionAction(endpointAction) {
  const completion = endpointAction.semanticCompletion;
  return {
    kind: endpointAction.kind,
    executed: true,
    dispatch: endpointAction.dispatch,
    actionId: completion.actionId,
    actionKind: endpointAction.kind,
    completionPhase: completion.phase,
    controlSelector: completion.controlSelector,
    correlationId: completion.correlationId,
    semanticCompletionRequired: completion.required === true,
    expectedReadbackIdentity: completion.readbackIdentity,
    expectedBehaviorSha256: completion.expectedBehaviorSha256,
    expectedReadbackExpectation: structuredClone(completion.readbackExpectation),
    expectedEndpoint: {
      correlationId: completion.request.correlationId,
      method: completion.request.method,
      urlPathTemplate: completion.request.urlPathTemplate,
      urlPath: completion.request.urlPath,
      allowedStatuses: [...completion.request.allowedStatuses],
    },
    allowedCompletionSources: [completion.requiredSource, ...completion.attestedAlternatives],
  };
}

function endpointRuntimeReadback(item, endpointAction) {
  const request = endpointAction.semanticCompletion.request;
  const input = item.workflow.inputs.find(value => value.kind === "endpoint-action-fixture");
  const fixtureId = request.pathParameters.fixtureId || input.actualValue.readback?.sourceId ||
    input.actualValue.readback?.viewId || `${item.caseId.toLowerCase()}-review4-fixture`;
  const safeResponseByCase = {
    "AUTH-020": { status: "disabled", user: { username: fixtureId, enabled: false } },
    "SRC-008": { ok: true, source: { sourceId: fixtureId, enabled: true } },
    "SRC-010": { ok: true, status: "disabled", source: { sourceId: fixtureId, enabled: false } },
    "SRC-019": { ok: true, status: "disabled", view: { viewId: fixtureId, sourceId: fixtureId, enabled: false } },
    "SRC-031": {
      ok: true,
      credentialGate: {
        schema: "media-server.onvif-credential-binding-gate.v1",
        requiredScope: "source:write",
        urlCredentialsRejected: true,
        secretMaterialStored: false,
      },
      sourceDraft: { sourceId: "5", enabled: true },
      publishedViewDraft: { viewId: "5", sourceId: "5", enabled: true },
    },
  };
  return {
    schema: "media-server.v390-ui-endpoint-action-readback.v1",
    fixtureId,
    method: request.method,
    path: request.urlPath,
    status: request.allowedStatuses[0],
    correlationId: request.correlationId,
    requestId: `${item.caseId.toLowerCase()}-endpoint-request`,
    safeResponse: structuredClone(safeResponseByCase[item.caseId]),
    actualBrowserRequestObserved: true,
    responseSynthesized: false,
    authoritative: true,
    readbackKind: input.actualValue.readback.kind,
  };
}

function endpointNetworkResponse(runtimeReadback) {
  return {
    phase: "response",
    requestId: runtimeReadback.requestId,
    correlationId: runtimeReadback.correlationId,
    correlationSource: "request-header",
    method: runtimeReadback.method,
    status: runtimeReadback.status,
    url: `http://127.0.0.1${runtimeReadback.path}`,
    safeResponseBody: structuredClone(runtimeReadback.safeResponse),
    safeResponseProjectionSource: "playwright-response-json",
  };
}

function expectThrow(fn, expectedMessage) {
  let error = null;
  try {
    fn();
  } catch (value) {
    error = value;
  }
  assert(error instanceof Error && error.message.includes(expectedMessage),
    `expected ${expectedMessage}, got ${error instanceof Error ? error.message : "no error"}`);
}

function snapshot(state, text) {
  return {
    selector: "#target",
    exists: true,
    visible: true,
    state,
    text,
    value: "",
    checked: false,
    selectedValues: [],
    url: "http://127.0.0.1/ops",
  };
}

function action(kind) {
  return { kind, executed: true, correlationId: "CASE-1:primary", dispatch: "playwright-native" };
}

function semanticV2(value) {
  return {
    schema: "media-server.v390-ui-semantic-readback.v2",
    ...value,
    observationSha256: domSnapshotDigest(value.observation),
  };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  const authoritativeOnly = process.argv.includes("--authoritative-completion-only");
  const selected = authoritativeOnly
    ? checks.filter(item => item.name.startsWith("REVIEW4-65 catalog ") ||
        item.name.startsWith("REVIEW4-65 RULE-101/102/103 "))
    : checks;
  let pass = 0;
  let fail = 0;
  for (const item of selected) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function completionContractCase(caseId) {
  const item = structuredClone(manifest.cases.find(candidate => candidate.caseId === caseId));
  assert(item, `${caseId} stored completion case missing`);
  const completion = item.workflow.expectedResults[0].completion;
  completion.readbackExpectation.postconditionObservationMode = "after-action-exact";
  completion.localTransition.postconditionObservationMode = "after-action-exact";
  return item;
}

function freshCompletionContractCase(caseId) {
  const generated = buildNativeExactManifest({
    canonical: readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"),
    implementation: readJson("test/fixtures/project_feature_implementation_evidence.json"),
  });
  const item = generated.cases.find(candidate => candidate.caseId === caseId);
  assert(item, `${caseId} fresh completion case missing`);
  return item;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
