// 파일 용도: UI fulltest Evidence Policy v4와 실행 evidence의 적격성을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import {
  browserMeasurementSchema,
  evaluateVisualArtifact,
  evaluateVisualMatrix,
  expandVisualMatrixPlan,
  validateVisualMatrixPlan,
  visualEvidenceSchema,
} from "./v390_ui_visual_evidence.mjs";
import { qualifyRawCase } from "./v390_ui_policy_v4_independent_qualifier.mjs";
import { qualifyBrowserConsoleMessages } from "./v390_ui_console_evidence.mjs";
import { validateCanonicalParentAcceptanceSummary } from "./v390_ui_native_exact_cases_lib.mjs";

const sha256Pattern = /^[a-f0-9]{64}$/;
export const canonicalImplementationProjectionSchema =
  "media-server.ui-fulltest-canonical-implementation-projection.v1";

export function validatePolicy(policy) {
  const errors = [];
  expect(policy?.schema === "media-server.ui-fulltest-evidence-policy.v4", "policy schema must be media-server.ui-fulltest-evidence-policy.v4", errors);
  expect(policy?.policyVersion === 4, "policyVersion must be 4", errors);
  expectExact(policy?.testCategories, ["stabilization", "30-minute", "120-minute", "ui-fulltest"], "testCategories", errors);
  expectExact(policy?.uiEvidenceModes, ["direct-browser", "qualified-native-automation", "hybrid"], "uiEvidenceModes", errors);
  expect(policy?.caseEquivalence?.level === "exact-case", "case equivalence level must be exact-case", errors);
  expectIncludes(policy?.caseEquivalence?.allowedExecutionKinds, "actual-native-visible-dom", "allowed execution kind", errors);
  for (const kind of ["fixture", "one-shot-wrapper", "static-smoke", "api-only", "raw-json-only", "screenshot-only", "source-marker", "hidden-dom-marker"]) {
    expectIncludes(policy?.caseEquivalence?.forbiddenEvidenceKinds, kind, `forbidden evidence kind ${kind}`, errors);
  }
  for (const capability of ["wait", "query", "assert", "click", "type", "select", "evaluate", "screenshot"]) {
    expectIncludes(policy?.caseEquivalence?.requiredAdapterCapabilities, capability, `required adapter capability ${capability}`, errors);
  }
  for (const artifact of ["screenshot", "trace", "browserConsole", "serverLog", "visualMeasurement", "visualDiff", "redactionScan"]) {
    expectIncludes(policy?.caseEquivalence?.requiredArtifacts, artifact, `required case artifact ${artifact}`, errors);
  }
  for (const oracle of ["dom-transition", "network-response-and-dom", "persisted-state-readback", "eventrecord-correlation", "server-log-correlation"]) {
    expectIncludes(policy?.caseEquivalence?.allowedCompletionOracles, oracle, `completion oracle ${oracle}`, errors);
  }
  expect(policy?.caseEquivalence?.requiredAssertionBoundary === "exact-selector-visible-innerText-only", "exact selector assertion boundary missing", errors);
  expect(policy?.caseEquivalence?.visualBaselineSchema === visualEvidenceSchema, "visual baseline schema mismatch", errors);
  expect(Number.isInteger(policy?.caseEquivalence?.maxEvidenceAgeHours) && policy.caseEquivalence.maxEvidenceAgeHours > 0, "maxEvidenceAgeHours must be positive", errors);
  expect(policy?.suiteClosure?.expectedExactUiTestIds === 424, "suite expected exact UI test IDs must be 424", errors);
  expectExact(policy?.suiteClosure?.allowedCaseStatuses, ["direct-pass", "automation-equivalent-pass"], "allowed case statuses", errors);
  for (const count of ["fail", "notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
    expectIncludes(policy?.suiteClosure?.requiredZeroCounts, count, `suite zero count ${count}`, errors);
  }
  for (const obligation of ["visual-quality", "responsive-320-390-760-1180", "light-dark-theme", "role-scope-guards", "client-viewer-redaction", "video-overlay-crop", "accessibility-focus-contrast"]) {
    expectIncludes(policy?.suiteClosure?.requiredCrossCuttingObligations, obligation, `cross-cutting obligation ${obligation}`, errors);
  }
  for (const field of ["version", "gitCommit", "worktreePatchSha256", "buildPath", "buildSha256", "policyPath", "policySha256", "caseManifestPath", "caseManifestSha256", "nativeExactManifestPath", "nativeExactManifestSha256", "runnerPath", "runnerSha256", "artifactRoot"]) {
    expectIncludes(policy?.sourceBinding?.requiredFields, field, `source binding field ${field}`, errors);
  }
  expect(policy?.sourceBinding?.canonicalCaseManifestPath === "test/fixtures/ui_fulltest_case_manifest_policy_v4.json", "canonical case manifest path mismatch", errors);
  expect(policy?.sourceBinding?.canonicalCaseManifestSchema === "media-server.ui-fulltest-canonical-case-manifest.v1", "canonical case manifest schema mismatch", errors);
  expect(policy?.sourceBinding?.canonicalImplementationEvidenceSchema === "media-server.feature-implementation-evidence.v2", "canonical implementation evidence schema mismatch", errors);
  expect(policy?.sourceBinding?.nativeExactManifestPath === "test/fixtures/v390_ui_native_exact_cases.json", "native exact manifest path mismatch", errors);
  expect(policy?.sourceBinding?.nativeExactManifestSchema === "media-server.v390-ui-native-exact-cases.v2", "native exact manifest schema mismatch", errors);
  expect(policy?.sourceBinding?.sha256Pattern === "^[a-f0-9]{64}$", "source binding sha256 pattern mismatch", errors);
  expect(policy?.sourceBinding?.requireCurrentSourceVerification === true, "current source verification must be required", errors);
  expect(policy?.attestation?.evidenceRefSchema === "media-server.ui-evidence-ref.v1", "evidence ref schema mismatch", errors);
  expect(policy?.attestation?.interactionTraceSchema === "media-server.v390-ui-native-interaction-trace.v2", "interaction trace schema mismatch", errors);
  expect(policy?.attestation?.browserConsoleSchema === "media-server.ui-browser-console.v1", "browser console schema mismatch", errors);
  expect(policy?.attestation?.crossCuttingSchema === "media-server.ui-cross-cutting-evidence.v1", "cross-cutting schema mismatch", errors);
  expect(policy?.attestation?.redactionScanSchema === "media-server.ui-evidence-redaction-scan.v1", "redaction scan schema mismatch", errors);
  expect(Number.isInteger(policy?.attestation?.maxArtifactBytes) && policy.attestation.maxArtifactBytes > 0, "maxArtifactBytes must be positive", errors);
  expect(policy?.security?.redactionStatus === "PASS", "security redactionStatus must be PASS", errors);
  expect(policy?.security?.unapprovedConsoleMessages === 0, "unapproved console messages must be zero", errors);
  expect(Array.isArray(policy?.security?.forbiddenMaterialPatterns) && policy.security.forbiddenMaterialPatterns.length > 0, "forbidden material patterns missing", errors);
  for (const pattern of policy?.security?.forbiddenMaterialPatterns || []) {
    expect(typeof pattern?.id === "string" && typeof pattern?.source === "string", "forbidden material pattern invalid", errors);
    try {
      new RegExp(pattern.source, pattern.flags || "");
    } catch {
      errors.push(`forbidden material pattern does not compile: ${pattern?.id || "unknown"}`);
    }
  }
  for (const value of Object.values(policy?.boundaries || {})) {
    expect(value === false, "all Policy v4 false-PASS boundaries must be false", errors);
  }
  return errors;
}

export function evaluateEvidence(policy, summary, options = {}) {
  const reasons = [];
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const verifyArtifacts = options.verifyArtifacts !== false;
  const contractMode = options.contractMode === true;
  const policyErrors = validatePolicy(policy);
  if (policyErrors.length > 0) reasons.push(...policyErrors.map(item => `invalid-policy:${item}`));

  if (summary?.schema !== "media-server.ui-automation-evidence.v4") {
    reasons.push(`legacy-or-unsupported-schema:${summary?.schema || "missing"}`);
    return finish(policy, summary, reasons, [], false);
  }
  if (!contractMode && summary.contractFixture === true) reasons.push("contract-fixture-is-not-execution-evidence");
  if (summary.fixture !== false) reasons.push("fixture-must-be-false");
  if (!policy.caseEquivalence.allowedExecutionKinds.includes(summary.executionKind)) reasons.push("execution-kind-not-qualified");
  if (summary.manualIntervention !== false) reasons.push("manual-intervention-present");

  validateFreshness(policy, summary, reasons, options.now || new Date());
  validateSourceBinding(policy, summary, rootDir, reasons, {
    verifyCurrentSource: options.verifyCurrentSource !== false,
    currentSource: options.currentSource,
  });
  const canonicalBinding = loadCanonicalCaseBinding(policy, summary, rootDir, reasons);
  if (!contractMode) {
    validateCanonicalParentPolicyBinding(summary, rootDir, reasons, canonicalBinding.orderedTestIds,
      options.expectedVerificationBranch ?? options.currentSource?.gitBranch);
  }
  validateAdapter(policy, summary, reasons);
  const cases = Array.isArray(summary.cases) ? summary.cases : [];
  validateSecurity(policy, summary, rootDir, cases, reasons);
  validateCleanup(summary, reasons);

  const eligibleCaseIds = [];
  const caseIds = new Set();
  for (const item of cases) {
    const caseReasons = validateCase(policy, item, summary, rootDir, {
      verifyArtifacts,
      canonicalCase: canonicalBinding.byTestId.get(item?.testId),
      nativeCase: canonicalBinding.nativeByTestId.get(item?.testId),
    });
    if (caseIds.has(item?.testId)) caseReasons.push("duplicate-test-id");
    caseIds.add(item?.testId);
    if (caseReasons.length === 0) eligibleCaseIds.push(item.testId);
    else reasons.push(...caseReasons.map(reason => `${item?.testId || "unknown-case"}:${reason}`));
  }

  const coverage = summary.coverage || {};
  const obligationIds = Array.isArray(coverage.obligationIds) ? coverage.obligationIds : [];
  const coverageCounts = {
    target: Number(coverage.targetCount),
    attempted: Number(coverage.attempted),
    pass: Number(coverage.pass),
    captured: Number(coverage.captured),
    fail: Number(coverage.fail),
    notRun: Number(coverage.notRun),
    unsupported: Number(coverage.unsupported),
  };
  if (!Object.values(coverageCounts).every(Number.isInteger)) {
    reasons.push("coverage-count-must-be-integer");
  } else {
    if (coverageCounts.pass !== coverageCounts.captured) reasons.push("coverage-pass-captured-mismatch");
    if (coverageCounts.attempted !== coverageCounts.pass + coverageCounts.fail) {
      reasons.push("coverage-attempted-mismatch");
    }
    if (coverageCounts.attempted + coverageCounts.notRun + coverageCounts.unsupported !== coverageCounts.target) {
      reasons.push("coverage-total-mismatch");
    }
  }
  if (coverage.targetCount !== obligationIds.length) reasons.push("coverage-target-count-mismatch");
  if (coverage.targetCount !== cases.length) reasons.push("coverage-case-count-mismatch");
  if (new Set(obligationIds).size !== obligationIds.length) reasons.push("coverage-obligation-id-duplicate");
  if (JSON.stringify(obligationIds) !== JSON.stringify(cases.map(item => item.testId))) reasons.push("coverage-obligation-case-order-mismatch");
  for (const field of ["notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
    if (!Number.isSafeInteger(coverage[field])) {
      reasons.push(`coverage-${field}-must-be-integer`);
    } else if (coverage[field] !== 0) {
      reasons.push(`coverage-${field}-must-be-zero`);
    }
  }
  if (cases.length - eligibleCaseIds.length !== 0) reasons.push("derived-case-fail-must-be-zero");

  const crossCutting = new Map((summary.crossCuttingObligations || []).map(item => [item.id, item]));
  const caseSetSha256 = sha256Text(JSON.stringify(cases.map(item => item.testId)));
  const crossMeasurementCache = options.crossQualificationCache || new Map();
  for (const obligation of policy.suiteClosure.requiredCrossCuttingObligations) {
    const item = crossCutting.get(obligation);
    if (!item || !item.evidenceRef) {
      reasons.push(`cross-cutting-${obligation}-raw-evidence-missing`);
      continue;
    }
    const prefix = `cross-cutting-${obligation}-evidence-ref`;
    const attested = validateEvidenceRef(policy, summary, rootDir, item.evidenceRef, {
      expectedCaseId: "__suite__",
      expectedCorrelationId: item.correlationId,
      expectedContentType: "application/json",
      prefix,
    }, reasons);
    if (attested) {
      const payload = readJsonFile(attested.path);
      if (payload?.schema !== policy.attestation.crossCuttingSchema || payload?.obligationId !== obligation ||
          payload?.qualificationStatus !== "unqualified-raw-capture" || payload?.caseSetSha256 !== caseSetSha256 ||
          payload?.correlationId !== item.correlationId) {
        reasons.push(`cross-cutting-${obligation}-payload-invalid`);
      }
      const matrixKey = sha256Text(JSON.stringify(payload?.measuredEvidenceRefs || []));
      let matrix = crossMeasurementCache.get(matrixKey);
      if (matrix === undefined) {
        matrix = validateCrossCuttingMeasurements(policy, summary, rootDir, obligation, payload, reasons);
        crossMeasurementCache.set(matrixKey, matrix || null);
      }
      validateCrossCuttingObligation(obligation, matrix, reasons);
    }
  }

  const allCasesEligible = cases.length > 0 && eligibleCaseIds.length === cases.length;
  const suiteCandidate = summary.scopeKind === "full-suite";
  if (suiteCandidate && coverage.targetCount !== policy.suiteClosure.expectedExactUiTestIds) reasons.push("full-suite-exact-id-count-mismatch");
  if (suiteCandidate && JSON.stringify(cases.map(item => item.testId)) !== JSON.stringify(canonicalBinding.orderedTestIds)) {
    reasons.push("canonical-case-id-set-mismatch");
  }
  const uiFulltestPass = policyErrors.length === 0 && suiteCandidate && allCasesEligible && reasons.length === 0;
  return finish(policy, summary, reasons, eligibleCaseIds, uiFulltestPass);
}

function validateCanonicalParentPolicyBinding(summary, rootDir, reasons, canonicalCaseIds,
    expectedVerificationBranch) {
  const binding = summary?.canonicalParentBinding;
  if (!binding || typeof binding !== "object") {
    reasons.push("canonical-parent-binding-missing");
    return;
  }
  const counts = binding.counts;
  const exactCounts = counts && ["selected", "attempted", "pass", "fail", "notRun",
    "unsupported", "runnerAbort"].every(field => Number.isSafeInteger(counts[field]));
  if (binding.schema !== "media-server.v390-ui-canonical-parent.v1" ||
      typeof binding.runId !== "string" || !binding.runId || !exactCounts ||
      counts.selected !== 424 || counts.attempted !== 424 || counts.pass !== 424 ||
      counts.fail !== 0 || counts.notRun !== 0 || counts.unsupported !== 0 ||
      counts.runnerAbort !== 0 || summary.actualBrowserExecution !== true) {
    reasons.push("canonical-parent-binding-exact-counts-invalid");
  }
  const source = binding.sourceBinding;
  if (typeof expectedVerificationBranch !== "string" || !expectedVerificationBranch) {
    reasons.push("canonical-parent-binding-expected-branch-missing");
  } else if (source?.verificationBranch !== expectedVerificationBranch) {
    reasons.push("canonical-parent-binding-verification-branch-mismatch");
  }
  if (source?.verificationCommitSha !== summary.sourceBinding?.gitCommit ||
      source?.manifestSha256 !== summary.sourceBinding?.nativeExactManifestSha256 ||
      source?.buildSha256 !== summary.sourceBinding?.buildSha256 ||
      source?.childImplementationBinding?.runnerSha256 !== summary.sourceBinding?.runnerSha256) {
    reasons.push("canonical-parent-binding-source-digest-mismatch");
  }
  if (counts && (counts.selected !== summary.coverage?.targetCount ||
      counts.attempted !== summary.coverage?.attempted || counts.pass !== summary.coverage?.pass ||
      counts.fail !== summary.coverage?.fail || counts.notRun !== summary.coverage?.notRun ||
      counts.unsupported !== summary.coverage?.unsupported)) {
    reasons.push("canonical-parent-binding-coverage-mismatch");
  }
  const parentPath = resolveContained(rootDir, binding.parentSummaryPath);
  try {
    if (!binding.parentSummaryPath || !/^[a-f0-9]{64}$/.test(String(binding.parentSummarySha256 || "")) ||
        !parentPath || !fs.statSync(parentPath).isFile() || sha256File(parentPath) !== binding.parentSummarySha256) {
      reasons.push("canonical-parent-binding-summary-integrity-failed");
    } else {
      const parent = readJsonFile(parentPath);
      if (parent?.schema !== binding.schema || parent?.runBinding?.runId !== binding.runId ||
          parent?.result !== "PASS" || parent?.firstFailure !== null ||
          parent?.actualBrowserExecution !== true || parent?.suiteFinalizer?.status !== "PASS" ||
          !Array.isArray(parent?.cases) ||
          parent.cases.length !== 424 || JSON.stringify(parent?.counts) !== JSON.stringify(counts) ||
          JSON.stringify(parent?.sourceBinding) !== JSON.stringify(source)) {
        reasons.push("canonical-parent-binding-summary-content-mismatch");
      }
      const strictValidation = validateCanonicalParentAcceptanceSummary({
        summary: parent,
        canonicalCaseIds,
        artifactRoot: path.dirname(parentPath),
        summaryPath: parentPath,
        expectedVerificationCommitSha: summary.sourceBinding?.gitCommit,
        expectedVerificationBranch,
        expectedManifestSha256: summary.sourceBinding?.nativeExactManifestSha256,
        expectedBuildSha256: summary.sourceBinding?.buildSha256,
      });
      if (strictValidation.censusComplete !== true || strictValidation.eligible !== true) {
        reasons.push("canonical-parent-binding-strict-validation-failed");
        reasons.push(...strictValidation.reasons.map(reason =>
          `canonical-parent-binding-strict:${reason}`));
      }
    }
  } catch {
    reasons.push("canonical-parent-binding-summary-integrity-failed");
  }
}

function validateCrossCuttingMeasurements(policy, summary, rootDir, obligation, payload, reasons) {
  const planPath = resolveContained(rootDir, "test/fixtures/v390_ui_visual_matrix_plan.json");
  const canonicalPath = resolveContained(rootDir, policy.sourceBinding?.canonicalCaseManifestPath);
  const nativePath = resolveContained(rootDir, policy.sourceBinding?.nativeExactManifestPath);
  const plan = planPath && readJsonFile(planPath);
  const canonical = canonicalPath && readJsonFile(canonicalPath);
  const native = nativePath && readJsonFile(nativePath);
  let requiredVariants = [];
  try {
    validateVisualMatrixPlan({ plan, canonical, native });
    requiredVariants = expandVisualMatrixPlan(plan);
  } catch {
    reasons.push(`cross-cutting-${obligation}-visual-plan-invalid`);
    return null;
  }
  if (obligation === "video-overlay-crop" && summary.scopeKind === "full-suite") {
    validateLiveSourceCaseEvidence(policy, summary, rootDir, plan, payload, reasons);
  }
  const refs = Array.isArray(payload?.measuredEvidenceRefs) ? payload.measuredEvidenceRefs : [];
  if (refs.length !== requiredVariants.length * 2 || payload?.rawVariantCount !== requiredVariants.length) {
    reasons.push(`cross-cutting-${obligation}-measurement-ref-count-invalid`);
    return null;
  }
  const grouped = new Map();
  for (const ref of refs) {
    const attested = validateEvidenceRef(policy, summary, rootDir, ref, {
      expectedCaseId: "__suite__",
      expectedCorrelationId: ref?.correlationId,
      expectedContentType: ref?.contentType,
      prefix: `cross-cutting-${obligation}-measurement-ref`,
    }, reasons);
    if (!attested) continue;
    if (!grouped.has(ref.correlationId)) grouped.set(ref.correlationId, {});
    const group = grouped.get(ref.correlationId);
    if (ref.contentType === "image/png") group.screenshotPath = attested.path;
    else {
      const value = readJsonFile(attested.path);
      if (value?.schema === browserMeasurementSchema) group.measurement = value;
      else reasons.push(`cross-cutting-${obligation}-measurement-schema-invalid`);
    }
  }
  const probes = [];
  for (const [correlationId, group] of grouped.entries()) {
    if (!group.screenshotPath || !group.measurement) {
      reasons.push(`cross-cutting-${obligation}-measurement-group-incomplete`);
      continue;
    }
    try {
      const binding = group.measurement.caseBinding || {};
      const expectedCase = requiredVariants.find(item =>
        item.canonicalCaseId === binding.canonicalCaseId &&
        item.featureId === binding.featureId &&
        item.screenId === binding.screenId &&
        item.screenRoute === binding.screenRoute &&
        item.accountRole === binding.accountRole &&
        item.targetSelector === binding.targetSelector &&
        item.width === group.measurement?.viewport?.width &&
        item.height === group.measurement?.viewport?.height &&
        item.theme === group.measurement?.appliedTheme);
      if (!expectedCase) throw new Error("visual probe is not bound to the independent matrix plan");
      const recalculated = evaluateVisualArtifact({
        screenshotPath: group.screenshotPath,
        measurement: group.measurement,
        caseId: `qualified-${expectedCase.canonicalCaseId}-${expectedCase.width}-${expectedCase.theme}`,
        correlationId,
        expectedCase,
        liveVideoSpec: expectedCase.liveVideoRequired ? plan.liveVideoProbe : null,
      });
      if (recalculated.status !== "PASS" || recalculated.reviewRequired !== false) {
        reasons.push(`cross-cutting-${obligation}-independent-visual-failed`);
      }
      probes.push({
        id: recalculated.caseId,
        canonicalCaseId: expectedCase.canonicalCaseId,
        featureId: expectedCase.featureId,
        screenId: expectedCase.screenId,
        screenRoute: expectedCase.screenRoute,
        role: expectedCase.accountRole,
        width: expectedCase.width,
        height: expectedCase.height,
        theme: expectedCase.theme,
        payload: recalculated,
      });
    } catch {
      reasons.push(`cross-cutting-${obligation}-measurement-recalculation-failed`);
    }
  }
  const recalculatedMatrix = evaluateVisualMatrix(probes, { plan, canonical, native });
  if (recalculatedMatrix.status !== "PASS" || recalculatedMatrix.reviewRequired !== false) {
    reasons.push(`cross-cutting-${obligation}-independent-matrix-not-pass`);
  }
  return recalculatedMatrix;
}

function validateLiveSourceCaseEvidence(policy, summary, rootDir, plan, payload, reasons) {
  const requiredIds = plan?.liveVideoProbe?.requiredObligationIds || [];
  const evidence = Array.isArray(payload?.sourceCaseEvidence) ? payload.sourceCaseEvidence : [];
  if (JSON.stringify(evidence.map(item => item?.caseId)) !== JSON.stringify(requiredIds)) {
    reasons.push("cross-cutting-video-overlay-crop-source-case-set-mismatch");
    return;
  }
  for (const source of evidence) {
    const item = summary.cases?.find(candidate => candidate.testId === source.caseId);
    if (!item || source.actionId !== item.rawEvidence?.actionId ||
        JSON.stringify(source.traceRef) !== JSON.stringify(item.rawEvidence?.traceRef)) {
      reasons.push(`cross-cutting-video-overlay-crop-source-case-binding-mismatch:${source.caseId}`);
      continue;
    }
    validateEvidenceRef(policy, summary, rootDir, source.traceRef, {
      expectedCaseId: source.caseId,
      expectedCorrelationId: item.rawEvidence?.correlationId,
      expectedContentType: "application/json",
      prefix: "cross-cutting-video-overlay-crop-source-trace-ref",
    }, reasons);
  }
}

function validateCrossCuttingObligation(obligation, matrix, reasons) {
  if (!matrix) return;
  if (obligation === "video-overlay-crop" && matrix.hasVideoOverlay !== true) {
    reasons.push(`cross-cutting-${obligation}-independent-live-evidence-missing`);
  }
  if (obligation === "role-scope-guards" &&
      (!matrix.roles.includes("operator") || !matrix.roles.includes("viewer"))) {
    reasons.push(`cross-cutting-${obligation}-independent-role-evidence-missing`);
  }
}

function validateFreshness(policy, summary, reasons, now) {
  const started = Date.parse(summary.startedAt || "");
  const finished = Date.parse(summary.finishedAt || "");
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    reasons.push("invalid-execution-timestamps");
    return;
  }
  if (summary.durationMs !== finished - started) reasons.push("duration-mismatch");
  const ageHours = (now.getTime() - finished) / 3_600_000;
  if (ageHours < 0 || ageHours > policy.caseEquivalence.maxEvidenceAgeHours) reasons.push("evidence-stale-or-future-dated");
}

function validateSourceBinding(policy, summary, rootDir, reasons, { verifyCurrentSource, currentSource }) {
  const binding = summary.sourceBinding || {};
  for (const field of policy.sourceBinding.requiredFields) {
    if (!binding[field]) reasons.push(`source-binding-${field}-missing`);
  }
  for (const field of ["worktreePatchSha256", "buildSha256", "policySha256", "caseManifestSha256", "nativeExactManifestSha256", "runnerSha256"]) {
    if (binding[field] && !sha256Pattern.test(binding[field])) reasons.push(`source-binding-${field}-invalid-sha256`);
  }
  if (binding.currentSourceVerified === true) reasons.push("producer-current-source-self-claim-forbidden");
  for (const [pathField, hashField] of [["policyPath", "policySha256"], ["caseManifestPath", "caseManifestSha256"], ["nativeExactManifestPath", "nativeExactManifestSha256"], ["runnerPath", "runnerSha256"], ["buildPath", "buildSha256"]]) {
    const resolved = resolveContained(rootDir, binding[pathField]);
    if (!resolved || !fs.existsSync(resolved)) reasons.push(`source-binding-${pathField}-missing-file`);
    else if (sha256File(resolved) !== binding[hashField]) reasons.push(`source-binding-${hashField}-drift`);
  }
  if (!verifyCurrentSource) return;
  if (currentSource) {
    if (binding.version !== currentSource.version) reasons.push("source-binding-version-drift");
    if (binding.gitCommit !== currentSource.gitCommit) reasons.push("source-binding-gitCommit-drift");
    if (binding.worktreePatchSha256 !== currentSource.worktreePatchSha256) reasons.push("source-binding-worktreePatchSha256-drift");
  }
}

function loadCanonicalCaseBinding(policy, summary, rootDir, reasons) {
  const empty = { orderedTestIds: [], byTestId: new Map(), nativeByTestId: new Map() };
  const binding = summary.sourceBinding || {};
  const canonicalPath = policy.sourceBinding?.canonicalCaseManifestPath;
  if (binding.caseManifestPath !== canonicalPath) {
    reasons.push("source-binding-caseManifestPath-not-canonical");
    return empty;
  }
  const manifestPath = resolveContained(rootDir, canonicalPath);
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    reasons.push("canonical-case-manifest-missing-file");
    return empty;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    reasons.push("canonical-case-manifest-invalid-json");
    return empty;
  }
  if (manifest.schema !== policy.sourceBinding.canonicalCaseManifestSchema) reasons.push("canonical-case-manifest-schema-mismatch");
  if (manifest.version !== binding.version) reasons.push("canonical-case-manifest-version-mismatch");
  const manifestCases = Array.isArray(manifest.cases) ? manifest.cases : [];
  if (manifest.caseCount !== manifestCases.length) reasons.push("canonical-case-manifest-count-mismatch");
  if (manifestCases.length !== policy.suiteClosure.expectedExactUiTestIds) reasons.push("canonical-case-manifest-exact-count-mismatch");
  const testIds = manifestCases.map(item => item?.testId);
  const featureIds = manifestCases.map(item => item?.featureId);
  if (new Set(testIds).size !== testIds.length) reasons.push("canonical-case-manifest-duplicate-test-id");
  if (new Set(featureIds).size !== featureIds.length) reasons.push("canonical-case-manifest-duplicate-feature-id");

  const implementationRef = manifest.implementationEvidence || {};
  const implementationPath = resolveContained(rootDir, implementationRef.path);
  let implementation = null;
  if (!implementationPath || !fs.existsSync(implementationPath)) {
    reasons.push("canonical-implementation-evidence-missing-file");
  } else {
    try {
      implementation = JSON.parse(fs.readFileSync(implementationPath, "utf8"));
    } catch {
      reasons.push("canonical-implementation-evidence-invalid-json");
    }
  }
  if (implementationRef.schema !== policy.sourceBinding.canonicalImplementationEvidenceSchema ||
      implementation?.schema !== policy.sourceBinding.canonicalImplementationEvidenceSchema) {
    reasons.push("canonical-implementation-evidence-schema-mismatch");
  }
  if (Object.hasOwn(implementationRef, "sha256")) {
    reasons.push("canonical-implementation-whole-file-binding-forbidden");
  }
  if (implementationRef.bindingSchema !== canonicalImplementationProjectionSchema) {
    reasons.push("canonical-implementation-projection-schema-mismatch");
  }
  if (!sha256Pattern.test(String(implementationRef.projectionSha256 || ""))) {
    reasons.push("canonical-implementation-projection-hash-invalid");
  }

  let implementationCases = [];
  if (implementation) {
    try {
      implementationCases = canonicalImplementationProjection({
        implementation,
        orderedCaseIds: testIds,
        canonicalCases: manifestCases,
      });
      if (implementationRef.projectionSha256 !== sha256Text(JSON.stringify(implementationCases))) {
        reasons.push("canonical-implementation-evidence-projection-drift");
      }
    } catch {
      reasons.push("canonical-implementation-evidence-projection-invalid");
    }
  }
  if (implementationCases.length !== policy.suiteClosure.expectedExactUiTestIds) reasons.push("canonical-implementation-exact-count-mismatch");
  if (manifestCases.length === implementationCases.length) {
    for (let index = 0; index < manifestCases.length; index += 1) {
      const manifestCase = manifestCases[index] || {};
      const implementationCase = implementationCases[index] || {};
      for (const field of ["testId", "featureId", "route", "controlAction"]) {
        if (JSON.stringify(manifestCase[field]) !== JSON.stringify(implementationCase[field])) {
          reasons.push(`canonical-case-manifest-implementation-${field}-drift`);
        }
      }
      if (implementationCase.routeBinding?.screenRoute !== manifestCase.route) {
        reasons.push("canonical-case-manifest-implementation-screen-route-drift");
      }
      if (typeof implementationCase.routeBinding?.backendOwnerRoute !== "string" ||
          !implementationCase.routeBinding.backendOwnerRoute.startsWith("/")) {
        reasons.push("canonical-case-manifest-implementation-backend-owner-route-invalid");
      }
    }
  } else {
    reasons.push("canonical-case-manifest-implementation-order-drift");
  }

  for (const item of manifestCases) {
    if (!item?.testId || !item?.featureId) reasons.push("canonical-case-identity-missing");
    if (typeof item?.route !== "string" || !item.route.startsWith("/")) reasons.push("canonical-case-route-invalid");
    if (!["anonymous", "admin", "operator", "viewer"].includes(item?.accountRole)) reasons.push("canonical-case-account-role-invalid");
    if (!Number.isInteger(item?.viewport?.width) || item.viewport.width <= 0 ||
        !Number.isInteger(item?.viewport?.height) || item.viewport.height <= 0) reasons.push("canonical-case-viewport-invalid");
    if (!["light", "dark"].includes(item?.theme)) reasons.push("canonical-case-theme-invalid");
    if (typeof item?.controlAction?.actionAnchor !== "string" || item.controlAction.actionAnchor.length === 0 ||
        !(item.controlAction.selector === null || typeof item.controlAction.selector === "string")) {
      reasons.push("canonical-case-control-action-invalid");
    }
  }
  const nativePath = resolveContained(rootDir, policy.sourceBinding?.nativeExactManifestPath);
  let nativeManifest = null;
  if (binding.nativeExactManifestPath !== policy.sourceBinding?.nativeExactManifestPath) {
    reasons.push("source-binding-nativeExactManifestPath-not-canonical");
  } else if (!nativePath || !fs.existsSync(nativePath)) {
    reasons.push("native-exact-manifest-missing-file");
  } else {
    try {
      nativeManifest = JSON.parse(fs.readFileSync(nativePath, "utf8"));
    } catch {
      reasons.push("native-exact-manifest-invalid-json");
    }
  }
  if (nativeManifest?.schema !== policy.sourceBinding?.nativeExactManifestSchema) {
    reasons.push("native-exact-manifest-schema-mismatch");
  }
  const nativeCases = Array.isArray(nativeManifest?.cases) ? nativeManifest.cases : [];
  if (nativeCases.length !== manifestCases.length ||
      JSON.stringify(nativeCases.map(item => item.caseId)) !== JSON.stringify(testIds)) {
    reasons.push("native-exact-manifest-case-order-mismatch");
  } else {
    for (let index = 0; index < nativeCases.length; index += 1) {
      if (nativeCases[index]?.canonicalRoute !== manifestCases[index]?.route) {
        reasons.push("canonical-case-manifest-native-canonical-route-drift");
      }
    }
  }
  return {
    orderedTestIds: testIds,
    byTestId: new Map(manifestCases.map(item => [item.testId, item])),
    nativeByTestId: new Map(nativeCases.map(item => [item.caseId, item])),
  };
}

