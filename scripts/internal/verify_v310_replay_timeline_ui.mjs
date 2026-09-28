#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.1.0 S03 Replay Timeline UI 구현, 문서, inventory, verifier 연결을 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Replay Timeline UI verification

Usage:
  ./server.sh verify-v310-replay-timeline-ui

Checks:
  - /ops/events exposes the V310 replay timeline UI shell for event frame, representative image, frame bundle, and encoded clip timeline
  - Ops review API returns an Ops-only replayTimeline view model with FrameRef/PTS mapping and encoded clip status
  - product UI script renders the timeline without source URL/raw JSON/debug/client exposure
  - CSS provides responsive event frame, frame bundle, and encoded clip timeline layouts
  - 현행 계약 식별자·기능 정의·검증 명령·실제 dispatch를 확인하며 과거 실행 기록은 읽지 않음
  - PASS is limited to V310-S03 local/static UI evidence and does not imply UI 풀테스트, 30분/120분, client digest, scoped API, cleanup execution, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-replay-timeline-ui";
const files = {
  server: `${readWebRtcHttpServerBundle(readText)}\n${readText("src/ingress/product_ui_server_pages.cpp")}`,
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("ops events page exposes V310 replay timeline UI shell", () => {
  for (const snippet of [
    'data-testid="ops-v310-replay-timeline-ui"',
    'data-v310-replay-timeline-ui="event-frame-frame-bundle-encoded-clip"',
    'id="opsV310ReplayTimelineSummary"',
    'id="opsV310ReplayTimelineBadges"',
    'id="opsV310ReplayTimelineRows"',
    "Encoded Clip Replay Timeline",
    "event frame",
    "representative image",
    "frame bundle",
    "encoded clip timeline",
  ]) {
    assertIncludes(files.server, snippet, "V310 replay timeline UI shell");
  }
});

check("ops review API returns V310 Ops-only replay timeline view model", () => {
  for (const snippet of [
    "OpsV310ReplayTimelineUiJson",
    "OpsV310ReplayTimelineItemJson",
    "media-server.ops.v310-replay-timeline-ui.v1",
    "\\\"replayTimeline\\\":",
    "\\\"eventFrame\\\":",
    "\\\"representativeImage\\\":",
    "\\\"frameBundle\\\":",
    "\\\"encodedClip\\\":",
    "\\\"frameRefPtsMapping\\\":",
    "\\\"playbackSegments\\\":",
    "\\\"timelinePoints\\\":",
    "\\\"encodedClipManifestPath\\\":",
    "\\\"encodedClipMediaPath\\\":",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"sourceUrlExposed\\\":false",
    "\\\"rawJsonExposed\\\":false",
    "\\\"debugMaterialExposed\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V310 replay timeline view model");
  }
});

check("product UI script renders V310 replay timeline cards", () => {
  for (const snippet of [
    "renderV310ReplayTimelineUi",
    "opsV310ReplayTimelineSummary",
    "opsV310ReplayTimelineBadges",
    "opsV310ReplayTimelineRows",
    "replayTimeline",
    "media-server.ops.v310-replay-timeline-ui.v1",
    "timelinePoints",
    "playbackSegments",
    "eventFrame",
    "representativeImage",
    "frameBundle",
    "encodedClip",
    "frameRefPtsMapping",
    "encodedClipMediaPath",
    "sourceUrlExposed",
    "rawJsonExposed",
    "debugMaterialExposed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V310 replay timeline UI script");
    assertIncludes(extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi"), "media-server.ops.v310-replay-timeline-ui.v1", "UI-060 block-scoped canonical product state");
    assert(extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi").includes("replayTimeline.sourceUrlExposed === false &&") && extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi").includes("replayTimeline.rawJsonExposed === false &&") && extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi").includes("replayTimeline.debugMaterialExposed === false"), "UI-060 redaction false-state oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi").includes(marker)), "UI-060 client-viewer-boundary explicit absence oracle");
    assertIncludes(files.pageScript, "/ops/events", "UI-060 canonical route obligation");
  }
});

check("V310 replay timeline UI has responsive event frame and encoded clip styling", () => {
  for (const snippet of [
    ".v310-replay-timeline-ui",
    ".v310-replay-timeline-results",
    ".v310-replay-timeline-card",
    ".v310-replay-artifact-grid",
    ".v310-replay-timeline-rail",
    ".v310-replay-timeline-point",
    ".v310-replay-playback-segments",
  ]) {
    assertIncludes(files.css, snippet, "V310 replay timeline CSS");
  }
});

check("ops static smoke tracks V310 replay timeline markers", () => {
  for (const snippet of [
    'data-testid="ops-v310-replay-timeline-ui"',
    'visualSelector: \'[data-testid="ops-v310-replay-timeline-ui"]\'',
    'id="opsV310ReplayTimelineRows"',
    "replayTimeline",
    "media-server.ops.v310-replay-timeline-ui.v1",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["UI-060","OPS-063","SAFE-095"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["FrameRef/PTS","event frame","source URL"],
    command, script: "verify_v310_replay_timeline_ui.mjs", featureIds: ["UI-060","OPS-063","SAFE-095"],
    inventory: files.featureInventory, implementation: files.implementationManifest,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  assert(files.implementationManifest.items?.filter(item => item.id === "SAFE-095").length === 1 && files.implementationManifest.items.find(item => item.id === "SAFE-095")?.verifierEvidence?.command === "verify-auth-routes", "SAFE-095 독립 검사 연결 불일치");
});


check("server entrypoint and inventory verifiers include V310-S03 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v310_replay_timeline_ui.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage verifier");
  for (const id of ["UI-060", "OPS-063", "SAFE-095"]) assert(files.implementationManifest.items?.find(item => item.id === id)?.verifierEvidence?.command === (id === "SAFE-095" ? "verify-auth-routes" : command), `implementation manifest ${id} verifier command drift`);
  assertIncludes(files.projectInventoryVerifier, "UI-060", "project inventory verifier UI-060");
  assertIncludes(files.projectInventoryVerifier, "OPS-063", "project inventory verifier OPS-063");
  assertIncludes(files.projectInventoryVerifier, "SAFE-095", "project inventory verifier SAFE-095");
  assertIncludes(files.scriptInventory, "verify_v310_replay_timeline_ui.mjs", "script inventory");
});

check("SAFE-095 canonical replay timeline boundary", () => {
  const replayBlock = extractNamedFunctionBlock(files.pageScript, "renderV310ReplayTimelineUi");
  const redactionFalseStateObserved = replayBlock.includes("replayTimeline.sourceUrlExposed === false &&") && replayBlock.includes("replayTimeline.rawJsonExposed === false &&") && replayBlock.includes("replayTimeline.debugMaterialExposed === false");
  const viewerClientExposureAdded = replayBlock.includes("/client/api/");
  const safe095BoundaryObserved = redactionFalseStateObserved && viewerClientExposureAdded === false && replayBlock.includes("replayTimeline") && files.server.includes("/ops/events");
  assert(safe095BoundaryObserved && redactionFalseStateObserved && viewerClientExposureAdded === false,
    "verify-v310-replay-timeline-ui replayTimeline must bind redaction false-state and remain Ops-only");
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 replay timeline UI summary ==");
console.log("- schema: media-server.ops.v310-replay-timeline-ui.v1");
console.log("- step: V310-S03");
console.log("- route: /ops/events");
console.log("- artifacts: eventFrame, representativeImage, frameBundle, encodedClip");
console.log("- frameRefPtsMapping: rendered");
console.log("- encodedClipPlayback: UI timeline/status only");
console.log("- clientDigest: not-run-by-this-command");
console.log("- scopedIntegratorApi: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
