#!/usr/bin/env node
// 파일 용도: v1.6.0 manual UI release checklist closure 경계를 정적으로 검증한다.
// 동작 요약: 수동 클릭 검수 템플릿, screenshot artifact, 미실행/미확인 분리를 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 manual UI release checklist closure verification

Usage:
  ./server.sh verify-v160-manual-ui-release-checklist-closure [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P1-04 roadmap와 전용 문서가 수동 클릭 검수와 자동 smoke/screenshot artifact를 분리하는지 확인
  - manual UI checklist/template이 현재 setup/login/ops/client 화면과 closed lab route 경계를 포함하는지 확인
  - release docs, README, server.sh, script inventory가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-manual-ui-release-checklist-closure.md");
const backlog = readText("docs/development-backlog.md");
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const docsRootIndex = readText("docs/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P1-04 Manual UI release checklist closure 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

check("dedicated doc defines manual UI target screens and not-run evidence boundary", () => {
  for (const snippet of [
    "# v1.6.0 Manual UI Release Checklist Closure",
    "V160-P1-04",
    "실제 수동 UI 검수를 수행했다고 기록하는 것이 아니라",
    "`/setup`",
    "`/login`",
    "`/password/change`",
    "Chrome auth input evidence",
    "weak password rejection",
    "자동 smoke 통과만으로 Chrome 수동 auth 입력을 완료했다고 쓰지 않습니다",
    "plaintext password",
    "generated password suggestion",
    "Browser/Computer Use fallback",
    "Browser Use 직접 조작, Chrome 직접 조작",
    "raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/request-access`",
    "`/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`",
    "screenshot과 수동 검수 결과는 실제 실행한 artifact/link만 기록",
    "자동 smoke, raw JSON 확인, screenshot 생성만으로 수동 클릭 검수를 완료했다고 쓰지",
    "verify-v160-manual-ui-release-checklist-closure",
  ]) {
    assertIncludes(doc, snippet, "v1.6 manual UI checklist closure doc");
  }
});

check("dedicated doc keeps client redaction and follow-up separation explicit", () => {
  for (const snippet of [
    "Live/Dashboard primary nav",
    "Ops/Lab primary navigation",
    "source URL",
    "Developer URL",
    "raw JSON",
    "debug counter",
    "BBox diagnostics",
    "rule/profile editor",
    "model/source/auth material",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P2-01 Public docs consistency polish",
    "V160-P2-02 Tracker benchmark harness planning only",
  ]) {
    assertIncludes(doc, snippet, "v1.6 manual UI redaction boundary");
  }
});

check("roadmap defines V160-P1-04 scope and excludes P2 work", () => {
  for (const snippet of [
    "V160-P1-04 Manual UI release checklist closure",
    "v1.6.0 Manual UI Release Checklist Closure",
    "실제 수동 UI 검수를 수행했다고 기록하는",
    "`/webrtc/test`",
    "자동 smoke, raw JSON 확인, screenshot 생성만으로",
    "verify-v160-manual-ui-release-checklist-closure",
    "verify-manual-ui-evidence",
    "verify-docs-ui-assets",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P2-01~V160-P2-02",
  ]) {
    assertIncludes(section, snippet, "V160-P1-04 roadmap section");
  }
  for (const forbidden of [
    "V160-P2-01 완료",
    "V160-P2-02 완료",
    "실제 브라우저 수동 검수 실행 완료",
    "screenshot 재생성 완료",
    "/lab 화면 route 재개방 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P1-04 must not overclaim: ${forbidden}`);
  }
});

check("manual checklist and template include current release evidence fields", () => {
  for (const snippet of [
    "v1.6.0 Manual UI Release Checklist Closure",
    "verify-v160-manual-ui-release-checklist-closure",
    "`/setup`",
    "`/login`",
    "`/password/change`",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/request-access`",
    "`/webrtc/test`",
  ]) {
    assertIncludes(checklist, snippet, "manual UI checklist");
  }
  for (const snippet of [
    "verify-v160-manual-ui-release-checklist-closure",
    "Chrome Auth 입력 Evidence",
    "Browser/Computer Use Fallback",
    "PASS/FAIL/BLOCKED",
    "Chrome/Computer Use/Browser Use 실패 지점",
    "raw JSON/API-only 확인은 수동 UI 클릭 evidence로 쓰지 않습니다",
    "source URL",
    "Developer URL",
    "raw JSON",
    "debug counter",
    "BBox diagnostics",
    "rule/profile editor",
    "model/source/auth material",
    "Ops/Lab primary navigation",
    "screenshot artifact/link 미확인",
    "GitHub Actions/link 미확인",
    "푸시 수행 여부: 수행하지 않음",
  ]) {
    assertIncludes(template, snippet, "manual UI result template");
  }
});

check("release docs and entrypoints expose the v1.6 manual UI closure guard", () => {
  for (const [label, text] of [
    ["release dashboard", dashboard],
    ["stream verification", stream],
    ["release policy", releasePolicy],
    ["docs README", docsRootIndex],
  ]) {
    assertIncludes(text, "v1.6.0-manual-ui-release-checklist-closure.md", label);
    assertIncludes(text, "verify-v160-manual-ui-release-checklist-closure", label);
  }
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "docs/README.md", label);
  }
  for (const snippet of [
    "verify-v160-manual-ui-release-checklist-closure",
    "verify_v160_manual_ui_release_checklist_closure.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_manual_ui_release_checklist_closure.mjs", "script inventory");
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
console.log("== v1.6.0 manual UI release checklist closure summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope unclassified P0/P1 follow-ups: 0");
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing required wording: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}
