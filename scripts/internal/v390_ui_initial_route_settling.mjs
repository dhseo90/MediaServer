// 파일 용도: canonical initial/bootstrap document route settling과 이후 action-owned request ledger를 분리해 exact 결속한다.

import { assertCanonicalRequestLifecycleTuple }
  from "./v390_ui_action_request_ledger.mjs";

export function buildInitialRouteSettlingPlan(item) {
  assert(item?.caseId && Array.isArray(item?.actions) && item?.workflow?.primaryControl,
    "initial route settling requires one canonical native case");
  const explicitInitialActions = item.actions.filter(action =>
    action?.semanticCompletion?.phase === "initial-navigation");
  const negativeRouteInitialActions = item.actions.filter(action =>
    item.disposition === "negative-route" &&
    item.actions.length === 1 &&
    action?.semanticCompletion?.completionMode === "navigation" &&
    String(action?.semanticCompletion?.navigationBinding?.invocationId || "")
      .endsWith(":initial-document-navigation"));
  const initialActions = explicitInitialActions.length > 0
    ? explicitInitialActions
    : negativeRouteInitialActions;
  assert(initialActions.length === 1,
    `${item.caseId} initial navigation action cardinality mismatch`);
  const initialAction = initialActions[0];
  const binding = initialAction.semanticCompletion?.navigationBinding;
  assert(binding?.schema === "media-server.v390-ui-navigation-trust-binding.v1" &&
    binding.requestKind === "document-navigation" &&
    String(binding.method || "").toUpperCase() === "GET",
  `${item.caseId} initial navigation binding mismatch`);
  const requestedRoute = routePath(binding.requestedPath);
  const settledRoute = routePath(binding.expectedObservedPath);
  const explicitChain = Array.isArray(binding.caseLifecycleNavigationSequence)
    ? binding.caseLifecycleNavigationSequence
    : null;
  const expectedChain = (explicitChain || [{
    purpose: "requested-document",
    method: "GET",
    path: requestedRoute,
    resourceType: "document",
    sameOrigin: true,
    correlationRequired: false,
    redirected: false,
    responseStatuses: [...binding.allowedStatuses],
  }]).map((hop, index) => ({
    purpose: String(hop.purpose || `initial-hop-${index + 1}`),
    method: String(hop.method || "GET").toUpperCase(),
    path: routePath(hop.path),
    resourceType: String(hop.resourceType || ""),
    sameOrigin: hop.sameOrigin === true,
    correlationRequired: hop.correlationRequired === true,
    redirected: hop.redirected === true,
    responseStatuses: hop.responseStatus === undefined
      ? [...(hop.responseStatuses || binding.allowedStatuses || [])].map(Number)
      : [Number(hop.responseStatus)],
    locationPath: index < (explicitChain?.length || 1) - 1
      ? routePath((explicitChain || [])[index + 1]?.path || "")
      : "",
  }));
  assert(requestedRoute && settledRoute && expectedChain.length > 0,
    `${item.caseId} initial route/chain missing`);
  assert(expectedChain[0].path === requestedRoute &&
    expectedChain.at(-1).path === settledRoute,
  `${item.caseId} initial route chain endpoints mismatch`);
  const primaryAction = item.actions.find(action =>
    action?.semanticCompletion?.phase === "primary-action");
  assert(primaryAction, `${item.caseId} primary action missing`);
  const primaryControl = item.workflow.primaryControl;
  const controlApplicability = primaryControl.applicability === "not-applicable"
    ? "not-applicable"
    : "required";
  const expectedControlVisible = controlApplicability === "required" &&
    primaryAction.kind !== "assert-hidden-control";
  const declaredRequestCount = Array.isArray(primaryAction.uiLifecycle?.requestBinding?.expectedRequests)
    ? primaryAction.uiLifecycle.requestBinding.expectedRequests.length
    : Number(primaryAction.semanticCompletion?.request?.expectedRequestCount ??
      primaryAction.semanticCompletion?.request?.cardinality ?? 1);
  return {
    schema: "media-server.v390-ui-initial-route-settling-plan.v1",
    caseId: item.caseId,
    canonicalRoute: routePath(item.canonicalRoute),
    requestedRoute,
    settledRoute,
    accountRole: String(item.accountRole || ""),
    invocationId: String(binding.invocationId || ""),
    finalAllowedStatuses: [...binding.allowedStatuses].map(Number),
    expectedRedirectCount: Number(binding.exactRedirectCount || 0),
    expectedDocumentCount: expectedChain.length,
    expectedChain,
    routeClassification: requestedRoute === settledRoute
      ? "requested-equals-settled"
      : "initial-http-redirect",
    redirectClassification: classifyRedirect(requestedRoute, settledRoute),
    landingClassification: classifyLanding(settledRoute),
    settledControl: {
      applicability: "required",
      selector: "body",
      expectedVisible: true,
    },
    actionSource: {
      route: routePath(item.controlAction?.actionRoute || item.screenRoute),
      applicability: controlApplicability,
      selector: primaryControl.selector ?? null,
      expectedVisible: expectedControlVisible,
      sourceOwnerSelector: expectedControlVisible
        ? String(primaryControl.selector || "")
        : "body",
    },
    primaryRequest: primaryAction.semanticCompletion?.completionMode === "request"
      ? {
          actionId: String(primaryAction.semanticCompletion.actionId || ""),
          correlationId: String(primaryAction.semanticCompletion.correlationId || ""),
          method: String(primaryAction.semanticCompletion.request?.method || "").toUpperCase(),
          path: requestTarget(primaryAction.semanticCompletion.request?.urlPath || ""),
          pathTemplate: String(primaryAction.semanticCompletion.request?.urlPathTemplate || ""),
          requestKind: ["auth-standard-submit", "auth-logout"].includes(
            String(primaryAction.uiLifecycle?.adapter || ""))
            ? "document-navigation"
            : "application-fetch",
          expectedRequestCount: Number(
            primaryAction.semanticCompletion.request?.expectedRequestCount ??
            primaryAction.semanticCompletion.request?.cardinality ?? 1),
          expectedResponseCount: Number(
            primaryAction.semanticCompletion.request?.expectedResponseCount ??
            primaryAction.semanticCompletion.request?.expectedRequestCount ??
            primaryAction.semanticCompletion.request?.cardinality ?? 1),
          expectedActionRequestCount: declaredRequestCount,
          expectedActionResponseCount: declaredRequestCount,
          allowedStatuses: [...(primaryAction.semanticCompletion.request?.allowedStatuses || [])]
            .map(Number),
        }
      : null,
  };
}

