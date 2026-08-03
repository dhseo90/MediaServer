// 파일 용도: V390 exact 424 중 CLIENT/MEDIA/SAFE 87개를 기능 의미에 결속한 immutable runtime oracle catalog.

const expectedCaseIds = Object.freeze([
  "CLIENT-001", "CLIENT-002", "CLIENT-005", "CLIENT-006", "CLIENT-007", "CLIENT-009",
  "CLIENT-010", "CLIENT-011", "CLIENT-012", "CLIENT-013", "CLIENT-014", "CLIENT-015",
  "CLIENT-016", "CLIENT-017", "CLIENT-018", "CLIENT-019", "CLIENT-020", "CLIENT-021",
  "CLIENT-022", "CLIENT-023", "CLIENT-024", "CLIENT-025", "CLIENT-027", "CLIENT-028",
  "CLIENT-029", "CLIENT-031", "CLIENT-032", "CLIENT-040", "CLIENT-041", "CLIENT-042",
  "MEDIA-016", "MEDIA-017",
  "SAFE-015", "SAFE-016", "SAFE-017", "SAFE-018", "SAFE-019", "SAFE-020", "SAFE-021",
  "SAFE-024", "SAFE-028", "SAFE-031", "SAFE-033", "SAFE-038", "SAFE-041", "SAFE-042",
  "SAFE-045", "SAFE-046", "SAFE-047", "SAFE-048", "SAFE-049", "SAFE-050", "SAFE-052",
  "SAFE-053", "SAFE-054", "SAFE-055", "SAFE-056", "SAFE-058", "SAFE-059", "SAFE-060",
  "SAFE-061", "SAFE-062", "SAFE-065", "SAFE-066", "SAFE-067", "SAFE-068", "SAFE-069",
  "SAFE-098", "SAFE-104", "SAFE-105", "SAFE-106", "SAFE-107", "SAFE-108", "SAFE-109",
  "SAFE-110", "SAFE-111", "SAFE-117", "SAFE-118", "SAFE-119", "SAFE-121", "SAFE-122",
  "SAFE-129", "SAFE-130", "SAFE-131", "SAFE-132", "SAFE-138", "SAFE-140",
]);

const rootSelectorFor = route => route === "/client/live"
  ? '[data-testid="client-live-workspace"]'
  : (route === "/client/dashboard"
      ? '[data-testid="client-dashboard-shell"]'
      : (route === "/client/events"
          ? ".client-viewer-events"
          : (route === "/ops/events"
              ? "body.ops-shell"
              : (route === "/ops/sources" ? "body.ops-shell" : '[data-testid="ops-home-page"]'))));

function api(method, path, statuses, {
  schema = null,
  requiredTokens = [],
  requiredFixtureBindings = [],
  forbiddenFields = [],
  cardinality = null,
} = {}) {
  const responseSchema = schema || (/\/(?:client|ops)\/api\/|\/lab\/analysis\//.test(path) ? "json" : "html");
  return {
    method,
    path,
    statuses,
    schema: responseSchema,
    requiredTokens,
    requiredFixtureBindings,
    forbiddenFields,
    cardinality,
  };
}

function dom(selector, property, operator, value) {
  return { selector, property, operator, value };
}

function exactSpec(caseId, featureMeaning, {
  route,
  role,
  visibleControl = rootSelectorFor(route),
  action = { kind: "assert-read-model", target: visibleControl },
  fixtures = [],
  apiAssertions,
  domAssertions,
  semanticKeys,
  forbiddenFields = [],
  forbiddenNetwork = [],
  forbiddenStateMutations = [],
  snapshotTargets = [],
  cleanupTargets = [],
}) {
  const normalizedAction = normalizeFixturePlaceholders(action);
  const comparison = forbiddenStateMutations.length > 0 ? "equal-for-forbidden-targets" : "semantic-readback";
  const requests = apiAssertions.map(request => {
    const jsonBinding = request.schema === "html" ? { paths: [], assertions: [], values: [] }
      : buildJsonBinding(request.requiredTokens);
    const fixtureBindings = request.schema === "html"
      ? []
      : (request.requiredFixtureBindings || []).map(binding => ({
          path: binding.path,
          operator: "equals-fixture",
          value: "{fixtureId}",
          fixtureRef: binding.fixtureRef,
        }));
    const forbiddenJsonBinding = request.schema === "html"
      ? { keys: request.forbiddenFields, values: [] }
      : buildForbiddenJsonBinding(request.forbiddenFields);
    return normalizeFixturePlaceholders({
      method: request.method,
      path: request.path,
      fixtureRefs: fixtureRefsFor(request.path),
      allowedStatuses: request.statuses,
      responseSchema: request.schema,
      requiredJsonPaths: [...new Set([
        ...jsonBinding.paths,
        ...fixtureBindings.map(binding => binding.path),
      ])],
      jsonAssertions: [...jsonBinding.assertions, ...fixtureBindings],
      requiredJsonValues: jsonBinding.values,
      requiredBodyTokens: request.schema === "html" ? request.requiredTokens : [],
      forbiddenJsonKeys: forbiddenJsonBinding.keys,
      forbiddenJsonValues: forbiddenJsonBinding.values,
      cardinality: request.cardinality,
    });
  });
  const normalizedDom = domAssertions.map(assertion => {
    const textAssertion = assertion.property === "text" && ["includes", "includesAll", "excludesAll"].includes(assertion.operator);
    const materialAssertion = assertion.property === "structuredMaterial" && assertion.operator === "excludesAll";
    const attributeName = domAttributeName(assertion.property);
    return normalizeFixturePlaceholders({
      selector: assertion.selector,
      fixtureRefs: fixtureRefsFor(assertion.selector),
      requiredTextTokens: textAssertion && assertion.operator !== "excludesAll"
        ? (Array.isArray(assertion.value) ? assertion.value : [assertion.value])
        : [],
      forbiddenTextTokens: textAssertion && assertion.operator === "excludesAll"
        ? (Array.isArray(assertion.value) ? assertion.value : [assertion.value])
        : [],
      forbiddenMaterialTokens: materialAssertion
        ? (Array.isArray(assertion.value) ? assertion.value : [assertion.value])
        : [],
      cardinality: assertion.property === "count"
        ? { operator: assertion.operator, value: assertion.value }
        : null,
      requiredAttributes: attributeName
        ? [{ name: attributeName, operator: assertion.operator, value: assertion.value }]
        : [],
      propertyAssertions: !textAssertion && !materialAssertion && assertion.property !== "count" && !attributeName
        ? [{ name: assertion.property, operator: assertion.operator, value: assertion.value }]
        : [],
      valueFixtureRefs: fixtureRefsInValue(assertion.value),
    });
  });
  return normalizeFixturePlaceholders({
    schema: "media-server.v390-ui-client-safe-exact-oracle.v1",
    caseId,
    featureMeaning,
    expectedBehavior: featureMeaning,
    semanticKeys,
    route,
    role,
    setup: { fixtures },
    visibleControl: {
      selector: visibleControl,
      fixtureRefs: fixtureRefsFor(visibleControl),
      action: normalizedAction,
      actionFixtureRefs: fixtureRefsFor(action.target),
      actionValueFixtureRefs: fixtureRefsInValue(actionWithoutTarget(action)),
      expectedVisible: true,
      expectedEnabled: action.kind !== "assert-absence",
    },
    action: normalizedAction,
    requests,
    dom: normalizedDom,
    forbiddenFields,
    forbiddenNetwork: forbiddenNetwork.map(normalizeForbiddenNetwork),
    forbiddenStateMutations,
    stateSnapshots: snapshotTargets.map(target => ({ target, before: "capture", after: "capture", comparison })),
    cleanup: {
      strategy: cleanupTargets.length > 0 ? "restore-owned-fixtures-and-assert-absence" : "assert-no-owned-state-remains",
      targets: cleanupTargets,
      assertions: ["owned-fixtures-absent-or-restored", "browser-session-closed", "no-orphan-media-session"],
    },
  });
}

function normalizeForbiddenNetwork(value) {
  if (value && typeof value === "object") return normalizeFixturePlaceholders(value);
  const text = String(value || "").trim();
  const request = /^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/.exec(text);
  if (request) return { method: request[1], path: request[2], match: request[2].endsWith("/") ? "prefix" : "exact-or-prefix" };
  const external = /^external:(.+)$/.exec(text);
  if (external) return { method: "EXTERNAL", path: external[1], match: "capability" };
  return { method: "FORBID", path: text, match: "capability" };
}

function fixtureRefsFor(value) {
  return [...String(value || "").matchAll(/\{([^}]+)\}/g)].map(match => fixtureRefForName(match[1]));
}

function fixtureRefsInValue(value) {
  if (typeof value === "string") return fixtureRefsFor(value);
  if (Array.isArray(value)) return value.flatMap(fixtureRefsInValue);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(fixtureRefsInValue);
}

function countFixturePlaceholders(value) {
  if (typeof value === "string") return (value.match(/\{fixtureId\}/g) || []).length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countFixturePlaceholders(item), 0);
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).reduce((sum, item) => sum + countFixturePlaceholders(item), 0);
}

