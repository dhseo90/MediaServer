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
  - versioning/release/backlog 문서가 같은 current release baseline과 next patch roadmap을 말하는지 확인
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
  nextPatchTag: "",
  checks: [],
};

const version = readText("VERSION").trim();
assert(/^\d+\.\d+\.\d+$/.test(version), `VERSION must be semver, got ${version}`);
const currentTag = `v${version}`;
const nextPatchTag = nextPatch(version);
report.currentVersion = version;
report.currentTag = currentTag;
report.nextPatchTag = nextPatchTag;

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

check("versioning policy pins current release and patch semantics", () => {
  const doc = readText("docs/versioning-policy.md");
  for (const snippet of [
    `현재 기준 버전: \`${currentTag}\``,
    `\`VERSION\` 파일과 \`CMakeLists.txt\`의 \`project(... VERSION ...)\` 값은 같은 값을 유지합니다.`,
    `현재 source-only release tag 기준은 \`${currentTag}\`입니다.`,
    "`PATCH`: 문서, 테스트, bug fix, UI 문구, guardrail 보강처럼 공개 API/설정 호환성을 깨지 않는 변경",
  ]) {
    assert(doc.includes(snippet), `docs/versioning-policy.md missing snippet: ${snippet}`);
  }
  assertNoOtherCurrentTag(doc, "docs/versioning-policy.md", currentTag);
  return { file: "docs/versioning-policy.md" };
});

check("release policy pins source-only tag candidate and release note template", () => {
  const doc = readText("docs/release-policy.md");
  for (const snippet of [
    `현재 source-only tag 후보는 \`${currentTag}\`입니다.`,
    `\`${currentTag}\`은 live-only source release 기준을 유지한 minor release이며`,
    `# Media Server ${currentTag}`,
    "source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.",
  ]) {
    assert(doc.includes(snippet), `docs/release-policy.md missing snippet: ${snippet}`);
  }
  assertNoOtherCurrentTag(doc, "docs/release-policy.md", currentTag);
  return { file: "docs/release-policy.md" };
});

check("development backlog separates current baseline from next patch roadmap", () => {
  const doc = readText("docs/development-backlog.md");
  for (const snippet of [
    `## 현재 기준: ${currentTag} Source Release Baseline`,
    `${currentTag}은 v1.1.0 live-only source release 경계를 유지하면서`,
    `## ${nextPatchTag} Patch Roadmap 후보`,
    `${nextPatchTag}은 ${currentTag} release 이후 안정화 patch 후보입니다.`,
    "schema, Event POST payload, WebRTC DataChannel, SSE/WS metadata,",
    "RTSP/WebRTC media path, auth/session contract 변경은 별도 review 없이는 포함하지",
  ]) {
    assert(doc.includes(snippet), `docs/development-backlog.md missing snippet: ${snippet}`);
  }
  return { file: "docs/development-backlog.md", currentTag, nextPatchTag };
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
    assert(text.includes(`${currentTag} close-out`) || text.includes(`${currentTag} 종료 판정`) || text.includes(`${currentTag} patch candidates`) || text.includes(`${nextPatchTag} patch candidates`) || text.includes(`${nextPatchTag} patch 후보`), `${label} missing current/patch roadmap wording`);
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
console.log(`- next patch roadmap: ${nextPatchTag}`);
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
    ...text.matchAll(/현재 (?:기준 버전|source-only release tag 기준|source-only tag 후보)[^\n`]*`(v\d+\.\d+\.\d+)`/g),
  ].map(match => match[1]);
  const unexpected = currentTagMatches.filter(tag => tag !== expectedTag);
  assert(unexpected.length === 0, `${label} has current tag other than ${expectedTag}: ${unexpected.join(", ")}`);
}

function nextPatch(value) {
  const [major, minor, patch] = value.split(".").map(Number);
  return `v${major}.${minor}.${patch + 1}`;
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
    `- nextPatchTag: ${payload.nextPatchTag}`,
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

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
