// 파일 용도: producer/runner PASS를 입력으로 쓰지 않고 raw native case를 Policy v4 기준으로 판정한다.

import crypto from "node:crypto";

const traceSchema = "media-server.v390-ui-native-interaction-trace.v2";
const observationSchema = "media-server.v390-ui-raw-primary-observation.v1";

export function qualifyRawCase({ trace, requested, observed, canonicalCase, nativeCase }) {
  const reasons = [];
  const expected = nativeCase?.workflow?.expectedResults?.[0]?.completion;
  if (trace?.schema !== traceSchema) reasons.push("raw-trace-schema-mismatch");
  if (trace?.caseId !== nativeCase?.caseId || trace?.caseId !== canonicalCase?.testId) reasons.push("raw-case-id-mismatch");
  if (trace?.featureId !== nativeCase?.featureId || trace?.featureId !== canonicalCase?.featureId) reasons.push("raw-feature-id-mismatch");

  if (!same(trace?.requested, requested)) reasons.push("raw-requested-summary-mismatch");
  if (!same(trace?.observed, observed)) reasons.push("raw-observed-summary-mismatch");
  validateRequested(requested, canonicalCase, nativeCase, reasons);
  validateObserved(observed, nativeCase, reasons);
  if (!expected || expected.phase !== "primary-action") {
    reasons.push("raw-primary-completion-contract-missing");
    return finish(reasons, null);
  }

  const actions = Array.isArray(trace?.actions) ? trace.actions : [];
  const primaryIndexes = actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action?.actionId === expected.actionId);
  if (primaryIndexes.length !== 1) reasons.push("raw-primary-action-count-mismatch");
  const readbackIndexes = actions
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action?.kind === "verify-independent-readback" &&
      action?.linkedPrimaryActionId === expected.actionId);
  if (nativeCase?.disposition !== "negative-route" && readbackIndexes.length !== 1) {
    reasons.push("raw-independent-readback-action-count-mismatch");
  }
  if (primaryIndexes.length === 1 && readbackIndexes.length === 1 &&
      readbackIndexes[0].index <= primaryIndexes[0].index) {
    reasons.push("raw-independent-readback-order-invalid");
  }

  const observations = (Array.isArray(trace?.rawPrimaryObservations) ? trace.rawPrimaryObservations : [])
    .filter(item => item?.action?.actionId === expected.actionId);
  if (observations.length !== 1) {
    reasons.push("raw-primary-observation-count-mismatch");
    return finish(reasons, null);
  }
  const value = observations[0];
  if (value.schema !== observationSchema) reasons.push("raw-primary-observation-schema-mismatch");
  const action = value.action || {};
  if (action.actionId !== expected.actionId) reasons.push("raw-primary-action-id-mismatch");
  if (action.actionKind !== expected.actionKind) reasons.push("raw-primary-action-kind-mismatch");
  if (action.controlSelector !== expected.controlSelector) reasons.push("raw-primary-control-selector-mismatch");
  if (action.correlationId !== expected.correlationId) reasons.push("raw-primary-correlation-mismatch");
  if (action.dispatch !== "playwright-native") reasons.push("raw-primary-dispatch-untrusted");
  if (expected.controlSelector !== null) {
    if (value.before?.selector !== expected.controlSelector || value.after?.selector !== expected.controlSelector) {
      reasons.push("raw-primary-snapshot-selector-mismatch");
    }
    if (value.before?.exists !== true || value.before?.visible !== true) {
      reasons.push("raw-primary-control-not-visible");
    }
  }

  const request = qualifyRequest(value, expected, reasons);
  qualifyReadback(value, expected, reasons);
  qualifyLocalTransition(value, expected, reasons);
  if (nativeCase?.disposition === "negative-route") qualifyNegativeNavigation(value, expected, reasons);

  return finish(reasons, {
    actionId: expected.actionId,
    actionKind: expected.actionKind,
    controlSelector: expected.controlSelector,
    correlationId: expected.correlationId,
    request,
  });
}

