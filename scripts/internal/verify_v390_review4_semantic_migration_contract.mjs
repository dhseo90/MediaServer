#!/usr/bin/env node
// 파일 용도: REVIEW4 server verifier trust의 row-local migration과 carry-forward 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildReview4TrustBindings,
  parseVerifiedReview4Dispatch,
  review4HardCandidateItems,
  review4SourceFlowDigest,
  stableStringify,
} from "./feature_semantic_review4_trust_lib.mjs";
import { replaceJsonFixturesAtomically } from "./feature_semantic_review4_apply.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const producerPath = path.join(rootDir, "scripts/internal/produce_v390_review4_migration_aware_approvals.mjs");
const producerSource = fs.readFileSync(producerPath, "utf8");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`V390 REVIEW4 semantic migration contract

Usage:
  ./server.sh verify-v390-review4-semantic-migration-contract
  node scripts/internal/verify_v390_review4_semantic_migration_contract.mjs --baseline PATH --fresh PATH [--trust-rebind-id ID] [--report PATH] [--write-evidence PATH]

The no-argument form runs only positive/negative binding self-tests. The delta form compares
all semantic fields deterministically; it reports carry-forward-eligible and independent-review
required IDs. --trust-rebind-id declares a current trust-binding drift that remains independently
reviewable even when feature/pass/status/sourceFlow are unchanged. --write-evidence writes only a versioned carry-forward evidence file; it never
writes an audit, approval ledger, decision artifact, or manifest.`);
}
assertKnownOptions(args, ["baseline", "fresh", "trust-rebind-id", "report", "write-evidence", "h", "help"]);

const baselinePath = optionValue("baseline");
const freshPath = optionValue("fresh");
const reportPath = optionValue("report");
const evidencePath = optionValue("write-evidence");
const trustRebindIds = optionValues("trust-rebind-id");
if (Boolean(baselinePath) !== Boolean(freshPath)) throw new Error("--baseline and --fresh must be supplied together");
if (reportPath && !baselinePath) throw new Error("--report requires --baseline and --fresh");
if (evidencePath && !baselinePath) throw new Error("--write-evidence requires --baseline and --fresh");
if (trustRebindIds.length > 0 && !baselinePath) throw new Error("--trust-rebind-id requires --baseline and --fresh");
if (new Set(trustRebindIds).size !== trustRebindIds.length) throw new Error("duplicate --trust-rebind-id");

