#!/usr/bin/env node
// 파일 용도: v3.0.0 S01 Event Evidence Contract 문서, fixture, verifier wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Event Evidence Contract verification

Usage:
  ./server.sh verify-v300-event-evidence-contract

Checks:
  - docs/event-evidence-contract.md defines EvidenceManifest, FrameRef, retention lifecycle, privacy, and non-VMS boundaries
  - test fixture contains required eventFrame, optional representativeImage, bboxCrop, frameBundle, retention, privacy, and non-VMS guards
  - V300-S01 roadmap, stream verification, feature inventory, release records, docs index, and server entrypoint are wired
  - PASS is limited to contract/fixture/verifier evidence and does not imply frame extraction, encoded clip, UI, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const command = "verify-v300-event-evidence-contract";
const fixturePath = "test/fixtures/event_evidence_contract/evidence_manifest_sample.json";

const files = {
  contract: readText("docs/event-evidence-contract.md"),
  docsIndex: readText("docs/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  server: readText("server.sh"),
};
const manifest = JSON.parse(readText(fixturePath));

check("contract document defines V300-S01 evidence boundary", () => {
  for (const snippet of [
    "v3.0.0 `V300-S01 Event Evidence Contract`",
    "EvidenceManifest",
    "FrameRef",
    "Retention Lifecycle",
    "Privacy And Non-VMS Boundary",
    "eventFrame`은 필수",
    "`representativeImage`는 optional",
    "`bboxCrop`은 optional",
    "`frameBundle`은 optional",
    "24/7 상시녹화",
    "VMS/NVR archive API",
    "encoded MP4/WebM event clip",
    "raw LLM/VLM prompt",
    "raw provider response",
    "UI 풀테스트, 30분/120분 longrun, published",
  ]) {
    assert(files.contract.includes(snippet), `contract document missing snippet: ${snippet}`);
  }
});

check("FrameRef document and fixture expose required source/time identity", () => {
  for (const field of [
    "sourceId",
    "channelId",
    "streamEpochId",
    "frameSeq",
    "ptsMs",
    "wallClockMs",
    "relativeToEventMs",
  ]) {
    assert(files.contract.includes(`\`${field}\``), `contract document missing FrameRef field ${field}`);
  }
  validateFrameRef(manifest.artifacts?.eventFrame?.frameRef, "eventFrame.frameRef", 0);
  validateFrameRef(manifest.artifacts?.representativeImage?.frameRef, "representativeImage.frameRef");
  for (const crop of manifest.artifacts?.bboxCrops || []) {
    validateFrameRef(crop.frameRef, `${crop.artifactId}.frameRef`);
  }
  for (const phase of ["pre", "event", "post"]) {
    const refs = manifest.artifacts?.frameBundle?.phases?.[phase];
    assert(Array.isArray(refs) && refs.length > 0, `frameBundle.${phase} must contain at least one FrameRef`);
    for (const ref of refs) validateFrameRef(ref, `frameBundle.${phase}`);
  }
});

check("EvidenceManifest fixture captures required and optional artifact roles", () => {
  assert(manifest.schema === "media-server.event-evidence-contract.v1", `unexpected schema ${manifest.schema}`);
  assert(manifest.contractVersion === 1, "contractVersion must be 1");
  for (const field of ["eventId", "sourceId", "channelId", "streamEpochId", "createdAtMs"]) {
    assert(manifest[field] !== undefined && manifest[field] !== "", `manifest missing ${field}`);
  }

  const eventFrame = manifest.artifacts?.eventFrame;
  assert(eventFrame?.role === "eventFrame", "eventFrame role missing");
  assert(eventFrame.required === true, "eventFrame must be required");
  assert(eventFrame.mediaType === "image/jpeg", "eventFrame must be image evidence");
  assert(!/mp4|webm|clip/i.test(eventFrame.mediaType), "eventFrame must not be encoded clip media");

  const representative = manifest.artifacts?.representativeImage;
  assert(representative?.role === "representativeImage", "representativeImage role missing");
  assert(representative.required === false, "representativeImage must be optional");
  assert(typeof representative.selectionReason === "string" && representative.selectionReason.length > 0, "representativeImage must keep selectionReason");

  const crops = manifest.artifacts?.bboxCrops;
  assert(Array.isArray(crops) && crops.length > 0, "bboxCrops must contain a sample crop");
  for (const crop of crops) {
    assert(crop.role === "bboxCrop", "crop role must be bboxCrop");
    assert(crop.required === false, "bboxCrop must be optional");
    assert(crop.parentArtifactId === eventFrame.artifactId, "bboxCrop must reference eventFrame parent");
    assert(crop.bbox?.coordinateSpace === "normalized", "bbox coordinateSpace must be normalized");
  }

  assert(manifest.artifacts?.frameBundle?.role === "frameBundle", "frameBundle role missing");
  assert(manifest.artifacts?.frameBundle?.required === false, "frameBundle must be optional in S01");
});

check("retention, privacy, and non-VMS fixture guards are explicit", () => {
  assert(manifest.retention?.defaultDays === 7, "retention defaultDays must be 7");
  assert(manifest.retention?.pinnedExcludesAutomaticCleanup === true, "pinned events must exclude automatic cleanup");
  assert(manifest.retention?.cleanupRequiresDryRun === true, "cleanup must require dry-run");
  assert(manifest.retention?.operatorConfigurable === true, "retention must be operator configurable");

  assert(manifest.privacy?.rawPromptStored === false, "raw prompt must not be stored");
  assert(manifest.privacy?.rawProviderResponseStored === false, "raw provider response must not be stored");
  assert(manifest.privacy?.identityFeaturesAllowed === false, "identity features must be disallowed");
  assert(manifest.privacy?.allowedDurableFeatureMode === "structured-non-identifying-feature-only", "durable feature mode must be feature-only");

  for (const [field, expected] of [
    ["alwaysOnRecording", false],
    ["vmsArchiveApi", false],
    ["encodedEventClip", false],
    ["clipPlayback", false],
    ["clientViewerExposure", false],
    ["cloudProviderDefaultOn", false],
  ]) {
    assert(manifest.nonVmsBoundary?.[field] === expected, `nonVmsBoundary.${field} must be ${expected}`);
  }
});

check("docs index, roadmap, and stream verification expose V300-S01 contract gate", () => {
  assert(files.docsIndex.includes("[event-evidence-contract.md](event-evidence-contract.md)"), "docs index missing event evidence contract");
  for (const snippet of [
    "| 1 | V300-S01 | P0 | 완료 | Event Evidence Contract |",
    "EvidenceManifest, FrameRef, retention lifecycle, non-VMS boundary 정의",
    "docs/event-evidence-contract.md",
    fixturePath,
    "`./server.sh verify-v300-event-evidence-contract`",
    "encoded clip, playback, VMS API 완료 evidence가 아님",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V300-S01 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S01 | `./server.sh verify-v300-event-evidence-contract` |",
    "EvidenceManifest, FrameRef, retention lifecycle, privacy/non-VMS boundary",
    "frame extraction, encoded clip, playback, VMS API, UI 풀테스트",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V300-S01 to OPS-052 and SAFE-082", () => {
  for (const snippet of [
    "V300-S01 Event Evidence Contract | `OPS-052`, `SAFE-082` | `verify-v300-event-evidence-contract`",
    "OPS-052 | V300-S01 Event Evidence Contract 게이트",
    "SAFE-082 | V300-S01 evidence contract boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 Event Evidence Contract",
    "`./server.sh verify-v300-event-evidence-contract`",
    "v300 S01 RED contract gate",
    "v300 S01 event evidence contract final",
    "v300 S01 frame extraction",
    "v300 S01 encoded clip/playback",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V300-S01 command", () => {
  assert(files.server.includes("verify-v300-event-evidence-contract"), "server.sh missing V300-S01 command");
  assert(files.server.includes("verify_v300_event_evidence_contract.mjs"), "server.sh missing V300-S01 script dispatch");
  assert(files.featureCoverageVerifier.includes("verify-v300-event-evidence-contract"), "feature coverage verifier missing V300-S01 command");
  assert(files.projectInventoryVerifier.includes("OPS-052") && files.projectInventoryVerifier.includes("SAFE-082"), "project inventory verifier missing V300-S01 IDs");
});

const results = runChecks();

console.log("");
console.log("== v3.0.0 event evidence contract summary ==");
console.log("- schema: media-server.event-evidence-contract.v1");
console.log("- step: V300-S01");
console.log(`- fixture: ${fixturePath}`);
console.log("- eventFrame: required");
console.log("- representativeImage: optional");
console.log("- bboxCrop: optional");
console.log("- frameBundle: contract-only-in-this-step");
console.log("- retentionDefaultDays: 7");
console.log("- encodedClipPlayback: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
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
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateFrameRef(ref, label, expectedRelativeToEventMs = null) {
  assert(ref && typeof ref === "object", `${label} missing`);
  for (const field of ["sourceId", "channelId", "streamEpochId"]) {
    assert(typeof ref[field] === "string" && ref[field].length > 0, `${label}.${field} must be a non-empty string`);
  }
  for (const field of ["frameSeq", "ptsMs", "wallClockMs", "relativeToEventMs"]) {
    assert(Number.isFinite(ref[field]), `${label}.${field} must be a finite number`);
  }
  if (expectedRelativeToEventMs !== null) {
    assert(ref.relativeToEventMs === expectedRelativeToEventMs, `${label}.relativeToEventMs must be ${expectedRelativeToEventMs}`);
  }
}
