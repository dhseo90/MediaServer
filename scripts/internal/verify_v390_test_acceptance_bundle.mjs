#!/usr/bin/env node
// 파일 용도: v3.9.0 test acceptance bundle dry-run summary/report를 생성한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 test acceptance bundle

Usage:
  ./server.sh verify-v390-test-acceptance-bundle --dry-run [--output-dir <path>]

Options:
  --dry-run             Validate command set, paths, schemas, and evidence boundaries without running long/UI/publish actions.
  --output-dir <path>   Directory for summary.json and report.md. Defaults to /tmp.
  -h, --help            Show help.

Boundaries:
  - dry-run does not execute 30-minute, UI automation, 120-minute, published metadata, or release actions.
  - Existing preserved evidence may be read, but missing gated evidence remains not-run or approval-required.
`);
}

assertKnownOptions(rawArgs, ["dry-run", "output-dir", "h", "help"]);

const options = parseArgs(rawArgs);
const runId = `v390-test-acceptance-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const outputDir = path.resolve(rootDir, options.outputDir || path.join(os.tmpdir(), `media_server_${runId}`));
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");

assert(options.dryRun, "actual acceptance bundle execution requires explicit approval; use --dry-run for this command");
fs.mkdirSync(outputDir, { recursive: true });

const longrun30 = readLongrun30Evidence();
const uiAutomation = readUiAutomationEvidence();
const finalAcceptanceCommandSet = buildFinalAcceptanceCommandSet();
const summary = {
  schema: "media-server.v390-test-acceptance-bundle.v1",
  runId,
  command: `./server.sh verify-v390-test-acceptance-bundle ${rawArgs.join(" ")}`,
  dryRun: true,
  result: longrun30.status === "pass-existing-evidence" && uiAutomation.status === "pass-existing-evidence" ? "PASS" : "FAIL",
  evidenceBoundary: "dry-run does not execute 30-minute, UI automation, 120-minute, published metadata, or release-action suites",
  outputDir,
  summaryPath,
  reportPath,
  finalAcceptanceCommandSet,
  localReadiness: {
    status: "not-run-by-dry-run",
    commands: [
      "./server.sh verify-v390-stabilization-release-readiness",
      "./server.sh verify-release-metadata",
      "./server.sh verify-docs-links",
      "./server.sh verify-docs-ui-assets",
      "./server.sh verify-project-inventory",
      "./server.sh verify-feature-inventory-coverage",
      "./server.sh verify-release-evidence-index",
      "./server.sh verify-script-inventory",
      "git diff --check",
    ],
  },
  longrun30,
  longrun120: {
    status: "conditional-not-run",
    command: "./server.sh verify-v390-server-longrun --duration-minutes 120 --output-dir docs/release-artifacts/v3.9.0/server-longrun-120min-final",
    condition: "AGENTS 120-minute gate or explicit user approval required",
  },
  uiAutomation,
  publishedMetadata: {
    status: "not-run-by-dry-run",
    command: "./server.sh verify-release-metadata --published",
  },
  releaseAction: {
    status: "not-run-by-dry-run",
    actions: ["push", "PR", "main merge", "signed tag", "GitHub Release", "next branch"],
  },
};

writeJson(summaryPath, summary);
writeReport(reportPath, summary);

console.log("");
console.log("== v3.9.0 test acceptance bundle summary ==");
console.log(`- schema: ${summary.schema}`);
console.log(`- result: ${summary.result}`);
console.log(`- dryRun: ${summary.dryRun}`);
console.log(`- longrun30: ${summary.longrun30.status}`);
console.log(`- uiAutomation: ${summary.uiAutomation.status}`);
console.log(`- longrun120: ${summary.longrun120.status}`);
console.log(`- publishedMetadata: ${summary.publishedMetadata.status}`);
console.log(`- releaseAction: ${summary.releaseAction.status}`);
console.log(`- summaryPath: ${summary.summaryPath}`);
console.log(`- reportPath: ${summary.reportPath}`);

if (summary.result !== "PASS") process.exit(1);

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    outputDir: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--output-dir") {
      parsed.outputDir = args[index + 1] || "";
      index += 1;
    }
  }
  return parsed;
}

function readLongrun30Evidence() {
  const relativeSummaryPath = "docs/release-artifacts/v3.9.0/server-longrun-30min-final/summary.json";
  const fullSummaryPath = path.join(rootDir, relativeSummaryPath);
  if (!fs.existsSync(fullSummaryPath)) {
    return {
      status: "missing-existing-evidence",
      summaryPath: relativeSummaryPath,
      reason: "R1 30-minute summary is missing",
    };
  }
  const payload = JSON.parse(fs.readFileSync(fullSummaryPath, "utf8"));
  const pass = payload.schema === "media-server.v390-server-longrun.v1"
    && payload.result === "PASS"
    && Number(payload.durationMinutes) === 30
    && payload.realDurationEvidence === true;
  return {
    status: pass ? "pass-existing-evidence" : "invalid-existing-evidence",
    summaryPath: relativeSummaryPath,
    result: payload.result || "",
    durationMinutes: payload.durationMinutes ?? null,
    realDurationEvidence: payload.realDurationEvidence === true,
    longrunEvidenceStatus: payload.longrunEvidenceStatus || "",
  };
}

