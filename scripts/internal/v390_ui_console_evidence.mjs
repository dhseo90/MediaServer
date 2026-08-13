// 파일 용도: browser console resource 오류를 exact Playwright response와 source contract에 결속한다.

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";

export const consoleResponseBindingSchema = "media-server.v390-ui-console-response-binding.v1";
export const consoleApprovalSchema = "media-server.v390-ui-console-approval.v1";
export const consoleCensusSchema = "media-server.v390-ui-console-census.v1";

const resourceErrorPattern = /^Failed to load resource: the server responded with a status of ([0-9]{3}) \([^)]+\)$/;
const severeLevels = new Set(["error", "warning", "warn"]);

export function bindBrowserConsoleResponseMessages(messages, networkEntries) {
  const consumed = new Set();
  const responses = (networkEntries || []).filter(entry => entry?.phase === "response" &&
    entry.sameOrigin === true && entry.responseRequestObjectObserved === true);
  return (messages || []).map(message => {
    const value = structuredClone(message);
    const status = resourceConsoleStatus(value);
    const locationUrl = String(value.location?.url || "");
    if (status === null || !locationUrl) return value;
    const candidates = responses.filter(entry => !consumed.has(responseIdentity(entry)) &&
      Number(entry.status) === status && String(entry.url || "") === locationUrl &&
      Number(entry.responseObservedAtMs || 0) <= Number(value.observedAtMs || Number.MAX_SAFE_INTEGER));
    const latestAt = Math.max(...candidates.map(entry => Number(entry.responseObservedAtMs || 0)), -1);
    const nearest = candidates.filter(entry => Number(entry.responseObservedAtMs || 0) === latestAt);
    value.responseBindingCandidateCount = nearest.length;
    if (nearest.length !== 1) {
      value.responseBinding = null;
      return value;
    }
    const response = nearest[0];
    consumed.add(responseIdentity(response));
    value.responseBinding = responseBinding(response);
    return value;
  });
}

export function qualifyBrowserConsoleMessages({ messages, trace, nativeCase }) {
  const traceResponses = collectTraceResponses(trace);
  let unapprovedConsoleMessages = 0;
  const qualifiedMessages = (messages || []).map(message => {
    const value = structuredClone(message);
    if (!severeLevels.has(String(value.level || ""))) return value;
    const reason = validateConsoleMessage(value, traceResponses, nativeCase);
    if (reason) {
      unapprovedConsoleMessages += 1;
      value.approval = { schema: consoleApprovalSchema, status: "UNAPPROVED", reason };
      return value;
    }
    value.approval = {
      schema: consoleApprovalSchema,
      status: "APPROVED",
      contractKind: sourceContractKind(value.responseBinding, nativeCase),
      responseIdentity: responseIdentity(value.responseBinding),
    };
    return value;
  });
  return {
    messages: qualifiedMessages,
    unapprovedConsoleMessages,
    census: buildBrowserConsoleCensus(qualifiedMessages, nativeCase?.caseId || ""),
  };
}

export function buildBrowserConsoleCensus(messages, caseId = "") {
  const groups = new Map();
  for (const message of messages || []) {
    const entry = {
      messageClass: consoleMessageClass(message),
      callsite: consoleCallsite(message),
      phase: String(message?.phase || "unowned"),
      caseId: String(message?.caseId || caseId || ""),
      actionId: String(message?.actionId || ""),
      approvalStatus: String(message?.approval?.status || "NOT-APPLICABLE"),
    };
    const key = JSON.stringify(entry);
    groups.set(key, { ...entry, count: (groups.get(key)?.count || 0) + 1 });
  }
  const entries = [...groups.values()].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    schema: consoleCensusSchema,
    messageCount: (messages || []).length,
    severeMessageCount: (messages || []).filter(message =>
      severeLevels.has(String(message?.level || ""))).length,
    unapprovedMessageCount: (messages || []).filter(message =>
      message?.approval?.status === "UNAPPROVED").length,
    entries,
  };
}

function validateConsoleMessage(message, traceResponses, nativeCase) {
  if (message.secretBearing === true) return "console-secret-bearing-message";
  if (message.kind !== "console") return "console-message-not-resource-console";
  if (resourceConsoleStatus(message) === null) return "console-message-pattern-unapproved";
  const binding = message.responseBinding;
  if (message.responseBindingCandidateCount !== 1 || binding?.schema !== consoleResponseBindingSchema) {
    return "console-response-binding-not-exact";
  }
  if (binding.responseRequestObjectObserved !== true ||
      binding.requestIdentitySource !== "playwright-response-request" ||
      !binding.requestId || !binding.caseRequestIdentity || !Number.isInteger(binding.caseRequestSequence)) {
    return "console-response-object-identity-invalid";
  }
  if (resourceConsoleStatus(message) !== Number(binding.status) ||
      String(message.location?.url || "") !== String(binding.url || "")) {
    return "console-response-location-status-mismatch";
  }
  const exact = traceResponses.filter(response => responseMatchesBinding(response, binding));
  if (exact.length !== 1) return "console-response-trace-identity-mismatch";
  if (message.caseId !== nativeCase?.caseId) return "console-message-case-binding-mismatch";
  return sourceContractKind(binding, nativeCase) ? "" : "console-response-source-contract-unapproved";
}

