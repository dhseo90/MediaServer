#!/usr/bin/env node
// 파일 용도: 974개 feature inventory의 exact UI test ID와 actual v3.9 UI evidence를 대조한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

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
const automationSummaryPath = options.automationSummary
  ? resolveRootPath(options.automationSummary)
  : resolvePolicySource(policy.actualAutomationSummarySource, policyPath);

const inventoryRows = parseFeatureInventory(inventoryPath);
assertUnique(inventoryRows.map(item => item.id), "inventory feature IDs");

const implementation = readJson(implementationPath);
assert(implementation.schema === "media-server.feature-implementation-evidence.v1",
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
assert(caseManifest.schema === "media-server.v390-ui-automation-cases.v3",
  "unexpected automation case manifest schema");
const manifestCases = Array.isArray(caseManifest.cases) ? caseManifest.cases : [];
assertUnique(manifestCases.map(item => item.caseId), "automation case IDs");
assertUnique(manifestCases.map(item => item.featureId), "automation feature IDs");
assertExact(manifestCases.map(item => item.caseId), policy.classifications.automated.caseIds,
  "policy/manifest automation case IDs");
const manifestByFeatureId = new Map(manifestCases.map(item => [item.featureId, item]));

const automationSummary = readJson(automationSummaryPath);
validateAutomationSummary(automationSummary);
assertUnique(automationSummary.cases.map(item => item.caseId), "actual automation case IDs");
assertExact(automationSummary.cases.map(item => item.caseId), manifestCases.map(item => item.caseId),
  "manifest/actual automation case IDs");
const actualByCaseId = new Map(automationSummary.cases.map(item => [item.caseId, item]));

const exclusionByTestId = new Map();
for (const exclusion of policy.classifications.excludedPositiveUi) {
  assert(!exclusionByTestId.has(exclusion.id), `duplicate positive UI exclusion: ${exclusion.id}`);
  exclusionByTestId.set(exclusion.id, exclusion);
}
for (const testId of exclusionByTestId.keys()) {
  assert(exactTestIds.includes(testId), `positive UI exclusion references unknown exact test ID: ${testId}`);
}

const rows = exactUiTests.map(implementationItem => buildMatrixRow({
  inventory: inventoryById.get(implementationItem.id),
  implementation: implementationItem,
  manifestCase: manifestByFeatureId.get(implementationItem.id),
  actualByCaseId,
  exclusion: exclusionByTestId.get(implementationItem.manualUiCaseId),
  policy,
}));

for (const manifestCase of manifestCases) {
  const row = rows.find(item => item.featureId === manifestCase.featureId);
  assert(row, `${manifestCase.caseId} featureId has no exact manual UI test mapping: ${manifestCase.featureId}`);
  assert(row.automationCaseId === manifestCase.caseId,
    `${manifestCase.caseId} exact automation case mapping missing`);
}

const counts = {
  inventoryFeatures: inventoryRows.length,
  exactUiTestIds: rows.length,
  automated: rows.filter(item => item.automationDisposition === "automated").length,
  unsupportedManual: rows.filter(item => item.automationDisposition === "unsupported-manual").length,
  excludedPositiveUi: rows.filter(item => item.automationDisposition === "excluded-positive-ui").length,
};
for (const [key, expected] of Object.entries(policy.expectedCounts)) {
  assert(counts[key] === expected, `expected ${key}=${expected}, got ${counts[key]}`);
}

const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const summary = {
  schema: "media-server.v390-ui-automation-coverage.v2",
  matrixValidationResult: "PASS",
  coverageStatus: "mapped-with-explicit-gaps",
  selectionModel: "exact-manual-ui-test-id",
  prefixRangeClassification: "removed",
  executionEvidenceStatus: policy.boundaries.executionEvidenceStatus,
  fullAutomationCoverage: policy.boundaries.fullAutomationCoverage,
  manualUiFulltestEvidence: policy.boundaries.manualUiFulltestEvidence,
  sourceOfTruth: {
    inventory: repoRelative(inventoryPath),
    implementationEvidence: repoRelative(implementationPath),
    policy: repoRelative(policyPath),
    automationCaseManifest: repoRelative(caseManifestPath),
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
console.log(`- automated: ${counts.automated}`);
console.log(`- unsupportedManual: ${counts.unsupportedManual}`);
console.log(`- excludedPositiveUi: ${counts.excludedPositiveUi}`);
console.log(`- fullAutomationCoverage: ${summary.fullAutomationCoverage}`);
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
  assert(value.schema === "media-server.v390-ui-automation-coverage-policy.v2",
    "unexpected coverage policy schema");
  assert(value.expectedCounts && typeof value.expectedCounts === "object", "policy expectedCounts missing");
  for (const key of [
    "inventoryFeatures", "exactUiTestIds", "automated", "unsupportedManual", "excludedPositiveUi",
  ]) {
    assert(Number.isInteger(value.expectedCounts[key]), `policy expectedCounts.${key} missing`);
  }
  assert(Array.isArray(value.classifications?.automated?.caseIds), "policy automated case IDs missing");
  assert(Array.isArray(value.classifications?.excludedPositiveUi), "policy excludedPositiveUi missing");
  assert(value.unsupportedManual?.reasonCode && value.unsupportedManual?.reason,
    "policy unsupportedManual reason missing");
  assert(Array.isArray(value.requiredAutomatedArtifacts), "policy requiredAutomatedArtifacts missing");
  assert(value.boundaries?.fullAutomationCoverage === false, "policy must not claim full automation coverage");
  assert(value.boundaries?.manualUiFulltestEvidence === false,
    "policy must not claim manual UI fulltest evidence");
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
    validateRouteActionSourceMapping(inventory.id, implementationItem.uiEvidence);
  } else {
    assert(implementationItem.manualUiCaseId === null,
      `${inventory.id} without UI test area must not declare manualUiCaseId`);
  }
  assert(implementationItem.verifierEvidence?.command,
    `${inventory.id} stability verifier command missing`);
  assert(implementationItem.verifierEvidence?.anchor,
    `${inventory.id} stability verifier assertion anchor missing`);
}

function validateRouteActionSourceMapping(featureId, uiEvidence) {
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

function validateAutomationSummary(value) {
  assert(value.schema === "media-server.v390-ui-automation.v1", "unexpected actual automation summary schema");
  assert(value.result === "PASS", `actual automation summary must PASS, got ${value.result}`);
  assert(value.automationResult === "PASS", "actual automationResult must PASS");
  assert(value.assertionModel === "visible-dom-user-action-v1", "actual automation assertion model mismatch");
  assert(value.selectedAdapter?.engine === "playwright-native", "actual automation must use native Playwright evidence");
  assert(value.selectedAdapter?.fallbackUsed === false, "actual automation fallback evidence is not accepted");
  assert(value.manualIntervention === false, "actual automation manualIntervention must be false");
  assert(value.fail === 0 && value.notRun === 0, "actual automation must have fail=0 and notRun=0");
  assert(Array.isArray(value.cases), "actual automation cases missing");
}

function buildMatrixRow({ inventory, implementation, manifestCase, actualByCaseId, exclusion, policy: currentPolicy }) {
  const base = {
    testId: implementation.manualUiCaseId,
    featureId: implementation.id,
    feature: inventory.feature,
    route: implementation.uiEvidence.screenRoute,
    controlAction: implementation.uiEvidence.anchor,
    controlActionAnchor: implementation.uiEvidence.anchor,
    expectedResult: inventory.expectedEvidence,
    stabilityVerifier: {
      command: implementation.verifierEvidence.command,
      assertionAnchor: implementation.verifierEvidence.anchor,
      file: implementation.verifierEvidence.file,
    },
    automationCaseId: null,
    automationDisposition: exclusion ? "excluded-positive-ui" : "unsupported-manual",
    automationStatus: exclusion ? "not-applicable" : "not-run",
    actualResult: exclusion ? "not-applicable" : "not-run",
    unsupportedReasonCode: exclusion?.reasonCode || currentPolicy.unsupportedManual.reasonCode,
    unsupportedReason: exclusion?.reason || currentPolicy.unsupportedManual.reason,
    targetSelector: "",
    evidence: emptyEvidence(),
  };

  if (!manifestCase) return base;
  assert(!exclusion, `${implementation.id} cannot be both automated and excluded`);
  const actualCase = actualByCaseId.get(manifestCase.caseId);
  assert(actualCase, `${manifestCase.caseId} actual automation case missing`);
  assert(actualCase.featureId === manifestCase.featureId,
    `${manifestCase.caseId} featureId mismatch: manifest=${manifestCase.featureId} actual=${actualCase.featureId}`);
  assert(manifestCase.featureId === implementation.id,
    `${manifestCase.caseId} featureId mismatch: manifest=${manifestCase.featureId} implementation=${implementation.id}`);
  assert(manifestCase.route === implementation.uiEvidence.screenRoute,
    `${manifestCase.caseId} route mismatch: manifest=${manifestCase.route} implementation=${implementation.uiEvidence.screenRoute}`);
  assert(actualCase.route === manifestCase.route,
    `${manifestCase.caseId} route mismatch: actual=${actualCase.route} manifest=${manifestCase.route}`);
  assert(actualCase.controlAction === manifestCase.controlAction,
    `${manifestCase.caseId} controlAction mismatch`);
  assert(actualCase.status === "PASS", `${manifestCase.caseId} actual status must PASS, got ${actualCase.status}`);
  assert(actualCase.actualResult, `${manifestCase.caseId} actualResult missing`);
  assert(actualCase.manualIntervention === false, `${manifestCase.caseId} manualIntervention must be false`);

  const evidence = {};
  const artifactMapping = {
    screenshotPath: "screenshot",
    tracePath: "trace",
    videoPath: "video",
    browserConsolePath: "browserConsole",
    serverLogReference: "serverLog",
  };
  for (const artifactKey of currentPolicy.requiredAutomatedArtifacts) {
    const artifactPath = actualCase[artifactKey];
    assert(typeof artifactPath === "string" && artifactPath.length > 0,
      `${manifestCase.caseId} ${artifactKey} missing`);
    const absolutePath = path.isAbsolute(artifactPath) ? path.resolve(artifactPath) : path.resolve(rootDir, artifactPath);
    assert(fs.existsSync(absolutePath), `${manifestCase.caseId} ${artifactKey} does not exist: ${artifactPath}`);
    assert(isWithinRoot(absolutePath), `${manifestCase.caseId} ${artifactKey} must stay inside repository`);
    evidence[artifactMapping[artifactKey]] = repoRelative(absolutePath);
  }

  return {
    ...base,
    controlAction: actualCase.controlAction,
    automationCaseId: manifestCase.caseId,
    automationDisposition: "automated",
    automationStatus: actualCase.status,
    actualResult: actualCase.actualResult,
    unsupportedReasonCode: "",
    unsupportedReason: "",
    targetSelector: actualCase.targetSelector || manifestCase.targetSelector || "",
    evidence,
  };
}

function renderReport(value) {
  const lines = [
    "# v3.9.0 Full-Feature UI Automation Coverage Matrix",
    "",
    "이 문서는 974개 feature inventory의 reviewed implementation manifest에서 exact manual UI test ID를 선택하고 actual native visible-DOM evidence를 교차 검증해 생성합니다.",
    "Feature ID prefix와 numeric range는 coverage 판정에 사용하지 않습니다. Matrix validation PASS는 full automation 또는 UI 풀테스트 직접 조작 PASS가 아닙니다.",
    "",
    `schema: \`${value.schema}\``,
    `matrixValidationResult: \`${value.matrixValidationResult}\``,
    `coverageStatus: \`${value.coverageStatus}\``,
    `selectionModel: \`${value.selectionModel}\``,
    `prefixRangeClassification: \`${value.prefixRangeClassification}\``,
    `executionEvidenceStatus: \`${value.executionEvidenceStatus}\``,
    `fullAutomationCoverage: \`${value.fullAutomationCoverage}\``,
    `manualUiFulltestEvidence: \`${value.manualUiFulltestEvidence}\``,
    "",
    `- inventory features \`${value.counts.inventoryFeatures}\``,
    `- exact UI test IDs \`${value.counts.exactUiTestIds}\``,
    `- automated \`${value.counts.automated}\``,
    `- unsupported-manual \`${value.counts.unsupportedManual}\``,
    `- excluded-positive-ui \`${value.counts.excludedPositiveUi}\``,
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
  return { screenshot: "", trace: "", video: "", browserConsole: "", serverLog: "" };
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
