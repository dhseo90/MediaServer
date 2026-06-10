#!/usr/bin/env node
// File purpose: verify v2.4.0 S08 release readiness gate mapping.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.4.0 S08 release readiness gate verification

Usage:
  ./server.sh verify-v240-release-readiness-gate

Checks:
  - V240-S08 roadmap row references this gate and the local release readiness commands
  - release policy records the v2.4.0 readiness command set and manual/not-run boundaries
  - release evidence index records the S08 gate without promoting skipped release actions
  - server.sh exposes the S08 verifier
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v240-release-readiness-gate",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-ci-local-gate-parity",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("backlog S08 points to the release readiness gate", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 8 \| V240-S08 \| P2 \| (진행|완료) \| Release readiness \|/.test(backlog),
    "backlog V240-S08 row must be 진행 or 완료");
  for (const snippet of readinessCommands) {
    assert(backlog.includes(snippet), `backlog missing readiness command: ${snippet}`);
  }
  for (const snippet of [
    "문서 링크/assets",
    "release metadata",
    "close-out dry-run",
    "CI/local parity",
    "미실행/제외 테스트 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S08 scope snippet: ${snippet}`);
  }
});

check("release policy records v2.4.0 readiness boundaries", () => {
  const policy = readText("docs/release-policy.md");
  for (const snippet of [
    "## v2.4.0 Release Readiness Gate",
    "media-server.v240-release-readiness-gate.v1",
    "문서 링크/assets",
    "release metadata",
    "CI/local parity",
    "close-out dry-run",
    "tag/push/GitHub Release 생성 미수행",
    "published metadata는 publish 이후 `--published`",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
  ]) {
    assert(policy.includes(snippet), `release policy missing readiness snippet: ${snippet}`);
  }
  for (const snippet of readinessCommands) {
    assert(policy.includes(snippet), `release policy missing readiness command: ${snippet}`);
  }
});

check("release evidence index records S08 without promoting not-run tests", () => {
  const evidence = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v240-s08-release-readiness-gate-20260610",
    "media-server.v240-release-readiness-gate.v1",
    "v2.4.0 S08 Release Readiness Gate",
    "문서 링크/assets",
    "release metadata",
    "CI/local parity",
    "close-out dry-run",
    "tag/push/GitHub Release manual-not-run",
    "verify-release-metadata --published 미실행",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "Not run for `v240-s08-release-readiness-gate-20260610`",
  ]) {
    assert(evidence.includes(snippet), `release evidence index missing S08 snippet: ${snippet}`);
  }
  for (const snippet of readinessCommands) {
    assert(evidence.includes(snippet), `release evidence index missing readiness command: ${snippet}`);
  }
});

check("server entrypoint exposes the S08 verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-v240-release-readiness-gate"),
    "server.sh missing verify-v240-release-readiness-gate");
  assert(serverSh.includes("verify_v240_release_readiness_gate.mjs"),
    "server.sh missing S08 verifier script dispatch");
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
console.log("== v2.4.0 S08 release readiness gate summary ==");
console.log("- schema: media-server.v240-release-readiness-gate.v1");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
