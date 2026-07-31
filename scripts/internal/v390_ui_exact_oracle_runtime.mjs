// 파일 용도: exact runtime oracle catalog를 실제 브라우저 interaction/API/DOM 관찰로 실행한다.

import { createHash } from "node:crypto";

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  assertEventExactRuntimeBindings,
  evaluateEventExactDomAssertion,
  evaluateEventExactResponseAssertion,
  eventExactSemanticEvidenceKey,
  eventExactValuesAtPath,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { materializeClientSafeExactOracle } from "./v390_ui_exact_client_safe_oracles.mjs";
import { buildRequestCorrelationEvidence } from "./v390_ui_completion_oracle_lib.mjs";

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

export function buildEvt004MarkerStageEvidence({
  fileStageEvidence = null,
  dashboardResponseEvidence = null,
} = {}) {
  const failure = [
    [fileStageEvidence, "MARKER_FILE_STAGE_NOT_REACHED"],
    [dashboardResponseEvidence, "DASHBOARD_MARKER_RESPONSE_STAGE_NOT_REACHED"],
  ].find(([evidence]) => evidence?.pass !== true);
  return {
    schema: "media-server.v390-ui-evt004-marker-stage-evidence.v1",
    pass: !failure,
    failurePhase: failure?.[0]?.failurePhase || (failure ? "marker-stage" : ""),
    failureCode: failure?.[0]?.failureCode || failure?.[1] || "PASS",
    fileStageEvidence: fileStageEvidence
      ? structuredClone(fileStageEvidence)
      : null,
    dashboardResponseEvidence: dashboardResponseEvidence
      ? structuredClone(dashboardResponseEvidence)
      : null,
  };
}

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
  actionId,
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
    draftId: bindings.draftId || bindings.candidateId || fixtureId,
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
  let latestRequestCorrelationEvidence = null;
  const requestScopedCorrelationOnly = item.caseId === "EVT-004";
  let correlationScopeEvidence = null;
  const markerEvaluationTracker = item.caseId === "EVT-004"
    ? {
        invocationCount: 0,
        correlationResponseBound: false,
        domReadinessConfirmed: false,
      }
    : null;
  if (!requestScopedCorrelationOnly) await browser.setCorrelationId(correlationId);
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
        actionId,
        correlationId,
        networkStart,
        primaryNetworkEntries,
        eventRuntimeContext,
      );
      responses.push(observation.evidence);
      if (observation.evidence.requestCorrelationEvidence) {
        latestRequestCorrelationEvidence =
          structuredClone(observation.evidence.requestCorrelationEvidence);
      }
      responseBodies.push(observation.body);
    }
    if (markerEvaluationTracker) {
      assert(latestRequestCorrelationEvidence?.pass === true,
        `${item.caseId} marker evaluation requires correlated response binding`);
      markerEvaluationTracker.correlationResponseBound = true;
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
        markerEvaluationTracker,
      ));
    }
    if (markerEvaluationTracker &&
        markerEvaluationTracker.invocationCount !== 1) {
      const markerEvidence = buildMarkerEvaluatorLifecycleFailureEvidence({
        marker: runtimeBindings.logMarker,
        invocationCount: markerEvaluationTracker?.invocationCount || 0,
        correlationResponseBound:
          markerEvaluationTracker?.correlationResponseBound === true,
        domReadinessConfirmed:
          markerEvaluationTracker?.domReadinessConfirmed === true,
        failureCode: markerEvaluationTracker?.invocationCount === 0
          ? "MARKER_EVALUATOR_NOT_INVOKED"
          : "MARKER_EVALUATOR_DUPLICATE_INVOCATION",
      });
      const error = new Error(
        `${item.caseId} marker evaluator invocation mismatch: ` +
        `${markerEvaluationTracker?.invocationCount || 0}`,
      );
      error.markerEvidence = markerEvidence;
      throw error;
    }
    if (requestScopedCorrelationOnly) {
      correlationScopeEvidence = assertExclusiveRequestScopedCorrelation({
        browser,
        item,
        correlationId,
        actionId,
        networkStart,
        method: "GET",
        urlPath: "/ops/api/diagnostics/log-tail?limit=50",
      });
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
      ...(correlationScopeEvidence ? { correlationScopeEvidence } : {}),
      forbiddenNetworkObserved: 0,
      requestedRoute: spec.route,
      observedRoute: await browser.evaluate("location.pathname"),
    };
  } catch (error) {
    if (latestRequestCorrelationEvidence && !error.requestCorrelationEvidence) {
      error.requestCorrelationEvidence = latestRequestCorrelationEvidence;
    }
    throw error;
  } finally {
    await browser.setCorrelationId("");
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
    let markerStageEvidence = null;
    if (routePathname(currentRoute) !== routePathname(screenRoute)) {
      if (item.caseId === "EVT-004") {
        markerStageEvidence =
          await prepareEvt004MarkerDashboardNavigation(args);
      }
      await browser.setCorrelationId(`${item.caseId}:navigation`, { inject: false });
      screenNavigation = await browser.navigate(screenRoute);
      assert([200, 204].includes(screenNavigation.status),
        `${item.caseId} catalog screen route status mismatch: ${screenNavigation.status}`);
      if (item.caseId === "EVT-004") {
        markerStageEvidence =
          await completeEvt004MarkerDashboardNavigation(args, markerStageEvidence);
      }
    }
    try {
      const observation = await executeCatalogRuntimeOracle(args);
      return {
        ...observation,
        ...(markerStageEvidence ? { markerStageEvidence } : {}),
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
    } catch (error) {
      if (markerStageEvidence && !error.markerStageEvidence) {
        error.markerStageEvidence = structuredClone(markerStageEvidence);
      }
      throw error;
    }
  }
  if (currentRoute === sourceRoute) {
    return executeCatalogRuntimeOracle(args);
  }

  let markerStageEvidence = null;
  if (item.caseId === "EVT-004") {
    markerStageEvidence = await prepareEvt004MarkerDashboardNavigation(args);
  }
  const sourceNavigation = await browser.navigate(sourceRoute);
  assert([200, 204].includes(sourceNavigation.status),
    `${item.caseId} catalog source route status mismatch: ${sourceNavigation.status}`);
  if (item.caseId === "EVT-004") {
    markerStageEvidence =
      await completeEvt004MarkerDashboardNavigation(args, markerStageEvidence);
    try {
      const observation = await executeCatalogRuntimeOracle(args);
      return {
        ...observation,
        markerStageEvidence,
        routeLifecycle: {
          sourceRoute,
          destinationRoute: currentRoute,
          splitApiAndScreen: false,
          sourceObservation: "required-product-dashboard-dom",
          sourceNavigationStatus: sourceNavigation.status,
          restoreNavigationStatus: null,
          restoreAttempted: false,
          retainedRoute: sourceRoute,
        },
      };
    } catch (error) {
      if (!error.markerStageEvidence) {
        error.markerStageEvidence = structuredClone(markerStageEvidence);
      }
      throw error;
    }
  }
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
    const error = new Error(details);
    if (oracleError?.eventDomSemanticEvidence) {
      error.eventDomSemanticEvidence =
        structuredClone(oracleError.eventDomSemanticEvidence);
    }
    if (oracleError?.requestCorrelationEvidence) {
      error.requestCorrelationEvidence =
        structuredClone(oracleError.requestCorrelationEvidence);
    }
    throw error;
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

async function prepareEvt004MarkerDashboardNavigation(args) {
  const { browser } = args;
  assert(typeof args.beforeScreenNavigation === "function",
    "EVT-004 dashboard navigation requires a test-owned marker refresh hook");
  const markerRefresh = await args.beforeScreenNavigation();
  assert(markerRefresh?.status === "PASS" &&
    markerRefresh.source === "test-owned-log-marker-tail-prioritization",
  "EVT-004 dashboard marker refresh failed before navigation");
  const markerStageEvidence = buildEvt004MarkerStageEvidence({
    fileStageEvidence: markerRefresh.fileStageEvidence || null,
  });
  assert(markerRefresh.fileStageEvidence?.pass === true,
    `EVT-004 marker file stage failed: ${markerStageEvidence.failureCode}`);
  assert(typeof browser.armDiagnosticMarkerProbe === "function" &&
    typeof browser.diagnosticMarkerProbeEvidence === "function",
  "EVT-004 dashboard marker response probe is unavailable");
  browser.armDiagnosticMarkerProbe({
    caseId: "EVT-004",
    marker: String(args.catalogBindings?.logMarker || ""),
    method: "GET",
    urlPath: "/ops/api/diagnostics/log-tail?limit=80",
    ownedNoisePrefix: String(args.catalogBindings?.diagnosticNoisePrefix || ""),
  });
  return markerStageEvidence;
}

async function completeEvt004MarkerDashboardNavigation(args, markerStageEvidence) {
  await args.browser.waitForNetworkQuiet({
    minimumObservationMs: 750,
    quietMs: 250,
  });
  const dashboardResponseEvidence =
    await args.browser.diagnosticMarkerProbeEvidence();
  const completed = buildEvt004MarkerStageEvidence({
    fileStageEvidence: markerStageEvidence?.fileStageEvidence || null,
    dashboardResponseEvidence,
  });
  if (!completed.pass) {
    const error = new Error(
      `EVT-004 marker stage failed: ${completed.failureCode}`,
    );
    error.markerStageEvidence = completed;
    throw error;
  }
  return completed;
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
    const clickedTileIds = Array.isArray(interaction.clickedTileIds)
      ? interaction.clickedTileIds.map(String)
      : [];
    assert(clickedTileIds.length === 2 && new Set(clickedTileIds).size === 2,
      `${item.caseId} two-live-tile cleanup identity mismatch`);
    const result = await browser.evaluate(`(async () => {
      const selector = ${JSON.stringify(interaction.selector)};
      const identities = ${JSON.stringify(clickedTileIds)};
      let controlCount = 0;
      for (const identity of identities) {
        const tile = Array.from(document.querySelectorAll(selector)).find(candidate =>
          String(candidate.dataset.viewId || candidate.dataset.tile || '') === identity);
        const control = tile?.querySelector('[data-action="toggle-playback"]');
        if (control && !control.disabled) {
          control.click();
          controlCount += 1;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      const videos = identities.map(identity => {
        const tile = Array.from(document.querySelectorAll(selector)).find(candidate =>
          String(candidate.dataset.viewId || candidate.dataset.tile || '') === identity);
        return tile?.querySelector('video') || null;
      }).filter(Boolean);
      return { controlCount, stopped: videos.length === 2 && videos.every(video => video.paused) };
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
    "scoped-event-record": bindings.eventId,
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
  let snapshot = target && !target.startsWith("/") && target !== "start-stop-reconnect"
    ? await browser.snapshot(target)
    : null;
  if (["#liveAllStop", "#liveSaveLayoutPreference"].includes(target) &&
      snapshot?.exists && !snapshot.visible) {
    const details = await browser.snapshot("details.workspace-actions");
    if (details.exists && !details.open) {
      await browser.click("details.workspace-actions > summary");
      snapshot = await browser.snapshot(target);
    }
  }
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
        paused: Boolean(document.querySelector(${JSON.stringify(spec.dom.find(assertion =>
          assertion.propertyAssertions.some(property => property.name === "pausedSequence"))?.selector || "video")})?.paused),
      }))()`);
      ariaLabelSequence.push(state.ariaLabel);
      pausedSequence.push(state.paused);
    }
    return { kind: action.kind, selector: controlSelector, propertyHistory: { ariaLabelSequence, pausedSequence } };
  }
  if (action.kind === "start-two-live-tiles") {
    const result = await browser.evaluate(`(async () => {
      const selector = ${JSON.stringify(target)};
      const tileCount = document.querySelectorAll(selector).length;
      if (tileCount < 2) return { tileCount, clicked: 0 };
      const clickedTileIds = [];
      let clicked = 0;
      for (let index = 0; index < 2; index += 1) {
        const tiles = Array.from(document.querySelectorAll(selector));
        const tile = tiles.find(candidate => {
          const identity = String(candidate.dataset.viewId || candidate.dataset.tile || '');
          const control = candidate.querySelector('[data-action="toggle-playback"]');
          return identity && !clickedTileIds.includes(identity) && control && !control.disabled;
        });
        if (!tile) break;
        const identity = String(tile.dataset.viewId || tile.dataset.tile || '');
        const control = tile.querySelector('[data-action="toggle-playback"]');
        if (control && !control.disabled) {
          control.click();
          clickedTileIds.push(identity);
          clicked += 1;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
      return { tileCount, clicked, clickedTileIds };
    })()`);
    assert(result.tileCount >= 2 && result.clicked === 2 &&
      new Set(result.clickedTileIds || []).size === 2,
      `${item.caseId} two-live-tile action mismatch: ${JSON.stringify(result)}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
    return { kind: action.kind, selector: target, ...result };
  }
  if (action.kind === "reload") {
    const observed = await browser.navigate(target);
    assert([200, 204].includes(observed.status), `${item.caseId} reload status mismatch: ${observed.status}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
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
  const referencesUiCreatedSession = (spec?.requests || []).some(request =>
    (request.fixtureRefs || []).includes("active-session"));
  const requiresUiCreatedSession = declaredUiCreatedSession ||
    interactionCreatesSession ||
    referencesUiCreatedSession;
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
    referencesUiCreatedSession,
    requiresUiCreatedSession,
    vaMetadataSampleRequired: fixtures.has("va-metadata-sample"),
  };
}

