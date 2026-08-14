// 파일 용도: 독립 REVIEW4 source-flow approval을 기존 v2 manifest 호환 shape로 투영한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  REVIEW3_CALL_CHAIN_SCHEMA,
  SEMANTIC_CLOSURE_SCHEMA,
  SEMANTIC_REVIEW_STATUS,
  semanticDigest,
  summarizeSemanticClosure,
  assertReview4AppliedManifestValid,
  validateSemanticItem,
} from "./feature_semantic_evidence_lib.mjs";
import {
  REVIEW4_APPROVAL_REVIEWER_SOURCE,
  REVIEW4_APPROVAL_SOURCE,
  buildReview4SemanticObligation,
  parseVerifiedReview4Dispatch,
  review4ApprovalEnvelope,
  review4CandidateDigest,
  review4SourceFlowDigest,
  stableStringify,
  validateReview4ApprovalEnvelope,
  validateReview4SemanticProof,
  validateReview4SharedFlows,
  validateReview4TrustBindings,
} from "./feature_semantic_review4_trust_lib.mjs";

export function applyApprovedReview4SemanticClosure({ rootDir, inventoryText, rows, manifest, audit, approvals }) {
  const orderedIds = rows.map(row => row.id);
  const rowById = new Map(rows.map(row => [row.id, row]));
  const envelopeErrors = validateReview4ApprovalEnvelope({ audit, approvals, orderedIds, rows });
  if (envelopeErrors.length > 0) throw new Error(envelopeErrors.join("; "));
  const dispatch = parseVerifiedReview4Dispatch(rootDir);
  if (audit.candidateDigest !== review4CandidateDigest(audit.items)) {
    throw new Error("REVIEW4 audit items do not match candidate digest");
  }
  for (const proof of audit.items) {
    const row = rowById.get(proof.id);
    if (!row || stableStringify(proof.semanticObligation) !==
        stableStringify(buildReview4SemanticObligation(row, { rootDir }))) {
      throw new Error(`${proof.id} REVIEW4 typed semantic obligation drift before apply`);
    }
    if (proof.status === "source-resolved-candidate" && proof.sourceFlowDigest !== review4SourceFlowDigest(proof)) {
      throw new Error(`${proof.id} REVIEW4 source-flow digest drift before apply`);
    }
    const trustErrors = proof.status === "source-resolved-candidate"
      ? validateReview4TrustBindings(rootDir, proof, dispatch)
      : [];
    if (trustErrors.length > 0) throw new Error(trustErrors.join("; "));
    const semanticErrors = proof.status === "source-resolved-candidate"
      ? validateReview4SemanticProof({ item: proof, dispatchIndex: dispatch, rootDir })
      : [];
    if (semanticErrors.length > 0) throw new Error(`${proof.id} REVIEW4 typed semantic proof invalid: ${semanticErrors.join(";")}`);
  }
  const sharedErrors = validateReview4SharedFlows(audit.items);
  if (sharedErrors.length > 0) throw new Error(`REVIEW4 shared flow validation failed: ${stableStringify(sharedErrors)}`);
  const proofById = new Map((audit.items || []).map(item => [item.id, item]));
  const approvalById = new Map((approvals.approvals || []).map(item => [item.id, item]));
  if (proofById.size !== rows.length || approvalById.size !== rows.length) {
    throw new Error("REVIEW4 proof/approval ledger must cover every inventory row exactly once");
  }
  if (JSON.stringify((audit.items || []).map(item => item.id)) !== JSON.stringify(rows.map(row => row.id)) ||
      JSON.stringify((approvals.approvals || []).map(item => item.id)) !== JSON.stringify(rows.map(row => row.id))) {
    throw new Error("REVIEW4 proof/approval ledger ID order drift");
  }
  if (!Array.isArray(manifest?.items) ||
      stableStringify(manifest.items.map(item => item.id)) !== stableStringify(orderedIds) ||
      new Set(manifest.items.map(item => item.id)).size !== orderedIds.length) {
    throw new Error("base implementation manifest ID coverage/order drift");
  }
  if (new Set(approvals.approvals.map(item => item.reason)).size !== rows.length) {
    throw new Error("REVIEW4 approval reasons must be unique per row");
  }

  const next = structuredClone(manifest);
  next.inventorySha256 = sha256(inventoryText);
  next.generationPolicy =
    "review4-independent-proof-only; generated discovery cannot approve; source drift becomes review-required";
  next.semanticClosurePolicy =
    "986 external reviewed source-flow proofs joined to an independent approval ledger and revalidated against current source";
  next.items = next.items.map(base => {
    const row = rowById.get(base.id);
    const proof = proofById.get(base.id);
    const approval = approvalById.get(base.id);
    if (!row || proof?.status !== "source-resolved-candidate") {
      throw new Error(`${base.id} does not have a resolved REVIEW4 source proof`);
    }
    if (approval?.decision !== "approved-source-flow" ||
        approval.sourceFlowDigest !== proof.sourceFlowDigest ||
        approval.reviewerSource !== REVIEW4_APPROVAL_REVIEWER_SOURCE ||
        !approval.reason ||
        !approval.reason.includes(base.id) ||
        !approval.reason.includes(proof.verifier.command) ||
        !approval.reason.includes(proof.evidenceToken) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(approval.reviewedOn || ""))) {
      throw new Error(`${base.id} independent approval mismatch`);
    }

    const roles = {
      owner: compatibilityLocator(rootDir, proof.roles.owner),
      routeControl: compatibilityLocator(rootDir, proof.roles.dispatch),
      action: compatibilityLocator(rootDir, proof.roles.action),
      state: compatibilityLocator(rootDir, proof.roles.state),
      readback: compatibilityLocator(rootDir, proof.roles.readback),
    };
    const chain = {
      schema: REVIEW3_CALL_CHAIN_SCHEMA,
      roles,
      routeControlKind: "review4-actual-dispatch-or-control",
      edges: proof.edges.map((edge, index) => ({
        from: index === 1 ? "routeControl" : edge.from,
        to: index === 0 ? "routeControl" : index === 4 ? "verifierAssertion" : edge.to,
        relationKind: `review4-${edge.kind || edge.proof}`,
        proof: structuredClone(edge),
        digest: sha256(JSON.stringify(edge)),
      })),
      digest: proof.sourceFlowDigest,
    };
    const evidence = structuredClone(base.semanticEvidence || {});
    evidence.schema = SEMANTIC_CLOSURE_SCHEMA;
    evidence.handler = roles.owner;
    evidence.actionHandler = roles.action;
    evidence.stateOracle = {
      ...(evidence.stateOracle || {}),
      oracleKind: proof.evidenceMode,
      expectedBehavior: normalize(row.pass),
      expectedBehaviorSha256: sha256(normalize(`${row.feature}\n${row.pass}`)),
      locator: roles.state,
    };
    evidence.relation = {
      kind: "review4-independent-source-flow",
      handlerSymbol: roles.owner.symbol,
      actionSymbol: roles.action.symbol,
      stateSymbol: roles.state.symbol,
      semanticKey: `${row.id}:${sha256(normalize(`${row.feature}\n${row.pass}`)).slice(0, 24)}`,
    };
    evidence.verifierAssertion = {
      file: proof.roles.readback.file,
      symbol: proof.roles.readback.symbol,
      assertionKind: proof.evidenceMode,
      assertionAnchor: proof.roles.readback.anchor,
      command: proof.verifier.command,
      assertedSemanticDigest: "",
    };
    evidence.callChain = chain;
    evidence.review4Proof = {
      schema: "media-server.feature-reviewed-source-flow.v1",
      featureContractSha256: proof.featureContractSha256,
      flowKind: proof.flowKind,
      requirement: proof.requirement,
      evidenceMode: proof.evidenceMode,
      evidenceToken: proof.evidenceToken,
      sharedContract: proof.sharedContract,
      semanticObligation: proof.semanticObligation,
      verifier: proof.verifier,
      roles: proof.roles,
      edges: proof.edges,
      trustBindings: proof.trustBindings,
      sourceFlowDigest: proof.sourceFlowDigest,
      candidateDigest: audit.candidateDigest,
      generationBoundarySha256: approvals.generationBoundarySha256,
      approval: structuredClone(approval),
      approvalDigest: sha256(JSON.stringify(approval)),
    };

    const item = {
      ...base,
      status: SEMANTIC_REVIEW_STATUS,
      semanticEvidence: evidence,
      sourceEvidence: {
        file: proof.roles.owner.file,
        anchor: proof.roles.owner.anchor,
        anchorKind: "review4-reviewed-owner-source-line",
      },
      verifierEvidence: {
        file: proof.roles.readback.file,
        anchor: proof.roles.readback.anchor,
        anchorKind: "review4-independent-readback",
        command: proof.verifier.command,
      },
      review: {
        decision: "approved",
        reviewer: approval.reviewerSource,
        reviewedOn: approval.reviewedOn,
        reason: approval.reason,
        approvalSource: REVIEW4_APPROVAL_SOURCE,
        sourceFlowDigest: proof.sourceFlowDigest,
        approvalDigest: sha256(JSON.stringify(approval)),
        semanticDigest: "",
      },
    };
    const digest = semanticDigest(row, evidence);
    item.semanticEvidence.verifierAssertion.assertedSemanticDigest = digest;
    item.review.semanticDigest = digest;
    return item;
  });
  next.semanticClosureSummary = summarizeSemanticClosure({ rows, manifest: next });
  next.semanticClosureSummary.review4ApprovedSourceFlows = next.items.filter(item =>
    item.review?.approvalSource === REVIEW4_APPROVAL_SOURCE).length;
  next.review4ApprovalEnvelope = review4ApprovalEnvelope(approvals, orderedIds, audit);
  for (let index = 0; index < next.items.length; index += 1) {
    const errors = validateSemanticItem({ rootDir, row: rows[index], item: next.items[index] });
    if (errors.length > 0) throw new Error(`applied REVIEW4 manifest validation failed: ${errors.join("; ")}`);
  }
  assertReview4AppliedManifestValid({ rows, manifest: next });
  return next;
}

