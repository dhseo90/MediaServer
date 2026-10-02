#!/usr/bin/env node
// 파일 용도: ONVIF HTTPS SOAP transport 구현과 TLS/redaction 설계 기준을 검증한다.
// 동작 요약: OpenSSL 기반 HTTPS fixture 성공, fallback 경계, 실장비 미확인 보고 기준이 문서/코드에 반영됐는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

import { validateOnvifTlsDocumentation, hasDocumentLink } from "./documentation_contract_lib.mjs";

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

for (const [document, kind] of [[designDoc, "transport"], [fixtureHarnessDoc, "fixture"], [tlsDoc, "policy"]]) {
  check("HTTPS current " + kind + " contract linkage", () => {
    const errors = validateOnvifTlsDocumentation(document, kind);
    assert(errors.length === 0, errors.join("; "));
  });
}

check("protocol matrix links HTTPS SOAP design", () => {
  assert(hasDocumentLink(matrixDoc, "onvif-https-soap-transport-design.md"), "protocol matrix missing HTTPS design link");
  assert(hasDocumentLink(matrixDoc, "onvif-https-tls-fixture-harness-design.md"), "protocol matrix missing fixture harness link");
  assertContains(matrixDoc, "OpenSSL 빌드 제한 지원", "protocol matrix missing OpenSSL HTTPS status");
  assertContains(matrixDoc, "verify-onvif-https-soap-transport-design", "protocol matrix missing HTTPS design verification");
});

check("implementation supports HTTPS fixture transport", () => {
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
});

check("HTTP transport smoke covers HTTPS sanitized failures", () => {
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
console.log("- scope: static documentation/source contract; actual TLS not-run");
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
