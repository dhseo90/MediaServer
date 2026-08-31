#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance bundle dry-run command와 evidence boundary 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  assertSecretValuesAbsentFromTree,
  discardInheritedAcceptanceSecrets,
  parseListenerPidOutput,
  resolveAcceptanceRoleSecrets,
  secretStrippedProcessEnv,
} from "./v390_acceptance_ui_environment.mjs";
import { createV390UiCaseRuntime } from "./v390_ui_case_runtime.mjs";
import {
  collectSourceProvenanceWithAllowedArtifacts,
  scanArtifactTree,
} from "./evidence_integrity_lib.mjs";
import * as nativeExactCasesLib from "./v390_ui_native_exact_cases_lib.mjs";
import { validatePublicReleaseEvidence } from "./public_release_evidence_lib.mjs";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 test acceptance bundle contract verification

Usage:
  ./server.sh verify-v390-test-acceptance-bundle-contract

Checks:
  - acceptance bundle dry-run command exists
  - canonical actual command owns throwaway server, auth roles, storage-state, browser dependencies, and cleanup
  - external HTTP/PID/log/role-state/port/temp-root injection options are rejected
  - actual-mode fixture executes the fixed stage order
  - current final actual mode treats 120 minutes as AGENTS 7.6.2 conditional and rejects a dirty worktree before build
  - first failure makes later stages not-run while cleanup/report still execute
  - conditional 120-minute and cleanup failure paths are explicit
  - dry-run summary separates local/static, 30-minute, UI automation, 120-minute, published, and release action evidence
  - docs and release evidence record R3 without running long/UI/publish actions
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-test-acceptance-bundle";
const contractCommand = "verify-v390-test-acceptance-bundle-contract";
const script = "verify_v390_test_acceptance_bundle.mjs";
const contractScript = "verify_v390_test_acceptance_bundle_contract.mjs";
const environmentScript = "v390_acceptance_ui_environment.mjs";
const checks = [];
const temporaryOutputDirs = new Set();
process.on("exit", () => {
  for (const outputDir of temporaryOutputDirs) fs.rmSync(outputDir, { recursive: true, force: true });
});

check("acceptance public archive contract is summary and hash based", () => {
  const base = {
    schema: "media-server.public-release-evidence.v1",
    sourceCommit: "1".repeat(40),
    command: "./test_release.sh",
    status: "PASS",
    startedAt: "2026-08-13T22:32:55.946Z",
    finishedAt: "2026-08-14T02:01:33.401Z",
    firstFailure: null,
    counts: { pass: 4, fail: 0, notRun: 0 },
    cleanup: { status: "PASS", rawArtifactsPruned: true },
    policyEvaluation: { status: "PASS", qualifiedCaseCount: 424 },
    artifactHashes: [{
      path: "docs/release-artifacts/v3.9.0/test-acceptance-current-final/report.md",
      bytes: 100,
      sha256: "1".repeat(64),
    }],
  };
  assert(validatePublicReleaseEvidence(base).pass === true,
    "summary-only public archive contract was rejected");
  for (const field of ["firstFailure", "counts", "artifactHashes"]) {
    const candidate = structuredClone(base);
    delete candidate[field];
    assert(validatePublicReleaseEvidence(candidate).pass === false,
      `acceptance public archive without ${field} was accepted`);
  }
});

