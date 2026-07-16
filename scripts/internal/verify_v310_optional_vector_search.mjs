#!/usr/bin/env node
// 파일 용도: v3.1.0 S07 Optional Vector Search 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Optional Vector Search verification

Usage:
  ./server.sh verify-v310-optional-vector-search

Checks:
  - V310-S07 fixture covers default-off, explicit enablement, quality gates, privacy rejection, and rebuild stale-result guard
  - EventFeatureSearchIndex exposes optional vector index/search APIs without changing the v3.0 text/filter search contract
  - analysis-state smoke verifies default-off behavior, quality gates, non-identifying embedding policy, and stale vector cleanup
  - roadmap, stream verification, release records, feature inventory, and server dispatch are wired
  - PASS is limited to V310-S07 local optional vector evidence and does not imply UI 풀테스트, 30분/120분, provider embedding calls, client exposure, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-optional-vector-search";
const fixturePath = "test/fixtures/v310_optional_vector_search/cases.json";
const files = {
  header: readText("include/analysis/event_feature_search_index.h"),
  source: readText("src/analysis/event_feature_search_index.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  server: readText("server.sh"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("fixture covers V310-S07 optional vector matrix", () => {
  assert(fixture.schema === "media-server.v310-optional-vector-search-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V310-S07", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "default-off-no-vector-index",
    "enabled-quality-gated-vector-search",
    "rebuild-clears-stale-vector-results",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
    assert(item.contractInvariants?.runtimeProviderCallPerformed === false, `${item.id}: provider call must be false`);
    assert(item.contractInvariants?.faceEmbeddingIndexed === false, `${item.id}: face embedding must not be indexed`);
    assert(item.contractInvariants?.identityEmbeddingIndexed === false, `${item.id}: identity embedding must not be indexed`);
    assert(item.contractInvariants?.eventPostPayloadChanged === false, `${item.id}: Event POST payload must not change`);
    assert(item.contractInvariants?.rtspWebrtcMediaPathChanged === false, `${item.id}: media path must not change`);
    assert(item.contractInvariants?.viewerClientExposureAdded === false, `${item.id}: viewer/client exposure must not change`);
  }
});

check("analysis module exposes optional vector index API and report", () => {
  const optionalVectorBlock = extractCppFunctionBlock(files.source, "EventOptionalVectorIndexReport EventFeatureSearchIndex::RebuildOptionalVectorIndex(");
  const viewerClientExposureAdded = optionalVectorBlock.includes("viewerClientExposureAdded");
  assert(optionalVectorBlock.includes("optional-vector-index-disabled-default-off") && viewerClientExposureAdded === false, "LAB-089 optional vector default-off must not add client/viewer exposure");
  for (const snippet of [
    "struct EventOptionalVectorEmbedding",
    "struct EventOptionalVectorIndexOptions",
    "struct EventOptionalVectorSearchQuery",
    "struct EventOptionalVectorSearchResult",
    "struct EventOptionalVectorSearchOutput",
    "struct EventOptionalVectorIndexReport",
    "RebuildOptionalVectorIndex",
    "SearchOptionalVector",
    "OptionalVectorReport",
    "EventOptionalVectorIndexReportJson",
    "media-server.v310-optional-vector-search-report.v1",
    "default_off",
    "quality_gate_active",
    "identity_embeddings_rejected",
  ]) {
    assertIncludes(`${files.header}\n${files.source}`, snippet, "optional vector index API");
  }
});

check("analysis source keeps provider, identity, schema, media, and client boundaries closed", () => {
  for (const snippet of [
    "runtime_provider_call_performed = false",
    "raw_prompt_stored = false",
    "raw_provider_response_stored = false",
    "event_post_payload_changed = false",
    "rtsp_webrtc_media_path_changed = false",
    "viewer_client_exposure_added = false",
    "face_embedding",
    "identity_embedding",
    "quality_rejected_embeddings",
    "dimension_rejected_embeddings",
    "orphan_embeddings_skipped",
  ]) {
    assertIncludes(files.source, snippet, "optional vector boundary source");
  }
});

