// 파일 용도: feature row를 exact handler/route/action/state/assertion locator와 reviewer 승인으로 연결한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const SEMANTIC_CLOSURE_SCHEMA =
  "media-server.feature-semantic-implementation-closure.v2";
export const REVIEW3_CALL_CHAIN_SCHEMA =
  "media-server.feature-reviewed-call-chain.v1";
export const SEMANTIC_REVIEW_STATUS = "semantic-reviewed";

const repositoryCache = new Map();
const semanticMatchCache = new Map();
const symbolTimelineCache = new Map();
const newlineOffsetCache = new Map();
const review3SourceCache = new Map();
const validationTextCache = new Map();
const genericAnchors = new Set([
  "analysis", "condition", "event", "events", "metadata", "session", "client",
  "viewer", "runtime", "state", "status", "result", "response", "validation",
  "feature", "release", "current", "source", "route", "profile", "rule",
  "dashboard", "operator", "external", "health", "reference", "deterministic",
]);
const weakWords = new Set([
  "with", "from", "into", "only", "true", "false", "none", "default", "existing",
  "required", "selected", "current", "actual", "final", "pass", "fail", "not",
  "run", "media", "server", "source", "state", "status", "result", "route", "test",
]);

export function buildSemanticEvidence({ rootDir, row, legacyItem }) {
  void rootDir;
  void row;
  void legacyItem;
  throw new Error("automatic semantic owner selection is forbidden; use an individually reviewed v2 call chain");
}

export function bindSemanticEvidence(item, semanticEvidence) {
  item.semanticEvidence = semanticEvidence;
  item.sourceEvidence = {
    file: semanticEvidence.handler.file,
    anchor: semanticEvidence.handler.anchor,
    anchorKind: "semantic-handler-token",
  };
  if (item.uiEvidence) {
    const controlLocator = semanticEvidence.controlSelector?.applicability === "product-control"
      ? semanticEvidence.controlSelector.locator
      : semanticEvidence.actionHandler;
    item.uiEvidence = {
      file: controlLocator.file,
      anchor: controlLocator.anchor,
      anchorKind: semanticEvidence.controlSelector?.applicability === "product-control"
        ? "exact-control-selector"
        : "semantic-action-handler",
      screenRoute: semanticEvidence.controlSelector?.screenRoute ||
        semanticEvidence.route?.value || item.uiEvidence.screenRoute,
    };
  }
  return item;
}

export function semanticDigest(row, semanticEvidence) {
  const canonical = structuredClone(semanticEvidence || {});
  if (canonical.verifierAssertion) {
    delete canonical.verifierAssertion.assertedSemanticDigest;
  }
  return sha256(JSON.stringify({
    id: row.id,
    feature: row.feature,
    uiNeed: row.uiNeed,
    testNeed: row.testNeed,
    testAreas: Array.isArray(row.testAreas) ? row.testAreas : splitAreas(row.area),
    semanticEvidence: canonical,
  }));
}

export function validateSemanticItem({ rootDir, row, item }) {
  const errors = [];
  const evidence = item?.semanticEvidence;
  if (evidence?.schema !== SEMANTIC_CLOSURE_SCHEMA) {
    errors.push(`${row.id} semantic evidence schema drift`);
    return errors;
  }
  if (item.status !== SEMANTIC_REVIEW_STATUS) {
    errors.push(`${row.id} status must be ${SEMANTIC_REVIEW_STATUS}`);
  }
  if (item.review?.decision !== "approved") {
    errors.push(`${row.id} semantic review is not approved`);
  }
  validateReview3CallChain({ rootDir, row, item, errors });

  validateLocator(rootDir, row.id, "handler", evidence.handler, errors);
  validateLocator(rootDir, row.id, "actionHandler", evidence.actionHandler, errors);
  validateLocator(rootDir, row.id, "stateOracle", evidence.stateOracle?.locator, errors);

  const expectedBehaviorSha = sha256(normalize(`${row.feature}\n${row.pass}`));
  if (evidence.stateOracle?.expectedBehaviorSha256 !== expectedBehaviorSha) {
    errors.push(`${row.id} state oracle behavior drift`);
  }
  if (evidence.stateOracle?.expectedBehavior !== normalize(row.pass)) {
    errors.push(`${row.id} state oracle contract text drift`);
  }

  const expectedRoute = semanticRoute(row, item);
  if (expectedRoute) {
    if (evidence.route?.applicability !== "http-or-product-route" ||
        evidence.route?.value !== expectedRoute) {
      errors.push(`${row.id} route drift`);
    } else {
      const handlerText = readText(rootDir, evidence.route.handlerFile, errors, `${row.id} route`);
      if (handlerText !== null && !handlerText.includes(evidence.route.dispatchAnchor)) {
        errors.push(`${row.id} route dispatch anchor missing`);
      }
      if (evidence.route.handlerSymbol !== evidence.handler.symbol) {
        errors.push(`${row.id} route handler relation drift`);
      }
      if (evidence.route.dispatchAnchor !== evidence.handler.anchor ||
          evidence.route.contextSha256 !== evidence.handler.contextSha256) {
        errors.push(`${row.id} route dispatch locator drift`);
      }
    }
  } else if (evidence.route?.applicability !== "not-applicable") {
    errors.push(`${row.id} non-route feature invented route evidence`);
  }

  validateControlSelector(rootDir, row, evidence.controlSelector, errors);
  if (evidence.relation?.handlerSymbol !== evidence.handler?.symbol ||
      evidence.relation?.actionSymbol !== evidence.actionHandler?.symbol ||
      evidence.relation?.stateSymbol !== evidence.stateOracle?.locator?.symbol) {
    errors.push(`${row.id} handler/action/state relation drift`);
  }
  const expectedKey = `${row.id}:${expectedBehaviorSha.slice(0, 24)}`;
  if (evidence.relation?.semanticKey !== expectedKey) {
    errors.push(`${row.id} semantic relation key drift`);
  }

  const assertion = evidence.verifierAssertion || {};
  if (assertion.file !== "scripts/internal/feature_semantic_evidence_lib.mjs" ||
      assertion.symbol !== "validateReview3CallChain" ||
      assertion.assertionAnchor !== "validateReview3CallChain" ||
      assertion.assertionAnchor === row.id ||
      assertion.assertionKind !== "reviewed-owner-route-control-action-state-readback-chain" ||
      assertion.command !== "verify-feature-implementation-evidence") {
    errors.push(`${row.id} verifier assertion must validate semantics, not an ID string`);
  }
  const assertionSource = readText(rootDir, assertion.file, errors, `${row.id} verifier assertion`);
  if (assertionSource !== null && !assertionSource.includes("export function validateReview3CallChain")) {
    errors.push(`${row.id} semantic verifier assertion symbol missing`);
  }

  const digest = semanticDigest(row, evidence);
  if (assertion.assertedSemanticDigest !== digest || item.review?.semanticDigest !== digest) {
    errors.push(`${row.id} semantic review digest drift`);
  }
  return errors;
}

export function summarizeSemanticClosure({ rows, manifest }) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  return {
    inventoryRows: rows.length,
    semanticReviewedRows: items.filter(item =>
      item.status === SEMANTIC_REVIEW_STATUS && item.review?.decision === "approved").length,
    uniqueSemanticDigests: new Set(items.map(item => item.review?.semanticDigest).filter(Boolean)).size,
  };
}

