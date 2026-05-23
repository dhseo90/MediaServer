#!/usr/bin/env node
// 파일 용도: v1.6.0 public docs consistency polish 경계를 정적으로 검증한다.
// 동작 요약: v1.6.0 close-out 당시 public tag/evidence drift와 historical evidence 표현을 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 public docs consistency polish verification

Usage:
  ./server.sh verify-v160-public-docs-consistency-polish [options]

Options:
  -h, --help  도움말 출력

Checks:
  - v1.6.0 close-out 당시 public docs의 tag/evidence drift 정리 기준을 확인
  - current release 문서가 v1.6.0을 현재 release로 되살리지 않는지 확인
  - v1.6.0 P0/P1/P2 docs 링크와 비범위 표현을 확인
  - server.sh와 script inventory가 전용 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-public-docs-consistency-polish.md");
const backlog = readText("docs/development-backlog.md");
const versioning = readText("docs/versioning-policy.md");
const releasePolicy = readText("docs/release-policy.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const stream = readText("docs/stream-verification.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const docsRootIndex = readText("docs/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P2-01 Public docs consistency polish 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

const v160Docs = [
  "v1.6.0-release-evidence-dashboard.md",
  "v1.6.0-stability-verification-gates.md",
  "v1.6.0-debug-exposure-regression-guard.md",
  "v1.6.0-tracker-reid-opt-in-closeout.md",
  "v1.6.0-onvif-field-smoke-evidence-reconciliation.md",
  "v1.6.0-audit-export-masking-regression-hardening.md",
  "v1.6.0-runtime-model-bundle-rc-policy.md",
  "v1.6.0-manual-ui-release-checklist-closure.md",
  "v1.6.0-public-docs-consistency-polish.md",
];

check("dedicated doc defines historical public docs tag and stabilization evidence boundary", () => {
  for (const snippet of [
    "# v1.6.0 Public Docs Consistency Polish",
    "V160-P2-01",
    "v1.6.0 close-out historical evidence",
    "최신 published source-only",
    "v1.6.0 close-out 당시 public docs는 source-only release tag를 `v1.6.0`",
    "v1.6.0은 source-only stabilization release이며 runtime/model/binary bundle",
    "v1.6.0 close-out 당시 latest source-only release를 `v1.6.0`으로 표시했습니다",
    "source-only/live-only 경계",
    "binary/runtime/model bundle 제외",
    "실장비/장시간/외부 credential gate 미실행",
    "VMS/NVR",
    "ONVIF Profile G",
    "Re-ID/tracker default-on",
    "OC-SORT/BoT-SORT/DeepSORT runtime promotion",
    "verify-v160-public-docs-consistency-polish",
  ]) {
    assertIncludes(doc, snippet, "v1.6 public docs consistency doc");
  }
  for (const item of v160Docs) {
    assertIncludes(doc, item, "v1.6 public docs consistency links");
  }
});

check("roadmap defines V160-P2-01 scope and keeps tracker planning separate", () => {
  for (const snippet of [
    "V160-P2-01 Public docs consistency polish",
    "v1.6.0 Public Docs Consistency Polish",
    "v1.6.0 close-out historical evidence",
    "source-only release 기준 tag 판정은 상단 v1.8.0 기준",
    "v1.6.0 close-out 당시 public docs는 source-only release tag를 `v1.6.0`",
    "v1.6.0은 source-only stabilization release",
    "verify-v160-public-docs-consistency-polish",
    "verify-release-metadata",
    "verify-docs-links",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P2-02",
    "VERSION/CMake release version 변경",
    "tag, push, GitHub Release 생성",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P2-01 roadmap section");
  }
  for (const forbidden of [
    "V160-P2-02 완료",
    "GitHub Release 생성 완료",
    "VERSION/CMake release version 변경 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P2-01 must not overclaim: ${forbidden}`);
  }
});

check("public docs keep current tag on latest release while linking v1.6 evidence as history", () => {
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.8.0", `${label} current tag`);
    assertIncludes(text, "docs/README.md", `${label} root docs index link`);
  }
  assertIncludes(docsRootIndex, "## Archive", "docs README archive section");
  assertIncludes(docsRootIndex, "과거 version-named close-out 문서는 증적 보존용 archive", "docs README archive boundary");
  assert(!docsRootIndex.includes("v1.6.0 Historical Release Evidence"), "docs README must not foreground old release evidence as current navigation");
  assertIncludes(docsIndex, "v1.8.0 is the current source-only release baseline for release preparation.", "docs/en current boundary");
});

check("versioning and release policy pin current release while preserving v1.6 history", () => {
  for (const snippet of [
    "현재 기준 버전: `v1.8.0`",
    "현재 source-only release 기준 tag는 `v1.8.0`",
    "v1.6.0 release evidence 문서는 historical evidence로 유지합니다",
  ]) {
    assertIncludes(versioning, snippet, "versioning policy");
  }
  for (const snippet of [
    "현재 source-only release 기준 tag는 `v1.8.0`",
    "source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다",
    "v1.6.0 Public Docs Consistency Polish",
    "verify-v160-public-docs-consistency-polish",
    "v1.6.0 close-out",
  ]) {
    assertIncludes(releasePolicy, snippet, "release policy");
  }
});

check("release dashboard and stream verification expose P2 public docs guard", () => {
  for (const snippet of [
    "V160-P2-01 Public docs consistency polish",
    "v1.6.0 Public Docs Consistency Polish",
    "verify-v160-public-docs-consistency-polish",
  ]) {
    assertIncludes(dashboard, snippet, "release evidence dashboard");
    assertIncludes(stream, snippet, "stream verification");
  }
});

check("server command and inventory expose V160-P2-01 verifier", () => {
  for (const snippet of [
    "verify-v160-public-docs-consistency-polish",
    "verify_v160_public_docs_consistency_polish.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_public_docs_consistency_polish.mjs", "script inventory");
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
console.log("== v1.6.0 public docs consistency polish summary ==");
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
