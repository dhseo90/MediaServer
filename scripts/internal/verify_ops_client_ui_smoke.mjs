#!/usr/bin/env node
// 파일 용도: /ops와 /client 제품 shell의 안정 selector와 client 노출 금지 항목을 빠르게 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";

import { findChrome, isTruthy, openBrowserPage, parseWidthList, runVisualSmoke } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
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
  'class="product-shell"',
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
    must: ['data-testid="ops-home-page"', 'data-ops-panel="home"', 'id="homeChannelCount"', 'class="debug-drawer"'],
  },
  {
    name: "ops-dashboard",
    path: "/ops/dashboard",
    visualSelector: '[data-testid="ops-dashboard-page"]',
    must: ['data-testid="ops-dashboard-page"', 'id="dashActiveSessions"', 'id="dashHealthBadges"', '/ops/api/runtime/status'],
    mustNot: ['<iframe', 'opsDashboardFrame', '/lab/rules?embed=1', '/lab/runtime/status'],
  },
  {
    name: "ops-live",
    path: "/ops/live",
    visualSelector: '[data-testid="ops-live-page"]',
    must: ['data-testid="ops-live-page"', 'id="opsLiveTileGrid"', 'id="opsLiveDensity"', 'id="opsLiveFocus"', 'id="opsLiveFilterInput"', 'id="opsLiveAttentionCount"', 'id="opsLiveUnassignedCount"', 'id="opsLiveDrilldownSummary"', 'id="opsLiveDetailEventRows"', 'id="opsLivePreviewSummary"', 'id="opsLivePreviewTarget"', 'id="opsLivePreviewMode"', 'id="opsLivePreviewPrimaryVideo"', 'id="opsLivePreviewSecondaryVideo"', 'id="opsLivePreviewPrimarySummary"', 'id="opsLivePreviewSecondarySummary"', 'id="opsLivePreviewPrimaryHealthBadges"', 'id="opsLivePreviewSecondaryHealthBadges"', 'id="opsLivePreviewStart"', 'id="opsLivePreviewStop"', 'id="opsLiveTimelineSummary"', 'id="opsLiveTimelineRows"', 'id="opsLiveActionSummary"', 'id="opsLiveActionButtons"', 'id="opsLiveDetailJson"', 'id="opsLiveEventRows"', '/ops/api/sources', '/ops/api/views', '/webrtc/config', 'RTCPeerConnection'],
    mustNot: ['후속 구현 항목입니다', '<iframe', '/lab/rules?embed=1'],
  },
  {
    name: "ops-rules",
    path: "/ops/rules",
    visualSelector: '[data-testid="ops-rules-page"]',
    must: ['data-testid="ops-rules-page"', 'id="opsRulesFilterInput"', 'id="opsVaRuleRows"', 'id="opsEventRuleRows"', 'id="opsProfileRows"', '/ops/api/rules/catalog'],
    mustNot: ['<iframe', 'opsRulesFrame', '/lab/rules?embed=1', '/lab/analysis/rules', '/lab/analysis/va-rules'],
  },
  {
    name: "ops-sources",
    path: "/ops/sources",
    visualSelector: '[data-testid="ops-sources-page"]',
    must: ['data-testid="ops-sources-page"', 'id="channels-body"', 'id="channel-detail-panel"', "Registry raw JSON", 'name="whepUrl"', "WHEP URL"],
  },
  {
    name: "ops-users",
    path: "/ops/users",
    visualSelector: '[data-testid="ops-users-page"]',
    must: ['data-testid="ops-users-page"', 'id="users-body"', 'id="access-requests-body"', 'id="request-invite-output"', 'id="user-editor"', 'id="view-assignment"', '/ops/api/access-requests'],
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
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"'],
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

if (chromePath) {
  try {
    await assertOpsLivePreviewInteractionSmoke();
    passCount += 1;
    console.log("[pass] ops-live-preview-interaction: start/stop/mode/dual-slot smoke ok");
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[ops-live-preview-interaction] ${message}`);
    console.log(`[fail] ops-live-preview-interaction: ${message}`);
  }
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
    "opsLiveRaw",
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

async function assertOpsLivePreviewInteractionSmoke() {
  const browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/live",
    timeoutMs,
    chromePath,
    debugPort: debugPortBase + 500,
    width: 1280,
    height: visualHeight,
    outputDir,
  });
  try {
    const result = await browser.evaluate(buildOpsLivePreviewInteractionExpression(), timeoutMs);
    if (!result?.ok) {
      throw new Error(`${result?.error || "interaction smoke failed"} :: ${JSON.stringify(result)}`);
    }
  } finally {
    await browser.close();
  }
}

function buildOpsLivePreviewInteractionExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const assertOk = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const FakeResponse = class {
        constructor(body, init = {}) {
          this._body = body;
          this.status = init.status || 200;
          this.ok = this.status >= 200 && this.status < 300;
          this.headers = new Headers(init.headers || { 'Content-Type': 'application/json' });
        }
        async text() {
          return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
        }
        async json() {
          return typeof this._body === 'string' ? JSON.parse(this._body || '{}') : this._body;
        }
      };
      const sampleSources = {
        sources: [{
          sourceId: 'cam-01',
          displayName: 'Lobby Cam',
          kind: 'file',
          file: 'sample_h264.mp4',
          enabled: true
        }]
      };
      const sampleViews = {
        views: [{
          viewId: 'view-lobby',
          sourceId: 'cam-01',
          displayName: 'Lobby View',
          enabled: true,
          defaultRuleId: 'rule-loitering',
          allowedRuleIds: ['rule-loitering'],
          allowedOverlayModes: ['raw', 'va-overlay', 'va-rule']
        }]
      };
      const sampleCatalog = {
        rules: [],
        profiles: [],
        vaRules: [{
          id: 'rule-loitering',
          ruleId: 'rule-loitering',
          enabled: true,
          source: { sourceId: 'cam-01', kind: 'file', file: 'sample_h264.mp4' },
          analysis: { profileId: 'server-default-va', classes: ['person'] },
          scenario: { type: 'loitering' }
        }]
      };
      const sampleRuntime = {
        sessionManager: { activeSessions: 1, registryActiveStreams: 1, activeAnalysisTaps: 1 },
        analysisMatching: {
          reuseGroupCount: 1,
          activeTapCount: 1,
          activeTaps: [{ tapId: 'tap-1', streamKey: 'cam-01', selectedRuleId: 'rule-loitering', lastUsedAgeMs: 900 }]
        },
        webrtcHttp: {
          egressSessions: 0,
          publishSessions: 0,
          publishSources: [],
          metadataDataChannel: { channels: [] },
          metadataSideChannel: { activeSseClients: 0, activeWebSocketClients: 0 }
        },
        debugCounters: {}
      };
      const sampleEvents = {
        records: {
          records: [{
            eventId: 'evt-1',
            eventType: 'loitering',
            status: 'active',
            streamId: 'cam-01',
            channelId: 'cam-01',
            trackId: 'track-7',
            scenarioName: 'loitering',
            updateTime: Date.now(),
            snapshotPath: '/tmp/snap-1.jpg',
            clipPath: '/tmp/clip-1'
          }]
        }
      };
      const sampleDashboard = {
        health: { metadataAgeMs: 800, lastFrameAgeMs: 600 },
        connection: { lastFrameAgeMs: 600 },
        analysis: { trackCount: 2, activeEventCount: 1, scenarioCount: 1, latestEventTime: Date.now() },
        events: {
          warning: true,
          latestEventTime: Date.now(),
          countsByType: [{ eventType: 'loitering', count: 1 }]
        }
      };
      const requestLog = [];
      const sessionBodies = [];
      const answerBodies = [];
      const deleteCalls = [];
      const writeBodies = [];
      const activeSessions = new Map();
      let sessionSeq = 0;
      const originalFetch = window.fetch.bind(window);
      const originalPc = window.RTCPeerConnection;
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
      const fakeStream = { getTracks: () => [{ stop() {} }] };
      class FakeRTCPeerConnection {
        constructor() {
          this.connectionState = 'new';
          this.iceConnectionState = 'new';
          this.localDescription = null;
          this.remoteDescription = null;
          this.onconnectionstatechange = null;
          this.oniceconnectionstatechange = null;
          this.ontrack = null;
          this.onicecandidate = null;
        }
        async setRemoteDescription(description) {
          this.remoteDescription = description;
        }
        async createAnswer() {
          return { type: 'answer', sdp: 'fake-answer-sdp' };
        }
        async setLocalDescription(description) {
          this.localDescription = description;
          this.connectionState = 'connected';
          this.iceConnectionState = 'connected';
          setTimeout(() => {
            this.onconnectionstatechange?.();
            this.oniceconnectionstatechange?.();
            this.ontrack?.({ track: { kind: 'video' }, streams: [fakeStream] });
            this.onicecandidate?.({ candidate: null });
          }, 10);
        }
        async addIceCandidate() {}
        close() {
          this.connectionState = 'closed';
          this.iceConnectionState = 'closed';
          this.onconnectionstatechange?.();
          this.oniceconnectionstatechange?.();
        }
      }
      window.RTCPeerConnection = FakeRTCPeerConnection;
      window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
        const path = url.pathname + url.search;
        requestLog.push({ method: (init.method || 'GET').toUpperCase(), path });
        if (path === '/ops/api/sources') return new FakeResponse(sampleSources);
        if (path === '/ops/api/views') return new FakeResponse(sampleViews);
        if (path === '/ops/api/rules/catalog') return new FakeResponse(sampleCatalog);
        if (path === '/ops/api/runtime/status') return new FakeResponse(sampleRuntime);
        if (path.startsWith('/ops/api/events/status')) return new FakeResponse(sampleEvents);
        if (path === '/ops/api/users') return new FakeResponse({ users: [] });
        if (path === '/ops/api/sources/cam-01' && (init.method || 'GET').toUpperCase() === 'PUT') {
          const body = JSON.parse(String(init.body || '{}'));
          writeBodies.push({ kind: 'source', body });
          sampleSources.sources[0].enabled = body.enabled !== false;
          return new FakeResponse({ ok: true });
        }
        if (path === '/ops/api/views/view-lobby' && (init.method || 'GET').toUpperCase() === 'PUT') {
          const body = JSON.parse(String(init.body || '{}'));
          writeBodies.push({ kind: 'view', body });
          sampleViews.views[0].enabled = body.enabled !== false;
          return new FakeResponse({ ok: true });
        }
        if (path === '/webrtc/config') return new FakeResponse({ peerConnectionConfig: { iceServers: [] } });
        if (path === '/client/api/views/view-lobby/dashboard') return new FakeResponse(sampleDashboard);
        if (path === '/client/api/views/view-lobby/webrtc/session' && (init.method || 'GET').toUpperCase() === 'POST') {
          const body = JSON.parse(String(init.body || '{}'));
          sessionBodies.push(body);
          sessionSeq += 1;
          const sessionId = 'session-' + sessionSeq;
          activeSessions.set(sessionId, body);
          return new FakeResponse({ sessionId, offer: 'fake-offer-sdp' });
        }
        if (path.startsWith('/client/api/views/view-lobby/webrtc/session/session-') && path.endsWith('/answer')) {
          answerBodies.push(String(init.body || ''));
          return new FakeResponse({}, { status: 204 });
        }
        if (path.startsWith('/client/api/views/view-lobby/webrtc/session/session-') && path.endsWith('/ice')) {
          if ((init.method || 'GET').toUpperCase() === 'GET') return new FakeResponse({ candidates: [] });
          return new FakeResponse({}, { status: 204 });
        }
        if (path.startsWith('/client/api/views/view-lobby/webrtc/session/session-') && (init.method || 'GET').toUpperCase() === 'DELETE') {
          deleteCalls.push(path);
          activeSessions.delete(path.split('/').slice(-1)[0]);
          return new FakeResponse({}, { status: 204 });
        }
        return originalFetch(input, init);
      };
      try {
        await refreshLive();
        await wait(50);
        const tiles = Array.from(document.querySelectorAll('#opsLiveTileGrid [data-live-row-id]'));
        assertOk(tiles.length > 0, 'ops live tile rows missing after refresh');
        tiles[0].click();
        await wait(20);
        document.getElementById('opsLivePreviewMode').value = 'raw';
        document.getElementById('opsLivePreviewMode').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewTarget').value = 'primary';
        document.getElementById('opsLivePreviewTarget').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewStart').click();
        await wait(80);
        assertOk(sessionBodies.length >= 1, 'primary preview session was not created');
        assertOk(sessionBodies[0].overlayMode === 'raw', 'raw preview payload mismatch');
        assertOk(answerBodies.length >= 1, 'primary preview answer was not posted');
        assertOk((document.getElementById('opsLiveTimelineRows').textContent || '').includes('track 2'), 'timeline runtime summary missing');
        assertOk(document.getElementById('opsLivePreviewPrimarySummary').textContent.includes('연결 중')
          || document.getElementById('opsLivePreviewPrimarySummary').textContent.includes('view-lobby'),
          'primary preview summary not updated');
        document.getElementById('opsLivePreviewMode').value = 'va-overlay';
        document.getElementById('opsLivePreviewMode').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewRestart').click();
        await wait(80);
        assertOk(sessionBodies.some(item => item.overlayMode === 'va-overlay'), 'va-overlay restart payload missing');
        document.getElementById('opsLivePreviewMode').value = 'va-rule';
        document.getElementById('opsLivePreviewMode').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewRestart').click();
        await wait(80);
        assertOk(sessionBodies.some(item => item.overlayMode === 'va-rule' && item.ruleId === 'rule-loitering'), 'va-rule restart payload missing ruleId');
        document.getElementById('opsLivePreviewTarget').value = 'secondary';
        document.getElementById('opsLivePreviewTarget').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewMode').value = 'raw';
        document.getElementById('opsLivePreviewMode').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewStart').click();
        await wait(80);
        assertOk(sessionBodies.length >= 4, 'secondary slot preview session was not created');
        assertOk(document.getElementById('opsLivePreviewSecondarySummary').textContent.includes('view-lobby'), 'secondary preview summary not updated');
        document.getElementById('opsLivePreviewTarget').value = 'primary';
        document.getElementById('opsLivePreviewTarget').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('opsLivePreviewStop').click();
        await wait(60);
        assertOk(deleteCalls.length >= 3, 'preview stop did not cleanup prior sessions');
        const stopPreviewButton = Array.from(document.querySelectorAll('#opsLiveActionButtons [data-ops-live-action]'))
          .find(node => node.dataset.opsLiveAction === 'stop-preview');
        assertOk(Boolean(stopPreviewButton), 'stop-preview action button missing');
        stopPreviewButton.click();
        await wait(40);
        const toggleButton = Array.from(document.querySelectorAll('#opsLiveActionButtons [data-ops-live-action]'))
          .find(node => node.dataset.opsLiveAction === 'toggle-channel');
        assertOk(Boolean(toggleButton), 'toggle-channel action button missing');
        const activeRow = selectedOpsLiveRow() || (Array.isArray(opsLiveState.rows) ? opsLiveState.rows[0] : null);
        assertOk(Boolean(activeRow), 'selected row missing before toggle action');
        await opsLiveToggleChannel(activeRow);
        await wait(40);
        assertOk(writeBodies.some(item => item.kind === 'source' && item.body.enabled === false), 'source disable write missing');
        assertOk(writeBodies.some(item => item.kind === 'view' && item.body.enabled === false), 'view disable write missing');
        const badgeText = document.getElementById('opsLivePreviewPrimaryHealthBadges').textContent || '';
        assertOk(badgeText.includes('ice') && badgeText.includes('meta') && badgeText.includes('frame'), 'health badges missing after preview refresh');
        return {
          ok: true,
          sessionBodies,
          answerCount: answerBodies.length,
          deleteCount: deleteCalls.length,
          writeCount: writeBodies.length,
          requestCount: requestLog.length
        };
      } catch (error) {
        return { ok: false, error: error && error.message ? error.message : String(error), sessionBodies, answerBodies, deleteCalls, writeBodies, requestLog };
      } finally {
        window.fetch = originalFetch;
        window.RTCPeerConnection = originalPc;
        HTMLMediaElement.prototype.play = originalPlay;
      }
    })()
  `;
}