export function canonicalImplementationProjection({ implementation, orderedCaseIds, canonicalCases }) {
  if (!implementation || implementation.schema !== "media-server.feature-implementation-evidence.v2") {
    throw new Error("unexpected implementation evidence schema");
  }
  if (!Array.isArray(orderedCaseIds) || orderedCaseIds.length !== 424 || new Set(orderedCaseIds).size !== 424) {
    throw new Error("canonical implementation projection requires exact ordered 424 IDs");
  }
  if (!Array.isArray(canonicalCases) || canonicalCases.length !== orderedCaseIds.length ||
      JSON.stringify(canonicalCases.map(item => item?.testId)) !== JSON.stringify(orderedCaseIds)) {
    throw new Error("canonical implementation projection requires ordered canonical screen routes");
  }
  const implementationByManualId = new Map(
    (implementation.items || [])
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  if (implementationByManualId.size !== orderedCaseIds.length) {
    throw new Error("canonical implementation exact case count drift");
  }
  const canonicalById = new Map(canonicalCases.map(item => [item.testId, item]));
  return orderedCaseIds.map(testId => {
    const item = implementationByManualId.get(testId);
    if (!item) throw new Error(`${testId} implementation item missing`);
    return implementationCanonicalCase(item, canonicalById.get(testId)?.route);
  });
}

export function refreshCanonicalCaseManifest({ canonical, implementation }) {
  if (!canonical || canonical.schema !== "media-server.ui-fulltest-canonical-case-manifest.v1") {
    throw new Error("unexpected canonical case manifest schema");
  }
  if (!implementation || implementation.schema !== "media-server.feature-implementation-evidence.v2") {
    throw new Error("unexpected implementation evidence schema");
  }
  const orderedCaseIds = canonical.cases.map(item => item.testId);
  const projection = canonicalImplementationProjection({
    implementation,
    orderedCaseIds,
    canonicalCases: canonical.cases,
  });
  const projectionById = new Map(projection.map(item => [item.testId, item]));
  const refreshed = structuredClone(canonical);
  refreshed.implementationEvidence = {
    path: refreshed.implementationEvidence?.path || "test/fixtures/project_feature_implementation_evidence.json",
    schema: implementation.schema,
    bindingSchema: canonicalImplementationProjectionSchema,
    projectionSha256: sha256Text(JSON.stringify(projection)),
  };
  refreshed.cases = refreshed.cases.map(item => {
    const projected = projectionById.get(item.testId);
    if (!projected) throw new Error(`${item.testId} implementation projection missing`);
    return {
      ...item,
      ...projected,
      accountRole: item.accountRole,
      viewport: item.viewport,
      theme: item.theme,
    };
  });
  refreshed.caseCount = refreshed.cases.length;
  return refreshed;
}

function implementationCanonicalCase(item, canonicalScreenRoute) {
  const semantic = item.semanticEvidence || {};
  const backendOwnerRoute = semantic.controlSelector?.screenRoute ||
    (semantic.route?.applicability === "http-or-product-route" ? semantic.route.value : item.uiEvidence?.screenRoute);
  if (typeof canonicalScreenRoute !== "string" || !canonicalScreenRoute.startsWith("/")) {
    throw new Error(`${item.manualUiCaseId} canonical screen route missing`);
  }
  if (typeof backendOwnerRoute !== "string" || !backendOwnerRoute.startsWith("/")) {
    throw new Error(`${item.manualUiCaseId} backend owner route missing`);
  }
  const reviewedAction = semantic.actionHandler || {};
  const actionAnchor = typeof reviewedAction.anchor === "string" && reviewedAction.anchor.includes("/api/")
    ? reviewedAction.anchor
    : reviewedAction.symbol;
  return {
    testId: item.manualUiCaseId,
    featureId: item.id,
    route: canonicalScreenRoute,
    routeBinding: {
      screenRoute: canonicalScreenRoute,
      backendOwnerRoute,
    },
    controlAction: {
      selector: semantic.controlSelector?.value ?? null,
      actionAnchor,
    },
  };
}

function validateAdapter(policy, summary, reasons) {
  const adapter = summary.selectedAdapter || {};
  if (!policy.caseEquivalence.allowedAdapterEngines.includes(adapter.engine)) reasons.push("adapter-engine-not-qualified");
  const expectedTool = {
    "playwright-native": "playwright",
    "selenium-native": "selenium",
    "chrome-cdp-native": "chrome",
  }[adapter.engine];
  if (!expectedTool || adapter.tool !== expectedTool) reasons.push("adapter-tool-engine-mismatch");
  if (adapter.fallbackUsed !== false) reasons.push("adapter-fallback-used");
  if (!Array.isArray(adapter.capabilities)) reasons.push("adapter-capabilities-invalid");
  for (const capability of policy.caseEquivalence.requiredAdapterCapabilities) {
    if (!adapter.capabilities?.includes(capability)) reasons.push(`adapter-capability-${capability}-missing`);
  }
}

function validateSecurity(policy, summary, rootDir, cases, reasons) {
  if (summary.security?.redactionStatus !== policy.security.redactionStatus) reasons.push("redaction-not-pass");
  if (summary.security?.unapprovedConsoleMessages !== policy.security.unapprovedConsoleMessages) reasons.push("unapproved-console-message-present");
  if (summary.security?.forbiddenMaterialFindings !== 0) reasons.push("forbidden-material-found");
  const ref = summary.security?.evidenceRef;
  const correlationId = summary.security?.correlationId;
  const attested = validateEvidenceRef(policy, summary, rootDir, ref, {
    expectedCaseId: "__suite__",
    expectedCorrelationId: correlationId,
    expectedContentType: "application/json",
    prefix: "suite-redaction-evidence-ref",
  }, reasons);
  if (!attested) return;
  const payload = readJsonFile(attested.path);
  const expectedCaseIds = cases.map(item => item.testId);
  const expectedAttestations = cases.map(item => ({
    caseId: item.testId,
    sha256: item.security?.evidenceRef?.sha256,
  }));
  if (payload?.schema !== policy.attestation.redactionScanSchema || payload?.scope !== "suite" ||
      payload?.status !== "PASS" || payload?.correlationId !== correlationId ||
      JSON.stringify(payload?.caseIds) !== JSON.stringify(expectedCaseIds) ||
      JSON.stringify(payload?.caseAttestations) !== JSON.stringify(expectedAttestations) ||
      !Array.isArray(payload?.findings) || payload.findings.length !== 0) {
    reasons.push("suite-redaction-evidence-payload-invalid");
  }
}

function validateCleanup(summary, reasons) {
  for (const field of ["serversStopped", "portsClean", "temporaryArtifactsRemoved"]) {
    if (summary.cleanup?.[field] !== true) reasons.push(`cleanup-${field}-not-true`);
  }
}

function validateCase(policy, item, summary, rootDir, { verifyArtifacts, canonicalCase, nativeCase }) {
  const reasons = [];
  let tracePayload = null;
  if (!item?.testId) reasons.push("test-id-missing");
  if (!canonicalCase) {
    reasons.push("unknown-canonical-case-id");
  } else {
    if (item?.featureId !== canonicalCase.featureId) reasons.push("canonical-feature-id-mismatch");
  }
  if (!nativeCase) reasons.push("unknown-native-case-id");
  if (item?.rawOutcome !== "completed") reasons.push("raw-case-outcome-not-completed");
  if (item?.requestedObservedSchema !== "media-server.v390-ui-requested-observed-envelope.v1") {
    reasons.push("requested-observed-envelope-schema-mismatch");
  }
  const expectedCompletion = nativeCase?.workflow?.expectedResults?.[0]?.completion;
  const correlationId = expectedCompletion?.correlationId || "";
  if (expectedCompletion?.phase !== "primary-action") reasons.push("native-primary-completion-contract-missing");
  const raw = item?.rawEvidence || {};
  if (raw.schema !== "media-server.ui-policy-v4-raw-case-ref.v1") reasons.push("raw-case-ref-schema-mismatch");
  if (raw.actionId !== expectedCompletion?.actionId || raw.actionKind !== expectedCompletion?.actionKind ||
      raw.controlSelector !== expectedCompletion?.controlSelector || raw.correlationId !== correlationId) {
    reasons.push("raw-case-ref-primary-binding-mismatch");
  }
  const traceRef = validateEvidenceRef(policy, summary, rootDir, raw.traceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: correlationId,
    expectedContentType: "application/json",
    prefix: "raw-trace-evidence-ref",
  }, reasons);
  if (traceRef && !sameArtifactReference(raw.traceRef, item?.artifacts?.trace)) reasons.push("raw-trace-ref-artifact-mismatch");
  if (traceRef && canonicalCase && nativeCase) {
    tracePayload = readJsonFile(traceRef.path);
    const qualification = qualifyRawCase({
      trace: tracePayload,
      requested: item.requested,
      observed: item.observed,
      canonicalCase,
      nativeCase,
    });
    reasons.push(...qualification.reasons);
    validateCaseConsole(policy, item, summary, rootDir, tracePayload, nativeCase, reasons);
  }

  const visual = item?.visualEvidence || {};
  if (visual.schema !== "media-server.ui-raw-visual-capture.v1" ||
      visual.qualificationStatus !== "unqualified-raw-capture" || visual.correlationId !== correlationId) {
    reasons.push("raw-visual-evidence-schema-mismatch");
  }
  const visualRef = validateEvidenceRef(policy, summary, rootDir, visual.evidenceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: correlationId,
    expectedContentType: "application/json",
    prefix: "raw-visual-binding-ref",
  }, reasons);
  if (visualRef && !sameArtifactReference(visual.evidenceRef, item?.artifacts?.visualDiff)) reasons.push("raw-visual-binding-ref-artifact-mismatch");
  const measurementRef = validateEvidenceRef(policy, summary, rootDir, visual.measurementRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: correlationId,
    expectedContentType: "application/json",
    prefix: "raw-visual-measurement-ref",
  }, reasons);
  if (measurementRef && !sameArtifactReference(visual.measurementRef, item?.artifacts?.visualMeasurement)) reasons.push("raw-visual-measurement-ref-artifact-mismatch");
  const screenshotRef = validateEvidenceRef(policy, summary, rootDir, visual.screenshotRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: correlationId,
    expectedContentType: "image/png",
    prefix: "raw-visual-screenshot-ref",
  }, reasons);
  if (screenshotRef && !sameArtifactReference(visual.screenshotRef, item?.artifacts?.screenshot)) reasons.push("raw-visual-screenshot-ref-artifact-mismatch");
  if (visualRef && measurementRef && screenshotRef) {
    const binding = readJsonFile(visualRef.path);
    if (binding?.schema !== "media-server.ui-raw-visual-capture.v1" || binding?.caseId !== item.testId ||
        binding?.correlationId !== correlationId || binding?.screenshotSha256 !== screenshotRef.ref.sha256 ||
        binding?.measurementSha256 !== measurementRef.ref.sha256 ||
        binding?.qualificationStatus !== "unqualified-raw-capture") {
      reasons.push("raw-visual-binding-payload-invalid");
    }
    const measurement = readJsonFile(measurementRef.path);
    const expectedVisualBinding = resolveIndependentVisualBinding(
      tracePayload,
      nativeCase,
      measurement,
      reasons,
    );
    const expectedCase = {
      canonicalCaseId: item.testId,
      featureId: item.featureId,
      screenId: item.testId,
      screenRoute: expectedVisualBinding.screenRoute,
      accountRole: expectedVisualBinding.accountRole,
      targetSelector: expectedVisualBinding.targetSelector,
      width: nativeCase?.viewport?.width,
      height: nativeCase?.viewport?.height,
      theme: nativeCase?.theme,
      liveVideoRequired: false,
    };
    try {
      const recalculated = evaluateVisualArtifact({
        screenshotPath: screenshotRef.path,
        measurement,
        caseId: item.testId,
        correlationId,
        expectedCase,
        liveVideoSpec: null,
      });
      if (recalculated.status !== "PASS" || recalculated.reviewRequired !== false) {
        reasons.push("independent-case-visual-not-pass");
      }
    } catch {
      reasons.push("independent-case-visual-recalculation-failed");
    }
  }
  const redactionRef = validateEvidenceRef(policy, summary, rootDir, item?.security?.evidenceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: correlationId,
    expectedContentType: "application/json",
    prefix: "case-redaction-evidence-ref",
  }, reasons);
  if (redactionRef && !sameArtifactReference(item?.security?.evidenceRef, item?.artifacts?.redactionScan)) reasons.push("case-redaction-evidence-ref-artifact-mismatch");
  if (redactionRef) validateCaseRedaction(policy, item, summary, rootDir, redactionRef.path, reasons);
  if (verifyArtifacts) validateArtifacts(policy, item, summary, rootDir, correlationId, reasons);
  return [...new Set(reasons)];
}

