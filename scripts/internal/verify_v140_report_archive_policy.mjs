#!/usr/bin/env node
// 파일 용도: v1.4.0 close-object report archive 정책이 evidence 보존과 raw media 비보존 경계를 지키는지 검증한다.
// 동작 요약: archive policy 문서, close-object history index 구현, 문서 링크, server entrypoint를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.4.0 close-object report archive policy verification

Usage:
  ./server.sh verify-v140-report-archive-policy

Checks:
  - docs/close-object-report-archive-policy.md가 summary/report/history index 보존 범위를 정의함
  - raw media/image/customer/source/auth/model material을 archive 범위에서 제외함
  - compare-close-object-tracker 단일/matrix history index가 default-on 경계를 보존함
  - roadmap, video-analysis, stream verification, docs index, server.sh가 policy verifier를 연결함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const policy = readText("docs/close-object-report-archive-policy.md");
const compare = readText("scripts/internal/compare_close_object_tracker.py");
const backlog = readText("docs/development-backlog.md");
const video = readText("docs/video-analysis.md");
const stream = readText("docs/stream-verification.md");
const docsIndex = readText("docs/en/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("archive policy defines v1.4.0 evidence scope", () => {
  for (const snippet of [
    "# Close-object Report Archive Policy",
    "media-server.close-object-report-archive-policy.v1",
    "field-new-york-driving",
    "`--history-dir`",
    "`summary.json`",
    "`report.md`",
    "`matrix-summary.json`",
    "`matrix-report.md`",
    "`index.json` / `index.md`",
    "productDefaultOn=False",
  ]) {
    assertIncludes(policy, snippet, "archive policy");
  }
});

check("archive policy excludes raw media and overclaiming", () => {
  for (const snippet of [
    "고객/현장 원본 영상",
    "source URL",
    "credential",
    "raw frame",
    "crop",
    "embedding",
    "개인정보 review가 끝나지 않은 screenshot 또는 overlay image",
    "raw media image를 포함하지 않습니다",
    "제품 default-on 승격 검토는 별도 Phase gate",
    "push, tag, GitHub Release, release asset 업로드는 명시 요청 전까지 수행하지 않습니다",
  ]) {
    assertIncludes(policy, snippet, "archive policy boundary");
  }
  for (const forbidden of [
    "제품 default-on 완료",
    "고객 영상 보존 완료",
    "raw frame archive",
    "GitHub Release 업로드 완료",
    "푸시 완료",
  ]) {
    assert(!policy.includes(forbidden), `archive policy must not overclaim: ${forbidden}`);
  }
});

check("compare harness supports direct and matrix history archives", () => {
  for (const snippet of [
    "close-object-tracker-comparison-history",
    "close-object-tracker-fixture-matrix-history",
    "archive_comparison_history",
    "archive_matrix_history",
    "warningReasonCount",
    "productDefaultOn",
    "defaultOnDecision",
    "history-dir",
  ]) {
    assertIncludes(compare, snippet, "compare_close_object_tracker.py");
  }
});

check("roadmap and verification docs link report archive policy", () => {
  for (const [label, text] of [
    ["development backlog", backlog],
    ["video analysis", video],
    ["stream verification", stream],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "close-object-report-archive-policy.md", label);
  }
  assertIncludes(backlog, "raw media/image archive를 열지 않습니다", "development backlog boundary");
  assertIncludes(stream, "verify-v140-report-archive-policy", "stream verification command");
});

check("server entrypoint and inventory expose v1.4 report archive verifier", () => {
  assertIncludes(server, "verify-v140-report-archive-policy", "server.sh");
  assertIncludes(server, "verify_v140_report_archive_policy.mjs", "server.sh");
  assertIncludes(inventory, "verify_v140_report_archive_policy.mjs", "script inventory");
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
console.log("== v1.4.0 report archive policy summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- raw media/image archive scope: closed");
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