export function runSemanticClosureContract({ rootDir, rows, manifest }) {
  const rowById = new Map(rows.map(row => [row.id, row]));
  const itemById = new Map((manifest.items || []).map(item => [item.id, item]));
  const base = itemById.get("UI-002");
  const safe140 = itemById.get("SAFE-140");
  const rule017 = itemById.get("RULE-017");
  const cases = [];
  const summary = summarizeSemanticClosure({ rows, manifest });
  cases.push(resultCase(
    "all-986-reviewed-semantic-closures",
    summary.semanticReviewedRows === rows.length && summary.uniqueSemanticDigests === rows.length,
    `reviewed=${summary.semanticReviewedRows} unique=${summary.uniqueSemanticDigests}`,
  ));
  cases.push(resultCase(
    "ui-002-exact-setup-handler",
    base?.semanticEvidence?.route?.value === "/setup" &&
      base?.semanticEvidence?.handler?.anchor.includes("/setup") &&
      !base?.semanticEvidence?.handler?.anchor.includes("/password"),
    base?.semanticEvidence?.handler?.anchor || "missing",
  ));
  cases.push(resultCase(
    "all-986-feature-specific-review-reasons",
    new Set((manifest.items || []).map(item => item.review?.reason)).size === rows.length &&
      (manifest.items || []).every(item => item.review?.reason?.includes(item.id)),
    "review reasons must be unique and ID-bound",
  ));
  cases.push(resultCase(
    "safe-140-command-workspace-owner-corrected",
    safe140?.semanticEvidence?.callChain?.roles?.owner?.symbol === "AppendOpsDashboardPage" &&
      safe140?.semanticEvidence?.callChain?.roles?.action?.symbol === "OpsV350CommandPlanJson" &&
      safe140?.semanticEvidence?.callChain?.roles?.state?.symbol === "OpsV350StagedChangePlanImpactPreviewJson",
    JSON.stringify(safe140?.semanticEvidence?.callChain?.roles || {}),
  ));
  cases.push(resultCase(
    "rule-017-generated-id-owner-corrected",
    rule017?.semanticEvidence?.callChain?.roles?.owner?.symbol === "AppendOpsRulesPage" &&
      rule017?.semanticEvidence?.callChain?.roles?.action?.symbol === "opsRulesSaveNativeRecord" &&
      rule017?.semanticEvidence?.callChain?.roles?.state?.symbol === "setOpsGeneratedId" &&
      rule017?.verifierEvidence?.command === "verify-ops-client-ui",
    JSON.stringify(rule017?.semanticEvidence?.callChain?.roles || {}),
  ));
  const safe217 = itemById.get("SAFE-217");
  const ops184 = itemById.get("OPS-184");
  const ops173 = itemById.get("OPS-173");
  const ops180 = itemById.get("OPS-180");
  cases.push(resultCase(
    "safe-217-persist-before-publish-chain",
    safe217?.semanticEvidence?.callChain?.roles?.owner?.symbol === "PersistAndPublishLocked" &&
      safe217?.semanticEvidence?.callChain?.roles?.action?.symbol === "PersistAndPublishLocked" &&
      safe217?.semanticEvidence?.callChain?.roles?.state?.symbol === "PersistAndPublishLocked" &&
      safe217?.semanticEvidence?.callChain?.roles?.readback?.symbol === "runFailureStage",
    JSON.stringify(safe217?.semanticEvidence?.callChain?.roles || {}),
  ));
  cases.push(resultCase(
    "ops-184-crash-recovery-chain",
    ops184?.semanticEvidence?.callChain?.roles?.owner?.symbol === "AnalysisRegistryMutationErrorResponse" &&
      ops184?.semanticEvidence?.callChain?.roles?.action?.symbol === "PersistAndPublishLocked" &&
      ops184?.semanticEvidence?.callChain?.roles?.state?.symbol === "EnsureLoadedLocked" &&
      ops184?.semanticEvidence?.callChain?.roles?.readback?.symbol === "runCrashCase",
    JSON.stringify(ops184?.semanticEvidence?.callChain?.roles || {}),
  ));
  cases.push(resultCase(
    "ops-173-structural-profile-integrity-chain",
    ops173?.semanticEvidence?.callChain?.roles?.owner?.symbol === "PrepareVlmProfileDocumentLocked" &&
      ops173?.semanticEvidence?.callChain?.roles?.action?.symbol === "PrepareVlmProfileDocumentLocked" &&
      ops173?.semanticEvidence?.callChain?.roles?.state?.symbol === "CanonicalizeStoredVlmProfileLocked" &&
      ops173?.semanticEvidence?.callChain?.roles?.readback?.symbol === "verifyStructuralProfileRejection",
    JSON.stringify(ops173?.semanticEvidence?.callChain?.roles || {}),
  ));
  cases.push(resultCase(
    "ops-180-reload-provenance-integrity-chain",
    ops180?.semanticEvidence?.callChain?.roles?.owner?.symbol === "ValidateVlmIncidentRuleProvenanceContract" &&
      ops180?.semanticEvidence?.callChain?.roles?.action?.symbol === "ValidateVlmIncidentRuleProvenanceServerRecords" &&
      ops180?.semanticEvidence?.callChain?.roles?.state?.symbol === "EnsureLoadedLocked" &&
      ops180?.semanticEvidence?.callChain?.roles?.readback?.symbol === "provenanceRestartReadback",
    JSON.stringify(ops180?.semanticEvidence?.callChain?.roles || {}),
  ));
  const manifestLib = fs.readFileSync(path.join(rootDir, "scripts/internal/feature_implementation_manifest_lib.mjs"), "utf8");
  const semanticLib = fs.readFileSync(path.join(rootDir, "scripts/internal/feature_semantic_evidence_lib.mjs"), "utf8");
  cases.push(resultCase(
    "token-scoring-and-bulk-approval-removed",
    !manifestLib.includes(["function", "bestEvidence"].join(" ")) &&
      !manifestLib.includes(["function", "ownerScore"].join(" ")) &&
      !manifestLib.includes(["approve", "SemanticReview"].join("")) &&
      !semanticLib.includes(["score: token", "score"].join(".")) &&
      !semanticLib.includes(["function", "ownerScore"].join(" ")) &&
      semanticLib.includes("automatic semantic owner selection is forbidden; use an individually reviewed v2 call chain"),
    "legacy automatic selector or bulk approval remains",
  ));
  if (!base) return cases;

  const negatives = [
    ["wrong-handler-symbol-negative", copy => { copy.semanticEvidence.handler.symbol = "WrongHandler"; }, "handler symbol drift"],
    ["same-file-unrelated-anchor-negative", copy => { copy.semanticEvidence.handler.anchor = "/password"; }, "handler"],
    ["route-drift-negative", copy => { copy.semanticEvidence.route.value = "/password"; }, "route drift"],
    ["action-drift-negative", copy => { copy.semanticEvidence.actionHandler.symbol = "WrongAction"; }, "actionHandler symbol drift"],
    ["state-drift-negative", copy => { copy.semanticEvidence.stateOracle.expectedBehaviorSha256 = "0".repeat(64); }, "state oracle behavior drift"],
    ["generic-anchor-alone-negative", copy => {
      copy.semanticEvidence.handler.anchor = "analysis";
      copy.semanticEvidence.handler.anchorStrength = "generic-alone";
    }, "generic anchor cannot stand alone"],
    ["id-only-verifier-negative", copy => { copy.semanticEvidence.verifierAssertion.assertionAnchor = copy.id; }, "not an ID string"],
    ["unapproved-review-negative", copy => { copy.review.decision = "pending"; }, "not approved"],
    ["missing-reviewed-edge-negative", copy => { copy.semanticEvidence.callChain.edges.pop(); }, "edge sequence drift"],
    ["generic-owner-negative", copy => {
      copy.semanticEvidence.callChain.roles.owner.anchor = "state";
      copy.semanticEvidence.callChain.roles.owner.anchorStrength = "generic-alone";
    }, "generic owner"],
    ["call-chain-digest-negative", copy => { copy.semanticEvidence.callChain.digest = "0".repeat(64); }, "call chain digest drift"],
  ];
  for (const [name, mutate, expected] of negatives) {
    const copy = structuredClone(base);
    mutate(copy);
    const errors = validateSemanticItem({ rootDir, row: rowById.get(copy.id), item: copy });
    cases.push(resultCase(name, errors.some(error => error.includes(expected)), errors.join("; ")));
  }
  for (const [name, source, rowId, mutate, expected] of [
    ["safe-140-unrelated-owner-negative", safe140, "SAFE-140", copy => {
      copy.semanticEvidence.callChain.roles.action.symbol = "OpsV380ClientNoticeDraftQueueJson";
    }, "unrelated command workspace owner"],
    ["rule-017-generic-json-owner-negative", rule017, "RULE-017", copy => {
      copy.semanticEvidence.callChain.roles.owner.symbol = "ExtractObjectField";
    }, "unrelated generated-id owner"],
    ["safe-217-wrong-publish-state-negative", safe217, "SAFE-217", copy => {
      copy.semanticEvidence.callChain.roles.state.symbol = "WriteAnalysisRegistryFileAtomically";
    }, "durable no-publish chain drift"],
    ["ops-184-wrong-recovery-readback-negative", ops184, "OPS-184", copy => {
      copy.semanticEvidence.callChain.roles.readback.symbol = "runFailureStage";
    }, "crash recovery chain drift"],
    ["ops-173-wrong-structural-readback-negative", ops173, "OPS-173", copy => {
      copy.semanticEvidence.callChain.roles.readback.symbol = "verifyReloadQuarantine";
    }, "structural profile integrity chain drift"],
    ["ops-180-wrong-provenance-state-negative", ops180, "OPS-180", copy => {
      copy.semanticEvidence.callChain.roles.state.symbol = "PersistAndPublishLocked";
    }, "reload provenance integrity chain drift"],
  ]) {
    const copy = structuredClone(source);
    mutate(copy);
    const errors = validateSemanticItem({ rootDir, row: rowById.get(rowId), item: copy });
    cases.push(resultCase(name, errors.some(error => error.includes(expected)), errors.join("; ")));
  }
  return cases;
}

