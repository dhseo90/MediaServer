#!/usr/bin/env node
// 파일 용도: v3.9 final evidence integrity verifier의 negative fixture를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import * as nativeExactCasesLib from "./v390_ui_native_exact_cases_lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 final evidence integrity contract

Usage:
  ./server.sh verify-v390-final-evidence-integrity-contract

Checks fixture acceptance, actual-only eligibility, duplicate screenshot, video placeholder,
constant/failed cleanup, and missing commit provenance rejection.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-final-evidence-integrity";
const checks = [];
const workspaces = [];
process.on("exit", () => workspaces.forEach(workspace => fs.rmSync(workspace, { recursive: true, force: true })));

check("canonical final integrity binds parent, Policy rows, cleanup, and first failure", () => {
  assert(typeof nativeExactCasesLib.validateCanonicalFinalIntegrityBindings === "function",
    "canonical final integrity binding validator is missing");
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-final-binding-"));
  workspaces.push(workspace);
  const parentSummaryPath = path.join(workspace, "parent-summary.json");
  const policySummaryPath = path.join(workspace, "policy-summary.json");
  fs.writeFileSync(parentSummaryPath, "{}\n", "utf8");
  fs.writeFileSync(policySummaryPath, "{\"policy\":true}\n", "utf8");
  const ids = JSON.parse(readText("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"))
    .cases.map(item => item.testId);
  const source = {
    verificationCommitSha: "1".repeat(40),
    verificationBranch: "v3.9.0-verification-rebase",
    manifestSha256: "3".repeat(64),
    buildSha256: "4".repeat(64),
    implementationFiles: {
      runner: {
        path: "scripts/internal/run_v390_ui_native_exact_cases.mjs",
        sha256: "5".repeat(64),
      },
    },
  };
  const parent = {
    schema: "media-server.v390-ui-canonical-parent.v1",
    sourceBinding: source,
    runBinding: { runId: "run-1" },
    counts: { fail: 0 },
    failureCensus: [],
    firstFailure: null,
    runtimeOwnership: { parentOwned: true, childrenBootstrapRuntime: false,
      initial: { runtimeRootSha256: "2".repeat(64) }, final: { runtimeRootSha256: "2".repeat(64) } },
  };
  const acceptance = {
    schema: "media-server.v390-test-acceptance-bundle.v1",
    uiAutomation: { summaryPath: parentSummaryPath },
    sourceProvenance: { commitSha: source.verificationCommitSha, branch: source.verificationBranch },
    sourceProvenanceEnd: { commitSha: source.verificationCommitSha,
      branch: source.verificationBranch, sourceWorktreeClean: true, unapprovedDirtyPaths: [] },
    cleanup: { status: "PASS", checks: [{ status: "PASS" }] },
    uiEnvironment: { cleanup: { status: "PASS" } },
    firstFailure: null,
  };
  const policy = {
    schema: "media-server.ui-fulltest-evidence-policy-evaluation.v4",
    policyValidationResult: "PASS",
    sourceSummary: policySummaryPath,
    sourceSummarySha256: createHash("sha256").update(fs.readFileSync(policySummaryPath)).digest("hex"),
    qualification: { evidenceEligibility: "eligible", uiFulltestPass: true,
      qualifiedCaseIds: ids, qualifiedCaseCount: 424 },
    uiFulltestPass: true,
  };
  const policyRawSummary = {
    schema: "media-server.ui-automation-evidence.v4",
    sourceBinding: {
      gitCommit: source.verificationCommitSha,
      nativeExactManifestSha256: "6".repeat(64),
      nativeExactManifestStableSha256: source.manifestSha256,
      buildSha256: source.buildSha256,
      runnerSha256: source.implementationFiles.runner.sha256,
      sourceFingerprintOnly: true,
    },
    canonicalParentBinding: {
      schema: parent.schema,
      runId: parent.runBinding.runId,
      sourceBinding: structuredClone(source),
      counts: structuredClone(parent.counts),
    },
  };
  const input = { acceptanceSummary: acceptance, parentSummary: parent,
    parentValidation: { eligible: true, censusComplete: true }, policyEvaluation: policy,
    policyRawSummary, independentPolicyEvaluation: structuredClone(policy.qualification),
    expectedCurrentSource: { commitSha: source.verificationCommitSha,
      branch: source.verificationBranch, sourceWorktreeClean: true, unapprovedDirtyPaths: [] },
    canonicalCaseIds: ids, parentSummaryPath, policySummaryPath };
  assert(nativeExactCasesLib.validateCanonicalFinalIntegrityBindings(input).pass === true,
    "coherent canonical final binding was rejected");
  for (const [label, mutate] of [
    ["source", value => { value.acceptanceSummary.sourceProvenance.commitSha = "0".repeat(40); }],
    ["cleanup", value => { value.acceptanceSummary.cleanup.status = "FAIL"; }],
    ["runtime", value => { value.parentSummary.runtimeOwnership.final.runtimeRootSha256 = "3".repeat(64); }],
    ["policy-order", value => { [value.policyEvaluation.qualification.qualifiedCaseIds[0],
      value.policyEvaluation.qualification.qualifiedCaseIds[1]] =
      [value.policyEvaluation.qualification.qualifiedCaseIds[1], value.policyEvaluation.qualification.qualifiedCaseIds[0]]; }],
    ["policy-digest", value => { value.policyEvaluation.sourceSummarySha256 = "0".repeat(64); }],
    ["policy-parent-run", value => { value.policyRawSummary.canonicalParentBinding.runId = "stale-run"; }],
    ["policy-runner", value => { value.policyRawSummary.sourceBinding.runnerSha256 = "0".repeat(64); }],
    ["policy-manifest-stable", value => {
      value.policyRawSummary.sourceBinding.nativeExactManifestStableSha256 = "0".repeat(64);
    }],
    ["policy-self-claim", value => { value.independentPolicyEvaluation.qualifiedCaseCount = 423; }],
    ["source-end-drift", value => { value.acceptanceSummary.sourceProvenanceEnd.commitSha = "0".repeat(40); }],
  ]) {
    const candidate = structuredClone(input);
    candidate.canonicalCaseIds = [...ids];
    mutate(candidate);
    assert(nativeExactCasesLib.validateCanonicalFinalIntegrityBindings(candidate).pass === false,
      `${label} final binding drift was accepted`);
  }

  const failureInput = structuredClone(input);
  const failureRecord = {
    caseId: ids[0],
    failureClass: "case-failure",
    failurePhase: "case-execution",
    failureCode: "CONTRACT_FAILURE",
    failures: [{ failureClass: "case-failure", phase: "request", code: "HTTP_500",
      requestIdentity: "request-001", responseIdentity: "response-001" }],
    lifecycleCensus: { attempted: 1, completed: 1, failed: 1 },
    childExitCode: 1,
    summaryPath: path.join(workspace, "case-001-summary.json"),
    cleanupAttestation: { pass: true, runtimeStopped: true, artifactsRemoved: true },
  };
  failureInput.parentSummary.counts = { selected: 424, attempted: 424, pass: 423,
    fail: 1, notRun: 0, unsupported: 0, runnerAbort: 0 };
  failureInput.parentSummary.result = "FAIL";
  failureInput.parentSummary.failureCensus = [failureRecord];
  failureInput.parentSummary.firstFailure = structuredClone(failureRecord);
  failureInput.parentValidation = { eligible: false, censusComplete: true };
  failureInput.acceptanceSummary.firstFailure = {
    testcaseId: ids[0],
    canonicalFailureBinding: {
      schema: "media-server.v390-canonical-first-failure-binding.v1",
      parentRunId: failureInput.parentSummary.runBinding.runId,
      failure: structuredClone(failureRecord),
      failureSha256: createHash("sha256").update(canonicalStableJson(failureRecord)).digest("hex"),
    },
  };
  failureInput.policyEvaluation = null;
  failureInput.policyRawSummary = null;
  failureInput.independentPolicyEvaluation = null;
  failureInput.policySummaryPath = "";
  assert(nativeExactCasesLib.validateCanonicalFinalIntegrityBindings(failureInput).pass === true,
    "complete ordinary failure census did not materialize integrity PASS while UI remains FAIL");
  for (const [label, mutate] of [
    ["case", value => { value.testcaseId = ids[1]; }],
    ["class", value => { value.canonicalFailureBinding.failure.failureClass = "runner-abort"; }],
    ["phase", value => { value.canonicalFailureBinding.failure.failurePhase = "bootstrap"; }],
    ["code", value => { value.canonicalFailureBinding.failure.failureCode = "DRIFT"; }],
    ["summary-path", value => { value.canonicalFailureBinding.failure.summaryPath += ".stale"; }],
    ["child-exit", value => { value.canonicalFailureBinding.failure.childExitCode = 0; }],
    ["run", value => { value.canonicalFailureBinding.parentRunId = "stale-run"; }],
    ["cleanup", value => { value.canonicalFailureBinding.failure.cleanupAttestation.pass = false; }],
    ["digest", value => { value.canonicalFailureBinding.failureSha256 = "0".repeat(64); }],
  ]) {
    const failureDrift = structuredClone(failureInput);
    mutate(failureDrift.acceptanceSummary.firstFailure);
    assert(nativeExactCasesLib.validateCanonicalFinalIntegrityBindings(failureDrift).pass === false,
      `ordinary failure firstFailure ${label} drift was accepted`);
  }
});

