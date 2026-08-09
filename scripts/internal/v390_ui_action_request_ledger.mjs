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
  const target = normalizeRequestTarget(request.urlPath || request.path || "");
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
        normalizeRequestTarget(target) === envelope.target &&
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
        target: envelope.target,
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
        normalizeRequestTarget(response.target || response.url || "") === envelope.target,
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

export function classifyPageOwnedRequest({
  initialSettlingComplete = false,
  resourceType = "",
  requestKind = "",
} = {}) {
  const type = String(resourceType || "");
  const kind = String(requestKind || "");
  const ownerPhase = !initialSettlingComplete
    ? "bootstrap"
    : (type === "eventsource"
        ? "sse"
        : (type === "websocket"
            ? "websocket"
            : (kind === "application-fetch" ? "background-refresh" : "page-subresource")));
  return Object.freeze({
    ledgerOwner: "page",
    sourceOwner: "page",
    ownerPhase,
    initiatorActionId: "",
    requestOwnershipKind: "",
    correlationId: "",
  });
}

export function assertZeroActionCorrelationLeaks(entries, {
  actionId = "",
  correlationId = "",
} = {}) {
  const values = Array.isArray(entries) ? entries : [];
  const leaks = values.filter(entry => entry?.ledgerOwner === "page" &&
    (String(entry.initiatorActionId || "") === String(actionId || "") ||
      (correlationId && String(entry.correlationId || "") === String(correlationId))));
  assert(leaks.length === 0,
    `page-owned action correlation leak count mismatch: ${leaks.length}`);
  return Object.freeze({
    schema: "media-server.v390-ui-action-correlation-leak-evidence.v1",
    actionId: String(actionId || ""),
    correlationId: String(correlationId || ""),
    pageOwnedEntryCount: values.filter(entry => entry?.ledgerOwner === "page").length,
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
