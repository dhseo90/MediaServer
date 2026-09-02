#!/usr/bin/env node
// 파일 용도: 사용자용 테스트 launcher의 원본 evidence를 변경하지 않고 항목별 compact 결과와 실패 handoff를 기록한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const outputDir = path.resolve(options.outputDir);
const sourceSummaryPath = options.summary ? path.resolve(options.summary) : "";

fs.mkdirSync(outputDir, { recursive: true });
if (sourceSummaryPath && !isWithin(outputDir, sourceSummaryPath)) {
  fail("source summary must be inside output directory");
}

let sourceSummary = null;
if (sourceSummaryPath) {
  if (!fs.existsSync(sourceSummaryPath)) fail(`source summary does not exist: ${sourceSummaryPath}`);
  sourceSummary = readJson(sourceSummaryPath);
}

const linkedSummaries = [];
const items = [];
if (sourceSummary) collectParentItems(sourceSummary, items);

for (const [field, prefix] of [["longrun30", "longrun30"], ["longrun120", "longrun120"]]) {
  const childSummaryPath = stringValue(sourceSummary?.[field]?.summaryPath);
  if (!childSummaryPath) continue;
  const resolved = path.resolve(childSummaryPath);
  if (!isWithin(outputDir, resolved) || !fs.existsSync(resolved) || resolved === sourceSummaryPath) continue;
  const childSummary = readJson(resolved);
  linkedSummaries.push(resolved);
  collectParentItems(childSummary, items, prefix);
}

let uiSummary = null;
const uiSummaryPath = stringValue(sourceSummary?.uiAutomation?.summaryPath);
if (uiSummaryPath) {
  const resolved = path.resolve(uiSummaryPath);
  if (isWithin(outputDir, resolved) && fs.existsSync(resolved)) {
    uiSummary = readJson(resolved);
    if (!linkedSummaries.includes(resolved)) linkedSummaries.push(resolved);
    collectUiItems(uiSummary, items);
  }
}

if (!sourceSummary) collectSyntheticItems(options, items);

const result = normalizeResult(options.result || sourceSummary?.result || sourceSummary?.status);
if (result === "fail" && !items.some(item => item.status === "fail")) {
  items.push(makeItem({
    scope: "stage",
    id: options.failureStage || sourceSummary?.failedStage || sourceSummary?.failedPhase || "launcher-summary-gate",
    value: {
      exitCode: parseExitCode(options.exitCode),
      logPath: options.logPath,
      reason: options.errorSummary,
    },
    rawStatus: "FAIL",
  }));
}
const counts = countItems(items);
const source = collectCompactSource(sourceSummary, options.sourceRoot);
const firstFailure = result === "fail"
  ? buildFirstFailure(sourceSummary, uiSummary, items, options)
  : null;
const laterNotRun = result === "fail"
  ? items.filter(item => item.status === "not-run").map(compactNotRunItem)
  : [];
const cleanup = summarizeCleanup(sourceSummary?.cleanup);
const compactSummaryPath = path.join(outputDir, "test-run-summary.json");
const failureJsonPath = path.join(outputDir, "failure-handoff.json");
const failureMarkdownPath = path.join(outputDir, "failure-handoff.md");
const compact = {
  schema: "media-server.user-test-run-summary.v1",
  generatedAt: new Date().toISOString(),
  suite: options.suite,
  userCommand: options.userCommand,
  result,
  syntheticSourceSummary: sourceSummary === null,
  source,
  counts,
  items,
  firstFailure,
  cleanup,
  sourceSummaryPath,
  linkedSummaryPaths: linkedSummaries,
};

writeJsonAtomic(compactSummaryPath, compact);
if (result === "fail") {
  const handoff = {
    schema: "media-server.user-test-failure-handoff.v1",
    generatedAt: compact.generatedAt,
    suite: options.suite,
    userCommand: options.userCommand,
    result,
    source,
    counts,
    firstFailure,
    laterNotRun,
    cleanup,
    sourceSummaryPath,
    compactSummaryPath,
  };
  writeJsonAtomic(failureJsonPath, handoff);
  writeTextAtomic(failureMarkdownPath, renderFailureMarkdown(handoff));
} else {
  removeIfPresent(failureJsonPath);
  removeIfPresent(failureMarkdownPath);
}

console.log(`[test] compactSummary=${compactSummaryPath}`);
console.log(`[test] compactCounts=pass:${counts.pass},fail:${counts.fail},not-run:${counts.notRun}`);
console.log(`[test] failureHandoff=${result === "fail" ? failureJsonPath : ""}`);

