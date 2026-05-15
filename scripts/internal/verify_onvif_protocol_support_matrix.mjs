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
    "ONVIF Device service SOAP",
    "`http://` Device service endpoint",
    "`GetServices`",
    "ONVIF Media2 service SOAP",
    "`Media2.GetProfiles`",
    "`Media2.GetStreamUri`",
    "ONVIF Media service SOAP",
    "`Media.GetProfiles`",
    "`Media.GetStreamUri`",
    "`rtsp://` 또는 `rtsps://` GetStreamUri live 후보",
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
  ]) {
    assertContains(matrixDoc, term, `matrix missing unsupported scope term: ${term}`);
  }
});

check("related ONVIF docs link the protocol support matrix", () => {
  assertContains(liveSupportDoc, "./onvif-protocol-support-matrix.md", "live support doc missing matrix link");
  assertContains(noDeviceDoc, "./onvif-protocol-support-matrix.md", "no-device doc missing matrix link");
  assertContains(liveSupportDoc, "verify-onvif-protocol-support-matrix", "live support verification missing matrix command");
  assertContains(noDeviceDoc, "verify-onvif-protocol-support-matrix", "no-device verification missing matrix command");
});

check("implementation still matches documented probe transport and service scope", () => {
  for (const term of [
    "services_request.action = \"GetServices\"",
    "const std::vector<std::string> media_apis = {\"Media2\", \"Media\"}",
    "profiles_request.action = media_api + \".GetProfiles\"",
    "stream_request.action = media_api + \".GetStreamUri\"",
    "uri.rfind(\"rtsp://\", 0) == 0 || uri.rfind(\"rtsps://\", 0) == 0",
    "if (url->scheme != \"http\")",
    "only http transport is supported",
  ]) {
    assertContains(onvifCode, term, `implementation missing protocol term: ${term}`);
  }
});

check("TLS and credential policy docs keep unsupported auth/https scope explicit", () => {
  assertContains(tlsDoc, "HTTP SOAP transport만 포함", "TLS doc must state HTTP-only transport");
  assertContains(tlsDoc, "`https://` endpoint는 현재 transport 계층에서 fail-closed", "TLS doc must state HTTPS fail-closed");
  assertContains(credentialDoc, "ONVIF WS-Security UsernameToken 생성", "credential doc must keep WS-Security unsupported");
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
