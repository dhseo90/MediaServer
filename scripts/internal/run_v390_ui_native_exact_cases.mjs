#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 canonical 424 case를 Playwright-native로 실행하거나 plan-only 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createNativePlaywrightAdapter } from "./v390_ui_native_adapter.mjs";
import { domSnapshotDigest, evaluateCompletionOracle } from "./v390_ui_completion_oracle_lib.mjs";
import { validateNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";
import { producePolicyV4Evidence } from "./v390_ui_policy_v4_evidence_producer.mjs";
import { expandVisualMatrixPlan, validateVisualMatrixPlan } from "./v390_ui_visual_evidence.mjs";
import { deduplicateScreenshotArtifacts } from "./evidence_integrity_lib.mjs";
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
  "execute-persisted-action",
  "fill-control",
  "navigate",
  "navigate-action-route",
  "navigate-negative",
  "select-control",
  "submit-form",
  "toggle-checkbox",
  "toggle-details",
  "verify-independent-readback",
  "wait-visible",
]);
const supportedCleanupKinds = Object.freeze([
  "delete-created-fixture",
  "no-op-cleanup",
  "restore-fixture-state",
  "restore-local-control",
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const options = parseArgs(process.argv.slice(2));
const manifest = readJson(options.manifest);
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const visualMatrixPlan = readJson("test/fixtures/v390_ui_visual_matrix_plan.json");
const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const validation = validateNativeExactManifest({ manifest, canonical, implementation });
const visualPlanValidation = validateVisualMatrixPlan({ plan: visualMatrixPlan, canonical, native: manifest });
const runnerWorkflowCompatibility = validateRunnerWorkflowCompatibility(manifest.cases);
const outputDir = resolveRootOrAbsolute(options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const tracesDir = path.join(outputDir, "traces");
const screenshotsDir = path.join(outputDir, "screenshots");
const logsDir = path.join(outputDir, "logs");
const visualMatrixDir = path.join(outputDir, "visual-matrix");
fs.mkdirSync(tracesDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(visualMatrixDir, { recursive: true });

if (options.planOnly) {
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

assert(options.httpBase, "--http-base is required for actual execution");
assert(options.serverLog, "--server-log is required for actual execution");
const buildPath = resolveRootOrAbsolute(options.buildPath);
assert(fs.existsSync(buildPath), `--build-path does not exist: ${buildPath}`);
const serverLogPath = resolveRootOrAbsolute(options.serverLog);
assert(fs.existsSync(serverLogPath), `server log does not exist: ${serverLogPath}`);
const actualStartedAt = new Date().toISOString();
const roleStateMap = loadRoleStateMap(options.roleStateMap);
const adapter = await createNativePlaywrightAdapter({
  modulePath: options.playwrightModulePath,
  chromePath: options.chromePath,
});

const results = [];
let stopped = false;
for (const item of manifest.cases) {
  if (stopped) {
    results.push(makeNotRun(item, "not run after previous native case failure"));
    continue;
  }
  try {
    const result = await executeCase(item, adapter, roleStateMap, serverLogPath);
    results.push(result);
  } catch (error) {
    stopped = true;
    results.push({
      caseId: item.caseId,
      featureId: item.featureId,
      status: "FAIL",
      reason: error instanceof Error ? error.message : String(error),
      dispatch: "playwright-native",
      manualIntervention: false,
    });
  }
}

const fail = results.filter(item => item.status === "FAIL").length;
const notRun = results.filter(item => item.status === "not-run").length;
const visualMatrixProbes = fail === 0 && notRun === 0
  ? await executeVisualMatrix(adapter, roleStateMap)
  : [];
deduplicateScreenshotArtifacts([...results, ...visualMatrixProbes]);
const produced = producePolicyV4Evidence({
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
});
const summary = produced.summary;
printSummary(summary, summaryPath);
if (summary.result !== "PASS") process.exit(1);

async function executeCase(item, adapter, roleStateMap, serverLogPath) {
  const storageStatePath = resolveRoleState(item.accountRole, roleStateMap);
  const browser = await adapter.openPage({
    httpBase: options.httpBase,
    pagePath: item.screenRoute,
    timeoutMs: options.timeoutMs,
    width: item.viewport.width,
    height: item.viewport.height,
    storageStatePath,
    colorScheme: item.theme,
    navigationCorrelationId: item.actions[0].semanticCompletion.correlationId,
  });
  const requested = canonicalRequestedProjection(item);
  const trace = {
    schema: "media-server.v390-ui-native-interaction-trace.v2",
    caseId: item.caseId,
    featureId: item.featureId,
    dispatch: "playwright-native",
    requested,
    observed: null,
    navigation: browser.navigation,
    setup: [],
    inputs: structuredClone(item.workflow.inputs),
    actions: [],
    completionEvents: [],
    rawPrimaryObservations: [],
    expectedResults: structuredClone(item.workflow.expectedResults),
    cleanup: [],
  };
  const runtimeState = new Map();
  const screenshotPath = path.join(screenshotsDir, `${item.caseId}.png`);
  const tracePath = path.join(tracesDir, `${item.caseId}.trace.json`);
  const consolePath = path.join(logsDir, `${item.caseId}.browser-console.json`);
  try {
    executeWorkflowSetup(item, storageStatePath, roleStateMap, trace);
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
    } else {
      for (const action of item.actions.slice(1)) {
        if (action.kind === "wait-visible") {
          await browser.waitForSelector(action.selector);
          await observePrimaryControlContext(browser, item, requested, runtimeState, action.selector);
          trace.actions.push({ ...action, status: "PASS" });
        } else if (action.kind === "navigate-action-route") {
          const result = await executeCaseNativeNavigation(browser, item, action);
          trace.actions.push(result.actionEvidence);
          trace.completionEvents.push(result.completionOracle);
          trace.rawPrimaryObservations.push(result.rawPrimaryObservation);
        } else if (action.kind === "navigate-negative") {
          const before = await browser.snapshot(item.controlAction.targetSelector);
          const networkStart = browser.networkEntries().length;
          await browser.setCorrelationId(action.semanticCompletion.request.correlationId);
          const observed = await browser.navigate(action.route);
          await browser.setCorrelationId(`${item.caseId}:navigation`);
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
          const result = await executeCaseNativeAction(browser, item, action, runtimeState);
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
    await executeWorkflowCleanup(browser, item, runtimeState, trace);
    writeJson(consolePath, {
      schema: "media-server.v390-ui-native-browser-console.v1",
      caseId: item.caseId,
      entries: browser.consoleEntries(),
    });
    writeJson(tracePath, trace);
    return {
      caseId: item.caseId,
      featureId: item.featureId,
      status: "PASS",
      disposition: item.disposition,
      dispatch: "playwright-native",
      manualIntervention: false,
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
      navigation: browser.navigation,
      oracleSeed: item.oracle,
      completionOracle: trace.completionEvents,
      screenshotPath,
      tracePath,
      browserConsolePath: consolePath,
      serverLogReference: serverLogPath,
    };
  } finally {
    await browser.close();
  }
}

async function observePrimaryControlContext(browser, item, requested, runtimeState, candidateSelector = null) {
  if (runtimeState.has("__requestedObservedEnvelope")) return;
  const primaryControl = item.workflow.primaryControl;
  const primarySelector = primaryControl.selector ?? null;
  if (primaryControl.applicability === "required" && candidateSelector !== primarySelector) return;
  await browser.setCorrelationId(`${item.caseId}:schema-observation`);
  const rawObserved = await browser.observeRequestedObservedState({
    selector: primarySelector,
    applicability: primaryControl.applicability,
  });
  await browser.setCorrelationId(`${item.caseId}:navigation`);
  const observed = runtimeObservedProjection(rawObserved);
  const envelope = assertRequestedObservedEnvelope({
    requested,
    observed,
    canonicalCase: canonicalById.get(item.caseId),
    nativeCase: item,
  });
  runtimeState.set("__requestedObservedEnvelope", envelope);
}

async function executeVisualMatrix(adapter, roleStateMap) {
  const probes = [];
  const nativeById = new Map(manifest.cases.map(item => [item.caseId, item]));
  for (const variant of expandVisualMatrixPlan(visualMatrixPlan)) {
      const item = nativeById.get(variant.canonicalCaseId);
      assert(item, `${variant.canonicalCaseId} visual representative native case missing`);
      const id = `visual-${variant.canonicalCaseId}-${variant.width}-${variant.theme}`;
      const storageStatePath = resolveRoleState(variant.accountRole, roleStateMap);
      const browser = await adapter.openPage({
        httpBase: options.httpBase,
        pagePath: variant.screenRoute,
        timeoutMs: options.timeoutMs,
        width: variant.width,
        height: variant.height,
        storageStatePath,
        colorScheme: variant.theme,
        navigationCorrelationId: `${id}:navigation`,
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

function executeWorkflowSetup(item, storageStatePath, roleStateMap, trace) {
  for (const setup of item.workflow.setup) {
    if (setup.kind === "bind-role-session") {
      assert(setup.accountRole === item.accountRole, `${item.caseId} role setup drift`);
      assert(setup.required === (item.accountRole !== "anonymous"), `${item.caseId} role requirement drift`);
      if (setup.required) assert(storageStatePath, `${item.caseId} required role storage state missing`);
    } else if (setup.kind === "bind-action-role-session") {
      const actionRoleStatePath = resolveRoleState(setup.accountRole, roleStateMap);
      if (setup.accountRole !== item.accountRole) {
        assert(actionRoleStatePath || setup.accountRole === "anonymous",
          `${item.caseId} action role storage state missing: ${setup.accountRole}`);
        throw new Error(`${item.caseId} cross-role action session adapter is unavailable for ${setup.accountRole}`);
      }
      assert(setup.route === item.workflow.primaryControl.route,
        `${item.caseId} action role route drift`);
    } else if (setup.kind === "seed-reviewed-state") {
      assert(/^[a-f0-9]{64}$/.test(setup.semanticCallChainSha256), `${item.caseId} semantic seed digest invalid`);
      if (setup.persistedMutation) {
        assert(setup.beforeSnapshotRef && setup.fixtureId,
          `${item.caseId} persisted seed snapshot/fixture missing`);
        throw new Error(`${item.caseId} persisted workflow seed adapter is unavailable`);
      }
    } else {
      throw new Error(`${item.caseId} unsupported setup kind: ${setup.kind}`);
    }
    trace.setup.push({ ...setup, status: "PASS" });
  }
}

async function executeCaseNativeAction(browser, item, action, runtimeState) {
  if (action.kind === "verify-independent-readback") {
    return executeIndependentReadback(browser, item, action, runtimeState);
  }

  const snapshotSelector = action.submitSelector || action.selector || item.workflow.primaryControl.selector || "body";
  const before = await browser.snapshot(snapshotSelector);
  assert(before.exists, `${item.caseId} control missing: ${action.selector}`);
  if (["assert-product-state", "assert-product-boundary", "assert-route-read-model", "assert-visible-read-model"].includes(action.kind)) {
    assert(before.visible, `${item.caseId} read model is not visible: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState);
  }
  if (action.kind === "assert-hidden-control") {
    assert(action.expectedExists === true && !before.visible, `${item.caseId} hidden control state mismatch`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState);
  }
  if (action.kind === "assert-disabled-control") {
    assert(before.disabled === true, `${item.caseId} control is not disabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState);
  }
  if (action.kind === "assert-enabled-control") {
    assert(before.visible && before.disabled === false, `${item.caseId} control is not enabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState);
  }
  if (action.kind === "assert-link-target") {
    assert(before.tag === "a" && before.href.startsWith("/"), `${item.caseId} same-origin link target missing`);
    return semanticAssertionResult(browser, item, action, before, snapshotSelector, runtimeState);
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
      await browser.click(action.selector);
      executedKind = "click";
    } else if (action.kind === "submit-form") {
      const input = workflowInput(item, action.inputId, "form-values");
      for (const field of action.fields) {
        const value = resolveRuntimeInputValue(input.actualValue?.[field], item.caseId, field);
        await browser.fill(`[name=${JSON.stringify(field)}]`, value);
      }
      await browser.click(action.submitSelector);
      executedKind = "submit";
    } else if (action.kind === "execute-persisted-action") {
      workflowInput(item, action.inputId, "reversible-fixture-record");
      assert(Boolean(action.endpoint) !== Boolean(action.localAction),
        `${item.caseId} persisted action endpoint/local action must be exclusive`);
      await browser.click(action.selector);
      executedKind = "persisted-control";
    } else {
      throw new Error(`${item.caseId} unsupported case-native action: ${action.kind}`);
    }
    await browser.waitForNetworkQuiet({
      correlationId: action.semanticCompletion.correlationId,
      minimumObservationMs: 750,
      quietMs: 250,
    });
  } finally {
    await browser.setCorrelationId(`${item.caseId}:navigation`);
  }
  const after = await browser.snapshot(action.selector);
  if (action.kind === "toggle-checkbox") {
    assert(after.checked !== before.checked, `${item.caseId} checkbox did not toggle`);
  }
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    executedKind,
    before,
    after,
    status: "PASS",
  };
  const networkResponses = browser.networkEntries().slice(networkStart);
  assert(!runtimeState.has("__pendingPrimaryCompletion"),
    `${item.caseId} multiple pending primary actions are forbidden`);
  runtimeState.set("__pendingPrimaryCompletion", {
    action,
    actionEvidence,
    before,
    after,
    networkResponses,
    beforePostconditionSnapshots,
  });
  return { actionEvidence: { ...actionEvidence, completionStatus: "awaiting-independent-readback" }, completionOracle: null };
}

async function semanticAssertionResult(browser, item, action, observed, snapshotSelector, runtimeState) {
  const networkStart = browser.networkEntries().length;
  const completion = action.semanticCompletion;
  if (completion.request) {
    await browser.setCorrelationId(completion.correlationId);
    try {
      const response = await browser.request({
        method: completion.request.method,
        urlPath: completion.request.urlPath,
      });
      assert(completion.request.allowedStatuses.includes(response.status),
        `${item.caseId} action request status mismatch: ${response.status}`);
    } finally {
      await browser.setCorrelationId(`${item.caseId}:navigation`);
    }
  }
  const snapshot = await browser.snapshot(snapshotSelector);
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    observed,
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
    explicitObserved: observed,
  });
  return { actionEvidence: { ...actionEvidence, completionStatus: "awaiting-independent-readback" }, completionOracle: null };
}

async function executeIndependentReadback(browser, item, action, runtimeState) {
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
  const selector = pending.actionEvidence.controlSelector || "body";
  const freshAfter = await browser.snapshot(selector);
  const explicitObserved = Object.keys(postconditionSnapshots).length > 0
    ? {
        beforeSnapshots: pending.beforePostconditionSnapshots || {},
        snapshots: postconditionSnapshots,
      }
    : (pending.explicitObserved || null);
  const semanticReadback = semanticReadbackEvidence(
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
    networkResponses: pending.networkResponses,
    semanticReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  assert(completionOracle.pass,
    `${item.caseId} independent readback failed for ${pending.action.kind}: ${completionOracle.reason}`);
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

async function executeWorkflowCleanup(browser, item, runtimeState, trace) {
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
    } else if (cleanup.kind === "no-op-cleanup") {
      assert(cleanup.persistedMutation === false, `${item.caseId} no-op cleanup mutation flag drift`);
      assert(!item.workflow.controlSequence.some(action =>
        ["submit-form", "execute-persisted-action"].includes(action.kind)),
      `${item.caseId} no-op cleanup cannot cover a persisted action`);
    } else if (["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind)) {
      assert(cleanup.beforeSnapshotRef && cleanup.inverseAction && cleanup.afterReadback?.identity,
        `${item.caseId} mutation cleanup contract incomplete`);
      throw new Error(`${item.caseId} mutation cleanup adapter is unavailable for ${cleanup.kind}`);
    } else {
      throw new Error(`${item.caseId} unsupported cleanup kind: ${cleanup.kind}`);
    }
    trace.cleanup.push({ ...cleanup, status: "PASS" });
  }
}

async function executeCaseNativeNavigation(browser, item, action) {
  const before = await browser.snapshot("body");
  const networkStart = browser.networkEntries().length;
  await browser.setCorrelationId(action.semanticCompletion.request.correlationId);
  const observed = await browser.navigate(action.route);
  await browser.setCorrelationId(`${item.caseId}:navigation`);
  const allowedStatuses = action.semanticCompletion.request.allowedStatuses;
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
  const semanticReadback = semanticReadbackEvidence(action, actionEvidence, before, after);
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
    allowedCompletionSources: [...new Set([
      completion.requiredSource,
      ...completion.attestedAlternatives,
    ])],
  };
}

function semanticReadbackEvidence(action, actionEvidence, before, after, explicitObserved = null) {
  const expected = structuredClone(action.semanticCompletion.readbackExpectation);
  if (action.semanticCompletion.phase === "primary-action") {
    const observation = {
      before: before ? structuredClone(before) : null,
      after: after ? structuredClone(after) : null,
      ...(explicitObserved?.snapshots ? {
        beforeSnapshots: structuredClone(explicitObserved.beforeSnapshots || {}),
        snapshots: structuredClone(explicitObserved.snapshots),
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
      observationSource: "browser-dom",
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
      if (action.kind === "submit-form") {
        assert(action.selector && action.submitSelector && action.inputId && Array.isArray(action.fields),
          `${item.caseId} submit-form shape invalid`);
      }
      if (action.kind === "execute-persisted-action") {
        assert(action.inputId && Boolean(action.endpoint) !== Boolean(action.localAction),
          `${item.caseId} execute-persisted-action shape invalid`);
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
    actualRuntimeBoundary: "missing seed/session/readback/cleanup adapters fail explicitly; plan-only is not execution evidence",
  };
}

function workflowInput(item, inputId, expectedKind) {
  const input = item.workflow.inputs.find(candidate => candidate.inputId === inputId);
  assert(input, `${item.caseId} workflow input missing: ${inputId}`);
  assert(input.kind === expectedKind,
    `${item.caseId} workflow input kind mismatch: ${input.kind}/${expectedKind}`);
  return input;
}

function resolveRuntimeInputValue(value, caseId, field) {
  if (value && typeof value === "object" && value.secretRef) {
    throw new Error(`${caseId} runtime secret adapter is unavailable for ${field}; secretRef is not a literal value`);
  }
  assert(["string", "number", "boolean"].includes(typeof value),
    `${caseId} runtime form value missing for ${field}`);
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

function parseArgs(args) {
  const value = {
    manifest: "test/fixtures/v390_ui_native_exact_cases.json",
    outputDir: "",
    httpBase: "",
    roleStateMap: "",
    serverLog: "",
    playwrightModulePath: "",
    chromePath: "",
    buildPath: "build/media_server",
    timeoutMs: 30000,
    planOnly: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--manifest") value.manifest = args[++index] || "";
    else if (arg === "--output-dir") value.outputDir = args[++index] || "";
    else if (arg === "--http-base") value.httpBase = args[++index] || "";
    else if (arg === "--role-state-map") value.roleStateMap = args[++index] || "";
    else if (arg === "--server-log") value.serverLog = args[++index] || "";
    else if (arg === "--playwright-module-path") value.playwrightModulePath = args[++index] || "";
    else if (arg === "--chrome-path") value.chromePath = args[++index] || "";
    else if (arg === "--build-path") value.buildPath = args[++index] || "";
    else if (arg === "--timeout-ms") value.timeoutMs = Number(args[++index] || 0);
    else if (arg === "--plan-only") value.planOnly = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  assert(value.outputDir, "--output-dir is required");
  assert(Number.isFinite(value.timeoutMs) && value.timeoutMs > 0, "--timeout-ms must be positive");
  return value;
}

function printSummary(value, summaryPath) {
  console.log("");
  console.log("== v3.9.0 exact native UI runner summary ==");
  console.log(`- result: ${value.result}`);
  console.log(`- executionStatus: ${value.executionStatus}`);
  console.log(`- exactCases: ${value.requestedExactCases || value.counts?.caseCount || value.coverage?.targetCount || 0}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
