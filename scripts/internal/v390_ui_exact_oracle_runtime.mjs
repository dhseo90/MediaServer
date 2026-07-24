// 파일 용도: exact runtime oracle catalog를 실제 브라우저 interaction/API/DOM 관찰로 실행한다.

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  assertEventExactRuntimeBindings,
  evaluateEventExactDomAssertion,
  evaluateEventExactResponseAssertion,
  eventExactSemanticEvidenceKey,
  eventExactValuesAtPath,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { materializeClientSafeExactOracle } from "./v390_ui_exact_client_safe_oracles.mjs";

const refreshControls = Object.freeze({
  "/ops": "#opsHomeRefresh",
  "/ops/home": "#opsHomeRefresh",
  "/ops/dashboard": "#opsDashboardRefresh",
  "/ops/sources": "#refresh",
  "/ops/rules": "#opsRulesRefresh",
  "/ops/users": "#refresh-btn",
  "/ops/events": "#opsEventsRefresh",
  "/ops/vlm": "#opsVlmRefresh",
  "/client/live": "#refresh",
  "/client/dashboard": "#refresh",
  "/client/events": "#refresh",
});

const endpointOwnedProjectionCases = new Set([
  "AUTH-020",
  "SRC-008",
  "SRC-010",
  "SRC-019",
  "SRC-031",
]);

const inactiveResponseAttestationKeys = new Set([
  "autoApply",
  "autoRuleApplied",
  "viewerClientExposure",
  "providerCall",
  "registryWrite",
]);

export function isExistingSpecializedExactOracle(itemOrCaseId) {
  const item = typeof itemOrCaseId === "object" ? itemOrCaseId : null;
  const caseId = item?.caseId || String(itemOrCaseId || "");
  if (exactRuntimeOracleFor(caseId)?.classification === "existing-specialized") return true;
  if (item && ["form-submit", "persisted-mutation", "negative-route"].includes(item.workflow?.workflowClass)) return true;
  return new Set(["UI-001", "UI-018", "SAFE-017", "SRC-031", "RULE-001", "RULE-002", "RULE-003"]).has(caseId);
}

export async function executeCatalogRuntimeOracle({
  browser,
  item,
  fixtureId,
  bindings = {},
  correlationId,
  primaryAction = null,
  primaryNetworkEntries = [],
  catalogBindings = null,
}) {
  const baseSpec = exactRuntimeOracleFor(item.caseId);
  assert(baseSpec?.caseId === item.caseId, `${item.caseId} runtime oracle spec missing`);
  if (baseSpec.classification === "existing-specialized") {
    return { schema: "media-server.v390-ui-exact-runtime-observation.v1", delegated: true, caseId: item.caseId };
  }
  const runtimeBindings = {
    fixtureId,
    caseId: item.caseId,
    assignedViewId: bindings.assignedViewId || bindings.viewId || "9001",
    blockedViewId: bindings.blockedViewId || "99002",
    viewId: bindings.viewId || bindings.assignedViewId || "9001",
    sourceId: bindings.sourceId || "9001",
    ruleId: bindings.ruleId || "1",
    candidateId: bindings.candidateId || fixtureId,
    draftId: bindings.draftId || fixtureId,
    sessionId: bindings.sessionId || "",
    vaMetadataSampleId: bindings.vaMetadataSampleId || fixtureId,
    viewA: bindings.viewA || bindings.assignedViewId || "9001",
    viewB: bindings.viewB || bindings.blockedViewId || "9002",
    q: encodeURIComponent(bindings.q || fixtureId),
    evidence: encodeURIComponent(bindings.evidence || "snapshot"),
    incidentStatus: encodeURIComponent(bindings.incidentStatus || "open"),
    startTimeMs: String(bindings.startTimeMs || 0),
    endTimeMs: String(bindings.endTimeMs || Date.now()),
    limit: String(bindings.limit || 100),
    offset: String(bindings.offset || 0),
    id: fixtureId,
    token: bindings.token || "runtime-token-redacted",
    ...bindings,
  };
  const clientSafeCase = /^(CLIENT|MEDIA|SAFE)-/.test(item.caseId);
  const clientFixtureContract = clientSafeCase
    ? validateClientRuntimeFixtureBindings(baseSpec, runtimeBindings)
    : null;
  let fixtureValues = clientSafeFixtureValues(runtimeBindings);
  if (clientFixtureContract?.requiresUiCreatedSession) {
    fixtureValues = { ...fixtureValues, "active-session": "pending-ui-created-session" };
  }
  let spec = clientSafeCase
    ? materializeClientSafeExactOracle(item.caseId, fixtureValues)
    : baseSpec;
  if (clientSafeCase) spec = normalizeClientComposedRuntimeSpec(spec);
  const eventRuntimeContext = item.caseId.startsWith("EVT-")
    ? catalogBindings?.eventExactRuntime || null
    : null;
  if (item.caseId.startsWith("EVT-") && eventRuntimeContext) {
    assert(eventRuntimeContext.caseId === item.caseId,
      `${item.caseId} exact event runtime context case binding mismatch`);
    assertEventExactRuntimeBindings(item.caseId, eventRuntimeContext, {
      requireSemanticEvidence: false,
    });
  }
  const networkStart = browser.networkEntries().length;
  await browser.setCorrelationId(correlationId);
  try {
    const nativePrimaryControl = await observeNativePrimaryControl(browser, item);
    if (primaryAction && clientSafeCase) {
      const expectedExecutedKind = new Map([
        ["activate", "click"],
        ["start-live-tile", "click"],
        ["fill", "fill"],
        ["select", "select"],
      ]).get(spec.action?.kind);
      if (expectedExecutedKind) {
        const acceptedKinds = new Set([
          expectedExecutedKind,
          "composed-live-start-all-stop",
          "composed-va-overlay-session",
        ]);
        assert(acceptedKinds.has(primaryAction.executedKind),
          `${item.caseId} catalog/native primary action mismatch: ` +
          `${spec.action?.kind || "missing"}/${primaryAction.executedKind || "missing"}`);
      }
    }
    const interaction = primaryAction
      ? {
          kind: "existing-primary-action",
          actionKind: primaryAction.composedClientLive?.kind || spec.action?.kind || null,
          actionId: primaryAction.actionId || null,
          selector: primaryAction.executedControlSelector || primaryAction.controlSelector || null,
          playbackSelector: primaryAction.composedClientLive?.playbackSelector || null,
          sessionId: primaryAction.composedClientLive?.sessionId || null,
          overlayMode: primaryAction.composedClientLive?.overlayMode || null,
          vaProjection: primaryAction.composedClientLive?.vaProjection || null,
          infoOverlayChanged: primaryAction.composedClientLive?.infoOverlayChanged === true,
          before: primaryAction.before || null,
          after: primaryAction.after || null,
        }
      : await executeTrustedInteraction(browser, item, spec, correlationId, runtimeBindings);
    if (clientSafeCase) {
      const createdSessionId = [...primaryNetworkEntries, ...browser.networkEntries().slice(networkStart)]
        .find(entry => entry.phase === "response" && entry.method === "POST" &&
          /\/webrtc\/session$/.test(new URL(entry.url).pathname) && entry.safeResponseBody?.sessionId)
        ?.safeResponseBody?.sessionId;
      if (createdSessionId) {
        fixtureValues = { ...fixtureValues, "active-session": String(createdSessionId) };
        spec = materializeClientSafeExactOracle(item.caseId, fixtureValues);
        spec = normalizeClientComposedRuntimeSpec(spec);
      }
      if (clientFixtureContract?.requiresUiCreatedSession) {
        assert(createdSessionId,
          `${item.caseId} composed product interaction did not supply a UI-created session`);
      }
      if (item.caseId === "CLIENT-021" && primaryAction) {
        assert(interaction.vaProjection?.sampleId === runtimeBindings.vaMetadataSampleId &&
          interaction.vaProjection?.metadataReceived === true &&
          interaction.vaProjection?.safeProjectionRendered === true &&
          interaction.vaProjection?.statusOnline === true,
        `${item.caseId} native primary action lacks the bound VA event projection`);
      }
    }
    const responses = [];
    const responseBodies = [];
    for (const request of spec.requests) {
      const observation = await observeRequest(
        browser,
        item,
        request,
        runtimeBindings,
        correlationId,
        networkStart,
        primaryNetworkEntries,
        eventRuntimeContext,
      );
      responses.push(observation.evidence);
      responseBodies.push(observation.body);
    }
    if (baseSpec.seed?.kind === "dashboard-three-api-samples") {
      bindDashboardRuntimeTrendBaseline({
        item,
        responseBodies,
        runtimeBindings,
        catalogBindings,
      });
    }
    const dom = [];
    for (const assertion of spec.dom) {
      dom.push(await observeDom(
        browser,
        item,
        assertion,
        runtimeBindings,
        responses,
        responseBodies,
        interaction,
        eventRuntimeContext,
      ));
    }
    assertForbiddenNetwork([
      ...primaryNetworkEntries,
      ...browser.networkEntries().slice(networkStart),
    ], item, spec, runtimeBindings);
    const cleanup = await cleanupTrustedInteraction(browser, item, spec, interaction, correlationId);
    return {
      schema: "media-server.v390-ui-exact-runtime-observation.v1",
      caseId: item.caseId,
      featureMeaning: spec.featureMeaning || spec.expectedBehavior,
      interaction,
      responses,
      dom,
      cleanup,
      nativePrimaryControl,
      forbiddenNetworkObserved: 0,
      requestedRoute: spec.route,
      observedRoute: await browser.evaluate("location.pathname"),
    };
  } finally {
    await browser.setCorrelationId(`${item.caseId}:navigation`);
  }
}

