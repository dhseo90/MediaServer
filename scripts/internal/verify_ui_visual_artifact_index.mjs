#!/usr/bin/env node
// 파일 용도: UI visual regression screenshot artifact index/manifest 생성을 정적 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { compareVisualBaseline } from "./compare_ui_visual_baseline.mjs";
import { manageUiVisualArtifacts } from "./manage_ui_visual_artifacts.mjs";
import { buildUiVisualBaselineComment } from "./write_ui_visual_baseline_comment.mjs";
import { writeVisualArtifactIndex } from "./ui_visual_smoke_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI visual artifact index verification

Usage:
  ./server.sh verify-ui-visual-artifact-index [options]

Options:
  --output-dir <path>   Fixture artifact 출력 디렉터리입니다. 기본 임시 디렉터리.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, ["output-dir", "h", "help"]);
const args = parseArgs(rawArgs);
const outputDir = path.resolve(args.outputDir || fs.mkdtempSync(path.join(os.tmpdir(), "media-server-ui-artifact-index-")));
fs.mkdirSync(outputDir, { recursive: true });

const checks = [
  { name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' },
  { name: "ops-dashboard", path: "/ops/dashboard", visualSelector: '[data-testid="ops-dashboard-page"]' },
  { name: "client-live", path: "/client/live", visualSelector: '[data-testid="client-shell-page"]' },
];
for (const file of [
  "ops-home-320.png",
  "ops-home-1180.png",
  "ops-dashboard-390.png",
  "client-live-760.png",
  "ops-sources-onvif-preview-tool-390.png",
]) {
  fs.writeFileSync(path.join(outputDir, file), `fixture:${file}\n`);
}

const manifest = writeVisualArtifactIndex({
  outputDir,
  title: "Fixture Visual Regression Artifacts",
  command: "./server.sh verify-ops-client-ui --screenshots",
  httpBase: "http://127.0.0.1:8081",
  visualWidths: [320, 390, 760, 1180],
  visualHeight: 900,
  checks,
});

const manifestPath = path.join(outputDir, "visual-regression-manifest.json");
const indexPath = path.join(outputDir, "index.md");
const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const markdown = fs.readFileSync(indexPath, "utf8");
const docs = [
  fs.readFileSync(path.join(rootDir, "docs/stream-verification.md"), "utf8"),
  fs.readFileSync(path.join(rootDir, "docs/ui-guide.md"), "utf8"),
  fs.readFileSync(path.join(rootDir, "docs/release-policy.md"), "utf8"),
  fs.readFileSync(path.join(rootDir, ".github/PULL_REQUEST_TEMPLATE.md"), "utf8"),
  fs.readFileSync(path.join(rootDir, ".github/ISSUE_TEMPLATE/ui_visual_qa.yml"), "utf8"),
].join("\n");
const authSmoke = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_auth_ui_smoke.mjs"), "utf8");
const serverSh = fs.readFileSync(path.join(rootDir, "server.sh"), "utf8");
const compareScript = fs.readFileSync(path.join(rootDir, "scripts/internal/compare_ui_visual_baseline.mjs"), "utf8");
const commentScript = fs.readFileSync(path.join(rootDir, "scripts/internal/write_ui_visual_baseline_comment.mjs"), "utf8");
const issueLinkScript = fs.readFileSync(path.join(rootDir, "scripts/internal/write_ui_visual_qa_issue_links.mjs"), "utf8");
const maintenanceScript = fs.readFileSync(path.join(rootDir, "scripts/internal/manage_ui_visual_artifacts.mjs"), "utf8");
const releaseBaselineTemplate = fs.readFileSync(path.join(rootDir, "docs/ui-visual-release-baseline-approval-template.md"), "utf8");

const checksRun = [];
check("visual artifact manifest schema is valid", () => {
  assert(parsed.schema === "media-server.ui-visual-artifact-index.v1", "manifest schema mismatch");
  assert(parsed.screenshotCount === 5, `expected 5 screenshots, got ${parsed.screenshotCount}`);
  assert(Array.isArray(parsed.screenshots), "manifest screenshots must be an array");
  assert(parsed.retentionPolicy?.schema === "media-server.ui-visual-artifact-retention.v1", "manifest retention policy schema missing");
  assert(parsed.retentionPolicy?.defaultDays === 14, "manifest default retention days mismatch");
  assert(parsed.retentionPolicy?.releaseBaselineDays === 45, "manifest release baseline retention days mismatch");
  assert(parsed.screenshots.some((item) => item.file === "ops-home-320.png" && item.page === "/ops/home"), "ops home page mapping missing");
  assert(parsed.screenshots.some((item) => item.file === "ops-sources-onvif-preview-tool-390.png" && item.page === ""), "extra artifact row should be retained without page mapping");
});

check("markdown index links every screenshot", () => {
  for (const item of manifest.screenshots) {
    assert(markdown.includes(`./${item.file}`), `markdown index missing screenshot link: ${item.file}`);
  }
  assert(markdown.includes("UI Visual Regression Artifact Index"), "markdown title missing");
});

check("docs mention visual artifact index outputs", () => {
  for (const snippet of [
    "visual-regression-manifest.json",
    "index.md",
    "media-server.ui-visual-artifact-index.v1",
    "media-server.ui-visual-artifact-retention.v1",
    "14 days",
    "45 days",
    "release baseline artifact role",
    "approved comparator",
    "not a public release asset",
    "accepted baseline run",
    "ui-visual-release-baseline-approval-template.md",
  ]) {
    assert(docs.includes(snippet), `docs missing visual artifact index snippet: ${snippet}`);
  }
});

check("PR template requires visual review artifact evidence", () => {
  const template = fs.readFileSync(path.join(rootDir, ".github/PULL_REQUEST_TEMPLATE.md"), "utf8");
  for (const snippet of [
    "## UI Visual Review",
    "Artifact directory:",
    "./server.sh verify-ops-client-ui --screenshots --output-dir <artifact-dir>",
    "./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> --output <comment.md>",
    "320px, 390px, 760px, and 1180px",
    "source URL, Developer URL, raw JSON",
    "14 days",
    "45 days",
    "release baseline artifact",
    "approved comparator",
    "not a public release asset or candidate pass proof",
    "docs/ui-visual-release-baseline-approval-template.md",
    "./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root> --archive-dir <archive-dir> --report <report.json>",
  ]) {
    assert(template.includes(snippet), `PR template missing visual review checklist snippet: ${snippet}`);
  }
});

check("release baseline approval template captures acceptance evidence", () => {
  for (const snippet of [
    "UI Visual Release Baseline Approval Log",
    "approved comparator",
    "public release asset",
    "candidate pass proof",
    "Baseline Identity",
    "Replacement Reason",
    "Comparison Evidence",
    "Manual Review",
    "accepted baseline run",
    "실물 ONVIF/RTSP/WebRTC 원본 장비 field smoke",
    "verify-predev",
  ]) {
    assert(releaseBaselineTemplate.includes(snippet), `release baseline approval template missing snippet: ${snippet}`);
  }
});

check("visual QA issue template captures artifact evidence", () => {
  const template = fs.readFileSync(path.join(rootDir, ".github/ISSUE_TEMPLATE/ui_visual_qa.yml"), "utf8");
  for (const snippet of [
    "UI visual QA",
    "visual-regression",
    "Artifact directory:",
    "visual-regression-manifest.json:",
    "index.md:",
    "visual-baseline-diff.json:",
    "./server.sh verify-ops-client-ui --screenshots --output-dir <artifact-dir>",
    "./server.sh compare-ui-visual-baseline --baseline-dir <baseline-artifact-dir> --candidate-dir <candidate-artifact-dir>",
    "./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> --output <comment.md>",
    "./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir> --output <artifact-dir>/ui-visual-qa-issue-links.md",
    "./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root> --archive-dir <archive-dir> --report <report.json>",
    "MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap",
    "./server.sh verify-ui-visual-artifact-index",
    "source URL",
    "Developer URL",
    "raw JSON/debug counter",
    "BBox diagnostics",
    "rule/profile editor",
    "미실행/미확인",
  ]) {
    assert(template.includes(snippet), `UI visual QA issue template missing snippet: ${snippet}`);
  }
});

check("auth screenshot smoke writes indexed visual artifacts", () => {
  for (const snippet of [
    "writeVisualArtifactIndex",
    "Auth Visual Regression Artifacts",
    "MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap",
    "320,390,760,1180",
  ]) {
    assert(authSmoke.includes(snippet), `auth visual smoke missing artifact index snippet: ${snippet}`);
  }
});

check("visual baseline diff tooling is wired", () => {
  for (const snippet of [
    "compare-ui-visual-baseline",
    "compare_ui_visual_baseline.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing visual baseline diff snippet: ${snippet}`);
  }
  for (const snippet of [
    "media-server.ui-visual-baseline-diff.v1",
    "--baseline-dir <baseline-artifact-dir>",
    "--candidate-dir <candidate-artifact-dir>",
  ]) {
    assert(docs.includes(snippet), `docs missing visual baseline diff snippet: ${snippet}`);
  }
  for (const snippet of [
    "readPngAsRgba",
    "visual-baseline-diff.json",
    "media-server.ui-visual-baseline-diff.v1",
    "media-server.ui-visual-baseline-candidate-policy.v1",
    "--fail-on-review",
    "reviewRequired",
  ]) {
    assert(compareScript.includes(snippet), `compare script missing visual baseline diff snippet: ${snippet}`);
  }
});

check("visual QA issue link helper is wired", () => {
  for (const snippet of [
    "write-ui-visual-qa-issue-links",
    "write_ui_visual_qa_issue_links.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing visual QA issue link helper snippet: ${snippet}`);
  }
  for (const snippet of [
    "write-ui-visual-qa-issue-links",
    "ui-visual-qa-issue-links.md",
  ]) {
    assert(docs.includes(snippet), `docs missing visual QA issue link helper snippet: ${snippet}`);
  }
  for (const snippet of [
    "media-server.ui-visual-artifact-index.v1",
    "visual-regression-manifest.json",
    "visual-baseline-diff.json",
    "Screenshot Links",
  ]) {
    assert(issueLinkScript.includes(snippet), `issue link helper missing snippet: ${snippet}`);
  }
  const issueOutput = path.join(outputDir, "ui-visual-qa-issue-links.md");
  childProcess.execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/write_ui_visual_qa_issue_links.mjs"),
    "--artifact-dir",
    outputDir,
    "--output",
    issueOutput,
  ], { stdio: "pipe" });
  const issueMarkdown = fs.readFileSync(issueOutput, "utf8");
  for (const snippet of [
    "UI Visual QA Artifact Links",
    "visual-regression-manifest.json",
    "index.md",
    "ops-home-320.png",
    "source URL, Developer URL, raw JSON/debug counter",
  ]) {
    assert(issueMarkdown.includes(snippet), `issue link helper output missing snippet: ${snippet}`);
  }
});

check("visual baseline comment helper is wired", () => {
  const inventory = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_script_inventory.mjs"), "utf8");
  for (const snippet of [
    "write-ui-visual-baseline-comment",
    "write_ui_visual_baseline_comment.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing visual baseline comment helper snippet: ${snippet}`);
  }
  assert(inventory.includes("write_ui_visual_baseline_comment.mjs"), "script inventory missing visual baseline comment helper script");
  for (const snippet of [
    "write-ui-visual-baseline-comment",
    "--diff-report <visual-baseline-diff.json>",
    "UI Visual Baseline Diff",
  ]) {
    assert(docs.includes(snippet), `docs missing visual baseline comment helper snippet: ${snippet}`);
  }
  for (const snippet of [
    "media-server.ui-visual-baseline-diff.v1",
    "Decision:",
    "Attention Items",
    "artifact-url-base",
  ]) {
    assert(commentScript.includes(snippet), `comment helper missing snippet: ${snippet}`);
  }
});

check("visual baseline diff preflight artifact is wired", () => {
  const preflight = fs.readFileSync(path.join(rootDir, ".github/workflows/preflight.yml"), "utf8");
  for (const snippet of [
    "artifacts/ui-visual-baseline-diff",
    "write-ui-visual-baseline-comment",
    "visual-baseline-comment.md",
    "Upload UI visual baseline diff preflight artifact",
    "id: upload-ui-visual-baseline-diff",
    "media-server-ui-visual-baseline-diff",
    "Publish UI visual baseline PR summary",
    "GITHUB_STEP_SUMMARY",
    "steps.upload-ui-visual-baseline-diff.outputs.artifact-url",
    "Artifact download:",
    "visual-baseline-diff.json",
    "visual-baseline-diff.md",
    "actions/upload-artifact@v6",
  ]) {
    assert(preflight.includes(snippet), `preflight missing visual baseline diff artifact snippet: ${snippet}`);
  }
  for (const snippet of [
    "media-server-ui-visual-baseline-diff",
    "visual-baseline-comment.md",
    "GITHUB_STEP_SUMMARY",
    "artifact download",
    "preflight CI",
  ]) {
    assert(docs.includes(snippet), `docs missing visual baseline diff preflight snippet: ${snippet}`);
  }
});

check("visual artifact maintenance command is wired", () => {
  const inventory = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_script_inventory.mjs"), "utf8");
  const preflight = fs.readFileSync(path.join(rootDir, ".github/workflows/preflight.yml"), "utf8");
  for (const snippet of [
    "ui-visual-artifact-maintenance",
    "manage_ui_visual_artifacts.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing visual artifact maintenance snippet: ${snippet}`);
  }
  assert(inventory.includes("manage_ui_visual_artifacts.mjs"), "script inventory missing visual artifact maintenance script");
  for (const snippet of [
    "ui-visual-artifact-maintenance",
    "--artifact-root <artifact-root>",
    "media-server-ui-visual-maintenance-dry-run",
    "dry-run",
    "media-server.ui-visual-artifact-maintenance.v1",
    "media-server.ui-visual-artifact-archive-index.v1",
    "ui-visual-artifact-archive-index.json",
    "duplicatePolicy",
    "archiveSequence",
    "history",
    "PR Summary",
  ]) {
    assert(docs.includes(snippet), `docs missing visual artifact maintenance snippet: ${snippet}`);
  }
  for (const snippet of [
    "media-server.ui-visual-artifact-maintenance.v1",
    "--apply",
    "retentionPolicy",
    "visual-regression-manifest.json",
    "## PR Summary",
    "expiredArtifacts",
    "media-server.ui-visual-artifact-archive-index.v1",
    "ui-visual-artifact-archive-index.json",
    "buildArchiveIndexMarkdown",
    "uniqueArchiveTarget",
    "duplicatePolicy",
    "archiveSequence",
    "duplicateOf",
  ]) {
    assert(maintenanceScript.includes(snippet), `maintenance script missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "UI visual artifact maintenance dry-run",
    "./server.sh ui-visual-artifact-maintenance",
    "--max-age-days 0",
    "media-server-ui-visual-maintenance-dry-run",
    "actions/upload-artifact@v6",
  ]) {
    assert(preflight.includes(snippet), `preflight missing visual artifact maintenance CI snippet: ${snippet}`);
  }
});

check("visual baseline diff report fixture", () => {
  const baselineDir = path.join(outputDir, "baseline");
  const candidateDir = path.join(outputDir, "candidate");
  const diffDir = path.join(outputDir, "baseline-diff");
  for (const dir of [baselineDir, candidateDir]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "ops-home-320.png"), "fixture-identical-ops-home\n");
    writeVisualArtifactIndex({
      outputDir: dir,
      title: "Fixture Visual Regression Artifacts",
      command: "./server.sh verify-ops-client-ui --screenshots",
      httpBase: "http://127.0.0.1:8081",
      visualWidths: [320],
      visualHeight: 900,
      checks: [{ name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' }],
    });
  }
  const report = compareVisualBaseline({
    baselineDir,
    candidateDir,
    outputDir: diffDir,
    maxDiffPct: 0,
  });
  assert(report.schema === "media-server.ui-visual-baseline-diff.v1", "baseline diff schema mismatch");
  assert(report.summary.failed === 0, `baseline diff fixture failed: ${report.summary.failed}`);
  assert(report.summary.decision === "pass", `baseline diff fixture decision mismatch: ${report.summary.decision}`);
  assert(fs.existsSync(path.join(diffDir, "visual-baseline-diff.json")), "baseline diff JSON report missing");
  assert(fs.existsSync(path.join(diffDir, "visual-baseline-diff.md")), "baseline diff Markdown report missing");
});

check("visual baseline candidate policy fixture", () => {
  const baselineDir = path.join(outputDir, "policy-baseline");
  const candidateDir = path.join(outputDir, "policy-candidate");
  const reviewDir = path.join(outputDir, "policy-review-diff");
  const failDir = path.join(outputDir, "policy-fail-diff");
  fs.mkdirSync(baselineDir, { recursive: true });
  fs.mkdirSync(candidateDir, { recursive: true });
  fs.writeFileSync(path.join(baselineDir, "ops-home-320.png"), "fixture-identical-ops-home\n");
  fs.writeFileSync(path.join(candidateDir, "ops-home-320.png"), "fixture-identical-ops-home\n");
  fs.writeFileSync(path.join(candidateDir, "client-live-320.png"), "fixture-extra-client-live\n");
  writeVisualArtifactIndex({
    outputDir: baselineDir,
    title: "Policy Baseline",
    command: "./server.sh verify-ops-client-ui --screenshots",
    httpBase: "http://127.0.0.1:8081",
    visualWidths: [320],
    visualHeight: 900,
    checks: [{ name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' }],
  });
  writeVisualArtifactIndex({
    outputDir: candidateDir,
    title: "Policy Candidate",
    command: "./server.sh verify-ops-client-ui --screenshots",
    httpBase: "http://127.0.0.1:8081",
    visualWidths: [320],
    visualHeight: 900,
    checks: [
      { name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' },
      { name: "client-live", path: "/client/live", visualSelector: '[data-testid="client-shell-page"]' },
    ],
  });
  const reviewReport = compareVisualBaseline({
    baselineDir,
    candidateDir,
    outputDir: reviewDir,
    allowExtra: true,
  });
  assert(reviewReport.summary.failed === 0, `allow-extra policy should not fail: ${reviewReport.summary.failed}`);
  assert(reviewReport.summary.decision === "review", `allow-extra policy decision mismatch: ${reviewReport.summary.decision}`);
  assert(reviewReport.summary.reviewRequired === true, "allow-extra policy should require visual review");
  assert(reviewReport.summary.extraAllowed === 1, `allow-extra policy extraAllowed mismatch: ${reviewReport.summary.extraAllowed}`);
  const commentPath = path.join(outputDir, "policy-review-comment.md");
  const comment = buildUiVisualBaselineComment({
    diffReport: path.join(reviewDir, "visual-baseline-diff.json"),
    output: commentPath,
    artifactUrlBase: "https://example.invalid/artifacts",
  });
  assert(fs.existsSync(commentPath), "visual baseline comment output missing");
  for (const snippet of [
    "Decision:** REVIEW",
    "client-live-320.png",
    "Review changed or candidate-only screenshots before merging.",
  ]) {
    assert(comment.body.includes(snippet), `visual baseline comment missing snippet: ${snippet}`);
  }
  const failReport = compareVisualBaseline({
    baselineDir,
    candidateDir,
    outputDir: failDir,
  });
  assert(failReport.summary.failed === 1, `strict policy should fail on extra screenshot: ${failReport.summary.failed}`);
  assert(failReport.summary.decision === "fail", `strict policy decision mismatch: ${failReport.summary.decision}`);
});

check("visual artifact maintenance fixture", () => {
  const artifactRoot = path.join(outputDir, "maintenance-root");
  const archiveDir = path.join(outputDir, "maintenance-archive");
  const freshDir = path.join(artifactRoot, "fresh-artifact");
  const expiredDir = path.join(artifactRoot, "expired-artifact");
  fs.mkdirSync(freshDir, { recursive: true });
  fs.mkdirSync(expiredDir, { recursive: true });
  fs.writeFileSync(path.join(freshDir, "ops-home-320.png"), "fresh\n");
  fs.writeFileSync(path.join(expiredDir, "ops-home-320.png"), "expired\n");
  for (const dir of [freshDir, expiredDir]) {
    writeVisualArtifactIndex({
      outputDir: dir,
      title: "Maintenance Fixture",
      command: "./server.sh verify-ops-client-ui --screenshots",
      httpBase: "http://127.0.0.1:8081",
      visualWidths: [320],
      visualHeight: 900,
      checks: [{ name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' }],
    });
  }
  setManifestGeneratedAt(path.join(freshDir, "visual-regression-manifest.json"), "2026-05-15T00:00:00Z");
  setManifestGeneratedAt(path.join(expiredDir, "visual-regression-manifest.json"), "2026-04-01T00:00:00Z");
  const dryRun = manageUiVisualArtifacts({
    artifactRoot,
    archiveDir,
    markdownReport: path.join(outputDir, "maintenance-dry-run-report.md"),
    apply: false,
    now: "2026-05-16T00:00:00Z",
  });
  assert(dryRun.summary.keep === 1, `maintenance dry-run keep mismatch: ${dryRun.summary.keep}`);
  assert(dryRun.summary.archive === 1, `maintenance dry-run archive mismatch: ${dryRun.summary.archive}`);
  assert(dryRun.summary.cleanup === 1, `maintenance dry-run cleanup mismatch: ${dryRun.summary.cleanup}`);
  assert(dryRun.summary.expiredArtifacts === 1, `maintenance dry-run expired artifacts mismatch: ${dryRun.summary.expiredArtifacts}`);
  assert(fs.existsSync(expiredDir), "dry-run must not remove expired artifact");
  const dryRunMarkdown = fs.readFileSync(dryRun.markdownReportPath, "utf8");
  for (const snippet of [
    "## PR Summary",
    "Decision: REVIEW",
    "Mode: dry-run",
    "Expired artifacts: 1",
    "Planned cleanup actions: 1",
    "Review archive/cleanup candidates before rerunning with --apply.",
  ]) {
    assert(dryRunMarkdown.includes(snippet), `maintenance dry-run Markdown missing snippet: ${snippet}`);
  }
  const reportPath = path.join(outputDir, "maintenance-report.json");
  const markdownPath = path.join(outputDir, "maintenance-report.md");
  const applied = manageUiVisualArtifacts({
    artifactRoot,
    archiveDir,
    report: reportPath,
    markdownReport: markdownPath,
    apply: true,
    now: "2026-05-16T00:00:00Z",
  });
  assert(applied.schema === "media-server.ui-visual-artifact-maintenance.v1", "maintenance report schema mismatch");
  assert(applied.summary.keep === 1, `maintenance apply keep mismatch: ${applied.summary.keep}`);
  assert(applied.summary.archive === 1, `maintenance apply archive mismatch: ${applied.summary.archive}`);
  assert(applied.summary.cleanup === 1, `maintenance apply cleanup mismatch: ${applied.summary.cleanup}`);
  assert(applied.summary.expiredArtifacts === 1, `maintenance apply expired artifacts mismatch: ${applied.summary.expiredArtifacts}`);
  assert(applied.archiveIndex?.entries === 1, `maintenance archive index count mismatch: ${applied.archiveIndex?.entries}`);
  assert(fs.existsSync(freshDir), "maintenance apply removed fresh artifact");
  assert(!fs.existsSync(expiredDir), "maintenance apply did not remove expired artifact");
  assert(fs.existsSync(path.join(archiveDir, "expired-artifact", "visual-regression-manifest.json")), "maintenance archive copy missing manifest");
  const archiveIndexPath = path.join(archiveDir, "ui-visual-artifact-archive-index.json");
  const archiveIndexMarkdownPath = path.join(archiveDir, "ui-visual-artifact-archive-index.md");
  assert(fs.existsSync(archiveIndexPath), "maintenance archive index JSON missing");
  assert(fs.existsSync(archiveIndexMarkdownPath), "maintenance archive index Markdown missing");
  const archiveIndex = JSON.parse(fs.readFileSync(archiveIndexPath, "utf8"));
  assert(archiveIndex.schema === "media-server.ui-visual-artifact-archive-index.v1", "maintenance archive index schema mismatch");
  assert(archiveIndex.duplicatePolicy === "append numeric suffix to preserve existing archives", "maintenance archive index duplicate policy mismatch");
  assert(Array.isArray(archiveIndex.history) && archiveIndex.history.length === 1, "maintenance archive index history mismatch");
  assert(Array.isArray(archiveIndex.entries) && archiveIndex.entries.length === 1, "maintenance archive index entries mismatch");
  assert(archiveIndex.entries[0].name === "expired-artifact", `maintenance archive index entry mismatch: ${archiveIndex.entries[0]?.name}`);
  assert(archiveIndex.entries[0].archiveSequence === 1, `maintenance archive index sequence mismatch: ${archiveIndex.entries[0]?.archiveSequence}`);
  assert(archiveIndex.entries[0].duplicateOf === "", `maintenance archive index duplicate mismatch: ${archiveIndex.entries[0]?.duplicateOf}`);
  const archiveIndexMarkdown = fs.readFileSync(archiveIndexMarkdownPath, "utf8");
  assert(archiveIndexMarkdown.includes("UI Visual Artifact Archive Index"), "maintenance archive index Markdown title missing");
  assert(archiveIndexMarkdown.includes("duplicatePolicy"), "maintenance archive index Markdown duplicate policy missing");
  assert(archiveIndexMarkdown.includes("## History"), "maintenance archive index Markdown history missing");
  assert(archiveIndexMarkdown.includes("expired-artifact"), "maintenance archive index Markdown entry missing");
  assert(fs.existsSync(reportPath), "maintenance JSON report missing");
  assert(fs.existsSync(markdownPath), "maintenance Markdown report missing");
  const appliedMarkdown = fs.readFileSync(markdownPath, "utf8");
  assert(appliedMarkdown.includes("Decision: APPLIED"), "maintenance apply Markdown decision missing");
  assert(appliedMarkdown.includes("ui-visual-artifact-archive-index.json"), "maintenance apply Markdown archive index missing");

  fs.mkdirSync(expiredDir, { recursive: true });
  fs.writeFileSync(path.join(expiredDir, "ops-home-320.png"), "expired-again\n");
  writeVisualArtifactIndex({
    outputDir: expiredDir,
    title: "Maintenance Fixture Duplicate",
    command: "./server.sh verify-ops-client-ui --screenshots",
    httpBase: "http://127.0.0.1:8081",
    visualWidths: [320],
    visualHeight: 900,
    checks: [{ name: "ops-home", path: "/ops/home", visualSelector: '[data-testid="ops-home-page"]' }],
  });
  setManifestGeneratedAt(path.join(expiredDir, "visual-regression-manifest.json"), "2026-04-02T00:00:00Z");
  const duplicateApplied = manageUiVisualArtifacts({
    artifactRoot,
    archiveDir,
    report: path.join(outputDir, "maintenance-duplicate-report.json"),
    markdownReport: path.join(outputDir, "maintenance-duplicate-report.md"),
    apply: true,
    now: "2026-05-16T00:00:00Z",
  });
  assert(duplicateApplied.archiveIndex?.entries === 2, `maintenance duplicate archive index count mismatch: ${duplicateApplied.archiveIndex?.entries}`);
  assert(fs.existsSync(path.join(archiveDir, "expired-artifact-2", "visual-regression-manifest.json")), "maintenance duplicate archive copy missing manifest");
  const duplicateIndex = JSON.parse(fs.readFileSync(archiveIndexPath, "utf8"));
  assert(Array.isArray(duplicateIndex.history) && duplicateIndex.history.length === 2, "maintenance duplicate archive history mismatch");
  const duplicateEntry = duplicateIndex.entries.find((entry) => entry.name === "expired-artifact-2");
  assert(duplicateEntry, "maintenance duplicate archive index entry missing");
  assert(duplicateEntry.archiveBaseName === "expired-artifact", `maintenance duplicate base name mismatch: ${duplicateEntry.archiveBaseName}`);
  assert(duplicateEntry.archiveSequence === 2, `maintenance duplicate sequence mismatch: ${duplicateEntry.archiveSequence}`);
  assert(duplicateEntry.duplicateOf === "expired-artifact", `maintenance duplicate marker mismatch: ${duplicateEntry.duplicateOf}`);
  const duplicateMarkdown = fs.readFileSync(archiveIndexMarkdownPath, "utf8");
  assert(duplicateMarkdown.includes("expired-artifact-2"), "maintenance duplicate archive Markdown entry missing");
  assert(duplicateMarkdown.includes("| expired-artifact-2 | expired-artifact | 2 | expired-artifact |"), "maintenance duplicate archive Markdown policy row missing");
});

let failCount = 0;
for (const item of checksRun) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== UI visual artifact index verification summary ==");
console.log(`- pass: ${checksRun.length - failCount}`);
console.log(`- fail: ${failCount}`);
console.log(`- fixture: ${outputDir}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checksRun.push({ name, run });
}

function setManifestGeneratedAt(manifestPath, generatedAt) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.generatedAt = generatedAt;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
