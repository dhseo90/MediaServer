#!/usr/bin/env node
// 파일 용도: Policy v4 qualifier가 legacy/fixture/partial/무결성 결함을 대체 evidence로 승격하지 않는지 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateEvidence, sha256File, sha256Text, validatePolicy } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { evaluateVisualArtifact, evaluateVisualMatrix, expandVisualMatrixPlan } from "./v390_ui_visual_evidence.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
} from "./v390_ui_requested_observed_schema.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Policy v4 evidence contract verification

Usage:
  ./server.sh verify-ui-fulltest-evidence-policy-v4-contract

Checks policy schema, scoped case equivalence, full-suite closure, and negative legacy,
fixture, fallback, partial coverage, completion-oracle, variant, artifact, redaction,
visual/replay, and cleanup cases. Contract fixtures are never release execution evidence.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const policy = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"), "utf8"));
const canonicalManifestSourcePath = path.join(rootDir, policy.sourceBinding.canonicalCaseManifestPath);
const canonicalManifestSource = JSON.parse(fs.readFileSync(canonicalManifestSourcePath, "utf8"));
const nativeManifestSourcePath = path.join(rootDir, policy.sourceBinding.nativeExactManifestPath);
const nativeManifestSource = JSON.parse(fs.readFileSync(nativeManifestSourcePath, "utf8"));
const nativeById = new Map(nativeManifestSource.cases.map(item => [item.caseId, item]));
const visualMatrixPlanSourcePath = path.join(rootDir, "test/fixtures/v390_ui_visual_matrix_plan.json");
const visualMatrixPlan = JSON.parse(fs.readFileSync(visualMatrixPlanSourcePath, "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_ui_policy_v4_contract_"));
const checks = [];

