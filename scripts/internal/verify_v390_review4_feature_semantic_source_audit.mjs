#!/usr/bin/env node
// 파일 용도: REVIEW4-53의 986 feature를 verifier가 실제 참조하는 production source에서 역추적한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  loadImplementationManifest,
  parseFeatureRows,
  writeImplementationManifest,
} from "./feature_implementation_manifest_lib.mjs";
import { applyApprovedReview4SemanticClosure } from "./feature_semantic_review4_apply.mjs";
import {
  REVIEW4_APPROVAL_PRODUCER,
  REVIEW4_APPROVAL_REVIEWER_SOURCE,
  REVIEW4_GENERATION_BOUNDARY,
  REVIEW4_OBLIGATION_POLICY,
  buildReview4TrustBindings,
  buildReview4SemanticObligation,
  classifyReview4Requirement,
  parseVerifiedReview4Dispatch,
  review4CanonicalFlowKey,
  review4CandidateDigest,
  review4HardCandidateItems,
  review4ExplicitNegativeBoundaryEvidence,
  review4ExplicitProductNegativeBoundaryEvidence,
  review4ProofOnlyVerifierPath,
  review4SelfDeclaredRuntimeReadback,
  review4SourceFlowDigest,
  review4WholeFileSourceAssertion,
  stableStringify,
  validateReview4ApprovalEnvelope,
  validateReview4SemanticProof,
  validateReview4SharedFlows,
  validateReview4TrustBindings,
} from "./feature_semantic_review4_trust_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
const ledgerPath = "test/fixtures/v390_review4_feature_semantic_source_audit.json";
const approvalPath = "test/fixtures/v390_review4_feature_semantic_source_approvals.json";
const reviewedProofPaths = [
  "test/fixtures/v390_review4_semantic_proofs_ui_auth_src_rule.json",
  "test/fixtures/v390_review4_semantic_proofs_evt_client_media_lab.json",
  "test/fixtures/v390_review4_semantic_proofs_safe_ops.json",
];
const verifierTokenCache = new Map();
const verifierFactCache = new Map();
const textCache = new Map();

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4 independent feature semantic source audit

Usage:
  ./server.sh verify-v390-review4-feature-semantic-source-audit [--write-ledger] [--apply-approved-manifest] [--family <PREFIX>] [--id-range <START:END>]

