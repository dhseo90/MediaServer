#!/usr/bin/env node
// 파일 용도: 기능 ID별 수동 UI evidence 입력을 검증하고 PASS/FAIL 결과 행을 생성한다.
// 요약: 브라우저를 실행하지 않고 명시 evidence를 완전한 기능별 report로 변환한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Manual UI evidence runner verification

Usage:
  ./server.sh verify-manual-ui-evidence-runner [options]

Options:
  --evidence <path>     Evidence JSON exported from autonomous/manual UI work.
  --report <path>       Write a Markdown per-feature report.
  --json-report <path>  Write a JSON per-feature report.
  -h, --help            Show help.

Checks:
  - project-feature-test-inventory.md UI-target IDs are the source of truth
  - each UI-target ID is PASS or FAIL, never grouped by category
  - missing UI-target IDs are reported as FAIL
  - explicit exclusions stay outside PASS/FAIL result rows
  - PASS rows include interaction, expected/actual state, artifact, and log/event/not-applicable evidence
`);
}

assertKnownOptions(rawArgs, ["evidence", "report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const inventoryText = readText("docs/project-feature-test-inventory.md");
const rows = parseFeatureRows(inventoryText);
const uiTargetRows = rows.filter(row => hasArea(row.area, "UI"));
const checks = [];

check("inventory UI target count is stable", () => {
  assert(rows.length === 378, `expected 378 feature rows, found ${rows.length}`);
  assert(uiTargetRows.length === 240, `expected 240 UI target rows, found ${uiTargetRows.length}`);
});

check("docs wire the evidence runner boundary", () => {
  const docs = [
    readText("docs/manual-ui-fulltest.md"),
    readText("docs/manual-ui-checklist.md"),
    readText("docs/manual-ui-result-template.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  for (const snippet of [
    "verify-manual-ui-evidence-runner",
    "media-server.manual-ui-evidence-input.v1",
    "누락된 UI 대상 기능 ID는 `FAIL`",
    "제외 항목은 판정표 밖",
  ]) {
    assert(docs.includes(snippet), `docs missing runner snippet: ${snippet}`);
  }
});

check("self-test complete evidence has no FAIL rows", () => {
  const evidence = buildSyntheticEvidence(uiTargetRows);
  const report = buildReport(evidence, "synthetic-complete");
  assert(report.summary.fail === 0, `complete synthetic evidence has fail rows: ${report.summary.fail}`);
  assert(report.summary.pass === uiTargetRows.length, "complete synthetic evidence pass count mismatch");
});

check("self-test missing evidence fails every omitted UI target", () => {
  const evidence = buildSyntheticEvidence(uiTargetRows.slice(0, 1));
  const report = buildReport(evidence, "synthetic-missing");
  assert(report.summary.fail === uiTargetRows.length - 1, `missing synthetic evidence fail count mismatch: ${report.summary.fail}`);
  assert(report.results.every(row => row.verdict === "PASS" || row.verdict === "FAIL"), "result rows must use PASS/FAIL only");
});

if (args.evidence) {
  const evidencePath = path.resolve(rootDir, args.evidence);
  const evidence = readEvidence(evidencePath);
  const report = buildReport(evidence, path.relative(rootDir, evidencePath).replaceAll(path.sep, "/"));
  if (args.report) writeText(args.report, renderMarkdown(report));
  if (args.jsonReport) writeText(args.jsonReport, `${JSON.stringify(report, null, 2)}\n`);
  check("provided evidence has no FAIL rows", () => {
    assert(report.summary.fail === 0, `provided evidence has FAIL rows: ${report.summary.fail}`);
  });
}

let pass = 0;
let fail = 0;
const failures = [];
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${item.name}] ${message}`);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Manual UI evidence runner summary ==");
console.log(`- featureRows: ${rows.length}`);
console.log(`- uiTargets: ${uiTargetRows.length}`);
console.log(`- evidence: ${args.evidence ? args.evidence : "self-test only"}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (failures.length > 0) {
  console.log("- failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--evidence=")) parsed.evidence = token.slice("--evidence=".length);
    else if (token === "--evidence") parsed.evidence = argsList[++index];
    else if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--report") parsed.report = argsList[++index];
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
      };
    });
}

function hasArea(area, token) {
  return area.split(",").map(item => item.trim()).includes(token);
}

function readEvidence(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert(payload.schema === "media-server.manual-ui-evidence-input.v1", "evidence schema mismatch");
  assert(Array.isArray(payload.featureResults), "evidence featureResults must be an array");
  if (payload.exclusions !== undefined) {
    assert(Array.isArray(payload.exclusions), "evidence exclusions must be an array");
  }
  return payload;
}

function buildReport(evidence, evidenceLabel) {
  const resultById = new Map();
  for (const item of evidence.featureResults || []) {
    assert(typeof item.id === "string" && item.id, "feature result missing id");
    assert(!resultById.has(item.id), `duplicate evidence result id: ${item.id}`);
    resultById.set(item.id, item);
  }

  const exclusions = new Map();
  for (const item of evidence.exclusions || []) {
    if (!item?.id) continue;
    exclusions.set(item.id, item);
  }

  const results = [];
  const excluded = [];
  for (const row of uiTargetRows) {
    const exclusion = exclusions.get(row.id);
    if (exclusion) {
      const valid = Boolean(exclusion.reason && exclusion.scope && exclusion.approvedBy);
      excluded.push({
        id: row.id,
        feature: row.feature,
        reason: exclusion.reason || "",
        scope: exclusion.scope || "",
        approvedBy: exclusion.approvedBy || "",
        valid,
      });
      if (!valid) {
        results.push(failRow(row, "invalid explicit exclusion"));
      }
      continue;
    }

    const actual = resultById.get(row.id);
    if (!actual) {
      results.push(failRow(row, "missing UI evidence"));
      continue;
    }
    if (actual.verdict !== "PASS" && actual.verdict !== "FAIL") {
      results.push(failRow(row, `invalid verdict ${actual.verdict || "(empty)"}`));
      continue;
    }
    if (actual.verdict === "FAIL") {
      results.push(failRow(row, actual.reason || "evidence verdict FAIL"));
      continue;
    }
    const missing = missingPassFields(actual);
    if (missing.length > 0) {
      results.push(failRow(row, `PASS evidence missing ${missing.join(", ")}`));
      continue;
    }
    results.push({
      id: row.id,
      feature: row.feature,
      area: row.area,
      verdict: "PASS",
      interaction: firstText(actual.interaction, actual.action, actual.operation),
      expected: String(actual.expected),
      actual: String(actual.actual),
      evidence: evidenceSummary(actual),
    });
  }

  const summary = {
    uiTargets: uiTargetRows.length,
    pass: results.filter(row => row.verdict === "PASS").length,
    fail: results.filter(row => row.verdict === "FAIL").length,
    excluded: excluded.length,
  };
  return {
    schema: "media-server.manual-ui-evidence-report.v1",
    source: evidenceLabel,
    generatedAt: new Date().toISOString(),
    summary,
    results,
    exclusions: excluded,
  };
}

function missingPassFields(item) {
  const missing = [];
  if (!firstText(item.interaction, item.action, item.operation)) missing.push("interaction");
  if (!firstText(item.expected)) missing.push("expected");
  if (!firstText(item.actual)) missing.push("actual");
  if (item.stateReflected !== true) missing.push("stateReflected");
  if (!Array.isArray(item.artifacts) || item.artifacts.length === 0) missing.push("artifacts");
  if (item.logChecked !== true && item.eventRecordChecked !== true && !firstText(item.logNotApplicableReason)) {
    missing.push("log/event/not-applicable");
  }
  return missing;
}

function failRow(row, reason) {
  return {
    id: row.id,
    feature: row.feature,
    area: row.area,
    verdict: "FAIL",
    interaction: "",
    expected: row.pass,
    actual: reason,
    evidence: "",
  };
}

function evidenceSummary(item) {
  const artifacts = Array.isArray(item.artifacts) ? item.artifacts.join(", ") : "";
  if (item.eventRecordChecked === true) return `eventRecord; ${artifacts}`;
  if (item.logChecked === true) return `log; ${artifacts}`;
  return `not-applicable: ${item.logNotApplicableReason}; ${artifacts}`;
}

function buildSyntheticEvidence(targetRows) {
  return {
    schema: "media-server.manual-ui-evidence-input.v1",
    runId: "synthetic-self-test",
    featureResults: targetRows.map(row => ({
      id: row.id,
      verdict: "PASS",
      interaction: `synthetic interaction for ${row.id}`,
      expected: row.pass,
      actual: "synthetic state reflected",
      stateReflected: true,
      logChecked: true,
      artifacts: [`synthetic/${row.id}.png`],
    })),
    exclusions: [],
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Manual UI Evidence Runner Report",
    "",
    `- schema: ${report.schema}`,
    `- source: ${report.source}`,
    `- generatedAt: ${report.generatedAt}`,
    `- UI targets: ${report.summary.uiTargets}`,
    `- PASS: ${report.summary.pass}`,
    `- FAIL: ${report.summary.fail}`,
    `- exclusions: ${report.summary.excluded}`,
    "",
    "## Result Rows",
    "",
    "| feature ID | feature | interaction | expected | actual | verdict | evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of report.results) {
    lines.push(`| ${row.id} | ${escapeCell(row.feature)} | ${escapeCell(row.interaction)} | ${escapeCell(row.expected)} | ${escapeCell(row.actual)} | ${row.verdict} | ${escapeCell(row.evidence)} |`);
  }
  lines.push("", "## Exclusions", "");
  if (report.exclusions.length === 0) {
    lines.push("- None");
  } else {
    lines.push("| feature ID | feature | reason | scope | approvedBy | valid |", "| --- | --- | --- | --- | --- | --- |");
    for (const item of report.exclusions) {
      lines.push(`| ${item.id} | ${escapeCell(item.feature)} | ${escapeCell(item.reason)} | ${escapeCell(item.scope)} | ${escapeCell(item.approvedBy)} | ${item.valid ? "yes" : "no"} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(outputPath, content) {
  const resolved = path.resolve(rootDir, outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content);
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
