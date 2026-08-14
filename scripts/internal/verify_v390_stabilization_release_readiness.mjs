#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 20 안정화/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 Step 20 stabilization and release readiness verification

Usage:
  ./server.sh verify-v390-stabilization-release-readiness

Checks:
  - v3.9.0 Step 20 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - AGENTS test-category judgment separates stabilization, 30m, 120m, and UI fulltest execution evidence
  - local stabilization companion gates are documented without claiming UI fulltest, longrun, published metadata, field smoke, or release actions
  - server.sh and inventory verifiers expose the Step 20 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v390-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const currentFinalCommand = "./test_release.sh";
const targetScript = "verify_v390_stabilization_release_readiness.mjs";
const schema = "media-server.v390-stabilization-release-readiness.v1";
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v390-entry-baseline",
  "./server.sh verify-v390-feature-completion-inventory",
  "./server.sh verify-v390-user-review-gate",
  "./server.sh verify-manual-ui-evidence",
  "./server.sh verify-v390-evidence-test-gate-prep",
  "./server.sh verify-v390-onvif-credential-provider-status",
  "./server.sh verify-v390-onvif-live-import-persist-decision",
  "./server.sh verify-v390-vlm-rule-suggestion-draft-bridge",
  "./server.sh verify-v390-vlm-incident-rule-provenance",
  "./server.sh verify-v390-vlm-evaluation-promotion-guard",
  "./server.sh verify-v390-backup-recovery-handoff-validation",
  "./server.sh verify-v390-action-execution-deferral-decision",
  "./server.sh verify-v390-deferred-product-owner-signoff",
  "./server.sh verify-v390-conditional-field-ai-decisions",
  "./server.sh verify-v390-structure-stabilization-handoff",
  "./server.sh verify-v390-structure-stabilization-readiness",
  "./server.sh verify-v390-external-field-smoke-no-device-closure",
  "./server.sh verify-v390-analysis-registry-durable-write",
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

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidenceIndex: readText("docs/release-evidence-index.md"),
  releasePolicy: readText("docs/release-policy.md"),
  coverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const normalizedRecords = normalizeWhitespace(files.releaseRecords);
const checks = [];

