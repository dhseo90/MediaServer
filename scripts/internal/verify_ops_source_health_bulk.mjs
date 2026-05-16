#!/usr/bin/env node
// 파일 용도: /ops/api/source-health/bulk 계약과 partial retry 정책 hook을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("server exposes source health bulk API contract", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    "/ops/api/source-health/bulk",
    "OpsSourceHealthBulkJson",
    "media-server.ops.source-health.bulk.v1",
    "source-health-bulk",
    "partialFailure",
    "retryPolicy",
    "retryBody",
    "retryable",
    "unhealthyCount",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `source health bulk API is missing snippet: ${snippet}`);
  }
});

check("server keeps existing source health schema intact", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  assert(server.includes("media-server.ops.source-health.v1"), "source health v1 schema is missing");
  assert(server.includes("BuildOpsSourceHealthSnapshot"), "shared source health snapshot builder is missing");
  assert(server.includes("AppendOpsSourceHealthItemJson"), "source health item serializer is missing");
  assert(server.includes("ApplyOpsSourceHealthWarningThresholds"), "source health warning threshold hook is missing");
  assert(server.includes("high-reconnect"), "source health high reconnect warning is missing");
  assert(server.includes("repeated-stale"), "source health repeated stale warning is missing");
});

check("documentation describes bulk retry policy", () => {
  const doc = readText("docs/live-source-health.md");
  const required = [
    "POST /ops/api/source-health/bulk",
    "media-server.ops.source-health.bulk.v1",
    "retryBody",
    "retryable=true",
    "partialFailure",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `live source health docs are missing snippet: ${snippet}`);
  }
});

check("ops sources UI omits source health bulk controls", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const opsSourcesScript = extractRange(script, "void AppendOpsSourcesPageScript", "void AppendOpsUsersPageScript");
  const forbiddenHtml = [
    'id="channel-health-bulk-check"',
    'id="channel-health-bulk-retry"',
    'data-testid="source-health-panel"',
    'id="channelHealthDiagnostics"',
  ];
  const forbiddenScript = [
    "lastSourceHealthBulkResult",
    "selectedSourceHealthIds",
    "runSourceHealthBulk",
    "retrySourceHealthBulk",
    "/ops/api/source-health/bulk",
    "retryBody?.sourceIds",
    "channelHealthBulkRetry.disabled",
  ];
  for (const snippet of forbiddenHtml) {
    assert(!html.includes(snippet), `ops sources HTML should not expose source health bulk snippet: ${snippet}`);
  }
  for (const snippet of forbiddenScript) {
    assert(!opsSourcesScript.includes(snippet), `ops sources script should not expose source health bulk snippet: ${snippet}`);
  }
});

check("ops dashboard exposes source health next-action workflow", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "runSourceHealthBulk",
    "/ops/api/source-health/bulk",
    "sourceHealthRetryIds",
    "data-source-health-retry",
    "재검증 대상만 다시 확인",
    "source health bulk는 registry를 변경하지 않아 rollback 대상이 없습니다.",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `dashboard source health workflow is missing snippet: ${snippet}`);
  }
});

check("server entrypoint includes source health bulk verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-ops-source-health-bulk"), "server.sh is missing verify-ops-source-health-bulk");
  assert(serverSh.includes("verify_ops_source_health_bulk.mjs"), "server.sh is missing verifier script reference");
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
console.log("== Ops source health bulk verification summary ==");
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

function extractRange(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing range start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing range end: ${endNeedle}`);
  return text.slice(start, end);
}
