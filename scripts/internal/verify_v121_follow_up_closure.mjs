#!/usr/bin/env node
// 파일 용도: v1.2.1 후속 항목이 개발 범위 안에서 모두 닫혔고 외부 gate를 완료로 과장하지 않는지 검증한다.
// 동작 요약: follow-up closure 문서, backlog, release/manual/Re-ID/ONVIF/artifact guard 문서의 경계 문구를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.2.1 follow-up closure verification

Usage:
  ./server.sh verify-v121-follow-up-closure

Checks:
  - docs/v1.2.1-follow-up-closure.md가 로드맵 내 개발 후속 이슈 없음을 명시
  - GitHub Actions, tag, push, GitHub Release, 실장비/외부 credential gate를 완료로 과장하지 않음
  - manual UI, Re-ID, ONVIF, visual artifact, bundle policy guard 문서와 연결됨
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const closure = readText("docs/v1.2.1-follow-up-closure.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const manualUi = readText("docs/manual-ui-v1.2.1-result.md");
const reid = readText("docs/reid-fixture-default-on-candidates.md");
const onvif = readText("docs/onvif-field-smoke-artifact-redaction.md");
const provenance = readText("docs/sample-fixture-provenance.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("closure doc classifies all prior follow-up items", () => {
  for (const snippet of [
    "# v1.2.1 Follow-up Closure",
    "Release 직전 GitHub Actions 상태 확인",
    "Auth-on manual release rehearsal",
    "ONVIF 실장비 field smoke",
    "Re-ID field sample 반복 관찰",
    "UI visual baseline 승인 기록",
    "로드맵 내 개발 가능한 후속 이슈: 없음",
  ]) {
    assertIncludes(closure, snippet, "closure doc");
  }
});

check("closure doc does not overclaim external or release gates", () => {
  for (const snippet of [
    "실제 tag, push, GitHub Release 생성은 수행하지 않습니다",
    "Actions 최신 상태는 로컬 개발 완료 근거로 쓰지 않습니다",
    "별도 브라우저 수동 제출은 release rehearsal 때 throwaway users file로 수행합니다",
    "실제 장비 endpoint 성공은 no-device suite 통과로 대체하지 않습니다",
    "Re-ID default-on은 v1.2.1 비범위입니다",
    "baseline 채택은 수동 승인 기록이며 public release asset이 아닙니다",
    "미확인 항목을 통과로 쓰지 않습니다",
  ]) {
    assertIncludes(closure, snippet, "closure doc boundary");
  }
  for (const forbidden of [
    "GitHub Actions: pass",
    "ONVIF 실장비 성공",
    "Re-ID default-on 완료",
    "푸시 완료",
    "GitHub Release 생성 완료",
  ]) {
    assert(!closure.includes(forbidden), `closure doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap and verification docs link the closure guard", () => {
  assertIncludes(backlog, "v1.2.1 Follow-up Closure", "development backlog");
  assertIncludes(backlog, "verify-v121-follow-up-closure", "development backlog");
  assertIncludes(stream, "verify-v121-follow-up-closure", "stream verification");
  assertIncludes(releasePolicy, "verify-release-closeout-helper", "release policy");
});

check("existing closure evidence remains connected", () => {
  for (const snippet of [
    "## V121-P2-02 UI Polish Follow-up",
    "보강 반응형 polish fix",
    "UI 코드 수정: 수행함",
    "제품 nav/route/API/schema 변경: 없음",
    "verify-ui-copy-i18n-parity",
  ]) {
    assertIncludes(manualUi, snippet, "manual UI result");
  }
  for (const snippet of [
    "`matrix-ok`는 명령/gate 결과",
    "[matrix-product-default-on]",
    "close-object guard 기본값은 계속 `off`",
  ]) {
    assertIncludes(reid, snippet, "Re-ID fixture candidates");
  }
  for (const snippet of [
    "## Operator Checklist",
    "## Failure Wording",
    "no-device suite 통과는 실장비 endpoint 성공으로 쓰지 않습니다",
  ]) {
    assertIncludes(onvif, snippet, "ONVIF field smoke redaction");
  }
  for (const snippet of [
    "## v1.2.1 Housekeeping Gate",
    "runtime/model/binary bundle 범위를 열지 않습니다",
    "verify-ui-visual-artifact-index",
  ]) {
    assertIncludes(provenance, snippet, "sample fixture provenance");
  }
});

check("server entrypoint and inventory expose follow-up closure verifier", () => {
  assertIncludes(server, "verify-v121-follow-up-closure", "server.sh");
  assertIncludes(server, "verify_v121_follow_up_closure.mjs", "server.sh");
  assertIncludes(inventory, "verify_v121_follow_up_closure.mjs", "script inventory");
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
console.log("== v1.2.1 follow-up closure summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope development follow-ups: 0");
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