The discovery phase extracts production tokens from each dispatched verifier and resolves them
back to exact source locations. It does not trust or copy REVIEW3 edge digests, review reasons,
reviewer names, approval flags, or asserted semantic digests. Candidate generation never approves
a row. A committed approval ledger is required before a row can become REVIEW4 source-verified.
`);
}
assertKnownOptions(rawArgs, ["h", "help", "write-ledger", "apply-approved-manifest", "family", "id-range"]);

const manifest = readJson("test/fixtures/project_feature_implementation_evidence.json");
const inventory = readText("docs/project-feature-test-inventory.md");
const rows = parseFeatureRows(inventory);
const production = productionIndex();
const dispatch = dispatchIndex();
const reviewedProofs = loadReviewedProofs();
const candidate = buildCandidate({ manifest, rows, production, dispatch, reviewedProofs });

const familyOptionIndex = rawArgs.findIndex(value => value === "--family" || value.startsWith("--family="));
if (familyOptionIndex >= 0) {
  const family = rawArgs[familyOptionIndex].includes("=")
    ? rawArgs[familyOptionIndex].slice(rawArgs[familyOptionIndex].indexOf("=") + 1)
    : rawArgs[familyOptionIndex + 1];
  assert(/^[A-Z]+$/.test(String(family || "")), "--family requires an uppercase feature prefix");
  const rangeOptionIndex = rawArgs.findIndex(value => value === "--id-range" || value.startsWith("--id-range="));
  const rangeText = rangeOptionIndex < 0 ? "" : (rawArgs[rangeOptionIndex].includes("=")
    ? rawArgs[rangeOptionIndex].slice(rawArgs[rangeOptionIndex].indexOf("=") + 1)
    : rawArgs[rangeOptionIndex + 1]);
  const rangeMatch = String(rangeText).match(/^([0-9]+):([0-9]+)$/);
  assert(rangeOptionIndex < 0 || rangeMatch, "--id-range requires START:END numeric values");
  const rangeStart = rangeMatch ? Number.parseInt(rangeMatch[1], 10) : null;
  const rangeEnd = rangeMatch ? Number.parseInt(rangeMatch[2], 10) : null;
  assert(rangeStart === null || rangeStart <= rangeEnd, "--id-range START must be <= END");
  const scoped = candidate.items.filter(item => {
    if (!item.id.startsWith(`${family}-`)) return false;
    if (rangeStart === null) return true;
    const numericId = Number.parseInt(item.id.slice(family.length + 1), 10);
    return numericId >= rangeStart && numericId <= rangeEnd;
  });
  if (rangeStart !== null) assert(scoped.length === rangeEnd - rangeStart + 1, `--id-range expected ${rangeEnd - rangeStart + 1} rows, got ${scoped.length}`);
  const results = scoped.map(item => ({
    id: item.id,
    status: item.status,
    errors: item.status === "source-resolved-candidate"
      ? candidateErrors(item)
      : [item.failureReason, ...(item.reviewedProofErrors || [])].filter(Boolean),
  }));
  const resolved = results.filter(item => item.status === "source-resolved-candidate" && item.errors.length === 0).length;
  const output = `${JSON.stringify({ family, idRange: rangeText || "all", total: results.length, resolved, unresolved: results.filter(item => item.status !== "source-resolved-candidate" || item.errors.length > 0) }, null, 2)}\n`;
  fs.writeSync(process.stdout.fd, output);
  process.exit(resolved === results.length ? 0 : 1);
}

if (rawArgs.includes("--write-ledger")) {
  fs.writeFileSync(path.join(rootDir, ledgerPath), `${JSON.stringify(candidate, null, 2)}\n`);
}

const stored = readJson(ledgerPath);
const approvals = fs.existsSync(path.join(rootDir, approvalPath)) ? readJson(approvalPath) : null;
const checks = [];
check("candidate covers the exact 986 inventory IDs without using REVIEW3 claims", () => {
  assert(candidate.items.length === 986, `candidate row count ${candidate.items.length}`);
  assert(JSON.stringify(candidate.items.map(item => item.id)) === JSON.stringify(rows.map(row => row.id)), "candidate ID order drift");
  assert(stored.candidateDigest === review4CandidateDigest(stored.items || []), "stored source audit body digest drift");
  assert(stored.candidateDigest === candidate.candidateDigest, "source audit ledger drift");
  assert(stableStringify(review4HardCandidateItems(stored.items || [])) === stableStringify(review4HardCandidateItems(candidate.items)), "stored source audit items differ from fresh candidate");
  assert(stored.generationBoundary.excludedInputs.includes("review.reason"), "review reason exclusion missing");
  assert(stored.generationBoundary.excludedInputs.includes("semanticEvidence.callChain.edges"), "declared edge exclusion missing");
  assert(stored.generationBoundary.candidateIsApproval === false, "candidate was promoted to approval");
});
check("every row has an independently dispatched verifier", () => {
  assert(candidate.items.every(item => item.verifier.command && item.verifier.file), "verifier binding missing");
  assert(candidate.items.every(item => verifierDispatchValid(item.verifier, dispatch)), "verifier dispatch drift");
});
check("all rows are source-resolved before REVIEW4 approval", () => {
  const unresolved = candidate.items.filter(item => item.status !== "source-resolved-candidate");
  assert(unresolved.length === 0, `${unresolved.length} rows remain unresolved; first=${unresolved.slice(0, 12).map(item => `${item.id}:${item.failureReason}`).join(",")}`);
});
check("source proof roles and independent readback are exact", () => {
  for (const item of candidate.items.filter(value => value.status === "source-resolved-candidate")) validateCandidateItem(item);
});
check("known REVIEW3 false mappings are replaced by actual source owners", () => {
  const byId = new Map(candidate.items.map(item => [item.id, item]));
  assertSpotCheck(byId, "UI-001", ["src/ingress/webrtc_http_server.cpp", 'request.path == "/"', "DefaultHomePath", "RoleLandingPath"]);
  assertSpotCheck(byId, "UI-022", ["src/ingress/product_ui_page_scripts.cpp", "wireOpsVlmControls"]);
  assertSpotCheck(byId, "SRC-009", ["src/ingress/product_ui_ops_sources_script.cpp", "saveChannelSourceViewPair"]);
  assertSpotCheck(byId, "RULE-009", ["src/ingress/webrtc_http_server_runtime.cpp", "AnalysisRegistry().UpsertVaRule(id, request.body)"]);
  assertSpotCheck(byId, "SAFE-217", ["src/ingress/webrtc_http_server.cpp", "WriteAnalysisRegistryFileAtomically"]);
  assertSpotCheck(byId, "OPS-184", ["src/ingress/webrtc_http_server.cpp", "RecoverAnalysisRegistryTemporaryFiles"]);
});
check("UI-001 through UI-050 remain strict and VLM mutations use independent readback", () => {
  const byId = new Map(candidate.items.map(item => [item.id, item]));
  for (let index = 1; index <= 50; index += 1) {
    const id = `UI-${String(index).padStart(3, "0")}`;
    assert(byId.get(id)?.status === "source-resolved-candidate", `${id} strict proof regressed`);
  }
  const putList = byId.get("UI-023");
  assert(putList.evidenceToken === "evaluation", "UI-023 must bind evaluation on both state and list readback");
  assert(putList.roles.readback.anchor === 'case "${vlm_profile_list_json}" in', "UI-023 must use list GET readback");
  const deleteReadback = byId.get("UI-029");
  assert(deleteReadback.roles.readback.anchor === 'case "${vlm_profile_delete_readback_json}" in', "UI-029 must use post-delete list GET absence readback");
});
check("UI-051 through UI-100 remain strict on canonical functional verifiers", () => {
  const byId = new Map(candidate.items.map(item => [item.id, item]));
  for (let index = 51; index <= 100; index += 1) {
    const id = `UI-${String(index).padStart(3, "0")}`;
    const item = byId.get(id);
    assert(item?.status === "source-resolved-candidate", `${id} strict proof regressed`);
    assert(!review4ProofOnlyVerifierPath(item.verifier.file), `${id} uses proof-only verifier ${item.verifier.file}`);
    assert(!review4ProofOnlyVerifierPath(item.roles.readback.file), `${id} uses proof-only readback ${item.roles.readback.file}`);
  }
});
check("stored approvals are external to candidate generation and cover all rows", () => {
  const envelopeErrors = validateReview4ApprovalEnvelope({ audit: candidate, approvals, orderedIds: rows.map(row => row.id), rows });
  assert(envelopeErrors.length === 0, `approval envelope invalid: ${envelopeErrors.join(";")}`);
  assert(approvals?.schema === "media-server.v390-review4-feature-semantic-source-approvals.v1", "approval schema missing");
  assert(approvals?.producer === REVIEW4_APPROVAL_PRODUCER, "approval producer missing");
  assert(approvals?.candidateGeneratorMayApprove === false, "candidate generator may approve");
  assert(approvals?.candidateDigest === candidate.candidateDigest, "approval candidate digest drift");
  assert(Array.isArray(approvals?.approvals) && approvals.approvals.length === 986, "approval ledger must cover 986 rows");
  const byId = new Map(candidate.items.map(item => [item.id, item]));
  assert(new Set(approvals.approvals.map(item => item.id)).size === rows.length, "approval ledger contains duplicate IDs");
  assert(JSON.stringify(approvals.approvals.map(item => item.id)) === JSON.stringify(rows.map(row => row.id)), "approval ledger ID order drift");
  assert(new Set(approvals.approvals.map(item => item.reason)).size === rows.length, "approval ledger contains bulk duplicate reasons");
  const rowById = new Map(rows.map(row => [row.id, row]));
  for (const approval of approvals.approvals) {
    const item = byId.get(approval.id);
    const row = rowById.get(approval.id);
    assert(item, `approval has unknown ID ${approval.id}`);
    assert(approval.decision === "approved-source-flow", `${approval.id} approval decision drift`);
    assert(approval.sourceFlowDigest === item.sourceFlowDigest, `${approval.id} approval digest drift`);
    assert(approval.reviewerSource === REVIEW4_APPROVAL_REVIEWER_SOURCE, `${approval.id} approval source drift`);
    assert(typeof approval.reason === "string" && approval.reason.trim().length >= 24, `${approval.id} approval reason missing`);
    assert(approval.reason.includes(approval.id) &&
      approval.reason.includes(item.verifier.command) &&
      approval.reason.includes(item.evidenceToken) &&
      approval.reason.includes(item.roles.action.symbol) &&
      approval.reason.includes(item.roles.state.symbol) &&
      approval.reason.includes(row.feature) &&
      approval.reason.includes(row.pass), `${approval.id} approval reason is not bound to the reviewed feature/pass flow`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(approval.reviewedOn || "")), `${approval.id} approval date missing`);
  }
});
check("negative fixtures reject unrelated, shared, self-comparison, invented-edge, and generator approval", () => {
  const base = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate"));
  assert(base, "negative fixture requires a resolved candidate");
  const mutations = [
    ["unrelated-anchor", copy => { copy.roles.action.anchor = "__unrelated__"; }, "missing-source-anchor"],
    ["generic-shared-owner", copy => { copy.roles.owner.symbol = "WebRtcHttpServer::Start"; copy.roles.owner.featureBinding = "shared-generic"; }, "generic-shared-owner"],
    ["same-observation", copy => { copy.flowKind = "mutation"; copy.roles.state = structuredClone(copy.roles.action); }, "mutation-action-state-self-comparison"],
    ["invented-edge", copy => { copy.edges[1].proof = "declared-digest-only"; }, "invented-edge-proof"],
  ];
  for (const [name, mutate, expected] of mutations) {
    const copy = structuredClone(base);
    mutate(copy);
    const errors = candidateErrors(copy);
    assert(errors.some(error => error.includes(expected)), `${name} negative passed: ${errors.join(";")}`);
  }
  for (const mutate of [
    copy => { copy.evidenceMode = `${copy.evidenceMode}-tampered`; },
    copy => { copy.sharedContract = { id: "media-server.actual-contract.tampered", facet: "ops-gate" }; },
  ]) {
    const copy = structuredClone(base);
    mutate(copy);
    assert(sourceFlowDigest(copy) !== sourceFlowDigest(base), "source-flow digest omitted reviewed metadata");
  }
  const grouped = new Map();
  for (const item of candidate.items.filter(value => value.status === "source-resolved-candidate")) {
    const group = grouped.get(baseFacetKey(item)) || [];
    group.push(item);
    grouped.set(baseFacetKey(item), group);
  }
  const shared = [...grouped.values()].find(group => group.length > 1);
  if (shared) {
    assert(shared.every(item => item.sharedContract?.id && item.sharedContract?.facet), "shared flow lacks explicit contract facets");
    assert(new Set(shared.map(item => facetKey(item))).size === shared.length, "shared contract facets are not unique");
    const duplicateFacet = { ...shared[1], sharedContract: structuredClone(shared[0].sharedContract) };
    assert(facetKey(duplicateFacet) === facetKey(shared[0]), "duplicate shared facet was not detected");
  }
  assert(candidate.generationBoundary.candidateIsApproval === false, "generator approval negative failed");
});
check("outside-3-line function/blob mutation invalidates source-flow digest", () => {
  const base = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate"));
  assert(base, "outside-context negative requires resolved candidate");
  base.trustBindings.roles.state.enclosingBodySha256 = "0".repeat(64);
  base.trustBindings.roles.state.trackedBlobSha256 = "1".repeat(64);
  assert(base.sourceFlowDigest !== review4SourceFlowDigest(base), "outside-3-line source mutation was omitted from source-flow digest");
});
check("unrelated product file mutation outside bound body preserves source-flow digest", () => {
  const base = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate" &&
    /^(?:src|include|config)\//.test(item.roles?.state?.file || "")));
  assert(base, "unrelated product mutation negative requires product candidate");
  base.trustBindings.roles.state.trackedBlobSha256 = "2".repeat(64);
  assert(base.sourceFlowDigest === review4SourceFlowDigest(base), "unrelated product file mutation invalidated bound flow");
});
check("require-only or basename-mention dispatch is rejected", () => {
  const fakeDispatch = parseVerifiedReview4Dispatch(rootDir, [
    "  verify-review4-fake)",
    "    require_internal fake_review4_verifier.mjs",
    "    : # basename mention without exec must not dispatch fake_review4_verifier.mjs",
    "    ;;",
    "",
  ].join("\n"));
  assert(!fakeDispatch.commandToRecord.has("verify-review4-fake"), "require-only fake dispatch was accepted");
});
check("stored audit body tamper invalidates canonical candidate digest", () => {
  const copy = structuredClone(candidate.items);
  copy[0].failureReason = "tampered-stored-body";
  assert(review4CandidateDigest(copy) !== candidate.candidateDigest, "stored body tamper preserved candidate digest");
});
check("apply-time proof tamper is rejected by source-flow recomputation", () => {
  const copy = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate"));
  assert(copy, "apply tamper negative requires resolved candidate");
  copy.roles.owner.anchor = `${copy.roles.owner.anchor} /* tampered */`;
  assert(copy.sourceFlowDigest !== review4SourceFlowDigest(copy), "apply tamper preserved source-flow digest");
});
check("unrelated proof row swap is rejected by typed obligation", () => {
  const candidates = candidate.items.filter(item => item.semanticObligation && item.roles?.state && item.roles?.readback);
  let rejected = false;
  for (const proof of candidates) {
    for (const rowShape of candidates) {
      if (proof.id === rowShape.id) continue;
      const copy = structuredClone(proof);
      copy.id = rowShape.id;
      copy.featureContractSha256 = rowShape.featureContractSha256;
      copy.requirement = structuredClone(rowShape.requirement);
      copy.semanticObligation = structuredClone(rowShape.semanticObligation);
      const errors = validateReview4SemanticProof({ item: copy, dispatchIndex: dispatch, rootDir });
      if (errors.some(error => /^obligation-(?:route|schema|field|outcome)-token-unbound$/.test(error) || error.includes("product-source-required"))) {
        rejected = true;
        break;
      }
    }
    if (rejected) break;
  }
  assert(rejected, "unrelated proof row swap was not rejected");
});
check("fake def-use edge without shared symbol or variable is rejected", () => {
  const base = structuredClone(candidate.items.find(item => item.semanticObligation && item.roles?.dispatch && item.roles?.action));
  assert(base, "fake def-use negative requires candidate");
  base.roles.dispatch.anchor = "leftOnly = valueAlpha;";
  base.roles.dispatch.symbol = "leftOnly";
  base.roles.action.anchor = "consume(valueBeta);";
  base.roles.action.symbol = "consume";
  base.edges[1] = { from: "dispatch", to: "action", kind: "assignment-def-use", witness: "declared without actual shared value" };
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-1:def-use-token-or-variable-unbound"), `fake def-use passed: ${errors.join(",")}`);
});
check("comparison and arrow operators cannot impersonate assignment def-use", () => {
  const base = structuredClone(candidate.items.find(item => item.semanticObligation && item.roles?.dispatch && item.roles?.action));
  assert(base, "assignment operator negatives require candidate");
  for (const [label, dispatchAnchor, actionAnchor] of [
    ["strict equality", "observedValue === expectedValue;", "consume(observedValue);"],
    ["strict inequality", "observedValue !== expectedValue;", "consume(observedValue);"],
    ["arrow", "observedValue => expectedValue;", "consume(observedValue);"],
  ]) {
    const copy = structuredClone(base);
    copy.roles.dispatch.anchor = dispatchAnchor;
    copy.roles.dispatch.symbol = "comparison-dispatch";
    copy.roles.action.anchor = actionAnchor;
    copy.roles.action.symbol = "comparison-action";
    copy.edges[1] = { from: "dispatch", to: "action", kind: "assignment-def-use", witness: `${label} is not assignment` };
    const errors = validateReview4SemanticProof({ item: copy, dispatchIndex: dispatch, rootDir });
    assert(errors.includes("edge-1:assignment-def-use-unproven"), `${label} passed as assignment: ${errors.join(",")}`);
  }
});
check("generic canonical role labels cannot satisfy def-use sharing", () => {
  const base = structuredClone(candidate.items.find(item => item.semanticObligation && item.roles?.dispatch && item.roles?.action));
  assert(base, "generic role label negative requires candidate");
  base.roles.dispatch.anchor = "leftOnly = valueAlpha;";
  base.roles.dispatch.symbol = "canonical-dispatch";
  base.roles.action.anchor = "rightOnly = valueBeta;";
  base.roles.action.symbol = "canonical-action";
  base.edges[1] = { from: "dispatch", to: "action", kind: "assignment-def-use", witness: "generic role labels are not data flow" };
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-1:def-use-token-or-variable-unbound"), `generic canonical labels passed def-use: ${errors.join(",")}`);
});
check("same-body assignment def-use rejects reverse source order", () => {
  const base = structuredClone(candidate.items.find(item => item.semanticObligation && item.roles?.dispatch && item.roles?.action &&
    item.roles.dispatch.file === item.roles.action.file && item.roles.dispatch.line < item.roles.action.line));
  assert(base, "reverse assignment order negative requires same-body candidate");
  const originalDispatch = structuredClone(base.roles.dispatch);
  base.roles.dispatch = structuredClone(base.roles.action);
  base.roles.action = originalDispatch;
  base.edges[1] = { from: "dispatch", to: "action", kind: "assignment-def-use", witness: "reverse source order is not def-use" };
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-1:assignment-order-invalid"), `reverse same-body assignment passed: ${errors.join(",")}`);
});
check("reviewer symbols and consumer-only returned calls cannot impersonate directional def-use", () => {
  const base = structuredClone(candidate.items.find(item => item.semanticObligation && item.roles?.dispatch && item.roles?.action));
  assert(base, "directional def-use negative requires candidate");
  base.roles.dispatch.anchor = "const unrelatedOwner = staticLabel;";
  base.roles.dispatch.symbol = "synthetic-shared-reviewer-label";
  base.roles.action.anchor = "const observed = BuildUnrelatedResult();";
  base.roles.action.symbol = "synthetic-shared-reviewer-label";
  base.edges[1] = { from: "dispatch", to: "action", kind: "assignment-def-use", witness: "reviewer labels and consumer-only calls are not def-use" };
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-1:def-use-token-or-variable-unbound") && errors.includes("edge-1:assignment-def-use-unproven"),
    `reviewer symbol or consumer-only call passed directional def-use: ${errors.join(",")}`);
});
check("co-asserted boundary requires both ordered values in one canonical assertion", () => {
  const base = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate" &&
    item.edges?.some(edge => edge.kind === "co-asserted-boundary")));
  assert(base, "co-asserted boundary negative requires a resolved candidate");
  const index = base.edges.findIndex(edge => edge.kind === "co-asserted-boundary");
  base.roles.readback.anchor = "assert(unrelatedBoundaryOnly, \"unrelated boundary\");";
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes(`edge-${index}:co-asserted-boundary-unproven`),
    `unbound co-asserted boundary passed: ${errors.join(",")}`);
});
check("static source-string assertion cannot satisfy mutation runtime readback", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "static-source runtime negative requires resolved UI-023");
  const staticFile = "scripts/internal/verify_vlm_profile_storage.mjs";
  const staticAnchor = "assert(server.includes(snippet), `server missing VLM profile route snippet: ${snippet}`);";
  base.verifier = { command: "verify-vlm-profile-storage", file: staticFile };
  base.roles.readback = exactLocator(staticFile, "static-source-assertion", staticAnchor);
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-vlm-profile-storage", "verify-vlm-profile-storage)");
  base.edges[3] = {
    from: "state",
    to: "readback",
    kind: "runtime-readback",
    witness: `${base.evidenceToken} observed status readback`,
  };
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-vlm-profile-storage" };
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("mutation-independent-observed-readback-missing"), `static source assertion passed as runtime readback: ${errors.join(",")}`);
  assert(errors.includes("edge-3:runtime-readback-observation-missing"), `static source assertion passed edge runtime observation: ${errors.join(",")}`);
});
check("static source-string assertion cannot satisfy non-mutation runtime-readback edge", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "static non-mutation runtime negative requires resolved UI-023");
  const staticFile = "scripts/internal/verify_vlm_profile_storage.mjs";
  const staticAnchor = "assert(server.includes(snippet), `server missing VLM profile route snippet: ${snippet}`);";
  base.requirement = { ...base.requirement, operation: "read", expectation: "allow" };
  base.semanticObligation = structuredClone(base.semanticObligation);
  base.semanticObligation.requirement = structuredClone(base.requirement);
  base.verifier = { command: "verify-vlm-profile-storage", file: staticFile };
  base.roles.readback = exactLocator(staticFile, "static-source-read-model-assertion", staticAnchor);
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-vlm-profile-storage", "verify-vlm-profile-storage)");
  base.edges[3] = { from: "state", to: "readback", kind: "runtime-readback", witness: `${base.evidenceToken} static read-model assertion` };
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-vlm-profile-storage" };
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-3:runtime-readback-observation-missing"), `non-mutation static source passed runtime edge: ${errors.join(",")}`);
});
check("witness-only token and primary mutation response cannot satisfy independent readback", () => {
  const resolved = candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate");
  assert(resolved, "independent-readback negatives require resolved UI-023");

  const witnessOnly = structuredClone(resolved);
  witnessOnly.evidenceToken = "serverStatus";
  witnessOnly.edges[3].witness = "serverStatus declared only by witness";
  const witnessOnlyErrors = validateReview4SemanticProof({ item: witnessOnly, dispatchIndex: dispatch, rootDir });
  assert(witnessOnlyErrors.includes("edge-3:readback-token-unbound"), `witness-only token passed: ${witnessOnlyErrors.join(",")}`);

  const primaryResponse = structuredClone(resolved);
  const workflowFile = "scripts/internal/verify_auth_workflow.sh";
  primaryResponse.roles.readback = exactLocator(workflowFile, "runtime-oracle:VLM-profile-primary-response", 'case "${vlm_profile_json}" in');
  primaryResponse.edges[3].witness = "evaluation primary PUT response is not an independent storage observation";
  for (const edge of primaryResponse.edges) { delete edge.source; delete edge.target; }
  primaryResponse.trustBindings = buildReview4TrustBindings(rootDir, primaryResponse, dispatch);
  const primaryErrors = validateReview4SemanticProof({ item: primaryResponse, dispatchIndex: dispatch, rootDir });
  assert(primaryErrors.includes("mutation-independent-observed-readback-missing"), `primary mutation response passed as independent readback: ${primaryErrors.join(",")}`);

  const distant = structuredClone(resolved);
  distant.roles.readback = exactLocator("scripts/internal/verify_auth_workflow.sh", "runtime-oracle:distant-unrelated", 'expect_eq "$(http_code -H \'Origin: http://evil.example\' "${BASE}/auth/whoami")" "403" "cross-origin actual request denied"');
  distant.edges[3].witness = "evaluation appears only at a distant location in the same run_routes function";
  for (const edge of distant.edges) { delete edge.source; delete edge.target; }
  distant.trustBindings = buildReview4TrustBindings(rootDir, distant, dispatch);
  const distantErrors = validateReview4SemanticProof({ item: distant, dispatchIndex: dispatch, rootDir });
  assert(distantErrors.includes("edge-3:readback-token-unbound"), `distant same-function token passed local readback binding: ${distantErrors.join(",")}`);
});
check("explicit REVIEW4 proof-only scaffold cannot satisfy source semantics", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "proof scaffold negative requires resolved UI-023");
  base.roles.readback.symbol = "review4TypedSyntheticReadback";
  base.roles.readback.anchor = "review4TypedSyntheticReadback(result);";
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("readback:proof-only-review4-scaffold-rejected"), `explicit REVIEW4 scaffold passed: ${errors.join(",")}`);

  const shortVerifier = structuredClone(base);
  shortVerifier.verifier.file = "scripts/internal/verify_v390_review4_remaining_ui_auth_src_semantic.mjs";
  shortVerifier.roles.readback.file = shortVerifier.verifier.file;
  const shortErrors = validateReview4SemanticProof({ item: shortVerifier, dispatchIndex: dispatch, rootDir });
  assert(shortErrors.includes("proof-only-short-verifier-rejected"), `proof-only short verifier passed: ${shortErrors.join(",")}`);
  shortVerifier.verifier.file = "scripts/internal/verify_v390_review4_evt_client_media_authored_source.mjs";
  shortVerifier.roles.readback.file = shortVerifier.verifier.file;
  const authoredErrors = validateReview4SemanticProof({ item: shortVerifier, dispatchIndex: dispatch, rootDir });
  assert(authoredErrors.includes("proof-only-short-verifier-rejected"), `authored-source verifier passed: ${authoredErrors.join(",")}`);
  shortVerifier.verifier.file = "scripts/internal/verify_v390_review4_arbitrary_probe.mjs";
  shortVerifier.roles.readback.file = shortVerifier.verifier.file;
  const arbitraryErrors = validateReview4SemanticProof({ item: shortVerifier, dispatchIndex: dispatch, rootDir });
  assert(arbitraryErrors.includes("proof-only-short-verifier-rejected"), `arbitrary REVIEW4 proof verifier passed: ${arbitraryErrors.join(",")}`);
});
check("authored edge ranges and generated proof narratives are rejected before normalization", () => {
  const base = structuredClone(reviewedProofs.get("UI-001"));
  assert(base, "raw edge guard requires UI-001 reviewed proof");
  base.edges[3].target = `${base.roles.readback.file}:${base.roles.readback.line - 1}->${base.roles.readback.file}:${base.roles.readback.line}`;
  let errors = validateAuthoredEdgeFields(base);
  assert(errors.includes("edge-3:target-range-rejected"), `authored locator range passed: ${errors.join(",")}`);
  base.edges[3].target = `${base.roles.readback.file}:${base.roles.readback.line}`;
  base.edges[3].witness = `production state -> verifier literal line ${"| UI-001 | repeated inventory proof |".repeat(24)}`;
  errors = validateAuthoredEdgeFields(base);
  assert(errors.includes("edge-3:witness-too-long"), `long witness passed: ${errors.join(",")}`);
  assert(errors.includes("edge-3:inventory-row-in-witness-rejected"), `inventory witness passed: ${errors.join(",")}`);
  assert(errors.includes("edge-3:synthetic-literal-assertion-narrative-rejected"), `synthetic literal narrative passed: ${errors.join(",")}`);
});
check("typed requirement honors explicit deferral without corrupting positive mutations", () => {
  const deferred = classifyReview4Requirement(rows.find(row => row.id === "EVT-087"));
  assert(deferred.operation === "write", `EVT-087 primary write operation drifted to ${deferred.operation}`);
  assert(["deny", "invariant"].includes(deferred.expectation), `EVT-087 deferral classified as ${deferred.expectation}`);
  const positive = classifyReview4Requirement(rows.find(row => row.id === "UI-004"));
  assert(positive.operation === "update", `UI-004 primary update operation drifted to ${positive.operation}`);
  assert(positive.expectation === "allow", `UI-004 positive password lifecycle misclassified as ${positive.expectation}`);
  const stagedNoApply = classifyReview4Requirement(rows.find(row => row.id === "SAFE-139"));
  assert(stagedNoApply.operation === "read" && stagedNoApply.expectation === "invariant",
    `SAFE-139 staged no-apply classified as ${stagedNoApply.operation}/${stagedNoApply.expectation}`);
});
check("Python runtime assertions and case-normalized field identifiers preserve exact semantic binding", () => {
  const pythonAssertion = candidate.items.find(item => item.id === "SAFE-039" && item.status === "source-resolved-candidate");
  assert(pythonAssertion, "SAFE-039 Python runtime absence assertion was not accepted");
  const missingAssert = structuredClone(pythonAssertion);
  missingAssert.roles.readback.anchor = missingAssert.roles.readback.anchor.replace(/^\s*assert\s+/, "");
  const missingAssertErrors = validateReview4SemanticProof({ item: missingAssert, dispatchIndex: dispatch, rootDir });
  assert(missingAssertErrors.includes("edge-3:runtime-readback-observation-missing"),
    `non-assert Python expression passed runtime readback: ${missingAssertErrors.join(",")}`);

  const normalizedField = candidate.items.find(item => item.id === "SAFE-053" && item.status === "source-resolved-candidate");
  assert(normalizedField, "SAFE-053 WebRTC/Webrtc field token normalization was not accepted");
  const unrelatedField = structuredClone(normalizedField);
  const fieldClause = unrelatedField.semanticObligation.clauses.find(clause => clause.kind === "field");
  fieldClause.tokens = ["UnrelatedProtocolFieldThatDoesNotExist"];
  fieldClause.minimumExactMatches = 1;
  const unrelatedErrors = validateReview4SemanticProof({ item: unrelatedField, dispatchIndex: dispatch, rootDir });
  assert(unrelatedErrors.includes("obligation-field-token-unbound"),
    `unrelated case-normalized field token passed: ${unrelatedErrors.join(",")}`);
});
check("typed negative boundaries recognize exact false field names", () => {
  const cases = [
    ["clientNoticeSent=false and sendPerformed=false", "no-send"],
    ["automaticApplyPerformed=false", "no-auto-apply"],
    ["cloudProviderContacted=false and vlmProviderCalled=false", "provider-boundary"],
    ["cloud provider API 호출 금지", "provider-boundary"],
  ];
  for (const [pass, expected] of cases) {
    const obligation = buildReview4SemanticObligation({ id: "SAFE-999", feature: "negative boundary fixture", pass });
    assert(obligation.negativeBoundaries.some(boundary => boundary.kind === expected),
      `${expected} not extracted from ${pass}: ${JSON.stringify(obligation.negativeBoundaries)}`);
  }
});
check("comparison-only body cannot impersonate authoritative mutation", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "comparison-only mutation negative requires resolved UI-023");
  const file = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  base.roles.state = exactLocator(file, "comparisonOnlyMutationFixture", "if (comparisonValue === expectedValue) return true;");
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("mutation-authoritative-state-change-missing"), `comparison-only state passed mutation authority: ${errors.join(",")}`);
});
check("generic condition cannot hide static source provenance in its enclosing body", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "static-body runtime negative requires resolved UI-023");
  const staticFile = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  const staticAnchor = "if (!result?.ok) { // REVIEW4 negative fixture: generic condition over static source";
  base.verifier = { command: "verify-v390-review4-feature-semantic-source-audit", file: staticFile };
  base.roles.readback = exactLocator(staticFile, "staticEnclosingBodyBypassFixture", staticAnchor);
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-v390-review4-feature-semantic-source-audit", "verify-v390-review4-feature-semantic-source-audit)");
  base.edges[3] = {
    from: "state",
    to: "readback",
    kind: "runtime-readback",
    witness: `${base.evidenceToken} observed status readback`,
  };
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-v390-review4-feature-semantic-source-audit" };
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("mutation-independent-observed-readback-missing"), `static enclosing body passed as runtime readback: ${errors.join(",")}`);

  const fallback = structuredClone(base);
  fallback.trustBindings.roles.readback.enclosingBodyScope = "file-fallback";
  const fallbackErrors = validateReview4SemanticProof({ item: fallback, dispatchIndex: dispatch, rootDir });
  assert(fallbackErrors.includes("mutation-independent-observed-readback-missing"), `file fallback passed as runtime readback: ${fallbackErrors.join(",")}`);
});
check("semantic readback labels bind their enclosing check callback instead of a later regex test call", () => {
  const item = candidate.items.find(value => value.id === "UI-101" && value.status === "source-resolved-candidate");
  assert(item, "semantic label regression requires resolved UI-101");
  const readback = item.roles.readback;
  const binding = item.trustBindings.roles.readback;
  assert(binding.enclosingBodyScope === "semantic-enclosing-function", `UI-101 readback scope drift: ${binding.enclosingBodyScope}`);
  assert(binding.enclosingBodyStartLine < readback.line && binding.enclosingBodyEndLine >= readback.line,
    "UI-101 semantic label did not bind the enclosing check callback");
  const lines = readText(readback.file).split(/\r?\n/);
  const body = lines.slice(binding.enclosingBodyStartLine - 1, binding.enclosingBodyEndLine).join("\n");
  assert(body.includes('check("/ops dashboard declares and renders Export / Handoff Bundle workspace"'),
    "UI-101 readback bound a later .test(...) expression instead of its check callback");
});
check("runtime artifact write then separate file read remains eligible readback", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "runtime artifact positive requires resolved UI-023");
  const verifierFile = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  base.verifier = { command: "verify-v390-review4-feature-semantic-source-audit", file: verifierFile };
  base.roles.readback = exactLocator(verifierFile, "runtimeArtifactReadbackFixture", "if (registry.evaluation !== \"not-run\") {");
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-v390-review4-feature-semantic-source-audit", "verify-v390-review4-feature-semantic-source-audit)");
  base.edges[3].witness = "evaluation runtime artifact post-write file re-query";
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-v390-review4-feature-semantic-source-audit" };
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(!errors.includes("mutation-independent-observed-readback-missing"), `runtime artifact readback was rejected: ${errors.join(",")}`);
});
check("default object argument brace resolves the real enclosing function body", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-051" && item.status === "source-resolved-candidate"));
  assert(base, "default object argument regression requires resolved UI-051");
  const actionTrust = base.trustBindings.roles.action;
  assert(actionTrust.enclosingBodyStartLine === base.roles.action.line, "default object argument function start drift");
  assert(actionTrust.enclosingBodyEndLine >= base.roles.state.line, "default object argument selected the {} default instead of function body");
  const truncated = structuredClone(base);
  truncated.trustBindings.roles.action.enclosingBodyEndLine = truncated.roles.action.line;
  const errors = validateReview4SemanticProof({ item: truncated, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-2:containment-unproven"), `truncated default-argument body passed containment: ${errors.join(",")}`);
});
check("same-check token in a different assertion loop cannot satisfy readback", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-023" && item.status === "source-resolved-candidate"));
  assert(base, "cross-loop readback regression requires resolved UI-023");
  const verifierFile = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  base.verifier = { command: "verify-v390-review4-feature-semantic-source-audit", file: verifierFile };
  base.roles.readback = exactLocator(verifierFile, "crossLoopAssertionFixture", 'assert(source.includes(snippet), "cross-loop unrelated branch");');
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-v390-review4-feature-semantic-source-audit", "verify-v390-review4-feature-semantic-source-audit)");
  base.edges[3].witness = "evaluation must be present in the selected local assertion branch";
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-v390-review4-feature-semantic-source-audit" };
  for (const edge of base.edges) { delete edge.source; delete edge.target; }
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-3:readback-token-unbound"), `different-loop token passed readback: ${errors.join(",")}`);
});
check("generic snippet loop cannot satisfy a structural readback token", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-056" && item.status === "source-resolved-candidate"));
  assert(base, "generic-loop regression requires resolved UI-056");
  const verifierFile = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  base.verifier = { command: "verify-v390-review4-feature-semantic-source-audit", file: verifierFile };
  base.roles.readback = exactLocator(verifierFile, "genericLoopAssertionFixture", 'assert(source.includes(snippet), "generic loop target branch");');
  base.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-v390-review4-feature-semantic-source-audit", "verify-v390-review4-feature-semantic-source-audit)");
  base.edges[3].witness = "approvalDraft must be literal in the assertion call";
  base.edges[4] = { from: "readback", to: "verifier", kind: "verifier-dispatch", witness: "verify-v390-review4-feature-semantic-source-audit" };
  for (const edge of base.edges) { delete edge.source; delete edge.target; }
  base.trustBindings = buildReview4TrustBindings(rootDir, base, dispatch);
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-3:readback-token-unbound"), `generic snippet loop passed readback: ${errors.join(",")}`);
});

check("whole-file anywhere assertion cannot satisfy structural product readback", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-051" && item.status === "source-resolved-candidate"));
  assert(base, "whole-file assertion regression requires resolved UI-051");
  base.roles.readback = {
    ...base.roles.readback,
    symbol: "wholeFileAnywhereAssertionFixture",
    anchor: 'assertIncludes(script, "incidentDecisionScorecard", "REVIEW4 whole-file negative fixture");',
  };
  base.edges[3].witness = "incidentDecisionScorecard must be asserted inside its renderer block";
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-3:whole-file-source-assertion"), `whole-file source assertion passed: ${errors.join(",")}`);
});

check("whole-file aliases cannot disguise an anywhere assertion", () => {
  const file = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  const locator = exactLocator(file, "aliasedWholeFileAssertionFixture", 'assert(corpus.includes("approvalDraft"), "aliased whole-file negative fixture");');
  const trust = exactFunctionTrust(file, "function aliasedWholeFileAssertionFixture(source) {");
  assert(review4WholeFileSourceAssertion(rootDir, locator, trust), "whole-file alias bypassed source assertion classification");
});

check("literal objects and fixture files cannot impersonate runtime observations", () => {
  const file = "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs";
  const literal = exactLocator(file, "literalRuntimeReadbackFixture", 'if (observed.evaluation !== "saved") {');
  const literalTrust = exactFunctionTrust(file, "function literalRuntimeReadbackFixture() {");
  assert(review4SelfDeclaredRuntimeReadback(rootDir, literal, literalTrust),
    "local literal object passed as runtime observation");
  const fixture = exactLocator(file, "fixtureFileRuntimeReadbackFixture", 'if (fixture.schema !== "media-server.v390-review4-semantic-reviewed-proofs.v1") {');
  const fixtureTrust = exactFunctionTrust(file, "function fixtureFileRuntimeReadbackFixture() {");
  assert(review4SelfDeclaredRuntimeReadback(rootDir, fixture, fixtureTrust),
    "test fixture file passed as runtime observation");
});

check("approval envelope rejects generator-shaped per-row approval claims", () => {
  const base = structuredClone(candidate.items.find(item => item.status === "source-resolved-candidate"));
  assert(base, "approval envelope negative requires resolved candidate");
  const audit = {
    schema: "media-server.v390-review4-feature-semantic-source-audit.v1",
    sourceRelease: "v3.9.0",
    generationBoundary: {
      inputs: ["separate reviewed proof specs"],
      excludedInputs: ["review.decision", "review.reviewer"],
      candidateIsApproval: false,
    },
    items: [base],
  };
  audit.candidateDigest = review4CandidateDigest(audit.items);
  const approvalsFixture = {
    schema: "media-server.v390-review4-feature-semantic-source-approvals.v1",
    producer: REVIEW4_APPROVAL_PRODUCER,
    candidateGeneratorMayApprove: false,
    candidateDigest: audit.candidateDigest,
    approvals: [{
      id: base.id,
      decision: "approved-source-flow",
      reviewerSource: REVIEW4_APPROVAL_REVIEWER_SOURCE,
      sourceFlowDigest: base.sourceFlowDigest,
      reviewedOn: "2026-07-13",
      reason: `${base.id} ${base.verifier.command} ${base.evidenceToken}`,
    }],
  };
  const baseRow = rows.find(row => row.id === base.id);
  const errors = validateReview4ApprovalEnvelope({ audit, approvals: approvalsFixture, orderedIds: [base.id], rows: [baseRow] });
  assert(errors.some(error => error.includes("reason is not independently flow-bound")),
    `generator-shaped approval reason passed envelope: ${errors.join(",")}`);
});

check("same-route proof row swap cannot bypass strong outcome binding", () => {
  const first = candidate.items.find(item => item.id === "UI-061" && item.status === "source-resolved-candidate");
  const second = candidate.items.find(item => item.id === "UI-062" && item.status === "source-resolved-candidate");
  assert(first && second, "outcome row-swap regression requires UI-061 and UI-062");
  assert(first.semanticObligation.clauses.find(clause => clause.kind === "outcome")?.minimumExactMatches === 1,
    "UI-061 strong outcome unexpectedly has zero minimum matches");
  const swap = structuredClone(first);
  swap.evidenceToken = second.evidenceToken;
  swap.verifier = structuredClone(second.verifier);
  swap.roles = structuredClone(second.roles);
  swap.edges = structuredClone(second.edges);
  swap.trustBindings = structuredClone(second.trustBindings);
  const errors = validateReview4SemanticProof({ item: swap, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("obligation-outcome-token-unbound"), `same-route outcome swap passed: ${errors.join(",")}`);
});

check("mixed positive UI keeps allow outcome and binds explicit negative boundaries", () => {
  const base = candidate.items.find(item => item.id === "UI-056" && item.status === "source-resolved-candidate");
  assert(base, "mixed positive/negative regression requires UI-056");
  assert(base.requirement.expectation === "allow", `UI-056 primary positive outcome changed to ${base.requirement.expectation}`);
  assert((base.semanticObligation.negativeBoundaries || []).some(boundary => boundary.kind === "no-write"),
    "UI-056 no-write boundary was not extracted");
  assert((base.semanticObligation.negativeBoundaries || []).some(boundary => boundary.kind === "no-auto-apply"),
    "UI-056 no-auto-apply boundary was not extracted");
  const positiveErrors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(!positiveErrors.some(error => error.startsWith("negative-boundary-")),
    `UI-056 explicit negative oracle rejected: ${positiveErrors.join(",")}`);
  const positiveOnly = structuredClone(base);
  positiveOnly.roles.state.anchor = "approvalDraft is rendered for operator review";
  positiveOnly.roles.readback.anchor = 'assertIncludes(block, "approvalDraft", "positive-only fixture");';
  positiveOnly.roles.owner.anchor = "unrelated owner note: registryWritePerformed=false and autoRuleApplied=false";
  positiveOnly.trustBindings.roles.state.enclosingBodyStartLine = positiveOnly.roles.state.line;
  positiveOnly.trustBindings.roles.state.enclosingBodyEndLine = positiveOnly.roles.state.line;
  positiveOnly.trustBindings.roles.readback.enclosingBodyStartLine = positiveOnly.roles.readback.line;
  positiveOnly.trustBindings.roles.readback.enclosingBodyEndLine = positiveOnly.roles.readback.line;
  const errors = validateReview4SemanticProof({ item: positiveOnly, dispatchIndex: dispatch, rootDir });
  assert(errors.some(error => error.startsWith("negative-boundary-")),
    `positive-only UI-056 proof passed via distant owner negative token: ${errors.join(",")}`);
});

check("negative boundary words in assertion messages cannot satisfy the condition oracle", () => {
  const messageOnly = 'assert(true, "debug material and provider call remain false");';
  assert(!review4ExplicitNegativeBoundaryEvidence(messageOnly, { kind: "debug-redaction", tokens: ["debug", "Debug"] }),
    "debug message text passed as a condition oracle");
  assert(!review4ExplicitNegativeBoundaryEvidence(messageOnly, { kind: "provider-boundary", tokens: ["providerCall", "provider"] }),
    "provider message text passed as a condition oracle");
  assert(review4ExplicitNegativeBoundaryEvidence("assert(debugMaterialExposed === false);", { kind: "debug-redaction", tokens: ["debug", "Debug"] }),
    "explicit debug false condition was not recognized");
  assert(review4ExplicitProductNegativeBoundaryEvidence(
    "`saved=${boundaries.savedViewWritePerformed === false ? 'false' : 'unexpected'}`;",
    { kind: "no-write", tokens: ["write", "WritePerformed", "registryWrite"] }),
  "product template comparison was not recognized as an executable negative boundary");
  assert(!review4ExplicitProductNegativeBoundaryEvidence(
    "const savedViewWritePerformed = false;\n`saved=${savedViewWritePerformed === false ? 'false' : 'unexpected'}`;",
    { kind: "no-write", tokens: ["write", "WritePerformed", "registryWrite"] }),
  "locally declared false flag passed as independent product negative evidence");
  assert(!review4ExplicitProductNegativeBoundaryEvidence(
    'const note = "savedViewWritePerformed === false";',
    { kind: "no-write", tokens: ["write", "WritePerformed", "registryWrite"] }),
  "quoted product message passed as an executable negative boundary");
});

check("negative boundaries do not cross unrelated positive save clauses", () => {
  const positiveSaveThenHidden = buildReview4SemanticObligation({
    id: "UI-998",
    feature: "review state",
    pass: "operator note를 review state에 저장하고 client/viewer에는 노출하지 않음",
  });
  assert(!(positiveSaveThenHidden.negativeBoundaries || []).some(boundary => boundary.kind === "no-write"),
    "positive save was misclassified as no-write");
  assert((positiveSaveThenHidden.negativeBoundaries || []).some(boundary => boundary.kind === "client-viewer-boundary"),
    "client/viewer boundary was lost after clause separation");

  const actualNoWrite = buildReview4SemanticObligation({
    id: "UI-999",
    feature: "dry-run selection",
    pass: "dry-run 후보를 표시되고 자동 설치/호출/저장 action은 발생하지 않음",
  });
  assert((actualNoWrite.negativeBoundaries || []).some(boundary => boundary.kind === "no-write"),
    "same-clause no-write boundary was not extracted");

  const falsePositiveClassification = buildReview4SemanticObligation({
    id: "EVT-998",
    feature: "review classification",
    pass: "status/classification/note/false-positive action target 저장과 audit 반영",
  });
  assert(!(falsePositiveClassification.negativeBoundaries || []).some(boundary => boundary.kind === "no-write"),
    "false-positive classification was misclassified as no-write");
});

check("same negative condition with different messages is shared ambiguity", () => {
  const base = candidate.items.find(item => item.status === "source-resolved-candidate" &&
    (item.semanticObligation?.negativeBoundaries || []).length > 0 &&
    item.roles?.readback?.anchor);
  assert(base, "shared negative condition regression requires a resolved negative candidate");
  const first = structuredClone(base);
  const second = structuredClone(base);
  first.id = "NEGATIVE-FIXTURE-001";
  second.id = "NEGATIVE-FIXTURE-002";
  first.status = "source-resolved-candidate";
  first.sourceFlowDigest = "shared-negative-fixture-1";
  first.sharedContract = { id: "media-server.actual-contract.negative-fixture", facet: "ops-gate" };
  second.status = "source-resolved-candidate";
  second.sourceFlowDigest = "shared-negative-fixture-2";
  second.sharedContract = { id: "media-server.actual-contract.negative-fixture", facet: "safety-invariant" };
  const errors = validateReview4SharedFlows([first, second]);
  assert(errors.some(error => error.reason === "shared-negative-condition-ambiguity"),
    `message-only row split bypassed shared ambiguity: ${JSON.stringify(errors)}`);
});

check("outcome obligation cardinality is possible and stale ledger requires regeneration", () => {
  const obligated = candidate.items.filter(item => item.semanticObligation);
  assert(obligated.length > 0, "fresh candidate obligations missing");
  assert(obligated.every(item => item.semanticObligation.policyVersion === REVIEW4_OBLIGATION_POLICY),
    "fresh candidate obligation policy version drift");
  assert(obligated.every(item => {
    const clause = item.semanticObligation.clauses?.find(candidateClause => candidateClause.kind === "outcome");
    return clause && ((clause.tokens || []).length > 0 ? clause.minimumExactMatches >= 1 : clause.minimumExactMatches === 0);
  }), "fresh candidate contains impossible empty-outcome minimum");
  assert(obligated.every(item => item.semanticObligation.requiredOutcome?.normalized &&
    item.semanticObligation.requiredOutcome.sha256 === sha256(item.semanticObligation.requiredOutcome.normalized)),
  "fresh candidate requiredOutcome integrity drift");
  const staleStoredItems = (stored.items || []).filter(item => item.status === "source-resolved-candidate" &&
    item.semanticObligation?.policyVersion !== REVIEW4_OBLIGATION_POLICY ||
    item.status === "source-resolved-candidate" && !item.semanticObligation?.requiredOutcome?.normalized);
  assert(staleStoredItems.length === 0 || stored.candidateDigest !== candidate.candidateDigest,
    "stale stored obligation did not force candidate digest regeneration");
});

check("self-declared reports and fixture-derived outcomes are not product runtime readbacks", () => {
  for (const [id, expectedSourceEdgeKind, file, symbol, anchor] of [
    ["SAFE-032", "runtime-readback", "scripts/internal/verify_vlm_queue_backpressure_stability.mjs", "fixture-derived-queue-outcome", 'assert(timeout?.queueAction === "drop-vlm-task", "timeout must drop VLM task only");'],
    ["SAFE-040", "structural-producer-assertion", "scripts/internal/verify_runtime_model_bundle_rc_rehearsal.mjs", "self-declared-bundle-report", 'assert(item.releaseAssetUploaded === false, `${item.id}: modelArtifactDownloaded/source-only release asset upload must remain absent`);'],
  ]) {
    const item = structuredClone(candidate.items.find(candidateItem => candidateItem.id === id));
    assert(item, `self-declared runtime regression missing ${id}`);
    const sourceEdgeKind = item.edges?.[3]?.kind || item.edges?.[3]?.proof;
    assert(sourceEdgeKind === expectedSourceEdgeKind,
      `${id} source edge kind drift: ${sourceEdgeKind}`);
    item.roles.readback = exactLocator(file, symbol, anchor);
    item.edges[3] = {
      ...item.edges[3],
      kind: "runtime-readback",
      witness: `${id} negative fixture deliberately attempts to promote a self-declared/fixture-derived outcome to runtime readback`,
    };
    delete item.edges[3].proof;
    for (const edge of item.edges) { delete edge.source; delete edge.target; }
    item.trustBindings = buildReview4TrustBindings(rootDir, item, dispatch);
    const errors = validateReview4SemanticProof({ item, dispatchIndex: dispatch, rootDir });
    assert(errors.includes("edge-3:runtime-readback-self-declared"),
      `${id} self-declared/fixture readback passed: ${errors.join(",")}`);
  }
});

check("auth wrapper fixed mode reaches only its selected workflow oracle", () => {
  const routesPositive = candidate.items.find(item => item.id === "UI-001" && item.status === "source-resolved-candidate");
  assert(routesPositive, "auth fixed-mode regression requires UI-001 routes helper");
  const routesPositiveErrors = validateReview4SemanticProof({ item: routesPositive, dispatchIndex: dispatch, rootDir });
  assert(!routesPositiveErrors.includes("edge-4:verifier-fixed-mode-readback-unreachable"),
    `verify-auth-routes failed to reach UI-001 login_admin helper: ${routesPositiveErrors.join(",")}`);
  const users = candidate.items.find(item => item.id === "UI-008" && item.roles?.readback && item.trustBindings);
  assert(users, "auth fixed-mode regression requires UI-008");
  const usersErrors = validateReview4SemanticProof({ item: users, dispatchIndex: dispatch, rootDir });
  assert(!usersErrors.includes("edge-4:verifier-fixed-mode-readback-unreachable"),
    `verify-auth-users failed to reach UI-008 helper: ${usersErrors.join(",")}`);
  const routes = structuredClone(users);
  routes.verifier = { command: "verify-auth-routes", file: "scripts/internal/verify_auth_routes.sh" };
  routes.roles.verifier = exactLocator("server.sh", "server-dispatch:verify-auth-routes", "verify-auth-routes)");
  routes.edges[4].witness = "verify-auth-routes";
  for (const edge of routes.edges) { delete edge.source; delete edge.target; }
  const routeErrors = validateReview4SemanticProof({ item: routes, dispatchIndex: dispatch, rootDir });
  assert(routeErrors.includes("edge-4:verifier-fixed-mode-readback-unreachable"),
    `routes wrapper claimed users-only oracle: ${routeErrors.join(",")}`);
});
check("multiline destructured arrow brace resolves the real enclosing function body", () => {
  const base = structuredClone(candidate.items.find(item => item.id === "UI-081" && item.status === "source-resolved-candidate"));
  assert(base, "multiline destructured arrow regression requires resolved UI-081");
  const ownerTrust = base.trustBindings.roles.owner;
  assert(ownerTrust.enclosingBodyStartLine === base.roles.owner.line, "multiline arrow function start drift");
  assert(ownerTrust.enclosingBodyEndLine >= base.roles.dispatch.line, "multiline arrow selected a destructuring brace instead of function body");
  const truncated = structuredClone(base);
  truncated.trustBindings.roles.owner.enclosingBodyEndLine = truncated.roles.owner.line;
  const errors = validateReview4SemanticProof({ item: truncated, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("edge-0:containment-unproven"), `truncated multiline arrow body passed containment: ${errors.join(",")}`);
});
check("positive oracle cannot approve deny or redact obligation", () => {
  const base = structuredClone(candidate.items.find(item => ["deny", "redact", "invariant"].includes(item.semanticObligation?.requirement?.expectation)));
  assert(base, "negative oracle fixture requires deny/redact candidate");
  base.roles.state.anchor = "operationAllowed = true;";
  base.roles.readback.anchor = "assertEqual(observedStatus, true);";
  base.edges[3] = { from: "state", to: "readback", kind: "runtime-readback", witness: base.evidenceToken || "allowed" };
  const errors = validateReview4SemanticProof({ item: base, dispatchIndex: dispatch, rootDir });
  assert(errors.includes("negative-explicit-reject-redact-absence-oracle-missing"), `positive oracle approved negative row: ${errors.join(",")}`);
});
check("token or adjacent-line changes cannot bypass canonical shared flow detection", () => {
  const base = structuredClone(candidate.items.find(item => item.trustBindings?.roles?.owner && item.trustBindings?.roles?.readback));
  assert(base, "shared flow negative requires candidate");
  base.status = "source-resolved-candidate";
  base.sharedContract = null;
  const adjacent = structuredClone(base);
  adjacent.id = `${base.id}-ADJACENT`;
  adjacent.evidenceToken = `${base.evidenceToken}-adjacent-token`;
  adjacent.roles.state.line += 1;
  adjacent.roles.readback.line += 1;
  const errors = validateReview4SharedFlows([base, adjacent]);
  assert(errors.some(error => error.reason === "ambiguous-shared-contract-facet"), "token/adjacent line bypassed shared flow detection");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
  catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
}
console.log("");
console.log("== V390 REVIEW4 feature semantic source audit ==");
console.log(`- rows: ${candidate.items.length}`);
console.log(`- resolvedCandidates: ${candidate.summary.resolvedCandidates}`);
console.log(`- discoveredCandidates: ${candidate.summary.discoveredCandidates}`);
console.log(`- unresolvedCandidates: ${candidate.summary.unresolvedCandidates}`);
console.log(`- resolvedIds: ${candidate.items.filter(item => item.status === "source-resolved-candidate").map(item => item.id).join(",") || "none"}`);
console.log(`- familyStatus: ${familyStatus(candidate.items)}`);
console.log(`- unresolvedReasons: ${countLabels(candidate.items.filter(item => item.status !== "source-resolved-candidate").map(item => item.failureReason || "unknown"), 12)}`);
console.log(`- typedSemanticErrors: ${countLabels(candidate.items.flatMap(item => item.typedSemanticErrors || []), 16)}`);
console.log(`- reviewedProofErrors: ${countLabels(candidate.items.flatMap(item => item.reviewedProofErrors || []), 12)}`);
console.log(`- approvals: ${Array.isArray(approvals?.approvals) ? approvals.approvals.length : 0}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);
if (rawArgs.includes("--apply-approved-manifest")) {
  const next = applyApprovedReview4SemanticClosure({
    rootDir,
    inventoryText: inventory,
    rows,
    manifest: loadImplementationManifest(rootDir),
    audit: candidate,
    approvals,
  });
  writeImplementationManifest(rootDir, next);
  console.log("[pass] applied independently approved REVIEW4 source flows to canonical implementation manifest");
}

