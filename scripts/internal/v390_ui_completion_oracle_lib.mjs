// 파일 용도: trusted UI action의 상관된 completion evidence를 판정하고 no-op false-PASS를 차단한다.

import crypto from "node:crypto";

export const allowedCompletionSources = [
  "endpoint-dom",
  "navigation-network-dom",
  "negative-route-status",
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
    semanticReadback,
    expectedEndpoint: action?.expectedEndpoint || null,
  };
  if (!action?.executed) return { ...base, reason: "action-not-executed" };
  if (action.dispatch !== "playwright-native") return { ...base, reason: "untrusted-action-dispatch" };

  if (action.kind === "navigate" || action.kind === "navigate-negative") {
    if (!navigation || !allowedStatuses.includes(Number(navigation.status))) {
      return { ...base, reason: "navigation-status-mismatch" };
    }
    if (action.kind === "navigate-negative") {
      if (action.semanticCompletionRequired && !matchesCorrelatedEndpoint(base.networkResponses, action)) {
        return { ...base, reason: "request-correlation-missing" };
      }
      return { ...base, pass: true, source: "negative-route-status", reason: "" };
    }
    if (!hasVisibleDom(after)) return { ...base, reason: "navigation-dom-missing" };
    if (action.semanticCompletionRequired) {
      if (!matchesSemanticReadback(semanticReadback, action)) {
        return { ...base, reason: "semantic-readback-mismatch" };
      }
      if (!matchesCorrelatedEndpoint(base.networkResponses, action)) {
        return { ...base, reason: "request-correlation-missing" };
      }
      return allowedResult(base, action, "endpoint-dom");
    }
    return { ...base, pass: true, source: "navigation-network-dom", reason: "" };
  }

  const actualKind = action.executedKind || action.kind;
  if (action.semanticCompletionRequired) {
    if (!matchesSemanticReadback(semanticReadback, action)) {
      return { ...base, reason: "semantic-readback-mismatch" };
    }
    if (matchesCorrelatedEndpoint(base.networkResponses, action)) {
      return allowedResult(base, action, "endpoint-dom");
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

function allowedResult(base, action, source) {
  const allowed = Array.isArray(action.allowedCompletionSources) ? action.allowedCompletionSources : [];
  if (allowed.length > 0 && !allowed.includes(source)) {
    return { ...base, reason: "completion-source-not-allowed" };
  }
  return { ...base, pass: true, source, reason: "" };
}

function matchesSemanticReadback(value, action) {
  return Boolean(
    value?.schema === "media-server.v390-ui-semantic-readback.v1" &&
    action.expectedReadbackIdentity &&
    value.identity === action.expectedReadbackIdentity &&
    value.correlationId === action.correlationId &&
    value.expected !== undefined &&
    stableStringify(value.expected) === stableStringify(value.observed),
  );
}

function matchesCorrelatedEndpoint(entries, action) {
  const expected = action.expectedEndpoint;
  if (!expected || !Array.isArray(entries)) return false;
  return entries.some(item =>
    item?.correlationSource === "request-header" &&
    item?.correlationId === expected.correlationId &&
    typeof item?.requestId === "string" && item.requestId &&
    String(item.method || "").toUpperCase() === String(expected.method || "GET").toUpperCase() &&
    Number(item.status) >= 200 && Number(item.status) < 600 &&
    (expected.allowedStatuses || [200]).includes(Number(item.status)) &&
    endpointUrlMatches(item.url, expected),
  );
}

function endpointUrlMatches(rawUrl, expected) {
  if (expected.urlPath) {
    try {
      return new URL(String(rawUrl), "http://localhost").pathname === expected.urlPath;
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
