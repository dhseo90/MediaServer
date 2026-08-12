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
    const request = lifecycle.action.documentRequest;
    const expectedHops = [{
      method: request.method,
      path: routePath(request.path),
      allowedStatuses: [...request.statuses],
      redirected: false,
      redirectTarget: routePath(request.redirectPath || ""),
      networkOwnership: "action-envelope",
    }];
    if (request.redirectPath) {
      assert(Array.isArray(request.finalStatuses) && request.finalStatuses.length > 0,
        `${item.caseId} document redirect final status contract missing`);
      expectedHops.push({
        method: "GET",
        path: routePath(request.redirectPath),
        allowedStatuses: [...request.finalStatuses],
        redirected: true,
        redirectTarget: "",
        networkOwnership: "document-navigation-chain",
      });
    }
    steps.push({
      invocationId: request.navigationInvocationId,
      kind: "form-submit-document-navigation",
      action: lifecycle.preAction.selector,
      sourceRoute: lifecycle.preAction.route,
      destinationRoute: lifecycle.postNavigation.route,
      sourceSelector: lifecycle.preAction.selector,
      owner: "primary-document-form",
      ownershipPhase: "primary-action",
      declaredHopCount: expectedHops.length,
      expectedHops,
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
    declaredHopCount: steps.reduce((sum, step) => sum + step.declaredHopCount, 0),
    primaryHopCount: steps
      .filter(step => step.ownershipPhase === "primary-action")
      .reduce((sum, step) => sum + step.declaredHopCount, 0),
    readbackHopCount: steps
      .filter(step => step.ownershipPhase === "independent-readback")
      .reduce((sum, step) => sum + step.declaredHopCount, 0),
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
    declaredDocumentHopCount: rows.reduce((sum, row) => sum + row.declaredHopCount, 0),
    exactOneClassificationCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
    counts,
    caseIds,
  };
}

export function buildDocumentFormResponseBindingCensus(manifest) {
  assert(Array.isArray(manifest?.cases), "document form response census manifest missing");
  const rows = manifest.cases.filter(item =>
    buildPostActionLifecyclePlan(item).action.primaryCompletion.mode === "request")
    .map(item => ({
    item,
    plan: buildRequestNavigationLifecyclePlan(item),
    })).filter(({ plan }) => plan.steps.some(step =>
    step.ownershipPhase === "primary-action" &&
    step.kind === "form-submit-document-navigation"));
  return {
    schema: "media-server.v390-ui-document-form-response-binding-census.v1",
    caseCount: rows.length,
    redirectingCaseCount: rows.filter(({ plan }) =>
      plan.classification === "document-form-redirect").length,
    sameRouteCaseCount: rows.filter(({ plan }) =>
      plan.classification === "same-route-document-form").length,
    rows: rows.map(({ item, plan }) => {
      const step = plan.steps.find(candidate =>
        candidate.ownershipPhase === "primary-action" &&
        candidate.kind === "form-submit-document-navigation");
      const initiating = step.expectedHops[0];
      const destination = step.expectedHops[1] || null;
      assert(initiating && initiating.method === "POST" &&
        initiating.allowedStatuses.length === 1,
      `${item.caseId} document form initiating response census drift`);
      return {
        caseId: item.caseId,
        method: initiating.method,
        path: initiating.path,
        status: initiating.allowedStatuses[0],
        redirectHops: destination ? 1 : 0,
        location: initiating.redirectTarget,
        finalRoute: plan.finalRoute,
        primaryResponseOwnership:
          "action-envelope:response.request-object-identity",
        redirectDestinationOwnership: destination
          ? "document-navigation-chain:page-owned"
          : "not-applicable",
        declaredPrimaryCardinality: "1/1",
      };
    }),
  };
}

