#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 canonical 424 case를 Playwright-native로 실행하거나 plan-only 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createNativePlaywrightAdapter } from "./v390_ui_native_adapter.mjs";
import { validateNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";

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
const serverLogPath = resolveRootOrAbsolute(options.serverLog);
assert(fs.existsSync(serverLogPath), `server log does not exist: ${serverLogPath}`);
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
const summary = {
  schema: "media-server.v390-ui-native-exact-run.v1",
  result: fail === 0 && notRun === 0 ? "PASS" : "FAIL",
  executionStatus: "actual-browser",
  manifestSchema: manifest.schema,
  selectedAdapter: adapter.summary,
  requestedExactCases: manifest.cases.length,
  pass: results.filter(item => item.status === "PASS").length,
  fail,
  notRun,
  unsupported: 0,
  manualIntervention: false,
  uiFulltestPass: false,
  evidenceBoundary: "actual runner output requires Step 25 oracle qualification and Step 26 suite eligibility before UI fulltest PASS",
  cases: results,
};
writeJson(summaryPath, summary);
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
    actions: [],
  };
  const screenshotPath = path.join(screenshotsDir, `${item.caseId}.png`);
  const tracePath = path.join(tracesDir, `${item.caseId}.trace.json`);
  const consolePath = path.join(logsDir, `${item.caseId}.browser-console.json`);
  try {
    assert(item.oracle.allowedStatuses.includes(browser.navigation.status),
      `${item.caseId} navigation status ${browser.navigation.status} not in ${item.oracle.allowedStatuses.join(",")}`);
    if (item.disposition === "negative-route") {
      trace.actions.push({ kind: "navigate", status: "PASS", observedStatus: browser.navigation.status });
    } else {
      for (const action of item.actions.slice(1)) {
        if (action.kind === "wait-visible") {
          await browser.waitForSelector(action.selector);
          trace.actions.push({ ...action, status: "PASS" });
        } else if (action.kind === "interact") {
          trace.actions.push(await interactWithRuntimeControl(browser, item, action));
        } else if (action.kind === "navigate-negative") {
          const observed = await browser.navigate(action.route);
          assert(action.allowedStatuses.includes(observed.status),
            `${item.caseId} negative navigation status ${observed.status} not in ${action.allowedStatuses.join(",")}`);
          trace.actions.push({ ...action, observed, status: "PASS" });
        }
      }
    }
    await browser.screenshot(screenshotPath);
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
      observed: trace.requested,
      navigation: browser.navigation,
      oracleSeed: item.oracle,
      screenshotPath,
      tracePath,
      browserConsolePath: consolePath,
      serverLogReference: serverLogPath,
    };
  } finally {
    await browser.close();
  }
}

async function interactWithRuntimeControl(browser, item, action) {
  const control = await browser.evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(action.selector)});
    if (!element) return null;
    return {
      tag: element.tagName.toLowerCase(),
      type: String(element.getAttribute('type') || '').toLowerCase(),
      value: 'value' in element ? String(element.value || '') : '',
      options: element.tagName === 'SELECT' ? Array.from(element.options).filter(option => !option.disabled).map(option => String(option.value)) : [],
    };
  })()`);
  assert(control, `${item.caseId} runtime control missing: ${action.selector}`);
  let executedKind = "click";
  if (control.tag === "select") {
    const next = control.options.find(value => value !== control.value);
    assert(next !== undefined, `${item.caseId} select has no alternate option`);
    await browser.select(action.selector, next);
    executedKind = "select";
  } else if (["input", "textarea"].includes(control.tag) && !["button", "submit", "checkbox", "radio"].includes(control.type)) {
    await browser.fill(action.selector, `${item.caseId}-native`);
    executedKind = "fill";
  } else {
    await browser.click(action.selector);
  }
  return { ...action, executedKind, status: "PASS" };
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
  console.log(`- exactCases: ${value.requestedExactCases || value.counts?.caseCount || 0}`);
  console.log(`- unsupported: ${value.unsupported}`);
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
