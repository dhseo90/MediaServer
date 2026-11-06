#!/usr/bin/env node
// 파일 용도: 코드/스크립트 파일의 상단 용도 주석과 한글 주석 정책을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Code comment policy verification

Usage:
  ./server.sh verify-code-comments [--files <repo-relative-path>...]

Options:
  --files <path>...  변경 파일만 검사한다. 전체 Source PASS를 대신하지 않는다.

Checks:
  - 코드/스크립트 파일 상단 8줄 안에 파일 용도 또는 동작 요약 주석이 있음
  - 설명 주석은 한글을 포함함
  - 정책 예외는 config/code_comment_policy.json에서 관리
`);
}
assertKnownOptions(rawArgs, ["h", "help", "files"]);

const EXACT_APPROVAL = Object.freeze({
  "version": "media-server.exact-preserved-findings.v1",
  "contractSha256": "4a771a8e66c2a8234985c44dcdd5448173b3be82034b7237009fc948d5b7e3ea",
  "recordSha256": "84eb37232adfcd967dcacfc48ad2c83eac6aa141a1816add6345e8fb07e41b52",
  "requestSha256": "5c9fe856732c03578262e26b0252aca3e3839bfe8e8bc5ab3a36e5300ce346e4",
  "scopeSha256": "ba4d2c70157c785dd0f28d50e290adca02204a9b22cf613de7af17aed7d07cb1"
});
const exactErrors = [];
const policy = readPolicy();
const preservedErrors = [];
const preservedHeaders = validatePreservedHeaders();
const selectedFiles = selectCodeFiles(rawArgs);
const files = selectedFiles === null ? collectCodeFiles(rootDir) : selectedFiles;
let missingHeaders = [];
let englishOnlyComments = [];
const headerPattern = new RegExp(policy.headerPatterns.join("|"));

const exactPaths = new Set(Array.isArray(policy.exactPreservedFindings?.findings) ? policy.exactPreservedFindings.findings.map(item => item?.path) : []);
const exactBuffers = new Map();
const sources = [];
const pythonErrors = [];
for (const file of files) {
  const relative = toRelative(file);
  let bytes;
  if (exactPaths.has(relative)) {
    try { bytes = readRegularFile(file); exactBuffers.set(relative, bytes); }
    catch { exactErrors.push(`${relative}: regular-file-read-failed`); continue; }
  } else bytes = fs.readFileSync(file);
  const lines = bytes.toString("utf8").split(/\n/);
  const header = lines.slice(0, 8).join("\n");
  const expectedHash = preservedHeaders.get(relative);
  const preserved = expectedHash && crypto.createHash("sha256").update(bytes).digest("hex") === expectedHash;
  if (expectedHash && !preserved) preservedErrors.push(`${relative}: read-hash-mismatch`);
  if (!headerPattern.test(header) && !preserved) {
    missingHeaders.push(relative);
  }
  sources.push({ relative, lines });
}

const pythonComments = parsePythonComments(sources.filter(source => path.extname(source.relative) === ".py"));
for (const { relative, lines } of sources) {
  if (path.extname(relative) !== ".py") {
    englishOnlyComments.push(...findEnglishOnlyComments(relative, lines));
    continue;
  }
  // 토큰만 기존 영문 판정에 전달하고 finding에는 원래 행과 위치를 보존한다.
  const comments = pythonComments.get(relative);
  if (!comments) continue;
  const commentLines = Array(lines.length).fill("");
  for (const [line, , text] of comments) commentLines[line - 1] = pythonCommentProse(text);
  for (const hit of findEnglishOnlyComments(relative, commentLines)) {
    const line = Number(hit.slice(relative.length + 1).split(":", 1)[0]);
    englishOnlyComments.push(`${relative}:${line}:${lines[line - 1]}`);
  }
}

const rawFindingCount = missingHeaders.length + englishOnlyComments.length;
const exact = validateExactFindings(exactBuffers);
missingHeaders = missingHeaders.filter(file => !exact.headers.has(file));
englishOnlyComments = englishOnlyComments.filter(row => !exact.english.has(row));
for (const item of exact.applied) console.log(`[exact-finding-exception] ${JSON.stringify(item)}`);
if (exactErrors.length) {
  console.log("[fail] exact historical finding binding");
  for (const message of exactErrors) console.log(`  ! ${message}`);
}

if (preservedErrors.length > 0) {
  console.log("[fail] preserved header 예외 검증");
  for (const code of preservedErrors) console.log(`  - ${code}`);
}
if (pythonErrors.length > 0) {
  console.log("[fail] Python comment parsing");
  for (const message of pythonErrors) console.log(`  ! ${message}`);
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
console.log(`- scope: ${selectedFiles === null ? "full source" : "selected files; historical bindings included"}`);
console.log(`- files: ${files.length}`);
console.log(`- missing headers: ${missingHeaders.length}`);
console.log(`- english-only comments: ${englishOnlyComments.length}`);

console.log(`- raw findings: ${rawFindingCount}`);
console.log(`- approved exact findings: ${exact.applied.length}`);

if (pythonErrors.length > 0 || exactErrors.length > 0 || preservedErrors.length > 0 || missingHeaders.length > 0 || englishOnlyComments.length > 0) {
  process.exit(1);
}

// 명시한 오류 코드가 있는 도구 문법만 설명에서 분리한다. 뒤의 설명은 기존 규칙으로 검사한다.
// 원본 지시문·위치·도구 설정은 바꾸지 않으며 실제 linter 실행 여부를 인증하지 않는다.
function pythonCommentProse(text) {
  const directive = text.match(/^#[ \t]*[nN][oO][qQ][aA][ \t]*:[ \t]*[A-Z]+[0-9]+(?:[ \t]*(?:,[ \t]*|[ \t]+)[A-Z]+[0-9]+)*[ \t]*(?:#(.*))?$/) ||
    text.match(/^#[ \t]*type:[ \t]*ignore\[[a-z][a-z0-9_-]*(?:[ \t]*,[ \t]*[a-z][a-z0-9_-]*)*\][ \t]*(?:#(.*))?$/);
  return directive ? (directive[1] ? `# ${directive[1]}` : "") : text;
}

