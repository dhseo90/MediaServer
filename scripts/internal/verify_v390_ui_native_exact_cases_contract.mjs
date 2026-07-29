#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 exact 424 native 실행 manifest의 positive/negative 계약을 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildNativeExactManifest,
  createNativeExactExecutionFailureSummary,
  createNativeExactPreExecutionFailureSummary,
  normalizeProductScreenRoute,
  review4WorkflowClassExpectedCounts,
  ruleRelationshipFixtureIdentity,
  validateNativeExactCaptureSummary,
  validateNativeExactCleanupContract,
  validateNativeExactManifest,
  validateNativeExactPreExecutionFailureSummary,
} from "./v390_ui_native_exact_cases_lib.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
  runtimeObservedProjection,
  validateRequestedObservedEnvelope,
} from "./v390_ui_requested_observed_schema.mjs";
import { buildExactRuntimeOracleCatalog } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  assertAuthFixtureAbsentFromUsersFile,
  assertInactiveOrEqualBeforeCleanup,
  createV390UiCaseRuntime,
  eventExactSeedMaterializerRegistry,
  fixtureViewerScopes,
  formReadbackProfiles,
  runtimeFixturePlanFor,
  runAuthoritativeReadbackWithSnapshotRestore,
  seedExactAccessRequestFixture,
  seedEventRecordFixture,
} from "./v390_ui_case_runtime.mjs";
import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
} from "./v390_ui_exact_event_oracles.mjs";
import {
  deduplicateScreenshotArtifacts,
  pruneUnreferencedArtifactFiles,
  scanArtifactTree,
} from "./evidence_integrity_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const runnerSource = fs.readFileSync(path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
const generatorSource = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_v390_ui_native_exact_cases.mjs"), "utf8");
const nativeLibrarySource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_exact_cases_lib.mjs"), "utf8");
const runtimeSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_case_runtime.mjs"), "utf8");
const environmentSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_acceptance_ui_environment.mjs"), "utf8");
const producerSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_policy_v4_evidence_producer.mjs"), "utf8");
const policyLibrarySource = fs.readFileSync(path.join(rootDir, "scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs"), "utf8");
const trackedFiles = new Set(execFileSync("git", ["ls-files"], { cwd: rootDir, encoding: "utf8" })
  .split("\n").filter(Boolean));
const sourceCache = new Map();
const checks = [];
const temporaryDirs = [];
process.on("exit", () => temporaryDirs.forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

check("generated manifest validates against canonical exact ordered 424", () => {
  const result = validateNativeExactManifest({ manifest, canonical, implementation });
  assert(result.caseCount === 424, `caseCount mismatch: ${result.caseCount}`);
  assert(result.unsupported === 0, `unsupported must be zero: ${result.unsupported}`);
  assert(result.positiveNative === 423, `positiveNative mismatch: ${result.positiveNative}`);
  assert(result.negativeRoute === 1, `negativeRoute mismatch: ${result.negativeRoute}`);
});

check("builder is deterministic and preserves exact case order", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  assert(JSON.stringify(rebuilt) === JSON.stringify(manifest), "generated manifest drift");
  assert(JSON.stringify(manifest.cases.map(item => item.caseId)) ===
    JSON.stringify(canonical.cases.map(item => item.testId)), "canonical ordered IDs drift");
});

check("EVT-004 reuses one document navigation and correlates only the authoritative API fetch", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  const item = rebuilt.cases.find(value => value.caseId === "EVT-004");
  const navigation = item?.actions?.[0]?.semanticCompletion?.navigationBinding;
  const primary = item?.workflow?.expectedResults?.[0]?.completion;
  assert(navigation?.requestKind === "document-navigation" &&
    navigation.correlationRequired === false &&
    navigation.exactRequestSequence === 1 &&
    navigation.requestedPath === "/ops/events" &&
    navigation.authoritativeReadback === null,
  "EVT-004 initial document navigation trust binding drift");
  assert(primary?.request === null &&
    primary?.navigationBinding?.requestKind === "document-navigation" &&
    primary.navigationBinding.correlationRequired === false &&
    primary.navigationBinding.exactRequestSequence === 1 &&
    JSON.stringify(primary.navigationBinding.caseLifecycleNavigationSequence) === JSON.stringify([
      {
        purpose: "initial-events-document",
        method: "GET",
        path: "/ops/events",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
      },
      {
        purpose: "required-product-dashboard-dom",
        method: "GET",
        path: "/ops/dashboard",
        resourceType: "document",
        sameOrigin: true,
        correlationRequired: false,
      },
    ]) &&
    primary.navigationBinding.authoritativeReadback?.source === "catalog-runtime-fresh-browser-fetch" &&
    primary.navigationBinding.authoritativeReadback.method === "GET" &&
    primary.navigationBinding.authoritativeReadback.urlPath ===
      "/ops/api/diagnostics/log-tail?limit=50" &&
    primary.navigationBinding.authoritativeReadback.correlationId === primary.correlationId,
  "EVT-004 primary completion did not separate navigation from authoritative API correlation");
  assert(item.actions.filter(action =>
    action.semanticCompletion?.request?.urlPath === "/ops/events").length === 0,
  "EVT-004 retained an additional /ops/events application fetch contract");
});

check("canonical and native generator writes are one validated atomic transaction", () => {
  assert(generatorSource.includes("replaceJsonFixturesAtomically") &&
    generatorSource.includes("[canonicalPath, canonical]") &&
    generatorSource.includes("[manifestPath, generated]") &&
    generatorSource.indexOf("validateNativeExactManifest({ manifest: generated") <
      generatorSource.indexOf("replaceJsonFixturesAtomically({"),
  "canonical/native generator does not validate before its atomic replacement");
  assert(!generatorSource.includes("fs.writeFileSync(canonicalPath") &&
    !generatorSource.includes("fs.writeFileSync(manifestPath"),
  "canonical/native generator retains a partial direct-write path");
});

check("RULE relationship fixtures use one collision-free numeric identity contract", () => {
  const caseIds = ["RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100", "RULE-101"];
  const identities = caseIds.map(caseId => [caseId, ruleRelationshipFixtureIdentity(caseId)]);
  const allIds = identities.flatMap(([, identity]) =>
    [identity.sourceId, identity.viewId, identity.blockedSourceId, identity.blockedViewId].filter(Boolean));
  assert(allIds.every(value => /^\d+$/.test(value)), "RULE relationship source/view identity must be numeric");
  assert(new Set(allIds).size === allIds.length, "RULE relationship source/view identity namespace collision");

  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  const byId = new Map(rebuilt.cases.map(item => [item.caseId, item]));
  for (const caseId of ["RULE-095", "RULE-096"]) {
    const identity = ruleRelationshipFixtureIdentity(caseId);
    assert(byId.get(caseId)?.workflow?.productAction?.localAction?.verificationEndpoint?.path ===
      `/client/api/views/${identity.viewId}/webrtc/session`,
    `${caseId} numeric session identity drift`);
  }
  const rule097Identity = ruleRelationshipFixtureIdentity("RULE-097");
  const rule097Fixture = byId.get("RULE-097")?.workflow?.inputs
    ?.find(input => input.kind === "rejected-endpoint-fixture");
  assert(rule097Fixture?.actualValue?.assignedViewId === rule097Identity.viewId &&
    rule097Fixture?.actualValue?.blockedViewId === rule097Identity.blockedViewId,
  "RULE-097 assigned/blocked numeric identity drift");
  assert(runtimeSource.includes("ruleRelationshipFixtureIdentity(item.caseId)") &&
    runtimeSource.includes("sourceId: relationshipIdentity.blockedSourceId") &&
    runtimeSource.includes("viewId: relationshipIdentity.blockedViewId"),
  "RULE relationship runtime does not consume the shared numeric identity contract");
  assert(runnerSource.includes("ruleRelationshipFixtureIdentity(item.caseId)") &&
    !/rule-(?:093|094|095|096|097|098|100|101)-(?:source|view)/.test(runnerSource),
  "RULE actual browser runner does not consume the shared numeric identity contract");
  for (const caseId of ["RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100", "RULE-101"]) {
    const identity = ruleRelationshipFixtureIdentity(caseId);
    assert(runnerSource.includes("relationshipIdentity.sourceId") ||
      !["RULE-093", "RULE-094", "RULE-100", "RULE-101"].includes(caseId),
    `${caseId} actual browser runner numeric identity binding missing`);
    assert(byId.get(caseId), `${caseId} native relationship case missing`);
    assert(/^\d+$/.test(identity.sourceId) && /^\d+$/.test(identity.viewId),
      `${caseId} relationship identity is not numeric`);
  }
  for (const caseId of ["RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-100", "RULE-101"]) {
    const item = byId.get(caseId);
    const completion = item.workflow.expectedResults[0].completion;
    assert(completion.readbackExpectation.independentRejectedReadbackRequired === true &&
      completion.readbackExpectation.independentProductErrors.length > 0 &&
      item.workflow.controlSequence.some(action =>
        action.kind === "verify-independent-readback" &&
        action.semanticCompletion.linkedPrimaryActionId === item.oracle.primaryActionId),
    `${caseId} DOM and actual product rejection evidence are not both required`);
  }
  for (const caseId of ["RULE-095", "RULE-096", "RULE-101", "RULE-102", "RULE-103"]) {
    assert(byId.get(caseId).workflow.expectedResults[0].completion.readbackExpectation
      .postconditionObservationMode === "after-action-exact",
    `${caseId} refresh still requires an impossible pre/post DOM transition`);
  }
  for (const caseId of ["RULE-097", "RULE-098"]) {
    const item = byId.get(caseId);
    assert(item.workflow.inputs.some(input => input.kind === "rejected-endpoint-fixture") &&
      item.workflow.controlSequence.some(action => action.kind === "verify-independent-readback"),
    `${caseId} read-only relationship case lost actual runtime rejection evidence`);
  }
  assert(runnerSource.includes("explicitObserved?.rejectedActionReadback") &&
    runnerSource.includes("domValidationMatrix") &&
    runnerSource.includes("independentProductReadback") &&
    runtimeSource.includes("runtimeProductResponseObserved: true") &&
    runtimeSource.includes("productErrors"),
  "relationship API response is not preserved as separate runtime evidence");
  let unsupportedRule099 = "";
  try {
    ruleRelationshipFixtureIdentity("RULE-099");
  } catch (error) {
    unsupportedRule099 = String(error?.message || error);
  }
  assert(unsupportedRule099.includes("unsupported rule relationship fixture identity: RULE-099") &&
    !byId.has("RULE-099"),
  "RULE-099 indirect-only relationship contract was incorrectly promoted to an exact UI fixture");
});

check("workflow distribution is owned by the shared exact 424 contract", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  const counts = Object.fromEntries(Object.keys(review4WorkflowClassExpectedCounts).map(workflowClass => [
    workflowClass,
    rebuilt.cases.filter(item => item.workflow.workflowClass === workflowClass).length,
  ]));
  assert(JSON.stringify(counts) === JSON.stringify(review4WorkflowClassExpectedCounts),
    `shared workflow distribution drift: ${JSON.stringify(counts)}`);
  assert(Object.values(counts).reduce((sum, count) => sum + count, 0) === 424,
    "shared workflow distribution total must be exact 424");

  const changed = structuredClone(rebuilt);
  changed.cases.find(item => item.workflow.workflowClass === "actionable").workflow.workflowClass = "read-only-state";
  let rejected = false;
  try {
    validateNativeExactManifest({ manifest: changed, canonical, implementation });
  } catch {
    rejected = true;
  }
  assert(rejected, "workflow class mutation must fail closed");
});

check("declared exact runtime seeds materialize through the shared deterministic fixture registry", () => {
  const runtimeById = new Map(buildExactRuntimeOracleCatalog({ implementation })
    .map(item => [item.caseId, item]));
  const expectedPlans = new Map([
    ["EVT-001", ["viewer-va-overlay-session"]],
    ["EVT-004", ["diagnostic-log-marker"]],
    ["EVT-023", ["event-record"]],
    ["EVT-026", ["event-record", "viewer-va-overlay-session"]],
    ["EVT-048", ["event-record"]],
    ["CLIENT-005", []],
    ["CLIENT-010", ["viewer-live-layout-preference"]],
    ["CLIENT-021", ["event-record"]],
  ]);
  for (const [caseId, expected] of expectedPlans) {
    const actual = runtimeFixturePlanFor(runtimeById.get(caseId));
    assert(JSON.stringify(actual) === JSON.stringify(expected),
      `${caseId} declared runtime fixture plan drift`);
  }
  assert(runtimeFixturePlanFor(runtimeById.get("EVT-003")).length === 0,
    "undeclared runtime seed must not materialize an extra fixture");
  assert(runtimeFixturePlanFor({ seed: { kind: "unknown-runtime-seed" }, setup: { fixtures: ["unrelated"] } }).length === 0,
    "unknown runtime seed must fail closed without materializing a fixture");
  assert(!runtimeFixturePlanFor(runtimeById.get("CLIENT-005")).some(plan => /session/.test(plan)),
    "CLIENT-005 must not precreate a backend session before the composed UI action");
  assert(!runtimeFixturePlanFor(runtimeById.get("CLIENT-021")).some(plan => /session/.test(plan)),
    "CLIENT-021 must not precreate a backend VA session before the composed UI action");
  for (const snippet of [
    "async function materializeExactRuntimeFixturePlan",
    "diagnostic marker is missing from the authoritative log-tail readback",
    "VA overlay session seed is absent from authoritative runtime status",
    "saved layout preference is missing from authoritative readback",
    'roleOverride: "viewer"',
  ]) assert(runtimeSource.includes(snippet), `shared runtime fixture registry contract missing ${snippet}`);
});

check("every exact EVT seed.kind has a declarative store and join materializer", () => {
  const seedKinds = new Set(eventExactOracleCaseIds().map(caseId => eventExactOracleFor(caseId).seed.kind));
  assert(seedKinds.size > 0, "exact EVT seed catalog is empty");
  for (const seedKind of seedKinds) {
    const plan = eventExactSeedMaterializerRegistry[seedKind];
    assert(plan && Number.isInteger(plan.eventRecords) && plan.eventRecords >= 0,
      `exact EVT seed kind is not materialized declaratively: ${seedKind}`);
    assert(Object.keys(plan).every(key => [
      "eventRecords", "archivedRecord", "review", "vlm", "audit", "alert", "sourceHealth",
      "sourceHealthReadback", "related", "evidence",
    ].includes(key)), `exact EVT seed registry contains an unsupported field: ${seedKind}`);
  }
  assert(runtimeSource.includes("async function materializeEventExactSeed") &&
    runtimeSource.includes("eventExactSeedMaterializerRegistry[kind]") &&
    runtimeSource.includes("exact event seed is missing from the authoritative review join readback"),
  "exact EVT runtime does not resolve seed.kind through the shared materializer");
  for (const scope of ["eventRecords", "review", "vlm", "audit", "alert", "sourceHealth", "related"]) {
    assert(runtimeSource.includes(`${scope}:`), `exact EVT runtime seed join evidence is missing: ${scope}`);
  }
});

