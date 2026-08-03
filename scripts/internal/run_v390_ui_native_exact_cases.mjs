#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 canonical 424 case를 Playwright-native로 실행하거나 plan-only 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  bindDocumentFormSubmission,
  createNativePlaywrightAdapter,
} from "./v390_ui_native_adapter.mjs";
import {
  assertExpectedFixtureDigestBeforeBrowser,
  createV390UiCaseRuntime,
} from "./v390_ui_case_runtime.mjs";
import {
  buildEndpointActionSemanticReadback,
  buildNavigationTrustEvidence,
  buildRequestCorrelationEvidence,
  domSnapshotDigest,
  evaluateCompletionOracle,
} from "./v390_ui_completion_oracle_lib.mjs";
import {
  createNativeExactExecutionFailureSummary,
  createNativeExactPreExecutionFailureSummary,
  ruleRelationshipFixtureIdentity,
  validateNativeExactCaptureSummary,
  validateNativeExactManifest,
} from "./v390_ui_native_exact_cases_lib.mjs";
import {
  assertPolicyV4ArtifactRoot,
  producePolicyV4Evidence,
} from "./v390_ui_policy_v4_evidence_producer.mjs";
import { expandVisualMatrixPlan, validateVisualMatrixPlan } from "./v390_ui_visual_evidence.mjs";
import {
  deduplicateScreenshotArtifacts,
  pruneUnreferencedArtifactFiles,
  sha256File,
} from "./evidence_integrity_lib.mjs";
import {
  buildCaseCleanupAttestation,
  buildFallbackFailureLifecycleEvidence,
  buildFailureLifecycleEvidence,
  captureBoundedCorrelationWindow,
  closeBrowserForFailureLifecycle,
  copyEventReviewSeedWriteEvidence,
  diagnosticStructuredAssertionFailureClass,
  eventReviewSeedDiagnosticCaseIds,
  finalizeFailedCaseLifecycle,
  serializeDiagnosticPrimaryFailureEvidence,
  serializeFailureLifecycleEvidence,
  validateEvt004LifecycleEvidence,
} from "./v390_ui_diagnostic_lifecycle_lib.mjs";
import {
  executeCatalogRuntimeOracle,
  executeCatalogRuntimeOracleAtSourceRoute,
  isExistingSpecializedExactOracle,
  waitForClientVaOverlayProjection,
} from "./v390_ui_exact_oracle_runtime.mjs";
import {
  assertRequestedObservedEnvelope,
  canonicalRequestedProjection,
  runtimeObservedProjection,
} from "./v390_ui_requested_observed_schema.mjs";

