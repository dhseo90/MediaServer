// 파일 용도: canonical 424 UI case를 native Playwright 실행 manifest로 생성하고 검증한다.

import crypto from "node:crypto";

import { allowedCompletionSources } from "./v390_ui_completion_oracle_lib.mjs";

export const nativeExactManifestSchema = "media-server.v390-ui-native-exact-cases.v2";
export const canonicalManifestSchema = "media-server.ui-fulltest-canonical-case-manifest.v1";
export const implementationManifestSchema = "media-server.feature-implementation-evidence.v2";
export const caseNativeWorkflowSchema = "media-server.v390-ui-case-native-workflow.v1";

const dynamicSelectorPattern = /\$\{|<%|\{\{/.source;
const productScreenRoutes = new Set([
  "/",
  "/setup",
  "/login",
  "/logout",
  "/password/change",
  "/invite/setup",
  "/client/request-access",
  "/ops",
  "/ops/home",
  "/ops/dashboard",
  "/ops/sources",
  "/ops/rules",
  "/ops/users",
  "/ops/events",
  "/ops/vlm",
  "/client/live",
  "/client/dashboard",
  "/client/events",
]);

const formContracts = new Map([
  ['[data-testid="auth-setup-form"]', { method: "post", action: "/setup", fields: ["username", "password", "confirm"] }],
  ['[data-testid="auth-login-form"]', { method: "post", action: "/login", fields: ["username", "password"] }],
  ['[data-testid="auth-password-change-form"]', { method: "post", action: "/password/change", fields: ["currentPassword", "password", "confirm"] }],
  ['[data-testid="auth-invite-setup-form"]', { method: "post", action: "/invite/setup", fields: ["token", "password", "confirm"] }],
  ["#request-form", { method: "", action: "", fields: ["username", "displayName", "contact", "viewId", "reason"] }],
]);

const fillControls = new Set([
  "#opsIncidentSearchInput",
  "#opsVlmDisabledReason",
  "#opsScenarioBuilderClasses",
  "#dashVaQualityFilterInput",
]);

const checkboxControls = new Set([
  "#opsVlmProfileEnabled",
  "#opsEventRuleLoiteringGroundPlaneToggle",
]);

const disabledControls = new Set(["#opsVlmExternalTransferWarningAck"]);
const hiddenControls = new Set(["#opsEventRuleIdInput", "#opsVaRuleIdInput"]);
const detailsControls = new Set(['[data-testid="ops-context-actions"]']);
const enabledControls = new Set(["#add-channel", "#opsRulesComposerSave"]);
const linkControls = new Set(["#opsRulesReviewEventRecordLink"]);

const selectControls = new Map([
  ["#opsEventRulePresetSelect", "road"],
  ["#opsVaRuleReidSelect", "assist"],
  ["#opsProfileDetectorSelect", "dummy"],
  ["#opsEventRuleModeSelect", "scenario"],
  ["#opsVaRuleTrackerSelect", "kalman-lite"],
  ["#opsEventRuleTriggerDirectionSelect", "forward"],
  ["#opsEventRuleTypeSelect", "re-entry"],
  ["#opsScenarioBuilderType", "re-entry"],
  ["#opsVlmRuleDraftKindSelect", "line-crossing"],
  ["#eventRecordsEvidenceSelect", "snapshot"],
]);

const seededSelectControls = new Set(["#opsVaRuleTemplateSeedSelect"]);

const readModelControls = new Set([
  '[data-testid="client-live-action-reduction"]',
  '[data-testid="client-dashboard-shell"]',
  '[data-testid="client-dashboard-safe-summary"]',
  "#clientDashboardPresetStatus",
  "#dashSiteClientNoticePreviewList",
  "#opsVlmPrivacyGuardList",
  "#opsVlmStatus",
  "#opsVlmRuntimeStatusList",
  "#v320ActionReadinessChecklistGrid",
  "#opsVlmEvaluationRows",
  '[data-testid="ops-incident-rule-suggestion-review"]',
  "#opsIncidentTriageBoardRows",
  "#dashRuntimeOpsList",
  "#opsV320ResolutionTimeline",
  "#v320SourceReliabilityGrid",
  "#v320AiReviewQualityGrid",
  "#v320OperatorResolutionFlowGrid",
  '[data-testid="client-safe-resolution-digest"]',
  "#v320ResolutionSearchMetricsGrid",
  "#v330IncidentSourceCorrelationGrid",
  "#v330OperatorRecheckRecoveryQueueGrid",
  '[data-testid="client-safe-source-status-digest"]',
  '[data-testid="client-safe-maintenance-digest"]',
  "#v350IncidentCommandHandoffGrid",
  '[data-testid="client-impact-forecast"]',
  '[data-testid="client-operations-notice"]',
  "#dashCommandWorkspaceExportBundleMap",
  "#dashCommandWorkspaceVlmAssistedExplanation",
  "#opsIncidentActionReadinessQueueRows",
  '[data-testid="client-action-notice-preview"]',
  "#opsVlmRuleDraftBridgeStatus",
  "#dashActionExecutionDeferralList",
  "#dashFieldEvidenceBridgeList",
  '[data-testid="auth-password-policy"]',
  "#channelScopePolicy",
  "#opsRulesValidationList",
  "#opsVaRuleTrackingSummary",
  "#opsVaRuleGeometryMinimumText",
  "#dashSimulationWorkspaceVlmAssistedExplanationList",
  "#opsEvidenceIntakeFieldReadinessRows",
  "#dashIncidentTimeline",
  "#dashReidAssistDecisionList",
  "#dashRootCauseList",
  '[data-testid="ops-scenario-builder"]',
  "#opsEventRuleSettingsHeading",
  "#opsEventRulePresetSummary",
  "#opsOperatorOutcomeMemoryRows",
  "#dashRuntimeTrendSparkline",
  "#dashRootCauseActionOutput",
  '[data-testid="ops-vlm-event-review-card"]',
  "#eventReviewRows",
  "#dashCommandWorkspaceLedgerList",
  "#opsRulesDetailPanel",
  "#opsApprovalGatedRuleDraftReadinessRows",
  '[data-testid="client-live-dock-event-feed"]',
  '[data-testid="client-live-va-overlay-toggle"]',
  '[data-testid="client-safe-followup-digest"]',
  '[data-testid="client-safe-incident-digest"]',
  '[data-testid="client-safe-event-digest"]',
]);

export function buildNativeExactManifest({ canonical, implementation }) {
  assert(canonical?.schema === canonicalManifestSchema, "unexpected canonical manifest schema");
  assert(implementation?.schema === implementationManifestSchema, "unexpected implementation manifest schema");
  assert(Array.isArray(canonical.cases) && canonical.cases.length === 424, "canonical exact case count must be 424");
  const implementationByManualId = new Map(
    implementation.items
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  assert(implementationByManualId.size === 424, "implementation exact manual UI case count must be 424");

  const cases = canonical.cases.map(canonicalCase => {
    const implementationItem = implementationByManualId.get(canonicalCase.testId);
    assert(implementationItem, `${canonicalCase.testId} implementation item missing`);
    const negativeRoute = canonicalCase.testId === "UI-018";
    const crossRouteNegative = canonicalCase.testId === "SAFE-017";
    const screenRoute = negativeRoute ? canonicalCase.route : normalizeProductScreenRoute(canonicalCase.route);
    const canonicalSelector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector);
    const targetSelector = canonicalSelector || routeRootSelector(screenRoute);
    const sourceKind = implementationItem.semanticEvidence?.stateOracle?.oracleKind || "";
    const expectedBehavior = implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "";
    const expectedBehaviorSha256 = implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "";
    const expectedNetworkUrlIncludes = inferNetworkUrlIncludes(canonicalCase);
    const workflowParts = buildCaseNativeWorkflow({
      canonicalCase,
      implementationItem,
      screenRoute,
      canonicalSelector,
      targetSelector,
      negativeRoute,
      crossRouteNegative,
    });
    const actions = workflowParts.controlSequence.map(action => ({
      ...action,
      ...(action.kind === "wait-visible" ? {} : {
        semanticCompletion: buildActionSemanticCompletion({
          caseId: canonicalCase.testId,
          screenRoute,
          action,
          negativeRoute,
        }),
      }),
    }));
    const hasInteraction = actions.some(action => [
      "toggle-details",
      "fill-control",
      "toggle-checkbox",
      "select-control",
    ].includes(action.kind));
    const hasCrossRouteNegative = actions.some(action => action.kind === "navigate-negative");
    const completionSources = negativeRoute
      ? ["negative-route-status"]
      : (hasCrossRouteNegative
          ? ["endpoint-dom", "negative-route-status"]
          : (hasInteraction
              ? ["endpoint-dom", "persisted-readback", "event-record", "server-log"]
              : ["endpoint-dom"]));
    return {
      caseId: canonicalCase.testId,
      featureId: canonicalCase.featureId,
      disposition: negativeRoute ? "negative-route" : "native-executable",
      dispatch: "playwright-native",
      canonicalRoute: canonicalCase.route,
      screenRoute,
      accountRole: canonicalCase.accountRole,
      viewport: structuredClone(canonicalCase.viewport),
      theme: canonicalCase.theme,
      controlAction: {
        selector: canonicalSelector,
        selectorSource: canonicalSelector ? "canonical-control" : "semantic-read-model",
        actionAnchor: canonicalCase.controlAction?.actionAnchor || "",
        targetSelector,
      },
      actions,
      workflow: {
        schema: caseNativeWorkflowSchema,
        workflowId: `${canonicalCase.testId}:native-workflow`,
        setup: workflowParts.setup,
        inputs: workflowParts.inputs,
        controlSequence: actions,
        expectedResults: [{
          resultId: `${canonicalCase.testId}:semantic-result`,
          kind: negativeRoute || crossRouteNegative ? "negative-route-status" : "reviewed-semantic-result",
          expectedBehavior,
          expectedBehaviorSha256,
          endpointHints: expectedNetworkUrlIncludes,
          stateLocator: compactLocator(implementationItem.semanticEvidence?.stateOracle?.locator),
          readbackLocator: compactLocator(implementationItem.semanticEvidence?.callChain?.roles?.readback),
          completion: primarySemanticCompletion(actions),
        }],
        cleanup: workflowParts.cleanup,
      },
      oracle: {
        kind: negativeRoute
          ? "negative-route-status"
          : (hasCrossRouteNegative
              ? "semantic-cross-route-negative-status"
              : "semantic-endpoint-readback"),
        sourceKind,
        expectedBehavior,
        expectedBehaviorSha256,
        allowedStatuses: negativeRoute ? [404] : [200],
        completionRequired: true,
        allowedCompletionSources: completionSources,
      },
      artifacts: {
        screenshot: true,
        trace: true,
        browserConsole: true,
        serverLog: true,
      },
    };
  });

  return {
    schema: nativeExactManifestSchema,
    sourceBindings: {
      canonicalSchema: canonical.schema,
      canonicalSha256: sha256Json(canonical),
      implementationSchema: implementation.schema,
      implementationSha256: sha256Json(implementation),
      selection: "canonical-exact-ordered-test-id",
    },
    counts: {
      exactCases: cases.length,
      positiveNative: cases.filter(item => item.disposition === "native-executable").length,
      negativeRoute: cases.filter(item => item.disposition === "negative-route").length,
      unsupported: 0,
    },
    evidenceBoundary: "execution manifest and contract are not actual 424-case UI fulltest or Step 26 eligibility evidence",
    cases,
  };
}

export function validateNativeExactManifest({ manifest, canonical, implementation }) {
  assert(manifest?.schema === nativeExactManifestSchema, "unexpected exact native manifest schema");
  const expected = buildNativeExactManifest({ canonical, implementation });
  assert(manifest.sourceBindings?.canonicalSha256 === expected.sourceBindings.canonicalSha256,
    "canonical source binding drift");
  assert(manifest.sourceBindings?.implementationSha256 === expected.sourceBindings.implementationSha256,
    "implementation source binding drift");
  assert(Array.isArray(manifest.cases) && manifest.cases.length === 424, "canonical exact case count must be 424");
  assertExact(manifest.cases.map(item => item.caseId), canonical.cases.map(item => item.testId),
    "canonical ordered case IDs");
  assertUnique(manifest.cases.map(item => item.caseId), "native exact case IDs");
  assertUnique(manifest.cases.map(item => item.workflow?.workflowId), "native exact workflow IDs");

  for (let index = 0; index < manifest.cases.length; index += 1) {
    const item = manifest.cases[index];
    const expectedItem = expected.cases[index];
    assert(item.featureId === expectedItem.featureId, `${item.caseId} featureId drift`);
    assert(item.accountRole === expectedItem.accountRole, `${item.caseId} accountRole drift`);
    assert(JSON.stringify(item.viewport) === JSON.stringify(expectedItem.viewport), `${item.caseId} viewport drift`);
    assert(item.theme === expectedItem.theme, `${item.caseId} theme drift`);
    assert(item.canonicalRoute === expectedItem.canonicalRoute, `${item.caseId} canonical route drift`);
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} raw API screen route is forbidden`);
    assert(item.screenRoute === expectedItem.screenRoute, `${item.caseId} product screen route drift`);
    assert(item.disposition !== "unsupported", `${item.caseId} unsupported disposition is forbidden`);
    assert(item.disposition === expectedItem.disposition, `${item.caseId} disposition drift`);
    assert(item.dispatch === "playwright-native", `${item.caseId} native dispatch missing`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} native actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} native action dispatch drift`);
    assert(item.actions.filter(action => action.kind !== "wait-visible").every(action =>
      action.semanticCompletion?.schema === "media-server.v390-ui-semantic-completion.v1"),
    `${item.caseId} semantic action completion missing`);
    assert(JSON.stringify(item.actions) === JSON.stringify(expectedItem.actions), `${item.caseId} action plan drift`);
    assert(item.workflow?.schema === caseNativeWorkflowSchema, `${item.caseId} workflow schema drift`);
    assert(item.workflow.workflowId === `${item.caseId}:native-workflow`, `${item.caseId} workflow ID drift`);
    for (const field of ["setup", "inputs", "controlSequence", "expectedResults", "cleanup"]) {
      assert(Array.isArray(item.workflow[field]) && item.workflow[field].length > 0, `${item.caseId} workflow ${field} missing`);
    }
    assert(JSON.stringify(item.actions) === JSON.stringify(item.workflow.controlSequence), `${item.caseId} action/workflow drift`);
    assert(!JSON.stringify(item.workflow).includes("runtime-control"), `${item.caseId} runtime-control is forbidden`);
    assert(!item.workflow.controlSequence.some(action => action.kind === "interact"), `${item.caseId} generic interact is forbidden`);
    if (hiddenControls.has(item.controlAction.selector)) {
      assert(item.workflow.controlSequence.some(action => action.kind === "assert-hidden-control"),
        `${item.caseId} hidden control assertion missing`);
    }
    assert(item.oracle?.sourceKind === expectedItem.oracle.sourceKind, `${item.caseId} oracle source kind drift`);
    assert(item.oracle?.expectedBehaviorSha256 === expectedItem.oracle.expectedBehaviorSha256,
      `${item.caseId} oracle digest drift`);
    assert(/^[a-f0-9]{64}$/.test(item.oracle.expectedBehaviorSha256), `${item.caseId} oracle digest invalid`);
    assert(JSON.stringify(item.oracle) === JSON.stringify(expectedItem.oracle), `${item.caseId} oracle contract drift`);
    assert(item.oracle.completionRequired === true, `${item.caseId} completionRequired must be true`);
    assert(item.oracle.allowedCompletionSources.every(source => allowedCompletionSources.includes(source)),
      `${item.caseId} unknown completion source`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source is forbidden`);
    assert(item.workflow.expectedResults[0]?.completion?.schema === "media-server.v390-ui-semantic-completion.v1",
      `${item.caseId} expected semantic completion missing`);
    assert(JSON.stringify(item.artifacts) === JSON.stringify(expectedItem.artifacts), `${item.caseId} artifact plan drift`);
  }

  const negative = manifest.cases.find(item => item.caseId === "UI-018");
  assert(negative?.disposition === "negative-route", "UI-018 negative route disposition missing");
  assert(negative.oracle?.kind === "negative-route-status", "UI-018 negative status oracle missing");
  assert(JSON.stringify(manifest) === JSON.stringify(expected), "generated exact native manifest drift");
  return {
    caseCount: manifest.cases.length,
    positiveNative: manifest.cases.filter(item => item.disposition === "native-executable").length,
    negativeRoute: manifest.cases.filter(item => item.disposition === "negative-route").length,
    unsupported: manifest.cases.filter(item => item.disposition === "unsupported").length,
  };
}

export function normalizeProductScreenRoute(route) {
  if (route === "/ops/api/events/reviews") return "/ops/events";
  if (route === "/client/api/views/{id}/events") return "/client/events";
  if (route === "/ops/api/audit") return "/ops/users";
  if (route.startsWith("/ops/api/source-registry/") || route.startsWith("/ops/api/onvif/")) {
    return "/ops/sources";
  }
  if (route === "/lab") return "/ops";
  assert(productScreenRoutes.has(route), `no product screen route mapping for ${route}`);
  return route;
}

function buildCaseNativeWorkflow({
  canonicalCase,
  implementationItem,
  screenRoute,
  canonicalSelector,
  targetSelector,
  negativeRoute,
  crossRouteNegative,
}) {
  const caseId = canonicalCase.testId;
  const semanticDigest = implementationItem.semanticEvidence?.callChain?.digest || "";
  const setup = [
    {
      kind: "bind-role-session",
      setupId: `${caseId}:role-session`,
      accountRole: canonicalCase.accountRole,
      required: canonicalCase.accountRole !== "anonymous",
    },
    {
      kind: "seed-reviewed-state",
      setupId: `${caseId}:reviewed-state`,
      strategy: negativeRoute ? "negative-route" : (canonicalSelector ? "existing-product-control" : "existing-read-model"),
      route: screenRoute,
      semanticCallChainSha256: semanticDigest,
      persistedMutation: false,
    },
  ];
  const inputs = [{
    inputId: `${caseId}:semantic-expectation`,
    kind: "reviewed-semantic-expectation",
    valueSha256: implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "",
    sensitive: false,
  }];
  const controlSequence = [nativeAction("navigate", {
    actionId: `${caseId}:navigate`,
    route: screenRoute,
    expectedCanonicalRoute: canonicalCase.route,
  })];
  const cleanup = [{
    kind: "assert-no-persisted-mutation",
    cleanupId: `${caseId}:no-persisted-mutation`,
    semanticCallChainSha256: semanticDigest,
  }];

  if (!negativeRoute) {
    if (hiddenControls.has(canonicalSelector)) {
      controlSequence.push(nativeAction("assert-hidden-control", {
        actionId: `${caseId}:assert-hidden-control`,
        selector: canonicalSelector,
        expectedExists: true,
      }));
    } else {
      controlSequence.push(nativeAction("wait-visible", {
        actionId: `${caseId}:wait-visible`,
        selector: targetSelector,
        selectorSource: canonicalSelector ? "canonical-control" : "semantic-read-model",
      }));
      appendExactControlAction({ caseId, selector: canonicalSelector, targetSelector, inputs, controlSequence, cleanup });
    }
    if (crossRouteNegative) {
      controlSequence.push(nativeAction("navigate-negative", {
        actionId: `${caseId}:navigate-negative`,
        route: canonicalCase.route,
        allowedStatuses: [404],
      }));
      cleanup.push({
        kind: "restore-route",
        cleanupId: `${caseId}:restore-route`,
        route: screenRoute,
      });
    }
  }

  return { setup, inputs, controlSequence, cleanup };
}

function appendExactControlAction({ caseId, selector, targetSelector, inputs, controlSequence, cleanup }) {
  if (!selector) {
    controlSequence.push(nativeAction("assert-route-read-model", {
      actionId: `${caseId}:assert-route-read-model`,
      selector: targetSelector,
    }));
    return;
  }
  if (formContracts.has(selector)) {
    const contract = formContracts.get(selector);
    inputs.push({
      inputId: `${caseId}:form-contract`,
      kind: "form-field-contract",
      fields: [...contract.fields],
      submit: false,
      reason: "credential or persistent form submission requires a dedicated reversible seed",
    });
    controlSequence.push(nativeAction("assert-form-contract", {
      actionId: `${caseId}:assert-form-contract`,
      selector,
      method: contract.method,
      action: contract.action,
      fields: [...contract.fields],
    }));
    return;
  }
  if (detailsControls.has(selector)) {
    controlSequence.push(nativeAction("toggle-details", {
      actionId: `${caseId}:toggle-details`,
      selector,
    }));
    cleanup.push({ kind: "restore-details-open", cleanupId: `${caseId}:restore-details`, selector });
    return;
  }
  if (fillControls.has(selector)) {
    const value = `${caseId.toLowerCase()}-exact`;
    inputs.push({ inputId: `${caseId}:control-value`, kind: "literal-control-value", value, sensitive: false });
    controlSequence.push(nativeAction("fill-control", {
      actionId: `${caseId}:fill-control`,
      selector,
      value,
    }));
    cleanup.push({ kind: "restore-control-value", cleanupId: `${caseId}:restore-value`, selector });
    return;
  }
  if (checkboxControls.has(selector)) {
    inputs.push({ inputId: `${caseId}:checked-value`, kind: "initial-state-inversion", value: "logical-not-initial", sensitive: false });
    controlSequence.push(nativeAction("toggle-checkbox", {
      actionId: `${caseId}:toggle-checkbox`,
      selector,
      checkedFrom: "logical-not-initial",
    }));
    cleanup.push({ kind: "restore-control-checked", cleanupId: `${caseId}:restore-checked`, selector });
    return;
  }
  if (disabledControls.has(selector)) {
    controlSequence.push(nativeAction("assert-disabled-control", {
      actionId: `${caseId}:assert-disabled-control`,
      selector,
    }));
    return;
  }
  if (selectControls.has(selector)) {
    const value = selectControls.get(selector);
    inputs.push({ inputId: `${caseId}:select-value`, kind: "literal-select-value", value, sensitive: false });
    controlSequence.push(nativeAction("select-control", {
      actionId: `${caseId}:select-control`,
      selector,
      value,
    }));
    cleanup.push({ kind: "restore-control-value", cleanupId: `${caseId}:restore-value`, selector });
    return;
  }
  if (seededSelectControls.has(selector)) {
    inputs.push({
      inputId: `${caseId}:seeded-option`,
      kind: "server-seeded-option",
      minimumNonEmptyOptions: 1,
      sensitive: false,
    });
    controlSequence.push(nativeAction("assert-seeded-select", {
      actionId: `${caseId}:assert-seeded-select`,
      selector,
      minimumNonEmptyOptions: 1,
    }));
    return;
  }
  if (enabledControls.has(selector)) {
    controlSequence.push(nativeAction("assert-enabled-control", {
      actionId: `${caseId}:assert-enabled-control`,
      selector,
      reason: "persistent create/save requires an independently reversible server seed",
    }));
    return;
  }
  if (linkControls.has(selector)) {
    controlSequence.push(nativeAction("assert-link-target", {
      actionId: `${caseId}:assert-link-target`,
      selector,
      requireSameOriginPath: true,
    }));
    return;
  }
  if (readModelControls.has(selector)) {
    controlSequence.push(nativeAction("assert-visible-read-model", {
      actionId: `${caseId}:assert-visible-read-model`,
      selector,
    }));
    return;
  }
  throw new Error(`${caseId} canonical selector has no exact native workflow classification: ${selector}`);
}

function buildActionSemanticCompletion({ caseId, screenRoute, action, negativeRoute = false }) {
  const negative = action.kind === "navigate-negative" || (action.kind === "navigate" && negativeRoute);
  const navigation = action.kind === "navigate";
  const correlationId = navigation
    ? `${caseId}:navigation`
    : (negative ? `${caseId}:negative-navigation` : `${action.actionId}:completion`);
  const endpointCorrelationId = negative ? correlationId : `${caseId}:navigation`;
  return {
    schema: "media-server.v390-ui-semantic-completion.v1",
    required: true,
    requiredSource: negative ? "negative-route-status" : "endpoint-dom",
    correlationId,
    request: {
      correlationHeader: "x-media-server-correlation-id",
      correlationId: endpointCorrelationId,
      correlationSource: "request-header",
      method: "GET",
      urlPath: negative ? action.route : screenRoute,
      allowedStatuses: negative ? [...(action.allowedStatuses || [404])] : [200],
    },
    readbackIdentity: navigation ? `${caseId}:navigation` : `${caseId}:semantic-result`,
    readbackExpectation: semanticReadbackExpectation(action),
    attestedAlternatives: negative ? [] : ["persisted-readback", "event-record", "server-log"],
  };
}

function semanticReadbackExpectation(action) {
  if (action.kind === "navigate") return { exists: true, visible: true };
  if (action.kind === "navigate-negative") return { navigationStatus: action.allowedStatuses[0] };
  if (["assert-route-read-model", "assert-visible-read-model"].includes(action.kind)) {
    return { exists: true, visible: true };
  }
  if (action.kind === "assert-hidden-control") return { exists: true, visible: false };
  if (action.kind === "assert-disabled-control") return { exists: true, disabled: true };
  if (action.kind === "assert-enabled-control") return { exists: true, visible: true, disabled: false };
  if (action.kind === "assert-link-target") return { tag: "a", hrefKind: "same-origin-path" };
  if (action.kind === "assert-seeded-select") {
    return { tag: "select", minimumNonEmptyOptions: action.minimumNonEmptyOptions };
  }
  if (action.kind === "assert-form-contract") {
    return { method: action.method, action: action.action, fields: [...action.fields] };
  }
  if (action.kind === "toggle-details") return { changedProperty: "open", changed: true };
  if (action.kind === "fill-control") return { property: "value", value: action.value };
  if (action.kind === "toggle-checkbox") return { changedProperty: "checked", changed: true };
  if (action.kind === "select-control") return { property: "selectedValues", value: [action.value] };
  throw new Error(`semantic completion expectation missing for ${action.kind}`);
}

function primarySemanticCompletion(actions) {
  const primary = actions.find(action =>
    !["navigate", "wait-visible", "navigate-negative"].includes(action.kind),
  ) || actions.find(action => action.kind === "navigate-negative") || actions[0];
  return structuredClone(primary.semanticCompletion);
}

function compactLocator(value) {
  if (!value || typeof value !== "object") return null;
  return {
    file: value.file || "",
    symbol: value.symbol || "",
    contextSha256: value.contextSha256 || "",
  };
}

function routeRootSelector(route) {
  if (route.startsWith("/ops")) return "body.ops-shell";
  if (route.startsWith("/client") && route !== "/client/request-access") return "body.client-shell";
  if (["/setup", "/login", "/logout", "/password/change", "/invite/setup"].includes(route)) return "body.auth-shell";
  if (route === "/client/request-access") return "body.product-shell";
  return "body";
}

function normalizeCanonicalSelector(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value === '[data-testid="${escapeHtml(testId)}"]') {
    return '[data-testid="client-dashboard-safe-summary"]';
  }
  if (new RegExp(dynamicSelectorPattern).test(value)) return null;
  return value;
}

function inferNetworkUrlIncludes(canonicalCase) {
  const candidates = [canonicalCase.route, canonicalCase.controlAction?.actionAnchor]
    .filter(value => typeof value === "string" && value.includes("/api/"))
    .map(value => value.includes("{") ? value.slice(0, value.indexOf("{")) : value);
  return [...new Set(candidates)];
}

function nativeAction(kind, fields) {
  return { kind, dispatch: "playwright-native", ...fields };
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertExact(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} mismatch`);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} contain duplicates`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
