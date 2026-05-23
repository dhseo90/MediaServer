#!/usr/bin/env node
// 파일 용도: v1.8.0 ONVIF field smoke gate 절차와 sample artifact 기준을 정적으로 검증한다.
// 동작 요약: 실제 장비 성공을 개발 완료로 과장하지 않고 gate/report/redaction 상태를 분리했는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF field smoke gate verification

Usage:
  ./server.sh verify-onvif-field-smoke-gate [options]

Options:
  --doc <path>            Gate 절차 문서입니다. 기본 docs/onvif-field-smoke-gate.md.
  --backlog <path>        Roadmap 문서입니다. 기본 docs/development-backlog.md.
  --redaction-doc <path>  Redaction checklist 문서입니다. 기본 docs/onvif-field-smoke-artifact-redaction.md.
  --bundle-dir <path>     Sample bundle directory입니다. 기본 test/fixtures/onvif_field_smoke_artifact_sample.
  -h, --help              도움말 출력

Checks:
  - V180-current-P0-02가 별도 field smoke gate 절차와 verifier를 연결함
  - 실제 장비 성공과 release 개발 완료 상태를 분리함
  - sample bundle/report template이 gateDecision, playbackStatus, review status를 포함함
  - credential store, Digest/WS-Security, WS-Discovery, Profile G를 이 gate에서 열지 않음
