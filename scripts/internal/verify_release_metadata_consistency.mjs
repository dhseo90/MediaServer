#!/usr/bin/env node
// 파일 용도: release/version metadata가 VERSION, CMake, README, release 문서에서 같은 기준을 말하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release metadata consistency verification

Usage:
  ./server.sh verify-release-metadata [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - VERSION과 CMake project VERSION 값이 같은 semantic version인지 확인
  - README/English README의 latest source-only release link가 현재 tag를 가리키는지 확인
  - versioning/release/backlog 문서가 같은 current release baseline과 deferred phase gate를 말하는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.release-metadata-consistency.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  currentVersion: "",
  currentTag: "",
  checks: [],
};

const version = readText("VERSION").trim();
assert(/^\d+\.\d+\.\d+$/.test(version), `VERSION must be semver, got ${version}`);
const currentTag = `v${version}`;
const previousMinorTag = previousMinorReleaseTag(version);
report.currentVersion = version;
report.currentTag = currentTag;

check("VERSION matches CMake project VERSION", () => {
  const cmake = readText("CMakeLists.txt");
  const match = /project\s*\(\s*media_server\s+VERSION\s+([0-9]+\.[0-9]+\.[0-9]+)\s+LANGUAGES\s+CXX\s*\)/.exec(cmake);
  assert(match, "CMakeLists.txt missing project(media_server VERSION ... LANGUAGES CXX)");
  assert(match[1] === version, `CMake project version ${match[1]} does not match VERSION ${version}`);
  return { version };
});

check("README release badges and latest release links point at current tag", () => {
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  assert(readme.includes(`최신 source-only release: [${currentTag}]`), "README.md latest source-only release text drifted");
  assert(readme.includes(`/releases/tag/${currentTag}`), "README.md latest release link drifted");
  assert(readmeEn.includes(`Latest source-only release: [${currentTag}]`), "README.en.md latest source-only release text drifted");
  assert(readmeEn.includes(`/releases/tag/${currentTag}`), "README.en.md latest release link drifted");
  assertSingleReleaseLink(readme, "README.md");
  assertSingleReleaseLink(readmeEn, "README.en.md");
  return { files: ["README.md", "README.en.md"], currentTag };
});

check("versioning policy pins current release and semver semantics", () => {
  const doc = readText("docs/versioning-policy.md");
  for (const snippet of [
    `현재 기준 버전: \`${currentTag}\``,
    `\`VERSION\` 파일과 \`CMakeLists.txt\`의 \`project(... VERSION ...)\` 값은 같은 값을 유지합니다.`,
    `현재 published source-only release tag 기준은 \`${currentTag}\`입니다.`,
    "source-only/live-only",
    "`PATCH`: 문서, 테스트, bug fix, UI 문구, guardrail 보강처럼 공개 API/설정 호환성을 깨지 않는 변경",
  ]) {
    assert(doc.includes(snippet), `docs/versioning-policy.md missing snippet: ${snippet}`);
  }
  assertNoOtherCurrentTag(doc, "docs/versioning-policy.md", currentTag);
  return { file: "docs/versioning-policy.md" };
});

check("release policy pins published source-only tag and release note template", () => {
  const doc = readText("docs/release-policy.md");
  for (const snippet of [
    `현재 published source-only release tag는 \`${currentTag}\`입니다.`,
    `\`${currentTag}\`은 live-only source release 기준을 유지`,
    `# Media Server ${currentTag}`,
    "source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.",
  ]) {
    assert(doc.includes(snippet), `docs/release-policy.md missing snippet: ${snippet}`);
  }
  assertNoOtherCurrentTag(doc, "docs/release-policy.md", currentTag);
  return { file: "docs/release-policy.md" };
});

check("development backlog separates current baseline from deferred phase gates", () => {
  const doc = readText("docs/development-backlog.md");
  for (const snippet of [
    `## 현재 기준: ${currentTag} Source Release Baseline`,
    `${currentTag}은 ${previousMinorTag}까지 닫은 source-only/live-only 제품 범위를 유지하면서`,
    `## ${currentTag} UI-first Close-out`,
    `${currentTag}은 Client Live workspace와 Ops workflow 보강을 완료 기준으로 둡니다.`,
    "별도 Phase gate 또는 release/field/manual approval gate",
    "기능 개발로 확정하지 않은 항목은 별도 기능 개발",
  ]) {
    assert(doc.includes(snippet), `docs/development-backlog.md missing snippet: ${snippet}`);
  }
  return { file: "docs/development-backlog.md", currentTag };
});

check("docs index points to backlog as current release source of truth", () => {
  const readme = readText("README.md");
  const readmeEn = readText("README.en.md");
  const docsEn = readText("docs/en/README.md");
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en/README.md", docsEn],
  ]) {
    assert(text.includes("docs/development-backlog.md") || text.includes("../development-backlog.md"), `${label} missing development backlog link`);
    assert(text.includes(`${currentTag} release close-out`) || text.includes(`${currentTag} 종료 판정`) || text.includes(`${currentTag} patch close-out`), `${label} missing current release wording`);
  }
  return { files: ["README.md", "README.en.md", "docs/en/README.md"] };
});

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
    report.status = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Release metadata consistency summary ==");
console.log(`- current version: ${version}`);
console.log(`- current tag: ${currentTag}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSingleReleaseLink(text, label) {
  const links = [...text.matchAll(/releases\/tag\/(v\d+\.\d+\.\d+)/g)].map(match => match[1]);
  const unexpected = links.filter(tag => tag !== currentTag);
  assert(unexpected.length === 0, `${label} has release tag link(s) other than ${currentTag}: ${unexpected.join(", ")}`);
}

function assertNoOtherCurrentTag(text, label, expectedTag) {
  const currentTagMatches = [
    ...text.matchAll(/현재 (?:기준 버전|(?:published )?source-only release tag 기준|(?:published )?source-only release tag)[^\n`]*`(v\d+\.\d+\.\d+)`/g),
  ].map(match => match[1]);
  const unexpected = currentTagMatches.filter(tag => tag !== expectedTag);
  assert(unexpected.length === 0, `${label} has current tag other than ${expectedTag}: ${unexpected.join(", ")}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdown(payload) {
  const lines = [
    "# Release Metadata Consistency Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    `- currentVersion: ${payload.currentVersion}`,
    `- currentTag: ${payload.currentTag}`,
    "",
    "| 결과 | 검사 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.message || JSON.stringify(item.detail || {});
    lines.push(`| ${item.status.toUpperCase()} | ${cell(item.name)} | ${cell(detail)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
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

function previousMinorReleaseTag(semver) {
  const [major, minor] = semver.split(".").map(Number);
  if (minor <= 0) return `v${Math.max(0, major - 1)}.0.0`;
  return `v${major}.${minor - 1}.0`;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
