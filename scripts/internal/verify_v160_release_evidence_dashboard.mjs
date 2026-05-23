#!/usr/bin/env node
// 파일 용도: v1.6.0 release evidence dashboard가 실행/미실행/미확인 항목을 분리하는지 검증한다.
// 동작 요약: v1.6.0 P0-01 문서, roadmap, release/verification 문서, server entrypoint 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 release evidence dashboard verification

Usage:
  ./server.sh verify-v160-release-evidence-dashboard [options]

Options:
  -h, --help  도움말 출력

Checks:
  - v1.6.0 release evidence dashboard가 확인됨/미실행/미확인을 분리하는지 확인
  - V160-P0-01 roadmap section이 P0 안정화 범위와 P1/P2/별도 Phase 경계를 유지하는지 확인
  - release evidence가 source/raw/model/auth material을 포함하지 않는지 확인
  - README, stream verification, release policy, server.sh, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const docsRootIndex = readText("docs/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P0-01 Release evidence dashboard cleanup 정리 기준",
  "### v1.6.0 비범위"
);

const checks = [];

check("dashboard separates confirmed, not-run, and unverified evidence", () => {
  for (const snippet of [
    "# v1.6.0 Release Evidence Dashboard",
    "확인됨",
    "미실행",
    "미확인",
    "NOT RUN",
    "UNVERIFIED",
    "GitHub Actions",
    "tag/push/GitHub Release",
    "실행하지 않은 장시간 soak",
    "외부 TURN/WHEP credential 운영 검증",
    "장기 테스트 report는 보존 위치와 retention days를 함께 기록",
    "`/tmp` 경로만 있으면 local-only 또는 `NOT PRESERVED`",
  ]) {
    assertIncludes(dashboard, snippet, "v1.6 evidence dashboard");
  }
});

check("dashboard keeps sensitive material out of release evidence", () => {
  for (const snippet of [
    "source URL",
    "credential",
    "auth/session material",
    "raw media",
    "raw diagnostic JSON",
    "crop",
    "embedding",
    "model path/checksum/provenance",
  ]) {
    assertIncludes(dashboard, snippet, "redaction evidence boundary");
  }
  for (const forbidden of [
    "rtsp://camera.local",
    "password=",
    "sessionToken",
    "raw-crop-bytes",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "PASS로 기록합니다",
  ]) {
    assert(!dashboard.includes(forbidden), `dashboard must not overclaim or expose sample material: ${forbidden}`);
  }
});

check("roadmap defines V160-P0-01 scope and follow-up classification", () => {
  for (const snippet of [
    "V160-P0-01 Release evidence dashboard cleanup",
    "v1.6.0 Release Evidence Dashboard",
    "확인됨",
    "미실행",
    "미확인",
    "verify-v160-release-evidence-dashboard",
    "미분류 P0~P1 후속 이슈: 없음",
    "P1/P2 및 별도 Phase 후보",
  ]) {
    assertIncludes(section, snippet, "V160-P0-01 roadmap section");
  }
});

check("roadmap keeps later P0/P1/P2 items outside P0-01 completion", () => {
  for (const snippet of [
    "V160-P0-02 Stability verification gate cleanup",
    "V160-P0-03 Client/Ops debug exposure regression guard",
    "V160-P0-04 Tracker/Re-ID opt-in stabilization close-out",
    "V160-P1-01~V160-P1-04",
    "V160-P2-01~V160-P2-02",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P0-01 out-of-scope section");
  }
  for (const forbidden of [
    "V160-P0-02 완료",
    "V160-P0-03 완료",
    "V160-P0-04 완료",
    "실장비 field smoke: PASS",
    "실장비 field smoke 성공 완료",
    "verify-predev: 통과",
    "푸시 완료",
    "GitHub Release 생성 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P0-01 must not overclaim: ${forbidden}`);
  }
});

check("docs and entrypoints link the release evidence dashboard verifier", () => {
  for (const [label, text] of [
    ["stream verification", stream],
    ["release policy", releasePolicy],
  ]) {
    assertIncludes(text, "v1.6.0-release-evidence-dashboard.md", label);
    assertIncludes(text, "verify-v160-release-evidence-dashboard", label);
  }
  assertIncludes(docsRootIndex, "## Archive", "docs README archive section");
  assertIncludes(docsRootIndex, "과거 version-named close-out 문서는 증적 보존용 archive", "docs README archive boundary");
  assert(!docsRootIndex.includes("v1.6.0 Historical Release Evidence"), "docs README must not foreground v1.6 release evidence details");
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.8.0", `${label} current release`);
    assertIncludes(text, "docs/README.md", `${label} root docs index link`);
  }
  for (const snippet of [
    "verify-v160-release-evidence-dashboard",
    "verify_v160_release_evidence_dashboard.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_release_evidence_dashboard.mjs", "script inventory");
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
console.log("== v1.6.0 release evidence dashboard summary ==");
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
