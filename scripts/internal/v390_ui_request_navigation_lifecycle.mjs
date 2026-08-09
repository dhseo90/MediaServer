// 파일 용도: request completion 이후 document navigation side-effect의 canonical 계획/census와 exact epoch binding을 검증한다.

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import { isExistingSpecializedExactOracle } from "./v390_ui_exact_oracle_runtime.mjs";
import { formReadbackProfiles } from "./v390_ui_case_runtime.mjs";
import {
  buildPostActionLifecyclePlan,
} from "./v390_ui_shared_adapter_lifecycle.mjs";

export function buildRequestNavigationLifecyclePlan(item) {
  const lifecycle = buildPostActionLifecyclePlan(item);
  assert(lifecycle.action.primaryCompletion.mode === "request",
    `${item?.caseId || "unknown"} request navigation plan requires request completion`);
  const steps = [];
  if (lifecycle.action.documentRequest) {
    steps.push({
      invocationId: lifecycle.action.documentRequest.navigationInvocationId,
      kind: "form-submit-document-navigation",
      action: lifecycle.preAction.selector,
      sourceRoute: lifecycle.preAction.route,
      destinationRoute: lifecycle.postNavigation.route,
      sourceSelector: lifecycle.preAction.selector,
      owner: "primary-document-form",
    });
  }

  const formReadback = formReadbackProfiles[item.caseId]?.navigationLifecycle || null;
  if (formReadback) {
    assert(formReadback.kind === "route-roundtrip" &&
      routePath(formReadback.restoreRoute) === lifecycle.postNavigation.route,
    `${item.caseId} form readback navigation declaration mismatch`);
    steps.push(
      navigationStep(item.caseId, "form-readback-source", lifecycle.postNavigation.route,
        formReadback.observationRoute, "form-readback-source-navigation"),
      navigationStep(item.caseId, "form-readback-restore", formReadback.observationRoute,
        formReadback.restoreRoute, "form-readback-restore-navigation"),
    );
  }

  const runtimeOracle = exactRuntimeOracleFor(item.caseId);
  if (!isExistingSpecializedExactOracle(item)) {
    const oracleRoute = routePath(runtimeOracle?.route || "");
    const destinationRoute = lifecycle.postNavigation.route;
    const splitApiAndScreen = isApiRoute(oracleRoute) &&
      routePath(item.screenRoute) !== oracleRoute;
    if (!splitApiAndScreen && oracleRoute && oracleRoute !== destinationRoute) {
      steps.push(navigationStep(item.caseId, "catalog-source", destinationRoute,
        oracleRoute, "catalog-source-navigation"));
    }
    if (runtimeOracle?.action?.kind === "reload") {
      const reloadRoute = routePath(runtimeOracle.action.target || oracleRoute);
      steps.push(navigationStep(item.caseId, "catalog-action-reload", reloadRoute,
        reloadRoute, "catalog-action-reload-navigation"));
    }
    if (!splitApiAndScreen && oracleRoute && oracleRoute !== destinationRoute) {
      steps.push(navigationStep(item.caseId, "catalog-restore", oracleRoute,
        destinationRoute, "catalog-restore-navigation"));
    }
  }

  const hasRoundtrip = steps.some(step => [
    "form-readback-source-navigation",
    "catalog-source-navigation",
  ].includes(step.kind));
  const hasReload = steps.some(step => step.kind === "catalog-action-reload-navigation");
  const classification = lifecycle.postNavigation.transitionKind === "document-form-redirect"
    ? "document-form-redirect"
    : lifecycle.action.documentRequest
      ? "same-route-document-form"
    : hasRoundtrip
      ? "readback-route-roundtrip"
      : hasReload
        ? "same-route-reload"
        : "same-document-no-navigation";
  return {
    schema: "media-server.v390-ui-request-navigation-lifecycle-plan.v1",
    caseId: item.caseId,
    classification,
    sourceRoute: lifecycle.preAction.route,
    sourceSelector: lifecycle.preAction.selector,
    finalRoute: lifecycle.postNavigation.route,
    steps,
  };
}

export function buildRequestNavigationCensus(manifest) {
  assert(Array.isArray(manifest?.cases), "request navigation census manifest missing");
  const rows = manifest.cases
    .filter(item => buildPostActionLifecyclePlan(item).action.primaryCompletion.mode === "request")
    .map(item => buildRequestNavigationLifecyclePlan(item));
  const classifications = [
    "document-form-redirect",
    "same-route-document-form",
    "readback-route-roundtrip",
    "same-route-reload",
    "same-document-no-navigation",
  ];
  const caseIds = Object.fromEntries(classifications.map(classification => [
    classification,
    rows.filter(row => row.classification === classification).map(row => row.caseId),
  ]));
  const counts = Object.fromEntries(classifications.map(classification => [
    classification,
    caseIds[classification].length,
  ]));
  return {
    schema: "media-server.v390-ui-request-navigation-census.v1",
    requestCompletionCount: rows.length,
    navigationSideEffectCount: rows.filter(row => row.steps.length > 0).length,
    exactOneClassificationCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
    counts,
    caseIds,
  };
}

