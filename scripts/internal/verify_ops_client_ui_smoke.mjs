#!/usr/bin/env node
// 파일 용도: /ops와 /client 제품 shell의 안정 selector와 client 노출 금지 항목을 빠르게 검증한다.

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  findChrome,
  isTruthy,
  openBrowserPage,
  parseWidthList,
  runVisualSmoke,
  writeVisualArtifactIndex,
} from "./ui_visual_smoke_lib.mjs";

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
  --visual-widths <csv>     screenshot 검증 viewport 폭 목록입니다. 기본 320,390,760,1180.
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
const visualWidths = parseWidthList(args.visualWidths || "320,390,760,1180");
const visualHeight = Number(args.visualHeight || 900);
const debugPortBase = Number(args.debugPortBase || 9700);
const runId = `ops-client-ui-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);
const clientLiveA11ySnapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), "test/fixtures/client_live_tile_a11y_i18n_snapshot.json"), "utf8"));

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
    must: ['data-testid="ops-dashboard-page"', 'data-testid="ops-root-cause-panel"', 'data-testid="ops-incident-timeline-panel"', 'data-testid="ops-runtime-operations-console"', 'data-testid="ops-va-quality-panel"', 'id="dashActiveSessions"', 'id="dashHealthBadges"', 'id="dashRootCauseList"', 'id="dashIncidentTimelineSearch"', 'id="dashIncidentTimelineSource"', 'id="dashIncidentTimeline"', 'id="dashRuntimeOpsBadges"', 'id="dashRuntimeOpsList"', 'id="dashVaQualityFilterInput"', 'id="dashScenarioTimeline"', 'id="dashTrackingIssueGroups"', '/ops/api/runtime/status', '/ops/api/source-health', '라이브 소스 상태', '최근 인시던트 흐름', '런타임 운영 판독', '라이브 VA 이벤트 품질'],
    mustNot: ['<iframe', 'opsDashboardFrame', '/lab/rules?embed=1', '/lab/runtime/status'],
  },
  {
    name: "ops-events",
    path: "/ops/events",
    must: ['data-testid="ops-events-page"', 'data-route-scope="direct-diagnostic"', 'Primary nav에는 표시하지 않는 direct/diagnostic route', 'id="opsEventsRefresh"', '/ops/api/events/status'],
    mustNot: ['<iframe', 'href="/lab', 'src="/lab', 'href="/webrtc/test"', 'href="/ops/events"'],
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
    must: ['data-testid="ops-sources-page"', 'id="channels-body"', 'id="channel-detail-panel"', 'name="kind"', 'value="onvif"', 'data-source-kind="onvif"', 'data-testid="onvif-probe-draft-tool"', 'id="onvifProbeDraftInput"', 'id="onvifProbeProfileSelect"', 'id="onvifProbeDraftApply"', 'name="onvifStreamUrl"', 'name="whepUrl"', "ONVIF 카메라", "ONVIF 스트림 URI", "ONVIF probe fixture", "ONVIF profile", "Probe draft 적용", "외부 WHEP URL", "Published WebRTC 소스", "발행 sourceId", "라이브 URL", "VA URL"],
    mustNot: ['AppendTableHead(', 'R"OPS(', 'WHIP Published Source ID', "Registry raw JSON", 'sources-json', 'views-json', 'client-views-json', 'data-testid="onvif-import-panel"', 'id="onvif-import-stub"', 'id="onvifImportSummary"', "ONVIF Live Source import", 'data-testid="channel-bulk-panel"', 'id="channel-bulk-select-all"', 'id="channelBulkDiagnostics"', 'data-testid="source-health-panel"', 'id="channelHealthSummary"', 'id="channelHealthDiagnostics"', 'id="channel-detail-health"'],
  },
  {
    name: "ops-users",
    path: "/ops/users",
    visualSelector: '[data-testid="ops-users-page"]',
    must: ['data-testid="ops-users-page"', 'data-testid="user-lifecycle-policy"', 'id="users-body"', 'id="access-requests-body"', 'id="request-invite-output"', 'id="user-detail-panel"', 'id="user-edit-selected"', 'id="user-save-selected"', 'id="user-close"', 'id="view-assignment"', 'id="user-lifecycle-summary"', 'id="user-reset-password-panel"', 'id="user-reset-password-button"', 'data-user-reset-password', 'data-user-set-enabled', '초대 링크는 기본 24시간 동안만 유효', '사용자 감사 JSON/CSV/Diff JSON export', '승인 전: 로그인/세션/채널 권한 없음', '초대 링크 만료', '/ops/api/access-requests'],
  },
  {
    name: "client-live",
    path: "/client/live",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="live"', 'id="views"', 'id="detail"', '/webrtc/config', 'peerConnectionConfig', 'viewMaxTiles', 'maxTiles', 'id="liveDensity"', 'id="liveSummary"', 'id="liveAllStart"', 'startAllLiveTiles', 'data-action="restart"', 'restartLiveTile', 'tabindex="0"', 'focusLiveTile', 'ArrowRight', 'aria-describedby="liveTileStatus${tile.index}"', 'data-role="a11y-status"', 'aria-live="polite"', 'aria-atomic="true"', 'liveTileA11yStatus', 'liveTileConnectionLabel', 'clientDynamicText', 'data-client-copy="status"', 'data-client-copy="events"', '타일 ${tile.index + 1} 시작'],
    shellMust: clientShellMust,
    mustNot: [...clientForbiddenText(), 'new RTCPeerConnection({ iceServers: [] })'],
  },
  {
    name: "client-dashboard",
    path: "/client/dashboard",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"', 'data-testid="client-dashboard-compare"', 'loadClientDashboardCompare', 'data-client-copy="status"', 'data-client-copy="events"'],
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
    if (check.path === "/ops" || check.path.startsWith("/ops/")) {
      assertOpsPrimaryNavContract(check.name, html);
    }
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
  const renderedLeakResult = await runClientRenderedLeakSmoke();
  passCount += renderedLeakResult.passCount;
  failCount += renderedLeakResult.failCount;
  failures.push(...renderedLeakResult.failures);
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[client-rendered-leak] ${message}`);
  console.log(`[fail] client-rendered-leak: ${message}`);
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
  const clientHeaderResult = await runClientHeaderResponsiveSmoke();
  if (clientHeaderResult.failCount > 0) process.exit(1);
  const clientLiveKeyboardResult = await runClientLiveTileKeyboardSmoke();
  if (clientLiveKeyboardResult.failCount > 0) process.exit(1);
  const auditResponsiveResult = await runOpsAuditResponsiveSmoke();
  if (auditResponsiveResult.failCount > 0) process.exit(1);
  const onvifUnsupportedHintResult = await runOpsSourcesOnvifUnsupportedHintSmoke();
  if (onvifUnsupportedHintResult.failCount > 0) process.exit(1);
  const onvifPreviewToolResult = await runOpsSourcesOnvifPreviewToolSmoke();
  if (onvifPreviewToolResult.failCount > 0) process.exit(1);
  writeVisualArtifactIndex({
    outputDir,
    title: "Ops/Client Visual Regression Artifacts",
    command: "./server.sh verify-ops-client-ui --screenshots",
    httpBase,
    visualWidths,
    visualHeight,
    checks: pageChecks.filter((check) => check.visualSelector),
  });
}

