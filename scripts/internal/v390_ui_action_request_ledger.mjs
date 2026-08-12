// 파일 용도: canonical action request envelope와 page-owned background request ledger를 분리한다.

const documentFormAdapters = new Set([
  "auth-standard-submit",
  "auth-logout",
]);

export function buildCanonicalActionRequestCensus(manifest) {
  assert(Array.isArray(manifest?.cases), "canonical action request census manifest is missing");
  const rows = [];
  for (const item of manifest.cases) {
    const primary = (item.actions || []).filter(action =>
      action?.semanticCompletion?.phase === "primary-action" &&
      action?.semanticCompletion?.completionMode === "request");
    if (primary.length === 0) continue;
    assert(primary.length === 1,
      `${item.caseId} canonical request completion cardinality mismatch`);
    const action = primary[0];
    const request = normalizeActionRequestEnvelope(action.semanticCompletion.request, {
      caseId: item.caseId,
      actionId: action.semanticCompletion.actionId,
      phase: "primary-action",
      correlationId: action.semanticCompletion.correlationId,
      requestKind: documentFormAdapters.has(String(action.uiLifecycle?.adapter || ""))
        ? "document-navigation"
        : "application-fetch",
    });
    const template = String(action.semanticCompletion.request?.urlPathTemplate || "");
    const materializedPath = request.target;
    const parameters = action.semanticCompletion.request?.pathParameters || {};
    const parameterNames = [...template.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
    assert(parameterNames.every(name => Object.hasOwn(parameters, name)),
      `${item.caseId} materialized request parameter is missing`);
    assert(!materializedPath.includes("{") && !materializedPath.includes("}"),
      `${item.caseId} materialized request target contains a template token`);
    rows.push(Object.freeze({
      caseId: String(item.caseId),
      actionKind: String(action.kind || ""),
      actionId: request.actionId,
      phase: request.phase,
      method: request.method,
      endpointTemplate: template,
      materializedPath,
      endpointShape: parameterNames.length > 0 ? "template-materialized" : "literal-exact",
      requestTransport: request.requestKind === "document-navigation"
        ? "document-form"
        : "exact-api-fetch",
      expectedRequestCount: request.expectedRequestCount,
      expectedResponseCount: request.expectedResponseCount,
      allowedStatuses: request.allowedStatuses,
      correlationId: request.correlationId,
      correlationRequired: request.correlationRequired,
      requestOwnershipKind: request.ownershipKind,
    }));
  }
  const countBy = key => Object.fromEntries([...new Set(rows.map(row => row[key]))]
    .sort().map(value => [value, rows.filter(row => row[key] === value).length]));
  return Object.freeze({
    schema: "media-server.v390-ui-action-request-census.v1",
    canonicalRequestActionCount: rows.length,
    methodCounts: countBy("method"),
    endpointShapeCounts: countBy("endpointShape"),
    requestTransportCounts: countBy("requestTransport"),
    actionKindCounts: countBy("actionKind"),
    uniqueTemplateCount: new Set(rows.map(row => row.endpointTemplate)).size,
    uniqueMaterializedPathCount: new Set(rows.map(row => row.materializedPath)).size,
    duplicateActionIdCount: rows.length - new Set(rows.map(row => row.actionId)).size,
    duplicateCorrelationIdCount: rows.length - new Set(rows.map(row => row.correlationId)).size,
    rows,
  });
}

export function normalizeActionRequestEnvelope(request = {}, {
  caseId = "",
  actionId = "",
  phase = "",
  correlationId = "",
  requestKind = "application-fetch",
  registrationKind = "manifest-envelope",
} = {}) {
  const method = String(request.method || "").toUpperCase();
  const rawTarget = String(request.urlPath || request.path || "");
  const runtimePathParameters = [...new Set((request.runtimePathParameters || [])
    .map(value => String(value || "").trim()).filter(Boolean))].sort();
  const targetParameterNames = [...rawTarget.matchAll(/\{([^}/]+)\}/g)]
    .map(match => String(match[1])).sort();
  let target = normalizeRequestTarget(rawTarget);
  for (const name of targetParameterNames) {
    target = target.replaceAll(encodeURIComponent(`{${name}}`), `{${name}}`);
  }
  const ownedActionId = String(request.initiatorActionId || actionId || "");
  const ownedCorrelationId = String(request.correlationId ?? correlationId ?? "");
  const expectedRequestCount = Number(request.expectedRequestCount ?? request.cardinality ?? 1);
  const expectedResponseCount = Number(request.expectedResponseCount ?? expectedRequestCount);
  const allowedStatuses = [...new Set((request.allowedStatuses || request.statuses || [])
    .map(Number))];
  assert(String(caseId || ""), "action request envelope case ID is missing");
  assert(String(phase || ""), "action request envelope phase is missing");
  assert(ownedActionId, "action request envelope action ID is missing");
  assert(method && target, "action request envelope method/target is missing");
  assert(JSON.stringify(targetParameterNames) === JSON.stringify(runtimePathParameters),
    "action request envelope runtime path parameters are not explicitly declared");
  assert(Number.isInteger(expectedRequestCount) && expectedRequestCount > 0 &&
    Number.isInteger(expectedResponseCount) && expectedResponseCount > 0,
  "action request envelope cardinality is invalid");
  assert(expectedRequestCount === expectedResponseCount,
    "action request/response envelope cardinality differs");
  assert(allowedStatuses.length > 0 && allowedStatuses.every(status =>
    Number.isInteger(status) && status >= 100 && status <= 599),
  "action request envelope allowed status is invalid");
  assert(["application-fetch", "document-navigation"].includes(requestKind),
    `action request envelope kind is invalid: ${requestKind}`);
  const correlationRequired = requestKind !== "document-navigation" &&
    String(request.correlationSource || "request-header") === "request-header";
  if (correlationRequired) assert(ownedCorrelationId,
    "action request envelope correlation ID is missing");
  return Object.freeze({
    schema: "media-server.v390-ui-action-request-envelope.v1",
    caseId: String(caseId),
    phase: String(phase),
    actionId: ownedActionId,
    ownershipKind: String(request.requestOwnershipKind || phase),
    method,
    target,
    runtimePathParameters: Object.freeze(runtimePathParameters),
    requestKind,
    expectedRequestCount,
    expectedResponseCount,
    allowedStatuses: Object.freeze(allowedStatuses),
    correlationId: ownedCorrelationId,
    correlationRequired,
    registrationKind: String(registrationKind || "manifest-envelope"),
  });
}

