#!/usr/bin/env node
// 파일 용도: v3.9.0 UI automation summary가 case 단위 evidence와 실패 리포트 경계를 지키는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation report verification

Usage:
  ./server.sh verify-v390-ui-automation-report --summary <summary.json>

Checks:
  - summary schema is media-server.v390-ui-automation.v1
  - every case has route/control/action granularity
  - failure reports include screenshot/trace/console/server-log/cleanup/manualIntervention fields
  - PASS reports require fail=0, notRun=0, manualIntervention=false, failed interaction 0
  - artifact paths exist for screenshot/trace/video/browser-console/server-log evidence
  - browserConsole warnings/errors require browserConsoleAllowReason
  - wrapper/static evidence is not promoted to manual UI fulltest evidence
`);
}

assertKnownOptions(rawArgs, ["summary", "h", "help"]);

const summaryPath = parseSummaryPath(rawArgs);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const checks = [];
const requiredCaseIds = ["UI-108", "UI-109", "UI-110", "UI-111", "UI-112", "UI-113", "UI-114", "UI-115"];

check("summary uses v390 UI automation schema", () => {
  assert(summary.schema === "media-server.v390-ui-automation.v1", `unexpected schema: ${summary.schema}`);
  assert(typeof summary.runId === "string" && summary.runId.startsWith("v390-ui-automation-"), "missing v390 runId");
  assert(["PASS", "FAIL"].includes(summary.result), `invalid result: ${summary.result}`);
  assert(summary.evidenceBoundary === "automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence", "missing evidence boundary");
  assert(summary.assertionModel === "visible-dom-user-action-v1", "visible DOM assertion model missing");
  assertAdapterPlan();
  if (summary.nativeAdapterRequired === true) {
    assert(summary.selectedAdapter.engine === "playwright-native", "native-required summary must select playwright-native");
    assert(summary.selectedAdapter.fallbackUsed === false, "native-required summary must reject fallback");
    for (const capability of ["wait", "click", "select", "screenshot"]) {
      assert(summary.selectedAdapter.capabilities?.includes(capability), `native-required summary missing ${capability}`);
    }
    for (const item of getCases()) {
      assert(item.interactionEvidence?.dispatch === "playwright-native", `${item.caseId} primary dispatch must be playwright-native`);
      assert((item.interactionEvidence?.setup || []).every(step => step.dispatch === "playwright-native"), `${item.caseId} setup dispatch must be playwright-native`);
    }
  }
});

check("summary counts match case statuses", () => {
  const cases = getCases();
  const pass = cases.filter(item => item.status === "PASS").length;
  const fail = cases.filter(item => item.status === "FAIL").length;
  const notRun = cases.filter(item => item.status === "not-run").length;
  assert(summary.caseCount === cases.length, `caseCount mismatch: ${summary.caseCount} vs ${cases.length}`);
  assert(summary.pass === pass, `pass count mismatch: ${summary.pass} vs ${pass}`);
  assert(summary.fail === fail, `fail count mismatch: ${summary.fail} vs ${fail}`);
  assert(summary.notRun === notRun, `notRun count mismatch: ${summary.notRun} vs ${notRun}`);
  assert(summary.result === (fail > 0 ? "FAIL" : "PASS"), "result does not match fail count");
  const failedInteractionCount = Number(summary.failedInteractionCount ?? fail);
  assert(Number.isInteger(failedInteractionCount) && failedInteractionCount === fail, `failedInteractionCount mismatch: ${summary.failedInteractionCount} vs ${fail}`);
  if (summary.result === "PASS") {
    assert(summary.fail === 0, "PASS summary must have fail=0");
    assert(summary.notRun === 0, "PASS summary must have notRun=0");
    assert(summary.manualIntervention === false, "PASS summary must have manualIntervention=false");
    assert(failedInteractionCount === 0, "PASS summary must have failed interaction 0");
  }
});

check("v3 case manifest keeps exact UI-108 through UI-115 visible assertions", () => {
  if (summary.caseManifestSchema !== "media-server.v390-ui-automation-cases.v3") return;
  assert(JSON.stringify(summary.requiredCaseIds) === JSON.stringify(requiredCaseIds), "requiredCaseIds mismatch");
  assert(JSON.stringify(getCases().map(item => item.caseId)) === JSON.stringify(requiredCaseIds),
    `case IDs must be exact ordered set: ${requiredCaseIds.join(", ")}`);
  const implementationManifest = JSON.parse(fs.readFileSync(
    path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../test/fixtures/project_feature_implementation_evidence.json"),
    "utf8",
  ));
  const implementationById = new Map((implementationManifest.items || []).map(item => [item.id, item]));
  for (const item of getCases()) {
    const implementation = implementationById.get(item.caseId);
    assert(implementation?.uiEvidence?.screenRoute === item.route, `${item.caseId} route differs from exact manifest`);
    assert(item.interaction?.kind === "click" && Boolean(item.interaction.selector), `${item.caseId} missing interaction`);
    assert(Boolean(item.targetSelector), `${item.caseId} missing targetSelector`);
    assert(Array.isArray(item.stateSelectors) && item.stateSelectors.length > 0, `${item.caseId} missing stateSelectors`);
    assert(Array.isArray(item.visibleAssertions) && item.visibleAssertions.length > 0, `${item.caseId} missing visibleAssertions`);
    assert(JSON.stringify(item.visibleAssertions.map(assertion => assertion.selector)) === JSON.stringify(item.stateSelectors), `${item.caseId} visible assertion selectors mismatch`);
    assert(item.interactionEvidence && typeof item.interactionEvidence.executed === "boolean", `${item.caseId} missing interactionEvidence`);
    assert(item.stateEvidence && Array.isArray(item.stateEvidence.after), `${item.caseId} missing stateEvidence`);
    assert(Object.prototype.hasOwnProperty.call(item, "failureEvidence"), `${item.caseId} missing failureEvidence`);
    if (summary.selectedAdapter.engine !== "playwright-fixture" && !summary.selectedAdapter.engine.endsWith("-fixture")) {
      if (item.status === "PASS") {
        assert(item.interactionEvidence.executed === true, `${item.caseId} PASS must execute its control action`);
        assert(item.stateEvidence.target?.visible === true, `${item.caseId} PASS target must be visible`);
        assert(item.stateEvidence.after.every(state => state.exists && state.text), `${item.caseId} PASS state evidence incomplete`);
        assert(item.stateEvidence.assertions?.length === item.visibleAssertions.length, `${item.caseId} visible assertion evidence count mismatch`);
        assert(item.stateEvidence.assertions.every(assertion => assertion.pass && assertion.visible && assertion.sourceBoundary === "exact-selector-visible-innerText-only"), `${item.caseId} visible assertion evidence incomplete`);
      }
      if (item.status === "FAIL") {
        assert(item.failureEvidence?.reason, `${item.caseId} FAIL missing failure reason`);
      }
    }
  }
});

check("cases keep route/control/action granularity", () => {
  for (const item of getCases()) {
    for (const field of ["caseId", "featureId", "route", "controlAction", "expectedResult", "actualResult", "accountRole", "theme"]) {
      assert(Boolean(item[field]), `${item.caseId || "(unknown)"} missing ${field}`);
    }
    assert(item.viewport && Number.isInteger(item.viewport.width) && Number.isInteger(item.viewport.height), `${item.caseId} missing viewport`);
    assert(Array.isArray(item.visibleAssertions) && item.visibleAssertions.length > 0, `${item.caseId} missing visibleAssertions`);
    assert(item.assertionModel === "visible-dom-user-action-v1", `${item.caseId} assertion model mismatch`);
    assert(["PASS", "FAIL", "not-run"].includes(item.status), `${item.caseId} invalid status ${item.status}`);
    assert(item.manualIntervention === false, `${item.caseId} must have manualIntervention=false`);
    assert(Boolean(item.cleanupPortState), `${item.caseId} missing cleanupPortState`);
    assert(Array.isArray(item.browserConsole), `${item.caseId} browserConsole must be an array`);
    assert(item.adapterEvidence && item.adapterEvidence.tool === summary.browserMode, `${item.caseId} missing adapterEvidence`);
    assert(item.adapterEvidence.engine === summary.selectedAdapter.engine, `${item.caseId} adapterEvidence engine mismatch`);
    assertCaseArtifacts(item);
    assertBrowserConsoleAllowed(item);
  }
});

check("failure report includes investigation evidence fields", () => {
  for (const item of getCases().filter(entry => entry.status === "FAIL")) {
    for (const field of [
      "screenshotPath",
      "tracePath",
      "videoPath",
      "browserConsole",
      "serverLogReference",
      "cleanupPortState",
      "manualIntervention",
      "failureEvidence",
    ]) {
      assert(Object.prototype.hasOwnProperty.call(item, field), `${item.caseId} missing failure field ${field}`);
    }
    assert(item.manualIntervention === false, `${item.caseId} must not require manual intervention`);
    assert(Array.isArray(item.browserConsole), `${item.caseId} browserConsole must be an array`);
  }
});

check("failure stops later cases as not-run", () => {
  let sawFailure = false;
  for (const item of getCases()) {
    if (sawFailure) {
      assert(item.status === "not-run", `${item.caseId} must be not-run after first failed interaction`);
    }
    if (item.status === "FAIL") sawFailure = true;
  }
});

check("cleanup and report artifacts are recorded", () => {
  assert(summary.cleanup && summary.cleanup.coreServerStopped === true, "cleanup.coreServerStopped must be true");
  assert(summary.cleanup.authServerStopped === true, "cleanup.authServerStopped must be true");
  assert(summary.cleanup.portsClean === true, "cleanup.portsClean must be true");
  for (const field of ["outputDir", "summaryPath", "reportPath", "screenshotsDir", "tracesDir"]) {
    assert(Boolean(summary[field]), `summary missing ${field}`);
  }
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 UI automation report summary ==");
console.log("- schema: media-server.v390-ui-automation.v1");
console.log(`- summary: ${summaryPath}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function parseSummaryPath(args) {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--summary") return args[index + 1] || "";
  }
  throw new Error("--summary is required");
}