function clientForbiddenText() {
  return [
    "Registry raw JSON",
    "raw JSON",
    "raw diagnostic",
    "debugCounters",
    "debugSummary",
    "Developer URL",
    "BBox diagnostics",
    "bboxDiagnostics",
    "analysisTapId",
    "developer-url-details",
    "opsEventsRaw",
    "sources-json",
    "views-json",
    "client-views-json",
    "sourceUrl",
    "sourceUri",
    "rtspUrl",
    "httpUrl",
    "whepUrl",
    "storagePath",
    "modelPath",
    "modelSha256",
    "modelChecksum",
    "modelProvenance",
    "modelUrl",
    "appearanceCrop",
    "appearanceEmbedding",
    "credentialRef",
    "passwordHash",
    "passwordHistory",
    "tokenHash",
    "rtsp://",
    "rtsps://",
    "file://",
    "WHIP sourceId",
    "Event POST",
    "/lab/runtime/status",
    "/lab/analysis/event-post",
    "/lab/analysis/taps",
    "/ops/api/sources",
    "/ops/api/views",
    "opsVaRuleForm",
    "opsEventRuleForm",
    "opsProfileForm",
    'href="/webrtc/session',
    "/webrtc/session?file",
    "sessionToken",
  ];
}

function assertOpsPrimaryNavContract(name, html) {
  const match = html.match(/<nav class="image-nav-tabs"[^>]*aria-label="운영 메뉴"[\s\S]*?<\/nav>/);
  if (!match) {
    throw new Error(`${name}: ops primary nav block not found`);
  }
  const nav = match[0];
  for (const href of ['href="/ops/home"', 'href="/ops/dashboard"', 'href="/ops/sources"', 'href="/ops/rules"', 'href="/client/live"']) {
    if (!nav.includes(href)) {
      throw new Error(`${name}: primary nav missing ${href}`);
    }
  }
  if (nav.includes('href="/ops/events"')) {
    throw new Error(`${name}: /ops/events must remain a direct route, not primary nav`);
  }
}