function validateRequested(value, canonicalCase, nativeCase, reasons) {
  if (!isExactObject(value, ["schema", "route", "accountRole", "viewport", "theme", "controlAction"])) {
    reasons.push("raw-requested-fields-mismatch");
    return;
  }
  if (!same(value, nativeCase?.requestedProjection)) reasons.push("raw-requested-native-contract-mismatch");
  if (value.route !== canonicalCase?.route || value.accountRole !== canonicalCase?.accountRole ||
      !same(value.viewport, canonicalCase?.viewport) || value.theme !== canonicalCase?.theme ||
      !same(value.controlAction, canonicalCase?.controlAction)) {
    reasons.push("raw-requested-canonical-contract-mismatch");
  }
}

function validateObserved(value, nativeCase, reasons) {
  if (!isExactObject(value, ["schema", "screenRoute", "accountRole", "viewport", "theme", "controlAction", "provenance"])) {
    reasons.push("raw-observed-fields-mismatch");
    return;
  }
  if (!same(value, nativeCase?.observedProjection)) reasons.push("raw-observed-native-contract-mismatch");
  const expectedProvenance = {
    screenRoute: "browser-location",
    accountRole: "session-whoami",
    viewport: "browser-inner-size",
    theme: "browser-media-query",
    controlAction: "dom-selector-state",
  };
  if (!same(value.provenance, expectedProvenance)) reasons.push("raw-observed-provenance-mismatch");
}

function qualifyRequest(value, expected, reasons) {
  if (!expected.request) return null;
  const entries = Array.isArray(value.networkEntries) ? value.networkEntries : [];
  const starts = entries.filter(entry => entry?.phase === "request-start" &&
    entry?.correlationId === expected.correlationId);
  const responses = entries.filter(entry => entry?.phase === "response" &&
    entry?.correlationId === expected.correlationId);
  if (starts.length !== 1 || responses.length !== 1) {
    reasons.push(starts.length > 1 || responses.length > 1
      ? "raw-primary-request-ambiguous"
      : "raw-primary-request-pair-missing");
    return null;
  }
  const start = starts[0];
  const response = responses[0];
  if (!start.requestId || start.requestId !== response.requestId) reasons.push("raw-primary-request-id-mismatch");
  if (start.correlationSource !== "request-header" || response.correlationSource !== "request-header") {
    reasons.push("raw-primary-request-correlation-source-mismatch");
  }
  if (upper(start.method) !== expected.request.method || upper(response.method) !== expected.request.method) {
    reasons.push("raw-primary-request-method-mismatch");
  }
  if (requestTarget(start.url) !== expected.request.urlPath ||
      requestTarget(response.url) !== expected.request.urlPath) {
    reasons.push("raw-primary-request-path-mismatch");
  }
  if (!expected.request.allowedStatuses.includes(Number(response.status))) reasons.push("raw-primary-request-status-mismatch");
  return {
    requestId: start.requestId,
    method: upper(start.method),
    urlPath: requestTarget(start.url),
    status: Number(response.status),
  };
}

function qualifyReadback(value, expected, reasons) {
  const readback = value.semanticReadback;
  if (!readback || readback.schema !== "media-server.v390-ui-semantic-readback.v2") {
    reasons.push("raw-primary-readback-missing");
    return;
  }
  if (readback.identity !== expected.readbackIdentity) reasons.push("raw-primary-readback-identity-mismatch");
  if (readback.actionId !== expected.actionId || readback.correlationId !== expected.correlationId) {
    reasons.push("raw-primary-readback-action-correlation-mismatch");
  }
  if (readback.expectedBehaviorSha256 !== expected.expectedBehaviorSha256 ||
      !/^[a-f0-9]{64}$/.test(String(readback.expectedBehaviorSha256 || ""))) {
    reasons.push("raw-primary-readback-behavior-digest-mismatch");
  }
  if (!["browser-dom", "readback-request", "event-record", "server-log"].includes(readback.observationSource)) {
    reasons.push("raw-primary-readback-source-untrusted");
  }
  if (readback.observationSource === "browser-dom" && readback.selector !== expected.controlSelector) {
    reasons.push("raw-primary-readback-selector-mismatch");
  }
  if (!evaluateExpectation(expected.readbackExpectation, readback.observation)) {
    reasons.push("raw-primary-readback-observation-mismatch");
  }
  if (readback.observationSha256 !== undefined &&
      readback.observationSha256 !== digest(readback.observation)) {
    reasons.push("raw-primary-readback-observation-digest-mismatch");
  }
}

