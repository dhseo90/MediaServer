#!/usr/bin/env node
// 파일 용도: 내부 UI diagnostic sweep이 release exact runner와 evidence 경계를 공유하지 않는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";
import {
  aggregateDiagnosticChildOutcome,
  classifyDiagnosticCaseDisposition,
  copyEventReviewSeedWriteEvidence,
  diagnosticChildBrowserExecutionBindingValid,
  diagnosticRequestSemanticAssertionBindingValid,
  diagnosticStructuredAssertionFailureClass,
  diagnosticStructuredAssertionEvidenceValid,
  diagnosticStructuredAssertionEvidencePresent,
  diagnosticChildSourceBindingErrors,
  deriveMarkerEvidenceLifecycle,
  eventReviewSeedDiagnosticCaseIds,
  serializeDiagnosticPrimaryFailureEvidence,
  validateEvt004LifecycleEvidence,
} from "./v390_ui_diagnostic_lifecycle_lib.mjs";
import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import { buildRequestSemanticAssertionEvidence } from "./v390_ui_exact_oracle_runtime.mjs";
import {
  buildDiagnosticSelectionContract,
  diagnosticSelectionModeForArtifactSchema,
  diagnosticSelectionModeRegistry,
  diagnosticSelectionModes,
  validateDiagnosticSelectionContract,
  validateDiagnosticSelectionMode,
} from "./v390_ui_diagnostic_selection_registry.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const runnerSource = read("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const sweepSource = read("scripts/internal/run_v390_ui_native_diagnostic_sweep.mjs");
const lifecycleSource = read("scripts/internal/v390_ui_diagnostic_lifecycle_lib.mjs");
const exactRuntimeSource = read("scripts/internal/v390_ui_exact_oracle_runtime.mjs");
const serverSource = read("server.sh");
const userLauncherSource = read("test_ui.sh");
const manifest = JSON.parse(read("test/fixtures/v390_ui_native_exact_cases.json"));
const checks = [];
const temporaryDirs = [];
process.on("exit", () => temporaryDirs.forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

check("release runner remains fail-first outside the internal diagnostic child mode", () => {
  assert(runnerSource.includes("let stopped = false;") &&
    runnerSource.includes('if (stopped) {') &&
    runnerSource.includes('not run after previous native case failure') &&
    runnerSource.includes('if (!diagnosticChild) stopped = true;'),
  "release runner fail-first boundary missing");
  assert(runnerSource.includes("producePolicyV4Evidence({") &&
    runnerSource.includes("if (diagnosticChild) {") &&
    runnerSource.includes("} else if (!evidenceProductionFailure) {"),
  "diagnostic child does not bypass Policy v4 production in a distinct branch");
});

check("recorded EVT-004 child FAIL remains valid case evidence instead of missing ingestion", () => {
  const summaryPath = path.join(rootDir,
    ".media_server.test/v3.9.0/ui-diagnostic-sweep/" +
    "v390-ui-diagnostic-20260808004425-80046/cases/EVT-004/summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const lifecycleErrors = validateEvt004LifecycleEvidence(summary.case);
  assert(!lifecycleErrors.includes("EVT-004-request-correlation-missing"),
    "a downstream correlation stage missing after the preserved primary failure invalidated the child summary");
  const childOutcome = aggregateDiagnosticChildOutcome({ summary, exitCode: 1 });
  const disposition = classifyDiagnosticCaseDisposition({
    child: { exitCode: 1 },
    childSummary: summary,
    childOutcome,
    contaminated: summary.environmentContamination?.detected === true,
    secretScan: { status: "PASS" },
    expectedCaseId: "EVT-004",
  });
  assert(childOutcome.status === "FAIL" &&
    childOutcome.failureClass === "case-execution-failed" &&
    childOutcome.actualBrowserExecution === true &&
    childOutcome.cleanupAttestation?.primaryFailurePreserved === true &&
    disposition === "continue-case-local-failure",
  "valid EVT-004 child FAIL summary was converted into lifecycle abort/missing evidence");
  const corruptedSummary = structuredClone(summary);
  delete corruptedSummary.case.navigationLifecycleEvidence;
  corruptedSummary.rawCaptureValidation.errors.push(
    "diagnostic-child-EVT-004-navigation-lifecycle-missing");
  const corruptedOutcome = aggregateDiagnosticChildOutcome({
    summary: corruptedSummary,
    exitCode: 1,
  });
  assert(classifyDiagnosticCaseDisposition({
    child: { exitCode: 1 },
    childSummary: corruptedSummary,
    childOutcome: corruptedOutcome,
    contaminated: false,
    secretScan: { status: "PASS" },
    expectedCaseId: "EVT-004",
  }) === "abort-diagnostic-lifecycle",
  "a real missing lifecycle field was accepted as a preserved child FAIL");
});

check("latest EVT-004 browser FAIL preserves primary, marker phase, raw validation, and cleanup independently", () => {
  const summaryPath = path.join(rootDir,
    ".media_server.test/v3.9.0/ui-diagnostic-sweep/" +
    "v390-ui-diagnostic-20260808021130-96376/cases/EVT-004/summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const phase = deriveMarkerEvidenceLifecycle(summary.case);
  assert(phase.phase === "partial" && phase.stageEvidencePresent === true &&
    phase.primaryFailurePresent === true && phase.evaluatorInvocationCount === 0,
  "marker file/response progress was collapsed into not-reached or complete");

  const childOutcome = aggregateDiagnosticChildOutcome({ summary, exitCode: 1 });
  const disposition = classifyDiagnosticCaseDisposition({
    child: { exitCode: 1 },
    childSummary: summary,
    childOutcome,
    contaminated: summary.environmentContamination?.detected === true,
    secretScan: { status: "PASS" },
    expectedCaseId: "EVT-004",
  });
  assert(childOutcome.status === "FAIL" &&
    childOutcome.actualBrowserExecution === true &&
    childOutcome.primaryFailureEvidence?.structuredEvidence?.eventDomSemanticEvidence &&
    childOutcome.markerStageEvidence?.pass === true &&
    childOutcome.markerEvidence === null &&
    childOutcome.childRawCaptureValidation?.status === "FAIL" &&
    childOutcome.cleanupAttestation?.pass === true &&
    disposition === "continue-case-local-failure",
  "valid bound child FAIL was discarded or reclassified as not-run");

  const stale = structuredClone(summary);
  stale.sourceBinding.gitCommit = "0".repeat(40);
  assert(diagnosticChildSourceBindingErrors(stale, summary.sourceBinding)
    .includes("diagnostic-child-source-commit-mismatch"),
  "stale child source binding did not remain fail-closed");

  const falselyComplete = structuredClone(summary.case);
  falselyComplete.markerEvidenceLifecycle = { phase: "reached" };
  falselyComplete.markerEvidence = null;
  assert(validateEvt004LifecycleEvidence(falselyComplete)
    .includes("EVT-004-marker-lifecycle-invalid"),
  "complete marker lifecycle accepted missing marker evidence");
});

check("diagnostic selection is fixed to canonical unresolved EVT-023 through the exact end", () => {
  const index = manifest.cases.findIndex(item => item.caseId === "EVT-023");
  assert(index >= 0, "EVT-023 missing from native manifest");
  assert(index === 299, `EVT-023 canonical attempted boundary drifted: ${index}`);
  assert(manifest.cases.slice(index).length === 125,
    "EVT-023 unresolved diagnostic target is not exactly 125 cases");
  assert(sweepSource.includes('const selected = cases.slice(index);') &&
    sweepSource.includes('item.caseId === "EVT-023"') &&
    sweepSource.includes('index === 299') &&
    sweepSource.includes('selected.length === 125') &&
    sweepSource.includes("const fullSelection = fixedSelection(manifest.cases)"),
  "diagnostic selection is not fixed to the exact canonical unresolved 125 cases");
});

check("diagnostic sweep uses a fresh source-built manifest without replacing tracked fixtures", () => {
  assert(sweepSource.includes("buildNativeExactManifest({ canonical, implementation })") &&
    sweepSource.includes("validateNativeExactManifest({ manifest, canonical, implementation })") &&
    sweepSource.includes('const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json")') &&
    sweepSource.includes('"--manifest", diagnosticManifestPath'),
  "diagnostic sweep is still bound to a stale tracked generated manifest");
  assert(!sweepSource.includes('readJson("test/fixtures/v390_ui_native_exact_cases.json")'),
    "diagnostic sweep reads the tracked native fixture as its execution manifest");
});

check("diagnostic output cannot become release or Policy v4 evidence", () => {
  assert(sweepSource.includes('schema: "media-server.v390-ui-diagnostic-sweep.v1"') &&
    sweepSource.includes("diagnosticOnly: true") &&
    sweepSource.includes("releaseEvidenceEligible: false") &&
    sweepSource.includes('policyV4Qualification: "not-eligible"') &&
    sweepSource.includes("uiFulltestPass: false"),
  "diagnostic summary release boundary missing");
  assert(!sweepSource.includes("producePolicyV4Evidence") &&
    !sweepSource.includes("visual-matrix") &&
    !sweepSource.includes("first-failure.json") &&
    !sweepSource.includes("release-artifacts"),
  "diagnostic sweep reaches a release-only evidence path");
  assert(!userLauncherSource.includes("run-v390-ui-native-diagnostic-sweep"),
    "user test_ui.sh exposes the internal diagnostic command");
});

check("all unresolved cases share canonical structured assertion continuation boundaries", () => {
  const index = manifest.cases.findIndex(item => item.caseId === "EVT-023");
  const unresolved = manifest.cases.slice(index);
  assert(unresolved.length === 125 &&
    unresolved.every(item => {
      const spec = exactRuntimeOracleFor(item.caseId);
      const summary = item.workflow?.exactRuntimeOracle;
      return item.disposition === "native-executable" &&
        item.dispatch === "playwright-native" &&
        summary?.caseId === item.caseId && spec?.caseId === item.caseId &&
        summary.requestCount === spec.requests?.length &&
        summary.domAssertionCount === spec.dom?.length &&
        summary.stateSnapshotCount === spec.stateSnapshots?.length &&
        summary.cleanupStrategy === spec.cleanup?.strategy &&
        Array.isArray(spec.cleanup?.targets) &&
        spec.requests.every(request => {
          const assertions = request.assertions || request.jsonAssertions || [];
          return Array.isArray(assertions) &&
            assertions.every(assertion => assertion?.path && assertion?.operator);
        }) &&
        spec.dom.every(observation => {
          const assertions = observation.assertions || observation.propertyAssertions || [];
          return observation?.selector && Array.isArray(assertions) &&
            assertions.every(assertion => assertion?.operator);
        });
    }),
  "unresolved selection contains unsupported or unbound runtime cases");
  assert(exactRuntimeSource.includes("throwRequestSemanticAssertionFailure({") &&
    exactRuntimeSource.includes("error.requestSemanticAssertionEvidence =") &&
    runnerSource.includes("primaryFailure?.requestSemanticAssertionEvidence") &&
    runnerSource.includes("requestSemanticAssertionEvidence:") &&
    sweepSource.includes("childOutcome.requestSemanticAssertionEvidence") &&
    lifecycleSource.includes('["request-semantic-assertion-failed", "requestSemanticAssertionEvidence"]') &&
    lifecycleSource.includes('field === "requestSemanticAssertionEvidence"'),
  "unresolved request assertions do not share the structured failure lifecycle");
  assert(exactRuntimeSource.includes("error.eventDomSemanticEvidence =") &&
    lifecycleSource.includes('["dom-semantic-assertion-failed", "eventDomSemanticEvidence"]') &&
    runnerSource.includes('if (!diagnosticChild) stopped = true;'),
  "DOM continuation or canonical fail-first boundary drifted");
});

check("case-local failures continue only after isolated cleanup; lifecycle and evidence failures abort", () => {
  assert(sweepSource.includes("childSummary?.environmentContamination?.detected === true || !child.summary") &&
    sweepSource.includes("classifyDiagnosticCaseDisposition({") &&
    sweepSource.includes('disposition === "continue-case-local-failure"') &&
    sweepSource.includes('"case-local-failure-isolation"') &&
    sweepSource.includes('if (isolatedCleanup.status !== "PASS")') &&
    sweepSource.includes('disposition === "abort-diagnostic-lifecycle"') &&
    sweepSource.includes('abortReason = "diagnostic-lifecycle-integrity-failed"') &&
    sweepSource.includes("automaticRetryCount: 0") &&
    !sweepSource.includes("retryCase") && !sweepSource.includes("while ("),
  "diagnostic case-local continuation/isolation/lifecycle abort contract missing");
  assert(runnerSource.includes("environmentContamination: Boolean(error?.cleanupFailure || error?.browserCloseFailure)") &&
    runnerSource.includes("browserCloseFailure: Boolean(error?.browserCloseFailure)") &&
    runnerSource.includes("const caseLocalContinuationEligible = Boolean(primaryFailure)") &&
    runnerSource.includes('"case-local-failure"') &&
    runnerSource.includes('"case-local-error"') &&
    runnerSource.includes("!runnerError"),
  "diagnostic child contamination summary missing");
});

check("attempted case evidence does not falsely require browser execution before browser open", () => {
  const summary = ({ phase, actualBrowserExecution, kind = "case-local-failure" }) => ({
    actualBrowserExecution,
    counts: { attempted: 1, pass: 0, fail: 1 },
    case: {
      status: "FAIL",
      actualBrowserExecution,
      failureProvenance: {
        kind,
        phase,
        actualBrowserExecution,
        continuationEligible: true,
      },
    },
  });
  for (const phase of ["prepare-case", "expected-fixture-digest", "browser-open"]) {
    assert(diagnosticChildBrowserExecutionBindingValid(summary({
      phase,
      actualBrowserExecution: false,
    })), `${phase} case-local evidence incorrectly required a browser`);
  }
  assert(diagnosticChildBrowserExecutionBindingValid(summary({
    phase: "browser-case-execution",
    actualBrowserExecution: true,
  })), "browser case-local failure lost actual execution binding");
  assert(!diagnosticChildBrowserExecutionBindingValid(summary({
    phase: "prepare-case",
    actualBrowserExecution: true,
  })), "prepare-case failure forged browser execution");
  assert(!diagnosticChildBrowserExecutionBindingValid(summary({
    phase: "browser-case-execution",
    actualBrowserExecution: false,
  })), "browser execution failure passed without a browser");
  assert(diagnosticChildBrowserExecutionBindingValid({
    actualBrowserExecution: true,
    counts: { attempted: 1, pass: 1, fail: 0 },
    case: { status: "PASS", actualBrowserExecution: true },
  }), "passing diagnostic child lost browser execution binding");
});

check("fixed 125 sweep continues clean case-local failures and aborts environment integrity failures", () => {
  assert(lifecycleSource.includes("const integrityPass = diagnosticChildRawCaptureIntegrityPass(") &&
    lifecycleSource.includes("childSummary?.caseRuntimeSecretArtifactIntegrity?.status === \"PASS\"") &&
    lifecycleSource.includes("secretScan?.status === \"PASS\"") &&
    lifecycleSource.includes("cleanupAttestation?.pass === true") &&
    lifecycleSource.includes("cleanupAttestation?.caseRuntimeRestored === true") &&
    lifecycleSource.includes("cleanupAttestation?.browserContextClosed === true") &&
    lifecycleSource.includes("if (!childSummary || !integrityPass || !lifecyclePass)") &&
    lifecycleSource.includes('return "abort-diagnostic-lifecycle"'),
  "fixed sweep does not fail closed on cleanup or integrity failure");
  assert(lifecycleSource.includes("childOutcome?.status === \"FAIL\" && child?.exitCode === 1") &&
    lifecycleSource.includes('provenance.kind === "case-local-failure"') &&
    lifecycleSource.includes('provenance.classificationSource === "case-local-error"') &&
    lifecycleSource.includes('provenance.kind === "browser-case-assertion"') &&
    lifecycleSource.includes("provenance.continuationEligible === true") &&
    lifecycleSource.includes('return "continue-case-local-failure"') &&
    sweepSource.includes('abortReason = "diagnostic-lifecycle-integrity-failed"') &&
    sweepSource.includes("for (const [selectionIndex, item] of selection.entries())"),
  "fixed sweep case-local continuation or lifecycle abort boundary is missing");
  assert(runnerSource.includes('if (!diagnosticChild) stopped = true;'),
    "canonical test_ui fail-fast boundary changed");

  const provenance = {
    schema: "media-server.v390-ui-diagnostic-failure-provenance.v1",
    kind: "browser-case-assertion",
    phase: "browser-case-execution",
    failureClass: "ui-timeout",
    errorName: "TimeoutError",
    classificationSource: "playwright-timeout",
    actualBrowserExecution: true,
    structuredEvidencePresent: false,
    continuationEligible: true,
  };
  const child = { exitCode: 1 };
  const childSummary = {
    rawCaptureValidation: { status: "PASS" },
    caseRuntimeSecretArtifactIntegrity: { status: "PASS" },
  };
  const childOutcome = {
    status: "FAIL",
    failureClass: provenance.failureClass,
    actualBrowserExecution: true,
    failureProvenance: provenance,
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence(
      { name: "TimeoutError" },
      { playwrightTimeoutClassAttested: true },
    ),
    cleanupAttestation: {
      pass: true,
      caseRuntimeRestored: true,
      browserContextClosed: true,
    },
  };
  const disposition = overrides => classifyDiagnosticCaseDisposition({
    child,
    childSummary,
    childOutcome: { ...childOutcome, ...overrides },
    contaminated: false,
    secretScan: { status: "PASS" },
    expectedCaseId: "EVT-025",
  });
  assert(disposition({}) === "continue-case-local-failure",
    "proven browser assertion failure did not continue");
  assert(diagnosticStructuredAssertionFailureClass({
    requestCorrelationEvidence: { pass: true },
  }) === "", "passing structured evidence became a failure class");
  assert(diagnosticStructuredAssertionFailureClass({
    eventDomSemanticEvidence: { pass: false },
    requestCorrelationEvidence: { pass: true },
  }) === "dom-semantic-assertion-failed",
  "one failed structured assertion was not classified exactly");
  assert(diagnosticStructuredAssertionFailureClass({
    eventDomSemanticEvidence: { pass: false },
    requestCorrelationEvidence: { pass: false },
  }) === "ambiguous-structured-failure-evidence",
  "multiple failed structured assertions did not fail closed");
  assert(diagnosticStructuredAssertionFailureClass({
    eventDomSemanticEvidence: { failureCode: "MISSING_PASS" },
  }) === "invalid-structured-failure-evidence",
  "invalid structured assertion evidence did not fail closed");
  assert(diagnosticStructuredAssertionEvidencePresent({
    requestCorrelationEvidence: { pass: true },
  }) === true && diagnosticStructuredAssertionEvidencePresent({}) === false,
  "structured assertion evidence presence was not classified independently");
  const digest = "a".repeat(64);
  const evt025 = exactRuntimeOracleFor("EVT-025");
  const evt025Request = evt025.requests[0];
  const failedRequestSemanticEvidence = buildRequestSemanticAssertionEvidence({
    caseId: "EVT-025",
    method: evt025Request.method,
    urlPath: evt025Request.path,
    pathTemplate: evt025Request.path,
    assertion: evt025Request.assertions[0],
    assertionIndex: 0,
    result: { pass: false, actual: {}, expected: true },
    baselinePresent: true,
    baseline: [],
  });
  assert(diagnosticStructuredAssertionEvidenceValid(
    "requestSemanticAssertionEvidence", failedRequestSemanticEvidence,
    { expectedCaseId: "EVT-025" }),
  "valid request semantic assertion evidence was rejected");
  assert(diagnosticRequestSemanticAssertionBindingValid(
    failedRequestSemanticEvidence,
    { caseId: "EVT-025", requests: evt025.requests },
  ), "valid request semantic assertion evidence was not bound to EVT-025");
  assert(!diagnosticRequestSemanticAssertionBindingValid(
    { ...failedRequestSemanticEvidence, caseId: "EVT-026" },
    { caseId: "EVT-025", requests: evt025.requests },
  ), "cross-case request semantic assertion evidence passed binding");
  assert(!diagnosticRequestSemanticAssertionBindingValid(
    { ...failedRequestSemanticEvidence, assertionIdentityDigest: digest },
    { caseId: "EVT-025", requests: evt025.requests },
  ), "forged request semantic assertion identity passed binding");
  const requestSemanticProvenance = {
    ...provenance,
    failureClass: "request-semantic-assertion-failed",
    errorName: "Error",
    classificationSource: "failed-structured-evidence",
    structuredEvidencePresent: true,
  };
  assert(disposition({
    failureClass: requestSemanticProvenance.failureClass,
    failureProvenance: requestSemanticProvenance,
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestSemanticAssertionEvidence: failedRequestSemanticEvidence,
    }),
    requestSemanticAssertionEvidence:
      structuredClone(failedRequestSemanticEvidence),
  }) === "continue-case-local-failure",
  "request semantic assertion failure did not continue after clean lifecycle");
  const crossCaseRequestEvidence = {
    ...failedRequestSemanticEvidence,
    caseId: "EVT-026",
  };
  assert(disposition({
    failureClass: requestSemanticProvenance.failureClass,
    failureProvenance: requestSemanticProvenance,
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestSemanticAssertionEvidence: crossCaseRequestEvidence,
    }),
    requestSemanticAssertionEvidence: crossCaseRequestEvidence,
  }) === "abort-diagnostic-lifecycle",
  "cross-case request semantic evidence continued");
  for (const invalidEvidence of [
    { ...failedRequestSemanticEvidence, pass: true },
    { ...failedRequestSemanticEvidence, actualDigest: "raw-value" },
    { ...failedRequestSemanticEvidence, assertionIndex: -1 },
    { ...failedRequestSemanticEvidence, failureCode: "FORGED" },
  ]) {
    assert(!diagnosticStructuredAssertionEvidenceValid(
      "requestSemanticAssertionEvidence", invalidEvidence),
    "malformed request semantic assertion evidence passed validation");
  }
  const structuredAssertion = {
    ...provenance,
    failureClass: "request-correlation-assertion-failed",
    errorName: "Error",
    classificationSource: "failed-structured-evidence",
    structuredEvidencePresent: true,
  };
  const failedRequestCorrelationEvidence = {
    schema: "media-server.v390-ui-request-correlation-evidence.v1",
    pass: false,
    requestKind: "application-fetch",
    expectedCorrelationDigest: "expected-digest",
    initiatingRequestCorrelationDigest: "initiating-digest",
    responseRequestCorrelationDigest: "response-digest",
    caseRequestIdentity: "EVT-023:request-1",
    caseRequestSequence: 1,
    responseRequestObjectObserved: true,
    responseRequestMethod: "GET",
    responseRequestPath: "/ops/api/events/status?limit=5&includeArchives=1",
    responseRequestHeaderDigest: "header-digest",
    responseStatus: 200,
    responseEchoHeaderRequired: false,
    responseEchoHeaderObserved: false,
    failureCode: "CORRELATION_MISMATCH",
  };
  assert(disposition({
    failureClass: structuredAssertion.failureClass,
    failureProvenance: structuredAssertion,
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestCorrelationEvidence: failedRequestCorrelationEvidence,
    }),
    requestCorrelationEvidence: structuredClone(failedRequestCorrelationEvidence),
  }) === "continue-case-local-failure",
  "explicit failed structured browser assertion did not continue");
  for (const [phase, failureClass, actualBrowserExecution] of [
    ["prepare-case", "sensitive-material-guard-failed", false],
    ["expected-fixture-digest", "case-execution-failed", false],
    ["browser-open", "control-observation-failed", false],
    ["browser-case-execution", "authoritative-readback-failed", true],
  ]) {
    const caseLocalProvenance = {
      ...provenance,
      kind: "case-local-failure",
      phase,
      failureClass,
      errorName: "Error",
      classificationSource: "case-local-error",
      actualBrowserExecution,
      structuredEvidencePresent: false,
      continuationEligible: true,
    };
    assert(disposition({
      failureClass,
      actualBrowserExecution,
      failureProvenance: caseLocalProvenance,
      primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({ name: "Error" }),
    }) === "continue-case-local-failure",
    `${phase} case-local failure did not continue after clean lifecycle`);
  }
  const passingRequestCorrelationEvidence = {
    ...failedRequestCorrelationEvidence,
    pass: true,
    expectedCorrelationDigest: "same-digest",
    initiatingRequestCorrelationDigest: "same-digest",
    responseRequestCorrelationDigest: "same-digest",
    failureCode: "",
  };
  assert(disposition({
    failureClass: "case-execution-failed",
    actualBrowserExecution: true,
    failureProvenance: {
      ...provenance,
      kind: "case-local-failure",
      phase: "browser-case-execution",
      failureClass: "case-execution-failed",
      errorName: "Error",
      classificationSource: "case-local-error",
      actualBrowserExecution: true,
      structuredEvidencePresent: true,
      continuationEligible: true,
    },
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestCorrelationEvidence: passingRequestCorrelationEvidence,
    }),
    requestCorrelationEvidence: structuredClone(passingRequestCorrelationEvidence),
  }) === "continue-case-local-failure",
  "case-local attribute failure was aborted because passing structured evidence was preserved");
  assert(disposition({
    failureClass: "case-execution-failed",
    actualBrowserExecution: false,
    failureProvenance: {
      ...provenance,
      kind: "case-local-failure",
      phase: "prepare-case",
      failureClass: "case-execution-failed",
      errorName: "TypeError",
      classificationSource: "case-local-error",
      actualBrowserExecution: false,
      structuredEvidencePresent: false,
      continuationEligible: true,
    },
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({ name: "TypeError" }),
  }) === "abort-diagnostic-lifecycle",
  "runner TypeError was misclassified as a continuable case-local failure");
  assert(disposition({
    failureClass: requestSemanticProvenance.failureClass,
    failureProvenance: requestSemanticProvenance,
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestSemanticAssertionEvidence: failedRequestSemanticEvidence,
    }),
    requestSemanticAssertionEvidence: {
      ...failedRequestSemanticEvidence,
      actualDigest: "b".repeat(64),
    },
  }) === "abort-diagnostic-lifecycle",
  "mismatched primary/top-level request evidence continued");
  for (const badProvenance of [
    { ...provenance, kind: "runner-or-lifecycle-failure" },
    { ...provenance, phase: "browser-open" },
    { ...provenance, continuationEligible: false },
    { ...provenance, errorName: "TypeError" },
    { ...provenance, failureClass: "case-execution-failed", structuredEvidencePresent: false },
    { ...provenance, failureClass: "case-execution-failed", structuredEvidencePresent: true },
    { ...provenance, failureClass: "ambiguous-structured-failure-evidence", structuredEvidencePresent: true },
    { ...provenance, failureClass: "invalid-structured-failure-evidence", structuredEvidencePresent: true },
    { ...provenance, failureClass: "authoritative-readback-failed", classificationSource: "none" },
    { ...provenance, failureClass: "ui-timeout", classificationSource: "playwright-timeout", errorName: "Error" },
    { ...provenance, structuredEvidencePresent: true },
    { ...structuredAssertion },
  ]) {
    assert(disposition({ failureProvenance: badProvenance }) === "abort-diagnostic-lifecycle",
      "non-assertion or runner failure was allowed to continue");
  }
  assert(disposition({
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "TimeoutError",
    }),
  }) === "abort-diagnostic-lifecycle",
  "mutable Error.name impersonated a Playwright TimeoutError class");
  assert(disposition({
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "TimeoutError",
      requestCorrelationEvidence: { pass: true },
    }),
  }) === "abort-diagnostic-lifecycle",
  "passing structured evidence was ignored to continue a timeout provenance");
  assert(disposition({
    requestCorrelationScopeEvidence: {
      pass: false,
      failureCode: "CORRELATION_SCOPE_NOT_REACHED",
    },
  }) === "continue-case-local-failure",
  "synthetic lifecycle evidence falsely aborted a real timeout");
  assert(disposition({
    failureClass: "request-correlation-assertion-failed",
    failureProvenance: {
      ...structuredAssertion,
      failureClass: "request-correlation-assertion-failed",
    },
    primaryFailureEvidence: serializeDiagnosticPrimaryFailureEvidence({
      name: "Error",
      requestCorrelationEvidence: failedRequestCorrelationEvidence,
    }),
    requestCorrelationEvidence: structuredClone(failedRequestCorrelationEvidence),
    requestCorrelationScopeEvidence: {
      pass: false,
      failureCode: "CORRELATION_SCOPE_NOT_REACHED",
    },
  }) === "continue-case-local-failure",
  "synthetic lifecycle evidence made one primary structured failure ambiguous");
  assert(disposition({
    failureClass: "marker-stage-assertion-failed",
    failureProvenance: {
      ...structuredAssertion,
      failureClass: "marker-stage-assertion-failed",
    },
    primaryFailureEvidence: {
      schema: "media-server.v390-ui-diagnostic-primary-failure-evidence.v1",
      errorName: "Error",
      structuredEvidence: { markerStageEvidence: { pass: false } },
    },
    markerStageEvidence: { pass: false },
  }) === "abort-diagnostic-lifecycle",
  "schema-less primary structured evidence was allowed to continue");
});

