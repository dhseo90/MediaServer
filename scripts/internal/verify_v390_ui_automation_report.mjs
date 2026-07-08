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
  - wrapper/static evidence is not promoted to manual UI fulltest evidence
`);
}

assertKnownOptions(rawArgs, ["summary", "h", "help"]);

const summaryPath = parseSummaryPath(rawArgs);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const checks = [];

check("summary uses v390 UI automation schema", () => {
  assert(summary.schema === "media-server.v390-ui-automation.v1", `unexpected schema: ${summary.schema}`);
  assert(typeof summary.runId === "string" && summary.runId.startsWith("v390-ui-automation-"), "missing v390 runId");
  assert(["PASS", "FAIL"].includes(summary.result), `invalid result: ${summary.result}`);
  assert(summary.evidenceBoundary === "automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence", "missing evidence boundary");
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
});

check("cases keep route/control/action granularity", () => {
  for (const item of getCases()) {
    for (const field of ["caseId", "featureId", "route", "controlAction", "expectedResult", "actualResult", "accountRole", "theme"]) {
      assert(Boolean(item[field]), `${item.caseId || "(unknown)"} missing ${field}`);
    }
    assert(item.viewport && Number.isInteger(item.viewport.width) && Number.isInteger(item.viewport.height), `${item.caseId} missing viewport`);
    assert(Array.isArray(item.expectedMarkers) && item.expectedMarkers.length > 0, `${item.caseId} missing expectedMarkers`);
    assert(["PASS", "FAIL", "not-run"].includes(item.status), `${item.caseId} invalid status ${item.status}`);
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
    ]) {
      assert(Object.prototype.hasOwnProperty.call(item, field), `${item.caseId} missing failure field ${field}`);
    }
    assert(item.manualIntervention === false, `${item.caseId} must not require manual intervention`);
    assert(Array.isArray(item.browserConsole), `${item.caseId} browserConsole must be an array`);
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

function check(name, fn) {
  checks.push({ name, fn });
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