export function createActionRequestEnvelopeLedger(envelope) {
  assert(envelope?.schema === "media-server.v390-ui-action-request-envelope.v1",
    "action request envelope schema mismatch");
  const requestHandles = new WeakMap();
  const claims = [];
  const responses = [];
  let closed = false;

  const requireOpen = () => assert(!closed, "action request envelope ledger is closed");
  return Object.freeze({
    envelope,
    matches({ method = "", target = "", requestKind = "" } = {}) {
      return String(method).toUpperCase() === envelope.method &&
        matchesActionRequestTarget(envelope, target) &&
        String(requestKind || "") === envelope.requestKind;
    },
    claim(requestHandle, request = {}) {
      requireOpen();
      assertOpaque(requestHandle, "action initiating request");
      assert(this.matches(request), "action initiating request envelope mismatch");
      assert(!requestHandles.has(requestHandle), "duplicate action initiating request object");
      assert(claims.length < envelope.expectedRequestCount,
        "action initiating request cardinality exceeded");
      const claim = {
        ordinal: claims.length + 1,
        requestHandle,
        requestId: String(request.requestId || ""),
        caseRequestIdentity: String(request.caseRequestIdentity || ""),
        caseRequestSequence: Number(request.caseRequestSequence || 0),
        method: envelope.method,
        target: normalizeRequestTarget(request.target),
        requestKind: envelope.requestKind,
        registrationKind: String(request.registrationKind || envelope.registrationKind),
      };
      requestHandles.set(requestHandle, claim);
      claims.push(claim);
      return claim;
    },
    resolve(requestHandle) {
      return requestHandles.get(requestHandle) || null;
    },
    bindRequestIdentity(requestHandle, identity = {}) {
      requireOpen();
      const claim = requestHandles.get(requestHandle);
      assert(claim, "action request identity has no initiating object claim");
      assert(String(identity.requestId || "") && String(identity.caseRequestIdentity || "") &&
        Number.isInteger(Number(identity.caseRequestSequence)) &&
        Number(identity.caseRequestSequence) > 0,
      "action request identity is incomplete");
      Object.assign(claim, {
        requestId: String(identity.requestId),
        caseRequestIdentity: String(identity.caseRequestIdentity),
        caseRequestSequence: Number(identity.caseRequestSequence),
      });
      return claim;
    },
    bindResponse(requestHandle, response = {}) {
      requireOpen();
      const claim = requestHandles.get(requestHandle);
      assert(claim, "action response has no initiating request object claim");
      assert(!responses.some(item => item.ordinal === claim.ordinal),
        "duplicate action response for initiating request object");
      assert(String(response.method || "").toUpperCase() === envelope.method &&
        normalizeRequestTarget(response.target || response.url || "") === claim.target &&
        matchesActionRequestTarget(envelope, response.target || response.url || ""),
      "action response method/path mismatch");
      assert(envelope.allowedStatuses.includes(Number(response.status)),
        `action response status mismatch: ${Number(response.status || 0)}`);
      assert(response.responseRequestObjectObserved === true,
        "action response initiating request object was not observed");
      responses.push(Object.freeze({
        ordinal: claim.ordinal,
        requestId: String(response.requestId || claim.requestId),
        caseRequestIdentity: String(response.caseRequestIdentity || claim.caseRequestIdentity),
        caseRequestSequence: Number(response.caseRequestSequence || claim.caseRequestSequence),
        status: Number(response.status),
      }));
    },
    close() {
      requireOpen();
      closed = true;
      assert(claims.length === envelope.expectedRequestCount,
        `action request cardinality mismatch: ${claims.length}/${envelope.expectedRequestCount}`);
      assert(responses.length === envelope.expectedResponseCount,
        `action response cardinality mismatch: ${responses.length}/${envelope.expectedResponseCount}`);
      for (const claim of claims) {
        const response = responses.find(item => item.ordinal === claim.ordinal);
        assert(response && claim.requestId && claim.caseRequestIdentity &&
          response.requestId === claim.requestId &&
          response.caseRequestIdentity === claim.caseRequestIdentity &&
          response.caseRequestSequence === claim.caseRequestSequence,
        "action request/response object identity mismatch");
      }
      return Object.freeze({
        schema: "media-server.v390-ui-action-request-envelope-ledger.v1",
        caseId: envelope.caseId,
        phase: envelope.phase,
        actionId: envelope.actionId,
        correlationId: envelope.correlationId,
        method: envelope.method,
        target: envelope.target,
        observedTargets: Object.freeze(claims.map(item => item.target)),
        requestKind: envelope.requestKind,
        expectedRequestCount: envelope.expectedRequestCount,
        requestCount: claims.length,
        responseCount: responses.length,
        requestSequences: Object.freeze(claims.map(item => item.caseRequestSequence)),
        statuses: Object.freeze(responses.map(item => item.status)),
        pass: true,
      });
    },
  });
}