check("actual verifier CLI validates complete attempted-424 failure binding before remaining ineligible", async () => {
  const fixture = await makeCompleteCanonicalFailureFixture();
  const baseline = runIntegrity(fixture.workspace, true);
  assert(baseline.status !== 0, "complete canonical UI failure must remain release-ineligible");
  assert(baseline.stdout.includes("[pass] canonical parent, child census, Policy source, and cleanup form one run"),
    `actual verifier skipped deep complete-failure binding: ${baseline.stdout}\n${baseline.stderr}`);
  for (const [label, mutate] of [
    ["class", value => { value.firstFailure.canonicalFailureBinding.failure.failureClass = "runner-abort"; }],
    ["phase", value => { value.firstFailure.canonicalFailureBinding.failure.failurePhase = "bootstrap"; }],
    ["code", value => { value.firstFailure.canonicalFailureBinding.failure.failureCode = "DRIFT"; }],
    ["summary-path", value => { value.firstFailure.canonicalFailureBinding.failure.summaryPath += ".stale"; }],
    ["child-exit", value => { value.firstFailure.canonicalFailureBinding.failure.childExitCode = 0; }],
    ["run", value => { value.firstFailure.canonicalFailureBinding.parentRunId = "stale-run"; }],
    ["cleanup", value => { value.firstFailure.canonicalFailureBinding.failure.cleanupAttestation.pass = false; }],
    ["digest", value => { value.firstFailure.canonicalFailureBinding.failureSha256 = "0".repeat(64); }],
  ]) {
    const candidate = structuredClone(fixture.summary);
    mutate(candidate);
    fs.writeFileSync(fixture.summaryPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
    const rejected = runIntegrity(fixture.workspace, true);
    assert(rejected.status !== 0 &&
      rejected.stdout.includes("[fail] canonical parent, child census, Policy source, and cleanup form one run"),
    `actual verifier accepted ${label} complete-failure binding drift`);
  }
  fs.writeFileSync(fixture.summaryPath, `${JSON.stringify(fixture.summary, null, 2)}\n`, "utf8");
});

check("actual final integrity consumes canonical parent and independently bound Policy source", () => {
  const source = readText("scripts/internal/verify_v390_final_evidence_integrity.mjs");
  const bindingSource = readText("scripts/internal/v390_ui_native_exact_cases_lib.mjs");
  assert(!source.includes('uiSummary.schema === "media-server.ui-automation-evidence.v4"'),
    "actual integrity still treats the canonical parent as the legacy raw Policy summary");
  assert(!source.includes("uiSummary.sourceBinding?.currentSourceVerified === true"),
    "actual integrity still trusts a producer self-claim for current source");
  assert(source.includes('ui.schema === "media-server.v390-ui-canonical-parent.v1"'),
    "actual child integrity does not require the canonical parent schema");
  assert(source.includes("evaluateEvidence(") &&
    bindingSource.includes("final-policy-independent-evaluation-mismatch"),
  "actual integrity does not independently re-evaluate raw Policy evidence");
});

check("actual final integrity binds the authoritative UI runtime descriptor root", () => {
  const source = readText("scripts/internal/verify_v390_final_evidence_integrity.mjs");
  assert(source.includes("summary.uiEnvironment?.runtimeDescriptor?.temporaryRoot"),
    "actual integrity does not read the authoritative nested UI temporary root");
  assert(!source.includes("summary.uiEnvironment?.temporaryRoot"),
    "actual integrity still reads the nonexistent legacy UI temporary root");
  assert(source.includes("temporaryRootMeasurement?.contained === true") &&
    source.includes("temporaryRootMeasurement?.existedBefore === true") &&
    source.includes("temporaryRootMeasurement?.existsAfter === false") &&
    source.includes("temporaryRootMeasurement?.bytesAfter === 0"),
  "actual integrity weakened temporary-root cleanup measurement");
});

check("server dispatch, script inventory, and evidence docs expose final integrity commands", () => {
  const combined = [
    readText("server.sh"),
    readText("scripts/internal/verify_script_inventory.mjs"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/release-test-records.md"),
    readText("docs/release-evidence-index.md"),
    readText("docs/stream-verification.md"),
  ].join("\n");
  for (const snippet of [
    "verify-v390-final-evidence-integrity",
    "verify-v390-final-evidence-integrity-contract",
    "최종 evidence 무결성",
    "placeholder video",
    "first-failure",
  ]) assert(combined.includes(snippet), `final integrity docs/dispatch missing: ${snippet}`);
});

check("complete fixture integrity passes only with explicit fixture allowance", () => {
  const workspace = makeFixture("valid");
  const allowed = runIntegrity(workspace, true);
  assert(allowed.status === 0,
    `valid fixture integrity must pass with --allow-fixture: ${allowed.stdout}\n${allowed.stderr}`);
  assert(runIntegrity(workspace, false).status !== 0, "fixture must not be final-evidence eligible by default");
  const summary = JSON.parse(fs.readFileSync(path.join(workspace, "summary.json"), "utf8"));
  assert(summary.finalEvidence?.schema === "media-server.v390-canonical-final-evidence.v1",
    "fixture canonical final evidence manifest missing");
  assert(summary.finalEvidence.reportPath && summary.finalEvidence.reportSha256,
    "fixture report is not directly hash-bound");
});

check("canonical report tampering and temporary final evidence references are rejected", () => {
  const reportWorkspace = makeFixture("report-tamper");
  fs.appendFileSync(path.join(reportWorkspace, "report.md"), "tampered\n", "utf8");
  assert(runIntegrity(reportWorkspace, true).status !== 0, "tampered canonical report must fail");

  const tempWorkspace = makeFixture("temporary-final-reference");
  const summaryPath = path.join(tempWorkspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.finalEvidence.temporaryPathFinalEvidenceReferences = ["/tmp/not-final.json"];
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(tempWorkspace, true).status !== 0,
    "temporary path referenced as final evidence must fail");
});

check("canonical child evidence byte and hash drift are rejected", () => {
  const workspace = makeFixture("child-hash-drift");
  const childPath = path.join(workspace, "runs", "fixture-child.json");
  fs.writeFileSync(childPath, "{}\n", "utf8");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.finalEvidence.artifacts.push({
    id: "fixture-child",
    path: path.relative(rootDir, childPath),
    bytes: fs.statSync(childPath).size,
    sha256: "0".repeat(64),
  });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "child evidence hash drift must fail");
});

check("start provenance allows only the canonical artifact root", () => {
  const workspace = makeFixture("start-provenance-boundary");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.sourceProvenance.allowedArtifactRoot = os.tmpdir();
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0,
    "start provenance with a different allowed artifact root must fail");
});

