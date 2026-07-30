// 파일 용도: trusted UI action의 상관된 completion evidence를 판정하고 no-op false-PASS를 차단한다.

import crypto from "node:crypto";

export const allowedCompletionSources = [
  "endpoint-dom",
  "navigation-network-dom",
  "negative-route-status",
  "local-transition-readback",
  "dom-transition",
  "network-dom",
  "persisted-readback",
  "event-record",
  "server-log",
];

const trustedUserActions = new Set(["click", "select", "fill", "type"]);
const trustedResponseRequestIdentitySources = new Set([
  "playwright-response-request",
  "fixture-initiating-request-handle",
]);

export function domSnapshotDigest(snapshot) {
  if (snapshot === null || snapshot === undefined) return "";
  return crypto.createHash("sha256").update(stableStringify(snapshot)).digest("hex");
}

export function buildRequestCorrelationEvidence({
  entries = [],
  actionId,
  expected = {},
  requestResult = {},
  listenerInstalledBeforeRequest = false,
} = {}) {
  const method = String(expected.method || "GET").toUpperCase();
  const urlPath = requestTarget(expected.urlPath);
  const expectedActionId = String(actionId || "");
  const expectedCaseId = String(expected.caseId || expectedActionId.split(":")[0] || "");
  const correlationId = String(expected.correlationId || "");
  const correlationRequired = expected.correlationRequired !== false;
  const requestKind = String(expected.requestKind || "");
  const values = Array.isArray(entries) ? entries : [];
  const requests = values.filter(entry => entry?.phase === "request-start");
  const responses = values.filter(entry => entry?.phase === "response");
  const exactRequestCandidates = requests.filter(entry =>
    String(entry?.method || "").toUpperCase() === method &&
    requestTarget(entry?.url) === urlPath);
  const exactResponseCandidates = responses.filter(entry =>
    String(entry?.method || "").toUpperCase() === method &&
    requestTarget(entry?.url) === urlPath);
  const requestIdentityPresent = entry =>
    typeof entry?.requestId === "string" && Boolean(entry.requestId) &&
    typeof entry?.caseRequestIdentity === "string" && Boolean(entry.caseRequestIdentity) &&
    Number.isInteger(entry?.caseRequestSequence) && entry.caseRequestSequence > 0;
  const requestIdentityOwnedByCase = entry =>
    Boolean(expectedCaseId) &&
    entry?.caseRequestIdentity ===
      `${expectedCaseId}:request-${entry?.caseRequestSequence}`;
  const matchedRequests = exactRequestCandidates.filter(entry =>
    entry?.correlationSource === "request-header" &&
    entry?.correlationId === correlationId &&
    requestIdentityPresent(entry) &&
    requestIdentityOwnedByCase(entry));
  const matchedRequest = matchedRequests.length === 1 ? matchedRequests[0] : null;
  const matchedResponses = exactResponseCandidates.filter(entry =>
    entry?.responseRequestObjectObserved === true &&
    trustedResponseRequestIdentitySources.has(entry?.requestIdentitySource) &&
    entry?.responseCorrelationSource === "initiating-request-identity" &&
    entry?.correlationSource === "request-header" &&
    entry?.correlationId === correlationId &&
    requestIdentityPresent(entry) &&
    requestIdentityOwnedByCase(entry) &&
    matchedRequest &&
    entry.requestId === matchedRequest.requestId &&
    entry.caseRequestIdentity === matchedRequest.caseRequestIdentity &&
    entry.caseRequestSequence === matchedRequest.caseRequestSequence &&
    (expected.allowedStatuses || [200]).includes(Number(entry.status)));
  const matchedResponse = matchedResponses.length === 1 ? matchedResponses[0] : null;
  const requestResponseBound = matchedRequests.length === 1 &&
    matchedResponses.length === 1 &&
    matchedResponse.requestId === matchedRequest.requestId &&
    matchedResponse.caseRequestIdentity === matchedRequest.caseRequestIdentity &&
    matchedResponse.caseRequestSequence === matchedRequest.caseRequestSequence;
  const correlationGenerated = Boolean(correlationId);
  const correlationAttached = exactRequestCandidates.some(entry =>
    entry?.correlationSource === "request-header" && Boolean(entry?.correlationId));
  const correlationObserved = [...exactRequestCandidates, ...exactResponseCandidates].some(entry =>
    typeof entry?.correlationId === "string" && entry.correlationId);
  const requestAttemptCount = Number(requestResult?.requestAttemptCount || 0);
  let failureCode = "";
  if (requestKind !== "application-fetch") failureCode = "REQUEST_KIND_INVALID";
  else if (!expectedActionId || requestResult?.actionId !== expectedActionId) failureCode = "ACTION_ID_MISMATCH";
  else if (requestAttemptCount !== 1 || requestResult?.requestReissued === true) failureCode = "REQUEST_REISSUED";
  else if (!listenerInstalledBeforeRequest) failureCode = "LISTENER_INSTALLED_AFTER_REQUEST";
  else if (correlationRequired && !correlationGenerated) failureCode = "CORRELATION_NOT_GENERATED";
  else if (exactRequestCandidates.length === 0) {
    const methodCandidates = requests.filter(entry => requestTarget(entry?.url) === urlPath);
    const pathCandidates = requests.filter(entry =>
      String(entry?.method || "").toUpperCase() === method);
    failureCode = methodCandidates.length > 0
      ? "REQUEST_METHOD_MISMATCH"
      : (pathCandidates.length > 0 ? "REQUEST_PATH_MISMATCH" : "REQUEST_NOT_OBSERVED");
  } else if (exactRequestCandidates.length !== 1) failureCode = "DUPLICATE_REQUEST";
  else if (correlationRequired && !correlationAttached) failureCode = "CORRELATION_NOT_ATTACHED";
  else if (correlationRequired && !correlationObserved) failureCode = "CORRELATION_NOT_OBSERVED";
  else if (!requestIdentityPresent(exactRequestCandidates[0])) failureCode = "REQUEST_IDENTITY_MISSING";
  else if (!requestIdentityOwnedByCase(exactRequestCandidates[0])) {
    failureCode = "REQUEST_CASE_OWNERSHIP_MISMATCH";
  }
  else if (matchedRequests.length === 0) failureCode = "CORRELATION_MISMATCH";
  else if (matchedRequests.length !== 1) failureCode = "DUPLICATE_REQUEST";
  else if (exactResponseCandidates.length === 0) failureCode = "RESPONSE_NOT_OBSERVED";
  else if (exactResponseCandidates.length !== 1) failureCode = "DUPLICATE_RESPONSE";
  else if (exactResponseCandidates[0]?.responseRequestObjectObserved !== true ||
      !trustedResponseRequestIdentitySources.has(
        exactResponseCandidates[0]?.requestIdentitySource,
      )) {
    failureCode = "RESPONSE_REQUEST_OBJECT_MISSING";
  } else if (!requestIdentityPresent(exactResponseCandidates[0])) {
    failureCode = "RESPONSE_REQUEST_IDENTITY_MISSING";
  } else if (expected.responseEchoHeaderRequired === true &&
      (exactResponseCandidates[0]?.responseEchoHeaderContract !== "required" ||
        exactResponseCandidates[0]?.responseEchoHeaderObserved !== true ||
        exactResponseCandidates[0]?.responseEchoCorrelationId !== correlationId)) {
    failureCode = "RESPONSE_ECHO_MISMATCH";
  } else if (!(expected.allowedStatuses || [200]).includes(Number(exactResponseCandidates[0]?.status))) {
    failureCode = "RESPONSE_STATUS_MISMATCH";
  } else if (matchedResponses.length !== 1 || !requestResponseBound) {
    failureCode = "RESPONSE_BINDING_MISMATCH";
  }
  const expectedCorrelationDigest = correlationId
    ? crypto.createHash("sha256").update(correlationId).digest("hex")
    : "";
  const initiatingRequestCorrelationDigest = matchedRequest?.correlationId
    ? crypto.createHash("sha256").update(matchedRequest.correlationId).digest("hex")
    : "";
  const responseCandidate = exactResponseCandidates.length === 1
    ? exactResponseCandidates[0]
    : null;
  const responseRequestCorrelationDigest = responseCandidate?.correlationId
    ? crypto.createHash("sha256").update(responseCandidate.correlationId).digest("hex")
    : "";
  return {
    schema: "media-server.v390-ui-request-correlation-evidence.v1",
    pass: failureCode === "",
    requestExpected: true,
    requestObserved: exactRequestCandidates.length > 0,
    requestKind,
    expectedMethod: method,
    expectedPath: urlPath,
    expectedActionId,
    expectedCaseId,
    observedMethod: exactRequestCandidates.length === 1
      ? String(exactRequestCandidates[0].method || "").toUpperCase()
      : "",
    observedPath: exactRequestCandidates.length === 1
      ? requestTarget(exactRequestCandidates[0].url)
      : "",
    listenerInstalledBeforeRequest: listenerInstalledBeforeRequest === true,
    correlationRequired,
    correlationGenerated,
    correlationAttached,
    correlationObserved,
    correlationMatched: requestResponseBound,
    correlationDigest: expectedCorrelationDigest,
    expectedCorrelationDigest,
    initiatingRequestCorrelationDigest,
    responseRequestCorrelationDigest,
    caseRequestIdentity: matchedRequest?.caseRequestIdentity || "",
    caseRequestSequence: matchedRequest?.caseRequestSequence || null,
    responseRequestIdentity: responseCandidate?.caseRequestIdentity || "",
    responseRequestSequence: responseCandidate?.caseRequestSequence || null,
    requestIdentityMatched: requestResponseBound,
    responseRequestObjectObserved:
      exactResponseCandidates.length === 1 &&
      exactResponseCandidates[0]?.responseRequestObjectObserved === true,
    responseRequestMethod: exactResponseCandidates.length === 1
      ? String(exactResponseCandidates[0]?.method || "").toUpperCase()
      : "",
    responseRequestPath: exactResponseCandidates.length === 1
      ? requestTarget(exactResponseCandidates[0]?.url)
      : "",
    responseRequestHeaderDigest: exactResponseCandidates.length === 1
      ? String(exactResponseCandidates[0]?.requestHeaderDigest || "")
      : "",
    responseStatus: exactResponseCandidates.length === 1
      ? Number(exactResponseCandidates[0]?.status || 0)
      : 0,
    responseEchoHeaderRequired: expected.responseEchoHeaderRequired === true,
    responseEchoHeaderObserved:
      exactResponseCandidates.length === 1 &&
      exactResponseCandidates[0]?.responseEchoHeaderObserved === true,
    requestCandidateCount: exactRequestCandidates.length,
    matchedRequestCount: matchedRequests.length,
    responseCandidateCount: exactResponseCandidates.length,
    matchedResponseCount: matchedResponses.length,
    requestAttemptCount,
    requestReissued: requestResult?.requestReissued === true,
    failurePhase: failureCode ? "application-fetch-correlation" : "",
    failureCode,
  };
}

