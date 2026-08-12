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
import {
  bindActionOwnedRequestLedger,
  bindInitialRouteSettling,
  buildInitialRouteSettlingCensus,
  buildInitialRouteSettlingPlan,
  matchesMaterializedRequestTemplate,
} from "./v390_ui_initial_route_settling.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const red = readJson("test/fixtures/v390_ui_post_action_visual_owner_red_20260809.json");
const navigationRed = readJson("test/fixtures/v390_ui_navigation_pre_post_owner_red_20260809.json");
const requestNavigationRed = readJson("test/fixtures/v390_ui_request_navigation_epoch_red_20260809.json");
const redirectChainRed = readJson("test/fixtures/v390_ui_request_redirect_chain_red_20260809.json");
const initialRouteRed = readJson("test/fixtures/v390_ui_initial_route_settling_red_20260810.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const storedImpact = readJson("test/fixtures/v390_ui_shared_adapter_impact.json");
const byId = new Map(manifest.cases.map(item => [item.caseId, item]));

assert.equal(initialRouteRed.schema,
  "media-server.v390-ui-initial-route-settling-red.v1");
assert.equal(initialRouteRed.sourceCommitSha,
  "fe7c4611dde964c006685db9f794f128c483023a");
assert.equal(initialRouteRed.actualBrowserExecution, true);
assert.equal(initialRouteRed.releaseEvidenceEligible, false);
assert.deepEqual(initialRouteRed.coverage, {
  target: 424,
  attempted: 9,
  pass: 8,
  fail: 1,
  notRun: 415,
  unsupported: 0,
});
assert.equal(initialRouteRed.firstFailure.caseId, "UI-010");
assert.equal(initialRouteRed.firstFailure.failureLifecycleRequestedPath, "/");
assert.equal(initialRouteRed.firstFailure.failureLifecycleExpectedObservedPath, "/");
assert.equal(initialRouteRed.firstFailure.failureLifecycleObservedPath, "/ops/dashboard");
assert.equal(initialRouteRed.firstFailure.initialDocumentRequestedPath, "/ops/dashboard");
assert.equal(initialRouteRed.firstFailure.initialDocumentEpoch, 1);
assert.equal(initialRouteRed.firstFailure.primaryAdditionalFetchCountMisclassified, 1);
assert.equal(initialRouteRed.firstFailure.primaryRequestReissuedMisclassified, true);
assert.deepEqual(initialRouteRed.capturedBeforeFailure,
  ["UI-001", "UI-002", "UI-003", "UI-004", "UI-005", "UI-007", "UI-008", "UI-009"]);
for (const artifact of Object.values(initialRouteRed.artifacts)) {
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  const filePath = path.join(rootDir, artifact.path);
  if (artifact.path.includes("/runs/") && fs.existsSync(filePath)) {
    assert.equal(sha256File(filePath), artifact.sha256);
  }
}

assert.equal(redirectChainRed.schema,
  "media-server.v390-ui-request-redirect-chain-red.v1");
assert.equal(redirectChainRed.sourceCommitSha,
  "5a02ce81407de7f297d83d56951f3dc84c57ca9d");
assert.equal(redirectChainRed.actualBrowserExecution, true);
assert.equal(redirectChainRed.releaseEvidenceEligible, false);
assert.deepEqual(redirectChainRed.coverage, {
  target: 424,
  attempted: 2,
  pass: 1,
  fail: 1,
  notRun: 422,
  unsupported: 0,
});
assert.equal(redirectChainRed.firstFailure.caseId, "UI-002");
assert.equal(redirectChainRed.firstFailure.sourceBeforeEpoch, 1);
assert.equal(redirectChainRed.firstFailure.destinationAfterEpoch, 3);
assert.equal(redirectChainRed.firstFailure.actualOwnedDocumentCommits, 2);
assert.deepEqual(redirectChainRed.firstFailure.orderedDocumentChain.map(hop => [
  hop.method, hop.path, hop.responseStatus, hop.navigationEpoch,
]), [["POST", "/setup", 302, 2], ["GET", "/login", 200, 3]]);
for (const artifact of Object.values(redirectChainRed.artifacts)) {
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/);
  const filePath = path.join(rootDir, artifact.path);
  if (artifact.path.includes("/runs/") && fs.existsSync(filePath)) {
    assert.equal(sha256File(filePath), artifact.sha256);
  }
}

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
  if (artifact.path.includes("/runs/") && fs.existsSync(filePath)) {
    assert.equal(sha256File(filePath), artifact.sha256);
  }
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
  if (artifact.path.includes("/runs/") && fs.existsSync(filePath)) {
    assert.equal(sha256File(filePath), artifact.sha256);
  }
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
  if (artifact.path.includes("/runs/") && fs.existsSync(filePath)) {
    assert.equal(sha256File(filePath), artifact.sha256);
  }
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
assert.equal(impact.postActionVisualCensus.routeChangeCaseCount, 14);
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
assert.equal(lifecycleRows.filter(item => item.plan.postNavigation.routeChanged).length, 14);
assert.equal(lifecycleRows.filter(item =>
  item.plan.action.primaryCompletion.mode === "navigation" &&
  item.plan.postNavigation.routeChanged === false).length, 2);
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
assert.equal(requestNavigationCensus.declaredDocumentHopCount, 33);
assert.equal(requestNavigationCensus.exactOneClassificationCount, 391);
assert.deepEqual(requestNavigationCensus.caseIds["readback-route-roundtrip"], [
  "UI-008", "AUTH-036", "EVT-058", "SAFE-033", "SAFE-041",
]);
assert.deepEqual(requestNavigationCensus.caseIds["same-route-reload"], ["CLIENT-010"]);
assert.deepEqual(requestNavigationCensus.caseIds["same-route-document-form"], [
  "AUTH-007", "AUTH-035",
]);