function readUiAutomationEvidence() {
  const relativeSummaryPath = "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json";
  const relativeReportPath = "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/report.md";
  const fullSummaryPath = path.join(rootDir, relativeSummaryPath);
  const fullReportPath = path.join(rootDir, relativeReportPath);
  const command = "./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final --allow-chrome-fallback=1";
  const reportCommand = `./server.sh verify-v390-ui-automation-report --summary ${relativeSummaryPath}`;
  if (!fs.existsSync(fullSummaryPath)) {
    return {
      status: "missing-existing-evidence",
      command,
      reportCommand,
      summaryPath: relativeSummaryPath,
      reportPath: relativeReportPath,
      reason: "R2 UI automation summary is missing",
    };
  }
  const payload = JSON.parse(fs.readFileSync(fullSummaryPath, "utf8"));
  const pass = payload.schema === "media-server.v390-ui-automation.v1"
    && payload.result === "PASS"
    && payload.automationResult === "PASS"
    && payload.manualIntervention === false
    && Number(payload.failedInteractionCount) === 0
    && Number(payload.fail) === 0
    && Number(payload.notRun) === 0
    && fs.existsSync(fullReportPath);
  return {
    status: pass ? "pass-existing-evidence" : "invalid-existing-evidence",
    command,
    reportCommand,
    summaryPath: relativeSummaryPath,
    reportPath: relativeReportPath,
    result: payload.result || "",
    automationResult: payload.automationResult || "",
    selectedAdapter: payload.selectedAdapter?.engine || payload.selectedAdapter?.tool || "",
    fallbackUsed: payload.selectedAdapter?.fallbackUsed === true,
    manualIntervention: payload.manualIntervention === true,
    failedInteractionCount: Number(payload.failedInteractionCount ?? 0),
    caseCount: Number(payload.caseCount ?? 0),
    pass: Number(payload.pass ?? 0),
    fail: Number(payload.fail ?? 0),
    notRun: Number(payload.notRun ?? 0),
    reportExists: fs.existsSync(fullReportPath),
    automationEvidenceStatus: "not-manual-ui-fulltest",
  };
}

function buildFinalAcceptanceCommandSet() {
  return [
    {
      id: "local-readiness",
      status: "not-run-by-dry-run",
      command: "./server.sh verify-v390-stabilization-release-readiness",
      evidence: "local readiness verifier output",
    },
    {
      id: "server-longrun-30",
      status: "existing-evidence-required",
      command: "./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir docs/release-artifacts/v3.9.0/server-longrun-30min-final",
      summaryPath: "docs/release-artifacts/v3.9.0/server-longrun-30min-final/summary.json",
      reportPath: "docs/release-artifacts/v3.9.0/server-longrun-30min-final/report.md",
    },
    {
      id: "ui-automation-r2",
      status: "existing-evidence-required",
      command: "./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final --allow-chrome-fallback=1",
      replayCommand: "./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json",
      summaryPath: "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json",
      reportPath: "docs/release-artifacts/v3.9.0/ui-automation-playwright-final/report.md",
    },
    {
      id: "acceptance-dry-run",
      status: "replayable-command",
      command: "./server.sh verify-v390-test-acceptance-bundle --dry-run --output-dir <path>",
      summaryPath: "<path>/summary.json",
      reportPath: "<path>/report.md",
    },
    {
      id: "acceptance-contract",
      status: "replayable-command",
      command: "./server.sh verify-v390-test-acceptance-bundle-contract",
      evidence: "contract verifier output",
    },
  ];
}

function writeReport(filePath, payload) {
  const lines = [
    "# v3.9.0 Test Acceptance Bundle Dry Run",
    "",
    `schema: ${payload.schema}`,
    `result: ${payload.result}`,
    `dryRun: ${payload.dryRun}`,
    `evidenceBoundary: ${payload.evidenceBoundary}`,
    "",
    "## Final acceptance command set",
    "",
    "| ID | Status | Command | Evidence |",
    "| --- | --- | --- | --- |",
    ...payload.finalAcceptanceCommandSet.map((item) => {
      const evidence = [
        item.summaryPath ? `summary: ${item.summaryPath}` : "",
        item.reportPath ? `report: ${item.reportPath}` : "",
        item.replayCommand ? `replay: ${item.replayCommand}` : "",
        item.evidence || "",
      ].filter(Boolean).join("<br>");
      return `| ${item.id} | ${item.status} | ${item.command} | ${evidence} |`;
    }),
    "",
    "## Evidence boundary summary",
    "",
    "| Area | Status | Command/Evidence |",
    "| --- | --- | --- |",
    `| local readiness | ${payload.localReadiness.status} | ${payload.localReadiness.commands.join("<br>")} |`,
    `| server 30분 | ${payload.longrun30.status} | ${payload.longrun30.summaryPath} |`,
    `| server 120분 | ${payload.longrun120.status} | ${payload.longrun120.command} |`,
    `| UI automation | ${payload.uiAutomation.status} | ${payload.uiAutomation.summaryPath}<br>${payload.uiAutomation.reportCommand} |`,
    `| published metadata | ${payload.publishedMetadata.status} | ${payload.publishedMetadata.command} |`,
    `| release action | ${payload.releaseAction.status} | ${payload.releaseAction.actions.join(", ")} |`,
    "",
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