export function buildNavigationTrustEvidence({ navigation = {}, expected = {} } = {}) {
  navigation = navigation && typeof navigation === "object" ? navigation : {};
  const expectedPath = requestTarget(expected.requestedPath);
  const expectedObservedPath = requestTarget(
    expected.expectedObservedPath || expected.expectedCanonicalRoute,
  );
  const observedPath = requestTarget(navigation.observedPath || navigation.url);
  const requestCandidateCount = Number(navigation.requestCandidateCount || 0);
  const responseCandidateCount = Number(navigation.responseCandidateCount || 0);
  const requestAttemptCount = Number(navigation.requestAttemptCount || 0);
  const redirectCount = Number(navigation.redirectCount || 0);
  const retryCount = Number(navigation.retryCount || 0);
  const reloadCount = Number(navigation.reloadCount || 0);
  const unownedNavigationCount = Number(navigation.unownedNavigationCount || 0);
  const additionalFetchCount = Number(navigation.additionalFetchCount || 0);
  const orderedDocumentNavigations = Array.isArray(navigation.orderedDocumentNavigations)
    ? navigation.orderedDocumentNavigations
    : [];
  const expectedLifecycle = Array.isArray(expected.caseLifecycleNavigationSequence)
    ? expected.caseLifecycleNavigationSequence
    : null;
  const totalDocumentNavigationCount =
    Number(navigation.totalDocumentNavigationCount || orderedDocumentNavigations.length || 0);
  const listenerStartSequence = Number(navigation.listenerStartSequence || 0);
  const listenerEndSequence = navigation.listenerEndSequence === null ||
      navigation.listenerEndSequence === undefined
    ? null
    : Number(navigation.listenerEndSequence);
  const listenerActive = navigation.listenerActive === true;
  const navigationAfterListenerEndCount =
    Number(navigation.navigationAfterListenerEndCount || 0);
  const lifecycleMatches = expectedLifecycle
    ? expectedLifecycle.length === orderedDocumentNavigations.length &&
      expectedLifecycle.every((entry, index) => {
        const observed = orderedDocumentNavigations[index] || {};
        return String(entry.method || "").toUpperCase() ===
            String(observed.method || "").toUpperCase() &&
          requestTarget(entry.path) === requestTarget(observed.path) &&
          entry.resourceType === observed.resourceType &&
          entry.sameOrigin === observed.sameOrigin &&
          entry.correlationRequired === false &&
          observed.correlationPresent !== true &&
          (entry.redirected === undefined ||
            entry.redirected === observed.redirected) &&
          (entry.responseStatus === undefined ||
            Number(entry.responseStatus) === Number(observed.responseStatus)) &&
          observed.responseBound === true;
      })
    : totalDocumentNavigationCount === 1;
  const lastNavigationSequence = orderedDocumentNavigations.reduce(
    (maximum, entry) => Math.max(maximum, Number(entry?.responseSequence || entry?.sequence || 0)),
    0,
  );
  let failureCode = "";
  if (expected.schema !== "media-server.v390-ui-navigation-trust-binding.v1" ||
      expected.requestKind !== "document-navigation") {
    failureCode = "NAVIGATION_KIND_INVALID";
  }
  else if (expected.correlationRequired !== false) failureCode = "NAVIGATION_CORRELATION_FORBIDDEN";
  else if (expected.exactRequestSequence !== 1) failureCode = "NAVIGATION_SEQUENCE_INVALID";
  else if (navigation.listenerInstalledBeforeFirstNavigation !== true ||
      listenerStartSequence <= 0 ||
      orderedDocumentNavigations.some(entry => Number(entry?.sequence || 0) <= listenerStartSequence)) {
    failureCode = "LISTENER_INSTALLED_AFTER_NAVIGATION";
  } else if (navigationAfterListenerEndCount !== 0 ||
      (!listenerActive && (listenerEndSequence === null ||
        listenerEndSequence <= lastNavigationSequence))) {
    failureCode = "NAVIGATION_AFTER_LISTENER_END";
  } else if (reloadCount !== 0) {
    failureCode = "NAVIGATION_RELOADED";
  } else if (unownedNavigationCount !== 0) {
    failureCode = "NAVIGATION_UNOWNED";
  } else if (!lifecycleMatches) {
    failureCode = "NAVIGATION_LIFECYCLE_MISMATCH";
  }
  else if (!expected.invocationId || navigation.invocationId !== expected.invocationId) {
    failureCode = "NAVIGATION_INVOCATION_MISMATCH";
  } else if (navigation.requestKind !== "document-navigation" ||
      navigation.resourceType !== "document") {
    failureCode = "NAVIGATION_RESOURCE_TYPE_MISMATCH";
  } else if (navigation.sameOrigin !== true) {
    failureCode = "NAVIGATION_ORIGIN_MISMATCH";
  } else if (String(expected.method || "").toUpperCase() !== "GET" ||
      String(navigation.method || "").toUpperCase() !== "GET") {
    failureCode = "NAVIGATION_METHOD_MISMATCH";
  } else if (!expectedPath ||
      requestTarget(expected.expectedCanonicalRoute) !== expectedPath ||
      !expectedObservedPath ||
      observedPath !== expectedObservedPath ||
      requestTarget(navigation.requestedPath) !== expectedPath) {
    failureCode = "NAVIGATION_ROUTE_MISMATCH";
  } else if (requestAttemptCount !== 1 ||
      navigation.requestReissued === true ||
      retryCount !== 0 ||
      additionalFetchCount !== 0) {
    failureCode = "NAVIGATION_REQUEST_REISSUED";
  } else if (redirectCount !== Number(expected.exactRedirectCount || 0)) {
    failureCode = "NAVIGATION_REDIRECTED";
  } else if (requestCandidateCount !== 1) {
    failureCode = requestCandidateCount === 0
      ? "NAVIGATION_REQUEST_MISSING"
      : "NAVIGATION_REQUEST_REISSUED";
  } else if (responseCandidateCount !== 1) {
    failureCode = responseCandidateCount === 0
      ? "NAVIGATION_RESPONSE_MISSING"
      : "NAVIGATION_RESPONSE_DUPLICATE";
  } else if (navigation.requestResponseBound !== true) {
    failureCode = "NAVIGATION_REQUEST_RESPONSE_MISMATCH";
  } else if (navigation.correlationObserved === true) {
    failureCode = "NAVIGATION_CORRELATION_FORBIDDEN";
  }
  return {
    schema: "media-server.v390-ui-navigation-trust-evidence.v1",
    pass: failureCode === "",
    requestKind: String(expected.requestKind || ""),
    invocationId: String(expected.invocationId || ""),
    method: "GET",
    resourceType: String(navigation.resourceType || ""),
    sameOrigin: navigation.sameOrigin === true,
    requestedPath: expectedPath,
    expectedObservedPath,
    observedPath,
    correlationRequired: false,
    correlationObserved: navigation.correlationObserved === true,
    requestAttemptCount,
    requestCandidateCount,
    responseCandidateCount,
    requestResponseBound: navigation.requestResponseBound === true,
    redirectCount,
    retryCount,
    reloadCount,
    unownedNavigationCount,
    additionalFetchCount,
    requestReissued: navigation.requestReissued === true ||
      requestAttemptCount !== 1 ||
      requestCandidateCount > 1 ||
      retryCount !== 0 ||
      additionalFetchCount !== 0,
    totalDocumentNavigationCount,
    orderedDocumentNavigations: structuredClone(orderedDocumentNavigations),
    listenerStartSequence,
    listenerEndSequence,
    listenerActive,
    listenerInstalledBeforeFirstNavigation:
      navigation.listenerInstalledBeforeFirstNavigation === true,
    navigationAfterListenerEndCount,
    expectedLifecycleNavigationCount: expectedLifecycle?.length || 1,
    failurePhase: failureCode ? "document-navigation-binding" : "",
    failureCode,
  };
}

