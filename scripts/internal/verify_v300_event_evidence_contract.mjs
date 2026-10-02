#!/usr/bin/env node
// 파일 용도: v3.0.0 S01 Event Evidence Contract 문서, fixture, verifier wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {validateFeatureDocumentation} from "./documentation_contract_lib.mjs";

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
  - 현재 계약 문서의 식별자·기능 ID·검증 명령·server dispatch 연결 (과거 실행 기록 제외)
  - PASS is limited to contract/fixture/verifier evidence and does not imply frame extraction, encoded clip, UI, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const command = "verify-v300-event-evidence-contract";
const fixturePath = "test/fixtures/event_evidence_contract/evidence_manifest_sample.json";

const files = {
  contract: readText("docs/event-evidence-contract.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  eventStorageSource: readText("src/analysis/event_storage.cpp"),
  server: readText("server.sh"),
};
const manifest = JSON.parse(readText(fixturePath));

check("frame bundle writer source owns the extraction sidecar contract", () => {
  const start = files.eventStorageSource.indexOf("bool WriteFrameBundleManifest(");
  const end = files.eventStorageSource.indexOf("bool WriteEvidenceManifest(", start);
  assert(start >= 0 && end > start, "EVT-060 frame bundle writer block missing");
  const evt060FrameBundleBlock = files.eventStorageSource.slice(start, end);
  assert(evt060FrameBundleBlock.includes("FrameBundlePhase(index, event_frame_index)"), "EVT-060 block-scoped canonical frame bundle flow");
  const evidenceStart = files.eventStorageSource.indexOf("bool WriteEvidenceManifest(", end);
  const evidenceEnd = files.eventStorageSource.indexOf("class EventFrameBuffer", evidenceStart);
  assert(evidenceStart >= 0 && evidenceEnd > evidenceStart, "EVT-060 evidence manifest block missing");
  const evt060EvidenceManifestBlock = files.eventStorageSource.slice(evidenceStart, evidenceEnd);
  assert(evt060EvidenceManifestBlock.includes("eventFrame"), "EVT-060 eventFrame representativeImage bboxCrop frameBundle outcome");
  assert(evt060FrameBundleBlock.includes("FrameBundlePhase(index, event_frame_index)"), "EVT-060 WebRTC SSE RTSP boundary");
});

check("현재 계약 문서와 기능별 검증 연결", () => {
  const errors = validateFeatureDocumentation({
    document: files.contract, identifiers: ["EvidenceManifest","FrameRef","media-server.event-evidence-contract.v1","eventFrame","representativeImage","bboxCrop","frameBundle","retention","privacy","nonVmsBoundary"],
    command, script: "verify_v300_event_evidence_contract.mjs", featureIds: ["OPS-052","SAFE-082"],
    inventory: files.featureInventory, verification: files.streamVerification,
    server: files.server,
  });
  assert(errors.length === 0, errors.join("; "));
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


check("server entrypoint and inventory verifiers include V300-S01 command", () => {
  assert(files.server.includes("verify-v300-event-evidence-contract"), "server.sh missing V300-S01 command");
  assert(files.server.includes("verify_v300_event_evidence_contract.mjs"), "server.sh missing V300-S01 script dispatch");
  assert(files.featureInventory.includes("verify-v300-event-evidence-contract"), "feature inventory missing V300-S01 command");
  assert(files.projectInventoryVerifier.includes("OPS-052") && files.projectInventoryVerifier.includes("SAFE-082"), "project inventory verifier missing V300-S01 IDs");
});

check("SAFE-082 canonical evidence contract boundary", () => {
  const evidenceContractCommandDocumented = files.server.includes("verify-v300-event-evidence-contract");
  const rawMaterialStored = manifest.privacy?.rawPromptStored !== false || manifest.privacy?.rawProviderResponseStored !== false;
  const evidenceContractInputsObserved = evidenceContractCommandDocumented && rawMaterialStored === false;
  const safe082BoundaryObserved = evidenceContractInputsObserved &&
    files.featureInventory.includes("/ops/events") && rawMaterialStored === false;
  assert(safe082BoundaryObserved && rawMaterialStored === false,
    "verify-v300-event-evidence-contract /ops/events raw material must remain absent");
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
