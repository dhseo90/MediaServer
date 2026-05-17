#!/usr/bin/env node
// 파일 용도: v1.3.0 후속 항목이 기능 개발 없이 별도 Phase/release gate로 분리됐는지 검증한다.
// 동작 요약: follow-up closure 문서, backlog, Re-ID/privacy, bundle policy, 문서 링크, server entrypoint를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.3.0 follow-up closure verification

Usage:
  ./server.sh verify-v130-follow-up-closure

Checks:
  - docs/v1.3.0-follow-up-closure.md가 지정 후속 5개와 추가 후속 점검을 분류함
  - Re-ID default-on, tracker 교체, runtime/model bundle, field sampling 자동화를 완료로 과장하지 않음
  - backlog, README, stream verification, server.sh, script inventory가 verifier를 연결함
  - Re-ID privacy threat model과 bundle policy 경계가 문서에 남아 있음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const closure = readText("docs/v1.3.0-follow-up-closure.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsEnReadme = readText("docs/en/README.md");
const reid = readText("docs/reid-default-off-research-continuation.md");
const video = readText("docs/video-analysis.md");
const distribution = readText("docs/distribution-policy.md");
const releasePolicy = readText("docs/release-policy.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("closure doc classifies all requested v1.3.0 follow-up items", () => {
  for (const snippet of [
    "# v1.3.0 Follow-up Closure",
    "실제 Re-ID model field review",
    "field sample 반복 수집 정책",
    "tracker 교체 후보 조사",
    "model/runtime bundle 정책 검토",
    "Re-ID privacy threat model 보강",
    "추가 후속 항목 점검",
    "로드맵 내 개발 가능한 후속 이슈: 없음",
  ]) {
    assertIncludes(closure, snippet, "v1.3 closure doc");
  }
});

check("closure doc does not overclaim deferred feature work", () => {
  for (const snippet of [
    "Re-ID default-on, tracker 교체, runtime/model bundle 포함, field sample",
    "dataset ingest는 이 closure에서 수행하지 않았습니다",
    "별도 benchmark: 실행하지 않음, 별도 Phase gate",
    "v1.3.0 GitHub Release는",
    "별도 release publish 단계에서 완료된 현재 release 상태로 봅니다",
    "장시간 `verify-predev` 또는 runtime console longrun은 사용자 명시 요청이",
    "미확인 항목을 통과로 쓰지 않습니다",
  ]) {
    assertIncludes(closure, snippet, "v1.3 closure boundary");
  }
  for (const forbidden of [
    "Re-ID default-on 완료",
    "tracker 교체 완료",
    "runtime/model bundle 포함 완료",
    "별도 benchmark: 통과",
    "실제 Re-ID model accuracy 확인",
    "푸시 완료",
    "GitHub Release 생성 완료",
    "verify-predev: 통과",
  ]) {
    assert(!closure.includes(forbidden), `closure doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap, readmes, and verification docs link the v1.3 closure", () => {
  for (const snippet of [
    "v1.3.0 Follow-up Closure",
    "verify-v130-follow-up-closure",
    "추가 기능 개발로 처리할 v1.3.0 후속 이슈는 남기지 않습니다",
  ]) {
    assertIncludes(backlog, snippet, "development backlog");
  }
  assertIncludes(stream, "verify-v130-follow-up-closure", "stream verification");
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en/README.md", docsEnReadme],
  ]) {
    assertIncludes(text, "v1.3.0-follow-up-closure.md", label);
  }
});

check("Re-ID privacy and model bundle boundaries remain connected", () => {
  for (const snippet of [
    "Privacy Threat Model 보강",
    "identity material",
    "embedding vector",
    "model path",
    "release asset에 올리지 않습니다",
  ]) {
    assertIncludes(reid, snippet, "Re-ID research continuation");
  }
  for (const snippet of [
    "privacy threat model",
    "embedding vector",
    "bbox crop",
    "identity material",
  ]) {
    assertIncludes(video, snippet, "video analysis");
  }
  for (const snippet of [
    "YOLO/Re-ID/model binary",
    "model provenance/checksum",
  ]) {
    assertIncludes(distribution, snippet, "distribution policy");
  }
  for (const snippet of [
    "YOLO/Re-ID model binary",
    "model provenance",
  ]) {
    assertIncludes(releasePolicy, snippet, "release policy");
  }
});

check("deferred tracker and field sampling work is framed as phase gate only", () => {
  for (const snippet of [
    "ByteTrack",
    "OC-SORT",
    "BoT-SORT",
    "DeepSORT",
    "dependency/구현 도입 없음",
    "반복 수집 scheduler",
    "field dataset upload/import pipeline",
    "productDefaultOn=False",
  ]) {
    assertIncludes(closure, snippet, "phase gate wording");
  }
});

check("server entrypoint and inventory expose v1.3 follow-up closure verifier", () => {
  assertIncludes(server, "verify-v130-follow-up-closure", "server.sh");
  assertIncludes(server, "verify_v130_follow_up_closure.mjs", "server.sh");
  assertIncludes(inventory, "verify_v130_follow_up_closure.mjs", "script inventory");
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
console.log("== v1.3.0 follow-up closure summary ==");
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
