#!/usr/bin/env node
// 파일 용도: RELEASE evidence와 분리된 REVIEW4-65 후반 exact UI 진단 sweep을 실행한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  startSelfContainedUiEnvironment,
  stopSelfContainedUiEnvironment,
} from "./v390_acceptance_ui_environment.mjs";
import {
  buildNativeExactManifest,
  validateNativeExactManifest,
} from "./v390_ui_native_exact_cases_lib.mjs";
import {
  aggregateDiagnosticChildOutcome,
  classifyDiagnosticCaseDisposition,
  copyEventReviewSeedWriteEvidence,
  diagnosticRequestSemanticAssertionBindingValid,
  diagnosticStructuredAssertionEvidenceValid,
  diagnosticChildSourceBindingErrors,
  eventReviewSeedDiagnosticCaseIds,
  validateEvt004LifecycleEvidence,
} from "./v390_ui_diagnostic_lifecycle_lib.mjs";
import { validateEventDomSemanticCompositeEvidence } from "./v390_ui_exact_oracle_runtime.mjs";
import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import { buildCanonicalSharedAdapterImpact } from "./v390_ui_shared_adapter_lifecycle.mjs";
import {
  buildDiagnosticSelectionContract,
  diagnosticSelectionModeForArtifactSchema,
  diagnosticSelectionModes,
  validateDiagnosticSelectionContract,
} from "./v390_ui_diagnostic_selection_registry.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const options = parseArgs(process.argv.slice(2));
const runId = options.runId || `v390-ui-diagnostic-${timestampId()}-${process.pid}`;
const outputDir = options.outputDir
  ? resolveRootOrAbsolute(options.outputDir)
  : path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep", runId);
const summaryPath = path.join(outputDir, "summary.json");
const progressPath = path.join(outputDir, "progress.json");

assertDiagnosticOutputRoot(outputDir);
fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const manifest = buildNativeExactManifest({ canonical, implementation });
validateNativeExactManifest({ manifest, canonical, implementation });
const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
writeJson(diagnosticManifestPath, manifest);
const fullSelection = fixedSelection(manifest.cases);
const selectionMode = options.selectionArtifact
  ? selectionModeForArtifact(options.selectionArtifact)
  : options.caseId
    ? diagnosticSelectionModes.explicitPositiveCase
    : diagnosticSelectionModes.fixedRemainingSweep;
const selection = selectedDiagnosticCases({
  fullSelection,
  manifestCases: manifest.cases,
  caseId: options.caseId,
  selectionArtifact: options.selectionArtifact,
  selectionMode,
});
const selectionContract = buildDiagnosticSelectionContract({
  mode: selectionMode,
  selectedIds: selection.map(item => item.caseId),
});
validateDiagnosticSelectionContract(selectionContract, {
  expectedMode: selectionMode,
  manifestCaseIds: manifest.cases.map(item => item.caseId),
});
const selectionContractPath = path.join(outputDir, "diagnostic-selection.json");
writeJson(selectionContractPath, selectionContract);
const sourceCommit = currentGitCommit();
const sourceManifestSha256 = sha256(stableJson(manifest));
let uiBuildBinding = null;

