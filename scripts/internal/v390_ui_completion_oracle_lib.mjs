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

export function domSnapshotDigest(snapshot) {
  if (snapshot === null || snapshot === undefined) return "";
  return crypto.createHash("sha256").update(stableStringify(snapshot)).digest("hex");
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

  if (action.kind === "navigate" || action.kind === "navigate-negative") {
    if (!navigation || !allowedStatuses.includes(Number(navigation.status))) {
      return { ...base, reason: "navigation-status-mismatch" };
    }
    if (action.kind === "navigate-negative") {
      const requestMatch = action.semanticCompletionRequired
        ? findCorrelatedEndpoint(base.networkResponses, action)
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
      const requestMatch = findCorrelatedEndpoint(base.networkResponses, action);
      if (!requestMatch.match) {
        return { ...base, reason: requestMatch.reason };
      }
      return allowedResult(base, action, "endpoint-dom", { completionRequest: requestMatch.match });
    }
    return { ...base, pass: true, source: "navigation-network-dom", reason: "" };
  }

  const actualKind = action.executedKind || action.kind;
  if (action.semanticCompletionRequired) {
    const readbackReason = validateSemanticReadback(semanticReadback, action, actionBound);
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
      const requestMatch = findCorrelatedEndpoint(base.networkResponses, action);
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
    const requestMatch = findCorrelatedEndpoint(base.networkResponses, action);
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
    return afterMatches && transitioned;
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

function findCorrelatedEndpoint(entries, action) {
  const expected = action.expectedEndpoint;
  if (!expected || !Array.isArray(entries)) return { match: null, reason: "request-correlation-missing" };
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