const initialRouteCensus = buildInitialRouteSettlingCensus(manifest);
assert.equal(initialRouteCensus.canonicalCaseCount, 424);
assert.equal(initialRouteCensus.requestCompletionCount, 391);
assert.equal(initialRouteCensus.expectedDocumentHopCount, 425);
assert.deepEqual(initialRouteCensus.routeClassifications, {
  "requested-equals-settled": 423,
  "initial-http-redirect": 1,
});
assert.deepEqual(initialRouteCensus.redirectClassifications, {
  "role-landing-redirect": 1,
  "login-setup-redirect": 1,
  "other-initial-redirect": 0,
  "not-redirected": 423,
});
assert.deepEqual(initialRouteCensus.landingClassifications, {
  "login-setup-landing": 18,
  "client-landing": 44,
  "operator-landing": 361,
  "lab-landing": 1,
});
assert.deepEqual(initialRouteCensus.roleCounts, {
  admin: 21,
  anonymous: 17,
  operator: 343,
  viewer: 43,
});
assert.deepEqual(initialRouteCensus.finalStatusContractCounts, {
  200: 423,
  404: 1,
});
assert.deepEqual(initialRouteCensus.redirectLocationCounts, { "/login": 1 });
assert.equal(Object.keys(initialRouteCensus.requestedSettledRoutePairs).length, 18);
assert.equal(Object.values(initialRouteCensus.requestedSettledRoutePairs)
  .reduce((sum, count) => sum + count, 0), 424);
assert.equal(initialRouteCensus.actionSourceRouteDiffCount, 9);
assert.deepEqual(initialRouteCensus.redirectedCaseIds, ["UI-001"]);
assert.deepEqual(initialRouteCensus.roleLandingRedirectCaseIds, ["UI-001"]);
assert.deepEqual(initialRouteCensus.loginSetupRedirectCaseIds, ["UI-001"]);

const allInitialRouteBindings = manifest.cases.map(item => {
  const plan = buildInitialRouteSettlingPlan(item);
  return bindInitialRouteSettling(
    plan,
    initialRouteAttestation(plan),
    item.accountRole,
  );
});
assert.equal(allInitialRouteBindings.length, 424);
assert.ok(allInitialRouteBindings.every(binding => binding.pass === true));

const ui001InitialPlan = buildInitialRouteSettlingPlan(byId.get("UI-001"));
assert.equal(ui001InitialPlan.requestedRoute, "/");
assert.equal(ui001InitialPlan.settledRoute, "/login");
assert.equal(ui001InitialPlan.expectedDocumentCount, 2);
assert.equal(bindInitialRouteSettling(
  ui001InitialPlan,
  initialRouteAttestation(ui001InitialPlan),
  "anonymous",
).pass, true);
const ui010InitialPlan = buildInitialRouteSettlingPlan(byId.get("UI-010"));
const ui010InitialBinding = bindInitialRouteSettling(
  ui010InitialPlan,
  initialRouteAttestation(ui010InitialPlan),
  "operator",
);
assert.equal(ui010InitialBinding.sourceOwnerSelector, "body");
assert.equal(ui010InitialBinding.finalEpoch, 1);

