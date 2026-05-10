#!/usr/bin/env node
// 파일 용도: /ops/sources ONVIF import UI가 draft를 실제 source/view 저장 round-trip으로 연결하는지 검증한다.

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
  - /ops/sources ONVIF stub import 버튼이 draft API를 호출해 채널 폼을 채움
  - operator가 channelId를 바꿔도 ONVIF tags/view draft 옵션이 저장 payload에 유지됨
  - 기존 source/view API로 저장된 뒤 client API에 RTSP URL, ONVIF endpoint, credential이 노출되지 않음
  - smoke 종료 시 만든 source/view를 비활성화
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
  await clickSelector(browser, "#onvif-import-stub", "ONVIF stub import");
  await assertVisible(browser, "#channel-detail-panel", "ONVIF channel form");
  await assertText(browser, "#onvifImportSummary", "SourceRegistry 저장 없음", "ONVIF import summary");
  const draftForm = await waitForResult(
    browser,
    `
      (() => {
        const kind = document.querySelector('[name="kind"]')?.value || '';
        const rtspUrl = document.querySelector('[name="rtspUrl"]')?.value || '';
        const panelVisible = !document.querySelector('#channel-detail-panel')?.hidden;
        return { ok: panelVisible && kind === 'rtsp' && rtspUrl.startsWith('rtsp://'), kind, rtspUrl };
      })()
    `,
    item => item?.ok === true,
    "ONVIF draft form values",
  );
  savedRtspUrl = draftForm.rtspUrl;
  await setInputValue(browser, '[name="channelId"]', sourceId, "channelId");
  await setInputValue(browser, '[name="displayName"]', displayName, "displayName");
  await clickSelector(browser, "#channel-save-selected", "ONVIF channel save");
  await assertText(browser, "#status", "채널 저장 완료", "channel save status");
  await assertBrowserErrors(browser);
  console.log("[pass] ONVIF UI import saved through channel form");
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
  console.log("[pass] ops sources API preserved ONVIF source draft fields");

  const viewsAfter = await requestJson("/ops/api/views");
  const savedView = findRecord(viewsAfter.views, "viewId", sourceId);
  assert(savedView, "saved PublishedView missing from ops API");
  assert(savedView.displayName === displayName, "saved PublishedView displayName mismatch");
  assert(savedView.sourceId === sourceId, "saved PublishedView sourceId mismatch");
  assert(Array.isArray(savedView.allowedOverlayModes), "allowedOverlayModes must be array");
  assert(savedView.allowedOverlayModes.includes("raw"), "PublishedView allowedOverlayModes missing raw");
  console.log("[pass] ops views API preserved ONVIF PublishedView draft fields");

  const clientListText = await requestText("/client/api/views");
  assertNoClientForbiddenText("client-api-views", clientListText, savedRtspUrl);
  const clientList = JSON.parse(clientListText);
  assert(hasRecord(clientList.views, "viewId", sourceId), "client views list missing imported view");
  const clientViewText = await requestText(`/client/api/views/${encodeURIComponent(sourceId)}`);
  assertNoClientForbiddenText(`client-api-view-${sourceId}`, clientViewText, savedRtspUrl);
  const clientView = JSON.parse(clientViewText).view;
  assert(clientView?.viewId === sourceId, "client view detail missing imported view");
  assert(clientView.sourceKind === "rtsp", "client view sourceKind should be rtsp");
  console.log("[pass] client API redacts ONVIF imported source locator");
} finally {
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
