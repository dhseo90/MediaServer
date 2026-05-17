#!/usr/bin/env node
// 파일 용도: ONVIF HTTPS SOAP transport 구현과 TLS/redaction 설계 기준을 검증한다.
// 동작 요약: OpenSSL 기반 HTTPS fixture 성공, fallback 경계, 실장비 미확인 보고 기준이 문서/코드에 반영됐는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF HTTPS SOAP transport design verification

Usage:
  ./server.sh verify-onvif-https-soap-transport-design

Checks:
  - docs/onvif-https-soap-transport-design.md가 현재 HTTPS OpenSSL 구현 기준을 명시함
  - docs/onvif-https-tls-fixture-harness-design.md가 no-device TLS fixture harness 설계를 명시함
  - TLS trust store, hostname verification, redaction, no downgrade 조건을 문서화함
  - TLS/protocol 문서가 HTTPS design 문서를 참조함
  - 구현은 OpenSSL 빌드에서 HTTPS fixture transport를 지원하고 URL userinfo를 거부함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const designDoc = readText("docs/onvif-https-soap-transport-design.md");
const fixtureHarnessDoc = readText("docs/onvif-https-tls-fixture-harness-design.md");
const tlsDoc = readText("docs/onvif-tls-transport-policy.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");
const httpTransportSmoke = readText("scripts/internal/onvif_http_transport_smoke.cpp");
const checks = [];

check("HTTPS SOAP design keeps current implementation status explicit", () => {
  for (const term of [
    "OpenSSL을 사용할 수 있는 빌드에서 HTTPS SOAP fixture transport를 지원",
    "`https://` ONVIF Device service endpoint는 OpenSSL 빌드에서 TLS handshake",
    "certificate verification",
    "hostname verification",
    "MEDIA_SERVER_ONVIF_TLS_CA_FILE",
    "https transport requires OpenSSL support",
    "endpoint URL username/password/token은 `invalid endpoint URL`로 거부",
    "`https://`를 `http://`로 자동 downgrade하지 않습니다",
    "fixture-only HTTPS 성공",
    "production `SendOnvifSoapHttp`의 HTTPS fixture",
    "untrusted CA failure",
    "hostname mismatch failure",
    "connection refused",
    "실장비 HTTPS endpoint 성공은 별도 field smoke 전까지 미확인",
    "verify-onvif-https-tls-fixture",
    "verify-onvif-http-transport",
    "## 구현 결과",
  ]) {
    assertContains(designDoc, term, `design doc missing current status term: ${term}`);
  }
});

check("HTTPS SOAP design documents TLS requirements", () => {
  for (const term of [
    "TLS trust store 선택 기준",
    "hostname verification은 기본 활성화",
    "certificate verification failure",
    "HTTP downgrade fallback을 자동 수행하지 않습니다",
    "endpoint URL username/password/token은 계속 금지",
    "secret 원문은 header, log, artifact",
    "handshake failure",
    "certificate failure",
    "redaction matrix에 유지",
    "insecure TLS opt-in",
    "self-signed certificate 무조건 허용",
  ]) {
    assertContains(designDoc, term, `design doc missing TLS requirement: ${term}`);
  }
});

check("HTTPS TLS fixture harness design is documented as fixture-only no-device scope", () => {
  for (const term of [
    "# ONVIF HTTPS TLS Fixture Harness Design",
    "v1.2.0에서 도입된 현재 상태는 fixture-only",
    "trustedFixtureSuccess",
    "ephemeral CA",
    "server private key는 repository와 artifact에 저장하지 않습니다",
    "fixture CA bundle",
    "hostname verification",
    "trusted fixture success",
    "untrusted CA failure",
    "hostname mismatch failure",
    "certificate expired failure",
    "handshake failure",
    "connection refused",
    "HTTP downgrade fallback은 수행하지 않습니다",
    "media-server.onvif-https-tls-fixture-summary.v1",
    "realDeviceEndpointSuccess",
  ]) {
    assertContains(fixtureHarnessDoc, term, `TLS fixture harness doc missing term: ${term}`);
  }
});

check("TLS policy and protocol matrix link HTTPS SOAP design", () => {
  assertContains(tlsDoc, "./onvif-https-soap-transport-design.md", "TLS policy missing HTTPS design link");
  assertContains(tlsDoc, "./onvif-https-tls-fixture-harness-design.md", "TLS policy missing fixture harness link");
  assertContains(tlsDoc, "OpenSSL 기반 HTTPS SOAP fixture transport", "TLS policy missing OpenSSL HTTPS wording");
  assertContains(matrixDoc, "./onvif-https-soap-transport-design.md", "protocol matrix missing HTTPS design link");
  assertContains(matrixDoc, "./onvif-https-tls-fixture-harness-design.md", "protocol matrix missing fixture harness link");
  assertContains(matrixDoc, "OpenSSL 빌드 제한 지원", "protocol matrix missing OpenSSL HTTPS status");
  assertContains(matrixDoc, "verify-onvif-https-soap-transport-design", "protocol matrix missing HTTPS design verification");
});

check("implementation supports HTTPS fixture transport and sanitized fallback", () => {
  for (const term of [
    "bool IsHttpSoapTransportScheme",
    "scheme == \"http\" || scheme == \"https\"",
    "MEDIA_SERVER_ONVIF_TLS_CA_FILE",
    "SSL_connect",
    "SSL_set1_host",
    "TLS certificate verification failed",
    "https transport requires OpenSSL support",
    "invalid endpoint URL",
  ]) {
    assertContains(onvifCode, term, `implementation missing HTTPS transport term: ${term}`);
  }
  for (const term of [
    "RunHttpsTransportSmoke",
    "RunHttpsTransportFailureMatrix",
    "https://localhost:",
    "HTTPS untrusted CA failure",
    "HTTPS hostname mismatch failure",
    "HTTPS handshake failure",
    "HTTPS connection refused",
    "HTTPS transport must reject URL userinfo",
    "invalid endpoint URL",
    "transport error leaked URL userinfo",
    "transport error leaked URL password",
  ]) {
    assertContains(httpTransportSmoke, term, `HTTP transport smoke missing HTTPS transport term: ${term}`);
  }
});

let failures = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== ONVIF HTTPS SOAP transport design summary ==");
console.log("- doc: docs/onvif-https-soap-transport-design.md");
console.log("- fixtureHarnessDoc: docs/onvif-https-tls-fixture-harness-design.md");
console.log(`- failures: ${failures}`);
if (failures > 0) process.exit(1);

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
