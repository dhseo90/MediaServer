#!/usr/bin/env node
// 파일 용도: RC 전용 120분 soak/VA runtime longrun 결과를 release checklist Markdown/HTML로 묶는다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`RC release checklist

Usage:
  ./server.sh rc-release-checklist [options]

Options:
  --run-id <id>                   checklist run id입니다.
  --output <path>                 Markdown checklist 출력 경로입니다.
  --html-output <path>            HTML checklist 출력 경로입니다.
  --history-dir <path>            run별 summary/report/checklist history 디렉터리입니다.
  --predev-summary <path>         verify-predev summary JSON입니다.
  --predev-report <path>          verify-predev Markdown report입니다.
  --runtime-summary <path>        VA runtime longrun summary JSON입니다.
  --runtime-report <path>         VA runtime longrun Markdown report입니다.
  --artifact-name <name>          CI artifact 이름입니다.
  --artifact-retention-days <n>   CI artifact 보존 일수입니다.
  --asset-manifest <path>         RC asset manifest JSON입니다.
  --full-test-summary <path>      test --full summary JSON입니다.
  --full-test-target-seconds <n>  test --full release 기준 시간입니다. 기본 1800.
  --runner-label <label>          runner 표시명입니다.
  -h, --help                      도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "run-id",
  "output",
  "html-output",
  "history-dir",
  "predev-summary",
  "predev-report",
  "runtime-summary",
  "runtime-report",
  "artifact-name",
  "artifact-retention-days",
  "asset-manifest",
  "full-test-summary",
  "full-test-target-seconds",
  "runner-label",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const runId = args.runId || `rc-${Date.now()}-${process.pid}`;
const output = args.output || path.join(os.tmpdir(), `media_server_${runId}_release_checklist.md`);
const htmlOutput = args.htmlOutput || output.replace(/\.md$/i, ".html");
const historyDir = args.historyDir || "";
const ciContext = buildCiContext(args);
if (historyDir) {
  ciContext.historyDir = historyDir;
  ciContext.historyIndex = path.join(historyDir, "index.md");
  ciContext.historyHtml = path.join(historyDir, "index.html");
}

const gates = [
  {
    id: "predev-120m",
    title: "Predev 120m soak",
    command: "./server.sh verify-predev --soak-minutes 120",
    summaryFile: args.predevSummary || "",
    reportFile: args.predevReport || "",
  },
  {
    id: "va-runtime-120m",
    title: "VA runtime console 120m longrun",
    command: "./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --clients 1 --include-sidechannel --include-dashboard --include-rtsp --idle-after-cleanup-minutes 30",
    summaryFile: args.runtimeSummary || "",
    reportFile: args.runtimeReport || "",
  },
];

const rows = gates.map((gate) => ({ ...gate, result: summarizeSummary(gate.summaryFile) }));
const markdown = buildMarkdown(rows, ciContext);
writeText(output, markdown);
writeText(htmlOutput, buildHtml(markdown));
if (historyDir) {
  writeHistory(historyDir, runId, rows, ciContext, { markdown: output, html: htmlOutput });
}

console.log(`[pass] rc release checklist: ${output}`);
console.log(`[pass] rc release checklist html: ${htmlOutput}`);
if (historyDir) {
  console.log(`[pass] rc soak report history: ${path.join(historyDir, "index.md")}`);
  console.log(`[pass] rc soak report history html: ${path.join(historyDir, "index.html")}`);
}

function summarizeSummary(filePath) {
  if (!filePath) {
    return { status: "missing", label: "summary 미지정", detail: "RC gate summary path가 필요합니다." };
  }
  if (!fs.existsSync(filePath)) {
    return { status: "missing", label: "summary 없음", detail: filePath };
  }
  let payload = {};
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { status: "fail", label: "summary 파싱 실패", detail: error.message };
  }
  const failCount = Number(payload.failCount ?? payload.fail ?? payload.failedCount ?? 0);
  const failedSteps = Array.isArray(payload.failedSteps)
    ? payload.failedSteps
    : (Array.isArray(payload.failures) ? payload.failures : []);
  const explicitStatus = String(payload.status || payload.result || "").toLowerCase();
  const passCount = Number(payload.passCount ?? payload.pass ?? payload.passedCount ?? 0);
  if (explicitStatus.includes("fail") || failCount > 0 || failedSteps.length > 0) {
    return {
      status: "fail",
      label: "FAIL",
      detail: `pass=${passCount} fail=${failCount || failedSteps.length}`,
    };
  }
  if (explicitStatus.includes("pass") || passCount > 0 || payload.ok === true) {
    return {
      status: "pass",
      label: "PASS",
      detail: `pass=${passCount || "ok"} fail=0`,
    };
  }
  return { status: "unknown", label: "판정 보류", detail: "summary에 pass/fail 카운트가 없습니다." };
}

