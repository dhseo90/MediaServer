#!/usr/bin/env node
// 파일 용도: REVIEW4-51의 v3.9 actual refactor 승인, 순서, base/branch, 불변 계약을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390-REVIEW4-51 structure scope decision

Usage:
  ./server.sh verify-v390-review4-structure-scope-decision

Checks:
  - latest user approval selects REVIEW4-64 in v3.9.0 and forbids v4.0 transfer
  - base commit/current branch/no-new-branch boundary
  - REVIEW4-50..63 -> 64 -> 65 fixed order
  - actual graph risk, nine preserved contracts, six slices
  - decision PASS remains distinct from refactor/acceptance execution PASS
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const decision = readJson("test/fixtures/v390_structure_execution_scope_decision.json");
const readiness = readJson("test/fixtures/v390_structure_stabilization_readiness.json");
const graph = readJson("test/fixtures/v390_actual_module_dependency_graph.json");
const expectedContracts = [
  "event-post-payload", "webrtc-datachannel-metadata", "sse-ws-metadata",
  "rtsp-webrtc-media-path", "auth-role-scope", "source-registry-published-view",
  "rule-profile-payload", "http-route-status-error", "product-ui-dom-test-id",
];
const expectedSlices = [
  "baseline-and-ownership-map", "pure-json-builder-extraction",
  "route-handler-group-extraction", "product-ui-workspace-split",
  "source-read-model-boundary", "docs-template-and-vlm-index",
];
const checks = [];

check("latest user decision selects v3.9 execution and disables v4 transfer", () => {
  assert(decision.schema === "media-server.v390-structure-execution-scope-decision.v2", "decision schema mismatch");
  assert(decision.decisionId === "V390-REVIEW4-51" && decision.supersedesDecisionId === "V390-REVIEW3-49",
    "decision lineage mismatch");
  assert(decision.decision === "execute-actual-refactor-in-v3.9.0-after-review4-50-63",
    "v3.9 execution decision mismatch");
  assert(decision.approval?.approved === true && decision.approval?.source === "latest-user-instruction",
    "explicit user approval missing");
  assert(decision.approval?.v400TransferAllowed === false, "v4.0 transfer remains allowed");
  assert(decision.status === "approved-scheduled" && decision.implementationStatus === "not-executed",
    "decision must not claim implementation");
});

check("base commit and current v3.9 branch boundary are exact", () => {
  const base = decision.executionBase;
  assert(base?.commit === "027678bab9ef75f809c1aeac2061d785c5f6f8b2", "decision base commit mismatch");
  assert(base?.branch === "v3.9.0" && base?.newBranchRequired === false &&
    base?.branchCreationPerformed === false, "decision branch boundary mismatch");
  assert(exec("git", ["cat-file", "-t", base.commit]) === "commit", "decision base commit does not exist");
  assert(exec("git", ["branch", "--show-current"]) === "v3.9.0", "current branch is not v3.9.0");
});

check("actual high-risk graph is bound without pretending threshold compliance", () => {
  assert(decision.actualGraph?.path === "test/fixtures/v390_actual_module_dependency_graph.json",
    "actual graph path mismatch");
  assert(decision.actualGraph?.sha256 === sha256File(decision.actualGraph.path), "actual graph hash drift");
  assert(graph.expectedProductionFiles === decision.actualGraph.productionFiles &&
    graph.moduleClassifiers?.length === decision.actualGraph.moduleOwners &&
    graph.cmake?.targets?.length === decision.actualGraph.cmakeTargets,
  "actual graph count binding mismatch");
  assert(decision.riskRecord?.acceptedDespiteReleaseLineThresholds === true &&
    decision.riskRecord?.actualFactors?.length === 4 &&
    decision.riskRecord.actualFactors.every(item => item.result === "approved-with-hard-gates"),
  "high-risk acceptance record mismatch");
});

check("50..63, six slices, preserved contracts, and final acceptance order are fixed", () => {
  assert(JSON.stringify(decision.approval.requiredOrder) === JSON.stringify([
    "V390-REVIEW4-50..63", "V390-REVIEW4-64", "V390-REVIEW4-65",
  ]), "REVIEW4 execution order mismatch");
  assert(JSON.stringify(decision.v390Execution?.orderedSlices) === JSON.stringify(expectedSlices),
    "ordered slice mismatch");
  assert(JSON.stringify(decision.preservedContractIds) === JSON.stringify(expectedContracts),
    "preserved contract mismatch");
  assert(decision.v390Execution?.forbidden?.length >= 9, "forbidden behavior boundary incomplete");
  assert(decision.finalAcceptance?.approved === true && decision.finalAcceptance?.runAfterRefactor === true &&
    decision.finalAcceptance?.id === "V390-REVIEW4-65", "final acceptance order/approval mismatch");
});

