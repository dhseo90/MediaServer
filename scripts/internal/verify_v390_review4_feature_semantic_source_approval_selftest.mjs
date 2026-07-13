#!/usr/bin/env node
// 파일 용도: REVIEW4 독립 reviewer decision/approval validator의 non-gate negative self-test만 수행한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeatureRows } from "./feature_implementation_manifest_lib.mjs";
import {
  REVIEW4_APPROVAL_SOURCE,
  REVIEW4_APPROVAL_REVIEWER_SOURCE,
  REVIEW4_DECISION_SCHEMA,
  REVIEW4_GENERATION_BOUNDARY,
  review4CandidateDigest,
  review4ApprovalEnvelope,
  review4GenerationBoundaryDigest,
  review4InventoryDigest,
  sha256,
  stableStringify,
  normalizeReview4DecisionsToApprovals,
  validateReview4ApprovalEnvelope,
  validateReview4DecisionArtifact,
} from "./feature_semantic_review4_trust_lib.mjs";
import { assertReview4AppliedManifestValid, validateReview4AppliedManifest } from "./feature_semantic_evidence_lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stored = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/v390_review4_feature_semantic_source_audit.json"), "utf8"));
const rows = parseFeatureRows(fs.readFileSync(path.join(rootDir, "docs/project-feature-test-inventory.md"), "utf8"));
const item = stored.items.find(value => value.status === "source-resolved-candidate");
if (!item) throw new Error("approval self-test requires one resolved candidate");
const row = rows.find(value => value.id === item.id);
const audit = {
  schema: stored.schema,
  sourceRelease: stored.sourceRelease,
  generationBoundary: structuredClone(REVIEW4_GENERATION_BOUNDARY),
  items: [item],
};
audit.candidateDigest = review4CandidateDigest(audit.items);
const justification = [item.id, row.feature, row.pass, item.verifier.command, item.evidenceToken, item.roles.action.symbol, item.roles.state.symbol, item.sourceFlowDigest].join(" | ");
const decision = {
  id: item.id,
  decision: "approved",
  reviewedOn: "2026-07-13",
  featureContractSha256: item.featureContractSha256,
  sourceFlowDigest: item.sourceFlowDigest,
  verifierCommand: item.verifier.command,
  evidenceToken: item.evidenceToken,
  actionSymbol: item.roles.action.symbol,
  stateSymbol: item.roles.state.symbol,
  justification,
  justificationSha256: sha256(justification),
};
const artifact = {
  schema: REVIEW4_DECISION_SCHEMA,
  reviewerActor: "self-test-independent-reviewer",
  reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE,
  candidateDigest: audit.candidateDigest,
  orderedIdsSha256: sha256(stableStringify([item.id])),
  inventoryDigest: review4InventoryDigest([row]),
  generationBoundarySha256: review4GenerationBoundaryDigest(),
  reviewedOn: "2026-07-13",
  decisions: [decision],
};
const orderedIds = [item.id];
assertNoErrors(validateReview4DecisionArtifact({ audit, decisions: artifact, orderedIds, rows: [row] }), "valid reviewer artifact");
const approvals = normalizeReview4DecisionsToApprovals({ audit, decisions: artifact, orderedIds, rows: [row] });
assertNoErrors(validateReview4ApprovalEnvelope({ audit, approvals, orderedIds, rows: [row] }), "valid approval envelope");
const appliedManifest = {
  review4ApprovalEnvelope: review4ApprovalEnvelope(approvals, orderedIds, audit),
  items: [{
    id: item.id,
    review: { approvalSource: REVIEW4_APPROVAL_SOURCE },
    semanticEvidence: { review4Proof: {
      featureContractSha256: item.featureContractSha256,
      sourceFlowDigest: item.sourceFlowDigest,
      verifier: item.verifier,
      evidenceToken: item.evidenceToken,
      roles: item.roles,
      candidateDigest: audit.candidateDigest,
      generationBoundarySha256: approvals.generationBoundarySha256,
      approval: approvals.approvals[0],
    } },
  }],
};
assertNoErrors(validateReview4AppliedManifest({ rows: [row], manifest: appliedManifest }), "valid applied manifest");

expectDecisionError("producer-spoof", "producer spoof", copy => { copy.reviewerSource = "candidate-generator"; });
expectDecisionError("mixed-candidate", "mixed candidate digest", copy => { copy.candidateDigest = "0".repeat(64); });
expectDecisionError("generation-boundary-tamper", "generation boundary digest drift", copy => { copy.generationBoundarySha256 = "0".repeat(64); });
const tamperedAudit = structuredClone(audit);
tamperedAudit.generationBoundary.excludedInputs = ["review.reason"];
expectErrors("audit-generation-boundary-tamper", "canonical drift", validateReview4DecisionArtifact({ audit: tamperedAudit, decisions: artifact, orderedIds, rows: [row] }));
expectDecisionError("missing-feature-pass", "justification unbound", copy => {
  copy.decisions[0].justification = copy.decisions[0].id;
  copy.decisions[0].justificationSha256 = sha256(copy.decisions[0].justification);
});
expectDecisionError("mixed-date", "mixed date", copy => { copy.decisions[0].reviewedOn = "2026-07-12"; });
const rejected = structuredClone(artifact);
rejected.decisions[0].decision = "rejected";
expectThrow("rejected-decision", "approval ledger generation forbidden", () => normalizeReview4DecisionsToApprovals({ audit, decisions: rejected, orderedIds, rows: [row] }));
const spoofedApproval = structuredClone(approvals);
spoofedApproval.producer = "candidate-generator";
expectErrors("approval-producer-spoof", "producer mismatch", validateReview4ApprovalEnvelope({ audit, approvals: spoofedApproval, orderedIds, rows: [row] }));
const actorMismatch = structuredClone(approvals);
actorMismatch.approvals[0].reviewerActor = "different-reviewer";
actorMismatch.approvalsDigest = sha256(stableStringify(actorMismatch.approvals));
expectErrors("approval-actor-mismatch", "flow field drift", validateReview4ApprovalEnvelope({ audit, approvals: actorMismatch, orderedIds, rows: [row] }));
const mixedManifest = structuredClone(appliedManifest);
mixedManifest.items[0].semanticEvidence.review4Proof.candidateDigest = "0".repeat(64);
expectErrors("embedded-manifest-mix", "mixed candidate digest", validateReview4AppliedManifest({ rows: [row], manifest: mixedManifest }));
expectThrow("apply-before-write-global-tamper", "global validation failed", () => assertReview4AppliedManifestValid({ rows: [row], manifest: mixedManifest }));

console.log("== V390 REVIEW4 independent approval non-gate self-test ==");
console.log("- negative self-tests: 11");
console.log("- gateStatus: not-run");
console.log("- failures: 0");

function expectDecisionError(name, expected, mutate) {
  const copy = structuredClone(artifact);
  mutate(copy);
  expectErrors(name, expected, validateReview4DecisionArtifact({ audit, decisions: copy, orderedIds, rows: [row] }));
}
function expectErrors(name, expected, errors) { if (!errors.some(error => error.includes(expected))) throw new Error(`${name} missed ${expected}: ${errors.join(";")}`); }
function assertNoErrors(errors, name) { if (errors.length) throw new Error(`${name}: ${errors.join(";")}`); }
function expectThrow(name, expected, fn) { try { fn(); } catch (error) { if (String(error).includes(expected)) return; throw error; } throw new Error(`${name} did not fail`); }
