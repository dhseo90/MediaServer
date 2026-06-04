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
  --one-shot-dry-run    main merge/tag/release/latest/branch cleanup/next branch 순서를 one-shot gate로 요약합니다.
  --release-branch <name>  release branch 이름입니다. 기본은 현재 branch입니다.
  --target-branch <name>   merge/tag 기준 branch입니다. 기본 main입니다.
  --next-branch <name>     다음 개발 branch 이름입니다. 기본은 현재 release의 다음 minor입니다.
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - release 직전 로컬 verifier 명령 목록이 server.sh에 존재하는지 확인
  - release/version/public readiness 문서가 tag/push 수동 경계를 설명하는지 확인
  - visual baseline artifact, diff/comment, approval log, preflight artifact 요약이 PR/release 준비 흐름에 연결됐는지 확인
  - one-shot dry-run report가 main sync, tag, GitHub Release, published metadata, release branch 삭제, next branch sync 순서와 fail-stop을 고정하는지 확인
  - dry-run 리포트에 tag, push, GitHub Release 생성이 미수행/수동 항목으로 기록됨
`);
}

assertKnownOptions(rawArgs, ["dry-run", "one-shot-dry-run", "release-branch", "target-branch", "next-branch", "report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const currentBranch = runGitValue(["branch", "--show-current"]) || "<detached>";
const releaseBranch = args.releaseBranch || process.env.MEDIA_SERVER_RELEASE_BRANCH || currentBranch;
const targetBranch = args.targetBranch || process.env.MEDIA_SERVER_RELEASE_TARGET_BRANCH || "main";
const currentVersion = readText("VERSION").trim();
const currentTag = `v${currentVersion}`;
const nextBranch = args.nextBranch || process.env.MEDIA_SERVER_RELEASE_NEXT_BRANCH || defaultNextBranch(currentVersion);
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
  "release branch close confirmation",
  "pull request merge",
  "main fast-forward sync",
  "GitHub Actions required checks",
  "release tag creation",
  "git push",
  "GitHub Release creation/upload",
  "GitHub Latest Release confirmation after publish",
  "release branch deletion",
  "next branch sync from main",
];

const releaseRunbook = [
  { order: 1, action: "Branch close", status: "manual-not-run" },
  { order: 2, action: "PR merge", status: "manual-not-run" },
  { order: 3, action: "Main fast-forward/sync", status: "manual-not-run" },
  { order: 4, action: "Tag verified main commit", status: "manual-not-run" },
  { order: 5, action: "Push approved branch/tag refs", status: "manual-not-run" },
  { order: 6, action: "Create source-only GitHub Release", status: "manual-not-run" },
  { order: 7, action: "Verify GitHub Latest Release", status: "planned-published" },
  { order: 8, action: "Delete release branch after published verification", status: "manual-not-run" },
  { order: 9, action: "Sync next branch from main", status: "manual-not-run" },
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

check("release docs keep publish gates manual", () => {
  for (const snippet of [
    "GitHub Releases 운영",
    `${currentTag} Release Close-out Runbook`,
    "Dry-run checklist",
    "Real close-out checklist",
    "Branch close",
    "PR merge",
    "Main fast-forward/sync",
    "GitHub Release",
    "Latest 확인",
    "release branch",
    "Next branch sync",
    "Tag 전략",
    "수동으로만 진행",
    "public-readiness, bundle policy, Actions status check",
    "Do not list an item as pass unless it was actually executed",
  ]) {
    assert(releasePolicy.includes(snippet), `release policy missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "tag는 `main`의 public readiness",
    "source-only release 기준 tag",
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

