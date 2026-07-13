#!/usr/bin/env node
// 파일 용도: REVIEW4 current source 판정, metric, readiness/execution 경계를 독립 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390-REVIEW4-50 current truth reset contract

Usage:
  ./server.sh verify-v390-review4-truth-reset

Checks:
  - 통합 순번 1~35 source 판정 18/13/4와 exact partition
  - REVIEW4-50 시점 discovery source 606 snapshot과 HTTP/UI current line 수의 의미 경계
  - exact workflow readiness와 actual automation execution 완료 field 분리
  - REVIEW3 완료 표현을 historical source claim으로 제한
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixture = readJson("test/fixtures/v390_review4_truth_reset.json");
const discovery = readJson("test/fixtures/v390_review3_discovery_ledger.json");
const coverage = readJson("test/fixtures/v390_ui_automation_coverage_policy.json");
const backlog = readText("docs/development-backlog.md");
const coverageDoc = readText("docs/v390-ui-automation-coverage-matrix.md");
const featureInventory = readText("docs/v390-feature-completion-inventory.md");
const checks = [];

check("source implementation classifications form an exact 1..35 partition", () => {
  assert(fixture.schema === "media-server.v390-review4-truth-reset.v2", "truth reset schema mismatch");
  const groups = fixture.classifications;
  for (const [key, expected] of Object.entries(fixture.expectedCounts)) {
    if (key === "total") continue;
    assert(groups[key].length === expected, `${key} count mismatch`);
  }
  const all = Object.values(groups).flat().sort((a, b) => a - b);
  assert(all.length === fixture.expectedCounts.total, "truth reset total mismatch");
  assert(new Set(all).size === all.length, "truth reset classification duplicate");
  assert(JSON.stringify(all) === JSON.stringify(Array.from({ length: 35 }, (_, index) => index + 1)),
    "truth reset classifications must cover exact 1..35");
  assert(fixture.classificationBoundary === "source-implementation-only-not-runtime-pass",
    "source/runtime boundary missing");
});

check("REVIEW4-50 source snapshot is separated from current line metrics", () => {
  assert(fixture.review4_50SnapshotMetrics.discoverySourceFiles === 606,
    "REVIEW4-50 discovery snapshot drift");
  assert(discovery.summary?.sourceFiles >= fixture.review4_50SnapshotMetrics.discoverySourceFiles,
    "current discovery source set predates REVIEW4-50 snapshot");
  assert(gitFileLineCount(fixture.auditBaseCommit, "src/ingress/webrtc_http_server.cpp") ===
      fixture.review4_50SnapshotMetrics.httpServerLines,
    "REVIEW4-50 HTTP server snapshot drift");
  assert(gitFileLineCount(fixture.auditBaseCommit, "src/ingress/product_ui_page_scripts.cpp") ===
      fixture.review4_50SnapshotMetrics.productUiScriptLines,
    "REVIEW4-50 product UI script snapshot drift");
  assert(lineCount("src/ingress/webrtc_http_server.cpp") >= fixture.review4_50SnapshotMetrics.httpServerLines,
    "current HTTP server predates REVIEW4-50 snapshot");
  assert(lineCount("src/ingress/product_ui_page_scripts.cpp") >= fixture.review4_50SnapshotMetrics.productUiScriptLines,
    "current product UI script predates REVIEW4-50 snapshot");
});

check("coverage policy separates readiness from actual execution", () => {
  assert(coverage.schema === "media-server.v390-ui-automation-coverage-policy.v4",
    "coverage policy schema mismatch");
  assert(coverage.boundaries?.exactNativeWorkflowReadinessComplete === false,
    "exact workflow readiness must remain false until REVIEW4-60");
  assert(coverage.boundaries?.canonicalRequestedObservedSchemaComplete === true,
    "REVIEW4-57 requested/observed schema closure missing");
  assert(coverage.boundaries?.primaryActionCompletionOracleComplete === true,
    "REVIEW4-58 primary action completion oracle closure missing");
  assert(coverage.boundaries?.visualMatrixComplete === true,
    "REVIEW4-59 visual matrix closure missing");
  assert(coverage.boundaries?.actualAutomationExecutionComplete === false,
    "actual automation execution boundary mismatch");
  assert(coverage.boundaries?.manualUiFulltestEvidence === false,
    "manual UI fulltest boundary mismatch");
  assert(!Object.hasOwn(coverage.boundaries || {}, "fullAutomationCoverage"),
    "ambiguous fullAutomationCoverage field remains");
  for (const snippet of [
    "exactNativeWorkflowReadinessComplete: `false`",
    "canonicalRequestedObservedSchemaComplete: `true`",
    "primaryActionCompletionOracleComplete: `true`",
    "visualMatrixComplete: `true`",
    "actualAutomationExecutionComplete: `false`",
    "manualUiFulltestEvidence: `false`",
  ]) assert(coverageDoc.includes(snippet), `coverage document missing ${snippet}`);
});

check("roadmap records current 18/13/4 without runtime PASS overclaim", () => {
  for (const snippet of [
    "집계: source 구현 확인 18, source 부분 구현 13, source 미완성 4",
    "source 구현 확인은 runtime, UI, 30분, 120분 PASS가 아닙니다",
    "| 50 | V390-REVIEW4-50 | Foundation | roadmap truth reset과 current 기준 정렬 | P0 | 완료 |",
    "606개 source/tooling file marker 분류",
  ]) assert(backlog.includes(snippet), `backlog current truth missing: ${snippet}`);
});

check("stale current line-count claims are removed", () => {
  for (const stale of ["41,399-line", "42,726줄"]) {
    assert(!featureInventory.includes(stale), `feature inventory stale metric remains: ${stale}`);
    assert(!backlog.includes(stale), `backlog stale current metric remains: ${stale}`);
  }
  assert(featureInventory.includes("42,897-line"), "feature inventory current HTTP line count missing");
});

console.log("== V390-REVIEW4-50 current truth reset ==");
for (const item of checks) console.log(`- ${item.status}: ${item.name}`);
console.log(`- summary: pass=${checks.filter(item => item.status === "PASS").length} fail=${checks.filter(item => item.status === "FAIL").length}`);
if (checks.some(item => item.status === "FAIL")) process.exit(1);

function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL" }); console.error(`[FAIL] ${name}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(file) { return fs.readFileSync(path.join(rootDir, file), "utf8"); }
function readJson(file) { return JSON.parse(readText(file)); }
function lineCount(file) { return readText(file).split(/\n/).length - 1; }
function gitFileLineCount(commit, file) {
  const text = execFileSync("git", ["show", `${commit}:${file}`], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return text.split(/\n/).length - 1;
}
