#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 조건의 종료 판정과 별도 후속 범위 분리를 검증한다.
// 동작 요약: no-device 문서, suite/summary fixture, protocol matrix가 필수 잔여 없음과 미확인 항목을 함께 고정하는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF no-device completion verification

Usage:
  ./server.sh verify-onvif-no-device-completion

Checks:
  - 실장비 제외 조건의 필수 잔여 없음 판정을 문서가 명시함
  - 별도 후속 범위와 no-device 완료 범위를 구분함
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
  for (const term of [
    "## 종료 판정",
    "실장비 제외 조건의 잔여 필수 이슈 없음",
    "실장비 endpoint 성공은 계속 미확인",
    "local simulator variant",
    "Media2 우선",
    "Media fallback",
    "Media-only",
    "non-RTSP GetStreamUri 실패",
  ]) {
    assertContains(noDeviceDoc, term, `no-device doc missing completion term: ${term}`);
  }
});

check("separate follow-up scope is not counted as no-device residual work", () => {
  for (const term of [
    "별도 후속 범위",
    "실장비 field smoke",
    "HTTPS/TLS ONVIF SOAP transport 실제 구현",
    "ONVIF 인증 주입",
    "WS-Discovery 지원",
    "Profile G",
  ]) {
    assertContains(noDeviceDoc, term, `no-device doc missing separate follow-up term: ${term}`);
  }
  assertContains(matrixDoc, "HTTPS/TLS ONVIF SOAP endpoint | fail-closed", "matrix must keep HTTPS SOAP fail-closed");
  assertContains(matrixDoc, "Credential reference | v1.2.0 reference/redaction 정책 지원", "matrix must keep credential reference scope");
  assertContains(matrixDoc, "ONVIF WS-Discovery | 비지원", "matrix must keep WS-Discovery unsupported");
  assertContains(matrixDoc, "ONVIF Profile G / Recording / Replay | 비지원", "matrix must keep Profile G unsupported");
});

check("live support verification includes no-device completion guard", () => {
  assertContains(liveSupportDoc, "verify-onvif-no-device-completion", "live support doc missing no-device completion command");
  assertContains(liveSupportDoc, "실장비 endpoint 성공은 미확인", "live support doc must keep real device success unverified");
});

check("no-device suite includes completion guard and local simulator variants", () => {
  assertContains(suiteScript, "verify-onvif-local-simulator", "suite missing local simulator smoke");
  assertContains(suiteScript, "verify-onvif-no-device-completion", "suite missing completion guard");
});

check("success summary fixture preserves completed no-device closure", () => {
  assert(successSummary.schema === expectedSchema, "success summary schema mismatch");
  assert(successSummary.mode === "실장비 제외", "success summary mode mismatch");
  assert(successSummary.realDeviceEndpointSuccess === "미확인", "success summary real device status mismatch");
  assert(successSummary.completed === successSummary.total, "success summary completed must equal total");
  assert(successSummary.failed === null, "success summary failed must be null");
  const commands = successSummary.results.map(result => result.command);
  assert(commands.includes("./server.sh verify-onvif-local-simulator"), "success summary missing local simulator command");
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
