// 파일 용도: UI fulltest Evidence Policy v4와 실행 evidence의 적격성을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
  expect(policy?.sourceBinding?.sha256Pattern === "^[a-f0-9]{64}$", "source binding sha256 pattern mismatch", errors);
  expect(policy?.sourceBinding?.requireCurrentSourceVerification === true, "current source verification must be required", errors);
  expect(policy?.security?.redactionStatus === "PASS", "security redactionStatus must be PASS", errors);
  expect(policy?.security?.unapprovedConsoleMessages === 0, "unapproved console messages must be zero", errors);
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
  validateAdapter(policy, summary, reasons);
  validateSecurity(policy, summary, reasons);
  validateCleanup(summary, reasons);

  const cases = Array.isArray(summary.cases) ? summary.cases : [];
  const eligibleCaseIds = [];
  const caseIds = new Set();
  for (const item of cases) {
    const caseReasons = validateCase(policy, item, summary, rootDir, { verifyArtifacts });
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
  for (const obligation of policy.suiteClosure.requiredCrossCuttingObligations) {
    const item = crossCutting.get(obligation);
    if (!item || item.status !== "PASS" || !item.evidenceRef) reasons.push(`cross-cutting-${obligation}-not-pass`);
  }

  const allCasesEligible = cases.length > 0 && eligibleCaseIds.length === cases.length;
  const suiteCandidate = summary.scopeKind === "full-suite";
  if (suiteCandidate && coverage.targetCount !== policy.suiteClosure.expectedExactUiTestIds) reasons.push("full-suite-exact-id-count-mismatch");
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
  if (!verifyCurrentSource) return;
  for (const [pathField, hashField] of [["policyPath", "policySha256"], ["caseManifestPath", "caseManifestSha256"], ["runnerPath", "runnerSha256"], ["buildPath", "buildSha256"]]) {
    const resolved = resolveContained(rootDir, binding[pathField]);
    if (!resolved || !fs.existsSync(resolved)) reasons.push(`source-binding-${pathField}-missing-file`);
    else if (sha256File(resolved) !== binding[hashField]) reasons.push(`source-binding-${hashField}-drift`);
  }
  if (currentSource) {
    if (binding.version !== currentSource.version) reasons.push("source-binding-version-drift");
    if (binding.gitCommit !== currentSource.gitCommit) reasons.push("source-binding-gitCommit-drift");
    if (binding.worktreePatchSha256 !== currentSource.worktreePatchSha256) reasons.push("source-binding-worktreePatchSha256-drift");
  }
}

function validateAdapter(policy, summary, reasons) {
  const adapter = summary.selectedAdapter || {};
  if (!policy.caseEquivalence.allowedAdapterEngines.includes(adapter.engine)) reasons.push("adapter-engine-not-qualified");
  if (adapter.fallbackUsed !== false) reasons.push("adapter-fallback-used");
  for (const capability of policy.caseEquivalence.requiredAdapterCapabilities) {
    if (!adapter.capabilities?.includes(capability)) reasons.push(`adapter-capability-${capability}-missing`);
  }
}

function validateSecurity(policy, summary, reasons) {
  if (summary.security?.redactionStatus !== policy.security.redactionStatus) reasons.push("redaction-not-pass");
  if (summary.security?.unapprovedConsoleMessages !== policy.security.unapprovedConsoleMessages) reasons.push("unapproved-console-message-present");
  if (summary.security?.forbiddenMaterialFindings !== 0) reasons.push("forbidden-material-found");
}

function validateCleanup(summary, reasons) {
  for (const field of ["serversStopped", "portsClean", "temporaryArtifactsRemoved"]) {
    if (summary.cleanup?.[field] !== true) reasons.push(`cleanup-${field}-not-true`);
  }
}

function validateCase(policy, item, summary, rootDir, { verifyArtifacts }) {
  const reasons = [];
  if (!item?.testId) reasons.push("test-id-missing");
  if (!["direct-pass", "automation-equivalent-pass"].includes(item?.evidenceStatus)) reasons.push("evidence-status-not-qualified");
  if (item?.status !== "PASS") reasons.push("case-status-not-pass");
  for (const field of ["route", "accountRole", "theme", "viewport", "controlAction"]) {
    if (JSON.stringify(item?.requested?.[field]) !== JSON.stringify(item?.observed?.[field])) reasons.push(`${field}-requested-observed-mismatch`);
  }
  if (item?.interaction?.executed !== true || item?.interaction?.trusted !== true) reasons.push("trusted-interaction-not-executed");
  const oracle = item?.completionOracle || {};
  if (!policy.caseEquivalence.allowedCompletionOracles.includes(oracle.type)) reasons.push("completion-oracle-not-qualified");
  if (!oracle.evidenceRef) reasons.push("completion-oracle-evidence-missing");
  if (oracle.type === "dom-transition" && oracle.beforeDigest === oracle.afterDigest) reasons.push("dom-transition-did-not-change");
  if (oracle.type === "network-response-and-dom" && (!oracle.correlationId || !(oracle.statusCode >= 200 && oracle.statusCode < 400))) reasons.push("network-completion-correlation-missing");
  const assertions = Array.isArray(item?.visibleAssertions) ? item.visibleAssertions : [];
  if (assertions.length === 0) reasons.push("visible-assertions-missing");
  for (const assertion of assertions) {
    if (assertion.pass !== true || assertion.visible !== true || assertion.sourceBoundary !== policy.caseEquivalence.requiredAssertionBoundary) reasons.push("visible-assertion-not-qualified");
  }
  if (item?.visualEvidence?.schema !== policy.caseEquivalence.visualBaselineSchema || item?.visualEvidence?.status !== "PASS" || item?.visualEvidence?.reviewRequired !== false || !item?.visualEvidence?.evidenceRef) reasons.push("visual-evidence-not-qualified");
  if (item?.security?.redactionStatus !== "PASS" || item?.security?.forbiddenMaterialFindings !== 0) reasons.push("case-redaction-not-pass");
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
    if (!sha256Pattern.test(artifact.sha256 || "")) reasons.push(`artifact-${name}-sha256-invalid`);
    if (name === "screenshot" && !isPng(resolved, artifact.contentType)) reasons.push("artifact-screenshot-not-real-png");
    if (name === "trace" && !isJson(resolved, artifact.contentType)) reasons.push("artifact-trace-not-json");
    if (name === "browserConsole" && !isJson(resolved, artifact.contentType)) reasons.push("artifact-browser-console-not-json");
    if (name === "serverLog" && artifact.contentType !== "text/plain") reasons.push("artifact-server-log-not-text");
  }
  const video = item.artifacts?.video;
  if (video) {
    const resolved = resolveContained(artifactRoot, video.path);
    if (!resolved || !isInside(artifactRoot, resolved) || !fs.existsSync(resolved)) reasons.push("artifact-video-path-invalid");
    else if (/fixture video placeholder/i.test(fs.readFileSync(resolved, "utf8"))) reasons.push("artifact-video-placeholder-rejected");
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

function isPng(filePath, contentType) {
  if (contentType !== "image/png") return false;
  const bytes = fs.readFileSync(filePath).subarray(0, 8);
  return bytes.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
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