export function replaceJsonFixturesAtomically({
  replacements,
  validateReadback = () => {},
  failAfterReplacement = -1,
}) {
  if (!Array.isArray(replacements) || replacements.length === 0) {
    throw new Error("JSON fixture transaction requires replacements");
  }
  const transactionId = `${process.pid}-${crypto.randomUUID()}`;
  const staged = replacements.map(([target, value]) => {
    const temporary = `${target}.transaction-${transactionId}.tmp`;
    const mode = fs.existsSync(target) ? fs.statSync(target).mode & 0o777 : 0o600;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode });
    if (stableStringify(JSON.parse(fs.readFileSync(temporary, "utf8"))) !== stableStringify(value)) {
      throw new Error(`temporary ${path.basename(target)} readback drift`);
    }
    return [target, temporary];
  });
  const backups = staged.map(([target]) => [target, `${target}.transaction-${transactionId}.bak`]);
  try {
    for (let index = 0; index < staged.length; index += 1) {
      fs.renameSync(staged[index][0], backups[index][1]);
      fs.renameSync(staged[index][1], staged[index][0]);
      if (index === failAfterReplacement) throw new Error(`injected fixture transaction failure after ${index + 1}`);
    }
    validateReadback();
    for (const [, backup] of backups) fs.rmSync(backup, { force: true });
  } catch (error) {
    for (let index = backups.length - 1; index >= 0; index -= 1) {
      const [target, backup] = backups[index];
      if (!fs.existsSync(backup)) continue;
      fs.rmSync(target, { force: true });
      fs.renameSync(backup, target);
    }
    for (const [, temporary] of staged) fs.rmSync(temporary, { force: true });
    throw error;
  }
}

function compatibilityLocator(rootDir, role) {
  const text = fs.readFileSync(path.join(rootDir, role.file), "utf8");
  const lines = text.split(/\r?\n/);
  const prefix = lines.slice(0, Math.max(0, role.line - 1)).join("\n");
  const occurrence = prefix.split(role.anchor).length - 1;
  return {
    file: role.file,
    symbol: role.symbol,
    symbolKind: "reviewed-owner-or-readback",
    anchor: role.anchor,
    anchorKind: "review4-reviewed-source-line",
    anchorStrength: "feature-specific-source-line",
    occurrence,
    line: role.line,
    contextSha256: role.contextSha256,
  };
}

function normalize(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
