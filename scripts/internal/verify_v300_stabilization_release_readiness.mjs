#!/usr/bin/env node
// 파일 용도: 현행 준비 검사 연결과 미실행 경계를 확인한다. 종료된 실행 원장을 요구하지 않는다.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { validateFeatureDocumentation, validateVerificationDocumentation, validateUiPolicyDocumentation } from "./documentation_contract_lib.mjs";
import { readReleaseContext, validateReleaseContext } from "./release_documentation_contract.mjs";
import { validatePolicy } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { parseServerDispatches } from "./script_dispatch_parser.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) printUsageAndExit(`v3.0.0 호환 릴리즈 준비 문서 검사
Usage: ./server.sh verify-v300-stabilization-release-readiness
현행 정의·정책·명령 연결만 검사합니다. 제품·UI·장시간·published·외부 실행 결과가 아닙니다.
종료된 버전의 완료/RED/미실행 문구는 입력으로 요구하지 않습니다.`);
assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v300-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const featureIds = ["SAFE-092","OPS-060"];
const checks = [];

check("현행 기능 정의와 독립 명령 연결", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const implementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const errors = validateFeatureDocumentation({
    document: readText("docs/release-policy.md"),
    identifiers: ["media-server.release-context.v1", "source-only", "signed-annotated"],
    command: commandName, script: "verify_v300_stabilization_release_readiness.mjs",
    featureIds: ["OPS-060"], inventory, implementation,
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
  for (const id of featureIds) {
    const definitions = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementation.items.filter(item => item.id === id);
    assert(definitions.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === commandName,
      id + " 현행 정의/명령 연결 누락·중복·불일치");
  }
});

check("현행 릴리즈 정책과 실제 실행 판정의 경계", () => {
  const policy = readText("docs/release-policy.md");
  const policyErrors = validateReleaseContext(readReleaseContext(policy), readText("VERSION").trim());
  const agents = readText("AGENTS.md");
  const verification = readText("docs/stream-verification.md");
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const uiPolicy = JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  policyErrors.push(...validatePolicy(uiPolicy));
  policyErrors.push(...validateUiPolicyDocumentation({ agents, fulltest, policy: uiPolicy }));
  policyErrors.push(...validateVerificationDocumentation({ agents, verification }));
  if (!verification.includes("verify-release-metadata --published")) policyErrors.push("published 검사 안내 누락");
  const releaseReadinessPolicyObserved = policyErrors.length === 0;
  assert(releaseReadinessPolicyObserved,
    "SAFE-092·OPS-060: " + policyErrors.join("; "));
});

check("companion 안내와 실제 명령 dispatch", () => {
  const companionCommands = [
    command,
    "./server.sh build",
    "./server.sh verify-v300-entry-baseline",
    "./server.sh verify-v300-event-evidence-contract",
    "./server.sh verify-v300-feature-schema-privacy",
    "./server.sh verify-v300-vlm-feature-queue",
    "./server.sh verify-v300-feature-only-retention",
    "./server.sh verify-v300-search-dsl-query-convert",
    "./server.sh verify-v300-feature-search-index",
    "./server.sh verify-v300-ops-events-ui",
    "./server.sh verify-v300-retention-pin-cleanup",
    "./server.sh verify-analysis-state",
    "./server.sh verify-release-metadata",
    "./server.sh verify-docs-links",
    "./server.sh verify-docs-ui-assets",
    "./server.sh verify-project-inventory",
    "./server.sh verify-feature-inventory-coverage",
    "./server.sh verify-release-evidence-index",
    "./server.sh verify-release-closeout-helper --dry-run",
    "./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run",
    "./server.sh verify-script-inventory",
    "git diff --check",
  ];
  const verification = readText("docs/stream-verification.md");
  const dispatches = parseServerDispatches(readText("server.sh"));
  const companionErrors = companionCommands.filter(item => !verification.includes(item) || (item !== "git diff --check" && dispatches.filter(entry => entry.command === item.split(" ")[1]).length !== 1));
  const localCommandsWired = companionErrors.length === 0;
  assert(localCommandsWired, "companion 안내 또는 dispatch 누락/중복: " + companionErrors.join("; "));
});

check("전수 기능 검증과 필수 ID 연결", () => {
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const inventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  assert(coverage.includes("validateImplementationManifest") && coverage.includes("verifierEvidenceRows === rows.length"),
    "전수 기능 manifest 검사 연결 누락");
  for (const id of featureIds) assert(inventory.includes('"' + id + '"'), id + " 필수 기능 검사 연결 누락");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 stabilization/release readiness summary ==");
console.log("- schema: media-server.v300-stabilization-release-readiness.v1");
console.log("- scope: current definitions, policy and companion wiring; no execution evidence");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);


function runChecks() {
  let pass = 0, fail = 0;
  for (const item of checks) {
    try { item.fn(); pass += 1; console.log("[pass] " + item.name); }
    catch (error) { fail += 1; console.log("[fail] " + item.name + ": " + error.message); }
  }
  return { pass, fail };
}
function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