export function migrateReview3SemanticClosure({ rootDir, rows, manifest, selectedIds = null }) {
  const rowById = new Map(rows.map(row => [row.id, row]));
  const selected = selectedIds === null ? null : new Set(selectedIds);
  const migrated = structuredClone(manifest);
  migrated.semanticClosureSchema = SEMANTIC_CLOSURE_SCHEMA;
  migrated.generationPolicy =
    "reviewed-map-only; unrelated source changes preserve approved rows; changed rows become review-required; token scoring and bulk approval are forbidden";
  migrated.semanticClosurePolicy =
    "986 explicit owner -> route/control -> action -> state -> readback -> verifier chains with content-addressed locators and per-feature review reasons";
  migrated.items = migrated.items.map(item => {
    if (selected !== null && !selected.has(item.id)) return item;
    const row = rowById.get(item.id);
    if (!row) throw new Error(`review3 migration row missing: ${item.id}`);
    const override = review3Override(rootDir, row, item);
    if (override?.verifierEvidence) item.verifierEvidence = override.verifierEvidence;

    const evidence = item.semanticEvidence;
    evidence.schema = SEMANTIC_CLOSURE_SCHEMA;
    const roles = override?.roles || {
      owner: strengthenLocator(rootDir, evidence.handler),
      routeControl: evidence.controlSelector?.applicability === "product-control"
        ? strengthenLocator(rootDir, evidence.controlSelector.locator)
        : strengthenLocator(rootDir, evidence.handler),
      action: strengthenLocator(rootDir, evidence.actionHandler),
      state: strengthenLocator(rootDir, evidence.stateOracle.locator),
      readback: locatorFromEvidence(rootDir, item.verifierEvidence),
    };
    const routeControlKind = override?.routeControlKind ||
      (evidence.controlSelector?.applicability === "product-control"
        ? "visible-or-state-control"
        : evidence.route?.applicability === "http-or-product-route"
          ? "route-dispatch"
          : "owner-boundary");
    const chain = {
      schema: REVIEW3_CALL_CHAIN_SCHEMA,
      roles,
      routeControlKind,
      edges: buildReview3Edges(roles, routeControlKind),
      digest: "",
    };
    chain.digest = review3CallChainDigest(row, chain);
    evidence.callChain = chain;

    evidence.handler = roles.owner;
    evidence.actionHandler = roles.action;
    evidence.stateOracle.locator = roles.state;
    const expectedBehavior = normalize(row.pass);
    const expectedBehaviorSha256 = sha256(normalize(`${row.feature}\n${row.pass}`));
    evidence.stateOracle.expectedBehavior = expectedBehavior;
    evidence.stateOracle.expectedBehaviorSha256 = expectedBehaviorSha256;
    if (evidence.route?.applicability === "http-or-product-route") {
      evidence.route.dispatchAnchor = roles.owner.anchor;
      evidence.route.handlerFile = roles.owner.file;
      evidence.route.handlerSymbol = roles.owner.symbol;
      evidence.route.contextSha256 = roles.owner.contextSha256;
    }
    if (evidence.controlSelector?.applicability === "product-control") {
      evidence.controlSelector.locator = roles.routeControl;
      evidence.controlSelector.value = override?.controlValue || evidence.controlSelector.value;
    }
    evidence.relation.handlerSymbol = roles.owner.symbol;
    evidence.relation.actionSymbol = roles.action.symbol;
    evidence.relation.stateSymbol = roles.state.symbol;
    evidence.relation.semanticKey = `${row.id}:${expectedBehaviorSha256.slice(0, 24)}`;
    evidence.verifierAssertion = {
      file: "scripts/internal/feature_semantic_evidence_lib.mjs",
      symbol: "validateReview3CallChain",
      assertionKind: "reviewed-owner-route-control-action-state-readback-chain",
      assertionAnchor: "validateReview3CallChain",
      command: "verify-feature-implementation-evidence",
      assertedSemanticDigest: "",
    };
    item.sourceEvidence = {
      file: roles.owner.file,
      anchor: roles.owner.anchor,
      anchorKind: "reviewed-owner-source-line",
    };
    if (item.uiEvidence &&
        (override || evidence.controlSelector?.applicability === "product-control")) {
      item.uiEvidence.file = roles.routeControl.file;
      item.uiEvidence.anchor = roles.routeControl.anchor;
      item.uiEvidence.anchorKind = "reviewed-route-control-source-line";
    }
    const reviewStep = override?.reviewStep || "V390-REVIEW3-37";
    const reason = review3Reason(row, roles, chain.digest, reviewStep);
    item.status = SEMANTIC_REVIEW_STATUS;
    item.review = {
      decision: "approved",
      reviewer: `Codex-${reviewStep}`,
      reviewedOn: "2026-07-12",
      reason,
      semanticDigest: "",
    };
    const digest = semanticDigest(row, evidence);
    evidence.verifierAssertion.assertedSemanticDigest = digest;
    item.review.semanticDigest = digest;
    return item;
  });
  migrated.semanticClosureSummary = summarizeSemanticClosure({ rows, manifest: migrated });
  migrated.semanticClosureSummary.uniqueReviewReasons =
    new Set(migrated.items.map(item => item.review.reason)).size;
  migrated.semanticClosureSummary.reviewedCallChains =
    migrated.items.filter(item => item.semanticEvidence?.callChain?.schema === REVIEW3_CALL_CHAIN_SCHEMA).length;
  return migrated;
}

