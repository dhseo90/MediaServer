#!/usr/bin/env node
// 파일 용도: 운영자 룰 화면을 실제 브라우저로 열어 embed script와 탭 이동 안정성을 smoke 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  cleanupRulePreviewPrerequisites,
  ensureRulePreviewPrerequisites,
} from "./rule_preview_fixture_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  browserFallbackUnavailableMessage,
  chromeFallbackAvailableForThisEnvironment,
  findChrome,
  openBrowserPage,
} from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops rules native UI smoke

Usage:
  ./server.sh verify-rule-ui [options]

Options:
  --http-base <url>     실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>     브라우저 대기 시간입니다. 기본 12000.
  --chrome-path <path>  Chrome/Chromium 실행 파일 경로입니다.
                        Codex 세션에서는 기본적으로 인앱 브라우저 evidence를 사용해야 하며,
                        Chrome fallback은 명시 예외 환경변수 지정 시에만 허용합니다.
  --in-app-evidence <path>
                        Codex 인앱 브라우저 직접 확인 evidence JSON입니다.
  --debug-port <port>   Chrome CDP port입니다. 기본 9899.
  --output-dir <path>   screenshot/log 출력 디렉터리입니다.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "in-app-evidence",
  "debug-port",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 12000);
const chromePath = args.chromePath || findChrome();
const inAppEvidencePath = args.inAppEvidence || process.env.MEDIA_SERVER_IN_APP_BROWSER_EVIDENCE || "";
const debugPort = Number(args.debugPort || 9899);
const outputDir = args.outputDir || path.join("/tmp", `media_server_ops_rules_native_${Date.now()}_${process.pid}`);

if (inAppEvidencePath) {
  assertInAppRuleEvidence(inAppEvidencePath);
  process.exit(0);
}

if (!chromeFallbackAvailableForThisEnvironment() || !chromePath) {
  console.error(`[fail] ${browserFallbackUnavailableMessage()}`);
  process.exit(1);
}

