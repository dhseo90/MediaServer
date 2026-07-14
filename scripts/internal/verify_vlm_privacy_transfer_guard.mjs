#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V200-S11 VLM Privacy/전송 guard UI/API/fixture/문서 경계를 정적 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM privacy/transfer guard verification

Usage:
  ./server.sh verify-vlm-privacy-transfer-guard

Checks:
  - V200-S11 fixture covers local pass, cloud blocked, cloud accepted, and Ops review redaction.
  - /ops/vlm renders a Privacy/전송 guard panel and stores privacyGuard only in Ops VLM profiles.
  - Cloud profiles require external transfer acknowledgement and accepted provider logging/retention review.
  - prompt/raw response/source URL/credential/raw frame bytes stay out of profile, sidecar, Event POST, and client/viewer surfaces.
  - docs, feature inventory, server.sh, script inventory, and coverage maps are wired.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const server = readWebRtcHttpServerBundle(readText);
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const eventStorage = readText("src/analysis/event_storage.cpp");
const serverSh = readText("server.sh");

check("privacy transfer fixture covers required S11 cases", () => {
  const fixture = JSON.parse(readText("test/fixtures/vlm_privacy_transfer_guard/cases.json"));
  assert(fixture.schema === "media-server.vlm-privacy-transfer-guard-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S11", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "local-profile-redaction-pass",
    "cloud-profile-provider-logging-required",
    "cloud-profile-complete-guard-pass",
    "ops-review-redaction-boundary",
  ]) {
    assert(ids.has(id), `missing privacy guard fixture case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    if (item.privacyGuard) {
      assert(item.privacyGuard.schema === "media-server.vlm-privacy-transfer-guard.v1", `${item.id}: guard schema mismatch`);
      const redaction = item.privacyGuard.redaction || {};
      for (const field of [
        "credentialMaterialStored",
        "promptStored",
        "rawProviderResponseStored",
        "sourceUrlStored",
        "rawFrameBytesStored",
        "viewerClientExposureAdded",
      ]) {
        assert(redaction[field] === false, `${item.id}: redaction field must be false: ${field}`);
      }
      if (item.provider === "cloud-provider-api" && item.expectedStatus === "pass") {
        const logging = item.privacyGuard.providerLoggingPolicy || {};
        assert(logging.reviewStatus === "accepted", `${item.id}: cloud pass requires accepted provider logging review`);
        assert(logging.loggingAndRetentionReviewed === true, `${item.id}: cloud pass requires logging/retention review`);
        assert(logging.termsReviewed === true, `${item.id}: cloud pass requires terms review`);
      }
    }
  }
  const local = fixture.cases.find(item => item.id === "local-profile-redaction-pass");
  const cloud = fixture.cases.find(item => item.id === "cloud-profile-complete-guard-pass");
  const review = fixture.cases.find(item => item.id === "ops-review-redaction-boundary");
  assert(local?.privacyGuard?.redaction?.sourceUrlStored === false && review?.viewerClientExposureAdded === false, "sourceUrlStored/viewer client Ops review redaction must remain absent/false");
  assert(cloud?.privacyGuard?.externalTransferWarningAcknowledged === true && cloud?.privacyGuard?.providerLoggingPolicy?.reviewStatus === "accepted" && cloud?.privacyGuard?.providerLoggingPolicy?.loggingAndRetentionReviewed === true, "cloud external transfer warning and provider logging/retention accepted review are required");
});

check("server enforces cloud privacyGuard before VLM profile storage", () => {
  for (const snippet of [
    "ValidateVlmPrivacyGuardContract",
    "\"privacyGuard\"",
    "media-server.vlm-privacy-transfer-guard.v1",
    "cloud VLM profile requires privacyGuard review",
    "externalTransferWarningAcknowledged",
    "providerLoggingPolicy",
    "loggingAndRetentionReviewed",
    "termsReviewed",
    "cloud VLM profile requires accepted provider logging and retention review",
    "credentialMaterialStored",
    "promptStored",
    "rawProviderResponseStored",
    "sourceUrlStored",
    "rawFrameBytesStored",
    "viewerClientExposureAdded",
  ]) {
    assertIncludes(server, snippet, "server privacy guard enforcement");
  }
});

check("SAFE-024 canonical privacy guard source keeps raw and credential material absent", () => {
  const block = extractCppFunctionBlock(server, "static bool ValidateVlmPrivacyGuardContract(");
  const privacyGuardObserved = block.includes("sourceUrlStored") && block.includes("credentialMaterialStored");
  const rawMaterialExposed = /\\\"(?:rawPrompt|rawProviderResponse|rawFrameBytes|rawJson|rawLocator)\\\":true/.test(block);
  const sourceUrlExposed = /\\\"sourceUrlStored\\\":true/.test(block);
  const credentialMaterialExposed = /\\\"(?:credentialMaterialStored|providerCredential|apiKey)\\\":true/.test(block);
  assert(privacyGuardObserved && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false,
    "SAFE-024 privacy guard must keep raw prompt/response/frame and credential material absent");
});

check("Ops VLM dry-run and profile UI expose privacy guard controls without provider calls", () => {
  for (const snippet of [
    "OpsVlmPrivacyTransferGuardJson",
    "privacyTransferGuard",
    "data-testid=\"ops-vlm-privacy-transfer-guard-panel\"",
    "id=\"opsVlmExternalTransferWarningAck\"",
    "id=\"opsVlmProviderLoggingReviewed\"",
    "provider logging/retention",
  ]) {
    assertIncludes(server, snippet, "Ops VLM privacy markup/API");
  }
  for (const snippet of [
    "renderOpsVlmPrivacyTransferGuard",
    "opsVlmOptionUsesExternalTransfer",
    "opsVlmExternalTransferWarningAck",
    "opsVlmProviderLoggingReviewed",
    "privacyGuard",
    "media-server.vlm-privacy-transfer-guard.v1",
    "providerLoggingPolicy",
    "currentProviderPolicyStored: false",
  ]) {
    assertIncludes(pageScript, snippet, "Ops VLM privacy script");
    assertIncludes(extractNamedFunctionBlock(pageScript, "renderOpsVlmPrivacyTransferGuard"), "opsVlmExternalTransferWarningAck", "UI-024 block-scoped canonical product state");
    assertIncludes(server, "/ops/vlm", "UI-024 canonical route obligation");
    assertIncludes(pageScript, "VLM", "UI-024 canonical field obligation");
  }
});

check("viewer/client and existing external payload paths do not expose S11 internals", () => {
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("std::string OpsVlmProfilesJson()");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart ? server.slice(clientStart, clientEnd) : "";
  assert(clientRegion.length > 0, "client region not found");
  for (const forbidden of [
    "media-server.vlm-privacy-transfer-guard.v1",
    "opsVlmProviderLoggingReviewed",
    "privacyTransferGuard",
  ]) {
    assert(!clientRegion.includes(forbidden), `client region exposes ${forbidden}`);
  }
  for (const [label, text] of [
    ["event_post_dispatcher.cpp", eventPost],
    ["event_storage.cpp", eventStorage],
  ]) {
    assert(!text.includes("privacyTransferGuard"), `${label}: existing event payload/storage must not contain privacyTransferGuard`);
    assert(!text.includes('"rawProviderResponseStored":true'),
      `${label}: existing event payload/storage must not claim raw provider response storage`);
    assert(!text.includes('\\"rawProviderResponseStored\\":true'),
      `${label}: serialized event payload/storage must not claim raw provider response storage`);
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/ui-guide.md"),
    readText("docs/README.md"),
    readText("docs/vlm-privacy-transfer-guard.md"),
  ].join("\n");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for (const snippet of [
    "V200-S11",
    "Privacy/전송 guard",
    "media-server.vlm-privacy-transfer-guard.v1",
    "verify-vlm-privacy-transfer-guard",
    "provider logging/retention",
    "credential/prompt/raw response/source URL",
    "UI-024",
    "LAB-042",
    "SAFE-024",
  ]) {
    assert(docs.includes(snippet), `docs missing S11 snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-privacy-transfer-guard"), "server.sh missing S11 verifier command");
  assert(serverSh.includes("verify_vlm_privacy_transfer_guard.mjs"), "server.sh missing S11 verifier dispatch");
  assert(scriptInventory.includes("verify_vlm_privacy_transfer_guard.mjs"), "script inventory missing S11 verifier");
  assert(coverage.includes("validateImplementationManifest"), "feature inventory coverage must validate implementation manifest");
  const safe024 = (implementationManifest.items || []).find(item => item.id === "SAFE-024");
  assert(safe024?.verifierEvidence?.command === "verify-vlm-privacy-transfer-guard",
    "SAFE-024 implementation manifest missing S11 verifier command");
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
console.log("== VLM privacy/transfer guard summary ==");
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
