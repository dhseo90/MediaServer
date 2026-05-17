#!/usr/bin/env node
// 파일 용도: release close-out 직전 로컬 검증, 문서, 수동 tag/push 상태를 dry-run 리포트로 요약한다.
// 동작 요약: 기존 release verifier 명령과 수동 release action 경계를 점검하되 tag, push, GitHub Release 생성은 수행하지 않는다.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release close-out helper dry-run

Usage:
  ./server.sh verify-release-closeout-helper [options]

Options:
  --dry-run             명시 dry-run 플래그입니다. 기본 동작도 dry-run입니다.
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - release 직전 로컬 verifier 명령 목록이 server.sh에 존재하는지 확인
  - release/version/public readiness 문서가 tag/push 수동 경계를 설명하는지 확인
  - visual baseline artifact, diff/comment, approval log, preflight artifact 요약이 PR/release 준비 흐름에 연결됐는지 확인
  - dry-run 리포트에 tag, push, GitHub Release 생성이 미수행/수동 항목으로 기록됨
`);
}

assertKnownOptions(rawArgs, ["dry-run", "report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const server = readText("server.sh");
const releasePolicy = readText("docs/release-policy.md");
const versioningPolicy = readText("docs/versioning-policy.md");
const publicReview = readText("docs/public-repo-final-review.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const uiGuide = readText("docs/ui-guide.md");
const prTemplate = readText(".github/PULL_REQUEST_TEMPLATE.md");
const preflight = readText(".github/workflows/preflight.yml");

const localCommands = [
  "./server.sh verify-release-metadata",
  "./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md",
  "./server.sh verify-release-bundle-dry-run",
  "./server.sh verify-post-release-reconciliation",
  "git diff --check",
];

const visualAutomationCommands = [
  { command: "./server.sh verify-docs-ui-assets", status: "planned-local" },
  { command: "./server.sh verify-ui-visual-artifact-index", status: "planned-local" },
  { command: "./server.sh verify-ui-release-baseline-approval-log", status: "planned-local" },
  {
    command: "./server.sh verify-ops-client-ui --screenshots --output-dir <artifact-dir>",
    status: "manual-artifact-required",
  },
  {
    command: "./server.sh compare-ui-visual-baseline --baseline-dir <baseline-artifact-dir> --candidate-dir <candidate-artifact-dir> --output-dir <diff-artifact-dir>",
    status: "manual-artifact-required",
  },
  {
    command: "./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> --output <comment.md>",
    status: "planned-local",
  },
  {
    command: "./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir> --output <artifact-dir>/ui-visual-qa-issue-links.md",
    status: "planned-local",
  },
  {
    command: "./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root> --archive-dir <archive-dir> --report <report.json>",
    status: "planned-dry-run",
  },
];

const manualActions = [
  "GitHub Actions required checks",
  "release tag creation",
  "git push",
  "GitHub Release creation/upload",
];

const visualManualReviews = [
  "manual screenshot review at 320/390/760/1180",
  "client/viewer source URL, Developer URL, raw JSON/debug counter non-exposure review",
  "release baseline approval log completion when baseline changes",
  "accepted baseline artifact adoption decision",
];

const preflightArtifacts = [
  { name: "media-server-release-closeout-helper-dry-run", status: "planned-ci-artifact" },
  { name: "media-server-ui-visual-baseline-diff", status: "planned-ci-artifact" },
  { name: "media-server-ui-visual-maintenance-dry-run", status: "planned-ci-artifact" },
];

const checks = [];

check("release close-out commands are available", () => {
  for (const command of [
    "verify-release-metadata",
    "verify-public-repo-readiness",
    "verify-release-bundle-dry-run",
    "verify-post-release-reconciliation",
    "verify-release-closeout-helper",
    "verify-docs-ui-assets",
    "verify-ui-visual-artifact-index",
    "verify-ui-release-baseline-approval-log",
    "write-ui-visual-baseline-comment",
    "write-ui-visual-qa-issue-links",
    "ui-visual-artifact-maintenance",
  ]) {
    assert(server.includes(`${command})`) || server.includes(`  ${command}`), `server.sh missing command: ${command}`);
  }
  assert(server.includes("verify_release_closeout_helper.mjs"), "server.sh missing helper dispatch target");
  return { commands: localCommands, visualCommands: visualAutomationCommands.map(item => item.command) };
});

check("release docs keep tag and push manual", () => {
  for (const snippet of [
    "GitHub Releases 운영",
    "Tag 전략",
    "수동으로만 진행",
    "public-readiness, bundle policy, Actions status check",
    "Do not list an item as pass unless it was actually executed",
  ]) {
    assert(releasePolicy.includes(snippet), `release policy missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "tag는 `main`의 public readiness",
    "release tag 기준",
  ]) {
    assert(versioningPolicy.includes(snippet), `versioning policy missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "verify-public-repo-readiness",
    "수동",
  ]) {
    assert(publicReview.includes(snippet), `public review missing snippet: ${snippet}`);
  }
  assert(backlog.includes("실제 tag/push는 수동 승인 후에만 수행합니다"), "backlog must keep tag/push approval boundary");
  assert(streamVerification.includes("verify-release-closeout-helper"), "stream verification missing helper command");
  return { manualActions };
});

check("release visual baseline automation is wired for PR and preflight", () => {
  const docs = [releasePolicy, streamVerification, uiGuide, prTemplate, backlog].join("\n");
  for (const snippet of [
    "Release / Visual Baseline Readiness",
    "media-server.release-visual-baseline-automation.v1",
    "media-server-release-closeout-helper-dry-run",
    "./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>",
    "verify-docs-ui-assets",
    "verify-ui-visual-artifact-index",
    "verify-ui-release-baseline-approval-log",
    "write-ui-visual-baseline-comment",
    "ui-visual-artifact-maintenance",
  ]) {
    assert(docs.includes(snippet), `release visual readiness docs missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "Release close-out helper dry-run",
    "artifacts/release-closeout-helper",
    "--json-report artifacts/release-closeout-helper/release-closeout-helper.json",
    "media-server-release-closeout-helper-dry-run",
    "Publish release close-out helper summary",
  ]) {
    assert(preflight.includes(snippet), `preflight missing release close-out helper snippet: ${snippet}`);
  }
  return { preflightArtifacts: preflightArtifacts.map(item => item.name) };
});

