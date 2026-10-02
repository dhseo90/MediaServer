#!/usr/bin/env node
// 파일 용도: v2.4.0 S08 release readiness gate mapping을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {validateReleasePolicyDocumentation,validateReleaseCommandDispatch} from "./release_documentation_contract.mjs";
import {validateVerificationDocumentation, validateUiPolicyDocumentation} from "./documentation_contract_lib.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.4.0 S08 release readiness gate verification

Usage:
  ./server.sh verify-v240-release-readiness-gate

Checks:
  - 현행 릴리즈 metadata·검증/UI 정책·독립 명령 연결을 확인
  - 종료된 v2.4 실행 원장과 완료 문구는 요구하지 않음
  - 준비 도구 검사이며 실제 릴리즈·UI·장시간 실행은 미수행
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v240-release-readiness-gate",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-ci-local-gate-parity",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("현행 릴리즈 정책·검증 정의와 준비 명령 연결",()=>{
  const errors=validateReleasePolicyDocumentation({policy:readText("docs/release-policy.md"),
    versioning:readText("docs/versioning-policy.md"),version:readText("VERSION").trim()});
  const agents=readText("AGENTS.md"), verification=readText("docs/stream-verification.md");
  const policy=JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  errors.push(...validateVerificationDocumentation({agents,verification}),...validatePolicy(policy),
    ...validateUiPolicyDocumentation({agents,fulltest:readText("docs/manual-ui-fulltest.md"),policy}));
  assert(errors.length===0,errors.join("; "));
  const dispatchErrors=validateReleaseCommandDispatch(readText("server.sh"),readinessCommands);
  assert(dispatchErrors.length===0,dispatchErrors.join("; "));
  for(const command of readinessCommands){
    assert(verification.includes(command),"검증 정의 명령 누락: "+command);
  }
});

check("server entrypoint exposes the S08 verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-v240-release-readiness-gate"),
    "server.sh missing verify-v240-release-readiness-gate");
  assert(serverSh.includes("verify_v240_release_readiness_gate.mjs"),
    "server.sh missing S08 verifier script dispatch");
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
console.log("== v2.4.0 S08 release readiness gate summary ==");
console.log("- schema: media-server.v240-release-readiness-gate.v1");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

console.log("- 범위: 현재 정의·정책 연결 검사이며 실제 릴리즈·UI·장시간 실행은 미수행입니다.");
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
