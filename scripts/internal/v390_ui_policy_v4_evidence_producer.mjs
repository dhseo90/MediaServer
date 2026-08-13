// 파일 용도: exact native UI 실행 결과를 Policy v4 actual summary와 attested artifact로 변환한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { assertRequestedObservedEnvelope } from "./v390_ui_requested_observed_schema.mjs";
import { serializeFailureLifecycleEvidence } from "./v390_ui_failure_lifecycle_evidence.mjs";
import { qualifyBrowserConsoleMessages } from "./v390_ui_console_evidence.mjs";
import {
  canonicalNativeExactManifestSha256,
  qualifyCanonicalParentPolicyRows,
} from "./v390_ui_native_exact_cases_lib.mjs";

const evidenceSchema = "media-server.ui-automation-evidence.v4";
const evidenceRefSchema = "media-server.ui-evidence-ref.v1";
const traceSchema = "media-server.v390-ui-native-interaction-trace.v2";
const consoleSchema = "media-server.ui-browser-console.v1";
const visualSchema = "media-server.ui-raw-visual-capture.v1";
const browserMeasurementSchema = "media-server.ui-browser-visual-measurement.v2";
const redactionSchema = "media-server.ui-evidence-redaction-scan.v1";
const crossCuttingSchema = "media-server.ui-cross-cutting-evidence.v1";
const requiredCrossCutting = [
  "visual-quality",
  "responsive-320-390-760-1180",
  "light-dark-theme",
  "role-scope-guards",
  "client-viewer-redaction",
  "video-overlay-crop",
  "accessibility-focus-contrast",
];

export function evaluateCanonicalParentPolicyV4({
  canonicalParentValidation,
  canonicalCaseIds,
  policyRows,
} = {}) {
  return qualifyCanonicalParentPolicyRows({
    validation: canonicalParentValidation,
    canonicalCaseIds,
    policyRows,
  });
}

export function producePolicyV4EvidenceFromCanonicalParent({
  canonicalParentSummary,
  canonicalParentValidation,
  rootDir,
  outputDir,
  manifest,
  canonical,
  selectedAdapter,
  buildPath,
  runnerPath,
  serverLogPath,
  visualMatrixProbes,
  summaryFilePath,
  canonicalParentSummaryPath,
  sourceBinding,
} = {}) {
  assert(canonicalParentSummary?.schema === "media-server.v390-ui-canonical-parent.v1",
    "canonical parent schema is required for Policy production");
  assert(canonicalParentValidation?.eligible === true &&
    canonicalParentValidation?.censusComplete === true,
  "canonical parent must be eligible with a complete census before Policy production");
  const results = canonicalParentValidation.childSummaries.map((child, index) => {
    const ref = child?.policyInputRef;
    assert(ref?.schema === "media-server.v390-ui-case-policy-input-ref.v1",
      `canonical child Policy input ref missing at ${index}`);
    const policyInput = readJson(ref.path);
    assert(policyInput?.schema === "media-server.v390-ui-case-policy-input.v1" &&
      policyInput.caseId === canonicalParentSummary.selection.selectedIds[index] &&
      policyInput.runId === canonicalParentSummary.runBinding.runId,
    `canonical child Policy input binding mismatch at ${index}`);
    return policyInput.result;
  });
  return producePolicyV4Evidence({
    rootDir,
    outputDir,
    manifest,
    canonical,
    results,
    selectedAdapter,
    startedAt: canonicalParentSummary.timing.startedAt,
    finishedAt: canonicalParentSummary.timing.finishedAt,
    buildPath,
    runnerPath,
    serverLogPath,
    visualMatrixProbes,
    contractFixture: false,
    summaryFilePath,
    sourceBinding,
    canonicalParentBinding: {
      schema: canonicalParentSummary.schema,
      runId: canonicalParentSummary.runBinding.runId,
      sourceBinding: structuredClone(canonicalParentSummary.sourceBinding),
      counts: structuredClone(canonicalParentSummary.counts),
      parentSummaryPath: relativeInside(rootDir, path.resolve(canonicalParentSummaryPath)),
      parentSummarySha256: sha256File(path.resolve(canonicalParentSummaryPath)),
    },
  });
}