const runnerWorkflowSchema = "media-server.v390-ui-case-native-workflow.v2";
const supportedSetupKinds = Object.freeze([
  "bind-action-role-session",
  "bind-role-session",
  "seed-reviewed-state",
]);
const supportedActionKinds = Object.freeze([
  "activate-control",
  "assert-disabled-control",
  "assert-hidden-control",
  "assert-product-boundary",
  "assert-product-state",
  "assert-visible-read-model",
  "execute-endpoint-action",
  "execute-persisted-action",
  "fill-control",
  "navigate",
  "navigate-action-route",
  "navigate-negative",
  "select-control",
  "submit-form",
  "toggle-checkbox",
  "verify-independent-readback",
  "wait-visible",
]);
const supportedCleanupKinds = Object.freeze([
  "no-op-cleanup",
  "reset-local-ui-route",
  "restore-fixture-state",
  "restore-local-control",
]);
const documentFormSubmitContracts = new Map([
  ["UI-002", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["UI-003", { path: "/login", statuses: [302], redirectPath: "/client/live" }],
  ["UI-004", { path: "/password/change", statuses: [302], redirectPath: "/login" }],
  ["UI-005", { path: "/logout", statuses: [302], redirectPath: "/login" }],
  ["UI-007", { path: "/invite/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-004", { path: "/login", statuses: [302], redirectPath: "/client/live" }],
  ["AUTH-005", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-006", { path: "/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-007", { path: "/login", statuses: [403], redirectPath: null }],
  ["AUTH-034", { path: "/invite/setup", statuses: [302], redirectPath: "/login" }],
  ["AUTH-035", { path: "/invite/setup", statuses: [401], redirectPath: null }],
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const options = parseArgs(process.argv.slice(2));
const outputDir = resolveRootOrAbsolute(options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const diagnosticChild = options.diagnosticChild;
if (diagnosticChild) assertDiagnosticChildOutputRoot(outputDir);
fs.mkdirSync(outputDir, { recursive: true });
let manifest = null;
let canonical = null;
let visualMatrixPlan = null;
let implementation = null;
let validation = null;
let visualPlanValidation = null;
let runnerWorkflowCompatibility = null;
try {
  manifest = readJson(options.manifest);
  if (diagnosticChild) {
    assert(options.diagnosticManifestSha256 === sha256Text(stableJson(manifest)),
      "diagnostic child manifest source binding mismatch");
  }
  canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
  implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
  validation = validateNativeExactManifest({ manifest, canonical, implementation });
  if (!diagnosticChild) {
    visualMatrixPlan = readJson("test/fixtures/v390_ui_visual_matrix_plan.json");
    visualPlanValidation = validateVisualMatrixPlan({ plan: visualMatrixPlan, canonical, native: manifest });
  }
  runnerWorkflowCompatibility = validateRunnerWorkflowCompatibility(manifest.cases);
} catch (error) {
  const summary = diagnosticChild
    ? createDiagnosticPreExecutionSummary(options.diagnosticCaseId, "manifest-or-contract-preflight")
    : createNativeExactPreExecutionFailureSummary({ error, manifest, canonical });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}
const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
const diagnosticSelection = diagnosticChild
  ? selectDiagnosticCase(manifest.cases, options.diagnosticCaseId, options.diagnosticSelectionMode)
  : null;
const tracesDir = path.join(outputDir, "traces");
const screenshotsDir = path.join(outputDir, "screenshots");
const logsDir = path.join(outputDir, "logs");
const visualMatrixDir = path.join(outputDir, "visual-matrix");
fs.mkdirSync(tracesDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
if (!diagnosticChild) fs.mkdirSync(visualMatrixDir, { recursive: true });

if (options.planOnly) {
  if (diagnosticChild) {
    const summary = createDiagnosticChildSummary({
      result: "NOT-RUN",
      executionStatus: "diagnostic-plan-only-not-browser-evidence",
      item: diagnosticSelection.item,
      environmentContamination: false,
      caseRuntimeSecretArtifactIntegrity: null,
    });
    writeJson(summaryPath, summary);
    printSummary(summary, summaryPath);
    process.exit(0);
  }
  const summary = {
    schema: "media-server.v390-ui-native-exact-run.v1",
    result: "PASS",
    executionStatus: "plan-only-not-browser-evidence",
    manifestSchema: manifest.schema,
    counts: validation,
    unsupported: 0,
    actualBrowserExecution: false,
    uiFulltestPass: false,
    runnerWorkflowCompatibility,
    visualPlanValidation,
    cases: manifest.cases.map(item => ({
      caseId: item.caseId,
      disposition: item.disposition,
      status: "not-run",
      reason: "plan-only validation",
    })),
  };
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(0);
}

let buildPath = "";
let serverLogPath = "";
try {
  if (diagnosticChild) assertDiagnosticChildOutputRoot(outputDir);
  else assertPolicyV4ArtifactRoot({ rootDir, outputDir });
  assert(options.httpBase, "--http-base is required for actual execution");
  assert(options.serverLog, "--server-log is required for actual execution");
  buildPath = resolveRootOrAbsolute(options.buildPath);
  assert(fs.existsSync(buildPath), `--build-path does not exist: ${buildPath}`);
  if (diagnosticChild) {
    assert(sha256File(buildPath) === options.diagnosticBuildSha256,
      "diagnostic child build source binding mismatch");
  }
  serverLogPath = resolveRootOrAbsolute(options.serverLog);
  assert(fs.existsSync(serverLogPath), `server log does not exist: ${serverLogPath}`);
} catch (error) {
  const summary = diagnosticChild
    ? createDiagnosticPreExecutionSummary(options.diagnosticCaseId, "actual-runner-preflight")
    : createNativeExactPreExecutionFailureSummary({
      error,
      manifest,
      canonical,
      phase: "actual-runner-preflight",
    });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}
const actualStartedAt = new Date().toISOString();
let roleStateMap = null;
let adapter = null;
let caseRuntime = null;
try {
  roleStateMap = loadRoleStateMap(options.roleStateMap);
  adapter = await createNativePlaywrightAdapter({
    modulePath: options.playwrightModulePath,
    chromePath: options.chromePath,
  });
  caseRuntime = createV390UiCaseRuntime({
    rootDir,
    httpBase: options.httpBase,
    runtimeDescriptorPath: options.runtimeDescriptor,
    roleStateMapPath: options.roleStateMap,
  });
  assert(typeof caseRuntime.verifyCleanupReadback === "function",
    "exact case runtime verifyCleanupReadback owner missing");
} catch (error) {
  const summary = diagnosticChild
    ? createDiagnosticPreExecutionSummary(options.diagnosticCaseId, "runtime-bootstrap")
    : createNativeExactPreExecutionFailureSummary({
      error,
      manifest,
      canonical,
      phase: "runtime-bootstrap",
    });
  writeJson(summaryPath, summary);
  printSummary(summary, summaryPath);
  process.exit(1);
}
let caseRuntimeSecretScanComplete = false;
process.on("exit", () => {
  if (caseRuntimeSecretScanComplete) return;
  try {
    caseRuntime.assertSecretsAbsentFromArtifacts(outputDir);
  } catch (error) {
    console.error(`[secret-artifact-fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    caseRuntime.releaseSecrets();
  }
});

const results = [];
let stopped = false;
for (const item of diagnosticChild ? [diagnosticSelection.item] : manifest.cases) {
  if (stopped) {
    results.push(makeNotRun(item, "not run after previous native case failure"));
    continue;
  }
  try {
    const result = await executeCase(item, adapter, roleStateMap, serverLogPath);
    results.push(result);
  } catch (error) {
    if (!diagnosticChild) stopped = true;
    results.push(createFailedCaseResult(item, error, diagnosticChild));
  }
}

const fail = results.filter(item => item.status === "FAIL").length;
const notRun = results.filter(item => item.status === "not-run").length;
let visualMatrixProbes = [];
let evidenceProductionFailure = null;
if (!diagnosticChild) {
  try {
    if (fail === 0 && notRun === 0) visualMatrixProbes = await executeVisualMatrix(adapter);
  } catch (error) {
    evidenceProductionFailure = error;
  }
}
const artifactItems = [...results, ...visualMatrixProbes];
const artifactPruning = pruneUnreferencedArtifactFiles({
  roots: diagnosticChild ? [screenshotsDir, tracesDir, logsDir] : [screenshotsDir, tracesDir, logsDir, visualMatrixDir],
  referencedPaths: artifactItems.flatMap(item => [
    item.screenshotPath,
    item.tracePath,
    item.browserConsolePath,
  ]).filter(Boolean),
});
const screenshotDeduplication = deduplicateScreenshotArtifacts(artifactItems);
refreshFailureDiagnosticArtifacts(results);
let summary = null;
if (diagnosticChild) {
  const result = results[0];
  summary = createDiagnosticChildSummary({
    result: result?.status === "PASS" ? "PASS" : "FAIL",
    executionStatus: "diagnostic-child-browser-evidence",
    item: diagnosticSelection.item,
    resultItem: result,
    environmentContamination: Boolean(result?.environmentContamination),
    caseRuntimeSecretArtifactIntegrity: null,
  });
} else if (!evidenceProductionFailure) {
  try {
    summary = producePolicyV4Evidence({
      rootDir,
      outputDir,
      manifest,
      canonical,
      results,
      selectedAdapter: adapter.summary,
      startedAt: actualStartedAt,
      finishedAt: new Date().toISOString(),
      buildPath,
      runnerPath: fileURLToPath(import.meta.url),
      serverLogPath,
      visualMatrixProbes,
      contractFixture: false,
    }).summary;
  } catch (error) {
    evidenceProductionFailure = error;
  }
}
if (evidenceProductionFailure) {
  summary = createNativeExactExecutionFailureSummary({
    error: evidenceProductionFailure,
    manifest,
    results,
    phase: "policy-v4-evidence-production",
  });
}
summary.artifactLifecycle = summarizeArtifactLifecycle(artifactPruning, screenshotDeduplication);
let caseRuntimeSecretArtifactIntegrity = null;
let secretArtifactFailure = null;
try {
  caseRuntimeSecretArtifactIntegrity = caseRuntime.assertSecretsAbsentFromArtifacts(outputDir);
} catch (error) {
  secretArtifactFailure = error;
  summary = diagnosticChild
    ? createDiagnosticChildSummary({
      result: "FAIL",
      executionStatus: "diagnostic-child-secret-artifact-failure",
      item: diagnosticSelection.item,
      resultItem: results[0],
      environmentContamination: true,
      caseRuntimeSecretArtifactIntegrity: { status: "FAIL", failureClass: "secret-artifact-integrity-failed" },
    })
    : createNativeExactExecutionFailureSummary({
      error,
      manifest,
      results,
      phase: "secret-artifact-integrity",
    });
  summary.artifactLifecycle = summarizeArtifactLifecycle(artifactPruning, screenshotDeduplication);
}
summary.caseRuntimeSecretArtifactIntegrity = caseRuntimeSecretArtifactIntegrity || {
  status: "FAIL",
  ...(diagnosticChild
    ? { failureClass: "secret-artifact-integrity-failed" }
    : { error: secretArtifactFailure instanceof Error ? secretArtifactFailure.message : String(secretArtifactFailure || "") }),
};
const captureErrors = diagnosticChild
  ? validateDiagnosticChildSummary(summary, diagnosticSelection.item)
  : validateNativeExactCaptureSummary(summary, manifest.cases.length);
summary.rawCaptureValidation = diagnosticChild
  ? { status: captureErrors.length === 0 ? "PASS" : "FAIL", errors: captureErrors, releaseEvidenceEligible: false }
  : { status: captureErrors.length === 0 ? "PASS" : "FAIL", errors: captureErrors };
writeJson(summaryPath, summary);
if (!secretArtifactFailure) caseRuntime.assertSecretsAbsentFromArtifacts(outputDir);
caseRuntimeSecretScanComplete = true;
caseRuntime.releaseSecrets();
printSummary(summary, summaryPath);
if (captureErrors.length > 0 || (diagnosticChild && summary.result !== "PASS")) process.exit(1);

async function executeCase(item, adapter, roleStateMap, serverLogPath) {
  const screenshotPath = path.join(screenshotsDir, `${item.caseId}.png`);
  const tracePath = path.join(tracesDir, `${item.caseId}.trace.json`);
  const consolePath = path.join(logsDir, `${item.caseId}.browser-console.json`);
  const requested = canonicalRequestedProjection(item);
  const trace = {
    schema: "media-server.v390-ui-native-interaction-trace.v2",
    caseId: item.caseId,
    featureId: item.featureId,
    dispatch: "playwright-native",
    requested,
    observed: null,
    navigation: null,
    setup: [],
    inputs: structuredClone(item.workflow.inputs),
    actions: [],
    completionEvents: [],
    rawPrimaryObservations: [],
    expectedResults: structuredClone(item.workflow.expectedResults),
    cleanup: [],
  };
  const runtimeState = new Map();
  let caseContext = null;
  let storageStatePath = "";
  let browser = null;
  let browserContextCreated = false;
  let caseResult = null;
  let primaryFailure = null;
  let cleanupFailure = null;
  let browserCloseFailure = null;
  let lifecycleFinalizationFailure = null;
  let browserCloseAttempted = false;
  let failureLifecycleEvidence = null;
  let executionPhase = "prepare-case";
  try {
    caseContext = await caseRuntime.prepareCase(item);
    executionPhase = "expected-fixture-digest";
    assertExpectedFixtureDigestBeforeBrowser(item, caseContext);
    storageStatePath = caseContext.primaryRoleStatePath ||
      resolveRoleState(item.accountRole, roleStateMap);
    executionPhase = "browser-open";
    browser = await adapter.openPage({
      httpBase: options.httpBase,
      pagePath: item.actions[0].semanticCompletion.navigationBinding?.requestedPath ||
        item.screenRoute,
      timeoutMs: options.timeoutMs,
      width: item.viewport.width,
      height: item.viewport.height,
      storageStatePath,
      colorScheme: item.theme,
      caseId: item.caseId,
      navigationCorrelationId: "",
      navigationInvocationId: item.actions[0].semanticCompletion.navigationBinding?.invocationId || "",
      onRuntimeSecret: ({ kind, value }) =>
        caseRuntime.registerObservedSecret(item, caseContext, kind, value),
    });
    browserContextCreated = true;
    trace.navigation = structuredClone(browser.navigation);
    executionPhase = "browser-case-execution";
    await executeWorkflowSetup(item, storageStatePath, roleStateMap, caseRuntime, caseContext, trace);
    assert(item.oracle.allowedStatuses.includes(browser.navigation.status),
      `${item.caseId} navigation status ${browser.navigation.status} not in ${item.oracle.allowedStatuses.join(",")}`);
    const initialSnapshot = await browser.snapshot("body");
    if (item.workflow.primaryControl.applicability === "not-applicable") {
      await observePrimaryControlContext(browser, item, requested, runtimeState);
    }
    const initialAction = item.actions[0];
    const initialCompletionAction = semanticCompletionAction(initialAction, item);
    const initialCompletion = evaluateCompletionOracle({
      action: initialCompletionAction,
      after: initialSnapshot,
      navigation: browser.navigation,
      allowedStatuses: item.oracle.allowedStatuses,
      networkResponses: browser.networkEntries(),
      semanticReadback: semanticReadbackEvidence(initialAction, initialCompletionAction, null, initialSnapshot),
    });
    assertCompletionEvidence(initialCompletion, item.caseId);
    assert(initialCompletion.pass, `${item.caseId} navigation completion failed: ${initialCompletion.reason}`);
    trace.completionEvents.push(initialCompletion);
    if (item.disposition === "negative-route") {
      trace.actions.push({ kind: "navigate", status: "PASS", observedStatus: browser.navigation.status });
      trace.rawPrimaryObservations.push(makeRawPrimaryObservation({
        actionEvidence: initialCompletionAction,
        after: initialSnapshot,
        navigation: browser.navigation,
        networkEntries: browser.networkEntries(),
        semanticReadback: initialCompletion.semanticReadback,
      }));
    } else {
      for (const action of item.actions.slice(1)) {
        if (action.kind === "wait-visible") {
          let waitSelector = action.selector;
          if (["#liveAllStop", "#liveSaveLayoutPreference"].includes(waitSelector)) {
            const details = await browser.snapshot("details.workspace-actions");
            if (details.exists && !details.open) {
              await browser.click("details.workspace-actions > summary");
              trace.setup.push({
                kind: "open-client-workspace-actions",
                selector: "details.workspace-actions > summary",
                status: "PASS",
              });
            }
          }
          if (item.workflow.workflowClass === "persisted-mutation") {
            const persistedAction = item.actions.find(candidate => candidate.kind === "execute-persisted-action");
            assert(persistedAction, `${item.caseId} persisted action missing after wait-visible`);
            const lifecycle = await preparePersistedUiLifecycle(
              browser,
              item,
              persistedAction,
              caseRuntime,
              caseContext,
            );
            runtimeState.set("__persistedUiLifecycle", lifecycle);
            trace.setup.push({ kind: "prepare-persisted-ui-lifecycle", ...lifecycle, status: "PASS" });
            waitSelector = lifecycle.selector;
          } else if (item.workflow.workflowClass === "form-submit") {
            const submitAction = item.actions.find(candidate => candidate.kind === "submit-form");
            assert(submitAction, `${item.caseId} form submit action missing after wait-visible`);
            const lifecycle = await prepareFormSubmitUiLifecycle(
              browser,
              item,
              submitAction,
              caseRuntime,
              caseContext,
            );
            runtimeState.set("__formSubmitUiLifecycle", lifecycle);
            trace.setup.push({ kind: "prepare-form-submit-ui-lifecycle", ...lifecycle, status: "PASS" });
            waitSelector = lifecycle.submitSelector;
          } else if (["RULE-002", "RULE-003"].includes(item.caseId)) {
            const modeControl = item.caseId === "RULE-002" ? "#opsAddEventRuleBtn" : "#opsAddProfileBtn";
            await browser.click(modeControl);
            trace.setup.push({
              kind: "select-rule-catalog-mode",
              selector: modeControl,
              mode: item.caseId === "RULE-002" ? "event-rule" : "profile",
              status: "PASS",
            });
          } else if (["RULE-010", "RULE-013"].includes(item.caseId)) {
            const recordId = item.caseId === "RULE-010" ? "9301" : "9304";
            const recordSelector = `[data-ops-rule-action="view-va"][data-ops-rule-id=${JSON.stringify(recordId)}]`;
            await browser.click("#opsAddVaRuleBtn");
            await browser.waitForSelector(recordSelector);
            await browser.click(recordSelector);
            await browser.waitForSelector("#opsRulesComposerEdit");
            await browser.click("#opsRulesComposerEdit");
            trace.setup.push({
              kind: "open-rule-read-model",
              selector: recordSelector,
              mode: "va-rule",
              detailMode: "edit",
              recordId,
              status: "PASS",
            });
          } else if (item.caseId === "RULE-021") {
            const recordId = "9207";
            const recordSelector = `[data-ops-rule-action="view-event-template"][data-ops-rule-id=${JSON.stringify(recordId)}]`;
            await browser.click("#opsAddEventRuleBtn");
            await browser.waitForSelector(recordSelector);
            await browser.click(recordSelector);
            trace.setup.push({
              kind: "open-rule-read-model",
              selector: recordSelector,
              mode: "event-rule",
              detailMode: "view",
              recordId,
              status: "PASS",
            });
          } else if (item.caseId === "RULE-092") {
            await browser.evaluate(`(async () => {
              if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
              await openOpsRulesEditor('event-rule', 'new', '');
              const id = document.getElementById('opsEventRuleIdInput');
              if (!id) throw new Error('event-template ID input is unavailable');
              id.value = '9201';
              if (typeof opsRulesUpdateReviewLoop === 'function') opsRulesUpdateReviewLoop();
            })()`);
            trace.setup.push({
              kind: "prepare-validation-no-write",
              mode: "event-rule",
              duplicateId: "9201",
              status: "PASS",
            });
          } else if (["RULE-093", "RULE-094"].includes(item.caseId)) {
            const relationshipIdentity = ruleRelationshipFixtureIdentity(item.caseId);
            await browser.evaluate(`(async () => {
              if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
              await openOpsRulesEditor('va-rule', 'new', '');
              const relationshipIdentity = ${JSON.stringify(relationshipIdentity)};
              const channel = document.getElementById('opsVaRuleChannelSelect');
              const profile = document.getElementById('opsVaRuleProfileSelect');
              const template = document.getElementById('opsVaRuleTemplateSeedSelect');
              if (!channel || !profile || !template) throw new Error('VA relationship controls are unavailable');
              channel.value = relationshipIdentity.sourceId;
              if (${JSON.stringify(item.caseId)} === 'RULE-093') {
                profile.add(new Option('missing profile 9997', '9997'));
                template.add(new Option('missing template 9998', '9998'));
              }
              profile.value = ${JSON.stringify(item.caseId === "RULE-093" ? "9997" : "9694")};
              template.value = ${JSON.stringify(item.caseId === "RULE-093" ? "9998" : "9794")};
              if (typeof opsRulesUpdateReviewLoop === 'function') opsRulesUpdateReviewLoop();
            })()`);
            trace.setup.push({
              kind: "prepare-relationship-validation-no-write",
              mode: "va-rule",
              relationshipCase: item.caseId,
              status: "PASS",
            });
          } else if (item.caseId === "RULE-100") {
            const relationshipIdentity = ruleRelationshipFixtureIdentity(item.caseId);
            await browser.evaluate(`(async () => {
              if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
              await openOpsRulesEditor('va-rule', 'new', '');
              const relationshipIdentity = ${JSON.stringify(relationshipIdentity)};
              const id = document.getElementById('opsVaRuleIdInput');
              const channel = document.getElementById('opsVaRuleChannelSelect');
              const profile = document.getElementById('opsVaRuleProfileSelect');
              const template = document.getElementById('opsVaRuleTemplateSeedSelect');
              if (!id || !channel || !profile || !template) {
                throw new Error('VA priority-conflict controls are unavailable');
              }
              id.value = ${JSON.stringify("3920100")};
              channel.value = relationshipIdentity.sourceId;
              profile.value = ${JSON.stringify("9690")};
              template.value = ${JSON.stringify("9790")};
              if (typeof opsRulesUpdateReviewLoop === 'function') opsRulesUpdateReviewLoop();
            })()`);
            trace.setup.push({
              kind: "prepare-priority-conflict-no-write",
              mode: "va-rule",
              validRuleId: "9890",
              conflictRuleId: "3920100",
              priority: 0,
              status: "PASS",
            });
          } else if (item.caseId === "RULE-101") {
            const relationshipIdentity = ruleRelationshipFixtureIdentity(item.caseId);
            await browser.evaluate(`(async () => {
              if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
              await openOpsRulesEditor('va-rule', 'new', '');
              const relationshipIdentity = ${JSON.stringify(relationshipIdentity)};
              const id = document.getElementById('opsVaRuleIdInput');
              const channel = document.getElementById('opsVaRuleChannelSelect');
              const profile = document.getElementById('opsVaRuleProfileSelect');
              const template = document.getElementById('opsVaRuleTemplateSeedSelect');
              if (!id || !channel || !profile || !template) throw new Error('VA class-binding controls are unavailable');
              id.value = '9891';
              channel.value = relationshipIdentity.sourceId;
              profile.value = '9691';
              template.value = '9791';
              if (typeof opsRulesSetSelectedCategories !== 'function') throw new Error('product category selector is unavailable');
              opsRulesSetSelectedCategories('opsEventRuleClassChecks', ['person'], 'opsEventRuleClassesSummary', '객체를 선택하세요.');
              if (typeof opsRulesUpdateReviewLoop === 'function') opsRulesUpdateReviewLoop();
            })()`);
            trace.setup.push({
              kind: "prepare-class-binding-conflict-no-write",
              mode: "va-rule",
              profileId: "9691",
              templateId: "9791",
              analysisClasses: ["person"],
              status: "PASS",
            });
          } else if (item.caseId === "RULE-102") {
            await browser.evaluate(`(async () => {
              if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
              await openOpsRulesEditor('event-rule', 'new', '');
            })()`);
            trace.setup.push({
              kind: "prepare-review-loop-no-write",
              mode: "event-rule",
              selectedByPrimaryAction: "re-entry",
              status: "PASS",
            });
          }
          await browser.waitForSelector(waitSelector);
          if (item.caseId === "RULE-104") {
            const readinessUi = await browser.evaluate(`(() => {
              const link = document.querySelector('[data-approval-gated-rule-draft-route]');
              const card = link?.closest('[data-approval-gated-rule-draft-event]');
              return { href: link?.getAttribute('href') || '', text: card?.textContent || '', eventId: card?.getAttribute('data-approval-gated-rule-draft-event') || '' };
            })()`);
            assert(readinessUi.eventId === caseContext.fixtureId &&
              readinessUi.href.includes(`draftEventId=${encodeURIComponent(caseContext.fixtureId)}`) &&
              readinessUi.href.includes('approvalState=approval-required') &&
              ['noAutoSave true', 'noAutoApply true', 'ruleRegistryWritePerformed false', 'full replay'].every(token => readinessUi.text.includes(token)),
            `${item.caseId} /ops/events approval readiness row/link exact UI mismatch`);
            trace.setup.push({ kind: "observe-approval-readiness-row-link", ...readinessUi, status: "PASS" });
          }
          await observePrimaryControlContext(browser, item, requested, runtimeState, action.selector);
          trace.actions.push({ ...action, status: "PASS" });
        } else if (action.kind === "navigate-action-route") {
          const roleSwitch = await caseRuntime.switchActionRoleSession(browser, item, action, caseContext);
          trace.setup.push({ kind: "switch-action-role-session", ...roleSwitch, status: "PASS" });
          const result = await executeCaseNativeNavigation(browser, item, action);
          trace.actions.push(result.actionEvidence);
          trace.completionEvents.push(result.completionOracle);
          trace.rawPrimaryObservations.push(result.rawPrimaryObservation);
        } else if (action.kind === "navigate-negative") {
          const before = await browser.snapshot(item.controlAction.targetSelector);
          const networkStart = browser.networkEntries().length;
          const navigationBinding = action.semanticCompletion.navigationBinding;
          await browser.setCorrelationId("");
          const observed = await browser.navigate(action.route, {
            invocationId: navigationBinding.invocationId,
            kind: "negative-document-navigation",
          });
          assert(action.allowedStatuses.includes(observed.status),
            `${item.caseId} negative navigation status ${observed.status} not in ${action.allowedStatuses.join(",")}`);
          const after = await browser.snapshot("body");
          const networkResponses = browser.networkEntries().slice(networkStart);
          const completionEvidenceAction = semanticCompletionAction(action, item);
          const completionOracle = evaluateCompletionOracle({
            action: completionEvidenceAction,
            before,
            after,
            navigation: observed,
            allowedStatuses: action.allowedStatuses,
            networkResponses,
            semanticReadback: semanticReadbackEvidence(action, completionEvidenceAction, before, after),
          });
          assertCompletionEvidence(completionOracle, item.caseId);
          assert(completionOracle.pass, `${item.caseId} negative navigation completion failed: ${completionOracle.reason}`);
          trace.actions.push({ ...action, observed, status: "PASS" });
          trace.completionEvents.push(completionOracle);
          trace.rawPrimaryObservations.push(makeRawPrimaryObservation({
            actionEvidence: completionEvidenceAction,
            before,
            after,
            navigation: observed,
            networkEntries: networkResponses,
            semanticReadback: completionOracle.semanticReadback,
          }));
        } else {
          await observePrimaryControlContext(
            browser,
            item,
            requested,
            runtimeState,
            action.submitSelector || action.selector || null,
          );
          const result = await executeCaseNativeAction(browser, item, action, runtimeState, caseRuntime, caseContext);
          trace.actions.push(result.actionEvidence);
          if (result.completionOracle) trace.completionEvents.push(result.completionOracle);
          if (result.rawPrimaryObservation) trace.rawPrimaryObservations.push(result.rawPrimaryObservation);
        }
      }
    }
    const primaryCompletionEvents = trace.completionEvents.filter(event =>
      event.pass === true &&
      event.completionPhase === "primary-action" &&
      event.actionId === item.oracle.primaryActionId &&
      event.correlationId === item.oracle.primaryActionCorrelationId &&
      event.controlSelector === item.oracle.primaryControlSelector &&
      item.oracle.allowedCompletionSources.includes(event.source));
    assert(primaryCompletionEvents.length === 1,
      `${item.caseId} requires exactly one action-bound primary completion; observed=${primaryCompletionEvents.length}`);
    if (item.disposition !== "negative-route" && item.workflow.workflowClass !== "negative-route") {
      const completedReadback = runtimeState.get("__completedPrimaryReadback");
      assert(completedReadback?.actionId === item.oracle.primaryActionId &&
        completedReadback.correlationId === item.oracle.primaryActionCorrelationId &&
        completedReadback.expectedBehaviorSha256 === item.oracle.expectedBehaviorSha256 &&
        completedReadback.readbackIdentity === item.oracle.independentReadbackIdentity,
      `${item.caseId} linked independent runtime readback completion missing`);
      assert(!runtimeState.has("__pendingPrimaryCompletion"),
        `${item.caseId} primary action remained pending after independent readback`);
    }
    assert(runtimeState.has("__requestedObservedEnvelope"),
      `${item.caseId} runtime requested/observed control context was not captured`);
    const requestedObserved = runtimeState.get("__requestedObservedEnvelope");
    trace.observed = structuredClone(requestedObserved.observed);
    const visualTargetSelector = item.controlAction.targetSelector || "body";
    const visualExpectedCase = {
      canonicalCaseId: item.caseId,
      featureId: item.featureId,
      screenId: item.caseId,
      screenRoute: item.screenRoute,
      accountRole: item.accountRole,
      targetSelector: visualTargetSelector,
      width: item.viewport.width,
      height: item.viewport.height,
      theme: item.theme,
      liveVideoRequired: false,
    };
    const visualMeasurement = await browser.measureVisualState(visualTargetSelector, {
      caseBinding: {
        canonicalCaseId: item.caseId,
        featureId: item.featureId,
        screenId: item.caseId,
        screenRoute: item.screenRoute,
        accountRole: item.accountRole,
        targetSelector: visualTargetSelector,
      },
      requestedTheme: item.theme,
    });
    await browser.screenshot(screenshotPath);
    await executeWorkflowCleanup(browser, item, runtimeState, caseRuntime, caseContext, trace);
    browserCloseAttempted = true;
    let finalNavigation;
    try {
      finalNavigation = await browser.close();
    } catch (error) {
      browserCloseFailure = error;
      throw error;
    }
    trace.navigation = structuredClone(finalNavigation);
    const lifecycleNavigationBinding = item.actions.find(action =>
      action.semanticCompletion?.phase === "primary-action")?.semanticCompletion?.navigationBinding || null;
    if (lifecycleNavigationBinding) {
      const navigationLifecycleEvidence = buildNavigationTrustEvidence({
        navigation: finalNavigation,
        expected: lifecycleNavigationBinding,
      });
      if (!navigationLifecycleEvidence.pass) {
        const error = new Error(
          `${item.caseId} final navigation lifecycle failed: ${navigationLifecycleEvidence.failureCode}`,
        );
        error.navigationLifecycleEvidence = structuredClone(navigationLifecycleEvidence);
        throw error;
      }
      trace.navigationLifecycleEvidence = navigationLifecycleEvidence;
    }
    writeJson(consolePath, {
      schema: "media-server.v390-ui-native-browser-console.v1",
      caseId: item.caseId,
      entries: browser.consoleEntries(),
    });
    writeJson(tracePath, trace);
    caseResult = {
      caseId: item.caseId,
      featureId: item.featureId,
      status: "PASS",
      disposition: item.disposition,
      dispatch: "playwright-native",
      manualIntervention: false,
      actualBrowserExecution: true,
      requested: trace.requested,
      observed: requestedObserved.observed,
      requestedObservedSchema: requestedObserved.schema,
      visibleAssertion: {
        pass: initialSnapshot.exists === true && initialSnapshot.visible === true,
        visible: initialSnapshot.visible === true,
        selector: "body",
      },
      visualMeasurement,
      visualExpectedCase,
      requireVideoOverlay: false,
      navigation: finalNavigation,
      navigationLifecycleEvidence: trace.navigationLifecycleEvidence || null,
      eventDomSemanticEvidence: runtimeState.get("__eventDomSemanticEvidence") || null,
      requestCorrelationEvidence: runtimeState.get("__requestCorrelationEvidence") || null,
      requestCorrelationScopeEvidence:
        runtimeState.get("__requestCorrelationScopeEvidence") || null,
      markerStageEvidence:
        runtimeState.get("__markerStageEvidence") || null,
      markerEvidence: runtimeState.get("__markerEvidence") ||
        runtimeState.get("__eventDomSemanticEvidence")?.markerFlow || null,
      markerEvidenceLifecycle: (runtimeState.get("__markerEvidence") ||
        runtimeState.get("__eventDomSemanticEvidence")?.markerFlow)
        ? {
            phase: "reached",
            evaluatorInvocationCount: Number((runtimeState.get("__markerEvidence") ||
              runtimeState.get("__eventDomSemanticEvidence")?.markerFlow)
              ?.evaluatorInvocationCount || 0),
            correlationResponseBound: (runtimeState.get("__markerEvidence") ||
              runtimeState.get("__eventDomSemanticEvidence")?.markerFlow)
              ?.correlationResponseBound === true,
            domReadinessConfirmed: (runtimeState.get("__markerEvidence") ||
              runtimeState.get("__eventDomSemanticEvidence")?.markerFlow)
              ?.domReadinessConfirmed === true,
          }
        : { phase: "not-reached" },
      cleanupAttestation: buildCaseCleanupAttestation({
        primaryFailure: null,
        cleanupFailure: null,
        browserCloseFailure: null,
        browserCloseAttempted,
        browserContextCreated,
        caseRuntimeRestored: runtimeState.has("__caseRuntimeRestored"),
        cleanupEntries: trace.cleanup,
      }),
      oracleSeed: item.oracle,
      completionOracle: trace.completionEvents,
      screenshotPath,
      tracePath,
      browserConsolePath: consolePath,
      serverLogReference: serverLogPath,
    };
  } catch (error) {
    primaryFailure = error;
    if (error?.eventDomSemanticEvidence) {
      runtimeState.set("__eventDomSemanticEvidence",
        structuredClone(error.eventDomSemanticEvidence));
      if (error.eventDomSemanticEvidence.markerFlow) {
        runtimeState.set("__markerEvidence",
          structuredClone(error.eventDomSemanticEvidence.markerFlow));
      }
    }
    if (error?.markerEvidence) {
      runtimeState.set("__markerEvidence", structuredClone(error.markerEvidence));
    }
    if (error?.markerStageEvidence) {
      runtimeState.set("__markerStageEvidence",
        structuredClone(error.markerStageEvidence));
    }
    if (error?.requestCorrelationEvidence) {
      runtimeState.set("__requestCorrelationEvidence",
        structuredClone(error.requestCorrelationEvidence));
    }
    const correlationWindow = runtimeState.get("__requestCorrelationWindow");
    if (correlationWindow && !Number.isInteger(correlationWindow.networkEnd)) {
      runtimeState.set("__requestCorrelationWindow", {
        ...correlationWindow,
        networkEnd: browser ? browser.networkEntries().length : 0,
      });
    }
  } finally {
    const finalized = await finalizeFailedCaseLifecycle({
      primaryFailure,
      captureEvidence: () => {
        if (!browser) return null;
        const entries = browser.networkEntries();
        const correlationWindow = runtimeState.get("__requestCorrelationWindow") || null;
        const closedWindow = correlationWindow
          ? { ...correlationWindow, networkEnd: entries.length }
          : null;
        if (closedWindow) {
          runtimeState.set("__requestCorrelationWindow", closedWindow);
        }
        return captureBoundedCorrelationWindow({
          entries,
          window: closedWindow,
        });
      },
      restoreCase: async () => {
        if (runtimeState.has("__caseRuntimeRestored")) return;
        if (!caseContext) {
          if (primaryFailure?.runtimeCleanup?.status === "PASS") {
            runtimeState.set("__caseRuntimeRestored", true);
            return;
          }
          throw new Error(`${item.caseId} case runtime preparation did not produce restorable state`);
        }
        const cleanupResults = await caseRuntime.restoreCase(item, caseContext, browser);
        trace.cleanup.push(...cleanupResults.map(result => ({ ...result, status: "PASS", fallbackAfterFailure: true })));
        runtimeState.set("__caseRuntimeRestored", true);
      },
      closeBrowser: async () => {
        if (!browser) return null;
        browserCloseAttempted = true;
        return closeBrowserForFailureLifecycle({ browser, trace });
      },
      finalizeEvidence: ({
        primaryFailure: preservedPrimaryFailure,
        cleanupFailure: finalCleanupFailure,
        browserCloseFailure: finalBrowserCloseFailure,
        finalNavigation,
        capturedEvidence,
      }) => {
        if (finalNavigation) trace.navigation = structuredClone(finalNavigation);
        return buildFailureLifecycleEvidence({
          item,
          trace,
          runtimeState,
          primaryFailure: preservedPrimaryFailure,
          cleanupFailure: finalCleanupFailure,
          browserCloseFailure: finalBrowserCloseFailure,
          browserCloseAttempted,
          browserContextCreated,
          capturedCorrelationWindow: capturedEvidence,
        });
      },
    });
    cleanupFailure ||= finalized.cleanupFailure;
    browserCloseFailure ||= finalized.browserCloseFailure;
    lifecycleFinalizationFailure ||= finalized.lifecycleFinalizationFailure;
    failureLifecycleEvidence = finalized.failureLifecycleEvidence ||
      buildFallbackFailureLifecycleEvidence({
        primaryFailure,
        cleanupFailure,
        browserCloseFailure,
        browserCloseAttempted,
        browserContextCreated,
        caseRuntimeRestored: runtimeState.has("__caseRuntimeRestored"),
        cleanupEntries: trace.cleanup,
        navigation: trace.navigation,
      });
    failureLifecycleEvidence =
      serializeFailureLifecycleEvidence(failureLifecycleEvidence);
    if (caseResult && failureLifecycleEvidence) {
      caseResult.navigationLifecycleEvidence =
        structuredClone(failureLifecycleEvidence.navigationLifecycleEvidence);
      caseResult.requestCorrelationScopeEvidence =
        structuredClone(failureLifecycleEvidence.requestCorrelationScopeEvidence);
      caseResult.markerEvidence =
        structuredClone(failureLifecycleEvidence.markerEvidence);
      caseResult.markerEvidenceLifecycle =
        structuredClone(failureLifecycleEvidence.markerEvidenceLifecycle);
      caseResult.markerStageEvidence =
        structuredClone(failureLifecycleEvidence.markerStageEvidence);
      caseResult.cleanupAttestation =
        structuredClone(failureLifecycleEvidence.cleanupAttestation);
      trace.failureLifecycleEvidence = structuredClone(failureLifecycleEvidence);
    }
    if (primaryFailure || cleanupFailure || browserCloseFailure ||
        lifecycleFinalizationFailure) {
      trace.failureLifecycleEvidence = structuredClone(failureLifecycleEvidence);
      try {
        writeJson(consolePath, {
          schema: "media-server.v390-ui-native-browser-console.v1",
          caseId: item.caseId,
          entries: browser ? browser.consoleEntries() : [],
        });
        writeJson(tracePath, trace);
      } catch (error) {
        cleanupFailure ||= error;
        failureLifecycleEvidence.cleanupAttestation = buildCaseCleanupAttestation({
          primaryFailure,
          cleanupFailure,
          browserCloseFailure,
          browserCloseAttempted,
          browserContextCreated,
          caseRuntimeRestored: runtimeState.has("__caseRuntimeRestored"),
          cleanupEntries: trace.cleanup,
        });
      }
    }
  }
  if (primaryFailure || cleanupFailure || browserCloseFailure ||
      lifecycleFinalizationFailure) {
    const primaryFailureEvidence = serializeDiagnosticPrimaryFailureEvidence(
      primaryFailure,
      {
        playwrightTimeoutClassAttested:
          adapter.isPlaywrightTimeoutError(primaryFailure),
      },
    );
    const failureProvenance = buildDiagnosticFailureProvenance({
      primaryFailure,
      primaryFailureEvidence,
      cleanupFailure,
      browserCloseFailure,
      lifecycleFinalizationFailure,
      actualBrowserExecution: browserContextCreated,
      failurePhase: executionPhase,
    });
    throw caseExecutionFailure(item.caseId, {
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      lifecycleFinalizationFailure,
      artifactPaths: { screenshotPath, tracePath, consolePath },
      requestedObserved: runtimeState.get("__requestedObservedEnvelope") || {
        requested,
        observed: null,
      },
      actualBrowserExecution: browserContextCreated,
      failurePhase: executionPhase,
      failureProvenance,
      primaryFailureEvidence,
      failureLifecycleEvidence,
    });
  }
  assert(caseResult, `${item.caseId} completed without a result`);
  return caseResult;
}

function createFailedCaseResult(item, error, diagnosticChild) {
  return {
    caseId: item.caseId,
    featureId: item.featureId,
    status: "FAIL",
    reason: diagnosticChild
      ? safeDiagnosticFailureClass(error)
      : (error instanceof Error ? error.message : String(error)),
    dispatch: "playwright-native",
    manualIntervention: false,
    actualBrowserExecution: error?.actualBrowserExecution === true,
    failureProvenance: error?.failureProvenance || null,
    primaryFailureEvidence: error?.primaryFailureEvidence || null,
    ...(diagnosticChild ? {
      failureDetail: safeDiagnosticFailureDetail(error),
      environmentContamination: Boolean(error?.cleanupFailure || error?.browserCloseFailure),
      cleanupFailure: Boolean(error?.cleanupFailure),
      browserCloseFailure: Boolean(error?.browserCloseFailure),
      eventReviewSeedWriteEvidence:
        error?.eventReviewSeedWriteEvidence
          ? structuredClone(error.eventReviewSeedWriteEvidence)
          : null,
    } : {}),
    ...(error?.partialArtifacts || {}),
  };
}

function caseExecutionFailure(
  caseId,
  {
    primaryFailure,
    cleanupFailure,
    browserCloseFailure,
    lifecycleFinalizationFailure,
    artifactPaths = {},
    requestedObserved = null,
    actualBrowserExecution = false,
    failurePhase = "case-execution",
    failureProvenance = null,
    primaryFailureEvidence = null,
    failureLifecycleEvidence = null,
  },
) {
  const messageFor = value => value instanceof Error ? value.message : (value ? String(value) : "");
  const parts = [
    primaryFailure ? `primary=${messageFor(primaryFailure)}` : "",
    cleanupFailure ? `cleanup=${messageFor(cleanupFailure)}` : "",
    browserCloseFailure ? `browser-close=${messageFor(browserCloseFailure)}` : "",
    lifecycleFinalizationFailure
      ? `lifecycle-finalization=${messageFor(lifecycleFinalizationFailure)}`
      : "",
  ].filter(Boolean);
  const error = new Error(`${caseId} native execution failed: ${parts.join("; ")}`);
  error.primaryFailureEvidence = primaryFailureEvidence ||
    serializeDiagnosticPrimaryFailureEvidence(primaryFailure);
  error.primaryFailure = primaryFailure ? {
    name: error.primaryFailureEvidence.errorName,
    message: messageFor(primaryFailure),
  } : null;
  error.cleanupFailure = cleanupFailure ? { message: messageFor(cleanupFailure) } : null;
  error.browserCloseFailure = browserCloseFailure ? { message: messageFor(browserCloseFailure) } : null;
  error.lifecycleFinalizationFailure = lifecycleFinalizationFailure
    ? { message: messageFor(lifecycleFinalizationFailure) }
    : null;
  error.actualBrowserExecution = actualBrowserExecution === true;
  error.failureProvenance = failureProvenance || Object.freeze({
    schema: "media-server.v390-ui-diagnostic-failure-provenance.v1",
    kind: "runner-or-lifecycle-failure",
    phase: String(failurePhase || ""),
    failureClass: "case-execution-failed",
    errorName: String(primaryFailure?.name || "Error"),
    classificationSource: "none",
    actualBrowserExecution: actualBrowserExecution === true,
    structuredEvidencePresent: false,
    continuationEligible: false,
  });
  error.partialArtifacts = Object.fromEntries(Object.entries({
    screenshotPath: artifactPaths.screenshotPath,
    tracePath: artifactPaths.tracePath,
    browserConsolePath: artifactPaths.consolePath,
  }).filter(([, filePath]) => filePath && fs.existsSync(filePath)));
  if (requestedObserved?.requested) {
    error.partialArtifacts.requested = structuredClone(requestedObserved.requested);
  }
  if (requestedObserved?.observed) {
    error.partialArtifacts.observed = structuredClone(requestedObserved.observed);
  }
  error.partialArtifacts.failureProvenance =
    structuredClone(error.failureProvenance);
  if (primaryFailure?.eventDomSemanticEvidence) {
    error.partialArtifacts.eventDomSemanticEvidence =
      structuredClone(primaryFailure.eventDomSemanticEvidence);
  }
  if (primaryFailure?.requestCorrelationEvidence) {
    error.partialArtifacts.requestCorrelationEvidence =
      structuredClone(primaryFailure.requestCorrelationEvidence);
  }
  if (primaryFailure?.requestCorrelationScopeEvidence) {
    error.partialArtifacts.requestCorrelationScopeEvidence =
      structuredClone(primaryFailure.requestCorrelationScopeEvidence);
  }
  if (primaryFailure?.navigationLifecycleEvidence) {
    error.partialArtifacts.navigationLifecycleEvidence =
      structuredClone(primaryFailure.navigationLifecycleEvidence);
  }
  const eventReviewSeedFailure =
    eventReviewSeedDiagnosticCaseIds.includes(caseId) &&
    messageFor(primaryFailure).includes("exact review seed write receipt is incomplete");
  if (primaryFailure?.eventReviewSeedWriteEvidence || eventReviewSeedFailure) {
    const evidence = copyEventReviewSeedWriteEvidence(
      primaryFailure?.eventReviewSeedWriteEvidence,
      { caseId },
    );
    error.eventReviewSeedWriteEvidence = structuredClone(evidence);
    error.partialArtifacts.eventReviewSeedWriteEvidence =
      structuredClone(evidence);
  }
  if (failureLifecycleEvidence) {
    error.partialArtifacts.failureLifecycleEvidence =
      serializeFailureLifecycleEvidence(failureLifecycleEvidence);
    for (const key of [
      "navigationLifecycleEvidence",
      "requestCorrelationScopeEvidence",
      "markerStageEvidence",
      "markerEvidence",
      "markerEvidenceLifecycle",
      "cleanupAttestation",
    ]) {
      if (Object.hasOwn(failureLifecycleEvidence, key)) {
        if (Object.hasOwn(error.partialArtifacts, key)) continue;
        error.partialArtifacts[key] = structuredClone(failureLifecycleEvidence[key]);
      }
    }
  }
  return error;
}

function refreshFailureDiagnosticArtifacts(items) {
  for (const item of items.filter(candidate => candidate.status === "FAIL")) {
    const diagnosticArtifacts = {};
    for (const [name, filePath] of [
      ["screenshot", item.screenshotPath],
      ["trace", item.tracePath],
      ["browserConsole", item.browserConsolePath],
    ]) {
      if (!filePath || !fs.existsSync(filePath)) continue;
      diagnosticArtifacts[name] = {
        path: path.relative(outputDir, filePath),
        bytes: fs.statSync(filePath).size,
        sha256: sha256File(filePath),
      };
    }
    if (item.screenshotEvidence) {
      diagnosticArtifacts.screenshotEvidence = {
        ...item.screenshotEvidence,
        canonicalPath: item.screenshotEvidence.canonicalPath
          ? path.relative(outputDir, item.screenshotEvidence.canonicalPath)
          : "",
      };
    }
    item.diagnosticArtifacts = diagnosticArtifacts;
  }
}

function summarizeArtifactLifecycle(pruning, deduplication) {
  return {
    pruning: {
      scannedRoots: pruning.scannedRoots.map(value => path.relative(outputDir, value)),
      referencedFiles: pruning.referencedFiles,
      removedFiles: pruning.removedFiles.map(value => path.relative(outputDir, value)),
    },
    screenshotDeduplication: {
      referencedScreenshots: deduplication.referencedScreenshots,
      uniqueScreenshotFiles: deduplication.uniqueScreenshotFiles,
      duplicateScreenshotFilesRemoved: deduplication.duplicateScreenshotFilesRemoved,
      removed: deduplication.removed.map(item => ({
        ...item,
        path: path.relative(outputDir, item.path),
        canonicalPath: path.relative(outputDir, item.canonicalPath),
      })),
    },
  };
}

async function observePrimaryControlContext(browser, item, requested, runtimeState, candidateSelector = null) {
  if (runtimeState.has("__requestedObservedEnvelope")) return;
  const primaryControl = item.workflow.primaryControl;
  const primarySelector = primaryControl.selector ?? null;
  if (primaryControl.applicability === "required" && candidateSelector !== primarySelector) return;
  await browser.setCorrelationId(`${item.caseId}:schema-observation`, { inject: false });
  const rawObserved = await browser.observeRequestedObservedState({
    selector: primarySelector,
    applicability: primaryControl.applicability,
  });
  await browser.setCorrelationId(`${item.caseId}:navigation`, { inject: false });
  const observed = runtimeObservedProjection(rawObserved);
  const envelope = assertRequestedObservedEnvelope({
    requested,
    observed,
    canonicalCase: canonicalById.get(item.caseId),
    nativeCase: item,
  });
  runtimeState.set("__requestedObservedEnvelope", envelope);
}

async function executeVisualMatrix(adapter) {
  const probes = [];
  const nativeById = new Map(manifest.cases.map(item => [item.caseId, item]));
  for (const variant of expandVisualMatrixPlan(visualMatrixPlan)) {
      const item = nativeById.get(variant.canonicalCaseId);
      assert(item, `${variant.canonicalCaseId} visual representative native case missing`);
      const id = `visual-${variant.canonicalCaseId}-${variant.width}-${variant.theme}`;
      const storageStatePath = await caseRuntime.freshRoleStorageState(variant.accountRole, id);
      const browser = await adapter.openPage({
        httpBase: options.httpBase,
        pagePath: variant.screenRoute,
        timeoutMs: options.timeoutMs,
        width: variant.width,
        height: variant.height,
        storageStatePath,
        colorScheme: variant.theme,
        navigationCorrelationId: "",
      });
      const screenshotPath = path.join(visualMatrixDir, `${id}.png`);
      try {
        assert(item.oracle.allowedStatuses.includes(browser.navigation.status), `${id} navigation status mismatch`);
        await browser.waitForSelector(variant.targetSelector);
        const liveCorrelationId = variant.liveVideoRequired ? `${id}:live-session` : "";
        if (variant.liveVideoRequired) {
          await prepareLiveVisualProbe(browser, visualMatrixPlan.liveVideoProbe, liveCorrelationId, id);
        }
        const caseBinding = {
          canonicalCaseId: variant.canonicalCaseId,
          featureId: variant.featureId,
          screenId: variant.screenId,
          screenRoute: variant.screenRoute,
          accountRole: variant.accountRole,
          targetSelector: variant.targetSelector,
        };
        const measurement = await browser.measureVisualState(variant.targetSelector, {
          caseBinding,
          requestedTheme: variant.theme,
          liveVideoSpec: variant.liveVideoRequired ? visualMatrixPlan.liveVideoProbe : null,
          liveCorrelationId,
        });
        await browser.screenshot(screenshotPath);
        probes.push({
          id,
          canonicalCaseId: variant.canonicalCaseId,
          featureId: variant.featureId,
          screenId: variant.screenId,
          screenRoute: variant.screenRoute,
          role: variant.accountRole,
          width: variant.width,
          height: variant.height,
          theme: variant.theme,
          correlationId: `${id}:navigation`,
          screenshotPath,
          measurement,
          expectedCase: variant,
          liveVideoSpec: variant.liveVideoRequired ? visualMatrixPlan.liveVideoProbe : null,
        });
        if (variant.liveVideoRequired) await cleanupLiveVisualProbe(browser, visualMatrixPlan.liveVideoProbe, `${id}:cleanup`);
      } finally {
        await browser.close();
      }
  }
  return probes;
}

async function prepareLiveVisualProbe(browser, spec, correlationId, id) {
  await browser.waitForSelector(spec.tileSelector);
  await browser.setCorrelationId(correlationId);
  const rawSelector = spec.modeActionSelector.replace('data-mode-action="va-overlay"', 'data-mode-action="raw"');
  const raw = await browser.snapshot(rawSelector);
  assert(raw.exists && raw.visible, `${id} raw mode precondition missing`);
  await browser.click(rawSelector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
  await browser.click(spec.modeActionSelector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 750, quietMs: 250 });
  const hasVaSession = browser.networkEntries().some(entry => entry.phase === "request-start" &&
    entry.correlationId === correlationId && entry.method === "POST" && entry.requestBody?.overlayMode === "va-overlay");
  if (!hasVaSession) {
    const playbackSelector = spec.controlSelectors.find(selector => selector.includes('data-action="toggle-playback"'));
    assert(playbackSelector, `${id} playback action selector missing`);
    await browser.click(playbackSelector);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 750, quietMs: 250 });
  }
  await browser.waitForSelector(spec.modeSelector);
  await browser.waitForLiveVideoReady({ videoSelector: spec.videoSelector, modeSelector: spec.modeSelector });
}

async function cleanupLiveVisualProbe(browser, spec, correlationId) {
  const stopSelector = spec.controlSelectors.find(selector => selector.includes('data-action="stop"'));
  if (!stopSelector) return;
  await browser.setCorrelationId(correlationId);
  const stop = await browser.snapshot(stopSelector);
  if (stop.exists && stop.visible && !stop.disabled) {
    await browser.click(stopSelector);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
  }
}

async function executeWorkflowSetup(item, storageStatePath, roleStateMap, caseRuntimeOwner, caseContext, trace) {
  for (const setup of item.workflow.setup) {
    if (setup.kind === "bind-role-session") {
      assert(setup.accountRole === item.accountRole, `${item.caseId} role setup drift`);
      assert(setup.required === (item.accountRole !== "anonymous"), `${item.caseId} role requirement drift`);
      if (setup.required) assert(storageStatePath, `${item.caseId} required role storage state missing`);
    } else if (setup.kind === "bind-action-role-session") {
      const actionRoleStatePath = caseContext.actionRoleStatePaths[setup.accountRole] ||
        (setup.accountRole === item.accountRole ? storageStatePath : await caseRuntimeOwner.freshRoleStorageState(
          setup.accountRole,
          `${item.caseId}-action-setup`,
        ));
      if (setup.accountRole !== "anonymous") assert(actionRoleStatePath,
        `${item.caseId} action role storage state missing: ${setup.accountRole}`);
      assert(setup.route === item.workflow.primaryControl.route,
        `${item.caseId} action role route drift`);
    } else if (setup.kind === "seed-reviewed-state") {
      assert(/^[a-f0-9]{64}$/.test(setup.semanticCallChainSha256), `${item.caseId} semantic seed digest invalid`);
      if (setup.persistedMutation) {
        assert(setup.beforeSnapshotRef && setup.fixtureId,
          `${item.caseId} persisted seed snapshot/fixture missing`);
        assert(caseContext.prepared && caseContext.fixtureId === setup.fixtureId,
          `${item.caseId} persisted workflow seed owner mismatch`);
      }
    } else {
      throw new Error(`${item.caseId} unsupported setup kind: ${setup.kind}`);
    }
    trace.setup.push({ ...setup, status: "PASS" });
  }
}

async function preparePersistedUiLifecycle(browser, item, action, caseRuntimeOwner, caseContext) {
  const input = workflowInput(item, action.inputId, "reversible-fixture-record");
  const lifecycle = action.uiLifecycle;
  assert(lifecycle?.schema === "media-server.v390-ui-persisted-lifecycle.v1",
    `${item.caseId} persisted UI lifecycle schema missing`);
  const fixtureId = String(input.actualValue?.id || "");
  assert(fixtureId && lifecycle.fixtureBinding?.fixtureId === fixtureId,
    `${item.caseId} persisted UI lifecycle fixture ID drift`);
  assert(lifecycle.fixtureBinding.requestMethod === action.endpoint?.method &&
    lifecycle.fixtureBinding.requestPathTemplate === action.endpoint?.path,
  `${item.caseId} persisted UI lifecycle endpoint binding drift`);
  const operation = String(input.actualValue?.operation || "write");
  const base = {
    schema: lifecycle.schema,
    adapter: lifecycle.adapter,
    fixtureId,
    operation,
    selector: action.selector,
    activationCount: 1,
    requestBinding: lifecycle.requestBinding ? structuredClone(lifecycle.requestBinding) : null,
    phases: [...lifecycle.requiredPhases],
  };

  if (lifecycle.adapter === "channel-source-view-pair") {
    const kind = input.actualValue?.kind || ({
      "SRC-002": "rtsp",
      "SRC-003": "http",
      "SRC-004": "whep",
      "SRC-005": "webrtc",
      "UI-109": "onvif",
      "SRC-066": "onvif",
    })[item.caseId] || "file";
    if (operation !== "create") {
      await browser.waitForSelector(`[data-view-channel=${JSON.stringify(fixtureId)}]`);
    }
    await browser.evaluate(`(async () => {
      const value = ${JSON.stringify({
        caseId: item.caseId,
        fixtureId,
        operation,
        kind,
        displayName: input.actualValue?.displayName || `REVIEW4 ${item.caseId}`,
        zone: input.actualValue?.zone || "",
        file: input.actualValue?.file || "sample_h264.mp4",
        allowedRuleIds: input.actualValue?.allowedRuleIds || [],
        clientGroups: input.actualValue?.clientGroups || [],
      })};
      if (typeof resetChannelForm !== 'function' || typeof openChannel !== 'function') {
        throw new Error('product channel lifecycle functions are unavailable');
      }
      if (value.operation === 'create') await resetChannelForm('new');
      else openChannel(value.fixtureId, 'edit');
      const form = document.getElementById('channel-form');
      if (!form) throw new Error('product channel form is unavailable');
      const set = (name, next) => {
        const field = form.elements[name];
        if (!field) throw new Error('channel field missing: ' + name);
        field.value = String(next);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('channelId', value.fixtureId);
      set('displayName', value.displayName);
      set('kind', value.kind);
      if (value.caseId === 'SRC-009') set('zone', value.zone);
      if (value.caseId === 'SRC-018') {
        set('allowedRuleIds', value.allowedRuleIds.join(','));
        set('clientGroups', value.clientGroups.join(','));
      }
      if (value.kind === 'file') set('file', value.file);
      if (value.kind === 'rtsp') set('rtspUrl', 'rtsp://127.0.0.1:8554/' + value.fixtureId);
      if (value.kind === 'http') set('httpUrl', 'https://example.invalid/' + value.fixtureId + '/index.m3u8');
      if (value.kind === 'whep') set('whepUrl', 'https://example.invalid/whep/' + value.fixtureId);
      if (value.kind === 'webrtc') set('webrtcSourceId', 'published-' + value.fixtureId);
      if (value.kind === 'onvif') set('onvifStreamUrl', 'rtsp://127.0.0.1:8554/' + value.fixtureId);
      if (typeof currentChannelEnabled !== 'undefined') currentChannelEnabled = true;
      if (typeof updateKindFields === 'function') updateKindFields();
      return { fixtureId: form.elements.channelId.value, kind: form.elements.kind.value };
    })()`);
    return base;
  }

  if (["rule-va-delete", "rule-event-delete", "rule-profile-delete"].includes(lifecycle.adapter)) {
    const actionName = ({
      "rule-va-delete": "delete-va",
      "rule-event-delete": "delete-event-template",
      "rule-profile-delete": "delete-profile",
    })[lifecycle.adapter];
    const mode = ({
      "rule-va-delete": "va-rule",
      "rule-event-delete": "event-rule",
      "rule-profile-delete": "profile",
    })[lifecycle.adapter];
    const modeControl = ({
      "va-rule": "#opsAddVaRuleBtn",
      "event-rule": "#opsAddEventRuleBtn",
      profile: "#opsAddProfileBtn",
    })[mode];
    const section = ({
      "va-rule": "#opsVaRulesSection:not([hidden])",
      "event-rule": "#opsEventRulesSection:not([hidden])",
      profile: "#opsProfileRulesSection:not([hidden])",
    })[mode];
    await browser.click(modeControl);
    await browser.fill("#opsRulesFilterInput", "");
    await browser.click("#opsRulesRefresh");
    await browser.waitForSelector(section);
    await browser.waitForNetworkQuiet({ minimumObservationMs: 500, quietMs: 250 });
    const deleteSelector = `[data-ops-rule-action=${JSON.stringify(actionName)}][data-ops-rule-id=${JSON.stringify(fixtureId)}]`;
    const menuSelector = `tr:has(${deleteSelector}) details[data-testid="ops-context-actions"] > summary`;
    await browser.waitForSelector(menuSelector);
    await browser.click(menuSelector);
    return {
      ...base,
      selector: deleteSelector,
      activationCount: 2,
    };
  }

  if (["rule-va-save", "rule-event-save", "rule-profile-save"].includes(lifecycle.adapter)) {
    const mode = ({
      "rule-va-save": "va-rule",
      "rule-event-save": "event-rule",
      "rule-profile-save": "profile",
    })[lifecycle.adapter];
    await browser.evaluate(`(async () => {
      const value = ${JSON.stringify({
        fixtureId,
        operation,
        mode,
        caseId: item.caseId,
        detector: input.actualValue?.detector,
        fps: input.actualValue?.fps,
        maxQueue: input.actualValue?.maxQueue,
        minConfidence: input.actualValue?.minConfidence,
        nms: input.actualValue?.nms,
        inputWidth: input.actualValue?.inputWidth,
        inputHeight: input.actualValue?.inputHeight,
        trackingClasses: input.actualValue?.trackingClasses,
        tracker: input.actualValue?.tracker,
        reid: input.actualValue?.reid,
        eventMode: input.actualValue?.eventMode,
        eventType: input.actualValue?.eventType,
        direction: input.actualValue?.direction,
        preset: input.actualValue?.preset,
        candidateTimeMs: input.actualValue?.candidateTimeMs,
        dwellTimeMs: input.actualValue?.dwellTimeMs,
        cooldownMs: input.actualValue?.cooldownMs,
        restrictedZoneIds: input.actualValue?.restrictedZoneIds,
        reEntryMode: input.actualValue?.reEntryMode,
        reEntryZoneIds: input.actualValue?.reEntryZoneIds,
        reEntryWindowMs: input.actualValue?.reEntryWindowMs,
        targetZoneIds: input.actualValue?.targetZoneIds,
        lineDelayMs: input.actualValue?.lineDelayMs,
        loiteringRadius: input.actualValue?.loiteringRadius,
        loiteringPoints: input.actualValue?.loiteringPoints,
        groundPlane: input.actualValue?.groundPlane,
        zoneThreshold: input.actualValue?.zoneThreshold,
        zoneDwellMs: input.actualValue?.zoneDwellMs,
        reviewStatus: input.actualValue?.reviewStatus,
        incidentId: input.actualValue?.incidentId,
        incidentStatus: input.actualValue?.incidentStatus,
        actionTarget: input.actualValue?.actionTarget,
        note: input.actualValue?.note,
        correctedFeatureLabel: input.actualValue?.correctedFeatureLabel,
        featureAliases: input.actualValue?.featureAliases,
        reanalysisRequested: input.actualValue?.reanalysisRequested,
        reanalysisReason: input.actualValue?.reanalysisReason,
        deliveryKind: input.actualValue?.deliveryKind,
        deliveryLabel: input.actualValue?.deliveryLabel,
        deliveryEndpoint: input.actualValue?.deliveryEndpoint,
        deliveryEnabled: input.actualValue?.deliveryEnabled,
      })};
      if (typeof openOpsRulesEditor !== 'function') throw new Error('product rules lifecycle function is unavailable');
      await openOpsRulesEditor(value.mode, value.operation === 'create' ? 'new' : 'edit', value.fixtureId);
      const idByMode = { 'va-rule': 'opsVaRuleIdInput', 'event-rule': 'opsEventRuleIdInput', profile: 'opsProfileIdInput' };
      const idInput = document.getElementById(idByMode[value.mode]);
      if (!idInput) throw new Error('product rules ID input is unavailable');
      idInput.value = value.fixtureId;
      if (value.mode === 'va-rule') {
        const name = document.getElementById('opsVaRuleNameInput');
        if (name) name.value = 'REVIEW4 ' + value.caseId;
        for (const id of ['opsVaRuleChannelSelect', 'opsVaRuleProfileSelect', 'opsVaRuleTemplateSeedSelect']) {
          const field = document.getElementById(id);
          if (field && !field.value) field.value = Array.from(field.options || []).find(option => option.value)?.value || '';
          field?.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const geometry = document.getElementById('opsVaRuleGeometryPointsInput');
        if (geometry && (!geometry.value || value.caseId === 'RULE-012')) {
          geometry.value = value.caseId === 'RULE-012'
            ? '0.10,0.10\\n0.70,0.10\\n0.70,0.70\\n0.10,0.70'
            : '0.20,0.20\\n0.80,0.20\\n0.80,0.80\\n0.20,0.80';
          geometry.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (value.caseId === 'RULE-008') {
          const enabled = document.getElementById('opsVaRuleEnabledInput');
          if (enabled) enabled.value = enabled.value === 'false' ? 'true' : 'false';
        }
        if (value.caseId === 'RULE-011') {
          const profile = document.getElementById('opsVaRuleProfileSelect');
          if (!profile || !Array.from(profile.options || []).some(option => option.value === '9101')) {
            throw new Error('reviewed profile 9101 is unavailable');
          }
          profile.value = '9101';
        }
        const tracker = document.getElementById('opsVaRuleTrackerSelect');
        if (tracker && value.tracker) {
          tracker.value = String(value.tracker);
          tracker.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const reid = document.getElementById('opsVaRuleReidSelect');
        if (reid && value.reid) {
          reid.value = String(value.reid);
          reid.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (value.mode === 'event-rule') {
        const mode = document.getElementById('opsEventRuleModeSelect');
        const type = document.getElementById('opsEventRuleTypeSelect');
        if (value.eventMode && mode) mode.value = String(value.eventMode);
        if (value.eventType) {
          if (typeof opsEventRuleRefreshTypeOptions === 'function') opsEventRuleRefreshTypeOptions(String(value.eventType));
          else if (type) type.value = String(value.eventType);
          if (typeof opsEventRuleUpdateModeUi === 'function') opsEventRuleUpdateModeUi();
        }
        if (value.preset) {
          const preset = document.getElementById('opsEventRulePresetSelect');
          if (preset) preset.value = String(value.preset);
          if (typeof opsEventRuleApplyPresetToInputs === 'function') opsEventRuleApplyPresetToInputs(String(value.preset));
        }
        if (value.direction) {
          const lineDirection = document.getElementById('opsEventRuleLineDirectionSelect');
          if (lineDirection) lineDirection.value = String(value.direction);
          const triggerDirection = document.getElementById('opsEventRuleTriggerDirectionSelect');
          if (triggerDirection) triggerDirection.value = String(value.direction);
        }
        if (type && !type.value) {
          type.value = 'presence';
        }
        const confidence = document.getElementById('opsEventRuleConfidenceInput');
        if (confidence && value.minConfidence !== undefined) confidence.value = String(value.minConfidence);
        const candidate = document.getElementById('opsEventRuleCandidateInput');
        if (candidate && value.candidateTimeMs !== undefined) candidate.value = String(value.candidateTimeMs);
        const dwell = document.getElementById('opsEventRuleDwellInput');
        if (dwell && value.dwellTimeMs !== undefined) dwell.value = String(value.dwellTimeMs);
        const cooldown = document.getElementById('opsEventRuleCooldownInput');
        if (cooldown && value.cooldownMs !== undefined) cooldown.value = String(value.cooldownMs);
        const restrictedZones = document.getElementById('opsEventRuleRestrictedZonesInput');
        if (restrictedZones && Array.isArray(value.restrictedZoneIds)) restrictedZones.value = value.restrictedZoneIds.join(', ');
        const reEntryMode = document.getElementById('opsEventRuleReEntryModeSelect');
        if (reEntryMode && value.reEntryMode) reEntryMode.value = String(value.reEntryMode);
        const reEntryZones = document.getElementById('opsEventRuleReEntryZonesInput');
        if (reEntryZones && Array.isArray(value.reEntryZoneIds)) reEntryZones.value = value.reEntryZoneIds.join(', ');
        const reEntryWindow = document.getElementById('opsEventRuleReEntryWindowInput');
        if (reEntryWindow && value.reEntryWindowMs !== undefined) reEntryWindow.value = String(value.reEntryWindowMs);
        const targetZones = document.getElementById('opsEventRuleTargetZonesInput');
        if (targetZones && Array.isArray(value.targetZoneIds)) targetZones.value = value.targetZoneIds.join(', ');
        const lineDelay = document.getElementById('opsEventRuleLineDelayInput');
        if (lineDelay && value.lineDelayMs !== undefined) lineDelay.value = String(value.lineDelayMs);
        const loiteringRadius = document.getElementById('opsEventRuleLoiteringRadiusInput');
        if (loiteringRadius && value.loiteringRadius !== undefined) loiteringRadius.value = String(value.loiteringRadius);
        const loiteringPoints = document.getElementById('opsEventRuleLoiteringPointsInput');
        if (loiteringPoints && value.loiteringPoints !== undefined) loiteringPoints.value = String(value.loiteringPoints);
        const groundPlane = document.getElementById('opsEventRuleLoiteringGroundPlaneToggle');
        if (groundPlane && value.groundPlane !== undefined) groundPlane.checked = Boolean(value.groundPlane);
        const zoneThreshold = document.getElementById('opsEventRuleZoneThresholdInput');
        if (zoneThreshold && value.zoneThreshold !== undefined) zoneThreshold.value = String(value.zoneThreshold);
        const zoneDwell = document.getElementById('opsEventRuleZoneDwellInput');
        if (zoneDwell && value.zoneDwellMs !== undefined) zoneDwell.value = String(value.zoneDwellMs);
        const classInput = document.querySelector('#opsEventRuleClassChecks input[type="checkbox"]');
        if (classInput && !classInput.checked) classInput.click();
      } else {
        const detector = document.getElementById('opsProfileDetectorSelect');
        if (detector && value.detector) detector.value = String(value.detector);
        const fps = document.getElementById('opsProfileFpsInput');
        if (fps && value.fps !== undefined) fps.value = String(value.fps);
        const maxQueue = document.getElementById('opsProfileQueueInput');
        if (maxQueue && value.maxQueue !== undefined) maxQueue.value = String(value.maxQueue);
        const confidence = document.getElementById('opsProfileConfidenceInput');
        if (confidence) confidence.value = String(value.minConfidence ?? 0.66);
        const nms = document.getElementById('opsProfileNmsInput');
        if (nms && value.nms !== undefined) nms.value = String(value.nms);
        const inputWidth = document.getElementById('opsProfileInputWidthInput');
        if (inputWidth && value.inputWidth !== undefined) inputWidth.value = String(value.inputWidth);
        const inputHeight = document.getElementById('opsProfileInputHeightInput');
        if (inputHeight && value.inputHeight !== undefined) inputHeight.value = String(value.inputHeight);
        const desiredClasses = Array.isArray(value.trackingClasses) ? new Set(value.trackingClasses.map(String)) : null;
        const classInputs = Array.from(document.querySelectorAll('#opsProfileClassChecks input[type="checkbox"]'));
        for (const classInput of classInputs) {
          const desired = desiredClasses ? desiredClasses.has(String(classInput.value)) : classInput === classInputs[0];
          if (classInput.checked !== desired) classInput.click();
        }
      }
      return { fixtureId: idInput.value, mode: value.mode };
    })()`);
    return base;
  }

  if (lifecycle.adapter === "auth-user-create") {
    await browser.click("#add-user-btn");
    const password = caseRuntimeOwner.resolveSecretRef(`${item.caseId}:fixture-password`, {
      item,
      field: "password",
      caseContext,
    });
    await browser.fill('#user-form [name="username"]', fixtureId);
    await browser.fill('#user-form [name="displayName"]', input.actualValue?.displayName || `REVIEW4 ${item.caseId}`);
    await browser.fill('#user-form [name="password"]', password);
    await browser.fill('#user-form [name="confirmPassword"]', password);
    await browser.select('#user-form [name="role"]', "viewer");
    const viewId = String(caseRuntimeOwner.descriptor?.auth?.defaultViewId || "");
    assert(viewId, `${item.caseId} runtime default view is unavailable for user create`);
    const viewSelector = `[data-assignment-view][value=${JSON.stringify(viewId)}]`;
    await browser.waitForSelector(viewSelector);
    const view = await browser.snapshot(viewSelector);
    if (!view.checked) await browser.click(viewSelector);
    return base;
  }

  if (lifecycle.adapter === "auth-user-update") {
    const userSelector = `[data-user-view=${JSON.stringify(fixtureId)}]`;
    await browser.waitForSelector(userSelector);
    await browser.click(userSelector);
    await browser.click("#user-edit-selected");
    await browser.fill('#user-form [name="displayName"]', `${input.actualValue?.displayName || fixtureId} updated`);
    return base;
  }

  if (["auth-access-approve", "auth-access-reject"].includes(lifecycle.adapter)) {
    const approve = lifecycle.adapter === "auth-access-approve";
    const actionSelector = approve
      ? `[data-request-approve=${JSON.stringify(fixtureId)}]`
      : `[data-request-reject=${JSON.stringify(fixtureId)}]`;
    await browser.waitForSelector(actionSelector);
    if (approve) {
      await browser.fill(`[data-request-approve-view=${JSON.stringify(fixtureId)}]`,
        caseRuntimeOwner.descriptor?.auth?.defaultViewId || "9001");
    }
    return {
      ...base,
      selector: actionSelector,
      activationCount: approve ? 1 : 2,
    };
  }

  if (lifecycle.adapter === "auth-access-request-create") {
    for (const [field, value] of Object.entries({
      username: fixtureId,
      displayName: input.actualValue?.displayName || `REVIEW4 ${item.caseId}`,
      contact: `${fixtureId}@example.invalid`,
      viewId: caseRuntimeOwner.descriptor?.auth?.defaultViewId || "9001",
      reason: `${item.caseId} exact workflow verification`,
    })) {
      await browser.fill(`#request-form [name=${JSON.stringify(field)}]`, value);
    }
    return base;
  }

  if (lifecycle.adapter === "vlm-profile-save") {
    await browser.evaluate(`(async () => {
      if (typeof refreshOpsVlmInstallConnection !== 'function') throw new Error('product VLM lifecycle function is unavailable');
      await refreshOpsVlmInstallConnection();
      const candidate = Array.from(document.querySelectorAll('[data-vlm-option-id]')).find(button => !button.disabled);
      if (!candidate) throw new Error('no product-valid VLM option is selectable');
      candidate.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      const id = document.getElementById('opsVlmProfileId');
      if (!id) throw new Error('VLM profile ID input is unavailable');
      id.value = ${JSON.stringify(fixtureId)};
      id.dataset.userEdited = '1';
      return { fixtureId: id.value };
    })()`);
    return base;
  }

  if (lifecycle.adapter === "vlm-profile-delete") {
    return {
      ...base,
      selector: `[data-delete-vlm-profile=${JSON.stringify(fixtureId)}]`,
      activationCount: 2,
    };
  }

  if (lifecycle.adapter === "event-review-save") {
    const rowSelector = `[data-event-review-row][data-event-id=${JSON.stringify(fixtureId)}]`;
    await browser.waitForSelector(`${rowSelector} [data-event-review-save]`);
    await browser.evaluate(`(() => {
      const row = document.querySelector(${JSON.stringify(rowSelector)});
      const values = ${JSON.stringify({
        reviewStatus: input.actualValue?.reviewStatus || "reviewing",
        incidentId: input.actualValue?.incidentId,
        incidentStatus: input.actualValue?.incidentStatus,
        actionTarget: input.actualValue?.actionTarget,
        note: input.actualValue?.note || `REVIEW4 ${item.caseId} runtime review`,
        correctedFeatureLabel: input.actualValue?.correctedFeatureLabel,
        featureAliases: input.actualValue?.featureAliases,
        reanalysisRequested: input.actualValue?.reanalysisRequested,
        reanalysisReason: input.actualValue?.reanalysisReason,
      })};
      if (!row) throw new Error('event review product row is unavailable');
      const setValue = (name, value) => {
        if (value === undefined || value === null) return;
        const control = row.querySelector('[data-event-review-field="' + name + '"]');
        if (!control) throw new Error('event review field is unavailable: ' + name);
        if (control.type === 'checkbox') control.checked = Boolean(value);
        else control.value = Array.isArray(value) ? value.join(', ') : String(value);
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      };
      for (const [name, value] of Object.entries(values)) setValue(name, value);
      return {
        eventId: row.dataset.eventId || '',
        fields: Object.keys(values).filter(name => values[name] !== undefined && values[name] !== null),
      };
    })()`);
    return { ...base, selector: `${rowSelector} [data-event-review-save]` };
  }

  if (["alert-delivery-persist-test", "alert-delivery-dry-run"].includes(lifecycle.adapter)) {
    await browser.waitForSelector("#alertDeliveryId");
    await browser.fill("#alertDeliveryId", fixtureId);
    await browser.select("#alertDeliveryKind", input.actualValue?.deliveryKind || "webhook");
    await browser.fill("#alertDeliveryLabel", input.actualValue?.deliveryLabel || `REVIEW4 ${item.caseId}`);
    await browser.fill("#alertDeliveryEndpoint",
      input.actualValue?.deliveryEndpoint || `https://alerts.example.invalid/${fixtureId}`);
    const enabled = await browser.snapshot("#alertDeliveryEnabled");
    const expectedEnabled = input.actualValue?.deliveryEnabled !== false;
    if (enabled.checked !== expectedEnabled) await browser.click("#alertDeliveryEnabled");
    const activationSelectors = lifecycle.adapter === "alert-delivery-persist-test"
      ? ["#alertDeliverySave", "#alertDeliveryTest"]
      : ["#alertDeliveryDryRun"];
    for (const selector of activationSelectors) {
      const control = await browser.snapshot(selector);
      assert(control.exists && control.visible && !control.disabled,
        `${item.caseId} alert delivery control is unavailable: ${selector}`);
    }
    return {
      ...base,
      selector: activationSelectors[0],
      activationCount: activationSelectors.length,
      activationSelectors,
    };
  }

  if (lifecycle.adapter === "client-layout-save") {
    const state = await browser.evaluate(`(() => ({
      loaded: Boolean(typeof livePreferenceState !== 'undefined' && livePreferenceState.loaded),
      control: Boolean(document.getElementById('liveSaveLayoutPreference'))
    }))()`);
    assert(state?.loaded === true && state?.control === true,
      `${item.caseId} client layout preference UI was not initialized`);
    const saveBefore = await browser.snapshot("#liveSaveLayoutPreference");
    if (!saveBefore.visible) await browser.click("details.workspace-actions > summary");
    const grid = await browser.snapshot("#liveGridSize");
    const density = await browser.snapshot("#liveDensity");
    const dock = await browser.snapshot("#liveDockSide");
    const nextGrid = grid.optionValues.find(value => value && !grid.selectedValues.includes(value));
    const nextDensity = density.selectedValues[0] === "compact" ? "comfortable" : "compact";
    const nextDock = dock.selectedValues[0] === "right" ? "left" : "right";
    assert(nextGrid && density.optionValues.includes(nextDensity) && dock.optionValues.includes(nextDock),
      `${item.caseId} client layout alternate grid/density/dock values are unavailable`);
    await browser.select("#liveGridSize", nextGrid);
    await browser.select("#liveDensity", nextDensity);
    await browser.select("#liveDockSide", nextDock);
    return {
      ...base,
      configuredLayout: { gridSize: Number(nextGrid), density: nextDensity, dockSide: nextDock },
    };
  }

  throw new Error(`${item.caseId} unsupported persisted UI lifecycle adapter: ${lifecycle.adapter}`);
}

function assertPersistedRequestBinding(networkResponses, action, lifecycle, caseId) {
  const request = action.semanticCompletion?.request;
  assert(request && lifecycle?.fixtureId, `${caseId} persisted request binding contract missing`);
  if (lifecycle.requestBinding?.mode === "ordered-exact-requests") {
    let previousIndex = -1;
    const observed = lifecycle.requestBinding.expectedRequests.map(expected => {
      const urlPath = expected.pathTemplate.replaceAll("{fixtureId}", encodeURIComponent(lifecycle.fixtureId));
      const matches = networkResponses.map((entry, index) => ({ entry, index })).filter(({ entry, index }) => {
        let pathname = "";
        try { pathname = new URL(entry.url, "http://127.0.0.1").pathname; } catch { pathname = ""; }
        return index > previousIndex && entry.phase === "response" &&
          entry.correlationId === request.correlationId &&
          entry.method === expected.method && pathname === urlPath &&
          entry.status >= 200 && entry.status < 300;
      });
      assert(matches.length === 1,
        `${caseId} persisted exact request did not uniquely bind ${expected.method} ${urlPath}: ${matches.length}`);
      previousIndex = matches[0].index;
      return {
        method: expected.method,
        urlPath,
        status: matches[0].entry.status,
        requestId: matches[0].entry.requestId,
        responseIndex: matches[0].index,
      };
    });
    return {
      fixtureId: lifecycle.fixtureId,
      mode: lifecycle.requestBinding.mode,
      requests: observed,
      correlationId: request.correlationId,
    };
  }
  if (lifecycle.requestBinding?.mode === "ordered-source-view-pair") {
    const observed = lifecycle.requestBinding.expectedRequests.map(expected => {
      const urlPath = expected.pathTemplate.replaceAll("{fixtureId}", encodeURIComponent(lifecycle.fixtureId));
      const matches = networkResponses.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
        let pathname = "";
        try { pathname = new URL(entry.url, "http://127.0.0.1").pathname; } catch { pathname = ""; }
        return entry.phase === "response" && entry.correlationId === request.correlationId &&
          entry.method === expected.method && pathname === urlPath && entry.status >= 200 && entry.status < 300;
      });
      assert(matches.length === 1,
        `${caseId} source/view transaction did not uniquely bind ${expected.method} ${urlPath}: ${matches.length}`);
      const requestStart = networkResponses.find(entry =>
        entry.phase === "request-start" && entry.requestId === matches[0].entry.requestId);
      const bodyIdentity = requestStart?.requestBody?.identity || {};
      const expectedIdentity = urlPath.includes("/sources/")
        ? bodyIdentity.sourceId
        : bodyIdentity.viewId;
      assert(expectedIdentity === lifecycle.fixtureId,
        `${caseId} source/view request body identity drift for ${urlPath}`);
      return {
        method: expected.method,
        urlPath,
        status: matches[0].entry.status,
        requestId: matches[0].entry.requestId,
        responseIndex: matches[0].index,
        requestBodyIdentity: structuredClone(bodyIdentity),
      };
    });
    assert(observed[0].responseIndex < observed[1].responseIndex,
      `${caseId} source/view transaction response order drift`);
    return {
      fixtureId: lifecycle.fixtureId,
      mode: lifecycle.requestBinding.mode,
      requests: observed,
      correlationId: request.correlationId,
    };
  }
  const matches = networkResponses.filter(entry => {
    let pathname = "";
    try { pathname = new URL(entry.url, "http://127.0.0.1").pathname; } catch { pathname = ""; }
    return entry.phase === "response" &&
      entry.correlationId === request.correlationId &&
      entry.method === request.method &&
      pathname === request.urlPath &&
      request.allowedStatuses.includes(entry.status);
  });
  assert(matches.length === 1,
    `${caseId} persisted request was not uniquely bound to ${request.method} ${request.urlPath}: ${matches.length}`);
  if (lifecycle.requestBinding?.mode === "atomic-pair") {
    const requestStart = networkResponses.find(entry =>
      entry.phase === "request-start" && entry.requestId === matches[0].requestId);
    assert(requestStart?.requestBody?.sourceIdentity?.sourceId === lifecycle.fixtureId &&
      requestStart?.requestBody?.publishedViewIdentity?.viewId === lifecycle.fixtureId,
    `${caseId} atomic source/view request body identities are not bound to the fixture`);
  }
  return {
    fixtureId: lifecycle.fixtureId,
    mode: lifecycle.requestBinding?.mode || "single-request",
    method: request.method,
    urlPath: request.urlPath,
    status: matches[0].status,
    requestId: matches[0].requestId,
    correlationId: request.correlationId,
  };
}

async function prepareFormSubmitUiLifecycle(browser, item, action, caseRuntimeOwner, caseContext) {
  const lifecycle = action.uiLifecycle;
  assert(lifecycle?.schema === "media-server.v390-ui-form-lifecycle.v1" && lifecycle.adapter,
    `${item.caseId} typed form UI lifecycle schema/adapter missing`);
  assert(lifecycle.formSelector === action.selector && lifecycle.submitSelector === action.submitSelector,
    `${item.caseId} typed form UI lifecycle selector binding drift`);
  assert(Array.isArray(lifecycle.fieldControls) && lifecycle.fieldControls.length === action.fields.length &&
    lifecycle.fieldControls.every((field, index) => field.name === action.fields[index]),
  `${item.caseId} typed form UI lifecycle field order drift`);
  if (lifecycle.entrySelector) {
    const entry = await browser.snapshot(lifecycle.entrySelector);
    assert(entry.exists && entry.visible && !entry.disabled,
      `${item.caseId} form entry control is unavailable: ${lifecycle.entrySelector}`);
    await browser.click(lifecycle.entrySelector);
  }
  await browser.waitForSelector(lifecycle.formSelector);
  const submit = await browser.snapshot(lifecycle.submitSelector);
  assert(submit.exists && submit.visible && !submit.disabled,
    `${item.caseId} form submit control is unavailable: ${lifecycle.submitSelector}`);
  const deferredFixture = await caseRuntimeOwner.prepareDeferredFormFixture(item, caseContext);
  return {
    schema: lifecycle.schema,
    adapter: lifecycle.adapter,
    formSelector: lifecycle.formSelector,
    submitSelector: lifecycle.submitSelector,
    entrySelector: lifecycle.entrySelector || null,
    fieldControls: structuredClone(lifecycle.fieldControls),
    phases: [...lifecycle.requiredPhases],
    deferredFixture,
  };
}

async function applyTypedFormInputs(
  browser,
  item,
  action,
  input,
  caseRuntimeOwner,
  caseContext,
  lifecycle,
) {
  const applied = [];
  for (const field of lifecycle.fieldControls) {
    let value = resolveRuntimeInputValue(
      input.actualValue?.[field.name],
      item,
      field.name,
      caseRuntimeOwner,
      caseContext,
    );
    if (field.valueSource === "runtime-default-view") {
      value = String(caseRuntimeOwner.descriptor?.auth?.defaultViewId || "");
      assert(value, `${item.caseId} runtime default view is unavailable for ${field.name}`);
    }
    if (input.actualValue?.[field.name]?.secretRef) browser.registerRuntimeSecret(value);
    const selector = `${lifecycle.formSelector} [name=${JSON.stringify(field.name)}]`;
    if (field.control === "fill") {
      await browser.fill(selector, value);
    } else if (field.control === "readonly-value") {
      const before = await browser.snapshot(selector);
      assert(field.expectedValue === value && before.exists && before.visible &&
        before.readOnly === true && before.value === field.expectedValue,
        `${item.caseId} readonly form value drift: ${field.name}`);
    } else if (field.control === "select") {
      await browser.select(selector, value);
    } else if (field.control === "check") {
      const before = await browser.snapshot(selector);
      const expectedChecked = value === "true";
      if (before.checked !== expectedChecked) await browser.click(selector);
    } else if (field.control === "hidden-binding") {
      assert(field.bindingSelector, `${item.caseId} hidden field binding selector missing: ${field.name}`);
      if (field.valueSource === "runtime-default-view") {
        value = String(caseRuntimeOwner.descriptor?.auth?.defaultViewId || "");
      }
      assert(value, `${item.caseId} hidden field runtime binding value missing: ${field.name}`);
      const bindingSelector = `${field.bindingSelector}[value=${JSON.stringify(value)}]`;
      await browser.waitForSelector(bindingSelector);
      const before = await browser.snapshot(bindingSelector);
      assert(before.exists && before.visible,
        `${item.caseId} hidden field product binding is unavailable: ${bindingSelector}`);
      if (!before.checked) await browser.click(bindingSelector);
      const hidden = await browser.snapshot(selector);
      assert(hidden.value.split(",").includes(value),
        `${item.caseId} hidden field did not bind product selection: ${field.name}`);
    } else {
      throw new Error(`${item.caseId} unsupported typed form control: ${field.control}`);
    }
    applied.push({
      name: field.name,
      control: field.control,
      valueSource: field.valueSource || (input.actualValue?.[field.name]?.secretRef ? "runtime-secret-ref" : "manifest-input"),
      status: "PASS",
    });
  }
  return applied;
}

function captureFormResponseIdentity(networkResponses, action, lifecycle, caseId, submittedInput) {
  const request = action.semanticCompletion?.request;
  assert(request && lifecycle?.adapter, `${caseId} form response identity contract missing`);
  const documentContract = documentFormSubmitContracts.get(caseId) || null;
  if (documentContract) {
    assert(request.method === "POST" &&
      request.urlPath === documentContract.path &&
      JSON.stringify(request.allowedStatuses) === JSON.stringify(documentContract.statuses),
    `${caseId} document form submit contract drift`);
    return {
      ...bindDocumentFormSubmission(networkResponses, {
        method: request.method,
        path: request.urlPath,
        allowedStatuses: request.allowedStatuses,
        expectedRedirectPath: documentContract.redirectPath,
      }),
      adapter: lifecycle.adapter,
      productIdentity: null,
    };
  }
  const matches = networkResponses.filter(entry => {
    let pathname = "";
    try { pathname = new URL(entry.url, "http://127.0.0.1").pathname; } catch { pathname = ""; }
    return entry.phase === "response" &&
      entry.correlationId === request.correlationId &&
      entry.method === request.method &&
      pathname === request.urlPath &&
      request.allowedStatuses.includes(entry.status);
  });
  const pathResponses = networkResponses.filter(entry => {
    let pathname = "";
    try { pathname = new URL(entry.url, "http://127.0.0.1").pathname; } catch { pathname = ""; }
    return entry.phase === "response" && entry.method === request.method && pathname === request.urlPath;
  });
  assert(matches.length === 1,
    `${caseId} form response was not uniquely bound to ${request.method} ${request.urlPath}: ${matches.length}; ` +
    `pathResponses=${JSON.stringify(pathResponses.map(entry => ({ status: entry.status, correlated: entry.correlationId === request.correlationId })))}`);
  const productIdentity = matches[0].safeResponseBody || null;
  const expectedUsername = String(submittedInput?.username || "");
  if (lifecycle.adapter === "auth-user-create") {
    assert(productIdentity?.username === expectedUsername,
      `${caseId} user-create response identity drift`);
  } else if (lifecycle.adapter === "auth-invite-create") {
    assert(productIdentity?.username === expectedUsername && productIdentity?.inviteId &&
      productIdentity.tokenPresent === true && productIdentity.setupUrlTokenBound === true,
    `${caseId} invite response identity/token binding drift`);
  } else if (lifecycle.adapter === "auth-access-request-create") {
    assert(productIdentity?.username === expectedUsername && productIdentity?.requestId,
      `${caseId} access-request response identity drift`);
  }
  return {
    schema: "media-server.v390-ui-form-response-identity.v1",
    adapter: lifecycle.adapter,
    method: request.method,
    urlPath: request.urlPath,
    status: matches[0].status,
    requestId: matches[0].requestId,
    correlationId: request.correlationId,
    productIdentity: productIdentity ? structuredClone(productIdentity) : null,
  };
}

async function executeCaseNativeAction(browser, item, action, runtimeState, caseRuntimeOwner, caseContext) {
  action = bindRuntimeDefaultViewRequest(item, action, caseRuntimeOwner);
  if (action.kind === "verify-independent-readback") {
    return executeIndependentReadback(
      browser,
      item,
      action,
      runtimeState,
      caseRuntimeOwner,
      caseContext,
    );
  }
  if (action.kind === "execute-endpoint-action") {
    return executeEndpointOwnedAction(
      browser,
      item,
      action,
      runtimeState,
      caseRuntimeOwner,
      caseContext,
    );
  }

  const persistedLifecycle = action.kind === "execute-persisted-action"
    ? runtimeState.get("__persistedUiLifecycle")
    : null;
  const formLifecycle = action.kind === "submit-form"
    ? runtimeState.get("__formSubmitUiLifecycle")
    : null;
  if (action.kind === "execute-persisted-action") {
    assert(persistedLifecycle?.selector, `${item.caseId} persisted UI lifecycle was not prepared`);
  }
  if (action.kind === "submit-form") {
    assert(formLifecycle?.submitSelector, `${item.caseId} form UI lifecycle was not prepared`);
  }
  const snapshotSelector = formLifecycle?.submitSelector || action.submitSelector || persistedLifecycle?.selector || action.selector ||
    item.workflow.primaryControl.selector || "body";
  const before = await browser.snapshot(snapshotSelector);
  assert(before.exists, `${item.caseId} control missing: ${action.selector}`);
  if (["assert-product-state", "assert-product-boundary", "assert-route-read-model", "assert-visible-read-model"].includes(action.kind)) {
    assert(before.visible, `${item.caseId} read model is not visible: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState, caseRuntimeOwner, caseContext);
  }
  if (action.kind === "assert-hidden-control") {
    assert(action.expectedExists === true && !before.visible, `${item.caseId} hidden control state mismatch`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState, caseRuntimeOwner, caseContext);
  }
  if (action.kind === "assert-disabled-control") {
    assert(before.disabled === true, `${item.caseId} control is not disabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState, caseRuntimeOwner, caseContext);
  }
  if (action.kind === "assert-enabled-control") {
    assert(before.visible && before.disabled === false, `${item.caseId} control is not enabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState, caseRuntimeOwner, caseContext);
  }
  if (action.kind === "assert-link-target") {
    assert(before.tag === "a" && before.href.startsWith("/"), `${item.caseId} same-origin link target missing`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState, caseRuntimeOwner, caseContext);
  }
  if (action.kind === "assert-seeded-select") {
    const nonEmpty = before.optionValues.filter(Boolean);
    assert(before.tag === "select" && nonEmpty.length >= action.minimumNonEmptyOptions,
      `${item.caseId} server-seeded select option missing`);
    return semanticAssertionResult(
      browser,
      item,
      action,
      { ...before, nonEmptyOptionCount: nonEmpty.length },
      snapshotSelector,
      runtimeState,
      caseRuntimeOwner,
      caseContext,
    );
  }

  runtimeState.set(action.selector, { kind: action.kind, snapshot: before });
  const beforePostconditionSnapshots = {};
  for (const condition of action.semanticCompletion.localTransition?.postconditions || []) {
    beforePostconditionSnapshots[condition.selector] = await browser.snapshot(condition.selector);
  }
  const networkStart = browser.networkEntries().length;
  await browser.setCorrelationId(action.semanticCompletion.correlationId);
  let executedKind = "";
  let typedFormInputs = null;
  let submittedFormInput = null;
  let originalSessionCookie = "";
  let runtimeSecretRedaction = null;
  let inviteDomSecretCapture = null;
  let composedClientLive = null;
  try {
    if (action.kind === "toggle-details") {
      assert(before.tag === "details", `${item.caseId} details contract mismatch`);
      await browser.click(`${action.selector} > summary`);
      executedKind = "click";
    } else if (action.kind === "fill-control") {
      assert(["input", "textarea"].includes(before.tag), `${item.caseId} fill control contract mismatch`);
      await browser.fill(action.selector, action.value);
      executedKind = "fill";
    } else if (action.kind === "toggle-checkbox") {
      assert(before.tag === "input", `${item.caseId} checkbox control contract mismatch`);
      await browser.click(action.selector);
      executedKind = "click";
    } else if (action.kind === "select-control") {
      assert(before.tag === "select" && before.optionValues.includes(action.value),
        `${item.caseId} exact select option missing: ${action.value}`);
      await browser.select(action.selector, action.value);
      executedKind = "select";
    } else if (action.kind === "activate-control") {
      assert(before.visible && before.disabled === false, `${item.caseId} activate control is not actionable`);
      composedClientLive = await executeComposedClientLiveAction(
        browser,
        item,
        action,
        caseContext,
        networkStart,
      );
      if (composedClientLive) {
        executedKind = composedClientLive.kind;
      } else {
        await browser.click(action.selector);
        executedKind = "click";
      }
    } else if (action.kind === "submit-form") {
      const input = workflowInput(item, action.inputId, "form-values");
      submittedFormInput = input.actualValue || {};
      typedFormInputs = await applyTypedFormInputs(
        browser,
        item,
        action,
        input,
        caseRuntimeOwner,
        caseContext,
        formLifecycle,
      );
      if (item.caseId === "UI-005") {
        originalSessionCookie = await browser.cookieHeader();
        assert(originalSessionCookie, `${item.caseId} pre-logout session cookie missing`);
        browser.registerRuntimeSecret(originalSessionCookie);
        caseRuntimeOwner.registerObservedSecret(
          item,
          caseContext,
          "pre-logout-session-cookie",
          originalSessionCookie,
        );
      }
      if (documentFormSubmitContracts.has(item.caseId)) {
        await browser.submitDocumentForm(formLifecycle.submitSelector, {
          invocationId: `${item.caseId}:form-submit-document-navigation`,
        });
      } else {
        await browser.click(formLifecycle.submitSelector);
      }
      executedKind = "submit";
    } else if (action.kind === "execute-persisted-action") {
      workflowInput(item, action.inputId, "reversible-fixture-record");
      assert(Boolean(action.endpoint) !== Boolean(action.localAction),
        `${item.caseId} persisted action endpoint/local action must be exclusive`);
      const activationSelectors = Array.isArray(persistedLifecycle.activationSelectors)
        ? persistedLifecycle.activationSelectors
        : Array.from({ length: persistedLifecycle.activationCount }, () => persistedLifecycle.selector);
      assert(activationSelectors.length === persistedLifecycle.activationCount,
        `${item.caseId} persisted activation selector count drift`);
      for (const selector of activationSelectors) {
        await browser.click(selector);
        await browser.waitForNetworkQuiet({
          correlationId: action.semanticCompletion.correlationId,
          minimumObservationMs: 500,
          quietMs: 200,
        });
      }
      executedKind = "persisted-control";
    } else {
      throw new Error(`${item.caseId} unsupported case-native action: ${action.kind}`);
    }
    await browser.waitForNetworkQuiet({
      correlationId: action.semanticCompletion.correlationId,
      minimumObservationMs: 750,
      quietMs: 250,
    });
    inviteDomSecretCapture = ["AUTH-015", "AUTH-033"].includes(item.caseId)
      ? await browser.captureInviteRuntimeSecret()
      : null;
    runtimeSecretRedaction = await browser.redactObservedSecrets();
    if (["AUTH-015", "AUTH-033"].includes(item.caseId)) {
      assert((inviteDomSecretCapture?.textPresent !== true || inviteDomSecretCapture?.captured === true) &&
        runtimeSecretRedaction.residualSecrets === 0,
      `${item.caseId} issued invite token was not registered or remained in the evidence DOM: ` +
        JSON.stringify({ inviteDomSecretCapture, runtimeSecretRedaction }));
    }
  } finally {
    await browser.setCorrelationId(`${item.caseId}:navigation`);
  }
  const after = await browser.snapshot(snapshotSelector);
  if (action.kind === "toggle-checkbox") {
    assert(after.checked !== before.checked, `${item.caseId} checkbox did not toggle`);
  }
  const completionAction = materializeComposedClientCompletion(
    semanticCompletionAction(action, item),
    composedClientLive,
  );
  const actionEvidence = {
    ...completionAction,
    controlSelector: action.semanticCompletion.controlSelector || snapshotSelector,
    executedControlSelector: snapshotSelector,
    executedKind,
    ...(persistedLifecycle ? { persistedUiLifecycle: structuredClone(persistedLifecycle) } : {}),
    ...(formLifecycle ? {
      formUiLifecycle: structuredClone(formLifecycle),
      typedFormInputs,
      ...(inviteDomSecretCapture ? { inviteDomSecretCapture } : {}),
      runtimeSecretRedaction,
    } : {}),
    ...(composedClientLive ? { composedClientLive: structuredClone(composedClientLive) } : {}),
    before,
    after,
    status: "PASS",
  };
  const networkResponses = browser.networkEntries().slice(networkStart);
  const persistedRequestBinding = action.kind === "execute-persisted-action"
    ? assertPersistedRequestBinding(networkResponses, action, persistedLifecycle, item.caseId)
    : null;
  const formResponseIdentity = action.kind === "submit-form"
    ? captureFormResponseIdentity(
        networkResponses,
        action,
        formLifecycle,
        item.caseId,
        submittedFormInput,
      )
    : null;
  const boundActionEvidence = {
    ...actionEvidence,
    ...(persistedRequestBinding ? { persistedRequestBinding } : {}),
    ...(formResponseIdentity ? { formResponseIdentity } : {}),
  };
  assert(!runtimeState.has("__pendingPrimaryCompletion"),
    `${item.caseId} multiple pending primary actions are forbidden`);
  runtimeState.set("__pendingPrimaryCompletion", {
    action,
    actionEvidence: boundActionEvidence,
    before,
    after,
    networkResponses,
    persistedRequestBinding,
    formResponseIdentity,
    originalSessionCookie,
    beforePostconditionSnapshots,
  });
  return {
    actionEvidence: { ...boundActionEvidence, completionStatus: "awaiting-independent-readback" },
    completionOracle: null,
  };
}

async function executeComposedClientLiveAction(browser, item, action, caseContext, networkStart) {
  const type = action.semanticCompletion?.localTransition?.type || "";
  if (!["composed-live-start-all-stop", "composed-va-overlay-session"].includes(type)) return null;
  const staleSessionId = String(caseContext?.catalogBindings?.sessionId || "");
  assert(!staleSessionId,
    `${item.caseId} composed client interaction forbids a backend-precreated active session`);
  const tile = await browser.evaluate(`(() => {
    const roots = Array.from(document.querySelectorAll('[data-tile]'));
    const root = roots.find(node => String(node.dataset.viewId || '')) || null;
    if (!root) return null;
    return {
      index: String(root.dataset.tile || ''),
      viewId: String(root.dataset.viewId || ''),
      playbackDisabled: Boolean(root.querySelector('[data-action="toggle-playback"]')?.disabled),
    };
  })()`);
  assert(tile?.index !== undefined && tile.viewId && tile.playbackDisabled === false,
    `${item.caseId} composed client interaction has no assigned actionable tile`);
  const tileSelector = `[data-tile=${JSON.stringify(tile.index)}]`;
  const playbackSelector = `${tileSelector} [data-action="toggle-playback"]`;
  let modeSelector = null;
  let infoOverlayChanged = false;
  if (type === "composed-va-overlay-session") {
    modeSelector = `${tileSelector} [data-mode-action="va-overlay"]`;
    const modeBefore = await browser.snapshot(modeSelector);
    assert(modeBefore.exists && modeBefore.visible && !modeBefore.disabled,
      `${item.caseId} VA overlay product mode control is unavailable`);
    if (modeBefore.ariaPressed !== "true") await browser.click(modeSelector);
    const modeAfter = await browser.snapshot(modeSelector);
    assert(modeAfter.ariaPressed === "true",
      `${item.caseId} VA overlay product mode did not become active`);
    const infoToggle = await browser.snapshot("#liveInfoOverlayToggle");
    assert(infoToggle.exists && infoToggle.visible && !infoToggle.disabled,
      `${item.caseId} product info overlay toggle is unavailable`);
    if (!infoToggle.checked) {
      await browser.click("#liveInfoOverlayToggle");
      infoOverlayChanged = true;
    }
  }
  await browser.click(playbackSelector);
  await browser.waitForNetworkQuiet({
    correlationId: action.semanticCompletion.correlationId,
    minimumObservationMs: 750,
    quietMs: 250,
  });
  const created = browser.networkEntries().slice(networkStart);
  const sessionResponse = created.find(entry => entry.phase === "response" &&
    entry.correlationId === action.semanticCompletion.correlationId &&
    entry.method === "POST" &&
    /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(new URL(entry.url).pathname) &&
    entry.safeResponseBody?.sessionId);
  assert(sessionResponse?.safeResponseBody?.sessionId,
    `${item.caseId} composed product playback did not create an observed session`);
  const sessionId = String(sessionResponse.safeResponseBody.sessionId);
  const sessionRequest = created.find(entry => entry.phase === "request-start" &&
    entry.requestId === sessionResponse.requestId);
  assert(sessionRequest?.requestBody && typeof sessionRequest.requestBody.overlayMode === "string",
    `${item.caseId} composed product playback request is missing overlayMode`);
  let vaProjection = null;
  if (type === "composed-va-overlay-session") {
    assert(sessionRequest.requestBody.overlayMode === "va-overlay",
      `${item.caseId} product session request overlayMode drift: ${sessionRequest.requestBody.overlayMode}`);
    vaProjection = await waitForClientVaOverlayProjection(browser, {
      caseId: item.caseId,
      tileSelector,
      viewId: tile.viewId,
      vaMetadataSampleId: caseContext?.catalogBindings?.vaMetadataSampleId,
    });
    assert(vaProjection.sampleId === String(caseContext?.catalogBindings?.vaMetadataSampleId || ""),
      `${item.caseId} product VA projection is not bound to the seeded metadata event`);
  }
  if (type === "composed-live-start-all-stop") {
    const allStopBefore = await browser.snapshot("#liveAllStop");
    if (allStopBefore.exists && !allStopBefore.visible) {
      await browser.click("details.workspace-actions > summary");
    }
    await browser.click("#liveAllStop");
    await browser.waitForNetworkQuiet({
      correlationId: action.semanticCompletion.correlationId,
      minimumObservationMs: 500,
      quietMs: 200,
    });
    const deleted = browser.networkEntries().slice(networkStart).filter(entry =>
      entry.phase === "response" &&
      entry.correlationId === action.semanticCompletion.correlationId &&
      entry.method === "DELETE" &&
      new URL(entry.url).pathname.endsWith(`/webrtc/session/${encodeURIComponent(sessionId)}`) &&
      entry.status === 200);
    assert(deleted.length === 1,
      `${item.caseId} product all-stop did not close the UI-created session exactly once`);
  }
  return {
    schema: "media-server.v390-ui-composed-client-live-action.v1",
    kind: type,
    tileIndex: tile.index,
    viewId: tile.viewId,
    sessionId,
    overlayMode: sessionRequest.requestBody.overlayMode,
    modeSelector,
    playbackSelector,
    infoOverlayChanged,
    ...(vaProjection ? { vaProjection: structuredClone(vaProjection) } : {}),
    cleanupRequired: type === "composed-va-overlay-session",
    status: "PASS",
  };
}

function materializeComposedClientCompletion(actionEvidence, composedClientLive) {
  if (!composedClientLive || !actionEvidence.expectedLocalTransition) return actionEvidence;
  const requiredRequests = (actionEvidence.expectedLocalTransition.requiredRequests || []).map(request => ({
    ...request,
    urlPath: String(request.urlPath)
      .replaceAll("{assignedViewId}", encodeURIComponent(composedClientLive.viewId))
      .replaceAll("{sessionId}", encodeURIComponent(composedClientLive.sessionId)),
  }));
  assert(requiredRequests.every(request => !request.urlPath.includes("{")),
    `${actionEvidence.actionId} composed request binding remained unresolved`);
  return {
    ...actionEvidence,
    expectedLocalTransition: {
      ...actionEvidence.expectedLocalTransition,
      requiredRequests,
    },
  };
}

async function executeEndpointOwnedAction(
  browser,
  item,
  action,
  runtimeState,
  caseRuntimeOwner,
  caseContext,
) {
  const input = workflowInput(item, action.inputId, "endpoint-action-fixture");
  const request = caseRuntimeOwner.endpointActionRequest(item, caseContext, input);
  const completionRequest = action.semanticCompletion?.request;
  assert(completionRequest && request.method === completionRequest.method &&
    request.path === completionRequest.urlPath &&
    JSON.stringify(request.allowedStatuses) === JSON.stringify(completionRequest.allowedStatuses),
  `${item.caseId} endpoint-owned action request/completion binding mismatch`);
  const before = await browser.snapshot("body");
  const networkStart = browser.networkEntries().length;
  await browser.setCorrelationId(completionRequest.correlationId);
  let response;
  try {
    response = await browser.evaluate(async ({ method, path, body }) => {
      const result = await fetch(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: body === null ? {} : { "Content-Type": "application/json" },
        ...(body === null ? {} : { body: JSON.stringify(body) }),
      });
      const text = await result.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (_) {}
      return {
        status: result.status,
        contentType: result.headers.get("content-type") || "",
        text,
        json,
      };
    }, { method: request.method, path: request.path, body: request.body });
    await browser.waitForNetworkQuiet({
      correlationId: completionRequest.correlationId,
      minimumObservationMs: 750,
      quietMs: 250,
    });
  } finally {
    await browser.setCorrelationId(`${item.caseId}:navigation`);
  }
  assert(request.allowedStatuses.includes(response.status),
    `${item.caseId} endpoint-owned action status mismatch: ${response.status}/${request.allowedStatuses.join(",")}`);
  const networkResponses = browser.networkEntries().slice(networkStart);
  const matchingResponses = networkResponses.filter(entry => {
    if (entry.phase !== "response" || entry.method !== request.method ||
        entry.correlationId !== completionRequest.correlationId) return false;
    try { return new URL(entry.url).pathname === request.path; } catch { return false; }
  });
  assert(matchingResponses.length === 1,
    `${item.caseId} endpoint-owned action response binding mismatch: ${matchingResponses.length}`);
  assert(matchingResponses[0].status === response.status && request.allowedStatuses.includes(matchingResponses[0].status),
    `${item.caseId} endpoint-owned action network status mismatch`);
  assert(matchingResponses[0].safeResponseProjectionSource === "playwright-response-json" &&
    matchingResponses[0].safeResponseBody && typeof matchingResponses[0].safeResponseBody === "object",
  `${item.caseId} endpoint-owned action safe response projection missing`);
  const after = await browser.snapshot("body");
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    executedKind: "browser-fetch",
    endpointOwnership: action.ownership,
    request: { method: request.method, path: request.path, bodyPresent: request.body !== null },
    response: {
      status: response.status,
      contentType: response.contentType,
      safeBody: structuredClone(matchingResponses[0].safeResponseBody),
      projectionSource: matchingResponses[0].safeResponseProjectionSource,
      projectionKind: matchingResponses[0].safeResponseProjectionKind,
    },
    networkBinding: {
      method: matchingResponses[0].method,
      path: new URL(matchingResponses[0].url).pathname,
      status: matchingResponses[0].status,
      correlationId: matchingResponses[0].correlationId,
      requestId: matchingResponses[0].requestId,
    },
    before,
    after,
    status: "PASS",
  };
  assert(!runtimeState.has("__pendingPrimaryCompletion"),
    `${item.caseId} multiple pending primary actions are forbidden`);
  runtimeState.set("__pendingPrimaryCompletion", {
    action,
    actionEvidence,
    before,
    after,
    networkResponses,
    endpointResponse: {
      status: response.status,
      contentType: response.contentType,
      safeBody: structuredClone(matchingResponses[0].safeResponseBody),
      projectionSource: matchingResponses[0].safeResponseProjectionSource,
      projectionKind: matchingResponses[0].safeResponseProjectionKind,
    },
  });
  return {
    actionEvidence: { ...actionEvidence, completionStatus: "awaiting-independent-readback" },
    completionOracle: null,
  };
}

function bindRuntimeDefaultViewRequest(item, action, caseRuntimeOwner) {
  const request = action.semanticCompletion?.request;
  if (item.workflow.workflowClass !== "read-only-state" ||
      request?.method !== "GET" ||
      !String(request.urlPathTemplate || "").startsWith("/client/api/views/{id}")) {
    return action;
  }
  const viewId = String(caseRuntimeOwner.descriptor?.auth?.defaultViewId || "");
  assert(viewId, `${item.caseId} runtime default view is unavailable for client readback`);
  const runtimeUrlPath = String(request.urlPathTemplate).replace("{id}", encodeURIComponent(viewId));
  return {
    ...action,
    semanticCompletion: {
      ...action.semanticCompletion,
      request: {
        ...request,
        urlPath: runtimeUrlPath,
        pathParameters: { ...request.pathParameters, id: viewId },
        parameterSource: "runtime-default-view",
      },
    },
  };
}

async function semanticAssertionResult(
  browser,
  item,
  action,
  observed,
  snapshotSelector,
  runtimeState,
  caseRuntimeOwner,
  caseContext,
) {
  const networkStart = browser.networkEntries().length;
  const completion = action.semanticCompletion;
  let exactObserved = observed;
  let requestCorrelationEvidence = null;
  const catalogObservation = isExistingSpecializedExactOracle(item)
    ? null
    : await (async () => {
      if (item.caseId === "EVT-004") {
        runtimeState.set("__requestCorrelationWindow", {
          networkStart,
          correlationId: completion.correlationId,
          actionId: completion.actionId,
          method: "GET",
          urlPath: "/ops/api/diagnostics/log-tail?limit=50",
        });
      }
      return executeCatalogRuntimeOracleAtSourceRoute({
        browser,
        item,
        fixtureId: caseContext?.fixtureId || exactFixtureId(item),
        bindings: exactOracleBindings(caseRuntimeOwner, caseContext),
        actionId: completion.actionId,
        correlationId: completion.correlationId,
        catalogBindings: caseContext?.catalogBindings || null,
        beforeScreenNavigation: item.caseId === "EVT-004"
          ? () => caseRuntimeOwner.refreshDiagnosticMarkerForDashboard(item, caseContext)
          : null,
      });
    })();
  if (item.caseId === "EVT-004") {
    const correlationWindow = runtimeState.get("__requestCorrelationWindow");
    runtimeState.set("__requestCorrelationWindow", {
      ...correlationWindow,
      networkEnd: browser.networkEntries().length,
    });
  }
  if (catalogObservation) {
    exactObserved = { ...observed, exactRuntimeOracle: catalogObservation };
    requestCorrelationEvidence = catalogObservation.responses
      ?.map(response => response.requestCorrelationEvidence)
      .find(Boolean) || null;
    const markerEvidenceCandidates = catalogObservation.dom
      ?.flatMap(dom => dom.semanticEvidence || [])
      .map(evidence => evidence.compositeEvidence)
      .filter(evidence => evidence?.markerFlow) || [];
    if (item.caseId === "EVT-004") {
      assert(requestCorrelationEvidence?.pass === true,
        `${item.caseId} marker evaluation preceded correlated response binding`);
      assert(markerEvidenceCandidates.length === 1,
        `${item.caseId} marker evaluator evidence count mismatch: ${markerEvidenceCandidates.length}`);
    }
    const eventDomSemanticEvidence = markerEvidenceCandidates[0] || null;
    if (eventDomSemanticEvidence) {
      runtimeState.set("__eventDomSemanticEvidence", structuredClone(eventDomSemanticEvidence));
      runtimeState.set("__markerEvidence",
        structuredClone(eventDomSemanticEvidence.markerFlow));
    }
    if (requestCorrelationEvidence) {
      runtimeState.set("__requestCorrelationEvidence", structuredClone(requestCorrelationEvidence));
    }
    if (catalogObservation.correlationScopeEvidence) {
      runtimeState.set("__requestCorrelationScopeEvidence",
        structuredClone(catalogObservation.correlationScopeEvidence));
    }
    if (catalogObservation.markerStageEvidence) {
      runtimeState.set("__markerStageEvidence",
        structuredClone(catalogObservation.markerStageEvidence));
    }
  }
  if (completion.request && !catalogObservation) {
    await browser.setCorrelationId(completion.correlationId);
    try {
      if (item.caseId === "SRC-031") {
        const sourceCountBefore = await browser.evaluate(`fetch('/ops/api/sources', {
          credentials: 'same-origin', cache: 'no-store'
        }).then(response => response.json()).then(payload => Array.isArray(payload.sources) ? payload.sources.length : -1)`);
        await browser.click("#add-channel");
        await browser.select('#channel-form [name="kind"]', "onvif");
        await browser.fill("#onvifProbeDraftInput",
          fs.readFileSync(path.join(rootDir, "test/fixtures/onvif_live_import_stub.json"), "utf8"));
        await browser.click("#onvifProbeDraftApply");
        await browser.waitForNetworkQuiet({
          correlationId: completion.correlationId,
          minimumObservationMs: 750,
          quietMs: 250,
        });
        const responses = browser.networkEntries().slice(networkStart).filter(entry =>
          entry.phase === "response" && entry.correlationId === completion.correlationId &&
          entry.method === "POST" && new URL(entry.url).pathname === "/ops/api/onvif/import-draft");
        assert(responses.length === 1 && completion.request.allowedStatuses.includes(responses[0].status),
          `${item.caseId} ONVIF import draft response binding mismatch`);
        const gate = responses[0].safeResponseBody?.credentialGate;
        assert(gate?.schema === "media-server.onvif-credential-binding-gate.v1" &&
          gate.requiredScope === "source:write" && gate.urlCredentialsRejected === true &&
          gate.secretMaterialStored === false,
        `${item.caseId} ONVIF credential gate boundary mismatch`);
        const sourceCountAfter = await browser.evaluate(`fetch('/ops/api/sources', {
          credentials: 'same-origin', cache: 'no-store'
        }).then(response => response.json()).then(payload => Array.isArray(payload.sources) ? payload.sources.length : -1)`);
        const gateStatus = await browser.snapshot("#onvifCredentialGateStatus");
        assert(sourceCountBefore >= 0 && sourceCountBefore === sourceCountAfter && gateStatus.visible &&
          gateStatus.text.includes(gate.primaryStoreProvider) &&
          gateStatus.text.includes(gate.primaryStoreDecision) &&
          gateStatus.text.includes(gate.credentialReferenceStatus),
        `${item.caseId} ONVIF import draft no-write DOM readback mismatch`);
        exactObserved = {
          exists: true,
          visible: true,
          sourceCountBefore,
          sourceCountAfter,
          gateStatus,
        };
      } else if (["RULE-001", "RULE-002", "RULE-003"].includes(item.caseId)) {
        const response = await browser.evaluate(`fetch(${JSON.stringify(completion.request.urlPath)}, {
          method: ${JSON.stringify(completion.request.method)},
          credentials: 'same-origin',
          cache: 'no-store'
        }).then(async response => ({ status: response.status, json: await response.json() }))`);
        assert(completion.request.allowedStatuses.includes(response.status),
          `${item.caseId} rule catalog request status mismatch: ${response.status}`);
        const collectionKey = ({
          "RULE-001": "vaRules",
          "RULE-002": "rules",
          "RULE-003": "profiles",
        })[item.caseId];
        const minimumCells = ({ "RULE-001": 9, "RULE-002": 6, "RULE-003": 7 })[item.caseId];
        let records = response.json?.[collectionKey];
        let effectiveCollectionKey = collectionKey;
        if (item.caseId === "RULE-003") {
          const profileCatalog = await browser.evaluate(`fetch('/lab/analysis/profiles', {
            credentials: 'same-origin', cache: 'no-store'
          }).then(async response => ({ status: response.status, json: await response.json() }))`);
          assert(profileCatalog.status === 200 && Array.isArray(profileCatalog.json?.builtInProfiles),
            `${item.caseId} built-in profile catalog readback is invalid`);
          records = [...profileCatalog.json.builtInProfiles, ...(Array.isArray(records) ? records : [])];
          effectiveCollectionKey = "builtInProfiles+profiles";
        }
        assert(Array.isArray(records) && records.length > 0,
          `${item.caseId} rule catalog ${effectiveCollectionKey} is empty or invalid`);
        const rendered = await browser.evaluate(`(() => {
          const row = document.querySelector(${JSON.stringify(snapshotSelector)});
          const body = row?.parentElement;
          return {
            rowCount: body ? body.querySelectorAll(':scope > tr').length : 0,
            cellCount: row ? row.querySelectorAll(':scope > td').length : 0,
            labels: row ? Array.from(row.querySelectorAll(':scope > td')).map(cell => cell.getAttribute('data-label') || '') : [],
            text: row ? row.textContent.trim() : '',
          };
        })()`);
        assert(rendered.rowCount === records.length && rendered.cellCount >= minimumCells && rendered.text,
          `${item.caseId} rendered rule catalog row/count/fields mismatch: ${JSON.stringify(rendered)}`);
        exactObserved = {
          exists: true,
          visible: true,
          collectionKey: effectiveCollectionKey,
          recordCount: records.length,
          rendered,
        };
      } else {
        const response = await browser.request({
          method: completion.request.method,
          urlPath: completion.request.urlPath,
          actionId: completion.actionId,
        });
        requestCorrelationEvidence = buildRequestCorrelationEvidence({
          entries: browser.networkEntries().slice(networkStart),
          actionId: completion.actionId,
          expected: {
            caseId: item.caseId,
            method: completion.request.method,
            urlPath: completion.request.urlPath,
            correlationId: completion.correlationId,
            correlationRequired: completion.request.correlationSource === "request-header",
            allowedStatuses: completion.request.allowedStatuses,
            requestKind: "application-fetch",
          },
          requestResult: response,
          listenerInstalledBeforeRequest: response.listenerInstalledBeforeRequest,
        });
        exactObserved = {
          ...exactObserved,
          requestCorrelationEvidence,
        };
        if (!requestCorrelationEvidence.pass) {
          const error = new Error(
            `${item.caseId} application fetch correlation failed: ${requestCorrelationEvidence.failureCode}`,
          );
          error.requestCorrelationEvidence = structuredClone(requestCorrelationEvidence);
          throw error;
        }
        assert(completion.request.allowedStatuses.includes(response.status),
          `${item.caseId} action request status mismatch: ${response.status}`);
      }
    } finally {
      await browser.setCorrelationId(`${item.caseId}:navigation`);
    }
  }
  const snapshot = await browser.snapshot(snapshotSelector);
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    observed: exactObserved,
    status: "PASS",
  };
  assert(!runtimeState.has("__pendingPrimaryCompletion"),
    `${item.caseId} multiple pending primary actions are forbidden`);
  runtimeState.set("__pendingPrimaryCompletion", {
    action,
    actionEvidence,
    before: snapshot,
    after: snapshot,
    networkResponses: browser.networkEntries().slice(networkStart),
    explicitObserved: exactObserved,
    requestCorrelationEvidence,
  });
  return { actionEvidence: { ...actionEvidence, completionStatus: "awaiting-independent-readback" }, completionOracle: null };
}

async function executeIndependentReadback(
  browser,
  item,
  action,
  runtimeState,
  caseRuntimeOwner,
  caseContext,
) {
  const pending = runtimeState.get("__pendingPrimaryCompletion");
  assert(pending, `${item.caseId} independent readback has no pending primary action`);
  assert(action.semanticCompletion.linkedPrimaryActionId === pending.actionEvidence.actionId,
    `${item.caseId} independent readback primary action link mismatch`);
  assert(action.expectedBehaviorSha256 === pending.actionEvidence.expectedBehaviorSha256 &&
    action.readbackIdentity === pending.actionEvidence.expectedReadbackIdentity,
  `${item.caseId} independent readback expected behavior/identity mismatch`);

  const postconditionSnapshots = {};
  for (const condition of pending.action.semanticCompletion.localTransition?.postconditions || []) {
    postconditionSnapshots[condition.selector] = await browser.snapshot(condition.selector);
  }
  const selector = pending.actionEvidence.executedControlSelector ||
    pending.actionEvidence.controlSelector || "body";
  const freshAfter = await browser.snapshot(selector);
  const runtimeMutationReadback = item.workflow.workflowClass === "persisted-mutation"
    ? await caseRuntimeOwner.verifyMutationReadback(item, caseContext)
    : null;
  const runtimeFormSubmitReadback = item.workflow.workflowClass === "form-submit"
    ? await caseRuntimeOwner.verifyFormSubmitReadback(item, caseContext, {
        action: pending.action,
        formResponseIdentity: pending.formResponseIdentity,
        browser,
        originalSessionCookie: pending.originalSessionCookie,
      })
    : null;
  const runtimeEndpointActionReadback = pending.action.kind === "execute-endpoint-action"
    ? await caseRuntimeOwner.verifyEndpointActionReadback(item, caseContext, {
        action: pending.action,
        endpointResponse: pending.endpointResponse,
        networkResponses: pending.networkResponses,
      })
    : null;
  const exactRuntimeReadback = item.workflow.inputs.some(input => input.kind === "exact-runtime-fixture")
    ? await caseRuntimeOwner.verifyExactRuntimeReadback(item, caseContext)
    : null;
  const catalogRuntimeReadback = !isExistingSpecializedExactOracle(item) &&
      !pending.explicitObserved?.exactRuntimeOracle
    ? await executeCatalogRuntimeOracleAtSourceRoute({
        browser,
        item,
        fixtureId: caseContext?.fixtureId || exactFixtureId(item),
        bindings: exactOracleBindings(caseRuntimeOwner, caseContext),
        actionId: pending.action.semanticCompletion.actionId,
        correlationId: pending.action.semanticCompletion.correlationId,
        catalogBindings: caseContext?.catalogBindings || null,
        beforeScreenNavigation: item.caseId === "EVT-004"
          ? () => caseRuntimeOwner.refreshDiagnosticMarkerForDashboard(item, caseContext)
          : null,
        primaryAction: item.workflow.workflowClass === "actionable"
          ? pending.actionEvidence
          : null,
        primaryNetworkEntries: pending.networkResponses,
      })
    : null;
  let rejectedActionReadback = item.workflow.inputs.some(input => input.kind === "rejected-endpoint-fixture")
    ? await caseRuntimeOwner.verifyRejectedActionReadback(item, caseContext)
    : null;
  if (item.caseId === "RULE-097" && rejectedActionReadback) {
    const domScopeReadback = await browser.evaluate(({ assignedViewId, blockedViewId, disallowedRuleId }) => {
      const assigned = document.querySelectorAll(`[data-source-view="${CSS.escape(assignedViewId)}"]`);
      const blocked = document.querySelectorAll(`[data-source-view="${CSS.escape(blockedViewId)}"]`);
      const text = String(document.body?.innerText || "");
      return {
        assignedSourceNodeCount: assigned.length,
        blockedSourceNodeCount: blocked.length,
        blockedViewTextAbsent: !text.includes(blockedViewId),
        disallowedRuleTextAbsent: !text.includes(disallowedRuleId),
      };
    }, rejectedActionReadback);
    assert(domScopeReadback.assignedSourceNodeCount === 1 &&
      domScopeReadback.blockedSourceNodeCount === 0 &&
      domScopeReadback.blockedViewTextAbsent === true &&
      domScopeReadback.disallowedRuleTextAbsent === true,
    `${item.caseId} scoped viewer /client/live DOM boundary mismatch`);
    rejectedActionReadback = { ...rejectedActionReadback, domScopeReadback };
  }
  const explicitObserved = runtimeFormSubmitReadback ||
    (Object.keys(postconditionSnapshots).length > 0 || runtimeMutationReadback || runtimeEndpointActionReadback || rejectedActionReadback || exactRuntimeReadback || catalogRuntimeReadback
    ? {
        beforeSnapshots: pending.beforePostconditionSnapshots || {},
        snapshots: postconditionSnapshots,
        ...(runtimeMutationReadback ? {
          persistedMutationObserved: runtimeMutationReadback.persistedMutationObserved,
          runtimeMutationReadback,
        } : {}),
        ...(runtimeEndpointActionReadback ? { runtimeEndpointActionReadback } : {}),
        ...(rejectedActionReadback ? { rejectedActionReadback } : {}),
        ...(exactRuntimeReadback ? { exactRuntimeReadback } : {}),
        ...(catalogRuntimeReadback ? { exactRuntimeOracle: catalogRuntimeReadback } : {}),
      }
    : (pending.explicitObserved || null));
  const semanticReadback = runtimeEndpointActionReadback
    ? buildEndpointActionSemanticReadback({
        action: pending.action,
        actionEvidence: pending.actionEvidence,
        runtimeReadback: runtimeEndpointActionReadback,
        networkResponses: pending.networkResponses,
      })
    : semanticReadbackEvidence(
        pending.action,
        pending.actionEvidence,
        pending.before,
        freshAfter,
        explicitObserved,
      );
  const completionOracle = evaluateCompletionOracle({
    action: pending.actionEvidence,
    before: pending.before,
    after: pending.after,
    navigation: browser.navigation,
    networkResponses: pending.networkResponses,
    semanticReadback,
    runtimeMutationReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  if (!completionOracle.pass) {
    const error = new Error(
      `${item.caseId} independent readback failed for ${pending.action.kind}: ${completionOracle.reason}`,
    );
    if (pending.requestCorrelationEvidence) {
      error.requestCorrelationEvidence = structuredClone(pending.requestCorrelationEvidence);
    }
    throw error;
  }
  runtimeState.delete("__pendingPrimaryCompletion");
  runtimeState.set("__completedPrimaryReadback", {
    actionId: completionOracle.actionId,
    correlationId: completionOracle.correlationId,
    expectedBehaviorSha256: pending.actionEvidence.expectedBehaviorSha256,
    readbackIdentity: pending.actionEvidence.expectedReadbackIdentity,
    semanticReadback,
  });
  return {
    actionEvidence: {
      ...action,
      completionPhase: "independent-readback",
      linkedPrimaryActionId: pending.actionEvidence.actionId,
      expectedBehaviorSha256: action.expectedBehaviorSha256,
      readbackIdentity: action.readbackIdentity,
      semanticReadback,
      runtimeMutationReadback,
      runtimeFormSubmitReadback,
      runtimeEndpointActionReadback,
      rejectedActionReadback,
      evidenceStages: rejectedActionReadback ? {
        domValidationMatrix: {
          beforeSnapshots: structuredClone(pending.beforePostconditionSnapshots || {}),
          snapshots: structuredClone(postconditionSnapshots),
        },
        independentProductReadback: structuredClone(rejectedActionReadback),
      } : null,
      status: "PASS",
    },
    completionOracle,
    rawPrimaryObservation: makeRawPrimaryObservation({
      actionEvidence: pending.actionEvidence,
      before: pending.before,
      after: pending.after,
      networkEntries: pending.networkResponses,
      semanticReadback,
    }),
  };
}

function exactFixtureId(item) {
  return (item.workflow.setup || []).find(setup => setup.kind === "seed-reviewed-state")?.fixtureId ||
    `${item.caseId.toLowerCase()}-fixture`;
}

function exactOracleBindings(caseRuntimeOwner, caseContext) {
  const relationship = caseContext?.relationshipFixture || {};
  const catalog = caseContext?.catalogBindings || {};
  const defaultViewId = caseRuntimeOwner?.descriptor?.auth?.defaultViewId || "9001";
  return {
    assignedViewId: relationship.viewId || defaultViewId,
    blockedViewId: relationship.blockedView?.viewId || "99002",
    viewId: catalog.viewId || relationship.viewId || defaultViewId,
    sourceId: catalog.sourceId || relationship.sourceId || defaultViewId,
    ruleId: relationship.vaRuleId || "1",
    candidateId: catalog.candidateId || caseContext?.fixtureId || "",
    eventId: catalog.eventId || caseContext?.fixtureId || "",
    searchQuery: catalog.searchQuery || caseContext?.fixtureId || "",
    sessionId: catalog.sessionId || "",
    vaMetadataSampleId: catalog.vaMetadataSampleId || "",
    runtimeTrendBaseline: catalog.runtimeTrendBaseline || null,
    logMarker: catalog.logMarker || "",
    redactionCanary: catalog.redactionCanary || "",
  };
}

async function executeWorkflowCleanup(browser, item, runtimeState, caseRuntimeOwner, caseContext, trace) {
  let mutationCleanupOwned = false;
  for (const cleanup of item.workflow.cleanup) {
    if (cleanup.kind === "restore-local-control") {
      const state = runtimeState.get(cleanup.selector);
      assert(state, `${item.caseId} local cleanup snapshot missing`);
      if (state.kind === "select-control") {
        await browser.select(cleanup.selector, state.snapshot.selectedValues[0] || "");
      } else if (state.kind === "fill-control") {
        await browser.fill(cleanup.selector, state.snapshot.value);
      } else if (state.kind === "toggle-checkbox") {
        const current = await browser.snapshot(cleanup.selector);
        if (current.checked !== state.snapshot.checked) await browser.click(cleanup.selector);
      } else if (state.kind === "toggle-details") {
        const current = await browser.snapshot(cleanup.selector);
        if (current.open !== state.snapshot.open) await browser.click(`${cleanup.selector} > summary`);
      } else {
        throw new Error(`${item.caseId} local cleanup inverse adapter is unavailable for ${state.kind}`);
      }
    } else if (cleanup.kind === "reset-local-ui-route") {
      assert(cleanup.route === item.workflow.primaryControl.route,
        `${item.caseId} local UI reset route drift`);
      const observed = await browser.navigate(cleanup.route);
      assert(observed.status === 200, `${item.caseId} local UI reset route status mismatch: ${observed.status}`);
    } else if (cleanup.kind === "no-op-cleanup") {
      assert(cleanup.persistedMutation === false, `${item.caseId} no-op cleanup mutation flag drift`);
      assert(!item.workflow.controlSequence.some(action =>
        ["submit-form", "execute-persisted-action"].includes(action.kind)),
      `${item.caseId} no-op cleanup cannot cover a persisted action`);
    } else if (["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind)) {
      assert(cleanup.beforeSnapshotRef && cleanup.inverseAction && cleanup.afterReadback?.identity,
        `${item.caseId} mutation cleanup contract incomplete`);
      assert(!mutationCleanupOwned, `${item.caseId} duplicate mutation cleanup owner invocation`);
      const cleanupResults = await caseRuntimeOwner.restoreCase(item, caseContext, browser);
      trace.cleanup.push(...cleanupResults.map(result => ({ ...result, status: "PASS" })));
      runtimeState.set("__caseRuntimeRestored", true);
      mutationCleanupOwned = true;
      continue;
    } else {
      throw new Error(`${item.caseId} unsupported cleanup kind: ${cleanup.kind}`);
    }
    trace.cleanup.push({ ...cleanup, status: "PASS" });
  }
  if (!mutationCleanupOwned) {
    const cleanupResults = await caseRuntimeOwner.restoreCase(item, caseContext, browser);
    trace.cleanup.push(...cleanupResults.map(result => ({ ...result, status: "PASS" })));
    runtimeState.set("__caseRuntimeRestored", true);
  }
}

async function executeCaseNativeNavigation(browser, item, action) {
  const before = await browser.snapshot("body");
  const networkStart = browser.networkEntries().length;
  const navigationBinding = action.semanticCompletion.navigationBinding;
  await browser.setCorrelationId("");
  const observed = await browser.navigate(action.route, {
    invocationId: navigationBinding.invocationId,
    kind: "setup-document-navigation",
  });
  const allowedStatuses = navigationBinding.allowedStatuses;
  assert(allowedStatuses.includes(observed.status),
    `${item.caseId} action-route navigation status ${observed.status} not in ${allowedStatuses.join(",")}`);
  const after = await browser.snapshot("body");
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    executedKind: "navigate",
    before,
    after,
    observed,
    status: "PASS",
  };
  const semanticReadback = semanticReadbackEvidence(action, actionEvidence, before, after, {
    route: new URL(observed.url, "http://127.0.0.1").pathname,
    exists: after.exists === true,
    visible: after.visible === true,
  });
  const networkEntries = browser.networkEntries().slice(networkStart);
  const completionOracle = evaluateCompletionOracle({
    action: actionEvidence,
    before,
    after,
    navigation: observed,
    allowedStatuses,
    networkResponses: networkEntries,
    semanticReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  assert(completionOracle.pass,
    `${item.caseId} navigate-action-route completion failed: ${completionOracle.reason}`);
  return {
    actionEvidence: { ...actionEvidence, semanticReadback },
    completionOracle,
    rawPrimaryObservation: makeRawPrimaryObservation({
      actionEvidence,
      before,
      after,
      navigation: observed,
      networkEntries,
      semanticReadback,
    }),
  };
}

function makeRawPrimaryObservation({
  actionEvidence,
  before = null,
  after = null,
  navigation = null,
  networkEntries = [],
  semanticReadback = null,
}) {
  return {
    schema: "media-server.v390-ui-raw-primary-observation.v1",
    action: {
      actionId: actionEvidence.actionId,
      actionKind: actionEvidence.actionKind || actionEvidence.kind,
      executedKind: actionEvidence.executedKind || actionEvidence.kind,
      controlSelector: actionEvidence.controlSelector ?? null,
      correlationId: actionEvidence.correlationId,
      dispatch: actionEvidence.dispatch,
    },
    before: before ? structuredClone(before) : null,
    after: after ? structuredClone(after) : null,
    navigation: navigation ? structuredClone(navigation) : null,
    networkEntries: structuredClone(networkEntries),
    semanticReadback: semanticReadback ? structuredClone(semanticReadback) : null,
  };
}

function semanticCompletionAction(action, item) {
  const completion = action.semanticCompletion;
  assert(completion?.schema === "media-server.v390-ui-action-completion.v2",
    `${item.caseId} action semantic completion missing: ${action.kind}`);
  return {
    ...action,
    kind: completion.requiredSource === "negative-route-status" ? "navigate-negative" : action.kind,
    executed: true,
    correlationId: completion.correlationId,
    dispatch: "playwright-native",
    completionPhase: completion.phase,
    actionId: completion.actionId,
    controlSelector: completion.controlSelector,
    semanticCompletionRequired: true,
    expectedReadbackIdentity: completion.readback.identity,
    expectedBehaviorSha256: completion.expectedBehaviorSha256,
    expectedReadbackExpectation: structuredClone(completion.readbackExpectation),
    expectedEndpoint: completion.request ? {
      correlationId: completion.request.correlationId,
      method: completion.request.method,
      urlPath: completion.request.urlPath,
      urlPathTemplate: completion.request.urlPathTemplate,
      allowedStatuses: [...completion.request.allowedStatuses],
    } : null,
    expectedLocalTransition: completion.localTransition ? structuredClone(completion.localTransition) : null,
    expectedNavigationBinding: completion.navigationBinding
      ? structuredClone(completion.navigationBinding)
      : null,
    allowedCompletionSources: [...new Set([
      completion.requiredSource,
      ...completion.attestedAlternatives,
    ])],
  };
}

function semanticReadbackEvidence(action, actionEvidence, before, after, explicitObserved = null) {
  const expected = structuredClone(action.semanticCompletion.readbackExpectation);
  if (action.semanticCompletion.phase === "primary-action") {
    const runtimeFormReadback = explicitObserved?.schema ===
      "media-server.v390-ui-runtime-form-submit-readback.v1";
    const observation = runtimeFormReadback ? {
      actual: structuredClone(explicitObserved),
    } : {
      before: before ? structuredClone(before) : null,
      after: after ? structuredClone(after) : null,
      ...(explicitObserved?.snapshots ? {
        beforeSnapshots: structuredClone(explicitObserved.beforeSnapshots || {}),
        snapshots: structuredClone(explicitObserved.snapshots),
      } : {}),
      ...(explicitObserved?.runtimeMutationReadback ? {
        runtimeMutationReadback: structuredClone(explicitObserved.runtimeMutationReadback),
      } : {}),
      ...(explicitObserved?.rejectedActionReadback ? {
        rejectedActionReadback: structuredClone(explicitObserved.rejectedActionReadback),
      } : {}),
      ...(explicitObserved === null || explicitObserved?.snapshots
        ? {}
        : { actual: structuredClone(explicitObserved) }),
    };
    return {
      schema: "media-server.v390-ui-semantic-readback.v2",
      identity: action.semanticCompletion.readbackIdentity,
      correlationId: actionEvidence.correlationId,
      actionId: actionEvidence.actionId,
      expectedBehaviorSha256: action.semanticCompletion.expectedBehaviorSha256,
      observationSource: runtimeFormReadback
        ? "readback-request"
        : "browser-dom",
      selector: actionEvidence.controlSelector,
      observation,
      observationSha256: domSnapshotDigest(observation),
    };
  }
  return {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: action.semanticCompletion.readbackIdentity,
    correlationId: actionEvidence.correlationId,
    actionId: actionEvidence.actionId,
    observationSource: "browser-dom",
    selector: actionEvidence.controlSelector,
    expected,
    observed: observeSemanticExpectation(expected, before, after, explicitObserved),
  };
}

function observeSemanticExpectation(expected, before, after, explicitObserved) {
  if (expected.changedProperty) {
    return {
      changedProperty: expected.changedProperty,
      changed: before?.[expected.changedProperty] !== after?.[expected.changedProperty],
    };
  }
  if (expected.property) {
    return { property: expected.property, value: structuredClone(after?.[expected.property]) };
  }
  if (expected.hrefKind) {
    return {
      tag: after?.tag || explicitObserved?.tag || "",
      hrefKind: String(after?.href || explicitObserved?.href || "").startsWith("/") ? "same-origin-path" : "other",
    };
  }
  if (expected.minimumNonEmptyOptions !== undefined) {
    const count = Number(explicitObserved?.nonEmptyOptionCount || after?.optionValues?.filter(Boolean).length || 0);
    return {
      tag: after?.tag || explicitObserved?.tag || "",
      minimumNonEmptyOptions: count >= expected.minimumNonEmptyOptions
        ? expected.minimumNonEmptyOptions
        : count,
    };
  }
  const source = explicitObserved || after || {};
  const observed = {};
  for (const key of Object.keys(expected)) observed[key] = structuredClone(source[key]);
  return observed;
}

function assertCompletionEvidence(value, caseId) {
  assert(typeof value?.beforeDigest === "string", `${caseId} completion beforeDigest missing`);
  assert(typeof value?.afterDigest === "string", `${caseId} completion afterDigest missing`);
  assert(Array.isArray(value?.networkResponses), `${caseId} completion networkResponses missing`);
}

function validateRunnerWorkflowCompatibility(cases) {
  const setupKinds = new Set();
  const actionKinds = new Set();
  const cleanupKinds = new Set();
  for (const item of cases) {
    const workflow = item.workflow;
    assert(workflow?.schema === runnerWorkflowSchema,
      `${item.caseId} runner workflow schema unsupported: ${workflow?.schema || "missing"}`);
    assert(Array.isArray(workflow.setup) && Array.isArray(workflow.inputs) &&
      Array.isArray(workflow.controlSequence) && Array.isArray(workflow.cleanup),
    `${item.caseId} runner workflow sections missing`);
    assert(workflow.controlSequence[0]?.kind === "navigate",
      `${item.caseId} runner requires navigate as the first action`);
    assert(JSON.stringify(item.actions) === JSON.stringify(workflow.controlSequence),
      `${item.caseId} runner action/workflow drift`);

    for (const setup of workflow.setup) {
      assert(supportedSetupKinds.includes(setup.kind),
        `${item.caseId} runner unsupported setup kind: ${setup.kind}`);
      setupKinds.add(setup.kind);
      if (setup.kind === "bind-role-session") {
        assert(setup.accountRole === item.accountRole && typeof setup.required === "boolean",
          `${item.caseId} bind-role-session shape invalid`);
      } else if (setup.kind === "bind-action-role-session") {
        assert(setup.accountRole && setup.route && setup.required === true,
          `${item.caseId} bind-action-role-session shape invalid`);
      } else {
        assert(setup.fixtureId && /^[a-f0-9]{64}$/.test(setup.semanticCallChainSha256 || "") &&
          typeof setup.persistedMutation === "boolean",
        `${item.caseId} seed-reviewed-state shape invalid`);
        if (setup.persistedMutation) {
          assert(setup.beforeSnapshotRef,
            `${item.caseId} persisted seed beforeSnapshotRef missing`);
        }
      }
    }

    for (let index = 0; index < workflow.controlSequence.length; index += 1) {
      const action = workflow.controlSequence[index];
      assert(supportedActionKinds.includes(action.kind),
        `${item.caseId} runner unsupported action kind: ${action.kind}`);
      assert(action.dispatch === "playwright-native",
        `${item.caseId} runner action dispatch invalid: ${action.kind}`);
      actionKinds.add(action.kind);
      if (action.kind === "navigate") {
        assert(index === 0 && action.route, `${item.caseId} navigate action position/route invalid`);
      } else if (["navigate-action-route", "navigate-negative"].includes(action.kind)) {
        assert(action.route, `${item.caseId} ${action.kind} route missing`);
      } else if ([
        "activate-control", "assert-disabled-control", "assert-hidden-control",
        "assert-visible-read-model", "execute-persisted-action", "fill-control",
        "select-control", "toggle-checkbox", "toggle-details", "wait-visible",
      ].includes(action.kind)) {
        assert(action.selector, `${item.caseId} ${action.kind} selector missing`);
      }
      if (action.kind === "execute-endpoint-action") {
        assert(action.inputId && action.ownership === "product-endpoint-no-primary-control" &&
          action.endpoint?.method && action.endpoint?.path &&
          Array.isArray(action.endpoint?.allowedStatuses) && action.endpoint.allowedStatuses.length > 0,
        `${item.caseId} execute-endpoint-action shape invalid`);
        assert(workflow.primaryControl.applicability === "not-applicable",
          `${item.caseId} endpoint-owned action must not claim a direct primary control`);
      }
      if (action.kind === "submit-form") {
        assert(action.selector && action.submitSelector && action.inputId && Array.isArray(action.fields),
          `${item.caseId} submit-form shape invalid`);
        assert(action.uiLifecycle?.schema === "media-server.v390-ui-form-lifecycle.v1" &&
          action.uiLifecycle.adapter && action.uiLifecycle.formSelector === action.selector &&
          action.uiLifecycle.submitSelector === action.submitSelector &&
          Array.isArray(action.uiLifecycle.fieldControls) &&
          action.uiLifecycle.fieldControls.length === action.fields.length &&
          action.uiLifecycle.fieldControls.every((field, fieldIndex) =>
            field.name === action.fields[fieldIndex] &&
            ["fill", "select", "check", "hidden-binding", "readonly-value"].includes(field.control)) &&
          Array.isArray(action.uiLifecycle.requiredPhases) && action.uiLifecycle.requiredPhases.length === 5,
        `${item.caseId} submit-form typed lifecycle shape invalid`);
      }
      if (action.kind === "execute-persisted-action") {
        assert(action.inputId && Boolean(action.endpoint) !== Boolean(action.localAction),
          `${item.caseId} execute-persisted-action shape invalid`);
        assert(action.uiLifecycle?.schema === "media-server.v390-ui-persisted-lifecycle.v1" &&
          action.uiLifecycle.adapter && action.uiLifecycle.fixtureBinding?.fixtureId &&
          Array.isArray(action.uiLifecycle.requiredPhases) && action.uiLifecycle.requiredPhases.length === 5,
        `${item.caseId} execute-persisted-action lifecycle shape invalid`);
        if (action.uiLifecycle.adapter === "channel-source-view-pair") {
          assert(["atomic-pair", "ordered-source-view-pair"].includes(action.uiLifecycle.requestBinding?.mode) &&
            Array.isArray(action.uiLifecycle.requestBinding.expectedRequests),
          `${item.caseId} channel request transaction binding missing`);
        }
      }
      if (["assert-product-state", "assert-product-boundary", "verify-independent-readback"].includes(action.kind)) {
        assert(workflow.independentReadback?.identity && workflow.independentReadback?.locator?.file,
          `${item.caseId} ${action.kind} independent readback metadata missing`);
      }
    }

    for (const cleanup of workflow.cleanup) {
      assert(supportedCleanupKinds.includes(cleanup.kind),
        `${item.caseId} runner unsupported cleanup kind: ${cleanup.kind}`);
      cleanupKinds.add(cleanup.kind);
      if (cleanup.kind === "restore-local-control") {
        assert(cleanup.selector, `${item.caseId} restore-local-control selector missing`);
      } else if (cleanup.kind === "reset-local-ui-route") {
        assert(cleanup.route === workflow.primaryControl.route,
          `${item.caseId} reset-local-ui-route must target the primary product route`);
      } else if (cleanup.kind === "no-op-cleanup") {
        assert(cleanup.persistedMutation === false,
          `${item.caseId} no-op-cleanup mutation flag invalid`);
      } else {
        const inverseCount = cleanup.inverseAction?.endpoint ? 1 : 0;
        const inverseLocalCount = cleanup.inverseAction?.localAction ? 1 : 0;
        assert(cleanup.beforeSnapshotRef && inverseCount + inverseLocalCount === 1 &&
          cleanup.afterReadback?.identity && cleanup.readback?.identity,
        `${item.caseId} mutation cleanup shape invalid`);
      }
    }
  }
  return {
    schema: runnerWorkflowSchema,
    validatedCases: cases.length,
    encounteredSetupKinds: [...setupKinds].sort(),
    encounteredActionKinds: [...actionKinds].sort(),
    encounteredCleanupKinds: [...cleanupKinds].sort(),
    supportedSetupKinds: [...supportedSetupKinds],
    supportedActionKinds: [...supportedActionKinds],
    supportedCleanupKinds: [...supportedCleanupKinds],
    actualRuntimeBoundary: "self-contained seed/session/secret/readback/cleanup owners are required for mutation cases; plan-only is not execution evidence",
  };
}

function workflowInput(item, inputId, expectedKind) {
  const input = item.workflow.inputs.find(candidate => candidate.inputId === inputId);
  assert(input, `${item.caseId} workflow input missing: ${inputId}`);
  assert(input.kind === expectedKind,
    `${item.caseId} workflow input kind mismatch: ${input.kind}/${expectedKind}`);
  return input;
}

function resolveRuntimeInputValue(value, item, field, caseRuntimeOwner, caseContext) {
  if (value && typeof value === "object" && value.secretRef) {
    return caseRuntimeOwner.resolveSecretRef(value.secretRef, { item, field, caseContext });
  }
  assert(["string", "number", "boolean"].includes(typeof value),
    `${item.caseId} runtime form value missing for ${field}`);
  return String(value);
}

function resolveRoleState(role, roleStateMap) {
  if (role === "anonymous") return "";
  const candidate = roleStateMap[role];
  assert(candidate, `role state missing for ${role}`);
  const resolved = resolveRootOrAbsolute(candidate);
  assert(fs.existsSync(resolved), `role state file missing for ${role}: ${resolved}`);
  return resolved;
}

function loadRoleStateMap(relativePath) {
  assert(relativePath, "--role-state-map is required for actual execution");
  const value = readJson(relativePath);
  assert(value.schema === "media-server.v390-ui-role-state-map.v1", "unexpected role state map schema");
  return value.roles || {};
}

function makeNotRun(item, reason) {
  return { caseId: item.caseId, featureId: item.featureId, status: "not-run", reason };
}

function selectDiagnosticCase(cases, caseId, selectionMode) {
  assert(caseId, "--diagnostic-case-id is required with --diagnostic-child");
  assert(["fixed-remaining-sweep", "explicit-positive-case"].includes(selectionMode),
    "unsupported diagnostic child selection mode");
  if (selectionMode === "explicit-positive-case") {
    const matches = cases.filter(item => item.caseId === caseId);
    assert(matches.length === 1, `diagnostic explicit case ID is unknown or duplicated: ${caseId}`);
    const [item] = matches;
    assert(item.disposition === "native-executable",
      `diagnostic explicit case must be a positive native-executable case: ${caseId}`);
    return diagnosticSingleCaseSelection(item, selectionMode);
  }
  const firstIndex = cases.findIndex(item => item.caseId === "RULE-097");
  assert(firstIndex >= 0, "RULE-097 diagnostic start case is missing from the canonical manifest");
  const selected = cases.slice(firstIndex);
  assert(selected.length === 144,
    `RULE-097 diagnostic selection must contain 144 cases: ${selected.length}`);
  const item = selected.find(candidate => candidate.caseId === caseId);
  assert(item, `diagnostic case is outside the fixed RULE-097 selection: ${caseId}`);
  return diagnosticSingleCaseSelection(item, selectionMode);
}

function diagnosticSingleCaseSelection(item, mode) {
  return {
    item,
    startCaseId: item.caseId,
    endCaseId: item.caseId,
    selectedIds: [item.caseId],
    targetCaseCount: 1,
    targetCaseIdsSha256: sha256Text(item.caseId),
    mode,
  };
}

function assertDiagnosticChildOutputRoot(candidate) {
  const requiredRoot = path.resolve(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  const relative = path.relative(requiredRoot, candidate);
  assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    "diagnostic child output must be inside .media_server.test/v3.9.0/ui-diagnostic-sweep");
}

function createDiagnosticChildSummary({
  result,
  executionStatus,
  item,
  resultItem = null,
  environmentContamination,
  caseRuntimeSecretArtifactIntegrity,
}) {
  return {
    schema: "media-server.v390-ui-diagnostic-child.v1",
    result,
    executionStatus,
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible",
    uiFulltestPass: false,
    actualBrowserExecution: resultItem?.actualBrowserExecution === true,
    sourceBinding: diagnosticChildSourceBinding(item.caseId),
    selection: {
      startCaseId: item.caseId,
      endCaseId: item.caseId,
      selectedIds: [item.caseId],
      targetCaseCount: 1,
      targetCaseIdsSha256: sha256Text(item.caseId),
      caseId: item.caseId,
      automaticRetryCount: 0,
      mode: options.diagnosticSelectionMode,
    },
    counts: {
      target: 1,
      attempted: resultItem ? 1 : 0,
      pass: resultItem?.status === "PASS" ? 1 : 0,
      fail: resultItem?.status === "FAIL" ? 1 : 0,
      notRun: resultItem ? 0 : 1,
    },
    case: resultItem ? {
      caseId: resultItem.caseId,
      featureId: resultItem.featureId,
      status: resultItem.status,
      failureClass: resultItem.status === "FAIL" ? resultItem.reason : "",
      failureDetail: resultItem.status === "FAIL" ? resultItem.failureDetail || "" : "",
      actualBrowserExecution: resultItem.actualBrowserExecution === true,
      failureProvenance: resultItem.failureProvenance || null,
      primaryFailureEvidence: resultItem.primaryFailureEvidence || null,
      requested: resultItem.requested || null,
      observed: resultItem.observed || null,
      eventDomSemanticEvidence: resultItem.eventDomSemanticEvidence || null,
      requestCorrelationEvidence: resultItem.requestCorrelationEvidence || null,
      requestCorrelationScopeEvidence: resultItem.requestCorrelationScopeEvidence || null,
      navigationLifecycleEvidence: resultItem.navigationLifecycleEvidence || null,
      markerStageEvidence: resultItem.markerStageEvidence || null,
      markerEvidence: resultItem.markerEvidence || null,
      markerEvidenceLifecycle: resultItem.markerEvidenceLifecycle || null,
      cleanupAttestation: resultItem.cleanupAttestation || null,
      failureLifecycleEvidence:
        serializeFailureLifecycleEvidence(resultItem),
      eventReviewSeedWriteEvidence:
        resultItem.eventReviewSeedWriteEvidence || null,
      diagnosticArtifacts: resultItem.diagnosticArtifacts || {},
    } : {
      caseId: item.caseId,
      featureId: item.featureId,
      status: "not-run",
      failureClass: "",
      failureDetail: "",
      actualBrowserExecution: false,
      requested: null,
      observed: null,
      eventDomSemanticEvidence: null,
      requestCorrelationEvidence: null,
      requestCorrelationScopeEvidence: null,
      navigationLifecycleEvidence: null,
      markerStageEvidence: null,
      markerEvidence: null,
      markerEvidenceLifecycle: null,
      failureProvenance: null,
      cleanupAttestation: null,
      failureLifecycleEvidence:
        serializeFailureLifecycleEvidence({}),
      diagnosticArtifacts: {},
    },
    environmentContamination: {
      detected: environmentContamination === true,
      cleanupFailure: resultItem?.cleanupFailure === true,
      browserCloseFailure: resultItem?.browserCloseFailure === true,
      recycleRequired: environmentContamination === true,
    },
    caseRuntimeSecretArtifactIntegrity,
  };
}

function createDiagnosticPreExecutionSummary(caseId, phase) {
  return {
    schema: "media-server.v390-ui-diagnostic-child.v1",
    result: "FAIL",
    executionStatus: "diagnostic-child-pre-execution-failure",
    diagnosticOnly: true,
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible",
    uiFulltestPass: false,
    actualBrowserExecution: false,
    sourceBinding: diagnosticChildSourceBinding(caseId),
    selection: {
      startCaseId: caseId,
      endCaseId: caseId,
      selectedIds: [caseId],
      targetCaseCount: 1,
      targetCaseIdsSha256: sha256Text(caseId),
      caseId,
      automaticRetryCount: 0,
      mode: options.diagnosticSelectionMode,
    },
    counts: { target: 1, attempted: 0, pass: 0, fail: 0, notRun: 1 },
    case: {
      caseId,
      featureId: "",
      status: "not-run",
      failureClass: "diagnostic-pre-execution-failed",
      failureDetail: "",
      actualBrowserExecution: false,
      requested: null,
      observed: null,
      eventDomSemanticEvidence: null,
      requestCorrelationEvidence: null,
      requestCorrelationScopeEvidence: null,
      navigationLifecycleEvidence: null,
      markerStageEvidence: null,
      markerEvidence: null,
      markerEvidenceLifecycle: null,
      cleanupAttestation: null,
      diagnosticArtifacts: {},
    },
    environmentContamination: {
      detected: true,
      cleanupFailure: false,
      browserCloseFailure: false,
      recycleRequired: true,
      phase,
    },
    caseRuntimeSecretArtifactIntegrity: { status: "not-run" },
  };
}

function validateDiagnosticChildSummary(summary, item) {
  const errors = [];
  if (summary?.schema !== "media-server.v390-ui-diagnostic-child.v1") errors.push("diagnostic-child-schema");
  if (summary?.diagnosticOnly !== true) errors.push("diagnostic-child-not-diagnostic");
  if (summary?.releaseEvidenceEligible !== false) errors.push("diagnostic-child-release-evidence");
  if (summary?.policyV4Qualification !== "not-eligible") errors.push("diagnostic-child-policy-qualification");
  if (summary?.uiFulltestPass !== false) errors.push("diagnostic-child-ui-fulltest");
  const expectedSourceBinding = diagnosticChildSourceBinding(item.caseId);
  for (const field of [
    "gitCommit",
    "manifestSha256",
    "runId",
    "caseId",
    "caseIdsSha256",
    "selectionMode",
  ]) {
    if (summary?.sourceBinding?.[field] !== expectedSourceBinding[field]) {
      errors.push(`diagnostic-child-source-binding-${field}`);
    }
  }
  if (summary?.selection?.caseId !== item.caseId ||
      summary?.selection?.startCaseId !== item.caseId ||
      summary?.selection?.endCaseId !== item.caseId ||
      JSON.stringify(summary?.selection?.selectedIds) !== JSON.stringify([item.caseId]) ||
      summary?.selection?.targetCaseCount !== 1 ||
      summary?.selection?.automaticRetryCount !== 0 ||
      summary?.selection?.mode !== options.diagnosticSelectionMode) {
    errors.push("diagnostic-child-selection");
  }
  if (summary?.counts?.target !== 1 ||
      Number(summary?.counts?.attempted || 0) !== Number(summary?.counts?.pass || 0) + Number(summary?.counts?.fail || 0)) {
    errors.push("diagnostic-child-count-invariant");
  }
  if (summary?.case?.caseId !== item.caseId) errors.push("diagnostic-child-case-id");
  if (summary?.case?.actualBrowserExecution !== Boolean(summary?.counts?.attempted)) {
    errors.push("diagnostic-child-browser-execution");
  }
  if (summary?.actualBrowserExecution !== summary?.case?.actualBrowserExecution) {
    errors.push("diagnostic-child-browser-execution-summary");
  }
  if (summary?.case?.eventDomSemanticEvidence) {
    const evidence = summary.case.eventDomSemanticEvidence;
    if (evidence.schema !== "media-server.v390-ui-event-dom-semantic-composite-evidence.v1" ||
        evidence.actualBrowserExecution !== true ||
        typeof evidence.observationPresent?.pass !== "boolean" ||
        typeof evidence.responseBaselineMatched?.pass !== "boolean" ||
        !Array.isArray(evidence.responseBaselineMatched?.mismatchPaths) ||
        typeof evidence.fixtureObserved?.pass !== "boolean") {
      errors.push("diagnostic-child-event-dom-semantic-evidence");
    }
  }
  if (summary?.case?.requestCorrelationEvidence) {
    const evidence = summary.case.requestCorrelationEvidence;
    if (evidence.schema !== "media-server.v390-ui-request-correlation-evidence.v1" ||
        typeof evidence.pass !== "boolean" ||
        evidence.requestKind !== "application-fetch" ||
        typeof evidence.listenerInstalledBeforeRequest !== "boolean" ||
        typeof evidence.correlationRequired !== "boolean" ||
        typeof evidence.correlationGenerated !== "boolean" ||
        typeof evidence.correlationAttached !== "boolean" ||
        typeof evidence.correlationObserved !== "boolean" ||
        typeof evidence.correlationMatched !== "boolean" ||
        typeof evidence.expectedCorrelationDigest !== "string" ||
        typeof evidence.initiatingRequestCorrelationDigest !== "string" ||
        typeof evidence.responseRequestCorrelationDigest !== "string" ||
        typeof evidence.caseRequestIdentity !== "string" ||
        !(evidence.caseRequestSequence === null ||
          Number.isInteger(evidence.caseRequestSequence)) ||
        typeof evidence.responseRequestObjectObserved !== "boolean" ||
        typeof evidence.responseRequestMethod !== "string" ||
        typeof evidence.responseRequestPath !== "string" ||
        typeof evidence.responseRequestHeaderDigest !== "string" ||
        !Number.isInteger(evidence.responseStatus) ||
        typeof evidence.responseEchoHeaderRequired !== "boolean" ||
        typeof evidence.responseEchoHeaderObserved !== "boolean" ||
        !Number.isInteger(evidence.requestCandidateCount) ||
        !Number.isInteger(evidence.matchedRequestCount) ||
        !Number.isInteger(evidence.responseCandidateCount) ||
        !Number.isInteger(evidence.matchedResponseCount)) {
      errors.push("diagnostic-child-request-correlation-evidence");
    }
  }
  if (summary?.case?.requestCorrelationScopeEvidence) {
    const evidence = summary.case.requestCorrelationScopeEvidence;
    if (evidence.schema !== "media-server.v390-ui-request-correlation-scope-evidence.v1" ||
        typeof evidence.pass !== "boolean" ||
        evidence.requestKind !== "application-fetch" ||
        !Number.isInteger(evidence.logTailRequestCount) ||
        !Number.isInteger(evidence.correlationLeakRequestCount) ||
        !Array.isArray(evidence.orderedLedger) ||
        typeof evidence.failureCode !== "string") {
      errors.push("diagnostic-child-request-correlation-scope-evidence");
    }
  }
  if (summary?.case?.navigationLifecycleEvidence) {
    const evidence = summary.case.navigationLifecycleEvidence;
    if (evidence.schema !== "media-server.v390-ui-navigation-trust-evidence.v1" ||
        typeof evidence.pass !== "boolean" ||
        !Number.isInteger(evidence.totalDocumentNavigationCount) ||
        !Array.isArray(evidence.orderedDocumentNavigations) ||
        typeof evidence.listenerInstalledBeforeFirstNavigation !== "boolean" ||
        !Number.isInteger(evidence.navigationAfterListenerEndCount) ||
        typeof evidence.failureCode !== "string") {
      errors.push("diagnostic-child-navigation-lifecycle-evidence");
    }
  }
  if (summary?.case?.markerEvidenceLifecycle &&
      (!["reached", "not-reached"].includes(summary.case.markerEvidenceLifecycle.phase) ||
        (summary.case.markerEvidenceLifecycle.phase === "reached" &&
          (!Number.isInteger(summary.case.markerEvidenceLifecycle.evaluatorInvocationCount) ||
            typeof summary.case.markerEvidenceLifecycle.correlationResponseBound !== "boolean" ||
            typeof summary.case.markerEvidenceLifecycle.domReadinessConfirmed !== "boolean")))) {
    errors.push("diagnostic-child-marker-evidence-lifecycle");
  }
  if (summary?.case?.markerEvidence) {
    const evidence = summary.case.markerEvidence;
    if (evidence.schema !== "media-server.v390-ui-event-marker-flow-evidence.v1" ||
        typeof evidence.pass !== "boolean" ||
        typeof evidence.failurePhase !== "string" ||
        typeof evidence.failureCode !== "string" ||
        !Number.isInteger(evidence.evaluatorInvocationCount) ||
        typeof evidence.correlationResponseBound !== "boolean" ||
        typeof evidence.domReadinessConfirmed !== "boolean") {
      errors.push("diagnostic-child-marker-evidence");
    }
  }
  if (summary?.case?.failureProvenance) {
    const provenance = summary.case.failureProvenance;
    if (provenance.schema !== "media-server.v390-ui-diagnostic-failure-provenance.v1" ||
        !["browser-case-assertion", "runner-or-lifecycle-failure"].includes(provenance.kind) ||
        typeof provenance.phase !== "string" ||
        typeof provenance.failureClass !== "string" ||
        typeof provenance.errorName !== "string" ||
        !["failed-structured-evidence", "playwright-timeout", "none"].includes(provenance.classificationSource) ||
        typeof provenance.actualBrowserExecution !== "boolean" ||
        typeof provenance.structuredEvidencePresent !== "boolean" ||
        typeof provenance.continuationEligible !== "boolean") {
      errors.push("diagnostic-child-failure-provenance");
    }
  }
  if (summary?.case?.cleanupAttestation) {
    const evidence = summary.case.cleanupAttestation;
    if (evidence.schema !== "media-server.v390-ui-case-cleanup-attestation.v1" ||
        typeof evidence.pass !== "boolean" ||
        typeof evidence.primaryFailurePresent !== "boolean" ||
        typeof evidence.primaryFailurePreserved !== "boolean" ||
        typeof evidence.caseRuntimeRestored !== "boolean" ||
        typeof evidence.browserCloseAttempted !== "boolean" ||
        typeof evidence.browserContextClosed !== "boolean" ||
        !Number.isInteger(evidence.cleanupEntryCount) ||
        typeof evidence.failureCode !== "string") {
      errors.push("diagnostic-child-cleanup-attestation");
    }
  }
  const eventReviewSeedFailure =
    eventReviewSeedDiagnosticCaseIds.includes(item.caseId) &&
    String(summary?.case?.failureDetail || "")
      .includes("exact review seed write receipt is incomplete");
  if (summary?.case?.eventReviewSeedWriteEvidence || eventReviewSeedFailure) {
    try {
      copyEventReviewSeedWriteEvidence(
        summary?.case?.eventReviewSeedWriteEvidence,
        { caseId: item.caseId },
      );
    } catch {
      errors.push("diagnostic-child-event-review-seed-write-evidence");
    }
  }
  if (item.caseId === "EVT-004" && summary?.case?.actualBrowserExecution === true) {
    errors.push(...validateEvt004LifecycleEvidence(summary.case)
      .map(code => `diagnostic-child-${code}`));
  }
  return errors;
}

function safeDiagnosticFailureClass(error) {
  if (error?.cleanupFailure) return "case-cleanup-failed";
  if (error?.browserCloseFailure) return "browser-close-failed";
  const structuredFailureClass = diagnosticStructuredAssertionFailureClass(
    error?.primaryFailureEvidence?.structuredEvidence || error?.primaryFailure);
  if (structuredFailureClass) return structuredFailureClass;
  const message = String(error?.primaryFailure?.message || error?.message || "");
  if (/timeout|waitFor/i.test(message)) return "ui-timeout";
  if (/HTTP\s+\d+|status mismatch/i.test(message)) return "http-status-mismatch";
  if (/selector missing|control missing|not visible/i.test(message)) return "control-observation-failed";
  if (/readback|whoami|scope|assigned view/i.test(message)) return "authoritative-readback-failed";
  if (/secret|credential|password|token/i.test(message)) return "sensitive-material-guard-failed";
  return "case-execution-failed";
}

function buildDiagnosticFailureProvenance({
  primaryFailure,
  primaryFailureEvidence,
  cleanupFailure,
  browserCloseFailure,
  lifecycleFinalizationFailure,
  actualBrowserExecution,
  failurePhase,
}) {
  const failureClass = safeDiagnosticFailureClass({
    primaryFailure,
    cleanupFailure,
    browserCloseFailure,
  });
  const errorName = String(primaryFailure?.name || "Error");
  const runnerError = ["TypeError", "ReferenceError", "SyntaxError", "RangeError"].includes(errorName);
  const structuredEvidencePresent = Boolean(
    primaryFailure?.eventDomSemanticEvidence ||
    primaryFailure?.requestCorrelationEvidence ||
    primaryFailure?.requestCorrelationScopeEvidence ||
    primaryFailure?.navigationLifecycleEvidence ||
    primaryFailure?.markerEvidence ||
    primaryFailure?.markerStageEvidence
  );
  const assertionFailureClasses = new Set([
    "ui-timeout",
    "http-status-mismatch",
    "control-observation-failed",
    "authoritative-readback-failed",
    "dom-semantic-assertion-failed",
    "request-correlation-assertion-failed",
    "request-correlation-scope-assertion-failed",
    "navigation-assertion-failed",
    "marker-assertion-failed",
    "marker-stage-assertion-failed",
  ]);
  const structuredFailureClass = diagnosticStructuredAssertionFailureClass(primaryFailure);
  const playwrightTimeoutClassAttested =
    primaryFailureEvidence?.playwrightTimeoutClassAttested === true;
  const explicitFailureClass = assertionFailureClasses.has(structuredFailureClass)
    ? structuredFailureClass
    : (playwrightTimeoutClassAttested ? "ui-timeout" : "");
  const classificationSource = assertionFailureClasses.has(structuredFailureClass)
    ? "failed-structured-evidence"
    : (playwrightTimeoutClassAttested ? "playwright-timeout" : "none");
  const continuationEligible = actualBrowserExecution === true &&
    failurePhase === "browser-case-execution" &&
    !cleanupFailure &&
    !browserCloseFailure &&
    !lifecycleFinalizationFailure &&
    !runnerError &&
    explicitFailureClass.length > 0 &&
    failureClass === explicitFailureClass;
  return Object.freeze({
    schema: "media-server.v390-ui-diagnostic-failure-provenance.v1",
    kind: continuationEligible ? "browser-case-assertion" : "runner-or-lifecycle-failure",
    phase: String(failurePhase || ""),
    failureClass,
    errorName,
    classificationSource,
    actualBrowserExecution: actualBrowserExecution === true,
    structuredEvidencePresent,
    continuationEligible,
  });
}

function safeDiagnosticFailureDetail(error) {
  const raw = String(error?.primaryFailure?.message || error?.message || "case execution failed");
  return raw
    .replace(/\b(?:https?|rtsp|rtsps):\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(
      /\b(password|credential|secret|token|cookie|authorization)\s*([=:])\s*[^,;\s}\]]+/gi,
      "$1$2[redacted]",
    )
    .replace(/(HTTP\s+\d+)\s*:\s*[\[{][\s\S]*$/i, "$1 [response-body-redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}

function sha256Text(value) {
  return (awaitableHash(value));
}

function awaitableHash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function parseArgs(args) {
  const value = {
    manifest: "test/fixtures/v390_ui_native_exact_cases.json",
    outputDir: "",
    httpBase: "",
    roleStateMap: "",
    serverLog: "",
    runtimeDescriptor: "",
    playwrightModulePath: "",
    chromePath: "",
    buildPath: "build/media_server",
    timeoutMs: 30000,
    planOnly: false,
    diagnosticChild: false,
    diagnosticCaseId: "",
    diagnosticSelectionMode: "fixed-remaining-sweep",
    diagnosticSourceCommit: "",
    diagnosticManifestSha256: "",
    diagnosticBuildSha256: "",
    diagnosticRunId: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--manifest") value.manifest = args[++index] || "";
    else if (arg === "--output-dir") value.outputDir = args[++index] || "";
    else if (arg === "--http-base") value.httpBase = args[++index] || "";
    else if (arg === "--role-state-map") value.roleStateMap = args[++index] || "";
    else if (arg === "--server-log") value.serverLog = args[++index] || "";
    else if (arg === "--runtime-descriptor") value.runtimeDescriptor = args[++index] || "";
    else if (arg === "--playwright-module-path") value.playwrightModulePath = args[++index] || "";
    else if (arg === "--chrome-path") value.chromePath = args[++index] || "";
    else if (arg === "--build-path") value.buildPath = args[++index] || "";
    else if (arg === "--timeout-ms") value.timeoutMs = Number(args[++index] || 0);
    else if (arg === "--plan-only") value.planOnly = true;
    else if (arg === "--diagnostic-child") value.diagnosticChild = true;
    else if (arg === "--diagnostic-case-id") value.diagnosticCaseId = args[++index] || "";
    else if (arg === "--diagnostic-selection-mode") value.diagnosticSelectionMode = args[++index] || "";
    else if (arg === "--diagnostic-source-commit") value.diagnosticSourceCommit = args[++index] || "";
    else if (arg === "--diagnostic-manifest-sha256") value.diagnosticManifestSha256 = args[++index] || "";
    else if (arg === "--diagnostic-build-sha256") value.diagnosticBuildSha256 = args[++index] || "";
    else if (arg === "--diagnostic-run-id") value.diagnosticRunId = args[++index] || "";
    else throw new Error(`unknown option: ${arg}`);
  }
  assert(value.outputDir, "--output-dir is required");
  assert(Number.isFinite(value.timeoutMs) && value.timeoutMs > 0, "--timeout-ms must be positive");
  assert(!value.diagnosticCaseId || value.diagnosticChild,
    "--diagnostic-case-id requires --diagnostic-child");
  assert(value.diagnosticSelectionMode === "fixed-remaining-sweep" ||
    value.diagnosticSelectionMode === "explicit-positive-case",
  "--diagnostic-selection-mode must be a supported diagnostic child mode");
  assert(value.diagnosticSelectionMode === "fixed-remaining-sweep" || value.diagnosticChild,
    "--diagnostic-selection-mode requires --diagnostic-child");
  assert(!value.diagnosticChild || value.diagnosticCaseId,
    "--diagnostic-child requires --diagnostic-case-id");
  assert(!value.diagnosticChild || /^[0-9a-f]{40}$/.test(value.diagnosticSourceCommit),
    "--diagnostic-child requires --diagnostic-source-commit");
  assert(!value.diagnosticChild || /^[0-9a-f]{64}$/.test(value.diagnosticManifestSha256),
    "--diagnostic-child requires --diagnostic-manifest-sha256");
  assert(!value.diagnosticChild || /^[0-9a-f]{64}$/.test(value.diagnosticBuildSha256),
    "--diagnostic-child requires --diagnostic-build-sha256");
  assert(!value.diagnosticChild || value.diagnosticRunId,
    "--diagnostic-child requires --diagnostic-run-id");
  return value;
}

function printSummary(value, summaryPath) {
  console.log("");
  console.log("== v3.9.0 exact native UI runner summary ==");
  console.log(`- result: ${value.result}`);
  console.log(`- executionStatus: ${value.executionStatus}`);
  console.log(`- exactCases: ${value.requestedExactCases || value.counts?.caseCount || value.coverage?.targetCount || 0}`);
  console.log(`- attempted: ${value.executed ?? value.coverage?.attempted ?? 0}`);
  console.log(`- pass: ${value.coverage?.pass ?? value.coverage?.captured ?? 0}`);
  console.log(`- fail: ${value.coverage?.fail ?? 0}`);
  console.log(`- notRun: ${value.notRun ?? value.coverage?.notRun ?? 0}`);
  console.log(`- unsupported: ${value.unsupported ?? value.coverage?.unsupported ?? 0}`);
  console.log(`- uiFulltestPass: ${value.uiFulltestPass}`);
  console.log(`- summaryPath: ${summaryPath}`);
}

function resolveRootOrAbsolute(value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(resolveRootOrAbsolute(relativePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function diagnosticChildSourceBinding(caseId) {
  return {
    gitCommit: options.diagnosticSourceCommit,
    manifestSha256: options.diagnosticManifestSha256,
    buildSha256: options.diagnosticBuildSha256,
    runId: options.diagnosticRunId,
    caseId,
    caseIdsSha256: sha256Text(caseId),
    selectionMode: options.diagnosticSelectionMode,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
