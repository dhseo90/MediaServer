#!/usr/bin/env node
// 파일 용도: v1.5.0 Re-ID opt-in model provenance/fallback approval 범위를 정적으로 검증한다.
// 동작 요약: Re-ID model gate, NoOp fallback fixture, privacy/retention 비노출 경계를 문서/코드/entrypoint에서 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 Re-ID opt-in model provenance/fallback approval verification

Usage:
  ./server.sh verify-v150-reid-provenance-fallback-approval [options]

Options:
  -h, --help  도움말 출력

Checks:
  - V150-P0-03가 Re-ID opt-in model provenance/checksum/privacy/retention gate를 문서화했는지 확인
  - ONNX Re-ID extractor가 missing/invalid/mismatched model gate를 NoOp fallback으로 닫는지 확인
  - analysis-state smoke가 missing model, missing checksum/provenance, invalid checksum, checksum mismatch fixture를 고정하는지 확인
  - 외부 Event POST/WebRTC/SSE/WS metadata와 client/viewer 상태에 model/crop/embedding/provenance가 노출되지 않는지 확인
  - server.sh, script inventory, stream/video/config 문서가 전용 verifier를 연결하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const video = readText("docs/video-analysis.md");
const configReference = readText("docs/config-reference.md");
const extractor = readText("src/analysis/appearance_extractor.cpp");
const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");
const section = extractSection(
  backlog,
  "### V150-P0-03 Re-ID opt-in model provenance and fallback approval 정리 기준",
  "v1.5.0 비범위:"
);
const checks = [];

check("roadmap defines V150-P0-03 model gate scope and follow-up classification", () => {
  for (const snippet of [
    "V150-P0-03 Re-ID opt-in model provenance and fallback approval",
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL",
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256",
    "MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE",
    "missing/invalid/mismatched model",
    "NoOp fallback",
    "privacy/retention approval",
    "verify-v150-reid-provenance-fallback-approval",
    "미분류 P0~P1 후속 이슈: 없음",
  ]) {
    assertIncludes(section, snippet, "V150-P0-03 roadmap section");
  }
});

check("roadmap keeps later phases outside this approval gate", () => {
  for (const snippet of [
    "V150-P1-01 Ops Dashboard tracker warning next-action refinement",
    "V150-P1-02 Audit export review hardening",
    "V150-P1-03 Field smoke summary evidence boundary",
    "V150-P2-01 OC-SORT experimental sandbox",
    "Re-ID model/runtime binary",
    "release asset 업로드",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경",
    "RTSP/WebRTC media path 변경",
  ]) {
    assertIncludes(section, snippet, "V150-P0-03 out-of-scope section");
  }
  for (const forbidden of [
    "Re-ID default-on 완료",
    "model bundle 포함 완료",
    "runtime/model bundle RC policy 완료",
    "privacy retention guard 완료",
  ]) {
    assert(!section.includes(forbidden), `V150-P0-03 must not overclaim: ${forbidden}`);
  }
});

check("ONNX Re-ID extractor requires explicit model path, checksum, provenance and runtime support", () => {
  for (const snippet of [
    "options.model_path.empty() || !std::filesystem::exists(options.model_path)",
    "ONNX Re-ID model checksum is missing",
    "ONNX Re-ID model checksum is invalid",
    "ONNX Re-ID model provenance is missing",
    "ComputeFileSha256",
    "ONNX Re-ID model checksum mismatch",
    "ONNX Re-ID model checksum verification requires OpenSSL",
    "ONNX Re-ID extractor requires MEDIA_SERVER_USE_ONNXRUNTIME=ON",
    "falling back to NoOp",
  ]) {
    assertIncludes(extractor, snippet, "appearance extractor");
  }
});

check("analysis-state smoke pins invalid and missing model fallback fixtures", () => {
  for (const snippet of [
    "missing Re-ID model path must fall back to NoOpAppearanceExtractor",
    "Re-ID model path without checksum/provenance gate must fall back to NoOpAppearanceExtractor",
    "invalid Re-ID model checksum must fall back to NoOpAppearanceExtractor",
    "missing Re-ID model provenance gate must fall back to NoOpAppearanceExtractor",
    "mismatched Re-ID model checksum must fall back to NoOpAppearanceExtractor",
    "daa8eac9dcb9959a436b35d5dedd9a516690af96a3db00ca8125c52ef9652358",
  ]) {
    assertIncludes(smoke, snippet, "analysis state smoke");
  }
});

check("external metadata serializers still hide Re-ID identity material", () => {
  const files = [
    "src/analysis/va_runtime_metadata.cpp",
    "src/analysis/event_rule_engine.cpp",
    "src/ingress/webrtc_http_server.cpp",
  ];
  const forbiddenFields = [
    "embedding",
    "embeddingQuality",
    "appearanceProfile",
    "appearance_profile",
    "cropRgb",
    "crop_rgb",
    "modelPath",
    "model_path",
    "modelSha256",
    "modelChecksum",
    "modelProvenance",
    "provenance",
  ];
  const hits = [];
  for (const file of files) {
    const text =
      file === "src/ingress/webrtc_http_server.cpp"
        ? stripFunctionBlock(readText(file), "bool AuditSensitiveKey(", "std::string RedactAuditJsonFragment(")
        : readText(file);
    for (const field of forbiddenFields) {
      if (hasJsonFieldLiteral(text, field)) hits.push(`${file}: ${field}`);
    }
  }
  assert(hits.length === 0, `forbidden Re-ID identity JSON field(s):\n${hits.join("\n")}`);
});

check("docs expose the v1.5.0 approval verifier and privacy/retention interpretation", () => {
  for (const snippet of [
    "verify-v150-reid-provenance-fallback-approval",
    "missing/invalid/mismatched model",
    "privacy/retention approval",
    "제품 default-on 승인이나 model bundle 승인으로",
    "해석하지 않습니다",
  ]) {
    assertIncludes(stream, snippet, "stream verification docs");
  }
  for (const snippet of [
    "v1.5.0 Re-ID opt-in model provenance/fallback approval",
    "model path/checksum/provenance",
    "missing/invalid/mismatched model",
    "NoOp fallback",
    "privacy/retention approval",
  ]) {
    assertIncludes(video, snippet, "video analysis docs");
  }
  for (const snippet of [
    "Re-ID model opt-in checksum gate",
    "missing/invalid/mismatched model",
    "Re-ID model opt-in provenance gate",
    "privacy/retention approval",
  ]) {
    assertIncludes(configReference, snippet, "config reference");
  }
});

check("server command and inventory expose V150-P0-03 verifier", () => {
  for (const snippet of [
    "verify-v150-reid-provenance-fallback-approval",
    "verify_v150_reid_provenance_fallback_approval.mjs",
  ]) {
    assertIncludes(server, snippet, "server.sh");
    assertIncludes(inventory, "verify_v150_reid_provenance_fallback_approval.mjs", "script inventory");
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
console.log("== v1.5.0 Re-ID provenance/fallback approval summary ==");
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

function hasJsonFieldLiteral(text, field) {
  return text.includes(`"${field}"`) || text.includes(`\\"${field}\\"`) || text.includes(`\\\"${field}\\\"`);
}

function stripFunctionBlock(text, startMarker, nextMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return text;
  const end = text.indexOf(nextMarker, start + startMarker.length);
  if (end < 0) return text.slice(0, start);
  return text.slice(0, start) + text.slice(end);
}
