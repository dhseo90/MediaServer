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
const successSummaryFixturePath = path.join(rootDir, "test/fixtures/onvif_no_device_suite_success_summary.json");
const failureSummaryFixturePath = path.join(rootDir, "test/fixtures/onvif_no_device_suite_failure_summary.json");
const closedLoopbackMatrixPath = path.join(rootDir, "test/fixtures/onvif_closed_loopback_failure_matrix.json");

const noDeviceDoc = readText(noDeviceDocPath);
const liveSupportDoc = readText(liveSupportDocPath);
const fieldProbeScript = readText(fieldProbeScriptPath);
const noDeviceSuiteScript = readText(noDeviceSuiteScriptPath);
const successSummaryFixture = JSON.parse(readText(successSummaryFixturePath));
const failureSummaryFixture = JSON.parse(readText(failureSummaryFixturePath));
const closedLoopbackMatrix = JSON.parse(readText(closedLoopbackMatrixPath));
const expectedSummarySchema = "media-server.onvif-no-device-suite-summary.v1";

const checks = [];

check("no-device document defines field-device exclusion boundary", () => {
  assertContains(noDeviceDoc, "실장비 제외", "missing explicit 실장비 제외 wording");
  assertContains(noDeviceDoc, "미확인", "missing 미확인 reporting wording");
  assertContains(noDeviceDoc, "실장비 endpoint 성공", "missing real endpoint success caveat");
  assertContains(noDeviceDoc, "실제 ONVIF 카메라를 사용한 field smoke를 수행하지 않았습니다", "missing explicit no real camera statement");
  assertContains(noDeviceDoc, "공개 인터넷에 노출된 임의 ONVIF endpoint", "missing public endpoint exclusion");
  assertContains(noDeviceDoc, "local simulator fixture smoke", "missing local simulator substitute scope");
  assertContains(noDeviceDoc, "local simulator variant", "missing local simulator variant scope");
  assertContains(noDeviceDoc, "non-RTSP GetStreamUri 실패", "missing local simulator non-RTSP failure scope");
  assertContains(noDeviceDoc, "synthetic fixture", "missing synthetic fixture scope");
  assertContains(noDeviceDoc, "synthetic profile variant", "missing synthetic profile variant scope");
  assertContains(noDeviceDoc, "vendor-style synthetic fixture", "missing vendor-style synthetic fixture scope");
  assertContains(noDeviceDoc, "Media/Media2 empty-profile", "missing empty profile failure scope");
  assertContains(noDeviceDoc, "loopback", "missing loopback scope");
  assertContains(noDeviceDoc, "closed loopback failure matrix", "missing closed loopback matrix scope");
  assertContains(noDeviceDoc, "redaction", "missing redaction scope");
  assertContains(noDeviceDoc, "SourceRegistry/PublishedView", "missing draft contract scope");
});

