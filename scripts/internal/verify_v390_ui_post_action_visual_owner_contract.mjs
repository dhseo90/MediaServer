#!/usr/bin/env node
// 파일 용도: latest canonical actual RED와 canonical 424 post-action visual exact-one owner lifecycle을 검증한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalSharedAdapterImpact,
  buildPostActionLifecyclePlan,
  resolvePostActionVisualTarget,
} from "./v390_ui_shared_adapter_lifecycle.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const red = readJson("test/fixtures/v390_ui_post_action_visual_owner_red_20260809.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const storedImpact = readJson("test/fixtures/v390_ui_shared_adapter_impact.json");
const byId = new Map(manifest.cases.map(item => [item.caseId, item]));

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
assert.equal(new Set(impact.cases.map(item => item.caseId)).size, 424);
assert.ok(impact.cases.every(item =>
  item.postActionVisualLifecycle.exactOneOwnerRequired === true &&
  item.postActionVisualLifecycle.invisibleSourceRewaitAllowed === false &&
  item.postActionVisualLifecycle.staleSourceScrollAllowed === false));

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
assert.ok(runnerSource.includes("ownerBinding: postActionVisualTarget"));
assert.ok(!runnerSource.includes("postActionDestinationLifecycleRequired(postActionLifecyclePlan)"));
assert.ok(adapterSource.includes("post-action visual owner is not visible"));
assert.ok(adapterSource.includes("element.scrollIntoView({"));
assert.ok(adapterSource.includes("sourceSelectorRewaited" ) === false,
  "adapter must consume the resolved owner, not recreate source lifecycle policy");

console.log("== v3.9.0 post-action visual owner contract ==");
console.log("- latest canonical RED: PASS 107 / FAIL UI-109 / not-run 316 replay-bound");
console.log("- canonical census: PASS 424/424 exact-one owner lifecycle");
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
