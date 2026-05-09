#!/usr/bin/env node
// 파일 용도: RC 전용 120분 soak/VA runtime longrun 결과를 release checklist Markdown/HTML로 묶는다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const runId = args.runId || `rc-${Date.now()}-${process.pid}`;
const output = args.output || path.join(os.tmpdir(), `media_server_${runId}_release_checklist.md`);
const htmlOutput = args.htmlOutput || output.replace(/\.md$/i, ".html");
const ciContext = buildCiContext(args);

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
writeText(output, buildMarkdown(rows, ciContext));
writeText(htmlOutput, buildHtml(rows, ciContext));

console.log(`[pass] rc release checklist: ${output}`);
console.log(`[pass] rc release checklist html: ${htmlOutput}`);

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
    artifactName: parsedArgs.artifactName || "",
    artifactRetentionDays: parsedArgs.artifactRetentionDays || process.env.RC_ARTIFACT_RETENTION_DAYS || "",
    assetManifest: parsedArgs.assetManifest || "",
    assetSummary: summarizeAssets(parsedArgs.assetManifest || ""),
    runnerLabel: parsedArgs.runnerLabel || process.env.RUNNER_NAME || "",
    runUrl,
    repository: process.env.GITHUB_REPOSITORY || "",
    refName: process.env.GITHUB_REF_NAME || "",
    sha: process.env.GITHUB_SHA || "",
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
  const generatedAt = new Date().toISOString();
  const assetPass = context.assetSummary.status === "pass" || context.assetSummary.status === "missing";
  const allPass = items.every((item) => item.result.status === "pass") && assetPass;
  const lines = [
    "# RC Release Checklist",
    "",
    `- generatedAt: ${generatedAt}`,
    `- overall: ${allPass ? "PASS" : "CHECK"}`,
    "- scope: 120분 predev soak와 120분 VA runtime longrun 결과 연결",
    context.artifactName ? `- ciArtifact: ${context.artifactName}` : "- ciArtifact: (local)",
    context.artifactRetentionDays ? `- artifactRetentionDays: ${context.artifactRetentionDays}` : "- artifactRetentionDays: (local)",
    context.runnerLabel ? `- runner: ${context.runnerLabel}` : "- runner: (local)",
    context.assetManifest ? `- assetManifest: ${context.assetManifest}` : "- assetManifest: (missing)",
    `- assetStatus: ${context.assetSummary.label}${context.assetSummary.detail ? ` (${context.assetSummary.detail})` : ""}`,
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
    allPass
      ? "- [x] RC gate 결과가 모두 PASS입니다. 최종 수동 점검 후 release 승격 후보로 볼 수 있습니다."
      : "- [ ] PASS가 아닌 gate가 있습니다. release 승격 전에 실패 로그와 리포트를 확인합니다.",
    "",
    "## Notes",
    "",
    "- 이 checklist는 장기 검증을 실행하지 않고, 이미 생성된 summary/report를 release 기준 문서로 연결합니다.",
    "- GitHub Actions에서는 `media-server-rc-gate` artifact에 summary, report, Markdown/HTML checklist를 함께 업로드합니다.",
    "- 실제 RC gate는 sample video, YOLO model, labels가 준비된 self-hosted macOS runner에서 실행하는 것을 권장합니다.",
    "- artifact retention은 workflow input과 checklist의 `artifactRetentionDays`로 같이 고정합니다.",
    "- 기본 smoke와 RC-only 120분 gate는 분리되어야 합니다.",
  );
  return `${lines.join("\n")}\n`;
}

function buildHtml(items, context = {}) {
  const markdown = buildMarkdown(items, context);
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
