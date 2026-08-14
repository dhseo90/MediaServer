#!/usr/bin/env node
// 파일 용도: owner 결정, field 조건부 미실행, historical structure 승인 상태가 현재 구현/PASS/완료로 오인되지 않도록 검증한다.

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
  - owner output is an accountable-owner-decision-record with truthful mixed capability status
  - external field targets are conditional-not-run and never field/release PASS
  - historical REVIEW4-51 structure output remains approved-scheduled/not-executed
  - current REVIEW4-64 completion is owned by verify-v390-structure-stabilization-readiness
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

check("historical REVIEW4-51 structure decision remains approved-scheduled/not-executed", () => {
  const errors = validateStructure(structure);
  assert(errors.length === 0, errors.join("; "));
});

check("status vocabulary negatives reject owner implementation, field PASS, and historical refactor overclaims", () => {
  const ownerNegative = structuredClone(owner);
  ownerNegative.implementationStatus = "complete";
  assert(validateOwner(ownerNegative).some(error => error.includes("implementationStatus")),
    "owner implementation-complete negative must fail");
  const roleOnlyNegative = structuredClone(owner);
  delete roleOnlyNegative.decisions[0].accountableSubjectRef;
  assert(validateOwner(roleOnlyNegative).some(error => error.includes("accountable subject")),
    "owner role-only negative must fail");
  const reidNegative = structuredClone(owner);
  reidNegative.decisions.find(item => item.id === "model-backed-reid-session").implementationStatus = "not-executed";
  assert(validateOwner(reidNegative).some(error => error.includes("Re-ID")),
    "Re-ID blanket not-executed negative must fail");
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
    "accountable-owner-decision-record",
    "conditional-not-run",
    "gate-ready",
    "decision-only-not-implementation-or-execution-evidence",
    "decision-record-complete-capabilities-mixed",
    "post-v3.9-unassigned",
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
  assert(backlog.includes("| 28 | v3.9.0 (28) structure stabilization implementation readiness | P1 | historical readiness / REVIEW4-51 superseded |"),
    "Development 17 roadmap status must preserve the superseded readiness boundary");
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
console.log("- ownerStatus: accountable-owner-decision-record / mixed capability truth");
console.log("- fieldStatus: conditional-not-run / fieldPassClaimed false");
console.log("- historicalStructureStatus: REVIEW4-51 approved-scheduled-after-review4-50-63 / implementation not-executed");
console.log("- currentStructureStatusOwner: verify-v390-structure-stabilization-readiness (REVIEW4-64)");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function validateOwner(value) {
  const errors = [];
  if (value.recordKind !== "accountable-owner-decision-record") {
    errors.push("owner recordKind must be accountable-owner-decision-record");
  }
  if (value.implementationStatus !== "decision-record-complete-capabilities-mixed") {
    errors.push("owner implementationStatus must preserve mixed capability truth");
  }
  if (value.evidenceStatus !== "decision-only-not-implementation-or-execution-evidence") {
    errors.push("owner evidenceStatus mismatch");
  }
  if (value.approvalAuthority?.accountableSubject?.handle !== "@dhseo90") {
    errors.push("owner accountable subject mismatch");
  }
  if (!value.decisions?.every(item => item.accountableSubjectRef === "repo-owner-v1")) {
    errors.push("owner decisions are missing accountable subject binding");
  }
  if (!value.decisions?.every(item => item.executionStatus === "not-executed" &&
      item.fieldPassClaimed === false && item.releasePassClaimed === false &&
      item.uiFulltestPassClaimed === false && item.longrunPassClaimed === false)) {
    errors.push("owner decisions contain implementation/field/release overclaim");
  }
  const reid = value.decisions?.find(item => item.id === "model-backed-reid-session");
  if (reid?.implementationStatus !== "experimental-capability-implemented-release-evidence-not-executed" ||
      reid?.capabilityStatus?.sourceCapabilityStatus !== "implemented-opt-in-experimental") {
    errors.push("owner Re-ID status must not claim the implemented experimental capability is entirely not-executed");
  }
  if (!value.decisions?.every(item => item.followup?.assignment === "post-v3.9-unassigned" &&
      item.followup?.scheduled === false && item.followup?.targetVersion === null)) {
    errors.push("owner follow-up version must remain unassigned and unscheduled");
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
