#!/usr/bin/env node
// 파일 용도: ONVIF rtsps:// probe candidate와 automatic draft 저장 계약 분리 기준을 검증한다.
// 동작 요약: parser, draft API, 수동 Ops 등록의 rtsps 처리 범위가 문서와 구현에서 분리되어 있는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF RTSPS draft policy verification

Usage:
  ./server.sh verify-onvif-rtsps-draft-policy

Checks:
  - docs/onvif-rtsps-draft-policy.md가 parser candidate, automatic draft, manual URI 등록을 분리함
  - ONVIF parser는 rtsps:// GetStreamUri 후보를 live RTSP candidate로 인식함
  - automatic import draft API는 현재 rtsp:// source draft만 통과시키는 정책을 유지함
  - Ops 수동 ONVIF stream URI 입력은 rtsps://를 기존 rtsp source로 저장함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const policyDoc = readText("docs/onvif-rtsps-draft-policy.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");
const uiCode = readText("src/ingress/product_ui_page_scripts.cpp");
const checks = [];

check("RTSPS policy document separates candidate, draft, and manual registration", () => {
  for (const term of [
    "automatic probe candidate",
    "automatic import draft",
    "manual source registration",
    "parser/probe candidate",
    "Automatic import draft API fixture contract",
    "보류",
    "`/ops/sources` manual ONVIF stream URI registration",
    "`rtsps://` source draft 자동 저장 성공을 완료로 보고하지 않습니다",
    "no-device 환경에서는 둘 다 미확인",
  ]) {
    assertContains(policyDoc, term, `policy doc missing term: ${term}`);
  }
});

check("protocol and live support docs link RTSPS policy", () => {
  assertContains(matrixDoc, "./onvif-rtsps-draft-policy.md", "protocol matrix missing RTSPS policy link");
  assertContains(liveSupportDoc, "./onvif-rtsps-draft-policy.md", "live support doc missing RTSPS policy link");
  assertContains(liveSupportDoc, "verify-onvif-rtsps-draft-policy", "live support verification missing RTSPS policy command");
});

check("implementation keeps rtsps parser candidate but rtsp-only automatic draft", () => {
  assertContains(onvifCode, "uri.rfind(\"rtsp://\", 0) == 0 || uri.rfind(\"rtsps://\", 0) == 0", "parser must keep rtsps candidate recognition");
  assertContains(onvifCode, "transport != \"RTSP\" || stream_uri.rfind(\"rtsp://\", 0) != 0", "automatic draft must remain rtsp:// only");
});

check("manual Ops ONVIF URI registration still accepts rtsps as rtsp source", () => {
  assertContains(uiCode, "lower.startsWith('rtsp://') || lower.startsWith('rtsps://')", "Ops manual URI parser must accept rtsps");
  assertContains(uiCode, "return { kind: 'rtsp', rtspUrl: uri }", "Ops manual rtsps registration must map to rtsp source");
  assertContains(uiCode, "ONVIF 스트림 URI는 rtsp://, rtsps://, http://, https://", "Ops validation must mention rtsps");
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
console.log("== ONVIF RTSPS draft policy summary ==");
console.log("- doc: docs/onvif-rtsps-draft-policy.md");
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
