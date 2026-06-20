#!/usr/bin/env node
// 파일 용도: v3.0.0 S05 Feature-only Retention 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Feature-only Retention verification

Usage:
  ./server.sh verify-v300-feature-only-retention

Checks:
  - V300-S05 fixture covers feature revision store, raw prompt/response rejection, and reanalysis revision policy
  - analysis/vlm_feature_retention stores only structured FeatureSet revisions without raw prompt/response/provider material
  - analysis-state smoke includes S05 retention behavior
  - docs/backlog/stream verification/release records/feature inventory/server dispatch are wired
  - PASS is limited to V300-S05 feature-only retention evidence and does not imply Search DSL, cleanup lifecycle, UI, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-feature-only-retention";
const fixturePath = "test/fixtures/v300_feature_only_retention/cases.json";
const files = {
  header: readText("include/analysis/vlm_feature_retention.h"),
  source: readText("src/analysis/vlm_feature_retention.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  policy: readText("docs/v300-feature-only-retention.md"),
  docsIndex: readText("docs/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  server: readText("server.sh"),
  cmake: readText("CMakeLists.txt"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("fixture covers V300-S05 feature-only retention matrix", () => {
  assert(fixture.schema === "media-server.v300-feature-only-retention-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V300-S05", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "store-feature-revision-only",
    "reject-raw-prompt",
    "reject-raw-provider-response",
    "reject-provider-request-body",
    "reject-source-url-evidence-ref",
    "reject-credential-evidence-ref",
    "reject-raw-frame-bytes",
    "reanalysis-new-revision",
    "preserve-previous-revision",
    "reject-stale-reanalysis-revision",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expected?.status, `${item.id}: expected status missing`);
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
    assert(item.contractInvariants?.providerRequestBodyStored === false, `${item.id}: provider request body must not be stored`);
    assert(item.contractInvariants?.credentialStored === false, `${item.id}: credential must not be stored`);
    assert(item.contractInvariants?.sourceUrlStored === false, `${item.id}: source URL must not be stored`);
    assert(item.contractInvariants?.runtimeProviderReplayPerformed === false, `${item.id}: provider replay must not be performed`);
    assert(item.contractInvariants?.eventPostPayloadChanged === false, `${item.id}: Event POST payload must not change`);
    assert(item.contractInvariants?.webrtcDataChannelSchemaChanged === false, `${item.id}: WebRTC schema must not change`);
    assert(item.contractInvariants?.sseWsMetadataSchemaChanged === false, `${item.id}: SSE/WS schema must not change`);
    assert(item.contractInvariants?.rtspWebrtcMediaPathChanged === false, `${item.id}: media path must not change`);
  }
});

check("analysis module exposes feature revision store and raw-material guard", () => {
  for (const snippet of [
    "struct VlmFeatureRetentionRequest",
    "struct VlmFeatureRetentionOutcome",
    "class VlmFeatureRetentionStore",
    "StoreRevision",
    "RequestReanalysis",
    "HasRawRetentionMaterial",
    "media-server.vlm-feature-retention-outcome.v1",
    "media-server.vlm-feature-retention-record.v1",
    "feature-only-structured-non-identifying",
    "reject-raw-provider-material",
    "store-reanalysis-revision",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `retention module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "raw_prompt_stored = false",
    "raw_provider_response_stored = false",
    "provider_request_body_stored = false",
    "credential_stored = false",
    "source_url_stored = false",
    "runtime_provider_replay_performed = false",
    "event_post_payload_changed = false",
    "webrtc_data_channel_schema_changed = false",
    "sse_ws_metadata_schema_changed = false",
    "rtsp_webrtc_media_path_changed = false",
  ]) {
    assert(files.source.includes(snippet), `retention source missing invariant: ${snippet}`);
  }
});

check("analysis-state smoke verifies S05 behavior and build links module", () => {
  for (const snippet of [
    "VerifyV300FeatureOnlyRetention",
    "V300 S05 stores feature-only revision without raw prompt or response",
    "V300 S05 rejects raw prompt retention material",
    "V300 S05 rejects raw provider response retention material",
    "V300 S05 rejects raw evidence reference retention material",
    "V300 S05 rejects raw provider request bodies with whitespace",
    "V300 S05 reanalysis creates a new revision without provider replay",
    "V300 S05 previous revision is preserved for review history",
    "V300 S05 stale reanalysis revision is rejected",
  ]) {
    assert(files.smoke.includes(snippet), `analysis_state_smoke missing S05 snippet: ${snippet}`);
  }
  assert(files.smokeBuild.includes("src/analysis/vlm_feature_retention.cpp"), "analysis smoke build missing vlm_feature_retention.cpp");
  assert(files.cmake.includes("src/analysis/vlm_feature_retention.cpp"), "CMake missing vlm_feature_retention.cpp");
});

check("docs and roadmap expose V300-S05 feature-only retention scope without overclaim", () => {
  for (const snippet of [
    "v3.0.0 `V300-S05 Feature-only Retention`",
    "feature revision store",
    "raw prompt/response non-retention",
    "reanalysis policy",
    "raw provider response",
    "provider replay",
    "Search DSL",
    "Retention/Pin/Cleanup",
  ]) {
    assert(files.policy.includes(snippet), `policy doc missing snippet: ${snippet}`);
  }
  assert(files.docsIndex.includes("[v300-feature-only-retention.md](v300-feature-only-retention.md)"), "docs index missing S05 doc");
  for (const snippet of [
    "| 5 | V300-S05 | P0 | 완료 | Feature-only Retention |",
    "raw prompt/response non-retention, feature revision, reanalysis policy",
    "docs/v300-feature-only-retention.md",
    "`./server.sh verify-v300-feature-only-retention`",
    "raw response 보관이나 provider replay evidence가 아님",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V300-S05 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S05 | `./server.sh verify-v300-feature-only-retention` |",
    "Feature-only durable retention, raw prompt/response rejection, FeatureSet revision store, reanalysis revision policy",
    "Search DSL, Retention/Pin/Cleanup, `/ops/events` UI",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing V300-S05 snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V300-S05 to LAB-085, SAFE-087, and OPS-055", () => {
  for (const snippet of [
    "V300-S05 Feature-only Retention | `LAB-085`, `SAFE-087`, `OPS-055` | `verify-v300-feature-only-retention`, `verify-analysis-state`",
    "LAB-085 | V300-S05 feature-only retention fixture",
    "SAFE-087 | V300-S05 raw prompt/response non-retention boundary",
    "OPS-055 | V300-S05 feature-only retention 게이트",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 Feature-only Retention",
    "`./server.sh verify-v300-feature-only-retention`",
    "v300 S05 RED feature-only retention gate",
    "v300 S05 feature-only retention final",
    "v300 S05 search/UI/cleanup/longrun/published",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V300-S05 command", () => {
  assert(files.server.includes(command), "server.sh missing V300-S05 command");
  assert(files.server.includes("verify_v300_feature_only_retention.mjs"), "server.sh missing V300-S05 script dispatch");
  assert(files.featureCoverageVerifier.includes(command), "feature coverage verifier missing V300-S05 command");
  assert(files.projectInventoryVerifier.includes("LAB-085") &&
    files.projectInventoryVerifier.includes("SAFE-087") &&
    files.projectInventoryVerifier.includes("OPS-055"), "project inventory verifier missing V300-S05 IDs");
  assert(files.scriptInventory.includes("verify_v300_feature_only_retention.mjs"), "script inventory missing V300-S05 verifier");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 feature-only retention summary ==");
console.log("- schema: media-server.v300-feature-only-retention-fixtures.v1");
console.log("- step: V300-S05");
console.log(`- fixture: ${fixturePath}`);
console.log("- featureRevisionStore: fixture-and-analysis-smoke");
console.log("- rawPromptResponseRetention: rejected");
console.log("- reanalysisPolicy: new-revision-without-provider-replay");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- searchDslOrOpsEventsUi: not-run-by-this-command");
console.log("- retentionCleanupLifecycle: not-run-by-this-command");
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
