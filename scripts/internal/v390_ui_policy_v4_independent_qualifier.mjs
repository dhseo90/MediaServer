// 파일 용도: producer/runner PASS를 입력으로 쓰지 않고 raw native case를 Policy v4 기준으로 판정한다.

import crypto from "node:crypto";

import { evaluateSemanticExpectation } from "./v390_ui_completion_oracle_lib.mjs";

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
  const negativeWorkflow = nativeCase?.disposition === "negative-route" ||
    nativeCase?.workflow?.workflowClass === "negative-route";
  if (!negativeWorkflow && readbackIndexes.length !== 1) {
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
    const executionOwnerSelector = action.executionOwnerSelector || expected.controlSelector;
    if (value.before?.selector !== executionOwnerSelector || value.after?.selector !== executionOwnerSelector) {
      reasons.push("raw-primary-snapshot-selector-mismatch");
    }
    const expectedVisible = expected.readbackExpectation?.visible;
    if (value.before?.exists !== true ||
        (expectedVisible === true && value.before?.visible !== true) ||
        (expectedVisible === false && value.before?.visible !== false)) {
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
  if (value.requestBinding?.schema === "media-server.v390-ui-document-form-submit-binding.v1") {
    return qualifyDocumentFormRequest(value.requestBinding, entries, expected, reasons);
  }
  const starts = entries.filter(entry => entry?.phase === "request-start" &&
    entry?.correlationId === expected.correlationId &&
    upper(entry?.method) === expected.request.method &&
    requestTarget(entry?.url) === expected.request.urlPath);
  const responses = entries.filter(entry => entry?.phase === "response" &&
    entry?.correlationId === expected.correlationId &&
    upper(entry?.method) === expected.request.method &&
    requestTarget(entry?.url) === expected.request.urlPath);
  if (starts.length !== 1 || responses.length !== 1) {
    reasons.push(starts.length > 1 || responses.length > 1
      ? "raw-primary-request-ambiguous"
      : "raw-primary-request-pair-missing");
    return null;
  }
  const start = starts[0];
  const response = responses[0];
  if (!start.requestId || start.requestId !== response.requestId) reasons.push("raw-primary-request-id-mismatch");
  if (!start.caseRequestIdentity || start.caseRequestIdentity !== response.caseRequestIdentity ||
      !Number.isInteger(start.caseRequestSequence) || start.caseRequestSequence !== response.caseRequestSequence ||
      response.responseRequestObjectObserved !== true ||
      response.requestIdentitySource !== "playwright-response-request") {
    reasons.push("raw-primary-request-response-object-identity-mismatch");
  }
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
    caseRequestIdentity: start.caseRequestIdentity,
    caseRequestSequence: start.caseRequestSequence,
    method: upper(start.method),
    urlPath: requestTarget(start.url),
    status: Number(response.status),
  };
}

function qualifyDocumentFormRequest(binding, entries, expected, reasons) {
  const starts = entries.filter(entry => entry?.phase === "request-start" &&
    entry?.requestId === binding.requestId);
  const responses = entries.filter(entry => entry?.phase === "response" &&
    entry?.requestId === binding.requestId);
  if (starts.length !== 1 || responses.length !== 1) {
    reasons.push(starts.length > 1 || responses.length > 1
      ? "raw-primary-request-ambiguous"
      : "raw-primary-request-pair-missing");
    return null;
  }
  const start = starts[0];
  const response = responses[0];
  const exactIdentity = Boolean(binding.requestId &&
    binding.caseRequestIdentity === start.caseRequestIdentity &&
    binding.caseRequestIdentity === response.caseRequestIdentity &&
    Number.isInteger(binding.caseRequestSequence) &&
    binding.caseRequestSequence === start.caseRequestSequence &&
    binding.caseRequestSequence === response.caseRequestSequence &&
    response.responseRequestObjectObserved === true &&
    response.requestIdentitySource === "playwright-response-request");
  if (!exactIdentity) reasons.push("raw-primary-request-response-object-identity-mismatch");
  if (binding.method !== expected.request.method || upper(start.method) !== expected.request.method ||
      upper(response.method) !== expected.request.method) reasons.push("raw-primary-request-method-mismatch");
  if (binding.path !== expected.request.urlPath || requestTarget(start.url) !== expected.request.urlPath ||
      requestTarget(response.url) !== expected.request.urlPath) reasons.push("raw-primary-request-path-mismatch");
  if (binding.status !== Number(response.status) ||
      !expected.request.allowedStatuses.includes(Number(response.status))) {
    reasons.push("raw-primary-request-status-mismatch");
  }
  if (binding.requestKind !== "document-navigation" || binding.resourceType !== "document" ||
      binding.sameOrigin !== true || binding.correlationObserved !== false ||
      start.correlationId || response.correlationId || binding.responseRequestObjectObserved !== true ||
      binding.requestAttemptCount !== 1 || binding.responseCandidateCount !== 1 || binding.reissueCount !== 0) {
    reasons.push("raw-primary-document-form-request-binding-invalid");
  }
  return {
    requestId: binding.requestId,
    caseRequestIdentity: binding.caseRequestIdentity,
    caseRequestSequence: binding.caseRequestSequence,
    method: binding.method,
    urlPath: binding.path,
    status: binding.status,
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
  if (!evaluateSemanticExpectation(expected.readbackExpectation, readback.observation)) {
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
