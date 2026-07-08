#!/usr/bin/env node
// 파일 용도: v3.9.0 R4 legacy verify-predev와 새 release-grade longrun runner 역할 정렬을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 longrun runner role alignment verification

Usage:
  ./server.sh verify-v390-longrun-runner-role-alignment

Checks:
  - verify-predev remains the legacy/compatibility cumulative predev runner
  - verify-v390-server-longrun is the v3.9 release-grade first-fail 30/120 runner
  - trigger matrix, release policy, inventory, records, and server dispatch use the same role split
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-longrun-runner-role-alignment";
const script = "verify_v390_longrun_runner_role_alignment.mjs";
const checks = [];

const files = {
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  releasePolicy: readText("docs/release-policy.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  backlog: readText("docs/development-backlog.md"),
};

check("server dispatch exposes R4 role alignment verifier", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, script, "server.sh script");
  assertIncludes(files.scriptInventory, script, "script inventory");
});

check("docs choose role split option 3 explicitly", () => {
  for (const snippet of [
    "v3.9.0 R4 longrun runner role alignment",
    "R4 선택: option 3",
    "`verify-predev` remains legacy/compatibility cumulative predev runner",
    "`verify-v390-server-longrun` is the release-grade first-fail runner",
    "verify-v390-server-longrun --duration-minutes 30",
    "verify-v390-server-longrun --duration-minutes 120",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.backlog, snippet, "R4 stream/backlog docs");
  }
});

check("trigger matrix and release policy name v390 release-grade runner without rewriting historical evidence", () => {
  for (const snippet of [
    "v3.9.0 release-grade longrun runner",
    "verify-v390-server-longrun --duration-minutes 30",
    "verify-v390-server-longrun --duration-minutes 120",
    "historical `verify-predev --soak-minutes 30` evidence remains preserved",
    "historical `verify-predev --soak-minutes 120` evidence remains preserved",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.releasePolicy, snippet, "R4 trigger/release policy");
  }
});

check("inventory and evidence records keep old and new longrun evidence separate", () => {
  for (const snippet of [
    "v3.9.0 R4 longrun runner role alignment",
    "verify-v390-longrun-runner-role-alignment",
    "R1 30분 runner actual final",
    "legacy/compatibility runner",
    "release-grade first-fail runner",
  ]) {
    assertIncludes(files.projectInventory + "\n" + files.releaseRecords + "\n" + files.releaseEvidence, snippet, "R4 inventory/evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 longrun runner role alignment summary ==");
console.log("- schema: media-server.v390-longrun-runner-role-alignment.v1");
console.log("- selectedOption: 3");
console.log("- verifyPredevRole: legacy/compatibility cumulative predev runner");
console.log("- v390RunnerRole: release-grade first-fail runner");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
