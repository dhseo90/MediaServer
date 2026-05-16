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
const createdPrereqs = await ensureOpsClickPrereqs();

try {
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
} finally {
  await cleanupOpsClickPrereqs(createdPrereqs);
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

async function ensureOpsClickPrereqs() {
  const created = { eventRuleId: "", profileId: "" };
  const catalog = await requestJson("/ops/api/rules/catalog");
  const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
  const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
  const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
  if (profiles.length === 0) {
    const profileId = nextNumericId([
      ...profiles.map(item => item?.id || item?.profileId),
      ...rules.map(item => item?.id),
      ...vaRules.map(item => item?.id),
    ], 9891);
    await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profileId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opsClickProfilePayload(profileId)),
    });
    created.profileId = profileId;
  }
  if (rules.length > 0) return created;
  const id = nextNumericId([
    ...rules.map(item => item?.id),
    ...profiles.map(item => item?.id || item?.profileId),
    ...vaRules.map(item => item?.id),
    created.profileId,
  ], 9901);
  await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opsClickEventTemplatePayload(id)),
  });
  created.eventRuleId = id;
  return created;
}

async function cleanupOpsClickPrereqs(created) {
  if (created?.eventRuleId) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(created.eventRuleId)}`, {
      method: "DELETE",
    }).catch(error => console.log(`[warn] ops-click event template cleanup failed: ${error.message}`));
  }
  if (created?.profileId) {
    await requestJson(`/lab/analysis/profiles/${encodeURIComponent(created.profileId)}`, {
      method: "DELETE",
    }).catch(error => console.log(`[warn] ops-click profile cleanup failed: ${error.message}`));
  }
}

function nextNumericId(values, startAt) {
  const used = new Set((values || []).map(item => String(item || "")).filter(Boolean));
  for (let candidate = Number(startAt || 9901); candidate < 10000; candidate += 1) {
    if (!used.has(String(candidate))) return String(candidate);
  }
  throw new Error("no free numeric id for ops click prereq");
}

function opsClickProfilePayload(id) {
  return {
    id,
    detector: "yolo",
    fps: 6,
    maxQueue: 1,
    confidence: 0.25,
    nms: 0.45,
    inputWidth: 640,
    inputHeight: 640,
    adaptive: true,
  };
}

function opsClickEventTemplatePayload(id) {
  return {
    id,
    enabled: true,
    analysis: { classes: ["person", "vehicle"] },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.22 }, { x: 0.8, y: 0.22 }, { x: 0.8, y: 0.78 }, { x: 0.2, y: 0.78 }],
      },
      minConfidence: 0.25,
      minDurationMs: 0,
    },
    ruleKind: "scenario",
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 2000,
      dwellTimeMs: 10000,
      cooldownMs: 5000,
      targetClasses: ["person", "vehicle"],
    },
  };
}

async function requestJson(pathValue, options = {}) {
  const response = await fetch(`${httpBase}${pathValue}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${pathValue} returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) {
    throw new Error(`${pathValue} failed HTTP ${response.status}: ${payload?.error || text}`);
  }
  return payload;
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
  await assertVisible(browser, "#dashIncidentTimelineSearch", "인시던트 검색 입력");
  await assertVisible(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "__no_match__", "인시던트 검색 no-match");
  await assertHashParam(browser, "incidentQ", "__no_match__", "인시던트 검색 hash 저장");
  await assertText(browser, "#dashIncidentTimelineText", "필터에 맞는", "인시던트 필터 no-match 문구");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "", "인시던트 검색 초기화");
  await assertHashParamAbsent(browser, "incidentQ", "인시던트 검색 hash 초기화");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "event-record", "인시던트 출처 필터");
  await assertHashParam(browser, "incidentSource", "event-record", "인시던트 출처 hash 저장");
  await assertText(browser, "#dashIncidentTimelineBadges", "필터 결과", "인시던트 출처 필터 badge");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "event", "인시던트 공유 검색");
  await assertHashParam(browser, "incidentQ", "event", "인시던트 공유 검색 hash 저장");
  await clickSelector(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사");
  const shareUrl = await incidentShareUrl(browser, "인시던트 필터 링크 data");
  assertUrlContains(shareUrl, "/ops/dashboard", "인시던트 공유 링크 path");
  assertUrlContains(shareUrl, "incidentQ=event", "인시던트 공유 링크 검색");
  assertUrlContains(shareUrl, "incidentSource=event-record", "인시던트 공유 링크 출처");
  await installClipboardFailureStub(browser);
  await clickSelector(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사 fallback");
  await assertToastContains(browser, "주소창의 필터 링크", "인시던트 필터 링크 clipboard fallback");
  await restoreClipboardFailureStub(browser);
  await navigatePath(browser, "/ops/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await navigatePath(browser, shareUrl);
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await assertFormValue(browser, "#dashIncidentTimelineSearch", "event", "인시던트 검색 deeplink");
  await assertFormValue(browser, "#dashIncidentTimelineSource", "event-record", "인시던트 출처 deeplink");
  await assertText(browser, "#dashIncidentTimelineBadges", "필터 결과", "인시던트 deeplink 필터 badge");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "", "인시던트 deeplink 검색 초기화");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "", "인시던트 출처 필터 초기화");
  await assertHashParamAbsent(browser, "incidentQ", "인시던트 deeplink 검색 hash 초기화");
  await assertHashParamAbsent(browser, "incidentSource", "인시던트 deeplink 출처 hash 초기화");
  await assertNoOverflow(browser, `${context.label}:dashboard-incident-filter`);
  await clickSelector(browser, "[data-root-cause-kind]", "문제 원인 다음 조치");
  await assertVisible(browser, "#dashRootCauseActionOutput", "문제 원인 조치 결과");
  await assertNoOverflow(browser, `${context.label}:dashboard-root-cause-action`);
  await clickSelector(browser, 'a[href="/ops/sources"]', "채널 탭");
  await waitForPath(browser, "/ops/sources");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  steps.push("dashboard:incident-filter", "dashboard:root-cause-action");

  await clickSelector(browser, "#add-channel", "채널 추가");
  await assertVisible(browser, "#channel-detail-panel", "채널 추가 패널");
  await assertText(browser, "#channel-editor-title", "채널 추가", "채널 추가 제목");
  await setSelectValue(browser, '[name="kind"]', "onvif", "ONVIF 채널 타입");
  await assertFormValue(browser, '[name="kind"]', "onvif", "ONVIF kind");
  await assertVisible(browser, '[data-source-kind="onvif"]', "ONVIF Stream URI 입력");
  await assertNoOverflow(browser, `${context.label}:sources-add`);
  steps.push("sources:add-onvif-kind");

  await clickSelector(browser, "#channel-close", "채널 패널 닫기");
  await assertHidden(browser, "#channel-detail-panel", "채널 패널 닫힘");

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
  if (await isElementVisible(browser, "[data-user-view]")) {
    await clickSelector(browser, "[data-user-view]", "사용자 상세");
    await assertVisible(browser, "#user-detail-panel", "사용자 상세 패널");
    await clickSelector(browser, "#user-close", "사용자 상세 닫기");
    steps.push("users:add-detail");
  } else {
    steps.push("users:add-empty");
  }

  await clickSelector(browser, 'a[href="/client/live"]', "클라이언트 라이브");
  await waitForPath(browser, "/client/live");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-live-preview`);
  await clickSelector(browser, '.account-shortcut[href="/ops/home"]', "클라이언트 미리보기 Ops 복귀");
  await waitForPath(browser, "/ops/home");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/home", '[data-testid="ops-home-page"]');
  await clickSelector(browser, 'a[href="/client/live"]', "클라이언트 미리보기 재진입");
  await waitForPath(browser, "/client/live");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-live-return`);
  steps.push("client:preview-admin");
  await clickSelector(browser, 'a[href="/client/dashboard"]', "클라이언트 대시보드");
  await waitForPath(browser, "/client/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/dashboard", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-dashboard-preview`);
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

async function assertClientPreviewAdminAffordance(browser, label) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const body = document.body;
        const shortcut = document.querySelector('.account-shortcut[href="/ops/home"]');
        const accountName = document.querySelector('.account-menu .account-name');
        const accountMeta = document.querySelector('.account-menu .account-meta');
        const navLinks = Array.from(document.querySelectorAll('.client-image-nav-tabs a'))
          .map(link => ({
            href: link.getAttribute('href') || '',
            text: (link.textContent || '').trim(),
          }));
        const issues = [];
        if (body?.dataset?.clientPreview !== 'true') issues.push('missing client preview flag');
        if (!shortcut || !(shortcut.textContent || '').includes('Ops')) issues.push('missing Ops shortcut');
        if (!accountName || !(accountName.textContent || '').trim()) issues.push('missing account name');
        if (!accountMeta || !(accountMeta.textContent || '').includes('admin')) issues.push('missing admin role');
        if (!navLinks.some(link => link.href === '/client/live')) issues.push('missing client live nav');
        if (!navLinks.some(link => link.href === '/client/dashboard')) issues.push('missing client dashboard nav');
        if (navLinks.some(link => link.href.startsWith('/ops/'))) issues.push('ops nav leaked into client primary nav');
        return {
          ok: issues.length === 0,
          issues,
          shortcutText: (shortcut?.textContent || '').trim(),
          accountName: (accountName?.textContent || '').trim(),
          accountMeta: (accountMeta?.textContent || '').trim(),
          navLinks,
        };
      })()
    `,
    item => item?.ok === true,
    label,
  );
  return result;
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