function buildCiContext(parsedArgs) {
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "";
  return {
    generatedAt: new Date().toISOString(),
    artifactName: parsedArgs.artifactName || "",
    artifactRetentionDays: parsedArgs.artifactRetentionDays || process.env.RC_ARTIFACT_RETENTION_DAYS || "",
    assetManifest: parsedArgs.assetManifest || "",
    assetSummary: summarizeAssets(parsedArgs.assetManifest || ""),
    fullTestSummary: parsedArgs.fullTestSummary || "",
    fullTestTargetSeconds: Number(parsedArgs.fullTestTargetSeconds || process.env.MEDIA_SERVER_TEST_FULL_TARGET_SECONDS || 1800),
    fullTestStatus: summarizeFullTest(parsedArgs.fullTestSummary || "", Number(parsedArgs.fullTestTargetSeconds || process.env.MEDIA_SERVER_TEST_FULL_TARGET_SECONDS || 1800)),
    runnerLabel: parsedArgs.runnerLabel || process.env.RUNNER_NAME || "",
    runUrl,
    repository: process.env.GITHUB_REPOSITORY || "",
    refName: process.env.GITHUB_REF_NAME || "",
    sha: process.env.GITHUB_SHA || "",
  };
}

function summarizeFullTest(filePath, targetSeconds) {
  if (!filePath) {
    return { status: "missing", label: "full test summary 미지정", detail: `target=${targetSeconds}s` };
  }
  if (!fs.existsSync(filePath)) {
    return { status: "missing", label: "full test summary 없음", detail: filePath };
  }
  let payload = {};
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { status: "fail", label: "full test summary 파싱 실패", detail: error.message };
  }
  const elapsed = Number(payload.elapsedSeconds || 0);
  const failCount = Number(payload.failCount || 0);
  const fullReleaseCandidate = payload.fullReleaseCandidate === true;
  if (failCount > 0) {
    return { status: "fail", label: "FAIL", detail: `fail=${failCount} elapsed=${elapsed}s target=${targetSeconds}s` };
  }
  if (!fullReleaseCandidate) {
    return { status: "check", label: "CHECK", detail: `무옵션 full 기준 아님 elapsed=${elapsed}s target=${targetSeconds}s` };
  }
  return {
    status: elapsed <= targetSeconds ? "pass" : "check",
    label: elapsed <= targetSeconds ? "PASS" : "SLOW",
    detail: `elapsed=${elapsed}s target=${targetSeconds}s`,
  };
}

function summarizeAssets(filePath) {
  if (!filePath) {
    return { status: "missing", label: "asset manifest 미지정", detail: "" };
  }
  if (!fs.existsSync(filePath)) {
    return { status: "missing", label: "asset manifest 없음", detail: filePath };
  }
  let payload = {};
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { status: "fail", label: "asset manifest 파싱 실패", detail: error.message };
  }
  const sampleMissing = Array.isArray(payload.samples)
    ? payload.samples.filter((item) => item?.status !== "ok").length
    : 0;
  const modelMissing = payload.model?.status === "ok" ? 0 : 1;
  const labelsMissing = payload.labels?.status === "ok" ? 0 : 1;
  const missing = sampleMissing + modelMissing + labelsMissing;
  return {
    status: missing === 0 ? "pass" : "check",
    label: missing === 0 ? "PASS" : "CHECK",
    detail: `missing=${missing} samples=${Array.isArray(payload.samples) ? payload.samples.length : 0} model=${payload.model?.status || "unknown"} labels=${payload.labels?.status || "unknown"}`,
  };
}

