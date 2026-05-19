#!/usr/bin/env node
// 파일 용도: v1.5.0 Ops Dashboard tracker warning next-action refinement 경계를 정적 검증한다.
// 동작 요약: tracker warning을 default-on 근거가 아닌 룰 단위 opt-in 튜닝 참고로 표시하는 UI/docs/verifier 연결을 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 Ops Dashboard tracker warning next-action verification

Usage:
  ./server.sh verify-v150-ops-tracker-warning-next-action [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V150-P1-01 roadmap가 tracker warning next-action과 후속 분류를 문서화했는지 확인
  - Ops Dashboard UI가 warning을 사용자 opt-in 튜닝 참고와 next action으로 표시하는지 확인
  - tracker warning fixture smoke가 default-on/identity/source material 과장을 막는지 확인
  - stream/video/ui docs와 server.sh entrypoint가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const uiGuide = readText("docs/ui-guide.md");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const translations = readText("src/ingress/product_ui_js.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const fixture = JSON.parse(readText("test/fixtures/v150_ops_tracker_warning_next_action.json"));
const section = extractSection(
  backlog,
  "### V150-P1-01 Ops Dashboard tracker warning next-action refinement 정리 기준",
  "v1.5.0 비범위:"
);
const checks = [];

check("roadmap defines V150-P1-01 scope, verification, and follow-up classification", () => {
  for (const snippet of [
    "V150-P1-01 Ops Dashboard tracker warning next-action refinement",
    "사용자 opt-in 튜닝 참고",
    "운영자가 다음 조치를 고를 수 있게",
    "default-on 근거가 아닙니다",
    "tracker warning fixture smoke",
    "verify-v150-ops-tracker-warning-next-action",
    "verify-ops-client-ui --screenshots",
    "verify-va-runtime-console",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V150-P1-01 roadmap section");
  }
});

check("roadmap keeps adjacent v1.5.0 and later phase work out of P1-01", () => {
  for (const snippet of [
    "V150-P1-02 Audit export review hardening",
    "V150-P1-03 Field smoke summary evidence boundary",
    "V150-P2-01 OC-SORT experimental sandbox",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
    "Re-ID default-on",
    "tracker default-on",
  ]) {
    assertIncludes(section, snippet, "V150-P1-01 out-of-scope section");
  }
  for (const forbidden of [
    "Audit export review hardening 완료",
    "Field smoke summary evidence boundary 완료",
    "OC-SORT 구현 완료",
    "제품 default-on 완료",
    "tracker default-on 완료",
    "Re-ID default-on 완료",
  ]) {
    assert(!section.includes(forbidden), `V150-P1-01 must not overclaim: ${forbidden}`);
  }
});

check("ops dashboard UI renders tracker warning policy, boundary, and next action copy", () => {
  for (const snippet of [
    "dashboardTrackingPolicySummary",
    "dashboardTrackerWarningNextAction",
    "tap?.trackingPolicy",
    "사용자 opt-in 튜닝 참고 · default-on 근거 아님",
    "이 warning은 default-on 근거가 아닙니다",
    "Tracker/Re-ID opt-in 조합, geometry, 입력 FPS",
    "룰 단위 opt-in으로만 비교",
    "source frame continuity, FPS, lost-buffer",
    "정책 ${opsHtml(summary.policy)}",
  ]) {
    assertIncludes(pageScript, snippet, "Ops Dashboard page script");
  }
});

check("product i18n map covers the new tracker warning copy", () => {
  for (const snippet of [
    "'사용자 opt-in 튜닝 참고 · default-on 근거 아님': 'User opt-in tuning reference · not default-on evidence'",
    "'Tracker/Re-ID 정책 미제공': 'Tracker/Re-ID policy unavailable'",
    "This warning is not default-on evidence",
    "rule-level opt-in choices",
    "^정책\\s+(.+)$",
  ]) {
    assertIncludes(translations, snippet, "product translation map");
  }
});

check("tracker warning fixture smoke stays source-only and default-on safe", () => {
  assert(fixture.schema === "media-server.v150.ops-tracker-warning-next-action-fixture.v1", "fixture schema mismatch");
  const report = fixture.issueReport || {};
  assert(report.schema === "media-server.va.tracking-issue-report.v1", "tracking issue report schema mismatch");
  assert(Array.isArray(report.issues) && report.issues.length >= 2, "fixture must include at least two tracking issues");
  assert(report.trackingPolicy?.tracker === "bytetrack", "fixture tracker policy must be explicit bytetrack");
  assert(report.trackingPolicy?.reid === "assist", "fixture Re-ID policy must be explicit assist");
  for (const snippet of [
    "사용자 opt-in 튜닝 참고 · default-on 근거 아님",
    "다음 조치: Tracker/Re-ID 조합은 룰 단위 opt-in으로만 비교하고 geometry/FPS 튜닝 결과와 함께 기록합니다.",
    "다음 조치: /ops/rules에서 선택 룰의 region/line geometry와 class 범위를 좁혀 재검증합니다.",
  ]) {
    assert((fixture.expectedUiCopy || []).includes(snippet), `fixture missing expected UI copy: ${snippet}`);
  }
  const serialized = JSON.stringify(fixture);
  for (const forbidden of [
    "sourceUrl",
    "modelPath",
    "embedding",
    "crop",
    "passwordHash",
    "tokenHash",
    "productDefaultOn\":true",
  ]) {
    assert(!serialized.includes(forbidden), `fixture must not expose or overclaim: ${forbidden}`);
  }
});

check("stream, video, and UI docs expose P1-01 interpretation", () => {
  for (const snippet of [
    "verify-v150-ops-tracker-warning-next-action",
    "tracker warning next-action",
    "default-on 근거가 아닙니다",
  ]) {
    assertIncludes(stream + video + uiGuide, snippet, "tracker warning docs");
  }
  for (const snippet of [
    "사용자 opt-in 튜닝 참고",
    "룰 단위 Tracker/Re-ID 조합",
    "source frame continuity, FPS, lost-buffer",
  ]) {
    assertIncludes(video + uiGuide, snippet, "video/ui tracker warning docs");
  }
});

check("server command and inventory expose V150-P1-01 verifier", () => {
  for (const snippet of [
    "verify-v150-ops-tracker-warning-next-action",
    "verify_v150_ops_tracker_warning_next_action.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_ops_tracker_warning_next_action.mjs", "script inventory");
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
console.log("== v1.5.0 Ops Dashboard tracker warning next-action summary ==");
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
