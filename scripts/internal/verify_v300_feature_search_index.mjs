#!/usr/bin/env node
// 파일 용도: v3.0.0 S07 Feature/Search Index 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Feature/Search Index verification

Usage:
  ./server.sh verify-v300-feature-search-index

Checks:
  - V300-S07 fixture covers EventRecord, FeatureSet, EvidenceManifest, and operator review projection
  - analysis/event_feature_search_index builds a local index report without provider/vector/UI side effects
  - analysis-state smoke includes S07 projection, latest revision, orphan/privacy guard, and rebuild stale result guard
  - docs/backlog/stream verification/release records/feature inventory/server dispatch are wired
  - PASS is limited to V300-S07 Feature/Search Index evidence and does not imply /ops/events UI, vector search, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-feature-search-index";
const fixturePath = "test/fixtures/v300_feature_search_index/cases.json";
const files = {
  header: readText("include/analysis/event_feature_search_index.h"),
  source: readText("src/analysis/event_feature_search_index.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  policy: readText("docs/v300-feature-search-index.md"),
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

check("fixture covers V300-S07 feature/search index matrix", () => {
  assert(fixture.schema === "media-server.v300-feature-search-index-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V300-S07", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "event-feature-evidence-review-projection",
    "latest-feature-revision-only",
    "orphan-and-privacy-guard",
    "rebuild-stale-result-guard",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expected?.status, `${item.id}: expected status missing`);
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
    assert(item.contractInvariants?.runtimeProviderCallPerformed === false, `${item.id}: provider call must be false`);
    assert(item.contractInvariants?.vectorSearchPerformed === false, `${item.id}: vector search must be false`);
    assert(item.contractInvariants?.opsEventsUiRequired === false, `${item.id}: ops UI requirement must be false`);
    assert(item.contractInvariants?.eventPostPayloadChanged === false, `${item.id}: Event POST payload must not change`);
    assert(item.contractInvariants?.rtspWebrtcMediaPathChanged === false, `${item.id}: media path must not change`);
  }
});

check("analysis module exposes local index projection, report, and stale guard", () => {
  for (const snippet of [
    "struct EventSearchIndexEventRecord",
    "struct EventSearchIndexFeatureSet",
    "struct EventSearchIndexEvidenceManifest",
    "struct EventSearchIndexReviewState",
    "struct EventSearchIndexReport",
    "class EventFeatureSearchIndex",
    "EventFeatureSearchIndex::Rebuild",
    "EventFeatureSearchIndex::Search",
    "EventFeatureSearchIndexReportJson",
    "media-server.v300-feature-search-index-report.v1",
    "stale_result_guard_active",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `index module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "runtime_provider_call_performed = false",
    "vector_search_performed = false",
    "ops_events_ui_required = false",
    "event_post_payload_changed = false",
    "rtsp_webrtc_media_path_changed = false",
    "viewer_client_exposure_added = false",
  ]) {
    assert(files.source.includes(snippet), `index source missing invariant: ${snippet}`);
  }
});

check("analysis-state smoke verifies S07 behavior and build links module", () => {
  for (const snippet of [
    "VerifyV300FeatureSearchIndex",
    "V300 S07 indexes EventRecord FeatureSet EvidenceManifest and review state",
    "V300 S07 indexes only latest FeatureSet revision",
    "V300 S07 skips orphan and privacy rejected records",
    "V300 S07 rebuild clears stale search results",
    "V300 S07 preserves provider/schema/media/UI boundary invariants",
  ]) {
    assert(files.smoke.includes(snippet), `analysis_state_smoke missing S07 snippet: ${snippet}`);
  }
  assert(files.smokeBuild.includes("src/analysis/event_feature_search_index.cpp"), "analysis smoke build missing event_feature_search_index.cpp");
  assert(files.cmake.includes("src/analysis/event_feature_search_index.cpp"), "CMake missing event_feature_search_index.cpp");
});

check("docs and roadmap expose V300-S07 scope without overclaim", () => {
  for (const snippet of [
    "v3.0.0 `V300-S07 Feature/Search Index`",
    "media-server.v300-feature-search-index-report.v1",
    "EventRecord",
    "FeatureSet revision",
    "EvidenceManifest",
    "operator review state",
    "stale result guard",
    "`/ops/events` UI",
    "vector search",
  ]) {
    assert(files.policy.includes(snippet), `policy doc missing snippet: ${snippet}`);
  }
  assert(files.docsIndex.includes("[v300-feature-search-index.md](v300-feature-search-index.md)"), "docs index missing S07 doc");
  for (const snippet of [
    "| 7 | V300-S07 | P1 | 완료 | Feature/Search Index |",
    "EventRecord, FeatureSet, EvidenceManifest, operator review state 검색",
    "docs/v300-feature-search-index.md",
    "`./server.sh verify-v300-feature-search-index`",
    "`/ops/events` UI나 vector search evidence가 아님",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V300-S07 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S07 | `./server.sh verify-v300-feature-search-index` |",
    "Search across EventRecord, FeatureSet, EvidenceManifest, and operator review state",
    "`/ops/events` UI, vector search, semantic provider rerank",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing V300-S07 snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V300-S07 to LAB-087, SAFE-089, and OPS-057", () => {
  for (const snippet of [
    "V300-S07 Feature/Search Index | `LAB-087`, `SAFE-089`, `OPS-057` | `verify-v300-feature-search-index`, `verify-analysis-state`",
    "LAB-087 | V300-S07 feature/search index fixture",
    "SAFE-089 | V300-S07 search index privacy and boundary",
    "OPS-057 | V300-S07 feature/search index 게이트",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 Feature/Search Index",
    "`./server.sh verify-v300-feature-search-index`",
    "v300 S07 RED feature/search index gate",
    "v300 S07 feature/search index final",
    "v300 S07 UI/vector/longrun/published",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V300-S07 command", () => {
  assert(files.server.includes(command), "server.sh missing V300-S07 command");
  assert(files.server.includes("verify_v300_feature_search_index.mjs"), "server.sh missing V300-S07 script dispatch");
  assert(files.featureCoverageVerifier.includes(command), "feature coverage verifier missing V300-S07 command");
  assert(files.projectInventoryVerifier.includes("LAB-087") &&
    files.projectInventoryVerifier.includes("SAFE-089") &&
    files.projectInventoryVerifier.includes("OPS-057"), "project inventory verifier missing V300-S07 IDs");
  assert(files.scriptInventory.includes("verify_v300_feature_search_index.mjs"), "script inventory missing V300-S07 verifier");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 feature/search index summary ==");
console.log("- schema: media-server.v300-feature-search-index-fixtures.v1");
console.log("- step: V300-S07");
console.log(`- fixture: ${fixturePath}`);
console.log("- projectionSources: EventRecord, FeatureSet, EvidenceManifest, operatorReviewState");
console.log("- searchDsl: media-server.event-search-dsl.v1");
console.log("- staleResultGuard: rebuild-clears-previous-entries");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- vectorSearch: not-run-by-this-command");
console.log("- opsEventsUi: not-run-by-this-command");
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