try {
  const base = makeCandidate(tempRoot, policy, 1, "scoped-change");

  check("policy schema fixes four categories and three UI evidence modes", () => {
    assert(validatePolicy(policy).length === 0, validatePolicy(policy).join("; "));
  });

  check("qualified scoped case is case-equivalent but not full-suite PASS", () => {
    const result = evaluate(base, tempRoot);
    assert(result.evidenceEligibility === "eligible", result.reasons.join("; "));
    assert(result.qualifiedCaseCount === 1, "scoped qualified case count mismatch");
    assert(result.uiFulltestPass === false, "scoped evidence must not become full-suite PASS");
  });

  check("attested server-log completion oracle remains eligible", () => {
    const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    const item = candidate.cases[0];
    item.completionOracle.type = "server-log-correlation";
    item.completionOracle.evidenceRef = evidenceRef(item.artifacts.serverLog, policy);
    const result = evaluate(candidate, tempRoot);
    assert(result.evidenceEligibility === "eligible", result.reasons.join("; "));
    assert(result.qualifiedCaseCount === 1, "server-log scoped case did not qualify");
  });

  check("contract-only exact 424 closure satisfies suite algorithm", () => {
    const candidate = makeCandidate(tempRoot, policy, 424, "full-suite");
    const result = evaluate(candidate, tempRoot);
    assert(result.evidenceEligibility === "eligible", result.reasons.join("; "));
    assert(result.qualifiedCaseCount === 424, "full-suite qualified count mismatch");
    assert(result.uiFulltestPass === true, "exact 424 closure should satisfy contract algorithm");
  });

  check("arbitrary synthetic 424 IDs are rejected by canonical case binding", () => {
    const candidate = makeCandidate(tempRoot, policy, 424, "full-suite");
    candidate.cases.forEach((item, index) => {
      item.testId = `SYNTHETIC-${String(index + 1).padStart(3, "0")}`;
    });
    candidate.coverage.obligationIds = candidate.cases.map(item => item.testId);
    const result = evaluate(candidate, tempRoot);
    assert(result.uiFulltestPass === false, "arbitrary synthetic 424 IDs became suite PASS");
    assert(result.reasons.includes("canonical-case-id-set-mismatch"), "canonical ID mismatch reason missing");
  });

  check("canonical feature route role viewport theme and control action drift are rejected", () => {
    const mutations = [
      ["featureId", candidate => { candidate.cases[0].featureId = "SAFE-999"; }, "canonical-feature-id-mismatch"],
      ["route", candidate => { candidate.cases[0].requested.route = "/wrong"; }, "requested-canonical-route-mismatch"],
      ["accountRole", candidate => { candidate.cases[0].requested.accountRole = "viewer"; }, "requested-canonical-accountRole-mismatch"],
      ["viewport", candidate => { candidate.cases[0].requested.viewport = { width: 1180, height: 800 }; }, "requested-canonical-viewport-mismatch"],
      ["theme", candidate => { candidate.cases[0].requested.theme = "dark"; }, "requested-canonical-theme-mismatch"],
      ["controlAction", candidate => { candidate.cases[0].requested.controlAction = { selector: "#wrong", actionAnchor: "wrong" }; }, "requested-canonical-controlAction-mismatch"],
    ];
    for (const [label, mutate, expectedReason] of mutations) {
      const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
      mutate(candidate);
      const result = evaluate(candidate, tempRoot);
      assert(result.reasons.some(reason => reason.endsWith(`:${expectedReason}`)), `${label} canonical drift passed`);
    }
  });

  check("requested observed aliases missing fields and copied control claims are rejected", () => {
    const mutations = [
      [candidate => { candidate.cases[0].requested.role = candidate.cases[0].requested.accountRole; }, "requested-fields-mismatch"],
      [candidate => { delete candidate.cases[0].requested.controlAction; }, "requested-fields-mismatch"],
      [candidate => { candidate.cases[0].observed.route = candidate.cases[0].observed.screenRoute; }, "observed-fields-mismatch"],
      [candidate => { delete candidate.cases[0].observed; }, "observed-object-missing"],
      [candidate => { candidate.cases[0].observed.controlAction = clone(candidate.cases[0].requested.controlAction); }, "observed-controlAction-fields-mismatch"],
    ];
    for (const [mutate, expected] of mutations) {
      const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
      mutate(candidate);
      const result = evaluate(candidate, tempRoot);
      assert(result.reasons.some(reason => reason.endsWith(`:${expected}`)), `${expected} missing`);
    }
  });

  check("hash-valid canonical manifest content drift is rejected", () => {
    const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    const manifestPath = path.join(tempRoot, policy.sourceBinding.canonicalCaseManifestPath);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.cases[0].route = "/hash-valid-but-noncanonical";
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    candidate.sourceBinding.caseManifestSha256 = sha256File(manifestPath);
    const result = evaluate(candidate, tempRoot);
    assert(result.uiFulltestPass === false, "hash-valid noncanonical manifest became UI fulltest PASS");
    assert(result.reasons.includes("canonical-case-manifest-implementation-route-drift"), "manifest implementation drift reason missing");
  });

  check("source file hashes remain mandatory when git source comparison is disabled", () => {
    const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    candidate.sourceBinding.caseManifestSha256 = "0".repeat(64);
    const result = evaluateEvidence(policy, candidate, {
      rootDir: tempRoot,
      verifyArtifacts: true,
      verifyCurrentSource: false,
      contractMode: true,
      now: new Date(),
    });
    assert(result.reasons.includes("source-binding-caseManifestSha256-drift"), "manifest hash check was skipped");
  });

  check("self-declared evidence refs and redaction PASS are not attested evidence", () => {
    const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    candidate.cases[0].completionOracle.evidenceRef = "trace.json";
    candidate.cases[0].visualEvidence.evidenceRef = "visual-diff.json";
    delete candidate.cases[0].security.evidenceRef;
    delete candidate.security.evidenceRef;
    candidate.crossCuttingObligations[0].evidenceRef = "visual-quality.json";
    const result = evaluate(candidate, tempRoot);
    for (const reason of [
      "UI-001:completion-evidence-ref-not-attested",
      "UI-001:visual-evidence-ref-not-attested",
      "UI-001:case-redaction-evidence-ref-not-attested",
      "suite-redaction-evidence-ref-not-attested",
      "cross-cutting-visual-quality-evidence-ref-not-attested",
    ]) {
      assert(result.reasons.includes(reason), `self-declared evidence passed: ${reason}`);
    }
  });

  check("decode schema correlation payload and independent redaction negatives are rejected", () => {
    let candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    let item = candidate.cases[0];
    let artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    let filePath = path.join(artifactRoot, item.artifacts.screenshot.path);
    fs.writeFileSync(filePath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    item.artifacts.screenshot = artifactMeta(filePath, "image/png", artifactRoot, item.testId, item.completionOracle.correlationId);
    let result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-screenshot-not-decodable-png")), "PNG signature-only artifact passed");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    item = candidate.cases[0];
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    filePath = path.join(artifactRoot, item.artifacts.trace.path);
    writeJson(filePath, { schema: "forged.trace", caseId: item.testId, correlationId: item.completionOracle.correlationId });
    item.artifacts.trace = artifactMeta(filePath, "application/json", artifactRoot, item.testId, item.completionOracle.correlationId);
    item.completionOracle.evidenceRef = evidenceRef(item.artifacts.trace, policy);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":completion-trace-schema-invalid")), "forged trace schema passed");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    item = candidate.cases[0];
    item.completionOracle.evidenceRef.caseId = "SAFE-999";
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":completion-evidence-ref-case-correlation-mismatch")), "completion case correlation drift passed");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    item = candidate.cases[0];
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    filePath = path.join(artifactRoot, item.artifacts.visualDiff.path);
    const visualPayload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    visualPayload.screenshotSha256 = "0".repeat(64);
    writeJson(filePath, visualPayload);
    item.artifacts.visualDiff = artifactMeta(filePath, "application/json", artifactRoot, item.testId, item.completionOracle.correlationId);
    item.visualEvidence.evidenceRef = evidenceRef(item.artifacts.visualDiff, policy);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":visual-evidence-payload-invalid")), "hash-valid forged visual payload passed");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    const obligation = candidate.crossCuttingObligations[0];
    filePath = path.join(artifactRoot, obligation.evidenceRef.path);
    const crossPayload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    crossPayload.obligationId = "forged-obligation";
    writeJson(filePath, crossPayload);
    obligation.evidenceRef = evidenceRef(artifactMeta(filePath, "application/json", artifactRoot, "__suite__", obligation.correlationId), policy);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.includes("cross-cutting-visual-quality-payload-invalid"), "hash-valid forged cross-cutting payload passed");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    item = candidate.cases[0];
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    filePath = path.join(artifactRoot, item.artifacts.serverLog.path);
    fs.writeFileSync(filePath, `caseId=${item.testId} correlationId=${item.completionOracle.correlationId} Authorization: Bearer supersecrettoken\n`, "utf8");
    item.artifacts.serverLog = artifactMeta(filePath, "text/plain", artifactRoot, item.testId, item.completionOracle.correlationId);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-serverLog-forbidden-material-authorization-header")), "actual secret material passed redaction");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    item = candidate.cases[0];
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    filePath = path.join(artifactRoot, item.artifacts.redactionScan.path);
    const redactionPayload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    redactionPayload.scannedArtifacts = [];
    writeJson(filePath, redactionPayload);
    item.artifacts.redactionScan = artifactMeta(filePath, "application/json", artifactRoot, item.testId, item.completionOracle.correlationId);
    item.security.evidenceRef = evidenceRef(item.artifacts.redactionScan, policy);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":case-redaction-evidence-payload-invalid")), "forged redaction scan output passed");
  });

  check("self-declared visual and responsive matrix PASS are rejected after metric recalculation", () => {
    let candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    let item = candidate.cases[0];
    let artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    let measurementPath = path.join(artifactRoot, item.artifacts.visualMeasurement.path);
    const measurement = JSON.parse(fs.readFileSync(measurementPath, "utf8"));
    measurement.textSamples[0].foreground = "rgb(120, 120, 120)";
    measurement.textSamples[0].background = "rgb(130, 130, 130)";
    writeJson(measurementPath, measurement);
    item.artifacts.visualMeasurement = artifactMeta(measurementPath, "application/json", artifactRoot, item.testId, item.completionOracle.correlationId);
    item.visualEvidence.measurementRef = evidenceRef(item.artifacts.visualMeasurement, policy);
    let result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":visual-evidence-recalculation-status-mismatch")),
      "self-declared case visual PASS survived low-contrast recomputation");

    candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
    artifactRoot = path.join(tempRoot, candidate.sourceBinding.artifactRoot);
    const obligation = candidate.crossCuttingObligations[0];
    const crossPath = path.join(artifactRoot, obligation.evidenceRef.path);
    const crossPayload = JSON.parse(fs.readFileSync(crossPath, "utf8"));
    crossPayload.measuredEvidenceRefs = [];
    writeJson(crossPath, crossPayload);
    obligation.evidenceRef = evidenceRef(artifactMeta(crossPath, "application/json", artifactRoot, "__suite__", obligation.correlationId), policy);
    result = evaluate(candidate, tempRoot);
    assert(result.reasons.includes("cross-cutting-visual-quality-measurement-ref-count-invalid"),
      "self-declared cross-cutting PASS survived missing measurement refs");
  });

  check("legacy and actual-mode contract fixture are ineligible", () => {
    const legacy = evaluateEvidence(policy, { schema: "media-server.v390-ui-automation.v1" }, { rootDir: tempRoot });
    assert(legacy.evidenceEligibility === "ineligible", "legacy v1 must be ineligible");
    const actualMode = evaluateEvidence(policy, base, { rootDir: tempRoot, verifyArtifacts: true, contractMode: false, now: new Date() });
    assert(actualMode.reasons.includes("contract-fixture-is-not-execution-evidence"), "contract fixture promotion was not rejected");
  });

  check("fallback and manual intervention are rejected", () => {
    const candidate = clone(base);
    candidate.selectedAdapter.fallbackUsed = true;
    candidate.selectedAdapter.tool = "selenium";
    candidate.manualIntervention = true;
    const result = evaluate(candidate, tempRoot);
    assert(result.reasons.includes("adapter-fallback-used"), "fallback was not rejected");
    assert(result.reasons.includes("adapter-tool-engine-mismatch"), "adapter tool/engine drift was not rejected");
    assert(result.reasons.includes("manual-intervention-present"), "manual intervention was not rejected");
  });

  check("partial coverage and unsupported work block suite PASS", () => {
    const candidate = makeCandidate(tempRoot, policy, 424, "full-suite");
    candidate.coverage.unsupported = 1;
    const result = evaluate(candidate, tempRoot);
    assert(result.uiFulltestPass === false, "partial coverage became suite PASS");
    assert(result.reasons.includes("coverage-unsupported-must-be-zero"), "unsupported gap missing");
  });

  check("pre-existing state without a completion oracle is rejected", () => {
    const candidate = clone(base);
    candidate.cases[0].completionOracle = { type: "dom-transition", evidenceRef: "trace.json", beforeDigest: "same", afterDigest: "same" };
    const result = evaluate(candidate, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":dom-transition-did-not-change")), "unchanged DOM marker passed");
  });

  check("REVIEW4-58 primary action ID correlation and exact selector are required", () => {
    for (const [label, mutate, expectedReason] of [
      ["action-id", candidate => { candidate.cases[0].completionOracle.actionId = "OTHER:action"; },
        "completion-primary-action-id-mismatch"],
      ["correlation", candidate => { candidate.cases[0].completionOracle.correlationId = `${candidate.cases[0].testId}:navigation`; },
        "completion-primary-correlation-mismatch"],
      ["selector", candidate => { candidate.cases[0].completionOracle.controlSelector = "#other"; },
        "completion-primary-control-selector-mismatch"],
    ]) {
      const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
      mutate(candidate);
      const result = evaluate(candidate, tempRoot);
      assert(result.reasons.some(reason => reason.endsWith(`:${expectedReason}`)),
        `${label} primary completion drift passed`);
    }
  });

  check("role theme and viewport claims must match observed browser state", () => {
    const candidate = clone(base);
    candidate.cases[0].observed.accountRole = "viewer";
    candidate.cases[0].observed.theme = "dark";
    candidate.cases[0].observed.viewport = { width: 1180, height: 800 };
    const result = evaluate(candidate, tempRoot);
    for (const suffix of ["observed-runtime-accountRole-mismatch", "observed-runtime-theme-mismatch", "observed-runtime-viewport-mismatch"]) {
      assert(result.reasons.some(reason => reason.endsWith(`:${suffix}`)), `${suffix} missing`);
    }
  });

  check("artifact path escape hash mismatch and fake PNG are rejected", () => {
    const escaped = clone(base);
    escaped.cases[0].artifacts.screenshot.path = "../escape.png";
    let result = evaluate(escaped, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-screenshot-path-invalid")), "path escape passed");
    const badHash = clone(base);
    badHash.cases[0].artifacts.trace.sha256 = "0".repeat(64);
    result = evaluate(badHash, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-trace-integrity-failed")), "hash mismatch passed");
    const fakePng = clone(base);
    const fakePath = path.join(tempRoot, "artifacts", "fake.png");
    fs.writeFileSync(fakePath, "not a png", "utf8");
    fakePng.cases[0].artifacts.screenshot = artifactMeta(fakePath, "image/png", path.join(tempRoot, "artifacts"),
      fakePng.cases[0].testId, fakePng.cases[0].completionOracle.correlationId);
    result = evaluate(fakePng, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-screenshot-not-decodable-png")), "fake PNG passed");
    const symlink = clone(base);
    const outsidePath = path.join(tempRoot, "outside.json");
    const linkPath = path.join(tempRoot, "artifacts", "link.json");
    fs.writeFileSync(outsidePath, "{}\n", "utf8");
    fs.symlinkSync(outsidePath, linkPath);
    symlink.cases[0].artifacts.trace = artifactMeta(linkPath, "application/json", path.join(tempRoot, "artifacts"),
      symlink.cases[0].testId, symlink.cases[0].completionOracle.correlationId);
    result = evaluate(symlink, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-trace-path-invalid")), "symlink escape passed");
  });

  check("redaction visual replay and cleanup boundaries are hard failures", () => {
    const candidate = clone(base);
    candidate.security.redactionStatus = "FAIL";
    candidate.cases[0].visualEvidence.reviewRequired = true;
    candidate.replayStatus = "FAIL";
    candidate.cleanup.portsClean = false;
    const result = evaluate(candidate, tempRoot);
    for (const reason of ["redaction-not-pass", "replay-not-pass", "cleanup-portsClean-not-true"]) {
      assert(result.reasons.includes(reason), `${reason} missing`);
    }
    assert(result.reasons.some(reason => reason.endsWith(":visual-evidence-not-qualified")), "visual review gap passed");
  });

  const counts = runChecks();
  console.log("");
  console.log("== Policy v4 evidence contract summary ==");
  console.log("- schema: media-server.ui-fulltest-evidence-policy.v4");
  console.log(`- pass: ${counts.pass}`);
  console.log(`- fail: ${counts.fail}`);
  console.log("- boundary: contract fixtures are not UI fulltest execution evidence");
  if (counts.fail > 0) process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function makeCandidate(tempRoot, policyValue, count, scopeKind) {
  const policyDir = path.join(tempRoot, "test/fixtures");
  const scriptDirPath = path.join(tempRoot, "scripts/internal");
  const artifactRoot = path.join(tempRoot, "artifacts");
  fs.mkdirSync(policyDir, { recursive: true });
  fs.mkdirSync(scriptDirPath, { recursive: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  const policyPath = path.join(policyDir, "policy.json");
  const manifestPath = path.join(tempRoot, policyValue.sourceBinding.canonicalCaseManifestPath);
  const nativeManifestPath = path.join(tempRoot, policyValue.sourceBinding.nativeExactManifestPath);
  const visualMatrixPlanPath = path.join(tempRoot, "test/fixtures/v390_ui_visual_matrix_plan.json");
  const implementationPath = path.join(tempRoot, canonicalManifestSource.implementationEvidence.path);
  const runnerPath = path.join(scriptDirPath, "runner.mjs");
  const buildPath = path.join(tempRoot, "build/media_server");
  fs.writeFileSync(policyPath, `${JSON.stringify(policyValue, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(path.dirname(implementationPath), { recursive: true });
  fs.copyFileSync(canonicalManifestSourcePath, manifestPath);
  fs.copyFileSync(nativeManifestSourcePath, nativeManifestPath);
  fs.copyFileSync(visualMatrixPlanSourcePath, visualMatrixPlanPath);
  fs.copyFileSync(path.join(rootDir, canonicalManifestSource.implementationEvidence.path), implementationPath);
  fs.writeFileSync(runnerPath, "// contract runner fingerprint\n", "utf8");
  fs.mkdirSync(path.dirname(buildPath), { recursive: true });
  fs.writeFileSync(buildPath, "contract build\n", "utf8");
  const canonicalCases = canonicalManifestSource.cases.slice(0, count);
  assert(canonicalCases.length === count, `requested ${count} canonical cases, got ${canonicalCases.length}`);
  const cases = canonicalCases.map(canonicalCase => makeAttestedCase(
    artifactRoot,
    policyValue,
    canonicalCase,
    nativeById.get(canonicalCase.testId),
  ));
  const caseSetSha256 = sha256Text(JSON.stringify(cases.map(item => item.testId)));
  const matrixBundle = makeContractVisualMatrix(artifactRoot, policyValue);
  const crossCuttingObligations = policyValue.suiteClosure.requiredCrossCuttingObligations.map(id => {
    const correlationId = `contract-cross-${id}`;
    const filePath = path.join(artifactRoot, "cross-cutting", `${id}.json`);
    writeJson(filePath, {
      schema: policyValue.attestation.crossCuttingSchema,
      obligationId: id,
      status: "PASS",
      reviewRequired: false,
      correlationId,
      caseSetSha256,
      measuredEvidenceRefs: matrixBundle.refs,
      matrix: matrixBundle.summary,
    });
    return {
      id,
      status: "PASS",
      correlationId,
      evidenceRef: evidenceRef(artifactMeta(filePath, "application/json", artifactRoot, "__suite__", correlationId), policyValue),
    };
  });
  const suiteCorrelationId = "contract-suite-redaction";
  const suiteRedactionPath = path.join(artifactRoot, "suite-redaction.json");
  writeJson(suiteRedactionPath, {
    schema: policyValue.attestation.redactionScanSchema,
    scope: "suite",
    status: "PASS",
    correlationId: suiteCorrelationId,
    caseIds: cases.map(item => item.testId),
    caseAttestations: cases.map(item => ({ caseId: item.testId, sha256: item.security.evidenceRef.sha256 })),
    findings: [],
  });
  const suiteRedactionRef = evidenceRef(
    artifactMeta(suiteRedactionPath, "application/json", artifactRoot, "__suite__", suiteCorrelationId),
    policyValue,
  );
  const now = Date.now();
  return {
    schema: "media-server.ui-automation-evidence.v4",
    contractFixture: true,
    fixture: false,
    scopeKind,
    executionKind: "actual-native-visible-dom",
    result: "PASS",
    startedAt: new Date(now - 1000).toISOString(),
    finishedAt: new Date(now).toISOString(),
    durationMs: 1000,
    manualIntervention: false,
    failedInteractionCount: 0,
    replayStatus: "PASS",
    selectedAdapter: {
      tool: "playwright",
      engine: "playwright-native",
      fallbackUsed: false,
      capabilities: [...policyValue.caseEquivalence.requiredAdapterCapabilities]
    },
    sourceBinding: {
      version: "3.9.0",
      gitCommit: "contract",
      worktreePatchSha256: sha256Text("contract patch"),
      buildPath: "build/media_server",
      buildSha256: sha256File(buildPath),
      policyPath: "test/fixtures/policy.json",
      policySha256: sha256File(policyPath),
      caseManifestPath: policyValue.sourceBinding.canonicalCaseManifestPath,
      caseManifestSha256: sha256File(manifestPath),
      nativeExactManifestPath: policyValue.sourceBinding.nativeExactManifestPath,
      nativeExactManifestSha256: sha256File(nativeManifestPath),
      runnerPath: "scripts/internal/runner.mjs",
      runnerSha256: sha256File(runnerPath),
      artifactRoot: "artifacts",
      currentSourceVerified: true
    },
    security: {
      redactionStatus: "PASS",
      unapprovedConsoleMessages: 0,
      forbiddenMaterialFindings: 0,
      correlationId: suiteCorrelationId,
      evidenceRef: suiteRedactionRef,
    },
    cleanup: { serversStopped: true, portsClean: true, temporaryArtifactsRemoved: true },
    coverage: {
      targetCount: count,
      obligationIds: cases.map(item => item.testId),
      fail: 0,
      notRun: 0,
      unsupported: 0,
      unapprovedExclusions: 0,
      manualIntervention: 0
    },
    crossCuttingObligations,
    cases
  };
}

function makeContractVisualMatrix(artifactRoot, policyValue) {
  const probes = [];
  const refs = [];
  for (const variant of expandVisualMatrixPlan(visualMatrixPlan)) {
      const id = `contract-visual-${variant.canonicalCaseId}-${variant.width}-${variant.theme}`;
      const correlationId = `${id}:correlation`;
      const root = path.join(artifactRoot, "visual-matrix", id);
      const screenshotPath = path.join(root, "screen.png");
      const measurementPath = path.join(root, "measurement.json");
      const payloadPath = path.join(root, "visual.json");
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(screenshotPath, createPng(variant.width, variant.height, id));
      const measurement = contractVisualMeasurement({
        testId: variant.canonicalCaseId,
        featureId: variant.featureId,
        screenId: variant.screenId,
        route: variant.screenRoute,
        accountRole: variant.accountRole,
        viewport: { width: variant.width, height: variant.height },
        theme: variant.theme,
        targetSelector: variant.targetSelector,
      });
      if (variant.liveVideoRequired) measurement.liveVideo = contractLiveVideo(variant, visualMatrixPlan.liveVideoProbe);
      writeJson(measurementPath, measurement);
      const payload = evaluateVisualArtifact({
        screenshotPath,
        measurement,
        caseId: id,
        correlationId,
        expectedCase: variant,
        liveVideoSpec: variant.liveVideoRequired ? visualMatrixPlan.liveVideoProbe : null,
      });
      payload.role = variant.accountRole;
      writeJson(payloadPath, payload);
      const screenshot = artifactMeta(screenshotPath, "image/png", artifactRoot, "__suite__", correlationId);
      const measurementMeta = artifactMeta(measurementPath, "application/json", artifactRoot, "__suite__", correlationId);
      const payloadMeta = artifactMeta(payloadPath, "application/json", artifactRoot, "__suite__", correlationId);
      refs.push(evidenceRef(screenshot, policyValue), evidenceRef(measurementMeta, policyValue), evidenceRef(payloadMeta, policyValue));
      probes.push({
        id,
        canonicalCaseId: variant.canonicalCaseId,
        featureId: variant.featureId,
        screenId: variant.screenId,
        screenRoute: variant.screenRoute,
        role: variant.accountRole,
        width: variant.width,
        height: variant.height,
        theme: variant.theme,
        payload,
      });
  }
  return {
    refs,
    summary: evaluateVisualMatrix(probes, {
      plan: visualMatrixPlan,
      canonical: canonicalManifestSource,
      native: nativeManifestSource,
    }),
  };
}

function makeAttestedCase(artifactRoot, policyValue, canonicalCase, nativeCase) {
  assert(nativeCase, `${canonicalCase.testId} native case missing`);
  const expectedCompletion = nativeCase.workflow.expectedResults[0].completion;
  const correlationId = expectedCompletion.correlationId;
  const oracleType = expectedCompletion.requiredSource === "local-transition-readback"
    ? "dom-transition"
    : "network-response-and-dom";
  const statusCode = expectedCompletion.request?.allowedStatuses?.[0] || 0;
  const caseRoot = path.join(artifactRoot, "cases", canonicalCase.testId);
  fs.mkdirSync(caseRoot, { recursive: true });
  const pngPath = path.join(caseRoot, "screen.png");
  const tracePath = path.join(caseRoot, "trace.json");
  const consolePath = path.join(caseRoot, "console.json");
  const logPath = path.join(caseRoot, "server.log");
  const measurementPath = path.join(caseRoot, "visual-measurement.json");
  const visualPath = path.join(caseRoot, "visual-diff.json");
  const redactionPath = path.join(caseRoot, "redaction.json");
  fs.writeFileSync(pngPath, createPng(canonicalCase.viewport.width, canonicalCase.viewport.height, canonicalCase.testId));
  writeJson(tracePath, {
    schema: policyValue.attestation.interactionTraceSchema,
    caseId: canonicalCase.testId,
    correlationId,
    route: canonicalCase.route,
    controlAction: canonicalCase.controlAction,
    events: [
      {
        type: "trusted-interaction",
        trusted: true,
        phase: "primary-action",
        actionId: expectedCompletion.actionId,
        actionKind: expectedCompletion.actionKind,
        controlSelector: expectedCompletion.controlSelector,
        correlationId,
      },
      ...(expectedCompletion.request ? [{
        type: "network-response",
        requestId: `${canonicalCase.testId}:contract-request`,
        correlationId,
        method: expectedCompletion.request.method,
        url: `http://127.0.0.1${expectedCompletion.request.urlPath}`,
        statusCode,
      }] : []),
      {
        type: "completion",
        status: "PASS",
        oracleType,
        phase: "primary-action",
        actionId: expectedCompletion.actionId,
        actionKind: expectedCompletion.actionKind,
        controlSelector: expectedCompletion.controlSelector,
        correlationId,
      },
    ],
  });
  writeJson(consolePath, {
    schema: policyValue.attestation.browserConsoleSchema,
    caseId: canonicalCase.testId,
    correlationId,
    messages: [],
  });
  fs.writeFileSync(logPath, `caseId=${canonicalCase.testId} correlationId=${correlationId} status=PASS\n`, "utf8");
  const screenshot = artifactMeta(pngPath, "image/png", artifactRoot, canonicalCase.testId, correlationId);
  const trace = artifactMeta(tracePath, "application/json", artifactRoot, canonicalCase.testId, correlationId);
  const browserConsole = artifactMeta(consolePath, "application/json", artifactRoot, canonicalCase.testId, correlationId);
  const serverLog = artifactMeta(logPath, "text/plain", artifactRoot, canonicalCase.testId, correlationId);
  const measurement = contractVisualMeasurement(canonicalCase);
  writeJson(measurementPath, measurement);
  const visualMeasurement = artifactMeta(measurementPath, "application/json", artifactRoot, canonicalCase.testId, correlationId);
  const visualPayload = evaluateVisualArtifact({
    screenshotPath: pngPath,
    measurement,
    caseId: canonicalCase.testId,
    correlationId,
    expectedCase: visualExpectedCase(canonicalCase),
  });
  writeJson(visualPath, visualPayload);
  const visualDiff = artifactMeta(visualPath, "application/json", artifactRoot, canonicalCase.testId, correlationId);
  const scannedArtifacts = [screenshot, trace, browserConsole, serverLog, visualMeasurement, visualDiff]
    .map(item => ({ path: item.path, sha256: item.sha256 }));
  writeJson(redactionPath, {
    schema: policyValue.attestation.redactionScanSchema,
    scope: "case",
    status: "PASS",
    caseId: canonicalCase.testId,
    correlationId,
    scannedArtifacts,
    findings: [],
  });
  const redactionScan = artifactMeta(redactionPath, "application/json", artifactRoot, canonicalCase.testId, correlationId);
  return {
    testId: canonicalCase.testId,
    featureId: canonicalCase.featureId,
    evidenceStatus: "automation-equivalent-pass",
    status: "PASS",
    requested: canonicalRequestedProjection({
      canonicalRoute: canonicalCase.route,
      accountRole: canonicalCase.accountRole,
      viewport: canonicalCase.viewport,
      theme: canonicalCase.theme,
      controlAction: canonicalCase.controlAction,
    }),
    observed: expectedRuntimeObservation(nativeCase),
    requestedObservedSchema: "media-server.v390-ui-requested-observed-envelope.v1",
    interaction: { executed: true, trusted: true },
    completionOracle: {
      type: oracleType,
      evidenceRef: evidenceRef(trace, policyValue),
      correlationId,
      actionId: expectedCompletion.actionId,
      actionKind: expectedCompletion.actionKind,
      controlSelector: expectedCompletion.controlSelector,
      statusCode,
      beforeDigest: "a".repeat(64),
      afterDigest: "b".repeat(64),
    },
    visibleAssertions: [{ pass: true, visible: true, sourceBoundary: "exact-selector-visible-innerText-only" }],
    visualEvidence: {
      schema: policyValue.caseEquivalence.visualBaselineSchema,
      status: "PASS",
      reviewRequired: false,
      correlationId,
      evidenceRef: evidenceRef(visualDiff, policyValue),
      measurementRef: evidenceRef(visualMeasurement, policyValue),
    },
    security: {
      redactionStatus: "PASS",
      forbiddenMaterialFindings: 0,
      correlationId,
      evidenceRef: evidenceRef(redactionScan, policyValue),
    },
    manualIntervention: false,
    artifacts: { screenshot, trace, browserConsole, serverLog, visualMeasurement, visualDiff, redactionScan },
  };
}

function contractVisualMeasurement(canonicalCase) {
  const { width, height } = canonicalCase.viewport;
  const dark = canonicalCase.theme === "dark";
  const targetSelector = canonicalCase.targetSelector || "body";
  const screenId = canonicalCase.screenId || canonicalCase.testId;
  return {
    schema: "media-server.ui-browser-visual-measurement.v2",
    caseBinding: {
      canonicalCaseId: canonicalCase.testId,
      featureId: canonicalCase.featureId,
      screenId,
      screenRoute: canonicalCase.route,
      accountRole: canonicalCase.accountRole,
      targetSelector,
    },
    route: canonicalCase.route,
    accountRole: canonicalCase.accountRole,
    requestedTheme: canonicalCase.theme,
    appliedTheme: canonicalCase.theme,
    mediaTheme: canonicalCase.theme,
    viewport: { width, height, devicePixelRatio: 1 },
    document: { scrollWidth: width, scrollHeight: height, clientWidth: width, clientHeight: height },
    target: { selector: targetSelector, visible: true, rect: { left: 0, top: 0, right: width, bottom: Math.min(height, 120), width, height: Math.min(height, 120) } },
    textSamples: [{
      foreground: dark ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
      background: dark ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)",
      fontSizePx: 14,
      fontWeight: "400",
    }],
    focusSamples: [{ tag: "button", id: canonicalCase.testId, testId: "", visible: true, outlineStyle: "solid", outlineWidth: "2px", boxShadow: "none" }],
    liveVideo: null,
  };
}

