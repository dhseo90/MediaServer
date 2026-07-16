#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance bundle dry-run command와 evidence boundary 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertSecretValuesAbsentFromTree,
  consumeAcceptanceAdminPassword,
  resolveAcceptanceRoleSecrets,
  secretStrippedProcessEnv,
} from "./v390_acceptance_ui_environment.mjs";
import { createV390UiCaseRuntime } from "./v390_ui_case_runtime.mjs";

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

const files = {
  bundle: readText("scripts/internal/verify_v390_test_acceptance_bundle.mjs"),
  uiEnvironment: readText("scripts/internal/v390_acceptance_ui_environment.mjs"),
  seedPreparation: readText("scripts/internal/prepare_manual_ui_fulltest_seed.mjs"),
  uiOneShot: readText("scripts/internal/verify_ui_fulltest_one_shot.mjs"),
  caseRuntime: readText("scripts/internal/v390_ui_case_runtime.mjs"),
  exactRunner: readText("scripts/internal/run_v390_ui_native_exact_cases.mjs"),
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  backlog: readText("docs/development-backlog.md"),
};

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

check("canonical source removes legacy 8-case and external summary injection", () => {
  assert(!files.bundle.includes('"verify-v390-ui-automation"'), "canonical bundle still executes legacy 8-case runner");
  assert(!files.bundle.includes("--ui-fulltest-summary"), "canonical bundle still accepts external UI summary injection");
  for (const snippet of [
    "run-v390-ui-native-exact-cases",
    "verify-ui-fulltest-evidence-policy-v4",
    "verify-v390-final-evidence-integrity",
  ]) assertIncludes(files.bundle, snippet, "canonical exact/Policy/final source");
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
    "runtime-admin-and-generated-role-secrets-memory-only",
    "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD is required for the acceptance-owned throwaway admin",
    "delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "role-storage-state-generated-by-acceptance",
    "self-contained-pid-port-artifact-ownership",
  ]) assertIncludes(files.bundle, snippet, "self-contained acceptance source");
  for (const snippet of [
    "JSON.stringify({ roles: secrets, refs: { fixturePassword } })",
    "resolveAcceptanceRoleSecrets(adminPassword)",
    "env: secretStrippedProcessEnv()",
    "delete env[adminPasswordEnv]",
    "delete process.env[adminPasswordEnv]",
    'adminSecretSource: adminPasswordEnv',
    '"runtime-env-consumed-then-unset"',
    "usersFile: state.usersPath",
    "defaultViewId: state.viewId",
    '"--published-seed-baseline"',
  ]) assertIncludes(files.uiEnvironment, snippet, "self-contained runtime consumer contract");
  for (const snippet of [
    '"published-seed-baseline"',
    'readPublishedSeedBaseline()',
    'path.join(rootDir, "config/docs_ui_assets.json")',
    'assetConfig?.baseline?.publishedRelease',
    'assetConfig?.baseline?.sourceVersion === currentVersion',
    'assetConfig?.baseline?.publicReleaseStatus === `${publishedRelease}-published-source-only`',
    'seed.releaseTarget === seedTargetSelection.expectedReleaseTarget',
    'mode: "published-seed-baseline"',
    'policySha256: sha256Text(assetConfigText)',
  ]) assertIncludes(files.seedPreparation, snippet, "published seed baseline contract");
  assert(!files.seedPreparation.includes("expected-release-target"),
    "seed helper must not accept an arbitrary release target override");
  assert((files.uiOneShot.match(/"--published-seed-baseline"/g) || []).length === 2,
    "UI one-shot core/auth seed preparation must select the published baseline explicitly");

  assert(files.bundle.indexOf("consumeAcceptanceAdminPassword()") <
    files.bundle.indexOf("collectSourceProvenanceWithAllowedArtifacts(rootDir, outputDir)"),
  "admin secret must leave process.env before source provenance can spawn a child");
  assertIncludes(files.bundle, "adminPassword: acceptanceAdminPassword",
    "bundle must pass the consumed admin secret explicitly from memory");
  const sourceEnv = {
    SAFE_VALUE: "preserved",
    MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD: "contract-early-consume-admin",
  };
  const consumedAdmin = consumeAcceptanceAdminPassword(sourceEnv);
  assert(consumedAdmin === "contract-early-consume-admin", "early admin secret consumption changed the value");
  assert(!("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD" in sourceEnv),
    "early admin secret consumption left the value in the source environment");
  assert(sourceEnv.SAFE_VALUE === "preserved", "early admin secret consumption removed an unrelated value");

  const rejected = runBundle([
    "--output-dir", fixtureDir("external-input-rejected"),
    "--fixture-pass",
    "--ui-http-base", "http://127.0.0.1:1",
  ]);
  assert(rejected.status !== 0, "removed external UI runtime option must be rejected");
  assert(`${rejected.stdout}\n${rejected.stderr}`.includes("unknown option: --ui-http-base"),
    "removed external UI runtime option rejection reason missing");

  const runtimeOnlyAdmin = "contract-runtime-only-admin-value";
  const generated = [];
  const resolved = resolveAcceptanceRoleSecrets(runtimeOnlyAdmin, username => {
    generated.push(username);
    return `generated-for-${username}`;
  });
  assert(resolved.admin === runtimeOnlyAdmin, "throwaway admin did not preserve the runtime-provided value");
  assert(generated.length === 3 && !generated.includes("admin"),
    "throwaway admin must not be regenerated while the other roles remain generated");
  assert(Object.entries(resolved).filter(([role]) => role !== "admin")
    .every(([, value]) => value !== runtimeOnlyAdmin),
    "runtime admin value was reused by another role");
  let missingAdminRejected = false;
  try {
    resolveAcceptanceRoleSecrets("", () => "unused-generated-value");
  } catch (error) {
    missingAdminRejected = String(error?.message || error).includes("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD is required");
  }
  assert(missingAdminRejected, "missing runtime admin secret must fail before auth bootstrap");
});

