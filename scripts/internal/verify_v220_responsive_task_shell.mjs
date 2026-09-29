#!/usr/bin/env node
// 파일 용도: 현행 UI responsive 계약·구현 연결을 확인한다. CLI 이름은 호환을 위해 유지한다.

import { validateUiComponentDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 responsive task shell verification

Usage:
  ./server.sh verify-v220-responsive-task-shell

검사 범위:
  - 현행 UI 기술 안내와 정확한 명령 연결
  - route별 작업·viewport 의도 정의
  - 정적 결과를 실제 UI/장시간 PASS로 사용하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("현행 UI 안내·정책·명령 연결", () => {
  const errors = validateUiComponentDocumentation({
    document: readText("docs/product-shell-component-examples.md"), kind: "responsive",
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v2.2.0 responsive task shell summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
