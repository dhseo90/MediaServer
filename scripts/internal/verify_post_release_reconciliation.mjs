#!/usr/bin/env node
// 파일 용도: post-release smoke reconciliation 기록이 통과/미실행/미확인을 분리하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Post-release smoke reconciliation verification

Usage:
  ./server.sh verify-post-release-reconciliation [options]

Options:
  --history <path>  verification history 문서입니다. 기본 docs/history/verification-history.md.
  -h, --help        도움말 출력

Checks:
  - GitHub Actions, local smoke, longrun, real-device 항목이 분리 기록됨
  - 실행하지 않은 장시간/실장비/외부 검증을 release PASS로 쓰지 않는 문구가 있음
  - release note template에도 Not run / Unverified 섹션이 있음
`);
}

assertKnownOptions(rawArgs, ["history", "h", "help"]);

const args = parseArgs(rawArgs);
const historyPath = path.resolve(rootDir, args.history || "docs/history/verification-history.md");
const history = fs.readFileSync(historyPath, "utf8");
const releasePolicy = readText("docs/release-policy.md");
const backlog = readText("docs/development-backlog.md");

const checks = [];

check("verification history has v1.2.1 reconciliation record", () => {
  assertIncludes(history, [
    "## 2026-05-17 - v1.2.1 Post-release smoke reconciliation",
    "확인됨:",
    "미확인:",
    "미실행:",
    "통과로 쓰지 않는 항목:",
    "GitHub Actions: 미확인",
    "./server.sh verify-public-repo-readiness",
    "./server.sh verify-docs-links",
    "./server.sh verify-post-release-reconciliation",
    "실행하지 않은 검증은 release PASS로 쓰지 않습니다.",
  ], "docs/history/verification-history.md");
});

check("longrun and real-device not-run items are explicit", () => {
  assertIncludes(history, [
    "verify-predev --soak-minutes 30",
    "verify-predev --soak-minutes 120",
    "verify-va-runtime-console-longrun --duration-minutes 120",
    "ONVIF 실장비 field smoke",
    "YouTube 실제 URL relay",
    "외부 TURN/WHEP credential 운영 검증",
  ], "docs/history/verification-history.md");
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

check("v1.2.1 roadmap points at reconciliation verifier", () => {
  assertIncludes(backlog, [
    "| V121-P0-02 |",
    "verify-post-release-reconciliation",
  ], "docs/development-backlog.md");
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
console.log("== Post-release smoke reconciliation summary ==");
console.log(`- history: ${path.relative(rootDir, historyPath).replaceAll(path.sep, "/")}`);
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
