#!/usr/bin/env node
// 파일 용도: v3.9 canonical acceptance summary의 artifact/provenance/cleanup 무결성을 재검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  collectSourceProvenanceWithAllowedArtifacts,
  isWithin,
  scanArtifactTree,
  sha256File,
  sha256Text,
} from "./evidence_integrity_lib.mjs";
import { evaluateV390FullSuiteEligibility } from "./v390_full_suite_eligibility_lib.mjs";
import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import {
  validateCanonicalFinalIntegrityBindings,
  validateCanonicalParentAcceptanceSummary,
} from "./v390_ui_native_exact_cases_lib.mjs";
import {
  validateCleanupMeasurement,
  validateIterationLedger,
  validateMonotonicDurationEvidence,
} from "./v390_longrun_evidence_measurement_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 final evidence integrity verification

Usage:
  ./server.sh verify-v390-final-evidence-integrity --summary <acceptance-summary.json>

Options:
  --summary <path>    v3.9 acceptance summary.
  --allow-fixture     Contract-only: validate integrity while retaining finalEvidenceEligible=false.

Checks:
  - source commit SHA, branch, worktree state, executed commands, first failure are recorded
  - canonical output has no duplicate screenshot files or placeholder video artifacts
  - cleanup is derived from child summary/filesystem checks instead of a constant
  - actual child longrun/UI summaries keep measured cleanup and placeholder-free artifacts