function resolveIndependentVisualBinding(trace, nativeCase, measurement, reasons) {
  const lifecycle = trace?.postActionLifecycleEvidence;
  const target = trace?.postActionVisualTargetEvidence;
  let screenRoute = nativeCase?.screenRoute || "";
  let targetSelector = nativeCase?.controlAction?.targetSelector || "body";
  if (lifecycle?.schema === "media-server.v390-ui-post-action-lifecycle-evidence.v1" &&
      lifecycle.caseId === nativeCase?.caseId && lifecycle.pass === true &&
      lifecycle.postNavigation?.observedRoute === lifecycle.postNavigation?.route &&
      lifecycle.postNavigation?.destinationExists === true) {
    screenRoute = lifecycle.postNavigation.observedRoute;
    targetSelector = lifecycle.postNavigation.selector;
  } else if (target?.schema === "media-server.v390-ui-post-action-visual-target.v1" &&
      target.caseId === nativeCase?.caseId && target.observedRoute && target.selector &&
      target.requestedState === "visible" && target.ownerCandidateCount === 1 &&
      Number.isInteger(target.navigationEpoch) && target.navigationEpoch > 0 &&
      target.sourceSelectorRewaited === false &&
      [
        "post-action-visible-source-owner",
        "post-action-visible-document-owner",
        "post-action-visible-destination-owner",
      ].includes(target.bindingKind)) {
    screenRoute = target.observedRoute;
    targetSelector = target.selector;
  } else {
    reasons.push("independent-visual-lifecycle-binding-missing");
  }
  const role = trace?.postActionVisualRoleEvidence;
  if (role?.schema !== "media-server.v390-ui-post-action-visual-role.v1" ||
      role.caseId !== nativeCase?.caseId || role.actionId !==
        nativeCase?.workflow?.expectedResults?.[0]?.completion?.actionId ||
      role.route !== screenRoute || role.source !== "browser-auth-whoami" ||
      !["anonymous", "viewer", "operator", "admin"].includes(role.accountRole) ||
      role.accountRole !== measurement?.accountRole) {
    reasons.push("independent-visual-role-binding-mismatch");
  }
  return {
    screenRoute,
    targetSelector,
    accountRole: role?.accountRole || nativeCase?.accountRole,
  };
}