// Python은 실행하지 않고 구문 검사와 표준 COMMENT 토큰 추출만 수행한다.
// 문자열의 //·#는 제외하되 같은 행의 실제 주석과 f-string 표현식 주석은 검사한다.
function parsePythonComments(sources) {
  const comments = new Map();
  if (!sources.length) return comments;
  const parser = String.raw`
import ast, io, json, sys, tokenize
results = []
for item in json.load(sys.stdin):
    try:
        tree = ast.parse(item["text"], filename=item["path"])
        compile(tree, item["path"], "exec", dont_inherit=True)
        tokens = tokenize.generate_tokens(io.StringIO(item["text"]).readline)
        found = [[t.start[0], t.start[1], t.string] for t in tokens if t.type == tokenize.COMMENT]
        results.append({"path": item["path"], "comments": found, "error": None})
    except (SyntaxError, tokenize.TokenError, ValueError, RecursionError) as error:
        results.append({"path": item["path"], "comments": [], "error": type(error).__name__ + ": " + str(error)})
json.dump(results, sys.stdout, ensure_ascii=False)
`;
  const run = spawnSync("python3", ["-I", "-B", "-c", parser], {
    input: JSON.stringify(sources.map(source => ({ path: source.relative, text: source.lines.join("\n") }))),
    encoding: "utf8", timeout: 5000, maxBuffer: 16 * 1024 * 1024,
  });
  if (run.error || run.signal || run.status !== 0) {
    pythonErrors.push(`parser-unavailable-or-failed: ${run.error?.code || run.signal || run.status}`);
    return comments;
  }
  try {
    const results = JSON.parse(run.stdout);
    if (!Array.isArray(results) || results.length !== sources.length) throw Error("invalid-parser-result");
    for (const [index, item] of results.entries()) {
      const source = sources[index];
      if (item.path !== source.relative || !Array.isArray(item.comments)) throw Error("invalid-parser-source");
      if (item.error !== null) {
        if (typeof item.error !== "string") throw Error("invalid-parser-error");
        pythonErrors.push(`${item.path}: ${item.error}`);
        continue;
      }
      for (const token of item.comments) {
        if (!Array.isArray(token) || token.length !== 3) throw Error("invalid-comment-token");
        const [line, column, text] = token;
        if (!Number.isInteger(line) || line < 1 || line > source.lines.length ||
            !Number.isInteger(column) || column < 0 || typeof text !== "string" || !text.startsWith("#") ||
            [...source.lines[line - 1]].slice(column).join("").replace(/\r$/, "") !== text) throw Error("invalid-comment-location");
      }
      comments.set(item.path, item.comments);
    }
  } catch (error) {
    comments.clear();
    pythonErrors.push(`parser-result-rejected: ${error.message}`);
  }
  return comments;
}

