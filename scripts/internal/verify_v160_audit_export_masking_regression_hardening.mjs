#!/usr/bin/env node
// 파일 용도: v1.6.0 audit/export masking regression hardening 경계를 정적으로 검증한다.
// 동작 요약: Ops audit 조회와 JSON/CSV/Diff JSON export가 source/model/auth/raw material을 계속 마스킹하는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 audit/export masking regression hardening verification

Usage:
  ./server.sh verify-v160-audit-export-masking-regression-hardening [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P1-02 roadmap와 전용 문서가 audit 조회/export masking 범위를 고정하는지 확인
  - 서버 audit redaction helper가 source/model/auth/raw material key/value masking을 유지하는지 확인
  - Ops UI review chip은 status-only 정보를 표시하고 원문 material을 렌더링하지 않는지 확인
  - v1.5.0 audit export fixture, release docs, server.sh, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-audit-export-masking-regression-hardening.md");
const backlog = readText("docs/development-backlog.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const uiGuide = readText("docs/ui-guide.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const docsRootIndex = readText("docs/README.md");
const serverSource = readText("src/ingress/webrtc_http_server.cpp");
const sharedUi = readText("src/ingress/product_ui_js.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const fixture = JSON.parse(readText("test/fixtures/v150_audit_export_review_hardening.json"));
const section = extractSection(
  backlog,
  "### V160-P1-02 Audit/export masking regression hardening 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

check("dedicated doc defines audit query and export masking scope", () => {
  for (const snippet of [
    "# v1.6.0 Audit Export Masking Regression Hardening",
    "V160-P1-02",
    "/ops/api/audit",
    "JSON/CSV/Diff JSON export",
    "RedactAuditJsonFragment",
    "source URL/URI/file",
    "model path/checksum/provenance",
    "password/token/hash/secret",
    "credential/capability material",
    "verify-v160-audit-export-masking-regression-hardening",
  ]) {
    assertIncludes(doc, snippet, "v1.6 audit/export doc");
  }
});

check("roadmap defines V160-P1-02 scope and keeps later phase work out", () => {
  for (const snippet of [
    "V160-P1-02 Audit/export masking regression hardening",
    "v1.6.0 Audit Export Masking Regression Hardening",
    "JSON/CSV/Diff JSON export",
    "AuditSensitiveKey",
    "AuditSensitiveStringValue",
    "password/token/hash/secret/credential/capability",
    "verify-v160-audit-export-masking-regression-hardening",
    "verify-v150-audit-export-review-hardening",
    "verify-ops-audit-trail",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P1-03~V160-P1-04",
    "P2 및 별도 Phase 후보",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P1-02 roadmap section");
  }
  for (const forbidden of [
    "V160-P1-03 완료",
    "V160-P1-04 완료",
    "V160-P2-01 완료",
    "client/viewer audit export 기능 추가 완료",
    "metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P1-02 must not overclaim: ${forbidden}`);
  }
});

check("server audit export redacts model source auth and raw material", () => {
  for (const snippet of [
    "AuditSensitiveKey",
    "kExactMaterialKeys",
    "kMaterialKeyNeedles",
    "lowered.find(\"password\")",
    "lowered.find(\"token\")",
    "lowered.find(\"hash\")",
    "lowered.find(\"secret\")",
    "lowered.find(\"credential\")",
    "lowered.find(\"capability\")",
    "\"sourceurl\"",
    "\"streamuri\"",
    "\"modelpath\"",
    "\"modelsha256\"",
    "\"modelprovenance\"",
    "\"rawmedia\"",
    "\"rawframe\"",
    "\"crop\"",
    "\"embedding\"",
    "AuditSensitiveStringValue",
    "\"rtsp://\"",
    "\".onnx\"",
    "\"/models/\"",
    "RedactAuditJsonFragment(line)",
    "OpsAuditEntriesJson",
    "OpsAuditEntriesCsv",
    "OpsAuditEntriesDiffJson",
  ]) {
    assertIncludes(serverSource, snippet, "server audit redaction");
  }
});

check("ops audit UI keeps review chips status-only and mirrors masking", () => {
  for (const snippet of [
    "auditMaterialKeys",
    "auditMaterialKeyNeedles",
    "auditKeyRedacted",
    "auditMaterialValueRedacted",
    "auditTrackingPolicyFromValue",
    "auditModelFallbackStatusFromValue",
    "auditReviewFlags",
    "auditReviewFlagsHtml",
    "Tracker/Re-ID",
    "model/fallback",
    "export masking 적용",
    "audit-review-flags",
  ]) {
    assertIncludes(sharedUi + css, snippet, "shared audit UI");
  }
});

check("fixture still separates raw audit sample from sanitized export expectation", () => {
  assert(fixture.schema === "media-server.v150.audit-export-review-hardening-fixture.v1", "fixture schema mismatch");
  const raw = JSON.stringify(fixture.rawAuditSample || {});
  for (const snippet of [
    "trackingPolicy",
    "modelPath",
    "modelSha256",
    "modelProvenance",
    "sourceUrl",
    "crop",
    "embedding",
  ]) {
    assert(raw.includes(snippet), `raw fixture missing redaction candidate: ${snippet}`);
  }
  const sanitized = JSON.stringify(fixture.expectedSanitizedExport || {});
  for (const forbidden of [
    "rtsp://camera.local",
    "models/reid.onnx",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "field-sample-private",
    "raw-crop-bytes",
  ]) {
    assert(!sanitized.includes(forbidden), `sanitized fixture must not expose: ${forbidden}`);
  }
  for (const snippet of [
    "[redacted]",
    "Tracker/Re-ID bytetrack/assist -> kalman-lite/off",
    "model/fallback approved -> noop-fallback",
    "export masking 적용",
  ]) {
    assert(sanitized.includes(snippet), `sanitized fixture missing expected output: ${snippet}`);
  }
});

check("release and UI docs expose the v1.6 audit/export guard", () => {
  for (const [label, text] of [
    ["release dashboard", dashboard],
    ["stream verification", stream],
    ["release policy", releasePolicy],
    ["UI guide", uiGuide],
    ["docs README", docsRootIndex],
  ]) {
    assertIncludes(text, "v1.6.0-audit-export-masking-regression-hardening.md", label);
    assertIncludes(text, "verify-v160-audit-export-masking-regression-hardening", label);
  }
  for (const [label, text] of [
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "docs/README.md", label);
  }
});

check("server command and inventory expose V160-P1-02 verifier", () => {
  for (const snippet of [
    "verify-v160-audit-export-masking-regression-hardening",
    "verify_v160_audit_export_masking_regression_hardening.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_audit_export_masking_regression_hardening.mjs", "script inventory");
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
console.log("== v1.6.0 audit/export masking regression hardening summary ==");
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