export function buildEndpointActionSemanticReadback({
  action,
  actionEvidence,
  runtimeReadback,
  networkResponses = [],
}) {
  const actual = canonicalEndpointActionObservation({
    action,
    actionEvidence,
    runtimeReadback,
    networkResponses,
  });
  const observation = { actual };
  return {
    schema: "media-server.v390-ui-semantic-readback.v2",
    identity: action.semanticCompletion.readbackIdentity,
    correlationId: actionEvidence.correlationId,
    actionId: actionEvidence.actionId,
    expectedBehaviorSha256: action.semanticCompletion.expectedBehaviorSha256,
    observationSource: "readback-request",
    selector: actionEvidence.controlSelector,
    observation,
    observationSha256: domSnapshotDigest(observation),
  };
}

export function canonicalEndpointActionObservation({
  action,
  actionEvidence,
  runtimeReadback,
  networkResponses = [],
}) {
  requireEndpointCondition(action?.kind === "execute-endpoint-action",
    "endpoint-action-kind-mismatch");
  requireEndpointCondition(action?.semanticCompletion?.phase === "primary-action",
    "endpoint-action-completion-phase-mismatch");
  requireEndpointCondition(runtimeReadback?.schema === "media-server.v390-ui-endpoint-action-readback.v1",
    "endpoint-action-readback-shape-missing");
  const request = action.semanticCompletion.request;
  requireEndpointCondition(request && request.method && request.urlPathTemplate && request.urlPath,
    "endpoint-action-request-binding-missing");
  requireEndpointCondition(action.endpoint?.method === request.method &&
    action.endpoint?.path === request.urlPathTemplate,
  "endpoint-action-template-binding-mismatch");
  const expandedPath = expandEndpointTemplate(request.urlPathTemplate, request.pathParameters || {});
  requireEndpointCondition(expandedPath === request.urlPath,
    "endpoint-action-fixture-binding-mismatch");
  requireEndpointCondition(actionEvidence?.actionId === action.semanticCompletion.actionId &&
    actionEvidence?.correlationId === request.correlationId &&
    actionEvidence?.expectedEndpoint?.method === request.method &&
    actionEvidence?.expectedEndpoint?.urlPathTemplate === request.urlPathTemplate &&
    actionEvidence?.expectedEndpoint?.urlPath === request.urlPath,
  "endpoint-action-evidence-binding-mismatch");
  requireEndpointCondition(runtimeReadback.method === request.method &&
    runtimeReadback.path === request.urlPath,
  "endpoint-action-method-path-mismatch");
  requireEndpointCondition(runtimeReadback.correlationId === request.correlationId &&
    typeof runtimeReadback.requestId === "string" && runtimeReadback.requestId,
  "endpoint-action-correlation-request-id-missing");
  requireEndpointCondition(Array.isArray(request.allowedStatuses) &&
    request.allowedStatuses.includes(Number(runtimeReadback.status)),
  "endpoint-action-status-mismatch");
  requireEndpointCondition(runtimeReadback.safeResponse &&
    typeof runtimeReadback.safeResponse === "object" && !Array.isArray(runtimeReadback.safeResponse),
  "endpoint-action-safe-response-missing");
  requireEndpointCondition(runtimeReadback.actualBrowserRequestObserved === true &&
    runtimeReadback.responseSynthesized === false && runtimeReadback.authoritative === true &&
    typeof runtimeReadback.readbackKind === "string" && runtimeReadback.readbackKind,
  "endpoint-action-authoritative-readback-missing");
  if (Object.hasOwn(request.pathParameters || {}, "fixtureId")) {
    requireEndpointCondition(runtimeReadback.fixtureId === request.pathParameters.fixtureId,
      "endpoint-action-runtime-fixture-binding-mismatch");
  }
  const responses = (Array.isArray(networkResponses) ? networkResponses : []).filter(entry => {
    if (entry?.phase && entry.phase !== "response") return false;
    if (entry?.requestId !== runtimeReadback.requestId ||
        entry?.correlationSource !== "request-header" ||
        entry?.correlationId !== request.correlationId ||
        entry?.method !== request.method || Number(entry?.status) !== Number(runtimeReadback.status)) return false;
    try { return new URL(String(entry.url), "http://localhost").pathname === request.urlPath; } catch { return false; }
  });
  requireEndpointCondition(responses.length === 1,
    responses.length === 0 ? "endpoint-action-network-response-missing" : "endpoint-action-network-response-ambiguous");
  const response = responses[0];
  requireEndpointCondition(response.safeResponseProjectionSource === "playwright-response-json" &&
    stableStringify(response.safeResponseBody) === stableStringify(runtimeReadback.safeResponse),
  "endpoint-action-safe-response-mismatch");
  return {
    endpointActionObserved: true,
    method: request.method,
    path: request.urlPathTemplate,
    actualPath: request.urlPath,
    fixtureBinding: {
      pathTemplate: request.urlPathTemplate,
      actualPath: request.urlPath,
      pathParameters: structuredClone(request.pathParameters || {}),
      verified: true,
    },
    correlationRequired: true,
    independentReadbackRequired: true,
    correlationId: request.correlationId,
    requestId: runtimeReadback.requestId,
    status: Number(runtimeReadback.status),
    safeResponse: structuredClone(runtimeReadback.safeResponse),
    authoritativeReadback: structuredClone(runtimeReadback),
  };
}