for (const mutation of [
  evidence => { evidence.observedRoute = "/wrong"; },
  evidence => { evidence.status = 302; },
  evidence => { evidence.redirectCount = 1; },
  evidence => { evidence.documentChain = []; },
  evidence => { evidence.documentChain.push(structuredClone(evidence.documentChain[0])); },
  evidence => { evidence.documentChain[0].path = "/wrong"; },
  evidence => { evidence.documentChain[0].responseStatus = 500; },
  evidence => { evidence.documentChain[0].responseRequestId = "wrong"; },
  evidence => { evidence.documentChain[0].navigationEpoch = 2; },
  evidence => { evidence.settledDocumentOwner.candidateCount = 2; },
  evidence => { evidence.sourceBeforeOwner.visible = false; },
  evidence => { evidence.sourceBeforeOwner = null; },
  evidence => { evidence.actionOwnedRequestCount = 1; },
]) assert.throws(() => bindInitialRouteSettling(
  ui010InitialPlan,
  mutate(initialRouteAttestation(ui010InitialPlan), mutation),
  "operator",
));
assert.throws(() => bindInitialRouteSettling(
  ui010InitialPlan,
  initialRouteAttestation(ui010InitialPlan),
  "viewer",
), /role mismatch/);
assert.throws(() => bindInitialRouteSettling(
  ui001InitialPlan,
  mutate(initialRouteAttestation(ui001InitialPlan), evidence => {
    evidence.documentChain.reverse();
  }),
  "anonymous",
), /route\/order mismatch/);

const ui010ActionStart = actionLedgerStart(ui010InitialPlan, 1, 10);
const ui010ActionEntries = actionRequestEntries(ui010InitialPlan, 11, true);
const ui010ActionBinding = bindActionOwnedRequestLedger(
  ui010InitialPlan,
  ui010ActionStart,
  ui010ActionEntries,
);
assert.equal(ui010ActionBinding.requestCount, 1);
assert.equal(ui010ActionBinding.responseCount, 1);
assert.equal(ui010ActionBinding.additionalFetchCount, 0);
assert.equal(ui010ActionBinding.pageOwnedRequestCount, 1);
assert.equal(ui010ActionBinding.pageOwnedResponseCount, 1);
assert.equal(ui010ActionBinding.actionCorrelationLeakCount, 0);
assert.equal(ui010ActionBinding.primaryResponseStatus, 200);
for (const mutation of [
  entries => { entries.shift(); },
  entries => { entries.push(structuredClone(entries[0])); },
  entries => { entries[0].initiatorActionId = "wrong"; },
  entries => { entries[0].correlationId = "wrong"; },
  entries => { entries[0].caseRequestSequence = 10; },
  entries => { entries[1].requestId = "wrong"; },
  entries => { entries[1].responseRequestObjectObserved = false; },
  entries => { entries[1].status = 500; },
  entries => { entries.splice(1, 1); },
  entries => { entries.push(...structuredClone(entries.slice(0, 2))); },
  entries => { entries.splice(0, 2, entries[1], entries[0]); },
  entries => { entries[2].initiatorActionId = ui010InitialPlan.primaryRequest.actionId; },
]) assert.throws(() => bindActionOwnedRequestLedger(
  ui010InitialPlan,
  ui010ActionStart,
  mutate(ui010ActionEntries, mutation),
));
assert.throws(() => bindActionOwnedRequestLedger(
  ui010InitialPlan,
  mutate(ui010ActionStart, value => { value.sourceBeforeOwner.candidateCount = 2; }),
  ui010ActionEntries,
));
assert.throws(() => bindActionOwnedRequestLedger(
  ui010InitialPlan,
  mutate(ui010ActionStart, value => { value.sourceRoute = "/wrong"; }),
  ui010ActionEntries,
), /source route mismatch/);

