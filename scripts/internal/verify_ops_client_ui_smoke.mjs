#!/usr/bin/env node
// 파일 용도: /ops와 /client 제품 shell의 안정 selector와 client 노출 금지 항목을 빠르게 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, isTruthy, openBrowserPage, parseWidthList, runVisualSmoke } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops/Client UI smoke

Usage:
  ./server.sh verify-ops-client-ui [options]

Options:
  --http-base <url>         실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>         HTTP/브라우저 대기 시간입니다. 기본 10000.
  --screenshots[=1]         대표 화면 screenshot smoke를 함께 수행합니다.
  --chrome-path <path>      Chrome/Chromium 실행 파일 경로입니다.
  --visual-widths <csv>     screenshot 검증 viewport 폭 목록입니다. 기본 390,1180.
  --visual-height <px>      screenshot 검증 viewport 높이입니다. 기본 900.
  --debug-port-base <port>  Chrome CDP port 시작값입니다. 기본 9700.
  --output-dir <path>       screenshot/log 출력 디렉터리입니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "screenshots",
  "chrome-path",
  "visual-widths",
  "visual-height",
  "debug-port-base",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const screenshotEnabled = isTruthy(args.screenshots);
const chromePath = args.chromePath || findChrome();
const visualWidths = parseWidthList(args.visualWidths || "390,1180");
const visualHeight = Number(args.visualHeight || 900);
const debugPortBase = Number(args.debugPortBase || 9700);
const runId = `ops-client-ui-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);

const productShellMust = [
  'class="product-shell',
  'id="themeToggleBtn"',
  'class="account-menu"',
  "window.MediaServerUi",
];

const opsShellMust = [
  'aria-label="운영 메뉴"',
  'href="/ops/home"',
  'href="/client/live"',
];

const clientShellMust = [
  'aria-label="클라이언트 메뉴"',
  'id="views-data"',
  '<script type="application/json" id="views-data">',
];

const pageChecks = [
  {
    name: "ops-home",
    path: "/ops/home",
    visualSelector: '[data-testid="ops-home-page"]',
    must: ['data-testid="ops-home-page"', 'data-ops-panel="home"', 'id="homeChannelCount"'],
    mustNot: ['class="debug-drawer"', '운영 raw JSON', 'raw JSON'],
  },
  {
    name: "ops-dashboard",
    path: "/ops/dashboard",
    visualSelector: '[data-testid="ops-dashboard-page"]',
    must: ['data-testid="ops-dashboard-page"', 'data-testid="ops-root-cause-panel"', 'id="dashActiveSessions"', 'id="dashHealthBadges"', 'id="dashRootCauseList"', '/ops/api/runtime/status', '/ops/api/source-health', 'Live Source Health'],
    mustNot: ['<iframe', 'opsDashboardFrame', '/lab/rules?embed=1', '/lab/runtime/status'],
  },
  {
    name: "ops-rules",
    path: "/ops/rules",
    visualSelector: '[data-testid="ops-rules-page"]',
    must: ['data-testid="ops-rules-page"', 'id="opsRulesFilterInput"', 'id="opsVaRuleRows"', 'id="opsEventRuleRows"', 'id="opsProfileRows"', 'id="opsAddVaRuleBtn"', 'id="opsAddEventRuleBtn"', 'id="opsAddProfileBtn"', 'id="opsRulesDetailPanel"', 'id="opsVaRuleForm"', 'id="opsEventRuleForm"', 'id="opsProfileForm"', 'id="opsVaRulePreviewVideo"', 'id="opsVaRuleGeometryPreview"', 'id="opsVaRuleTemplateSeedSelect"', 'id="opsVaRuleProfileSelect"', 'id="opsVaRuleChannelSelect"', '/ops/api/rules/catalog'],
    mustNot: ['<iframe', 'opsRulesFrame', 'id="opsRulesEditorComponent"', '/lab/rules?embed=1'],
  },
  {
    name: "ops-sources",
    path: "/ops/sources",
    visualSelector: '[data-testid="ops-sources-page"]',
    must: ['data-testid="ops-sources-page"', 'data-testid="onvif-import-panel"', 'id="onvif-import-stub"', 'id="onvifImportSummary"', '/ops/api/onvif/import-draft', 'data-testid="channel-bulk-panel"', 'id="channel-bulk-select-all"', 'id="channelBulkDiagnostics"', 'data-testid="source-health-panel"', 'id="channelHealthSummary"', 'id="channelHealthDiagnostics"', 'id="channel-health-bulk-check"', 'id="channel-health-bulk-retry"', 'id="channel-detail-health"', '/ops/api/source-health', '/ops/api/source-health/bulk', 'id="channels-body"', 'id="channel-detail-panel"', 'name="whepUrl"', "ONVIF Live Source import", "Live Source Health", "외부 WHEP URL", "Published WebRTC", "Published sourceId"],
    mustNot: ['AppendTableHead(', 'R"OPS(', 'WHIP Published Source ID', "Registry raw JSON", 'sources-json', 'views-json', 'client-views-json'],
  },
  {
    name: "ops-users",
    path: "/ops/users",
    visualSelector: '[data-testid="ops-users-page"]',
    must: ['data-testid="ops-users-page"', 'id="users-body"', 'id="access-requests-body"', 'id="request-invite-output"', 'id="user-detail-panel"', 'id="user-edit-selected"', 'id="user-save-selected"', 'id="user-close"', 'id="view-assignment"', '/ops/api/access-requests'],
  },
  {
    name: "client-live",
    path: "/client/live",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="live"', 'id="views"', 'id="detail"', '/webrtc/config', 'peerConnectionConfig', 'viewMaxTiles', 'maxTiles', 'id="liveDensity"', 'id="liveSummary"', 'data-action="restart"', 'restartLiveTile'],
    shellMust: clientShellMust,
    mustNot: [...clientForbiddenText(), 'new RTCPeerConnection({ iceServers: [] })'],
  },
  {
    name: "client-dashboard",
    path: "/client/dashboard",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"', 'data-testid="client-dashboard-compare"', 'loadClientDashboardCompare'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
  {
    name: "client-events",
    path: "/client/events",
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
];

let passCount = 0;
let failCount = 0;
const failures = [];

for (const check of pageChecks) {
  try {
    const html = await requestText(check.path);
    const shellMust = check.shellMust || opsShellMust;
    assertContains(check.name, html, [...productShellMust, ...shellMust, ...(check.must || [])]);
    assertOmits(check.name, html, check.mustNot || []);
    passCount += 1;
    console.log(`[pass] ${check.name}: ${check.path}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${check.name}] ${message}`);
    console.log(`[fail] ${check.name}: ${message}`);
  }
}

try {
  await assertOpsApiContract("ops-api-runtime-status", "/ops/api/runtime/status");
  await assertOpsApiContract("ops-api-rules-catalog", "/ops/api/rules/catalog");
  await assertOpsApiContract("ops-api-events-status", "/ops/api/events/status?limit=5");
  passCount += 1;
  console.log("[pass] ops-api-contract: runtime/rules/events product endpoints available");
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[ops-api-contract] ${message}`);
  console.log(`[fail] ops-api-contract: ${message}`);
}

