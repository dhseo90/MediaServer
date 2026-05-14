#!/usr/bin/env node
// 파일 용도: /ops/sources ONVIF camera 타입이 일반 채널 폼에서 source/view 저장 round-trip으로 연결되는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF Ops Sources UI round-trip smoke

Usage:
  ./server.sh verify-onvif-ops-sources-ui [options]

Options:
  --http-base <url>          실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --source-id <id>           저장 검증에 사용할 임시 source/view id입니다. 기본은 비어 있는 90번대 이후 id.
  --timeout-ms <ms>          브라우저/API 대기 시간입니다. 기본 15000.
  --chrome-path <path>       Chrome/Chromium 실행 파일 경로입니다.
  --debug-port <port>        Chrome CDP port입니다. 기본 9765.
  --width <px>               브라우저 viewport 폭입니다. 기본 1180.
  --height <px>              브라우저 viewport 높이입니다. 기본 900.
  --allow-non-temp-registry  /tmp 외 registry에서도 실행합니다. 기본은 안전상 거부.
  -h, --help                 도움말 출력

Checks:
  - /ops/sources 채널 폼에서 ONVIF camera 타입을 선택하고 ONVIF stream URI를 입력
  - /ops/sources 채널 목록의 Live/VA URL 복사 버튼이 ONVIF RTSP/WHEP로 표시됨
  - /ops/rules에서 ONVIF 소스에 연결된 채널 분석 설정 URL 복사 버튼이 ONVIF RTSP/WHEP로 표시됨
  - operator가 channelId를 바꿔도 ONVIF tags/view 옵션이 저장 payload에 유지됨
  - 기존 source/view API로 저장된 뒤 client API에 RTSP URL, ONVIF endpoint, credential이 노출되지 않음
  - smoke 종료 시 만든 vaRule/source/view를 삭제
`);
}

assertKnownOptions(rawArgs, [
  "http-base",
  "source-id",
  "timeout-ms",
  "chrome-path",
  "debug-port",
  "width",
  "height",
  "allow-non-temp-registry",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 15000);
const chromePath = args.chromePath || findChrome();
const debugPort = Number(args.debugPort || 9765);
const width = Number(args.width || 1180);
const height = Number(args.height || 900);
const allowNonTempRegistry = Boolean(args.allowNonTempRegistry);

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

const sourcesBefore = await requestJson("/ops/api/sources");
const viewsBefore = await requestJson("/ops/api/views");
assertTempRegistry(sourcesBefore.storagePath, "source registry");
assertTempRegistry(viewsBefore.storagePath, "published view registry");

const sourceId = String(args.sourceId || findFreeNumericId(sourcesBefore.sources, viewsBefore.views, 90));
assert(/^[1-9]\d*$/.test(sourceId), "--source-id must be numeric");
assert(!hasRecord(sourcesBefore.sources, "sourceId", sourceId), `sourceId ${sourceId} already exists`);
assert(!hasRecord(viewsBefore.views, "viewId", sourceId), `viewId ${sourceId} already exists`);

const displayName = `ONVIF UI Roundtrip ${sourceId}`;
let savedRtspUrl = "";
let savedEventRuleId = "";
let savedVaRuleId = "";
let browser = null;

try {
  browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/sources",
    timeoutMs,
    chromePath,
    debugPort,
    width,
    height,
  });
  await installErrorCollector(browser);
  await assertVisible(browser, '[data-testid="ops-sources-page"]', "ops sources page");
  await clickSelector(browser, "#add-channel", "add ONVIF channel");
  await assertVisible(browser, "#channel-detail-panel", "ONVIF channel form");
  await setSelectValue(browser, '[name="kind"]', "onvif", "ONVIF kind");
  savedRtspUrl = `rtsp://192.0.2.10/live/main-${sourceId}`;
  await setInputValue(browser, '[name="channelId"]', sourceId, "channelId");
  await setInputValue(browser, '[name="displayName"]', displayName, "displayName");
  await setInputValue(browser, '[name="onvifStreamUrl"]', savedRtspUrl, "ONVIF Stream URI");
  await clickSelector(browser, "#channel-save-selected", "ONVIF channel save");
  await assertText(browser, "#status", "채널 저장 완료", "channel save status");
  await assertOnvifChannelCopyButtons(browser, sourceId);
  await assertBrowserErrors(browser);
  console.log("[pass] ONVIF camera source saved through channel form");
  console.log("[pass] ops sources UI renders ONVIF copy buttons");
} finally {
  if (browser) await browser.close().catch(() => {});
}