export function matchesActionRequestTarget(envelope, target) {
  let expected = normalizeRequestTarget(envelope?.target || "");
  const actual = normalizeRequestTarget(target || "");
  const runtimeNames = new Set(envelope?.runtimePathParameters || []);
  for (const name of runtimeNames) {
    expected = expected.replaceAll(encodeURIComponent(`{${name}}`), `{${name}}`);
  }
  if (runtimeNames.size === 0) return actual === expected;
  const [expectedPath, expectedQuery = ""] = expected.split("?", 2);
  const [actualPath, actualQuery = ""] = actual.split("?", 2);
  if (expectedQuery !== actualQuery) return false;
  const expectedParts = expectedPath.split("/");
  const actualParts = actualPath.split("/");
  if (expectedParts.length !== actualParts.length) return false;
  return expectedParts.every((part, index) => {
    const match = part.match(/^\{([^}/]+)\}$/);
    if (!match) return part === actualParts[index];
    return runtimeNames.has(match[1]) && Boolean(actualParts[index]);
  });
}

export function createObjectBoundActionResponseBarrier({
  expectedResponseCount = 1,
  label = "action-response",
} = {}) {
  assert(Number.isInteger(expectedResponseCount) && expectedResponseCount > 0,
    "action response barrier cardinality is invalid");
  const responseHandles = new WeakSet();
  let responseCount = 0;
  let settled = false;
  let settlement = "pending";
  let failure = null;
  let resolveCompletion;
  let rejectCompletion;
  let activeWaiterCount = 0;
  let activeTimerCount = 0;
  const completionPromise = new Promise((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  // 러너가 barrier에 도달하기 전 실패도 unhandled rejection 없이 fail-closed 상태로 보존한다.
  completionPromise.catch(() => {});
  const fail = error => {
    if (settlement === "failed") return;
    failure = error instanceof Error ? error : new Error(String(error || label));
    settled = true;
    settlement = "failed";
    if (responseCount < expectedResponseCount) rejectCompletion(failure);
  };
  const evidence = () => Object.freeze({
    schema: "media-server.v390-ui-object-bound-response-barrier.v1",
    label: String(label),
    expectedResponseCount,
    responseCount,
    settlement,
    settled,
    activeWaiterCount,
    activeTimerCount,
    pass: settlement === "resolved" &&
      responseCount === expectedResponseCount &&
      activeWaiterCount === 0 && activeTimerCount === 0,
  });
  return Object.freeze({
    observe(requestHandle) {
      assertOpaque(requestHandle, "action response request");
      if (settled) {
        const error = new Error(`late action response after barrier ${settlement}: ${label}`);
        fail(error);
        throw error;
      }
      assert(!responseHandles.has(requestHandle),
        `duplicate action response object at barrier: ${label}`);
      responseHandles.add(requestHandle);
      responseCount += 1;
      if (responseCount > expectedResponseCount) {
        const error = new Error(`action response barrier cardinality exceeded: ${label}`);
        fail(error);
        throw error;
      }
      if (responseCount === expectedResponseCount) {
        settled = true;
        settlement = "resolved";
        resolveCompletion(evidence());
      }
      return evidence();
    },
    fail,
    async wait({ timeoutMs } = {}) {
      assert(Number.isFinite(timeoutMs) && timeoutMs > 0,
        "action response barrier timeout is invalid");
      if (failure) throw failure;
      activeWaiterCount += 1;
      let timer = null;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          activeTimerCount += 1;
          timer = setTimeout(() => {
            activeTimerCount -= 1;
            timer = null;
            const error = new Error(
              `object-bound action response barrier timeout: ${label} ` +
              `${responseCount}/${expectedResponseCount}`,
            );
            fail(error);
            reject(error);
          }, timeoutMs);
        });
        await Promise.race([completionPromise, timeoutPromise]);
      } finally {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
          activeTimerCount -= 1;
        }
        activeWaiterCount -= 1;
      }
      if (failure) throw failure;
      return evidence();
    },
    abort(reason = "action response barrier aborted") {
      fail(reason instanceof Error ? reason : new Error(String(reason)));
      return evidence();
    },
    evidence,
  });
}