export function evaluateCompletionOracle({
  action,
  before = null,
  after = null,
  navigation = null,
  allowedStatuses = [200],
  networkResponses = [],
  persistedReadback = null,
  eventRecord = null,
  serverLog = null,
  semanticReadback = null,
}) {
  const beforeDigest = domSnapshotDigest(before);
  const afterDigest = domSnapshotDigest(after);
  const base = {
    pass: false,
    source: "",
    reason: "",
    correlationId: action?.correlationId || "",
    beforeDigest,
    afterDigest,
    networkResponses: Array.isArray(networkResponses) ? networkResponses : [],
    completionRequest: null,
    semanticReadback,
    expectedEndpoint: action?.expectedEndpoint || null,
    expectedNavigationBinding: action?.expectedNavigationBinding || null,
    completionMode: completionBindingMode(action).mode,
    completionPhase: action?.completionPhase || "legacy",
    actionId: action?.actionId || "",
    actionKind: action?.actionKind || action?.kind || "",
    controlSelector: action?.controlSelector ?? null,
  };
  if (!action?.executed) return { ...base, reason: "action-not-executed" };
  if (action.dispatch !== "playwright-native") return { ...base, reason: "untrusted-action-dispatch" };
  const actionBound = action.completionPhase === "primary-action";
  if (actionBound) {
    if (!action.actionId || !action.correlationId) return { ...base, reason: "primary-action-identity-missing" };
    if (!(action.controlSelector === null || (typeof action.controlSelector === "string" && action.controlSelector))) {
      return { ...base, reason: "primary-action-control-selector-invalid" };
    }
    if (action.expectedEndpoint && action.expectedEndpoint.correlationId !== action.correlationId) {
      return { ...base, reason: "action-request-correlation-mismatch" };
    }
  }
  if (action.semanticCompletionRequired && action.completionPhase !== "independent-readback") {
    const binding = completionBindingMode(action);
    if (binding.count === 0) return { ...base, reason: "completion-binding-missing" };
    if (binding.count !== 1) return { ...base, reason: "completion-binding-ambiguous" };
  }

  const actualKind = action.executedKind || action.kind;
  if (actualKind === "navigate" || action.kind === "navigate-negative") {
    if (!navigation || !allowedStatuses.includes(Number(navigation.status))) {
      return { ...base, reason: "navigation-status-mismatch" };
    }
    if (action.kind === "navigate-negative") {
      if (action.semanticCompletionRequired && action.expectedNavigationBinding) {
        const navigationTrustEvidence = buildNavigationTrustEvidence({
          navigation,
          expected: action.expectedNavigationBinding,
        });
        if (!navigationTrustEvidence.pass) {
          return { ...base, reason: navigationTrustEvidence.failureCode };
        }
        return {
          ...base,
          pass: true,
          source: "negative-route-status",
          reason: "",
          navigationTrustEvidence,
        };
      }
      const requestMatch = action.semanticCompletionRequired
        ? findCorrelatedEndpoint(base.networkResponses, action, semanticReadback)
        : { match: null, reason: "" };
      if (action.semanticCompletionRequired && !requestMatch.match) {
        return { ...base, reason: requestMatch.reason };
      }
      return {
        ...base,
        pass: true,
        source: "negative-route-status",
        reason: "",
        completionRequest: requestMatch.match,
        networkResponses: requestMatch.match ? [requestMatch.match] : base.networkResponses,
      };
    }
    if (!hasVisibleDom(after)) return { ...base, reason: "navigation-dom-missing" };
    if (action.semanticCompletionRequired) {
      const readbackReason = validateSemanticReadback(semanticReadback, action, actionBound);
      if (readbackReason) {
        return { ...base, reason: readbackReason };
      }
      if (action.expectedNavigationBinding) {
        const navigationTrustEvidence = buildNavigationTrustEvidence({
          navigation,
          expected: action.expectedNavigationBinding,
        });
        if (!navigationTrustEvidence.pass) {
          return { ...base, reason: navigationTrustEvidence.failureCode };
        }
        return allowedResult(base, action, "navigation-network-dom", { navigationTrustEvidence });
      }
      const requestMatch = findCorrelatedEndpoint(base.networkResponses, action, semanticReadback);
      if (!requestMatch.match) {
        return { ...base, reason: requestMatch.reason };
      }
      return allowedResult(base, action, "endpoint-dom", { completionRequest: requestMatch.match });
    }
    return { ...base, pass: true, source: "navigation-network-dom", reason: "" };
  }

  if (action.semanticCompletionRequired) {
    const readbackReason = validateSemanticReadback(semanticReadback, action, actionBound);
    if (actionBound && action.expectedNavigationBinding) {
      const navigationTrustEvidence = buildNavigationTrustEvidence({
        navigation,
        expected: action.expectedNavigationBinding,
      });
      if (!navigationTrustEvidence.pass) {
        return { ...base, reason: navigationTrustEvidence.failureCode };
      }
      const authoritativeContract =
        action.expectedNavigationBinding.authoritativeReadback;
      let authoritativeReadback = { pass: true, reason: "", evidence: null };
      if (authoritativeContract) {
        authoritativeReadback = catalogRuntimeAuthoritativeReadback(
          semanticReadback,
          authoritativeContract,
        );
        if (!authoritativeReadback.pass) {
          return { ...base, reason: authoritativeReadback.reason };
        }
      }
      if (!readbackReason) {
        const navigationResult = {
          navigationTrustEvidence,
          ...(authoritativeReadback.evidence
            ? { authoritativeReadbackEvidence: authoritativeReadback.evidence }
            : {}),
        };
        return allowedResult(base, action, "navigation-network-dom", navigationResult);
      }
      const alternative = actionBoundAlternative(base, action, persistedReadback, eventRecord, serverLog);
      return alternative || { ...base, reason: readbackReason };
    }
    if (actionBound && action.expectedLocalTransition) {
      const transitionReason = validateLocalTransition(before, after, action);
      if (transitionReason) return { ...base, reason: transitionReason };
      const localNetwork = validateLocalNetworkContract(base.networkResponses, action.expectedLocalTransition, action);
      if (localNetwork.reason) return { ...base, reason: localNetwork.reason };
      const localBase = localNetwork.matches.length > 0
        ? { ...base, networkResponses: localNetwork.matches }
        : base;
      if (!readbackReason) return allowedResult(localBase, action, "local-transition-readback");
      const alternative = actionBoundAlternative(localBase, action, persistedReadback, eventRecord, serverLog);
      return alternative || { ...base, reason: readbackReason };
    }
    if (actionBound && action.expectedEndpoint) {
      const requestMatch = findCorrelatedEndpoint(base.networkResponses, action, semanticReadback);
      if (!requestMatch.match) {
        return { ...base, reason: requestMatch.reason };
      }
      const requestBase = {
        ...base,
        completionRequest: requestMatch.match,
        networkResponses: [requestMatch.match],
      };
      if (!readbackReason) return allowedResult(requestBase, action, "endpoint-dom");
      const alternative = actionBoundAlternative(requestBase, action, persistedReadback, eventRecord, serverLog);
      return alternative || { ...base, reason: readbackReason };
    }
    if (readbackReason) {
      return { ...base, reason: readbackReason };
    }
    const requestMatch = findCorrelatedEndpoint(base.networkResponses, action, semanticReadback);
    if (requestMatch.match) {
      return allowedResult(base, action, "endpoint-dom", { completionRequest: requestMatch.match });
    }
    if (matchesPersistedReadback(persistedReadback, action)) {
      return allowedResult(base, action, "persisted-readback");
    }
    if (matchesEventRecord(eventRecord, action)) {
      return allowedResult(base, action, "event-record");
    }
    if (matchesServerLog(serverLog, action)) {
      return allowedResult(base, action, "server-log");
    }
    return { ...base, reason: "no-correlated-semantic-completion" };
  }
  if (!trustedUserActions.has(actualKind)) return { ...base, reason: "unsupported-completion-action" };
  if (beforeDigest && afterDigest && beforeDigest !== afterDigest) {
    return { ...base, pass: true, source: "dom-transition", reason: "" };
  }

  const correlationId = action.correlationId || "";
  const expectedNetworkUrlIncludes = Array.isArray(action.expectedNetworkUrlIncludes)
    ? action.expectedNetworkUrlIncludes.filter(Boolean)
    : [];
  const correlatedNetwork = base.networkResponses.filter(item =>
    correlationId &&
    item?.correlationId === correlationId &&
    Number(item.status) >= 200 &&
    Number(item.status) < 400 &&
    expectedNetworkUrlIncludes.some(pattern => String(item.url || "").includes(pattern)),
  );
  if (correlatedNetwork.length > 0 && hasVisibleDom(after)) {
    return { ...base, pass: true, source: "network-dom", reason: "", networkResponses: correlatedNetwork };
  }
  if (matchesCorrelation(persistedReadback, correlationId) &&
      persistedReadback.beforeDigest && persistedReadback.afterDigest &&
      persistedReadback.beforeDigest !== persistedReadback.afterDigest) {
    return { ...base, pass: true, source: "persisted-readback", reason: "" };
  }
  if (matchesCorrelation(eventRecord, correlationId) && eventRecord.observed === true) {
    return { ...base, pass: true, source: "event-record", reason: "" };
  }
  if (matchesCorrelation(serverLog, correlationId) && serverLog.matched === true) {
    return { ...base, pass: true, source: "server-log", reason: "" };
  }
  return { ...base, reason: "no-correlated-completion" };
}

