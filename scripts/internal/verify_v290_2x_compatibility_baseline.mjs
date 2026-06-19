#!/usr/bin/env node
// 파일 용도: v2.9.0 S03에서 2.x 핵심 feature compatibility verifier를 현재 source 기준으로 실행한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 2.x compatibility baseline verification

Usage:
  ./server.sh verify-v290-2x-compatibility-baseline

Checks:
  - V290-S03 문서/인벤토리/release record가 2.x compatibility baseline gate를 가리키는지 확인
  - v2.5, v2.6, v2.7 핵심 feature verifier와 v2.9 S01/S02 gate를 현재 source tree에서 실행
  - 각 하위 verifier가 실제 실행한 범위만 PASS로 기록하고 UI/longrun/published metadata를 대체하지 않는 경계 유지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const commandGroups = [
  {
    release: "v2.5.0",
    commands: [
      "verify-v250-incident-text-projection",
      "verify-v250-incident-memory-index",
      "verify-v250-ops-events-semantic-search-ui",
      "verify-v250-incident-timeline-graph",
      "verify-v250-explainable-incident-brief",
      "verify-v250-similar-incident-lookup",
      "verify-v250-client-safe-incident-digest",
      "verify-v250-redacted-incident-evidence-bundle",
    ],
  },
  {
    release: "v2.6.0",
    commands: [
      "verify-v260-incident-memory-productization",
      "verify-v260-rule-suggestion-review",
      "verify-v260-onvif-credential-gate",
      "verify-v260-runtime-dashboard-trends",
      "verify-v260-scenario-cross-zone-reentry",
    ],
  },
  {
    release: "v2.7.0",
    commands: [
      "verify-v270-incident-triage-board",
      "verify-v270-incident-decision-scorecard",
      "verify-v270-operational-action-pack",
      "verify-v270-rule-what-if-preview",
      "verify-v270-operator-outcome-memory",
    ],
  },
  {
    release: "v2.8/v2.9 bridge",
    commands: [
      "verify-v290-final-contract-freeze",
      "verify-v290-v28-regression-bundle",
    ],
  },
];

const flatCommands = commandGroups.flatMap((group) => group.commands);
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const serverSh = readText("server.sh");

check("roadmap and stream verification expose V290-S03 compatibility baseline", () => {
  for (const snippet of [
    "| 3 | V290-S03 | P0 | 완료 | 2.x compatibility gate |",
    "`./server.sh verify-v290-2x-compatibility-baseline`",
    "각 하위 verifier가 실제 실행한 범위만 PASS",
    "## v2.9.0 S03 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S03 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S03 | `./server.sh verify-v290-2x-compatibility-baseline` |",
    "v2.5~v2.8 핵심 verifier를 v2.9 release gate에서 추적",
    "각 하위 verifier가 실제 실행한 범위만 PASS",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S03 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S03 to OPS-044 and SAFE-074", () => {
  for (const snippet of [
    "전체 기능 항목 | 505",
    "기능 ID 목록 | 505개 기능 ID",
    "V290-S03 2.x compatibility gate | `OPS-044`, `SAFE-074` | `verify-v290-2x-compatibility-baseline`",
    "`SAFE-001`~`SAFE-074`",
    "`OPS-035`~`OPS-044`",
    "SAFE-074 | V290-S03 2.x compatibility baseline boundary",
    "OPS-044 | V290-S03 2.x compatibility baseline 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S03 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v290-2x-compatibility-baseline"), "feature coverage missing V290-S03 verifier");
  assert(projectInventoryVerifier.includes("`SAFE-001`~`SAFE-074`"), "project inventory verifier missing SAFE-074 range");
  assert(projectInventoryVerifier.includes("`OPS-035`~`OPS-044`"), "project inventory verifier missing OPS-044 range");
});

check("release records include S03 test item, RED failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 2.x compatibility baseline",
    "`./server.sh verify-v290-2x-compatibility-baseline`",
    "최초 `./server.sh verify-v290-2x-compatibility-baseline`는 command 미구현으로 fail",
    "v290 S03 UI 풀테스트",
    "v290 S03 30분/120분 longrun",
    "v290 S03 published metadata",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing S03 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes V290-S03 compatibility command", () => {
  for (const snippet of [
    "verify-v290-2x-compatibility-baseline",
    "verify_v290_2x_compatibility_baseline.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S03 command snippet: ${snippet}`);
  }
});

check("compatibility subcommands are documented and registered", () => {
  for (const command of flatCommands) {
    assert(streamVerification.includes(command) || command.startsWith("verify-v290-"),
      `stream verification missing subcommand ${command}`);
    assert(serverSh.includes(command), `server.sh missing subcommand ${command}`);
  }
});

const docResults = runChecks();
const commandResults = docResults.fail === 0 ? runSubcommands() : [];
const commandFail = commandResults.filter((item) => item.status !== 0).length;

console.log("");
console.log("== v2.9.0 2.x compatibility baseline summary ==");
console.log("- schema: media-server.v290-2x-compatibility-baseline.v1");
console.log("- subcommandScope: v2.5/v2.6/v2.7 feature verifiers plus v2.9 S01/S02 gates");
console.log("- ownerReleaseReadinessGates: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- docPass: ${docResults.pass}`);
console.log(`- docFail: ${docResults.fail}`);
console.log(`- subcommandPass: ${commandResults.filter((item) => item.status === 0).length}`);
console.log(`- subcommandFail: ${commandFail}`);
if (docResults.fail > 0 || commandFail > 0) process.exit(1);

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

function runSubcommands() {
  const results = [];
  for (const group of commandGroups) {
    console.log("");
    console.log(`== ${group.release} ==`);
    for (const command of group.commands) {
      const result = spawnSync(path.join(rootDir, "server.sh"), [command], {
        cwd: rootDir,
        encoding: "utf8",
        env: process.env,
        maxBuffer: 20 * 1024 * 1024,
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      const status = result.status ?? 1;
      console.log(`[${status === 0 ? "pass" : "fail"}] ${command} exit ${status}`);
      results.push({ release: group.release, command, status });
      if (status !== 0) break;
    }
    if (results.some((item) => item.release === group.release && item.status !== 0)) break;
  }
  return results;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