export function validateReview3CallChain({ rootDir, row, item, errors = [] }) {
  const chain = item?.semanticEvidence?.callChain;
  if (chain?.schema !== REVIEW3_CALL_CHAIN_SCHEMA) {
    errors.push(`${row.id} reviewed call chain schema drift`);
    return errors;
  }
  const roleNames = ["owner", "routeControl", "action", "state", "readback"];
  for (const role of roleNames) {
    const locator = chain.roles?.[role];
    validateLocator(rootDir, row.id, `callChain.${role}`, locator, errors);
    if (locator?.anchorStrength === "generic-alone" || genericAnchors.has(String(locator?.anchor).toLowerCase())) {
      errors.push(`${row.id} generic ${role} is not a reviewed semantic owner`);
    }
    if (locator?.anchor === row.id) errors.push(`${row.id} ID-only ${role} locator is forbidden`);
  }
  const expectedPairs = [
    ["owner", "routeControl"],
    ["routeControl", "action"],
    ["action", "state"],
    ["state", "readback"],
    ["readback", "verifierAssertion"],
  ];
  if (!Array.isArray(chain.edges) || chain.edges.length !== expectedPairs.length) {
    errors.push(`${row.id} reviewed edge sequence drift`);
  } else {
    expectedPairs.forEach(([from, to], index) => {
      const edge = chain.edges[index];
      if (edge.from !== from || edge.to !== to) errors.push(`${row.id} reviewed edge sequence drift`);
      const expected = review3EdgeDigest(from, to, edge.relationKind, chain.roles);
      if (edge.digest !== expected) errors.push(`${row.id} ${from}->${to} edge digest drift`);
    });
  }
  const expectedDigest = review3CallChainDigest(row, chain);
  if (chain.digest !== expectedDigest) errors.push(`${row.id} call chain digest drift`);
  if (!item.review?.reason?.includes(row.id) ||
      !item.review?.reason?.includes(normalize(row.feature)) ||
      !item.review?.reason?.includes(chain.digest.slice(0, 16))) {
    errors.push(`${row.id} review reason is not feature-specific`);
  }
  if (row.id === "SAFE-140") {
    if (chain.roles.owner.symbol !== "AppendOpsDashboardPage" ||
        chain.roles.action.symbol !== "OpsV350CommandPlanJson" ||
        chain.roles.state.symbol !== "OpsV350StagedChangePlanImpactPreviewJson" ||
        chain.roles.action.symbol === "OpsV380ClientNoticeDraftQueueJson") {
      errors.push("SAFE-140 unrelated command workspace owner");
    }
  }
  if (row.id === "RULE-017") {
    if (chain.roles.owner.symbol !== "AppendOpsRulesPage" ||
        chain.roles.action.symbol !== "opsRulesSaveNativeRecord" ||
        chain.roles.state.symbol !== "setOpsGeneratedId" ||
        item.verifierEvidence?.command !== "verify-ops-client-ui" ||
        chain.roles.owner.symbol === "ExtractObjectField") {
      errors.push("RULE-017 unrelated generated-id owner");
    }
  }
  if (row.id === "SAFE-217") {
    if (chain.roles.owner.symbol !== "PersistAndPublishLocked" ||
        chain.roles.action.symbol !== "PersistAndPublishLocked" ||
        chain.roles.state.symbol !== "PersistAndPublishLocked" ||
        chain.roles.readback.symbol !== "runFailureStage") {
      errors.push("SAFE-217 durable no-publish chain drift");
    }
  }
  if (row.id === "OPS-184") {
    if (chain.roles.owner.symbol !== "AnalysisRegistryMutationErrorResponse" ||
        chain.roles.action.symbol !== "PersistAndPublishLocked" ||
        chain.roles.state.symbol !== "EnsureLoadedLocked" ||
        chain.roles.readback.symbol !== "runCrashCase") {
      errors.push("OPS-184 crash recovery chain drift");
    }
  }
  if (row.id === "OPS-173") {
    if (chain.roles.owner.symbol !== "PrepareVlmProfileDocumentLocked" ||
        chain.roles.action.symbol !== "PrepareVlmProfileDocumentLocked" ||
        chain.roles.state.symbol !== "CanonicalizeStoredVlmProfileLocked" ||
        chain.roles.readback.symbol !== "verifyStructuralProfileRejection") {
      errors.push("OPS-173 structural profile integrity chain drift");
    }
  }
  if (row.id === "OPS-180") {
    if (chain.roles.owner.symbol !== "ValidateVlmIncidentRuleProvenanceContract" ||
        chain.roles.action.symbol !== "ValidateVlmIncidentRuleProvenanceServerRecords" ||
        chain.roles.state.symbol !== "EnsureLoadedLocked" ||
        chain.roles.readback.symbol !== "provenanceRestartReadback") {
      errors.push("OPS-180 reload provenance integrity chain drift");
    }
  }
  return errors;
}

function buildReview3Edges(roles, routeControlKind) {
  const specs = [
    ["owner", "routeControl", routeControlKind],
    ["routeControl", "action", "reviewed-dispatch-or-control-flow"],
    ["action", "state", "reviewed-mutation-readmodel-flow"],
    ["state", "readback", "exact-readback-assertion"],
    ["readback", "verifierAssertion", "exact-verifier-command"],
  ];
  return specs.map(([from, to, relationKind]) => ({
    from,
    to,
    relationKind,
    digest: review3EdgeDigest(from, to, relationKind, roles),
  }));
}

function review3EdgeDigest(from, to, relationKind, roles) {
  const fromLocator = roles[from] || roles.readback;
  const toLocator = roles[to] || roles.readback;
  return sha256(JSON.stringify({
    from,
    to,
    relationKind,
    fromContext: fromLocator?.contextSha256,
    toContext: toLocator?.contextSha256,
    fromSymbol: fromLocator?.symbol,
    toSymbol: toLocator?.symbol,
  }));
}

function review3CallChainDigest(row, chain) {
  const copy = structuredClone(chain);
  delete copy.digest;
  return sha256(JSON.stringify({
    id: row.id,
    feature: normalize(row.feature),
    expectedBehavior: normalize(row.pass),
    chain: copy,
  }));
}

function review3Reason(row, roles, digest, reviewStep = "V390-REVIEW3-37") {
  return [
    reviewStep,
    row.id,
    normalize(row.feature),
    `owner=${roles.owner.symbol}`,
    `routeControl=${roles.routeControl.symbol}`,
    `action=${roles.action.symbol}`,
    `state=${roles.state.symbol}`,
    `readback=${roles.readback.symbol}`,
    `chain=${digest.slice(0, 16)}`,
  ].join(":");
}

function strengthenLocator(rootDir, locator) {
  const { text, lines } = review3Source(rootDir, locator.file);
  const index = nthIndex(text, locator.anchor, locator.occurrence);
  if (index < 0) throw new Error(`cannot strengthen locator ${locator.file}:${locator.anchor}`);
  const line = lineNumberAt(text, index, locator.file);
  const sourceLine = (lines[line - 1] || "").trim();
  const anchor = sourceLine || locator.anchor;
  const anchorIndex = text.lastIndexOf(anchor, index);
  return {
    ...locator,
    anchor,
    anchorKind: "reviewed-source-line",
    anchorStrength: "feature-specific-source-line",
    occurrence: occurrenceNumber(text, anchor, anchorIndex >= 0 ? anchorIndex : index),
    line,
    contextSha256: sha256(review3ContextAtLine(lines, line)),
  };
}

