#!/usr/bin/env node
// 파일 용도: v3.9.0 R5 UI automation report replay guard가 깨진 summary를 거절하는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation report replay guard contract

Usage:
  ./server.sh verify-v390-ui-automation-report-replay-guard

Checks:
  - report replay accepts a complete PASS summary
  - PASS summaries require zero fail/not-run/manual-intervention counts
  - every case records existing screenshot/trace/video/browser-console/server-log artifacts
  - PASS summaries reject browser console warnings/errors unless an allow reason is recorded
  - FAIL summaries require later cases to remain not-run
  - docs, release evidence, script inventory, and server dispatch expose the R5 guard
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const reportCommand = "verify-v390-ui-automation-report";
const guardCommand = "verify-v390-ui-automation-report-replay-guard";
const guardScript = "verify_v390_ui_automation_report_replay_guard_contract.mjs";
const checks = [];

check("server dispatch and script inventory expose the R5 replay guard", () => {
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  assertIncludes(serverSh, guardCommand, "server.sh R5 command");
  assertIncludes(serverSh, guardScript, "server.sh R5 script");
  assertIncludes(scriptInventory, guardScript, "script inventory R5 script");
});

check("complete PASS summary validates through report replay", () => {
  const workspace = makeWorkspace("valid");
  const summaryPath = writeSummary(workspace, makeBaseSummary(workspace));
  const run = runReport(summaryPath);
  assert(run.status === "passed", `valid summary must pass:\n${run.stdout}\n${run.stderr}`);
  assert(run.stdout.includes("[progress]"), "report verifier must show progress output");
});

check("PASS summary rejects not-run, fail, and manual-intervention drift", () => {
  expectReportFailure("pass-with-not-run", summary => {
    summary.result = "PASS";
    summary.cases[1].status = "not-run";
    summary.cases[1].actualResult = "not run without previous failure";
    summary.pass = 2;
    summary.notRun = 1;
  });
  expectReportFailure("summary-manual-intervention", summary => {
    summary.manualIntervention = true;
  });
  expectReportFailure("case-manual-intervention", summary => {
    summary.cases[0].manualIntervention = true;
  });
});

check("case artifact fields are required", () => {
  expectReportFailure("missing-screenshot-field", summary => {
    delete summary.cases[0].screenshotPath;
  });
});

check("screenshot, trace, and log artifact files must exist", () => {
  expectReportFailure("missing-screenshot-file", summary => {
    fs.rmSync(summary.cases[0].screenshotPath, { force: true });
  });
  expectReportFailure("missing-trace-file-with-reason", summary => {
    fs.rmSync(summary.cases[0].tracePath, { force: true });
    summary.cases[0].artifactPreservationReason = "artifact intentionally omitted from replay fixture";
  });
  expectReportFailure("missing-browser-console-log-with-reason", summary => {
    fs.rmSync(summary.cases[0].browserConsolePath, { force: true });
    summary.cases[0].artifactPreservationReason = "artifact intentionally omitted from replay fixture";
  });
  expectReportFailure("missing-server-log-with-reason", summary => {
    fs.rmSync(summary.cases[0].serverLogReference, { force: true });
    summary.cases[0].artifactPreservationReason = "artifact intentionally omitted from replay fixture";
  });
});

check("PASS summary rejects browser console warnings or errors without an allow reason", () => {
  expectReportFailure("console-warning", summary => {
    summary.cases[0].browserConsole = [{ level: "warning", text: "fixture warning" }];
  });
  const workspace = makeWorkspace("console-warning-allowed");
  const summary = makeBaseSummary(workspace);
  summary.cases[0].browserConsole = [{ level: "warning", text: "known browser preload warning" }];
  summary.cases[0].browserConsoleAllowReason = "browser preload warning is not product UI code";
  const run = runReport(writeSummary(workspace, summary));
  assert(run.status === "passed", `console warning with allow reason should pass:\n${run.stdout}\n${run.stderr}`);
});

check("FAIL summary keeps later cases not-run", () => {
  expectReportFailure("fail-later-pass", summary => {
    summary.result = "FAIL";
    summary.automationResult = "FAIL";
    summary.failedCaseId = summary.cases[1].caseId;
    summary.cases[1].status = "FAIL";
    summary.cases[1].actualResult = "fixture failure";
    summary.cases[2].status = "PASS";
    summary.cases[2].actualResult = "incorrectly continued after failure";
    summary.pass = 2;
    summary.fail = 1;
    summary.notRun = 0;
    summary.failedInteractionCount = 1;
  });
});