check("published seed baseline is explicit, policy-bound, and rejects mismatched fixtures", () => {
  const outputDir = fixtureDir("published-seed-baseline");
  const fixturePath = path.join(rootDir, "test/fixtures/manual_ui_fulltest_va_seed_matrix.json");
  const defaultResult = spawnSync(path.join(rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed", "--dry-run",
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(defaultResult.status !== 0 && defaultResult.stderr.includes("seed fixture must pin v3.9.0"),
    "default seed preparation did not reject the stale published fixture against current source");

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
  assert(plan.releaseTarget === fixture.releaseTarget &&
    plan.releaseTarget === policy.baseline.publishedRelease,
  "published seed plan target is not bound to fixture and policy");
  assert(plan.seedTargetSelection?.mode === "published-seed-baseline" &&
    plan.seedTargetSelection.policyPath === "config/docs_ui_assets.json" &&
    /^[a-f0-9]{64}$/.test(plan.seedTargetSelection.policySha256),
  "published seed plan policy attestation mismatch");
  assert(plan.httpRequests === 0 && plan.boundaries?.notExecutionEvidence === true,
    "published seed dry-run changed its no-request/no-evidence boundary");

  const mismatchedFixturePath = path.join(outputDir, "mismatched-seed.json");
  fs.writeFileSync(mismatchedFixturePath, `${JSON.stringify({ ...fixture, releaseTarget: "v3.9.0" }, null, 2)}\n`);
  const mismatchResult = spawnSync(path.join(rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed", "--dry-run", "--published-seed-baseline",
    "--fixture", mismatchedFixturePath,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(mismatchResult.status !== 0 && mismatchResult.stderr.includes("seed fixture must pin v3.8.0"),
    "published seed preparation accepted a current-source fixture outside the published baseline");
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
  assert(files.bundle.indexOf("assertSecretsAbsentFromArtifacts(childDir)") < files.bundle.indexOf("releaseSecrets()"),
    "exact artifacts are not scanned before in-memory secrets are released");

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
  assert(summary.finalAcceptanceCommandSet.some((item) => item.id === "actual-bundle" && item.status === "actual-execution"), "missing actual bundle command in final acceptance set");
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
    "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120", "cleanup", "final-integrity", "report",
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
  assert(summary.uiEnvironment?.dependency?.status === "dependency-bootstrap-attestation",
    "browser dependency bootstrap attestation missing");
  assert(summary.uiEnvironment?.secretHandling === "runtime-admin-and-generated-role-secrets-memory-only",
    "runtime admin and generated role secrets must remain memory-only");
  assert(summary.uiEnvironment?.adminSecretSource === "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "throwaway admin secret source must be the runtime-only verifier environment");
  assert(summary.uiEnvironment?.adminSecretLifecycle === "fixture-not-consumed",
    "fixture must not claim runtime admin secret consumption");
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
  const outputDir = fixtureDir("first-fail");
  const result = runBundle(["--output-dir", outputDir, "--fixture-fail-stage", "feature-gates"]);
  assert(result.status !== 0, "failure fixture must return non-zero");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.result === "FAIL", "failure fixture summary must fail");
  assert(summary.failedStage === "feature-gates", "failedStage mismatch");
  assert(summary.firstFailure?.stage === "feature-gates", "firstFailure stage mismatch");
  assert(summary.firstFailure?.command === "fixture fail feature-gates", "firstFailure command mismatch");
  assert(summary.firstFailure?.context?.includes("fixture failure at feature-gates"), "firstFailure context missing");
  for (const id of ["server-longrun-30", "ui-environment-bootstrap", "ui-exact-424", "ui-fulltest-qualification", "longrun-120-decision", "server-longrun-120", "final-integrity"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must be not-run after failure`);
  }
  assert(summary.stages.find(item => item.id === "cleanup")?.status === "PASS", "cleanup must run after failure");
  assert(summary.stages.find(item => item.id === "report")?.status === "PASS", "report must run after failure");
  fs.rmSync(outputDir, { recursive: true, force: true });
});

check("rerun preserves the earliest first failure after canonical output replacement", () => {
  const outputDir = fixtureDir("preserved-first-fail");
  const failed = runBundle(["--output-dir", outputDir, "--fixture-fail-stage", "feature-gates"]);
  assert(failed.status !== 0, "first fixture run must fail");

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
  assert(readTextFile(firstFailureReportPath).includes("fixture fail feature-gates"), "preserved failure report command missing");
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

function runBundle(args) {
  return spawnSync(path.join(rootDir, "server.sh"), [command, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
