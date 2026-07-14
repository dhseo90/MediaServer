// 파일 용도: /ops/sources 채널 관리 JavaScript controller를 조립한다.
#include "ingress/product_ui_page_scripts.h"

#include <sstream>
#include <string>

namespace ingress {

void AppendOpsSourcesPageScript(std::ostringstream& out, const std::string& stream_route_json, int rtsp_port) {
    out << R"OPSSOURCES(  <script>
    const statusEl = document.querySelector('#status');
    const onboardingQualityStatus = document.querySelector('#source-onboarding-quality-status');
    const onboardingQualityList = document.querySelector('#source-onboarding-quality-list');
    const reliabilityTimelineStatus = document.querySelector('#source-reliability-timeline-status');
    const reliabilityTimelineList = document.querySelector('#source-reliability-timeline-list');
    const sourceReliabilitySearchStatus = document.querySelector('#source-reliability-search-status');
    const sourceReliabilitySearchFilterList = document.querySelector('#source-reliability-search-filter-list');
    const sourceReliabilitySavedViewList = document.querySelector('#source-reliability-saved-view-list');
    const sourceReliabilitySearchResultList = document.querySelector('#source-reliability-search-result-list');
    const sourceBackupHandoffStatus = document.querySelector('#source-backup-handoff-status');
    const sourceBackupHandoffInputList = document.querySelector('#source-backup-handoff-input-list');
    const sourceRecoveryValidationPlanList = document.querySelector('#source-recovery-validation-plan-list');
    const sourceStagingRestoreValidationStatus = document.querySelector('#sourceStagingRestoreValidationStatus');
    const sourceStagingRestoreChecklistList = document.querySelector('#source-staging-restore-checklist-list');
    const sourceStagingRestoreResultArtifactList = document.querySelector('#source-staging-restore-result-artifact-list');
    const sourceContinuityDrillStatus = document.querySelector('#source-continuity-drill-status');
    const sourceContinuityDrillPackageList = document.querySelector('#source-continuity-drill-package-list');
    const sourceContinuityDrillValidationList = document.querySelector('#source-continuity-drill-validation-list');
    const sourceContinuityDrillDriftList = document.querySelector('#source-continuity-drill-drift-list');
    const sourceRecoveryChecklistStatus = document.querySelector('#source-recovery-checklist-status');
    const sourceRecoveryChecklistList = document.querySelector('#source-recovery-checklist-list');
    const sourceDrillEvidenceManifestStatus = document.querySelector('#source-drill-evidence-manifest-status');
    const sourceDrillEvidenceArtifactList = document.querySelector('#source-drill-evidence-artifact-list');
    const sourceDrillEvidenceCleanupList = document.querySelector('#source-drill-evidence-cleanup-list');
    const sourceDrillEvidenceScanList = document.querySelector('#source-drill-evidence-scan-list');
    const sourceFieldBridgeGateStatus = document.querySelector('#source-field-bridge-gate-status');
    const sourceFieldBridgeGateList = document.querySelector('#source-field-bridge-gate-list');
    const sourceFieldBridgeBoundaryList = document.querySelector('#source-field-bridge-boundary-list');
    const channelBody = document.querySelector('#channels-body');
    const channelForm = document.querySelector('#channel-form');
    const channelPanel = document.querySelector('#channel-detail-panel');
    const channelValidation = document.querySelector('#channel-validation');
    const channelMode = document.querySelector('#channel-editor-mode');
    const channelIdBadge = document.querySelector('#channel-editor-id');
    const channelTitle = document.querySelector('#channel-editor-title');
    const channelHelp = document.querySelector('#channel-editor-help');
    const saveButton = document.querySelector('#channel-save-selected');
    const editSelectedButton = document.querySelector('#channel-edit-selected');
    const closeChannelButton = document.querySelector('#channel-close');
    const onvifProbeDraftInput = document.querySelector('#onvifProbeDraftInput');
    const onvifProbeProfileSelect = document.querySelector('#onvifProbeProfileSelect');
    const onvifProbeDraftApplyButton = document.querySelector('#onvifProbeDraftApply');
    const onvifProbeDraftClearButton = document.querySelector('#onvifProbeDraftClear');
    const onvifProbeDraftStatus = document.querySelector('#onvifProbeDraftStatus');
    const onvifCredentialGateStatus = document.querySelector('#onvifCredentialGateStatus');
    const onvifPersistDecisionStatus = document.querySelector('#onvifPersistDecisionStatus');
    const streamRoute = ")OPSSOURCES" << stream_route_json << R"OPSSOURCES(";
    const rtspPort = )OPSSOURCES" << rtsp_port << R"OPSSOURCES(;
    let loadedSources = [];
    let loadedViews = [];
    let currentChannelId = '';
    let editorMode = 'view';
    let currentChannelEnabled = true;
    let initializedHashChannel = false;
    let pendingChannelDangerAction = '';
    let opsPrincipal = null;
    const {
      escapeHtml,
      requestJson,
      formDataObject,
      setFeedback,
      showToast,
      setTableEmpty,
      tableCellHtml,
      opsRowActionsHtml,
      opsContextActionsHtml,
      opsTableRowHtml,
      setOpsDetailPanelOpen,
      setSelectOptions,
      recordOpsAudit,
      renderOpsAuditTrail
    } = window.MediaServerUi;
    const hashParams = () => new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const setStatus = (message, failed = false) => {
      setFeedback(statusEl, message, failed, { collapseEmpty: true });
    };
    function confirmChannelDangerAction(key, message) {
      if (pendingChannelDangerAction !== key) {
        pendingChannelDangerAction = key;
        setStatus(`${message} 다시 누르면 실행합니다.`);
        return false;
      }
      pendingChannelDangerAction = '';
      return true;
    }
    const setChannelValidation = message => {
      setFeedback(channelValidation, message, Boolean(message));
    };
    const setOnvifProbeDraftStatus = (message, failed = false) => {
      setFeedback(onvifProbeDraftStatus, message, failed, { collapseEmpty: true });
    };
    function renderOnvifCredentialGate(gate = null) {
      const provider = String(gate?.primaryStoreProvider || 'none').trim() || 'none';
      const decision = String(gate?.primaryStoreDecision || 'defer-product-persistent-store').trim() ||
        'defer-product-persistent-store';
      const referenceStatus = String(gate?.credentialReferenceStatus || 'reference-absent').trim() ||
        'reference-absent';
      setFeedback(
        onvifCredentialGateStatus,
        `primaryStoreProvider: ${provider} / ${decision} / ${referenceStatus}`,
        false,
        { collapseEmpty: false }
      );
    }
    function renderOnvifCredentialProviderStatus(payload = null) {
      const readiness = payload?.providerReadiness || {};
      const decision = payload?.decision || {};
      const redaction = payload?.redactionSummary || {};
      const primarySelection = String(decision.primarySelection || readiness.primaryProvider || 'none');
      const fallbackSelection = String(decision.fallbackSelection || readiness.fallbackProvider || 'in-memory-fixture');
      const status = String(payload?.status || 'sanitizedCredentialProviderStatusSummary');
      const referenceValueExposed = redaction.referenceValueExposed === true || redaction.credentialReferenceValueIncluded === true;
      const credentialMaterialExposed = redaction.credentialMaterialExposed === true;
      setFeedback(
        onvifCredentialGateStatus,
        `providerReadiness: ${status} / primarySelection=${primarySelection} / fallback=${fallbackSelection} / persistent store deferred / referenceValueExposed=${referenceValueExposed ? 'true' : 'false'} / credentialMaterialExposed=${credentialMaterialExposed ? 'true' : 'false'}`,
        referenceValueExposed || credentialMaterialExposed,
        { collapseEmpty: false }
      );
    }
    async function loadOnvifCredentialProviderStatus() {
      try {
        const payload = await requestJson('/ops/api/onvif/credential-provider-status');
        renderOnvifCredentialProviderStatus(payload);
      } catch (error) {
        setFeedback(
          onvifCredentialGateStatus,
          `providerReadiness 불러오기 실패: ${error.message}`,
          true,
          { collapseEmpty: false }
        );
      }
    }
    function renderOnvifLiveImportPersistDecision(payload = null) {
      const defaultOnvifPersistDecisionLabel =
        'manual-form-save-handoff / importDraftNotSaved=true / oneShotPersist=false / sourceWriteRequired=true';
      const decision = payload?.decision || {};
      const boundaries = payload?.boundaries || {};
      const scopeAndAudit = payload?.scopeAndAudit || {};
      const selectedMode = String(decision.selectedMode || defaultOnvifPersistDecisionLabel.split(' / ')[0]);
      const oneShotPersist = decision.oneShotPersistEnabled === true || boundaries.oneShotPersistEnabled === true;
      const importDraftNotSaved = decision.importDraftNotSavedPreserved !== false &&
        boundaries.importDraftEndpointNotSaved !== false;
      const sourceWriteRequired = scopeAndAudit.sourceWriteRequiredForManualSave !== false &&
        boundaries.sourceWriteRequiredForManualSave !== false;
      const pairedSaveRoute = String(decision.manualPairedSaveRoute || '/ops/api/onvif/channels/{channelId}');
      const rollbackModel = String(scopeAndAudit.rollbackModel || payload?.rollbackModel?.writeFailureRollback || 'server restores replaced source/view files on paired save failure');
      setFeedback(
        onvifPersistDecisionStatus,
        `persistDecision: ${selectedMode} / importDraftNotSaved=${importDraftNotSaved ? 'true' : 'false'} / oneShotPersist=${oneShotPersist ? 'true' : 'false'} / sourceWriteRequired=${sourceWriteRequired ? 'true' : 'false'} / pairedSave=${pairedSaveRoute} / rollback=${rollbackModel}`,
        oneShotPersist || !importDraftNotSaved,
        { collapseEmpty: false }
      );
    }
    async function loadOnvifLiveImportPersistDecision() {
      try {
        const payload = await requestJson('/ops/api/onvif/live-import-persist-decision');
        renderOnvifLiveImportPersistDecision(payload);
      } catch (error) {
        setFeedback(
          onvifPersistDecisionStatus,
          `persistDecision 불러오기 실패: ${error.message}`,
          true,
          { collapseEmpty: false }
        );
      }
    }
    const opsPrincipalScopes = () => Array.isArray(opsPrincipal?.scopes) ? opsPrincipal.scopes.map(item => String(item || '')) : [];
    const opsPrincipalHasScope = scope => opsPrincipal?.role === 'admin' || opsPrincipalScopes().includes('*') || opsPrincipalScopes().includes(scope);
    const canWriteSources = () => opsPrincipalHasScope('source:write');
    const sourceWriteDisabledAttr = () => canWriteSources() ? '' : ' disabled aria-disabled="true" data-scope-blocked="source:write"';
    async function ensureOpsPrincipalLoaded() {
      if (opsPrincipal) return;
      opsPrincipal = await requestJson('/auth/whoami').catch(() => null);
      applySourceWriteAccessUi();
    }
    function applySourceWriteAccessUi() {
      const writable = canWriteSources();
      const policy = document.getElementById('channelScopePolicy');
      if (policy) {
        policy.textContent = writable
          ? 'source:write scope 확인됨. 채널 생성/수정/삭제를 수행할 수 있습니다.'
          : '읽기 전용 범위입니다. ops:read로 채널 조회만 가능하며 source:write가 필요한 생성/수정/삭제 UI는 잠깁니다.';
        policy.dataset.scopeState = writable ? 'source-write-allowed' : 'source-write-blocked';
      }
      const addButton = document.getElementById('add-channel');
      if (addButton) {
        addButton.disabled = !writable;
        addButton.setAttribute('aria-disabled', writable ? 'false' : 'true');
        addButton.dataset.scopeBlocked = writable ? '' : 'source:write';
      }
      if (editorMode !== 'view') {
        setFormDisabled(!writable);
      } else {
        setFormDisabled(true);
      }
    }
    const hasSourceTag = (source, tag) => Array.isArray(source?.tags) &&
      source.tags.map(item => String(item || '').toLowerCase()).includes(String(tag || '').toLowerCase());
    const isOnvifSource = source => hasSourceTag(source, 'onvif');
    const onvifStreamUriForSource = source => source?.rtspUrl || source?.httpUrl || source?.whepUrl || source?.url || '';
    const kindLabel = (kind, source = null) => ({
      file: '파일',
      onvif: 'ONVIF 카메라',
      rtsp: isOnvifSource(source) ? 'ONVIF 카메라' : 'RTSP pull',
      whep: '외부 WHEP pull',
      webrtc: 'Published WebRTC 소스',
      http: 'HTTP/HLS pull'
    })[kind] || kind || '미제공';
    const locatorForSource = source => {
      if (source.webrtcSourceId) return `발행 sourceId: ${source.webrtcSourceId}`;
      if (isOnvifSource(source)) return `ONVIF 스트림 URI: ${onvifStreamUriForSource(source) || '미제공'}`;
      if (source.whepUrl) return `외부 WHEP URL: ${source.whepUrl}`;
      return source.file || source.rtspUrl || source.httpUrl || '미제공';
    };
    const sourceLocationParts = source => [
      source?.site,
      source?.group || source?.ownerGroup,
      source?.floor,
      source?.zone
    ].map(item => String(item || '').trim()).filter(Boolean);
    const sourceLocationLabel = source => sourceLocationParts(source).join(' / ');
    const streamTransportLabel = type => ({
      rtsp: 'RTSP',
      whep: 'WHEP'
    })[type] || type;
    const streamModeLabel = mode => mode === 'va' ? 'VA' : '라이브';
    const streamCopyLabel = (type, mode, source = null) =>
      `${isOnvifSource(source) ? 'ONVIF ' : ''}${streamTransportLabel(type)} ${streamModeLabel(mode)}`;
    function sourceStreamParams(source) {
      if (!source || !source.sourceId) return null;
      const params = new URLSearchParams();
      if (source.file) {
        params.set('file', source.file);
        return params;
      }
      if (source.rtspUrl) {
        params.set('source', 'rtsp');
        params.set('url', source.rtspUrl);
        return params;
      }
      if (source.whepUrl) {
        params.set('source', 'whep');
        params.set('url', source.whepUrl);
        return params;
      }
      if (source.httpUrl) {
        params.set('source', source.kind === 'hls' ? 'hls' : 'http');
        params.set('url', source.httpUrl);
        return params;
      }
      return null;
    }
    function rtspHostForBrowser() {
      let host = window.location.hostname || '127.0.0.1';
      if (host === 'localhost') host = '127.0.0.1';
      return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
    }
    function channelStreamParams(source, view, mode) {
      const params = sourceStreamParams(source);
      if (!params) return null;
      if (mode === 'va') {
        params.set('va', '1');
        params.set('drawLabels', '1');
        params.set('trackIds', '1');
      }
      return params;
    }
    function streamUrlForChannel(channelId, type, mode) {
      const source = findSource(channelId);
      const view = findView(channelId);
      const params = channelStreamParams(source, view, mode || 'raw');
      if (!params) return '';
      if (type === 'rtsp') {
        return `rtsp://${rtspHostForBrowser()}:${rtspPort}/${encodeURIComponent(streamRoute)}?${params.toString()}`;
      }
      if (type === 'whep') {
        const url = new URL('/whep', window.location.origin);
        url.search = params.toString();
        return url.toString();
      }
      return '';
    }
    function streamButtonsForChannel(source, mode) {
      if (!sourceStreamParams(source)) {
        return '<span class="hint">미지원</span>';
      }
      const id = escapeHtml(source.sourceId || '');
      const label = mode === 'va' ? 'VA URL' : '라이브 URL';
      const isOnvif = isOnvifSource(source);
      const sourcePrefix = isOnvif ? 'ONVIF ' : '';
      const rtspButtonText = isOnvif ? 'ONVIF RTSP' : 'RTSP';
      const whepButtonText = isOnvif ? 'ONVIF WHEP' : 'WHEP';
      const copyMode = mode === 'va' ? 'va' : 'raw';
      return opsRowActionsHtml(`
          <button type="button" class="secondary" data-copy-stream-type="rtsp" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${sourcePrefix}${label} RTSP 복사" aria-label="${sourcePrefix}${label} RTSP 복사">${rtspButtonText}</button>
          <button type="button" class="secondary" data-copy-stream-type="whep" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${sourcePrefix}${label} WHEP 복사" aria-label="${sourcePrefix}${label} WHEP 복사">${whepButtonText}</button>
        `, 'ops-stream-actions channel-stream-actions');
    }
    async function copyTextToClipboard(value) {
      const text = String(value || '');
      if (!text) throw new Error('empty clipboard value');
      const copyByEvent = () => {
        let copied = false;
        const handler = (event) => {
          if (!event.clipboardData) return;
          event.clipboardData.setData('text/plain', text);
          event.preventDefault();
          copied = true;
        };
        document.addEventListener('copy', handler, true);
        try {
          return document.execCommand('copy') && copied;
        } finally {
          document.removeEventListener('copy', handler, true);
        }
      };
      const copyByTextarea = () => {
        const activeElement = document.activeElement;
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.position = 'fixed';
        textarea.style.top = '10px';
        textarea.style.left = '10px';
        textarea.style.width = 'min(90vw, 680px)';
        textarea.style.height = '36px';
        textarea.style.opacity = '1';
        textarea.style.zIndex = '2147483647';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        try {
          try {
            textarea.focus({ preventScroll: true });
          } catch (_) {
            textarea.focus();
          }
          textarea.select();
          textarea.setSelectionRange(0, textarea.value.length);
          return document.execCommand('copy');
        } finally {
          textarea.remove();
          if (activeElement && typeof activeElement.focus === 'function') {
            try {
              activeElement.focus({ preventScroll: true });
            } catch (_) {
              activeElement.focus();
            }
          }
        }
      };
      try {
        window.focus();
      } catch (_) {}
      if (copyByEvent()) return;
      if (copyByTextarea()) return;
      let clipboardError = null;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (error) {
          clipboardError = error;
        }
      }
      throw clipboardError || new Error('clipboard copy failed');
    }
    async function copyChannelStreamUrl(channelId, type, mode, button) {
      const source = findSource(channelId);
      const url = streamUrlForChannel(channelId, type, mode || 'raw');
      if (!url) {
        setStatus(`채널 #${channelId}의 ${streamCopyLabel(type, mode, source)} URL을 만들 수 없습니다.`, true);
        return;
      }
      try {
        await copyTextToClipboard(url);
        setStatus('');
        showToast(`${streamCopyLabel(type, mode, source)} URL 복사 완료`);
      } catch (error) {
        setStatus('브라우저가 HTTP LAN 페이지의 자동 복사를 막았습니다. localhost 또는 HTTPS에서 복사하세요.', true);
      }
    }
    function openClientLiveForChannel(channelId) {
      const view = findChannelView(channelId);
      const viewId = String(view?.viewId || view?.sourceId || channelId || '').trim();
      if (!viewId) {
        setStatus(`채널 #${channelId}에 연결된 PublishedView가 없습니다.`, true);
        return;
      }
      window.location.href = `/client/live#view=${encodeURIComponent(viewId)}`;
    }
    const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(text)}</span>`;
    const findSource = id => loadedSources.find(source => source.sourceId === id) || null;
    function findView(id) {
      const exact = loadedViews.find(view => view.viewId === id) || null;
      if (exact) return exact;
      return loadedViews.find(view => view.sourceId === id) || null;
    }
    function findChannelView(id) {
      const exact = loadedViews.find(view => view.viewId === id && view.sourceId === id) || null;
      if (exact) return exact;
      return loadedViews.find(view => view.sourceId === id) || null;
    }
    const isNumericChannelId = value => /^[1-9]\d*$/.test(String(value || '').trim());
    function nextChannelId(except = '') {
      const used = new Set(channelRows(loadedSources, loadedViews)
        .map(row => String(row.id || ''))
        .filter(id => isNumericChannelId(id) && id !== String(except || '')));
      const maxId = Array.from(used).reduce((max, id) => Math.max(max, Number(id)), 0);
      let next = maxId + 1;
      while (used.has(String(next))) next += 1;
      return String(next);
    }
    function channelRows(sources, views) {
      const rows = sources.map(source => ({
        id: source.sourceId,
        source,
        view: views.find(view => view.viewId === source.sourceId && view.sourceId === source.sourceId) ||
          views.find(view => view.sourceId === source.sourceId) ||
          null
      }));
      rows.sort((a, b) => {
        const aId = String(a.id || '');
        const bId = String(b.id || '');
        if (isNumericChannelId(aId) && isNumericChannelId(bId)) return Number(aId) - Number(bId);
        return aId.localeCompare(bId);
      });
      return rows;
    }
    function setMetricText(id, value) {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value ?? '-');
    }
    function onboardingIssueText(issue) {
      const code = String(issue?.code || '').trim();
      const message = String(issue?.message || '').trim();
      return message || code || 'validation issue';
    }
    function renderOnboardingQualitySummary(payload = {}) {
      const summary = payload.onboardingQualitySummary || {};
      const items = Array.isArray(payload.sourceOnboardingQuality) ? payload.sourceOnboardingQuality : [];
      setMetricText('sourceOnboardingReadyCount', summary.readySources ?? 0);
      setMetricText('sourceOnboardingWarningCount', summary.warningSources ?? 0);
      setMetricText('sourceOnboardingBlockedCount', summary.blockedSources ?? 0);
      setMetricText('sourceOnboardingDuplicateCount', summary.duplicateCanonicalSourceKeys ?? 0);
      setMetricText('sourceOnboardingMissingViewCount', summary.missingPublishedViewCount ?? 0);
      const total = Number(summary.sourceCount || items.length || 0);
      const blocked = Number(summary.blockedSources || 0);
      const warning = Number(summary.warningSources || 0);
      if (onboardingQualityStatus) {
        onboardingQualityStatus.textContent = `${total}개 source / ready ${summary.readySources ?? 0} / warning ${warning} / blocked ${blocked}`;
      }
      if (!onboardingQualityList) return;
      const visibleItems = items.filter(item => item?.readinessStatus !== 'ready').slice(0, 6);
      if (visibleItems.length === 0) {
        onboardingQualityList.innerHTML = '<div class="empty"><strong>ready</strong><span>저장 전 validation 이슈가 없습니다.</span></div>';
        return;
      }
      onboardingQualityList.innerHTML = visibleItems.map(item => {
        const issues = Array.isArray(item.validationIssues) ? item.validationIssues : [];
        const issueText = issues.map(onboardingIssueText).join(' / ') || 'review required';
        const inputQuality = item.inputQuality || {};
        const tone = item.readinessStatus === 'blocked' ? 'bad' : 'warn';
        return `<div class="validation-item" data-source-onboarding-quality="${escapeHtml(item.readinessStatus || 'warning')}">
          <span class="chip ${tone}">${escapeHtml(item.readinessStatus || 'warning')}</span>
          <strong>${escapeHtml(item.displayName || item.sourceId || '-')}</strong>
          <span>${escapeHtml(item.sourceKind || '-')} / ${escapeHtml(inputQuality.kind || '-')} / ${escapeHtml(inputQuality.locatorScheme || '-')}</span>
          <small>${escapeHtml(issueText)}</small>
        </div>`;
      }).join('');
    }
    function reliabilityTimelineTone(status, warningCount = 0) {
      if (status === 'live' && Number(warningCount || 0) === 0) return 'info';
      if (status === 'offline') return 'bad';
      return 'warn';
    }
    function renderReliabilityTimelineHealthHistory(payload = {}) {
      const summary = payload.reliabilityTimelineSummary || {};
      const items = Array.isArray(payload.reliabilityTimeline) ? payload.reliabilityTimeline : [];
      setMetricText('sourceReliabilityLiveCount', summary.live ?? 0);
      setMetricText('sourceReliabilityStaleCount', summary.stale ?? 0);
      setMetricText('sourceReliabilityOfflineCount', summary.offline ?? 0);
      setMetricText('sourceReliabilityWarningCount', summary.warningSources ?? 0);
      setMetricText('sourceReliabilityTransitionCount', summary.statusTransitionCount ?? 0);
      const total = Number(summary.sourceCount || items.length || 0);
      const stale = Number(summary.stale || 0);
      const offline = Number(summary.offline || 0);
      const warnings = Number(summary.warningSources || 0);
      if (reliabilityTimelineStatus) {
        reliabilityTimelineStatus.textContent = `${total}개 source / live ${summary.live ?? 0} / stale ${stale} / offline ${offline} / warning ${warnings}`;
      }
      if (!reliabilityTimelineList) return;
      const visibleItems = items
        .filter(item => item?.currentHealthStatus !== 'live' || Number(item?.sourceWarningCount || 0) > 0 || Number(item?.statusTransitionCount || 0) > 0)
        .slice(0, 8);
      if (visibleItems.length === 0) {
        reliabilityTimelineList.innerHTML = '<div class="empty"><strong>live</strong><span>표시할 source health 변화 이력이 없습니다.</span></div>';
        return;
      }
      reliabilityTimelineList.innerHTML = visibleItems.map(item => {
        const history = Array.isArray(item.healthHistory) ? item.healthHistory : [];
        const latest = history[0] || {};
        const warningsText = Array.isArray(item.warnings) && item.warnings.length > 0
          ? item.warnings.join(' / ')
          : 'warning 없음';
        const tone = reliabilityTimelineTone(item.currentHealthStatus, item.sourceWarningCount);
        return `<article class="source-reliability-timeline-item" data-source-reliability-timeline="${escapeHtml(item.currentHealthStatus || 'unknown')}">
          <div class="source-reliability-timeline-head">
            <span class="chip ${tone}">${escapeHtml(item.currentHealthStatus || 'unknown')}</span>
            <strong>${escapeHtml(item.displayName || item.sourceId || '-')}</strong>
            <a class="button button-secondary button-compact" href="${escapeHtml(item.auditRoute || '/ops/sources#auditArea=channels&auditPreset=source-health-state-change')}">Audit</a>
          </div>
          <p>${escapeHtml(item.currentHealthReason || 'not-checked')} · ${escapeHtml(item.sourceKind || '-')} · reconnect ${escapeHtml(item.reconnectCount ?? 0)}</p>
          <small>history ${escapeHtml(item.statusTransitionCount ?? 0)} · warnings ${escapeHtml(warningsText)} · latest ${escapeHtml(latest.summary || 'current health')}</small>
        </article>`;
      }).join('');
    }
    function renderSourceReliabilitySearchMetrics(payload = {}) {
      const summary = payload.sourceReliabilitySearchMetricsSummary || {};
      const filters = Array.isArray(payload.sourceHealthFilters) ? payload.sourceHealthFilters : [];
      const savedViews = Array.isArray(payload.savedReliabilityViews) ? payload.savedReliabilityViews : [];
      const results = Array.isArray(payload.sourceReliabilitySearchResults) ? payload.sourceReliabilitySearchResults : [];
      const reconnectMetricSummary = payload.reconnectMetricSummary || {};
      const staleMetricSummary = payload.staleMetricSummary || {};
      const offlineMetricSummary = payload.offlineMetricSummary || {};
      const boundaries = payload.boundaries || {};
      setMetricText('sourceReliabilityMatchedMetricCount', summary.matchedSourceCount ?? 0);
      setMetricText('sourceReliabilityReconnectMetricCount', reconnectMetricSummary.sources ?? summary.reconnectSources ?? 0);
      setMetricText('sourceReliabilityStaleMetricCount', staleMetricSummary.sources ?? summary.stale ?? 0);
      setMetricText('sourceReliabilityOfflineMetricCount', offlineMetricSummary.sources ?? summary.offline ?? 0);
      setMetricText('sourceReliabilitySavedViewCount', savedViews.length || summary.savedViewCount || 0);
      if (sourceReliabilitySearchStatus) {
        sourceReliabilitySearchStatus.textContent =
          `${summary.sourceCount ?? results.length ?? 0}개 source / matched ${summary.matchedSourceCount ?? 0} / reconnect ${reconnectMetricSummary.sources ?? 0} / stale ${staleMetricSummary.sources ?? 0} / offline ${offlineMetricSummary.sources ?? 0}`;
      }
      if (sourceReliabilitySearchFilterList) {
        sourceReliabilitySearchFilterList.innerHTML = filters.map(filter => (
          `<span class="source-reliability-search-card" data-source-reliability-filter="${escapeHtml(filter.key || 'all')}">
            <strong>${escapeHtml(filter.label || filter.key || 'filter')}</strong>
            <span>${escapeHtml(filter.matchedSourceCount ?? 0)} sources</span>
          </span>`
        )).join('') || '<span class="empty">filter 없음</span>';
      }
      if (sourceReliabilitySavedViewList) {
        sourceReliabilitySavedViewList.innerHTML = savedViews.map(view => (
          `<a class="source-reliability-search-card" href="${escapeHtml(view.route || '/ops/sources')}" data-source-reliability-saved-view="${escapeHtml(view.key || 'view')}">
            <strong>${escapeHtml(view.label || view.key || 'saved view')}</strong>
            <span>${escapeHtml(view.description || 'read-only preset')} · ${escapeHtml(view.matchedSourceCount ?? 0)} matches</span>
          </a>`
        )).join('') || '<span class="empty">saved view preset 없음</span>';
      }
      if (!sourceReliabilitySearchResultList) return;
      const visibleItems = results
        .filter(item => item?.healthStatus !== 'live' || Number(item?.sourceWarningCount || 0) > 0 || Number(item?.reconnectCount || 0) > 0)
        .slice(0, 8);
      if (visibleItems.length === 0) {
        sourceReliabilitySearchResultList.innerHTML = '<div class="empty"><strong>live</strong><span>현재 검색 결과에 재확인 대상이 없습니다.</span></div>';
        return;
      }
      sourceReliabilitySearchResultList.innerHTML = visibleItems.map(item => {
        const warningsText = Array.isArray(item.warnings) && item.warnings.length > 0
          ? item.warnings.join(' / ')
          : 'warning 없음';
        const tone = reliabilityTimelineTone(item.healthStatus, item.sourceWarningCount);
        return `<article class="source-reliability-search-result" data-source-reliability-metric="${escapeHtml(item.filterKey || 'needs-attention')}">
          <div class="source-reliability-timeline-head">
            <span class="chip ${tone}">${escapeHtml(item.healthStatus || 'unknown')}</span>
            <strong>${escapeHtml(item.displayName || item.sourceId || '-')}</strong>
            <a class="button button-secondary button-compact" href="${escapeHtml(item.auditRoute || '/ops/sources#auditArea=channels&auditPreset=source-health-state-change')}">Audit</a>
          </div>
          <p>${escapeHtml(item.healthReason || 'not-checked')} · ${escapeHtml(item.sourceKind || '-')} · reconnect ${escapeHtml(item.reconnectCount ?? 0)} · score ${escapeHtml(item.attentionScore ?? 0)}</p>
          <small>transitions ${escapeHtml(item.statusTransitionCount ?? 0)} · warnings ${escapeHtml(warningsText)}</small>
        </article>`;
      }).join('') + `<div class="source-reliability-search-boundary" data-source-reliability-metric="boundary">
        <span>savedViewsPersisted: ${escapeHtml(boundaries.savedViewsPersisted === true ? 'true' : 'false')}</span>
        <span>savedViewWritePerformed: ${escapeHtml(boundaries.savedViewWritePerformed === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function renderBackupRecoverySourceHandoff(payload = {}) {
      const summary = payload.backupRecoverySourceHandoffSummary || {};
      const sourceHealthSnapshotSummary = payload.sourceHealthSnapshotSummary || {};
      const inputs = Array.isArray(payload.sourceHandoffInputs) ? payload.sourceHandoffInputs : [];
      const recoveryValidationPlan = Array.isArray(payload.recoveryValidationPlan) ? payload.recoveryValidationPlan : [];
      const boundaries = payload.boundaries || {};
      setMetricText('sourceBackupHandoffInputCount', inputs.length);
      setMetricText('sourceBackupHandoffRecoveryPlanCount', summary.recoveryValidationPlanCount ?? recoveryValidationPlan.length);
      setMetricText('sourceBackupHandoffStaleCount', sourceHealthSnapshotSummary.stale ?? summary.staleSourceCount ?? 0);
      setMetricText('sourceBackupHandoffOfflineCount', sourceHealthSnapshotSummary.offline ?? summary.offlineSourceCount ?? 0);
      setMetricText('sourceBackupHandoffValidationReadyCount', summary.validationReadyCount ?? 0);
      if (sourceBackupHandoffStatus) {
        sourceBackupHandoffStatus.textContent =
          `${summary.sourceCount ?? 0}개 source / PublishedView ${summary.publishedViewCount ?? 0} / validation ready ${summary.validationReadyCount ?? 0}`;
      }
      if (sourceBackupHandoffInputList) {
        sourceBackupHandoffInputList.innerHTML = inputs.map(input => (
          `<a class="source-backup-handoff-card" href="${escapeHtml(input.route || '/ops/sources')}" data-source-backup-handoff-input="${escapeHtml(input.key || 'input')}">
            <strong>${escapeHtml(input.label || input.key || 'handoff input')}</strong>
            <span>${escapeHtml(input.validationStatus || 'unknown')} · ${escapeHtml(input.validationSummary || 'restore input')}</span>
            <small>${escapeHtml(input.source || 'source')} · affected ${escapeHtml(input.affectedSourceCount ?? 0)}</small>
          </a>`
        )).join('') || '<span class="empty">handoff input 없음</span>';
      }
      if (!sourceRecoveryValidationPlanList) return;
      sourceRecoveryValidationPlanList.innerHTML = recoveryValidationPlan.map(item => (
        `<a class="source-backup-handoff-card" href="${escapeHtml(item.route || '/ops/sources')}" data-source-recovery-validation-plan="${escapeHtml(item.key || 'validation')}">
          <strong>${escapeHtml(item.label || item.key || 'validation')}</strong>
          <span>${escapeHtml(item.status || 'unknown')}</span>
          <small>${escapeHtml(item.summary || 'restore validation')}</small>
        </a>`
      )).join('') + `<div class="source-backup-handoff-boundary" data-source-recovery-validation-plan="boundary">
        <span>sourceHealthSnapshotPersisted: ${escapeHtml(boundaries.sourceHealthSnapshotPersisted === true ? 'true' : 'false')}</span>
        <span>recoveryValidationPlanPersisted: ${escapeHtml(boundaries.recoveryValidationPlanPersisted === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function renderStagingRestoreValidationHandoff(payload = {}) {
      const checklist = Array.isArray(payload.stagingRestoreValidationChecklist) ? payload.stagingRestoreValidationChecklist : [];
      const artifact = payload.resultArtifactContract || {};
      const boundaries = payload.boundaries || {};
      if (sourceStagingRestoreValidationStatus) {
        sourceStagingRestoreValidationStatus.textContent =
          `${payload.selectedMode || 'staging-restore-validation-checklist-result-handoff'} / checklist ${checklist.length} / resultArtifactPersistedByRoute=${boundaries.resultArtifactPersistedByRoute === true ? 'true' : 'false'} / productionRestorePerformed=${boundaries.productionRestorePerformed === true ? 'true' : 'false'} / automaticRecoveryPerformed=${boundaries.automaticRecoveryPerformed === true ? 'true' : 'false'}`;
      }
      if (sourceStagingRestoreChecklistList) {
        sourceStagingRestoreChecklistList.innerHTML = checklist.map(item => (
          `<article class="source-backup-handoff-card" data-source-staging-restore-checklist="${escapeHtml(item.key || 'check')}">
            <strong>${escapeHtml(item.label || item.key || 'staging restore check')}</strong>
            <span>${escapeHtml(item.status || 'operator-required')} · ${escapeHtml(item.source || 'handoff source')}</span>
            <small>${escapeHtml((item.requiredEvidence || []).join(' / ') || 'evidence required')}</small>
          </article>`
        )).join('') || '<span class="empty">staging restore checklist 없음</span>';
      }
      if (sourceStagingRestoreResultArtifactList) {
        const fields = Array.isArray(artifact.requiredFields) ? artifact.requiredFields : [];
        sourceStagingRestoreResultArtifactList.innerHTML = `<article class="source-backup-handoff-card" data-source-staging-restore-result-artifact="${escapeHtml(artifact.schema || 'result-artifact')}">
          <strong>${escapeHtml(artifact.schema || 'media-server.ops.v390-staging-restore-validation-result.v1')}</strong>
          <span>${escapeHtml(artifact.artifactStatus || 'operator-supplied-after-staging-run')} · ${escapeHtml(artifact.storageScope || 'change-ticket-only')}</span>
          <small>${escapeHtml(fields.join(' / ') || 'required fields')}</small>
        </article><div class="source-backup-handoff-boundary" data-source-staging-restore-result-artifact="boundary">
          <span>resultArtifactPersistedByRoute: ${escapeHtml(boundaries.resultArtifactPersistedByRoute === true ? 'true' : 'false')}</span>
          <span>productionRestorePerformed: ${escapeHtml(boundaries.productionRestorePerformed === true ? 'true' : 'false')}</span>
          <span>automaticRecoveryPerformed: ${escapeHtml(boundaries.automaticRecoveryPerformed === true ? 'true' : 'false')}</span>
        </div>`;
      }
    }
    function renderOpsContinuityDrillWorkspace(contractPayload = {}, packagePayload = {}, driftPayload = {}) {
      const packageSummary = packagePayload.recoveryCandidatePackageSummary || {};
      const candidates = Array.isArray(packagePayload.recoveryCandidates) ? packagePayload.recoveryCandidates : [];
      const contractInputs = Array.isArray(contractPayload.v330HandoffInputs) ? contractPayload.v330HandoffInputs : [];
      const driftSummary = driftPayload.sourceHealthReplayDriftDiffSummary || {};
      const driftItems = Array.isArray(driftPayload.sourceHealthReplayDriftItems) ? driftPayload.sourceHealthReplayDriftItems : [];
      const packageBoundaries = packagePayload.boundaries || {};
      const validationReady = contractInputs.filter(item => item?.key || item?.label).length;
      const drillPackageReady = candidates.filter(item => item?.recoveryReadiness === 'ready').length;
      const blockedSources = candidates.filter(item => item?.recoveryReadiness === 'blocked').length + Number(driftSummary.blockedCount || 0);
      const driftChanged = Number(driftSummary.changedSourceCount || 0);
      setMetricText('source-continuity-drill-package-count', packageSummary.candidateCount ?? candidates.length);
      setMetricText('source-continuity-drill-validation-ready-count', validationReady);
      setMetricText('source-continuity-drill-blocked-count', blockedSources);
      setMetricText('source-continuity-drill-drift-count', driftChanged);
      if (sourceContinuityDrillStatus) {
        sourceContinuityDrillStatus.textContent =
          `${packageSummary.candidateCount ?? candidates.length} drill package sources / ready ${drillPackageReady} / blocked ${blockedSources} / drift ${driftChanged}`;
      }
      if (sourceContinuityDrillPackageList) {
        sourceContinuityDrillPackageList.innerHTML = candidates.slice(0, 8).map(item => (
          `<article class="source-continuity-drill-card" data-source-continuity-drill-package="${escapeHtml(item.recoveryReadiness || 'unknown')}">
            <strong>${escapeHtml(item.displayName || item.sourceId || 'source')}</strong>
            <span>${escapeHtml(item.recoveryReadiness || 'unknown')} · ${escapeHtml(item.sourceHealth?.status || 'unknown')}</span>
            <small>${escapeHtml(Array.isArray(item.readinessReasons) ? item.readinessReasons.join(' / ') : 'read-only package')}</small>
          </article>`
        )).join('') || '<span class="empty">drill package source 없음</span>';
      }
      if (sourceContinuityDrillValidationList) {
        sourceContinuityDrillValidationList.innerHTML = contractInputs.map(input => (
          `<a class="source-continuity-drill-card" href="${escapeHtml(input.route || '/ops/sources')}" data-source-continuity-drill-validation="${escapeHtml(input.key || 'validation')}">
            <strong>${escapeHtml(input.label || input.key || 'validation')}</strong>
            <span>${escapeHtml(input.boundary || 'read-only/no-write')}</span>
            <small>${escapeHtml(input.requiredFor || 'validation status')}</small>
          </a>`
        )).join('') || '<span class="empty">validation input 없음</span>';
      }
      if (!sourceContinuityDrillDriftList) return;
      sourceContinuityDrillDriftList.innerHTML = driftItems.slice(0, 8).map(item => (
        `<article class="source-continuity-drill-card" data-source-continuity-drill-drift="${escapeHtml(item.driftStatus || 'stable')}">
          <strong>${escapeHtml(item.sourceId || 'source')}</strong>
          <span>${escapeHtml(item.handoffStatus || 'unknown')} → ${escapeHtml(item.freshStatus || 'unknown')}</span>
          <small>stale ${escapeHtml(item.staleDelta ?? 0)} · offline ${escapeHtml(item.offlineDelta ?? 0)} · reconnect ${escapeHtml(item.reconnectDelta ?? 0)} · warning ${escapeHtml(item.warningDelta ?? 0)}</small>
        </article>`
      )).join('') + `<div class="source-continuity-drill-boundary" data-source-continuity-drill-drift="boundary">
        <span>automaticRecoveryPerformed: ${escapeHtml(packageBoundaries.automaticRecoveryPerformed === true ? 'true' : 'false')}</span>
        <span>sourceRegistryWritePerformed: ${escapeHtml(packageBoundaries.sourceRegistryWritePerformed === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function renderApprovalGatedRecoveryChecklistAudit(payload = {}) {
      const summary = payload.approvalGatedRecoveryChecklistSummary || {};
      const items = Array.isArray(payload.approvalGatedRecoveryChecklistItems) ? payload.approvalGatedRecoveryChecklistItems : [];
      const boundaries = payload.boundaries || {};
      setMetricText('source-recovery-checklist-ready-count', summary.readyCount ?? 0);
      setMetricText('source-recovery-checklist-blocked-count', summary.blockedCount ?? 0);
      setMetricText('source-recovery-checklist-field-smoke-needed-count', summary.fieldSmokeNeededCount ?? 0);
      setMetricText('source-recovery-checklist-not-run-count', summary.notRunCount ?? 0);
      if (sourceRecoveryChecklistStatus) {
        sourceRecoveryChecklistStatus.textContent =
          `${summary.itemCount ?? items.length} checklist items / ready ${summary.readyCount ?? 0} / blocked ${summary.blockedCount ?? 0} / field-smoke-needed ${summary.fieldSmokeNeededCount ?? 0} / not-run ${summary.notRunCount ?? 0}`;
      }
      if (!sourceRecoveryChecklistList) return;
      const cards = items.slice(0, 10).map(item => {
        const opsAuditLinkage = item.opsAuditLinkage || {};
        return `<article class="source-recovery-checklist-card" data-source-recovery-checklist-item="${escapeHtml(item.sourceId || 'source')}" data-source-recovery-checklist-status="${escapeHtml(item.readinessStatus || 'not-run')}">
          <div>
            <strong>${escapeHtml(item.displayName || item.sourceId || 'source')}</strong>
            <span>${escapeHtml(item.readinessStatus || 'not-run')} · ${escapeHtml(item.sourceKind || 'unknown')}</span>
          </div>
          <p>${escapeHtml(item.operatorNote || 'operator note required before manual recovery')}</p>
          <small>${escapeHtml(item.dryRunResult || 'dry-run result not-run')}</small>
          <a class="button button-secondary button-compact" href="${escapeHtml(opsAuditLinkage.auditRoute || '/ops/sources#auditArea=channels')}">Audit</a>
        </article>`;
      }).join('') || '<span class="empty">approval-gated recovery checklist 없음</span>';
      sourceRecoveryChecklistList.innerHTML = cards + `<div class="source-recovery-checklist-boundary" data-source-recovery-checklist-status="boundary">
        <span>automaticRecoveryPerformed: ${escapeHtml(boundaries.automaticRecoveryPerformed === true ? 'true' : 'false')}</span>
        <span>sourceRegistryWritePerformed: ${escapeHtml(boundaries.sourceRegistryWritePerformed === true ? 'true' : 'false')}</span>
        <span>opsAuditWritePerformed: ${escapeHtml(boundaries.opsAuditWritePerformed === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function renderDrillEvidenceExportCleanupManifest(payload = {}) {
      const summary = payload.drillEvidenceExportCleanupSummary || {};
      const artifactManifest = payload.redactedDrillArtifactManifest || {};
      const artifacts = Array.isArray(artifactManifest.artifactItems) ? artifactManifest.artifactItems : [];
      const cleanupManifest = payload.tmpCleanupManifest || {};
      const cleanupCandidates = Array.isArray(cleanupManifest.cleanupCandidates) ? cleanupManifest.cleanupCandidates : [];
      const scanBoundary = payload.sensitiveMaterialScanBoundary || {};
      const scanPatterns = Array.isArray(scanBoundary.scanPatterns) ? scanBoundary.scanPatterns : [];
      const boundaries = payload.boundaries || {};
      setMetricText('source-drill-evidence-retained-count', summary.retainedEvidenceCount ?? artifacts.length);
      setMetricText('source-drill-evidence-artifact-count', summary.artifactCount ?? artifacts.length);
      setMetricText('source-drill-evidence-cleanup-count', summary.cleanupCandidateCount ?? cleanupCandidates.length);
      setMetricText('source-drill-evidence-scan-count', summary.sensitiveScanPatternCount ?? scanPatterns.length);
      if (sourceDrillEvidenceManifestStatus) {
        sourceDrillEvidenceManifestStatus.textContent =
          `${summary.retainedEvidenceCount ?? artifacts.length} retained evidence / cleanup ${summary.cleanupCandidateCount ?? cleanupCandidates.length} / scan ${summary.sensitiveScanPatternCount ?? scanPatterns.length}`;
      }
      if (sourceDrillEvidenceArtifactList) {
        sourceDrillEvidenceArtifactList.innerHTML = artifacts.slice(0, 8).map(item => (
          `<article class="source-drill-evidence-manifest-card" data-source-drill-evidence-artifact="${escapeHtml(item.artifactKey || 'artifact')}">
            <strong>${escapeHtml(item.label || item.artifactKey || 'artifact')}</strong>
            <span>${escapeHtml(item.retained === true ? 'retained' : 'not-retained')} · ${escapeHtml(item.route || '/ops/sources')}</span>
            <small>${escapeHtml(item.retentionReason || 'minimum retained evidence')}</small>
          </article>`
        )).join('') || '<span class="empty">retained drill evidence 없음</span>';
      }
      if (sourceDrillEvidenceCleanupList) {
        sourceDrillEvidenceCleanupList.innerHTML = cleanupCandidates.slice(0, 8).map(item => (
          `<article class="source-drill-evidence-manifest-card" data-source-drill-evidence-cleanup="${escapeHtml(item.cleanupKey || 'cleanup')}">
            <strong>${escapeHtml(item.label || item.cleanupKey || 'cleanup')}</strong>
            <span>${escapeHtml(item.status || 'not-run')} · ${escapeHtml(item.scope || '/tmp')}</span>
            <small>${escapeHtml(item.reason || 'cleanup recorded; not executed')}</small>
          </article>`
        )).join('') || '<span class="empty">cleanup candidate 없음</span>';
      }
      if (!sourceDrillEvidenceScanList) return;
      sourceDrillEvidenceScanList.innerHTML = scanPatterns.slice(0, 8).map(pattern => (
        `<article class="source-drill-evidence-manifest-card" data-source-drill-evidence-scan="${escapeHtml(pattern || 'pattern')}">
          <strong>${escapeHtml(pattern || 'sensitive material')}</strong>
          <span>excluded from redacted manifest</span>
          <small>viewer/client/API raw material 비노출 경계</small>
        </article>`
      )).join('') + `<div class="source-drill-evidence-manifest-boundary" data-source-drill-evidence-cleanup="boundary">
        <span>artifactExportExecuted: ${escapeHtml(boundaries.artifactExportExecuted === true ? 'true' : 'false')}</span>
        <span>cleanupExecutionPerformed: ${escapeHtml(boundaries.cleanupExecutionPerformed === true ? 'true' : 'false')}</span>
        <span>temporaryCleanupExecuted: ${escapeHtml(boundaries.temporaryCleanupExecuted === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function renderFieldBridgeConditionGates(payload = {}) {
      const summary = payload.fieldBridgeConditionGateSummary || {};
      const gates = Array.isArray(payload.fieldBridgeConditionGates) ? payload.fieldBridgeConditionGates : [];
      const sourceOnlyPassPolicy = payload.sourceOnlyPassPolicy || {};
      const conditions = Array.isArray(payload.fieldSmokeConditions) ? payload.fieldSmokeConditions : [];
      const boundaries = payload.boundaries || {};
      setMetricText('source-field-bridge-gate-count', summary.gateCount ?? gates.length);
      setMetricText('source-field-bridge-field-smoke-count', summary.fieldSmokeNeededCount ?? gates.length);
      setMetricText('source-field-bridge-blocked-count', summary.blockedCount ?? gates.length);
      setMetricText('source-field-bridge-approval-count', summary.approvalRequiredCount ?? gates.length);
      if (sourceFieldBridgeGateStatus) {
        sourceFieldBridgeGateStatus.textContent =
          `${summary.gateCount ?? gates.length} gates / field-smoke-needed ${summary.fieldSmokeNeededCount ?? gates.length} / source-only PASS accepted ${sourceOnlyPassPolicy.sourceOnlyPassAccepted === true ? 'true' : 'false'}`;
      }
      if (sourceFieldBridgeGateList) {
        sourceFieldBridgeGateList.innerHTML = gates.slice(0, 8).map(gate => (
          `<article class="source-field-bridge-gate-card" data-source-field-bridge-gate="${escapeHtml(gate.gateKey || 'gate')}">
            <strong>${escapeHtml(gate.label || gate.gateKey || 'field bridge')}</strong>
            <span>${escapeHtml(gate.fieldSmokeStatus || 'field-smoke-needed')} · ${escapeHtml(gate.executionStatus || 'not-run')} · ${escapeHtml(gate.bridgeKind || 'bridge')}</span>
            <small>${escapeHtml(gate.conditionSummary || 'endpoint, credential, and operator approval required')}</small>
            <div class="source-field-bridge-gate-boundary">
              <span>endpointRequired: ${escapeHtml(gate.endpointRequired === true ? 'true' : 'false')}</span>
              <span>credentialRequired: ${escapeHtml(gate.credentialRequired === true ? 'true' : 'false')}</span>
              <span>operatorApprovalRequired: ${escapeHtml(gate.operatorApprovalRequired === true ? 'true' : 'false')}</span>
            </div>
          </article>`
        )).join('') || '<span class="empty">field bridge condition gate 없음</span>';
      }
      if (!sourceFieldBridgeBoundaryList) return;
      sourceFieldBridgeBoundaryList.innerHTML = `<article class="source-field-bridge-gate-card" data-source-field-bridge-boundary="source-only-pass">
        <strong>source-only PASS boundary</strong>
        <span>sourceOnlyPassAccepted: ${escapeHtml(sourceOnlyPassPolicy.sourceOnlyPassAccepted === true ? 'true' : 'false')}</span>
        <small>local/source-only PASS는 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider field smoke PASS로 승격하지 않습니다.</small>
      </article>` + conditions.slice(0, 8).map(condition => (
        `<article class="source-field-bridge-gate-card" data-source-field-bridge-condition="${escapeHtml(condition || 'condition')}">
          <strong>${escapeHtml(condition || 'field smoke condition')}</strong>
          <span>required before release PASS</span>
          <small>fieldSmokeExecuted: ${escapeHtml(boundaries.fieldSmokeExecuted === true ? 'true' : 'false')}</small>
        </article>`
      )).join('') + `<div class="source-field-bridge-gate-boundary" data-source-field-bridge-boundary="execution">
        <span>endpointProbePerformed: ${escapeHtml(boundaries.endpointProbePerformed === true ? 'true' : 'false')}</span>
        <span>credentialProbePerformed: ${escapeHtml(boundaries.credentialProbePerformed === true ? 'true' : 'false')}</span>
        <span>vlmProviderCalled: ${escapeHtml(boundaries.vlmProviderCalled === true ? 'true' : 'false')}</span>
      </div>`;
    }
    function setFormDisabled(disabled) {
      const writable = canWriteSources();
      for (const element of Array.from(channelForm.elements)) {
        element.disabled = disabled || !writable;
      }
      saveButton.hidden = disabled || !writable;
      editSelectedButton.hidden = !writable || !disabled || !currentChannelId;
    }
    function setGeneratedChannelId(value) {
      const normalized = String(value || '').trim();
      channelForm.elements.channelId.value = normalized;
      const display = document.querySelector('#channel-id-display');
      if (display) {
        display.textContent = normalized || '자동 배정';
        display.dataset.empty = normalized ? 'false' : 'true';
      }
      channelIdBadge.textContent = normalized || '-';
    }
    function updateKindFields() {
      const kind = channelForm.elements.kind.value || 'file';
      document.querySelectorAll('[data-source-kind]').forEach(field => {
        const kinds = String(field.dataset.sourceKind || '').split(/\s+/).filter(Boolean);
        field.hidden = !kinds.includes(kind);
      });
    }
    function syncEditorChrome(mode, id) {
      editorMode = mode;
      currentChannelId = id || '';
      const isView = mode === 'view';
      const isClone = mode === 'clone';
      const isNew = mode === 'new' || isClone;
      channelMode.textContent = isClone ? '복제' : (isNew ? '새 채널' : (isView ? '상세' : '수정 중'));
      const visibleId = channelForm.elements.channelId.value || id || currentChannelId;
      setGeneratedChannelId(visibleId);
      channelIdBadge.textContent = visibleId || '-';
      channelTitle.textContent = isNew
        ? (isClone ? '채널 복제' : '채널 추가')
        : `채널 ${channelForm.elements.channelId.value || id}`;
      channelHelp.textContent = isView
        ? '저장된 내용입니다.'
        : (isClone ? '복제본은 기본 비활성 상태로 저장됩니다.' : '값을 바꾼 뒤 저장합니다.');
      editSelectedButton.textContent = '수정';
      closeChannelButton.textContent = '닫기';
      saveButton.textContent = '저장';
      setFormDisabled(isView);
    }
    function renderChannels(sources, views) {
      const rows = channelRows(sources, views);
      if (rows.length === 0) {
        setTableEmpty(channelBody, 8, '등록된 채널이 없습니다. 채널 추가로 첫 카메라/소스를 등록하세요.');
        return;
      }
      channelBody.innerHTML = rows.map(row => {
        const source = row.source || {};
        const view = row.view || {};
        const enabled = source.enabled !== false && view.enabled !== false;
        const liveButtons = source.sourceId ? streamButtonsForChannel(source, 'raw') : '<span class="hint">소스 미등록</span>';
        const vaButtons = source.sourceId ? streamButtonsForChannel(source, 'va') : '<span class="hint">소스 미등록</span>';
        const channelName = view.displayName || source.displayName || '';
        const locationText = sourceLocationLabel(source);
        const inputText = source.sourceId ? locatorForSource(source) : '소스 미등록';
        const idCellHtml = `<div class="channel-id-cell">
          <span class="table-identity-pill table-identity-id">${escapeHtml(row.id || '-')}</span>
        </div>`;
        const kindCellHtml = `<div class="channel-kind-cell">
          <strong>${escapeHtml(kindLabel(source.kind, source))}</strong>
        </div>`;
        const writeDisabled = sourceWriteDisabledAttr();
        const statusCellHtml = opsRowActionsHtml(`
          ${enabled ? chip('활성') : chip('비활성', 'warn')}
          <button type="button" class="secondary" data-toggle-channel="${escapeHtml(row.id || '')}"${writeDisabled}>${enabled ? '비활성화' : '적용'}</button>
        `, 'ops-status-actions channel-status-actions');
        const inputCellHtml = `<div class="channel-input-stack">
          <span class="token">${escapeHtml(inputText)}</span>
          ${source.sourceId ? '' : '<span class="channel-source-note">PublishedView 연결 전</span>'}
        </div>`;
        const actionsCellHtml = opsContextActionsHtml(
          `<button type="button" class="secondary" data-view-channel="${escapeHtml(row.id || '')}">상세</button>`,
          `<button type="button" class="secondary" data-clone-channel="${escapeHtml(row.id || '')}"${writeDisabled}>복제</button>
          <button type="button" class="secondary" data-open-client-live="${escapeHtml(row.id || '')}" ${view?.enabled === false ? 'disabled' : ''}>라이브 보기</button>
          <button type="button" class="danger" data-delete-channel="${escapeHtml(row.id || '')}"${writeDisabled}>삭제</button>`,
          'channel-row-actions',
          '추가 작업'
        );
        return opsTableRowHtml([
          tableCellHtml('ID', idCellHtml),
          tableCellHtml('이름', `<div class="channel-name-stack"><strong>${escapeHtml(channelName)}</strong>${locationText ? `<span>${escapeHtml(locationText)}</span>` : ''}</div>`),
          tableCellHtml('종류', kindCellHtml),
          tableCellHtml('상태', statusCellHtml, 'table-cell-status'),
          tableCellHtml('입력', inputCellHtml),
          tableCellHtml('라이브 URL', liveButtons),
          tableCellHtml('VA URL', vaButtons),
          tableCellHtml('작업', actionsCellHtml, 'table-cell-actions')
        ]);
      }).join('');
      bindChannelRowActions();
    }
    function bindChannelRowActions() {
      document.querySelectorAll('[data-view-channel]').forEach(button => {
        button.addEventListener('click', () => openChannel(button.dataset.viewChannel || '', 'view'));
      });
      document.querySelectorAll('[data-clone-channel]').forEach(button => {
        button.addEventListener('click', () => {
          if (!canWriteSources()) return setStatus('source:write scope가 필요합니다.', true);
          openChannel(button.dataset.cloneChannel || '', 'clone');
        });
      });
      document.querySelectorAll('[data-toggle-channel]').forEach(button => {
        button.addEventListener('click', () => {
          if (!canWriteSources()) return setStatus('source:write scope가 필요합니다.', true);
          toggleChannelEnabled(button.dataset.toggleChannel || '');
        });
      });
      document.querySelectorAll('[data-copy-stream-channel]').forEach(button => {
        button.addEventListener('click', () => copyChannelStreamUrl(
          button.dataset.copyStreamChannel || '',
          button.dataset.copyStreamType || '',
          button.dataset.copyStreamMode || 'raw',
          button
        ));
      });
      document.querySelectorAll('[data-open-client-live]').forEach(button => {
        button.addEventListener('click', () => openClientLiveForChannel(button.dataset.openClientLive || ''));
      });
      document.querySelectorAll('[data-delete-channel]').forEach(button => {
        button.addEventListener('click', () => {
          if (!canWriteSources()) return setStatus('source:write scope가 필요합니다.', true);
          deleteChannel(button.dataset.deleteChannel || '');
        });
      });
    }
    function sourceUsesFile(file, exceptSourceId = '') {
      const normalized = String(file || '').trim();
      if (!normalized) return false;
      const except = String(exceptSourceId || '').trim();
      return loadedSources.some(source => (
        String(source?.sourceId || '') !== except &&
        String(source?.kind || 'file') === 'file' &&
        String(source?.file || '').trim() === normalized
      ));
    }
    function preferredUnusedFile(files, preferred = '', exceptSourceId = '') {
      const preferredValue = String(preferred || '').trim();
      if (preferredValue && files.includes(preferredValue) && !sourceUsesFile(preferredValue, exceptSourceId)) {
        return preferredValue;
      }
      return files.find(file => !sourceUsesFile(file, exceptSourceId)) || preferredValue || files[0] || '';
    }
    async function loadFileOptions(selected = '', options = {}) {
      const select = channelForm.elements.file;
      try {
        const payload = await requestJson('/lab/files');
        const files = Array.isArray(payload.files) ? payload.files : [];
        if (files.length === 0) return;
        const previous = selected || select.value || payload.defaultFile || files[0];
        setSelectOptions(select, files);
        select.value = preferredUnusedFile(files, previous, options.exceptSourceId || '');
      } catch (error) {
        setStatus(`파일 목록 로드 실패: ${error.message}`, true);
      }
    }
    function sourcePayloadFromRecord(source, enabled) {
      const payload = {
        sourceId: source.sourceId,
        displayName: source.displayName || source.sourceId,
        kind: source.kind || 'file',
        enabled,
        tags: Array.isArray(source.tags) ? source.tags : [],
        ownerGroup: source.ownerGroup || '',
        site: source.site || '',
        group: source.group || '',
        floor: source.floor || '',
        zone: source.zone || ''
      };
      if (source.file) payload.file = source.file;
      if (source.rtspUrl) payload.rtspUrl = source.rtspUrl;
      if (source.webrtcSourceId) payload.webrtcSourceId = source.webrtcSourceId;
      if (source.whepUrl) payload.whepUrl = source.whepUrl;
      if (source.httpUrl) payload.httpUrl = source.httpUrl;
      return payload;
    }
    function viewPayloadFromRecord(view, source, enabled) {
      const id = view.viewId || source.sourceId;
      return {
        viewId: id,
        displayName: view.displayName || source.displayName || id,
        sourceId: view.sourceId || source.sourceId,
        defaultRuleId: view.defaultRuleId || '',
        allowedRuleIds: Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds : [],
        allowedOverlayModes: Array.isArray(view.allowedOverlayModes) && view.allowedOverlayModes.length > 0 ? view.allowedOverlayModes : ['raw', 'va-overlay', 'va-rule'],
        showDashboard: view.showDashboard !== false,
        showEvents: view.showEvents !== false,
        showMetadataSummary: view.showMetadataSummary !== false,
        clientGroups: Array.isArray(view.clientGroups) ? view.clientGroups : [],
        maxTiles: Number(view.maxTiles || 1),
        enabled
      };
    }
    async function resetChannelForm(mode = 'new') {
      await ensureOpsPrincipalLoaded();
      if (!canWriteSources()) {
        setStatus('source:write scope가 필요합니다.', true);
        return;
      }
      channelForm.reset();
      setGeneratedChannelId(nextChannelId());
      currentChannelEnabled = true;
      setChannelValidation('');
      updateKindFields();
      loadFileOptions();
      setOpsDetailPanelOpen(channelPanel, true);
      syncEditorChrome(mode, '');
      setOpsDetailPanelOpen(channelPanel, true, { scroll: true });
      channelForm.elements.displayName.focus();
    }
    function fillChannel(id, mode = 'view') {
      const source = findSource(id) || {};
      const view = findChannelView(id) || {};
      const isClone = mode === 'clone';
      setGeneratedChannelId(isClone ? nextChannelId(id) : id);
      channelForm.elements.displayName.value = view.displayName || source.displayName || '';
      channelForm.elements.kind.value = isOnvifSource(source) ? 'onvif' : (source.kind || 'file');
      loadFileOptions(source.file || '', { exceptSourceId: isClone ? '' : id });
      channelForm.elements.onvifStreamUrl.value = onvifStreamUriForSource(source);
      channelForm.elements.rtspUrl.value = source.rtspUrl || '';
      channelForm.elements.webrtcSourceId.value = source.webrtcSourceId || '';
      channelForm.elements.whepUrl.value = source.whepUrl || '';
      channelForm.elements.httpUrl.value = source.httpUrl || '';
      channelForm.elements.site.value = source.site || '';
      channelForm.elements.group.value = source.group || source.ownerGroup || '';
      channelForm.elements.floor.value = source.floor || '';
      channelForm.elements.zone.value = source.zone || '';
      channelForm.elements.allowedRuleIds.value = Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds.join(', ') : '';
      channelForm.elements.clientGroups.value = Array.isArray(view.clientGroups) ? view.clientGroups.join(', ') : '';
      currentChannelEnabled = isClone ? false : (source.enabled !== false && view.enabled !== false);
      if (isClone && channelForm.elements.displayName.value) {
        channelForm.elements.displayName.value = `${channelForm.elements.displayName.value} 복제`;
      }
      updateKindFields();
      setChannelValidation('');
      setOpsDetailPanelOpen(channelPanel, true);
      syncEditorChrome(mode, isClone ? '' : id);
      setOpsDetailPanelOpen(channelPanel, true, { scroll: true });
    }
    function selectedProfileLabel(profile) {
      if (!profile || typeof profile !== 'object') return '';
      const parts = [
        profile.name,
        profile.mediaApi,
        profile.encoding,
        Number(profile.width || 0) > 0 && Number(profile.height || 0) > 0
          ? `${profile.width}x${profile.height}`
          : '',
        Number(profile.fps || 0) > 0 ? `${profile.fps}fps` : ''
      ].filter(Boolean);
      return parts.join(' / ');
    }
    function parseOnvifProbeFixtureInput() {
      const fixtureText = String(onvifProbeDraftInput?.value || '').trim();
      if (!fixtureText) return null;
      try {
        return JSON.parse(fixtureText);
      } catch (_) {
        return null;
      }
    }
    function liveRtspProbeProfiles(fixture) {
      return (Array.isArray(fixture?.mediaProfiles) ? fixture.mediaProfiles : [])
        .filter(profile => profile && profile.token && onvifTransportFromUri(profile.streamUri)?.rtspUrl);
    }
    function preferredProbeProfileToken(fixture, profiles) {
      const explicit = String(fixture?.draftDecision?.selectedProfileToken || '').trim();
      if (explicit && profiles.some(profile => profile.token === explicit)) return explicit;
      const selected = profiles.find(profile => profile.selected);
      return selected?.token || profiles[0]?.token || '';
    }
    function renderOnvifProbeProfiles(fixture) {
      if (!onvifProbeProfileSelect) return;
      const profiles = liveRtspProbeProfiles(fixture);
      const previous = String(onvifProbeProfileSelect.value || '').trim();
      if (profiles.length === 0) {
        onvifProbeProfileSelect.innerHTML = '<option value="">profile 후보 없음</option>';
        onvifProbeProfileSelect.disabled = true;
        return;
      }
      onvifProbeProfileSelect.innerHTML = profiles.map(profile =>
        `<option value="${escapeHtml(profile.token)}">${escapeHtml(selectedProfileLabel(profile) || profile.token)}</option>`
      ).join('');
      onvifProbeProfileSelect.value = previous && profiles.some(profile => profile.token === previous)
        ? previous
        : preferredProbeProfileToken(fixture, profiles);
      onvifProbeProfileSelect.disabled = false;
    }
    function fixtureWithSelectedProbeProfile(fixture) {
      const profiles = liveRtspProbeProfiles(fixture);
      if (profiles.length === 0) return fixture;
      const token = String(onvifProbeProfileSelect?.value || preferredProbeProfileToken(fixture, profiles)).trim();
      const profile = profiles.find(item => item.token === token) || profiles[0];
      const next = JSON.parse(JSON.stringify(fixture));
      next.draftDecision = next.draftDecision || {};
      next.draftDecision.selectedProfileToken = profile.token;
      next.draftDecision.expectedSourceDraft = next.draftDecision.expectedSourceDraft || {};
      next.draftDecision.expectedSourceDraft.kind = 'rtsp';
      next.draftDecision.expectedSourceDraft.rtspUrl = profile.streamUri;
      next.draftDecision.expectedSourceDraft.displayName =
        next.draftDecision.expectedSourceDraft.displayName || profile.name || profile.token;
      next.draftDecision.expectedPublishedViewDraft =
        next.draftDecision.expectedPublishedViewDraft || {};
      next.draftDecision.expectedPublishedViewDraft.displayName =
        next.draftDecision.expectedPublishedViewDraft.displayName ||
        next.draftDecision.expectedSourceDraft.displayName;
      return next;
    }
    function applyOnvifDraftToChannelForm(payload) {
      const sourceDraft = payload?.sourceDraft || {};
      const viewDraft = payload?.publishedViewDraft || {};
      const channelId = String(channelForm.elements.channelId.value || currentChannelId || nextChannelId()).trim();
      const displayName = String(viewDraft.displayName || sourceDraft.displayName || channelId).trim();
      const streamUri = String(sourceDraft.rtspUrl || sourceDraft.httpUrl || sourceDraft.whepUrl || '').trim();
      if (!onvifTransportFromUri(streamUri)) {
        throw new Error('Probe draft에서 저장 가능한 ONVIF 스트림 URI를 찾을 수 없습니다.');
      }
      setGeneratedChannelId(channelId);
      channelForm.elements.displayName.value = displayName;
      channelForm.elements.kind.value = 'onvif';
      channelForm.elements.onvifStreamUrl.value = streamUri;
      currentChannelEnabled = sourceDraft.enabled !== false && viewDraft.enabled !== false;
      updateKindFields();
      setChannelValidation('');
      syncEditorChrome(editorMode === 'view' ? 'edit' : editorMode, currentChannelId);
      const profileText = selectedProfileLabel(payload?.selectedProfile);
      setOnvifProbeDraftStatus(
        `Probe draft 적용: 채널 #${channelId}${profileText ? ` (${profileText})` : ''}`
      );
      renderOnvifCredentialGate(payload?.credentialGate);
      setStatus('');
      showToast(`ONVIF probe draft 적용 완료: 채널 #${channelId}`);
    }
    async function applyOnvifProbeDraft() {
      const fixtureText = String(onvifProbeDraftInput?.value || '').trim();
      if (!fixtureText) {
        setOnvifProbeDraftStatus('ONVIF probe fixture 입력이 필요합니다.', true);
        return;
      }
      let fixture = null;
      try {
        fixture = JSON.parse(fixtureText);
      } catch (error) {
        setOnvifProbeDraftStatus('ONVIF probe fixture JSON을 파싱할 수 없습니다.', true);
        return;
      }
      renderOnvifProbeProfiles(fixture);
      try {
        const payload = await requestJson('/ops/api/onvif/import-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fixtureWithSelectedProbeProfile(fixture))
        });
        applyOnvifDraftToChannelForm(payload);
      } catch (error) {
        setOnvifProbeDraftStatus(`Probe draft 적용 실패: ${error.message}`, true);
      }
    }
    function openChannel(id, mode = 'view') {
      if (!id) return;
      fillChannel(id, mode);
    }
    function validateChannelForm(form) {
      const data = formDataObject(form);
      if (!isNumericChannelId(data.channelId)) return '채널 ID는 1 이상의 숫자만 사용할 수 있습니다.';
      if (!String(data.displayName || '').trim()) return '채널 이름이 필요합니다.';
      const kind = data.kind || 'file';
      const locatorByKind = {
        file: data.file,
        onvif: data.onvifStreamUrl,
        rtsp: data.rtspUrl,
        webrtc: data.webrtcSourceId,
        whep: data.whepUrl,
        http: data.httpUrl
      };
      if (!(locatorByKind[kind] || '').trim()) {
        if (kind === 'webrtc') return 'WHIP publish로 등록된 Source ID가 필요합니다.';
        if (kind === 'whep') return '외부 WHEP playback endpoint URL이 필요합니다.';
        return `${kindLabel(kind)} 입력값이 필요합니다.`;
      }
      if (kind === 'onvif' && !onvifTransportFromUri(data.onvifStreamUrl)) {
        return 'ONVIF 스트림 URI는 rtsp://, rtsps://, http://, https:// 중 하나로 시작해야 합니다.';
      }
      if (kind === 'onvif' && uriContainsAuthorityCredential(data.onvifStreamUrl)) {
        return 'ONVIF stream URI에는 username/password를 포함할 수 없습니다.';
      }
      return '';
    }
    function onvifTransportFromUri(value) {
      const uri = String(value || '').trim();
      const lower = uri.toLowerCase();
      if (lower.startsWith('rtsp://') || lower.startsWith('rtsps://')) {
        return { kind: 'rtsp', rtspUrl: uri };
      }
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        return { kind: lower.includes('.m3u8') ? 'hls' : 'http', httpUrl: uri };
      }
      return null;
    }
    function uriContainsAuthorityCredential(value) {
      const uri = String(value || '').trim();
      const marker = uri.indexOf('://');
      if (marker < 0) return false;
      const authorityStart = marker + 3;
      const authorityEndValues = ['/', '?', '#']
        .map(ch => uri.indexOf(ch, authorityStart))
        .filter(index => index >= 0);
      const authorityEnd = authorityEndValues.length ? Math.min(...authorityEndValues) : uri.length;
      return uri.slice(authorityStart, authorityEnd).includes('@');
    }
    function channelPayloadsFromFormData(data) {
      const channelId = data.channelId.trim();
      const formKind = data.kind || 'file';
      const onvifTransport = formKind === 'onvif' ? onvifTransportFromUri(data.onvifStreamUrl) : null;
      const storedKind = formKind === 'onvif' ? (onvifTransport?.kind || 'rtsp') : formKind;
      const sourcePayload = {
        sourceId: channelId,
        displayName: data.displayName,
        kind: storedKind,
        enabled: currentChannelEnabled,
        tags: formKind === 'onvif' ? ['onvif', 'live'] : [],
        ownerGroup: (data.group || '').trim(),
        site: (data.site || '').trim(),
        group: (data.group || '').trim(),
        floor: (data.floor || '').trim(),
        zone: (data.zone || '').trim()
      };
      if (formKind === 'file') sourcePayload.file = (data.file || '').trim();
      if (formKind === 'onvif' && onvifTransport?.rtspUrl) sourcePayload.rtspUrl = onvifTransport.rtspUrl;
      if (formKind === 'onvif' && onvifTransport?.httpUrl) sourcePayload.httpUrl = onvifTransport.httpUrl;
      if (formKind === 'rtsp') sourcePayload.rtspUrl = (data.rtspUrl || '').trim();
      if (formKind === 'webrtc') sourcePayload.webrtcSourceId = (data.webrtcSourceId || '').trim();
      if (formKind === 'whep') sourcePayload.whepUrl = (data.whepUrl || '').trim();
      if (formKind === 'http') sourcePayload.httpUrl = (data.httpUrl || '').trim();
      const viewPayload = {
        viewId: channelId,
        displayName: data.displayName,
        sourceId: channelId,
        defaultRuleId: '',
        allowedRuleIds: String(data.allowedRuleIds || '').split(/[\s,]+/).map(item => item.trim()).filter(Boolean),
        allowedOverlayModes: ['raw', 'va-overlay', 'va-rule'],
        showDashboard: true,
        showEvents: true,
        showMetadataSummary: true,
        clientGroups: String(data.clientGroups || '').split(/[\s,]+/).map(item => item.trim()).filter(Boolean),
        maxTiles: 1,
        enabled: currentChannelEnabled
      };
      return { channelId, sourcePayload, viewPayload };
    }
    async function saveChannelSourceViewPair(channelId, sourcePayload, viewPayload) {
      if (hasSourceTag(sourcePayload, 'onvif')) {
        return requestJson(`/ops/api/onvif/channels/${encodeURIComponent(channelId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: sourcePayload, publishedView: viewPayload })
        });
      }
      await requestJson(`/ops/api/sources/${encodeURIComponent(channelId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourcePayload)
      });
      return requestJson(`/ops/api/views/${encodeURIComponent(channelId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viewPayload)
      });
    }
    async function loadAll() {
      const [sources, views, clientViews, onboardingQuality, reliabilityTimeline, reliabilitySearchMetrics, backupRecoveryHandoff, stagingRestoreValidationHandoff, continuityDrillContract, recoveryCandidatePackage, sourceHealthReplayDriftDiff, approvalGatedRecoveryChecklist, drillEvidenceExportCleanupManifest, fieldBridgeConditionGates, principal] = await Promise.all([
        requestJson('/ops/api/sources'),
        requestJson('/ops/api/views'),
        requestJson('/client/api/views'),
        requestJson('/ops/api/source-registry/onboarding-quality'),
        requestJson('/ops/api/source-registry/reliability-timeline'),
        requestJson('/ops/api/source-registry/reliability-search-metrics'),
        requestJson('/ops/api/source-registry/backup-recovery-handoff'),
        requestJson('/ops/api/source-registry/staging-restore-validation-handoff'),
        requestJson('/ops/api/source-registry/continuity-drill/contract'),
        requestJson('/ops/api/source-registry/recovery-candidate-package'),
        requestJson('/ops/api/source-registry/source-health-replay-drift-diff'),
        requestJson('/ops/api/source-registry/approval-gated-recovery-checklist'),
        requestJson('/ops/api/source-registry/drill-evidence-export-cleanup-manifest'),
        requestJson('/ops/api/source-registry/field-bridge-condition-gates'),
        requestJson('/auth/whoami').catch(() => null)
      ]);
      opsPrincipal = principal;
      loadedSources = sources.sources || [];
      loadedViews = views.views || [];
      applySourceWriteAccessUi();
      renderOnboardingQualitySummary(onboardingQuality);
      renderReliabilityTimelineHealthHistory(reliabilityTimeline);
      renderSourceReliabilitySearchMetrics(reliabilitySearchMetrics);
      renderBackupRecoverySourceHandoff(backupRecoveryHandoff);
      renderStagingRestoreValidationHandoff(stagingRestoreValidationHandoff);
      renderOpsContinuityDrillWorkspace(continuityDrillContract, recoveryCandidatePackage, sourceHealthReplayDriftDiff);
      renderApprovalGatedRecoveryChecklistAudit(approvalGatedRecoveryChecklist);
      renderDrillEvidenceExportCleanupManifest(drillEvidenceExportCleanupManifest);
      renderFieldBridgeConditionGates(fieldBridgeConditionGates);
      renderChannels(loadedSources, loadedViews);
      renderOpsAuditTrail('channel-audit-list', 'channels');
      if (!initializedHashChannel) {
        initializedHashChannel = true;
        const channelId = String(hashParams().get('channel') || '').trim();
        if (channelId && findSource(channelId)) {
          openChannel(channelId, 'view');
        }
      }
      setStatus('');
    }
    channelForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!canWriteSources()) {
        setStatus('source:write scope가 필요합니다.', true);
        return;
      }
      const form = event.currentTarget;
      const data = formDataObject(form);
      const validation = validateChannelForm(form);
      setChannelValidation(validation);
      if (validation) return;
      const { channelId, sourcePayload, viewPayload } = channelPayloadsFromFormData(data);
      const beforeSource = findSource(channelId);
      const beforeView = findChannelView(channelId);
      try {
        await saveChannelSourceViewPair(channelId, sourcePayload, viewPayload);
        await loadAll();
        await recordOpsAudit({
          area: 'channels',
          action: beforeSource || beforeView ? 'update' : 'create',
          target: `channel:${channelId}`,
          before: beforeSource || beforeView ? { source: beforeSource || null, view: beforeView || null } : null,
          after: { source: sourcePayload, view: viewPayload }
        });
        renderOpsAuditTrail('channel-audit-list', 'channels');
        setStatus('채널 저장 완료');
        fillChannel(channelId, 'view');
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    async function toggleChannelEnabled(id) {
      if (!id) return;
      const source = findSource(id);
      if (!source) {
        setStatus(`채널 #${id} source를 찾을 수 없습니다.`, true);
        return;
      }
      const view = findChannelView(id) || { viewId: id, sourceId: source.sourceId };
      const enabled = !(source.enabled !== false && view.enabled !== false);
      const before = { source, view };
      const nextSource = sourcePayloadFromRecord(source, enabled);
      const nextView = viewPayloadFromRecord(view, source, enabled);
      try {
        await saveChannelSourceViewPair(id, nextSource, nextView);
        await loadAll();
        await recordOpsAudit({
          area: 'channels',
          action: enabled ? 'enable' : 'disable',
          target: `channel:${id}`,
          before,
          after: {
            source: nextSource,
            view: nextView
          }
        });
        renderOpsAuditTrail('channel-audit-list', 'channels');
        currentChannelEnabled = enabled;
        setStatus(`채널 #${id} 상태 변경 완료: ${enabled ? '활성' : '비활성'}`);
      } catch (error) {
        setStatus(`채널 상태 변경 실패: ${error.message}`, true);
      }
    }
    async function deleteChannel(id) {
      if (!id) id = channelForm.elements.channelId.value.trim();
      if (!id) return;
      if (!confirmChannelDangerAction(`delete-channel:${id}`, `채널 #${id} 삭제 확인: 현재 API는 source/view를 비활성화합니다.`)) return;
      const before = { source: findSource(id) || null, view: findChannelView(id) || null };
      try {
        const results = await Promise.allSettled([
          requestJson(`/ops/api/views/${encodeURIComponent(id)}`, { method: 'DELETE' }),
          requestJson(`/ops/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' })
        ]);
        const failed = results.filter(result => result.status === 'rejected');
        await loadAll();
        if (failed.length === 0) {
          await recordOpsAudit({ area: 'channels', action: 'delete', target: `channel:${id}`, before, after: null });
          renderOpsAuditTrail('channel-audit-list', 'channels');
        }
        setStatus(failed.length ? `채널 삭제 일부 실패: ${failed[0].reason?.message || 'unknown'}` : '채널 삭제 완료', failed.length > 0);
        if (currentChannelId === id) setOpsDetailPanelOpen(channelPanel, false);
      } catch (error) {
        setStatus(error.message, true);
      }
    }
    document.querySelector('#add-channel').addEventListener('click', () => resetChannelForm('new').catch(error => setStatus(error.message, true)));
    closeChannelButton.addEventListener('click', () => {
      setOpsDetailPanelOpen(channelPanel, false);
      document.querySelector('[data-ops-panel], .panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    editSelectedButton.addEventListener('click', () => currentChannelId && fillChannel(currentChannelId, 'edit'));
    channelForm.elements.kind.addEventListener('change', updateKindFields);
    onvifProbeDraftInput?.addEventListener('input', () => renderOnvifProbeProfiles(parseOnvifProbeFixtureInput()));
    onvifProbeDraftApplyButton?.addEventListener('click', applyOnvifProbeDraft);
    onvifProbeDraftClearButton?.addEventListener('click', () => {
      onvifProbeDraftInput.value = '';
      renderOnvifProbeProfiles(null);
      renderOnvifCredentialGate();
      setOnvifProbeDraftStatus('');
    });
    document.querySelector('#refresh').addEventListener('click', () => {
      loadOnvifCredentialProviderStatus();
      loadOnvifLiveImportPersistDecision();
      loadAll().catch(error => setStatus(error.message, true));
    });
    document.querySelector('#channel-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('channel-audit-list', 'channels'));
    renderOpsAuditTrail('channel-audit-list', 'channels');
    renderOnvifCredentialGate();
    loadOnvifCredentialProviderStatus();
    loadOnvifLiveImportPersistDecision();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSSOURCES";
}

}  // namespace ingress