async function observeNativePrimaryControl(browser, item) {
  const control = item?.workflow?.primaryControl;
  if (!control?.applicability) return null;
  assert(["required", "not-applicable"].includes(control.applicability),
    `${item.caseId} native primary control applicability invalid`);
  if (control.applicability === "not-applicable") {
    return { applicability: "not-applicable", status: "PASS" };
  }
  const currentPath = await browser.evaluate("location.pathname");
  if (control.route !== currentPath) {
    return {
      applicability: "required",
      selector: control.selector,
      route: control.route,
      observedRoute: currentPath,
      status: "verified-by-native-workflow-on-action-route",
    };
  }
  await browser.waitForSelector(control.selector, {
    state: control.expectedVisible === false ? "attached" : "visible",
  });
  const snapshot = await browser.snapshot(control.selector);
  assert(snapshot.exists === true,
    `${item.caseId} native primary control missing: ${control.selector}`);
  assert(snapshot.visible === control.expectedVisible,
    `${item.caseId} native primary control visibility mismatch: ${control.selector}`);
  if (control.expectedEnabled) {
    assert(snapshot.disabled === false,
      `${item.caseId} native primary control disabled: ${control.selector}`);
  }
  return {
    applicability: "required",
    selector: control.selector,
    route: control.route,
    visible: snapshot.visible,
    enabled: snapshot.disabled === false,
    status: "PASS",
  };
}

export async function executeCatalogRuntimeOracleAtSourceRoute(args) {
  const { browser, item } = args;
  const sourceRoute = String(exactRuntimeOracleFor(item?.caseId)?.route || "");
  assert(sourceRoute.startsWith("/"), `${item?.caseId || "unknown"} catalog source route missing`);
  const currentRoute = await browser.evaluate("location.pathname + location.search + location.hash");
  const screenRoute = String(item?.screenRoute || "");
  const splitApiAndScreen = isApiRoute(sourceRoute) &&
    screenRoute.startsWith("/") &&
    screenRoute !== sourceRoute;
  if (splitApiAndScreen) {
    let screenNavigation = null;
    if (routePathname(currentRoute) !== routePathname(screenRoute)) {
      await browser.setCorrelationId(`${item.caseId}:navigation`);
      screenNavigation = await browser.navigate(screenRoute);
      assert([200, 204].includes(screenNavigation.status),
        `${item.caseId} catalog screen route status mismatch: ${screenNavigation.status}`);
    }
    const observation = await executeCatalogRuntimeOracle(args);
    return {
      ...observation,
      routeLifecycle: {
        sourceRoute,
        destinationRoute: screenRoute,
        splitApiAndScreen: true,
        sourceObservation: "fresh-browser-fetch",
        sourceNavigationStatus: null,
        screenPreparationStatus: screenNavigation?.status ?? null,
        restoreNavigationStatus: null,
      },
    };
  }
  if (currentRoute === sourceRoute) {
    return executeCatalogRuntimeOracle(args);
  }

  const sourceNavigation = await browser.navigate(sourceRoute);
  assert([200, 204].includes(sourceNavigation.status),
    `${item.caseId} catalog source route status mismatch: ${sourceNavigation.status}`);
  const destinationRoute = currentRoute === sourceRoute ? screenRoute : currentRoute;
  let observation = null;
  let oracleError = null;
  let restoreNavigation = null;
  let restoreError = null;
  let restoreAttempted = false;
  const restoreDestination = async () => {
    restoreAttempted = true;
    restoreNavigation = await browser.navigate(destinationRoute);
    assert([200, 204].includes(restoreNavigation.status),
      `${item.caseId} catalog destination restore status mismatch: ${restoreNavigation.status}`);
  };
  try {
    observation = await executeCatalogRuntimeOracle(args);
  } catch (error) {
    oracleError = error;
  }
  if (!restoreAttempted) {
    try {
      await restoreDestination();
    } catch (error) {
      restoreError = error;
    }
  }
  if (oracleError || restoreError) {
    const details = [oracleError, restoreError]
      .filter(Boolean)
      .map(error => String(error?.message || error))
      .join("; ");
    throw new Error(details);
  }
  return {
    ...observation,
    routeLifecycle: {
      sourceRoute,
      destinationRoute,
      splitApiAndScreen: false,
      sourceNavigationStatus: sourceNavigation.status,
      restoreNavigationStatus: restoreNavigation.status,
    },
  };
}

function isApiRoute(route) {
  return /^\/(?:ops|client)\/api(?:\/|$)/.test(String(route || ""));
}

function routePathname(route) {
  try {
    return new URL(String(route || ""), "http://runtime.invalid").pathname;
  } catch {
    return "";
  }
}