export function producePolicyV4Evidence({
  rootDir,
  outputDir,
  manifest,
  canonical,
  results,
  selectedAdapter,
  startedAt,
  finishedAt,
  buildPath,
  runnerPath,
  serverLogPath,
  visualMatrixProbes = [],
  contractFixture = false,
  summaryFilePath = "",
  canonicalParentBinding = null,
  sourceBinding = null,
}) {
  const artifactRoot = assertPolicyV4ArtifactRoot({ rootDir, outputDir });
  const resolvedRoot = artifactRoot.rootDir;
  const resolvedOutput = artifactRoot.outputDir;
  const explicitSourceBinding = normalizeSourceBinding(sourceBinding, resolvedRoot, resolvedOutput);
  assert(Array.isArray(results), "actual result list is required");
  assert(Array.isArray(manifest?.cases), "exact native manifest cases are required");
  assert(Array.isArray(canonical?.cases), "canonical case manifest cases are required");
  const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
  const manifestById = new Map(manifest.cases.map(item => [item.caseId, item]));
  const policy = readJson(path.join(resolvedRoot, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const visualMatrixPlan = readJson(path.join(resolvedRoot, "test/fixtures/v390_ui_visual_matrix_plan.json"));
  const visualCanonical = readJson(path.join(resolvedRoot, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const visualNative = readJson(path.join(resolvedRoot, "test/fixtures/v390_ui_native_exact_cases.json"));
  const policyRoot = path.join(resolvedOutput, "policy-v4");
  fs.mkdirSync(policyRoot, { recursive: true });

  const cases = results.map(result => produceCase({
    rootDir: resolvedRoot,
    outputDir: resolvedOutput,
    policyRoot,
    policy,
    result,
    manifestCase: manifestById.get(result.caseId),
    canonicalCase: canonicalById.get(result.caseId),
    serverLogPath: path.resolve(serverLogPath),
  }));
  const caseIds = cases.map(item => item.testId);
  const caseSetSha256 = sha256Text(JSON.stringify(caseIds));
  const matrix = produceVisualMatrix({
    outputDir: resolvedOutput,
    policyRoot,
    probes: visualMatrixProbes,
    plan: visualMatrixPlan,
    canonical: visualCanonical,
    native: visualNative,
  });
  const crossCuttingObligations = requiredCrossCutting.map(id => {
    const correlationId = `v390-cross-${id}`;
    const filePath = path.join(policyRoot, "cross-cutting", `${id}.json`);
    const sourceCaseEvidence = id === "video-overlay-crop" && !contractFixture
      ? visualMatrixPlan.liveVideoProbe.requiredObligationIds.map(caseId => {
          const item = cases.find(candidate => candidate.testId === caseId);
          assert(item?.rawEvidence?.traceRef, `${caseId} live source trace evidence missing`);
          return {
            caseId,
            actionId: manifestById.get(caseId)?.workflow?.expectedResults?.[0]?.completion?.actionId || "",
            traceRef: structuredClone(item.rawEvidence.traceRef),
          };
        })
      : [];
    writeJson(filePath, {
      schema: crossCuttingSchema,
      obligationId: id,
      qualificationStatus: "unqualified-raw-capture",
      correlationId,
      caseSetSha256,
      measuredEvidenceRefs: matrix.evidenceRefs,
      rawVariantCount: matrix.rawVariantCount,
      sourceCaseEvidence,
    });
    return {
      id,
      qualificationStatus: "unqualified-raw-capture",
      correlationId,
      evidenceRef: evidenceRef(artifactMeta(filePath, "application/json", resolvedOutput, "__suite__", correlationId)),
    };
  });
  const suiteCorrelationId = `v390-suite-${Date.parse(finishedAt) || Date.now()}`;
  const suiteRedactionPath = path.join(policyRoot, "suite-redaction.json");
  const suiteFindings = cases.flatMap(item => (item.security?.findings || []).map(finding => ({
    caseId: item.testId,
    ...finding,
  })));
  writeJson(suiteRedactionPath, {
    schema: redactionSchema,
    scope: "suite",
    status: suiteFindings.length === 0 ? "PASS" : "FAIL",
    correlationId: suiteCorrelationId,
    caseIds,
    caseAttestations: cases.map(item => ({ caseId: item.testId, sha256: item.security?.evidenceRef?.sha256 || "" })),
    findings: suiteFindings,
  });
  const suiteRedactionRef = evidenceRef(artifactMeta(
    suiteRedactionPath, "application/json", resolvedOutput, "__suite__", suiteCorrelationId));
  const startMs = Date.parse(startedAt);
  const finishMs = Date.parse(finishedAt);
  const captured = cases.filter(item => item.rawOutcome === "completed").length;
  const fail = cases.filter(item => item.rawOutcome === "runner-error").length;
  const notRun = cases.filter(item => item.status === "not-run").length;
  const unsupported = cases.filter(item => item.status === "unsupported").length;
  const attempted = captured + fail;
  const securityBearingCases = cases.filter(item => item.security !== undefined);
  assert(securityBearingCases.every(item => Number.isSafeInteger(item.security.unapprovedConsoleMessages)),
    "Policy v4 case console counts must be exact integers");
  const unapprovedConsoleMessages = securityBearingCases.reduce(
    (sum, item) => sum + item.security.unapprovedConsoleMessages, 0);
  assert(attempted + notRun + unsupported === manifest.cases.length,
    `Policy v4 coverage total mismatch: ${attempted}+${notRun}+${unsupported} != ${manifest.cases.length}`);
  const resolvedBuild = path.resolve(buildPath);
  const resolvedRunner = path.resolve(runnerPath);
  assert(fs.existsSync(resolvedBuild) && fs.statSync(resolvedBuild).isFile(), "Policy v4 build fingerprint file missing");
  assert(fs.existsSync(resolvedRunner) && fs.statSync(resolvedRunner).isFile(), "Policy v4 runner fingerprint file missing");
  const summary = {
    schema: evidenceSchema,
    contractFixture,
    fixture: false,
    scopeKind: "full-suite",
    executionKind: "actual-native-visible-dom",
    actualBrowserExecution: true,
    result: fail === 0 && notRun === 0 && unsupported === 0 ? "CAPTURED" : "INCOMPLETE",
    startedAt,
    finishedAt,
    durationMs: Number.isFinite(startMs) && Number.isFinite(finishMs) ? finishMs - startMs : -1,
    manualIntervention: false,
    failedInteractionCount: fail,
    replayStatus: "not-qualified-by-producer",
    selectedAdapter,
    sourceBinding: {
      version: fs.readFileSync(path.join(resolvedRoot, "VERSION"), "utf8").trim(),
      gitCommit: explicitSourceBinding?.gitCommit || git(resolvedRoot, ["rev-parse", "HEAD"]),
      worktreePatchSha256: explicitSourceBinding?.worktreePatchSha256 ||
        sha256Text(git(resolvedRoot, ["diff", "--binary", "HEAD"])),
      ...(explicitSourceBinding?.allowedArtifactRoot
        ? { allowedArtifactRoot: explicitSourceBinding.allowedArtifactRoot }
        : {}),
      buildPath: relativeInside(resolvedRoot, resolvedBuild),
      buildSha256: sha256File(resolvedBuild),
      policyPath: "test/fixtures/ui_fulltest_evidence_policy_v4.json",
      policySha256: sha256File(path.join(resolvedRoot, "test/fixtures/ui_fulltest_evidence_policy_v4.json")),
      caseManifestPath: "test/fixtures/ui_fulltest_case_manifest_policy_v4.json",
      caseManifestSha256: sha256File(path.join(resolvedRoot, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json")),
      nativeExactManifestPath: "test/fixtures/v390_ui_native_exact_cases.json",
      nativeExactManifestSha256: sha256File(path.join(resolvedRoot, "test/fixtures/v390_ui_native_exact_cases.json")),
      nativeExactManifestStableSha256: canonicalNativeExactManifestSha256(
        readJson(path.join(resolvedRoot, "test/fixtures/v390_ui_native_exact_cases.json")),
      ),
      runnerPath: relativeInside(resolvedRoot, resolvedRunner),
      runnerSha256: sha256File(resolvedRunner),
      artifactRoot: artifactRoot.artifactRoot,
      sourceFingerprintOnly: true,
    },
    canonicalParentBinding: canonicalParentBinding === null
      ? null : structuredClone(canonicalParentBinding),
    security: {
      redactionStatus: suiteFindings.length === 0 ? "PASS" : "FAIL",
      unapprovedConsoleMessages,
      forbiddenMaterialFindings: suiteFindings.length,
      correlationId: suiteCorrelationId,
      evidenceRef: suiteRedactionRef,
    },
    cleanup: {
      serversStopped: false,
      portsClean: false,
      temporaryArtifactsRemoved: true,
      boundary: "standalone exact runner does not own the externally supplied server; canonical acceptance must attest server/port cleanup",
    },
    coverage: {
      targetCount: manifest.cases.length,
      obligationIds: caseIds,
      attempted,
      pass: captured,
      captured,
      fail,
      notRun,
      unsupported,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    crossCuttingObligations,
    cases,
    uiFulltestPass: false,
    evidenceBoundary: "raw artifacts only; the independent Policy v4 qualifier owns action, completion, visual, and suite PASS decisions",
  };
  const summaryPath = summaryFilePath
    ? path.resolve(summaryFilePath)
    : path.join(resolvedOutput, "summary.json");
  assert(isInside(resolvedOutput, summaryPath), "Policy v4 summary path escapes artifact root");
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

export function assertPolicyV4ArtifactRoot({ rootDir, outputDir }) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOutput = path.resolve(outputDir);
  assert(isInside(resolvedRoot, resolvedOutput), "Policy v4 artifact root must be inside the repository root");
  return {
    rootDir: resolvedRoot,
    outputDir: resolvedOutput,
    artifactRoot: relativeInside(resolvedRoot, resolvedOutput),
  };
}

function produceCase({ outputDir, policyRoot, policy, result, manifestCase, canonicalCase, serverLogPath }) {
  assert(manifestCase && canonicalCase, `${result.caseId} canonical/manifest binding missing`);
  if (result.status !== "PASS") {
    const failureLifecycleEvidence =
      serializeFailureLifecycleEvidence(result);
    return {
      testId: result.caseId,
      featureId: result.featureId || canonicalCase.featureId,
      rawOutcome: result.status === "not-run" ? "not-run-after-first-failure" : "runner-error",
      status: result.status,
      reason: result.reason || "case did not pass actual execution",
      failureLifecycleEvidence,
      markerStageEvidence:
        failureLifecycleEvidence.markerStageEvidence,
      markerEvidence:
        failureLifecycleEvidence.markerEvidence,
      markerEvidenceLifecycle:
        failureLifecycleEvidence.markerEvidenceLifecycle,
      cleanupAttestation:
        failureLifecycleEvidence.cleanupAttestation,
      diagnosticArtifacts: result.diagnosticArtifacts || undefined,
    };
  }
  const requestedObserved = assertRequestedObservedEnvelope({
    requested: result.requested,
    observed: result.observed,
    canonicalCase,
    nativeCase: manifestCase,
  });
  const expectedCompletion = manifestCase.workflow?.expectedResults?.[0]?.completion;
  assert(expectedCompletion?.phase === "primary-action", `${result.caseId} primary completion contract missing`);
  const caseRoot = path.join(policyRoot, "cases", result.caseId);
  fs.mkdirSync(caseRoot, { recursive: true });
  const screenshotPath = requireContainedFile(outputDir, result.screenshotPath, `${result.caseId} screenshot`);
  const sourceTracePath = requireContainedFile(outputDir, result.tracePath, `${result.caseId} trace`);
  const sourceConsolePath = requireContainedFile(outputDir, result.browserConsolePath, `${result.caseId} console`);
  const traceSource = readJson(sourceTracePath);
  const consoleSource = readJson(sourceConsolePath);
  assert(traceSource?.schema === traceSchema && traceSource?.caseId === result.caseId,
    `${result.caseId} raw native trace schema/case mismatch`);
  assert(JSON.stringify(traceSource.requested) === JSON.stringify(requestedObserved.requested) &&
    JSON.stringify(traceSource.observed) === JSON.stringify(requestedObserved.observed),
  `${result.caseId} raw native requested/observed mismatch`);
  const rawPrimaryObservations = (traceSource.rawPrimaryObservations || []).filter(item =>
    item?.action?.actionId === expectedCompletion.actionId);
  assert(rawPrimaryObservations.length === 1,
    `${result.caseId} raw primary observation count mismatch: ${rawPrimaryObservations.length}`);
  const correlationId = expectedCompletion.correlationId;
  const tracePath = path.join(caseRoot, "trace.json");
  const consolePath = path.join(caseRoot, "browser-console.json");
  const serverSlicePath = path.join(caseRoot, "server.log");
  const visualPath = path.join(caseRoot, "visual.json");
  const visualMeasurementPath = path.join(caseRoot, "visual-measurement.json");
  const redactionPath = path.join(caseRoot, "redaction.json");
  fs.copyFileSync(sourceTracePath, tracePath);
  const consoleQualification = qualifyBrowserConsoleMessages({
    messages: Array.isArray(consoleSource.entries) ? consoleSource.entries : [],
    trace: traceSource,
    nativeCase: manifestCase,
  });
  const consoleMessages = consoleQualification.messages;
  writeJson(consolePath, {
    schema: consoleSchema,
    caseId: result.caseId,
    correlationId,
    messages: consoleMessages,
    census: consoleQualification.census,
  });
  const sourceLog = fs.readFileSync(serverLogPath, "utf8");
  const selectedLogLines = sourceLog.split(/\r?\n/).filter(line => line.includes(correlationId) || line.includes(result.caseId));
  fs.writeFileSync(serverSlicePath, selectedLogLines.length > 0 ? `${selectedLogLines.join("\n")}\n` : "", "utf8");
  const screenshot = artifactMeta(screenshotPath, "image/png", outputDir, result.caseId, correlationId);
  const trace = artifactMeta(tracePath, "application/json", outputDir, result.caseId, correlationId);
  const browserConsole = artifactMeta(consolePath, "application/json", outputDir, result.caseId, correlationId);
  const serverLog = artifactMeta(serverSlicePath, "text/plain", outputDir, result.caseId, correlationId);
  const visualTargetSelector = result.visualExpectedCase?.targetSelector || result.visibleAssertion?.selector || "body";
  const measurement = result.visualMeasurement;
  assert(measurement?.schema === browserMeasurementSchema,
    `${result.caseId} raw visual measurement schema mismatch`);
  writeJson(visualMeasurementPath, measurement);
  const visualMeasurement = artifactMeta(visualMeasurementPath, "application/json", outputDir, result.caseId, correlationId);
  writeJson(visualPath, {
    schema: visualSchema,
    caseId: result.caseId,
    correlationId,
    targetSelector: visualTargetSelector,
    screenshotSha256: screenshot.sha256,
    measurementSha256: visualMeasurement.sha256,
    qualificationStatus: "unqualified-raw-capture",
  });
  const visualDiff = artifactMeta(visualPath, "application/json", outputDir, result.caseId, correlationId);
  const scannedArtifacts = [screenshot, trace, browserConsole, serverLog, visualMeasurement, visualDiff]
    .map(item => ({ path: item.path, sha256: item.sha256 }));
  const findings = scanForbidden(policy, [screenshotPath, tracePath, consolePath, serverSlicePath, visualMeasurementPath, visualPath]);
  writeJson(redactionPath, {
    schema: redactionSchema,
    scope: "case",
    status: findings.length === 0 ? "PASS" : "FAIL",
    caseId: result.caseId,
    correlationId,
    scannedArtifacts,
    findings,
  });
  const redactionScan = artifactMeta(redactionPath, "application/json", outputDir, result.caseId, correlationId);
  const rawObservation = rawPrimaryObservations[0];
  return {
    testId: result.caseId,
    featureId: result.featureId || canonicalCase.featureId,
    rawOutcome: "completed",
    requested: requestedObserved.requested,
    observed: requestedObserved.observed,
    requestedObservedSchema: requestedObserved.schema,
    rawEvidence: {
      schema: "media-server.ui-policy-v4-raw-case-ref.v1",
      traceRef: evidenceRef(trace),
      correlationId,
      actionId: expectedCompletion.actionId,
      actionKind: expectedCompletion.actionKind,
      controlSelector: expectedCompletion.controlSelector,
    },
    visibleObservation: rawObservation.before ? structuredClone(rawObservation.before) : null,
    visualEvidence: {
      schema: visualSchema,
      qualificationStatus: "unqualified-raw-capture",
      correlationId,
      evidenceRef: evidenceRef(visualDiff),
      measurementRef: evidenceRef(visualMeasurement),
      screenshotRef: evidenceRef(screenshot),
    },
    security: {
      scanOutcome: findings.length === 0 ? "clean" : "findings-present",
      forbiddenMaterialFindings: findings.length,
      unapprovedConsoleMessages: consoleQualification.unapprovedConsoleMessages,
      consoleCensus: consoleQualification.census,
      findings,
      correlationId,
      evidenceRef: evidenceRef(redactionScan),
    },
    artifacts: { screenshot, trace, browserConsole, serverLog, visualMeasurement, visualDiff, redactionScan },
  };
}

function produceVisualMatrix({ outputDir, policyRoot, probes }) {
  if (!Array.isArray(probes) || probes.length === 0) {
    return {
      evidenceRefs: [],
      rawVariantCount: 0,
    };
  }
  const captured = probes.map(probe => {
    const screenshotPath = requireContainedFile(outputDir, probe.screenshotPath, `${probe.id} matrix screenshot`);
    const correlationId = probe.correlationId || `v390-visual-${probe.id}`;
    const probeRoot = path.join(policyRoot, "visual-matrix", probe.id);
    const measurementPath = path.join(probeRoot, "measurement.json");
    const screenshot = artifactMeta(screenshotPath, "image/png", outputDir, "__suite__", correlationId);
    assert(probe.measurement?.schema === browserMeasurementSchema,
      `${probe.id} raw visual matrix measurement schema mismatch`);
    writeJson(measurementPath, probe.measurement);
    const measurement = artifactMeta(measurementPath, "application/json", outputDir, "__suite__", correlationId);
    return {
      id: probe.id,
      screenshotRef: evidenceRef(screenshot),
      measurementRef: evidenceRef(measurement),
    };
  });
  return {
    evidenceRefs: captured.flatMap(item => [item.screenshotRef, item.measurementRef]),
    rawVariantCount: captured.length,
  };
}

function scanForbidden(policy, files) {
  const findings = [];
  for (const filePath of files) {
    const bytes = fs.readFileSync(filePath);
    if (bytes.length > policy.attestation.maxArtifactBytes) {
      findings.push({ id: "artifact-too-large", path: filePath });
      continue;
    }
    const text = bytes.toString("utf8");
    for (const pattern of policy.security.forbiddenMaterialPatterns || []) {
      if (new RegExp(pattern.source, pattern.flags || "").test(text)) findings.push({ id: pattern.id, path: filePath });
    }
  }
  return findings;
}

function artifactMeta(filePath, contentType, artifactRoot, caseId, correlationId) {
  const resolved = requireContainedFile(artifactRoot, filePath, `${caseId} artifact`);
  const stat = fs.statSync(resolved);
  return {
    path: relativeInside(artifactRoot, resolved),
    bytes: stat.size,
    sha256: sha256File(resolved),
    contentType,
    caseId,
    correlationId,
  };
}

function evidenceRef(metadata) {
  return { schema: evidenceRefSchema, ...structuredClone(metadata) };
}

function normalizeSourceBinding(binding, rootDir, outputDir) {
  if (binding === null || binding === undefined) return null;
  assert(binding && typeof binding === "object", "Policy source binding must be an object");
  assert(/^[a-f0-9]{40}$/.test(String(binding.gitCommit || "")),
    "Policy source binding commit is invalid");
  assert(/^[a-f0-9]{64}$/.test(String(binding.worktreePatchSha256 || "")),
    "Policy source binding patch digest is invalid");
  const allowedArtifactRoot = String(binding.allowedArtifactRoot || "");
  assert(allowedArtifactRoot && !path.isAbsolute(allowedArtifactRoot),
    "Policy source binding allowed artifact root must be repository-relative");
  const resolvedAllowedRoot = path.resolve(rootDir, allowedArtifactRoot);
  assert(isWithin(rootDir, resolvedAllowedRoot) && isWithin(resolvedAllowedRoot, outputDir),
    "Policy source binding allowed artifact root does not contain the evidence output");
  return {
    gitCommit: String(binding.gitCommit),
    worktreePatchSha256: String(binding.worktreePatchSha256),
    allowedArtifactRoot: path.relative(rootDir, resolvedAllowedRoot).split(path.sep).join("/"),
  };
}

function requireContainedFile(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  assert(isInside(resolvedRoot, resolved), `${label} escapes artifact root`);
  assert(fs.existsSync(resolved) && fs.statSync(resolved).isFile(), `${label} is missing`);
  const realRoot = fs.realpathSync(resolvedRoot);
  const realResolved = fs.realpathSync(resolved);
  assert(isInside(realRoot, realResolved), `${label} resolves outside artifact root`);
  return realResolved;
}

function relativeInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `path escapes root: ${candidate}`);
  return relative.replaceAll(path.sep, "/");
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
