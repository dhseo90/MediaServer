#!/usr/bin/env node
// 파일 용도: 과거 표의 parser 회귀와 source 버전 비교 계약을 검사한다. 과거 PASS를 재판정하지 않는다.

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadV390EntryBaselineExpectation,
  validateV390EntryBaselineSteps,
} from "./v390_entry_baseline_state_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {parseEntryRoot,semverAtLeast} from "./entry_baseline_documentation.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 historical entry baseline contract

Usage:
  ./server.sh verify-v390-entry-baseline-contract

출처 있는 parser 입력의 정상·누락·중복·상태/내용 오류와 버전 비교를 확인한다.
현행 backlog나 과거 로그는 필요하지 않으며 실제 개발/실행 완료 증거가 아니다.
--root <소스 경로>로 Git 없는 소스에서도 실행할 수 있다.`);
}
assertKnownOptions(rawArgs, ["h", "help", "root"]);
const rootDir=parseEntryRoot(rawArgs,path.resolve(scriptDir,"../.."));

const expectation = loadV390EntryBaselineExpectation(rootDir);
const backlog = expectation.markdown;

const cases = [
  {
    name: "fixture-positive",
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
    name: "required-detail-negative",
    markdown: replaceStep3(backlog, "완료/initial snapshot historical/current closed", "필수 근거 없음"),
    expectedOk: false,
    expectedError: "historical/current boundary missing",
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

const sourceBoundaryOk = semverAtLeast('4.1.1','3.9.0') && semverAtLeast('3.9.0','3.9.0') &&
  !semverAtLeast('3.8.9','3.9.0') && !semverAtLeast('bad','3.9.0') && !semverAtLeast('03.9.0','3.9.0');
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