export function buildInitialRouteSettlingCensus(manifest) {
  assert(Array.isArray(manifest?.cases), "initial route settling census manifest missing");
  const plans = manifest.cases.map(buildInitialRouteSettlingPlan);
  const count = predicate => plans.filter(predicate).length;
  const caseIds = predicate => plans.filter(predicate).map(plan => plan.caseId);
  const routeClassifications = {
    "requested-equals-settled": count(plan => plan.routeClassification === "requested-equals-settled"),
    "initial-http-redirect": count(plan => plan.routeClassification === "initial-http-redirect"),
  };
  const redirectClassifications = {
    "role-landing-redirect": count(plan => plan.redirectClassification === "role-landing-redirect"),
    "login-setup-redirect": count(plan => plan.routeClassification === "initial-http-redirect" &&
      plan.landingClassification === "login-setup-landing"),
    "other-initial-redirect": count(plan => plan.redirectClassification === "other-initial-redirect"),
    "not-redirected": count(plan => plan.redirectClassification === "not-redirected"),
  };
  const landingClassifications = Object.fromEntries([
    "login-setup-landing",
    "client-landing",
    "operator-landing",
    "lab-landing",
  ].map(classification => [classification,
    count(plan => plan.landingClassification === classification)]));
  const roleCounts = countBy(plans, plan => plan.accountRole);
  const finalStatusContractCounts = countBy(plans,
    plan => plan.finalAllowedStatuses.join("/"));
  const requestedSettledRoutePairs = countBy(plans,
    plan => `${plan.requestedRoute} -> ${plan.settledRoute}`);
  const redirectLocationCounts = countBy(
    plans.flatMap(plan => plan.expectedChain
      .filter(hop => hop.locationPath)
      .map(hop => hop.locationPath)),
    location => location,
  );
  return {
    schema: "media-server.v390-ui-initial-route-settling-census.v1",
    canonicalCaseCount: plans.length,
    requestCompletionCount: count(plan => plan.primaryRequest !== null),
    expectedDocumentHopCount: plans.reduce((sum, plan) => sum + plan.expectedDocumentCount, 0),
    routeClassifications,
    redirectClassifications,
    landingClassifications,
    roleCounts,
    finalStatusContractCounts,
    requestedSettledRoutePairs,
    redirectLocationCounts,
    actionSourceRouteDiffCount: count(plan =>
      plan.actionSource.route !== plan.settledRoute),
    redirectedCaseIds: caseIds(plan => plan.routeClassification === "initial-http-redirect"),
    roleLandingRedirectCaseIds: caseIds(plan => plan.redirectClassification === "role-landing-redirect"),
    loginSetupRedirectCaseIds: caseIds(plan =>
      plan.routeClassification === "initial-http-redirect" &&
      plan.landingClassification === "login-setup-landing"),
  };
}

