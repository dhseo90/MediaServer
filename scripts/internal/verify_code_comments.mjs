#!/usr/bin/env node
// 파일 용도: 코드/스크립트 파일의 상단 용도 주석과 한글 주석 정책을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Code comment policy verification

Usage:
  ./server.sh verify-code-comments

Checks:
  - 코드/스크립트 파일 상단 8줄 안에 파일 용도 또는 동작 요약 주석이 있음
  - 설명 주석은 한글을 포함함
  - build, .git, 테스트 산출물, __pycache__는 검사 대상에서 제외
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const files = collectCodeFiles(rootDir);
const missingHeaders = [];
const englishOnlyComments = [];

for (const file of files) {
  const relative = toRelative(file);
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  const header = lines.slice(0, 8).join("\n");
  if (!/(파일\s*용도|파일\s*요약|동작\s*요약)/.test(header)) {
    missingHeaders.push(relative);
  }
  englishOnlyComments.push(...findEnglishOnlyComments(relative, lines));
}

if (missingHeaders.length > 0) {
  console.log("[fail] 상단 용도 주석 누락");
  for (const item of missingHeaders) console.log(`  - ${item}`);
}
if (englishOnlyComments.length > 0) {
  console.log("[fail] 한글 설명이 없는 주석");
  for (const item of englishOnlyComments) console.log(`  - ${item}`);
}

console.log("");
console.log("== Code comment policy summary ==");
console.log(`- files: ${files.length}`);
console.log(`- missing headers: ${missingHeaders.length}`);
console.log(`- english-only comments: ${englishOnlyComments.length}`);

if (missingHeaders.length > 0 || englishOnlyComments.length > 0) {
  process.exit(1);
}

function collectCodeFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldSkipName(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const relative = path.relative(rootDir, full);
    if (shouldSkipPath(relative)) continue;
    if (entry.isDirectory()) {
      result.push(...collectCodeFiles(full));
    } else if (isCodeFile(relative)) {
      result.push(full);
    }
  }
  return result.sort((a, b) => toRelative(a).localeCompare(toRelative(b)));
}

function shouldSkipName(name) {
  return name === ".git" || name === "__pycache__";
}

function shouldSkipPath(relative) {
  return (
    relative.startsWith("build") ||
    relative.startsWith(".media_server.test") ||
    relative.startsWith("third_party") ||
    relative.startsWith("models") ||
    relative.startsWith("video")
  );
}

function isCodeFile(relative) {
  return (
    relative === "server.sh" ||
    relative === "CMakeLists.txt" ||
    /\.(c|cc|cpp|h|hpp|js|mjs|py|sh)$/.test(relative)
  );
}

function findEnglishOnlyComments(relative, lines) {
  const hits = [];
  let inBlockComment = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const comment = commentText(relative, trimmed, inBlockComment);
    if (supportsBlockComments(relative) && trimmed.startsWith("/*") && !trimmed.includes("*/")) {
      inBlockComment = true;
    }
    if (inBlockComment && trimmed.includes("*/")) {
      inBlockComment = false;
    }
    if (!comment) continue;
    if (/[가-힣]/.test(comment)) continue;
    if (/[A-Za-z]{3,}/.test(comment)) {
      hits.push(`${relative}:${index + 1}:${line}`);
    }
  }
  return hits;
}

function commentText(relative, trimmed, inBlockComment) {
  if (trimmed.startsWith("#!")) return "";
  if (/^#\s*(include|pragma|if|ifdef|ifndef|endif|else|elif|define|undef|error|shellcheck)\b/.test(trimmed)) return "";
  if (trimmed.startsWith("//")) return trimmed.slice(2).trim();
  if (trimmed.startsWith("#") && isHashCommentFile(relative)) return trimmed.slice(1).trim();
  if (supportsBlockComments(relative) && trimmed.startsWith("/*")) return trimmed.replace(/^\/\*/, "").replace(/\*\/$/, "").trim();
  if (supportsBlockComments(relative) && inBlockComment) return trimmed.replace(/^\*/, "").replace(/\*\/$/, "").trim();
  return "";
}

function isHashCommentFile(relative) {
  return relative === "CMakeLists.txt" || /\.(sh|py)$/.test(relative);
}

function supportsBlockComments(relative) {
  return /\.(c|cc|cpp|h|hpp|js|mjs)$/.test(relative);
}

function toRelative(file) {
  return path.relative(rootDir, file).replaceAll(path.sep, "/");
}