check("duplicate screenshot files are rejected", () => {
  const workspace = makeFixture("duplicate-screenshot");
  const screenshots = path.join(workspace, "manual-duplicate");
  fs.mkdirSync(screenshots, { recursive: true });
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  fs.writeFileSync(path.join(screenshots, "a.png"), bytes);
  fs.writeFileSync(path.join(screenshots, "b.png"), bytes);
  assert(runIntegrity(workspace, true).status !== 0, "duplicate screenshot files must fail");
});

check("video placeholder artifacts are rejected", () => {
  const workspace = makeFixture("placeholder-video");
  fs.writeFileSync(path.join(workspace, "placeholder.video.txt"), "fixture video placeholder\n", "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "video placeholder must fail");
});

check("failed cleanup and missing source commit are rejected", () => {
  const workspace = makeFixture("cleanup-provenance");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.cleanup.checks[0].status = "FAIL";
  summary.sourceProvenance.commitSha = "";
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "failed cleanup/missing commit must fail");
});

check("current HEAD drift and an unapproved end-state path are rejected", () => {
  const workspace = makeFixture("head-dirty-drift");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.sourceProvenance.commitSha = "0".repeat(40);
  summary.sourceProvenanceEnd = {
    ...summary.sourceProvenance,
    commitSha: "1".repeat(40),
    sourceWorktreeClean: false,
    unapprovedDirtyPaths: ["src/historical-substitution.cpp"],
    allowedArtifactPaths: [],
    allowedArtifactRoot: workspace,
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "HEAD drift/unapproved dirty path must fail");
});