function actionBoundAlternative(base, action, persistedReadback, eventRecord, serverLog) {
  if (matchesPersistedReadback(persistedReadback, action)) {
    return allowedResult(base, action, "persisted-readback");
  }
  if (matchesEventRecord(eventRecord, action)) return allowedResult(base, action, "event-record");
  if (matchesServerLog(serverLog, action)) return allowedResult(base, action, "server-log");
  return null;
}

function expandEndpointTemplate(template, parameters) {
  return String(template).replace(/\{([^}]+)\}/g, (_match, key) => {
    requireEndpointCondition(Object.hasOwn(parameters, key),
      "endpoint-action-fixture-parameter-missing");
    return encodeURIComponent(String(parameters[key]));
  });
}

function requireEndpointCondition(condition, reason) {
  if (!condition) throw new Error(reason);
}

function allowedResult(base, action, source, additions = {}) {
  const allowed = Array.isArray(action.allowedCompletionSources) ? action.allowedCompletionSources : [];
  if (allowed.length > 0 && !allowed.includes(source)) {
    return { ...base, reason: "completion-source-not-allowed" };
  }
  const completionRequest = additions.completionRequest || base.completionRequest || null;
  return {
    ...base,
    ...additions,
    pass: true,
    source,
    reason: "",
    completionRequest,
    networkResponses: completionRequest ? [completionRequest] : base.networkResponses,
  };
}

