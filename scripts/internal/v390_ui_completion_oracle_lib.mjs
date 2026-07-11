// 파일 용도: trusted UI action의 상관된 completion evidence를 판정하고 no-op false-PASS를 차단한다.

import crypto from "node:crypto";

export const allowedCompletionSources = [
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
  };
  if (!action?.executed) return { ...base, reason: "action-not-executed" };
  if (action.dispatch !== "playwright-native") return { ...base, reason: "untrusted-action-dispatch" };

  if (action.kind === "navigate" || action.kind === "navigate-negative") {
    if (!navigation || !allowedStatuses.includes(Number(navigation.status))) {
      return { ...base, reason: "navigation-status-mismatch" };
    }
    if (action.kind === "navigate-negative") {
      return { ...base, pass: true, source: "negative-route-status", reason: "" };
    }
    if (!hasVisibleDom(after)) return { ...base, reason: "navigation-dom-missing" };
    return { ...base, pass: true, source: "navigation-network-dom", reason: "" };
  }

  const actualKind = action.executedKind || action.kind;
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