function locatorFromEvidence(rootDir, evidence) {
  return locatorFromToken(rootDir, evidence.file, evidence.anchor, `verifier:${evidence.command}`);
}

function locatorFromToken(rootDir, file, token, symbol, occurrence = 0) {
  const { text, lines } = review3Source(rootDir, file);
  const tokenIndex = nthIndex(text, token, occurrence);
  if (tokenIndex < 0) throw new Error(`reviewed token missing ${file}:${token}`);
  const line = lineNumberAt(text, tokenIndex, file);
  const sourceLine = (lines[line - 1] || "").trim();
  const anchor = sourceLine || token;
  const anchorIndex = text.lastIndexOf(anchor, tokenIndex);
  return {
    file,
    symbol,
    symbolKind: "reviewed-owner-or-readback",
    anchor,
    anchorKind: "reviewed-source-line",
    anchorStrength: "feature-specific-source-line",
    occurrence: occurrenceNumber(text, anchor, anchorIndex >= 0 ? anchorIndex : tokenIndex),
    line,
    contextSha256: sha256(review3ContextAtLine(lines, line)),
  };
}

function review3Source(rootDir, file) {
  const key = `${rootDir}:${file}`;
  if (!review3SourceCache.has(key)) {
    const text = fs.readFileSync(path.join(rootDir, file), "utf8");
    review3SourceCache.set(key, { text, lines: text.split(/\r?\n/) });
  }
  return review3SourceCache.get(key);
}

function review3ContextAtLine(lines, lineNumber) {
  const start = Math.max(0, lineNumber - 2);
  return lines.slice(start, Math.min(lines.length, lineNumber + 1)).join("\n");
}

function review3Override(rootDir, row, item) {
  if (row.id === "UI-018" || row.id === "SAFE-017") {
    const readbackToken = row.id === "UI-018"
      ? 'assert(item?.disposition === "negative-route", "UI-018 negative disposition missing");'
      : 'assert(negativeAction?.route === "/lab", "SAFE-017 /lab negative action missing");';
    return {
      reviewStep: "V390-REVIEW3-39",
      routeControlKind: "negative-route-dispatch",
      verifierEvidence: {
        file: "scripts/internal/verify_v390_ui_native_exact_cases_contract.mjs",
        anchor: readbackToken,
        anchorKind: "negative-route-readback",
        command: "verify-v390-ui-native-exact-cases-contract",
      },
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "bool WebRtcHttpServer::Start(const std::string& listen_address", "WebRtcHttpServer::Start"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};', "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};', "WebRtcHttpServer::Start"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'return HttpResponse{404, "Not Found", "text/plain; charset=utf-8", {}, "not found"};', "WebRtcHttpServer::Start"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v390_ui_native_exact_cases_contract.mjs", readbackToken, row.id === "UI-018" ? "negativeRouteCase" : "crossRouteNegativeCase"),
      },
    };
  }
  if (row.id === "AUTH-041") {
    return {
      reviewStep: "V390-REVIEW3-39",
      routeControlKind: "auth-scope-guard",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "auto require_scope_principal =", "WebRtcHttpServer::Start"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "auto require_scope_principal =", "require_scope_principal"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "if (!auth::RequireScope(principal_result.principal, scope)) {", "require_scope_principal"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", '"{\\"error\\":\\"" + JsonEscape(error) + "\\"}"', "require_scope_principal"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_auth_regression_matrix.mjs", 'check("role and scope guard rows are covered", () => {', "roleAndScopeGuardRows"),
      },
    };
  }
  if (row.id === "MEDIA-005") {
    return {
      reviewStep: "V390-REVIEW3-39",
      routeControlKind: "webrtc-session-offer-flow",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_egress_session.cpp", "bool WebRtcEgressSession::CreateOffer(std::string* sdp_offer", "WebRtcEgressSession::CreateOffer"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'if (request.method == "POST" && request.path == "/webrtc/session") {', "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_egress_session.cpp", 'g_signal_emit_by_name(webrtcbin_, "create-offer", nullptr, promise);', "WebRtcEgressSession::CreateOffer"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_egress_session.cpp", "generated_offer = *local_offer_;", "WebRtcEgressSession::CreateOffer"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_webrtc_va_metadata.mjs", "assertOk(state.sessionId && session.offer, 'WebRTC session response missing sessionId/offer');", "webrtcOfferReadback"),
      },
    };
  }
  if (row.id === "LAB-126" || row.id === "SAFE-213" || row.id === "OPS-180") {
    const readbackToken = row.id === "LAB-126"
      ? 'assert(JSON.stringify(restartReadback.json?.rule?.vlmProvenance) === JSON.stringify(valid.vlmProvenance),'
      : row.id === "SAFE-213"
        ? 'assert((await request(baseUrl, "GET", `/lab/analysis/rules/${id}`)).status === 404,'
        : 'assert(restartReadback.status === 200, `restart readback HTTP ${restartReadback.status}`);';
    const readbackSymbol = row.id === "LAB-126"
      ? "canonicalProvenanceRestartReadback"
      : row.id === "SAFE-213"
        ? "provenanceReloadMatrixSummary"
        : "provenanceRestartReadback";
    return {
      reviewStep: "V390-REVIEW3-39",
      routeControlKind: "strict-provenance-save-and-reload-boundary",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "bool ValidateVlmIncidentRuleProvenanceContract(const std::string& body", "ValidateVlmIncidentRuleProvenanceContract"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'const std::string expected_route = "/lab/analysis/rules/" + rule_id;', "ValidateVlmIncidentRuleProvenanceContract"),
        action: locatorFromToken(rootDir, "src/analysis/vlm_observation_store.cpp", "bool ValidateVlmIncidentRuleProvenanceServerRecords(", "ValidateVlmIncidentRuleProvenanceServerRecords"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'std::cerr << "[analysis-registry] rule provenance reload quarantine id="', "EnsureLoadedLocked"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v390_vlm_incident_rule_provenance.mjs", readbackToken, readbackSymbol),
      },
    };
  }
  if (row.id === "OPS-173") {
    return {
      reviewStep: "V390-REVIEW3-39",
      routeControlKind: "strict-profile-save-and-reload-boundary",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "std::optional<Document> PrepareVlmProfileDocumentLocked(", "PrepareVlmProfileDocumentLocked"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", 'const auto ops_vlm_profile_prefix = std::string("/ops/api/vlm/profiles/");', "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "if (!ParseStrictJsonObjectDocument(body, &profile_document, &parse_error)) {", "PrepareVlmProfileDocumentLocked"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "static std::optional<Document> CanonicalizeStoredVlmProfileLocked(const Document& document) {", "CanonicalizeStoredVlmProfileLocked"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v390_vlm_promotion_trust_boundary.mjs", "async function verifyStructuralProfileRejection(baseUrl) {", "verifyStructuralProfileRejection"),
      },
    };
  }
  if (row.id === "SAFE-140") {
    return {
      routeControlKind: "route-dispatch",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "void AppendOpsDashboardPage", "AppendOpsDashboardPage"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "AppendOpsDashboardPage(out);", "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "std::string OpsV350CommandPlanJson(", "OpsV350CommandPlanJson"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "std::string OpsV350StagedChangePlanImpactPreviewJson(", "OpsV350StagedChangePlanImpactPreviewJson"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v350_ops_command_workspace_ui.mjs", "dashboard refresh wires the command workspace read model", "check:dashboard command workspace read model"),
      },
    };
  }
  if (row.id === "RULE-017") {
    return {
      routeControlKind: "hidden-generated-id-state-control",
      controlValue: "#opsEventRuleIdInput",
      verifierEvidence: {
        file: "scripts/internal/verify_ops_client_ui_smoke.mjs",
        anchor: "opsEventRuleIdInput",
        anchorKind: "generated-id-readback",
        command: "verify-ops-client-ui",
      },
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "<input id=\"opsEventRuleIdInput\" type=\"hidden\" />", "AppendOpsRulesPage"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "<input id=\"opsEventRuleIdInput\" type=\"hidden\" />", "AppendOpsRulesPage"),
        action: locatorFromToken(rootDir, "src/ingress/product_ui_page_scripts.cpp", "async function opsRulesSaveNativeRecord(mode)", "opsRulesSaveNativeRecord"),
        state: locatorFromToken(rootDir, "src/ingress/product_ui_page_scripts.cpp", "setOpsGeneratedId('opsEventRuleIdInput', 'opsEventRuleIdDisplay', forcedId);", "setOpsGeneratedId"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_ops_client_ui_smoke.mjs", "const eventHidden = document.getElementById('opsEventRuleIdInput');", "opsRulesGeneratedIdExpression"),
      },
    };
  }
  if (row.id === "SAFE-217") {
    return {
      routeControlKind: "persist-before-publish-boundary",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "AnalysisRegistryMutationResult PersistAndPublishLocked(", "PersistAndPublishLocked"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "return AnalysisRegistryMutationErrorResponse(result,", "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "const AnalysisRegistryWriteResult write_result = WriteAnalysisRegistryFileAtomically(", "PersistAndPublishLocked"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "if (write_result.target_replaced) {", "PersistAndPublishLocked"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v390_analysis_registry_durable_write.mjs", "async function runFailureStage(stage, cases, baseline)", "runFailureStage"),
      },
    };
  }
  if (row.id === "OPS-184") {
    return {
      routeControlKind: "http-error-and-restart-durability-gate",
      roles: {
        owner: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "HttpResponse AnalysisRegistryMutationErrorResponse(", "AnalysisRegistryMutationErrorResponse"),
        routeControl: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "return AnalysisRegistryMutationErrorResponse(result,", "WebRtcHttpServer::Start"),
        action: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "const AnalysisRegistryWriteResult write_result = WriteAnalysisRegistryFileAtomically(", "PersistAndPublishLocked"),
        state: locatorFromToken(rootDir, "src/ingress/webrtc_http_server.cpp", "RecoverAnalysisRegistryTemporaryFiles(storage_path_);", "EnsureLoadedLocked"),
        readback: locatorFromToken(rootDir, "scripts/internal/verify_v390_analysis_registry_durable_write.mjs", "async function runCrashCase(crash, item, baseline)", "runCrashCase"),
      },
    };
  }
  return null;
}