// 승인 근거는 사용자 요청에서 고정한 외부 기록이며 정책의 자기 신고를 신뢰하지 않는다.
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function requireKeys(value, keys) {
  if (!value || Array.isArray(value) || typeof value !== "object" ||
      Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) throw Error("invalid-fields");
}

// 승인 파일과 기록은 상위 경로부터 심링크를 거부하고 동일 fd의 바이트를 읽는다.
function readRegularFile(full) {
  if (typeof full !== "string" || !path.isAbsolute(full) || path.resolve(full) !== full) throw Error("noncanonical-path");
  let current = path.parse(full).root;
  const parts = full.slice(current.length).split(path.sep);
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const info = fs.lstatSync(current);
    if (info.isSymbolicLink() || (index === parts.length - 1 ? !info.isFile() : !info.isDirectory())) throw Error("not-regular-file");
  }
  const fd = fs.openSync(full, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile()) throw Error("not-regular-file");
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (before.size !== bytes.length || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw Error("file-changed-during-read");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

// 승인 기록 안의 과거 절대 경로는 provenance다. 같은 바이트의 요청문을 기록 옆에서 검증한다.
// 저장소 상대 경로는 정규 경로만 허용하고 누락 시 과거 외부 파일로 우회하지 않는다.
function resolveApprovalFile(value) {
  if (typeof value !== "string" || !value || value.includes("\\") ||
      value.split("/").slice(path.isAbsolute(value) ? 1 : 0).some(part => !part || part === "." || part === "..")) throw Error("noncanonical-approval-path");
  return path.isAbsolute(value) ? value : path.join(rootDir, value);
}

function validateExactFindings(buffers) {
  const rejected = { headers: new Set(), english: new Set(), applied: [] };
  try {
    if (exactErrors.length) throw Error("unreadable-approved-file");
    if (policy.schema !== "media-server.code-comment-policy.v1") throw Error("unsupported-policy-version");
    const block = policy.exactPreservedFindings;
    requireKeys(block, ["version", "contractSha256", "approvalRecord", "findings"]);
    if (block.version !== EXACT_APPROVAL.version || block.contractSha256 !== EXACT_APPROVAL.contractSha256) throw Error("unsupported-exact-contract");
    requireKeys(block.approvalRecord, ["path", "sha256"]);
    if (block.approvalRecord.sha256 !== EXACT_APPROVAL.recordSha256) throw Error("approval-record-anchor-mismatch");
    if (!Array.isArray(block.findings) || block.findings.length !== 5 ||
        digest(stableJson({ version: block.version, contractSha256: block.contractSha256, findings: block.findings })) !== EXACT_APPROVAL.scopeSha256) throw Error("finding-scope-anchor-mismatch");
    const recordPath = resolveApprovalFile(block.approvalRecord.path);
    const recordBytes = readRegularFile(recordPath);
    if (digest(recordBytes) !== EXACT_APPROVAL.recordSha256) throw Error("approval-record-bytes-mismatch");
    const record = JSON.parse(recordBytes.toString("utf8"));
    if (record.status !== "POLICY_APPROVED_FOR_EXACT_5_FINDINGS" || record.contractSha256 !== EXACT_APPROVAL.contractSha256 ||
        record.policyVersion !== EXACT_APPROVAL.version || record.requestSha256 !== EXACT_APPROVAL.requestSha256 ||
        digest(readRegularFile(path.join(path.dirname(recordPath), "user-approval.txt"))) !== EXACT_APPROVAL.requestSha256) throw Error("external-user-approval-mismatch");
    const headers = new Set(), english = new Set(), seen = new Set(), targets = new Set(), applied = [];
    for (const item of block.findings) {
      requireKeys(item, ["path", "fileSha256", "fileBytes", "findingType", "originalFindingId", "originalFindingIdentitySha256", "location"]);
      if (!/^docs\/release-artifacts\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(item.path) || item.path.split("/").some(part => part === "." || part === "..")) throw Error("invalid-approved-path");
      if (seen.has(item.originalFindingId)) throw Error("duplicate-finding-id");
      seen.add(item.originalFindingId); targets.add(item.path);
      const bytes = buffers.get(item.path);
      if (!bytes || bytes.length !== item.fileBytes || digest(bytes) !== item.fileSha256) throw Error(`${item.originalFindingId}: file-binding-failed`);
      const lines = bytes.toString("utf8").split(/\n/);
      let line = null, raw = null;
      if (item.findingType === "missing-header") {
        requireKeys(item.location, ["kind", "firstLine", "lastLine", "requiredState", "originalFindingLine", "firstEightLines"]);
        if (item.location.kind !== "header-window" || item.location.firstLine !== 1 || item.location.lastLine !== 8 || item.location.originalFindingLine !== null ||
            item.location.requiredState !== "configured marker absent" || stableJson(lines.slice(0, 8)) !== stableJson(item.location.firstEightLines) ||
            !missingHeaders.includes(item.path)) throw Error("header-finding-context-mismatch");
        headers.add(item.path);
      } else if (item.findingType === "english-only-comment") {
        requireKeys(item.location, ["kind", "line", "rawLine"]);
        line = item.location.line; raw = item.location.rawLine;
        const finding = `${item.path}:${line}:${raw}`;
        if (item.location.kind !== "line" || !Number.isInteger(line) || line < 1 || lines[line - 1] !== raw || !englishOnlyComments.includes(finding)) throw Error("english-finding-context-mismatch");
        english.add(finding);
      } else throw Error("unsupported-finding-type");
      // CC01 원장의 공백을 포함한 배열 직렬화를 그대로 재현한다.
      const identity = `[${[item.path, item.findingType, line, raw].map(value => JSON.stringify(value)).join(", ")}]`;
      if (digest(identity) !== item.originalFindingIdentitySha256) throw Error("original-finding-digest-mismatch");
      applied.push({ id: item.originalFindingId, identitySha256: item.originalFindingIdentitySha256, path: item.path, type: item.findingType, line });
    }
    const actualCount = missingHeaders.filter(file => targets.has(file)).length + englishOnlyComments.filter(row => targets.has(row.slice(0, row.indexOf(":")))).length;
    if (targets.size !== 3 || headers.size !== 3 || english.size !== 2 || actualCount !== 5 || stableJson(record.findingIds) !== stableJson([...seen])) throw Error("stale-or-additional-approved-file-finding");
    return { headers, english, applied };
  } catch (error) {
    exactErrors.push(error.message);
    return rejected;
  }
}

function validatePreservedHeaders() {
  const accepted = new Map();
  const entries = policy.preservedHeaderExceptions === undefined ? [] : policy.preservedHeaderExceptions;
  if (!Array.isArray(entries)) {
    preservedErrors.push("invalid-list");
    return accepted;
  }
  const seen = new Set();
  for (const item of entries) {
    if (!item || typeof item.path !== "string" ||
        !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(item.path) ||
        item.path.split("/").some(part => part === "." || part === "..") ||
        typeof item.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(item.sha256) ||
        typeof item.reason !== "string" || !/[가-힣]/.test(item.reason)) {
      preservedErrors.push("invalid-entry");
      continue;
    }
    if (seen.has(item.path)) {
      preservedErrors.push(`${item.path}: duplicate-path`);
      continue;
    }
    seen.add(item.path);
    if (!item.path.startsWith("docs/release-artifacts/")) {
      preservedErrors.push(`${item.path}: not-preserved-artifact`);
      continue;
    }
    try {
      let current = rootDir;
      const parts = item.path.split("/");
      for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink() ||
            (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) {
          throw Error("invalid-file");
        }
      }
      if (!isCodeFile(item.path) || shouldSkipPath(item.path) ||
          crypto.createHash("sha256").update(fs.readFileSync(current)).digest("hex") !== item.sha256) {
        throw Error("invalid-file");
      }
      accepted.set(item.path, item.sha256);
    } catch {
      preservedErrors.push(`${item.path}: file-binding-failed`);
    }
  }
  return accepted;
}