function validateCaseConsole(policy, item, summary, rootDir, trace, nativeCase, reasons) {
  const artifactRoot = resolveContained(rootDir, summary.sourceBinding?.artifactRoot);
  const artifact = item?.artifacts?.browserConsole;
  const resolved = artifactRoot && artifact ? resolveContained(artifactRoot, artifact.path) : null;
  if (!resolved || !isInside(artifactRoot, resolved) || !fs.existsSync(resolved) ||
      sha256File(resolved) !== artifact.sha256) return;
  const payload = isJson(resolved, artifact.contentType) ? readJsonFile(resolved) : null;
  if (!payload || payload.schema !== policy.attestation.browserConsoleSchema || !Array.isArray(payload.messages)) return;
  const qualification = qualifyBrowserConsoleMessages({ messages: payload.messages, trace, nativeCase });
  if (JSON.stringify(payload.census) !== JSON.stringify(qualification.census) ||
      JSON.stringify(item?.security?.consoleCensus) !== JSON.stringify(qualification.census)) {
    reasons.push("case-console-census-mismatch");
  }
  if (!Number.isSafeInteger(item?.security?.unapprovedConsoleMessages) ||
      qualification.unapprovedConsoleMessages !== item.security.unapprovedConsoleMessages) {
    reasons.push("case-console-unapproved-message-count-mismatch");
  }
  const actualApprovals = payload.messages.map(message => message.approval || null);
  const expectedApprovals = qualification.messages.map(message => message.approval || null);
  if (JSON.stringify(actualApprovals) !== JSON.stringify(expectedApprovals)) {
    reasons.push("case-console-approval-attestation-mismatch");
  }
}

