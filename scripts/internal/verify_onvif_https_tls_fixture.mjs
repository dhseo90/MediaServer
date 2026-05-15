#!/usr/bin/env node
// 파일 용도: ONVIF HTTPS TLS fixture harness command skeleton의 설계 전용 skip 경계를 검증한다.
// 동작 요약: TLS server/client를 실행하지 않고 문서, no-device suite 연결, HTTPS fail-closed 상태를 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF HTTPS TLS fixture skeleton verification

Usage:
  ./server.sh verify-onvif-https-tls-fixture --expect-skip

Options:
  --expect-skip   현재 v1.2.0 command skeleton이 design-only skip임을 명시합니다.
  -h, --help      도움말 출력

Checks:
  - HTTPS TLS fixture harness 문서가 command skeleton을 design-only skip으로 설명함
  - no-device suite가 --expect-skip으로만 skeleton command를 실행함
  - 현재 ONVIF SOAP transport는 https endpoint를 계속 fail-closed 처리함
`);
}

assertKnownOptions(rawArgs, ["expect-skip", "h", "help"]);

const args = parseArgs(rawArgs);
assert(isTruthy(args.expectSkip), "--expect-skip is required while HTTPS TLS fixture harness is design-only");

const fixtureDoc = readText("docs/onvif-https-tls-fixture-harness-design.md");
const httpsDesignDoc = readText("docs/onvif-https-soap-transport-design.md");
const tlsPolicyDoc = readText("docs/onvif-tls-transport-policy.md");
const noDeviceDoc = readText("docs/onvif-no-device-verification.md");
const noDeviceSuite = readText("scripts/internal/verify_onvif_no_device_suite.mjs");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");

for (const term of [
  "./server.sh verify-onvif-https-tls-fixture --expect-skip",
  "command skeleton",
  "design-only skip",
  "fixture TLS server를 실행하지 않습니다",
  "TLS client library를 추가하지 않습니다",
  "trustedFixtureSuccess",
  "realDeviceEndpointSuccess",
  "미확인",
]) {
  assertContains(fixtureDoc, term, `TLS fixture harness doc missing skeleton term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture --expect-skip",
  "HTTPS 성공을 미확인",
]) {
  assertContains(httpsDesignDoc, term, `HTTPS SOAP design doc missing skeleton term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture --expect-skip",
  "trusted fixture success를 실행하지 않습니다",
]) {
  assertContains(tlsPolicyDoc, term, `TLS policy doc missing skeleton term: ${term}`);
}

for (const term of [
  "verify-onvif-https-tls-fixture --expect-skip",
  "fixture TLS server/client 실행 없음",
]) {
  assertContains(noDeviceDoc, term, `no-device doc missing skeleton term: ${term}`);
}

assertContains(noDeviceSuite, '["verify-onvif-https-tls-fixture", "--expect-skip"]', "no-device suite missing TLS fixture skeleton command");

for (const term of [
  "bool IsHttpSoapTransportScheme",
  "if (!IsHttpSoapTransportScheme(url->scheme))",
  "only http transport is supported",
]) {
  assertContains(onvifCode, term, `ONVIF SOAP transport missing fail-closed term: ${term}`);
}

for (const forbidden of [
  "SSL_connect",
  "TLS_client_method",
  "mbedtls_ssl_handshake",
  "fixture TLS server started",
]) {
  assert(!onvifCode.includes(forbidden), `current ONVIF transport unexpectedly includes TLS implementation term: ${forbidden}`);
}

console.log("[skip] ONVIF HTTPS TLS fixture harness is design-only; no TLS server/client executed");
console.log("");
console.log("== ONVIF HTTPS TLS fixture skeleton summary ==");
console.log("- mode: design-only skip");
console.log("- fixtureTlsServerExecuted: no");
console.log("- trustedFixtureSuccess: 미확인");
console.log("- realDeviceEndpointSuccess: 미확인");
console.log("- failures: 0");

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