function qualifyLocalTransition(value, expected, reasons) {
  const transition = expected.localTransition;
  if (!transition) return;
  if (transition.selector !== expected.controlSelector ||
      value.before?.selector !== transition.selector || value.after?.selector !== transition.selector) {
    reasons.push("raw-primary-local-transition-selector-mismatch");
    return;
  }
  if (transition.property && same(value.before?.[transition.property], value.after?.[transition.property])) {
    reasons.push("raw-primary-local-transition-not-observed");
  }
  for (const forbidden of transition.forbiddenRequests || []) {
    if ((value.networkEntries || []).some(entry => entry?.phase === "request-start" &&
        (forbidden.methods || []).includes(upper(entry.method)) && pathname(entry.url).startsWith(forbidden.pathPrefix))) {
      reasons.push("raw-primary-forbidden-request-observed");
    }
  }
}

function qualifyNegativeNavigation(value, expected, reasons) {
  if (!expected.navigationBinding?.allowedStatuses?.includes(Number(value.navigation?.status))) {
    reasons.push("raw-primary-negative-navigation-status-mismatch");
  }
}

function evaluateExpectation(expected, observation) {
  if (!expected || typeof expected !== "object" || !observation || typeof observation !== "object") return false;
  const before = observation.before || null;
  const after = observation.after || observation.actual || null;
  if (expected.changedProperty) {
    return expected.changed === true && before && after && !same(before[expected.changedProperty], after[expected.changedProperty]);
  }
  if (expected.property) return after && same(after[expected.property], expected.value);
  if (expected.hrefKind) return after?.tag === expected.tag && expected.hrefKind === "same-origin-path" && String(after?.href || "").startsWith("/");
  if (expected.minimumNonEmptyOptions !== undefined) {
    return after?.tag === expected.tag && Number(after?.nonEmptyOptionCount ?? after?.optionValues?.filter(Boolean)?.length ?? 0) >= Number(expected.minimumNonEmptyOptions);
  }
  if (Array.isArray(expected.postconditions) && expected.postconditions.length > 0) {
    const beforeSnapshots = observation.beforeSnapshots || {};
    const snapshots = observation.snapshots || {};
    return expected.postconditions.every(condition => matchesCondition(snapshots[condition.selector], condition)) &&
      expected.postconditions.some(condition => !matchesCondition(beforeSnapshots[condition.selector], condition));
  }
  if (expected.navigationStatus !== undefined) return Number(observation.navigation?.status) === Number(expected.navigationStatus);
  const actual = after || observation.actual || observation;
  return Object.entries(expected).every(([key, value]) => same(actual?.[key], value));
}

function matchesCondition(snapshot, condition) {
  if (!snapshot || snapshot.selector !== condition.selector) return false;
  const actual = snapshot[condition.property];
  if (condition.operator === "equals") return same(actual, condition.value);
  if (condition.operator === "includes") return String(actual || "").includes(String(condition.value));
  if (condition.operator === "startsWith") return String(actual || "").startsWith(String(condition.value));
  if (condition.operator === "in") return Array.isArray(condition.values) && condition.values.includes(actual);
  return false;
}

function finish(reasons, derived) {
  const unique = [...new Set(reasons)];
  return { qualified: unique.length === 0, reasons: unique, derived };
}

function isExactObject(value, fields) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    same(Object.keys(value).sort(), [...fields].sort()));
}

function digest(value) {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function same(left, right) {
  return stable(left) === stable(right);
}

function upper(value) {
  return String(value || "").toUpperCase();
}

function pathname(value) {
  try {
    return new URL(String(value || ""), "http://localhost").pathname;
  } catch {
    return "";
  }
}

function requestTarget(value) {
  try {
    const parsed = new URL(String(value || ""), "http://localhost");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}
