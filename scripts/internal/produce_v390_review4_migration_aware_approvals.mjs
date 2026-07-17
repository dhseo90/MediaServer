#!/usr/bin/env node
// 파일 용도: REVIEW4 row-local trust migration에서만 이전 독립 승인을 안전하게 이관한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parseFeatureRows, loadImplementationManifest } from "./feature_implementation_manifest_lib.mjs";
import { applyApprovedReview4SemanticClosure } from "./feature_semantic_review4_apply.mjs";
import { REVIEW4_APPROVAL_PRODUCER, REVIEW4_APPROVAL_REVIEWER_SOURCE, REVIEW4_APPROVAL_SCHEMA, REVIEW4_AUDIT_SCHEMA, REVIEW4_GENERATION_BOUNDARY, review4ApprovalReason, review4CandidateDigest, review4GenerationBoundaryDigest, review4HardCandidateItems, review4InventoryDigest, sha256, stableStringify, validateReview4ApprovalEnvelope } from "./feature_semantic_review4_trust_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const auditRelative = "test/fixtures/v390_review4_feature_semantic_source_audit.json";
const approvalRelative = "test/fixtures/v390_review4_feature_semantic_source_approvals.json";
const manifestRelative = "test/fixtures/project_feature_implementation_evidence.json";
const defaultMigrationRelative = "test/fixtures/v390_review4_semantic_migration_evidence_v1.json";