const files = {
  launcher: readText("test_release.sh"),
  userLauncherCommon: readText("scripts/internal/user_test_launcher_common.sh"),
  bundle: readText("scripts/internal/verify_v390_test_acceptance_bundle.mjs"),
  uiEnvironment: readText("scripts/internal/v390_acceptance_ui_environment.mjs"),
  seedPreparation: readText("scripts/internal/prepare_manual_ui_fulltest_seed.mjs"),
  uiOneShot: readText("scripts/internal/verify_ui_fulltest_one_shot.mjs"),
  caseRuntime: readText("scripts/internal/v390_ui_case_runtime.mjs"),
  exactRunner: readText("scripts/internal/run_v390_ui_native_exact_cases.mjs"),
  policyVerifier: readText("scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs"),
  serverSh: readText("server.sh"),
  buildServer: readText("scripts/internal/build_server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  backlog: readText("docs/development-backlog.md"),
};

check("canonical parent acceptance validator exists before legacy evidence can be consumed", () => {
  assert(typeof nativeExactCasesLib.validateCanonicalParentAcceptanceSummary === "function",
    "canonical parent acceptance validator is missing");
});

check("ordinary canonical parent failure is strictly validated before Policy stays ineligible", () => {
  assert(!files.bundle.includes("if (!failedStage) errors.push(...validateExactUiSummary"),
    "canonical exit 1 still skips strict parent validation");
  assert(files.bundle.includes("validateCanonicalParentAfterChildExit"),
    "acceptance has no explicit strict-validation boundary for canonical child exit 0/1");
  assert(files.bundle.includes("canonicalParentValidation.censusComplete !== true"),
    "complete ordinary failure census is not distinguished from malformed failure evidence");
  const closure = sourceBlock(files.bundle, "function assertFirstFailureClosure(",
    "async function runRealStage(");
  assert(closure.includes('"ui-final-integrity"'),
    "first-failure closure rejects the required failure-specific integrity stage");
});

check("acceptance rescans every post-producer retained artifact before releasing secrets", () => {
  const producerIndex = files.bundle.indexOf("producePolicyV4EvidenceFromCanonicalParent({");
  const postProducerScanIndex = files.bundle.indexOf("assertPostProducerSecretsAbsent", producerIndex);
  const finalizer = sourceBlock(files.bundle, "async function finalizeRetainedArtifactSecretScanner()",
    "function createContractRetainedArtifactSecretScanner(");
  const releaseIndex = finalizer.indexOf("scanner.release()");
  const finalTreeScanIndex = finalizer.indexOf("assertSecretsAbsentFromArtifacts(outputDir)");
  assert(producerIndex >= 0 && postProducerScanIndex > producerIndex &&
    finalTreeScanIndex >= 0 && releaseIndex > finalTreeScanIndex,
    "Policy/raw/evaluation/final artifacts are not rescanned before secret release");
  assert(files.bundle.includes("post-producer-retained-secret-tree-scan"),
    "post-producer scan evidence is not materialized");
});

check("UI final integrity rereads parent bytes and outer-finalizes retained secrets on every path", () => {
  assert(files.bundle.includes("freshUiCanonicalParentValidation"),
    "UI final integrity reuses the initial parent validation instead of rereading disk");
  assert(files.bundle.includes("finalizeRetainedArtifactSecretScanner"),
    "acceptance has no outer retained-secret scan/release boundary");
  const runStart = files.bundle.indexOf("async function runActualBundle()");
  const outerFinalize = files.bundle.indexOf("await finalizeRetainedArtifactSecretScanner()", runStart);
  const finalSummarySelection = files.bundle.indexOf("finalSummary || writeAcceptanceArtifacts()", outerFinalize);
  assert(outerFinalize > runStart && finalSummarySelection > outerFinalize,
    "retained-secret finalization does not own the final acceptance artifact emission");
  const finalizer = sourceBlock(files.bundle, "async function finalizeRetainedArtifactSecretScanner()",
    "function createContractRetainedArtifactSecretScanner(");
  assert(finalizer.includes("assertSecretsAbsentFromArtifacts(outputDir)") &&
    finalizer.includes("writeAcceptanceArtifactsAtomic(summary, reportText)") &&
    finalizer.indexOf("writeAcceptanceArtifactsAtomic(summary, reportText)") < finalizer.indexOf("scanner.release()"),
  "retained-secret finalization does not scan the full output and write exact bytes before release");
  const bootstrapHandleIndex = files.bundle.indexOf(
    "uiEnvironmentHandle = await startSelfContainedUiEnvironment({");
  const scannerIndex = files.bundle.indexOf("createRetainedArtifactSecretScanner()",
    bootstrapHandleIndex);
  const childRunIndex = files.bundle.indexOf("await runSingleCommandStage(stageId", scannerIndex);
  assert(bootstrapHandleIndex >= 0 && scannerIndex > bootstrapHandleIndex &&
    childRunIndex > scannerIndex,
  "retained scanner is not owned immediately after bootstrap and before the exact child");
});

check("UI final integrity reads source files through a defined root-owned helper", () => {
  const finalIntegrity = sourceBlock(files.bundle, "function runUiFinalIntegrityStage()",
    "function freshUiCanonicalParentValidation(");
  assert(finalIntegrity.includes('readRootText("VERSION")') &&
    !finalIntegrity.includes('readText("VERSION")'),
  "UI final integrity still calls an undefined source reader");
  assert(files.bundle.includes("function readRootText(relativePath)") &&
    files.bundle.includes("path.join(rootDir, relativePath)"),
  "acceptance bundle has no defined root-owned source reader");
});

check("canonical parent acceptance is exact-424, census-complete, and fail-closed", () => {
  const canonicalIds = readJson(path.join(rootDir,
    "test/fixtures/ui_fulltest_case_manifest_policy_v4.json")).cases.map(item => item.testId);
  const validate = fixture => nativeExactCasesLib.validateCanonicalParentAcceptanceSummary({
    summary: fixture.summary,
    canonicalCaseIds: canonicalIds,
    artifactRoot: fixture.root,
    summaryPath: path.join(fixture.root, "summary.json"),
    expectedVerificationCommitSha: fixture.source.verificationCommitSha,
    expectedVerificationBranch: fixture.source.verificationBranch,
    expectedManifestSha256: fixture.source.manifestSha256,
    expectedBuildSha256: fixture.source.buildSha256,
  });
  const success = makeCanonicalParentFixture(canonicalIds);
  const successValidation = validate(success);
  assert(successValidation.censusComplete === true && successValidation.eligible === true,
    `valid canonical parent rejected: ${successValidation.reasons.join(",")}`);

  const failure = makeCanonicalParentFixture(canonicalIds, { failedIndices: [0] });
  const failureValidation = validate(failure);
  assert(failureValidation.censusComplete === true && failureValidation.eligible === false,
    "attempted-424 failure batch must retain complete census while remaining ineligible");

  const symlinkAncestor = makeCanonicalParentFixture(canonicalIds);
  const originalFinalizerDir = path.join(symlinkAncestor.root, "suite-finalizer");
  const realFinalizerDir = path.join(symlinkAncestor.root, "real-finalizer");
  fs.renameSync(originalFinalizerDir, realFinalizerDir);
  fs.symlinkSync(realFinalizerDir, originalFinalizerDir);
  assert(validate(symlinkAncestor).eligible === false,
    "symlink ancestor in canonical finalizer reference was accepted");

  const missingFinalizerScan = makeCanonicalParentFixture(canonicalIds);
  const finalizerPath = missingFinalizerScan.summary.suiteFinalizer.summaryPath;
  const finalizerValue = readJson(finalizerPath);
  delete finalizerValue.secretArtifactIntegrity;
  const finalizerSerialized = `${JSON.stringify(finalizerValue, null, 2)}\n`;
  fs.writeFileSync(finalizerPath, finalizerSerialized, { mode: 0o600 });
  missingFinalizerScan.summary.suiteFinalizer.summarySha256 =
    createHash("sha256").update(finalizerSerialized).digest("hex");
  assert(validate(missingFinalizerScan).eligible === false,
    "canonical finalizer without retained-secret scan evidence was accepted");

  const childActualDrift = makeCanonicalParentFixture(canonicalIds);
  const childActualPath = childActualDrift.summary.cases[0].summaryPath;
  const childActualValue = readJson(childActualPath);
  childActualValue.actualBrowserExecution = false;
  const childActualSerialized = `${JSON.stringify(childActualValue, null, 2)}\n`;
  fs.writeFileSync(childActualPath, childActualSerialized, { mode: 0o600 });
  childActualDrift.summary.cases[0].summarySha256 =
    createHash("sha256").update(childActualSerialized).digest("hex");
  assert(validate(childActualDrift).eligible === false,
    "parent row true overrode child actualBrowserExecution=false");

  const policyActualDrift = makeCanonicalParentFixture(canonicalIds);
  const policyRow = policyActualDrift.summary.cases[0];
  const policyPath = policyRow.policyInputRef.path;
  const policyValue = readJson(policyPath);
  policyValue.result.actualBrowserExecution = false;
  const policySerialized = `${JSON.stringify(policyValue, null, 2)}\n`;
  fs.writeFileSync(policyPath, policySerialized, { mode: 0o600 });
  const policyRef = {
    ...policyRow.policyInputRef,
    bytes: Buffer.byteLength(policySerialized),
    sha256: createHash("sha256").update(policySerialized).digest("hex"),
  };
  policyRow.policyInputRef = structuredClone(policyRef);
  const policyChild = readJson(policyRow.summaryPath);
  policyChild.policyInputRef = structuredClone(policyRef);
  const policyChildSerialized = `${JSON.stringify(policyChild, null, 2)}\n`;
  fs.writeFileSync(policyRow.summaryPath, policyChildSerialized, { mode: 0o600 });
  policyRow.summarySha256 = createHash("sha256").update(policyChildSerialized).digest("hex");
  assert(validate(policyActualDrift).eligible === false,
    "parent row true overrode policy-input actualBrowserExecution=false");

  for (const [label, mutate] of [
    ["partial", value => { value.counts.attempted = 423; value.counts.notRun = 1; }],
    ["unsupported", value => { value.counts.unsupported = 1; }],
    ["abort", value => { value.counts.runnerAbort = 1; }],
    ["wrong-type", value => { value.counts.fail = "0"; }],
    ["duplicate", value => { value.cases[1] = structuredClone(value.cases[0]); }],
    ["reordered", value => { [value.cases[0], value.cases[1]] = [value.cases[1], value.cases[0]]; }],
    ["static-substitution", value => { value.schema = "media-server.ui-automation-evidence.v4"; }],
    ["stale-source", value => { value.sourceBinding.verificationCommitSha = "0".repeat(40); }],
    ["missing-run", value => { delete value.runBinding; }],
    ["digest-drift", value => { value.cases[0].summarySha256 = "0".repeat(64); }],
    ["missing-policy-input", value => { value.cases[0].policyInputRef = null; }],
  ]) {
    const fixture = makeCanonicalParentFixture(canonicalIds);
    mutate(fixture.summary);
    assert(validate(fixture).eligible === false, `${label} canonical parent was accepted`);
  }
});

check("source-contract and actual-case failures materialize distinct current first-failure records", () => {
  assert(files.userLauncherCommon.includes('stage: "ui-source-contract"') &&
    files.userLauncherCommon.includes('testcaseId: "verify-v390-ui-native-exact-cases-contract"') &&
    files.userLauncherCommon.includes("priorFirstFailure"),
  "source-contract first-failure lifecycle binding missing");
  assert(files.bundle.includes('summary.failedStage === "ui-exact-424"') &&
    files.bundle.includes('(uiAutomationSummary?.cases || []).find(item => item.status === "FAIL")') &&
    files.bundle.includes("writeCurrentFirstFailure(summary)") &&
    files.bundle.includes("testcaseId: childCaseFailure?.testId") &&
    files.bundle.includes("priorFirstFailure,"),
  "actual exact-case first-failure lifecycle does not replace stale root evidence with current case/run/source");
});

check("acceptance first-failure summary report and root artifact share the suite command", () => {
  for (const [suite, expectedCommand, failureStage] of [
    ["ui", "./test_ui.sh", "ui-exact-424"],
    ["release", "./test_release.sh", "feature-gates"],
  ]) {
    const outputDir = fixtureDir(`reproduction-${suite}`);
    const result = runBundle([
      "--output-dir", outputDir,
      "--suite", suite,
      "--fixture-fail-stage", failureStage,
    ]);
    assert(result.status === 1, `${suite} reproduction fixture must fail once`);
    const summary = readJson(path.join(outputDir, "summary.json"));
    const firstFailure = readJson(path.join(outputDir, "first-failure.json"));
    const report = readTextFile(path.join(outputDir, "report.md"));
    assert(summary.firstFailure?.reproductionCommand === expectedCommand,
      `${suite} summary reproduction command mismatch`);
    assert(firstFailure.firstFailure?.reproductionCommand === expectedCommand &&
      firstFailure.acceptanceCommand === expectedCommand,
    `${suite} root first-failure reproduction command mismatch`);
    assert(report.includes(`reproductionCommand: ${expectedCommand}`),
      `${suite} report reproduction command mismatch`);
  }
  for (const snippet of [
    'ui: "./test_ui.sh"',
    '"server-30": "./test_server_30min.sh"',
    '"server-120": "./test_server_120min.sh"',
    'release: "./test_release.sh"',
  ]) assertIncludes(files.bundle, snippet, "suite reproduction mapping");
});

check("current final actual preflight keeps 120 conditional and requires a clean worktree", () => {
  assert(!files.bundle.includes("current final actual acceptance requires explicit --run-120"),
    "actual preflight still makes conditional 120 mandatory");
  for (const snippet of [
    "current final actual acceptance requires a clean worktree; commit approved changes before running",
    "const sourceProvenance = collectSourceProvenanceWithAllowedArtifacts(rootDir, outputDir)",
    "sourceProvenance.sourceWorktreeClean !== true",
    "AGENTS 7.6.2 conditional 120-minute decision",
    "if (!fixtureMode && longrun30Summary &&",
    "if (!fixtureMode && uiEnvironmentCleanup?.runtimeEvidence === true &&",
  ]) assertIncludes(files.bundle, snippet, "current final preflight contract");
  assert(!files.bundle.includes("longrun30Summary?.cleanup?.verificationSource"),
    "unstarted 30-minute child still creates a false cleanup-source failure");
  assert(!files.bundle.includes("uiEnvironmentCleanup?.verificationSource"),
    "unstarted UI environment still creates a false cleanup-source failure");
  assert(!files.bundle.includes("if (!fixtureMode && uiEnvironmentCleanup &&"),
    "non-runtime UI cleanup still creates a false measured-source failure");
  assert(!files.bundle.includes("const sourceProvenance = collectSourceProvenance(rootDir)"),
    "canonical retry still rejects its preserved first-failure output as source dirtiness");
});

check("Policy source binding excludes only the acceptance-owned artifact root", () => {
  for (const snippet of [
    "worktreePatchSha256: sourceProvenance.sourcePatchSha256",
    "allowedArtifactRoot: path.relative(rootDir, outputDir)",
  ]) assertIncludes(files.bundle, snippet, "acceptance Policy source binding");
  for (const snippet of [
    "collectSourceProvenanceWithAllowedArtifacts",
    "summary.sourceBinding?.allowedArtifactRoot",
    "sourcePatchSha256",
  ]) assertIncludes(files.policyVerifier, snippet, "independent Policy source verification");
});

check("canonical artifact dirtiness is allowed without masking source dirtiness", () => {
  const repository = fixtureDir("canonical-allowed-artifact-boundary");
  fs.mkdirSync(repository, { recursive: true });
  const git = (...args) => execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, GIT_AUTHOR_NAME: "contract", GIT_AUTHOR_EMAIL: "contract@example.invalid",
      GIT_COMMITTER_NAME: "contract", GIT_COMMITTER_EMAIL: "contract@example.invalid" },
  });
  git("init", "-q");
  const canonical = path.join(repository, "docs/release-artifacts/v3.9.0/test-acceptance-current-final");
  fs.mkdirSync(canonical, { recursive: true });
  fs.writeFileSync(path.join(repository, "source.txt"), "clean\n", "utf8");
  fs.writeFileSync(path.join(canonical, "summary.json"), "{\"result\":\"prior\"}\n", "utf8");
  git("add", "source.txt", path.relative(repository, canonical));
  git("commit", "-q", "-m", "fixture");
  fs.writeFileSync(path.join(canonical, "summary.json"), "{}\n", "utf8");
  const allowed = collectSourceProvenanceWithAllowedArtifacts(repository, canonical);
  assert(allowed.worktreeClean === false && allowed.sourceWorktreeClean === true,
    "canonical artifact dirtiness damaged source-clean classification");
  assert(allowed.unapprovedDirtyPaths.length === 0 && allowed.allowedArtifactPaths.length === 1,
    "canonical artifact path ledger mismatch");
  assert(allowed.sourcePatchSha256 === createHash("sha256").update("").digest("hex"),
    "canonical artifact bytes changed the source-only patch digest");
  fs.writeFileSync(path.join(repository, "source.txt"), "dirty\n", "utf8");
  const rejected = collectSourceProvenanceWithAllowedArtifacts(repository, canonical);
  assert(rejected.sourceWorktreeClean === false && rejected.unapprovedDirtyPaths.includes("source.txt"),
    "source dirtiness was hidden by the canonical allowed-artifact root");
  assert(rejected.sourcePatchSha256 !== allowed.sourcePatchSha256,
    "source-only patch digest did not change for a tracked source edit");
});

