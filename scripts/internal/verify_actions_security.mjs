#!/usr/bin/env node
// 파일 용도: GitHub Actions workflow 권한과 외부 action 사용 정책을 public repo 기준으로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`GitHub Actions security verification

Usage:
  ./server.sh verify-actions-security [options]

Options:
  --annotations-json <path>  GitHub check-runs annotations API JSON export입니다.
  -h, --help                 도움말 출력

Checks:
  - 각 workflow가 top-level permissions: contents: read를 명시
  - pull-requests/write, contents/write 같은 쓰기 권한을 사용하지 않음
  - allowed action은 GitHub 공식 actions/* v4 또는 SHA-pinned action만 허용
  - check-run annotation export를 지정하면 warning/failure annotation을 release gate 실패로 처리
`);
}
assertKnownOptions(rawArgs, ["annotations-json", "h", "help"]);

const args = parseArgs(rawArgs);

const workflowDir = path.join(rootDir, ".github/workflows");
const files = fs.readdirSync(workflowDir)
  .filter((name) => /\.(ya?ml)$/.test(name))
  .map((name) => path.join(workflowDir, name))
  .sort();
const failures = [];
const policyDocs = [
  readText("docs/release-policy.md"),
  readText("docs/public-repo-final-review.md"),
  readText("docs/stream-verification.md"),
  readText(".github/PULL_REQUEST_TEMPLATE.md"),
].join("\n");

for (const file of files) {
  const relative = toRelative(file);
  const text = fs.readFileSync(file, "utf8");
  if (!/^permissions:\n\s+contents:\s+read\s*$/m.test(text)) {
    failures.push(`${relative}: missing top-level permissions: contents: read`);
  }
  for (const line of text.split(/\n/)) {
    if (/^\s+(contents|pull-requests|issues|packages|actions):\s+write\s*$/.test(line)) {
      failures.push(`${relative}: write permission is not allowed: ${line.trim()}`);
    }
    const uses = /^\s+uses:\s+([^\s#]+)\s*$/.exec(line);
    if (uses && !isAllowedAction(uses[1])) {
      failures.push(`${relative}: action must be official actions/*@v4 or SHA pinned: ${uses[1]}`);
    }
  }
}

verifyAnnotationPolicyDocs();
verifyAnnotationFixtureParser();
if (args.annotationsJson) {
  const annotationPath = path.resolve(rootDir, args.annotationsJson);
  const annotations = readAnnotationJson(annotationPath);
  const blocking = blockingAnnotations(annotations);
  for (const item of blocking) {
    failures.push(`${toRelative(annotationPath)}: blocking check-run annotation ${formatAnnotation(item)}`);
  }
}

if (failures.length > 0) {
  console.log("[fail] GitHub Actions security policy");
  for (const failure of failures) console.log(`  - ${failure}`);
}

console.log("");
console.log("== GitHub Actions security summary ==");
console.log(`- workflow files: ${files.length}`);
if (args.annotationsJson) {
  const annotations = readAnnotationJson(path.resolve(rootDir, args.annotationsJson));
  console.log(`- annotations: ${annotations.length}`);
  console.log(`- blocking annotations: ${blockingAnnotations(annotations).length}`);
} else {
  console.log("- annotations: not provided");
}
console.log(`- failures: ${failures.length}`);
if (failures.length > 0) process.exit(1);

function isAllowedAction(value) {
  const officialVersionTag = /^actions\/[A-Za-z0-9_.-]+@v4$/.test(value);
  const shaPinned = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/i.test(value);
  const localAction = value.startsWith("./");
  return officialVersionTag || shaPinned || localAction;
}

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--annotations-json=")) {
      parsed.annotationsJson = token.slice("--annotations-json=".length);
    } else if (token === "--annotations-json") {
      parsed.annotationsJson = argsList[++index];
    }
  }
  return parsed;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function verifyAnnotationPolicyDocs() {
  const required = [
    "GitHub Actions warning annotation gate",
    "warning/failure annotation",
    "success check-run",
    "./server.sh verify-actions-security --annotations-json <annotations.json>",
    "PASS evidence로 대체하지 않습니다",
  ];
  for (const phrase of required) {
    if (!policyDocs.includes(phrase)) {
      failures.push(`annotation policy docs missing phrase: ${phrase}`);
    }
  }
}

function verifyAnnotationFixtureParser() {
  const warningFixture = path.join(rootDir, "test/fixtures/actions_annotations/warning-annotation.json");
  const noticeFixture = path.join(rootDir, "test/fixtures/actions_annotations/notice-annotation.json");
  const warningBlocking = blockingAnnotations(readAnnotationJson(warningFixture));
  const noticeBlocking = blockingAnnotations(readAnnotationJson(noticeFixture));
  if (warningBlocking.length !== 1) {
    failures.push("annotation warning fixture must produce one blocking annotation");
  }
  if (noticeBlocking.length !== 0) {
    failures.push("annotation notice fixture must not produce blocking annotations");
  }
}

function readAnnotationJson(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.annotations)) return payload.annotations;
  if (Array.isArray(payload.checkRunAnnotations)) return payload.checkRunAnnotations;
  if (Array.isArray(payload.items)) return payload.items;
  throw new Error(`${toRelative(filePath)}: expected annotations array`);
}

function blockingAnnotations(annotations) {
  return annotations.filter((item) => {
    const level = String(item.annotation_level || item.level || item.severity || "").toLowerCase();
    return level === "warning" || level === "failure";
  });
}

function formatAnnotation(item) {
  const level = item.annotation_level || item.level || item.severity || "unknown";
  const pathLabel = item.path || item.file || "(no path)";
  const title = item.title || item.message || item.raw_details || "(no title)";
  return `${level} ${pathLabel}: ${title}`;
}
