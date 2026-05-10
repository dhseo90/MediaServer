#!/usr/bin/env node
// 파일 용도: v1.1.0 live-only 제품 경계 키워드가 문서에서 비범위/보류 문맥으로 유지되는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.1.0 live-only boundary keyword verification

Usage:
  ./server.sh verify-v1.1-boundary-keywords

Checks:
  - README.md, README.en.md, docs/**/*.md의 v1.1.0 non-goal 키워드 사용 문맥을 점검
  - VMS/NVR/장기 녹화/playback/Profile G/recorded evidence API 등이 제품 범위처럼 쓰이면 실패
  - 비범위, 제외, 보류, short event evidence, debug/developer 문맥의 hit는 허용 후보로 분류
  - README 첫 소개, release note, backlog 현재 상태, UI visible text 설명은 재검토 후보로 표시
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const keywordPatterns = [
  ["VMS", /\bVMS\b/i],
  ["NVR", /\bNVR\b/i],
  ["long-term recording", /\blong-term recording\b/i],
  ["장기 녹화", /장기\s*녹화/i],
  ["MP4 recorder", /\bMP4\s+recorder\b/i],
  ["video archive", /\bvideo archive\b/i],
  ["playback/search", /\bplayback\/search\b/i],
  ["playback timeline", /\bplayback timeline\b/i],
  ["playback", /\bplayback\b/i],
  ["영상 검색", /영상\s*검색/i],
  ["Profile G", /\bProfile\s+G\b/i],
  ["recorded evidence API", /\brecorded evidence API\b/i],
  ["ONVIF conformant server", /\bONVIF conformant server\b/i],
  ["full ONVIF VMS", /\bfull ONVIF VMS\b/i],
  ["source URL", /\bsource URLs?\b/i],
  ["ONVIF endpoint", /\bONVIF endpoint\b/i],
  ["raw diagnostic JSON", /\braw diagnostic JSON\b/i],
  ["raw JSON", /\braw JSON\b/i],
  ["internal diagnostic JSON", /\binternal diagnostic JSON\b/i],
  ["내부 진단 JSON", /내부\s+진단\s+JSON/i],
  ["debug diagnostics", /\bdebug diagnostics\b/i],
];

const allowContextPatterns = [
  /\bnon-goals?\b/i,
  /\bnot included\b/i,
  /\bnot exposed\b/i,
  /\boutside v1\.1\.0 scope\b/i,
  /\boutside scope\b/i,
  /\bdoes not\b/i,
  /\bdo not\b/i,
  /\bmust not\b/i,
  /\bmust appear only\b/i,
  /\bwithout\b/i,
  /\brequires a separate\b/i,
  /\bshort event evidence\b/i,
  /\bevent-oriented\b/i,
  /\bdebug\/developer\b/i,
  /\bdefault-off\b/i,
  /비범위/,
  /비권장/,
  /제외/,
  /보류/,
  /포함하지\s+않는\s+범위/,
  /별도\s+제품\s+phase/,
  /범위가\s+아니/,
  /범위는\s+아니/,
  /범위가\s+아님/,
  /포함하지/,
  /노출하지/,
  /숨깁니다/,
  /금지/,
  /후속\s+범위처럼\s*읽히지/,
  /검증\s+범위가\s+아님/,
  /실패로\s+봅니다/,
];

const failContextPatterns = [
  /\bv1\.1\.0\b[^.\n]*(provides|supports|includes|offers|ships|delivers)[^.\n]*(VMS|NVR|long-term recording|playback\/search|Profile G|video archive|recorded evidence API|ONVIF conformant server|full ONVIF VMS)/i,
  /(VMS|NVR|long-term recording|장기\s*녹화|MP4\s+recorder|video archive|playback\/search|Profile\s+G|recorded evidence API)[^.\n]*(구현\s*완료|제공|지원|포함|완료\s*범위|제품\s*범위)/i,
  /(client|viewer|\/client)[^.\n]*(exposes|shows|displays|노출|표시)[^.\n]*(source URLs?|raw JSON|diagnostic JSON|debug diagnostics|ONVIF endpoint|원본\s+source URL|내부\s+진단\s+JSON)/i,
  /(source URLs?|raw JSON|diagnostic JSON|debug diagnostics|ONVIF endpoint|원본\s+source URL|내부\s+진단\s+JSON)[^.\n]*(exposed|visible|노출|표시)[^.\n]*(client|viewer|\/client)/i,
  /(ONVIF\s+Profile\s+G|Profile\s+G)[^.\n]*(recording|replay)[^.\n]*(scope|범위|구현|지원|제공)/i,
];

