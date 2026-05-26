#!/usr/bin/env node
// 파일 용도: release evidence index가 실행/미실행/미확인 상태를 한곳에서 분리하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release evidence index verification

Usage:
  ./server.sh verify-release-evidence-index

Checks:
  - release evidence index가 longrun, UI evidence, PR checks, release notes, skipped tests를 분리하는지 확인
  - README 첫 화면이 evidence matrix를 반복하지 않고 docs index로 연결하는지 확인
  - 미실행, manual-not-run, 미확인, 제외를 기능별 PASS/FAIL 판정과 구분하는 문구가 유지되는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("release evidence index owns required evidence categories", () => {
  const doc = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "# Release Evidence Index",
    "v1.8.0 release trust hardening",
    "GitHub Latest Release",
    "repository page Releases/Latest link",
    "remote tag/branch",
    "media-server.published-release-evidence.v1",
    "Release metadata/docs drift",
    "Docs UI assets",
    "Manual UI evidence",
    "English UI visual copy QA",
    "Release close-out runbook",
    "PR checks",
    "Release notes",
    "30분 soak",
    "장시간/외부 gate",
    "Test Token Usage Ledger",
    "token consumed",
    "`PASS` 또는 `FAIL`",
    "./server.sh verify-release-evidence-index",
  ]) {
    assert(doc.includes(snippet), `release evidence index missing snippet: ${snippet}`);
  }
});

check("skipped wording stays distinct from pass", () => {
  const doc = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "기능별 테스트 결과 행은 `PASS` 또는 `FAIL`만 기록합니다.",
    "해당 기능 결과를 `FAIL`로 기록합니다.",
    "별도 `제외 기록`에만 남깁니다.",
    "기능별 테스트 결과 행에는 쓰지 않습니다.",
    "`PASS` | 해당 release cut에서 실제 실행했고 통과",
    "`FAIL` | 해당 release cut에서 실제 실행했고 실패",
    "`미실행` | 실행 조건이 아니거나 명시 요청이 없어 실행하지 않음",
    "`manual-not-run` | tag, push, PR merge, GitHub Release처럼 수동 승인 전이라 실행하지 않음",
  ]) {
    assert(doc.includes(snippet), `release evidence index missing skipped-test wording: ${snippet}`);
  }
});

check("unverified wording stays distinct from pass", () => {
  const doc = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "`미확인` | 화면, screenshot, 외부 UI/API를 직접 열어 확인하지 않음",
    "`제외` | 사용자 지시 또는 실기기/외부 credential 조건 때문에 테스트 기준에서 뺌",
    "`미실행`, `manual-not-run`, `미확인`, `제외`는 PASS가 아닙니다.",
    "UI 풀테스트 대상",
    "기능별 결과 행에서는 `FAIL`",
  ]) {
    assert(doc.includes(snippet), `release evidence index missing skipped-test wording: ${snippet}`);
  }
});

check("test evidence records include token usage fields", () => {
  const releaseEvidence = readText("docs/release-evidence-index.md");
  const manualUiStandard = readText("docs/manual-ui-fulltest.md");
  const manualUiTemplate = readText("docs/manual-ui-result-template.md");
  const longrunTemplate = readText("docs/runtime-dashboard-longrun-evidence-template.md");
  for (const [label, text] of [
    ["release evidence index", releaseEvidence],
    ["manual UI fulltest standard", manualUiStandard],
    ["manual UI result template", manualUiTemplate],
    ["runtime longrun template", longrunTemplate],
  ]) {
    for (const snippet of ["token usage source", "token start", "token end", "token consumed", "elapsed"]) {
      assert(text.includes(snippet), `${label} missing token usage field: ${snippet}`);
    }
  }
  assert(releaseEvidence.includes("147,501"), "release evidence index missing latest stability token usage");
});

check("docs entrypoints link evidence index without overcrowding README", () => {
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsIndex = readText("docs/README.md");
  const releasePolicy = readText("docs/release-policy.md");
  const streamVerification = readText("docs/stream-verification.md");
  for (const snippet of [
    "release-evidence-index.md",
    "Release evidence의 실행/미실행/미확인 색인",
  ]) {
    assert(docsIndex.includes(snippet), `docs/README.md missing evidence index link: ${snippet}`);
  }
  assert(releasePolicy.includes("release-evidence-index.md"), "release policy missing evidence index link");
  assert(streamVerification.includes("./server.sh verify-release-evidence-index"), "stream verification missing verifier command");
  for (const [label, text] of [["README.md", readme], ["README.en.md", readmeEn]]) {
    for (const snippet of [
      "Release Evidence Index",
      "30분 soak",
      "manual-not-run",
      "PR checks",
      "Skipped / Not-run Wording",
    ]) {
      assert(!text.includes(snippet), `${label} repeats detailed evidence index content: ${snippet}`);
    }
  }
});

check("server entrypoint exposes release evidence index verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-release-evidence-index"), "server.sh is missing verify-release-evidence-index");
  assert(server.includes("verify_release_evidence_index.mjs"), "server.sh is missing release evidence verifier script reference");
  assert(inventory.includes("verify_release_evidence_index.mjs"), "script inventory is missing release evidence index verifier");
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
console.log("== Release evidence index verification summary ==");
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
