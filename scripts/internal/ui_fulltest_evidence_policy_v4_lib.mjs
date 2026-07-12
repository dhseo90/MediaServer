// 파일 용도: UI fulltest Evidence Policy v4와 실행 evidence의 적격성을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const sha256Pattern = /^[a-f0-9]{64}$/;

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
  for (const artifact of ["screenshot", "trace", "browserConsole", "serverLog", "visualDiff", "redactionScan"]) {
    expectIncludes(policy?.caseEquivalence?.requiredArtifacts, artifact, `required case artifact ${artifact}`, errors);
  }
  for (const oracle of ["dom-transition", "network-response-and-dom", "persisted-state-readback", "eventrecord-correlation", "server-log-correlation"]) {
    expectIncludes(policy?.caseEquivalence?.allowedCompletionOracles, oracle, `completion oracle ${oracle}`, errors);
  }
  expect(policy?.caseEquivalence?.requiredAssertionBoundary === "exact-selector-visible-innerText-only", "exact selector assertion boundary missing", errors);
  expect(policy?.caseEquivalence?.visualBaselineSchema === "media-server.ui-visual-baseline-diff.v1", "visual baseline schema mismatch", errors);
  expect(Number.isInteger(policy?.caseEquivalence?.maxEvidenceAgeHours) && policy.caseEquivalence.maxEvidenceAgeHours > 0, "maxEvidenceAgeHours must be positive", errors);
  expect(policy?.suiteClosure?.expectedExactUiTestIds === 424, "suite expected exact UI test IDs must be 424", errors);
  expectExact(policy?.suiteClosure?.allowedCaseStatuses, ["direct-pass", "automation-equivalent-pass"], "allowed case statuses", errors);
  for (const count of ["fail", "notRun", "unsupported", "unapprovedExclusions", "manualIntervention"]) {
    expectIncludes(policy?.suiteClosure?.requiredZeroCounts, count, `suite zero count ${count}`, errors);
  }
  for (const obligation of ["visual-quality", "responsive-320-390-760-1180", "light-dark-theme", "role-scope-guards", "client-viewer-redaction", "video-overlay-crop", "accessibility-focus-contrast"]) {
    expectIncludes(policy?.suiteClosure?.requiredCrossCuttingObligations, obligation, `cross-cutting obligation ${obligation}`, errors);
  }
  for (const field of ["version", "gitCommit", "worktreePatchSha256", "buildPath", "buildSha256", "policyPath", "policySha256", "caseManifestPath", "caseManifestSha256", "runnerPath", "runnerSha256", "artifactRoot"]) {
    expectIncludes(policy?.sourceBinding?.requiredFields, field, `source binding field ${field}`, errors);
  }
  expect(policy?.sourceBinding?.canonicalCaseManifestPath === "test/fixtures/ui_fulltest_case_manifest_policy_v4.json", "canonical case manifest path mismatch", errors);
  expect(policy?.sourceBinding?.canonicalCaseManifestSchema === "media-server.ui-fulltest-canonical-case-manifest.v1", "canonical case manifest schema mismatch", errors);
  expect(policy?.sourceBinding?.canonicalImplementationEvidenceSchema === "media-server.feature-implementation-evidence.v2", "canonical implementation evidence schema mismatch", errors);
  expect(policy?.sourceBinding?.sha256Pattern === "^[a-f0-9]{64}$", "source binding sha256 pattern mismatch", errors);
  expect(policy?.sourceBinding?.requireCurrentSourceVerification === true, "current source verification must be required", errors);
  expect(policy?.attestation?.evidenceRefSchema === "media-server.ui-evidence-ref.v1", "evidence ref schema mismatch", errors);
  expect(policy?.attestation?.interactionTraceSchema === "media-server.ui-interaction-trace.v1", "interaction trace schema mismatch", errors);
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
  if (summary.result !== "PASS") reasons.push("summary-result-not-pass");
  if (summary.manualIntervention !== false) reasons.push("manual-intervention-present");
  if (summary.failedInteractionCount !== 0) reasons.push("failed-interaction-present");
  if (summary.replayStatus !== "PASS") reasons.push("replay-not-pass");

  validateFreshness(policy, summary, reasons, options.now || new Date());
  validateSourceBinding(policy, summary, rootDir, reasons, {
    verifyCurrentSource: options.verifyCurrentSource !== false,
    currentSource: options.currentSource,
  });
  const canonicalBinding = loadCanonicalCaseBinding(policy, summary, rootDir, reasons);
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
    });
    if (caseIds.has(item?.testId)) caseReasons.push("duplicate-test-id");
    caseIds.add(item?.testId);
    if (caseReasons.length === 0) eligibleCaseIds.push(item.testId);
    else reasons.push(...caseReasons.map(reason => `${item?.testId || "unknown-case"}:${reason}`));
  }

  const coverage = summary.coverage || {};
  const obligationIds = Array.isArray(coverage.obligationIds) ? coverage.obligationIds : [];
  if (coverage.targetCount !== obligationIds.length) reasons.push("coverage-target-count-mismatch");
  if (coverage.targetCount !== cases.length) reasons.push("coverage-case-count-mismatch");
  if (new Set(obligationIds).size !== obligationIds.length) reasons.push("coverage-obligation-id-duplicate");
  if (JSON.stringify(obligationIds) !== JSON.stringify(cases.map(item => item.testId))) reasons.push("coverage-obligation-case-order-mismatch");
  for (const field of policy.suiteClosure.requiredZeroCounts) {
    if (Number(coverage[field] || 0) !== 0) reasons.push(`coverage-${field}-must-be-zero`);
  }

  const crossCutting = new Map((summary.crossCuttingObligations || []).map(item => [item.id, item]));
  const caseSetSha256 = sha256Text(JSON.stringify(cases.map(item => item.testId)));
  for (const obligation of policy.suiteClosure.requiredCrossCuttingObligations) {
    const item = crossCutting.get(obligation);
    if (!item || item.status !== "PASS" || !item.evidenceRef) {
      reasons.push(`cross-cutting-${obligation}-not-pass`);
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
          payload?.status !== "PASS" || payload?.caseSetSha256 !== caseSetSha256 ||
          payload?.correlationId !== item.correlationId) {
        reasons.push(`cross-cutting-${obligation}-payload-invalid`);
      }
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
  for (const field of ["worktreePatchSha256", "buildSha256", "policySha256", "caseManifestSha256", "runnerSha256"]) {
    if (binding[field] && !sha256Pattern.test(binding[field])) reasons.push(`source-binding-${field}-invalid-sha256`);
  }
  if (binding.currentSourceVerified !== true) reasons.push("current-source-not-verified");
  for (const [pathField, hashField] of [["policyPath", "policySha256"], ["caseManifestPath", "caseManifestSha256"], ["runnerPath", "runnerSha256"], ["buildPath", "buildSha256"]]) {
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
  const empty = { orderedTestIds: [], byTestId: new Map() };
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
    if (sha256File(implementationPath) !== implementationRef.sha256) reasons.push("canonical-implementation-evidence-hash-drift");
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

  const implementationCases = Array.isArray(implementation?.items)
    ? implementation.items.filter(item => item.manualUiCaseId !== null).map(implementationCanonicalCase)
    : [];
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
    }
  } else {
    reasons.push("canonical-case-manifest-implementation-order-drift");
  }

  for (const item of manifestCases) {
    if (!item?.testId || !item?.featureId) reasons.push("canonical-case-identity-missing");
    if (typeof item?.route !== "string" || !item.route.startsWith("/")) reasons.push("canonical-case-route-invalid");
    if (!["anonymous", "operator", "viewer"].includes(item?.accountRole)) reasons.push("canonical-case-account-role-invalid");
    if (!Number.isInteger(item?.viewport?.width) || item.viewport.width <= 0 ||
        !Number.isInteger(item?.viewport?.height) || item.viewport.height <= 0) reasons.push("canonical-case-viewport-invalid");
    if (!["light", "dark"].includes(item?.theme)) reasons.push("canonical-case-theme-invalid");
    if (typeof item?.controlAction?.actionAnchor !== "string" || item.controlAction.actionAnchor.length === 0 ||
        !(item.controlAction.selector === null || typeof item.controlAction.selector === "string")) {
      reasons.push("canonical-case-control-action-invalid");
    }
  }
  return {
    orderedTestIds: testIds,
    byTestId: new Map(manifestCases.map(item => [item.testId, item])),
  };
}

