#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance bundle dry-run command와 evidence boundary 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 test acceptance bundle contract verification

Usage:
  ./server.sh verify-v390-test-acceptance-bundle-contract

Checks:
  - acceptance bundle dry-run command exists
  - dry-run summary separates local/static, 30-minute, UI automation, 120-minute, published, and release action evidence
  - docs and release evidence record R3 without running long/UI/publish actions
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-test-acceptance-bundle";
const contractCommand = "verify-v390-test-acceptance-bundle-contract";
const script = "verify_v390_test_acceptance_bundle.mjs";
const contractScript = "verify_v390_test_acceptance_bundle_contract.mjs";
const checks = [];

const files = {
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  backlog: readText("docs/development-backlog.md"),
};

check("server.sh and script inventory expose R3 acceptance bundle commands", () => {
  for (const name of [script, contractScript]) {
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", name)), `missing script: ${name}`);
    assertIncludes(files.serverSh, name, "server.sh R3 dispatch");
    assertIncludes(files.scriptInventory, name, "script inventory R3");
  }
  for (const name of [command, contractCommand]) {
    assertIncludes(files.serverSh, name, "server.sh R3 command");
  }
});

check("dry-run writes replayable acceptance summary without executing gated suites", () => {
  const outputDir = path.join("/tmp", `media_server_v390_acceptance_contract_${process.pid}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  execFileSync(path.join(rootDir, "server.sh"), [
    command,
    "--dry-run",
    "--output-dir",
    outputDir,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.schema === "media-server.v390-test-acceptance-bundle.v1", "unexpected summary schema");
  assert(summary.result === "PASS", "dry-run result must be PASS");
  assert(summary.dryRun === true, "summary must mark dryRun=true");
  assert(summary.longrun30?.status === "pass-existing-evidence", "30-minute evidence status mismatch");
  assert(summary.uiAutomation?.status === "approval-required-not-run", "UI automation status mismatch");
  assert(summary.longrun120?.status === "conditional-not-run", "120-minute status mismatch");
  assert(summary.publishedMetadata?.status === "not-run-by-dry-run", "published metadata status mismatch");
  assert(summary.releaseAction?.status === "not-run-by-dry-run", "release action status mismatch");
  assert(summary.evidenceBoundary.includes("dry-run does not execute"), "evidence boundary missing");
  assert(fs.existsSync(path.join(outputDir, "report.md")), "missing report.md");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("docs and release evidence record R3 without overclaiming gated tests", () => {
  for (const snippet of [
    "v3.9.0 R3 test acceptance bundle",
    command,
    contractCommand,
    "media-server.v390-test-acceptance-bundle.v1",
    "dry-run does not execute",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.projectInventory, snippet, "R3 stream/project docs");
  }
  for (const snippet of [
    "v390 R3 RED test acceptance bundle contract",
    "v390 R3 test acceptance bundle dry-run final",
    "v390 R3 actual acceptance bundle",
    "approval-required-not-run",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "R3 release records");
  }
  for (const snippet of [
    "v3.9.0 R3 test acceptance bundle",
    command,
    contractCommand,
    "UI automation PASS",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "R3 release evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 test acceptance bundle contract summary ==");
console.log("- schema: media-server.v390-test-acceptance-bundle.v1");
console.log(`- command: ${command}`);
console.log(`- contractCommand: ${contractCommand}`);
console.log("- actualAcceptanceBundle: not-run-by-this-command");
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