function getCases() {
  assert(Array.isArray(summary.cases), "summary.cases must be an array");
  return summary.cases;
}

function assertCaseArtifacts(item) {
  for (const field of ["screenshotPath", "tracePath", "videoPath", "browserConsolePath", "serverLogReference"]) {
    const value = item[field];
    assert(Boolean(value), `${item.caseId} missing ${field}`);
    const resolved = path.resolve(path.dirname(summaryPath), value);
    assert(fs.existsSync(resolved), `${item.caseId} ${field} does not exist: ${value}`);
  }
}

function assertBrowserConsoleAllowed(item) {
  const noisyEntries = [
    ...item.browserConsole,
    ...readBrowserConsoleArtifact(item.browserConsolePath),
  ].filter(entry => isConsoleWarningOrError(entry));
  if (noisyEntries.length === 0) return;
  const allowReason = String(item.browserConsoleAllowReason || item.browserConsoleAllowedReason || summary.browserConsoleAllowReason || "").trim();
  assert(allowReason, `${item.caseId} browserConsole warnings/errors require browserConsoleAllowReason`);
}

function readBrowserConsoleArtifact(consolePath) {
  if (!consolePath) return [];
  const resolved = path.resolve(path.dirname(summaryPath), consolePath);
  assert(fs.existsSync(resolved), `browser console artifact does not exist: ${consolePath}`);
  const payload = JSON.parse(fs.readFileSync(resolved, "utf8"));
  assert(Array.isArray(payload), `browser console artifact must be an array: ${consolePath}`);
  return payload;
}

function assertAdapterPlan() {
  assert(Array.isArray(summary.adapterPlan), "summary.adapterPlan must be an array");
  const order = summary.adapterPlan.map(item => item.tool).join(">");
  assert(order === "playwright>selenium>sikulix", `adapter plan order mismatch: ${order}`);
  assert(summary.selectedAdapter && summary.selectedAdapter.tool === summary.browserMode, "selectedAdapter must match browserMode");
  assert(Boolean(summary.selectedAdapter.engine), "selectedAdapter.engine is required");
  assert(Array.isArray(summary.adapterAttempts) && summary.adapterAttempts.length > 0, "summary.adapterAttempts required");
}

function isConsoleWarningOrError(entry) {
  if (entry === null || entry === undefined) return false;
  if (typeof entry === "string") return /\b(error|warning|warn)\b/i.test(entry);
  const level = String(entry.level || entry.severity || entry.type || "").toLowerCase();
  return level === "error" || level === "warning" || level === "warn";
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  const total = checks.length;
  for (let index = 0; index < checks.length; index += 1) {
    const item = checks[index];
    const current = index + 1;
    const remaining = total - current;
    console.log(`[progress] (${current}/${total}) ${item.name} test; remaining=${remaining}`);
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
