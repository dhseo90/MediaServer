#!/usr/bin/env node
// 파일 용도: V200-S05 VLM profile 저장 API/UI/문서/fixture 계약을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM profile storage verification

Usage:
  ./server.sh verify-vlm-profile-storage [options]

Checks:
  - AnalysisDocumentRegistry persists vlmProfiles with media-server.vlm-profile.v1 validation.
  - /ops/api/vlm/profiles CRUD routes are ops-read for reads and rule-write for writes.
  - /ops/vlm renders profile id, prompt profile, evaluation, activation, fallback/disable controls.
  - invalid profile fixture covers prompt/credential leak, cloud opt-in, and active-without-evaluation rejection.
  - docs, inventory, auth route smoke, server.sh, and script inventory are wired.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("registry persists VLM profiles with strict validation", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "VlmProfilesJson",
    "VlmProfileJson",
    "CreateVlmProfile",
    "UpsertVlmProfile",
    "DeleteVlmProfile",
    "LoadDocumentsLocked(\"vlmProfiles\"",
    "\"vlmProfiles\"",
    "PrepareVlmProfileDocumentLocked",
    "media-server.vlm-profile.v1",
    "media-server.vlm-profile-registry.v1",
    "selectedOptionId",
    "promptProfile.id",
    "evaluation.status",
    "activation.status",
    "cloudOptInAcknowledged",
    "ContainsForbiddenVlmProfileField",
    "ValidateVlmPrivacyGuardContract",
    "media-server.vlm-privacy-transfer-guard.v1",
    "privacyGuard",
    "externalTransferWarningAcknowledged",
    "providerLoggingPolicy",
    "loggingAndRetentionReviewed",
    "termsReviewed",
    "credentialMaterialStored",
    "promptStored",
    "rawProviderResponseStored",
    "sourceUrlStored",
    "rawFrameBytesStored",
    "runtimeVlmCallPerformed",
    "sidecarStored",
    "credentialStored",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "viewerClientExposureAdded",
  ]) {
    assert(server.includes(snippet), `server missing VLM profile storage snippet: ${snippet}`);
  }
  for (const forbidden of [
    "\"apiKey\"",
    "\"providerCredential\"",
    "\"rawPrompt\"",
    "\"rawResponse\"",
    "\"sourceLocator\"",
    "\"frameBytes\"",
  ]) {
    assert(server.includes(forbidden), `server missing forbidden VLM profile field guard: ${forbidden}`);
  }
});

check("ops API exposes guarded VLM profile CRUD routes", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "request.path == \"/ops/api/vlm/profiles\"",
    "std::string(\"/ops/api/vlm/profiles/\")",
    "OpsVlmProfilesJson()",
    "AnalysisRegistry().VlmProfileJson(id)",
    "AnalysisRegistry().CreateVlmProfile",
    "AnalysisRegistry().UpsertVlmProfile",
    "AnalysisRegistry().DeleteVlmProfile",
    "require_ops_principal",
    "require_rule_write_principal",
  ]) {
    assert(server.includes(snippet), `server missing VLM profile route snippet: ${snippet}`);
  }
  assert(!/\/client\/api\/vlm\/profiles/i.test(server), "client VLM profile API must not exist");
});

check("ops UI renders profile storage controls and saved profile table", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  for (const snippet of [
    "data-testid=\"ops-vlm-profile-panel\"",
    "id=\"opsVlmProfileId\"",
    "id=\"opsVlmPromptProfile\"",
    "id=\"opsVlmEvaluationStatus\"",
    "id=\"opsVlmActivationStatus\"",
    "id=\"opsVlmProfileEnabled\"",
    "id=\"opsVlmFallbackProfileId\"",
    "id=\"opsVlmDisabledReason\"",
    "id=\"opsVlmSaveProfile\"",
    "id=\"opsVlmProfileRows\"",
    "data-testid=\"ops-vlm-privacy-transfer-guard-panel\"",
    "id=\"opsVlmExternalTransferWarningAck\"",
    "id=\"opsVlmProviderLoggingReviewed\"",
  ]) {
    assert(server.includes(snippet), `server missing VLM profile UI snippet: ${snippet}`);
  }
  for (const snippet of [
    "refreshOpsVlmProfiles",
    "buildOpsVlmProfilePayload",
    "saveOpsVlmProfile",
    "deleteOpsVlmProfile",
    "/ops/api/vlm/profiles",
    "method: 'PUT'",
    "method: 'DELETE'",
    "profile-storage-only",
    "privacyGuard",
    "providerLoggingPolicy",
    "S05 profile 저장 가능",
  ]) {
    assert(script.includes(snippet), `page script missing VLM profile behavior snippet: ${snippet}`);
  }
});

check("invalid profile fixture covers rejection classes", () => {
  const fixturePath = "test/fixtures/vlm_profile_storage/invalid_profiles.json";
  const fixtureText = readText(fixturePath);
  const fixture = JSON.parse(fixtureText);
  assert(fixture.schema === "media-server.vlm-profile-invalid-fixtures.v1", "invalid fixture schema mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of ["raw-prompt-rejected", "cloud-opt-in-required", "active-requires-passed-evaluation", "cloud-provider-logging-review-required"]) {
    assert(ids.has(id), `invalid fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expectedError, `invalid fixture ${item.id} missing expectedError`);
    assert(item.profile && item.profile.schema === "media-server.vlm-profile.v1", `invalid fixture ${item.id} missing profile schema`);
  }
});

check("auth route smoke covers VLM profile read/write/invalid/delete boundaries", () => {
  const authRoutes = readText("scripts/internal/verify_auth_workflow.sh");
  for (const snippet of [
    "/ops/api/vlm/profiles",
    "unauth VLM profile API denied",
    "viewer VLM profile API denied",
    "readonly operator VLM profile read allowed",
    "rule write scope required for VLM profile write",
    "invalid VLM profile fixture rejected",
    "VLM profile write creates storage document",
    "VLM profile delete allowed for admin",
  ]) {
    assert(authRoutes.includes(snippet), `auth workflow missing VLM profile route smoke snippet: ${snippet}`);
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/ui-guide.md"),
    readText("docs/README.md"),
    readText("docs/vlm-profile-storage.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V200-S05",
    "VLM profile 저장",
    "media-server.vlm-profile.v1",
    "verify-vlm-profile-storage",
    "/ops/api/vlm/profiles",
    "profile CRUD smoke",
    "fallback/disable",
  ]) {
    assert(docs.includes(snippet), `docs missing VLM profile snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-profile-storage"), "server.sh missing VLM profile verifier command");
  assert(serverSh.includes("verify_vlm_profile_storage.mjs"), "server.sh missing VLM profile verifier dispatch");
  assert(scriptInventory.includes("verify_vlm_profile_storage.mjs"), "script inventory missing VLM profile verifier");
  assert(coverage.includes("verify-vlm-profile-storage"), "feature inventory coverage missing VLM profile verifier");
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
console.log("== VLM profile storage summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
