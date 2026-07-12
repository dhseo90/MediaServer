#!/usr/bin/env node
// 파일 용도: Policy v4 UI fulltest 대체 evidence 자격과 현재 v3.9 부분 evidence 경계를 분리 판정한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateEvidence, sha256File, sha256Text, validatePolicy } from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Policy v4 UI fulltest evidence qualification

Usage:
  ./server.sh verify-ui-fulltest-evidence-policy-v4 [options]

Options:
  --policy <path>           Policy fixture. Default test/fixtures/ui_fulltest_evidence_policy_v4.json.
  --summary <path>          UI evidence summary. Default current v3.9 not-run state.
  --coverage-policy <path>  Current coverage policy used for partial-evidence counts.
  --output-dir <path>       Optional directory for evaluation.json and report.md.
  --require-eligible        Exit non-zero unless the supplied summary qualifies as full UI PASS.
  -h, --help                Show help.

The default command validates Policy v4 and deliberately reports the current not-run state
as ineligible. Policy validation PASS is separate from UI fulltest PASS.
`);
}

assertKnownOptions(rawArgs, ["policy", "summary", "coverage-policy", "output-dir", "require-eligible", "h", "help"]);

const options = parseArgs(rawArgs);
const policyPath = resolveRoot(options.policy);
const summaryPath = resolveRoot(options.summary);
const coveragePolicyPath = resolveRoot(options.coveragePolicy);
const policy = readJson(policyPath);
const summary = readJson(summaryPath);
const coveragePolicy = readJson(coveragePolicyPath);
const policyErrors = [...validatePolicy(policy), ...validatePolicyDocuments()];
const currentSource = {
  version: readText("VERSION").trim(),
  gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim(),
  worktreePatchSha256: sha256Text(execFileSync("git", ["diff", "--binary", "HEAD"], { cwd: rootDir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })),
};
const evaluation = evaluateEvidence(policy, summary, { rootDir, verifyArtifacts: true, currentSource });
const currentCounts = coveragePolicy.expectedReadiness || {};
const currentCoverageContractValid =
  coveragePolicy.schema === "media-server.v390-ui-automation-coverage-policy.v4" &&
  currentCounts.exactUiTestIds === 424 &&
  currentCounts.nativeExecutablePositive === 423 &&
  currentCounts.negativeRouteExecutable === 1 &&
  currentCounts.unsupported === 0 &&
  coveragePolicy.defaultExecutionState?.pass === 0 &&
  coveragePolicy.defaultExecutionState?.notRun === 424 &&
  typeof coveragePolicy.boundaries?.exactNativeWorkflowReadinessComplete === "boolean" &&
  coveragePolicy.boundaries?.actualAutomationExecutionComplete === false &&
  coveragePolicy.boundaries?.manualUiFulltestEvidence === false &&
  coveragePolicy.boundaries?.historicalConsumerPolicy === "deny-current-evidence";
const currentWorkflowReady = currentCoverageContractValid &&
  coveragePolicy.boundaries.exactNativeWorkflowReadinessComplete === true;

const historicalSource = isHistoricalSource(summaryPath, coveragePolicy);
const currentActualSource = summary.schema === "media-server.ui-automation-evidence.v4" &&
  summary.contractFixture !== true && summary.fixture === false &&
  summary.sourceBinding?.currentSourceVerified === true && summary.sourceBinding?.gitCommit === currentSource.gitCommit;
const currentNotRunSource = summary.schema === "media-server.v390-ui-current-evidence-state.v2" &&
  summary.sourceKind === "current-not-run-state" && summary.status === "not-run";
if (currentNotRunSource) {
  evaluation.reasons = evaluation.reasons.filter(reason =>
    !reason.startsWith("legacy-or-unsupported-schema:media-server.v390-ui-current-evidence-state."));
  evaluation.reasons.push("current-exact-424-execution-not-run");
}
if (historicalSource) evaluation.reasons.push("audit-only-historical-source-denied");
if (summary.schema === "media-server.ui-automation-evidence.v4" && !currentActualSource) {
  evaluation.reasons.push("actual-evidence-current-source-binding-missing");
}
evaluation.reasons = [...new Set(evaluation.reasons)].sort();
if (historicalSource || (summary.schema === "media-server.ui-automation-evidence.v4" && !currentActualSource)) {
  evaluation.uiFulltestPass = false;
  evaluation.evidenceEligibility = "ineligible";
}

if (!currentCoverageContractValid) {
  evaluation.reasons.push("current-v390-coverage-boundary-drift");
  evaluation.reasons.sort();
}
if (!currentWorkflowReady) {
  evaluation.reasons.push("review4-exact-workflow-readiness-incomplete");
  evaluation.reasons = [...new Set(evaluation.reasons)].sort();
  evaluation.uiFulltestPass = false;
  evaluation.evidenceEligibility = "ineligible";
}

const result = {
  schema: "media-server.ui-fulltest-evidence-policy-evaluation.v4",
  policySchema: policy.schema,
  policyVersion: policy.policyVersion,
  policyValidationResult: policyErrors.length === 0 ? "PASS" : "FAIL",
  policyErrors,
  sourceSummary: path.relative(rootDir, summaryPath),
  sourceSummarySha256: sha256File(summaryPath),
  sourceEvidenceSchema: summary.schema || "",
  currentEvidenceStatus: !currentCoverageContractValid
    ? "coverage-boundary-drift"
    : (historicalSource
      ? "audit-only-historical-denied"
      : (!currentWorkflowReady
        ? "workflow-readiness-review-required"
      : (currentActualSource
        ? "actual-current-source-evidence"
        : (currentNotRunSource ? "not-run-current-source" : "non-current-or-contract-evidence")))),
  currentCoverage: {
    exactUiTestIds: currentCounts.exactUiTestIds ?? null,
    nativeExecutablePositive: currentCounts.nativeExecutablePositive ?? null,
    negativeRouteExecutable: currentCounts.negativeRouteExecutable ?? null,
    unsupported: currentCounts.unsupported ?? null,
    executedPass: coveragePolicy.defaultExecutionState?.pass ?? null,
    notRun: coveragePolicy.defaultExecutionState?.notRun ?? null,
  },
  qualification: evaluation,
  suiteClosure: {
    actualBrowserExecution: summary.schema === "media-server.ui-automation-evidence.v4" &&
      summary.contractFixture !== true && summary.fixture === false,
    requestedExactCases: Number(summary.coverage?.targetCount ?? summary.cases?.length ?? summary.automatedCaseCount ?? 0),
    pass: Array.isArray(summary.cases) ? summary.cases.filter(item =>
      ["direct-pass", "automation-equivalent-pass", "PASS"].includes(item.status)).length : 0,
    fail: Number(summary.coverage?.fail ?? 0),
    notRun: Number(summary.coverage?.notRun ?? summary.notRun ?? 0),
    unsupported: Number(summary.coverage?.unsupported ?? summary.unsupported ?? 0),
    unapprovedExclusions: Number(summary.coverage?.unapprovedExclusions ?? 0),
    manualIntervention: Number(summary.coverage?.manualIntervention ?? (summary.manualIntervention === true ? 1 : 0)),
  },
  uiFulltestPass: evaluation.uiFulltestPass === true,
  boundary: "policy-verifier-pass-is-not-ui-fulltest-pass",
};

if (options.outputDir) writeOutputs(resolveRoot(options.outputDir), result);

console.log("== Policy v4 UI fulltest evidence qualification ==");
console.log(`- policySchema: ${result.policySchema}`);
console.log(`- policyValidationResult: ${result.policyValidationResult}`);
console.log(`- currentEvidenceStatus: ${result.currentEvidenceStatus}`);
console.log(`- currentCoverage: ${JSON.stringify(result.currentCoverage)}`);
console.log(`- evidenceEligibility: ${evaluation.evidenceEligibility}`);
console.log(`- qualifiedCaseCount: ${evaluation.qualifiedCaseCount}`);
console.log(`- uiFulltestPass: ${result.uiFulltestPass}`);
console.log(`- reasonCount: ${evaluation.reasons.length}`);
for (const reason of evaluation.reasons) console.log(`  - ${reason}`);

if (policyErrors.length > 0 || !currentCoverageContractValid) process.exit(1);
if (options.requireEligible && !result.uiFulltestPass) process.exit(1);

function parseArgs(args) {
  const parsed = {
    policy: "test/fixtures/ui_fulltest_evidence_policy_v4.json",
    summary: "test/fixtures/v390_ui_current_evidence_state.json",
    coveragePolicy: "test/fixtures/v390_ui_automation_coverage_policy.json",
    outputDir: "",
    requireEligible: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--require-eligible") parsed.requireEligible = true;
    else if (token === "--policy") parsed.policy = args[++index] || "";
    else if (token === "--summary") parsed.summary = args[++index] || "";
    else if (token === "--coverage-policy") parsed.coveragePolicy = args[++index] || "";
    else if (token === "--output-dir") parsed.outputDir = args[++index] || "";
  }
  return parsed;
}

function resolveRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(rootDir, value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isHistoricalSource(candidatePath, coverage) {
  const manifestPath = resolveRoot(coverage.historicalManifestSource || "");
  if (!fs.existsSync(manifestPath)) return true;
  const historical = readJson(manifestPath);
  if (historical.schema !== "media-server.v390-historical-invalid-ui-evidence.v2" ||
      historical.sourceKind !== "audit-only-historical" ||
      historical.consumerPolicy !== "deny-current-evidence") return true;
  const candidate = fs.realpathSync(candidatePath);
  return (historical.roots || []).some(item => {
    const historicalRoot = resolveRoot(item.path || "");
    if (!fs.existsSync(historicalRoot)) return false;
    const relative = path.relative(fs.realpathSync(historicalRoot), candidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

function validatePolicyDocuments() {
  const errors = [];
  const files = {
    agents: readText("AGENTS.md"),
    fulltest: readText("docs/manual-ui-fulltest.md"),
    checklist: readText("docs/manual-ui-checklist.md"),
    template: readText("docs/manual-ui-result-template.md"),
    releasePolicy: readText("docs/release-policy.md"),
    stream: readText("docs/stream-verification.md"),
    inventory: readText("docs/project-feature-test-inventory.md"),
    backlog: readText("docs/development-backlog.md"),
    releaseRecords: readText("docs/release-test-records.md"),
    releaseEvidence: readText("docs/release-evidence-index.md"),
    server: readText("server.sh"),
  };
  const required = [
    ["AGENTS.md", files.agents, ["#### 7.6.3 Policy v4 UI 대체 evidence 기준", "direct-browser", "qualified-native-automation", "policyValidationResult", "uiFulltestPass"]],
    ["docs/manual-ui-fulltest.md", files.fulltest, ["actual browser", "Policy v4 qualifier", "completion oracle", "Current 실행은 pass 0/not-run 424", "historical source classification"]],
    ["docs/manual-ui-checklist.md", files.checklist, ["Policy v4 qualifier", "actual-browser evidence", "completion oracle"]],
    ["docs/manual-ui-result-template.md", files.template, ["qualified-native-automation", "Policy v4 자동화/혼합 evidence 요약", "artifact hash/type/path containment", "uiFulltestPass"]],
    ["docs/release-policy.md", files.releasePolicy, ["## Policy v4 UI evidence release gate", "uiFulltestPass=true"]],
    ["docs/stream-verification.md", files.stream, ["### V390-ADD1-12 Policy v4 UI evidence qualification", "review4-workflow-rebuild-pending"]],
    ["docs/project-feature-test-inventory.md", files.inventory, ["V390-ADD1-12 Policy v4 UI evidence transition", "Policy v4 evidence qualification gate"]],
    ["docs/development-backlog.md", files.backlog, ["V390-ADD1-12", "Policy v4 테스트 정책 전환"]],
    ["docs/release-test-records.md", files.releaseRecords, ["Policy v4 UI Fulltest Evidence Qualification"]],
    ["docs/release-evidence-index.md", files.releaseEvidence, ["V390-ADD1-12 Policy v4 UI evidence transition"]],
    ["server.sh", files.server, ["verify-ui-fulltest-evidence-policy-v4", "verify_ui_fulltest_evidence_policy_v4.mjs"]],
  ];
  for (const [label, text, snippets] of required) {
    for (const snippet of snippets) {
      if (!text.includes(snippet)) errors.push(`${label} missing Policy v4 wording: ${snippet}`);
    }
  }
  const forbidden = [
    ["AGENTS.md", files.agents, "UI 테스트는 Codex 인앱 브라우저에서 직접 클릭/타이핑/반응형 확인으로 수행한다."],
    ["docs/manual-ui-checklist.md", files.checklist, "모든 웹 UI 검수는 인앱 브라우저에서 수행합니다."],
    ["docs/manual-ui-fulltest.md", files.fulltest, "Codex 세션에서는 인앱 브라우저 직접 조작을 기본 evidence로 사용합니다."],
  ];
  for (const [label, text, snippet] of forbidden) {
    if (text.includes(snippet)) errors.push(`${label} retains direct-only conflict: ${snippet}`);
  }
  return errors;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeOutputs(outputDir, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "evaluation.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const lines = [
    "# Policy v4 UI Fulltest Evidence Evaluation",
    "",
    `- policy validation: ${payload.policyValidationResult}`,
    `- current evidence: ${payload.currentEvidenceStatus}`,
    `- eligibility: ${payload.qualification.evidenceEligibility}`,
    `- qualified case count: ${payload.qualification.qualifiedCaseCount}`,
    `- UI fulltest PASS: ${payload.uiFulltestPass}`,
    `- boundary: ${payload.boundary}`,
    "",
    "## Reasons",
    "",
    ...payload.qualification.reasons.map(reason => `- ${reason}`),
  ];
  fs.writeFileSync(path.join(outputDir, "report.md"), `${lines.join("\n")}\n`, "utf8");
}
