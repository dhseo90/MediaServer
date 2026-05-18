#!/usr/bin/env node
// 파일 용도: 운영자 룰 화면을 실제 브라우저로 열어 embed script와 탭 이동 안정성을 smoke 검증한다.

import path from "node:path";
import process from "node:process";

import {
  cleanupRulePreviewPrerequisites,
  ensureRulePreviewPrerequisites,
} from "./rule_preview_fixture_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops rules native UI smoke

Usage:
  ./server.sh verify-rule-ui [options]

Options:
  --http-base <url>     실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>     브라우저 대기 시간입니다. 기본 12000.
  --chrome-path <path>  Chrome/Chromium 실행 파일 경로입니다.
  --debug-port <port>   Chrome CDP port입니다. 기본 9899.
  --output-dir <path>   screenshot/log 출력 디렉터리입니다.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "debug-port",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 12000);
const chromePath = args.chromePath || findChrome();
const debugPort = Number(args.debugPort || 9899);
const outputDir = args.outputDir || path.join("/tmp", `media_server_ops_rules_native_${Date.now()}_${process.pid}`);

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

const seededPrereqs = await ensureRulePreviewPrerequisites({ httpBase });
const browser = await openBrowserPage({
  httpBase,
  pagePath: "/ops/rules",
  timeoutMs,
  chromePath,
  debugPort,
  width: 1280,
  height: 900,
  outputDir,
});

