#!/usr/bin/env node
// 파일 용도: latest canonical actual RED와 canonical 424 post-action visual exact-one owner lifecycle을 검증한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bindNavigationPreActionVisualOwner,
  buildCanonicalSharedAdapterImpact,
  buildPostActionLifecyclePlan,
  documentFormSubmitContract,
  resolvePostActionVisualTarget,
  selectExactNavigationOwnerLifecycle,
} from "./v390_ui_shared_adapter_lifecycle.mjs";
import {
  bindRequestNavigationLifecycle,
  buildRequestNavigationCensus,
  buildRequestNavigationLifecyclePlan,
} from "./v390_ui_request_navigation_lifecycle.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const red = readJson("test/fixtures/v390_ui_post_action_visual_owner_red_20260809.json");
const navigationRed = readJson("test/fixtures/v390_ui_navigation_pre_post_owner_red_20260809.json");
const requestNavigationRed = readJson("test/fixtures/v390_ui_request_navigation_epoch_red_20260809.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const storedImpact = readJson("test/fixtures/v390_ui_shared_adapter_impact.json");
const byId = new Map(manifest.cases.map(item => [item.caseId, item]));

assert.equal(requestNavigationRed.schema,
  "media-server.v390-ui-request-navigation-epoch-red.v1");
assert.equal(requestNavigationRed.sourceCommitSha,
  "312a4f077f3cc50c6838fc09c31ed3b255c0b6a9");
assert.equal(requestNavigationRed.actualBrowserExecution, true);
assert.equal(requestNavigationRed.releaseEvidenceEligible, false);
assert.deepEqual(requestNavigationRed.coverage, {
  target: 424,
  attempted: 7,
  pass: 6,
  fail: 1,
  notRun: 417,
  unsupported: 0,
});
assert.equal(requestNavigationRed.firstFailure.caseId, "UI-008");
assert.equal(requestNavigationRed.firstFailure.completionMode, "request");
assert.equal(requestNavigationRed.firstFailure.error,
  "source-before owner navigation epoch mismatch");
assert.deepEqual(requestNavigationRed.capturedBeforeFailure,
  ["UI-001", "UI-002", "UI-003", "UI-004", "UI-005", "UI-007"]);
for (const artifact of Object.values(requestNavigationRed.artifacts)) {
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  const filePath = path.join(rootDir, artifact.path);
  if (fs.existsSync(filePath)) assert.equal(sha256File(filePath), artifact.sha256);
}

assert.equal(navigationRed.schema,
  "media-server.v390-ui-navigation-pre-post-owner-red.v1");
assert.equal(navigationRed.sourceCommitSha,
  "c88a55390ef7dd39cd307541b868d16d1147e9a3");
assert.equal(navigationRed.actualBrowserExecution, true);
assert.equal(navigationRed.releaseEvidenceEligible, false);
assert.deepEqual(navigationRed.coverage, {
  target: 424,
  attempted: 1,
  pass: 0,
  fail: 1,
  notRun: 423,
  unsupported: 0,
});
assert.equal(navigationRed.firstFailure.caseId, "UI-001");
assert.equal(navigationRed.firstFailure.completionMode, "navigation");
assert.equal(navigationRed.firstFailure.error,
  "navigation source-before observation missing");
for (const artifact of Object.values(navigationRed.artifacts)) {
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  const filePath = path.join(rootDir, artifact.path);
  if (fs.existsSync(filePath)) assert.equal(sha256File(filePath), artifact.sha256);
}

assert.equal(red.schema, "media-server.v390-ui-post-action-visual-owner-red.v1");
assert.equal(red.releaseEvidenceEligible, false);
assert.equal(red.sourceCommitSha, "a81feb42f073b8d72688bf91c528500196466598");
assert.deepEqual(red.coverage, {
  target: 424,
  attempted: 108,
  pass: 107,
  fail: 1,
  notRun: 316,
  unsupported: 0,
});
assert.equal(red.firstFailure.caseId, "UI-109");
assert.equal(red.firstFailure.sourceSelector, "#channel-save-selected");
assert.equal(red.firstFailure.completionMode, "request");
assert.deepEqual(red.firstFailure.sourceBefore, { exists: true, visible: true });
assert.deepEqual(red.firstFailure.sourceAfter, {
  exists: true,
  visible: false,
  hidden: true,
  disabled: true,
});

for (const artifact of Object.values(red.artifacts)) {
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  const filePath = path.join(rootDir, artifact.path);
  if (fs.existsSync(filePath)) assert.equal(sha256File(filePath), artifact.sha256);
}
const currentTracePath = path.join(rootDir, red.artifacts.ui109Trace.path);
if (fs.existsSync(currentTracePath)) {
  const trace = JSON.parse(fs.readFileSync(currentTracePath, "utf8"));
  const raw = [...trace.rawPrimaryObservations].reverse().find(item =>
    item.action?.actionId === "UI-109:execute-persisted-action");
  assert.equal(raw.before.selector, red.firstFailure.sourceSelector);
  assert.equal(raw.before.visible, true);
  assert.equal(raw.after.exists, true);
  assert.equal(raw.after.visible, false);
  assert.equal(trace.postActionVisualTargetEvidence.bindingKind,
    red.firstFailure.redVisualBindingKind);
  assert.equal(trace.postActionVisualTargetEvidence.selector,
    red.firstFailure.redVisualSelector);
}

const impact = buildCanonicalSharedAdapterImpact(manifest);
assert.deepEqual(storedImpact, impact);
assert.equal(impact.caseCount, 424);
assert.equal(impact.postActionVisualCensus.exactOneOwnerCaseCount, 424);
assert.deepEqual(impact.postActionVisualCensus.completionModeCounts, {
  request: 391,
  local: 28,
  navigation: 5,
});
assert.deepEqual(impact.postActionVisualCensus.lifecycleClassCounts, {
  "document-form-redirect": 9,
  "local-route-transition": 2,
  "local-transition": 26,
  "navigation-completion": 5,
  "request-completion": 382,
});
assert.equal(impact.postActionVisualCensus.hiddenSourceBranchCaseCount, 227);
assert.equal(impact.postActionVisualCensus.detachedSourceBranchCaseCount, 227);
assert.equal(impact.postActionVisualCensus.routeChangeCaseCount, 13);
assert.equal(impact.postActionVisualCensus.localTransitionCaseCount, 28);
assert.equal(impact.postActionVisualCensus.navigationCaseCount, 5);
const lifecycleRows = manifest.cases.map(item => ({
  caseId: item.caseId,
  plan: buildPostActionLifecyclePlan(item),
  documentForm: documentFormCase(item),
}));
assert.deepEqual(lifecycleRows.filter(item =>
  item.plan.action.primaryCompletion.mode === "navigation").map(item => item.caseId),
["UI-001", "UI-018", "EVT-004", "SAFE-016", "SAFE-017"]);
assert.equal(lifecycleRows.filter(item => item.documentForm).length, 11);
assert.equal(lifecycleRows.filter(item => item.documentForm &&
  item.plan.postNavigation.transitionKind === "document-form-redirect").length, 9);
assert.equal(lifecycleRows.filter(item => item.plan.postNavigation.routeChanged).length, 13);
assert.equal(lifecycleRows.filter(item =>
  item.plan.action.primaryCompletion.mode === "navigation" &&
  item.plan.postNavigation.routeChanged === false).length, 3);
assert.equal(lifecycleRows.filter(item =>
  item.plan.action.primaryCompletion.mode === "request").length, 391);
assert.equal(lifecycleRows.filter(item =>
  item.plan.action.primaryCompletion.mode === "local").length, 28);
assert.equal(new Set(impact.cases.map(item => item.caseId)).size, 424);
assert.ok(impact.cases.every(item =>
  item.postActionVisualLifecycle.exactOneOwnerRequired === true &&
  item.postActionVisualLifecycle.invisibleSourceRewaitAllowed === false &&
  item.postActionVisualLifecycle.staleSourceScrollAllowed === false));

const requestNavigationCensus = buildRequestNavigationCensus(manifest);
assert.deepEqual(requestNavigationCensus.counts, {
  "document-form-redirect": 9,
  "same-route-document-form": 2,
  "readback-route-roundtrip": 5,
  "same-route-reload": 1,
  "same-document-no-navigation": 374,
});
assert.equal(requestNavigationCensus.requestCompletionCount, 391);
assert.equal(requestNavigationCensus.navigationSideEffectCount, 17);
assert.equal(requestNavigationCensus.exactOneClassificationCount, 391);
assert.deepEqual(requestNavigationCensus.caseIds["readback-route-roundtrip"], [
  "UI-008", "AUTH-036", "EVT-058", "SAFE-033", "SAFE-041",
]);
assert.deepEqual(requestNavigationCensus.caseIds["same-route-reload"], ["CLIENT-010"]);
assert.deepEqual(requestNavigationCensus.caseIds["same-route-document-form"], [
  "AUTH-007", "AUTH-035",
]);

const ui008NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("UI-008"));
assert.equal(ui008NavigationPlan.classification, "readback-route-roundtrip");
assert.deepEqual(ui008NavigationPlan.steps.map(step => step.invocationId), [
  "UI-008:form-readback-source-navigation",
  "UI-008:form-readback-restore-navigation",
]);
const ui008NavigationBinding = bindRequestNavigationLifecycle(
  ui008NavigationPlan,
  requestNavigationLifecycles(ui008NavigationPlan, 1),
  {
    sourceBeforeObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/client/request-access", 3),
  },
);
assert.equal(ui008NavigationBinding.navigationCount, 2);
assert.equal(ui008NavigationBinding.epochRelation, "advanced-readback");
const ui008VisualTarget = resolvePostActionVisualTarget(plan("UI-008"), {
  visualContext: context("/client/request-access", 3),
  sourceBeforeObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
  sourceObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
  requestNavigationLifecycleBinding: ui008NavigationBinding,
});
assert.equal(ui008VisualTarget.selector, "body");
assert.equal(ui008VisualTarget.bindingKind, "post-readback-visible-document-owner");

