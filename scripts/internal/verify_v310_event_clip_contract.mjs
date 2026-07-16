#!/usr/bin/env node
// 파일 용도: v3.1.0 S01 Encoded Event Clip Contract 문서, fixture, verifier wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Encoded Event Clip Contract verification

Usage:
  ./server.sh verify-v310-event-clip-contract

Checks:
  - docs/v310-encoded-event-clip-contract.md defines EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, retention lifecycle, privacy, and non-VMS boundaries
  - test fixture contains encoded clip artifact identity, format, FrameRef/PTS mapping, evidence links, retention, privacy, and non-VMS guards
  - V310-S01 roadmap, stream verification, feature inventory, release records, docs index, and server entrypoint are wired
  - PASS is limited to contract/fixture/verifier evidence and does not imply encoder generation, replay UI, cleanup execution, UI fulltest, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const command = "verify-v310-event-clip-contract";
const contractPath = "docs/v310-encoded-event-clip-contract.md";
const fixturePath = "test/fixtures/v310_event_clip_contract/encoded_clip_manifest_sample.json";

const files = {
  contract: readText(contractPath),
  docsIndex: readText("docs/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  eventStorageSource: readText("src/analysis/event_storage.cpp"),
  server: readText("server.sh"),
};
const manifest = JSON.parse(readText(fixturePath));

check("encoded clip encoder source owns the runtime manifest contract", () => {
  const start = files.eventStorageSource.indexOf("bool EncodeEventClipArtifact(");
  const end = files.eventStorageSource.indexOf("bool WriteFrameBundleManifest(", start);
  assert(start >= 0 && end > start, "EVT-059 encoded clip encoder block missing");
  const evt059EncoderBlock = files.eventStorageSource.slice(start, end);
  assert(evt059EncoderBlock.includes("result->media_path = media_path.string();"), "EVT-059 block-scoped canonical encoder contract");
  const manifestStart = files.eventStorageSource.indexOf("bool WriteEncodedClipManifest(");
  const manifestEnd = files.eventStorageSource.indexOf("bool EncodeEventClipArtifact(", manifestStart);
  assert(manifestStart >= 0 && manifestEnd > manifestStart, "EVT-059 encoded clip manifest block missing");
  const evt059ManifestBlock = files.eventStorageSource.slice(manifestStart, manifestEnd);
  assert(evt059ManifestBlock.includes("media-server.encoded-event-clip-contract.v1"), "EVT-059 canonical runtime manifest schema");
  assert(evt059ManifestBlock.includes("frameMap"), "EVT-059 frameMap queueName WebRTC SSE RTSP boundary");
});

check("contract document defines V310-S01 encoded clip boundary", () => {
  for (const snippet of [
    "v3.1.0 `V310-S01 Encoded Event Clip Contract`",
    "EncodedClipManifest",
    "MP4/WebM clip manifest",
    "FrameRef/PTS mapping",
    "EvidenceManifest/frame bundle/event frame 연결",
    "Privacy And Non-VMS Boundary",
    "encoded clip generation queue",
    "실제 MP4/WebM으로 muxing",
    "`/ops/events` replay timeline UI",
    "VMS/NVR archive API",
    "raw LLM/VLM prompt",
    "raw provider response",
    "Event POST/WebRTC DataChannel/SSE/WS metadata payload가 아니며",
    "RTSP/WebRTC media path",
    "encoder pipeline",
    "UI 풀테스트, 30분/120분 longrun, published",
  ]) {
    assert(files.contract.includes(snippet), `contract document missing snippet: ${snippet}`);
  }
});

check("EncodedClipManifest fixture captures schema, clip identity, and format", () => {
  assert(manifest.schema === "media-server.encoded-event-clip-contract.v1", `unexpected schema ${manifest.schema}`);
  assert(manifest.contractVersion === 1, "contractVersion must be 1");
  assert(manifest.sampleKind === "contract-fixture-not-runtime-output", "fixture must be marked as non-runtime output");
  for (const field of ["eventId", "sourceId", "channelId", "streamEpochId", "createdAtMs"]) {
    assert(manifest[field] !== undefined && manifest[field] !== "", `manifest missing ${field}`);
  }

  const clip = manifest.clip;
  assert(clip?.role === "encodedEventClip", "clip role must be encodedEventClip");
  assert(clip.requiredWhenGenerated === true, "clip must be required once generated");
  assert(typeof clip.storageKey === "string" && clip.storageKey.endsWith(".mp4"), "clip storageKey must point to mp4 fixture media");
  assert(typeof clip.manifestStorageKey === "string" && clip.manifestStorageKey.endsWith("encoded-clip-manifest.json"), "clip manifest storage key missing");
  assert(Number.isFinite(clip.durationMs) && clip.durationMs > 0, "clip durationMs must be positive");
  assert(clip.startRelativeToEventMs < 0, "clip must include pre-event window");
  assert(clip.endRelativeToEventMs > 0, "clip must include post-event window");
  assert(typeof clip.sha256 === "string" && /^[0-9a-f]{64}$/.test(clip.sha256), "clip sha256 must be hex digest");

  const format = manifest.format;
  assert(format?.container === "mp4", "fixture container must be mp4");
  assert(format?.mimeType === "video/mp4", "fixture mimeType must be video/mp4");
  assert(format?.videoCodec === "h264", "fixture codec must be h264");
  assert(format?.extension === ".mp4", "fixture extension must be .mp4");
  assert(Array.isArray(format.allowedContainers) && format.allowedContainers.includes("mp4") && format.allowedContainers.includes("webm"), "allowed containers must include mp4 and webm");
  assert(Array.isArray(format.allowedMimeTypes) && format.allowedMimeTypes.includes("video/mp4") && format.allowedMimeTypes.includes("video/webm"), "allowed mime types must include mp4 and webm");
});

check("FrameRef/PTS mapping exposes event-centered source/time identity", () => {
  const mapping = manifest.ptsMapping;
  assert(mapping?.timescale === 1000, "timescale must be 1000");
  assert(mapping.clipStartPtsMs < mapping.eventSourcePtsMs, "clip start PTS must precede event source PTS");
  assert(mapping.clipEndPtsMs > mapping.eventSourcePtsMs, "clip end PTS must follow event source PTS");
  assert(mapping.eventClipPtsMs === Math.abs(manifest.clip.startRelativeToEventMs), "eventClipPtsMs must align with pre-event window");

  const frames = mapping.frames;
  assert(Array.isArray(frames) && frames.length >= 3, "ptsMapping.frames must contain pre/event/post samples");
  const phases = new Set(frames.map(frame => frame.phase));
  for (const phase of ["pre", "event", "post"]) {
    assert(phases.has(phase), `ptsMapping.frames missing phase ${phase}`);
  }
  let eventFrameSeen = false;
  for (const frame of frames) {
    assert(["pre", "event", "post"].includes(frame.phase), `invalid phase ${frame.phase}`);
    assert(Number.isFinite(frame.clipPtsMs), `${frame.phase}.clipPtsMs must be finite`);
    assert(Number.isFinite(frame.relativeToEventMs), `${frame.phase}.relativeToEventMs must be finite`);
    validateFrameRef(frame.frameRef, `${frame.phase}.frameRef`, frame.relativeToEventMs);
    if (frame.phase === "event") {
      eventFrameSeen = true;
      assert(frame.relativeToEventMs === 0, "event frame relativeToEventMs must be 0");
      assert(frame.clipPtsMs === mapping.eventClipPtsMs, "event frame clipPtsMs must match eventClipPtsMs");
      assert(Array.isArray(frame.artifactRefs) && frame.artifactRefs.includes("artifact-event-frame"), "event frame must map to eventFrame artifact");
    }
  }
  assert(eventFrameSeen, "event phase frame missing");
});

check("fixture links encoded clip to v3.0 evidence and frame bundle artifacts", () => {
  const links = manifest.evidenceLinks;
  assert(typeof links?.evidenceManifestStorageKey === "string" && links.evidenceManifestStorageKey.endsWith("evidence-manifest.json"), "missing evidenceManifestStorageKey");
  assert(typeof links?.frameBundleManifestStorageKey === "string" && links.frameBundleManifestStorageKey.endsWith("frame-bundle-manifest.json"), "missing frameBundleManifestStorageKey");
  assert(links.eventFrameArtifactId === "artifact-event-frame", "missing eventFrame artifact link");
  assert(links.representativeImageArtifactId === "artifact-representative-image", "missing representative image link");
  assert(Array.isArray(links.bboxCropArtifactIds) && links.bboxCropArtifactIds.includes("artifact-crop-person-1"), "missing bbox crop artifact link");
});

check("retention, privacy, generation, and non-VMS fixture guards are explicit", () => {
  assert(manifest.retention?.inheritsEventRetention === true, "clip must inherit event retention");
  assert(manifest.retention?.defaultDays === 7, "retention defaultDays must be 7");
  assert(manifest.retention?.pinnedExcludesAutomaticCleanup === true, "pinned events must exclude automatic cleanup");
  assert(manifest.retention?.cleanupRequiresDryRun === true, "cleanup must require dry-run");
  for (const lifecycleItem of ["eventRecord", "evidenceManifest", "frameBundle", "encodedClip", "featureRevision", "searchIndex", "auditTrail"]) {
    assert(manifest.retention?.lifecycleGroup?.includes(lifecycleItem), `retention lifecycle missing ${lifecycleItem}`);
  }

  assert(manifest.privacy?.rawPromptStored === false, "raw prompt must not be stored");
  assert(manifest.privacy?.rawProviderResponseStored === false, "raw provider response must not be stored");
  assert(manifest.privacy?.providerCredentialStored === false, "provider credential must not be stored");
  assert(manifest.privacy?.sourceUrlStored === false, "source URL must not be stored");
  assert(manifest.privacy?.identityFeaturesAllowed === false, "identity features must be disallowed");

  for (const [field, expected] of [
    ["alwaysOnRecording", false],
    ["continuousSegmentIndex", false],
    ["vmsArchiveApi", false],
    ["broadArchivePlayback", false],
    ["onDemandArbitraryWindowExport", false],
    ["clientViewerExposure", false],
    ["cloudProviderDefaultOn", false],
  ]) {
    assert(manifest.nonVmsBoundary?.[field] === expected, `nonVmsBoundary.${field} must be ${expected}`);
  }

  assert(manifest.generationBoundary?.pipelineImplementedInThisStep === false, "pipeline must not be implemented in S01 fixture");
  assert(manifest.generationBoundary?.queueStatusImplementedInThisStep === false, "queue/status must not be implemented in S01 fixture");
  assert(manifest.generationBoundary?.cleanupExecutionImplementedInThisStep === false, "cleanup execution must not be implemented in S01 fixture");
  assert(manifest.generationBoundary?.encoderPipelineStep === "V310-S02", "encoder pipeline must be scoped to V310-S02");
});

check("docs index, roadmap, and stream verification expose V310-S01 contract gate", () => {
  assert(files.docsIndex.includes("[v310-encoded-event-clip-contract.md](v310-encoded-event-clip-contract.md)"), "docs index missing v310 encoded clip contract");
  for (const snippet of [
    "| 1 | V310-S01 | P0 | 완료 | Encoded Event Clip Contract |",
    "MP4/WebM clip manifest, FrameRef/PTS mapping, non-VMS boundary 정의",
    contractPath,
    fixturePath,
    "`./server.sh verify-v310-event-clip-contract`",
    "encoder pipeline, replay timeline UI, cleanup 실행 완료 evidence가 아님",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V310-S01 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V310-S01 | `./server.sh verify-v310-event-clip-contract` |",
    "EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, retention/privacy/non-VMS boundary",
    "encoder generation, replay UI, cleanup execution, client digest, scoped API",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V310-S01 to OPS-062 and SAFE-094", () => {
  for (const snippet of [
    "V310-S01 Encoded Event Clip Contract | `OPS-062`, `SAFE-094` | `verify-v310-event-clip-contract`",
    "OPS-062 | V310-S01 Encoded Event Clip Contract 게이트",
    "SAFE-094 | V310-S01 encoded clip contract boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V310 Encoded Event Clip Contract",
    "`./server.sh verify-v310-event-clip-contract`",
    "v310 S01 RED contract gate",
    "v310 S01 encoded event clip contract final",
    "v310 S01 encoder pipeline",
    "v310 S01 replay timeline UI",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V310-S01 command", () => {
  assert(files.server.includes(command), "server.sh missing V310-S01 command");
  assert(files.server.includes("verify_v310_event_clip_contract.mjs"), "server.sh missing V310-S01 script dispatch");
  assert(files.featureInventory.includes(command), "feature inventory missing V310-S01 command");
  assert(files.projectInventoryVerifier.includes("SAFE-094") && files.projectInventoryVerifier.includes("OPS-062"), "project inventory verifier missing V310-S01 IDs");
});

check("SAFE-094 canonical encoded clip contract boundary", () => {
  const encodedContractCommandDocumented = files.server.includes("verify-v310-event-clip-contract");
  const rawMaterialStored = manifest.privacy?.rawPromptStored !== false || manifest.privacy?.rawProviderResponseStored !== false;
  const safe094BoundaryObserved = encodedContractCommandDocumented && rawMaterialStored === false;
  assert(safe094BoundaryObserved && (encodedContractCommandDocumented && rawMaterialStored === false) && rawMaterialStored === false,
    "verify-v310-event-clip-contract raw material must remain absent before encoder generation evidence");
});

const results = runChecks();

console.log("");
console.log("== v3.1.0 encoded event clip contract summary ==");
console.log("- schema: media-server.encoded-event-clip-contract.v1");
console.log("- step: V310-S01");
console.log(`- fixture: ${fixturePath}`);
console.log("- supportedContainers: mp4, webm");
console.log("- frameRefPtsMapping: required");
console.log("- eventFrameMapping: required");
console.log("- retentionDefaultDays: 7");
console.log("- encoderPipeline: not-run-by-this-command");
console.log("- replayTimelineUi: not-run-by-this-command");
console.log("- cleanupExecution: not-run-by-this-command");
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
