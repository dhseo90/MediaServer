#!/usr/bin/env node
// 파일 용도: V210-S05 Ops VLM runtime status UI와 viewer/client 비노출 경계를 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM runtime status UI verification

Usage:
  ./server.sh verify-vlm-runtime-status-ui [options]

Options:
  -h, --help  도움말 출력

Checks:
  - /ops/vlm에 Ops-only runtime status panel과 stable selectors가 있음
  - page script가 /ops/api/runtime/status, VLM dry-run, profile registry를 조합해 provider/runtime/evaluation/failure/privacy/default-off 상태를 렌더링함
  - viewer/client markup과 external Event/WebRTC/SSE/WS payload 경로에 VLM runtime status panel marker가 노출되지 않음
  - docs, feature inventory, server.sh, ops-client UI smoke, script inventory 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const server = readText("src/ingress/webrtc_http_server.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");

check("Ops VLM page renders runtime status panel", () => {
  for (const snippet of [
    'data-testid="ops-vlm-runtime-status-panel"',
    'data-vlm-runtime-status="ops-only-default-off"',
    'id="opsVlmProviderStatus"',
    'id="opsVlmRuntimeConnectionStatus"',
    'id="opsVlmLastEvaluationStatus"',
    'id="opsVlmFailureReason"',
    'id="opsVlmPrivacyModeStatus"',
    'id="opsVlmDefaultOffStatus"',
    'id="opsVlmRuntimeStatusBadges"',
    'id="opsVlmRuntimeStatusList"',
    "provider 상태, runtime 연결 상태, 마지막 evaluation, 실패 사유, privacy mode, default-off 상태",
  ]) {
    assert(server.includes(snippet), `server missing runtime status UI snippet: ${snippet}`);
  }
});

check("Page script combines runtime status, dry-run, and profile state", () => {
  for (const snippet of [
    "opsVlmRuntimeStatusPayload",
    "opsVlmActiveProfile",
    "opsVlmRuntimeStatusSummary",
    "renderOpsVlmRuntimeStatus",
    "refreshOpsVlmRuntimeStatus",
    "requestJson('/ops/api/runtime/status')",
    "buildOpsVlmRuntimeContract(selected, payload, 'pending-evaluation', false)",
    "provider field smoke only",
    "cloud opt-in required",
    "default-off",
    "failureReason",
    "runtimeCallAllowed === false",
    "providerCallAllowed === false",
    "media/Event/metadata/Event POST 실패로 전파하지 않습니다",
  ]) {
    assert(pageScript.includes(snippet), `page script missing runtime status behavior snippet: ${snippet}`);
  }
});

check("Ops/client UI smoke tracks the runtime status selectors", () => {
  const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
  for (const snippet of [
    'data-testid="ops-vlm-runtime-status-panel"',
    'id="opsVlmProviderStatus"',
    'id="opsVlmRuntimeConnectionStatus"',
    'id="opsVlmLastEvaluationStatus"',
    'id="opsVlmFailureReason"',
    'id="opsVlmDefaultOffStatus"',
    "/ops/api/runtime/status",
  ]) {
    assert(uiSmoke.includes(snippet), `ops-client UI smoke missing runtime status snippet: ${snippet}`);
  }
});

check("viewer/client markup and external payload paths do not expose the Ops VLM runtime panel", () => {
  const accessStart = server.indexOf("std::string ClientAccessRequestPageHtml");
  const accessEnd = server.indexOf("void AppendOpsVlmInstallConnectionPage");
  const eventsStart = server.indexOf("void AppendClientEventItemJson");
  const eventsEnd = server.indexOf("bool BuildClientLiveWebRtcQuery");
  const shellStart = server.indexOf("std::string ClientShellPageHtml");
  const shellEnd = server.indexOf("std::string BuildOpsSourcesPageHtml");
  const clientRegion = [
    accessStart >= 0 && accessEnd > accessStart ? server.slice(accessStart, accessEnd) : "",
    eventsStart >= 0 && eventsEnd > eventsStart ? server.slice(eventsStart, eventsEnd) : "",
    shellStart >= 0 && shellEnd > shellStart ? server.slice(shellStart, shellEnd) : "",
  ].join("\n");
  assert(clientRegion.length > 0, "client region not found");
  for (const forbidden of [
    'data-testid="ops-vlm-runtime-status-panel"',
    'data-vlm-runtime-status="ops-only-default-off"',
    "opsVlmProviderStatus",
    "opsVlmRuntimeConnectionStatus",
  ]) {
    assert(!clientRegion.includes(forbidden), `client region exposes ${forbidden}`);
  }
  for (const file of [
    "src/analysis/event_post_dispatcher.cpp",
    "scripts/internal/verify_webrtc_va_metadata.mjs",
    "scripts/internal/verify_ws_va_metadata.mjs",
  ]) {
    const text = readText(file);
    assert(!text.includes("ops-vlm-runtime-status-panel"), `${file} exposes Ops VLM runtime panel marker`);
  }
});

check("docs, feature inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-runtime-status-ui.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V210-S05",
    "Ops VLM runtime status UI",
    "verify-vlm-runtime-status-ui",
    "/ops/vlm",
    "/ops/api/runtime/status",
    "provider 상태",
    "runtime 연결 상태",
    "마지막 evaluation",
    "실패 사유",
    "privacy mode",
    "default-off",
    "UI-033",
  ]) {
    assert(docs.includes(snippet), `docs missing S05 snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-runtime-status-ui"), "server.sh missing S05 command");
  assert(serverSh.includes("verify_vlm_runtime_status_ui.mjs"), "server.sh missing S05 script dispatch");
  assert(scriptInventory.includes("verify_vlm_runtime_status_ui.mjs"), "script inventory missing S05 verifier");
  assert(coverage.includes("verify-vlm-runtime-status-ui"), "feature coverage missing S05 verifier");
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
console.log("== VLM runtime status UI summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