function validateArtifacts(policy, item, summary, rootDir, correlationId, reasons) {
  const artifactRoot = resolveContained(rootDir, summary.sourceBinding?.artifactRoot);
  if (!artifactRoot || !fs.existsSync(artifactRoot)) {
    reasons.push("artifact-root-invalid");
    return;
  }
  for (const name of policy.caseEquivalence.requiredArtifacts) {
    const artifact = item.artifacts?.[name];
    if (!artifact) {
      reasons.push(`artifact-${name}-missing`);
      continue;
    }
    const resolved = resolveContained(artifactRoot, artifact.path);
    if (!resolved || !isInside(artifactRoot, resolved) || !fs.existsSync(resolved)) {
      reasons.push(`artifact-${name}-path-invalid`);
      continue;
    }
    const stat = fs.statSync(resolved);
    if (!stat.isFile() || stat.size !== artifact.bytes || sha256File(resolved) !== artifact.sha256) reasons.push(`artifact-${name}-integrity-failed`);
    if (stat.size > policy.attestation.maxArtifactBytes) reasons.push(`artifact-${name}-too-large`);
    if (!sha256Pattern.test(artifact.sha256 || "")) reasons.push(`artifact-${name}-sha256-invalid`);
    if (artifact.caseId !== item.testId || artifact.correlationId !== correlationId) reasons.push(`artifact-${name}-case-correlation-mismatch`);
    if (name === "screenshot" && !decodePng(resolved, artifact.contentType, policy.attestation.maxArtifactBytes)) reasons.push("artifact-screenshot-not-decodable-png");
    if (name === "trace" && !isJson(resolved, artifact.contentType)) reasons.push("artifact-trace-not-json");
    if (name === "visualMeasurement") {
      const payload = isJson(resolved, artifact.contentType) ? readJsonFile(resolved) : null;
      if (!payload || payload.schema !== browserMeasurementSchema) reasons.push("artifact-visual-measurement-schema-invalid");
    }
    if (name === "browserConsole") {
      const payload = isJson(resolved, artifact.contentType) ? readJsonFile(resolved) : null;
      if (!payload) reasons.push("artifact-browser-console-not-json");
      else if (payload.schema !== policy.attestation.browserConsoleSchema || payload.caseId !== item.testId ||
          payload.correlationId !== correlationId || !Array.isArray(payload.messages)) {
        reasons.push("artifact-browser-console-schema-invalid");
      }
    }
    if (name === "serverLog") {
      if (artifact.contentType !== "text/plain") reasons.push("artifact-server-log-not-text");
      else {
        const text = fs.readFileSync(resolved, "utf8");
        if (text && !text.includes(correlationId) && !text.includes(item.testId)) reasons.push("artifact-server-log-case-correlation-mismatch");
      }
    }
  }
  scanArtifactFiles(policy, item, artifactRoot, reasons);
  const video = item.artifacts?.video;
  if (video) {
    const resolved = resolveContained(artifactRoot, video.path);
    if (!resolved || !isInside(artifactRoot, resolved) || !fs.existsSync(resolved)) reasons.push("artifact-video-path-invalid");
    else if (/fixture video placeholder/i.test(fs.readFileSync(resolved, "utf8"))) reasons.push("artifact-video-placeholder-rejected");
  }
}

