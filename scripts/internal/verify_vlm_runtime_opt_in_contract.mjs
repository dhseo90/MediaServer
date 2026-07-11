#!/usr/bin/env node
// 파일 용도: V210-S01 VLM runtime opt-in contract fixture, 서버 validation, 문서 wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM runtime opt-in contract verification

Usage:
  ./server.sh verify-vlm-runtime-opt-in-contract

Checks:
  - V210-S01 fixture separates disabled, local-runtime, cloud-provider, missing-model, invalid-output, and timeout states.
  - VLM profile storage requires media-server.vlm-runtime-opt-in-contract.v1 and keeps defaultEnabled/runtime/provider calls false.
  - Ops VLM profile UI stores runtimeContract without exposing it to client/viewer or external event/metadata paths.
  - docs, feature inventory, server.sh, script inventory, and auth/profile smoke are wired.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const server = readText("src/ingress/webrtc_http_server.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const eventStorage = readText("src/analysis/event_storage.cpp");

check("runtime opt-in fixture covers required V210-S01 states", () => {
  const fixture = JSON.parse(readText("test/fixtures/vlm_runtime_opt_in_contract/cases.json"));
  assert(fixture.schema === "media-server.vlm-runtime-opt-in-contract-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S01", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "disabled-default-off-pass",
    "local-runtime-pass",
    "cloud-provider-pass",
    "missing-model-pass",
    "invalid-output-pass",
    "timeout-pass",
    "default-enabled-rejected",
    "runtime-call-side-effect-rejected",
  ]) {
    assert(ids.has(id), `missing runtime contract fixture case: ${id}`);
  }
  const statuses = new Set((fixture.cases || []).map(item => item.runtimeContract?.status).filter(Boolean));
  for (const status of ["disabled", "local-runtime", "cloud-provider", "missing-model", "invalid-output", "timeout"]) {
    assert(statuses.has(status), `fixture missing runtime status: ${status}`);
  }
  for (const item of fixture.cases || []) {
    const contract = item.runtimeContract || {};
    assert(contract.schema === "media-server.vlm-runtime-opt-in-contract.v1", `${item.id}: contract schema mismatch`);
    assert(contract.defaultEnabled === (item.id === "default-enabled-rejected"), `${item.id}: defaultEnabled expectation mismatch`);
    if (item.expectedStatus === "pass") {
      assert(contract.runtimeCallAllowed === false, `${item.id}: runtime calls must not be allowed`);
      assert(contract.providerCallAllowed === false, `${item.id}: provider calls must not be allowed`);
      for (const [field, value] of Object.entries(contract.sideEffects || {})) {
        assert(value === false, `${item.id}: side effect must be false: ${field}`);
      }
    }
  }
});

check("server enforces runtime opt-in contract before profile storage", () => {
  for (const snippet of [
    "ValidateVlmRuntimeOptInContract",
    "\"runtimeContract\"",
    "media-server.vlm-runtime-opt-in-contract.v1",
    "VLM profile runtimeContract object is required",
    "VLM runtimeContract defaultEnabled must be false",
    "VLM runtimeContract requires operator opt-in",
    "VLM runtimeContract runtimeCallAllowed must be false in V210-S01",
    "VLM runtimeContract providerCallAllowed must be false in V210-S01",
    "disabled VLM runtimeContract mode requires disabled status",
    "local-runtime status requires a configured local runtime",
    "missing-model runtimeContract status is local-runtime only",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "modelArtifactDownloaded",
    "modelArtifactBundled",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assert(server.includes(snippet), `server missing runtime contract snippet: ${snippet}`);
  }
});

check("Ops VLM profile UI writes runtimeContract as Ops-only profile metadata", () => {
  for (const snippet of [
    "buildOpsVlmRuntimeContract",
    "media-server.vlm-runtime-opt-in-contract.v1",
    "targetStep: 'V210-S01'",
    "defaultEnabled: false",
    "operatorOptInRequired: true",
    "runtimeCallAllowed: false",
    "providerCallAllowed: false",
    "providerFieldSmokeRequired",
    "missing-model",
    "invalidOutput: 'rejected-invalid-output-no-sidecar-write'",
    "timeout: 'timeout-no-media-path-failure'",
    "sourceStep: 'V210-S01'",
  ]) {
    assert(pageScript.includes(snippet), `page script missing runtime contract snippet: ${snippet}`);
  }
});

check("existing external event and metadata paths do not expose runtimeContract", () => {
  for (const [label, text] of [
    ["event_post_dispatcher.cpp", eventPost],
    ["event_storage.cpp", eventStorage],
  ]) {
    assert(!text.includes("runtimeContract"), `${label}: runtimeContract must not enter event storage/post payload`);
    assert(!text.includes("vlm-runtime-opt-in"), `${label}: runtime opt-in schema must stay out of external payloads`);
  }
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("std::string OpsVlmProfilesJson()");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart ? server.slice(clientStart, clientEnd) : "";
  assert(clientRegion.length > 0, "client region not found");
  assert(!clientRegion.includes("media-server.vlm-runtime-opt-in-contract.v1"), "client region exposes runtime contract schema");
});

check("docs, inventory, server command, and auth smoke are wired", () => {
  const docs = [
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
    readText("docs/vlm-profile-storage.md"),
    readText("docs/vlm-runtime-opt-in-contract.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const authWorkflow = readText("scripts/internal/verify_auth_workflow.sh");
  const profileVerifier = readText("scripts/internal/verify_vlm_profile_storage.mjs");
  for (const snippet of [
    "V210-S01",
    "VLM runtime opt-in contract",
    "media-server.vlm-runtime-opt-in-contract.v1",
    "verify-vlm-runtime-opt-in-contract",
    "disabled",
    "local-runtime",
    "cloud-provider",
    "missing-model",
    "invalid-output",
    "timeout",
    "defaultEnabled=false",
  ]) {
    assert(docs.includes(snippet), `docs missing runtime contract snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-runtime-opt-in-contract"), "server.sh missing runtime contract verifier command");
  assert(serverSh.includes("verify_vlm_runtime_opt_in_contract.mjs"), "server.sh missing runtime contract verifier dispatch");
  assert(scriptInventory.includes("verify_vlm_runtime_opt_in_contract.mjs"), "script inventory missing runtime contract verifier");
  assert(coverage.includes("validateImplementationManifest"), "feature inventory coverage must validate implementation manifest");
  const safe025 = (implementationManifest.items || []).find(item => item.id === "SAFE-025");
  assert(safe025?.verifierEvidence?.command === "verify-vlm-runtime-opt-in-contract",
    "SAFE-025 implementation manifest missing runtime contract verifier command");
  assert(authWorkflow.includes("media-server.vlm-runtime-opt-in-contract.v1"), "auth workflow missing runtime contract profile payload");
  assert(profileVerifier.includes("media-server.vlm-runtime-opt-in-contract.v1"), "profile storage verifier missing runtime contract check");
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
console.log("== VLM runtime opt-in contract summary ==");
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