const auth006NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("AUTH-006"));
assert.equal(auth006NavigationPlan.classification, "document-form-redirect");
assert.equal(auth006NavigationPlan.steps.length, 3);
const evt058NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("EVT-058"));
assert.equal(evt058NavigationPlan.classification, "readback-route-roundtrip");
assert.equal(evt058NavigationPlan.steps.length, 2);
const client010NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("CLIENT-010"));
assert.equal(client010NavigationPlan.classification, "same-route-reload");
assert.equal(client010NavigationPlan.steps.length, 1);
const ui109NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("UI-109"));
assert.equal(ui109NavigationPlan.classification, "same-document-no-navigation");
assert.equal(ui109NavigationPlan.steps.length, 0);

for (const mutation of [
  lifecycles => lifecycles.slice(1),
  lifecycles => [...lifecycles, structuredClone(lifecycles[0])],
  lifecycles => [{ ...lifecycles[0], invocationId: "wrong" }, ...lifecycles.slice(1)],
  lifecycles => [{ ...lifecycles[0], sourceRoute: "/wrong" }, ...lifecycles.slice(1)],
  lifecycles => [{ ...lifecycles[0], destinationRoute: "/wrong" }, ...lifecycles.slice(1)],
  lifecycles => [{ ...lifecycles[0], kind: "wrong" }, ...lifecycles.slice(1)],
  lifecycles => [{
    ...lifecycles[0],
    sourceOwner: { ...lifecycles[0].sourceOwner, selector: "#wrong" },
  }, ...lifecycles.slice(1)],
  lifecycles => [{
    ...lifecycles[0],
    sourceOwner: { ...lifecycles[0].sourceOwner, navigationEpoch: 0 },
    destinationOwner: { ...lifecycles[0].destinationOwner, navigationEpoch: 1 },
  }, ...lifecycles.slice(1)],
  lifecycles => [{
    ...lifecycles[0],
    destinationOwner: {
      ...lifecycles[0].destinationOwner,
      navigationEpoch: lifecycles[0].sourceOwner.navigationEpoch,
    },
  }, ...lifecycles.slice(1)],
  lifecycles => [{
    ...lifecycles[0],
    sourceOwner: { ...lifecycles[0].sourceOwner, visible: false },
  }, ...lifecycles.slice(1)],
]) assert.throws(() => bindRequestNavigationLifecycle(
  ui008NavigationPlan,
  mutation(requestNavigationLifecycles(ui008NavigationPlan, 1)),
  {
    sourceBeforeObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/client/request-access", 3),
  },
));
assert.throws(() => bindRequestNavigationLifecycle(
  ui109NavigationPlan,
  [requestNavigationLifecycles(ui008NavigationPlan, 1)[0]],
  {
    sourceBeforeObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/ops/sources", 2),
  },
), /cardinality mismatch/);