function normalizeClientComposedRuntimeSpec(spec) {
  const fixtures = new Set((spec?.setup?.fixtures || []).map(value => String(value)));
  if (!fixtures.has("va-metadata-sample") || spec?.action?.kind !== "activate") return spec;
  const modeSelector = '[data-tile="0"] [data-mode-action="va-overlay"]';
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
    assert(before.exists && before.visible && !before.disabled,
      `${item.caseId} VA mode must be actionable`);
    if (before.ariaPressed !== "true") await browser.click(modeSelector);
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
    const allStopBefore = await browser.snapshot("#liveAllStop");
    if (allStopBefore.exists && !allStopBefore.visible) {
      await browser.click("details.workspace-actions > summary");
    }
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
  actionId,
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
    let requestCorrelationEvidence = null;
    if (["GET", "HEAD"].includes(method)) {
      const fetchNetworkStart = browser.networkEntries().length;
      const result = item.caseId === "EVT-004"
        ? await browser.request({
            method,
            urlPath,
            actionId,
            correlationId: request.correlationRequired === false ? "" : correlationId,
          })
        : await browser.evaluate(`fetch(${JSON.stringify(urlPath)}, {
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
      if (request.correlationRequired !== false) {
        requestCorrelationEvidence = assertCorrelatedRuntimeFetch({
          browser,
          item,
          actionId,
          method,
          urlPath,
          correlationId,
          networkStart: fetchNetworkStart,
          status,
          requestResult: item.caseId === "EVT-004"
            ? result
            : {
                actionId,
                requestAttemptCount: 1,
                requestReissued: false,
              },
        });
      }
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
    return { status, body, contentType, source, requestCorrelationEvidence };
  };
  for (let index = 0; index < repeatCount; index += 1) {
    samples.push(await observeOnce());
    if (index + 1 < repeatCount && repeatIntervalMs > 0) {
      await new Promise(resolve => setTimeout(resolve, repeatIntervalMs));
    }
  }
  const { status, body, contentType, source, requestCorrelationEvidence } = samples.at(-1);
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
  for (const pseudoField of request.requiredResponsePseudoFields || []) {
    assert(responsePseudoFieldValues({ body, contentType, status }, pseudoField).length > 0,
      `${item.caseId} required response pseudo-field is unavailable in ${method} ${urlPath}: ${pseudoField}`);
  }
  assertResponseFieldPolicies({
    body,
    policies: request.responseFieldPolicies || [],
    caseId: item.caseId,
    requestLabel: `${method} ${urlPath}`,
  });
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
    status,
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
      bodyDigest: sha256Digest(body),
      assertionEvidence,
      sampleCount: samples.length,
      sampleDigests: samples.map(sample => sha256Digest(sample.body)),
      ...(requestCorrelationEvidence ? { requestCorrelationEvidence } : {}),
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
  markerEvaluationTracker = null,
) {
  const selector = expand(String(assertion.selector || ""), bindings);
  const descendantSelectors = [...new Set((assertion.assertions || [])
    .filter(candidate => candidate.operator === "contains-descendant")
    .map(candidate => expand(String(candidate.target || ""), bindings))
    .filter(Boolean))];
  const markerAssertion = item.caseId === "EVT-004" &&
    (assertion.assertions || []).some(candidate =>
      candidate.operator === "contains-fixture-marker" &&
      candidate.target === "marker");
  if (markerAssertion) {
    await browser.waitForSelector(selector, { state: "visible" });
  }
  const observed = await browser.evaluate(`(async () => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const descendantSelectors = ${JSON.stringify(descendantSelectors)};
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
      nodeTexts: nodes.slice(0, 20).map(node =>
        String(node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 4000)),
      semanticNodeTexts: nodes.flatMap(node => Array.from(node.querySelectorAll('.root-cause-item')))
        .slice(0, 20)
        .map(node => String(node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 4000)),
      semanticNodeKinds: nodes.flatMap(node => Array.from(node.querySelectorAll('.root-cause-item')))
        .slice(0, 20)
        .map(node => String(node.getAttribute('data-incident-unit') || '')),
      visibleSemanticNodeTexts: nodes.flatMap(node => Array.from(node.querySelectorAll('.root-cause-item')))
        .filter(node => {
          const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .slice(0, 20)
        .map(node => String(node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 4000)),
      visibleSemanticNodeKinds: nodes.flatMap(node => Array.from(node.querySelectorAll('.root-cause-item')))
        .filter(node => {
          const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .slice(0, 20)
        .map(node => String(node.getAttribute('data-incident-unit') || '')),
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
      descendantMatches: descendantSelectors.map(descendantSelector => {
        const ownerNodes = nodes.filter(node => node.querySelector(descendantSelector));
        const matches = [...new Set(nodes.flatMap(node =>
          Array.from(node.querySelectorAll(descendantSelector))))];
        const visibleCount = matches.filter(node => {
          const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
        return {
          selector: descendantSelector,
          count: matches.length,
          visibleCount,
          ownerNodeCount: ownerNodes.length,
        };
      }),
      descendants: descendantSelectors.filter(descendantSelector => {
        const ownerNodes = nodes.filter(node => node.querySelector(descendantSelector));
        const matches = [...new Set(nodes.flatMap(node =>
          Array.from(node.querySelectorAll(descendantSelector))))];
        const visibleCount = matches.filter(node => {
          const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
        return nodes.length === 1 && ownerNodes.length === 1 &&
          matches.length === 1 && visibleCount === 1;
      }),
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
  if (markerAssertion) {
    assert(observed.count > 0 && observed.visibleCount > 0,
      `${item.caseId} marker DOM readiness failed: ${selector}`);
    markerEvaluationTracker.domReadinessConfirmed = true;
  }
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
  const attributeOwnerEvidence = await validateRuntimeAttributeOwners(browser, item, assertion, bindings);
  const propertyEvidence = evaluateDomPropertyAssertions(assertion.propertyAssertions || [], observed, bindings, item.caseId, selector, interaction);
  const semanticEvidence = evaluateDomSemanticAssertions(
    assertion.assertions || [],
    observed,
    responseBodies,
    bindings,
    item.caseId,
    selector,
    eventRuntimeContext,
    markerEvaluationTracker,
  );
  return {
    selector,
    count: observed.count,
    visibleCount: observed.visibleCount,
    textDigest: stableDigest(observed.text),
    responseCount: responses.length,
    propertyEvidence,
    semanticEvidence,
    attributeOwnerEvidence,
  };
}

function assertCorrelatedRuntimeFetch({
  browser,
  item,
  actionId,
  method,
  urlPath,
  correlationId,
  networkStart,
  status,
  requestResult,
}) {
  const entries = browser.networkEntries().slice(networkStart);
  if (entries.length === 0 && browser.runtimeCorrelationOptionalForContract === true) return null;
  const evidence = buildRequestCorrelationEvidence({
    entries,
    actionId,
    expected: {
      caseId: item.caseId,
      method,
      urlPath,
      correlationId,
      correlationRequired: true,
      allowedStatuses: [status],
      requestKind: "application-fetch",
    },
    requestResult,
    listenerInstalledBeforeRequest: typeof browser.requestListenersInstalled === "function"
      ? browser.requestListenersInstalled() === true
      : browser.runtimeCorrelationOptionalForContract === true,
  });
  if (!evidence.pass) {
    const error = new Error(
      `${item.caseId} exact runtime fetch correlation failed: ${method} ${urlPath}/${evidence.failureCode}`,
    );
    error.requestCorrelationEvidence = structuredClone(evidence);
    throw error;
  }
  return evidence;
}

export function assertExclusiveRequestScopedCorrelation({
  browser,
  item,
  correlationId,
  actionId,
  networkStart,
  method,
  urlPath,
}) {
  const entries = browser.networkEntries().slice(networkStart);
  const evidence = buildExclusiveRequestScopedCorrelationEvidence({
    entries,
    correlationId,
    actionId,
    method,
    urlPath,
  });
  if (!evidence.pass) {
    const error = new Error(
      `${item.caseId} request-scoped correlation failed: ${evidence.failureCode}`,
    );
    error.requestCorrelationScopeEvidence = structuredClone(evidence);
    throw error;
  }
  return evidence;
}

export function buildExclusiveRequestScopedCorrelationEvidence({
  entries = [],
  correlationId,
  actionId,
  method,
  urlPath,
}) {
  const expectedPath = runtimeRequestTarget(urlPath);
  const correlatedRequests = entries.filter(entry =>
    entry?.phase === "request-start" &&
    entry?.correlationSource === "request-header" &&
    Boolean(entry?.correlationId));
  const correlatedResponses = entries.filter(entry =>
    entry?.phase === "response" &&
    entry?.correlationSource === "request-header" &&
    entry?.responseCorrelationSource === "initiating-request-identity" &&
    Boolean(entry?.correlationId));
  const exactRequests = correlatedRequests.filter(entry =>
    entry.correlationId === correlationId &&
    String(entry.method || "").toUpperCase() === method &&
    runtimeRequestTarget(entry.url) === expectedPath);
  const exactResponses = correlatedResponses.filter(entry =>
    entry.correlationId === correlationId &&
    String(entry.method || "").toUpperCase() === method &&
    runtimeRequestTarget(entry.url) === expectedPath);
  const leakedRequests = correlatedRequests.filter(entry => !exactRequests.includes(entry));
  const leakedResponses = correlatedResponses.filter(entry => !exactResponses.includes(entry));
  const requestIds = new Set(exactRequests.map(entry => entry.requestId));
  const responseIds = new Set(exactResponses.map(entry => entry.requestId));
  const requestIdentities = new Set(exactRequests.map(entry => entry.caseRequestIdentity));
  const responseIdentities = new Set(exactResponses.map(entry => entry.caseRequestIdentity));
  const requestSequences = new Set(exactRequests.map(entry => entry.caseRequestSequence));
  const responseSequences = new Set(exactResponses.map(entry => entry.caseRequestSequence));
  const expectedCaseId = String(actionId || "").split(":")[0];
  const identityOwnedByCase = entry =>
    Boolean(expectedCaseId) &&
    Number.isInteger(entry?.caseRequestSequence) &&
    entry.caseRequestIdentity ===
      `${expectedCaseId}:request-${entry.caseRequestSequence}`;
  const caseIdentityOwned = exactRequests.every(identityOwnedByCase) &&
    exactResponses.every(identityOwnedByCase);
  const responseIdentityTrusted = exactResponses.every(entry =>
    entry.responseRequestObjectObserved === true &&
    ["playwright-response-request", "fixture-initiating-request-handle"]
      .includes(entry.requestIdentitySource));
  const pass = exactRequests.length === 1 &&
    exactResponses.length === 1 &&
    requestIds.size === 1 &&
    responseIds.size === 1 &&
    [...requestIds][0] === [...responseIds][0] &&
    requestIdentities.size === 1 &&
    responseIdentities.size === 1 &&
    Boolean([...requestIdentities][0]) &&
    [...requestIdentities][0] === [...responseIdentities][0] &&
    requestSequences.size === 1 &&
    responseSequences.size === 1 &&
    Number.isInteger([...requestSequences][0]) &&
    [...requestSequences][0] > 0 &&
    [...requestSequences][0] === [...responseSequences][0] &&
    caseIdentityOwned &&
    responseIdentityTrusted &&
    leakedRequests.length === 0 &&
    leakedResponses.length === 0;
  const orderedLedger = entries
    .filter(entry => ["request-start", "response"].includes(entry?.phase))
    .map(entry => ({
      phase: entry.phase,
      requestId: String(entry.requestId || ""),
      caseRequestIdentity: String(entry.caseRequestIdentity || ""),
      caseRequestSequence: Number.isInteger(entry.caseRequestSequence)
        ? entry.caseRequestSequence
        : null,
      requestKind: String(entry.requestKind || ""),
      method: String(entry.method || "").toUpperCase(),
      path: safeEvidenceRequestTarget(entry.url),
      status: Number(entry.status || 0),
      correlationDigest: entry.correlationId
        ? createHash("sha256").update(entry.correlationId).digest("hex")
        : "",
      requestHeaderDigest: String(entry.requestHeaderDigest || ""),
      responseRequestObjectObserved: entry.responseRequestObjectObserved === true,
      requestIdentitySource: String(entry.requestIdentitySource || ""),
      correlationSource: String(entry.correlationSource || ""),
      responseCorrelationSource: String(entry.responseCorrelationSource || ""),
    }));
  const evidence = {
    schema: "media-server.v390-ui-request-correlation-scope-evidence.v1",
    pass,
    actionId: String(actionId || ""),
    method,
    path: expectedPath,
    requestKind: "application-fetch",
    logTailRequestCount: exactRequests.length,
    logTailResponseCount: exactResponses.length,
    correlationDigest: correlationId
      ? createHash("sha256").update(correlationId).digest("hex")
      : "",
    correlationLeakRequestCount: leakedRequests.length,
    correlationLeakResponseCount: leakedResponses.length,
    orderedLedger,
    failurePhase: pass ? "" : "application-fetch-correlation-scope",
    failureCode: pass
      ? ""
      : (!caseIdentityOwned
          ? "REQUEST_CASE_OWNERSHIP_MISMATCH"
          : (leakedRequests.length || leakedResponses.length
          ? "CORRELATION_SCOPE_LEAK"
          : "AUTHORITATIVE_REQUEST_BINDING_MISMATCH")),
  };
  return evidence;
}

function runtimeRequestTarget(value) {
  try {
    const url = new URL(String(value || ""), "http://runtime.invalid");
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function safeEvidenceRequestTarget(value) {
  try {
    const url = new URL(String(value || ""), "http://runtime.invalid");
    for (const key of [...url.searchParams.keys()]) {
      if (/(?:token|secret|password|credential|authorization|api[-_]?key|code)/i.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

export async function validateRuntimeAttributeOwners(browser, item, assertion, bindings = {}) {
  const owners = Array.isArray(assertion.attributeOwners) ? assertion.attributeOwners : [];
  const evidence = [];
  for (const owner of owners) {
    const selector = expand(String(owner?.selector || ""), bindings);
    assert(selector, `${item.caseId} exact DOM attribute owner selector is missing`);
    const attributes = Array.isArray(owner?.attributes) ? owner.attributes : [];
    assert(attributes.length > 0, `${item.caseId} exact DOM attribute owner attributes are missing: ${selector}`);
    const observed = await browser.evaluate(`(() => Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      .slice(0, 20).map(node => Object.fromEntries(Array.from(node.attributes || []).map(attr => [attr.name, attr.value]))))()`).catch(error => {
      throw new Error(`${item.caseId} exact DOM attribute owner observation failed ${selector}: ${String(error?.message || error)}`);
    });
    assert(Array.isArray(observed) && observed.length > 0,
      `${item.caseId} exact DOM attribute owner selector missing: ${selector}`);
    for (const expected of attributes) {
      const name = String(expected?.name || "");
      const value = expected?.value === null || expected?.value === undefined
        ? null
        : expand(String(expected.value), bindings);
      if (!name || value === null) continue;
      assert(observed.some(actual => compareAttribute(actual?.[name], expected.operator || "equals", value)),
        `${item.caseId} exact DOM attribute owner mismatch ${selector}: ${name}=${value}`);
    }
    evidence.push({ selector, attributeCount: attributes.length, nodeCount: observed.length });
  }
  return evidence;
}

function assertResponseFieldPolicies({ body, policies, caseId, requestLabel }) {
  for (const policy of policies) {
    const path = String(policy?.path || "");
    assert(path === "debugCounters" && policy.endpoint === "/ops/api/runtime/status" &&
      policy.leafType === "finite-number" && policy.containersAllowed === true &&
      JSON.stringify(policy.allowedStringLeaves) === JSON.stringify(["analysisTapReuseKey"]),
    `${caseId} unsupported response field policy in ${requestLabel}: ${path}`);
    const values = resolvePath(body, path);
    assert(values.length === 1,
      `${caseId} response field policy path missing or ambiguous in ${requestLabel}: ${path}`);
    assertTypedDebugCounterLeaves(values[0], caseId, requestLabel, path,
      new Set(policy.allowedStringLeaves));
  }
}

function assertTypedDebugCounterLeaves(value, caseId, requestLabel, path, allowedStringLeaves, leafPath = "") {
  if (Array.isArray(value)) {
    assert(value.length > 0, `${caseId} response field policy has no numeric leaves in ${requestLabel}: ${path}`);
    for (let index = 0; index < value.length; index += 1) {
      assertTypedDebugCounterLeaves(value[index], caseId, requestLabel, path,
        allowedStringLeaves, `${leafPath}[${index}]`);
    }
    return;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    assert(entries.length > 0, `${caseId} response field policy has no numeric leaves in ${requestLabel}: ${path}`);
    for (const [key, child] of entries) {
      assertTypedDebugCounterLeaves(child, caseId, requestLabel, path,
        allowedStringLeaves, leafPath ? `${leafPath}.${key}` : key);
    }
    return;
  }
  if (typeof value === "string" && allowedStringLeaves.has(leafPath)) return;
  assert(typeof value === "number" && Number.isFinite(value),
    `${caseId} response field policy requires a finite numeric or typed string leaf in ${requestLabel}: ${path}.${leafPath}`);
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
      const requestBaselineValues = eventRuntimeAssertionValues({
        body: baselineBody,
        contentType: baselineResponse?.contentType || baselineResponse?.headers?.["content-type"] || "",
        status: baselineResponse?.status,
        path: assertion.path,
      });
      const requestBaseline = requestBaselineValues.length === 1
        ? requestBaselineValues[0]
        : requestBaselineValues;
      const query = Object.fromEntries(new URL(context.urlPath, "http://runtime.invalid").searchParams.entries());
      const requestByPath = { ...(runtime.requestByPath || {}) };
      if (assertion.operator.includes("request") && !Object.prototype.hasOwnProperty.call(requestByPath, assertion.path)) {
        requestByPath[assertion.path] = query;
      }
      const actualValues = eventRuntimeAssertionValues({
        body: context.body,
        contentType: context.contentType,
        status: context.status,
        path: assertion.path,
      });
      const actual = actualValues.length === 1 ? actualValues[0] : actualValues;
      const evidenceKey = eventExactSemanticEvidenceKey({
        scope: "response",
        caseId: context.caseId,
        operator: assertion.operator,
        subject: assertion.path,
      });
      const baselinePresent = baselineResponse !== undefined
        ? requestBaselineValues.length > 0 || ["$body", "$text", "$contentType", "$status"].includes(assertion.path)
        : Object.prototype.hasOwnProperty.call(runtime.priorResponseByPath || {}, assertion.path);
      const baseline = baselineResponse !== undefined
        ? requestBaseline
        : runtime.priorResponseByPath?.[assertion.path];
      let semanticPass = baselinePresent && stableEqual(actual, baseline);
      if (assertion.operator === "stable-across-bounded-samples") {
        const sampleValues = context.samples.map(sample => {
          const values = eventRuntimeAssertionValues({
            body: sample.body,
            contentType: sample.contentType,
            status: sample.status,
            path: assertion.path,
          });
          return values.length === 1 ? values[0] : values;
        });
        semanticPass = sampleValues.length === Number(context.request.repeat?.count || 1) &&
          sampleValues.length > 1 &&
          sampleValues.every(value => stableEqual(value, sampleValues[0])) &&
          (!baselinePresent || stableEqual(sampleValues[0], baseline));
      }
      const evaluatorContext = {
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
        };
      const result = assertion.path === "$status"
        ? evaluateRuntimeStatusPseudoFieldAssertion(assertion, context.status, { ...evaluatorContext, caseId: context.caseId })
        : evaluateEventExactResponseAssertion({
            caseId: context.caseId,
            assertion,
            responseJson: typeof context.body === "object" ? context.body : null,
            responseText: typeof context.body === "string" ? context.body : JSON.stringify(context.body ?? null),
            responseHeaders: { "content-type": context.contentType },
            context: evaluatorContext,
          });
      assert(result.pass, `${context.caseId} exact request assertion failed ${context.requestLabel}: ${assertion.operator} ${assertion.path || ""} (${result.reason})`);
      return { operator: assertion.operator, path: assertion.path || null, valueDigest: stableDigest(result.actual) };
    }
    const operator = String(assertion.operator || "");
    const values = assertionValues(context.body, assertion.path, context.contentType, context.status);
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
  markerEvaluationTracker = null,
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
      const fixtureCandidates = [
        bindings.logMarker,
        bindings.fixtureId,
        bindings.eventId,
        bindings.sourceId,
        eventRuntimeContext?.templateValues?.fixtureId,
        eventRuntimeContext?.templateValues?.sourceId,
      ].filter(Boolean).map(String);
      const fixtureBoundOperator = /(?:fixture|selected-event|source-status|event-and-evidence|audit)/.test(operator);
      const markerEvaluationRequired = caseId === "EVT-004" &&
        operator === "contains-fixture-marker" &&
        assertion.target === "marker";
      if (markerEvaluationRequired) {
        markerEvaluationTracker.invocationCount += 1;
      }
      const compositeEvidence = buildEventDomSemanticCompositeEvidence({
        selector,
        observed,
        responseBodies,
        priorResponseByPath: selectEventDomResponseBaselines(target, eventRuntimeContext),
        fixtureCandidates,
        fixtureIdentity: eventRuntimeContext?.domFixtureIdentityByTarget?.[target] || null,
        fixtureRequired: fixtureBoundOperator,
        marker: markerEvaluationRequired ? bindings.logMarker : "",
        markerEvaluation: markerEvaluationRequired
          ? {
              invocationCount: markerEvaluationTracker.invocationCount,
              correlationResponseBound:
                markerEvaluationTracker.correlationResponseBound === true,
              domReadinessConfirmed:
                markerEvaluationTracker.domReadinessConfirmed === true,
              selector,
            }
          : null,
        actualBrowserExecution: true,
      });
      const semanticPass = compositeEvidence.pass;
      const semanticObservation = {
        selector,
        exists: observed.count > 0,
        visible: observed.visibleCount > 0,
        text: observed.text,
        number: Number(observed.text.replace(/[^0-9.-]/g, "")),
        attributes: observed.attributes,
        rootCount: observed.count,
        visibleRootCount: observed.visibleCount,
        descendants: observed.descendants,
        descendantMatches: observed.descendantMatches,
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
                : "structured event DOM semantic evidence failed",
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
      if (!result.pass || !semanticPass) {
        const error = new Error(
          `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target} (${result.reason})`,
        );
        error.eventDomSemanticEvidence = structuredClone(compositeEvidence);
        throw error;
      }
      return {
        operator,
        target,
        responseValueDigest: sha256Digest(result.actual),
        compositeEvidence,
      };
    }
    let pass = false;
    if (operator === "number-equals-response") {
      pass = responseValues.some(value => Number(observed.text.replace(/[^0-9.-]/g, "")) === Number(value));
    } else if (operator === "text-includes") {
      pass = observed.text.includes(target);
    } else if (operator === "contains-descendant") {
      const match = (observed.descendantMatches || [])
        .find(candidate => candidate.selector === target);
      pass = observed.count === 1 && observed.visibleCount === 1 &&
        match?.ownerNodeCount === 1 && match?.count === 1 &&
        match?.visibleCount === 1;
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

export function buildEventDomSemanticCompositeEvidence({
  selector,
  observed,
  responseBodies = [],
  priorResponseByPath = {},
  fixtureCandidates = [],
  fixtureIdentity = null,
  fixtureRequired = false,
  marker = "",
  markerEvaluation = null,
  markerEvaluator = buildEventMarkerFlowEvidence,
  actualBrowserExecution = false,
}) {
  const text = String(observed?.text || "");
  const attributes = Array.isArray(observed?.attributes) ? observed.attributes : [];
  const values = Array.isArray(observed?.values) ? observed.values : [];
  const nodeCount = Number(observed?.count || 0);
  const visibleCount = Number(observed?.visibleCount || 0);
  const descendantCount = Number(observed?.descendantCount || 0);
  const textPresent = text.trim().length > 0;
  const structurePresent = descendantCount > 0 || attributes.length > 0;
  const observationPass = nodeCount > 0 && visibleCount > 0 &&
    (textPresent || structurePresent);
  const observationPresent = {
    pass: observationPass,
    reasonCode: observationPass ? "PASS" : "DOM_OBSERVATION_MISSING",
    selectorDigest: sha256Digest(String(selector || "")),
    exists: nodeCount > 0,
    visible: visibleCount > 0,
    nodeCount,
    visibleCount,
    textPresent,
    textDigest: sha256Digest(text),
    structurePresent,
    descendantCount,
    attributeNodeCount: attributes.length,
    valueCount: values.length,
  };

  const paths = Object.entries(priorResponseByPath).map(([path, baseline]) => {
    const rowLocal = isEventRowLocalResponseBaseline(baseline);
    const candidates = rowLocal
      ? responseBodies
        .flatMap(body => eventRowLocalResponseProjections(body, baseline))
      : responseBodies
        .map(body => eventExactValuesAtPath(body, path))
        .filter(pathValues => pathValues.length > 0)
        .map(pathValues => pathValues.length === 1 ? pathValues[0] : pathValues);
    const expected = rowLocal ? baseline.expectedProjection : baseline;
    const matched = rowLocal
      ? candidates.length === 1 && stableEqual(candidates[0], expected)
      : candidates.length === 0 || candidates.some(actual => stableEqual(actual, expected));
    const mismatchProjectionPaths = rowLocal && candidates.length > 0 && !matched
      ? baseline.projectionPaths.filter(projectionPath =>
        candidates.every(candidate =>
          !stableEqual(candidate?.[projectionPath], expected?.[projectionPath])))
      : [];
    const reasonCode = matched
      ? "PASS"
      : (rowLocal && candidates.length === 0
        ? "FIXTURE_SOURCE_ROW_MISSING"
        : (rowLocal && candidates.length > 1
          ? "FIXTURE_SOURCE_ROW_DUPLICATE"
        : (rowLocal
          ? "FIXTURE_ROW_PROJECTION_MISMATCH"
          : "RESPONSE_BASELINE_MISMATCH")));
    return {
      path,
      matched,
      compared: candidates.length > 0,
      reasonCode,
      bindingMode: rowLocal ? "row-local-identity-projection" : "path-value",
      baselineDigest: sha256Digest(baseline),
      projectionDigest: sha256Digest(expected),
      ...(rowLocal ? {
        identityDigest: sha256Digest(baseline.identityValue),
        projectionPathsDigest: sha256Digest(baseline.projectionPaths),
        mismatchProjectionPaths,
      } : {}),
      candidateCount: candidates.length,
      candidateDigest: sha256Digest(candidates),
      candidateDigests: candidates.map(candidate => sha256Digest(candidate)),
    };
  });
  const mismatchPaths = paths.filter(item => !item.matched).map(item => item.path);
  const responseBaselineMatched = {
    pass: mismatchPaths.length === 0,
    pathCount: paths.length,
    comparedPathCount: paths.filter(item => item.compared).length,
    candidateCount: paths.reduce((count, item) => count + item.candidateCount, 0),
    mismatchPaths,
    reasonCodes: [...new Set(paths.filter(item => !item.matched).map(item => item.reasonCode))],
    paths,
  };

  const normalizedFixtureCandidates = fixtureCandidates.filter(Boolean).map(String);
  const nodeTexts = Array.isArray(observed?.nodeTexts) && observed.nodeTexts.length > 0
    ? observed.nodeTexts.map(String)
    : [text];
  const serializedObservation = `${text} ${JSON.stringify(attributes)} ${JSON.stringify(values)}`;
  const exactFixtureIdentity = validEventDomFixtureIdentity(fixtureIdentity)
    ? fixtureIdentity
    : null;
  const rowLocalBaselines = Object.values(priorResponseByPath)
    .filter(isEventRowLocalResponseBaseline);
  const apiFixtureIdentityMatched = exactFixtureIdentity
    ? rowLocalBaselines.length === 1 &&
      String(rowLocalBaselines[0].identityValue) === String(exactFixtureIdentity.sourceId) &&
      stableEqual(rowLocalBaselines[0].expectedProjection, {
        status: exactFixtureIdentity.status,
        reason: exactFixtureIdentity.reason,
      })
    : true;
  const expectedNodeTokens = exactFixtureIdentity
    ? exactFixtureIdentity.expectedNodeTokens.map(String)
    : normalizedFixtureCandidates;
  const matchedFixtureCandidates = normalizedFixtureCandidates
    .filter(value => serializedObservation.includes(value));
  const rendererIdentity = exactFixtureIdentity
    ? eventDomRendererIdentityProjection(exactFixtureIdentity)
    : null;
  const nodeIdentityMatches = rendererIdentity
    ? nodeTexts.map(nodeText => eventDomNodeIdentityMatch(nodeText, rendererIdentity))
    : [];
  const matchedNodeTexts = rendererIdentity
    ? nodeTexts.filter((_nodeText, index) => nodeIdentityMatches[index]?.pass)
    : [];
  const fieldMatches = rendererIdentity
    ? Object.fromEntries(["sourceId", "status", "reason"].map(field => {
      const matchingNodeCount = nodeIdentityMatches.filter(item => item.fields[field]).length;
      return [field, {
        pass: matchingNodeCount > 0,
        matchingNodeCount,
        candidateDigest: rendererIdentity.fieldDigests[field],
      }];
    }))
    : {};
  const fixtureEvaluated = !fixtureRequired || observationPass;
  const fixturePass = !fixtureRequired || !fixtureEvaluated || (exactFixtureIdentity
    ? apiFixtureIdentityMatched && matchedNodeTexts.length === 1
    : matchedFixtureCandidates.length > 0);
  const fixtureReasonCode = fixturePass
    ? "PASS"
    : (!exactFixtureIdentity
      ? (expectedNodeTokens.length === 0
        ? "FIXTURE_BINDING_MISSING"
        : "DOM_FIXTURE_IDENTITY_NOT_OBSERVED")
      : (!apiFixtureIdentityMatched
        ? "API_DOM_FIXTURE_IDENTITY_MISMATCH"
        : (expectedNodeTokens.length === 0
          ? "FIXTURE_BINDING_MISSING"
          : (matchedNodeTexts.length > 1
            ? "DOM_FIXTURE_IDENTITY_DUPLICATE"
            : (!fieldMatches.sourceId?.pass
              ? "DOM_FIXTURE_SOURCE_ID_NOT_OBSERVED"
              : (!fieldMatches.status?.pass
                ? "DOM_FIXTURE_STATUS_NOT_OBSERVED"
                : (!fieldMatches.reason?.pass
                  ? "DOM_FIXTURE_REASON_NOT_OBSERVED"
                  : "DOM_FIXTURE_IDENTITY_DISTRIBUTED")))))));
  const fixtureObserved = {
    pass: fixturePass,
    reasonCode: fixtureReasonCode,
    failureCode: fixtureReasonCode,
    required: Boolean(fixtureRequired),
    evaluated: fixtureEvaluated,
    bindingMode: exactFixtureIdentity
      ? "api-row-to-single-dom-node"
      : "generic-fixture-candidate",
    apiFixtureIdentityMatched,
    domCandidateCount: nodeTexts.length,
    candidateCount: expectedNodeTokens.length,
    matchedCandidateCount: exactFixtureIdentity
      ? (matchedNodeTexts.length === 1 ? expectedNodeTokens.length : 0)
      : matchedFixtureCandidates.length,
    matchedNodeCount: matchedNodeTexts.length,
    candidateDigest: sha256Digest(expectedNodeTokens),
    matchedCandidateDigest: sha256Digest(
      exactFixtureIdentity
        ? (matchedNodeTexts.length === 1 ? expectedNodeTokens : [])
        : matchedFixtureCandidates,
    ),
    candidateDigests: expectedNodeTokens.map(value => sha256Digest(value)),
    matchedCandidateDigests: (exactFixtureIdentity
      ? (matchedNodeTexts.length === 1 ? expectedNodeTokens : [])
      : matchedFixtureCandidates).map(value => sha256Digest(value)),
    nodeDigests: nodeTexts.map(value => sha256Digest(value)),
    matchedNodeDigests: matchedNodeTexts.map(value => sha256Digest(value)),
    fieldMatches,
    identityDigest: exactFixtureIdentity
      ? sha256Digest({
        sourceId: exactFixtureIdentity.sourceId,
        status: exactFixtureIdentity.status,
        reason: exactFixtureIdentity.reason,
      })
      : sha256Digest(normalizedFixtureCandidates),
    expectedNodeTokensDigest: sha256Digest(expectedNodeTokens),
    observationDigest: sha256Digest(serializedObservation),
  };
  const markerFlow = markerEvaluation
    ? evaluateEventMarkerFlowEvidence({
        marker,
        observed,
        responseBodies,
        markerEvaluation,
        markerEvaluator,
      })
    : null;

  const failedChecks = [
    ["observationPresent", observationPresent.pass],
    ["responseBaselineMatched", responseBaselineMatched.pass],
    ["fixtureObserved", fixtureObserved.pass],
    ...(markerFlow ? [["markerFlow", markerFlow.pass]] : []),
  ].filter(([, pass]) => !pass).map(([name]) => name);
  const causeCodes = [
    ...(observationPresent.pass ? [] : [observationPresent.reasonCode]),
    ...responseBaselineMatched.reasonCodes,
    ...(fixtureObserved.pass ? [] : [fixtureObserved.reasonCode]),
    ...(markerFlow?.pass ? [] : [markerFlow?.failureCode].filter(Boolean)),
  ];
  const pass = failedChecks.length === 0;
  const evidence = {
    schema: "media-server.v390-ui-event-dom-semantic-composite-evidence.v1",
    pass,
    actualBrowserExecution: Boolean(actualBrowserExecution),
    error: pass ? null : {
      code: "EVT_DOM_SEMANTIC_COMPOSITE_FAILED",
      causes: failedChecks,
      causeCodes,
    },
    failedChecks,
    causeCodes,
    observationPresent,
    responseBaselineMatched,
    fixtureObserved,
    ...(markerFlow ? { markerFlow } : {}),
  };
  validateEventDomSemanticCompositeEvidence(evidence);
  return evidence;
}

export function buildEventMarkerFlowEvidence({ marker, observed, responseBodies = [] }) {
  const canonicalMarker = String(marker || "").normalize("NFKC").trim();
  const markerDigest = sha256Digest(canonicalMarker);
  const markerMatches = value => {
    const normalized = String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (!canonicalMarker || !normalized) return false;
    const escaped = escapeRegex(canonicalMarker);
    return new RegExp(`(?:^|[\\s([{:<])${escaped}(?=$|[\\s)\\]},.:;>])`, "u").test(normalized);
  };
  const responseLines = responseBodies.flatMap(body =>
    Array.isArray(body?.lines) ? body.lines.map(String) : []);
  const responseMatches = responseLines.filter(markerMatches);
  const timelineNodes = Array.isArray(observed?.semanticNodeTexts)
    ? observed.semanticNodeTexts.map(String)
    : [];
  const timelineMatches = timelineNodes.filter(markerMatches);
  const timelineMatchedIndices = timelineNodes
    .map((value, index) => markerMatches(value) ? index : -1)
    .filter(index => index >= 0);
  const visibleNodes = Array.isArray(observed?.visibleSemanticNodeTexts)
    ? observed.visibleSemanticNodeTexts.map(String)
    : [];
  const visibleMatches = visibleNodes.filter(markerMatches);
  const domMatchedIndices = visibleNodes
    .map((value, index) => markerMatches(value) ? index : -1)
    .filter(index => index >= 0);
  const timelineKinds = Array.isArray(observed?.semanticNodeKinds)
    ? observed.semanticNodeKinds.map(String)
    : [];
  const visibleKinds = Array.isArray(observed?.visibleSemanticNodeKinds)
    ? observed.visibleSemanticNodeKinds.map(String)
    : [];
  const fixtureMarkerMaterialized = {
    pass: canonicalMarker.length > 0,
    markerDigest,
  };
  const responseMarkerObserved = markerEvidenceCounts(responseLines, responseMatches);
  const timelineProjectionObserved = markerEvidenceCounts(timelineNodes, timelineMatches);
  const domMarkerObserved = markerEvidenceCounts(visibleNodes, visibleMatches);
  timelineProjectionObserved.selectedIndices = timelineMatchedIndices;
  timelineProjectionObserved.selectedKind =
    timelineMatchedIndices.length === 1
      ? String(timelineKinds[timelineMatchedIndices[0]] || "")
      : "";
  timelineProjectionObserved.candidateKindCounts =
    countEvidenceKinds(timelineKinds);
  domMarkerObserved.selectedIndices = domMatchedIndices;
  domMarkerObserved.selectedKind =
    domMatchedIndices.length === 1
      ? String(visibleKinds[domMatchedIndices[0]] || "")
      : "";
  domMarkerObserved.candidateKindCounts = countEvidenceKinds(visibleKinds);
  const failed = [
    ["fixture-marker-materialization", fixtureMarkerMaterialized.pass,
      "FIXTURE_MARKER_NOT_MATERIALIZED"],
    ["authoritative-response", responseMarkerObserved.pass,
      responseMarkerObserved.matchedCount > 1 ? "RESPONSE_MARKER_DUPLICATE" : "RESPONSE_MARKER_NOT_OBSERVED"],
    ["timeline-projection", timelineProjectionObserved.pass,
      timelineProjectionObserved.matchedCount > 1 ? "TIMELINE_MARKER_DUPLICATE" : "TIMELINE_MARKER_NOT_PROJECTED"],
    ["dom-render", domMarkerObserved.pass,
      domMarkerObserved.matchedCount > 1 ? "DOM_MARKER_DUPLICATE" : "DOM_MARKER_NOT_OBSERVED"],
  ].find(([, pass]) => !pass);
  return {
    schema: "media-server.v390-ui-event-marker-flow-evidence.v1",
    pass: !failed,
    failurePhase: failed?.[0] || "",
    failureCode: failed?.[2] || "PASS",
    markerDigest,
    fixtureMarkerMaterialized,
    responseMarkerObserved,
    timelineProjectionObserved,
    domMarkerObserved,
  };
}

export function evaluateEventMarkerFlowEvidence({
  marker,
  observed,
  responseBodies = [],
  markerEvaluation = {},
  markerEvaluator = buildEventMarkerFlowEvidence,
}) {
  const lifecycle = {
    evaluatorInvocationCount: Number(markerEvaluation.invocationCount || 0),
    correlationResponseBound:
      markerEvaluation.correlationResponseBound === true,
    domReadinessConfirmed:
      markerEvaluation.domReadinessConfirmed === true,
    selectorDigest: sha256Digest(String(markerEvaluation.selector || "")),
    evaluationOrder: [
      "correlation-response-bound",
      "dashboard-dom-ready",
      "marker-evaluated",
    ],
  };
  if (lifecycle.evaluatorInvocationCount !== 1 ||
      lifecycle.correlationResponseBound !== true ||
      lifecycle.domReadinessConfirmed !== true) {
    return buildMarkerEvaluatorLifecycleFailureEvidence({
      marker,
      invocationCount: lifecycle.evaluatorInvocationCount,
      correlationResponseBound: lifecycle.correlationResponseBound,
      domReadinessConfirmed: lifecycle.domReadinessConfirmed,
      selectorDigest: lifecycle.selectorDigest,
      failureCode: lifecycle.evaluatorInvocationCount !== 1
        ? (lifecycle.evaluatorInvocationCount === 0
            ? "MARKER_EVALUATOR_NOT_INVOKED"
            : "MARKER_EVALUATOR_DUPLICATE_INVOCATION")
        : (lifecycle.correlationResponseBound !== true
            ? "MARKER_CORRELATION_PREREQUISITE_NOT_MET"
            : "MARKER_DOM_NOT_READY"),
    });
  }
  try {
    const evidence = markerEvaluator({ marker, observed, responseBodies });
    return { ...evidence, ...lifecycle };
  } catch {
    return buildMarkerEvaluatorLifecycleFailureEvidence({
      marker,
      invocationCount: lifecycle.evaluatorInvocationCount,
      correlationResponseBound: lifecycle.correlationResponseBound,
      domReadinessConfirmed: lifecycle.domReadinessConfirmed,
      selectorDigest: lifecycle.selectorDigest,
      failureCode: "MARKER_EVALUATOR_EXCEPTION",
    });
  }
}

export function buildMarkerEvaluatorLifecycleFailureEvidence({
  marker = "",
  invocationCount = 0,
  correlationResponseBound = false,
  domReadinessConfirmed = false,
  selectorDigest = sha256Digest(""),
  failureCode = "MARKER_EVALUATOR_NOT_INVOKED",
} = {}) {
  const emptyCounts = markerEvidenceCounts([], []);
  return {
    schema: "media-server.v390-ui-event-marker-flow-evidence.v1",
    pass: false,
    failurePhase: "marker-evaluator",
    failureCode,
    markerDigest: sha256Digest(String(marker || "").normalize("NFKC").trim()),
    fixtureMarkerMaterialized: {
      pass: String(marker || "").normalize("NFKC").trim().length > 0,
      markerDigest: sha256Digest(String(marker || "").normalize("NFKC").trim()),
    },
    responseMarkerObserved: structuredClone(emptyCounts),
    timelineProjectionObserved: structuredClone(emptyCounts),
    domMarkerObserved: structuredClone(emptyCounts),
    evaluatorInvocationCount: Number(invocationCount || 0),
    correlationResponseBound: correlationResponseBound === true,
    domReadinessConfirmed: domReadinessConfirmed === true,
    selectorDigest,
    evaluationOrder: [
      "correlation-response-bound",
      "dashboard-dom-ready",
      "marker-evaluated",
    ],
  };
}

function markerEvidenceCounts(candidates, matched) {
  return {
    pass: matched.length === 1,
    candidateCount: candidates.length,
    matchedCount: matched.length,
    candidateDigest: sha256Digest(candidates),
    matchedDigest: sha256Digest(matched),
  };
}

function countEvidenceKinds(kinds) {
  const counts = {};
  for (const kind of kinds) {
    const normalized = String(kind || "unknown")
      .replace(/[^a-z0-9-]/gi, "")
      .slice(0, 64) || "unknown";
    counts[normalized] = Number(counts[normalized] || 0) + 1;
  }
  return counts;
}

export function selectEventDomResponseBaselines(target, eventRuntimeContext = {}) {
  const baselineByTarget = eventRuntimeContext?.domResponseBaselineByTarget || {};
  const targetEntries = String(target || "").split("|").filter(Boolean)
    .filter(path => Object.prototype.hasOwnProperty.call(baselineByTarget, path))
    .map(path => [path, baselineByTarget[path]]);
  const rowLocalRequired = new Set(eventRuntimeContext?.rowLocalResponseTargets || []);
  if (rowLocalRequired.has(target)) {
    assert(targetEntries.length === 1 &&
      isEventRowLocalResponseBaseline(targetEntries[0][1]),
    `row-local response baseline is missing or invalid for target: ${target}`);
    return Object.fromEntries(targetEntries);
  }
  return targetEntries.length > 0
    ? Object.fromEntries(targetEntries)
    : (eventRuntimeContext?.priorResponseByPath || {});
}

function isEventRowLocalResponseBaseline(value) {
  return value?.schema === "media-server.v390-ui-event-row-local-response-baseline.v1" &&
    typeof value.collectionPath === "string" &&
    Array.isArray(value.identityPaths) &&
    value.identityPaths.length > 0 &&
    value.identityValue !== undefined &&
    Array.isArray(value.projectionPaths) &&
    value.projectionPaths.length > 0 &&
    value.expectedProjection &&
    typeof value.expectedProjection === "object";
}

function eventRowLocalResponseProjections(body, baseline) {
  const rows = eventExactValuesAtPath(body, baseline.collectionPath)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
  const matchingRows = rows.filter(value => baseline.identityPaths.some(identityPath =>
    eventExactValuesAtPath(value, identityPath)
      .some(identity => String(identity) === String(baseline.identityValue))));
  return matchingRows.map(row => Object.fromEntries(baseline.projectionPaths.map(projectionPath => {
    const values = eventExactValuesAtPath(row, projectionPath);
    return [projectionPath, values.length === 1 ? values[0] : values];
  })));
}

function validEventDomFixtureIdentity(value) {
  return value?.schema === "media-server.v390-ui-event-dom-fixture-identity.v1" &&
    typeof value.sourceId === "string" && value.sourceId.length > 0 &&
    typeof value.status === "string" && value.status.length > 0 &&
    typeof value.reason === "string" && value.reason.length > 0 &&
    Array.isArray(value.expectedNodeTokens) &&
    value.expectedNodeTokens.length === 3 &&
    value.expectedNodeTokens.every(token => typeof token === "string" && token.length > 0);
}

const eventDomRendererStatusLabels = {
  live: ["live", "수신", "receiving"],
  connecting: ["connecting", "연결 중"],
  stale: ["stale", "지연"],
  offline: ["offline", "오프라인"],
  unknown: ["unknown", "미확인"],
};

const eventDomRendererReasonLabels = {
  receiving: ["receiving", "수신 중"],
  initializing: ["initializing", "초기 수신 대기"],
  "last-frame-aged": ["last-frame-aged", "프레임 지연"],
  "metadata-aged": ["metadata-aged", "메타데이터 지연"],
  disabled: ["disabled", "비활성"],
  unreachable: ["unreachable", "연결 불가"],
  "no-subscriber": ["no-subscriber", "구독 세션 없음", "no subscriber session"],
  "no-egress-session": ["no-egress-session", "WebRTC 송출 세션 없음", "no WebRTC egress session"],
};

function normalizeEventDomRendererSegment(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[：:.,;!?/|，。；！？]+/gu, " ")
    .replace(/[()[\]{}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function eventDomRendererIdentityProjection(identity) {
  const sourceId = String(identity.sourceId);
  const status = String(identity.status);
  const reason = String(identity.reason);
  const sourceLabels = [`#${sourceId}`];
  const statusLabels = [...new Set([
    status,
    ...(eventDomRendererStatusLabels[status] || []),
  ])];
  const reasonLabels = [...new Set([
    reason,
    ...(eventDomRendererReasonLabels[reason] || []),
  ])];
  const tupleSegments = new Set(sourceLabels.flatMap(sourceLabel =>
    statusLabels.flatMap(statusLabel =>
      reasonLabels.map(reasonLabel =>
        normalizeEventDomRendererSegment(`${sourceLabel} ${statusLabel}: ${reasonLabel}`)))));
  return {
    sourceId,
    sourceLabels: sourceLabels.map(normalizeEventDomRendererSegment),
    statusLabels: statusLabels.map(normalizeEventDomRendererSegment),
    reasonLabels: reasonLabels.map(normalizeEventDomRendererSegment),
    tupleSegments,
    fieldDigests: {
      sourceId: sha256Digest(sourceLabels),
      status: sha256Digest(statusLabels),
      reason: sha256Digest(reasonLabels),
    },
  };
}

function eventDomNodeIdentityMatch(nodeText, projection) {
  const segments = String(nodeText || "")
    .split(/[\n\r·]+/u)
    .map(normalizeEventDomRendererSegment)
    .filter(Boolean);
  const sourcePattern = new RegExp(
    `(?:^|\\s)#\\s*${escapeRegex(projection.sourceId)}(?=$|\\s)`,
    "u",
  );
  const fields = {
    sourceId: segments.some(segment => sourcePattern.test(segment)),
    status: segments.some(segment => projection.statusLabels.some(label =>
      exactNormalizedPhrasePresent(segment, label))),
    reason: segments.some(segment => projection.reasonLabels.some(label =>
      exactNormalizedPhrasePresent(segment, label))),
  };
  return {
    pass: segments.some(segment => [...projection.tupleSegments]
      .some(tuple => exactNormalizedPhrasePresent(segment, tuple))),
    fields,
  };
}

function exactNormalizedPhrasePresent(segment, phrase) {
  const escaped = escapeRegex(phrase);
  return new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "u").test(segment);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validateEventDomSemanticCompositeEvidence(evidence) {
  assert(evidence?.schema === "media-server.v390-ui-event-dom-semantic-composite-evidence.v1",
    "EVT DOM semantic evidence schema mismatch");
  assert(typeof evidence.pass === "boolean" &&
    typeof evidence.actualBrowserExecution === "boolean" &&
    typeof evidence.observationPresent?.pass === "boolean" &&
    typeof evidence.responseBaselineMatched?.pass === "boolean" &&
    Array.isArray(evidence.responseBaselineMatched?.mismatchPaths) &&
    Array.isArray(evidence.responseBaselineMatched?.paths) &&
    typeof evidence.fixtureObserved?.pass === "boolean" &&
    typeof evidence.fixtureObserved?.evaluated === "boolean" &&
    typeof evidence.fixtureObserved?.failureCode === "string" &&
    Number.isInteger(evidence.fixtureObserved?.domCandidateCount) &&
    Number.isInteger(evidence.fixtureObserved?.candidateCount) &&
    Number.isInteger(evidence.fixtureObserved?.matchedCandidateCount) &&
    Number.isInteger(evidence.fixtureObserved?.matchedNodeCount) &&
    Array.isArray(evidence.fixtureObserved?.nodeDigests) &&
    evidence.fixtureObserved.nodeDigests.every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
    Array.isArray(evidence.fixtureObserved?.matchedNodeDigests) &&
    evidence.fixtureObserved.matchedNodeDigests.every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
    (evidence.fixtureObserved?.bindingMode !== "api-row-to-single-dom-node" ||
      ["sourceId", "status", "reason"].every(field =>
        typeof evidence.fixtureObserved?.fieldMatches?.[field]?.pass === "boolean" &&
        Number.isInteger(evidence.fixtureObserved.fieldMatches[field].matchingNodeCount) &&
        /^[0-9a-f]{64}$/.test(evidence.fixtureObserved.fieldMatches[field].candidateDigest || ""))) &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.candidateDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.matchedCandidateDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.identityDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.expectedNodeTokensDigest || ""),
  "EVT DOM semantic evidence required structured fields are missing");
  for (const item of evidence.responseBaselineMatched.paths) {
    assert(typeof item.path === "string" &&
      typeof item.matched === "boolean" &&
      typeof item.compared === "boolean" &&
      typeof item.bindingMode === "string" &&
      Number.isInteger(item.candidateCount) &&
      /^[0-9a-f]{64}$/.test(item.baselineDigest || "") &&
      /^[0-9a-f]{64}$/.test(item.projectionDigest || "") &&
      /^[0-9a-f]{64}$/.test(item.candidateDigest || ""),
    "EVT DOM semantic path evidence required fields are missing");
  }
  if (evidence.markerFlow) {
    const marker = evidence.markerFlow;
    assert(marker.schema === "media-server.v390-ui-event-marker-flow-evidence.v1" &&
      typeof marker.pass === "boolean" &&
      typeof marker.failurePhase === "string" &&
      typeof marker.failureCode === "string" &&
      /^[0-9a-f]{64}$/.test(marker.markerDigest || "") &&
      typeof marker.fixtureMarkerMaterialized?.pass === "boolean" &&
      Number.isInteger(marker.evaluatorInvocationCount) &&
      typeof marker.correlationResponseBound === "boolean" &&
      typeof marker.domReadinessConfirmed === "boolean" &&
      /^[0-9a-f]{64}$/.test(marker.selectorDigest || "") &&
      JSON.stringify(marker.evaluationOrder) === JSON.stringify([
        "correlation-response-bound",
        "dashboard-dom-ready",
        "marker-evaluated",
      ]) &&
      ["responseMarkerObserved", "timelineProjectionObserved", "domMarkerObserved"].every(key =>
        typeof marker[key]?.pass === "boolean" &&
        Number.isInteger(marker[key]?.candidateCount) &&
        Number.isInteger(marker[key]?.matchedCount) &&
        /^[0-9a-f]{64}$/.test(marker[key]?.candidateDigest || "") &&
        /^[0-9a-f]{64}$/.test(marker[key]?.matchedDigest || "")),
    "EVT marker-flow structured evidence is incomplete");
  }
  return evidence;
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

export function responsePseudoFieldValues({ body, contentType, status }, expression) {
  if (expression === "$text" || expression === "$body") {
    return [typeof body === "string" ? body : JSON.stringify(body ?? null)];
  }
  if (expression === "$contentType") return [String(contentType || "")];
  if (expression === "$status") return [Number(status)];
  return [];
}

function eventRuntimeAssertionValues({ body, contentType, status, path }) {
  const pseudo = responsePseudoFieldValues({ body, contentType, status }, path);
  return pseudo.length > 0 ? pseudo : eventExactValuesAtPath(body, path);
}

export function evaluateRuntimeStatusPseudoFieldAssertion(assertion, status, context = {}) {
  const actual = Number(status);
  const expected = assertion.expected !== undefined ? assertion.expected : assertion.value;
  let pass = false;
  if (assertion.operator === "equals") pass = Object.is(actual, Number(expected));
  else if (assertion.operator === "number") pass = Number.isFinite(actual);
  else if (assertion.operator === "number-gte") pass = Number.isFinite(actual) && actual >= Number(expected);
  else if (assertion.operator === "non-empty") pass = Number.isFinite(actual);
  else throw new Error(`${context.caseId} unsupported exact response pseudo-field operator: ${assertion.operator}`);
  return { pass, reason: `$status ${assertion.operator}`, assertion, actual };
}

function assertionValues(body, expression, contentType, status) {
  const pseudo = responsePseudoFieldValues({ body, contentType, status }, expression);
  if (pseudo.length > 0) return pseudo;
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

function sha256Digest(value) {
  const text = typeof value === "string" ? value : stableSerialize(value ?? null);
  return createHash("sha256").update(text).digest("hex");
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