check("no-device command list keeps endpoint-free and sanitized-failure probes", () => {
  assertContains(noDeviceDoc, "./server.sh verify-onvif-no-device-suite", "missing no-device suite command");
  assertContains(noDeviceDoc, "verify-onvif-no-device-suite --json-output", "missing no-device suite JSON command");
  assertContains(noDeviceDoc, expectedSummarySchema, "missing no-device summary schema");
  assertContains(noDeviceDoc, "schema drift guard", "missing no-device schema drift guard wording");
  assertContains(noDeviceDoc, "test/fixtures/onvif_no_device_suite_success_summary.json", "missing success summary fixture path");
  assertContains(noDeviceDoc, "test/fixtures/onvif_no_device_suite_failure_summary.json", "missing failure summary fixture path");
  assertContains(noDeviceDoc, "./server.sh verify-onvif-no-device-mode", "missing self-check command");
  assertContains(noDeviceDoc, "verify-onvif-no-device-completion", "missing no-device completion command");
  assertContains(noDeviceDoc, "verify-onvif-protocol-support-matrix", "missing protocol support matrix command");
  assertContains(noDeviceDoc, "verify-onvif-https-tls-fixture", "missing HTTPS TLS fixture command");
  assertContains(noDeviceDoc, "trusted fixture success", "missing HTTPS TLS trusted fixture wording");
  assertContains(noDeviceDoc, "verify-onvif-auth-injection-loopback", "missing auth injection loopback command");
  assertContains(noDeviceDoc, "verify-onvif-probe-profile-variants", "missing profile variant command");
  assertContains(noDeviceDoc, "verify-onvif-synthetic-vendor-fixtures", "missing synthetic vendor fixture command");
  assertContains(noDeviceDoc, "test/fixtures/onvif_synthetic_vendor_fixture_pack.json", "missing synthetic vendor fixture path");
  assertContains(noDeviceDoc, "verify-onvif-local-simulator", "missing local simulator command");
  assertContains(noDeviceDoc, "verify-onvif-soap-fault-matrix", "missing SOAP fault matrix command");
  assertContains(noDeviceDoc, "SOAP Fault/malformed response matrix", "missing SOAP fault matrix wording");
  assertContains(noDeviceDoc, "verify-onvif-field-smoke-gate", "missing field smoke gate command");
  assertContains(noDeviceDoc, "no-device suite 통과는 field smoke gate pass가 아닙니다", "missing field gate caveat");
  assertContains(noDeviceDoc, "verify-onvif-field-http-probe --allow-missing-endpoint", "missing missing-endpoint command");
  assertContains(noDeviceDoc, "--expect-failure", "missing sanitized failure command");
  assertContains(noDeviceDoc, "verify-onvif-closed-loopback-failure-matrix", "missing closed loopback failure matrix command");
  assertContains(noDeviceDoc, "http://127.0.0.1:9/onvif/device_service", "missing closed loopback endpoint");
  assertContains(noDeviceDoc, "--credential-ref-present", "missing credential reference flag");
  assertContains(noDeviceDoc, "verify-onvif-field-smoke-redaction", "missing redaction verification");
  assertContains(noDeviceDoc, "verify-onvif-field-smoke-sample-bundle", "missing sample bundle verification");
  assertContains(noDeviceDoc, "query string credential/token sentinel", "missing query sentinel redaction scope");
  assertContains(noDeviceDoc, "--output JSON artifact redaction", "missing output artifact redaction scope");
});

check("live support document links no-device mode without claiming field success", () => {
  assertContains(liveSupportDoc, "./onvif-no-device-verification.md", "live support doc does not link no-device doc");
  assertContains(liveSupportDoc, "verify-onvif-no-device-suite", "live support verification missing no-device suite command");
  assertContains(liveSupportDoc, "verify-onvif-no-device-suite --json-output", "live support verification missing no-device suite JSON command");
  assertContains(liveSupportDoc, "test/fixtures/onvif_no_device_suite_failure_summary.json", "live support doc missing failure summary fixture path");
  assertContains(liveSupportDoc, "verify-onvif-no-device-mode", "live support verification missing no-device command");
  assertContains(liveSupportDoc, "verify-onvif-no-device-completion", "live support verification missing no-device completion command");
  assertContains(liveSupportDoc, "verify-onvif-protocol-support-matrix", "live support verification missing protocol matrix command");
  assertContains(liveSupportDoc, "verify-onvif-https-tls-fixture", "live support doc missing HTTPS TLS fixture command");
  assertContains(liveSupportDoc, "verify-onvif-auth-injection-loopback", "live support doc missing auth injection loopback command");
  assertContains(liveSupportDoc, "verify-onvif-probe-profile-variants", "live support verification missing profile variant command");
  assertContains(liveSupportDoc, "verify-onvif-synthetic-vendor-fixtures", "live support verification missing synthetic vendor fixture command");
  assertContains(liveSupportDoc, "test/fixtures/onvif_synthetic_vendor_fixture_pack.json", "live support doc missing synthetic vendor fixture path");
  assertContains(liveSupportDoc, "verify-onvif-local-simulator", "live support verification missing local simulator command");
  assertContains(liveSupportDoc, "verify-onvif-soap-fault-matrix", "live support verification missing SOAP fault matrix command");
  assertContains(liveSupportDoc, "Media fallback, Media-only, non-RTSP GetStreamUri 실패", "live support doc missing local simulator variant wording");
  assertContains(liveSupportDoc, "verify-onvif-field-smoke-gate", "live support doc missing field smoke gate command");
  assertContains(liveSupportDoc, "field smoke gate 결과와 분리합니다", "live support doc missing field gate separation wording");
  assertContains(liveSupportDoc, "verify-onvif-field-http-probe --allow-missing-endpoint", "live support doc missing missing-endpoint command");
  assertContains(liveSupportDoc, "--expect-failure", "live support doc missing sanitized loopback failure command");
  assertContains(liveSupportDoc, "verify-onvif-closed-loopback-failure-matrix", "live support doc missing closed loopback matrix command");
  assertContains(liveSupportDoc, "실장비 endpoint 성공은 미확인", "live support doc missing explicit unverified endpoint success wording");
  assertContains(liveSupportDoc, "test/fixtures/onvif_no_device_suite_success_summary.json", "live support doc missing success summary fixture path");
});

