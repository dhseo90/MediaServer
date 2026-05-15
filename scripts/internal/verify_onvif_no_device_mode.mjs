#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 검증 모드의 문서/명령/옵션 기준을 정적으로 확인한다.
// 동작 요약: 실장비 성공을 미확인으로 남기고 synthetic fixture, loopback, redaction 검증만 no-device 범위에 둔다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF no-device verification

Usage:
  ./server.sh verify-onvif-no-device-mode

Checks:
  - ONVIF no-device 문서가 실장비 제외/미확인 경계를 명시함
  - no-device suite summary JSON 옵션을 문서와 runner가 함께 제공함
  - no-device suite 실패 summary fixture가 completed/failed/results를 보존함
  - no-device 검증 명령이 allow-missing-endpoint와 expect-failure를 포함함
  - live support 문서가 no-device 기준 문서와 검증 명령을 참조함
  - field HTTP probe harness가 no-device 옵션을 유지함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const noDeviceDocPath = path.join(rootDir, "docs/onvif-no-device-verification.md");
const liveSupportDocPath = path.join(rootDir, "docs/onvif-live-source-support.md");
const fieldProbeScriptPath = path.join(rootDir, "scripts/internal/verify_onvif_field_http_probe.mjs");
const noDeviceSuiteScriptPath = path.join(rootDir, "scripts/internal/verify_onvif_no_device_suite.mjs");
const failureSummaryFixturePath = path.join(rootDir, "test/fixtures/onvif_no_device_suite_failure_summary.json");

const noDeviceDoc = readText(noDeviceDocPath);
const liveSupportDoc = readText(liveSupportDocPath);
const fieldProbeScript = readText(fieldProbeScriptPath);
const noDeviceSuiteScript = readText(noDeviceSuiteScriptPath);
const failureSummaryFixture = JSON.parse(readText(failureSummaryFixturePath));

const checks = [];

check("no-device document defines field-device exclusion boundary", () => {
  assertContains(noDeviceDoc, "실장비 제외", "missing explicit 실장비 제외 wording");
  assertContains(noDeviceDoc, "미확인", "missing 미확인 reporting wording");
  assertContains(noDeviceDoc, "실장비 endpoint 성공", "missing real endpoint success caveat");
  assertContains(noDeviceDoc, "synthetic fixture", "missing synthetic fixture scope");
  assertContains(noDeviceDoc, "synthetic profile variant", "missing synthetic profile variant scope");
  assertContains(noDeviceDoc, "loopback", "missing loopback scope");
  assertContains(noDeviceDoc, "closed loopback failure matrix", "missing closed loopback matrix scope");
  assertContains(noDeviceDoc, "redaction", "missing redaction scope");
  assertContains(noDeviceDoc, "SourceRegistry/PublishedView", "missing draft contract scope");
});

check("no-device command list keeps endpoint-free and sanitized-failure probes", () => {
  assertContains(noDeviceDoc, "./server.sh verify-onvif-no-device-suite", "missing no-device suite command");
  assertContains(noDeviceDoc, "verify-onvif-no-device-suite --json-output", "missing no-device suite JSON command");
  assertContains(noDeviceDoc, "media-server.onvif-no-device-suite-summary.v1", "missing no-device summary schema");
  assertContains(noDeviceDoc, "test/fixtures/onvif_no_device_suite_failure_summary.json", "missing failure summary fixture path");
  assertContains(noDeviceDoc, "./server.sh verify-onvif-no-device-mode", "missing self-check command");
  assertContains(noDeviceDoc, "verify-onvif-protocol-support-matrix", "missing protocol support matrix command");
  assertContains(noDeviceDoc, "verify-onvif-probe-profile-variants", "missing profile variant command");
  assertContains(noDeviceDoc, "verify-onvif-field-http-probe --allow-missing-endpoint", "missing missing-endpoint command");
  assertContains(noDeviceDoc, "--expect-failure", "missing sanitized failure command");
  assertContains(noDeviceDoc, "verify-onvif-closed-loopback-failure-matrix", "missing closed loopback failure matrix command");
  assertContains(noDeviceDoc, "http://127.0.0.1:9/onvif/device_service", "missing closed loopback endpoint");
  assertContains(noDeviceDoc, "--credential-ref-present", "missing credential reference flag");
  assertContains(noDeviceDoc, "verify-onvif-field-smoke-redaction", "missing redaction verification");
  assertContains(noDeviceDoc, "verify-onvif-field-smoke-sample-bundle", "missing sample bundle verification");
});

