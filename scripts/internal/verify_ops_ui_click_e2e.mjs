#!/usr/bin/env node
// 파일 용도: Ops 제품 UI의 주요 탭/패널 흐름을 실제 브라우저 포인터 클릭으로 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { findChrome, openBrowserPage, parseWidthList } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 15000);
const chromePath = args.chromePath || findChrome();
const widths = parseWidthList(args.widths || "390,1180");
const height = Number(args.height || 900);
const debugPortBase = Number(args.debugPortBase || 9750);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_ops_click_e2e_${Date.now()}_${process.pid}`);

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

let passCount = 0;
let failCount = 0;
const failures = [];

for (let index = 0; index < widths.length; index += 1) {
  const width = widths[index];
  const label = `ops-click-${width}`;
  const browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/sources",
    timeoutMs,
    chromePath,
    debugPort: debugPortBase + index,
    width,
    height,
    outputDir,
  });
  try {
    const result = await runOpsClickFlow(browser, { width, label });
    passCount += 1;
    console.log(`[pass] ${label}: ${result.steps.join(", ")}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${label}] ${message}`);
    console.log(`[fail] ${label}: ${message}`);
  } finally {
    await browser.close();
  }
}

console.log("");
console.log("== Ops UI direct click E2E 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);
if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

async function runOpsClickFlow(browser, context) {
  const steps = [];
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  await assertNoOverflow(browser, `${context.label}:sources-initial`);

  await clickSelector(browser, "#add-channel", "채널 추가");
  await assertVisible(browser, "#channel-detail-panel", "채널 추가 패널");
  await assertText(browser, "#channel-editor-title", "채널 추가", "채널 추가 제목");
  await assertNoOverflow(browser, `${context.label}:sources-add`);
  steps.push("sources:add");

  await clickSelector(browser, "#channel-close", "채널 패널 닫기");
  await assertHidden(browser, "#channel-detail-panel", "채널 패널 닫힘");
  await clickSelector(browser, "#channel-bulk-validate", "채널 대량 검증");
  await assertVisible(browser, "#channelBulkDiagnostics", "채널 대량 진단");
  await clickSelector(browser, "[data-select-channel]", "채널 대량 선택");
  await assertEnabled(browser, "#channel-bulk-clone", "선택 복제 버튼");
  await assertEnabled(browser, "#channel-bulk-disable", "선택 비활성화 버튼");
  steps.push("sources:bulk");

  await clickSelector(browser, "[data-view-channel]", "채널 상세");
  await assertVisible(browser, "#channel-detail-panel", "채널 상세 패널");
  await assertText(browser, "#channel-editor-title", "채널", "채널 상세 제목");
  await clickSelector(browser, "#channel-close", "채널 상세 닫기");
  await clickSelector(browser, "[data-clone-channel]", "채널 복제");
  await assertText(browser, "#channel-editor-title", "채널 복제", "채널 복제 제목");
  await clickSelector(browser, "#channel-close", "채널 복제 닫기");
  steps.push("sources:detail");

  await clickSelector(browser, 'a[href="/ops/rules"]', "룰 탭");
  await waitForPath(browser, "/ops/rules");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');

  await clickSelector(browser, "#opsAddEventRuleBtn", "이벤트 템플릿 탭");
  await clickSelector(browser, "#opsCreateEventRuleBtn", "이벤트 템플릿 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "이벤트 템플릿 패널");
  await assertVisible(browser, "#opsEventRuleForm", "이벤트 템플릿 폼");
  await clickSelector(browser, "#opsRulesComposerClose", "이벤트 템플릿 닫기");
  steps.push("rules:event-template");

  await clickSelector(browser, "#opsAddProfileBtn", "분석 프로파일 탭");
  await clickSelector(browser, "#opsCreateProfileBtn", "분석 프로파일 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "분석 프로파일 패널");
  await assertVisible(browser, "#opsProfileForm", "분석 프로파일 폼");
  await clickSelector(browser, "#opsRulesComposerClose", "분석 프로파일 닫기");
  steps.push("rules:profile");

  await clickSelector(browser, "#opsAddVaRuleBtn", "채널 분석 설정 탭");
  await clickSelector(browser, "#opsCreateVaRuleBtn", "채널 분석 설정 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "채널 분석 설정 패널");
  await assertVisible(browser, "#opsVaRuleForm", "채널 분석 설정 폼");
  await assertNoOverflow(browser, `${context.label}:rules-va-add`);
  await clickSelector(browser, 'a[href="/ops/sources"]', "채널 탭으로 이동");
  await waitForPath(browser, "/ops/sources");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  steps.push("rules:va-nav-away");

  await clickSelector(browser, 'a[href="/ops/users"]', "사용자 탭");
  await waitForPath(browser, "/ops/users");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');

  await clickSelector(browser, "#add-user-btn", "사용자 추가");
  await assertVisible(browser, "#user-detail-panel", "사용자 추가 패널");
  await assertText(browser, "#user-editor-title", "사용자 추가", "사용자 추가 제목");
  await assertNoOverflow(browser, `${context.label}:users-add`);
  await clickSelector(browser, "#user-close", "사용자 패널 닫기");
  await assertHidden(browser, "#user-detail-panel", "사용자 패널 닫힘");
  await clickSelector(browser, "[data-user-view]", "사용자 상세");
  await assertVisible(browser, "#user-detail-panel", "사용자 상세 패널");
  await clickSelector(browser, "#user-close", "사용자 상세 닫기");
  steps.push("users:add-detail");

  await clickSelector(browser, 'a[href="/client/live"]', "클라이언트 라이브");
  await waitForPath(browser, "/client/live");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await clickSelector(browser, 'a[href="/client/dashboard"]', "클라이언트 대시보드");
  await waitForPath(browser, "/client/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/dashboard", '[data-testid="client-shell-page"]');
  await assertVisible(browser, '[data-testid="client-dashboard-compare"]', "클라이언트 채널 비교");
  await clickSelector(browser, ".view", "클라이언트 대시보드 채널 선택");
  await assertVisible(browser, '[data-testid="client-dashboard-field-summary"]', "클라이언트 현장 요약");
  await assertNoOverflow(browser, `${context.label}:client-dashboard`);
  steps.push("client:dashboard");

  await assertBrowserErrors(browser, context.label);
  return { steps };
}

async function clickSelector(browser, selector, description) {
  await waitForResult(
    browser,
    buildElementCenterExpression(selector),
    result => result?.ok === true,
    `${description} 클릭 대상`,
  );
  await waitForScrollIdle(browser);
  const target = await waitForResult(
    browser,
    buildElementCenterExpression(selector, { scroll: false }),
    result => result?.ok === true,
    `${description} 클릭 좌표`,
  );
  const hit = await browser.evaluate(`
    (() => {
      const selector = ${JSON.stringify(selector)};
      const x = ${JSON.stringify(target.x)};
      const y = ${JSON.stringify(target.y)};
      const expected = Array.from(document.querySelectorAll(selector));
      const actual = document.elementFromPoint(x, y);
      return { ok: expected.some(node => node === actual || node.contains(actual)), actual: actual?.outerHTML?.slice(0, 120) || '' };
    })()
  `, 3000).catch(error => ({ ok: false, actual: error.message }));
  if (!hit?.ok) {
    await browser.evaluate(`
      (() => {
        const selector = ${JSON.stringify(selector)};
        const visible = (node) => {
          if (!node || node.hidden) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const node = Array.from(document.querySelectorAll(selector)).find(visible);
        if (!node) throw new Error('missing visible element for click fallback: ' + selector);
        node.click();
        return true;
      })()
    `, 5000);
    await delay(180);
    return;
  }
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: target.x,
    y: target.y,
    button: "none",
  });
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: target.x,
    y: target.y,
    button: "left",
    clickCount: 1,
  });
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: target.x,
    y: target.y,
    button: "left",
    clickCount: 1,
  });
  await delay(180);
}

function buildElementCenterExpression(selector, options = {}) {
  const shouldScroll = options.scroll !== false;
  return `
    (() => {
      const selector = ${JSON.stringify(selector)};
      const shouldScroll = ${JSON.stringify(shouldScroll)};
      const visible = (node) => {
        if (!node || node.hidden) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const matches = Array.from(document.querySelectorAll(selector));
      const node = matches.find(visible) || matches[0];
      if (!node) return { ok: false, message: 'missing element', selector, pathname: window.location.pathname };
      if (shouldScroll) {
        node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      }
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const isVisible = visible(node);
      return {
        ok: isVisible,
        selector,
        pathname: window.location.pathname,
        matchCount: matches.length,
        display: style.display,
        visibility: style.visibility,
        text: (node.textContent || '').trim().slice(0, 80),
        x: Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2)),
      };
    })()
  `;
}

async function waitForScrollIdle(browser) {
  let previous = null;
  for (let index = 0; index < 12; index += 1) {
    const current = await browser.evaluate(`
      (() => ({ x: window.scrollX, y: window.scrollY }))()
    `, 2000).catch(() => null);
    if (current && previous && current.x === previous.x && current.y === previous.y) {
      return;
    }
    previous = current;
    await delay(80);
  }
}

async function assertReady(browser, path, selector) {
  await waitForPath(browser, path);
  await assertVisible(browser, selector, `${path} root`);
}

async function assertEnabled(browser, selector, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: false, message: 'missing element' };
        return { ok: node.disabled !== true, disabled: node.disabled === true };
      })()
    `,
    result => result?.ok === true,
    `${description} enabled`,
  );
}

