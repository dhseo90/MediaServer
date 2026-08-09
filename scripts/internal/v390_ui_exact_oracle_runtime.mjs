// 파일 용도: exact runtime oracle catalog를 실제 브라우저 interaction/API/DOM 관찰로 실행한다.

import { createHash } from "node:crypto";
import { basename } from "node:path";

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  assertEventExactRuntimeBindings,
  evaluateResponseDerivedDomFieldProjection,
  evaluateEventExactDomAssertion,
  evaluateEventExactResponseAssertion,
  eventExactSemanticEvidenceKey,
  eventExactValuesAtPath,
  materializeEventExactTemplate,
  responseDerivedDomProjectionContractFor,
  resolveEventExactTemplate,
  validateIncidentMemorySearchResponseProjection,
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

export function matchesDeclaredLiteral(value, literal, semantics = "marker-token") {
  const normalize = input => String(input ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
  const normalizedValue = normalize(value);
  const normalizedLiteral = normalize(literal);
  if (!normalizedValue || !normalizedLiteral) return false;
  const profiles = {
    "marker-token": { before: " ([{:<", after: " )]},.:;>" },
    "whitespace-token": { before: " ", after: " " },
  };
  const profile = profiles[semantics];
  if (!profile) throw new Error(`unsupported declared literal semantics: ${semantics}`);
  let offset = 0;
  while (offset <= normalizedValue.length - normalizedLiteral.length) {
    const index = normalizedValue.indexOf(normalizedLiteral, offset);
    if (index < 0) return false;
    const beforePass = index === 0 || profile.before.includes(normalizedValue[index - 1]);
    const end = index + normalizedLiteral.length;
    const afterPass = end === normalizedValue.length || profile.after.includes(normalizedValue[end]);
    if (beforePass && afterPass) return true;
    offset = index + Math.max(normalizedLiteral.length, 1);
  }
  return false;
}

export function buildDeclaredLiteralMatchEvidence({
  callsite,
  input,
  flags = "none",
  intendedMatchingSemantics,
}) {
  const value = String(input ?? "");
  const metacharacters = ["[", "]", "{", "}", "(", ")", "*", "+", "?", ".", "^", "$", "|", "\\", "/"];
  return {
    schema: "media-server.v390-ui-declared-literal-match-evidence.v1",
    callsite: String(callsite || ""),
    patternSourceDigest: sha256Digest({
      schema: "media-server.v390-ui-declared-literal-matcher.v1",
      normalization: "NFKC+collapse-whitespace+trim",
      profiles: ["marker-token", "whitespace-token"],
      operator: "indexOf+exact-boundary",
    }),
    inputDigest: sha256Digest(value),
    inputLength: value.length,
    regexMetacharacterKinds: metacharacters.filter(character => value.includes(character)),
    flags: String(flags || "none"),
    intendedMatchingSemantics: String(intendedMatchingSemantics || ""),
  };
}

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
    q: encodeURIComponent(bindings.q || bindings.searchQuery || fixtureId),
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
    const declaredVisibleControlValue = await applyDeclaredVisibleControlValue(browser, item, spec);
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
          "start-live-tile",
          "composed-live-start-all-stop",
          "composed-va-overlay-session",
        ]);
        assert(acceptedKinds.has(primaryAction.executedKind),
          `${item.caseId} catalog/native primary action mismatch: ` +
          `${spec.action?.kind || "missing"}/${primaryAction.executedKind || "missing"}`);
      }
    }
    let interaction = primaryAction
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
      : await executeTrustedInteraction(
          browser,
          item,
          spec,
          actionId,
          correlationId,
          runtimeBindings,
        );
    interaction = await completeDeclaredObservationInteraction({
      browser,
      item,
      spec,
      actionId,
      correlationId,
      runtimeBindings,
      interaction,
    });
    if (declaredVisibleControlValue) {
      interaction = { ...interaction, declaredVisibleControlValue };
    }
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
    const eventReviewRenderBinding = item.caseId.startsWith("EVT-")
      ? await materializeEventReviewRenderProjection({
          browser,
          item,
          spec,
          actionId,
          correlationId,
          bindings: {
            ...runtimeBindings,
            ...(eventRuntimeContext?.templateValues || {}),
          },
        })
      : null;
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
        interaction,
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
        latestRequestCorrelationEvidence,
        actionId,
        eventReviewRenderBinding,
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
      ...(eventReviewRenderBinding ? { eventReviewRenderBinding } : {}),
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

