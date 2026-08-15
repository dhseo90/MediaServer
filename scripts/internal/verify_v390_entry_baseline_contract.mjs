#!/usr/bin/env node
// 파일 용도: v3.9 historical entry baseline의 상태 parser와 current-source 비회귀 contract를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadV390EntryBaselineExpectation,
  validateV390EntryBaselineSteps,
} from "./v390_entry_baseline_state_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 historical entry baseline contract

Usage:
  ./server.sh verify-v390-entry-baseline-contract

Checks current backlog positive and historical wording, missing Step, duplicate Step negatives,
and the current-source/historical-baseline version boundary.`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = fs.readFileSync(path.join(rootDir, "docs/development-backlog.md"), "utf8");
const verifierSource = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_v390_entry_baseline.mjs"), "utf8");
const expectation = loadV390EntryBaselineExpectation(rootDir);

const cases = [
  {
    name: "current-backlog-positive",
    markdown: backlog,
    expectedOk: true,
    expectedError: "",
  },
  {
    name: "historical-exact-wording-negative",
    markdown: replaceStep3(backlog, "완료", "required/candidate/structure/excluded 목록을 review-ready로 고정하고 사용자 승인 전 기능 개발 중단"),
    expectedOk: false,
    expectedError: "step 3 status drift",
  },
  {
    name: "missing-step-negative",
    markdown: removeStep(backlog, 2),
    expectedOk: false,
    expectedError: "missing step 2",
  },
  {
    name: "duplicate-step-negative",
    markdown: duplicateStep(backlog, 3),
    expectedOk: false,
    expectedError: "duplicate step 3",
  },
];

let pass = 0;
let fail = 0;
for (const testCase of cases) {
  const result = validateV390EntryBaselineSteps(testCase.markdown, expectation);
  const ok = testCase.expectedOk
    ? result.ok
    : !result.ok && result.errors.some(error => error.includes(testCase.expectedError));
  console.log(`[${ok ? "pass" : "fail"}] ${testCase.name}${ok ? "" : `: ${result.errors.join("; ")}`}`);
  if (ok) pass += 1;
  else fail += 1;
}

const sourceBoundaryRequired = [
  'const baselineVersion = "3.9.0";',
  'const baselineRoadmap = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";',
  'const currentRoadmap = requiredMatch(files.versioning, /- 현재 source roadmap:',
  "semverAtLeast(version, baselineVersion)",
  "project(media_server VERSION ${version} LANGUAGES CXX)",
  "current roadmap must match source ${version}",
  "historicalBaseline: v${baselineVersion} ${baselineRoadmap}",
];
const sourceBoundaryForbidden = [
  'const currentVersion = "3.9.0";',
  "version === currentVersion",
  "VERSION must be ${currentVersion}",
];
const sourceBoundaryOk = sourceBoundaryRequired.every(snippet => verifierSource.includes(snippet)) &&
  sourceBoundaryForbidden.every(snippet => !verifierSource.includes(snippet));
console.log(`[${sourceBoundaryOk ? "pass" : "fail"}] current-source-historical-baseline-boundary`);
if (sourceBoundaryOk) pass += 1;
else fail += 1;

console.log("");
console.log("== v3.9.0 entry baseline contract summary ==");
console.log(`- schema: ${expectation.schema}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function tableRange(markdown) {
  const headingIndex = markdown.indexOf(expectation.tableHeading);
  if (headingIndex < 0) throw new Error("progress table heading missing in contract fixture");
  const tableStart = markdown.indexOf("| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |", headingIndex);
  if (tableStart < 0) throw new Error("progress table missing in contract fixture");
  const tableEnd = markdown.indexOf("\n\n", tableStart);
  return { tableStart, tableEnd: tableEnd < 0 ? markdown.length : tableEnd };
}

function replaceStep3(markdown, status, detail) {
  const { tableStart, tableEnd } = tableRange(markdown);
  const before = markdown.slice(0, tableStart);
  const table = markdown.slice(tableStart, tableEnd).replace(
    /^\| 3 \|[^\n]+$/m,
    `| 3 | v3.9.0 (3) User Review Gate / 개발 순서 확정 | P0 | ${status} | ${detail} |`,
  );
  return `${before}${table}${markdown.slice(tableEnd)}`;
}

function removeStep(markdown, id) {
  const { tableStart, tableEnd } = tableRange(markdown);
  const table = markdown.slice(tableStart, tableEnd)
    .split("\n")
    .filter(line => !line.startsWith(`| ${id} |`))
    .join("\n");
  return `${markdown.slice(0, tableStart)}${table}${markdown.slice(tableEnd)}`;
}

function duplicateStep(markdown, id) {
  const { tableStart, tableEnd } = tableRange(markdown);
  const lines = markdown.slice(tableStart, tableEnd).split("\n");
  const row = lines.find(line => line.startsWith(`| ${id} |`));
  if (!row) throw new Error(`step ${id} missing in contract fixture`);
  const index = lines.indexOf(row);
  lines.splice(index + 1, 0, row);
  return `${markdown.slice(0, tableStart)}${lines.join("\n")}${markdown.slice(tableEnd)}`;
}