const ui109InitialPlan = buildInitialRouteSettlingPlan(byId.get("UI-109"));
assert.throws(() => bindActionOwnedRequestLedger(
  ui109InitialPlan,
  mutate(actionLedgerStart(ui109InitialPlan, 1, 10), value => {
    value.sourceBeforeOwner.visible = false;
  }),
  actionRequestEntries(ui109InitialPlan, 11, false),
), /source-before owner mismatch/);

const rule017InitialPlan = buildInitialRouteSettlingPlan(byId.get("RULE-017"));
const rule017Start = actionLedgerStart(rule017InitialPlan, 1, 10);
const rule017ActionBinding = bindActionOwnedRequestLedger(
  rule017InitialPlan,
  rule017Start,
  actionRequestEntries(rule017InitialPlan, 11, false),
  { executionOwnerSelector: "#opsEventRuleIdInput" },
);
assert.equal(rule017Start.sourceBeforeOwner.selector, "body");
assert.equal(rule017Start.sourceControl.selector, "#opsEventRuleIdInput");
assert.equal(rule017ActionBinding.caseId, "RULE-017");
const rule017NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("RULE-017"));
const rule017NavigationBinding = bindRequestNavigationLifecycle(
  rule017NavigationPlan,
  requestNavigationScope(rule017NavigationPlan, 1),
  {
    sourceBeforeObservation: observation("body", 1, true, true),
    sourceObservation: observation("#opsEventRuleIdInput", 1, true, false),
    visualContext: context("/ops/rules", 1),
    executionOwnerSelector: "#opsEventRuleIdInput",
  },
);
assert.equal(rule017NavigationBinding.caseId, "RULE-017");
assert.equal(rule017NavigationBinding.sourceOwnerSelector, "body");
const rule017VisualTarget = resolvePostActionVisualTarget(plan("RULE-017"), {
  visualContext: context("/ops/rules", 1),
  sourceBeforeObservation: observation("body", 1, true, true),
  sourceObservation: observation("#opsEventRuleIdInput", 1, true, false),
  requestNavigationLifecycleBinding: rule017NavigationBinding,
  executionOwnerSelector: "#opsEventRuleIdInput",
});
assert.equal(rule017VisualTarget.selector, "body");
assert.equal(rule017VisualTarget.bindingKind, "post-action-visible-document-owner");
assert.equal(rule017VisualTarget.sourceHidden, true);

assert.equal(matchesMaterializedRequestTemplate(
  "/ops/api/events/reviews?selectedEventId={fixtureId}",
  "/ops/api/events/reviews?selectedEventId=evt-075-review4-fixture",
), true);
assert.equal(matchesMaterializedRequestTemplate(
  "/ops/api/events/reviews?selectedEventId={fixtureId}",
  "/ops/api/events/reviews?selectedEventId=evt-075-review4-fixture&extra=1",
), false);
assert.equal(matchesMaterializedRequestTemplate(
  "/ops/api/events/reviews?selectedEventId={fixtureId}",
  "/ops/api/events/reviews?selectedEventId=",
), false);

const ui008NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("UI-008"));
assert.equal(ui008NavigationPlan.classification, "readback-route-roundtrip");
assert.deepEqual(ui008NavigationPlan.steps.map(step => step.invocationId), [
  "UI-008:form-readback-source-navigation",
  "UI-008:form-readback-restore-navigation",
]);
const ui008NavigationBinding = bindRequestNavigationLifecycle(
  ui008NavigationPlan,
  requestNavigationScope(ui008NavigationPlan, 1),
  {
    sourceBeforeObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/client/request-access", 3),
  },
);
assert.equal(ui008NavigationBinding.navigationCount, 2);
assert.equal(ui008NavigationBinding.declaredHopCount, 2);
assert.equal(ui008NavigationBinding.ownedDocumentCommitCount, 2);
assert.equal(ui008NavigationBinding.epochDelta, 2);
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
assert.equal(auth006NavigationPlan.declaredHopCount, 4);
const evt058NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("EVT-058"));
assert.equal(evt058NavigationPlan.classification, "readback-route-roundtrip");
assert.equal(evt058NavigationPlan.steps.length, 2);
const client010NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("CLIENT-010"));
assert.equal(client010NavigationPlan.classification, "same-route-reload");
assert.equal(client010NavigationPlan.steps.length, 1);
const ui109NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("UI-109"));
assert.equal(ui109NavigationPlan.classification, "same-document-no-navigation");
assert.equal(ui109NavigationPlan.steps.length, 0);
assert.equal(ui109NavigationPlan.declaredHopCount, 0);
const ui109HiddenNavigationBinding = bindRequestNavigationLifecycle(
  ui109NavigationPlan,
  requestNavigationScope(ui109NavigationPlan, 1),
  {
    sourceBeforeObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, false),
    visualContext: context("/ops/sources", 1),
    executionOwnerSelector: ui109NavigationPlan.sourceSelector,
  },
);
assert.equal(ui109HiddenNavigationBinding.sourceOwnerSelector,
  ui109NavigationPlan.sourceSelector);