if (hasHelpFlag(args)) printUsageAndExit(`V390 REVIEW4 migration-aware approval producer

Usage:
  ./server.sh produce-v390-review4-migration-aware-approvals --write-ledger --prior-audit PATH --migration-evidence PATH --decisions PATH --review-package PATH

The producer generates a fresh candidate in a temporary path, verifies the old applied audit and
approval plus migration evidence, then atomically replaces audit, approval, and applied manifest
only after complete readback validation. It cannot create approval without exact strict-equivalent
prior approval coverage and independent decisions for every changed row.`);
assertKnownOptions(args, ["h", "help", "write-ledger", "prior-audit", "migration-evidence", "decisions", "review-package"]);
if (!args.includes("--write-ledger")) throw new Error("migration-aware producer requires --write-ledger");
const priorAuditPath = optionValue("prior-audit");
const migrationRelative = optionValue("migration-evidence") || defaultMigrationRelative;
const decisionsPath = optionValue("decisions");
const packagePath = optionValue("review-package");
if (!priorAuditPath || !decisionsPath || !packagePath) throw new Error("--write-ledger requires --prior-audit, --decisions, and --review-package");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "v390-review4-migration-producer-"));
try {
  const freshPath = path.join(tempDir, "fresh-audit.json");
  execFileSync(process.execPath, [path.join(rootDir, "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs"), "--emit-candidate", freshPath], { cwd: rootDir, stdio: "pipe" });
  const freshAudit = readJson(freshPath);
  if (freshAudit.schema !== REVIEW4_AUDIT_SCHEMA || freshAudit.candidateDigest !== review4CandidateDigest(freshAudit.items) || freshAudit.items.length !== 986) {
    throw new Error("fresh REVIEW4 candidate is not the immutable reviewed 986-row candidate");
  }
  const inventoryText = fs.readFileSync(path.join(rootDir, "docs/project-feature-test-inventory.md"), "utf8");
  const rows = parseFeatureRows(inventoryText);
  const priorManifest = loadImplementationManifest(rootDir);
  const priorAuditAbsolute = path.resolve(rootDir, priorAuditPath);
  const priorAudit = readJson(priorAuditAbsolute);
  // Index는 checkpoint가 보존한 마지막 independent approval ledger다. worktree의
  // 대상 approval은 이 producer가 성공한 뒤에만 바뀌어야 하므로 읽지 않는다.
  const priorApprovals = JSON.parse(execFileSync("git", ["show", `:${approvalRelative}`], { cwd: rootDir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
  const migration = readJson(path.join(rootDir, migrationRelative));
  const decisionsAbsolute = path.resolve(rootDir, decisionsPath);
  const packageAbsolute = path.resolve(rootDir, packagePath);
  const decisions = readJson(decisionsAbsolute);
  const reviewPackage = readJson(packageAbsolute);
  const approval = buildMigrationApproval({ freshAudit, rows, priorAudit, priorAuditAbsolute, priorApprovals, migration, decisions, reviewPackage, decisionsAbsolute, packageAbsolute });
  const manifest = applyApprovedReview4SemanticClosure({ rootDir, inventoryText, rows, manifest: priorManifest, audit: freshAudit, approvals: approval });
  assertEnvelope(freshAudit, approval, rows);
  const replacements = [
    [path.join(rootDir, auditRelative), freshAudit],
    [path.join(rootDir, approvalRelative), approval],
    [path.join(rootDir, manifestRelative), manifest],
  ];
  const staged = replacements.map(([target, value]) => writeTemp(target, value));
  // 원본에 손대기 전에 모든 임시 JSON을 다시 파싱한다. 이후 교체는 backup/restore
  // transaction으로 수행하므로 중간 rename 실패도 기존 세 fixture를 보존한다.
  for (let index = 0; index < staged.length; index += 1) {
    if (stableStringify(readJson(staged[index][1])) !== stableStringify(replacements[index][1])) {
      throw new Error(`temporary ${path.basename(staged[index][0])} readback drift`);
    }
  }
  atomicReplaceAll(staged);
  const readbackAudit = readJson(path.join(rootDir, auditRelative));
  const readbackApproval = readJson(path.join(rootDir, approvalRelative));
  if (stableStringify(readbackAudit) !== stableStringify(freshAudit) || stableStringify(readbackApproval) !== stableStringify(approval)) throw new Error("atomic approval readback drift");
  assertEnvelope(readbackAudit, readbackApproval, rows);
  console.log("== V390 REVIEW4 migration-aware approval producer ==");
  console.log(`- candidate digest: ${freshAudit.candidateDigest}`);
  console.log(`- carry-forward: ${migration.carryForward.length}`);
  console.log(`- independent-review: ${migration.unapproved.map(item => item.id).join(",")}`);
  console.log("- atomic replacements: audit,approval,manifest");
  console.log("- failures: 0");
} finally { fs.rmSync(tempDir, { recursive: true, force: true }); }

function buildMigrationApproval({ freshAudit, rows, priorAudit, priorAuditAbsolute, priorApprovals, migration, decisions, reviewPackage, decisionsAbsolute, packageAbsolute }) {
  const orderedIds = rows.map(row => row.id);
  const requiredIndependentIds = migration.unapproved?.map(item => item.id) || [];
  if (priorApprovals.schema !== REVIEW4_APPROVAL_SCHEMA || priorApprovals.approvals?.length !== 986 || new Set(priorApprovals.approvals.map(x => x.id)).size !== 986) throw new Error("prior approval ledger coverage invalid");
  if (priorAudit.schema !== REVIEW4_AUDIT_SCHEMA || priorAudit.candidateDigest !== priorApprovals.candidateDigest || migration.baselineCandidateDigest !== review4CandidateDigest(priorAudit.items) || migration.freshCandidateDigest !== review4CandidateDigest(freshAudit.items) || priorAudit.items?.length !== 986 || stableStringify(priorAudit.items.map(x => x.id)) !== stableStringify(orderedIds) || priorAudit.items.some((item, index) => item.sourceFlowDigest !== priorApprovals.approvals[index]?.sourceFlowDigest)) throw new Error("prior audit/approval direct binding invalid");
  if (migration.schema !== "media-server.v390-review4-semantic-migration-evidence.v2" || migration.candidateGeneratorMayApprove !== false ||
      migration.carryForward?.length + requiredIndependentIds.length !== 986 ||
      new Set([...migration.carryForward.map(item => item.id), ...requiredIndependentIds]).size !== 986) {
    throw new Error("migration evidence coverage invalid");
  }
  const packageSha256 = sha256(fs.readFileSync(packageAbsolute));
  const decisionSha256 = sha256(fs.readFileSync(decisionsAbsolute));
  if (reviewPackage.schema !== "media-server.v390-review4-semantic-independent-review-package.v1" ||
      reviewPackage.candidate?.candidateDigest !== freshAudit.candidateDigest ||
      reviewPackage.candidate?.rows !== 986 || reviewPackage.candidate?.unresolved !== 0 ||
      stableStringify(reviewPackage.reviewScope?.changedIds) !== stableStringify(requiredIndependentIds) ||
      decisions.reviewPackage?.sha256 !== packageSha256) throw new Error("review package binding invalid");
  if (decisions.schema !== "media-server.v390-review4-semantic-independent-scoped-decisions.v1" ||
      decisions.reviewerIsCandidateGenerator !== false || decisions.verdict !== "approved" ||
      decisions.candidate?.candidateDigest !== freshAudit.candidateDigest ||
      stableStringify(decisions.reviewScope?.ids) !== stableStringify(requiredIndependentIds)) {
    throw new Error("independent decision artifact binding invalid");
  }
  const evidenceById = new Map(migration.carryForward.map(x => [x.id, x]));
  const priorAuditById = new Map(priorAudit.items.map(x => [x.id, x]));
  const priorApprovalById = new Map(priorApprovals.approvals.map(x => [x.id, x]));
  const freshById = new Map(freshAudit.items.map(x => [x.id, x]));
  const priorHardById = new Map(review4HardCandidateItems(priorAudit.items).map(item => [item.id, item]));
  const freshHardById = new Map(review4HardCandidateItems(freshAudit.items).map(item => [item.id, item]));
  const rowsById = new Map(rows.map(x => [x.id, x]));
  const independentById = new Map(decisions.decisions?.map(x => [x.id, x]));
  if (independentById.size !== requiredIndependentIds.length ||
      stableStringify([...independentById.keys()]) !== stableStringify(requiredIndependentIds)) {
    throw new Error("independent artifact missing, rejected, or extra ID");
  }
  const approvals = orderedIds.map(id => {
    const item = freshById.get(id); const row = rowsById.get(id); const prior = priorApprovalById.get(id); const evidence = evidenceById.get(id); const independent = independentById.get(id);
    if (evidence) {
      const priorHard = priorHardById.get(id);
      const freshHard = freshHardById.get(id);
      if (!prior || evidence.oldSourceFlowDigest !== prior.sourceFlowDigest || evidence.oldSourceFlowDigest !== priorAuditById.get(id)?.sourceFlowDigest ||
          evidence.newSourceFlowDigest !== item.sourceFlowDigest || stableStringify(priorHard) !== stableStringify(freshHard) ||
          evidence.equivalenceDigest !== sha256(stableStringify(priorHard))) {
        throw new Error(`${id} non-equivalent carry-forward attempt`);
      }
      return { ...approvalFields(item, row), reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE, reviewerActor: "review4-migration-aware-ledger", reviewedOn: decisions.reviewedAt, approvalBasis: "equivalent-flow-carry-forward", priorSourceFlowDigest: evidence.oldSourceFlowDigest, newSourceFlowDigest: evidence.newSourceFlowDigest, strictEquivalenceDigest: evidence.equivalenceDigest, priorApprovalDigest: sha256(stableStringify(prior)), reason: `${review4ApprovalReason(row, item)}|approvalBasis=equivalent-flow-carry-forward`, reasonSha256: "" };
    }
    if (!requiredIndependentIds.includes(id) || !independent || independent.decision !== "approved" ||
        independent.featureContractSha256 !== item.featureContractSha256 || independent.sourceFlowDigest !== item.sourceFlowDigest ||
        independent.verifierCommand !== item.verifier.command || independent.verifierFile !== item.verifier.file ||
        independent.dispatchArmSha256 !== item.trustBindings.dispatch.armSha256 ||
        independent.evidenceToken !== item.evidenceToken || independent.actionSymbol !== item.roles.action.symbol ||
        independent.stateSymbol !== item.roles.state.symbol || independent.justificationSha256 !== sha256(independent.justification)) {
      throw new Error(`${id} independent review binding invalid`);
    }
    return { ...approvalFields(item, row), reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE, reviewerActor: "review4-migration-aware-ledger", independentReviewerActor: decisions.reviewer, reviewedOn: decisions.reviewedAt, approvalBasis: "independent-review", independentArtifactSha256: decisionSha256, reviewPackageSha256: packageSha256, reviewedSnapshotDigest: reviewPackage.bindings.trackedWorktreeDiffSha256, reason: `${review4ApprovalReason(row, item)}|approvalBasis=independent-review|independentReviewerActor=${decisions.reviewer}|independentArtifactSha256=${decisionSha256}|reviewPackageSha256=${packageSha256}|reviewedSnapshotDigest=${reviewPackage.bindings.trackedWorktreeDiffSha256}`, reasonSha256: "" };
  });
  for (const item of approvals) item.reasonSha256 = sha256(item.reason);
  if (new Set(approvals.map(x => x.id)).size !== 986 || stableStringify(approvals.map(x => x.id)) !== stableStringify(orderedIds)) throw new Error("approval coverage/order drift");
  const approval = { schema: REVIEW4_APPROVAL_SCHEMA, producer: REVIEW4_APPROVAL_PRODUCER, reviewerActor: "review4-migration-aware-ledger", reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE, candidateGeneratorMayApprove: false, candidateDigest: freshAudit.candidateDigest, reviewedOn: decisions.reviewedAt, orderedIdsSha256: sha256(stableStringify(orderedIds)), inventoryDigest: review4InventoryDigest(rows), generationBoundarySha256: review4GenerationBoundaryDigest(), decisionArtifactSha256: decisionSha256, priorAuditSha256: sha256(fs.readFileSync(priorAuditAbsolute)), priorApprovalLedgerSha256: sha256(stableStringify(priorApprovals)), migrationEvidenceSha256: sha256(fs.readFileSync(path.join(rootDir, migrationRelative))), reviewPackageSha256: packageSha256, reviewedSnapshotDigest: reviewPackage.bindings.trackedWorktreeDiffSha256, approvalsDigest: sha256(stableStringify(approvals)), approvals };
  return approval;
}

function approvalFields(item, row) { return { id: item.id, decision: "approved-source-flow", featureContractSha256: item.featureContractSha256, sourceFlowDigest: item.sourceFlowDigest, verifierCommand: item.verifier.command, evidenceToken: item.evidenceToken, actionSymbol: item.roles.action.symbol, stateSymbol: item.roles.state.symbol }; }
function assertEnvelope(audit, approvals, rows) { const errors = validateReview4ApprovalEnvelope({ audit, approvals, orderedIds: rows.map(x => x.id), rows }); if (errors.length) throw new Error(errors.join("; ")); }
function writeTemp(target, value) { const temporary = `${target}.migration-${process.pid}-${crypto.randomUUID()}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); return [target, temporary]; }
function atomicReplaceAll(staged) {
  const backups = staged.map(([target]) => [target, `${target}.migration-${process.pid}-${crypto.randomUUID()}.bak`]);
  try {
    for (let index = 0; index < staged.length; index += 1) {
      fs.renameSync(staged[index][0], backups[index][1]);
      fs.renameSync(staged[index][1], staged[index][0]);
    }
    for (const [, backup] of backups) fs.rmSync(backup, { force: true });
  } catch (error) {
    for (let index = backups.length - 1; index >= 0; index -= 1) {
      const [target, backup] = backups[index];
      if (fs.existsSync(backup)) fs.renameSync(backup, target);
    }
    for (const [, temporary] of staged) fs.rmSync(temporary, { force: true });
    throw error;
  }
}
function optionValue(name) { const i = args.findIndex(x => x === `--${name}` || x.startsWith(`--${name}=`)); return i < 0 ? "" : args[i].includes("=") ? args[i].slice(args[i].indexOf("=") + 1) : String(args[i + 1] || ""); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