`);
}

assertKnownOptions(rawArgs, ["summary", "allow-fixture", "h", "help"]);
const options = parseArgs(rawArgs);
const summaryPath = path.resolve(options.summary);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const outputDir = path.resolve(summary.outputDir || path.dirname(summaryPath));
const outputReal = requireContainedDirectory(outputDir, outputDir, "acceptance artifact root");
const repositoryRoot = process.cwd();
const canonicalReleaseOutputDir = path.join(repositoryRoot, "docs/release-artifacts/v3.9.0/test-acceptance-current-final");
const currentProvenance = collectSourceProvenanceWithAllowedArtifacts(repositoryRoot, outputReal);
const checks = [];
const canonicalUiCaseIds = JSON.parse(fs.readFileSync(path.resolve(
  "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"), "utf8")).cases.map(item => item.testId);
const fullSuiteEligibility = evaluateV390FullSuiteEligibility({
  executionPassed: summary.result === "PASS",
  executionMode: summary.executionMode,
  policyEvaluation: summary.policyV4Evaluation,
  canonicalCaseIds: canonicalUiCaseIds,
});

check("canonical parent, child census, Policy source, and cleanup form one run", () => {
  const parentSummaryPath = path.resolve(String(summary.uiAutomation?.summaryPath || ""));
  if (options.allowFixture && (!summary.uiAutomation?.summaryPath ||
      !fs.existsSync(parentSummaryPath) ||
      JSON.parse(fs.readFileSync(parentSummaryPath, "utf8"))?.schema !==
        "media-server.v390-ui-canonical-parent.v1")) return;
  const parentSummaryReal = requireContainedFile(outputReal, parentSummaryPath, "canonical parent summary");
  const parentSummary = JSON.parse(fs.readFileSync(parentSummaryReal, "utf8"));
  const nativeManifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot,
    "test/fixtures/v390_ui_native_exact_cases.json"), "utf8"));
  const parentValidation = validateCanonicalParentAcceptanceSummary({
    summary: parentSummary,
    canonicalCaseIds: canonicalUiCaseIds,
    artifactRoot: path.dirname(parentSummaryReal),
    summaryPath: parentSummaryReal,
    expectedVerificationCommitSha: currentProvenance.commitSha,
    expectedVerificationBranch: currentProvenance.branch,
    expectedManifestSha256: sha256Text(canonicalStableJson(nativeManifest)),
    expectedBuildSha256: summary.uiBuildBinding?.buildSha256 || "",
  });
  const completeFailure = parentSummary.result === "FAIL" &&
    Number(parentSummary.counts?.fail) > 0;
  assert(parentValidation.censusComplete === true,
    `canonical parent census is incomplete: ${parentValidation.reasons.join(", ")}`);
  assert(completeFailure ? parentValidation.eligible === false : parentValidation.eligible === true,
    `canonical parent eligibility state mismatch: ${parentValidation.reasons.join(", ")}`);
  let policySummaryPath = "";
  let policyRawSummary = null;
  let independentPolicyEvaluation = null;
  if (!completeFailure) {
    policySummaryPath = path.resolve(String(summary.policyV4Evaluation?.sourceSummary || ""));
    policyRawSummary = JSON.parse(fs.readFileSync(
      requireContainedFile(outputReal, policySummaryPath, "Policy v4 raw source summary"), "utf8"));
    independentPolicyEvaluation = evaluateEvidence(
      JSON.parse(fs.readFileSync(path.join(repositoryRoot,
        "test/fixtures/ui_fulltest_evidence_policy_v4.json"), "utf8")),
      policyRawSummary,
      { rootDir: repositoryRoot, verifyArtifacts: true, currentSource: {
        version: fs.readFileSync(path.join(repositoryRoot, "VERSION"), "utf8").trim(),
        gitCommit: currentProvenance.commitSha,
        gitBranch: currentProvenance.branch,
        worktreePatchSha256: sha256Text(execFileSync("git", ["diff", "--binary", "HEAD"],
          { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })),
      } },
    );
  }
  const finalBinding = validateCanonicalFinalIntegrityBindings({
    acceptanceSummary: summary,
    parentSummary,
    parentValidation,
    policyEvaluation: summary.policyV4Evaluation,
    policyRawSummary,
    independentPolicyEvaluation,
    expectedCurrentSource: options.allowFixture ? summary.sourceProvenanceEnd : currentProvenance,
    canonicalCaseIds: canonicalUiCaseIds,
    parentSummaryPath: parentSummaryReal,
    policySummaryPath,
  });
  assert(finalBinding.pass === true,
    `canonical final binding failed: ${finalBinding.reasons.join(", ")}`);
});

check("acceptance summary and actual eligibility", () => {
  assert(summary.schema === "media-server.v390-test-acceptance-bundle.v1", "acceptance schema mismatch");
  assert(summary.executionMode === "actual" || options.allowFixture, `final evidence requires actual execution, got ${summary.executionMode}`);
  assert(summary.dryRun === false, "dry-run is not final evidence");
  assert(summary.result === "PASS", `acceptance result is not PASS: ${summary.result}`);
  assert(summary.finalEvidenceEligible === fullSuiteEligibility.finalEvidenceEligible,
    "summary finalEvidenceEligible does not match independent full-suite evaluation");
  assert(summary.automatedAcceptanceStatus === (fullSuiteEligibility.finalEvidenceEligible
    ? "eligible"
    : "executed-with-known-ui-closure-blockers"), "automated acceptance status mismatch");
  if (options.allowFixture) {
    assert(fullSuiteEligibility.finalEvidenceEligible === false,
      "contract fixture must not become final evidence eligible");
  } else {
    assert(outputReal === fs.realpathSync(canonicalReleaseOutputDir),
      "actual final evidence must use the repository canonical release output");
    assert(fullSuiteEligibility.finalEvidenceEligible === true,
      `actual final evidence lacks Policy v4 full-suite eligibility: ${fullSuiteEligibility.reasons.join(", ")}`);
  }
});

check("canonical summary report and child evidence manifest are direct and hash-bound", () => {
  const manifest = summary.finalEvidence;
  assert(manifest?.schema === "media-server.v390-canonical-final-evidence.v1", "canonical final evidence manifest missing");
  assert(manifest.temporaryPathFinalEvidenceReferences?.length === 0,
    "temporary path is referenced as final evidence");
  assert(fs.realpathSync(path.resolve(repositoryRoot, manifest.artifactRoot || "")) === outputReal,
    "canonical artifact root manifest mismatch");
  assert(path.resolve(repositoryRoot, manifest.summaryPath || "") === summaryPath,
    "canonical summary manifest mismatch");
  const reportReal = requireContainedFile(outputReal,
    path.resolve(repositoryRoot, manifest.reportPath || ""), "canonical acceptance report");
  assert(reportReal === fs.realpathSync(path.resolve(summary.reportPath || "")),
    "summary report path differs from canonical manifest");
  const reportText = fs.readFileSync(reportReal, "utf8");
  assert(Buffer.byteLength(reportText) === Number(manifest.reportBytes), "canonical report byte count mismatch");
  assert(sha256Text(reportText) === manifest.reportSha256, "canonical report hash mismatch");
  if (!options.allowFixture) {
    assert(!/(?:\/private)?\/tmp\//.test(reportText), "canonical report references a temporary path");
  }
  for (const stage of summary.stages || []) {
    assert(reportText.includes(`| ${stage.id} | ${stage.status} |`), `canonical report stage mismatch: ${stage.id}`);
  }

  const entries = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const expectedIds = options.allowFixture ? [] : [
    "server-longrun-30-summary",
    "server-longrun-30-report",
    "ui-exact-424-summary",
    "policy-v4-evaluation",
    ...(summary.longrun120?.status === "PASS"
      ? ["server-longrun-120-summary", "server-longrun-120-report"]
      : []),
  ];
  for (const expectedId of expectedIds) {
    assert(entries.some(item => item.id === expectedId), `required child evidence missing: ${expectedId}`);
  }
  for (const entry of entries) {
    assert(entry.path && !path.isAbsolute(entry.path), `child evidence path must be repository-relative: ${entry.id}`);
    assert(!/(?:^|\/)(?:private\/)?tmp(?:\/|$)/.test(entry.path), `temporary child evidence is final: ${entry.id}`);
    const artifactReal = requireContainedFile(outputReal, path.resolve(repositoryRoot, entry.path), entry.id);
    assert(fs.statSync(artifactReal).size === Number(entry.bytes), `child evidence byte count mismatch: ${entry.id}`);
    assert(sha256File(artifactReal) === entry.sha256, `child evidence hash mismatch: ${entry.id}`);
  }
});

check("source provenance and command ledger are complete", () => {
  assert(/^[a-f0-9]{40}$/.test(String(summary.sourceProvenance?.commitSha || "")), "source commit SHA missing");
  assert(Boolean(summary.sourceProvenance?.branch), "source branch missing");
  assert(typeof summary.sourceProvenance?.worktreeClean === "boolean", "source worktree state missing");
  assert(typeof summary.sourceProvenance?.sourceWorktreeClean === "boolean", "source-only worktree state missing");
  assert(fs.realpathSync(path.resolve(summary.sourceProvenance?.allowedArtifactRoot || "")) === outputReal,
    "start provenance allowed artifact root mismatch");
  assert(Array.isArray(summary.sourceProvenance?.unapprovedDirtyPaths), "start provenance unapproved path ledger missing");
  if (summary.executionMode === "actual") {
    assert(summary.sourceProvenance.sourceWorktreeClean === true,
      "actual final evidence must start without source changes outside the acceptance artifact root");
    assert(summary.sourceProvenance.unapprovedDirtyPaths.length === 0,
      "actual final evidence started with unapproved dirty paths");
  }
  assert(/^[a-f0-9]{64}$/.test(String(summary.sourceProvenance?.worktreeStatusSha256 || "")), "source worktree status hash missing");
  assert(summary.sourceProvenance.commitSha === summary.sourceProvenanceEnd?.commitSha, "source HEAD changed during acceptance execution");
  assert(summary.sourceProvenance.commitSha === currentProvenance.commitSha, "acceptance source HEAD is not current HEAD");
  assert(summary.sourceProvenance.branch === summary.sourceProvenanceEnd?.branch, "source branch changed during acceptance execution");
  assert(summary.sourceProvenance.branch === currentProvenance.branch, "acceptance source branch is not current branch");
  assert(fs.realpathSync(path.resolve(summary.sourceProvenanceEnd?.allowedArtifactRoot || "")) === outputReal,
    "end provenance allowed artifact root mismatch");
  assert(Array.isArray(summary.sourceProvenanceEnd?.unapprovedDirtyPaths), "end provenance unapproved path ledger missing");
  if (summary.executionMode === "actual") {
    assert(summary.sourceProvenanceEnd.sourceWorktreeClean === true, "actual final evidence ended with source-tree changes outside artifact root");
    assert(summary.sourceProvenanceEnd.unapprovedDirtyPaths.length === 0, "actual final evidence has unapproved dirty paths");
    assert(currentProvenance.sourceWorktreeClean === true, "current source tree differs outside the acceptance artifact root");
    assert(currentProvenance.unapprovedDirtyPaths.length === 0, "current source tree has unapproved dirty paths");
  }
  assert(Array.isArray(summary.executedCommands) && summary.executedCommands.length > 0, "executed command ledger missing");
  assert(summary.executedCommands.every(item => item.stage && item.id && item.status && item.command), "executed command ledger entry incomplete");
});

check("canonical command set is exact and hash-bound", () => {
  const commandSet = summary.finalAcceptanceCommandSet;
  assert(Array.isArray(commandSet), "canonical command set missing");
  const expectedIds = [
    "actual-bundle",
    "build",
    "feature-gates",
    "server-longrun-30",
    "ui-environment-bootstrap",
    "ui-exact-424",
    "ui-server-cleanup",
    "ui-fulltest-qualification",
    "server-longrun-120",
    "final-integrity",
  ];
  assert(JSON.stringify(commandSet.map(item => item.id)) === JSON.stringify(expectedIds), "canonical command set IDs/order mismatch");
  const requiredCommandFragments = {
    "actual-bundle": "./test_release.sh",
    build: "./server.sh build",
    "feature-gates": "current feature commands",
    "server-longrun-30": "verify-v390-server-longrun --duration-minutes 30",
    "ui-environment-bootstrap": "acceptance-owned temp root/server/auth roles/storage-state/runtime descriptor",
    "ui-exact-424": "run-v390-ui-native-exact-cases",
    "ui-server-cleanup": "PID/port ownership",
    "ui-fulltest-qualification": "verify-ui-fulltest-evidence-policy-v4",
    "server-longrun-120": "verify-v390-server-longrun --duration-minutes 120",
    "final-integrity": "verify-v390-final-evidence-integrity",
  };
  for (const item of commandSet) {
    assert(String(item.command || "").includes(requiredCommandFragments[item.id]), `canonical command mismatch: ${item.id}`);
  }
  assert(!JSON.stringify(commandSet).includes("legacy"), "legacy command substituted into canonical command set");
  assert(sha256Text(JSON.stringify(commandSet)) === summary.canonicalCommandSetSha256, "canonical command set hash mismatch");
});

check("acceptance and child summary paths are contained by the current artifact root", () => {
  requireContainedFile(outputReal, summaryPath, "acceptance summary");
  requireContainedFile(outputReal, summary.reportPath, "acceptance report");
  requireContainedDirectory(outputReal, summary.runDir, "acceptance run root");
  for (const [label, child] of [
    ["30-minute", summary.longrun30],
    ["UI automation", summary.uiAutomation],
    ["120-minute", summary.longrun120],
  ]) {
    if (child?.summaryPath) requireContainedFile(outputReal, child.summaryPath, `${label} summary`);
  }
  for (const stage of summary.stages || []) {
    if (stage.logPath) requireContainedFile(outputReal, stage.logPath, `${stage.id} log`);
    if (stage.summaryPath) requireContainedFile(outputReal, stage.summaryPath, `${stage.id} stage summary`);
  }
});

check("Policy v4 evaluation is bound to its actual source summary", () => {
  if (options.allowFixture) {
    assert(summary.policyV4Evaluation === null || summary.policyV4Evaluation === undefined,
      "fixture unexpectedly carries promotable Policy v4 evaluation");
    return;
  }
  const sourceRelative = summary.policyV4Evaluation?.sourceSummary || "";
  assert(sourceRelative && !path.isAbsolute(sourceRelative), "Policy v4 source summary path must be repository-relative");
  const sourcePath = path.resolve(sourceRelative);
  const relative = path.relative(process.cwd(), sourcePath);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    "Policy v4 source summary escapes repository root");
  assert(fs.existsSync(sourcePath), "Policy v4 source summary file missing");
  requireContainedFile(outputReal, sourcePath, "Policy v4 source summary");
  assert(sha256File(sourcePath) === summary.policyV4Evaluation.sourceSummarySha256,
    "Policy v4 source summary hash mismatch");
  const rawPolicySummary = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  assert(rawPolicySummary.schema === "media-server.ui-automation-evidence.v4",
    "Policy v4 source is not exact raw UI evidence v4");
  assert(rawPolicySummary.sourceBinding?.gitCommit === currentProvenance.commitSha,
    "Policy v4 raw source commit is not independently current");
  const artifactRoot = path.resolve(repositoryRoot, rawPolicySummary.sourceBinding?.artifactRoot || "");
  const artifactReal = requireContainedDirectory(outputReal, artifactRoot, "UI evidence artifact root");
  assert(isWithin(path.dirname(sourcePath), artifactReal) || isWithin(artifactReal, path.dirname(sourcePath)),
    "UI source summary and artifact root are unrelated");
});

check("first failure record matches summary state", () => {
  if (!summary.failedStage) {
    assert(summary.firstFailure === null, "PASS summary must record firstFailure=null");
    return;
  }
  assert(summary.firstFailure?.stage === summary.failedStage, "first failure stage mismatch");
  assert(Boolean(summary.firstFailure?.command), "first failure command missing");
  assert(Boolean(summary.firstFailure?.context), "first failure context missing");
  assert(Boolean(summary.firstFailure?.reproductionCommand), "first failure reproduction command missing");
});

check("recovered retry preserves its earliest first failure", () => {
  if (summary.outputPreparation?.previousFailurePreserved !== true) {
    assert(summary.priorFirstFailure === null || summary.priorFirstFailure === undefined, "unexpected prior first failure without replacement record");
    return;
  }
  const prior = summary.priorFirstFailure;
  assert(prior?.schema === "media-server.v390-acceptance-first-failure.v1", "prior first failure schema mismatch");
  assert(Boolean(prior.failedStage), "prior failed stage missing");
  assert(Boolean(prior.firstFailure?.command), "prior failure command missing");
  assert(Boolean(prior.firstFailure?.context), "prior failure context missing");
  assert(Boolean(prior.firstFailure?.reproductionCommand), "prior failure reproduction command missing");
  assert(Array.isArray(prior.diagnosticArtifacts) && prior.diagnosticArtifacts.length > 0, "prior failure diagnostic snapshots missing");
  assert(prior.diagnosticArtifacts.every(item => /^[a-f0-9]{64}$/.test(String(item.sha256 || "")) && Number(item.bytes) >= 0 && Array.isArray(item.tail)), "prior failure diagnostic snapshot incomplete");
  const preservedPaths = summary.outputPreparation?.preservedFirstFailurePaths || [];
  assert(preservedPaths.length === 2, "preserved first failure path set mismatch");
  for (const filePath of preservedPaths) {
    const resolved = path.resolve(filePath);
    const relative = path.relative(outputDir, resolved);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `preserved first failure path escapes output: ${resolved}`);
    assert(fs.existsSync(resolved), `preserved first failure file missing: ${resolved}`);
  }
});

check("canonical artifacts contain no duplicate screenshots or video placeholders", () => {
  const scan = scanArtifactTree(outputDir);
  assert(scan.duplicateScreenshotFiles === 0, `duplicate screenshot files remain: ${JSON.stringify(scan.duplicateScreenshotGroups)}`);
  assert(scan.placeholderVideoFiles.length === 0, `placeholder video files remain: ${scan.placeholderVideoFiles.join(", ")}`);
});

check("top-level cleanup is measured", () => {
  assert(summary.cleanup?.status === "PASS", "top-level cleanup is not PASS");
  assert(summary.cleanup?.verificationSource === "child-summary-and-filesystem", "top-level cleanup source is not measured");
  assert(summary.cleanup?.childCleanupVerified === true, "child cleanup was not verified");
  assert(summary.cleanup?.temporaryArtifactsRemoved === true, "temporary artifacts remain");
  assert(summary.cleanup?.placeholderVideoFilesAbsent === true, "placeholder video cleanup failed");
  assert(summary.cleanup?.duplicateScreenshotFilesAbsent === true, "duplicate screenshot cleanup failed");
  assert(Array.isArray(summary.cleanup?.checks) && summary.cleanup.checks.length >= 4, "top-level cleanup checks missing");
  assert(summary.cleanup.checks.every(item => item.status === "PASS"), "top-level cleanup contains failed check");
  if (summary.executionMode === "actual") {
    assert(summary.uiTemporaryRoot && summary.uiTemporaryRoot === summary.uiEnvironment?.temporaryRoot,
      "acceptance UI temporary root binding mismatch");
    const uiArtifacts = summary.uiEnvironment?.cleanup?.measurement?.artifacts || [];
    const temporaryRootMeasurement = uiArtifacts.find(item => item.path === summary.uiTemporaryRoot);
    assert(temporaryRootMeasurement?.contained === true && temporaryRootMeasurement?.existedBefore === true &&
      temporaryRootMeasurement?.existsAfter === false && temporaryRootMeasurement?.bytesAfter === 0,
    "acceptance UI temporary root cleanup measurement mismatch");
  }
});

check("actual child evidence uses measured cleanup", () => {
  if (summary.executionMode !== "actual") return;
  const longrun = readChild(summary.longrun30?.summaryPath, "30-minute");
  validateLongrunChild(longrun, 30, "30-minute");
  assert(longrun.cleanup?.verificationSource === "pid-port-artifact-before-after-observation", "30-minute cleanup source mismatch");
  assert(validateCleanupMeasurement(longrun.cleanup?.measurement).length === 0, "30-minute raw cleanup measurement invalid");
  remeasureCleanupAfter(longrun.cleanup?.measurement, "30-minute");
  assert(longrun.cleanup?.checks?.every(item => item.status === "PASS"), "30-minute cleanup check failed");
  const ui = readChild(summary.uiAutomation?.summaryPath, "UI automation");
  assert(ui.schema === "media-server.v390-ui-canonical-parent.v1",
    "UI child evidence is not the canonical parent summary");
  assert(ui.counts?.selected === 424 && ui.counts?.attempted === 424 &&
    ui.counts?.pass === 424 && ui.counts?.fail === 0 && ui.counts?.notRun === 0 &&
    ui.counts?.unsupported === 0 && ui.counts?.runnerAbort === 0,
  "canonical UI parent exact census mismatch");
  if (summary.longrun120?.status === "PASS") {
    const longrun120 = readChild(summary.longrun120?.summaryPath, "120-minute");
    validateLongrunChild(longrun120, 120, "120-minute");
    assert(longrun120.cleanup?.verificationSource === "pid-port-artifact-before-after-observation", "120-minute cleanup source mismatch");
    assert(validateCleanupMeasurement(longrun120.cleanup?.measurement).length === 0, "120-minute raw cleanup measurement invalid");
    remeasureCleanupAfter(longrun120.cleanup?.measurement, "120-minute");
  }
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 final evidence integrity summary ==");
console.log(`- summary: ${summaryPath}`);
console.log(`- executionMode: ${summary.executionMode}`);
console.log(`- finalEvidenceEligible: ${fullSuiteEligibility.finalEvidenceEligible}`);
console.log(`- uiFulltestPass: ${fullSuiteEligibility.uiFulltestPass}`);
console.log(`- qualifiedCaseCount: ${fullSuiteEligibility.qualifiedCaseCount}`);
console.log(`- sourceCommitSha: ${summary.sourceProvenance?.commitSha || ""}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function parseArgs(args) {
  let summaryValue = "";
  let allowFixture = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--summary") { summaryValue = args[index + 1] || ""; index += 1; }
    else if (args[index] === "--allow-fixture") allowFixture = true;
  }
  assert(summaryValue, "--summary is required");
  return { summary: summaryValue, allowFixture };
}

