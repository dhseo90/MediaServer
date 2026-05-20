#!/usr/bin/env node
// 파일 용도: v1.6.0 ONVIF field smoke evidence reconciliation 경계를 정적으로 검증한다.
// 동작 요약: no-device suite, field smoke 미실행, redacted artifact review를 release evidence와 분리했는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 ONVIF field smoke evidence reconciliation verification

Usage:
  ./server.sh verify-v160-onvif-field-smoke-evidence-reconciliation [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P1-01 roadmap와 전용 문서가 no-device suite와 실장비 field smoke pass를 분리하는지 확인
  - release evidence dashboard, release policy, stream docs가 not-run/unverified 상태를 연결하는지 확인
  - ONVIF field smoke gate와 sample bundle guard가 redacted artifact review 기준을 유지하는지 확인
  - server.sh와 script inventory가 전용 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-onvif-field-smoke-evidence-reconciliation.md");
const backlog = readText("docs/development-backlog.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const onvifGate = readText("docs/onvif-field-smoke-gate.md");
const releasePolicy = readText("docs/release-policy.md");
const stream = readText("docs/stream-verification.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P1-01 ONVIF field smoke evidence reconciliation 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

check("dedicated doc separates no-device suite from real field smoke evidence", () => {
  for (const snippet of [
    "# v1.6.0 ONVIF Field Smoke Evidence Reconciliation",
    "V160-P1-01",
    "verify-onvif-no-device-suite",
    "실제 field smoke `PASS`",
    "gateDecision=not-run",
    "realDeviceTestPerformed=false",
    "realDeviceEndpointSuccess=unverified",
    "playbackStatus=skipped",
    "NOT RUN",
    "UNVERIFIED",
    "verify-v160-onvif-field-smoke-evidence-reconciliation",
  ]) {
    assertIncludes(doc, snippet, "v1.6 ONVIF field evidence doc");
  }
});

check("dedicated doc preserves redaction and non-retention boundary", () => {
  for (const snippet of [
    "endpoint URL",
    "source URL/URI/file",
    "RTSP/RTSPS stream URI",
    "username",
    "password",
    "token",
    "credential reference 실제 값",
    "auth/session material",
    "raw SOAP",
    "raw diagnostic JSON",
    "raw media",
    "raw frame",
    "crop",
    "embedding",
    "model path/checksum/provenance",
  ]) {
    assertIncludes(doc, snippet, "v1.6 ONVIF redaction boundary");
  }
  for (const forbidden of [
    "실장비 field smoke 성공 완료",
    "realDeviceEndpointSuccess=pass로 기록합니다",
    "persistent credential store 구현",
    "Profile G 구현",
  ]) {
    assert(!doc.includes(forbidden), `field evidence doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap defines V160-P1-01 scope and keeps later phase work out", () => {
  for (const snippet of [
    "V160-P1-01 ONVIF field smoke evidence reconciliation",
    "v1.6.0 ONVIF Field Smoke Evidence Reconciliation",
    "실제 field smoke `PASS`",
    "realDeviceEndpointSuccess=pass",
    "NOT RUN",
    "UNVERIFIED",
    "verify-v160-onvif-field-smoke-evidence-reconciliation",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P1-02~V160-P1-04",
    "P2 및 별도 Phase 후보",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P1-01 roadmap section");
  }
  for (const forbidden of [
    "V160-P1-02 완료",
    "V160-P1-03 완료",
    "V160-P1-04 완료",
    "V160-P2-01 완료",
    "실장비 field smoke 통과",
    "Digest 구현 완료",
    "Profile G 구현 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P1-01 must not overclaim: ${forbidden}`);
  }
});

check("release dashboard and policy connect ONVIF field evidence without pass overclaim", () => {
  for (const snippet of [
    "ONVIF field smoke evidence",
    "verify-v160-onvif-field-smoke-evidence-reconciliation",
    "미실행이면 `NOT RUN`",
    "V160-P1-01 ONVIF field smoke evidence reconciliation",
    "redacted artifact review",
  ]) {
    assertIncludes(dashboard, snippet, "v1.6 release evidence dashboard");
  }
  for (const snippet of [
    "v1.6.0 ONVIF Field Smoke Evidence Reconciliation",
    "verify-v160-onvif-field-smoke-evidence-reconciliation",
    "no-device suite",
    "실장비 미실행",
    "redacted artifact review",
  ]) {
    assertIncludes(releasePolicy, snippet, "release policy");
  }
});

check("ONVIF field smoke gate and docs expose the reconciliation command", () => {
  for (const [label, text] of [
    ["ONVIF field smoke gate", onvifGate],
    ["stream verification", stream],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.6.0-onvif-field-smoke-evidence-reconciliation.md", label);
    assertIncludes(text, "verify-v160-onvif-field-smoke-evidence-reconciliation", label);
  }
  for (const snippet of [
    "verify-onvif-field-smoke-gate",
    "verify-onvif-field-smoke-redaction",
    "verify-onvif-field-smoke-sample-bundle",
    "gateDecision=passed",
    "rawSoapIncluded=false",
    "plaintextSecretIncluded=false",
  ]) {
    assertIncludes(onvifGate, snippet, "ONVIF field smoke gate");
  }
});

check("server command and inventory expose V160-P1-01 verifier", () => {
  for (const snippet of [
    "verify-v160-onvif-field-smoke-evidence-reconciliation",
    "verify_v160_onvif_field_smoke_evidence_reconciliation.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_onvif_field_smoke_evidence_reconciliation.mjs", "script inventory");
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
console.log("== v1.6.0 ONVIF field smoke evidence reconciliation summary ==");
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