check("readiness and decision sources expose the same approved but not-executed state", () => {
  assert(readiness.executionRelease === "v3.9.0" && readiness.executionBranch === "v3.9.0",
    "readiness execution release/branch mismatch");
  assert(readiness.status === "approved-scheduled-after-review4-50-63" &&
    readiness.implementationStatus === "not-executed" && readiness.currentStepRefactorExecuted === false,
  "readiness execution status overclaim");
  assert(readiness.executionScopeDecision?.schema === decision.schema &&
    readiness.executionScopeDecision?.decision === decision.decision &&
    readiness.executionScopeDecision?.v390Mode === decision.v390Execution.mode,
  "readiness decision binding mismatch");
  assert(JSON.stringify(readiness.preservedContracts.map(item => item.id)) === JSON.stringify(expectedContracts),
    "readiness preserved contracts mismatch");
  assert(JSON.stringify(readiness.slices.map(item => item.id)) === JSON.stringify(expectedSlices),
    "readiness slices mismatch");
});

check("negative decision mutations are rejected", () => {
  for (const [label, mutate, expected] of [
    ["approval removed", copy => { copy.approval.approved = false; }, "approval"],
    ["v4 transfer enabled", copy => { copy.approval.v400TransferAllowed = true; }, "v400"],
    ["branch drift", copy => { copy.executionBase.branch = "v4.0.0"; }, "branch"],
    ["early refactor", copy => { copy.approval.requiredOrder = ["V390-REVIEW4-64", "V390-REVIEW4-50..63", "V390-REVIEW4-65"]; }, "order"],
    ["contract removed", copy => { copy.preservedContractIds.pop(); }, "contracts"],
  ]) {
    const copy = structuredClone(decision);
    mutate(copy);
    assert(validateDecision(copy).includes(expected), `${label} negative was accepted`);
  }
});

check("roadmap and evidence record approval without implementation PASS", () => {
  for (const [file, snippets] of [
    ["docs/development-backlog.md", ["V390-REVIEW4-51", "완료 decision / 64 미실행", "64 완료 후 실행 승인됨"]],
    ["docs/project-feature-test-inventory.md", ["V390-REVIEW4-51", "SAFE-219", "OPS-186"]],
    ["docs/release-test-records.md", ["V390 REVIEW4 Structure Scope Decision", "Decision contract이며 actual refactor/acceptance PASS가 아닙니다"]],
    ["docs/release-evidence-index.md", ["V390-REVIEW4-51", "V390-REVIEW4-64 actual refactor와 V390-REVIEW4-65 acceptance는 아직 미실행"]],
    ["docs/stream-verification.md", ["V390-REVIEW4-51", "approved-actual-refactor-after-review4-50-63"]],
    ["docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md", ["execute-actual-refactor-in-v3.9.0-after-review4-50-63", "approved-by-latest-user-instruction"]],
  ]) {
    const text = readText(file);
    for (const snippet of snippets) assert(text.includes(snippet), `${file} missing ${snippet}`);
  }
});

console.log("== V390-REVIEW4-51 structure scope decision ==");
for (const item of checks) console.log(`- ${item.status}: ${item.name}`);
console.log(`- summary: pass=${checks.filter(item => item.status === "PASS").length} fail=${checks.filter(item => item.status === "FAIL").length}`);
if (checks.some(item => item.status === "FAIL")) process.exit(1);

function validateDecision(value) {
  const errors = [];
  if (value.approval?.approved !== true) errors.push("approval");
  if (value.approval?.v400TransferAllowed !== false) errors.push("v400");
  if (value.executionBase?.branch !== "v3.9.0" || value.executionBase?.newBranchRequired !== false) errors.push("branch");
  if (JSON.stringify(value.approval?.requiredOrder) !== JSON.stringify([
    "V390-REVIEW4-50..63", "V390-REVIEW4-64", "V390-REVIEW4-65",
  ])) errors.push("order");
  if (JSON.stringify(value.preservedContractIds) !== JSON.stringify(expectedContracts)) errors.push("contracts");
  return errors;
}
function check(name, fn) { try { fn(); checks.push({ name, status: "PASS" }); } catch (error) { checks.push({ name, status: "FAIL" }); console.error(`[FAIL] ${name}: ${error.message}`); } }
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(file) { return fs.readFileSync(path.join(rootDir, file), "utf8"); }
function readJson(file) { return JSON.parse(readText(file)); }
function sha256File(file) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex"); }
function exec(command, args) { return execFileSync(command, args, { cwd: rootDir, encoding: "utf8" }).trim(); }
