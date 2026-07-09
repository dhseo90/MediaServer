#!/usr/bin/env node
// 파일 용도: 모든 feature inventory ID가 verifier, 수동 UI 풀테스트, longrun gate, 제외 경계 중 하나에 연결되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  loadImplementationManifest,
  validateImplementationManifest,
} from "./feature_implementation_manifest_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature inventory coverage verification

Usage:
  ./server.sh verify-feature-inventory-coverage [options]

Options:
  --report <path>       Write a Markdown coverage report.
  --json-report <path>  Write a JSON coverage report.
  -h, --help            Show help.

Checks:
  - every feature ID has one exact implementation evidence manifest item
  - tracked source/UI/verifier anchors and dispatch commands exist
  - UI rows map to exact manual case IDs and product screen routes
  - 30/120-minute rows use the v3.9 canonical approval-only longrun runner
  - rows outside stability/30-minute/120-minute/UI are rejected
  - missing-ID and missing-anchor negative fixtures fail
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const inventory = readText("docs/project-feature-test-inventory.md");
const rows = parseFeatureRows(inventory);
const implementationManifest = loadImplementationManifest(rootDir);
const implementationValidation = validateImplementationManifest({
  rootDir,
  inventoryText: inventory,
  rows,
  manifest: implementationManifest,
});
const checks = [];

check("inventory row count is stable", () => {
  const declaredTotal = summaryCount(inventory, "전체 기능 항목");
  assert(rows.length === declaredTotal, `expected ${declaredTotal} feature rows, found ${rows.length}`);
  assert(new Set(rows.map(row => row.id)).size === rows.length, "duplicate feature ID exists");
});

check("inventory uses only the four approved test areas", () => {
  const allowedAreas = new Set(["안정화", "30분", "120분", "UI"]);
  for (const row of rows) {
    for (const area of splitAreas(row.area)) {
      assert(allowedAreas.has(area), `feature ${row.id} uses unsupported test area: ${area}`);
    }
  }
  const featureAreaText = rows.map(row => row.area).join("\n");
  for (const forbidden of ["필드 별도", "field 별도", "30분 조건부", "120분 조건부", "field-smoke-or-exclusion"]) {
    assert(!featureAreaText.includes(forbidden), `inventory must not contain unsupported test area wording: ${forbidden}`);
  }
});

check("coverage docs and server command are wired", () => {
  const docs = [
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
  ].join("\n");
  const server = readText("server.sh");
for (const snippet of [
    "verify-feature-inventory-coverage",
    "verify-feature-implementation-evidence",
    "media-server.feature-inventory-coverage.v1",
    "media-server.feature-implementation-evidence.v1",
    "missing coverage target",
    "coverageStatus: covered/missing",
    "executionEvidenceStatus: not-execution-evidence",
    "누락 ID는 release gate에서 FAIL",
  ]) {
    assert(docs.includes(snippet), `docs missing coverage snippet: ${snippet}`);
  }
  assert(server.includes("verify-feature-inventory-coverage"), "server.sh missing coverage command");
  assert(server.includes("verify_feature_inventory_coverage.mjs"), "server.sh missing coverage script dispatch");
  assert(server.includes("verify-feature-implementation-evidence"), "server.sh missing implementation evidence command");
});

check("exact implementation evidence manifest is valid", () => {
  assert(implementationValidation.ok, implementationValidation.errors.slice(0, 5).join("; "));
  assert(implementationValidation.summary.manifestRows === rows.length, "manifest row count mismatch");
  assert(implementationValidation.summary.sourceEvidenceRows === rows.length, "source evidence coverage mismatch");
  assert(implementationValidation.summary.verifierEvidenceRows === rows.length, "verifier evidence coverage mismatch");
});

check("all feature IDs have exact coverage targets", () => {
  const report = buildCoverageReport(rows, implementationManifest);
  assert(report.summary.missing === 0, `missing coverage targets: ${report.summary.missing}`);
});

check("negative missing-ID fixture fails", () => {
  const broken = structuredClone(implementationManifest);
  broken.items = broken.items.filter(item => item.id !== "UI-019");
  const result = validateImplementationManifest({
    rootDir,
    inventoryText: inventory,
    rows,
    manifest: broken,
  });
  assert(!result.ok, "missing-ID fixture must fail");
  assert(result.errors.some(error => error.includes("manifest missing feature ID UI-019")),
    "missing-ID fixture must identify UI-019");
});