check("analysis-state smoke verifies S07 default-off, quality gate, and stale vector guard", () => {
  for (const snippet of [
    "VerifyV310OptionalVectorSearch",
    "V310 S07 keeps optional vector search default-off",
    "V310 S07 indexes only explicit non-identifying quality embeddings",
    "V310 S07 ranks optional vector results without provider calls",
    "V310 S07 rebuild clears stale vector entries",
    "V310 S07 preserves schema/media/client boundaries",
  ]) {
    assertIncludes(files.smoke, snippet, "analysis_state_smoke V310-S07");
  }
  assertIncludes(files.smokeBuild, "src/analysis/event_feature_search_index.cpp", "analysis smoke build");
});

check("docs and roadmap expose V310-S07 scope without overclaim", () => {
  for (const snippet of [
    "| 7 | V310-S07 | P2 | 완료 | Optional Vector Search |",
    "default-off embedding index",
    "quality gates",
    "`./server.sh verify-v310-optional-vector-search`",
    "provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, published metadata evidence가 아님",
    "## v3.1.0 S07 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S07");
  }
  for (const snippet of [
    "| V310-S07 | `./server.sh verify-v310-optional-vector-search` |",
    "default-off optional embedding index",
    "quality gate",
    "provider embedding calls",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S07");
  }
});

check("feature inventory and release records map V310-S07", () => {
  for (const snippet of [
    "V310-S07 Optional Vector Search | `LAB-089`, `SAFE-100`, `OPS-067` | `verify-v310-optional-vector-search`, `verify-analysis-state`",
    "LAB-089 | V310-S07 optional vector search fixture",
    "SAFE-100 | V310-S07 optional vector search boundary",
    "OPS-067 | V310-S07 Optional Vector Search 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S07");
  }
  for (const snippet of [
    "V310 Optional Vector Search",
    "`./server.sh verify-v310-optional-vector-search`",
    "v310 S07 RED optional vector search gate",
    "v310 S07 optional vector search final",
    "v310 S07 UI/provider/longrun/published",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records V310-S07");
  }
});

check("server entrypoint and inventory verifiers include V310-S07 command", () => {
  assertIncludes(files.server, command, "server.sh command");
  assertIncludes(files.server, "verify_v310_optional_vector_search.mjs", "server.sh script dispatch");
  for (const id of ["LAB-089", "SAFE-100", "OPS-067"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.projectInventoryVerifier, "LAB-089", "project inventory verifier LAB-089");
  assertIncludes(files.projectInventoryVerifier, "SAFE-100", "project inventory verifier SAFE-100");
  assertIncludes(files.projectInventoryVerifier, "OPS-067", "project inventory verifier OPS-067");
  assertIncludes(files.scriptInventory, "verify_v310_optional_vector_search.mjs", "script inventory");
});

check("SAFE-100 canonical optional vector boundary", () => {
  const providerCallPerformed = files.source.includes("provider_embedding_call_performed = true") || files.source.includes("runtime_provider_call_performed = true");
  const optionalIndexDefaultOff = files.source.includes("optional-vector-index-disabled-default-off");
  const optionalVectorInputsObserved = providerCallPerformed === false && optionalIndexDefaultOff;
  const safe100BoundaryObserved = optionalVectorInputsObserved && files.server.includes("verify-v310-optional-vector-search");
  assert(safe100BoundaryObserved && providerCallPerformed === false,
    "verify-v310-optional-vector-search optional-vector-index-disabled-default-off provider call and WebRTC/SSE/RTSP exposure must remain absent");
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 optional vector search summary ==");
console.log("- schema: media-server.v310-optional-vector-search-fixtures.v1");
console.log("- step: V310-S07");
console.log("- defaultOff: required");
console.log("- enablement: explicit local option only");
console.log("- qualityGate: min quality and dimension checks");
console.log("- identityPolicy: face/identity embeddings rejected");
console.log("- providerEmbeddingCalls: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, context) {
  assert(text.includes(snippet), `${context} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(name, fn) {
  checks.push({ name, fn });
}

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
      console.error(`[fail] ${item.name}: ${error.message}`);
    }
  }
  return { pass, fail };
}