// 선택 검사는 기존 규칙을 재사용하며 역사 예외의 결속 검증을 생략하지 않는다.
function selectCodeFiles(args) {
  if (args.length === 0) return null;
  const fail = message => { console.error(`[fail] selected files: ${message}`); process.exit(2); };
  if (args[0] !== "--files" || args.length < 2) fail("expected --files followed by repository-relative paths");
  const selected = new Set();
  for (const relative of args.slice(1)) {
    if (relative.startsWith("-") || path.isAbsolute(relative) || relative.includes("\\") ||
        relative.split("/").some(part => part === "" || part === "." || part === "..")) fail("noncanonical path");
    if (!isCodeFile(relative) || shouldSkipPath(relative)) fail("path is outside the existing code-comment scope");
    const full = path.join(rootDir, relative);
    try { readRegularFile(full); } catch { fail("path must name an existing regular file without symlinks"); }
    selected.add(full);
  }
  // 오류가 있는 정책도 기존 validator가 보고하도록 파일 집합만 안전하게 보충한다.
  for (const item of Array.isArray(policy.exactPreservedFindings?.findings) ? policy.exactPreservedFindings.findings : []) {
    if (typeof item?.path === "string" && /^docs\/release-artifacts\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(item.path) &&
        !item.path.split("/").some(part => part === "." || part === "..")) selected.add(path.join(rootDir, item.path));
  }
  return [...selected].sort((a, b) => toRelative(a).localeCompare(toRelative(b)));
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
  return policy.excludePathPrefixes.some((prefix) => relative === prefix || relative.startsWith(prefix));
}

