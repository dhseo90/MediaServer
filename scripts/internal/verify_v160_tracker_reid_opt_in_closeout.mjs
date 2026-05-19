#!/usr/bin/env node
// 파일 용도: v1.6.0 Tracker/Re-ID opt-in close-out이 default-off 안정화와 default-on 비승격을 고정하는지 검증한다.
// 동작 요약: close-out 문서, v1.5 carry-over verifier, roadmap, stream/video docs, server entrypoint 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 Tracker/Re-ID opt-in close-out verification

Usage:
  ./server.sh verify-v160-tracker-reid-opt-in-closeout [options]

Options:
  -h, --help  도움말 출력

Checks:
  - v1.6.0 close-out 문서가 rule-level opt-in, legacy fallback, default-off 경계를 고정하는지 확인
  - v1.5.0 follow-up/stability/provenance verifier가 carry-over gate로 연결됐는지 확인
  - default-on, runtime tracker 승격, model/runtime bundle, schema/media path 변경을 완료로 과장하지 않는지 확인
  - stream/video/readme/server/script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const closeout = readText("docs/v1.6.0-tracker-reid-opt-in-closeout.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const reid = readText("docs/reid-default-off-research-continuation.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P0-04 Tracker/Re-ID opt-in stabilization close-out 정리 기준",
  "### v1.6.0 비범위"
);

const carryOverCommands = [
  "verify-v150-follow-up-closure",
  "verify-v150-tracker-reid-stability-matrix",
  "verify-v150-reid-provenance-fallback-approval",
];

const carryOverScripts = [
  "verify_v150_follow_up_closure.mjs",
  "verify_v150_tracker_reid_stability_matrix.mjs",
  "verify_v150_reid_provenance_fallback_approval.mjs",
];

const checks = [];

check("close-out doc defines default-off tracker/Re-ID stabilization", () => {
  for (const snippet of [
    "# v1.6.0 Tracker/Re-ID Opt-in Stabilization Close-out",
    "Rule-level opt-in",
    "Legacy rule fallback",
    "tracker=lite",
    "reid=off",
    "Tracker/Re-ID matrix",
    "NoOp fallback",
    "Default-on decision",
    "Runtime/model bundle",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(closeout, snippet, "tracker/reid close-out doc");
  }
});

check("close-out doc keeps later phase candidates out of P0 completion", () => {
  for (const snippet of [
    "V160-P1-01 ONVIF field smoke evidence reconciliation",
    "V160-P1-02 Audit/export masking regression hardening",
    "V160-P1-03 Runtime/model bundle RC policy",
    "V160-P1-04 Manual UI release checklist closure",
    "V160-P2-01 Public docs consistency polish",
    "V160-P2-02 Tracker benchmark harness planning only",
    "v1.7.0 이후 별도 Phase 후보",
  ]) {
    assertIncludes(closeout, snippet, "later phase classification");
  }
  for (const forbidden of [
    "Re-ID default-on 완료",
    "tracker default-on 완료",
    "OC-SORT runtime tracker 완료",
    "model/runtime/binary bundle 완료",
    "metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!closeout.includes(forbidden), `close-out doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap defines V160-P0-04 scope and P0 phase follow-up closure", () => {
  for (const snippet of [
    "V160-P0-04 Tracker/Re-ID opt-in stabilization close-out",
    "v1.6.0 Tracker/Re-ID Opt-in Stabilization Close-out",
    "analysis.trackingPolicy.tracker",
    "analysis.trackingPolicy.reid",
    "NoOp fallback",
    "default-on 승인 근거가",
    "아닙니다",
    "verify-v160-tracker-reid-opt-in-closeout",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V160-P0-04 roadmap section");
  }
});

check("roadmap keeps P1/P2, runtime trackers, schema, and media path outside P0-04", () => {
  for (const snippet of [
    "V160-P1-01~V160-P1-04",
    "V160-P2-01~V160-P2-02",
    "Re-ID default-on",
    "tracker default-on",
    "OC-SORT, BoT-SORT, DeepSORT runtime tracker 승격",
    "model/runtime/binary bundle",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P0-04 out-of-scope section");
  }
});

check("v1.5 carry-over verifier commands remain linked", () => {
  for (const command of carryOverCommands) {
    assertIncludes(closeout, command, "close-out verifier block");
    assertIncludes(stream, command, "stream verification");
    assertIncludes(server, command, "server.sh");
  }
  for (const script of carryOverScripts) {
    assertIncludes(server, script, "server.sh");
    assertIncludes(inventory, script, "script inventory");
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", script)), `missing carry-over verifier: ${script}`);
  }
});

check("docs and entrypoints link the v1.6 tracker/Re-ID close-out verifier", () => {
  for (const [label, text] of [
    ["release dashboard", dashboard],
    ["stream verification", stream],
    ["video analysis", video],
    ["Re-ID continuation", reid],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.6.0-tracker-reid-opt-in-closeout.md", label);
    assertIncludes(text, "verify-v160-tracker-reid-opt-in-closeout", label);
  }
  for (const snippet of [
    "verify-v160-tracker-reid-opt-in-closeout",
    "verify_v160_tracker_reid_opt_in_closeout.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_tracker_reid_opt_in_closeout.mjs", "script inventory");
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
console.log("== v1.6.0 Tracker/Re-ID opt-in close-out summary ==");
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