async function cleanupTrustedInteraction(browser, item, spec, interaction, correlationId) {
  const kind = interaction?.actionKind || interaction?.kind || "";
  if (["start-live-tile", "control-sequence"].includes(kind)) {
    await browser.click(interaction.selector);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
    const paused = await browser.evaluate("Boolean(document.querySelector('video')?.paused)");
    assert(paused === true, `${item.caseId} media session cleanup did not stop playback`);
    return { strategy: "stop-live-session", status: "PASS", paused: true };
  }
  if (kind === "start-two-live-tiles") {
    const result = await browser.evaluate(`(async () => {
      const controls = Array.from(document.querySelectorAll(${JSON.stringify(interaction.selector)}))
        .slice(0, 2).map(tile => tile.querySelector('[data-action="toggle-playback"]')).filter(Boolean);
      for (const control of controls) if (!control.disabled) control.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      const videos = Array.from(document.querySelectorAll(${JSON.stringify(`${interaction.selector} video`)})).slice(0, 2);
      return { controlCount: controls.length, stopped: videos.length === 2 && videos.every(video => video.paused) };
    })()`);
    assert(result.controlCount === 2 && result.stopped === true,
      `${item.caseId} two-live-tile cleanup mismatch: ${JSON.stringify(result)}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
    return { strategy: "stop-two-live-sessions", status: "PASS", ...result };
  }
  if (kind === "fill") {
    await browser.fill(interaction.selector, interaction.before?.value || "");
    return { strategy: "restore-control-value", status: "PASS" };
  }
  if (kind === "select") {
    const previous = interaction.before?.selectedValues?.[0] || interaction.before?.value || "";
    await browser.select(interaction.selector, previous);
    return { strategy: "restore-select-value", status: "PASS" };
  }
  if (kind === "navigate-negative" || (kind === "activate" && item.caseId === "SAFE-053")) {
    const observed = await browser.navigate(spec.route);
    assert([200, 204].includes(observed.status), `${item.caseId} route cleanup status mismatch: ${observed.status}`);
    return { strategy: "restore-route", status: "PASS", route: spec.route };
  }
  if (kind === "composed-va-overlay-session") {
    await browser.click(interaction.playbackSelector || interaction.selector);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
    if (interaction.infoOverlayChanged) await browser.click("#liveInfoOverlayToggle");
    return { strategy: "stop-ui-created-va-overlay-session", status: "PASS" };
  }
  return { strategy: spec.cleanup?.strategy || "no-op-with-state-proof", status: "PASS" };
}

function clientSafeFixtureValues(bindings) {
  return {
    "active-session": bindings.sessionId,
    "assigned-view": bindings.assignedViewId,
    "assigned-view-a": bindings.viewA,
    "assigned-view-b": bindings.viewB,
    "blocked-view": bindings.blockedViewId,
    "event-record": bindings.eventId,
    "event-search-query": bindings.searchQuery,
    "va-metadata-sample": bindings.vaMetadataSampleId,
    "vlm-rule-suggestion-draft": bindings.draftId,
    "vlm-summary-candidate": bindings.candidateId,
  };
}

async function executeTrustedInteraction(browser, item, spec, correlationId, runtimeBindings) {
  if (/^(CLIENT|MEDIA|SAFE)-/.test(item.caseId)) {
    return executeClientSafeInteraction(browser, item, spec, correlationId, runtimeBindings);
  }
  const selector = refreshControls[spec.route] || "";
  if (!selector || ["form-submit", "persisted-mutation", "actionable", "negative-route"].includes(item.workflow.workflowClass)) {
    return { kind: "existing-primary-action-or-navigation", selector: item.workflow.primaryControl?.selector || null };
  }
  const before = await browser.snapshot(selector);
  assert(before.exists && before.visible && before.disabled === false,
    `${item.caseId} exact runtime refresh control is not actionable: ${selector}`);
  await browser.click(selector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
  const after = await browser.snapshot(selector);
  return { kind: "click", selector, before, after };
}

async function executeClientSafeInteraction(browser, item, spec, correlationId, runtimeBindings) {
  const action = spec.action || {};
  const target = String(action.target || spec.visibleControl?.selector || "");
  const snapshot = target && !target.startsWith("/") && target !== "start-stop-reconnect"
    ? await browser.snapshot(target)
    : null;
  if (action.kind === "assert-absence") {
    assert(!snapshot?.exists, `${item.caseId} forbidden product control exists: ${target}`);
    return { kind: action.kind, selector: target, observedAbsent: true };
  }
  if (action.kind === "assert-read-model") {
    const refresh = refreshControls[spec.route];
    if (refresh) {
      const control = await browser.snapshot(refresh);
      if (control.exists && control.visible && !control.disabled) {
        await browser.click(refresh);
        await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
        return { kind: action.kind, selector: target, refreshSelector: refresh };
      }
    }
    return { kind: action.kind, selector: target };
  }
  if (["activate", "start-live-tile"].includes(action.kind)) {
    const composed = await executeComposedClientSafeInteraction(
      browser,
      item,
      spec,
      correlationId,
      runtimeBindings,
    );
    if (composed) return composed;
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false,
      `${item.caseId} exact product action is not actionable: ${target}`);
    await browser.click(target);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
    return { kind: action.kind, selector: target, before: snapshot, after: await browser.snapshot(target) };
  }
  if (action.kind === "control-sequence") {
    const controlSelector = spec.visibleControl.selector;
    const ariaLabelSequence = [];
    const pausedSequence = [];
    for (let index = 0; index < 3; index += 1) {
      const control = await browser.snapshot(controlSelector);
      assert(control.exists && control.visible && control.disabled === false,
        `${item.caseId} control-sequence action unavailable: ${controlSelector}`);
      await browser.click(controlSelector);
      await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
      const state = await browser.evaluate(`(() => ({
        ariaLabel: document.querySelector(${JSON.stringify(controlSelector)})?.getAttribute('aria-label') || '',
        paused: Boolean(document.querySelector('video')?.paused),
      }))()`);
      ariaLabelSequence.push(state.ariaLabel);
      pausedSequence.push(state.paused);
    }
    return { kind: action.kind, selector: controlSelector, propertyHistory: { ariaLabelSequence, pausedSequence } };
  }
  if (action.kind === "start-two-live-tiles") {
    const result = await browser.evaluate(`(async () => {
      const tiles = Array.from(document.querySelectorAll(${JSON.stringify(target)})).slice(0, 2);
      if (tiles.length !== 2) return { tileCount: tiles.length, clicked: 0 };
      let clicked = 0;
      for (const tile of tiles) {
        const control = tile.querySelector('[data-action="toggle-playback"]');
        if (control && !control.disabled) { control.click(); clicked += 1; }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      return { tileCount: tiles.length, clicked };
    })()`);
    assert(result.tileCount === 2 && result.clicked === 2,
      `${item.caseId} two-live-tile action mismatch: ${JSON.stringify(result)}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
    return { kind: action.kind, selector: target, ...result };
  }
  if (action.kind === "reload") {
    const observed = await browser.navigate(target);
    assert([200, 204].includes(observed.status), `${item.caseId} reload status mismatch: ${observed.status}`);
    return { kind: action.kind, route: target, observed };
  }
  if (action.kind === "navigate-negative") {
    const observed = await browser.navigate(target);
    assert(observed.status === 404, `${item.caseId} negative navigation status mismatch: ${observed.status}`);
    return { kind: action.kind, route: target, observed };
  }
  if (action.kind === "fill") {
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false, `${item.caseId} fill control unavailable: ${target}`);
    await browser.fill(target, action.value);
    return { kind: action.kind, selector: target, before: snapshot, valueDigest: stableDigest(action.value) };
  }
  if (action.kind === "select") {
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false, `${item.caseId} select control unavailable: ${target}`);
    await browser.select(target, action.value);
    return { kind: action.kind, selector: target, before: snapshot, valueDigest: stableDigest(action.value) };
  }
  throw new Error(`${item.caseId} unsupported exact client/safe action kind: ${action.kind || "missing"}`);
}

export function validateClientRuntimeFixtureBindings(spec, bindings = {}) {
  const fixtures = new Set((spec?.setup?.fixtures || []).map(value => String(value)));
  const declaredUiCreatedSession = fixtures.has("active-live-session") ||
    (fixtures.has("va-metadata-sample") && spec?.action?.kind === "activate");
  const interactionCreatesSession = new Set([
    "control-sequence",
    "start-live-tile",
    "start-two-live-tiles",
  ]).has(spec?.action?.kind);
  const requiresUiCreatedSession = declaredUiCreatedSession || interactionCreatesSession;
  if (requiresUiCreatedSession) {
    assert(!String(bindings.sessionId || ""),
      `${spec.caseId} UI-created session contract rejects a backend-precreated session`);
  }
  if (fixtures.has("va-metadata-sample")) {
    assert(String(bindings.vaMetadataSampleId || ""),
      `${spec.caseId} VA metadata sample binding is missing`);
  }
  return {
    uiCreatesSession: declaredUiCreatedSession,
    interactionCreatesSession,
    requiresUiCreatedSession,
    vaMetadataSampleRequired: fixtures.has("va-metadata-sample"),
  };
}

function normalizeClientComposedRuntimeSpec(spec) {
  const fixtures = new Set((spec?.setup?.fixtures || []).map(value => String(value)));
  if (!fixtures.has("va-metadata-sample") || spec?.action?.kind !== "activate") return spec;
  const modeSelector = '[data-mode-action="va-overlay"]';
  return {
    ...spec,
    visibleControl: {
      ...spec.visibleControl,
      selector: modeSelector,
      action: { kind: "activate", target: modeSelector },
    },
    action: {
      ...spec.action,
      target: modeSelector,
    },
    dom: [
      {
        selector: modeSelector,
        fixtureRefs: [],
        requiredTextTokens: [],
        forbiddenTextTokens: [],
        cardinality: null,
        requiredAttributes: [{ name: "aria-pressed", operator: "equals", value: "true" }],
        propertyAssertions: [],
        valueFixtureRefs: [],
      },
      {
        selector: '[data-role="status"]',
        fixtureRefs: [],
        requiredTextTokens: [],
        forbiddenTextTokens: [],
        cardinality: null,
        requiredAttributes: [],
        propertyAssertions: [{ name: "text", operator: "includes", value: "온라인" }],
        valueFixtureRefs: [],
      },
      {
        selector: '[data-role="info-overlay"]',
        fixtureRefs: [],
        requiredTextTokens: [],
        forbiddenTextTokens: [],
        cardinality: null,
        requiredAttributes: [],
        propertyAssertions: [{ name: "hidden", operator: "equals", value: false }],
        valueFixtureRefs: [],
      },
    ],
  };
}

async function executeComposedClientSafeInteraction(
  browser,
  item,
  spec,
  correlationId,
  runtimeBindings,
) {
  const fixtures = new Set((spec?.setup?.fixtures || []).map(value => String(value)));
  const allStop = fixtures.has("active-live-session") && spec.action?.target === "#liveAllStop";
  const vaOverlay = fixtures.has("va-metadata-sample") && spec.action?.kind === "activate";
  if (!allStop && !vaOverlay) return null;
  const tile = await browser.evaluate(`(() => {
    const root = Array.from(document.querySelectorAll('[data-tile]'))
      .find(node => String(node.dataset.viewId || ''));
    return root ? { index: String(root.dataset.tile || ''), viewId: String(root.dataset.viewId || '') } : null;
  })()`);
  assert(tile?.viewId, `${item.caseId} composed client runtime has no assigned product tile`);
  const tileSelector = `[data-tile=${JSON.stringify(tile.index)}]`;
  const playbackSelector = `${tileSelector} [data-action="toggle-playback"]`;
  let modeSelector = null;
  let infoOverlayChanged = false;
  if (vaOverlay) {
    modeSelector = `${tileSelector} [data-mode-action="va-overlay"]`;
    const before = await browser.snapshot(modeSelector);
    assert(before.exists && before.visible && !before.disabled &&
      before.ariaPressed !== "true",
    `${item.caseId} VA mode must begin inactive and actionable`);
    await browser.click(modeSelector);
    const infoToggle = await browser.snapshot("#liveInfoOverlayToggle");
    assert(infoToggle.exists && infoToggle.visible && !infoToggle.disabled,
      `${item.caseId} product info overlay toggle is unavailable`);
    if (!infoToggle.checked) {
      await browser.click("#liveInfoOverlayToggle");
      infoOverlayChanged = true;
    }
  }
  const networkStart = browser.networkEntries().length;
  await browser.click(playbackSelector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 750, quietMs: 250 });
  const entries = browser.networkEntries().slice(networkStart);
  const response = entries.find(entry => entry.phase === "response" &&
    entry.correlationId === correlationId && entry.method === "POST" &&
    /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(new URL(entry.url).pathname) &&
    entry.safeResponseBody?.sessionId);
  assert(response?.safeResponseBody?.sessionId,
    `${item.caseId} composed client runtime did not observe a product session`);
  const request = entries.find(entry => entry.phase === "request-start" && entry.requestId === response.requestId);
  assert(request?.requestBody && typeof request.requestBody.overlayMode === "string",
    `${item.caseId} composed client runtime session request body is missing overlayMode`);
  if (vaOverlay) {
    assert(request.requestBody.overlayMode === "va-overlay",
      `${item.caseId} composed client runtime overlayMode drift`);
  }
  const vaProjection = vaOverlay
    ? await waitForClientVaOverlayProjection(browser, {
        caseId: item.caseId,
        tileSelector,
        viewId: tile.viewId,
        vaMetadataSampleId: runtimeBindings?.vaMetadataSampleId,
      })
    : null;
  if (allStop) {
    await browser.click("#liveAllStop");
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
  }
  return {
    kind: allStop ? "composed-live-start-all-stop" : "composed-va-overlay-session",
    actionKind: allStop ? "composed-live-start-all-stop" : "composed-va-overlay-session",
    selector: allStop ? "#liveAllStop" : modeSelector,
    playbackSelector,
    viewId: tile.viewId,
    sessionId: String(response.safeResponseBody.sessionId),
    overlayMode: request.requestBody.overlayMode,
    infoOverlayChanged,
    ...(vaProjection ? { vaProjection } : {}),
    status: "PASS",
  };
}

