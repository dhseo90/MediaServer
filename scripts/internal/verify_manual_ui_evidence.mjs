#!/usr/bin/env node
// 파일 용도: 현재 release 수동 UI 풀테스트 문서가 실제 확인/미확인/건너뜀을 분리하는지 검증한다.

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
  --result <path>  실제 manual UI result 문서입니다. 지정한 경우 template 구조도 함께 검증합니다.
  -h, --help       도움말 출력

Checks:
  - v1.8.0 기준 수동으로 연 화면, 자동 smoke, 미확인/건너뜀 항목을 분리해 기록하는지 확인
  - client/viewer 비노출 항목과 admin preview 경계가 명시됐는지 확인
  - destructive/manual submit 미실행을 통과처럼 쓰지 않는지 확인
`);
}

assertKnownOptions(rawArgs, ["result", "h", "help"]);

const args = parseArgs(rawArgs);
const resultPath = args.result ? path.resolve(rootDir, args.result) : "";
const result = resultPath ? fs.readFileSync(resultPath, "utf8") : "";
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const fulltest = readText("docs/manual-ui-fulltest.md");
const backlog = readText("docs/development-backlog.md");

const checks = [];

check("manual UI docs are current v1.8.0 baseline", () => {
  assertIncludes(checklist, [
    "현재 release 목표는 `v1.8.0`",
    "현재 제품 UI 직접 조작 evidence 없이 완료 판정에 포함하지 않습니다.",
    "v1.8.0 release trust hardening gate",
    "`/setup`",
    "`/login`",
    "`/ops/rules`",
    "`/client/live`",
    "Evidence index",
    "raw JSON/API-only 확인",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "현재 제품 UI 기준",
    "지원 가능한 모든 기능을 실제 UI 조작으로 확인",
    "테스트 영역 역할 분리",
    "UI 풀테스트는 `스크립트 테스트`와 별도 영역입니다.",
    "열지 않은 화면",
    "미확인",
  ], "docs/manual-ui-fulltest.md");
});

check("manual result template covers required screens", () => {
  assertIncludes(template, [
    "# Manual UI Result Template",
    "브라우저: 인앱 브라우저",
    "`/setup`",
    "`/login`",
    "`/password/change`",
    "`/invite/setup`",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/request-access`",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template separates automation from direct browser evidence", () => {
  assertIncludes(template, [
    "## 테스트 영역별 판정",
    "스크립트 테스트와 UI 풀테스트는 서로 대체하지 않습니다.",
    "안정화 테스트",
    "30분 테스트",
    "120분 테스트",
    "## 스크립트 테스트 기록",
    "## UI 풀테스트 기록",
    "관련 자동 검증",
    "## 확인됨",
    "실제로 열고 클릭한 화면만 적습니다.",
    "자동 smoke나 raw JSON 확인만으로 채우지 않습니다.",
    "raw JSON/API-only로만 확인한 항목",
    "## 미확인",
    "## 건너뜀",
    "## 실패",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs separate script stability tests from UI full test", () => {
  assertIncludes(checklist, [
    "스크립트 테스트, 30분 안정화, 120분 장시간 테스트",
    "UI 풀테스트와",
    "스크립트 안정화 테스트는 서로 대체하지 않으며",
    "verify-predev --soak-minutes 30",
    "verify-predev --soak-minutes 120",
    "verify-va-runtime-console-longrun --duration-minutes 120",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "30분 테스트",
    "120분 테스트",
    "로드맵 각 스텝 종료 시 먼저 수행합니다",
    "장기간 테스트 지시 시 기본으로 수행",
    "메모리 릭",
    "UI 풀테스트 PASS를 대체하지 않습니다.",
    "30분/120분 안정화 PASS를 대체하지 않습니다.",
  ], "docs/manual-ui-fulltest.md");
});

check("manual result template pins client redaction and admin preview boundary", () => {
  assertIncludes(template, [
    "Client Preview as admin",
    "client/viewer 화면에서 보이지 않아야 하는 항목입니다.",
    "source URL:",
    "Developer URL:",
    "raw JSON:",
    "debug counter:",
    "BBox diagnostics:",
    "rule/profile editor:",
    "Ops/Lab primary navigation:",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template lists not-run and skipped items explicitly", () => {
  assertIncludes(template, [
    "장시간 테스트:",
    "`verify-predev`:",
    "실장비/외부 네트워크:",
    "ONVIF 실장비:",
    "외부 TURN/WHEP credential:",
    "YouTube 실제 URL relay:",
    "destructive action:",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs keep rewrite/new/merge requirements", () => {
  assertIncludes(template, [
    "## 문서 재작성/신규 작성/비교 병합",
    "재작성한 UI 풀테스트 관련 문서:",
    "새로 작성한 UI 풀테스트 문서:",
    "비교 결과:",
    "병합 결과:",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(checklist, [
    "UI 풀테스트 문서를 재작성하거나 새 문서를 추가한 경우",
    "manual-ui-fulltest.md",
  ], "docs/manual-ui-checklist.md");
});

check("checklist, template, and roadmap link the current evidence verifier", () => {
  assertIncludes(checklist, [
    "verify-manual-ui-evidence",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "verify-manual-ui-evidence",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(backlog, [
    "| V180-P0-03 |",
    "verify-manual-ui-evidence",
  ], "docs/development-backlog.md");
});

check("v1.8.0 release trust checklist requires direct UI evidence index", () => {
  assertIncludes(checklist, [
    "v1.8.0 release trust hardening gate",
    "`/setup`",
    "`/login`",
    "`/ops`",
    "`/client`",
    "`/ops/rules`",
    "`/client/live`",
    "Evidence index",
    "열지 않은 화면을 PASS로 쓰지 않고",
    "raw JSON/API-only 확인만",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "evidence index:",
    "## v1.8.0 Release Evidence Index",
    "자동 smoke나 raw JSON 확인만으로 채우지 않습니다.",
    "| `/setup` |",
    "| `/login` |",
    "| `/ops` |",
    "| `/client` |",
    "| `/ops/rules` |",
    "| `/client/live` |",
    "직접 열어보지 않은 화면",
    "실패 후 재검수한 화면",
    "client/viewer 비노출 재확인",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(backlog, [
    "| V180-P0-03 |",
    "Manual UI evidence checklist hardening",
    "`/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live`",
    "evidence index",
  ], "docs/development-backlog.md");
});

if (resultPath) {
  check("provided manual result follows current evidence structure", () => {
    assertIncludes(result, [
      "## 검수 메타데이터",
      "## 확인됨",
      "## 미확인",
      "## 건너뜀",
      "## 실패",
      "푸시 수행 여부",
    ], path.relative(rootDir, resultPath).replaceAll(path.sep, "/"));
  });
}

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
console.log(`- result: ${resultPath ? path.relative(rootDir, resultPath).replaceAll(path.sep, "/") : "not provided; template/checklist only"}`);
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
