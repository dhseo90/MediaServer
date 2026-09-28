#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 검증 모드의 문서/명령/옵션 기준을 정적으로 확인한다.
// 동작 요약: 실장비 성공을 미확인으로 남기고 synthetic fixture, loopback, redaction 검증만 no-device 범위에 둔다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink, validateOnvifNoDeviceDocumentation } from "./documentation_contract_lib.mjs";

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

check("no-device current definition preserves commands, output and field-device exclusion", () => {
  const errors = validateOnvifNoDeviceDocumentation(noDeviceDoc);
  assert(errors.length === 0, errors.join("; "));
});

check("live support document links no-device mode without claiming field success", () => {
  assert(hasDocumentLink(liveSupportDoc, "onvif-no-device-verification.md"), "live support doc does not link no-device doc");
  assert(hasDocumentLink(liveSupportDoc, "onvif-field-smoke-gate.md"), "live support doc does not link field gate");
  assertContains(liveSupportDoc, "미확인", "live support doc missing unverified field boundary");
  // 명령·옵션·summary·실패 전파는 위/아래 검사에서 현행 no-device 정의와 실제 runner/fixture를 대조한다.
  // 운영 안내에 같은 실행 목록을 다시 복제하도록 요구하지 않는다.
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
  assertContains(noDeviceDoc, runnerSchema, "no-device doc schema mismatch");
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

check("field HTTP probe harness retains no-device options", () => {
  for (const token of [
    "allow-missing-endpoint",
    "expect-failure",
    "credential-ref-present",
  ]) {
    assertContains(fieldProbeScript, token, `field HTTP probe script missing ${token}`);
  }
});

check("field HTTP probe harness retains credential redaction", () => {
  for (const token of [
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
console.log("- evidence: 문서·runner·정의 fixture 정적 검사; actual suite not-run");
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