function buildMarkdown(items, context = {}) {
  const generatedAt = context.generatedAt || new Date().toISOString();
  const overall = overallStatus(items, context);
  const lines = [
    "# RC Release Checklist",
    "",
    `- generatedAt: ${generatedAt}`,
    `- overall: ${overall.label}`,
    "- scope: 120분 predev soak와 120분 VA runtime longrun 결과 연결",
    context.artifactName ? `- ciArtifact: ${context.artifactName}` : "- ciArtifact: (local)",
    context.artifactRetentionDays ? `- artifactRetentionDays: ${context.artifactRetentionDays}` : "- artifactRetentionDays: (local)",
    context.runnerLabel ? `- runner: ${context.runnerLabel}` : "- runner: (local)",
    context.assetManifest ? `- assetManifest: ${context.assetManifest}` : "- assetManifest: (missing)",
    `- assetStatus: ${context.assetSummary.label}${context.assetSummary.detail ? ` (${context.assetSummary.detail})` : ""}`,
    context.fullTestSummary ? `- localFullTestSummary: ${context.fullTestSummary}` : "- localFullTestSummary: (missing)",
    `- localFullTestStatus: ${context.fullTestStatus.label}${context.fullTestStatus.detail ? ` (${context.fullTestStatus.detail})` : ""}`,
    context.historyIndex ? `- reportHistory: ${context.historyIndex}` : "- reportHistory: (disabled)",
    context.historyHtml ? `- reportHistoryHtml: ${context.historyHtml}` : "",
    context.runUrl ? `- ciRun: ${context.runUrl}` : "- ciRun: (local)",
    context.repository ? `- repository: ${context.repository}` : "",
    context.refName ? `- ref: ${context.refName}` : "",
    context.sha ? `- sha: ${context.sha.slice(0, 12)}` : "",
    "",
    "| Gate | Required command | Status | Summary | Report |",
    "| --- | --- | --- | --- | --- |",
  ].filter(Boolean);
  for (const item of items) {
    const checked = item.result.status === "pass" ? "[x]" : "[ ]";
    lines.push(`| ${checked} ${item.title} | \`${item.command}\` | ${item.result.label} | ${markdownPath(item.summaryFile)} (${item.result.detail}) | ${markdownPath(item.reportFile)} |`);
  }
  lines.push(
    "",
    "## Release Decision",
    "",
    overall.ok
      ? "- [x] RC gate 결과가 모두 PASS입니다. 최종 수동 점검 후 release 승격 후보로 볼 수 있습니다."
      : "- [ ] PASS가 아닌 gate가 있습니다. release 승격 전에 실패 로그와 리포트를 확인합니다.",
    "",
    "## Notes",
    "",
    "- 이 checklist는 장기 검증을 실행하지 않고, 이미 생성된 summary/report를 release 기준 문서로 연결합니다.",
    "- 로컬 release 전 기준은 `./server.sh test --full --stop-after`이며 기본 목표 시간은 1800초입니다.",
    "- GitHub Actions에서는 `media-server-rc-gate` artifact에 summary, report, Markdown/HTML checklist를 함께 업로드합니다.",
    "- 실제 RC gate는 sample video, YOLO model, labels가 준비된 self-hosted macOS runner에서 실행하는 것을 권장합니다.",
    "- artifact retention은 workflow input과 checklist의 `artifactRetentionDays`로 같이 고정합니다.",
    "- `--history-dir`을 사용하면 RC artifact 안에 run별 summary/report/checklist 사본과 Markdown/HTML index가 자동으로 축적됩니다.",
    "- 기본 smoke와 RC-only 120분 gate는 분리되어야 합니다.",
  );
  return `${lines.join("\n")}\n`;
}

function overallStatus(items, context = {}) {
  const assetStatus = context.assetSummary?.status || "missing";
  const assetPass = assetStatus === "pass" || assetStatus === "missing";
  const ok = items.every((item) => item.result.status === "pass") && assetPass;
  return { ok, label: ok ? "PASS" : "CHECK" };
}