export function bindRequestNavigationLifecycle(plan, lifecycles, {
  sourceBeforeObservation = null,
  sourceObservation = null,
  visualContext = null,
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-request-navigation-lifecycle-plan.v1",
    "request navigation lifecycle plan schema mismatch");
  assert(Array.isArray(lifecycles), `${plan.caseId} request navigation lifecycle collection missing`);
  assert(lifecycles.length === plan.steps.length,
    `${plan.caseId} request navigation lifecycle cardinality mismatch: ${lifecycles.length}/${plan.steps.length}`);
  assert(sourceBeforeObservation?.exists === true && sourceBeforeObservation.visible === true,
    `${plan.caseId} request source-before owner missing or hidden`);
  assert(sourceBeforeObservation.selector === plan.sourceSelector,
    `${plan.caseId} request source-before selector mismatch`);
  assert(visualContext?.schema === "media-server.v390-ui-post-action-visual-context.v1" &&
    routePath(visualContext.route) === plan.finalRoute,
  `${plan.caseId} request final visual route mismatch`);
  const finalEpoch = Number(visualContext.navigationEpoch);
  assertOwner(plan.caseId, visualContext.documentOwner, "body", finalEpoch,
    "request final document owner");

  if (plan.steps.length === 0) {
    const sourceEpoch = Number(sourceBeforeObservation.navigationEpoch);
    assert(Number.isInteger(sourceEpoch) && sourceEpoch === finalEpoch,
      `${plan.caseId} unexpected request navigation epoch advance`);
    if (sourceObservation) {
      assert(sourceObservation.selector === plan.sourceSelector &&
        Number(sourceObservation.navigationEpoch) === sourceEpoch,
      `${plan.caseId} request source-after owner epoch mismatch`);
    }
    return binding(plan, 0, sourceEpoch, finalEpoch, "same-document");
  }

  let previousDestinationEpoch = null;
  let previousDestinationRoute = "";
  for (let index = 0; index < plan.steps.length; index += 1) {
    const expected = plan.steps[index];
    const observed = lifecycles[index];
    assert(observed?.schema === "media-server.v390-ui-navigation-owner-lifecycle.v1" &&
      observed.caseId === plan.caseId,
    `${plan.caseId} request navigation lifecycle schema/case mismatch`);
    assert(observed.invocationId === expected.invocationId,
      `${plan.caseId} request navigation invocation mismatch`);
    assert(observed.kind === expected.kind,
      `${plan.caseId} request navigation kind mismatch`);
    assert(observed.action === expected.action,
      `${plan.caseId} request navigation action mismatch`);
    assert(routePath(observed.sourceRoute) === expected.sourceRoute,
      `${plan.caseId} request navigation source route mismatch`);
    assert(routePath(observed.destinationRoute) === expected.destinationRoute,
      `${plan.caseId} request navigation destination route mismatch`);
    const sourceEpoch = Number(observed.sourceOwner?.navigationEpoch);
    const destinationEpoch = Number(observed.destinationOwner?.navigationEpoch);
    assertOwner(plan.caseId, observed.sourceOwner, expected.sourceSelector, sourceEpoch,
      "request navigation source owner");
    assertOwner(plan.caseId, observed.destinationOwner, "body", destinationEpoch,
      "request navigation destination owner");
    assert(destinationEpoch === sourceEpoch + 1,
      `${plan.caseId} request navigation epoch did not advance exactly once`);
    if (index === 0) {
      assert(sourceEpoch === Number(sourceBeforeObservation.navigationEpoch),
        `${plan.caseId} request source-before owner navigation epoch mismatch`);
    } else {
      assert(sourceEpoch === previousDestinationEpoch &&
        expected.sourceRoute === previousDestinationRoute,
      `${plan.caseId} request navigation lifecycle sequence is discontinuous`);
    }
    previousDestinationEpoch = destinationEpoch;
    previousDestinationRoute = expected.destinationRoute;
  }
  assert(previousDestinationEpoch === finalEpoch && previousDestinationRoute === plan.finalRoute,
    `${plan.caseId} request navigation final owner mismatch`);
  if (sourceObservation) {
    const observedEpoch = Number(sourceObservation.navigationEpoch);
    assert(sourceObservation.selector === plan.sourceSelector &&
      (observedEpoch === Number(sourceBeforeObservation.navigationEpoch) || observedEpoch === finalEpoch),
    `${plan.caseId} request source-after owner lifecycle mismatch`);
  }
  return binding(plan, plan.steps.length, Number(sourceBeforeObservation.navigationEpoch),
    finalEpoch, "advanced-readback");
}

function navigationStep(caseId, owner, sourceRoute, destinationRoute, kind) {
  return {
    invocationId: `${caseId}:${owner}-navigation`,
    kind,
    action: routePath(destinationRoute),
    sourceRoute: routePath(sourceRoute),
    destinationRoute: routePath(destinationRoute),
    sourceSelector: "body",
    owner,
  };
}

function binding(plan, navigationCount, sourceEpoch, finalEpoch, epochRelation) {
  return {
    schema: "media-server.v390-ui-request-navigation-lifecycle-binding.v1",
    caseId: plan.caseId,
    classification: plan.classification,
    navigationCount,
    sourceEpoch,
    finalEpoch,
    finalRoute: plan.finalRoute,
    epochRelation,
    pass: true,
  };
}

function assertOwner(caseId, owner, selector, epoch, label) {
  assert(owner?.selector === selector && owner.candidateCount === 1 &&
    owner.exists === true && owner.visible === true,
  `${caseId} ${label} mismatch`);
  assert(Number.isInteger(epoch) && epoch >= 0,
    `${caseId} ${label} epoch missing`);
}

function isApiRoute(route) {
  return route.startsWith("/api/") || route.includes("/api/");
}

function routePath(value) {
  const text = String(value || "");
  if (!text) return "";
  try {
    return new URL(text, "http://127.0.0.1").pathname;
  } catch {
    return "";
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