`);
}

assertKnownOptions(rawArgs, ["doc", "backlog", "redaction-doc", "bundle-dir", "h", "help"]);

const args = parseArgs(rawArgs);
const gateSchema = "media-server.onvif-field-smoke-gate.v1";
const gateDocPath = resolveArgPath(args.doc, "docs/onvif-field-smoke-gate.md");
const backlogPath = resolveArgPath(args.backlog, "docs/development-backlog.md");
const redactionDocPath = resolveArgPath(args.redactionDoc, "docs/onvif-field-smoke-artifact-redaction.md");
const bundleDir = resolveArgPath(args.bundleDir, "test/fixtures/onvif_field_smoke_artifact_sample");

const gateDoc = readText(gateDocPath);
const backlog = readText(backlogPath);
const redactionDoc = readText(redactionDocPath);
const liveSupportDoc = readText(path.join(rootDir, "docs/onvif-live-source-support.md"));
const noDeviceDoc = readText(path.join(rootDir, "docs/onvif-no-device-verification.md"));
const suiteScript = readText(path.join(rootDir, "scripts/internal/verify_onvif_no_device_suite.mjs"));
const manifest = JSON.parse(readText(path.join(bundleDir, "manifest.json")));
const summary = JSON.parse(readText(path.join(bundleDir, "redacted_probe_summary.json")));
const checklist = readText(path.join(bundleDir, "redaction-checklist.md"));
const readme = readText(path.join(bundleDir, "README.md"));
const reportTemplate = readText(path.join(bundleDir, "field-smoke-report-template.md"));
const combinedSample = [
  JSON.stringify(manifest),
  JSON.stringify(summary),
  checklist,
  readme,
  reportTemplate,
].join("\n");

const checks = [];

check("gate document fixes V180-current-P0-02 procedure boundaries", () => {
  for (const term of [
    "# ONVIF Field Smoke Gate",
    "v1.8.0 `V180-current-P0-02 ONVIF field smoke gate`",
    "## Gate 원칙",
    "## Gate 상태",
    "## 실행 절차",
    "## 산출물 Review",
    "## 개발 종료 판정",
    "no-device suite만으로는 `passed`가 될 수 없습니다",
    "`releaseDevelopmentStatus` | `procedure-fixed`",
    "`gateDecision` | `not-run`, `blocked`, `failed`, `passed`",
    "`realDeviceEndpointSuccess` | `pass`, `fail`, `unverified`",
    "`playbackStatus` | `pass`, `fail`, `skipped`",
    "`redactionArtifactReview` | `pass`, `fail`",
    "`fieldSmokeReportReview` | `pass`, `fail`",
    "RTSP/RTSPS playback",
    "endpointRedacted=true",
    "streamUriRedacted=true",
    "rawSoapIncluded=false",
    "plaintextSecretIncluded=false",
    "credentialRef present, plaintext omitted",
    "verify-onvif-no-device-suite",
    "verify-onvif-field-smoke-gate",
    "verify-onvif-field-smoke-redaction",
    "verify-onvif-field-smoke-sample-bundle",
    "verify-onvif-field-http-probe --allow-missing-endpoint",
    "git diff --check",
  ]) {
    assertContains(gateDoc, term, `gate doc missing required term: ${term}`);
  }
});

check("gate document keeps unsupported ONVIF expansions out of scope", () => {
  for (const term of [
    "Digest",
    "WS-Security",
    "persistent credential store",
    "WS-Discovery",
    "Profile G",
    "구현하지 않습니다",
    "RTSP/WebRTC media path",
    "SourceRegistry/PublishedView payload schema",
    "client redaction 계약",
  ]) {
    assertContains(gateDoc, term, `gate doc missing boundary term: ${term}`);
  }
});

check("current docs link the fixed field smoke gate verifier", () => {
  const docsIndex = readText("docs/README.md");
  for (const term of [
    "ONVIF field smoke gate",
    "onvif-field-smoke-gate.md",
    "verify-onvif-field-smoke-gate",
  ]) {
    assertContains(docsIndex + gateDoc, term, `current docs missing gate term: ${term}`);
  }
  for (const term of [
    "release 개발 완료와 별도 field gate 결과를 분리",
    "실장비 endpoint 성공 미확인",
    "이 카테고리의 개발 가능한 후속 이슈는 없음",
  ]) {
    assertContains(backlog, term, `backlog missing gate term: ${term}`);
  }
});

check("redaction and live docs point at the gate procedure", () => {
  for (const [label, text] of [
    ["redaction doc", redactionDoc],
    ["live support doc", liveSupportDoc],
    ["no-device doc", noDeviceDoc],
  ]) {
    assertContains(text, "./onvif-field-smoke-gate.md", `${label} missing gate doc link`);
    assertContains(text, "verify-onvif-field-smoke-gate", `${label} missing gate verifier command`);
  }
  assertContains(redactionDoc, "gateDecision", "redaction doc missing gateDecision");
  assertContains(redactionDoc, "playbackStatus", "redaction doc missing playbackStatus");
  assertContains(redactionDoc, "redactionArtifactReview", "redaction doc missing redactionArtifactReview");
  assertContains(redactionDoc, "fieldSmokeReportReview", "redaction doc missing fieldSmokeReportReview");
});

check("sample bundle preserves gate decision fields", () => {
  assert(manifest.gate?.schema === gateSchema, "manifest gate schema mismatch");
  assert(manifest.gate?.releaseDevelopmentStatus === "procedure-fixed", "manifest releaseDevelopmentStatus mismatch");
  assert(manifest.gate?.gateDecision === "not-run", "manifest gateDecision must be not-run");
  assert(manifest.gate?.realDeviceEndpointSuccess === "unverified", "manifest real device status mismatch");
  assert(manifest.gate?.noDeviceSuiteCountsAsFieldSuccess === false, "manifest must reject no-device field success");
  assert(summary.gateDecision?.schema === gateSchema, "summary gate schema mismatch");
  assert(summary.gateDecision?.releaseDevelopmentStatus === "procedure-fixed", "summary releaseDevelopmentStatus mismatch");
  assert(summary.gateDecision?.gateDecision === "not-run", "summary gateDecision must be not-run");
  assert(summary.gateDecision?.realDeviceEndpointSuccess === "unverified", "summary real device status mismatch");
  assert(summary.gateDecision?.playbackStatus === "skipped", "summary playbackStatus must be skipped");
  assert(summary.gateDecision?.redactionArtifactReview === "pass", "summary redactionArtifactReview must be pass");
  assert(summary.gateDecision?.fieldSmokeReportReview === "pass", "summary fieldSmokeReportReview must be pass");
  assert(summary.gateDecision?.endpointRedacted === true, "summary endpointRedacted must be true");
  assert(summary.gateDecision?.streamUriRedacted === true, "summary streamUriRedacted must be true");
  assert(summary.gateDecision?.rawSoapIncluded === false, "summary rawSoapIncluded must be false");
  assert(summary.gateDecision?.noDeviceSuiteCountsAsFieldSuccess === false, "summary must reject no-device field success");
  assert(manifest.requiredVerification?.includes("verify-onvif-field-smoke-gate"), "manifest missing gate verifier");
  assert(summary.verificationStatus?.some(item => item?.command === "verify-onvif-field-smoke-gate"), "summary missing gate verifier status");
});

check("sample report/checklist include gate review status", () => {
  for (const term of [
    "Gate Decision",
    "releaseDevelopmentStatus",
    "gateDecision",
    "playbackStatus",
    "redactionArtifactReview",
    "fieldSmokeReportReview",
    gateSchema,
    "noDeviceSuiteCountsAsFieldSuccess=false",
  ]) {
    assertContains(combinedSample, term, `sample bundle missing gate report term: ${term}`);
  }
  for (const forbidden of [
    "operator-entered-secret",
    "192.0.2.",
    "rtsp://",
    "rtsps://",
    "Authorization:",
    "Cookie:",
    "<s:Envelope",
    "raw diagnostic JSON:",
  ]) {
    assert(!combinedSample.includes(forbidden), `sample bundle leaked forbidden literal: ${forbidden}`);
  }
});

check("no-device suite includes the gate verifier without claiming real device success", () => {
  assertContains(suiteScript, "verify-onvif-field-smoke-gate", "suite missing gate verifier");
  assertContains(noDeviceDoc, "no-device suite 통과는 field smoke gate pass가 아닙니다", "no-device doc missing field gate caveat");
  assertContains(liveSupportDoc, "field smoke gate 결과와 분리합니다", "live support doc missing field gate separation wording");
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
console.log("== ONVIF field smoke gate summary ==");
console.log(`- doc: ${path.relative(rootDir, gateDocPath)}`);
console.log("- releaseDevelopmentStatus: procedure-fixed");
console.log("- realDeviceEndpointSuccess: unverified unless field gate report proves pass");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
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

function resolveArgPath(value, fallback) {
  return path.resolve(rootDir, value || fallback);
}

function readText(filePath) {
  assert(fs.existsSync(filePath), `missing file: ${path.relative(rootDir, filePath)}`);
  return fs.readFileSync(filePath, "utf8");
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