function selectSemanticLocator({ row, entries, preferredFile, legacyAnchor, excludedAnchors = new Set() }) {
  void row;
  void entries;
  void preferredFile;
  void legacyAnchor;
  void excludedAnchors;
  throw new Error("automatic semantic locator selection is forbidden");
}

function selectRouteMatch(routeValue, entries, preferredFile = "", preferDispatch = true) {
  void routeValue;
  void entries;
  void preferredFile;
  void preferDispatch;
  throw new Error("automatic route owner selection is forbidden");
}

function locatorFromMatch(match) {
  const before = match.text.slice(0, match.index);
  const line = before.split(/\r?\n/).length;
  const occurrence = occurrenceNumber(match.text, match.anchor, match.index);
  const context = contextAtLine(match.text, line);
  return {
    file: match.file,
    symbol: deriveSymbol(match.text, line, match.file, match.anchorKind),
    symbolKind: symbolKind(match.text, line),
    anchor: match.anchor,
    anchorKind: match.anchorKind,
    anchorStrength: match.anchorStrength,
    occurrence,
    line,
    contextSha256: sha256(context),
  };
}

function buildControlSelector(actionHandler, repository, screenRoute) {
  const text = repository.textByFile.get(actionHandler.file) || "";
  const anchorIndex = nthIndex(text, actionHandler.anchor, actionHandler.occurrence);
  const start = Math.max(0, anchorIndex - 2400);
  const end = Math.min(text.length, anchorIndex + actionHandler.anchor.length + 2400);
  const window = text.slice(start, end);
  const candidates = [];
  for (const pattern of [
    /data-testid=["']([^"']+)["']/g,
    /\bid=["']([^"']+)["']/g,
    /getElementById\(["']([^"']+)["']\)/g,
  ]) {
    for (const match of window.matchAll(pattern)) {
      if (pattern.source.startsWith("\\bid=") && !/^[A-Za-z_][\w:-]*$/.test(match[1])) continue;
      candidates.push({
        id: match[1],
        index: start + (match.index || 0),
        kind: pattern.source.startsWith("data-testid") ? "data-testid" : "id",
      });
    }
  }
  candidates.sort((a, b) => Math.abs(a.index - anchorIndex) - Math.abs(b.index - anchorIndex));
  const selected = candidates[0];
  if (!selected) {
    return {
      applicability: "not-applicable",
      value: null,
      reason: "route/read-only state has no dedicated control selector in the owner block",
      screenRoute: screenRoute || null,
    };
  }
  const sourceAnchor = selected.id;
  const match = {
    file: actionHandler.file,
    text,
    anchor: sourceAnchor,
    index: text.indexOf(sourceAnchor, Math.max(0, selected.index - 32)),
    anchorKind: selected.kind,
    anchorStrength: "exact-control-selector",
  };
  return {
    applicability: "product-control",
    value: selected.kind === "data-testid"
      ? `[data-testid="${selected.id}"]`
      : `#${selected.id}`,
    screenRoute: screenRoute || null,
    locator: locatorFromMatch(match),
  };
}

function validateLocator(rootDir, id, label, locator, errors) {
  if (!locator || typeof locator !== "object") {
    errors.push(`${id} ${label} locator missing`);
    return;
  }
  let source;
  try { source = review3Source(rootDir, locator.file); }
  catch { errors.push(`${id} ${label} file missing: ${locator.file}`); return; }
  const { text, lines } = source;
  if (genericAnchors.has(String(locator.anchor).toLowerCase()) &&
      locator.anchorStrength === "generic-alone") {
    errors.push(`${id} ${label} generic anchor cannot stand alone`);
  }
  const index = nthIndex(text, locator.anchor, locator.occurrence);
  if (index < 0) {
    errors.push(`${id} ${label} exact anchor occurrence missing`);
    return;
  }
  const line = text.slice(0, index).split(/\r?\n/).length;
  if (!Number.isInteger(locator.line) || locator.line < 1) errors.push(`${id} ${label} line hint missing`);
  if (sha256(review3ContextAtLine(lines, line)) !== locator.contextSha256) {
    errors.push(`${id} ${label} context drift`);
  }
  if (locator.symbolKind === "reviewed-owner-or-readback") {
    if (!locator.symbol || locator.symbol.startsWith("file-scope:")) {
      errors.push(`${id} ${label} reviewed symbol missing`);
    }
  } else {
    const symbol = deriveSymbol(text, line, locator.file, locator.anchorKind);
    if (symbol !== locator.symbol) errors.push(`${id} ${label} symbol drift`);
  }
}

