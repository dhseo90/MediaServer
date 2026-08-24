#!/usr/bin/env node
// 파일 용도: v4.0.0 로컬 운영 정책화/안정화 로드맵과 테스트 스크립트 반영 불변 조건을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 roadmap contract verification

Usage:
  ./server.sh verify-v400-roadmap-contract

Checks:
  - backlog keeps v4.0.0 as local operations policy/stabilization
  - v4.1.0 owns new-feature candidates
  - every listed step requires test-script reflection
  - inventory, stream-verification, release records, and server.sh dispatch are wired

This command is not VERSION 4.0.0 baseline, feature implementation, UI fulltest,
30/120 minute, published metadata, or release action evidence.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const backlog = read("docs/development-backlog.md");
const streamVerification = read("docs/stream-verification.md");
const inventory = read("docs/project-feature-test-inventory.md");
const records = read("docs/release-test-records.md");
const versioning = read("docs/versioning-policy.md");
const serverSh = read("server.sh");
const version = read("VERSION").trim();

const v400Steps = [
  "v4.0.0 (1) v4.0.0 baseline 정렬",
  "v4.0.0 (2) User Review Gate",
  "v4.0.0 (3) 검증 계층 축소 규칙",
  "v4.0.0 (4) 로컬 운영 정책 freeze",
  "v4.0.0 (5) Incident OS 정책화",
  "v4.0.0 (6) Evidence 운영 정책화",
  "v4.0.0 (7) 로컬 운영 안정화",
  "v4.0.0 (8) stabilization and release readiness",
];
const v410Steps = [
  "v4.1.0 (1) Incident OS 제품 승격",
  "v4.1.0 (2) Evidence default-on 제품화",
  "v4.1.0 (3) 로컬 Action Execution",
  "v4.1.0 (4) 로컬 credential store",
  "v4.1.0 (5) Tracker 제품 기본 선택",
  "v4.1.0 (6) 로컬 VLM 운영 경로",
];

check("current VERSION is 4.0.0 after v4.0.0 (1) baseline", () => {
  assert(version === "4.0.0", `VERSION must be 4.0.0 after v4.0.0 (1), got ${version}`);
});

check("backlog names the v4.0.0 policy/stabilization roadmap", () => {
  for (const snippet of [
    "## v4.0.0 개발 로드맵: Local Operations Policy and Stabilization",
    "v4.0.0 Local Operations Policy and Stabilization",
    "로컬 운영 정책화 및 안정화",
    "신규 기능은 v4.1.0부터",
    "테스트 스크립트 반영 불변 조건",
    "테스트 스크립트 반영을 다음 스텝으로 미루거나",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing: ${snippet}`);
  }
});

check("every v4.0.0 step exists and requires test-script reflection", () => {
  const section = extractSection(backlog, "## v4.0.0 개발 로드맵: Local Operations Policy and Stabilization");
  for (const title of v400Steps) {
    const row = findTableRow(section, title);
    assert(row, `missing v4.0.0 step row: ${title}`);
    assert(row.includes("테스트 스크립트 반영 필수"), `${title} missing 테스트 스크립트 반영 필수`);
  }
});

check("v4.1.0 new-feature candidates stay out of v4.0.0 implementation", () => {
  const section = extractSection(backlog, "### v4.1.0 이후 신규 기능 후보");
  assert(section.includes("4.0.0에서 구현하지 않는다"), "v4.1.0 section missing 4.0.0 non-implementation boundary");
  for (const title of v410Steps) {
    const row = findTableRow(section, title);
    assert(row, `missing v4.1.0 candidate row: ${title}`);
    assert(row.includes("테스트 스크립트 반영 필수"), `${title} missing 테스트 스크립트 반영 필수`);
  }
});

check("v4.0.0 non-scope excludes field devices and new media contracts", () => {
  const section = extractSection(backlog, "## v4.0.0 개발 로드맵: Local Operations Policy and Stabilization");
  for (const snippet of [
    "ONVIF 실카메라 성공",
    "외부 TURN/WHEP field",
    "cloud VLM 제품 호출",
    "VMS/NVR",
    "Event POST / DataChannel / SSE·WS / RTSP·WebRTC media path 변경",
  ]) {
    assert(section.includes(snippet), `v4.0.0 non-scope missing: ${snippet}`);
  }
});

check("versioning policy pins v4.0.0 current source and keeps published v3.9.1", () => {
  assert(versioning.includes("현재 소스 버전: `4.0.0`"), "versioning policy current source pin drifted");
  assert(versioning.includes("현재 source roadmap: `v4.0.0 Local Operations Policy and Stabilization`"),
    "versioning policy current roadmap pin drifted");
  assert(versioning.includes("## v4.0.0 현재 source 개발 범위"), "versioning policy missing v4.0.0 range");
  assert(versioning.includes("최신 공개 GitHub Release: `v3.9.1`"), "versioning policy published pin drifted");
  assert(versioning.includes("신규 기능은 `v4.1.0`부터 넣는다"), "versioning policy missing v4.1.0 handoff");
});

check("stream verification, inventory, and records wire the roadmap contract", () => {
  assert(streamVerification.includes("v4.0.0 roadmap contract"), "stream verification missing v4.0.0 row");
  assert(streamVerification.includes("./server.sh verify-v400-roadmap-contract"), "stream verification missing command");
  assert(streamVerification.includes("./server.sh verify-v400-entry-baseline"), "stream verification missing entry baseline command");
  assert(inventory.includes("v4.0.0 Local Operations Policy and Stabilization roadmap"),
    "project inventory missing v4.0.0 mapping");
  assert(inventory.includes("verify-v400-roadmap-contract"), "project inventory missing verifier");
  assert(inventory.includes("v4.0.0 (1) v4.0.0 baseline 정렬"), "project inventory missing v4.0.0 (1) row");
  assert(records.includes("V400 roadmap contract"), "release test records missing V400 item");
  assert(records.includes("V400 entry baseline"), "release test records missing V400 entry baseline item");
  assert(records.includes("몇버전부터 들어갔는지") && records.includes("| v4.0.0 |"),
    "release test records missing v4.0.0 introduced-in column");
});

check("server.sh dispatches verify-v400-roadmap-contract", () => {
  assert(serverSh.includes("verify-v400-roadmap-contract"), "server.sh missing command help/dispatch");
  assert(serverSh.includes("verify_v400_roadmap_contract.mjs"), "server.sh missing script target");
});

const result = runChecks();
console.log("");
console.log("== v4.0.0 roadmap contract summary ==");
console.log("- schema: media-server.v400-roadmap-contract.v1");
console.log("- command: verify-v400-roadmap-contract");
console.log(`- currentVersion: ${version}`);
console.log(`- v400Steps: ${v400Steps.length}`);
console.log(`- v410Candidates: ${v410Steps.length}`);
console.log("- baselineAlignment: not-run-by-this-command");
console.log("- featureImplementation: not-run-by-this-command");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function extractSection(text, heading) {
  const start = text.indexOf(heading);
  assert(start >= 0, `heading missing: ${heading}`);
  const tail = text.slice(start);
  const next = tail.slice(heading.length).search(/\n## /);
  return next >= 0 ? tail.slice(0, heading.length + next) : tail;
}

function findTableRow(text, title) {
  const lines = text.split(/\r?\n/);
  return lines.find((line) => line.startsWith("|") && line.includes(title)) || "";
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
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
  return { pass, fail };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
