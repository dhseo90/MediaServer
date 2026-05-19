#!/usr/bin/env node
// 파일 용도: v1.6.0 runtime/model bundle RC policy 경계를 정적으로 검증한다.
// 동작 요약: 기본 release 미포함 정책, 향후 RC 승인 조건, Re-ID fallback 및 bundle policy 연결을 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.6.0 runtime/model bundle RC policy verification

Usage:
  ./server.sh verify-v160-runtime-model-bundle-rc-policy [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V160-P1-03 roadmap와 전용 문서가 runtime/model bundle 미포함 기본값과 향후 RC 조건을 분리하는지 확인
  - release/distribution policy와 dry-run/bundle policy scripts가 runtime/model 차단 기준을 유지하는지 확인
  - Re-ID provenance/fallback gate와 metadata/client 비노출 경계를 RC policy에 연결하는지 확인
  - server.sh와 script inventory가 전용 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const doc = readText("docs/v1.6.0-runtime-model-bundle-rc-policy.md");
const backlog = readText("docs/development-backlog.md");
const dashboard = readText("docs/v1.6.0-release-evidence-dashboard.md");
const stream = readText("docs/stream-verification.md");
const releasePolicy = readText("docs/release-policy.md");
const distributionPolicy = readText("docs/distribution-policy.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const bundlePolicy = readText("config/bundle_distribution_policy.json");
const dryRun = readText("scripts/internal/verify_release_bundle_dry_run.mjs");
const v150ReidVerifier = readText("scripts/internal/verify_v150_reid_provenance_fallback_approval.mjs");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V160-P1-03 Runtime/model bundle RC policy 정리 기준",
  "### v1.6.0 비범위"
);
const checks = [];

check("dedicated doc defines default exclusion and future RC approval evidence", () => {
  for (const snippet of [
    "# v1.6.0 Runtime/Model Bundle RC Policy",
    "V160-P1-03",
    "v1.6.0은 runtime/model bundle을 release asset에 포함하지 않습니다",
    "FFmpeg, FFprobe, libav*, x264/x265",
    "GStreamer GPL-risk plugin",
    "ONNX Runtime package",
    "YOLO/Re-ID/model binary",
    "model path/checksum/provenance",
    "missing/invalid/mismatched model",
    "NoOp fallback",
    "verify-bundle-policy --bundle-dir <release_bundle_dir>",
    "verify-release-bundle-dry-run",
    "source-offer-checklist",
    "model card",
    "checksum manifest",
    "verify-v160-runtime-model-bundle-rc-policy",
  ]) {
    assertIncludes(doc, snippet, "v1.6 runtime/model bundle RC doc");
  }
});

check("dedicated doc keeps schema media path and default-on changes out of scope", () => {
  for (const snippet of [
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
    "tracker/Re-ID default-on",
    "product default tracker 변경",
    "runtime tracker 승격",
    "tag, push, GitHub Release, binary upload",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P1-04 Manual UI release checklist closure",
    "V160-P2-01~V160-P2-02",
  ]) {
    assertIncludes(doc, snippet, "v1.6 runtime/model bundle RC boundary");
  }
  for (const forbidden of [
    "runtime/model bundle 포함 완료",
    "model bundle 포함 완료",
    "GitHub Release 생성 완료",
    "Re-ID default-on 완료",
    "metadata schema 변경 완료",
  ]) {
    assert(!doc.includes(forbidden), `runtime/model bundle RC doc must not overclaim: ${forbidden}`);
  }
});

check("roadmap defines V160-P1-03 scope and later phase separation", () => {
  for (const snippet of [
    "V160-P1-03 Runtime/model bundle RC policy",
    "v1.6.0 Runtime/Model Bundle RC Policy",
    "source/doc 중심",
    "ONNX Runtime package",
    "YOLO/Re-ID/model binary",
    "model path/checksum/provenance",
    "NoOp fallback",
    "verify-v160-runtime-model-bundle-rc-policy",
    "verify-v150-reid-provenance-fallback-approval",
    "verify-bundle-policy",
    "미분류 P0~P1 후속 이슈: 없음",
    "V160-P1-04",
    "P2 및 별도 Phase 후보",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V160-P1-03 roadmap section");
  }
  for (const forbidden of [
    "V160-P1-04 완료",
    "V160-P2-01 완료",
    "runtime/model/binary bundle 생성 완료",
    "release asset 업로드 완료",
    "Re-ID default-on 완료",
  ]) {
    assert(!section.includes(forbidden), `V160-P1-03 must not overclaim: ${forbidden}`);
  }
});

check("release and distribution docs link the v1.6 RC policy", () => {
  for (const [label, text] of [
    ["release dashboard", dashboard],
    ["stream verification", stream],
    ["release policy", releasePolicy],
    ["distribution policy", distributionPolicy],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.6.0-runtime-model-bundle-rc-policy.md", label);
    assertIncludes(text, "verify-v160-runtime-model-bundle-rc-policy", label);
  }
});

check("bundle policy and dry-run keep runtime/model payloads blocked by default", () => {
  for (const snippet of [
    "\"defaultMode\": \"source-release-without-third-party-runtime-binaries\"",
    "\"onnx-runtime-package\"",
    "\"model-binary\"",
    "FFmpeg/ffprobe",
    "GStreamer GPL-risk",
    "ONNX Runtime package",
    "YOLO/model binary",
  ]) {
    assertIncludes(bundlePolicy, snippet, "bundle distribution policy");
  }
  for (const snippet of [
    "source-only",
    "local-binary",
    "offline-package",
    "container-root",
    "FFmpeg/GStreamer GPL-risk runtime, ONNX Runtime package, model binary",
    "offline-model-binary",
    "container-onnx-runtime-package",
    "gstreamer-gpl-risk-plugins",
    "model-binary",
    "negativeFixtures",
  ]) {
    assertIncludes(dryRun, snippet, "release bundle dry-run");
  }
});

check("Re-ID provenance/fallback verifier remains connected to bundle RC policy", () => {
  for (const snippet of [
    "model path/checksum/provenance",
    "missing/invalid/mismatched model",
    "NoOp fallback",
    "제품 default-on 승인이나 model bundle 승인으로",
    "Event POST/WebRTC/SSE/WS metadata",
    "client/viewer",
  ]) {
    assertIncludes(v150ReidVerifier, snippet, "v1.5 Re-ID provenance/fallback verifier");
  }
});

check("server command and inventory expose V160-P1-03 verifier", () => {
  for (const snippet of [
    "verify-v160-runtime-model-bundle-rc-policy",
    "verify_v160_runtime_model_bundle_rc_policy.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
  }
  assertIncludes(inventory, "verify_v160_runtime_model_bundle_rc_policy.mjs", "script inventory");
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
console.log("== v1.6.0 runtime/model bundle RC policy summary ==");
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
