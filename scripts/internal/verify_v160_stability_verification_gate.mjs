#!/usr/bin/env node
// 파일 용도: v1.6.0 stability verification gate 분류가 실패/미실행 항목을 release pass와 분리하는지 검증한다.
// 동작 요약: stability gate 문서, roadmap, stream verification, server entrypoint 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 stability verification gate verification

Usage:
  ./server.sh verify-v160-stability-verification-gate [options]

Options:
  -h, --help  도움말 출력

Checks:
  - stability gate 문서가 static/attached/runtime/flaky/longrun gate를 분리하는지 확인
  - V160-P0-02 roadmap section이 미실행/환경 의존 항목을 release pass로 과장하지 않는지 확인
  - stream verification, README, server.sh, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const gateDoc = readText("docs/v1.6.0-stability-verification-gates.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const docsRootIndex = readText("docs/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P0-02 Stability verification gate cleanup 정리 기준",
  "### v1.6.0 비범위"
);

const checks = [];

check("gate document classifies the current stability gates", () => {
  for (const snippet of [
    "# v1.6.0 Stability Verification Gates",
    "Static/docs gate",
    "P0 stabilization gate",
    "Attached UI/Auth gate",
    "Runtime/VA metadata gate",
    "Tracker/Re-ID carry-over gate",
    "Flaky/cleanup isolation gate",
    "Longrun/external gate",
    "NOT RUN",
    "release evidence 기록",
  ]) {
    assertIncludes(gateDoc, snippet, "stability gate doc");
  }
});

check("gate document keeps longrun and flaky evidence separate", () => {
  for (const snippet of [
    "verify-script-inventory",
    "verify-v160-release-evidence-dashboard",
    "verify-v160-stability-verification-gate",
    "verify-auth-routes",
    "verify-ops-client-ui",
    "verify-rule-ui",
    "verify-ops-rules-roundtrip",
    "verify-flaky-verifiers",
    "verify-fixture-cleanup-contracts",
    "verify-predev --soak-minutes 30",
    "verify-va-runtime-console-longrun --duration-minutes 120",
    "`verify-predev` 건너뜀 판정",
    "skip count와 각 skipped step의 reason",
    "--include-external-turn not requested",
    "장기 predev 자체는 통과, 외부 TURN은 NOT RUN",
    "명시 요청 없이 실행하지 않습니다",
    "첫 실패",
    "수정/재실행 사실",
  ]) {
    assertIncludes(gateDoc, snippet, "stability gate separation");
  }
  for (const forbidden of [
    "verify-predev: PASS",
    "longrun: PASS",
    "실장비 field smoke: PASS",
    "flaky verifier 통과로 간주",
    "미실행 항목 PASS",
  ]) {
    assert(!gateDoc.includes(forbidden), `gate doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap defines V160-P0-02 scope and follow-up classification", () => {
  for (const snippet of [
    "V160-P0-02 Stability verification gate cleanup",
    "v1.6.0 Stability Verification Gates",
    "static/docs gate",
    "flaky/attached/longrun/external gate",
    "verify-v160-stability-verification-gate",
    "verify-script-inventory",
    "미분류 P0~P1 후속 이슈: 없음",
    "P1/P2 및 별도 Phase 후보",
  ]) {
    assertIncludes(section, snippet, "V160-P0-02 roadmap section");
  }
});

check("roadmap keeps later P0/P1/P2 items outside P0-02 completion", () => {
  for (const snippet of [
    "V160-P0-03 Client/Ops debug exposure regression guard",
    "V160-P0-04 Tracker/Re-ID opt-in stabilization close-out",
    "V160-P1-01~V160-P1-04",
    "V160-P2-01~V160-P2-02",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P0-02 out-of-scope section");
  }
  for (const forbidden of [
    "V160-P0-03 완료",
    "V160-P0-04 완료",
    "실장비 field smoke: PASS",
    "verify-predev: 통과",
    "metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P0-02 must not overclaim: ${forbidden}`);
  }
});

check("docs and entrypoints link the stability verifier", () => {
  for (const [label, text] of [
    ["stream verification", stream],
    ["docs README", docsRootIndex],
  ]) {
    assertIncludes(text, "v1.6.0-stability-verification-gates.md", label);
    assertIncludes(text, "verify-v160-stability-verification-gate", label);
  }
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "docs/README.md", label);
  }
  assertIncludes(stream, "skip count와 step reason", "stream verification predev skip review");
  assertIncludes(stream, "외부 TURN `NOT RUN`", "stream verification predev skip review");
  for (const snippet of [
    "verify-v160-stability-verification-gate",
    "verify_v160_stability_verification_gate.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_stability_verification_gate.mjs", "script inventory");
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
console.log("== v1.6.0 stability verification gate summary ==");
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