const ui109 = plan("UI-109");
const ui109Hidden = resolvePostActionVisualTarget(ui109, {
  visualContext: context("/ops/sources", 1),
  sourceBeforeObservation: observation(ui109.preAction.selector, 1, true, true),
  sourceObservation: observation(ui109.preAction.selector, 1, true, false),
});
assert.equal(ui109Hidden.selector, red.firstFailure.expectedGreenSelector);
assert.equal(ui109Hidden.bindingKind, red.firstFailure.expectedGreenBindingKind);
assert.equal(ui109Hidden.sourceHidden, true);
assert.equal(ui109Hidden.sourceSelectorRewaited, false);

const ui029 = plan("UI-029");
const detached = resolvePostActionVisualTarget(ui029, {
  visualContext: context("/ops/vlm", 1),
  sourceBeforeObservation: observation(ui029.preAction.selector, 1, true, true),
  sourceObservation: observation(ui029.preAction.selector, 1, false, false),
});
assert.equal(detached.selector, "body");
assert.equal(detached.sourceDetached, true);

const visible = resolvePostActionVisualTarget(ui109, {
  visualContext: context(ui109.postNavigation.route, 1),
  sourceBeforeObservation: observation(ui109.preAction.selector, 1, true, true),
  sourceObservation: observation(ui109.preAction.selector, 1, true, true),
});
assert.equal(visible.selector, ui109.preAction.selector);
assert.equal(visible.bindingKind, "post-action-visible-source-owner");