export function bindInitialRouteSettling(plan, attestation, observedRole) {
  assert(plan?.schema === "media-server.v390-ui-initial-route-settling-plan.v1",
    "initial route settling plan schema mismatch");
  assert(attestation?.schema === "media-server.v390-ui-initial-route-settling-attestation.v1" &&
    attestation.caseId === plan.caseId,
  `${plan.caseId} initial route settling attestation mismatch`);
  assert(String(observedRole || "") === plan.accountRole,
    `${plan.caseId} initial settled role mismatch`);
  assert(routePath(attestation.requestedRoute) === plan.requestedRoute &&
    routePath(attestation.observedRoute) === plan.settledRoute,
  `${plan.caseId} initial requested/settled route mismatch`);
  assert(attestation.invocationId === plan.invocationId &&
    Number(attestation.status) > 0 &&
    plan.finalAllowedStatuses.includes(Number(attestation.status)),
  `${plan.caseId} initial status/invocation mismatch`);
  assert(Number(attestation.redirectCount) === plan.expectedRedirectCount,
    `${plan.caseId} unexpected initial redirect count`);
  const chain = attestation.documentChain;
  assert(Array.isArray(chain) && chain.length === plan.expectedDocumentCount,
    `${plan.caseId} initial document chain cardinality mismatch`);
  const requestIds = new Set();
  let priorRequestId = "";
  let priorResponseSequence = 0;
  for (let index = 0; index < plan.expectedChain.length; index += 1) {
    const expected = plan.expectedChain[index];
    const observed = chain[index] || {};
    assert(observed.invocationId === plan.invocationId &&
      observed.navigationKind === "initial-document-navigation" &&
      String(observed.method || "").toUpperCase() === expected.method &&
      routePath(observed.path) === expected.path,
    `${plan.caseId} initial document route/order mismatch`);
    assert(observed.resourceType === expected.resourceType &&
      observed.sameOrigin === expected.sameOrigin &&
      observed.correlationPresent !== true &&
      expected.correlationRequired === false,
    `${plan.caseId} initial document trust boundary mismatch`);
    assert(expected.responseStatuses.includes(Number(observed.responseStatus)) &&
      observed.responseBound === true &&
      observed.responseRequestObjectObserved === true &&
      observed.responseRequestId === observed.requestId,
    `${plan.caseId} initial response/status/object binding mismatch`);
    assert(observed.redirected === expected.redirected &&
      String(observed.redirectedFromRequestId || "") === priorRequestId &&
      routePath(observed.responseLocationPath || "") === expected.locationPath,
    `${plan.caseId} initial redirect/Location chain mismatch`);
    assert(typeof observed.requestId === "string" && observed.requestId &&
      !requestIds.has(observed.requestId) &&
      Number.isInteger(Number(observed.caseRequestSequence)) &&
      Number(observed.caseRequestSequence) > 0 &&
      Number(observed.responseSequence) > Number(observed.sequence) &&
      Number(observed.sequence) > priorResponseSequence,
    `${plan.caseId} initial request identity/sequence mismatch`);
    assert(Number(observed.navigationEpoch) === index + 1,
      `${plan.caseId} initial navigation epoch mismatch`);
    requestIds.add(observed.requestId);
    priorRequestId = observed.requestId;
    priorResponseSequence = Number(observed.responseSequence);
  }
  assertOwner(plan.caseId, attestation.settledDocumentOwner, "body",
    plan.expectedDocumentCount, true, "settled document owner");
  const control = attestation.settledControl;
  assert(control?.selector === plan.settledControl.selector &&
    control.candidateCount === 1 && control.exists === true &&
    control.visible === true &&
    Number(control.navigationEpoch) === plan.expectedDocumentCount,
  `${plan.caseId} initial settled control mismatch`);
  assertOwner(plan.caseId, attestation.sourceBeforeOwner,
    plan.settledControl.selector, plan.expectedDocumentCount, true,
    "source-before owner");
  assert(attestation.bootstrapLedgerClosed === true &&
    attestation.actionLedgerStarted === false &&
    Number(attestation.actionOwnedRequestCount) === 0 &&
    Number(attestation.actionOwnedNavigationCount) === 0,
  `${plan.caseId} bootstrap/action ledger boundary mismatch`);
  return {
    schema: "media-server.v390-ui-initial-route-settling-binding.v1",
    caseId: plan.caseId,
    requestedRoute: plan.requestedRoute,
    settledRoute: plan.settledRoute,
    accountRole: plan.accountRole,
    status: Number(attestation.status),
    redirectCount: Number(attestation.redirectCount),
    documentHopCount: chain.length,
    finalEpoch: plan.expectedDocumentCount,
    sourceOwnerSelector: plan.settledControl.selector,
    routeClassification: plan.routeClassification,
    redirectClassification: plan.redirectClassification,
    landingClassification: plan.landingClassification,
    pass: true,
  };
}