check("diagnostic child output is constrained and failure reasons are safe classes", () => {
  assert(runnerSource.includes("assertDiagnosticChildOutputRoot(outputDir)") &&
    runnerSource.includes("safeDiagnosticFailureClass(error)") &&
    runnerSource.includes("safeDiagnosticFailureDetail(error)") &&
    runnerSource.includes("[response-body-redacted]") &&
    runnerSource.includes("[redacted-url]") &&
    runnerSource.includes('return "case-execution-failed"') &&
    !runnerSource.includes("reason: diagnosticChild ? error"),
  "diagnostic child safe-output boundary missing");
  assert(sweepSource.includes("assertDiagnosticOutputRoot(outputDir)") &&
    sweepSource.includes("environment.assertSecretsAbsentFromArtifacts(childDir)"),
  "diagnostic sweep output/secret scan boundary missing");
  assert(runnerSource.includes("if (primaryFailure?.eventDomSemanticEvidence)") &&
    runnerSource.includes("error.partialArtifacts.eventDomSemanticEvidence") &&
    runnerSource.includes("eventDomSemanticEvidence: resultItem.eventDomSemanticEvidence || null") &&
    sweepSource.includes("eventDomSemanticEvidence: childOutcome.eventDomSemanticEvidence || null") &&
    sweepSource.includes('import { validateEventDomSemanticCompositeEvidence }') &&
    sweepSource.includes("validateEventDomSemanticCompositeEvidence(evidence)") &&
    runnerSource.includes("eventDomSemanticEvidence"),
  "structured EVT DOM evidence is not preserved through child and sweep summaries");
  assert(runnerSource.includes("error?.primaryFailureEvidence?.structuredEvidence") &&
    runnerSource.includes("serializeDiagnosticPrimaryFailureEvidence(primaryFailure)"),
  "serialized structured assertion evidence cannot restore the child failure class");
  assert(runnerSource.includes("if (primaryFailure?.requestCorrelationEvidence)") &&
    runnerSource.includes("error.partialArtifacts.requestCorrelationEvidence") &&
    runnerSource.includes("requestCorrelationEvidence: resultItem.requestCorrelationEvidence || null") &&
    sweepSource.includes("requestCorrelationEvidence: childOutcome.requestCorrelationEvidence || null") &&
    sweepSource.includes("media-server.v390-ui-request-correlation-evidence.v1"),
  "structured request correlation evidence is not preserved through child and sweep summaries");
  assert(runnerSource.includes("requestCorrelationScopeEvidence: resultItem.requestCorrelationScopeEvidence || null") &&
    sweepSource.includes("requestCorrelationScopeEvidence:") &&
    sweepSource.includes("media-server.v390-ui-request-correlation-scope-evidence.v1"),
  "request-scoped correlation leak evidence is not preserved through diagnostic summaries");
  assert(runnerSource.includes("navigationLifecycleEvidence: resultItem.navigationLifecycleEvidence || null") &&
    sweepSource.includes("navigationLifecycleEvidence:") &&
    sweepSource.includes("media-server.v390-ui-navigation-trust-evidence.v1"),
  "full-lifecycle navigation evidence is not preserved through diagnostic summaries");
  for (const snippet of [
    "buildFailureLifecycleEvidence",
    "closeBrowserForFailureLifecycle",
    "captureBoundedCorrelationWindow",
    "requestCorrelationScopeEvidence",
    "navigationLifecycleEvidence",
    "cleanupAttestation",
    "markerEvidence",
    'phase: "not-reached"',
  ]) {
    assert(runnerSource.includes(snippet),
      `failure lifecycle evidence finalization missing ${snippet}`);
  }
  assert(runnerSource.includes("primaryFailure") &&
    runnerSource.includes("failureLifecycleEvidence"),
  "failure lifecycle evidence does not preserve the primary failure");
  assert(runnerSource.includes("copyEventReviewSeedWriteEvidence(") &&
    runnerSource.includes("error.eventReviewSeedWriteEvidence =") &&
    runnerSource.includes("error.partialArtifacts.eventReviewSeedWriteEvidence =") &&
    runnerSource.includes("results.push(createFailedCaseResult(item, error, diagnosticChild))") &&
    runnerSource.includes("function createDiagnosticChildSummary(") &&
    runnerSource.includes("resultItem.eventReviewSeedWriteEvidence || null") &&
    sweepSource.includes("copyEventReviewSeedWriteEvidence("),
  "event review seed evidence is not preserved through the production rewrap");
  assert(runnerSource.includes("finalizeFailedCaseLifecycle({"),
    "runner does not use the executable failure-finally lifecycle helper");
  assert(runnerSource.includes("markerFlow") ||
    fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_exact_oracle_runtime.mjs"), "utf8")
      .includes('schema: "media-server.v390-ui-event-marker-flow-evidence.v1"'),
  "EVT-004 marker-flow evidence is not part of the structured event evidence envelope");
});