function isCodeFile(relative) {
  return policy.extraCodeFiles.includes(relative) || policy.codeExtensions.includes(path.extname(relative));
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
    if (isAllowedEnglishOnlyComment(relative, index + 1, comment)) continue;
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
  return policy.extraHashCommentFiles.includes(relative) || policy.hashCommentExtensions.includes(path.extname(relative));
}

function supportsBlockComments(relative) {
  return policy.blockCommentExtensions.includes(path.extname(relative));
}

function isAllowedEnglishOnlyComment(relative, line, comment) {
  return policy.allowedEnglishOnlyComments.some((item) => {
    if (item.path && item.path !== relative) return false;
    if (Number.isInteger(item.line) && item.line !== line) return false;
    if (item.pattern) return new RegExp(item.pattern).test(comment);
    return false;
  });
}

function readPolicy() {
  const policyPath = path.join(rootDir, "config/code_comment_policy.json");
  const defaults = {
    headerPatterns: ["파일\\s*용도", "파일\\s*요약", "동작\\s*요약"],
    excludePathPrefixes: [".git", ".media_server.test", "build", "third_party", "models", "video"],
    codeExtensions: [".c", ".cc", ".cpp", ".h", ".hpp", ".js", ".mjs", ".py", ".sh"],
    extraCodeFiles: ["server.sh", "CMakeLists.txt"],
    hashCommentExtensions: [".sh", ".py"],
    extraHashCommentFiles: ["CMakeLists.txt"],
    blockCommentExtensions: [".c", ".cc", ".cpp", ".h", ".hpp", ".js", ".mjs"],
    allowedEnglishOnlyComments: [],
  };
  if (!fs.existsSync(policyPath)) return defaults;
  const loaded = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  return { ...defaults, ...loaded };
}

function toRelative(file) {
  return path.relative(rootDir, file).replaceAll(path.sep, "/");
}
