#!/usr/bin/env node
// 파일 용도: REVIEW4 server verifier trust의 row-local migration과 carry-forward 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildReview4TrustBindings,
  parseVerifiedReview4Dispatch,
  review4HardCandidateItems,
  review4SourceFlowDigest,
  stableStringify,
} from "./feature_semantic_review4_trust_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`V390 REVIEW4 semantic migration contract

Usage:
  ./server.sh verify-v390-review4-semantic-migration-contract
  node scripts/internal/verify_v390_review4_semantic_migration_contract.mjs --baseline PATH --fresh PATH [--report PATH] [--write-evidence PATH]

The no-argument form runs only positive/negative binding self-tests. The delta form compares
all semantic fields deterministically; it reports carry-forward-eligible and independent-review
required IDs. --write-evidence writes only a versioned carry-forward evidence file; it never
writes an audit, approval ledger, decision artifact, or manifest.`);
}
assertKnownOptions(args, ["baseline", "fresh", "report", "write-evidence", "h", "help"]);

const baselinePath = optionValue("baseline");
const freshPath = optionValue("fresh");
const reportPath = optionValue("report");
const evidencePath = optionValue("write-evidence");
if (Boolean(baselinePath) !== Boolean(freshPath)) throw new Error("--baseline and --fresh must be supplied together");
if (reportPath && !baselinePath) throw new Error("--report requires --baseline and --fresh");
if (evidencePath && !baselinePath) throw new Error("--write-evidence requires --baseline and --fresh");

runBindingContract();
let delta = null;
if (baselinePath) {
  delta = buildDelta(readAudit(baselinePath), readAudit(freshPath));
  if (reportPath) {
    const absolute = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(delta, null, 2)}\n`);
  }
  if (evidencePath) writeMigrationEvidence(path.resolve(evidencePath), delta);
}

console.log("== V390 REVIEW4 semantic migration contract ==");
console.log("- positive/negative bindings: 9");
if (delta) {
  console.log(`- rows: ${delta.rows}`);
  console.log(`- carryForwardEligible: ${delta.carryForwardEligible.length}`);
  console.log(`- independentReviewRequired: ${delta.independentReviewRequired.length}`);
  console.log(`- requiredIds: ${delta.independentReviewRequired.join(",") || "none"}`);
  console.log(`- report: ${reportPath ? path.resolve(reportPath) : "not-written"}`);
  console.log(`- evidence: ${evidencePath ? path.resolve(evidencePath) : "not-written"}`);
}
console.log("- failures: 0");