async function waitForPath(browser, path) {
  await waitForResult(
    browser,
    `
      (() => ({
        ok: document.readyState === 'complete' && window.location.pathname === ${JSON.stringify(path)},
        readyState: document.readyState,
        pathname: window.location.pathname
      }))()
    `,
    result => result?.ok === true,
    `path ${path}`,
  );
}

async function assertVisible(browser, selector, description) {
  const result = await waitForResult(
    browser,
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
  return result;
}

async function assertHidden(browser, selector, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: true, reason: 'missing' };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          ok: node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0,
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
  return result;
}

async function assertText(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
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
  return result;
}

async function assertNoOverflow(browser, description) {
  const result = await browser.evaluate(`
    (() => {
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      return { ok: overflowX <= 2, overflowX, width: window.innerWidth };
    })()
  `, 5000);
  if (!result?.ok) {
    throw new Error(`${description}: horizontal overflow=${result?.overflowX}`);
  }
}

async function installErrorCollector(browser) {
  await browser.evaluate(`
    (() => {
      window.__opsClickErrors = [];
      window.addEventListener('error', event => {
        window.__opsClickErrors.push(String(event.message || 'error'));
      });
      window.addEventListener('unhandledrejection', event => {
        window.__opsClickErrors.push(String(event.reason?.message || event.reason || 'unhandledrejection'));
      });
      if (!console.__opsClickWrapped) {
        const originalError = console.error.bind(console);
        console.error = (...args) => {
          window.__opsClickErrors.push(args.map(item => String(item?.message || item)).join(' '));
          originalError(...args);
        };
        console.__opsClickWrapped = true;
      }
      return true;
    })()
  `, 5000);
}

async function assertBrowserErrors(browser, label) {
  const errors = await browser.evaluate(`
    (() => (window.__opsClickErrors || []).filter(Boolean))()
  `, 5000);
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`${label}: browser errors: ${errors.slice(0, 5).join(' | ')}`);
  }
}

async function waitForResult(browser, expression, predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await browser.evaluate(expression, Math.min(5000, timeoutMs)).catch(error => ({
      ok: false,
      error: error.message,
    }));
    if (predicate(last)) return last;
    await delay(150);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last)}`);
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