check("EVT-004 diagnostic log evidence is redacted and byte-restored before native execution", () => {
  const verifier = path.join(rootDir, "scripts/internal/verify_v390_evt004_diagnostic_log_redaction_contract.mjs");
  const run = spawnSync(process.execPath, [verifier], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${run.stdout || ""}\n${run.stderr || ""}`;
  assert(run.status === 0, `EVT-004 diagnostic redaction contract failed:\n${output}`);
  assert(output.includes("- pass: 5") && output.includes("- fail: 0"),
    `EVT-004 diagnostic redaction summary drift:\n${output}`);
});

check("audited route-local primary controls match their exact runtime oracles", () => {
  const runtimeById = new Map(buildExactRuntimeOracleCatalog({ implementation })
    .map(item => [item.caseId, item]));
  const expected = new Map([
    ["EVT-003", ["/ops/dashboard", "#dashRootCauseList", "read-only-state"]],
    ["EVT-018", ["/ops/events", "#alertDeliveryTest", "persisted-mutation"]],
    ["EVT-022", ["/ops/events", "#event-review-audit-list", "read-only-state"]],
    ["SAFE-053", ["/ops/events", "[data-incident-rule-draft-route]", "read-only-state"]],
    ["SAFE-060", ["/ops/events", '[data-testid="ops-operational-action-pack"]', "read-only-state"]],
    ["SAFE-061", ["/ops/events", '[data-testid="ops-rule-what-if-preview"]', "read-only-state"]],
    ["CLIENT-002", ["/client/live", '[data-tile="0"] [data-action="toggle-playback"]', "actionable"]],
    ["CLIENT-018", ["/client/live", ".client-preview-redaction-strip", "read-only-state"]],
    ["CLIENT-021", ["/client/live", '[data-tile="0"] [data-mode-action="va-overlay"]', "actionable"]],
  ]);
  for (const [caseId, [route, selector, workflowClass]] of expected) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const runtime = runtimeById.get(caseId);
    const runtimeSelector = typeof runtime?.visibleControl === "string"
      ? runtime.visibleControl
      : runtime?.visibleControl?.selector;
    assert(runtime?.route === route && runtimeSelector === selector,
      `${caseId} exact runtime route/control drift`);
    assert(item?.workflow.workflowClass === workflowClass &&
      item.workflow.primaryControl.route === route &&
      item.workflow.primaryControl.selector === selector &&
      item.workflow.primaryControl.expectedVisible === true,
    `${caseId} generated route-local primary control drift`);
  }
});

check("endpoint source fixtures intentionally cross the published canonical-media baseline without bypassing sourceId identity", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  const seed = readJson("test/fixtures/manual_ui_fulltest_va_seed_matrix.json");
  const baselineFile = seed.sources.find(item => item.kind === "file" && item.file === "sample_h264.mp4");
  assert(baselineFile, "published acceptance baseline sample_h264.mp4 source is missing");
  const baseline = [{
    sourceId: "9001",
    canonicalSourceKey: `file:${baselineFile.file}`,
    enabled: true,
  }];
  const endpointSources = new Map([
    ["SRC-008", rebuilt.cases.find(item => item.caseId === "SRC-008")?.workflow.inputs
      .find(input => input.kind === "endpoint-action-fixture")?.actualValue?.body],
    ["SRC-010", rebuilt.cases.find(item => item.caseId === "SRC-010")?.workflow.inputs
      .find(input => input.kind === "endpoint-action-fixture")?.actualValue?.setup?.source],
    ["SRC-019", rebuilt.cases.find(item => item.caseId === "SRC-019")?.workflow.inputs
      .find(input => input.kind === "endpoint-action-fixture")?.actualValue?.setup?.source],
  ]);
  const expectedFixtureIds = new Map([
    ["SRC-008", "3900008"],
    ["SRC-010", "3900010"],
    ["SRC-019", "3900019"],
  ]);
  for (const [caseId, expectedFixtureId] of expectedFixtureIds) {
    const item = rebuilt.cases.find(candidate => candidate.caseId === caseId);
    const setup = item?.workflow.setup.find(value => value.kind === "seed-reviewed-state");
    const input = item?.workflow.inputs.find(value => value.kind === "endpoint-action-fixture")?.actualValue;
    assert(setup?.fixtureId === expectedFixtureId,
      `${caseId} fixtureId is not in the deterministic numeric source namespace`);
    assert(input?.body?.sourceId === expectedFixtureId ||
      (input?.setup?.source?.sourceId === expectedFixtureId &&
        input?.setup?.publishedView?.viewId === expectedFixtureId &&
        input?.setup?.publishedView?.sourceId === expectedFixtureId),
    `${caseId} source/view identity did not propagate the numeric fixtureId`);
  }
  const legacy = { ...endpointSources.get("SRC-008") };
  delete legacy.allowDuplicateSource;
  assert(simulateSourceWrite(baseline, legacy, { method: "POST" }).status === 409,
    "legacy SRC-008 fixture did not reproduce the duplicate canonical source 409");
  for (const [caseId, source] of endpointSources) {
    assert(source?.allowDuplicateSource === true,
      `${caseId} endpoint source fixture does not explicitly allow the acceptance-owned canonical media duplicate`);
    const result = simulateSourceWrite(baseline, source, { method: caseId === "SRC-008" ? "POST" : "PUT" });
    assert(result.status === 201 && result.source?.sourceId === source.sourceId && result.source?.enabled === true,
      `${caseId} canonical-collision fixture did not produce 201 plus authoritative source readback`);
  }
  const idCollision = simulateSourceWrite(baseline, {
    ...endpointSources.get("SRC-008"),
    sourceId: "9001",
    allowDuplicateSource: true,
  }, { method: "POST" });
  assert(idCollision.status === 409 && idCollision.reason === "sourceId already exists",
    "allowDuplicateSource bypassed a sourceId collision");
  const nonNumeric = simulateSourceWrite(baseline, {
    ...endpointSources.get("SRC-008"),
    sourceId: "src-008-review4-fixture",
  }, { method: "POST" });
  assert(nonNumeric.status === 400 && nonNumeric.reason === "sourceId must be numeric",
    "mock-only source contract bypassed the product numeric parser");
});

check("inactive-or-equal-before cleanup accepts absent or disabled state and rejects enabled residue", () => {
  assert(assertInactiveOrEqualBeforeCleanup({
    caseId: "SRC-008",
    observed: { source: null, publishedView: null },
    expectedRecord: null,
  }).mode === "inactive", "pre-mutation absent cleanup was rejected");
  assert(assertInactiveOrEqualBeforeCleanup({
    caseId: "SRC-008",
    observed: { source: { sourceId: "src-008", enabled: false }, publishedView: null },
    expectedRecord: null,
  }).mode === "inactive", "post-mutation disabled cleanup was rejected");
  let rejected = false;
  try {
    assertInactiveOrEqualBeforeCleanup({
      caseId: "SRC-008",
      observed: { source: { sourceId: "src-008", enabled: true }, publishedView: null },
      expectedRecord: null,
    });
  } catch (error) {
    rejected = String(error.message).includes("suite-created source/view state was not disabled");
  }
  assert(rejected, "enabled suite-created source state passed cleanup");
});

function simulateSourceWrite(existingSources, payload, { method } = {}) {
  const sourceId = String(payload?.sourceId || "");
  if (!/^[0-9]+$/.test(sourceId)) {
    return { status: 400, reason: "sourceId must be numeric" };
  }
  const canonicalSourceKey = payload?.kind === "file" && payload?.file
    ? `file:${payload.file}`
    : String(payload?.canonicalSourceKey || "");
  if (method === "POST" && existingSources.some(source => source.sourceId === sourceId)) {
    return { status: 409, reason: "sourceId already exists" };
  }
  const duplicate = existingSources.find(source =>
    source.canonicalSourceKey === canonicalSourceKey && source.sourceId !== sourceId);
  if (duplicate && payload?.allowDuplicateSource !== true) {
    return { status: 409, reason: "duplicate source", duplicateSourceId: duplicate.sourceId };
  }
  return {
    status: existingSources.some(source => source.sourceId === sourceId) ? 200 : 201,
    source: { sourceId, canonicalSourceKey, enabled: payload?.enabled !== false },
  };
}

check("non-canonical implementation review metadata does not invalidate the exact 424 manifest", () => {
  const generated = buildNativeExactManifest({ canonical, implementation });
  const metadataOnly = structuredClone(implementation);
  const unrelated = metadataOnly.items.find(item => item.manualUiCaseId === null);
  assert(unrelated?.review?.reason, "non-canonical implementation review fixture missing");
  unrelated.review.reason = `${unrelated.review.reason}|metadata-only-contract-delta`;
  const result = validateNativeExactManifest({ manifest: generated, canonical, implementation: metadataOnly });
  assert(result.caseCount === 424, "metadata-only delta changed exact case coverage");

  const verifierMetadataOnly = structuredClone(implementation);
  const exactItem = verifierMetadataOnly.items.find(item => item.manualUiCaseId === "UI-001");
  assert(exactItem?.semanticEvidence?.verifierAssertion?.assertedSemanticDigest,
    "UI-001 verifier assertion fixture missing");
  exactItem.semanticEvidence.verifierAssertion.assertedSemanticDigest = "0".repeat(64);
  const verifierMetadataResult = validateNativeExactManifest({
    manifest: generated,
    canonical,
    implementation: verifierMetadataOnly,
  });
  assert(verifierMetadataResult.caseCount === 424,
    "verifier-file assertion metadata invalidated the exact case projection");
});

check("exact-case implementation projection drift and whole-file fallback are rejected", () => {
  const generated = buildNativeExactManifest({ canonical, implementation });
  const relevant = structuredClone(implementation);
  const exactItem = relevant.items.find(item => item.manualUiCaseId === "UI-003");
  assert(exactItem?.semanticEvidence?.stateOracle, "UI-003 state oracle fixture missing");
  exactItem.semanticEvidence.stateOracle.expectedBehavior += " projection-drift";
  expectManifestInvalid(generated, canonical, relevant, "implementation case projection drift");

  const wholeFileFallback = structuredClone(generated);
  wholeFileFallback.sourceBindings.implementationSha256 = "0".repeat(64);
  expectManifestInvalid(wholeFileFallback, canonical, implementation,
    "whole-file implementation source binding is forbidden");
});

check("admin-only ops users cases and runtime role schema stay authoritative", () => {
  const canonicalAdminCases = canonical.cases.filter(item => normalizeProductScreenRoute(item.route) === "/ops/users");
  const nativeAdminCases = manifest.cases.filter(item => item.screenRoute === "/ops/users");
  assert(canonicalAdminCases.length === 20, `canonical /ops/users case count mismatch: ${canonicalAdminCases.length}`);
  assert(nativeAdminCases.length === 20, `native /ops/users case count mismatch: ${nativeAdminCases.length}`);
  assert(canonicalAdminCases.every(item => item.accountRole === "admin"),
    "canonical /ops/users cases must use the product admin role");
  assert(nativeAdminCases.every(item => item.accountRole === "admin"),
    "native /ops/users cases must use the product admin role");

  const requested = canonicalRequestedProjection({
    canonicalRoute: "/ops/users",
    accountRole: "admin",
    viewport: { width: 390, height: 844 },
    theme: "light",
    controlAction: { selector: "#user-save-selected", actionAnchor: "CreateAuthUser" },
  });
  const observed = expectedRuntimeObservation({
    accountRole: "admin",
    viewport: { width: 390, height: 844 },
    theme: "light",
    screenRoute: "/ops/users",
    workflow: {
      primaryControl: {
        accountRole: "admin",
        route: "/ops/users",
        selector: "#user-save-selected",
        applicability: "required",
        expectedVisible: true,
        expectedEnabled: true,
      },
    },
  });
  assert(validateRequestedObservedEnvelope({ requested, observed }).length === 0,
    "requested/observed runtime schema rejected the product admin role");

  const invalidCanonical = structuredClone(canonical);
  invalidCanonical.cases[0].accountRole = "integrator";
  let invalidRoleMessage = "";
  try {
    buildNativeExactManifest({ canonical: invalidCanonical, implementation });
  } catch (error) {
    invalidRoleMessage = String(error?.message || error);
  }
  assert(invalidRoleMessage.includes("unsupported canonical account role"),
    `unsupported canonical account role was accepted: ${invalidRoleMessage}`);
});

check("API ownership routes normalize to product screens", () => {
  const expected = new Map([
    ["/", "/login"],
    ["/logout", "/ops/home"],
    ["/ops/api/events/reviews", "/ops/events"],
    ["/client/api/views/{id}/events", "/client/events"],
    ["/ops/api/source-registry/reliability-timeline", "/ops/sources"],
    ["/ops/api/onvif/credential-provider-status", "/ops/sources"],
    ["/ops/api/audit", "/ops/users"],
  ]);
  for (const [source, screen] of expected) {
    assert(normalizeProductScreenRoute(source) === screen, `${source} did not normalize to ${screen}`);
  }
  for (const item of manifest.cases.filter(value => value.disposition === "native-executable")) {
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} retains raw API screen route`);
  }
  const rootEntry = manifest.cases.find(item => item.caseId === "UI-001");
  assert(rootEntry?.canonicalRoute === "/" && rootEntry?.screenRoute === "/login",
    "UI-001 canonical root request and setup-complete anonymous login observation are not separated");
  assert(rootEntry.workflow?.productAction?.endpoint?.path === "/" &&
    JSON.stringify(rootEntry.workflow.productAction.endpoint.allowedStatuses) === JSON.stringify([200, 302]),
  "UI-001 root redirect chain must bind the correlated 302 and followed login 200 responses");
  const rootPrimary = rootEntry.workflow?.controlSequence?.find(action => action.kind === "assert-product-state");
  assert(rootPrimary?.semanticCompletion?.request?.urlPath === "/" &&
    JSON.stringify(rootPrimary.semanticCompletion.request.allowedStatuses) === JSON.stringify([200, 302]),
  "UI-001 root completion request does not preserve the redirect-chain status contract");
  const logoutEntry = manifest.cases.find(item => item.caseId === "UI-005");
  assert(logoutEntry?.canonicalRoute === "/logout" && logoutEntry?.screenRoute === "/ops/home" &&
    logoutEntry.workflow?.primaryControl?.route === "/ops/home" &&
    logoutEntry.workflow?.productAction?.endpoint?.path === "/logout",
  "UI-005 POST-only logout endpoint and product control screen are not separated");
  const homeEntry = manifest.cases.find(item => item.caseId === "UI-009");
  assert(homeEntry?.workflow?.workflowClass === "read-only-state" &&
    homeEntry.workflow?.primaryControl?.selector === '[data-testid="ops-home-page"]' &&
    homeEntry.workflow?.controlSequence?.some(action =>
      action.kind === "assert-visible-read-model" && action.selector === '[data-testid="ops-home-page"]') &&
    !homeEntry.workflow?.controlSequence?.some(action => action.kind === "toggle-details"),
  "UI-009 exact workflow still treats a row-only context menu template as the ops home control");
});

check("UI-017 binds the client events read model instead of a dashboard-only preset status", () => {
  const eventsEntry = manifest.cases.find(item => item.caseId === "UI-017");
  assert(eventsEntry?.canonicalRoute === "/client/events" &&
    eventsEntry.controlAction?.selector === ".client-viewer-events" &&
    eventsEntry.workflow?.primaryControl?.selector === ".client-viewer-events" &&
    eventsEntry.actions.some(action =>
      action.kind === "assert-visible-read-model" && action.selector === ".client-viewer-events") &&
    !eventsEntry.actions.some(action => action.selector === "#clientDashboardPresetStatus"),
  "UI-017 exact workflow still targets a dashboard-only preset status");
});