function parseArgs(args) {
  const values = {
    suite: "",
    userCommand: "",
    sourceRoot: "",
    outputDir: "",
    summary: "",
    result: "",
    failureStage: "",
    testcaseId: "",
    command: "",
    exitCode: "",
    logPath: "",
    errorSummary: "",
    reproductionCommand: "",
    laterNotRun: "",
  };
  const names = new Map([
    ["--suite", "suite"], ["--user-command", "userCommand"],
    ["--source-root", "sourceRoot"], ["--output-dir", "outputDir"],
    ["--summary", "summary"], ["--result", "result"],
    ["--failure-stage", "failureStage"], ["--testcase-id", "testcaseId"],
    ["--command", "command"], ["--exit-code", "exitCode"],
    ["--log-path", "logPath"], ["--error-summary", "errorSummary"],
    ["--reproduction-command", "reproductionCommand"], ["--later-not-run", "laterNotRun"],
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const key = names.get(args[index]);
    if (!key || index + 1 >= args.length) fail(`unknown or incomplete argument: ${args[index] || "(missing)"}`);
    values[key] = args[index + 1];
  }
  if (!values.suite || !values.userCommand || !values.outputDir) {
    fail("--suite, --user-command, and --output-dir are required");
  }
  if (!values.summary && stringValue(values.result).toUpperCase() !== "FAIL") {
    fail("a source summary or synthetic FAIL result is required");
  }
  return values;
}

function collectParentItems(summary, target, prefix = "") {
  const scope = Array.isArray(summary.stages) ? "stage" : "phase";
  const ledger = scope === "stage" ? summary.stages : (Array.isArray(summary.phases) ? summary.phases : []);
  for (const entry of ledger) {
    const localId = stringValue(entry?.id || entry?.name) || "unknown";
    const id = prefix ? `${prefix}/${localId}` : localId;
    const itemScope = prefix ? `${prefix}-${scope}` : scope;
    target.push(makeItem({ scope: itemScope, id, value: entry, rawStatus: entry?.status || entry?.result }));
    for (const check of Array.isArray(entry?.checks) ? entry.checks : []) {
      const checkId = stringValue(check?.id || check?.name) || "unknown";
      target.push(makeItem({
        scope: prefix ? `${prefix}-check` : "check",
        id: `${id}/${checkId}`,
        value: check,
        rawStatus: check?.status || check?.result,
      }));
    }
  }
  for (const step of Array.isArray(summary.delegatedSteps) ? summary.delegatedSteps : []) {
    target.push(makeItem({
      scope: prefix ? `${prefix}-delegated-step` : "delegated-step",
      id: `${prefix ? `${prefix}/` : ""}${stringValue(step?.name || step?.id) || "unknown"}`,
      value: step,
      rawStatus: step?.result || step?.status,
    }));
  }
}

function collectUiItems(summary, target) {
  for (const item of Array.isArray(summary?.cases) ? summary.cases : []) {
    target.push(makeItem({
      scope: "ui-case",
      id: stringValue(item?.caseId || item?.testId) || "unknown",
      value: item,
      rawStatus: item?.status || item?.result,
      featureId: stringValue(item?.featureId),
    }));
  }
}

function collectSyntheticItems(values, target) {
  target.push(makeItem({
    scope: "stage",
    id: values.failureStage || "launcher",
    value: { exitCode: parseExitCode(values.exitCode), logPath: values.logPath, reason: values.errorSummary },
    rawStatus: "FAIL",
  }));
  for (const id of csv(values.laterNotRun)) {
    target.push(makeItem({
      scope: "stage",
      id,
      value: { reason: `not run after ${values.failureStage || "launcher"} failure` },
      rawStatus: "not-run",
    }));
  }
}

function makeItem({ scope, id, value, rawStatus, featureId = "" }) {
  return {
    scope,
    id,
    ...(featureId ? { featureId } : {}),
    status: normalizeStatus(rawStatus),
    originalStatus: stringValue(rawStatus),
    exitCode: parseExitCode(value?.exitCode),
    logPath: stringValue(value?.logPath),
    reason: compactText(value?.reason || value?.context || value?.error || firstText(value?.tail)),
  };
}

function buildFirstFailure(summary, uiSummaryValue, normalizedItems, values) {
  const parent = summary?.firstFailure || summary?.failure || null;
  const failedItem = normalizedItems.find(item => item.status === "fail") || null;
  const failedLedger = [...(summary?.stages || []), ...(summary?.phases || [])]
    .find(item => normalizeStatus(item?.status || item?.result) === "fail") || null;
  const failedCheck = (failedLedger?.checks || [])
    .find(item => normalizeStatus(item?.status || item?.result) === "fail") || null;
  const uiFailure = uiSummaryValue?.firstFailure || uiSummaryValue?.failureCensus?.[0] || null;
  return {
    stage: stringValue(parent?.stage || parent?.phase || summary?.failedStage || summary?.failedPhase ||
      values.failureStage || failedLedger?.id || failedItem?.id),
    testcaseId: stringValue(parent?.testcaseId || parent?.caseName || summary?.failedCase ||
      uiFailure?.caseId || values.testcaseId || failedCheck?.id || failedItem?.id),
    command: stringValue(parent?.command || summary?.failedCommand || values.command || failedLedger?.command),
    exitCode: firstExitCode(parent?.exitCode, summary?.exitCode, values.exitCode,
      failedCheck?.exitCode, failedLedger?.exitCode, failedItem?.exitCode, uiFailure?.childExitCode),
    errorSummary: compactText(parent?.error || parent?.context || parent?.message ||
      uiFailure?.failureCode || uiFailure?.failureClass || values.errorSummary ||
      firstText(parent?.stderrTail) || firstText(failedLedger?.tail) || failedItem?.reason),
    logPath: stringValue(parent?.logPath || values.logPath || failedCheck?.logPath ||
      failedLedger?.logPath || uiFailure?.summaryPath || failedItem?.logPath),
    reproductionCommand: stringValue(parent?.reproductionCommand || values.reproductionCommand ||
      values.userCommand),
  };
}

function collectCompactSource(summary, sourceRoot) {
  const provenance = summary?.sourceProvenanceEnd || summary?.sourceProvenance || null;
  if (provenance) {
    return {
      commitSha: stringValue(provenance.commitSha),
      branch: stringValue(provenance.branch),
      worktreeClean: booleanOrNull(provenance.sourceWorktreeClean ?? provenance.worktreeClean),
    };
  }
  if (!sourceRoot) return { commitSha: "", branch: "", worktreeClean: null };
  try {
    const status = git(sourceRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
    return {
      commitSha: git(sourceRoot, ["rev-parse", "HEAD"]),
      branch: git(sourceRoot, ["branch", "--show-current"]),
      worktreeClean: status === "",
    };
  } catch {
    return { commitSha: "", branch: "", worktreeClean: null };
  }
}

function summarizeCleanup(value) {
  if (!value || typeof value !== "object") return { status: "not-run" };
  const checks = Array.isArray(value.checks)
    ? value.checks.map(item => ({
      id: stringValue(item?.id || item?.name),
      status: normalizeStatus(item?.status || item?.result),
    }))
    : [];
  return { status: normalizeStatus(value.status || value.result), ...(checks.length ? { checks } : {}) };
}

function compactNotRunItem(item) {
  return { scope: item.scope, id: item.id, reason: item.reason };
}

function countItems(values) {
  return {
    total: values.length,
    pass: values.filter(item => item.status === "pass").length,
    fail: values.filter(item => item.status === "fail").length,
    notRun: values.filter(item => item.status === "not-run").length,
  };
}

function normalizeResult(value) {
  return normalizeStatus(value) === "pass" ? "pass" : "fail";
}

function normalizeStatus(value) {
  const token = stringValue(value).toLowerCase();
  if (["pass", "passed", "ok", "success"].includes(token)) return "pass";
  if (["fail", "failed", "error"].includes(token)) return "fail";
  return "not-run";
}

function renderFailureMarkdown(handoff) {
  const first = handoff.firstFailure || {};
  const lines = [
    "# User Test Failure Handoff",
    "",
    `- suite: ${handoff.suite}`,
    `- sourceCommit: ${handoff.source.commitSha}`,
    `- sourceBranch: ${handoff.source.branch}`,
    `- sourceWorktreeClean: ${metadataValue(handoff.source.worktreeClean)}`,
    `- failureStage: ${first.stage}`,
    `- testcaseId: ${first.testcaseId}`,
    `- command: ${first.command}`,
    `- exitCode: ${metadataValue(first.exitCode)}`,
    `- error: ${first.errorSummary}`,
    `- logPath: ${first.logPath}`,
    `- reproductionCommand: ${first.reproductionCommand}`,
    `- cleanup: ${handoff.cleanup.status}`,
    "",
    "## Later Not Run",
    "",
    ...(handoff.laterNotRun.length
      ? handoff.laterNotRun.map(item => `- ${item.scope}:${item.id}${item.reason ? ` — ${item.reason}` : ""}`)
      : ["- (none)"]),
    "",
    `Compact JSON: ${handoff.compactSummaryPath}`,
    `Source summary: ${handoff.sourceSummaryPath}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function writeJsonAtomic(filePath, value) {
  writeTextAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextAtomic(filePath, value) {
  const temporary = `${filePath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, value, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, filePath);
  } finally {
    removeIfPresent(temporary);
  }
}

function removeIfPresent(filePath) {
  try { fs.unlinkSync(filePath); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function git(root, args) {
  const result = spawnSync("git", ["-C", path.resolve(root), ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "git command failed");
  return result.stdout.trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function csv(value) {
  return stringValue(value).split(",").map(item => item.trim()).filter(Boolean);
}

function firstText(value) {
  return Array.isArray(value) ? value.find(item => typeof item === "string" && item.trim()) || "" : "";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compactText(value) {
  return stringValue(value).replace(/\s+/g, " ").slice(0, 2000);
}

function parseExitCode(value) {
  if (Number.isSafeInteger(value)) return value;
  const token = stringValue(value);
  if (!/^-?\d+$/.test(token)) return null;
  const parsed = Number(token);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function firstExitCode(...values) {
  for (const value of values) {
    const parsed = parseExitCode(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function metadataValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function fail(message) {
  console.error(message);
  process.exit(64);
}