for (const mutation of [
  scope => { scope.ownerLifecycles.shift(); },
  scope => { scope.ownerLifecycles.push(structuredClone(scope.ownerLifecycles[0])); },
  scope => { scope.ownerLifecycles[0].invocationId = "wrong"; },
  scope => { scope.ownerLifecycles[0].sourceRoute = "/wrong"; },
  scope => { scope.ownerLifecycles[0].destinationRoute = "/wrong"; },
  scope => { scope.ownerLifecycles[0].kind = "wrong"; },
  scope => { scope.ownerLifecycles[0].sourceOwner.selector = "#wrong"; },
  scope => { scope.startEpoch = 0; },
  scope => { scope.ownerLifecycles[0].destinationOwner.navigationEpoch = 1; },
  scope => { scope.ownerLifecycles[0].sourceOwner.visible = false; },
]) assert.throws(() => bindRequestNavigationLifecycle(
  ui008NavigationPlan,
  mutateScope(requestNavigationScope(ui008NavigationPlan, 1), mutation),
  {
    sourceBeforeObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui008NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/client/request-access", 3),
  },
));
assert.throws(() => bindRequestNavigationLifecycle(
  ui109NavigationPlan,
  requestNavigationScope(ui008NavigationPlan, 1),
  {
    sourceBeforeObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui109NavigationPlan.sourceSelector, 1, true, true),
    visualContext: context("/ops/sources", 2),
  },
), /cardinality mismatch/);

const ui002NavigationPlan = buildRequestNavigationLifecyclePlan(byId.get("UI-002"));
assert.equal(ui002NavigationPlan.classification, "document-form-redirect");
assert.equal(ui002NavigationPlan.steps.length, 1);
assert.equal(ui002NavigationPlan.declaredHopCount, 2);
assert.deepEqual(ui002NavigationPlan.steps[0].expectedHops.map(hop => [
  hop.method, hop.path, hop.allowedStatuses, hop.redirectTarget,
]), [
  ["POST", "/setup", [302], "/login"],
  ["GET", "/login", [200], ""],
]);
const ui002NavigationBinding = bindRequestNavigationLifecycle(
  ui002NavigationPlan,
  requestNavigationScope(ui002NavigationPlan, 1),
  {
    sourceBeforeObservation: observation(ui002NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui002NavigationPlan.sourceSelector, 1, false, false),
    visualContext: context("/login", 3),
  },
);
assert.equal(ui002NavigationBinding.navigationCount, 1);
assert.equal(ui002NavigationBinding.declaredHopCount, 2);
assert.equal(ui002NavigationBinding.ownedDocumentCommitCount, 2);
assert.equal(ui002NavigationBinding.epochDelta, 2);
assert.equal(ui002NavigationBinding.hopMode, "multi-hop");
assert.equal(ui002NavigationBinding.epochRelation, "advanced-action");