check("response binding failure closes before preserving complete lifecycle evidence", () => {
  const script = `
    import {
      buildFailureLifecycleEvidence,
      buildFallbackFailureLifecycleEvidence,
      captureBoundedCorrelationWindow,
      closeBrowserForFailureLifecycle,
      finalizeFailedCaseLifecycle,
      validateEvt004LifecycleEvidence,
    } from "./scripts/internal/v390_ui_diagnostic_lifecycle_lib.mjs";
    const events = [];
    const primaryFailure = new Error("RESPONSE_BINDING_MISMATCH");
    const correlationId = "EVT-004:assert-product-state:completion";
    const entries = [{
      phase: "request-start",
      requestId: "native-request-1",
      caseRequestIdentity: "EVT-004:request-1",
      caseRequestSequence: 1,
      requestKind: "application-fetch",
      correlationId,
      correlationSource: "request-header",
      method: "GET",
      url: "http://runtime.invalid/ops/api/diagnostics/log-tail?limit=50",
    }, {
      phase: "response",
      requestId: "native-request-1",
      caseRequestIdentity: "EVT-004:request-1",
      caseRequestSequence: 1,
      requestKind: "application-fetch",
      correlationId,
      correlationSource: "request-header",
      responseCorrelationSource: "initiating-request-identity",
      responseRequestObjectObserved: true,
      requestIdentitySource: "playwright-response-request",
      method: "GET",
      url: "http://runtime.invalid/ops/api/diagnostics/log-tail?limit=50",
      status: 200,
    }, {
      phase: "request-start",
      requestId: "cleanup-request",
      caseRequestIdentity: "EVT-004:request-2",
      caseRequestSequence: 2,
      correlationId: "",
      method: "GET",
      url: "http://runtime.invalid/cleanup",
    }];
    const runtimeState = new Map([[
      "__requestCorrelationWindow",
      {
        networkStart: 0,
        networkEnd: 2,
        correlationId,
        actionId: "EVT-004:assert-product-state",
        method: "GET",
        urlPath: "/ops/api/diagnostics/log-tail?limit=50",
      },
    ]]);
    const trace = { cleanup: [], navigation: null };
    let browserContextClosed = false;
    const browser = {
      close: async () => {
        events.push("close");
        browserContextClosed = true;
        return {
          orderedDocumentNavigations: [{ sequence: 2, path: "/ops/events" }],
          totalDocumentNavigationCount: 1,
        };
      },
    };
    const finalized = await finalizeFailedCaseLifecycle({
      primaryFailure,
      captureEvidence: () => {
        events.push("capture");
        const closedWindow = {
          ...runtimeState.get("__requestCorrelationWindow"),
          networkEnd: entries.length,
        };
        runtimeState.set("__requestCorrelationWindow", closedWindow);
        return captureBoundedCorrelationWindow({
          entries,
          window: closedWindow,
        });
      },
      restoreCase: async () => {
        events.push("restore");
        trace.cleanup.push({ status: "PASS" });
        runtimeState.set("__caseRuntimeRestored", true);
      },
      closeBrowser: () => closeBrowserForFailureLifecycle({ browser, trace }),
      finalizeEvidence: ({
        primaryFailure: observedPrimaryFailure,
        cleanupFailure,
        browserCloseFailure,
        capturedEvidence,
      }) => {
        events.push("finalize");
        return buildFailureLifecycleEvidence({
          item: { actions: [] },
          trace,
          runtimeState,
          primaryFailure: observedPrimaryFailure,
          cleanupFailure,
          browserCloseFailure,
          browserCloseAttempted: true,
          capturedCorrelationWindow: capturedEvidence,
        });
      },
    });
    const validationErrors = validateEvt004LifecycleEvidence({
      status: "FAIL",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: false },
      ...finalized.failureLifecycleEvidence,
    });
    const invalidPassMarkerErrors = validateEvt004LifecycleEvidence({
      status: "PASS",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: true },
      requestCorrelationScopeEvidence: { pass: true },
      navigationLifecycleEvidence: { pass: true },
      cleanupAttestation: { pass: true },
      markerEvidence: { pass: false },
      markerEvidenceLifecycle: { phase: "reached" },
    });
    const unboundedPassErrors = validateEvt004LifecycleEvidence({
      status: "PASS",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: true },
      requestCorrelationScopeEvidence: {
        pass: true,
        orderedLedger: [{ phase: "request-start" }, { phase: "response" }],
      },
      navigationLifecycleEvidence: { pass: true },
      cleanupAttestation: { pass: true },
      markerEvidence: { pass: true },
      markerEvidenceLifecycle: { phase: "reached" },
    });
    const invalidFailMarkerErrors = validateEvt004LifecycleEvidence({
      status: "FAIL",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: false },
      requestCorrelationScopeEvidence: { pass: false },
      navigationLifecycleEvidence: { pass: true },
      cleanupAttestation: { pass: true, primaryFailurePreserved: true },
      markerEvidence: { pass: true },
      markerEvidenceLifecycle: { phase: "not-reached" },
    });
    const secondaryOnlyFailureErrors = validateEvt004LifecycleEvidence({
      status: "FAIL",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: true },
      requestCorrelationScopeEvidence: { pass: true },
      navigationLifecycleEvidence: { pass: true },
      cleanupAttestation: {
        pass: false,
        primaryFailurePresent: false,
        primaryFailurePreserved: false,
      },
      markerEvidence: null,
      markerEvidenceLifecycle: { phase: "not-reached" },
    });
    const failedFinalizer = await finalizeFailedCaseLifecycle({
      primaryFailure,
      restoreCase: async () => {},
      closeBrowser: async () => ({ orderedDocumentNavigations: [] }),
      finalizeEvidence: () => { throw new Error("finalizer-broken"); },
    });
    const fallbackEvidence = failedFinalizer.failureLifecycleEvidence ||
      buildFallbackFailureLifecycleEvidence({
        primaryFailure: failedFinalizer.primaryFailure,
        cleanupFailure: failedFinalizer.cleanupFailure,
        browserCloseFailure: failedFinalizer.browserCloseFailure,
        browserCloseAttempted: true,
        caseRuntimeRestored: true,
        cleanupEntries: [],
        navigation: failedFinalizer.finalNavigation,
      });
    console.log(JSON.stringify({
      events,
      browserContextClosed,
      primaryFailurePreserved: finalized.primaryFailure === primaryFailure,
      cleanupFailure: finalized.cleanupFailure,
      browserCloseFailure: finalized.browserCloseFailure,
      evidence: finalized.failureLifecycleEvidence,
      validationErrors,
      invalidPassMarkerErrors,
      unboundedPassErrors,
      invalidFailMarkerErrors,
      secondaryOnlyFailureErrors,
      failedFinalizerPrimaryPreserved: failedFinalizer.primaryFailure === primaryFailure,
      failedFinalizerCleanupFailure: failedFinalizer.cleanupFailure,
      failedFinalizerLifecycleMessage:
        failedFinalizer.lifecycleFinalizationFailure?.message || "",
      fallbackEvidence,
    }));
  `;
  const run = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    script,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `failure lifecycle helper execution failed: ${run.stderr || run.stdout}`);
  const result = JSON.parse(run.stdout);
  assert(JSON.stringify(result.events) === JSON.stringify(["restore", "close", "capture", "finalize"]),
    `failure lifecycle order mismatch: ${JSON.stringify(result.events)}`);
  assert(result.browserContextClosed === true &&
    result.primaryFailurePreserved === true &&
    result.cleanupFailure === null &&
    result.browserCloseFailure === null,
  "primary response binding failure was replaced by lifecycle cleanup");
  assert(result.evidence.navigationLifecycleEvidence?.orderedDocumentNavigations?.length === 1 &&
    result.evidence.requestCorrelationScopeEvidence?.orderedLedger?.length === 3 &&
    result.evidence.requestCorrelationScopeEvidence?.windowAttestation?.pass === true &&
    result.evidence.requestCorrelationScopeEvidence?.windowAttestation?.networkEnd === 3 &&
    result.evidence.requestCorrelationScopeEvidence?.windowAttestation?.truncated === false &&
    result.evidence.markerEvidence === null &&
    result.evidence.markerEvidenceLifecycle?.phase === "partial" &&
    result.evidence.cleanupAttestation?.pass === true &&
    result.evidence.cleanupAttestation?.primaryFailurePreserved === true &&
    result.validationErrors.length === 0 &&
    result.invalidPassMarkerErrors.includes("EVT-004-marker-not-reached") &&
    result.unboundedPassErrors.includes("EVT-004-correlation-window-not-bounded") &&
    result.invalidFailMarkerErrors.includes("EVT-004-marker-lifecycle-invalid") &&
    !result.secondaryOnlyFailureErrors.includes("EVT-004-primary-failure-not-preserved") &&
    result.failedFinalizerPrimaryPreserved === true &&
    result.failedFinalizerCleanupFailure === null &&
    result.failedFinalizerLifecycleMessage === "finalizer-broken" &&
    result.fallbackEvidence.cleanupAttestation?.primaryFailurePreserved === true &&
    result.fallbackEvidence.cleanupAttestation?.primaryFailurePresent === true &&
    result.fallbackEvidence.cleanupAttestation?.failureCode === "" &&
    Number.isInteger(
      result.fallbackEvidence.navigationLifecycleEvidence?.totalDocumentNavigationCount,
    ) &&
    typeof result.fallbackEvidence.navigationLifecycleEvidence
      ?.listenerInstalledBeforeFirstNavigation === "boolean" &&
    result.fallbackEvidence.requestCorrelationScopeEvidence?.requestKind ===
      "application-fetch" &&
    Number.isInteger(
      result.fallbackEvidence.requestCorrelationScopeEvidence?.logTailRequestCount,
    ) &&
    result.fallbackEvidence.requestCorrelationScopeEvidence?.failureCode ===
      "LIFECYCLE_EVIDENCE_FINALIZATION_FAILED",
  "failure lifecycle structured evidence is incomplete");
});