export function bindActionOwnedRequestLedger(plan, ledgerStart, entries, {
  executionOwnerSelector = "",
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-initial-route-settling-plan.v1" &&
    plan.primaryRequest,
  "action-owned request ledger requires a request-completion plan");
  assert(ledgerStart?.schema === "media-server.v390-ui-action-ledger-start.v1" &&
    ledgerStart.caseId === plan.caseId &&
    ledgerStart.actionId === plan.primaryRequest.actionId &&
    ledgerStart.correlationId === plan.primaryRequest.correlationId,
  `${plan.caseId} action ledger start identity mismatch`);
  assert(routePath(ledgerStart.sourceRoute) === plan.actionSource.route,
    `${plan.caseId} action ledger source route mismatch`);
  const sourceOwnerSelector = String(executionOwnerSelector ||
    plan.actionSource.sourceOwnerSelector || "");
  assertOwner(plan.caseId, ledgerStart.sourceBeforeOwner,
    sourceOwnerSelector, Number(ledgerStart.navigationEpoch), true,
    "action ledger source-before owner");
  const sourceControl = ledgerStart.sourceControl;
  if (plan.actionSource.applicability === "not-applicable") {
    assert(sourceControl?.selector === "body" && sourceControl.candidateCount === 1 &&
      sourceControl.exists === true && sourceControl.visible === true,
    `${plan.caseId} action non-applicable control mismatch`);
  } else {
    assert(sourceControl?.selector === sourceOwnerSelector &&
      sourceControl.candidateCount === 1 && sourceControl.exists === true &&
      sourceControl.visible === plan.actionSource.expectedVisible &&
      Number(sourceControl.navigationEpoch) === Number(ledgerStart.navigationEpoch),
    `${plan.caseId} action source control mismatch`);
  }
  const values = Array.isArray(entries) ? entries : [];
  assert(values.every(entry => ["action", "page"].includes(entry?.ledgerOwner)),
    `${plan.caseId} request ledger owner classification is missing`);
  const actionValues = values.filter(entry => entry.ledgerOwner === "action");
  const pageValues = values.filter(entry => entry.ledgerOwner === "page");
  const starts = actionValues.filter(entry => entry?.phase === "request-start");
  const responses = actionValues.filter(entry => entry?.phase === "response");
  assert(starts.length === plan.primaryRequest.expectedActionRequestCount &&
    responses.length === plan.primaryRequest.expectedActionResponseCount,
    `${plan.caseId} action request/response ledger cardinality mismatch`);
  for (const entry of actionValues) {
    assert(Number(entry.caseRequestSequence) > Number(ledgerStart.caseRequestSequenceFloor),
      `${plan.caseId} bootstrap request leaked into action ledger`);
    const documentNavigation = entry.requestKind === "document-navigation";
    assertCanonicalRequestLifecycleTuple(entry, {
      lifecycleClass: entry.lifecycleClass || "primary-action",
    });
    assert(entry.initiatorActionId === plan.primaryRequest.actionId &&
      entry.requestOwnershipKind === "primary-action" &&
      entry.sourceOwner === "explicit-action-registration" &&
      entry.ownerPhase === "primary-action" &&
      (documentNavigation
        ? entry.correlationId === ""
        : entry.correlationId === plan.primaryRequest.correlationId),
    `${plan.caseId} action request ownership/correlation mismatch`);
  }
  const pageCorrelationLeaks = pageValues.filter(entry =>
    entry.initiatorActionId === plan.primaryRequest.actionId ||
    entry.correlationId === plan.primaryRequest.correlationId);
  assert(pageCorrelationLeaks.length === 0,
    `${plan.caseId} page-owned action correlation leak count mismatch: ${pageCorrelationLeaks.length}`);
  for (const entry of pageValues) {
    const lifecycleClass = entry.lifecycleClass || pageLifecycleClassFromTuple(entry);
    assertCanonicalRequestLifecycleTuple(entry, { lifecycleClass });
    assert(entry.initiatorActionId !== plan.primaryRequest.actionId &&
      entry.correlationId !== plan.primaryRequest.correlationId,
    `${plan.caseId} page-owned request source/phase mismatch`);
  }
  const primaryStarts = starts.filter(entry =>
    String(entry.method || "").toUpperCase() === plan.primaryRequest.method &&
    requestTarget(entry.url) === plan.primaryRequest.path);
  const primaryResponses = responses.filter(entry =>
    String(entry.method || "").toUpperCase() === plan.primaryRequest.method &&
    requestTarget(entry.url) === plan.primaryRequest.path);
  assert(primaryStarts.length === plan.primaryRequest.expectedRequestCount &&
    primaryResponses.length === plan.primaryRequest.expectedResponseCount,
    `${plan.caseId} primary request/response cardinality mismatch`);
  for (const requestEntry of primaryStarts) {
    const boundResponses = primaryResponses.filter(responseEntry =>
      responseEntry.requestId === requestEntry.requestId &&
      responseEntry.caseRequestIdentity === requestEntry.caseRequestIdentity &&
      responseEntry.caseRequestSequence === requestEntry.caseRequestSequence);
    assert(boundResponses.length === 1 &&
      boundResponses[0].responseRequestObjectObserved === true &&
      boundResponses[0].requestIdentitySource === "playwright-response-request" &&
      plan.primaryRequest.allowedStatuses.includes(Number(boundResponses[0].status)),
    `${plan.caseId} primary request/response object binding mismatch`);
  }
  const request = primaryStarts[0];
  const response = primaryResponses.find(entry => entry.requestId === request.requestId);
  assert(starts.every((entry, index) => index === 0 ||
    Number(entry.caseRequestSequence) > Number(starts[index - 1].caseRequestSequence)),
  `${plan.caseId} action request sequence reordered/duplicated`);
  assert(starts.every(start => {
    const startIndex = values.indexOf(start);
    const responseIndex = values.findIndex(entry =>
      entry?.phase === "response" && entry.requestId === start.requestId);
    return responseIndex > startIndex;
  }), `${plan.caseId} action response preceded its request`);
  const ordered = [...starts];
  return {
    schema: "media-server.v390-ui-action-owned-request-ledger-binding.v1",
    caseId: plan.caseId,
    actionId: plan.primaryRequest.actionId,
    correlationId: plan.primaryRequest.correlationId,
    primaryRequestId: request.requestId,
    primaryRequestSequence: request.caseRequestSequence,
    primaryResponseStatus: Number(response.status),
    requestCount: starts.length,
    responseCount: responses.length,
    additionalFetchCount: 0,
    pageOwnedRequestCount: pageValues.filter(entry => entry.phase === "request-start").length,
    pageOwnedResponseCount: pageValues.filter(entry => entry.phase === "response").length,
    actionCorrelationLeakCount: 0,
    pageOwnedRequestLedger: pageValues.map(entry => ({
      phase: entry.phase,
      requestId: entry.requestId,
      caseRequestSequence: entry.caseRequestSequence,
      method: String(entry.method || "").toUpperCase(),
      path: requestTarget(entry.url),
      sourceOwner: entry.sourceOwner,
      ownerPhase: entry.ownerPhase,
      requestOwnershipKind: entry.requestOwnershipKind,
      lifecycleClass: entry.lifecycleClass || pageLifecycleClassFromTuple(entry),
    })),
    orderedCallFlow: ordered.map(entry => ({
      requestId: entry.requestId,
      caseRequestSequence: entry.caseRequestSequence,
      method: String(entry.method || "").toUpperCase(),
      path: routePath(entry.url),
    })),
    pass: true,
  };
}

