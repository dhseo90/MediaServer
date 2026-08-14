#!/usr/bin/env node
// 파일 용도: v3.9.0 UI automation runner/report의 case 단위 failure evidence와 문서/dispatch 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateVisibleAssertions } from "./v390_visible_dom_assertions.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation runner contract verification

Usage:
  ./server.sh verify-v390-ui-automation-runner-contract

Checks:
  - UI automation runner/report commands exist
  - fixture failure records route/control/action failure report and later case not-run
  - fixture pass summary validates through report replay verifier
  - docs, release evidence, project inventory, script inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-ui-automation";
const reportCommand = "verify-v390-ui-automation-report";
const contractCommand = "verify-v390-ui-automation-runner-contract";
const runnerScript = "verify_v390_ui_automation.mjs";
const reportScript = "verify_v390_ui_automation_report.mjs";
const contractScript = "verify_v390_ui_automation_runner_contract.mjs";
const runnerPath = path.join(rootDir, "scripts/internal", runnerScript);
const checks = [];
const temporaryOutputDirs = new Set();
process.on("exit", () => {
  for (const outputDir of temporaryOutputDirs) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

const files = {
  serverSh: readText("server.sh"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  backlog: readText("docs/development-backlog.md"),
  runner: readText("scripts/internal/verify_v390_ui_automation.mjs"),
};

check("server.sh and script inventory expose R2 UI automation commands", () => {
  for (const script of [runnerScript, reportScript, contractScript]) {
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", script)), `missing script: ${script}`);
    assertIncludes(files.serverSh, script, "server.sh R2 dispatch");
    assertIncludes(files.scriptInventory, script, "script inventory R2");
  }
  for (const snippet of [command, reportCommand, contractCommand]) {
    assertIncludes(files.serverSh, snippet, "server.sh R2 command");
  }
  for (const snippet of ["startCoreServer", "openBrowserPage", "evaluateVisibleAssertions", "visibleDomAssertionModel", "waitForHealth"]) {
    assertIncludes(files.runner, snippet, "R2 runner real mode");
  }
  for (const forbidden of ["document.documentElement.outerHTML", "document.body.innerText", "expectedMarkers", "haystack"]) {
    assert(!files.runner.includes(forbidden), `R2 runner forbidden whole-page/source assertion: ${forbidden}`);
  }
  assert(!files.runner.includes('"verify-ui-fulltest-one-shot"'), "R2 runner must not delegate real mode to verify-ui-fulltest-one-shot");
});

check("runner parser supports documented equals-form chrome fallback option", () => {
  assertIncludes(files.runner, 'arg.startsWith("--allow-chrome-fallback=")', "R2 runner allow chrome fallback equals parser");
});

check("runner isolates throwaway ports from local env overrides", () => {
  assertIncludes(files.runner, 'MEDIA_SERVER_SKIP_LOCAL_ENV: "1"', "R2 runner skip local env override");
});

check("case manifest covers exact UI-108 through UI-115 actions and states", () => {
  const run = runFixture("case-completeness", ["--fixture-pass"]);
  assert(run.status === "passed", `case completeness fixture should pass, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  const required = ["UI-108", "UI-109", "UI-110", "UI-111", "UI-112", "UI-113", "UI-114", "UI-115"];
  assert(summary.caseManifestSchema === "media-server.v390-ui-automation-cases.v3", "case manifest schema must be v3");
  assert(summary.assertionModel === "visible-dom-user-action-v1", "assertion model mismatch");
  assert(JSON.stringify(summary.requiredCaseIds) === JSON.stringify(required), "requiredCaseIds mismatch");
  assert(JSON.stringify(summary.cases.map(item => item.caseId)) === JSON.stringify(required), "exact case coverage mismatch");
  const ui112 = summary.cases.find(item => item.caseId === "UI-112");
  assert(ui112?.route === "/ops/sources", "UI-112 route mismatch");
  assert(ui112?.interaction?.selector === "#refresh", "UI-112 interaction mismatch");
  assert(ui112?.targetSelector === "[data-source-staging-restore-validation-handoff]", "UI-112 target mismatch");
  for (const item of summary.cases) {
    assert(item.interaction?.kind === "click", `${item.caseId} missing click interaction`);
    assert(Array.isArray(item.stateSelectors) && item.stateSelectors.length > 0, `${item.caseId} missing state selectors`);
    assert(Array.isArray(item.visibleAssertions) && item.visibleAssertions.length > 0, `${item.caseId} missing visible assertions`);
    assert(item.interactionEvidence && typeof item.interactionEvidence.executed === "boolean", `${item.caseId} missing interaction evidence`);
    assert(item.stateEvidence && Array.isArray(item.stateEvidence.after), `${item.caseId} missing state evidence`);
    assert(Object.prototype.hasOwnProperty.call(item, "failureEvidence"), `${item.caseId} missing failure evidence field`);
  }
  runReportVerifier(run.summaryPath);
});

check("script strings and hidden text cannot satisfy visible DOM assertions", () => {
  const expectation = [{ selector: "#status", textIncludes: ["defer-all-action-writes"] }];
  const scriptOnly = evaluateVisibleAssertions(expectation, [{
    selector: "#status",
    exists: true,
    visible: true,
    text: "all-action-writes-deferred",
    documentSource: "<script>const policy='defer-all-action-writes'</script>",
  }]);
  assert(scriptOnly.pass === false, "script-only marker must not pass");
  assert(scriptOnly.assertions[0].missingText.includes("defer-all-action-writes"), "script-only missing text evidence absent");
  const hidden = evaluateVisibleAssertions(expectation, [{ selector: "#status", exists: true, visible: false, text: "defer-all-action-writes" }]);
  assert(hidden.pass === false, "hidden text must not pass");
  const visible = evaluateVisibleAssertions(expectation, [{ selector: "#status", exists: true, visible: true, text: "defer-all-action-writes" }]);
  assert(visible.pass === true, "visible exact-selector text should pass");
});

check("missing UI-112 and wrong manifest route are rejected", () => {
  const source = readJson(path.join(rootDir, "test/fixtures/v390_ui_automation_cases.json"));
  const missing = structuredClone(source);
  missing.cases = missing.cases.filter(item => item.caseId !== "UI-112");
  expectManifestFailure("missing-ui-112", missing, "case manifest must contain exact ordered IDs");
  const wrongRoute = structuredClone(source);
  wrongRoute.cases.find(item => item.caseId === "UI-113").route = "/ops";
  expectManifestFailure("wrong-ui-113-route", wrongRoute, "UI-113 route mismatch");
});

check("failure fixture records case failure fields and later cases as not-run", () => {
  const run = runFixture("fail", ["--fixture-fail-case", "UI-110"]);
  assert(run.status === "failed-as-expected", `failure fixture should exit non-zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.schema === "media-server.v390-ui-automation.v1", "unexpected summary schema");
  assert(summary.result === "FAIL", "failure fixture result must be FAIL");
  assert(summary.failedCaseId === "UI-110", "failedCaseId must be UI-110");
  const failedCase = summary.cases.find(item => item.caseId === "UI-110");
  assert(failedCase && failedCase.status === "FAIL", "UI-110 must fail");
  assert(failedCase.route === "/ops/rules", "UI-110 route mismatch");
  assert(failedCase.controlAction === "inspect-vlm-rule-draft-bridge", "UI-110 controlAction mismatch");
  assert(failedCase.visibleAssertions?.some(assertion => assertion.textIncludes?.includes("autoApply=false")), "UI-110 visibleAssertions mismatch");
  assert(failedCase.manualIntervention === false, "failure fixture must not require manual intervention");
  assert(Array.isArray(failedCase.browserConsole), "browserConsole must be an array");
  assert(failedCase.failureEvidence?.reason, "UI-110 failure reason missing");
  assert(failedCase.failureEvidence?.failedAction?.selector === "#opsVlmRuleDraftRefresh", "UI-110 failed action mismatch");
  assertAdapterEvidence(summary, failedCase);
  assertArtifactExists(summary, failedCase.browserConsolePath, "UI-110 browserConsolePath");
  assert(summary.cases.some(item => item.caseId === "UI-111" && item.status === "not-run"), "later case UI-111 must be not-run");
  assert(summary.cases.some(item => item.caseId === "UI-112" && item.status === "not-run"), "later case UI-112 must be not-run");
  runReportVerifier(run.summaryPath);
});

check("pass fixture validates through report replay verifier", () => {
  const run = runFixture("pass", ["--fixture-pass"]);
  assert(run.status === "passed", `pass fixture should exit zero, got ${run.status}`);
  const summary = readJson(run.summaryPath);
  assert(summary.result === "PASS", "pass fixture result must be PASS");
  assert(summary.manualIntervention === false, "pass fixture must not require manual intervention");
  assert(summary.cases.every(item => item.status === "PASS"), "all pass fixture cases must PASS");
  assert(summary.evidenceBoundary.includes("automationResult is not manual UI fulltest"), "evidence boundary missing");
  assert(summary.sourceProvenance?.commitSha?.match(/^[a-f0-9]{40}$/), "source commit SHA missing");
  assert(summary.cleanup?.verificationSource === "filesystem-and-port-observation", "cleanup verification source missing");
  assert(Array.isArray(summary.cleanup?.checks) && summary.cleanup.checks.length > 0, "cleanup measured checks missing");
  assert(summary.artifactIntegrity?.placeholderVideoFiles === 0, "placeholder video files must be absent");
  assert(summary.artifactIntegrity?.duplicateScreenshotFilesRemoved > 0, "fixture duplicate screenshot files must be deduplicated");
  assertAdapterPlan(summary);
  for (const item of summary.cases) {
    assertAdapterEvidence(summary, item);
    assertArtifactExists(summary, item.browserConsolePath, `${item.caseId} browserConsolePath`);
    assert(item.videoPath === "", `${item.caseId} videoPath must be empty when capture is unsupported`);
    assert(item.videoEvidence?.status === "not-captured", `${item.caseId} video evidence status missing`);
  }
  assert(!listFiles(summary.outputDir).some(filePath => filePath.endsWith(".video.txt")), "video placeholder file remains");
  runReportVerifier(run.summaryPath);
});

check("docs and release evidence record R2 without overclaiming UI fulltest", () => {
  for (const snippet of [
    "v3.9.0 R2 / V390-ADD1-07~09 native visible DOM UI automation exact case runner",
    command,
    reportCommand,
    contractCommand,
    "media-server.v390-ui-automation.v1",
    "route/control/action",
    "manualIntervention=false",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.projectInventory, snippet, "R2 stream/project docs");
  }
  for (const snippet of [
    "v390 R2 RED UI automation runner contract",
    "v390 R2 UI automation runner final",
    "v390 R2 실제 UI automation suite",
    "automationResult is not manual UI fulltest",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "R2 release records");
  }
  for (const snippet of [
    "v3.9.0 R2 / V390-ADD1-07~09 native visible DOM UI automation exact case runner",
    command,
    reportCommand,
    contractCommand,
    "UI 풀테스트 직접 조작 evidence",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "R2 release evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 UI automation runner contract summary ==");
console.log("- schema: media-server.v390-ui-automation.v1");
console.log(`- command: ${command}`);
console.log(`- reportCommand: ${reportCommand}`);
console.log(`- contractCommand: ${contractCommand}`);
console.log("- realUiAutomation: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runFixture(label, extraArgs) {
  const outputDir = path.join("/tmp", `media_server_v390_ui_automation_contract_${label}_${process.pid}`);
  temporaryOutputDirs.add(outputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  const args = [
    runnerPath,
    "--browser-mode",
    "playwright",
    "--output-dir",
    outputDir,
    ...extraArgs,
  ];
  const expectsFailure = extraArgs.includes("--fixture-fail-case");
  let stdout = "";
  let stderr = "";
  let status = "passed";
  try {
    stdout = execFileSync(process.execPath, args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    status = "failed-as-expected";
    stderr = error?.stderr ? String(error.stderr) : "";
    stdout = error?.stdout ? String(error.stdout) : "";
    if (!expectsFailure) {
      throw new Error(`fixture ${label} failed unexpectedly:\n${stdout}\n${stderr}`);
    }
  }
  return {
    status,
    outputDir,
    summaryPath: path.join(outputDir, "summary.json"),
    reportPath: path.join(outputDir, "report.md"),
    stdout,
    stderr,
  };
}

function runReportVerifier(summaryPath) {
  execFileSync(path.join(rootDir, "server.sh"), [reportCommand, "--summary", summaryPath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function expectManifestFailure(label, manifest, expectedMessage) {
  const fixtureDir = path.join("/tmp", `media_server_v390_ui_manifest_negative_${label}_${process.pid}`);
  const manifestPath = path.join(fixtureDir, "cases.json");
  const outputDir = path.join(fixtureDir, "output");
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  let failed = false;
  try {
    execFileSync(process.execPath, [
      runnerPath,
      "--browser-mode", "playwright",
      "--output-dir", outputDir,
      "--case-manifest", manifestPath,
      "--fixture-pass",
    ], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    failed = true;
    const output = `${String(error?.stdout || "")}\n${String(error?.stderr || "")}`;
    assert(output.includes(expectedMessage), `${label} missing expected error: ${expectedMessage}`);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
  assert(failed, `${label} must fail`);
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
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

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assertAdapterPlan(summary) {
  assert(Array.isArray(summary.adapterPlan), "summary.adapterPlan must be an array");
  const order = summary.adapterPlan.map(item => item.tool).join(">");
  assert(order === "playwright>selenium>sikulix", `adapter plan order mismatch: ${order}`);
  assert(summary.selectedAdapter && summary.selectedAdapter.tool === summary.browserMode, "selectedAdapter must match browserMode");
  assert(Boolean(summary.selectedAdapter.engine), "selectedAdapter.engine is required");
  assert(Array.isArray(summary.adapterAttempts) && summary.adapterAttempts.length > 0, "summary.adapterAttempts required");
}

function assertAdapterEvidence(summary, item) {
  assertAdapterPlan(summary);
  assert(item.adapterEvidence && item.adapterEvidence.tool === summary.browserMode, `${item.caseId} adapterEvidence tool mismatch`);
  assert(item.adapterEvidence.engine === summary.selectedAdapter.engine, `${item.caseId} adapterEvidence engine mismatch`);
  assert(Object.prototype.hasOwnProperty.call(item.adapterEvidence, "fallbackUsed"), `${item.caseId} adapterEvidence fallbackUsed missing`);
}

function assertArtifactExists(summary, artifactPath, label) {
  assert(Boolean(artifactPath), `${label} missing`);
  const resolved = path.resolve(path.dirname(summary.summaryPath), artifactPath);
  assert(fs.existsSync(resolved), `${label} does not exist: ${artifactPath}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