const report = buildCoverageReport(rows, implementationManifest);
if (args.report) writeText(args.report, renderMarkdown(report));
if (args.jsonReport) writeText(args.jsonReport, `${JSON.stringify(report, null, 2)}\n`);

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

console.log("");
console.log("== Feature inventory coverage summary ==");
console.log(`- featureRows: ${rows.length}`);
console.log(`- covered: ${report.summary.covered}`);
console.log(`- missing: ${report.summary.missing}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--report") parsed.report = argsList[++index];
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function buildCoverageReport(featureRows, manifest) {
  const manifestById = new Map((manifest.items || []).map(item => [item.id, item]));
  const items = featureRows.map(row => {
    const targets = coverageTargets(row, manifestById.get(row.id));
    return {
      id: row.id,
      feature: row.feature,
      area: row.area,
      targets,
      coverageStatus: targets.length > 0 ? "covered" : "missing",
      executionEvidenceStatus: "not-execution-evidence",
      reason: targets.length > 0 ? "" : "missing coverage target",
    };
  });
  return {
    schema: "media-server.feature-inventory-coverage.v1",
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      covered: items.filter(item => item.coverageStatus === "covered").length,
      missing: items.filter(item => item.coverageStatus === "missing").length,
    },
    items,
  };
}

function coverageTargets(row, item) {
  if (!item) return [];
  if (!item.sourceEvidence || !item.verifierEvidence ||
      (hasArea(row.area, "UI") && (!item.uiEvidence || !item.manualUiCaseId))) {
    return [];
  }
  const targets = [];
  targets.push({
    kind: "implementation",
    file: item.sourceEvidence.file,
    anchor: item.sourceEvidence.anchor,
  });
  if (hasArea(row.area, "안정화")) {
    targets.push({
      kind: "stability",
      command: `./server.sh ${item.verifierEvidence.command}`,
      file: item.verifierEvidence.file,
      anchor: item.verifierEvidence.anchor,
    });
  }
  if (hasArea(row.area, "UI")) {
    targets.push({
      kind: "manual-ui-fulltest",
      screenRoute: item.uiEvidence.screenRoute,
      file: item.uiEvidence.file,
      anchor: item.uiEvidence.anchor,
      manualUiCaseId: item.manualUiCaseId,
    });
  }
  if (hasArea(row.area, "30분")) {
    targets.push({ kind: "30-minute", command: item.longrunEvidence.soak30, approval: "required" });
  }
  if (hasArea(row.area, "120분")) {
    targets.push({ kind: "120-minute", command: item.longrunEvidence.soak120, approval: "required" });
  }
  return targets;
}

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d+ \|/.test(line))
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
  return splitAreas(area).includes(token);
}

function splitAreas(area) {
  return area.split(",").map(item => item.trim()).filter(Boolean);
}

function summaryCount(text, label) {
  const pattern = new RegExp(`^\\| ${escapeRegex(label)} \\| (\\d+) \\|$`, "m");
  const match = text.match(pattern);
  assert(match, `missing summary count for ${label}`);
  return Number(match[1]);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderMarkdown(report) {
  const lines = [
    "# Feature Inventory Coverage Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- total: ${report.summary.total}`,
    `- covered: ${report.summary.covered}`,
    `- missing: ${report.summary.missing}`,
    "",
    "| feature ID | feature | area | coverage status / execution evidence | targets | reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.items) {
    const targets = item.targets.map(target => {
      const value = target.command || target.screenRoute || target.file || target.manualUiCaseId || "";
      const anchor = target.anchor ? `#${target.anchor}` : "";
      return `${target.kind}:${value}${anchor}`;
    }).join("<br>");
    lines.push(`| ${item.id} | ${escapeCell(item.feature)} | ${escapeCell(item.area)} | ${item.coverageStatus} / ${item.executionEvidenceStatus} | ${escapeCell(targets)} | ${escapeCell(item.reason)} |`);
  }
  return `${lines.join("\n")}\n`;
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
