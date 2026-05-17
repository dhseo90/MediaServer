#!/usr/bin/env node
// 파일 용도: v1.2.1 수동 UI 검수 결과 문서가 실제 확인/미확인/건너뜀을 분리하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Manual UI evidence verification

Usage:
  ./server.sh verify-manual-ui-evidence [options]

Options:
  --result <path>  manual UI result 문서입니다. 기본 docs/manual-ui-v1.2.1-result.md.
  -h, --help       도움말 출력

Checks:
  - 수동으로 연 화면, 자동 smoke, 미확인/건너뜀 항목을 분리해 기록했는지 확인
  - client/viewer 비노출 항목과 admin preview 경계가 명시됐는지 확인
  - destructive/manual submit 미실행을 통과처럼 쓰지 않는지 확인
`);
}

assertKnownOptions(rawArgs, ["result", "h", "help"]);

const args = parseArgs(rawArgs);
const resultPath = path.resolve(rootDir, args.result || "docs/manual-ui-v1.2.1-result.md");
const result = fs.readFileSync(resultPath, "utf8");
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const backlog = readText("docs/development-backlog.md");

const checks = [];

check("manual result covers required screens", () => {
  assertIncludes(result, [
    "# Manual UI Result - v1.2.1 Patch Evidence",
    "Chrome + Computer Use",
    "`/setup`",
    "`/login`",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/request-access`",
  ], "docs/manual-ui-v1.2.1-result.md");
});

check("manual result separates automation from direct browser evidence", () => {
  assertIncludes(result, [
    "## 관련 자동 검증",
    "## 확인됨",
    "실제로 Chrome에서 열고 클릭한 화면만 적습니다.",
    "sandbox 내부 첫 실행은 local fetch/CDP 제한으로 실패",
    "권한 밖 재실행 기준",
    "request-access form submit 없음",
    "destructive action 없음",
  ], "docs/manual-ui-v1.2.1-result.md");
});

check("manual result pins client redaction and admin preview boundary", () => {
  assertIncludes(result, [
    "Client Preview as admin",
    "client primary nav 자체는 Live/Dashboard만 표시",
    "source URL: PASS",
    "Developer URL: PASS",
    "raw JSON: PASS",
    "debug counter: PASS",
    "BBox diagnostics: PASS",
    "rule/profile editor: PASS",
    "Ops/Lab primary navigation: PASS",
  ], "docs/manual-ui-v1.2.1-result.md");
});

check("manual result lists not-run and skipped items explicitly", () => {
  assertIncludes(result, [
    "장시간 테스트: 실행하지 않음",
    "`verify-predev`: 실행하지 않음",
    "ONVIF 실장비",
    "외부 TURN/WHEP credential",
    "YouTube 실제 URL relay",
    "실제 viewer credential을 브라우저에 입력하는 수동 로그인: 수행하지 않음",
    "`/setup` 실제 admin 생성 manual submit",
    "request-access form submit",
    "destructive admin actions",
  ], "docs/manual-ui-v1.2.1-result.md");
});

check("checklist and roadmap link the v1.2.1 evidence verifier", () => {
  assertIncludes(checklist, [
    "manual-ui-v1.2.1-result.md",
    "verify-manual-ui-evidence",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "verify-manual-ui-evidence",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(backlog, [
    "| V121-P0-03 |",
    "verify-manual-ui-evidence",
  ], "docs/development-backlog.md");
});

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

console.log("");
console.log("== Manual UI evidence verification summary ==");
console.log(`- result: ${path.relative(rootDir, resultPath).replaceAll(path.sep, "/")}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
