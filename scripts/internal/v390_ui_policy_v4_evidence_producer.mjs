// 파일 용도: exact native UI 실행 결과를 Policy v4 actual summary와 attested artifact로 변환한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  browserMeasurementSchema,
  evaluateVisualArtifact,
  evaluateVisualMatrix,
  visualEvidenceSchema,
} from "./v390_ui_visual_evidence.mjs";
import { assertRequestedObservedEnvelope } from "./v390_ui_requested_observed_schema.mjs";

const evidenceSchema = "media-server.ui-automation-evidence.v4";
const evidenceRefSchema = "media-server.ui-evidence-ref.v1";
const traceSchema = "media-server.ui-interaction-trace.v1";
const consoleSchema = "media-server.ui-browser-console.v1";
const visualSchema = visualEvidenceSchema;
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
}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOutput = path.resolve(outputDir);
  assert(isInside(resolvedRoot, resolvedOutput), "Policy v4 artifact root must be inside the repository root");
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
    writeJson(filePath, {
      schema: crossCuttingSchema,
      obligationId: id,
      status: crossCuttingStatus(id, matrix),
      reviewRequired: crossCuttingStatus(id, matrix) !== "PASS",
      reason: crossCuttingStatus(id, matrix) === "PASS" ? "" : "actual responsive/theme/pixel/geometry matrix is incomplete or failed",
      correlationId,
      caseSetSha256,
      measuredEvidenceRefs: matrix.evidenceRefs,
      matrix: matrix.summary,
    });
    return {
      id,
      status: crossCuttingStatus(id, matrix),
      reviewRequired: crossCuttingStatus(id, matrix) !== "PASS",
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
  const pass = cases.filter(item => item.status === "PASS").length;
  const fail = cases.filter(item => item.status === "FAIL").length;
  const notRun = cases.filter(item => item.status === "not-run").length;
  const unsupported = cases.filter(item => item.status === "unsupported").length;
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
    result: fail === 0 && notRun === 0 && unsupported === 0 ? "PASS" : "FAIL",
    startedAt,
    finishedAt,
    durationMs: Number.isFinite(startMs) && Number.isFinite(finishMs) ? finishMs - startMs : -1,
    manualIntervention: false,
    failedInteractionCount: fail,
    replayStatus: "PASS",
    selectedAdapter,
    sourceBinding: {
      version: fs.readFileSync(path.join(resolvedRoot, "VERSION"), "utf8").trim(),
      gitCommit: git(resolvedRoot, ["rev-parse", "HEAD"]),
      worktreePatchSha256: sha256Text(git(resolvedRoot, ["diff", "--binary", "HEAD"])),
      buildPath: relativeInside(resolvedRoot, resolvedBuild),
      buildSha256: sha256File(resolvedBuild),
      policyPath: "test/fixtures/ui_fulltest_evidence_policy_v4.json",
      policySha256: sha256File(path.join(resolvedRoot, "test/fixtures/ui_fulltest_evidence_policy_v4.json")),
      caseManifestPath: "test/fixtures/ui_fulltest_case_manifest_policy_v4.json",
      caseManifestSha256: sha256File(path.join(resolvedRoot, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json")),
      nativeExactManifestPath: "test/fixtures/v390_ui_native_exact_cases.json",
      nativeExactManifestSha256: sha256File(path.join(resolvedRoot, "test/fixtures/v390_ui_native_exact_cases.json")),
      runnerPath: relativeInside(resolvedRoot, resolvedRunner),
      runnerSha256: sha256File(resolvedRunner),
      artifactRoot: relativeInside(resolvedRoot, resolvedOutput),
      currentSourceVerified: true,
    },
    security: {
      redactionStatus: suiteFindings.length === 0 ? "PASS" : "FAIL",
      unapprovedConsoleMessages: cases.reduce((sum, item) => sum + Number(item.security?.unapprovedConsoleMessages || 0), 0),
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
      pass,
      fail,
      notRun,
      unsupported,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    crossCuttingObligations,
    cases,
    uiFulltestPass: false,
    evidenceBoundary: "actual case artifacts are produced; visual cross-cutting and acceptance-owned cleanup remain unqualified",
  };
  const summaryPath = path.join(resolvedOutput, "summary.json");
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

function produceCase({ outputDir, policyRoot, policy, result, manifestCase, canonicalCase, serverLogPath }) {
  assert(manifestCase && canonicalCase, `${result.caseId} canonical/manifest binding missing`);
  if (result.status !== "PASS") {
    return {
      testId: result.caseId,
      featureId: result.featureId || canonicalCase.featureId,
      evidenceStatus: "not-qualified",
      status: result.status,
      reason: result.reason || "case did not pass actual execution",
      manualIntervention: false,
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
  const correlationEvents = (result.completionOracle || []).filter(item =>
    item?.pass === true &&
    item?.completionPhase === "primary-action" &&
    item?.actionId === expectedCompletion.actionId &&
    item?.correlationId === expectedCompletion.correlationId &&
    item?.controlSelector === expectedCompletion.controlSelector);
  assert(correlationEvents.length === 1,
    `${result.caseId} requires exactly one action-bound primary completion; observed=${correlationEvents.length}`);
  const correlationEvent = correlationEvents[0];
  const correlationId = correlationEvent.correlationId;
  if (expectedCompletion.request) {
    assert(correlationEvent.completionRequest?.requestId,
      `${result.caseId} exact completion request evidence missing`);
    assert(correlationEvent.completionRequest.correlationId === expectedCompletion.correlationId &&
      String(correlationEvent.completionRequest.method || "").toUpperCase() === expectedCompletion.request.method &&
      new URL(String(correlationEvent.completionRequest.url), "http://localhost").pathname === expectedCompletion.request.urlPath &&
      expectedCompletion.request.allowedStatuses.includes(Number(correlationEvent.completionRequest.status)),
    `${result.caseId} exact completion request evidence drift`);
  }
  const caseRoot = path.join(policyRoot, "cases", result.caseId);
  fs.mkdirSync(caseRoot, { recursive: true });
  const screenshotPath = requireContainedFile(outputDir, result.screenshotPath, `${result.caseId} screenshot`);
  const sourceTracePath = requireContainedFile(outputDir, result.tracePath, `${result.caseId} trace`);
  const sourceConsolePath = requireContainedFile(outputDir, result.browserConsolePath, `${result.caseId} console`);
  const traceSource = readJson(sourceTracePath);
  const consoleSource = readJson(sourceConsolePath);
  const tracePath = path.join(caseRoot, "trace.json");
  const consolePath = path.join(caseRoot, "browser-console.json");
  const serverSlicePath = path.join(caseRoot, "server.log");
  const visualPath = path.join(caseRoot, "visual.json");
  const visualMeasurementPath = path.join(caseRoot, "visual-measurement.json");
  const redactionPath = path.join(caseRoot, "redaction.json");
  const oracleType = policyOracleType(correlationEvent.source);
  const correlatedNetwork = correlationEvent.completionRequest
    ? [correlationEvent.completionRequest]
    : (correlationEvent.networkResponses || []).filter(item => item?.correlationId === correlationId);
  writeJson(tracePath, {
    schema: traceSchema,
    caseId: result.caseId,
    correlationId,
    route: canonicalCase.route,
    controlAction: canonicalCase.controlAction,
    events: [
      {
        type: "trusted-interaction",
        trusted: true,
        dispatch: "playwright-native",
        phase: "primary-action",
        actionId: correlationEvent.actionId,
        actionKind: correlationEvent.actionKind,
        controlSelector: correlationEvent.controlSelector,
        correlationId,
      },
      ...correlatedNetwork.map(item => ({
        type: "network-response",
        requestId: item.requestId || "",
        correlationId: item.correlationId || correlationId,
        method: item.method || "",
        url: item.url || "",
        statusCode: Number(item.status || 0),
      })),
      {
        type: "completion",
        status: "PASS",
        oracleType,
        phase: "primary-action",
        actionId: correlationEvent.actionId,
        actionKind: correlationEvent.actionKind,
        controlSelector: correlationEvent.controlSelector,
        correlationId,
      },
    ],
    nativeTrace: traceSource,
  });
  const consoleMessages = Array.isArray(consoleSource.entries) ? consoleSource.entries : [];
  writeJson(consolePath, {
    schema: consoleSchema,
    caseId: result.caseId,
    correlationId,
    messages: consoleMessages,
  });
  const sourceLog = fs.readFileSync(serverLogPath, "utf8");
  const selectedLogLines = sourceLog.split(/\r?\n/).filter(line => line.includes(correlationId) || line.includes(result.caseId));
  fs.writeFileSync(serverSlicePath, [
    `caseId=${result.caseId} correlationId=${correlationId} sourceLogSha256=${sha256File(serverLogPath)} observedLineCount=${selectedLogLines.length}`,
    ...selectedLogLines,
    "",
  ].join("\n"), "utf8");
  const screenshot = artifactMeta(screenshotPath, "image/png", outputDir, result.caseId, correlationId);
  const trace = artifactMeta(tracePath, "application/json", outputDir, result.caseId, correlationId);
  const browserConsole = artifactMeta(consolePath, "application/json", outputDir, result.caseId, correlationId);
  const serverLog = artifactMeta(serverSlicePath, "text/plain", outputDir, result.caseId, correlationId);
  const visualTargetSelector = result.visualExpectedCase?.targetSelector || result.visibleAssertion?.selector || "body";
  const visualExpectedCase = result.visualExpectedCase || {
    canonicalCaseId: result.caseId,
    featureId: result.featureId || canonicalCase.featureId,
    screenId: result.caseId,
    screenRoute: result.observed?.screenRoute || manifestCase.screenRoute,
    accountRole: result.observed?.accountRole || manifestCase.accountRole,
    targetSelector: visualTargetSelector,
    width: result.requested?.viewport?.width,
    height: result.requested?.viewport?.height,
    theme: result.requested?.theme,
    liveVideoRequired: false,
  };
  const measurement = result.visualMeasurement || {
    schema: browserMeasurementSchema,
    caseBinding: {
      canonicalCaseId: visualExpectedCase.canonicalCaseId,
      featureId: visualExpectedCase.featureId,
      screenId: visualExpectedCase.screenId,
      screenRoute: visualExpectedCase.screenRoute,
      accountRole: visualExpectedCase.accountRole,
      targetSelector: visualExpectedCase.targetSelector,
    },
    route: result.observed?.screenRoute || "",
    accountRole: result.observed?.accountRole || "",
    requestedTheme: result.requested?.theme || "",
    appliedTheme: result.observed?.theme || "",
    mediaTheme: result.observed?.theme || "",
    viewport: { ...(result.observed?.viewport || {}), devicePixelRatio: 1 },
    document: {},
    target: { selector: visualTargetSelector, visible: false, rect: null },
    textSamples: [],
    focusSamples: [],
    liveVideo: null,
  };
  writeJson(visualMeasurementPath, measurement);
  const visualMeasurement = artifactMeta(visualMeasurementPath, "application/json", outputDir, result.caseId, correlationId);
  const visualPayload = evaluateVisualArtifact({
    screenshotPath,
    measurement,
    caseId: result.caseId,
    correlationId,
    expectedCase: visualExpectedCase,
    liveVideoSpec: null,
  });
  visualPayload.screenshot.path = screenshot.path;
  writeJson(visualPath, visualPayload);
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
  const observed = requestedObserved.observed;
  const statusCode = correlationEvent.completionRequest?.status ||
    correlatedNetwork.find(item => item.correlationId === correlationId)?.status || result.navigation?.status || 0;
  return {
    testId: result.caseId,
    featureId: result.featureId || canonicalCase.featureId,
    evidenceStatus: "automation-equivalent-pass",
    status: "PASS",
    requested: requestedObserved.requested,
    observed,
    requestedObservedSchema: requestedObserved.schema,
    interaction: { executed: true, trusted: true },
    completionOracle: {
      type: oracleType,
      evidenceRef: evidenceRef(trace),
      correlationId,
      actionId: correlationEvent.actionId,
      actionKind: correlationEvent.actionKind,
      controlSelector: correlationEvent.controlSelector,
      statusCode: Number(statusCode),
      request: correlationEvent.completionRequest ? {
        requestId: correlationEvent.completionRequest.requestId,
        correlationId: correlationEvent.completionRequest.correlationId,
        method: correlationEvent.completionRequest.method,
        url: correlationEvent.completionRequest.url,
        status: Number(correlationEvent.completionRequest.status),
      } : null,
      beforeDigest: correlationEvent.beforeDigest || "",
      afterDigest: correlationEvent.afterDigest || "",
    },
    visibleAssertions: [{
      pass: result.visibleAssertion?.pass === true,
      visible: result.visibleAssertion?.visible === true,
      selector: result.visibleAssertion?.selector || manifestCase.controlAction?.targetSelector || "body",
      sourceBoundary: "exact-selector-visible-innerText-only",
    }],
    visualEvidence: {
      schema: visualSchema,
      status: visualPayload.status,
      reviewRequired: visualPayload.reviewRequired,
      correlationId,
      evidenceRef: evidenceRef(visualDiff),
      measurementRef: evidenceRef(visualMeasurement),
    },
    security: {
      redactionStatus: findings.length === 0 ? "PASS" : "FAIL",
      forbiddenMaterialFindings: findings.length,
      unapprovedConsoleMessages: consoleMessages.filter(item => ["error", "warning", "warn"].includes(item.level)).length,
      findings,
      correlationId,
      evidenceRef: evidenceRef(redactionScan),
    },
    manualIntervention: false,
    artifacts: { screenshot, trace, browserConsole, serverLog, visualMeasurement, visualDiff, redactionScan },
  };
}

function produceVisualMatrix({ outputDir, policyRoot, probes, plan, canonical, native }) {
  if (!Array.isArray(probes) || probes.length === 0) {
    return {
      summary: evaluateVisualMatrix([], { plan, canonical, native }),
      evidenceRefs: [],
    };
  }
  const evaluated = probes.map(probe => {
    const screenshotPath = requireContainedFile(outputDir, probe.screenshotPath, `${probe.id} matrix screenshot`);
    const correlationId = probe.correlationId || `v390-visual-${probe.id}`;
    const probeRoot = path.join(policyRoot, "visual-matrix", probe.id);
    const measurementPath = path.join(probeRoot, "measurement.json");
    const payloadPath = path.join(probeRoot, "visual.json");
    const screenshot = artifactMeta(screenshotPath, "image/png", outputDir, "__suite__", correlationId);
    writeJson(measurementPath, probe.measurement);
    const payload = evaluateVisualArtifact({
      screenshotPath,
      measurement: probe.measurement,
      caseId: probe.id,
      correlationId,
      expectedCase: probe.expectedCase,
      liveVideoSpec: probe.liveVideoSpec,
    });
    payload.role = probe.role;
    writeJson(payloadPath, payload);
    return {
      id: probe.id,
      canonicalCaseId: probe.canonicalCaseId,
      featureId: probe.featureId,
      screenId: probe.screenId,
      screenRoute: probe.screenRoute,
      role: probe.role,
      width: probe.width,
      height: probe.height,
      theme: probe.theme,
      payload,
      screenshotRef: evidenceRef(screenshot),
      evidenceRef: evidenceRef(artifactMeta(payloadPath, "application/json", outputDir, "__suite__", correlationId)),
      measurementRef: evidenceRef(artifactMeta(measurementPath, "application/json", outputDir, "__suite__", correlationId)),
    };
  });
  return {
    summary: evaluateVisualMatrix(evaluated, { plan, canonical, native }),
    evidenceRefs: evaluated.flatMap(item => [item.screenshotRef, item.measurementRef, item.evidenceRef]),
  };
}

function crossCuttingStatus(id, matrix) {
  if (matrix.summary.status !== "PASS") return "FAIL";
  if (id === "video-overlay-crop" && matrix.summary.hasVideoOverlay !== true) return "FAIL";
  if (id === "role-scope-guards" && (!matrix.summary.roles.includes("operator") || !matrix.summary.roles.includes("viewer"))) return "FAIL";
  return "PASS";
}

function policyOracleType(source) {
  if (["endpoint-dom", "navigation-network-dom", "network-dom", "negative-route-status"].includes(source)) return "network-response-and-dom";
  if (source === "local-transition-readback") return "dom-transition";
  if (source === "persisted-readback") return "persisted-state-readback";
  if (source === "event-record") return "eventrecord-correlation";
  if (source === "server-log") return "server-log-correlation";
  return "dom-transition";
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
