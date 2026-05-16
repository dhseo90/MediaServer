#!/usr/bin/env node
// 파일 용도: UI visual QA issue에 붙일 screenshot artifact 링크 블록을 생성한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const ARTIFACT_SCHEMA = "media-server.ui-visual-artifact-index.v1";
const DIFF_SCHEMA = "media-server.ui-visual-baseline-diff.v1";

if (isMainModule()) {
  main();
}

export function buildUiVisualQaIssueLinks({
  artifactDir,
  diffDir,
  output,
  artifactUrlBase = "",
  diffUrlBase = "",
  maxScreenshots = 12,
  title = "UI Visual QA Artifact Links",
} = {}) {
  if (!artifactDir) throw new Error("--artifact-dir is required");
  const resolvedArtifactDir = path.resolve(artifactDir);
  const resolvedDiffDir = path.resolve(diffDir || artifactDir);
  const manifestPath = path.join(resolvedArtifactDir, "visual-regression-manifest.json");
  const indexPath = path.join(resolvedArtifactDir, "index.md");
  if (!fs.existsSync(manifestPath)) throw new Error(`visual manifest not found: ${manifestPath}`);
  if (!fs.existsSync(indexPath)) throw new Error(`visual artifact index not found: ${indexPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== ARTIFACT_SCHEMA) {
    throw new Error(`visual manifest schema mismatch: ${manifest.schema || "(missing)"}`);
  }
  if (!Array.isArray(manifest.screenshots)) {
    throw new Error("visual manifest screenshots must be an array");
  }

  const diffJsonPath = path.join(resolvedDiffDir, "visual-baseline-diff.json");
  const diffMdPath = path.join(resolvedDiffDir, "visual-baseline-diff.md");
  const diffReport = fs.existsSync(diffJsonPath) ? JSON.parse(fs.readFileSync(diffJsonPath, "utf8")) : null;
  if (diffReport && diffReport.schema !== DIFF_SCHEMA) {
    throw new Error(`visual baseline diff schema mismatch: ${diffReport.schema || "(missing)"}`);
  }

  const screenshotLimit = Math.max(1, Number(maxScreenshots) || 12);
  const lines = [
    `## ${title}`,
    "",
    "Issue template의 `Screenshot artifact` 영역에 붙일 링크입니다.",
    "",
    "```text",
    `Artifact directory: ${resolvedArtifactDir}`,
    `visual-regression-manifest.json: ${linkMarkdown("visual-regression-manifest.json", linkTarget("visual-regression-manifest.json", artifactUrlBase))}`,
    `index.md: ${linkMarkdown("index.md", linkTarget("index.md", artifactUrlBase))}`,
    `visual-baseline-diff.json: ${fs.existsSync(diffJsonPath) ? linkMarkdown("visual-baseline-diff.json", linkTarget("visual-baseline-diff.json", diffUrlBase || artifactUrlBase, resolvedDiffDir, resolvedArtifactDir)) : "(not generated)"}`,
    `visual-baseline-diff.md: ${fs.existsSync(diffMdPath) ? linkMarkdown("visual-baseline-diff.md", linkTarget("visual-baseline-diff.md", diffUrlBase || artifactUrlBase, resolvedDiffDir, resolvedArtifactDir)) : "(not generated)"}`,
    "```",
    "",
    "### Screenshot Links",
    "",
  ];

  const screenshots = manifest.screenshots.slice(0, screenshotLimit);
  if (screenshots.length === 0) {
    lines.push("- (no screenshots in manifest)");
  } else {
    for (const item of screenshots) {
      const file = String(item?.file || "").trim();
      if (!file) continue;
      const page = String(item?.page || "").trim() || "(extra artifact)";
      const width = item?.viewport?.width ? `${item.viewport.width}px` : "unknown viewport";
      lines.push(`- ${page} / ${width}: ${linkMarkdown(file, linkTarget(file, artifactUrlBase))}`);
    }
  }
  if (manifest.screenshots.length > screenshots.length) {
    lines.push(`- ... ${manifest.screenshots.length - screenshots.length} more screenshots in ${linkMarkdown("index.md", linkTarget("index.md", artifactUrlBase))}`);
  }

  lines.push("");
  lines.push("### Verification Summary");
  lines.push("");
  lines.push(`- screenshots: ${manifest.screenshotCount ?? manifest.screenshots.length}`);
  lines.push(`- retention default: ${manifest.retentionPolicy?.defaultDays ?? "(unknown)"} days`);
  lines.push(`- release baseline retention: ${manifest.retentionPolicy?.releaseBaselineDays ?? "(unknown)"} days`);
  if (diffReport) {
    lines.push(`- baseline diff: compared ${diffReport.summary?.compared ?? 0}, failed ${diffReport.summary?.failed ?? 0}`);
  } else {
    lines.push("- baseline diff: not generated");
  }
  lines.push("- client/viewer forbidden data: source URL, Developer URL, raw JSON/debug counter, BBox diagnostics, rule/profile editor는 screenshot에 넣지 않습니다.");
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
    printUsageAndExit(`UI visual QA issue artifact link helper

Usage:
  ./server.sh write-ui-visual-qa-issue-links --artifact-dir <dir> [options]

Options:
  --artifact-dir <path>       visual-regression-manifest.json과 index.md가 있는 artifact 디렉터리입니다.
  --diff-dir <path>           visual-baseline-diff.json/md가 있는 디렉터리입니다. 기본 artifact-dir.
  --output <path>             Markdown 출력 파일입니다. 생략하면 stdout으로 출력합니다.
  --artifact-url-base <url>   artifact viewer URL base입니다. 생략하면 ./filename 링크를 만듭니다.
  --diff-url-base <url>       baseline diff artifact URL base입니다. 생략하면 artifact-url-base를 사용합니다.
  --max-screenshots <n>       issue body에 나열할 screenshot 링크 수입니다. 기본 12.
  --title <text>              Markdown 제목입니다.
  -h, --help                  도움말 출력
`);
  }
  assertKnownOptions(rawArgs, [
    "artifact-dir",
    "diff-dir",
    "output",
    "artifact-url-base",
    "diff-url-base",
    "max-screenshots",
    "title",
    "h",
    "help",
  ]);
  try {
    const args = parseArgs(rawArgs);
    const result = buildUiVisualQaIssueLinks({
      artifactDir: args.artifactDir,
      diffDir: args.diffDir,
      output: args.output,
      artifactUrlBase: args.artifactUrlBase,
      diffUrlBase: args.diffUrlBase,
      maxScreenshots: args.maxScreenshots,
      title: args.title,
    });
    if (result.output) {
      console.log(`[pass] UI visual QA issue links: ${result.output}`);
    } else {
      process.stdout.write(result.body);
    }
  } catch (error) {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function linkTarget(file, urlBase = "", sourceDir = "", artifactDir = "") {
  if (urlBase) return joinUrl(urlBase, file);
  if (sourceDir && artifactDir && path.resolve(sourceDir) !== path.resolve(artifactDir)) {
    return path.relative(path.resolve(artifactDir), path.join(path.resolve(sourceDir), file)).replaceAll(path.sep, "/");
  }
  return `./${encodeURI(file)}`;
}

function linkMarkdown(label, target) {
  return `[${label}](${target})`;
}

function joinUrl(base, file) {
  return `${String(base || "").replace(/\/+$/, "")}/${encodeURIComponent(file)}`;
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