try {
  const payload = await assertClientApiContract("client-api-views", "/client/api/views");
  passCount += 1;
  console.log("[pass] client-api-views: sensitive source/debug fields omitted");
  const views = Array.isArray(payload.views) ? payload.views : [];
  if (views.length === 0) {
    passCount += 1;
    console.log("[pass] client-api-scoped-details: no assigned views to inspect");
  } else {
    let inspected = 0;
    for (const view of views.slice(0, 3)) {
      const viewId = String(view.viewId || "");
      if (!viewId) continue;
      await assertClientApiContract(`client-api-view-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}`);
      if (view.showDashboard !== false) {
        await assertClientApiContract(`client-api-dashboard-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/dashboard`);
      }
      if (view.showEvents !== false) {
        await assertClientApiContract(`client-api-events-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/events?limit=5`);
      }
      if (view.showMetadataSummary !== false) {
        await assertClientApiContract(`client-api-metadata-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/metadata`);
      }
      inspected += 1;
    }
    passCount += 1;
    console.log(`[pass] client-api-scoped-details: inspected=${inspected}`);
  }
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[client-api-contract] ${message}`);
  console.log(`[fail] client-api-contract: ${message}`);
}

try {
  await assertHttpStatus("removed-lab-home", "/lab", 404);
  await assertHttpStatus("removed-lab-rules", "/lab/rules", 404);
  await assertHttpStatus("removed-lab-import", "/lab/import", 404);
  await assertHttpStatus("removed-webrtc-test-page", "/webrtc/test", 404);
  passCount += 1;
  console.log("[pass] removed-ui-routes: lab/import/rules/webrtc-test are closed");
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[removed-ui-routes] ${message}`);
  console.log(`[fail] removed-ui-routes: ${message}`);
}

