#!/usr/bin/env node
// 파일 용도: UI visual regression screenshot artifact index/manifest 생성을 정적 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { compareVisualBaseline } from "./compare_ui_visual_baseline.mjs";
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
  fs.readFileSync(path.join(rootDir, ".github/PULL_REQUEST_TEMPLATE.md"), "utf8"),
  fs.readFileSync(path.join(rootDir, ".github/ISSUE_TEMPLATE/ui_visual_qa.yml"), "utf8"),
].join("\n");
const authSmoke = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_auth_ui_smoke.mjs"), "utf8");
const serverSh = fs.readFileSync(path.join(rootDir, "server.sh"), "utf8");
const compareScript = fs.readFileSync(path.join(rootDir, "scripts/internal/compare_ui_visual_baseline.mjs"), "utf8");

const checksRun = [];
check("manifest schema and screenshot rows", () => {
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
    "320px, 390px, 760px, and 1180px",
    "source URL, Developer URL, raw JSON",
    "14 days",
    "45 days",
  ]) {
    assert(template.includes(snippet), `PR template missing visual review checklist snippet: ${snippet}`);
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

check("visual baseline diff tooling is wired and documented", () => {
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
  ]) {
    assert(compareScript.includes(snippet), `compare script missing visual baseline diff snippet: ${snippet}`);
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
  assert(fs.existsSync(path.join(diffDir, "visual-baseline-diff.json")), "baseline diff JSON report missing");
  assert(fs.existsSync(path.join(diffDir, "visual-baseline-diff.md")), "baseline diff Markdown report missing");
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
