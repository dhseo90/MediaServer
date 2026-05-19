#!/usr/bin/env node
// 파일 용도: v1.5.0 Field smoke summary evidence boundary 범위를 정적으로 검증한다.
// 동작 요약: tracker/Re-ID field smoke evidence가 raw media가 아닌 summary/report/history index로만 보존되는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 Field smoke summary evidence boundary verification

Usage:
  ./server.sh verify-v150-field-smoke-summary-evidence-boundary [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V150-P1-03 roadmap가 summary/report/history index evidence 경계를 문서화했는지 확인
  - compare-close-object-tracker history archive가 raw media/source/model/auth material을 제외하는지 확인
  - release/verification docs가 완료/미확인/비범위와 별도 Phase 후보를 분리하는지 확인
  - server.sh, script inventory, stream/video/archive policy docs가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const archivePolicy = readText("docs/close-object-report-archive-policy.md");
const compare = readText("scripts/internal/compare_close_object_tracker.py");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V150-P1-03 Field smoke summary evidence boundary 정리 기준",
  "v1.5.0 비범위:"
);
const checks = [];

check("roadmap defines V150-P1-03 summary evidence scope and follow-up classification", () => {
  for (const snippet of [
    "V150-P1-03 Field smoke summary evidence boundary",
    "summary/report/history index evidence",
    "raw media, crop, embedding, model path/checksum/provenance",
    "source URL/URI/file",
    "credential/auth/session material",
    "release 문서에서 완료/미확인/비범위를 분리",
    "verify-v150-field-smoke-summary-evidence-boundary",
    "verify-v140-report-archive-policy",
    "compare-close-object-tracker --history-dir",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V150-P1-03 roadmap section");
  }
});

check("roadmap keeps future field/release phases out of P1-03", () => {
  for (const snippet of [
    "V150-P2-01 OC-SORT experimental sandbox",
    "field sample history review workflow",
    "ONVIF field smoke evidence reconciliation",
    "release evidence dashboard cleanup",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
    "제품 default tracker/Re-ID 변경",
  ]) {
    assertIncludes(section, snippet, "V150-P1-03 out-of-scope section");
  }
  for (const forbidden of [
    "field sample history review workflow 완료",
    "ONVIF field smoke evidence reconciliation 완료",
    "release evidence dashboard cleanup 완료",
    "제품 default-on 완료",
    "실장비 field smoke 통과",
    "raw field media archive 완료",
  ]) {
    assert(!section.includes(forbidden), `V150-P1-03 must not overclaim: ${forbidden}`);
  }
});

check("compare harness stores explicit summary evidence boundary without raw material", () => {
  for (const snippet of [
    "summary_evidence_boundary",
    "\"scope\": \"field-smoke-summary-evidence\"",
    "\"summary.json\"",
    "\"report.md\"",
    "\"matrix-summary.json\"",
    "\"matrix-report.md\"",
    "\"index.json\"",
    "\"index.md\"",
    "\"raw media\"",
    "\"raw frame\"",
    "\"crop\"",
    "\"embedding\"",
    "\"model path/checksum/provenance\"",
    "\"source URL/URI/file\"",
    "\"credential/auth/session material\"",
    "summary/report/history index evidence only",
    "real field endpoint success",
    "\"evidenceBoundary\": summary_evidence_boundary()",
    "archive_comparison_history",
    "archive_matrix_history",
  ]) {
    assertIncludes(compare, snippet, "compare_close_object_tracker.py");
  }
});

check("archive policy separates retained evidence from forbidden raw media", () => {
  for (const snippet of [
    "v1.5.0 Field Smoke Summary Evidence Boundary",
    "field-smoke-summary-evidence",
    "summary/report/history index evidence",
    "raw media, raw frame, crop, embedding",
    "model path/checksum/provenance",
    "source URL/URI/file",
    "credential/auth/session material",
    "실장비 ONVIF field smoke 성공",
    "release asset 업로드",
  ]) {
    assertIncludes(archivePolicy, snippet, "close-object archive policy");
  }
});

check("stream and video docs expose P1-03 interpretation", () => {
  for (const snippet of [
    "verify-v150-field-smoke-summary-evidence-boundary",
    "Field smoke summary evidence boundary",
    "summary/report/history index evidence",
    "raw media",
    "완료/미확인/비범위",
  ]) {
    assertIncludes(stream + video, snippet, "stream/video docs");
  }
});

check("server command and inventory expose V150-P1-03 verifier", () => {
  for (const snippet of [
    "verify-v150-field-smoke-summary-evidence-boundary",
    "verify_v150_field_smoke_summary_evidence_boundary.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_field_smoke_summary_evidence_boundary.mjs", "script inventory");
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
console.log("== v1.5.0 Field smoke summary evidence boundary summary ==");
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