check("valid failed child evidence is aggregated without a missing-child downgrade", () => {
  const sourceBinding = {
    gitCommit: "1".repeat(40),
    manifestSha256: "2".repeat(64),
    buildSha256: "8".repeat(64),
    runId: "current-diagnostic-run",
    caseId: "EVT-004",
    caseIdsSha256: "3".repeat(64),
  };
  const markerEvidence = {
    schema: "media-server.v390-ui-event-marker-flow-evidence.v1",
    pass: false,
    failurePhase: "dom-render",
    failureCode: "DOM_MARKER_NOT_OBSERVED",
    markerDigest: "4".repeat(64),
    evaluatorInvocationCount: 1,
    correlationResponseBound: true,
    domReadinessConfirmed: true,
  };
  const summary = {
    schema: "media-server.v390-ui-diagnostic-child.v1",
    result: "FAIL",
    executionStatus: "diagnostic-child-browser-evidence",
    sourceBinding,
    rawCaptureValidation: { status: "PASS", errors: [] },
    case: {
      caseId: "EVT-004",
      status: "FAIL",
      failureClass: "case-execution-failed",
      actualBrowserExecution: true,
      requestCorrelationEvidence: { pass: true },
      requestCorrelationScopeEvidence: { pass: true },
      navigationLifecycleEvidence: { pass: true },
      markerStageEvidence: {
        schema: "media-server.v390-ui-evt004-marker-stage-evidence.v1",
        pass: true,
        fileStageEvidence: {
          pass: true,
          hookInvocationCount: 1,
          fileIdentityMatched: true,
        },
        dashboardResponseEvidence: {
          pass: true,
          markerCount: 1,
        },
      },
      markerEvidence,
      markerEvidenceLifecycle: {
        phase: "reached",
        evaluatorInvocationCount: 1,
        correlationResponseBound: true,
        domReadinessConfirmed: true,
      },
      cleanupAttestation: { pass: true },
      eventReviewSeedWriteEvidence: {
        schema: "media-server.v390-ui-event-review-note-digest-evidence.v1",
        caseId: "EVT-004",
        eventId: "evt-004-review4-fixture",
        request: { present: true, type: "string", sha256: "1".repeat(64) },
        expected: { present: true, type: "string", sha256: "1".repeat(64) },
        put: { present: true, type: "string", sha256: "2".repeat(64) },
        storage: { present: true, type: "string", sha256: "2".repeat(64) },
        matches: {
          requestExpected: true,
          putExpected: false,
          storageExpected: false,
          putStorage: true,
        },
      },
    },
  };
  const outcome = aggregateDiagnosticChildOutcome({
    summary,
    exitCode: 1,
  });
  assert(outcome.status === "FAIL" &&
    outcome.failureClass !== "diagnostic-child-missing" &&
    outcome.failurePhase === "dom-render" &&
    outcome.failureCode === "DOM_MARKER_NOT_OBSERVED" &&
    outcome.actualBrowserExecution === true &&
    outcome.markerEvidence === markerEvidence &&
    outcome.markerStageEvidence === summary.case.markerStageEvidence &&
    outcome.failureLifecycleEvidence?.schema ===
      "media-server.v390-ui-failure-lifecycle-evidence.v1" &&
    outcome.failureLifecycleEvidence.failureCode ===
      "DOM_MARKER_NOT_OBSERVED" &&
    outcome.navigationLifecycleEvidence ===
      summary.case.navigationLifecycleEvidence &&
    outcome.requestCorrelationEvidence ===
      summary.case.requestCorrelationEvidence &&
    outcome.eventReviewSeedWriteEvidence ===
      summary.case.eventReviewSeedWriteEvidence,
  "valid child FAIL evidence was not preserved");
  assert(aggregateDiagnosticChildOutcome({
    summary: null,
    exitCode: 1,
  }).failureClass === "diagnostic-child-missing",
  "missing child summary did not retain the missing classification");
  assert(diagnosticChildSourceBindingErrors(summary, sourceBinding).length === 0,
    "current child source binding was rejected");
  for (const [label, replacement, expectedCode] of [
    ["stale commit", { gitCommit: "5".repeat(40) },
      "diagnostic-child-source-commit-mismatch"],
    ["wrong manifest", { manifestSha256: "6".repeat(64) },
      "diagnostic-child-manifest-digest-mismatch"],
    ["wrong build", { buildSha256: "9".repeat(64) },
      "diagnostic-child-build-digest-mismatch"],
    ["stale run", { runId: "stale-run" },
      "diagnostic-child-run-id-mismatch"],
    ["wrong case", { caseId: "EVT-003" },
      "diagnostic-child-source-case-mismatch"],
    ["wrong selection", { caseIdsSha256: "7".repeat(64) },
      "diagnostic-child-source-selection-mismatch"],
  ]) {
    const stale = {
      ...summary,
      sourceBinding: { ...sourceBinding, ...replacement },
    };
    assert(diagnosticChildSourceBindingErrors(stale, sourceBinding)
      .includes(expectedCode),
    `${label} child evidence was not rejected`);
  }
  const falsePass = aggregateDiagnosticChildOutcome({
    summary: { ...summary, result: "PASS" },
    exitCode: 1,
  });
  assert(falsePass.status === "FAIL",
    "child exit 1 was promoted to PASS");
});

