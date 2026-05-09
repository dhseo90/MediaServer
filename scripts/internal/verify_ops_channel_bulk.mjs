#!/usr/bin/env node
// 파일 용도: /ops/sources 대량 채널 관리 UI와 bulk action hook을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("ops sources page exposes bulk management panel", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    'data-testid="channel-bulk-panel"',
    'id="channel-bulk-select-all"',
    'id="channel-bulk-dry-run"',
    'id="channel-bulk-validate"',
    'id="channel-bulk-clone"',
    'id="channel-bulk-disable"',
    'id="channel-bulk-retry-failed"',
    'id="channel-bulk-rollback"',
    'id="channelBulkDiagnostics"',
    "대량 작업 / 상태 진단",
  ];
  for (const snippet of required) {
    assert(html.includes(snippet), `bulk channel panel is missing snippet: ${snippet}`);
  }
});

check("ops sources script wires clone disable validation diagnostics", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "selectedChannelIds",
    "channelBulkIssues",
    "renderChannelBulkDiagnostics",
    "lastChannelBulkResult",
    "lastChannelBulkPreview",
    "channelBulkItems",
    "channelBulkRollbackItems",
    "channelBulkDiffPreview",
    "renderChannelBulkPreview",
    "runChannelBulkOperation",
    "bulkDisableSelectedChannels",
    "bulkCloneSelectedChannels",
    "retryFailedChannelBulk",
    "rollbackSuccessfulChannelBulk",
    "/ops/api/channels/bulk",
    "data-select-channel",
    "data-clone-channel",
    "bulk-dry-run",
    "bulk-rollback",
    "bulk-disable",
    "bulk-clone",
    "실패 재시도 전 diff preview",
    "감사 이력 보기",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `bulk channel script is missing snippet: ${snippet}`);
  }
});

check("server exposes formal channel bulk API with partial failure policy", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    "/ops/api/channels/bulk",
    "OpsChannelBulkJson",
    "partialFailure",
    "rollbackPolicy",
    "retryPolicy",
    "operation == \"rollback\"",
    "rollbackMode",
    "retryable",
    "auditArea",
    "auditAction",
    "auditTargets",
    "auditTarget",
    "diffPreviewPolicy",
    "allowDuplicateSource",
    "operation == \"clone\"",
    "operation == \"disable\"",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `channel bulk API is missing snippet: ${snippet}`);
  }
});

check("bulk channel table remains responsive", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".channel-bulk-panel",
    ".channel-bulk-diagnostics",
    ".compact-list",
    ".channel-col-select",
    "@media (max-width: 860px)",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `bulk channel CSS is missing snippet: ${snippet}`);
  }
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Ops channel bulk verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
