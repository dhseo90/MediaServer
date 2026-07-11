#!/usr/bin/env node
// 파일 용도: 8-case/plan-only/fixture/policy-only evidence가 acceptance/final eligibility로 승격되지 않는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateV390FullSuiteEligibility, V390_EXACT_UI_CASE_COUNT } from "./v390_full_suite_eligibility_lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalCaseIds = JSON.parse(fs.readFileSync(path.join(rootDir,
  "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"), "utf8")).cases.map(item => item.testId);
const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`v3.9.0 Policy v4 full-suite eligibility contract

Usage:
  ./server.sh verify-v390-full-suite-eligibility-contract

Checks exact 424, unsupported/fail/not-run zero, actual Policy v4 uiFulltestPass,
and acceptance/final-integrity integration. Contract fixtures are not UI execution evidence.
`);
}
assertKnownOptions(args, ["h", "help"]);

const checks = [];
check("actual exact Policy v4 closure is algorithmically eligible", () => {
  const result = evaluateV390FullSuiteEligibility({
    executionPassed: true,
    executionMode: "actual",
    policyEvaluation: makeEvaluation(),
    canonicalCaseIds,
  });
  assert(result.status === "eligible", result.reasons.join(", "));
  assert(result.finalEvidenceEligible === true, "eligible closure did not become final evidence eligible");
});

check("targeted 8-case evidence is ineligible", () => {
  const evaluation = makeEvaluation();
  evaluation.qualification.qualifiedCaseCount = 8;
  evaluation.qualification.qualifiedCaseIds = evaluation.qualification.qualifiedCaseIds.slice(0, 8);
  evaluation.suiteClosure.requestedExactCases = 8;
  evaluation.suiteClosure.pass = 8;
  evaluation.uiFulltestPass = false;
  evaluation.qualification.uiFulltestPass = false;
  assert(evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: "actual", policyEvaluation: evaluation, canonicalCaseIds }).status === "ineligible",
    "8-case evidence became eligible");
});

check("plan-only or fixture execution is ineligible", () => {
  for (const mode of ["actual-fixture", "dry-run", "plan-only"]) {
    const result = evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: mode, policyEvaluation: makeEvaluation(), canonicalCaseIds });
    assert(result.reasons.includes("acceptance-execution-not-actual"), `${mode} became actual evidence`);
  }
  const evaluation = makeEvaluation();
  evaluation.suiteClosure.actualBrowserExecution = false;
  assert(evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: "actual", policyEvaluation: evaluation, canonicalCaseIds }).status === "ineligible",
    "non-browser suite became eligible");
});

check("unsupported, fail, not-run, exclusion, and manual intervention are ineligible", () => {
  for (const field of ["fail", "notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
    const evaluation = makeEvaluation();
    evaluation.suiteClosure[field] = 1;
    const result = evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: "actual", policyEvaluation: evaluation, canonicalCaseIds });
    assert(result.reasons.includes(`full-suite-${field}-not-zero`), `${field} gap became eligible`);
  }
});

check("policy PASS and UI fulltest PASS remain independent", () => {
  const evaluation = makeEvaluation();
  evaluation.uiFulltestPass = false;
  evaluation.qualification.uiFulltestPass = false;
  const result = evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: "actual", policyEvaluation: evaluation, canonicalCaseIds });
  assert(result.reasons.includes("policy-ui-fulltest-not-pass"), "policy-only PASS became UI PASS");
});

check("duplicate qualified IDs and missing source hash are rejected", () => {
  const evaluation = makeEvaluation();
  evaluation.qualification.qualifiedCaseIds[1] = evaluation.qualification.qualifiedCaseIds[0];
  evaluation.sourceSummarySha256 = "";
  const result = evaluateV390FullSuiteEligibility({ executionPassed: true, executionMode: "actual", policyEvaluation: evaluation, canonicalCaseIds });
  assert(result.reasons.includes("qualified-case-id-list-has-duplicates"), "duplicate ID list passed");
  assert(result.reasons.includes("policy-source-summary-hash-missing"), "missing source hash passed");
});

check("acceptance and final integrity consume the shared evaluator", () => {
  const acceptance = read("scripts/internal/verify_v390_test_acceptance_bundle.mjs");
  const integrity = read("scripts/internal/verify_v390_final_evidence_integrity.mjs");
  for (const [label, source] of [["acceptance", acceptance], ["final integrity", integrity]]) {
    assert(source.includes("evaluateV390FullSuiteEligibility"), `${label} does not consume shared evaluator`);
    assert(source.includes("finalEvidenceEligible"), `${label} does not expose final eligibility`);
  }
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
  catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
}
console.log("\n== v3.9.0 full-suite eligibility contract summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- boundary: contract positive is not actual Policy v4 UI execution evidence");
if (fail > 0) process.exit(1);

function makeEvaluation() {
  const ids = [...canonicalCaseIds];
  return {
    schema: "media-server.ui-fulltest-evidence-policy-evaluation.v4",
    policyValidationResult: "PASS",
    sourceSummary: "contract/summary.json",
    sourceSummarySha256: "a".repeat(64),
    sourceEvidenceSchema: "media-server.ui-automation-evidence.v4",
    qualification: {
      evidenceEligibility: "eligible",
      qualifiedCaseCount: V390_EXACT_UI_CASE_COUNT,
      qualifiedCaseIds: ids,
      uiFulltestPass: true,
      reasons: [],
    },
    suiteClosure: {
      actualBrowserExecution: true,
      requestedExactCases: V390_EXACT_UI_CASE_COUNT,
      pass: V390_EXACT_UI_CASE_COUNT,
      fail: 0,
      notRun: 0,
      unsupported: 0,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    uiFulltestPass: true,
  };
}

function read(relative) { return fs.readFileSync(path.join(rootDir, relative), "utf8"); }
function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
