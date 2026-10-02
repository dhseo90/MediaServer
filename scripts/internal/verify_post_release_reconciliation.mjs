#!/usr/bin/env node
// 파일 용도: 현행 결과/실행 상태 정책의 연결과 선택 기록 형식을 검사한다. 실제 실행 증거를 재판정하지 않는다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {validateReleasePolicyDocumentation} from "./release_documentation_contract.mjs";
import {validateVerificationDocumentation, validateUiPolicyDocumentation} from "./documentation_contract_lib.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release evidence reconciliation verification

Usage:
  ./server.sh verify-post-release-reconciliation [options]

Options:
  --history <path>  선택 evidence log 경로입니다. 지정하면 기본 section 경계도 확인합니다.
  -h, --help        도움말 출력

Checks:
  - 현행 metadata·검증·UI 정책 진입점 검사
  - --history로 지정한 기록의 확인됨:/미확인:/미실행: 형식 확인
  - 종료 원장이나 backlog 없이 실행하며 실제 릴리즈·UI·장시간 실행 결과가 아닙니다.
`);
}

assertKnownOptions(rawArgs, ["history", "h", "help"]);

const args = parseArgs(rawArgs);
const historyPath = args.history ? path.resolve(rootDir, args.history) : "";
const history = historyPath ? fs.readFileSync(historyPath, "utf8") : "";
const checks = [];
check("현행 metadata·정책 진입점·미실행 출력 계약", () => {
  const errors = validateReleasePolicyDocumentation({policy:readText("docs/release-policy.md"),
    versioning:readText("docs/versioning-policy.md"),version:readText("VERSION").trim()});
  assertNoErrors(errors);
});
check("검증 정의와 실행 결과 구분의 현행 기준", () => {
  assertNoErrors(validateVerificationDocumentation({agents:readText("AGENTS.md"),verification:readText("docs/stream-verification.md")}));
});
check("실제 UI와 문서 검사 구분·UI 적격 기준", () => {
  const policy=JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  assertNoErrors([...validatePolicy(policy), ...validateUiPolicyDocumentation({
    agents:readText("AGENTS.md"),fulltest:readText("docs/manual-ui-fulltest.md"),policy})]);
});

if (historyPath) {
  check("provided history includes confirmed section", () => {
    assertIncludes(history, [
      "확인됨:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });

  check("provided history includes unverified section", () => {
    assertIncludes(history, [
      "미확인:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });

  check("provided history includes not-run section", () => {
    assertIncludes(history, [
      "미실행:",
    ], path.relative(rootDir, historyPath).replaceAll(path.sep, "/"));
  });
}

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
console.log("== Release evidence reconciliation summary ==");
console.log(`- history: ${historyPath ? path.relative(rootDir, historyPath).replaceAll(path.sep, "/") : "not provided; current policy only"}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- 범위: 정책 연결·선택 기록 형식 검사이며 실제 릴리즈·UI·장시간 실행 결과가 아닙니다.");
if (fail > 0) process.exit(1);

function assertNoErrors(errors) { if (errors.length) throw new Error(errors.join("; ")); }

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
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