check("UI-018 remains a dedicated negative route case", () => {
  const item = manifest.cases.find(value => value.caseId === "UI-018");
  assert(item?.disposition === "negative-route", "UI-018 negative disposition missing");
  assert(item.canonicalRoute === "/lab" && item.screenRoute === "/lab", "UI-018 route mismatch");
  assert(item.actions.length === 1 && item.actions[0].kind === "navigate", "UI-018 action must be native navigate");
  assert(item.oracle.kind === "negative-route-status", "UI-018 negative status oracle missing");
  assert(JSON.stringify(item.oracle.allowedStatuses) === JSON.stringify([404]), "UI-018 must accept exactly status 404");
  const negativeInitialStart = runnerSource.indexOf('if (item.disposition === "negative-route") {');
  const negativeInitialEnd = runnerSource.indexOf("} else {", negativeInitialStart);
  const negativeInitialBranch = runnerSource.slice(negativeInitialStart, negativeInitialEnd);
  assert(negativeInitialStart >= 0 && negativeInitialEnd > negativeInitialStart &&
    negativeInitialBranch.includes("trace.rawPrimaryObservations.push(makeRawPrimaryObservation({") &&
    negativeInitialBranch.includes("actionEvidence: initialCompletionAction") &&
    negativeInitialBranch.includes("semanticReadback: initialCompletion.semanticReadback"),
  "UI-018 initial negative navigation does not emit one raw primary observation");
});

check("SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification", () => {
  const item = manifest.cases.find(value => value.caseId === "SAFE-017");
  assert(item?.disposition === "native-executable", "SAFE-017 must remain in positive native count");
  assert(item.screenRoute === "/ops", "SAFE-017 product screen route mismatch");
  const negativeAction = item.actions.find(action => action.kind === "navigate-negative");
  assert(negativeAction?.route === "/lab", "SAFE-017 /lab negative action missing");
  assert(negativeAction.allowedStatuses.includes(404), "SAFE-017 404 oracle missing");
  assert(item.oracle.kind === "semantic-cross-route-negative-status", "SAFE-017 cross-route oracle missing");
});

check("MEDIA/SAFE client cases and SAFE-016 negative route use one exact route lifecycle", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  const byId = new Map(rebuilt.cases.map(item => [item.caseId, item]));
  for (const caseId of ["MEDIA-017", "SAFE-018", "SAFE-031"]) {
    const canonicalCase = canonical.cases.find(item => item.testId === caseId);
    const item = byId.get(caseId);
    assert(canonicalCase?.route === "/client/live" && canonicalCase.accountRole === "viewer",
      `${caseId} canonical client/live viewer source-of-truth mismatch`);
    assert(item?.canonicalRoute === "/client/live" && item.screenRoute === "/client/live" &&
      item.accountRole === "viewer" && item.workflow.exactRuntimeOracle.route === "/client/live" &&
      item.workflow.exactRuntimeOracle.role === "viewer",
    `${caseId} canonical/screen/runtime oracle route-role binding mismatch`);
    for (const [field, value, expectedError] of [
      ["route", "/ops", "canonical/runtime oracle route mismatch"],
      ["accountRole", "operator", "canonical/runtime oracle role mismatch"],
    ]) {
      const mutatedCanonical = structuredClone(canonical);
      mutatedCanonical.cases.find(candidate => candidate.testId === caseId)[field] = value;
      let message = "";
      try {
        buildNativeExactManifest({ canonical: mutatedCanonical, implementation });
      } catch (error) {
        message = String(error?.message || error);
      }
      assert(message.includes(expectedError),
        `${caseId} ${field} mismatch did not fail closed: ${message}`);
    }
  }

  const safe016 = byId.get("SAFE-016");
  assert(safe016?.canonicalRoute === "/ops" && safe016.screenRoute === "/ops" &&
    safe016.disposition === "native-executable" &&
    safe016.workflow.workflowClass === "negative-route",
  "SAFE-016 cross-route negative classification mismatch");
  const negativeAction = safe016.actions.find(action => action.kind === "navigate-negative");
  assert(negativeAction?.route === "/__v390-undefined-route__" &&
    JSON.stringify(negativeAction.allowedStatuses) === "[404]" &&
    safe016.workflow.productAction.endpoint.path === "/__v390-undefined-route__" &&
    JSON.stringify(safe016.workflow.productAction.endpoint.allowedStatuses) === "[404]",
  "SAFE-016 exact undefined-route 404 lifecycle mismatch");
  assert(!safe016.actions.some(action =>
    action.kind === "assert-product-state" || action.kind === "assert-product-boundary"),
  "SAFE-016 negative route still enters the generic source-route readback lifecycle");
});

