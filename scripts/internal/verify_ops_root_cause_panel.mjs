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
    'data-testid="ops-incident-timeline-panel"',
    'id="dashRootCauseBadges"',
    'id="dashRootCauseText"',
    'id="dashRootCauseList"',
    'id="dashRootCauseActionOutput"',
    'id="dashIncidentTimelineBadges"',
    'id="dashIncidentTimelineText"',
    'id="dashIncidentTimelineSearch"',
    'id="dashIncidentTimelineSource"',
    'id="dashIncidentTimeline"',
    "제목, 출처, cid 검색",
    "소스 수명주기, 지연, 재연결, 권한/설정 상태와 다음 조치",
    "문제 원인, EventRecord, source health, 로그 단서",
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
    "dashboardIncidentTimelineItems",
    "renderDashboardIncidentTimeline",
    "dashboardIncidentFilterState",
    "dashboardIncidentHashKeys",
    "dashboardIncidentHashState",
    "syncDashboardIncidentFilterFromHash",
    "writeDashboardIncidentFilterHash",
    "handleDashboardIncidentFilterChange",
    "handleDashboardIncidentHashChange",
    "incidentQ",
    "incidentSource",
    "dashboardIncidentSourceKey",
    "dashboardIncidentMatchesFilter",
    "rerenderDashboardIncidentTimelineFromCache",
    "dashboardIncidentEventRecords",
    "dashIncidentTimelineBadges",
    "dashIncidentTimelineText",
    "dashIncidentTimelineSearch",
    "dashIncidentTimelineSource",
    "dashIncidentTimeline",
    "최근 인시던트 없음",
    "필터에 맞는 인시던트 단서가 없습니다.",
    "필터 결과",
    "관련 화면",
    "rootCauseCorrelationId",
    "correlationId",
    "/ops/api/diagnostics/log-tail",
    "diagnosticLog",
    "logEvidence",
    "sourceLifecycle",
    "/ops/api/source-health",
    "라이브 소스 상태",
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
    "runSourceHealthBulk",
    "sourceHealthRetryIds",
    "sourceHealthBulkTargetIds",
    "sourceHealthAuditHref",
    "/ops/api/source-health/bulk",
    "data-source-health-retry",
    "재검증 대상만 다시 확인",
    "소스 상태 변경 이력",
    "source-health-state-change",
    "source-diagnostics",
    "라이브 소스 상태 재검증",
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
    ".root-cause-action-buttons",
    ".incident-timeline-controls",
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
  assert(httpServer.includes("SourceReconnectStatsSnapshot"), "source health API is missing reconnect stats snapshot");
  assert(httpServer.includes("OpsHealthReconnectStatsForSource"), "source health API is missing source reconnect matcher");
  assert(httpServer.includes("SourceDescriptorSnapshots"), "source health API is missing descriptor snapshots");
  assert(httpServer.includes("SourceEgressStatsSnapshot"), "source health API is missing egress stats snapshot");
  assert(httpServer.includes("OpsHealthEgressStatsForSource"), "source health API is missing source egress matcher");
  assert(httpServer.includes("no-egress-session"), "source health API is missing WebRTC egress session reason");
  assert(httpServer.includes("ApplyOpsSourceHealthCodec"), "source health API is missing descriptor codec mapping");
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