check("roadmap and stream verification expose v3.9 Step 20 stabilization readiness", () => {
  const step20Rows = files.backlog.split(/\r?\n/).filter(line =>
    line.startsWith("| 20 | v3.9.0 (20) stabilization and release readiness |"),
  );
  assert(step20Rows.length === 1, `backlog v3.9 Step 20 row cardinality mismatch: ${step20Rows.length}`);
  const step20Cells = step20Rows[0].split("|").slice(1, -1).map(value => value.trim());
  assert(step20Cells[2] === "P0", `backlog v3.9 Step 20 priority drift: ${step20Cells[2] || "missing"}`);
  assert(new Set([
    "보강 완료/current test pending",
    "UI PASS/full release pending",
    "full release PASS",
  ]).has(step20Cells[3]), `backlog v3.9 Step 20 status invalid: ${step20Cells[3] || "missing"}`);
  for (const snippet of ["release close-out", currentFinalCommand, "동일 source binding"]) {
    assertIncludes(step20Cells[4], snippet, "backlog v3.9 Step 20 current release lifecycle");
  }
  for (const snippet of [
    command,
    "## v3.9.0 Structure & Release 개발 기록",
    "Step 20 `stabilization and release readiness`",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 20");
  }
  for (const snippet of [
    `| v3.9.0 (20) | \`${command}\` |`,
    "v3.9.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 20");
  }
});

check("AGENTS test category judgment table separates execution approval and evidence", () => {
  for (const snippet of [
    "| 안정화 테스트 | 진행 대상 |",
    "| 30분 테스트 | 진행 대상 |",
    "| 120분 테스트 | 진행 대상 |",
    "| UI 풀테스트 | 진행 대상 |",
    "사용자 명시 실행 승인 없음 - 미실행 필수 blocker",
    "실행 목록 포함 승인/현재 미실행",
    "release action 승인 없음 - 미실행",
  ]) {
    assertIncludes(files.backlog, snippet, "Step 20 test category judgment");
  }
});

check("feature inventory maps v3.9 Step 20 to SAFE-212 and OPS-179", () => {
  for (const snippet of [
    "v3.9.0 (20) stabilization and release readiness | `SAFE-212`, `OPS-179` | `verify-v390-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`",
    "SAFE-212 | V390 actual acceptance no-overclaim boundary",
    "OPS-179 | V390 actual acceptance bundle 실행 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 20");
  }
  assertIncludes(
    files.coverageVerifier,
    'check("exact implementation evidence manifest is valid"',
    "feature coverage verifier data-driven implementation manifest gate",
  );
  assertIncludes(files.projectInventoryVerifier, '"SAFE-212"', "project inventory verifier SAFE-212");
  assertIncludes(files.projectInventoryVerifier, '"OPS-179"', "project inventory verifier OPS-179");
});

check("release policy, evidence index, and records list v3.9 companion local gates", () => {
  for (const item of companionCommands) {
    assertIncludes(files.backlog, item, `backlog command ${item}`);
    assertIncludes(files.releasePolicy, item, `release policy command ${item}`);
    assertIncludes(files.releaseEvidenceIndex, item, `release evidence index command ${item}`);
    assertIncludes(files.releaseRecords, item, `release records command ${item}`);
  }
  for (const [name, text] of [
    ["release policy", files.releasePolicy],
    ["release evidence index", files.releaseEvidenceIndex],
    ["release records", files.releaseRecords],
  ]) {
    assertIncludes(text, currentFinalCommand, `${name} current final acceptance command`);
    assertIncludes(text, "clean worktree", `${name} current final clean source boundary`);
  }
  for (const snippet of [
    "## v3.9.0 stabilization and release readiness",
    schema,
    "v3.9.0 Step 20 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy v3.9 Step 20");
  }
  for (const snippet of [
    "## v3.9.0 Step 20 local readiness gate records",
    schema,
    "v3.9.0 Step 20 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assertIncludes(files.releaseEvidenceIndex, snippet, "release evidence index v3.9 Step 20");
  }
});

check("release records include v3.9 Step 20 RED/final and not-run boundaries", () => {
  for (const snippet of [
    "V390 Stabilization and Release Readiness",
    "v390 Step 20 RED stabilization/release readiness gate",
    "v390 Step 20 stabilization/release readiness final",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 20 result: ${snippet}`);
  }
  for (const snippet of [
    "v390 Step 20 UI 풀테스트",
    "v390 Step 20 30분 longrun",
    "v390 Step 20 120분 longrun",
    "v390 Step 20 published metadata",
    "v390 Step 20 PR/main/tag/GitHub Release",
    "v390 Step 20 field smoke",
    "Step 20 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 20 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose v3.9 Step 20 readiness command", () => {
  for (const snippet of [commandName, targetScript]) {
    assertIncludes(files.serverSh, snippet, "server.sh v3.9 Step 20 dispatch");
  }
  for (const snippet of [
    "server.sh dispatch targets exist and are executable",
    "tracked scripts are classified and referenced",
    "documented server.sh commands resolve to dispatch table",
    targetScript,
  ]) {
    assertIncludes(files.scriptInventory, snippet, "script inventory Step 20 coverage");
  }
});

check("Step 20 gate keeps release actions and long UI/soak evidence separate", () => {
  for (const [name, text] of [
    ["backlog", files.backlog],
    ["stream verification", files.streamVerification],
    ["feature inventory", files.featureInventory],
    ["release records", files.releaseRecords],
    ["release policy", files.releasePolicy],
    ["release evidence index", files.releaseEvidenceIndex],
  ]) {
    for (const snippet of [
      "UI 풀테스트 직접 조작",
      "30분/120분",
      "published metadata",
      "PR/main/tag/GitHub Release",
    ]) {
      assertIncludes(text, snippet, `${name} Step 20 boundary`);
    }
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 stabilization/release readiness summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.9.0 (20)");
console.log("- scope: local stabilization gate wiring, release evidence records, AGENTS test category judgment, not-run boundaries");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log("- fieldSmoke: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, context) {
  assert(text.includes(snippet), `${context} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}
