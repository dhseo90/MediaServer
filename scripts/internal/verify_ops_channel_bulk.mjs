#!/usr/bin/env node
// 파일 용도: /ops/sources에서 대량 작업 UI가 제거되고 bulk API 경계만 남아 있는지 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("ops sources page omits bulk management panel", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const forbidden = [
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
  for (const snippet of forbidden) {
    assert(!html.includes(snippet), `bulk channel panel snippet should be absent: ${snippet}`);
  }
});

check("ops sources script omits bulk UI hooks", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const forbidden = [
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
    "bulk-dry-run",
    "bulk-rollback",
    "bulk-disable",
    "bulk-clone",
    "실패 재시도 전 diff preview",
    "감사 이력 보기",
  ];
  for (const snippet of forbidden) {
    assert(!script.includes(snippet), `bulk channel UI hook should be absent: ${snippet}`);
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

check("channel table remains responsive without bulk selectors", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".channel-table",
    ".channel-row-actions",
    ".channel-stream-actions",
    "@media (max-width: 860px)",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `channel CSS is missing snippet: ${snippet}`);
  }
  for (const snippet of [".channel-bulk-panel", ".channel-bulk-diagnostics", ".channel-col-select"]) {
    assert(!css.includes(snippet), `bulk channel CSS should be absent: ${snippet}`);
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