check("no-device suite runner can write summary JSON", () => {
  for (const token of [
    "json-output",
    expectedSummarySchema,
    "noDeviceSuiteSummarySchema",
    "realDeviceEndpointSuccess",
    "writeJsonSummary",
    "results",
    "verify-onvif-https-tls-fixture",
    "verify-onvif-auth-injection-loopback",
    "verify-onvif-synthetic-vendor-fixtures",
    "verify-onvif-local-simulator",
    "verify-onvif-soap-fault-matrix",
    "verify-onvif-field-smoke-gate",
    "verify-onvif-no-device-completion",
  ]) {
    assertContains(noDeviceSuiteScript, token, `no-device suite script missing ${token}`);
  }
});

check("no-device summary schema version drift guard is pinned", () => {
  const runnerSchema = extractConstString(noDeviceSuiteScript, "noDeviceSuiteSummarySchema");
  assert(runnerSchema === expectedSummarySchema, "runner summary schema constant mismatch");
  assert(successSummaryFixture.schema === runnerSchema, "success summary fixture schema drifted from runner");
  assert(failureSummaryFixture.schema === runnerSchema, "failure summary fixture schema drifted from runner");
  assertContains(noDeviceDoc, `"schema": "${runnerSchema}"`, "no-device doc JSON example schema mismatch");
  assertContains(noDeviceDoc, "runner 상수, 성공 예시, 성공 fixture, 실패 fixture", "no-device doc missing schema guard participants");
  assertContains(liveSupportDoc, "schema version drift guard", "live support doc missing schema drift guard wording");
  assertContains(liveSupportDoc, expectedSummarySchema, "live support doc missing summary schema");
});