check("live support document links no-device mode without claiming field success", () => {
  assertContains(liveSupportDoc, "./onvif-no-device-verification.md", "live support doc does not link no-device doc");
  assertContains(liveSupportDoc, "verify-onvif-no-device-suite", "live support verification missing no-device suite command");
  assertContains(liveSupportDoc, "verify-onvif-no-device-suite --json-output", "live support verification missing no-device suite JSON command");
  assertContains(liveSupportDoc, "test/fixtures/onvif_no_device_suite_failure_summary.json", "live support doc missing failure summary fixture path");
  assertContains(liveSupportDoc, "verify-onvif-no-device-mode", "live support verification missing no-device command");
  assertContains(liveSupportDoc, "verify-onvif-protocol-support-matrix", "live support verification missing protocol matrix command");
  assertContains(liveSupportDoc, "verify-onvif-probe-profile-variants", "live support verification missing profile variant command");
  assertContains(liveSupportDoc, "verify-onvif-field-http-probe --allow-missing-endpoint", "live support doc missing missing-endpoint command");
  assertContains(liveSupportDoc, "--expect-failure", "live support doc missing sanitized loopback failure command");
  assertContains(liveSupportDoc, "verify-onvif-closed-loopback-failure-matrix", "live support doc missing closed loopback matrix command");
  assertContains(liveSupportDoc, "실장비 endpoint 성공은 미확인", "live support doc missing explicit unverified endpoint success wording");
});

check("no-device suite runner can write summary JSON", () => {
  for (const token of [
    "json-output",
    "media-server.onvif-no-device-suite-summary.v1",
    "realDeviceEndpointSuccess",
    "writeJsonSummary",
    "results",
  ]) {
    assertContains(noDeviceSuiteScript, token, `no-device suite script missing ${token}`);
  }
});

check("no-device failure summary fixture preserves failed command state", () => {
  assert(failureSummaryFixture.schema === "media-server.onvif-no-device-suite-summary.v1", "failure summary schema mismatch");
  assert(failureSummaryFixture.mode === "실장비 제외", "failure summary mode mismatch");
  assert(failureSummaryFixture.realDeviceEndpointSuccess === "미확인", "failure summary real device status mismatch");
  assert(Number.isInteger(failureSummaryFixture.total) && failureSummaryFixture.total > 0, "failure summary total must be positive integer");
  assert(Number.isInteger(failureSummaryFixture.completed), "failure summary completed must be integer");
  assert(failureSummaryFixture.completed >= 0 && failureSummaryFixture.completed < failureSummaryFixture.total, "failure summary completed must stop before total");
  assert(typeof failureSummaryFixture.failed === "string" && failureSummaryFixture.failed.startsWith("./server.sh "), "failure summary failed command missing");
  assert(Array.isArray(failureSummaryFixture.results), "failure summary results must be array");
  assert(failureSummaryFixture.results.length === failureSummaryFixture.completed + 1, "failure summary must include completed results and failed result");
  for (let index = 0; index < failureSummaryFixture.results.length; index += 1) {
    const result = failureSummaryFixture.results[index];
    assert(result.index === index + 1, `failure summary result index mismatch at ${index}`);
    assert(typeof result.command === "string" && result.command.startsWith("./server.sh "), `failure summary result command mismatch at ${index}`);
    assert(Number.isInteger(result.status), `failure summary result status missing at ${index}`);
    if (index < failureSummaryFixture.completed) {
      assert(result.ok === true, `failure summary completed result must be ok at ${index}`);
      assert(result.status === 0, `failure summary completed result status must be 0 at ${index}`);
    } else {
      assert(result.ok === false, "failure summary failed result must be ok=false");
      assert(result.status !== 0, "failure summary failed result status must be non-zero");
      assert(result.command === failureSummaryFixture.failed, "failure summary failed command must match failed result");
    }
  }
  const serialized = JSON.stringify(failureSummaryFixture);
  for (const forbidden of [
    "operator-entered-secret",
    "password",
    "Authorization",
    "raw SOAP",
    "certificate dump",
  ]) {
    assert(!serialized.includes(forbidden), `failure summary fixture leaked forbidden token: ${forbidden}`);
  }
});

check("field HTTP probe harness retains no-device options and credential redaction", () => {
  for (const token of [
    "allow-missing-endpoint",
    "expect-failure",
    "credential-ref-present",
    "endpoint URL must not include credentials",
    "assertRedacted",
  ]) {
    assertContains(fieldProbeScript, token, `field HTTP probe script missing ${token}`);
  }
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
console.log("== ONVIF no-device verification summary ==");
console.log("- mode: 실장비 제외");
console.log("- realDeviceEndpointSuccess: 미확인");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  assert(fs.existsSync(filePath), `missing file: ${path.relative(rootDir, filePath)}`);
  return fs.readFileSync(filePath, "utf8");
}
