#!/usr/bin/env node
// 파일 용도: v2.7.0 S03 Operational Action Pack과 기존 수동 workflow 연결 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");

check("roadmap records V270-S03 as active/completed Operational Action Pack work", () => {
  assert(/\| 3 \| V270-S03 \| P1 \| (진행|완료) \| Operational Action Pack \|/.test(backlog),
    "backlog V270-S03 row must be 진행 or 완료 while S03 is under development");
  for (const snippet of [
    "media-server.ops.operational-action-pack.v1",
    "evidence bundle",
    "rule draft",
    "alert dry-run",
    "source health recheck",
    "external delivery 미수행",
    "rule registry 자동 write 없음",
    "verify-v270-operational-action-pack",
  ]) {
    assertIncludes(backlog, snippet, "V270-S03 backlog");
  }
});

check("Ops events API exposes action pack view model without new action side effects", () => {
  for (const snippet of [
    "OpsOperationalActionPackViewJson",
    "OpsOperationalActionPackItemJson",
    "OpsOperationalActionPackActionsJson",
    "media-server.ops.operational-action-pack.v1",
    "\\\"operationalActionPack\\\":",
    "\\\"releaseSafeEvidenceBundle\\\":",
    "\\\"ruleDraftRoute\\\":",
    "\\\"alertDryRunRoute\\\":",
    "\\\"sourceHealthRecheck\\\":",
    "\\\"externalDeliveryPerformed\\\":false",
    "\\\"ruleRegistryWritePerformed\\\":false",
    "\\\"sourceHealthWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops operational action pack API");
  }
});

check("/ops/events UI renders action pack panel and safe action links", () => {
  for (const snippet of [
    'data-testid="ops-operational-action-pack"',
    'data-operational-action-pack="manual-workflow-links"',
    'id="opsOperationalActionPackBadges"',
    'id="opsOperationalActionPackRows"',
    "Operational Action Pack",
  ]) {
    assertIncludes(server, snippet, "Ops operational action pack shell");
  }
  for (const snippet of [
    "renderOperationalActionPack",
    "operationalActionPack",
    "opsOperationalActionPackRows",
    "releaseSafeEvidenceBundle",
    "ruleDraftRoute",
    "alertDryRunRoute",
    "sourceHealthRecheck",
    "externalDeliveryPerformed",
    "ruleRegistryWritePerformed",
  ]) {
    assertIncludes(script, snippet, "Ops operational action pack script");
  }
  for (const snippet of [
    ".operational-action-pack",
    ".operational-action-pack-list",
    ".operational-action-pack-card",
    ".operational-action-pack-actions",
  ]) {
    assertIncludes(css, snippet, "Ops operational action pack CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S03", () => {
  for (const snippet of [
    'data-testid="ops-operational-action-pack"',
    'id="opsOperationalActionPackRows"',
    "operationalActionPack",
    "releaseSafeEvidenceBundle",
    "alertDryRunRoute",
    "sourceHealthRecheck",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V270-S03 Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` | `verify-v270-operational-action-pack` |",
    "| UI-052 | `/ops/events` Operational Action Pack |",
    "| EVT-052 | Ops operational action pack view model |",
    "| LAB-076 | V270-S03 operational action pack static guard |",
    "| SAFE-060 | V270-S03 operational action pack boundary |",
    "verify-v270-operational-action-pack",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S03 row");
  }
  assertIncludes(manualChecklist, "| V270-S03 Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` |", "manual UI checklist S03 row");
  assertIncludes(coverageVerifier, "verify-v270-operational-action-pack", "feature inventory coverage S03 command");
  assertIncludes(streamVerification, "verify-v270-operational-action-pack", "stream verification S03 command");
  assertIncludes(serverSh, "verify-v270-operational-action-pack", "server.sh S03 command");
  assertIncludes(serverSh, "verify_v270_operational_action_pack.mjs", "server.sh S03 script target");
});

check("S03 keeps forbidden delivery/rule/provider/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/operational-action-pack",
    "externalDeliveryPerformed\\\":true",
    "ruleRegistryWritePerformed\\\":true",
    "sourceHealthWritePerformed\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S03 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.7.0 S03 operational action pack 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.7.0 S03 operational action pack 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
