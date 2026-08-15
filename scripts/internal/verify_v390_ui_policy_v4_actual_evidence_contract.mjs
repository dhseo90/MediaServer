#!/usr/bin/env node
// 파일 용도: canonical RED census와 corrected Policy v4 evidence producer/qualifier 경계를 검증한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { censusQualificationReasons } from "./v390_ui_policy_v4_reason_census.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const fixture = readJson(path.join(rootDir, "test/fixtures/v390_policy_v4_canonical_red_evidence.json"));

assert.equal(fixture.schema, "media-server.v390-policy-v4-canonical-red-evidence.v1");
assert.equal(fixture.releaseEvidenceEligible, false);
assert.equal(fixture.redQualification.evidenceEligibility, "ineligible");
assert.equal(fixture.redQualification.qualifiedCaseCount, 11);
assert.deepEqual(fixture.redQualification.qualifiedCaseIds, [
  "UI-001", "UI-008", "UI-023", "UI-026", "UI-028", "EVT-018",
  "CLIENT-002", "CLIENT-005", "CLIENT-009", "CLIENT-018", "CLIENT-021",
]);
assert.equal(fixture.redQualification.exactCaseCount, 424);
assert.equal(fixture.redQualification.uiFulltestPass, false);

const frozenReasons = Object.entries(fixture.reasonCounts).flatMap(([reason, count]) =>
  Array.from({ length: count }, (_, index) => reason.startsWith("cross-cutting-") ||
    reason === "derived-case-fail-must-be-zero" || reason === "unapproved-console-message-present"
    ? reason
    : `FIXTURE-${String(index + 1).padStart(3, "0")}:${reason}`));
const census = censusQualificationReasons(frozenReasons);
assert.equal(census.schema, "media-server.v390-ui-policy-v4-reason-census.v1");
assert.equal(census.assignmentStatus, "exact-one-cluster");
assert.equal(census.reasonCount, fixture.redQualification.reasonCount);
assert.deepEqual(census.reasonCounts, fixture.reasonCounts);
assert.deepEqual(census.clusterCounts, fixture.clusterCounts);
assert.deepEqual(census.unassignedReasons, []);
assert.deepEqual(census.multiplyAssignedReasons, []);

const authoritativeRun = path.join(rootDir,
  ".media_server.test/v3.9.0/ui-acceptance-current/runs/v390-test-acceptance-20260809095251-44954");
const authoritativeSummary = path.join(authoritativeRun, "ui-exact-424/summary.json");
const authoritativeEvaluation = path.join(authoritativeRun, "ui-fulltest-qualification/evaluation.json");
if (fs.existsSync(authoritativeSummary) && fs.existsSync(authoritativeEvaluation)) {
  assert.equal(sha256(authoritativeSummary), fixture.sourceSummarySha256);
  assert.equal(sha256(authoritativeEvaluation), fixture.sourceEvaluationSha256);
  const evaluation = readJson(authoritativeEvaluation);
  assert.equal(evaluation.qualification.evidenceEligibility, "ineligible");
  assert.equal(evaluation.qualification.qualifiedCaseCount, 11);
  assert.deepEqual(evaluation.qualification.qualifiedCaseIds,
    fixture.redQualification.qualifiedCaseIds);
  assert.equal(evaluation.uiFulltestPass, false);
  const actualCensus = censusQualificationReasons(evaluation.qualification.reasons);
  assert.deepEqual(actualCensus.reasonCounts, fixture.reasonCounts);
  assert.deepEqual(actualCensus.clusterCounts, fixture.clusterCounts);
}

const unknownCensus = censusQualificationReasons(["CASE-001:unknown-policy-v4-reason"]);
assert.equal(unknownCensus.assignmentStatus, "fail-closed-incomplete-assignment",
  "unknown Policy v4 reasons must stay structured fail-closed");
assert.deepEqual(unknownCensus.unassignedReasons, ["unknown-policy-v4-reason"]);
assert.deepEqual(unknownCensus.multiplyAssignedReasons, []);
assert.equal(unknownCensus.clusterCounts["canonical-source-binding"], undefined);
const sourceBindingCensus = censusQualificationReasons([
  "canonical-parent-binding-source-digest-mismatch",
  "canonical-case-manifest-version-mismatch",
]);
assert.equal(sourceBindingCensus.assignmentStatus, "exact-one-cluster",
  "canonical source binding reasons must remain exact-one-cluster");
assert.equal(sourceBindingCensus.clusterCounts["canonical-source-binding"], 2,
  "canonical source binding mismatch is not assigned to its exact reason cluster");

const runnerSource = fs.readFileSync(path.join(rootDir,
  "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
const clientScriptSource = fs.readFileSync(path.join(rootDir,
  "src/ingress/product_ui_client_scripts.cpp"), "utf8");
const verifierSource = fs.readFileSync(path.join(rootDir,
  "scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs"), "utf8");
for (const requiredSourceBoundary of [
  "actionKind: completion.actionKind",
  "executionOwnerSelector: actionEvidence.executedControlSelector ||",
  "requestBinding: pending.formResponseIdentity",
  "const serializableObservation = JSON.parse(JSON.stringify(observation));",
]) {
  assert.ok(runnerSource.includes(requiredSourceBoundary),
    `runner raw evidence source boundary missing: ${requiredSourceBoundary}`);
}
assert.match(runnerSource,
  /trace\.actions\.push\(\{\s*\.\.\.initialCompletionAction,/,
  "runner raw evidence source boundary missing: negative initial completion action identity");
assert.ok(clientScriptSource.includes("document.body?.dataset?.clientActive") &&
  clientScriptSource.includes("document.body?.dataset?.clientPreview"),
  "client shell body dataset access is not navigation-lifecycle safe");
assert.ok(!clientScriptSource.includes("document.body.dataset.client"),
  "client shell retains an unguarded body dataset access");
for (const requiredVerifierBoundary of [
  "censusQualificationReasons(evaluation.reasons)",
  "verifier-coverage-${field}-must-be-safe-integer",
  "exactCoverage.pass",
  "exactCoverage.notRun",
  'path.join(outputDir, "reason-census.json")',
]) {
  assert.ok(verifierSource.includes(requiredVerifierBoundary),
    `Policy v4 verifier boundary missing: ${requiredVerifierBoundary}`);
}

console.log("== v3.9.0 Policy v4 actual evidence contract ==");
console.log(`- RED source summary: ${fixture.sourceSummarySha256}`);
console.log(`- RED source evaluation: ${fixture.sourceEvaluationSha256}`);
console.log(`- reasonCount: ${census.reasonCount}`);
console.log(`- assignmentStatus: ${census.assignmentStatus}`);
console.log("- historical release evidence reuse: denied");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