const requestLifecycleTupleByClass = Object.freeze({
  "bootstrap-document": Object.freeze(["page", "page", "bootstrap", "initial-page-load"]),
  "bootstrap-fetch": Object.freeze(["page", "page", "bootstrap", "bootstrap"]),
  "background-fetch": Object.freeze(["page", "page", "background-refresh", "background-refresh"]),
  "page-subresource": Object.freeze(["page", "page", "page-subresource", "page-subresource"]),
  sse: Object.freeze(["page", "page", "sse", "sse"]),
  websocket: Object.freeze(["page", "page", "websocket", "websocket"]),
  "primary-action": Object.freeze(["action", "explicit-action-registration", "primary-action", "primary-action"]),
  "same-route-form-rejection": Object.freeze(["action", "explicit-action-registration", "primary-action", "primary-action"]),
  "document-redirect-chain": Object.freeze(["page", "document-navigation-ledger", "document-navigation-chain", "document-navigation-chain"]),
  "independent-readback": Object.freeze(["page", "page", "independent-readback", "independent-readback"]),
});

export function classifyRequestLifecycleOwnership({
  requestKind = "", resourceType = "", redirectedFromRequest = null,
  redirectedFromLifecycle = null, navigationInvocation = null,
  actionInvocation = null, phase = "", initialSettlingComplete = false,
  sameRouteFormRejection = false,
} = {}) {
  const kind = String(requestKind || "");
  const type = String(resourceType || "");
  const lifecyclePhase = String(phase || "");
  const redirected = redirectedFromRequest !== null && redirectedFromRequest !== undefined;
  if (redirected) assertOpaque(redirectedFromRequest, "redirectedFrom request");
  if (actionInvocation) {
    assert(initialSettlingComplete === true && !redirected &&
      typeof actionInvocation === "object" && String(actionInvocation.actionId || "") &&
      String(actionInvocation.phase || "") === "primary-action" &&
      lifecyclePhase === "primary-action", "primary action invocation/phase mismatch");
    assert(["document-navigation", "application-fetch"].includes(kind),
      "primary action request kind mismatch");
    if (kind === "document-navigation") {
      assert(type === "document" && isNavigationInvocation(navigationInvocation,
        "form-submit-document-navigation") &&
        String(navigationInvocation.actionId || "") ===
          String(actionInvocation.actionId || ""),
      "primary document action navigation invocation mismatch");
    } else {
      assert(type === "fetch" && !navigationInvocation,
        "primary fetch action resource/invocation mismatch");
      assert(sameRouteFormRejection !== true,
        "same-route form rejection requires a document action");
    }
    return lifecycleBinding(sameRouteFormRejection
      ? "same-route-form-rejection" : "primary-action", {
      actionInvocationId: String(actionInvocation.actionId || ""),
      navigationInvocationId: String(navigationInvocation?.invocationId || ""),
    });
  }
  if (initialSettlingComplete !== true) {
    if (kind === "document-navigation" && type === "document") {
      assert(isNavigationInvocation(navigationInvocation,
        "initial-document-navigation") &&
        lifecyclePhase === "initial-document-navigation",
      "bootstrap document initial invocation mismatch");
      if (redirected) {
        assertRedirectParent(redirectedFromRequest, redirectedFromLifecycle, {
          lifecycleClass: "bootstrap-document",
          navigationInvocationId: String(navigationInvocation.invocationId),
        }, "bootstrap redirect chain");
      } else {
        assert(!redirectedFromLifecycle,
          "bootstrap initial document has stale redirectedFrom lifecycle");
      }
      return lifecycleBinding("bootstrap-document", {
        navigationInvocationId: String(navigationInvocation.invocationId),
      });
    }
    assert(!redirected && !redirectedFromLifecycle,
      "bootstrap fetch carries document redirect state");
    assert(!navigationInvocation || isNavigationInvocation(navigationInvocation,
      "initial-document-navigation"),
    "bootstrap fetch carries a non-initial navigation invocation");
    assert(kind === "application-fetch" && type === "fetch",
      "bootstrap request lifecycle is unclassified");
    return lifecycleBinding("bootstrap-fetch");
  }
  if (redirected) {
    assert(kind === "document-navigation" && type === "document",
      "redirect lifecycle requires a document-navigation/document request");
    assert(lifecyclePhase === "form-submit-document-navigation" &&
      isNavigationInvocation(navigationInvocation, "form-submit-document-navigation") &&
      String(navigationInvocation.actionId || ""),
    "redirect lifecycle action/phase/invocation mismatch");
    assertRedirectParent(redirectedFromRequest, redirectedFromLifecycle, {
      lifecycleClass: "primary-action",
      requestKind: "document-navigation",
      resourceType: "document",
      actionInvocationId: String(navigationInvocation.actionId),
    }, "action redirect chain");
    return lifecycleBinding("document-redirect-chain", {
      actionInvocationId: String(navigationInvocation.actionId),
      navigationInvocationId: String(navigationInvocation.invocationId),
    });
  }
  assert(!redirectedFromLifecycle,
    "non-redirect request carries stale redirectedFrom lifecycle");
  if (lifecyclePhase === "form-submit-document-navigation") {
    throw new Error("document redirect lifecycle is missing redirectedFrom request object");
  }
  if (lifecyclePhase === "independent-readback") {
    assert(kind === "application-fetch" && type === "fetch" && !navigationInvocation,
      "independent readback requires application-fetch/fetch without navigation invocation");
    return lifecycleBinding("independent-readback");
  }
  assert(!navigationInvocation || isAnyNavigationInvocation(navigationInvocation),
  "page-owned request carries invalid navigation invocation");
  if (type === "eventsource") return lifecycleBinding("sse");
  if (type === "websocket") return lifecycleBinding("websocket");
  if (kind === "application-fetch" && type === "fetch") return lifecycleBinding("background-fetch");
  if (kind === "subresource" && type && type !== "document") return lifecycleBinding("page-subresource");
  throw new Error(`page-owned request lifecycle is unclassified: ${kind}/${type}`);
}

