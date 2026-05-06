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
        window.confirm = () => true;
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
        const setChecked = (id, checked) => {
          const el = $(id);
          if (!el) throw new Error('missing checkbox: ' + id);
          el.checked = Boolean(checked);
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
        const expectCssToken = (name) => {
          const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
          if (!value) throw new Error('missing shared design token: ' + name);
        };

        for (const token of ['--color-bg', '--color-text', '--color-primary', '--color-border', '--radius-lg']) {
          expectCssToken(token);
        }
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
            !document.body.textContent.includes('저장된 영상 분석 룰')) {
          throw new Error('missing video analysis management labels');
        }
        for (const id of ['addVaRuleBtn', 'vaRuleList', 'vaRuleTotalMetric', 'vaRuleNextIdMetric']) {
          if (!$(id)) throw new Error('missing vaRule management control: ' + id);
        }
        for (const id of ['dashboardEventRecordsDetails', 'eventRecordEvidenceFilter', 'eventRecordEvidenceSummary', 'eventRecordSnapshotPathText', 'eventRecordClipPathText', 'eventRecordClipBundleText', 'eventRecordPrevPageBtn', 'eventRecordNextPageBtn', 'eventRecordCompactionKeepNewestInput', 'eventRecordCompactionCleanupBtn', 'eventRecordEvidencePreview', 'eventRecordSnapshotPreviewImage', 'eventRecordClipManifestJson', 'eventRecordClipFrameLinks']) {
          if (!$(id)) throw new Error('missing EventRecord evidence UI control: ' + id);
        }
        const evidenceValues = Array.from($('eventRecordEvidenceFilter').options).map((option) => option.value);
        expectList('EventRecord evidence filter values', evidenceValues, ['', 'snapshot', 'clip', 'any', 'both', 'missing']);
        if ($('eventRecordCompactionKeepNewestInput').value !== '10') {
          throw new Error('EventRecord compaction keepNewest default mismatch: ' + $('eventRecordCompactionKeepNewestInput').value);
        }
        for (const id of ['editSelectedVaRuleBtn', 'duplicateSelectedVaRuleBtn', 'deleteSelectedVaRuleBtn']) {
          if ($(id)) throw new Error('selected-rule toolbar action should be removed: ' + id);
        }
        click('addVaRuleBtn');
        if ($('vaRuleEditorPanel').hidden) {
          throw new Error('vaRule editor must open after add');
        }
        for (const id of ['vaRuleSelect', 'vaRuleId', 'vaRuleIdDisplay', 'vaRuleName', 'vaRuleSourceKind', 'vaRuleFileSelect', 'saveVaRuleBtn']) {
          if (!$(id)) throw new Error('missing vaRule setting control: ' + id);
        }
        if ($('vaRuleId').type !== 'hidden' || !$('vaRuleIdDisplay').textContent.includes('#')) {
          throw new Error('vaRule id must be automatic and hidden from direct editing');
        }
        expectText('stopPreviewBtn', '영상 보기 시작');
        for (const sectionText of ['기본 정보', '영상 소스', '분석 Profile', '이벤트 방식', '대상 객체', '영역/라인', '이벤트 동작', '저장 전 검토']) {
          if (!document.body.textContent.includes(sectionText)) {
            throw new Error('missing rule section tab: ' + sectionText);
          }
        }
        if (!document.body.textContent.includes('영상 프레임 보기') ||
            !document.body.textContent.includes('다른 서버 파일 임시 보기') ||
            !document.body.textContent.includes('메인 /lab 선택 소스') ||
            !document.body.textContent.includes('객체 검출 오버레이 보기') ||
            !document.body.textContent.includes('영역 캔버스에도 이 프레임 표시')) {
          throw new Error('missing prominent video frame preview controls');
        }
        if (!document.body.textContent.includes('고급 Profile 설정') ||
            !document.body.textContent.includes('Payload preview') ||
            !document.body.textContent.includes('저장 가능 여부')) {
          throw new Error('missing staged edit form structure');
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
        for (const id of ['metadataFilterEventType', 'metadataFilterScenarioName', 'metadataFilterTrackId', 'metadataFilterZoneId', 'metadataIncludeSourceInput', 'metadataIncludeScenariosInput', 'metadataIncludeMetricsInput', 'metadataIncludeTrackingIssueInput']) {
          if (!$(id)) throw new Error('missing metadata subscription control: ' + id);
        }
        setValue('metadataFilterEventType', 'loitering');
        setValue('metadataFilterScenarioName', 'loitering');
        setValue('metadataFilterTrackId', '7');
        setValue('metadataFilterZoneId', 'queue-a');
        setChecked('metadataIncludeMetricsInput', false);
        const sseUrl = $('viewMetadataSideChannelUrl').value;
        const wsUrl = $('viewWebSocketSideChannelUrl').value;
        const webRtcMetadataUrl = $('viewWebRtcMetadataUrl').value;
        for (const required of ['eventType=loitering', 'scenarioName=loitering', 'trackId=7', 'zoneId=queue-a', 'includeMetrics=0']) {
          if (!sseUrl.includes(required) || !wsUrl.includes(required) || !webRtcMetadataUrl.includes(required)) {
            throw new Error('metadata subscription URL missing ' + required + ': ' + sseUrl + ' / ' + wsUrl + ' / ' + webRtcMetadataUrl);
          }
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
        setValue('scenarioType', 're-entry');
        setValue('scenarioZoneIds', 'lobby');
        setValue('scenarioReEntryWindowMs', '9000');
        setValue('scenarioReEntryMode', 'specified-zone');
        setValue('scenarioReEntryZoneIds', 'lobby');
        setValue('scenarioCooldownMs', '4000');
        if ($('scenarioReEntryRow').hidden ||
            !$('scenarioDwellTimingRow').hidden ||
            !$('scenarioWrongDirectionRow').hidden ||
            $('scenarioZoneIdsLabel').hidden ||
            $('scenarioReEntryZoneIdsLabel').hidden) {
          throw new Error('re-entry scenario panel visibility mismatch');
        }
        const reEntryPayload = window.ruleJson();
        if (reEntryPayload.ruleKind !== 'scenario' ||
            reEntryPayload.event?.type !== 're-entry' ||
            reEntryPayload.scenario?.type !== 're-entry') {
          throw new Error('re-entry payload type mismatch: ' + JSON.stringify(reEntryPayload));
        }
        if (reEntryPayload.event?.region?.type !== 'polygon' ||
            !Array.isArray(reEntryPayload.event?.region?.points) ||
            reEntryPayload.event.region.points.length < 3) {
          throw new Error('re-entry polygon payload mismatch: ' + JSON.stringify(reEntryPayload.event?.region));
        }
        if (reEntryPayload.scenario?.reEntryWindowMs !== 9000 ||
            reEntryPayload.scenario?.cooldownMs !== 4000 ||
            reEntryPayload.scenario?.reEntryMode !== 'specified-zone') {
          throw new Error('re-entry timing/mode payload mismatch: ' + JSON.stringify(reEntryPayload.scenario));
        }
        expectList('re-entry target zones', reEntryPayload.scenario?.targetZoneIds || [], ['lobby']);
        expectList('re-entry zones', reEntryPayload.scenario?.reEntryZoneIds || [], ['lobby']);
        if (!$('scenarioSummaryText').textContent.includes('re-entry 이벤트') ||
            !$('scenarioReadinessTiming').textContent.includes('window 9,000 ms') ||
            !$('scenarioReadinessEmit').textContent.includes('re-entry')) {
          throw new Error('re-entry summary/readiness mismatch');
        }
        const reEntryPhaseText = $('scenarioPhaseStrip').textContent;
        for (const expected of ['Inside', 'Exited', 'ReEntryCandidate', 'Confirmed', 'Cooldown', 'Ended']) {
          if (!reEntryPhaseText.includes(expected)) {
            throw new Error('re-entry phase preview missing: ' + expected);
          }
        }
        const reEntryPreview = JSON.parse($('eventPayloadPreview').value);
        if (reEntryPreview.rule?.type !== 're-entry' ||
            reEntryPreview.region?.type !== 'polygon' ||
            reEntryPreview.scenario?.reEntryWindowMs !== 9000 ||
            reEntryPreview.scenario?.cooldownMs !== 4000) {
          throw new Error('re-entry event payload preview mismatch: ' + JSON.stringify(reEntryPreview));
        }
        setValue('scenarioType', 'intrusion-after-line-crossing');
        setValue('scenarioZoneIds', 'secure-zone');
        setValue('scenarioAfterLineId', 'entry-line');
        setValue('scenarioAfterLineDirection', 'reverse');
        setValue('scenarioAfterLineX1', '0.20');
        setValue('scenarioAfterLineY1', '0.10');
        setValue('scenarioAfterLineX2', '0.20');
        setValue('scenarioAfterLineY2', '0.90');
        setValue('scenarioAfterLineTimeoutMs', '12000');
        setValue('scenarioAfterLineDwellMs', '3000');
        setValue('scenarioCooldownMs', '7000');
        if ($('scenarioAfterLineRow').hidden ||
            !$('scenarioDwellTimingRow').hidden ||
            !$('scenarioWrongDirectionRow').hidden ||
            !$('scenarioReEntryRow').hidden ||
            $('scenarioZoneIdsLabel').hidden) {
          throw new Error('intrusion-after-line-crossing panel visibility mismatch');
        }
        const afterLinePayload = window.ruleJson();
        if (afterLinePayload.ruleKind !== 'scenario' ||
            afterLinePayload.event?.type !== 'intrusion-after-line-crossing' ||
            afterLinePayload.scenario?.type !== 'intrusion-after-line-crossing') {
          throw new Error('intrusion-after-line-crossing payload type mismatch: ' + JSON.stringify(afterLinePayload));
        }
        if (afterLinePayload.event?.region?.type !== 'polygon' ||
            !Array.isArray(afterLinePayload.event?.region?.points) ||
            afterLinePayload.event.region.points.length < 3) {
          throw new Error('intrusion-after-line-crossing target zone mismatch: ' + JSON.stringify(afterLinePayload.event?.region));
        }
        if (afterLinePayload.scenario?.maxDelayAfterCrossingMs !== 12000 ||
            afterLinePayload.scenario?.dwellTimeMs !== 3000 ||
            afterLinePayload.scenario?.cooldownMs !== 7000 ||
            afterLinePayload.scenario?.triggerLine?.id !== 'entry-line' ||
            afterLinePayload.scenario?.triggerLine?.direction !== 'reverse') {
          throw new Error('intrusion-after-line-crossing timing/line mismatch: ' + JSON.stringify(afterLinePayload.scenario));
        }
        expectList('intrusion-after-line-crossing target lines', afterLinePayload.scenario?.targetLineIds || [], ['entry-line']);
        expectList('intrusion-after-line-crossing target zones', afterLinePayload.scenario?.targetZoneIds || [], ['secure-zone']);
        if (!Array.isArray(afterLinePayload.scenario?.triggerLine?.points) ||
            afterLinePayload.scenario.triggerLine.points.length !== 2) {
          throw new Error('intrusion-after-line-crossing trigger line points mismatch: ' + JSON.stringify(afterLinePayload.scenario?.triggerLine));
        }
        if (!$('scenarioSummaryText').textContent.includes('intrusion-after-line-crossing scenario event') ||
            !$('scenarioReadinessTiming').textContent.includes('zone entry 12,000 ms') ||
            !$('scenarioReadinessEmit').textContent.includes('line-crossing과 별도')) {
          throw new Error('intrusion-after-line-crossing summary/readiness mismatch');
        }
        const afterLinePhaseText = $('scenarioPhaseStrip').textContent;
        for (const expected of ['Idle', 'LineCrossed', 'ZoneEntered', 'Observing', 'Confirmed', 'Cooldown', 'Ended']) {
          if (!afterLinePhaseText.includes(expected)) {
            throw new Error('intrusion-after-line-crossing phase preview missing: ' + expected);
          }
        }
        const afterLinePreview = JSON.parse($('eventPayloadPreview').value);
        if (afterLinePreview.rule?.type !== 'intrusion-after-line-crossing' ||
            afterLinePreview.region?.type !== 'polygon' ||
            afterLinePreview.scenario?.lineId !== 'entry-line' ||
            afterLinePreview.scenario?.direction !== 'reverse' ||
            afterLinePreview.scenario?.maxDelayAfterCrossingMs !== 12000 ||
            afterLinePreview.scenario?.dwellTimeMs !== 3000) {
          throw new Error('intrusion-after-line-crossing event payload preview mismatch: ' + JSON.stringify(afterLinePreview));
        }
        const afterLineInvalid = JSON.parse(JSON.stringify(afterLinePayload));
        afterLineInvalid.scenario.triggerLine.points = [];
        const afterLineWarning = ruleApi.validateRulePayload(afterLineInvalid);
        if (!afterLineWarning.includes('trigger line')) {
          throw new Error('intrusion-after-line-crossing validation mismatch: ' + afterLineWarning);
        }
        setValue('scenarioType', 'loitering');
        setValue('scenarioZoneIds', 'lobby, plaza');
        setValue('scenarioDwellMs', '30000');
        setValue('scenarioLoiteringRadius', '0.12');
        setValue('scenarioLoiteringMinPoints', '6');
        setValue('scenarioCooldownMs', '9000');
        $('scenarioLoiteringUseGroundPlane').checked = true;
        $('scenarioLoiteringUseGroundPlane').dispatchEvent(new Event('change', { bubbles: true }));
        if ($('scenarioLoiteringRow').hidden ||
            $('scenarioDwellTimingRow').hidden ||
            !$('scenarioCandidateMsLabel').hidden ||
            !$('scenarioWrongDirectionRow').hidden ||
            !$('scenarioReEntryRow').hidden ||
            !$('scenarioAfterLineRow').hidden ||
            $('scenarioZoneIdsLabel').hidden) {
          throw new Error('loitering scenario panel visibility mismatch');
        }
        const loiteringPayload = window.ruleJson();
        if (loiteringPayload.ruleKind !== 'scenario' ||
            loiteringPayload.event?.type !== 'loitering' ||
            loiteringPayload.scenario?.type !== 'loitering') {
          throw new Error('loitering payload type mismatch: ' + JSON.stringify(loiteringPayload));
        }
        if (loiteringPayload.event?.region?.type !== 'polygon' ||
            !Array.isArray(loiteringPayload.event?.region?.points) ||
            loiteringPayload.event.region.points.length < 3) {
          throw new Error('loitering polygon payload mismatch: ' + JSON.stringify(loiteringPayload.event?.region));
        }
        if (loiteringPayload.scenario?.minDwellTimeMs !== 30000 ||
            loiteringPayload.scenario?.maxMovementRadius !== 0.12 ||
            loiteringPayload.scenario?.minTrajectoryPoints !== 6 ||
            loiteringPayload.scenario?.cooldownMs !== 9000 ||
            loiteringPayload.scenario?.useGroundPlaneMovementRadius !== true ||
            Object.prototype.hasOwnProperty.call(loiteringPayload.scenario || {}, 'candidateTimeMs')) {
          throw new Error('loitering timing/radius payload mismatch: ' + JSON.stringify(loiteringPayload.scenario));
        }
        expectList('loitering target zones', loiteringPayload.scenario?.targetZoneIds || [], ['lobby', 'plaza']);
        if (!$('scenarioSummaryText').textContent.includes('loitering scenario event') ||
            !$('scenarioReadinessTiming').textContent.includes('radius 0.12') ||
            !$('scenarioReadinessEmit').textContent.includes('loitering')) {
          throw new Error('loitering summary/readiness mismatch');
        }
        const loiteringPhaseText = $('scenarioPhaseStrip').textContent;
        for (const expected of ['Idle', 'InsideZone', 'TrajectoryStable', 'DwellSatisfied', 'Confirmed', 'Cooldown', 'Ended']) {
          if (!loiteringPhaseText.includes(expected)) {
            throw new Error('loitering phase preview missing: ' + expected);
          }
        }
        const loiteringPreview = JSON.parse($('eventPayloadPreview').value);
        if (loiteringPreview.rule?.type !== 'loitering' ||
            loiteringPreview.region?.type !== 'polygon' ||
            loiteringPreview.scenario?.minDwellTimeMs !== 30000 ||
            loiteringPreview.scenario?.maxMovementRadius !== 0.12 ||
            loiteringPreview.scenario?.minTrajectoryPoints !== 6) {
          throw new Error('loitering event payload preview mismatch: ' + JSON.stringify(loiteringPreview));
        }
        const loiteringInvalid = JSON.parse(JSON.stringify(loiteringPayload));
        loiteringInvalid.scenario.maxMovementRadius = 0;
        const loiteringWarning = ruleApi.validateRulePayload(loiteringInvalid);
        if (!loiteringWarning.includes('이동 반경')) {
          throw new Error('loitering radius validation mismatch: ' + loiteringWarning);
        }
        setValue('scenarioLoiteringPreset', 'platform');
        if (Number($('scenarioDwellMs').value) !== 45000 ||
            Number($('scenarioLoiteringRadius').value) !== 0.10 ||
            Number($('scenarioLoiteringMinPoints').value) !== 5) {
          throw new Error('loitering field preset mismatch');
        }
        setValue('scenarioType', 'zone-occupancy');
        setValue('scenarioZoneIds', 'queue-zone');
        setValue('scenarioZoneOccupancyPreset', 'queue');
        const zoneOccupancyPresetValues = Array.from($('scenarioZoneOccupancyPreset').options).map((option) => option.value);
        expectList('zone-occupancy preset values', zoneOccupancyPresetValues, ['custom', 'queue', 'lobby', 'platform', 'doorway', 'elevator-hall']);
        if (Number($('scenarioZoneOccupancyThreshold').value) !== 4 ||
            Number($('scenarioZoneOccupancyMinDwellMs').value) !== 7000 ||
            Number($('scenarioCooldownMs').value) !== 12000) {
          throw new Error('zone-occupancy field preset mismatch');
        }
        setValue('scenarioZoneOccupancyThreshold', '3');
        setValue('scenarioZoneOccupancyMinDwellMs', '7000');
        setValue('scenarioCooldownMs', '11000');
        if ($('scenarioZoneOccupancyRow').hidden ||
            !$('scenarioDwellTimingRow').hidden ||
            !$('scenarioLoiteringRow').hidden ||
            !$('scenarioWrongDirectionRow').hidden ||
            $('scenarioZoneIdsLabel').hidden) {
          throw new Error('zone-occupancy scenario panel visibility mismatch');
        }
        const occupancyPayload = window.ruleJson();
        if (occupancyPayload.ruleKind !== 'scenario' ||
            occupancyPayload.event?.type !== 'zone-occupancy' ||
            occupancyPayload.scenario?.type !== 'zone-occupancy') {
          throw new Error('zone-occupancy payload type mismatch: ' + JSON.stringify(occupancyPayload));
        }
        if (occupancyPayload.scenario?.occupancyThreshold !== 3 ||
            occupancyPayload.scenario?.minDwellTimeMs !== 7000 ||
            occupancyPayload.scenario?.cooldownMs !== 11000 ||
            Object.prototype.hasOwnProperty.call(occupancyPayload.scenario || {}, 'candidateTimeMs')) {
          throw new Error('zone-occupancy timing payload mismatch: ' + JSON.stringify(occupancyPayload.scenario));
        }
        expectList('zone-occupancy target zones', occupancyPayload.scenario?.targetZoneIds || [], ['queue-zone']);
        if (!$('scenarioSummaryText').textContent.includes('zone-occupancy scenario event') ||
            !$('scenarioReadinessTiming').textContent.includes('occupancy 3') ||
            !$('scenarioReadinessEmit').textContent.includes('zone-occupancy')) {
          throw new Error('zone-occupancy summary/readiness mismatch');
        }
        const occupancyPhaseText = $('scenarioPhaseStrip').textContent;
        for (const expected of ['Idle', 'Counting', 'DwellQualified', 'ThresholdReached', 'Confirmed', 'Cooldown', 'Ended']) {
          if (!occupancyPhaseText.includes(expected)) {
            throw new Error('zone-occupancy phase preview missing: ' + expected);
          }
        }
        const occupancyPreview = JSON.parse($('eventPayloadPreview').value);
        if (occupancyPreview.rule?.type !== 'zone-occupancy' ||
            occupancyPreview.region?.type !== 'polygon' ||
            occupancyPreview.scenario?.occupancyThreshold !== 3 ||
            occupancyPreview.scenario?.minDwellTimeMs !== 7000) {
          throw new Error('zone-occupancy event payload preview mismatch: ' + JSON.stringify(occupancyPreview));
        }
        const occupancyInvalid = JSON.parse(JSON.stringify(occupancyPayload));
        occupancyInvalid.scenario.occupancyThreshold = 0;
        const occupancyWarning = ruleApi.validateRulePayload(occupancyInvalid);
        if (!occupancyWarning.includes('점유 임계값')) {
          throw new Error('zone-occupancy validation mismatch: ' + occupancyWarning);
        }
        setValue('scenarioType', 'wrong-direction');
        setValue('scenarioLineDirection', 'reverse');
        setValue('scenarioCooldownMs', '6000');
        if ($('scenarioWrongDirectionRow').hidden ||
            !$('scenarioDwellTimingRow').hidden ||
            !$('scenarioZoneIdsLabel').hidden) {
          throw new Error('wrong-direction scenario panel visibility mismatch');
        }
        if (Array.from($('scenarioLineDirection').options).some((option) => option.value === 'any')) {
          throw new Error('wrong-direction direction select must not expose any');
        }
        const wrongDirectionPayload = window.ruleJson();
        if (wrongDirectionPayload.ruleKind !== 'scenario' ||
            wrongDirectionPayload.event?.type !== 'wrong-direction' ||
            wrongDirectionPayload.scenario?.type !== 'wrong-direction') {
          throw new Error('wrong-direction payload type mismatch: ' + JSON.stringify(wrongDirectionPayload));
        }
        if (wrongDirectionPayload.event?.region?.type !== 'line' ||
            wrongDirectionPayload.event?.region?.direction !== 'reverse' ||
            !Array.isArray(wrongDirectionPayload.event?.region?.points) ||
            wrongDirectionPayload.event.region.points.length !== 2) {
          throw new Error('wrong-direction line payload mismatch: ' + JSON.stringify(wrongDirectionPayload.event?.region));
        }
        if (wrongDirectionPayload.scenario?.cooldownMs !== 6000 ||
            Object.prototype.hasOwnProperty.call(wrongDirectionPayload.scenario || {}, 'candidateTimeMs') ||
            Object.prototype.hasOwnProperty.call(wrongDirectionPayload.scenario || {}, 'dwellTimeMs')) {
          throw new Error('wrong-direction scenario timing payload mismatch: ' + JSON.stringify(wrongDirectionPayload.scenario));
        }
        if (!String(wrongDirectionPayload.scenario?.lifecycle?.duplicateKey || '').includes('line/track')) {
          throw new Error('wrong-direction duplicate key mismatch: ' + JSON.stringify(wrongDirectionPayload.scenario?.lifecycle));
        }
        if (!$('scenarioSummaryText').textContent.includes('허용 방향') ||
            !$('scenarioSummaryText').textContent.includes('wrong-direction scenario event') ||
            !$('scenarioReadinessZone').textContent.includes('line 2/2') ||
            !$('scenarioReadinessTiming').textContent.includes('same track/line') ||
            !$('scenarioReadinessEmit').textContent.includes('line-crossing과 별도')) {
          throw new Error('wrong-direction summary/readiness mismatch');
        }
        const phaseText = $('scenarioPhaseStrip').textContent;
        for (const expected of ['Idle', 'LineCrossed', 'Confirmed', 'Cooldown', 'Ended']) {
          if (!phaseText.includes(expected)) {
            throw new Error('wrong-direction phase preview missing: ' + expected);
          }
        }
        const eventPreview = JSON.parse($('eventPayloadPreview').value);
        if (eventPreview.rule?.type !== 'wrong-direction' ||
            eventPreview.region?.type !== 'line' ||
            eventPreview.region?.direction !== 'reverse' ||
            eventPreview.scenario?.cooldownMs !== 6000) {
          throw new Error('wrong-direction event payload preview mismatch: ' + JSON.stringify(eventPreview));
        }
        const wrongDirectionInvalid = JSON.parse(JSON.stringify(wrongDirectionPayload));
        wrongDirectionInvalid.event.region.direction = 'any';
        const wrongDirectionWarning = ruleApi.validateRulePayload(wrongDirectionInvalid);
        if (!wrongDirectionWarning.includes('forward 또는 reverse')) {
          throw new Error('wrong-direction direction validation mismatch: ' + wrongDirectionWarning);
        }
        setValue('scenarioType', 'intrusion-dwell');
        setValue('scenarioCooldownMs', '5000');
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
        const savedReEntryRuleId = smokeId + '-re-entry-rule';
        const savedAfterLineRuleId = smokeId + '-after-line-rule';
        const savedLoiteringRuleId = smokeId + '-loitering-rule';
        const savedZoneOccupancyRuleId = smokeId + '-zone-occupancy-rule';
        let savedVaRuleId = '';
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
          setValue('ruleEventType', 'line-crossing');
          setValue('ruleLineDirection', 'any');
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

          setValue('ruleId', savedReEntryRuleId);
          setValue('scenarioType', 're-entry');
          setValue('scenarioReEntryWindowMs', '11000');
          setValue('scenarioCooldownMs', '3000');
          setValue('scenarioZoneIds', 'lobby');
          setValue('scenarioReEntryMode', 'specified-zone');
          setValue('scenarioReEntryZoneIds', 'lobby');
          click('selectCoreClassesBtn');
          await ruleApi.saveRule();
          const savedReEntryRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedReEntryRuleId));
          if (savedReEntryRule.rule?.ruleKind !== 'scenario' ||
              savedReEntryRule.rule?.event?.type !== 're-entry' ||
              savedReEntryRule.rule?.scenario?.type !== 're-entry') {
            throw new Error('saved re-entry rule type mismatch: ' + JSON.stringify(savedReEntryRule.rule));
          }
          if (savedReEntryRule.rule?.scenario?.reEntryWindowMs !== 11000 ||
              savedReEntryRule.rule?.scenario?.cooldownMs !== 3000 ||
              savedReEntryRule.rule?.scenario?.reEntryMode !== 'specified-zone') {
            throw new Error('saved re-entry timing/mode mismatch: ' + JSON.stringify(savedReEntryRule.rule?.scenario));
          }
          expectList('saved re-entry target zones', savedReEntryRule.rule?.scenario?.targetZoneIds || [], ['lobby']);
          expectList('saved re-entry zones', savedReEntryRule.rule?.scenario?.reEntryZoneIds || [], ['lobby']);

          setValue('ruleId', savedAfterLineRuleId);
          setValue('scenarioType', 'intrusion-after-line-crossing');
          setValue('scenarioZoneIds', 'secure-zone');
          setValue('scenarioAfterLineId', 'entry-line');
          setValue('scenarioAfterLineDirection', 'forward');
          setValue('scenarioAfterLineX1', '0.25');
          setValue('scenarioAfterLineY1', '0.20');
          setValue('scenarioAfterLineX2', '0.25');
          setValue('scenarioAfterLineY2', '0.80');
          setValue('scenarioAfterLineTimeoutMs', '13000');
          setValue('scenarioAfterLineDwellMs', '4000');
          setValue('scenarioCooldownMs', '6000');
          click('selectCoreClassesBtn');
          await ruleApi.saveRule();
          const savedAfterLineRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedAfterLineRuleId));
          if (savedAfterLineRule.rule?.ruleKind !== 'scenario' ||
              savedAfterLineRule.rule?.event?.type !== 'intrusion-after-line-crossing' ||
              savedAfterLineRule.rule?.scenario?.type !== 'intrusion-after-line-crossing') {
            throw new Error('saved intrusion-after-line-crossing rule type mismatch: ' + JSON.stringify(savedAfterLineRule.rule));
          }
          if (savedAfterLineRule.rule?.scenario?.maxDelayAfterCrossingMs !== 13000 ||
              savedAfterLineRule.rule?.scenario?.dwellTimeMs !== 4000 ||
              savedAfterLineRule.rule?.scenario?.cooldownMs !== 6000 ||
              savedAfterLineRule.rule?.scenario?.triggerLine?.id !== 'entry-line' ||
              savedAfterLineRule.rule?.scenario?.triggerLine?.direction !== 'forward') {
            throw new Error('saved intrusion-after-line-crossing timing/line mismatch: ' + JSON.stringify(savedAfterLineRule.rule?.scenario));
          }
          expectList('saved intrusion-after-line-crossing target lines', savedAfterLineRule.rule?.scenario?.targetLineIds || [], ['entry-line']);
          expectList('saved intrusion-after-line-crossing target zones', savedAfterLineRule.rule?.scenario?.targetZoneIds || [], ['secure-zone']);

          setValue('ruleId', savedLoiteringRuleId);
          setValue('scenarioType', 'loitering');
          setValue('scenarioZoneIds', 'platform-zone');
          setValue('scenarioDwellMs', '45000');
          setValue('scenarioLoiteringRadius', '0.09');
          setValue('scenarioLoiteringMinPoints', '8');
          setValue('scenarioCooldownMs', '10000');
          $('scenarioLoiteringUseGroundPlane').checked = false;
          $('scenarioLoiteringUseGroundPlane').dispatchEvent(new Event('change', { bubbles: true }));
          click('selectCoreClassesBtn');
          await ruleApi.saveRule();
          const savedLoiteringRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedLoiteringRuleId));
          if (savedLoiteringRule.rule?.ruleKind !== 'scenario' ||
              savedLoiteringRule.rule?.event?.type !== 'loitering' ||
              savedLoiteringRule.rule?.scenario?.type !== 'loitering') {
            throw new Error('saved loitering rule type mismatch: ' + JSON.stringify(savedLoiteringRule.rule));
          }
          if (savedLoiteringRule.rule?.scenario?.minDwellTimeMs !== 45000 ||
              savedLoiteringRule.rule?.scenario?.maxMovementRadius !== 0.09 ||
              savedLoiteringRule.rule?.scenario?.minTrajectoryPoints !== 8 ||
              savedLoiteringRule.rule?.scenario?.cooldownMs !== 10000) {
            throw new Error('saved loitering timing/radius mismatch: ' + JSON.stringify(savedLoiteringRule.rule?.scenario));
          }
          expectList('saved loitering target zones', savedLoiteringRule.rule?.scenario?.targetZoneIds || [], ['platform-zone']);

          setValue('ruleId', savedZoneOccupancyRuleId);
          setValue('scenarioType', 'zone-occupancy');
          setValue('scenarioZoneIds', 'queue-zone');
          setValue('scenarioZoneOccupancyPreset', 'elevator-hall');
          await ruleApi.saveRule();
          const savedZoneOccupancyRule = await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedZoneOccupancyRuleId));
          if (savedZoneOccupancyRule.rule?.ruleKind !== 'scenario' ||
              savedZoneOccupancyRule.rule?.event?.type !== 'zone-occupancy' ||
              savedZoneOccupancyRule.rule?.scenario?.type !== 'zone-occupancy') {
            throw new Error('saved zone-occupancy rule type mismatch: ' + JSON.stringify(savedZoneOccupancyRule.rule));
          }
          if (savedZoneOccupancyRule.rule?.scenario?.occupancyThreshold !== 5 ||
              savedZoneOccupancyRule.rule?.scenario?.minDwellTimeMs !== 8000 ||
              savedZoneOccupancyRule.rule?.scenario?.cooldownMs !== 12000) {
            throw new Error('saved zone-occupancy timing mismatch: ' + JSON.stringify(savedZoneOccupancyRule.rule?.scenario));
          }
          expectList('saved zone-occupancy target zones', savedZoneOccupancyRule.rule?.scenario?.targetZoneIds || [], ['queue-zone']);

          if (!$('vaRuleEditorPanel').hidden) {
            click('cancelVaRuleEditBtn');
          }
          click('addVaRuleBtn');
          if (!$('vaRuleIdDisplay').textContent.includes('자동 지정')) {
            throw new Error('new vaRule must show automatic id assignment');
          }
          setValue('vaRuleName', 'smoke 영상 분석 설정');
          setValue('vaRuleSourceKind', 'file');
          setValue('vaRuleFileSelect', $('previewFileSelect').value || 'sample_h264.mp4');
          scenarioRadio.click();
          setValue('scenarioType', 'intrusion-dwell');
          setValue('scenarioCandidateMs', '2000');
          setValue('scenarioDwellMs', '10000');
          setValue('scenarioCooldownMs', '5000');
          setValue('scenarioZoneIds', 'smoke-zone');
          click('selectCoreClassesBtn');
          const vaRulePayload = ruleApi.vaRuleJson();
          if (vaRulePayload.id ||
              vaRulePayload.match?.vaRule ||
              vaRulePayload.source?.kind !== 'file' ||
              !vaRulePayload.source?.file) {
            throw new Error('vaRule payload mismatch: ' + JSON.stringify(vaRulePayload));
          }
          const savedVaRuleResponse = await ruleApi.saveVaRule();
          savedVaRuleId = String(savedVaRuleResponse?.vaRule?.id || '');
          if (!/^[1-9][0-9]{0,3}$/.test(savedVaRuleId)) {
            throw new Error('auto vaRule id must be numeric 1..9999: ' + savedVaRuleId);
          }
          if (!$('vaRuleEditorPanel').hidden) {
            throw new Error('vaRule editor must close after save');
          }
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
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedZoneOccupancyRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedLoiteringRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedAfterLineRuleId), { method: 'DELETE' }).catch(() => {});
          await apiJson('/lab/analysis/rules/' + encodeURIComponent(savedReEntryRuleId), { method: 'DELETE' }).catch(() => {});
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
            reEntryRuleId: savedReEntryRuleId,
            afterLineRuleId: savedAfterLineRuleId,
            loiteringRuleId: savedLoiteringRuleId,
            zoneOccupancyRuleId: savedZoneOccupancyRuleId,
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
