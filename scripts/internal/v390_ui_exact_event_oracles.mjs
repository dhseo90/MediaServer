// 파일 용도: v3.9.0 exact 424의 EVT case를 실제 API/UI/runtime 의미에 결속한 immutable oracle catalog다.

const EVENT_CASE_IDS = Object.freeze([
  "EVT-001", "EVT-003", "EVT-004", "EVT-007", "EVT-016", "EVT-017", "EVT-018",
  "EVT-019", "EVT-020", "EVT-021", "EVT-022", "EVT-023", "EVT-024", "EVT-025",
  "EVT-026", "EVT-028", "EVT-030", "EVT-031", "EVT-036", "EVT-037", "EVT-038",
  "EVT-041", "EVT-042", "EVT-043", "EVT-044", "EVT-046", "EVT-047", "EVT-048",
  "EVT-049", "EVT-050", "EVT-051", "EVT-052", "EVT-053", "EVT-054", "EVT-055",
  "EVT-056", "EVT-057", "EVT-058", "EVT-061", "EVT-064", "EVT-065", "EVT-066",
  "EVT-067", "EVT-068", "EVT-069", "EVT-070", "EVT-071", "EVT-072", "EVT-075",
]);

const MUTATION_CASE_IDS = new Set(["EVT-021", "EVT-037", "EVT-038", "EVT-061", "EVT-068"]);
const WEAK_DOM_OPERATORS = new Set(["exists", "visible"]);
const STATE_BOUNDARIES = Object.freeze([
  "event-record", "event-post-schema", "webrtc-datachannel-metadata", "sse-metadata", "ws-metadata",
  "rtsp-media-path", "webrtc-media-path", "rule-registry", "profile-registry", "client-viewer-output",
]);
const SENSITIVE_FIELDS = Object.freeze([
  "sourceUrl", "rawJson", "debugMaterial", "debugCounters", "providerPrompt", "providerResponse",
  "providerMaterial", "credential", "authorization", "password", "sessionSecret", "tokenHash",
]);
const FORBIDDEN_MUTATIONS = Object.freeze([
  { methods: ["POST", "PUT", "PATCH", "DELETE"], pathPrefix: "/client/api" },
  { methods: ["POST", "PUT", "PATCH", "DELETE"], pathPrefix: "/webrtc" },
  { methods: ["POST", "PUT", "PATCH", "DELETE"], pathPrefix: "/events" },
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fixturePlaceholder(value) {
  if (typeof value === "string") return value.replace(/evt-\d{3}-review4-fixture/g, "{fixtureId}");
  if (Array.isArray(value)) return value.map(fixturePlaceholder);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fixturePlaceholder(child)]));
}