check("event review note evidence validation rejects missing, stale, wrong, and raw shapes", () => {
  assert(JSON.stringify(eventReviewSeedDiagnosticCaseIds) === JSON.stringify([
    "EVT-019", "EVT-020", "EVT-021", "EVT-037", "EVT-061", "EVT-066", "EVT-068",
  ]), "event review diagnostic sibling scope drift");
  const digest = "1".repeat(64);
  const valid = {
    schema: "media-server.v390-ui-event-review-note-digest-evidence.v1",
    caseId: "EVT-019",
    eventId: "evt-019-review4-fixture",
    request: { present: true, type: "string", sha256: digest },
    expected: { present: true, type: "string", sha256: digest },
    put: { present: true, type: "string", sha256: "2".repeat(64) },
    storage: { present: true, type: "string", sha256: "2".repeat(64) },
    matches: {
      requestExpected: true,
      putExpected: false,
      storageExpected: false,
      putStorage: true,
    },
  };
  assert(copyEventReviewSeedWriteEvidence(valid, { caseId: "EVT-019" })
    .matches.putExpected === false,
  "valid mismatch evidence was promoted");
  for (const [label, evidence, caseId] of [
    ["missing", null, "EVT-019"],
    ["stale", { ...valid, schema: "stale.v0" }, "EVT-019"],
    ["wrong", valid, "EVT-020"],
    ["raw", { ...valid, rawNote: "forbidden" }, "EVT-019"],
  ]) {
    let message = "";
    try {
      copyEventReviewSeedWriteEvidence(evidence, { caseId });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assert(message.includes("event review note digest evidence invalid"),
      `${label} event review evidence did not fail closed`);
  }
});

check("diagnostic sweep reports durable progress and treats cleanup failure as failure", () => {
  assert(sweepSource.includes('const progressPath = path.join(outputDir, "progress.json")') &&
    sweepSource.includes("[diagnostic-progress]") &&
    sweepSource.includes("currentFailureDetail") &&
    sweepSource.includes("buildBootstrapFailureEvidence(error)") &&
    sweepSource.includes("reasonSha256") &&
    sweepSource.includes("environmentAttestationSha256") &&
    sweepSource.includes('cleanup.some(item => item.status !== "PASS") || abortReason ? "FAIL" : "PASS"'),
  "diagnostic progress or final cleanup failure binding missing");
});

check("bootstrap failure preserves safe phase, cause digest, and cleanup attestation", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "bootstrap-contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--case-id", "EVT-003",
    "--contract-bootstrap-failure-fixture", "listener-eperm",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 1, `bootstrap failure fixture exit mismatch: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  const failure = summary.cases?.[0]?.bootstrapFailure;
  const environmentFailure = summary.environments?.[0]?.bootstrapFailure;
  const cleanup = summary.cleanup?.[0];
  const sha256 = /^[0-9a-f]{64}$/;
  assert(summary.counts.target === 1 && summary.counts.attempted === 1 &&
    summary.counts.pass === 0 && summary.counts.fail === 1 && summary.counts.notRun === 0,
  "bootstrap failure fixture count invariant mismatch");
  assert(summary.cases?.[0]?.failureClass === "environment-bootstrap-failed" &&
    summary.cases?.[0]?.environmentContamination === false,
  "bootstrap failure fixture case classification mismatch");
  assert(failure?.schema === "media-server.v390-ui-diagnostic-bootstrap-failure.v1" &&
    failure.code === "LISTENER_PERMISSION_DENIED" &&
    failure.phase === "server-bootstrap",
  "bootstrap failure safe code/phase mismatch");
  assert(sha256.test(failure.reasonSha256) &&
    sha256.test(failure.environmentAttestationSha256) &&
    sha256.test(failure.cleanup?.verificationSourceSha256),
  "bootstrap failure digest evidence is missing");
  assert(failure.cleanup?.status === "PASS" &&
    failure.cleanup.serversStopped === true &&
    failure.cleanup.portsClean === true &&
    failure.cleanup.temporaryArtifactsRemoved === true &&
    failure.cleanup.checkCount === 2 &&
    failure.cleanup.failedCheckDigests.length === 0,
  "bootstrap failure cleanup attestation mismatch");
  assert(JSON.stringify(environmentFailure) === JSON.stringify(failure),
    "bootstrap failure environment and case evidence drift");
  assert(cleanup?.reason === "bootstrap-failure" && cleanup.status === "PASS",
    "bootstrap failure top-level cleanup evidence missing");
  const serialized = JSON.stringify(summary);
  assert(!serialized.includes("bootstrap.invalid") &&
    !serialized.includes("contract-secret") &&
    !/(?:https?|rtsp|rtsps):\/\//i.test(serialized),
  "bootstrap failure summary exposed a raw URL or secret");
});

check("parent and child share one fail-closed diagnostic selection registry", () => {
  assert(JSON.stringify(diagnosticSelectionModeRegistry.map(entry => entry.mode)) ===
    JSON.stringify([
      "fixed-remaining-sweep",
      "explicit-positive-case",
      "shared-adapter-impact-sweep",
      "diagnostic-failure-census-sweep",
      "diagnostic-failure-closure-sweep",
    ]), "diagnostic selection registry mode set drift");
  assert(diagnosticSelectionModeForArtifactSchema(
    "media-server.v390-ui-shared-adapter-impact.v1") ===
      diagnosticSelectionModes.sharedAdapterImpactSweep &&
    diagnosticSelectionModeForArtifactSchema(
      "media-server.v390-ui-diagnostic-failure-census.v1") ===
        diagnosticSelectionModes.diagnosticFailureCensusSweep &&
    diagnosticSelectionModeForArtifactSchema(
      "media-server.v390-ui-diagnostic-failure-closure.v1") ===
        diagnosticSelectionModes.diagnosticFailureClosureSweep,
  "diagnostic artifact schema registry drift");
  for (const stale of ["", "stale-mode", "diagnostic-failure-census-sweep-v0"]) {
    let failed = false;
    try {
      validateDiagnosticSelectionMode(stale);
    } catch {
      failed = true;
    }
    assert(failed, `invalid diagnostic selection mode passed: ${stale}`);
  }
  let staleSchemaFailed = false;
  try {
    diagnosticSelectionModeForArtifactSchema("media-server.v390-ui-stale-selection.v0");
  } catch {
    staleSchemaFailed = true;
  }
  assert(staleSchemaFailed, "stale diagnostic artifact schema passed");
  const validContract = buildDiagnosticSelectionContract({
    mode: diagnosticSelectionModes.explicitPositiveCase,
    selectedIds: ["UI-001"],
  });
  for (const [label, candidate] of [
    ["schema", { ...validContract, schema: "stale.v0" }],
    ["digest", { ...validContract, digest: "0".repeat(64) }],
    ["selection ID", { ...validContract, selectedIds: ["UI-002"] }],
    ["selection digest", { ...validContract, targetCaseIdsSha256: "1".repeat(64) }],
  ]) {
    let failed = false;
    try {
      validateDiagnosticSelectionContract(candidate, {
        expectedMode: diagnosticSelectionModes.explicitPositiveCase,
        manifestCaseIds: manifest.cases.map(item => item.caseId),
      });
    } catch {
      failed = true;
    }
    assert(failed, `${label} mismatch passed the shared selection validator`);
  }
  assert(sweepSource.includes('else if (arg === "--case-id") {') &&
    sweepSource.includes('parsed.caseId = args[++index] || "";'),
    "diagnostic single-case parser missing");
  assert(sweepSource.includes('assert(!parsed.caseIdSpecified, "duplicate --case-id is not allowed")') &&
    sweepSource.includes('diagnosticSelectionModes.explicitPositiveCase') &&
    sweepSource.includes('item.disposition === "native-executable"') &&
    sweepSource.includes('manifestCases.filter(item => item.caseId === caseId)') &&
    sweepSource.includes('mode: selectionMode'),
  "explicit positive diagnostic selection contract missing");
  assert(sweepSource.includes("startCaseId: selection[0].caseId") &&
    sweepSource.includes("endCaseId: selection.at(-1).caseId") &&
    sweepSource.includes("selectedIds: selection.map(item => item.caseId)"),
  "diagnostic summary does not bind selection metadata to the actual selected cases");
  assert(sweepSource.includes('"--diagnostic-case-id", item.caseId') &&
    sweepSource.includes('"--diagnostic-selection-mode", selectionMode') &&
    sweepSource.includes('"--diagnostic-selection-contract", selectionContractPath'),
  "diagnostic parent does not forward the requested case and explicit selection mode to its child");
});

check("single-case plan metadata names only the requested case", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "single-case-contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--case-id", "EVT-003",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic single-case plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.startCaseId === "EVT-003" &&
    summary.selection?.endCaseId === "EVT-003" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["EVT-003"]) &&
    summary.selection?.targetCaseCount === 1,
  "diagnostic single-case metadata is not bound to EVT-003");
  assert(summary.selection?.mode === "explicit-positive-case" &&
    summary.sourceBinding?.selectionMode === "explicit-positive-case" &&
    summary.counts.target === 1 && summary.cases.length === 1 &&
    summary.cases[0]?.automaticRetryCount === 0,
  "diagnostic explicit case selection mode/source binding drift");
});

check("explicit positive cases support UI-001 and preserve EVT-004 as exact one-case selections", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  for (const caseId of ["UI-001", "EVT-004"]) {
    const outputDir = fs.mkdtempSync(path.join(parent, "explicit-positive-contract-"));
    temporaryDirs.push(outputDir);
    const run = spawnSync(path.join(rootDir, "server.sh"), [
      "run-v390-ui-native-diagnostic-sweep",
      "--case-id", caseId,
      "--plan-only",
      "--output-dir", outputDir,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert(run.status === 0, `explicit ${caseId} plan failed: ${run.stderr || run.stdout}`);
    const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
    assert(summary.selection?.startCaseId === caseId &&
      summary.selection?.endCaseId === caseId &&
      JSON.stringify(summary.selection?.selectedIds) === JSON.stringify([caseId]) &&
      summary.selection?.targetCaseCount === 1 &&
      summary.selection?.mode === "explicit-positive-case" &&
      summary.sourceBinding?.selectionMode === "explicit-positive-case" &&
      summary.counts.target === 1 && summary.counts.notRun === 1 &&
      summary.cases.length === 1 && summary.cases[0]?.caseId === caseId &&
      summary.cases[0]?.automaticRetryCount === 0,
    `explicit ${caseId} selection metadata drifted or selected another case`);
  }
});

check("explicit diagnostic selection rejects duplicate, unknown, negative, and unsupported case inputs before browser execution", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  for (const args of [
    ["--case-id", "UI-001", "--case-id", "EVT-004"],
    ["--case-id", "UI-999"],
    ["--case-id", "UI-018"],
  ]) {
    const outputDir = fs.mkdtempSync(path.join(parent, "invalid-explicit-positive-contract-"));
    temporaryDirs.push(outputDir);
    const run = spawnSync(path.join(rootDir, "server.sh"), [
      "run-v390-ui-native-diagnostic-sweep",
      ...args,
      "--plan-only",
      "--output-dir", outputDir,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert(run.status === 1, `invalid explicit diagnostic input unexpectedly passed: ${args.join(" ")}`);
    assert(!fs.existsSync(path.join(outputDir, "summary.json")),
      `invalid explicit diagnostic input reached summary/browser lifecycle: ${args.join(" ")}`);
  }
});

check("plan-only diagnostic output preserves count invariants without browser execution", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic plan-only failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.schema === "media-server.v390-ui-diagnostic-sweep.v1", "diagnostic plan-only schema mismatch");
  assert(summary.diagnosticOnly === true && summary.releaseEvidenceEligible === false &&
    summary.policyV4Qualification === "not-eligible" && summary.uiFulltestPass === false,
  "diagnostic plan-only release boundary mismatch");
  const expectedIds = manifest.cases.slice(299).map(item => item.caseId);
  assert(summary.counts.target === 125 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 && summary.counts.notRun === 125,
  "diagnostic plan-only count invariant mismatch");
  assert(summary.selection?.startCaseId === "EVT-023" &&
    summary.selection?.endCaseId === expectedIds.at(-1) &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(expectedIds) &&
    new Set(summary.selection?.selectedIds || []).size === 125 &&
    summary.cases.length === 125 && summary.cases.every(item => item.automaticRetryCount === 0),
    "diagnostic plan-only retry/case count mismatch");
  assert(summary.actualBrowserExecution === false &&
    /^[0-9a-f]{40}$/.test(summary.sourceBinding?.gitCommit || "") &&
    /^[0-9a-f]{64}$/.test(summary.sourceBinding?.manifestSha256 || "") &&
    summary.sourceBinding?.selectionIdsSha256 === summary.selection?.targetCaseIdsSha256,
  "diagnostic plan-only source/selection/browser binding mismatch");
  assert(sweepSource.includes("runtimeOwnershipAttestation(environment.runtime)") &&
    sweepSource.includes("runtimeRootCleanup: {") &&
    sweepSource.includes("runtimeRootSha256: runtimeOwnership.runtimeRootSha256") &&
    sweepSource.includes("temporaryArtifactsRemoved: result.temporaryArtifactsRemoved === true"),
  "diagnostic runtime PID/port/root cleanup attestation is incomplete");
});

check("shared adapter impact artifact selects all 424 canonical cases once in manifest order", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "shared-adapter-impact-contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", "test/fixtures/v390_ui_shared_adapter_impact.json",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `shared adapter impact plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  const expectedIds = manifest.cases.map(item => item.caseId);
  assert(summary.selection?.mode === "shared-adapter-impact-sweep" &&
    summary.selection?.targetCaseCount === 424 &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(expectedIds) &&
    new Set(summary.selection?.selectedIds || []).size === 424,
  "shared adapter impact selection is missing, duplicated, or reordered");
  assert(summary.counts.target === 424 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 &&
    summary.counts.notRun === 424 && summary.counts.unsupported === 0,
  "shared adapter impact plan count invariant mismatch");
  assert(summary.sourceBinding?.selectionMode === "shared-adapter-impact-sweep" &&
    summary.sourceBinding?.selectionIdsSha256 === summary.selection?.targetCaseIdsSha256 &&
    summary.actualBrowserExecution === false,
  "shared adapter impact source binding or browser boundary mismatch");
});

