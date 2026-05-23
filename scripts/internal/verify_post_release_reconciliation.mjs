#!/usr/bin/env node
// 파일 용도: 현재 release evidence가 통과/미실행/미확인을 분리하는지 검증한다.

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
  - 현재 v1.8.0 release evidence index가 PASS/FAIL/NOT RUN/manual-not-run/미확인을 분리함
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

check("release evidence index separates executed, not-run, skipped, and unverified items", () => {
  assertIncludes(evidenceIndex, [
    "이 문서는 v1.8.0 release trust hardening 이후 release close-out evidence를 한곳에서",
    "실행한 항목만 `PASS` 또는 `FAIL`로 기록합니다.",
    "실행하지 않은 항목은 `NOT RUN`, 수동 승인 전 항목은 `manual-not-run`으로 기록합니다.",
    "열지 않은 화면, 직접 클릭하지 않은 UI, 확인하지 않은 screenshot은 `미확인`으로 기록합니다.",
    "자동 smoke, raw JSON, API 응답만으로 manual UI evidence를 완료했다고 쓰지 않습니다.",
    "`NOT RUN`, `manual-not-run`, `미확인`, `건너뜀`은 PASS가 아닙니다.",
  ], "docs/release-evidence-index.md");
});

check("longrun and external gates are explicit not-run candidates", () => {
  assertIncludes(evidenceIndex, [
    "30분 soak",
    "120분 longrun",
    "real ONVIF",
    "external TURN/WHEP",
    "YouTube real URL",
    "PASS/FAIL/NOT RUN/미확인",
  ], "docs/release-evidence-index.md");
});

check("release note template separates not-run and unverified items", () => {
  assertIncludes(releasePolicy, [
    "## Not Run / Unverified",
    "GitHub Actions status check:",
    "Longrun / soak:",
    "Real ONVIF device field smoke:",
    "YouTube real URL relay:",
    "Do not list an item as pass unless it was actually executed for this release cut.",
  ], "docs/release-policy.md");
});

check("current roadmap points at the release evidence index, not old post-release criteria", () => {
  assertIncludes(backlog, [
    "| V180-P1-03 |",
    "Release evidence index",
    "longrun, UI evidence, PR checks, release notes, skipped tests",
    "evidence index review",
  ], "docs/development-backlog.md");
});

if (historyPath) {
  check("provided history separates confirmed, unverified, and not-run sections", () => {
    assertIncludes(history, [
      "확인됨:",
      "미확인:",
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