function fixtureRefForName(value) {
  const known = {
    assignedViewId: "assigned-view",
    blockedViewId: "blocked-view",
    sessionId: "active-session",
    viewA: "assigned-view-a",
    viewB: "assigned-view-b",
    draftId: "vlm-rule-suggestion-draft",
    draftCandidateId: "vlm-rule-suggestion-draft",
    candidateId: "vlm-summary-candidate",
    eventId: "event-record",
    searchQuery: "event-search-query",
    vaMetadataSampleId: "va-metadata-sample",
  };
  if (known[value]) return known[value];
  return String(value).replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
}

function buildJsonBinding(tokens) {
  const paths = [];
  const assertions = [];
  const values = [];
  for (const rawToken of tokens || []) {
    const token = String(rawToken);
    const fixtureBinding = jsonFixtureBinding(token);
    if (fixtureBinding) {
      paths.push(fixtureBinding.path);
      assertions.push({
        path: fixtureBinding.path,
        operator: "equals-fixture",
        value: "{fixtureId}",
        fixtureRef: fixtureBinding.fixtureRef,
      });
      continue;
    }
    const comparison = /^([A-Za-z_][A-Za-z0-9_.]*)=(.+)$/.exec(token);
    if (comparison) {
      const path = jsonPathFor(comparison[1]);
      paths.push(path);
      assertions.push({ path, operator: "equals", value: parseExpectedValue(comparison[2]) });
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(token)) {
      const path = jsonPathFor(token);
      paths.push(path);
      assertions.push({ path, operator: "exists", value: true });
      continue;
    }
    values.push({ operator: "contains-value", value: token });
  }
  return { paths: [...new Set(paths)], assertions, values };
}

function jsonFixtureBinding(token) {
  const known = {
    assignedViewId: { path: "$..viewId", fixtureRef: "assigned-view" },
    blockedViewId: { path: "$..viewId", fixtureRef: "blocked-view" },
    draftId: { path: "$..draftId", fixtureRef: "vlm-rule-suggestion-draft" },
    draftCandidateId: { path: "$..ruleSuggestion.candidateId", fixtureRef: "vlm-rule-suggestion-draft" },
    candidateId: { path: "$..candidateId", fixtureRef: "vlm-summary-candidate" },
    vaMetadataSampleId: { path: "$..sampleId", fixtureRef: "va-metadata-sample" },
  };
  return known[token] || null;
}

function buildForbiddenJsonBinding(fields) {
  const keys = [];
  const values = [];
  for (const field of fields || []) {
    const fixtureBinding = jsonFixtureBinding(String(field));
    if (fixtureBinding) {
      values.push({ operator: "excludes-fixture", value: "{fixtureId}", fixtureRef: fixtureBinding.fixtureRef });
    } else {
      keys.push(field);
    }
  }
  return { keys, values };
}

function jsonPathFor(value) {
  const segments = String(value).split(".").filter(Boolean);
  const prefix = segments[0] === "events" ? "$." : "$..";
  return `${prefix}${segments.join(".")}`;
}

function parseExpectedValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function domAttributeName(property) {
  const mapped = {
    ariaLabel: "aria-label",
    ariaPressed: "aria-pressed",
    ariaLive: "aria-live",
    playsinline: "playsinline",
    href: "href",
  };
  if (mapped[property]) return mapped[property];
  if (String(property).startsWith("data-")) return property;
  return "";
}

function actionWithoutTarget(action) {
  return Object.fromEntries(Object.entries(action || {}).filter(([key]) => key !== "target"));
}

const viewerRawFields = Object.freeze([
  "sourceUrl", "rawLocator", "rawJson", "debugCounters", "credential", "providerResponse",
  "operatorNote", "ruleEditor", "actionControls",
]);
const protocolMutations = Object.freeze([
  "eventPostPayload", "eventRecordSchema", "webrtcDataChannelSchema", "sseMetadataSchema",
  "wsMetadataSchema", "rtspMediaPath", "webrtcMediaPath",
]);
const noWriteNetwork = Object.freeze([
  "POST /lab/analysis/", "PUT /lab/analysis/", "DELETE /lab/analysis/",
  "PUT /ops/api/sources/", "PUT /ops/api/views/", "POST /ops/api/events/reviews",
]);

function clientDigest(caseId, featureMeaning, selector, digestKey, schema, responseFields, route = "/client/events") {
  const rendererAttribute = clientDigestRendererAttribute(digestKey);
  const requiredTokens = digestKey === "incidentDigest"
    ? [
        `events.${digestKey}.schema=media-server.client.incident-digest.v1`,
        `events.${digestKey}.itemCount`,
        `events.${digestKey}.digestItems`,
        "viewerSafe=true",
        ...responseFields,
      ]
    : [digestKey, "viewerSafe=true", ...responseFields];
  return exactSpec(caseId, featureMeaning, {
    route,
    role: "viewer",
    visibleControl: selector,
    fixtures: ["assigned-view", "scoped-event-record", `${digestKey}-projection-input`],
    apiAssertions: [api("GET", "/client/api/views/{assignedViewId}/events", [200], {
      schema,
      requiredTokens,
      forbiddenFields: viewerRawFields,
      requiredFixtureBindings: [{ path: "$..eventId", fixtureRef: "scoped-event-record" }],
    })],
    domAssertions: [
      dom(selector, "count", "equals", 1),
      dom(selector, rendererAttribute, "equals", "viewer-safe"),
      dom("body", "structuredMaterial", "excludesAll", viewerRawFields),
    ],
    semanticKeys: [digestKey, schema],
    forbiddenFields: viewerRawFields,
    forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: [...protocolMutations, "sourceRegistry", "publishedView", "ruleRegistry", "eventRecord"],
    snapshotTargets: ["source-registry", "published-views", "rule-registry", "event-record-store"],
    cleanupTargets: ["scoped-event-record", `${digestKey}-projection-input`],
  });
}

function clientDigestRendererAttribute(digestKey) {
  const attributes = {
    incidentDigest: "data-client-incident-digest",
    followUpDigest: "data-client-followup-digest",
    eventDigest: "data-client-event-digest",
    resolutionDigest: "data-client-resolution-digest",
    sourceStatusDigest: "data-client-source-status-digest",
    maintenanceDigest: "data-client-maintenance-digest",
    clientImpactForecast: "data-client-impact-forecast",
    clientOperationsNotice: "data-client-operations-notice",
    clientActionNoticePreview: "data-client-action-notice-preview",
  };
  assert(attributes[digestKey], `unknown client digest renderer: ${digestKey}`);
  return attributes[digestKey];
}

function hiddenBoundary(caseId, featureMeaning, {
  route = "/ops",
  role = "operator",
  forbiddenSelectors,
  forbiddenFields,
  semanticKeys,
  apiPath = route,
  requiredTokens = [semanticKeys[0]],
}) {
  return exactSpec(caseId, featureMeaning, {
    route,
    role,
    action: { kind: "assert-absence", target: forbiddenSelectors.join(",") },
    apiAssertions: [api("GET", apiPath, [200], {
      requiredTokens,
      forbiddenFields,
    })],
    domAssertions: [
      ...forbiddenSelectors.map(selector => dom(selector, "count", "equals", 0)),
      dom("body", "text", "excludesAll", forbiddenFields),
    ],
    semanticKeys,
    forbiddenFields,
    forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["source-registry", "published-views", "rule-registry", "event-record-store"],
    cleanupTargets: [],
  });
}

function opsBoundary(caseId, featureMeaning, token, {
  route = "/ops",
  role = "operator",
  selector = '[data-testid="ops-home-page"]',
  apiPath = route,
  fixtures = [],
  requiredTokens = [token],
  domRequiredTokens = [],
  forbiddenFields = viewerRawFields,
  forbiddenNetwork = noWriteNetwork,
  forbiddenStateMutations = [...protocolMutations, "sourceRegistry", "publishedView", "ruleRegistry", "eventRecord"],
} = {}) {
  return exactSpec(caseId, featureMeaning, {
    route,
    role,
    visibleControl: selector,
    fixtures,
    apiAssertions: [api("GET", apiPath, [200], {
      requiredTokens,
      forbiddenFields,
    })],
    domAssertions: [
      dom(selector, "count", "equals", 1),
      ...(domRequiredTokens.length > 0
        ? [dom(selector, "textOrAttributes", "includesAll", domRequiredTokens)]
        : []),
      dom("body", "structuredMaterial", "excludesAll", forbiddenFields),
    ],
    semanticKeys: [token, requiredTokens[0]],
    forbiddenFields,
    forbiddenNetwork,
    forbiddenStateMutations,
    snapshotTargets: ["source-registry", "published-views", "rule-registry", "event-record-store", "ops-audit"],
    cleanupTargets: fixtures,
  });
}

