#!/usr/bin/env node
// 파일 용도: Policy v4 UI fulltest 대체 evidence 자격과 현재 v3.9 부분 evidence 경계를 분리 판정한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateEvidence, sha256Text, validatePolicy } from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Policy v4 UI fulltest evidence qualification

Usage:
  ./server.sh verify-ui-fulltest-evidence-policy-v4 [options]

Options:
  --policy <path>           Policy fixture. Default test/fixtures/ui_fulltest_evidence_policy_v4.json.
  --summary <path>          UI evidence summary. Default current v3.9 visible-DOM legacy summary.
  --coverage-policy <path>  Current coverage policy used for partial-evidence counts.
  --output-dir <path>       Optional directory for evaluation.json and report.md.
  --require-eligible        Exit non-zero unless the supplied summary qualifies as full UI PASS.
  -h, --help                Show help.

The default command validates Policy v4 and deliberately reports the current 8/424 legacy
evidence as partial/ineligible. Policy validation PASS is separate from UI fulltest PASS.
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
const currentCounts = coveragePolicy.expectedCounts || {};
const currentCoverageValid =
  coveragePolicy.schema === "media-server.v390-ui-automation-coverage-policy.v2" &&
  currentCounts.exactUiTestIds === 424 &&
  currentCounts.automated === 8 &&
  currentCounts.unsupportedManual === 415 &&
  currentCounts.excludedPositiveUi === 1 &&
  coveragePolicy.boundaries?.fullAutomationCoverage === false &&
  coveragePolicy.boundaries?.manualUiFulltestEvidence === false;

if (!currentCoverageValid) {
  evaluation.reasons.push("current-v390-coverage-boundary-drift");
  evaluation.reasons.sort();
}

const result = {
  schema: "media-server.ui-fulltest-evidence-policy-evaluation.v4",
  policySchema: policy.schema,
  policyVersion: policy.policyVersion,
  policyValidationResult: policyErrors.length === 0 ? "PASS" : "FAIL",
  policyErrors,
  sourceSummary: path.relative(rootDir, summaryPath),
  sourceEvidenceSchema: summary.schema || "",
  currentEvidenceStatus: currentCoverageValid ? "partial-automation-evidence" : "coverage-boundary-drift",
  currentCoverage: {
    exactUiTestIds: currentCounts.exactUiTestIds ?? null,
    automated: currentCounts.automated ?? null,
    unsupported: currentCounts.unsupportedManual ?? null,
    excludedPositiveUi: currentCounts.excludedPositiveUi ?? null,
  },
  qualification: evaluation,
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

if (policyErrors.length > 0 || !currentCoverageValid) process.exit(1);
if (options.requireEligible && !result.uiFulltestPass) process.exit(1);

function parseArgs(args) {
  const parsed = {
    policy: "test/fixtures/ui_fulltest_evidence_policy_v4.json",
    summary: "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json",
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
    ["docs/manual-ui-fulltest.md", files.fulltest, ["actual browser", "Policy v4 qualifier", "completion oracle", "automated 8", "unsupported 415"]],
    ["docs/manual-ui-checklist.md", files.checklist, ["Policy v4 qualifier", "actual-browser evidence", "completion oracle"]],
    ["docs/manual-ui-result-template.md", files.template, ["qualified-native-automation", "Policy v4 자동화/혼합 evidence 요약", "artifact hash/type/path containment", "uiFulltestPass"]],
    ["docs/release-policy.md", files.releasePolicy, ["## Policy v4 UI evidence release gate", "uiFulltestPass=true"]],
    ["docs/stream-verification.md", files.stream, ["### V390-ADD1-12 Policy v4 UI evidence qualification", "partial-automation-evidence"]],
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