function validateEvidenceRef(policy, summary, rootDir, ref, expectations, reasons) {
  const { prefix, expectedCaseId, expectedCorrelationId, expectedContentType } = expectations;
  if (!ref || typeof ref !== "object" || Array.isArray(ref) || ref.schema !== policy.attestation.evidenceRefSchema) {
    reasons.push(`${prefix}-not-attested`);
    return null;
  }
  if (ref.caseId !== expectedCaseId || !expectedCorrelationId || ref.correlationId !== expectedCorrelationId) {
    reasons.push(`${prefix}-case-correlation-mismatch`);
  }
  if (ref.contentType !== expectedContentType) reasons.push(`${prefix}-content-type-mismatch`);
  if (!sha256Pattern.test(ref.sha256 || "") || !Number.isInteger(ref.bytes) || ref.bytes < 0) {
    reasons.push(`${prefix}-metadata-invalid`);
  }
  const artifactRoot = resolveContained(rootDir, summary.sourceBinding?.artifactRoot);
  if (!artifactRoot || !fs.existsSync(artifactRoot)) {
    reasons.push(`${prefix}-artifact-root-invalid`);
    return null;
  }
  const resolved = resolveContained(artifactRoot, ref.path);
  if (!resolved || !fs.existsSync(resolved)) {
    reasons.push(`${prefix}-path-invalid`);
    return null;
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile() || stat.size !== ref.bytes || stat.size > policy.attestation.maxArtifactBytes ||
      sha256File(resolved) !== ref.sha256) {
    reasons.push(`${prefix}-integrity-failed`);
    return null;
  }
  for (const finding of forbiddenFindings(policy, resolved)) reasons.push(`${prefix}-forbidden-material-${finding}`);
  return { path: resolved, ref };
}

