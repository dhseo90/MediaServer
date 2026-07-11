#!/usr/bin/env node
// 파일 용도: v3.9.0 (17) Development 16 보류 기능별 owner 역할, 결정, 근거, 재개 조건을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 deferred product owner sign-off verification

Usage:
  ./server.sh verify-v390-deferred-product-owner-signoff

Checks:
  - 다섯 deferred 항목의 owner role, 구현/제외 결정, 근거, 재개 조건을 고정
  - 사용자 /goal 승인 출처와 v3.9.0 범위를 고정
  - 미구현/미실행 항목을 release 또는 field PASS로 승격하지 않음
  - roadmap, inventory, release evidence, command dispatch 연결
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-deferred-product-owner-signoff";
const targetScript = "verify_v390_deferred_product_owner_signoff.mjs";
const fixturePath = path.join(rootDir, "test/fixtures/v390_deferred_product_owner_signoff.json");
const expected = new Map([
  ["action-execution", ["Product Owner", "excluded-from-v3.9"]],
  ["persistent-credential-store", ["Security Owner", "excluded-from-v3.9"]],
  ["real-external-field-smoke", ["Release Owner", "deferred-until-approved-field-run"]],
  ["external-vlm-provider-call", ["Privacy and Security Owner", "excluded-from-v3.9"]],
  ["model-backed-reid-session", ["Product and ML Owner", "excluded-from-v3.9"]],
]);
const checks = [];

check("owner decision fixture is complete and role-owned", () => {
  assert(fs.existsSync(fixturePath), "missing deferred owner sign-off fixture");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert(fixture.schema === "media-server.v390-deferred-product-owner-signoff.v1", "unexpected fixture schema");
  assert(fixture.release === "v3.9.0", "fixture release must be v3.9.0");
  assert(fixture.developmentItem === 16, "development item must be 16");
  assert(fixture.approvalSource === "/goal v3.9.0 (17) Development 16", "approval source must identify the user goal");
  assert(fixture.approvalDate === "2026-07-11", "approval date must be 2026-07-11");
  assert(fixture.approvedByAuthority === "user-approved-owner-role-assignment", "approval authority must remain explicit");
  assert(fixture.recordKind === "decision-record", "owner output must be a decision-record");
  assert(fixture.implementationStatus === "not-executed", "owner implementation status must remain not-executed");
  assert(fixture.evidenceStatus === "decision-only-not-implementation-evidence", "owner evidence status mismatch");
  assert(Array.isArray(fixture.decisions) && fixture.decisions.length === expected.size, "exactly five decisions are required");

  const actualIds = new Set();
  for (const decision of fixture.decisions) {
    assert(expected.has(decision.id), `unexpected deferred item: ${decision.id}`);
    assert(!actualIds.has(decision.id), `duplicate deferred item: ${decision.id}`);
    actualIds.add(decision.id);
    const [ownerRole, expectedDecision] = expected.get(decision.id);
    assert(decision.ownerRole === ownerRole, `${decision.id}: owner role mismatch`);
    assert(decision.decision === expectedDecision, `${decision.id}: decision mismatch`);
    assert(decision.implementationExecuted === false, `${decision.id}: implementation must remain not executed`);
    assert(decision.fieldPassClaimed === false, `${decision.id}: field PASS must remain false`);
    assert(decision.releasePassClaimed === false, `${decision.id}: release PASS must remain false`);
    assert(typeof decision.rationale === "string" && decision.rationale.length >= 40, `${decision.id}: rationale is incomplete`);
    assert(Array.isArray(decision.evidence) && decision.evidence.length >= 2, `${decision.id}: at least two evidence references are required`);
    assert(Array.isArray(decision.reopenConditions) && decision.reopenConditions.length >= 3, `${decision.id}: at least three reopen conditions are required`);
  }
  assert(actualIds.size === expected.size, "deferred decision set is incomplete");
});

check("feature inventory records the durable owner sign-off", () => {
  const inventory = read("docs/v390-feature-completion-inventory.md");
  for (const snippet of [
    "## Deferred Product Owner Sign-off (Development 16)",
    "user-approved-owner-role-assignment",
    "/goal v3.9.0 (17) Development 16",
    "owner role은 개인 이름을 추정하지 않고",
    ...expected.keys(),
    ...[...expected.values()].flat(),
    "implementationExecuted=false",
    "fieldPassClaimed=false",
    "releasePassClaimed=false",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing sign-off snippet: ${snippet}`);
  }
});

check("roadmap and evidence map Development 16 without false completion claims", () => {
  const backlog = read("docs/development-backlog.md");
  const stream = read("docs/stream-verification.md");
  const projectInventory = read("docs/project-feature-test-inventory.md");
  const records = read("docs/release-test-records.md");
  const evidence = read("docs/release-evidence-index.md");
  for (const [label, text, snippets] of [
    ["backlog", backlog, ["deferred product decision owner sign-off", "decision record", "보류 기능 소유자 승인", "decision record/커밋 `7a100f8f`"]],
    ["stream verification", stream, [command, "Development 16", "decision-record", "not-executed"]],
    ["project inventory", projectInventory, ["SAFE-214", "OPS-181", command]],
    ["release records", records, ["V390 Deferred Product Owner Sign-off", "Development 16 owner sign-off final", command]],
    ["release evidence", evidence, ["Development 16 deferred product owner sign-off", "SAFE-214", "OPS-181"]],
  ]) {
    for (const snippet of snippets) {
      assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
    }
  }
  assert(records.includes("Development 16 UI/30분/120분/field 실행"), "records must keep non-execution separate");
});

check("server dispatch and script inventory expose the verifier", () => {
  const server = read("server.sh");
  const inventory = read("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [command, targetScript]) {
    assert(server.includes(snippet), `server.sh missing ${snippet}`);
  }
  assert(inventory.includes("user-facing JS option parsers reject unknown options"), "script inventory option gate missing");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) {
  console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
}
console.log("\n== v3.9.0 deferred product owner sign-off ==");
console.log("- decisions: 5");
console.log("- recordKind: decision-record");
console.log("- implementationStatus: not-executed");
console.log("- implementationExecuted: false");
console.log("- fieldPassClaimed: false");
console.log("- releasePassClaimed: false");
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