function visualExpectedCase(canonicalCase) {
  return {
    canonicalCaseId: canonicalCase.testId,
    featureId: canonicalCase.featureId,
    screenId: canonicalCase.screenId || canonicalCase.testId,
    screenRoute: canonicalCase.route,
    accountRole: canonicalCase.accountRole,
    targetSelector: canonicalCase.targetSelector || "body",
    width: canonicalCase.viewport.width,
    height: canonicalCase.viewport.height,
    theme: canonicalCase.theme,
    liveVideoRequired: false,
  };
}

function contractLiveVideo(variant, spec) {
  const tileRect = { left: 4, top: 125, right: variant.width - 4, bottom: 760, width: variant.width - 8, height: 635 };
  const stageRect = { left: 4, top: 190, right: variant.width - 4, bottom: 690, width: variant.width - 8, height: 500 };
  const intrinsicRatio = 16 / 9;
  const stageRatio = stageRect.width / stageRect.height;
  const contentWidth = stageRatio > intrinsicRatio ? stageRect.height * intrinsicRatio : stageRect.width;
  const contentHeight = stageRatio > intrinsicRatio ? stageRect.height : stageRect.width / intrinsicRatio;
  const contentLeft = stageRect.left + (stageRect.width - contentWidth) / 2;
  const contentTop = stageRect.top + (stageRect.height - contentHeight) / 2;
  const contentRect = { left: contentLeft, top: contentTop, right: contentLeft + contentWidth, bottom: contentTop + contentHeight, width: contentWidth, height: contentHeight };
  const identity = "tile-0:contract-view";
  return {
    tile: { selector: spec.tileSelector, identity, viewId: "contract-view", visible: true, rect: tileRect },
    stage: { selector: spec.stageSelector, tileIdentity: identity, visible: true, rect: stageRect },
    video: { selector: spec.videoSelector, tileIdentity: identity, visible: true, rect: stageRect },
    placeholder: { selector: spec.placeholderSelector, tileIdentity: identity, hidden: true },
    modeControls: { selector: spec.modeControlsSelector, tileIdentity: identity, visible: true },
    mode: { selector: spec.modeSelector, tileIdentity: identity, active: true, value: "va-overlay" },
    session: {
      tileIdentity: identity,
      tileViewId: "contract-view",
      requestViewId: "contract-view",
      answerViewId: "contract-view",
      correlationId: `contract-live-${variant.width}-${variant.theme}`,
      requestMethod: "POST",
      requestPath: "/client/api/views/contract-view/webrtc/session",
      requestBody: { overlayMode: "va-overlay" },
      responseStatus: 200,
      sessionId: "contract-session",
      responseSessionId: "contract-session",
      answerSessionId: "contract-session",
      offerReceived: true,
      answerMethod: "POST",
      answerPath: "/client/api/views/contract-view/webrtc/session/contract-session/answer",
      answerStatus: 200,
    },
    playback: {
      tileIdentity: identity,
      srcObject: true,
      liveVideoTracks: 1,
      readyState: 4,
      videoWidth: 1920,
      videoHeight: 1080,
      currentTimeBefore: 1,
      currentTimeAfter: 1.2,
      presentedFramesBefore: 10,
      presentedFramesAfter: 12,
    },
    rendering: { tileIdentity: identity, objectFit: "contain", stageRect, contentRect },
    controls: spec.controlSelectors.map((selector, index) => ({
      selector,
      tileIdentity: identity,
      visible: true,
      rect: { left: 8 + index, top: 135, right: variant.width - 8, bottom: 180, width: variant.width - 16 - index, height: 45 },
    })),
    genericDomOverlays: [],
  };
}