export async function waitForClientVaOverlayProjection(browser, {
  caseId,
  tileSelector,
  viewId,
  vaMetadataSampleId,
  timeoutMs = 20_000,
  pollIntervalMs = 100,
} = {}) {
  assert(browser?.evaluate, `${caseId || "CLIENT-021"} browser evaluation is unavailable`);
  assert(String(tileSelector || ""), `${caseId || "CLIENT-021"} tile selector is missing`);
  assert(String(viewId || ""), `${caseId || "CLIENT-021"} assigned view is missing`);
  assert(String(vaMetadataSampleId || ""),
    `${caseId || "CLIENT-021"} VA metadata sample binding is missing`);
  assert(Number.isFinite(timeoutMs) && timeoutMs > 0,
    `${caseId || "CLIENT-021"} VA projection timeout is invalid`);
  assert(Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 && pollIntervalMs <= timeoutMs,
    `${caseId || "CLIENT-021"} VA projection poll interval is invalid`);
  const projection = await browser.evaluate(`(async () => {
    const tileSelector = ${JSON.stringify(String(tileSelector))};
    const viewId = ${JSON.stringify(String(viewId))};
    const sampleId = ${JSON.stringify(String(vaMetadataSampleId))};
    const deadline = Date.now() + ${Number(timeoutMs)};
    const pollIntervalMs = ${Number(pollIntervalMs)};
    let last = null;
    while (Date.now() <= deadline) {
      const tile = document.querySelector(tileSelector);
      const mode = tile?.querySelector('[data-mode-action="va-overlay"]');
      const status = tile?.querySelector('[data-role="status"]');
      const infoOverlay = tile?.querySelector('[data-role="info-overlay"]');
      const trackNode = tile?.querySelector('[data-role="tracks"]');
      const eventNode = tile?.querySelector('[data-role="events"]');
      const tileIndex = Number(tile?.dataset?.tile || -1);
      const tileState = typeof liveTiles !== 'undefined' && Number.isInteger(tileIndex)
        ? liveTiles[tileIndex]
        : null;
      const dock = document.querySelector('#liveDockEvents');
      let apiStatus = 0;
      let event = null;
      try {
        const response = await fetch('/client/api/views/' + encodeURIComponent(viewId) + '/events?limit=6', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        apiStatus = response.status;
        const payload = await response.json();
        const recent = Array.isArray(payload?.events?.recent) ? payload.events.recent : [];
        event = recent.find(item => String(item?.eventId || '') === sampleId) || null;
      } catch {}
      const eventProjection = event ? {
        eventId: String(event.eventId || ''),
        label: String(event.scenarioName || event.className || event.eventId || ''),
        eventType: String(event.eventType || ''),
        status: String(event.status || ''),
      } : null;
      const dockText = String(dock?.innerText || dock?.textContent || '').replace(/\\s+/g, ' ').trim();
      const eventTokens = eventProjection
        ? [eventProjection.label, eventProjection.eventType, eventProjection.status].filter(Boolean)
        : [];
      const trackText = String(trackNode?.innerText || trackNode?.textContent || '').trim();
      const eventText = String(eventNode?.innerText || eventNode?.textContent || '').trim();
      const trackCount = Number(tileState?.trackCount);
      const eventCount = Number(tileState?.eventCount);
      const metadataReceived = Number(tileState?.lastMetadataAt || 0) > 0 &&
        Number.isFinite(trackCount) && Number.isFinite(eventCount) &&
        trackText === String(trackCount) && eventText === String(eventCount);
      last = {
        modeActive: mode?.getAttribute('aria-pressed') === 'true',
        statusOnline: String(status?.innerText || status?.textContent || '').includes('온라인'),
        infoOverlayVisible: Boolean(infoOverlay) && !infoOverlay.hidden &&
          getComputedStyle(infoOverlay).display !== 'none' &&
          getComputedStyle(infoOverlay).visibility !== 'hidden',
        apiStatus,
        eventProjection,
        metadataReceived,
        trackCount: Number.isFinite(trackCount) ? trackCount : null,
        eventCount: Number.isFinite(eventCount) ? eventCount : null,
        safeProjectionRendered: eventTokens.length >= 3 && eventTokens.every(token => dockText.includes(token)),
      };
      if (last.modeActive && last.statusOnline && last.infoOverlayVisible &&
          last.apiStatus === 200 && last.eventProjection?.eventId === sampleId &&
          last.metadataReceived && last.safeProjectionRendered) {
        return last;
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error('CLIENT VA projection timeout: ' + JSON.stringify({
      modeActive: Boolean(last?.modeActive),
      statusOnline: Boolean(last?.statusOnline),
      infoOverlayVisible: Boolean(last?.infoOverlayVisible),
      apiStatus: Number(last?.apiStatus || 0),
      sampleObserved: Boolean(last?.eventProjection?.eventId === sampleId),
      metadataReceived: Boolean(last?.metadataReceived),
      safeProjectionRendered: Boolean(last?.safeProjectionRendered),
    }));
  })()`);
  assert(projection?.modeActive === true && projection?.statusOnline === true &&
    projection?.infoOverlayVisible === true && projection?.apiStatus === 200 &&
    projection?.eventProjection?.eventId === String(vaMetadataSampleId) &&
    projection?.metadataReceived === true &&
    projection?.safeProjectionRendered === true,
  `${caseId || "CLIENT-021"} VA overlay projection did not reach the exact terminal state`);
  return {
    schema: "media-server.v390-ui-client-va-overlay-projection.v1",
    sampleId: String(projection.eventProjection.eventId),
    label: String(projection.eventProjection.label),
    eventType: String(projection.eventProjection.eventType),
    eventStatus: String(projection.eventProjection.status),
    modeActive: true,
    statusOnline: true,
    infoOverlayVisible: true,
    metadataReceived: true,
    trackCount: Number(projection.trackCount),
    eventCount: Number(projection.eventCount),
    safeProjectionRendered: true,
    apiStatus: 200,
  };
}