check("release visual baseline automation is wired for release workflow", () => {
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
  assert(report.releaseRunbook.length === releaseRunbook.length, "release runbook summary mismatch");
  assert(report.releaseRunbook.find(item => item.action === "Verify GitHub Latest Release")?.status === "planned-published", "Latest Release verification must stay publish-only in dry-run");
  assert(report.releaseRunbook.filter(item => item.status === "manual-not-run").length >= 8, "release runbook manual gates must remain not-run in dry-run");
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

check("one-shot close-out gate is ordered and fail-stop", () => {
  const gate = buildOneShotGate();
  assert(gate.schema === "media-server.release-closeout-one-shot-gate.v1", "one-shot gate schema mismatch");
  assert(gate.mode === "dry-run", "one-shot gate must stay dry-run");
  assert(gate.releaseBranch === releaseBranch, "one-shot gate releaseBranch mismatch");
  assert(gate.targetBranch === targetBranch, "one-shot gate targetBranch mismatch");
  assert(gate.nextBranch === nextBranch, "one-shot gate nextBranch mismatch");
  assert(gate.failStop === true, "one-shot gate must be fail-stop");
  assert(gate.steps.length === 9, "one-shot gate step count mismatch");
  for (let index = 0; index < gate.steps.length; index += 1) {
    assert(gate.steps[index].order === index + 1, `one-shot gate order mismatch at ${index + 1}`);
    assert(gate.steps[index].haltOnFailure === true, `one-shot gate step must halt on failure: ${gate.steps[index].id}`);
  }
  for (const id of ["sync-main", "create-tag", "create-github-release", "verify-published-metadata", "delete-release-branch", "sync-next-branch"]) {
    assert(gate.steps.some(item => item.id === id), `one-shot gate missing step: ${id}`);
  }
  const skippedAfterFailure = gate.failureRehearsal.steps.filter(item => item.afterFailure === true);
  assert(skippedAfterFailure.length > 0, "one-shot failure rehearsal must skip later steps");
  assert(skippedAfterFailure.every(item => item.status === "skipped"), "one-shot failure rehearsal must mark later steps skipped");
  return {
    schema: gate.schema,
    steps: gate.steps.length,
    simulatedFailureStep: gate.failureRehearsal.failAt,
  };
});

check("one-shot close-out docs keep destructive actions manual", () => {
  const docs = [releasePolicy, streamVerification, backlog].join("\n");
  for (const snippet of [
    "media-server.release-closeout-one-shot-gate.v1",
    "--one-shot-dry-run",
    "release branch 삭제",
    "published metadata",
    "fail-stop",
  ]) {
    assert(docs.includes(snippet), `one-shot close-out docs missing snippet: ${snippet}`);
  }
  return { docs: ["docs/release-policy.md", "docs/stream-verification.md", "docs/development-backlog.md"] };
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
    releaseRunbook,
    visualBaselineAutomation: {
      schema: "media-server.release-visual-baseline-automation.v1",
      commands: visualAutomationCommands,
      manualReviews: visualManualReviews.map(action => ({ action, status: "manual-not-run" })),
      preflightArtifacts,
    },
    oneShotCloseoutGate: buildOneShotGate(),
    gitStatusLines: gitStatus,
    checks: [],
  };
}

function buildOneShotGate() {
  const steps = [
    {
      order: 1,
      id: "branch-close-preflight",
      action: "Confirm release branch is closed and local gates are collected",
      status: "planned-local",
      command: "./server.sh verify-release-closeout-helper --dry-run",
      haltOnFailure: true,
      mutatesRepository: false,
    },
    {
      order: 2,
      id: "merge-release-branch",
      action: `Merge ${releaseBranch} into ${targetBranch} after required checks`,
      status: "manual-not-run",
      command: `gh pr merge <release-pr> --merge --delete-branch=false`,
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 3,
      id: "sync-main",
      action: `Fast-forward local ${targetBranch} to origin/${targetBranch}`,
      status: "manual-not-run",
      command: `git fetch origin ${targetBranch} && git checkout ${targetBranch} && git pull --ff-only origin ${targetBranch}`,
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 4,
      id: "create-tag",
      action: "Create annotated tag on verified target branch commit",
      status: "manual-not-run",
      command: "git tag -s <current-tag> -m <release-note-title>",
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 5,
      id: "push-main-and-tag",
      action: "Push approved target branch and tag refs",
      status: "manual-not-run",
      command: `git push origin ${targetBranch} <current-tag>`,
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 6,
      id: "create-github-release",
      action: "Create source-only GitHub Release without binary/model/runtime assets",
      status: "manual-not-run",
      command: "gh release create <current-tag> --title <title> --notes-file <release-notes>",
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 7,
      id: "verify-published-metadata",
      action: "Verify GitHub Latest Release, repository page, remote tag/branch",
      status: "planned-published",
      command: `./server.sh verify-release-metadata --published --release-branch ${targetBranch} --report <published-report.md> --json-report <published-report.json>`,
      haltOnFailure: true,
      mutatesRepository: false,
    },
    {
      order: 8,
      id: "delete-release-branch",
      action: `Delete release branch ${releaseBranch} only after published metadata passes`,
      status: "manual-not-run",
      command: `git push origin --delete ${releaseBranch}`,
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
    {
      order: 9,
      id: "sync-next-branch",
      action: `Create or fast-forward ${nextBranch} from ${targetBranch}`,
      status: "manual-not-run",
      command: `git checkout -B ${nextBranch} ${targetBranch}`,
      haltOnFailure: true,
      mutatesRepository: true,
      requiresApproval: true,
    },
  ];
  return {
    schema: "media-server.release-closeout-one-shot-gate.v1",
    mode: "dry-run",
    releaseBranch,
    targetBranch,
    nextBranch,
    failStop: true,
    destructiveActions: "manual-not-run",
    steps,
    failureRehearsal: simulateOneShotFailure(steps, "create-github-release"),
  };
}

function simulateOneShotFailure(steps, failAt) {
  let failed = false;
  return {
    failAt,
    steps: steps.map(step => {
      if (failed) {
        return { id: step.id, order: step.order, status: "skipped", afterFailure: true };
      }
      if (step.id === failAt) {
        failed = true;
        return { id: step.id, order: step.order, status: "failed", afterFailure: false };
      }
      return { id: step.id, order: step.order, status: "would-run", afterFailure: false };
    }),
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
  lines.push("", "## Release Runbook", "", "| order | action | status |", "| --- | --- | --- |");
  for (const item of data.releaseRunbook) {
    lines.push(`| ${item.order} | ${item.action} | ${item.status} |`);
  }
  lines.push("", "## One-shot Close-out Gate", "");
  lines.push(`- schema: \`${data.oneShotCloseoutGate.schema}\``);
  lines.push(`- mode: \`${data.oneShotCloseoutGate.mode}\``);
  lines.push(`- releaseBranch: \`${data.oneShotCloseoutGate.releaseBranch}\``);
  lines.push(`- targetBranch: \`${data.oneShotCloseoutGate.targetBranch}\``);
  lines.push(`- nextBranch: \`${data.oneShotCloseoutGate.nextBranch}\``);
  lines.push(`- failStop: \`${data.oneShotCloseoutGate.failStop}\``);
  lines.push("", "| order | id | action | status | command |", "| --- | --- | --- | --- | --- |");
  for (const item of data.oneShotCloseoutGate.steps) {
    lines.push(`| ${item.order} | ${item.id} | ${item.action} | ${item.status} | \`${item.command}\` |`);
  }
  lines.push("", "### Failure Rehearsal", "", "| order | id | status |", "| --- | --- | --- |");
  for (const item of data.oneShotCloseoutGate.failureRehearsal.steps) {
    lines.push(`| ${item.order} | ${item.id} | ${item.status} |`);
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

function defaultNextBranch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version || ""));
  if (!match) return "v0.1.0";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (minor >= 9) return `v${major + 1}.0.0`;
  return `v${major}.${minor + 1}.0`;
}

function runGitValue(args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
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