check("all cases declare native action, oracle seed, and artifact plan", () => {
  for (const item of manifest.cases) {
    assert(item.dispatch === "playwright-native", `${item.caseId} dispatch mismatch`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} non-native action`);
    assert(item.oracle?.sourceKind && item.oracle?.expectedBehaviorSha256, `${item.caseId} oracle seed missing`);
    assert(item.artifacts?.screenshot && item.artifacts?.trace && item.artifacts?.browserConsole && item.artifacts?.serverLog,
      `${item.caseId} artifact plan missing`);
    assert(item.accountRole && item.viewport?.width > 0 && item.viewport?.height > 0 && item.theme,
      `${item.caseId} role/viewport/theme missing`);
  }
});

check("REVIEW4-56 requires exact typed product workflows for all 424 cases", () => {
  assert(manifest.schema === "media-server.v390-ui-native-exact-cases.v2", "REVIEW3-41 manifest schema v2 missing");
  const workflowIds = [];
  const workflowClassCounts = {};
  for (const item of manifest.cases) {
    const workflow = item.workflow;
    assert(workflow?.schema === "media-server.v390-ui-case-native-workflow.v2", `${item.caseId} REVIEW4-56 workflow schema missing`);
    assert(workflow.workflowId === `${item.caseId}:native-workflow`, `${item.caseId} workflow ID mismatch`);
    workflowIds.push(workflow.workflowId);
    workflowClassCounts[workflow.workflowClass] = (workflowClassCounts[workflow.workflowClass] || 0) + 1;
    for (const field of ["setup", "inputs", "controlSequence", "expectedResults", "cleanup"]) {
      assert(Array.isArray(workflow[field]) && workflow[field].length > 0, `${item.caseId} ${field} missing`);
    }
    assert(workflow.inputs.some(input => input.actualValue !== undefined || input.seedReference?.fixtureId),
      `${item.caseId} actual workflow input missing`);
    assert(workflow.primaryControl?.applicability === "required" ||
      workflow.primaryControl?.applicability === "not-applicable",
    `${item.caseId} primary control applicability missing`);
    assert(typeof workflow.primaryControl.accountRole === "string" && workflow.primaryControl.accountRole.length > 0,
      `${item.caseId} primary control account role missing`);
    const requiresActionRoleBinding = workflow.primaryControl.route !== item.screenRoute ||
      workflow.primaryControl.accountRole !== item.accountRole;
    const actionRoleBinding = workflow.setup.find(setup => setup.kind === "bind-action-role-session");
    if (requiresActionRoleBinding) {
      assert(actionRoleBinding?.accountRole === workflow.primaryControl.accountRole &&
        actionRoleBinding?.route === workflow.primaryControl.route && actionRoleBinding?.required === true,
      `${item.caseId} cross-route/role action session binding missing`);
    } else {
      assert(!actionRoleBinding, `${item.caseId} redundant action role session binding forbidden`);
    }
    if (workflow.primaryControl.applicability === "required") {
      assert(typeof workflow.primaryControl.selector === "string" && workflow.primaryControl.selector.length > 0,
        `${item.caseId} exact primary control missing`);
      assert(!isRouteRootSelector(workflow.primaryControl.selector), `${item.caseId} route-root primary control forbidden`);
      assert(typeof workflow.primaryControl.expectedVisible === "boolean" &&
        typeof workflow.primaryControl.expectedEnabled === "boolean",
      `${item.caseId} primary control visibility/enabled contract missing`);
      assertSourceLocator(workflow.primaryControl.sourceLocator, `${item.caseId} primary control`);
      if (["actionable", "form-submit", "persisted-mutation"].includes(workflow.workflowClass)) {
        assert(workflow.primaryControl.expectedVisible === true && workflow.primaryControl.expectedEnabled === true,
          `${item.caseId} actionable primary control must be visible/enabled`);
      }
    } else {
      assert(["read-only-state", "hidden-disabled", "negative-route"].includes(workflow.workflowClass),
        `${item.caseId} control not-applicable is forbidden for ${workflow.workflowClass}`);
      assert(typeof workflow.primaryControl.reason === "string" && workflow.primaryControl.reason.length > 0,
        `${item.caseId} control not-applicable reason missing`);
      assertSourceLocator(workflow.primaryControl.sourceLocator, `${item.caseId} not-applicable action/state`);
      assertSourceLocator(workflow.primaryControl.readbackLocator, `${item.caseId} not-applicable readback`);
    }
    const endpointCount = workflow.productAction?.endpoint ? 1 : 0;
    const localActionCount = workflow.productAction?.localAction ? 1 : 0;
    assert(endpointCount + localActionCount === 1, `${item.caseId} product action must declare exactly one endpoint or local action`);
    if (workflow.productAction.endpoint) {
      assert(/^(GET|POST|PUT|DELETE)$/.test(workflow.productAction.endpoint.method || ""),
        `${item.caseId} product endpoint method missing`);
      assert(String(workflow.productAction.endpoint.path || "").startsWith("/"),
        `${item.caseId} product endpoint path missing`);
      assert(Array.isArray(workflow.productAction.endpoint.allowedStatuses) &&
        workflow.productAction.endpoint.allowedStatuses.length > 0,
      `${item.caseId} product endpoint status missing`);
      if (workflow.workflowClass === "form-submit") {
        assert(!hasMixedSuccessAndErrorStatuses(workflow.productAction.endpoint.allowedStatuses),
          `${item.caseId} form broad mixed success/error status set forbidden`);
        const submitAction = workflow.controlSequence.find(action => action.kind === "submit-form");
        assert(submitAction?.uiLifecycle?.schema === "media-server.v390-ui-form-lifecycle.v1" &&
          submitAction.uiLifecycle.adapter && Array.isArray(submitAction.uiLifecycle.fieldControls),
        `${item.caseId} typed form UI lifecycle missing`);
        assert(submitAction.uiLifecycle.fieldControls.map(field => field.name).join(",") ===
          submitAction.fields.join(","), `${item.caseId} typed form field order drift`);
      }
      if (workflow.workflowClass === "persisted-mutation") {
        const persistedAction = workflow.controlSequence.find(action => action.kind === "execute-persisted-action");
        assert(persistedAction?.uiLifecycle?.adapter && persistedAction.uiLifecycle.fixtureBinding?.fixtureId,
          `${item.caseId} persisted UI lifecycle adapter/binding missing`);
        assert(persistedAction.uiLifecycle.fixtureBinding.fixtureId ===
          workflow.inputs.find(input => input.kind === "reversible-fixture-record")?.actualValue?.id,
        `${item.caseId} persisted UI lifecycle fixture binding drift`);
      }
    } else {
      assert(workflow.productAction.localAction.type && workflow.productAction.localAction.target &&
        workflow.productAction.localAction.effect,
      `${item.caseId} local product action incomplete`);
    }
    assert(workflow.expectedProductState?.identity && workflow.expectedProductState?.locator?.file,
      `${item.caseId} expected product state missing`);
    assert(workflow.independentReadback?.identity && workflow.independentReadback?.locator?.file,
      `${item.caseId} independent readback missing`);
    assertSourceLocator(workflow.expectedProductState.locator, `${item.caseId} expected product state`);
    assertSourceLocator(workflow.independentReadback.locator, `${item.caseId} independent readback`);
    assert(workflow.expectedProductState.identity !== workflow.independentReadback.identity,
      `${item.caseId} state/readback identity self-compare forbidden`);
    assert(locatorIdentity(workflow.expectedProductState.locator) !== locatorIdentity(workflow.independentReadback.locator),
      `${item.caseId} state/readback locator self-compare forbidden`);
    if (workflow.workflowClass === "persisted-mutation" || workflow.workflowClass === "form-submit" ||
        workflow.productAction?.kind === "endpoint-owned-action") {
      assert(workflow.cleanup.some(cleanup => {
        const inverseCount = cleanup.inverseAction?.endpoint ? 1 : 0;
        const inverseLocalCount = cleanup.inverseAction?.localAction ? 1 : 0;
        return ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind) &&
          cleanup.beforeSnapshotRef && inverseCount + inverseLocalCount === 1 &&
          cleanup.afterReadback?.identity &&
          ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation) &&
          cleanup.readback?.identity && cleanup.readback?.locator?.file;
      }),
      `${item.caseId} mutation cleanup restore/delete readback missing`);
    } else {
      assert(workflow.cleanup.some(cleanup => cleanup.kind === "no-op-cleanup" && cleanup.persistedMutation === false),
        `${item.caseId} nonmutation no-op cleanup missing`);
    }
    if (workflow.workflowClass === "form-submit") {
      const formInput = workflow.inputs.find(input => input.kind === "form-values");
      assert(formInput?.submit === true,
        `${item.caseId} form submit input missing`);
      assert(!containsLiteralAuthMaterial(formInput.actualValue), `${item.caseId} form auth literal forbidden`);
      assert(workflow.controlSequence.some(action => action.kind === "submit-form"),
        `${item.caseId} form submit action missing`);
      assert(!workflow.controlSequence.some(action => action.kind === "assert-form-contract"),
        `${item.caseId} form contract-only action forbidden`);
    }
    if (!item.controlAction.selector) {
      assert(workflow.primaryControl.applicability === "not-applicable" &&
        ["read-only-state", "hidden-disabled", "negative-route"].includes(workflow.workflowClass),
      `${item.caseId} selector-null generic workflow forbidden`);
      if (workflow.workflowClass === "negative-route") {
        assert(workflow.controlSequence.some(action => ["navigate", "navigate-negative"].includes(action.kind)) &&
          workflow.productAction.endpoint?.method === "GET" &&
          JSON.stringify(workflow.productAction.endpoint.allowedStatuses) === JSON.stringify([404]),
        `${item.caseId} selector-null exact negative-route readback action missing`);
      } else if (workflow.productAction?.kind === "endpoint-owned-action") {
        assert(workflow.controlSequence.some(action => action.kind === "execute-endpoint-action"),
          `${item.caseId} selector-null endpoint-owned action missing`);
      } else {
        assert(workflow.controlSequence.some(action => ["assert-product-state", "assert-product-boundary"].includes(action.kind)),
          `${item.caseId} selector-null exact product readback action missing`);
      }
    }
    const serialized = JSON.stringify(workflow);
    assert(!serialized.includes("runtime-control"), `${item.caseId} runtime-control is forbidden`);
    assert(!workflow.controlSequence.some(action => action.kind === "interact"), `${item.caseId} generic interact is forbidden`);
    assert(!serialized.includes('"submit":false'), `${item.caseId} submit:false is forbidden`);
    assert(!serialized.includes('"selector":"body"') && !serialized.includes('"selector":"body.'),
      `${item.caseId} body/route-root fallback is forbidden`);
    const runtimeReadbacks = workflow.controlSequence.filter(action => action.kind === "verify-independent-readback");
    if (workflow.workflowClass === "negative-route") {
      assert(runtimeReadbacks.length === 0, `${item.caseId} negative route must use its status readback`);
    } else {
      assert(runtimeReadbacks.length === 1, `${item.caseId} executable independent readback step missing`);
      const runtimeReadback = runtimeReadbacks[0];
      assert(runtimeReadback.readbackIdentity === workflow.independentReadback.identity &&
        runtimeReadback.expectedStateIdentity === workflow.expectedProductState.identity &&
        runtimeReadback.expectedBehaviorSha256 === workflow.expectedProductState.expectedBehaviorSha256 &&
        runtimeReadback.runtimeEvidenceRequired === true &&
        runtimeReadback.staticLocatorIsNotRuntimePass === true,
      `${item.caseId} independent readback action binding mismatch`);
      assert(workflow.controlSequence.indexOf(runtimeReadback) > 0,
        `${item.caseId} independent readback must follow the product action`);
    }
  }
  assert(new Set(workflowIds).size === 424, "workflow IDs must be unique");
  for (const [workflowClass, expectedCount] of Object.entries(review4WorkflowClassExpectedCounts)) {
    assert(workflowClassCounts[workflowClass] === expectedCount,
      `${workflowClass} workflow count mismatch: ${workflowClassCounts[workflowClass] || 0}/${expectedCount}`);
  }
  assert(Object.values(workflowClassCounts).every(count => count > 0), "all six workflow classes must be nonzero");
  assert(Object.values(workflowClassCounts).reduce((sum, count) => sum + count, 0) === 424,
    "workflow class total must be exact 424");
  assert(!runnerSource.includes("interactWithRuntimeControl"), "runner generic runtime-control function is forbidden");
  assert(!runnerSource.includes('strategy: "runtime-control"'), "runner runtime-control strategy is forbidden");
  for (const forbidden of ["routeRootSelector", "body.ops-shell", "body.client-shell", "body.auth-shell", "body.product-shell"]) {
    assert(!nativeLibrarySource.includes(forbidden), `native workflow library fallback forbidden: ${forbidden}`);
  }

  const hiddenCases = manifest.cases.filter(item => ["#opsEventRuleIdInput", "#opsVaRuleIdInput"].includes(item.controlAction.selector));
  assert(hiddenCases.length > 0, "hidden control cases missing");
  for (const item of hiddenCases) {
    assert(item.workflow.controlSequence.some(action => action.kind === "assert-hidden-control"),
      `${item.caseId} hidden control must use a hidden assertion`);
    assert(!item.workflow.controlSequence.some(action => ["click", "fill", "select", "set-checked"].includes(action.kind)),
      `${item.caseId} hidden control must not be actionable`);
  }
  const requiredHiddenDisabled = manifest.cases
    .filter(item => item.workflow.workflowClass === "hidden-disabled" &&
      item.workflow.primaryControl.applicability === "required");
  assert(JSON.stringify(requiredHiddenDisabled.map(item => item.caseId).sort()) ===
    JSON.stringify(["RULE-017", "UI-022", "UI-111"]),
  `hidden/disabled exact control set drift: ${requiredHiddenDisabled.map(item => item.caseId).join(",")}`);
  assert(requiredHiddenDisabled.every(item =>
    item.workflow.controlSequence.some(action => ["assert-hidden-control", "assert-disabled-control"].includes(action.kind))),
  "hidden/disabled exact controls must use explicit state assertions");

  const endpointOwnedSpecs = new Map([
    ["AUTH-020", ["POST", "/ops/api/users/{fixtureId}/disable"]],
    ["SRC-008", ["POST", "/ops/api/sources"]],
    ["SRC-010", ["DELETE", "/ops/api/sources/{fixtureId}"]],
    ["SRC-019", ["DELETE", "/ops/api/views/{fixtureId}"]],
    ["SRC-031", ["POST", "/ops/api/onvif/import-draft"]],
  ]);
  const endpointOwnedCases = manifest.cases.filter(item =>
    item.workflow.productAction?.kind === "endpoint-owned-action");
  assert(JSON.stringify(endpointOwnedCases.map(item => item.caseId)) ===
    JSON.stringify([...endpointOwnedSpecs.keys()]),
  `endpoint-owned case set drift: ${endpointOwnedCases.map(item => item.caseId).join(",")}`);
  for (const item of endpointOwnedCases) {
    const [method, endpointPath] = endpointOwnedSpecs.get(item.caseId);
    const action = item.workflow.controlSequence.find(value => value.kind === "execute-endpoint-action");
    const input = item.workflow.inputs.find(value => value.kind === "endpoint-action-fixture");
    assert(item.workflow.primaryControl.applicability === "not-applicable" &&
      item.workflow.productAction.primaryControlRequired === false,
    `${item.caseId} endpoint-owned action incorrectly claims a direct UI control`);
    assert(item.workflow.productAction.endpoint.method === method &&
      item.workflow.productAction.endpoint.path === endpointPath &&
      action?.endpoint?.method === method && action?.endpoint?.path === endpointPath &&
      action?.semanticCompletion?.request?.method === method &&
      action?.semanticCompletion?.request?.urlPathTemplate === endpointPath,
    `${item.caseId} endpoint-owned method/path binding drift`);
    assert(action?.ownership === "product-endpoint-no-primary-control" &&
      input?.actualValue?.method === method && input?.actualValue?.path === endpointPath,
    `${item.caseId} endpoint-owned input/action ownership binding missing`);
    assert(item.workflow.controlSequence.indexOf(action) > 0 &&
      item.workflow.controlSequence.findIndex(value => value.kind === "verify-independent-readback") >
        item.workflow.controlSequence.indexOf(action),
    `${item.caseId} endpoint action/readback sequence drift`);
    assert(item.workflow.cleanup.some(value => value.kind === "restore-fixture-state"),
      `${item.caseId} endpoint-owned cleanup is missing`);
    const cleanup = item.workflow.cleanup.find(value => value.kind === "restore-fixture-state");
    if (item.caseId === "AUTH-020") {
      assert(cleanup?.afterReadback?.expectation === "absent" &&
        cleanup.inverseAction?.localAction?.type === "restore-file-backed-fixture-snapshot",
      "AUTH-020 must restore the pre-case users file and prove the acceptance-owned user absent");
    }
    assert(!item.workflow.controlSequence.some(value =>
      ["assert-product-boundary", "assert-product-state"].includes(value.kind)),
    `${item.caseId} endpoint mutation is disguised as a boundary/state read`);
  }
  assert(runtimeSource.includes("responseSynthesized: false") &&
    runtimeSource.includes("actualBrowserRequestObserved: true") &&
    runnerSource.includes("matchingResponses.length === 1") &&
    runnerSource.includes("entry.correlationId !== completionRequest.correlationId") &&
    runnerSource.includes('safeResponseProjectionSource === "playwright-response-json"') &&
    !runnerSource.includes("structuredClone(response.json ?? response.text)"),
  "endpoint-owned runtime does not require an actual correlated browser response");
  assert(runtimeSource.includes("disabled user response/store/list/session/login readback failed") &&
    runtimeSource.includes("created source response/registry readback failed") &&
    runtimeSource.includes("disabled source response/registry/client boundary readback failed") &&
    runtimeSource.includes("disabled view response/registry/client boundary readback failed") &&
    runtimeSource.includes("ONVIF draft response/registry equal-before readback failed"),
  "endpoint-owned independent authoritative readback coverage missing");

  assert(manifest.cases.every(item => item.workflow.setup.some(setup => setup.kind === "seed-reviewed-state")),
    "all 424 cases must declare reviewed state seed");
  assert(manifest.cases.every(item => item.workflow.expectedResults.every(result =>
    /^[a-f0-9]{64}$/.test(result.expectedBehaviorSha256) && result.stateLocator?.file && result.readbackLocator?.file)),
  "all 424 cases must bind expected result state/readback locators");
  const renderedTemplateSelectors = new Map([
    ["SRC-038", '[data-testid="client-safe-source-status-digest"]'],
    ["CLIENT-007", ".client-viewer-events"],
  ]);
  for (const [caseId, expectedSelector] of renderedTemplateSelectors) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.controlAction.selector === expectedSelector,
      `${caseId} rendered template selector was not resolved to ${expectedSelector}`);
    assert(item.workflow.controlSequence.some(action => action.kind === "assert-visible-read-model"),
      `${caseId} rendered selector must be a visible read-model workflow`);
  }
  const crossRoleCases = new Map([
    ["AUTH-014", "admin"],
    ["AUTH-015", "admin"],
    ["AUTH-033", "admin"],
    ["AUTH-037", "admin"],
    ["AUTH-038", "admin"],
    ["AUTH-039", "anonymous"],
    ["RULE-097", "viewer"],
  ]);
  for (const [caseId, accountRole] of crossRoleCases) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.primaryControl.accountRole === accountRole,
      `${caseId} exact action role mismatch`);
    assert(item.workflow.setup.some(setup => setup.kind === "bind-action-role-session" &&
      setup.accountRole === accountRole && setup.route === item.workflow.primaryControl.route),
    `${caseId} exact action role session missing`);
  }
  const exactAuthWorkflowCases = new Map([
    ["AUTH-005", {
      selector: '[data-testid="auth-setup-form"] button[type="submit"]',
      route: "/setup", accountRole: "anonymous", method: "POST", path: "/setup",
    }],
    ["AUTH-007", {
      selector: '[data-testid="auth-login-form"] button[type="submit"]',
      route: "/login", accountRole: "anonymous", method: "POST", path: "/login",
    }],
    ["AUTH-014", {
      selector: "#user-save-selected",
      route: "/ops/users", accountRole: "admin", method: "POST", path: "/ops/api/users",
    }],
    ["AUTH-015", {
      selector: '#invite-create-form button[type="submit"]',
      route: "/ops/users", accountRole: "admin", method: "POST", path: "/ops/api/invites",
    }],
  ]);
  for (const [caseId, expected] of exactAuthWorkflowCases) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.workflowClass === "form-submit", `${caseId} exact auth form workflow missing`);
    assert(item.workflow.primaryControl.selector === expected.selector &&
      item.workflow.primaryControl.route === expected.route &&
      item.workflow.primaryControl.accountRole === expected.accountRole,
    `${caseId} exact auth primary control mismatch`);
    assert(item.workflow.productAction.endpoint?.method === expected.method &&
      item.workflow.productAction.endpoint?.path === expected.path,
    `${caseId} exact auth endpoint mismatch`);
  }
  const correctedRuleWorkflows = new Map([
    ["UI-036", ["actionable", "[data-vlm-rule-draft-index]", null]],
    ["UI-046", ["actionable", "[data-incident-rule-draft-route]", null]],
    ["RULE-007", ["read-only-state", null, "/ops/rules"]],
    ["RULE-011", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-012", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-016", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-025", ["read-only-state", null, "/ops/rules"]],
    ["RULE-030", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/profiles/{fixtureId}"]],
    ["RULE-073", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/rules/{fixtureId}"]],
    ["RULE-075", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/rules/{fixtureId}"]],
    ["RULE-093", ["actionable", "#opsRulesComposerSave", null]],
    ["RULE-094", ["actionable", "#opsRulesComposerSave", null]],
    ["RULE-095", ["actionable", "#opsRulesRefresh", null]],
    ["RULE-096", ["actionable", "#opsRulesRefresh", null]],
    ["RULE-097", ["read-only-state", '[data-testid="client-live-source-tree"]', "/client/api/views"]],
    ["RULE-098", ["read-only-state", "#opsRulesValidationList", "/ops/api/rules/catalog"]],
    ["RULE-100", ["actionable", "#opsRulesComposerSave", null]],
    ["RULE-101", ["actionable", "#opsRulesComposerSave", null]],
    ["RULE-102", ["actionable", "#opsEventRuleTypeSelect", null]],
    ["RULE-103", ["actionable", "#opsRulesRefresh", null]],
    ["RULE-104", ["actionable", "[data-approval-gated-rule-draft-route]", null]],
    ["RULE-111", ["actionable", "[data-vlm-rule-draft-index]", null]],
  ]);
  for (const [caseId, [workflowClass, selector, endpointPath]] of correctedRuleWorkflows) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.workflowClass === workflowClass, `${caseId} exact workflow class mismatch`);
    assert(item.workflow.primaryControl.selector === selector, `${caseId} exact primary control mismatch`);
    assert((item.workflow.productAction.endpoint?.path || null) === endpointPath,
      `${caseId} exact product endpoint mismatch`);
  }
  const rule097 = manifest.cases.find(item => item.caseId === "RULE-097");
  const rule097Fixture = rule097.workflow.inputs.find(input => input.kind === "rejected-endpoint-fixture");
  const rule097Identity = ruleRelationshipFixtureIdentity("RULE-097");
  assert(rule097.workflow.primaryControl.accountRole === "viewer" &&
    rule097.workflow.primaryControl.route === "/client/live" &&
    rule097Fixture?.actualValue?.assignedViewId === rule097Identity.viewId &&
    rule097Fixture?.actualValue?.blockedViewId === rule097Identity.blockedViewId &&
    rule097Fixture?.actualValue?.disallowedRuleId === "98970" &&
    rule097.workflow.expectedResults[0].completion.readbackExpectation.textIncludesAll.includes("REVIEW4 RULE-097 view"),
  "RULE-097 scoped assigned/blocked client read model contract missing");
  const rule098 = manifest.cases.find(item => item.caseId === "RULE-098");
  const rule098Fixture = rule098.workflow.inputs.find(input => input.kind === "rejected-endpoint-fixture");
  assert(rule098.workflow.primaryControl.accountRole === "operator" &&
    rule098Fixture?.seedReference?.route === "/ops/rules" &&
    rule098Fixture?.actualValue?.rejectedRequestRole === "viewer" &&
    rule098Fixture?.actualValue?.expectedStatus === 400 &&
    rule098.workflow.expectedResults[0].completion.readbackExpectation.textIncludesAll.includes("view-rule-not-allowed"),
  "RULE-098 operator validation/viewer session rejection split contract missing");
  const rule100 = manifest.cases.find(item => item.caseId === "RULE-100");
  const rule100Fixture = rule100.workflow.inputs.find(input => input.kind === "rejected-endpoint-fixture");
  assert(rule100Fixture?.actualValue?.body?.validRuleId === "9890" &&
    rule100Fixture?.actualValue?.body?.conflictRuleId === "3920100" &&
    rule100.workflow.productAction.localAction?.verificationEndpoint?.allowedStatuses.includes(400) &&
    rule100.workflow.expectedResults[0].completion.localTransition.forbiddenRequests.some(request =>
      request.methods.includes("PUT") && request.pathPrefix === "/lab/analysis/va-rules/"),
  "RULE-100 UI no-PUT/API-400/absence split contract missing");
  const rule101 = manifest.cases.find(item => item.caseId === "RULE-101");
  const rule101Fixture = rule101.workflow.inputs.find(input => input.kind === "rejected-endpoint-fixture");
  const rule101Completion = rule101.workflow.expectedResults[0].completion;
  const rule101Postconditions = rule101Completion.localTransition.postconditions;
  assert(rule101.workflow.productAction.localAction?.verificationEndpoint?.path ===
    "/lab/analysis/va-rules/9891" &&
    JSON.stringify(rule101.workflow.productAction.localAction.verificationEndpoint.allowedStatuses) === "[400]" &&
    JSON.stringify(rule101Fixture?.actualValue?.body?.variants) ===
      '["analysis-template-mismatch","profile-template-mismatch"]' &&
    rule101Fixture?.actualValue?.body?.analysisClasses?.includes("person") &&
    rule101Fixture?.actualValue?.body?.profileClasses?.includes("person") &&
    rule101Fixture?.actualValue?.body?.templateClasses?.includes("vehicle") &&
    rule101Fixture?.actualValue?.body?.alternateProfileClasses?.includes("vehicle") &&
    rule101Postconditions.some(condition => String(condition.value).includes("프로파일 대상(사람)")) &&
    !rule101Postconditions.some(condition => String(condition.value).includes("룰 대상(사람)")) &&
    JSON.stringify(rule101Completion.readbackExpectation.independentProductErrors) === JSON.stringify([
      "vaRule analysis.classes must include template analysis.classes",
      "vaRule profile classes must include template analysis.classes",
    ]) &&
    rule101Completion.localTransition.forbiddenRequests.some(request =>
      request.methods.includes("PUT") && request.pathPrefix === "/lab/analysis/va-rules/"),
  "RULE-101 UI profile no-write/server-only analysis API-400 split contract missing");
  const rule102 = manifest.cases.find(item => item.caseId === "RULE-102");
  const rule102Postconditions = rule102.workflow.expectedResults[0].completion.localTransition.postconditions;
  for (const token of [
    "EventRecord eventType 후보는 re-entry",
    "중복 ID, priority, source/class 충돌이 없습니다",
    "별도 참조 누락이 없습니다",
    "preset",
    "verify-va-event-coverage-report",
  ]) {
    assert(rule102Postconditions.some(condition => String(condition.value).includes(token)),
      `RULE-102 review-loop postcondition missing: ${token}`);
  }
  const relationshipExpectations = new Map([
    ["RULE-093", ["/lab/analysis/va-rules/9893", 400, ["missing-profile", "missing-template"]]],
    ["RULE-094", ["/lab/analysis/va-rules/9894", 400, ["inactive-profile", "inactive-template"]]],
    ["RULE-095", [`/client/api/views/${ruleRelationshipFixtureIdentity("RULE-095").viewId}/webrtc/session`, 400, ["source-mismatch"]]],
    ["RULE-096", [`/client/api/views/${ruleRelationshipFixtureIdentity("RULE-096").viewId}/webrtc/session`, 404, ["inactive-view", "inactive-channel"]]],
  ]);
  for (const [caseId, [path, status, tokens]] of relationshipExpectations) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const fixture = item.workflow.inputs.find(input => input.kind === "rejected-endpoint-fixture");
    const completion = item.workflow.expectedResults[0].completion.localTransition;
    assert(item.workflow.productAction.localAction?.verificationEndpoint?.path === path &&
      item.workflow.productAction.localAction.verificationEndpoint.allowedStatuses.includes(status),
    `${caseId} exact rejected endpoint is missing`);
    const serialized = JSON.stringify([fixture?.actualValue, completion?.postconditions]);
    for (const token of tokens) assert(serialized.includes(token), `${caseId} exact variant ${token} is missing`);
    assert(completion.forbiddenRequests.length > 0, `${caseId} no-write oracle is missing`);
  }
  for (const snippet of [
    "seedRuleRelationshipFixturesViaApi", "verifyRuleRelationshipRejectedReadback",
    "vaRule analysis.profileId does not exist", "vaRule templateStart.ruleId does not exist",
    "vaRule analysis.profileId is inactive", "vaRule templateStart.ruleId is inactive",
    "vaRule source must match PublishedView source", "PublishedView source is not available",
    "scopeRuntimeViewerToView", "scopedViewerBoundaryObserved",
    "allowed vaRule is required for va-rule mode", "priority-conflict candidate reached the VA registry",
  ]) assert(runtimeSource.includes(snippet), `relationship runtime contract missing ${snippet}`);
  for (const caseId of ["RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100", "RULE-101"]) {
    assert(runtimeSource.includes(`"${caseId}"`), `relationship fixture case binding missing ${caseId}`);
  }
  for (const snippet of [
    "if (ruleRelationshipFixtureCaseIds.has(item.caseId)) return;",
    'createMethod: "POST",',
    'createEndpoint: "/ops/api/sources",',
    'createEndpoint: "/ops/api/views",',
    'collectionEndpoint: "/ops/api/sources",',
    'collectionEndpoint: "/ops/api/views",',
    'collectionRecordsKey: "sources",',
    'collectionRecordsKey: "views",',
    "expectedCreateStatuses: [201]",
    "relationship fixture collection readback mismatch",
    "transient source/view fixture was not soft-disabled in collection readback before snapshot restoration",
  ]) assert(runtimeSource.includes(snippet), `relationship fixture lifecycle contract missing ${snippet}`);
  assert(!runtimeSource.includes("fixtures.push({ endpoint: `/ops/api/sources/${sourceId}`, payload: source });"),
    "relationship source seed still uses item endpoint fixture shape");
  const relationshipSeed = runtimeSource.slice(
    runtimeSource.indexOf("async function seedRuleRelationshipFixturesViaApi"),
    runtimeSource.indexOf("function scopeRuntimeViewerToView"),
  );
  assert(relationshipSeed.indexOf("context.transientApiCleanup.push(fixture.collectionEndpoint") <
      relationshipSeed.indexOf("const readback = await requestEndpoint"),
  "relationship fixture cleanup must be registered before authoritative readback validation");
  assert(!relationshipSeed.includes("readbackEndpoint: `/ops/api/sources/${encodeURIComponent(value.sourceId)}`") &&
      !relationshipSeed.includes("readbackEndpoint: `/ops/api/views/${encodeURIComponent(value.viewId)}`"),
  "relationship source/view fixture must use collection readback because item GET is unsupported");
  assert(runtimeSource.includes('endpoint.startsWith("/ops/api/sources/") ? "source"') &&
      runtimeSource.includes('endpoint.startsWith("/ops/api/views/") ? "view"'),
  "all source/view cleanup must derive a collection readback instead of unsupported item GET");
  for (const [caseId, tokens] of new Map([
    ["RULE-103", ["configuredRuleId", "defaultRuleId", "missing-zone-red"]],
    ["RULE-104", ["eventAndVlmSidecar", "approvalGatedRuleDraftReadiness", "registryWritePerformed"]],
    ["RULE-111", ["actualVlmCandidate", "applyToEventTemplateForm", "manualSaveOnly"]],
  ])) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const fixture = item.workflow.inputs.find(input => input.kind === "exact-runtime-fixture");
    const serialized = JSON.stringify(fixture?.actualValue || {});
    for (const token of tokens) assert(serialized.includes(token), `${caseId} exact runtime fixture missing ${token}`);
    assert(item.workflow.expectedResults[0].completion.localTransition.postconditions.length >= 2,
      `${caseId} exact UI postcondition oracle missing`);
  }
  for (const snippet of [
    "seedRule103ReplayFixtures", "runRule103ExactReplay", "verifyExactRuntimeReadback",
    "re_entry_cross_zone_metadata.json", "missing-runtime-zone",
    "approvalGatedRuleDraftReadiness", "rule-suggestion-draft-bridge",
    "temporary output cleanup failed",
  ]) assert(runtimeSource.includes(snippet), `RULE-103/104/111 runtime contract missing ${snippet}`);
  assert(runnerSource.includes("verifyExactRuntimeReadback"), "exact runtime readback runner binding missing");
  for (const snippet of ["domScopeReadback", "prepare-priority-conflict-no-write", "VA priority-conflict controls are unavailable"]) {
    assert(runnerSource.includes(snippet), `relationship runner contract missing ${snippet}`);
  }
});

check("REVIEW4-56 rejects fallback no-submit generic and self-comparison workflows", () => {
  expectInvalid("workflow-cleanup", mutate(value => { value.cases[0].workflow.cleanup = []; }), "workflow cleanup missing");
  expectInvalid("workflow-id-duplicate", mutate(value => {
    value.cases[1].workflow.workflowId = value.cases[0].workflow.workflowId;
  }), "workflow IDs contain duplicates");
  expectInvalid("generic-workflow-action", mutate(value => {
    value.cases[0].workflow.controlSequence.push({ kind: "interact", dispatch: "playwright-native" });
  }), "action/workflow drift");
  expectInvalid("route-root-fallback", mutate(value => {
    value.cases[0].workflow.primaryControl = {
      ...value.cases[0].workflow.primaryControl,
      applicability: "required", selector: "body", expectedVisible: true, expectedEnabled: true,
    };
  }), "route-root primary control forbidden");
  const formCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "form-submit");
  expectInvalid("form-submit-false", mutate(value => {
    value.cases[formCaseIndex].workflow.inputs.find(input => input.kind === "form-values").submit = false;
  }), "submit:false is forbidden");
  expectInvalid("form-contract-only", mutate(value => {
    const item = value.cases[formCaseIndex];
    item.workflow.controlSequence = item.workflow.controlSequence.map(action =>
      action.kind === "submit-form" ? { ...action, kind: "assert-form-contract" } : action);
    item.actions = structuredClone(item.workflow.controlSequence);
  }), "form submit action missing");
  expectInvalid("form-mixed-status", mutate(value => {
    value.cases[formCaseIndex].workflow.productAction.endpoint.allowedStatuses = [302, 400];
  }), "form broad mixed success/error status set forbidden");
  const authFormCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "form-submit" &&
    Object.keys(item.workflow.inputs.find(input => input.kind === "form-values")?.actualValue || {})
      .some(field => /password|token|confirm/i.test(field)));
  expectInvalid("form-literal-secret", mutate(value => {
    const formInput = value.cases[authFormCaseIndex].workflow.inputs.find(input => input.kind === "form-values");
    const secretField = Object.keys(formInput.actualValue).find(field => /password|token|confirm/i.test(field));
    formInput.actualValue[secretField] = "checked-in-secret";
  }), "form auth literal forbidden");
  const setupCaseIndex = manifest.cases.findIndex(item => item.caseId === "UI-002");
  expectInvalid("setup-username-drift", mutate(value => {
    value.cases[setupCaseIndex].workflow.inputs.find(input => input.kind === "form-values")
      .actualValue.username = "ui-002-review4-fixture";
  }), "setup readonly admin contract missing");
  for (const [label, mutateControl] of [
    ["setup-readonly-control-drift", control => { control.control = "fill"; }],
    ["setup-readonly-expected-drift", control => { control.expectedValue = "operator"; }],
  ]) {
    expectInvalid(label, mutate(value => {
      const item = value.cases[setupCaseIndex];
      for (const sequence of [item.actions, item.workflow.controlSequence]) {
        const usernameControl = sequence.find(action => action.kind === "submit-form")
          .uiLifecycle.fieldControls.find(field => field.name === "username");
        mutateControl(usernameControl);
      }
    }), "setup readonly admin contract missing");
  }
  const mutationCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "persisted-mutation");
  expectInvalid("mutation-cleanup-inverse-missing", mutate(value => {
    value.cases[mutationCaseIndex].workflow.cleanup[0].inverseAction = { endpoint: null, localAction: null };
  }), "mutation cleanup inverse/readback missing");
  const selectorNullIndex = manifest.cases.findIndex(item => !item.controlAction.selector);
  expectInvalid("selector-null-generic", mutate(value => {
    const item = value.cases[selectorNullIndex];
    item.workflow.primaryControl = {
      ...item.workflow.primaryControl,
      applicability: "required", selector: "body.ops-shell", expectedVisible: true, expectedEnabled: true,
    };
  }), "route-root primary control forbidden");
  expectInvalid("state-readback-self-compare", mutate(value => {
    const item = value.cases[0];
    item.workflow.independentReadback.identity = item.workflow.expectedProductState.identity;
    item.workflow.independentReadback.locator = structuredClone(item.workflow.expectedProductState.locator);
  }), "state/readback identity self-compare forbidden");
  expectInvalid("dual-action-declaration", mutate(value => {
    value.cases[0].workflow.productAction.localAction = {
      type: "generic", target: "runtime", effect: "unknown",
    };
  }), "product action must declare exactly one endpoint or local action");
  const unknown = structuredClone(canonical);
  const candidate = unknown.cases.find(item => item.testId === "UI-001");
  candidate.controlAction.selector = "#unclassified-runtime-control";
  let failed = false;
  try {
    buildNativeExactManifest({ canonical: unknown, implementation });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes("canonical primary control source missing"),
      `unexpected unknown selector error: ${error.message}`);
  }
  assert(failed, "unclassified selector must fail manifest generation");
});

check("runner owns native execution, role state, first-fail, and artifact fields", () => {
  for (const snippet of [
    "createNativePlaywrightAdapter",
    "playwright-native",
    "role state missing",
    "not run after previous native case failure",
    "screenshotPath",
    "tracePath",
    "browserConsolePath",
    "serverLogReference",
    "uiFulltestPass: false",
  ]) {
    assert(runnerSource.includes(snippet), `runner source missing ${snippet}`);
  }
  const encounteredSetupKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.setup.map(setup => setup.kind)))].sort();
  const encounteredActionKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.controlSequence.map(action => action.kind)))].sort();
  const encounteredCleanupKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.cleanup.map(cleanup => cleanup.kind)))].sort();
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedSetupKinds")) === JSON.stringify(encounteredSetupKinds),
    "runner setup allowlist does not exactly cover current workflow kinds");
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedActionKinds")) === JSON.stringify(encounteredActionKinds),
    "runner action allowlist does not exactly cover current workflow kinds");
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedCleanupKinds")) === JSON.stringify(encounteredCleanupKinds),
    "runner cleanup allowlist does not exactly cover current workflow kinds");
  for (const snippet of [
    "runner unsupported setup kind",
    "runner unsupported action kind",
    "runner unsupported cleanup kind",
    "independent readback failed for",
    "primary action remained pending after independent readback",
  ]) {
    assert(runnerSource.includes(snippet), `runner explicit non-synthetic failure missing: ${snippet}`);
  }
  for (const removedFailure of [
    "cross-role action session adapter is unavailable",
    "persisted workflow seed adapter is unavailable",
    "runtime secret adapter is unavailable",
    "mutation cleanup adapter is unavailable",
  ]) {
    assert(!runnerSource.includes(removedFailure), `runner still has an unavailable adapter boundary: ${removedFailure}`);
  }
  const runtimeModulePath = path.join(rootDir, "scripts/internal/v390_ui_case_runtime.mjs");
  assert(fs.existsSync(runtimeModulePath), "exact case runtime owner module missing");
  for (const snippet of [
    "createV390UiCaseRuntime",
    "prepareCase",
    "freshRoleStorageState",
    "prepareDeferredFormFixture",
    "resolveSecretRef",
    "switchActionRoleSession",
    "restoreCase",
    "verifyCleanupReadback",
  ]) {
    assert(runtimeSource.includes(snippet), `exact case runtime owner missing ${snippet}`);
    assert(runnerSource.includes(snippet), `exact runner is not wired to ${snippet}`);
  }
  const persistedSeedCount = manifest.cases.filter(item => item.workflow.setup.some(setup =>
    setup.kind === "seed-reviewed-state" && setup.persistedMutation === true)).length;
  const mutationCleanupCount = manifest.cases.filter(item => item.workflow.cleanup.some(cleanup =>
    ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind))).length;
  const crossRoleCount = manifest.cases.filter(item => item.workflow.setup.some(setup =>
    setup.kind === "bind-action-role-session" && setup.accountRole !== item.accountRole)).length;
  const secretRefCount = manifest.cases.filter(item => JSON.stringify(item.workflow.inputs).includes("secretRef")).length;
  const requiredMutationClassCount =
    review4WorkflowClassExpectedCounts["persisted-mutation"] +
    review4WorkflowClassExpectedCounts["form-submit"];
  assert(persistedSeedCount === mutationCleanupCount,
    `persisted seed/cleanup closure drift: ${persistedSeedCount}/${mutationCleanupCount}`);
  assert(persistedSeedCount >= requiredMutationClassCount,
    `persisted seed closure does not cover mutation workflow classes: ${persistedSeedCount}/${requiredMutationClassCount}`);
  assert(crossRoleCount === 7, `cross-role closure drift: ${crossRoleCount}/7`);
  assert(secretRefCount === 11, `secretRef case closure drift: ${secretRefCount}/11`);
  assert(runnerSource.indexOf("validateRunnerWorkflowCompatibility(manifest.cases)") <
    runnerSource.indexOf("if (options.planOnly)"),
  "plan-only must validate runner workflow compatibility before reporting PASS");
});

check("self-contained runtime closes invite, auth readback, preference, and visual-session gaps", () => {
  for (const snippet of [
    "normalizeInviteSeedResponse",
    "seedExactAccessRequestFixture",
    "seedVlmRuleSuggestionFixture",
    "defaultPublishedSourceIdentity",
    "canonicalSourceKey",
    '["RULE-103", "RULE-104", "RULE-111", "SAFE-038", "UI-036", "UI-046", "UI-052", "UI-053", "UI-064", "UI-065", "UI-066", "UI-067", "UI-068", "UI-069", "UI-070", "UI-071", "UI-072", "UI-073", "UI-074", "UI-075", "UI-080", "UI-088", "UI-089", "UI-090", "UI-091", "UI-092", "UI-093", "UI-094", "UI-095", "UI-096", "UI-097", "UI-098", "UI-099", "UI-100", "UI-101", "UI-102", "UI-103", "UI-104", "UI-105"].includes(item.caseId)',
    'item.caseId === "UI-052"',
    "transient operational action pack is missing from the authoritative API readback",
    'item.caseId === "UI-053"',
    "transient rule what-if preview is missing from the authoritative API readback",
    "transient source reliability context is missing from the authoritative API readback",
    "validateUnifiedWorkspaceCaseReadback",
    "transient AI review quality context is missing from the authoritative API readback",
    "transient operator resolution flow is missing from the authoritative API readback",
    "transient action readiness checklist is missing from the authoritative API readback",
    "transient resolution search metrics is missing from the authoritative API readback",
    "transient incident source correlation is missing from the authoritative API readback",
    "transient operator recheck recovery queue is missing from the authoritative API readback",
    "transient EventRecord is missing from the viewer-scoped recent event readback",
    "transient closed EventRecord is not bound to the viewer-safe resolution digest",
    "viewer-safe source status digest is missing from the authoritative API readback",
    "source reliability search metrics are missing from the authoritative API readback",
    "backup recovery source handoff is missing from the authoritative API readback",
    "continuity drill workspace inputs are missing from the authoritative API readback",
    "transient incident command handoff is missing from the authoritative API readback",
    "validateV360SimulationReadback",
    "simulation workspace core read models are missing from the authoritative API readback",
    "simulation run ledger is missing from the authoritative API readback",
    "client notice preview is missing from the authoritative API readback",
    "Rule/VA what-if replay pack is missing from the authoritative API readback",
    "validateV390Ui092To105Readback",
    "schema or non-empty read model is missing",
    "viewer-safe action notice preview is missing from the authoritative API readback",
    '["onvif", "live", "review4"]',
    "/ops/api/vlm/rule-suggestion-drafts?limit=10",
    "/ops/api/events/reviews?eventId=",
    "matchingRuleSuggestionPresent",
    "resolveAuthoritativeReadback",
    "cleanupExpectedRecord",
    "freshAuthoritativeReadback",
    "verifyMutationReadback",
  ]) {
    assert(runtimeSource.includes(snippet), `case runtime missing P0 closure: ${snippet}`);
  }
  const accessStoreRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-access-seed-");
  try {
    const eventStoragePath = path.join(accessStoreRoot, "events.jsonl");
    seedEventRecordFixture(eventStoragePath, {
      eventId: "reviewed-event-id",
      sourceId: "9001",
    });
    const eventRecord = JSON.parse(fs.readFileSync(eventStoragePath, "utf8").trim());
    assert(eventRecord.schema === "media-server.va.event-record.v1" &&
      eventRecord.eventId === "reviewed-event-id" &&
      Number.isInteger(eventRecord.trackId) &&
      Number.isFinite(eventRecord.startTime) &&
      Number.isFinite(eventRecord.updateTime) &&
      Number.isFinite(eventRecord.endTime),
    "EventRecord transient seed is not accepted by the canonical event-store parser");
    const enrichedPath = path.join(accessStoreRoot, "enriched-events.jsonl");
    seedEventRecordFixture(enrichedPath, {
      eventId: "reviewed-related-event-id",
      sourceId: "9001",
      eventType: "related-incident",
      scenarioName: "review4-related-incident",
      snapshotPath: "snapshots/reviewed-related-event-id.jpg",
      clipPath: "clips/reviewed-related-event-id.mp4",
      metadata: { relatedTo: "reviewed-event-id", sourceHealth: "degraded" },
    });
    const enriched = JSON.parse(fs.readFileSync(enrichedPath, "utf8").trim());
    assert(enriched.eventType === "related-incident" &&
      enriched.scenarioName === "review4-related-incident" &&
      enriched.snapshotPath.endsWith(".jpg") && enriched.clipPath.endsWith(".mp4") &&
      enriched.metadata?.relatedTo === "reviewed-event-id" && enriched.metadata?.sourceHealth === "degraded",
    "EventRecord seed does not preserve related/evidence/source-health join material");
    const usersFile = path.join(accessStoreRoot, "users.json");
    fs.writeFileSync(usersFile, '{"users":[],"invites":[],"accessRequests":[]}\n', { mode: 0o600 });
    const seeded = seedExactAccessRequestFixture(usersFile, {
      requestId: "reviewed-request-id",
      username: "reviewed-request-user",
      viewId: "9001",
    });
    const stored = JSON.parse(fs.readFileSync(usersFile, "utf8")).accessRequests;
    assert(seeded.requestId === "reviewed-request-id" && stored.length === 1 &&
      stored[0].requestId === "reviewed-request-id" && stored[0].status === "pending",
    "access-request seed did not preserve the reviewed fixture identity/status");
  } finally {
    fs.rmSync(accessStoreRoot, { recursive: true, force: true });
  }
  assert(!runtimeSource.includes("fetch(`${httpBase}/client/api/access-requests`"),
    "access-request seed must not accept a random product-generated ID");
  assert(runtimeSource.includes('inviteId || value?.requestId'),
    "authoritative record identity must include inviteId/requestId");
  assert(runtimeSource.includes('mode: "whole-response"'),
    "client preference cleanup must compare the authoritative whole response");
  for (const collection of [
    '"/ops/api/sources"',
    '"/ops/api/views"',
    '"/ops/api/users"',
    '"/ops/api/access-requests"',
  ]) {
    assert(runtimeSource.includes(collection), `authoritative collection readback missing: ${collection}`);
  }
  assert(runtimeSource.includes('mode: "source-view-pair"'),
    "ONVIF/source channel cleanup must use paired source/view readback");
  assert(runtimeSource.includes("buildOnvifPairPayload"),
    "ONVIF runtime seed/restore must use the product source+publishedView schema");
  assert(!runtimeSource.includes("if (!allowedStatuses.includes(response.status) && !tolerate)"),
    "runtime readback must not tolerate undeclared 401/405/500 responses");

  assert(environmentSource.includes('.media_server.client_live_layout_preferences.jsonl'),
    "self-contained environment does not own the product preference storage path");
  assert(!environmentSource.includes('path.join(state.temporaryRoot, "ui-preferences.json")'),
    "self-contained environment still snapshots a non-product preference file");

  const visualFunction = runnerSource.slice(
    runnerSource.indexOf("async function executeVisualMatrix"),
    runnerSource.indexOf("async function executeWorkflowSetup"),
  );
  assert(visualFunction.includes("caseRuntime.freshRoleStorageState"),
    "visual matrix must acquire a fresh role session for every probe");
  assert(!visualFunction.includes("resolveRoleState("),
    "visual matrix must not reuse bootstrap storage state after exact mutations");

  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
  for (const snippet of [
    "safePersistedRequestBodyProjection",
    "safeFormResponseProjection",
    "captureEndpointOwnedResponseProjection",
    'safeResponseProjectionSource = "playwright-response-json"',
    "assertEndpointResponseSensitiveBoundary",
  ]) {
    assert(adapterSource.includes(snippet), `native adapter safe identity capture missing: ${snippet}`);
  }
  assert(!adapterSource.includes("safeResponseBody = payload"),
    "native adapter must not persist raw form responses containing invite/auth material");

  for (const snippet of [
    "preparePersistedUiLifecycle",
    "assertPersistedRequestBinding",
    "prepareFormSubmitUiLifecycle",
    "applyTypedFormInputs",
    "captureFormResponseIdentity",
    "runtimeMutationReadback",
    "primaryFailure",
    "cleanupFailure",
    "browserCloseFailure",
  ]) {
    assert(runnerSource.includes(snippet), `exact runner P0/P1 lifecycle closure missing: ${snippet}`);
  }
  const persistedCases = manifest.cases.filter(item => item.workflow.workflowClass === "persisted-mutation");
  assert(persistedCases.length === review4WorkflowClassExpectedCounts["persisted-mutation"],
    `persisted lifecycle count drift: ${persistedCases.length}/${review4WorkflowClassExpectedCounts["persisted-mutation"]}`);
  assert(new Set(persistedCases.map(item => item.workflow.controlSequence
    .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.adapter)).size >= 8,
  "persisted workflows must use domain-specific UI lifecycle adapters");
  const channelCases = persistedCases.filter(item => item.workflow.controlSequence
    .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.adapter === "channel-source-view-pair");
  assert(channelCases.length === 10 && channelCases.every(item => {
    const binding = item.workflow.controlSequence
      .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.requestBinding;
    return ["atomic-pair", "ordered-source-view-pair"].includes(binding?.mode) &&
      Array.isArray(binding.expectedRequests) &&
      binding.expectedRequests.length === (binding.mode === "atomic-pair" ? 1 : 2);
  }), "channel workflows must bind the atomic ONVIF or ordered source/view request transaction");
  const formCases = manifest.cases.filter(item => item.workflow.workflowClass === "form-submit");
  assert(formCases.length === 16, `form lifecycle count drift: ${formCases.length}/16`);
  const formCaseIds = formCases.map(item => item.caseId).sort();
  const formProfileIds = Object.keys(formReadbackProfiles).sort();
  assert(JSON.stringify(formCaseIds) === JSON.stringify(formProfileIds),
    "manifest form cases and authoritative runtime profiles must be an exact set");
  for (const item of formCases) {
    const profile = formReadbackProfiles[item.caseId];
    assert(profile.expectedBehaviorSha256 === item.oracle.expectedBehaviorSha256,
      `${item.caseId} form profile is not digest-bound to its reviewed expected behavior`);
    assert(Array.isArray(profile.requiredChecks) && profile.requiredChecks.length >= 3 &&
      new Set(profile.requiredChecks).size === profile.requiredChecks.length,
    `${item.caseId} form profile required-check coverage is incomplete`);
  }
  assert(formCases.every(item => item.workflow.controlSequence.find(action => action.kind === "submit-form")
    ?.uiLifecycle?.fieldControls.every(field =>
      ["fill", "select", "check", "hidden-binding", "readonly-value"].includes(field.control))),
  "form workflows must classify every field by typed UI control");
  for (const caseId of ["UI-002", "AUTH-005", "AUTH-006"]) {
    const setupCase = manifest.cases.find(item => item.caseId === caseId);
    const formInput = setupCase?.workflow.inputs.find(input => input.kind === "form-values");
    const usernameControl = setupCase?.workflow.controlSequence.find(action => action.kind === "submit-form")
      ?.uiLifecycle?.fieldControls.find(field => field.name === "username");
    assert(formInput?.actualValue?.username === "admin" &&
      usernameControl?.control === "readonly-value" &&
      usernameControl?.expectedValue === "admin" &&
      usernameControl?.valueSource === "product-fixed-admin",
    `${caseId} setup workflow must preserve the product-fixed readonly admin username`);
  }
  for (const snippet of ["readonly-value", "before.readOnly === true", "before.value === field.expectedValue"]) {
    assert(runnerSource.includes(snippet), `setup readonly runtime oracle missing: ${snippet}`);
  }
  for (const snippet of [
    "verifyFormSubmitReadback",
    "media-server.v390-ui-runtime-form-submit-readback.v1",
    "form authoritative readback profile is not registered",
    "form readback profile expected-behavior digest drift",
    "form readback evidence-key coverage drift",
    "setup-weak-strong-admin-store-login-whoami",
    "setup store contains plaintext password",
  ]) {
    assert((runnerSource + runtimeSource).includes(snippet), `setup authoritative form readback missing: ${snippet}`);
  }
  for (const snippet of [
    "weakPasswordStatus",
    "historyReuse",
    "originalSessionCookie",
    "beforeSetupClientStatus",
    "issued-invite-token",
    "expired-invite-token",
    "persistentSecretFieldsPresent",
    "containsForbiddenAuthMaterial",
    "pendingLoginDenied",
    "after-cleanup-original-login",
  ]) {
    assert((runnerSource + runtimeSource).includes(snippet),
      `case-specific authoritative form oracle missing: ${snippet}`);
  }
  const auth007 = formCases.find(item => item.caseId === "AUTH-007");
  assert(auth007.workflow.inputs.find(input => input.kind === "form-values")?.actualValue?.username === "admin",
    "AUTH-007 hashless-admin workflow must submit the product-fixed admin identity");
  for (const snippet of ["liveGridSize", "liveDensity", "liveDockSide", "ordered-source-view-pair"]) {
    assert(runnerSource.includes(snippet), `persisted UI lifecycle mutation/binding closure missing: ${snippet}`);
  }

  for (const caseId of ["SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-017"]) {
    const cleanup = manifest.cases.find(item => item.caseId === caseId)?.workflow.cleanup[0];
    assert(cleanup?.inverseAction?.localAction?.type === "restore-source-view-snapshot" &&
      cleanup.afterReadback?.expectation === "inactive-or-equal-before",
    `${caseId} soft-delete endpoint must not masquerade as absent cleanup`);
  }
  const mutationCases = manifest.cases.filter(item =>
    ["persisted-mutation", "form-submit"].includes(item.workflow.workflowClass));
  assert(mutationCases.every(item => {
    const cleanup = item.workflow.cleanup.find(candidate =>
      ["restore-fixture-state", "delete-created-fixture"].includes(candidate.kind));
    return cleanup?.inverseAction?.localAction?.type?.startsWith("restore-") &&
      ["equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation);
  }), "every persisted/form mutation must restore owned state or prove source/view inactive isolation");
  for (const snippet of ["restoreProductMutationState", "restoreSourceViewState"]) {
    assert(runtimeSource.includes(snippet), `runtime product-memory cleanup closure missing: ${snippet}`);
  }

  for (const snippet of [
    "roleStateMapPath",
    "storageStatePaths",
    "serverLogPath",
    "registrySeedPayloadPaths",
    "artifactPaths",
    "loopback",
  ]) {
    assert(runtimeSource.includes(snippet), `runtime descriptor containment closure missing: ${snippet}`);
  }
});

check("case runtime keeps generated secrets ephemeral and rejects state path escape", () => {
  const temporaryRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-case-runtime-");
  try {
    const stateFile = path.join(temporaryRoot, "users.json");
    const roleMapPath = path.join(temporaryRoot, "roles.json");
    const descriptorPath = path.join(temporaryRoot, "descriptor.json");
    const serverLogPath = path.join(temporaryRoot, "server.log");
    const eventStoragePath = path.join(temporaryRoot, "events.jsonl");
    fs.writeFileSync(stateFile, '{"users":[]}\n', { mode: 0o600 });
    fs.writeFileSync(roleMapPath, `${JSON.stringify({ schema: "media-server.v390-ui-role-state-map.v1", roles: {} })}\n`, { mode: 0o600 });
    fs.writeFileSync(serverLogPath, "", { mode: 0o600 });
    fs.writeFileSync(eventStoragePath, "", { mode: 0o600 });
    const descriptorFixture = stateFiles => ({
      schema: "media-server.v390-ui-runtime-descriptor.v1",
      temporaryRoot,
      httpBase: "http://127.0.0.1:1",
      httpPort: 1,
      roleStateMapPath: roleMapPath,
      serverLogPath,
      eventStoragePath,
      registrySeedPayloadPaths: {},
      artifactPaths: {},
      stateFiles,
      auth: { usersFile: stateFile, usernames: { operator: "operator" }, storageStatePaths: {} },
    });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      ...descriptorFixture([stateFile]),
    })}\n`, { mode: 0o600 });
    const runtime = createV390UiCaseRuntime({
      rootDir,
      httpBase: "http://127.0.0.1:1",
      runtimeDescriptorPath: descriptorPath,
      roleStateMapPath: roleMapPath,
      roleSecretsJson: JSON.stringify({ roles: { operator: "contract-current-secret" }, refs: {} }),
    });
    const item = { caseId: "CONTRACT", accountRole: "operator" };
    const generated = runtime.resolveSecretRef("CONTRACT:fixture-password", { item, field: "password" });
    assert(generated === runtime.resolveSecretRef("CONTRACT:fixture-password", { item, field: "confirm" }),
      "same runtime secretRef must resolve consistently inside one case runtime");
    assert(generated !== "contract-current-secret" && generated.length >= 24,
      "new fixture password must be generated independently of the current role password");
    assert(runtime.resolveSecretRef("CONTRACT:fixture-current-password", { item, field: "currentPassword" }) === "contract-current-secret",
      "current-password secretRef must bind the actual role credential");
    assert(!fs.readFileSync(descriptorPath, "utf8").includes(generated),
      "generated runtime secret leaked into the safe descriptor");
    assert(runtimeSource.includes("acceptance-owned-state-file-byte-readback") &&
      runtimeSource.includes("cleanup/readback left authoritative state changed") &&
      runtimeSource.includes("assert(!unexpectedStateChange"),
    "case runtime authoritative state boundary is not fail-closed");

    const escapedPath = path.join("/private/tmp", `v390-case-runtime-escape-${process.pid}.json`);
    fs.writeFileSync(escapedPath, "{}\n", { mode: 0o600 });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      ...descriptorFixture([escapedPath]),
      auth: { usersFile: stateFile, usernames: {}, storageStatePaths: {} },
    })}\n`, { mode: 0o600 });
    let rejected = false;
    try {
      createV390UiCaseRuntime({ rootDir, httpBase: "http://127.0.0.1:1", runtimeDescriptorPath: descriptorPath, roleStateMapPath: roleMapPath });
    } catch (error) {
      rejected = String(error.message).includes("escapes temporary root");
    }
    fs.rmSync(escapedPath, { force: true });
    assert(rejected, "runtime descriptor accepted a state file outside its temporary root");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

check("authoritative cleanup readback restores state after success and failure", async () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_cleanup_readback_"));
  const stateFile = path.join(temporaryRoot, "users.json");
  const baseline = Buffer.from('{"users":[{"username":"operator","lastLoginAt":""}]}\n');
  const fixtureUsername = "auth-020-review4-fixture";
  const snapshots = [{
    path: stateFile,
    exists: true,
    mode: 0o600,
    bytes: baseline.toString("base64"),
  }];
  try {
    fs.writeFileSync(stateFile, baseline, { mode: 0o600 });
    const result = await runAuthoritativeReadbackWithSnapshotRestore({
      snapshots,
      readback: async () => {
        fs.writeFileSync(stateFile,
          `{"users":[{"username":"operator","lastLoginAt":"changed"},{"username":"${fixtureUsername}","enabled":false}]}\n`);
        return { status: 302 };
      },
      label: "AUTH-020 successful primary cleanup",
    });
    assert(result.status === 302, "successful cleanup readback result was not preserved");
    assert(fs.readFileSync(stateFile).equals(baseline),
      "successful cleanup readback left authoritative state changed");
    assertAuthFixtureAbsentFromUsersFile(stateFile, fixtureUsername);

    let failureMessage = "";
    try {
      await runAuthoritativeReadbackWithSnapshotRestore({
        snapshots,
        readback: async () => {
          fs.writeFileSync(stateFile,
            `{"users":[{"username":"operator","lastLoginAt":"failed"},{"username":"${fixtureUsername}","enabled":false}]}\n`);
          throw new Error("intentional readback failure");
        },
        label: "AUTH-020 failing primary cleanup",
      });
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : String(error);
    }
    assert(failureMessage === "intentional readback failure",
      "cleanup readback failure was not preserved");
    assert(fs.readFileSync(stateFile).equals(baseline),
      "failed cleanup readback left authoritative state changed");
    assertAuthFixtureAbsentFromUsersFile(stateFile, fixtureUsername);
    assert(runtimeSource.includes("fresh authoritative cleanup readback expected an absent fixture") &&
      runtimeSource.includes("assertAuthFixtureAbsentFromUsersFile") &&
      runtimeSource.includes("context.cleanupExpectedRecord = null"),
    "AUTH-020 fresh absent cleanup readback is not fail closed");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

check("SRC-010 and SRC-019 use a fresh fixture-scoped viewer and restore auth bytes", () => {
  for (const fixtureId of ["3900010", "3900019"]) {
    assert(JSON.stringify(fixtureViewerScopes(fixtureId)) === JSON.stringify([
      `view:read:${fixtureId}`,
      `dashboard:read:${fixtureId}`,
      `event:read:${fixtureId}`,
      `metadata:read:${fixtureId}`,
    ]), `${fixtureId} fixture viewer scope projection drift`);
  }
  for (const snippet of [
    '["SRC-010", "SRC-019"].includes(item.caseId)',
    "requestFixtureScopedViewerReadback",
    "scopeRuntimeViewerToView(context.fixtureId)",
    "fixture-scoped viewer fresh login",
    "runAuthoritativeReadbackWithSnapshotRestore",
    "operatorOrAdminBypass: false",
    'postForm(`${httpBase}/logout`, {}, { cookie })',
  ]) {
    assert(runtimeSource.includes(snippet),
      `fixture-scoped viewer readback lifecycle missing: ${snippet}`);
  }
  assert(!runtimeSource.includes(
    'null, item, context, [404], { freshRole: true, roleOverride: "viewer" }',
  ), "SRC endpoint readback still uses the default unscoped viewer session");
});

check("fresh role session restores login audit writes before a read-only case", async () => {
  const temporaryRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-fresh-role-");
  const stateFile = path.join(temporaryRoot, "users.json");
  const roleMapPath = path.join(temporaryRoot, "roles.json");
  const descriptorPath = path.join(temporaryRoot, "descriptor.json");
  const serverLogPath = path.join(temporaryRoot, "server.log");
  const eventStoragePath = path.join(temporaryRoot, "events.jsonl");
  const baseline = Buffer.from('{"users":[{"username":"operator","lastLoginAt":"","lastLoginIp":""}]}\n');
  const originalFetch = globalThis.fetch;
  try {
    fs.writeFileSync(stateFile, baseline, { mode: 0o600 });
    fs.writeFileSync(roleMapPath,
      `${JSON.stringify({ schema: "media-server.v390-ui-role-state-map.v1", roles: {} })}\n`,
      { mode: 0o600 });
    fs.writeFileSync(serverLogPath, "", { mode: 0o600 });
    fs.writeFileSync(eventStoragePath, "", { mode: 0o600 });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      schema: "media-server.v390-ui-runtime-descriptor.v1",
      temporaryRoot,
      httpBase: "http://127.0.0.1:1",
      httpPort: 1,
      roleStateMapPath: roleMapPath,
      serverLogPath,
      eventStoragePath,
      registrySeedPayloadPaths: {},
      artifactPaths: {},
      stateFiles: [stateFile],
      auth: {
        usersFile: stateFile,
        usernames: { operator: "operator" },
        storageStatePaths: {},
      },
    })}\n`, { mode: 0o600 });
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      if (url.pathname === "/login") {
        fs.writeFileSync(stateFile,
          '{"users":[{"username":"operator","lastLoginAt":"changed","lastLoginIp":"127.0.0.1"}]}\n');
        return new Response("", {
          status: 302,
          headers: { location: "/ops/home", "set-cookie": "media_session=contract-cookie; Path=/; HttpOnly" },
        });
      }
      if (url.pathname === "/auth/whoami") {
        return new Response(JSON.stringify({
          authenticated: true,
          username: "operator",
          role: "operator",
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected fresh-role contract request: ${url.pathname}`);
    };
    const runtime = createV390UiCaseRuntime({
      rootDir,
      httpBase: "http://127.0.0.1:1",
      runtimeDescriptorPath: descriptorPath,
      roleStateMapPath: roleMapPath,
      roleSecretsJson: JSON.stringify({ roles: { operator: "contract-current-secret" }, refs: {} }),
    });
    const storageStatePath = await runtime.freshRoleStorageState("operator", "UI-009");
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
    assert(storageState.cookies?.[0]?.value === "contract-cookie",
      "fresh role session did not preserve the issued session cookie");
    assert(fs.readFileSync(stateFile).equals(baseline),
      "fresh role session left login audit fields changed before read-only case execution");
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

check("fresh viewer session uses scope and client view readback instead of a nonexistent whoami viewId", async () => {
  const temporaryRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-fresh-viewer-");
  const stateFile = path.join(temporaryRoot, "users.json");
  const roleMapPath = path.join(temporaryRoot, "roles.json");
  const descriptorPath = path.join(temporaryRoot, "descriptor.json");
  const serverLogPath = path.join(temporaryRoot, "server.log");
  const eventStoragePath = path.join(temporaryRoot, "events.jsonl");
  const viewId = "94097";
  const scopes = fixtureViewerScopes(viewId);
  const baseline = Buffer.from(`${JSON.stringify({
    users: [{
      username: "viewer",
      role: "viewer",
      scopes,
      lastLoginAt: "",
      lastLoginIp: "",
    }],
  })}\n`);
  const originalFetch = globalThis.fetch;
  try {
    fs.writeFileSync(stateFile, baseline, { mode: 0o600 });
    fs.writeFileSync(roleMapPath,
      `${JSON.stringify({ schema: "media-server.v390-ui-role-state-map.v1", roles: {} })}\n`,
      { mode: 0o600 });
    fs.writeFileSync(serverLogPath, "", { mode: 0o600 });
    fs.writeFileSync(eventStoragePath, "", { mode: 0o600 });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      schema: "media-server.v390-ui-runtime-descriptor.v1",
      temporaryRoot,
      httpBase: "http://127.0.0.1:1",
      httpPort: 1,
      roleStateMapPath: roleMapPath,
      serverLogPath,
      eventStoragePath,
      registrySeedPayloadPaths: {},
      artifactPaths: {},
      stateFiles: [stateFile],
      auth: {
        usersFile: stateFile,
        usernames: { viewer: "viewer" },
        storageStatePaths: {},
      },
    })}\n`, { mode: 0o600 });
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      if (url.pathname === "/login") {
        fs.writeFileSync(stateFile, Buffer.from(`${JSON.stringify({
          users: [{
            username: "viewer",
            role: "viewer",
            scopes,
            lastLoginAt: "changed",
            lastLoginIp: "127.0.0.1",
          }],
        })}\n`));
        return new Response("", {
          status: 302,
          headers: { location: "/client/live", "set-cookie": "media_session=viewer-cookie; Path=/; HttpOnly" },
        });
      }
      if (url.pathname === "/auth/whoami") {
        return new Response(JSON.stringify({
          authenticated: true,
          username: "viewer",
          role: "viewer",
          scopes,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.pathname === "/client/api/views") {
        return new Response(JSON.stringify({ views: [{ viewId }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === `/client/api/views/${viewId}`) {
        return new Response(JSON.stringify({ view: { viewId } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected fresh-viewer contract request: ${url.pathname}`);
    };
    const runtime = createV390UiCaseRuntime({
      rootDir,
      httpBase: "http://127.0.0.1:1",
      runtimeDescriptorPath: descriptorPath,
      roleStateMapPath: roleMapPath,
      roleSecretsJson: JSON.stringify({ roles: { viewer: "contract-current-secret" }, refs: {} }),
    });
    const storageStatePath = await runtime.freshRoleStorageState("viewer", "RULE-097");
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
    assert(storageState.cookies?.[0]?.value === "viewer-cookie",
      "fresh viewer session did not preserve the issued session cookie");
    assert(fs.readFileSync(stateFile).equals(baseline),
      "fresh viewer session left login audit fields changed");
    assert(!runtimeSource.includes("whoami.json?.viewId"),
      "fresh viewer session still depends on the nonexistent whoami viewId field");
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

check("canonical requested route and runtime screen route are explicit projections", () => {
  const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
  const projected = manifest.cases.filter(item => item.canonicalRoute !== item.screenRoute);
  const expectedProjected = manifest.cases.filter(item => {
    const canonicalCase = canonicalById.get(item.caseId);
    return item.disposition !== "negative-route" &&
      normalizeProductScreenRoute(canonicalCase?.route || "") !== canonicalCase?.route;
  });
  assert(projected.length === expectedProjected.length,
    `canonical/runtime route projection count mismatch: ${projected.length}/${expectedProjected.length}`);
  for (const item of manifest.cases) {
    const canonicalCase = canonicalById.get(item.caseId);
    assert(item.canonicalRoute === canonicalCase?.route,
      `${item.caseId} canonical requested route drift`);
    const expectedScreenRoute = item.disposition === "negative-route"
      ? canonicalCase.route
      : normalizeProductScreenRoute(canonicalCase.route);
    assert(item.screenRoute === expectedScreenRoute,
      `${item.caseId} runtime screen route projection drift`);
    assert(item.disposition === "negative-route" || !item.screenRoute.includes("/api/"),
      `${item.caseId} runtime screen route retains API ownership route`);
  }
});

check("runner and producer share typed capture schema while qualifier is independently implemented", () => {
  for (const source of [nativeLibrarySource, runnerSource, producerSource]) {
    assert(source.includes("v390_ui_requested_observed_schema.mjs"),
      "requested/observed capture schema is not shared by runner and producer");
  }
  assert(policyLibrarySource.includes("v390_ui_policy_v4_independent_qualifier.mjs") &&
    !policyLibrarySource.includes("v390_ui_requested_observed_schema.mjs"),
  "Policy qualifier reuses the producer requested/observed validator");
  assert(runnerSource.includes("canonicalRequestedProjection(item)"),
    "runner requested canonical projection missing");
  assert(!runnerSource.includes("requested: {\n      route: item.screenRoute"),
    "legacy requested screen-route/role object remains");
  assert(runnerSource.includes("observeRequestedObservedState"),
    "runner does not independently observe screen route/role/viewport/theme/control action");
  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
  assert(adapterSource.includes("response.status === 401") &&
    adapterSource.includes("whoami observation failed with status") &&
    adapterSource.includes("whoami observation returned an invalid authenticated principal"),
  "adapter folds whoami transport/status/schema failures into anonymous role");
  assert(!adapterSource.includes("principal = null"),
    "adapter retains whoami failure-to-anonymous fallback");
  assert(!producerSource.includes("result.observed || result.requested"),
    "producer still falls back from missing observed to requested");
  const source = manifest.cases.find(item => item.caseId === "SRC-031");
  const requested = canonicalRequestedProjection(source);
  const observed = expectedRuntimeObservation(source);
  assert(requested.route === "/ops/api/onvif/import-draft" && observed.screenRoute === "/ops/sources",
    "SRC-031 canonical API request/runtime screen projection mismatch");
  assert(validateRequestedObservedEnvelope({
    requested,
    observed,
    canonicalCase: canonical.cases.find(item => item.testId === source.caseId),
    nativeCase: source,
  }).length === 0, "valid requested/observed envelope rejected");

  const negativeCases = [
    ["requested-role-alias", value => { value.requested.role = value.requested.accountRole; }, "requested-fields-mismatch"],
    ["requested-control-missing", value => { delete value.requested.controlAction; }, "requested-fields-mismatch"],
    ["observed-route-alias", value => { value.observed.route = value.observed.screenRoute; }, "observed-fields-mismatch"],
    ["observed-missing", value => { value.observed = undefined; }, "observed-object-missing"],
    ["observed-api-route", value => { value.observed.screenRoute = value.requested.route; }, "observed-screenRoute-api-route-forbidden"],
    ["viewport-string", value => { value.observed.viewport.width = "390"; }, "observed-viewport-invalid"],
    ["theme-invalid", value => { value.observed.theme = "system"; }, "observed-theme-invalid"],
    ["control-manifest-copy", value => { value.observed.controlAction = structuredClone(value.requested.controlAction); }, "observed-controlAction-fields-mismatch"],
  ];
  for (const [label, mutateEnvelope, expectedError] of negativeCases) {
    const candidate = { requested: structuredClone(requested), observed: structuredClone(observed) };
    mutateEnvelope(candidate);
    const errors = validateRequestedObservedEnvelope({
      ...candidate,
      canonicalCase: canonical.cases.find(item => item.testId === source.caseId),
      nativeCase: source,
    });
    assert(errors.includes(expectedError), `${label} did not fail with ${expectedError}: ${errors.join(",")}`);
  }
  for (const [label, mutateObserved, expectedError] of [
    ["raw-extra-alias", value => { value.route = value.screenRoute; }, "observed-fields-mismatch"],
    ["raw-missing-control-state", value => { delete value.controlAction.exists; }, "observed-controlAction-fields-mismatch"],
    ["raw-missing-provenance", value => { delete value.provenance.accountRole; }, "observed-provenance-fields-mismatch"],
    ["raw-forged-provenance", value => { value.provenance.theme = "runner-default"; }, "observed-provenance-theme-mismatch"],
  ]) {
    const raw = structuredClone(observed);
    mutateObserved(raw);
    let message = "";
    try { runtimeObservedProjection(raw); } catch (error) { message = String(error?.message || error); }
    assert(message.includes(expectedError), `${label} raw observation drift was normalized away: ${message}`);
  }
});

check("missing, reordered, unsupported, API-screen, and field drift are rejected", () => {
  expectInvalid("missing", mutate(value => value.cases.pop()), "canonical exact case count");
  expectInvalid("reordered", mutate(value => value.cases.reverse()), "canonical ordered case IDs");
  expectInvalid("unsupported", mutate(value => { value.cases[0].disposition = "unsupported"; }), "unsupported disposition");
  expectInvalid("api-screen", mutate(value => { value.cases[0].screenRoute = "/ops/api/audit"; }), "raw API screen route");
  expectInvalid("role-drift", mutate(value => { value.cases[0].accountRole = "admin"; }), "accountRole drift");
  expectInvalid("viewport-drift", mutate(value => { value.cases[0].viewport.width = 1180; }), "viewport drift");
  expectInvalid("oracle-drift", mutate(value => { value.cases[0].oracle.expectedBehaviorSha256 = "0".repeat(64); }), "oracle digest drift");
});

check("stale implementation binding writes a fail-closed 0/424 pre-execution summary", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-native-pre-execution-"));
  temporaryDirs.push(workspace);
  const staleManifestPath = path.join(workspace, "stale-native.json");
  const outputDir = path.join(workspace, "output");
  const stale = structuredClone(manifest);
  stale.sourceBindings.implementationProjectionSha256 = "0".repeat(64);
  fs.writeFileSync(staleManifestPath, `${JSON.stringify(stale, null, 2)}\n`, "utf8");
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--manifest", staleManifestPath,
    "--output-dir", outputDir,
    "--plan-only",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status !== 0, "stale implementation binding must fail before execution");
  const summaryPath = path.join(outputDir, "summary.json");
  assert(fs.existsSync(summaryPath), "pre-execution failure summary missing");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  assert(validateNativeExactPreExecutionFailureSummary(summary).length === 0,
    `pre-execution failure summary invalid: ${validateNativeExactPreExecutionFailureSummary(summary).join(", ")}`);
  assert(summary.failure.error.includes("implementation case projection drift"),
    `unexpected pre-execution failure: ${summary.failure.error}`);
});

check("actual runner bootstrap failure writes a fail-closed 0/424 summary", () => {
  const workspace = fs.mkdtempSync(path.join(rootDir, ".tmp-v390-native-bootstrap-contract-"));
  try {
    const outputDir = path.join(workspace, "output");
    const run = spawnSync(path.join(rootDir, "server.sh"), [
      "run-v390-ui-native-exact-cases",
      "--output-dir", outputDir,
      "--http-base", "http://127.0.0.1:1",
      "--server-log", path.join(rootDir, "VERSION"),
      "--build-path", path.join(rootDir, "VERSION"),
      "--role-state-map", path.join(workspace, "missing-role-state-map.json"),
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert(run.status !== 0, "missing role-state map must fail runner bootstrap");
    const summaryPath = path.join(outputDir, "summary.json");
    assert(fs.existsSync(summaryPath), `bootstrap failure summary missing: ${run.stderr || run.stdout}`);
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    assert(validateNativeExactPreExecutionFailureSummary(summary).length === 0,
      `bootstrap failure summary invalid: ${validateNativeExactPreExecutionFailureSummary(summary).join(", ")}`);
    assert(summary.failure.phase === "runtime-bootstrap", "bootstrap failure phase mismatch");
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

check("pre-execution failure cannot become UI PASS, Policy v4 eligible, or cleanup evidence", () => {
  const base = createNativeExactPreExecutionFailureSummary({
    error: new Error("implementation source binding drift"),
    manifest,
    canonical,
  });
  const measuredEnvironmentCleanup = {
    status: "PASS",
    serversStopped: true,
    portsClean: true,
    temporaryArtifactsRemoved: true,
    runtimeEvidence: true,
    verificationSource: "pid-port-artifact-before-after-observation",
  };
  assert(validateNativeExactCleanupContract({
    stageAttempted: true,
    summary: base,
    acceptanceEnvironmentCleanup: measuredEnvironmentCleanup,
  }).length === 0, "valid pre-execution lifecycle must accept measured acceptance cleanup");

  const missingSummaryErrors = validateNativeExactCleanupContract({
    stageAttempted: true,
    summary: null,
    acceptanceEnvironmentCleanup: measuredEnvironmentCleanup,
  });
  assert(missingSummaryErrors.includes("UI child summary missing"), "missing pre-execution summary was accepted");

  const resourcesAcquired = structuredClone(base);
  resourcesAcquired.childResourcesAcquired = true;
  resourcesAcquired.cleanupRequired = true;
  assert(validateNativeExactCleanupContract({
    stageAttempted: true,
    summary: resourcesAcquired,
    acceptanceEnvironmentCleanup: measuredEnvironmentCleanup,
  }).some(error => error.includes("without measured cleanup")),
  "acquired child resources without cleanup were accepted");

  const falsePass = structuredClone(base);
  falsePass.uiFulltestPass = true;
  assert(validateNativeExactPreExecutionFailureSummary(falsePass).some(error => error.includes("UI PASS")),
    "0/424 pre-execution failure became UI PASS");

  const falsePolicy = structuredClone(base);
  falsePolicy.policyV4Qualification.status = "eligible";
  assert(validateNativeExactPreExecutionFailureSummary(falsePolicy).some(error => error.includes("Policy v4")),
    "pre-execution failure became Policy v4 eligible");
});

check("raw capture success and UI qualification remain separate lifecycle states", () => {
  const captured = {
    schema: "media-server.ui-automation-evidence.v4",
    contractFixture: false,
    result: "CAPTURED",
    executionKind: "actual-native-visible-dom",
    actualBrowserExecution: true,
    manualIntervention: false,
    selectedAdapter: { engine: "playwright-native", fallbackUsed: false },
    coverage: {
      targetCount: 424,
      attempted: 424,
      pass: 424,
      captured: 424,
      fail: 0,
      notRun: 0,
      unsupported: 0,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    cases: manifest.cases.map(item => ({ testId: item.caseId, rawOutcome: "completed" })),
    uiFulltestPass: false,
  };
  assert(validateNativeExactCaptureSummary(captured).length === 0,
    `complete raw capture was rejected: ${validateNativeExactCaptureSummary(captured).join(", ")}`);

  const falsePass = structuredClone(captured);
  falsePass.result = "PASS";
  falsePass.uiFulltestPass = true;
  const falsePassErrors = validateNativeExactCaptureSummary(falsePass);
  assert(falsePassErrors.some(error => error.includes("CAPTURED")) &&
    falsePassErrors.some(error => error.includes("UI fulltest PASS")),
  "raw capture was allowed to self-qualify as UI PASS");
});

check("evidence producer failure always leaves an exact 424 failure ledger", () => {
  const results = manifest.cases.map((item, index) => ({
    caseId: item.caseId,
    featureId: item.featureId,
    status: index < 3 ? "PASS" : (index === 3 ? "FAIL" : "not-run"),
    reason: index === 3 ? "evidence producer failure" : "not run after previous native case failure",
  }));
  const summary = createNativeExactExecutionFailureSummary({
    error: new Error("Policy v4 evidence production failed"),
    manifest,
    results,
    phase: "policy-v4-evidence-production",
  });
  assert(summary.result === "FAIL" && summary.cases.length === 424,
    "execution failure summary did not preserve the exact ledger");
  assert(summary.executed === 4 &&
    summary.coverage.attempted === 4 && summary.coverage.pass === 3 &&
    summary.coverage.captured === 3 && summary.coverage.fail === 1 && summary.coverage.notRun === 420,
    "execution failure coverage is not exact");
  const actualBoundaryResults = manifest.cases.map((item, index) => ({
    caseId: item.caseId,
    featureId: item.featureId,
    status: index < 278 ? "PASS" : (index === 278 ? "FAIL" : "not-run"),
  }));
  const actualBoundary = createNativeExactExecutionFailureSummary({
    error: new Error("RULE-095 runtime failure"),
    manifest,
    results: actualBoundaryResults,
  });
  assert(actualBoundary.executed === 279 &&
    actualBoundary.coverage.attempted === 279 &&
    actualBoundary.coverage.pass === 278 &&
    actualBoundary.coverage.fail === 1 &&
    actualBoundary.coverage.notRun === 145 &&
    actualBoundary.coverage.attempted + actualBoundary.coverage.notRun === 424,
  "RULE-095 actual 279/278/1/145 boundary was aggregated incorrectly");
  assert(summary.policyV4Qualification.status === "not-run" && summary.uiFulltestPass === false,
    "producer failure became Policy v4 or UI PASS");
  assert(summary.childResourcesAcquired === true && summary.cleanupRequired === true,
    "execution failure lost the acquired-resource cleanup boundary");
});

check("failed case partial artifacts are referenced, deduplicated, and orphan-free", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_partial_artifacts_"));
  try {
    const screenshots = path.join(workspace, "screenshots");
    const traces = path.join(workspace, "traces");
    fs.mkdirSync(screenshots, { recursive: true });
    fs.mkdirSync(traces, { recursive: true });
    const canonicalPath = path.join(screenshots, "UI-001.png");
    const failedPath = path.join(screenshots, "UI-004.png");
    const orphanPath = path.join(screenshots, "UI-999.png");
    for (const filePath of [canonicalPath, failedPath, orphanPath]) fs.writeFileSync(filePath, png1x1());
    const tracePath = path.join(traces, "UI-001.json");
    fs.writeFileSync(tracePath, "{}\n", "utf8");
    const items = [
      { caseId: "UI-001", screenshotPath: canonicalPath, tracePath },
      { caseId: "UI-004", status: "FAIL", screenshotPath: failedPath },
    ];
    pruneUnreferencedArtifactFiles({
      roots: [screenshots, traces],
      referencedPaths: items.flatMap(item => [item.screenshotPath, item.tracePath]).filter(Boolean),
    });
    deduplicateScreenshotArtifacts(items);
    const scan = scanArtifactTree(workspace);
    assert(!fs.existsSync(orphanPath), "unreferenced partial artifact remained");
    assert(items[1].screenshotPath === canonicalPath && items[1].screenshotEvidence?.deduplicated === true,
      "failed case duplicate screenshot did not bind to the canonical artifact");
    assert(scan.duplicateScreenshotFiles === 0, "failed case left duplicate screenshot bytes");
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

const result = await runChecks();
console.log("");
console.log("== v3.9.0 exact native UI case contract summary ==");
console.log("- canonicalExactCases: 424");
console.log("- positiveNative: 423");
console.log("- negativeRoute: 1");
console.log("- unsupported: 0");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (result.fail > 0) process.exit(1);

function mutate(fn) {
  const value = structuredClone(manifest);
  fn(value);
  return value;
}

function expectInvalid(label, value, expectedMessage) {
  let failed = false;
  try {
    validateNativeExactManifest({ manifest: value, canonical, implementation });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes(expectedMessage), `${label} missing error ${expectedMessage}: ${error.message}`);
  }
  assert(failed, `${label} must fail`);
}

function countKinds(items) {
  const counts = {};
  for (const item of items) counts[item.kind] = (counts[item.kind] || 0) + 1;
  return counts;
}

function isRouteRootSelector(value) {
  return value === "body" || /^body\.(?:ops|client|auth|product)-shell$/.test(value || "");
}

function locatorIdentity(value) {
  return `${value?.file || ""}#${value?.symbol || ""}#${value?.contextSha256 || ""}`;
}

function assertSourceLocator(locator, label) {
  assert(locator?.file && locator?.anchor, `${label} source locator file/anchor missing`);
  assert(!path.isAbsolute(locator.file) && !locator.file.split(/[\\/]/).includes(".."),
    `${label} source locator path must stay repository-relative`);
  assert(trackedFiles.has(locator.file), `${label} source locator is not tracked: ${locator.file}`);
  const source = sourceCache.has(locator.file)
    ? sourceCache.get(locator.file)
    : fs.readFileSync(path.join(rootDir, locator.file), "utf8");
  sourceCache.set(locator.file, source);
  assert(source.includes(locator.anchor), `${label} source anchor missing from ${locator.file}`);
  assert(/^[a-f0-9]{64}$/.test(locator.contextSha256 || ""), `${label} context digest missing`);
  assert(locator.anchorSha256 === sha256Text(locator.anchor), `${label} source anchor digest drift`);
  if (String(locator.symbol || "").startsWith("review4-primary-control:")) {
    assert(source.split(locator.anchor).length === 2, `${label} source anchor must be unique`);
    assert(!locator.sourceFileSha256 && locator.contextSha256 === locator.anchorSha256,
      `${label} primary control must use row-local anchor binding`);
  }
  if (locator.sourceFileSha256) {
    const sourceFileSha256 = sha256Text(source);
    assert(locator.sourceFileSha256 === sourceFileSha256, `${label} source file digest drift`);
    assert(locator.contextSha256 === sourceFileSha256,
      `${label} override context digest must bind the actual tracked source file`);
  }
}

function hasMixedSuccessAndErrorStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : [];
  return values.some(status => status >= 200 && status < 400) &&
    values.some(status => status >= 400 && status < 600);
}

function containsLiteralAuthMaterial(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (/^(?:password|currentPassword|confirm|confirmPassword|token)$/i.test(key) &&
        (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue) ||
         typeof fieldValue.secretRef !== "string" || fieldValue.secretRef.length === 0 ||
         fieldValue.redacted !== true)) {
      return true;
    }
    if (fieldValue && typeof fieldValue === "object" && containsLiteralAuthMaterial(fieldValue)) return true;
  }
  return false;
}

function extractRunnerKindAllowlist(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = runnerSource.match(new RegExp(`const ${escaped} = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);`));
  assert(match, `runner allowlist missing: ${name}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1]).sort();
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function check(name, fn) {
  checks.push({ name, fn });
}

async function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      await item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function expectManifestInvalid(value, canonicalValue, implementationValue, expectedMessage) {
  let message = "";
  try {
    validateNativeExactManifest({
      manifest: value,
      canonical: canonicalValue,
      implementation: implementationValue,
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes(expectedMessage),
    `missing error ${expectedMessage}: ${message || "validation unexpectedly passed"}`);
}

function png1x1() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==", "base64");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
