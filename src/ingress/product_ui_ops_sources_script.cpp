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
    const opsPrincipalScopes = () => Array.isArray(opsPrincipal?.scopes) ? opsPrincipal.scopes.map(item => String(item || '')) : [];
    const opsPrincipalHasScope = scope => opsPrincipal?.role === 'admin' || opsPrincipalScopes().includes('*') || opsPrincipalScopes().includes(scope);
    const canWriteSources = () => opsPrincipalHasScope('source:write');
    const sourceWriteDisabledAttr = () => canWriteSources() ? '' : ' disabled aria-disabled="true" data-scope-blocked="source:write"';
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
    function resetChannelForm(mode = 'new') {
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
        allowedRuleIds: [],
        allowedOverlayModes: ['raw', 'va-overlay', 'va-rule'],
        showDashboard: true,
        showEvents: true,
        showMetadataSummary: true,
        clientGroups: [],
        maxTiles: 1,
        enabled: currentChannelEnabled
      };
      return { channelId, sourcePayload, viewPayload };
    }
    async function loadAll() {
      const [sources, views, clientViews, onboardingQuality, principal] = await Promise.all([
        requestJson('/ops/api/sources'),
        requestJson('/ops/api/views'),
        requestJson('/client/api/views'),
        requestJson('/ops/api/source-registry/onboarding-quality'),
        requestJson('/auth/whoami').catch(() => null)
      ]);
      opsPrincipal = principal;
      loadedSources = sources.sources || [];
      loadedViews = views.views || [];
      applySourceWriteAccessUi();
      renderOnboardingQualitySummary(onboardingQuality);
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
        await requestJson(`/ops/api/sources/${encodeURIComponent(channelId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sourcePayload)
        });
        await requestJson(`/ops/api/views/${encodeURIComponent(channelId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(viewPayload)
        });
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
      try {
        await requestJson(`/ops/api/sources/${encodeURIComponent(source.sourceId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sourcePayloadFromRecord(source, enabled))
        });
        await requestJson(`/ops/api/views/${encodeURIComponent(view.viewId || id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(viewPayloadFromRecord(view, source, enabled))
        });
        await loadAll();
        await recordOpsAudit({
          area: 'channels',
          action: enabled ? 'enable' : 'disable',
          target: `channel:${id}`,
          before,
          after: {
            source: sourcePayloadFromRecord(source, enabled),
            view: viewPayloadFromRecord(view, source, enabled)
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
    document.querySelector('#add-channel').addEventListener('click', () => resetChannelForm('new'));
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
    document.querySelector('#refresh').addEventListener('click', () => loadAll().catch(error => setStatus(error.message, true)));
    document.querySelector('#channel-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('channel-audit-list', 'channels'));
    renderOpsAuditTrail('channel-audit-list', 'channels');
    renderOnvifCredentialGate();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSSOURCES";
}

}  // namespace ingress