check("immutable failure census selects exactly the prior 99 failures once", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "failure-census-contract-"));
  temporaryDirs.push(outputDir);
  const artifact = JSON.parse(read("test/fixtures/v390_ui_diagnostic_failure_census_20260807.json"));
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", "test/fixtures/v390_ui_diagnostic_failure_census_20260807.json",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `failure census plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.mode === "diagnostic-failure-census-sweep" &&
    summary.selection?.targetCaseCount === 99 &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(artifact.failedIds) &&
    new Set(summary.selection?.selectedIds || []).size === 99,
  "failure census selection is missing, duplicated, or reordered");
  assert(summary.counts.target === 99 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 &&
    summary.counts.notRun === 99 && summary.counts.unsupported === 0 &&
    summary.actualBrowserExecution === false,
  "failure census plan count or browser boundary mismatch");
  const childPreflight = summary.childSelectionPreflight;
  assert(childPreflight?.phase === "child-selection-preflight" &&
    childPreflight.status === "PASS" && childPreflight.exitCode === 0 &&
    childPreflight.actualBrowserExecution === false &&
    childPreflight.selectionMode === "diagnostic-failure-census-sweep" &&
    childPreflight.targetCaseCount === 99 &&
    childPreflight.targetCaseIdsSha256 === summary.selection.targetCaseIdsSha256 &&
    childPreflight.childAcceptedTargetCaseCount === 99 &&
    childPreflight.childAcceptedTargetCaseIdsSha256 ===
      summary.selection.targetCaseIdsSha256 &&
    childPreflight.stdout?.captured === true &&
    childPreflight.stderr?.captured === true,
  "failure census did not pass the real no-browser child subprocess preflight");
  const tampered = structuredClone(artifact);
  tampered.failedIds = tampered.failedIds.slice(1);
  const tamperedPath = path.join(outputDir, "tampered-census.json");
  fs.writeFileSync(tamperedPath, `${JSON.stringify(tampered)}\n`, "utf8");
  const rejected = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", tamperedPath,
    "--plan-only",
    "--output-dir", path.join(outputDir, "tampered-output"),
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(rejected.status !== 0 &&
    `${rejected.stderr || ""}${rejected.stdout || ""}`.includes("immutable digest mismatch"),
  "tampered failure census selection was accepted");
});