async function observeRequest(
  browser,
  item,
  request,
  bindings,
  correlationId,
  networkStart,
  primaryNetworkEntries = [],
  eventRuntimeContext = null,
) {
  const method = String(request.method || "GET").toUpperCase();
  const urlPath = expand(String(request.path || ""), bindings);
  const allowedStatuses = request.allowedStatuses || request.statuses || [200];
  const repeatCount = Number(request.repeat?.count || 1);
  const repeatIntervalMs = Number(request.repeat?.intervalMs || 0);
  assert(Number.isInteger(repeatCount) && repeatCount >= 1,
    `${item.caseId} exact request repeat count is invalid: ${repeatCount}`);
  assert(Number.isFinite(repeatIntervalMs) && repeatIntervalMs >= 0,
    `${item.caseId} exact request repeat interval is invalid: ${repeatIntervalMs}`);
  const samples = [];
  const observeOnce = async () => {
    let status = 0;
    let body = null;
    let contentType = "";
    let source = "";
    if (["GET", "HEAD"].includes(method)) {
      const result = await browser.evaluate(`fetch(${JSON.stringify(urlPath)}, {
        method: ${JSON.stringify(method)}, credentials: 'same-origin', cache: 'no-store'
      }).then(async response => {
        const text = await response.text();
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        return { status: response.status, text, json, contentType: response.headers.get('content-type') || '' };
      })`);
      status = result.status;
      body = result.json ?? result.text;
      contentType = result.contentType || "";
      source = "fresh-browser-fetch";
    } else {
      const match = [
        ...primaryNetworkEntries,
        ...browser.networkEntries().slice(networkStart),
      ].find(entry => {
        if (entry.phase !== "response" || entry.method !== method) return false;
        try { return new URL(entry.url).pathname === new URL(urlPath, "http://runtime.invalid").pathname; } catch (_) { return false; }
      });
      assert(match, `${item.caseId} exact mutation response missing: ${method} ${urlPath}`);
      if (endpointOwnedProjectionCases.has(item.caseId)) {
        assert(match.safeResponseProjectionSource === "playwright-response-json" &&
          typeof match.safeResponseProjectionKind === "string" && match.safeResponseProjectionKind,
        `${item.caseId} endpoint response did not pass through the native Playwright response projection`);
      }
      status = match.status;
      body = match.safeResponseBody ?? null;
      contentType = String(match.responseHeaders?.["content-type"] || match.contentType || "");
      source = "correlated-browser-network";
      if (request.correlationRequired !== false) {
        assert(match.correlationId === correlationId || match.correlationId === `${item.caseId}:primary-action`,
          `${item.caseId} exact mutation response correlation mismatch: ${method} ${urlPath}`);
      }
    }
    return { status, body, contentType, source };
  };
  for (let index = 0; index < repeatCount; index += 1) {
    samples.push(await observeOnce());
    if (index + 1 < repeatCount && repeatIntervalMs > 0) {
      await new Promise(resolve => setTimeout(resolve, repeatIntervalMs));
    }
  }
  const { status, body, contentType, source } = samples.at(-1);
  assert(allowedStatuses.includes(status),
    `${item.caseId} exact request status mismatch ${method} ${urlPath}: ${status}/${allowedStatuses.join(",")}`);
  const required = request.requiredJsonPaths || request.requiredBodyTokens || [];
  for (const token of required) {
    assertRequiredBodyToken(body, expand(String(token), bindings), item.caseId, `${method} ${urlPath}`);
  }
  const forbidden = request.forbiddenJsonKeys || [];
  for (const key of forbidden) {
    assert(!containsForbiddenResponseMaterial(body, String(key), contentType),
      `${item.caseId} forbidden response material observed in ${method} ${urlPath}: ${key}`);
  }
  const serializedBody = typeof body === "string" ? body : JSON.stringify(body ?? null);
  for (const expected of request.requiredJsonValues || []) {
    assert(expected.operator === "contains-value" && serializedBody.includes(String(expected.value)),
      `${item.caseId} required response value missing in ${method} ${urlPath}: ${expected.value}`);
  }
  for (const forbiddenValue of request.forbiddenJsonValues || []) {
    assert(forbiddenValue.operator === "excludes-fixture" && !serializedBody.includes(String(forbiddenValue.value)),
      `${item.caseId} forbidden response value observed in ${method} ${urlPath}: ${forbiddenValue.value}`);
  }
  for (const [key, expected] of Object.entries(request.cardinality || {})) {
    const values = recursiveValuesForKey(body, key);
    const actual = values.length === 1 && Array.isArray(values[0]) ? values[0].length : values.length;
    assert(actual === Number(expected),
      `${item.caseId} response cardinality mismatch in ${method} ${urlPath}: ${key}=${actual}/${expected}`);
  }
  const assertionEvidence = evaluateRequestAssertions(request.assertions || request.jsonAssertions || [], {
    body,
    contentType,
    bindings,
    caseId: item.caseId,
    requestLabel: `${method} ${urlPath}`,
    eventRuntimeContext,
    request,
    urlPath,
    samples,
  });
  return {
    evidence: {
      method,
      urlPath,
      status,
      source,
      bodyDigest: stableDigest(body),
      assertionEvidence,
      sampleCount: samples.length,
      sampleDigests: samples.map(sample => stableDigest(sample.body)),
    },
    body,
  };
}

async function observeDom(
  browser,
  item,
  assertion,
  bindings,
  responses,
  responseBodies,
  interaction,
  eventRuntimeContext = null,
) {
  const selector = expand(String(assertion.selector || ""), bindings);
  const observed = await browser.evaluate(`(async () => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const rects = nodes.map(node => node.getBoundingClientRect());
    const overlaps = rects.flatMap((left, index) => rects.slice(index + 1).map(right =>
      left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top)).filter(Boolean).length;
    const videos = nodes.filter(node => node instanceof HTMLVideoElement).concat(
      nodes.flatMap(node => Array.from(node.querySelectorAll('video'))));
    const mediaTrackKinds = [...new Set(videos.flatMap(video =>
      video.srcObject && typeof video.srcObject.getTracks === 'function' ? video.srcObject.getTracks().map(track => track.kind) : []))];
    const firstRects = rects.map(rect => [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const secondRects = nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100); });
    return {
      count: nodes.length,
      visibleCount: nodes.filter(node => {
        const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      text: nodes.map(node => String(node.innerText || node.textContent || '')).join(' ').replace(/\\s+/g, ' ').trim().slice(0, 24000),
      attributes: nodes.slice(0, 20).map(node => Object.fromEntries(Array.from(node.attributes || []).map(attr => [attr.name, attr.value]))),
      values: nodes.slice(0, 20).map(node => String(node.value ?? '')),
      formControls: nodes.flatMap(node => [
        ...(node.matches?.('input, textarea, select') ? [node] : []),
        ...Array.from(node.querySelectorAll('input, textarea, select')),
      ]).slice(0, 200).map(control => ({
        id: String(control.id || ''),
        name: String(control.getAttribute('name') || ''),
        dataTestid: String(control.getAttribute('data-testid') || ''),
        ariaLabel: String(control.getAttribute('aria-label') || ''),
        type: String(control.getAttribute('type') || control.tagName || '').toLowerCase(),
        value: String(control.value ?? ''),
      })),
      descendantCount: nodes.reduce((count, node) => count + node.querySelectorAll('*').length, 0),
      properties: {
        text: nodes.map(node => String(node.innerText || node.textContent || '')).join(' ').replace(/\\s+/g, ' ').trim(),
        value: nodes[0] && 'value' in nodes[0] ? String(nodes[0].value ?? '') : '',
        hidden: nodes.length > 0 ? nodes.every(node => node.hidden || getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden') : true,
        ariaLabelSequence: nodes.map(node => node.getAttribute('aria-label') || '').filter(Boolean),
        pausedSequence: videos.map(video => Boolean(video.paused)),
        mediaTrackKinds,
        playingCount: videos.filter(video => !video.paused && video.readyState >= 2).length,
        readyState: videos.length ? Math.max(...videos.map(video => Number(video.readyState || 0))) : 0,
        boundingRectWithinViewport: rects.every(rect => rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
        captionVisible: videos.some(video => Array.from(video.textTracks || []).some(track => track.mode === 'showing')),
        overlaps: overlaps > 0,
        overlapCount: overlaps,
        layoutStableSamples: JSON.stringify(firstRects) === JSON.stringify(secondRects),
        sampleId: nodes[0]?.getAttribute('data-sample-id') || nodes[0]?.dataset?.sampleId || '',
        navigationStatus: Number(document.body?.dataset?.navigationStatus || document.querySelector('[data-navigation-status]')?.getAttribute('data-navigation-status') || 0),
        runtimeTrendSamples: typeof dashboardRuntimeTrendSamples !== 'undefined'
          ? structuredClone(dashboardRuntimeTrendSamples)
          : null,
      },
    };
  })()`);
  const requiredText = (assertion.requiredTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const forbiddenText = (assertion.forbiddenTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const forbiddenMaterial = (assertion.forbiddenMaterialTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const zeroCardinalityExpected = assertion.cardinality?.operator === "equals" && Number(assertion.cardinality?.value) === 0;
  assert(observed.count > 0 || assertion.expectedExists === false || zeroCardinalityExpected,
    `${item.caseId} exact DOM selector missing: ${selector}`);
  if (assertion.expectedExists === false) {
    assert(observed.count === 0, `${item.caseId} forbidden DOM selector exists: ${selector}`);
  }
  if (assertion.cardinality) {
    const expected = Number(assertion.cardinality.value);
    const operator = String(assertion.cardinality.operator || "equals");
    assert(compareNumber(observed.count, operator, expected),
      `${item.caseId} exact DOM cardinality mismatch ${selector}: ${observed.count} ${operator} ${expected}`);
  }
  for (const token of requiredText) {
    assert(observed.text.includes(token), `${item.caseId} exact DOM token missing ${selector}: ${token}`);
  }
  for (const token of forbiddenText) {
    assert(!containsForbiddenDomMaterial(observed, token),
      `${item.caseId} forbidden DOM material observed ${selector}: ${token}`);
  }
  for (const token of forbiddenMaterial) {
    assert(!containsForbiddenStructuredDomMaterial(observed, token),
      `${item.caseId} forbidden DOM material observed ${selector}: ${token}`);
  }
  const requiredAttributes = Array.isArray(assertion.requiredAttributes)
    ? assertion.requiredAttributes
    : Object.entries(assertion.requiredAttributes || {}).map(([name, value]) => ({ name, value, operator: "equals" }));
  for (const expected of requiredAttributes) {
    const name = expected.name;
    if (!name || expected.value === null || expected.value === undefined) continue;
    const value = expand(String(expected.value), bindings);
    const matches = name === "count"
      ? compareNumber(observed.count, expected.operator || "equals", Number(value))
      : observed.attributes.some(attributes => compareAttribute(attributes[name], expected.operator || "equals", value));
    assert(matches,
      `${item.caseId} exact DOM attribute mismatch ${selector}: ${name}=${value}`);
  }
  const propertyEvidence = evaluateDomPropertyAssertions(assertion.propertyAssertions || [], observed, bindings, item.caseId, selector, interaction);
  const semanticEvidence = evaluateDomSemanticAssertions(
    assertion.assertions || [],
    observed,
    responseBodies,
    bindings,
    item.caseId,
    selector,
    eventRuntimeContext,
  );
  return {
    selector,
    count: observed.count,
    visibleCount: observed.visibleCount,
    textDigest: stableDigest(observed.text),
    responseCount: responses.length,
    propertyEvidence,
    semanticEvidence,
  };
}

function assertForbiddenNetwork(entries, item, spec, bindings) {
  for (const forbidden of spec.forbiddenNetwork || []) {
    const method = String(forbidden.method || "").toUpperCase();
    const expandedPath = expand(String(forbidden.path || ""), bindings);
    if (["FORBID", "EXTERNAL"].includes(method)) {
      const capability = expandedPath.toLowerCase();
      const hit = entries.some(entry => entry.phase === "request-start" &&
        String(entry.url || "").toLowerCase().includes(capability));
      assert(!hit, `${item.caseId} forbidden ${method.toLowerCase()} capability request observed: ${expandedPath}`);
      continue;
    }
    const pathPattern = expandedPath.replace(/\{any\}/g, "").replace(/\*+$/, "");
    const hit = entries.some(entry => {
      if (entry.phase !== "request-start" || entry.method !== method) return false;
      try {
        const pathname = new URL(entry.url).pathname;
        return forbidden.match === "exact" ? pathname === pathPattern : pathname.startsWith(pathPattern);
      } catch (_) { return false; }
    });
    assert(!hit, `${item.caseId} forbidden network request observed: ${method} ${pathPattern}`);
  }
}

function assertRequiredBodyToken(body, token, caseId, requestLabel) {
  if (!token) return;
  if (body && typeof body === "object" && resolvePath(body, token).length > 0) return;
  const serialized = typeof body === "string" ? body : JSON.stringify(body ?? null);
  const alternatives = token.split("|").map(value => value.trim()).filter(Boolean);
  assert(alternatives.some(value => serialized.includes(value)),
    `${caseId} exact response token/path missing in ${requestLabel}: ${token}`);
}

function resolvePath(value, expression) {
  const recursive = String(expression || "").match(/^\$\.\.([A-Za-z0-9_-]+)$/);
  if (recursive) return recursiveValuesForKey(value, recursive[1]);
  const normalized = String(expression || "").replace(/\[\]/g, ".*").replace(/^\$\.?/, "");
  if (!normalized || /[= <>]/.test(normalized)) return [];
  let current = [value];
  for (const segment of normalized.split(".").filter(Boolean)) {
    const next = [];
    for (const item of current) {
      if (segment === "*") {
        if (Array.isArray(item)) next.push(...item);
        else if (item && typeof item === "object") next.push(...Object.values(item));
      } else if (item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, segment)) {
        next.push(item[segment]);
      }
    }
    current = next;
  }
  return current.filter(value => value !== undefined);
}

function recursiveValuesForKey(value, wantedKey) {
  const results = [];
  const visit = current => {
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (key === wantedKey) results.push(child);
      visit(child);
    }
  };
  visit(value);
  return results;
}

function containsForbiddenKeyOrValue(value, needle) {
  if (!needle) return false;
  if (Array.isArray(value)) return value.some(item => containsForbiddenKeyOrValue(item, needle));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    const exactKey = key.toLowerCase() === needle.toLowerCase();
    if (exactKey && !isInactiveResponseAttestation(key, child)) return true;
    return containsForbiddenKeyOrValue(child, needle);
  });
}

