#!/usr/bin/env node
// 파일 용도: ONVIF 비지원 protocol이 제품 API/UI route로 열리지 않았는지 정적으로 검증한다.
// 동작 요약: import-draft만 허용하고 PTZ/Events/Profile G/Recording/Replay route가 없는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF unsupported API guard verification

Usage:
  ./server.sh verify-onvif-unsupported-api-guard

Checks:
  - docs/onvif-unsupported-api-guard.md가 허용/비허용 ONVIF API 경계를 명시함
  - protocol matrix/live support 문서가 unsupported guard를 참조함
  - 제품 서버 코드에는 PTZ/Events/PullPoint/Recording/Replay ONVIF API route가 없음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const guardDoc = readText("docs/onvif-unsupported-api-guard.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const serverCode = readText("src/ingress/webrtc_http_server.cpp");
const checks = [];

check("unsupported API guard document pins allowed and blocked ONVIF routes", () => {
  assertContains(guardDoc, "POST /ops/api/onvif/import-draft", "guard doc missing allowed import draft route");
  for (const term of [
    "/ops/api/onvif/discover",
    "/ops/api/onvif/ptz",
    "/ops/api/onvif/events",
    "/ops/api/onvif/pullpoint",
    "/ops/api/onvif/recording",
    "/ops/api/onvif/replay",
    "/ops/api/onvif/analytics",
    "/ops/api/onvif/imaging",
    "/ops/api/onvif/device-management",
  ]) {
    assertContains(guardDoc, term, `guard doc missing blocked route: ${term}`);
  }
});

check("unsupported API guard document lists non-supported ONVIF protocols", () => {
  for (const term of [
    "WS-Discovery 자동 검색",
    "PTZ pan/tilt/zoom",
    "ONVIF Events subscription",
    "PullPoint",
    "Profile G",
    "Recording",
    "Replay",
    "camera-side Analytics service",
    "Imaging service",
    "Device management",
  ]) {
    assertContains(guardDoc, term, `guard doc missing unsupported protocol: ${term}`);
  }
});

check("related docs link unsupported API guard", () => {
  assertContains(matrixDoc, "./onvif-unsupported-api-guard.md", "protocol matrix missing unsupported API guard link");
  assertContains(liveSupportDoc, "./onvif-unsupported-api-guard.md", "live support doc missing unsupported API guard link");
  assertContains(liveSupportDoc, "verify-onvif-unsupported-api-guard", "live support verification missing unsupported API guard command");
});

check("product server only exposes ONVIF import draft route", () => {
  assertContains(serverCode, "/ops/api/onvif/import-draft", "server must keep existing import draft route");
  for (const forbidden of [
    "/ops/api/onvif/discover",
    "/ops/api/onvif/ptz",
    "/ops/api/onvif/events",
    "/ops/api/onvif/pullpoint",
    "/ops/api/onvif/recording",
    "/ops/api/onvif/replay",
    "/ops/api/onvif/analytics",
    "/ops/api/onvif/imaging",
    "/ops/api/onvif/device-management",
  ]) {
    assert(!serverCode.includes(forbidden), `server unexpectedly exposes unsupported ONVIF route: ${forbidden}`);
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
console.log("== ONVIF unsupported API guard summary ==");
console.log("- doc: docs/onvif-unsupported-api-guard.md");
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