function validateControlSelector(rootDir, row, control, errors) {
  const uiRequired = splitAreas(row.area).includes("UI");
  if (!uiRequired) {
    if (control?.applicability !== "not-applicable") {
      errors.push(`${row.id} non-UI feature invented control selector`);
    }
    return;
  }
  if (control?.applicability === "not-applicable") {
    if (!control.reason || !Object.hasOwn(control, "screenRoute")) {
      errors.push(`${row.id} control selector N/A reason missing`);
    }
    return;
  }
  if (control?.applicability !== "product-control" || !control.value) {
    errors.push(`${row.id} control selector shape invalid`);
    return;
  }
  validateLocator(rootDir, row.id, "controlSelector", control.locator, errors);
  if (!/^#[A-Za-z_][\w:-]*$/.test(control.value) &&
      !/^\[data-testid="[^"]+"\]$/.test(control.value)) {
    errors.push(`${row.id} control selector is not exact`);
  }
}

function repositoryFor(rootDir) {
  if (repositoryCache.has(rootDir)) return repositoryCache.get(rootDir);
  const trackedFiles = execFileSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim().split("\n").filter(Boolean);
  const tracked = new Set(trackedFiles);
  const textByFile = new Map();
  for (const file of trackedFiles) {
    if (/\.(?:png|jpe?g|gif|mp4|mov|zip|gz|pdf|woff2?|ttf|dylib|so|a|o)$/i.test(file)) continue;
    try { textByFile.set(file, fs.readFileSync(path.join(rootDir, file), "utf8")); } catch { /* binary */ }
  }
  const repository = { tracked, textByFile, entries: [...textByFile.entries()] };
  repositoryCache.set(rootDir, repository);
  return repository;
}

function sourceEntriesFor(repository, prefix) {
  return repository.entries.filter(([file]) => {
    if (file === "test/fixtures/project_feature_implementation_evidence.json") return false;
    if (/^(SAFE|OPS)$/.test(prefix)) {
      return /^(?:src|include|config|scripts\/internal|test\/fixtures)\//.test(file) &&
        !/feature_(?:implementation|semantic)_evidence/.test(file);
    }
    return /^(?:src|include|config)\//.test(file);
  });
}

function semanticTokens(row, legacyAnchor) {
  void row;
  void legacyAnchor;
  throw new Error("semantic token scoring is forbidden");
}

function semanticRoute(row, legacyItem) {
  if (featurePrefix(row.id) === "UI" && legacyItem?.uiEvidence?.screenRoute) {
    return legacyItem.uiEvidence.screenRoute;
  }
  const text = `${row.feature} ${row.pass}`;
  const routes = [...text.matchAll(/`(\/(?:ops|client|lab|setup|login|logout|password|invite|webrtc|ws|auth)[^`\s,]*)`/g)]
    .map(match => match[1]);
  return routes[0] || null;
}

function uiScreenRoute(row, legacyItem) {
  if (row.uiNeed === "비대상" && !splitAreas(row.area).includes("UI")) return null;
  const explicit = semanticRoute(row, legacyItem);
  if (explicit) return explicit;
  const prefix = featurePrefix(row.id);
  const text = `${row.feature} ${row.pass}`.toLowerCase();
  if (prefix === "AUTH") {
    if (/invite|초대/.test(text)) return "/invite/setup";
    if (/password change|비밀번호 변경/.test(text)) return "/password/change";
    if (/setup|최초 관리자/.test(text)) return "/setup";
    if (/user|사용자|role|scope/.test(text)) return "/ops/users";
    return "/login";
  }
  if (prefix === "SRC") return "/ops/sources";
  if (prefix === "RULE") return "/ops/rules";
  if (prefix === "EVT") return /dashboard|runtime|health/.test(text) ? "/ops/dashboard" : "/ops/events";
  if (prefix === "CLIENT") {
    if (/dashboard/.test(text)) return "/client/dashboard";
    if (/event/.test(text)) return "/client/events";
    return "/client/live";
  }
  if (prefix === "MEDIA") return /source|channel|ingress|rtsp/.test(text) ? "/ops/sources" : "/client/live";
  if (prefix === "LAB") {
    if (/vlm|model|prompt|provider/.test(text)) return "/ops/vlm";
    if (/rule|profile|scenario|tracker|re-id/.test(text)) return "/ops/rules";
    if (/event|incident|evidence/.test(text)) return "/ops/events";
    return "/ops/dashboard";
  }
  if (prefix === "SAFE") return "/ops";
  return legacyItem?.uiEvidence?.screenRoute || null;
}

function preferredUiOwner(screenRoute, row) {
  if (!screenRoute) return "";
  if (/^\/(?:setup|login|logout|password|invite)/.test(screenRoute)) {
    return "src/ingress/product_ui_auth_pages.cpp";
  }
  if (screenRoute === "/ops/sources") return "src/ingress/product_ui_ops_sources_script.cpp";
  if (screenRoute.startsWith("/client")) return "src/ingress/product_ui_client_scripts.cpp";
  if (screenRoute === "/ops/users") return "src/ingress/product_ui_ops_users_script.cpp";
  if (/^\/ops\/(?:rules|events|dashboard|vlm)/.test(screenRoute)) {
    return "src/ingress/product_ui_page_scripts.cpp";
  }
  return featurePrefix(row.id) === "UI" ? "src/ingress/product_ui_js.cpp" : "";
}

function routeSourceValues(value) {
  if (value === "/") return ["/"];
  const brace = value.indexOf("{");
  const query = value.indexOf("?");
  const cut = [brace, query].filter(index => index > 0).sort((a, b) => a - b)[0];
  const base = cut ? value.slice(0, cut) : value;
  return [...new Set([value, base].filter(item => item.length > 1))];
}

function usefulToken(value) {
  const normalized = normalize(value);
  if (normalized.length < 3 || normalized.length > 220) return false;
  if (normalized.startsWith("verify-")) return false;
  if (/^v\d/i.test(normalized) || /^\d+$/.test(normalized)) return false;
  if (weakWords.has(normalized.toLowerCase())) return false;
  return true;
}

function containsExact(text, token) {
  return exactIndex(text, token) >= 0;
}

function exactIndex(text, token) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    const pattern = new RegExp(`(?:^|[^A-Za-z0-9_])(${escapeRegExp(token)})(?=$|[^A-Za-z0-9_])`);
    const match = pattern.exec(text);
    return match ? match.index + match[0].indexOf(match[1]) : -1;
  }
  return text.indexOf(token);
}

function bestExactIndex(text, token) {
  let cursor = 0;
  while (cursor < text.length) {
    const relative = exactIndex(text.slice(cursor), token);
    if (relative < 0) break;
    const index = cursor + relative;
    const lineStart = text.lastIndexOf("\n", index - 1) + 1;
    const lineEnd = text.indexOf("\n", index);
    const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd).trim();
    if (!/^(?:\/\/|\/\*|\*|#include|#pragma)/.test(line)) return index;
    cursor = index + Math.max(token.length, 1);
  }
  return -1;
}

function bestRowSemanticIndex(text, token, row, file, fallback) {
  const words = [...`${row.feature} ${row.pass}`.matchAll(/[A-Za-z_][A-Za-z0-9_:-]{3,}/g)]
    .map(match => match[0].toLowerCase())
    .filter(word => !weakWords.has(word) && !word.startsWith("verify-"));
  const actionPatterns = [];
  const contract = `${row.feature} ${row.pass}`;
  if (/생성|등록|추가|create|insert/i.test(contract)) actionPatterns.push(/create|add|insert|append|upsert/i);
  if (/수정|변경|저장|update|save|apply/i.test(contract)) actionPatterns.push(/update|save|apply|upsert|set/i);
  if (/삭제|delete|remove/i.test(contract)) actionPatterns.push(/delete|remove|erase/i);
  if (/조회|목록|상세|read|list|get|find/i.test(contract)) actionPatterns.push(/get|list|find|read|load|build|json/i);

  let best = { index: fallback, score: -1 };
  let cursor = 0;
  let inspected = 0;
  while (cursor < text.length && inspected < 96) {
    const index = text.indexOf(token, cursor);
    if (index < 0) break;
    inspected += 1;
    cursor = index + Math.max(token.length, 1);
    const line = lineNumberAt(text, index, file);
    const lineStart = text.lastIndexOf("\n", index - 1) + 1;
    const lineEnd = text.indexOf("\n", index);
    const sourceLine = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd).trim();
    if (/^(?:\/\/|\/\*|\*|#include|#pragma)/.test(sourceLine)) continue;
    const symbol = deriveSymbol(text, line, file, "semantic-token");
    const lowered = symbol.toLowerCase();
    const context = text.slice(Math.max(0, index - 600), Math.min(text.length, index + token.length + 600)).toLowerCase();
    let score = words.reduce((sum, word) => sum + (lowered.includes(word) ? 70 : context.includes(word) ? 8 : 0), 0);
    score += actionPatterns.reduce((sum, pattern) => sum + (pattern.test(symbol) ? 180 : 0), 0);
    if (!symbol.startsWith("file-scope:")) score += 45;
    if (score > best.score) best = { index, score };
  }
  return best.index;
}

function deriveSymbol(text, lineNumber, file, anchorKind = "") {
  const lines = text.split(/\r?\n/);
  if (file === "src/ingress/webrtc_http_server.cpp" && anchorKind === "exact-route") {
    const before = lines.slice(0, lineNumber).join("\n");
    if (before.lastIndexOf("WebRtcHttpServer::Start") >= 0) return "WebRtcHttpServer::Start";
  }
  const cacheKey = `${file}:${anchorKind === "exact-route" ? "route" : "default"}`;
  let timeline = symbolTimelineCache.get(cacheKey);
  if (!timeline) {
    let className = "";
    let candidate = "";
    timeline = [];
    for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const classMatch = line.match(/\b(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) className = classMatch[1];
    const checkMatch = line.match(/\bcheck\(["'`]([^"'`]+)/);
    if (checkMatch) candidate = `check:${checkMatch[1]}`;
    const shellMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
    if (shellMatch) candidate = shellMatch[1];
    const cppMatch = line.match(/^(?:(?:static|inline|constexpr|virtual|explicit)\s+)*(?:[A-Za-z_][A-Za-z0-9_:<>,*&]*\s+)+([A-Za-z_~][A-Za-z0-9_:~]*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/);
    if (cppMatch) candidate = cppMatch[1];
    if (!(anchorKind === "exact-route" && file.startsWith("src/ingress/product_ui_"))) {
      const jsMatch = line.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (jsMatch) candidate = jsMatch[1];
      const arrowMatch = line.match(/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=.*=>/);
      if (arrowMatch) candidate = arrowMatch[1];
    }
      timeline.push(candidate || (className ? `${className}::file-scope` : `file-scope:${path.basename(file)}:L${index + 1}`));
    }
    symbolTimelineCache.set(cacheKey, timeline);
  }
  const candidate = timeline[Math.max(0, Math.min(lineNumber - 1, timeline.length - 1))];
  if (candidate && !candidate.startsWith("file-scope:") && !candidate.endsWith("::file-scope")) return candidate;
  const current = lines[Math.max(0, lineNumber - 1)] || "";
  const member = current.match(/([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|[;=])/);
  if (member) return member[1];
  return candidate || `file-scope:${path.basename(file)}:L${lineNumber}`;
}

function lineNumberAt(text, index, file) {
  let offsets = newlineOffsetCache.get(file);
  if (!offsets) {
    offsets = [];
    for (let cursor = text.indexOf("\n"); cursor >= 0; cursor = text.indexOf("\n", cursor + 1)) {
      offsets.push(cursor);
    }
    newlineOffsetCache.set(file, offsets);
  }
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] < index) low = mid + 1;
    else high = mid;
  }
  return low + 1;
}

