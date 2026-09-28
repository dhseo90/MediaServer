#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
// 파일 용도: V200-S07 VLM event evidence reference 추출 경계와 검증 연결을 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { extractCppFunctionBlock, exactBooleanFlagValue } from "./source_block_assertion_utils.mjs";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM event evidence extraction verification

Usage:
  ./server.sh verify-vlm-event-evidence-extraction

Checks:
  - EventRecord media hook writes snapshot, bbox crop, and clip-manifest VLM frame refs.
  - EventRecord metadata keeps VLM evidence as reference-only metadata.vlmEvidenceRefs.
  - docs, inventory, server command, and script inventory are wired.
  - S07 does not add VLMObservation sidecar storage, client route exposure, provider API calls, or Event/WebRTC/SSE/WS schema changes.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("EventRecord storage builds VLM evidence refs without top-level schema expansion", () => {
  const header = readText("include/analysis/event_storage.h");
  const storage = readText("src/analysis/event_storage.cpp");
  const evidenceRefsBlock = extractCppFunctionBlock(storage, "std::string BuildVlmEvidenceRefsJson(");
  assert(storage.includes("rawMediaEmbedded"), "rawMediaEmbedded reference-only boundary missing");
  assert(evidenceRefsBlock.includes('\\"available\\"') && exactBooleanFlagValue(evidenceRefsBlock, "rawMediaEmbedded") === false, "available evidence state must exclude raw media");
  assert(exactBooleanFlagValue(evidenceRefsBlock, "sourceUrlExposed") === false, "sourceUrlExposed must remain false");
  assert(exactBooleanFlagValue(evidenceRefsBlock, "credentialMaterialExposed") === false, "credentialMaterialExposed must remain false");
  for (const snippet of [
    "bbox_available",
    "bbox_crop_path",
    "media-server.vlm-event-evidence-refs.v1",
    "event-short-evidence-ref-only",
    "vlmEvidenceRefs",
    "WriteBboxCropMedia",
    "media-server.va.event-bbox-crop-hook.v1",
    "vlmInputRefs",
    "previousFrame",
    "eventFrame",
    "nextFrame",
    "rawMediaEmbedded",
    "sourceUrlExposed",
  ]) {
    assert(header.includes(snippet) || storage.includes(snippet), `EventRecord evidence extraction missing snippet: ${snippet}`);
  }
  assert(!storage.includes("\"bboxCropPath\""), "bbox crop must stay out of EventRecord top-level JSON");
});

check("analysis state smoke verifies crop media, VLM refs, and redaction boundary", () => {
  const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
  for (const snippet of [
    "Event recorder writes bbox crop media",
    "Event recorder records VLM evidence refs",
    "vlmEvidenceRefs",
    "bboxCrop",
    "rawMediaEmbedded",
    "sourceUrlExposed",
    "vlmInputRefs",
    "previousFrame",
    "eventFrame",
    "nextFrame",
  ]) {
    assert(smoke.includes(snippet), `analysis state smoke missing snippet: ${snippet}`);
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const currentInventory = readText("docs/project-feature-test-inventory.md");
  const currentImplementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const errors = validateFeatureDocumentation({
    document: readText("docs/vlm-event-evidence-extraction.md"),
    identifiers: ["media-server.vlm-event-evidence-refs.v1","previousFrame","eventFrame","nextFrame"],
    command: "verify-vlm-event-evidence-extraction", script: "verify_vlm_event_evidence_extraction.mjs",
    featureIds: ["EVT-027","EVT-029"], inventory: currentInventory, implementation: currentImplementation,
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
  assert(server.includes("verify-vlm-event-evidence-extraction"), "server command missing S07 verifier");
  assert(server.includes("verify_vlm_event_evidence_extraction.mjs"), "server dispatch missing S07 verifier script");
  assert(scriptInventory.includes("verify_vlm_event_evidence_extraction.mjs"), "script inventory missing S07 verifier");
});

check("S07 remains reference-only and does not introduce sidecar/provider/client/schema artifacts", () => {
  const files = [
    "include/analysis/event_storage.h",
    "src/analysis/event_storage.cpp",
    "scripts/internal/analysis_state_smoke.cpp",
    "docs/vlm-event-evidence-extraction.md",
  ];
  const forbidden = [
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\bsidecarStored\s*:\s*true\b/,
    /\/client\/vlm/i,
    /Event POST payload 변경 완료/,
    /WebRTC DataChannel schema 변경 완료/,
    /SSE\/WS metadata schema 변경 완료/,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S07 artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM event evidence extraction summary ==");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