export function assertCanonicalRequestLifecycleTuple(value, {
  lifecycleClass = String(value?.lifecycleClass || ""),
} = {}) {
  const expected = requestLifecycleTupleByClass[lifecycleClass];
  assert(expected, `request lifecycle class is invalid: ${lifecycleClass || "(missing)"}`);
  const observed = [String(value?.ledgerOwner || ""), String(value?.sourceOwner || ""),
    String(value?.ownerPhase || ""), String(value?.requestOwnershipKind || "")];
  assert(JSON.stringify(observed) === JSON.stringify(expected),
    `request lifecycle tuple mismatch: ${lifecycleClass}`);
  return true;
}

export function validateRequestLifecycleLedger(entries, {
  primaryActionId = "", primaryCorrelationId = "",
  expectedPrimaryRequestCount = null, expectedPrimaryResponseCount = null,
} = {}) {
  const values = Array.isArray(entries) ? entries : [];
  const starts = values.filter(entry => entry?.phase === "request-start");
  const responses = values.filter(entry => entry?.phase === "response");
  const startObjects = new Set();
  const startById = new Map();
  for (const current of starts) {
    assertCanonicalRequestLifecycleTuple(current);
    assertOpaque(current.requestObject, "request lifecycle request object");
    assert(!startObjects.has(current.requestObject) && !startById.has(current.requestId),
      "duplicate request lifecycle object/identity");
    startObjects.add(current.requestObject);
    startById.set(current.requestId, current);
  }
  const responseIds = new Set();
  for (const current of responses) {
    assertCanonicalRequestLifecycleTuple(current);
    const start = startById.get(current.requestId);
    assert(start && current.responseRequestObjectObserved === true &&
      current.requestIdentitySource === "playwright-response-request" &&
      current.responseRequestObject === start.requestObject,
    "request lifecycle response object identity mismatch");
    const lifecycleIdentityKeys = [
      "lifecycleClass", "ledgerOwner", "sourceOwner", "ownerPhase",
      "requestOwnershipKind", "initiatorActionId", "actionInvocationId",
      "navigationInvocationId", "requestKind", "resourceType",
    ];
    assert(lifecycleIdentityKeys.every(key =>
      String(current[key] || "") === String(start[key] || "")),
    "request lifecycle identity changed between request and response");
    assert(!responseIds.has(current.requestId), "duplicate request lifecycle response");
    responseIds.add(current.requestId);
  }
  const primaryClasses = new Set(["primary-action", "same-route-form-rejection"]);
  const primaryStarts = starts.filter(entry => primaryClasses.has(entry.lifecycleClass));
  const primaryResponses = responses.filter(entry => primaryClasses.has(entry.lifecycleClass));
  if (expectedPrimaryRequestCount !== null) assert(primaryStarts.length === Number(expectedPrimaryRequestCount),
    "primary request lifecycle cardinality mismatch");
  if (expectedPrimaryResponseCount !== null) assert(primaryResponses.length === Number(expectedPrimaryResponseCount),
    "primary response lifecycle cardinality mismatch");
  assert(primaryStarts.concat(primaryResponses).every(entry =>
    !primaryActionId || entry.initiatorActionId === primaryActionId),
  "primary request lifecycle action mismatch");
  const leaks = values.filter(entry => entry.ledgerOwner === "page" &&
    ((primaryActionId && entry.initiatorActionId === primaryActionId) ||
      (primaryCorrelationId && entry.correlationId === primaryCorrelationId)));
  assert(leaks.length === 0, `page-owned action correlation leak: ${leaks.length}`);
  const bootstrapStarts = starts.filter(entry => entry.lifecycleClass === "bootstrap-document");
  assert(bootstrapStarts.every(entry => !entry.initiatorActionId &&
    entry.navigationInvocationId),
  "bootstrap initial document action/invocation binding mismatch");
  const bootstrapRedirectStarts = bootstrapStarts.filter(entry => entry.redirectedFromRequest);
  assert(bootstrapRedirectStarts.every(entry => {
    const parent = starts.find(candidate => candidate.requestObject === entry.redirectedFromRequest);
    return parent?.lifecycleClass === "bootstrap-document" &&
      parent.navigationInvocationId === entry.navigationInvocationId;
  }), "bootstrap redirect lifecycle redirectedFrom invocation mismatch");
  const redirectStarts = starts.filter(entry => entry.lifecycleClass === "document-redirect-chain");
  assert(redirectStarts.every(entry => entry.redirectedFromRequest &&
    startObjects.has(entry.redirectedFromRequest) && entry.actionInvocationId &&
    entry.navigationInvocationId && !entry.initiatorActionId &&
    starts.some(parent => parent.requestObject === entry.redirectedFromRequest &&
      primaryClasses.has(parent.lifecycleClass) &&
      parent.actionInvocationId === entry.actionInvocationId)),
  "redirect lifecycle redirectedFrom object/action invocation mismatch");
  return Object.freeze({
    schema: "media-server.v390-ui-request-lifecycle-ledger-evidence.v1",
    requestCount: starts.length, responseCount: responses.length,
    primaryRequestCount: primaryStarts.length, primaryResponseCount: primaryResponses.length,
    bootstrapInitialDocumentRequestCount: bootstrapStarts.length,
    bootstrapRedirectDestinationRequestCount: bootstrapRedirectStarts.length,
    redirectDestinationRequestCount: redirectStarts.length,
    redirectDestinationPrimaryCardinalityContribution: 0,
    actionCorrelationLeakCount: 0, pass: true,
  });
}