async function navigatePath(browser, pathValue) {
  const url = new URL(pathValue, `${httpBase}/`).toString();
  await browser.cdp("Page.navigate", { url });
  await waitForPath(browser, new URL(url).pathname);
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

async function isElementVisible(browser, selector) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    })()
  `, 3000).catch(() => false);
  return Boolean(result);
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

async function assertFormValue(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.value || '');
        return { ok: value === ${JSON.stringify(expected)}, value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertFormValueContains(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.value || '');
        return { ok: value.includes(${JSON.stringify(expected)}), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertAttributeContains(browser, selector, attribute, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.getAttribute(${JSON.stringify(attribute)}) || '');
        return { ok: value.includes(${JSON.stringify(expected)}), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function incidentShareUrl(browser, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector('#dashIncidentTimelineShare');
        const value = String(node?.getAttribute('data-incident-share-url') || '');
        return { ok: value.includes('/ops/dashboard#') && value.includes('incidentSource=event-record'), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result.value;
}

function assertUrlContains(value, expected, description) {
  if (!String(value || "").includes(expected)) {
    throw new Error(`${description}: ${JSON.stringify(value)} does not include ${JSON.stringify(expected)}`);
  }
}

async function installClipboardFailureStub(browser) {
  await browser.evaluate(`
    (() => {
      window.__opsClickClipboardOriginalExecCommand = document.execCommand;
      document.execCommand = () => false;
      try {
        window.__opsClickClipboardOriginal = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('forced clipboard failure')) },
        });
      } catch (_) {}
      return true;
    })()
  `, 3000);
}

async function restoreClipboardFailureStub(browser) {
  await browser.evaluate(`
    (() => {
      if (window.__opsClickClipboardOriginalExecCommand) {
        document.execCommand = window.__opsClickClipboardOriginalExecCommand;
      }
      try {
        if (window.__opsClickClipboardOriginal !== undefined) {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: window.__opsClickClipboardOriginal,
          });
        }
      } catch (_) {}
      return true;
    })()
  `, 3000).catch(() => null);
}

async function assertToastContains(browser, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const toasts = Array.from(document.querySelectorAll('.toast.error, .toast'));
        const text = toasts.map(node => String(node.textContent || '')).join('\\n');
        return { ok: text.includes(${JSON.stringify(expected)}), text };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertHashParam(browser, key, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
        const value = String(params.get(${JSON.stringify(key)}) || '');
        return { ok: value === ${JSON.stringify(expected)}, value, hash: window.location.hash };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertHashParamAbsent(browser, key, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
        return { ok: !params.has(${JSON.stringify(key)}), hash: window.location.hash };
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