check("docs and release evidence record the R5 replay guard without overclaiming UI fulltest", () => {
  const combinedDocs = [
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/release-test-records.md"),
    readText("docs/release-evidence-index.md"),
    readText("docs/stream-verification.md"),
  ].join("\n");
  for (const snippet of [
    "v3.9.0 R5 UI automation report replay guard",
    guardCommand,
    "failed interaction 0",
    "browserConsole",
    "artifact files exist",
    "UI 풀테스트 직접 조작 PASS가 아님",
  ]) {
    assertIncludes(combinedDocs, snippet, "R5 docs/evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 UI automation report replay guard contract summary ==");
console.log("- schema: media-server.v390-ui-automation-report-replay-guard.v1");
console.log(`- reportCommand: ${reportCommand}`);
console.log(`- guardCommand: ${guardCommand}`);
console.log("- realUiAutomation: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function makeBaseSummary(workspace) {
  const cases = [1, 2, 3].map(index => makeCase(workspace, `UI-R5-${index}`, "PASS"));
  return {
    schema: "media-server.v390-ui-automation.v1",
    runId: `v390-ui-automation-r5-contract-${process.pid}`,
    command: "./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final",
    browserMode: "playwright",
    toolSelection: makeAdapterPlan(),
    adapterPlan: makeAdapterPlan(),
    selectedAdapter: {
      tool: "playwright",
      engine: "playwright-fixture",
      fallbackUsed: false,
      fallbackReason: "",
      visualOnly: false,
      dependencyStatus: "fixture",
    },
    adapterAttempts: [
      {
        tool: "playwright",
        engine: "playwright-fixture",
        status: "selected",
        reason: "R5 replay guard fixture",
      },
    ],
    result: "PASS",
    automationResult: "PASS",
    evidenceBoundary: "automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence",
    manualIntervention: false,
    failedInteractionCount: 0,
    caseCount: cases.length,
    pass: cases.length,
    fail: 0,
    notRun: 0,
    failedCaseId: "",
    outputDir: workspace,
    summaryPath: path.join(workspace, "summary.json"),
    reportPath: path.join(workspace, "report.md"),
    screenshotsDir: path.join(workspace, "screenshots"),
    tracesDir: path.join(workspace, "traces"),
    logsDir: path.join(workspace, "logs"),
    cleanup: {
      coreServerStopped: true,
      authServerStopped: true,
      portsClean: true,
    },
    cases,
  };
}

function makeCase(workspace, caseId, status) {
  const safeId = caseId.toLowerCase();
  const screenshotPath = path.join(workspace, "screenshots", `${safeId}.png`);
  const tracePath = path.join(workspace, "traces", `${safeId}.trace.json`);
  const videoPath = path.join(workspace, "traces", `${safeId}.video.txt`);
  const browserConsolePath = path.join(workspace, "logs", `${safeId}.browser-console.json`);
  const serverLogReference = path.join(workspace, "logs", `${safeId}.server.log`);
  for (const [filePath, content] of [
    [screenshotPath, "fixture screenshot\n"],
    [tracePath, "{}\n"],
    [videoPath, "fixture video\n"],
    [browserConsolePath, "[]\n"],
    [serverLogReference, "fixture server log\n"],
  ]) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
  return {
    caseId,
    featureId: "SAFE-202",
    route: "/ops/rules",
    viewport: { width: 390, height: 844 },
    theme: "light",
    accountRole: "operator",
    controlAction: "r5-replay-fixture",
    expectedResult: "all expected replay evidence is present",
    expectedMarkers: ["manualIntervention=false"],
    actualResult: status === "PASS" ? "fixture pass" : "not run",
    status,
    screenshotPath,
    tracePath,
    videoPath,
    browserConsolePath,
    browserConsole: [],
    serverLogReference,
    cleanupPortState: "clean",
    manualIntervention: false,
    adapterEvidence: {
      tool: "playwright",
      engine: "playwright-fixture",
      fallbackUsed: false,
      fallbackReason: "",
      dependencyStatus: "fixture",
      visualOnly: false,
    },
  };
}

function makeAdapterPlan() {
  return [
    { tool: "playwright", priority: 1, selected: true, role: "primary-dom-automation" },
    { tool: "selenium", priority: 2, selected: false, role: "webdriver-fallback" },
    { tool: "sikulix", priority: 3, selected: false, role: "visual-fallback", visualOnly: true },
  ];
}

function expectReportFailure(label, mutate) {
  const workspace = makeWorkspace(label);
  const summary = makeBaseSummary(workspace);
  mutate(summary);
  const run = runReport(writeSummary(workspace, summary));
  assert(run.status === "failed-as-expected", `${label} should fail replay but passed:\n${run.stdout}`);
}

function writeSummary(workspace, summary) {
  const summaryPath = path.join(workspace, "summary.json");
  const reportPath = path.join(workspace, "report.md");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(reportPath, "# R5 fixture report\n", "utf8");
  return summaryPath;
}

function makeWorkspace(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `media_server_v390_r5_${label}_${process.pid}_`));
}

function runReport(summaryPath) {
  try {
    const stdout = execFileSync(path.join(rootDir, "server.sh"), [reportCommand, "--summary", summaryPath], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: "passed", stdout, stderr: "" };
  } catch (error) {
    return {
      status: "failed-as-expected",
      stdout: error?.stdout ? String(error.stdout) : "",
      stderr: error?.stderr ? String(error.stderr) : "",
    };
  }
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
