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
  ./server.sh verify-actions-security

Checks:
  - 각 workflow가 top-level permissions: contents: read를 명시
  - pull-requests/write, contents/write 같은 쓰기 권한을 사용하지 않음
  - allowed action은 GitHub 공식 actions/* v4 또는 SHA-pinned action만 허용
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const workflowDir = path.join(rootDir, ".github/workflows");
const files = fs.readdirSync(workflowDir)
  .filter((name) => /\.(ya?ml)$/.test(name))
  .map((name) => path.join(workflowDir, name))
  .sort();
const failures = [];

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

if (failures.length > 0) {
  console.log("[fail] GitHub Actions security policy");
  for (const failure of failures) console.log(`  - ${failure}`);
}

console.log("");
console.log("== GitHub Actions security summary ==");
console.log(`- workflow files: ${files.length}`);
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