export function refreshCanonicalCaseManifest({ canonical, implementation, implementationSha256 }) {
  if (!canonical || canonical.schema !== "media-server.ui-fulltest-canonical-case-manifest.v1") {
    throw new Error("unexpected canonical case manifest schema");
  }
  if (!implementation || implementation.schema !== "media-server.feature-implementation-evidence.v2") {
    throw new Error("unexpected implementation evidence schema");
  }
  const implementationByManualId = new Map(
    (implementation.items || [])
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  if (implementationByManualId.size !== canonical.cases.length) {
    throw new Error("canonical implementation exact case count drift");
  }
  const refreshed = structuredClone(canonical);
  refreshed.implementationEvidence = {
    ...refreshed.implementationEvidence,
    schema: implementation.schema,
    sha256: implementationSha256,
  };
  refreshed.cases = refreshed.cases.map(item => {
    const implementationItem = implementationByManualId.get(item.testId);
    if (!implementationItem) throw new Error(`${item.testId} implementation item missing`);
    return {
      ...item,
      ...implementationCanonicalCase(implementationItem),
      accountRole: item.accountRole,
      viewport: item.viewport,
      theme: item.theme,
    };
  });
  refreshed.caseCount = refreshed.cases.length;
  return refreshed;
}

function implementationCanonicalCase(item) {
  const semantic = item.semanticEvidence || {};
  const route = semantic.controlSelector?.screenRoute ||
    (semantic.route?.applicability === "http-or-product-route" ? semantic.route.value : item.uiEvidence?.screenRoute);
  const reviewedAction = semantic.actionHandler || {};
  const actionAnchor = typeof reviewedAction.anchor === "string" && reviewedAction.anchor.includes("/api/")
    ? reviewedAction.anchor
    : reviewedAction.symbol;
  return {
    testId: item.manualUiCaseId,
    featureId: item.id,
    route,
    controlAction: {
      selector: semantic.controlSelector?.value ?? null,
      actionAnchor,
    },
  };
}

function validateAdapter(policy, summary, reasons) {
  const adapter = summary.selectedAdapter || {};
  if (!policy.caseEquivalence.allowedAdapterEngines.includes(adapter.engine)) reasons.push("adapter-engine-not-qualified");
  if (adapter.fallbackUsed !== false) reasons.push("adapter-fallback-used");
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

function validateCase(policy, item, summary, rootDir, { verifyArtifacts, canonicalCase }) {
  const reasons = [];
  if (!item?.testId) reasons.push("test-id-missing");
  if (!canonicalCase) {
    reasons.push("unknown-canonical-case-id");
  } else {
    if (item?.featureId !== canonicalCase.featureId) reasons.push("canonical-feature-id-mismatch");
    for (const field of ["route", "accountRole", "viewport", "theme", "controlAction"]) {
      if (JSON.stringify(item?.requested?.[field]) !== JSON.stringify(canonicalCase[field])) reasons.push(`canonical-${field}-mismatch`);
    }
  }
  if (!["direct-pass", "automation-equivalent-pass"].includes(item?.evidenceStatus)) reasons.push("evidence-status-not-qualified");
  if (item?.status !== "PASS") reasons.push("case-status-not-pass");
  for (const field of ["route", "accountRole", "theme", "viewport", "controlAction"]) {
    if (JSON.stringify(item?.requested?.[field]) !== JSON.stringify(item?.observed?.[field])) reasons.push(`${field}-requested-observed-mismatch`);
  }
  if (item?.interaction?.executed !== true || item?.interaction?.trusted !== true) reasons.push("trusted-interaction-not-executed");
  const oracle = item?.completionOracle || {};
  if (!policy.caseEquivalence.allowedCompletionOracles.includes(oracle.type)) reasons.push("completion-oracle-not-qualified");
  if (!oracle.evidenceRef) reasons.push("completion-oracle-evidence-missing");
  if (!oracle.correlationId) reasons.push("completion-oracle-correlation-missing");
  if (oracle.type === "dom-transition" && oracle.beforeDigest === oracle.afterDigest) reasons.push("dom-transition-did-not-change");
  if (oracle.type === "network-response-and-dom" && (!oracle.correlationId || !(oracle.statusCode >= 200 && oracle.statusCode < 400))) reasons.push("network-completion-correlation-missing");
  const completionArtifactName = oracle.type === "server-log-correlation" ? "serverLog" : "trace";
  const completionContentType = oracle.type === "server-log-correlation" ? "text/plain" : "application/json";
  const completionRef = validateEvidenceRef(policy, summary, rootDir, oracle.evidenceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: oracle.correlationId,
    expectedContentType: completionContentType,
    prefix: "completion-evidence-ref",
  }, reasons);
  if (completionRef && !sameArtifactReference(oracle.evidenceRef, item?.artifacts?.[completionArtifactName])) reasons.push("completion-evidence-ref-artifact-mismatch");
  if (completionRef) validateCompletionEvidence(policy, item, canonicalCase, oracle, completionRef.path, reasons);
  const assertions = Array.isArray(item?.visibleAssertions) ? item.visibleAssertions : [];
  if (assertions.length === 0) reasons.push("visible-assertions-missing");
  for (const assertion of assertions) {
    if (assertion.pass !== true || assertion.visible !== true || assertion.sourceBoundary !== policy.caseEquivalence.requiredAssertionBoundary) reasons.push("visible-assertion-not-qualified");
  }
  if (item?.visualEvidence?.schema !== policy.caseEquivalence.visualBaselineSchema || item?.visualEvidence?.status !== "PASS" || item?.visualEvidence?.reviewRequired !== false || !item?.visualEvidence?.evidenceRef || !item?.visualEvidence?.correlationId) reasons.push("visual-evidence-not-qualified");
  const visualRef = validateEvidenceRef(policy, summary, rootDir, item?.visualEvidence?.evidenceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: item?.visualEvidence?.correlationId,
    expectedContentType: "application/json",
    prefix: "visual-evidence-ref",
  }, reasons);
  if (visualRef && !sameArtifactReference(item?.visualEvidence?.evidenceRef, item?.artifacts?.visualDiff)) reasons.push("visual-evidence-ref-artifact-mismatch");
  if (visualRef) {
    const payload = readJsonFile(visualRef.path);
    if (payload?.schema !== policy.caseEquivalence.visualBaselineSchema || payload?.status !== "PASS" ||
        payload?.reviewRequired !== false || payload?.caseId !== item?.testId ||
        payload?.correlationId !== item?.visualEvidence?.correlationId ||
        payload?.screenshotSha256 !== item?.artifacts?.screenshot?.sha256) {
      reasons.push("visual-evidence-payload-invalid");
    }
  }
  if (item?.security?.redactionStatus !== "PASS" || item?.security?.forbiddenMaterialFindings !== 0) reasons.push("case-redaction-not-pass");
  const redactionRef = validateEvidenceRef(policy, summary, rootDir, item?.security?.evidenceRef, {
    expectedCaseId: item?.testId,
    expectedCorrelationId: item?.security?.correlationId,
    expectedContentType: "application/json",
    prefix: "case-redaction-evidence-ref",
  }, reasons);
  if (redactionRef && !sameArtifactReference(item?.security?.evidenceRef, item?.artifacts?.redactionScan)) reasons.push("case-redaction-evidence-ref-artifact-mismatch");
  if (redactionRef) validateCaseRedaction(policy, item, summary, rootDir, redactionRef.path, reasons);
  if (item?.manualIntervention !== false) reasons.push("case-manual-intervention-present");
  if (verifyArtifacts) validateArtifacts(policy, item, summary, rootDir, reasons);
  return [...new Set(reasons)];
}