const seededPrereqs = await ensureRulePreviewPrerequisites({
  httpBase,
  includeInactiveReferences: true,
  includeClassMismatch: true,
});
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
  const result = await browser.evaluate(buildRulesOpenExpression(seededPrereqs), timeoutMs);
  if (!result?.ok || !result?.reviewLoop?.eventType?.includes("EventRecord eventType")) { // RULE-102 /ops/rules opsRulesUpdateReviewLoop eventType browser readback
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
  console.log("[summary] ops-rules-native-smoke complete");
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

function assertInAppRuleEvidence(evidencePath) {
  const resolved = path.resolve(evidencePath);
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    console.error(`[fail] invalid in-app browser evidence ${resolved}: ${error.message}`);
    process.exit(1);
  }
  const failures = [];
  const fail = (message) => failures.push(message);
  if (evidence?.schema !== "media-server.in-app-browser-ui-evidence.v1") {
    fail(`invalid evidence schema: ${evidence?.schema || "(missing)"}`);
  }
  const browserName = String(evidence?.browser || evidence?.browserId || evidence?.source || "");
  if (!/in-app|iab|codex/i.test(browserName)) {
    fail("evidence must identify Codex in-app browser/iab");
  }
  const routes = Array.isArray(evidence?.routes) ? evidence.routes : [];
  const interactions = Array.isArray(evidence?.interactions) ? evidence.interactions : [];
  const routeByPath = new Map(routes.map((route) => [route?.path, route]));
  const rulesRoute = routeByPath.get("/ops/rules");
  if (!rulesRoute) {
    fail("missing /ops/rules route evidence");
  } else {
    if (rulesRoute?.checks?.visualLayoutPass !== true) fail("/ops/rules visualLayoutPass is not true");
    if (!Array.isArray(rulesRoute?.screenshots) || rulesRoute.screenshots.length === 0) {
      fail("/ops/rules screenshot evidence missing");
    }
  }
  for (const pathName of ["/ops/users", "/ops/sources"]) {
    const route = routeByPath.get(pathName);
    if (!route?.checks?.visualLayoutPass) {
      fail(`${pathName} route evidence missing or visualLayoutPass is not true`);
    }
  }
  const generatedIdEvidence = interactions.find((entry) => entry?.id === "ops-rules-generated-id-displays");
  if (generatedIdEvidence?.pass !== true) {
    fail("ops-rules-generated-id-displays interaction evidence missing or failing");
  }
  const reviewLoopEvidence = interactions.find((entry) => entry?.id === "v240-s05-rule-scenario-review-loop");
  if (reviewLoopEvidence?.pass !== true) {
    fail("v240-s05-rule-scenario-review-loop interaction evidence missing or failing");
  }
  if (failures.length > 0) {
    console.error("[fail] in-app rule UI evidence invalid");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("[pass] in-app /ops/rules route evidence");
  console.log("[pass] in-app /ops/rules generated ID interaction evidence");
  console.log("[pass] in-app /ops/rules S05 review loop evidence");
  console.log("[pass] in-app /ops/users and /ops/sources nav return evidence");
  console.log("[summary] ops-rules-native-smoke complete");
  console.log(JSON.stringify({
    mode: "in-app-evidence",
    evidence: resolved,
    route: "/ops/rules",
    screenshots: rulesRoute.screenshots.length,
  }, null, 2));
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

function buildRulesOpenExpression(seededPrereqs = {}) {
  const inactiveProfileId = JSON.stringify(seededPrereqs?.inactiveProfileId || "");
  const inactiveRuleId = JSON.stringify(seededPrereqs?.inactiveRuleId || "");
  const classMismatchProfileId = JSON.stringify(seededPrereqs?.classMismatchProfileId || "");
  const classMismatchRuleId = JSON.stringify(seededPrereqs?.classMismatchRuleId || "");
  return `
    (async () => {
      const inactiveProfileId = ${inactiveProfileId};
      const inactiveRuleId = ${inactiveRuleId};
      const classMismatchProfileId = ${classMismatchProfileId};
      const classMismatchRuleId = ${classMismatchRuleId};
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
      const reviewLoop = (() => {
        const panel = document.querySelector('[data-testid="ops-rule-scenario-review-loop"]');
        const link = document.getElementById('opsRulesReviewEventRecordLink');
        const summary = document.getElementById('opsRulesReviewSummary')?.textContent || '';
        const eventType = document.getElementById('opsRulesReviewEventTypeDetail')?.textContent || '';
        const conflict = document.getElementById('opsRulesReviewConflictDetail')?.textContent || '';
        const missing = document.getElementById('opsRulesReviewMissingDetail')?.textContent || '';
        const preset = document.getElementById('opsRulesReviewPresetDetail')?.textContent || '';
        const coverage = document.getElementById('opsRulesReviewCoverageDetail')?.textContent || '';
        const href = link?.getAttribute('href') || '';
        const ok = visible(panel) &&
          summary.includes('EventRecord coverage') &&
          eventType.includes('EventRecord eventType') &&
          conflict.length > 0 &&
          missing.length > 0 &&
          preset.length > 0 &&
          coverage.includes('verify-va-event-coverage-report') &&
          href.includes('/ops/events');
        return { ok, summary, eventType, conflict, missing, preset, coverage, href };
      })();
      if (!reviewLoop.ok) {
        return fail('S05 rule/scenario review loop did not render before save', reviewLoop);
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
        const originalProfileValue = profileSelect.value;
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
          profileSelect.value = originalProfileValue || '1';
          profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
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

      const preSaveMissingTemplateValidation = await (async () => {
        const profileSelect = document.getElementById('opsVaRuleProfileSelect');
        const templateSelect = document.getElementById('opsVaRuleTemplateSeedSelect');
        const saveButton = document.getElementById('opsRulesComposerSave');
        if (!profileSelect || !templateSelect || !saveButton) {
          return { ok: false, message: 'missing profile select, template select, or save button' };
        }
        const validProfileOption = Array.from(profileSelect.options).find(item => item.value && item.value !== '__missing_profile_e2e__');
        if (validProfileOption) {
          profileSelect.value = validProfileOption.value;
          profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const invalidTemplateId = '__missing_template_e2e__';
        const originalTemplateValue = templateSelect.value;
        const option = document.createElement('option');
        option.value = invalidTemplateId;
        option.textContent = 'Missing template E2E';
        templateSelect.appendChild(option);
        templateSelect.value = invalidTemplateId;
        templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
          templateSelect.value = originalTemplateValue;
          templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const statusText = status?.textContent || '';
        const ok = attemptedWrites.length === 0 &&
          statusText.includes('저장 전 검증 실패') &&
          statusText.includes('이벤트 템플릿') &&
          statusText.includes('찾을 수 없습니다');
        return { ok, attemptedWrites, statusText };
      })();
      if (!preSaveMissingTemplateValidation.ok) {
        return fail('pre-save validation did not block invalid template', preSaveMissingTemplateValidation);
      }

      const preSaveInactiveProfileValidation = await (async () => {
        if (!inactiveProfileId) return { ok: false, message: 'missing inactive profile fixture id' };
        const profileSelect = document.getElementById('opsVaRuleProfileSelect');
        const templateSelect = document.getElementById('opsVaRuleTemplateSeedSelect');
        const saveButton = document.getElementById('opsRulesComposerSave');
        if (!profileSelect || !templateSelect || !saveButton) {
          return { ok: false, message: 'missing profile select, template select, or save button' };
        }
        const validTemplateOption = Array.from(templateSelect.options).find(item => item.value && item.value !== inactiveRuleId);
        if (validTemplateOption) {
          templateSelect.value = validTemplateOption.value;
          templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const originalProfileValue = profileSelect.value;
        profileSelect.value = inactiveProfileId;
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
          profileSelect.value = originalProfileValue || '1';
          profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const statusText = status?.textContent || '';
        const ok = attemptedWrites.length === 0 &&
          statusText.includes('저장 전 검증 실패') &&
          statusText.includes('분석 프로파일') &&
          statusText.includes('비활성');
        return { ok, attemptedWrites, statusText, inactiveProfileId };
      })();
      if (!preSaveInactiveProfileValidation.ok) {
        return fail('pre-save validation did not block inactive profile', preSaveInactiveProfileValidation);
      }

      const preSaveInactiveTemplateValidation = await (async () => {
        if (!inactiveRuleId) return { ok: false, message: 'missing inactive template fixture id' };
        const profileSelect = document.getElementById('opsVaRuleProfileSelect');
        const templateSelect = document.getElementById('opsVaRuleTemplateSeedSelect');
        const saveButton = document.getElementById('opsRulesComposerSave');
        if (!profileSelect || !templateSelect || !saveButton) {
          return { ok: false, message: 'missing profile select, template select, or save button' };
        }
        const validProfileOption = Array.from(profileSelect.options).find(item => item.value && item.value !== inactiveProfileId);
        if (validProfileOption) {
          profileSelect.value = validProfileOption.value;
          profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const originalTemplateValue = templateSelect.value;
        templateSelect.value = inactiveRuleId;
        templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
          templateSelect.value = originalTemplateValue;
          templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const statusText = status?.textContent || '';
        const ok = attemptedWrites.length === 0 &&
          statusText.includes('저장 전 검증 실패') &&
          statusText.includes('이벤트 템플릿') &&
          statusText.includes('비활성');
        return { ok, attemptedWrites, statusText, inactiveRuleId };
      })();
      if (!preSaveInactiveTemplateValidation.ok) {
        return fail('pre-save validation did not block inactive template', preSaveInactiveTemplateValidation);
      }

      const preSaveClassMismatchValidation = await (async () => {
        if (!classMismatchProfileId || !classMismatchRuleId) {
          return { ok: false, message: 'missing class mismatch fixture ids' };
        }
        const profileSelect = document.getElementById('opsVaRuleProfileSelect');
        const templateSelect = document.getElementById('opsVaRuleTemplateSeedSelect');
        const saveButton = document.getElementById('opsRulesComposerSave');
        if (!profileSelect || !templateSelect || !saveButton) {
          return { ok: false, message: 'missing profile select, template select, or save button' };
        }
        const originalProfileValue = profileSelect.value;
        const originalTemplateValue = templateSelect.value;
        profileSelect.value = classMismatchProfileId;
        profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
        templateSelect.value = classMismatchRuleId;
        templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
          profileSelect.value = originalProfileValue || '1';
          profileSelect.dispatchEvent(new Event('change', { bubbles: true }));
          templateSelect.value = originalTemplateValue;
          templateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const statusText = status?.textContent || '';
        const ok = attemptedWrites.length === 0 &&
          statusText.includes('저장 전 검증 실패') &&
          statusText.includes('프로파일 대상') &&
          statusText.includes('템플릿 대상');
        return { ok, attemptedWrites, statusText, classMismatchProfileId, classMismatchRuleId };
      })();
      if (!preSaveClassMismatchValidation.ok) {
        return fail('pre-save validation did not block class mismatch', preSaveClassMismatchValidation);
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
      const vlmDraftWorkflow = await (async () => {
        const draftPayload = {
          schema: 'media-server.vlm-rule-suggestion-draft-workflow.v1',
          targetStep: 'V210-S08',
          status: 'draft-only-manual-save-required',
          manualSaveRoute: '/ops/rules',
          sourceCandidateStep: 'V200-S13',
          sourceCandidateReport: {
            schema: 'media-server.vlm-rule-suggestion-candidates.v1',
            candidates: [{
              schema: 'media-server.vlm-rule-suggestion-candidate.v1',
              eventId: 'evt-vlm-draft-line-001',
              observationId: 'vlmobs-draft-line-001',
              sourceId: 'front-door',
              summary: '사람이 기준선을 통과했습니다.',
              proposedRuleKind: 'line-crossing',
              candidateStatus: 'candidate-only-manual-rule-save',
              manualSaveRoute: '/ops/rules',
              ruleSuggestion: {
                kind: 'line-crossing',
                candidateId: 'line-crossing-manual-review',
                suggestedAction: 'manual-save-in-ops-rules',
                targetRoute: '/ops/rules',
                manualReviewRequired: true,
                autoApply: false,
                draftRule: {
                  eventType: 'line-crossing',
                  regionType: 'line',
                  direction: 'forward',
                  classes: ['person'],
                  minConfidence: 0.55
                },
                rationale: 'Operator must verify geometry and save manually.'
              }
            }],
            matchedCandidates: 1,
            excludedAutoApplySuggestions: 1
          }
        };
        const attemptedDraftWrites = [];
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init = {}) => {
          const url = String(typeof input === 'string' ? input : (input?.url || ''));
          const method = String(init?.method || input?.method || 'GET').toUpperCase();
          if (method === 'GET' && url.includes('/ops/api/vlm/rule-suggestion-drafts')) {
            return Promise.resolve(new Response(JSON.stringify(draftPayload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
          if (method !== 'GET' && (url.includes('/lab/analysis/rules') || url.includes('/lab/analysis/va-rules') || url.includes('/ops/api/vlm/'))) {
            attemptedDraftWrites.push(method + ' ' + url);
            return Promise.reject(new Error('blocked VLM draft write attempt'));
          }
          return originalFetch(input, init);
        };
        try {
          document.getElementById('opsVlmRuleDraftRefresh')?.click();
          await wait(350);
          const draftButton = document.querySelector('[data-vlm-rule-draft-index="0"]');
          if (!draftButton) {
            return { ok: false, message: 'missing VLM draft apply button', listText: document.getElementById('opsVlmRuleDraftList')?.textContent || '' };
          }
          draftButton.click();
          await wait(600);
        } finally {
          window.fetch = originalFetch;
        }
        const modeValue = String(document.getElementById('opsEventRuleModeSelect')?.value || '');
        const typeValue = String(document.getElementById('opsEventRuleTypeSelect')?.value || '');
        const directionValue = String(document.getElementById('opsEventRuleLineDirectionSelect')?.value || '');
        const confidenceValue = String(document.getElementById('opsEventRuleConfidenceInput')?.value || '');
        const statusText = status?.textContent || '';
        const classesSummary = document.getElementById('opsEventRuleClassesSummary')?.textContent || '';
        const ok = attemptedDraftWrites.length === 0 &&
          visible(detailPanel) &&
          visible(document.getElementById('opsEventRuleForm')) &&
          modeValue === 'event' &&
          typeValue === 'line-crossing' &&
          directionValue === 'forward' &&
          confidenceValue === '0.55' &&
          classesSummary.includes('사람') &&
          statusText.includes('저장은 운영자가 수동');
        return {
          ok,
          attemptedDraftWrites,
          modeValue,
          typeValue,
          directionValue,
          confidenceValue,
          classesSummary,
          statusText
        };
      })();
      if (!vlmDraftWorkflow.ok) {
        return fail('VLM rule suggestion draft workflow failed', vlmDraftWorkflow);
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
        preSaveMissingTemplateValidation,
        preSaveInactiveProfileValidation,
        preSaveInactiveTemplateValidation,
        preSaveClassMismatchValidation,
        reviewLoop,
        vlmDraftWorkflow,
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