try {
  const sourcesAfter = await requestJson("/ops/api/sources");
  const savedSource = findRecord(sourcesAfter.sources, "sourceId", sourceId);
  assert(savedSource, "saved source missing from ops API");
  assert(savedSource.kind === "rtsp", "saved source kind must be rtsp");
  assert(savedSource.displayName === displayName, "saved source displayName mismatch");
  assert(savedSource.rtspUrl === savedRtspUrl, "saved source rtspUrl mismatch");
  assert(Array.isArray(savedSource.tags), "saved source tags must be array");
  assert(savedSource.tags.includes("onvif"), "saved source tags missing onvif");
  assert(savedSource.tags.includes("live"), "saved source tags missing live");
  console.log("[pass] ops sources API preserved ONVIF source fields");

  const viewsAfter = await requestJson("/ops/api/views");
  const savedView = findRecord(viewsAfter.views, "viewId", sourceId);
  assert(savedView, "saved PublishedView missing from ops API");
  assert(savedView.displayName === displayName, "saved PublishedView displayName mismatch");
  assert(savedView.sourceId === sourceId, "saved PublishedView sourceId mismatch");
  assert(Array.isArray(savedView.allowedOverlayModes), "allowedOverlayModes must be array");
  assert(savedView.allowedOverlayModes.includes("raw"), "PublishedView allowedOverlayModes missing raw");
  console.log("[pass] ops views API preserved ONVIF PublishedView fields");

  const catalogBefore = await requestJson("/ops/api/rules/catalog");
  savedVaRuleId = findFreeNumericAnalysisId(catalogBefore, sourceId);
  savedEventRuleId = findFreeNumericAnalysisId({
    rules: catalogBefore.rules,
    vaRules: [...(Array.isArray(catalogBefore.vaRules) ? catalogBefore.vaRules : []), { id: savedVaRuleId }],
  }, Number(savedVaRuleId) + 1);
  const profileId = findFirstProfileId(catalogBefore) || "1";
  await requestJson(`/lab/analysis/rules/${encodeURIComponent(savedEventRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(onvifEventRulePayload(savedEventRuleId)),
  });
  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(savedVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(onvifVaRulePayload(savedVaRuleId, displayName, savedRtspUrl, savedEventRuleId, profileId)),
  });
  const allowedRuleIds = new Set((Array.isArray(savedView.allowedRuleIds) ? savedView.allowedRuleIds : []).map(String));
  allowedRuleIds.add(savedVaRuleId);
  const allowedOverlayModes = new Set((Array.isArray(savedView.allowedOverlayModes) ? savedView.allowedOverlayModes : ["raw", "va-overlay"]).map(String));
  allowedOverlayModes.add("va-rule");
  await requestJson(`/ops/api/views/${encodeURIComponent(sourceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewId: savedView.viewId,
      displayName: savedView.displayName,
      sourceId: savedView.sourceId,
      defaultRuleId: savedVaRuleId,
      allowedRuleIds: [...allowedRuleIds],
      allowedOverlayModes: [...allowedOverlayModes],
      showDashboard: savedView.showDashboard !== false,
      showEvents: savedView.showEvents !== false,
      showMetadataSummary: savedView.showMetadataSummary !== false,
      clientGroups: Array.isArray(savedView.clientGroups) ? savedView.clientGroups : [],
      maxTiles: Number(savedView.maxTiles || 1),
      enabled: savedView.enabled !== false,
    }),
  });
  browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/rules",
    timeoutMs,
    chromePath,
    debugPort: debugPort + 1,
    width,
    height,
  });
  await installErrorCollector(browser);
  await assertVisible(browser, '[data-testid="ops-rules-page"]', "ops rules page");
  await assertOnvifRuleCopyButtons(browser, savedVaRuleId);
  await clickSelector(browser, `[data-ops-rule-copy-kind="rtsp"][data-ops-rule-copy-id="${cssStringEscape(savedVaRuleId)}"]`, "ONVIF rule RTSP copy");
  await clickSelector(browser, `[data-ops-rule-copy-kind="whep"][data-ops-rule-copy-id="${cssStringEscape(savedVaRuleId)}"]`, "ONVIF rule WHEP copy");
  await assertBrowserErrors(browser);
  await browser.close();
  browser = null;
  console.log("[pass] ops rules UI renders ONVIF copy buttons");

  const clientListText = await requestText("/client/api/views");
  assertNoClientForbiddenText("client-api-views", clientListText, savedRtspUrl);
  const clientList = JSON.parse(clientListText);
  assert(hasRecord(clientList.views, "viewId", sourceId), "client views list missing ONVIF view");
  const clientViewText = await requestText(`/client/api/views/${encodeURIComponent(sourceId)}`);
  assertNoClientForbiddenText(`client-api-view-${sourceId}`, clientViewText, savedRtspUrl);
  const clientView = JSON.parse(clientViewText).view;
  assert(clientView?.viewId === sourceId, "client view detail missing ONVIF view");
  assert(clientView.sourceKind === "rtsp", "client view sourceKind should remain downstream rtsp");
  assert(Array.isArray(clientView.sourceTags) && clientView.sourceTags.includes("onvif"), "client view should expose sanitized ONVIF tag");
  console.log("[pass] client API redacts ONVIF source locator");
} finally {
  if (browser) await browser.close().catch(() => {});
  if (savedVaRuleId) {
    await requestText(`/lab/analysis/va-rules/${encodeURIComponent(savedVaRuleId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch(error => console.log(`[warn] vaRule cleanup failed: ${error.message}`));
  }
  if (savedEventRuleId) {
    await requestText(`/lab/analysis/rules/${encodeURIComponent(savedEventRuleId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch(error => console.log(`[warn] event rule cleanup failed: ${error.message}`));
  }
  if (sourceId) {
    await requestText(`/ops/api/views/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch(error => console.log(`[warn] PublishedView cleanup failed: ${error.message}`));
    await requestText(`/ops/api/sources/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch(error => console.log(`[warn] source cleanup failed: ${error.message}`));
  }
}

console.log("");
console.log("== ONVIF Ops Sources UI round-trip summary ==");
console.log(`- http base: ${httpBase}`);
console.log(`- source/view id: ${sourceId}`);
console.log("- failures: 0");

async function requestJson(urlPath, options = {}) {
  const text = await requestText(urlPath, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 180)}`);
  }
}

async function requestText(urlPath, options = {}) {
  const expectedStatus = Number(options.expectedStatus || 200);
  const response = await fetch(`${httpBase}${urlPath}`, options);
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${urlPath} expected HTTP ${expectedStatus}, got ${response.status}: ${text.slice(0, 220)}`);
  }
  return text;
}

async function clickSelector(browserInstance, selector, description) {
  const result = await waitForResult(
    browserInstance,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: false, message: 'missing element' };
        if (node.hidden || node.disabled) return { ok: false, hidden: node.hidden, disabled: node.disabled };
        node.click();
        return { ok: true };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  await delay(200);
  return result;
}

async function setInputValue(browserInstance, selector, value, description) {
  const result = await browserInstance.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing input' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, value: node.value };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 입력 실패: ${JSON.stringify(result)}`);
  }
}

