#!/usr/bin/env node
// 파일 용도: Policy v4 qualifier가 legacy/fixture/partial/무결성 결함을 대체 evidence로 승격하지 않는지 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateEvidence, sha256File, sha256Text, validatePolicy } from "./ui_fulltest_evidence_policy_v4_lib.mjs";

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
      ["route", candidate => { candidate.cases[0].requested.route = candidate.cases[0].observed.route = "/wrong"; }, "canonical-route-mismatch"],
      ["accountRole", candidate => { candidate.cases[0].requested.accountRole = candidate.cases[0].observed.accountRole = "viewer"; }, "canonical-accountRole-mismatch"],
      ["viewport", candidate => { candidate.cases[0].requested.viewport = candidate.cases[0].observed.viewport = { width: 1180, height: 800 }; }, "canonical-viewport-mismatch"],
      ["theme", candidate => { candidate.cases[0].requested.theme = candidate.cases[0].observed.theme = "dark"; }, "canonical-theme-mismatch"],
      ["controlAction", candidate => { candidate.cases[0].requested.controlAction = candidate.cases[0].observed.controlAction = { selector: "#wrong", actionAnchor: "wrong" }; }, "canonical-controlAction-mismatch"],
    ];
    for (const [label, mutate, expectedReason] of mutations) {
      const candidate = makeCandidate(tempRoot, policy, 1, "scoped-change");
      mutate(candidate);
      const result = evaluate(candidate, tempRoot);
      assert(result.reasons.some(reason => reason.endsWith(`:${expectedReason}`)), `${label} canonical drift passed`);
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

  check("legacy and actual-mode contract fixture are ineligible", () => {
    const legacy = evaluateEvidence(policy, { schema: "media-server.v390-ui-automation.v1" }, { rootDir: tempRoot });
    assert(legacy.evidenceEligibility === "ineligible", "legacy v1 must be ineligible");
    const actualMode = evaluateEvidence(policy, base, { rootDir: tempRoot, verifyArtifacts: true, contractMode: false, now: new Date() });
    assert(actualMode.reasons.includes("contract-fixture-is-not-execution-evidence"), "contract fixture promotion was not rejected");
  });

  check("fallback and manual intervention are rejected", () => {
    const candidate = clone(base);
    candidate.selectedAdapter.fallbackUsed = true;
    candidate.manualIntervention = true;
    const result = evaluate(candidate, tempRoot);
    assert(result.reasons.includes("adapter-fallback-used"), "fallback was not rejected");
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

  check("role theme and viewport claims must match observed browser state", () => {
    const candidate = clone(base);
    candidate.cases[0].observed.accountRole = "viewer";
    candidate.cases[0].observed.theme = "dark";
    candidate.cases[0].observed.viewport = { width: 1180, height: 800 };
    const result = evaluate(candidate, tempRoot);
    for (const suffix of ["accountRole-requested-observed-mismatch", "theme-requested-observed-mismatch", "viewport-requested-observed-mismatch"]) {
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
    fakePng.cases[0].artifacts.screenshot = artifactMeta(fakePath, "image/png", path.join(tempRoot, "artifacts"));
    result = evaluate(fakePng, tempRoot);
    assert(result.reasons.some(reason => reason.endsWith(":artifact-screenshot-not-real-png")), "fake PNG passed");
    const symlink = clone(base);
    const outsidePath = path.join(tempRoot, "outside.json");
    const linkPath = path.join(tempRoot, "artifacts", "link.json");
    fs.writeFileSync(outsidePath, "{}\n", "utf8");
    fs.symlinkSync(outsidePath, linkPath);
    symlink.cases[0].artifacts.trace = artifactMeta(linkPath, "application/json", path.join(tempRoot, "artifacts"));
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
  const implementationPath = path.join(tempRoot, canonicalManifestSource.implementationEvidence.path);
  const runnerPath = path.join(scriptDirPath, "runner.mjs");
  const buildPath = path.join(tempRoot, "build/media_server");
  fs.writeFileSync(policyPath, `${JSON.stringify(policyValue, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(path.dirname(implementationPath), { recursive: true });
  fs.copyFileSync(canonicalManifestSourcePath, manifestPath);
  fs.copyFileSync(path.join(rootDir, canonicalManifestSource.implementationEvidence.path), implementationPath);
  fs.writeFileSync(runnerPath, "// contract runner fingerprint\n", "utf8");
  fs.mkdirSync(path.dirname(buildPath), { recursive: true });
  fs.writeFileSync(buildPath, "contract build\n", "utf8");
  const pngPath = path.join(artifactRoot, "screen.png");
  const tracePath = path.join(artifactRoot, "trace.json");
  const consolePath = path.join(artifactRoot, "console.json");
  const logPath = path.join(artifactRoot, "server.log");
  fs.writeFileSync(pngPath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  fs.writeFileSync(tracePath, `${JSON.stringify({ schema: "contract.trace.v4" })}\n`, "utf8");
  fs.writeFileSync(consolePath, "[]\n", "utf8");
  fs.writeFileSync(logPath, "contract log\n", "utf8");
  const baseCase = {
    evidenceStatus: "automation-equivalent-pass",
    status: "PASS",
    interaction: { executed: true, trusted: true },
    completionOracle: { type: "network-response-and-dom", evidenceRef: "trace.json", correlationId: "contract-correlation", statusCode: 200 },
    visibleAssertions: [{ pass: true, visible: true, sourceBoundary: "exact-selector-visible-innerText-only" }],
    visualEvidence: { schema: "media-server.ui-visual-baseline-diff.v1", status: "PASS", reviewRequired: false, evidenceRef: "visual-diff.json" },
    security: { redactionStatus: "PASS", forbiddenMaterialFindings: 0 },
    manualIntervention: false,
    artifacts: {
      screenshot: artifactMeta(pngPath, "image/png", artifactRoot),
      trace: artifactMeta(tracePath, "application/json", artifactRoot),
      browserConsole: artifactMeta(consolePath, "application/json", artifactRoot),
      serverLog: artifactMeta(logPath, "text/plain", artifactRoot)
    }
  };
  const canonicalCases = canonicalManifestSource.cases.slice(0, count);
  assert(canonicalCases.length === count, `requested ${count} canonical cases, got ${canonicalCases.length}`);
  const cases = canonicalCases.map(canonicalCase => ({
    ...clone(baseCase),
    testId: canonicalCase.testId,
    featureId: canonicalCase.featureId,
    requested: {
      route: canonicalCase.route,
      accountRole: canonicalCase.accountRole,
      theme: canonicalCase.theme,
      viewport: clone(canonicalCase.viewport),
      controlAction: clone(canonicalCase.controlAction),
    },
    observed: {
      route: canonicalCase.route,
      accountRole: canonicalCase.accountRole,
      theme: canonicalCase.theme,
      viewport: clone(canonicalCase.viewport),
      controlAction: clone(canonicalCase.controlAction),
    },
  }));
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
      runnerPath: "scripts/internal/runner.mjs",
      runnerSha256: sha256File(runnerPath),
      artifactRoot: "artifacts",
      currentSourceVerified: true
    },
    security: { redactionStatus: "PASS", unapprovedConsoleMessages: 0, forbiddenMaterialFindings: 0 },
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
    crossCuttingObligations: policyValue.suiteClosure.requiredCrossCuttingObligations.map(id => ({ id, status: "PASS", evidenceRef: `${id}.json` })),
    cases
  };
}

function artifactMeta(filePath, contentType, artifactRoot) {
  const stat = fs.statSync(filePath);
  return { path: path.relative(artifactRoot, filePath), bytes: stat.size, sha256: sha256File(filePath), contentType };
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
