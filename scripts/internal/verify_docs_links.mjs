#!/usr/bin/env node
// 파일 용도: Markdown 문서의 로컬 링크와 이미지 참조가 실제 파일을 가리키는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Docs link verification

Usage:
  ./server.sh verify-docs-links [--root <source-directory>]

Checks:
  - 추적/미추적 프로젝트 Markdown의 로컬 링크를 검사 (Git 없는 source archive도 지원)
  - 로컬 이미지 참조가 존재하고 확장자가 이미지 형식임
  - 로컬 Markdown anchor가 실제 heading anchor와 일치함
  - README/AGENTS/CONTRIBUTING/SECURITY와 목적별 색인을 거쳐 현행 문서에 도달 가능
  - 실행 산출물과 내부 계획은 공개 색인 강제 대상이 아니지만 링크 검사는 유지
  - 외부 URL, mailto 링크는 파일 존재 검사에서 제외
`);
}
assertKnownOptions(rawArgs, ["h", "help", "root"]);
const rootDir = parseRoot(rawArgs);

const markdownFiles = collectMarkdownFiles();
const failures = [];
let linkCount = 0;
let imageCount = 0;
let anchorCount = 0;
let docsIndexCount = 0;
let docsIndexExcludedCount = 0;
const anchorCache = new Map();
const documentLinks = new Map();

for (const file of markdownFiles) {
  const safety = localFileError(file);
  if (safety) {
    failures.push(`${toRelative(file)}: ${safety}`);
    continue;
  }
  const text = withoutCodeBlocks(fs.readFileSync(file, "utf8"));
  documentLinks.set(file, []);
  for (const ref of findMarkdownReferences(text)) {
    if (shouldIgnoreTarget(ref.target)) continue;
    const resolved = resolveLocalTarget(file, ref.target);
    if (!resolved) {
      failures.push(`${toRelative(file)}: 링크 해석 실패: ${ref.target}`);
      continue;
    }
    if (ref.image) imageCount += 1;
    else linkCount += 1;
    const targetSafety = localFileError(resolved.filePath);
    if (targetSafety) {
      failures.push(`${toRelative(file)}: ${targetSafety}: ${ref.target}`);
      continue;
    }
    if (!fs.existsSync(resolved.filePath)) {
      failures.push(`${toRelative(file)}: 존재하지 않는 ${ref.image ? "이미지" : "링크"}: ${ref.target}`);
      continue;
    }
    if (ref.image && !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(resolved.filePath)) {
      failures.push(`${toRelative(file)}: 이미지 확장자가 아님: ${ref.target}`);
    }
    if (!ref.image && resolved.anchor && isMarkdownFile(resolved.filePath)) {
      anchorCount += 1;
      const anchors = markdownAnchors(resolved.filePath);
      if (!anchors.has(resolved.anchor)) {
        failures.push(`${toRelative(file)}: 존재하지 않는 anchor: ${ref.target}`);
      }
    }
    if (!ref.image && isMarkdownFile(resolved.filePath)) documentLinks.get(file).push(resolved.filePath);
  }
  for (const ref of findHtmlImageReferences(text)) {
    if (shouldIgnoreTarget(ref.target)) continue;
    const resolved = resolveLocalTarget(file, ref.target);
    imageCount += 1;
    const targetSafety = resolved && localFileError(resolved.filePath);
    if (targetSafety) failures.push(`${toRelative(file)}: ${targetSafety}: ${ref.target}`);
    else if (!resolved || !fs.existsSync(resolved.filePath)) {
      failures.push(`${toRelative(file)}: 존재하지 않는 HTML 이미지: ${ref.target}`);
    }
  }
}

for (const failure of checkDocsIndexCoverage()) {
  failures.push(failure);
}

if (failures.length > 0) {
  console.log("[fail] 문서 로컬 링크/이미지 참조 오류");
  for (const failure of failures) console.log(`  - ${failure}`);
}

console.log("");
console.log("== Docs link verification summary ==");
console.log(`- markdown files: ${markdownFiles.length}`);
console.log(`- local links: ${linkCount}`);
console.log(`- local images: ${imageCount}`);
console.log(`- local anchors: ${anchorCount}`);
console.log(`- indexed docs: ${docsIndexCount}`);
console.log(`- index coverage exclusions: ${docsIndexExcludedCount}`);
console.log(`- failures: ${failures.length}`);

if (failures.length > 0) process.exit(1);

function collectMarkdownFiles() {
  if (fs.existsSync(path.join(rootDir, ".git"))) {
    const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: rootDir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error("문서 목록을 위한 git ls-files 실패");
    return [...new Set(result.stdout.split("\0").filter(isMarkdownFile))]
      .map((file) => path.join(rootDir, file))
      .filter((file) => fs.lstatSync(file, {throwIfNoEntry: false}))
      .sort();
  }
  return walkMarkdown(rootDir).sort();
}

function checkDocsIndexCoverage() {
  const docsIndexPath = path.join(rootDir, "docs", "README.md");
  if (!fs.existsSync(docsIndexPath)) return ["docs/README.md: 문서 색인 파일이 없음"];
  const docs = markdownFiles.filter((file) => toRelative(file).startsWith("docs/") && file !== docsIndexPath);
  const indexRequiredDocs = docs.filter((file) => !isInternalDocument(toRelative(file)));
  docsIndexExcludedCount = docs.length - indexRequiredDocs.length;
  docsIndexCount = indexRequiredDocs.length;
  const pending = ["README.md", "README.en.md", "AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", "docs/README.md", "docs/en/README.md"]
    .map((file) => path.join(rootDir, file));
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    // 실행 기록·내부 계획의 거대한 링크 목록을 현행 문서 탐색 경로로 인정하지 않는다.
    if (isInternalDocument(toRelative(file))) continue;
    pending.push(...(documentLinks.get(file) || []));
  }
  return indexRequiredDocs.filter((file) => !visited.has(file))
    .map((file) => `목적별 색인에서 도달할 수 없는 문서: ${toRelative(file)}`);
}

function isInternalDocument(file) {
  // 종료 기록의 실제 삭제/보존 판정은 별도 작업이다. 여기서는 공개 색인 역할만 구분한다.
  // 임시 리뷰 보고서는 v4.1.1 정리 완료 때 삭제하고 이 한정 예외도 제거한다.
  return (
    file.startsWith("docs/superpowers/") ||
    file.startsWith("docs/release-artifacts/") ||
    file === "docs/release-test-records.md" ||
    file === "docs/release-evidence-index.md" ||
    file === "docs/release-evidence-v410.md" ||
    file === "docs/v390-feature-completion-inventory.md" ||
    file === "docs/vlm-close-out-readiness.md" ||
    file === "docs/documentation-review-2026-09-28.md" ||
    file === "docs/v390-current-state-and-verification-debt-audit-2026-08-12.md" ||
    file === "docs/v390-full-status-failure-and-handoff-2026-08-12.md" ||
    file === "docs/manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md" ||
    // 본문에서 과거 단계 산출물/설계로 확인한 정확한 목록이다. v220/v230 접두사 전체를 제외하지 않는다.
    // 현행 계약 추출·소비자 전환 뒤 정리할 때 해당 항목도 제거한다. 링크 검사·원본 보존은 계속 필요하다.
    ["v220-auth-setup-redesign", "v220-client-live-redesign", "v220-client-preview-redaction-review",
      "v220-component-primitives", "v220-design-token-refresh", "v220-ops-channels-workspace",
      "v220-ops-users-access-workspace", "v220-ops-vlm-containment", "v220-ops-workspace-redesign",
      "v220-responsive-task-shell", "v220-rules-workspace-redesign", "v220-ui-architecture-inventory",
      "v220-ui-evidence-closeout", "v230-ui-renderer-module-decomposition"]
      .some((name) => file === `docs/${name}.md`)
  );
}

function walkMarkdown(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "__pycache__", "build"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) result.push(full);
  }
  return result;
}

function findMarkdownReferences(text) {
  const refs = [];
  const definitions = new Map();
  for (const match of text.matchAll(/^ {0,3}\[([^\]\n]+)\]:\s*(<[^>]+>|\S+)/gm)) {
    definitions.set(match[1].trim().toLowerCase(), normalizeMarkdownTarget(match[2]));
  }
  const regex = /(!?)\[[^\]\n]*\]\(([^)\n]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const target = normalizeMarkdownTarget(match[2]);
    if (target) refs.push({ image: match[1] === "!", target });
  }
  for (const match of text.matchAll(/(!?)\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const target = definitions.get((match[3] || match[2]).trim().toLowerCase());
    if (target) refs.push({image: match[1] === "!", target});
  }
  return refs;
}

function findHtmlImageReferences(text) {
  const refs = [];
  const regex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    refs.push({ target: match[1].trim() });
  }
  return refs;
}

function normalizeMarkdownTarget(rawTarget) {
  let target = rawTarget.trim();
  if (!target) return "";
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1).trim();
  }
  const spaceIndex = target.search(/\s+["'][^"']*["']$/);
  if (spaceIndex >= 0) target = target.slice(0, spaceIndex).trim();
  return target;
}

function shouldIgnoreTarget(target) {
  return (
    !target ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  );
}

function resolveLocalTarget(fromFile, target) {
  const withoutQuery = target.split("?", 1)[0];
  const hashIndex = withoutQuery.indexOf("#");
  const pathPart = hashIndex >= 0 ? withoutQuery.slice(0, hashIndex) : withoutQuery;
  const anchorPart = hashIndex >= 0 ? withoutQuery.slice(hashIndex + 1) : "";
  let decoded = pathPart;
  let anchor = anchorPart;
  try {
    decoded = decodeURIComponent(pathPart);
    anchor = decodeURIComponent(anchorPart);
  } catch {
    return null;
  }
  const filePath = !decoded
    ? fromFile
    : decoded.startsWith("/")
    ? path.join(rootDir, decoded.replace(/^\/+/, ""))
    : path.resolve(path.dirname(fromFile), decoded);
  return { filePath, anchor };
}

function isMarkdownFile(filePath) {
  return /\.md$/i.test(filePath);
}

function markdownAnchors(filePath) {
  if (anchorCache.has(filePath)) return anchorCache.get(filePath);
  const anchors = new Set();
  const counts = new Map();
  const text = fs.existsSync(filePath) ? withoutCodeBlocks(fs.readFileSync(filePath, "utf8")) : "";
  for (const match of text.matchAll(/<(?:a|h[1-6])\b[^>]*\b(?:id|name)=["']([^"']+)["'][^>]*>/gi)) anchors.add(match[1]);
  for (const line of text.split(/\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const raw = stripInlineMarkdown(match[2]);
    const base = normalizeAnchor(raw);
    if (!base) continue;
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  anchorCache.set(filePath, anchors);
  return anchors;
}

function stripInlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function normalizeAnchor(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "")
    .replace(/\s+/g, "-");
}

function toRelative(file) {
  return path.relative(rootDir, file).replaceAll(path.sep, "/");
}

function parseRoot(args) {
  let value = path.resolve(scriptDir, "../..");
  let seen = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const supplied = arg === "--root" ? args[++i] : arg.startsWith("--root=") ? arg.slice(7) : null;
    if (seen || !supplied || supplied.startsWith("--")) {
      console.error("[fail] --root는 존재하는 디렉터리 하나를 지정해야 함");
      process.exit(2);
    }
    seen = true;
    value = path.resolve(supplied);
  }
  if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) {
    console.error("[fail] --root 디렉터리 없음");
    process.exit(2);
  }
  return fs.realpathSync(value);
}

function localFileError(file) {
  const rel = path.relative(rootDir, file);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return "저장소 밖 경로";
  let current = rootDir;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current, {throwIfNoEntry: false})?.isSymbolicLink()) return "symlink 경로는 읽지 않음";
  }
  return null;
}

function withoutCodeBlocks(text) {
  let fence = null;
  return text.split("\n").map((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
      return "";
    }
    if (marker) { fence = marker; return ""; }
    return line;
  }).join("\n");
}