export async function applyDeclaredVisibleControlValue(browser, item, spec) {
  const selector = String(spec?.visibleControl?.selector || "");
  if (!Object.hasOwn(spec?.visibleControl || {}, "setValue")) return null;
  const expectedValue = String(spec.visibleControl.setValue ?? "");
  assert(selector, `${item.caseId} declared visible-control value selector is missing`);
  await browser.waitForSelector(selector, { state: "visible" });
  const before = await browser.snapshot(selector);
  assert(before.exists === true && before.visible === true && before.disabled === false,
    `${item.caseId} declared visible-control value owner is not actionable: ${selector}`);
  await browser.select(selector, expectedValue);
  const after = await browser.snapshot(selector);
  const observedValue = String(after?.selectedValues?.[0] ?? after?.value ?? "");
  assert(after.exists === true && after.visible === true && after.disabled === false &&
    observedValue === expectedValue,
  `${item.caseId} declared visible-control value projection mismatch: ${selector}`);
  return {
    selectorDigest: sha256Digest(selector),
    expectedValueDigest: sha256Digest(expectedValue),
    observedValueDigest: sha256Digest(observedValue),
    candidatePolicy: "exact-first-control",
    status: "PASS",
  };
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

async function executeTrustedInteraction(
  browser,
  item,
  spec,
  actionId,
  correlationId,
  runtimeBindings,
) {
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
  const opsTimelinePath = "/ops/api/events/status?limit=5&includeArchives=1";
  const ownsOpsTimelineRender = spec.route === "/ops/dashboard" &&
    spec.requests.some(request =>
      String(request.method || "GET").toUpperCase() === "GET" &&
      resolveRuntimeRequestPath(request.path, runtimeBindings) === opsTimelinePath);
  if (ownsOpsTimelineRender) {
    assert(typeof browser.clickWithRequestOwnership === "function",
      `${item.caseId} request-action ownership adapter is unavailable`);
    const renderActionId = `${String(actionId || `${item.caseId}:runtime`)}:ops-timeline-refresh`;
    const renderCorrelationId = `${String(correlationId || `${item.caseId}:runtime`)}:ops-timeline-refresh`;
    const renderCycleId = `${renderActionId}:cycle-1`;
    const opsTimelineRenderCycle = await browser.clickWithRequestOwnership({
      selector,
      actionId: renderActionId,
      correlationId: renderCorrelationId,
      renderCycleId,
      targetMethod: "GET",
      targetPath: opsTimelinePath,
      renderSelector: "#dashIncidentTimeline",
      expectedRenderPhase: "dom-committed",
      minimumObservationMs: 500,
      quietMs: 200,
    });
    const after = await browser.snapshot(selector);
    return {
      kind: "click",
      selector,
      before,
      after,
      opsTimelineRenderCycle,
    };
  }
  await browser.click(selector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
  const after = await browser.snapshot(selector);
  return { kind: "click", selector, before, after };
}

async function completeDeclaredObservationInteraction({
  browser,
  item,
  spec,
  actionId,
  correlationId,
  runtimeBindings,
  interaction,
}) {
  const selector = refreshControls[spec.route] || "";
  const opsTimelinePath = "/ops/api/events/status?limit=5&includeArchives=1";
  const ownsOpsTimelineRender = spec.route === "/ops/dashboard" &&
    spec.requests.some(request =>
      String(request.method || "GET").toUpperCase() === "GET" &&
      resolveRuntimeRequestPath(request.path, runtimeBindings) === opsTimelinePath);
  let completed = interaction || { kind: "no-primary-interaction" };
  if (ownsOpsTimelineRender && !completed.opsTimelineRenderCycle) {
    assert(selector && typeof browser.clickWithRequestOwnership === "function",
      `${item.caseId} declared Ops timeline render ownership is unavailable`);
    const renderActionId = `${String(actionId || `${item.caseId}:runtime`)}:ops-timeline-refresh`;
    const renderCorrelationId = `${String(correlationId || `${item.caseId}:runtime`)}:ops-timeline-refresh`;
    const renderCycleId = `${renderActionId}:cycle-1`;
    const opsTimelineRenderCycle = await browser.clickWithRequestOwnership({
      selector,
      actionId: renderActionId,
      correlationId: renderCorrelationId,
      renderCycleId,
      targetMethod: "GET",
      targetPath: opsTimelinePath,
      renderSelector: "#dashIncidentTimeline",
      expectedRenderPhase: "dom-committed",
      minimumObservationMs: 500,
      quietMs: 200,
    });
    completed = { ...completed, opsTimelineRenderCycle };
  }
  const boundedRuntimeRepeat = spec.requests.find(request =>
    String(request.method || "GET").toUpperCase() === "GET" &&
    resolveRuntimeRequestPath(request.path, runtimeBindings) === "/ops/api/runtime/status" &&
    Number(request.repeat?.count || 1) > 1);
  if (boundedRuntimeRepeat) {
    assert(selector, `${item.caseId} bounded dashboard observation refresh control is missing`);
    const expectedCount = Number(boundedRuntimeRepeat.repeat.count);
    let observedCount = Number(await browser.evaluate(
      "Array.isArray(dashboardRuntimeTrendSamples) ? dashboardRuntimeTrendSamples.length : -1",
    ));
    assert(observedCount > 0 && observedCount <= expectedCount,
      `${item.caseId} initial dashboard runtime sample count is invalid: ${observedCount}/${expectedCount}`);
    let refreshCount = 0;
    while (observedCount < expectedCount) {
      await browser.click(selector);
      await browser.waitForNetworkQuiet({
        correlationId,
        minimumObservationMs: Number(boundedRuntimeRepeat.repeat.intervalMs || 250),
        quietMs: 150,
      });
      const nextCount = Number(await browser.evaluate(
        "Array.isArray(dashboardRuntimeTrendSamples) ? dashboardRuntimeTrendSamples.length : -1",
      ));
      assert(nextCount === observedCount + 1,
        `${item.caseId} dashboard runtime sample render cycle drift: ${observedCount}/${nextCount}`);
      observedCount = nextCount;
      refreshCount += 1;
    }
    assert(observedCount === expectedCount,
      `${item.caseId} bounded dashboard sample count mismatch: ${observedCount}/${expectedCount}`);
    completed = {
      ...completed,
      boundedDashboardObservations: {
        expectedCount,
        observedCount,
        refreshCount,
      },
    };
  }
  return completed;
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
    if (action.kind === "start-live-tile") {
      await waitForPlayingMedia(browser, item.caseId, target);
    }
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
    await waitForPlayingMedia(browser, item.caseId, target, 2);
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

export async function waitForPlayingMedia(browser, caseId, tileSelector, minimumPlaying = 1) {
  const readiness = await browser.evaluate(mediaReadinessEvaluateExpression(), {
    selector: String(tileSelector || ""),
    minimumPlaying,
  });
  assert(readiness && typeof readiness === "object" &&
    Number.isInteger(readiness.videoCount) && Number.isInteger(readiness.playingCount) &&
    Array.isArray(readiness.readyStates),
  `${caseId} media readiness observation shape is invalid`);
  assert(readiness.playingCount >= minimumPlaying,
    `${caseId} media readiness mismatch: ${JSON.stringify(readiness)}`);
  return readiness;
}

export function mediaReadinessEvaluateExpression() {
  return async ({ selector, minimumPlaying }) => {
    const deadline = Date.now() + 12000;
    let last = { videoCount: 0, playingCount: 0, readyStates: [] };
    while (Date.now() < deadline) {
      const roots = Array.from(document.querySelectorAll(selector));
      const videos = roots.flatMap(root => {
        if (root.matches?.('video')) return [root];
        const owner = root.matches?.('[data-tile]') ? root : root.closest?.('[data-tile]');
        return Array.from((owner || root).querySelectorAll('video'));
      });
      const unique = [...new Set(videos)];
      last = {
        videoCount: unique.length,
        playingCount: unique.filter(video => !video.paused && video.readyState >= 2).length,
        readyStates: unique.map(video => Number(video.readyState || 0)),
      };
      if (last.playingCount >= minimumPlaying) return last;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return last;
  };
}

export function eventReviewRenderProjectionEvaluateExpression() {
  return async ({ fields, expectedFixtureId, ownerKind }) => {
    const controlIds = {
      q: "opsIncidentSearchInput",
      ruleId: "opsIncidentSearchRuleFilter",
      sourceId: "opsIncidentSearchSourceFilter",
      incidentStatus: "opsIncidentSearchStatusFilter",
      startTimeMs: "opsIncidentSearchStartTime",
      endTimeMs: "opsIncidentSearchEndTime",
    };
    const applied = [];
    for (const [name, value] of Object.entries(fields || {})) {
      const node = document.getElementById(controlIds[name]);
      if (!node) throw new Error(`event review render control missing: ${name}`);
      node.value = String(value);
      if (node.value !== String(value)) {
        throw new Error(`event review render control rejected authoritative value: ${name}`);
      }
      applied.push(name);
    }
    if (typeof refreshEvents !== "function") {
      throw new Error("event review render refresh owner missing");
    }
    await refreshEvents();
    const detail = document.querySelector(
      `[data-v320-resolution-detail="${CSS.escape(String(expectedFixtureId || ""))}"]`);
    const candidate = document.querySelector(
      `[data-vlm-summary-candidate-event="${CSS.escape(String(expectedFixtureId || ""))}"]`);
    const memorySelector = `[data-incident-memory-hit="${CSS.escape(
      `event-record:${String(expectedFixtureId || "")}`)}"]`;
    const deadline = Date.now() + 2000;
    let memoryOwners = Array.from(document.querySelectorAll(memorySelector));
    while (ownerKind === "incident-memory" && memoryOwners.length === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
      memoryOwners = Array.from(document.querySelectorAll(memorySelector));
    }
    if (ownerKind === "incident-memory" && memoryOwners.length !== 1) {
      throw new Error(`event review incident memory owner cardinality mismatch: ${memoryOwners.length}`);
    }
    const renderOwner = ownerKind === "candidate"
      ? candidate
      : (ownerKind === "incident-memory" ? memoryOwners[0] : detail);
    return {
      applied: applied.sort(),
      fixtureOwnerCount: Number(Boolean(renderOwner)),
      renderBound: ownerKind === "incident-memory"
        ? Boolean(renderOwner?.closest("#opsIncidentSearchRows"))
        : (renderOwner?.closest("#opsV320ResolutionDetail")
          ?.getAttribute("data-v390-event-review-render-request") === "bound" || Boolean(candidate)),
    };
  };
}

export function buildEventReviewRenderRequestBindingEvidence({
  entries = [],
  caseId = "",
  actionId = "",
  correlationId = "",
  fields = {},
  observation = null,
  ownerKind = "",
} = {}) {
  const values = Array.isArray(entries) ? entries : [];
  const exactQuery = entry => {
    try {
      const parsed = new URL(String(entry?.url || ""), "http://runtime.invalid");
      return parsed.pathname === "/ops/api/events/reviews" &&
        Object.entries(fields).every(([name, expected]) => {
          const actual = parsed.searchParams.getAll(name);
          return actual.length === 1 && actual[0] === String(expected);
        });
    } catch {
      return false;
    }
  };
  const owned = entry => entry?.requestKind === "application-fetch" &&
    entry?.sameOrigin === true && String(entry?.method || "").toUpperCase() === "GET" &&
    exactQuery(entry) && String(entry?.correlationId || "") === correlationId;
  const requests = values.filter(entry => entry?.phase === "request-start" && owned(entry));
  const responses = values.filter(entry => entry?.phase === "response" && owned(entry));
  const request = requests.length === 1 ? requests[0] : null;
  const boundResponses = request ? responses.filter(response =>
    response?.responseRequestObjectObserved === true &&
    response?.requestIdentitySource === "playwright-response-request" &&
    response?.requestId === request.requestId &&
    response?.caseRequestIdentity === request.caseRequestIdentity &&
    response?.caseRequestSequence === request.caseRequestSequence &&
    String(response?.url || "") === String(request.url || "")) : [];
  const identityPass = Boolean(request &&
    request.caseRequestIdentity === `${caseId}:request-${request.caseRequestSequence}` &&
    Number.isInteger(request.caseRequestSequence) && request.caseRequestSequence > 0 &&
    boundResponses.length === 1);
  const renderPass = observation?.renderBound === true &&
    observation?.fixtureOwnerCount === 1;
  const pass = Boolean(caseId && actionId && correlationId) &&
    requests.length === 1 && responses.length === 1 && identityPass && renderPass;
  return {
    schema: "media-server.v390-ui-event-review-render-binding.v1",
    pass,
    failureCode: pass
      ? "PASS"
      : (requests.length === 0
        ? "PRODUCT_RENDER_REQUEST_MISSING"
        : (requests.length !== 1
          ? "PRODUCT_RENDER_REQUEST_DUPLICATE"
          : (!identityPass
            ? "PRODUCT_RENDER_REQUEST_RESPONSE_IDENTITY_MISMATCH"
            : "PRODUCT_RENDER_OWNER_MISMATCH"))),
    ownerKind: String(ownerKind || ""),
    actionIdDigest: sha256Digest(String(actionId || "")),
    correlationDigest: sha256Digest(String(correlationId || "")),
    requestIdentityDigest: request?.caseRequestIdentity
      ? sha256Digest(String(request.caseRequestIdentity)) : sha256Digest(""),
    requestSequence: Number.isInteger(request?.caseRequestSequence)
      ? request.caseRequestSequence : 0,
    requestCandidateCount: requests.length,
    responseCandidateCount: responses.length,
    responseRequestObjectObserved: boundResponses.length === 1,
    filterDigest: sha256Digest(fields),
    fixtureOwnerCount: Number(observation?.fixtureOwnerCount || 0),
  };
}

async function materializeEventReviewRenderProjection({
  browser,
  item,
  spec,
  bindings,
  actionId,
  correlationId,
}) {
  const supported = ["q", "ruleId", "sourceId", "incidentStatus", "startTimeMs", "endTimeMs"];
  const requests = (spec.requests || []).map(request => {
    const path = resolveRuntimeRequestPath(request.path, bindings);
    const url = new URL(path, "http://runtime.invalid");
    const fields = Object.fromEntries(supported
      .map(name => [name, url.searchParams.get(name)])
      .filter(([, value]) => value !== null && String(value).length > 0));
    return { request, path, url, fields };
  }).filter(candidate => candidate.request?.method === "GET" &&
    candidate.url.pathname === "/ops/api/events/reviews" &&
    Object.keys(candidate.fields).length > 0);
  if (requests.length === 0) return null;
  assert(requests.length === 1,
    `${item.caseId} event review render request owner cardinality mismatch: ${requests.length}`);
  const expectedFixtureId = String(bindings.fixtureId || "");
  const ownerKind = (spec.dom || []).some(assertion =>
    String(assertion.selector || "").includes("incident-memory-hit"))
    ? "incident-memory"
    : ((spec.dom || []).some(assertion =>
      String(assertion.selector || "").includes("vlm-summary-candidate"))
      ? "candidate" : "resolution-detail");
  const renderNetworkStart = browser.networkEntries().length;
  const observation = await browser.evaluate(eventReviewRenderProjectionEvaluateExpression(), {
    fields: requests[0].fields,
    expectedFixtureId,
    ownerKind,
  });
  assert(observation?.renderBound === true && observation.fixtureOwnerCount === 1,
    `${item.caseId} event review render owner binding mismatch`);
  assert(JSON.stringify(observation.applied) === JSON.stringify(Object.keys(requests[0].fields).sort()),
    `${item.caseId} event review render fields drift`);
  const evidence = buildEventReviewRenderRequestBindingEvidence({
    entries: browser.networkEntries().slice(renderNetworkStart),
    caseId: item.caseId,
    actionId,
    correlationId,
    fields: requests[0].fields,
    observation,
    ownerKind,
  });
  assert(evidence.pass,
    `${item.caseId} event review product fetch binding mismatch: ${evidence.failureCode}`);
  return evidence;
}

export function correlatedMutationRequestResponseEnvelope({ requestEntry, responseEntry } = {}) {
  assert(requestEntry?.phase === "request-start" && responseEntry?.phase === "response" &&
    typeof requestEntry.requestId === "string" && requestEntry.requestId &&
    requestEntry.requestId === responseEntry.requestId,
  "mutation request/response envelope is not bound to one request identity");
  assert((requestEntry.requestBody === null || requestEntry.requestBody === undefined ||
      typeof requestEntry.requestBody === "object") &&
    responseEntry.safeResponseBody && typeof responseEntry.safeResponseBody === "object",
  "mutation request/response envelope projections are incomplete");
  return Object.freeze({
    requestBody: structuredClone(requestEntry.requestBody ?? null),
    responseBody: structuredClone(responseEntry.safeResponseBody),
    ...structuredClone(responseEntry.safeResponseBody),
  });
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
  interaction = null,
) {
  const method = String(request.method || "GET").toUpperCase();
  const urlPath = resolveRuntimeRequestPath(request.path, bindings, eventRuntimeContext);
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
    const ownedOpsTimeline = interaction?.opsTimelineRenderCycle;
    const useOwnedOpsTimelineResponse = method === "GET" &&
      urlPath === "/ops/api/events/status?limit=5&includeArchives=1" &&
      ownedOpsTimeline?.schema === "media-server.v390-ui-owned-request-render-cycle.v1";
    if (useOwnedOpsTimelineResponse) {
      const diagnosticReadbackActionId = `${actionId}:ops-timeline-authoritative-readback`;
      const diagnosticReadbackCorrelationId =
        `${correlationId}:ops-timeline-authoritative-readback`;
      const diagnosticNetworkStart = browser.networkEntries().length;
      const diagnosticReadback = await browser.request({
        method,
        urlPath,
        actionId: diagnosticReadbackActionId,
        correlationId: diagnosticReadbackCorrelationId,
        ownershipKind: "diagnostic-authoritative-readback",
      });
      const diagnosticReadbackEvidence = assertCorrelatedRuntimeFetch({
        browser,
        item,
        actionId: diagnosticReadbackActionId,
        method,
        urlPath,
        correlationId: diagnosticReadbackCorrelationId,
        networkStart: diagnosticNetworkStart,
        status: diagnosticReadback.status,
        requestResult: diagnosticReadback,
        correlationRouteState: "preserved-explicit-inner",
        correlationRouteActionId: diagnosticReadbackActionId,
      });
      assert(diagnosticReadbackEvidence.pass === true &&
        diagnosticReadbackEvidence.initiatingRequestActionId ===
          diagnosticReadbackActionId &&
        diagnosticReadbackEvidence.responseRequestActionId ===
          diagnosticReadbackActionId,
      `${item.caseId} diagnostic Ops timeline readback identity is incomplete`);
      const ownedEntries = Array.isArray(ownedOpsTimeline.networkEntries)
        ? ownedOpsTimeline.networkEntries
        : [];
      requestCorrelationEvidence = buildRequestCorrelationEvidence({
        entries: ownedEntries,
        actionId: ownedOpsTimeline.actionId,
        expected: {
          caseId: item.caseId,
          method,
          urlPath,
          correlationId: ownedEntries.find(entry =>
            entry.phase === "request-start" &&
            entry.initiatorActionId === ownedOpsTimeline.actionId &&
            entry.renderCycleId === ownedOpsTimeline.renderCycleId &&
            runtimeRequestTarget(entry.url) === runtimeRequestTarget(urlPath))?.correlationId || "",
          correlationRequired: true,
          allowedStatuses,
          requestKind: "application-fetch",
          initiatorActionId: ownedOpsTimeline.actionId,
          renderCycleId: ownedOpsTimeline.renderCycleId,
          correlationRouteState: "injected-outer",
          correlationRouteActionId: ownedOpsTimeline.actionId,
        },
        requestResult: {
          actionId: ownedOpsTimeline.actionId,
          requestAttemptCount: 1,
          requestReissued: false,
        },
        listenerInstalledBeforeRequest: typeof browser.requestListenersInstalled === "function"
          ? browser.requestListenersInstalled() === true
          : browser.runtimeCorrelationOptionalForContract === true,
      });
      assert(requestCorrelationEvidence.pass,
        `${item.caseId} owned Ops timeline response correlation failed: ${requestCorrelationEvidence.failureCode}`);
      assert(ownedOpsTimeline.identityMatched === true &&
        ownedOpsTimeline.responseRequestObjectObserved === true &&
        ownedOpsTimeline.status === 200 &&
        ownedOpsTimeline.safeResponseProjectionSource === "playwright-response-json" &&
        ownedOpsTimeline.safeResponseProjectionKind === "ops-incident-timeline-event-records" &&
        ownedOpsTimeline.safeResponseForbiddenMaterialObserved === false &&
        ownedOpsTimeline.safeResponseBody,
      `${item.caseId} owned Ops timeline response projection is incomplete`);
      status = ownedOpsTimeline.status;
      body = structuredClone(ownedOpsTimeline.safeResponseBody);
      contentType = "application/json";
      source = "case-owned-refresh-render-response";
    } else if (["GET", "HEAD"].includes(method)) {
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
      const requestMatch = [
        ...primaryNetworkEntries,
        ...browser.networkEntries().slice(networkStart),
      ].find(entry => entry.phase === "request-start" && entry.requestId === match.requestId);
      if (endpointOwnedProjectionCases.has(item.caseId)) {
        assert(match.safeResponseProjectionSource === "playwright-response-json" &&
          typeof match.safeResponseProjectionKind === "string" && match.safeResponseProjectionKind,
        `${item.caseId} endpoint response did not pass through the native Playwright response projection`);
      }
      status = match.status;
      body = requestMatch?.requestId && requestMatch.requestId === match.requestId &&
          requestMatch.requestBody && typeof requestMatch.requestBody === "object"
        ? correlatedMutationRequestResponseEnvelope({
            requestEntry: requestMatch,
            responseEntry: match,
          })
        : (match.safeResponseBody ?? null);
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
  const incidentMemorySearchEvidence = (request.assertions || []).some(assertion =>
    assertion.path === "memorySearch.hits[].matchedTerms")
    ? validateIncidentMemorySearchResponseProjection({
        caseId: item.caseId,
        responseJson: body,
        fixtureId: bindings.fixtureId,
        query: decodeURIComponent(String(bindings.q || bindings.searchQuery || bindings.fixtureId || "")),
        sourceId: bindings.incidentMemoryHitSourceId || bindings.sourceId,
      })
    : null;
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
      ...(incidentMemorySearchEvidence ? { incidentMemorySearchEvidence } : {}),
      ...(requestCorrelationEvidence ? { requestCorrelationEvidence } : {}),
    },
    body,
  };
}

async function prepareExactViewportObservation(browser, selector) {
  const prepared = await browser.evaluate(async exactSelector => {
    const nodes = Array.from(document.querySelectorAll(exactSelector));
    const scroller = document.scrollingElement;
    if (nodes.length !== 1 || !scroller) {
      return { pass: false, nodeCount: nodes.length, scrollerPresent: Boolean(scroller) };
    }
    nodes[0].scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { pass: true, nodeCount: 1, scrollerPresent: true };
  }, selector);
  assert(prepared?.pass === true && prepared.nodeCount === 1 && prepared.scrollerPresent === true,
    `exact viewport observation owner is unavailable: ${selector}`);
}

function declaredOwnerValue(owner, ownerPath) {
  return String(ownerPath || "").split(".").filter(Boolean).reduce((value, segment) =>
    value && typeof value === "object" ? value[segment] : undefined, owner);
}

function declaredActionValue(value, transform = "scalar", prefix = "", suffix = "") {
  let projected = value;
  if (transform === "enabled-filter") projected = value === true ? "enabled" : "disabled";
  if (transform === "boolean-string") projected = value === true ? "true" : "false";
  return `${String(prefix || "")}${String(projected ?? "")}${String(suffix || "")}`;
}

export function evaluateEventDomActionReadback(contract = {}, observation = {}) {
  const fail = failureCode => ({
    schema: "media-server.v390-ui-event-dom-action-readback.v1",
    pass: false,
    failureCode,
  });
  if (String(observation.actionKind || "") !== String(contract.actionKind || "") ||
      String(observation.controlSelector || "") !== String(contract.controlSelector || "")) {
    return fail("FILTER_ACTION_MISMATCH");
  }
  if (String(observation.controlValue ?? "") !== String(contract.expectedValue ?? "")) {
    return fail("FILTER_VALUE_MISMATCH");
  }
  const rows = Array.isArray(observation.visibleRows) ? observation.visibleRows : [];
  const expectedCount = Number(contract.expectedVisibleOwnerCount);
  if (rows.length !== expectedCount) {
    return fail(rows.length === 0
      ? "FILTER_RESULT_OWNER_MISSING"
      : "FILTER_RESULT_OWNER_DUPLICATE");
  }
  if (expectedCount === 1 &&
      String(rows[0]?.identity || "") !== String(contract.expectedOwnerIdentity || "")) {
    return fail("FILTER_RESULT_OWNER_MISMATCH");
  }
  if (contract.field && expectedCount === 1) {
    const candidates = rows[0]?.fields?.[contract.field.name] || [];
    if (candidates.length !== 1 || String(candidates[0]) !== String(contract.field.expected)) {
      return fail("FILTER_RESULT_FIELD_MISMATCH");
    }
  }
  return {
    schema: "media-server.v390-ui-event-dom-action-readback.v1",
    pass: true,
    failureCode: "PASS",
  };
}

function declaredBindingOwnerRow({ item, binding, responseBodies, eventRuntimeContext }) {
  const owners = binding.identitySource === "fixture-owner"
    ? (eventRuntimeContext?.fixtureOwners || []).filter(owner =>
        owner?.kind === binding.fixtureOwner?.kind && owner?.role === binding.fixtureOwner?.role)
    : [];
  assert(owners.length === 1,
    `${item.caseId} declared action fixture owner cardinality mismatch: ${owners.length}`);
  const rows = responseBodies
    .flatMap(body => eventExactValuesAtPath(body, binding.collectionPath))
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
  const identityFields = Array.isArray(binding.identityFields) ? binding.identityFields : [];
  const matches = rows.filter(row => {
    if (identityFields.length > 0) {
      return identityFields.every(field => {
        const ownerValue = declaredOwnerValue(owners[0], field.ownerPath);
        const expected = declaredActionValue(ownerValue, "scalar", field.prefix, field.suffix);
        const values = eventExactValuesAtPath(row, field.responsePath);
        return values.length === 1 && String(values[0]) === expected;
      });
    }
    return (binding.identityPaths || []).every(identityPath => {
      const values = eventExactValuesAtPath(row, identityPath);
      return values.length === 1 && String(values[0]) === String(owners[0].identity);
    });
  });
  assert(matches.length === 1,
    `${item.caseId} declared action response row cardinality mismatch: ${matches.length}`);
  return { owner: owners[0], row: matches[0] };
}

async function executeDeclaredDomActions({
  browser,
  item,
  domContract,
  bindings,
  responses,
  responseBodies,
  eventRuntimeContext,
}) {
  const readbacks = {};
  for (const assertion of domContract.assertions || []) {
    const binding = assertion.binding;
    if (!binding?.action) continue;
    const resolvedAssertion = resolveEventDomAssertionForRuntime({
      caseId: item.caseId, assertion, bindings, eventRuntimeContext,
    });
    const selectedBodies = selectEventDomResponseBodies(
      resolvedAssertion, eventRuntimeContext, responses, responseBodies,
    );
    const { owner, row } = declaredBindingOwnerRow({
      item, binding, responseBodies: selectedBodies, eventRuntimeContext,
    });
    const action = binding.action;
    const actionValueRaw = action.ownerValuePath
      ? eventExactValuesAtPath(row, action.ownerValuePath)
      : [];
    if (action.ownerValuePath) {
      assert(actionValueRaw.length === 1,
        `${item.caseId} declared action value cardinality mismatch: ${actionValueRaw.length}`);
    }
    const expectedValue = action.ownerValuePath
      ? declaredActionValue(actionValueRaw[0], action.transform, action.prefix, action.suffix)
      : "";
    const templateValues = {
      ...bindings,
      ...(eventRuntimeContext?.templateValues || {}),
      auditAction: String(owner.auditAction || eventRuntimeContext?.templateValues?.auditAction || ""),
    };
    const controlSelector = materializeEventExactTemplate(action.controlSelector, templateValues, {
      context: "selector",
    });
    const controlCount = Number(await browser.evaluate(
      `document.querySelectorAll(${JSON.stringify(controlSelector)}).length`,
    ));
    assert(controlCount === 1,
      `${item.caseId} declared action control cardinality mismatch: ${controlCount}`);
    if (action.kind === "select") await browser.select(controlSelector, expectedValue);
    else if (action.kind === "fill") await browser.fill(controlSelector, expectedValue);
    else if (action.kind === "click") await browser.click(controlSelector);
    else assert(false, `${item.caseId} unsupported declared DOM action: ${action.kind}`);
    const readback = binding.readback;
    if (!readback) continue;
    const observation = await browser.evaluate(`(() => {
      const visible = node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const control = document.querySelector(${JSON.stringify(controlSelector)});
      const rows = Array.from(document.querySelectorAll(${JSON.stringify(readback.rowSelector)}))
        .filter(visible)
        .map(row => {
          const fields = {};
          for (const field of Array.from(row.querySelectorAll('[data-event-semantic-field]'))) {
            const name = String(field.getAttribute('data-event-semantic-field') || '');
            if (!name) continue;
            if (!fields[name]) fields[name] = [];
            fields[name].push(String(field.getAttribute('data-event-semantic-value') ??
              field.innerText ?? field.textContent ?? '').trim());
          }
          return {
            identity: String(row.getAttribute(${JSON.stringify(readback.identityAttribute)}) || ''),
            fields,
          };
        });
      return {
        actionKind: ${JSON.stringify(action.kind)},
        controlSelector: ${JSON.stringify(controlSelector)},
        controlValue: String(control?.value ?? ''),
        visibleRows: rows,
      };
    })()`);
    const field = readback.field
      ? {
          name: readback.field.name,
          expected: declaredActionValue(
            eventExactValuesAtPath(row, readback.field.ownerValuePath)[0],
            readback.field.transform,
          ),
        }
      : null;
    const contract = {
      actionKind: action.kind,
      controlSelector,
      expectedValue,
      expectedOwnerIdentity: String(owner.identity),
      expectedVisibleOwnerCount: Number(readback.expectedVisibleOwnerCount),
      ...(field ? { field } : {}),
    };
    const evaluation = evaluateEventDomActionReadback(contract, observation);
    assert(evaluation.pass,
      `${item.caseId} declared DOM action readback failed: ${evaluation.failureCode}`);
    readbacks[`${String(assertion.operator || "")}\n${String(resolvedAssertion.target || "")}`] = {
      contract,
      observation,
      evaluation,
    };
  }
  return readbacks;
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
  requestCorrelationEvidence = null,
  requestActionId = "",
  eventReviewRenderBinding = null,
) {
  const projectionSelectors = [...new Set((assertion.assertions || [])
    .map(candidate => responseDerivedDomProjectionContractFor({
      caseId: item.caseId,
      operator: String(candidate.operator || ""),
      target: String(candidate.target || ""),
    })?.selector)
    .filter(Boolean))];
  assert(projectionSelectors.length <= 1,
    `${item.caseId} DOM projection contracts disagree on the owner selector`);
  const projectionContracts = (assertion.assertions || [])
    .map(candidate => responseDerivedDomProjectionContractFor({
      caseId: item.caseId,
      operator: String(candidate.operator || ""),
      target: String(candidate.target || ""),
    }))
    .filter(Boolean);
  const projectionDomFields = projectionContracts[0]?.domFields || {};
  const projectionOwnerIdentities = (assertion.assertions || []).flatMap(candidate => {
    const key = `${String(candidate.operator || "")}\n${String(candidate.target || "")}`;
    const identity = eventRuntimeContext?.domResponseBaselineByAssertionKey?.[key]?.identityValue;
    return identity === undefined ? [] : [String(identity)];
  });
  const uniqueProjectionOwnerIdentities = [...new Set(projectionOwnerIdentities)];
  assert(uniqueProjectionOwnerIdentities.length <= 1,
    `${item.caseId} DOM projection contracts disagree on the fixture owner identity`);
  const selectorBindings = projectionSelectors.length === 1 && uniqueProjectionOwnerIdentities.length === 1
    ? { ...bindings, fixtureId: uniqueProjectionOwnerIdentities[0] }
    : bindings;
  const selector = expand(String(projectionSelectors[0] || assertion.selector || ""), selectorBindings);
  const declaredActionReadbacks = await executeDeclaredDomActions({
    browser,
    item,
    domContract: assertion,
    bindings,
    responses,
    responseBodies,
    eventRuntimeContext,
  });
  if ((assertion.propertyAssertions || []).some(candidate =>
      candidate.name === "boundingRectWithinViewport")) {
    await prepareExactViewportObservation(browser, selector);
  }
  const requiredAttributes = (Array.isArray(assertion.requiredAttributes)
    ? assertion.requiredAttributes
    : Object.entries(assertion.requiredAttributes || {}).map(([name, value]) => ({ name, value, operator: "equals" })))
    .filter(expected => expected?.name && expected.value !== null && expected.value !== undefined)
    .map(expected => ({
      name: String(expected.name),
      operator: String(expected.operator || "equals"),
      value: expand(String(expected.value), bindings),
    }));
  const requiredAttributeNames = [...new Set(requiredAttributes.map(expected => expected.name))];
  const descendantSelectors = [...new Set((assertion.assertions || [])
    .filter(candidate => candidate.operator === "contains-descendant")
    .map(candidate => expand(String(candidate.target || ""), bindings))
    .filter(Boolean))];
  const markerAssertion = item.caseId === "EVT-004" &&
    (assertion.assertions || []).some(candidate =>
      candidate.operator === "contains-fixture-marker" &&
      candidate.target === "marker");
  const expectedMarker = markerAssertion ? String(bindings.logMarker || "") : "";
  const markerLiteralMatchEvidence = markerAssertion
    ? buildDeclaredLiteralMatchEvidence({
        callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
        input: expectedMarker,
        flags: "none",
        intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
      })
    : null;
  if (markerAssertion) {
    await browser.waitForSelector(selector, { state: "visible" });
  }
  const incidentTimelineAssertion = item.caseId === "EVT-023" &&
    selector.includes('#dashIncidentTimeline [data-incident-unit="event-record"]');
  if (incidentTimelineAssertion) {
    await browser.waitForSelector('#dashIncidentTimeline[data-incident-render-phase="dom-committed"]', {
      state: "visible",
    });
  }
  const observed = await browser.evaluate(`(async () => {
    const expectedMarker = ${JSON.stringify(expectedMarker)};
    const matchesDeclaredLiteral = ${matchesDeclaredLiteral.toString()};
    const markerLiteralMatchEvidence = ${JSON.stringify(markerLiteralMatchEvidence)};
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const descendantSelectors = ${JSON.stringify(descendantSelectors)};
    const requiredAttributeNames = ${JSON.stringify(requiredAttributeNames)};
    const projectionDomFields = ${JSON.stringify(projectionDomFields)};
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
    const semanticKey = name => String(name || '').replace(/^data-event-semantic-/, '').replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    return {
      locationPath: String(location.pathname || ''),
      count: nodes.length,
      visibleCount: nodes.filter(node => {
        const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      text: nodes.map(node => String(node.innerText || node.textContent || '')).join(' ').replace(/\\s+/g, ' ').trim().slice(0, 24000),
      nodeTexts: nodes.slice(0, 20).map(node =>
        String(node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 4000)),
      semanticNodes: nodes.slice(0, 20).map((node, index) => {
        const row = node.closest('[data-event-review-row]');
        const semanticOwner = node.closest('[data-event-semantic-event-id]');
        const alertDeliveryOwner = node.closest('[data-alert-delivery-id]');
        const resolutionOwner = node.closest('[data-v320-resolution-detail]');
        const incidentMemoryOwner = node.closest('[data-incident-memory-hit]');
        const fieldEntries = Array.from(node.querySelectorAll('[data-event-semantic-field]')).map(field => ({
          name: String(field.getAttribute('data-event-semantic-field') || ''),
          text: String(field.getAttribute('data-event-semantic-value') ??
            field.innerText ?? field.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 4000),
        }));
        const declaredFieldEntries = Object.entries(projectionDomFields).flatMap(([name, descriptor]) => {
          const selected = Array.from(node.querySelectorAll(String(descriptor?.selector || '')))
            .map(field => String(field.innerText ?? field.textContent ?? '')
              .replace(/\\s+/g, ' ').trim().slice(0, 4000));
          if (descriptor?.mode === 'prefixed-text') {
            const prefix = String(descriptor?.prefix || '');
            const canonicalEmptyValues = Array.isArray(descriptor?.canonicalEmptyValues)
              ? descriptor.canonicalEmptyValues.map(String)
              : [];
            return selected.filter(value => value.startsWith(prefix))
              .map(value => value.slice(prefix.length))
              .filter(value => !canonicalEmptyValues.includes(value))
              .map(text => ({ name, text }));
          }
          if (descriptor?.mode === 'single-text') {
            return selected.slice(0, 1).filter(Boolean).map(text => ({ name, text }));
          }
          if (descriptor?.mode === 'delimiter-text') {
            const delimiter = String(descriptor?.delimiter || '');
            return selected.flatMap(value => delimiter ? value.split(delimiter) : [value])
              .map(value => value.trim()).filter(Boolean).map(text => ({ name, text }));
          }
          if (descriptor?.mode === 'control-value') {
            return Array.from(node.querySelectorAll(String(descriptor?.selector || '')))
              .map(field => field instanceof HTMLInputElement && field.type === 'checkbox'
                ? String(field.checked)
                : String(field.value ?? ''))
              .map(text => ({ name, text }));
          }
          return [];
        });
        fieldEntries.push(...declaredFieldEntries);
        const fieldNames = [...new Set(fieldEntries.map(field => field.name).filter(Boolean))];
        return {
          index,
          eventId: String(row?.getAttribute('data-event-id') ||
            semanticOwner?.getAttribute('data-event-semantic-event-id') ||
            alertDeliveryOwner?.getAttribute('data-alert-delivery-id') ||
            resolutionOwner?.getAttribute('data-v320-resolution-detail') ||
            incidentMemoryOwner?.getAttribute('data-incident-memory-hit') || ''),
          attributes: Object.fromEntries(Array.from(node.attributes || [])
            .filter(attribute => attribute.name.startsWith('data-event-semantic-'))
            .map(attribute => [semanticKey(attribute.name), String(attribute.value || '')])),
          fields: Object.fromEntries(fieldNames.map(name => [
            name,
            fieldEntries.filter(field => field.name === name).map(field => field.text),
          ])),
        };
      }),
      fixtureIdentityNodes: [...new Set(nodes.flatMap(node => [
        ...(node.matches?.('[data-event-semantic-event-id]') ? [node] : []),
        ...Array.from(node.querySelectorAll('[data-event-semantic-event-id]')),
      ]))].slice(0, 20).map(node => ({
        eventId: String(node.getAttribute('data-event-semantic-event-id') || ''),
      })),
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
      requiredAttributeCandidates: nodes.slice(0, 20).map((node, index) => {
        const identityAttributeNames = Array.from(node.getAttributeNames?.() || [])
          .filter(name => /^data-(?:event|incident)-/.test(name));
        const attributeNames = [...new Set([...requiredAttributeNames, ...identityAttributeNames])].sort();
        return {
          index,
          attributeNames,
          attributeValues: Object.fromEntries(attributeNames.map(name => [name, node.getAttribute(name)])),
        };
      }),
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
      auditDetail: (() => {
        const dialog = document.getElementById('opsAuditDetail');
        return {
          count: dialog ? 1 : 0,
          open: Boolean(dialog?.open || dialog?.hasAttribute('open')),
          before: String(document.getElementById('opsAuditDetailBefore')?.textContent || ''),
          after: String(document.getElementById('opsAuditDetailAfter')?.textContent || ''),
        };
      })(),
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
        routeLocalIncidentTimeline: await (async () => {
          const container = document.querySelectorAll('#dashIncidentTimeline');
          const owner = container.length === 1 ? container[0] : null;
          const incidentUnits = Array.from(document.querySelectorAll('#dashIncidentTimeline [data-incident-unit]'));
          const attributeNames = [...new Set(incidentUnits.flatMap(node =>
            Array.from(node.attributes || []).map(attribute => String(attribute.name || ''))))]
            .filter(Boolean)
            .sort();
          const lifecycle = typeof dashboardIncidentTimelineLifecycle !== 'undefined'
            ? dashboardIncidentTimelineLifecycle
            : {};
          const ownedRenderCycle = globalThis.__mediaServerDiagnosticOwnedRenderCycle || {};
          const digestIdentity = async value => {
            const bytes = new TextEncoder().encode(String(value || ''));
            const hash = await crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
          };
          const identityDigests = async values => Promise.all((Array.isArray(values) ? values : [])
            .map(value => String(value || '')).filter(Boolean).map(digestIdentity));
          const markerMatches = value => {
            return matchesDeclaredLiteral(value, expectedMarker, 'marker-token');
          };
          const markerDigests = async values => {
            const matches = (Array.isArray(values) ? values : []).filter(markerMatches);
            return Promise.all(matches.map(() => digestIdentity(expectedMarker)));
          };
          return {
            routePath: String(location.pathname || ''),
            lifecycleObserved: Boolean(owner &&
              owner.hasAttribute('data-incident-render-phase') &&
              typeof dashboardIncidentTimelineLifecycle !== 'undefined'),
            containerCount: container.length,
            incidentUnitNodeCount: incidentUnits.length,
            eventRecordCandidateCount: incidentUnits.filter(node =>
              node.getAttribute('data-incident-unit') === 'event-record').length,
            renderPhase: String(owner?.dataset?.incidentRenderPhase || ''),
            eventRecordInputCount: Number(owner?.dataset?.eventRecordInputCount || 0),
            eventRecordBoundedCount: Number(owner?.dataset?.eventRecordBoundedCount || 0),
            eventRecordDomCount: Number(owner?.dataset?.eventRecordDomCount || 0),
            incidentInputCounts: String(owner?.dataset?.incidentInputCounts || '{}'),
            incidentFilteredCounts: String(owner?.dataset?.incidentFilteredCounts || '{}'),
            incidentBoundedCounts: String(owner?.dataset?.incidentBoundedCounts || '{}'),
            markerProjection: await (async () => {
              const responseCandidates = Array.isArray(lifecycle.responseLogCandidates) ? lifecycle.responseLogCandidates : [];
              const classifiedCandidates = Array.isArray(lifecycle.classifiedLogCandidates) ? lifecycle.classifiedLogCandidates : [];
              const sortedCandidates = Array.isArray(lifecycle.sortedLogCandidates) ? lifecycle.sortedLogCandidates : [];
              const filteredCandidates = Array.isArray(lifecycle.filteredLogCandidates) ? lifecycle.filteredLogCandidates : [];
              const boundedCandidates = Array.isArray(lifecycle.boundedLogCandidates) ? lifecycle.boundedLogCandidates : [];
              const rendererCandidates = Array.isArray(lifecycle.rendererInputLogCandidates) ? lifecycle.rendererInputLogCandidates : [];
              const responseDigests = await markerDigests(responseCandidates);
              const classifiedDigests = await markerDigests(classifiedCandidates);
              const sortedDigests = await markerDigests(sortedCandidates);
              const filteredDigests = await markerDigests(filteredCandidates);
              const boundedDigests = await markerDigests(boundedCandidates);
              const rendererDigests = await markerDigests(rendererCandidates);
              const filterState = typeof dashboardIncidentFilterState === 'function'
                ? dashboardIncidentFilterState()
                : { query: '', source: '' };
              return {
                literalMatchEvidence: markerLiteralMatchEvidence,
                routeOwner: String(location.pathname || ''),
                rendererContainerSelector: '#dashIncidentTimeline',
                response: { inputCount: responseCandidates.length, outputCount: responseCandidates.length, markerDigests: responseDigests },
                classifier: {
                  inputCount: responseCandidates.length,
                  outputCount: classifiedCandidates.length,
                  markerDigests: classifiedDigests,
                  result: 'formal-incident-pattern',
                  reason: 'source-health-cleanup-stale-event-auth-transport-pattern'
                },
                sorted: { inputCount: classifiedCandidates.length, outputCount: sortedCandidates.length, markerDigests: sortedDigests, exclusionReason: sortedCandidates.length < classifiedCandidates.length ? 'source-local-three-bound' : '' },
                filtered: {
                  inputCount: sortedCandidates.length,
                  outputCount: filteredCandidates.length,
                  markerDigests: filteredDigests,
                  sourceDigest: await digestIdentity(filterState.source || ''),
                  queryDigest: await digestIdentity(filterState.query || ''),
                  exclusionReason: filteredCandidates.length < sortedCandidates.length ? 'declared-filter-mismatch' : ''
                },
                bounded: { inputCount: filteredCandidates.length, outputCount: boundedCandidates.length, markerDigests: boundedDigests, exclusionReason: boundedCandidates.length < filteredCandidates.length ? 'global-eight-bound' : '' },
                rendererInput: { inputCount: boundedCandidates.length, outputCount: rendererCandidates.length, markerDigests: rendererDigests, exclusionReason: rendererCandidates.length < boundedCandidates.length ? 'renderer-input-missing' : '' }
              };
            })(),
            responseEventIdentityDigests: await identityDigests(lifecycle.responseEventIdentities),
            renderInputEventIdentityDigests: await identityDigests(lifecycle.renderInputEventIdentities),
            sortedEventIdentityDigests: await identityDigests(lifecycle.sortedEventIdentities),
            boundedEventIdentityDigests: await identityDigests(lifecycle.boundedEventIdentities),
            domEventIdentityDigests: await identityDigests(lifecycle.domEventIdentities),
            ownedRenderCycle: {
              actionId: String(ownedRenderCycle.actionId || ''),
              renderCycleId: String(ownedRenderCycle.renderCycleId || ''),
              startedAtMs: Number(ownedRenderCycle.startedAtMs || 0),
              completedAtMs: Number(ownedRenderCycle.completedAtMs || 0),
              initialPhase: String(ownedRenderCycle.initialPhase || ''),
              finalPhase: String(ownedRenderCycle.finalPhase || ''),
              phaseMutationCount: Number(ownedRenderCycle.phaseMutationCount || 0),
              domMutationCount: Number(ownedRenderCycle.domMutationCount || 0),
              expectedPhaseMatched: ownedRenderCycle.expectedPhaseMatched === true,
            },
            attributeNames,
          };
        })(),
      },
    };
  })()`);
  observed.declaredActionReadbacks = declaredActionReadbacks;
  const requiredText = (assertion.requiredTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const forbiddenText = (assertion.forbiddenTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const forbiddenMaterial = (assertion.forbiddenMaterialTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const zeroCardinalityExpected = assertion.cardinality?.operator === "equals" && Number(assertion.cardinality?.value) === 0;
  const deferMissingSelectorToStructuredEventEvidence = item.caseId.startsWith("EVT-") &&
    Array.isArray(assertion.assertions) && assertion.assertions.length > 0;
  assert(observed.count > 0 || assertion.expectedExists === false || zeroCardinalityExpected ||
    deferMissingSelectorToStructuredEventEvidence,
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
  const propertyEvidence = evaluateDomPropertyAssertions(assertion.propertyAssertions || [], observed, bindings, item.caseId, selector, interaction);
  let semanticEvidence = evaluateDomSemanticAssertions(
    assertion.assertions || [],
    observed,
    responses,
    responseBodies,
    bindings,
    item.caseId,
    selector,
    eventRuntimeContext,
    markerEvaluationTracker,
    browser.networkEntries(),
    interaction,
    requestCorrelationEvidence,
    requestActionId,
    eventReviewRenderBinding,
  );
  const rowLocalComposite = semanticEvidence
    .map(evidence => evidence?.compositeEvidence)
    .find(evidence => evidence?.fixtureObserved?.bindingMode === "api-row-to-single-dom-node") || null;
  const attributeEvidence = buildExactDomAttributeBindingEvidence({
    selector,
    requiredAttributes,
    candidates: observed.requiredAttributeCandidates,
    fallbackAttributes: observed.attributes,
    nodeCount: observed.count,
    selectedIndices: rowLocalComposite?.fixtureObserved?.matchedNodeIndices || null,
  });
  semanticEvidence = semanticEvidence.map(evidence => evidence?.compositeEvidence
    ? {
        ...evidence,
        compositeEvidence: attachExactDomAttributeBindingEvidence(
          evidence.compositeEvidence,
          attributeEvidence,
        ),
      }
    : evidence);
  if (!attributeEvidence.pass) {
    const failedAttribute = attributeEvidence.attributes.find(attribute => !attribute.pass);
    const error = new Error(
      `${item.caseId} exact DOM attribute mismatch ${selector}: ` +
      `${failedAttribute?.name || "selection"}=${failedAttribute?.expectedValue || "exact-node"}`,
    );
    const failedComposite = semanticEvidence
      .map(evidence => evidence?.compositeEvidence)
      .find(Boolean);
    if (failedComposite) error.eventDomSemanticEvidence = structuredClone(failedComposite);
    throw error;
  }
  const attributeOwnerEvidence = await validateRuntimeAttributeOwners(browser, item, assertion, bindings);
  return {
    selector,
    count: observed.count,
    visibleCount: observed.visibleCount,
    textDigest: stableDigest(observed.text),
    responseCount: responses.length,
    propertyEvidence,
    semanticEvidence,
    attributeEvidence,
    attributeOwnerEvidence,
  };
}

export function buildExactDomAttributeBindingEvidence({
  selector,
  requiredAttributes = [],
  candidates = [],
  fallbackAttributes = [],
  nodeCount = 0,
  selectedIndices = null,
}) {
  const normalizedCandidates = Array.isArray(candidates) && candidates.length > 0
    ? candidates.map((candidate, index) => ({
        index: Number.isInteger(candidate?.index) ? candidate.index : index,
        attributeNames: Array.isArray(candidate?.attributeNames)
          ? candidate.attributeNames.map(String)
          : Object.keys(candidate?.attributeValues || {}),
        attributeValues: candidate?.attributeValues && typeof candidate.attributeValues === "object"
          ? candidate.attributeValues
          : {},
      }))
    : (Array.isArray(fallbackAttributes) ? fallbackAttributes : []).map((attributes, index) => ({
        index,
        attributeNames: Object.keys(attributes || {}),
        attributeValues: attributes || {},
      }));
  const exactNodeSelection = Array.isArray(selectedIndices);
  const normalizedSelectedIndices = exactNodeSelection
    ? [...new Set(selectedIndices.filter(Number.isInteger))]
    : normalizedCandidates.map(candidate => candidate.index);
  const selectedCandidates = normalizedCandidates.filter(candidate =>
    normalizedSelectedIndices.includes(candidate.index));
  const selectionPass = !exactNodeSelection ||
    (selectedIndices.length === 1 && normalizedSelectedIndices.length === 1 && selectedCandidates.length === 1);
  const attributes = requiredAttributes.map(expected => {
    const name = String(expected?.name || "");
    const operator = String(expected?.operator || "equals");
    const expectedValue = String(expected?.value ?? "");
    const observations = selectedCandidates.map(candidate => {
      const observedName = candidate.attributeNames.includes(name) ? name : "";
      const observedValue = observedName ? candidate.attributeValues[name] : null;
      return {
        index: candidate.index,
        observedName,
        observedValue: name === "data-incident-unit" && observedValue !== null
          ? String(observedValue)
          : null,
        observedValueDigest: sha256Digest(observedValue),
        pass: observedName === name && compareAttribute(observedValue, operator, expectedValue),
      };
    });
    const pass = selectionPass && (name === "count"
      ? compareNumber(nodeCount, operator, Number(expectedValue))
      : observations.some(observation => observation.pass));
    return {
      name,
      operator,
      expectedValue: name === "data-incident-unit" ? expectedValue : null,
      expectedValueDigest: sha256Digest(expectedValue),
      pass,
      observations,
    };
  });
  const pass = selectionPass && attributes.every(attribute => attribute.pass);
  const failureCode = pass
    ? "PASS"
    : (!selectionPass
      ? "DOM_ATTRIBUTE_NODE_SELECTION_MISMATCH"
      : (attributes.some(attribute => attribute.observations.every(observation => !observation.observedName))
        ? "DOM_ATTRIBUTE_MISSING"
        : "DOM_ATTRIBUTE_EXACT_VALUE_MISMATCH"));
  return {
    schema: "media-server.v390-ui-exact-dom-attribute-binding-evidence.v1",
    pass,
    failurePhase: pass ? "" : "dom-attribute-binding",
    failureCode,
    selectorDigest: sha256Digest(String(selector || "")),
    candidateCount: Number(nodeCount),
    candidateEvidenceCount: normalizedCandidates.length,
    exactNodeSelection,
    selectedIndex: selectionPass && exactNodeSelection ? normalizedSelectedIndices[0] : -1,
    selectedIndices: normalizedSelectedIndices,
    selectedNodeCount: selectedCandidates.length,
    candidateDigest: sha256Digest(normalizedCandidates),
    attributes,
  };
}

function attachExactDomAttributeBindingEvidence(evidence, attributeEvidence) {
  const attached = structuredClone(evidence);
  attached.exactAttributeBinding = structuredClone(attributeEvidence);
  if (!attributeEvidence.pass) {
    attached.pass = false;
    attached.failedChecks = [...new Set([...(attached.failedChecks || []), "exactAttributeBinding"])];
    attached.causeCodes = [...new Set([...(attached.causeCodes || []), attributeEvidence.failureCode])];
    attached.error = {
      code: "EVT_DOM_SEMANTIC_COMPOSITE_FAILED",
      causes: [...attached.failedChecks],
      causeCodes: [...attached.causeCodes],
    };
  }
  validateEventDomSemanticCompositeEvidence(attached);
  return attached;
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
  correlationRouteState = "",
  correlationRouteActionId = "",
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
      correlationRouteState,
      correlationRouteActionId,
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
    `${caseId} exact response path missing in ${requestLabel}: ${token}`);
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

  if (containsUnredactedLiteralAssignment(text, token)) return true;

  return (observed?.formControls || []).some(control => {
    const identity = [control.id, control.name, control.dataTestid, control.ariaLabel]
      .map(value => String(value || "").toLowerCase()).join(" ");
    return identity.includes(token.toLowerCase()) && !isRedactedDomValue(control.value);
  });
}

export function containsForbiddenStructuredDomMaterial(observed, needle) {
  const token = String(needle || "");
  const text = String(observed?.text || "");
  if (containsUnredactedLiteralAssignment(text, token)) return true;

  if (!/(?:credential|password|token|source.?url|raw(?:locator|json|evidence|material)?)/i.test(token)) return false;
  return (observed?.formControls || []).some(control => {
    const identity = [control.id, control.name, control.dataTestid, control.ariaLabel]
      .map(value => String(value || "").toLowerCase()).join(" ");
    return identity.includes(token.toLowerCase()) && !isRedactedDomValue(control.value);
  });
}

function containsUnredactedLiteralAssignment(text, token) {
  const assignment = /(?:^|[\s{[(,;])["']?([^"'\s:=,;)}\]]+)["']?\s*[:=]\s*([^\s,;)}\]]+)/gi;
  const expectedKey = String(token || "").toLowerCase();
  for (const match of String(text || "").matchAll(assignment)) {
    if (String(match[1] || "").toLowerCase() === expectedKey && !isRedactedDomValue(match[2])) return true;
  }
  return false;
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
  if (operator === "boolean-present") {
    return expected === "true" && actual !== undefined && actual !== null;
  }
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

export function buildRequestSemanticAssertionEvidence({
  caseId = "",
  method = "",
  urlPath = "",
  pathTemplate = "",
  assertion = {},
  assertionIndex = 0,
  result = {},
  baselinePresent = false,
  baseline = undefined,
} = {}) {
  const requestMethod = String(method).toUpperCase();
  const requestPathTemplate = String(pathTemplate || urlPath);
  const assertionOperator = String(assertion.operator || "");
  const assertionPath = String(assertion.path || "");
  const actualPresent = result.actual !== undefined;
  const expectedValue = result.expected !== undefined
    ? result.expected
    : (assertion.expected !== undefined ? assertion.expected : assertion.value);
  const expectedPresent = expectedValue !== undefined;
  return Object.freeze({
    schema: "media-server.v390-ui-request-semantic-assertion-evidence.v1",
    pass: result.pass === true,
    caseId: String(caseId),
    requestMethod,
    requestPathDigest: sha256Digest(String(urlPath)),
    requestPathTemplateDigest: sha256Digest(requestPathTemplate),
    assertionIndex: Number(assertionIndex),
    assertionOperator,
    assertionPathDigest: sha256Digest(assertionPath),
    assertionIdentityDigest: sha256Digest({
      requestMethod,
      requestPathTemplate,
      assertionIndex: Number(assertionIndex),
      assertionOperator,
      assertionPath,
    }),
    baselinePresent: baselinePresent === true,
    baselineDigest: sha256Digest({ present: baselinePresent === true, value: baseline }),
    actualPresent,
    actualDigest: sha256Digest({ present: actualPresent, value: result.actual }),
    expectedPresent,
    expectedDigest: sha256Digest({ present: expectedPresent, value: expectedValue }),
    failureCode: result.pass === true
      ? "PASS"
      : (actualPresent
        ? "REQUEST_SEMANTIC_ASSERTION_MISMATCH"
        : "REQUEST_SEMANTIC_ASSERTION_PATH_MISSING"),
  });
}

function throwRequestSemanticAssertionFailure({
  context,
  assertion,
  assertionIndex,
  result,
  baselinePresent = false,
  baseline = undefined,
}) {
  const error = new Error(
    `${context.caseId} exact request assertion failed ${context.requestLabel}: ` +
    `${assertion.operator} ${assertion.path || ""}`,
  );
  error.requestSemanticAssertionEvidence = buildRequestSemanticAssertionEvidence({
    caseId: context.caseId,
    method: context.request.method,
    urlPath: context.urlPath,
    pathTemplate: context.request.pathTemplate || context.request.path,
    assertion,
    assertionIndex,
    result,
    baselinePresent,
    baseline,
  });
  throw error;
}

function evaluateRequestAssertions(assertions, context) {
  return assertions.map((assertion, assertionIndex) => {
    if (context.caseId.startsWith("EVT-")) {
      const runtime = context.eventRuntimeContext || {};
      const requestIdentity = `${String(context.request.method || "GET").toUpperCase()} ${context.urlPath}`;
      const canonicalRequestIdentity =
        `${String(context.request.method || "GET").toUpperCase()} ${String(context.request.pathTemplate || context.request.path || context.urlPath)}`;
      const rowLocalKey = `${canonicalRequestIdentity}\n${String(assertion.operator || "")}\n${String(assertion.path || "")}`;
      const hasDeclarativeBaselines = Array.isArray(runtime.requestRowLocalBaselines);
      const declarativeBaselines = hasDeclarativeBaselines
        ? runtime.requestRowLocalBaselines.filter(candidate =>
          candidate?.requestMethod === String(context.request.method || "GET").toUpperCase() &&
          candidate?.requestPathTemplate === String(context.request.pathTemplate || context.request.path || context.urlPath) &&
          candidate?.assertionOperator === String(assertion.operator || "") &&
          candidate?.assertionPath === String(assertion.path || ""))
        : [];
      assert(declarativeBaselines.length <= 1,
        `${context.caseId} request row-local baseline cardinality mismatch: ${declarativeBaselines.length}`);
      const rowLocalBaseline = hasDeclarativeBaselines
        ? (declarativeBaselines[0] || null)
        : (runtime.requestRowLocalBaselineByAssertionKey?.[rowLocalKey] || null);
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
      let actual = actualValues.length === 1 ? actualValues[0] : actualValues;
      let rowLocalComparisonActual = undefined;
      if (rowLocalBaseline) {
        assert(rowLocalBaseline.schema === "media-server.v390-ui-event-request-row-local-baseline.v1" &&
          rowLocalBaseline.provenance === "response" &&
          Array.isArray(rowLocalBaseline.identityPaths) && rowLocalBaseline.identityPaths.length > 0 &&
          ["all", "any"].includes(rowLocalBaseline.identityPathMode) &&
          rowLocalBaseline.cardinality?.collectionOwner === 1 &&
          rowLocalBaseline.cardinality?.fixtureRow === 1 &&
          rowLocalBaseline.cardinality?.value === 1,
        `${context.caseId} request row-local baseline is invalid`);
        const collectionOwners = eventExactValuesAtPath(
          context.body, rowLocalBaseline.collectionPath);
        assert(collectionOwners.length === rowLocalBaseline.cardinality.collectionOwner &&
          Array.isArray(collectionOwners[0]),
        `${context.caseId} request row-local collection owner cardinality mismatch: ${collectionOwners.length}`);
        const rows = collectionOwners
          .flatMap(value => value)
          .filter(value => value && typeof value === "object" && !Array.isArray(value));
        const matchingRows = rows.filter(row => {
          const matches = rowLocalBaseline.identityPaths.map(identityPath =>
            eventExactValuesAtPath(row, identityPath)
              .some(value => String(value) === String(rowLocalBaseline.identityValue)));
          return rowLocalBaseline.identityPathMode === "any"
            ? matches.some(Boolean)
            : matches.every(Boolean);
        });
        assert(matchingRows.length === rowLocalBaseline.cardinality.fixtureRow,
          `${context.caseId} request row-local fixture cardinality mismatch: ${matchingRows.length}`);
        const projected = eventExactValuesAtPath(
          matchingRows[0],
          rowLocalBaseline.projectionPath,
        );
        assert(projected.length === rowLocalBaseline.cardinality.value,
          `${context.caseId} request row-local projection cardinality mismatch: ${projected.length}`);
        actual = projected[0];
        if (Array.isArray(rowLocalBaseline.comparisonProjectionPaths) &&
            rowLocalBaseline.comparisonProjectionPaths.length > 0) {
          assert(rowLocalBaseline.expectedComparisonProjection &&
            typeof rowLocalBaseline.expectedComparisonProjection === "object" &&
            !Array.isArray(rowLocalBaseline.expectedComparisonProjection),
          `${context.caseId} request row-local comparison baseline is invalid`);
          rowLocalComparisonActual = Object.fromEntries(
            rowLocalBaseline.comparisonProjectionPaths.map(path => {
              const values = eventExactValuesAtPath(matchingRows[0], path);
              assert(values.length === 1,
                `${context.caseId} request row-local comparison projection cardinality mismatch: ${path}/${values.length}`);
              return [path, values[0]];
            }),
          );
        }
      }
      const evidenceKey = eventExactSemanticEvidenceKey({
        scope: "response",
        caseId: context.caseId,
        operator: assertion.operator,
        subject: assertion.path,
      });
      const baselinePresent = rowLocalBaseline
        ? true
        : baselineResponse !== undefined
        ? requestBaselineValues.length > 0 || ["$body", "$text", "$contentType", "$status"].includes(assertion.path)
        : Object.prototype.hasOwnProperty.call(runtime.priorResponseByPath || {}, assertion.path);
      const baseline = rowLocalBaseline
        ? (rowLocalComparisonActual !== undefined
            ? rowLocalBaseline.expectedComparisonProjection
            : rowLocalBaseline.expectedValue)
        : baselineResponse !== undefined
        ? requestBaseline
        : runtime.priorResponseByPath?.[assertion.path];
      const rowLocalComparisonRequired = rowLocalBaseline &&
        (!assertion.operator.startsWith("contains-fixture") ||
          rowLocalComparisonActual !== undefined);
      let semanticPass = !rowLocalComparisonRequired ||
        (baselinePresent && stableEqual(
          rowLocalComparisonActual !== undefined ? rowLocalComparisonActual : actual,
          baseline,
        ));
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
          expectedResponseByPath: rowLocalBaseline &&
            assertion.operator.startsWith("contains-fixture") &&
            rowLocalBaseline.fixtureExpectedValue !== undefined
            ? { [assertion.path]: rowLocalBaseline.fixtureExpectedValue }
            : {},
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
          rowLocalActualByPath: rowLocalBaseline
            ? { [assertion.path]: actual }
            : {},
          sensitiveCanaries: [
            ...(runtime.sensitiveCanaries || []),
            context.bindings.redactionCanary,
            context.bindings.rawCanary,
            context.bindings.credentialCanary,
          ].filter(Boolean),
        };
      let result = assertion.path === "$status"
        ? evaluateRuntimeStatusPseudoFieldAssertion(assertion, context.status, { ...evaluatorContext, caseId: context.caseId })
        : evaluateEventExactResponseAssertion({
            caseId: context.caseId,
            assertion,
            responseJson: typeof context.body === "object" ? context.body : null,
            responseText: typeof context.body === "string" ? context.body : JSON.stringify(context.body ?? null),
            responseHeaders: { "content-type": context.contentType },
            context: evaluatorContext,
          });
      if (rowLocalComparisonRequired && !semanticPass) {
        result = {
          ...result,
          pass: false,
          reason: "fresh fixture-owned row differs from the authoritative row-local baseline",
        };
      }
      if (!result.pass) {
        throwRequestSemanticAssertionFailure({
          context,
          assertion,
          assertionIndex,
          result,
          baselinePresent,
          baseline,
        });
      }
      return { operator: assertion.operator, path: assertion.path || null, valueDigest: stableDigest(result.actual) };
    }
    const operator = String(assertion.operator || "");
    const values = assertionValues(context.body, assertion.path, context.contentType, context.status);
    const serialized = JSON.stringify(values);
    let pass = false;
    const expected = assertion.expected !== undefined ? assertion.expected : assertion.value;
    if (operator === "equals" || operator === "equals-fixture") pass = values.some(value => Object.is(value, expected));
    else if (operator === "exists") pass = values.length > 0 && values.every(value => value !== undefined && value !== null);
    else if (operator === "path-present") pass = values.length > 0 && values.every(value => value !== undefined);
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
    if (!pass) {
      throwRequestSemanticAssertionFailure({
        context,
        assertion,
        assertionIndex,
        result: {
          pass: false,
          actual: values.length === 1 ? values[0] : values,
          expected,
        },
      });
    }
    return { operator, path: assertion.path || null, valueDigest: stableDigest(values) };
  });
}

export function evaluateEventRuntimeRequestAssertions(assertions, context) {
  assert(String(context?.caseId || "").startsWith("EVT-"),
    "event runtime request assertion replay requires an EVT case");
  return evaluateRequestAssertions(assertions, context);
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

function throwDirectEventDomSemanticFailure({
  caseId,
  selector,
  observed,
  operator,
  target,
  actual,
  expected,
}) {
  const comparedActual = stableEqual(actual, expected)
    ? { assertionPass: false, value: actual }
    : actual;
  const comparedExpected = stableEqual(actual, expected)
    ? { assertionPass: true, value: expected }
    : expected;
  const eventDomSemanticEvidence = buildEventDomSemanticCompositeEvidence({
    caseId,
    selector,
    observed,
    responseBodies: [{ directOperatorProjection: comparedActual }],
    priorResponseByPath: { directOperatorProjection: comparedExpected },
    fixtureRequired: false,
    actualBrowserExecution: true,
  });
  const error = new Error(
    `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target}`,
  );
  error.eventDomSemanticEvidence = structuredClone(eventDomSemanticEvidence);
  throw error;
}

export function buildOwnedRefreshStabilityEvidence(cycle = null) {
  const render = cycle?.renderObservation;
  const checks = {
    schema: cycle?.schema === "media-server.v390-ui-owned-request-render-cycle.v1",
    requestCardinality: cycle?.requestCandidateCount === 1,
    responseCardinality: cycle?.responseCandidateCount === 1,
    requestIdentity: /^[a-f0-9]{64}$/.test(String(cycle?.requestIdentityDigest || "")) &&
      Number.isInteger(cycle?.requestSequence) && cycle.requestSequence > 0,
    responseIdentity: cycle?.responseRequestObjectObserved === true && cycle?.identityMatched === true,
    requestResponseOrder: Number(cycle?.requestStartedAtMs || 0) > 0 &&
      Number(cycle?.responseObservedAtMs || 0) >= Number(cycle?.requestStartedAtMs || 0),
    endpoint: cycle?.method === "GET" &&
      cycle?.path === "/ops/api/events/status?limit=5&includeArchives=1" &&
      cycle?.status === 200,
    renderIdentity: typeof cycle?.actionId === "string" && cycle.actionId.length > 0 &&
      typeof cycle?.renderCycleId === "string" && cycle.renderCycleId.length > 0 &&
      render?.actionId === cycle.actionId && render?.renderCycleId === cycle.renderCycleId,
    renderOrder: Number(render?.startedAtMs || 0) > 0 &&
      Number(render?.completedAtMs || 0) >= Number(render?.startedAtMs || 0) &&
      Number(render?.startedAtMs || 0) <= Number(cycle?.requestStartedAtMs || 0) &&
      Number(render?.completedAtMs || 0) >= Number(cycle?.responseObservedAtMs || 0),
    renderState: render?.expectedPhaseMatched === true &&
      render?.finalPhase === "dom-committed" &&
      Number(render?.phaseMutationCount || 0) > 0 &&
      Number(render?.domMutationCount || 0) > 0,
  };
  const failedChecks = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);
  const pass = failedChecks.length === 0;
  return {
    schema: "media-server.v390-ui-owned-refresh-stability-evidence.v1",
    pass,
    failureCode: pass ? "PASS" : "OWNED_REFRESH_STABILITY_MISMATCH",
    failedChecks,
  };
}

export function buildDeclaredEventDomBindingEvidence({
  assertion,
  observed,
  responseBodies,
  eventRuntimeContext,
  bindings,
  interaction,
}) {
  const binding = assertion?.binding;
  if (!binding) return null;
  const mode = String(binding.mode || "");
  const validator = String(binding.validator || "");
  const semanticNodes = Array.isArray(observed?.semanticNodes)
    ? observed.semanticNodes
    : [];
  const evidenceBase = {
    schema: "media-server.v390-ui-declared-dom-binding-evidence.v1",
    mode,
    validatorDigest: sha256Digest(validator),
    assertionDigest: sha256Digest({
      operator: assertion.operator,
      target: assertion.target,
      binding,
    }),
    observedNodeCount: Number(observed?.count || 0),
    semanticNodeCount: semanticNodes.length,
  };
  const finish = ({ pass, failureCode = "PASS", expectedRows = [], fields = [] }) => ({
    ...evidenceBase,
    pass,
    failureCode: pass ? "PASS" : failureCode,
    expectedRowCount: expectedRows.length,
    expectedRowsDigest: sha256Digest(expectedRows),
    fieldEvidence: fields.map(field => ({
      nameDigest: sha256Digest(field.name),
      pass: field.pass === true,
      expectedDigest: sha256Digest(field.expected),
      actualDigest: sha256Digest(field.actual),
      candidateCount: Number(field.candidateCount || 0),
    })),
  });
  if (mode === "direct-dom") {
    const serialized = `${String(observed?.text || "")} ${JSON.stringify(observed?.attributes || [])} ` +
      `${JSON.stringify(observed?.values || [])} ${JSON.stringify(observed?.formControls || [])}`;
    if (validator === "event-row-redaction-boundary") {
      const forbidden = [
        "rawJson", "debugMaterial", "debugCounters", "providerPrompt", "providerResponse",
        "Authorization: Bearer", "passwordHash", "sessionSecret", "tokenHash", "sourceUrl",
      ];
      const matches = forbidden.filter(token => serialized.toLowerCase().includes(token.toLowerCase()));
      return finish({
        pass: Number(observed?.count || 0) === 1 && matches.length === 0,
        failureCode: matches.length ? "DIRECT_DOM_FORBIDDEN_MATERIAL" : "DIRECT_DOM_CARDINALITY_MISMATCH",
        fields: forbidden.map(token => ({
          name: token,
          pass: !matches.includes(token),
          expected: false,
          actual: matches.includes(token),
          candidateCount: matches.includes(token) ? 1 : 0,
        })),
      });
    }
    if (validator === "ops-only-review-card") {
      const contract = observed?.attributes?.[0]?.["data-vlm-review-contract"];
      const pass = observed?.locationPath === "/ops/events" &&
        Number(observed?.count || 0) === 1 && contract === "ops-only-no-client-exposure";
      return finish({ pass, failureCode: "OPS_ONLY_DOM_OWNER_MISMATCH" });
    }
    if (validator === "matching-missing-row-pair") {
      const identities = semanticNodes.map(node => String(node.eventId || ""));
      const states = semanticNodes.map(node => ({
        eventRecordPresent: node.attributes?.eventRecordPresent,
        observationPresent: node.attributes?.observationPresent,
      }));
      const pass = semanticNodes.length === 2 && new Set(identities).size === 2 &&
        states.filter(state => state.eventRecordPresent === "true" &&
          state.observationPresent === "true").length === 1 &&
        states.filter(state => state.eventRecordPresent === "true" &&
          state.observationPresent === "false").length === 1;
      return finish({ pass, failureCode: "MATCHING_MISSING_ROW_PAIR_MISMATCH" });
    }
    if (validator === "manual-rule-draft-only") {
      const attributes = observed?.attributes?.[0] || {};
      const pass = Number(observed?.count || 0) === 1 &&
        attributes["data-incident-rule-suggestion-review"] === "ops-only-draft-route" &&
        semanticNodes[0]?.attributes?.manualDraftRoute === "/ops/rules";
      return finish({ pass, failureCode: "MANUAL_RULE_DRAFT_BOUNDARY_MISMATCH" });
    }
    if (validator === "sensitive-canary-absent") {
      const canaries = [
        ...(eventRuntimeContext?.sensitiveCanaries || []),
        bindings?.redactionCanary,
        bindings?.rawCanary,
        bindings?.credentialCanary,
      ].filter(Boolean).map(String);
      const matches = canaries.filter(canary => serialized.includes(canary));
      return finish({
        pass: canaries.length > 0 && matches.length === 0,
        failureCode: canaries.length === 0
          ? "SENSITIVE_CANARY_BINDING_MISSING"
          : "SENSITIVE_CANARY_OBSERVED",
      });
    }
    if (validator === "owned-refresh-stability") {
      const cycle = interaction?.opsTimelineRenderCycle;
      const stability = buildOwnedRefreshStabilityEvidence(cycle);
      return finish({ pass: stability.pass, failureCode: stability.failureCode });
    }
    if (validator === "exact-visible-descendant-owner") {
      const match = (observed?.descendantMatches || [])
        .find(candidate => candidate.selector === assertion.target);
      const pass = Number(observed?.count || 0) === 1 &&
        Number(observed?.visibleCount || 0) === 1 &&
        Number(match?.ownerNodeCount || 0) === 1 &&
        Number(match?.count || 0) === 1 &&
        Number(match?.visibleCount || 0) === 1;
      return finish({ pass, failureCode: "DESCENDANT_SEMANTIC_OWNER_MISMATCH" });
    }
    if (validator === "filter-action-readback") {
      const assertionKey = `${String(assertion.operator || "")}\n${String(assertion.target || "")}`;
      const readback = observed?.declaredActionReadbacks?.[assertionKey];
      const result = readback?.evaluation || {
        pass: false,
        failureCode: "FILTER_ACTION_READBACK_MISSING",
      };
      return finish({ pass: result.pass === true, failureCode: result.failureCode });
    }
    if (validator === "audit-export-controls") {
      const actualFormats = (observed?.attributes || [])
        .map(attributes => String(attributes?.["data-audit-export"] || ""))
        .filter(Boolean);
      const expectedFormats = Array.isArray(binding.formats) ? binding.formats.map(String) : [];
      const pass = Number(observed?.count || 0) === expectedFormats.length &&
        Number(observed?.visibleCount || 0) === expectedFormats.length &&
        stableEqual([...actualFormats].sort(), [...expectedFormats].sort());
      return finish({ pass, failureCode: "AUDIT_EXPORT_OWNER_MISMATCH" });
    }
    if (validator === "dashboard-health-counts") {
      const runtime = responseBodies.find(body => body?.webrtcHttp && body?.sessionManager) || {};
      const health = responseBodies.find(body => Array.isArray(body?.sourceHealth)) || {};
      const expected = {
        publishSourceCount: String(Array.isArray(runtime?.webrtcHttp?.publishSources)
          ? runtime.webrtcHttp.publishSources.length : 0),
        sourceHealthCount: String(Array.isArray(health?.sourceHealth)
          ? health.sourceHealth.length : 0),
      };
      const actual = {
        publishSourceCount: semanticNodes[0]?.attributes?.publishSourceCount,
        sourceHealthCount: semanticNodes[0]?.attributes?.sourceHealthCount,
      };
      return finish({
        pass: Number(observed?.count || 0) === 1 && stableEqual(actual, expected),
        failureCode: "DASHBOARD_HEALTH_COUNT_MISMATCH",
        fields: Object.keys(expected).map(name => ({
          name,
          pass: actual[name] === expected[name],
          expected: expected[name],
          actual: actual[name],
          candidateCount: actual[name] === undefined ? 0 : 1,
        })),
      });
    }
    return finish({ pass: false, failureCode: "UNSUPPORTED_DIRECT_DOM_BINDING" });
  }
  if (!["row-local-response", "row-set-response"].includes(mode)) {
    return finish({ pass: false, failureCode: "UNSUPPORTED_DOM_BINDING_MODE" });
  }
  const assertionKey = `${String(assertion.operator || "")}\n${String(assertion.target || "")}`;
  const baseline = eventRuntimeContext?.domResponseBaselineByAssertionKey?.[assertionKey];
  if (!baseline) return finish({ pass: false, failureCode: "DECLARED_RESPONSE_BASELINE_MISSING" });
  if (binding.domKind === "audit-detail-modal") {
    const parseAuditJson = value => {
      try { return JSON.parse(String(value || "")); } catch { return { invalidAuditJson: true }; }
    };
    const expected = baseline.expectedProjection || {};
    const actual = {
      before: parseAuditJson(observed?.auditDetail?.before),
      after: parseAuditJson(observed?.auditDetail?.after),
    };
    const pass = Number(observed?.auditDetail?.count || 0) === 1 &&
      observed?.auditDetail?.open === true &&
      stableEqual(actual.before, expected.before) &&
      stableEqual(actual.after, expected.after);
    return finish({
      pass,
      failureCode: "AUDIT_DETAIL_RESPONSE_MISMATCH",
      expectedRows: [{ identityValue: baseline.identityValue, projection: expected }],
      fields: ["before", "after"].map(name => ({
        name,
        pass: stableEqual(actual[name], expected[name]),
        expected: expected[name],
        actual: actual[name],
        candidateCount: actual[name]?.invalidAuditJson === true ? 0 : 1,
      })),
    });
  }
  if (["behavior-only", "event-record-text", "source-health-text"].includes(binding.domKind)) {
    return finish({
      pass: true,
      expectedRows: baseline.expectedRows || [{
        identityValue: baseline.identityValue,
        projection: baseline.expectedProjection,
      }],
    });
  }
  const expectedRows = baseline.schema === "media-server.v390-ui-event-row-set-response-baseline.v1"
    ? baseline.expectedRows
    : [{
        identityValue: baseline.identityValue,
        ...(baseline.identityProjection
          ? { identityProjection: baseline.identityProjection }
          : {}),
        projection: baseline.expectedProjection,
      }];
  const nodeMatchesIdentityProjection = (node, identityProjection) =>
    Object.entries(identityProjection || {}).every(([name, expected]) => {
      const candidates = node.fields?.[name] || [];
      return candidates.length === 1 && String(candidates[0]) === String(expected);
    });
  const ownerScopedNodes = expectedRows.some(row => row.identityProjection)
    ? semanticNodes.filter(node => expectedRows.some(row =>
        String(node.eventId || "") === String(row.identityValue) &&
        nodeMatchesIdentityProjection(node, row.identityProjection)))
    : semanticNodes;
  const fieldEvidence = [];
  let pass = ownerScopedNodes.length === expectedRows.length;
  for (const expectedRow of expectedRows) {
    const nodeCandidates = ownerScopedNodes.filter(node =>
      String(node.eventId || "") === String(expectedRow.identityValue) &&
      (!expectedRow.identityProjection ||
        nodeMatchesIdentityProjection(node, expectedRow.identityProjection)));
    if (nodeCandidates.length !== 1) {
      pass = false;
      fieldEvidence.push({
        name: "eventId",
        pass: false,
        expected: expectedRow.identityValue,
        actual: nodeCandidates.map(node => node.eventId),
        candidateCount: nodeCandidates.length,
      });
      continue;
    }
    const node = nodeCandidates[0];
    for (const field of binding.fields) {
      const rawExpected = expectedRow.projection[field.responsePath];
      let expected = String(rawExpected ?? "");
      if (field.transform === "false-positive-list") {
        expected = `오탐: ${Array.isArray(rawExpected) && rawExpected.length
          ? rawExpected.slice(0, 2).map(String).join(" · ")
          : "오탐 힌트 없음"}`;
      } else if (field.transform === "operator-question-list") {
        expected = `확인: ${Array.isArray(rawExpected) && rawExpected.length
          ? rawExpected.slice(0, 2).map(String).join(" · ")
          : "운영자 질문 없음"}`;
      }
      const candidates = field.source === "identity"
        ? [String(node.eventId || "")]
        : (field.source === "field-text"
          ? (node.fields?.[field.domKey] || [])
          : (Object.prototype.hasOwnProperty.call(node.attributes || {}, field.domKey)
            ? [node.attributes[field.domKey]] : []));
      const fieldPass = candidates.length === 1 && candidates[0] === expected;
      pass = pass && fieldPass;
      fieldEvidence.push({
        name: field.domKey,
        pass: fieldPass,
        expected,
        actual: candidates,
        candidateCount: candidates.length,
      });
    }
  }
  return finish({
    pass,
    failureCode: pass ? "PASS" : "DECLARED_DOM_FIELD_PROJECTION_MISMATCH",
    expectedRows,
    fields: fieldEvidence,
  });
}

function evaluateDomSemanticAssertions(
  assertions,
  observed,
  responses,
  responseBodies,
  bindings,
  caseId,
  selector,
  eventRuntimeContext = null,
  markerEvaluationTracker = null,
  networkEntries = [],
  interaction = null,
  requestCorrelationEvidence = null,
  requestActionId = "",
  eventReviewRenderBinding = null,
) {
  return assertions.map(assertion => {
    const resolvedAssertion = resolveEventDomAssertionForRuntime({
      caseId, assertion, bindings, eventRuntimeContext,
    });
    const operator = String(resolvedAssertion.operator || "");
    const target = String(resolvedAssertion.target || "");
    const assertionResponseBodies = selectEventDomResponseBodies(
      resolvedAssertion,
      eventRuntimeContext,
      responses,
      responseBodies,
    );
    const responseValues = assertionResponseBodies
      .flatMap(body => target.split("|").flatMap(path => resolvePath(body, path)));
    if (operator === "samples-derived-from-responses") {
      const expected = dashboardRuntimeTrendSample(responseBodies);
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const actual = samples.at(-1) || null;
      if (!actual || !equalDashboardRuntimeTrendSample(actual, expected)) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target, actual, expected,
        });
      }
      return { operator, target, responseValueDigest: stableDigest(expected) };
    }
    if (operator === "delta-equals-baseline") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const baseline = bindings.runtimeTrendBaseline;
      const actual = samples[0] || null;
      if (!baseline || !actual ||
          !equalDashboardRuntimeTrendSample(actual, baseline)) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target, actual, expected: baseline,
        });
      }
      return { operator, target, responseValueDigest: stableDigest(baseline) };
    }
    if (operator === "history-bounded") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const valid = samples.length > 0 && samples.length <= 12;
      if (!valid) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target,
          actual: { valid, count: samples.length },
          expected: { valid: true },
        });
      }
      return { operator, target, responseValueDigest: stableDigest(samples.length) };
    }
    if (operator === "sample-count-equals-observations") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const repeated = Array.isArray(eventRuntimeContext?.repeatedRequests)
        ? eventRuntimeContext.repeatedRequests
        : [];
      const expected = repeated.length === 1 &&
        Number.isInteger(repeated[0]?.count) && repeated[0].count > 1
        ? repeated[0].count
        : null;
      if (expected === null || samples.length !== expected) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target,
          actual: samples.length,
          expected,
        });
      }
      return { operator, target, responseValueDigest: stableDigest(samples.length) };
    }
    if (operator === "delta-equals-observations") {
      const samples = Array.isArray(observed.properties?.runtimeTrendSamples)
        ? observed.properties.runtimeTrendSamples
        : [];
      const actual = samples.at(-1) || null;
      const runtime = responseBodies.find(body =>
        body?.sessionManager && typeof body.sessionManager === "object");
      const expected = runtime ? {
        sessions: Number(runtime.sessionManager.activeSessions),
        taps: Number(runtime.sessionManager.activeAnalysisTaps),
      } : null;
      const actualProjection = actual ? {
        sessions: Number(actual.sessions),
        taps: Number(actual.taps),
      } : null;
      if (!actualProjection || !expected ||
          !stableEqual(actualProjection, expected)) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target,
          actual: actualProjection,
          expected,
        });
      }
      return {
        operator,
        target,
        responseValueDigest: sha256Digest({
          sessions: actualProjection.sessions,
          taps: actualProjection.taps,
        }),
      };
    }
    if (operator === "does-not-claim-longrun-pass") {
      const pass = !/(30|120)\s*(분|minute).*pass/i.test(
        String(observed.text || ""));
      if (!pass) {
        throwDirectEventDomSemanticFailure({
          caseId, selector, observed, operator, target,
          actual: false,
          expected: true,
        });
      }
      return { operator, target, responseValueDigest: sha256Digest(observed.text) };
    }
    if (caseId.startsWith("EVT-")) {
      const responseValueMap = {};
      const alternativeValues = [];
      for (const path of target.split("|").filter(Boolean)) {
        const values = assertionResponseBodies.flatMap(body => eventExactValuesAtPath(body, path));
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
      const selectedResponseBaselines = resolvedAssertion.binding?.mode === "direct-dom"
        ? {}
        : selectEventDomResponseBaselines(resolvedAssertion, eventRuntimeContext);
      const responseDerivedDomProjection = buildResponseDerivedEventDomProjectionEvidence({
        caseId,
        assertion: resolvedAssertion,
        observed,
        responseBodies: assertionResponseBodies,
        fixtureCandidates,
        fixtureIdentity: selectedResponseBaselines[target]?.identityValue ||
          Object.values(selectedResponseBaselines)[0]?.identityValue ||
          eventRuntimeContext?.templateValues?.fixtureId || bindings.fixtureId || "",
        selectedResponseBaselines,
      });
      const markerEvaluationRequired = caseId === "EVT-004" &&
        operator === "contains-fixture-marker" &&
        resolvedAssertion.target === "marker";
      if (markerEvaluationRequired) {
        markerEvaluationTracker.invocationCount += 1;
      }
      const compositeEvidence = buildEventDomSemanticCompositeEvidence({
        caseId,
        selector,
        observed,
        responseBodies: assertionResponseBodies,
        priorResponseByPath: responseDerivedDomProjection ? {} : selectedResponseBaselines,
        fixtureCandidates,
        fixtureIdentity: eventRuntimeContext?.domFixtureIdentityByTarget?.[target] || null,
        expectedFixtureIdentity: eventRuntimeContext?.expectedFixtureIdentity || null,
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
        networkEntries,
        requestCorrelationEvidence,
        requestActionId,
        eventReviewRenderBinding,
        declaredDomBinding: buildDeclaredEventDomBindingEvidence({
          assertion: resolvedAssertion,
          observed,
          responseBodies: assertionResponseBodies,
          eventRuntimeContext,
          bindings,
          interaction,
        }),
        responseDerivedDomProjection,
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
  caseId = "",
  selector,
  observed,
  responseBodies = [],
  priorResponseByPath = {},
  fixtureCandidates = [],
  fixtureIdentity = null,
  expectedFixtureIdentity = null,
  fixtureRequired = false,
  marker = "",
  markerEvaluation = null,
  markerEvaluator = buildEventMarkerFlowEvidence,
  networkEntries = [],
  requestCorrelationEvidence = null,
  requestActionId = "",
  eventReviewRenderBinding = null,
  declaredDomBinding = null,
  responseDerivedDomProjection = null,
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
  const routeLocalIncidentTimeline = observed?.properties?.routeLocalIncidentTimeline;
  const routeLocalDomBinding = routeLocalIncidentTimeline &&
      expectedFixtureIdentity?.kind === "event-record" &&
      String(selector || "").includes("#dashIncidentTimeline")
    ? buildRouteLocalIncidentTimelineEvidence(
      caseId,
      routeLocalIncidentTimeline,
      expectedFixtureIdentity,
      networkEntries,
    )
    : null;

  const paths = Object.entries(priorResponseByPath).map(([path, baseline]) => {
    const baselineMissing = baseline?.schema ===
      "media-server.v390-ui-event-response-baseline-missing.v1";
    const requestOwner = isEventRequestOwnerProvenanceBaseline(baseline);
    const rowLocal = isEventRowLocalResponseBaseline(baseline);
    const rowSet = isEventRowSetResponseBaseline(baseline);
    const requestEvaluation = requestOwner
      ? evaluateEventRequestQueryOwner({
          caseId,
          networkEntries,
          baseline,
          requestCorrelationEvidence,
          requestActionId,
        })
      : null;
    const candidates = baselineMissing
      ? []
      : requestOwner
      ? requestEvaluation.candidates
      : rowLocal
      ? responseBodies
        .flatMap(body => eventRowLocalResponseProjections(body, baseline))
      : rowSet
      ? responseBodies
        .flatMap(body => eventRowSetResponseProjections(body, baseline))
      : responseBodies
        .map(body => eventExactValuesAtPath(body, path))
        .filter(pathValues => pathValues.length > 0)
        .map(pathValues => pathValues.length === 1 ? pathValues[0] : pathValues);
    const expected = requestOwner
      ? baseline.expectedQuery
      : rowLocal
      ? baseline.expectedProjection
      : (rowSet ? baseline.expectedRows : baseline);
    const matched = !baselineMissing && (requestOwner
      ? requestEvaluation.pass
      : rowLocal
      ? candidates.length === 1 && stableEqual(candidates[0], expected)
      : rowSet
      ? candidates.length === expected.length && stableEqual(candidates, expected)
      : candidates.length > 0 && candidates.every(actual => stableEqual(actual, expected)));
    const mismatchProjectionPaths = (rowLocal || rowSet) && candidates.length > 0 && !matched
      ? baseline.projectionPaths.filter(projectionPath =>
        rowLocal
          ? candidates.every(candidate =>
            !stableEqual(candidate?.[projectionPath], expected?.[projectionPath]))
          : candidates.some((candidate, index) =>
            !stableEqual(candidate?.projection?.[projectionPath], expected?.[index]?.projection?.[projectionPath])))
      : [];
    const missingRowCode = baseline.identityKind === "event-record"
      ? "FIXTURE_EVENT_ROW_MISSING"
      : "FIXTURE_SOURCE_ROW_MISSING";
    const duplicateRowCode = baseline.identityKind === "event-record"
      ? "FIXTURE_EVENT_ROW_DUPLICATE"
      : "FIXTURE_SOURCE_ROW_DUPLICATE";
    const reasonCode = baselineMissing
      ? "RESPONSE_BASELINE_MISSING"
      : requestOwner
      ? requestEvaluation.reasonCode
      : matched
      ? "PASS"
      : (!rowLocal && candidates.length === 0
        ? "RESPONSE_CANDIDATE_MISSING"
        : ((rowLocal || rowSet) && candidates.length === 0
        ? missingRowCode
        : (rowLocal && candidates.length > (rowSet ? expected.length : 1)
          ? duplicateRowCode
        : ((rowLocal || rowSet)
          ? "FIXTURE_ROW_PROJECTION_MISMATCH"
          : "RESPONSE_BASELINE_MISMATCH"))));
    return {
      path,
      matched,
      compared: candidates.length > 0,
      reasonCode,
      bindingMode: requestOwner
        ? "request-query-exact-identity"
        : rowLocal
        ? "row-local-identity-projection"
        : (rowSet ? "row-set-identity-projection" : "path-value"),
      baselineDigest: sha256Digest(baseline),
      projectionDigest: sha256Digest(expected),
      ...(requestOwner ? {
        fixtureIdentityPathsDigest: sha256Digest(baseline.fixtureIdentityPaths),
        requestIdentityDigest: requestEvaluation.requestIdentityDigest,
        requestSequence: requestEvaluation.requestSequence,
        ownerCandidateCount: requestEvaluation.ownerCandidateCount,
        responseCandidateCount: requestEvaluation.responseCandidateCount,
      } : {}),
      ...(rowLocal || rowSet ? {
        identityDigest: sha256Digest(rowLocal ? baseline.identityValue : baseline.identityValues),
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
  const exactFixtureDescriptor = eventDomFixtureIdentityDescriptor(fixtureIdentity);
  const typedFixtureIdentityInvalid = fixtureIdentity !== null &&
    fixtureIdentity !== undefined && !exactFixtureDescriptor;
  const nodeTexts = Array.isArray(observed?.nodeTexts) && observed.nodeTexts.length > 0
    ? observed.nodeTexts.map(String)
    : [text];
  const serializedObservation = `${text} ${JSON.stringify(attributes)} ${JSON.stringify(values)}`;
  const exactFixtureIdentity = exactFixtureDescriptor
    ? fixtureIdentity
    : null;
  const rowLocalBaselines = Object.values(priorResponseByPath)
    .filter(isEventRowLocalResponseBaseline);
  const apiIdentityCandidates = rowLocalBaselines.map(baseline => String(baseline.identityValue));
  const genericDomIdentityCandidates = Array.isArray(observed?.fixtureIdentityNodes)
    ? observed.fixtureIdentityNodes.map(node => String(node?.eventId || "")).filter(Boolean)
    : [];
  const routeLocalRendererIdentityMatched = Boolean(exactFixtureDescriptor &&
    genericDomIdentityCandidates.length === 0 &&
    routeLocalDomBinding?.pass === true &&
    routeLocalDomBinding.rendererOwner === "renderDashboardIncidentTimeline" &&
    routeLocalDomBinding.stageFixtureMatches?.dom === 1 &&
    routeLocalDomBinding.domEventIdentityDigests?.length ===
      routeLocalDomBinding.domEventRecordCount &&
    routeLocalDomBinding.domEventIdentityDigests?.filter(digest =>
      digest === routeLocalDomBinding.expectedFixtureDigest).length === 1);
  const domIdentityCandidates = routeLocalRendererIdentityMatched
    ? [...genericDomIdentityCandidates, String(exactFixtureDescriptor.identityValue)]
    : genericDomIdentityCandidates;
  const domIdentityMatches = exactFixtureDescriptor
    ? domIdentityCandidates.filter(identity => identity === String(exactFixtureDescriptor.identityValue))
    : [];
  const apiFixtureIdentityMatched = exactFixtureIdentity
    ? rowLocalBaselines.length === 1 &&
      String(rowLocalBaselines[0].identityValue) === String(exactFixtureDescriptor.identityValue) &&
      stableEqual(rowLocalBaselines[0].expectedProjection,
        exactFixtureDescriptor.apiExpectedProjection) &&
      (exactFixtureDescriptor.kind !== "event-record" ||
        domIdentityMatches.length === 1)
    : true;
  const expectedNodeTokens = exactFixtureIdentity
    ? exactFixtureIdentity.expectedNodeTokens.map(String)
    : normalizedFixtureCandidates;
  const matchedFixtureCandidates = normalizedFixtureCandidates
    .filter(value => serializedObservation.includes(value));
  const rendererIdentity = exactFixtureIdentity
    ? eventDomRendererIdentityProjection(exactFixtureIdentity, exactFixtureDescriptor)
    : null;
  const nodeIdentityMatches = rendererIdentity
    ? nodeTexts.map(nodeText => eventDomNodeIdentityMatch(nodeText, rendererIdentity))
    : [];
  const matchedNodeTexts = rendererIdentity
    ? nodeTexts.filter((_nodeText, index) => nodeIdentityMatches[index]?.pass)
    : [];
  const matchedNodeIndices = rendererIdentity
    ? nodeIdentityMatches
      .map((match, index) => match?.pass ? index : -1)
      .filter(index => index >= 0)
    : [];
  const fieldMatches = rendererIdentity
    ? Object.fromEntries(rendererIdentity.fieldNames.map(field => {
      const matchingNodeCount = nodeIdentityMatches.filter(item => item.fields[field]).length;
      return [field, {
        pass: matchingNodeCount > 0,
        matchingNodeCount,
        candidateDigest: rendererIdentity.fieldDigests[field],
      }];
    }))
    : {};
  const fixtureEvaluated = !fixtureRequired || observationPass;
  const fixturePass = !fixtureRequired || !fixtureEvaluated || (!typedFixtureIdentityInvalid &&
    (exactFixtureIdentity
      ? apiFixtureIdentityMatched && matchedNodeTexts.length === 1
      : matchedFixtureCandidates.length > 0));
  const missingFixtureField = rendererIdentity?.fieldNames
    .find(field => !fieldMatches[field]?.pass) || "";
  const fixtureReasonCode = fixturePass
    ? "PASS"
    : (typedFixtureIdentityInvalid
      ? "FIXTURE_IDENTITY_FIELDS_MISSING"
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
            : (missingFixtureField
              ? rendererIdentity.fieldFailureCodes[missingFixtureField]
              : "DOM_FIXTURE_IDENTITY_DISTRIBUTED"))))));
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
    matchedNodeIndices,
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
      ? sha256Digest(exactFixtureDescriptor.identityProjection)
      : sha256Digest(normalizedFixtureCandidates),
    expectedFixtureIdentityDigest: exactFixtureDescriptor
      ? sha256Digest(exactFixtureDescriptor.identityValue)
      : sha256Digest(""),
    apiSelectedOwnerIdentityDigest: apiIdentityCandidates.length === 1
      ? sha256Digest(apiIdentityCandidates[0])
      : sha256Digest(""),
    domOwnerAttributeIdentityDigest: domIdentityMatches.length === 1
      ? sha256Digest(domIdentityMatches[0])
      : sha256Digest(""),
    expectedFixtureIdentitySourceDigest: exactFixtureDescriptor
      ? sha256Digest("fixture-identity-descriptor")
      : sha256Digest(""),
    apiSelectedOwnerIdentitySourceDigest: rowLocalBaselines.length === 1
      ? sha256Digest(`${rowLocalBaselines[0].collectionPath}:${rowLocalBaselines[0].identityPaths.join("|")}`)
      : sha256Digest(""),
    domOwnerAttributeIdentitySourceDigest: sha256Digest(routeLocalRendererIdentityMatched
      ? "routeLocalDomBinding.domEventIdentityDigests"
      : "fixtureIdentityNodes[].eventId"),
    routeLocalRendererIdentityMatched,
    apiIdentityCandidateCount: apiIdentityCandidates.length,
    apiIdentityMatchedCount: exactFixtureDescriptor
      ? apiIdentityCandidates.filter(identity =>
        identity === String(exactFixtureDescriptor.identityValue)).length
      : 0,
    domIdentityCandidateCount: domIdentityCandidates.length,
    domIdentityMatchedCount: domIdentityMatches.length,
    apiProjectionKindDigest: exactFixtureDescriptor
      ? sha256Digest(exactFixtureDescriptor.apiProjectionKind)
      : sha256Digest(""),
    expectedNodeTokensDigest: sha256Digest(expectedNodeTokens),
    observationDigest: sha256Digest(serializedObservation),
  };
  const markerFlow = markerEvaluation
    ? evaluateEventMarkerFlowEvidence({
        caseId,
        marker,
        expectedFixtureIdentity,
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
    ...(declaredDomBinding ? [["declaredDomBinding", declaredDomBinding.pass]] : []),
    ...(responseDerivedDomProjection
      ? [["responseDerivedDomProjection", responseDerivedDomProjection.pass]] : []),
    ...(routeLocalDomBinding ? [["routeLocalDomBinding", routeLocalDomBinding.pass]] : []),
    ...(markerFlow ? [["markerFlow", markerFlow.pass]] : []),
  ].filter(([, pass]) => !pass).map(([name]) => name);
  const causeCodes = [
    ...(observationPresent.pass ? [] : [observationPresent.reasonCode]),
    ...responseBaselineMatched.reasonCodes,
    ...(fixtureObserved.pass ? [] : [fixtureObserved.reasonCode]),
    ...(declaredDomBinding?.pass ? [] : [declaredDomBinding?.failureCode].filter(Boolean)),
    ...(responseDerivedDomProjection?.pass
      ? [] : [responseDerivedDomProjection?.failureCode].filter(Boolean)),
    ...(routeLocalDomBinding?.pass ? [] : [routeLocalDomBinding?.failureCode].filter(Boolean)),
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
    ...(declaredDomBinding ? { declaredDomBinding } : {}),
    ...(responseDerivedDomProjection ? { responseDerivedDomProjection } : {}),
    ...(routeLocalDomBinding ? { routeLocalDomBinding } : {}),
    ...(markerFlow ? { markerFlow } : {}),
  };
  validateEventDomSemanticCompositeEvidence(evidence);
  return evidence;
}

function buildRouteLocalIncidentTimelineEvidence(
  caseId,
  observation,
  expectedFixtureIdentity = null,
  networkEntries = [],
) {
  const routePath = String(observation?.routePath || "");
  const lifecycleObserved = observation?.lifecycleObserved === true;
  const containerCount = Number(observation?.containerCount || 0);
  const incidentUnitNodeCount = Number(observation?.incidentUnitNodeCount || 0);
  const eventRecordCandidateCount = Number(observation?.eventRecordCandidateCount || 0);
  const renderPhase = String(observation?.renderPhase || "");
  const eventRecordInputCount = Number(observation?.eventRecordInputCount || 0);
  const eventRecordBoundedCount = Number(observation?.eventRecordBoundedCount || 0);
  const eventRecordDomCount = Number(observation?.eventRecordDomCount || 0);
  const parseCounts = value => {
    try {
      const parsed = JSON.parse(String(value || "{}"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed)
        .filter(([key, count]) => /^[a-z0-9-]+$/.test(key) && Number.isInteger(Number(count)) && Number(count) >= 0)
        .map(([key, count]) => [key, Number(count)]));
    } catch {
      return {};
    }
  };
  const incidentInputCounts = parseCounts(observation?.incidentInputCounts);
  const incidentBoundedCounts = parseCounts(observation?.incidentBoundedCounts);
  const digestList = value => Array.isArray(value) && value.every(item => /^[0-9a-f]{64}$/.test(String(item || "")))
    ? value.map(String)
    : [];
  const responseEventIdentityDigests = digestList(observation?.responseEventIdentityDigests);
  const renderInputEventIdentityDigests = digestList(observation?.renderInputEventIdentityDigests);
  const sortedEventIdentityDigests = digestList(observation?.sortedEventIdentityDigests);
  const boundedEventIdentityDigests = digestList(observation?.boundedEventIdentityDigests);
  const domEventIdentityDigests = digestList(observation?.domEventIdentityDigests);
  const expectedFixtureDigest = String(expectedFixtureIdentity?.eventIdentityDigest || "");
  const expectedFixtureCaseMatched = expectedFixtureIdentity?.caseId === caseId;
  const expectedFixtureDigestMatched =
    expectedFixtureIdentity?.kind === "event-record" &&
    /^[0-9a-f]{64}$/.test(expectedFixtureDigest) &&
    expectedFixtureDigest === sha256Digest(String(expectedFixtureIdentity?.eventId || ""));
  const observedExpectedDigestPresent = Object.prototype.hasOwnProperty.call(
    observation || {},
    "expectedFixtureDigest",
  );
  const expectedFixtureFailureCode = observedExpectedDigestPresent
    ? "OBSERVED_EXPECTED_FIXTURE_DIGEST_FORBIDDEN"
    : (!expectedFixtureDigest
      ? "EXPECTED_FIXTURE_DIGEST_MISSING"
      : (!expectedFixtureCaseMatched
        ? "EXPECTED_FIXTURE_DIGEST_CASE_MISMATCH"
        : (!expectedFixtureDigestMatched ? "EXPECTED_FIXTURE_DIGEST_MISMATCH" : "PASS")));
  const fixtureMatchCount = values => expectedFixtureDigest
    ? values.filter(value => value === expectedFixtureDigest).length
    : 0;
  const stageFixtureMatches = {
    authoritativeResponse: fixtureMatchCount(responseEventIdentityDigests),
    renderInput: fixtureMatchCount(renderInputEventIdentityDigests),
    sorted: fixtureMatchCount(sortedEventIdentityDigests),
    bounded: fixtureMatchCount(boundedEventIdentityDigests),
    dom: fixtureMatchCount(domEventIdentityDigests),
  };
  const opsResponseBinding = buildOpsIncidentTimelineResponseBinding(
    networkEntries,
    observation?.ownedRenderCycle,
  );
  const attributeNames = Array.isArray(observation?.attributeNames)
    ? [...new Set(observation.attributeNames.map(String).filter(Boolean))].sort()
    : [];
  const ownerMatched = routePath === "/ops/dashboard" && containerCount === 1;
  const lifecycleMatched = lifecycleObserved &&
    expectedFixtureFailureCode === "PASS" &&
    opsResponseBinding.pass &&
    renderPhase === "dom-committed" &&
    renderInputEventIdentityDigests.length <= 4 &&
    responseEventIdentityDigests.length >= renderInputEventIdentityDigests.length &&
    renderInputEventIdentityDigests.length === sortedEventIdentityDigests.length &&
    sortedEventIdentityDigests.length === boundedEventIdentityDigests.length &&
    boundedEventIdentityDigests.length === domEventIdentityDigests.length &&
    domEventIdentityDigests.length === eventRecordCandidateCount &&
    eventRecordInputCount === renderInputEventIdentityDigests.length &&
    eventRecordBoundedCount === boundedEventIdentityDigests.length &&
    eventRecordDomCount === domEventIdentityDigests.length &&
    stableEqual(renderInputEventIdentityDigests, sortedEventIdentityDigests) &&
    stableEqual(sortedEventIdentityDigests, boundedEventIdentityDigests) &&
    stableEqual(boundedEventIdentityDigests, domEventIdentityDigests) &&
    Object.values(stageFixtureMatches).every(count => count === 1);
  const pass = ownerMatched && lifecycleMatched;
  const firstExclusionPredicate = !lifecycleObserved
    ? "lifecycle-evidence-unavailable"
    : (expectedFixtureFailureCode !== "PASS"
      ? "expected-fixture-digest"
    : (!opsResponseBinding.pass
      ? "ops-authoritative-response-binding"
      : (stageFixtureMatches.authoritativeResponse !== 1
        ? "ops-query-result"
        : (stageFixtureMatches.renderInput !== 1
          ? "renderer-input-mapper"
          : (stageFixtureMatches.sorted !== 1
            ? "timeline-sort"
            : (stageFixtureMatches.bounded !== 1
              ? "timeline-bound"
              : (stageFixtureMatches.dom !== 1 ? "dom-commit" : "none")))))));
  const failureCode = pass
    ? "PASS"
    : (!ownerMatched
      ? "OPS_INCIDENT_TIMELINE_OWNER_MISMATCH"
      : (!lifecycleObserved
        ? "OPS_INCIDENT_TIMELINE_LIFECYCLE_EVIDENCE_MISSING"
        : (expectedFixtureFailureCode !== "PASS"
          ? expectedFixtureFailureCode
          : (!opsResponseBinding.pass
            ? "OPS_INCIDENT_TIMELINE_RESPONSE_BINDING_MISMATCH"
            : "OPS_INCIDENT_TIMELINE_LIFECYCLE_MISMATCH"))));
  return {
    schema: "media-server.v390-ui-route-local-incident-timeline-evidence.v1",
    pass,
    failurePhase: pass ? "" : (ownerMatched
      ? firstExclusionPredicate
      : "route-renderer-owner"),
    failureCode,
    routeOwner: "/ops/dashboard",
    rendererOwner: "renderDashboardIncidentTimeline",
    lifecycleObserved,
    opsEndpointMethod: opsResponseBinding.method,
    opsEndpointPath: opsResponseBinding.path,
    opsResponseStatus: opsResponseBinding.status,
    opsRequestIdentityDigest: opsResponseBinding.requestIdentityDigest,
    opsRequestSequence: opsResponseBinding.requestSequence,
    opsRequestCandidateCount: opsResponseBinding.requestCandidateCount,
    opsResponseCandidateCount: opsResponseBinding.responseCandidateCount,
    opsResponseRequestObjectObserved: opsResponseBinding.responseRequestObjectObserved,
    opsRequestResponseIdentityMatched: opsResponseBinding.identityMatched,
    opsCaseOwnedRequestCandidateCount: opsResponseBinding.caseOwnedRequestCandidateCount,
    opsCaseOwnedResponseCandidateCount: opsResponseBinding.caseOwnedResponseCandidateCount,
    opsCorrelationRequestCandidateCount: opsResponseBinding.correlationRequestCandidateCount,
    opsCorrelationResponseCandidateCount: opsResponseBinding.correlationResponseCandidateCount,
    opsInitiatorActionId: opsResponseBinding.initiatorActionId,
    opsRenderCycleId: opsResponseBinding.renderCycleId,
    opsRenderCycleMatched: opsResponseBinding.renderCycleMatched,
    opsRequestStartedAtMs: opsResponseBinding.requestStartedAtMs,
    opsResponseObservedAtMs: opsResponseBinding.responseObservedAtMs,
    opsRequestLedger: opsResponseBinding.requestLedger,
    storageOwner: "EventStorageApplicationService/QueryEventRecordsForApplication",
    clientOpsStorageOwnerShared: true,
    appliedQueryPredicates: ["limit=5", "includeArchives=true"],
    filterCandidateCounts: {
      queryResult: responseEventIdentityDigests.length,
    },
    firstExclusionPredicate,
    routeDigest: sha256Digest(routePath),
    containerCount,
    incidentUnitNodeCount,
    eventRecordCandidateCount,
    renderPhase,
    eventRecordInputCount,
    eventRecordBoundedCount,
    eventRecordDomCount,
    incidentInputCounts,
    incidentBoundedCounts,
    authoritativeResponseCandidateCount: responseEventIdentityDigests.length,
    renderInputEventRecordCount: renderInputEventIdentityDigests.length,
    sortedEventRecordCount: sortedEventIdentityDigests.length,
    boundedEventRecordCount: boundedEventIdentityDigests.length,
    domEventRecordCount: domEventIdentityDigests.length,
    expectedFixtureDigest,
    stageFixtureMatches,
    responseEventIdentityDigests,
    renderInputEventIdentityDigests,
    sortedEventIdentityDigests,
    boundedEventIdentityDigests,
    domEventIdentityDigests,
    attributeNames,
    attributeNamesDigest: sha256Digest(attributeNames),
  };
}

function buildOpsIncidentTimelineResponseBinding(
  networkEntries = [],
  ownedRenderCycle = {},
) {
  const endpointPath = "/ops/api/events/status?limit=5&includeArchives=1";
  const target = entry => {
    try {
      const parsed = new URL(String(entry?.url || ""));
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return "";
    }
  };
  const entries = Array.isArray(networkEntries) ? networkEntries : [];
  const requests = entries.filter(entry =>
    entry?.phase === "request-start" &&
    entry?.method === "GET" &&
    entry?.requestKind === "application-fetch" &&
    target(entry) === endpointPath);
  const responses = entries.filter(entry =>
    entry?.phase === "response" &&
    entry?.method === "GET" &&
    entry?.requestKind === "application-fetch" &&
    target(entry) === endpointPath);
  const initiatorActionId = String(ownedRenderCycle?.actionId || "");
  const renderCycleId = String(ownedRenderCycle?.renderCycleId || "");
  const caseOwnedRequests = requests.filter(entry =>
    entry?.initiatorActionId === initiatorActionId &&
    entry?.renderCycleId === renderCycleId);
  const caseOwnedResponses = responses.filter(entry =>
    entry?.initiatorActionId === initiatorActionId &&
    entry?.renderCycleId === renderCycleId);
  const request = caseOwnedRequests.length === 1 ? caseOwnedRequests[0] : null;
  const response = caseOwnedResponses.length === 1 ? caseOwnedResponses[0] : null;
  const correlationId = String(request?.correlationId || "");
  const correlationRequests = requests.filter(entry =>
    correlationId && entry?.correlationId === correlationId);
  const correlationResponses = responses.filter(entry =>
    correlationId && entry?.correlationId === correlationId);
  const scopedEntries = entries.filter(entry =>
    entry?.initiatorActionId === initiatorActionId &&
    entry?.renderCycleId === renderCycleId);
  const correlationEvidence = buildRequestCorrelationEvidence({
    entries: scopedEntries,
    actionId: initiatorActionId,
    expected: {
      caseId: String(request?.caseRequestIdentity || "").split(":request-")[0],
      method: "GET",
      urlPath: endpointPath,
      correlationId,
      correlationRequired: true,
      allowedStatuses: [200],
      requestKind: "application-fetch",
      initiatorActionId,
      renderCycleId,
    },
    requestResult: {
      actionId: initiatorActionId,
      requestAttemptCount: caseOwnedRequests.length,
      requestReissued: caseOwnedRequests.length !== 1,
    },
    listenerInstalledBeforeRequest: true,
  });
  const renderCycleMatched = Boolean(
    initiatorActionId && renderCycleId &&
    ownedRenderCycle?.expectedPhaseMatched === true &&
    ownedRenderCycle?.finalPhase === "dom-committed" &&
    Number(ownedRenderCycle?.phaseMutationCount || 0) >= 2 &&
    Number(ownedRenderCycle?.domMutationCount || 0) >= 1 &&
    Number(ownedRenderCycle?.startedAtMs || 0) > 0 &&
    Number(ownedRenderCycle?.completedAtMs || 0) >=
      Number(ownedRenderCycle?.startedAtMs || 0) &&
    Number(request?.requestStartedAtMs || 0) >=
      Number(ownedRenderCycle?.startedAtMs || 0) &&
    Number(response?.responseObservedAtMs || 0) >=
      Number(request?.requestStartedAtMs || 0),
  );
  const identityMatched = correlationEvidence.pass === true &&
    correlationRequests.length === 1 &&
    correlationResponses.length === 1;
  const requestLedger = requests.map(requestEntry => {
    const responseEntry = responses.find(candidate =>
      candidate.requestId && candidate.requestId === requestEntry.requestId) || null;
    const ownership = requestEntry.initiatorActionId === initiatorActionId &&
        requestEntry.renderCycleId === renderCycleId
      ? "case-owned-refresh-render"
      : (requestEntry.requestOwnershipKind === "initial-page-load"
        ? "initial-page-load"
        : (requestEntry.initiatorActionId && !requestEntry.renderCycleId
          ? "diagnostic-authoritative-readback"
          : (requestEntry.requestOwnershipKind || "unowned-request")));
    return {
      ownership,
      requestIdentityDigest: requestEntry.caseRequestIdentity
        ? sha256Digest(String(requestEntry.caseRequestIdentity))
        : "",
      requestSequence: Number.isInteger(requestEntry.caseRequestSequence)
        ? requestEntry.caseRequestSequence
        : 0,
      initiatorActionId: String(requestEntry.initiatorActionId || ""),
      renderCycleId: String(requestEntry.renderCycleId || ""),
      requestStartedAtMs: Number(requestEntry.requestStartedAtMs || 0),
      responseObservedAtMs: Number(responseEntry?.responseObservedAtMs || 0),
      method: String(requestEntry.method || ""),
      path: endpointPath,
      correlationPresent: Boolean(requestEntry.correlationId),
      correlationDigest: requestEntry.correlationId
        ? sha256Digest(String(requestEntry.correlationId))
        : "",
      correlationRouteState: String(requestEntry.correlationRouteState || ""),
      correlationRouteActionId: String(requestEntry.correlationRouteActionId || ""),
      correlationRouteDigest: String(requestEntry.correlationRouteDigest || ""),
      responseRequestObjectObserved:
        responseEntry?.responseRequestObjectObserved === true,
      responseStatus: Number(responseEntry?.status || 0),
    };
  });
  return {
    pass: identityMatched && renderCycleMatched && response?.status === 200 &&
      response?.safeResponseProjectionSource === "playwright-response-json" &&
      response?.safeResponseProjectionKind ===
        "ops-incident-timeline-event-records" &&
      response?.safeResponseForbiddenMaterialObserved !== true,
    method: "GET",
    path: endpointPath,
    status: Number(response?.status || 0),
    requestIdentityDigest: request?.caseRequestIdentity
      ? sha256Digest(String(request.caseRequestIdentity))
      : sha256Digest(""),
    requestSequence: Number.isInteger(request?.caseRequestSequence)
      ? request.caseRequestSequence
      : 0,
    requestCandidateCount: requests.length,
    responseCandidateCount: responses.length,
    caseOwnedRequestCandidateCount: caseOwnedRequests.length,
    caseOwnedResponseCandidateCount: caseOwnedResponses.length,
    correlationRequestCandidateCount: correlationRequests.length,
    correlationResponseCandidateCount: correlationResponses.length,
    responseRequestObjectObserved: response?.responseRequestObjectObserved === true,
    identityMatched,
    initiatorActionId,
    renderCycleId,
    renderCycleMatched,
    requestStartedAtMs: Number(request?.requestStartedAtMs || 0),
    responseObservedAtMs: Number(response?.responseObservedAtMs || 0),
    requestLedger,
  };
}

export function buildEventMarkerFlowEvidence({
  caseId = "",
  marker,
  expectedFixtureIdentity = null,
  observed,
  responseBodies = [],
}) {
  const canonicalMarker = String(marker || "").normalize("NFKC").trim();
  const markerDigest = sha256Digest(canonicalMarker);
  const fixtureIdentityRequired = caseId === "EVT-004" || expectedFixtureIdentity !== null;
  const fixtureIdentityFailureCode = !fixtureIdentityRequired
    ? "PASS"
    : (!expectedFixtureIdentity?.markerIdentityDigest
      ? "EXPECTED_FIXTURE_DIGEST_MISSING"
      : (expectedFixtureIdentity.caseId !== caseId
        ? "EXPECTED_FIXTURE_DIGEST_CASE_MISMATCH"
        : (expectedFixtureIdentity.schema !==
              "media-server.v390-ui-expected-fixture-identity.v1" ||
            expectedFixtureIdentity.kind !== "diagnostic-log-marker" ||
            expectedFixtureIdentity.source !==
              "test-owned-diagnostic-log-marker-materializer" ||
            expectedFixtureIdentity.markerIdentityDigest !== markerDigest
          ? "EXPECTED_FIXTURE_DIGEST_MISMATCH"
          : "PASS")));
  const markerMatches = value =>
    matchesDeclaredLiteral(value, canonicalMarker, "marker-token");
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
    pass: canonicalMarker.length > 0 && fixtureIdentityFailureCode === "PASS",
    markerDigest,
    expectedFixtureDigestBound: fixtureIdentityFailureCode === "PASS",
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
  const projectionStages = buildEventMarkerProjectionStageEvidence({
    required: caseId === "EVT-004",
    markerDigest,
    expectedLiteralMatchEvidence: buildDeclaredLiteralMatchEvidence({
      callsite: "v390_ui_exact_oracle_runtime:route-local-incident-timeline-marker",
      input: canonicalMarker,
      flags: "none",
      intendedMatchingSemantics: "nfkc-collapse-whitespace-exact-literal-token-boundary",
    }),
    projection: observed?.properties?.routeLocalIncidentTimeline?.markerProjection || null,
    domMarkerObserved,
  });
  const failed = [
    ["fixture-marker-materialization", fixtureMarkerMaterialized.pass,
      canonicalMarker.length === 0
        ? "FIXTURE_MARKER_NOT_MATERIALIZED"
        : fixtureIdentityFailureCode],
    ["authoritative-response", responseMarkerObserved.pass,
      responseMarkerObserved.matchedCount > 1 ? "RESPONSE_MARKER_DUPLICATE" : "RESPONSE_MARKER_NOT_OBSERVED"],
    ["projection-stages", projectionStages.pass, projectionStages.failureCode],
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
    projectionStages,
    timelineProjectionObserved,
    domMarkerObserved,
  };
}

function buildEventMarkerProjectionStageEvidence({
  required,
  markerDigest,
  expectedLiteralMatchEvidence,
  projection,
  domMarkerObserved,
}) {
  if (!projection) {
    return required
      ? {
          schema: "media-server.v390-ui-event-marker-projection-stages.v1",
          pass: false,
          failureCode: "MARKER_PROJECTION_EVIDENCE_MISSING",
          firstMissingStage: "projection-evidence",
          stages: [],
        }
      : {
          schema: "media-server.v390-ui-event-marker-projection-stages.v1",
          pass: true,
          failureCode: "PASS",
          firstMissingStage: "",
          status: "not-required",
          stages: [],
        };
  }
  const literalMatchEvidence = projection?.literalMatchEvidence || null;
  const literalEvidenceMissing = !literalMatchEvidence;
  const literalEvidenceDrift = literalMatchEvidence && (
    literalMatchEvidence.schema !== expectedLiteralMatchEvidence.schema ||
    literalMatchEvidence.callsite !== expectedLiteralMatchEvidence.callsite ||
    literalMatchEvidence.patternSourceDigest !== expectedLiteralMatchEvidence.patternSourceDigest ||
    literalMatchEvidence.inputDigest !== markerDigest ||
    literalMatchEvidence.inputLength !== expectedLiteralMatchEvidence.inputLength ||
    JSON.stringify(literalMatchEvidence.regexMetacharacterKinds) !==
      JSON.stringify(expectedLiteralMatchEvidence.regexMetacharacterKinds) ||
    literalMatchEvidence.flags !== expectedLiteralMatchEvidence.flags ||
    literalMatchEvidence.intendedMatchingSemantics !==
      expectedLiteralMatchEvidence.intendedMatchingSemantics
  );
  const definitions = [
    ["response", "RESPONSE_MARKER_NOT_OBSERVED"],
    ["classifier", "MARKER_CLASSIFIER_EXCLUDED"],
    ["sorted", "MARKER_SORT_IDENTITY_LOST"],
    ["filtered", "MARKER_SOURCE_FILTER_EXCLUDED"],
    ["bounded", "MARKER_BOUNDED_OUT"],
    ["rendererInput", "MARKER_RENDERER_INPUT_MISSING"],
  ];
  const stages = definitions.map(([name, missingCode]) => {
    const value = projection?.[name] || {};
    const digests = Array.isArray(value.markerDigests) ? value.markerDigests.map(String) : [];
    const matchedCount = digests.filter(digest => digest === markerDigest).length;
    const digestDriftCount = digests.filter(digest => digest !== markerDigest).length;
    return {
      name,
      inputCount: Number(value.inputCount || 0),
      outputCount: Number(value.outputCount || 0),
      markerDigest,
      matchedCount,
      digestDriftCount,
      result: String(value.result || ""),
      reason: String(value.reason || value.exclusionReason || ""),
      pass: matchedCount === 1 && digestDriftCount === 0,
      missingCode,
    };
  });
  stages.push({
    name: "dom",
    inputCount: Number(projection?.dom?.inputCount ?? domMarkerObserved.candidateCount ?? 0),
    outputCount: Number(projection?.dom?.outputCount ?? domMarkerObserved.matchedCount ?? 0),
    markerDigest,
    matchedCount: Number(projection?.dom?.matchedNodeCount ?? domMarkerObserved.matchedCount ?? 0),
    digestDriftCount: Array.isArray(projection?.dom?.markerDigests)
      ? projection.dom.markerDigests.filter(digest => String(digest) !== markerDigest).length
      : 0,
    result: "visible-route-local-node",
    reason: "",
    pass: Number(projection?.dom?.matchedNodeCount ?? domMarkerObserved.matchedCount ?? 0) === 1,
    missingCode: Number(projection?.dom?.matchedNodeCount ?? domMarkerObserved.matchedCount ?? 0) > 1
      ? "DOM_MARKER_DUPLICATE"
      : "DOM_MARKER_NOT_OBSERVED",
  });
  const routePass = projection.routeOwner === "/ops/dashboard" &&
    projection.rendererContainerSelector === "#dashIncidentTimeline";
  const digestDrift = stages.find(stage => stage.digestDriftCount > 0);
  const failedStage = stages.find(stage => !stage.pass);
  const failureCode = literalEvidenceMissing
    ? "LITERAL_MATCH_EVIDENCE_MISSING"
    : (literalEvidenceDrift
      ? "LITERAL_MATCH_EVIDENCE_DRIFT"
      : (digestDrift
        ? "MARKER_PROJECTION_DIGEST_DRIFT"
        : (!routePass
          ? "MARKER_ROUTE_OWNER_MISMATCH"
          : (failedStage?.missingCode || "PASS"))));
  return {
    schema: "media-server.v390-ui-event-marker-projection-stages.v1",
    pass: failureCode === "PASS",
    failureCode,
    firstMissingStage: failureCode === "PASS"
      ? ""
      : (failureCode.startsWith("LITERAL_MATCH_EVIDENCE_")
        ? "literal-match-evidence"
        : (failureCode === "MARKER_ROUTE_OWNER_MISMATCH"
          ? "route-owner"
          : String((digestDrift || failedStage)?.name || ""))),
    routeOwner: String(projection.routeOwner || ""),
    rendererContainerSelector: String(projection.rendererContainerSelector || ""),
    literalMatchEvidence: literalMatchEvidence
      ? {
          schema: String(literalMatchEvidence.schema || ""),
          callsite: String(literalMatchEvidence.callsite || ""),
          patternSourceDigest: String(literalMatchEvidence.patternSourceDigest || ""),
          inputDigest: String(literalMatchEvidence.inputDigest || ""),
          inputLength: Number(literalMatchEvidence.inputLength || 0),
          regexMetacharacterKinds: Array.isArray(literalMatchEvidence.regexMetacharacterKinds)
            ? literalMatchEvidence.regexMetacharacterKinds.map(String)
            : [],
          flags: String(literalMatchEvidence.flags || ""),
          intendedMatchingSemantics: String(literalMatchEvidence.intendedMatchingSemantics || ""),
        }
      : null,
    stages: stages.map(({ missingCode: _missingCode, ...stage }) => stage),
  };
}

export function evaluateEventMarkerFlowEvidence({
  caseId = "",
  marker,
  expectedFixtureIdentity = null,
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
    const evidence = markerEvaluator({
      caseId,
      marker,
      expectedFixtureIdentity,
      observed,
      responseBodies,
    });
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

export function selectEventDomResponseBaselines(assertionOrTarget, eventRuntimeContext = {}) {
  const assertion = assertionOrTarget && typeof assertionOrTarget === "object"
    ? assertionOrTarget
    : null;
  const target = assertion ? String(assertion.target || "") : String(assertionOrTarget || "");
  if (assertion) {
    if (assertion.binding?.mode === "direct-dom" || [
      "text-includes",
      "contains-fixture-marker",
      "not-contains-sensitive-canary",
    ].includes(String(assertion.operator || ""))) {
      return {};
    }
    const assertionKey = `${String(assertion.operator || "")}\n${target}`;
    const sourceAssertionKey = `${String(assertion.operator || "")}\n${String(assertion.templateTarget || target)}`;
    const explicit = eventRuntimeContext?.domResponseBaselineByAssertionKey?.[assertionKey] ||
      eventRuntimeContext?.domResponseBaselineByAssertionKey?.[sourceAssertionKey];
    if (explicit) return { [target]: explicit };
    if (["row-local-response", "row-set-response"].includes(assertion.binding?.mode)) {
      assert(false, `declared DOM response baseline is missing: ${assertionKey}`);
    }
  }
  const baselineByTarget = eventRuntimeContext?.domResponseBaselineByTarget || {};
  const targetEntries = target.split("|").filter(Boolean)
    .filter(path => Object.prototype.hasOwnProperty.call(baselineByTarget, path))
    .map(path => [path, baselineByTarget[path]]);
  const rowLocalRequired = new Set(eventRuntimeContext?.rowLocalResponseTargets || []);
  if (rowLocalRequired.has(target)) {
    assert(targetEntries.length === 1 &&
      isEventRowLocalResponseBaseline(targetEntries[0][1]),
    `row-local response baseline is missing or invalid for target: ${target}`);
    return Object.fromEntries(targetEntries);
  }
  if (targetEntries.length > 0) return Object.fromEntries(targetEntries);
  return {
    [target]: {
      schema: "media-server.v390-ui-event-response-baseline-missing.v1",
      targetDigest: sha256Digest(String(target || "")),
    },
  };
}

export function selectEventDomResponseBodies(
  assertion,
  eventRuntimeContext = {},
  responses = [],
  responseBodies = [],
) {
  assert(Array.isArray(responses) && Array.isArray(responseBodies) &&
    responses.length === responseBodies.length,
  "DOM response owner selection requires aligned response evidence and bodies");
  const baselines = selectEventDomResponseBaselines(assertion, eventRuntimeContext);
  const bindingSource = assertion?.binding?.mode === "direct-dom"
    ? assertion?.binding?.responseSource
    : null;
  const materializedBindingSource = bindingSource
    ? {
        method: String(bindingSource.method || "GET").toUpperCase(),
        path: materializeEventExactTemplate(
          bindingSource.path,
          eventRuntimeContext?.templateValues || {},
        ),
      }
    : null;
  const sources = [...new Map([
    ...(materializedBindingSource ? [materializedBindingSource] : []),
    ...Object.values(baselines)
    .filter(baseline => baseline?.responseSource)
    .map(baseline => baseline.responseSource),
  ].map(source => [stableSerialize(source), source])).values()];
  if (sources.length === 0) return responseBodies;
  assert(sources.length === 1,
    "DOM assertion declares multiple authoritative response owners");
  const source = sources[0];
  const matches = responses.map((response, index) => ({ response, index }))
    .filter(({ response }) =>
      String(response?.method || "").toUpperCase() === String(source.method || "").toUpperCase() &&
      String(response?.urlPath || "") === String(source.path || ""));
  assert(matches.length === 1,
    `DOM authoritative runtime response owner cardinality mismatch: ${matches.length}`);
  return [responseBodies[matches[0].index]];
}

export function resolveEventDomAssertionForRuntime({
  caseId = "", assertion = {}, bindings = {}, eventRuntimeContext = null,
} = {}) {
  const templateTarget = String(assertion?.target || "");
  if (!String(caseId).startsWith("EVT-") || !/[{}]/u.test(templateTarget)) {
    return Object.freeze({ ...assertion, target: expand(templateTarget, bindings) });
  }
  const templateValues = {
    ...bindings,
    ...(eventRuntimeContext?.templateValues || {}),
  };
  const target = resolveEventExactTemplate(templateTarget, templateValues, {
    context: "semantic-target",
  });
  return Object.freeze({ ...assertion, target, templateTarget });
}

function responseBaselineSelectionMissing(selectedResponseBaselines) {
  const entries = Object.values(selectedResponseBaselines || {});
  return entries.length === 1 && entries[0]?.schema ===
    "media-server.v390-ui-event-response-baseline-missing.v1";
}

export function buildResponseDerivedEventDomProjectionEvidence({
  caseId = "",
  assertion = {},
  observed = {},
  responseBodies = [],
  fixtureCandidates = [],
  fixtureIdentity = "",
  selectedResponseBaselines = {},
} = {}) {
  const contract = responseDerivedDomProjectionContractFor({
    caseId,
    operator: String(assertion.operator || ""),
    target: String(assertion.target || ""),
  });
  if (!contract && (!/equal(?:s)?-response/.test(String(assertion.operator || "")) ||
      !responseBaselineSelectionMissing(selectedResponseBaselines))) return null;
  return evaluateResponseDerivedDomFieldProjection({
    caseId,
    operator: assertion.operator,
    target: assertion.target,
    responseBodies,
    observation: observed,
    fixtureCandidates,
    fixtureIdentity,
  });
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

function isEventRequestOwnerProvenanceBaseline(value) {
  return value?.schema === "media-server.v390-ui-event-owner-provenance-baseline.v1" &&
    value.provenance === "request" &&
    value.collectionPath === "networkEntries" &&
    Array.isArray(value.fixtureIdentityPaths) &&
    stableEqual(value.fixtureIdentityPaths,
      ["caseRequestIdentity", "caseRequestSequence", "requestId"]) &&
    value.valuePath === "url.searchParams" &&
    value.cardinality?.collectionOwner === 1 &&
    value.cardinality?.fixtureRow === 1 &&
    Number.isInteger(value.cardinality?.value) && value.cardinality.value > 0 &&
    typeof value.requestMethod === "string" && value.requestMethod.length > 0 &&
    typeof value.requestPathname === "string" && value.requestPathname.startsWith("/") &&
    value.expectedQuery && typeof value.expectedQuery === "object" &&
    !Array.isArray(value.expectedQuery);
}

function evaluateEventRequestQueryOwner({
  caseId,
  networkEntries,
  baseline,
  requestCorrelationEvidence = null,
  requestActionId = "",
}) {
  const entries = Array.isArray(networkEntries) ? networkEntries : [];
  const parseUrl = entry => {
    try {
      return new URL(String(entry?.url || ""), "http://runtime.invalid");
    } catch {
      return null;
    }
  };
  const binding = requestCorrelationEvidence;
  const bindingIdentity = String(binding?.caseRequestIdentity || "");
  const bindingSequence = Number(binding?.caseRequestSequence || 0);
  const bindingResponseIdentity = String(binding?.responseRequestIdentity || "");
  const bindingResponseSequence = Number(binding?.responseRequestSequence || 0);
  const bindingDigest = String(binding?.correlationDigest || "");
  const bindingExpectedPath = String(binding?.expectedPath || "");
  const expectedActionId = String(binding?.expectedActionId || "");
  const bindingShapeValid = binding?.schema ===
      "media-server.v390-ui-request-correlation-evidence.v1" &&
    binding?.pass === true && binding?.requestIdentityMatched === true &&
    binding?.responseRequestObjectObserved === true &&
    binding?.expectedCaseId === caseId &&
    binding?.expectedMethod === baseline.requestMethod &&
    expectedActionId.length > 0 && expectedActionId === String(requestActionId || "") &&
    bindingIdentity === `${caseId}:request-${bindingSequence}` &&
    bindingSequence > 0 &&
    bindingResponseIdentity === bindingIdentity &&
    bindingResponseSequence === bindingSequence &&
    /^[a-f0-9]{64}$/.test(bindingDigest) &&
    binding?.expectedCorrelationDigest === bindingDigest &&
    binding?.initiatingRequestCorrelationDigest === bindingDigest &&
    binding?.responseRequestCorrelationDigest === bindingDigest &&
    binding?.requestCandidateCount === 1 && binding?.matchedRequestCount === 1 &&
    binding?.responseCandidateCount === 1 && binding?.matchedResponseCount === 1 &&
    binding?.requestAttemptCount === 1 && binding?.requestReissued === false;
  const exactIdentity = entry => bindingShapeValid &&
    entry?.caseRequestIdentity === bindingIdentity &&
    entry?.caseRequestSequence === bindingSequence;
  const ownsTarget = entry => {
    const parsed = parseUrl(entry);
    return exactIdentity(entry) && entry?.requestKind === "application-fetch" &&
      entry?.sameOrigin === true &&
      String(entry?.method || "").toUpperCase() === baseline.requestMethod &&
      parsed?.pathname === baseline.requestPathname &&
      sha256Digest(String(entry?.correlationId || "")) === bindingDigest;
  };
  const requests = entries.filter(entry => entry?.phase === "request-start" && ownsTarget(entry));
  const responses = entries.filter(entry => entry?.phase === "response" && ownsTarget(entry));
  const request = requests.length === baseline.cardinality.collectionOwner
    ? requests[0]
    : null;
  const response = request
    ? responses.filter(candidate =>
      candidate.responseRequestObjectObserved === true &&
      candidate.requestIdentitySource === "playwright-response-request" &&
      candidate.requestId === request.requestId &&
      candidate.caseRequestIdentity === request.caseRequestIdentity &&
      candidate.caseRequestSequence === request.caseRequestSequence &&
      String(candidate.url || "") === String(request.url || ""))
    : [];
  const identityValid = Boolean(request &&
    typeof request.requestId === "string" && request.requestId.length > 0 &&
    typeof request.caseRequestIdentity === "string" &&
    request.caseRequestIdentity === bindingIdentity &&
    request.caseRequestSequence === bindingSequence &&
    response.length === baseline.cardinality.fixtureRow);
  const expectedKeys = Object.keys(baseline.expectedQuery).sort();
  const expectedShapeValid = expectedKeys.length === baseline.cardinality.value &&
    expectedKeys.every(key => typeof baseline.expectedQuery[key] === "string");
  const parsed = request ? parseUrl(request) : null;
  const bindingParsed = bindingShapeValid ? parseUrl({ url: bindingExpectedPath }) : null;
  const bindingPathValid = Boolean(bindingParsed &&
    bindingParsed.pathname === baseline.requestPathname &&
    String(bindingParsed.pathname + bindingParsed.search) === String(parsed?.pathname + parsed?.search));
  const exactValues = Boolean(parsed && expectedShapeValid &&
    expectedKeys.every(key => {
      const values = parsed.searchParams.getAll(key);
      return values.length === 1 && values[0] === baseline.expectedQuery[key];
    }));
  const actualQuery = parsed
    ? Object.fromEntries(expectedKeys.map(key => [key, parsed.searchParams.getAll(key)]))
    : null;
  const pass = bindingShapeValid && bindingPathValid &&
    requests.length === baseline.cardinality.collectionOwner &&
    identityValid && expectedShapeValid && exactValues;
  const reasonCode = pass
    ? "PASS"
    : !bindingShapeValid
    ? "REQUEST_CORRELATION_BINDING_INVALID"
    : requests.length === 0
    ? "REQUEST_OWNER_MISSING"
    : requests.length !== baseline.cardinality.collectionOwner
    ? "REQUEST_OWNER_DUPLICATE"
    : !identityValid || !bindingPathValid
    ? "REQUEST_RESPONSE_IDENTITY_MISMATCH"
    : "REQUEST_QUERY_EXACT_MISMATCH";
  return {
    pass,
    reasonCode,
    candidates: request ? [actualQuery] : [],
    ownerCandidateCount: requests.length,
    responseCandidateCount: responses.length,
    requestIdentityDigest: request?.caseRequestIdentity
      ? sha256Digest(String(request.caseRequestIdentity))
      : sha256Digest(""),
    requestSequence: Number.isInteger(request?.caseRequestSequence)
      ? request.caseRequestSequence
      : 0,
  };
}

function isEventRowSetResponseBaseline(value) {
  return value?.schema === "media-server.v390-ui-event-row-set-response-baseline.v1" &&
    typeof value.collectionPath === "string" &&
    Array.isArray(value.identityPaths) && value.identityPaths.length > 0 &&
    ["all", "any"].includes(value.identityPathMode) &&
    Array.isArray(value.identityValues) && value.identityValues.length > 1 &&
    Array.isArray(value.projectionPaths) && value.projectionPaths.length > 0 &&
    Array.isArray(value.expectedRows) &&
    value.expectedRows.length === value.identityValues.length;
}

function eventResponseRowMatchesIdentity(row, {
  identityPaths = [],
  identityPathMode = "any",
  identityValue,
  identityProjection = null,
} = {}) {
  if (identityProjection && typeof identityProjection === "object" &&
      !Array.isArray(identityProjection) && Object.keys(identityProjection).length > 0) {
    return Object.entries(identityProjection).every(([responsePath, expected]) => {
      const values = eventExactValuesAtPath(row, responsePath);
      return values.length === 1 && String(values[0]) === String(expected);
    });
  }
  const matches = identityPaths.map(identityPath =>
    eventExactValuesAtPath(row, identityPath)
      .some(identity => String(identity) === String(identityValue)));
  return identityPathMode === "all" ? matches.every(Boolean) : matches.some(Boolean);
}

function eventRowLocalResponseProjections(body, baseline) {
  const rows = eventExactValuesAtPath(body, baseline.collectionPath)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
  const matchingRows = rows.filter(row => eventResponseRowMatchesIdentity(row, baseline));
  return matchingRows.map(row => Object.fromEntries(baseline.projectionPaths.map(projectionPath => {
    const values = eventExactValuesAtPath(row, projectionPath);
    return [projectionPath, values.length === 1 ? values[0] : values];
  })));
}

function eventRowSetResponseProjections(body, baseline) {
  const rows = eventExactValuesAtPath(body, baseline.collectionPath)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
  return baseline.expectedRows.flatMap(expectedRow => rows
    .filter(row => eventResponseRowMatchesIdentity(row, {
      identityPaths: baseline.identityPaths,
      identityPathMode: baseline.identityPathMode,
      identityValue: expectedRow.identityValue,
      identityProjection: expectedRow.identityProjection,
    }))
    .map(row => ({
      identityValue: expectedRow.identityValue,
      projection: Object.fromEntries(baseline.projectionPaths.map(projectionPath => {
        const values = eventExactValuesAtPath(row, projectionPath);
        return [projectionPath, values.length === 1 ? values[0] : values];
      })),
    })));
}

function eventDomFixtureIdentityDescriptor(value) {
  if (value?.schema !== "media-server.v390-ui-event-dom-fixture-identity.v1" ||
      !Array.isArray(value.expectedNodeTokens) ||
      value.expectedNodeTokens.length !== 3 ||
      !value.expectedNodeTokens.every(token => typeof token === "string" && token.length > 0)) {
    return null;
  }
  if (value.kind === "event-record") {
    if (![value.eventId, value.eventType, value.status]
      .every(field => typeof field === "string" && field.length > 0)) return null;
    const apiExpectedProjection = value.apiExpectedProjection;
    if (!apiExpectedProjection || typeof apiExpectedProjection !== "object" ||
        Array.isArray(apiExpectedProjection)) return null;
    const apiProjectionKeys = Object.keys(apiExpectedProjection).sort();
    const eventStateProjection = stableEqual(apiProjectionKeys, ["eventType", "status"]) &&
      apiExpectedProjection.eventType === value.eventType &&
      apiExpectedProjection.status === value.status;
    const eventEvidenceProjection = stableEqual(
      apiProjectionKeys,
      ["clipPath", "eventId", "snapshotPath"],
    ) && apiExpectedProjection.eventId === value.eventId &&
      [apiExpectedProjection.snapshotPath, apiExpectedProjection.clipPath]
        .every(field => typeof field === "string" && field.length > 0) &&
      value.expectedNodeTokens[1] === basename(apiExpectedProjection.snapshotPath) &&
      value.expectedNodeTokens[2] === basename(apiExpectedProjection.clipPath);
    if (!eventStateProjection && !eventEvidenceProjection) return null;
    return {
      kind: "event-record",
      identityValue: value.eventId,
      fieldNames: ["eventId", "eventType", "status"],
      apiProjectionKind: eventStateProjection ? "event-state" : "event-evidence-paths",
      apiExpectedProjection,
      identityProjection: {
        kind: "event-record",
        eventId: value.eventId,
        eventType: value.eventType,
        status: value.status,
      },
    };
  }
  if (value.kind && value.kind !== "source-health") return null;
  if (![value.sourceId, value.status, value.reason]
    .every(field => typeof field === "string" && field.length > 0)) return null;
  return {
    kind: "source-health",
    identityValue: value.sourceId,
    fieldNames: ["sourceId", "status", "reason"],
    expectedProjection: {
      status: value.status,
      reason: value.reason,
    },
    apiProjectionKind: "source-health-state",
    apiExpectedProjection: {
      status: value.status,
      reason: value.reason,
    },
    identityProjection: {
      kind: "source-health",
      sourceId: value.sourceId,
      status: value.status,
      reason: value.reason,
    },
  };
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

function eventDomRendererIdentityProjection(identity, descriptor) {
  if (descriptor.kind === "event-record") {
    const eventId = normalizeEventDomRendererSegment(identity.eventId);
    const eventType = normalizeEventDomRendererSegment(identity.eventType);
    const status = normalizeEventDomRendererSegment(identity.status);
    return {
      kind: descriptor.kind,
      fieldNames: descriptor.fieldNames,
      eventId,
      eventType,
      status,
      fieldLabels: {
        eventId: [eventId],
        eventType: [eventType],
        status: [status],
      },
      fieldFailureCodes: {
        eventId: "DOM_FIXTURE_EVENT_ID_NOT_OBSERVED",
        eventType: "DOM_FIXTURE_EVENT_TYPE_NOT_OBSERVED",
        status: "DOM_FIXTURE_STATUS_NOT_OBSERVED",
      },
      fieldDigests: {
        eventId: sha256Digest([eventId]),
        eventType: sha256Digest([eventType]),
        status: sha256Digest([status]),
      },
    };
  }
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
    kind: descriptor.kind,
    fieldNames: descriptor.fieldNames,
    sourceId,
    sourceLabels: sourceLabels.map(normalizeEventDomRendererSegment),
    statusLabels: statusLabels.map(normalizeEventDomRendererSegment),
    reasonLabels: reasonLabels.map(normalizeEventDomRendererSegment),
    tupleSegments,
    fieldFailureCodes: {
      sourceId: "DOM_FIXTURE_SOURCE_ID_NOT_OBSERVED",
      status: "DOM_FIXTURE_STATUS_NOT_OBSERVED",
      reason: "DOM_FIXTURE_REASON_NOT_OBSERVED",
    },
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
  if (projection.kind === "event-record") {
    const fields = Object.fromEntries(projection.fieldNames.map(field => [
      field,
      segments.some(segment => projection.fieldLabels[field]
        .some(label => exactNormalizedPhrasePresent(segment, label))),
    ]));
    return {
      pass: projection.fieldNames.every(field => fields[field]),
      fields,
    };
  }
  const fields = {
    sourceId: segments.some(segment =>
      matchesDeclaredLiteral(segment, `#${projection.sourceId}`, "whitespace-token")),
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
  return matchesDeclaredLiteral(segment, phrase, "whitespace-token");
}

export function validateEventDomSemanticCompositeEvidence(evidence) {
  assert(evidence?.schema === "media-server.v390-ui-event-dom-semantic-composite-evidence.v1",
    "EVT DOM semantic evidence schema mismatch");
  const fieldMatches = evidence.fixtureObserved?.fieldMatches || {};
  const structuredFieldNames = Object.keys(fieldMatches).sort();
  const supportedStructuredFieldNames = [
    ["reason", "sourceId", "status"],
    ["eventId", "eventType", "status"],
  ];
  const structuredFieldSetSupported = supportedStructuredFieldNames.some(fields =>
    stableEqual(structuredFieldNames, [...fields].sort()));
  const identityBoundaryIntegerFields = [
    "apiIdentityCandidateCount", "apiIdentityMatchedCount",
    "domIdentityCandidateCount", "domIdentityMatchedCount",
  ];
  const identityBoundaryDigestFields = [
    "expectedFixtureIdentityDigest", "apiSelectedOwnerIdentityDigest",
    "domOwnerAttributeIdentityDigest", "expectedFixtureIdentitySourceDigest",
    "apiSelectedOwnerIdentitySourceDigest", "domOwnerAttributeIdentitySourceDigest",
    "apiProjectionKindDigest",
  ];
  const identityBoundaryFields = [
    ...identityBoundaryIntegerFields,
    ...identityBoundaryDigestFields,
  ];
  const identityBoundaryPresentCount = identityBoundaryFields.filter(field =>
    Object.prototype.hasOwnProperty.call(evidence.fixtureObserved || {}, field)).length;
  const identityBoundaryValid = identityBoundaryPresentCount === 0 ||
    (identityBoundaryPresentCount === identityBoundaryFields.length &&
      identityBoundaryIntegerFields.every(field =>
        Number.isInteger(evidence.fixtureObserved?.[field])) &&
      identityBoundaryDigestFields.every(field =>
        /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.[field] || "")));
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
    identityBoundaryValid &&
    Array.isArray(evidence.fixtureObserved?.nodeDigests) &&
    evidence.fixtureObserved.nodeDigests.every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
    Array.isArray(evidence.fixtureObserved?.matchedNodeDigests) &&
    evidence.fixtureObserved.matchedNodeDigests.every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
    Array.isArray(evidence.fixtureObserved?.matchedNodeIndices) &&
    evidence.fixtureObserved.matchedNodeIndices.every(Number.isInteger) &&
    (evidence.fixtureObserved?.bindingMode !== "api-row-to-single-dom-node" ||
      (structuredFieldSetSupported && structuredFieldNames.every(field =>
        typeof fieldMatches[field]?.pass === "boolean" &&
        Number.isInteger(fieldMatches[field].matchingNodeCount) &&
        /^[0-9a-f]{64}$/.test(fieldMatches[field].candidateDigest || "")))) &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.candidateDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.matchedCandidateDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.identityDigest || "") &&
    /^[0-9a-f]{64}$/.test(evidence.fixtureObserved?.expectedNodeTokensDigest || ""),
  "EVT DOM semantic evidence required structured fields are missing");
  if (evidence.declaredDomBinding) {
    const declared = evidence.declaredDomBinding;
    assert(declared.schema === "media-server.v390-ui-declared-dom-binding-evidence.v1" &&
      typeof declared.pass === "boolean" &&
      ["direct-dom", "row-local-response", "row-set-response"].includes(declared.mode) &&
      typeof declared.failureCode === "string" &&
      /^[0-9a-f]{64}$/.test(declared.validatorDigest || "") &&
      /^[0-9a-f]{64}$/.test(declared.assertionDigest || "") &&
      Number.isInteger(declared.observedNodeCount) &&
      Number.isInteger(declared.semanticNodeCount) &&
      Number.isInteger(declared.expectedRowCount) &&
      /^[0-9a-f]{64}$/.test(declared.expectedRowsDigest || "") &&
      Array.isArray(declared.fieldEvidence) &&
      declared.fieldEvidence.every(field =>
        /^[0-9a-f]{64}$/.test(field.nameDigest || "") &&
        typeof field.pass === "boolean" &&
        /^[0-9a-f]{64}$/.test(field.expectedDigest || "") &&
        /^[0-9a-f]{64}$/.test(field.actualDigest || "") &&
        Number.isInteger(field.candidateCount)),
    "EVT declared DOM binding evidence required fields are missing");
  }
  if (evidence.responseDerivedDomProjection) {
    const projection = evidence.responseDerivedDomProjection;
    assert(projection.schema ===
      "media-server.v390-ui-response-derived-dom-field-projection.v1" &&
      typeof projection.pass === "boolean" &&
      typeof projection.failureCode === "string" &&
      Number.isInteger(projection.fieldCount) && projection.fieldCount > 0 &&
      Number.isInteger(projection.matchedFieldCount) &&
      projection.matchedFieldCount >= 0 &&
      projection.matchedFieldCount <= projection.fieldCount &&
      [projection.caseIdDigest, projection.operatorDigest, projection.targetDigest,
        projection.observationDigest].every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
      Array.isArray(projection.fieldEvidence) &&
      projection.fieldEvidence.length === projection.fieldCount &&
      projection.fieldEvidence.every(field =>
        [field.nameDigest, field.responseOwnerDigest, field.projectedValueDigest]
          .every(digest => /^[0-9a-f]{64}$/.test(digest)) &&
        Number.isInteger(field.responseOwnerCount) && field.responseOwnerCount >= 0 &&
        Number.isInteger(field.projectedValueCount) && field.projectedValueCount >= 0 &&
        Number.isInteger(field.matchedValueCount) && field.matchedValueCount >= 0 &&
        typeof field.valuesPass === "boolean" && typeof field.orderPass === "boolean" &&
        typeof field.pass === "boolean"),
    "EVT response-derived DOM projection evidence is incomplete");
  }
  if (evidence.exactAttributeBinding) {
    const attributeBinding = evidence.exactAttributeBinding;
    assert(attributeBinding.schema === "media-server.v390-ui-exact-dom-attribute-binding-evidence.v1" &&
      typeof attributeBinding.pass === "boolean" &&
      typeof attributeBinding.failurePhase === "string" &&
      typeof attributeBinding.failureCode === "string" &&
      /^[0-9a-f]{64}$/.test(attributeBinding.selectorDigest || "") &&
      Number.isInteger(attributeBinding.candidateCount) &&
      Number.isInteger(attributeBinding.candidateEvidenceCount) &&
      typeof attributeBinding.exactNodeSelection === "boolean" &&
      Number.isInteger(attributeBinding.selectedIndex) &&
      Array.isArray(attributeBinding.selectedIndices) &&
      attributeBinding.selectedIndices.every(Number.isInteger) &&
      Number.isInteger(attributeBinding.selectedNodeCount) &&
      /^[0-9a-f]{64}$/.test(attributeBinding.candidateDigest || "") &&
      Array.isArray(attributeBinding.attributes) &&
      attributeBinding.attributes.every(attribute =>
        typeof attribute.name === "string" &&
        typeof attribute.operator === "string" &&
        typeof attribute.pass === "boolean" &&
        /^[0-9a-f]{64}$/.test(attribute.expectedValueDigest || "") &&
        Array.isArray(attribute.observations) &&
        attribute.observations.every(observation =>
          Number.isInteger(observation.index) &&
          typeof observation.observedName === "string" &&
          typeof observation.pass === "boolean" &&
          /^[0-9a-f]{64}$/.test(observation.observedValueDigest || ""))),
    "EVT exact DOM attribute binding evidence required fields are missing");
  }
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
  if (evidence.routeLocalDomBinding) {
    const routeLocal = evidence.routeLocalDomBinding;
    assert(routeLocal.schema === "media-server.v390-ui-route-local-incident-timeline-evidence.v1" &&
      typeof routeLocal.pass === "boolean" &&
      typeof routeLocal.failurePhase === "string" &&
      typeof routeLocal.failureCode === "string" &&
      routeLocal.routeOwner === "/ops/dashboard" &&
      routeLocal.rendererOwner === "renderDashboardIncidentTimeline" &&
      typeof routeLocal.lifecycleObserved === "boolean" &&
      routeLocal.opsEndpointMethod === "GET" &&
      routeLocal.opsEndpointPath === "/ops/api/events/status?limit=5&includeArchives=1" &&
      Number.isInteger(routeLocal.opsResponseStatus) &&
      /^[0-9a-f]{64}$/.test(routeLocal.opsRequestIdentityDigest || "") &&
      Number.isInteger(routeLocal.opsRequestSequence) &&
      Number.isInteger(routeLocal.opsRequestCandidateCount) &&
      Number.isInteger(routeLocal.opsResponseCandidateCount) &&
      Number.isInteger(routeLocal.opsCaseOwnedRequestCandidateCount) &&
      Number.isInteger(routeLocal.opsCaseOwnedResponseCandidateCount) &&
      Number.isInteger(routeLocal.opsCorrelationRequestCandidateCount) &&
      Number.isInteger(routeLocal.opsCorrelationResponseCandidateCount) &&
      typeof routeLocal.opsInitiatorActionId === "string" &&
      typeof routeLocal.opsRenderCycleId === "string" &&
      typeof routeLocal.opsRenderCycleMatched === "boolean" &&
      Number.isInteger(routeLocal.opsRequestStartedAtMs) &&
      Number.isInteger(routeLocal.opsResponseObservedAtMs) &&
      Array.isArray(routeLocal.opsRequestLedger) &&
      routeLocal.opsRequestLedger.every(item =>
        typeof item.ownership === "string" &&
        /^[0-9a-f]{64}$/.test(item.requestIdentityDigest || "") &&
        Number.isInteger(item.requestSequence) &&
        typeof item.initiatorActionId === "string" &&
        typeof item.renderCycleId === "string" &&
        Number.isInteger(item.requestStartedAtMs) &&
        Number.isInteger(item.responseObservedAtMs) &&
        item.method === "GET" &&
        item.path === "/ops/api/events/status?limit=5&includeArchives=1" &&
        typeof item.correlationPresent === "boolean" &&
        (!item.correlationPresent || /^[0-9a-f]{64}$/.test(item.correlationDigest || "")) &&
        ["correlation-absent", "injected-outer", "preserved-explicit-inner"]
          .includes(item.correlationRouteState) &&
        typeof item.correlationRouteActionId === "string" &&
        (!item.correlationPresent ||
          /^[0-9a-f]{64}$/.test(item.correlationRouteDigest || "")) &&
        typeof item.responseRequestObjectObserved === "boolean" &&
        Number.isInteger(item.responseStatus)) &&
      typeof routeLocal.opsResponseRequestObjectObserved === "boolean" &&
      typeof routeLocal.opsRequestResponseIdentityMatched === "boolean" &&
      routeLocal.storageOwner ===
        "EventStorageApplicationService/QueryEventRecordsForApplication" &&
      routeLocal.clientOpsStorageOwnerShared === true &&
      stableEqual(routeLocal.appliedQueryPredicates,
        ["limit=5", "includeArchives=true"]) &&
      Number.isInteger(routeLocal.filterCandidateCounts?.queryResult) &&
      typeof routeLocal.firstExclusionPredicate === "string" &&
      /^[0-9a-f]{64}$/.test(routeLocal.routeDigest || "") &&
      Number.isInteger(routeLocal.containerCount) &&
      Number.isInteger(routeLocal.incidentUnitNodeCount) &&
      Number.isInteger(routeLocal.eventRecordCandidateCount) &&
      Array.isArray(routeLocal.attributeNames) &&
      routeLocal.attributeNames.every(name => /^[a-z][a-z0-9:_-]*$/i.test(name)) &&
      /^[0-9a-f]{64}$/.test(routeLocal.attributeNamesDigest || ""),
    "EVT route-local incident timeline evidence required fields are missing");
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

function resolveRuntimeRequestPath(template, bindings = {}, eventRuntimeContext = null) {
  return materializeEventExactTemplate(String(template || ""), {
    ...bindings,
    ...(eventRuntimeContext?.templateValues || {}),
  }, { context: "request-path" });
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
