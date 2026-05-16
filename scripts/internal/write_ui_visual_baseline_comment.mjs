#!/usr/bin/env node
// 파일 용도: UI visual baseline diff report를 PR/issue comment용 Markdown으로 요약한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const DIFF_SCHEMA = "media-server.ui-visual-baseline-diff.v1";

if (isMainModule()) {
  main();
}

export function buildUiVisualBaselineComment({
  diffReport,
  output = "",
  artifactUrlBase = "",
  maxItems = 12,
  title = "UI Visual Baseline Diff",
} = {}) {
  if (!diffReport) throw new Error("--diff-report is required");
  const resolvedReport = path.resolve(diffReport);
  if (!fs.existsSync(resolvedReport)) throw new Error(`diff report not found: ${resolvedReport}`);
  const report = JSON.parse(fs.readFileSync(resolvedReport, "utf8"));
  if (report.schema !== DIFF_SCHEMA) {
    throw new Error(`diff report schema mismatch: ${report.schema || "(missing)"}`);
  }
  const summary = report.summary || {};
  const decision = String(summary.decision || (summary.failed > 0 ? "fail" : "pass")).toUpperCase();
  const attentionItems = (report.results || [])
    .filter((item) => !item.ok || item.requiresReview)
    .slice(0, Math.max(1, Number(maxItems) || 12));
  const lines = [
    `## ${title}`,
    "",
    `**Decision:** ${decision}`,
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| compared | ${summary.compared ?? 0} |`,
    `| passed | ${summary.passed ?? 0} |`,
    `| failed | ${summary.failed ?? 0} |`,
    `| review | ${summary.review ?? 0} |`,
    `| changed | ${summary.changed ?? 0} |`,
    `| missing | ${summary.missing ?? 0} |`,
    `| extra | ${summary.extra ?? 0} |`,
    "",
    `Policy: \`${report.policy?.schema || "unknown"}\``,
    `Baseline: \`${report.baselineDir || ""}\``,
    `Candidate: \`${report.candidateDir || ""}\``,
    "",
    "### Attention Items",
    "",
  ];
  if (attentionItems.length === 0) {
    lines.push("- No failed or review-required screenshots.");
  } else {
    lines.push("| File | Status | Review | Page | Width | Changed % | Reason |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const item of attentionItems) {
      const file = String(item.file || "");
      const label = artifactUrlBase ? `[${file}](${joinUrl(artifactUrlBase, file)})` : file;
      lines.push([
        `| ${label}`,
        item.status || "",
        item.requiresReview ? "yes" : "",
        item.page || "",
        item.viewport?.width ?? item.dimensions?.baseline?.width ?? "",
        item.changedPct == null ? "" : formatPct(item.changedPct),
        sanitizeMarkdownCell(item.reason || item.reviewReason || ""),
      ].join(" | ") + " |");
    }
    const remaining = (report.results || []).filter((item) => !item.ok || item.requiresReview).length - attentionItems.length;
    if (remaining > 0) lines.push(`\n- ${remaining} more attention item(s) in the full diff report.`);
  }
  lines.push("");
  lines.push("### Next Step");
  lines.push("");
  if (decision === "FAIL") {
    lines.push("- Treat as blocking until failed screenshots are fixed or the baseline is intentionally updated.");
  } else if (decision === "REVIEW") {
    lines.push("- Review changed or candidate-only screenshots before merging.");
  } else {
    lines.push("- No visual baseline action required.");
  }
  lines.push("");

  const body = lines.join("\n");
  if (output) {
    const resolvedOutput = path.resolve(output);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, body);
    return { output: resolvedOutput, body };
  }
  return { output: "", body };
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (hasHelpFlag(rawArgs)) {
    printUsageAndExit(`UI visual baseline PR comment helper

Usage:
  ./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> [options]

Options:
  --diff-report <path>       compare-ui-visual-baseline이 생성한 visual-baseline-diff.json입니다.
  --output <path>            Markdown comment 출력 파일입니다. 생략하면 stdout으로 출력합니다.
  --artifact-url-base <url>  screenshot artifact URL base입니다.
  --max-items <n>            comment에 포함할 실패/review 항목 수입니다. 기본 12입니다.
  --title <text>             comment 제목입니다.
  -h, --help                 도움말 출력
`);
  }
  assertKnownOptions(rawArgs, [
    "diff-report",
    "output",
    "artifact-url-base",
    "max-items",
    "title",
    "h",
    "help",
  ]);
  try {
    const args = parseArgs(rawArgs);
    const result = buildUiVisualBaselineComment({
      diffReport: args.diffReport,
      output: args.output,
      artifactUrlBase: args.artifactUrlBase,
      maxItems: args.maxItems,
      title: args.title,
    });
    if (result.output) {
      console.log(`[pass] UI visual baseline comment: ${result.output}`);
    } else {
      process.stdout.write(result.body);
    }
  } catch (error) {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function joinUrl(base, file) {
  return `${String(base || "").replace(/\/+$/, "")}/${encodeURIComponent(file)}`;
}

function formatPct(value) {
  return Number(value || 0).toFixed(4).replace(/\.?0+$/, "");
}

function sanitizeMarkdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    const key = token.slice(2, eq >= 0 ? eq : undefined).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (eq >= 0) {
      result[key] = token.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = "1";
    }
  }
  return result;
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