function buildCandidate({ manifest: sourceManifest, rows: sourceRows, production: sourceIndex, dispatch: commandDispatch, reviewedProofs: proofMap }) {
  const manifestById = new Map(sourceManifest.items.map(item => [item.id, item]));
  const proofItems = sourceRows.map(row => {
    const proof = proofMap.get(row.id);
    if (proof) return candidateFromReviewedProof(row, proof, sourceIndex, commandDispatch);
    return resolveItem(row, manifestById.get(row.id), sourceIndex, commandDispatch);
  });
  const initialItems = proofItems.map(item => {
    if (item.status !== "source-resolved-candidate") return item;
    const semanticErrors = validateReview4SemanticProof({ item, dispatchIndex: commandDispatch, rootDir });
    if (semanticErrors.length === 0) return item;
    return {
      ...item,
      status: "unresolved",
      failureReason: `typed-semantic-proof-invalid:${semanticErrors.join(",")}`,
      typedSemanticErrors: semanticErrors,
      sourceFlowDigest: null,
    };
  });
  const rawGroups = new Map();
  for (const item of initialItems.filter(value => value.status === "source-resolved-candidate")) {
    const key = baseFacetKey(item);
    const group = rawGroups.get(key) || [];
    group.push(item);
    rawGroups.set(key, group);
  }
  const validSharedKeys = new Set();
  for (const [key, group] of rawGroups) {
    if (group.length <= 1) { validSharedKeys.add(key); continue; }
    const ids = new Set(group.map(item => item.sharedContract?.id).filter(Boolean));
    const facets = new Set(group.map(item => item.sharedContract?.facet).filter(Boolean));
    if (ids.size === 1 && facets.size === group.length && group.every(item => item.sharedContract?.id && item.sharedContract?.facet)) {
      validSharedKeys.add(key);
    }
  }
  const usedFacets = new Map();
  let items = initialItems.map(item => {
    if (item.status !== "source-resolved-candidate") return item;
    if (!validSharedKeys.has(baseFacetKey(item))) {
      const owners = (rawGroups.get(baseFacetKey(item)) || []).map(value => value.id).filter(id => id !== item.id);
      return { ...item, status: "unresolved", failureReason: "ambiguous-shared-contract-facet", sharedCandidateIds: owners, sourceFlowDigest: null };
    }
    const candidates = [{ evidenceToken: item.evidenceToken, roles: item.roles, edges: item.edges }, ...(item.alternativeCandidates || [])];
    const selected = candidates.find(value => {
      const key = facetKey({ ...value, sharedContract: item.sharedContract });
      return !usedFacets.has(key);
    });
    if (!selected) {
      const conflicts = [...new Set(candidates.map(value => usedFacets.get(facetKey({ ...value, sharedContract: item.sharedContract }))).filter(Boolean))];
      return { ...item, status: "unresolved", failureReason: "ambiguous-shared-contract-facet", sharedCandidateIds: conflicts, sourceFlowDigest: null, alternativeCandidates: undefined };
    }
    usedFacets.set(facetKey({ ...selected, sharedContract: item.sharedContract }), item.id);
    const resolved = { ...item, evidenceToken: selected.evidenceToken, roles: selected.roles, edges: selected.edges, alternativeCandidates: undefined };
    try {
      resolved.trustBindings = buildReview4TrustBindings(rootDir, resolved, commandDispatch);
      resolved.sourceFlowDigest = sourceFlowDigest(resolved);
    } catch (error) {
      return { ...resolved, status: "unresolved", failureReason: `trust-binding-invalid:${error instanceof Error ? error.message : String(error)}`, sourceFlowDigest: null };
    }
    return resolved;
  });
  const sharedErrors = validateReview4SharedFlows(items);
  if (sharedErrors.length > 0) {
    const sharedById = new Map(sharedErrors.flatMap(error => error.ids.map(id => [id, error])));
    items = items.map(item => sharedById.has(item.id)
      ? { ...item, status: "unresolved", failureReason: sharedById.get(item.id).reason, sharedCandidateIds: sharedById.get(item.id).ids.filter(id => id !== item.id), sourceFlowDigest: null }
      : item);
  }
  const result = {
    schema: "media-server.v390-review4-feature-semantic-source-audit.v1",
    sourceRelease: "v3.9.0",
    generationBoundary: structuredClone(REVIEW4_GENERATION_BOUNDARY),
    summary: {
      rows: items.length,
      resolvedCandidates: items.filter(item => item.status === "source-resolved-candidate").length,
      discoveredCandidates: items.filter(item => item.status === "source-discovered-candidate").length,
      unresolvedCandidates: items.filter(item => item.status !== "source-resolved-candidate").length,
      fileScopeRoles: items.reduce((sum, item) => sum + Object.values(item.roles || {}).filter(role => String(role.symbol).startsWith("file-scope:")).length, 0),
    },
    items,
  };
  result.candidateDigest = review4CandidateDigest(result.items);
  return result;
}

