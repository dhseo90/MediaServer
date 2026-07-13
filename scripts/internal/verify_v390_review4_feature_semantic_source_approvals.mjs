#!/usr/bin/env node
// 파일 용도: 저장된 REVIEW4 source audit를 독립 재검증한 뒤에만 986행 approval ledger를 생성한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseFeatureRows } from "./feature_implementation_manifest_lib.mjs";
import {
  REVIEW4_AUDIT_SCHEMA,
  buildReview4SemanticObligation,
  buildReview4TrustBindings,
  parseVerifiedReview4Dispatch,
  review4CandidateDigest,
  review4SourceFlowDigest,
  normalizeReview4DecisionsToApprovals,
  stableStringify,
  validateReview4ApprovalEnvelope,
  validateReview4SemanticProof,
  validateReview4SharedFlows,
  validateReview4TrustBindings,
} from "./feature_semantic_review4_trust_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
const auditPath = path.join(rootDir, "test/fixtures/v390_review4_feature_semantic_source_audit.json");
const inventoryPath = path.join(rootDir, "docs/project-feature-test-inventory.md");
const approvalPath = path.join(rootDir, "test/fixtures/v390_review4_feature_semantic_source_approvals.json");

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4 independent source approval

Usage:
  ./server.sh verify-v390-review4-feature-semantic-source-approvals
  ./server.sh verify-v390-review4-feature-semantic-source-approvals --write-ledger --decisions PATH

The producer consumes only the stored source audit and inventory. It does not import or call the
candidate generator. --write-ledger validates an independently authored decision artifact and is
rejected until all 986 rows are explicitly approved and current trust bindings pass.`);
}
assertKnownOptions(rawArgs, ["h", "help", "write-ledger", "decisions"]);

const writeLedger = rawArgs.includes("--write-ledger");
const decisionPathValue = optionValue("decisions");
if (writeLedger && !decisionPathValue) throw new Error("--write-ledger requires --decisions PATH from an independent reviewer");
if (!writeLedger && decisionPathValue) throw new Error("--decisions is valid only with --write-ledger");
const decisionPath = decisionPathValue ? path.resolve(rootDir, decisionPathValue) : "";
if (writeLedger && !fs.existsSync(decisionPath)) throw new Error(`independent reviewer decision artifact missing: ${decisionPathValue}`);

const audit = readJson(auditPath);
const rows = parseFeatureRows(fs.readFileSync(inventoryPath, "utf8"));
if (!writeLedger && !fs.existsSync(approvalPath)) {
  throw new Error("committed REVIEW4 approval fixture is missing; an independent reviewer decision artifact is required before ledger creation");
}
revalidateStoredAudit(audit, rows);
let verified;
if (writeLedger) {
  const decisions = readJson(decisionPath);
  const generated = normalizeReview4DecisionsToApprovals({ audit, decisions, orderedIds: rows.map(row => row.id), rows });
  assertEnvelopeValid(audit, generated, rows);
  fs.writeFileSync(approvalPath, `${JSON.stringify(generated, null, 2)}\n`);
  const readback = readJson(approvalPath);
  assertEnvelopeValid(audit, readback, rows);
  if (stableStringify(readback) !== stableStringify(generated) || readback.approvalsDigest !== generated.approvalsDigest) {
    throw new Error("written REVIEW4 approval ledger readback drift");
  }
  verified = readback;
} else {
  verified = readJson(approvalPath);
  assertEnvelopeValid(audit, verified, rows);
}

console.log("== V390 REVIEW4 independent source approvals ==");
console.log(`- audit rows revalidated: ${rows.length}`);
console.log(`- candidate digest: ${audit.candidateDigest}`);
console.log(`- approvals verified: ${verified.approvals.length}`);
console.log(`- approval ledger write: ${writeLedger ? "written-and-readback-verified" : "committed-fixture-verified"}`);
console.log("- failures: 0");

function revalidateStoredAudit(value, inventoryRows) {
  if (value.schema !== REVIEW4_AUDIT_SCHEMA || value.sourceRelease !== "v3.9.0") throw new Error("stored REVIEW4 audit identity drift");
  if (inventoryRows.length !== 986 || value.items?.length !== 986) throw new Error("REVIEW4 approval requires exactly 986 rows");
  if (stableStringify(value.items.map(item => item.id)) !== stableStringify(inventoryRows.map(row => row.id))) throw new Error("stored audit/inventory ID order drift");
  if (value.candidateDigest !== review4CandidateDigest(value.items)) throw new Error("stored audit candidate digest drift");
  const dispatch = parseVerifiedReview4Dispatch(rootDir);
  for (let index = 0; index < inventoryRows.length; index += 1) {
    const row = inventoryRows[index];
    const item = value.items[index];
    if (item.status !== "source-resolved-candidate") throw new Error(`${item.id} is not source-resolved`);
    const obligation = buildReview4SemanticObligation(row, { rootDir });
    if (stableStringify(item.semanticObligation) !== stableStringify(obligation) || item.featureContractSha256 !== obligation.featureContractSha256) throw new Error(`${item.id} feature/pass obligation drift`);
    if (item.sourceFlowDigest !== review4SourceFlowDigest(item)) throw new Error(`${item.id} source-flow digest drift`);
    buildReview4TrustBindings(rootDir, item, dispatch);
    const trustErrors = validateReview4TrustBindings(rootDir, item, dispatch);
    const semanticErrors = validateReview4SemanticProof({ item, dispatchIndex: dispatch, rootDir });
    if (trustErrors.length || semanticErrors.length) throw new Error(`${item.id} independent approval revalidation failed: ${[...trustErrors, ...semanticErrors].join(";")}`);
  }
  const sharedErrors = validateReview4SharedFlows(value.items);
  if (sharedErrors.length) throw new Error(`shared flow validation failed: ${stableStringify(sharedErrors)}`);
}

function assertEnvelopeValid(value, approvals, inventoryRows) {
  const errors = validateReview4ApprovalEnvelope({ audit: value, approvals, orderedIds: inventoryRows.map(row => row.id), rows: inventoryRows });
  if (errors.length) throw new Error(errors.join("; "));
}

function optionValue(name) {
  const index = rawArgs.findIndex(value => value === `--${name}` || value.startsWith(`--${name}=`));
  if (index < 0) return "";
  return rawArgs[index].includes("=") ? rawArgs[index].slice(rawArgs[index].indexOf("=") + 1) : String(rawArgs[index + 1] || "");
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