for (const mutation of [
  scope => {
    scope.ownerLifecycles[0].documentChain.hops.pop();
    scope.ownerLifecycles[0].documentChain.hopCount = 1;
    scope.documentNavigations.pop();
  },
  scope => {
    scope.ownerLifecycles[0].documentChain.hops.push(
      structuredClone(scope.ownerLifecycles[0].documentChain.hops[1]),
    );
    scope.ownerLifecycles[0].documentChain.hopCount = 3;
    scope.documentNavigations.push(structuredClone(scope.documentNavigations[1]));
  },
  scope => {
    scope.ownerLifecycles[0].documentChain.hops.reverse();
    scope.documentNavigations.reverse();
  },
  scope => { scope.ownerLifecycles[0].documentChain.hops[0].responseLocationPath = "/wrong"; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[0].responseStatus = 200; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[1].path = "/wrong"; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[1].responseRequestId = "wrong"; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[1].redirectedFromRequestId = "wrong"; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[1].navigationEpoch = 2; },
  scope => { scope.ownerLifecycles[0].documentChain.hops[1].sequence = 4; },
  scope => { scope.documentNavigations.push(structuredClone(scope.documentNavigations[1])); },
  scope => { scope.endEpoch = 4; },
]) assert.throws(() => bindRequestNavigationLifecycle(
  ui002NavigationPlan,
  mutateScope(requestNavigationScope(ui002NavigationPlan, 1), mutation),
  {
    sourceBeforeObservation: observation(ui002NavigationPlan.sourceSelector, 1, true, true),
    sourceObservation: observation(ui002NavigationPlan.sourceSelector, 1, false, false),
    visualContext: context("/login", 3),
  },
));

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
assert.equal(evt004.postNavigation.route, "/ops/dashboard");
assert.equal(evt004.postNavigation.routeChanged, true);
assert.equal(evt004.postNavigation.navigationEpochRelation, "advanced");
const evt004InitialNavigation = navigationLifecycle(evt004, {
  kind: "initial-document-navigation",
  sourceRoute: "about:blank",
  sourceEpoch: 0,
  destinationEpoch: 1,
  destinationRoute: "/ops/events",
});
const evt004PreOwner = bindNavigationPreActionVisualOwner(
  evt004,
  evt004InitialNavigation,
);
assert.equal(evt004PreOwner.destinationRoute, "/ops/events");
const sameRouteNavigation = resolvePostActionVisualTarget(evt004, {
  visualContext: context(evt004.postNavigation.route, 9),
  sourceBeforeObservation: observation(evt004.preAction.selector, 8, true, true),
  sourceObservation: observation(evt004.preAction.selector, 9, true, true),
  destinationObservation: observation("body", 9, true, true),
});
assert.equal(sameRouteNavigation.bindingKind, "post-action-visible-destination-owner");
assert.equal(sameRouteNavigation.epochRelation, "advanced");
assert.throws(() => resolvePostActionVisualTarget(evt004, {
  visualContext: context(evt004.postNavigation.route, 9),
  sourceBeforeObservation: observation(evt004.preAction.selector, 9, true, true),
  sourceObservation: observation(evt004.preAction.selector, 9, true, true),
  destinationObservation: observation("body", 9, true, true),
}), /navigation epoch did not advance/);

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
assert.ok(runnerSource.includes("browser.beginActionNavigationLedger(") &&
  runnerSource.includes("browser.requestNavigationScope("),
"runner must consume the exact action/readback-owned request navigation scope");
assert.ok(runnerSource.includes("browser.attestInitialRouteSettling(") &&
  runnerSource.includes("bindInitialRouteSettling(") &&
  runnerSource.includes("bindActionOwnedRequestLedger("),
"runner must close bootstrap settling before binding the action-owned ledger");
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
assert.ok(adapterSource.includes("bootstrapLedgerClosed: true") &&
  adapterSource.includes("action ledger started before initial route settling") &&
  adapterSource.includes("caseRequestSequenceFloor"),
"adapter must keep bootstrap and action ledgers sequence-separated");

console.log("== v3.9.0 post-action visual owner contract ==");
console.log("- latest actual RED: attempted 9 / PASS 8 / FAIL UI-010 / not-run 415 replay-bound");
console.log("- canonical census: PASS 424/424 exact-one owner lifecycle");
console.log("- request navigation census: PASS 391/391 exact-one classification; side-effect 17 / none 374");
console.log("- initial route census: PASS 424/424; same 423 / redirect 1; landing 18/44/361/1");
console.log("- initial role/status/Location census: 21+17+343+43 / 200=423,404=1 / /login=1");
console.log("- action-owned primary request/response/additional fetch ledger: fail-closed PASS");
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
  destinationRoute = lifecyclePlan.postNavigation.route,
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
    destinationRoute,
    sourceOwner: observation(sourceSelector, sourceEpoch, true, true),
    destinationOwner: observation("body", destinationEpoch, true, true),
  };
}

