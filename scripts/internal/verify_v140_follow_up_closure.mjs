#!/usr/bin/env node
// 파일 용도: v1.4.0 follow-up closure가 범위 안 후속 이슈를 모두 닫고 별도 Phase gate를 과장하지 않는지 검증한다.
// 동작 요약: closure 문서, close-object history/report policy, Ops dashboard warning summary, boundary verifier 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.4.0 follow-up closure verification

Usage:
  ./server.sh verify-v140-follow-up-closure

Checks:
  - docs/v1.4.0-follow-up-closure.md가 추천 후속 이슈 5개를 분류함
  - v1.4.0 범위 안 이슈는 Re-ID warning history, report archive policy, Ops dashboard warning summary로 닫힘
  - default-on review, post-v1.4 benchmark, raw media/model/customer artifact work를 완료로 과장하지 않음
  - roadmap, README/docs index, stream verification, server.sh, script inventory가 closure verifier를 연결함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const closure = readText("docs/v1.4.0-follow-up-closure.md");
const archivePolicy = readText("docs/close-object-report-archive-policy.md");
const compare = readText("scripts/internal/compare_close_object_tracker.py");
const dashboard = readText("src/ingress/product_ui_page_scripts.cpp");
const translations = readText("src/ingress/product_ui_js.cpp");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const docsIndex = readText("docs/en/README.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("closure doc classifies all selected v1.4.0 follow-up items", () => {
  for (const snippet of [
    "# v1.4.0 Follow-up Closure",
    "ByteTrack default-on field evidence review",
    "Re-ID assist warning trend tracking",
    "field-driving fixture report archive policy",
    "tracker warning dashboard summary",
    "post-v1.4 OC-SORT benchmark issue",
    "v1.4.0 로드맵 안의 개발 가능한 후속 이슈: 없음",
  ]) {
    assertIncludes(closure, snippet, "v1.4 closure doc");
  }
});

check("closure doc does not overclaim deferred gates", () => {
  for (const snippet of [
    "제품 default tracker 변경",
    "Re-ID/ByteTrack default-on",
    "customer/field 영상 보존 자동화",
    "post-v1.4 benchmark는 범위",
    "별도 Phase gate",
    "장시간 soak, `verify-predev`, push, tag, GitHub Release는 명시 요청 없이는",
    "미확인 항목을 통과로 쓰지 않습니다",
  ]) {
    assertIncludes(closure, snippet, "v1.4 closure boundary");
  }
  for (const forbidden of [
    "제품 default-on 완료입니다",
    "default-on 완료로 판정",
    "OC-SORT benchmark 완료",
    "고객 영상 보존 완료",
    "verify-predev: 통과",
    "푸시 완료",
    "GitHub Release 생성 완료",
  ]) {
    assert(!closure.includes(forbidden), `closure doc must not overclaim: ${forbidden}`);
  }
});

check("in-scope Re-ID warning history is implemented and documented", () => {
  for (const snippet of [
    "close-object-tracker-comparison-history",
    "archive_comparison_history",
    "warningReasonCount",
    "defaultOnCandidate",
  ]) {
    assertIncludes(compare, snippet, "compare history implementation");
  }
  for (const snippet of [
    "Re-ID assist warning/counter drift",
    "media_server_v140_reid_assist_warning_trend",
    "단일 비교 history도 관찰 evidence",
  ]) {
    assertIncludes(video + backlog + stream, snippet, "Re-ID warning history docs");
  }
});

check("in-scope report archive policy is closed without raw media scope", () => {
  for (const snippet of [
    "media-server.close-object-report-archive-policy.v1",
    "raw media image를 포함하지 않습니다",
    "고객/현장 원본 영상",
    "productDefaultOn=False",
  ]) {
    assertIncludes(archivePolicy, snippet, "report archive policy");
  }
  assertIncludes(server, "verify-v140-report-archive-policy", "server report archive verifier");
});

check("in-scope Ops dashboard warning summary is implemented", () => {
  for (const snippet of [
    "trackingIssueGroupSummary",
    "trackingIssueMetric",
    "associationConfidence",
    "overlapRisk",
    "missedFrameCount",
    "directionChangeCount",
  ]) {
    assertIncludes(dashboard, snippet, "Ops dashboard warning summary");
  }
  assert(
    dashboard.includes("관찰 warning · default-on 근거 아님") ||
      dashboard.includes("사용자 opt-in 튜닝 참고 · default-on 근거 아님"),
    "Ops dashboard warning summary missing default-on boundary copy"
  );
  assertIncludes(translations, "Observation warning · not default-on evidence", "translation map");
  assertIncludes(video, "Ops Dashboard의 트래킹 이슈 그룹", "video analysis docs");
});

check("roadmap, docs, and entrypoints link v1.4 follow-up closure", () => {
  for (const [label, text] of [
    ["development backlog", backlog],
    ["stream verification", stream],
    ["docs/en README", docsIndex],
    ["README.md", readme],
    ["README.en.md", readmeEn],
  ]) {
    assertIncludes(text, "v1.4.0-follow-up-closure.md", label);
  }
  assertIncludes(server, "verify-v140-follow-up-closure", "server.sh");
  assertIncludes(server, "verify_v140_follow_up_closure.mjs", "server.sh");
  assertIncludes(inventory, "verify_v140_follow_up_closure.mjs", "script inventory");
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
console.log("== v1.4.0 follow-up closure summary ==");
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