check("no-device success summary fixture preserves completed command state", () => {
  assert(successSummaryFixture.schema === expectedSummarySchema, "success summary schema mismatch");
  assert(successSummaryFixture.mode === "실장비 제외", "success summary mode mismatch");
  assert(successSummaryFixture.realDeviceEndpointSuccess === "미확인", "success summary real device status mismatch");
  assert(Number.isInteger(successSummaryFixture.total) && successSummaryFixture.total > 0, "success summary total must be positive integer");
  assert(successSummaryFixture.completed === successSummaryFixture.total, "success summary completed must equal total");
  assert(successSummaryFixture.failed === null, "success summary failed must be null");
  assert(Array.isArray(successSummaryFixture.results), "success summary results must be array");
  assert(successSummaryFixture.results.length === successSummaryFixture.total, "success summary results length must equal total");
  for (let index = 0; index < successSummaryFixture.results.length; index += 1) {
    const result = successSummaryFixture.results[index];
    assert(result.index === index + 1, `success summary result index mismatch at ${index}`);
    assert(typeof result.command === "string" && result.command.startsWith("./server.sh "), `success summary result command mismatch at ${index}`);
    assert(result.ok === true, `success summary result must be ok at ${index}`);
    assert(result.status === 0, `success summary result status must be 0 at ${index}`);
  }
  const commands = successSummaryFixture.results.map(result => result.command).join("\n");
  for (const required of [
    "./server.sh verify-onvif-no-device-mode",
    "./server.sh verify-onvif-probe-profile-variants",
    "./server.sh verify-onvif-synthetic-vendor-fixtures",
    "./server.sh verify-onvif-local-simulator",
    "./server.sh verify-onvif-auth-injection-loopback",
    "./server.sh verify-onvif-soap-fault-matrix",
    "./server.sh verify-onvif-field-smoke-gate",
    "./server.sh verify-onvif-no-device-completion",
    "./server.sh verify-onvif-closed-loopback-failure-matrix",
    "./server.sh verify-onvif-field-http-probe --endpoint http://127.0.0.1:9/onvif/device_service --expect-failure --credential-ref-present",
    "./server.sh verify-onvif-credential-reference-policy",
  ]) {
    assert(commands.includes(required), `success summary missing command: ${required}`);
  }
  assertNoForbiddenSummary(JSON.stringify(successSummaryFixture), "success summary fixture");
});

check("no-device failure summary fixture preserves failed command state", () => {
  assert(failureSummaryFixture.schema === expectedSummarySchema, "failure summary schema mismatch");
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
  assertNoForbiddenSummary(JSON.stringify(failureSummaryFixture), "failure summary fixture");
});

check("closed loopback failure matrix pins summary artifact redaction sentinels", () => {
  assert(closedLoopbackMatrix.schema === "media-server.onvif-closed-loopback-failure-matrix.v1", "closed loopback matrix schema mismatch");
  assert(Array.isArray(closedLoopbackMatrix.defaultForbiddenTerms), "closed loopback defaultForbiddenTerms missing");
  for (const term of [
    "credentialRef=",
    "token=",
    "secret-camera-token",
  ]) {
    assert(closedLoopbackMatrix.defaultForbiddenTerms.includes(term), `closed loopback matrix missing forbidden term ${term}`);
  }
  const scenarios = closedLoopbackMatrix.scenarios || [];
  const sentinel = scenarios.find(scenario => scenario.id === "closed-loopback-query-credential-sentinel");
  assert(sentinel, "closed loopback matrix missing query credential sentinel scenario");
  assert(String(sentinel.endpoint || "").includes("credentialRef=operator-entered-secret"), "query sentinel endpoint missing credentialRef sentinel");
  assert(String(sentinel.endpoint || "").includes("secret-camera-token"), "query sentinel endpoint missing token sentinel");
  for (const scenario of scenarios) {
    assert(Array.isArray(scenario.expectedArtifactTerms) && scenario.expectedArtifactTerms.length > 0, `${scenario.id}: expectedArtifactTerms missing`);
    assert(scenario.expectedArtifactTerms.includes("\"endpointRedacted\": true"), `${scenario.id}: endpointRedacted artifact assertion missing`);
    assert(scenario.expectedArtifactTerms.includes("\"streamUriRedacted\": true"), `${scenario.id}: streamUriRedacted artifact assertion missing`);
    assert(scenario.expectedArtifactTerms.includes("\"rawSoapIncluded\": false"), `${scenario.id}: rawSoapIncluded artifact assertion missing`);
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

function extractConstString(text, name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*"([^"]+)"`);
  const match = text.match(pattern);
  assert(match, `missing const string: ${name}`);
  return match[1];
}

function assertNoForbiddenSummary(serialized, label) {
  for (const forbidden of [
    "operator-entered-secret",
    "password",
    "Authorization",
    "raw SOAP",
    "certificate dump",
  ]) {
    assert(!serialized.includes(forbidden), `${label} leaked forbidden token: ${forbidden}`);
  }
}
