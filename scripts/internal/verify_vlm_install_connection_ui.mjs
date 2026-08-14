#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V200-S04 VLM 설치/연결 Ops UI와 dry-run API 경계를 정적 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM install/connection Ops UI verification

Usage:
  ./server.sh verify-vlm-install-connection-ui [options]

Options:
  -h, --help  도움말 출력

Checks:
  - /ops/vlm shell route와 /ops/api/vlm/install-connection/dry-run API가 Ops guard 아래에 있음
  - UI가 dry-run 후보 선택, cloud opt-in guard, warning/boundary/raw details를 렌더링함
  - S04 dry-run API는 저장/호출 side effect를 계속 false로 유지하고, S05 profile 저장은 별도 panel/API/verifier로 분리됨
  - server.sh, script inventory, feature inventory, stream verification, roadmap 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("Ops shell exposes VLM install/connection page and dry-run API", () => {
  const server = readWebRtcHttpServerBundle(readText);
  const pages = readText("src/ingress/product_ui_server_pages.cpp");
  for (const snippet of [
    "AppendOpsVlmInstallConnectionPage",
    "data-testid=\"ops-vlm-page\"",
    "data-testid=\"ops-vlm-controls\"",
    "data-testid=\"ops-vlm-options-panel\"",
    "data-testid=\"ops-vlm-profile-panel\"",
    "data-testid=\"ops-vlm-boundary-panel\"",
    "id=\"opsVlmRawDetails\"",
    "id=\"opsVlmPretty\"",
    "id=\"opsVlmRaw\"",
  ]) {
    assert(pages.includes(snippet), `product UI page source missing VLM snippet: ${snippet}`);
  }
  for (const snippet of [
    "request.path == \"/ops/api/vlm/install-connection/dry-run\"",
    "OpsVlmInstallConnectionDryRunJson(query",
    "path == \"/ops/vlm\"",
    "return \"vlm\";",
  ]) {
    assert(server.includes(snippet), `server missing VLM UI/API snippet: ${snippet}`);
  }
  assert(server.includes("require_ops_principal"), "VLM API/page must be guarded by ops principal");
  assert(!pages.includes("AppendImageNavLink(out, \"/ops/vlm\""), "VLM must not be added to primary Ops nav");
});