function loadReviewedProofs() {
  const byId = new Map();
  for (const file of reviewedProofPaths) {
    const absolute = path.join(rootDir, file);
    if (!fs.existsSync(absolute)) continue;
    const payload = readJson(file);
    assert(new Set([
      "media-server.v390-review4-semantic-reviewed-proofs.v1",
      "media-server.v390-review4-semantic-proof-candidates.v1",
      "media-server.v390-review4-semantic-proofs-safe-ops.v1",
    ]).has(payload.schema), `${file} proof schema drift`);
    assert(payload.sourceRelease === "v3.9.0", `${file} proof release drift`);
    assert(payload.generationBoundary?.candidateOnly === true || payload.candidateOnly === true, `${file} proof candidate boundary missing`);
    const strongBoundary = payload.generationBoundary?.sharedStringOrLineOrderAloneIsProof === false ||
      (payload.generationBoundary?.sameFileOrLineOrderIsProof === false && payload.generationBoundary?.sharedStringOrIdMentionIsProof === false) ||
      ["same-file-only", "line-order-only", "shared-string-only"].every(value => (payload.proofPolicy?.forbiddenProofs || []).includes(value));
    assert(strongBoundary, `${file} weak proof boundary missing`);
    const excludedInputs = payload.generationBoundary?.excludedInputs || payload.proofPolicy?.excludedInputs || [];
    assert(excludedInputs.some(value => String(value).includes("REVIEW3")), `${file} REVIEW3 exclusion missing`);
    assert(!Object.hasOwn(payload, "approvals"), `${file} must not contain approvals`);
    for (const item of payload.items || []) {
      assert(!Object.hasOwn(item, "decision") && !Object.hasOwn(item, "reviewer") && !Object.hasOwn(item, "approval"), `${item.id} proof spec contains approval state`);
      assert(!byId.has(item.id), `duplicate reviewed proof ${item.id}`);
      byId.set(item.id, { ...item, proofFile: file });
    }
  }
  const expectedIds = new Set(rows.map(row => row.id));
  assert(byId.size === rows.length, `reviewed proof specs must cover exact ${rows.length} rows; got ${byId.size}`);
  for (const id of byId.keys()) assert(expectedIds.has(id), `reviewed proof specs contain unknown ID ${id}`);
  return byId;
}

