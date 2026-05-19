#!/usr/bin/env node
// 파일 용도: v1.5.0 Tracker/Re-ID stability matrix 범위와 검증 연결을 정적으로 고정한다.
// 동작 요약: tracker/Re-ID 조합, warning drift history, default-on 비승격 경계를 문서/스크립트/entrypoint에서 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 Tracker/Re-ID stability matrix verification

Usage:
  ./server.sh verify-v150-tracker-reid-stability-matrix [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V150-P0-02가 tracker/Re-ID 조합 matrix와 warning drift history를 문서화했는지 확인
  - verify-tracker-stability가 rule-level tracker/Re-ID policy와 tap 적용 확인을 지원하는지 확인
  - compare-close-object-tracker fixture matrix가 tracker/Re-ID, warning, default-on decision을 분리하는지 확인
  - server.sh, script inventory, stream verification 문서가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const tracker = readText("scripts/internal/verify_tracker_stability.sh");
const compare = readText("scripts/internal/compare_close_object_tracker.py");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V150-P0-02 Tracker/Re-ID stability matrix 정리 기준",
  "v1.5.0 비범위:"
);
const checks = [];

check("roadmap defines V150-P0-02 matrix scope and combinations", () => {
  for (const snippet of [
    "V150-P0-02 Tracker/Re-ID stability matrix",
    "lite/off",
    "kalman-lite/off",
    "bytetrack/off",
    "lite/assist",
    "kalman-lite/assist",
    "bytetrack/assist",
    "warning drift",
    "사용자 opt-in 품질 참고",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V150-P0-02 roadmap section");
  }
});

check("roadmap keeps later phases out of the stability matrix", () => {
  for (const snippet of [
    "V150-P0-03 Re-ID opt-in model provenance and fallback approval",
    "V150-P1-01 Ops Dashboard tracker warning next-action refinement",
    "V150-P1-02 Audit export review hardening",
    "V150-P1-03 Field smoke summary evidence boundary",
    "OC-SORT experimental sandbox",
    "제품 default tracker/Re-ID 변경",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V150-P0-02 out-of-scope section");
  }
  for (const forbidden of [
    "Re-ID default-on 완료",
    "tracker default-on 완료",
    "제품 default-on 완료",
    "model bundle 포함 완료",
    "OC-SORT 구현 완료",
  ]) {
    assert(!section.includes(forbidden), `V150-P0-02 must not overclaim: ${forbidden}`);
  }
});

check("tracker stability harness supports explicit policy matrix rows", () => {
  for (const snippet of [
    "--tracker-policy <name>",
    "--reid-policy <name>",
    "허용값: lite, kalman-lite, bytetrack",
    "허용값: off, assist",
    "create_tracker_policy_va_rule",
    "trackingPolicy\": {\"tracker\": tracker_policy, \"reid\": reid_policy}",
    "verify_tap_tracking_policy",
    "tap tracking policy 적용",
  ]) {
    assertIncludes(tracker, snippet, "verify_tracker_stability.sh");
  }
  for (const snippet of [
    "\"lite\"",
    "\"kalman-lite\"",
    "\"bytetrack\"",
    "\"off\"",
    "\"assist\"",
  ]) {
    assertIncludes(tracker, snippet, "verify_tracker_stability.sh policy validation");
  }
});

check("close-object fixture matrix preserves warning drift and default-on boundary", () => {
  for (const snippet of [
    "FIXTURE_MATRIX",
    "--fixture-matrix",
    "--history-dir",
    "--tracker-policy",
    "--reid-policy",
    "warningCount",
    "defaultOnDecision",
    "productDefaultOn",
    "defaultOnReason",
    "matrix-ok",
    "matrix-product-default-on",
    "warning/counter drift trend evidence only",
    "not product default-on approval",
  ]) {
    assertIncludes(compare, snippet, "compare_close_object_tracker.py");
  }
});

check("stream and video docs expose the stability matrix verifier and interpretation", () => {
  for (const snippet of [
    "verify-v150-tracker-reid-stability-matrix",
    "lite/off",
    "kalman-lite/off",
    "bytetrack/off",
    "lite/assist",
    "kalman-lite/assist",
    "bytetrack/assist",
    "matrix-ok",
    "제품 default-on 승인 값이 아닙니다",
  ]) {
    assertIncludes(stream, snippet, "stream verification docs");
  }
  for (const snippet of [
    "v1.5.0 Tracker/Re-ID stability matrix",
    "warning drift",
    "제품 default tracker/Re-ID 변경 근거가 아닙니다",
  ]) {
    assertIncludes(video, snippet, "video analysis docs");
  }
});

check("server command and inventory expose V150-P0-02 verifier", () => {
  for (const snippet of [
    "verify-v150-tracker-reid-stability-matrix",
    "verify_v150_tracker_reid_stability_matrix.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_tracker_reid_stability_matrix.mjs", "script inventory");
  }
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
console.log("== v1.5.0 Tracker/Re-ID stability matrix summary ==");
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

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}