export function buildCanonicalRequestLifecycleTupleCensus(manifest, documentForms) {
  assert(Array.isArray(manifest?.cases), "request lifecycle census manifest missing");
  assert(Array.isArray(documentForms?.rows), "request lifecycle document form census missing");
  const primary = manifest.cases.flatMap(item => (item.actions || []).filter(action =>
    action?.semanticCompletion?.phase === "primary-action"));
  const requestPrimary = primary.filter(action => action.semanticCompletion?.completionMode === "request");
  const readbacks = manifest.cases.flatMap(item => (item.actions || []).filter(action =>
    action?.semanticCompletion?.phase === "independent-readback"));
  const redirects = documentForms.rows.filter(row => Number(row.redirectHops) === 1);
  const sameRoute = documentForms.rows.filter(row => Number(row.redirectHops) === 0);
  assert(primary.length === manifest.cases.length && requestPrimary.length === 391 &&
    documentForms.rows.length === 11 && redirects.length === 9 && sameRoute.length === 2,
  "request lifecycle canonical census cardinality mismatch");
  return Object.freeze({
    schema: "media-server.v390-ui-request-lifecycle-tuple-census.v1",
    canonicalCaseCount: manifest.cases.length, bootstrapDocumentCount: manifest.cases.length,
    requestCompletionCount: requestPrimary.length, primaryActionCount: requestPrimary.length,
    primaryResponseCardinality: `${requestPrimary.length}/${requestPrimary.length}`,
    documentFormCount: documentForms.rows.length,
    documentFormRedirectCount: redirects.length,
    documentFormSameRouteRejectionCount: sameRoute.length,
    independentReadbackCount: readbacks.length,
    redirectDestinationPrimaryCardinalityContribution: 0,
    authoritativeTupleClassCount: Object.keys(requestLifecycleTupleByClass).length,
    invalidClassificationCount: 0,
  });
}