function artifactMeta(filePath, contentType, artifactRoot, caseId, correlationId) {
  const stat = fs.statSync(filePath);
  return {
    path: path.relative(artifactRoot, filePath),
    bytes: stat.size,
    sha256: sha256File(filePath),
    contentType,
    caseId,
    correlationId,
  };
}

function evidenceRef(metadata, policyValue) {
  return { schema: policyValue.attestation.evidenceRefSchema, ...clone(metadata) };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function createPng(width, height, seed = "contract") {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowBytes = width * 4 + 1;
  const raw = Buffer.alloc(height * rowBytes);
  const seedValue = [...String(seed)].reduce((sum, value) => (sum + value.charCodeAt(0)) % 251, 0);
  const rows = [0, 1].map(rowVariant => {
    const row = Buffer.alloc(rowBytes);
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      const band = ((x >> 4) + seedValue + rowVariant) % 7;
      row[offset] = 20 + band * 30;
      row[offset + 1] = 25 + ((band + seedValue) % 7) * 28;
      row[offset + 2] = 30 + ((band + rowVariant * 2) % 7) * 26;
      row[offset + 3] = 255;
    }
    return row;
  });
  for (let y = 0; y < height; y += 1) rows[(y >> 4) % rows.length].copy(raw, y * rowBytes);
  return Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", zlib.deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function evaluate(candidate, tempRoot) {
  return evaluateEvidence(policy, candidate, {
    rootDir: tempRoot,
    verifyArtifacts: true,
    verifyCurrentSource: true,
    contractMode: true,
    now: new Date(),
    currentSource: {
      version: candidate.sourceBinding.version,
      gitCommit: candidate.sourceBinding.gitCommit,
      worktreePatchSha256: candidate.sourceBinding.worktreePatchSha256,
    },
  });
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (let index = 0; index < checks.length; index += 1) {
    const item = checks[index];
    console.log(`[progress] (${index + 1}/${checks.length}) ${item.name}; remaining=${checks.length - index - 1}`);
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function clone(value) {
  return structuredClone(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
