#!/usr/bin/env node
// 파일 용도: 내부 UI diagnostic sweep이 release exact runner와 evidence 경계를 공유하지 않는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const runnerSource = read("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const sweepSource = read("scripts/internal/run_v390_ui_native_diagnostic_sweep.mjs");
const serverSource = read("server.sh");
const userLauncherSource = read("test_ui.sh");
const manifest = JSON.parse(read("test/fixtures/v390_ui_native_exact_cases.json"));
const checks = [];
const temporaryDirs = [];
process.on("exit", () => temporaryDirs.forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

check("release runner remains fail-first outside the internal diagnostic child mode", () => {
  assert(runnerSource.includes("let stopped = false;") &&
    runnerSource.includes('if (stopped) {') &&
    runnerSource.includes('not run after previous native case failure') &&
    runnerSource.includes('if (!diagnosticChild) stopped = true;'),
  "release runner fail-first boundary missing");
  assert(runnerSource.includes("producePolicyV4Evidence({") &&
    runnerSource.includes("if (diagnosticChild) {") &&
    runnerSource.includes("} else if (!evidenceProductionFailure) {"),
  "diagnostic child does not bypass Policy v4 production in a distinct branch");
});

check("diagnostic selection is fixed to RULE-097 through the canonical end", () => {
  const index = manifest.cases.findIndex(item => item.caseId === "RULE-097");
  assert(index >= 0, "RULE-097 missing from native manifest");
  assert(manifest.cases.slice(index).length === 144, "RULE-097 diagnostic target is not exactly 144 cases");
  assert(sweepSource.includes('const selected = cases.slice(index);') &&
    sweepSource.includes('selected.length === 144') &&
    sweepSource.includes("const fullSelection = fixedSelection(manifest.cases)"),
  "diagnostic selection is not fixed to the expected 144 cases");
});

check("diagnostic sweep uses a fresh source-built manifest without replacing tracked fixtures", () => {
  assert(sweepSource.includes("buildNativeExactManifest({ canonical, implementation })") &&
    sweepSource.includes("validateNativeExactManifest({ manifest, canonical, implementation })") &&
    sweepSource.includes('const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json")') &&
    sweepSource.includes('"--manifest", diagnosticManifestPath'),
  "diagnostic sweep is still bound to a stale tracked generated manifest");
  assert(!sweepSource.includes('readJson("test/fixtures/v390_ui_native_exact_cases.json")'),
    "diagnostic sweep reads the tracked native fixture as its execution manifest");
});

check("diagnostic output cannot become release or Policy v4 evidence", () => {
  assert(sweepSource.includes('schema: "media-server.v390-ui-diagnostic-sweep.v1"') &&
    sweepSource.includes("diagnosticOnly: true") &&
    sweepSource.includes("releaseEvidenceEligible: false") &&
    sweepSource.includes('policyV4Qualification: "not-eligible"') &&
    sweepSource.includes("uiFulltestPass: false"),
  "diagnostic summary release boundary missing");
  assert(!sweepSource.includes("producePolicyV4Evidence") &&
    !sweepSource.includes("visual-matrix") &&
    !sweepSource.includes("first-failure.json") &&
    !sweepSource.includes("release-artifacts"),
  "diagnostic sweep reaches a release-only evidence path");
  assert(!userLauncherSource.includes("run-v390-ui-native-diagnostic-sweep"),
    "user test_ui.sh exposes the internal diagnostic command");
});

check("cleanup or browser-close contamination recycles before the next case without retry", () => {
  assert(sweepSource.includes("childSummary?.environmentContamination?.detected === true || !child.summary") &&
    sweepSource.includes('if (contaminated || secretScan.status !== "PASS")') &&
    sweepSource.includes('await recycleEnvironment(environment, environmentGeneration, "child-contamination")') &&
    sweepSource.includes("environment = null;") &&
    sweepSource.includes("automaticRetryCount: 0") &&
    !sweepSource.includes("retryCase") && !sweepSource.includes("while ("),
  "contamination recycle/no-retry contract missing");
  assert(runnerSource.includes("environmentContamination: Boolean(error?.cleanupFailure || error?.browserCloseFailure)") &&
    runnerSource.includes("browserCloseFailure: Boolean(error?.browserCloseFailure)"),
  "diagnostic child contamination summary missing");
});

check("diagnostic child output is constrained and failure reasons are safe classes", () => {
  assert(runnerSource.includes("assertDiagnosticChildOutputRoot(outputDir)") &&
    runnerSource.includes("safeDiagnosticFailureClass(error)") &&
    runnerSource.includes("safeDiagnosticFailureDetail(error)") &&
    runnerSource.includes("[response-body-redacted]") &&
    runnerSource.includes("[redacted-url]") &&
    runnerSource.includes('return "case-execution-failed"') &&
    !runnerSource.includes("reason: diagnosticChild ? error"),
  "diagnostic child safe-output boundary missing");
  assert(sweepSource.includes("assertDiagnosticOutputRoot(outputDir)") &&
    sweepSource.includes("environment.assertSecretsAbsentFromArtifacts(childDir)"),
  "diagnostic sweep output/secret scan boundary missing");
  assert(runnerSource.includes("if (primaryFailure?.eventDomSemanticEvidence)") &&
    runnerSource.includes("error.partialArtifacts.eventDomSemanticEvidence") &&
    runnerSource.includes("eventDomSemanticEvidence: resultItem.eventDomSemanticEvidence || null") &&
    sweepSource.includes("eventDomSemanticEvidence: childSummary?.case?.eventDomSemanticEvidence || null") &&
    sweepSource.includes('import { validateEventDomSemanticCompositeEvidence }') &&
    sweepSource.includes("validateEventDomSemanticCompositeEvidence(evidence)") &&
    runnerSource.includes("eventDomSemanticEvidence"),
  "structured EVT DOM evidence is not preserved through child and sweep summaries");
  assert(runnerSource.includes("markerFlow") ||
    fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_exact_oracle_runtime.mjs"), "utf8")
      .includes('schema: "media-server.v390-ui-event-marker-flow-evidence.v1"'),
  "EVT-004 marker-flow evidence is not part of the structured event evidence envelope");
});

check("diagnostic sweep reports durable progress and treats cleanup failure as failure", () => {
  assert(sweepSource.includes('const progressPath = path.join(outputDir, "progress.json")') &&
    sweepSource.includes("[diagnostic-progress]") &&
    sweepSource.includes("currentFailureDetail") &&
    sweepSource.includes("buildBootstrapFailureEvidence(error)") &&
    sweepSource.includes("reasonSha256") &&
    sweepSource.includes("environmentAttestationSha256") &&
    sweepSource.includes('cleanup.some(item => item.status !== "PASS") ? "FAIL" : "PASS"'),
  "diagnostic progress or final cleanup failure binding missing");
});

check("bootstrap failure preserves safe phase, cause digest, and cleanup attestation", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "bootstrap-contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--case-id", "EVT-003",
    "--contract-bootstrap-failure-fixture", "listener-eperm",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 1, `bootstrap failure fixture exit mismatch: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  const failure = summary.cases?.[0]?.bootstrapFailure;
  const environmentFailure = summary.environments?.[0]?.bootstrapFailure;
  const cleanup = summary.cleanup?.[0];
  const sha256 = /^[0-9a-f]{64}$/;
  assert(summary.counts.target === 1 && summary.counts.attempted === 1 &&
    summary.counts.pass === 0 && summary.counts.fail === 1 && summary.counts.notRun === 0,
  "bootstrap failure fixture count invariant mismatch");
  assert(summary.cases?.[0]?.failureClass === "environment-bootstrap-failed" &&
    summary.cases?.[0]?.environmentContamination === false,
  "bootstrap failure fixture case classification mismatch");
  assert(failure?.schema === "media-server.v390-ui-diagnostic-bootstrap-failure.v1" &&
    failure.code === "LISTENER_PERMISSION_DENIED" &&
    failure.phase === "server-bootstrap",
  "bootstrap failure safe code/phase mismatch");
  assert(sha256.test(failure.reasonSha256) &&
    sha256.test(failure.environmentAttestationSha256) &&
    sha256.test(failure.cleanup?.verificationSourceSha256),
  "bootstrap failure digest evidence is missing");
  assert(failure.cleanup?.status === "PASS" &&
    failure.cleanup.serversStopped === true &&
    failure.cleanup.portsClean === true &&
    failure.cleanup.temporaryArtifactsRemoved === true &&
    failure.cleanup.checkCount === 2 &&
    failure.cleanup.failedCheckDigests.length === 0,
  "bootstrap failure cleanup attestation mismatch");
  assert(JSON.stringify(environmentFailure) === JSON.stringify(failure),
    "bootstrap failure environment and case evidence drift");
  assert(cleanup?.reason === "bootstrap-failure" && cleanup.status === "PASS",
    "bootstrap failure top-level cleanup evidence missing");
  const serialized = JSON.stringify(summary);
  assert(!serialized.includes("bootstrap.invalid") &&
    !serialized.includes("contract-secret") &&
    !/(?:https?|rtsp|rtsps):\/\//i.test(serialized),
  "bootstrap failure summary exposed a raw URL or secret");
});

check("single-case diagnostics stay inside the fixed remaining selection", () => {
  assert(sweepSource.includes('else if (arg === "--case-id") parsed.caseId = args[++index] || "";'),
    "diagnostic single-case parser missing");
  assert(sweepSource.includes('mode: options.caseId ? "single-case-diagnostic" : "fixed-remaining-sweep"'),
    "diagnostic selection mode missing");
  assert(sweepSource.includes("diagnostic case is outside the fixed RULE-097 selection"),
    "diagnostic single-case range guard missing");
  assert(sweepSource.includes("startCaseId: selection[0].caseId") &&
    sweepSource.includes("endCaseId: selection.at(-1).caseId") &&
    sweepSource.includes("selectedIds: selection.map(item => item.caseId)"),
  "diagnostic summary does not bind selection metadata to the actual selected cases");
  assert(runnerSource.includes("startCaseId: item.caseId") &&
    runnerSource.includes("endCaseId: item.caseId") &&
    runnerSource.includes("selectedIds: [item.caseId]"),
  "diagnostic child summary retains the RULE-097 fallback for a single case");
});

check("single-case plan metadata names only the requested case", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "single-case-contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--case-id", "EVT-003",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic single-case plan failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.selection?.startCaseId === "EVT-003" &&
    summary.selection?.endCaseId === "EVT-003" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["EVT-003"]) &&
    summary.selection?.targetCaseCount === 1,
  "diagnostic single-case metadata is not bound to EVT-003");
});

check("plan-only diagnostic output preserves count invariants without browser execution", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "contract-"));
  temporaryDirs.push(outputDir);
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-diagnostic-sweep",
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic plan-only failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.schema === "media-server.v390-ui-diagnostic-sweep.v1", "diagnostic plan-only schema mismatch");
  assert(summary.diagnosticOnly === true && summary.releaseEvidenceEligible === false &&
    summary.policyV4Qualification === "not-eligible" && summary.uiFulltestPass === false,
  "diagnostic plan-only release boundary mismatch");
  assert(summary.counts.target === 144 && summary.counts.attempted === 0 &&
    summary.counts.pass === 0 && summary.counts.fail === 0 && summary.counts.notRun === 144,
  "diagnostic plan-only count invariant mismatch");
  assert(summary.cases.length === 144 && summary.cases.every(item => item.automaticRetryCount === 0),
    "diagnostic plan-only retry/case count mismatch");
  assert(summary.actualBrowserExecution === false &&
    /^[0-9a-f]{40}$/.test(summary.sourceBinding?.gitCommit || "") &&
    /^[0-9a-f]{64}$/.test(summary.sourceBinding?.manifestSha256 || "") &&
    summary.sourceBinding?.selectionIdsSha256 === summary.selection?.targetCaseIdsSha256,
  "diagnostic plan-only source/selection/browser binding mismatch");
  assert(sweepSource.includes("runtimeOwnershipAttestation(environment.runtime)") &&
    sweepSource.includes("runtimeRootCleanup: {") &&
    sweepSource.includes("runtimeRootSha256: runtimeOwnership.runtimeRootSha256") &&
    sweepSource.includes("temporaryArtifactsRemoved: result.temporaryArtifactsRemoved === true"),
  "diagnostic runtime PID/port/root cleanup attestation is incomplete");
});

check("diagnostic child plan-only reports only its selected case and cannot emit a release summary", () => {
  const parent = path.join(rootDir, ".media_server.test", "v3.9.0", "ui-diagnostic-sweep");
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const outputDir = fs.mkdtempSync(path.join(parent, "child-contract-"));
  temporaryDirs.push(outputDir);
  const canonical = JSON.parse(read("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const implementation = JSON.parse(read("test/fixtures/project_feature_implementation_evidence.json"));
  const diagnosticManifestPath = path.join(outputDir, "diagnostic-native-manifest.json");
  fs.writeFileSync(diagnosticManifestPath,
    `${JSON.stringify(buildNativeExactManifest({ canonical, implementation }), null, 2)}\n`,
    "utf8");
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--diagnostic-child",
    "--diagnostic-case-id", "RULE-097",
    "--manifest", diagnosticManifestPath,
    "--plan-only",
    "--output-dir", outputDir,
  ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(run.status === 0, `diagnostic child plan-only failed: ${run.stderr || run.stdout}`);
  const summary = JSON.parse(fs.readFileSync(path.join(outputDir, "summary.json"), "utf8"));
  assert(summary.schema === "media-server.v390-ui-diagnostic-child.v1", "diagnostic child plan-only schema mismatch");
  assert(summary.selection?.startCaseId === "RULE-097" &&
    summary.selection?.endCaseId === "RULE-097" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["RULE-097"]) &&
    summary.selection?.targetCaseCount === 1 &&
    summary.selection?.caseId === "RULE-097" && summary.selection?.automaticRetryCount === 0,
  "diagnostic child selected-case/retry mismatch");
  assert(summary.releaseEvidenceEligible === false && summary.policyV4Qualification === "not-eligible" &&
    summary.uiFulltestPass === false,
  "diagnostic child plan-only entered a release or Policy v4 state");
  assert(summary.case?.actualBrowserExecution === false &&
    summary.case?.eventDomSemanticEvidence === null,
  "diagnostic child plan-only claims browser or EVT DOM evidence");
});

check("server dispatch exposes only the internal run and verification commands", () => {
  assert(serverSource.includes("run-v390-ui-native-diagnostic-sweep)") &&
    serverSource.includes("run_v390_ui_native_diagnostic_sweep.mjs") &&
    serverSource.includes("verify-v390-ui-native-diagnostic-sweep-contract)") &&
    serverSource.includes("verify_v390_ui_native_diagnostic_sweep_contract.mjs"),
  "server diagnostic dispatch missing");
});

if (checks.some(item => item.status === "FAIL")) process.exit(1);
console.log(`PASS ${checks.length}/${checks.length}`);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${name}: ${checks.at(-1).error}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
