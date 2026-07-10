#!/usr/bin/env node
// 파일 용도: v3.9.0 Evidence/Test Gate와 Test Model Prep 기준의 오판 방지 연결을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 evidence/test gate and test model prep verification

Usage:
  ./server.sh verify-v390-evidence-test-gate-prep

Checks:
  - UI one-shot wrapper summary has explicit wrapper/evidence/longrun status fields
  - feature inventory coverage report uses covered/missing mapping wording, not execution PASS wording
  - longrun runner criteria define one-command stop-on-first-fail evidence
  - UI automation adapter criteria define free tool priority and failure report fields
  - backlog, v390 inventory, project inventory, release records/evidence, server dispatch, and script inventory track the gate

Not run by this command:
  - UI fulltest direct manipulation
  - 30/120 minute longrun
  - published metadata verification
  - release actions
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-evidence-test-gate-prep";
const targetScript = "verify_v390_evidence_test_gate_prep.mjs";
const files = {
  uiWrapper: readText("scripts/internal/verify_ui_fulltest_one_shot.mjs"),
  coverage: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  manualUi: readText("docs/manual-ui-fulltest.md"),
  stream: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  featureInventory: readText("docs/v390-feature-completion-inventory.md"),
  backlog: readText("docs/development-backlog.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
};

const checks = [];

check("UI one-shot wrapper writes explicit evidence status schema", () => {
  for (const snippet of [
    "wrapperResult",
    "resultScope",
    "wrapper-only",
    "uiFulltestEvidenceStatus",
    "manualResultStatus",
    "longrunStatus",
    "not-run-by-this-wrapper",
    "evidenceBoundary",
    "wrapperResult is not UI fulltest, 30-minute, 120-minute, or manual-result execution evidence",
  ]) {
    assertIncludes(files.uiWrapper, snippet, "UI wrapper script");
  }
});

check("manual UI docs explain wrapper result schema boundaries", () => {
  for (const snippet of [
    "v3.9.0부터 wrapper summary는 아래 필드를 반드시 포함합니다",
    "`wrapperResult`",
    "`resultScope`",
    "`uiFulltestEvidenceStatus`",
    "`manualResultStatus`",
    "`longrunStatus`",
    "longrun 실행 evidence로 사용할 수 없습니다",
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI wrapper schema docs");
  }
});

check("feature coverage report uses covered/missing and not execution evidence", () => {
  for (const snippet of [
    "coverageStatus",
    "covered",
    "missing",
    "executionEvidenceStatus",
    "not-execution-evidence",
    "coverage status / execution evidence",
  ]) {
    assertIncludes(files.coverage, snippet, "feature inventory coverage script");
  }
  assert(!files.coverage.includes("item.status === \"PASS\""), "coverage script must not count per-feature PASS status");
  assert(!files.coverage.includes("item.status === \"FAIL\""), "coverage script must not count per-feature FAIL status");
});

check("project inventory documents coverage mapping as non-execution evidence", () => {
  for (const snippet of [
    "coverageStatus: covered/missing",
    "executionEvidenceStatus: not-execution-evidence",
    "covered는 mapping coverage이며 실행 PASS가 아님",
    "v3.9.0 (8) feature inventory coverage wording 오판 방지",
    "`OPS-167`, `SAFE-200`",
    "| SAFE-200 |",
    "| OPS-167 |",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory coverage wording");
  }
});

check("stream verification records AI-minimized longrun runner criteria", () => {
  for (const snippet of [
    "v3.9.0 AI-minimized server longrun runner 기준",
    "one command",
    "fixed phase order",
    "stop-on-first-fail",
    "`not-run`",
    "command, exit code, phase, port, route, log path, summary path, report path, cleanup state",
    "wrapper, preflight, dry-run, field smoke, no-device는 다섯 번째 테스트 영역이 아니며",
    "v3.9.0 (9) AI-minimized server longrun runner 기준",
    "`OPS-168`, `SAFE-201`",
  ]) {
    assertIncludes(files.stream + "\n" + files.projectInventory, snippet, "longrun runner criteria");
  }
});

check("manual UI docs record free automation adapter criteria and failure fields", () => {
  for (const snippet of [
    "Playwright",
    "Selenium",
    "SikuliX",
    "route",
    "viewport",
    "theme",
    "account/role",
    "expected result",
    "actual result",
    "screenshot",
    "trace/video",
    "browser console",
    "server log reference",
    "cleanup/port state",
    "manual intervention",
    "v3.9.0 AI-minimized UI automation adapter / Policy v4 기준",
    "`OPS-169`, `SAFE-202`",
  ]) {
    assertIncludes(files.manualUi + "\n" + files.projectInventory, snippet, "UI automation adapter criteria");
  }
});

check("v390 inventory and backlog close approved items without execution overclaim", () => {
  for (const snippet of [
    "| 7 | v3.9.0 (7) UI wrapper/result schema 오판 방지 | P0 | 완료 |",
    "| 8 | v3.9.0 (8) feature inventory coverage wording 오판 방지 | P0 | 완료 |",
    "| 9 | v3.9.0 (9) AI-minimized server longrun runner 기준 | P0 | 완료 |",
    "| 10 | v3.9.0 (10) AI-minimized UI automation adapter 기준 | P0 | 완료 |",
    "Evidence/Test Gate and Test Model Prep 개발 기록",
    "Closed approved items: `V390-CAND-007`, `V390-CAND-008`, `V390-CLOSED-003`, `V390-CLOSED-004`",
    "UI wrapper/result schema closeout is not UI 풀테스트 직접 조작 evidence",
    "AI-minimized server longrun runner criteria are not 30분/120분 longrun execution evidence",
  ]) {
    assertIncludes(files.backlog + "\n" + files.featureInventory, snippet, "backlog/v390 inventory closeout");
  }
});

check("release records and evidence index track the gate and not-run boundaries", () => {
  for (const snippet of [
    "V390 Evidence/Test Gate and Test Model Prep",
    "v390 Evidence/Test Gate RED gate",
    "v390 Evidence/Test Gate and Test Model Prep final",
    "v390 Evidence/Test Gate companion static gates final",
    "v390 30분 longrun",
    "v390 120분 longrun",
    "v390 UI 풀테스트",
    "v3.9.0 Evidence/Test Gate and Test Model Prep",
    command,
    "OPS-166",
    "SAFE-202",
  ]) {
    assertIncludes(files.releaseRecords + "\n" + files.releaseEvidence, snippet, "release records/evidence");
  }
});

check("server dispatch and script inventory expose the gate", () => {
  for (const snippet of [
    command,
    targetScript,
    "v3.9.0 Evidence/Test Gate와 Test Model Prep 오판 방지 기준을 검증합니다.",
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh");
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 evidence/test gate and test model prep summary ==");
console.log("- schema: media-server.v390-evidence-test-gate-prep.v1");
console.log(`- command: ${command}`);
console.log("- uiWrapperSchema: wrapper-only");
console.log("- featureCoverageStatus: covered/missing");
console.log("- longrunRunnerCriteria: stop-on-first-fail");
console.log("- uiAutomationAdapterCriteria: free-tool-first");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30: not-run-by-this-command");
console.log("- longrun120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