const ui046 = plan("UI-046");
assert.equal(ui046.postNavigation.transitionKind, "local-route-transition");
assert.equal(ui046.postNavigation.route, "/ops/rules");
const localRoute = resolvePostActionVisualTarget(ui046, {
  visualContext: context("/ops/rules", 2),
  sourceBeforeObservation: observation(ui046.preAction.selector, 1, true, true),
  sourceObservation: observation(ui046.preAction.selector, 2, false, false),
  destinationObservation: observation(ui046.postNavigation.selector, 2, true, true),
});
assert.equal(localRoute.bindingKind, "post-action-visible-destination-owner");
assert.equal(localRoute.selector, '[data-testid="ops-rules-page"]');

const safe016 = plan("SAFE-016");
const navigation = resolvePostActionVisualTarget(safe016, {
  visualContext: context("/__v390-undefined-route__", 2),
  sourceBeforeObservation: observation("body", 1, true, true),
  sourceObservation: observation("body", 2, true, true),
  destinationObservation: observation("body", 2, true, true),
});
assert.equal(navigation.completionMode, "navigation");
assert.equal(navigation.bindingKind, "post-action-visible-destination-owner");

const evt004 = plan("EVT-004");
assert.equal(evt004.postNavigation.routeChanged, false);
assert.equal(evt004.postNavigation.navigationEpochRelation, "advanced");
const sameRouteNavigation = resolvePostActionVisualTarget(evt004, {
  visualContext: context(evt004.postNavigation.route, 9),
  sourceBeforeObservation: observation(evt004.preAction.selector, 8, true, true),
  sourceObservation: observation(evt004.preAction.selector, 9, true, true),
});
assert.equal(sameRouteNavigation.bindingKind, "post-action-visible-document-owner");
assert.equal(sameRouteNavigation.epochRelation, "advanced");
assert.throws(() => resolvePostActionVisualTarget(evt004, {
  visualContext: context(evt004.postNavigation.route, 9),
  sourceBeforeObservation: observation(evt004.preAction.selector, 9, true, true),
  sourceObservation: observation(evt004.preAction.selector, 9, true, true),
}), /navigation completion epoch did not advance/);

