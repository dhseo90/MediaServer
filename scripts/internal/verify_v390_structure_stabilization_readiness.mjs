#!/usr/bin/env node
// 파일 용도: v3.9.0 (17) Development 17 구조 안정화 실행 branch, 경계, 의존성, contract, slice gate를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 structure stabilization readiness verification

Usage:
  ./server.sh verify-v390-structure-stabilization-readiness

Checks:
  - v4.0.0 execution branch/base/approval entry conditions
  - module ownership and one-way dependency rules
  - preserved route/schema/media/auth/registry/UI contracts
  - fixed slice order, entry/exit gates, stop conditions
  - current v3.9.0 step does not execute the refactor
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-structure-stabilization-readiness";
const targetScript = "verify_v390_structure_stabilization_readiness.mjs";
const fixturePath = "test/fixtures/v390_structure_stabilization_readiness.json";
const planPath = "docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md";
const expectedContracts = [
  "event-post-payload",
  "webrtc-datachannel-metadata",
  "sse-ws-metadata",
  "rtsp-webrtc-media-path",
  "auth-role-scope",
  "source-registry-published-view",
  "rule-profile-payload",
  "http-route-status-error",
  "product-ui-dom-test-id",
];
const expectedSlices = [
  "baseline-and-ownership-map",
  "pure-json-builder-extraction",
  "route-handler-group-extraction",
  "product-ui-workspace-split",
  "source-read-model-boundary",
  "docs-template-and-vlm-index",
];
const checks = [];

check("machine-readable readiness contract is complete", () => {
  const fixture = JSON.parse(read(fixturePath));
  const server = read("server.sh");
  assert(fixture.schema === "media-server.v390-structure-stabilization-readiness.v1", "unexpected readiness schema");
  assert(fixture.sourceRelease === "v3.9.0", "source release must be v3.9.0");
  assert(fixture.executionRelease === "v4.0.0", "execution release must be v4.0.0");
  assert(fixture.executionBranch === "v4.0.0", "execution branch must be v4.0.0");
  assert(fixture.currentStepRefactorExecuted === false, "current v3.9 step must not execute refactor");
  assert(fixture.branchCreationPerformed === false, "readiness step must not create a branch");
  assert(fixture.requiredApproval === "explicit-structure-refactor-start", "explicit start approval is required");
  assert(Array.isArray(fixture.baseRequirements) && fixture.baseRequirements.length >= 4, "base requirements are incomplete");
  assert(Array.isArray(fixture.moduleBoundaries) && fixture.moduleBoundaries.length >= 6, "module boundaries are incomplete");
  assert(Array.isArray(fixture.allowedDependencyDirections) && fixture.allowedDependencyDirections.length >= 5, "allowed dependency directions are incomplete");
  assert(Array.isArray(fixture.forbiddenDependencies) && fixture.forbiddenDependencies.length >= 5, "forbidden dependency rules are incomplete");
  const contracts = fixture.preservedContracts?.map(item => item.id) || [];
  assert(JSON.stringify(contracts) === JSON.stringify(expectedContracts), "preserved contract order/set mismatch");
  for (const contract of fixture.preservedContracts) {
    assert(Array.isArray(contract.verifiers) && contract.verifiers.length >= 1, `${contract.id}: verifier is required`);
    assert(contract.changeAllowed === false, `${contract.id}: behavior change must remain forbidden`);
    for (const verifier of contract.verifiers) {
      assert(verifier === "build" || server.includes(`  ${verifier})`), `${contract.id}: unknown server command ${verifier}`);
    }
  }
  const slices = fixture.slices?.map(item => item.id) || [];
  assert(JSON.stringify(slices) === JSON.stringify(expectedSlices), "slice order/set mismatch");
  for (const [index, slice] of fixture.slices.entries()) {
    assert(slice.order === index + 1, `${slice.id}: order mismatch`);
    assert(Array.isArray(slice.entryGates) && slice.entryGates.length >= 3, `${slice.id}: entry gates incomplete`);
    assert(Array.isArray(slice.exitGates) && slice.exitGates.length >= 3, `${slice.id}: exit gates incomplete`);
  }
  assert(Array.isArray(fixture.stopConditions) && fixture.stopConditions.length >= 6, "stop conditions are incomplete");
});

check("handoff plan fixes branch, module, dependency, contract, and slice readiness", () => {
  const plan = read(planPath);
  for (const snippet of [
    "## Development 17 Structure Stabilization Readiness",
    "Execution branch: `v4.0.0`",
    "Current v3.9 refactor execution: `not-run`",
    "Branch creation: `not-performed`",
    "## Module Boundary and Dependency Direction",
    "analysis/core/media -> ingress/product UI 의존 금지",
    "## Contract Preservation Matrix",
    ...expectedContracts.map(id => `\`${id}\``),
    "## Fixed Refactoring Slice Order",
    ...expectedSlices.map(id => `\`${id}\``),
    "## Entry, Exit, and Stop Gates",
    "first failure stops every later slice",
  ]) {
    assert(plan.includes(snippet), `handoff plan missing readiness snippet: ${snippet}`);
  }
});

check("roadmap and evidence expose Development 17 readiness without refactor overclaim", () => {
  const backlog = read("docs/development-backlog.md");
  const inventory = read("docs/project-feature-test-inventory.md");
  const records = read("docs/release-test-records.md");
  const evidence = read("docs/release-evidence-index.md");
  const stream = read("docs/stream-verification.md");
  for (const [label, text, snippets] of [
    ["backlog", backlog, ["structure stabilization implementation readiness", "완료/Development 17 readiness", "구조 안정화 착수 조건", "완료/커밋 `fcfe9f0d`"]],
    ["inventory", inventory, ["SAFE-215", "OPS-182", command]],
    ["records", records, ["V390 Structure Stabilization Readiness", "Development 17 structure readiness final", "Development 17 실제 refactor/UI/longrun"]],
    ["evidence", evidence, ["Development 17 structure stabilization readiness", "SAFE-215", "OPS-182"]],
    ["stream", stream, ["Development 17", command, "v4.0.0"]],
  ]) {
    for (const snippet of snippets) assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
});

check("server dispatch exposes the readiness verifier", () => {
  const server = read("server.sh");
  assert(server.includes(command), `server.sh missing ${command}`);
  assert(server.includes(targetScript), `server.sh missing ${targetScript}`);
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 structure stabilization readiness ==");
console.log("- executionBranch: v4.0.0");
console.log("- currentStepRefactorExecuted: false");
console.log("- preservedContracts: 9");
console.log("- orderedSlices: 6");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