function requestNavigationScope(requestPlan, initialEpoch) {
  let epoch = initialEpoch;
  let sequence = 10;
  let caseRequestSequence = 1;
  const documentNavigations = [];
  const ownerLifecycles = requestPlan.steps.map(step => {
    let previousRequestId = "";
    const hops = step.expectedHops.map((expectedHop, hopIndex) => {
      const requestId = `${requestPlan.caseId}:request-${caseRequestSequence}`;
      const hop = {
        sequence,
        responseSequence: sequence + 1,
        invocationId: step.invocationId,
        navigationKind: step.kind,
        method: expectedHop.method,
        path: expectedHop.path,
        resourceType: "document",
        sameOrigin: true,
        correlationPresent: false,
        correlationDigest: "",
        redirected: expectedHop.redirected,
        redirectedFromRequestId: previousRequestId,
        requestId,
        caseRequestIdentity: `${requestPlan.caseId}:case-request-${caseRequestSequence}`,
        caseRequestSequence,
        responseStatus: expectedHop.allowedStatuses[0],
        responseBound: true,
        responseRequestId: requestId,
        responseRequestObjectObserved: true,
        responseLocationPath: expectedHop.redirectTarget,
        navigationEpoch: epoch + hopIndex + 1,
        ledgerOwner: expectedHop.networkOwnership === "action-envelope"
          ? "action" : "page",
        sourceOwner: expectedHop.networkOwnership === "action-envelope"
          ? "explicit-action-registration"
          : (expectedHop.networkOwnership === "document-navigation-chain"
              ? "document-navigation-ledger" : "page"),
        ownerPhase: expectedHop.networkOwnership === "action-envelope"
          ? "primary-action"
          : (expectedHop.networkOwnership === "document-navigation-chain"
              ? "document-navigation-chain" : "independent-readback"),
        initiatorActionId: expectedHop.networkOwnership === "action-envelope"
          ? `${requestPlan.caseId}:submit-form` : "",
        requestOwnershipKind: expectedHop.networkOwnership === "action-envelope"
          ? "primary-action"
          : (expectedHop.networkOwnership === "document-navigation-chain"
              ? "document-navigation-chain" : ""),
      };
      previousRequestId = requestId;
      caseRequestSequence += 1;
      sequence += 2;
      documentNavigations.push(structuredClone(hop));
      return hop;
    });
    const lifecycle = {
      schema: "media-server.v390-ui-navigation-owner-lifecycle.v1",
      caseId: requestPlan.caseId,
      invocationId: step.invocationId,
      kind: step.kind,
      action: step.action,
      sourceRoute: step.sourceRoute,
      destinationRoute: step.destinationRoute,
      sourceOwner: observation(step.sourceSelector, epoch, true, true),
      destinationOwner: observation("body", epoch + step.declaredHopCount, true, true),
      documentChain: {
        schema: "media-server.v390-ui-owned-document-chain.v1",
        invocationId: step.invocationId,
        kind: step.kind,
        hopCount: step.declaredHopCount,
        hops,
      },
    };
    epoch += step.declaredHopCount;
    return lifecycle;
  });
  return {
    schema: "media-server.v390-ui-request-navigation-scope.v1",
    startEpoch: initialEpoch,
    endEpoch: epoch,
    ownerLifecycles,
    documentNavigations,
  };
}

function mutateScope(scope, mutation) {
  const clone = structuredClone(scope);
  mutation(clone);
  return clone;
}