try {
  const result = await browser.evaluate(buildRulesOpenExpression(), timeoutMs);
  if (!result?.ok) {
    throw new Error(JSON.stringify(result));
  }
  const mobileGeometry = await assertMobileGeometryPreview(browser, timeoutMs);
  const usersNav = await clickNavAndWait(browser, "/ops/users");
  if (!usersNav?.ok) {
    throw new Error(JSON.stringify(usersNav));
  }
  const rulesNav = await clickNavAndWait(browser, "/ops/rules");
  if (!rulesNav?.ok) {
    throw new Error(JSON.stringify(rulesNav));
  }
  const returned = await browser.evaluate(buildReturnedRulesExpression(), timeoutMs);
  if (!returned?.ok) {
    throw new Error(JSON.stringify(returned));
  }
  const sourcesNav = await clickNavAndWait(browser, "/ops/sources");
  if (!sourcesNav?.ok) {
    throw new Error(JSON.stringify(sourcesNav));
  }
  console.log("[pass] ops-rules-native-smoke");
  console.log(JSON.stringify({ ...result, mobileGeometry, returned, usersNav, rulesNav, sourcesNav }, null, 2));
} finally {
  await browser.close();
  await cleanupRulePreviewPrerequisites({ httpBase, created: seededPrereqs });
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

async function clickNavAndWait(browser, path) {
  const clicked = await browser.evaluate(`
    (() => {
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const link = Array.from(document.querySelectorAll('a[href="${path}"]')).find(node => visible(node));
      if (!link) return { ok: false, message: 'missing visible nav link', path: ${JSON.stringify(path)} };
      setTimeout(() => link.click(), 0);
      return { ok: true, href: link.getAttribute('href') || '' };
    })()
  `, timeoutMs);
  if (!clicked?.ok) return clicked;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await browser.evaluate(`
      (() => ({
        readyState: document.readyState,
        pathname: window.location.pathname,
        title: document.title
      }))()
    `, 3000).catch((error) => ({ error: error.message }));
    if (state.readyState === "complete" && String(state.pathname || "").endsWith(path)) {
      return { ok: true, path, title: state.title || "" };
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { ok: false, message: "navigation timeout", path };
}

async function assertMobileGeometryPreview(browser, timeoutMs) {
  await browser.cdp("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await browser.evaluate(
    "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    3000,
  );
  const result = await browser.evaluate(buildMobileGeometryExpression(), timeoutMs);
  if (!result?.ok) {
    throw new Error(JSON.stringify(result));
  }
  return result;
}

function buildRulesOpenExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const fail = (message, extra = {}) => ({ ok: false, message, ...extra });
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const click = (id) => {
        const button = document.getElementById(id);
        if (!button) throw new Error('missing button ' + id);
        button.click();
        return button;
      };
      const status = document.getElementById('opsRulesStatus');
      const detailPanel = document.getElementById('opsRulesDetailPanel');
      const vaSection = document.getElementById('opsVaRulesSection');
      const eventSection = document.getElementById('opsEventRulesSection');
      const profileSection = document.getElementById('opsProfileRulesSection');

      if (!visible(vaSection) || visible(eventSection) || visible(profileSection)) {
        return fail('rules page did not start in va section only', {
          vaVisible: visible(vaSection),
          eventVisible: visible(eventSection),
          profileVisible: visible(profileSection)
        });
      }

      click('opsCreateVaRuleBtn');
      await wait(400);
      const vaForm = document.getElementById('opsVaRuleForm');
      const vaChannelSelect = document.getElementById('opsVaRuleChannelSelect');
      if (!visible(detailPanel) || !visible(vaForm)) {
        return fail('detail panel did not open after create va rule', {
          detailHidden: detailPanel?.hidden ?? null,
          vaFormHidden: vaForm?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const optionTexts = Array.from(vaChannelSelect?.options || []).map(option => option.textContent || '');
      if (!optionTexts.some(text => text.includes('Sample H264'))) {
        return fail('channel options missing expected source', { optionTexts });
      }
      const trackerSelect = document.getElementById('opsVaRuleTrackerSelect');
      const reidSelect = document.getElementById('opsVaRuleReidSelect');
      const trackingSummary = document.getElementById('opsVaRuleTrackingSummary');
      if (!trackerSelect || !reidSelect || !trackingSummary) {
        return fail('tracking policy controls missing', {
          hasTracker: Boolean(trackerSelect),
          hasReid: Boolean(reidSelect),
          hasSummary: Boolean(trackingSummary)
        });
      }
      trackerSelect.value = 'none';
      trackerSelect.dispatchEvent(new Event('change', { bubbles: true }));
      if (reidSelect.value !== 'off' || reidSelect.disabled !== true) {
        return fail('tracker none did not force Re-ID off', {
          tracker: trackerSelect.value,
          reid: reidSelect.value,
          reidDisabled: reidSelect.disabled,
          summaryText: trackingSummary.textContent || ''
        });
      }
      trackerSelect.value = 'bytetrack';
      trackerSelect.dispatchEvent(new Event('change', { bubbles: true }));
      reidSelect.value = 'assist';
      reidSelect.dispatchEvent(new Event('change', { bubbles: true }));
      if (reidSelect.disabled || !trackingSummary.textContent.includes('ByteTrack') || !trackingSummary.textContent.includes('Re-ID assist')) {
        return fail('tracker/Re-ID assist selection did not update summary', {
          tracker: trackerSelect.value,
          reid: reidSelect.value,
          reidDisabled: reidSelect.disabled,
          summaryText: trackingSummary.textContent || ''
        });
      }

      const preSaveValidation = await (async () => {
        const profileSelect = document.getElementById('opsVaRuleProfileSelect');
        const saveButton = document.getElementById('opsRulesComposerSave');
        if (!profileSelect || !saveButton) {
          return { ok: false, message: 'missing profile select or save button' };
        }
        const invalidProfileId = '__missing_profile_e2e__';
        const option = document.createElement('option');
        option.value = invalidProfileId;
        option.textContent = 'Missing profile E2E';
        profileSelect.appendChild(option);
        profileSelect.value = invalidProfileId;
        profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        const attemptedWrites = [];
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init = {}) => {
          const url = String(typeof input === 'string' ? input : (input?.url || ''));
          const method = String(init?.method || input?.method || 'GET').toUpperCase();
          if (method !== 'GET' && url.includes('/lab/analysis/va-rules/')) {
            attemptedWrites.push(method + ' ' + url);
            return Promise.reject(new Error('blocked test va-rule write'));
          }
          return originalFetch(input, init);
        };
        try {
          saveButton.click();
          await wait(700);
        } finally {
          window.fetch = originalFetch;
          option.remove();
        }
        const statusText = status?.textContent || '';
        const ok = attemptedWrites.length === 0 &&
          statusText.includes('저장 전 검증 실패') &&
          statusText.includes('분석 프로파일') &&
          statusText.includes('찾을 수 없습니다');
        return { ok, attemptedWrites, statusText };
      })();
      if (!preSaveValidation.ok) {
        return fail('pre-save validation did not block invalid profile', preSaveValidation);
      }

      click('opsAddEventRuleBtn');
      await wait(400);
      if (!visible(eventSection) || visible(vaSection) || visible(detailPanel)) {
        return fail('switching to event tab should close detail and show only event section', {
          vaVisible: visible(vaSection),
          eventVisible: visible(eventSection),
          detailVisible: visible(detailPanel)
        });
      }

      click('opsCreateEventRuleBtn');
      await wait(400);
      const eventForm = document.getElementById('opsEventRuleForm');
      if (!eventForm || !visible(detailPanel)) {
        return fail('detail panel did not open after create event template', {
          detailHidden: detailPanel?.hidden ?? null,
          statusText: status?.textContent || ''
        });
      }
      const eventChannelSelect = document.getElementById('opsVaRuleChannelSelect');
      if (visible(eventChannelSelect) && !document.getElementById('opsVaRuleForm')?.hidden) {
        return fail('va rule form should stay hidden in event template mode');
      }
      const presetQuality = await (async () => {
        const setSelect = (id, value) => {
          const select = document.getElementById(id);
          if (!select) return null;
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return select;
        };
        const valueOf = (id) => String(document.getElementById(id)?.value || '');
        const textOf = (id) => String(document.getElementById(id)?.textContent || '');
        setSelect('opsEventRuleModeSelect', 'event');
        await wait(80);
        setSelect('opsEventRuleTypeSelect', 'line-crossing');
        await wait(80);
        setSelect('opsEventRulePresetSelect', 'road');
        await wait(80);
        const lineSummary = textOf('opsEventRulePresetSummary');
        const lineOk = visible(document.getElementById('opsEventRulePresetField')) &&
          !visible(document.getElementById('opsEventRuleMinDurationField')) &&
          !visible(document.getElementById('opsEventRuleCooldownField')) &&
          valueOf('opsEventRuleConfidenceInput') === '0.35' &&
          valueOf('opsEventRuleMinDurationInput') === '0' &&
          lineSummary.includes('라인 통과 preset') &&
          lineSummary.includes('방향과 2점 line geometry');
        if (!lineOk) {
          return {
            ok: false,
            message: 'line-crossing preset quality copy or values mismatch',
            lineSummary,
            confidence: valueOf('opsEventRuleConfidenceInput'),
            minDuration: valueOf('opsEventRuleMinDurationInput'),
            presetVisible: visible(document.getElementById('opsEventRulePresetField')),
            minDurationVisible: visible(document.getElementById('opsEventRuleMinDurationField')),
            cooldownVisible: visible(document.getElementById('opsEventRuleCooldownField'))
          };
        }
        setSelect('opsEventRuleModeSelect', 'scenario');
        await wait(80);
        setSelect('opsEventRuleTypeSelect', 'loitering');
        await wait(80);
        setSelect('opsEventRulePresetSelect', 'doorway');
        await wait(80);
        const loiteringSummary = textOf('opsEventRulePresetSummary');
        const loiteringOk = valueOf('opsEventRuleDwellInput') === '15000' &&
          valueOf('opsEventRuleLoiteringRadiusInput') === '0.05' &&
          valueOf('opsEventRuleLoiteringPointsInput') === '3' &&
          valueOf('opsEventRuleCooldownInput') === '8000' &&
          loiteringSummary.includes('배회 preset');
        if (!loiteringOk) {
          return {
            ok: false,
            message: 'loitering preset quality copy or values mismatch',
            loiteringSummary,
            dwell: valueOf('opsEventRuleDwellInput'),
            radius: valueOf('opsEventRuleLoiteringRadiusInput'),
            points: valueOf('opsEventRuleLoiteringPointsInput'),
            cooldown: valueOf('opsEventRuleCooldownInput')
          };
        }
        setSelect('opsEventRuleTypeSelect', 'zone-occupancy');
        await wait(80);
        setSelect('opsEventRulePresetSelect', 'elevator');
        await wait(80);
        const occupancySummary = textOf('opsEventRulePresetSummary');
        const occupancyOk = !visible(document.getElementById('opsEventRuleDwellField')) &&
          valueOf('opsEventRuleZoneThresholdInput') === '5' &&
          valueOf('opsEventRuleZoneDwellInput') === '8000' &&
          valueOf('opsEventRuleCooldownInput') === '12000' &&
          occupancySummary.includes('점유 preset');
        if (!occupancyOk) {
          return {
            ok: false,
            message: 'zone occupancy preset quality copy or values mismatch',
            occupancySummary,
            dwellVisible: visible(document.getElementById('opsEventRuleDwellField')),
            threshold: valueOf('opsEventRuleZoneThresholdInput'),
            zoneDwell: valueOf('opsEventRuleZoneDwellInput'),
            cooldown: valueOf('opsEventRuleCooldownInput')
          };
        }
        return { ok: true, lineSummary, loiteringSummary, occupancySummary };
      })();
      if (!presetQuality.ok) {
        return fail('scenario preset quality smoke failed', presetQuality);
      }

      return {
        ok: true,
        optionTexts,
        preSaveValidation,
        presetQuality,
        navHref: Array.from(document.querySelectorAll('a[href="/ops/users"]')).find(node => visible(node))?.getAttribute('href') || '',
        statusText: status?.textContent || ''
      };
    })()
  `;
}

function buildMobileGeometryExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = (message) => { if (issues.length < 16) issues.push(message); };
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0;
      const overflowFor = (node) => node ? Math.max(0, node.scrollWidth - Math.ceil(node.clientWidth)) : 0;
      document.getElementById('opsAddVaRuleBtn')?.click();
      await wait(250);
      if (!visible(document.getElementById('opsVaRuleForm'))) {
        document.getElementById('opsCreateVaRuleBtn')?.click();
        await wait(450);
      }
      const stage = document.querySelector('.ops-rule-preview-stage');
      const overlay = document.getElementById('opsVaRuleGeometryPreview');
      const toolbar = document.querySelector('.ops-geometry-toolbar');
      const statusGrid = document.querySelector('.ops-geometry-status-grid');
      const defaultBtn = document.getElementById('opsVaRuleGeometryDefaultBtn');
      if (!visible(stage)) issue('geometry preview stage is not visible');
      if (!visible(overlay)) issue('geometry overlay is not visible');
      defaultBtn?.click();
      await wait(250);
      const docOverflow = Math.max(0, Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
      if (docOverflow > 2) issue('document overflow ' + docOverflow + 'px');
      const stageRect = stage?.getBoundingClientRect();
      if (stageRect) {
        if (stageRect.left < -1 || stageRect.right > window.innerWidth + 1) issue('stage outside viewport: ' + Math.round(stageRect.left) + '..' + Math.round(stageRect.right));
        if (stageRect.height < 170) issue('stage too short for touch editing: ' + Math.round(stageRect.height));
        if (stageRect.height > 260) issue('stage too tall on mobile: ' + Math.round(stageRect.height));
      }
      if (toolbar && overflowFor(toolbar) > 2) issue('geometry toolbar overflow ' + overflowFor(toolbar) + 'px');
      const controls = Array.from(toolbar?.querySelectorAll('button') || []);
      if (controls.length < 4) issue('geometry controls missing: ' + controls.length);
      const toolbarRect = toolbar?.getBoundingClientRect();
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (toolbarRect && (rect.left < toolbarRect.left - 2 || rect.right > toolbarRect.right + 2)) {
          issue('geometry control outside toolbar: ' + (control.id || control.textContent || 'button'));
        }
        if (rect.width < 120) issue('geometry control too narrow: ' + (control.id || control.textContent || 'button') + ' ' + Math.round(rect.width));
      }
      const cards = Array.from(statusGrid?.querySelectorAll('.ops-geometry-status-card') || []);
      if (cards.length !== 4) issue('geometry status cards mismatch: ' + cards.length);
      if (statusGrid && overflowFor(statusGrid) > 2) issue('status grid overflow ' + overflowFor(statusGrid) + 'px');
      const touchTargets = overlay ? overlay.querySelectorAll('.ops-geometry-touch-target').length : 0;
      if (touchTargets < 3) issue('geometry touch targets missing after default points: ' + touchTargets);
      return {
        ok: issues.length === 0,
        issues,
        stage: stageRect ? { width: Math.round(stageRect.width), height: Math.round(stageRect.height) } : null,
        controls: controls.length,
        touchTargets,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      };
    })()
  `;
}

function buildReturnedRulesExpression() {
  return `
    (() => {
      const visible = (node) => Boolean(node) && !node.hidden && getComputedStyle(node).display !== 'none';
      const detailPanel = document.getElementById('opsRulesDetailPanel');
      const eventSection = document.getElementById('opsEventRulesSection');
      const channelLink = Array.from(document.querySelectorAll('a[href="/ops/sources"]')).find(node => visible(node));
      if (!channelLink) return { ok: false, message: 'missing visible sources nav link after returning to rules' };
      if (visible(detailPanel)) return { ok: false, message: 'rules detail panel remained open after returning from users tab' };
      return {
        ok: true,
        eventVisible: visible(eventSection),
        detailVisible: visible(detailPanel)
      };
    })()
  `;
}