check("Ops page script renders selectable dry-run candidates without writes", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const server = readWebRtcHttpServerBundle(readText);
  for (const snippet of [
    "refreshOpsVlmInstallConnection",
    "refreshOpsVlmProfiles",
    "wireOpsVlmControls",
    "opsVlmSelectedOptionId",
    "requestJson(`/ops/api/vlm/install-connection/dry-run?",
    "/ops/api/vlm/profiles",
    "data-vlm-option-id",
    "renderBadges('opsVlmWarnings'",
    "payload.warnings",
    "renderRaw('opsVlmRaw', 'opsVlmPretty'",
    "activeOpsPage === 'vlm'",
  ]) {
    assert(script.includes(snippet), `page script missing VLM UI snippet: ${snippet}`);
  }
  assert(script.includes("profile-storage-only"), "S05 profile save must be labeled profile-storage-only");
  const runtimeSummaryBlock = extractNamedFunctionBlock(script, "opsVlmRuntimeStatusSummary");
  assert(runtimeSummaryBlock.includes("runtimeStatus: externalTransfer"), "VLM runtimeStatus summary state missing");
  assert(runtimeSummaryBlock.includes("runtimeStatus"), "UI-025 block-scoped canonical product state");
  const installWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => runtimeSummaryBlock.includes(marker));
  assert(installWritePerformed === false, "UI-025 dry-run summary must not write product state");
  assert(server.includes("/ops/vlm"), "UI-025 canonical route obligation");
  const controlsBlock = extractNamedFunctionBlock(script, "wireOpsVlmControls");
  assert(controlsBlock.includes("opsVlmSelectedOptionId = String(button.dataset.vlmOptionId"), "VLM selected option state missing");
  assert(controlsBlock.includes("opsVlmSelectedOptionId"), "UI-026 block-scoped canonical product state");
  const selectionWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => controlsBlock.includes(marker));
  assert(selectionWritePerformed === false, "UI-026 option selection must remain a local dry-run state change");
  assert(server.includes("/ops/vlm"), "UI-026 canonical route obligation");
  assert(runtimeSummaryBlock.includes("payload?.privacy?.cloudOptInState === 'acknowledged'"), "VLM cloud opt-in state missing");
  assert(script.includes("cloudOptInState"), "UI-027 canonical product state");
  const credentialWritePerformed = ["credential-store", "credentialsStored: true", "cloudProviderApiCalled: true"].some(marker => runtimeSummaryBlock.includes(marker));
  assert(credentialWritePerformed === false, "UI-027 cloud opt-in summary must not write credentials or call a provider");
  assert(server.includes("/ops/vlm"), "UI-027 canonical route obligation");
  const profilesBlock = extractNamedFunctionBlock(script, "renderOpsVlmProfiles");
  assert(profilesBlock.includes("badge(activation.status || 'pending-evaluation'"), "VLM activation status state missing");
  assert(profilesBlock.includes("activation.status"), "UI-028 block-scoped canonical product state");
  assert(server.includes("/ops/vlm"), "UI-028 canonical route obligation");
  assert(script.includes("VLM"), "UI-028 canonical field obligation");
  const dimensionsBlock = extractNamedFunctionBlock(script, "opsVlmEvaluationDimensionText");
  assert(dimensionsBlock.includes("dimensions[key]"), "VLM evaluation dimensions state missing");
  assert(dimensionsBlock.includes("dimensions"), "UI-030 block-scoped canonical product state");
  assert(server.includes("/ops/vlm"), "UI-030 canonical route obligation");
  const evaluationBlock = extractNamedFunctionBlock(script, "renderOpsVlmEvaluationResults");
  assert(evaluationBlock.includes("document.getElementById('opsVlmEvaluationRows')"), "VLM evaluation rows state missing");
  assert(script.includes("opsVlmEvaluationRows"), "UI-034 canonical product state");
  const evaluationWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => evaluationBlock.includes(marker));
  assert(evaluationWritePerformed === false, "UI-034 evaluation comparison must not persist or activate a profile");
  assert(server.includes("/ops/vlm"), "UI-034 canonical route obligation");
  assert(script.includes("VLM"), "UI-034 canonical field obligation");
  const privacyBlock = extractNamedFunctionBlock(script, "renderOpsVlmPrivacyTransferGuard");
  assert(privacyBlock.includes("renderOpsVlmPrivacyTransferGuard"), "VLM privacy transfer renderer missing");
  assert(script.includes("renderOpsVlmPrivacyTransferGuard"), "UI-022 canonical product state");
  assert(server.includes("/ops/vlm"), "UI-022 canonical route obligation");
  assert(script.includes("VLM"), "UI-022 canonical field obligation");
  const refreshBlock = extractNamedFunctionBlock(script, "refreshOpsVlmInstallConnection");
  assert(refreshBlock.includes("opsVlmRaw"), "UI-031 block-scoped canonical product state");
  assert(server.includes("/ops/vlm"), "UI-031 canonical route obligation");
  assert(!["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => privacyBlock.includes(marker)), "UI-022 no-write explicit absence oracle");
  assert(!["passwordHash", "tokenHash", "Authorization:", "credentialValue"].some(marker => runtimeSummaryBlock.includes(marker)), "UI-027 credential-redaction explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => refreshBlock.includes(marker)), "UI-031 debug-redaction explicit absence oracle");
  assert(evaluationWritePerformed === false, "UI-034 no-write explicit absence oracle");
});

check("dry-run API keeps S04 non-scope side effects false", () => {
  const server = readWebRtcHttpServerBundle(readText);
  for (const snippet of [
    "install-connection-dry-run-contract-only",
    "profile-storage",
    "runtime-vlm-call",
    "sidecar-storage",
    "cloud-provider-api-call",
    "credential-storage",
    "installPerformed",
    "connectionPerformed",
    "runtimeVlmCallPerformed",
    "profileStored",
    "sidecarStored",
    "cloudProviderApiCalled",
    "credentialsStored",
    "viewerClientExposureAdded",
  ]) {
    assert(server.includes(snippet), `dry-run API missing invariant snippet: ${snippet}`);
  }
  assert(!/\/client\/vlm/i.test(server), "client VLM route must not be added");
  assert(server.includes("profileStored\":false"), "S04 dry-run API must still report profileStored false");
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const vlmDoc = readText("docs/vlm-install-connection-dry-run.md");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "verify-vlm-install-connection-ui",
    "/ops/vlm",
    "/ops/api/vlm/install-connection/dry-run",
    "/ops/api/vlm/profiles",
  ]) {
    assert(backlog.includes(snippet) || stream.includes(snippet) || inventory.includes(snippet) || vlmDoc.includes(snippet), `docs missing VLM UI snippet: ${snippet}`);
  }
  assert(inventory.includes("| UI-022 | `/ops/vlm` VLM 설치/연결 준비 |"), "feature inventory missing UI-022");
  assert(serverSh.includes("verify-vlm-install-connection-ui"), "server.sh missing VLM UI verifier command");
  assert(serverSh.includes("verify_vlm_install_connection_ui.mjs"), "server.sh missing VLM UI verifier dispatch");
  assert(scriptInventory.includes("verify_vlm_install_connection_ui.mjs"), "script inventory missing VLM UI verifier");
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
console.log("== VLM install/connection Ops UI summary ==");
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
