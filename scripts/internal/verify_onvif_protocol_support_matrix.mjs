#!/usr/bin/env node
// 파일 용도: ONVIF protocol 지원/비지원 matrix 문서와 구현 기준의 일치 여부를 정적으로 검증한다.
// 동작 요약: 지원 범위를 HTTP SOAP Device/Media/Media2 live source draft로 제한하고 비지원 protocol을 명시했는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

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
  - 구현은 HTTP SOAP Device/Media/Media2/GetStreamUri와 HTTPS fail-closed 기준을 유지함
  - credential injection, WS-Discovery, PTZ, Events, Recording/Replay를 지원으로 표현하지 않음
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
  for (const term of [
    "ONVIF Profile S/T live source 현장 연동",
    "제한 지원",
    "Profile S/T 전체 conformance",
    "ONVIF Device service SOAP",
    "v1.2.0 Profile S/T live source 제한 지원",
    "`http://` Device service endpoint",
    "`GetServices`",
    "ONVIF Media2 service SOAP",
    "`Media2.GetProfiles`",
    "`Media2.GetStreamUri`",
    "ONVIF Media service SOAP",
    "`Media.GetProfiles`",
    "`Media.GetStreamUri`",
    "`rtsp://` 또는 `rtsps://` GetStreamUri live 후보",
    "`rtsp://`/`rtsps://` URI를 기존 `kind=rtsp` source draft로 축약",
    "./onvif-rtsps-draft-policy.md",
    "verify-onvif-rtsps-draft-policy",
    "./onvif-https-soap-transport-design.md",
    "./onvif-https-tls-fixture-harness-design.md",
    "explicit TLS fixture harness",
    "scheme preflight gate",
    "verify-onvif-https-soap-transport-design",
    "./onvif-auth-injection-design.md",
    "./onvif-credential-store-integration-design.md",
    "verify-onvif-auth-injection-design",
    "./onvif-unsupported-api-guard.md",
    "수동 ONVIF stream URI 등록",
    "`rtsp://`, `rtsps://`, `http://`, `https://` live URI",
    "MediaServer RTSP/WHEP/WebRTC 출력",
  ]) {
    assertContains(matrixDoc, term, `matrix missing supported scope term: ${term}`);
  }
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
    "HTTP Digest/Basic auth 주입",
    "ONVIF Profile S/T 전체 conformance 지원",
  ]) {
    assertContains(matrixDoc, term, `matrix missing unsupported scope term: ${term}`);
  }
});

check("related ONVIF docs link the protocol support matrix", () => {
  assertContains(liveSupportDoc, "./onvif-protocol-support-matrix.md", "live support doc missing matrix link");
  assertContains(noDeviceDoc, "./onvif-protocol-support-matrix.md", "no-device doc missing matrix link");
  assertContains(liveSupportDoc, "verify-onvif-protocol-support-matrix", "live support verification missing matrix command");
  assertContains(noDeviceDoc, "verify-onvif-protocol-support-matrix", "no-device verification missing matrix command");
  assertContains(matrixDoc, "실제 ONVIF 카메라로 검증하지 않았고", "matrix doc missing no real camera statement");
  assertContains(matrixDoc, "공개 인터넷의 임의 ONVIF endpoint도 사용하지 않았습니다", "matrix doc missing public endpoint exclusion");
  assertContains(matrixDoc, "local simulator fixture 성공", "matrix doc missing simulator/real-device distinction");
  assertContains(liveSupportDoc, "실제 ONVIF 카메라 smoke를 수행하지 않았고", "live support doc missing no real camera statement");
  assertContains(noDeviceDoc, "실제 ONVIF 카메라를 사용한 field smoke를 수행하지 않았습니다", "no-device doc missing no real camera statement");
});

check("implementation still matches documented probe transport and service scope", () => {
  for (const term of [
    "services_request.action = \"GetServices\"",
    "const std::vector<std::string> media_apis = {\"Media2\", \"Media\"}",
    "profiles_request.action = media_api + \".GetProfiles\"",
    "stream_request.action = media_api + \".GetStreamUri\"",
    "bool IsRtspOrRtspsUri",
    "profile->transport = IsRtspOrRtspsUri(uri) ? \"RTSP\" : \"\"",
    "bool IsHttpSoapTransportScheme",
    "if (!IsHttpSoapTransportScheme(url->scheme))",
    "only http transport is supported",
  ]) {
    assertContains(onvifCode, term, `implementation missing protocol term: ${term}`);
  }
});

check("TLS and credential policy docs keep unsupported auth/https scope explicit", () => {
  assertContains(tlsDoc, "HTTP SOAP transport만 포함", "TLS doc must state HTTP-only transport");
  assertContains(tlsDoc, "`https://` endpoint는 현재 transport 계층의 scheme preflight gate에서 fail-closed", "TLS doc must state HTTPS fail-closed");
  assertContains(credentialDoc, "ONVIF WS-Security UsernameToken 생성", "credential doc must keep WS-Security unsupported");
  assertContains(credentialDoc, "./onvif-credential-store-integration-design.md", "credential doc must link credential store design");
  assertContains(credentialDoc, "HTTP Digest/Basic 인증 주입", "credential doc must keep HTTP auth injection unsupported");
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
