#!/usr/bin/env node
// 파일 용도: owner 결정, field 조건부 미실행, structure 승인 대기 상태가 구현/PASS/완료로 오인되지 않도록 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 truthfulness status vocabulary verification

Usage:
  ./server.sh verify-v390-truthfulness-status-vocabulary

Checks:
  - owner role output is a decision-record with implementation not-executed
  - external field targets are conditional-not-run and never field/release PASS
  - structure output is approved-scheduled while refactor implementation remains not-executed
  - roadmap/evidence wording and negative status fixtures reject completion overclaims
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const owner = readJson("test/fixtures/v390_deferred_product_owner_signoff.json");
const field = readJson("test/fixtures/v390_external_field_smoke_no_device_closure.json");
const structure = readJson("test/fixtures/v390_structure_stabilization_readiness.json");
const checks = [];

check("owner decision record is distinct from implementation completion", () => {
  const errors = validateOwner(owner);
  assert(errors.length === 0, errors.join("; "));
});

check("external field state is conditional-not-run and not PASS", () => {
  const errors = validateField(field);
  assert(errors.length === 0, errors.join("; "));
});

check("structure decision is approved-scheduled while refactor remains not-executed", () => {
  const errors = validateStructure(structure);
  assert(errors.length === 0, errors.join("; "));
});

check("status vocabulary negatives reject implementation, field PASS, and refactor completion overclaims", () => {
  const ownerNegative = structuredClone(owner);
  ownerNegative.implementationStatus = "complete";
  assert(validateOwner(ownerNegative).some(error => error.includes("implementationStatus")),
    "owner implementation-complete negative must fail");
  const fieldNegative = structuredClone(field);
  fieldNegative.targets[1].status = "PASS";
  assert(validateField(fieldNegative).some(error => error.includes("onvif-real-device")),
    "field PASS negative must fail");
  const structureNegative = structuredClone(structure);
  structureNegative.implementationStatus = "refactor-complete";
  assert(validateStructure(structureNegative).some(error => error.includes("implementationStatus")),
    "structure refactor-complete negative must fail");
});

check("roadmap, inventory, records, and evidence use the same truthful status vocabulary", () => {
  const sources = [
    read("docs/development-backlog.md"),
    read("docs/project-feature-test-inventory.md"),
    read("docs/v390-feature-completion-inventory.md"),
    read("docs/stream-verification.md"),
    read("docs/release-test-records.md"),
    read("docs/release-evidence-index.md"),
  ].join("\n");
  for (const snippet of [
    "decision-record",
    "conditional-not-run",
    "gate-ready",
    "decision-only-not-implementation-evidence",
    "condition-record-not-field-pass",
    "gate-contract-not-refactor-evidence",
    "approved-scheduled-after-review4-50-63",
    "approved-decision-contract-not-refactor-evidence",
    "verify-v390-truthfulness-status-vocabulary",
  ]) {
    assert(sources.includes(snippet), `truthfulness evidence missing: ${snippet}`);
  }
  const backlog = read("docs/development-backlog.md");
  assert(backlog.includes("| 27 | v3.9.0 (27) deferred product decision owner sign-off | P1 | decision record |"),
    "Development 16 roadmap status must be decision record");
  assert(backlog.includes("| 28 | v3.9.0 (28) structure stabilization implementation readiness | P1 | gate 준비 |"),
    "Development 17 roadmap status must be gate 준비");
  assert(backlog.includes("| 29 | v3.9.0 (29) real external field smoke gate | P2 | 조건부 미실행 |"),
    "Development 18 roadmap status must be 조건부 미실행");
});

check("server dispatch exposes the truthfulness verifier", () => {
  const server = read("server.sh");
  assert(server.includes("verify-v390-truthfulness-status-vocabulary"), "server command missing");
  assert(server.includes("verify_v390_truthfulness_status_vocabulary.mjs"), "server script dispatch missing");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 truthfulness status vocabulary ==");
console.log("- ownerStatus: decision-record / implementation not-executed");
console.log("- fieldStatus: conditional-not-run / fieldPassClaimed false");
console.log("- structureStatus: approved-scheduled-after-review4-50-63 / implementation not-executed");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function validateOwner(value) {
  const errors = [];
  if (value.recordKind !== "decision-record") errors.push("owner recordKind must be decision-record");
  if (value.implementationStatus !== "not-executed") errors.push("owner implementationStatus must be not-executed");
  if (value.evidenceStatus !== "decision-only-not-implementation-evidence") errors.push("owner evidenceStatus mismatch");
  if (!value.decisions?.every(item => item.implementationExecuted === false && item.fieldPassClaimed === false && item.releasePassClaimed === false)) {
    errors.push("owner decisions contain implementation/field/release overclaim");
  }
  return errors;
}

function validateField(value) {
  const errors = [];
  if (value.recordKind !== "conditional-execution-record") errors.push("field recordKind mismatch");
  if (value.executionStatus !== "conditional-not-run") errors.push("field executionStatus must be conditional-not-run");
  if (value.evidenceStatus !== "condition-record-not-field-pass") errors.push("field evidenceStatus mismatch");
  for (const target of value.targets || []) {
    if (target.status !== "conditional-not-run") errors.push(`${target.id}: status must be conditional-not-run`);
    if (target.fieldPassClaimed !== false || target.releasePassClaimed !== false) errors.push(`${target.id}: PASS claim must remain false`);
  }
  return errors;
}

function validateStructure(value) {
  const errors = [];
  if (value.recordKind !== "refactor-readiness-gate") errors.push("structure recordKind mismatch");
  if (value.status !== "approved-scheduled-after-review4-50-63") {
    errors.push("structure status must be approved-scheduled-after-review4-50-63");
  }
  if (value.implementationStatus !== "not-executed") errors.push("structure implementationStatus must be not-executed");
  if (value.evidenceStatus !== "approved-decision-contract-not-refactor-evidence") {
    errors.push("structure evidenceStatus mismatch");
  }
  if (value.currentStepRefactorExecuted !== false || value.branchCreationPerformed !== false || value.refactorEntryReady !== false) {
    errors.push("structure execution/branch/entry overclaim");
  }
  return errors;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
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