const ui001 = plan("UI-001");
const ui001Lifecycle = navigationLifecycle(ui001, {
  kind: "initial-document-navigation",
  sourceRoute: "about:blank",
  sourceEpoch: 0,
  destinationEpoch: 2,
});
const ui001PreOwner = bindNavigationPreActionVisualOwner(
  ui001,
  selectExactNavigationOwnerLifecycle([ui001Lifecycle],
    ui001.action.primaryCompletion.navigationBinding.invocationId),
);
assert.equal(ui001PreOwner.sourceOwner.selector, "body");
assert.equal(ui001PreOwner.sourceOwner.navigationEpoch, 0);
assert.equal(ui001PreOwner.destinationOwner.navigationEpoch, 2);

const ui002 = plan("UI-002");
const ui002Lifecycle = navigationLifecycle(ui002, {
  kind: "form-submit-document-navigation",
  invocationId: ui002.action.documentRequest.navigationInvocationId,
  sourceRoute: ui002.preAction.route,
  sourceSelector: ui002.preAction.selector,
  sourceEpoch: 1,
  destinationEpoch: 2,
});
assert.equal(bindNavigationPreActionVisualOwner(ui002, ui002Lifecycle)
  .sourceOwner.selector, ui002.preAction.selector);

assert.throws(() => selectExactNavigationOwnerLifecycle([], "missing"),
  /cardinality mismatch: 0/);
assert.throws(() => selectExactNavigationOwnerLifecycle([
  ui001Lifecycle,
  structuredClone(ui001Lifecycle),
], ui001Lifecycle.invocationId), /cardinality mismatch: 2/);
for (const invalid of [
  { ...ui001Lifecycle, caseId: "wrong" },
  { ...ui001Lifecycle, invocationId: "wrong" },
  { ...ui001Lifecycle, action: "/wrong" },
  { ...ui001Lifecycle, sourceRoute: "/wrong" },
  {
    ...ui001Lifecycle,
    sourceOwner: { ...ui001Lifecycle.sourceOwner, selector: "#wrong" },
  },
  {
    ...ui001Lifecycle,
    destinationOwner: { ...ui001Lifecycle.destinationOwner, visible: false },
  },
  {
    ...ui001Lifecycle,
    destinationOwner: {
      ...ui001Lifecycle.destinationOwner,
      navigationEpoch: ui001Lifecycle.sourceOwner.navigationEpoch,
    },
  },
]) assert.throws(() => bindNavigationPreActionVisualOwner(ui001, invalid));

for (const invalid of [
  () => resolvePostActionVisualTarget(ui109, {
    visualContext: context("/wrong", 1),
    sourceBeforeObservation: observation(ui109.preAction.selector, 1, true, true),
    sourceObservation: observation(ui109.preAction.selector, 1, true, false),
  }),
  () => resolvePostActionVisualTarget(ui109, {
    visualContext: context("/ops/sources", 1),
    sourceBeforeObservation: observation(ui109.preAction.selector, 1, true, true),
    sourceObservation: { ...observation(ui109.preAction.selector, 1, true, true), candidateCount: 2 },
  }),
  () => resolvePostActionVisualTarget(ui109, {
    visualContext: context("/ops/sources", 1),
    sourceBeforeObservation: observation(ui109.preAction.selector, 1, true, true),
    sourceObservation: observation("#wrong", 1, true, true),
  }),
  () => resolvePostActionVisualTarget(ui046, {
    visualContext: context("/ops/rules", 1),
    sourceBeforeObservation: observation(ui046.preAction.selector, 1, true, true),
    sourceObservation: observation(ui046.preAction.selector, 1, false, false),
    destinationObservation: observation(ui046.postNavigation.selector, 1, true, true),
  }),
  () => resolvePostActionVisualTarget(ui046, {
    visualContext: context("/ops/rules", 2),
    sourceBeforeObservation: observation(ui046.preAction.selector, 1, true, true),
    sourceObservation: observation(ui046.preAction.selector, 2, false, false),
    destinationObservation: observation(ui046.postNavigation.selector, 2, true, false),
  }),
]) assert.throws(invalid);