function candidateFromReviewedProof(row, proof, sourceIndex, commandDispatch) {
  if (proof.status === "unresolved") {
    return unresolved(row, proof.verifier || {}, proof.failureReason || "reviewed-proof-unresolved", {
      reviewedProofFile: proof.proofFile,
    });
  }
  const authoredEdgeErrors = validateAuthoredEdgeFields(proof);
  if (authoredEdgeErrors.length > 0) {
    return unresolved(row, proof.verifier || {}, "reviewed-proof-invalid", {
      reviewedProofFile: proof.proofFile,
      reviewedProofErrors: authoredEdgeErrors,
    });
  }
  const normalizedProof = normalizeProofLocators(proof);
  const errors = validateReviewedProof(row, normalizedProof, sourceIndex, commandDispatch);
  if (errors.length > 0) {
    return unresolved(row, proof.verifier || {}, "reviewed-proof-invalid", {
      reviewedProofFile: proof.proofFile,
      reviewedProofErrors: errors,
    });
  }
  const item = {
    id: row.id,
    featureContractSha256: sha256(`${row.feature}\n${row.pass}`),
    flowKind: flowKind(row),
    requirement: classifyFeatureRequirement(row),
    status: "source-resolved-candidate",
    failureReason: "",
    verifier: normalizedProof.verifier,
    evidenceMode: normalizedProof.evidenceMode,
    evidenceToken: normalizedProof.evidenceToken,
    sharedContract: normalizedProof.sharedContract || null,
    proofSource: { kind: "separate-reviewed-proof-spec", file: proof.proofFile },
    roles: normalizedProof.roles,
    edges: normalizedProof.edges,
    semanticObligation: semanticObligation(row),
    sourceFlowDigest: "",
  };
  try {
    item.trustBindings = buildReview4TrustBindings(rootDir, item, commandDispatch);
    item.sourceFlowDigest = sourceFlowDigest(item);
  } catch (error) {
    return unresolved(row, proof.verifier || {}, `trust-binding-invalid:${error instanceof Error ? error.message : String(error)}`, {
      reviewedProofFile: proof.proofFile,
    });
  }
  return item;
}

function validateAuthoredEdgeFields(proof) {
  const errors = [];
  for (const [index, edge] of (proof.edges || []).entries()) {
    const from = proof.roles?.[edge.from];
    const to = proof.roles?.[edge.to];
    for (const [field, role] of [["source", from], ["target", to]]) {
      const value = edge?.[field];
      if (!value) continue;
      if (String(value).includes("->")) {
        errors.push(`edge-${index}:${field}-range-rejected`);
        continue;
      }
      const expected = role ? `${role.file}:${role.line}` : "";
      if (!expected || value !== expected) errors.push(`edge-${index}:${field}-locator-unbound-before-normalize`);
    }
    errors.push(...proofNarrativeErrors(edge?.witness).map(error => `edge-${index}:${error}`));
  }
  return errors;
}

function proofNarrativeErrors(witness) {
  const text = String(witness || "");
  const errors = [];
  if (text.length > 512) errors.push("witness-too-long");
  if (/\|\s*(?:UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d{3}\s*\|/.test(text)) errors.push("inventory-row-in-witness-rejected");
  if (/production state\s*->\s*verifier literal line/i.test(text)) errors.push("synthetic-literal-assertion-narrative-rejected");
  return errors;
}

function normalizeProofLocators(proof) {
  const copy = structuredClone(proof);
  for (const [name, role] of Object.entries(copy.roles || {})) {
    if (!role?.file || !role?.anchor) continue;
    const absolute = path.join(rootDir, role.file);
    if (!fs.existsSync(absolute)) continue;
    const lines = readText(role.file).split(/\r?\n/);
    const matches = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].trim() !== String(role.anchor).trim()) continue;
      if (contextHash(lines, index + 1) === role.contextSha256) matches.push(index + 1);
    }
    if (matches.length === 1) {
      copy.roles[name].line = matches[0];
    }
  }
  copy.edges = (copy.edges || []).map(edge => ({
    ...edge,
    source: copy.roles?.[edge.from] ? `${copy.roles[edge.from].file}:${copy.roles[edge.from].line}` : edge.source,
    target: copy.roles?.[edge.to] ? `${copy.roles[edge.to].file}:${copy.roles[edge.to].line}` : edge.target,
  }));
  return copy;
}

function validateReviewedProof(row, proof, sourceIndex, commandDispatch) {
  const errors = [];
  if (proof.status !== "source-resolved-reviewed-proof") errors.push("reviewed-proof-status-drift");
  if (proof.featureContractSha256 !== sha256(`${row.feature}\n${row.pass}`)) errors.push("feature-contract-digest-drift");
  if (!proof.evidenceMode || !proof.evidenceToken) errors.push("evidence-mode-or-token-missing");
  if (/^(?:block|snippet|status|result|response|state|route|source|current|actual|reliability|ops-only|read-only|not-run)$/i.test(String(proof.evidenceToken))) errors.push("generic-evidence-token");
  if (proof.sharedContract &&
      (!/^media-server\.actual-contract\.[A-Za-z0-9_.:-]+$/.test(String(proof.sharedContract.id)) ||
       !["ops-gate", "safety-invariant"].includes(proof.sharedContract.facet))) {
    errors.push("shared-contract-metadata-invalid");
  }
  if (!proof.verifier?.command || !proof.verifier?.file || !verifierDispatchValid(proof.verifier, commandDispatch)) errors.push("independent-verifier-dispatch-missing");
  const roleNames = ["owner", "dispatch", "action", "state", "readback", "verifier"];
  for (const roleName of roleNames) {
    const role = proof.roles?.[roleName];
    if (!role || !role.file || !role.anchor || !role.line || !role.contextSha256) {
      errors.push(`${roleName}:locator-incomplete`);
      continue;
    }
    const entry = sourceIndex.entries.find(item => item.file === role.file);
    const text = fs.existsSync(path.join(rootDir, role.file)) ? readText(role.file) : "";
    const lines = text.split(/\r?\n/);
    if (!text.includes(role.anchor)) errors.push(`${roleName}:anchor-missing`);
    if ((lines[role.line - 1] || "").trim() !== role.anchor.trim()) errors.push(`${roleName}:line-drift`);
    if (contextHash(lines, role.line) !== role.contextSha256) errors.push(`${roleName}:context-drift`);
    if (roleName !== "readback" && roleName !== "verifier" && !entry) errors.push(`${roleName}:untracked-source-owner`);
  }
  if (proof.roles?.verifier?.file !== "server.sh" || !String(proof.roles?.verifier?.anchor || "").includes(proof.verifier?.command || "__missing__")) {
    errors.push("verifier-role-is-not-server-dispatch");
  }
  const expectedPairs = [["owner", "dispatch"], ["dispatch", "action"], ["action", "state"], ["state", "readback"], ["readback", "verifier"]];
  if (!Array.isArray(proof.edges) || proof.edges.length !== 5) errors.push("edge-count-drift");
  else expectedPairs.forEach(([from, to], index) => {
    const edge = proof.edges[index];
    if (edge.from !== from || edge.to !== to) errors.push(`edge-${index}:sequence-drift`);
    errors.push(...validateProofEdge(edge, proof.roles, proof.evidenceToken, sourceIndex, commandDispatch).map(error => `edge-${index}:${error}`));
  });
  if (proof.roles?.action && proof.roles?.state && sameSourcePoint(proof.roles.action, proof.roles.state)) errors.push("action-state-self-comparison");
  return errors;
}