async function setSelectValue(browserInstance, selector, value, description) {
  const result = await browserInstance.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing select' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, value: node.value };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 선택 실패: ${JSON.stringify(result)}`);
  }
}

async function assertVisible(browserInstance, selector, description) {
  return waitForResult(
    browserInstance,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: false, reason: 'missing' };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          ok: !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          hidden: node.hidden,
          display: style.display,
          visibility: style.visibility,
          width: rect.width,
          height: rect.height
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertText(browserInstance, selector, expected, description) {
  return waitForResult(
    browserInstance,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const text = (node?.textContent || '').trim();
        return { ok: text.includes(${JSON.stringify(expected)}), text };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertOnvifChannelCopyButtons(browserInstance, sourceIdValue) {
  const result = await browserInstance.evaluate(`
    (() => {
      const sourceId = ${JSON.stringify(sourceIdValue)};
      const buttons = Array.from(document.querySelectorAll('[data-copy-stream-channel="' + CSS.escape(sourceId) + '"]'));
      const labels = buttons.map(button => (button.textContent || '').trim()).filter(Boolean);
      const titles = buttons.map(button => button.getAttribute('aria-label') || button.getAttribute('title') || '');
      const requiredLabels = ['ONVIF RTSP', 'ONVIF WHEP'];
      const missing = requiredLabels.filter(label => !labels.includes(label));
      const missingTitle = ['ONVIF 라이브 URL RTSP 복사', 'ONVIF 라이브 URL WHEP 복사', 'ONVIF VA URL RTSP 복사', 'ONVIF VA URL WHEP 복사']
        .filter(label => !titles.some(title => title.includes(label)));
      return {
        ok: buttons.length === 4 && missing.length === 0 && missingTitle.length === 0,
        count: buttons.length,
        labels,
        titles,
        missing,
        missingTitle,
      };
    })()
  `, 5000);
  if (!result?.ok) {
    throw new Error(`ONVIF channel copy button mismatch: ${JSON.stringify(result)}`);
  }
}

async function assertOnvifRuleCopyButtons(browserInstance, vaRuleId) {
  const result = await waitForResult(
    browserInstance,
    `
      (() => {
        const ruleId = ${JSON.stringify(vaRuleId)};
        const buttons = Array.from(document.querySelectorAll('[data-ops-rule-copy-id="' + CSS.escape(ruleId) + '"]'));
        const labels = buttons.map(button => (button.textContent || '').trim()).filter(Boolean);
        const titles = buttons.map(button => button.getAttribute('aria-label') || button.getAttribute('title') || '');
        const okLabels = labels.includes('ONVIF RTSP') && labels.includes('ONVIF WHEP') && labels.includes('WebRTC');
        const okTitles = titles.some(title => title.includes('ONVIF 이 채널 분석 설정의 RTSP URL 복사')) &&
          titles.some(title => title.includes('ONVIF 이 채널 분석 설정의 WHEP URL 복사')) &&
          titles.some(title => title.includes('ONVIF 이 채널 분석 설정의 WebRTC 링크 복사'));
        return { ok: buttons.length === 3 && okLabels && okTitles, count: buttons.length, labels, titles };
      })()
    `,
    item => item?.ok === true,
    "ONVIF rule copy buttons",
  );
  return result;
}

async function installErrorCollector(browserInstance) {
  await browserInstance.evaluate(`
    (() => {
      window.__onvifUiErrors = [];
      window.addEventListener('error', event => {
        window.__onvifUiErrors.push(String(event.message || 'error'));
      });
      window.addEventListener('unhandledrejection', event => {
        window.__onvifUiErrors.push(String(event.reason?.message || event.reason || 'unhandledrejection'));
      });
      if (!console.__onvifUiWrapped) {
        const originalError = console.error.bind(console);
        console.error = (...args) => {
          window.__onvifUiErrors.push(args.map(item => String(item?.message || item)).join(' '));
          originalError(...args);
        };
        console.__onvifUiWrapped = true;
      }
      return true;
    })()
  `, 5000);
}

async function assertBrowserErrors(browserInstance) {
  const errors = await browserInstance.evaluate(`
    (() => (window.__onvifUiErrors || []).filter(Boolean))()
  `, 5000);
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`browser errors: ${errors.slice(0, 5).join(' | ')}`);
  }
}

async function waitForResult(browserInstance, expression, predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await browserInstance.evaluate(expression, Math.min(5000, timeoutMs)).catch(error => ({
      ok: false,
      error: error.message,
    }));
    if (predicate(last)) return last;
    await delay(180);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last)}`);
}

function assertNoClientForbiddenText(label, text, rtspUrl) {
  for (const forbidden of [
    rtspUrl,
    "\"rtspUrl\"",
    "\"canonicalSourceKey\"",
    "\"credentialRef\"",
    "operator-entered-secret",
    "/onvif/device_service",
    "raw diagnostic JSON",
    "\"password\"",
  ]) {
    if (forbidden) {
      assert(!text.includes(forbidden), `${label} leaked forbidden text: ${forbidden}`);
    }
  }
}

function assertTempRegistry(storagePath, label) {
  if (allowNonTempRegistry) return;
  assert(storagePath, `${label} storagePath missing`);
  const resolved = path.resolve(rootDir, storagePath);
  const realParent = fs.realpathSync(path.dirname(resolved));
  const tempRoots = [os.tmpdir(), "/tmp", "/private/tmp"]
    .map(item => fs.realpathSync(item))
    .filter((item, index, items) => items.indexOf(item) === index);
  const underTempRoot = tempRoots.some(tempRoot => (
    realParent === tempRoot || realParent.startsWith(`${tempRoot}${path.sep}`)
  ));
  assert(
    underTempRoot,
    `${label} must be under one of ${tempRoots.join(", ")}; got ${resolved}. Use --allow-non-temp-registry only for disposable environments.`,
  );
}

function findFreeNumericId(sources, views, startAt) {
  const used = new Set([
    ...(Array.isArray(sources) ? sources.map(item => String(item?.sourceId || "")) : []),
    ...(Array.isArray(views) ? views.map(item => String(item?.viewId || "")) : []),
  ]);
  for (let candidate = Number(startAt || 90); candidate < 10000; candidate += 1) {
    if (!used.has(String(candidate))) return String(candidate);
  }
  throw new Error("no free numeric source id found");
}

function findFreeNumericAnalysisId(catalog, preferred) {
  const used = new Set([
    ...(Array.isArray(catalog?.rules) ? catalog.rules.map(item => String(item?.id || "")) : []),
    ...(Array.isArray(catalog?.vaRules) ? catalog.vaRules.map(item => String(item?.id || "")) : []),
  ].filter(Boolean));
  const preferredValue = Number(preferred || 0);
  if (Number.isFinite(preferredValue) && preferredValue > 0 && !used.has(String(preferredValue))) {
    return String(preferredValue);
  }
  for (let candidate = Math.max(90, preferredValue + 1); candidate < 10000; candidate += 1) {
    if (!used.has(String(candidate))) return String(candidate);
  }
  throw new Error("no free numeric analysis id found");
}

function findFirstRuleId(catalog) {
  return (Array.isArray(catalog?.rules) ? catalog.rules : [])
    .map(item => String(item?.id || "").trim())
    .find(Boolean) || "";
}

function findFirstProfileId(catalog) {
  return (Array.isArray(catalog?.profiles) ? catalog.profiles : [])
    .map(item => String(item?.id || item?.profileId || "").trim())
    .find(Boolean) || "";
}

function onvifEventRulePayload(id) {
  return {
    id,
    enabled: true,
    match: { sourceKind: "*", route: "*" },
    analysis: { profileId: "1", classes: ["person"] },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
      },
      minConfidence: 0.25,
      minDurationMs: 0,
    },
    outputs: { overlay: true, metadata: true, events: true },
    ruleKind: "scenario",
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 2000,
      dwellTimeMs: 10000,
      cooldownMs: 5000,
      targetClasses: ["person"],
    },
  };
}

function onvifVaRulePayload(id, displayNameValue, rtspUrl, templateRuleId, profileId) {
  return {
    id,
    name: `${displayNameValue} 분석 설정`,
    enabled: true,
    match: { sourceKind: "*", route: "*", vaRule: id },
    source: { kind: "rtsp", url: rtspUrl },
    analysis: { profileId, classes: ["person"] },
    templateStart: { ruleId: templateRuleId },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
      },
      minConfidence: 0.25,
      minDurationMs: 0,
    },
    outputs: { overlay: true, metadata: true, events: true },
    ruleKind: "scenario",
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 2000,
      dwellTimeMs: 10000,
      cooldownMs: 5000,
      targetClasses: ["person"],
    },
  };
}

function cssStringEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function hasRecord(records, idField, id) {
  return Boolean(findRecord(records, idField, id));
}

function findRecord(records, idField, id) {
  return Array.isArray(records) ? records.find(record => String(record?.[idField] || "") === id) : null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