function initialRouteAttestation(initialPlan) {
  let sequence = 2;
  let priorRequestId = "";
  const documentChain = initialPlan.expectedChain.map((expected, index) => {
    const requestId = `${initialPlan.caseId}:initial-request-${index + 1}`;
    const hop = {
      sequence,
      responseSequence: sequence + 1,
      invocationId: initialPlan.invocationId,
      navigationKind: "initial-document-navigation",
      method: expected.method,
      path: expected.path,
      resourceType: expected.resourceType,
      sameOrigin: expected.sameOrigin,
      correlationPresent: false,
      correlationDigest: "",
      redirected: expected.redirected,
      redirectedFromRequestId: priorRequestId,
      requestId,
      caseRequestIdentity: `${initialPlan.caseId}:request-${index + 1}`,
      caseRequestSequence: index + 1,
      responseStatus: expected.responseStatuses[0],
      responseBound: true,
      responseRequestId: requestId,
      responseRequestObjectObserved: true,
      responseLocationPath: expected.locationPath,
      navigationEpoch: index + 1,
    };
    priorRequestId = requestId;
    sequence += 2;
    return hop;
  });
  const finalEpoch = initialPlan.expectedDocumentCount;
  const settledControl = observation(
    initialPlan.settledControl.selector,
    finalEpoch,
    true,
    true,
  );
  return {
    schema: "media-server.v390-ui-initial-route-settling-attestation.v1",
    caseId: initialPlan.caseId,
    invocationId: initialPlan.invocationId,
    requestedRoute: initialPlan.requestedRoute,
    observedRoute: initialPlan.settledRoute,
    status: initialPlan.finalAllowedStatuses[0],
    redirectCount: initialPlan.expectedRedirectCount,
    documentChain,
    settledDocumentOwner: observation("body", finalEpoch, true, true),
    settledControl,
    sourceBeforeOwner: structuredClone(settledControl),
    bootstrapApplicationFetchCount: 4,
    bootstrapLedgerClosed: true,
    actionLedgerStarted: false,
    actionOwnedRequestCount: 0,
    actionOwnedNavigationCount: 0,
  };
}

function actionLedgerStart(initialPlan, navigationEpoch, caseRequestSequenceFloor) {
  return {
    schema: "media-server.v390-ui-action-ledger-start.v1",
    caseId: initialPlan.caseId,
    actionId: initialPlan.primaryRequest.actionId,
    correlationId: initialPlan.primaryRequest.correlationId,
    sourceRoute: initialPlan.actionSource.route,
    sourceControl: observation(
      initialPlan.actionSource.selector || "body",
      navigationEpoch,
      true,
      initialPlan.actionSource.applicability === "not-applicable"
        ? true
        : initialPlan.actionSource.expectedVisible,
    ),
    sourceBeforeOwner: observation(
      initialPlan.actionSource.sourceOwnerSelector,
      navigationEpoch,
      true,
      true,
    ),
    navigationEpoch,
    caseRequestSequenceFloor,
    networkEntryCount: caseRequestSequenceFloor * 2,
    navigationCheckpoint: {
      schema: "media-server.v390-ui-request-navigation-checkpoint.v1",
      ownerLifecycleCount: 1,
      documentNavigationCount: initialPlan.expectedDocumentCount,
      navigationEpoch,
    },
  };
}

function actionRequestEntries(initialPlan, firstSequence, includeAdditional) {
  const requests = [{
    method: initialPlan.primaryRequest.method,
    path: initialPlan.primaryRequest.path,
    status: initialPlan.primaryRequest.allowedStatuses[0],
  }];
  if (includeAdditional) {
    requests.push({ method: "GET", path: "/ops/api/runtime/status", status: 200 });
  }
  return requests.flatMap((spec, index) => {
    const caseRequestSequence = firstSequence + index;
    const requestId = `${initialPlan.caseId}:action-request-${caseRequestSequence}`;
    const common = {
      requestId,
      caseRequestIdentity: `${initialPlan.caseId}:request-${caseRequestSequence}`,
      caseRequestSequence,
      requestKind: "application-fetch",
      resourceType: "fetch",
      sameOrigin: true,
      ledgerOwner: index === 0 ? "action" : "page",
      sourceOwner: index === 0 ? "explicit-action-registration" : "page",
      ownerPhase: index === 0 ? "primary-action" : "background-refresh",
      correlationId: index === 0 ? initialPlan.primaryRequest.correlationId : "",
      initiatorActionId: index === 0 ? initialPlan.primaryRequest.actionId : "",
      requestOwnershipKind: index === 0 ? "primary-action" : "background-refresh",
      lifecycleClass: index === 0 ? "primary-action" : "background-fetch",
      method: spec.method,
      url: `http://127.0.0.1${spec.path}`,
    };
    return [{
      phase: "request-start",
      ...common,
    }, {
      phase: "response",
      ...common,
      responseRequestObjectObserved: true,
      requestIdentitySource: "playwright-response-request",
      status: spec.status,
    }];
  });
}

function mutate(value, mutation) {
  const clone = structuredClone(value);
  mutation(clone);
  return clone;
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