function writeHistory(baseDir, runIdValue, items, context, checklistPaths) {
  const runDir = path.join(baseDir, runIdValue);
  fs.mkdirSync(runDir, { recursive: true });
  const files = {
    checklistMarkdown: copyIfExists(checklistPaths.markdown, path.join(runDir, "rc-release-checklist.md")),
    checklistHtml: copyIfExists(checklistPaths.html, path.join(runDir, "rc-release-checklist.html")),
  };
  for (const item of items) {
    files[`${item.id}Summary`] = copyIfExists(item.summaryFile, path.join(runDir, `${item.id}-summary.json`));
    files[`${item.id}Report`] = copyIfExists(item.reportFile, path.join(runDir, `${item.id}-report.md`));
  }
  const record = {
    schema: "media-server.rc-soak-report.v1",
    runId: runIdValue,
    generatedAt: context.generatedAt || new Date().toISOString(),
    overall: overallStatus(items, context).label,
    artifactName: context.artifactName || "",
    artifactRetentionDays: context.artifactRetentionDays || "",
    runner: context.runnerLabel || "",
    ciRun: context.runUrl || "",
    repository: context.repository || "",
    ref: context.refName || "",
    sha: context.sha || "",
    gates: items.map((item) => ({
      id: item.id,
      title: item.title,
      command: item.command,
      status: item.result.label,
      detail: item.result.detail,
      summaryFile: files[`${item.id}Summary`] || item.summaryFile || "",
      reportFile: files[`${item.id}Report`] || item.reportFile || "",
    })),
    files,
  };
  writeText(path.join(runDir, "record.json"), `${JSON.stringify(record, null, 2)}\n`);
  const indexJson = path.join(baseDir, "index.json");
  const previous = readHistoryRecords(indexJson);
  const byRunId = new Map(previous.map((item) => [String(item.runId || ""), item]));
  byRunId.set(runIdValue, record);
  const records = Array.from(byRunId.values())
    .filter((item) => item.runId)
    .sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
  writeText(indexJson, `${JSON.stringify({
    schema: "media-server.rc-soak-history.v1",
    generatedAt: new Date().toISOString(),
    records,
  }, null, 2)}\n`);
  writeText(path.join(baseDir, "index.md"), buildHistoryMarkdown(records));
  writeText(path.join(baseDir, "index.html"), buildHtml(buildHistoryMarkdown(records)));
}

function readHistoryRecords(indexJson) {
  if (!fs.existsSync(indexJson)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(indexJson, "utf8"));
    return Array.isArray(payload.records) ? payload.records : [];
  } catch {
    return [];
  }
}

function copyIfExists(source, destination) {
  if (!source || !fs.existsSync(source)) return "";
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return destination;
}

function buildHistoryMarkdown(records) {
  const lines = [
    "# RC Soak Report History",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- records: ${records.length}`,
    "",
    "| Run | Overall | Generated | Runner | CI Run | Checklist | Gates |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const record of records) {
    const gates = Array.isArray(record.gates)
      ? record.gates.map((gate) => `${gate.title}: ${gate.status}`).join("<br>")
      : "";
    lines.push([
      `| ${escapeMarkdown(record.runId || "-")}`,
      escapeMarkdown(record.overall || "-"),
      escapeMarkdown(record.generatedAt || "-"),
      escapeMarkdown(record.runner || "(local)"),
      record.ciRun ? `[run](${record.ciRun})` : "(local)",
      markdownPath(record.files?.checklistMarkdown || ""),
      `${gates} |`,
    ].join(" | "));
  }
  lines.push(
    "",
    "## Notes",
    "",
    "- 이 index는 `rc-release-checklist --history-dir` 실행 때마다 기존 `index.json`을 읽고 같은 `runId`를 갱신합니다.",
    "- CI에서는 `artifacts/rc-gate/history/`가 `media-server-rc-gate` artifact에 함께 업로드됩니다.",
  );
  return `${lines.join("\n")}\n`;
}

function buildHtml(markdown) {
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>RC Release Checklist</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:1040px;margin:32px auto;padding:0 16px;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}code{white-space:pre-wrap}</style></head>
<body><pre>${escapeHtml(markdown)}</pre></body>
</html>
`;
}

function markdownPath(filePath) {
  return filePath ? `\`${filePath}\`` : "`(missing)`";
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
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
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