check("dry-run report marks release actions as not executed", () => {
  const report = buildReport();
  for (const action of manualActions) {
    const item = report.manualActions.find(entry => entry.action === action);
    assert(item?.status === "manual-not-run", `manual action must be not-run in dry-run: ${action}`);
  }
  assert(report.dryRun === true, "helper must stay dry-run");
  assert(report.createdTag === false, "helper must not create tags");
  assert(report.pushed === false, "helper must not push");
  assert(report.visualBaselineAutomation?.schema === "media-server.release-visual-baseline-automation.v1", "visual baseline automation schema missing");
  assert(report.visualBaselineAutomation.commands.length === visualAutomationCommands.length, "visual baseline command summary mismatch");
  assert(report.visualBaselineAutomation.manualReviews.every(item => item.status === "manual-not-run"), "visual manual reviews must be not-run in dry-run");
  return {
    dryRun: report.dryRun,
    createdTag: report.createdTag,
    pushed: report.pushed,
    visualBaselineAutomation: report.visualBaselineAutomation.schema,
  };
});

const report = buildReport();
let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.status = fail === 0 ? "pass" : "fail";
console.log("");
console.log("== Release close-out helper dry-run summary ==");
console.log(`- status: ${report.status}`);
console.log(`- dryRun: ${report.dryRun}`);
console.log(`- localCommands: ${report.localCommands.length}`);
console.log(`- manualActions: ${report.manualActions.length}`);
console.log(`- gitStatusLines: ${report.gitStatusLines.length}`);
console.log("- tag: not created");
console.log("- push: not performed");

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildReport() {
  const gitStatus = runGitStatus();
  return {
    schema: "media-server.release-closeout-helper-dry-run.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    dryRun: true,
    createdTag: false,
    pushed: false,
    localCommands: localCommands.map(command => ({ command, status: "planned-local" })),
    manualActions: manualActions.map(action => ({ action, status: "manual-not-run" })),
    visualBaselineAutomation: {
      schema: "media-server.release-visual-baseline-automation.v1",
      commands: visualAutomationCommands,
      manualReviews: visualManualReviews.map(action => ({ action, status: "manual-not-run" })),
      preflightArtifacts,
    },
    gitStatusLines: gitStatus,
    checks: [],
  };
}

function renderMarkdown(data) {
  const lines = [
    "# Release Close-out Helper Dry-run",
    "",
    `- status: \`${data.status}\``,
    `- dryRun: \`${data.dryRun}\``,
    "- tag: `not created`",
    "- push: `not performed`",
    "",
    "## Local Commands",
    "",
    "| command | status |",
    "| --- | --- |",
  ];
  for (const item of data.localCommands) {
    lines.push(`| \`${item.command}\` | ${item.status} |`);
  }
  lines.push("", "## Manual Actions", "", "| action | status |", "| --- | --- |");
  for (const item of data.manualActions) {
    lines.push(`| ${item.action} | ${item.status} |`);
  }
  lines.push(
    "",
    "## Visual Baseline Automation",
    "",
    `- schema: \`${data.visualBaselineAutomation.schema}\``,
    "",
    "| command | status |",
    "| --- | --- |",
  );
  for (const item of data.visualBaselineAutomation.commands) {
    lines.push(`| \`${item.command}\` | ${item.status} |`);
  }
  lines.push("", "## Visual Manual Review", "", "| action | status |", "| --- | --- |");
  for (const item of data.visualBaselineAutomation.manualReviews) {
    lines.push(`| ${item.action} | ${item.status} |`);
  }
  lines.push("", "## Preflight Artifacts", "", "| artifact | status |", "| --- | --- |");
  for (const item of data.visualBaselineAutomation.preflightArtifacts) {
    lines.push(`| ${item.name} | ${item.status} |`);
  }
  lines.push("", "## Git Status", "");
  if (data.gitStatusLines.length === 0) {
    lines.push("- clean");
  } else {
    for (const line of data.gitStatusLines) lines.push(`- \`${line}\``);
  }
  return `${lines.join("\n")}\n`;
}

function runGitStatus() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) return [`git status failed: ${result.stderr || result.stdout}`.trim()];
  return result.stdout.split("\n").map(line => line.trim()).filter(Boolean);
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