check("immutable failure closure selects the exact remaining seven through the real child preflight", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "failure-closure-contract-"));
  temporaryDirs.push(outputDir);
  const artifactPath = "test/fixtures/v390_ui_diagnostic_failure_closure_20260808.json";
  const artifact = JSON.parse(read(artifactPath));
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", artifactPath,
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `failure closure plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.mode === "diagnostic-failure-closure-sweep" &&
    summary.selection?.targetCaseCount === 7 &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(artifact.selectedIds) &&
    new Set(summary.selection?.selectedIds || []).size === 7 &&
    summary.counts.target === 7 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 &&
    summary.counts.notRun === 7 && summary.counts.unsupported === 0 &&
    summary.actualBrowserExecution === false,
  "failure closure selection is missing, duplicated, reordered, or started a browser");
  const childPreflight = summary.childSelectionPreflight;
  assert(childPreflight?.phase === "child-selection-preflight" &&
    childPreflight.status === "PASS" && childPreflight.exitCode === 0 &&
    childPreflight.actualBrowserExecution === false &&
    childPreflight.selectionMode === "diagnostic-failure-closure-sweep" &&
    childPreflight.targetCaseCount === 7 &&
    childPreflight.targetCaseIdsSha256 === summary.selection.targetCaseIdsSha256 &&
    childPreflight.childAcceptedTargetCaseCount === 7 &&
    childPreflight.childAcceptedTargetCaseIdsSha256 ===
      summary.selection.targetCaseIdsSha256,
  "failure closure did not pass the real no-browser child subprocess preflight");
  const tampered = structuredClone(artifact);
  tampered.selectedIds = tampered.selectedIds.slice(1);
  const tamperedPath = path.join(outputDir, "tampered-closure.json");
  fs.writeFileSync(tamperedPath, `${JSON.stringify(tampered)}\n`, "utf8");
  const rejected = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", tamperedPath,
    "--plan-only",
    "--output-dir", path.join(outputDir, "tampered-output"),
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(rejected.status !== 0 &&
    `${rejected.stderr || ""}${rejected.stdout || ""}`.includes("immutable digest mismatch"),
  "tampered failure closure selection was accepted");
});

check("child selection preflight failure preserves process evidence without attempting a UI case", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "failure-census-child-preflight-failure-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--selection-artifact", "test/fixtures/v390_ui_diagnostic_failure_census_20260807.json",
    "--contract-child-selection-preflight-fixture", "digest-mismatch",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 1, `invalid child preflight exit mismatch: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  const preflight = summary.childSelectionPreflight;
  assert(summary.result === "FAIL" &&
    summary.executionStatus === "diagnostic-child-selection-preflight-failed" &&
    summary.counts.target === 99 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 &&
    summary.counts.notRun === 99 && summary.actualBrowserExecution === false &&
    summary.cases.every(item => item.status === "not-run" &&
      item.actualBrowserExecution === false),
  "child selection preflight failure was counted as an attempted UI case");
  assert(preflight?.phase === "child-selection-preflight" &&
    preflight.status === "FAIL" && preflight.exitCode === 1 &&
    preflight.actualBrowserExecution === false &&
    preflight.stdout?.captured === true && /^[0-9a-f]{64}$/.test(preflight.stdout.sha256) &&
    preflight.stderr?.captured === true && /^[0-9a-f]{64}$/.test(preflight.stderr.sha256) &&
    preflight.selectionMode === "diagnostic-failure-census-sweep" &&
    preflight.targetCaseCount === 99,
  "parent lost child preflight exit/stdout/stderr/phase evidence");
});

