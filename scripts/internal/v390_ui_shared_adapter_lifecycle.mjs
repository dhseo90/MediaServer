// 파일 용도: canonical UI case의 shared Playwright adapter 영향 범위와 action 전/후 route lifecycle을 결정한다.

import { createHash } from "node:crypto";

const documentFormSubmitContracts = new Map([
  ["UI-002", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["UI-003", { path: "/login", statuses: [302], redirectPath: "/client/live" }],
  ["UI-004", { path: "/password/change", statuses: [302], redirectPath: "/login" }],
  ["UI-005", { path: "/logout", statuses: [302], redirectPath: "/login" }],
  ["UI-007", { path: "/invite/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-004", { path: "/login", statuses: [302], redirectPath: "/client/live" }],
  ["AUTH-005", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-006", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-007", { path: "/login", statuses: [403], redirectPath: "" }],
  ["AUTH-034", { path: "/invite/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-035", { path: "/invite/setup", statuses: [401], redirectPath: "" }],
]);

const destinationControls = new Map([
  ["/login", '[data-testid="auth-login-form"]'],
  ["/client/live", '[data-testid="client-live-workspace"]'],
]);

export const sharedAdapterChangeBindings = Object.freeze([
  Object.freeze({
    function: "revealClosedDetailsForSelector",
    callers: Object.freeze([
      "v390_ui_native_adapter.mjs::openNativePlaywrightPage.waitForSelector",
      "v390_ui_native_adapter.mjs::openNativePlaywrightPage.click",
    ]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.waitForSelector",
    callers: Object.freeze([
      "run_v390_ui_native_exact_cases.mjs",
      "v390_ui_exact_oracle_runtime.mjs",
      "v390_ui_case_runtime.mjs",
      "v390_ui_shared_adapter_lifecycle.mjs",
      "verify_v390_ui_automation.mjs",
    ]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.clickWithRequestOwnership",
    callers: Object.freeze(["v390_ui_exact_oracle_runtime.mjs"]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.click",
    callers: Object.freeze([
      "run_v390_ui_native_exact_cases.mjs",
      "v390_ui_exact_oracle_runtime.mjs",
      "v390_ui_shared_adapter_lifecycle.mjs",
      "verify_v390_ui_automation.mjs",
    ]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.snapshot",
    callers: Object.freeze([
      "run_v390_ui_native_exact_cases.mjs",
      "v390_ui_exact_oracle_runtime.mjs",
    ]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.measureVisualState",
    callers: Object.freeze(["run_v390_ui_native_exact_cases.mjs"]),
  }),
  Object.freeze({
    function: "openNativePlaywrightPage.observeRequestedObservedState",
    callers: Object.freeze(["run_v390_ui_native_exact_cases.mjs"]),
  }),
]);

export function documentFormSubmitContract(caseId) {
  const contract = documentFormSubmitContracts.get(String(caseId || ""));
  return contract ? structuredClone(contract) : null;
}

export function buildPostActionLifecyclePlan(item, formResponseIdentity = null) {
  assert(item?.caseId && item?.workflow && Array.isArray(item?.actions),
    "post-action lifecycle requires one canonical native case");
  const sourceRoute = routePath(item.controlAction?.actionRoute || item.screenRoute);
  const sourceSelector = String(item.controlAction?.targetSelector || "body");
  const primaryActions = item.actions.filter(action =>
    action?.semanticCompletion?.phase === "primary-action" &&
    action.actionId === item.oracle?.primaryActionId);
  assert(primaryActions.length === 1,
    `${item.caseId} post-action lifecycle requires exact-one primary completion`);
  const primaryAction = primaryActions[0];
  const completionMode = String(primaryAction.semanticCompletion?.completionMode || "");
  assert(["request", "local", "navigation"].includes(completionMode),
    `${item.caseId} post-action lifecycle completion mode missing`);
  const documentContract = documentFormSubmitContracts.get(item.caseId) || null;
  const redirectPath = routePath(documentContract?.redirectPath || "");
  const localDestination = localTransitionDestination(primaryAction.semanticCompletion?.localTransition);
  const navigationDestination = completionMode === "navigation"
    ? routePath(primaryAction.semanticCompletion?.navigationBinding?.expectedObservedPath || item.screenRoute)
    : "";
  const destinationRoute = redirectPath || localDestination.route || navigationDestination || sourceRoute;
  const routeChanged = destinationRoute !== sourceRoute;
  const destinationSelector = redirectPath
    ? String(destinationControls.get(destinationRoute) || "")
    : localDestination.selector || (completionMode === "navigation" ? "body" : sourceSelector);
  const transitionKind = redirectPath
    ? "document-form-redirect"
    : localDestination.route
      ? "local-route-transition"
      : completionMode === "navigation"
        ? "navigation-completion"
        : completionMode === "local"
          ? "local-transition"
          : "request-completion";
  assert(sourceRoute.startsWith("/"), `${item.caseId} source route missing`);
  assert(sourceSelector, `${item.caseId} source selector missing`);
  assert(destinationRoute.startsWith("/"), `${item.caseId} destination route missing`);
  assert(destinationSelector, `${item.caseId} destination control contract missing: ${destinationRoute}`);
  assert(!routeChanged || completionMode === "navigation" ||
    destinationSelector !== sourceSelector,
  `${item.caseId} route destination reuses the stale source selector`);
  if (formResponseIdentity !== null && documentContract) {
    validateDocumentFormResponseIdentity(item.caseId, documentContract, formResponseIdentity);
  }
  const sourceControlApplicable = sourceSelector !== "body";
  return {
    schema: "media-server.v390-ui-post-action-lifecycle-plan.v1",
    caseId: item.caseId,
    workflowClass: String(item.workflow.workflowClass || ""),
    preAction: {
      route: sourceRoute,
      selector: sourceSelector,
      phase: "source-control-validation",
    },
    action: {
      sequence: item.actions.map(action => ({
        actionId: String(action.actionId || ""),
        kind: String(action.kind || ""),
        route: routePath(action.route || ""),
        selector: String(action.submitSelector || action.selector || ""),
      })),
      documentRequest: documentContract ? {
        method: "POST",
        path: documentContract.path,
        statuses: [...documentContract.statuses],
        redirectPath: redirectPath || null,
      } : null,
      primaryCompletion: {
        actionId: String(primaryAction.actionId || ""),
        kind: String(primaryAction.kind || ""),
        mode: completionMode,
        requiredSource: String(primaryAction.semanticCompletion?.requiredSource || ""),
        correlationId: String(primaryAction.semanticCompletion?.correlationId || ""),
        navigationBinding: primaryAction.semanticCompletion?.navigationBinding
          ? structuredClone(primaryAction.semanticCompletion.navigationBinding)
          : null,
        localTransition: primaryAction.semanticCompletion?.localTransition
          ? structuredClone(primaryAction.semanticCompletion.localTransition)
          : null,
      },
      phase: "action-request-response-binding",
    },
    postNavigation: {
      route: destinationRoute,
      selector: destinationSelector,
      requiredState: "visible",
      routeChanged,
      transitionKind,
      sourceSelectorRewaitAllowed: false,
      sourceControlApplicable,
      ownerPolicy: routeChanged
        ? "declared-visible-destination"
        : completionMode === "navigation" || !sourceControlApplicable
          ? "visible-document-owner"
          : "visible-source-else-document-owner",
      navigationEpochRelation: routeChanged || completionMode === "navigation"
        ? "advanced"
        : "same-document",
      phase: "destination-route-control-readback",
    },
  };
}

export function evaluatePostActionLifecycle(plan, {
  observedRoute = "",
  destinationObservation = null,
  sourceObservation = null,
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-post-action-lifecycle-plan.v1",
    "post-action lifecycle plan schema mismatch");
  const normalizedObservedRoute = routePath(observedRoute);
  let failureCode = "";
  if (normalizedObservedRoute !== plan.postNavigation.route) {
    failureCode = "WRONG_DESTINATION_ROUTE";
  } else if (!destinationObservation?.exists) {
    failureCode = "DESTINATION_CONTROL_MISSING";
  } else if (plan.postNavigation.requiredState === "visible" && destinationObservation.visible !== true) {
    failureCode = "DESTINATION_CONTROL_NOT_VISIBLE";
  } else if (plan.postNavigation.routeChanged &&
      plan.postNavigation.selector === plan.preAction.selector) {
    failureCode = "STALE_SOURCE_SELECTOR_REUSED";
  }
  return {
    schema: "media-server.v390-ui-post-action-lifecycle-evidence.v1",
    caseId: plan.caseId,
    pass: !failureCode,
    failureCode,
    preAction: structuredClone(plan.preAction),
    action: structuredClone(plan.action),
    postNavigation: {
      ...structuredClone(plan.postNavigation),
      observedRoute: normalizedObservedRoute,
      destinationExists: destinationObservation?.exists === true,
      destinationVisible: destinationObservation?.visible === true,
    },
    sourceDetached: sourceObservation?.exists === false,
    sourceSelectorRewaited: false,
  };
}

export function postActionDestinationLifecycleRequired(plan) {
  assert(plan?.schema === "media-server.v390-ui-post-action-lifecycle-plan.v1",
    "post-action lifecycle plan schema mismatch");
  return plan.postNavigation.routeChanged === true &&
    plan.action?.documentRequest?.redirectPath === plan.postNavigation.route;
}

export function bindRuntimeControlObservationOwner({
  identitySelector = null,
  executionOwnerSelector = null,
  ownerObservation = null,
} = {}) {
  const identity = identitySelector === null ? null : String(identitySelector);
  const owner = executionOwnerSelector === null ? identity : String(executionOwnerSelector);
  assert(identity === null || identity.length > 0,
    "runtime control observation identity selector is invalid");
  assert(identity === null || owner.length > 0,
    "runtime control observation owner selector is missing");
  const applicability = identity === null ? "not-applicable" : "required";
  const exists = applicability === "required" && ownerObservation?.exists === true;
  const visible = exists && ownerObservation?.visible === true;
  return {
    selector: identity,
    applicability,
    exists,
    visible,
    enabled: visible && ownerObservation?.disabled !== true,
  };
}

export async function observePostActionLifecycle(browser, plan, {
  sourceObservation = null,
} = {}) {
  assert(browser?.waitForSelector && browser?.snapshot && browser?.evaluate,
    "post-action lifecycle requires the native browser adapter");
  assert(postActionDestinationLifecycleRequired(plan),
    `${plan.caseId} destination lifecycle requires an observed redirect contract`);
  let waitFailure = null;
  try {
    await browser.waitForSelector(plan.postNavigation.selector, {
      state: plan.postNavigation.requiredState,
    });
  } catch (error) {
    waitFailure = error;
  }
  const observedRoute = await browser.evaluate("window.location.pathname");
  const destinationObservation = await browser.snapshot(plan.postNavigation.selector);
  const evidence = evaluatePostActionLifecycle(plan, {
    observedRoute,
    destinationObservation,
    sourceObservation,
  });
  if (waitFailure) {
    waitFailure.postActionLifecycleEvidence = structuredClone(evidence);
    throw waitFailure;
  }
  if (!evidence.pass) {
    const error = new Error(
      `${plan.caseId} post-action lifecycle failed: ${evidence.failureCode}`,
    );
    error.postActionLifecycleEvidence = structuredClone(evidence);
    throw error;
  }
  return {
    destinationObservation,
    evidence,
  };
}

export function resolvePostActionVisualTarget(plan, {
  visualContext = null,
  executionOwnerSelector = null,
  sourceBeforeObservation = null,
  sourceObservation = null,
  destinationObservation = null,
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-post-action-lifecycle-plan.v1",
    "post-action visual target plan schema mismatch");
  const sourceSelector = String(plan.preAction?.selector || "");
  assert(sourceSelector, `${plan.caseId} post-action visual source selector missing`);
  const sourceOwnerSelector = String(executionOwnerSelector || sourceSelector);
  assert(sourceOwnerSelector,
    `${plan.caseId} post-action visual execution owner selector missing`);
  assert(visualContext?.schema === "media-server.v390-ui-post-action-visual-context.v1",
    `${plan.caseId} post-action visual context missing`);
  const observedRoute = routePath(visualContext.route);
  const navigationEpoch = Number(visualContext.navigationEpoch);
  assert(Number.isInteger(navigationEpoch) && navigationEpoch > 0,
    `${plan.caseId} post-action visual navigation epoch missing`);
  assert(observedRoute === plan.postNavigation.route,
    `${plan.caseId} post-action visual route mismatch`);
  validateOwnerObservation(plan.caseId, visualContext.documentOwner, {
    selector: "body",
    navigationEpoch,
    requireVisible: true,
    label: "document owner",
  });
  const completionMode = String(plan.action?.primaryCompletion?.mode || "");
  const base = {
    schema: "media-server.v390-ui-post-action-visual-target.v1",
    caseId: plan.caseId,
    actionId: String(plan.action?.primaryCompletion?.actionId || ""),
    completionMode,
    sourceSelectorSha256: createHash("sha256").update(sourceSelector).digest("hex"),
    sourceOwnerSelectorSha256: createHash("sha256").update(sourceOwnerSelector).digest("hex"),
    requestedState: "visible",
    observedRoute,
    navigationEpoch,
    ownerCandidateCount: 1,
    sourceSelectorRewaited: false,
  };
  if (plan.postNavigation.routeChanged) {
    assert(sourceBeforeObservation,
      `${plan.caseId} route transition source-before observation missing`);
    validateOwnerObservation(plan.caseId, sourceBeforeObservation, {
      selector: sourceOwnerSelector,
      requireVisible: sourceOwnerSelector !== "body",
      label: "source-before owner",
    });
    assert(Number(sourceBeforeObservation.navigationEpoch) < navigationEpoch,
      `${plan.caseId} route transition navigation epoch did not advance`);
    validateOwnerObservation(plan.caseId, destinationObservation, {
      selector: plan.postNavigation.selector,
      navigationEpoch,
      requireVisible: true,
      label: "destination owner",
    });
    return {
      ...base,
      selector: plan.postNavigation.selector,
      bindingKind: "post-action-visible-destination-owner",
      sourceDetached: sourceObservation?.exists === false,
      sourceHidden: sourceObservation?.exists === true && sourceObservation.visible !== true,
      epochRelation: "advanced",
    };
  }
  if (completionMode === "navigation") {
    assert(sourceBeforeObservation,
      `${plan.caseId} navigation source-before observation missing`);
    validateOwnerObservation(plan.caseId, sourceBeforeObservation, {
      selector: sourceOwnerSelector,
      requireVisible: sourceOwnerSelector !== "body",
      label: "navigation source-before owner",
    });
    assert(Number(sourceBeforeObservation.navigationEpoch) < navigationEpoch,
      `${plan.caseId} navigation completion epoch did not advance`);
    if (sourceObservation) {
      validateOwnerObservation(plan.caseId, sourceObservation, {
        selector: sourceOwnerSelector,
        navigationEpoch,
        requireVisible: false,
        label: "navigation source observation",
      });
    }
    return {
      ...base,
      selector: "body",
      bindingKind: "post-action-visible-document-owner",
      sourceDetached: sourceObservation?.exists === false,
      sourceHidden: sourceObservation?.exists === true && sourceObservation.visible !== true,
      epochRelation: "advanced",
    };
  }
  if (sourceSelector === "body") {
    if (sourceObservation) {
      validateOwnerObservation(plan.caseId, sourceObservation, {
        selector: sourceOwnerSelector,
        navigationEpoch,
        requireVisible: false,
        label: "document source observation",
      });
    }
    return {
      ...base,
      selector: "body",
      bindingKind: "post-action-visible-document-owner",
      sourceDetached: sourceObservation?.exists === false,
      sourceHidden: sourceObservation?.exists === true && sourceObservation.visible !== true,
      epochRelation: "same-document",
    };
  }
  assert(sourceBeforeObservation && sourceObservation,
    `${plan.caseId} source lifecycle observations missing`);
  validateOwnerObservation(plan.caseId, sourceBeforeObservation, {
    selector: sourceOwnerSelector,
    navigationEpoch,
    requireVisible: true,
    label: "source-before owner",
  });
  validateOwnerObservation(plan.caseId, sourceObservation, {
    selector: sourceOwnerSelector,
    navigationEpoch,
    requireVisible: false,
    label: "source-after owner",
  });
  if (sourceObservation.exists && sourceObservation.visible === true) {
    return {
      ...base,
      selector: sourceOwnerSelector,
      bindingKind: "post-action-visible-source-owner",
      sourceDetached: false,
      sourceHidden: false,
      epochRelation: "same-document",
    };
  }
  return {
    ...base,
    selector: "body",
    bindingKind: "post-action-visible-document-owner",
    sourceDetached: sourceObservation.exists === false,
    sourceHidden: sourceObservation.exists === true,
    epochRelation: "same-document",
  };
}

export function buildCanonicalSharedAdapterImpact(nativeManifest) {
  assert(nativeManifest?.schema && Array.isArray(nativeManifest?.cases),
    "shared adapter impact requires the native exact manifest");
  const cases = nativeManifest.cases.map(item => {
    const plan = buildPostActionLifecyclePlan(item);
    const actionKinds = item.actions.map(action => String(action.kind || ""));
    const methods = new Set([
      "openNativePlaywrightPage.snapshot",
      "openNativePlaywrightPage.measureVisualState",
      "openNativePlaywrightPage.observeRequestedObservedState",
    ]);
    if (actionKinds.includes("wait-visible") || item.workflow.workflowClass === "form-submit") {
      methods.add("openNativePlaywrightPage.waitForSelector");
    }
    if (actionKinds.some(kind => [
      "activate-control",
      "execute-persisted-action",
      "submit-form",
      "toggle-checkbox",
    ].includes(kind))) {
      methods.add("openNativePlaywrightPage.click");
    }
    return {
      caseId: item.caseId,
      featureId: item.featureId,
      workflowClass: String(item.workflow.workflowClass || ""),
      sharedAdapterMethods: [...methods].sort(),
      actionSequence: plan.action.sequence,
      routeTransition: {
        sourceRoute: plan.preAction.route,
        destinationRoute: plan.postNavigation.route,
        routeChanged: plan.postNavigation.routeChanged,
        sourceSelector: plan.preAction.selector,
        destinationSelector: plan.postNavigation.selector,
        sourceSelectorRewaitAllowed: plan.postNavigation.sourceSelectorRewaitAllowed,
      },
      postActionVisualLifecycle: {
        primaryActionId: plan.action.primaryCompletion.actionId,
        completionMode: plan.action.primaryCompletion.mode,
        transitionKind: plan.postNavigation.transitionKind,
        ownerPolicy: plan.postNavigation.ownerPolicy,
        navigationEpochRelation: plan.postNavigation.navigationEpochRelation,
        exactOneOwnerRequired: true,
        invisibleSourceRewaitAllowed: false,
        staleSourceScrollAllowed: false,
        ownerBranches: plan.postNavigation.routeChanged
          ? ["route-change-visible-destination"]
          : plan.action.primaryCompletion.mode === "navigation" ||
              plan.preAction.selector === "body"
            ? ["navigation-visible-document"]
            : [
                "source-visible-source-owner",
                "source-hidden-document-owner",
                "source-detached-document-owner",
              ],
      },
    };
  });
  const remaining125CaseIds = cases.slice(299).map(item => item.caseId);
  const lifecycleClassCounts = Object.fromEntries([...new Set(cases.map(item =>
    item.postActionVisualLifecycle.transitionKind))].sort().map(kind => [
      kind,
      cases.filter(item => item.postActionVisualLifecycle.transitionKind === kind).length,
    ]));
  const completionModeCounts = Object.fromEntries(["request", "local", "navigation"].map(mode => [
    mode,
    cases.filter(item => item.postActionVisualLifecycle.completionMode === mode).length,
  ]));
  const payload = {
    schema: "media-server.v390-ui-shared-adapter-impact.v1",
    sourceRange: {
      from: "6c6e2e71832d47109751efeccedd6c8eb8c52e2e",
      to: "2d8864c77721be76fd32caeaf1d2e00a6f2b8924",
    },
    callerScope: "production-runtime-and-verifier-entrypoints-excluding-contract-harnesses",
    changedFunctions: structuredClone(sharedAdapterChangeBindings),
    caseCount: cases.length,
    routeTransitionCaseIds: cases
      .filter(item => item.postActionVisualLifecycle.transitionKind === "document-form-redirect")
      .map(item => item.caseId),
    visualOwnerRouteChangeCaseIds: cases
      .filter(item => item.routeTransition.routeChanged)
      .map(item => item.caseId),
    postActionVisualCensus: {
      exactOneOwnerCaseCount: cases.filter(item =>
        item.postActionVisualLifecycle.exactOneOwnerRequired).length,
      completionModeCounts,
      lifecycleClassCounts,
      hiddenSourceBranchCaseCount: cases.filter(item =>
        item.postActionVisualLifecycle.ownerBranches.includes("source-hidden-document-owner")).length,
      detachedSourceBranchCaseCount: cases.filter(item =>
        item.postActionVisualLifecycle.ownerBranches.includes("source-detached-document-owner")).length,
      routeChangeCaseCount: cases.filter(item => item.routeTransition.routeChanged).length,
      localTransitionCaseCount: cases.filter(item =>
        item.postActionVisualLifecycle.completionMode === "local").length,
      navigationCaseCount: cases.filter(item =>
        item.postActionVisualLifecycle.completionMode === "navigation").length,
    },
    remaining125CaseCount: remaining125CaseIds.length,
    remaining125CaseIds,
    cases,
  };
  return {
    ...payload,
    digest: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}

function localTransitionDestination(localTransition) {
  if (localTransition?.type !== "follow-link") return { route: "", selector: "" };
  const urlPostconditions = (localTransition.postconditions || []).filter(item =>
    item?.property === "url" && item?.operator === "includes" && routePath(item?.value));
  assert(urlPostconditions.length === 1,
    "follow-link local transition requires exact-one URL destination owner");
  return {
    route: routePath(urlPostconditions[0].value),
    selector: String(urlPostconditions[0].selector || ""),
  };
}

function validateOwnerObservation(caseId, observation, {
  selector,
  navigationEpoch = null,
  requireVisible,
  label,
} = {}) {
  assert(observation && typeof observation === "object",
    `${caseId} ${label} observation missing`);
  assert(observation.selector === selector,
    `${caseId} ${label} selector mismatch`);
  const candidateCount = Number(observation.candidateCount);
  assert(Number.isInteger(candidateCount) && candidateCount >= 0 && candidateCount <= 1,
    `${caseId} ${label} selector cardinality mismatch`);
  assert(typeof observation.exists === "boolean" &&
    observation.exists === (candidateCount === 1),
  `${caseId} ${label} existence/cardinality mismatch`);
  if (navigationEpoch !== null) {
    assert(Number(observation.navigationEpoch) === navigationEpoch,
      `${caseId} ${label} navigation epoch mismatch`);
  } else {
    assert(Number.isInteger(Number(observation.navigationEpoch)) &&
      Number(observation.navigationEpoch) > 0,
    `${caseId} ${label} navigation epoch missing`);
  }
  if (requireVisible) {
    assert(observation.exists === true && observation.visible === true,
      `${caseId} ${label} is not visible`);
  }
}

function validateDocumentFormResponseIdentity(caseId, contract, identity) {
  assert(identity?.schema === "media-server.v390-ui-document-form-submit-binding.v1",
    `${caseId} document form response identity schema mismatch`);
  assert(identity.method === "POST" && identity.path === contract.path,
    `${caseId} document form response request mismatch`);
  assert(contract.statuses.includes(identity.status),
    `${caseId} document form response status mismatch`);
  const expectedRedirectPath = routePath(contract.redirectPath || "");
  const observedRedirectPath = routePath(identity.redirectPath || "");
  const expectedRedirectCount = expectedRedirectPath ? 1 : 0;
  assert(identity.redirectCount === expectedRedirectCount &&
    observedRedirectPath === expectedRedirectPath,
  `${caseId} document form redirect lifecycle mismatch`);
}

function routePath(value) {
  const source = String(value || "");
  if (!source) return "";
  try {
    return new URL(source, "http://127.0.0.1").pathname;
  } catch {
    return source.split(/[?#]/, 1)[0];
  }
}

function routeLocation(value) {
  const source = String(value || "");
  if (!source) return "";
  try {
    const parsed = new URL(source, "http://127.0.0.1");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return source;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