const entries = [
  exactSpec("CLIENT-001", "viewer assigned view만 source tree/API에 표시", {
    route: "/client/live", role: "viewer", visibleControl: '[data-testid="client-live-source-tree"]',
    fixtures: ["assigned-view", "blocked-view"],
    apiAssertions: [api("GET", "/client/api/views", [200], { schema: "media-server.client.views", requiredTokens: ["assignedViewId"], forbiddenFields: ["blockedViewId"], cardinality: { views: 1 } })],
    domAssertions: [dom('[data-source-view="{assignedViewId}"]', "count", "equals", 1), dom('[data-source-view="{blockedViewId}"]', "count", "equals", 0)],
    semanticKeys: ["assignedViewId", "blockedViewId"], forbiddenFields: ["blockedViewId"], forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: ["sourceRegistry", "publishedView"], snapshotTargets: ["source-registry", "published-views"], cleanupTargets: ["assigned-view", "blocked-view"],
  }),
  exactSpec("CLIENT-002", "live tile start가 session/answer/video 상태에 결속", {
    route: "/client/live", role: "viewer", visibleControl: '[data-tile="0"] [data-action="toggle-playback"]',
    action: { kind: "start-live-tile", target: '[data-tile="0"] [data-action="toggle-playback"]' }, fixtures: ["idle-live-tile", "assigned-view"],
    apiAssertions: [api("POST", "/client/api/views/{assignedViewId}/webrtc/session", [200], { schema: "media-server.webrtc.session", requiredTokens: ["sessionId", "offerReceived=true"] }), api("POST", "/client/api/views/{assignedViewId}/webrtc/session/{sessionId}/answer", [200], { requiredTokens: ["ok"] })],
    domAssertions: [dom('[data-tile="0"] [data-role="tile-playback-icon"]', "text", "equals", "■"), dom('[data-tile="0"] video', "mediaTrackKinds", "includes", "video")],
    semanticKeys: ["sessionId", "mediaTrackKinds"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: protocolMutations, snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId"],
  }),
  exactSpec("CLIENT-005", "all-stop이 active session을 종료하고 tile을 idle로 복원", {
    route: "/client/live", role: "viewer", visibleControl: "#liveAllStop", action: { kind: "activate", target: "#liveAllStop" },
    fixtures: ["active-live-session"], apiAssertions: [api("DELETE", "/client/api/views/{assignedViewId}/webrtc/session/{sessionId}", [200], { requiredTokens: ["ok"] })],
    domAssertions: [dom('[data-tile="0"] [data-role="tile-playback-icon"]', "text", "equals", "▶"), dom('[data-tile="0"] [data-action="toggle-playback"]', "ariaLabel", "includes", "재생")],
    semanticKeys: ["liveAllStop", "activeSessions=0"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: protocolMutations, snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId"],
  }),
  exactSpec("CLIENT-006", "dashboard가 assigned view의 scoped status/event/source health만 표시", {
    route: "/client/dashboard", role: "viewer", fixtures: ["assigned-view", "blocked-view", "scoped-event-record", "source-health"],
    apiAssertions: [api("GET", "/client/api/views/{assignedViewId}/dashboard", [200], {
      schema: "media-server.client.dashboard",
      requiredTokens: [
        "assignedViewId",
        "health.status",
        "events.incidentDigest.schema=media-server.client.incident-digest.v1",
        "events.incidentDigest.itemCount",
        "events.incidentDigest.digestItems",
      ],
      forbiddenFields: ["blockedViewId", ...viewerRawFields],
    })],
    domAssertions: [dom('[data-testid="client-dashboard-shell"]', "count", "equals", 1), dom("body", "text", "excludesAll", ["blockedViewId", ...viewerRawFields])],
    semanticKeys: ["incidentDigest", "health.status"], forbiddenFields: ["blockedViewId", ...viewerRawFields], forbiddenNetwork: noWriteNetwork,
    forbiddenStateMutations: protocolMutations, snapshotTargets: ["event-record-store", "source-registry"], cleanupTargets: ["scoped-event-record", "source-health"],
  }),
  clientDigest("CLIENT-007", "events page가 viewer scope의 client-safe summaries만 표시", ".client-viewer-events", "incidentDigest", "media-server.client.events", ["summaryText", "eventType", "time"]),
  exactSpec("CLIENT-009", "grid/density/dock preference 저장과 authoritative readback", {
    route: "/client/live", role: "viewer", visibleControl: "#liveSaveLayoutPreference", action: { kind: "activate", target: "#liveSaveLayoutPreference" },
    fixtures: ["before-layout-preference"], apiAssertions: [api("PUT", "/client/api/preferences/live-layout", [200, 201], { schema: "media-server.client.live-layout-preference", requiredTokens: ["gridSize=2", "density=compact", "dockSide=right"] }), api("GET", "/client/api/preferences/live-layout", [200], { requiredTokens: ["gridSize=2", "density=compact", "dockSide=right"] })],
    domAssertions: [dom("#liveGridSize", "value", "equals", "2"), dom('[data-testid="client-live-drop-grid"]', "data-density", "equals", "compact")], semanticKeys: ["gridSize", "dockSide"],
    forbiddenFields: ["password", "token"], forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["client-live-layout-preferences"], cleanupTargets: ["before-layout-preference"],
  }),
  exactSpec("CLIENT-010", "reload 후 persisted live layout preference 복원", {
    route: "/client/live", role: "viewer", fixtures: ["saved-layout-preference"], action: { kind: "reload", target: "/client/live" },
    apiAssertions: [api("GET", "/client/api/preferences/live-layout", [200], { requiredTokens: ["gridSize=2", "density=compact", "dockSide=right"] })],
    domAssertions: [dom("#liveGridSize", "value", "equals", "2"), dom('[data-testid="client-live-drop-grid"]', "data-density", "equals", "compact")], semanticKeys: ["reload-restore", "dockSide=right"],
    forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["client-live-layout-preferences"], cleanupTargets: ["saved-layout-preference"],
  }),
  exactSpec("CLIENT-011", "unassigned view가 list/detail/UI에서 모두 차단", {
    route: "/client/live", role: "viewer", visibleControl: '[data-testid="client-live-source-tree"]', fixtures: ["assigned-view", "blocked-view"],
    apiAssertions: [api("GET", "/client/api/views", [200], { requiredTokens: ["assignedViewId"], forbiddenFields: ["blockedViewId"], cardinality: { views: 1 } }), api("GET", "/client/api/views/{blockedViewId}", [403, 404], { forbiddenFields: ["sourceUrl", "credential"] })],
    domAssertions: [dom('[data-source-view="{blockedViewId}"]', "count", "equals", 0), dom("body", "text", "excludesAll", ["{blockedViewId}"])], semanticKeys: ["unassigned-view", "blockedViewId"],
    forbiddenFields: ["blockedViewId"], forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: ["publishedView"], snapshotTargets: ["published-views"], cleanupTargets: ["assigned-view", "blocked-view"],
  }),
  hiddenBoundary("CLIENT-012", "viewer client shell에 Ops navigation 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ['a[href^="/ops"]'], forbiddenFields: ["Ops navigation", "/ops/home"], semanticKeys: ["client-primary-nav", "ops-nav-absent"] }),
  hiddenBoundary("CLIENT-013", "viewer client shell에 Lab navigation 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ['a[href^="/lab"]'], forbiddenFields: ["Lab navigation", "/lab"], semanticKeys: ["client-primary-nav", "lab-nav-absent"] }),
  hiddenBoundary("CLIENT-014", "client raw JSON/debug details 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["details[data-debug]", "pre.raw-json"], forbiddenFields: ["rawJson", "sourceLocator", "debugCounters"], semanticKeys: ["viewer-safe-no-locator-debug", "raw-json-absent"] }),
  hiddenBoundary("CLIENT-015", "client debugCounters/source URL 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["[data-debug-counter]", "[data-source-url]"], forbiddenFields: ["debugCounters", "sourceUrl"], semanticKeys: ["source-url-hidden", "debug-counters-absent"] }),
  hiddenBoundary("CLIENT-016", "client BBox diagnostics 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["[data-bbox-diagnostics]", "[data-raw-detection]"], forbiddenFields: ["bboxDiagnostics", "rawDetections"], semanticKeys: ["viewer-safe-events", "bbox-diagnostics-absent"] }),
  hiddenBoundary("CLIENT-017", "client rule/profile editor controls 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["#opsRulesComposerSave", "[data-rule-editor]", "[data-profile-editor]"], forbiddenFields: ["ruleEditor", "profileEditor"], semanticKeys: ["client-live-action-reduction", "editor-controls-absent"] }),
  exactSpec("CLIENT-018", "admin client preview banner/state 표시", {
    route: "/client/live", role: "admin", visibleControl: ".client-preview-redaction-strip", fixtures: ["admin-ops-read-session"],
    apiAssertions: [api("GET", "/client/live", [200], { requiredTokens: ["data-admin-preview-state=\"true\"", "관리자 preview"] })],
    domAssertions: [dom(".client-preview-redaction-strip", "data-admin-preview-state", "equals", "true"), dom(".client-preview-redaction-strip", "text", "includes", "관리자 preview")],
    semanticKeys: ["admin-preview", "data-admin-preview-state"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["auth-users"], cleanupTargets: ["admin-ops-read-session"],
  }),
  exactSpec("CLIENT-019", "video viewport가 실제 video track을 재생하고 clipping 없음", {
    route: "/client/live", role: "viewer", visibleControl: '[data-tile="0"] video', action: { kind: "start-live-tile", target: '[data-tile="0"] [data-action="toggle-playback"]' }, fixtures: ["assigned-view", "playable-source"],
    apiAssertions: [api("POST", "/client/api/views/{assignedViewId}/webrtc/session", [200], { requiredTokens: ["sessionId", "offerReceived=true"] })],
    domAssertions: [dom('[data-tile="0"] video', "mediaTrackKinds", "includes", "video"), dom('[data-tile="0"]', "boundingRectWithinViewport", "equals", true), dom('[data-tile="0"] video', "playsinline", "equals", true)],
    semanticKeys: ["videoTrack", "boundingRectWithinViewport"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId", "playable-source"],
  }),
  exactSpec("CLIENT-020", "start/stop/reconnect controls가 session lifecycle과 결속", {
    route: "/client/live", role: "viewer", visibleControl: '[data-tile="0"] [data-action="toggle-playback"]', action: { kind: "control-sequence", target: "start-stop-reconnect" }, fixtures: ["assigned-view", "playable-source"],
    apiAssertions: [api("POST", "/client/api/views/{assignedViewId}/webrtc/session", [200], { requiredTokens: ["sessionId"] }), api("DELETE", "/client/api/views/{assignedViewId}/webrtc/session/{sessionId}", [200], { requiredTokens: ["ok"] })],
    domAssertions: [dom('[data-tile="0"] [data-action="toggle-playback"]', "ariaLabelSequence", "equals", ["타일 1 정지", "타일 1 재생", "타일 1 정지"]), dom('[data-tile="0"] video', "pausedSequence", "equals", [false, true, false])],
    semanticKeys: ["start-stop-reconnect", "pausedSequence"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId", "playable-source"],
  }),
  exactSpec("CLIENT-021", "VA overlay toggle/status/metadata가 같은 mode에 결속", {
    route: "/client/live", role: "viewer", visibleControl: '[data-tile="0"] [data-mode-action="va-overlay"]', action: { kind: "activate", target: '[data-tile="0"] [data-mode-action="va-overlay"]' }, fixtures: ["assigned-view", "va-metadata-sample"],
    apiAssertions: [
      api("POST", "/client/api/views/{assignedViewId}/webrtc/session", [200], { requiredTokens: ["overlayMode=va-overlay", "sessionId"] }),
      api("GET", "/client/api/views/{assignedViewId}/events?limit=6", [200], {
        requiredTokens: ["eventType=presence", "status=open"],
        requiredFixtureBindings: [{ path: "$..eventId", fixtureRef: "va-metadata-sample" }],
      }),
    ],
    domAssertions: [
      dom('[data-tile] [data-mode-action="va-overlay"]', "ariaPressed", "equals", "true"),
      dom('[data-tile] [data-role="status"]', "text", "includes", "온라인"),
      dom('[data-tile] [data-role="info-overlay"]', "hidden", "equals", false),
      dom('[data-tile] [data-role="info-overlay"] [data-overlay="connection"]', "text", "includes", "연결"),
      dom("#liveDockEvents", "text", "includesAll", ["person", "presence", "open"]),
    ],
    semanticKeys: ["va-overlay", "vaMetadataSampleId"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId", "va-metadata-sample"],
  }),
  exactSpec("CLIENT-022", "caption/status가 viewport를 가리지 않는 a11y 상태", {
    route: "/client/live", role: "viewer", visibleControl: '[data-role="a11y-status"]', fixtures: ["assigned-view", "live-status-sample"],
    apiAssertions: [api("GET", "/client/api/views", [200], { requiredTokens: ["assignedViewId"] })],
    domAssertions: [dom('[data-role="a11y-status"]', "ariaLive", "equals", "polite"), dom('[data-role="a11y-status"]', "overlaps", "equals", false)],
    semanticKeys: ["a11y-status", "aria-live=polite"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["source-registry"], cleanupTargets: ["live-status-sample"],
  }),
  clientDigest("CLIENT-023", "client-safe incident digest API/UI", '[data-testid="client-safe-incident-digest"]', "incidentDigest", "media-server.client.incident-digest.v1", ["summaryText", "severity", "eventType", "status", "time"]),
  clientDigest("CLIENT-024", "client-safe follow-up digest API/UI", '[data-testid="client-safe-followup-digest"]', "followUpDigest", "media-server.client.follow-up-digest.v1", ["followUpStatus", "severity", "time"], "/client/live"),
  clientDigest("CLIENT-025", "client-safe event digest API/UI", '[data-testid="client-safe-event-digest"]', "eventDigest", "media-server.client.event-digest.v1", ["summaryText", "eventType", "status", "severity", "timelineHint", "time"]),
  clientDigest("CLIENT-027", "client-safe resolution digest API/UI", '[data-testid="client-safe-resolution-digest"]', "resolutionDigest", "media-server.client.resolution-digest.v1", ["resolutionStatus", "resolutionLabel", "summaryText", "severity", "timelineHint", "time"], "/client/live"),
  clientDigest("CLIENT-028", "client-safe source status digest API/UI", '[data-testid="client-safe-source-status-digest"]', "sourceStatusDigest", "media-server.client.source-status-digest.v1", ["sourceStatus", "connectionStatus", "videoFrameStatus", "metadataStatus", "lastFrameAgeMs", "metadataAgeMs"], "/client/live"),
  clientDigest("CLIENT-029", "client-safe maintenance digest API/UI", '[data-testid="client-safe-maintenance-digest"]', "maintenanceDigest", "media-server.client.v340-maintenance-digest.v1", ["maintenanceState", "summaryText", "severity", "timelineHint"]),
  clientDigest("CLIENT-031", "client impact forecast API/UI", '[data-testid="client-impact-forecast"]', "clientImpactForecast", "media-server.client.v350-impact-forecast.v1", ["sourceImpact", "viewImpact", "summaryText"]),
  clientDigest("CLIENT-032", "client-safe operations notice API/UI", '[data-testid="client-operations-notice"]', "clientOperationsNotice", "media-server.client.v350-operations-notice.v1", ["operationsStatus", "timelineHint"]),
  clientDigest("CLIENT-040", "client-safe action notice preview API/UI", '[data-testid="client-action-notice-preview"]', "clientActionNoticePreview", "media-server.client.v380-action-notice-preview.v1", ["noticeStatus", "viewerSafeTitle", "viewerSafeBody", "timelineHint"]),
  opsBoundary("CLIENT-041", "outcome observer의 client impact diff는 Ops-only", "outcomeObserver", { requiredTokens: ["clientImpactOutcomeDiff", "viewerClientPayloadChanged=false"], forbiddenFields: [...viewerRawFields, "actionControlDetail"] }),
  hiddenBoundary("CLIENT-042", "action receipt bundle의 client refs는 redacted Ops-only", { forbiddenSelectors: ["[data-client-action-control]"], forbiddenFields: [...viewerRawFields, "actionControlDetail"], semanticKeys: ["actionReceiptBundle", "viewerClientPayloadChanged=false"] }),
  exactSpec("MEDIA-016", "sample 영상은 실제 WebRTC video track으로 표시", {
    route: "/client/live", role: "viewer", visibleControl: '[data-tile="0"] video', action: { kind: "start-live-tile", target: '[data-tile="0"] [data-action="toggle-playback"]' }, fixtures: ["sample-video-source", "assigned-view"],
    apiAssertions: [api("POST", "/client/api/views/{assignedViewId}/webrtc/session", [200], { requiredTokens: ["sessionId", "offerReceived=true"] })],
    domAssertions: [dom('[data-tile="0"] video', "mediaTrackKinds", "includes", "video"), dom('[data-tile="0"] video', "readyState", "greaterThanOrEqual", 2)], semanticKeys: ["videoTrack", "sample-video-source"],
    forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations, snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionId", "sample-video-source"],
  }),
  exactSpec("MEDIA-017", "viewer client live에서 두 channel/tile 동시 재생과 layout 안정성", {
    route: "/client/live", role: "viewer", visibleControl: '[data-testid="client-live-workspace"]', action: { kind: "start-two-live-tiles", target: "[data-tile]" }, fixtures: ["assigned-view-a", "assigned-view-b", "playable-source-a", "playable-source-b"],
    apiAssertions: [api("POST", "/client/api/views/{viewA}/webrtc/session", [200], { requiredTokens: ["sessionId"] }), api("POST", "/client/api/views/{viewB}/webrtc/session", [200], { requiredTokens: ["sessionId"] })],
    domAssertions: [dom("[data-tile] video", "playingCount", "equals", 2), dom("[data-tile]", "overlapCount", "equals", 0), dom('[data-testid="client-live-workspace"]', "layoutStableSamples", "equals", true)],
    semanticKeys: ["simultaneousTiles", "layoutStableSamples"], forbiddenFields: viewerRawFields, forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: protocolMutations,
    snapshotTargets: ["webrtc-active-sessions"], cleanupTargets: ["sessionA", "sessionB", "playable-source-a", "playable-source-b"],
  }),

  hiddenBoundary("SAFE-015", "ops/client 제품 화면에 lab editor embed 금지", { forbiddenSelectors: ["[data-lab-editor]", "iframe[src^=\"/lab\"]"], forbiddenFields: ["lab editor", "developer lab"], semanticKeys: ["lab-editor-absent", "product-screen"] }),
  exactSpec("SAFE-016", "정의하지 않은 route는 정확히 404", {
    route: "/__v390-undefined-route__", role: "operator", visibleControl: "body", action: { kind: "navigate-negative", target: "/__v390-undefined-route__" },
    apiAssertions: [api("GET", "/__v390-undefined-route__", [404], { requiredTokens: ["Not Found"] })], domAssertions: [dom("body", "navigationStatus", "equals", 404)], semanticKeys: ["undefined-route", "404"],
    forbiddenFields: ["stackTrace", "storagePath"], forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: ["all-product-state"], snapshotTargets: ["all-owned-state"], cleanupTargets: [],
  }),
  exactSpec("SAFE-017", "legacy /lab 제품 route는 정확히 404", {
    route: "/lab", role: "operator", visibleControl: "body", action: { kind: "navigate-negative", target: "/lab" },
    apiAssertions: [api("GET", "/lab", [404], { requiredTokens: ["Not Found"] })], domAssertions: [dom("body", "navigationStatus", "equals", 404)], semanticKeys: ["legacy-lab", "404"],
    forbiddenFields: ["lab editor"], forbiddenNetwork: noWriteNetwork, forbiddenStateMutations: ["all-product-state"], snapshotTargets: ["all-owned-state"], cleanupTargets: [],
  }),
  hiddenBoundary("SAFE-018", "client API/UI debug/source/raw 정보 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["[data-debug]", "[data-source-url]", "pre.raw-json"], forbiddenFields: ["sourceUrl", "rawJson", "debugCounters"], semanticKeys: ["sourceUrl", "debugCounters"], apiPath: "/client/api/views", requiredTokens: ["views"] }),
  hiddenBoundary("SAFE-019", "password/token/session material artifact/UI/API 비노출", { forbiddenSelectors: ["[data-password]", "[data-token]", "[data-session-secret]"], forbiddenFields: ["password", "token", "sessionCookie"], semanticKeys: ["auth-material-redaction", "secret-absent"] }),
  opsBoundary("SAFE-020", "ops/client nav route action guard role matrix", "roleBoundary", { fixtures: ["viewer-session", "operator-session", "admin-session"], requiredTokens: ["viewer:/ops=403", "operator:/ops=200", "admin:/ops/users=200"], forbiddenFields: ["roleBypass"] }),
  opsBoundary("SAFE-021", "UI blocking dialog policy", "blockingDialogPolicy", { requiredTokens: ["native-dialog-count=0", "blocking-beforeunload=false", "double-confirm-in-product"] }),
  opsBoundary("SAFE-024", "VLM privacy/external transfer guard", "vlmPrivacyGuard", { requiredTokens: ["external-transfer-warning", "retentionAccepted", "loggingAccepted"], forbiddenFields: ["credential", "prompt", "rawProviderResponse", "sourceUrl", "rawFrameBytes"] }),
  hiddenBoundary("SAFE-028", "VLM prompt/raw response/credential/source redaction", { forbiddenSelectors: ["[data-raw-vlm-prompt]", "[data-provider-response]"], forbiddenFields: ["prompt", "rawProviderResponse", "credential", "sourceUrl", "rawFrameBytes"], semanticKeys: ["vlm-redaction", "raw-provider-material-absent"] }),
  hiddenBoundary("SAFE-031", "viewer/client VLM internal material 비노출", { route: "/client/live", role: "viewer", forbiddenSelectors: ["[data-vlm-model]", "[data-vlm-review-card]"], forbiddenFields: ["modelId", "prompt", "provider", "rawProviderResponse"], semanticKeys: ["modelId", "rawProviderResponse"], apiPath: "/client/api/views", requiredTokens: ["views"] }),
  opsBoundary("SAFE-033", "VLM diagnostic/raw details는 Ops details 안에만 존재", "vlmOpsDebugDetails", {
    route: "/ops/vlm",
    selector: '#opsVlmRawDetails[data-vlm-task="raw-debug"]',
    requiredTokens: ["opsVlmRawDetails", 'data-vlm-task="raw-debug"'],
    forbiddenFields: ["credential", "rawFrameBytes"],
  }),
  exactSpec("SAFE-038", "VLM suggestion은 seeded draft fields만 적용하고 저장하지 않음", {
    route: "/ops/rules", role: "operator", visibleControl: '[data-vlm-rule-draft-index="0"]', action: { kind: "activate", target: '[data-vlm-rule-draft-index="0"]' }, fixtures: ["vlm-rule-suggestion-draft"],
    apiAssertions: [api("GET", "/ops/api/vlm/rule-suggestion-drafts?limit=10", [200], { requiredTokens: ["draftCandidateId", "manualReviewRequired=true", "autoApply=false"] })],
    domAssertions: [dom("#opsRulesDetailPanel", "hidden", "equals", false), dom("#opsRulesStatus", "text", "includes", "저장"), dom('[data-vlm-rule-draft-index="0"]', "count", "equals", 1)],
    semanticKeys: ["candidateId", "manualReviewRequired"], forbiddenFields: ["credential", "prompt", "rawProviderResponse"], forbiddenNetwork: ["POST /lab/analysis/rules", "PUT /lab/analysis/va-rules", "POST /ops/api/events"],
    forbiddenStateMutations: [...protocolMutations, "ruleRegistry", "profileRegistry", "eventRecord"], snapshotTargets: ["rule-registry", "profile-registry", "event-record-store"], cleanupTargets: ["vlm-rule-suggestion-draft"],
  }),
  opsBoundary("SAFE-041", "incident/action write는 Ops review/audit에만 저장", "incidentWorkflowBoundary", { route: "/ops/events", role: "admin", selector: '[data-testid="ops-event-review-inbox"]', apiPath: "/ops/api/events/reviews", fixtures: ["ops-review-record"], requiredTokens: ["records", "auditActionRefs"], forbiddenFields: ["rawNote", ...viewerRawFields], forbiddenStateMutations: [...protocolMutations, "eventRecord"] }),
  opsBoundary("SAFE-042", "alert dry-run은 preview/log만 만들고 외부 전송하지 않음", "alertDeliveryPreview", { fixtures: ["alert-dry-run"], requiredTokens: ["payloadPreview", "deliveryAttempted=false"], forbiddenFields: ["endpointSecret"], forbiddenNetwork: ["external:webhook", "external:email", "external:slack"] }),
  hiddenBoundary("SAFE-045", "incident semantic search UI redacted projection", { route: "/ops/events", forbiddenSelectors: ["[data-raw-search-result]"], forbiddenFields: ["sourceUrl", "developerUrl", "rawJson", "debugCounters", "bboxDiagnostics", "providerMaterial"], semanticKeys: ["incidentSearch", "redactedProjection"] }),
  opsBoundary("SAFE-046", "incident timeline graph Ops-only summary", "incidentTimelineGraph", { requiredTokens: ["nodes", "edges", "auditLinkage"] }),
  opsBoundary("SAFE-047", "explainable incident brief redacted/default-off", "explainableIncidentBrief", { requiredTokens: ["slotSummary", "vlmDefaultOff=true", "providerOptInRequired=true"] }),
  opsBoundary("SAFE-048", "similar incident deterministic lookup", "similarIncidentLookup", { requiredTokens: ["score", "explanationTerms", "ruleRef", "sourceRef"] }),
  opsBoundary("SAFE-049", "client-safe incident digest boundary", "incidentDigest", { requiredTokens: ["summaryText", "severity", "eventType", "status", "time"], forbiddenFields: viewerRawFields }),
  hiddenBoundary("SAFE-050", "redacted incident evidence bundle boundary", { forbiddenSelectors: ["[data-raw-snapshot]", "[data-raw-clip]"], forbiddenFields: ["snapshotBytes", "clipBytes", "sourceUrl", "credential", "providerMaterial"], semanticKeys: ["incidentEvidenceBundle", "redacted-manifest-only"] }),
  exactSpec("SAFE-052", "VLM summary candidate review는 manual Ops wrapper/no-call", {
    route: "/ops/events", role: "operator", visibleControl: "#opsIncidentSearchInput", action: { kind: "assert-read-model", target: "#opsIncidentSearchInput" }, fixtures: ["event-record", "vlm-summary-candidate", "event-search-query"],
    apiAssertions: [api("GET", "/ops/api/events/reviews?eventId={eventId}&q={searchQuery}&limit=25", [200], { requiredTokens: ["memorySearch.vlmSummaryCandidateReview", "cloudProviderApiCalled=false", "viewerClientExposureAdded=false", "autoRuleApplied=false"] })],
    domAssertions: [dom('[data-vlm-summary-candidate-event="{eventId}"]', "count", "equals", 1), dom("#opsIncidentSearchInput", "value", "equals", "{searchQuery}")],
    semanticKeys: ["vlmSummaryCandidateReview", "cloudProviderApiCalled"], forbiddenFields: viewerRawFields, forbiddenNetwork: ["external:vlm-provider", ...noWriteNetwork],
    forbiddenStateMutations: [...protocolMutations, "ruleRegistry", "profileRegistry", "eventRecord"], snapshotTargets: ["event-record-store", "rule-registry"], cleanupTargets: ["vlm-summary-candidate"],
  }),
  exactSpec("SAFE-053", "incident-to-rule은 seeded suggestion에서 draft-only handoff", {
    route: "/ops/events", role: "operator", visibleControl: "[data-incident-rule-draft-route]", action: { kind: "assert-read-model", target: "[data-incident-rule-draft-route]" }, fixtures: ["incident-record", "rule-suggestion"],
    apiAssertions: [api("GET", "/ops/api/events/reviews", [200], { requiredTokens: ["incidentRuleSuggestionReview", "manualDraftRoute", "/ops/rules"] })], domAssertions: [dom("[data-incident-rule-draft-route]", "href", "startsWith", "/ops/rules"), dom('[data-testid="ops-incident-rule-suggestion-review"]', "text", "includes", "룰 draft")],
    semanticKeys: ["rule-suggestion", "/ops/rules"], forbiddenFields: viewerRawFields, forbiddenNetwork: ["PUT /lab/analysis/rules", "PUT /lab/analysis/va-rules", "external:vlm-provider"],
    forbiddenStateMutations: [...protocolMutations, "ruleRegistry", "profileRegistry", "eventRecord"], snapshotTargets: ["event-record-store", "rule-registry"], cleanupTargets: ["incident-record", "rule-suggestion"],
  }),
  hiddenBoundary("SAFE-054", "ONVIF credential gate redaction", { forbiddenSelectors: ["[data-onvif-password]", "[data-credential-ref-value]"], forbiddenFields: ["username", "password", "authorizationHeader", "soapSecurityHeader", "credentialRefValue"], semanticKeys: ["onvif-credential-gate", "secret-material-absent"] }),
  opsBoundary("SAFE-055", "runtime trend는 current page session sample만 사용", "runtimeTrend", { requiredTokens: ["pageSessionOnly=true", "persistentStorage=false"], forbiddenNetwork: ["GET /ops/api/runtime-trend", "POST /ops/api/runtime-trend"], forbiddenStateMutations: [...protocolMutations, "localStorage", "sessionStorage", "indexedDB"] }),
  opsBoundary("SAFE-056", "cross-zone re-entry는 기존 scenario schema만 사용", "crossZoneReEntry", { requiredTokens: ["configuredZoneMode", "existingScenarioFieldsOnly=true"], forbiddenFields: ["newEventType"], forbiddenStateMutations: protocolMutations }),
  opsBoundary("SAFE-058", "incident triage board Ops-only/no-auto-action", "incidentTriageBoard", { route: "/ops/events", selector: "[data-testid=\"ops-incident-triage-board\"]", fixtures: ["incident-triage-items"], requiredTokens: ["priority", "reviewState", "source", "rule"] }),
  opsBoundary("SAFE-059", "decision scorecard deterministic reasons", "incidentDecisionScorecard", { route: "/ops/events", selector: "[data-testid=\"ops-incident-decision-scorecard\"]", fixtures: ["incident-scorecard"], requiredTokens: ["deterministic-priority-reasons", "sourceHealth", "reviewAge"] }),
  opsBoundary("SAFE-060", "operational action pack은 manual workflow links만 표시", "operationalActionPack", { route: "/ops/events", selector: '[data-testid="ops-operational-action-pack"]', requiredTokens: ["release-safe evidence bundle", "수동 workflow"], forbiddenNetwork: ["external:webhook", ...noWriteNetwork] }),
  exactSpec("SAFE-061", "rule what-if는 seeded incident/suggestion condition preview만 표시", {
    route: "/ops/events", role: "operator", visibleControl: '[data-testid="ops-rule-what-if-preview"]', action: { kind: "assert-read-model", target: '[data-testid="ops-rule-what-if-preview"]' }, fixtures: ["incident-record", "rule-suggestion"],
    apiAssertions: [api("GET", "/ops/api/events/reviews", [200], { requiredTokens: ["ruleWhatIfPreview", "conditionPreview"] })], domAssertions: [dom('[data-testid="ops-rule-what-if-preview"]', "text", "includes", "condition preview")],
    semanticKeys: ["rule-what-if", "conditionPreview"], forbiddenFields: viewerRawFields, forbiddenNetwork: ["full-replay", "PUT /lab/analysis/rules", "PUT /lab/analysis/va-rules"],
    forbiddenStateMutations: [...protocolMutations, "ruleRegistry", "profileRegistry", "eventRecord"], snapshotTargets: ["rule-registry", "event-record-store"], cleanupTargets: ["incident-record", "rule-suggestion"],
  }),
  opsBoundary("SAFE-062", "operator outcome memory는 existing review/audit read-only hint", "operatorOutcomeMemory", { fixtures: ["ops-review-history", "ops-audit-history"], requiredTokens: ["accept", "dismiss", "review-needed"], forbiddenStateMutations: [...protocolMutations, "newOutcomeStore"] }),
  opsBoundary("SAFE-065", "incident action readiness queue는 read-only status", "incidentActionReadinessQueue", { fixtures: ["readiness-items"], requiredTokens: ["ready", "blocked", "manualApprovalRequired"] }),
  opsBoundary("SAFE-066", "approval-gated rule draft는 manual approval 전 no-write", "approvalGatedRuleDraft", { fixtures: ["staged-rule-draft"], requiredTokens: ["approvalRequired=true", "autoApply=false"], forbiddenNetwork: ["PUT /lab/analysis/rules", "PUT /lab/analysis/va-rules"] }),
  opsBoundary("SAFE-067", "evidence intake/field readiness는 conditional-not-run", "evidenceIntakeFieldReadiness", { fixtures: ["redacted-evidence-intake"], requiredTokens: ["conditional-not-run", "fieldPassClaimed=false"], forbiddenFields: ["endpoint", "credential", "rawEvidence", "providerMaterial"], forbiddenNetwork: ["external:field-endpoint", "external:provider"] }),
  opsBoundary("SAFE-068", "runtime evidence window는 bounded/no-longrun-claim", "runtimeEvidenceWindow", { fixtures: ["bounded-runtime-samples"], requiredTokens: ["bounded=true", "soak30Pass=false", "soak120Pass=false"], forbiddenStateMutations: [...protocolMutations, "persistentArchive"] }),
  opsBoundary("SAFE-069", "client-safe follow-up digest boundary", "followUpDigest", { requiredTokens: ["status", "severity", "time"], forbiddenFields: viewerRawFields }),
  opsBoundary("SAFE-098", "operator correction은 review/audit에만 저장", "operatorCorrection", { fixtures: ["operator-correction-request"], requiredTokens: ["alias", "reanalysisRequested", "auditRef"], forbiddenNetwork: ["external:provider-replay"], forbiddenStateMutations: [...protocolMutations, "eventRecord", "ruleRegistry"] }),
  hiddenBoundary("SAFE-104", "unified workspace가 schema/client/raw boundary를 보존", { route: "/ops/events", forbiddenSelectors: ["[data-raw-json]"], forbiddenFields: ["sourceUrl", "rawJson", "debugMaterial", "viewerClientPayload"], semanticKeys: ["unifiedResolutionWorkspace", "schema-unchanged"] }),
  opsBoundary("SAFE-105", "evidence quality deterministic hint/no raw evidence", "evidenceQuality", { fixtures: ["event-evidence-refs", "ops-review-state"], requiredTokens: ["qualityHint", "deterministic=true"], forbiddenFields: ["rawEvidenceMaterial"] }),
  opsBoundary("SAFE-106", "source reliability deterministic context/no source write", "sourceReliability", { fixtures: ["source-health-snapshot", "event-source-ref"], requiredTokens: ["reliabilityHint", "sourceRegistryWritePerformed=false"] }),
  opsBoundary("SAFE-107", "AI review quality context/no provider call", "aiReviewQuality", { fixtures: ["ops-review-state", "evidence-quality", "source-reliability"], requiredTokens: ["qualityHint", "providerCallPerformed=false"], forbiddenFields: ["rawProviderMaterial"], forbiddenNetwork: ["external:ai-provider"] }),
  opsBoundary("SAFE-108", "operator resolution write는 review JSONL/audit에만 결속", "operatorResolutionFlow", { fixtures: ["resolution-review-record"], requiredTokens: ["resolutionState", "auditRef", "automaticActionPerformed=false"], forbiddenStateMutations: [...protocolMutations, "eventRecord", "ruleRegistry"] }),
  opsBoundary("SAFE-109", "action readiness checklist는 deterministic/no action", "actionReadinessChecklist", { fixtures: ["resolution-context", "source-context", "ai-context"], requiredTokens: ["checklistItems", "ruleDraftCreated=false", "externalDeliveryPerformed=false"] }),
  clientDigest("SAFE-110", "resolution digest boundary가 raw/provider/operator/action을 숨김", '[data-testid="client-safe-resolution-digest"]', "resolutionDigest", "media-server.client.resolution-digest.v1", ["resolutionStatus", "resolutionLabel", "summaryText", "severity", "timelineHint"]),
  opsBoundary("SAFE-111", "resolution search metrics는 read-only/no saved-view write", "resolutionSearchMetrics", { fixtures: ["resolution-records"], requiredTokens: ["metrics", "savedViewWritePerformed=false"] }),
  opsBoundary("SAFE-117", "incident source correlation deterministic/no recovery", "incidentSourceCorrelation", { fixtures: ["resolution-detail", "source-health-audit"], requiredTokens: ["correlationHint", "automaticRecoveryPerformed=false"], forbiddenFields: ["rawLocator", "credential"] }),
  opsBoundary("SAFE-118", "operator recheck recovery queue는 non-persistent hint", "operatorRecheckRecoveryQueue", { fixtures: ["resolution-detail", "operator-note"], requiredTokens: ["queueHint", "persistentQueueWritePerformed=false", "automaticRecoveryPerformed=false"] }),
  clientDigest("SAFE-119", "source status digest boundary가 raw/credential/operator/action을 숨김", '[data-testid="client-safe-source-status-digest"]', "sourceStatusDigest", "media-server.client.source-status-digest.v1", ["sourceStatus", "connectionStatus", "videoFrameStatus", "metadataStatus"]),
  opsBoundary("SAFE-121", "source reliability search metrics no saved/source write", "sourceReliabilitySearchMetrics", { fixtures: ["source-health-history"], requiredTokens: ["metrics", "savedViewWritePerformed=false", "sourceRegistryWritePerformed=false"], forbiddenFields: ["rawLocator", "credential"] }),
  opsBoundary("SAFE-122", "backup recovery source handoff는 validation plan input only", "backupRecoverySourceHandoff", { fixtures: ["source-view-snapshot", "source-health-snapshot"], requiredTokens: ["validationPlan", "productionRestorePerformed=false", "automaticRecoveryPerformed=false"], forbiddenFields: ["rawLocator", "credential"] }),
  opsBoundary("SAFE-129", "continuity drill workspace read-only blocked/ready", "continuityDrillWorkspace", { route: "/ops/sources", selector: "[data-source-continuity-drill-workspace]", fixtures: ["drill-package"], requiredTokens: ["continuity drill package", "Ready", "Blocked"], forbiddenFields: ["sourceUrl", "rawLocator", "credential"] }),
  opsBoundary("SAFE-130", "approval-gated recovery checklist/audit no-auto", "approvalGatedRecovery", { fixtures: ["operator-note", "dry-run-result", "audit-link"], requiredTokens: ["readinessStatus", "automaticRecoveryPerformed=false"] }),
  opsBoundary("SAFE-131", "maintenance digest redaction/no recovery action", "maintenanceDigest", { requiredTokens: ["maintenanceState", "timelineHint"], forbiddenFields: ["sourceUrl", "rawLocator", "credential", "operatorNote", "recoveryAction"] }),
  opsBoundary("SAFE-132", "drill evidence export/cleanup manifest is plan-only", "drillEvidenceCleanupManifest", { fixtures: ["redacted-drill-manifest"], requiredTokens: ["minimumRetainedEvidence", "exportExecuted=false", "cleanupExecuted=false"], forbiddenFields: ["rawAuditBody", "credential", "sourceUrl"] }),
  hiddenBoundary("SAFE-138", "incident-to-command handoff는 read-only/draft-only", { route: "/ops/events", forbiddenSelectors: ["[data-command-execute]"], forbiddenFields: ["rawLocator", "credential"], semanticKeys: ["incidentCommandHandoff", "commandExecutionPerformed=false"] }),
  opsBoundary("SAFE-140", "Ops command workspace는 staged plan/client impact read-only", "opsCommandWorkspace", { requiredTokens: ["incidentRef", "sourceRef", "drillRef", "stagedPlan", "clientImpact", "commandPlanExecuted=false"], forbiddenFields: ["rawLocator", "credential", "debugMaterial"] }),
];

const catalog = deepFreeze(Object.fromEntries(entries.map(item => [item.caseId, item])));

export function clientSafeExactOracleFor(caseId) {
  return catalog[String(caseId || "")] || null;
}

export function clientSafeExactOracleCaseIds() {
  return expectedCaseIds;
}

export function materializeClientSafeExactOracle(caseId, fixtureValues = {}) {
  const source = clientSafeExactOracleFor(caseId);
  assert(source, `unknown client-safe exact oracle case: ${caseId}`);
  const resolved = structuredClone(source);
  resolved.visibleControl.selector = resolveTemplate(
    resolved.visibleControl.selector,
    resolved.visibleControl.fixtureRefs,
    fixtureValues,
    cssEscape,
  );
  resolved.visibleControl.action.target = resolveTemplate(
    resolved.visibleControl.action.target,
    resolved.visibleControl.actionFixtureRefs,
    fixtureValues,
    cssEscape,
  );
  const actionCursor = { index: 0 };
  for (const key of Object.keys(resolved.visibleControl.action)) {
    if (key === "target") continue;
    resolved.visibleControl.action[key] = resolveNestedTemplates(
      resolved.visibleControl.action[key],
      resolved.visibleControl.actionValueFixtureRefs,
      fixtureValues,
      actionCursor,
    );
  }
  assert(actionCursor.index === resolved.visibleControl.actionValueFixtureRefs.length,
    `${caseId} action fixture values were not fully materialized`);
  resolved.action = structuredClone(resolved.visibleControl.action);
  for (const request of resolved.requests) {
    request.pathTemplate = request.path;
    request.path = resolveTemplate(request.path, request.fixtureRefs, fixtureValues, value => encodeURIComponent(value));
    for (const assertion of request.jsonAssertions) {
      if (assertion.operator === "equals-fixture") assertion.value = fixtureValue(assertion.fixtureRef, fixtureValues);
    }
    for (const assertion of request.forbiddenJsonValues) {
      if (assertion.operator === "excludes-fixture") assertion.value = fixtureValue(assertion.fixtureRef, fixtureValues);
    }
  }
  for (const assertion of resolved.dom) {
    assertion.selector = resolveTemplate(assertion.selector, assertion.fixtureRefs, fixtureValues, cssEscape);
    const cursor = { index: 0 };
    for (const field of ["requiredTextTokens", "forbiddenTextTokens", "forbiddenMaterialTokens", "requiredAttributes", "propertyAssertions", "cardinality"]) {
      assertion[field] = resolveNestedTemplates(assertion[field], assertion.valueFixtureRefs, fixtureValues, cursor);
    }
    assert(cursor.index === assertion.valueFixtureRefs.length,
      `${caseId} DOM assertion fixture values were not fully materialized`);
  }
  return deepFreeze(resolved);
}

export function validateClientSafeExactOracleCatalog(candidate = catalog) {
  assert(candidate && typeof candidate === "object" && !Array.isArray(candidate), "oracle catalog must be an object");
  const ids = Object.keys(candidate).sort();
  const expected = [...expectedCaseIds].sort();
  assert(JSON.stringify(ids) === JSON.stringify(expected), "oracle catalog exact 87 case IDs mismatch");
  for (const caseId of expectedCaseIds) validateSpec(caseId, candidate[caseId]);
  assert(candidate["CLIENT-018"].role === "admin" && candidate["CLIENT-018"].route === "/client/live",
    "CLIENT-018 admin preview route/role correction missing");
  assert(candidate["MEDIA-017"].role === "viewer" && candidate["MEDIA-017"].route === "/client/live",
    "MEDIA-017 client live viewer route/role correction missing");
  assert(candidate["SAFE-016"].route === "/__v390-undefined-route__" &&
    candidate["SAFE-016"].requests.some(item => item.allowedStatuses.length === 1 && item.allowedStatuses[0] === 404),
  "SAFE-016 undefined route 404 correction missing");
  assert(candidate["SAFE-061"].route === "/ops/events" &&
    candidate["SAFE-061"].visibleControl?.selector === '[data-testid="ops-rule-what-if-preview"]' &&
    candidate["SAFE-061"].action?.kind === "assert-read-model" &&
    candidate["SAFE-061"].action?.target === '[data-testid="ops-rule-what-if-preview"]',
  "SAFE-061 events read-model control correction missing");
  return { caseCount: ids.length, immutable: Object.isFrozen(candidate), schema: "media-server.v390-ui-client-safe-exact-oracle.v1" };
}

function validateSpec(caseId, spec) {
  assert(spec?.schema === "media-server.v390-ui-client-safe-exact-oracle.v1", `${caseId} schema missing`);
  assert(spec.caseId === caseId && spec.featureMeaning?.length > 8 && spec.expectedBehavior === spec.featureMeaning,
    `${caseId} expected behavior/feature meaning missing`);
  assert(spec.route?.startsWith("/") && ["viewer", "operator", "admin"].includes(spec.role), `${caseId} route/role invalid`);
  assert(spec.visibleControl?.selector && spec.visibleControl?.action?.kind && spec.visibleControl?.action?.target &&
    typeof spec.visibleControl.expectedVisible === "boolean", `${caseId} visible control/action missing`);
  assert(spec.visibleControl.fixtureRefs.length === (spec.visibleControl.selector.match(/\{fixtureId\}/g) || []).length &&
    spec.visibleControl.actionFixtureRefs.length === (spec.visibleControl.action.target.match(/\{fixtureId\}/g) || []).length,
  `${caseId} visible control/action fixture placeholder mismatch`);
  assert(spec.visibleControl.actionValueFixtureRefs.length === countFixturePlaceholders(actionWithoutTarget(spec.visibleControl.action)),
    `${caseId} action value fixture placeholder mismatch`);
  assert(spec.action?.kind && spec.action?.target, `${caseId} action missing`);
  assert(Array.isArray(spec.requests) && spec.requests.length > 0, `${caseId} API assertions missing`);
  assert(Array.isArray(spec.dom) && spec.dom.length > 0, `${caseId} DOM assertions missing`);
  assert(Array.isArray(spec.semanticKeys) && spec.semanticKeys.length >= 2 && spec.semanticKeys.every(Boolean), `${caseId} semantic keys missing`);
  assert(Array.isArray(spec.forbiddenFields) && Array.isArray(spec.forbiddenNetwork) &&
    Array.isArray(spec.forbiddenStateMutations) && spec.forbiddenNetwork.every(item =>
      item && typeof item === "object" && item.method && item.path), `${caseId} forbidden boundary missing`);
  assert(Array.isArray(spec.stateSnapshots) && spec.stateSnapshots.length > 0 && spec.stateSnapshots.every(item =>
    item.target && item.before === "capture" && item.after === "capture" && item.comparison),
  `${caseId} before/after snapshots missing`);
  assert(spec.cleanup?.strategy && Array.isArray(spec.cleanup.targets) && spec.cleanup.assertions.length >= 2,
    `${caseId} cleanup contract missing`);
  for (const request of spec.requests) {
    assert(["GET", "POST", "PUT", "DELETE", "PATCH"].includes(request.method) && request.path?.startsWith("/") &&
      Array.isArray(request.allowedStatuses) && request.allowedStatuses.length > 0, `${caseId} API request invalid`);
    assert(Array.isArray(request.requiredJsonPaths) && Array.isArray(request.requiredBodyTokens) &&
      Array.isArray(request.jsonAssertions) && Array.isArray(request.requiredJsonValues) &&
      Array.isArray(request.forbiddenJsonKeys) && Array.isArray(request.forbiddenJsonValues) &&
      Array.isArray(request.fixtureRefs), `${caseId} API semantic assertion invalid`);
    assert(request.requiredJsonPaths.every(value => /^\$(?:\.\.|\.)[A-Za-z_][A-Za-z0-9_.]*$/.test(value)) &&
      request.jsonAssertions.every(item => request.requiredJsonPaths.includes(item.path) && item.operator &&
        (item.operator !== "equals-fixture" || (item.value === "{fixtureId}" && item.fixtureRef))) &&
      request.requiredJsonValues.every(item => item.operator === "contains-value" && item.value !== undefined),
    `${caseId} requiredJsonPaths semantic binding invalid`);
    assert(request.forbiddenJsonValues.every(item => item.operator === "excludes-fixture" &&
      item.value === "{fixtureId}" && item.fixtureRef), `${caseId} forbidden JSON fixture binding invalid`);
    assert(request.fixtureRefs.length === (request.path.match(/\{fixtureId\}/g) || []).length,
      `${caseId} request fixture placeholder/ref mismatch`);
    if (request.responseSchema !== "html") {
      assert(request.requiredJsonPaths.length + request.requiredJsonValues.length + request.forbiddenJsonKeys.length > 0 ||
        request.forbiddenJsonValues.length > 0 || request.cardinality, `${caseId} JSON response has no semantic binding`);
    }
  }
  for (const assertion of spec.dom) {
    assert(assertion.selector && Array.isArray(assertion.requiredTextTokens) &&
      Array.isArray(assertion.forbiddenTextTokens) && Array.isArray(assertion.forbiddenMaterialTokens) &&
      Array.isArray(assertion.requiredAttributes) &&
      Array.isArray(assertion.propertyAssertions) && Array.isArray(assertion.fixtureRefs) &&
      Array.isArray(assertion.valueFixtureRefs),
    `${caseId} structured DOM assertion invalid`);
    assert(!assertion.requiredAttributes.some(item => item.name === "count"),
      `${caseId} selector cardinality cannot be encoded as a DOM attribute`);
    assert(assertion.fixtureRefs.length === (assertion.selector.match(/\{fixtureId\}/g) || []).length,
      `${caseId} DOM fixture placeholder/ref mismatch`);
    const assertionValues = {
      requiredTextTokens: assertion.requiredTextTokens,
      forbiddenTextTokens: assertion.forbiddenTextTokens,
      forbiddenMaterialTokens: assertion.forbiddenMaterialTokens,
      requiredAttributes: assertion.requiredAttributes,
      propertyAssertions: assertion.propertyAssertions,
      cardinality: assertion.cardinality,
    };
    assert(assertion.valueFixtureRefs.length === countFixturePlaceholders(assertionValues),
      `${caseId} DOM assertion value fixture placeholder/ref mismatch`);
  }
  assert(!hasNonCanonicalPlaceholder(spec), `${caseId} dynamic placeholder must use {fixtureId}`);
  const semanticBody = JSON.stringify({ setup: spec.setup, action: spec.action, requests: spec.requests, dom: spec.dom,
    forbiddenFields: spec.forbiddenFields, forbiddenNetwork: spec.forbiddenNetwork });
  assert(spec.semanticKeys.some(key => {
    const text = String(key);
    return semanticBody.includes(text) || semanticBody.includes(text.split("=")[0]);
  }), `${caseId} case meaning is not bound to runtime assertions`);
  const onlyGet200 = spec.requests.every(request => request.method === "GET" &&
    request.allowedStatuses.length === 1 && request.allowedStatuses[0] === 200);
  const existenceOnly = spec.dom.every(item => item.requiredTextTokens.length === 0 &&
    item.forbiddenTextTokens.length === 0 && item.forbiddenMaterialTokens.length === 0 &&
    item.requiredAttributes.every(attribute =>
      ["exists", "visible"].includes(attribute.name)) && item.propertyAssertions.every(property =>
      ["exists", "visible"].includes(property.name)) && (!item.cardinality || item.cardinality.value > 0));
  const noForbiddenBoundary = spec.forbiddenFields.length === 0 && spec.forbiddenNetwork.length === 0 &&
    spec.forbiddenStateMutations.length === 0;
  assert(!(onlyGet200 && existenceOnly && noForbiddenBoundary), `${caseId} simple GET200 existence-only false-PASS oracle forbidden`);
  assert(Object.isFrozen(spec), `${caseId} spec must be immutable`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function normalizeFixturePlaceholders(value) {
  if (typeof value === "string") return value.replace(/\{[^}]+\}/g, "{fixtureId}");
  if (Array.isArray(value)) return value.map(normalizeFixturePlaceholders);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeFixturePlaceholders(nested)]));
}

function hasNonCanonicalPlaceholder(value) {
  if (typeof value === "string") {
    return [...value.matchAll(/\{[^}]+\}/g)].some(match => match[0] !== "{fixtureId}");
  }
  if (Array.isArray(value)) return value.some(hasNonCanonicalPlaceholder);
  return Boolean(value && typeof value === "object" && Object.values(value).some(hasNonCanonicalPlaceholder));
}

function resolveNestedTemplates(value, refs, fixtureValues, cursor) {
  if (typeof value === "string") {
    return value.replace(/\{fixtureId\}/g, () => {
      const ref = refs[cursor.index++];
      return fixtureValue(ref, fixtureValues);
    });
  }
  if (Array.isArray(value)) return value.map(item => resolveNestedTemplates(item, refs, fixtureValues, cursor));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    resolveNestedTemplates(nested, refs, fixtureValues, cursor),
  ]));
}

function resolveTemplate(template, refs, fixtureValues, encode) {
  let index = 0;
  const resolved = String(template).replace(/\{fixtureId\}/g, () => encode(fixtureValue(refs[index++], fixtureValues)));
  assert(index === refs.length, `fixture refs do not match template placeholders: ${template}`);
  return resolved;
}

function fixtureValue(ref, fixtureValues) {
  assert(ref && Object.hasOwn(fixtureValues, ref), `fixture value missing for ${ref || "unknown-ref"}`);
  const candidate = fixtureValues[ref];
  const value = candidate && typeof candidate === "object"
    ? candidate.value ?? candidate.id ?? candidate.viewId ?? candidate.sessionId ?? candidate.draftId ?? candidate.candidateId ?? candidate.sampleId
    : candidate;
  assert(value !== undefined && value !== null && String(value).length > 0, `fixture value empty for ${ref}`);
  return String(value);
}

function cssEscape(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, character => `\\${character.codePointAt(0).toString(16)} `);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
