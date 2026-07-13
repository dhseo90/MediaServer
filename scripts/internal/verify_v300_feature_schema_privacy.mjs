#!/usr/bin/env node
// 파일 용도: v3.0.0 S03 Feature Schema and Privacy Policy 문서, fixture, verifier wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Feature Schema and Privacy Policy verification

Usage:
  ./server.sh verify-v300-feature-schema-privacy

Checks:
  - docs/event-feature-schema-privacy.md defines V300-S03 feature envelope, namespace, privacy, and identity prohibition policy
  - fixture contains allowed non-identifying features and rejected identity feature examples
  - privacy guard rejects raw prompts, raw provider responses, identity matches, face embeddings, watchlists, and searchable identity material
  - roadmap, stream verification, feature inventory, release records, docs index, and server entrypoint are wired
  - PASS is limited to schema/privacy policy evidence and does not imply VLM queue/runtime/provider success, search UI, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const command = "verify-v300-feature-schema-privacy";
const fixturePath = "test/fixtures/event_feature_schema_privacy/feature_set_sample.json";

const files = {
  policy: readText("docs/event-feature-schema-privacy.md"),
  docsIndex: readText("docs/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  server: readText("server.sh"),
  featureSource: readText("src/analysis/vlm_feature_queue.cpp"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
};
const fixture = JSON.parse(readText(fixturePath));

check("product FeatureSet projection owns the schema and privacy boundary", () => {
  const featureSetBlock = extractCppFunctionBlock(files.featureSource, "std::string BuildVlmFeatureSetFixtureJson(");
  const opsEventsUiAdded = featureSetBlock.includes("/ops/events");
  const runtimeProviderCallPerformed = exactBooleanFlagValue(featureSetBlock, "runtimeProviderCallPerformed");
  assert(featureSetBlock.includes("media-server.event-feature-set.v1") && opsEventsUiAdded === false && runtimeProviderCallPerformed === false, "LAB-083 FeatureSet schema must not add /ops/events UI or provider/runtime calls");
  for (const snippet of [
    "BuildVlmFeatureSetFixtureJson",
    "media-server.event-feature-set.v1",
    "feature-only-structured-non-identifying",
    "identityFeaturesAllowed\\\":false",
    "rawPromptStored\\\":false",
    "rawProviderResponseStored\\\":false",
  ]) {
    assert(files.featureSource.includes(snippet), `product FeatureSet projection missing: ${snippet}`);
  }
});

check("policy document defines V300-S03 feature and privacy boundary", () => {
  for (const snippet of [
    "v3.0.0 `V300-S03 Feature Schema and Privacy Policy`",
    "FeatureSet",
    "Feature Envelope",
    "Allowed Namespace Matrix",
    "Disallowed Identity Matrix",
    "Privacy Guard",
    "`appearance`",
    "`action`",
    "`scene`",
    "`spatial`",
    "`event`",
    "`operator`",
    "`embedding`",
    "raw LLM/VLM prompt",
    "raw provider response",
    "face embedding",
    "watchlist",
    "license plate",
    "UI 풀테스트, 30분/120분 longrun, published",
  ]) {
    assert(files.policy.includes(snippet), `policy document missing snippet: ${snippet}`);
  }
});

check("fixture exposes stable feature envelope and evidence provenance", () => {
  assert(fixture.schema === "media-server.event-feature-set.v1", `unexpected schema ${fixture.schema}`);
  assert(fixture.policyVersion === 1, "policyVersion must be 1");
  for (const field of ["eventId", "sourceId", "channelId", "featureSetId", "createdAtMs"]) {
    assert(fixture[field] !== undefined && fixture[field] !== "", `fixture missing ${field}`);
  }
  assert(fixture.evidenceRefs?.schema === "media-server.vlm-event-evidence-refs.v1", "fixture must reference existing evidence refs schema");
  assert(typeof fixture.evidenceRefs?.evidenceManifest === "string" && fixture.evidenceRefs.evidenceManifest.endsWith("evidence-manifest.json"), "fixture must reference evidence manifest");
  assert(fixture.provenance?.runtimeMode === "fixture-only-no-provider-call", "fixture must avoid runtime/provider calls");
  assert(fixture.provenance?.rawPromptStored === false, "rawPromptStored must be false");
  assert(fixture.provenance?.rawProviderResponseStored === false, "rawProviderResponseStored must be false");
});

check("allowed feature namespaces stay non-identifying", () => {
  const namespaces = new Set();
  const features = arrayAt(fixture, "features");
  assert(features.length >= 7, "fixture must contain representative allowed features");
  for (const feature of features) {
    assert(typeof feature.featureId === "string" && feature.featureId.length > 0, "featureId is required");
    assert(typeof feature.namespace === "string" && feature.namespace.length > 0, `${feature.featureId} missing namespace`);
    namespaces.add(feature.namespace);
    assert(typeof feature.name === "string" && feature.name.length > 0, `${feature.featureId} missing name`);
    assert(["string", "number", "boolean", "enum", "object", "array"].includes(feature.valueType), `${feature.featureId} invalid valueType`);
    assert(feature.identityRisk === "non-identifying", `${feature.featureId} must be non-identifying`);
    assert(feature.searchable === true, `${feature.featureId} must be searchable in the fixture`);
    assert(Number.isFinite(feature.confidence) && feature.confidence >= 0 && feature.confidence <= 1, `${feature.featureId} confidence must be 0..1`);
    assert(typeof feature.uncertainty === "string" && feature.uncertainty.length > 0, `${feature.featureId} missing uncertainty`);
    assert(typeof feature.evidenceRef === "string" && feature.evidenceRef.length > 0, `${feature.featureId} missing evidenceRef`);
    assert(feature.rawPromptFragmentStored === false, `${feature.featureId} must not store raw prompt fragments`);
    assert(feature.rawProviderResponseFragmentStored === false, `${feature.featureId} must not store raw response fragments`);
    assert(!containsForbiddenIdentityText(JSON.stringify(feature)), `${feature.featureId} contains forbidden identity material`);
  }
  for (const namespace of ["appearance", "action", "scene", "spatial", "event", "operator", "embedding"]) {
    assert(namespaces.has(namespace), `fixture missing allowed namespace ${namespace}`);
  }
});

check("disallowed identity matrix is explicit and enforced by the fixture", () => {
  const disallowed = arrayAt(fixture, "privacy.disallowedIdentityFeatures");
  const names = new Set(disallowed.map(item => item.name));
  for (const name of [
    "personName",
    "accountIdentity",
    "faceRecognitionMatch",
    "faceEmbedding",
    "watchlistMatch",
    "longTermPersonReIdentification",
    "idCardNumber",
    "phoneNumber",
    "licensePlateIdentity",
  ]) {
    assert(names.has(name), `privacy disallowed matrix missing ${name}`);
  }
  for (const item of disallowed) {
    assert(item.allowed === false, `${item.name} must be disallowed`);
    assert(item.searchable === false, `${item.name} must not be searchable`);
    assert(typeof item.reason === "string" && item.reason.length > 0, `${item.name} missing reason`);
  }
  assert(fixture.privacy?.identityFeaturesAllowed === false, "identityFeaturesAllowed must be false");
  assert(fixture.privacy?.faceRecognitionAllowed === false, "faceRecognitionAllowed must be false");
  assert(fixture.privacy?.watchlistAllowed === false, "watchlistAllowed must be false");
  assert(fixture.privacy?.faceEmbeddingStored === false, "faceEmbeddingStored must be false");
  assert(fixture.privacy?.rawPromptStored === false, "rawPromptStored must be false");
  assert(fixture.privacy?.rawProviderResponseStored === false, "rawProviderResponseStored must be false");
  assert(fixture.privacy?.durableRetentionMode === "feature-only-structured-non-identifying", "durable retention must be feature-only");
});

check("docs index, roadmap, and stream verification expose V300-S03 schema/privacy gate", () => {
  assert(files.docsIndex.includes("[event-feature-schema-privacy.md](event-feature-schema-privacy.md)"), "docs index missing event feature schema privacy document");
  for (const snippet of [
    "| 3 | V300-S03 | P0 | 완료 | Feature Schema and Privacy Policy |",
    "namespace 기반 feature envelope, 비식별 feature 허용, identity feature 금지",
    "docs/event-feature-schema-privacy.md",
    fixturePath,
    "`./server.sh verify-v300-feature-schema-privacy`",
    "얼굴 인식/신원 식별/model 품질 PASS가 아님",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V300-S03 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S03 | `./server.sh verify-v300-feature-schema-privacy` |",
    "FeatureSet envelope, allowed/disallowed matrix, privacy guard",
    "VLM queue/runtime/provider success, Search DSL, `/ops/events` UI",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V300-S03 to LAB-083, SAFE-085, and OPS-053", () => {
  for (const snippet of [
    "V300-S03 Feature Schema and Privacy Policy | `LAB-083`, `SAFE-085`, `OPS-053` | `verify-v300-feature-schema-privacy`",
    "LAB-083 | V300-S03 feature schema fixture",
    "SAFE-085 | V300-S03 privacy and identity boundary",
    "OPS-053 | V300-S03 feature schema privacy 게이트",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 Feature Schema and Privacy Policy",
    "`./server.sh verify-v300-feature-schema-privacy`",
    "v300 S03 RED feature schema privacy gate",
    "v300 S03 feature schema privacy final",
    "v300 S03 VLM queue/runtime/provider",
    "v300 S03 Search/UI/longrun/published",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V300-S03 command", () => {
  assert(files.server.includes("verify-v300-feature-schema-privacy"), "server.sh missing V300-S03 command");
  assert(files.server.includes("verify_v300_feature_schema_privacy.mjs"), "server.sh missing V300-S03 script dispatch");
  for (const id of ["LAB-083", "SAFE-064", "SAFE-085", "OPS-053"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v300-feature-schema-privacy", `${id} manifest verifier command drift`);
  }
  assert(files.featureCoverageVerifier.includes("validateImplementationManifest") && files.featureCoverageVerifier.includes("verifierEvidenceRows"), "feature coverage must validate manifest-backed verifier evidence");
  assert(files.projectInventoryVerifier.includes("LAB-083") && files.projectInventoryVerifier.includes("SAFE-085") && files.projectInventoryVerifier.includes("OPS-053"), "project inventory verifier missing V300-S03 IDs");
});

check("SAFE-085 canonical feature privacy boundary", () => {
  const privacyCommandDocumented = files.server.includes("verify-v300-feature-schema-privacy");
  const schemaMutationPerformed = files.featureSource.includes("event_post_payload_changed = true") ||
    files.featureSource.includes("webrtc_data_channel_schema_changed = true");
  const safe085BoundaryObserved = privacyCommandDocumented &&
    files.featureSource.includes("raw_prompt_stored = false") && schemaMutationPerformed === false;
  assert(safe085BoundaryObserved && schemaMutationPerformed === false,
    "verify-v300-feature-schema-privacy VLM/WebRTC/SSE schema mutation must remain absent");
});

const results = runChecks();

console.log("");
console.log("== v3.0.0 feature schema privacy summary ==");
console.log("- schema: media-server.event-feature-set.v1");
console.log("- step: V300-S03");
console.log(`- fixture: ${fixturePath}`);
console.log("- rawPromptStored: false");
console.log("- rawProviderResponseStored: false");
console.log("- identityFeaturesAllowed: false");
console.log("- featureRetention: structured-non-identifying-feature-only");
console.log("- vlmRuntimeProviderCall: not-run-by-this-command");
console.log("- searchDslOrOpsEventsUi: not-run-by-this-command");
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

function arrayAt(value, dottedPath) {
  let cursor = value;
  for (const part of dottedPath.split(".")) {
    cursor = cursor?.[part];
  }
  assert(Array.isArray(cursor), `${dottedPath} must be an array`);
  return cursor;
}

function containsForbiddenIdentityText(text) {
  return /personName|accountIdentity|faceRecognitionMatch|faceEmbedding|watchlistMatch|longTermPersonReIdentification|idCardNumber|phoneNumber|licensePlateIdentity/i.test(text);
}