export function classifyPageOwnedRequest({
  initialSettlingComplete = false,
  resourceType = "",
  requestKind = "",
} = {}) {
  return classifyRequestLifecycleOwnership({
    initialSettlingComplete, resourceType, requestKind,
    phase: initialSettlingComplete ? "post-action-observation" : "bootstrap-settling",
  });
}

export function assertZeroActionCorrelationLeaks(entries, {
  actionId = "",
  correlationId = "",
} = {}) {
  const values = Array.isArray(entries) ? entries : [];
  const registeredIndependentReadbacks = values.filter(entry =>
    entry?.ledgerOwner === "page" &&
    entry.exactActionRequestOwned === true &&
    String(entry.ownerPhase || "") === "independent-readback" &&
    String(entry.requestOwnershipKind || "") === "independent-readback" &&
    String(entry.initiatorActionId || "") === String(actionId || "") &&
    Boolean(correlationId) &&
    String(entry.correlationId || "") === String(correlationId));
  const registeredIndependentReadbackSet = new Set(registeredIndependentReadbacks);
  const leaks = values.filter(entry => entry?.ledgerOwner === "page" &&
    !registeredIndependentReadbackSet.has(entry) &&
    (String(entry.initiatorActionId || "") === String(actionId || "") ||
      (correlationId && String(entry.correlationId || "") === String(correlationId))));
  assert(leaks.length === 0,
    `page-owned action correlation leak count mismatch: ${leaks.length}`);
  return Object.freeze({
    schema: "media-server.v390-ui-action-correlation-leak-evidence.v1",
    actionId: String(actionId || ""),
    correlationId: String(correlationId || ""),
    pageOwnedEntryCount: values.filter(entry => entry?.ledgerOwner === "page").length,
    registeredIndependentReadbackEntryCount: registeredIndependentReadbacks.length,
    actionCorrelationLeakCount: 0,
    pass: true,
  });
}

