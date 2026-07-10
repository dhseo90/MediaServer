#!/usr/bin/env node
// 파일 용도: current UI inventory와 실제 v3.9 UI evidence를 대조해 route/control/action coverage matrix를 생성한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation coverage matrix

Usage:
  ./server.sh verify-v390-ui-automation-coverage --output-dir <path> [options]

Options:
  --output-dir <path>          summary.json과 report.md 출력 경로
  --policy <path>              coverage policy JSON. 기본 test/fixtures/v390_ui_automation_coverage_policy.json
  --automation-summary <path>  실제 UI automation summary override
  --update-doc <path>          검증된 Markdown matrix를 지정 문서에도 기록
  -h, --help                   도움말 출력

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

const inventoryRows = parseUiInventory(inventoryPath);
const expectedIds = expandRange(policy.expectedUiIdRange.start, policy.expectedUiIdRange.end);
assertExactIds(inventoryRows.map(item => item.id), expectedIds, "inventory UI IDs");

const implementation = readJson(implementationPath);
const implementationById = new Map((implementation.items || []).map(item => [item.id, item]));
const caseManifest = readJson(caseManifestPath);
assert(caseManifest.schema === "media-server.v390-ui-automation-cases.v3", "unexpected automation case manifest schema");
const manifestCases = Array.isArray(caseManifest.cases) ? caseManifest.cases : [];
const manifestById = new Map(manifestCases.map(item => [item.caseId, item]));

const automationSummary = readJson(automationSummaryPath);
validateAutomationSummary(automationSummary);
const actualById = new Map(automationSummary.cases.map(item => [item.caseId, item]));
const classifications = buildClassifications(policy, expectedIds);

const automatedIds = policy.classifications.automated.ids;
assertExactIds(manifestCases.map(item => item.caseId), automatedIds, "automation case manifest IDs");
assertExactIds(automationSummary.cases.map(item => item.caseId), automatedIds, "actual automation summary IDs");

const rows = inventoryRows.map(item => buildMatrixRow({
  inventory: item,
  implementation: implementationById.get(item.id),
  classification: classifications.get(item.id),
  manifestCase: manifestById.get(item.id),
  actualCase: actualById.get(item.id),
  policy,
}));

const counts = {
  inventoryUiIds: rows.length,
  automated: rows.filter(item => item.automationDisposition === "automated").length,
  unsupportedManual: rows.filter(item => item.automationDisposition === "unsupported-manual").length,
  excludedPositiveUi: rows.filter(item => item.automationDisposition === "excluded-positive-ui").length,
  manualUiFulltestRequired: rows.filter(item => item.manualUiFulltestRequired).length,
};

assert(counts.inventoryUiIds === 115, `expected 115 current UI IDs, got ${counts.inventoryUiIds}`);
assert(counts.automated === 8, `expected 8 automated IDs, got ${counts.automated}`);
assert(counts.unsupportedManual === 106, `expected 106 unsupported/manual IDs, got ${counts.unsupportedManual}`);
assert(counts.excludedPositiveUi === 1, `expected 1 positive UI exclusion, got ${counts.excludedPositiveUi}`);

const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const summary = {
  schema: "media-server.v390-ui-automation-coverage.v1",
  matrixValidationResult: "PASS",
  coverageStatus: "mapped-with-explicit-gaps",
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
console.log("== v3.9.0 UI automation coverage matrix summary ==");
console.log(`- schema: ${summary.schema}`);
console.log(`- matrixValidationResult: ${summary.matrixValidationResult}`);
console.log(`- coverageStatus: ${summary.coverageStatus}`);
console.log(`- inventoryUiIds: ${counts.inventoryUiIds}`);
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
  assert(value.schema === "media-server.v390-ui-automation-coverage-policy.v1", "unexpected coverage policy schema");
  assert(value.expectedUiIdRange?.start && value.expectedUiIdRange?.end, "policy expectedUiIdRange missing");
  assert(Array.isArray(value.classifications?.automated?.ids), "policy automated IDs missing");
  assert(value.classifications?.unsupportedManual?.range, "policy unsupportedManual range missing");
  assert(Array.isArray(value.classifications?.excludedPositiveUi), "policy excludedPositiveUi missing");
  assert(Array.isArray(value.requiredAutomatedArtifacts), "policy requiredAutomatedArtifacts missing");
  assert(value.boundaries?.fullAutomationCoverage === false, "policy must not claim full automation coverage");
  assert(value.boundaries?.manualUiFulltestEvidence === false, "policy must not claim manual UI fulltest evidence");
}

