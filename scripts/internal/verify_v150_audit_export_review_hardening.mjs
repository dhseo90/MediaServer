#!/usr/bin/env node
// 파일 용도: v1.5.0 Audit export review hardening 경계를 정적으로 검증한다.
// 동작 요약: Ops audit 조회/export의 tracker/Re-ID review UX와 model/source material masking guard를 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 Audit export review hardening verification

Usage:
  ./server.sh verify-v150-audit-export-review-hardening [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V150-P1-02 roadmap가 tracker/Re-ID audit review와 후속 분류를 문서화했는지 확인
  - /ops/api/audit 조회/JSON/CSV/Diff JSON export가 model/source material을 다시 마스킹하는지 확인
  - Ops audit UI가 tracker/Re-ID 변경과 model/fallback status-only review를 표시하는지 확인
  - redaction fixture가 민감정보, model/source material, raw media/crop/embedding 비노출을 고정하는지 확인
  - stream/video/ui docs와 server.sh entrypoint가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const uiGuide = readText("docs/ui-guide.md");
const serverSource = readText("src/ingress/webrtc_http_server.cpp");
const sharedUi = readText("src/ingress/product_ui_js.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const fixture = JSON.parse(readText("test/fixtures/v150_audit_export_review_hardening.json"));
const section = extractSection(
  backlog,
  "### V150-P1-02 Audit export review hardening 정리 기준",
  "v1.5.0 비범위:"
);
const checks = [];

check("roadmap defines V150-P1-02 audit export review scope and follow-up classification", () => {
  for (const snippet of [
    "V150-P1-02 Audit export review hardening",
    "tracker/Re-ID 설정 변경",
    "model/fallback 상태는 status-only",
    "조회/JSON/CSV/Diff JSON export 응답에서 다시 마스킹",
    "verify-v150-audit-export-review-hardening",
    "민감정보 masking regression",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V150-P1-02 roadmap section");
  }
});

check("roadmap keeps field evidence and later tracker sandbox work out of P1-02", () => {
  for (const snippet of [
    "V150-P1-03 Field smoke summary evidence boundary",
    "V150-P2-01 OC-SORT experimental sandbox",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
    "raw media",
    "model/runtime binary",
  ]) {
    assertIncludes(section, snippet, "V150-P1-02 out-of-scope section");
  }
  for (const forbidden of [
    "Field smoke summary evidence boundary 완료",
    "OC-SORT 구현 완료",
    "metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
    "model bundle 포함 완료",
  ]) {
    assert(!section.includes(forbidden), `V150-P1-02 must not overclaim: ${forbidden}`);
  }
});

check("server audit export redacts model/source material in stored and queried records", () => {
  for (const snippet of [
    "kExactMaterialKeys",
    "kMaterialKeyNeedles",
    "\"modelpath\"",
    "\"modelsha256\"",
    "\"modelprovenance\"",
    "\"sourceurl\"",
    "\"streamuri\"",
    "\"rawmedia\"",
    "AuditSensitiveStringValue",
    "\"rtsp://\"",
    "\".onnx\"",
    "\"/models/\"",
    "RedactAuditJsonFragment(line)",
    "OpsAuditEntriesCsv",
    "OpsAuditEntriesDiffJson",
  ]) {
    assertIncludes(serverSource, snippet, "server audit redaction");
  }
});

check("ops audit UI exposes review chips and mirrors export masking", () => {
  for (const snippet of [
    "auditMaterialKeys",
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

check("redaction fixture keeps raw sample separate from sanitized export expectation", () => {
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
    assert(raw.includes(snippet), `raw fixture must include redaction candidate: ${snippet}`);
  }
  const sanitized = JSON.stringify(fixture.expectedSanitizedExport || {});
  for (const forbidden of [
    "rtsp://camera.local",
    "models/reid.onnx",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "field-sample-private",
    "raw-crop-bytes",
    "0.01",
    "0.02",
  ]) {
    assert(!sanitized.includes(forbidden), `sanitized fixture must not expose: ${forbidden}`);
  }
  for (const snippet of [
    "[redacted]",
    "Tracker/Re-ID bytetrack/assist -> kalman-lite/off",
    "model/fallback approved -> noop-fallback",
    "export masking 적용",
  ]) {
    assert(sanitized.includes(snippet), `sanitized fixture missing expected review output: ${snippet}`);
  }
});

check("stream, video, and UI docs expose P1-02 interpretation", () => {
  for (const snippet of [
    "verify-v150-audit-export-review-hardening",
    "Audit export review hardening",
    "model/source material",
    "status-only",
    "JSON/CSV/Diff JSON export",
  ]) {
    assertIncludes(stream + video + uiGuide, snippet, "audit export docs");
  }
});

check("server command and inventory expose V150-P1-02 verifier", () => {
  for (const snippet of [
    "verify-v150-audit-export-review-hardening",
    "verify_v150_audit_export_review_hardening.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_audit_export_review_hardening.mjs", "script inventory");
  }
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
console.log("== v1.5.0 Audit export review hardening summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope development follow-ups: 0");
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
