#!/usr/bin/env node
// 파일 용도: v3.9 canonical acceptance summary의 artifact/provenance/cleanup 무결성을 재검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { scanArtifactTree } from "./evidence_integrity_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 final evidence integrity verification

Usage:
  ./server.sh verify-v390-final-evidence-integrity --summary <acceptance-summary.json>

Options:
  --summary <path>    v3.9 acceptance summary.
  --allow-fixture     Contract-only: validate integrity while retaining finalEvidenceEligible=false.

Checks:
  - source commit SHA, branch, worktree state, executed commands, first failure are recorded
  - canonical output has no duplicate screenshot files or placeholder video artifacts
  - cleanup is derived from child summary/filesystem checks instead of a constant
  - actual child longrun/UI summaries keep measured cleanup and placeholder-free artifacts
`);
}

assertKnownOptions(rawArgs, ["summary", "allow-fixture", "h", "help"]);
const options = parseArgs(rawArgs);
const summaryPath = path.resolve(options.summary);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const outputDir = path.resolve(summary.outputDir || path.dirname(summaryPath));
const checks = [];

check("acceptance summary and actual eligibility", () => {
  assert(summary.schema === "media-server.v390-test-acceptance-bundle.v1", "acceptance schema mismatch");
  assert(summary.executionMode === "actual" || options.allowFixture, `final evidence requires actual execution, got ${summary.executionMode}`);
  assert(summary.dryRun === false, "dry-run is not final evidence");
  assert(summary.result === "PASS", `acceptance result is not PASS: ${summary.result}`);
});

check("source provenance and command ledger are complete", () => {
  assert(/^[a-f0-9]{40}$/.test(String(summary.sourceProvenance?.commitSha || "")), "source commit SHA missing");
  assert(Boolean(summary.sourceProvenance?.branch), "source branch missing");
  assert(typeof summary.sourceProvenance?.worktreeClean === "boolean", "source worktree state missing");
  if (summary.executionMode === "actual") assert(summary.sourceProvenance.worktreeClean === true, "actual final evidence must start from a clean worktree");
  assert(/^[a-f0-9]{64}$/.test(String(summary.sourceProvenance?.worktreeStatusSha256 || "")), "source worktree status hash missing");
  assert(Array.isArray(summary.executedCommands) && summary.executedCommands.length > 0, "executed command ledger missing");
  assert(summary.executedCommands.every(item => item.stage && item.id && item.status && item.command), "executed command ledger entry incomplete");
});

check("first failure record matches summary state", () => {
  if (!summary.failedStage) {
    assert(summary.firstFailure === null, "PASS summary must record firstFailure=null");
    return;
  }
  assert(summary.firstFailure?.stage === summary.failedStage, "first failure stage mismatch");
  assert(Boolean(summary.firstFailure?.command), "first failure command missing");
  assert(Boolean(summary.firstFailure?.context), "first failure context missing");
  assert(Boolean(summary.firstFailure?.reproductionCommand), "first failure reproduction command missing");
});

check("recovered retry preserves its earliest first failure", () => {
  if (summary.outputPreparation?.previousFailurePreserved !== true) {
    assert(summary.priorFirstFailure === null || summary.priorFirstFailure === undefined, "unexpected prior first failure without replacement record");
    return;
  }
  const prior = summary.priorFirstFailure;
  assert(prior?.schema === "media-server.v390-acceptance-first-failure.v1", "prior first failure schema mismatch");
  assert(Boolean(prior.failedStage), "prior failed stage missing");
  assert(Boolean(prior.firstFailure?.command), "prior failure command missing");
  assert(Boolean(prior.firstFailure?.context), "prior failure context missing");
  assert(Boolean(prior.firstFailure?.reproductionCommand), "prior failure reproduction command missing");
  assert(Array.isArray(prior.diagnosticArtifacts) && prior.diagnosticArtifacts.length > 0, "prior failure diagnostic snapshots missing");
  assert(prior.diagnosticArtifacts.every(item => /^[a-f0-9]{64}$/.test(String(item.sha256 || "")) && Number(item.bytes) >= 0 && Array.isArray(item.tail)), "prior failure diagnostic snapshot incomplete");
  const preservedPaths = summary.outputPreparation?.preservedFirstFailurePaths || [];
  assert(preservedPaths.length === 2, "preserved first failure path set mismatch");
  for (const filePath of preservedPaths) {
    const resolved = path.resolve(filePath);
    const relative = path.relative(outputDir, resolved);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `preserved first failure path escapes output: ${resolved}`);
    assert(fs.existsSync(resolved), `preserved first failure file missing: ${resolved}`);
  }
});

check("canonical artifacts contain no duplicate screenshots or video placeholders", () => {
  const scan = scanArtifactTree(outputDir);
  assert(scan.duplicateScreenshotFiles === 0, `duplicate screenshot files remain: ${JSON.stringify(scan.duplicateScreenshotGroups)}`);
  assert(scan.placeholderVideoFiles.length === 0, `placeholder video files remain: ${scan.placeholderVideoFiles.join(", ")}`);
});

check("top-level cleanup is measured", () => {
  assert(summary.cleanup?.status === "PASS", "top-level cleanup is not PASS");
  assert(summary.cleanup?.verificationSource === "child-summary-and-filesystem", "top-level cleanup source is not measured");
  assert(summary.cleanup?.childCleanupVerified === true, "child cleanup was not verified");
  assert(summary.cleanup?.temporaryArtifactsRemoved === true, "temporary artifacts remain");
  assert(summary.cleanup?.placeholderVideoFilesAbsent === true, "placeholder video cleanup failed");
  assert(summary.cleanup?.duplicateScreenshotFilesAbsent === true, "duplicate screenshot cleanup failed");
  assert(Array.isArray(summary.cleanup?.checks) && summary.cleanup.checks.length >= 4, "top-level cleanup checks missing");
  assert(summary.cleanup.checks.every(item => item.status === "PASS"), "top-level cleanup contains failed check");
});

check("actual child evidence uses measured cleanup", () => {
  if (summary.executionMode !== "actual") return;
  const longrun = readChild(summary.longrun30?.summaryPath, "30-minute");
  assert(longrun.cleanup?.verificationSource === "predev-summary-filesystem-and-port-observation", "30-minute cleanup source mismatch");
  assert(longrun.cleanup?.checks?.every(item => item.status === "PASS"), "30-minute cleanup check failed");
  const ui = readChild(summary.uiAutomation?.summaryPath, "UI automation");
  assert(ui.cleanup?.verificationSource === "filesystem-and-port-observation", "UI cleanup source mismatch");
  assert(ui.cleanup?.checks?.every(item => item.status === "PASS"), "UI cleanup check failed");
  assert(ui.artifactIntegrity?.placeholderVideoFiles === 0, "UI placeholder video remains");
  assert((ui.cases || []).every(item => item.videoPath === "" && item.videoEvidence?.status === "not-captured" && item.videoEvidence?.placeholderCreated === false), "UI video boundary mismatch");
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 final evidence integrity summary ==");
console.log(`- summary: ${summaryPath}`);
console.log(`- executionMode: ${summary.executionMode}`);
console.log(`- finalEvidenceEligible: ${summary.executionMode === "actual" && summary.result === "PASS"}`);
console.log(`- sourceCommitSha: ${summary.sourceProvenance?.commitSha || ""}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function parseArgs(args) {
  let summaryValue = "";
  let allowFixture = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--summary") { summaryValue = args[index + 1] || ""; index += 1; }
    else if (args[index] === "--allow-fixture") allowFixture = true;
  }
  assert(summaryValue, "--summary is required");
  return { summary: summaryValue, allowFixture };
}

function readChild(filePath, label) {
  assert(filePath, `${label} summary path missing`);
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(path.dirname(summaryPath), filePath);
  assert(fs.existsSync(resolved), `${label} summary does not exist: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
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
