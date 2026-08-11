#!/usr/bin/env node
// 파일 용도: 986개 feature inventory의 exact UI test ID와 actual v3.9 UI evidence를 대조한다.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
let cachedProductUiRouteSource = null;

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 full-feature UI automation coverage matrix

Usage:
  ./server.sh verify-v390-ui-automation-coverage --output-dir <path> [options]

Options:
  --output-dir <path>          summary.json과 report.md 출력 경로
  --policy <path>              coverage policy JSON
  --automation-summary <path>  실제 UI automation summary override
  --update-doc <path>          검증된 Markdown matrix를 지정 문서에도 기록
  -h, --help                   도움말 출력

Selection:
  feature ID prefix나 numeric range를 사용하지 않습니다. Reviewed implementation manifest에서
  manualUiCaseId가 명시된 exact 424개 test ID만 선택하고 featureId, route,
  control/action anchor, stability verifier, automation caseId를 각각 연결합니다.

Boundary:
  이 명령의 PASS는 exact matrix와 source evidence 정합성 PASS입니다. Full automation,
  manual UI fulltest, 30분/120분, published metadata 또는 release action PASS가 아닙니다.
`);
}

assertKnownOptions(rawArgs, [
  "output-dir",
  "policy",
  "automation-summary",
  "update-doc",
  "h",
  "help",
]);

const options = parseArgs(rawArgs);
const policyPath = resolveRootPath(options.policy);
const policy = readJson(policyPath);
validatePolicyShape(policy);

const inventoryPath = resolvePolicySource(policy.inventorySource, policyPath);
const implementationPath = resolvePolicySource(policy.implementationEvidenceSource, policyPath);
const caseManifestPath = resolvePolicySource(policy.automationCaseManifestSource, policyPath);
const canonicalCaseManifestPath = resolvePolicySource(policy.canonicalCaseManifestSource, policyPath);
const historicalManifestPath = resolvePolicySource(policy.historicalManifestSource, policyPath);
const automationSummaryPath = options.automationSummary
  ? resolveRootPath(options.automationSummary)
  : resolvePolicySource(policy.actualAutomationSummarySource, policyPath);

const inventoryRows = parseFeatureInventory(inventoryPath);
assertUnique(inventoryRows.map(item => item.id), "inventory feature IDs");

const implementation = readJson(implementationPath);
assert(implementation.schema === "media-server.feature-implementation-evidence.v2",
  "unexpected implementation evidence schema");
assert(Array.isArray(implementation.items), "implementation evidence items missing");
assertUnique(implementation.items.map(item => item.id), "implementation feature IDs");
assertExact(implementation.items.map(item => item.id), inventoryRows.map(item => item.id),
  "inventory/implementation feature IDs");

const inventoryById = new Map(inventoryRows.map(item => [item.id, item]));
const exactUiTests = implementation.items.filter(item => item.manualUiCaseId !== null);
const exactTestIds = exactUiTests.map(item => item.manualUiCaseId);
assertUnique(exactTestIds, "exact manual UI test IDs");

for (const item of implementation.items) {
  const inventory = inventoryById.get(item.id);
  validateInventoryImplementationPair(inventory, item);
}

const caseManifest = readJson(caseManifestPath);
assert(caseManifest.schema === "media-server.v390-ui-native-exact-cases.v2",
  "unexpected automation case manifest schema");
const manifestCases = Array.isArray(caseManifest.cases) ? caseManifest.cases : [];
assertUnique(manifestCases.map(item => item.caseId), "automation case IDs");
assertUnique(manifestCases.map(item => item.featureId), "automation feature IDs");
assertExact(manifestCases.map(item => item.caseId), exactTestIds, "native exact/implementation case IDs");
const canonicalCaseManifest = readJson(canonicalCaseManifestPath);
assert(canonicalCaseManifest.schema === "media-server.ui-fulltest-canonical-case-manifest.v1",
  "unexpected canonical Policy v4 case manifest schema");
assertExact(canonicalCaseManifest.cases.map(item => item.testId), exactTestIds,
  "canonical Policy v4/implementation case IDs");
const canonicalByTestId = new Map(canonicalCaseManifest.cases.map(item => [item.testId, item]));
assertExact(policy.classifications.negativeRoute.caseIds,
  manifestCases.filter(item => item.disposition === "negative-route").map(item => item.caseId),
  "policy/native negative route case IDs");
const manifestByFeatureId = new Map(manifestCases.map(item => [item.featureId, item]));
const implementationById = new Map(implementation.items.map(item => [item.id, item]));
for (const manifestCase of manifestCases) {
  const item = implementationById.get(manifestCase.featureId);
  const canonical = canonicalByTestId.get(manifestCase.caseId);
  assert(item, `${manifestCase.caseId} featureId mapping missing: ${manifestCase.featureId}`);
  assert(item.manualUiCaseId === manifestCase.caseId,
    `${manifestCase.caseId} featureId mismatch: manifest=${manifestCase.featureId} implementation=${item.id}`);
  assert(canonical?.featureId === manifestCase.featureId, `${manifestCase.caseId} canonical feature mismatch`);
  assert(canonical.route === manifestCase.canonicalRoute, `${manifestCase.caseId} canonical/native route mismatch`);
  assert(canonical.accountRole === manifestCase.accountRole, `${manifestCase.caseId} canonical/native role mismatch`);
  assert(canonical.theme === manifestCase.theme, `${manifestCase.caseId} canonical/native theme mismatch`);
  assert(JSON.stringify(canonical.viewport) === JSON.stringify(manifestCase.viewport),
    `${manifestCase.caseId} canonical/native viewport mismatch`);
}

const automationSummary = readJson(automationSummaryPath);
assertNotHistoricalSource(automationSummaryPath, historicalManifestPath);
const currentEvidenceAvailable = automationSummary.schema === "media-server.ui-automation-evidence.v4";
let independentQualification = null;
if (currentEvidenceAvailable) {
  validateAutomationSummary(automationSummary, automationSummaryPath);
  const qualificationPolicy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  independentQualification = evaluateEvidence(qualificationPolicy, automationSummary, {
    rootDir,
    verifyArtifacts: true,
    currentSource: {
      version: fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim(),
      gitCommit: currentHead(),
      gitBranch: execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: rootDir,
        encoding: "utf8",
      }).trim(),
      worktreePatchSha256: crypto.createHash("sha256")
        .update(execFileSync("git", ["diff", "--binary", "HEAD"], {
          cwd: rootDir,
          encoding: "utf8",
          maxBuffer: 32 * 1024 * 1024,
        }))
        .digest("hex"),
    },
  });
  assert(independentQualification.uiFulltestPass === true,
    `raw automation capture is not independently Policy v4-qualified: ${independentQualification.reasons.join(", ")}`);
  assertUnique(automationSummary.cases.map(item => item.testId), "actual automation case IDs");
  assertExact(automationSummary.cases.map(item => item.testId), manifestCases.map(item => item.caseId),
    "manifest/actual automation case IDs");
} else {
  validateCurrentEvidenceState(automationSummary);
}
const actualByCaseId = new Map(currentEvidenceAvailable
  ? automationSummary.cases.map(item => [item.testId, item])
  : []);

const rows = exactUiTests.map(implementationItem => buildMatrixRow({
  inventory: inventoryById.get(implementationItem.id),
  implementation: implementationItem,
  manifestCase: manifestByFeatureId.get(implementationItem.id),
  actualByCaseId,
  policy,
  currentEvidenceAvailable,
}));

for (const manifestCase of currentEvidenceAvailable ? manifestCases : []) {
  const row = rows.find(item => item.featureId === manifestCase.featureId);
  assert(row, `${manifestCase.caseId} featureId has no exact manual UI test mapping: ${manifestCase.featureId}`);
  assert(row.automationCaseId === manifestCase.caseId,
    `${manifestCase.caseId} exact automation case mapping missing`);
}

const counts = {
  inventoryFeatures: inventoryRows.length,
  exactUiTestIds: rows.length,
  nativeExecutablePositive: rows.filter(item => item.automationDisposition === "native-executable").length,
  negativeRouteExecutable: rows.filter(item => item.automationDisposition === "negative-route").length,
  unsupported: rows.filter(item => item.automationDisposition === "unsupported").length,
  pass: rows.filter(item => item.automationStatus === "PASS").length,
  fail: rows.filter(item => item.automationStatus === "FAIL").length,
  notRun: rows.filter(item => item.automationStatus === "not-run").length,
};
for (const [key, expected] of Object.entries(policy.expectedReadiness)) {
  assert(counts[key] === expected, `expected ${key}=${expected}, got ${counts[key]}`);
}
if (!currentEvidenceAvailable) {
  for (const [key, expected] of Object.entries(policy.defaultExecutionState)) {
    assert(counts[key] === expected, `expected default execution ${key}=${expected}, got ${counts[key]}`);
  }
}

const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const summary = {
  schema: "media-server.v390-ui-automation-coverage.v4",
  matrixValidationResult: policy.boundaries.exactNativeWorkflowReadinessComplete ? "PASS" : "REVIEW_REQUIRED",
  coverageStatus: policy.boundaries.exactNativeWorkflowReadinessComplete
    ? (currentEvidenceAvailable ? "exact-native-current-executed" : "exact-native-ready-current-not-run")
    : (policy.boundaries.visualMatrixComplete ? "policy-independence-incomplete" : "visual-and-policy-independence-incomplete"),
  selectionModel: "exact-manual-ui-test-id",
  prefixRangeClassification: "removed",
  executionEvidenceStatus: policy.boundaries.executionEvidenceStatus,
  currentEvidenceStatus: currentEvidenceAvailable ? "current-actual-execution" : automationSummary.status,
  exactNativeWorkflowReadinessComplete: policy.boundaries.exactNativeWorkflowReadinessComplete,
  canonicalRequestedObservedSchemaComplete: policy.boundaries.canonicalRequestedObservedSchemaComplete,
  primaryActionCompletionOracleComplete: policy.boundaries.primaryActionCompletionOracleComplete,
  visualMatrixComplete: policy.boundaries.visualMatrixComplete,
  policyQualifierIndependenceComplete: policy.boundaries.policyQualifierIndependenceComplete,
  actualAutomationExecutionComplete: currentEvidenceAvailable && counts.pass === rows.length,
  manualUiFulltestEvidence: policy.boundaries.manualUiFulltestEvidence,
  sourceOfTruth: {
    inventory: repoRelative(inventoryPath),
    implementationEvidence: repoRelative(implementationPath),
    policy: repoRelative(policyPath),
    automationCaseManifest: repoRelative(caseManifestPath),
    canonicalCaseManifest: repoRelative(canonicalCaseManifestPath),
    historicalManifest: repoRelative(historicalManifestPath),
    actualAutomationSummary: repoRelative(automationSummaryPath),
  },
  counts,
  rows,
};

fs.mkdirSync(outputDir, { recursive: true });
writeJson(summaryPath, summary);
const report = renderReport(summary);
fs.writeFileSync(reportPath, report, "utf8");
if (options.updateDoc) {
  const docPath = path.resolve(rootDir, options.updateDoc);
  assert(isWithinRoot(docPath), `--update-doc must stay inside repository: ${options.updateDoc}`);
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, report, "utf8");
}

console.log("");
console.log("== v3.9.0 full-feature UI automation coverage matrix summary ==");
console.log(`- schema: ${summary.schema}`);
console.log(`- matrixValidationResult: ${summary.matrixValidationResult}`);
console.log(`- coverageStatus: ${summary.coverageStatus}`);
console.log(`- selectionModel: ${summary.selectionModel}`);
console.log(`- prefixRangeClassification: ${summary.prefixRangeClassification}`);
console.log(`- inventoryFeatures: ${counts.inventoryFeatures}`);
console.log(`- exactUiTestIds: ${counts.exactUiTestIds}`);
console.log(`- nativeExecutablePositive: ${counts.nativeExecutablePositive}`);
console.log(`- negativeRouteExecutable: ${counts.negativeRouteExecutable}`);
console.log(`- unsupported: ${counts.unsupported}`);
console.log(`- pass: ${counts.pass}`);
console.log(`- notRun: ${counts.notRun}`);
console.log(`- exactNativeWorkflowReadinessComplete: ${summary.exactNativeWorkflowReadinessComplete}`);
console.log(`- actualAutomationExecutionComplete: ${summary.actualAutomationExecutionComplete}`);
console.log(`- manualUiFulltestEvidence: ${summary.manualUiFulltestEvidence}`);
console.log(`- summaryPath: ${summaryPath}`);
console.log(`- reportPath: ${reportPath}`);
if (options.updateDoc) console.log(`- durableMatrix: ${path.resolve(rootDir, options.updateDoc)}`);

function parseArgs(args) {
  const parsed = {
    outputDir: "",
    policy: "test/fixtures/v390_ui_automation_coverage_policy.json",
    automationSummary: "",
    updateDoc: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output-dir") {
      parsed.outputDir = args[index + 1] || "";
      index += 1;
    } else if (arg === "--policy") {
      parsed.policy = args[index + 1] || "";
      index += 1;
    } else if (arg === "--automation-summary") {
      parsed.automationSummary = args[index + 1] || "";
      index += 1;
    } else if (arg === "--update-doc") {
      parsed.updateDoc = args[index + 1] || "";
      index += 1;
    }
  }
  assert(parsed.outputDir, "--output-dir is required");
  assert(parsed.policy, "--policy must not be empty");
  return parsed;
}

function validatePolicyShape(value) {
  assert(value.schema === "media-server.v390-ui-automation-coverage-policy.v4",
    "unexpected coverage policy schema");
  assert(value.expectedReadiness && typeof value.expectedReadiness === "object", "policy expectedReadiness missing");
  for (const key of [
    "inventoryFeatures", "exactUiTestIds", "nativeExecutablePositive", "negativeRouteExecutable", "unsupported",
  ]) {
    assert(Number.isInteger(value.expectedReadiness[key]), `policy expectedReadiness.${key} missing`);
  }
  assert(Array.isArray(value.classifications?.negativeRoute?.caseIds), "policy negative route case IDs missing");
  assert(Array.isArray(value.requiredActualArtifacts), "policy required actual artifacts missing");
  assert(value.boundaries?.exactNativeWorkflowReadinessComplete === true,
    "policy must record exact native source readiness after REVIEW4-60");
  assert(value.boundaries?.exactProductWorkflowDesignComplete === true,
    "policy must record REVIEW4-56 exact product workflow design closure");
  assert(value.boundaries?.canonicalRequestedObservedSchemaComplete === true,
    "policy must record REVIEW4-57 requested/observed schema closure");
  assert(value.boundaries?.primaryActionCompletionOracleComplete === true,
    "policy must record REVIEW4-58 primary action completion oracle closure");
  assert(value.boundaries?.visualMatrixComplete === true,
    "policy must record REVIEW4-59 visual matrix closure");
  assert(value.boundaries?.policyQualifierIndependenceComplete === true,
    "policy must record REVIEW4-60 producer/qualifier independence closure");
  assert(value.boundaries?.actualAutomationExecutionComplete === false,
    "policy default actual execution boundary mismatch");
  assert(!Object.hasOwn(value.boundaries || {}, "fullAutomationCoverage"),
    "ambiguous fullAutomationCoverage field remains");
  assert(value.boundaries?.manualUiFulltestEvidence === false,
    "policy must not claim manual UI fulltest evidence");
  assert(value.boundaries?.readinessIsNotExecutionPass === true,
    "policy must separate readiness from execution PASS");
  assert(value.boundaries?.historicalConsumerPolicy === "deny-current-evidence",
    "policy historical consumer boundary mismatch");
}

function parseFeatureInventory(filePath) {
  const rows = [];
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map(value => value.trim());
    if (cells.length < 6 || !/^[A-Z]+-\d{3}$/.test(cells[0] || "")) continue;
    rows.push({
      id: cells[0],
      feature: cells[1],
      uiNeed: cells[2],
      testNeed: cells[3],
      testAreas: splitAreas(cells[4]),
      expectedEvidence: cells[5],
    });
  }
  assert(rows.length > 0, "no feature inventory rows found");
  return rows;
}

function validateInventoryImplementationPair(inventory, implementationItem) {
  assert(inventory, `${implementationItem.id} inventory row missing`);
  assert(implementationItem.feature === inventory.feature, `${inventory.id} feature drift`);
  assert(implementationItem.uiNeed === inventory.uiNeed, `${inventory.id} uiNeed drift`);
  assert(implementationItem.testNeed === inventory.testNeed, `${inventory.id} testNeed drift`);
  assertExact(implementationItem.testAreas, inventory.testAreas, `${inventory.id} testAreas`);
  const requiresManualUiTest = inventory.testAreas.includes("UI");
  if (requiresManualUiTest) {
    assert(typeof implementationItem.manualUiCaseId === "string" && implementationItem.manualUiCaseId.length > 0,
      `${inventory.id} manualUiCaseId missing`);
    assert(implementationItem.uiEvidence, `${inventory.id} UI evidence missing`);
    validateRouteActionSourceMapping(inventory.id, implementationItem);
  } else {
    assert(implementationItem.manualUiCaseId === null,
      `${inventory.id} without UI test area must not declare manualUiCaseId`);
  }
  assert(implementationItem.verifierEvidence?.command,
    `${inventory.id} stability verifier command missing`);
  assert(implementationItem.verifierEvidence?.anchor,
    `${inventory.id} stability verifier assertion anchor missing`);
}

function validateRouteActionSourceMapping(featureId, implementationItem) {
  const uiEvidence = implementationItem.uiEvidence;
  const semantic = implementationItem.semanticEvidence;
  assert(implementationItem.status === "semantic-reviewed" && implementationItem.review?.decision === "approved",
    `${featureId} semantic review approval missing`);
  assert(semantic?.handler && semantic?.actionHandler && semantic?.stateOracle?.locator,
    `${featureId} semantic handler/action/state mapping missing`);
  assert(typeof uiEvidence.screenRoute === "string" && uiEvidence.screenRoute.startsWith("/"),
    `${featureId} route/action source mapping invalid: screenRoute missing`);
  assert(typeof uiEvidence.anchor === "string" && uiEvidence.anchor.length > 0,
    `${featureId} route/action source mapping invalid: control/action anchor missing`);
  const sourcePath = path.resolve(rootDir, uiEvidence.file || "");
  assert(isWithinRoot(sourcePath) && fs.existsSync(sourcePath),
    `${featureId} route/action source mapping invalid: source file missing`);
  const source = fs.readFileSync(sourcePath, "utf8");
  assert(source.includes(uiEvidence.anchor),
    `${featureId} route/action source mapping invalid: action anchor drift`);
  assert(productUiRouteSource().includes(uiEvidence.screenRoute),
    `${featureId} route/action source mapping invalid: route drift`);
}

function productUiRouteSource() {
  if (cachedProductUiRouteSource !== null) return cachedProductUiRouteSource;
  const ingressDir = path.join(rootDir, "src/ingress");
  cachedProductUiRouteSource = fs.readdirSync(ingressDir)
    .filter(name => /^(?:product_ui_.*|webrtc_http_server|http_auth)\.(?:cpp|hpp)$/.test(name))
    .map(name => fs.readFileSync(path.join(ingressDir, name), "utf8"))
    .join("\n");
  return cachedProductUiRouteSource;
}

function validateAutomationSummary(value, summaryPathValue) {
  assert(value.schema === "media-server.ui-automation-evidence.v4", "unexpected actual automation summary schema");
  assert(value.result === "CAPTURED", `actual automation producer must report raw CAPTURED, got ${value.result}`);
  assert(value.uiFulltestPass === false, "raw automation producer cannot declare UI fulltest PASS");
  assert(value.contractFixture !== true && value.fixture === false, "fixture cannot be current actual evidence");
  assert(value.executionKind === "actual-native-visible-dom", "actual automation execution kind mismatch");
  assert(value.selectedAdapter?.engine === "playwright-native" && value.selectedAdapter?.fallbackUsed === false,
    "actual automation must use native Playwright evidence");
  assert(value.manualIntervention === false, "actual automation manualIntervention must be false");
  assert(value.coverage?.fail === 0 && value.coverage?.notRun === 0 && value.coverage?.unsupported === 0,
    "actual automation must have fail/notRun/unsupported=0");
  assert(Array.isArray(value.cases), "actual automation cases missing");
  assert(value.sourceBinding?.currentSourceVerified !== true && value.sourceBinding?.sourceFingerprintOnly === true,
    "raw producer must expose fingerprints without a current-source self-claim");
  assert(value.sourceBinding?.gitCommit === currentHead(), "actual automation source commit is stale");
  if (value.artifactIntegrity !== undefined) {
    assert(value.artifactIntegrity?.placeholderVideoFiles === 0, "actual automation placeholder video remains");
  }
  assertNotHistoricalSource(summaryPathValue,
    path.join(rootDir, "docs/release-artifacts/v3.9.0/historical-invalid-ui-evidence.json"));
}

function validateCurrentEvidenceState(value) {
  assert(value.schema === "media-server.v390-ui-current-evidence-state.v2",
    "unexpected current UI evidence state schema");
  assert(value.sourceKind === "current-not-run-state", "current UI evidence source kind mismatch");
  assert(value.status === "not-run", "current UI evidence state must remain not-run without a new execution");
  assert(value.actualBrowserExecution === false && value.uiFulltestPass === false,
    "not-run current UI state cannot claim execution or PASS");
  assert(value.readiness?.exactUiTestIds === 424 && value.readiness?.nativeExecutablePositive === 423 &&
    value.readiness?.negativeRouteExecutable === 1 && value.readiness?.unsupported === 0,
  "current UI readiness counts mismatch");
  assert(value.execution?.pass === 0 && value.execution?.fail === 0 && value.execution?.notRun === 424 &&
    value.execution?.unsupported === 0, "current UI execution counts mismatch");
  assert(value.readiness?.status === "exact-native-ready-current-not-run" && value.readiness?.complete === true &&
    value.readiness?.canonicalRequestedObservedSchemaComplete === true &&
    value.readiness?.primaryActionCompletionOracleComplete === true &&
    value.readiness?.visualMatrixComplete === true &&
    value.readiness?.policyQualifierIndependenceComplete === true,
  "current UI readiness stage closure mismatch");
  for (const binding of [value.canonicalCaseManifest, value.nativeExactManifest, value.visualMatrixPlan]) {
    const resolved = path.resolve(rootDir, binding?.path || "");
    assert(fs.existsSync(resolved), `current UI bound manifest missing: ${binding?.path || ""}`);
    assert(sha256File(resolved) === binding.sha256, `current UI bound manifest hash mismatch: ${binding.path}`);
  }
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
}

function buildMatrixRow({ inventory, implementation, manifestCase, actualByCaseId, policy: currentPolicy, currentEvidenceAvailable }) {
  const semantic = implementation.semanticEvidence;
  const reviewedScreenRoute = semantic.controlSelector?.screenRoute ||
    (semantic.route?.applicability === "http-or-product-route" ? semantic.route.value : implementation.uiEvidence.screenRoute);
  const screenRoute = manifestCase?.screenRoute || reviewedScreenRoute;
  const controlAction = semantic.controlSelector?.value || semantic.actionHandler.symbol;
  const base = {
    testId: implementation.manualUiCaseId,
    featureId: implementation.id,
    feature: inventory.feature,
    route: screenRoute,
    controlAction,
    controlActionAnchor: semantic.actionHandler.anchor,
    expectedResult: inventory.expectedEvidence,
    stabilityVerifier: {
      command: semantic.verifierAssertion.command,
      assertionAnchor: semantic.verifierAssertion.assertionAnchor,
      file: semantic.verifierAssertion.file,
      assertedSemanticDigest: semantic.verifierAssertion.assertedSemanticDigest,
    },
    automationCaseId: manifestCase?.caseId || null,
    automationDisposition: manifestCase?.disposition || "unsupported",
    automationStatus: "not-run",
    actualResult: "not-run",
    unsupportedReasonCode: "",
    unsupportedReason: policy.boundaries.exactNativeWorkflowReadinessComplete
      ? "native exact workflow ready; current execution not run"
      : "native exact workflow source readiness incomplete; current execution not run",
    targetSelector: manifestCase?.controlAction?.targetSelector || "",
    evidence: emptyEvidence(),
  };

  if (!manifestCase) return base;
  assert(manifestCase.featureId === implementation.id,
    `${manifestCase.caseId} featureId mismatch: manifest=${manifestCase.featureId} implementation=${implementation.id}`);
  if (!currentEvidenceAvailable) return base;
  const actualCase = actualByCaseId.get(manifestCase.caseId);
  assert(actualCase, `${manifestCase.caseId} actual automation case missing`);
  assert(actualCase.featureId === manifestCase.featureId,
    `${manifestCase.caseId} featureId mismatch: manifest=${manifestCase.featureId} actual=${actualCase.featureId}`);
  assert(actualCase.requested?.route === manifestCase.canonicalRoute,
    `${manifestCase.caseId} canonical requested route mismatch`);
  assert(actualCase.observed?.screenRoute === manifestCase.observedProjection?.screenRoute,
    `${manifestCase.caseId} runtime observed screen route mismatch`);
  assert(actualCase.rawOutcome === "completed", `${manifestCase.caseId} raw outcome must be completed`);
  assert(independentQualification?.qualifiedCaseIds?.includes(manifestCase.caseId),
    `${manifestCase.caseId} is not independently Policy v4-qualified`);

  const evidence = {};
  for (const artifactKey of currentPolicy.requiredActualArtifacts) {
    const producerArtifactKey = artifactKey === "console" ? "browserConsole" : artifactKey;
    const artifact = actualCase.artifacts?.[producerArtifactKey];
    const artifactPath = artifact?.path || "";
    assert(typeof artifactPath === "string" && artifactPath.length > 0,
      `${manifestCase.caseId} ${artifactKey} missing`);
    const artifactRoot = path.resolve(rootDir, String(automationSummary.sourceBinding?.artifactRoot || ""));
    const absolutePath = path.resolve(artifactRoot, artifactPath);
    assert(fs.existsSync(absolutePath), `${manifestCase.caseId} ${artifactKey} does not exist: ${artifactPath}`);
    assert(isWithin(artifactRoot, absolutePath), `${manifestCase.caseId} ${artifactKey} escapes artifact root`);
    assert(sha256File(absolutePath) === artifact.sha256, `${manifestCase.caseId} ${artifactKey} hash mismatch`);
    evidence[artifactKey] = repoRelative(absolutePath);
  }

  return {
    ...base,
    automationCaseId: manifestCase.caseId,
    automationDisposition: manifestCase.disposition,
    automationStatus: "PASS",
    actualResult: "policy-v4-independently-qualified",
    unsupportedReasonCode: "",
    unsupportedReason: "",
    targetSelector: manifestCase.controlAction?.targetSelector || "",
    evidence,
  };
}

function renderReport(value) {
  const lines = [
    "# v3.9.0 Full-Feature UI Automation Coverage Matrix",
    "",
    "이 문서는 986개 feature inventory의 reviewed implementation manifest에서 exact manual UI test ID를 선택하고 historical capability classification과 current not-run state를 분리해 생성합니다.",
    "Feature ID prefix와 numeric range는 coverage 판정에 사용하지 않습니다. REVIEW4-56~60 source readiness는 완료됐지만 current actual browser execution은 not-run이며 full automation 또는 UI 풀테스트 PASS가 아닙니다.",
    "",
    `schema: \`${value.schema}\``,
    `matrixValidationResult: \`${value.matrixValidationResult}\``,
    `coverageStatus: \`${value.coverageStatus}\``,
    `selectionModel: \`${value.selectionModel}\``,
    `prefixRangeClassification: \`${value.prefixRangeClassification}\``,
    `executionEvidenceStatus: \`${value.executionEvidenceStatus}\``,
    `currentEvidenceStatus: \`${value.currentEvidenceStatus}\``,
    `exactNativeWorkflowReadinessComplete: \`${value.exactNativeWorkflowReadinessComplete}\``,
    `canonicalRequestedObservedSchemaComplete: \`${value.canonicalRequestedObservedSchemaComplete}\``,
    `primaryActionCompletionOracleComplete: \`${value.primaryActionCompletionOracleComplete}\``,
    `visualMatrixComplete: \`${value.visualMatrixComplete}\``,
    `policyQualifierIndependenceComplete: \`${value.policyQualifierIndependenceComplete}\``,
    `actualAutomationExecutionComplete: \`${value.actualAutomationExecutionComplete}\``,
    `manualUiFulltestEvidence: \`${value.manualUiFulltestEvidence}\``,
    "",
    `- inventory features \`${value.counts.inventoryFeatures}\``,
    `- exact UI test IDs \`${value.counts.exactUiTestIds}\``,
    `- native-executable-positive \`${value.counts.nativeExecutablePositive}\``,
    `- negative-route-executable \`${value.counts.negativeRouteExecutable}\``,
    `- unsupported \`${value.counts.unsupported}\``,
    `- executed-pass \`${value.counts.pass}\``,
    `- not-run \`${value.counts.notRun}\``,
    "",
    "## Source of Truth",
    "",
    `- inventory: \`${value.sourceOfTruth.inventory}\``,
    `- implementation evidence: \`${value.sourceOfTruth.implementationEvidence}\``,
    `- policy: \`${value.sourceOfTruth.policy}\``,
    `- automation manifest: \`${value.sourceOfTruth.automationCaseManifest}\``,
    `- actual summary: \`${value.sourceOfTruth.actualAutomationSummary}\``,
    "",
    "## Matrix",
    "",
    "| test ID | feature ID | feature | route | control/action anchor | stability verifier | automation case ID | disposition | actualResult | artifact/log | reason |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of value.rows) {
    const artifacts = Object.values(row.evidence).filter(Boolean)
      .map(repoPath => `\`${repoPath}\``).join("<br>") || "-";
    const reason = row.unsupportedReason
      ? `${row.unsupportedReasonCode}: ${row.unsupportedReason}`
      : "actual native visible-DOM evidence";
    const verifier = `\`${row.stabilityVerifier.command}\`<br>\`${escapeCell(row.stabilityVerifier.assertionAnchor)}\``;
    const automationCaseId = row.automationCaseId ? `\`${row.automationCaseId}\`` : "-";
    lines.push(`| ${row.testId} | ${row.featureId} | ${escapeCell(row.feature)} | \`${escapeCell(row.route)}\` | ${escapeCell(row.controlAction)}<br>\`${escapeCell(row.controlActionAnchor)}\` | ${verifier} | ${automationCaseId} | ${row.automationDisposition} | ${escapeCell(row.automationStatus)}: ${escapeCell(row.actualResult)} | ${artifacts} | ${escapeCell(reason)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function splitAreas(value) {
  return String(value).split(",").map(item => item.trim()).filter(Boolean);
}

function emptyEvidence() {
  return { screenshot: "", trace: "", console: "", serverLog: "", visualMeasurement: "", visualDiff: "" };
}

function assertNotHistoricalSource(summaryPathValue, manifestPath) {
  const historical = readJson(manifestPath);
  assert(historical.schema === "media-server.v390-historical-invalid-ui-evidence.v2",
    "historical evidence manifest schema mismatch");
  assert(historical.sourceKind === "audit-only-historical" && historical.consumerPolicy === "deny-current-evidence",
    "historical evidence consumer policy mismatch");
  const summaryReal = fs.realpathSync(path.resolve(summaryPathValue));
  for (const item of historical.roots || []) {
    const rootPath = path.resolve(rootDir, item.path);
    if (!fs.existsSync(rootPath)) continue;
    const rootReal = fs.realpathSync(rootPath);
    assert(!isWithin(rootReal, summaryReal), `audit-only historical UI summary cannot be current evidence: ${item.path}`);
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertUnique(values, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  assert(duplicates.size === 0, `duplicate ${label}: ${[...duplicates].join(", ")}`);
}

function assertExact(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: expected=${expected.join(",")} actual=${actual.join(",")}`);
}

function resolveRootPath(value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function resolvePolicySource(value, owningPolicyPath) {
  if (path.isAbsolute(value)) return path.resolve(value);
  const rootCandidate = path.resolve(rootDir, value);
  if (fs.existsSync(rootCandidate)) return rootCandidate;
  return path.resolve(path.dirname(owningPolicyPath), value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function repoRelative(filePath) {
  const relative = path.relative(rootDir, path.resolve(filePath));
  return relative.split(path.sep).join("/");
}

function isWithinRoot(filePath) {
  const relative = path.relative(rootDir, path.resolve(filePath));
  return relative !== "" && !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." && !path.isAbsolute(relative);
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