function validateSemanticReadback(value, action, actionBound) {
  if (!actionBound) {
    if (value?.schema !== "media-server.v390-ui-semantic-readback.v1" ||
        !action.expectedReadbackIdentity || value.identity !== action.expectedReadbackIdentity ||
        value.correlationId !== action.correlationId || value.expected === undefined ||
        stableStringify(value.expected) !== stableStringify(value.observed)) {
      return "semantic-readback-mismatch";
    }
    return "";
  }
  if (value?.schema !== "media-server.v390-ui-semantic-readback.v2" ||
      !action.expectedReadbackIdentity || value.identity !== action.expectedReadbackIdentity ||
      value.correlationId !== action.correlationId ||
      value.expectedBehaviorSha256 !== action.expectedBehaviorSha256 ||
      !/^[a-f0-9]{64}$/.test(String(value.expectedBehaviorSha256 || "")) ||
      value.expected !== undefined || value.observed !== undefined ||
      value.observation === undefined ||
      value.observationSha256 !== domSnapshotDigest(value.observation)) {
    return "semantic-readback-mismatch";
  }
  if (!["browser-dom", "readback-request", "event-record", "server-log"].includes(value.observationSource)) {
    return "untrusted-readback-observation-source";
  }
  if (value.actionId !== action.actionId) return "readback-action-id-mismatch";
  if (value.observationSource === "browser-dom") {
    if (value.selector !== action.controlSelector) return "readback-control-selector-mismatch";
    const executedSelector = action.executedControlSelector || action.controlSelector;
    const snapshots = [value.observation?.before, value.observation?.after].filter(Boolean);
    if (executedSelector !== null && snapshots.some(snapshot => snapshot.selector !== executedSelector)) {
      return "readback-control-selector-mismatch";
    }
  }
  if (evaluateSemanticExpectation(action.expectedReadbackExpectation, value.observation) !== true) {
    return "semantic-readback-observation-mismatch";
  }
  return "";
}

function evaluateSemanticExpectation(expected, observation) {
  if (!expected || typeof expected !== "object" || !observation || typeof observation !== "object") return false;
  const before = observation.before || null;
  const after = observation.after || observation.actual || null;
  if (expected.changedProperty) {
    return expected.changed === true && before && after &&
      stableStringify(before[expected.changedProperty]) !== stableStringify(after[expected.changedProperty]);
  }
  if (expected.property) {
    return after && stableStringify(after[expected.property]) === stableStringify(expected.value);
  }
  if (expected.hrefKind) {
    return after?.tag === expected.tag && expected.hrefKind === "same-origin-path" &&
      String(after?.href || "").startsWith("/");
  }
  if (expected.minimumNonEmptyOptions !== undefined) {
    return after?.tag === expected.tag &&
      Number(after?.nonEmptyOptionCount ?? after?.optionValues?.filter(Boolean)?.length ?? 0) >=
        Number(expected.minimumNonEmptyOptions);
  }
  if (Array.isArray(expected.textIncludesAll) && expected.textIncludesAll.length > 0) {
    return expected.textIncludesAll.every(value => String(after?.text || "").includes(String(value)));
  }
  if (Array.isArray(expected.postconditions) && expected.postconditions.length > 0) {
    const beforeSnapshots = observation.beforeSnapshots || {};
    const snapshots = observation.snapshots || {};
    const afterMatches = expected.postconditions.every(condition =>
      matchesPostcondition(snapshots[condition.selector], condition));
    const transitioned = expected.postconditions.some(condition =>
      !matchesPostcondition(beforeSnapshots[condition.selector], condition) &&
      matchesPostcondition(snapshots[condition.selector], condition));
    const observationMode = expected.postconditionObservationMode || "transition-required";
    if (!["transition-required", "after-action-exact"].includes(observationMode)) return false;
    if (!afterMatches || (observationMode === "transition-required" && !transitioned)) return false;
    if (expected.independentRejectedReadbackRequired !== true) return true;
  }
  if (expected.independentRejectedReadbackRequired === true) {
    const readback = observation.rejectedActionReadback;
    const expectedErrors = Array.isArray(expected.independentProductErrors)
      ? expected.independentProductErrors
      : [];
    return readback?.schema === "media-server.v390-ui-rejected-action-readback.v1" &&
      readback.runtimeProductResponseObserved === true &&
      readback.registryUnchanged === true &&
      expectedErrors.length > 0 &&
      Array.isArray(readback.productErrors) &&
      stableStringify(readback.productErrors) === stableStringify(expectedErrors);
  }
  if (expected.persistedMutationObserved !== undefined) {
    const readback = observation.runtimeMutationReadback || observation.actual?.runtimeMutationReadback;
    const deleteReadback = readback?.method === "DELETE";
    return expected.persistedMutationObserved === true &&
      readback?.schema === "media-server.v390-ui-runtime-mutation-readback.v1" &&
      readback.persistedMutationObserved === true &&
      readback.changed === true &&
      /^[a-f0-9]{64}$/.test(String(readback.beforeSha256 || "")) &&
      /^[a-f0-9]{64}$/.test(String(readback.observedSha256 || "")) &&
      readback.beforeSha256 !== readback.observedSha256 &&
      (deleteReadback ? readback.observedPresent === false : readback.observedPresent === true);
  }
  if (expected.navigationStatus !== undefined) {
    return Number(observation.navigation?.status) === Number(expected.navigationStatus);
  }
  const actual = after || observation.actual || observation;
  return Object.entries(expected).every(([key, value]) =>
    stableStringify(actual?.[key]) === stableStringify(value));
}

function validateLocalTransition(before, after, action) {
  const expected = action.expectedLocalTransition;
  if (!expected || expected.selector !== action.controlSelector ||
      (!expected.property && !(Array.isArray(expected.postconditions) && expected.postconditions.length > 0))) {
    return "local-transition-contract-invalid";
  }
  if (before?.selector !== action.controlSelector || after?.selector !== action.controlSelector) {
    return "local-transition-selector-mismatch";
  }
  if (expected.property && stableStringify(before?.[expected.property]) === stableStringify(after?.[expected.property])) {
    return "local-transition-not-observed";
  }
  return "";
}

function validateLocalNetworkContract(entries, expected, action) {
  const values = Array.isArray(entries) ? entries : [];
  for (const forbidden of expected.forbiddenRequests || []) {
    const found = values.some(entry => {
      if (entry?.phase !== "request-start") return false;
      const pathname = requestPathname(entry?.url);
      return (forbidden.methods || []).includes(String(entry?.method || "").toUpperCase()) &&
        pathname.startsWith(forbidden.pathPrefix);
    });
    if (found) return { matches: [], reason: "forbidden-action-request-observed" };
  }
  const matches = [];
  let previousIndex = -1;
  for (const request of expected.requiredRequests || []) {
    const candidates = values
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry, index }) => index > previousIndex &&
        entry?.correlationSource === "request-header" &&
        entry?.correlationId === action.correlationId &&
        typeof entry?.requestId === "string" && entry.requestId &&
        String(entry.method || "").toUpperCase() === request.method &&
        requestPathname(entry.url) === request.urlPath &&
        request.allowedStatuses.includes(Number(entry.status)));
    if (candidates.length !== 1) {
      return { matches: [], reason: candidates.length === 0 ? "required-action-request-missing" : "ambiguous-exact-request" };
    }
    previousIndex = candidates[0].index;
    matches.push(structuredClone(candidates[0].entry));
  }
  return { matches, reason: "" };
}

function matchesPostcondition(snapshot, condition) {
  if (!snapshot || snapshot.selector !== condition.selector) return false;
  const actual = snapshot[condition.property];
  if (condition.operator === "equals") return stableStringify(actual) === stableStringify(condition.value);
  if (condition.operator === "includes") return String(actual || "").includes(String(condition.value));
  if (condition.operator === "startsWith") return String(actual || "").startsWith(String(condition.value));
  if (condition.operator === "in") return Array.isArray(condition.values) && condition.values.includes(actual);
  return false;
}