function sourceContractKind(binding, nativeCase) {
  const method = String(binding?.method || "");
  const path = String(binding?.path || urlTarget(binding?.url || ""));
  const status = Number(binding?.status || 0);
  const completionRequest = nativeCase?.workflow?.expectedResults?.[0]?.completion?.request;
  if (completionRequest && method === completionRequest.method && path === completionRequest.urlPath &&
      completionRequest.allowedStatuses?.includes(status) &&
      binding.initiatorActionId === nativeCase?.workflow?.expectedResults?.[0]?.completion?.actionId &&
      binding.requestOwnershipKind === "primary-action") {
    return "primary-completion-response";
  }
  if (nativeCase?.accountRole === "anonymous" && method === "GET" && path === "/auth/whoami" && status === 401 &&
      ["bootstrap", "background-refresh"].includes(binding.requestOwnershipKind) &&
      !binding.initiatorActionId) {
    return "anonymous-whoami-unauthorized";
  }
  if (nativeCase?.accountRole === "operator" && method === "GET" && path === "/ops/api/users" && status === 403 &&
      ["bootstrap", "background-refresh"].includes(binding.requestOwnershipKind) &&
      !binding.initiatorActionId) {
    return "operator-users-page-load-forbidden";
  }
  const navigation = nativeCase?.workflow?.expectedResults?.[0]?.completion?.navigationBinding;
  if (navigation && binding.requestKind === "document-navigation" && method === navigation.method &&
      path === navigation.requestedPath && navigation.allowedStatuses?.includes(status) &&
      binding.requestOwnershipKind === "initial-page-load" && !binding.initiatorActionId) {
    return "canonical-document-navigation-response";
  }
  const runtimeRequests = exactRuntimeOracleFor(nativeCase?.caseId)?.requests || [];
  const runtimeMatches = runtimeRequests.filter(request =>
    method === String(request?.method || "") &&
    runtimeTemplateMatches(request?.path, path) &&
    (request?.allowedStatuses || request?.statuses || [200]).includes(status));
  if (runtimeMatches.length === 1 && binding.requestKind === "application-fetch" &&
      binding.requestOwnershipKind === "independent-readback" &&
      binding.initiatorActionId === nativeCase?.workflow?.expectedResults?.[0]?.completion?.actionId) {
    return "exact-runtime-independent-readback-response";
  }
  return "";
}

function consoleMessageClass(message) {
  if (message?.kind === "pageerror") return "pageerror";
  const status = resourceConsoleStatus(message);
  if (status !== null) return `resource-http-${status}`;
  return `${String(message?.kind || "unknown")}:${String(message?.level || "unknown")}`;
}

function consoleCallsite(message) {
  const location = message?.location || {};
  if (location.url) {
    return `${String(location.url)}:${Number(location.lineNumber || 0)}:${Number(location.columnNumber || 0)}`;
  }
  return String(message?.callsite || "unavailable");
}

function collectTraceResponses(trace) {
  const values = [];
  values.push(...(trace?.pageOwnedRequestLedger || []).filter(entry => entry?.phase === "response"));
  for (const event of trace?.completionEvents || []) values.push(...(event.networkResponses || []));
  for (const observation of trace?.rawPrimaryObservations || []) {
    values.push(...(observation.networkEntries || []).filter(entry => entry?.phase === "response"));
  }
  const unique = new Map();
  for (const value of values) unique.set(responseIdentity(value), value);
  return [...unique.values()];
}

function runtimeTemplateMatches(template, actual) {
  const escaped = String(template || "")
    .split(/(\{[^/{}]+\})/g)
    .map(part => /^\{[^/{}]+\}$/.test(part)
      ? "[^/?&#]+"
      : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("");
  return escaped.length > 0 && new RegExp(`^${escaped}$`).test(String(actual || ""));
}

function responseMatchesBinding(response, binding) {
  return responseIdentity(response) === responseIdentity(binding) &&
    response.responseRequestObjectObserved === true &&
    response.requestIdentitySource === "playwright-response-request" &&
    String(response.method || "") === String(binding.method || "") &&
    Number(response.status || 0) === Number(binding.status || 0) &&
    String(response.url || "") === String(binding.url || "");
}

function responseBinding(response) {
  return {
    schema: consoleResponseBindingSchema,
    requestId: String(response.requestId || ""),
    caseRequestIdentity: String(response.caseRequestIdentity || ""),
    caseRequestSequence: response.caseRequestSequence,
    responseRequestObjectObserved: response.responseRequestObjectObserved === true,
    requestIdentitySource: String(response.requestIdentitySource || ""),
    requestKind: String(response.requestKind || ""),
    requestOwnershipKind: String(response.requestOwnershipKind || ""),
    initiatorActionId: String(response.initiatorActionId || ""),
    sameOrigin: response.sameOrigin === true,
    method: String(response.method || ""),
    status: Number(response.status || 0),
    url: String(response.url || ""),
    path: urlTarget(response.url || ""),
  };
}

function resourceConsoleStatus(message) {
  if (message?.kind !== "console" || message?.level !== "error") return null;
  const match = String(message.text || "").match(resourceErrorPattern);
  return match ? Number(match[1]) : null;
}

function responseIdentity(response) {
  return [String(response?.requestId || ""), String(response?.caseRequestIdentity || ""),
    String(response?.caseRequestSequence ?? "")].join("|");
}

function urlTarget(value) {
  try {
    const url = new URL(String(value));
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}