function selectorAttributes(selector) {
  const attributes = [];
  const pattern = /\[([A-Za-z0-9_-]+)(?:=([^\]]+))?\]/g;
  for (const match of String(selector || "").matchAll(pattern)) {
    attributes.push({ name: match[1], value: match[2]?.replace(/^["']|["']$/g, "") || null });
  }
  return attributes;
}

const body = (...assertions) => assertions.map(([path, operator, expected]) => ({ path, operator, expected }));
const dom = (selector, ...assertions) => ({
  selector,
  assertions: assertions.map(([operator, target, expected]) => ({ operator, target, expected })),
});
const api = (method, path, assertions, options = {}) => ({
  method,
  path,
  allowedStatuses: options.allowedStatuses || [200],
  correlationRequired: true,
  bodyAssertions: assertions,
  ...options,
});
const snap = (scope, policy = "equal", options = {}) => ({ scope, policy, before: true, after: true, ...options });

function eventSpec(caseId, config) {
  const mutation = MUTATION_CASE_IDS.has(caseId);
  const allowedStateChanges = config.allowedStateChanges || [];
  const screen = config.screen || "/ops/events";
  const canonicalRoute = config.canonical || screen;
  const role = config.role?.primary || "operator";
  const additionalRoles = config.role?.additional || [];
  const apiAssertions = config.apiAssertions;
  const domAssertions = config.domAssertions;
  const forbiddenFields = config.forbiddenFields || SENSITIVE_FIELDS;
  const forbiddenDomText = config.forbiddenDomText || [
    "Authorization: Bearer", "Set-Cookie:", "passwordHash", "sessionSecret", "providerPrompt", "providerResponse",
  ];
  const networkMutations = [...FORBIDDEN_MUTATIONS, ...(config.forbiddenNetworkMutations || [])];
  const stateSnapshots = config.stateSnapshots || STATE_BOUNDARIES.map(scope => snap(scope));
  const cleanup = config.cleanup || {
    required: true,
    strategy: mutation ? "restore-byte-exact-snapshots" : "remove-fixtures-and-assert-baseline",
    assertions: mutation
      ? ["all-mutated-files-restored-byte-exact", "runtime-counts-return-to-baseline", "no-fixture-id-remains"]
      : ["all-snapshots-equal-or-fixtures-removed", "runtime-counts-return-to-baseline", "no-fixture-id-remains"],
  };
  return fixturePlaceholder({
    schema: "media-server.v390-ui-exact-event-oracle.v1",
    caseId,
    featureMeaning: config.featureMeaning,
    expectedBehavior: config.featureMeaning,
    route: screen,
    canonicalRoute,
    role,
    additionalRoles,
    visibleControl: { ...config.visibleControl, action: config.action.kind },
    seed: { ...config.seed, fixtureId: "{fixtureId}", fixtureTemplate: `${caseId.toLowerCase()}-review4-fixture` },
    action: config.action,
    requests: apiAssertions.map(assertion => ({
      method: assertion.method,
      path: assertion.path,
      allowedStatuses: assertion.allowedStatuses,
      correlationRequired: assertion.correlationRequired,
      requiredJsonPaths: assertion.bodyAssertions.map(item => item.path),
      forbiddenJsonKeys: forbiddenFields,
      assertions: assertion.bodyAssertions,
      ...(assertion.repeat ? { repeat: assertion.repeat } : {}),
    })),
    dom: domAssertions.map(assertion => ({
      selector: assertion.selector,
      requiredTextTokens: assertion.assertions
        .filter(item => item.operator === "text-includes" && typeof item.target === "string")
        .map(item => item.target),
      forbiddenTextTokens: forbiddenDomText,
      requiredAttributes: selectorAttributes(assertion.selector),
      assertions: assertion.assertions,
    })),
    apiAssertions,
    domAssertions,
    forbidden: {
      responseFields: forbiddenFields,
      domTextPatterns: forbiddenDomText,
      networkMutations,
      stateChanges: STATE_BOUNDARIES.filter(scope => !allowedStateChanges.includes(scope)),
    },
    forbiddenNetwork: networkMutations.flatMap(item => item.methods.map(method => ({ method, path: `${item.pathPrefix}/*` }))),
    stateSnapshots,
    cleanup: { ...cleanup, targets: stateSnapshots.map(item => item.scope) },
  });
}

const specs = [
  eventSpec("EVT-001", {
    featureMeaning: "runtime status values are identical across the ops dashboard and home summary",
    screen: "/ops/dashboard",
    visibleControl: { selector: "[data-testid=ops-dashboard-page]", semanticTarget: "runtime-counts" },
    seed: { kind: "runtime-session-and-tap", fixtureId: "evt-001-review4-fixture", requiredFields: ["sessionId", "streamId", "tapId"] },
    action: { kind: "refresh-and-compare", steps: ["seed-runtime", "navigate-dashboard", "capture-runtime-response", "compare-dashboard", "compare-home"] },
    apiAssertions: [api("GET", "/ops/api/runtime/status", body(
      ["ok", "equals", true], ["sessionManager.activeSessions", "number-gte", 1], ["sessionManager.activeAnalysisTaps", "number-gte", 1]
    ))],
    domAssertions: [
      dom("#dashActiveSessions", ["number-equals-response", "sessionManager.activeSessions", true]),
      dom("#dashActiveStreams", ["number-equals-response", "sessionManager.registryActiveStreams|sessionManager.resourceActiveStreams", true]),
      dom("#dashActiveTaps", ["number-equals-response", "sessionManager.activeAnalysisTaps|analysisMatching.activeTapCount", true]),
      dom("#dashPublishSources", ["number-equals-response", "webrtcHttp.publishSources.length", true]),
    ],
    stateSnapshots: [snap("runtime-counts", "baseline-after-cleanup"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
  }),
  eventSpec("EVT-003", {
    featureMeaning: "source health API state is rendered with the same source id, status, and reason",
    screen: "/ops/dashboard",
    visibleControl: { selector: "#dashRootCauseList", semanticTarget: "source-health" },
    seed: { kind: "source-health-state", fixtureId: "evt-003-review4-fixture", requiredFields: ["sourceId", "status", "reason"] },
    action: { kind: "seed-refresh-readback", steps: ["seed-degraded-source", "navigate-dashboard", "capture-source-health", "compare-root-cause"] },
    apiAssertions: [api("GET", "/ops/api/source-health", body(
      ["status", "equals", "source-health"], ["sourceHealth", "contains-fixture-source", true], ["sourceHealth[].reason", "non-empty", true]
    ))],
    domAssertions: [
      dom("#dashHealthBadges", ["text-derived-from-response", "sourceHealth[].status", true]),
      dom("#dashRootCauseList [data-incident-unit]", ["contains-fixture-source", "sourceId/status/reason", true]),
    ],
  }),
  eventSpec("EVT-004", {
    featureMeaning: "diagnostic log tail is rendered on dashboard and sensitive authentication material is redacted",
    screen: "/ops/dashboard",
    visibleControl: { selector: "#dashIncidentTimelineSource", semanticTarget: "log-tail", setValue: "log-tail" },
    seed: { kind: "diagnostic-log-marker", fixtureId: "evt-004-review4-fixture", requiredFields: ["marker", "redactionCanary"] },
    action: { kind: "filter-log-tail", steps: ["emit-redaction-canary", "navigate-dashboard", "select-log-tail", "capture-log-tail", "assert-redaction"] },
    apiAssertions: [api("GET", "/ops/api/diagnostics/log-tail?limit=50", body(
      ["available", "boolean", true], ["lines", "contains-fixture-marker", true], ["lines", "not-contains-sensitive-canary", true]
    ))],
    domAssertions: [
      dom("#dashIncidentTimelineBadges", ["text-includes", "log tail", true]),
      dom("#dashIncidentTimeline", ["contains-fixture-marker", "marker", true], ["not-contains-sensitive-canary", "redactionCanary", true]),
    ],
  }),
  eventSpec("EVT-007", {
    featureMeaning: "event rows, filters, pagination, and archives match rule/scenario EventRecord history",
    visibleControl: { selector: "#eventRecordsEvidenceSelect", semanticTarget: "event-record-history" },
    seed: { kind: "active-and-archived-event-records", fixtureId: "evt-007-review4-fixture", requiredFields: ["eventId", "ruleId", "scenarioName", "evidence", "archive"] },
    action: { kind: "filter-and-page", steps: ["seed-active-and-archive", "toggle-archives", "filter-evidence", "page-forward-back", "compare-order"] },
    apiAssertions: [api("GET", "/ops/api/events/status?limit={limit}&offset={offset}&evidence={evidence}&includeArchives=1", body(
      ["status", "equals", "ops-events"], ["records.records", "contains-fixture-events", true], ["records.total", "number-gte", 2]
    ))],
    domAssertions: [
      dom("#eventRecordRows", ["row-fields-equal-response", "eventId/ruleId/scenarioName/evidence", true]),
      dom("#eventRecordsIncludeArchives", ["archive-toggle-changes-result", "fixtureArchiveEventId", true]),
      dom("#eventRecordsPrev, #eventRecordsNext", ["pagination-offset-equals-request", "offset", true]),
    ],
  }),
  eventSpec("EVT-016", {
    featureMeaning: "event storage and Event POST status panels exactly match the events status API",
    visibleControl: { selector: "#eventStorageBadges", semanticTarget: "event-storage-status" },
    seed: { kind: "event-storage-status", fixtureId: "evt-016-review4-fixture", requiredFields: ["eventId"] },
    action: { kind: "refresh-status-panels", steps: ["seed-event", "navigate-events", "capture-events-status", "compare-storage-and-post"] },
    apiAssertions: [api("GET", "/ops/api/events/status?limit=5&includeArchives=1", body(
      ["status", "equals", "ops-events"], ["storage", "object", true], ["post", "object", true], ["records.schema", "equals", "media-server.va.event-record-list.v1"]
    ))],
    domAssertions: [
      dom("#eventStorageBadges", ["fields-equal-response", "storage", true]),
      dom("#eventStorageText", ["summary-equals-response", "storage", true]),
      dom("#eventPostBadges", ["fields-equal-response", "post", true]),
      dom("#eventPostText", ["summary-equals-response", "post", true]),
    ],
  }),
  eventSpec("EVT-017", {
    featureMeaning: "alert delivery search, kind, enabled-state filters and empty state match persisted integrations",
    visibleControl: { selector: "#alertDeliveryFilter", semanticTarget: "alert-delivery-list" },
    seed: { kind: "alert-delivery-integrations", fixtureId: "evt-017-review4-fixture", requiredFields: ["id", "kind", "enabled", "label"] },
    action: { kind: "filter-alert-deliveries", steps: ["seed-two-integrations", "filter-search", "filter-kind", "filter-enabled", "assert-empty"] },
    apiAssertions: [api("GET", "/ops/api/alerts/deliveries", body(
      ["status", "string-non-empty", true], ["items", "contains-fixture-integrations", true], ["items[].endpoint", "redacted", true]
    ))],
    domAssertions: [
      dom("#alertDeliveryRows", ["row-fields-equal-response", "id/kind/enabled/label", true]),
      dom("#alertDeliveryKindFilter", ["filter-result-exact", "kind", true]),
      dom("#alertDeliveryEnabledFilter", ["filter-result-exact", "enabled", true]),
      dom("#alertDeliveryFilter", ["unmatched-query-produces-empty", "fixture-unmatched", true]),
    ],
  }),
  eventSpec("EVT-018", {
    featureMeaning: "saving and testing an alert integration records delivered fixture while endpoint credentials remain redacted",
    visibleControl: { selector: "#alertDeliveryTest", semanticTarget: "alert-delivery-fixture-test" },
    seed: { kind: "alert-delivery-form-input", fixtureId: "evt-018-review4-fixture", requiredFields: ["id", "kind", "label", "endpointToken"] },
    action: { kind: "persist-and-test-alert-delivery", steps: ["snapshot-alert-files", "fill-form", "click-save", "click-test", "read-attempt-and-audit", "restore"] },
    apiAssertions: [
      api("POST", "/ops/api/alerts/deliveries", body(["status", "string-non-empty", true], ["delivery.id", "equals-fixture", true])),
      api("POST", "/ops/api/alerts/deliveries/test", body(["status", "equals", "delivered"], ["mode", "equals", "fixture"], ["endpoint", "redacted", true])),
    ],
    domAssertions: [
      dom("#alertDeliveryRows", ["contains-fixture-delivery", "id", true]),
      dom("#alertDeliveryDryRunResult", ["text-includes", "delivered · fixture", true], ["not-contains-sensitive-canary", "endpointToken", true]),
    ],
    allowedStateChanges: ["alert-delivery-config", "alert-delivery-attempt", "ops-audit"],
    stateSnapshots: [snap("alert-delivery-config", "restore"), snap("alert-delivery-attempt", "restore"), snap("ops-audit", "restore"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["alert-config-restored", "attempt-log-restored", "audit-log-restored", "endpoint-token-absent"] },
  }),
  eventSpec("EVT-019", {
    featureMeaning: "review inbox joins EventRecord with a separate review state by eventId without mutating the EventRecord",
    visibleControl: { selector: "[data-event-review-row][data-event-id=evt-019-review4-fixture]", semanticTarget: "joined-review-row" },
    seed: { kind: "event-record-and-review", fixtureId: "evt-019-review4-fixture", requiredFields: ["eventId", "reviewStatus", "classification"] },
    action: { kind: "join-readback", steps: ["seed-event", "seed-review", "capture-record-hash", "load-inbox", "compare-joined-row", "assert-record-unchanged"] },
    apiAssertions: [
      api("GET", "/ops/api/events/reviews", body(["records", "contains-fixture-review", true], ["storage.separateFromEventRecords", "equals", true])),
      api("GET", "/ops/api/events/reviews/evt-019-review4-fixture", body(["review.eventId", "equals-fixture", true], ["review.reviewStatus", "equals-seed", true])),
    ],
    domAssertions: [dom("[data-event-review-row][data-event-id=evt-019-review4-fixture]", ["fields-equal-response", "event/review", true], ["contains-descendant", "[data-testid=ops-vlm-event-review-card]", true])],
  }),
  eventSpec("EVT-020", {
    featureMeaning: "event list and review detail expose evidence references, review status, and operator note",
    visibleControl: { selector: "[data-event-review-row][data-event-id=evt-020-review4-fixture]", semanticTarget: "event-review-detail" },
    seed: { kind: "event-review-with-evidence", fixtureId: "evt-020-review4-fixture", requiredFields: ["snapshotPath", "clipPath", "reviewStatus", "note"] },
    action: { kind: "detail-readback", steps: ["seed-event-and-review", "load-status-and-inbox", "compare-event-row", "compare-review-detail", "check-evidence-links"] },
    apiAssertions: [
      api("GET", "/ops/api/events/status?limit=50", body(["records.records", "contains-fixture-event", true], ["records.records[].evidence", "contains-seed-refs", true])),
      api("GET", "/ops/api/events/reviews/evt-020-review4-fixture", body(["review.reviewStatus", "equals-seed", true], ["review.note", "equals-seed", true])),
    ],
    domAssertions: [
      dom("#eventRecordRows", ["contains-event-and-evidence", "evt-020-review4-fixture", true]),
      dom("[data-event-review-row][data-event-id=evt-020-review4-fixture]", ["field-value-equals-response", "reviewStatus/note", true], ["evidence-links-match-seed", "snapshotPath/clipPath", true]),
    ],
  }),
  eventSpec("EVT-021", {
    featureMeaning: "review status, classification, note, incident and VLM action persist and emit exact audit actions",
    visibleControl: { selector: "[data-event-review-row][data-event-id=evt-021-review4-fixture] [data-event-review-save]", semanticTarget: "persist-review" },
    seed: { kind: "event-and-baseline-review", fixtureId: "evt-021-review4-fixture", requiredFields: ["eventId", "baselineReview"] },
    action: { kind: "persisted-mutation", steps: ["capture-before-snapshots", "edit-fields", "click-save", "capture-put", "capture-after-snapshots", "read-item", "read-audit", "restore-byte-exact"] },
    apiAssertions: [
      api("PUT", "/ops/api/events/reviews/evt-021-review4-fixture", body(["status", "equals", "ops-event-review"], ["persistent", "equals", true], ["review", "equals-requested-fields", true], ["audit.action", "equals", "event-review-update"])),
      api("GET", "/ops/api/events/reviews/evt-021-review4-fixture", body(["review", "equals-put-response-review", true], ["operatorResolutionFlow", "object", true])),
      api("GET", "/ops/api/audit?eventId=evt-021-review4-fixture", body(["items", "contains-action", "event-review-update"], ["items", "contains-fixture-event", true])),
    ],
    domAssertions: [dom("[data-event-review-row][data-event-id=evt-021-review4-fixture]", ["field-value-equals-readback", "reviewStatus/classification/note/incidentStatus/vlmAction/vlmActionTarget", true], ["save-completion-bound-to-put", "evt-021-review4-fixture", true])],
    allowedStateChanges: ["ops-review", "ops-audit"],
    stateSnapshots: [snap("ops-review", "restore"), snap("ops-audit", "restore"), snap("event-record", "equal"), ...STATE_BOUNDARIES.filter(scope => scope !== "event-record").map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["review-jsonl-restored", "audit-jsonl-restored", "event-record-hash-unchanged", "fixture-review-absent"] },
  }),
  eventSpec("EVT-022", {
    featureMeaning: "audit list filtering, detail, and JSON/CSV/diff export represent the same audit events",
    visibleControl: { selector: "#event-review-audit-list", semanticTarget: "audit-list-and-export" },
    seed: { kind: "review-audit-actions", fixtureId: "evt-022-review4-fixture", requiredFields: ["eventId", "action", "actor"] },
    action: { kind: "filter-detail-export", steps: ["seed-two-audits", "refresh-audit", "filter-fixture", "open-detail", "export-json-csv-diff", "compare-exports"] },
    apiAssertions: [
      api("GET", "/ops/api/audit?eventId=evt-022-review4-fixture", body(["items", "contains-fixture-event", true], ["items[].action", "contains-seed-action", true])),
      api("GET", "/ops/api/audit?format=csv&eventId=evt-022-review4-fixture", body(["$text", "csv-contains-fixture", true], ["$contentType", "starts-with", "text/csv"])),
      api("GET", "/ops/api/audit?format=diff-json&eventId=evt-022-review4-fixture", body(["items", "contains-fixture-diff", true], ["items[].after", "object", true])),
    ],
    domAssertions: [
      dom("#event-review-audit-list [data-audit-list-body]", ["contains-fixture-audit", "eventId/action", true]),
      dom("#event-review-audit-list [data-audit-detail]", ["detail-equals-response", "before/after", true]),
      dom("#event-review-audit-list [data-audit-export=json], #event-review-audit-list [data-audit-export=csv], #event-review-audit-list [data-audit-export=diff-json]", ["export-download-matches-api", "fixtureId", true]),
    ],
  }),
  eventSpec("EVT-023", {
    featureMeaning: "ops dashboard event summary and viewer-scoped incident digest agree while raw/debug/locator/provider material stays hidden",
    screen: "/ops/dashboard",
    canonical: "/ops/dashboard",
    role: { primary: "operator", additional: ["viewer"] },
    visibleControl: { selector: "#dashIncidentTimeline", semanticTarget: "event-summary-and-viewer-digest", additionalSelector: "[data-testid=client-safe-incident-digest]" },
    seed: { kind: "published-view-event", fixtureId: "evt-023-review4-fixture", requiredFields: ["eventId", "viewId", "summaryText", "severity", "status"] },
    action: { kind: "cross-role-readback", steps: ["seed-published-view-event", "operator-dashboard-read", "bind-viewer-session", "client-events-read", "compare-safe-digest", "assert-redaction"] },
    apiAssertions: [
      api("GET", "/ops/api/events/status?limit=5&includeArchives=1", body(["records.records", "contains-fixture-event", true], ["records.records[].status", "equals-seed", true])),
      api("GET", "/client/api/views/{viewId}/events", body(["incidentDigest.schema", "equals", "media-server.client.incident-digest.v1"], ["incidentDigest.viewerSafe", "equals", true], ["incidentDigest.digestItems", "contains-fixture-safe-summary", true])),
    ],
    domAssertions: [
      dom("#dashIncidentTimelineBadges", ["event-count-equals-response", "records.total", true]),
      dom("#dashIncidentTimeline", ["contains-fixture-event-summary", "eventId/status", true]),
      dom("[data-testid=client-safe-incident-digest]", ["safe-fields-equal-response", "summaryText/severity/eventType/status/time", true], ["redaction-boundary-closed", "source/raw/debug/provider", true]),
    ],
  }),
  eventSpec("EVT-024", {
    featureMeaning: "runtime summary remains internally consistent across repeated bounded samples without claiming a 30/120 minute gate",
    screen: "/ops/dashboard",
    visibleControl: { selector: "#dashRuntimeTrendSparkline", semanticTarget: "bounded-runtime-drift" },
    seed: { kind: "stable-runtime-baseline", fixtureId: "evt-024-review4-fixture", requiredFields: ["sampleCount", "pollIntervalMs"] },
    action: { kind: "bounded-repeated-poll", steps: ["capture-baseline", "poll-runtime-source-events", "refresh-dashboard", "compare-each-sample", "assert-no-longrun-pass-claim"] },
    apiAssertions: [api("GET", "/ops/api/runtime/status", body(["ok", "equals", true], ["sessionManager.activeSessions", "stable-across-bounded-samples", true], ["sessionManager.activeAnalysisTaps", "stable-across-bounded-samples", true]), { repeat: { count: 3, intervalMs: 250 } })],
    domAssertions: [dom("#dashRuntimeTrendSparkline", ["sample-count-equals-observations", "repeat.count", true], ["delta-equals-observations", "sessionManager.activeSessions/sessionManager.activeAnalysisTaps", true], ["does-not-claim-longrun-pass", "30/120", true])],
    stateSnapshots: [snap("runtime-counts", "baseline-after-cleanup"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
  }),
  eventSpec("EVT-025", {
    featureMeaning: "dashboard source and channel counts and status equal runtime and source-health responses",
    screen: "/ops/dashboard",
    visibleControl: { selector: "#dashHealthBadges", semanticTarget: "source-channel-summary" },
    seed: { kind: "source-and-channel", fixtureId: "evt-025-review4-fixture", requiredFields: ["sourceId", "channelId", "status"] },
    action: { kind: "cross-api-summary-readback", steps: ["seed-source-channel", "capture-runtime", "capture-source-health", "compare-dashboard-summary"] },
    apiAssertions: [
      api("GET", "/ops/api/runtime/status", body(["webrtcHttp.publishSources", "array", true], ["sessionManager.registryActiveStreams", "number", true])),
      api("GET", "/ops/api/source-health", body(["sourceHealth", "contains-fixture-source", true], ["sourceHealth[].status", "equals-seed", true])),
    ],
    domAssertions: [dom("#dashHealthBadges", ["counts-equal-responses", "webrtcHttp.publishSources.length/sourceHealth.length", true]), dom("#dashHealthText", ["contains-source-status", "sourceId/status", true])],
  }),
  eventSpec("EVT-026", {
    featureMeaning: "VA tap and event summary is stable and equal to runtime and events APIs",
    screen: "/ops/dashboard",
    visibleControl: { selector: "#dashRootCauseList", semanticTarget: "va-tap-event-summary" },
    seed: { kind: "va-tap-and-event", fixtureId: "evt-026-review4-fixture", requiredFields: ["tapId", "eventId", "status"] },
    action: { kind: "seed-refresh-twice", steps: ["create-tap", "seed-event", "capture-runtime-events", "refresh-twice", "compare-stability"] },
    apiAssertions: [
      api("GET", "/ops/api/runtime/status", body(["sessionManager.activeAnalysisTaps", "number-gte", 1], ["ok", "equals", true])),
      api("GET", "/ops/api/events/status?limit=5", body(["records.records", "contains-fixture-event", true], ["records.records[].status", "equals-seed", true])),
    ],
    domAssertions: [dom("#dashActiveTaps", ["number-equals-response", "sessionManager.activeAnalysisTaps", true]), dom("#dashIncidentTimeline", ["contains-fixture-event-summary", "eventId/status", true], ["stable-across-refresh", "eventId/status", true])],
    stateSnapshots: [snap("runtime-counts", "baseline-after-cleanup"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
  }),
];

function reviewProjectionSpec(caseId, config) {
  const fixtureId = `${caseId.toLowerCase()}-review4-fixture`;
  const canonical = config.canonical || "/ops/api/events/reviews";
  return eventSpec(caseId, {
    featureMeaning: config.featureMeaning,
    canonical,
    screen: config.screen || "/ops/events",
    visibleControl: { selector: config.visibleSelector || config.selector, semanticTarget: config.semanticTarget },
    seed: { kind: config.seedKind, fixtureId, requiredFields: config.seedFields },
    action: { kind: config.actionKind || "seed-query-exact-readback", steps: config.steps || ["snapshot-boundaries", "seed-fixture", "query-exact-api", "compare-exact-dom", "assert-boundaries", "cleanup"] },
    apiAssertions: config.apiAssertions || [api("GET", config.apiPath || "/ops/api/events/reviews", body(...config.bodyAssertions))],
    domAssertions: config.domAssertions || [dom(config.selector, ...config.domChecks)],
    forbiddenFields: config.forbiddenFields,
    forbiddenNetworkMutations: config.forbiddenNetworkMutations,
    allowedStateChanges: config.allowedStateChanges,
    stateSnapshots: config.stateSnapshots,
    cleanup: config.cleanup,
  });
}

specs.push(
  reviewProjectionSpec("EVT-028", {
    featureMeaning: "Ops-only review renders EventRecord evidence and VLM explanation while client and transport schemas remain unchanged",
    selector: "[data-event-review-row][data-event-id=evt-028-review4-fixture] [data-testid=ops-vlm-event-review-card]",
    semanticTarget: "ops-vlm-evidence-review", seedKind: "event-evidence-and-vlm-sidecar", seedFields: ["snapshotPath", "clipPath", "summary", "eventExplanation", "falsePositiveHints", "operatorReviewQuestions"],
    bodyAssertions: [["records", "contains-fixture-review", true], ["records[].vlmReview.evidence", "equals-seed", true], ["records[].vlmReview.explanation", "equals-seed", true], ["storage.eventPostPayloadChanged", "equals", false]],
    domChecks: [["fields-equal-response", "evidence/explanation/hints/questions", true], ["ops-only-boundary", "viewerClientExposureAdded", true]],
  }),
  reviewProjectionSpec("EVT-030", {
    featureMeaning: "VLM sidecar joins only by eventId and exposes exact matching and missing states without EventRecord schema mutation",
    selector: "[data-event-review-row][data-event-id=evt-030-review4-fixture] [data-testid=ops-vlm-event-review-card]",
    semanticTarget: "sidecar-eventid-correlation", seedKind: "matching-and-missing-vlm-sidecars", seedFields: ["matchingEventId", "missingEventId", "observation"],
    bodyAssertions: [["records", "contains-matching-and-missing", true], ["records[].vlmReview.eventRecordPresent", "matches-fixture-mode", true], ["records[].vlmReview.observationPresent", "matches-fixture-mode", true]],
    domChecks: [["badges-equal-response", "eventRecordPresent/observationPresent", true], ["row-pair-distinct", "matching/missing", true]],
  }),
  reviewProjectionSpec("EVT-031", {
    featureMeaning: "VLM summary, explanation, false-positive hints, and operator questions render without raw provider prompt or response",
    selector: "[data-event-review-row][data-event-id=evt-031-review4-fixture] [data-testid=ops-vlm-event-review-card]",
    semanticTarget: "redacted-vlm-review", seedKind: "vlm-explanation", seedFields: ["summary", "eventExplanation", "falsePositiveHints", "operatorReviewQuestions", "rawCanary"],
    bodyAssertions: [["records[].vlmReview.explanation", "equals-seed", true], ["records[].vlmReview.observationPresent", "equals", true], ["$body", "not-contains-seed-raw-canary", true]],
    domChecks: [["fields-equal-response", "summary/eventExplanation/falsePositiveHints/operatorReviewQuestions", true], ["not-contains-seed-raw-canary", "rawCanary", true]],
  }),
  reviewProjectionSpec("EVT-036", {
    featureMeaning: "rule suggestion draft wraps a sidecar sourceCandidateReport and never writes product registries or transport payloads",
    selector: "[data-event-review-row][data-event-id=evt-036-review4-fixture] [data-testid=ops-incident-rule-suggestion-review]",
    semanticTarget: "sidecar-rule-suggestion-wrapper", seedKind: "vlm-rule-suggestion-sidecar", seedFields: ["ruleSuggestion", "sourceCandidateReport"],
    bodyAssertions: [["records[].incidentRuleSuggestionReview.sourceCandidateReport", "equals-seed", true], ["records[].incidentRuleSuggestionReview.contract.ruleRegistryWritePerformed", "equals", false], ["records[].incidentRuleSuggestionReview.contract.autoRuleApplied", "equals", false]],
    domChecks: [["fields-equal-response", "candidateStatus/sourceCandidateReport/manualDraftRoute", true], ["manual-only", "no-auto-save-apply", true]],
  }),
  reviewProjectionSpec("EVT-037", {
    featureMeaning: "incident action state persists only to Ops review and audit and is correlated by eventId and incidentId",
    visibleSelector: "[data-event-review-row][data-event-id=evt-037-review4-fixture] [data-event-review-save]",
    selector: "[data-event-review-row][data-event-id=evt-037-review4-fixture] [data-testid=ops-event-incident-action-controls]",
    semanticTarget: "incident-action-persistence", seedKind: "event-and-baseline-review", seedFields: ["eventId", "incidentId", "incidentStatus", "actionTarget"], actionKind: "persisted-mutation",
    steps: ["capture-before-snapshots", "seed-event-and-review", "submit-incident-action-put", "capture-after-snapshots", "read-item", "read-audit", "restore-byte-exact"],
    apiAssertions: [
      api("PUT", "/ops/api/events/reviews/evt-037-review4-fixture", body(["review.incidentWorkflow", "equals-request", true], ["audit.action", "equals", "incident-action-update"])),
      api("GET", "/ops/api/events/reviews/evt-037-review4-fixture", body(["review.incidentWorkflow", "equals-put-response", true], ["review.eventId", "equals-fixture", true])),
      api("GET", "/ops/api/audit?eventId=evt-037-review4-fixture", body(["items", "contains-action", "incident-action-update"], ["items", "contains-incident-id", true])),
    ],
    domAssertions: [dom("[data-event-review-row][data-event-id=evt-037-review4-fixture]", ["field-value-equals-readback", "incidentId/incidentStatus/actionTarget", true], ["save-completion-bound-to-put", "evt-037-review4-fixture", true])],
    allowedStateChanges: ["ops-review", "ops-audit"], stateSnapshots: [snap("ops-review", "restore"), snap("ops-audit", "restore"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["review-jsonl-restored", "audit-jsonl-restored", "event-record-hash-unchanged"] },
  }),
  reviewProjectionSpec("EVT-038", {
    featureMeaning: "alert delivery dry-run writes only attempt and audit evidence and never changes event or transport schemas",
    selector: "#alertDeliveryDryRun", semanticTarget: "alert-delivery-dry-run", seedKind: "alert-delivery-dry-run", seedFields: ["deliveryId", "payload", "redactionCanary"], actionKind: "persisted-mutation",
    steps: ["capture-before-snapshots", "seed-alert-delivery", "click-dry-run", "capture-after-snapshots", "read-attempt", "read-audit", "restore-byte-exact"],
    apiAssertions: [
      api("POST", "/ops/api/alerts/deliveries/dry-run", body(["schema", "equals", "media-server.ops.alert-delivery-dry-run.v1"], ["payloadPreview.schema", "equals", "media-server.ops.alert-delivery-payload-preview.v1"], ["status", "string-non-empty", true])),
      api("GET", "/ops/api/audit?eventId=evt-038-review4-fixture", body(["items", "contains-dry-run-action", true], ["items", "contains-fixture-event", true])),
    ],
    domAssertions: [dom("#alertDeliveryPayloadPreview", ["payload-equals-response", "payloadPreview", true], ["not-contains-sensitive-canary", "redactionCanary", true]), dom("#alertDeliveryDryRunResult", ["status-equals-response", "status", true])],
    allowedStateChanges: ["alert-delivery-attempt", "ops-audit"], stateSnapshots: [snap("alert-delivery-attempt", "restore"), snap("ops-audit", "restore"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["attempt-jsonl-restored", "audit-jsonl-restored", "event-and-transport-hashes-unchanged"] },
  }),
  reviewProjectionSpec("EVT-041", {
    featureMeaning: "incident memory search applies query, rule, source, status, and time filters and returns exact matched terms and highlights",
    selector: "#opsIncidentSearchRows [data-incident-memory-hit=evt-041-review4-fixture]", semanticTarget: "incident-memory-search", seedKind: "searchable-event-review", seedFields: ["query", "ruleId", "sourceId", "incidentStatus", "startTimeMs", "endTimeMs"],
    apiPath: "/ops/api/events/reviews?q={q}&ruleId={ruleId}&sourceId={sourceId}&incidentStatus={incidentStatus}&startTimeMs={startTimeMs}&endTimeMs={endTimeMs}",
    bodyAssertions: [["memorySearch.schema", "equals", "media-server.ops.incident-memory-search-view.v1"], ["memorySearch.hits", "contains-fixture-document", true], ["memorySearch.hits[].matchedTerms", "contains-query-terms", true], ["memorySearch.hits[].highlightFragments", "non-empty", true]],
    domChecks: [["matched-terms-equal-response", "matchedTerms", true], ["highlight-fragments-equal-response", "highlightFragments", true]],
  }),
  reviewProjectionSpec("EVT-042", {
    featureMeaning: "incident timeline graph contains source, event, operator action, alert dry-run, and close nodes with ordered edges",
    selector: "#opsIncidentTimelineGraphRows [data-incident-timeline-node]", semanticTarget: "incident-timeline-graph", seedKind: "five-stage-incident-timeline", seedFields: ["sourceState", "eventRecord", "operatorAction", "alertDryRun", "closeState"],
    bodyAssertions: [["timelineGraph.schema", "equals", "media-server.ops.incident-timeline-graph.v1"], ["timelineGraph.nodes", "contains-stages", ["source-state", "event-record", "operator-action", "alert-dry-run", "close-state"]], ["timelineGraph.edges", "forms-ordered-chain", true]],
    domChecks: [["stage-order-equals-response", "nodes", true], ["edge-order-equals-response", "edges", true]],
  }),
  reviewProjectionSpec("EVT-043", {
    featureMeaning: "explainable incident brief renders action, object, context, and environment slots with provider enrichment default-off",
    selector: "#opsIncidentBriefRows [data-incident-brief-card=evt-043-review4-fixture]", semanticTarget: "explainable-incident-brief", seedKind: "incident-brief-slots", seedFields: ["action", "object", "context", "environment"],
    bodyAssertions: [["incidentBrief.schema", "equals", "media-server.ops.explainable-incident-brief.v1"], ["incidentBrief.briefs", "contains-four-seed-slots", true], ["incidentBrief.defaultVlmEnrichmentEnabled", "equals", false]],
    domChecks: [["slot-values-equal-response", "action/object/context/environment", true], ["slot-count-equals", "[data-incident-brief-slot]", 4]],
  }),
  reviewProjectionSpec("EVT-044", {
    featureMeaning: "similar incident lookup returns deterministic ordered scores and explanation terms for related incidents only",
    selector: "#opsSimilarIncidentRows [data-similar-incident-group=evt-044-review4-fixture]", semanticTarget: "similar-incident-lookup", seedKind: "base-related-and-unrelated-incidents", seedFields: ["baseEventId", "relatedEventIds", "unrelatedEventId"],
    bodyAssertions: [["similarIncidents.schema", "equals", "media-server.ops.similar-incident-lookup.v1"], ["similarIncidents.deterministicScoring", "equals", true], ["similarIncidents.groups[].related", "score-descending", true], ["similarIncidents.groups[].related[].explanationTerms", "non-empty", true]],
    domChecks: [["related-order-equals-response", "score", true], ["explanation-terms-equal-response", "explanationTerms", true]],
  }),
  reviewProjectionSpec("EVT-046", {
    featureMeaning: "VLM summary candidate review wraps the existing sourceCandidateReport without changing client or transport boundaries",
    selector: "#opsVlmSummaryCandidateRows [data-vlm-summary-candidate-event=evt-046-review4-fixture]", semanticTarget: "vlm-summary-candidate-wrapper", seedKind: "vlm-summary-candidate-sidecar", seedFields: ["query", "sourceCandidateReport", "candidates"],
    bodyAssertions: [["memorySearch.vlmSummaryCandidateReview.sourceCandidateReport.schema", "equals", "media-server.vlm-summary-search-candidates.v1"], ["memorySearch.vlmSummaryCandidateReview.sourceCandidateReport.candidates", "contains-fixture-candidate", true], ["memorySearch.vlmSummaryCandidateReview.query", "equals-seed", true]],
    domChecks: [["candidate-fields-equal-response", "eventId/score/matchedTerms", true], ["candidate-count-equals-response", "candidates.length", true]],
  }),
  reviewProjectionSpec("EVT-047", {
    featureMeaning: "incident rule suggestion review wraps matching rule suggestion and candidate report as an Ops-only manual draft",
    selector: "[data-event-review-row][data-event-id=evt-047-review4-fixture] [data-testid=ops-incident-rule-suggestion-review]", semanticTarget: "incident-rule-suggestion-review", seedKind: "matching-rule-suggestion-sidecar", seedFields: ["matchingRuleSuggestion", "sourceCandidateReport", "manualDraftRoute"],
    apiPath: "/ops/api/events/reviews/evt-047-review4-fixture",
    bodyAssertions: [["incidentRuleSuggestionReview.matchingRuleSuggestion", "equals-seed", true], ["incidentRuleSuggestionReview.sourceCandidateReport", "equals-seed", true], ["incidentRuleSuggestionReview.contract.ruleRegistryWritePerformed", "equals", false]],
    domChecks: [["fields-equal-response", "suggestion/candidates/manualDraftRoute", true], ["manual-only", "no-auto-apply", true]],
  }),
  reviewProjectionSpec("EVT-048", {
    featureMeaning: "dashboard trend is derived from runtime, source-health, and events responses with exact bounded baseline deltas",
    screen: "/ops/dashboard", canonical: "/ops/dashboard", selector: "#dashRuntimeTrendSparkline", semanticTarget: "page-local-runtime-trend", seedKind: "dashboard-three-api-samples", seedFields: ["runtime", "sourceHealth", "events", "baseline"],
    apiAssertions: [
      api("GET", "/ops/api/runtime/status", body(["ok", "equals", true], ["sessionManager.activeSessions", "number", true])),
      api("GET", "/ops/api/source-health", body(["sourceHealth", "array", true], ["sourceHealth", "contains-fixture-source", true])),
      api("GET", "/ops/api/events/status?limit=5&includeArchives=1", body(["records.records", "contains-fixture-event", true], ["status", "equals", "ops-events"])),
    ],
    domAssertions: [dom("#dashRuntimeTrendSparkline", ["samples-derived-from-responses", "runtime/source/events", true], ["delta-equals-baseline", "baseline", true], ["history-bounded", "sampleLimit", true])],
  }),
  reviewProjectionSpec("EVT-049", {
    featureMeaning: "an actual A-zone exit followed by B-zone entry replay creates the expected re-entry EventRecord",
    selector: "#eventRecordRows", semanticTarget: "cross-zone-reentry-replay", seedKind: "cross-zone-track-timeline", seedFields: ["trackId", "zoneA", "zoneB", "exitPts", "entryPts"], actionKind: "runtime-replay",
    steps: ["snapshot-event-engine", "seed-rule-and-track", "replay-zone-a-exit", "replay-zone-b-entry", "wait-event-record", "compare-record-and-post", "remove-replay-artifacts"],
    apiAssertions: [api("GET", "/ops/api/events/status?limit=50", body(["records.records", "contains-fixture-event", true], ["records.records[].eventType", "equals", "re-entry"], ["records.records[].scenarioPhase", "matches-reentry", true]))],
    domAssertions: [dom("#eventRecordRows", ["contains-fixture-event", "eventId", true], ["fields-equal-response", "eventType/scenario/evidence", true])],
    stateSnapshots: [snap("event-engine-registry", "restore"), snap("event-record", "remove-fixture-then-equal"), snap("event-evidence", "remove-fixture-then-equal"), ...STATE_BOUNDARIES.filter(scope => scope !== "event-record").map(scope => snap(scope))],
    cleanup: { required: true, strategy: "remove-replay-artifacts-and-restore-engine", assertions: ["fixture-event-removed", "fixture-evidence-removed", "engine-registry-restored", "transport-schema-hashes-unchanged"] },
  }),
  reviewProjectionSpec("EVT-050", {
    featureMeaning: "incident triage board cards and filters exactly summarize EventRecord, review, and VLM state",
    selector: "#opsIncidentTriageBoardRows [data-incident-triage-card=evt-050-review4-fixture]", semanticTarget: "incident-triage-board", seedKind: "triage-lane-priority-fixtures", seedFields: ["lane", "priority", "reviewStatus", "vlmStatus"],
    bodyAssertions: [["incidentTriageBoard.schema", "equals", "media-server.ops.incident-triage-board.v1"], ["incidentTriageBoard.items", "contains-fixture-card", true], ["incidentTriageBoard.items", "priority-order-exact", true]],
    domChecks: [["card-fields-equal-response", "lane/priority/status", true], ["filter-result-exact", "lane/priority/sort", true]],
  }),
  reviewProjectionSpec("EVT-051", {
    featureMeaning: "incident decision scorecard deterministically explains priority from source, similar, VLM, review age, and EventRecord evidence",
    selector: "#opsIncidentDecisionScorecardRows [data-incident-decision-scorecard-event=evt-051-review4-fixture]", semanticTarget: "incident-decision-scorecard", seedKind: "decision-scorecard-evidence", seedFields: ["sourceHealth", "similar", "vlm", "reviewAge", "eventEvidence"],
    bodyAssertions: [["incidentDecisionScorecard.schema", "equals", "media-server.ops.incident-decision-scorecard.v1"], ["incidentDecisionScorecard.items", "contains-fixture-score", true], ["incidentDecisionScorecard.items[].priorityReasons", "equals-seed-derivation", true]],
    domChecks: [["score-equals-response", "score", true], ["reasons-equal-response", "priorityReasons", true], ["order-equals-response", "score", true]],
  }),
  reviewProjectionSpec("EVT-052", {
    featureMeaning: "operational action pack exposes only manual release-safe bundle, rule draft, alert dry-run, and source recheck links",
    selector: "#opsOperationalActionPackRows", semanticTarget: "operational-action-pack", seedKind: "action-pack-evidence", seedFields: ["evidence", "ruleSuggestion", "alertDelivery", "sourceHealth"],
    bodyAssertions: [["operationalActionPack.schema", "equals", "media-server.ops.operational-action-pack.v1"], ["operationalActionPack.items", "contains-fixture-pack", true], ["operationalActionPack.contract.autoActionPerformed", "equals", false]],
    domChecks: [["links-equal-response", "bundle/draft/dry-run/recheck", true], ["manual-only", "all-actions", true]],
  }),
  reviewProjectionSpec("EVT-053", {
    featureMeaning: "rule what-if preview compares selected incident conditions with a matching suggestion without auto-saving or applying",
    selector: "#opsRuleWhatIfPreviewRows [data-rule-what-if-preview-event=evt-053-review4-fixture]", semanticTarget: "rule-what-if-preview", seedKind: "matching-rule-suggestion", seedFields: ["eventType", "classes", "minConfidence", "minDurationMs"],
    bodyAssertions: [["ruleWhatIfPreview.schema", "equals", "media-server.ops.rule-what-if-preview.v1"], ["ruleWhatIfPreview.items", "contains-fixture-preview", true], ["ruleWhatIfPreview.contract.ruleRegistryWritePerformed", "equals", false]],
    domChecks: [["fields-equal-response", "draftComparison/conditionPreview/manualDraftRoute", true], ["manual-only", "no-auto-save-apply", true]],
  }),
  reviewProjectionSpec("EVT-054", {
    featureMeaning: "operator outcome memory deterministically summarizes accept, dismiss, and review-needed history from review and audit state",
    selector: "#opsOperatorOutcomeMemoryRows [data-operator-outcome-memory-event=evt-054-review4-fixture]", semanticTarget: "operator-outcome-memory", seedKind: "review-outcome-history", seedFields: ["accepted", "dismissed", "reviewNeeded", "auditActions"],
    bodyAssertions: [["operatorOutcomeMemory.schema", "equals", "media-server.ops.operator-outcome-memory.v1"], ["operatorOutcomeMemory.items", "contains-fixture-outcome", true], ["operatorOutcomeMemory.aggregateOutcomeCounts", "equals-seed-counts", true]],
    domChecks: [["counts-equal-response", "accepted/dismissed/reviewNeeded", true], ["history-hint-equals-response", "deterministicHistoryHint", true], ["audit-refs-equal-response", "auditActionRefs", true]],
  }),
  reviewProjectionSpec("EVT-055", {
    featureMeaning: "action readiness queue keeps ready, blocked, field-smoke-needed, and not-run states distinct",
    selector: "#opsIncidentActionReadinessQueueRows [data-incident-action-readiness-event=evt-055-review4-fixture]", semanticTarget: "incident-action-readiness", seedKind: "four-readiness-states", seedFields: ["ready", "blocked", "fieldSmokeNeeded", "notRun"],
    bodyAssertions: [["incidentActionReadinessQueue.schema", "equals", "media-server.ops.incident-action-readiness-queue.v1"], ["incidentActionReadinessQueue.items", "contains-four-states", true], ["incidentActionReadinessQueue.contract.notRunIsPass", "equals", false]],
    domChecks: [["states-equal-response", "ready/blocked/field-smoke-needed/not-run", true], ["not-run-not-styled-pass", "not-run", true]],
  }),
  reviewProjectionSpec("EVT-056", {
    featureMeaning: "approval-gated draft readiness exposes approval and validation only and performs no Rule/Profile registry write",
    selector: "#opsApprovalGatedRuleDraftReadinessRows [data-approval-gated-rule-draft-event=evt-056-review4-fixture]", semanticTarget: "approval-gated-rule-draft", seedKind: "staged-rule-draft-candidate", seedFields: ["approvalState", "validationSummary", "stagedDraft"],
    bodyAssertions: [["approvalGatedRuleDraftReadiness.schema", "equals", "media-server.ops.approval-gated-rule-draft-readiness.v1"], ["approvalGatedRuleDraftReadiness.items", "contains-fixture-draft", true], ["approvalGatedRuleDraftReadiness.contract.ruleRegistryWritePerformed", "equals", false]],
    domChecks: [["fields-equal-response", "approvalState/validationSummary", true], ["flags-equal", "noAutoSave/noAutoApply/ruleRegistryWritePerformed", [true, true, false]]],
  }),
  reviewProjectionSpec("EVT-057", {
    featureMeaning: "evidence intake readiness distinguishes passed, failed, blocked, and not-run without exposing credentials or raw provider material",
    selector: "#opsEvidenceIntakeFieldReadinessRows [data-evidence-intake-field-event=evt-057-review4-fixture]", semanticTarget: "evidence-intake-field-readiness", seedKind: "field-evidence-readiness-states", seedFields: ["passed", "failed", "blocked", "notRun", "credentialCanary"],
    bodyAssertions: [["evidenceIntakeFieldReadiness.schema", "equals", "media-server.ops.evidence-intake-field-readiness.v1"], ["evidenceIntakeFieldReadiness.items", "contains-four-states", true], ["$body", "not-contains-seed-credential-canary", true]],
    domChecks: [["states-equal-response", "passed/failed/blocked/not-run", true], ["not-contains-seed-credential-canary", "credentialCanary", true]],
  }),
  reviewProjectionSpec("EVT-058", {
    featureMeaning: "incident-linked runtime evidence window renders only bounded samples and never claims long-run PASS",
    selector: "#opsRuntimeEvidenceWindowRows [data-runtime-evidence-event=evt-058-review4-fixture]", semanticTarget: "runtime-evidence-window", seedKind: "incident-runtime-window", seedFields: ["eventId", "sourceId", "samples", "windowStartMs", "windowEndMs"],
    bodyAssertions: [["runtimeEvidenceWindow.schema", "equals", "media-server.ops.runtime-evidence-window.v1"], ["runtimeEvidenceWindow.items", "contains-fixture-window", true], ["runtimeEvidenceWindow.contract.longTermStorageAdded", "equals", false], ["runtimeEvidenceWindow.contract.longrunPassClaimed", "equals", false]],
    domChecks: [["window-fields-equal-response", "eventId/sourceId/samples/window", true], ["history-bounded", "sampleLimit", true], ["does-not-claim-longrun-pass", "30/120", true]],
  }),
  reviewProjectionSpec("EVT-061", {
    featureMeaning: "operator feature correction persists only in review and audit and renders exact correction and reanalysis state",
    visibleSelector: "[data-event-review-row][data-event-id=evt-061-review4-fixture] [data-event-review-save]",
    selector: "#opsV310OperatorFeatureCorrectionRows [data-operator-feature-correction-event=evt-061-review4-fixture]", semanticTarget: "operator-feature-correction", seedKind: "event-and-baseline-review", seedFields: ["correctedFeatureLabel", "featureAliases", "reanalysisRequested", "reanalysisReason"], actionKind: "persisted-mutation",
    steps: ["capture-before-snapshots", "seed-event-and-review", "submit-feature-correction-put", "capture-after-snapshots", "read-item", "read-audit", "restore-byte-exact"],
    apiAssertions: [
      api("PUT", "/ops/api/events/reviews/evt-061-review4-fixture", body(["review.featureCorrection", "equals-request", true], ["audit.action", "equals", "operator-feature-correction-update"])),
      api("GET", "/ops/api/events/reviews/evt-061-review4-fixture", body(["review.featureCorrection", "equals-put-response", true], ["operatorFeatureCorrection", "equals-review-projection", true])),
      api("GET", "/ops/api/audit?eventId=evt-061-review4-fixture", body(["items", "contains-action", "operator-feature-correction-update"], ["items", "contains-fixture-event", true])),
    ],
    domAssertions: [dom("#opsV310OperatorFeatureCorrectionRows [data-operator-feature-correction-event=evt-061-review4-fixture]", ["fields-equal-readback", "label/aliases/reanalysis/reason", true], ["audit-action-observed", "operator-feature-correction-update", true])],
    allowedStateChanges: ["ops-review", "ops-audit"], stateSnapshots: [snap("ops-review", "restore"), snap("ops-audit", "restore"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["review-jsonl-restored", "audit-jsonl-restored", "event-rule-profile-hashes-unchanged"] },
  }),
  reviewProjectionSpec("EVT-064", {
    featureMeaning: "unified resolution queue, selected detail, and timeline exactly project EventRecord and Ops resolution state",
    selector: "#opsV320ResolutionQueue [data-v320-resolution-event=evt-064-review4-fixture]", semanticTarget: "unified-resolution-workspace", seedKind: "two-resolution-states", seedFields: ["selectedEventId", "resolutionStatus", "resolutionReason", "timelineMarkers"],
    bodyAssertions: [["unifiedResolutionWorkspace.schema", "equals", "media-server.ops.unified-resolution-workspace.v1"], ["unifiedResolutionWorkspace.resolutionQueue", "contains-fixture-event", true], ["unifiedResolutionWorkspace.resolutionDetail", "contains-fixture-detail", true], ["unifiedResolutionWorkspace.resolutionTimeline", "contains-fixture-markers", true]],
    domAssertions: [dom("#opsV320ResolutionQueue [data-v320-resolution-event=evt-064-review4-fixture]", ["queue-fields-equal-response", "status/reason", true]), dom("#opsV320ResolutionDetail [data-v320-resolution-detail=evt-064-review4-fixture]", ["detail-sections-equal-response", "detailSections", true]), dom("#opsV320ResolutionTimeline [data-v320-resolution-timeline-marker]", ["marker-order-equals-response", "timelineMarkers", true])],
  }),
  reviewProjectionSpec("EVT-065", {
    featureMeaning: "evidence quality derives completeness, confidence, and replay coverage only from EventRecord evidence and review state",
    selector: "#v320EvidenceQualityGrid [data-v320-evidence-quality=evt-065-review4-fixture]", semanticTarget: "resolution-evidence-quality", seedKind: "complete-and-incomplete-evidence", seedFields: ["evidenceRefs", "reviewState", "expectedCompleteness", "expectedConfidence", "expectedReplayCoverage"],
    bodyAssertions: [["unifiedResolutionWorkspace.evidenceQuality", "contains-fixture-quality", true], ["unifiedResolutionWorkspace.evidenceQuality[].completeness", "equals-seed-derivation", true], ["unifiedResolutionWorkspace.evidenceQuality[].confidence", "equals-seed-derivation", true]],
    domChecks: [["fields-equal-response", "completeness/confidence/replayCoverageHint", true], ["selected-event-equals", "evt-065-review4-fixture", true]],
  }),
  reviewProjectionSpec("EVT-066", {
    featureMeaning: "source reliability joins SourceRegistry health and EventRecord source id and exposes exact failure context and recheck hint",
    selector: "#v320SourceReliabilityGrid [data-v320-source-reliability=evt-066-review4-fixture]", semanticTarget: "source-reliability", seedKind: "healthy-and-failed-source-events", seedFields: ["sourceId", "sourceHealth", "recentFailureContext", "recheckHint"],
    apiAssertions: [
      api("GET", "/ops/api/events/reviews", body(["unifiedResolutionWorkspace.sourceReliability", "contains-fixture-source", true], ["unifiedResolutionWorkspace.sourceReliability[].recentFailureContext", "equals-seed", true])),
      api("GET", "/ops/api/events/reviews/evt-066-review4-fixture", body(["sourceReliability.sourceId", "equals-seed", true], ["sourceReliability.recheckHint", "equals-seed", true])),
    ],
    domAssertions: [dom("#v320SourceReliabilityGrid [data-v320-source-reliability=evt-066-review4-fixture]", ["fields-equal-item-readback", "health/failureContext/recheckHint", true], ["collection-item-consistent", "sourceReliability", true])],
  }),
  reviewProjectionSpec("EVT-067", {
    featureMeaning: "AI review quality derives correction signal, uncertainty reason, and quality badge from review and event context",
    selector: "#v320AiReviewQualityGrid [data-v320-ai-review-quality=evt-067-review4-fixture]", semanticTarget: "ai-review-quality", seedKind: "corrected-and-uncertain-review", seedFields: ["correctionSignal", "reviewSignal", "uncertaintyReason", "qualityBadge"],
    bodyAssertions: [["unifiedResolutionWorkspace.aiReviewQuality", "contains-fixture-quality", true], ["unifiedResolutionWorkspace.aiReviewQuality[].uncertaintyReason", "equals-seed", true], ["unifiedResolutionWorkspace.aiReviewQuality[].qualityBadge", "equals-seed", true]],
    domChecks: [["fields-equal-response", "correctionSignal/reviewSignal/uncertaintyReason/qualityBadge", true], ["selected-event-equals", "evt-067-review4-fixture", true]],
  }),
  reviewProjectionSpec("EVT-068", {
    featureMeaning: "operator resolution flow persists assignment, note, close/reopen state and exact audit actions only to review and audit",
    visibleSelector: "[data-event-review-row][data-event-id=evt-068-review4-fixture] [data-event-review-save]",
    selector: "#v320OperatorResolutionFlowGrid [data-v320-operator-resolution-flow=evt-068-review4-fixture]", semanticTarget: "operator-resolution-flow", seedKind: "event-and-baseline-resolution", seedFields: ["assignmentTarget", "note", "resolutionStatus", "resolutionReason"], actionKind: "persisted-mutation",
    steps: ["capture-before-snapshots", "seed-event-and-resolution", "submit-resolution-flow-put", "capture-after-snapshots", "read-item", "read-audit", "restore-byte-exact"],
    apiAssertions: [
      api("PUT", "/ops/api/events/reviews/evt-068-review4-fixture", body(["operatorResolutionFlow", "equals-requested-resolution", true], ["audit.action", "equals", "operator-resolution-flow-update"])),
      api("GET", "/ops/api/events/reviews/evt-068-review4-fixture", body(["operatorResolutionFlow", "equals-put-response", true], ["operatorResolutionFlow.closeReopenAvailability", "object", true])),
      api("GET", "/ops/api/audit?eventId=evt-068-review4-fixture", body(["items", "contains-action", "operator-resolution-flow-update"], ["items", "contains-resolution-transition", true])),
    ],
    domAssertions: [dom("#v320OperatorResolutionFlowGrid [data-v320-operator-resolution-flow=evt-068-review4-fixture]", ["fields-equal-readback", "assignment/note/closeReopen/auditActions", true], ["save-completion-bound-to-put", "evt-068-review4-fixture", true])],
    allowedStateChanges: ["ops-review", "ops-audit"], stateSnapshots: [snap("ops-review", "restore"), snap("ops-audit", "restore"), ...STATE_BOUNDARIES.map(scope => snap(scope))],
    cleanup: { required: true, strategy: "restore-byte-exact-snapshots", assertions: ["review-jsonl-restored", "audit-jsonl-restored", "event-and-transport-hashes-unchanged"] },
  }),
  reviewProjectionSpec("EVT-069", {
    featureMeaning: "action readiness checklist derives rule draft, evidence bundle, and notification blockers from exact resolution context",
    selector: "#v320ActionReadinessChecklistGrid [data-v320-action-readiness-checklist=evt-069-review4-fixture]", semanticTarget: "action-readiness-checklist", seedKind: "readiness-context-combinations", seedFields: ["evidenceQuality", "sourceReliability", "aiReviewQuality", "operatorResolutionFlow"],
    bodyAssertions: [["unifiedResolutionWorkspace.actionReadinessChecklist", "contains-fixture-checklist", true], ["unifiedResolutionWorkspace.actionReadinessChecklist[].readiness", "equals-seed-derivation", true], ["unifiedResolutionWorkspace.actionReadinessChecklist[].blockers", "equals-seed-derivation", true]],
    domChecks: [["fields-equal-response", "ruleDraft/evidenceBundle/notification/blockers", true], ["selected-event-equals", "evt-069-review4-fixture", true]],
  }),
  reviewProjectionSpec("EVT-070", {
    featureMeaning: "resolution search metrics exactly summarize active filters, saved-view matches, and operational counts from the reviews query",
    selector: "#v320ResolutionSearchMetricsGrid [data-v320-resolution-search-metrics]", semanticTarget: "resolution-search-metrics", seedKind: "filtered-resolution-search", seedFields: ["q", "ruleId", "sourceId", "incidentStatus", "savedView"],
    apiPath: "/ops/api/events/reviews?q={q}&ruleId={ruleId}&sourceId={sourceId}&incidentStatus={incidentStatus}",
    bodyAssertions: [["unifiedResolutionWorkspace.resolutionSearchMetrics.activeFilters", "equals-request", true], ["unifiedResolutionWorkspace.resolutionSearchMetrics.savedViewMatches", "equals-seed", true], ["unifiedResolutionWorkspace.resolutionSearchMetrics.summary", "counts-equal-records", true]],
    domChecks: [["fields-equal-response", "activeFilters/savedViewMatches/summary", true], ["filter-query-bound-to-request", "q/ruleId/sourceId/incidentStatus", true]],
  }),
  reviewProjectionSpec("EVT-071", {
    featureMeaning: "incident source correlation derives source cause, closure impact, and correlation signal from resolution and source audit state",
    selector: "#v330IncidentSourceCorrelationGrid [data-v330-incident-source-correlation=evt-071-review4-fixture]", semanticTarget: "incident-source-correlation", seedKind: "source-failure-close-handoff", seedFields: ["sourceCause", "closureImpact", "correlationSignal", "auditHandoff"],
    bodyAssertions: [["unifiedResolutionWorkspace.incidentSourceCorrelation", "contains-fixture-correlation", true], ["unifiedResolutionWorkspace.incidentSourceCorrelation[].sourceCause", "equals-seed", true], ["unifiedResolutionWorkspace.incidentSourceCorrelation[].correlationSignal", "equals-seed", true]],
    domChecks: [["fields-equal-response", "sourceCause/closureImpact/correlationSignal", true], ["selected-event-equals", "evt-071-review4-fixture", true]],
  }),
  reviewProjectionSpec("EVT-072", {
    featureMeaning: "operator recheck recovery queue contains failed sources only with retry, recovery, dry-run, and note linkage",
    selector: "#v330OperatorRecheckRecoveryQueueGrid [data-v330-operator-recheck-recovery-queue=evt-072-review4-fixture]", semanticTarget: "operator-recheck-recovery-queue", seedKind: "failed-and-healthy-recheck-candidates", seedFields: ["failedSource", "healthySource", "retryCandidate", "recoveryChecklist", "dryRunStatus", "operatorNote"],
    bodyAssertions: [["unifiedResolutionWorkspace.operatorRecheckRecoveryQueue", "contains-fixture-failed-source", true], ["unifiedResolutionWorkspace.operatorRecheckRecoveryQueue", "excludes-healthy-source", true], ["unifiedResolutionWorkspace.operatorRecheckRecoveryQueue[].recoveryChecklist", "equals-seed", true]],
    domChecks: [["fields-equal-response", "retryCandidate/recoveryChecklist/dryRunStatus/operatorNoteLink", true], ["healthy-source-absent", "healthySource", true]],
  }),
  reviewProjectionSpec("EVT-075", {
    featureMeaning: "selected resolution detail exposes a read-only incident-to-command handoff without EventRecord or audit writes",
    selector: "#v350IncidentCommandHandoffGrid [data-v350-incident-command-handoff=evt-075-review4-fixture]", semanticTarget: "incident-command-handoff", seedKind: "selected-command-handoff", seedFields: ["sourceCause", "continuityDrillCandidate", "commandPlanDraft"],
    apiPath: "/ops/api/events/reviews?selectedEventId=evt-075-review4-fixture",
    bodyAssertions: [["unifiedResolutionWorkspace.incidentCommandHandoff", "contains-fixture-handoff", true], ["unifiedResolutionWorkspace.incidentCommandHandoff[].sourceCause", "equals-seed", true], ["unifiedResolutionWorkspace.incidentCommandHandoff[].commandPlanDraft", "equals-seed", true]],
    domChecks: [["fields-equal-response", "sourceCause/continuityDrillCandidate/commandPlanDraft", true], ["read-only", "no-action-control", true]],
    stateSnapshots: [snap("event-record", "equal"), snap("ops-audit", "equal"), ...STATE_BOUNDARIES.filter(scope => scope !== "event-record").map(scope => snap(scope))],
  }),
);

const eventOracleCatalog = deepFreeze(Object.fromEntries(specs.map(spec => [spec.caseId, spec])));

function catalogEntries(catalog) {
  if (catalog instanceof Map) return [...catalog.entries()];
  if (Array.isArray(catalog)) return catalog.map(spec => [spec?.caseId, spec]);
  if (catalog && typeof catalog === "object") return Object.entries(catalog);
  throw new Error("event exact oracle catalog must be an object, array, or Map");
}

function validateBodyAssertions(spec, errors) {
  if (!Array.isArray(spec.apiAssertions) || spec.apiAssertions.length === 0) {
    errors.push(`${spec.caseId}: apiAssertions are required`);
    return;
  }
  for (const assertion of spec.apiAssertions) {
    if (!assertion || !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(assertion.method)) {
      errors.push(`${spec.caseId}: API method is invalid`);
    }
    if (!String(assertion?.path || "").startsWith("/")) errors.push(`${spec.caseId}: API path is invalid`);
    if (assertion?.method === "GET" && ["/ops/events", "/ops/dashboard"].includes(assertion?.path)) {
      errors.push(`${spec.caseId}: generic product page GET cannot be used as feature readback`);
    }
    if (!Array.isArray(assertion?.allowedStatuses) || assertion.allowedStatuses.length === 0) {
      errors.push(`${spec.caseId}: API allowedStatuses are required`);
    }
    if (!assertion?.correlationRequired) errors.push(`${spec.caseId}: API correlation is required`);
    if (!Array.isArray(assertion?.bodyAssertions) || assertion.bodyAssertions.length < 2) {
      errors.push(`${spec.caseId}: GET/status-only oracle is forbidden; at least two body assertions are required`);
    } else if (!assertion.bodyAssertions.some(item => item?.path && item.path !== "status" && item.path !== "$status")) {
      errors.push(`${spec.caseId}: API oracle must assert feature-specific response fields`);
    }
  }
}

function validateDomAssertions(spec, errors) {
  if (!spec.visibleControl?.selector || !spec.visibleControl?.semanticTarget) {
    errors.push(`${spec.caseId}: visibleControl selector and semanticTarget are required`);
  }
  if (!Array.isArray(spec.domAssertions) || spec.domAssertions.length === 0) {
    errors.push(`${spec.caseId}: domAssertions are required`);
    return;
  }
  const meaningful = spec.domAssertions.some(item => Array.isArray(item?.assertions) && item.assertions.some(assertion =>
    assertion?.operator && !WEAK_DOM_OPERATORS.has(assertion.operator) && assertion?.target !== undefined));
  if (!meaningful) errors.push(`${spec.caseId}: exists/visible-only DOM oracle is forbidden`);
  for (const item of spec.domAssertions) {
    if (!item?.selector || !Array.isArray(item.assertions) || item.assertions.length === 0) {
      errors.push(`${spec.caseId}: each DOM assertion needs a selector and semantic assertions`);
    }
  }
}

function validateMutation(spec, errors) {
  if (!MUTATION_CASE_IDS.has(spec.caseId)) return;
  if (spec.action?.kind !== "persisted-mutation") errors.push(`${spec.caseId}: mutation case must use persisted-mutation action`);
  const methods = new Set((spec.apiAssertions || []).map(item => item.method));
  if (!["POST", "PUT", "PATCH", "DELETE"].some(method => methods.has(method))) errors.push(`${spec.caseId}: mutation request is missing`);
  if (!methods.has("GET")) errors.push(`${spec.caseId}: independent GET readback is missing`);
  if (!(spec.apiAssertions || []).some(item => item.path.startsWith("/ops/api/audit"))) errors.push(`${spec.caseId}: audit readback is missing`);
  const scopes = new Map((spec.stateSnapshots || []).map(item => [item.scope, item]));
  if (![...scopes.values()].some(item => item.policy === "restore")) errors.push(`${spec.caseId}: before/after restore snapshot is missing`);
  if (spec.cleanup?.strategy !== "restore-byte-exact-snapshots") errors.push(`${spec.caseId}: byte-exact restore cleanup is required`);
  for (const token of ["before", "after", "audit", "restore"]) {
    if (!(spec.action?.steps || []).some(step => String(step).includes(token))) errors.push(`${spec.caseId}: mutation ${token} action step is missing`);
  }
}

export function validateEventExactOracleCatalog(catalog = eventOracleCatalog) {
  const errors = [];
  const entries = catalogEntries(catalog);
  const ids = entries.map(([id]) => id);
  if (ids.length !== EVENT_CASE_IDS.length) errors.push(`event oracle count must be ${EVENT_CASE_IDS.length}, got ${ids.length}`);
  if (new Set(ids).size !== ids.length) errors.push("duplicate event oracle caseId");
  for (const id of EVENT_CASE_IDS) if (!ids.includes(id)) errors.push(`${id}: oracle is missing`);
  for (const id of ids) if (!EVENT_CASE_IDS.includes(id)) errors.push(`${id}: unexpected event oracle`);

  for (const [id, spec] of entries) {
    if (!spec || spec.caseId !== id) {
      errors.push(`${id}: catalog key and caseId mismatch`);
      continue;
    }
    if (spec.schema !== "media-server.v390-ui-exact-event-oracle.v1") errors.push(`${id}: schema mismatch`);
    if (!spec.featureMeaning || String(spec.featureMeaning).length < 24) errors.push(`${id}: featureMeaning is too weak`);
    if (!spec.route?.startsWith("/") || !spec.canonicalRoute?.startsWith("/")) errors.push(`${id}: route binding is invalid`);
    if (spec.role !== "operator") errors.push(`${id}: primary role must be operator`);
    if (spec.expectedBehavior !== spec.featureMeaning) errors.push(`${id}: expectedBehavior must bind the audited feature meaning`);
    if (spec.seed?.fixtureId !== "{fixtureId}") errors.push(`${id}: seed fixtureId must use the {fixtureId} placeholder`);
    if (!spec.seed?.kind || !spec.seed?.fixtureId || !Array.isArray(spec.seed?.requiredFields) || spec.seed.requiredFields.length === 0) errors.push(`${id}: exact seed contract is required`);
    if (!spec.action?.kind || !Array.isArray(spec.action?.steps) || spec.action.steps.length < 3) errors.push(`${id}: multi-step semantic action is required`);
    validateBodyAssertions(spec, errors);
    validateDomAssertions(spec, errors);
    if (!Array.isArray(spec.requests) || spec.requests.length !== spec.apiAssertions.length ||
        !spec.requests.every(item => Array.isArray(item.requiredJsonPaths) && item.requiredJsonPaths.length >= 2 &&
          Array.isArray(item.forbiddenJsonKeys) && item.forbiddenJsonKeys.length > 0)) {
      errors.push(`${id}: runner requests contract is incomplete`);
    }
    if (!Array.isArray(spec.dom) || spec.dom.length !== spec.domAssertions.length ||
        !spec.dom.every(item => item.selector && Array.isArray(item.requiredTextTokens) &&
          Array.isArray(item.forbiddenTextTokens) && Array.isArray(item.requiredAttributes) && Array.isArray(item.assertions))) {
      errors.push(`${id}: runner DOM contract is incomplete`);
    }
    if (!Array.isArray(spec.forbidden?.responseFields) || spec.forbidden.responseFields.length === 0 ||
        !Array.isArray(spec.forbidden?.networkMutations) || spec.forbidden.networkMutations.length === 0 ||
        !Array.isArray(spec.forbidden?.stateChanges) || spec.forbidden.stateChanges.length === 0) {
      errors.push(`${id}: forbidden field/network/state boundaries are required`);
    }
    if (!Array.isArray(spec.stateSnapshots) || spec.stateSnapshots.length === 0 ||
        !spec.stateSnapshots.every(item => item.before === true && item.after === true)) {
      errors.push(`${id}: before/after state snapshots are required`);
    }
    if (spec.cleanup?.required !== true || !spec.cleanup?.strategy || !Array.isArray(spec.cleanup?.assertions) || spec.cleanup.assertions.length === 0 ||
        !Array.isArray(spec.cleanup?.targets) || spec.cleanup.targets.length === 0) {
      errors.push(`${id}: cleanup contract is required`);
    }
    if (!Array.isArray(spec.forbiddenNetwork) || spec.forbiddenNetwork.length === 0 ||
        !spec.forbiddenNetwork.every(item => item.method && item.path)) errors.push(`${id}: runner forbiddenNetwork contract is incomplete`);
    if (JSON.stringify(spec).match(/evt-\d{3}-review4-fixture/)) errors.push(`${id}: fixed fixture id leaked; use {fixtureId}`);
    validateMutation(spec, errors);
  }

  const corrected = {
    "EVT-004": ["/ops/dashboard", "#dashIncidentTimelineSource"],
    "EVT-016": ["/ops/events", "#eventStorageBadges"],
    "EVT-018": ["/ops/events", "#alertDeliveryTest"],
    "EVT-022": ["/ops/events", "#event-review-audit-list"],
    "EVT-023": ["/ops/dashboard", "#dashIncidentTimeline"],
    "EVT-049": ["/ops/events", "#eventRecordRows"],
    "EVT-058": ["/ops/events", "#opsRuntimeEvidenceWindowRows"],
  };
  const byId = new Map(entries);
  for (const [id, [screen, selectorPrefix]] of Object.entries(corrected)) {
    const spec = byId.get(id);
    if (spec?.route !== screen || !String(spec?.visibleControl?.selector || "").startsWith(selectorPrefix)) {
      errors.push(`${id}: audited route/selector correction regressed`);
    }
  }
  if (!byId.get("EVT-023")?.additionalRoles?.includes("viewer")) errors.push("EVT-023: viewer role readback is required");

  if (errors.length) throw new Error(`invalid exact event oracle catalog:\n- ${errors.join("\n- ")}`);
  return deepFreeze({ schema: "media-server.v390-ui-exact-event-oracle-validation.v1", caseCount: entries.length, mutationCaseCount: MUTATION_CASE_IDS.size, valid: true });
}

export function eventExactOracleFor(caseId) {
  const spec = eventOracleCatalog[String(caseId || "")];
  if (!spec) throw new Error(`unknown exact event oracle caseId: ${caseId}`);
  return spec;
}

export function eventExactOracleCaseIds() {
  return EVENT_CASE_IDS;
}
