#!/usr/bin/env node
// 파일 용도: v1.6.0 client/ops debug exposure regression guard가 sensitive material 비노출을 고정하는지 검증한다.
// 동작 요약: client forbidden matrix, redaction 문서, roadmap, server entrypoint 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 debug exposure regression guard verification

Usage:
  ./server.sh verify-v160-debug-exposure-regression-guard [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P0-03 문서가 source/debug/rule/model/auth material 비노출 범위를 고정하는지 확인
  - verify-ops-client-ui client forbidden text/key matrix가 model/source/auth material을 포함하는지 확인
  - shared Ops audit redaction helper가 source/model/raw/auth material masking 기준을 유지하는지 확인
  - stream/UI docs, server.sh, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const guardDoc = readText("docs/v1.6.0-debug-exposure-regression-guard.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const uiGuide = readText("docs/ui-guide.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const opsClientSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const sharedUi = readText("src/ingress/product_ui_js.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P0-03 Client/Ops debug exposure regression guard 정리 기준",
  "### v1.6.0 비범위"
);

const forbiddenSurfaceTokens = [
  "sourceUrl",
  "sourceUri",
  "rtspUrl",
  "httpUrl",
  "whepUrl",
  "storagePath",
  "debugCounters",
  "debugSummary",
  "analysisTapId",
  "modelPath",
  "modelSha256",
  "modelChecksum",
  "modelProvenance",
  "modelUrl",
  "crop",
  "embedding",
  "appearanceCrop",
  "appearanceEmbedding",
  "passwordHash",
  "passwordHistory",
  "tokenHash",
  "sessionToken",
  "credentialRef",
  "capability",
];

const checks = [];

check("guard doc defines source, debug, rule, model, and auth exposure boundaries", () => {
  for (const snippet of [
    "# v1.6.0 Client/Ops Debug Exposure Regression Guard",
    "Source material",
    "Debug material",
    "Rule/Profile material",
    "Model/identity material",
    "Auth/session material",
    "viewer/client 화면",
    "client scoped API",
    "removed UI route",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(guardDoc, snippet, "debug exposure guard doc");
  }
});

check("ops-client UI smoke forbidden matrices include sensitive client material", () => {
  for (const snippet of [
    "function clientForbiddenText()",
    "function clientForbiddenJsonKeys()",
    "assertJsonKeysOmitted",
    "assertClientApiContract",
    "runClientRenderedLeakSmoke",
  ]) {
    assertIncludes(opsClientSmoke, snippet, "verify-ops-client-ui smoke");
  }
  for (const token of forbiddenSurfaceTokens) {
    assertIncludes(opsClientSmoke, `"${token}"`, `client forbidden matrix token ${token}`);
  }
});

check("shared Ops UI redaction helpers still mask source/model/raw/auth material", () => {
  for (const snippet of [
    "auditMaterialKeys",
    "auditMaterialKeyNeedles",
    "auditKeyRedacted",
    "auditMaterialValueRedacted",
    "modelpath",
    "modelsha256",
    "modelprovenance",
    "sourceurl",
    "streamuri",
    "appearanceembedding",
    "appearancecrop",
    "credential",
    "token",
  ]) {
    assertIncludes(sharedUi.toLowerCase(), snippet.toLowerCase(), "shared UI redaction helper");
  }
});

check("roadmap defines V160-P0-03 scope and follow-up classification", () => {
  for (const snippet of [
    "V160-P0-03 Client/Ops debug exposure regression guard",
    "v1.6.0 Client/Ops Debug Exposure Regression Guard",
    "verify-ops-client-ui",
    "modelPath",
    "modelSha256",
    "appearanceEmbedding",
    "credentialRef",
    "verify-v160-debug-exposure-regression-guard",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V160-P0-03 roadmap section");
  }
});

check("roadmap keeps P0-04, P1/P2, schema, and media path outside P0-03", () => {
  for (const snippet of [
    "V160-P0-04 Tracker/Re-ID opt-in stabilization close-out",
    "V160-P1-02 Audit/export masking regression hardening",
    "V160-P1-01",
    "V160-P2-01~V160-P2-02",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P0-03 out-of-scope section");
  }
  for (const forbidden of [
    "V160-P0-04 완료",
    "audit/export hardening 완료",
    "metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
    "client debug 화면 추가 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P0-03 must not overclaim: ${forbidden}`);
  }
});

check("docs and entrypoints link the debug exposure verifier", () => {
  for (const [label, text] of [
    ["stream verification", stream],
    ["UI guide", uiGuide],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.6.0-debug-exposure-regression-guard.md", label);
    assertIncludes(text, "verify-v160-debug-exposure-regression-guard", label);
  }
  for (const snippet of [
    "verify-v160-debug-exposure-regression-guard",
    "verify_v160_debug_exposure_regression_guard.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_debug_exposure_regression_guard.mjs", "script inventory");
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
console.log("== v1.6.0 debug exposure regression guard summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope unclassified P0/P1 follow-ups: 0");
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing required wording: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractSection(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}