export function normalizeRequestTarget(value) {
  const text = String(value || "");
  if (!text) return "";
  try {
    const url = new URL(text, "http://runtime.invalid");
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function assertOpaque(value, label) {
  assert((typeof value === "object" || typeof value === "function") && value !== null,
    `${label} must be an opaque object`);
}

function isNavigationInvocation(value, kind) {
  return Boolean(value && typeof value === "object" &&
    String(value.invocationId || "") && String(value.kind || "") === kind);
}

function isAnyNavigationInvocation(value) {
  return Boolean(value && typeof value === "object" &&
    String(value.invocationId || "") && String(value.kind || ""));
}

function assertRedirectParent(request, parent, expected, label) {
  assert(parent && typeof parent === "object" && parent.requestObject === request,
    `${label} redirectedFrom object mismatch`);
  for (const [key, value] of Object.entries(expected)) {
    const observed = key === "actionInvocationId"
      ? String(parent.actionInvocationId || parent.initiatorActionId || "")
      : String(parent[key] || "");
    assert(observed === String(value), `${label} parent ${key} mismatch`);
  }
}

function lifecycleBinding(lifecycleClass, {
  actionInvocationId = "", navigationInvocationId = "",
} = {}) {
  const values = requestLifecycleTupleByClass[lifecycleClass];
  assert(values, `request lifecycle class is invalid: ${lifecycleClass}`);
  return Object.freeze({
    lifecycleClass, ledgerOwner: values[0], sourceOwner: values[1],
    ownerPhase: values[2], requestOwnershipKind: values[3],
    initiatorActionId: "", actionInvocationId: String(actionInvocationId || ""),
    navigationInvocationId: String(navigationInvocationId || ""), correlationId: "",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
