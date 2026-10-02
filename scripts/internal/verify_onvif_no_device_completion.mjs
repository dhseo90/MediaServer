#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 조건의 종료 판정과 별도 후속 범위 분리를 검증한다.
// 동작 요약: 현행 문서·suite 정의·summary fixture의 연결을 확인한다. 이 정적 검사 자체는 suite 실행/완료가 아니다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink, validateOnvifNoDeviceDocumentation, validateOnvifSupportMatrixDocumentation } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF no-device completion verification

Usage:
  ./server.sh verify-onvif-no-device-completion

Checks:
  - 현행 명령·summary 출력과 실장비 미확인 경계를 문서가 명시함
  - protocol matrix와 연결하며 정적 검사와 실제 suite 완료를 구분함
  - no-device suite/summary fixture가 completion guard와 local simulator variant를 포함함
  - 실제 장비 성공은 계속 미확인으로 유지함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const noDeviceDoc = readText("docs/onvif-no-device-verification.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const suiteScript = readText("scripts/internal/verify_onvif_no_device_suite.mjs");
const successSummary = JSON.parse(readText("test/fixtures/onvif_no_device_suite_success_summary.json"));
const failureSummary = JSON.parse(readText("test/fixtures/onvif_no_device_suite_failure_summary.json"));
const expectedSchema = "media-server.onvif-no-device-suite-summary.v1";

const checks = [];

check("no-device completion criteria are documented", () => {
  const errors = validateOnvifNoDeviceDocumentation(noDeviceDoc);
  assert(errors.length === 0, errors.join("; "));
});

check("separate follow-up scope is not counted as no-device residual work", () => {
  // 인증 주입 전체를 미래 기능으로 고정하지 않는다. 실제 지원 상태는 현행 matrix가 기준이다.
  const errors = validateOnvifSupportMatrixDocumentation(matrixDoc);
  assert(errors.length === 0, errors.join("; "));
});

check("live support verification includes no-device completion guard", () => {
  assert(hasDocumentLink(liveSupportDoc, "onvif-no-device-verification.md"), "live support doc missing no-device link");
  assertContains(noDeviceDoc, "verify-onvif-no-device-completion", "no-device guide missing completion command");
  assertContains(liveSupportDoc, "미확인", "live support doc must keep real device success unverified");
});

check("no-device suite includes completion guard", () => {
  assertContains(suiteScript, "verify-onvif-no-device-completion", "suite missing completion guard");
});

check("no-device suite includes local simulator variants", () => {
  assertContains(suiteScript, "verify-onvif-local-simulator", "suite missing local simulator smoke");
  assertContains(suiteScript, "verify-onvif-synthetic-vendor-fixtures", "suite missing synthetic vendor fixture smoke");
  assertContains(suiteScript, "verify-onvif-field-smoke-gate", "suite missing field smoke gate verifier");
});

check("success summary fixture preserves completed no-device closure", () => {
  assert(successSummary.schema === expectedSchema, "success summary schema mismatch");
  assert(successSummary.mode === "실장비 제외", "success summary mode mismatch");
  assert(successSummary.realDeviceEndpointSuccess === "미확인", "success summary real device status mismatch");
  assert(successSummary.completed === successSummary.total, "success summary completed must equal total");
  assert(successSummary.failed === null, "success summary failed must be null");
  const commands = successSummary.results.map(result => result.command);
  assert(commands.includes("./server.sh verify-onvif-local-simulator"), "success summary missing local simulator command");
  assert(commands.includes("./server.sh verify-onvif-synthetic-vendor-fixtures"), "success summary missing synthetic vendor fixture command");
  assert(commands.includes("./server.sh verify-onvif-field-smoke-gate"), "success summary missing field smoke gate command");
  assert(commands.includes("./server.sh verify-onvif-no-device-completion"), "success summary missing completion command");
  assert(successSummary.results.length === successSummary.total, "success summary results length mismatch");
});

check("failure summary fixture keeps failed path while total tracks suite length", () => {
  assert(failureSummary.schema === expectedSchema, "failure summary schema mismatch");
  assert(failureSummary.mode === "실장비 제외", "failure summary mode mismatch");
  assert(failureSummary.realDeviceEndpointSuccess === "미확인", "failure summary real device status mismatch");
  assert(failureSummary.completed < failureSummary.total, "failure summary must stop before total");
  assert(typeof failureSummary.failed === "string" && failureSummary.failed.startsWith("./server.sh "), "failure summary failed command missing");
  assert(failureSummary.results.length === failureSummary.completed + 1, "failure summary results length mismatch");
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
console.log("== ONVIF no-device completion summary ==");
console.log("- mode: 실장비 제외");
console.log("- realDeviceEndpointSuccess: 미확인");
console.log("- evidence: 문서·runner·정의 fixture 정적 검사; actual suite not-run");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