function isInactiveResponseAttestation(key, value) {
  if (value !== false) return false;
  const normalizedKey = String(key || "");
  return /(?:Included|Exposed|Performed|Changed|Added|Present)$/.test(normalizedKey) ||
    inactiveResponseAttestationKeys.has(normalizedKey);
}

export function containsForbiddenResponseMaterial(value, needle, contentType) {
  const mediaType = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "text/html" || typeof value !== "string") {
    return containsForbiddenKeyOrValue(value, needle);
  }
  return htmlEmbeddedJsonDocuments(value).some(document => containsForbiddenKeyOrValue(document, needle)) ||
    htmlContainsForbiddenAttribute(value, needle);
}

function containsForbiddenDomMaterial(observed, needle) {
  const token = String(needle || "");
  const text = String(observed?.text || "");
  if (!/(?:credential|exposure)/i.test(token)) return text.includes(token);

  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp(`(?:^|[\\s{[(,;])['\"]?${escaped}['\"]?\\s*[:=]\\s*([^\\s,;)}\\]]+)`, "gi");
  for (const match of text.matchAll(assignment)) {
    if (!isRedactedDomValue(match[1])) return true;
  }

  return (observed?.formControls || []).some(control => {
    const identity = [control.id, control.name, control.dataTestid, control.ariaLabel]
      .map(value => String(value || "").toLowerCase()).join(" ");
    return identity.includes(token.toLowerCase()) && !isRedactedDomValue(control.value);
  });
}

export function containsForbiddenStructuredDomMaterial(observed, needle) {
  const token = String(needle || "");
  const text = String(observed?.text || "");
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp(`(?:^|[\\s{[(,;])['\"]?${escaped}['\"]?\\s*[:=]\\s*([^\\s,;)}\\]]+)`, "gi");
  for (const match of text.matchAll(assignment)) {
    if (!isRedactedDomValue(match[1])) return true;
  }

  if (!/(?:credential|password|token|source.?url|raw(?:locator|json|evidence|material)?)/i.test(token)) return false;
  return (observed?.formControls || []).some(control => {
    const identity = [control.id, control.name, control.dataTestid, control.ariaLabel]
      .map(value => String(value || "").toLowerCase()).join(" ");
    return identity.includes(token.toLowerCase()) && !isRedactedDomValue(control.value);
  });
}