function readChild(filePath, label) {
  assert(filePath, `${label} summary path missing`);
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(path.dirname(summaryPath), filePath);
  const contained = requireContainedFile(outputReal, resolved, `${label} summary`);
  return JSON.parse(fs.readFileSync(contained, "utf8"));
}

function validateLongrunChild(child, durationMinutes, label) {
  assert(child.schema === "media-server.v390-server-longrun.v2", `${label} longrun schema mismatch`);
  assert(child.realDurationEvidence === true, `${label} real duration is not eligible`);
  assert(Number(child.durationMinutes) === durationMinutes, `${label} duration mismatch`);
  assert(validateMonotonicDurationEvidence(child.durationEvidence).length === 0, `${label} monotonic duration invalid`);
  assert(validateIterationLedger(child.iterationEvidence?.ledger, child.delegatedSteps).length === 0, `${label} iteration ledger invalid`);
}

function remeasureCleanupAfter(measurement, label) {
  for (const artifact of measurement?.artifacts || []) {
    assert(artifact.existsAfter === false && Number(artifact.bytesAfter) === 0, `${label} artifact after-state claim invalid`);
    assert(!fs.existsSync(path.resolve(artifact.path)), `${label} removed artifact exists now: ${artifact.path}`);
  }
  for (const port of measurement?.ports || []) {
    assert(Array.isArray(port.listenerPidsAfter) && port.listenerPidsAfter.length === 0 && port.bindableAfter === true,
      `${label} port after-state claim invalid: ${port.port}`);
    assert(listListenerPids(port.port).length === 0, `${label} port has a current listener: ${port.port}`);
  }
}