console.log("");
console.log("== Ops/Client UI smoke 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);

if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

if (screenshotEnabled) {
  const result = await runVisualSmoke({
    checks: pageChecks
      .filter((check) => check.visualSelector)
      .map((check) => ({
        ...check,
        requiredSelectors: [
          "body.product-shell",
          "#themeToggleBtn",
          ".account-menu",
          check.visualSelector,
        ],
      })),
    httpBase,
    timeoutMs,
    chromePath,
    visualWidths,
    visualHeight,
    debugPortBase,
    outputDir,
    summaryTitle: "Ops/Client screenshot smoke 요약",
  });
  if (result.failCount > 0) process.exit(1);
}

function clientForbiddenText() {
  return [
    "Registry raw JSON",
    "debugCounters",
    "Developer URL",
    "BBox diagnostics",
    "developer-url-details",
    "opsEventsRaw",
    "sources-json",
    "views-json",
    "client-views-json",
    "rtsp://",
    "WHIP sourceId",
    "Event POST",
    "/lab/runtime/status",
    "/lab/analysis/event-post",
    "/lab/analysis/taps",
    'href="/webrtc/session',
    "/webrtc/session?file",
    "sessionToken",
  ];
}

function clientForbiddenJsonKeys() {
  return [
    "rtspUrl",
    "httpUrl",
    "file",
    "webrtcSourceId",
    "whepUrl",
    "storagePath",
    "debugCounters",
    "passwordHash",
    "tokenHash",
    "sessionToken",
  ];
}

async function assertClientApiContract(label, path) {
  const payload = await requestText(path);
  assertJsonKeysOmitted(label, payload, clientForbiddenJsonKeys());
  assertOmits(label, payload, [
    '"rtspUrl"',
    '"httpUrl"',
    '"file":',
    '"webrtcSourceId"',
    '"whepUrl"',
    '"storagePath"',
    '"debugCounters"',
    "Developer URL",
    "BBox diagnostics",
    "data-copy-stream-channel",
    "channel-stream-actions",
    "SourceRegistry",
  ]);
  return parseJson(label, payload);
}

async function assertOpsApiContract(label, path) {
  const payload = await requestText(path);
  assertOmits(label, payload, [
    "/lab/rules?embed=1",
    "opsDashboardFrame",
    "opsRulesFrame",
    "<iframe",
  ]);
  return parseJson(label, payload);
}

function assertContains(name, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`missing selector/text: ${needle}`);
    }
  }
}

function assertOmits(name, text, needles) {
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`forbidden client/debug text leaked: ${needle}`);
    }
  }
}

function assertJsonKeysOmitted(name, text, keys) {
  const forbidden = new Set(keys);
  const payload = parseJson(name, text);
  const visit = (value, path = "$") => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (forbidden.has(key)) {
        throw new Error(`${name}: forbidden JSON key leaked at ${childPath}`);
      }
      visit(child, childPath);
    }
  };
  visit(payload);
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${name}: invalid JSON: ${error.message}`);
  }
}

async function requestText(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
      credentials: "same-origin",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function assertHttpStatus(label, path, expectedStatus) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
      credentials: "same-origin",
    });
    await response.text();
    if (response.status !== expectedStatus) {
      throw new Error(`${label}: expected HTTP ${expectedStatus}, got ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[toCamel(raw)] = next;
      index += 1;
    } else {
      result[toCamel(raw)] = "1";
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
