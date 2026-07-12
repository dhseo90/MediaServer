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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const options = parseArgs(process.argv.slice(2));
const manifest = readJson(options.manifest);
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const validation = validateNativeExactManifest({ manifest, canonical, implementation });
const outputDir = resolveRootOrAbsolute(options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const tracesDir = path.join(outputDir, "traces");
const screenshotsDir = path.join(outputDir, "screenshots");
const logsDir = path.join(outputDir, "logs");
fs.mkdirSync(tracesDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

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
  const trace = {
    schema: "media-server.v390-ui-native-interaction-trace.v1",
    caseId: item.caseId,
    featureId: item.featureId,
    dispatch: "playwright-native",
    requested: {
      route: item.screenRoute,
      role: item.accountRole,
      viewport: item.viewport,
      theme: item.theme,
    },
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
    executeWorkflowSetup(item, storageStatePath, trace);
    assert(item.oracle.allowedStatuses.includes(browser.navigation.status),
      `${item.caseId} navigation status ${browser.navigation.status} not in ${item.oracle.allowedStatuses.join(",")}`);
    const initialSnapshot = await browser.snapshot("body");
    const observedBrowser = await browser.evaluate(`(() => ({
      route: location.pathname,
      viewport: { width: innerWidth, height: innerHeight },
      theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }))()`);
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
          trace.actions.push({ ...action, status: "PASS" });
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
          const result = await executeCaseNativeAction(browser, item, action, runtimeState);
          trace.actions.push(result.actionEvidence);
          if (result.completionOracle) trace.completionEvents.push(result.completionOracle);
        }
      }
    }
    assert(trace.completionEvents.some(event => event.pass && item.oracle.allowedCompletionSources.includes(event.source)),
      `${item.caseId} has no allowed completion oracle`);
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
      observed: {
        route: observedBrowser.route,
        accountRole: item.accountRole,
        viewport: observedBrowser.viewport,
        theme: observedBrowser.theme,
        controlAction: item.controlAction,
      },
      visibleAssertion: {
        pass: initialSnapshot.exists === true && initialSnapshot.visible === true,
        visible: initialSnapshot.visible === true,
        selector: "body",
      },
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

function executeWorkflowSetup(item, storageStatePath, trace) {
  for (const setup of item.workflow.setup) {
    if (setup.kind === "bind-role-session") {
      assert(setup.accountRole === item.accountRole, `${item.caseId} role setup drift`);
      assert(setup.required === (item.accountRole !== "anonymous"), `${item.caseId} role requirement drift`);
      if (setup.required) assert(storageStatePath, `${item.caseId} required role storage state missing`);
    } else if (setup.kind === "seed-reviewed-state") {
      assert(/^[a-f0-9]{64}$/.test(setup.semanticCallChainSha256), `${item.caseId} semantic seed digest invalid`);
      assert(setup.persistedMutation === false, `${item.caseId} undeclared persisted seed mutation`);
    } else {
      throw new Error(`${item.caseId} unsupported setup kind: ${setup.kind}`);
    }
    trace.setup.push({ ...setup, status: "PASS" });
  }
}

async function executeCaseNativeAction(browser, item, action, runtimeState) {
  if (action.kind === "assert-form-contract") {
    const observed = await browser.evaluate(`(() => {
      const form = document.querySelector(${JSON.stringify(action.selector)});
      if (!form) return null;
      return {
        method: String(form.getAttribute('method') || '').toLowerCase(),
        action: String(form.getAttribute('action') || ''),
        fields: ${JSON.stringify(action.fields)}.filter(name => Boolean(form.querySelector('[name="' + CSS.escape(name) + '"]'))),
      };
    })()`);
    assert(observed, `${item.caseId} form missing: ${action.selector}`);
    assert(observed.method === action.method, `${item.caseId} form method mismatch`);
    assert(observed.action === action.action, `${item.caseId} form action mismatch`);
    assert(JSON.stringify(observed.fields) === JSON.stringify(action.fields), `${item.caseId} form fields mismatch`);
    const snapshot = await browser.snapshot(action.selector);
    return semanticAssertionResult(browser, item, action, observed, snapshot);
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
    if (cleanup.kind === "assert-no-persisted-mutation") {
      assert(/^[a-f0-9]{64}$/.test(cleanup.semanticCallChainSha256), `${item.caseId} cleanup semantic digest invalid`);
    } else if (cleanup.kind === "restore-control-value") {
      const state = runtimeState.get(cleanup.selector);
      assert(state, `${item.caseId} cleanup value snapshot missing`);
      if (state.kind === "select-control") {
        await browser.select(cleanup.selector, state.snapshot.selectedValues[0] || "");
      } else {
        await browser.fill(cleanup.selector, state.snapshot.value);
      }
    } else if (cleanup.kind === "restore-control-checked") {
      const state = runtimeState.get(cleanup.selector);
      assert(state, `${item.caseId} cleanup checked snapshot missing`);
      const current = await browser.snapshot(cleanup.selector);
      if (current.checked !== state.snapshot.checked) await browser.click(cleanup.selector);
    } else if (cleanup.kind === "restore-details-open") {
      const state = runtimeState.get(cleanup.selector);
      assert(state, `${item.caseId} cleanup details snapshot missing`);
      const current = await browser.snapshot(cleanup.selector);
      if (current.open !== state.snapshot.open) await browser.click(`${cleanup.selector} > summary`);
    } else if (cleanup.kind === "restore-route") {
      const observed = await browser.navigate(cleanup.route);
      assert(observed.status >= 200 && observed.status < 400, `${item.caseId} route cleanup failed`);
    } else {
      throw new Error(`${item.caseId} unsupported cleanup kind: ${cleanup.kind}`);
    }
    trace.cleanup.push({ ...cleanup, status: "PASS" });
  }
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