function listListenerPids(port) {
  try {
    return execFileSync("lsof", ["-nP", `-iTCP:${Number(port)}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" })
      .split(/\r?\n/).map(value => Number(value.trim())).filter(Number.isInteger);
  } catch {
    return [];
  }
}

function requireContainedFile(parent, candidate, label) {
  assert(candidate, `${label} path missing`);
  const resolved = path.resolve(candidate);
  assert(fs.existsSync(resolved), `${label} does not exist: ${resolved}`);
  const real = fs.realpathSync(resolved);
  const parentReal = fs.realpathSync(path.resolve(parent));
  const lexicalRelative = path.relative(parentReal, resolved);
  const scanCandidate = lexicalRelative && !lexicalRelative.startsWith("..") &&
    !path.isAbsolute(lexicalRelative) ? resolved : real;
  assert(!pathHasSymlinkAncestor(parentReal, scanCandidate),
    `${label} has a symlink ancestor: ${resolved}`);
  assert(isWithin(parentReal, real), `${label} escapes artifact root: ${real}`);
  assert(fs.statSync(real).isFile(), `${label} is not a file: ${real}`);
  return real;
}

function pathHasSymlinkAncestor(boundary, candidate) {
  const root = path.resolve(boundary);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return true;
  let current = root;
  try {
    if (fs.lstatSync(root).isSymbolicLink()) return true;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function requireContainedDirectory(parent, candidate, label) {
  assert(candidate, `${label} path missing`);
  const resolved = path.resolve(candidate);
  assert(fs.existsSync(resolved), `${label} does not exist: ${resolved}`);
  const real = fs.realpathSync(resolved);
  const parentReal = fs.realpathSync(path.resolve(parent));
  const lexicalRelative = path.relative(parentReal, resolved);
  const scanCandidate = lexicalRelative && !lexicalRelative.startsWith("..") &&
    !path.isAbsolute(lexicalRelative) ? resolved : real;
  if (scanCandidate !== parentReal) {
    assert(!pathHasSymlinkAncestor(parentReal, scanCandidate),
      `${label} has a symlink ancestor: ${resolved}`);
  }
  assert(isWithin(parentReal, real), `${label} escapes artifact root: ${real}`);
  assert(fs.statSync(real).isDirectory(), `${label} is not a directory: ${real}`);
  return real;
}

function check(name, fn) { checks.push({ name, fn }); }

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

function canonicalStableJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalStableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function assert(condition, message) { if (!condition) throw new Error(message); }