function parseUiInventory(filePath) {
  const rows = [];
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!/^\| UI-\d{3} \|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(value => value.trim());
    assert(cells.length >= 6, `invalid UI inventory row: ${line}`);
    rows.push({
      id: cells[0],
      feature: cells[1],
      uiNeed: cells[2],
      testNeed: cells[3],
      testAreas: cells[4].split(",").map(value => value.trim()).filter(Boolean),
      expectedEvidence: cells[5],
    });
  }
  assert(rows.length > 0, "no UI inventory rows found");
  return rows;
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

function buildClassifications(value, inventoryIds) {
  const map = new Map();
  const automated = value.classifications.automated;
  for (const id of automated.ids) {
    addClassification(map, id, {
      disposition: "automated",
      reasonCode: automated.reasonCode,
      reason: "native visible-DOM actual summary와 artifact/log가 보존된 exact-selector automation case",
    });
  }

  const unsupported = value.classifications.unsupportedManual;
  const excludedFromUnsupported = new Set(unsupported.exclude || []);
  for (const id of expandRange(unsupported.range.start, unsupported.range.end)) {
    if (excludedFromUnsupported.has(id)) continue;
    addClassification(map, id, {
      disposition: "unsupported-manual",
      reasonCode: unsupported.reasonCode,
      reason: unsupported.reason,
    });
  }

  for (const item of value.classifications.excludedPositiveUi) {
    addClassification(map, item.id, {
      disposition: "excluded-positive-ui",
      reasonCode: item.reasonCode,
      reason: item.reason,
    });
  }

  const unclassified = inventoryIds.filter(id => !map.has(id));
  const unknown = [...map.keys()].filter(id => !inventoryIds.includes(id));
  assert(unclassified.length === 0, `unclassified inventory UI IDs: ${unclassified.join(", ")}`);
  assert(unknown.length === 0, `policy references unknown UI IDs: ${unknown.join(", ")}`);
  return map;
}

function addClassification(map, id, value) {
  assert(!map.has(id), `duplicate coverage classification: ${id}`);
  map.set(id, value);
}

