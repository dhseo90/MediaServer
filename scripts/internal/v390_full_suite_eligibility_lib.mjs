// 파일 용도: acceptance/final evidence가 Policy v4 exact full-suite 자격만 승격하도록 단일 판정을 제공한다.

export const V390_EXACT_UI_CASE_COUNT = 424;

export function evaluateV390FullSuiteEligibility({
  executionPassed,
  executionMode,
  policyEvaluation,
  canonicalCaseIds,
} = {}) {
  const reasons = [];
  const qualification = policyEvaluation?.qualification || {};
  const closure = policyEvaluation?.suiteClosure || {};
  const qualifiedCaseIds = Array.isArray(qualification.qualifiedCaseIds)
    ? qualification.qualifiedCaseIds
    : [];

  requireValue(executionPassed === true, "acceptance-execution-not-pass", reasons);
  requireValue(executionMode === "actual", "acceptance-execution-not-actual", reasons);
  requireValue(policyEvaluation?.schema === "media-server.ui-fulltest-evidence-policy-evaluation.v4",
    "policy-evaluation-schema-mismatch", reasons);
  requireValue(policyEvaluation?.policyValidationResult === "PASS", "policy-validation-not-pass", reasons);
  requireValue(policyEvaluation?.sourceEvidenceSchema === "media-server.ui-automation-evidence.v4",
    "policy-source-evidence-schema-mismatch", reasons);
  requireValue(qualification.evidenceEligibility === "eligible", "policy-evidence-not-eligible", reasons);
  requireValue(policyEvaluation?.uiFulltestPass === true && qualification.uiFulltestPass === true,
    "policy-ui-fulltest-not-pass", reasons);
  requireValue(Number(qualification.qualifiedCaseCount) === V390_EXACT_UI_CASE_COUNT,
    "qualified-case-count-not-424", reasons);
  requireValue(qualifiedCaseIds.length === V390_EXACT_UI_CASE_COUNT,
    "qualified-case-id-list-not-424", reasons);
  requireValue(new Set(qualifiedCaseIds).size === V390_EXACT_UI_CASE_COUNT,
    "qualified-case-id-list-has-duplicates", reasons);
  requireValue(Array.isArray(canonicalCaseIds) && canonicalCaseIds.length === V390_EXACT_UI_CASE_COUNT,
    "canonical-case-id-list-not-424", reasons);
  requireValue(JSON.stringify(qualifiedCaseIds) === JSON.stringify(canonicalCaseIds),
    "qualified-case-id-list-not-canonical", reasons);
  requireValue(closure.actualBrowserExecution === true, "full-suite-not-actual-browser-execution", reasons);
  requireValue(Number(closure.requestedExactCases) === V390_EXACT_UI_CASE_COUNT,
    "requested-exact-case-count-not-424", reasons);
  requireValue(Number(closure.pass) === V390_EXACT_UI_CASE_COUNT, "full-suite-pass-count-not-424", reasons);
  for (const field of ["fail", "notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
    requireValue(Number(closure[field]) === 0, `full-suite-${field}-not-zero`, reasons);
  }
  requireValue(typeof policyEvaluation?.sourceSummarySha256 === "string" &&
      /^[a-f0-9]{64}$/.test(policyEvaluation.sourceSummarySha256),
    "policy-source-summary-hash-missing", reasons);

  return {
    status: reasons.length === 0 ? "eligible" : "ineligible",
    finalEvidenceEligible: reasons.length === 0,
    exactCaseCount: V390_EXACT_UI_CASE_COUNT,
    qualifiedCaseCount: Number(qualification.qualifiedCaseCount || 0),
    unsupported: Number(closure.unsupported ?? -1),
    uiFulltestPass: policyEvaluation?.uiFulltestPass === true,
    policyValidationResult: policyEvaluation?.policyValidationResult || "missing",
    sourceSummary: policyEvaluation?.sourceSummary || "",
    sourceSummarySha256: policyEvaluation?.sourceSummarySha256 || "",
    reasons,
  };
}

function requireValue(condition, reason, reasons) {
  if (!condition) reasons.push(reason);
}
