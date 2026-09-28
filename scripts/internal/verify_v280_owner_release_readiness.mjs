#!/usr/bin/env node
// 파일 용도: 현행 기능 정의·정책·명령의 연결을 검사한다. 과거 릴리즈 실행 결과는 읽지 않는다.
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
if (hasHelpFlag(rawArgs)) printUsageAndExit(`v2.8.0 호환 릴리즈 준비 문서 검사
Usage: ./server.sh verify-v280-owner-release-readiness
현행 기능·UI 정의·정책·명령 연결만 확인합니다. 제품·UI·장시간·published·외부 작업은 실행하지 않습니다.
옛 명령/summary schema를 유지하되 종료 기록과 당시 완료 상태는 검사 입력이 아닙니다.`);
assertKnownOptions(rawArgs, ["h", "help"]);
const checks = [];
const readinessCommands = [
  "verify-v280-owner-release-readiness", "verify-release-metadata", "verify-docs-links", "verify-docs-ui-assets",
  "verify-feature-inventory-coverage", "verify-manual-ui-evidence", "verify-release-evidence-index",
  "verify-release-closeout-helper --dry-run", "git diff --check",
];
const featureCommands = [
  [
    "UI-055",
    "verify-v280-incident-action-readiness-queue"
  ],
  [
    "EVT-055",
    "verify-v280-incident-action-readiness-queue"
  ],
  [
    "LAB-079",
    "verify-v280-incident-action-readiness-queue"
  ],
  [
    "SAFE-065",
    "verify-auth-routes"
  ],
  [
    "UI-056",
    "verify-v280-approval-gated-rule-draft"
  ],
  [
    "RULE-104",
    "verify-v280-approval-gated-rule-draft"
  ],
  [
    "EVT-056",
    "verify-v280-approval-gated-rule-draft"
  ],
  [
    "LAB-080",
    "verify-v280-approval-gated-rule-draft"
  ],
  [
    "SAFE-066",
    "verify-auth-routes"
  ],
  [
    "UI-057",
    "verify-v280-evidence-intake-field-readiness"
  ],
  [
    "SRC-032",
    "verify-ops-source-registry-api"
  ],
  [
    "EVT-057",
    "verify-v280-evidence-intake-field-readiness"
  ],
  [
    "LAB-081",
    "verify-v280-evidence-intake-field-readiness"
  ],
  [
    "SAFE-067",
    "verify-auth-routes"
  ],
  [
    "UI-058",
    "verify-v280-runtime-evidence-window"
  ],
  [
    "EVT-058",
    "verify-v280-runtime-evidence-window"
  ],
  [
    "LAB-082",
    "verify-v280-runtime-evidence-window"
  ],
  [
    "SAFE-068",
    "verify-auth-routes"
  ],
  [
    "CLIENT-024",
    "verify-v280-client-safe-followup-digest"
  ],
  [
    "SAFE-069",
    "verify-auth-routes"
  ],
  [
    "OPS-040",
    "verify-v280-owner-release-readiness"
  ],
  [
    "SAFE-070",
    "verify-v280-owner-release-readiness"
  ]
];

check("현행 기능 정의와 독립 검사 연결", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const implementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const projectInventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  const errors = validateFeatureDocumentation({
    document: readText("docs/release-policy.md"),
    identifiers: ["media-server.release-context.v1", "source-only", "signed-annotated"],
    command: "verify-v280-owner-release-readiness", script: "verify_v280_owner_release_readiness.mjs",
    featureIds: ["OPS-040"], inventory, implementation,
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
  for (const [id, command] of featureCommands) {
    const definitions = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementation.items.filter(item => item.id === id);
    assert(definitions.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === command,
      id + " 현행 정의/독립 명령 연결 누락·중복·불일치");
  }
  assert(coverage.includes("verifierEvidenceRows === rows.length"), "feature coverage must validate every inventory row");
  for (const id of ["OPS-040", "SAFE-070"]) assert(projectInventory.includes('"' + id + '"'), id + " project inventory 연결 누락");
});

check("manual UI 현행 대상 정의 유지", () => {
  for (const file of ["docs/manual-ui-fulltest.md", "docs/manual-ui-checklist.md"]) {
    const text = readText(file);
    for (const identifier of ["UI-055","UI-056","UI-057","UI-058","CLIENT-024","OPS-040","SAFE-070","/ops/events","/ops/rules","/client/live","/client/dashboard","/client/events"]) {
      assert(text.includes(identifier), "manual UI 대상 정의 누락: " + identifier);
    }
  }
});

check("현행 릴리즈 정책과 실제 실행 판정의 경계", () => {
  const policy = readText("docs/release-policy.md");
  const publishedMetadataCommand = "verify-release-metadata --published";
  const policyErrors = validateReleaseContext(readReleaseContext(policy), readText("VERSION").trim());
  const agents = readText("AGENTS.md");
  const verification = readText("docs/stream-verification.md");
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const uiPolicy = JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  policyErrors.push(...validatePolicy(uiPolicy));
  policyErrors.push(...validateUiPolicyDocumentation({ agents, fulltest, policy: uiPolicy }));
  policyErrors.push(...validateVerificationDocumentation({ agents, verification }));
  if (!verification.includes(publishedMetadataCommand)) policyErrors.push(publishedMetadataCommand + " 안내 누락");
  const releaseReadinessPolicyObserved = policyErrors.length === 0;
  assert(releaseReadinessPolicyObserved,
    "verify-v280-owner-release-readiness: " + policyErrors.join("; "));
});

check("현재 companion 명령과 실제 dispatch 연결", () => {
  const verification = readText("docs/stream-verification.md");
  const dispatches = parseServerDispatches(readText("server.sh"));
  for (const command of readinessCommands) {
    assert(verification.includes(command), "검증 명령 안내 누락: " + command);
    if (command === "git diff --check") continue;
    const base = command.split(" ")[0];
    const targets = dispatches.filter(item => item.command === base);
    assert(targets.length === 1, "dispatch 누락/중복: " + base);
    if (base === "verify-v280-owner-release-readiness") assert(targets[0].script === "verify_v280_owner_release_readiness.mjs", "dispatch 대상 불일치");
  }
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log("[pass] " + item.name); }
  catch (error) { fail += 1; console.log("[fail] " + item.name + ": " + error.message); }
}
console.log("\n== v2.8.0 S07 owner/release readiness summary ==");
console.log("- schema: media-server.v280-owner-release-readiness.v1");
console.log("- pass: " + pass);
console.log("- fail: " + fail);
for (const scope of ["uiFulltest", "longrun30Or120", "publishedMetadata", "releaseActions"]) console.log("- " + scope + ": not-run-by-this-command");
if (fail > 0) process.exit(1);
function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