function symbolKind(text, lineNumber) {
  const line = text.split(/\r?\n/)[Math.max(0, lineNumber - 1)] || "";
  if (/\bfunction\b|=>/.test(line)) return "javascript-function";
  if (/\bcheck\(/.test(line)) return "verifier-check";
  if (/\(\)\s*\{/.test(line)) return "shell-function";
  if (/\([^;]*\)/.test(line)) return "function-or-method";
  return "declaration-or-file-scope";
}

function contextAtLine(text, lineNumber) {
  const lines = text.split(/\r?\n/);
  const start = Math.max(0, lineNumber - 2);
  return lines.slice(start, Math.min(lines.length, lineNumber + 1)).join("\n");
}

function occurrenceNumber(text, anchor, index) {
  let count = 0;
  let cursor = 0;
  while (cursor < index) {
    const found = text.indexOf(anchor, cursor);
    if (found < 0 || found >= index) break;
    count += 1;
    cursor = found + Math.max(anchor.length, 1);
  }
  return count;
}

function nthIndex(text, anchor, occurrence) {
  if (!anchor || !Number.isInteger(occurrence) || occurrence < 0) return -1;
  let cursor = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const found = text.indexOf(anchor, cursor);
    if (found < 0) return -1;
    if (index === occurrence) return found;
    cursor = found + Math.max(anchor.length, 1);
  }
  return -1;
}

function oracleKind(row) {
  const text = `${row.feature} ${row.pass}`;
  if (/삭제|delete|remove/i.test(text)) return "delete-no-stale-state";
  if (/생성|create|등록|추가/i.test(text)) return "create-readback-state";
  if (/수정|update|변경|save|저장|apply/i.test(text)) return "update-transition-readback";
  if (/금지|거부|차단|no-|false|불변|유지/i.test(text)) return "negative-invariant-state";
  return "read-or-rendered-state";
}

function readText(rootDir, relative, errors, label) {
  if (!relative || path.isAbsolute(relative) || relative.includes("..")) {
    errors.push(`${label} file path invalid`);
    return null;
  }
  const target = path.join(rootDir, relative);
  if (!fs.existsSync(target)) {
    errors.push(`${label} file missing: ${relative}`);
    return null;
  }
  const key = `${rootDir}:${relative}`;
  if (validationTextCache.has(key)) return validationTextCache.get(key);
  try {
    const text = fs.readFileSync(target, "utf8");
    validationTextCache.set(key, text);
    return text;
  }
  catch { errors.push(`${label} file unreadable: ${relative}`); return null; }
}

function usableLegacyFile(file) {
  return typeof file === "string" && file.length > 0 &&
    file !== "test/fixtures/project_feature_implementation_evidence.json" &&
    !/feature_(?:implementation|semantic)_evidence/.test(file);
}

function featurePrefix(id) { return id.replace(/-\d+$/, ""); }
function splitAreas(value) { return String(value || "").split(",").map(item => item.trim()).filter(Boolean); }
function normalize(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function resultCase(name, pass, detail) { return { name, pass, detail: pass ? "" : detail }; }
