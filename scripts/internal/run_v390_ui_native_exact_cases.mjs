#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 canonical 424 case를 Playwright-native로 실행하거나 plan-only 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { createNativePlaywrightAdapter } from "./v390_ui_native_adapter.mjs";
import { evaluateCompletionOracle } from "./v390_ui_completion_oracle_lib.mjs";
import { validateNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";
import { producePolicyV4Evidence } from "./v390_ui_policy_v4_evidence_producer.mjs";
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
const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const validation = validateNativeExactManifest({ manifest, canonical, implementation });
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
    navigationCorrelationId: `${item.caseId}:navigation`,
  });
  const requested = canonicalRequestedProjection(item);
  const trace = {
    schema: "media-server.v390-ui-native-interaction-trace.v1",
    caseId: item.caseId,
    featureId: item.featureId,
    dispatch: "playwright-native",
    requested,
    navigation: browser.navigation,
    setup: [],
    inputs: structuredClone(item.workflow.inputs),
    actions: [],
    completionEvents: [],
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
        }
      }
    }
    assert(trace.completionEvents.some(event => event.pass && item.oracle.allowedCompletionSources.includes(event.source)),
      `${item.caseId} has no allowed completion oracle`);
    assert(runtimeState.has("__requestedObservedEnvelope"),
      `${item.caseId} runtime requested/observed control context was not captured`);
    const requestedObserved = runtimeState.get("__requestedObservedEnvelope");
    const visualMeasurement = await browser.measureVisualState(item.controlAction.targetSelector || "body");
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
      requireVideoOverlay: item.screenRoute === "/client/live",
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
  const operatorCase = manifest.cases.find(item => item.accountRole === "operator" && item.screenRoute.startsWith("/ops"));
  const viewerCase = manifest.cases.find(item => item.accountRole === "viewer" && item.screenRoute.startsWith("/client"));
  assert(operatorCase && viewerCase, "visual matrix representative operator/viewer cases are missing");
  const probes = [];
  for (const width of [320, 390, 760, 1180]) {
    for (const theme of ["light", "dark"]) {
      const item = theme === "light" ? operatorCase : viewerCase;
      const id = `visual-${width}-${theme}`;
      const storageStatePath = resolveRoleState(item.accountRole, roleStateMap);
      const browser = await adapter.openPage({
        httpBase: options.httpBase,
        pagePath: item.screenRoute,
        timeoutMs: options.timeoutMs,
        width,
        height: 844,
        storageStatePath,
        colorScheme: theme,
        navigationCorrelationId: `${id}:navigation`,
      });
      const screenshotPath = path.join(visualMatrixDir, `${id}.png`);
      try {
        assert(item.oracle.allowedStatuses.includes(browser.navigation.status), `${id} navigation status mismatch`);
        const measurement = await browser.measureVisualState("body");
        await browser.screenshot(screenshotPath);
        probes.push({
          id,
          role: item.accountRole,
          correlationId: `${id}:navigation`,
          screenshotPath,
          measurement,
          expectedViewport: { width, height: 844 },
          expectedTheme: theme,
          requireVideoOverlay: item.screenRoute === "/client/live",
        });
      } finally {
        await browser.close();
      }
    }
  }
  return probes;
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
  if (["assert-product-state", "assert-product-boundary", "verify-independent-readback"].includes(action.kind)) {
    throw new Error(`${item.caseId} ${action.kind} requires runtime independent readback evidence; source locator metadata is not execution evidence`);
  }

  const before = await browser.snapshot(action.selector);
  assert(before.exists, `${item.caseId} control missing: ${action.selector}`);
  if (action.kind === "assert-route-read-model" || action.kind === "assert-visible-read-model") {
    assert(before.visible, `${item.caseId} read model is not visible: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, before);
  }
  if (action.kind === "assert-hidden-control") {
    assert(action.expectedExists === true && !before.visible, `${item.caseId} hidden control state mismatch`);
    return semanticAssertionResult(browser, item, action, before, before);
  }
  if (action.kind === "assert-disabled-control") {
    assert(before.disabled === true, `${item.caseId} control is not disabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, before);
  }
  if (action.kind === "assert-enabled-control") {
    assert(before.visible && before.disabled === false, `${item.caseId} control is not enabled: ${action.selector}`);
    return semanticAssertionResult(browser, item, action, before, before);
  }
  if (action.kind === "assert-link-target") {
    assert(before.tag === "a" && before.href.startsWith("/"), `${item.caseId} same-origin link target missing`);
    return semanticAssertionResult(browser, item, action, before, before);
  }
  if (action.kind === "assert-seeded-select") {
    const nonEmpty = before.optionValues.filter(Boolean);
    assert(before.tag === "select" && nonEmpty.length >= action.minimumNonEmptyOptions,
      `${item.caseId} server-seeded select option missing`);
    return semanticAssertionResult(browser, item, action, { ...before, nonEmptyOptionCount: nonEmpty.length }, before);
  }

  runtimeState.set(action.selector, { kind: action.kind, snapshot: before });
  let executedKind = "";
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
  await delay(350);
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
  const networkResponses = browser.networkEntries();
  const semanticReadback = semanticReadbackEvidence(action, actionEvidence, before, after);
  const completionOracle = evaluateCompletionOracle({
    action: actionEvidence,
    before,
    after,
    networkResponses,
    semanticReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  assert(completionOracle.pass, `${item.caseId} ${action.kind} completion failed: ${completionOracle.reason}`);
  return { actionEvidence: { ...actionEvidence, semanticReadback }, completionOracle };
}

function semanticAssertionResult(browser, item, action, observed, snapshot) {
  const actionEvidence = {
    ...semanticCompletionAction(action, item),
    observed,
    status: "PASS",
  };
  const semanticReadback = semanticReadbackEvidence(action, actionEvidence, snapshot, snapshot, observed);
  const completionOracle = evaluateCompletionOracle({
    action: actionEvidence,
    before: snapshot,
    after: snapshot,
    networkResponses: browser.networkEntries(),
    semanticReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  assert(completionOracle.pass, `${item.caseId} ${action.kind} semantic completion failed: ${completionOracle.reason}`);
  return { actionEvidence: { ...actionEvidence, semanticReadback }, completionOracle };
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
  const completionOracle = evaluateCompletionOracle({
    action: actionEvidence,
    before,
    after,
    navigation: observed,
    allowedStatuses,
    networkResponses: browser.networkEntries().slice(networkStart),
    semanticReadback,
  });
  assertCompletionEvidence(completionOracle, item.caseId);
  assert(completionOracle.pass,
    `${item.caseId} navigate-action-route completion failed: ${completionOracle.reason}`);
  return { actionEvidence: { ...actionEvidence, semanticReadback }, completionOracle };
}

function semanticCompletionAction(action, item) {
  const completion = action.semanticCompletion;
  assert(completion?.schema === "media-server.v390-ui-semantic-completion.v1",
    `${item.caseId} action semantic completion missing: ${action.kind}`);
  return {
    ...action,
    kind: completion.requiredSource === "negative-route-status" ? "navigate-negative" : action.kind,
    executed: true,
    correlationId: completion.correlationId,
    dispatch: "playwright-native",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: completion.readbackIdentity,
    expectedEndpoint: {
      correlationId: completion.request.correlationId,
      method: completion.request.method,
      urlPath: completion.request.urlPath,
      allowedStatuses: [...completion.request.allowedStatuses],
    },
    allowedCompletionSources: [...item.oracle.allowedCompletionSources],
  };
}

function semanticReadbackEvidence(action, actionEvidence, before, after, explicitObserved = null) {
  const expected = structuredClone(action.semanticCompletion.readbackExpectation);
  return {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: action.semanticCompletion.readbackIdentity,
    correlationId: actionEvidence.correlationId,
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
