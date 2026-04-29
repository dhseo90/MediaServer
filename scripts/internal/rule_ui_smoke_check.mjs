#!/usr/bin/env node
// 파일 용도: headless Chrome에서 /lab/rules Rule/Profile 카테고리 버튼과 저장 payload를 확인한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = parseArgs(process.argv.slice(2));
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const pagePath = normalizePagePath(args.pagePath || "/lab/rules");
const chromePath = args.chromePath || findChrome();
const timeoutMs = Number(args.timeoutMs || 30000);
const debugPort = Number(args.debugPort || 9245);

if (!chromePath) {
  console.error("[rule-ui-smoke] failed: Chrome executable not found");
  process.exit(1);
}

let browser = null;
try {
  browser = await launchBrowser(debugPort);
  const result = await browser.evaluate(
    `
      (async () => {
        const requiredCategoryValues = ['person', 'vehicle', 'road', 'animal', 'sports', 'tableware', 'food', 'furniture', 'device', 'object'];
        const koWords = ['사람', '차량', '도로', '동물', '운동', '식기', '음식', '가구', '기기', '잡화'];
        const expectedDetailWordsByCategory = {
          person: ['사람'],
          vehicle: ['자전거', '자동차', '보트'],
          road: ['신호등', '주차 미터기'],
          animal: ['새', '개', '기린'],
          sports: ['프리스비', '공', '테니스 라켓'],
          tableware: ['병', '컵', '그릇'],
          food: ['바나나', '피자', '케이크'],
          furniture: ['벤치', '의자', '싱크대'],
          device: ['TV', '노트북', '헤어드라이어'],
          object: ['백팩', '곰인형', '칫솔'],
        };
        const $ = (id) => document.getElementById(id);
        const checkedValues = (selector) => Array.from(document.querySelectorAll(selector + ':checked')).map((el) => el.value).sort();
        const click = (id) => {
          const el = $(id);
          if (!el) throw new Error('missing button: ' + id);
          el.click();
        };
        const expectValidationDialog = (name, expectedText) => {
          const dialog = $('validationDialog');
          const message = $('validationDialogMessage');
          if (!dialog || !message) {
            throw new Error(name + ' validation dialog missing');
          }
          if (!dialog.open) {
            throw new Error(name + ' validation dialog did not open');
          }
          const actual = message.textContent || '';
          if (!actual.includes(expectedText)) {
            throw new Error(name + ' validation dialog text mismatch: ' + actual);
          }
          dialog.close();
        };
        const expectList = (name, actual, expected) => {
          const left = JSON.stringify([...actual].sort());
          const right = JSON.stringify([...expected].sort());
          if (left !== right) {
            throw new Error(name + ' mismatch: ' + left + ' != ' + right);
          }
        };
        const expectText = (id, expected) => {
          const el = $(id);
          if (!el) throw new Error('missing text element: ' + id);
          const actual = el.textContent.trim();
          if (actual !== expected) {
            throw new Error(id + ' text mismatch: ' + actual + ' != ' + expected);
          }
        };
        const setValue = (id, value) => {
          const el = $(id);
          if (!el) throw new Error('missing input: ' + id);
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const apiJson = async (url, options = {}) => {
          const response = await fetch(url, options);
          const text = await response.text();
          let payload = {};
          try {
            payload = text ? JSON.parse(text) : {};
          } catch (_) {
            payload = { raw: text };
          }
          if (!response.ok) {
            throw new Error(payload.error || text || 'HTTP ' + response.status);
          }
          return payload;
        };

        expectText('selectDefaultTrackingBtn', '기본');
        expectText('selectAllTrackingBtn', '전체 선택');
        expectText('clearTrackingBtn', '전체 해제');
        expectText('selectCoreClassesBtn', '기본');
        expectText('selectAllClassesBtn', '전체 선택');
        expectText('clearClassesBtn', '전체 해제');
        expectText('analysisSettingsTabBtn', '영상 분석 설정');
        expectText('analysisViewerTabBtn', '영상 분석 보기');
        if ($('eventFlashColorInput')) {
          throw new Error('highlight color input must not be visible');
        }
        if (!document.body.textContent.includes('영상 분석 관리') ||
            !document.body.textContent.includes('vaRule=숫자') ||
            !document.body.textContent.includes('영상 분석 설정 ID')) {
          throw new Error('missing video analysis management labels');
        }
        for (const id of ['vaRuleSelect', 'vaRuleId', 'vaRuleName', 'vaRuleSourceKind', 'vaRuleFileSelect', 'saveVaRuleBtn']) {
          if (!$(id)) throw new Error('missing vaRule setting control: ' + id);
        }
        if ($('vaRuleId').getAttribute('inputmode') !== 'numeric') {
          throw new Error('vaRule id must use numeric input mode');
        }
        expectText('stopPreviewBtn', '영상 보기 시작');
        for (const sectionText of ['기본 설정', '영상/영역', '시나리오', '객체/조건', '출력/저장']) {
          if (!document.body.textContent.includes(sectionText)) {
            throw new Error('missing rule section tab: ' + sectionText);
          }
        }
        if (!document.body.textContent.includes('영상 프레임 보기') ||
            !document.body.textContent.includes('영상 파일 선택') ||
            !document.body.textContent.includes('메인 /lab 선택 소스') ||
            !document.body.textContent.includes('객체 검출 오버레이 보기') ||
            !document.body.textContent.includes('영역/Zone 그리기 중 영상 프레임 보기')) {
          throw new Error('missing prominent video frame preview controls');
        }
        if (!$('previewSourceMode') || !$('previewFileSelect')) {
          throw new Error('missing video preview source selector');
        }
        if ($('previewSourceMode').value !== 'vaRule') {
          throw new Error('preview source mode default mismatch: ' + $('previewSourceMode').value);
        }
        if (!$('previewFileSelect').value) {
          throw new Error('preview file select must have a default value');
        }
        if (!$('previewOverlayInput') || $('previewOverlayInput').checked !== true) {
          throw new Error('preview overlay must be visible and enabled by default');
        }
        if (!$('viewWebRtcUrl') || !$('viewRtspUrl') || !$('viewTapUrl') || !$('viewVaRuleSelect')) {
          throw new Error('missing video analysis view controls');
        }
        click('analysisViewerTabBtn');
        if (!$('settingsPanel').hidden || $('viewerPanel').hidden) {
          throw new Error('viewer tab visibility mismatch');
        }
        if (!$('viewWebRtcUrl').value.includes('/webrtc/session?file=')) {
          throw new Error('viewer live URL mismatch: ' + $('viewWebRtcUrl').value);
        }
        click('analysisSettingsTabBtn');
        if ($('settingsPanel').hidden || !$('viewerPanel').hidden) {
          throw new Error('settings tab visibility mismatch');
        }
        if (document.body.textContent.includes('영역 배경 영상')) {
          throw new Error('old video preview label must not be visible');
        }
        if (!$('ruleLineDirection')) {
          throw new Error('missing line direction select');
        }
        if ($('ruleLineDirection').value !== 'any') {
          throw new Error('line direction default mismatch: ' + $('ruleLineDirection').value);
        }
        const scenarioRadio = document.querySelector('input[name="ruleKind"][value="scenario"]');
        const basicRadio = document.querySelector('input[name="ruleKind"][value="basic"]');
        if (!scenarioRadio || !basicRadio || !$('scenarioPanel')) {
          throw new Error('missing scenario rule controls');
        }
        const classGridStyle = window.getComputedStyle($('classChecks'));
        if (classGridStyle.overflowY === 'auto' || classGridStyle.maxHeight !== 'none') {
          throw new Error('rule class grid must not have an internal scrollbar');
        }

        const ruleChecks = Array.from(document.querySelectorAll('[data-rule-category]'));
        const trackingChecks = Array.from(document.querySelectorAll('[data-tracking-category]'));
        expectList('rule category values', ruleChecks.map((el) => el.value), requiredCategoryValues);
        expectList('tracking category values', trackingChecks.map((el) => el.value), requiredCategoryValues);

        const detailText = Array.from(document.querySelectorAll('.category-detail')).map((el) => el.textContent).join(' ');
        for (const word of koWords) {
          if (!document.body.textContent.includes(word)) {
            throw new Error('missing Korean category label: ' + word);
          }
        }
        for (const word of ['자동차', '신호등', '백팩', '칫솔']) {
          if (!detailText.includes(word)) {
            throw new Error('missing Korean included object label: ' + word);
          }
        }
        const detailByCategory = {};
        for (const input of ruleChecks) {
          const wrapper = input.closest('[data-class-item]');
          const detail = wrapper ? wrapper.querySelector('.category-detail') : null;
          detailByCategory[input.value] = detail ? detail.textContent : '';
        }
        for (const [category, words] of Object.entries(expectedDetailWordsByCategory)) {
          const text = detailByCategory[category] || '';
          if (!text.startsWith('포함: ')) {
            throw new Error('category detail prefix mismatch for ' + category + ': ' + text);
          }
          for (const word of words) {
            if (!text.includes(word)) {
              throw new Error('category detail missing ' + word + ' for ' + category + ': ' + text);
            }
          }
        }

        expectList('rule default initial', checkedValues('[data-rule-category]'), ['person', 'vehicle']);
        click('selectAllClassesBtn');
        expectList('rule all', checkedValues('[data-rule-category]'), requiredCategoryValues);
        click('clearClassesBtn');
        expectList('rule clear', checkedValues('[data-rule-category]'), []);
        const emptyRule = window.ruleJson ? window.ruleJson() : null;
        if (!emptyRule || !Array.isArray(emptyRule.analysis?.classes) || emptyRule.analysis.classes.length !== 0) {
          throw new Error('rule clear payload must keep analysis.classes=[]');
        }
        const ruleApi = window.__mediaServerRuleEditorApi;
        if (!ruleApi) {
          throw new Error('missing window.__mediaServerRuleEditorApi');
        }
        const ruleWarning = ruleApi.validateRulePayload(emptyRule);
        if (!ruleWarning.includes('분석할 객체 카테고리')) {
          throw new Error('rule empty selection warning mismatch: ' + ruleWarning);
        }
        try {
          await ruleApi.saveRule();
          throw new Error('saveRule should fail when no class is selected');
        } catch (error) {
          if (!String(error && error.message || '').includes('분석할 객체 카테고리')) {
            throw error;
          }
        }
        expectValidationDialog('rule', '분석할 객체 카테고리');
        click('selectCoreClassesBtn');
        expectList('rule default button', checkedValues('[data-rule-category]'), ['person', 'vehicle']);
        setValue('ruleEventType', 'line-crossing');
        setValue('ruleLineDirection', 'forward');
        const lineRulePayload = window.ruleJson();
        if (lineRulePayload.event?.region?.type !== 'line') {
          throw new Error('line-crossing payload region.type mismatch: ' + JSON.stringify(lineRulePayload.event?.region));
        }
        if (lineRulePayload.event?.region?.direction !== 'forward') {
          throw new Error('line-crossing direction payload mismatch: ' + lineRulePayload.event?.region?.direction);
        }
        if (!Array.isArray(lineRulePayload.event?.region?.points) || lineRulePayload.event.region.points.length !== 2) {
          throw new Error('line-crossing points length mismatch: ' + JSON.stringify(lineRulePayload.event?.region?.points));
        }
        scenarioRadio.click();
        for (const forbiddenText of ['Restricted zone ID', 'Candidate 진입', 'Confirmed 체류', 'Cooldown(ms)']) {
          if (document.body.textContent.includes(forbiddenText)) {
            throw new Error('scenario UI must use Korean operator labels, found: ' + forbiddenText);
          }
        }
        if ($('scenarioCandidateMs').type !== 'range' ||
            $('scenarioDwellMs').type !== 'range' ||
            $('scenarioCooldownMs').type !== 'range') {
          throw new Error('scenario time controls must use range bars');
        }
        const rangeMetaText = Array.from(document.querySelectorAll('.range-meta')).map((el) => el.textContent).join(' ');
        for (const expected of ['범위 0~30,000 ms', '기본 2,000 ms', '범위 1,000~120,000 ms', '기본 10,000 ms', '범위 0~60,000 ms', '기본 5,000 ms']) {
          if (!rangeMetaText.includes(expected)) {
            throw new Error('scenario range metadata missing: ' + expected);
          }
        }
        setValue('scenarioCandidateMs', '2000');
        setValue('scenarioDwellMs', '10000');
        setValue('scenarioCooldownMs', '5000');
        setValue('scenarioZoneIds', 'zone-a, zone-b');
        const stableOnly = $('scenarioStableOnly');
        stableOnly.checked = true;
        stableOnly.dispatchEvent(new Event('change', { bubbles: true }));
        const scenarioPayload = window.ruleJson();
        if (scenarioPayload.ruleKind !== 'scenario' || scenarioPayload.event?.type !== 'intrusion-dwell') {
          throw new Error('scenario payload type mismatch: ' + JSON.stringify(scenarioPayload));
        }
        if (scenarioPayload.scenario?.candidateTimeMs !== 2000 ||
            scenarioPayload.scenario?.dwellTimeMs !== 10000 ||
            scenarioPayload.scenario?.cooldownMs !== 5000) {
          throw new Error('scenario timing payload mismatch: ' + JSON.stringify(scenarioPayload.scenario));
        }
        expectList('scenario restricted zones', scenarioPayload.scenario?.restrictedZoneIds || [], ['zone-a', 'zone-b']);
        if (scenarioPayload.scenario?.trackHealth?.requireStableTrack !== true) {
          throw new Error('scenario track health payload mismatch: ' + JSON.stringify(scenarioPayload.scenario));
        }
        if (!$('scenarioSummaryText').textContent.includes('10,000 ms') ||
            !$('scenarioSummaryText').textContent.includes('5,000 ms')) {
          throw new Error('scenario summary ms label mismatch: ' + $('scenarioSummaryText').textContent);
        }
        if (!$('scenarioReadinessZone').textContent.includes('zone-a') ||
            !$('scenarioReadinessTiming').textContent.includes('확정 10,000 ms') ||
            !$('scenarioReadinessEmit').textContent.includes('intrusion-dwell') ||
            !$('scenarioReadinessHealth').textContent.includes('안정적인 track')) {
          throw new Error('scenario readiness summary mismatch');
        }
        if (scenarioPayload.event?.region?.type !== 'polygon' ||
            !Array.isArray(scenarioPayload.event?.region?.points) ||
            scenarioPayload.event.region.points.length < 3) {
          throw new Error('scenario region payload mismatch: ' + JSON.stringify(scenarioPayload.event?.region));
        }
        setValue('scenarioDwellMs', '1000');
        const scenarioWarning = ruleApi.validateRulePayload(window.ruleJson());
        if (!scenarioWarning.includes('체류 확정 시간')) {
          throw new Error('scenario timing validation mismatch: ' + scenarioWarning);
        }
        setValue('scenarioDwellMs', '10000');
        basicRadio.click();
        setValue('ruleEventType', 'presence');

        expectList('profile default initial', checkedValues('[data-tracking-category]'), ['person', 'vehicle']);
        click('selectAllTrackingBtn');
        expectList('profile all', checkedValues('[data-tracking-category]'), requiredCategoryValues);
        click('clearTrackingBtn');
        expectList('profile clear', checkedValues('[data-tracking-category]'), []);
        const emptyProfile = window.profileJson ? window.profileJson() : null;
        if (!emptyProfile || !Array.isArray(emptyProfile.trackingClasses) || emptyProfile.trackingClasses.length !== 0) {
          throw new Error('profile clear payload must keep trackingClasses=[]');
        }
        const profileWarning = ruleApi.validateProfilePayload(emptyProfile);
        if (!profileWarning.includes('Tracking 대상 카테고리')) {
          throw new Error('profile empty selection warning mismatch: ' + profileWarning);
        }
        try {
          await ruleApi.saveProfile();
          throw new Error('saveProfile should fail when no tracking category is selected');
        } catch (error) {
          if (!String(error && error.message || '').includes('Tracking 대상 카테고리')) {
            throw error;
          }
        }
        expectValidationDialog('profile', 'Tracking 대상 카테고리');
        click('selectDefaultTrackingBtn');
        expectList('profile default button', checkedValues('[data-tracking-category]'), ['person', 'vehicle']);

        const smokeId = 'rule-ui-smoke-' + Date.now();
        const savedProfileId = smokeId + '-profile';
        const savedRuleId = smokeId + '-rule';
        const savedScenarioRuleId = smokeId + '-scenario-rule';
        const savedVaRuleId = String(Date.now()).slice(-10);
        try {
          setValue('profileId', savedProfileId);
          click('selectAllTrackingBtn');
          await ruleApi.saveProfile();
          const savedProfile = await apiJson('/lab/analysis/profiles/' + encodeURIComponent(savedProfileId));
          expectList('saved profile trackingClasses', savedProfile.profile?.trackingClasses || [], requiredCategoryValues);

          setValue('ruleId', savedRuleId);
          const ruleProfileSelect = $('ruleProfileId');
          if (!Array.from(ruleProfileSelect.options).some((option) => option.value === savedProfileId)) {
            throw new Error('saved profile missing in rule profile select');
          }
          ruleProfileSelect.value = savedProfileId;
          ruleProfileSelect.dispatchEvent(new Event('change', { bubbles: true }));
          click('selectCoreClassesBtn');
          const rulePayload = window.ruleJson();
          if (rulePayload.analysis.profileId !== savedProfileId) {
            throw new Error('rule payload profileId mismatch: ' + rulePayload.analysis.profileId);
          }
          expectList('rule payload default classes', rulePayload.analysis.classes, ['person', 'vehicle']);
          await ruleApi.saveRule();
          const savedRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedRuleId));
          if (savedRule.rule?.analysis?.profileId !== savedProfileId) {
            throw new Error('saved rule profileId mismatch: ' + JSON.stringify(savedRule.rule?.analysis));
          }
          expectList('saved rule analysis.classes', savedRule.rule?.analysis?.classes || [], ['person', 'vehicle']);

          scenarioRadio.click();
          setValue('ruleId', savedScenarioRuleId);
          setValue('scenarioCandidateMs', '2500');
          setValue('scenarioDwellMs', '12000');
          setValue('scenarioCooldownMs', '7000');
          setValue('scenarioZoneIds', 'lobby');
          stableOnly.checked = true;
          stableOnly.dispatchEvent(new Event('change', { bubbles: true }));
          click('selectCoreClassesBtn');
          await ruleApi.saveRule();
          const savedScenarioRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedScenarioRuleId));
          if (savedScenarioRule.rule?.ruleKind !== 'scenario' ||
              savedScenarioRule.rule?.event?.type !== 'intrusion-dwell') {
            throw new Error('saved scenario rule type mismatch: ' + JSON.stringify(savedScenarioRule.rule));
          }
          if (savedScenarioRule.rule?.scenario?.candidateTimeMs !== 2500 ||
              savedScenarioRule.rule?.scenario?.dwellTimeMs !== 12000 ||
              savedScenarioRule.rule?.scenario?.cooldownMs !== 7000) {
            throw new Error('saved scenario timing mismatch: ' + JSON.stringify(savedScenarioRule.rule?.scenario));
          }
          expectList('saved scenario zones', savedScenarioRule.rule?.scenario?.restrictedZoneIds || [], ['lobby']);

          setValue('vaRuleId', savedVaRuleId);
          setValue('vaRuleName', 'smoke 영상 분석 설정');
          setValue('vaRuleSourceKind', 'file');
          setValue('vaRuleFileSelect', $('previewFileSelect').value || 'sample_h264.mp4');
          const vaRulePayload = ruleApi.vaRuleJson();
          if (vaRulePayload.id !== savedVaRuleId ||
              vaRulePayload.match?.vaRule !== savedVaRuleId ||
              vaRulePayload.source?.kind !== 'file' ||
              !vaRulePayload.source?.file) {
            throw new Error('vaRule payload mismatch: ' + JSON.stringify(vaRulePayload));
          }
          await ruleApi.saveVaRule();
          const savedVaRule = await apiJson('/lab/analysis/va-rules/' + encodeURIComponent(savedVaRuleId));
          if (savedVaRule.vaRule?.id !== savedVaRuleId ||
              savedVaRule.vaRule?.match?.vaRule !== savedVaRuleId ||
              savedVaRule.vaRule?.source?.kind !== 'file') {
            throw new Error('saved vaRule mismatch: ' + JSON.stringify(savedVaRule.vaRule));
          }
          setValue('viewVaRuleSelect', savedVaRuleId);
          const ruleMode = document.querySelector('input[name="viewMode"][value="rule"]');
          if (!ruleMode) throw new Error('missing viewer rule mode');
          ruleMode.click();
          if (!$('viewWebRtcUrl').value.includes('vaRule=' + savedVaRuleId) ||
              $('viewWebRtcUrl').value.includes('file=')) {
            throw new Error('viewer vaRule URL must be locked to vaRule only: ' + $('viewWebRtcUrl').value);
          }
        } finally {
          await apiJson('/lab/analysis/va-rules/' + encodeURIComponent(savedVaRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedScenarioRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/profiles/' + encodeURIComponent(savedProfileId), { method: 'DELETE' }).catch(() => {});
        }

        return {
          ruleButtons: ['기본', '전체 선택', '전체 해제'],
          profileButtons: ['기본', '전체 선택', '전체 해제'],
          categories: requiredCategoryValues,
          categoryDetails: detailByCategory,
          lineDirectionPayload: lineRulePayload.event.region.direction,
          scenarioType: scenarioPayload.scenario.type,
          scenarioZones: scenarioPayload.scenario.restrictedZoneIds,
          ruleClearClasses: emptyRule.analysis.classes,
          profileClearTrackingClasses: emptyProfile.trackingClasses,
          ruleWarning,
          profileWarning,
          roundTrip: {
            profileId: savedProfileId,
            ruleId: savedRuleId,
            scenarioRuleId: savedScenarioRuleId,
            vaRuleId: savedVaRuleId,
            savedProfileTrackingClasses: requiredCategoryValues,
            savedRuleClasses: ['person', 'vehicle'],
          },
        };
      })()
    `,
    timeoutMs,
  );
  console.log(JSON.stringify({ ok: true, result }, null, 2));
} catch (error) {
  console.error(`[rule-ui-smoke] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }
}

process.exit(process.exitCode || 0);

// CLI 인자를 key/value map으로 변환한다.
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const rawKey = token.slice(2);
    const key = rawKey.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "1";
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

// OS별 Chrome 실행 파일 후보를 찾는다.
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

// page path를 CDP target URL에 붙일 수 있는 절대 path로 정규화한다.
function normalizePagePath(value) {
  const text = String(value || "/lab/rules");
  return text.startsWith("/") ? text : `/${text}`;
}

// headless Chrome을 실행하고 CDP Runtime.evaluate helper를 반환한다.
async function launchBrowser(port) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-rule-ui-"));
  const targetUrl = `${httpBase}${pagePath}?run=${Date.now()}`;
  const pending = new Map();
  let messageId = 0;
  let ws = null;
  const chrome = spawn(
    chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      targetUrl,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  chrome.stdout.on("data", (chunk) => {
    if (args.verbose) process.stdout.write(`[chrome] ${chunk}`);
  });
  chrome.stderr.on("data", (chunk) => {
    if (args.verbose) process.stderr.write(`[chrome] ${chunk}`);
  });

  const cdp = (method, params = {}) => {
    const id = ++messageId;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  };
  const close = async () => {
    for (const [id, entry] of pending.entries()) {
      pending.delete(id);
      entry.reject(new Error(`CDP closed before response for message ${id}`));
    }
    if (ws) {
      try {
        ws.close();
      } catch (_) {}
    }
    if (chrome && !chrome.killed) {
      chrome.kill("SIGTERM");
      await onceExit(chrome, 5000).catch(() => chrome.kill("SIGKILL"));
    }
    fs.rmSync(userDataDir, { recursive: true, force: true });
  };

  try {
    const pageTarget = await waitForTarget(port, targetUrl, timeoutMs);
    ws = await connectWebSocket(pageTarget.webSocketDebuggerUrl, pending);
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await waitForDocumentReady((expr, ms) => evaluateWithCdp(cdp, expr, ms), timeoutMs);
    await waitForRuleEditorReady((expr, ms) => evaluateWithCdp(cdp, expr, ms), timeoutMs);
    return {
      evaluate: (expr, ms) => evaluateWithCdp(cdp, expr, ms),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

// Chrome target 목록에서 방금 연 page를 찾는다.
async function waitForTarget(port, urlPrefix, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((item) => item.type === "page" && String(item.url || "").startsWith(urlPrefix));
        if (page?.webSocketDebuggerUrl) {
          return page;
        }
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error(`timed out waiting for Chrome target: ${urlPrefix}`);
}

// CDP WebSocket을 열고 pending response map을 연결한다.
async function connectWebSocket(url, pending) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", (event) => reject(event.error || new Error("WebSocket open failed")), { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id !== "number") {
      return;
    }
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
    } else {
      entry.resolve(message.result);
    }
  });
  return socket;
}

// 문서 로드 완료까지 기다린다.
async function waitForDocumentReady(evaluate, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      if ((await evaluate("document.readyState", 5000)) === "complete") {
        return;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error("timed out waiting for document.readyState=complete");
}

// Rule editor의 동적 카테고리 checkbox 렌더링 완료까지 기다린다.
async function waitForRuleEditorReady(evaluate, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const ready = await evaluate(
        "document.querySelectorAll('[data-rule-category]').length === 10 && document.querySelectorAll('[data-tracking-category]').length === 10",
        5000,
      );
      if (ready) {
        return;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error("timed out waiting for /lab/rules categories");
}

// CDP Runtime.evaluate를 timeout과 함께 실행한다.
async function evaluateWithCdp(cdp, expression, evalTimeoutMs) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out evaluating expression after ${evalTimeoutMs}ms`)), evalTimeoutMs);
  });
  const result = await Promise.race([
    cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    }),
    timeout,
  ]).finally(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
  });
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result?.result?.value;
}

// child process 종료를 timeout과 함께 기다린다.
function onceExit(child, waitTimeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child exit timeout")), waitTimeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}