runBindingContract();
runTrustRebindPartitionContract();
runFixtureTransactionContract();
runProducerInputPathContract();
runProducerReviewedOnContract();
runProducerSnapshotBindingContract();
let delta = null;
if (baselinePath) {
  delta = buildDelta(readAudit(baselinePath), readAudit(freshPath), { trustRebindIds });
  if (reportPath) {
    const absolute = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(delta, null, 2)}\n`);
  }
  if (evidencePath) writeMigrationEvidence(path.resolve(evidencePath), delta);
}

console.log("== V390 REVIEW4 semantic migration contract ==");
console.log("- positive/negative bindings: 9");
console.log("- trust-only migration bindings: 6");
console.log("- semantic/native transaction bindings: 2");
console.log("- producer input-path bindings: 5");
console.log("- producer entrypoint negative smoke: 1");
console.log("- producer reviewedOn contract: 1");
console.log("- producer snapshot/trust preflight: 6");
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

    // 무관한 command arm 추가와 line-only 이동은 bound arm 불변을 유지한다.
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

function runFixtureTransactionContract() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-review4-fixture-transaction-"));
  try {
    const names = ["audit.json", "approval.json", "implementation.json", "native.json"];
    const targets = names.map(name => path.join(temp, name));
    const initialBytes = names.map((name, index) => `${JSON.stringify({ name, generation: 0, index }, null, 2)}\n`);
    for (let index = 0; index < targets.length; index += 1) fs.writeFileSync(targets[index], initialBytes[index]);
    const replacements = targets.map((target, index) => [target, { name: names[index], generation: 1, index }]);

    replaceJsonFixturesAtomically({
      replacements,
      validateReadback: () => {
        for (let index = 0; index < targets.length; index += 1) {
          const value = JSON.parse(fs.readFileSync(targets[index], "utf8"));
          assert(value.generation === 1 && value.index === index,
            `successful fixture transaction readback drift: ${names[index]}`);
        }
      },
    });
    for (let index = 0; index < targets.length; index += 1) fs.writeFileSync(targets[index], initialBytes[index]);

    let failure = "";
    try {
      replaceJsonFixturesAtomically({ replacements, failAfterReplacement: 1 });
    } catch (error) {
      failure = String(error?.message || error);
    }
    assert(failure.includes("injected fixture transaction failure"),
      "mid-transaction failure fixture did not fail");
    for (let index = 0; index < targets.length; index += 1) {
      assert(fs.readFileSync(targets[index], "utf8") === initialBytes[index],
        `mid-transaction rollback did not restore exact bytes: ${names[index]}`);
    }
    assert(fs.readdirSync(temp).every(name => !name.includes(".transaction-")),
      "fixture transaction left temporary or backup files");

    const producer = fs.readFileSync(path.join(rootDir,
      "scripts/internal/produce_v390_review4_migration_aware_approvals.mjs"), "utf8");
    for (const token of [
      "buildNativeExactManifest", "validateNativeExactManifest", "nativeRelative",
      "replaceJsonFixturesAtomically", "atomic semantic/native fixture readback drift",
    ]) assert(producer.includes(token), `migration producer missing semantic/native transaction token: ${token}`);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function runProducerInputPathContract() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-review4-producer-input-path-"));
  try {
    const resolveInputPath = evaluateProducerFunction("resolveInputPath", ["path", "rootDir"],
      [path, rootDir]);
    const readInputJson = evaluateProducerFunction("readInputJson",
      ["fs", "resolveInputPath", "readJson"],
      [fs, resolveInputPath, file => JSON.parse(fs.readFileSync(file, "utf8"))]);
    const absolute = path.join(temp, "absolute-migration.json");
    const relative = path.relative(rootDir, path.join(rootDir, "test/fixtures/v390_review4_semantic_migration_evidence_v1.json"));
    fs.writeFileSync(absolute, '{"absolute":true}\n');
    assert(resolveInputPath(absolute) === path.normalize(absolute),
      "/private/tmp absolute migration path was recombined below the repository root");
    assert(resolveInputPath(relative) === path.resolve(rootDir, relative),
      "repository-relative producer input did not resolve below the repository root");

    for (const token of [
      'readInputJson("prior-audit", priorAuditPath)',
      'readInputJson("migration-evidence", migrationPath)',
      'readInputJson("decisions", decisionsPath)',
      'readInputJson("review-package", packagePath)',
    ]) assert(producerSource.includes(token), `producer input does not share resolveInputPath: ${token}`);
    assert(!producerSource.includes("path.join(rootDir, migrationRelative)"),
      "producer still joins repository root to the migration input");

    const targets = ["audit", "approval", "implementation", "native"].map(name => path.join(temp, `${name}.json`));
    const before = targets.map((target, index) => `${JSON.stringify({ index, generation: 0 })}\n`);
    targets.forEach((target, index) => fs.writeFileSync(target, before[index]));
    const missing = path.join(temp, "missing-migration.json");
    let failure = "";
    try {
      readInputJson("migration-evidence", missing);
    } catch (error) {
      failure = String(error?.message || error);
    }
    assert(failure.includes(path.normalize(missing)),
      "missing producer input error did not expose the actual resolved path");
    targets.forEach((target, index) => assert(fs.readFileSync(target, "utf8") === before[index],
      `producer input failure changed target fixture bytes: ${path.basename(target)}`));
    const firstInputRead = producerSource.indexOf('readInputJson("prior-audit", priorAuditPath)');
    const atomicReplacement = producerSource.indexOf("replaceJsonFixturesAtomically({");
    assert(firstInputRead >= 0 && atomicReplacement > firstInputRead,
      "producer atomic replacement can run before all external inputs are resolved");

    const fixturePaths = [
      "test/fixtures/v390_review4_feature_semantic_source_audit.json",
      "test/fixtures/v390_review4_feature_semantic_source_approvals.json",
      "test/fixtures/project_feature_implementation_evidence.json",
      "test/fixtures/v390_ui_native_exact_cases.json",
    ].map(relative => path.join(rootDir, relative));
    const fixtureBytes = fixturePaths.map(file => fs.readFileSync(file));
    const missingPriorAudit = path.join(temp, "missing-prior-audit.json");
    const migration = path.join(temp, "migration.json");
    const decisions = path.join(temp, "decisions.json");
    const reviewPackage = path.join(temp, "review-package.json");
    for (const file of [migration, decisions, reviewPackage]) fs.writeFileSync(file, "{}\n");
    const smoke = spawnSync(process.execPath, [
      producerPath,
      "--write-ledger",
      "--prior-audit", missingPriorAudit,
      "--migration-evidence", migration,
      "--decisions", decisions,
      "--review-package", reviewPackage,
    ], { cwd: rootDir, encoding: "utf8" });
    const smokeOutput = `${smoke.stdout || ""}${smoke.stderr || ""}`;
    assert(smoke.status !== 0, "producer missing-input entrypoint smoke unexpectedly succeeded");
    assert(!smokeOutput.includes("ReferenceError"),
      "producer missing-input entrypoint smoke failed with ReferenceError");
    assert(smokeOutput.includes(`prior-audit input missing: ${path.normalize(missingPriorAudit)}`),
      "producer missing-input entrypoint smoke did not report the resolved prior-audit path");
    fixturePaths.forEach((file, index) => assert(fs.readFileSync(file).equals(fixtureBytes[index]),
      `producer entrypoint input failure changed target fixture bytes: ${path.basename(file)}`));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function runProducerReviewedOnContract() {
  const normalizeReviewedOn = evaluateProducerFunction("normalizeReviewedOn", [], []);
  const assertNormalizedReviewedOn = evaluateProducerFunction("assertNormalizedReviewedOn", [], []);
  assert(normalizeReviewedOn("2026-07-22") === "2026-07-22",
    "date-only reviewedAt did not remain canonical");
  assert(normalizeReviewedOn("2026-07-22T22:43:09.519Z") === "2026-07-22",
    "UTC ISO reviewedAt did not normalize to its UTC calendar date");
  for (const invalid of [
    undefined,
    "",
    "2026/07/22",
    "2026-02-30",
    "2026-07-22T22:43:09.51Z",
    "2026-07-22T22:43:09.519",
    "2026-07-22T22:43:09.519+09:00",
  ]) {
    let failure = "";
    try { normalizeReviewedOn(invalid); } catch (error) { failure = String(error?.message || error); }
    assert(failure.includes(invalid === undefined || invalid === "" ? "reviewedAt missing" : "reviewedAt invalid"),
      `invalid reviewedAt was accepted: ${String(invalid)}`);
  }

  const reviewedOn = "2026-07-22";
  const approval = { reviewedOn, approvals: Array.from({ length: 986 }, (_, index) => ({ id: `ROW-${index}`, reviewedOn })) };
  assertNormalizedReviewedOn(approval, reviewedOn, 986);
  for (const mutate of [
    value => { value.reviewedOn = "2026-07-23"; },
    value => { value.approvals[985].reviewedOn = "2026-07-23"; },
  ]) {
    const changed = structuredClone(approval);
    mutate(changed);
    let failure = "";
    try { assertNormalizedReviewedOn(changed, reviewedOn, 986); } catch (error) { failure = String(error?.message || error); }
    assert(failure.includes("normalized reviewedOn top-level/row mismatch"),
      "reviewedOn top-level/row mismatch was accepted");
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-review4-reviewed-on-"));
  try {
    const fixturePaths = ["audit", "approval", "implementation", "native"].map(name => path.join(temp, `${name}.json`));
    const fixtureBytes = fixturePaths.map((file, index) => `${JSON.stringify({ index, generation: 0 })}\n`);
    fixturePaths.forEach((file, index) => fs.writeFileSync(file, fixtureBytes[index]));
    try { normalizeReviewedOn("2026-02-30"); } catch {}
    fixturePaths.forEach((file, index) => assert(fs.readFileSync(file, "utf8") === fixtureBytes[index],
      `reviewedAt preflight failure changed fixture bytes: ${path.basename(file)}`));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  const preflightCall = producerSource.indexOf("const approvalInput = prevalidateMigrationApprovalInputs(");
  const buildCall = producerSource.indexOf("const approval = buildMigrationApproval(");
  const atomicReplacement = producerSource.indexOf("replaceJsonFixturesAtomically({");
  assert(preflightCall >= 0 && buildCall > preflightCall && atomicReplacement > buildCall,
    "reviewedAt and decision/package/candidate preflight does not precede approval build and atomic replacement");
  assert(!producerSource.includes("reviewedOn: decisions.reviewedAt"),
    "producer still assigns decisions.reviewedAt directly to reviewedOn");
}

function runProducerSnapshotBindingContract() {
  const validate = evaluateProducerFunction(
    "validateReviewSnapshotBindings",
    ["stableStringify", "sha256"],
    [stableStringify, sha256],
  );
  const trustBindings = { schema: "trust.v1", roles: { owner: { body: "current" } } };
  const trustSha = sha256(stableStringify(trustBindings));
  const currentSnapshot = {
    stagedEquivalentTreeOid: "a".repeat(40),
    trackedWorktreeDiffSha256: "b".repeat(64),
    changedFiles: ["src/bound.cpp"],
  };
  const freshAudit = {
    items: [{
      id: "UI-014",
      featureContractSha256: "c".repeat(64),
      sourceFlowDigest: "d".repeat(64),
      trustBindings,
    }],
  };
  const reviewPackage = {
    bindings: { ...currentSnapshot },
    trustRebindRows: [{
      id: "UI-014",
      featureContractSha256: "c".repeat(64),
      sourceFlowDigest: "d".repeat(64),
      currentTrustBindingsSha256: trustSha,
    }],
  };
  const decisions = {
    candidate: {
      stagedEquivalentTreeOid: currentSnapshot.stagedEquivalentTreeOid,
      trackedWorktreeDiffSha256: currentSnapshot.trackedWorktreeDiffSha256,
    },
  };
  validate({ reviewPackage, decisions, freshAudit,
    requiredIndependentIds: ["UI-014"], currentSnapshot });

  for (const [label, mutate] of [
    ["stale tree", value => { value.reviewPackage.bindings.stagedEquivalentTreeOid = "e".repeat(40); }],
    ["stale diff", value => { value.reviewPackage.bindings.trackedWorktreeDiffSha256 = "e".repeat(64); }],
    ["stale decision snapshot", value => { value.decisions.candidate.trackedWorktreeDiffSha256 = "e".repeat(64); }],
    ["stale trust", value => { value.reviewPackage.trustRebindRows[0].currentTrustBindingsSha256 = "e".repeat(64); }],
    ["wrong row", value => { value.reviewPackage.trustRebindRows[0].id = "UI-015"; }],
    ["extra row", value => { value.reviewPackage.trustRebindRows.push(structuredClone(value.reviewPackage.trustRebindRows[0])); }],
  ]) {
    const value = structuredClone({ reviewPackage, decisions, freshAudit, currentSnapshot });
    mutate(value);
    expectThrow(() => validate({
      ...value,
      requiredIndependentIds: ["UI-014"],
    }), `${label} review package binding was accepted`);
  }
}

function evaluateProducerFunction(name, parameterNames, parameterValues) {
  const marker = `function ${name}(`;
  const start = producerSource.indexOf(marker);
  assert(start >= 0, `producer function missing: ${name}`);
  const open = producerSource.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let index = open; index < producerSource.length; index += 1) {
    if (producerSource[index] === "{") depth += 1;
    if (producerSource[index] === "}") depth -= 1;
    if (depth === 0) { end = index + 1; break; }
  }
  assert(end > open, `producer function body incomplete: ${name}`);
  const declaration = producerSource.slice(start, end);
  return Function(...parameterNames, `return (${declaration});`)(...parameterValues);
}

function buildDelta(baseline, fresh, { trustRebindIds = [] } = {}) {
  const beforeRaw = baseline.items || [];
  const afterRaw = fresh.items || [];
  const before = review4HardCandidateItems(beforeRaw);
  const after = review4HardCandidateItems(afterRaw);
  const trustRebindIdSet = new Set(trustRebindIds);
  const observedTrustRebindIds = new Set();
  if (before.length !== after.length) throw new Error(`candidate row count drift: ${before.length} != ${after.length}`);
  const carryForwardEligible = [];
  const independentReviewRequired = [];
  const rows = [];
  for (let index = 0; index < before.length; index += 1) {
    const prior = before[index];
    const next = after[index];
    if (prior.id !== next.id) throw new Error(`candidate ID order drift at ${index}: ${prior.id} != ${next.id}`);
    const fields = changedSemanticFields(prior, next);
    const trustBindingChanged = stableStringify(beforeRaw[index].trustBindings) !==
      stableStringify(afterRaw[index].trustBindings);
    const trustRebindRequired = trustRebindIdSet.has(prior.id);
    if (trustRebindRequired) {
      assert(fields.length === 0,
        `${prior.id} trust-only rebind cannot include semantic field drift`);
      assert(trustBindingChanged,
        `${prior.id} trust-only rebind requires an exact stored/current trust binding change`);
      assert(beforeRaw[index].featureContractSha256 === afterRaw[index].featureContractSha256 &&
        beforeRaw[index].sourceFlowDigest === afterRaw[index].sourceFlowDigest,
      `${prior.id} trust-only rebind changed feature/pass/status/sourceFlow`);
      observedTrustRebindIds.add(prior.id);
    }
    const record = {
      id: prior.id,
      oldSourceFlowDigest: beforeRaw[index].sourceFlowDigest,
      newSourceFlowDigest: afterRaw[index].sourceFlowDigest,
      semanticFieldsEqual: fields.length === 0,
      trustBindingChanged,
      trustRebindRequired,
      partition: trustRebindRequired || fields.length > 0
        ? "independent-review-required"
        : "strict-equivalence-carry-forward",
      changedFields: trustRebindRequired ? ["approvalTrustBindings"] : fields,
      equivalenceDigest: !trustRebindRequired && fields.length === 0
        ? sha256(stableStringify(prior))
        : null,
    };
    rows.push(record);
    if (record.partition === "strict-equivalence-carry-forward") carryForwardEligible.push(record.id);
    else independentReviewRequired.push(record.id);
  }
  assert(observedTrustRebindIds.size === trustRebindIdSet.size &&
    [...trustRebindIdSet].every(id => observedTrustRebindIds.has(id)),
  "trust-only rebind requested a wrong or missing row");
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
  const carryForward = delta.rowDelta.filter(row =>
    row.partition === "strict-equivalence-carry-forward").map(row => ({
    id: row.id,
    oldSourceFlowDigest: row.oldSourceFlowDigest,
    newSourceFlowDigest: row.newSourceFlowDigest,
    equivalenceDigest: row.equivalenceDigest,
    status: "carry-forward-eligible-not-approved",
  }));
  const unapproved = delta.rowDelta.filter(row =>
    row.partition === "independent-review-required").map(row => ({
    id: row.id,
    oldSourceFlowDigest: row.oldSourceFlowDigest,
    newSourceFlowDigest: row.newSourceFlowDigest,
    changedFields: row.changedFields,
    status: row.trustRebindRequired
      ? "unapproved-independent-trust-review-required"
      : "unapproved-independent-review-required",
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

function runTrustRebindPartitionContract() {
  const prior = contractItem();
  prior.trustBindings = contractTrustBindings("a".repeat(64), 1);
  prior.sourceFlowDigest = review4SourceFlowDigest(prior);
  const fresh = structuredClone(prior);
  fresh.trustBindings = contractTrustBindings("b".repeat(64), 4);
  fresh.sourceFlowDigest = prior.sourceFlowDigest;
  const baseline = { items: [prior] };
  const current = { items: [fresh] };

  const delta = buildDelta(baseline, current, { trustRebindIds: [prior.id] });
  assert(delta.carryForwardEligible.length === 0 &&
    stableStringify(delta.independentReviewRequired) === stableStringify([prior.id]) &&
    delta.rowDelta[0].trustRebindRequired === true &&
    stableStringify(delta.rowDelta[0].changedFields) === stableStringify(["approvalTrustBindings"]),
  "trust drift was incorrectly carried forward");
  expectThrow(() => buildDelta(baseline, current, { trustRebindIds: ["UI-998"] }),
    "wrong trust rebind row was accepted");
  expectThrow(() => buildDelta(baseline, current, { trustRebindIds: [prior.id, "UI-998"] }),
    "extra trust rebind row was accepted");

  const semanticDrift = structuredClone(current);
  semanticDrift.items[0].featureContractSha256 = "c".repeat(64);
  expectThrow(() => buildDelta(baseline, semanticDrift, { trustRebindIds: [prior.id] }),
    "feature/pass/status/sourceFlow drift was accepted as trust-only");
}

function contractTrustBindings(trackedBlobSha256, lineOffset) {
  const role = enclosingBodySha256 => ({
    file: "src/bound.cpp",
    symbol: "Bound",
    trackedBlobSha256,
    enclosingBodySha256,
    enclosingBodyStartLine: 1 + lineOffset,
    enclosingBodyEndLine: 3 + lineOffset,
    enclosingBodyScope: "declared-symbol",
  });
  return {
    schema: "media-server.review4-source-trust-bindings.v1",
    roles: {
      owner: role("1".repeat(64)),
      dispatch: role("2".repeat(64)),
      action: role("3".repeat(64)),
      state: role("4".repeat(64)),
      readback: role("5".repeat(64)),
      verifier: role("6".repeat(64)),
    },
    verifierFileSha256: "7".repeat(64),
    dispatch: {
      command: "verify-alpha",
      file: "scripts/internal/alpha.mjs",
      armSha256: "8".repeat(64),
      requireTarget: "alpha.mjs",
      execTarget: "alpha.mjs",
      connectedFiles: [],
      connectedExecSha256: null,
    },
  };
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
function optionValues(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === `--${name}`) values.push(String(args[++index] || ""));
    else if (value.startsWith(`--${name}=`)) values.push(value.slice(value.indexOf("=") + 1));
  }
  if (values.some(value => !/^[A-Z]+-[0-9]{3}$/.test(value))) {
    throw new Error(`--${name} requires a canonical feature ID`);
  }
  return values;
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function expectThrow(fn, message) { let threw = false; try { fn(); } catch { threw = true; } if (!threw) throw new Error(message); }
function expectEqual(actual, expected, message) { if (stableStringify(actual) !== stableStringify(expected)) throw new Error(message); }
function expectNotEqual(actual, expected, message) { if (stableStringify(actual) === stableStringify(expected)) throw new Error(message); }
