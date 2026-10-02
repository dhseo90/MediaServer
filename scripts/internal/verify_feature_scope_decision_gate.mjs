#!/usr/bin/env node
// 파일 용도: 현행 후보 상태·승격 검토·보호 계약의 문서 연결을 검사한다. 실제 승인이나 제품 실행 판정이 아니다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentFieldValue, hasDocumentLink } from "./documentation_contract_lib.mjs";
import { parseServerDispatches } from "./script_dispatch_parser.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature scope decision gate verification

Usage:
  ./server.sh verify-feature-scope-gate

Checks:
  - 현행 backlog의 후보 상태·승인 검토 항목·보호 계약 확인
  - AGENTS/로드맵/검증 안내와 실제 dispatch 연결 확인
  - 과거 제목·종료 원장은 읽지 않음. 실제 사용자 승인·제품 실행 검사는 아님
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("현재 범위와 승인 기준 연결", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const target of ["../AGENTS.md", "v410-v49-recording-search-roadmap.md", "stream-verification.md"])
    assert(hasDocumentLink(backlog, target), `범위 기준 링크 누락: ${target}`);
  assertField(backlog, "candidate-only", "없음");
  assertField(backlog, "deferred-non-scope", "없음");
});

check("후보·승인·보류의 권한 구분", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const [field, value] of [["candidate-only", "없음"], ["approved-next-roadmap", "승인된 범위만"], ["deferred-non-scope", "없음"]])
    assertField(backlog, field, value);
});

check("승격 검토의 필수 항목", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const field of ["owner approval", "target version", "contract impact", "non-scope", "verification"])
    assert(rows(backlog, field).length === 1 && rows(backlog, field)[0][1]?.trim(), `검토 항목 누락/중복/빈 값: ${field}`);
  assertField(backlog, "owner approval", "사용자 명시 승인");
});

check("공개·권한·미디어 보호 계약", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "WebRTC DataChannel",
    "Event POST",
    "SSE/WS metadata",
    "Auth/Role/Scope",
    "인증·세션",
    "RTSP/WebRTC media path",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing invariant snippet: ${snippet}`);
  }
});

check("현행 검증 안내와 실제 명령 연결", () => {
  const verification = readText("docs/stream-verification.md");
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(verification.includes("./server.sh verify-feature-scope-gate"), "검증 안내 명령 누락");
  assert(hasDocumentLink(verification, "development-backlog.md"), "검증 안내의 후보 기준 링크 누락");
  const dispatch = parseServerDispatches(server).filter(item => item.command === "verify-feature-scope-gate");
  assert(dispatch.length === 1 && dispatch[0].script === "verify_feature_scope_decision_gate.mjs", "명령 dispatch 누락/중복/불일치");
  assert(inventory.includes("verify_feature_scope_decision_gate.mjs"), "script inventory is missing feature scope verifier");
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
console.log("== Feature scope decision gate verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function rows(text, field) {
  return text.split(/\r?\n/).filter(line => line.trim().startsWith('|')).map(line =>
    line.trim().split('|').slice(1, -1).map(cell => cell.replace(/`/g, '').trim()))
    .filter(cells => cells[0] === field);
}

function assertField(text, field, value) {
  const matches = rows(text, field);
  assert(matches.length === 1 && matches[0][1] === value && hasDocumentFieldValue(text, field, value), `상태/승인 조건 누락·중복·불일치: ${field}`);
}