function requestPathname(rawUrl) {
  try {
    return new URL(String(rawUrl || ""), "http://localhost").pathname;
  } catch {
    return "";
  }
}

function completionBindingMode(action) {
  const modes = [
    ["requestBinding", Boolean(action?.expectedEndpoint)],
    ["localTransitionBinding", Boolean(action?.expectedLocalTransition)],
    ["navigationBinding", Boolean(action?.expectedNavigationBinding)],
  ].filter(([, present]) => present);
  return {
    count: modes.length,
    mode: modes.length === 1 ? modes[0][0] : "",
  };
}

function requestTarget(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ""), "http://localhost");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

function findCorrelatedEndpoint(entries, action, semanticReadback = null) {
  const expected = action.expectedEndpoint;
  if (!expected || !Array.isArray(entries)) return { match: null, reason: "request-correlation-missing" };
  const documentForm = findDocumentFormSubmission(entries, action);
  if (documentForm.present) {
    return documentForm.match
      ? { match: documentForm.match, reason: "" }
      : { match: null, reason: documentForm.reason };
  }
  const catalog = catalogRuntimeCompletionRequest(semanticReadback, action);
  if (catalog.present) {
    return catalog.match
      ? { match: catalog.match, reason: "" }
      : { match: null, reason: catalog.reason };
  }
  const matches = entries.filter(item =>
    item?.correlationSource === "request-header" &&
    item?.correlationId === expected.correlationId &&
    typeof item?.requestId === "string" && item.requestId &&
    String(item.method || "").toUpperCase() === String(expected.method || "GET").toUpperCase() &&
    Number(item.status) >= 200 && Number(item.status) < 600 &&
    (expected.allowedStatuses || [200]).includes(Number(item.status)) &&
    endpointUrlMatches(item.url, expected),
  );
  if (matches.length === 0) return { match: null, reason: "request-correlation-missing" };
  if (matches.length !== 1) return { match: null, reason: "ambiguous-exact-request" };
  return { match: structuredClone(matches[0]), reason: "" };
}

function findDocumentFormSubmission(entries, action) {
  const expected = action.expectedEndpoint;
  const binding = action?.formResponseIdentity;
  if (!binding || binding.schema !== "media-server.v390-ui-document-form-submit-binding.v1") {
    return { present: false, match: null, reason: "" };
  }
  if (
      binding.requestKind !== "document-navigation" ||
      binding.resourceType !== "document" ||
      binding.sameOrigin !== true ||
      binding.correlationObserved !== false ||
      binding.responseRequestObjectObserved !== true ||
      binding.requestAttemptCount !== 1 ||
      binding.responseCandidateCount !== 1 ||
      binding.reissueCount !== 0 ||
      typeof binding.requestId !== "string" || !binding.requestId ||
      typeof binding.caseRequestIdentity !== "string" || !binding.caseRequestIdentity ||
      !Number.isInteger(binding.caseRequestSequence) || binding.caseRequestSequence < 1 ||
      String(binding.method || "").toUpperCase() !== String(expected?.method || "").toUpperCase() ||
      requestTarget(binding.path) !== requestTarget(expected?.urlPath) ||
      !(expected?.allowedStatuses || []).includes(Number(binding.status))) {
    return { present: true, match: null, reason: "document-form-binding-invalid" };
  }
  const requestEntries = entries.filter(entry =>
    entry?.phase === "request-start" &&
    entry.requestId === binding.requestId &&
    entry.caseRequestIdentity === binding.caseRequestIdentity &&
    entry.caseRequestSequence === binding.caseRequestSequence &&
    entry.requestKind === "document-navigation" &&
    entry.resourceType === "document" &&
    entry.sameOrigin === true &&
    entry.correlationId === "" &&
    String(entry.method || "").toUpperCase() === String(expected.method || "").toUpperCase() &&
    requestTarget(entry.url) === requestTarget(expected.urlPath),
  );
  const responseEntries = entries.filter(entry =>
    entry?.phase === "response" &&
    entry.requestId === binding.requestId &&
    entry.caseRequestIdentity === binding.caseRequestIdentity &&
    entry.caseRequestSequence === binding.caseRequestSequence &&
    entry.requestKind === "document-navigation" &&
    entry.resourceType === "document" &&
    entry.sameOrigin === true &&
    entry.correlationId === "" &&
    entry.responseRequestObjectObserved === true &&
    String(entry.method || "").toUpperCase() === String(expected.method || "").toUpperCase() &&
    requestTarget(entry.url) === requestTarget(expected.urlPath) &&
    Number(entry.status) === Number(binding.status),
  );
  if (requestEntries.length !== 1 || responseEntries.length !== 1) {
    return { present: true, match: null, reason: "document-form-request-response-mismatch" };
  }
  return {
    present: true,
    match: {
      ...structuredClone(responseEntries[0]),
      correlationId: action.correlationId,
      correlationSource: "document-form-request-response-identity",
      documentFormResponseIdentity: structuredClone(binding),
    },
    reason: "",
  };
}

function catalogRuntimeAuthoritativeReadback(semanticReadback, expected) {
  if (!expected || expected.source !== "catalog-runtime-fresh-browser-fetch") {
    return { pass: false, reason: "catalog-authoritative-readback-contract-missing", evidence: null };
  }
  const exactRuntimeOracle = semanticReadback?.observation?.actual?.exactRuntimeOracle;
  if (exactRuntimeOracle?.schema !== "media-server.v390-ui-exact-runtime-observation.v1" ||
      !Array.isArray(exactRuntimeOracle.responses)) {
    return { pass: false, reason: "catalog-authoritative-readback-missing", evidence: null };
  }
  if (exactRuntimeOracle.responses.length !== 1) {
    return {
      pass: false,
      reason: exactRuntimeOracle.responses.length === 0
        ? "catalog-authoritative-readback-request-missing"
        : "catalog-authoritative-readback-request-duplicate",
      evidence: null,
    };
  }
  const matches = exactRuntimeOracle.responses.filter(response =>
    String(response?.method || "").toUpperCase() === String(expected.method || "").toUpperCase() &&
    requestTarget(response?.urlPath) === requestTarget(expected.urlPath) &&
    (expected.allowedStatuses || [200]).includes(Number(response?.status)));
  if (matches.length !== 1) {
    return {
      pass: false,
      reason: matches.length === 0
        ? "catalog-authoritative-readback-request-missing"
        : "catalog-authoritative-readback-request-duplicate",
      evidence: null,
    };
  }
  const evidence = matches[0].requestCorrelationEvidence;
  const expectedDigest = crypto.createHash("sha256")
    .update(String(expected.correlationId || ""))
    .digest("hex");
  if (evidence?.schema !== "media-server.v390-ui-request-correlation-evidence.v1" ||
      evidence.pass !== true ||
      evidence.requestKind !== "application-fetch" ||
      evidence.expectedActionId !== expected.actionId ||
      evidence.expectedMethod !== String(expected.method || "").toUpperCase() ||
      requestTarget(evidence.expectedPath) !== requestTarget(expected.urlPath) ||
      evidence.correlationDigest !== expectedDigest ||
      evidence.requestAttemptCount !== 1 ||
      evidence.requestReissued !== false ||
      evidence.requestCandidateCount !== 1 ||
      evidence.matchedRequestCount !== 1 ||
      evidence.responseCandidateCount !== 1 ||
      evidence.matchedResponseCount !== 1) {
    return { pass: false, reason: "catalog-authoritative-correlation-invalid", evidence: evidence || null };
  }
  return { pass: true, reason: "", evidence: structuredClone(evidence) };
}

