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
  const documentContract = documentFormSubmitContracts.get(item.caseId) || null;
  const redirectPath = routePath(documentContract?.redirectPath || "");
  const routeChanged = Boolean(redirectPath && redirectPath !== sourceRoute);
  const destinationRoute = routeChanged ? redirectPath : sourceRoute;
  const destinationSelector = routeChanged
    ? String(destinationControls.get(destinationRoute) || "")
    : sourceSelector;
  assert(sourceRoute.startsWith("/"), `${item.caseId} source route missing`);
  assert(sourceSelector, `${item.caseId} source selector missing`);
  assert(destinationRoute.startsWith("/"), `${item.caseId} destination route missing`);
  assert(destinationSelector, `${item.caseId} destination control contract missing: ${destinationRoute}`);
  assert(!routeChanged || destinationSelector !== sourceSelector,
    `${item.caseId} redirect destination reuses the stale source selector`);
  if (formResponseIdentity !== null && documentContract) {
    validateDocumentFormResponseIdentity(item.caseId, documentContract, formResponseIdentity);
  }
  const requiredState = routeChanged || item.workflow?.primaryControl?.expectedVisible !== false
    ? "visible"
    : "attached";
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
      phase: "action-request-response-binding",
    },
    postNavigation: {
      route: destinationRoute,
      selector: destinationSelector,
      requiredState,
      routeChanged,
      sourceSelectorRewaitAllowed: !routeChanged,
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
  currentRoute = "",
  sourceObservation = null,
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-post-action-lifecycle-plan.v1",
    "post-action visual target plan schema mismatch");
  const sourceSelector = String(plan.preAction?.selector || "");
  assert(sourceSelector, `${plan.caseId} post-action visual source selector missing`);
  const base = {
    schema: "media-server.v390-ui-post-action-visual-target.v1",
    caseId: plan.caseId,
    sourceSelectorSha256: createHash("sha256").update(sourceSelector).digest("hex"),
    requestedState: "attached",
  };
  if (!sourceObservation) {
    return {
      ...base,
      selector: sourceSelector,
      bindingKind: "source-owner-without-action-observation",
      sourceDetached: false,
      observedRoute: routeLocation(currentRoute),
    };
  }
  assert(sourceObservation.selector === sourceSelector,
    `${plan.caseId} post-action visual source selector binding mismatch`);
  assert(typeof sourceObservation.exists === "boolean",
    `${plan.caseId} post-action visual source existence missing`);
  if (sourceObservation.exists) {
    return {
      ...base,
      selector: sourceSelector,
      bindingKind: "attached-source-owner",
      sourceDetached: false,
      observedRoute: routeLocation(currentRoute),
    };
  }
  const observedRoute = routeLocation(currentRoute);
  const actionRoute = routeLocation(sourceObservation.url);
  assert(observedRoute && actionRoute && observedRoute === actionRoute,
    `${plan.caseId} detached source post-action document binding mismatch`);
  return {
    ...base,
    selector: "body",
    bindingKind: "post-action-document-owner",
    sourceDetached: true,
    observedRoute,
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
    };
  });
  const remaining125CaseIds = cases.slice(299).map(item => item.caseId);
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
      .filter(item => item.routeTransition.routeChanged)
      .map(item => item.caseId),
    remaining125CaseCount: remaining125CaseIds.length,
    remaining125CaseIds,
    cases,
  };
  return {
    ...payload,
    digest: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
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