check("canonical command substitution and command-set hash mismatch are rejected", () => {
  const workspace = makeFixture("command-substitution");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.finalAcceptanceCommandSet.find(item => item.id === "ui-exact-424").command =
    ["./server.sh", "verify-ui-fulltest", "legacy-8"].join("-");
  summary.canonicalCommandSetSha256 = "0".repeat(64);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  assert(runIntegrity(workspace, true).status !== 0, "canonical command substitution must fail");
});

check("child summary path outside the acceptance artifact root is rejected", () => {
  const workspace = makeFixture("child-escape");
  const external = path.join(os.tmpdir(), `media-server-v390-external-${process.pid}.json`);
  fs.writeFileSync(external, "{}\n", "utf8");
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  summary.uiAutomation.summaryPath = external;
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const result = runIntegrity(workspace, true);
  fs.rmSync(external, { force: true });
  assert(result.status !== 0, "child summary outside artifact root must fail");
});

check("preserved first failure files are required after a recovered retry", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-final-integrity-recovered-"));
  workspaces.push(workspace);
  const failed = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-fail-stage", "feature-gates",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(failed.status !== 0, "recovered fixture first execution must fail");
  const passed = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-pass",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(passed.status === 0, `recovered fixture retry failed: ${passed.stdout}\n${passed.stderr}`);
  const recovered = runIntegrity(workspace, true);
  assert(recovered.status === 0,
    `recovered fixture integrity must pass with preserved failure files: ${recovered.stdout}\n${recovered.stderr}`);
  fs.rmSync(path.join(workspace, "first-failure.md"), { force: true });
  assert(runIntegrity(workspace, true).status !== 0, "missing first-failure.md must fail integrity verification");
});

