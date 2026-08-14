#!/usr/bin/env node
// 파일 용도: Markdown 문서의 로컬 링크와 이미지 참조가 실제 파일을 가리키는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Docs link verification

Usage:
  ./server.sh verify-docs-links

Checks:
  - repository root의 *.md와 docs/**/*.md의 로컬 Markdown 링크가 존재하는 파일을 가리킴
  - 로컬 이미지 참조가 존재하고 확장자가 이미지 형식임
  - 로컬 Markdown anchor가 실제 heading anchor와 일치함
  - docs/README.md가 tracked docs Markdown 정보 문서를 색인함
  - release/test 실행 기록, 재감사, generated inventory, Superpowers 자료 같은 개발 산출물은 색인 강제 대상에서 제외
  - 외부 URL, mailto 링크는 파일 존재 검사에서 제외
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const markdownFiles = collectMarkdownFiles();
const failures = [];
let linkCount = 0;
let imageCount = 0;
let anchorCount = 0;
let docsIndexCount = 0;
let docsIndexExcludedCount = 0;
const anchorCache = new Map();

for (const file of markdownFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const ref of findMarkdownReferences(text)) {
    if (shouldIgnoreTarget(ref.target)) continue;
    const resolved = resolveLocalTarget(file, ref.target);
    if (!resolved) {
      failures.push(`${toRelative(file)}: 링크 해석 실패: ${ref.target}`);
      continue;
    }
    if (ref.image) imageCount += 1;
    else linkCount += 1;
    if (!fs.existsSync(resolved.filePath)) {
      failures.push(`${toRelative(file)}: 존재하지 않는 ${ref.image ? "이미지" : "링크"}: ${ref.target}`);
      continue;
    }
    if (ref.image && !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(resolved.filePath)) {
      failures.push(`${toRelative(file)}: 이미지 확장자가 아님: ${ref.target}`);
    }
    if (!ref.image && resolved.anchor && isMarkdownFile(resolved.filePath)) {
      linkCount += 0;
      anchorCount += 1;
      const anchors = markdownAnchors(resolved.filePath);
      if (!anchors.has(resolved.anchor)) {
        failures.push(`${toRelative(file)}: 존재하지 않는 anchor: ${ref.target}`);
      }
    }
  }
  for (const ref of findHtmlImageReferences(text)) {
    if (shouldIgnoreTarget(ref.target)) continue;
    const resolved = resolveLocalTarget(file, ref.target);
    imageCount += 1;
    if (!resolved || !fs.existsSync(resolved.filePath)) {
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
  const result = [];
  const rootMarkdown = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(rootDir, entry.name));
  const candidates = [...rootMarkdown, path.join(rootDir, "docs")];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) result.push(...walkMarkdown(candidate));
    else result.push(candidate);
  }
  return result.sort((a, b) => toRelative(a).localeCompare(toRelative(b)));
}

function checkDocsIndexCoverage() {
  const docsIndexPath = path.join(rootDir, "docs", "README.md");
  if (!fs.existsSync(docsIndexPath)) return ["docs/README.md: 문서 색인 파일이 없음"];
  const docsIndex = fs.readFileSync(docsIndexPath, "utf8");
  const trackedDocs = gitLsFiles(["docs"])
    .filter((file) => file.endsWith(".md"))
    .filter((file) => fs.existsSync(path.join(rootDir, file)))
    .filter((file) => file !== "docs/README.md");
  const indexRequiredDocs = trackedDocs.filter((file) => !isDocsIndexCoverageExcluded(file));
  docsIndexExcludedCount = trackedDocs.length - indexRequiredDocs.length;
  docsIndexCount = indexRequiredDocs.length;
  const missing = [];
  for (const file of indexRequiredDocs) {
    const rel = file.slice("docs/".length);
    const linkPattern = new RegExp(`\\]\\(${escapeRegex(rel)}(?:#[^)]+)?\\)`);
    if (!linkPattern.test(docsIndex)) missing.push(file);
  }
  return missing.map((file) => `docs/README.md: 전체 문서 색인 누락: ${file}`);
}

function isDocsIndexCoverageExcluded(file) {
  const normalized = file.replaceAll(path.sep, "/");
  return (
    normalized.startsWith("docs/superpowers/") ||
    normalized.startsWith("docs/release-artifacts/") ||
    normalized.startsWith("docs/v220-") ||
    normalized.startsWith("docs/v230-") ||
    normalized === "docs/release-evidence-index.md" ||
    normalized === "docs/release-test-records.md" ||
    normalized === "docs/project-feature-test-inventory.md" ||
    normalized === "docs/v390-current-state-and-verification-debt-audit-2026-08-12.md" ||
    normalized === "docs/v390-feature-completion-inventory.md" ||
    normalized === "docs/v390-full-status-failure-and-handoff-2026-08-12.md" ||
    normalized === "docs/v390-ui-automation-coverage-matrix.md" ||
    normalized === "docs/runtime-dashboard-longrun-evidence-template.md" ||
    normalized === "docs/ui-visual-release-baseline-approval-template.md" ||
    normalized === "docs/manual-ui-checklist.md" ||
    normalized === "docs/manual-ui-fulltest.md" ||
    normalized === "docs/manual-ui-result-template.md" ||
    normalized === "docs/vlm-close-out-readiness.md" ||
    normalized === "docs/vlm-stabilization-longrun-ui-criteria.md" ||
    normalized === "docs/vlm-test-rehearsal.md" ||
    /^docs\/manual-ui-result-\d{4}-\d{2}-\d{2}-.+\.md$/.test(normalized) ||
    /^docs\/release-verification-reaudit(?:[-\w]*)?\.md$/.test(normalized)
  );
}

function gitLsFiles(args) {
  const result = spawnSync("git", ["ls-files", ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ls-files failed: ${message}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function findMarkdownReferences(text) {
  const refs = [];
  const regex = /(!?)\[[^\]\n]*\]\(([^)\n]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const target = normalizeMarkdownTarget(match[2]);
    if (target) refs.push({ image: match[1] === "!", target });
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
  return { filePath, anchor: normalizeAnchor(anchor) };
}

function isMarkdownFile(filePath) {
  return /\.md$/i.test(filePath);
}

function markdownAnchors(filePath) {
  if (anchorCache.has(filePath)) return anchorCache.get(filePath);
  const anchors = new Set();
  const counts = new Map();
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRelative(file) {
  return path.relative(rootDir, file).replaceAll(path.sep, "/");
}
