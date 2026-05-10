#!/usr/bin/env node
// 파일 용도: /ops/dashboard 문제 원인 패널과 운영 원인 해석 hook을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("ops dashboard exposes root cause panel", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    'data-testid="ops-root-cause-panel"',
    'id="dashRootCauseBadges"',
    'id="dashRootCauseText"',
    'id="dashRootCauseList"',
    'id="dashRootCauseActionOutput"',
    "source lifecycle, stale, reconnect, auth/config 상태와 다음 조치",
  ];
  for (const snippet of required) {
    assert(html.includes(snippet), `dashboard root cause panel is missing snippet: ${snippet}`);
  }
});

check("ops dashboard script interprets runtime root causes", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "dashboardRootCauseItems",
    "dashboardSourceHealthItems",
    "dashboardSourceHealthCounts",
    "dashboardSourceHealthStatusText",
    "renderDashboardRootCause",
    "rootCauseCorrelationId",
    "correlationId",
    "/ops/api/diagnostics/log-tail",
    "diagnosticLog",
    "logEvidence",
    "sourceLifecycle",
    "/ops/api/source-health",
    "Live Source Health",
    "source-health",
    "lastUsedAgeMs",
    "inactivePublishSources",
    "cleanupBacklog",
    "recentEvents",
    "EventRecord 저장",
    "relayPolicyFallback",
    "root-cause-next-action",
    "runRootCauseAction",
    "rootCauseLogFilter",
    "renderRootCauseActionOutput",
    "source-diagnostics",
    "Live Source Health 재검증",
    "registry-diff",
    "event-diagnostics",
    "auth-config",
    "data-root-cause-action",
    "data-root-cause-kind",
    "data-correlation-id",
    "root-cause-correlation",
    "root-cause-evidence",
    "root-cause-log",
    "dashRootCauseActionOutput",
    "/ops/api/sources",
    "/ops/api/views",
    "/ops/events",
    "ops:read",
    "whoami 응답을 확인하지 못했습니다.",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `dashboard root cause script is missing snippet: ${snippet}`);
  }
});

check("root cause list is responsive", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".root-cause-list",
    ".root-cause-item",
    ".root-cause-item.warn",
    ".root-cause-action",
    ".root-cause-correlation",
    ".root-cause-evidence",
    ".root-cause-log",
    ".root-cause-next-action",
    ".root-cause-action-output",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `root cause CSS is missing snippet: ${snippet}`);
  }
});

check("server entrypoint includes root cause verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-ops-root-cause-panel"), "server.sh is missing verify-ops-root-cause-panel");
  assert(server.includes("verify_ops_root_cause_panel.mjs"), "server.sh is missing verifier script reference");
  const httpServer = readText("src/ingress/webrtc_http_server.cpp");
  assert(httpServer.includes("/ops/api/diagnostics/log-tail"), "server is missing diagnostics log-tail API");
  assert(httpServer.includes("OpsDiagnosticLogTailJson"), "server is missing diagnostics log-tail JSON builder");
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
console.log("== Ops root cause panel verification summary ==");
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