function pageLifecycleClassFromTuple(entry) {
  const tuple = [entry?.ledgerOwner, entry?.sourceOwner,
    entry?.ownerPhase, entry?.requestOwnershipKind].join("/");
  const classes = {
    "page/page/bootstrap/initial-page-load": "bootstrap-document",
    "page/page/bootstrap/bootstrap": "bootstrap-fetch",
    "page/page/background-refresh/background-refresh": "background-fetch",
    "page/page/page-subresource/page-subresource": "page-subresource",
    "page/page/sse/sse": "sse",
    "page/page/websocket/websocket": "websocket",
    "page/document-navigation-ledger/document-navigation-chain/document-navigation-chain":
      "document-redirect-chain",
    "page/page/independent-readback/independent-readback": "independent-readback",
  };
  const lifecycleClass = classes[tuple];
  assert(lifecycleClass, `page-owned request lifecycle tuple is unclassified: ${tuple}`);
  return lifecycleClass;
}

function classifyRedirect(requestedRoute, settledRoute) {
  if (requestedRoute === settledRoute) return "not-redirected";
  if (requestedRoute === "/") return "role-landing-redirect";
  if (["/login", "/setup", "/invite/setup", "/password/change"]
      .includes(settledRoute)) return "login-setup-redirect";
  return "other-initial-redirect";
}

function classifyLanding(route) {
  if (["/login", "/setup", "/invite/setup", "/password/change", "/client/request-access"]
      .includes(route)) return "login-setup-landing";
  if (route.startsWith("/client")) return "client-landing";
  if (route.startsWith("/ops")) return "operator-landing";
  if (route.startsWith("/lab")) return "lab-landing";
  throw new Error(`unclassified initial settled route: ${route}`);
}

function assertOwner(caseId, owner, selector, epoch, visible, label) {
  assert(owner?.selector === selector && owner.candidateCount === 1 &&
    owner.exists === true && owner.visible === visible &&
    Number(owner.navigationEpoch) === Number(epoch),
  `${caseId} ${label} mismatch`);
}

function routePath(value) {
  const text = String(value || "");
  if (!text) return "";
  try { return new URL(text, "http://127.0.0.1").pathname; }
  catch { return ""; }
}

function requestTarget(value) {
  const text = String(value || "");
  if (!text) return "";
  try {
    const url = new URL(text, "http://127.0.0.1");
    return `${url.pathname}${url.search}`;
  } catch { return ""; }
}

function countBy(values, keyOf) {
  const counts = {};
  for (const value of values) {
    const key = String(keyOf(value));
    counts[key] = Number(counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