function catalogRuntimeCompletionRequest(semanticReadback, action) {
  const exactRuntimeOracle = semanticReadback?.observation?.actual?.exactRuntimeOracle;
  if (exactRuntimeOracle === undefined) return { present: false, match: null, reason: "" };
  if (exactRuntimeOracle?.schema !== "media-server.v390-ui-exact-runtime-observation.v1" ||
      exactRuntimeOracle.caseId !== String(action.actionId || "").split(":")[0] ||
      !Array.isArray(exactRuntimeOracle.responses) ||
      !Array.isArray(exactRuntimeOracle.dom) ||
      typeof exactRuntimeOracle.requestedRoute !== "string" ||
      typeof exactRuntimeOracle.observedRoute !== "string") {
    return { present: true, match: null, reason: "catalog-runtime-readback-invalid" };
  }
  const expected = action.expectedEndpoint;
  const allowedStatuses = Array.isArray(expected?.allowedStatuses) ? expected.allowedStatuses : [200];
  const responses = exactRuntimeOracle.responses;
  if (responses.length === 0) {
    return { present: true, match: null, reason: "catalog-runtime-response-invalid:empty" };
  }
  const invalidResponse = responses.map((response, index) => {
    const defects = [];
    if (!response || typeof response !== "object") defects.push("shape");
    if (!["fresh-browser-fetch", "correlated-browser-network"].includes(response?.source)) defects.push("source");
    if (!/^[a-f0-9]{64}$/.test(String(response?.bodyDigest || ""))) defects.push("bodyDigest");
    if (typeof response?.method !== "string" || !response.method) defects.push("method");
    if (typeof response?.urlPath !== "string" || !response.urlPath) defects.push("urlPath");
    if (!Number.isInteger(Number(response?.status))) defects.push("status");
    return defects.length > 0 ? { index, defects } : null;
  }).find(Boolean);
  if (invalidResponse) {
    return {
      present: true,
      match: null,
      reason: `catalog-runtime-response-invalid:${invalidResponse.index}:${invalidResponse.defects.join("+")}`,
    };
  }
  const exactResponses = responses.filter(response =>
    String(response.method).toUpperCase() === String(expected.method || "GET").toUpperCase() &&
    requestPathname(response.urlPath) === expected.urlPath &&
    allowedStatuses.includes(Number(response.status)));
  if (exactResponses.length > 1) {
    return { present: true, match: null, reason: "ambiguous-exact-request" };
  }
  const routeBound = String(expected.method || "GET").toUpperCase() === "GET" &&
    !/^\/(?:ops|client)\/api(?:\/|$)/.test(expected.urlPath) &&
    requestPathname(exactRuntimeOracle.requestedRoute) === expected.urlPath &&
    requestPathname(exactRuntimeOracle.observedRoute).startsWith("/");
  if (exactResponses.length === 0 && !routeBound) {
    return { present: true, match: null, reason: "request-correlation-missing" };
  }
  const exactResponse = exactResponses[0] || null;
  const attestation = {
    schema: exactRuntimeOracle.schema,
    caseId: exactRuntimeOracle.caseId,
    requestedRoute: exactRuntimeOracle.requestedRoute,
    observedRoute: exactRuntimeOracle.observedRoute,
    responses,
    dom: exactRuntimeOracle.dom,
  };
  const attestationSha256 = crypto.createHash("sha256")
    .update(stableStringify(attestation))
    .digest("hex");
  return {
    present: true,
    reason: "",
    match: {
      phase: "response",
      requestId: `catalog-runtime-${attestationSha256.slice(0, 24)}`,
      correlationId: action.correlationId,
      correlationSource: "semantic-readback-catalog-runtime",
      method: String(expected.method || "GET").toUpperCase(),
      status: Number(exactResponse?.status ?? responses[0].status),
      url: expected.urlPath,
      source: exactResponse?.source || "fresh-browser-fetch",
      bodyDigest: exactResponse?.bodyDigest || attestationSha256,
      catalogRuntimeAttestationSha256: attestationSha256,
      catalogRuntimeResponseCount: responses.length,
      actualBrowserRequestObserved: true,
    },
  };
}

function endpointUrlMatches(rawUrl, expected) {
  if (expected.urlPath) {
    try {
      const pathname = new URL(String(rawUrl), "http://localhost").pathname;
      return !String(expected.urlPath).includes("{") && pathname === expected.urlPath;
    } catch {
      return false;
    }
  }
  return String(rawUrl || "").includes(String(expected.urlIncludes || ""));
}

function matchesPersistedReadback(value, action) {
  return Boolean(
    value?.schema === "media-server.v390-ui-persisted-readback.v1" &&
    value.correlationSource === "readback-request" &&
    value.correlationId === action.correlationId &&
    value.identity === action.expectedReadbackIdentity &&
    value.actionId === action.actionId &&
    value.expectedBehaviorSha256 === action.expectedBehaviorSha256 &&
    typeof value.readbackRequestId === "string" && value.readbackRequestId &&
    value.beforeDigest && value.afterDigest && value.beforeDigest !== value.afterDigest,
  );
}

function matchesEventRecord(value, action) {
  return Boolean(
    value?.schema === "media-server.v390-ui-event-record-completion.v1" &&
    value.correlationSource === "event-record-field" &&
    value.correlationId === action.correlationId &&
    value.identity === action.expectedReadbackIdentity &&
    value.actionId === action.actionId &&
    value.expectedBehaviorSha256 === action.expectedBehaviorSha256 &&
    value.observed === true &&
    typeof value.eventId === "string" && value.eventId &&
    /^[a-f0-9]{64}$/.test(String(value.recordSha256 || "")),
  );
}

function matchesServerLog(value, action) {
  return Boolean(
    value?.schema === "media-server.v390-ui-server-log-completion.v1" &&
    value.correlationSource === "server-log-field" &&
    value.correlationId === action.correlationId &&
    value.identity === action.expectedReadbackIdentity &&
    value.actionId === action.actionId &&
    value.expectedBehaviorSha256 === action.expectedBehaviorSha256 &&
    value.matched === true &&
    Number.isInteger(value.byteStart) && Number.isInteger(value.byteEnd) && value.byteEnd > value.byteStart &&
    /^[a-f0-9]{64}$/.test(String(value.lineSha256 || "")),
  );
}

function hasVisibleDom(value) {
  if (Array.isArray(value)) return value.some(item => item?.exists === true && item?.visible === true);
  return value?.exists === true && value?.visible === true;
}

function matchesCorrelation(value, correlationId) {
  return Boolean(correlationId && value?.correlationId === correlationId);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}
