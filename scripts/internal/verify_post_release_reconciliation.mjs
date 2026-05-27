#!/usr/bin/env node
// 파일 용도: 현재 release evidence가 기능별 PASS/FAIL 결과와 실행/미실행 상태를 분리하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release evidence reconciliation verification

Usage:
  ./server.sh verify-post-release-reconciliation [options]

Options:
  --history <path>  선택 evidence log 경로입니다. 지정하면 기본 section 경계도 확인합니다.
  -h, --help        도움말 출력

Checks:
  - 현재 release evidence index가 기능별 PASS/FAIL 결과와 release 실행 상태를 분리함
  - 실행하지 않은 장시간/실장비/외부 검증을 release PASS로 쓰지 않는 문구가 있음
  - release note template에도 Not Run / Unverified 섹션이 있음
`);
}

assertKnownOptions(rawArgs, ["history", "h", "help"]);

const args = parseArgs(rawArgs);
const historyPath = args.history ? path.resolve(rootDir, args.history) : "";
const history = historyPath ? fs.readFileSync(historyPath, "utf8") : "";
const evidenceIndex = readText("docs/release-evidence-index.md");
const releasePolicy = readText("docs/release-policy.md");
const backlog = readText("docs/development-backlog.md");

const checks = [];

check("release evidence index separates feature result rows from release execution states", () => {
  assertIncludes(evidenceIndex, [
    "이 문서는 v1.8.0 release trust hardening 이후 release close-out evidence를 한곳에서",
    "기능별 테스트 결과 행은 `PASS` 또는 `FAIL`만 기록합니다.",
    "UI 풀테스트 대상인데 열지 않은 화면, 직접 클릭하지 않은 기능, 확인하지 않은 screenshot은",
    "사용자가 실기기/외부 credential 같은 이유로 명시 제외한 항목은 기능 결과 행에서 빼고",
    "실행하지 않은 스크립트/수동 승인 gate는 기능 결과 행을 만들지 않고 release evidence",
    "자동 smoke, raw JSON, API 응답만으로 manual UI evidence를 완료했다고 쓰지 않습니다.",
    "release evidence 실행 상태 또는 별도 제외/미확인 기록에만 쓰고",
    "기능별 테스트 결과 행에는 쓰지 않습니다.",
    "기능이 이 상태라면 기능별 결과 행에서는 `FAIL`입니다.",
  ], "docs/release-evidence-index.md");
});

check("30 minute soak is listed as not-run candidate", () => {
  assertIncludes(evidenceIndex, [
    "30분 soak",
  ], "docs/release-evidence-index.md");
});

check("120 minute longrun is listed as not-run candidate", () => {
  assertIncludes(evidenceIndex, [
    "120분 longrun",
  ], "docs/release-evidence-index.md");
});

check("real ONVIF gate is listed as not-run candidate", () => {
  assertIncludes(evidenceIndex, [
    "real ONVIF",
  ], "docs/release-evidence-index.md");
});

check("external TURN gate is listed as not-run candidate", () => {
  assertIncludes(evidenceIndex, [
    "external TURN/WHEP",
  ], "docs/release-evidence-index.md");
});

check("YouTube real URL gate is listed as not-run candidate", () => {
  assertIncludes(evidenceIndex, [
    "YouTube real URL",
  ], "docs/release-evidence-index.md");
});

check("release evidence index pins result row status vocabulary", () => {
  assertIncludes(evidenceIndex, [
    "실행한 테스트 행은 `PASS` 또는 `FAIL`; 제외/미실행/미확인은 별도 기록",
  ], "docs/release-evidence-index.md");
});

check("release note template has not-run section", () => {
  assertIncludes(releasePolicy, [
    "## Not Run / Unverified",
  ], "docs/release-policy.md");
});

check("release note template has GitHub status line", () => {
  assertIncludes(releasePolicy, [
    "GitHub Actions status check:",
  ], "docs/release-policy.md");
});

check("release note template has longrun line", () => {
  assertIncludes(releasePolicy, [
    "Longrun / soak:",
  ], "docs/release-policy.md");
});

check("release note template has real ONVIF line", () => {
  assertIncludes(releasePolicy, [
    "Real ONVIF device field smoke:",
  ], "docs/release-policy.md");
});

check("release note template has YouTube line", () => {
  assertIncludes(releasePolicy, [
    "YouTube real URL relay:",
  ], "docs/release-policy.md");
});

check("release note template forbids unexecuted pass", () => {
  assertIncludes(releasePolicy, [
    "Do not list an item as pass unless it was actually executed for this release cut.",
  ], "docs/release-policy.md");
});

check("current roadmap points at the release evidence index", () => {
  assertIncludes(backlog, [
    "| V180-P1-03 |",
    "Release evidence index",
    "longrun, UI evidence, PR checks, release notes, skipped tests",
    "evidence index review",
  ], "docs/development-backlog.md");
});

if (historyPath) {
  check("provided history includes confirmed section", () => {
    assertIncludes(history, [
      "확인됨:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });

  check("provided history includes unverified section", () => {
    assertIncludes(history, [
      "미확인:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });

  check("provided history includes not-run section", () => {
    assertIncludes(history, [
      "미실행:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });
}

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
console.log("== Release evidence reconciliation summary ==");
console.log(`- history: ${historyPath ? path.relative(rootDir, historyPath).replaceAll(path.sep, "/") : "not provided; current evidence index only"}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