async function runClientRenderedLeakSmoke() {
  const result = { passCount: 0, failCount: 0, failures: [] };
  if (!chromePath) {
    console.log("[skip] client-rendered-leak: Chrome executable not found");
    return result;
  }
  const clientPaths = [
    { name: "client-live-rendered-leak", path: "/client/live" },
    { name: "client-dashboard-rendered-leak", path: "/client/dashboard" },
    { name: "client-events-rendered-leak", path: "/client/events" },
  ];
  let checkIndex = 0;
  for (const check of clientPaths) {
    const browser = await openBrowserPage({
      httpBase,
      pagePath: check.path,
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 120 + checkIndex,
      width: 390,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      const leakResult = await browser.evaluate(clientRenderedLeakExpression(), 10000);
      if (!leakResult?.ok) {
        const details = Array.isArray(leakResult?.issues) ? leakResult.issues.join("; ") : JSON.stringify(leakResult);
        throw new Error(`${check.name}: ${details}`);
      }
      result.passCount += 1;
      console.log(`[pass] ${check.name}: forbidden=0, textLength=${leakResult.textLength}`);
    } catch (error) {
      result.failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      result.failures.push(`[${check.name}] ${message}`);
      console.log(`[fail] ${check.name}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  return result;
}

function clientRenderedLeakExpression() {
  return `
    (() => {
      const forbidden = ${JSON.stringify(clientForbiddenText())};
      const forbiddenSelectors = [
        '#opsRulesDetailPanel',
        '#opsVaRuleForm',
        '#opsEventRuleForm',
        '#opsProfileForm',
        '[data-testid="ops-rules-page"]',
        '[data-testid="ops-sources-page"]',
        '[data-testid="source-health-panel"]',
        '.debug-drawer',
        '[data-debug-counter]',
        '[data-source-url]',
      ];
      const issues = [];
      const visibleText = document.body ? document.body.innerText || '' : '';
      const html = document.documentElement ? document.documentElement.outerHTML || '' : '';
      const dataScripts = Array.from(document.querySelectorAll('script[type="application/json"]'))
        .map((node) => node.textContent || '')
        .join('\\n');
      for (const needle of forbidden) {
        if (!needle) continue;
        if (visibleText.includes(needle)) {
          issues.push('visible forbidden text: ' + needle);
        } else if (dataScripts.includes(needle)) {
          issues.push('JSON script forbidden text: ' + needle);
        } else if (html.includes(needle) && !needle.startsWith('/ops/api/')) {
          issues.push('DOM forbidden text: ' + needle);
        }
      }
      for (const selector of forbiddenSelectors) {
        if (document.querySelector(selector)) {
          issues.push('forbidden selector present: ' + selector);
        }
      }
      return {
        ok: issues.length === 0,
        issues,
        textLength: visibleText.length,
      };
    })()
  `;
}

async function runClientHeaderResponsiveSmoke() {
  let headerPassCount = 0;
  let headerFailCount = 0;
  const headerFailures = [];
  const clientPaths = [
    { name: "client-live-header", path: "/client/live" },
    { name: "client-dashboard-header", path: "/client/dashboard" },
  ];
  let checkIndex = 0;
  for (const check of clientPaths) {
    for (const width of visualWidths) {
      if (width > 560) continue;
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.path,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 200 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        const result = await browser.evaluate(clientHeaderResponsiveExpression(), 10000);
        const label = `${check.name}-${width}`;
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        headerPassCount += 1;
        console.log(`[pass] ${label}: navWidth=${Math.round(result.navWidth)}, accountTop=${Math.round(result.accountTop)}`);
      } catch (error) {
        headerFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        headerFailures.push(`[${check.name}] ${message}`);
        console.log(`[fail] ${check.name}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Client mobile header smoke 요약 ==");
  console.log(`- 통과: ${headerPassCount}`);
  console.log(`- 실패: ${headerFailCount}`);
  if (headerFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of headerFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: headerPassCount, failCount: headerFailCount };
}

function clientHeaderResponsiveExpression() {
  return `
    (() => {
      const issues = [];
      const nav = document.querySelector('body.client-shell header.app-chrome .client-image-nav-tabs');
      const account = document.querySelector('body.client-shell header.app-chrome .account-menu');
      const headerTop = document.querySelector('body.client-shell header.app-chrome .app-header-top');
      const navItems = Array.from(document.querySelectorAll('body.client-shell header.app-chrome .client-image-nav-tabs .image-nav'));
      if (!nav) issues.push('client nav missing');
      if (!account) issues.push('client account menu missing');
      if (!headerTop) issues.push('client header grid missing');
      if (navItems.length < 2) issues.push('client nav items missing');
      if (!nav || !account || !headerTop || navItems.length < 2) {
        return { ok: false, issues };
      }
      const navRect = nav.getBoundingClientRect();
      const accountRect = account.getBoundingClientRect();
      const headerRect = headerTop.getBoundingClientRect();
      const intersects = navRect.left < accountRect.right &&
        navRect.right > accountRect.left &&
        navRect.top < accountRect.bottom &&
        navRect.bottom > accountRect.top;
      if (intersects) {
        issues.push('client nav/account boxes overlap');
      }
      if (navRect.width < headerRect.width - 2) {
        issues.push('client nav does not fill the mobile header row');
      }
      if (accountRect.top < navRect.bottom + 8) {
        issues.push('client account menu is not stacked below nav');
      }
      for (const item of navItems) {
        const rect = item.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 44) {
          issues.push('client nav item too small: ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
        }
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        navWidth: navRect.width,
        headerWidth: headerRect.width,
        accountTop: accountRect.top,
        navBottom: navRect.bottom,
        overflowX,
      };
    })()
  `;
}

async function runClientLiveTileKeyboardSmoke() {
  let keyboardPassCount = 0;
  let keyboardFailCount = 0;
  const keyboardFailures = [];
  const widths = [...new Set([390, 1180].filter((width) => visualWidths.includes(width)))];
  const languageChecks = [
    { language: "ko", pagePath: "/client/live?lang=ko" },
    { language: "en", pagePath: "/client/live?lang=en" },
  ];
  let checkIndex = 0;
  for (const check of languageChecks) {
    for (const width of widths.length ? widths : [390]) {
      const label = `client-live-keyboard-${check.language}-${width}`;
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.pagePath,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 260 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        const result = await browser.evaluate(clientLiveTileKeyboardExpression(clientLiveA11ySnapshot), 10000);
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        keyboardPassCount += 1;
        console.log(`[pass] ${label}: tiles=${result.tileCount}, selected=${result.selectedTile}, active=${result.activeTile}`);
      } catch (error) {
        keyboardFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        keyboardFailures.push(`[${label}] ${message}`);
        console.log(`[fail] ${label}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Client live tile keyboard smoke 요약 ==");
  console.log(`- 통과: ${keyboardPassCount}`);
  console.log(`- 실패: ${keyboardFailCount}`);
  if (keyboardFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of keyboardFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: keyboardPassCount, failCount: keyboardFailCount };
}

function clientLiveTileKeyboardExpression(a11ySnapshot) {
  return `
    (async () => {
      const a11ySnapshot = ${JSON.stringify(a11ySnapshot)};
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = message => { if (issues.length < 16) issues.push(message); };
      const domExtraction = a11ySnapshot.domExtraction || {};
      const language = String(document.documentElement.dataset.lang || document.documentElement.lang || 'ko').toLowerCase().startsWith('en')
        ? 'english'
        : 'korean';
      const expectedOfflineStatus = (a11ySnapshot.scenarios || []).find(item => item.id === 'offline-empty')?.[language] || a11ySnapshot[language] || '';
      const requiredStatusParts = language === 'english'
        ? ['Tile 1:', 'Status', 'Connection', 'Tracks', 'Events', 'Metadata', 'Retry']
        : (Array.isArray(domExtraction.requiredKoreanParts) && domExtraction.requiredKoreanParts.length
          ? domExtraction.requiredKoreanParts
          : ['타일 1:', '상태', '연결', '트랙', '이벤트', '메타데이터', '재시도']);
      await wait(350);
      const tiles = Array.from(document.querySelectorAll('.tile'));
      if (tiles.length < 2) issue('expected at least two live tiles, got ' + tiles.length);
      const first = tiles[0];
      const second = tiles[1];
      if (first) {
        if (first.getAttribute('tabindex') !== '0') issue('first tile is not tabbable');
        if (first.getAttribute('role') !== 'group') issue('first tile role is not group');
        const expectedTileName = language === 'english' ? 'Tile 1' : '타일 1';
        if (!String(first.getAttribute('aria-label') || '').includes(expectedTileName)) issue('first tile aria-label missing tile number');
        const viewSelect = first.querySelector('[data-role="view"]');
        if (viewSelect && viewSelect.value !== '' && !viewSelect.disabled) {
          viewSelect.value = '';
          viewSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(180);
        }
        const describedBy = String(first.getAttribute('aria-describedby') || '');
        if (!describedBy) issue('first tile aria-describedby missing');
        const describedNode = describedBy ? document.getElementById(describedBy) : null;
        if (!describedNode) issue('first tile described status node missing');
        if (describedNode) {
          const statusText = String(describedNode.textContent || '');
          if (describedNode.dataset.role !== 'a11y-status') issue('first tile described node role mismatch');
          if (describedNode.getAttribute('aria-live') !== 'polite') issue('first tile status aria-live missing');
          if (describedNode.getAttribute('aria-atomic') !== 'true') issue('first tile status aria-atomic missing');
          if (!describedNode.classList.contains('sr-only')) issue('first tile status is not visually hidden');
          for (const expected of requiredStatusParts) {
            if (!statusText.includes(expected)) issue('first tile a11y status missing text: ' + expected);
          }
          if (expectedOfflineStatus && statusText !== expectedOfflineStatus) {
            issue('first tile a11y status mismatch: ' + statusText);
          }
          const style = window.getComputedStyle(describedNode);
          if (style.position !== 'absolute' || Number.parseFloat(style.width || '0') > 2 || Number.parseFloat(style.height || '0') > 2) {
            issue('first tile sr-only style is not constrained');
          }
        }
        const labels = Array.from(first.querySelectorAll('button, select')).map(node => node.getAttribute('aria-label') || '');
        const expectedLabels = language === 'english'
          ? ['Tile 1 Start', 'Tile 1 Reconnect', 'Tile 1 Stop', 'Tile 1 Select channel']
          : ['타일 1 시작', '타일 1 재연결', '타일 1 정지', '타일 1 채널 선택'];
        for (const expected of expectedLabels) {
          if (!labels.some(label => label.includes(expected))) issue('missing control aria-label: ' + expected);
        }
        const tileRect = first.getBoundingClientRect();
        for (const control of first.querySelectorAll('button, select')) {
          const rect = control.getBoundingClientRect();
          if (control.closest('[hidden]') || rect.width <= 0 || rect.height <= 0) continue;
          if (rect.left < tileRect.left - 1 || rect.right > tileRect.right + 1) {
            issue('first tile control overflows tile bounds');
            break;
          }
          if (window.innerWidth <= 560 && control.matches('button') && rect.height < 44) {
            issue('first tile mobile button target too small: ' + Math.round(rect.height) + 'px');
          }
        }
        first.focus();
        await wait(80);
        if (document.activeElement !== first) issue('first tile did not receive focus');
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        await wait(160);
        if (second && document.activeElement !== second) issue('ArrowRight did not move focus to second tile');
        if (second && !second.classList.contains('selected')) issue('ArrowRight did not select second tile');
        second?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
        await wait(160);
        if (document.activeElement !== first) issue('Home did not move focus back to first tile');
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        await wait(120);
        if (!first.classList.contains('selected')) issue('Enter did not select focused tile');
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) issue('document horizontal overflow ' + overflowX + 'px');
      const selected = document.querySelector('.tile.selected');
      return {
        ok: issues.length === 0,
        issues,
        tileCount: tiles.length,
        selectedTile: selected?.dataset?.tile || '',
        activeTile: document.activeElement?.dataset?.tile || '',
        overflowX,
      };
    })()
  `;
}

async function runOpsAuditResponsiveSmoke() {
  let auditPassCount = 0;
  let auditFailCount = 0;
  const auditFailures = [];
  const auditPaths = [
    { name: "ops-sources-audit", path: "/ops/sources", selector: "#channel-audit-list" },
    { name: "ops-users-audit", path: "/ops/users", selector: "#user-audit-list" },
  ];
  let checkIndex = 0;
  for (const check of auditPaths) {
    for (const width of visualWidths) {
      if (width > 560) continue;
      const label = `${check.name}-${width}`;
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.path,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 320 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        await browser.evaluate(`document.querySelector(${JSON.stringify(check.selector)})?.scrollIntoView({ block: 'center' }); true`, 10000);
        await browser.screenshot(path.join(outputDir, `${label}.png`));
        const result = await browser.evaluate(opsAuditResponsiveExpression(check.selector), 10000);
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        auditPassCount += 1;
        console.log(`[pass] ${label}: overflow=${result.overflowX}, controls=${result.controlCount}`);
      } catch (error) {
        auditFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        auditFailures.push(`[${check.name}] ${message}`);
        console.log(`[fail] ${check.name}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Ops audit mobile smoke 요약 ==");
  console.log(`- 통과: ${auditPassCount}`);
  console.log(`- 실패: ${auditFailCount}`);
  if (auditFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of auditFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: auditPassCount, failCount: auditFailCount };
}

async function runOpsSourcesOnvifUnsupportedHintSmoke() {
  let hintPassCount = 0;
  let hintFailCount = 0;
  const hintFailures = [];
  const hintWidths = onvifUnsupportedHintWidths();
  let checkIndex = 0;
  for (const width of hintWidths) {
    const label = `ops-sources-onvif-unsupported-hint-${width}`;
    const browser = await openBrowserPage({
      httpBase,
      pagePath: "/ops/sources",
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 440 + checkIndex,
      width,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      await browser.evaluate(prepareOnvifUnsupportedHintExpression(), 10000);
      await browser.screenshot(path.join(outputDir, `${label}.png`));
      const result = await browser.evaluate(onvifUnsupportedHintVisibleExpression(), 10000);
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(`${label}: ${details}`);
      }
      hintPassCount += 1;
      console.log(`[pass] ${label}: hintHeight=${Math.round(result.hintHeight)}, overflow=${result.overflowX}`);
    } catch (error) {
      hintFailCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      hintFailures.push(`[${label}] ${message}`);
      console.log(`[fail] ${label}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  console.log("");
  console.log("== Ops ONVIF unsupported hint screenshot smoke 요약 ==");
  console.log(`- 통과: ${hintPassCount}`);
  console.log(`- 실패: ${hintFailCount}`);
  console.log(`- screenshots: ${outputDir}`);
  if (hintFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of hintFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: hintPassCount, failCount: hintFailCount };
}

async function runOpsSourcesOnvifPreviewToolSmoke() {
  let previewPassCount = 0;
  let previewFailCount = 0;
  const previewFailures = [];
  const previewWidths = onvifPreviewToolWidths();
  const fixtureText = fs.readFileSync(path.resolve("test/fixtures/onvif_probe_result_stub.json"), "utf8");
  let checkIndex = 0;
  for (const width of previewWidths) {
    const label = `ops-sources-onvif-preview-tool-${width}`;
    const browser = await openBrowserPage({
      httpBase,
      pagePath: "/ops/sources",
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 520 + checkIndex,
      width,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      await browser.evaluate(prepareOnvifPreviewToolExpression(fixtureText), 10000);
      await browser.screenshot(path.join(outputDir, `${label}.png`));
      const result = await browser.evaluate(onvifPreviewToolVisibleExpression(), 10000);
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(`${label}: ${details}`);
      }
      previewPassCount += 1;
      console.log(`[pass] ${label}: toolHeight=${Math.round(result.toolHeight)}, overflow=${result.overflowX}`);
    } catch (error) {
      previewFailCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      previewFailures.push(`[${label}] ${message}`);
      console.log(`[fail] ${label}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  console.log("");
  console.log("== Ops ONVIF preview tool screenshot smoke 요약 ==");
  console.log(`- 통과: ${previewPassCount}`);
  console.log(`- 실패: ${previewFailCount}`);
  console.log(`- screenshots: ${outputDir}`);
  if (previewFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of previewFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: previewPassCount, failCount: previewFailCount };
}

function onvifUnsupportedHintWidths() {
  return [320, ...visualWidths.filter(width => width !== 320)];
}

function onvifPreviewToolWidths() {
  const widths = [390, 1180].filter(width => visualWidths.includes(width));
  return widths.length > 0 ? widths : [visualWidths[0]];
}

function prepareOnvifUnsupportedHintExpression() {
  return `
    (async () => {
      const addButton = document.querySelector('#add-channel');
      if (!addButton) throw new Error('add channel button missing');
      addButton.click();
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const panel = document.querySelector('#channel-detail-panel');
        const kind = document.querySelector('#channel-form [name="kind"]');
        if (panel && !panel.hidden && kind) {
          kind.value = 'onvif';
          kind.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const hint = document.querySelector('p[data-source-kind="onvif"].hint');
      if (!hint) throw new Error('ONVIF unsupported hint missing');
      hint.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = hint.getBoundingClientRect();
      const targetTop = Math.max(24, Math.round((window.innerHeight - rect.height) / 2));
      window.scrollBy({ top: rect.top - targetTop, left: 0, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 120));
      return true;
    })()
  `;
}

function prepareOnvifPreviewToolExpression(fixtureText) {
  return `
    (async () => {
      const addButton = document.querySelector('#add-channel');
      if (!addButton) throw new Error('add channel button missing');
      addButton.click();
      let kind = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const panel = document.querySelector('#channel-detail-panel');
        kind = document.querySelector('#channel-form [name="kind"]');
        if (panel && !panel.hidden && kind) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!kind) throw new Error('channel kind select missing');
      kind.value = 'onvif';
      kind.dispatchEvent(new Event('input', { bubbles: true }));
      kind.dispatchEvent(new Event('change', { bubbles: true }));
      const input = document.querySelector('#onvifProbeDraftInput');
      if (!input) throw new Error('ONVIF probe fixture input missing');
      input.value = ${JSON.stringify(fixtureText)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const select = document.querySelector('#onvifProbeProfileSelect');
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (select && !select.disabled && select.options.length > 1) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!select || select.disabled) throw new Error('ONVIF profile select did not enable');
      select.value = 'field-sub-h264';
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const apply = document.querySelector('#onvifProbeDraftApply');
      if (!apply) throw new Error('ONVIF probe draft apply missing');
      apply.click();
      const status = document.querySelector('#onvifProbeDraftStatus');
      for (let attempt = 0; attempt < 50; attempt += 1) {
        if ((status?.textContent || '').includes('Probe draft 적용')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      if (!tool) throw new Error('ONVIF probe draft tool missing');
      tool.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise(resolve => setTimeout(resolve, 160));
      return true;
    })()
  `;
}

function onvifUnsupportedHintVisibleExpression() {
  return `
    (() => {
      const issues = [];
      const hint = document.querySelector('p[data-source-kind="onvif"].hint');
      const input = document.querySelector('[name="onvifStreamUrl"]');
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      const requiredText = [
        'WS-Discovery 자동 검색',
        'PTZ 제어',
        'ONVIF Events/PullPoint',
        'Profile G/Recording/Replay는 제공하지 않습니다',
        '운영자가 확인한 live URI 또는 probe fixture를 사용합니다',
      ];
      if (!hint) issues.push('ONVIF unsupported hint missing');
      if (!input) issues.push('ONVIF stream URI input missing');
      if (!tool) issues.push('ONVIF probe draft tool missing');
      if (!hint || !input || !tool) {
        return { ok: false, issues, overflowX: 0, hintHeight: 0 };
      }
      for (const item of requiredText) {
        if (!hint.textContent.includes(item)) {
          issues.push('ONVIF unsupported hint text missing: ' + item);
        }
      }
      for (const [name, element] of [['hint', hint], ['input', input], ['tool', tool]]) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (element.hidden || style.display === 'none' || style.visibility === 'hidden') {
          issues.push(name + ' is hidden');
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(name + ' has empty rect');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push(name + ' outside viewport horizontally: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      const hintRect = hint.getBoundingClientRect();
      if (hintRect.top < 0 || hintRect.bottom > window.innerHeight) {
        issues.push('hint not fully visible in screenshot viewport: ' + Math.round(hintRect.top) + '..' + Math.round(hintRect.bottom));
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        hintHeight: hintRect.height,
      };
    })()
  `;
}

function onvifPreviewToolVisibleExpression() {
  return `
    (() => {
      const issues = [];
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      const fixtureInput = document.querySelector('#onvifProbeDraftInput');
      const profileSelect = document.querySelector('#onvifProbeProfileSelect');
      const applyButton = document.querySelector('#onvifProbeDraftApply');
      const clearButton = document.querySelector('#onvifProbeDraftClear');
      const status = document.querySelector('#onvifProbeDraftStatus');
      const streamInput = document.querySelector('[name="onvifStreamUrl"]');
      if (!tool) issues.push('ONVIF preview tool missing');
      if (!fixtureInput) issues.push('fixture textarea missing');
      if (!profileSelect) issues.push('profile select missing');
      if (!applyButton) issues.push('apply button missing');
      if (!clearButton) issues.push('clear button missing');
      if (!status) issues.push('status node missing');
      if (!streamInput) issues.push('ONVIF stream URI input missing');
      if (!tool || !fixtureInput || !profileSelect || !applyButton || !clearButton || !status || !streamInput) {
        return { ok: false, issues, overflowX: 0, toolHeight: 0 };
      }
      if (profileSelect.disabled) issues.push('profile select is disabled after fixture input');
      if (profileSelect.value !== 'field-sub-h264') issues.push('selected profile mismatch: ' + profileSelect.value);
      if (!status.textContent.includes('Probe draft 적용')) issues.push('draft apply status missing');
      if (String(streamInput.value || '').trim() !== 'rtsp://192.0.2.20/live/sub') {
        issues.push('drafted ONVIF stream URI mismatch: ' + streamInput.value);
      }
      const expectedOptions = ['field-main-h264', 'field-sub-h264'];
      const optionValues = Array.from(profileSelect.options).map(option => option.value);
      for (const option of expectedOptions) {
        if (!optionValues.includes(option)) issues.push('profile option missing: ' + option);
      }
      for (const [name, element] of [
        ['tool', tool],
        ['fixtureInput', fixtureInput],
        ['profileSelect', profileSelect],
        ['applyButton', applyButton],
        ['clearButton', clearButton],
        ['status', status],
        ['streamInput', streamInput],
      ]) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (element.hidden || style.display === 'none' || style.visibility === 'hidden') {
          issues.push(name + ' is hidden');
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(name + ' has empty rect');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push(name + ' outside viewport horizontally: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      const toolRect = tool.getBoundingClientRect();
      if (toolRect.top < 0 || toolRect.bottom > window.innerHeight) {
        issues.push('preview tool not fully visible in screenshot viewport: ' + Math.round(toolRect.top) + '..' + Math.round(toolRect.bottom));
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        toolHeight: toolRect.height,
      };
    })()
  `;
}

function opsAuditResponsiveExpression(selector) {
  return `
    (() => {
      const issues = [];
      const section = document.querySelector(${JSON.stringify(selector)});
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (!section) {
        return { ok: false, issues: ['audit section missing'], overflowX, controlCount: 0 };
      }
      const controls = Array.from(section.querySelectorAll('.audit-date-input'));
      if (controls.length !== 2) {
        issues.push('expected two audit date inputs, got ' + controls.length);
      }
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (control.type !== 'text') {
          issues.push('audit date input uses native type=' + control.type);
        }
        if (control.placeholder !== 'YYYY-MM-DD HH:mm') {
          issues.push('audit date placeholder mismatch');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push('audit date input outside viewport: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
        if (rect.width < 120) {
          issues.push('audit date input too narrow: ' + Math.round(rect.width));
        }
      }
      const action = section.querySelector('select[id$="-audit-action"]');
      const limit = section.querySelector('select[id$="-audit-limit"]');
      for (const control of [action, limit].filter(Boolean)) {
        const rect = control.getBoundingClientRect();
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push('audit select outside viewport: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        controlCount: controls.length,
      };
    })()
  `;
}

function clientForbiddenJsonKeys() {
  return [
    "rtspUrl",
    "httpUrl",
    "file",
    "webrtcSourceId",
    "whepUrl",
    "storagePath",
    "sourceUrl",
    "sourceUri",
    "debugCounters",
    "debugSummary",
    "analysisTapId",
    "modelPath",
    "modelSha256",
    "modelChecksum",
    "modelProvenance",
    "modelUrl",
    "crop",
    "embedding",
    "appearanceCrop",
    "appearanceEmbedding",
    "passwordHash",
    "passwordHistory",
    "tokenHash",
    "sessionToken",
    "credentialRef",
    "capability",
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
    '"sourceUrl"',
    '"sourceUri"',
    '"debugCounters"',
    '"debugSummary"',
    '"analysisTapId"',
    '"modelPath"',
    '"modelSha256"',
    '"modelChecksum"',
    '"modelProvenance"',
    '"modelUrl"',
    '"crop"',
    '"embedding"',
    '"appearanceCrop"',
    '"appearanceEmbedding"',
    '"passwordHash"',
    '"passwordHistory"',
    '"tokenHash"',
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