const result = await runChecks();
console.log("");
console.log("== v3.9.0 final evidence integrity contract summary ==");
console.log(`- command: ${command}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function makeFixture(label) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-final-integrity-${label}-`));
  workspaces.push(workspace);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "verify-v390-test-acceptance-bundle",
    "--output-dir", workspace,
    "--fixture-pass",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `fixture acceptance failed: ${run.stdout}\n${run.stderr}`);
  return workspace;
}

async function makeCompleteCanonicalFailureFixture() {
  const workspace = fs.realpathSync(makeFixture("complete-canonical-failure-cli"));
  const summaryPath = path.join(workspace, "summary.json");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const canonical = JSON.parse(readText("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const manifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"],
    { cwd: rootDir, encoding: "utf8" }).trim();
  const implementationFiles = Object.fromEntries([
    ["runner", "scripts/internal/run_v390_ui_native_exact_cases.mjs"],
    ["library", "scripts/internal/v390_ui_native_exact_cases_lib.mjs"],
    ["adapter", "scripts/internal/v390_ui_native_adapter.mjs"],
    ["recorder", "scripts/internal/v390_ui_request_event_recorder.mjs"],
    ["evaluator", "scripts/internal/v390_ui_request_lifecycle_evaluator.mjs"],
  ].map(([key, relativePath]) => [key, {
    path: relativePath,
    sha256: createHash("sha256").update(fs.readFileSync(path.join(rootDir, relativePath))).digest("hex"),
  }]));
  const sourceBinding = {
    baselineSourceCommitSha: "327afe0d4b3282400f1925252c59a53b87827224",
    verificationCommitSha: commitSha,
    verificationBranch: branch,
    runnerSchema: "media-server.v390-ui-canonical-parent.v1",
    manifestSha256: createHash("sha256").update(canonicalStableJson(manifest)).digest("hex"),
    buildSha256: summary.uiBuildBinding.buildSha256,
    implementationFiles,
    implementationSha256: createHash("sha256")
      .update(canonicalStableJson(implementationFiles)).digest("hex"),
  };
  const parentRoot = path.join(workspace, "runs", "ui-exact-424");
  const caseOutputRoot = path.join(parentRoot, "cases");
  const cleanupAttestation = primaryFailurePresent => ({
    schema: "media-server.v390-ui-case-cleanup-attestation.v1",
    pass: true,
    primaryFailurePresent,
    primaryFailurePreserved: primaryFailurePresent,
    caseRuntimeRestoreAttempted: true,
    caseRuntimeRestored: true,
    browserCloseAttempted: true,
    browserContextClosed: true,
    cleanupEntryCount: 1,
    failureCode: "",
  });
  const runtimeOwnership = {
    pid: 4242,
    httpPort: 18424,
    rtspPort: 19424,
    runtimeRoot: path.join(workspace, "owned-runtime-removed"),
    runtimeRootSha256: "7".repeat(64),
  };
  const parent = await nativeExactCasesLib.runCanonicalParentOrchestration({
    selectedCases: manifest.cases,
    caseOutputRoot,
    expectedSourceBinding: sourceBinding,
    requireFullCanonical: true,
    expectedCanonicalCount: 424,
    inspectRuntime: async () => ({ status: "PASS", ownership: runtimeOwnership }),
    spawnChild: async context => {
      const failed = context.index === 0;
      const policyInputPath = path.join(context.outputDir, "policy-input.json");
      const policyInput = {
        schema: "media-server.v390-ui-case-policy-input.v1",
        caseId: context.item.caseId,
        runId: context.runId,
        result: {
          caseId: context.item.caseId,
          status: failed ? "FAIL" : "PASS",
          actualBrowserExecution: true,
          manualIntervention: false,
        },
      };
      fs.writeFileSync(policyInputPath, `${JSON.stringify(policyInput, null, 2)}\n`, { mode: 0o600 });
      const policyInputRef = {
        schema: "media-server.v390-ui-case-policy-input-ref.v1",
        caseId: context.item.caseId,
        runId: context.runId,
        path: policyInputPath,
        bytes: fs.statSync(policyInputPath).size,
        sha256: createHash("sha256").update(fs.readFileSync(policyInputPath)).digest("hex"),
      };
      const failureCensus = failed ? [{
        failureClass: "dom-assertion-failure",
        phase: "dom-assertion",
        code: "DOM_ASSERTION_FAILED",
        requestIdentity: `${context.item.caseId}:request-1`,
        responseIdentity: `${context.item.caseId}:response-1`,
      }] : [];
      const child = nativeExactCasesLib.createNativeExactCaseChildSummary({
        item: context.item,
        status: failed ? "FAIL" : "PASS",
        executionStatus: "contract-actual-like-complete-failure",
        sourceBinding,
        failureClass: failed ? "dom-assertion-failure" : "",
        failurePhase: failed ? "dom-assertion" : "",
        failureCode: failed ? "DOM_ASSERTION_FAILED" : "",
        failureMessage: failed ? "exact contract assertion failed" : "",
        failureCensus,
        requestLifecycleEvaluation: failed ? {
          status: "FAIL",
          census: { requestCount: 1, responseCount: 1, failureCount: 1 },
          failures: [{ code: "DOM_ASSERTION_FAILED" }],
        } : null,
        cleanupAttestation: cleanupAttestation(failed),
        actualBrowserExecution: true,
        policyInputRef,
        startedAtMs: 1000 + context.index * 2,
        finishedAtMs: 1001 + context.index * 2,
      });
      fs.writeFileSync(context.summaryPath, `${JSON.stringify(child, null, 2)}\n`, { mode: 0o600 });
      return {
        exitCode: failed ? 1 : 0,
        stderr: "",
        stdout: "",
        summary: child,
        spawnToken: context.spawnToken,
        summaryPath: context.summaryPath,
        outputDir: context.outputDir,
      };
    },
  });
  const parentSummaryPath = path.join(parentRoot, "summary.json");
  fs.writeFileSync(parentSummaryPath, `${JSON.stringify(parent, null, 2)}\n`, { mode: 0o600 });
  const failure = parent.firstFailure;
  summary.result = "FAIL";
  summary.failedStage = "ui-exact-424";
  summary.failedCommand = "run canonical exact 424";
  summary.firstFailure = {
    stage: "ui-exact-424",
    testcaseId: failure.caseId,
    command: "run canonical exact 424",
    context: "canonical case failed",
    error: "canonical case failed",
    exitCode: 1,
    logPath: "",
    stderrTail: [],
    reproductionCommand: "./test_release.sh",
    canonicalFailureBinding: {
      schema: "media-server.v390-canonical-first-failure-binding.v1",
      parentRunId: parent.runBinding.runId,
      failure: structuredClone(failure),
      failureSha256: createHash("sha256").update(canonicalStableJson(failure)).digest("hex"),
    },
  };
  summary.sourceProvenance.commitSha = commitSha;
  summary.sourceProvenance.branch = branch;
  summary.sourceProvenanceEnd = {
    ...summary.sourceProvenanceEnd,
    commitSha,
    branch,
    sourceWorktreeClean: true,
    unapprovedDirtyPaths: [],
  };
  summary.uiAutomation = {
    status: "FAIL",
    summaryPath: parentSummaryPath,
    reportPath: "",
    result: "FAIL",
    coverage: { target: 424, selected: 424, attempted: 424, pass: 423,
      fail: 1, notRun: 0, unsupported: 0, runnerAbort: 0 },
  };
  summary.actualBrowserExecution = true;
  summary.policyV4Evaluation = null;
  summary.finalEvidenceEligible = false;
  summary.automatedAcceptanceStatus = "failed";
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { workspace, summaryPath, summary };
}

function runIntegrity(workspace, allowFixture) {
  const args = [command, "--summary", path.join(workspace, "summary.json")];
  if (allowFixture) args.push("--allow-fixture");
  return spawnSync(path.join(rootDir, "server.sh"), args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function canonicalStableJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalStableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function check(name, fn) { checks.push({ name, fn }); }

async function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      await item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function assert(condition, message) { if (!condition) throw new Error(message); }
