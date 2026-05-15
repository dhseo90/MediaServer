#!/usr/bin/env node
// 파일 용도: ONVIF 비지원 protocol 안내 UX 문구와 문서 경계를 정적으로 검증한다.
// 동작 요약: /ops/sources ONVIF 입력 영역과 문서가 자동 검색/PTZ/Events/Profile G 비지원을 명확히 표시하는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF WS-Discovery UX verification

Usage:
  ./server.sh verify-onvif-ws-discovery-ux

Checks:
  - /ops/sources ONVIF 입력 영역이 WS-Discovery/PTZ/Events/Profile G 비지원을 명시함
  - 영어 UI 번역에도 같은 경계 문구가 있음
  - ONVIF 문서가 WS-Discovery/PTZ/Events/Profile G를 비지원으로 고정함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const serverHtml = readText("src/ingress/webrtc_http_server.cpp");
const translations = readText("src/ingress/product_ui_js.cpp");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const checks = [];

check("ops sources UI contains WS-Discovery unsupported wording", () => {
  assertContains(serverHtml, "WS-Discovery 자동 검색, PTZ 제어, ONVIF Events/PullPoint, Profile G/Recording/Replay는 제공하지 않습니다.", "Ops ONVIF hint missing Korean unsupported boundary");
  assertContains(serverHtml, "PTZ 제어", "Ops ONVIF hint missing Korean PTZ boundary");
  assertContains(serverHtml, "ONVIF Events/PullPoint", "Ops ONVIF hint missing Korean Events/PullPoint boundary");
  assertContains(serverHtml, "Profile G/Recording/Replay", "Ops ONVIF hint missing Korean Profile G boundary");
  assertContains(serverHtml, "운영자가 확인한 live URI 또는 probe fixture를 사용합니다.", "Ops ONVIF hint missing manual source wording");
});

check("English UI translation contains WS-Discovery unsupported wording", () => {
  assertContains(translations, "WS-Discovery auto discovery, PTZ control, ONVIF Events/PullPoint, and Profile G/Recording/Replay are not provided.", "translation missing unsupported boundary");
  assertContains(translations, "PTZ control", "translation missing PTZ boundary");
  assertContains(translations, "ONVIF Events/PullPoint", "translation missing Events/PullPoint boundary");
  assertContains(translations, "Profile G/Recording/Replay are not provided.", "translation missing Profile G boundary");
  assertContains(translations, "Use an operator-verified live URI or probe fixture.", "translation missing manual source wording");
});

check("ONVIF docs keep WS-Discovery outside supported scope", () => {
  assertContains(liveSupportDoc, "WS-Discovery 자동 검색", "live support doc missing WS-Discovery non-scope");
  assertContains(liveSupportDoc, "ONVIF Events/PullPoint subscription", "live support doc missing Events/PullPoint non-scope");
  assertContains(liveSupportDoc, "PTZ control", "live support doc missing PTZ non-scope");
  assertContains(liveSupportDoc, "ONVIF Profile G recording/replay", "live support doc missing Profile G non-scope");
  assertContains(matrixDoc, "ONVIF WS-Discovery", "protocol matrix missing WS-Discovery row");
  assertContains(matrixDoc, "ONVIF PTZ", "protocol matrix missing PTZ row");
  assertContains(matrixDoc, "ONVIF Events / PullPoint", "protocol matrix missing Events/PullPoint row");
  assertContains(matrixDoc, "ONVIF Profile G / Recording / Replay", "protocol matrix missing Profile G row");
  assertContains(matrixDoc, "비지원", "protocol matrix must mark WS-Discovery unsupported");
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
console.log("== ONVIF WS-Discovery UX summary ==");
console.log("- files: src/ingress/webrtc_http_server.cpp, src/ingress/product_ui_js.cpp");
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