export function bindRequestNavigationLifecycle(plan, scope, {
  sourceBeforeObservation = null,
  sourceObservation = null,
  visualContext = null,
  executionOwnerSelector = "",
} = {}) {
  assert(plan?.schema === "media-server.v390-ui-request-navigation-lifecycle-plan.v1",
    "request navigation lifecycle plan schema mismatch");
  assert(scope?.schema === "media-server.v390-ui-request-navigation-scope.v1",
    `${plan.caseId} request navigation scope missing`);
  const lifecycles = scope.ownerLifecycles;
  const documentNavigations = scope.documentNavigations;
  assert(Array.isArray(lifecycles) && Array.isArray(documentNavigations),
    `${plan.caseId} request navigation scope collections missing`);
  assert(lifecycles.length === plan.steps.length,
    `${plan.caseId} request navigation lifecycle cardinality mismatch: ${lifecycles.length}/${plan.steps.length}`);
  assert(sourceBeforeObservation?.exists === true && sourceBeforeObservation.visible === true,
    `${plan.caseId} request source-before owner missing or hidden`);
  const sourceSelector = String(executionOwnerSelector || plan.sourceSelector || "");
  const hiddenSourceControl = sourceObservation?.selector === sourceSelector &&
    sourceObservation.exists === true && sourceObservation.visible === false;
  const sourceOwnerSelector = hiddenSourceControl &&
    sourceBeforeObservation.selector === "body"
    ? "body"
    : sourceSelector;
  assert(sourceBeforeObservation.selector === sourceOwnerSelector,
    `${plan.caseId} request source-before selector mismatch`);
  assert(visualContext?.schema === "media-server.v390-ui-post-action-visual-context.v1" &&
    routePath(visualContext.route) === plan.finalRoute,
  `${plan.caseId} request final visual route mismatch`);
  const finalEpoch = Number(visualContext.navigationEpoch);
  assertOwner(plan.caseId, visualContext.documentOwner, "body", finalEpoch,
    "request final document owner");
  const sourceBeforeEpoch = Number(sourceBeforeObservation.navigationEpoch);
  assert(Number(scope.startEpoch) === sourceBeforeEpoch,
    `${plan.caseId} request source-before checkpoint epoch mismatch`);
  assert(Number(scope.endEpoch) === finalEpoch,
    `${plan.caseId} request destination-after checkpoint epoch mismatch`);
  assert(plan.declaredHopCount === plan.primaryHopCount + plan.readbackHopCount,
    `${plan.caseId} request declared hop partition mismatch`);

  if (plan.steps.length === 0) {
    assert(documentNavigations.length === 0,
      `${plan.caseId} unrelated request document navigation observed`);
    const sourceEpoch = sourceBeforeEpoch;
    assert(Number.isInteger(sourceEpoch) && sourceEpoch === finalEpoch,
      `${plan.caseId} unexpected request navigation epoch advance`);
    if (sourceObservation) {
      assert(sourceObservation.selector === sourceSelector &&
        Number(sourceObservation.navigationEpoch) === sourceEpoch,
      `${plan.caseId} request source-after owner epoch mismatch`);
    }
    return binding(plan, 0, sourceEpoch, finalEpoch, "same-document",
      sourceOwnerSelector);
  }

  let previousDestinationEpoch = null;
  let previousDestinationRoute = "";
  const ownedDocumentHops = [];
  const requestIds = new Set();
  let previousResponseSequence = 0;
  let previousCaseRequestSequence = 0;
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
    assert(observed.documentChain?.schema === "media-server.v390-ui-owned-document-chain.v1" &&
      observed.documentChain.invocationId === expected.invocationId &&
      observed.documentChain.kind === expected.kind &&
      Array.isArray(observed.documentChain.hops),
    `${plan.caseId} owned document chain schema/identity mismatch`);
    const observedHops = observed.documentChain.hops;
    assert(observed.documentChain.hopCount === expected.declaredHopCount &&
      observedHops.length === expected.declaredHopCount &&
      expected.expectedHops.length === expected.declaredHopCount,
    `${plan.caseId} owned document chain cardinality mismatch`);
    assert(destinationEpoch === sourceEpoch + expected.declaredHopCount,
      `${plan.caseId} request navigation epoch delta does not match owned document commits`);
    if (index === 0) {
      assert(sourceEpoch === Number(sourceBeforeObservation.navigationEpoch),
        `${plan.caseId} request source-before owner navigation epoch mismatch`);
    } else {
      assert(sourceEpoch === previousDestinationEpoch &&
        expected.sourceRoute === previousDestinationRoute,
      `${plan.caseId} request navigation lifecycle sequence is discontinuous`);
    }
    let priorHopRequestId = "";
    for (let hopIndex = 0; hopIndex < expected.expectedHops.length; hopIndex += 1) {
      const expectedHop = expected.expectedHops[hopIndex];
      const observedHop = observedHops[hopIndex];
      assert(observedHop?.invocationId === expected.invocationId &&
        observedHop.navigationKind === expected.kind,
      `${plan.caseId} owned document hop invocation/kind mismatch`);
      assert(String(observedHop.method || "").toUpperCase() === expectedHop.method &&
        routePath(observedHop.path) === expectedHop.path,
      `${plan.caseId} owned document hop method/route mismatch`);
      assert(expectedHop.allowedStatuses.includes(Number(observedHop.responseStatus)) &&
        observedHop.responseBound === true &&
        observedHop.responseRequestObjectObserved === true &&
        observedHop.responseRequestId === observedHop.requestId,
      `${plan.caseId} owned document hop response/status/request binding mismatch`);
      assert(observedHop.resourceType === "document" && observedHop.sameOrigin === true &&
        observedHop.correlationPresent !== true,
      `${plan.caseId} owned document hop trust boundary mismatch`);
      if (expectedHop.networkOwnership === "action-envelope") {
        assert(observedHop.ledgerOwner === "action" &&
          observedHop.sourceOwner === "explicit-action-registration" &&
          observedHop.ownerPhase === "primary-action" &&
          observedHop.requestOwnershipKind === "primary-action" &&
          Boolean(observedHop.initiatorActionId),
        `${plan.caseId} initiating document response ownership mismatch`);
      } else if (expectedHop.networkOwnership === "document-navigation-chain") {
        assert(observedHop.ledgerOwner === "page" &&
          observedHop.sourceOwner === "document-navigation-ledger" &&
          observedHop.ownerPhase === "document-navigation-chain" &&
          observedHop.requestOwnershipKind === "document-navigation-chain" &&
          !observedHop.initiatorActionId,
        `${plan.caseId} redirect destination ownership mismatch`);
      }
      assert(observedHop.redirected === expectedHop.redirected &&
        routePath(observedHop.responseLocationPath) === expectedHop.redirectTarget,
      `${plan.caseId} owned document redirect target mismatch`);
      assert(String(observedHop.redirectedFromRequestId || "") === priorHopRequestId,
        `${plan.caseId} owned document redirect request chain mismatch`);
      assert(typeof observedHop.requestId === "string" && observedHop.requestId &&
        typeof observedHop.caseRequestIdentity === "string" && observedHop.caseRequestIdentity &&
        Number.isInteger(Number(observedHop.caseRequestSequence)) &&
        Number(observedHop.caseRequestSequence) > previousCaseRequestSequence &&
        !requestIds.has(observedHop.requestId),
      `${plan.caseId} owned document request object/sequence identity mismatch`);
      assert(Number.isInteger(Number(observedHop.sequence)) &&
        Number.isInteger(Number(observedHop.responseSequence)) &&
        Number(observedHop.sequence) > previousResponseSequence &&
        Number(observedHop.responseSequence) > Number(observedHop.sequence),
      `${plan.caseId} owned document request/response order mismatch`);
      assert(Number(observedHop.navigationEpoch) === sourceEpoch + hopIndex + 1,
        `${plan.caseId} owned document hop epoch mismatch`);
      requestIds.add(observedHop.requestId);
      previousCaseRequestSequence = Number(observedHop.caseRequestSequence);
      previousResponseSequence = Number(observedHop.responseSequence);
      priorHopRequestId = observedHop.requestId;
      ownedDocumentHops.push(observedHop);
    }
    previousDestinationEpoch = destinationEpoch;
    previousDestinationRoute = expected.destinationRoute;
  }
  assert(ownedDocumentHops.length === plan.declaredHopCount &&
    documentNavigations.length === plan.declaredHopCount,
  `${plan.caseId} request document scope cardinality mismatch`);
  for (let index = 0; index < ownedDocumentHops.length; index += 1) {
    const owned = ownedDocumentHops[index];
    const scoped = documentNavigations[index];
    assert(scoped?.requestId === owned.requestId &&
      scoped.sequence === owned.sequence &&
      scoped.responseSequence === owned.responseSequence &&
      scoped.invocationId === owned.invocationId,
    `${plan.caseId} unrelated/polling document navigation observed`);
  }
  assert(previousDestinationEpoch === finalEpoch && previousDestinationRoute === plan.finalRoute,
    `${plan.caseId} request navigation final owner mismatch`);
  if (sourceObservation) {
    const observedEpoch = Number(sourceObservation.navigationEpoch);
    const primaryDestinationEpoch = Number(lifecycles.find((_, index) =>
      plan.steps[index]?.ownershipPhase === "primary-action")?.destinationOwner?.navigationEpoch);
    const allowedSourceAfterEpochs = new Set([
      Number(sourceBeforeObservation.navigationEpoch),
      finalEpoch,
      ...(Number.isInteger(primaryDestinationEpoch) ? [primaryDestinationEpoch] : []),
    ]);
    assert(sourceObservation.selector === sourceSelector &&
      allowedSourceAfterEpochs.has(observedEpoch),
    `${plan.caseId} request source-after owner lifecycle mismatch`);
  }
  const epochRelation = plan.readbackHopCount > 0
    ? "advanced-readback"
    : "advanced-action";
  return binding(plan, plan.declaredHopCount, sourceBeforeEpoch,
    finalEpoch, epochRelation, sourceOwnerSelector);
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
    ownershipPhase: "independent-readback",
    declaredHopCount: 1,
    expectedHops: [{
      method: "GET",
      path: routePath(destinationRoute),
      allowedStatuses: [200],
      redirected: false,
      redirectTarget: "",
      networkOwnership: "independent-readback",
    }],
  };
}

function binding(plan, navigationCount, sourceEpoch, finalEpoch, epochRelation,
  sourceOwnerSelector) {
  const epochDelta = finalEpoch - sourceEpoch;
  return {
    schema: "media-server.v390-ui-request-navigation-lifecycle-binding.v1",
    caseId: plan.caseId,
    classification: plan.classification,
    navigationCount: plan.steps.length,
    declaredHopCount: plan.declaredHopCount,
    ownedDocumentCommitCount: navigationCount,
    primaryHopCount: plan.primaryHopCount,
    readbackHopCount: plan.readbackHopCount,
    sourceOwnerSelector,
    sourceEpoch,
    finalEpoch,
    epochDelta,
    hopMode: navigationCount === 0
      ? "zero-hop"
      : navigationCount === 1
        ? "single-hop"
        : "multi-hop",
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