function runBindingContract() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-review4-semantic-migration-"));
  try {
    fs.mkdirSync(path.join(temp, "scripts/internal"), { recursive: true });
    fs.mkdirSync(path.join(temp, "src"), { recursive: true });
    fs.writeFileSync(path.join(temp, "scripts/internal/alpha.mjs"), 'exec "${SCRIPT_DIR}/child.mjs" "$@"\n');
    fs.writeFileSync(path.join(temp, "scripts/internal/beta.mjs"), 'process.exit(0);\n');
    fs.writeFileSync(path.join(temp, "scripts/internal/child.mjs"), 'process.exit(0);\n');
    fs.writeFileSync(path.join(temp, "src/bound.cpp"), "void Bound() { ScopedToken(); }\n");
    const baselineServer = serverText();
    const baselineDispatch = parseVerifiedReview4Dispatch(temp, baselineServer);
    const baselineRecord = requireRecord(baselineDispatch, "verify-alpha");
    const item = contractItem();
    const baselineTrust = buildReview4TrustBindings(temp, item, baselineDispatch);
    const baselineDigest = review4SourceFlowDigest({ ...item, trustBindings: baselineTrust });

    // An unrelated command arm and any line-only movement leave the bound arm invariant.
    const withUnrelatedArm = `# line-only prefix\n${baselineServer.replace("  verify-alpha)", "  verify-unrelated)\n    require_internal beta.mjs\n    exec \"${INTERNAL_DIR}/beta.mjs\" \"$@\"\n    ;;\n  verify-alpha)")}`;
    const movedRecord = requireRecord(parseVerifiedReview4Dispatch(temp, withUnrelatedArm), "verify-alpha");
    expectEqual(baselineRecord, movedRecord, "unrelated dispatch arm or line movement changed bound record");
    const movedItem = lineOnlyMovedItem(item);
    expectEqual(baselineDigest, review4SourceFlowDigest({ ...movedItem, trustBindings: baselineTrust }), "line-only role movement changed source-flow digest");

    const changedArm = baselineServer.replace("    ;;", "    # bound arm change\n    ;;");
    expectNotEqual(baselineRecord.armSha256, requireRecord(parseVerifiedReview4Dispatch(temp, changedArm), "verify-alpha").armSha256, "bound arm change was ignored");
    const changedTarget = baselineServer.replaceAll("alpha.mjs", "beta.mjs");
    const targetRecord = requireRecord(parseVerifiedReview4Dispatch(temp, changedTarget), "verify-alpha");
    expectNotEqual(baselineRecord.requireTarget, targetRecord.requireTarget, "require target change was ignored");
    expectNotEqual(baselineRecord.execTarget, targetRecord.execTarget, "exec target change was ignored");
    const changedConnected = fs.readFileSync(path.join(temp, "scripts/internal/alpha.mjs"), "utf8").replace("child.mjs", "beta.mjs");
    fs.writeFileSync(path.join(temp, "scripts/internal/alpha.mjs"), changedConnected);
    const connectedRecord = requireRecord(parseVerifiedReview4Dispatch(temp, baselineServer), "verify-alpha");
    expectNotEqual(baselineRecord.connectedFiles, connectedRecord.connectedFiles, "connected target change was ignored");
    const changedVerifierTrust = buildReview4TrustBindings(temp, item, parseVerifiedReview4Dispatch(temp, baselineServer));
    expectNotEqual(baselineTrust.verifierFileSha256, changedVerifierTrust.verifierFileSha256, "verifier file change was ignored");

    const bodyChanged = structuredClone(baselineTrust);
    bodyChanged.roles.action.enclosingBodySha256 = "f".repeat(64);
    expectNotEqual(baselineDigest, review4SourceFlowDigest({ ...item, trustBindings: bodyChanged }), "owner/action/state/readback body change was ignored");
    const anchorChanged = structuredClone(item);
    anchorChanged.roles.action.anchor = "ChangedSemanticAnchor();";
    expectNotEqual(baselineDigest, review4SourceFlowDigest({ ...anchorChanged, trustBindings: baselineTrust }), "semantic anchor change was ignored");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function buildDelta(baseline, fresh) {
  const beforeRaw = baseline.items || [];
  const afterRaw = fresh.items || [];
  const before = review4HardCandidateItems(beforeRaw);
  const after = review4HardCandidateItems(afterRaw);
  if (before.length !== after.length) throw new Error(`candidate row count drift: ${before.length} != ${after.length}`);
  const carryForwardEligible = [];
  const independentReviewRequired = [];
  const rows = [];
  for (let index = 0; index < before.length; index += 1) {
    const prior = before[index];
    const next = after[index];
    if (prior.id !== next.id) throw new Error(`candidate ID order drift at ${index}: ${prior.id} != ${next.id}`);
    const fields = changedSemanticFields(prior, next);
    const record = {
      id: prior.id,
      oldSourceFlowDigest: beforeRaw[index].sourceFlowDigest,
      newSourceFlowDigest: afterRaw[index].sourceFlowDigest,
      semanticFieldsEqual: fields.length === 0,
      changedFields: fields,
      equivalenceDigest: fields.length === 0 ? sha256(stableStringify(prior)) : null,
    };
    rows.push(record);
    if (record.semanticFieldsEqual) carryForwardEligible.push(record.id);
    else independentReviewRequired.push(record.id);
  }
  return {
    schema: "media-server.v390-review4-semantic-carry-forward-delta.v1",
    rows: rows.length,
    baselineCandidateDigest: sha256(stableStringify(before)),
    freshCandidateDigest: sha256(stableStringify(after)),
    carryForwardEligible,
    independentReviewRequired,
    rowDelta: rows,
  };
}

function writeMigrationEvidence(absolute, delta) {
  const unapprovedIds = delta.independentReviewRequired;
  assert(unapprovedIds.length > 0 &&
    delta.carryForwardEligible.length + unapprovedIds.length === delta.rows,
  "migration evidence coverage must partition all candidate rows");
  const carryForward = delta.rowDelta.filter(row => row.semanticFieldsEqual).map(row => ({
    id: row.id,
    oldSourceFlowDigest: row.oldSourceFlowDigest,
    newSourceFlowDigest: row.newSourceFlowDigest,
    equivalenceDigest: row.equivalenceDigest,
    status: "carry-forward-eligible-not-approved",
  }));
  const unapproved = delta.rowDelta.filter(row => !row.semanticFieldsEqual).map(row => ({
    id: row.id,
    oldSourceFlowDigest: row.oldSourceFlowDigest,
    newSourceFlowDigest: row.newSourceFlowDigest,
    changedFields: row.changedFields,
    status: "unapproved-independent-review-required",
  }));
  const evidence = {
    schema: "media-server.v390-review4-semantic-migration-evidence.v2",
    migrationVersion: "review4-acceptance-prerequisite-v2",
    generatedBy: "verify_v390_review4_semantic_migration_contract.mjs",
    candidateGeneratorMayApprove: false,
    baselineCandidateDigest: delta.baselineCandidateDigest,
    freshCandidateDigest: delta.freshCandidateDigest,
    equivalenceAlgorithmSha256: sha256(stableStringify({
      fields: ["featureContractSha256", "flowKind", "requirement", "verifier", "evidenceMode", "evidenceToken", "sharedContract", "roles", "edges", "semanticObligation", "trustBindings"],
      ignored: ["server.sh whole-file hash", "server.sh file-fallback body hash", "role locator line", "edge endpoint line"],
    })),
    carryForward,
    unapproved,
    reviewerDecisionArtifact: {
      schema: "media-server.v390-review4-independent-reviewer-decisions.v1",
      requiredIds: unapprovedIds,
      generationCommand: "./server.sh verify-v390-review4-feature-semantic-source-approvals --write-ledger --decisions <independent-reviewer-decision-artifact.json>",
      generatorMayApprove: false,
    },
  };
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(evidence, null, 2)}\n`);
}

function changedSemanticFields(before, after) {
  const fields = ["featureContractSha256", "flowKind", "requirement", "verifier", "evidenceMode", "evidenceToken", "sharedContract", "roles", "edges", "semanticObligation", "trustBindings"];
  return fields.filter(field => stableStringify(before[field]) !== stableStringify(after[field]));
}

function contractItem() {
  const role = (symbol, anchor, body) => ({
    file: "src/bound.cpp", symbol, anchor, line: 1, contextSha256: body, featureBinding: `UI-999:${symbol}`,
  });
  return {
    id: "UI-999", featureContractSha256: "a".repeat(64), flowKind: "read-model",
    requirement: { operation: "read", expectation: "allow", surface: "ui" },
    verifier: { command: "verify-alpha", file: "scripts/internal/alpha.mjs" }, evidenceMode: "contract", evidenceToken: "ScopedToken", sharedContract: null,
    roles: {
      owner: role("Owner", "Owner();", "1".repeat(64)), dispatch: role("Dispatch", "Dispatch();", "2".repeat(64)),
      action: role("Action", "Action();", "3".repeat(64)), state: role("State", "State();", "4".repeat(64)),
      readback: { ...role("Readback", "expect(ScopedToken);", "5".repeat(64)), file: "scripts/internal/child.mjs" },
      verifier: { file: "server.sh", symbol: "server-dispatch:verify-alpha", anchor: "verify-alpha)", line: 4, contextSha256: "6".repeat(64), featureBinding: "UI-999:verifier" },
    },
    edges: [
      { from: "owner", to: "dispatch", kind: "function-containment", witness: "owner" },
      { from: "dispatch", to: "action", kind: "function-containment", witness: "dispatch" },
      { from: "action", to: "state", kind: "direct-callsite", witness: "action" },
      { from: "state", to: "readback", kind: "runtime-readback", witness: "readback" },
      { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-alpha" },
    ],
    semanticObligation: { schema: "contract", value: "ScopedToken" },
  };
}

function lineOnlyMovedItem(item) {
  const copy = structuredClone(item);
  for (const role of Object.values(copy.roles)) { role.line += 97; role.contextSha256 = sha256(`${role.contextSha256}:line-only`); }
  for (const edge of copy.edges) { edge.source = "src/bound.cpp:98"; edge.target = "src/bound.cpp:99"; edge.digest = "line-only"; }
  return copy;
}

function serverText() {
  return `case "${"$"}{command}" in\n  verify-alpha)\n    require_internal alpha.mjs\n    exec "${"$"}{INTERNAL_DIR}/alpha.mjs" "${"$"}@"\n    ;;\nesac\n`;
}

function requireRecord(index, command) {
  const record = index.commandToRecord.get(command);
  if (!record) throw new Error(`missing dispatch record: ${command}`);
  return record;
}

function readAudit(file) {
  const parsed = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  if (!Array.isArray(parsed.items)) throw new Error(`candidate items missing: ${file}`);
  return parsed;
}

function optionValue(name) {
  const index = args.findIndex(value => value === `--${name}` || value.startsWith(`--${name}=`));
  if (index < 0) return "";
  return args[index].includes("=") ? args[index].slice(args[index].indexOf("=") + 1) : (args[index + 1] || "");
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function expectEqual(actual, expected, message) { if (stableStringify(actual) !== stableStringify(expected)) throw new Error(message); }
function expectNotEqual(actual, expected, message) { if (stableStringify(actual) === stableStringify(expected)) throw new Error(message); }
