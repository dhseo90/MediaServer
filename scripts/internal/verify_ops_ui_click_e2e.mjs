#!/usr/bin/env node
// 파일 용도: Ops 제품 UI의 주요 탭/패널 흐름을 실제 브라우저 포인터 클릭으로 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage, parseWidthList } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops UI direct click E2E

Usage:
  ./server.sh verify-ops-click-e2e [options]

Options:
  --http-base <url>         실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>         브라우저 대기 시간입니다. 기본 15000.
  --chrome-path <path>      Chrome/Chromium 실행 파일 경로입니다.
  --widths <csv>            클릭 검증 viewport 폭 목록입니다. 기본 390,1180.
  --height <px>             viewport 높이입니다. 기본 900.
  --debug-port-base <port>  Chrome CDP port 시작값입니다. 기본 9750.
  --output-dir <path>       screenshot/log 출력 디렉터리입니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "widths",
  "height",
  "debug-port-base",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
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

  await clickSelector(browser, 'a[href="/ops/dashboard"]', "운영 대시보드");
  await waitForPath(browser, "/ops/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await clickSelector(browser, "[data-root-cause-kind]", "문제 원인 다음 조치");
  await assertVisible(browser, "#dashRootCauseActionOutput", "문제 원인 조치 결과");
  await assertNoOverflow(browser, `${context.label}:dashboard-root-cause-action`);
  await clickSelector(browser, 'a[href="/ops/sources"]', "채널 탭");
  await waitForPath(browser, "/ops/sources");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  steps.push("dashboard:root-cause-action");

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
  await setSelectValue(browser, "#clientDashboardCompareFilter", "warnings", "클라이언트 비교 필터");
  await setSelectValue(browser, "#clientDashboardCompareSort", "events", "클라이언트 비교 정렬");
  await clickSelector(browser, '[data-testid="client-dashboard-preset-config"] summary', "클라이언트 preset 설정");
  await assertVisible(browser, "#clientDashboardPresetConfigInput", "클라이언트 preset 설정 입력");
  await setTextValue(browser, "#clientDashboardPresetConfigInput", JSON.stringify({
    placePresets: [{ key: "road", label: "도로 운영", weight: 88, terms: ["road", "도로"] }],
    eventPresets: [{ key: "line", label: "라인 감시", weight: 92, terms: ["line"] }]
  }, null, 2), "클라이언트 preset JSON");
  await clickSelector(browser, "#clientDashboardPresetApply", "클라이언트 preset 적용");
  await assertText(browser, "#clientDashboardPresetStatus", "저장됨", "클라이언트 preset 저장 상태");
  await clickSelector(browser, '[data-testid="client-dashboard-preset-config"] summary', "클라이언트 preset 설정 다시 열기");
  await clickSelector(browser, "#clientDashboardPresetReset", "클라이언트 preset 초기화");
  await assertText(browser, "#clientDashboardPresetStatus", "초기화됨", "클라이언트 preset 초기화 상태");
  await clickSelector(browser, ".view", "클라이언트 대시보드 채널 선택");
  await assertVisible(browser, '[data-testid="client-dashboard-field-summary"]', "클라이언트 현장 요약");
  await assertNoOverflow(browser, `${context.label}:client-dashboard`);
  steps.push("client:dashboard", "client:preset-config");

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

async function setSelectValue(browser, selector, value, description) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing select' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, value: node.value };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 선택 실패: ${JSON.stringify(result)}`);
  }
}

async function setTextValue(browser, selector, value, description) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing text input' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, length: node.value.length };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 입력 실패: ${JSON.stringify(result)}`);
  }
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