function validateProofEdge(edge, roles, evidenceToken, sourceIndex, commandDispatch) {
  const errors = [];
  const from = roles?.[edge.from];
  const to = roles?.[edge.to];
  const kind = edge.kind || edge.proof;
  const allowed = new Set(["callsite", "direct-callsite", "branch-containment", "function-containment", "argument-def-use", "return-def-use", "assignment-def-use", "co-asserted-boundary", "event-binding", "structural-producer-assertion", "runtime-readback", "verifier-dispatch"]);
  if (!allowed.has(kind)) errors.push("unsupported-proof-kind");
  if (!edge.witness) errors.push("witness-missing");
  if (kind === "callsite" || kind === "direct-callsite") {
    const symbol = String(to?.symbol || "__missing__");
    const bare = symbol.split("::").pop();
    if (!String(from?.anchor).includes(bare)) errors.push("callsite-symbol-unbound");
  }
  if ((kind === "branch-containment" || kind === "function-containment")) {
    if (!locatorContains(from, to, sourceIndex)) errors.push("containment-unproven");
  }
  if (kind === "structural-producer-assertion" || kind === "runtime-readback") {
    if (!evidenceTokenBound(evidenceToken, from, to, kind)) errors.push("readback-token-unbound");
    const anchor = String(to?.anchor || "");
    if (kind === "structural-producer-assertion" && !isVerifierAssertionLine(anchor)) errors.push("readback-is-not-assertion");
    if (kind === "runtime-readback" && !(isVerifierAssertionLine(anchor) || /^if\s*\(/.test(anchor) || /(?:===|!==|<=|>=|<|>)/.test(anchor))) errors.push("readback-is-not-runtime-oracle");
  }
  if (kind === "verifier-dispatch") {
    if (!commandDispatch.commandToFile.has(edge.witness)) errors.push("verifier-command-unbound");
    if (roles.verifier.file !== "server.sh" || !String(roles.verifier.anchor).includes(edge.witness)) errors.push("verifier-dispatch-locator-unbound");
  }
  return errors;
}

function evidenceTokenBound(evidenceToken, from, to, kind) {
  const state = String(from?.anchor || "");
  const observed = kind === "structural-producer-assertion"
    ? String(to?.anchor || "")
    : `${String(to?.anchor || "")} ${rawAssertionBranchText(to)}`;
  if (state.includes(evidenceToken) && observed.includes(evidenceToken)) return true;
  const tokens = [...new Set(String(evidenceToken).match(/[A-Za-z_][A-Za-z0-9_]{4,}|\/[A-Za-z0-9_?&=/{}/.-]+/g) || [])]
    .filter(token => !/^(?:runtime|readback|request|response|status|state|false|true|http|assertion)$/i.test(token));
  return tokens.some(token => state.includes(token) && observed.includes(token));
}

function rawAssertionBranchText(role) {
  if (!role?.file || !Number.isInteger(role.line) || !fs.existsSync(path.join(rootDir, role.file))) return "";
  const lines = readText(role.file).split(/\r?\n/);
  const assertionIndex = role.line - 1;
  const anchor = String(role.anchor || "");
  for (let index = assertionIndex; index >= Math.max(0, assertionIndex - 120); index -= 1) {
    const match = lines[index].match(/\bfor\s*\(\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+of\s*\[/);
    if (!match || !new RegExp(`\\b${escapeRegExp(match[1])}\\b`).test(anchor)) continue;
    for (let probe = index; probe <= Math.min(assertionIndex, index + 120); probe += 1) {
      if (!/\]\s*\)\s*\{\s*$/.test(lines[probe])) continue;
      const column = lines[probe].lastIndexOf("{");
      if (matchingBraceLine(lines, probe + 1, column) >= role.line) {
        return lines.slice(index, assertionIndex + 1).join("\n");
      }
      break;
    }
  }
  return lines.slice(Math.max(0, assertionIndex - 2), Math.min(lines.length, assertionIndex + 3)).join("\n");
}

function locatorContains(from, to, sourceIndex) {
  if (!from || !to || from.file !== to.file || from.line >= to.line) return false;
  const entry = sourceIndex.entries.find(item => item.file === from.file);
  if (!entry) return false;
  const indexed = entry.symbols.find(item => item.symbol === from.symbol && item.line <= from.line && item.endLine >= to.line);
  if (indexed) return true;
  for (let probe = from.line; probe <= Math.min(entry.lines.length, from.line + 16); probe += 1) {
    const match = entry.lines[probe - 1].match(/=>\s*\{/);
    if (!match) continue;
    const column = entry.lines[probe - 1].indexOf("{", match.index);
    return matchingBraceLine(entry.lines, probe, column) >= to.line;
  }
  for (let probe = from.line; probe <= Math.min(entry.lines.length, from.line + 8); probe += 1) {
    const column = entry.lines[probe - 1].lastIndexOf("{");
    if (column < 0) continue;
    return matchingBraceLine(entry.lines, probe, column) >= to.line;
  }
  return false;
}

function resolveItem(row, legacy, sourceIndex, commandDispatch) {
  const candidates = verifierCandidates(row, legacy, commandDispatch, sourceIndex);
  if (candidates.length === 0) return unresolved(row, {}, "verifier-source-candidate-missing");
  const selected = candidates[0];
  const resolved = resolveSourceRoles(row, legacy, selected, sourceIndex);
  if (!resolved.ok) {
    return unresolved(row, selected.verifier, resolved.reason, {
      candidateVerifierCount: candidates.length,
      selectedVerifierBasis: selected.basis,
      discoveryTokens: selected.tokens.slice(0, 24).map(item => ({ token: item.token, owners: item.owners })),
    });
  }
  const item = {
    id: row.id,
    featureContractSha256: sha256(`${row.feature}\n${row.pass}`),
    flowKind: flowKind(row),
    requirement: classifyFeatureRequirement(row),
    status: "source-discovered-candidate",
    discoveryOnly: true,
    failureReason: "",
    verifier: selected.verifier,
    candidateVerifierCount: candidates.length,
    selectedVerifierBasis: selected.basis,
    evidenceToken: resolved.evidenceToken,
    roles: resolved.roles,
    edges: resolved.edges,
    semanticObligation: semanticObligation(row),
    alternativeCandidates: resolved.alternatives || [],
    sourceFlowDigest: "",
  };
  try {
    item.trustBindings = buildReview4TrustBindings(rootDir, item, commandDispatch);
    item.sourceFlowDigest = sourceFlowDigest(item);
  } catch (error) {
    return unresolved(row, selected.verifier, `trust-binding-invalid:${error instanceof Error ? error.message : String(error)}`);
  }
  return item;
}

function unresolved(row, verifier, failureReason, extra = {}) {
  return {
    id: row.id,
    featureContractSha256: sha256(`${row.feature}\n${row.pass}`),
    flowKind: flowKind(row),
    requirement: classifyFeatureRequirement(row),
    status: "unresolved",
    failureReason,
    verifier,
    roles: {},
    edges: [],
    sourceFlowDigest: null,
    ...extra,
  };
}

function verifierProductionTokens(verifierText, sourceIndex, verifierFile) {
  const literals = [];
  for (const expression of [/"([^"\n]{4,220})"/g, /'([^'\n]{4,220})'/g, /`([^`\n]{4,220})`/g]) {
    for (const match of verifierText.matchAll(expression)) {
      const value = match[1].trim();
      if (/^(?:pass|fail|true|false|missing|expected|actual)$/i.test(value)) continue;
      if (/\$\{|\\[nrt]|^[^\p{L}\p{N}/#_-]+$/u.test(value)) continue;
      literals.push(value);
    }
  }
  const unique = [...new Set(literals)];
  return unique.flatMap(token => {
    if (!strongSourceToken(token)) return [];
    const owners = sourceIndex.tokenOwners(token, new Set([verifierFile]));
    if (owners.length === 0 || owners.length > 12) return [];
    const assertionStrength = verifierText.split(/\r?\n/)
      .filter(line => line.includes(token) && isVerifierAssertionLine(line.trim()))
      .reduce((maximum, line) => Math.max(maximum, /\b(?:assert|assertOk|assertIncludes|assertEqual|expect)\s*\(/.test(line) ? 120 : 60), 0);
    return [{ token, owners, locators: sourceIndex.resolveToken(token, new Set([verifierFile])), assertionStrength }];
  });
}

function verifierStructuralFacts(verifierFile, sourceIndex) {
  const text = readText(verifierFile);
  const lines = text.split(/\r?\n/);
  const constants = new Map();
  for (const match of text.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*=\s*(["'`])([^\n]*?)\2\s*;/g)) constants.set(match[1], match[3]);
  const sourceFiles = new Map();
  for (const match of text.matchAll(/\b([A-Za-z_]\w*)\s*:\s*readText\(["']([^"']+)["']\)/g)) sourceFiles.set(match[1], match[2]);
  for (const match of text.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*=\s*readText\(["']([^"']+)["']\)/g)) sourceFiles.set(match[1], match[2]);
  const facts = [];
  const blockPattern = /extractBlock\(\s*(?:files\.)?([A-Za-z_]\w*)\s*,\s*([^,\n]+)\s*,\s*([^\)\n]+)\)/g;
  for (const match of text.matchAll(blockPattern)) {
    const sourceFile = sourceFiles.get(match[1]);
    const entry = sourceIndex.entries.find(item => item.file === sourceFile);
    if (!entry) continue;
    const startNeedle = resolveVerifierExpression(match[2], constants);
    const endNeedle = resolveVerifierExpression(match[3], constants);
    if (!startNeedle || !endNeedle) continue;
    const sourceStart = entry.text.indexOf(startNeedle);
    const sourceEnd = sourceStart < 0 ? -1 : entry.text.indexOf(endNeedle, sourceStart + startNeedle.length);
    if (sourceStart < 0 || sourceEnd < 0) continue;
    const checkStart = Math.max(0, text.lastIndexOf("check(", match.index));
    const nextCheck = text.indexOf("\ncheck(", match.index + match[0].length);
    const checkEnd = nextCheck < 0 ? text.length : nextCheck;
    const checkText = text.slice(checkStart, checkEnd);
    const checkName = checkText.match(/^check\(["'`]([^"'`]+)/)?.[1] || "";
    const assertionLine = structuralAssertionLine(checkText, constants);
    if (!assertionLine) continue;
    const candidates = new Set();
    for (const literal of stringLiterals(checkText)) if (strongSourceToken(literal)) candidates.add(literal);
    for (const [name, value] of constants) {
      if (new RegExp(`\\b${escapeRegExp(name)}\\b`).test(checkText) && strongSourceToken(value)) candidates.add(value);
    }
    for (const token of candidates) {
      const stateIndex = entry.text.indexOf(token, sourceStart);
      if (stateIndex < sourceStart || stateIndex >= sourceEnd) continue;
      const stateLine = lineAtEntry(entry, stateIndex);
      const state = sourceLocator(entry, token, stateIndex, stateLine, symbolAt(entry, stateLine));
      const assertionGlobalIndex = checkStart + assertionLine.offset;
      const readbackLine = lineAt(text, assertionGlobalIndex);
      facts.push({
        token,
        checkName,
        startNeedle,
        endNeedle,
        state,
        readback: {
          file: verifierFile,
          symbol: verifierSymbol(lines, readbackLine),
          anchor: assertionLine.line,
          token,
          line: readbackLine,
          contextSha256: contextHash(lines, readbackLine),
          featureBinding: "candidate-unbound",
        },
      });
    }
  }
  for (const segment of verifierCheckSegments(text)) {
    const checkName = segment.text.match(/^check\(["'`]([^"'`]+)/)?.[1] || "";
    for (const assertion of segment.text.matchAll(/assertIncludes\(\s*(?:files\.)?([A-Za-z_]\w*)\s*,\s*([^,\n]+)/g)) {
      const sourceFile = sourceFiles.get(assertion[1]);
      const entry = sourceIndex.entries.find(item => item.file === sourceFile);
      if (!entry || /(?:backlog|stream|inventory|records|server\.sh|coverage|README|docs\/)/i.test(sourceFile)) continue;
      const assertionOffset = segment.start + assertion.index;
      const readbackLine = lineAt(text, assertionOffset);
      const readbackAnchor = (lines[readbackLine - 1] || "").trim();
      const candidates = new Set(stringLiterals(segment.text));
      const direct = resolveVerifierExpression(assertion[2], constants);
      if (direct) candidates.add(direct);
      for (const [name, value] of constants) if (new RegExp(`\\b${escapeRegExp(name)}\\b`).test(segment.text)) candidates.add(value);
      for (const token of candidates) {
        if (!strongSourceToken(token)) continue;
        const locators = sourceIndex.resolveToken(token, new Set([verifierFile])).filter(item => item.file === sourceFile);
        if (locators.length === 0 || locators.length > 12) continue;
        for (const state of locators) {
          facts.push({
            token,
            checkName,
            startNeedle: "direct-source-assertion",
            endNeedle: "direct-source-assertion",
            state,
            readback: {
              file: verifierFile,
              symbol: verifierSymbol(lines, readbackLine),
              anchor: readbackAnchor,
              token,
              line: readbackLine,
              contextSha256: contextHash(lines, readbackLine),
              featureBinding: "candidate-unbound",
            },
          });
        }
      }
    }
  }
  return facts;
}

function verifierCheckSegments(text) {
  const starts = [...text.matchAll(/(?:^|\n)check\(/g)].map(match => match.index + (match[0].startsWith("\n") ? 1 : 0));
  return starts.map((start, index) => ({ start, text: text.slice(start, starts[index + 1] ?? text.length) }));
}

function structuralAssertionLine(checkText, constants) {
  const localLines = checkText.split(/\r?\n/);
  let offset = 0;
  for (const line of localLines) {
    const value = line.trim();
    if (/\b(?:assertIncludes|assert|assertOk|assertEqual)\s*\(/.test(value) &&
        !/assertIncludes\((?:files\.)?(?:backlog|stream|featureInventory|releaseRecords|serverSh|scriptInventory|coverage)/.test(value)) {
      return { line: value, offset: offset + Math.max(0, line.indexOf(value)) };
    }
    offset += line.length + 1;
  }
  void constants;
  return null;
}

function resolveVerifierExpression(expression, constants) {
  const value = expression.trim();
  const quoted = value.match(/^(?:["']([^"']*)["']|`([^`]*)`)$/s);
  if (quoted) {
    return (quoted[1] ?? quoted[2]).replace(/\$\{([A-Za-z_]\w*)\}/g, (_, name) => constants.get(name) || "");
  }
  return constants.get(value) || "";
}

function stringLiterals(text) {
  const values = [];
  for (const expression of [/(?:^|[^\\])"([^"\n]{3,220})"/g, /(?:^|[^\\])'([^'\n]{3,220})'/g, /`([^`\n]{3,220})`/g]) {
    for (const match of text.matchAll(expression)) values.push(match[1]);
  }
  return values;
}

function structuralFactScore(fact, row) {
  const haystack = `${row.feature} ${row.pass}`.toLowerCase();
  const words = filenameWords(`${fact.checkName} ${fact.token}`);
  let score = words.filter(word => haystack.includes(word)).length * 60;
  if (haystack.includes(fact.token.toLowerCase())) score += 160;
  if (/schema|route|selector|id=|data-testid|false|true|readOnly|no-store/i.test(fact.token)) score += 30;
  score += Math.min(60, fact.token.length / 3);
  return score;
}

function productionIndex() {
  const files = gitFiles().filter(file =>
    ((/^(?:src|include|config)\//.test(file) && /\.(?:cpp|cc|c|h|hpp|js|json)$/.test(file)) ||
      (/^scripts\/internal\//.test(file) && /\.(?:mjs|js|sh)$/.test(file)) || file === "server.sh") &&
    !file.endsWith("verify_v390_review4_feature_semantic_source_audit.mjs"));
  const entries = files.map(file => {
    const text = readText(file);
    return { file, text, lines: text.split(/\r?\n/), lineStarts: lineStarts(text), symbols: sourceSymbols(file, text) };
  });
  const locatorCache = new Map();
  const callerCache = new Map();
  const resolveAll = token => {
    if (locatorCache.has(token)) return locatorCache.get(token);
    const collect = sourceEntries => {
      const results = [];
      for (const entry of sourceEntries) {
        let cursor = entry.text.indexOf(token);
        while (cursor >= 0) {
          const line = lineAtEntry(entry, cursor);
          const symbol = symbolAt(entry, line);
          results.push(sourceLocator(entry, token, cursor, line, symbol));
          if (results.length > 64) break;
          cursor = entry.text.indexOf(token, cursor + token.length);
        }
      }
      return results;
    };
    let results = collect(entries.filter(entry => /^(?:src|include|config)\//.test(entry.file)));
    if (results.length === 0) results = collect(entries.filter(entry => !/^(?:src|include|config)\//.test(entry.file)));
    locatorCache.set(token, results);
    return results;
  };
  return {
    entries,
    tokenOwners(token, excludedFiles = new Set()) {
      return [...new Set(resolveAll(token).filter(item => !excludedFiles.has(item.file)).map(item => item.file))];
    },
    resolveToken(token, excludedFiles = new Set()) {
      return resolveAll(token).filter(item => !excludedFiles.has(item.file));
    },
    symbol(file, symbolName) {
      const entry = entries.find(item => item.file === file);
      return entry?.symbols.find(item => item.symbol === symbolName) || null;
    },
    callers(symbolName, excludedFiles = new Set()) {
      const bare = symbolName.split("::").pop();
      if (!bare || bare.startsWith("module-contract:")) return [];
      if (callerCache.has(bare)) return callerCache.get(bare).filter(item => !excludedFiles.has(item.file));
      const results = [];
      const callPattern = new RegExp(`\\b(?:[A-Za-z_][A-Za-z0-9_]*::)*${escapeRegExp(bare)}\\s*\\(`, "g");
      for (const entry of entries) {
        if (excludedFiles.has(entry.file)) continue;
        for (const match of entry.text.matchAll(callPattern)) {
          const line = lineAtEntry(entry, match.index);
          const owner = symbolAt(entry, line);
          if (owner.symbol === symbolName && line === owner.line) continue;
          results.push(sourceLocator(entry, match[0].trim(), match.index, line, owner));
        }
      }
      callerCache.set(bare, results);
      return results.filter(item => !excludedFiles.has(item.file));
    },
  };
}

function dispatchIndex() {
  const text = readText("server.sh");
  const verified = parseVerifiedReview4Dispatch(rootDir, text);
  const commandToFile = new Map([...verified.commandToRecord].map(([command, record]) => [command, record.file]));
  const fileToCommands = verified.fileToCommands;
  const filesById = new Map();
  for (const file of fileToCommands.keys()) {
    const ids = [...new Set(readText(file).match(/\b(?:UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d{3}\b/g) || [])];
    for (const id of ids) {
      const owners = filesById.get(id) || [];
      owners.push(file);
      filesById.set(id, owners);
    }
  }
  return { ...verified, commandToFile, fileToCommands, filesById };
}

function verifierCandidates(row, legacy, commandDispatch, sourceIndex) {
  const generic = /(?:project_feature_test_inventory|feature_implementation|feature_semantic|ui_automation_coverage|review4_feature_semantic_source_audit)/;
  const files = new Set();
  if (legacy?.verifierEvidence?.file) files.add(legacy.verifierEvidence.file);
  for (const file of commandDispatch.filesById.get(row.id) || []) if (!generic.test(file)) files.add(file);
  const contractTokens = exactContractTokens(row);
  const words = filenameWords(`${row.feature} ${row.pass}`);
  const candidates = [];
  for (const dispatchCandidateFile of files) {
    let file = dispatchCandidateFile;
    let delegate = "";
    const wrapperText = readText(file);
    if (file.endsWith(".sh")) {
      const delegateName = [...wrapperText.matchAll(/\b(verify_[A-Za-z0-9_]+\.(?:sh|mjs))\b/g)]
        .map(match => match[1]).find(name => name !== path.basename(file));
      if (delegateName && fs.existsSync(path.join(rootDir, "scripts/internal", delegateName))) {
        delegate = `scripts/internal/${delegateName}`;
        file = delegate;
      }
    }
    let tokens = verifierTokenCache.get(file);
    if (!tokens) {
      tokens = verifierProductionTokens(readText(file), sourceIndex, file);
      verifierTokenCache.set(file, tokens);
    }
    let facts = verifierFactCache.get(file);
    if (!facts) {
      facts = verifierStructuralFacts(file, sourceIndex);
      verifierFactCache.set(file, facts);
    }
    if (tokens.length === 0 && facts.length === 0) continue;
    const directCommands = commandDispatch.fileToCommands.get(file) || [];
    let command = directCommands[0] || "";
    let dispatchFile = file;
    if (!command && delegate && legacy?.verifierEvidence?.file === dispatchCandidateFile) {
      command = legacy.verifierEvidence.command || "";
      dispatchFile = dispatchCandidateFile;
    } else if (!command && legacy?.verifierEvidence?.file === file) {
      command = legacy.verifierEvidence.command || "";
      dispatchFile = commandDispatch.commandToFile.get(command) || "";
    }
    if (!command) continue;
    const tokenValues = tokens.map(item => item.token);
    const contractMatches = tokenValues.filter(token => contractTokens.some(contract => token.includes(contract) || contract.includes(token))).length;
    const basename = path.basename(file).replace(/^verify_|\.[^.]+$/g, "").toLowerCase();
    const filenameMatches = words.filter(word => basename.includes(word)).length;
    const explicitTokens = tokens.filter(item => /^(?:\/|#|\[data-testid=)|media-server\.|[A-Za-z_][A-Za-z0-9_:]{5,}$/.test(item.token)).length;
    candidates.push({
      verifier: { command, file, dispatchFile },
      tokens,
      facts,
      basis: { contractMatches, filenameMatches, explicitTokens, structuralFacts: facts.length, exactIdMention: readText(file).includes(row.id) },
    });
  }
  candidates.sort((a, b) =>
    b.basis.contractMatches - a.basis.contractMatches ||
    b.basis.filenameMatches - a.basis.filenameMatches ||
    b.basis.explicitTokens - a.basis.explicitTokens ||
    Number(b.basis.exactIdMention) - Number(a.basis.exactIdMention) ||
    a.verifier.file.localeCompare(b.verifier.file));
  return candidates;
}

function resolveSourceRoles(row, legacy, selected, sourceIndex) {
  const contracts = exactContractTokens(row, legacy);
  const excluded = new Set([selected.verifier.file]);
  const contractRecords = contracts.map(token => ({ token, owners: sourceIndex.tokenOwners(token, excluded), locators: sourceIndex.resolveToken(token, excluded) }))
    .filter(item => item.locators.length > 0 && item.locators.length <= 12);
  const verifierBound = selected.tokens.filter(item =>
    contracts.some(contract => item.token === contract || item.token.includes(contract) || contract.includes(item.token)));
  const resolvedTokens = dedupeTokenRecords([...contractRecords, ...verifierBound]);
  const attempts = [];
  for (const fact of selected.facts || []) {
    const flow = buildActualSourceFlow({ locator: fact.state, token: fact.token, row, sourceIndex, excluded });
    if (!flow) continue;
    attempts.push({
      ...flow,
      readback: fact.readback,
      token: fact.token,
      score: 1000 + structuralFactScore(fact, row),
    });
  }
  for (const record of resolvedTokens) {
    const readback = verifierReadback(selected.verifier.file, record.token, row.id, contracts);
    if (!readback) continue;
    for (const locator of record.locators) {
      const flow = buildActualSourceFlow({ locator, token: record.token, row, sourceIndex, excluded });
      if (!flow) continue;
      attempts.push({
        ...flow,
        readback,
        token: record.token,
        score: sourceFlowScore(record, locator, row, contracts, flow),
      });
    }
  }
  if (resolvedTokens.length === 0 && attempts.length === 0) return { ok: false, reason: "verifier-production-anchor-missing" };
  attempts.sort((a, b) => b.score - a.score || a.state.file.localeCompare(b.state.file) || a.state.line - b.state.line);
  if (attempts.length === 0) return { ok: false, reason: "source-role-locator-missing" };
  const materialized = attempts.slice(0, 24).map(actual => materializeAttempt(actual, row, selected.verifier)).filter(Boolean);
  const first = materialized[0];
  if (!first) return { ok: false, reason: "source-role-locator-missing" };
  return { ok: true, ...first, alternatives: materialized.slice(1) };
}

function materializeAttempt(actual, row, verifier) {
  const ownerRole = bindFeature(actual.owner, row.id, "owner");
  const dispatchRole = bindFeature(actual.dispatch, row.id, "dispatch");
  const actionRole = bindFeature(actual.action, row.id, "action");
  const stateRole = bindFeature(actual.state, row.id, "state");
  const readbackRole = bindFeature(actual.readback, row.id, "independent-readback");
  const verifierRole = verifierDispatchRole(verifier, row.id);
  if ([ownerRole, dispatchRole, actionRole, stateRole, readbackRole, verifierRole].some(role => !role)) {
    return null;
  }
  const roles = {
    owner: ownerRole,
    dispatch: dispatchRole,
    action: actionRole,
    state: stateRole,
    readback: readbackRole,
    verifier: verifierRole,
  };
  const edges = [
    witnessedEdge("owner", "dispatch", actual.proofs.ownerDispatch, roles.owner, roles.dispatch),
    witnessedEdge("dispatch", "action", actual.proofs.dispatchAction, roles.dispatch, roles.action),
    witnessedEdge("action", "state", actual.proofs.actionState, roles.action, roles.state),
    witnessedEdge("state", "readback", { kind: "exact-contract-readback", witness: actual.token }, roles.state, roles.readback),
    witnessedEdge("readback", "verifier", { kind: "dispatched-verifier-command", witness: verifier.command }, roles.readback, roles.verifier),
  ];
  return { roles, edges, evidenceToken: actual.token, score: actual.score };
}

function buildActualSourceFlow({ locator, token, row, sourceIndex, excluded }) {
  const entry = sourceIndex.entries.find(item => item.file === locator.file);
  const symbol = entry?.symbols.find(item => item.symbol === locator.symbol && item.line <= locator.line && item.endLine >= locator.line);
  if (!entry || !symbol || symbol.symbol.startsWith("module-contract:") || locator.line <= symbol.line) return null;
  const action = symbolLocator(entry, symbol, token);
  const callers = sourceIndex.callers(symbol.symbol, excluded)
    .filter(item => !(item.file === locator.file && item.line === symbol.line))
    .sort((a, b) => sourceFileRank(a.file) - sourceFileRank(b.file) || a.line - b.line);
  for (const callsite of callers) {
    const callerEntry = sourceIndex.entries.find(item => item.file === callsite.file);
    const callerSymbol = callerEntry?.symbols.find(item => item.symbol === callsite.symbol && item.line <= callsite.line && item.endLine >= callsite.line);
    if (!callerEntry || !callerSymbol || callerSymbol.symbol.startsWith("module-contract:")) continue;
    const owner = symbolLocator(callerEntry, callerSymbol, callsite.token);
    const dispatch = callsite;
    if (sameSourcePoint(owner, dispatch) || sameSourcePoint(action, locator)) continue;
    return {
      owner,
      dispatch,
      action,
      state: locator,
      proofs: {
        ownerDispatch: { kind: "function-contains-control", witness: `${callerSymbol.symbol}:${callerSymbol.line}-${callerSymbol.endLine}` },
        dispatchAction: { kind: "direct-symbol-call", witness: callsite.anchor },
        actionState: { kind: "action-contains-state", witness: `${symbol.symbol}:${symbol.line}-${symbol.endLine}` },
      },
    };
  }
  return intraSymbolFlow({ entry, symbol, locator, token, row });
}

function intraSymbolFlow({ entry, symbol, locator, token, row }) {
  const owner = symbolLocator(entry, symbol, token);
  const start = symbol.line;
  const end = symbol.endLine;
  const state = chooseStateLine(entry, locator, start, end, token);
  if (!state) return null;
  const dispatch = chooseControlLine(entry, state.line, start);
  if (!dispatch) return null;
  const action = chooseActionLine(entry, dispatch.line, state.line, flowKind(row));
  if (!action) return null;
  if ([owner, dispatch, action, state].some((role, index, roles) => roles.slice(0, index).some(other => sameSourcePoint(role, other)))) return null;
  return {
    owner,
    dispatch,
    action,
    state,
    proofs: {
      ownerDispatch: { kind: "function-contains-control", witness: `${symbol.symbol}:${start}-${end}` },
      dispatchAction: { kind: "ordered-branch-action", witness: `${dispatch.line}<${action.line}` },
      actionState: { kind: "ordered-action-state", witness: `${action.line}<${state.line}` },
    },
  };
}

function chooseStateLine(entry, locator, start, end, token) {
  if (/\b(?:return|co_return)\b|\b(?:set|append|push|insert|emplace|store|write|publish|assign|replace)\w*\s*\(|\b[A-Za-z_]\w*\s*=/.test(locator.anchor)) return locator;
  for (let line = locator.line + 1; line <= Math.min(end, locator.line + 28); line += 1) {
    const value = (entry.lines[line - 1] || "").trim();
    if (!value) continue;
    if (/\b(?:return|co_return)\b|\b(?:set|append|push|insert|emplace|store|write|publish|assign|replace)\w*\s*\(|\b[A-Za-z_]\w*\s*=/.test(value)) {
      return sourceLineLocator(entry, line, token, value);
    }
  }
  return locator.line > start + 1 ? locator : null;
}

function chooseControlLine(entry, stateLine, start) {
  for (let line = stateLine - 1; line > start; line -= 1) {
    const value = (entry.lines[line - 1] || "").trim();
    if (/\b(?:if|else if|switch|case|for|while|try|catch)\b|request\.path|addEventListener|onclick|onchange/.test(value)) {
      return sourceLineLocator(entry, line, value, value);
    }
  }
  if (stateLine > start + 2) return sourceLineLocator(entry, start + 1, entry.lines[start] || "dispatch", (entry.lines[start] || "").trim());
  return null;
}

function chooseActionLine(entry, dispatchLine, stateLine, kind) {
  for (let line = dispatchLine + 1; line < stateLine; line += 1) {
    const value = (entry.lines[line - 1] || "").trim();
    if (!value || /^(?:[{}]|else\b)/.test(value)) continue;
    if (kind === "mutation" && !/\b(?:set|append|push|insert|emplace|store|write|publish|save|update|delete|create|replace)\w*\s*\(|\b[A-Za-z_]\w*\s*=/.test(value)) continue;
    return sourceLineLocator(entry, line, value, value);
  }
  return null;
}

function sourceFlowScore(record, locator, row, contracts, flow) {
  const token = record.token;
  let score = 0;
  if (contracts.includes(token)) score += 120;
  if (row.feature.includes(token)) score += 180;
  else if (row.pass.includes(token)) score += 80;
  if (/^(?:\/|#|\[data-testid=)|media-server\./.test(token)) score += 50;
  if (/^(?:src|include|config)\//.test(locator.file)) score += 40;
  if (flow.proofs.dispatchAction.kind === "direct-symbol-call") score += 30;
  score += record.assertionStrength || 0;
  score += Math.max(0, 24 - (record.locators?.length || 1) * 4);
  score += Math.min(40, token.length / 4);
  return score;
}

function verifierReadback(file, token, id, contracts = []) {
  const text = readText(file);
  const lines = text.split(/\r?\n/);
  const candidates = [];
  let index = text.indexOf(token);
  while (index >= 0) {
    const line = lineAt(text, index);
    const value = (lines[line - 1] || "").trim();
    if (isVerifierAssertionLine(value)) candidates.push({ index, line, value, score: assertionScore(value, token, id, contracts) });
    index = text.indexOf(token, index + token.length);
  }
  candidates.sort((a, b) => b.score - a.score || a.line - b.line);
  const selected = candidates[0];
  if (!selected) return null;
  return {
    file,
    symbol: verifierSymbol(lines, selected.line),
    anchor: selected.value,
    token,
    line: selected.line,
    contextSha256: contextHash(lines, selected.line),
    featureBinding: `${id}:independent-readback`,
  };
}

function isVerifierAssertionLine(value) {
  if (!value || /^\s*(?:\/\/|\*|#)/.test(value)) return false;
  return /\b(?:assert[A-Za-z0-9_]*|check|expect(?:_[A-Za-z0-9_]+)?|row)\s*(?:\(|\")|^\s*assert\s+\S|^case\s+.+\s+in\s*$|\.includes\s*\(|\.match\s*\(|===|!==/i.test(value);
}

function assertionScore(value, token, id, contracts) {
  let score = 0;
  if (/\b(?:assert|assertOk|assertIncludes|assertEqual|expect)\s*\(/.test(value)) score += 80;
  if (value.includes(id)) score += 40;
  if (value.includes(token)) score += 30;
  if (contracts.some(contract => value.includes(contract))) score += 20;
  return score;
}

function verifierDispatchRole(verifier, id) {
  const file = verifier.dispatchFile || verifier.file;
  if (!file || !fs.existsSync(path.join(rootDir, file))) return null;
  const text = readText(file);
  const anchor = path.basename(verifier.file);
  const index = text.includes(anchor) ? text.indexOf(anchor) : text.indexOf(verifier.command);
  if (index < 0 && file !== verifier.file) return null;
  const lines = text.split(/\r?\n/);
  const line = index < 0 ? 1 : lineAt(text, index);
  return {
    file,
    symbol: `verifier-dispatch:${verifier.command}`,
    anchor: index < 0 ? (lines[0] || "").trim() : (lines[line - 1] || "").trim(),
    line,
    contextSha256: contextHash(lines, line),
    featureBinding: `${id}:verifier-dispatch`,
  };
}

function witnessedEdge(from, to, witness, fromRole, toRole) {
  return {
    from,
    to,
    proof: witness.kind,
    witness: witness.witness,
    source: `${fromRole.file}:${fromRole.line}->${toRole.file}:${toRole.line}`,
    digest: sha256(JSON.stringify({ from, to, witness, fromRole, toRole })),
  };
}

function sourceSymbols(file, text) {
  const lines = text.split(/\r?\n/);
  const symbols = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    let name = line.match(/\b(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)?.[1];
    if (!name) name = line.match(/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=.*=>/)?.[1];
    if (!name) name = line.match(/^(?:(?:static|inline|constexpr|virtual|explicit)\s+)*(?:[A-Za-z_][A-Za-z0-9_:<>,*&]*\s+)+([A-Za-z_~][A-Za-z0-9_:~]*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/)?.[1];
    let openLine = index + 1;
    let openColumn = lines[index].lastIndexOf("{");
    if (!name && /\.(?:cpp|cc|c|h|hpp)$/.test(file)) {
      const window = lines.slice(index, Math.min(lines.length, index + 9)).join("\n");
      const match = window.match(/^(?:(?:static|inline|constexpr|virtual|explicit|friend)\s+)*(?:[A-Za-z_][A-Za-z0-9_:<>,*&\s]*?\s+)([A-Za-z_~][A-Za-z0-9_:~]*)\s*\([^;{}]*?\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[^\{]+)?\{/s);
      if (match && !/^(?:if|for|while|switch|catch)$/.test(match[1])) {
        name = match[1];
        const beforeBrace = match[0].slice(0, match[0].lastIndexOf("{"));
        openLine = index + 1 + (beforeBrace.match(/\n/g) || []).length;
        openColumn = (beforeBrace.split("\n").pop() || "").length;
      }
    }
    if (!name) continue;
    if (openColumn < 0) {
      for (let probe = index + 1; probe < Math.min(lines.length, index + 9); probe += 1) {
        const column = lines[probe].lastIndexOf("{");
        if (column >= 0) { openLine = probe + 1; openColumn = column; break; }
      }
    }
    if (openColumn < 0) continue;
    symbols.push({ symbol: name, line: index + 1, anchor: line, endLine: matchingBraceLine(lines, openLine, openColumn) });
  }
  if (symbols.length === 0) symbols.push({ symbol: `module-contract:${path.basename(file)}`, line: 1, anchor: (lines[0] || path.basename(file)).trim() });
  for (const symbol of symbols) if (!symbol.endLine) symbol.endLine = lines.length;
  return symbols;
}

function symbolAt(entry, line) {
  const containing = entry.symbols.filter(symbol => symbol.line <= line && symbol.endLine >= line);
  containing.sort((a, b) => (a.endLine - a.line) - (b.endLine - b.line) || b.line - a.line);
  return containing[0] || entry.symbols.find(symbol => symbol.line <= line) || entry.symbols[0];
}

function sourceLocator(entry, token, index, line, symbol) {
  return {
    file: entry.file,
    symbol: symbol.symbol,
    anchor: (entry.lines[line - 1] || token).trim(),
    token,
    line,
    contextSha256: contextHash(entry.lines, line),
    featureBinding: "candidate-unbound",
  };
}

function sourceLineLocator(entry, line, token, anchor) {
  const symbol = symbolAt(entry, line);
  return {
    file: entry.file,
    symbol: symbol.symbol,
    anchor,
    token,
    line,
    contextSha256: contextHash(entry.lines, line),
    featureBinding: "candidate-unbound",
  };
}

function symbolLocator(entry, symbol, token) {
  return {
    file: entry.file,
    symbol: symbol.symbol,
    anchor: symbol.anchor,
    token,
    line: symbol.line,
    contextSha256: contextHash(entry.lines, symbol.line),
    featureBinding: "candidate-unbound",
  };
}

function matchingBraceLine(lines, openLine, openColumn) {
  let depth = 0;
  let quote = "";
  let blockComment = false;
  for (let lineIndex = openLine - 1; lineIndex < lines.length; lineIndex += 1) {
    const value = lines[lineIndex];
    for (let column = lineIndex === openLine - 1 ? openColumn : 0; column < value.length; column += 1) {
      const char = value[column];
      const next = value[column + 1] || "";
      if (blockComment) {
        if (char === "*" && next === "/") { blockComment = false; column += 1; }
        continue;
      }
      if (quote) {
        if (char === "\\") { column += 1; continue; }
        if (char === quote) quote = "";
        continue;
      }
      if (char === "/" && next === "*") { blockComment = true; column += 1; continue; }
      if (char === "/" && next === "/") break;
      if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) return lineIndex + 1;
      }
    }
  }
  return lines.length;
}

function bindFeature(locator, id, role) {
  return locator ? { ...locator, featureBinding: `${id}:${role}` } : null;
}

function verifierSymbol(lines, line) {
  for (let index = line - 1; index >= 0; index -= 1) {
    const value = lines[index].trim();
    const checkName = value.match(/\bcheck\(["'`]([^"'`]+)/)?.[1];
    if (checkName) return `check:${checkName}`;
    const fn = value.match(/\b(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
    if (fn) return fn;
  }
  return "verifier-module-contract";
}

function verifierDispatchValid(verifier, commandDispatch) {
  const dispatchFile = commandDispatch.commandToFile.get(verifier.command);
  return Boolean(dispatchFile && dispatchFile === verifier.file);
}

function exactContractTokens(row, legacy = null) {
  const text = `${row.feature} ${row.pass}`;
  return [...new Set([
    legacy?.uiEvidence?.screenRoute || "",
    legacy?.semanticEvidence?.controlSelector?.value || "",
    ...[...text.matchAll(/`([^`]{2,160})`/g)].map(match => match[1]),
    ...[...text.matchAll(/\/(?:ops|client|lab|setup|login|logout|password|invite|webrtc|auth)[A-Za-z0-9_?&=/{}/.-]*/g)].map(match => match[0]),
    ...[...text.matchAll(/[A-Za-z_][A-Za-z0-9_:-]{5,}/g)].map(match => match[0]).filter(token => /[A-Z_:-]/.test(token)),
  ])].filter(strongSourceToken);
}

function filenameWords(text) {
  return [...new Set([...text.toLowerCase().matchAll(/[a-z][a-z0-9]{3,}/g)].map(match => match[0]))]
    .filter(word => !new Set(["with", "from", "that", "this", "status", "result", "source", "current", "actual"]).has(word));
}

function strongSourceToken(token) {
  if (token.length < 4 || token.length > 220) return false;
  if (/\s{3,}|^[a-z]$|^[{}()[\],.;:+*?\\-]+$/i.test(token)) return false;
  if (/^(?:missing|expected|actual|invalid|unknown|summary|report|result|status|source|route)$/i.test(token)) return false;
  return /[\p{L}\p{N}/#_-]/u.test(token);
}

function sameSourcePoint(a, b) { return a?.file === b?.file && a?.anchor === b?.anchor; }
function sourceFlowDigest(item) {
  return review4SourceFlowDigest(item);
}

function facetKey(item) {
  return [baseFacetKey(item), item.sharedContract?.id || "", item.sharedContract?.facet || ""].join("|");
}

function baseFacetKey(item) {
  return review4CanonicalFlowKey(item);
}

function dedupeTokenRecords(records) {
  const out = [];
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.token)) continue;
    seen.add(record.token);
    out.push(record);
  }
  return out;
}

function lineAt(text, index) { return text.slice(0, index).split(/\r?\n/).length; }
function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) if (text.charCodeAt(index) === 10) starts.push(index + 1);
  return starts;
}
function lineAtEntry(entry, index) {
  let low = 0;
  let high = entry.lineStarts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (entry.lineStarts[middle] <= index) low = middle + 1;
    else high = middle;
  }
  return Math.max(1, low);
}
function contextHash(lines, line) { return sha256(lines.slice(Math.max(0, line - 2), Math.min(lines.length, line + 1)).join("\n")); }
function staticEnclosingBodyBypassFixture() {
  const source = readText("scripts/internal/verify_vlm_profile_storage.mjs");
  const result = { ok: source.includes("assert(server.includes(snippet)") };
  if (!result?.ok) { // REVIEW4 negative fixture: generic condition over static source
    throw new Error("static source fixture mismatch");
  }
}
function runtimeArtifactReadbackFixture() {
  const registryPath = path.join(process.env.TMPDIR || "/tmp", "review4-runtime-registry.json");
  fs.writeFileSync(registryPath, JSON.stringify({ evaluation: "not-run" }), "utf8");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (registry.evaluation !== "not-run") {
    throw new Error("runtime registry evaluation readback mismatch");
  }
}
function comparisonOnlyMutationFixture(comparisonValue, expectedValue) {
  if (comparisonValue === expectedValue) return true;
  if (comparisonValue !== expectedValue) return false;
  return false;
}
function crossLoopAssertionFixture(source) {
  for (const snippet of ["unrelated-loop-token"]) {
    assert(source.includes(snippet), "cross-loop unrelated branch");
  }
  for (const snippet of ["evaluation"]) {
    assert(source.includes(snippet), "cross-loop target branch");
  }
}
function genericLoopAssertionFixture(source) {
  for (const snippet of ["approvalDraft"]) {
    assert(source.includes(snippet), "generic loop target branch");
  }
}
function aliasedWholeFileAssertionFixture(source) {
  const corpus = source;
  assert(corpus.includes("approvalDraft"), "aliased whole-file negative fixture");
}
function literalRuntimeReadbackFixture() {
  const observed = { evaluation: "saved" };
  if (observed.evaluation !== "saved") {
    throw new Error("literal runtime negative fixture mismatch");
  }
}
function fixtureFileRuntimeReadbackFixture() {
  const fixture = JSON.parse(fs.readFileSync(
    path.join(rootDir, "test/fixtures/v390_review4_semantic_proofs_ui_auth_src_rule.json"), "utf8"));
  if (fixture.schema !== "media-server.v390-review4-semantic-reviewed-proofs.v1") {
    throw new Error("fixture-file runtime negative fixture mismatch");
  }
}
function exactLocator(file, symbol, anchor) {
  const lines = readText(file).split(/\r?\n/);
  const matches = lines.flatMap((value, index) => value.trim() === anchor.trim() ? [index + 1] : []);
  assert(matches.length === 1, `${file} exact locator ${anchor} count ${matches.length}`);
  return { file, symbol, anchor, line: matches[0], contextSha256: contextHash(lines, matches[0]) };
}

function exactFunctionTrust(file, functionAnchor) {
  const lines = readText(file).split(/\r?\n/);
  const matches = lines.flatMap((value, index) => value.trim() === functionAnchor.trim() ? [index + 1] : []);
  assert(matches.length === 1, `${file} function anchor ${functionAnchor} count ${matches.length}`);
  const startLine = matches[0];
  const column = lines[startLine - 1].lastIndexOf("{");
  assert(column >= 0, `${file} function anchor has no opening brace: ${functionAnchor}`);
  return {
    file,
    enclosingBodyStartLine: startLine,
    enclosingBodyEndLine: matchingBraceLine(lines, startLine, column),
    enclosingBodyScope: "declared-symbol",
  };
}

function validateCandidateItem(item) {
  const errors = candidateErrors(item);
  assert(errors.length === 0, `${item.id}: ${errors.join(";")}`);
}

function assertSpotCheck(byId, id, expectedFragments) {
  const item = byId.get(id);
  assert(item?.status === "source-resolved-candidate", `${id} is not source resolved`);
  const evidence = [
    ...Object.values(item.roles || {}).flatMap(role => [role.file, role.symbol, role.anchor]),
    ...(item.edges || []).flatMap(edge => [edge.kind || edge.proof, edge.witness, edge.source, edge.target]),
  ].join("\n");
  for (const fragment of expectedFragments) assert(evidence.includes(fragment), `${id} missing actual source fragment ${fragment}`);
}

function candidateErrors(item) {
  const errors = [];
  for (const [name, role] of Object.entries(item.roles || {})) {
    const target = path.join(rootDir, role.file || "");
    if (!role.file || !fs.existsSync(target) || !readText(role.file).includes(role.anchor || "__missing__")) errors.push(`${name}:missing-source-anchor`);
    if (String(role.symbol).startsWith("file-scope:") || role.featureBinding === "shared-generic") errors.push(`${name}:generic-shared-owner`);
  }
  if (item.flowKind === "mutation" && item.roles?.action && item.roles?.state &&
      item.roles.action.file === item.roles.state.file && item.roles.action.anchor === item.roles.state.anchor) {
    errors.push("mutation-action-state-self-comparison");
  }
  const allowedProofs = new Set([
    "function-contains-control",
    "direct-symbol-call",
    "ordered-branch-action",
    "ordered-action-state",
    "action-contains-state",
    "exact-contract-readback",
    "dispatched-verifier-command",
    "callsite",
    "direct-callsite",
    "branch-containment",
    "function-containment",
    "argument-def-use",
    "return-def-use",
    "assignment-def-use",
    "co-asserted-boundary",
    "event-binding",
    "structural-producer-assertion",
    "runtime-readback",
    "verifier-dispatch",
  ]);
  if ((item.edges || []).some(edge => !allowedProofs.has(edge.proof || edge.kind))) {
    errors.push("invented-edge-proof");
  }
  if ((item.edges || []).length !== 5 || (item.edges || []).some(edge => !edge.witness)) errors.push("missing-edge-witness");
  errors.push(...validateReview4TrustBindings(rootDir, item, dispatch));
  errors.push(...validateReview4SemanticProof({ item, dispatchIndex: dispatch, rootDir }));
  return errors;
}

function semanticObligation(row) {
  return buildReview4SemanticObligation(row, { rootDir });
}

function flowKind(row) {
  const requirement = classifyFeatureRequirement(row);
  if (requirement.expectation !== "allow") return "negative-invariant";
  return requirement.operation === "read" || requirement.operation === "none" ? "read-model" : "mutation";
}

function classifyFeatureRequirement(row) {
  return classifyReview4Requirement(row);
}

function gitFiles() {
  return execFileSync("git", ["ls-files"], { cwd: rootDir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim().split("\n").filter(Boolean);
}

function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function countLabels(values, limit) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
    .map(([value, count]) => `${value}=${count}`).join(",") || "none";
}
function familyStatus(items) {
  const families = new Map();
  for (const item of items) {
    const family = String(item.id || "UNKNOWN").split("-")[0];
    const status = families.get(family) || { resolved: 0, invalid: 0 };
    if (item.status === "source-resolved-candidate") status.resolved += 1;
    else status.invalid += 1;
    families.set(family, status);
  }
  return [...families].map(([family, status]) =>
    `${family}:${status.resolved}/${status.invalid}`).join(",") || "none";
}
function readText(file) {
  if (!textCache.has(file)) textCache.set(file, fs.readFileSync(path.join(rootDir, file), "utf8"));
  return textCache.get(file);
}
function readJson(file) { return JSON.parse(readText(file)); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function sourceFileRank(file) {
  if (/^(?:src|include|config)\//.test(file)) return 0;
  if (/^scripts\/internal\//.test(file)) return 1;
  return 2;
}
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