function buildMatrixRow({ inventory, implementation, classification, manifestCase, actualCase, policy: currentPolicy }) {
  assert(implementation, `${inventory.id} implementation evidence missing`);
  const manualUiFulltestRequired = inventory.testAreas.includes("UI");
  if (manualUiFulltestRequired) {
    assert(implementation.manualUiCaseId === inventory.id, `${inventory.id} manualUiCaseId mismatch`);
  } else {
    assert(implementation.manualUiCaseId === null, `${inventory.id} stability-only UI row must not claim manualUiCaseId`);
  }
  assert(implementation.uiEvidence?.screenRoute, `${inventory.id} implementation route missing`);
  assert(implementation.uiEvidence?.anchor, `${inventory.id} implementation control/action anchor missing`);

  const base = {
    id: inventory.id,
    feature: inventory.feature,
    route: implementation.uiEvidence.screenRoute,
    controlAction: manualUiFulltestRequired ? `manual-ui-case:${inventory.id}` : `stability-only:${inventory.id}`,
    controlAnchor: implementation.uiEvidence.anchor,
    uiNeed: inventory.uiNeed,
    testAreas: inventory.testAreas,
    manualUiFulltestRequired,
    automationDisposition: classification.disposition,
    automationStatus: classification.disposition === "excluded-positive-ui" ? "not-applicable" : "not-run",
    actualResult: classification.disposition === "excluded-positive-ui" ? "not-applicable" : "not-run",
    unsupportedReasonCode: classification.reasonCode,
    unsupportedReason: classification.reason,
    evidence: emptyEvidence(),
  };

  if (classification.disposition !== "automated") {
    assert(!manifestCase && !actualCase, `${inventory.id} non-automated classification has automation evidence`);
    return base;
  }

  assert(manifestCase, `${inventory.id} automation manifest case missing`);
  assert(actualCase, `${inventory.id} actual automation case missing`);
  assert(manifestCase.route === implementation.uiEvidence.screenRoute,
    `${inventory.id} route mismatch: manifest=${manifestCase.route} implementation=${implementation.uiEvidence.screenRoute}`);
  assert(actualCase.route === implementation.uiEvidence.screenRoute,
    `${inventory.id} route mismatch: actual=${actualCase.route} implementation=${implementation.uiEvidence.screenRoute}`);
  assert(actualCase.controlAction === manifestCase.controlAction, `${inventory.id} controlAction mismatch`);
  assert(actualCase.status === "PASS", `${inventory.id} actual status must PASS, got ${actualCase.status}`);
  assert(actualCase.actualResult, `${inventory.id} actualResult missing`);
  assert(actualCase.manualIntervention === false, `${inventory.id} manualIntervention must be false`);

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
    assert(typeof artifactPath === "string" && artifactPath.length > 0, `${inventory.id} ${artifactKey} missing`);
    const absolutePath = path.isAbsolute(artifactPath) ? path.resolve(artifactPath) : path.resolve(rootDir, artifactPath);
    assert(fs.existsSync(absolutePath), `${inventory.id} ${artifactKey} does not exist: ${artifactPath}`);
    assert(isWithinRoot(absolutePath), `${inventory.id} ${artifactKey} must stay inside repository`);
    evidence[artifactMapping[artifactKey]] = repoRelative(absolutePath);
  }

  return {
    ...base,
    controlAction: actualCase.controlAction,
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
    "# v3.9.0 UI Automation Coverage Matrix",
    "",
    "이 문서는 current UI inventory와 보존된 actual native visible-DOM evidence를 교차 검증해 생성합니다.",
    "Matrix validation PASS는 full automation 또는 UI 풀테스트 직접 조작 PASS가 아닙니다.",
    "",
    `schema: \`${value.schema}\``,
    `matrixValidationResult: \`${value.matrixValidationResult}\``,
    `coverageStatus: \`${value.coverageStatus}\``,
    `executionEvidenceStatus: \`${value.executionEvidenceStatus}\``,
    `fullAutomationCoverage: \`${value.fullAutomationCoverage}\``,
    `manualUiFulltestEvidence: \`${value.manualUiFulltestEvidence}\``,
    "",
    `- inventory UI IDs \`${value.counts.inventoryUiIds}\``,
    `- automated \`${value.counts.automated}\``,
    `- unsupported-manual \`${value.counts.unsupportedManual}\``,
    `- excluded-positive-ui \`${value.counts.excludedPositiveUi}\``,
    `- manual UI fulltest required \`${value.counts.manualUiFulltestRequired}\``,
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
    "| ID | feature | route | control/action | disposition | actualResult | artifact/log | reason | manual UI |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of value.rows) {
    const artifacts = Object.values(row.evidence).filter(Boolean).map(repoPath => `\`${repoPath}\``).join("<br>") || "-";
    const reason = row.unsupportedReason
      ? `${row.unsupportedReasonCode}: ${row.unsupportedReason}`
      : "actual native visible-DOM evidence";
    lines.push(`| ${row.id} | ${escapeCell(row.feature)} | \`${escapeCell(row.route)}\` | ${escapeCell(row.controlAction)}<br>\`${escapeCell(row.controlAnchor)}\` | ${row.automationDisposition} | ${escapeCell(row.automationStatus)}: ${escapeCell(row.actualResult)} | ${artifacts} | ${escapeCell(reason)} | ${row.manualUiFulltestRequired ? "required" : "not-required-by-inventory"} |`);
  }
  return `${lines.join("\n")}\n`;
}

function emptyEvidence() {
  return { screenshot: "", trace: "", video: "", browserConsole: "", serverLog: "" };
}

function expandRange(start, end) {
  const startValue = parseUiId(start);
  const endValue = parseUiId(end);
  assert(startValue <= endValue, `invalid UI ID range: ${start}..${end}`);
  return Array.from({ length: endValue - startValue + 1 }, (_, index) => `UI-${String(startValue + index).padStart(3, "0")}`);
}

function parseUiId(value) {
  const match = String(value).match(/^UI-(\d{3})$/);
  assert(match, `invalid UI ID: ${value}`);
  return Number(match[1]);
}

function assertExactIds(actual, expected, label) {
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
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