const runnerSource = fs.readFileSync(path.join(rootDir,
  "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
const adapterSource = fs.readFileSync(path.join(rootDir,
  "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
assert.ok(runnerSource.includes("browser.observePostActionVisualContext()"));
assert.ok(runnerSource.includes("browser.navigationOwnerLifecycle("),
  "runner must consume the pre-action owner captured before document navigation");
assert.ok(runnerSource.includes("browser.navigationOwnerLifecycles()"),
  "runner must consume the exact post-action request navigation lifecycle sequence");
assert.ok(runnerSource.includes("bindRequestNavigationLifecycle("),
  "runner must bind request navigation side-effects before visual owner selection");
assert.ok(runnerSource.includes("ownerBinding: postActionVisualTarget"));
assert.ok(!runnerSource.includes("postActionDestinationLifecycleRequired(postActionLifecyclePlan)"));
assert.ok(adapterSource.includes("post-action visual owner is not visible"));
assert.ok(adapterSource.includes("navigationOwnerLifecycle:"),
  "adapter must expose exact pre/post document navigation owner lifecycle evidence");
assert.ok(adapterSource.includes("element.scrollIntoView({"));
assert.ok(adapterSource.includes("sourceSelectorRewaited" ) === false,
  "adapter must consume the resolved owner, not recreate source lifecycle policy");

console.log("== v3.9.0 post-action visual owner contract ==");
console.log("- latest canonical RED: PASS 107 / FAIL UI-109 / not-run 316 replay-bound");
console.log("- canonical census: PASS 424/424 exact-one owner lifecycle");
console.log("- request navigation census: PASS 391/391 exact-one classification; side-effect 17 / none 374");
console.log("- source visible/hidden/detached, route-change, local, navigation: PASS");
console.log("- wrong route/selector/epoch/cardinality/hidden destination: fail-closed PASS");

function plan(caseId) {
  const item = byId.get(caseId);
  assert.ok(item, `${caseId} missing from canonical manifest`);
  return buildPostActionLifecyclePlan(item);
}

function observation(selector, navigationEpoch, exists, visible) {
  return {
    selector,
    candidateCount: exists ? 1 : 0,
    navigationEpoch,
    exists,
    visible,
    url: "http://127.0.0.1/",
  };
}

function context(route, navigationEpoch) {
  return {
    schema: "media-server.v390-ui-post-action-visual-context.v1",
    route,
    navigationEpoch,
    documentOwner: observation("body", navigationEpoch, true, true),
  };
}

function navigationLifecycle(lifecyclePlan, {
  kind,
  invocationId = lifecyclePlan.action.primaryCompletion.navigationBinding?.invocationId,
  sourceRoute,
  sourceSelector = "body",
  sourceEpoch,
  destinationEpoch,
} = {}) {
  return {
    schema: "media-server.v390-ui-navigation-owner-lifecycle.v1",
    caseId: lifecyclePlan.caseId,
    invocationId,
    kind,
    action: kind === "form-submit-document-navigation"
      ? lifecyclePlan.preAction.selector
      : lifecyclePlan.action.primaryCompletion.navigationBinding?.requestedPath,
    sourceRoute,
    destinationRoute: lifecyclePlan.postNavigation.route,
    sourceOwner: observation(sourceSelector, sourceEpoch, true, true),
    destinationOwner: observation("body", destinationEpoch, true, true),
  };
}

function requestNavigationLifecycles(requestPlan, initialEpoch) {
  let epoch = initialEpoch;
  return requestPlan.steps.map(step => {
    const lifecycle = {
      schema: "media-server.v390-ui-navigation-owner-lifecycle.v1",
      caseId: requestPlan.caseId,
      invocationId: step.invocationId,
      kind: step.kind,
      action: step.action,
      sourceRoute: step.sourceRoute,
      destinationRoute: step.destinationRoute,
      sourceOwner: observation(step.sourceSelector, epoch, true, true),
      destinationOwner: observation("body", epoch + 1, true, true),
    };
    epoch += 1;
    return lifecycle;
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function documentFormCase(item) {
  return documentFormSubmitContract(item.caseId) !== null;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