function sameArtifactReference(ref, artifact) {
  return Boolean(ref && artifact && ref.path === artifact.path && ref.sha256 === artifact.sha256 &&
    ref.bytes === artifact.bytes && ref.contentType === artifact.contentType &&
    ref.caseId === artifact.caseId && ref.correlationId === artifact.correlationId);
}

function validateCaseRedaction(policy, item, summary, rootDir, scanPath, reasons) {
  const payload = readJsonFile(scanPath);
  const correlationId = item?.security?.correlationId;
  const expectedArtifacts = policy.caseEquivalence.requiredArtifacts
    .filter(name => name !== "redactionScan")
    .map(name => ({ path: item?.artifacts?.[name]?.path, sha256: item?.artifacts?.[name]?.sha256 }));
  if (payload?.schema !== policy.attestation.redactionScanSchema || payload?.scope !== "case" ||
      payload?.status !== "PASS" || payload?.caseId !== item?.testId || payload?.correlationId !== correlationId ||
      JSON.stringify(payload?.scannedArtifacts) !== JSON.stringify(expectedArtifacts) ||
      !Array.isArray(payload?.findings) || payload.findings.length !== 0) {
    reasons.push("case-redaction-evidence-payload-invalid");
  }
  const artifactRoot = resolveContained(rootDir, summary.sourceBinding?.artifactRoot);
  if (!artifactRoot) reasons.push("case-redaction-artifact-root-invalid");
}