check("actual diagnostic builds and binds the current source before browser bootstrap", () => {
  assert(sweepSource.includes("buildCurrentSourceBoundBinary()") &&
    sweepSource.includes('spawnSync(path.join(rootDir, "server.sh"), ["build"]') &&
    sweepSource.includes('bindingKind: "built-media-server-binary"') &&
    sweepSource.includes('"--diagnostic-build-sha256", uiBuildBinding.buildSha256') &&
    sweepSource.includes("sourceWorktreeStatusSha256") &&
    sweepSource.indexOf("buildCurrentSourceBoundBinary()") <
      sweepSource.indexOf("startSelfContainedUiEnvironment({"),
  "diagnostic actual is not source-built and binary-bound before bootstrap");
  assert(runnerSource.includes('"--diagnostic-build-sha256"') &&
    runnerSource.includes("buildSha256: options.diagnosticBuildSha256") &&
    runnerSource.includes("sha256File(buildPath) === options.diagnosticBuildSha256"),
  "diagnostic child does not preserve the parent current-source binary binding");
});

check("diagnostic child plan-only reports only its selected case and cannot emit a release summary", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "child-contract-"));
  temporaryDirs.push(outputDir);
  const canonical = JSON.parse(read("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const implementation = JSON.parse(read("test/fixtures/project_feature_implementation_evidence.json"));
  const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
  const nativeManifest = buildNativeExactManifest({ canonical, implementation });
  fs.writeFileSync(diagnosticManifestPath,
    `${JSON.stringify(nativeManifest, null, 2)}\n`,
    "utf8");
  const fixedIds = nativeManifest.cases.slice(
    nativeManifest.cases.findIndex(item => item.caseId === "EVT-023"),
  ).map(item => item.caseId);
  const selectionContractPath = writeSelectionContract(
    outputDir,
    diagnosticSelectionModes.fixedRemainingSweep,
    fixedIds,
  );
  const sourceCommit = "0".repeat(40);
  const manifestSha256 = createHash("sha256")
    .update(stableJson(nativeManifest)).digest("hex");
  const diagnosticRunId = "diagnostic-child-contract";
  const buildSha256 = "8".repeat(64);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", "EVT-023",
    "--diagnostic-selection-contract", selectionContractPath,
    "--manifest", diagnosticManifestPath,
    "--diagnostic-source-commit", sourceCommit,
    "--diagnostic-manifest-sha256", manifestSha256,
    "--diagnostic-build-sha256", buildSha256,
    "--diagnostic-run-id", diagnosticRunId,
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic child plan-only failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.schema === "media-server.v390-ui-diagnostic-child.v1", "diagnostic child plan-only schema mismatch");
  assert(summary.selection?.startCaseId === "EVT-023" &&
    summary.selection?.endCaseId === "EVT-023" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["EVT-023"]) &&
    summary.selection?.targetCaseCount === 1 &&
    summary.selection?.caseId === "EVT-023" && summary.selection?.automaticRetryCount === 0,
  "diagnostic child selected-case/retry mismatch");
  assert(summary.releaseEvidenceEligible === false && summary.policyV4Qualification === "not-eligible" &&
    summary.uiFulltestPass === false,
  "diagnostic child plan-only entered a release or Policy v4 state");
  assert(summary.sourceBinding?.gitCommit === sourceCommit &&
    summary.sourceBinding?.manifestSha256 === manifestSha256 &&
    summary.sourceBinding?.buildSha256 === buildSha256 &&
    summary.sourceBinding?.runId === diagnosticRunId &&
    summary.sourceBinding?.caseId === "EVT-023" &&
    summary.sourceBinding?.parentSelectionCount === 125 &&
    summary.sourceBinding?.parentSelectionIdsSha256 ===
      buildDiagnosticSelectionContract({
        mode: diagnosticSelectionModes.fixedRemainingSweep,
        selectedIds: fixedIds,
      }).targetCaseIdsSha256,
  "diagnostic child plan-only source binding mismatch");
  assert(summary.case?.actualBrowserExecution === false &&
    summary.case?.eventDomSemanticEvidence === null,
  "diagnostic child plan-only claims browser or EVT DOM evidence");
});

check("diagnostic child explicit-positive mode revalidates UI-001 identity and selection binding", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "child-explicit-positive-contract-"));
  temporaryDirs.push(outputDir);
  const canonical = JSON.parse(read("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const implementation = JSON.parse(read("test/fixtures/project_feature_implementation_evidence.json"));
  const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
  const nativeManifest = buildNativeExactManifest({ canonical, implementation });
  fs.writeFileSync(diagnosticManifestPath,
    `${JSON.stringify(nativeManifest, null, 2)}\n`,
    "utf8");
  const manifestSha256 = createHash("sha256")
    .update(stableJson(nativeManifest)).digest("hex");
  const buildSha256 = "9".repeat(64);
  const selectionContractPath = writeSelectionContract(
    outputDir,
    diagnosticSelectionModes.explicitPositiveCase,
    ["UI-001"],
  );
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", "UI-001",
    "--diagnostic-selection-mode", "explicit-positive-case",
    "--diagnostic-selection-contract", selectionContractPath,
    "--manifest", diagnosticManifestPath,
    "--diagnostic-source-commit", "1".repeat(40),
    "--diagnostic-manifest-sha256", manifestSha256,
    "--diagnostic-build-sha256", buildSha256,
    "--diagnostic-run-id", "diagnostic-child-explicit-positive-contract",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `explicit positive child plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.caseId === "UI-001" &&
    summary.selection?.startCaseId === "UI-001" &&
    summary.selection?.endCaseId === "UI-001" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["UI-001"]) &&
    summary.selection?.targetCaseCount === 1 &&
    summary.selection?.automaticRetryCount === 0 &&
    summary.selection?.mode === "explicit-positive-case" &&
    summary.sourceBinding?.selectionMode === "explicit-positive-case" &&
    summary.sourceBinding?.manifestSha256 === manifestSha256 &&
    summary.sourceBinding?.buildSha256 === buildSha256 &&
    summary.actualBrowserExecution === false,
  "explicit positive child selection/source binding drift");
});

check("shared adapter impact child accepts the canonical negative-route case without widening explicit positives", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "child-shared-impact-contract-"));
  temporaryDirs.push(outputDir);
  const canonical = JSON.parse(read("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const implementation = JSON.parse(read("test/fixtures/project_feature_implementation_evidence.json"));
  const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
  const nativeManifest = buildNativeExactManifest({ canonical, implementation });
  fs.writeFileSync(diagnosticManifestPath, `${JSON.stringify(nativeManifest, null, 2)}\n`, "utf8");
  const manifestSha256 = createHash("sha256").update(stableJson(nativeManifest)).digest("hex");
  const selectionContractPath = writeSelectionContract(
    outputDir,
    diagnosticSelectionModes.sharedAdapterImpactSweep,
    nativeManifest.cases.map(item => item.caseId),
  );
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", "UI-018",
    "--diagnostic-selection-mode", "shared-adapter-impact-sweep",
    "--diagnostic-selection-contract", selectionContractPath,
    "--manifest", diagnosticManifestPath,
    "--diagnostic-source-commit", "2".repeat(40),
    "--diagnostic-manifest-sha256", manifestSha256,
    "--diagnostic-build-sha256", "3".repeat(64),
    "--diagnostic-run-id", "diagnostic-child-shared-impact-contract",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `shared impact UI-018 child plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.caseId === "UI-018" &&
    summary.selection?.mode === "shared-adapter-impact-sweep" &&
    summary.sourceBinding?.selectionMode === "shared-adapter-impact-sweep" &&
    summary.selection?.automaticRetryCount === 0 &&
    summary.actualBrowserExecution === false,
  "shared adapter impact child selection/source binding drift");
});

check("server dispatch exposes only the internal run and verification commands", () => {
  assert(serverSource.includes("run-v390-ui-native-diagnostic-sweep)") &&
    serverSource.includes("run_v390_ui_native_diagnostic_sweep.mjs") &&
    serverSource.includes("verify-v390-ui-native-diagnostic-sweep-contract)") &&
    serverSource.includes("verify_v390_ui_native_diagnostic_sweep_contract.mjs"),
  "server diagnostic dispatch missing");
});

if (checks.some(item => item.status === "FAIL")) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${name}: ${checks.at(-1).error}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeSelectionContract(outputDir, mode, selectedIds) {
  const contract = buildDiagnosticSelectionContract({ mode, selectedIds });
  validateDiagnosticSelectionContract(contract, { expectedMode: mode });
  const contractPath = path.join(outputDir, `selection-${mode}.json`);
  fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
  return contractPath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