function isRedactedDomValue(value) {
  const normalized = String(value ?? "").trim().replace(/^['\"]|['\"]$/g, "").toLowerCase();
  return normalized === "" || /^(?:false|null|none|undefined|redacted|masked|hidden|omitted|not[-_ ]?stored|비노출|비저장|없음|미포함)$/.test(normalized);
}

function htmlEmbeddedJsonDocuments(html) {
  const documents = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of String(html || "").matchAll(scriptPattern)) {
    const attributes = match[1] || "";
    const typeMatch = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    if (String(typeMatch?.[2] || "").trim().toLowerCase() !== "application/json") continue;
    const source = String(match[2] || "").trim();
    if (!source) continue;
    try {
      documents.push(JSON.parse(source));
    } catch {
      documents.push(source);
    }
  }
  return documents;
}

function htmlContainsForbiddenAttribute(html, needle) {
  const kebab = String(needle || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const compact = String(needle || "").toLowerCase();
  return [...String(html || "").matchAll(/\s([\w:-]+)\s*=\s*(["'])/g)].some(match => {
    const attribute = String(match[1] || "").toLowerCase();
    return attribute === compact || attribute === kebab ||
      attribute === `data-${compact}` || attribute === `data-${kebab}`;
  });
}

function compareAttribute(actual, operator, expected) {
  const value = String(actual ?? "");
  if (operator === "includes" || operator === "includesAll") return value.includes(expected);
  if (operator === "excludes" || operator === "excludesAll") return !value.includes(expected);
  if (operator === "present") return actual !== undefined;
  return value === expected;
}

function compareNumber(actual, operator, expected) {
  if (!Number.isFinite(Number(actual)) || !Number.isFinite(Number(expected))) return false;
  if (operator === "gte" || operator === "number-gte") return Number(actual) >= Number(expected);
  if (operator === "lte" || operator === "number-lte") return Number(actual) <= Number(expected);
  if (operator === "gt") return Number(actual) > Number(expected);
  if (operator === "lt") return Number(actual) < Number(expected);
  return Number(actual) === Number(expected);
}

function evaluateRequestAssertions(assertions, context) {
  return assertions.map(assertion => {
    if (context.caseId.startsWith("EVT-")) {
      const runtime = context.eventRuntimeContext || {};
      const requestIdentity = `${String(context.request.method || "GET").toUpperCase()} ${context.urlPath}`;
      const baselineResponse = runtime.responseByRequest?.[requestIdentity];
      const baselineBody = baselineResponse?.json ?? baselineResponse?.text;
      const requestBaselineValues = eventExactValuesAtPath(baselineBody, assertion.path);
      const requestBaseline = requestBaselineValues.length === 1
        ? requestBaselineValues[0]
        : requestBaselineValues;
      const query = Object.fromEntries(new URL(context.urlPath, "http://runtime.invalid").searchParams.entries());
      const requestByPath = { ...(runtime.requestByPath || {}) };
      if (assertion.operator.includes("request") && !Object.prototype.hasOwnProperty.call(requestByPath, assertion.path)) {
        requestByPath[assertion.path] = query;
      }
      const actualValues = eventExactValuesAtPath(
        typeof context.body === "object" ? context.body : null,
        assertion.path,
      );
      const actual = actualValues.length === 1 ? actualValues[0] : actualValues;
      const evidenceKey = eventExactSemanticEvidenceKey({
        scope: "response",
        caseId: context.caseId,
        operator: assertion.operator,
        subject: assertion.path,
      });
      const baselinePresent = baselineResponse !== undefined
        ? requestBaselineValues.length > 0 || ["$body", "$text", "$contentType"].includes(assertion.path)
        : Object.prototype.hasOwnProperty.call(runtime.priorResponseByPath || {}, assertion.path);
      const baseline = baselineResponse !== undefined
        ? requestBaseline
        : runtime.priorResponseByPath?.[assertion.path];
      let semanticPass = baselinePresent && stableEqual(actual, baseline);
      if (assertion.operator === "stable-across-bounded-samples") {
        const sampleValues = context.samples.map(sample => {
          const values = eventExactValuesAtPath(
            typeof sample.body === "object" ? sample.body : null,
            assertion.path,
          );
          return values.length === 1 ? values[0] : values;
        });
        semanticPass = sampleValues.length === Number(context.request.repeat?.count || 1) &&
          sampleValues.length > 1 &&
          sampleValues.every(value => stableEqual(value, sampleValues[0])) &&
          (!baselinePresent || stableEqual(sampleValues[0], baseline));
      }
      const result = evaluateEventExactResponseAssertion({
        caseId: context.caseId,
        assertion,
        responseJson: typeof context.body === "object" ? context.body : null,
        responseText: typeof context.body === "string" ? context.body : JSON.stringify(context.body ?? null),
        responseHeaders: { "content-type": context.contentType },
        context: {
          fixtureId: context.bindings.fixtureId,
          templateValues: context.bindings,
          seed: runtime.seed || {},
          seedByPath: runtime.seedByPath || {},
          requestByPath,
          priorResponseByPath: baselinePresent
            ? { ...(runtime.priorResponseByPath || {}), [assertion.path]: baseline }
            : (runtime.priorResponseByPath || {}),
          semanticEvidence: {
            [evidenceKey]: {
              pass: semanticPass,
              actual,
              reason: semanticPass
                ? "fresh response matches the independently captured authoritative baseline"
                : "fresh response differs from the independently captured authoritative baseline",
            },
          },
          sensitiveCanaries: [
            ...(runtime.sensitiveCanaries || []),
            context.bindings.redactionCanary,
            context.bindings.rawCanary,
            context.bindings.credentialCanary,
          ].filter(Boolean),
        },
      });
      assert(result.pass, `${context.caseId} exact request assertion failed ${context.requestLabel}: ${assertion.operator} ${assertion.path || ""} (${result.reason})`);
      return { operator: assertion.operator, path: assertion.path || null, valueDigest: stableDigest(result.actual) };
    }
    const operator = String(assertion.operator || "");
    const values = assertionValues(context.body, assertion.path, context.contentType);
    const serialized = JSON.stringify(values);
    let pass = false;
    const expected = assertion.expected !== undefined ? assertion.expected : assertion.value;
    if (operator === "equals" || operator === "equals-fixture") pass = values.some(value => Object.is(value, expected));
    else if (operator === "exists") pass = values.length > 0 && values.every(value => value !== undefined && value !== null);
    else if (operator === "number-gte") pass = values.some(value => compareNumber(value, "gte", assertion.expected));
    else if (operator === "number") pass = values.some(value => typeof value === "number" && Number.isFinite(value));
    else if (operator === "boolean") pass = values.some(value => typeof value === "boolean");
    else if (operator === "array") pass = values.some(Array.isArray);
    else if (operator === "object") pass = values.some(value => value && typeof value === "object" && !Array.isArray(value));
    else if (operator === "non-empty") pass = values.length > 0 && values.every(value => String(value ?? "").length > 0);
    else if (operator === "string-non-empty") pass = values.some(value => typeof value === "string" && value.length > 0);
    else if (operator === "starts-with") pass = values.some(value => String(value ?? "").startsWith(String(assertion.expected ?? "")));
    else if (operator === "contains-action") pass = serialized.includes(String(assertion.expected ?? ""));
    else if (operator.startsWith("contains-fixture")) {
      const candidates = fixtureBindingValues(context.bindings);
      pass = candidates.length > 0 && candidates.some(value => serialized.includes(value));
    } else if (operator.startsWith("not-contains-")) {
      const key = String(assertion.target || assertion.path || "").replace(/^\$/, "");
      const canary = String(context.bindings[key] || context.bindings.redactionCanary || "");
      pass = canary.length > 0 && !serialized.includes(canary);
    } else {
      throw new Error(`${context.caseId} unsupported exact request assertion operator: ${operator}`);
    }
    assert(pass, `${context.caseId} exact request assertion failed ${context.requestLabel}: ${operator} ${assertion.path || ""}`);
    return { operator, path: assertion.path || null, valueDigest: stableDigest(values) };
  });
}

function evaluateDomPropertyAssertions(assertions, observed, bindings, caseId, selector, interaction) {
  const textOrAttributes = `${observed.text} ${JSON.stringify(observed.attributes)} ${observed.values.join(" ")}`;
  return assertions.map(assertion => {
    const operator = String(assertion.operator || "");
    const rawValues = Array.isArray(assertion.value) ? assertion.value : [assertion.value];
    const values = rawValues.map(value => expand(String(value ?? ""), bindings));
    let pass = false;
    const actual = interaction?.propertyHistory?.[assertion.name] ?? observed.properties?.[assertion.name];
    if (assertion.name === "textOrAttributes" && (operator === "includesAll" || operator === "includes")) {
      pass = values.every(value => textOrAttributes.includes(value));
    } else if (assertion.name === "textOrAttributes" && (operator === "excludesAll" || operator === "excludes")) {
      pass = values.every(value => !textOrAttributes.includes(value));
    } else if (assertion.name === "count") {
      pass = compareNumber(observed.count, operator, Number(values[0]));
    } else if (operator === "equals") {
      const expected = Array.isArray(assertion.value)
        ? assertion.value.map(value => typeof value === "string" ? expand(value, bindings) : value)
        : (typeof assertion.value === "string" ? expand(assertion.value, bindings) : assertion.value);
      pass = JSON.stringify(actual) === JSON.stringify(expected);
    } else if (operator === "includes") {
      pass = Array.isArray(actual) ? actual.includes(assertion.value) : String(actual ?? "").includes(String(assertion.value));
    } else if (operator === "greaterThanOrEqual") {
      pass = Number(actual) >= Number(assertion.value);
    } else {
      throw new Error(`${caseId} unsupported exact DOM property assertion: ${assertion.name}/${operator}`);
    }
    assert(pass, `${caseId} exact DOM property assertion failed ${selector}: ${assertion.name}/${operator}`);
    return { name: assertion.name, operator, valueDigest: stableDigest(values) };
  });
}

function evaluateDomSemanticAssertions(
  assertions,
  observed,
  responseBodies,
  bindings,
  caseId,
  selector,
  eventRuntimeContext = null,
) {
  return assertions.map(assertion => {
    const operator = String(assertion.operator || "");
    const target = expand(String(assertion.target || ""), bindings);
    const responseValues = responseBodies.flatMap(body => target.split("|").flatMap(path => resolvePath(body, path)));
    if (operator === "samples-derived-from-responses") {
      const expected = dashboardRuntimeTrendSample(responseBodies);
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const actual = samples.at(-1) || null;
      assert(actual && equalDashboardRuntimeTrendSample(actual, expected),
        `${caseId} dashboard trend sample is not derived from the observed runtime/source/events responses`);
      return { operator, target, responseValueDigest: stableDigest(expected) };
    }
    if (operator === "delta-equals-baseline") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const baseline = bindings.runtimeTrendBaseline;
      assert(baseline && samples.length > 0 &&
        equalDashboardRuntimeTrendSample(samples[0], baseline),
      `${caseId} dashboard trend baseline is not bound to the current case context`);
      return { operator, target, responseValueDigest: stableDigest(baseline) };
    }
    if (operator === "history-bounded") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      assert(samples.length > 0 && samples.length <= 12,
        `${caseId} dashboard trend history exceeded the product sample limit`);
      return { operator, target, responseValueDigest: stableDigest(samples.length) };
    }
    if (caseId.startsWith("EVT-")) {
      const responseValueMap = {};
      const alternativeValues = [];
      for (const path of target.split("|").filter(Boolean)) {
        const values = responseBodies.flatMap(body => eventExactValuesAtPath(body, path));
        if (values.length > 0) {
          responseValueMap[path] = values.length === 1 ? values[0] : values;
          alternativeValues.push(responseValueMap[path]);
        }
      }
      if (alternativeValues.length > 0) responseValueMap[target] = alternativeValues[0];
      const evidenceKey = eventExactSemanticEvidenceKey({
        scope: "dom",
        caseId,
        operator,
        subject: target,
      });
      const serializedObservation = `${observed.text} ${JSON.stringify(observed.attributes)} ${JSON.stringify(observed.values)}`;
      const baselineEntries = Object.entries(eventRuntimeContext?.priorResponseByPath || {});
      const responseBaselineMatched = baselineEntries.every(([path, baseline]) => {
        const candidates = responseBodies
          .map(body => eventExactValuesAtPath(body, path))
          .filter(values => values.length > 0)
          .map(values => values.length === 1 ? values[0] : values);
        return candidates.length === 0 || candidates.some(actual => stableEqual(actual, baseline));
      });
      const fixtureCandidates = [
        bindings.fixtureId,
        bindings.eventId,
        bindings.sourceId,
        eventRuntimeContext?.templateValues?.fixtureId,
        eventRuntimeContext?.templateValues?.sourceId,
      ].filter(Boolean).map(String);
      const fixtureBoundOperator = /(?:fixture|selected-event|source-status|event-and-evidence|audit)/.test(operator);
      const observationPresent = observed.count > 0 && observed.visibleCount > 0 &&
        (observed.text.trim().length > 0 || observed.descendantCount > 0 || observed.attributes.length > 0);
      const fixtureObserved = !fixtureBoundOperator ||
        fixtureCandidates.some(value => serializedObservation.includes(value));
      const semanticPass = observationPresent && responseBaselineMatched && fixtureObserved;
      const semanticObservation = {
        selector,
        exists: observed.count > 0,
        visible: observed.visibleCount > 0,
        text: observed.text,
        number: Number(observed.text.replace(/[^0-9.-]/g, "")),
        attributes: observed.attributes,
        descendantCount: observed.descendantCount,
        formControls: observed.formControls,
      };
      const result = evaluateEventExactDomAssertion({
        caseId,
        assertion: { ...assertion, target },
        observation: semanticObservation,
        context: {
          fixtureId: bindings.fixtureId,
          templateValues: bindings,
          responseValues: responseValueMap,
          seed: eventRuntimeContext?.seed || {},
          seedByPath: eventRuntimeContext?.seedByPath || {},
          requestByPath: eventRuntimeContext?.requestByPath || {},
          semanticEvidence: {
            [evidenceKey]: {
              pass: semanticPass,
              actual: semanticObservation,
              reason: semanticPass
                ? "visible DOM projection is bound to fresh responses and the authoritative setup baseline"
                : "DOM projection, fixture identity, or authoritative response baseline binding is missing",
            },
          },
          sensitiveCanaries: [
            ...(eventRuntimeContext?.sensitiveCanaries || []),
            bindings.redactionCanary,
            bindings.rawCanary,
            bindings.credentialCanary,
          ].filter(Boolean),
        },
      });
      assert(result.pass, `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target} (${result.reason})`);
      return { operator, target, responseValueDigest: stableDigest(result.actual) };
    }
    let pass = false;
    if (operator === "number-equals-response") {
      pass = responseValues.some(value => Number(observed.text.replace(/[^0-9.-]/g, "")) === Number(value));
    } else if (operator === "text-includes") {
      pass = observed.text.includes(target);
    } else if (operator === "contains-descendant") {
      pass = observed.descendantCount > 0;
    } else if (operator.startsWith("contains-fixture")) {
      const candidates = fixtureBindingValues(bindings);
      pass = candidates.length > 0 && candidates.some(value => observed.text.includes(value) || JSON.stringify(observed.attributes).includes(value));
    } else if (operator.startsWith("not-contains-")) {
      const canary = String(bindings[target] || bindings.redactionCanary || "");
      pass = canary.length > 0 && !observed.text.includes(canary);
    } else {
      throw new Error(`${caseId} unsupported exact DOM semantic assertion operator: ${operator}`);
    }
    assert(pass, `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target}`);
    return { operator, target, responseValueDigest: stableDigest(responseValues) };
  });
}

export function dashboardRuntimeTrendSample(responseBodies) {
  assert(Array.isArray(responseBodies) && responseBodies.length === 3,
    "dashboard runtime trend requires runtime, source-health, and events responses");
  const [runtime, sourceHealth, eventsStatus] = responseBodies;
  const numberValue = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const session = runtime?.sessionManager || {};
  const webrtc = runtime?.webrtcHttp || {};
  const matching = runtime?.analysisMatching || {};
  const metadata = webrtc.metadataDataChannel || {};
  const sideChannel = webrtc.metadataSideChannel || {};
  const sourceItems = Array.isArray(sourceHealth?.sourceHealth) ? sourceHealth.sourceHealth : [];
  const sourceSummary = sourceHealth?.summary || {};
  const records = Array.isArray(eventsStatus?.records?.records)
    ? eventsStatus.records.records
    : [];
  const sessions = numberValue(session.activeSessions);
  const streams = numberValue(session.registryActiveStreams || session.resourceActiveStreams);
  const taps = numberValue(session.activeAnalysisTaps || matching.activeTapCount);
  const metadataClients = numberValue(sideChannel.activeSseClients) +
    numberValue(sideChannel.activeWebSocketClients) +
    (Array.isArray(metadata.channels) ? metadata.channels.length : 0);
  const liveSources = numberValue(sourceSummary.live ??
    sourceItems.filter(item => item?.status === "live").length);
  const sourceTotal = numberValue(sourceSummary.total ?? sourceItems.length);
  return {
    sessions,
    streams,
    taps,
    metadataClients,
    liveSources,
    sourceTotal,
    eventRecords: records.length,
    loadScore: sessions + streams + taps + metadataClients + records.length,
  };
}

export function bindDashboardRuntimeTrendBaseline({
  item,
  responseBodies,
  runtimeBindings,
  catalogBindings,
}) {
  assert(item?.caseId === "EVT-048",
    `${item?.caseId || "unknown"} dashboard baseline binding is not allowed`);
  const sourceHealth = responseBodies?.[1];
  const sourceItems = Array.isArray(sourceHealth?.sourceHealth) ? sourceHealth.sourceHealth : [];
  const sourceId = String(runtimeBindings?.sourceId || "");
  assert(sourceId,
    `${item.caseId} default published source binding is missing`);
  const matchingSources = sourceItems.filter(source =>
    String(source?.sourceId || source?.id || "") === sourceId);
  assert(matchingSources.length === 1,
    `${item.caseId} default published source is not uniquely present in source-health: ${sourceId}`);
  const baseline = dashboardRuntimeTrendSample(responseBodies);
  const previous = catalogBindings?.runtimeTrendBaseline || null;
  if (previous) {
    assert(equalDashboardRuntimeTrendSample(previous, baseline),
      `${item.caseId} current case runtime trend baseline drift`);
  } else if (catalogBindings && typeof catalogBindings === "object") {
    catalogBindings.runtimeTrendBaseline = structuredClone(baseline);
  } else {
    throw new Error(`${item.caseId} current case catalogBindings are required`);
  }
  runtimeBindings.runtimeTrendBaseline = structuredClone(baseline);
  return baseline;
}

function equalDashboardRuntimeTrendSample(actual, expected) {
  const keys = [
    "sessions",
    "streams",
    "taps",
    "metadataClients",
    "liveSources",
    "sourceTotal",
    "eventRecords",
    "loadScore",
  ];
  return keys.every(key => Number(actual?.[key]) === Number(expected?.[key]));
}

function assertionValues(body, expression, contentType) {
  if (expression === "$text" || expression === "$body") {
    return [typeof body === "string" ? body : JSON.stringify(body ?? null)];
  }
  if (expression === "$contentType") return [contentType];
  return resolvePath(body, expression);
}

function fixtureBindingValues(bindings) {
  return [...new Set(Object.entries(bindings)
    .filter(([key, value]) => /(^id$|fixture|sourceId|ruleId|viewId|candidateId|draftId|sessionId|eventId)/i.test(key) && value !== null && value !== undefined)
    .map(([, value]) => String(value))
    .filter(Boolean))];
}

function expand(value, bindings) {
  return value.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, key) => String(bindings[key] ?? `{${key}}`));
}

function stableDigest(value) {
  const text = typeof value === "string" ? value : stableSerialize(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableEqual(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
