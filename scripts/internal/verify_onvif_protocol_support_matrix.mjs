#!/usr/bin/env node
// 파일 용도: ONVIF protocol 지원/비지원 matrix 문서와 구현 기준의 일치 여부를 정적으로 검증한다.
// 동작 요약: 지원 범위를 HTTP/HTTPS SOAP Device/Media/Media2 live source draft로 제한하고 비지원 protocol을 명시했는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink, validateOnvifSupportMatrixDocumentation } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF protocol support matrix verification

Usage:
  ./server.sh verify-onvif-protocol-support-matrix

Checks:
  - docs/onvif-protocol-support-matrix.md가 지원/비지원 protocol matrix를 포함함
  - live support/no-device 문서가 protocol matrix를 참조함
  - 구현은 HTTP/HTTPS SOAP Device/Media/Media2/GetStreamUri 기준을 유지함
  - Basic provider 조건과 WS-Discovery/PTZ/Events/Recording/Replay 비지원 경계를 구분함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const noDeviceDoc = readText("docs/onvif-no-device-verification.md");
const credentialDoc = readText("docs/onvif-credential-reference-policy.md");
const tlsDoc = readText("docs/onvif-tls-transport-policy.md");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");
const checks = [];

check("protocol support matrix names supported ONVIF live-source scope", () => {
  const errors = validateOnvifSupportMatrixDocumentation(matrixDoc);
  assert(errors.length === 0, errors.join("; "));
});

check("protocol support matrix names unsupported ONVIF protocols", () => {
  for (const term of [
    "ONVIF WS-Discovery",
    "ONVIF PTZ",
    "ONVIF Events / PullPoint",
    "ONVIF Profile G / Recording / Replay",
    "ONVIF Analytics service",
    "ONVIF Imaging service",
    "ONVIF Device management",
    "WS-Security UsernameToken",
    "HTTP Digest auth 주입",
    "Profile S/T 전체 conformance",
  ]) {
    assertContains(matrixDoc, term, `matrix missing unsupported scope term: ${term}`);
  }
});

check("related ONVIF docs link the protocol support matrix", () => {
  assert(hasDocumentLink(liveSupportDoc, "onvif-protocol-support-matrix.md"), "live support doc missing matrix link");
  assert(hasDocumentLink(noDeviceDoc, "onvif-protocol-support-matrix.md"), "no-device doc missing matrix link");
  assertContains(noDeviceDoc, "verify-onvif-protocol-support-matrix", "no-device verification missing matrix command");
  for (const doc of [matrixDoc, liveSupportDoc, noDeviceDoc]) {
    assertContains(doc, "미확인", "ONVIF documentation missing unverified field boundary");
    assertContains(doc, "fixture", "ONVIF documentation missing fixture boundary");
  }
});

check("implementation matches documented probe transport scope", () => {
  for (const term of [
    "services_request.action = \"GetServices\"",
    "const std::vector<std::string> media_apis = {\"Media2\", \"Media\"}",
    "profiles_request.action = media_api + \".GetProfiles\"",
    "stream_request.action = media_api + \".GetStreamUri\"",
    "bool IsRtspOrRtspsUri",
    "profile->transport = IsRtspOrRtspsUri(uri) ? \"RTSP\" : \"\"",
    "bool IsHttpSoapTransportScheme",
    "if (!IsHttpSoapTransportScheme(url->scheme))",
    "scheme == \"http\" || scheme == \"https\"",
    "SSL_connect",
    "SSL_set1_host",
    "https transport requires OpenSSL support",
  ]) {
    assertContains(onvifCode, term, `implementation missing protocol term: ${term}`);
  }
});

check("TLS policy doc keeps HTTPS scope explicit", () => {
  assertContains(tlsDoc, "HTTP SOAP transport와 OpenSSL 기반 HTTPS SOAP fixture transport를 포함", "TLS doc must state HTTPS transport scope");
  assertContains(tlsDoc, "`https://` endpoint는 OpenSSL 빌드에서 TCP connect", "TLS doc must state HTTPS OpenSSL transport");
  assertContains(tlsDoc, "OpenSSL이 없는 빌드는 `https transport requires OpenSSL support`로 fail-closed", "TLS doc must keep OpenSSL fallback explicit");
});

check("credential policy doc keeps auth scope explicit", () => {
  assertContains(credentialDoc, "ONVIF WS-Security UsernameToken 생성", "credential doc must keep WS-Security unsupported");
  assertContains(credentialDoc, "./onvif-credential-store-integration-design.md", "credential doc must link credential store design");
  assertContains(credentialDoc, "HTTP Digest 인증 주입", "credential doc must keep Digest auth unsupported");
  assertContains(credentialDoc, "`credential_ready`와 `http_basic` material", "credential doc must state Basic provider scope");
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
console.log("== ONVIF protocol support matrix summary ==");
console.log("- doc: docs/onvif-protocol-support-matrix.md");
console.log(`- failures: ${failures}`);
console.log("- scope: static documentation/source contract; actual device and UI not-run");
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