function validateArtifacts(policy, item, summary, rootDir, reasons) {
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
    if (artifact.caseId !== item.testId || artifact.correlationId !== item.completionOracle?.correlationId) reasons.push(`artifact-${name}-case-correlation-mismatch`);
    if (name === "screenshot" && !decodePng(resolved, artifact.contentType, policy.attestation.maxArtifactBytes)) reasons.push("artifact-screenshot-not-decodable-png");
    if (name === "trace" && !isJson(resolved, artifact.contentType)) reasons.push("artifact-trace-not-json");
    if (name === "browserConsole") {
      const payload = isJson(resolved, artifact.contentType) ? readJsonFile(resolved) : null;
      if (!payload) reasons.push("artifact-browser-console-not-json");
      else if (payload.schema !== policy.attestation.browserConsoleSchema || payload.caseId !== item.testId ||
          payload.correlationId !== item.completionOracle?.correlationId || !Array.isArray(payload.messages)) {
        reasons.push("artifact-browser-console-schema-invalid");
      }
    }
    if (name === "serverLog") {
      if (artifact.contentType !== "text/plain") reasons.push("artifact-server-log-not-text");
      else {
        const text = fs.readFileSync(resolved, "utf8");
        if (!text.includes(`caseId=${item.testId}`) || !text.includes(`correlationId=${item.completionOracle?.correlationId}`)) {
          reasons.push("artifact-server-log-case-correlation-missing");
        }
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

function validateCompletionEvidence(policy, item, canonicalCase, oracle, evidencePath, reasons) {
  if (oracle.type === "server-log-correlation") {
    const text = fs.readFileSync(evidencePath, "utf8");
    if (!text.includes(`caseId=${item?.testId}`) || !text.includes(`correlationId=${oracle.correlationId}`)) {
      reasons.push("completion-server-log-correlation-missing");
    }
    return;
  }
  const payload = readJsonFile(evidencePath);
  if (payload?.schema !== policy.attestation.interactionTraceSchema || payload?.caseId !== item?.testId ||
      payload?.correlationId !== oracle.correlationId || payload?.route !== canonicalCase?.route ||
      JSON.stringify(payload?.controlAction) !== JSON.stringify(canonicalCase?.controlAction) ||
      !Array.isArray(payload?.events)) {
    reasons.push("completion-trace-schema-invalid");
    return;
  }
  const trusted = payload.events.some(event => event?.type === "trusted-interaction" && event?.trusted === true);
  const completion = payload.events.some(event => event?.type === "completion" && event?.status === "PASS" && event?.oracleType === oracle.type);
  if (!trusted || !completion) reasons.push("completion-trace-events-incomplete");
  if (oracle.type === "network-response-and-dom") {
    const network = payload.events.some(event => event?.type === "network-response" &&
      event?.statusCode === oracle.statusCode && event?.correlationId === oracle.correlationId);
    if (!network) reasons.push("completion-trace-network-correlation-missing");
  }
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
    policyVersion: policy?.policyVersion || 0,
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
  const realBase = fs.existsSync(baseDir) ? fs.realpathSync(baseDir) : path.resolve(baseDir);
  const realResolved = fs.realpathSync(resolved);
  return isInside(realBase, realResolved) ? realResolved : null;
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