check("artifact scan distinguishes verifier prose from a real video placeholder", () => {
  const root = fixtureDir("placeholder-prose-boundary");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "final-integrity.log"),
    "[pass] canonical artifacts contain no duplicate screenshots or video placeholders\n", "utf8");
  assert(scanArtifactTree(root).placeholderVideoFiles.length === 0,
    "final-integrity success prose was misclassified as a video placeholder");
  fs.writeFileSync(path.join(root, "placeholder.video.txt"), "fixture video placeholder\n", "utf8");
  assert(scanArtifactTree(root).placeholderVideoFiles.length === 1,
    "real placeholder.video.txt artifact was not rejected");
});

check("canonical source removes legacy 8-case and external summary injection", () => {
  assert(!files.bundle.includes('"verify-v390-ui-automation"'), "canonical bundle still executes legacy 8-case runner");
  assert(!files.bundle.includes("--ui-fulltest-summary"), "canonical bundle still accepts external UI summary injection");
  for (const snippet of [
    "run-v390-ui-native-exact-cases",
    "verify-ui-fulltest-evidence-policy-v4",
    "verify-v390-final-evidence-integrity",
  ]) assertIncludes(files.bundle, snippet, "canonical exact/Policy/final source");
});

check("no-option launcher owns output and conditional 120 authorization", () => {
  const launcherPath = path.join(rootDir, "test_release.sh");
  assert(fs.existsSync(launcherPath), "test_release.sh is missing");
  assert((fs.statSync(launcherPath).mode & 0o111) !== 0, "test_release.sh is not executable");
  assertIncludes(files.launcher, 'media_server_run_user_test "release" "$@"', "release launcher delegation");
  for (const snippet of [
    'if [[ "$#" -ne 0 ]]',
    'unset MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD',
    'unset MEDIA_SERVER_V390_UI_ROLE_SECRETS',
    'export MEDIA_SERVER_SKIP_LOCAL_ENV=1',
    'mktemp -d',
    'source_version="$(tr -d \'[:space:]\' < "${root_dir}/VERSION")"',
    'output_dir="${root_dir}/docs/release-artifacts/${source_tag}/test-acceptance-current-final"',
    'verify-v390-test-acceptance-bundle',
    '--output-dir "${output_dir}"',
    '--auto-run-120',
    'failureStage=',
    'reproductionCommand=',
    'laterNotRun=',
  ]) assertIncludes(files.userLauncherCommon, snippet, "no-option release launcher");
  assert(!files.userLauncherCommon.includes('--run-120'),
    "release launcher unconditionally runs 120 minutes");
  assert(!files.userLauncherCommon.includes('MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD='),
    "launcher embeds or assigns an admin secret");
  assert(!files.userLauncherCommon.includes('MEDIA_SERVER_V390_UI_ROLE_SECRETS='),
    "launcher embeds or assigns a role-secret envelope");
  assertIncludes(files.bundle, '{ id: "actual-bundle", command: "./test_release.sh", status: "user-no-option-actual-execution" }',
    "canonical command set launcher binding");
  for (const snippet of [
    'executionMode === "actual" && outputDir !== canonicalReleaseOutputDir',
    'schema: "media-server.v390-canonical-final-evidence.v1"',
    'temporaryPathFinalEvidenceReferences: []',
    'writeAcceptanceArtifacts()',
  ]) assertIncludes(files.bundle, snippet, "canonical release evidence lifecycle");
  const rejected = spawnSync(launcherPath, ["--output-dir", "/tmp/forbidden"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(rejected.status === 64, "launcher must reject every user option before acceptance starts");
  assert(`${rejected.stdout}\n${rejected.stderr}`.includes("사용법: ./test_release.sh"),
    "launcher option rejection does not show the single supported command");
});

check("canonical actual command owns the complete throwaway UI environment", () => {
  assert(fs.existsSync(path.join(rootDir, "scripts/internal", environmentScript)),
    `missing self-contained UI environment helper: ${environmentScript}`);
  for (const removedOption of [
    "--ui-http-base",
    "--ui-role-state-map",
    "--ui-server-log",
    "--ui-server-pid",
    "--ui-rtsp-port",
    "--ui-temporary-root",
  ]) {
    assert(!files.bundle.includes(removedOption), `canonical bundle still accepts external runtime input: ${removedOption}`);
  }
  for (const snippet of [
    '"ui-environment-bootstrap"',
    "startSelfContainedUiEnvironment",
    "dependency-bootstrap-attestation",
    "all-role-secrets-generated-memory-only",
    "acceptance-crypto-random-generated-memory-only",
    "discardInheritedAcceptanceSecrets(process.env)",
    "delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "role-storage-state-generated-by-acceptance",
    "self-contained-pid-port-artifact-ownership",
  ]) assertIncludes(files.bundle, snippet, "self-contained acceptance source");
  for (const snippet of [
    "JSON.stringify({ roles: secrets, refs: { fixturePassword } })",
    "resolveAcceptanceRoleSecrets()",
    "env: secretStrippedProcessEnv()",
    "delete env[legacyAdminPasswordEnv]",
    "discardInheritedAcceptanceSecrets(process.env)",
    'roleSecretSource: "acceptance-crypto-random-generated-memory-only"',
    '"generated-scanned-and-released"',
    "usersFile: state.usersPath",
    "defaultViewId: state.viewId",
    '"--published-seed-baseline"',
  ]) assertIncludes(files.uiEnvironment, snippet, "self-contained runtime consumer contract");
  for (const snippet of [
    '"published-seed-baseline"',
    'readPublishedSeedBaseline()',
    'path.join(rootDir, "config/docs_ui_assets.json")',
    'assetConfig?.baseline?.publishedRelease',
    'const expectedPublicReleaseStatus = `v${assetSourceVersion}-source-${publishedRelease}-published`',
    'assetConfig?.baseline?.publicReleaseStatus === expectedPublicReleaseStatus',
    'const releaseTargetField = seedTargetSelection.mode === "published-seed-baseline"',
    'seed[releaseTargetField]',
    'latestPublishedBaseline: seed.publishedReleaseTarget',
    'mode: "published-seed-baseline"',
    'policySha256: sha256Text(assetConfigText)',
  ]) assertIncludes(files.seedPreparation, snippet, "published seed baseline contract");
  assert(!files.seedPreparation.includes("expected-release-target"),
    "seed helper must not accept an arbitrary release target override");
  assert((files.uiOneShot.match(/"--published-seed-baseline"/g) || []).length === 2,
    "UI one-shot core/auth seed preparation must select the published baseline explicitly");

  assert(files.bundle.indexOf("discardInheritedAcceptanceSecrets(process.env)") <
    files.bundle.indexOf("collectSourceProvenanceWithAllowedArtifacts(rootDir, outputDir)"),
  "inherited acceptance secrets must leave process.env before source provenance can spawn a child");
  assert(!files.bundle.includes("adminPassword: acceptanceAdminPassword"),
    "bundle still accepts an external admin secret");
  const sourceEnv = {
    SAFE_VALUE: "preserved",
    MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD: "contract-early-consume-admin",
    MEDIA_SERVER_V390_UI_ROLE_SECRETS: "contract-inherited-role-envelope",
  };
  const discarded = discardInheritedAcceptanceSecrets(sourceEnv);
  assert(discarded.status === "PASS" && discarded.discardedVariableCount === 2,
    "inherited secret disposition mismatch");
  assert(!("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD" in sourceEnv),
    "inherited admin secret remained in the source environment");
  assert(!("MEDIA_SERVER_V390_UI_ROLE_SECRETS" in sourceEnv),
    "inherited role-secret envelope remained in the source environment");
  assert(sourceEnv.SAFE_VALUE === "preserved", "secret disposal removed an unrelated value");

  const rejected = runBundle([
    "--output-dir", fixtureDir("external-input-rejected"),
    "--fixture-pass",
    "--ui-http-base", "http://127.0.0.1:1",
  ]);
  assert(rejected.status !== 0, "removed external UI runtime option must be rejected");
  assert(`${rejected.stdout}\n${rejected.stderr}`.includes("unknown option: --ui-http-base"),
    "removed external UI runtime option rejection reason missing");

  const generated = [];
  const resolved = resolveAcceptanceRoleSecrets(username => {
    generated.push(username);
    return `generated-for-${username}`;
  });
  assert(generated.length === 4 && generated.includes("admin") && generated.includes("ui_operator") &&
    generated.includes("ui_viewer") && generated.includes("ui_integrator"),
  "all four acceptance role secrets were not generated internally");
  assert(new Set(Object.values(resolved)).size === 4,
    "generated acceptance role secrets are not unique");
  let duplicateSecretsRejected = false;
  try {
    resolveAcceptanceRoleSecrets(() => "duplicate-generated-value");
  } catch (error) {
    duplicateSecretsRejected = String(error?.message || error).includes("must be unique per role");
  }
  assert(duplicateSecretsRejected, "duplicate role secrets must fail before auth bootstrap");
  assertIncludes(files.buildServer, '"${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" != "1"',
    "build child local-env exclusion");
});

check("published seed baseline is explicit, policy-bound, and rejects mismatched fixtures", () => {
  const outputDir = fixtureDir("published-seed-baseline");
  const fixturePath = path.join(rootDir, "test/fixtures/manual_ui_fulltest_va_seed_matrix.json");
  const defaultResult = spawnSync(path.join(rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed", "--dry-run", "--emit-plan", path.join(outputDir, "current-seed-plan.json"),
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(defaultResult.status === 0, `current-source seed preparation failed: ${defaultResult.stderr}`);
  const currentPlan = readJson(path.join(outputDir, "current-seed-plan.json"));
  assert(currentPlan.releaseTarget === "v4.0.0" &&
    currentPlan.fixtureReleaseTargets?.currentSource === "v4.0.0" &&
    currentPlan.fixtureReleaseTargets?.latestPublishedBaseline === "v3.9.1",
  "default seed preparation is not bound to the current source and published baseline");

  const planPath = path.join(outputDir, "seed-plan.json");
  const registryDir = path.join(outputDir, "registry");
  const publishedResult = spawnSync(path.join(rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed", "--dry-run", "--published-seed-baseline",
    "--emit-plan", planPath, "--emit-registry-dir", registryDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(publishedResult.status === 0, `published seed preparation failed: ${publishedResult.stderr}`);
  const plan = readJson(planPath);
  const policy = readJson(path.join(rootDir, "config/docs_ui_assets.json"));
  const fixture = readJson(fixturePath);
  assert(plan.releaseTarget === fixture.publishedReleaseTarget &&
    plan.releaseTarget === policy.baseline.publishedRelease,
  "published seed plan target is not bound to fixture and policy");
  assert(plan.seedTargetSelection?.mode === "published-seed-baseline" &&
    plan.seedTargetSelection.policyPath === "config/docs_ui_assets.json" &&
    /^[a-f0-9]{64}$/.test(plan.seedTargetSelection.policySha256),
  "published seed plan policy attestation mismatch");
  assert(plan.httpRequests === 0 && plan.boundaries?.notExecutionEvidence === true,
    "published seed dry-run changed its no-request/no-evidence boundary");

  const longFixture = fixture.sources.find(item => item.id === "ui-file-va-tracking-long");
  assert(longFixture?.localPath === "video/imports/va_tracking_event_long_1280x720_30fps_h264.mp4" &&
    longFixture.fixtureSizeBytes === 7284400 &&
    longFixture.fixtureSha256 === "24147fb07bb3a1e1f86bb41d2cce6274a6f39eb75671a299a61ca9852f37a122",
  "published long VA fixture identity is not exact");
  const rejectFixtureIntegrity = (label, mutate, expectedError) => {
    const candidate = JSON.parse(JSON.stringify(fixture));
    const source = candidate.sources.find(item => item.id === "ui-file-va-tracking-long");
    mutate(source);
    const candidatePath = path.join(outputDir, `${label}.json`);
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
    const result = spawnSync(path.join(rootDir, "server.sh"), [
      "prepare-manual-ui-fulltest-seed", "--dry-run", "--published-seed-baseline", "--fixture", candidatePath,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert(result.status !== 0 && result.stderr.includes(expectedError),
      `${label} long VA fixture integrity violation was accepted: ${result.stderr}`);
  };
  rejectFixtureIntegrity("missing-long-fixture", source => {
    source.localPath = "video/imports/missing-va-tracking-event-long.mp4";
  }, "source ui-file-va-tracking-long local file missing");
  rejectFixtureIntegrity("long-fixture-size-drift", source => {
    source.fixtureSizeBytes += 1;
  }, "source ui-file-va-tracking-long fixture size mismatch");
  rejectFixtureIntegrity("long-fixture-sha-drift", source => {
    source.fixtureSha256 = "0".repeat(64);
  }, "source ui-file-va-tracking-long fixture SHA-256 mismatch");

  const mismatchedFixturePath = path.join(outputDir, "mismatched-seed.json");
  fs.writeFileSync(mismatchedFixturePath, `${JSON.stringify({ ...fixture, publishedReleaseTarget: "v3.9.0" }, null, 2)}\n`);
  const mismatchResult = spawnSync(path.join(rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed", "--dry-run", "--published-seed-baseline",
    "--fixture", mismatchedFixturePath,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(mismatchResult.status !== 0 && mismatchResult.stderr.includes("seed fixture must pin v3.9.1"),
    "published seed preparation accepted a current-source fixture outside the published baseline");
});

check("listener ownership parser rejects trailing blank and zero pseudo-PIDs", () => {
  assert(JSON.stringify(parseListenerPidOutput("5200\n")) === JSON.stringify([5200]),
    "trailing lsof newline created a pseudo-PID");
  assert(JSON.stringify(parseListenerPidOutput("5200\r\n5200\n0\ninvalid\n")) === JSON.stringify([5200]),
    "listener parser did not reject duplicate, zero, or invalid PIDs");
  assert(parseListenerPidOutput("\n\r\n").length === 0,
    "blank lsof output created a listener owner");
});

check("acceptance child environments and artifacts exclude retained secrets", () => {
  const stripped = secretStrippedProcessEnv({
    SAFE_VALUE: "preserved",
    MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD: "sentinel-admin",
    MEDIA_SERVER_V390_UI_ROLE_SECRETS: "sentinel-roles",
  });
  assert(stripped.SAFE_VALUE === "preserved", "unrelated child environment value was removed");
  assert(!("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD" in stripped), "admin secret reached a non-exact child");
  assert(!("MEDIA_SERVER_V390_UI_ROLE_SECRETS" in stripped), "role-secret JSON reached a non-exact child");
  for (const [label, block] of [
    ["lsof", sourceBlock(files.uiEnvironment, "export function listListenerPids", "function createState")],
    ["bootstrap browser", sourceBlock(files.uiEnvironment, "async function bootstrapPlaywrightDependency", "function prepareRegistrySeed")],
    ["manual UI seed", sourceBlock(files.uiEnvironment, "function prepareRegistrySeed", "async function startOwnedServerWithBoundedRetry")],
    ["owned server", sourceBlock(files.uiEnvironment, "function spawnOwnedServer", "export function secretStrippedProcessEnv")],
    ["ps", sourceBlock(files.uiEnvironment, "function readCommandIdentity", "function processIsAlive")],
  ]) {
    assert(block.includes("secretStrippedProcessEnv()"), `${label} child is not bound to the stripped environment`);
  }
  assert(files.bundle.includes("delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS"),
    "acceptance stage child environment does not strip inherited role secrets");
  const finalizer = sourceBlock(files.bundle, "async function finalizeRetainedArtifactSecretScanner()",
    "function createContractRetainedArtifactSecretScanner(");
  assert(finalizer.indexOf("assertSecretsAbsentFromArtifacts(outputDir)") <
    finalizer.indexOf("scanner.release()"),
  "exact artifacts are not scanned before the retained scanner is released");

  const artifactRoot = fixtureDir("secret-artifact-scan");
  fs.mkdirSync(artifactRoot, { recursive: true });
  const sentinel = `sentinel value/+${process.pid}`;
  const artifact = path.join(artifactRoot, "summary.json");
  fs.writeFileSync(artifact, JSON.stringify({ value: sentinel }));
  let leakedRejected = false;
  try {
    assertSecretValuesAbsentFromTree(artifactRoot, [sentinel]);
  } catch (error) {
    leakedRejected = String(error?.message || error).includes("generated auth secret persisted to disk");
  }
  assert(leakedRejected, "artifact scan accepted a retained secret literal");
  fs.writeFileSync(artifact, JSON.stringify({ value: encodeURIComponent(sentinel) }));
  let encodedLeakRejected = false;
  try {
    assertSecretValuesAbsentFromTree(artifactRoot, [sentinel]);
  } catch (error) {
    encodedLeakRejected = String(error?.message || error).includes("generated auth secret persisted to disk");
  }
  assert(encodedLeakRejected, "artifact scan accepted a reversibly encoded secret literal");
  fs.writeFileSync(artifact, JSON.stringify({ value: "redacted" }));
  const evidence = assertSecretValuesAbsentFromTree(artifactRoot, [sentinel]);
  assert(evidence.status === "PASS" &&
    evidence.verificationSource === "exact-artifact-byte-scan-before-secret-release",
  "clean artifact scan evidence mismatch");
  assert(files.bundle.includes("exact-and-runtime-artifact-byte-scan-before-secret-release"),
    "exact and throwaway runtime artifact scan evidence is not required by the bundle");

  const caseRuntime = createV390UiCaseRuntime({
    rootDir,
    httpBase: "http://127.0.0.1:1",
    roleSecretsJson: JSON.stringify({ roles: { admin: sentinel }, refs: {} }),
  });
  const generated = caseRuntime.resolveSecretRef("CONTRACT:fixture-password", {
    item: { caseId: "CONTRACT", accountRole: "admin" },
    field: "password",
  });
  fs.writeFileSync(artifact, JSON.stringify({ value: encodeURIComponent(generated) }));
  let childGeneratedRejected = false;
  try {
    caseRuntime.assertSecretsAbsentFromArtifacts(artifactRoot);
  } catch (error) {
    childGeneratedRejected = String(error?.message || error).includes("generated auth secret persisted to disk");
  }
  assert(childGeneratedRejected, "case-runtime scan accepted an encoded child-generated secret");
  fs.writeFileSync(artifact, JSON.stringify({ value: "redacted" }));
  const caseEvidence = caseRuntime.assertSecretsAbsentFromArtifacts(artifactRoot);
  assert(caseEvidence.status === "PASS" &&
    caseEvidence.verificationSource === "case-runtime-exact-and-throwaway-byte-scan-before-secret-release",
  "case-runtime clean artifact evidence mismatch");
  caseRuntime.releaseSecrets();
  for (const snippet of [
    "caseRuntimeSecretArtifactIntegrity",
    "caseRuntime.assertSecretsAbsentFromArtifacts(outputDir)",
    "caseRuntime.releaseSecrets()",
  ]) assertIncludes(files.exactRunner, snippet, "exact runner case-runtime secret boundary");
  assertIncludes(files.bundle, "case-runtime-exact-and-throwaway-byte-scan-before-secret-release",
    "acceptance bundle child-generated secret evidence gate");
});

check("server.sh and script inventory expose R3 acceptance bundle commands", () => {
  for (const name of [script, contractScript]) {
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", name)), `missing script: ${name}`);
    assertIncludes(files.serverSh, name, "server.sh R3 dispatch");
    assertIncludes(files.scriptInventory, name, "script inventory R3");
  }
  for (const name of [command, contractCommand]) {
    assertIncludes(files.serverSh, name, "server.sh R3 command");
  }
});

check("dry-run writes replayable acceptance summary without executing gated suites", () => {
  const outputDir = path.join("/tmp", `media_server_v390_acceptance_contract_${process.pid}`);
  temporaryOutputDirs.add(outputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  execFileSync(path.join(rootDir, "server.sh"), [
    command,
    "--dry-run",
    "--output-dir",
    outputDir,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.schema === "media-server.v390-test-acceptance-bundle.v1", "unexpected summary schema");
  assert(summary.result === "PASS", "dry-run result must be PASS");
  assert(summary.dryRun === true, "summary must mark dryRun=true");
  assert(summary.longrun30?.status === "invalid-existing-evidence", "legacy 30-minute evidence must require final rerun after measured-cleanup policy");
  assert(summary.uiAutomation?.status === "current-not-run", "current UI evidence must remain explicit not-run");
  assert(summary.preservedEvidenceStatus === "historical-evidence-requires-final-rerun", "dry-run preserved evidence boundary mismatch");
  assert(summary.uiAutomation?.summaryPath === "test/fixtures/v390_ui_current_evidence_state.json", "UI current-state path mismatch");
  assert(summary.uiAutomation?.reportPath === "", "not-run current state must not invent a report path");
  assert(summary.uiAutomation?.manualIntervention === false, "UI automation manual intervention must be false");
  assert(summary.uiAutomation?.caseCount === 0, "not-run current state must have zero executed cases");
  assert(summary.uiAutomation?.pass === 0, "not-run current state must have zero pass cases");
  assert(summary.uiAutomation?.fail === 0, "UI automation fail count mismatch");
  assert(summary.uiAutomation?.notRun === 424, "UI automation not-run count mismatch");
  assert(Array.isArray(summary.finalAcceptanceCommandSet), "missing final acceptance command set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "server-longrun-30" && item.status === "executed-by-actual-bundle"), "missing R1 longrun execution in final acceptance set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "ui-exact-424" && item.status === "executed-by-actual-bundle"), "missing exact 424 execution in final acceptance set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "final-integrity" && item.status === "executed-by-actual-bundle"), "missing final integrity execution in final acceptance set");
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "actual-bundle" && item.status === "user-no-option-actual-execution"), "missing no-option actual bundle command in final acceptance set");
  assert(summary.longrun120?.status === "conditional-not-run", "120-minute status mismatch");
  assert(summary.publishedMetadata?.status === "not-run-by-dry-run", "published metadata status mismatch");
  assert(summary.releaseAction?.status === "not-run-by-dry-run", "release action status mismatch");
  assert(summary.evidenceBoundary.includes("dry-run does not execute"), "evidence boundary missing");
  assert(fs.existsSync(path.join(outputDir, "report.md")), "missing report.md");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture executes the fixed stage order and conditional 120 decision", () => {
  const outputDir = fixtureDir("pass");
  const staleScreenshot = path.join(outputDir, "runs", "stale", "screenshots", "duplicate.png");
  const staleVideo = path.join(outputDir, "runs", "stale", "traces", "placeholder.video.txt");
  fs.mkdirSync(path.dirname(staleScreenshot), { recursive: true });
  fs.mkdirSync(path.dirname(staleVideo), { recursive: true });
  fs.writeFileSync(staleScreenshot, "stale duplicate screenshot\n", "utf8");
  fs.writeFileSync(staleVideo, "fixture video placeholder\n", "utf8");
  const result = runBundle(["--output-dir", outputDir, "--fixture-pass"]);
  assert(result.status === 0, `fixture pass command failed: ${result.stderr}`);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.executionMode === "actual-fixture", "fixture executionMode mismatch");
  assert(summary.dryRun === false, "fixture must not be dry-run");
  assert(summary.result === "PASS", "fixture pass result mismatch");
  assert(summary.stopOnFirstFail === true, "fixture stopOnFirstFail missing");
  assert(JSON.stringify(summary.stageOrder) === JSON.stringify([
    "preflight", "build", "feature-gates", "server-longrun-30", "ui-environment-bootstrap", "ui-exact-424", "ui-server-cleanup",
    "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120", "cleanup", "ui-final-integrity", "report", "final-integrity",
  ]), "fixture stage order mismatch");
  assert(summary.uiEnvironment?.schema === "media-server.v390-acceptance-ui-environment.v1",
    "self-contained UI environment schema missing");
  assert(summary.uiEnvironment?.ownership?.serverStartedByAcceptance === true,
    "acceptance must own the UI server process");
  assert(summary.uiEnvironment?.ownership?.portsAllocatedByAcceptance === true,
    "acceptance must own HTTP/RTSP port allocation");
  assert(summary.uiEnvironment?.ownership?.rolesSeededByAcceptance === true,
    "acceptance must seed auth roles");
  assert(summary.uiEnvironment?.ownership?.storageStatesGeneratedByAcceptance === true,
    "acceptance must generate role storage-state files");
  assert(summary.uiEnvironment?.runtimeDescriptor?.auth?.usersFile,
    "runtime descriptor auth usersFile missing");
  assert(summary.uiEnvironment?.runtimeDescriptor?.auth?.defaultViewId === "9001",
    "runtime descriptor auth defaultViewId mismatch");
  assert(summary.uiTemporaryRoot === summary.uiEnvironment?.runtimeDescriptor?.temporaryRoot &&
    Boolean(summary.uiTemporaryRoot),
  "acceptance temporary-root binding did not use the authoritative runtime descriptor");
  const bootstrapStage = summary.stages.find(item => item.id === "ui-environment-bootstrap");
  assert(bootstrapStage?.summaryPath && fs.existsSync(bootstrapStage.summaryPath) &&
    path.resolve(bootstrapStage.summaryPath).startsWith(`${path.resolve(summary.runDir)}${path.sep}`),
  "bootstrap stage evidence was not preserved inside the acceptance run directory");
  assert(summary.executedCommands.every(item => item.stage && item.id && item.status && item.command),
    "acceptance executed-command ledger contains a commandless attestation row");
  assert(summary.uiEnvironment?.dependency?.status === "dependency-bootstrap-attestation",
    "browser dependency bootstrap attestation missing");
  assert(summary.uiEnvironment?.secretHandling === "all-role-secrets-generated-memory-only",
    "all generated role secrets must remain memory-only");
  assert(summary.uiEnvironment?.roleSecretSource === "acceptance-crypto-random-generated-memory-only",
    "throwaway role secret source must be the acceptance generator");
  assert(summary.uiEnvironment?.roleSecretLifecycle === "fixture-not-generated",
    "fixture must not claim actual role secret generation");
  assert(summary.uiBuildBinding?.fixtureMode === true &&
    summary.uiBuildBinding?.bindingKind === "tracked-fixture-fingerprint" &&
    summary.uiBuildBinding?.buildPath ===
      path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json"),
  "fixture build binding must use only the tracked native-case manifest");
  assert(!JSON.stringify(summary).includes("fixture-password-value"),
    "acceptance summary serialized a fixture password");
  assert(summary.stages.find(item => item.id === "ui-fulltest-qualification")?.status === "PASS",
    "fixture orchestration qualification phase must execute as a contract phase");
  assert(summary.automatedAcceptanceStatus === "executed-with-known-ui-closure-blockers",
    "fixture execution must not become automated acceptance eligible");
  assert(summary.finalEvidenceEligible === false, "fixture execution must not become final evidence eligible");
  assert(summary.uiFulltestQualification?.uiFulltestPass === false,
    "fixture orchestration must not claim Policy v4 UI fulltest PASS");
  assert(summary.stages.find(item => item.id === "server-longrun-120")?.status === "not-run", "120 stage must be not-run without trigger");
  assert(summary.longrun120?.decision?.policyDecision === "미진행", "120 policy decision mismatch");
  assert(summary.longrun120?.decision?.executionDecision === "not-required", "120 execution decision mismatch");
  assert(summary.cleanup?.status === "PASS", "fixture cleanup must pass");
  assert(summary.cleanup?.verificationSource === "child-summary-and-filesystem", "cleanup must record its verification source");
  assert(Array.isArray(summary.cleanup?.checks) && summary.cleanup.checks.length > 0, "cleanup must contain measured checks");
  assert(files.bundle.includes("throwaway-port-") && files.bundle.includes("listListenerPids"),
    "RTSP cleanup measurement must remain wired in the actual bundle");
  assert(summary.outputPreparation?.replacedExisting === true, "existing canonical output must be replaced");
  assert(summary.outputPreparation?.removedScreenshotFiles === 1, "stale screenshot removal count mismatch");
  assert(summary.outputPreparation?.removedPlaceholderVideoFiles === 1, "stale placeholder video removal count mismatch");
  assert(summary.sourceProvenance?.commitSha?.match(/^[a-f0-9]{40}$/), "source commit SHA missing");
  assert(Boolean(summary.sourceProvenance?.branch), "source branch missing");
  assert(Array.isArray(summary.executedCommands) && summary.executedCommands.length > 0, "executed command ledger missing");
  assert(summary.firstFailure === null, "passing fixture must record firstFailure=null");
  assert(summary.publishedMetadata?.status === "not-run-by-this-command", "published metadata boundary mismatch");
  assert(summary.releaseAction?.status === "not-run-by-this-command", "release action boundary mismatch");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture stops on first failure and still runs cleanup/report", () => {
  const runActualStart = files.bundle.indexOf("const summary = await runActualBundle()");
  const firstFailureClosure = files.bundle.indexOf("assertFirstFailureClosure(stages, failedStage)");
  const nonZeroExit = files.bundle.indexOf('if (summary.result !== "PASS") process.exitCode = 1');
  assert(runActualStart >= 0 && firstFailureClosure > runActualStart && nonZeroExit > firstFailureClosure,
    "first-failure closure must run before the non-zero process result is assigned");
  assert(!files.bundle.slice(runActualStart, firstFailureClosure).includes("process.exit(1)"),
    "actual bundle exits before first-failure closure validation");

  const outputDir = fixtureDir("first-fail");
  const result = runBundle(["--output-dir", outputDir, "--fixture-fail-stage", "feature-gates"]);
  assert(result.status !== 0, "failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.result === "FAIL", "failure fixture summary must fail");
  assert(summary.failedStage === "feature-gates", "failedStage mismatch");
  assert(summary.firstFailure?.stage === "feature-gates", "firstFailure stage mismatch");
  assert(summary.firstFailure?.command === "fixture fail feature-gates", "firstFailure command mismatch");
  assert(summary.firstFailure?.context?.includes("fixture failure at feature-gates"), "firstFailure context missing");
  for (const id of ["server-longrun-30", "ui-environment-bootstrap", "ui-exact-424", "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120", "ui-final-integrity"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must be not-run after failure`);
  }
  assert(summary.stages.find(item => item.id === "final-integrity")?.status === "FAIL",
    "release final-integrity must run after an incomplete primary failure and fail closed");
  assert(summary.failedStage === "feature-gates",
    "later release final-integrity failure replaced the earliest primary failure");
  assert(summary.stages.find(item => item.id === "cleanup")?.status === "PASS", "cleanup must run after failure");
  assert(summary.stages.find(item => item.id === "report")?.status === "PASS", "report must run after failure");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("acceptance report normalization cannot rewrite nested attested evidence", () => {
  const block = sourceBlock(files.bundle, "function normalizeTextArtifacts(targetDir)", "function readJson(filePath)");
  assert(block.includes("if (entry.isDirectory()) continue"),
    "nested acceptance evidence is not protected from text normalization");
  assert(!block.includes("normalizeTextArtifacts(entryPath)"),
    "acceptance text normalization still recurses into attested evidence");
});

for (const target of ["ui-final-integrity", "evaluation", "report", "first-failure", "post-producer", "child-artifact"]) {
  check(`final acceptance drops retained secret from ${target}`, () => {
    const outputDir = fixtureDir(`retained-secret-${target}`);
    const args = ["--output-dir", outputDir, "--suite", "ui",
      "--contract-retained-secret-final-artifact", target];
    if (target === "first-failure") args.push("--fixture-fail-stage", "ui-exact-424");
    else args.push("--fixture-pass");
    const result = runBundle(args);
    assert(result.status !== 0, `${target} retained-secret fixture returned success`);
    const summary = readJson(path.join(outputDir, "summary.json"));
    assert(summary.result === "FAIL" &&
      summary.uiRetainedArtifactSecretIntegrity?.status === "FAIL",
    `${target} retained-secret fixture did not fail closed`);
    const canary = "round3-acceptance-final-secret-canary";
    for (const filePath of listRegularFiles(outputDir)) {
      assert(!fs.readFileSync(filePath).includes(canary),
        `${target} retained canary in ${filePath}`);
    }
    if (target === "post-producer") {
      assert(!fs.existsSync(path.join(outputDir, "runs", summary.runId,
        "ui-exact-424", "policy-v4-summary.json")),
      "post-producer retained-secret artifact was not removed");
    }
    if (target === "child-artifact") {
      assert(!fs.existsSync(path.join(outputDir, "runs", summary.runId,
        "ui-exact-424", "retained-secret-child.txt")),
      "pre-producer child retained-secret artifact was not removed");
      assert(summary.failedStage === "ui-exact-424" &&
        summary.uiRetainedArtifactSecretIntegrity?.status === "FAIL",
      "pre-producer child scan did not retain safe fail-closed evidence");
    }
  });
}

check("standalone UI suite builds the current source before bootstrap and binds the binary", () => {
  const outputDir = fixtureDir("ui-current-source-build");
  const result = runBundle(["--output-dir", outputDir, "--suite", "ui", "--fixture-pass"]);
  assert(result.status === 0, `UI build fixture must pass: ${result.stderr}`);
  const summary = readJson(path.join(outputDir, "summary.json"));
  const selected = ["preflight", "build", "ui-environment-bootstrap", "ui-exact-424", "ui-server-cleanup", "ui-fulltest-qualification", "cleanup", "ui-final-integrity", "report"];
  for (const id of selected) {
    assert(summary.stages.find(item => item.id === id)?.status === "PASS", `${id} must execute in the UI suite`);
  }
  assert(summary.stages.find(item => item.id === "ui-final-integrity")?.status === "PASS",
    "standalone UI suite must materialize dedicated final integrity PASS");
  for (const id of ["feature-gates", "server-longrun-30", "longrun-120-decision", "server-longrun-120", "final-integrity"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must remain outside the UI suite`);
  }
  const buildStage = summary.stages.find(item => item.id === "build");
  assert(buildStage?.details?.uiBuildBinding?.sourceCommitSha === summary.sourceProvenance?.commitSha,
    "UI build binding did not retain the current source commit");
  assert(buildStage.details.uiBuildBinding?.sourceWorktreeStatusSha256 === summary.sourceProvenance?.worktreeStatusSha256,
    "UI build binding did not retain the current source worktree fingerprint");
  assert(buildStage.details.uiBuildBinding?.buildSha256?.match(/^[a-f0-9]{64}$/),
    "UI build binding did not retain the built binary hash");
  assert(buildStage.details.uiBuildBinding?.bindingKind ===
    "tracked-fixture-fingerprint",
  "UI fixture build binding did not remain independent of untracked build output");
  assert(summary.uiBuildBinding?.buildSha256 === buildStage.details.uiBuildBinding.buildSha256,
    "acceptance summary does not retain the build-stage binding");
  assert(summary.uiEnvironment?.uiBuildBinding?.buildSha256 === buildStage.details.uiBuildBinding.buildSha256,
    "UI environment was not bound to the completed build");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("standalone UI build failure stops bootstrap, exact cases, and qualification", () => {
  const outputDir = fixtureDir("ui-build-first-failure");
  const result = runBundle(["--output-dir", outputDir, "--suite", "ui", "--fixture-fail-stage", "build"]);
  assert(result.status !== 0, "UI build failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.failedStage === "build", "UI build failure must remain the first failure");
  assert(summary.stages.find(item => item.id === "build")?.status === "FAIL", "UI build must be FAIL");
  for (const id of ["ui-environment-bootstrap", "ui-exact-424", "ui-fulltest-qualification"]) {
    const stage = summary.stages.find(item => item.id === id);
    assert(stage?.status === "not-run" && stage.reason === "not run after build failure",
      `${id} must be not-run after a UI build failure`);
  }
  assert(summary.stages.find(item => item.id === "cleanup")?.status === "PASS",
    "UI build failure must still materialize cleanup");
  assert(summary.stages.find(item => item.id === "report")?.status === "PASS",
    "UI build failure must still materialize a report");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("code-comments is the first and unique feature gate, with a fail-closed user-facing failure record", () => {
  const featureBlock = sourceBlock(files.bundle, "function buildFeatureCommands()", "function buildFinalAcceptanceCommandSet()");
  const codeComments = '"verify-code-comments"';
  assert((featureBlock.match(/"verify-code-comments"/g) || []).length === 1,
    "code-comments must occur exactly once in feature commands");
  assert(featureBlock.indexOf(codeComments) < featureBlock.indexOf('"verify-v390-stabilization-release-readiness"'),
    "code-comments must be the first static feature gate");
  assert(files.bundle.indexOf("runCommandListStage(stageId, featureCommands)") <
    files.bundle.indexOf('if (stageId === "server-longrun-30")'),
  "feature-gates must precede server-longrun-30");

  for (const [label, mutated] of [
    ["omitted", featureBlock.replace(codeComments, "")],
    ["duplicated", featureBlock.replace(codeComments, `${codeComments},\n    ${codeComments}`)],
    ["after-longrun", featureBlock.replace(codeComments, "").replace('"verify-v390-stabilization-release-readiness",', '"verify-v390-stabilization-release-readiness",\n    "verify-code-comments",')],
  ]) {
    let rejected = false;
    try { assertCanonicalCodeCommentsFeatureGate(mutated); } catch { rejected = true; }
    assert(rejected, `negative ${label} code-comments feature fixture was accepted`);
  }

  const outputDir = fixtureDir("code-comments-first-failure");
  const result = runBundle(["--output-dir", outputDir, "--fixture-fail-feature-command", "code-comments"]);
  assert(result.status !== 0, "code-comments failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.failedStage === "feature-gates", "code-comments fixture failed at an unexpected stage");
  assert(summary.firstFailure?.testcaseId === "code-comments", "firstFailure testcaseId must be code-comments");
  assert(summary.firstFailure?.reproductionCommand === "./test_release.sh", "failure reproduction must use the user command");
  assert(summary.stages.find(item => item.id === "feature-gates")?.checks?.find(item => item.status === "FAIL")?.id === "code-comments",
    "failed feature check ID must be code-comments");
  for (const id of ["server-longrun-30", "ui-environment-bootstrap", "ui-exact-424", "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must be not-run after code-comments failure`);
  }
  assert(summary.stages.find(item => item.id === "final-integrity")?.status === "FAIL",
    "final-integrity must fail closed after incomplete code-comments failure evidence");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("native exact manifest contract is a unique 36th-set early feature gate", () => {
  assertCanonicalNativeManifestFeatureGate(files.bundle);
  const featureBlock = sourceBlock(files.bundle, "function buildFeatureCommands()", "function buildFinalAcceptanceCommandSet()");
  const commandLiteral = '"verify-v390-ui-native-exact-cases-contract"';
  for (const [label, mutated] of [
    ["omitted", files.bundle.replace(commandLiteral, "")],
    ["duplicated", files.bundle.replace(commandLiteral, `${commandLiteral},\n    ${commandLiteral}`)],
    ["after-longrun", files.bundle.replace(commandLiteral, "").replace(
      "function buildFinalAcceptanceCommandSet() {",
      `const misplacedNativeManifestGate = ${commandLiteral};\n\nfunction buildFinalAcceptanceCommandSet() {`,
    )],
  ]) {
    let rejected = false;
    try { assertCanonicalNativeManifestFeatureGate(mutated); } catch { rejected = true; }
    assert(rejected, `negative ${label} native manifest feature fixture was accepted`);
  }
  const names = [...featureBlock.matchAll(/^\s+"([^"]+)",$/gm)].map(match => match[1]);
  assert(names.length === 35 && names.includes("verify-v390-ui-native-exact-cases-contract"),
    `server feature command count drift: ${names.length}`);

  const outputDir = fixtureDir("native-manifest-contract-first-failure");
  const result = runBundle(["--output-dir", outputDir, "--fixture-fail-feature-command", "v390-ui-native-exact-cases-contract"]);
  assert(result.status !== 0, "native manifest contract failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  const featureStage = summary.stages.find(item => item.id === "feature-gates");
  assert(featureStage?.command === "36 current feature commands" && featureStage?.checks?.length === 36,
    "current acceptance feature gate count must be 36");
  assert(summary.failedStage === "feature-gates", "native manifest drift must fail in feature-gates");
  assert(summary.firstFailure?.testcaseId === "v390-ui-native-exact-cases-contract",
    "native manifest drift failed check ID mismatch");
  assert(summary.firstFailure?.reproductionCommand === "./test_release.sh",
    "native manifest drift reproduction must use the user launcher");
  for (const id of ["server-longrun-30", "ui-environment-bootstrap", "ui-exact-424", "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run",
      `${id} must be not-run after native manifest feature-gate failure`);
  }
  assert(summary.stages.find(item => item.id === "final-integrity")?.status === "FAIL",
    "final-integrity must fail closed after incomplete native manifest evidence");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("rerun preserves the earliest first failure after canonical output replacement", () => {
  const outputDir = fixtureDir("preserved-first-fail");
  const failed = runBundle(["--output-dir", outputDir, "--fixture-fail-stage", "feature-gates"]);
  assert(failed.status !== 0, "first fixture run must fail");

  const legacyFailurePath = path.join(outputDir, "first-failure.json");
  const legacyFailure = readJson(legacyFailurePath);
  delete legacyFailure.runId;
  delete legacyFailure.invocationId;
  legacyFailure.firstFailure.testcaseId = "";
  legacyFailure.childFailure = null;
  legacyFailure.cleanup.child = null;
  fs.writeFileSync(legacyFailurePath, `${JSON.stringify(legacyFailure, null, 2)}\n`, "utf8");

  const passed = runBundle(["--output-dir", outputDir, "--fixture-pass"]);
  assert(passed.status === 0, `retry fixture must pass: ${passed.stderr}`);
  const summary = readJson(path.join(outputDir, "summary.json"));
  const firstFailurePath = path.join(outputDir, "first-failure.json");
  const firstFailureReportPath = path.join(outputDir, "first-failure.md");
  assert(summary.result === "PASS", "retry summary must pass");
  assert(summary.firstFailure === null, "retry execution must not claim a current failure");
  assert(summary.priorFirstFailure?.failedStage === "feature-gates", "earliest failure stage was not preserved");
  assert(summary.priorFirstFailure?.firstFailure?.command === "fixture fail feature-gates", "earliest failure command was not preserved");
  assert(summary.outputPreparation?.previousFailurePreserved === true, "output preparation must record preserved failure evidence");
  assert(fs.existsSync(firstFailurePath), "first-failure.json must survive the retry");
  assert(fs.existsSync(firstFailureReportPath), "first-failure.md must survive the retry");
  const preserved = readJson(firstFailurePath);
  assert(preserved.schema === "media-server.v390-acceptance-first-failure.v1", "preserved failure schema mismatch");
  assert(preserved.failedStage === "feature-gates", "preserved failure stage mismatch");
  assert(preserved.firstFailure?.context?.includes("fixture failure at feature-gates"), "preserved failure context missing");
  const preservedReport = readTextFile(firstFailureReportPath);
  assert(preservedReport.includes("fixture fail feature-gates"), "preserved failure report command missing");
  assert(!preservedReport.split(/\r?\n/).some(line => /[ \t]+$/.test(line)),
    "preserved legacy failure report contains trailing whitespace");
  assert(preservedReport.includes("runId: not-recorded") && preservedReport.includes("testcaseId: not-recorded"),
    "preserved legacy failure report does not render missing metadata explicitly");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("actual-mode fixture runs explicit 120 and rejects cleanup failure", () => {
  const run120Dir = fixtureDir("run-120");
  const run120 = runBundle(["--output-dir", run120Dir, "--fixture-pass", "--fixture-120-trigger", "--run-120"]);
  assert(run120.status === 0, "run-120 fixture must pass");
  const run120Summary = readJson(path.join(run120Dir, "summary.json"));
  assert(run120Summary.longrun120?.decision?.policyDecision === "조건부 진행", "run-120 policy decision mismatch");
  assert(run120Summary.longrun120?.decision?.executionDecision === "run", "run-120 execution decision mismatch");
  assert(run120Summary.stages.find(item => item.id === "server-longrun-120")?.status === "PASS", "run-120 stage must pass");
  fs.rmSync(run120Dir, { recursive: true, force: true });

  const flagOnlyDir = fixtureDir("run-120-flag-only");
  const flagOnly = runBundle(["--output-dir", flagOnlyDir, "--fixture-pass", "--run-120"]);
  assert(flagOnly.status !== 0, "run flag without an AGENTS 7.6.2 trigger must fail");
  const flagOnlySummary = readJson(path.join(flagOnlyDir, "summary.json"));
  assert(flagOnlySummary.longrun120?.decision?.executionDecision === "invalid-run-without-trigger",
    "run flag invented a 120-minute trigger");
  assert(flagOnlySummary.stages.find(item => item.id === "server-longrun-120")?.status === "not-run",
    "invalid run flag must not execute the 120-minute stage");
  fs.rmSync(flagOnlyDir, { recursive: true, force: true });

  const cleanupDir = fixtureDir("cleanup-fail");
  const cleanup = runBundle(["--output-dir", cleanupDir, "--fixture-pass", "--fixture-cleanup-fail"]);
  assert(cleanup.status !== 0, "cleanup failure fixture must return non-zero");
  const cleanupSummary = readJson(path.join(cleanupDir, "summary.json"));
  assert(cleanupSummary.result === "FAIL", "cleanup failure summary must fail");
  assert(cleanupSummary.cleanup?.status === "FAIL", "cleanup failure must be explicit");
  fs.rmSync(cleanupDir, { recursive: true, force: true });
});

check("docs and release evidence record R3 without overclaiming gated tests", () => {
  for (const snippet of [
    "v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle",
    command,
    contractCommand,
    "media-server.v390-test-acceptance-bundle.v1",
    "dry-run does not execute",
    "finalAcceptanceCommandSet",
    "historical-evidence-requires-final-rerun",
  ]) {
    assertIncludes(files.streamVerification + "\n" + files.projectInventory, snippet, "R3 stream/project docs");
  }
  for (const snippet of [
    "v390 R3 RED test acceptance bundle contract",
    "v390 R3 test acceptance bundle dry-run historical",
    "v390 R3 actual acceptance bundle",
    "invalid-existing-evidence",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "R3 release records");
  }
  for (const snippet of [
    "v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle",
    command,
    contractCommand,
    "current feature, R1, R2 commands",
    "UI 풀테스트 직접 조작 PASS",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "R3 release evidence");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 test acceptance bundle contract summary ==");
console.log("- schema: media-server.v390-test-acceptance-bundle.v1");
console.log(`- command: ${command}`);
console.log(`- contractCommand: ${contractCommand}`);
console.log("- actualAcceptanceBundle: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fixtureDir(label) {
  const outputDir = path.join("/tmp", `media_server_v390_acceptance_contract_${label}_${process.pid}`);
  temporaryOutputDirs.add(outputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  return outputDir;
}

function sourceBlock(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0 && endIndex > startIndex, `source block missing: ${start}`);
  return source.slice(startIndex, endIndex);
}

function assertCanonicalCodeCommentsFeatureGate(featureBlock) {
  const names = [...featureBlock.matchAll(/^\s+"([^"]+)",$/gm)].map(match => match[1]);
  const codeCommentsIndexes = names.map((name, index) => name === "verify-code-comments" ? index : -1).filter(index => index >= 0);
  assert(codeCommentsIndexes.length === 1, "code-comments must be registered exactly once");
  assert(codeCommentsIndexes[0] === 0, "code-comments must be the first static feature command");
}

function assertCanonicalNativeManifestFeatureGate(bundleSource) {
  const featureBlock = sourceBlock(bundleSource, "function buildFeatureCommands()", "function buildFinalAcceptanceCommandSet()");
  const names = [...featureBlock.matchAll(/^\s+"([^"]+)",$/gm)].map(match => match[1]);
  const indexes = names.map((name, index) => name === "verify-v390-ui-native-exact-cases-contract" ? index : -1)
    .filter(index => index >= 0);
  assert(indexes.length === 1, "native manifest contract must be registered exactly once");
  assert(indexes[0] < names.length, "native manifest contract must remain in the feature command list");
  assert(bundleSource.indexOf("runCommandListStage(stageId, featureCommands)") <
    bundleSource.indexOf('if (stageId === "server-longrun-30")'),
  "native manifest contract must execute before server-longrun-30");
}

function runBundle(args) {
  return spawnSync(path.join(rootDir, "server.sh"), [command, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function makeCanonicalParentFixture(canonicalIds, { failedIndices = [] } = {}) {
  const root = fixtureDir("canonical-parent-acceptance");
  const casesRoot = path.join(root, "cases");
  fs.mkdirSync(casesRoot, { recursive: true });
  const implementationFiles = {
    runner: { path: "scripts/internal/run_v390_ui_native_exact_cases.mjs", sha256: "1".repeat(64) },
    library: { path: "scripts/internal/v390_ui_native_exact_cases_lib.mjs", sha256: "2".repeat(64) },
    adapter: { path: "scripts/internal/v390_ui_native_adapter.mjs", sha256: "3".repeat(64) },
    recorder: { path: "scripts/internal/v390_ui_request_event_recorder.mjs", sha256: "4".repeat(64) },
    evaluator: { path: "scripts/internal/v390_ui_request_lifecycle_evaluator.mjs", sha256: "5".repeat(64) },
  };
  const source = {
    baselineSourceCommitSha: "327afe0d4b3282400f1925252c59a53b87827224",
    verificationCommitSha: "6".repeat(40),
    verificationBranch: "v3.9.0-verification-rebase",
    runnerSchema: "media-server.v390-ui-canonical-parent.v1",
    manifestSha256: "7".repeat(64),
    buildSha256: "8".repeat(64),
    implementationFiles,
    implementationSha256: createHash("sha256").update(stableCanonicalJson(implementationFiles)).digest("hex"),
  };
  const runId = `contract-${path.basename(root)}`;
  const failed = new Set(failedIndices);
  const cases = canonicalIds.map((caseId, index) => {
    const status = failed.has(index) ? "FAIL" : "PASS";
    const directory = path.join(casesRoot, `${String(index + 1).padStart(3, "0")}-${caseId}`);
    const summaryPath = path.join(directory, "summary.json");
    fs.mkdirSync(directory, { recursive: true });
    const policyInputPath = path.join(directory, "policy-input.json");
    const policyInput = { schema: "media-server.v390-ui-case-policy-input.v1", caseId, runId,
      result: { caseId, featureId: `FEATURE-${index + 1}`, status, actualBrowserExecution: true,
        manualIntervention: false } };
    const serializedPolicyInput = `${JSON.stringify(policyInput, null, 2)}\n`;
    fs.writeFileSync(policyInputPath, serializedPolicyInput, { mode: 0o600 });
    const policyInputRef = { schema: "media-server.v390-ui-case-policy-input-ref.v1", caseId, runId,
      path: policyInputPath, bytes: Buffer.byteLength(serializedPolicyInput),
      sha256: createHash("sha256").update(serializedPolicyInput).digest("hex") };
    const child = {
      schema: "media-server.v390-ui-case-child.v1",
      result: status,
      executionStatus: "case-child-browser-evidence",
      releaseEvidenceEligible: false,
      policyV4Qualification: "not-eligible-single-case-child",
      uiFulltestPass: false,
      actualBrowserExecution: true,
      sourceBinding: structuredClone(source),
      policyInputRef: structuredClone(policyInputRef),
      selection: { caseId, selectedIds: [caseId], selected: 1 },
      counts: { selected: 1, attempted: 1, pass: status === "PASS" ? 1 : 0,
        fail: status === "FAIL" ? 1 : 0, notRun: 0, unsupported: 0, runnerAbort: 0 },
      case: {
        caseId,
        featureId: `FEATURE-${index + 1}`,
        status,
        failureClass: status === "FAIL" ? "contract-failure" : "",
        failurePhase: status === "FAIL" ? "case-execution" : "",
        failureCode: status === "FAIL" ? "CONTRACT_FAILURE" : "",
        failureMessage: status === "FAIL" ? "contract failure" : "",
        failureCensus: status === "FAIL" ? [{ failureClass: "contract-failure", phase: "case-execution",
          code: "CONTRACT_FAILURE", message: "contract failure", requestIdentity: "", responseIdentity: "" }] : [],
        requestLifecycleEvaluation: null,
        cleanupAttestation: { schema: "media-server.v390-ui-case-cleanup-attestation.v1", pass: true,
          primaryFailurePresent: status === "FAIL", primaryFailurePreserved: status === "FAIL",
          caseRuntimeRestoreAttempted: true, caseRuntimeRestored: true, browserCloseAttempted: true,
          browserContextClosed: true, cleanupEntryCount: 1, failureCode: "" },
      },
      timing: { startedAtMs: index, finishedAtMs: index + 1, durationMs: 1,
        startedAt: new Date(index).toISOString(), finishedAt: new Date(index + 1).toISOString() },
    };
    const serialized = `${JSON.stringify(child, null, 2)}\n`;
    fs.writeFileSync(summaryPath, serialized, { mode: 0o600 });
    return { caseId, featureId: child.case.featureId, status, actualBrowserExecution: true,
      runId, childExitCode: status === "PASS" ? 0 : 1, summaryPath,
      summarySha256: createHash("sha256").update(serialized).digest("hex"),
      policyInputRef: structuredClone(policyInputRef),
      cleanupAttestation: structuredClone(child.case.cleanupAttestation) };
  });
  const failureCensus = cases.filter(item => item.status === "FAIL").map(item => ({
    caseId: item.caseId, failureClass: "contract-failure", failurePhase: "case-execution",
    failureCode: "CONTRACT_FAILURE", failures: [], lifecycleCensus: null,
    childExitCode: 1, summaryPath: item.summaryPath,
    cleanupAttestation: structuredClone(item.cleanupAttestation),
  }));
  const finalizerDir = path.join(root, "suite-finalizer");
  const finalizerPath = path.join(finalizerDir, "summary.json");
  fs.mkdirSync(finalizerDir, { recursive: true });
  const finalizerSummary = { schema: "media-server.v390-ui-suite-finalizer.v1", result: "PASS", runId,
    sourceBinding: structuredClone(source), selectedAdapter: { engine: "playwright-native", fallbackUsed: false },
    visualMatrixProbes: [{ id: "contract-visual-probe" }], actualBrowserExecution: true,
    automaticRetryCount: 0,
    secretArtifactIntegrity: { status: "PASS",
      verificationStage: "suite-finalizer-secret-artifact-integrity", scannedFiles: 1, scannedBytes: 1 } };
  const serializedFinalizer = `${JSON.stringify(finalizerSummary, null, 2)}\n`;
  fs.writeFileSync(finalizerPath, serializedFinalizer, { mode: 0o600 });
  const summary = {
    schema: "media-server.v390-ui-canonical-parent.v1",
    result: failureCensus.length === 0 ? "PASS" : "FAIL",
    executionStatus: "canonical-parent-complete-failure-census",
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible-task-6-parent-contract",
    uiFulltestPass: false,
    actualBrowserExecution: true,
    selection: { selectedIds: [...canonicalIds], selected: 424, exactOrderPreserved: true,
      automaticRetryCount: 0, spawnTokenCount: 424 },
    counts: { selected: 424, attempted: 424, pass: 424 - failureCensus.length,
      fail: failureCensus.length, notRun: 0, unsupported: 0, runnerAbort: 0 },
    sourceBinding: structuredClone(source),
    runBinding: { schema: "media-server.v390-ui-canonical-parent-run.v1", runId,
      caseOutputRoot: casesRoot, childSummarySchema: "media-server.v390-ui-case-child.v1" },
    runtimeOwnership: { parentOwned: true, childrenBootstrapRuntime: false,
      initial: { runtimeRoot: root }, final: { runtimeRoot: root } },
    infraFatal: null,
    cases,
    failureCensus,
    firstFailure: failureCensus[0] || null,
    suiteFinalizer: { status: "PASS", runId, summaryPath: finalizerPath,
      summarySha256: createHash("sha256").update(serializedFinalizer).digest("hex"), automaticRetryCount: 0 },
  };
  fs.writeFileSync(path.join(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { root, source, summary };
}

function stableCanonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableCanonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${stableCanonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function listRegularFiles(root) {
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) files.push(candidate);
    }
  };
  visit(root);
  return files;
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
