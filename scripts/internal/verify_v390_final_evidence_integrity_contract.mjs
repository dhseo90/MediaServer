#!/usr/bin/env node
// 파일 용도: v3.9 final evidence integrity verifier의 negative fixture를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 final evidence integrity contract

Usage:
  ./server.sh verify-v390-final-evidence-integrity-contract

Checks fixture acceptance, actual-only eligibility, duplicate screenshot, video placeholder,
constant/failed cleanup, and missing commit provenance rejection.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-final-evidence-integrity";
const checks = [];
const workspaces = [];
process.on("exit", () => workspaces.forEach(workspace => fs.rmSync(workspace, { recursive: true, force: true })));

check("server dispatch, script inventory, and evidence docs expose final integrity commands", () => {
  const combined = [
    readText("server.sh"),
    readText("scripts/internal/verify_script_inventory.mjs"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/release-test-records.md"),
    readText("docs/release-evidence-index.md"),
    readText("docs/stream-verification.md"),
  ].join("\n");
  for (const snippet of [
    "verify-v390-final-evidence-integrity",
    "verify-v390-final-evidence-integrity-contract",
    "최종 evidence 무결성",
    "placeholder video",
    "first-failure",
  ]) assert(combined.includes(snippet), `final integrity docs/dispatch missing: ${snippet}`);
});

check("complete fixture integrity passes only with explicit fixture allowance", () => {
  const workspace = makeFixture("valid");
  assert(runIntegrity(workspace, true).status === 0, "valid fixture integrity must pass with --allow-fixture");
  assert(runIntegrity(workspace, false).status !== 0, "fixture must not be final-evidence eligible by default");
});

check("duplicate screenshot files are rejected", () => {
  const workspace = makeFixture("duplicate-screenshot");
  const screenshots = path.join(workspace, "manual-duplicate");
  fs.mkdirSync(screenshots, { recursive: true });
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  fs.writeFileSync(path.join(screenshots, "a.png"), bytes);
  fs.writeFileSync(path.join(screenshots, "b.png"), bytes);
  assert(runIntegrity(workspace, true).status !== 0, "duplicate screenshot files must fail");
});

check("video placeholder artifacts are rejected", () => {
  const workspace = makeFixture("placeholder-video");
  fs.writeFileSync(path.join(workspace, "placeholder.video.txt"), "fixture video placeholder\n", "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "video placeholder must fail");
});

check("failed cleanup and missing source commit are rejected", () => {
  const workspace = makeFixture("cleanup-provenance");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.cleanup.checks[0].status = "FAIL";
  summary.sourceProvenance.commitSha = "";
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "failed cleanup/missing commit must fail");
});

check("preserved first failure files are required after a recovered retry", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-final-integrity-recovered-"));
  workspaces.push(workspace);
  const failed = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-fail-stage", "feature-gates",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(failed.status !== 0, "recovered fixture first execution must fail");
  const passed = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-pass",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(passed.status === 0, `recovered fixture retry failed: ${passed.stdout}\n${passed.stderr}`);
  assert(runIntegrity(workspace, true).status === 0, "recovered fixture integrity must pass with preserved failure files");
  fs.rmSync(path.join(workspace, "first-failure.md"), { force: true });
  assert(runIntegrity(workspace, true).status !== 0, "missing first-failure.md must fail integrity verification");
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 final evidence integrity contract summary ==");
console.log(`- command: ${command}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function makeFixture(label) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-final-integrity-${label}-`));
  workspaces.push(workspace);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-pass",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `fixture acceptance failed: ${run.stdout}\n${run.stderr}`);
  return workspace;
}

function runIntegrity(workspace, allowFixture) {
  const args = [command, "--summary", path.join(workspace, "summary.json")];
  if (allowFixture) args.push("--allow-fixture");
  return spawnSync(path.join(rootDir, "server.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function check(name, fn) { checks.push({ name, fn }); }

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

function assert(condition, message) { if (!condition) throw new Error(message); }