function scanArtifactFiles(policy, item, artifactRoot, reasons) {
  for (const [name, artifact] of Object.entries(item.artifacts || {})) {
    const resolved = resolveContained(artifactRoot, artifact?.path);
    if (!resolved || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue;
    if (fs.statSync(resolved).size > policy.attestation.maxArtifactBytes) continue;
    for (const finding of forbiddenFindings(policy, resolved)) reasons.push(`artifact-${name}-forbidden-material-${finding}`);
  }
}

function forbiddenFindings(policy, filePath) {
  const text = fs.readFileSync(filePath).toString("utf8");
  return (policy.security.forbiddenMaterialPatterns || [])
    .filter(pattern => new RegExp(pattern.source, pattern.flags || "").test(text))
    .map(pattern => pattern.id);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function finish(policy, summary, reasons, eligibleCaseIds, uiFulltestPass) {
  const uniqueReasons = [...new Set(reasons)].sort();
  return {
    policySchema: policy?.schema || "",
    policyVersion: policy?.policyVersion,
    policyValidationResult: validatePolicy(policy).length === 0 ? "PASS" : "FAIL",
    evidenceSchema: summary?.schema || "",
    evidenceEligibility: uniqueReasons.length === 0 ? "eligible" : "ineligible",
    qualifiedCaseCount: eligibleCaseIds.length,
    qualifiedCaseIds: eligibleCaseIds,
    uiFulltestPass,
    uiFulltestResult: uiFulltestPass ? "PASS" : "FAIL",
    reasons: uniqueReasons,
  };
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function resolveContained(baseDir, candidate) {
  if (!candidate || path.isAbsolute(candidate)) return null;
  const resolved = path.resolve(baseDir, candidate);
  if (!isInside(baseDir, resolved)) return null;
  if (!fs.existsSync(resolved)) return resolved;
  if (hasSymlinkAncestor(baseDir, resolved)) return null;
  const realBase = fs.existsSync(baseDir) ? fs.realpathSync(baseDir) : path.resolve(baseDir);
  const realResolved = fs.realpathSync(resolved);
  return isInside(realBase, realResolved) ? realResolved : null;
}

function hasSymlinkAncestor(baseDir, candidate) {
  const relative = path.relative(path.resolve(baseDir), path.resolve(candidate));
  let current = path.resolve(baseDir);
  try {
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function isInside(baseDir, candidate) {
  const relative = path.relative(path.resolve(baseDir), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function decodePng(filePath, contentType, maxDecodedBytes) {
  if (contentType !== "image/png") return null;
  try {
    const bytes = fs.readFileSync(filePath);
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature)) return null;
    let offset = 8;
    let ihdr = null;
    let sawIend = false;
    const idat = [];
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > bytes.length) return null;
      const typeBytes = bytes.subarray(offset + 4, offset + 8);
      const type = typeBytes.toString("ascii");
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
      if (crc32(Buffer.concat([typeBytes, data])) !== expectedCrc) return null;
      if (type === "IHDR") {
        if (ihdr || length !== 13) return null;
        ihdr = {
          width: data.readUInt32BE(0),
          height: data.readUInt32BE(4),
          bitDepth: data[8],
          colorType: data[9],
          compression: data[10],
          filter: data[11],
          interlace: data[12],
        };
      } else if (type === "IDAT") {
        idat.push(data);
      } else if (type === "IEND") {
        if (length !== 0) return null;
        sawIend = true;
        offset = chunkEnd;
        break;
      }
      offset = chunkEnd;
    }
    if (!ihdr || !sawIend || offset !== bytes.length || idat.length === 0 ||
        ihdr.width <= 0 || ihdr.height <= 0 || ihdr.bitDepth !== 8 ||
        ihdr.compression !== 0 || ihdr.filter !== 0 || ihdr.interlace !== 0) return null;
    const channels = new Map([[0, 1], [2, 3], [4, 2], [6, 4]]).get(ihdr.colorType);
    if (!channels) return null;
    const rowBytes = ihdr.width * channels;
    const expectedDecodedBytes = ihdr.height * (rowBytes + 1);
    if (!Number.isSafeInteger(expectedDecodedBytes) || expectedDecodedBytes > maxDecodedBytes) return null;
    const decoded = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: maxDecodedBytes });
    if (decoded.length !== expectedDecodedBytes) return null;
    for (let row = 0; row < ihdr.height; row += 1) {
      if (decoded[row * (rowBytes + 1)] > 4) return null;
    }
    return { width: ihdr.width, height: ihdr.height, colorType: ihdr.colorType };
  } catch {
    return null;
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isJson(filePath, contentType) {
  if (contentType !== "application/json") return false;
  try {
    JSON.parse(fs.readFileSync(filePath, "utf8"));
    return true;
  } catch {
    return false;
  }
}

function expect(condition, message, errors) {
  if (!condition) errors.push(message);
}

function expectIncludes(values, expected, label, errors) {
  expect(Array.isArray(values) && values.includes(expected), `${label} missing`, errors);
}

function expectExact(values, expected, label, errors) {
  expect(JSON.stringify(values) === JSON.stringify(expected), `${label} mismatch`, errors);
}
