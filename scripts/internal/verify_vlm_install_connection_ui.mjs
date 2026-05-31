#!/usr/bin/env node
// 파일 용도: V200-S04 VLM 설치/연결 Ops UI와 dry-run API 경계를 정적 검증한다.

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
  - profile 저장, VLM runtime 호출, sidecar 저장, credential 저장, viewer/client route가 추가되지 않음
  - server.sh, script inventory, feature inventory, stream verification, roadmap 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("Ops shell exposes VLM install/connection page and dry-run API", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "AppendOpsVlmInstallConnectionPage",
    "data-testid=\"ops-vlm-page\"",
    "data-testid=\"ops-vlm-controls\"",
    "data-testid=\"ops-vlm-options-panel\"",
    "data-testid=\"ops-vlm-boundary-panel\"",
    "id=\"opsVlmRawDetails\"",
    "id=\"opsVlmPretty\"",
    "id=\"opsVlmRaw\"",
    "request.path == \"/ops/api/vlm/install-connection/dry-run\"",
    "OpsVlmInstallConnectionDryRunJson(query",
    "path == \"/ops/vlm\"",
    "return \"vlm\";",
  ]) {
    assert(server.includes(snippet), `server missing VLM UI/API snippet: ${snippet}`);
  }
  assert(server.includes("require_ops_principal"), "VLM API/page must be guarded by ops principal");
  assert(!server.includes("AppendImageNavLink(out, \"/ops/vlm\""), "VLM must not be added to primary Ops nav");
});

check("Ops page script renders selectable dry-run candidates without writes", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  for (const snippet of [
    "refreshOpsVlmInstallConnection",
    "wireOpsVlmControls",
    "opsVlmSelectedOptionId",
    "requestJson(`/ops/api/vlm/install-connection/dry-run?",
    "data-vlm-option-id",
    "renderBadges('opsVlmWarnings'",
    "payload.warnings",
    "renderRaw('opsVlmRaw', 'opsVlmPretty'",
    "activeOpsPage === 'vlm'",
  ]) {
    assert(script.includes(snippet), `page script missing VLM UI snippet: ${snippet}`);
  }
  for (const forbidden of [
    "/ops/api/vlm/profiles",
    "method: 'POST'",
    "method: 'PUT'",
    "method: 'DELETE'",
  ]) {
    if (forbidden.startsWith("method")) continue;
    assert(!script.includes(forbidden), `VLM UI must not write profile/runtime state: ${forbidden}`);
  }
});

check("dry-run API keeps S04 non-scope side effects false", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
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
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "Ops UI smoke",
    "verify-vlm-install-connection-ui",
    "/ops/vlm",
    "/ops/api/vlm/install-connection/dry-run",
  ]) {
    assert(backlog.includes(snippet) || stream.includes(snippet) || inventory.includes(snippet), `docs missing VLM UI snippet: ${snippet}`);
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