const allowPathPatterns = [
  /^docs\/history\//,
  /^docs\/v1\.1\.0-boundary-checks\.md$/,
  /^docs\/v1\.1\.0-glossary\.md$/,
  /^docs\/v1\.1\.0-roadmap\.md$/,
  /^docs\/en\/v1\.1\.0-roadmap\.md$/,
  /^docs\/release-policy\.md$/,
  /^docs\/en\/release-policy\.md$/,
  /^docs\/versioning-policy\.md$/,
  /^docs\/en\/versioning-policy\.md$/,
];

const reviewPathPatterns = [
  /^README\.md$/,
  /^README\.en\.md$/,
  /^docs\/en\/README\.md$/,
  /^docs\/development-backlog\.md$/,
  /^docs\/en\/development-backlog\.md$/,
  /^docs\/ui-guide\.md$/,
  /^docs\/en\/ui-guide\.md$/,
  /^docs\/assets\/ui\/en\/README\.md$/,
];

const matches = [];
const targetFiles = collectTargetFiles();
for (const file of targetFiles) {
  scanFile(file);
}

const buckets = {
  allow: matches.filter((item) => item.status === "allow"),
  review: matches.filter((item) => item.status === "review"),
  fail: matches.filter((item) => item.status === "fail"),
};

printBucket("fail", buckets.fail);
printBucket("review", buckets.review);

console.log("");
console.log("== v1.1.0 boundary keyword verification summary ==");
console.log(`- scanned files: ${targetFiles.length}`);
console.log(`- keyword hits: ${matches.length}`);
console.log(`- allow candidates: ${buckets.allow.length}`);
console.log(`- review candidates: ${buckets.review.length}`);
console.log(`- failure candidates: ${buckets.fail.length}`);

if (buckets.fail.length > 0) {
  console.log("");
  console.log("[fail] v1.1.0 live-only 제품 경계 실패 후보가 있습니다.");
  process.exit(1);
}

function collectTargetFiles() {
  const files = [];
  for (const name of ["README.md", "README.en.md"]) {
    const file = path.join(rootDir, name);
    if (fs.existsSync(file)) files.push(file);
  }
  const docsDir = path.join(rootDir, "docs");
  if (fs.existsSync(docsDir)) files.push(...walkMarkdown(docsDir));
  return files.sort((a, b) => relative(a).localeCompare(relative(b)));
}

function walkMarkdown(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__pycache__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) result.push(full);
  }
  return result;
}

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\n/);
  lines.forEach((line, index) => {
    const labels = keywordPatterns
      .filter(([, pattern]) => pattern.test(line))
      .map(([label]) => label);
    if (labels.length === 0) return;
    const context = contextAround(lines, index);
    matches.push(classifyMatch(file, index + 1, line, context, labels));
  });
}

function classifyMatch(file, lineNumber, line, contextText, labels) {
  const rel = relative(file);
  const context = normalize(`${contextText}\n${line}`);
  const status = classifyStatus(rel, context);
  return {
    file: rel,
    lineNumber,
    line: line.trim(),
    labels,
    status,
  };
}

function classifyStatus(rel, context) {
  const allowedPath = allowPathPatterns.some((pattern) => pattern.test(rel));
  const hasAllowContext = allowContextPatterns.some((pattern) => pattern.test(context));
  const hasFailContext = failContextPatterns.some((pattern) => pattern.test(context));
  if (allowedPath || hasAllowContext) return "allow";
  if (hasFailContext) return "fail";
  if (reviewPathPatterns.some((pattern) => pattern.test(rel))) return "review";
  return "review";
}

function contextAround(lines, lineIndex) {
  let start = lineIndex;
  while (start > 0 && lines[start - 1].trim() !== "") start -= 1;
  let end = lineIndex;
  while (end < lines.length - 1 && lines[end + 1].trim() !== "") end += 1;
  const prefixStart = Math.max(0, start - 4);
  return lines.slice(prefixStart, end + 1).join("\n");
}

function printBucket(name, items) {
  if (items.length === 0) return;
  console.log("");
  console.log(`== ${name} candidates ==`);
  for (const item of items) {
    console.log(`- ${item.file}:${item.lineNumber} [${item.labels.join(", ")}] ${item.line}`);
  }
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function relative(file) {
  return path.relative(rootDir, file).replaceAll(path.sep, "/");
}
