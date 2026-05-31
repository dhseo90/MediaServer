#!/usr/bin/env node
// 파일 용도: V200-S18 VLM close-out readiness report와 release evidence 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM close-out readiness verification

Usage:
  ./server.sh verify-vlm-closeout-readiness

Checks:
  - docs/vlm-close-out-readiness.md가 V200-S18 report schema와 script/UI/30분/120분 분리 기준을 포함
  - release evidence index, stream verification, docs index, roadmap이 S18 report와 verifier를 연결
  - S18 report가 UI 풀테스트, 30분, 120분, publish gate를 PASS로 과장하지 않음
  - server.sh와 script inventory가 verifier command를 노출
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("VLM close-out readiness report covers required S18 sections", () => {
  const doc = readText("docs/vlm-close-out-readiness.md");
  for (const snippet of [
    "schema: `media-server.vlm-close-out-readiness.v1`",
    "targetStep: `V200-S18`",
    "status: `readiness-recorded`",
    "## 직접 답",
    "## Script Test Evidence",
    "## UI Fulltest Status",
    "## 30-Minute And 120-Minute Status",
    "## Exclusions And Unverified",
    "## Token Usage",
    "## Completion Boundary",
    "verify-release-evidence-index",
    "verify-release-metadata",
    "verify-vlm-test-rehearsal",
    "verify-runtime-media-longrun-trigger-matrix",
    "verify-longrun-separation",
    "verify-manual-ui-evidence",
    "git diff --check",
  ]) {
    assert(doc.includes(snippet), `VLM close-out report missing snippet: ${snippet}`);
  }
});

check("S18 report records UI, 30 minute, 120 minute, provider, and publish gates as not run or excluded", () => {
  const doc = readText("docs/vlm-close-out-readiness.md");
  for (const snippet of [
    "UI 풀테스트: 미실행",
    "30분 soak: 미실행",
    "120분 longrun: 미실행",
    "GitHub Release/latest publish 검증 | manual-not-run",
    "실제 VLM runtime 호출 | 미실행",
    "cloud provider API 호출 | 미실행",
    "model/runtime download 또는 bundle | 제외",
    "VLM default-on 또는 runtime/model bundle release",
  ]) {
    assert(doc.includes(snippet), `S18 not-run/exclusion wording missing: ${snippet}`);
  }
  for (const forbidden of [
    "UI 풀테스트: PASS",
    "30분 soak: PASS",
    "120분 longrun: PASS",
    "GitHub Release/latest publish 검증 | PASS",
    "cloud provider API 호출 | PASS",
  ]) {
    assert(!doc.includes(forbidden), `S18 report overclaims: ${forbidden}`);
  }
});

check("release evidence index links VLM close-out readiness without treating it as UI or longrun PASS", () => {
  const evidence = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "VLM close-out readiness",
    "media-server.vlm-close-out-readiness.v1",
    "./server.sh verify-vlm-closeout-readiness",
    "v200-vlm-closeout-readiness-20260531",
    "UI 풀테스트 미실행",
    "30분 soak 미실행",
    "120분 longrun 미실행",
  ]) {
    assert(evidence.includes(snippet), `release evidence index missing S18 snippet: ${snippet}`);
  }
});

check("roadmap marks only V200-S18 readiness complete and preserves S18 boundaries", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "| 18 | V200-S18 | 완료 | v2.0.0 close-out readiness |",
    "### V200-S18 v2.0.0 close-out readiness 종료 기준",
    "docs/vlm-close-out-readiness.md",
    "30분/UI/120분 실행 또는 미실행 기록",
    "S18 완료로 v2.0.0 release tag, GitHub Release, main merge, UI 풀테스트 PASS를 완료로 보지 않습니다",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing S18 snippet: ${snippet}`);
  }
});

check("stream verification and docs index expose the S18 verifier and report", () => {
  const stream = readText("docs/stream-verification.md");
  const docsIndex = readText("docs/README.md");
  for (const snippet of [
    "./server.sh verify-vlm-closeout-readiness",
    "media-server.vlm-close-out-readiness.v1",
    "vlm-close-out-readiness.md",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S18 snippet: ${snippet}`);
    assert(docsIndex.includes(snippet.replace("./server.sh ", "")) || docsIndex.includes("vlm-close-out-readiness.md"),
      `docs index missing S18 snippet/link: ${snippet}`);
  }
});

check("server entrypoint and script inventory expose S18 verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-vlm-closeout-readiness"), "server.sh missing S18 verifier command");
  assert(server.includes("verify_vlm_closeout_readiness.mjs"), "server.sh missing S18 verifier script reference");
  assert(inventory.includes("verify_vlm_closeout_readiness.mjs"), "script inventory missing S18 verifier");
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
console.log("== VLM close-out readiness verification summary ==");
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