if (options.bootstrapFailureContractFixture) {
  const bootstrapError = bootstrapFailureContractFixture(options.bootstrapFailureContractFixture);
  const bootstrapFailure = buildBootstrapFailureEvidence(bootstrapError);
  const bootstrapCleanup = {
    generation: 1,
    reason: "bootstrap-failure",
    ...bootstrapFailure.cleanup,
  };
  const summary = buildSummary({
    result: "FAIL",
    executionStatus: "diagnostic-sweep-bootstrap-failure-contract-fixture",
    cases: [caseResult(selection[0], "FAIL", "environment-bootstrap-failed", 1, {
      environmentContamination: bootstrapFailure.cleanup.status !== "PASS",
      bootstrapFailure,
    })],
    environments: [{
      generation: 1,
      status: "bootstrap-failed",
      bootstrapFailure,
    }],
    cleanup: [bootstrapCleanup],
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}

if (options.planOnly) {
  const childSelectionPreflight = await runDiagnosticSelectionPreflight({
    buildSha256: "0".repeat(64),
  });
  const preflightPassed = childSelectionPreflight.status === "PASS";
  const summary = buildSummary({
    result: preflightPassed ? "NOT-RUN" : "FAIL",
    executionStatus: preflightPassed
      ? "diagnostic-plan-only-not-browser-evidence"
      : "diagnostic-child-selection-preflight-failed",
    cases: selection.map(item => caseResult(item, "not-run",
      preflightPassed ? "plan-only" : "child-selection-preflight-failed", 0, {
        actualBrowserExecution: false,
      })),
    environments: [],
    cleanup: [],
    childSelectionPreflight,
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(preflightPassed ? 0 : 1);
}

try {
  uiBuildBinding = buildCurrentSourceBoundBinary();
} catch (error) {
  const summary = buildSummary({
    result: "FAIL",
    executionStatus: "diagnostic-current-source-build-failed",
    cases: [caseResult(selection[0], "FAIL", "current-source-build-failed", 0, {
      actualBrowserExecution: false,
      failurePhase: "current-source-build",
      failureCode: "DIAGNOSTIC_CURRENT_SOURCE_BUILD_FAILED",
    })],
    environments: [],
    cleanup: [],
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}

let environment = null;
let environmentGeneration = 0;
let bootstrapUnavailable = false;
let abortReason = "";
const cases = [];
const environments = [];
const cleanup = [];

const childSelectionPreflight = await runDiagnosticSelectionPreflight({
  buildSha256: uiBuildBinding.buildSha256,
});
if (childSelectionPreflight.status !== "PASS") {
  const summary = buildSummary({
    result: "FAIL",
    executionStatus: "diagnostic-child-selection-preflight-failed",
    cases: selection.map(item => caseResult(item, "not-run",
      "child-selection-preflight-failed", 0, {
        actualBrowserExecution: false,
      })),
    environments: [],
    cleanup: [],
    childSelectionPreflight,
  });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}

for (const [selectionIndex, item] of selection.entries()) {
  if (bootstrapUnavailable || abortReason) {
    cases.push(caseResult(item, "not-run",
      abortReason || "environment-bootstrap-unavailable", environmentGeneration));
    writeProgress(selectionIndex, item);
    continue;
  }
  if (!environment) {
    environmentGeneration += 1;
    try {
      environment = await startSelfContainedUiEnvironment({
        rootDir,
        runId: `${runId}-environment-${environmentGeneration}`,
        buildPath: options.buildPath,
        timeoutMs: options.timeoutMs,
        playwrightModulePath: options.playwrightModulePath,
        chromePath: options.chromePath,
      });
      environments.push({
        generation: environmentGeneration,
        status: "started",
        uiBuildBinding,
        runtimeOwnership: runtimeOwnershipAttestation(environment.runtime),
      });
    } catch (error) {
      const bootstrapFailure = buildBootstrapFailureEvidence(error);
      cases.push(caseResult(item, "FAIL", "environment-bootstrap-failed", environmentGeneration, {
        environmentContamination: bootstrapFailure.cleanup.status !== "PASS",
        bootstrapFailure,
      }));
      environments.push({
        generation: environmentGeneration,
        status: "bootstrap-failed",
        bootstrapFailure,
      });
      cleanup.push({
        generation: environmentGeneration,
        reason: "bootstrap-failure",
        ...bootstrapFailure.cleanup,
      });
      bootstrapUnavailable = true;
      writeProgress(selectionIndex, item);
      continue;
    }
  }

  const childDir = path.join(outputDir, "cases", item.caseId);
  const child = await runDiagnosticChild({ item, childDir, environment });
  const childSummary = child.summary;
  const contaminated = childSummary?.environmentContamination?.detected === true || !child.summary;
  let secretScan = null;
  try {
    secretScan = environment.assertSecretsAbsentFromArtifacts(childDir);
  } catch {
    secretScan = { status: "FAIL", failureClass: "secret-artifact-integrity-failed" };
  }
  const childOutcome = aggregateDiagnosticChildOutcome({
    summary: childSummary,
    exitCode: child.exitCode,
  });
  const parentCaseStatus = childOutcome.actualBrowserExecution === true
    ? childOutcome.status
    : "not-run";
  cases.push(caseResult(item, parentCaseStatus,
    childOutcome.failureClass,
    environmentGeneration, {
      failureDetail: childSummary?.case?.failureDetail || "",
      failurePhase: childOutcome.failurePhase,
      failureCode: childOutcome.failureCode,
      actualBrowserExecution: childOutcome.actualBrowserExecution,
      requested: childOutcome.requested || null,
      observed: childOutcome.observed || null,
      eventDomSemanticEvidence: childOutcome.eventDomSemanticEvidence || null,
      requestSemanticAssertionEvidence:
        childOutcome.requestSemanticAssertionEvidence || null,
      requestCorrelationEvidence: childOutcome.requestCorrelationEvidence || null,
      requestCorrelationScopeEvidence:
        childOutcome.requestCorrelationScopeEvidence || null,
      navigationLifecycleEvidence:
        childOutcome.navigationLifecycleEvidence || null,
      markerStageEvidence:
        childOutcome.markerStageEvidence || null,
      markerEvidence: childOutcome.markerEvidence || null,
      markerEvidenceLifecycle:
        childOutcome.markerEvidenceLifecycle || null,
      failureProvenance: childOutcome.failureProvenance || null,
      primaryFailureEvidence: childOutcome.primaryFailureEvidence || null,
      cleanupAttestation: childOutcome.cleanupAttestation || null,
      eventReviewSeedWriteEvidence:
        childOutcome.eventReviewSeedWriteEvidence || null,
      failureLifecycleEvidence:
        childOutcome.failureLifecycleEvidence || null,
      childExecutionStatus: childOutcome.childExecutionStatus || "",
      childResult: childOutcome.childResult || "",
      childRawCaptureValidation:
        childOutcome.childRawCaptureValidation || null,
      childSourceBinding: childOutcome.childSourceBinding || null,
      childExitCode: child.exitCode,
      childProcess: child.process,
      environmentContamination: contaminated || secretScan.status !== "PASS",
      childCleanupFailure: childSummary?.environmentContamination?.cleanupFailure === true,
      childBrowserCloseFailure: childSummary?.environmentContamination?.browserCloseFailure === true,
      secretScan,
    }));

  const disposition = classifyDiagnosticCaseDisposition({
    child,
    childSummary,
    childOutcome,
    contaminated,
    secretScan,
    expectedCaseId: item.caseId,
  });
  if (disposition === "continue-case-local-failure") {
    assert(childOutcome.status === "FAIL" &&
      childOutcome.cleanupAttestation?.pass === true,
    `${item.caseId} case-local failure continuation lost cleanup evidence`);
    const isolatedCleanup = await recycleEnvironment(
      environment,
      environmentGeneration,
      "case-local-failure-isolation",
    );
    cleanup.push(isolatedCleanup);
    environment = null;
    if (isolatedCleanup.status !== "PASS") {
      abortReason = "diagnostic-lifecycle-integrity-failed";
    }
  }
  if (disposition === "abort-diagnostic-lifecycle") {
    const measuredCleanup = await recycleEnvironment(
      environment,
      environmentGeneration,
      "diagnostic-lifecycle-integrity-failed",
    );
    cleanup.push(measuredCleanup);
    environment = null;
    abortReason = "diagnostic-lifecycle-integrity-failed";
  }
  writeProgress(selectionIndex, item);
}

if (environment) {
  cleanup.push(await recycleEnvironment(environment, environmentGeneration, "final"));
  environment = null;
}

const summary = buildSummary({
  result: cases.some(item => item.status === "FAIL") ||
    cleanup.some(item => item.status !== "PASS") || abortReason ? "FAIL" : "PASS",
  executionStatus: "diagnostic-sweep-browser-evidence-not-release-evidence",
  cases,
  environments,
  cleanup,
  childSelectionPreflight,
});
writeJson(summaryPath, summary);
printSummary(summary, summaryPath);
process.exit(summary.result === "PASS" ? 0 : 1);

async function runDiagnosticChild({ item, childDir, environment: handle }) {
  fs.mkdirSync(childDir, { recursive: true, mode: 0o700 });
  const args = [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", item.caseId,
    "--diagnostic-selection-mode", selectionMode,
    "--diagnostic-selection-contract", selectionContractPath,
    "--manifest", diagnosticManifestPath,
    "--output-dir", childDir,
    "--http-base", handle.runtime.httpBase,
    "--role-state-map", handle.runtime.roleStateMapPath,
    "--server-log", handle.runtime.serverLogPath,
    "--runtime-descriptor", handle.runtimeDescriptorPath,
    "--build-path", options.buildPath,
    "--timeout-ms", String(options.timeoutMs),
    "--diagnostic-source-commit", sourceCommit,
    "--diagnostic-manifest-sha256", sourceManifestSha256,
    "--diagnostic-build-sha256", uiBuildBinding.buildSha256,
    "--diagnostic-run-id", runId,
  ];
  if (options.playwrightModulePath) args.push("--playwright-module-path", options.playwrightModulePath);
  if (options.chromePath) args.push("--chrome-path", options.chromePath);
  const childProcess = await runChildProcess("./server.sh", args, handle.exactCaseEnv,
    "case-child-subprocess");
  const childSummaryPath = path.join(childDir, "summary.json");
  let summary = null;
  try {
    summary = readJsonAbsolute(childSummaryPath);
    validateChildSummary(summary, item, {
      gitCommit: sourceCommit,
      manifestSha256: sourceManifestSha256,
      buildSha256: uiBuildBinding.buildSha256,
      runId,
      caseId: item.caseId,
      caseIdsSha256: sha256(item.caseId),
      selectionMode,
      parentSelectionIdsSha256: selectionContract.targetCaseIdsSha256,
      parentSelectionCount: selectionContract.targetCaseCount,
      selectionContractDigest: selectionContract.digest,
    });
  } catch {
    summary = null;
  }
  return { exitCode: childProcess.exitCode, summary, process: childProcess };
}

async function runDiagnosticSelectionPreflight({ buildSha256 }) {
  const item = selection[0];
  const childDir = path.join(outputDir, "child-selection-preflight");
  fs.mkdirSync(childDir, { recursive: true, mode: 0o700 });
  const childSelectionContractPath = selectionPreflightContractPath();
  const args = [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", item.caseId,
    "--diagnostic-selection-mode", selectionMode,
    "--diagnostic-selection-contract", childSelectionContractPath,
    "--manifest", diagnosticManifestPath,
    "--output-dir", childDir,
    "--diagnostic-source-commit", sourceCommit,
    "--diagnostic-manifest-sha256", sourceManifestSha256,
    "--diagnostic-build-sha256", buildSha256,
    "--diagnostic-run-id", runId,
    "--plan-only",
  ];
  const childProcess = await runChildProcess("./server.sh", args, {},
    "child-selection-preflight");
  let summary = null;
  let validationError = "";
  try {
    summary = readJsonAbsolute(path.join(childDir, "summary.json"));
    validateChildSummary(summary, item, {
      gitCommit: sourceCommit,
      manifestSha256: sourceManifestSha256,
      buildSha256,
      runId,
      caseId: item.caseId,
      caseIdsSha256: sha256(item.caseId),
      selectionMode,
      parentSelectionIdsSha256: selectionContract.targetCaseIdsSha256,
      parentSelectionCount: selectionContract.targetCaseCount,
      selectionContractDigest: selectionContract.digest,
    });
  } catch (error) {
    validationError = sanitizeChildProcessOutput(
      error instanceof Error ? error.message : String(error),
    );
    summary = null;
  }
  const passed = childProcess.exitCode === 0 && summary &&
    summary.result === "NOT-RUN" && summary.actualBrowserExecution === false &&
    summary.counts?.attempted === 0;
  return {
    phase: "child-selection-preflight",
    status: passed ? "PASS" : "FAIL",
    exitCode: childProcess.exitCode,
    stdout: childProcess.stdout,
    stderr: childProcess.stderr,
    spawnError: childProcess.spawnError,
    validationError,
    actualBrowserExecution: summary?.actualBrowserExecution === true,
    selectionMode,
    targetCaseCount: selectionContract.targetCaseCount,
    targetCaseIdsSha256: selectionContract.targetCaseIdsSha256,
    selectionContractDigest: selectionContract.digest,
    childAcceptedTargetCaseCount:
      Number(summary?.sourceBinding?.parentSelectionCount || 0),
    childAcceptedTargetCaseIdsSha256:
      String(summary?.sourceBinding?.parentSelectionIdsSha256 || ""),
  };
}

function selectionPreflightContractPath() {
  if (!options.childSelectionPreflightContractFixture) return selectionContractPath;
  assert(options.childSelectionPreflightContractFixture === "digest-mismatch",
    "unknown child selection preflight contract fixture");
  const tampered = { ...selectionContract, digest: "0".repeat(64) };
  const fixturePath = path.join(outputDir, "diagnostic-selection-preflight-tampered.json");
  writeJson(fixturePath, tampered);
  return fixturePath;
}

async function recycleEnvironment(handle, generation, reason) {
  const runtimeOwnership = runtimeOwnershipAttestation(handle.runtime);
  let result;
  try {
    result = await stopSelfContainedUiEnvironment(handle);
  } catch {
    result = { status: "FAIL", failureClass: "environment-cleanup-failed" };
  } finally {
    handle.releaseSecrets();
  }
  return {
    generation,
    reason,
    status: result.status === "PASS" ? "PASS" : "FAIL",
    runtimeEvidence: result.runtimeEvidence === true,
    serversStopped: result.serversStopped === true,
    portsClean: result.portsClean === true,
    temporaryArtifactsRemoved: result.temporaryArtifactsRemoved === true,
    verificationSource: result.verificationSource || "environment-cleanup-failed",
    runtimeOwnership,
    runtimeRootCleanup: {
      runtimeRoot: runtimeOwnership.runtimeRoot,
      runtimeRootSha256: runtimeOwnership.runtimeRootSha256,
      existedBefore: result.measurement?.artifacts?.[0]?.existedBefore === true,
      bytesBefore: Number(result.measurement?.artifacts?.[0]?.bytesBefore || 0),
      existsAfter: result.measurement?.artifacts?.[0]?.existsAfter === true,
      bytesAfter: Number(result.measurement?.artifacts?.[0]?.bytesAfter || 0),
      removed: result.temporaryArtifactsRemoved === true,
    },
  };
}

function fixedSelection(cases) {
  const index = cases.findIndex(item => item.caseId === "EVT-023");
  assert(index >= 0, "EVT-023 is missing from the canonical exact manifest");
  assert(index === 299, `EVT-023 canonical attempted boundary drifted: ${index}`);
  const selected = cases.slice(index);
  assert(selected.length === 125,
    `EVT-023 through canonical end must contain 125 unresolved cases: ${selected.length}`);
  selected.forEach(assertDiagnosticRuntimeBinding);
  return selected;
}

function selectedDiagnosticCases({
  fullSelection,
  manifestCases,
  caseId,
  selectionArtifact,
  selectionMode,
}) {
  if (selectionMode === diagnosticSelectionModes.fixedRemainingSweep) {
    assert(!caseId, "fixed diagnostic selection cannot receive --case-id");
    return fullSelection;
  }
  if (selectionMode === diagnosticSelectionModes.sharedAdapterImpactSweep) {
    assert(!caseId, "shared adapter impact selection cannot receive --case-id");
    const artifact = readJson(selectionArtifact);
    const expected = buildCanonicalSharedAdapterImpact({
      schema: manifest.schema,
      cases: manifestCases,
    });
    assert(stableJson(artifact) === stableJson(expected),
      "shared adapter impact selection artifact does not match the current canonical manifest");
    const selectedIds = artifact.cases.map(item => item.caseId);
    assert(selectedIds.length === manifestCases.length &&
      new Set(selectedIds).size === selectedIds.length &&
      selectedIds.every((caseId, index) => caseId === manifestCases[index].caseId),
    "shared adapter impact selection must contain every canonical case once in manifest order");
    manifestCases.forEach(assertDiagnosticRuntimeBinding);
    return manifestCases;
  }
  if (selectionMode === diagnosticSelectionModes.diagnosticFailureCensusSweep) {
    assert(!caseId, "diagnostic failure census selection cannot receive --case-id");
    const artifact = readJson(selectionArtifact);
    assert(artifact.schema === "media-server.v390-ui-diagnostic-failure-census.v1",
      "diagnostic failure census schema mismatch");
    const { digest, ...payload } = artifact;
    assert(/^[0-9a-f]{64}$/.test(digest) && sha256(stableJson(payload)) === digest,
      "diagnostic failure census immutable digest mismatch");
    const selectedIds = artifact.failedIds;
    assert(Array.isArray(selectedIds) && selectedIds.length === 99 &&
      new Set(selectedIds).size === selectedIds.length &&
      Array.isArray(artifact.failures) && artifact.failures.length === selectedIds.length &&
      artifact.failures.every((row, index) => row.caseId === selectedIds[index]),
    "diagnostic failure census must contain exactly 99 unique ordered failures");
    const byId = new Map(manifestCases.map(item => [item.caseId, item]));
    const selected = selectedIds.map(caseId => byId.get(caseId));
    assert(selected.every(Boolean), "diagnostic failure census contains an unknown case ID");
    assert(selected.every((item, index) => index === 0 ||
      manifestCases.indexOf(selected[index - 1]) < manifestCases.indexOf(item)),
    "diagnostic failure census order does not match the canonical manifest");
    selected.forEach(assertDiagnosticRuntimeBinding);
    return selected;
  }
  if (selectionMode === diagnosticSelectionModes.diagnosticFailureClosureSweep) {
    assert(!caseId, "diagnostic failure closure selection cannot receive --case-id");
    const artifact = readJson(selectionArtifact);
    assert(artifact.schema === "media-server.v390-ui-diagnostic-failure-closure.v1",
      "diagnostic failure closure schema mismatch");
    const { digest, ...payload } = artifact;
    assert(/^[0-9a-f]{64}$/.test(digest) && sha256(stableJson(payload)) === digest,
      "diagnostic failure closure immutable digest mismatch");
    const selectedIds = artifact.selectedIds;
    assert(Array.isArray(selectedIds) && selectedIds.length === 7 &&
      new Set(selectedIds).size === selectedIds.length &&
      Array.isArray(artifact.failures) && artifact.failures.length === selectedIds.length &&
      artifact.failures.every((row, index) => row.caseId === selectedIds[index]),
    "diagnostic failure closure must contain exactly seven unique ordered failures");
    const byId = new Map(manifestCases.map(item => [item.caseId, item]));
    const selected = selectedIds.map(selectedCaseId => byId.get(selectedCaseId));
    assert(selected.every(Boolean), "diagnostic failure closure contains an unknown case ID");
    assert(selected.every((item, index) => index === 0 ||
      manifestCases.indexOf(selected[index - 1]) < manifestCases.indexOf(item)),
    "diagnostic failure closure order does not match the canonical manifest");
    selected.forEach(assertDiagnosticRuntimeBinding);
    return selected;
  }
  assert(selectionMode === diagnosticSelectionModes.explicitPositiveCase,
    "unsupported diagnostic selection mode");
  assert(caseId, "explicit diagnostic selection requires --case-id");
  const matches = manifestCases.filter(item => item.caseId === caseId);
  assert(matches.length === 1, `diagnostic explicit case ID is unknown or duplicated: ${caseId}`);
  const [item] = matches;
  assert(item.disposition === "native-executable",
    `diagnostic explicit case must be a positive native-executable case: ${caseId}`);
  assertDiagnosticRuntimeBinding(item);
  return [item];
}

function selectionModeForArtifact(selectionArtifact) {
  const artifact = readJson(selectionArtifact);
  return diagnosticSelectionModeForArtifactSchema(artifact.schema);
}

function assertDiagnosticRuntimeBinding(item) {
  const spec = exactRuntimeOracleFor(item.caseId);
  const summary = item.workflow?.exactRuntimeOracle;
  assert(spec?.caseId === item.caseId && summary?.caseId === item.caseId,
    `${item.caseId} diagnostic runtime oracle binding missing`);
  assert(Array.isArray(spec.requests) && summary.requestCount === spec.requests.length,
    `${item.caseId} diagnostic runtime request count drift`);
  assert(Array.isArray(spec.dom) && summary.domAssertionCount === spec.dom.length,
    `${item.caseId} diagnostic runtime DOM assertion count drift`);
  assert(Array.isArray(spec.stateSnapshots) &&
    summary.stateSnapshotCount === spec.stateSnapshots.length,
  `${item.caseId} diagnostic runtime state snapshot count drift`);
  assert(spec.cleanup?.strategy && Array.isArray(spec.cleanup.targets) &&
    summary.cleanupStrategy === spec.cleanup.strategy,
  `${item.caseId} diagnostic runtime cleanup binding drift`);
  assert(spec.requests.every(request => {
    const assertions = request.assertions || request.jsonAssertions || [];
    return Array.isArray(assertions) && assertions.every(assertion =>
      typeof assertion?.operator === "string" && assertion.operator.length > 0 &&
      typeof assertion?.path === "string" && assertion.path.length > 0);
  }),
  `${item.caseId} diagnostic request assertion binding missing`);
  assert(spec.dom.every(observation => {
    const assertions = observation.assertions || observation.propertyAssertions || [];
    return typeof observation?.selector === "string" && observation.selector.length > 0 &&
      Array.isArray(assertions) && assertions.every(assertion =>
        typeof assertion?.operator === "string" && assertion.operator.length > 0);
  }),
  `${item.caseId} diagnostic DOM assertion binding missing`);
}

function buildSummary({
  result,
  executionStatus,
  cases,
  environments,
  cleanup,
  childSelectionPreflight = null,
}) {
  const counts = {
    target: selection.length,
    attempted: cases.filter(item => item.status === "PASS" || item.status === "FAIL").length,
    pass: cases.filter(item => item.status === "PASS").length,
    fail: cases.filter(item => item.status === "FAIL").length,
    notRun: cases.filter(item => item.status === "not-run").length,
    unsupported: 0,
  };
  assert(counts.target === counts.attempted + counts.notRun, "diagnostic target/count invariant failed");
  assert(counts.attempted === counts.pass + counts.fail, "diagnostic attempted/count invariant failed");
  return {
    schema: "media-server.v390-ui-diagnostic-sweep.v1",
    result,
    executionStatus,
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible",
    uiFulltestPass: false,
    actualBrowserExecution: cases.some(item => item.actualBrowserExecution === true),
    sourceBinding: {
      gitCommit: sourceCommit,
      manifestSha256: sha256(stableJson(manifest)),
      ...(uiBuildBinding ? {
        buildPath: uiBuildBinding.buildPath,
        buildSha256: uiBuildBinding.buildSha256,
        buildBytes: uiBuildBinding.buildBytes,
        sourceWorktreeStatusSha256: uiBuildBinding.sourceWorktreeStatusSha256,
        bindingKind: uiBuildBinding.bindingKind,
      } : {}),
      selectionIdsSha256: sha256(selection.map(item => item.caseId).join("\n")),
      runId,
      selectionMode,
    },
    selection: {
      startCaseId: selection[0].caseId,
      endCaseId: selection.at(-1).caseId,
      selectedIds: selection.map(item => item.caseId),
      targetCaseCount: selection.length,
      targetCaseIdsSha256: sha256(selection.map(item => item.caseId).join("\n")),
      automaticRetryCount: 0,
      mode: selectionMode,
    },
    counts,
    childSelectionPreflight,
    environments,
    cleanup,
    cases,
  };
}

function caseResult(item, status, failureClass, environmentGeneration, extra = {}) {
  return {
    caseId: item.caseId,
    featureId: item.featureId,
    status,
    failureClass,
    environmentGeneration,
    automaticRetryCount: 0,
    ...extra,
  };
}

function buildBootstrapFailureEvidence(error) {
  const attestation = error?.uiEnvironment && typeof error.uiEnvironment === "object"
    ? error.uiEnvironment
    : {};
  const reason = sanitizeBootstrapReason(
    attestation.failureReason || (error instanceof Error ? error.message : String(error || "")),
  );
  const cleanup = safeBootstrapCleanupAttestation(error?.cleanup);
  const phase = classifyBootstrapFailurePhase(attestation);
  return {
    schema: "media-server.v390-ui-diagnostic-bootstrap-failure.v1",
    code: classifyBootstrapFailureCode(reason, phase),
    phase,
    reasonSha256: sha256(reason),
    environmentAttestationSha256: sha256(stableJson(attestation)),
    dependencyReady: attestation.dependency?.browserLaunchVerified === true,
    serverAttemptCount: Array.isArray(attestation.portAllocation?.attempts)
      ? attestation.portAllocation.attempts.length
      : 0,
    generatedRoleStateCount: Array.isArray(attestation.roles)
      ? attestation.roles.filter(item => item?.status === "actual-whoami-verified").length
      : 0,
    cleanup,
  };
}

function classifyBootstrapFailurePhase(attestation) {
  if (attestation.dependency?.browserLaunchVerified !== true) return "playwright-dependency";
  if (!attestation.seedTargetSelection) return "seed-preparation";
  const attempts = Array.isArray(attestation.portAllocation?.attempts)
    ? attestation.portAllocation.attempts
    : [];
  if (!attempts.some(item => item?.status === "owned-ready")) return "server-bootstrap";
  const roles = Array.isArray(attestation.roles) ? attestation.roles : [];
  if (roles.some(item => item?.status !== "actual-whoami-verified")) return "auth-storage-bootstrap";
  return "environment-finalization";
}

function classifyBootstrapFailureCode(reason, phase) {
  if (/\bEPERM\b|operation not permitted/i.test(reason)) return "LISTENER_PERMISSION_DENIED";
  if (/browser executable unavailable/i.test(reason)) return "BROWSER_EXECUTABLE_UNAVAILABLE";
  if (/playwright/i.test(reason) && phase === "playwright-dependency") {
    return "PLAYWRIGHT_DEPENDENCY_FAILED";
  }
  if (/build does not exist/i.test(reason)) return "BUILD_MISSING";
  if (/seed/i.test(reason) && phase === "seed-preparation") return "SEED_PREPARATION_FAILED";
  if (/readiness timeout|server failed|retry child/i.test(reason)) return "SERVER_BOOTSTRAP_FAILED";
  if (phase === "auth-storage-bootstrap") return "AUTH_STORAGE_BOOTSTRAP_FAILED";
  return "UI_ENVIRONMENT_BOOTSTRAP_FAILED";
}

function safeBootstrapCleanupAttestation(cleanup) {
  const value = cleanup && typeof cleanup === "object" ? cleanup : {};
  const checks = Array.isArray(value.checks) ? value.checks : [];
  return {
    status: value.status === "PASS" ? "PASS" : "FAIL",
    runtimeEvidence: value.runtimeEvidence === true,
    serversStopped: value.serversStopped === true,
    portsClean: value.portsClean === true,
    temporaryArtifactsRemoved: value.temporaryArtifactsRemoved === true,
    verificationSourceSha256: sha256(String(value.verificationSource || "missing")),
    checkCount: checks.length,
    failedCheckDigests: checks
      .filter(item => item?.status !== "PASS")
      .map(item => sha256(String(item?.check || "unknown"))),
  };
}

function sanitizeBootstrapReason(reason) {
  return String(reason || "")
    .replace(/(?:https?|rtsp|rtsps):\/\/[^\s,;)]+/ig, "[redacted-url]")
    .replace(/\b(?:password|credential|secret|token|cookie|authorization)\s*[=:]\s*[^\s,;]+/ig,
      "[redacted-sensitive-material]");
}

function bootstrapFailureContractFixture(name) {
  assert(name === "listener-eperm", "unknown bootstrap failure contract fixture");
  const rawReason =
    "listen EPERM: operation not permitted https://bootstrap.invalid/path password=contract-secret";
  const error = new Error(rawReason);
  error.uiEnvironment = {
    schema: "media-server.v390-acceptance-ui-environment.v1",
    result: "FAIL",
    dependency: {
      status: "dependency-bootstrap-attestation",
      browserLaunchVerified: true,
    },
    seedTargetSelection: {
      baselineId: "contract-fixture",
    },
    portAllocation: {
      strategy: "ephemeral-probe-bounded-retry-with-exact-child-listener-ownership",
      attempts: [],
    },
    roles: [
      { role: "admin", status: "not-generated" },
      { role: "operator", status: "not-generated" },
      { role: "viewer", status: "not-generated" },
      { role: "integrator", status: "not-generated" },
    ],
    failureReason: rawReason,
  };
  error.cleanup = {
    status: "PASS",
    runtimeEvidence: false,
    serversStopped: true,
    portsClean: true,
    temporaryArtifactsRemoved: true,
    verificationSource: "fixture-or-partial-filesystem-measurement-not-runtime-evidence",
    checks: [
      { check: "fixture-or-partial-temporary-root-contained", status: "PASS" },
      { check: "fixture-or-partial-temporary-root-removed", status: "PASS" },
    ],
  };
  return error;
}

function writeProgress(selectionIndex, item) {
  const attempted = cases.filter(value => ["PASS", "FAIL"].includes(value.status)).length;
  const pass = cases.filter(value => value.status === "PASS").length;
  const fail = cases.filter(value => value.status === "FAIL").length;
  const last = cases.at(-1);
  writeJson(progressPath, {
    schema: "media-server.v390-ui-diagnostic-progress.v1",
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    runId,
    target: selection.length,
    completed: selectionIndex + 1,
    attempted,
    pass,
    fail,
    remaining: selection.length - selectionIndex - 1,
    currentCaseId: item.caseId,
    currentStatus: last?.status || "not-run",
    currentFailureClass: last?.failureClass || "",
    currentFailureDetail: last?.failureDetail || "",
    environmentGeneration,
    updatedAt: new Date().toISOString(),
  });
  console.log(
    `[diagnostic-progress] ${selectionIndex + 1}/${selection.length} ` +
    `${item.caseId}=${last?.status || "not-run"} pass=${pass} fail=${fail}`,
  );
}

function validateChildSummary(summary, item, expectedSourceBinding) {
  assert(summary?.schema === "media-server.v390-ui-diagnostic-child.v1", "diagnostic child schema mismatch");
  assert(summary.diagnosticOnly === true && summary.releaseEvidenceEligible === false,
    "diagnostic child release-evidence boundary mismatch");
  assert(summary.policyV4Qualification === "not-eligible" && summary.uiFulltestPass === false,
    "diagnostic child Policy v4 boundary mismatch");
  assert(summary.selection?.caseId === item.caseId && summary.selection?.automaticRetryCount === 0,
    "diagnostic child selection/retry mismatch");
  assert(summary.selection?.startCaseId === item.caseId &&
    summary.selection?.endCaseId === item.caseId &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify([item.caseId]) &&
    summary.selection?.targetCaseCount === 1 &&
    summary.selection?.mode === selectionMode,
  "diagnostic child selection metadata mismatch");
  assert(summary.case?.caseId === item.caseId, "diagnostic child case mismatch");
  const sourceBindingErrors =
    diagnosticChildSourceBindingErrors(summary, expectedSourceBinding);
  assert(sourceBindingErrors.length === 0,
    `diagnostic child source binding invalid: ${sourceBindingErrors.join(",")}`);
  assert(summary.sourceBinding?.selectionMode === expectedSourceBinding.selectionMode,
    "diagnostic child selection mode source binding mismatch");
  assert(summary.sourceBinding?.parentSelectionIdsSha256 ===
    expectedSourceBinding.parentSelectionIdsSha256 &&
    summary.sourceBinding?.parentSelectionCount ===
      expectedSourceBinding.parentSelectionCount &&
    summary.sourceBinding?.selectionContractDigest ===
      expectedSourceBinding.selectionContractDigest,
  "diagnostic child parent selection contract binding mismatch");
  assert(typeof summary.case?.actualBrowserExecution === "boolean" &&
    summary.actualBrowserExecution === summary.case.actualBrowserExecution,
  "diagnostic child actual browser execution mismatch");
  if (summary.case?.eventDomSemanticEvidence) {
    const evidence = summary.case.eventDomSemanticEvidence;
    validateEventDomSemanticCompositeEvidence(evidence);
    assert(evidence.actualBrowserExecution === true,
      "diagnostic child structured EVT DOM evidence did not execute a browser");
  }
  for (const field of [
    "eventDomSemanticEvidence",
    "requestSemanticAssertionEvidence",
    "requestCorrelationEvidence",
    "requestCorrelationScopeEvidence",
    "navigationLifecycleEvidence",
    "markerEvidence",
    "markerStageEvidence",
  ]) {
    if (!summary.case?.[field]) continue;
    assert(diagnosticStructuredAssertionEvidenceValid(field, summary.case[field]),
      `diagnostic child ${field} canonical evidence is invalid`);
  }
  if (summary.case?.requestSemanticAssertionEvidence) {
    const spec = exactRuntimeOracleFor(item.caseId);
    assert(diagnosticRequestSemanticAssertionBindingValid(
      summary.case.requestSemanticAssertionEvidence,
      { caseId: item.caseId, requests: spec?.requests || [] },
    ), "diagnostic child request semantic evidence binding mismatch");
  }
  if (summary.case?.requestCorrelationEvidence) {
    const evidence = summary.case.requestCorrelationEvidence;
    assert(evidence.schema === "media-server.v390-ui-request-correlation-evidence.v1" &&
      typeof evidence.pass === "boolean" &&
      evidence.requestKind === "application-fetch" &&
      typeof evidence.expectedCorrelationDigest === "string" &&
      typeof evidence.initiatingRequestCorrelationDigest === "string" &&
      typeof evidence.responseRequestCorrelationDigest === "string" &&
      typeof evidence.caseRequestIdentity === "string" &&
      (evidence.caseRequestSequence === null ||
        Number.isInteger(evidence.caseRequestSequence)) &&
      typeof evidence.responseRequestObjectObserved === "boolean" &&
      typeof evidence.responseRequestMethod === "string" &&
      typeof evidence.responseRequestPath === "string" &&
      typeof evidence.responseRequestHeaderDigest === "string" &&
      Number.isInteger(evidence.responseStatus) &&
      typeof evidence.responseEchoHeaderRequired === "boolean" &&
      typeof evidence.responseEchoHeaderObserved === "boolean" &&
      typeof evidence.failureCode === "string",
    "diagnostic child request correlation evidence is invalid");
  }
  if (summary.case?.requestCorrelationScopeEvidence) {
    const evidence = summary.case.requestCorrelationScopeEvidence;
    assert(evidence.schema === "media-server.v390-ui-request-correlation-scope-evidence.v1" &&
      typeof evidence.pass === "boolean" &&
      evidence.requestKind === "application-fetch" &&
      Number.isInteger(evidence.logTailRequestCount) &&
      Number.isInteger(evidence.correlationLeakRequestCount) &&
      Array.isArray(evidence.orderedLedger) &&
      typeof evidence.failureCode === "string",
    "diagnostic child request correlation scope evidence is invalid");
  }
  if (summary.case?.navigationLifecycleEvidence) {
    const evidence = summary.case.navigationLifecycleEvidence;
    assert(evidence.schema === "media-server.v390-ui-navigation-trust-evidence.v1" &&
      typeof evidence.pass === "boolean" &&
      Number.isInteger(evidence.totalDocumentNavigationCount) &&
      Array.isArray(evidence.orderedDocumentNavigations) &&
      typeof evidence.listenerInstalledBeforeFirstNavigation === "boolean" &&
      Number.isInteger(evidence.navigationAfterListenerEndCount) &&
      typeof evidence.failureCode === "string",
    "diagnostic child navigation lifecycle evidence is invalid");
  }
  if (summary.case?.markerEvidenceLifecycle) {
    const lifecycle = summary.case.markerEvidenceLifecycle;
    assert(["reached", "not-reached"].includes(lifecycle.phase) &&
      (lifecycle.phase !== "reached" ||
        (Number.isInteger(lifecycle.evaluatorInvocationCount) &&
          typeof lifecycle.correlationResponseBound === "boolean" &&
          typeof lifecycle.domReadinessConfirmed === "boolean")),
      "diagnostic child marker lifecycle evidence is invalid");
  }
  if (summary.case?.markerEvidence) {
    const evidence = summary.case.markerEvidence;
    assert(evidence.schema === "media-server.v390-ui-event-marker-flow-evidence.v1" &&
      typeof evidence.pass === "boolean" &&
      typeof evidence.failurePhase === "string" &&
      typeof evidence.failureCode === "string" &&
      Number.isInteger(evidence.evaluatorInvocationCount) &&
      typeof evidence.correlationResponseBound === "boolean" &&
      typeof evidence.domReadinessConfirmed === "boolean",
    "diagnostic child marker evidence is invalid");
  }
  if (summary.case?.failureProvenance) {
    const provenance = summary.case.failureProvenance;
    assert(provenance.schema === "media-server.v390-ui-diagnostic-failure-provenance.v1" &&
      ["browser-case-assertion", "case-local-failure", "runner-or-lifecycle-failure"]
        .includes(provenance.kind) &&
      typeof provenance.phase === "string" &&
      typeof provenance.failureClass === "string" &&
      typeof provenance.errorName === "string" &&
      ["failed-structured-evidence", "playwright-timeout", "case-local-error", "none"]
        .includes(provenance.classificationSource) &&
      typeof provenance.actualBrowserExecution === "boolean" &&
      typeof provenance.structuredEvidencePresent === "boolean" &&
      typeof provenance.continuationEligible === "boolean",
    "diagnostic child failure provenance is invalid");
  }
  if (summary.case?.cleanupAttestation) {
    const evidence = summary.case.cleanupAttestation;
    assert(evidence.schema === "media-server.v390-ui-case-cleanup-attestation.v1" &&
      typeof evidence.pass === "boolean" &&
      typeof evidence.primaryFailurePresent === "boolean" &&
      typeof evidence.primaryFailurePreserved === "boolean" &&
      typeof evidence.caseRuntimeRestored === "boolean" &&
      typeof evidence.browserCloseAttempted === "boolean" &&
      typeof evidence.browserContextClosed === "boolean" &&
      Number.isInteger(evidence.cleanupEntryCount) &&
      typeof evidence.failureCode === "string",
    "diagnostic child cleanup attestation is invalid");
  }
  const eventReviewSeedFailure =
    eventReviewSeedDiagnosticCaseIds.includes(item.caseId) &&
    String(summary.case?.failureDetail || "")
      .includes("exact review seed write receipt is incomplete");
  if (summary.case?.eventReviewSeedWriteEvidence || eventReviewSeedFailure) {
    copyEventReviewSeedWriteEvidence(
      summary.case?.eventReviewSeedWriteEvidence,
      { caseId: item.caseId },
    );
  }
  if (item.caseId === "EVT-004" && summary.case.actualBrowserExecution === true) {
    const lifecycleErrors = validateEvt004LifecycleEvidence(summary.case);
    assert(lifecycleErrors.length === 0,
      `EVT-004 lifecycle evidence invalid: ${lifecycleErrors.join(",")}`);
  }
  assert(!/(?:https?|rtsp|rtsps):\/\//i.test(String(summary.case?.failureDetail || "")),
    "diagnostic child failure detail contains a raw URL");
  assert(!/\b(?:password|credential|secret|token|cookie|authorization)\s*[=:]\s*(?!\[redacted\])/i.test(
    String(summary.case?.failureDetail || ""),
  ), "diagnostic child failure detail contains sensitive material");
}

function runtimeOwnershipAttestation(runtime = {}) {
  const runtimeRoot = String(runtime.temporaryRoot || "");
  return {
    pid: Number(runtime.serverPid || 0),
    httpPort: Number(runtime.httpPort || 0),
    rtspPort: Number(runtime.rtspPort || 0),
    runtimeRoot,
    runtimeRootSha256: sha256(runtimeRoot),
  };
}

function assertDiagnosticOutputRoot(candidate) {
  const allowedRoot = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  const relative = path.relative(allowedRoot, candidate);
  assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    "diagnostic output must be inside .media_server.test/v3.9.0/ui-diagnostic-sweep");
}

function runChildProcess(file, args, env, phase) {
  return new Promise(resolve => {
    const stdout = createChildStreamCapture();
    const stderr = createChildStreamCapture();
    let settled = false;
    let spawnError = "";
    const child = spawn(file, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", chunk => stdout.update(chunk));
    child.stderr.on("data", chunk => stderr.update(chunk));
    const finish = (exitCode, spawnError = "") => {
      if (settled) return;
      settled = true;
      resolve({
        phase,
        exitCode,
        stdout: stdout.finish(),
        stderr: stderr.finish(),
        spawnError: sanitizeChildProcessOutput(spawnError),
      });
    };
    child.once("error", error => {
      spawnError = error instanceof Error ? error.message : String(error);
    });
    child.once("close", code => finish(Number.isInteger(code) ? code : 1, spawnError));
  });
}

function createChildStreamCapture() {
  const maximumCapturedBytes = 256 * 1024;
  const chunks = [];
  const digest = createHash("sha256");
  let bytes = 0;
  let capturedBytes = 0;
  return {
    update(chunk) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      digest.update(buffer);
      if (capturedBytes >= maximumCapturedBytes) return;
      const remaining = maximumCapturedBytes - capturedBytes;
      const captured = buffer.subarray(0, remaining);
      chunks.push(captured);
      capturedBytes += captured.length;
    },
    finish() {
      const raw = Buffer.concat(chunks).toString("utf8");
      const text = sanitizeChildProcessOutput(raw);
      return {
        captured: true,
        bytes,
        sha256: digest.digest("hex"),
        truncated: capturedBytes < bytes,
        redacted: text !== raw,
        text,
      };
    },
  };
}

function sanitizeChildProcessOutput(value) {
  return String(value || "")
    .replace(/(?:https?|rtsp|rtsps):\/\/[^\s,;)]+/ig, "[redacted-url]")
    .replace(/\b(password|credential|secret|token|cookie|authorization)\s*([=:])\s*[^\s,;]+/ig,
      "$1$2[redacted]");
}

function parseArgs(args) {
  const parsed = {
    outputDir: "",
    runId: "",
    buildPath: "build-gst-onnx/media_server",
    timeoutMs: 30000,
    playwrightModulePath: "",
    chromePath: "",
    planOnly: false,
    caseId: "",
    caseIdSpecified: false,
    selectionArtifact: "",
    bootstrapFailureContractFixture: "",
    childSelectionPreflightContractFixture: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output-dir") parsed.outputDir = args[++index] || "";
    else if (arg === "--run-id") parsed.runId = args[++index] || "";
    else if (arg === "--build-path") parsed.buildPath = args[++index] || "";
    else if (arg === "--timeout-ms") parsed.timeoutMs = Number(args[++index] || 0);
    else if (arg === "--playwright-module-path") parsed.playwrightModulePath = args[++index] || "";
    else if (arg === "--chrome-path") parsed.chromePath = args[++index] || "";
    else if (arg === "--case-id") {
      assert(!parsed.caseIdSpecified, "duplicate --case-id is not allowed");
      parsed.caseIdSpecified = true;
      parsed.caseId = args[++index] || "";
    }
    else if (arg === "--selection-artifact") {
      assert(!parsed.selectionArtifact, "duplicate --selection-artifact is not allowed");
      parsed.selectionArtifact = args[++index] || "";
    }
    else if (arg === "--contract-bootstrap-failure-fixture") {
      parsed.bootstrapFailureContractFixture = args[++index] || "";
    }
    else if (arg === "--contract-child-selection-preflight-fixture") {
      parsed.childSelectionPreflightContractFixture = args[++index] || "";
    }
    else if (arg === "--plan-only") parsed.planOnly = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  assert(Number.isFinite(parsed.timeoutMs) && parsed.timeoutMs > 0, "--timeout-ms must be positive");
  if (parsed.caseId) assert(/^[A-Z]+-\d{3}$/.test(parsed.caseId), "--case-id must be a canonical case ID");
  assert(!(parsed.caseId && parsed.selectionArtifact),
    "--case-id and --selection-artifact are mutually exclusive");
  if (parsed.bootstrapFailureContractFixture) {
    assert(parsed.caseId, "bootstrap failure contract fixture requires --case-id");
  }
  if (parsed.childSelectionPreflightContractFixture) {
    assert(parsed.planOnly,
      "child selection preflight contract fixture requires --plan-only");
  }
  return parsed;
}

function printSummary(summary, filePath) {
  console.log("== v3.9.0 internal UI diagnostic sweep ==");
  console.log(`- result: ${summary.result}`);
  console.log(`- target: ${summary.counts.target}`);
  console.log(`- attempted: ${summary.counts.attempted}`);
  console.log(`- pass: ${summary.counts.pass}`);
  console.log(`- fail: ${summary.counts.fail}`);
  console.log(`- notRun: ${summary.counts.notRun}`);
  console.log(`- summaryPath: ${filePath}`);
}

function timestampId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function buildCurrentSourceBoundBinary() {
  const buildPath = resolveRootOrAbsolute(options.buildPath);
  const canonicalBuildPath = path.join(rootDir, "build-gst-onnx", "media_server");
  assert(buildPath === canonicalBuildPath,
    "actual diagnostic execution requires the canonical current-source build path");
  const statusBefore = currentGitWorktreeStatus();
  assert(statusBefore === "",
    "actual diagnostic execution requires a clean current-source worktree");
  const build = spawnSync(path.join(rootDir, "server.sh"), ["build"], {
    cwd: rootDir,
    env: { ...process.env, MEDIA_SERVER_SKIP_LOCAL_ENV: "1" },
    stdio: "inherit",
  });
  assert(build.status === 0 && !build.signal,
    `diagnostic current-source build failed: exit=${build.status ?? -1}`);
  assert(fs.existsSync(buildPath), `diagnostic current-source build output missing: ${buildPath}`);
  const metadata = fs.statSync(buildPath);
  assert(metadata.isFile() && metadata.size > 0,
    "diagnostic current-source build output is not a non-empty regular file");
  assert(currentGitCommit() === sourceCommit,
    "diagnostic source commit changed during the current-source build");
  const statusAfter = currentGitWorktreeStatus();
  assert(statusAfter === statusBefore,
    "diagnostic source worktree changed during the current-source build");
  return Object.freeze({
    schema: "media-server.v390-ui-build-source-binding.v1",
    sourceCommitSha: sourceCommit,
    sourceWorktreeStatusSha256: sha256(statusBefore),
    buildPath,
    buildSha256: sha256File(buildPath),
    buildBytes: metadata.size,
    bindingKind: "built-media-server-binary",
  });
}

function currentGitWorktreeStatus() {
  return execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function currentGitCommit() {
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  assert(/^[0-9a-f]{40}$/.test(commit), "diagnostic source git commit is invalid");
  return commit;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function resolveRootOrAbsolute(value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function readJson(relativePath) {
  return readJsonAbsolute(resolveRootOrAbsolute(relativePath));
}

function readJsonAbsolute(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
