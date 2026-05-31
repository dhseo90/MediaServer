// 파일 용도: 운영자와 클라이언트 페이지별 상호작용 스크립트를 C++ 문자열로 조립한다.
#include "ingress/product_ui_page_scripts.h"

#include <sstream>
#include <string>

namespace ingress {

namespace {

// 주요 동작: 서버 값이 inline JavaScript 문자열 안에서 안전하게 쓰이도록 escape한다.
std::string JsStringLiteral(const std::string& value) {
    std::ostringstream out;
    out << "'";
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out << "\\\\";
                break;
            case '\'':
                out << "\\'";
                break;
            case '\n':
                out << "\\n";
                break;
            case '\r':
                out << "\\r";
                break;
            case '\t':
                out << "\\t";
                break;
            default:
                out << ch;
                break;
        }
    }
    out << "'";
    return out.str();
}

}  // namespace

// 주요 동작: 클라이언트 접근 요청 폼 제출을 API 호출과 화면 피드백으로 연결한다.
void AppendClientAccessRequestScript(std::ostringstream& out) {
    out << R"REQUESTSCRIPT(  <script>
    const { requestJson, formDataObject, setFeedback } = window.MediaServerUi;
    const form = document.querySelector('#request-form');
    const message = document.querySelector('#message');
    function setMessage(text, failed = false) {
      setFeedback(message, text, failed);
      message.hidden = false;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = formDataObject(form);
      try {
        const result = await requestJson('/client/api/access-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username.trim(),
            displayName: data.displayName.trim(),
            contact: data.contact.trim(),
            viewId: data.viewId.trim(),
            reason: data.reason.trim()
          })
        });
        form.reset();
        const requestId = String(result?.requestId || '').trim();
        const prefix = requestId ? `요청 ${requestId} 접수 완료. ` : '';
        setMessage(`${prefix}승인 전에는 로그인/채널 접근이 열리지 않습니다. 관리자가 승인하면 초대 링크로 비밀번호를 설정하세요.`);
      } catch (error) {
        setMessage(error.message, true);
      }
    });
  </script>
)REQUESTSCRIPT";
}

void AppendClientShellScript(std::ostringstream& out) {
    out << R"CLIENTSCRIPT(  <script>
    const activePage = document.body.dataset.clientActive || 'dashboard';
    let payload = { views: [] };
    try {
      payload = JSON.parse(document.querySelector('#views-data')?.textContent || '{"views":[]}');
    } catch (error) {
      payload = { views: [], error: error.message || 'view data parse failed' };
    }
    const host = document.querySelector('#views');
    const detail = document.querySelector('#detail');
    const refresh = document.querySelector('#refresh');
    const workspace = document.querySelector('.workspace');
    const views = Array.isArray(payload.views) ? payload.views : [];
    const clientHashParams = () => new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    let selectedViewId = clientHashParams().get('view') || views[0]?.viewId || '';
    const isPreviewMode = document.body.dataset.clientPreview === 'true';
    const { escapeHtml, display, numberValue, requestJson, applyPrincipalVisibility, setSelectOptions, showToast, currentLanguage, translateText } = window.MediaServerUi;
    let clientWebRtcConfigPromise = null;
    const ms = value => value === null || value === undefined ? '미제공' : `${Math.max(0, Math.round(Number(value)))}ms`;
    const formatTime = value => {
      if (value === null || value === undefined || value === '') return '미제공';
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '미제공';
      if (numeric > 1000000000000) return new Date(numeric).toLocaleString();
      return `${Math.round(numeric)}ms`;
    };
    const statusChip = value => {
      const normalized = String(value);
      const text = display(value);
      const cls = ['stale', 'offline', 'disconnected', 'warning'].includes(normalized) ? ' warn' :
        ['unavailable', 'failed', 'error'].includes(normalized) ? ' bad' :
        ['info', 'connecting'].includes(normalized) ? ' info' : '';
      const label = ({
        warning: '경고',
        info: '확인 중',
        normal: '정상',
        stale: '지연',
        offline: '오프라인',
        disconnected: '연결 끊김',
        unavailable: '미제공',
        connected: '연결됨',
        connecting: '연결 중',
        receiving: '수신 중',
        fresh: '정상',
        live: '라이브',
        metadata: '메타데이터'
      })[normalized] || text;
      return `<span class="chip${cls}">${escapeHtml(label)}</span>`;
    };
    const clientStatusLabel = value => ({
      offline: '오프라인',
      connecting: '연결 중',
      connected: '연결됨',
      completed: '연결됨',
      live: '라이브',
      metadata: '메타데이터',
      'metadata-error': '메타데이터 오류',
      disconnected: '연결 끊김',
      failed: '실패',
      error: '오류',
      closed: '닫힘',
      stale: '지연',
      fresh: '정상',
      receiving: '수신 중',
      normal: '정상',
      warning: '경고',
      unavailable: '미제공'
    })[String(value)] || display(value);
    const clientHealthSummaryLabel = value => ({
      offline: '신호 없음',
      'waiting-signal': '신호 확인 중',
      receiving: '영상 수신 중',
      'video-delay': '영상 지연 확인',
      'metadata-delay': '메타데이터 지연 확인',
      'video-and-metadata-delay': '영상/메타데이터 지연 확인'
    })[String(value)] || display(value);
    const emptyState = (title, message, actionHref = '', actionLabel = '') => `
      <div class="empty">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${actionHref ? `<div class="actions"><a class="button button-secondary" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a></div>` : ''}
      </div>
    `;
    async function copyClientText(text) {
      const value = String(text || '').trim();
      if (!value) throw new Error('복사할 상태가 없습니다.');
      const copyByEvent = () => {
        let copied = false;
        const handler = event => {
          if (!event.clipboardData) return;
          event.clipboardData.setData('text/plain', value);
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
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-1000px';
        area.style.top = '0';
        document.body.appendChild(area);
        area.focus();
        area.select();
        try {
          return document.execCommand('copy');
        } finally {
          area.remove();
        }
      };
      if (copyByEvent()) return;
      if (copyByTextarea()) return;
      let clipboardError = null;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(value);
          return;
        } catch (error) {
          clipboardError = error;
        }
      }
      throw clipboardError || new Error('copy command rejected');
    }
    const clientUiText = (ko, en) => {
      try {
        return currentLanguage && currentLanguage() === 'en' ? en : ko;
      } catch (_) {
        return ko;
      }
    };
    const clientDynamicText = value => {
      const raw = String(value ?? '');
      try {
        return translateText ? translateText(raw) : raw;
      } catch (_) {
        return raw;
      }
    };
    function clearClientClipboardFallback(root = detail) {
      root?.querySelector('[data-client-copy-fallback]')?.remove();
    }
    function showClientClipboardFallback(text, root = detail) {
      const value = String(text || '').trim();
      if (!root || !value) return;
      clearClientClipboardFallback(root);
      const box = document.createElement('div');
      box.className = 'clipboard-fallback';
      box.dataset.clientCopyFallback = 'true';
      box.innerHTML = `
        <div>
          <strong>${escapeHtml(clientUiText('수동 복사용 텍스트', 'Manual copy text'))}</strong>
          <p>${escapeHtml(clientUiText('아래 텍스트를 선택해 직접 복사하세요.', 'Select the text below and copy it manually.'))}</p>
        </div>
        <textarea readonly aria-label="${escapeHtml(clientUiText('수동 복사용 텍스트', 'Manual copy text'))}"></textarea>
        <button type="button" class="ghost" data-clipboard-fallback-close>${escapeHtml(clientUiText('닫기', 'Close'))}</button>
      `;
      const area = box.querySelector('textarea');
      area.value = value;
      box.querySelector('[data-clipboard-fallback-close]')?.addEventListener('click', () => box.remove());
      root.appendChild(box);
      try {
        area.focus({ preventScroll: false });
      } catch (_) {
        area.focus();
      }
      area.select();
    }
    const clientEventSummaryText = (events = {}) => {
      const lines = ['이벤트 요약'];
      const counts = Array.isArray(events.countsByType) ? events.countsByType : [];
      if (counts.length > 0) {
        lines.push(`유형: ${counts.map(item => `${item.eventType || 'event'} ${display(item.count)}`).join(', ')}`);
      } else {
        lines.push('유형: 최근 이벤트 없음');
      }
      lines.push(`경고: ${events.warning ? '있음' : '없음'}`);
      const recent = Array.isArray(events.recent) ? events.recent.slice(0, 3) : [];
      if (recent.length > 0) {
        for (const item of recent) {
          const name = item.scenarioName || item.className || item.eventType || '이벤트';
          lines.push(`최근: ${name} / ${item.eventType || 'event'} / ${item.status || '미제공'} / ${formatTime(item.updateTime || item.startTime)}`);
        }
      } else {
        lines.push('최근: 없음');
      }
      return lines.join('\n');
    };
    const clientStatusSummaryText = (payload = {}) => {
      const view = payload.view || {};
      const health = payload.health || {};
      const analysis = payload.analysis || {};
      const connection = payload.connection || {};
      const events = payload.events || {};
      const fieldState = dashboardFieldState(health, events);
      return [
        `채널: ${view.displayName || view.viewId || '미제공'}`,
        `현장 상태: ${fieldState.text}`,
        `상태 요약: ${clientHealthSummaryLabel(health.summary || health.status)}`,
        `연결: ${clientStatusLabel(health.connectionStatus || health.status)}`,
        `영상: ${clientStatusLabel(health.videoFrameStatus || health.status)}`,
        `메타데이터: ${clientStatusLabel(health.metadataStatus)}`,
        `메타데이터 지연: ${ms(health.metadataAgeMs)}`,
        `마지막 프레임: ${ms(connection.lastFrameAgeMs ?? health.lastFrameAgeMs)}`,
        `트랙: ${display(analysis.trackCount)}`,
        `활성 이벤트: ${display(analysis.activeEventCount)}`,
        `시나리오: ${display(analysis.scenarioCount)}`
      ].join('\n');
    };
    function bindClientCopyButtons(payload, root = detail) {
      root?.querySelectorAll('[data-client-copy]').forEach(button => {
        button.__clientCopyPayload = payload;
        button.onclick = async () => {
          const mode = String(button.dataset.clientCopy || '');
          const activePayload = button.__clientCopyPayload || payload;
          const copyText = mode === 'events' ? clientEventSummaryText(activePayload.events || {}) : clientStatusSummaryText(activePayload);
          button.disabled = true;
          try {
            await copyClientText(copyText);
            clearClientClipboardFallback(root);
            showToast(mode === 'events' ? '이벤트 요약 복사 완료' : '상태 요약 복사 완료');
          } catch (error) {
            if (error.message === '복사할 상태가 없습니다.') {
              showToast(error.message, true);
            } else {
              showClientClipboardFallback(copyText, root);
              showToast('아래 텍스트를 선택해 직접 복사하세요.');
            }
          } finally {
            button.disabled = false;
          }
        };
      });
    }
    applyPrincipalVisibility().catch(() => {});
    const normalizeOverlayMode = mode => {
      const raw = String(mode || '').trim().toLowerCase();
      if (!raw || ['raw', 'none', 'video', 'live'].includes(raw)) return 'raw';
      if (['va-overlay', 'va', 'overlay', 'metadata', 'server-overlay'].includes(raw)) return 'va-overlay';
      if (['va-rule', 'rule', 'varule'].includes(raw)) return 'va-rule';
      return '';
    };
    const requestedClientModeParam = clientHashParams().get('mode');
    let requestedClientOverlayMode = requestedClientModeParam === null
      ? ''
      : normalizeOverlayMode(requestedClientModeParam);
    let requestedClientRuleId = String(clientHashParams().get('rule') || '').trim();
    const overlayLabel = mode => ({
      raw: '원본',
      'va-overlay': 'VA 오버레이',
      'va-rule': 'VA 룰'
    })[mode] || mode || '미제공';
    const viewHasSourceTag = (view, tag) => Array.isArray(view?.sourceTags) &&
      view.sourceTags.map(item => String(item || '').toLowerCase()).includes(String(tag || '').toLowerCase());
    const sourceKindLabel = (kind, view = null) => viewHasSourceTag(view, 'onvif')
      ? 'ONVIF'
      : ({
        file: '파일',
        rtsp: 'RTSP',
        whep: '외부 WHEP',
        http: 'HTTP/HLS',
        hls: 'HTTP/HLS',
        webrtc: '발행 WebRTC'
      })[String(kind || '').toLowerCase()] || kind || '소스';
    const defaultTileRuleId = view => view?.defaultRuleId || (Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds[0] : '') || '';
    const requestedRuleIdForView = view =>
      (requestedClientRuleId && String(view?.viewId || '') === String(selectedViewId || ''))
        ? requestedClientRuleId
        : defaultTileRuleId(view);
    const allowedOverlayModes = view => {
      const seen = new Set();
      const out = [];
      const ruleId = requestedRuleIdForView(view);
      for (const value of view?.allowedOverlayModes || []) {
        const mode = normalizeOverlayMode(value);
        if (mode === 'va-rule' && !ruleId) continue;
        if (mode && !seen.has(mode)) {
          seen.add(mode);
          out.push(mode);
        }
      }
      return out;
	    };
	    const viewById = id => views.find(view => String(view.viewId) === String(id)) || null;
	    if (!viewById(selectedViewId)) selectedViewId = views[0]?.viewId || '';
	    const maxLiveTiles = isPreviewMode ? 9 : 4;
	    function viewMaxTiles(view) {
	      const parsed = Number(view?.maxTiles);
	      const limit = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
	      return Math.max(1, Math.min(maxLiveTiles, limit || 1));
	    }
	    function renderAssignedViews() {
	      if (views.length === 0) {
	        host.innerHTML = emptyState(
          '할당된 PublishedView가 없습니다',
          isPreviewMode
            ? '미리보기에 표시할 채널이 없습니다. Ops에서 채널과 계정 권한을 확인하세요.'
            : '이 계정에 허용된 채널이 없습니다. 관리자에게 채널 접근 권한을 요청하세요.',
          isPreviewMode ? '/ops/sources' : '/client/request-access',
          isPreviewMode ? '채널 관리' : '접근 요청'
        );
        return;
      }
      host.innerHTML = views.map(view => `
        <button class="view${view.viewId === selectedViewId ? ' active' : ''}" type="button" data-view-id="${escapeHtml(view.viewId)}">
          <h3>${escapeHtml(view.displayName || view.viewId)}</h3>
	          <div class="meta">
		            <span class="chip">${escapeHtml(sourceKindLabel(view.sourceKind, view))}</span>
	            ${view.showDashboard ? '<span class="chip">대시보드</span>' : ''}
	            <span class="chip">최대 ${viewMaxTiles(view)}개</span>
	          </div>
	        </button>
	      `).join('');
    }
    function setActiveView(viewId) {
      selectedViewId = viewId;
      host.querySelectorAll('.view').forEach(node => {
        node.classList.toggle('active', node.dataset.viewId === viewId);
      });
      if (activePage === 'live' && selectedLiveTile !== null) {
        setTileView(selectedLiveTile, viewId);
      } else {
        loadDetail();
      }
    }
    host.addEventListener('click', event => {
      const button = event.target.closest('.view');
      if (button) setActiveView(button.dataset.viewId);
    });
    const dashboardFieldState = (health = {}, events = {}) => {
      const status = String(health.status || '');
      const metadataStatus = String(health.metadataStatus || '');
      const warningLevel = String(health.warningLevel || '');
      if (events.warning) return { text: '현장 확인 필요', tone: 'warn' };
      if (warningLevel === 'warning' || ['stale', 'offline', 'disconnected', 'warning'].includes(status)) {
        if (['stale', 'warning'].includes(metadataStatus) && status === 'live') return { text: '메타데이터 지연', tone: 'warn' };
        return { text: '영상 상태 확인', tone: 'warn' };
      }
      if (warningLevel === 'info' || status === 'connecting') return { text: '신호 확인 중', tone: 'info' };
      if (['stale', 'warning'].includes(metadataStatus)) return { text: '메타데이터 지연', tone: 'warn' };
      if (status === 'unavailable') return { text: '신호 미제공', tone: 'bad' };
      return { text: '정상 관제 중', tone: '' };
    };
    let clientDashboardCompareFilter = localStorage.getItem('mediaServerClientDashboardCompareFilter') || 'all';
    let clientDashboardCompareSort = localStorage.getItem('mediaServerClientDashboardCompareSort') || 'priority';
    const clientDashboardPresetConfigKey = 'mediaServerClientDashboardPresetConfig.v1';
    const clientDashboardDefaultPlacePresets = [
      { key: 'road', label: '도로', weight: 80, terms: ['road', 'traffic', 'street', '도로', '차도'] },
      { key: 'park', label: '공원', weight: 40, terms: ['park', 'plaza', '공원', '광장'] },
      { key: 'indoor', label: '실내', weight: 30, terms: ['indoor', 'inside', 'room', '실내'] },
      { key: 'lobby', label: '로비', weight: 45, terms: ['lobby', 'hall', '로비', '홀'] },
      { key: 'platform', label: '승강장', weight: 70, terms: ['platform', 'station', '승강장', '역사'] },
      { key: 'entrance', label: '출입구', weight: 75, terms: ['entrance', 'gate', 'door', '출입구', '게이트'] },
      { key: 'parking', label: '주차장', weight: 55, terms: ['parking', 'garage', '주차'] }
    ];
    const clientDashboardDefaultEventPresets = [
      { key: 'line', label: '라인 통과', weight: 90, terms: ['line'] },
      { key: 'intrusion', label: '침입', weight: 95, terms: ['intrusion'] },
      { key: 'loiter', label: '배회', weight: 70, terms: ['loiter'] },
      { key: 'occupancy', label: '혼잡/점유', weight: 75, terms: ['occupancy'] },
      { key: 'entry', label: '출입', weight: 65, terms: ['enter', 'exit'] },
      { key: 'presence', label: '존재 감지', weight: 35, terms: ['presence'] }
    ];
    const normalizeClientDashboardPresetList = (items, defaults) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => ({
        key: String(item?.key || '').trim(),
        label: String(item?.label || '').trim(),
        weight: Number(item?.weight || 0),
        terms: Array.isArray(item?.terms) ? item.terms.map(term => String(term || '').toLowerCase()).filter(Boolean) : []
      })).filter(item => item.key && item.label && item.terms.length > 0 && Number.isFinite(item.weight))
        .filter((item, index, list) => list.findIndex(candidate => candidate.key === item.key) === index);
    };
    const loadClientDashboardPresetConfig = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(clientDashboardPresetConfigKey) || '{}');
        return {
          placePresets: normalizeClientDashboardPresetList(parsed.placePresets, clientDashboardDefaultPlacePresets),
          eventPresets: normalizeClientDashboardPresetList(parsed.eventPresets, clientDashboardDefaultEventPresets)
        };
      } catch {
        return { placePresets: [], eventPresets: [] };
      }
    };
    let clientDashboardPresetConfig = loadClientDashboardPresetConfig();
    const clientDashboardPresetPolicy = () => ({
      placePresets: [...clientDashboardPresetConfig.placePresets, ...clientDashboardDefaultPlacePresets],
      eventPresets: [...clientDashboardPresetConfig.eventPresets, ...clientDashboardDefaultEventPresets]
    });
    const clientDashboardPresetConfigText = () => JSON.stringify(clientDashboardPresetConfig, null, 2);
    const saveClientDashboardPresetConfig = config => {
      clientDashboardPresetConfig = {
        placePresets: normalizeClientDashboardPresetList(config.placePresets, clientDashboardDefaultPlacePresets),
        eventPresets: normalizeClientDashboardPresetList(config.eventPresets, clientDashboardDefaultEventPresets)
      };
      localStorage.setItem(clientDashboardPresetConfigKey, JSON.stringify(clientDashboardPresetConfig));
    };
    const clientDashboardPlacePreset = payload => {
      const view = payload?.view || {};
      const raw = [
        ...(Array.isArray(view.sourceTags) ? view.sourceTags : []),
        view.ownerGroup,
        view.displayName,
        view.sourceDisplayName
      ].map(value => String(value || '').toLowerCase()).join(' ');
      const presets = clientDashboardPresetPolicy().placePresets;
      return presets.find(preset => preset.terms.some(term => raw.includes(term))) || { key: 'default', label: '기본 현장', weight: 0, terms: [] };
    };
    const clientDashboardEventPreset = eventType => {
      const normalized = String(eventType || '').toLowerCase();
      const preset = clientDashboardPresetPolicy().eventPresets.find(item => item.terms.some(term => normalized.includes(term)));
      if (preset) return { label: preset.label, weight: preset.weight };
      return { label: eventType ? String(eventType) : '이벤트', weight: 50 };
    };
    const clientDashboardComparePriority = item => {
      if (!item?.ok) return 1000;
      const payload = item.payload || {};
      const fieldState = dashboardFieldState(payload.health || {}, payload.events || {});
      const events = payload.events || {};
      const analysis = payload.analysis || {};
      const health = payload.health || {};
      const topEvent = Array.isArray(events.countsByType) && events.countsByType[0]?.eventType
        ? String(events.countsByType[0].eventType)
        : '';
      let score = fieldState.tone === 'bad' ? 900 : (fieldState.tone === 'warn' ? 700 : 100);
      score += clientDashboardPlacePreset(payload).weight;
      score += topEvent ? clientDashboardEventPreset(topEvent).weight : 0;
      score += numberValue(analysis.activeEventCount) * 20;
      score += events.warning ? 120 : 0;
      score += ['stale', 'warning'].includes(String(health.metadataStatus || '')) ? 80 : 0;
      return score;
    };
    const clientDashboardComparePreset = item => {
      if (!item?.ok) return '상태 조회 실패';
      const payload = item.payload || {};
      const events = payload.events || {};
      const analysis = payload.analysis || {};
      const topEvent = Array.isArray(events.countsByType) && events.countsByType[0]?.eventType
        ? String(events.countsByType[0].eventType)
        : '';
      const place = clientDashboardPlacePreset(payload);
      const eventPreset = clientDashboardEventPreset(topEvent);
      if (events.warning || numberValue(analysis.activeEventCount) > 0) {
        return topEvent ? `${place.label} · ${eventPreset.label} 우선 확인` : `${place.label} · 활성 이벤트 우선 확인`;
      }
      if (numberValue(analysis.scenarioCount) > 0) return `${place.label} · 시나리오 관제 중`;
      return `${place.label} 모니터링`;
    };
    const clientDashboardCompareVisibleItems = (items = []) => {
      const filtered = items.filter(item => {
        if (clientDashboardCompareFilter === 'warnings') {
          return !item.ok || dashboardFieldState(item.payload?.health || {}, item.payload?.events || {}).tone;
        }
        if (clientDashboardCompareFilter === 'events') {
          return item.ok && numberValue(item.payload?.analysis?.activeEventCount) > 0;
        }
        if (clientDashboardCompareFilter === 'live') {
          return item.ok && String(item.payload?.health?.status || '') === 'live';
        }
        return true;
      });
      return filtered.sort((left, right) => {
        if (clientDashboardCompareSort === 'name') {
          const leftName = String(left.payload?.view?.displayName || left.view?.displayName || left.view?.viewId || '');
          const rightName = String(right.payload?.view?.displayName || right.view?.displayName || right.view?.viewId || '');
          return leftName.localeCompare(rightName);
        }
        if (clientDashboardCompareSort === 'events') {
          return numberValue(right.payload?.analysis?.activeEventCount) - numberValue(left.payload?.analysis?.activeEventCount);
        }
        return clientDashboardComparePriority(right) - clientDashboardComparePriority(left);
      });
    };
    function renderDashboardCompare(items = []) {
      if (!Array.isArray(items) || items.length === 0) {
        return emptyState('비교할 채널이 없습니다', '대시보드 권한이 있는 채널이 추가되면 한 화면에서 상태를 비교할 수 있습니다.');
      }
      const visibleItems = clientDashboardCompareVisibleItems(items);
      if (visibleItems.length === 0) {
        return emptyState('필터에 맞는 채널이 없습니다', '다른 필터를 선택하면 접근 가능한 채널 상태를 다시 볼 수 있습니다.');
      }
      return `<div class="client-compare-grid">
        ${visibleItems.map(item => {
          if (!item.ok) {
            return `<article class="client-compare-card warn">
              <div class="client-compare-head">
                <strong>${escapeHtml(item.view?.displayName || item.view?.viewId || '채널')}</strong>
                <span class="chip warn">조회 실패</span>
              </div>
              <p>${escapeHtml(item.error || '상태를 불러오지 못했습니다.')}</p>
              <p class="client-compare-preset">${escapeHtml(clientDashboardComparePreset(item))}</p>
            </article>`;
          }
          const payload = item.payload || {};
          const view = payload.view || item.view || {};
          const health = payload.health || {};
          const analysis = payload.analysis || {};
          const events = payload.events || {};
          const fieldState = dashboardFieldState(health, events);
          return `<article class="client-compare-card${fieldState.tone ? ` ${fieldState.tone}` : ''}">
            <div class="client-compare-head">
              <strong>${escapeHtml(view.displayName || view.viewId || item.view?.viewId || '채널')}</strong>
              <span class="chip${fieldState.tone ? ` ${fieldState.tone}` : ''}">${escapeHtml(fieldState.text)}</span>
            </div>
            <p class="client-compare-preset">${escapeHtml(clientDashboardComparePreset(item))}</p>
            <div class="client-compare-metrics">
              <span>우선순위 ${escapeHtml(display(clientDashboardComparePriority(item)))}</span>
              <span>현장 ${escapeHtml(clientDashboardPlacePreset(payload).label)}</span>
              <span>요약 ${escapeHtml(clientHealthSummaryLabel(health.summary || health.status))}</span>
              <span>연결 ${escapeHtml(clientStatusLabel(health.connectionStatus || health.status))}</span>
              <span>지연 ${escapeHtml(ms(health.metadataAgeMs))}</span>
              <span>트랙 ${escapeHtml(display(analysis.trackCount))}</span>
              <span>이벤트 ${escapeHtml(display(analysis.activeEventCount))}</span>
            </div>
          </article>`;
        }).join('')}
      </div>`;
    }
    async function loadClientDashboardCompare() {
      const dashboardViews = views.filter(view => view.showDashboard !== false).slice(0, 6);
      if (dashboardViews.length === 0) return [];
      return Promise.all(dashboardViews.map(async view => {
        try {
          const payload = await requestJson(`/client/api/views/${encodeURIComponent(view.viewId)}/dashboard`);
          return { ok: true, view, payload };
        } catch (error) {
          return { ok: false, view, error: error.message || '상태 조회 실패' };
        }
      }));
    }
	    function renderDashboard(payload, compareItems = []) {
	      const view = payload.view || {};
	      const health = payload.health || {};
	      const analysis = payload.analysis || {};
	      const connection = payload.connection || {};
	      const events = payload.events || {};
	      const assignedView = viewById(view.viewId || selectedViewId) || viewById(selectedViewId) || {};
	      const dashboardModes = allowedOverlayModes(assignedView);
	      const dashboardModeText = (dashboardModes.length ? dashboardModes : ['raw']).map(overlayLabel).join(', ');
	      const dashboardRuleId = tileRuleId(assignedView);
        const fieldState = dashboardFieldState(health, events);
	      detail.innerHTML = `
	        <div class="client-dashboard-shell" data-testid="client-dashboard-shell">
	        <div class="toolbar client-dashboard-head">
          <div>
            <h2>${escapeHtml(view.displayName || view.viewId || '대시보드')}</h2>
            <p>${escapeHtml(view.sourceDisplayName || '미제공')}</p>
          </div>
          <div class="meta">
            <span class="chip${fieldState.tone ? ` ${fieldState.tone}` : ''}">${escapeHtml(fieldState.text)}</span>
            ${statusChip(health.warningLevel)}
            ${statusChip(health.status)}
            ${statusChip(health.metadataStatus)}
            ${events.warning ? '<span class="chip warn">경고</span>' : ''}
          </div>
          <div class="client-copy-actions">
            <button type="button" class="ghost" data-client-copy="status">상태 복사</button>
            <button type="button" class="ghost" data-client-copy="events">이벤트 복사</button>
          </div>
        </div>
        <section class="events client-field-summary" data-testid="client-dashboard-field-summary">
          <h3>현장 요약</h3>
          <div class="summary">
            <div class="metric"><span>현장 상태</span><strong>${escapeHtml(fieldState.text)}</strong></div>
            <div class="metric"><span>상태 요약</span><strong>${escapeHtml(clientHealthSummaryLabel(health.summary || health.status))}</strong></div>
            <div class="metric"><span>영상 신호</span><strong>${escapeHtml(clientStatusLabel(health.videoFrameStatus || health.status))}</strong></div>
            <div class="metric"><span>데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
          </div>
        </section>
        <div class="summary">
          <div class="metric"><span>연결 상태</span><strong>${escapeHtml(clientStatusLabel(health.connectionStatus))}</strong></div>
          <div class="metric"><span>영상 프레임</span><strong>${escapeHtml(clientStatusLabel(health.videoFrameStatus))}</strong></div>
          <div class="metric"><span>메타데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
          <div class="metric"><span>마지막 프레임</span><strong>${escapeHtml(ms(connection.lastFrameAgeMs))}</strong></div>
          <div class="metric"><span>트랙</span><strong>${escapeHtml(display(analysis.trackCount))}</strong></div>
          <div class="metric"><span>활성 이벤트</span><strong>${escapeHtml(display(analysis.activeEventCount))}</strong></div>
	          <div class="metric"><span>시나리오</span><strong>${escapeHtml(display(analysis.scenarioCount))}</strong></div>
	          <div class="metric"><span>최근 이벤트</span><strong>${escapeHtml(formatTime(analysis.latestEventTime))}</strong></div>
	        </div>
	        <section class="events">
	          <h3>클라이언트 범위</h3>
	          <div class="summary">
	            <div class="metric"><span>소스 종류</span><strong>${escapeHtml(sourceKindLabel(view.sourceKind, view))}</strong></div>
	            <div class="metric"><span>대시보드 권한</span><strong>${view.showDashboard === false ? '꺼짐' : '사용'}</strong></div>
	            <div class="metric"><span>이벤트 권한</span><strong>${view.showEvents === false ? '꺼짐' : '사용'}</strong></div>
	            <div class="metric"><span>메타데이터</span><strong>${view.showMetadataSummary === false ? '꺼짐' : '사용'}</strong></div>
	            <div class="metric"><span>보기 방식</span><strong>${escapeHtml(dashboardModeText)}</strong></div>
	            <div class="metric"><span>VA 룰</span><strong>${escapeHtml(dashboardRuleId ? `#${dashboardRuleId}` : '연결 없음')}</strong></div>
	          </div>
	        </section>
        <section class="events client-dashboard-compare" data-testid="client-dashboard-compare">
          <h3>채널 비교</h3>
          <div class="client-compare-toolbar">
            <label>필터
              <select id="clientDashboardCompareFilter" aria-label="필터">
                <option value="all">전체</option>
                <option value="warnings">확인 필요</option>
                <option value="events">이벤트 있음</option>
                <option value="live">라이브</option>
              </select>
            </label>
            <label>정렬
              <select id="clientDashboardCompareSort" aria-label="정렬">
                <option value="priority">경고 우선</option>
                <option value="events">이벤트 많은 순</option>
                <option value="name">이름순</option>
              </select>
            </label>
          </div>
          <details class="client-preset-config" data-testid="client-dashboard-preset-config">
            <summary>프리셋 설정</summary>
            <textarea id="clientDashboardPresetConfigInput" rows="6">${escapeHtml(clientDashboardPresetConfigText())}</textarea>
            <div class="actions">
              <button id="clientDashboardPresetApply" class="button button-secondary button-compact" type="button">적용</button>
              <button id="clientDashboardPresetReset" class="button button-secondary button-compact" type="button">초기화</button>
              <span id="clientDashboardPresetStatus" class="ops-rule-note"></span>
            </div>
          </details>
          ${renderDashboardCompare(compareItems)}
        </section>
	        <section class="events">
	          <h3>이벤트 요약</h3>
          <div class="meta">
            ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
          </div>
          ${renderEvents(events.recent || [])}
	        </section>
	        </div>
	      `;
      const filterSelect = document.getElementById('clientDashboardCompareFilter');
      const sortSelect = document.getElementById('clientDashboardCompareSort');
      if (filterSelect) {
        filterSelect.value = clientDashboardCompareFilter;
        filterSelect.addEventListener('change', () => {
          clientDashboardCompareFilter = filterSelect.value || 'all';
          localStorage.setItem('mediaServerClientDashboardCompareFilter', clientDashboardCompareFilter);
          renderDashboard(payload, compareItems);
        });
      }
      if (sortSelect) {
        sortSelect.value = clientDashboardCompareSort;
        sortSelect.addEventListener('change', () => {
          clientDashboardCompareSort = sortSelect.value || 'priority';
          localStorage.setItem('mediaServerClientDashboardCompareSort', clientDashboardCompareSort);
          renderDashboard(payload, compareItems);
        });
      }
      const presetInput = document.getElementById('clientDashboardPresetConfigInput');
      const presetStatus = document.getElementById('clientDashboardPresetStatus');
      const setPresetStatus = message => {
        const status = document.getElementById('clientDashboardPresetStatus');
        if (status) status.textContent = message;
      };
      document.getElementById('clientDashboardPresetApply')?.addEventListener('click', () => {
        try {
          saveClientDashboardPresetConfig(JSON.parse(presetInput?.value || '{}'));
          renderDashboard(payload, compareItems);
          setPresetStatus('저장됨');
        } catch (error) {
          if (presetStatus) presetStatus.textContent = `오류: ${error.message}`;
        }
      });
      document.getElementById('clientDashboardPresetReset')?.addEventListener('click', () => {
        localStorage.removeItem(clientDashboardPresetConfigKey);
        clientDashboardPresetConfig = { placePresets: [], eventPresets: [] };
        if (presetInput) presetInput.value = clientDashboardPresetConfigText();
        renderDashboard(payload, compareItems);
        setPresetStatus('초기화됨');
      });
      bindClientCopyButtons(payload);
    }
    function renderEvents(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return emptyState('최근 이벤트 없음', '현재 현장 상태에서 표시할 이벤트가 없거나 이벤트 표시 권한이 꺼져 있습니다.');
      }
      return items.map(item => `
        <article class="event">
          <div class="meta">
            <span class="chip">${escapeHtml(item.eventType || 'event')}</span>
            ${statusChip(item.status || '미제공')}
          </div>
          <h3>${escapeHtml(item.scenarioName || item.className || item.eventId || '이벤트')}</h3>
          <p>${escapeHtml(formatTime(item.updateTime || item.startTime))}</p>
        </article>
      `).join('');
    }
    function renderEventPage(payload) {
      const view = payload.view || {};
      const events = payload.events || {};
      detail.innerHTML = `
        <div class="toolbar">
          <div>
            <h2>${escapeHtml(view.displayName || view.viewId || '이벤트')}</h2>
            <p>${events.provided ? '최근 이벤트' : '이 채널은 이벤트 표시가 꺼져 있거나 이벤트 권한이 없습니다.'}</p>
          </div>
          <div class="meta">${events.warning ? '<span class="chip warn">경고</span>' : statusChip(events.warningBadge)}</div>
          <div class="client-copy-actions">
            <button type="button" class="ghost" data-client-copy="events">이벤트 복사</button>
          </div>
        </div>
        <div class="meta">
          ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
        </div>
        <section class="events">${renderEvents(events.recent || [])}</section>
      `;
      bindClientCopyButtons({ view, events });
    }
	    function defaultLiveViewIds() {
	      const ids = [];
	      for (const view of views) {
	        for (let index = 0; index < viewMaxTiles(view) && ids.length < maxLiveTiles; index += 1) {
	          ids.push(view.viewId);
	        }
	      }
	      return ids;
	    }
	    const defaultLiveViewIdList = defaultLiveViewIds();
	    const initialLiveTileCount = Math.min(maxLiveTiles, Math.max(1, Number(localStorage.getItem('mediaServerClientLiveGrid') || 4) || 4));
	    let liveTileCount = initialLiveTileCount;
	    let liveDensity = localStorage.getItem('mediaServerClientLiveDensity') === 'compact' ? 'compact' : 'comfortable';
	    let liveDockSide = localStorage.getItem('mediaServerClientLiveDockSide') === 'right' ? 'right' : 'left';
	    let liveInfoOverlayEnabled = localStorage.getItem('mediaServerClientLiveInfoOverlay') === 'on';
	    const liveTiles = Array.from({ length: maxLiveTiles }, (_, index) => ({
	      index,
	      viewId: defaultLiveViewIdList[index] || '',
	      overlayMode: '',
	      sessionId: '',
      pc: null,
      dataChannel: null,
      iceTimer: null,
      startNonce: 0,
      status: 'offline',
      connectionStatus: 'offline',
      trackCount: null,
      eventCount: null,
      lastMetadataAt: 0,
      lastError: '',
      restartCount: 0,
      stale: false,
      staleNotified: false,
      playbackStats: {
        fps: null,
        bitrateKbps: null,
        droppedFrames: null,
        freezeCount: 0,
        lastBytesReceived: null,
        lastFramesDecoded: null,
        lastTimestamp: null
      }
    }));
    let selectedLiveTile = views.length > 0 ? 0 : null;
    let liveStatusTimer = null;
    let liveDashboardTimer = null;
    let liveDockEventsTimer = null;
    let liveDockEventsNonce = 0;
    let liveBulkNonce = 0;
    let liveDragViewId = '';
    const liveLayoutPreferenceEndpoint = '/client/api/preferences/live-layout';
    const liveLayoutPreferenceSchema = 'media-server.client-live-layout.v1';
    const livePreferenceState = {
      loaded: false,
      saving: false,
      dirty: false,
      userPreference: null,
      rolePreset: null,
      error: ''
    };
    function clampLiveTileCount(value) {
      const parsed = Number(value);
      return Math.min(maxLiveTiles, Math.max(1, Number.isFinite(parsed) ? Math.floor(parsed) : 4));
    }
    function normalizeLiveLayoutPreference(value) {
      if (!value || typeof value !== 'object') return null;
      if (value.schema && value.schema !== liveLayoutPreferenceSchema) return null;
      return value;
    }
    function markLivePreferenceDirty() {
      livePreferenceState.dirty = true;
      updateLiveLayoutPresetStatus();
    }
    function liveLayoutAssignments(preference) {
      if (Array.isArray(preference?.tiles)) return preference.tiles;
      if (Array.isArray(preference?.selectedSources)) {
        return preference.selectedSources.map((item, index) => ({
          slot: Number(item?.slot ?? item?.index ?? index),
          viewId: item?.viewId || item,
          overlayMode: item?.overlayMode || ''
        }));
      }
      return [];
    }
    function applyLiveLayoutPreference(preference, options = {}) {
      const next = normalizeLiveLayoutPreference(preference);
      if (!next) return false;
      const layout = next.workspaceLayout || {};
      const filters = next.filters || {};
      const overlayDefaults = next.overlayDefaults || {};
      const assignments = liveLayoutAssignments(next);
      const bySlot = new Map();
      for (const item of assignments) {
        const slot = Number(item?.slot ?? item?.index);
        if (Number.isFinite(slot) && slot >= 0 && slot < maxLiveTiles) bySlot.set(Math.floor(slot), item);
      }
      const nextCount = clampLiveTileCount(layout.gridSize ?? next.gridSize ?? liveTileCount);
      const nextDensity = layout.density === 'compact' ? 'compact' : 'comfortable';
      const nextDockSide = layout.dockSide === 'right' ? 'right' : 'left';
      const useRoleDefaults = options.useRoleDefaults === true || assignments.length === 0;
      const assignedCounts = new Map();
      liveTileCount = nextCount;
      liveDensity = nextDensity;
      liveDockSide = nextDockSide;
      liveInfoOverlayEnabled = Boolean(overlayDefaults.infoOverlayEnabled);
      for (const tile of liveTiles) {
        const saved = bySlot.get(tile.index);
        const wantedViewId = String(saved?.viewId || (useRoleDefaults ? defaultLiveViewIdList[tile.index] : '') || '');
        const view = viewById(wantedViewId);
        let nextViewId = '';
        if (view) {
          const count = assignedCounts.get(view.viewId) || 0;
          if (count < viewMaxTiles(view)) {
            nextViewId = view.viewId;
            assignedCounts.set(view.viewId, count + 1);
          }
        }
        tile.viewId = nextViewId;
        const modes = allowedOverlayModes(viewById(nextViewId));
        const savedModeValue = String(saved?.overlayMode || '').trim();
        const savedMode = savedModeValue ? normalizeOverlayMode(savedModeValue) : '';
        tile.overlayMode = savedMode && modes.includes(savedMode)
          ? savedMode
          : defaultOverlayModeForView(viewById(nextViewId));
        if (!tile.sessionId) resetTileSignal(tile);
      }
      const nextSelectedTile = Number(filters.selectedTileIndex ?? filters.selectedTile ?? selectedLiveTile ?? 0);
      selectedLiveTile = Math.max(0, Math.min(liveTileCount - 1, Number.isFinite(nextSelectedTile) ? Math.floor(nextSelectedTile) : 0));
      const wantedSelectedView = String(filters.selectedViewId || liveTiles[selectedLiveTile]?.viewId || '');
      selectedViewId = viewById(wantedSelectedView)?.viewId || liveTiles[selectedLiveTile]?.viewId || views[0]?.viewId || '';
      localStorage.setItem('mediaServerClientLiveGrid', String(liveTileCount));
      localStorage.setItem('mediaServerClientLiveDensity', liveDensity);
      localStorage.setItem('mediaServerClientLiveDockSide', liveDockSide);
      localStorage.setItem('mediaServerClientLiveInfoOverlay', liveInfoOverlayEnabled ? 'on' : 'off');
      livePreferenceState.dirty = false;
      return true;
    }
    function liveCurrentLayoutSnapshot() {
      return {
        schema: liveLayoutPreferenceSchema,
        presetType: 'user',
        workspaceLayout: {
          gridSize: liveTileCount,
          density: liveDensity,
          dockSide: liveDockSide
        },
        filters: {
          eventFeed: 'selected-tile',
          selectedTileIndex: selectedLiveTile === null ? 0 : selectedLiveTile,
          selectedViewId: selectedViewId || ''
        },
        overlayDefaults: {
          infoOverlayEnabled: liveInfoOverlayEnabled
        },
        selectedSources: visibleLiveTiles().map(tile => ({
          slot: tile.index,
          viewId: tile.viewId || '',
          overlayMode: tile.overlayMode || ''
        })),
        tiles: visibleLiveTiles().map(tile => ({
          slot: tile.index,
          viewId: tile.viewId || '',
          overlayMode: tile.overlayMode || '',
          selected: selectedLiveTile === tile.index
        }))
      };
    }
    async function loadLiveLayoutPreferences() {
      const payload = await requestJson(liveLayoutPreferenceEndpoint);
      livePreferenceState.loaded = true;
      livePreferenceState.error = '';
      livePreferenceState.rolePreset = normalizeLiveLayoutPreference(payload.rolePreset);
      livePreferenceState.userPreference = normalizeLiveLayoutPreference(payload.userPreference);
      if (livePreferenceState.userPreference) {
        applyLiveLayoutPreference(livePreferenceState.userPreference);
      } else if (livePreferenceState.rolePreset) {
        applyLiveLayoutPreference(livePreferenceState.rolePreset, { useRoleDefaults: true });
      }
      return payload;
    }
    function updateLiveLayoutPresetStatus(text = '') {
      const status = document.querySelector('[data-role="layout-preset-status"]');
      if (!status) return;
      if (text) {
        status.textContent = text;
        return;
      }
      if (livePreferenceState.saving) {
        status.textContent = '저장 중';
      } else if (livePreferenceState.error) {
        status.textContent = '로컬 설정';
      } else if (livePreferenceState.dirty) {
        status.textContent = '저장 안 됨';
      } else if (livePreferenceState.userPreference) {
        status.textContent = '사용자 저장값';
      } else if (livePreferenceState.rolePreset) {
        status.textContent = '권한 기본값';
      } else {
        status.textContent = '브라우저 기본값';
      }
    }
    async function saveLiveLayoutPreference() {
      const button = document.querySelector('#liveSaveLayoutPreference');
      const snapshot = liveCurrentLayoutSnapshot();
      livePreferenceState.saving = true;
      if (button) button.disabled = true;
      updateLiveLayoutPresetStatus();
      try {
        const payload = await requestJson(liveLayoutPreferenceEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot)
        });
        livePreferenceState.loaded = true;
        livePreferenceState.error = '';
        livePreferenceState.rolePreset = normalizeLiveLayoutPreference(payload.rolePreset) || livePreferenceState.rolePreset;
        livePreferenceState.userPreference = normalizeLiveLayoutPreference(payload.userPreference) || snapshot;
        livePreferenceState.dirty = false;
        updateLiveLayoutPresetStatus('저장됨');
        showToast?.('라이브 레이아웃을 저장했습니다.');
      } catch (error) {
        livePreferenceState.error = error.message || 'layout preference save failed';
        updateLiveLayoutPresetStatus('저장 실패');
        showToast?.(error.message || '레이아웃을 저장하지 못했습니다.', true);
      } finally {
        livePreferenceState.saving = false;
        if (button) button.disabled = false;
        setTimeout(() => updateLiveLayoutPresetStatus(), 1200);
      }
    }
    async function applyStoredLiveLayout(kind) {
      const preference = kind === 'role' ? livePreferenceState.rolePreset : livePreferenceState.userPreference;
      if (!preference) return;
      await stopAllLiveTiles();
      applyLiveLayoutPreference(preference, { useRoleDefaults: kind === 'role' });
      renderLiveMonitor();
      updateLiveLayoutPresetStatus(kind === 'role' ? '권한 기본값' : '사용자 저장값');
    }
	    function tileView(tile) {
	      return viewById(tile?.viewId || '');
	    }
	    function visibleLiveTiles() {
	      return liveTiles.slice(0, liveTileCount);
	    }
	    function assignedTileCountForView(viewId, excludingIndex = -1) {
	      if (!viewId) return 0;
	      return visibleLiveTiles().filter(tile => tile.index !== excludingIndex && tile.viewId === viewId).length;
	    }
	    function activeTileCountForView(viewId, excludingIndex = -1) {
	      if (!viewId) return 0;
	      return visibleLiveTiles().filter(tile => tile.index !== excludingIndex && tile.viewId === viewId && tile.sessionId).length;
	    }
	    function viewAssignmentLimitReached(view, tileIndex) {
	      return Boolean(view) && assignedTileCountForView(view.viewId, tileIndex) >= viewMaxTiles(view);
	    }
	    function viewActiveLimitReached(view, tileIndex) {
	      return Boolean(view) && activeTileCountForView(view.viewId, tileIndex) >= viewMaxTiles(view);
	    }
	    function liveViewOptionsHtml(tile) {
	      return [
	        `<option value=""${tile.viewId ? '' : ' selected'}>채널 선택</option>`,
	        ...views.map(view => {
	          const selected = tile.viewId === view.viewId;
	          const disabled = !selected && !tile.sessionId && viewAssignmentLimitReached(view, tile.index);
	          return `<option value="${escapeHtml(view.viewId)}"${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(view.displayName || view.viewId)} · 최대 ${viewMaxTiles(view)}개</option>`;
	        })
	      ].join('');
	    }
	    function updateTileViewSelect(tile) {
	      const root = document.querySelector(`[data-tile="${tile.index}"]`);
	      const select = root?.querySelector('[data-role="view"]');
	      if (select) {
	        select.innerHTML = liveViewOptionsHtml(tile);
	        select.value = tile.viewId || '';
	        select.disabled = Boolean(tile.sessionId);
	      }
	      updateLiveSourceTreeState();
	    }
	    function updateLiveSourceTreeState() {
	      const selectedTile = selectedLiveTile === null ? null : liveTiles[selectedLiveTile];
	      document.querySelectorAll('[data-source-view]').forEach(node => {
	        const viewId = node.dataset.sourceView || '';
	        const view = viewById(viewId);
	        const assigned = assignedTileCountForView(viewId);
	        const max = viewMaxTiles(view);
	        node.classList.toggle('active', viewId === selectedViewId);
	        node.classList.toggle('assigned', assigned > 0);
	        node.classList.toggle('limit-reached', Boolean(view) && assigned >= max && selectedTile?.viewId !== viewId);
	        node.setAttribute('aria-selected', viewId === selectedViewId ? 'true' : 'false');
	        node.setAttribute('aria-disabled', Boolean(view) && assigned >= max && selectedTile?.viewId !== viewId ? 'true' : 'false');
	        const count = node.querySelector('[data-role="assigned-count"]');
	        if (count) count.textContent = `${assigned}/${max}`;
	      });
	    }
	    function updateVisibleLiveTileControls() {
	      for (const tile of visibleLiveTiles()) {
	        updateTileViewSelect(tile);
	        applyTileModeOptions(tile);
	        updateTileDom(tile);
	      }
	    }
	    function clientSessionUrl(tile, suffix = '') {
	      return `/client/api/views/${encodeURIComponent(tile.viewId || '')}/webrtc/session/${encodeURIComponent(tile.sessionId || '')}${suffix}`;
	    }
    function defaultOverlayModeForView(view) {
      const modes = allowedOverlayModes(view);
      if (requestedClientOverlayMode && String(view?.viewId || '') === String(selectedViewId || '') && modes.includes(requestedClientOverlayMode)) {
        return requestedClientOverlayMode;
      }
      return modes.includes('va-overlay') ? 'va-overlay' : (modes.includes('raw') ? 'raw' : (modes[0] || ''));
    }
    function tileRuleId(view) {
      return requestedRuleIdForView(view);
    }
    function tileStatusClass(value) {
      if (['offline', 'disconnected', 'stale', 'failed', 'error'].includes(String(value))) return ' warn';
      if (['unavailable', '미제공'].includes(String(value))) return ' bad';
      return '';
    }
    function liveTileConnectionLabel(tile) {
      const value = String(tile?.connectionStatus || '');
      if (!tile?.sessionId && (!value || ['offline', 'closed', 'disconnected'].includes(value))) return '연결 끊김';
      if (value === 'offline') return '연결 끊김';
      if (value === 'metadata') return '연결됨';
      return clientStatusLabel(value);
    }
    function liveTileA11yStatus(tile, view, statusLabel, metadataLabel) {
      const viewLabel = view?.displayName || view?.viewId || '소스 없음';
      return clientDynamicText([
        `타일 ${tile.index + 1}: ${viewLabel}`,
        `상태 ${statusLabel}`,
        `연결 ${liveTileConnectionLabel(tile)}`,
        `트랙 ${display(tile.trackCount)}`,
        `이벤트 ${display(tile.eventCount)}`,
        `메타데이터 ${metadataLabel}`,
        `재시도 ${tile.restartCount || 0}`
      ].join(' · '));
    }
    function tileInfoOverlayVisible(tile) {
      return Boolean(tile) && liveInfoOverlayEnabled;
    }
    function syncLiveInfoOverlayToggle() {
      const toggle = document.querySelector('#liveInfoOverlayToggle');
      const wrapper = toggle?.closest('.live-info-toggle');
      if (!toggle || !wrapper) return;
      toggle.checked = liveInfoOverlayEnabled;
      const label = liveInfoOverlayEnabled ? '정보 오버레이 숨김' : '정보 오버레이 표시';
      toggle.setAttribute('aria-label', label);
      wrapper.title = label;
    }
    function playbackNumber(value, suffix = '') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '미제공';
      return `${Math.max(0, Math.round(numeric))}${suffix}`;
    }
    function playbackBadge(tile, events) {
      if (events?.warning || Number(tile?.eventCount || 0) > 0) return 'event';
      if (Number(tile?.trackCount || 0) > 0) return 'VA';
      return '대기';
    }
    function updateTileDom(tile) {
      const root = document.querySelector(`[data-tile="${tile.index}"]`);
      if (!root) return;
      root.classList.toggle('selected', selectedLiveTile === tile.index);
      const view = tileView(tile);
      const status = tile.status || 'offline';
      const stale = tile.lastMetadataAt && Date.now() - tile.lastMetadataAt > 5000;
      if (stale && !tile.staleNotified) {
        tile.playbackStats.freezeCount = Number(tile.playbackStats.freezeCount || 0) + 1;
      }
      tile.staleNotified = Boolean(stale);
      tile.stale = Boolean(stale);
      const statusLabel = stale ? '지연' : ({
        offline: '오프라인',
        connecting: '연결 중',
        live: '온라인',
        error: '오류'
      })[String(status)] || status;
      const viewLabel = view?.displayName || view?.viewId || '소스 없음';
      const metadataLabel = stale ? '지연' : (tile.sessionId ? '정상' : '미제공');
      const a11yStatus = liveTileA11yStatus(tile, view, statusLabel, metadataLabel);
      root.dataset.viewId = tile.viewId || '';
      root.setAttribute('aria-label', clientDynamicText(`타일 ${tile.index + 1}: ${viewLabel} · ${statusLabel}`));
      root.setAttribute('aria-current', selectedLiveTile === tile.index ? 'true' : 'false');
      root.querySelector('[data-role="status"]').textContent = clientDynamicText(statusLabel);
      root.querySelector('[data-role="status"]').className = `chip tile-status-pill${tileStatusClass(stale ? 'stale' : status)}`;
      const viewLabelNode = root.querySelector('[data-role="view-label"]');
      if (viewLabelNode) viewLabelNode.textContent = viewLabel;
      const sourceMetaNode = root.querySelector('[data-role="source-meta"]');
      if (sourceMetaNode) sourceMetaNode.textContent = view ? `${sourceKindLabel(view.sourceKind, view)} · 최대 ${viewMaxTiles(view)}개` : '소스를 타일에 드롭';
      root.querySelector('[data-role="connection"]').textContent = clientDynamicText(liveTileConnectionLabel(tile));
      root.querySelector('[data-role="tracks"]').textContent = display(tile.trackCount);
      root.querySelector('[data-role="events"]').textContent = display(tile.eventCount);
      root.querySelector('[data-role="stale"]').textContent = metadataLabel;
      const restarts = root.querySelector('[data-role="restarts"]');
      if (restarts) restarts.textContent = String(tile.restartCount || 0);
      const a11y = root.querySelector('[data-role="a11y-status"]');
      if (a11y) a11y.textContent = a11yStatus;
      const placeholder = root.querySelector('[data-role="placeholder"]');
      if (placeholder) placeholder.textContent = tile.lastError || clientStatusLabel(tile.connectionStatus || status);
      const infoOverlay = root.querySelector('[data-role="info-overlay"]');
      if (infoOverlay) {
        const visible = tileInfoOverlayVisible(tile);
        infoOverlay.hidden = !visible;
        root.dataset.infoOverlay = visible ? 'visible' : 'hidden';
        const stats = tile.playbackStats || {};
        const setOverlayText = (role, value) => {
          const node = infoOverlay.querySelector(`[data-overlay="${role}"]`);
          if (node) node.textContent = value;
        };
        setOverlayText('title', viewLabel);
        setOverlayText('connection', clientDynamicText(liveTileConnectionLabel(tile)));
        setOverlayText('fps', playbackNumber(stats.fps, ' fps'));
        setOverlayText('bitrate', playbackNumber(stats.bitrateKbps, ' kbps'));
        setOverlayText('dropped', playbackNumber(stats.droppedFrames));
        setOverlayText('freeze', tile.stale ? '지연' : playbackNumber(stats.freezeCount));
        setOverlayText('reconnect', playbackNumber(tile.restartCount || 0));
        setOverlayText('badge', playbackBadge(tile, { warning: Number(tile.eventCount || 0) > 0 }));
      }
	      root.querySelector('[data-role="placeholder"]').hidden = Boolean(tile.sessionId);
	      const playbackBtn = root.querySelector('[data-action="toggle-playback"]');
	      const restartBtn = root.querySelector('[data-action="restart"]');
	      if (playbackBtn) {
	        const limitReached = viewActiveLimitReached(view, tile.index);
	        const playing = Boolean(tile.sessionId);
	        const actionLabel = playing ? `타일 ${tile.index + 1} 정지` : `타일 ${tile.index + 1} 재생`;
	        playbackBtn.disabled = !view || (!playing && limitReached);
	        playbackBtn.title = clientDynamicText(limitReached && !playing ? `이 채널은 최대 ${viewMaxTiles(view)}개 타일까지만 동시에 재생할 수 있습니다.` : actionLabel);
	        playbackBtn.setAttribute('aria-label', clientDynamicText(actionLabel));
	        playbackBtn.querySelector('[data-role="tile-playback-icon"]').textContent = playing ? '■' : '▶';
	      }
	      if (restartBtn) restartBtn.disabled = !view;
	      updateLiveSourceTreeState();
	      updateLiveSummary();
	    }
    function updateAllTileDom() {
      for (const tile of liveTiles) updateTileDom(tile);
    }
    function applyTileModeOptions(tile) {
      const root = document.querySelector(`[data-tile="${tile.index}"]`);
      if (!root) return;
      const view = tileView(tile);
      const modes = allowedOverlayModes(view);
      if (!modes.includes(tile.overlayMode)) {
        tile.overlayMode = defaultOverlayModeForView(view);
      }
      const select = root.querySelector('[data-role="mode"]');
      if (select) {
        setSelectOptions(select, modes.map(mode => ({ value: mode, label: overlayLabel(mode) })));
        select.value = tile.overlayMode || '';
        select.disabled = Boolean(tile.sessionId) || modes.length === 0;
        const wrap = root.querySelector('[data-role="mode-wrap"]');
        if (wrap) wrap.hidden = modes.length <= 1;
      }
      const modeButtons = Array.from(root.querySelectorAll('[data-mode-action]'));
      const buttonWrap = root.querySelector('[data-role="mode-buttons"]');
      if (buttonWrap) buttonWrap.hidden = modes.length <= 1;
      for (const button of modeButtons) {
        const mode = normalizeOverlayMode(button.dataset.modeAction || '');
        const available = modes.includes(mode);
        button.hidden = !available;
        button.disabled = !available;
        button.setAttribute('aria-pressed', tile.overlayMode === mode ? 'true' : 'false');
      }
    }
    async function setTileOverlayMode(index, mode) {
      const tile = liveTiles[index];
      const view = tileView(tile);
      const nextMode = normalizeOverlayMode(mode);
      if (!tile || !view || !nextMode) return;
      const modes = allowedOverlayModes(view);
      if (!modes.includes(nextMode) || tile.overlayMode === nextMode) return;
      tile.overlayMode = nextMode;
      markLivePreferenceDirty();
      applyTileModeOptions(tile);
      refreshSelectedTileDetail();
      if (tile.sessionId) {
        await restartLiveTile(index);
      } else {
        updateTileDom(tile);
      }
    }
    async function toggleLiveTilePlayback(index) {
      const tile = liveTiles[index];
      if (!tile) return;
      if (tile.sessionId) {
        await stopLiveTile(index);
        return;
      }
      await startLiveTile(index);
    }
	    function resetTileSignal(tile) {
	      tile.trackCount = null;
	      tile.eventCount = null;
	      tile.lastMetadataAt = 0;
	      tile.lastError = '';
	      tile.status = 'offline';
	      tile.connectionStatus = 'offline';
	      tile.stale = false;
	      tile.staleNotified = false;
	      tile.playbackStats = {
	        fps: null,
	        bitrateKbps: null,
	        droppedFrames: null,
	        freezeCount: 0,
	        lastBytesReceived: null,
	        lastFramesDecoded: null,
	        lastTimestamp: null
	      };
	    }
	    function clearLiveTileSlot(tile) {
	      if (!tile) return;
	      tile.viewId = '';
	      tile.overlayMode = '';
	      resetTileSignal(tile);
	    }
	    async function assignViewToTile(index, viewId, options = {}) {
	      const tile = liveTiles[index];
	      const nextView = viewById(viewId || '');
	      if (!tile || !nextView) return false;
	      if (viewAssignmentLimitReached(nextView, index) && tile.viewId !== nextView.viewId) {
	        tile.status = 'error';
	        tile.connectionStatus = `최대 ${viewMaxTiles(nextView)}개`;
	        updateTileViewSelect(tile);
	        updateTileDom(tile);
	        refreshSelectedTileDetail();
	        return false;
	      }
	      if (tile.sessionId) {
	        await stopLiveTile(index, { keepError: true });
	      }
	      tile.viewId = nextView.viewId || '';
	      tile.overlayMode = defaultOverlayModeForView(nextView);
	      resetTileSignal(tile);
	      selectedViewId = tile.viewId || selectedViewId;
	      selectLiveTile(index);
	      applyTileModeOptions(tile);
	      updateTileDom(tile);
	      updateVisibleLiveTileControls();
	      refreshSelectedTileDetail();
	      markLivePreferenceDirty();
	      if (options.start !== false) {
	        await startLiveTile(index);
	      }
	      return true;
	    }
	    function setTileView(index, viewId) {
	      assignViewToTile(index, viewId, { start: false }).catch(error => {
	        const tile = liveTiles[index];
	        if (!tile) return;
	        tile.status = 'error';
	        tile.connectionStatus = error.message || 'error';
	        tile.lastError = error.message || 'error';
	        updateTileDom(tile);
	      });
	    }
	    function selectedAssignmentTileIndex() {
	      if (selectedLiveTile !== null && selectedLiveTile < liveTileCount) return selectedLiveTile;
	      return liveTileCount > 0 ? 0 : null;
	    }
	    async function assignSourceToSelectedTile(viewId) {
	      const index = selectedAssignmentTileIndex();
	      if (index === null) return false;
	      return assignViewToTile(index, viewId, { start: true });
	    }
	    function liveGridOptionLabel(count) {
	      return count === 1 ? '1개' : count === 2 ? '1x2' : count === 4 ? '2x2' : count === 6 ? '2x3' : '3x3';
	    }
	    function liveGridOptionsHtml() {
	      return [1, 2, 4, 6, 9]
	        .filter(count => count <= maxLiveTiles)
	        .map(count => `<option value="${count}"${count === liveTileCount ? ' selected' : ''}>${liveGridOptionLabel(count)}</option>`)
	        .join('');
	    }
	    function liveTreeLabel(view, candidates, fallback) {
	      for (const key of candidates) {
	        const value = String(view?.[key] || '').trim();
	        if (value) return value;
	      }
	      return fallback;
	    }
	    function liveSourceTreeGroups() {
	      const siteMap = new Map();
	      for (const view of views) {
	        const site = liveTreeLabel(view, ['site', 'siteName', 'group', 'groupName', 'locationName'], '기본 사이트');
	        const floor = liveTreeLabel(view, ['floor', 'floorName', 'zone', 'zoneName'], sourceKindLabel(view.sourceKind, view));
	        if (!siteMap.has(site)) siteMap.set(site, new Map());
	        const floorMap = siteMap.get(site);
	        if (!floorMap.has(floor)) floorMap.set(floor, []);
	        floorMap.get(floor).push(view);
	      }
	      return Array.from(siteMap.entries()).map(([site, floorMap]) => ({
	        site,
	        floors: Array.from(floorMap.entries()).map(([floor, items]) => ({ floor, items }))
	      }));
	    }
	    function liveSourceNodesHtml(items) {
	      return items.map(view => `
	        <button class="live-source-node${view.viewId === selectedViewId ? ' active' : ''}" type="button" role="treeitem" draggable="true" data-source-view="${escapeHtml(view.viewId)}" aria-selected="${view.viewId === selectedViewId ? 'true' : 'false'}">
	          <span class="live-source-title">${escapeHtml(view.displayName || view.viewId)}</span>
	          <span class="live-source-meta">
	            <span>${escapeHtml(sourceKindLabel(view.sourceKind, view))}</span>
	            <span data-role="assigned-count">0/${viewMaxTiles(view)}</span>
	          </span>
	        </button>
	      `).join('');
	    }
	    function liveSourceTreeHtml() {
	      const groups = liveSourceTreeGroups();
	      return `
	        <aside class="live-source-dock" data-testid="client-live-source-tree" aria-label="라이브 소스 트리">
	          <div class="live-source-dock-head">
	            <div>
	              <h3>카메라</h3>
	              <p>타일에 드롭해 바로 배치합니다.</p>
	            </div>
	            <span class="chip">${views.length}</span>
	          </div>
            <div class="live-source-search" role="search">
              <input id="liveSourceSearch" type="search" placeholder="카메라 검색" aria-label="카메라 검색" />
              <span aria-hidden="true">⌕</span>
            </div>
	          <div class="live-source-tree" role="tree" data-tree-model="group/site/floor/source">
	            ${groups.map(group => `
	              <details class="live-source-group" data-tree-level="site" open>
	                <summary>${escapeHtml(group.site)} <span>${group.floors.reduce((sum, floor) => sum + floor.items.length, 0)}</span></summary>
	                ${group.floors.map(floor => `
	                  <details class="live-source-group live-source-floor" data-tree-level="floor" open>
	                    <summary>${escapeHtml(floor.floor)} <span>${floor.items.length}</span></summary>
	                    <div class="live-source-leaves" role="group">
	                      ${liveSourceNodesHtml(floor.items)}
	                    </div>
	                  </details>
	                `).join('')}
	              </details>
	            `).join('')}
	          </div>
	          <section class="live-dock-event-feed" data-testid="client-live-dock-event-feed" data-redaction="viewer-safe-events" aria-live="polite">
	            <div class="live-dock-event-head">
	              <h3>이벤트</h3>
	              <span class="chip" data-role="event-feed-status">대기</span>
	            </div>
	            <div id="liveDockEvents">${emptyState('최근 이벤트 없음', '선택한 소스의 viewer-safe 이벤트만 표시됩니다.')}</div>
	          </section>
	        </aside>
	      `;
	    }
	    function liveSummaryCounts() {
	      const tiles = visibleLiveTiles();
	      return {
	        total: tiles.length,
	        live: tiles.filter(tile => tile.sessionId && tile.status === 'live').length,
	        connecting: tiles.filter(tile => tile.status === 'connecting').length,
	        stale: tiles.filter(tile => tile.stale).length,
	        offline: tiles.filter(tile => !tile.sessionId).length
	      };
	    }
	    function updateLiveSummary() {
	      const summary = document.querySelector('#liveSummary');
	      if (!summary) return;
	      const counts = liveSummaryCounts();
	      const set = (role, value) => {
	        const el = summary.querySelector(`[data-summary="${role}"]`);
	        if (el) el.textContent = String(value);
	      };
	      set('total', counts.total);
	      set('live', counts.live);
	      set('connecting', counts.connecting);
	      set('stale', counts.stale);
	      set('offline', counts.offline);
	    }
	    function liveTileHtml(tile) {
	      return `
	        <article class="tile live-sketch-tile live-drop-tile${selectedLiveTile === tile.index ? ' selected' : ''}" data-tile="${tile.index}" data-view-id="${escapeHtml(tile.viewId || '')}" data-drop-state="idle" tabindex="0" role="group" aria-label="타일 ${tile.index + 1}: 라이브" aria-describedby="liveTileStatus${tile.index}" aria-current="${selectedLiveTile === tile.index ? 'true' : 'false'}">
	          <div class="tile-stage">
	            <video playsinline muted autoplay></video>
	            <div class="tile-head">
	              <div class="tile-title">
	                <span class="tile-presence-dot" aria-hidden="true"></span>
	                <h3 data-role="view-label">${escapeHtml(tileView(tile)?.displayName || tile.viewId || `타일 ${tile.index + 1}`)}</h3>
	              </div>
	              <div class="tile-actions" aria-label="타일 ${tile.index + 1} 작업">
	                <span class="chip tile-status-pill" data-role="status">오프라인</span>
	                <div class="tile-mode-controls" data-testid="client-live-va-overlay-toggle" data-role="mode-buttons" aria-label="타일 ${tile.index + 1} VA 오버레이" hidden>
	                  <button type="button" class="tile-mode-button" data-mode-action="raw" aria-pressed="false" title="원본">원본</button>
	                  <button type="button" class="tile-mode-button" data-mode-action="va-overlay" aria-pressed="false" title="VA 오버레이">VA</button>
	                  <button type="button" class="tile-mode-button" data-mode-action="va-rule" aria-pressed="false" title="VA 룰">VA 룰</button>
	                </div>
	                <button type="button" class="icon-button tile-action-primary" data-action="toggle-playback" title="타일 ${tile.index + 1} 재생" aria-label="타일 ${tile.index + 1} 재생"><span data-role="tile-playback-icon" aria-hidden="true">▶</span></button>
	                <button type="button" class="icon-button" data-action="restart" title="타일 ${tile.index + 1} 새로고침" aria-label="타일 ${tile.index + 1} 새로고침"><span aria-hidden="true">↻</span></button>
	                <button type="button" class="icon-button" data-action="stop" data-disconnect-scope="tile" title="타일 ${tile.index + 1} 연결 해제" aria-label="타일 ${tile.index + 1} 연결 해제"><span aria-hidden="true">⏹</span></button>
	              </div>
	            </div>
	            <div class="tile-controls">
	              <div class="tile-assignment" data-role="assignment">
	                <span>배치 소스</span>
	                <strong>${escapeHtml(tileView(tile)?.displayName || tile.viewId || '소스 없음')}</strong>
	                <small data-role="source-meta">${tile.viewId ? escapeHtml(sourceKindLabel(tileView(tile)?.sourceKind, tileView(tile))) : '소스를 타일에 드롭'}</small>
	              </div>
	              <label data-role="mode-wrap">보기 방식
	                <select data-role="mode" aria-label="타일 ${tile.index + 1} 보기 방식"></select>
	              </label>
	            </div>
	            <span data-role="placeholder">오프라인</span>
	            <div class="tile-info-overlay" data-testid="client-live-tile-info-overlay" data-role="info-overlay" data-overlay-trigger="info-toggle" hidden>
	              <div class="tile-info-overlay-head">
	                <strong data-overlay="title">소스 없음</strong>
	                <span data-overlay="connection">연결 끊김</span>
	              </div>
	              <div class="tile-info-overlay-grid">
	                <span>FPS <strong data-overlay="fps">미제공</strong></span>
	                <span>비트레이트 <strong data-overlay="bitrate">미제공</strong></span>
	                <span>드롭 <strong data-overlay="dropped">미제공</strong></span>
	                <span>프리즈 <strong data-overlay="freeze">미제공</strong></span>
	                <span>재연결 <strong data-overlay="reconnect">0</strong></span>
	                <span>VA/이벤트 <strong data-overlay="badge">대기</strong></span>
	              </div>
	            </div>
	          </div>
	          <div class="tile-status">
	            <div class="metric"><span>연결</span><strong data-role="connection">offline</strong></div>
	            <div class="metric"><span>트랙</span><strong data-role="tracks">미제공</strong></div>
	            <div class="metric"><span>이벤트</span><strong data-role="events">미제공</strong></div>
	            <div class="metric"><span>상태</span><strong data-role="stale">미제공</strong></div>
	            <div class="metric"><span>재시도</span><strong data-role="restarts">0</strong></div>
	          </div>
	          <p id="liveTileStatus${tile.index}" class="sr-only" data-role="a11y-status" aria-live="polite" aria-atomic="true">타일 ${tile.index + 1}: 라이브</p>
	        </article>
	      `;
	    }
	    function liveMonitorHtml() {
	      return `
	        <div class="live-monitor live-sketch-monitor" data-testid="client-live-action-reduction" data-action-model="source-drag,tile-selection,icon-actions,keyboard-shortcuts" data-disconnect-contract="tile-disconnect-clears-slot,workspace-disconnect-keeps-layout">
	          <div class="live-workspace-layout live-sketch-layout" data-testid="client-live-workspace" data-workspace-model="source-tree,drag-drop-grid,multi-source" data-dock-side="${escapeHtml(liveDockSide)}">
	            ${liveSourceTreeHtml()}
	            <section class="live-workspace-main live-sketch-workspace" aria-label="라이브 워크스페이스">
	          <div class="live-toolbar live-sketch-toolbar">
	            <div class="live-workspace-title">
	              <h2>라이브 워크스페이스</h2>
	            </div>
	            <label>그리드
	              <select id="liveGridSize" aria-label="그리드">
	                ${liveGridOptionsHtml()}
	              </select>
	            </label>
	            <label>밀도
	              <select id="liveDensity" aria-label="밀도">
	                <option value="comfortable"${liveDensity === 'comfortable' ? ' selected' : ''}>표준</option>
	                <option value="compact"${liveDensity === 'compact' ? ' selected' : ''}>고밀도</option>
	              </select>
	            </label>
	            <label>도크
	              <select id="liveDockSide" aria-label="소스 도크 위치">
	                <option value="left"${liveDockSide === 'left' ? ' selected' : ''}>왼쪽</option>
	                <option value="right"${liveDockSide === 'right' ? ' selected' : ''}>오른쪽</option>
	              </select>
	            </label>
	            <label class="live-info-toggle" title="${liveInfoOverlayEnabled ? '정보 오버레이 숨김' : '정보 오버레이 표시'}">
	              <input id="liveInfoOverlayToggle" type="checkbox" aria-label="${liveInfoOverlayEnabled ? '정보 오버레이 숨김' : '정보 오버레이 표시'}"${liveInfoOverlayEnabled ? ' checked' : ''} />
	              <span aria-hidden="true">i</span>
	            </label>
	            <div id="liveCopyActions" class="client-copy-actions live-copy-actions" data-live-copy-actions>
	              <button type="button" class="ghost" data-client-copy="status">상태 복사</button>
	              <button type="button" class="ghost" data-client-copy="events">이벤트 복사</button>
	            </div>
	            <details class="workspace-actions">
	              <summary aria-label="워크스페이스 작업">작업</summary>
                <div class="live-layout-presets" data-testid="client-live-layout-presets" data-preset-contract="user-preference,role-preset" data-preference-endpoint="${liveLayoutPreferenceEndpoint}">
                  <span class="chip" data-role="layout-preset-status">확인 중</span>
                  <button id="liveSaveLayoutPreference" class="ghost" type="button">레이아웃 저장</button>
                  <button id="liveApplyUserLayoutPreference" class="ghost" type="button"${livePreferenceState.userPreference ? '' : ' disabled'}>저장 복원</button>
                  <button id="liveApplyRoleLayoutPreset" class="ghost" type="button"${livePreferenceState.rolePreset ? '' : ' disabled'}>권한 기본</button>
                </div>
	              <button id="liveAllStop" class="ghost danger" type="button">전체 연결 해제</button>
	            </details>
	          </div>
	          <div class="summary live-summary-rail" id="liveSummary">
	            <div class="metric"><span>타일</span><strong data-summary="total">0</strong></div>
	            <div class="metric"><span>라이브</span><strong data-summary="live">0</strong></div>
	            <div class="metric"><span>연결 중</span><strong data-summary="connecting">0</strong></div>
	            <div class="metric"><span>지연</span><strong data-summary="stale">0</strong></div>
	            <div class="metric"><span>오프라인</span><strong data-summary="offline">0</strong></div>
	          </div>
	              <section class="detail-box live-selected-detail" id="liveSelectedDetail">${emptyState('타일을 선택하세요', '선택한 타일의 연결, 메타데이터, 이벤트 상태가 여기에 표시됩니다.')}</section>
	              <div class="live-grid" data-testid="client-live-drop-grid" data-grid-size="${liveTileCount}" data-density="${escapeHtml(liveDensity)}">
	                ${liveTiles.slice(0, liveTileCount).map(liveTileHtml).join('')}
	              </div>
	            </section>
	          </div>
	        </div>
	      `;
	    }
	    function bindLiveTile(tile) {
	      const root = document.querySelector(`[data-tile="${tile.index}"]`);
	      if (!root) return;
	      const viewSelect = root.querySelector('[data-role="view"]');
	      if (viewSelect) {
	        updateTileViewSelect(tile);
	        viewSelect.addEventListener('change', () => setTileView(tile.index, viewSelect.value));
	      }
	      const modeSelect = root.querySelector('[data-role="mode"]');
	      if (modeSelect) {
	        modeSelect.addEventListener('change', () => {
	          setTileOverlayMode(tile.index, modeSelect.value).catch(error => {
	            tile.status = 'error';
	            tile.connectionStatus = error.message || 'error';
	            tile.lastError = error.message || 'error';
	            updateTileDom(tile);
	          });
	        });
	      }
	      root.querySelectorAll('[data-mode-action]').forEach(button => {
	        button.addEventListener('click', () => {
	          setTileOverlayMode(tile.index, button.dataset.modeAction || '').catch(error => {
	            tile.status = 'error';
	            tile.connectionStatus = error.message || 'error';
	            tile.lastError = error.message || 'error';
	            updateTileDom(tile);
	          });
	        });
	      });
	      root.querySelector('[data-action="toggle-playback"]')?.addEventListener('click', () => {
	        toggleLiveTilePlayback(tile.index).catch(error => {
	          tile.status = 'error';
	          tile.connectionStatus = error.message || 'error';
	          tile.lastError = error.message || 'error';
	          updateTileDom(tile);
	        });
	      });
	      root.querySelector('[data-action="restart"]')?.addEventListener('click', () => restartLiveTile(tile.index));
	      root.querySelector('[data-action="stop"]')?.addEventListener('click', () => disconnectLiveTile(tile.index));
	      root.addEventListener('dragenter', event => {
	        const viewId = event.dataTransfer?.getData('text/plain') || liveDragViewId;
	        if (!viewId || !viewById(viewId)) return;
	        event.preventDefault();
	        root.dataset.dropState = 'over';
	      });
	      root.addEventListener('dragover', event => {
	        const viewId = event.dataTransfer?.getData('text/plain') || liveDragViewId;
	        if (!viewId || !viewById(viewId)) return;
	        event.preventDefault();
	        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	        root.dataset.dropState = 'over';
	      });
	      root.addEventListener('dragleave', event => {
	        if (root.contains(event.relatedTarget)) return;
	        root.dataset.dropState = 'idle';
	      });
	      root.addEventListener('drop', event => {
	        const viewId = event.dataTransfer?.getData('text/plain') || liveDragViewId;
	        if (!viewId || !viewById(viewId)) return;
	        event.preventDefault();
	        root.dataset.dropState = 'idle';
	        assignViewToTile(tile.index, viewId, { start: true }).catch(error => {
	          tile.status = 'error';
	          tile.connectionStatus = error.message || 'error';
	          tile.lastError = error.message || 'error';
	          updateTileDom(tile);
	        });
	      });
	      root.addEventListener('keydown', event => {
	        if (event.target !== root) return;
	        if (event.key === 'Enter' || event.key === ' ') {
	          event.preventDefault();
	          selectLiveTile(tile.index);
	          return;
	        }
	        if (event.key === 's' || event.key === 'S') {
	          event.preventDefault();
	          toggleLiveTilePlayback(tile.index);
	          return;
	        }
	        if (event.key === 'r' || event.key === 'R') {
	          event.preventDefault();
	          restartLiveTile(tile.index);
	          return;
	        }
	        if (event.key === 'Delete' || event.key === 'Backspace') {
	          event.preventDefault();
	          disconnectLiveTile(tile.index);
	          return;
	        }
	        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
	          event.preventDefault();
	          focusLiveTile(tile.index + 1);
	          return;
	        }
	        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
	          event.preventDefault();
	          focusLiveTile(tile.index - 1);
	          return;
	        }
	        if (event.key === 'Home') {
	          event.preventDefault();
	          focusLiveTile(0);
	          return;
	        }
	        if (event.key === 'End') {
	          event.preventDefault();
	          focusLiveTile(liveTileCount - 1);
	        }
	      });
	      root.addEventListener('click', event => {
	        if (!event.target.closest('button') && !event.target.closest('select')) {
	          selectLiveTile(tile.index);
	        }
	      });
	      applyTileModeOptions(tile);
	      updateTileDom(tile);
	    }
	    function bindLiveSourceTree() {
	      const searchInput = document.getElementById('liveSourceSearch');
	      searchInput?.addEventListener('input', () => {
	        const term = String(searchInput.value || '').trim().toLowerCase();
	        document.querySelectorAll('.live-source-node').forEach(node => {
	          const text = String(node.textContent || '').toLowerCase();
	          node.hidden = Boolean(term) && !text.includes(term);
	        });
	      });
	      document.querySelectorAll('[data-source-view]').forEach(node => {
	        const viewId = node.dataset.sourceView || '';
	        node.addEventListener('click', () => {
	          assignSourceToSelectedTile(viewId).catch(error => {
	            showToast?.(error.message || '소스를 배치하지 못했습니다.', { tone: 'danger' });
	          });
	        });
	        node.addEventListener('keydown', event => {
	          if (event.key !== 'Enter' && event.key !== ' ') return;
	          event.preventDefault();
	          assignSourceToSelectedTile(viewId).catch(error => {
	            showToast?.(error.message || '소스를 배치하지 못했습니다.', { tone: 'danger' });
	          });
	        });
	        node.addEventListener('dragstart', event => {
	          liveDragViewId = viewId;
	          node.classList.add('dragging');
	          if (event.dataTransfer) {
	            event.dataTransfer.effectAllowed = 'copy';
	            event.dataTransfer.setData('text/plain', viewId);
	            event.dataTransfer.setData('application/x-media-server-view', viewId);
	          }
	        });
	        node.addEventListener('dragend', () => {
	          liveDragViewId = '';
	          node.classList.remove('dragging');
	          document.querySelectorAll('.live-drop-tile[data-drop-state="over"]').forEach(tileNode => {
	            tileNode.dataset.dropState = 'idle';
	          });
	        });
	      });
	      updateLiveSourceTreeState();
	    }
	    function bindLiveGridControls() {
	      document.querySelector('#liveAllStart')?.addEventListener('click', () => startAllLiveTiles());
	      document.querySelector('#liveAllStop')?.addEventListener('click', () => stopAllLiveTiles());
	      document.querySelector('#liveAllRestart')?.addEventListener('click', () => restartAllLiveTiles());
        document.querySelector('#liveSaveLayoutPreference')?.addEventListener('click', () => saveLiveLayoutPreference());
        document.querySelector('#liveApplyUserLayoutPreference')?.addEventListener('click', () => applyStoredLiveLayout('user'));
        document.querySelector('#liveApplyRoleLayoutPreset')?.addEventListener('click', () => applyStoredLiveLayout('role'));
	      document.querySelector('#liveDensity')?.addEventListener('change', event => {
	        liveDensity = event.target.value === 'compact' ? 'compact' : 'comfortable';
	        localStorage.setItem('mediaServerClientLiveDensity', liveDensity);
	        const grid = document.querySelector('.live-grid');
	        if (grid) grid.dataset.density = liveDensity;
          markLivePreferenceDirty();
	      });
	      document.querySelector('#liveDockSide')?.addEventListener('change', event => {
	        liveDockSide = event.target.value === 'right' ? 'right' : 'left';
	        localStorage.setItem('mediaServerClientLiveDockSide', liveDockSide);
	        const layout = document.querySelector('.live-workspace-layout');
	        if (layout) layout.dataset.dockSide = liveDockSide;
          markLivePreferenceDirty();
	      });
	      document.querySelector('#liveInfoOverlayToggle')?.addEventListener('change', event => {
	        liveInfoOverlayEnabled = Boolean(event.target.checked);
	        localStorage.setItem('mediaServerClientLiveInfoOverlay', liveInfoOverlayEnabled ? 'on' : 'off');
	        syncLiveInfoOverlayToggle();
	        updateAllTileDom();
          markLivePreferenceDirty();
	      });
	      document.querySelector('#liveGridSize')?.addEventListener('change', async event => {
	        const next = Math.min(maxLiveTiles, Math.max(1, Number(event.target.value || 4)));
	        for (const tile of liveTiles.slice(next)) {
	          await stopLiveTile(tile.index);
	        }
	        liveTileCount = next;
	        if (selectedLiveTile !== null && selectedLiveTile >= liveTileCount) {
	          selectedLiveTile = liveTileCount > 0 ? 0 : null;
	        }
	        localStorage.setItem('mediaServerClientLiveGrid', String(liveTileCount));
          markLivePreferenceDirty();
	        renderLiveMonitor();
	      });
	    }
	    function liveDockEventItemsHtml(items) {
	      if (!Array.isArray(items) || items.length === 0) {
	        return emptyState('최근 이벤트 없음', '선택한 소스에서 표시할 이벤트가 없습니다.');
	      }
	      return items.slice(0, 6).map(item => `
	        <article class="live-dock-event">
	          <div class="meta">
	            <span class="chip">${escapeHtml(item.eventType || 'event')}</span>
	            ${statusChip(item.status || '미제공')}
	          </div>
	          <strong>${escapeHtml(item.scenarioName || item.className || item.eventId || '이벤트')}</strong>
	          <span>${escapeHtml(formatTime(item.updateTime || item.startTime))}</span>
	        </article>
	      `).join('');
	    }
	    function renderLiveDockEvents(view, payload = {}) {
	      const container = document.querySelector('#liveDockEvents');
	      const status = document.querySelector('[data-role="event-feed-status"]');
	      if (!container || !status) return;
	      const events = payload.events || {};
	      status.textContent = events.warning ? '경고' : (events.provided === false ? '꺼짐' : '표시');
	      status.className = `chip${events.warning ? ' warn' : ''}`;
	      container.innerHTML = `
	        <div class="live-dock-event-summary">
	          <strong>${escapeHtml(view?.displayName || view?.viewId || '선택 소스')}</strong>
	          <span>${events.provided === false ? '이벤트 권한 꺼짐' : 'viewer-safe feed'}</span>
	        </div>
	        <div class="meta">
	          ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
	        </div>
	        <section class="live-dock-events">${liveDockEventItemsHtml(events.recent || [])}</section>
	      `;
	    }
	    async function refreshLiveDockEventFeed() {
	      if (activePage !== 'live') return;
	      const container = document.querySelector('#liveDockEvents');
	      const status = document.querySelector('[data-role="event-feed-status"]');
	      if (!container || !status) return;
	      const tile = selectedLiveTile === null ? null : liveTiles[selectedLiveTile];
	      const view = tileView(tile) || viewById(selectedViewId);
	      if (!view) {
	        status.textContent = '대기';
	        container.innerHTML = emptyState('소스 선택 필요', '이벤트 feed를 보려면 타일 또는 소스를 선택하세요.');
	        return;
	      }
	      if (view.showEvents === false) {
	        renderLiveDockEvents(view, { events: { provided: false, recent: [], countsByType: [] } });
	        return;
	      }
	      const nonce = (liveDockEventsNonce || 0) + 1;
	      liveDockEventsNonce = nonce;
	      status.textContent = '갱신';
	      try {
	        const payload = await requestJson(`/client/api/views/${encodeURIComponent(view.viewId)}/events?limit=6`);
	        if (nonce !== liveDockEventsNonce) return;
	        renderLiveDockEvents(view, payload);
	      } catch (error) {
	        if (nonce !== liveDockEventsNonce) return;
	        status.textContent = '오류';
	        status.className = 'chip warn';
	        container.innerHTML = emptyState('이벤트를 불러오지 못했습니다', error.message || '미제공');
	      }
	    }
	    function renderLiveMonitor() {
	      workspace?.classList.add('live-workspace');
	      if (views.length === 0) {
        detail.innerHTML = emptyState(
          'Live view가 없습니다',
          isPreviewMode
            ? '미리보기할 채널이 없습니다. Ops에서 채널을 만들고 계정 권한을 연결하세요.'
            : '라이브를 보려면 관리자에게 채널 접근 권한을 받아야 합니다.',
          isPreviewMode ? '/ops/sources' : '/client/request-access',
          isPreviewMode ? '채널 관리' : '접근 요청'
	        );
	        return;
	      }
	      detail.innerHTML = liveMonitorHtml();
	      bindLiveSourceTree();
	      for (const tile of liveTiles.slice(0, liveTileCount)) {
	        bindLiveTile(tile);
	      }
	      bindLiveGridControls();
      syncLiveInfoOverlayToggle();
      updateLiveLayoutPresetStatus();
      if (!liveStatusTimer) {
        liveStatusTimer = setInterval(() => {
          for (const tile of visibleLiveTiles()) {
            refreshTilePlaybackStats(tile).catch(() => {});
          }
          updateAllTileDom();
          updateSelectedTileStatusText();
        }, 1000);
      }
      if (!liveDashboardTimer) {
        liveDashboardTimer = setInterval(() => refreshSelectedTileDetail(), 3000);
      }
      if (!liveDockEventsTimer) {
        liveDockEventsTimer = setInterval(() => refreshLiveDockEventFeed(), 5000);
      }
      refreshSelectedTileDetail();
      refreshLiveDockEventFeed();
    }
    function selectLiveTile(index) {
      selectedLiveTile = index;
      const tile = liveTiles[index];
      selectedViewId = tile?.viewId || selectedViewId;
      host.querySelectorAll('.view').forEach(node => {
        node.classList.toggle('active', node.dataset.viewId === selectedViewId);
      });
      updateAllTileDom();
      refreshSelectedTileDetail();
      refreshLiveDockEventFeed();
    }
    function focusLiveTile(index) {
      if (liveTileCount <= 0) return;
      const nextIndex = Math.max(0, Math.min(liveTileCount - 1, index));
      selectLiveTile(nextIndex);
      const next = document.querySelector(`[data-tile="${nextIndex}"]`);
      if (next && typeof next.focus === 'function') {
        try {
          next.focus({ preventScroll: true });
        } catch {
          next.focus();
        }
      }
    }
    function updateSelectedTileStatusText() {
      const tile = selectedLiveTile === null ? null : liveTiles[selectedLiveTile];
      const el = document.querySelector('#liveSelectedDetail [data-selected-stale]');
      if (el && tile) {
        el.textContent = tile.stale ? '지연' : '정상';
      }
    }
    function parseTileMetadata(tile, raw) {
      let payload = null;
      try { payload = JSON.parse(raw); } catch { return; }
      tile.lastMetadataAt = Date.now();
      const result = payload?.result || payload?.metadata || payload?.analysis || payload;
      const metrics = result?.metricsReport || payload?.metricsReport || {};
      const tracks = Array.isArray(result?.tracks) ? result.tracks : (Array.isArray(payload?.tracks) ? payload.tracks : []);
      const events = Array.isArray(payload?.events) ? payload.events : (Array.isArray(result?.events) ? result.events : []);
      tile.trackCount = metrics.totalTrackCount ?? metrics.activeTrackCount ?? tracks.length ?? tile.trackCount;
      tile.eventCount = metrics.activeEventStateCount ?? events.length ?? tile.eventCount;
      updateTileDom(tile);
      if (selectedLiveTile === tile.index) refreshSelectedTileDetail();
    }
    async function refreshTilePlaybackStats(tile) {
      if (!tile?.sessionId || !tile.pc || typeof tile.pc.getStats !== 'function') return;
      const report = await tile.pc.getStats();
      let videoInbound = null;
      report.forEach(stat => {
        if (!videoInbound && stat && stat.type === 'inbound-rtp' && (stat.kind === 'video' || stat.mediaType === 'video')) {
          videoInbound = stat;
        }
      });
      if (!videoInbound) return;
      const stats = tile.playbackStats || {};
      const timestamp = Number(videoInbound.timestamp || 0);
      const bytesReceived = Number(videoInbound.bytesReceived || 0);
      const framesDecoded = Number(videoInbound.framesDecoded || 0);
      if (Number.isFinite(videoInbound.framesPerSecond)) {
        stats.fps = videoInbound.framesPerSecond;
      } else if (Number.isFinite(framesDecoded) && Number.isFinite(stats.lastFramesDecoded) && Number.isFinite(timestamp) && Number.isFinite(stats.lastTimestamp) && timestamp > stats.lastTimestamp) {
        stats.fps = ((framesDecoded - stats.lastFramesDecoded) * 1000) / (timestamp - stats.lastTimestamp);
      }
      if (Number.isFinite(bytesReceived) && Number.isFinite(stats.lastBytesReceived) && Number.isFinite(timestamp) && Number.isFinite(stats.lastTimestamp) && timestamp > stats.lastTimestamp) {
        stats.bitrateKbps = ((bytesReceived - stats.lastBytesReceived) * 8) / (timestamp - stats.lastTimestamp);
      }
      if (Number.isFinite(videoInbound.framesDropped)) {
        stats.droppedFrames = videoInbound.framesDropped;
      }
      stats.lastBytesReceived = Number.isFinite(bytesReceived) ? bytesReceived : stats.lastBytesReceived;
      stats.lastFramesDecoded = Number.isFinite(framesDecoded) ? framesDecoded : stats.lastFramesDecoded;
      stats.lastTimestamp = Number.isFinite(timestamp) ? timestamp : stats.lastTimestamp;
      tile.playbackStats = stats;
      updateTileDom(tile);
    }
    function attachTileDataChannel(tile, channel) {
      tile.dataChannel = channel;
      channel.onopen = () => {
        tile.connectionStatus = 'metadata';
        updateTileDom(tile);
      };
      channel.onmessage = event => parseTileMetadata(tile, event.data);
      channel.onclose = () => {
        if (tile.dataChannel === channel) tile.dataChannel = null;
        updateTileDom(tile);
      };
      channel.onerror = () => {
        tile.connectionStatus = 'metadata-error';
        updateTileDom(tile);
      };
    }
    async function pollTileIce(tile) {
      if (!tile.sessionId || !tile.pc) return;
      const response = await fetch(clientSessionUrl(tile, '/ice')).catch(() => null);
      if (!response || !response.ok) return;
      const payload = await response.json().catch(() => ({}));
      for (const item of payload.candidates || []) {
        try { await tile.pc.addIceCandidate(item); } catch {}
      }
    }
    async function loadClientWebRtcConfig() {
      if (!clientWebRtcConfigPromise) {
        clientWebRtcConfigPromise = fetch('/webrtc/config', {
          cache: 'no-store',
          credentials: 'same-origin'
        }).then(async response => {
          if (!response.ok) throw new Error(`/webrtc/config HTTP ${response.status}`);
          return response.json();
        });
      }
      return clientWebRtcConfigPromise;
    }
    function peerConnectionConfigFromPayload(payload) {
      const raw = payload && payload.peerConnectionConfig && typeof payload.peerConnectionConfig === 'object'
        ? payload.peerConnectionConfig
        : {};
      const config = {};
      if (Array.isArray(raw.iceServers)) {
        config.iceServers = raw.iceServers;
      }
      if (raw.iceTransportPolicy === 'relay' || raw.iceTransportPolicy === 'all') {
        config.iceTransportPolicy = raw.iceTransportPolicy;
      }
      return config;
    }
    async function createClientPeerConnection() {
      try {
        return new RTCPeerConnection(peerConnectionConfigFromPayload(await loadClientWebRtcConfig()));
      } catch (error) {
        console.warn('Client Live ICE config fallback', error);
        return new RTCPeerConnection();
      }
    }
    function isLiveTileStartCurrent(tile, startNonce, pc) {
      return Boolean(tile) && tile.startNonce === startNonce && (!pc || tile.pc === pc);
    }
    async function cleanupClientLiveSession(viewId, sessionId) {
      if (!viewId || !sessionId) return;
      await fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        keepalive: true
      }).catch(() => {});
    }
    async function startLiveTile(index) {
	      const tile = liveTiles[index];
	      const view = tileView(tile);
	      if (!tile || !view || tile.sessionId) return;
	      if (viewActiveLimitReached(view, index)) {
	        tile.status = 'error';
	        tile.connectionStatus = `최대 ${viewMaxTiles(view)}개`;
	        updateTileDom(tile);
	        refreshSelectedTileDetail();
	        return;
	      }
	      const mode = tile.overlayMode || defaultOverlayModeForView(view);
      if (!mode) {
        tile.status = 'error';
        tile.connectionStatus = '미제공';
        updateTileDom(tile);
        return;
      }
      tile.overlayMode = mode;
      applyTileModeOptions(tile);
      selectLiveTile(index);
      const startNonce = (tile.startNonce || 0) + 1;
      tile.startNonce = startNonce;
      tile.status = 'connecting';
      tile.connectionStatus = 'connecting';
      tile.trackCount = null;
      tile.eventCount = null;
      tile.lastMetadataAt = 0;
      tile.lastError = '';
      updateTileDom(tile);
      let pc = null;
      let createdSessionId = '';
      try {
        pc = await createClientPeerConnection();
        if (!isLiveTileStartCurrent(tile, startNonce)) {
          try { pc.close(); } catch {}
          return;
        }
        tile.pc = pc;
        pc.onconnectionstatechange = () => {
          if (!isLiveTileStartCurrent(tile, startNonce, pc)) return;
          tile.connectionStatus = pc.connectionState || 'connecting';
          if (['connected', 'completed'].includes(tile.connectionStatus)) tile.status = 'live';
          if (['failed', 'disconnected', 'closed'].includes(tile.connectionStatus)) {
            tile.status = pc.connectionState === 'failed' ? 'error' : 'offline';
            tile.lastError = clientStatusLabel(pc.connectionState);
          }
          updateTileDom(tile);
        };
        pc.oniceconnectionstatechange = () => {
          if (!isLiveTileStartCurrent(tile, startNonce, pc)) return;
          tile.connectionStatus = pc.iceConnectionState || tile.connectionStatus;
          updateTileDom(tile);
        };
        pc.ondatachannel = event => {
          if (isLiveTileStartCurrent(tile, startNonce, pc)) attachTileDataChannel(tile, event.channel);
        };
        pc.ontrack = event => {
          if (!isLiveTileStartCurrent(tile, startNonce, pc)) return;
          const root = document.querySelector(`[data-tile="${tile.index}"]`);
          const video = root?.querySelector('video');
          if (!video) return;
          video.srcObject = event.streams[0];
          video.muted = true;
          const play = video.play();
          if (play && typeof play.catch === 'function') play.catch(() => {});
          tile.status = 'live';
          updateTileDom(tile);
        };
        pc.onicecandidate = event => {
          if (!isLiveTileStartCurrent(tile, startNonce, pc)) return;
          if (!tile.sessionId || !event.candidate) return;
          fetch(clientSessionUrl(tile, '/ice'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate
            })
          }).catch(() => {});
        };
        const body = {
          overlayMode: mode,
          labelLang: window.MediaServerUi?.currentLanguage?.() || 'ko'
        };
        const ruleId = tileRuleId(view);
        if (mode === 'va-rule' && ruleId) body.ruleId = ruleId;
        const response = await fetch(`/client/api/views/${encodeURIComponent(view.viewId)}/webrtc/session`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        createdSessionId = payload.sessionId || '';
        if (!createdSessionId || !payload.offer) throw new Error('session offer missing');
        if (!isLiveTileStartCurrent(tile, startNonce, pc)) {
          try { pc.close(); } catch {}
          await cleanupClientLiveSession(view.viewId, createdSessionId);
          return;
        }
        tile.sessionId = createdSessionId;
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
        if (!isLiveTileStartCurrent(tile, startNonce, pc)) {
          await cleanupClientLiveSession(view.viewId, createdSessionId);
          return;
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!isLiveTileStartCurrent(tile, startNonce, pc)) {
          await cleanupClientLiveSession(view.viewId, createdSessionId);
          return;
        }
        await fetch(clientSessionUrl(tile, '/answer'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: answer.sdp
        });
        if (!isLiveTileStartCurrent(tile, startNonce, pc)) {
          await cleanupClientLiveSession(view.viewId, createdSessionId);
          return;
        }
        tile.iceTimer = setInterval(() => pollTileIce(tile).catch(() => {}), 1000);
        updateTileDom(tile);
        refreshSelectedTileDetail();
      } catch (error) {
        if (!isLiveTileStartCurrent(tile, startNonce, pc)) {
          await cleanupClientLiveSession(view.viewId, createdSessionId);
          return;
        }
        tile.status = 'error';
        tile.connectionStatus = error.message || 'error';
        tile.lastError = error.message || 'error';
        await stopLiveTile(index, { keepError: true });
        updateTileDom(tile);
      }
    }
    async function restartLiveTile(index) {
      const tile = liveTiles[index];
      if (!tile || !tile.viewId) return;
      tile.restartCount = (tile.restartCount || 0) + 1;
      await stopLiveTile(index, { keepError: true });
      tile.status = 'connecting';
      tile.connectionStatus = 'reconnecting';
      tile.lastError = '';
      updateTileDom(tile);
      await startLiveTile(index);
    }
    async function stopLiveTile(index, options = {}) {
      const tile = liveTiles[index];
      if (!tile) return;
      tile.startNonce = (tile.startNonce || 0) + 1;
      if (tile.iceTimer) {
        clearInterval(tile.iceTimer);
        tile.iceTimer = null;
      }
      if (tile.dataChannel) {
        try { tile.dataChannel.close(); } catch {}
      }
      tile.dataChannel = null;
      if (tile.pc) {
        try { tile.pc.close(); } catch {}
      }
	      tile.pc = null;
      const root = document.querySelector(`[data-tile="${tile.index}"]`);
      const video = root?.querySelector('video');
      if (video?.srcObject) {
        for (const track of video.srcObject.getTracks()) track.stop();
        video.srcObject = null;
      }
      const sessionId = tile.sessionId;
      tile.sessionId = '';
      if (sessionId) {
        await cleanupClientLiveSession(tile.viewId || '', sessionId);
      }
      if (!options.keepError) {
        tile.status = 'offline';
        tile.connectionStatus = 'offline';
        tile.lastError = '';
      }
	      tile.trackCount = null;
	      tile.eventCount = null;
	      tile.lastMetadataAt = 0;
	      updateVisibleLiveTileControls();
	      refreshSelectedTileDetail();
	    }
    async function disconnectLiveTile(index) {
      const tile = liveTiles[index];
      if (!tile) return;
      await stopLiveTile(index);
      clearLiveTileSlot(tile);
      if (selectedLiveTile === index) selectedViewId = '';
      markLivePreferenceDirty();
      updateVisibleLiveTileControls();
      refreshSelectedTileDetail();
      refreshLiveDockEventFeed();
    }
    async function stopAllLiveTiles() {
      liveBulkNonce += 1;
      await Promise.all(liveTiles.map(tile => stopLiveTile(tile.index)));
    }
    async function startAllLiveTiles() {
      const bulkNonce = liveBulkNonce + 1;
      liveBulkNonce = bulkNonce;
      for (const tile of visibleLiveTiles()) {
        if (bulkNonce !== liveBulkNonce) break;
        if (tile.viewId && !tile.sessionId) {
          await startLiveTile(tile.index);
        }
        if (bulkNonce !== liveBulkNonce) break;
      }
    }
    async function restartAllLiveTiles() {
      const bulkNonce = liveBulkNonce + 1;
      liveBulkNonce = bulkNonce;
      await Promise.all(visibleLiveTiles().map(tile => stopLiveTile(tile.index, { keepError: true })));
      if (bulkNonce !== liveBulkNonce) return;
      for (const tile of visibleLiveTiles()) {
        if (bulkNonce !== liveBulkNonce) break;
        if (tile.viewId) {
          tile.restartCount = (tile.restartCount || 0) + 1;
          tile.status = 'connecting';
          tile.connectionStatus = 'reconnecting';
          tile.lastError = '';
          updateTileDom(tile);
          await startLiveTile(tile.index);
        }
      }
    }
    async function refreshSelectedTileDetail() {
      if (activePage !== 'live') return;
      const container = document.querySelector('#liveSelectedDetail');
      const tile = selectedLiveTile === null ? null : liveTiles[selectedLiveTile];
      const view = tileView(tile);
      if (!container || !tile || !view) {
        if (container) container.innerHTML = emptyState('선택된 라이브 타일이 없습니다', '채널 권한이 생기면 타일을 선택해 상태를 확인할 수 있습니다.');
        return;
      }
      try {
        const payload = await requestJson(`/client/api/views/${encodeURIComponent(view.viewId)}/dashboard`);
        const health = payload.health || {};
        const analysis = payload.analysis || {};
        const events = payload.events || {};
        tile.trackCount = tile.trackCount ?? analysis.trackCount;
        tile.eventCount = tile.eventCount ?? analysis.activeEventCount;
        container.innerHTML = `
          <div class="toolbar">
            <div>
              <h2>${escapeHtml(view.displayName || view.viewId)}</h2>
              <p>타일 ${tile.index + 1} · ${escapeHtml(overlayLabel(tile.overlayMode || defaultOverlayModeForView(view)))}</p>
            </div>
            <div class="meta">
              ${statusChip(tile.status)}
              ${statusChip(health.warningLevel)}
              ${statusChip(health.metadataStatus)}
              <span class="chip${tileStatusClass(tile.stale ? 'stale' : 'fresh')}" data-selected-stale>${tile.stale ? '지연' : '정상'}</span>
            </div>
            <div class="client-copy-actions">
              <button type="button" class="ghost" data-client-copy="status">상태 복사</button>
              <button type="button" class="ghost" data-client-copy="events">이벤트 복사</button>
            </div>
          </div>
          <div class="summary">
            <div class="metric"><span>연결</span><strong>${escapeHtml(clientDynamicText(liveTileConnectionLabel(tile)))}</strong></div>
            <div class="metric"><span>라이브</span><strong>${escapeHtml(clientStatusLabel(health.status || tile.status))}</strong></div>
            <div class="metric"><span>상태 요약</span><strong>${escapeHtml(clientHealthSummaryLabel(health.summary || health.status))}</strong></div>
            <div class="metric"><span>트랙</span><strong>${escapeHtml(display(tile.trackCount ?? analysis.trackCount))}</strong></div>
            <div class="metric"><span>이벤트</span><strong>${escapeHtml(display(tile.eventCount ?? analysis.activeEventCount))}</strong></div>
            <div class="metric"><span>메타데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
            <div class="metric"><span>마지막 프레임</span><strong>${escapeHtml(ms(health.lastFrameAgeMs))}</strong></div>
            <div class="metric"><span>시나리오</span><strong>${escapeHtml(display(analysis.scenarioCount))}</strong></div>
            <div class="metric"><span>경고</span><strong>${events.warning ? '경고' : '정상'}</strong></div>
          </div>
        `;
        bindClientCopyButtons(payload, container);
        const liveCopyActions = document.querySelector('#liveCopyActions');
        if (liveCopyActions) bindClientCopyButtons(payload, liveCopyActions);
        updateTileDom(tile);
      } catch (error) {
        container.innerHTML = `<div class="empty"><p>${escapeHtml(error.message || '미제공')}</p></div>`;
      }
    }
    async function loadDetail() {
      if (!selectedViewId) {
        const title = activePage === 'events' ? '이벤트 채널이 없습니다' : '대시보드 채널이 없습니다';
        const message = activePage === 'events'
          ? '현장 이벤트를 보려면 이벤트 권한이 있는 채널이 필요합니다.'
          : '현장 대시보드를 보려면 대시보드 권한이 있는 채널이 필요합니다.';
        detail.innerHTML = emptyState(
          title,
          message,
          isPreviewMode ? '/ops/sources' : '/client/request-access',
          isPreviewMode ? '채널 관리' : '접근 요청'
        );
        return;
      }
      detail.innerHTML = `<div class="client-loading-state">${emptyState('현장 상태 불러오는 중', '선택한 채널의 영상, 메타데이터, 이벤트 상태를 조회하고 있습니다.')}</div>`;
      try {
        if (activePage === 'events') {
          renderEventPage(await requestJson(`/client/api/views/${encodeURIComponent(selectedViewId)}/events?limit=20`));
        } else {
          const [dashboardPayload, compareItems] = await Promise.all([
            requestJson(`/client/api/views/${encodeURIComponent(selectedViewId)}/dashboard`),
            loadClientDashboardCompare()
          ]);
          renderDashboard(dashboardPayload, compareItems);
        }
      } catch (error) {
        detail.innerHTML = emptyState('상태를 불러오지 못했습니다', `네트워크, 권한, 채널 설정을 확인하세요. ${error.message || '미제공'}`);
      }
    }
    refresh.addEventListener('click', () => {
      if (activePage === 'live') {
        refreshSelectedTileDetail();
      } else {
        loadDetail();
      }
    });
    if (activePage === 'live') {
      document.querySelectorAll('form[action="/logout"]').forEach(form => {
        if (form.dataset.liveLogoutCleanupBound === '1') return;
        form.dataset.liveLogoutCleanupBound = '1';
        form.addEventListener('submit', event => {
          if (form.dataset.liveLogoutCleanupSubmitting === '1') return;
          event.preventDefault();
          form.dataset.liveLogoutCleanupSubmitting = '1';
          stopAllLiveTiles()
            .catch(() => {})
            .finally(() => HTMLFormElement.prototype.submit.call(form));
        });
      });
      detail.innerHTML = emptyState('라이브 레이아웃 불러오는 중', '저장된 레이아웃과 권한 기본값을 확인합니다.');
      loadLiveLayoutPreferences()
        .catch(error => {
          livePreferenceState.loaded = false;
          livePreferenceState.error = error.message || 'layout preference load failed';
        })
        .finally(() => renderLiveMonitor());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAllLiveTiles().catch(() => {});
      });
      window.addEventListener('pagehide', () => stopAllLiveTiles());
      window.addEventListener('beforeunload', () => {
        for (const tile of liveTiles) {
          if (tile.sessionId) {
            fetch(clientSessionUrl(tile), { method: 'DELETE', keepalive: true }).catch(() => {});
          }
        }
      });
    } else {
      workspace?.classList.remove('live-workspace');
      renderAssignedViews();
      loadDetail();
    }
  </script>
)CLIENTSCRIPT";
}

void AppendOpsShellScript(std::ostringstream& out,
                          const std::string& active,
                          const std::string& stream_route,
                          int rtsp_port) {
    out << R"OPSSCRIPT(    <script>
      const activeOpsPage = )OPSSCRIPT" << JsStringLiteral(active) << R"OPSSCRIPT(;
      const opsStreamRoute = )OPSSCRIPT" << JsStringLiteral(stream_route) << R"OPSSCRIPT(;
      const opsRtspPort = )OPSSCRIPT" << rtsp_port << R"OPSSCRIPT(;
      const {
        escapeHtml,
        display,
        numberValue,
        setText,
        setFeedback,
        showToast,
        setTableEmpty,
        tableCellHtml,
        opsRowActionsHtml,
        opsContextActionsHtml,
        opsTableRowHtml,
        setOpsDetailPanelOpen,
        chip: badge,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility,
        setSelectOptions,
        translateText,
        recordOpsAudit,
        renderOpsAuditTrail
      } = window.MediaServerUi;
      const opsText = value => translateText ? translateText(value) : display(value);
      const opsHtml = value => escapeHtml(opsText(value));
      const opsHashParams = () => new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      const opsViewRuleId = view =>
        String(view?.defaultRuleId || (Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds[0] : '') || '').trim();
      const normalizeOverlayMode = mode => {
        const raw = String(mode || '').trim().toLowerCase();
        if (!raw || ['raw', 'none', 'video', 'live'].includes(raw)) return 'raw';
        if (['va-overlay', 'va', 'overlay', 'metadata', 'server-overlay'].includes(raw)) return 'va-overlay';
        if (['va-rule', 'rule', 'varule'].includes(raw)) return 'va-rule';
        return '';
      };
      const overlayLabel = mode => ({
        raw: '원본',
        'va-overlay': 'VA 오버레이',
        'va-rule': 'VA 룰'
      })[mode] || mode || '미제공';
      const allowedOverlayModes = view => {
        const seen = new Set();
        const out = [];
        const ruleId = opsViewRuleId(view);
        for (const value of view?.allowedOverlayModes || []) {
          const overlayMode = normalizeOverlayMode(value);
          if (overlayMode === 'va-rule' && !ruleId) continue;
          if (overlayMode && !seen.has(overlayMode)) {
            seen.add(overlayMode);
            out.push(overlayMode);
          }
        }
        return out;
      };
      const ms = value => value === null || value === undefined ? '미제공' : `${Math.max(0, Math.round(Number(value)))}ms`;
      const runtimeCounts = runtime => {
        const session = runtime?.sessionManager || {};
        const webrtc = runtime?.webrtcHttp || {};
        const matching = runtime?.analysisMatching || {};
        return {
          sessions: numberValue(session.activeSessions),
          streams: numberValue(session.registryActiveStreams || session.resourceActiveStreams),
          taps: numberValue(session.activeAnalysisTaps || matching.activeTapCount),
          egress: numberValue(webrtc.egressSessions),
          publish: numberValue(webrtc.publishSessions),
          publishSources: Array.isArray(webrtc.publishSources) ? webrtc.publishSources.length : 0,
          activeTaps: Array.isArray(matching.activeTaps) ? matching.activeTaps : [],
          debugCounters: runtime?.debugCounters || {}
        };
      };
      const rootCauseCorrelationId = (line, fallbackKey = 'root-cause') => {
        const text = String(line || '');
        const direct = text.match(/\b(?:cid|correlationId|requestId|sessionId|tapId|sourceId)=([A-Za-z0-9_.:-]+)/i);
        if (direct) return direct[1];
        let hash = 2166136261;
        for (const ch of `${fallbackKey}|${text}`) {
          hash ^= ch.charCodeAt(0);
          hash = Math.imul(hash, 16777619);
        }
        return `ops-${String(fallbackKey).replace(/[^a-z0-9]+/gi, '-').slice(0, 18).toLowerCase()}-${(hash >>> 0).toString(36)}`;
      };
      const dashboardSourceHealthItems = sourceHealth => Array.isArray(sourceHealth?.sourceHealth) ? sourceHealth.sourceHealth : [];
      const dashboardSourceHealthCounts = sourceHealth => {
        const items = dashboardSourceHealthItems(sourceHealth);
        const summary = sourceHealth?.summary || {};
        const countByStatus = status => items.filter(item => item.status === status).length;
        return {
          total: numberValue(summary.total ?? items.length),
          live: numberValue(summary.live ?? countByStatus('live')),
          connecting: numberValue(summary.connecting ?? countByStatus('connecting')),
          stale: numberValue(summary.stale ?? countByStatus('stale')),
          offline: numberValue(summary.offline ?? countByStatus('offline')),
          unknown: numberValue(summary.unknown ?? countByStatus('unknown'))
        };
      };
      const dashboardSourceHealthReason = reason => ({
        receiving: '수신 중',
        initializing: '초기 수신 대기',
        'last-frame-aged': '프레임 지연',
        'metadata-aged': '메타데이터 지연',
        disabled: '비활성',
        unreachable: '연결 불가',
        'no-subscriber': '구독 세션 없음',
        'no-egress-session': 'WebRTC 송출 세션 없음'
      })[String(reason || '')] || String(reason || '근거 없음');
      const dashboardSourceHealthStatusLabel = status => ({
        live: '수신',
        connecting: '연결 중',
        stale: '지연',
        offline: '오프라인',
        unknown: '미확인'
      })[String(status || '')] || String(status || '미확인');
      const dashboardSourceHealthAge = value => value === null || value === undefined
        ? '미수신'
        : `${Math.max(0, Math.round(numberValue(value)))}ms`;
      const dashboardSourceHealthStatusText = sourceHealth => {
        const counts = dashboardSourceHealthCounts(sourceHealth);
        return `수신 ${counts.live}/${counts.total} · 연결 중 ${counts.connecting} · 지연 ${counts.stale} · 오프라인 ${counts.offline}`;
      };
      const dashboardSourceHealthIncidentId = item => {
        const sourceId = String(item?.sourceId || '').trim() || 'unknown';
        const status = String(item?.status || 'unknown').trim() || 'unknown';
        const reason = String(item?.reason || 'not-checked').trim() || 'not-checked';
        return `source-health:${sourceId}:${status}:${reason}`;
      };
      const dashboardRuntimeStreamLabel = value => {
        const text = String(value || '').trim();
        if (!text) return '스트림 미제공';
        if (text.startsWith('file::')) {
          const token = text.slice(6);
          const fileName = token.split(/[\\/]/).filter(Boolean).pop();
          return fileName ? `file::${fileName}` : 'file source';
        }
        return text.length > 96 ? `${text.slice(0, 93)}...` : text;
      };
      const dashboardRootCauseItems = (runtime, principal, eventsStatus = {}, browserConfig = {}, diagnosticLog = {}, sourceHealth = {}) => {
        const counts = runtimeCounts(runtime);
        const lifecycle = runtime?.sourceLifecycle || {};
        const matching = runtime?.analysisMatching || {};
        const publishSources = Array.isArray(runtime?.webrtcHttp?.publishSources) ? runtime.webrtcHttp.publishSources : [];
        const activeTaps = Array.isArray(matching.activeTaps) ? matching.activeTaps : [];
        const healthItems = dashboardSourceHealthItems(sourceHealth);
        const healthCounts = dashboardSourceHealthCounts(sourceHealth);
        const degradedSources = healthItems.filter(item => item.status !== 'live');
        const firstDegradedSource = degradedSources[0] || null;
        const recentEvents = Array.isArray(eventsStatus?.records?.records) ? eventsStatus.records.records : [];
        const storage = eventsStatus?.storage || {};
        const post = eventsStatus?.post || {};
        const staleTaps = activeTaps.filter(tap => numberValue(tap.lastUsedAgeMs) > 5000);
        const stalledResources = numberValue(lifecycle.activeSessions) === 0 &&
          (numberValue(lifecycle.resourceActiveStreams) > 0 || numberValue(lifecycle.registryActiveStreams) > 0 || numberValue(lifecycle.activeAnalysisTaps) > 0);
        const inactivePublishSources = publishSources.filter(source => source && (!source.active || !source.hasVideo));
        const cleanupRequests = numberValue(counts.debugCounters.cleanupRequests);
        const cleanupCompleted = numberValue(counts.debugCounters.cleanupCompleted);
        const cleanupBacklog = cleanupRequests > cleanupCompleted;
        const relayFallback = browserConfig?.relayPolicyFallback === true;
        const iceText = `ICE ${browserConfig?.iceTransportPolicy || '미제공'} · STUN ${browserConfig?.hasStun ? 'on' : 'off'} · TURN ${browserConfig?.hasTurn ? 'on' : 'off'}`;
        const scopes = Array.isArray(principal?.scopes) ? principal.scopes : [];
        const hasOpsRead = principal?.role === 'admin' || scopes.includes('*') || scopes.includes('ops:read');
        const sourceSummary = numberValue(lifecycle.idle ? 1 : 0) === 1
          ? '모든 소스 수명주기 리소스가 대기 상태입니다.'
          : `세션 ${numberValue(lifecycle.activeSessions)} · 스트림 ${numberValue(lifecycle.resourceActiveStreams)}/${numberValue(lifecycle.registryActiveStreams)} · 분석 탭 ${numberValue(lifecycle.activeAnalysisTaps)}`;
        const recentSummary = recentEvents.length > 0
          ? recentEvents.slice(0, 2).map(item => `${item.eventType || 'event'}:${item.status || 'status'}`).join(' · ')
          : '최근 EventRecord 없음';
        const logLines = Array.isArray(diagnosticLog?.lines) ? diagnosticLog.lines : [];
        const logEvidence = patterns => {
          const regex = new RegExp(patterns, 'i');
          const match = [...logLines].reverse().find(line => regex.test(String(line || '')));
          const line = match ? String(match).slice(0, 220) : (diagnosticLog?.available === false ? '최근 로그 없음' : '로그 미제공');
          return { line, correlationId: rootCauseCorrelationId(line, patterns) };
        };
        const sourceLog = logEvidence('cleanup|source lifecycle|resourceActive|activeAnalysisTaps');
        const staleLog = logEvidence('stale|metadata skipped|lastUsedAge|tapId');
        const reconnectLog = logEvidence('reconnect|cleanup|WHIP|publisher|failed to create|event post|event storage');
        const authLog = logEvidence('auth|login|session|scope|ICE|TURN|relay');
        const sourceHealthLog = logEvidence('source health|last-frame-aged|metadata-aged|no-subscriber|no-egress-session|unreachable|waiting-video');
        return [
          {
            level: degradedSources.length > 0 ? (healthCounts.offline > 0 ? 'bad' : 'warn') : 'info',
            title: degradedSources.length > 0 ? '라이브 소스 상태 확인 필요' : '라이브 소스 상태',
            detail: degradedSources.length > 0
              ? degradedSources.slice(0, 3).map(item => `#${item.sourceId || '-'} ${dashboardSourceHealthStatusLabel(item.status)}:${dashboardSourceHealthReason(item.reason)}`).join(' · ')
              : dashboardSourceHealthStatusText(sourceHealth),
            evidence: degradedSources.length > 0
              ? degradedSources.slice(0, 2).map(item => `프레임 ${dashboardSourceHealthAge(item.lastFrameAgeMs)} / 메타데이터 ${dashboardSourceHealthAge(item.lastMetadataAgeMs)}`).join(' · ')
              : '소스 상태가 정상 범위입니다.',
            log: sourceHealthLog.line,
            correlationId: firstDegradedSource?.sourceId ? `source-${firstDegradedSource.sourceId}` : sourceHealthLog.correlationId,
            action: degradedSources.length > 0
              ? '오프라인/지연 채널을 /ops/sources에서 재확인하고 입력, PublishedView, 구독 세션을 점검합니다.'
              : '라이브 소스 상태가 정상 범위입니다.',
            actionHref: firstDegradedSource?.sourceId
              ? `/ops/sources#channel=${encodeURIComponent(firstDegradedSource.sourceId)}`
              : '/ops/dashboard',
            actionLabel: '소스 상태',
            actionKind: 'source-health',
            actionPatterns: 'source health|last-frame-aged|metadata-aged|no-subscriber|no-egress-session|unreachable|waiting-video'
          },
          {
            level: stalledResources ? 'warn' : 'info',
            title: stalledResources ? '소스 수명주기 정리 확인 필요' : '소스 수명주기',
            detail: sourceSummary,
            evidence: `정리 ${cleanupCompleted}/${cleanupRequests} · ${recentSummary}`,
            log: sourceLog.line,
            correlationId: sourceLog.correlationId,
            action: stalledResources ? '종료된 세션 뒤에 리소스 스트림/분석 탭이 남았는지 정리 로그와 채널 상태를 확인합니다.' : '대기 또는 활성 수치가 일치합니다.',
            actionHref: '/ops/sources',
            actionLabel: '채널 상태',
            actionKind: 'source-diagnostics',
            actionPatterns: 'cleanup|source lifecycle|resourceActive|activeAnalysisTaps'
          },
          {
            level: staleTaps.length > 0 ? 'warn' : 'info',
            title: staleTaps.length > 0 ? '지연 분석 탭 감지' : '지연 감지',
            detail: staleTaps.length > 0
              ? staleTaps.slice(0, 3).map(tap => `${tap.tapId || '탭'} ${Math.round(numberValue(tap.lastUsedAgeMs))}ms`).join(' · ')
              : '5초 초과 미사용 분석 탭이 없습니다.',
            evidence: staleTaps.length > 0
              ? staleTaps.slice(0, 2).map(tap => `${dashboardRuntimeStreamLabel(tap.streamKey)} / ${tap.selectedRuleId || '룰 없음'}`).join(' · ')
              : `활성 분석 탭 ${activeTaps.length}`,
            log: staleLog.line,
            correlationId: staleLog.correlationId,
            action: staleTaps.length > 0 ? '뷰어 종료, route 이동, 탭 재사용 해제 흐름을 점검합니다.' : '분석 탭 age가 정상 범위입니다.',
            actionHref: '/ops/rules',
            actionLabel: '룰 연결',
            actionKind: 'registry-diff',
            actionPatterns: 'stale|metadata skipped|lastUsedAge|tapId'
          },
          {
            level: inactivePublishSources.length > 0 || cleanupBacklog ? 'warn' : 'info',
            title: inactivePublishSources.length > 0 || cleanupBacklog ? '재연결/정리 확인 필요' : '재연결/정리',
            detail: inactivePublishSources.length > 0
              ? inactivePublishSources.slice(0, 3).map(source => `${source.sourceId || '소스'} 비디오=${source.hasVideo ? 'on' : 'off'}`).join(' · ')
              : `발행 ${counts.publish} · 송출 ${counts.egress} · 정리 ${cleanupCompleted}/${cleanupRequests}`,
            evidence: post.lastError || storage.lastError
              ? `최근 오류 ${post.lastError || storage.lastError}`
              : `EventRecord 저장 ${storage.storedCount ?? 0} · POST 전송 ${post.sentCount ?? 0}`,
            log: reconnectLog.line,
            correlationId: reconnectLog.correlationId,
            action: inactivePublishSources.length > 0
              ? 'WHIP 발행자 재접속과 video track 생성 여부를 확인합니다.'
              : (cleanupBacklog ? '정리 완료 수가 요청 수를 따라가지 못하는지 로그를 확인합니다.' : '재연결/정리 지표가 정상 범위입니다.'),
            actionHref: '/ops/events',
            actionLabel: '이벤트 기록',
            actionKind: 'event-diagnostics',
            actionPatterns: 'reconnect|cleanup|WHIP|publisher|failed to create|event post|event storage'
          },
          {
            level: principal && hasOpsRead && !relayFallback ? 'info' : 'warn',
            title: principal && hasOpsRead && !relayFallback ? '권한/설정' : '권한/설정 확인 필요',
            detail: principal
              ? `역할 ${principal.role || '미제공'} · 인증 ${principal.authMode || '미제공'} · ops:read ${hasOpsRead ? '사용' : '없음'}`
              : 'whoami 응답을 확인하지 못했습니다.',
            evidence: relayFallback ? `${iceText} · relay 대체 사용` : iceText,
            log: authLog.line,
            correlationId: authLog.correlationId,
            action: principal && hasOpsRead && !relayFallback ? '운영 대시보드 접근 권한과 ICE 설정이 정상 범위입니다.' : '세션, role/scope, auth mode, TURN/ICE 설정을 확인합니다.',
            actionHref: '/ops/users',
            actionLabel: '권한 확인',
            actionKind: 'auth-config',
            actionPatterns: 'auth|login|session|scope|ICE|TURN|relay'
          }
        ];
      };
      const rootCauseLogFilter = (lines = [], correlationId = '', patterns = '') => {
        const regex = patterns ? new RegExp(patterns, 'i') : null;
        return (Array.isArray(lines) ? lines : [])
          .map(line => String(line || ''))
          .filter(line => (correlationId && line.includes(correlationId)) || (regex && regex.test(line)))
          .slice(-6);
      };
      const renderRootCauseActionOutput = (title, rows = [], logs = [], actionsHtml = '') => {
        const output = document.getElementById('dashRootCauseActionOutput');
        if (!output) return;
        output.hidden = false;
        output.innerHTML = `<strong>${escapeHtml(title)}</strong>
          <ul>${rows.map(row => `<li>${escapeHtml(row)}</li>`).join('')}</ul>
          ${actionsHtml ? `<div class="root-cause-action-buttons">${actionsHtml}</div>` : ''}
          ${logs.length > 0 ? `<pre>${escapeHtml(logs.join('\n'))}</pre>` : '<p class="hint">일치하는 최근 로그가 없습니다.</p>'}`;
      };
      const sourceHealthNeedsAction = item => item && String(item.status || '') !== 'live';
      const sourceHealthTargetIds = sourceHealth => dashboardSourceHealthItems(sourceHealth)
        .filter(sourceHealthNeedsAction)
        .map(item => String(item.sourceId || '').trim())
        .filter(Boolean);
      const sourceHealthRetryIds = bulk => Array.isArray(bulk?.retryBody?.sourceIds)
        ? bulk.retryBody.sourceIds.map(id => String(id || '').trim()).filter(Boolean)
        : [];
      const sourceHealthBulkTargetIds = (sourceHealth = {}, bulk = {}) => {
        const retryIds = sourceHealthRetryIds(bulk);
        if (retryIds.length > 0) return retryIds;
        const resultIds = Array.isArray(bulk?.results)
          ? bulk.results.map(result => String(result?.sourceId || '').trim()).filter(Boolean)
          : [];
        if (resultIds.length > 0) return [...new Set(resultIds)];
        return sourceHealthTargetIds(sourceHealth);
      };
      const sourceHealthAuditHref = (sourceHealth = {}, bulk = {}) => {
        const ids = sourceHealthBulkTargetIds(sourceHealth, bulk);
        const params = new URLSearchParams({
          auditArea: 'channels',
          auditPreset: 'source-health-state-change',
          auditAction: 'source-health-state-change'
        });
        if (ids.length === 1) {
          params.set('channel', ids[0]);
          params.set('auditTarget', `source:${ids[0]}`);
        } else if (ids.length > 1) {
          params.set('auditQ', 'source-health-state-change');
        }
        return `/ops/sources#${params.toString()}`;
      };
      const runSourceHealthBulk = (operation = 'check', sourceIds = []) => {
        const body = { operation };
        const ids = Array.isArray(sourceIds) ? sourceIds.filter(Boolean) : [];
        if (ids.length > 0) body.sourceIds = ids;
        return requestJson('/ops/api/source-health/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      };
      const sourceHealthBulkRows = (sourceHealth = {}, bulk = {}) => {
        const counts = dashboardSourceHealthCounts(sourceHealth);
        const retryIds = sourceHealthRetryIds(bulk);
        const results = Array.isArray(bulk?.results) ? bulk.results : [];
        const failed = results.filter(result => result?.ok === false);
        const unhealthy = results.filter(result => result?.healthy === false);
        return [
          dashboardSourceHealthStatusText(sourceHealth),
          `점검 대상 ${numberValue(bulk?.requestedCount ?? results.length)}개 · 비정상 ${numberValue(bulk?.unhealthyCount ?? unhealthy.length)}개 · 요청 실패 ${numberValue(bulk?.failCount ?? failed.length)}개`,
          retryIds.length > 0 ? `재검증 대상 ${retryIds.length}개: ${retryIds.slice(0, 6).join(', ')}` : '재검증 대상 없음',
          `partial failure ${bulk?.partialFailure ? '있음' : '없음'} · dry-run ${bulk?.dryRun === false ? 'off' : 'on'}`,
          failed.length > 0
            ? `구성 확인 필요: ${failed.slice(0, 3).map(result => `#${result.sourceId || '-'} ${result.reason || 'unknown'}`).join(' / ')}`
            : `요약 전체=${counts.total} 수신=${counts.live} 지연=${counts.stale} 오프라인=${counts.offline}`,
          '상태 변화 audit은 /ops/sources 변경 이력의 소스 상태 변경 preset에서 확인합니다.',
          'source health bulk는 registry를 변경하지 않아 rollback 대상이 없습니다.'
        ];
      };
      const renderSourceHealthActionOutput = (title, sourceHealth, bulk, logs) => {
        const retryIds = sourceHealthRetryIds(bulk);
        const actionButtons = [
          retryIds.length > 0
            ? '<button type="button" class="button button-secondary button-compact" data-source-health-retry>재검증 대상만 다시 확인</button>'
            : '',
          `<a class="button button-secondary button-compact" href="${escapeHtml(sourceHealthAuditHref(sourceHealth, bulk))}">소스 상태 변경 이력</a>`
        ].filter(Boolean);
        const actions = actionButtons.join('');
        renderRootCauseActionOutput(title, sourceHealthBulkRows(sourceHealth, bulk), logs, actions);
        const retryButton = document.querySelector('[data-source-health-retry]');
        if (retryButton) {
          retryButton.addEventListener('click', async () => {
            retryButton.disabled = true;
            const retried = await runSourceHealthBulk('retry', retryIds);
            renderSourceHealthActionOutput('라이브 소스 재검증 결과', sourceHealth, retried, logs);
          });
        }
      };
      const runRootCauseAction = async item => {
        const [logTail, sources, views, sourceHealth, catalog, eventsStatus, principal, browserConfig] = await Promise.all([
          requestJson('/ops/api/diagnostics/log-tail?limit=120').catch(error => ({ error: error.message, lines: [] })),
          requestJson('/ops/api/sources').catch(error => ({ error: error.message, sources: [] })),
          requestJson('/ops/api/views').catch(error => ({ error: error.message, views: [] })),
          requestJson('/ops/api/source-health').catch(error => ({ error: error.message, sourceHealth: [], summary: {} })),
          requestJson('/ops/api/rules/catalog').catch(error => ({ error: error.message, rules: [], vaRules: [], profiles: [] })),
          requestJson('/ops/api/events/status?limit=8&includeArchives=1').catch(error => ({ error: error.message, records: { records: [] } })),
          applyPrincipalVisibility().catch(() => null),
          requestJson('/webrtc/config').catch(error => ({ error: error.message }))
        ]);
        const logs = rootCauseLogFilter(logTail.lines, item.correlationId, item.actionPatterns);
        if (item.actionKind === 'source-health') {
          const targetIds = sourceHealthTargetIds(sourceHealth);
          const checked = await runSourceHealthBulk('check', targetIds);
          renderSourceHealthActionOutput('라이브 소스 상태 재검증', sourceHealth, checked, logs);
          return;
        }
        if (item.actionKind === 'source-diagnostics') {
          const sourceItems = Array.isArray(sources.sources) ? sources.sources : [];
          const viewItems = Array.isArray(views.views) ? views.views : [];
          const missingViews = sourceItems.filter(source => !viewItems.some(view => view.sourceId === source.sourceId));
          const disabled = sourceItems.filter(source => source.enabled === false);
          renderRootCauseActionOutput('채널 상태 재검증', [
            `소스 ${sourceItems.length}개 · 뷰 ${viewItems.length}개`,
            `뷰 누락 ${missingViews.length}개`,
            `비활성 소스 ${disabled.length}개`,
            '상세 조치는 /ops/sources에서 수행합니다.'
          ], logs);
          return;
        }
        if (item.actionKind === 'registry-diff') {
          const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
          const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
          const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
          const sourceItems = Array.isArray(sources.sources) ? sources.sources : [];
          const mismatches = vaRules.filter(rule => {
            const sourceId = String(rule.sourceId || rule.source?.sourceId || '');
            const profileId = String(rule.profileId || rule.analysis?.profileId || '');
            const eventRuleId = String(rule.eventRuleId || rule.templateRuleId || rule.templateStart?.ruleId || '');
            return (sourceId && !sourceItems.some(source => String(source.sourceId) === sourceId)) ||
              (profileId && !profiles.some(profile => String(profile.profileId || profile.id) === profileId)) ||
              (eventRuleId && !rules.some(eventRule => String(eventRule.ruleId || eventRule.id) === eventRuleId));
          });
          renderRootCauseActionOutput('룰 연결 차이 확인', [
            `VA 룰 ${vaRules.length}개 · 이벤트 템플릿 ${rules.length}개 · 프로파일 ${profiles.length}개`,
            `참조 불일치 ${mismatches.length}개`,
            '상세 조치는 /ops/rules에서 수행합니다.'
          ], logs);
          return;
        }
        if (item.actionKind === 'event-diagnostics') {
          const records = Array.isArray(eventsStatus?.records?.records) ? eventsStatus.records.records : [];
          const storage = eventsStatus.storage || {};
          const post = eventsStatus.post || {};
          renderRootCauseActionOutput('이벤트/증거 상태 확인', [
            `최근 EventRecord ${records.length}개`,
            `저장 성공=${storage.storedCount ?? 0} 실패=${storage.failedCount ?? 0}`,
            `이벤트 POST 전송=${post.sentCount ?? 0} 실패=${post.failedCount ?? 0}`,
            '상세 조치는 /ops/events에서 수행합니다.'
          ], logs);
          return;
        }
        renderRootCauseActionOutput('권한/설정 상태 확인', [
          `역할 ${principal?.role || '미제공'} · 인증 ${principal?.authMode || '미제공'}`,
          `ICE ${browserConfig?.iceTransportPolicy || '미제공'} · STUN ${browserConfig?.hasStun ? 'on' : 'off'} · TURN ${browserConfig?.hasTurn ? 'on' : 'off'}`,
          `relay 대체 ${browserConfig?.relayPolicyFallback ? 'on' : 'off'}`,
          '상세 조치는 /ops/users와 TURN/ICE 설정에서 수행합니다.'
        ], logs);
      };
      const renderDashboardRootCause = (runtime, principal, eventsStatus = {}, browserConfig = {}, diagnosticLog = {}, sourceHealth = {}) => {
        const items = dashboardRootCauseItems(runtime, principal, eventsStatus, browserConfig, diagnosticLog, sourceHealth);
        const warnCount = items.filter(item => item.level === 'warn' || item.level === 'bad').length;
        const healthCounts = dashboardSourceHealthCounts(sourceHealth);
        renderBadges('dashRootCauseBadges', [
          { text: warnCount > 0 ? `${warnCount}개 확인 필요` : '즉시 조치 없음', tone: warnCount > 0 ? 'warn' : '' },
          { text: `라이브 소스 ${healthCounts.live}/${healthCounts.total}`, tone: healthCounts.offline > 0 ? 'bad' : (healthCounts.stale > 0 ? 'warn' : '') },
          { text: '소스 수명주기' },
          { text: '지연' },
          { text: '재연결' },
          { text: '권한/설정' }
        ]);
        setText('dashRootCauseText', warnCount > 0
          ? '아래 항목을 기준으로 원인을 좁혀 확인합니다.'
          : '운영자가 바로 확인할 소스 수명주기, 지연, 재연결, 권한/설정 문제가 없습니다.');
        const list = document.getElementById('dashRootCauseList');
        if (!list) return items;
        list.innerHTML = items.map((item, index) => `<article class="root-cause-item ${escapeHtml(item.level)}">
          <div>
            <strong>${opsHtml(item.title)}</strong>
            <p>${opsHtml(item.detail)}</p>
          </div>
          <span class="chip${item.level === 'warn' ? ' warn' : (item.level === 'bad' ? ' bad' : '')}">${opsHtml(item.level === 'info' ? '정상' : '확인')}</span>
          ${item.correlationId ? `<span class="root-cause-correlation">cid ${escapeHtml(item.correlationId)}</span>` : ''}
          ${item.evidence ? `<p class="root-cause-evidence">${opsHtml(item.evidence)}</p>` : ''}
          ${item.log ? `<p class="root-cause-log">${opsHtml(item.log)}</p>` : ''}
          <p class="root-cause-action">${opsHtml(item.action)}</p>
          ${item.actionHref ? `<button type="button" class="button button-secondary button-compact root-cause-next-action" data-root-cause-index="${index}" data-root-cause-kind="${escapeHtml(item.actionKind || '')}" data-root-cause-action="${escapeHtml(item.title)}" data-correlation-id="${escapeHtml(item.correlationId || '')}">${opsHtml(item.actionLabel || '다음 조치')}</button> <a class="btn small" href="${escapeHtml(item.actionHref)}">${opsHtml('이동')}</a>` : ''}
        </article>`).join('');
        list.querySelectorAll('[data-root-cause-index]').forEach(button => {
          button.addEventListener('click', () => {
            const item = items[Number(button.dataset.rootCauseIndex || 0)];
            if (item) runRootCauseAction(item).catch(error => renderRootCauseActionOutput('다음 조치 실패', [error.message || String(error)], []));
          });
        });
        return items;
      };
      const dashboardIncidentEventRecords = eventsStatus => Array.isArray(eventsStatus?.records?.records) ? eventsStatus.records.records : [];
      const dashboardIncidentTimeLabel = item => {
        const value = item?.updateTime ?? item?.startTime ?? item?.timestampMs ?? item?.timestamp ?? item?.createdAt;
        if (value === null || value === undefined || value === '') return '시간 미제공';
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric > 1000000000000 ? new Date(numeric).toLocaleString() : `${Math.round(numeric)}ms`;
        }
        return display(value);
      };
      const dashboardIncidentSortValue = item => {
        const value = item?.updateTime ?? item?.startTime ?? item?.timestampMs ?? item?.timestamp ?? 0;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      let dashboardIncidentTimelineCache = { rootItems: [], eventsStatus: {}, diagnosticLog: {}, sourceHealth: {}, runtime: {}, catalog: {} };
      const dashboardIncidentHashKeys = { query: 'incidentQ', source: 'incidentSource' };
      const dashboardIncidentHashState = () => {
        const params = opsHashParams();
        const hasQuery = params.has(dashboardIncidentHashKeys.query);
        const hasSource = params.has(dashboardIncidentHashKeys.source);
        return {
          query: hasQuery ? String(params.get(dashboardIncidentHashKeys.query) || '').trim() : null,
          source: hasSource ? String(params.get(dashboardIncidentHashKeys.source) || '').trim() : null,
          hasIncidentFilter: hasQuery || hasSource
        };
      };
      const syncDashboardIncidentFilterFromHash = (options = {}) => {
        const hashState = dashboardIncidentHashState();
        if (!hashState.hasIncidentFilter && options.force !== true) return false;
        let changed = false;
        const search = document.getElementById('dashIncidentTimelineSearch');
        const source = document.getElementById('dashIncidentTimelineSource');
        if (search && (hashState.query !== null || options.force === true)) {
          const nextQuery = hashState.query || '';
          if (String(search.value || '') !== nextQuery) {
            search.value = nextQuery;
            changed = true;
          }
        }
        if (source && (hashState.source !== null || options.force === true)) {
          const nextSource = hashState.source || '';
          if (String(source.value || '') !== nextSource) {
            source.value = nextSource;
            changed = true;
          }
        }
        return changed;
      };
      const dashboardIncidentFilterState = () => ({
        query: String(document.getElementById('dashIncidentTimelineSearch')?.value || '').trim().toLowerCase(),
        source: String(document.getElementById('dashIncidentTimelineSource')?.value || '').trim()
      });
      const writeDashboardIncidentFilterHash = () => {
        const filter = dashboardIncidentFilterState();
        const params = opsHashParams();
        if (filter.query) params.set(dashboardIncidentHashKeys.query, filter.query);
        else params.delete(dashboardIncidentHashKeys.query);
        if (filter.source) params.set(dashboardIncidentHashKeys.source, filter.source);
        else params.delete(dashboardIncidentHashKeys.source);
        const nextHash = params.toString();
        const baseUrl = `${window.location.pathname}${window.location.search || ''}`;
        const nextUrl = nextHash ? `${baseUrl}#${nextHash}` : baseUrl;
        const currentUrl = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
        if (currentUrl !== nextUrl) window.history.replaceState(null, '', nextUrl);
      };
      const dashboardIncidentSourceKey = item => {
        const source = String(item?.source || '').toLowerCase();
        if (source.includes('eventrecord')) return 'event-record';
        if (source.includes('source health')) return 'source-health';
        if (source.includes('rule warning')) return 'rule-warning';
        if (source.includes('runtime status')) return 'runtime-status';
        if (source.includes('log tail')) return 'log-tail';
        if (source.includes('문제 원인')) return 'root-cause';
        return source ? source.replace(/[^a-z0-9가-힣]+/g, '-') : 'summary';
      };
      const dashboardRuleWarningItems = (catalog = {}, runtime = {}) => {
        const vaRules = Array.isArray(catalog?.vaRules) ? catalog.vaRules : [];
        const eventRules = Array.isArray(catalog?.rules) ? catalog.rules : [];
        const profiles = Array.isArray(catalog?.profiles) ? catalog.profiles : [];
        const activeTaps = Array.isArray(runtime?.analysisMatching?.activeTaps) ? runtime.analysisMatching.activeTaps : [];
        const activeRuleIds = new Set(activeTaps.map(tap => String(tap?.selectedRuleId || '').trim()).filter(Boolean));
        const profileIds = new Set(profiles.map(profile => String(profile?.profileId || profile?.id || '').trim()).filter(Boolean));
        const eventRuleIds = new Set(eventRules.map(rule => String(rule?.ruleId || rule?.id || '').trim()).filter(Boolean));
        return vaRules.map((rule, index) => {
          const id = String(rule?.id || rule?.ruleId || rule?.vaRuleId || `rule-${index}`).trim();
          const sourceId = String(rule?.sourceId || rule?.source?.sourceId || rule?.match?.sourceId || '').trim();
          const profileId = String(rule?.profileId || rule?.analysis?.profileId || '').trim();
          const eventRuleId = String(rule?.eventRuleId || rule?.templateRuleId || rule?.templateStart?.ruleId || '').trim();
          const issues = [];
          if (!sourceId) issues.push('source 미연결');
          if (profileId && !profileIds.has(profileId)) issues.push(`profile ${profileId} 없음`);
          if (eventRuleId && !eventRuleIds.has(eventRuleId)) issues.push(`event rule ${eventRuleId} 없음`);
          if (id && !activeRuleIds.has(id)) issues.push('runtime tap 미활성');
          if (issues.length === 0) return null;
          const missingReference = issues.some(item => item.includes('없음') || item.includes('미연결'));
          return {
            level: missingReference ? 'warn' : 'info',
            source: 'Rule Warning',
            time: '현재',
            sort: Number.MAX_SAFE_INTEGER - 150 - index,
            incidentId: `rule-warning:${id || index}`,
            sourceId,
            title: `룰 ${display(id || '-')} 확인`,
            detail: issues.join(' · '),
            evidence: `profile ${display(profileId || '미제공')} · event rule ${display(eventRuleId || '미제공')} · active tap ${activeRuleIds.has(id) ? '있음' : '없음'}`,
            correlationId: id ? `rule-${id}` : '',
            cause: issues.join(' · '),
            impact: missingReference
              ? '해당 룰은 runtime tap 또는 EventRecord 연결에서 누락될 수 있습니다.'
              : '룰은 저장되어 있지만 현재 runtime에서 관찰되지 않습니다.',
            nextAction: 'Ops Rules에서 source/profile/event template 연결과 PublishedView allowedRuleIds를 확인합니다.',
            actionHref: '/ops/rules'
          };
        }).filter(Boolean).slice(0, 3);
      };
      const dashboardRuntimeStatusIncidentItems = (runtime = {}) => {
        const counts = runtimeCounts(runtime);
        const activeTaps = counts.activeTaps;
        const staleTaps = activeTaps.filter(tap => numberValue(tap?.lastUsedAgeMs) > 5000);
        const cleanupRequests = numberValue(counts.debugCounters.cleanupRequests);
        const cleanupCompleted = numberValue(counts.debugCounters.cleanupCompleted);
        const cleanupBacklog = cleanupRequests > cleanupCompleted;
        const metadataChannels = Array.isArray(runtime?.webrtcHttp?.metadataDataChannel?.channels)
          ? runtime.webrtcHttp.metadataDataChannel.channels
          : [];
        const disconnectedMetadata = metadataChannels.filter(channel =>
          ['failed', 'closed', 'disconnected'].includes(String(channel?.state || channel?.readyState || '').toLowerCase()));
        const issues = [];
        if (staleTaps.length > 0) issues.push(`stale tap ${staleTaps.length}`);
        if (cleanupBacklog) issues.push(`cleanup ${cleanupCompleted}/${cleanupRequests}`);
        if (disconnectedMetadata.length > 0) issues.push(`metadata channel ${disconnectedMetadata.length}`);
        const level = issues.length > 0 ? 'warn' : 'info';
        return [{
          level,
          source: 'Runtime Status',
          time: '현재',
          sort: issues.length > 0 ? Number.MAX_SAFE_INTEGER - 160 : 10,
          incidentId: `runtime-status:${issues.length > 0 ? issues.join('-').replace(/[^a-z0-9]+/gi, '-') : 'normal'}`,
          title: issues.length > 0 ? '런타임 상태 확인 필요' : '런타임 상태 정상 범위',
          detail: issues.length > 0 ? issues.join(' · ') : `세션 ${counts.sessions} · 스트림 ${counts.streams} · 분석 ${counts.taps}`,
          evidence: `송출 ${counts.egress} · 발행 ${counts.publish} · metadata channel ${metadataChannels.length}`,
          correlationId: issues.length > 0 ? rootCauseCorrelationId(issues.join('|'), 'runtime-status') : '',
          cause: issues.length > 0 ? issues.join(' · ') : 'runtime/status에서 즉시 확인할 warning이 없습니다.',
          impact: issues.length > 0 ? '영상/메타데이터 갱신 또는 cleanup 완료가 지연될 수 있습니다.' : '영향 없음',
          nextAction: issues.length > 0
            ? 'Runtime 운영 판독과 관련 source/rule incident를 같은 시간대에서 확인합니다.'
            : '현재 상태를 유지하며 다음 refresh에서 추세를 봅니다.',
          actionHref: '/ops/dashboard'
        }];
      };
      const dashboardIncidentSearchText = item => [
        item?.incidentId,
        item?.sourceId,
        item?.source,
        item?.time,
        item?.title,
        item?.detail,
        item?.evidence,
        item?.cause,
        item?.impact,
        item?.correlationId,
        item?.nextAction,
        item?.actionHref
      ].map(value => String(value || '').toLowerCase()).join(' ');
      const dashboardIncidentMatchesFilter = (item, filter) => {
        if (filter.source && dashboardIncidentSourceKey(item) !== filter.source) return false;
        if (filter.query && !dashboardIncidentSearchText(item).includes(filter.query)) return false;
        return true;
      };
      const dashboardIncidentFiltersActive = filter => Boolean(filter.query || filter.source);
      const rerenderDashboardIncidentTimelineFromCache = () => {
        const cache = dashboardIncidentTimelineCache || {};
        renderDashboardIncidentTimeline(cache.rootItems, cache.eventsStatus, cache.diagnosticLog, cache.sourceHealth, cache.runtime, cache.catalog, { preserveCache: true });
      };
      const handleDashboardIncidentFilterChange = () => {
        writeDashboardIncidentFilterHash();
        rerenderDashboardIncidentTimelineFromCache();
      };
      const handleDashboardIncidentHashChange = () => {
        if (syncDashboardIncidentFilterFromHash({ force: true })) {
          rerenderDashboardIncidentTimelineFromCache();
        }
      };
      const dashboardIncidentShareUrl = () => {
        writeDashboardIncidentFilterHash();
        return `${window.location.origin}${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
      };
      const copyDashboardIncidentFilterLink = async () => {
        const button = document.getElementById('dashIncidentTimelineShare');
        const url = dashboardIncidentShareUrl();
        if (button) button.dataset.incidentShareUrl = url;
        try {
          await opsRulesCopyText(url);
          showToast('인시던트 필터 링크 복사 완료');
        } catch (_) {
          showToast('클립보드 복사 실패. 주소창의 필터 링크를 직접 복사하세요.', true);
        }
      };
      const dashboardIncidentTimelineItems = (rootItems = [], eventsStatus = {}, diagnosticLog = {}, sourceHealth = {}, runtime = {}, catalog = {}) => {
        const rootTimeline = (Array.isArray(rootItems) ? rootItems : [])
          .filter(item => item && (item.level === 'warn' || item.level === 'bad'))
          .slice(0, 3)
          .map((item, index) => ({
            level: item.level,
            source: '문제 원인',
            time: '현재',
            sort: Number.MAX_SAFE_INTEGER - index,
            incidentId: item.correlationId ? `root-cause:${item.correlationId}` : `root-cause:${item.actionKind || index}`,
            title: item.title,
            detail: item.detail,
            evidence: item.evidence || item.log,
            correlationId: item.correlationId,
            cause: item.detail,
            impact: item.evidence || item.log || '영향 범위 미제공',
            nextAction: item.action,
            actionHref: item.actionHref
          }));
        const eventTimeline = dashboardIncidentEventRecords(eventsStatus)
          .slice(0, 4)
          .map((item, index) => {
            const status = String(item?.status || '').toLowerCase();
            const level = ['failed', 'failure', 'error'].includes(status) ? 'warn' : 'info';
            const stream = item?.streamId || item?.channelId || '스트림 미제공';
            const scenario = [item?.scenarioName, item?.scenarioPhase].filter(Boolean).map(display).join(' · ');
            return {
              level,
              source: 'EventRecord',
              time: dashboardIncidentTimeLabel(item),
              sort: dashboardIncidentSortValue(item),
              incidentId: `event:${item?.eventId || item?.trackId || item?.streamId || index}`,
              sourceId: stream,
              title: `${display(item?.eventType || 'event')} · ${display(item?.status || '상태 미제공')}`,
              detail: `${display(stream)}${item?.trackId ? ` · track ${display(item.trackId)}` : ''}${scenario ? ` · ${scenario}` : ''}`,
              evidence: item?.eventId ? `eventId ${display(item.eventId)}` : 'eventId 미제공',
              correlationId: item?.eventId || item?.trackId || '',
              cause: `EventRecord status ${display(item?.status || '미제공')}`,
              impact: `${display(stream)}${item?.trackId ? ` · track ${display(item.trackId)}` : ''}`,
              nextAction: 'EventRecord 저장/POST 상태와 source health 단서를 함께 확인합니다.',
              actionHref: '/ops/events'
            };
          });
        const sourceTimeline = dashboardSourceHealthItems(sourceHealth)
          .filter(sourceHealthNeedsAction)
          .slice(0, 3)
          .map((item, index) => {
            const sourceId = String(item?.sourceId || '').trim();
            const incidentId = dashboardSourceHealthIncidentId(item);
            const auditHref = sourceHealthAuditHref(sourceHealth, {
              retryBody: sourceId ? { sourceIds: [sourceId] } : { sourceIds: [] },
              results: sourceId ? [{ sourceId }] : []
            });
            return {
              level: item.status === 'offline' ? 'bad' : 'warn',
              source: 'Source Health',
              time: '현재',
              sort: Number.MAX_SAFE_INTEGER - 100 - index,
              incidentId,
              sourceId,
              title: `소스 #${display(sourceId || '-')} ${dashboardSourceHealthStatusLabel(item.status)}`,
              detail: `${dashboardSourceHealthReason(item.reason)} · 상태 변경 이력과 retryable-only 재검증을 확인합니다.`,
              evidence: `프레임 ${dashboardSourceHealthAge(item.lastFrameAgeMs)} / 메타데이터 ${dashboardSourceHealthAge(item.lastMetadataAgeMs)}`,
              correlationId: sourceId ? `source-${sourceId}` : '',
              cause: dashboardSourceHealthReason(item.reason),
              impact: `소스 #${display(sourceId || '-')} ${dashboardSourceHealthStatusLabel(item.status)}`,
              nextAction: '소스 상태 변경 이력에서 같은 source incident 흐름을 확인합니다.',
              actionHref: auditHref
            };
          });
        const ruleTimeline = dashboardRuleWarningItems(catalog, runtime);
        const runtimeTimeline = dashboardRuntimeStatusIncidentItems(runtime);
        const logLines = Array.isArray(diagnosticLog?.lines) ? diagnosticLog.lines : [];
        const logTimeline = [...logLines]
          .reverse()
          .filter(line => /source health|cleanup|stale|event post|event storage|auth|ICE|TURN|relay|reconnect|WHIP/i.test(String(line || '')))
          .slice(0, 3)
          .map((line, index) => ({
            level: 'info',
            source: 'Log tail',
            time: '최근 로그',
            sort: Number.MAX_SAFE_INTEGER - 200 - index,
            incidentId: `log-tail:${rootCauseCorrelationId(line, 'source health|cleanup|stale|event post|event storage|auth|ICE|TURN|relay|reconnect|WHIP') || index}`,
            title: '로그 단서',
            detail: String(line || '').slice(0, 160),
            evidence: 'diagnostics log-tail',
            correlationId: rootCauseCorrelationId(line, 'source health|cleanup|stale|event post|event storage|auth|ICE|TURN|relay|reconnect|WHIP'),
            cause: '로그 패턴 매칭',
            impact: '관련 인시던트와 correlation id를 대조해야 합니다.',
            nextAction: '관련 root-cause 또는 source health incident와 같은 cid를 비교합니다.',
            actionHref: '/ops/dashboard'
          }));
        const items = [...rootTimeline, ...sourceTimeline, ...ruleTimeline, ...runtimeTimeline, ...eventTimeline, ...logTimeline]
          .sort((a, b) => numberValue(b.sort) - numberValue(a.sort))
          .slice(0, 8);
        if (items.length > 0) return items;
        return [{
          level: 'info',
          source: 'Summary',
          time: '현재',
          sort: 0,
          title: '최근 인시던트 없음',
          detail: '문제 원인, EventRecord, source health, 로그 tail에서 즉시 확인할 단서가 없습니다.',
          evidence: dashboardSourceHealthStatusText(sourceHealth),
          correlationId: '',
          cause: '즉시 원인 없음',
          impact: '영향 없음',
          nextAction: '다음 refresh에서 runtime/source/event 상태 추세를 확인합니다.',
          actionHref: '/ops/dashboard'
        }];
      };
      const renderDashboardIncidentTimeline = (rootItems = [], eventsStatus = {}, diagnosticLog = {}, sourceHealth = {}, runtime = {}, catalog = {}, options = {}) => {
        if (!options.preserveCache) {
          dashboardIncidentTimelineCache = { rootItems, eventsStatus, diagnosticLog, sourceHealth, runtime, catalog };
        }
        syncDashboardIncidentFilterFromHash();
        const allItems = dashboardIncidentTimelineItems(rootItems, eventsStatus, diagnosticLog, sourceHealth, runtime, catalog);
        const filter = dashboardIncidentFilterState();
        const items = allItems.filter(item => dashboardIncidentMatchesFilter(item, filter));
        const filtersActive = dashboardIncidentFiltersActive(filter);
        const warnCount = items.filter(item => item.level === 'warn' || item.level === 'bad').length;
        const eventCount = dashboardIncidentEventRecords(eventsStatus).length;
        const sourceIssueCount = dashboardSourceHealthItems(sourceHealth).filter(sourceHealthNeedsAction).length;
        const ruleWarningCount = dashboardRuleWarningItems(catalog, runtime).filter(item => item.level === 'warn').length;
        const runtimeWarningCount = dashboardRuntimeStatusIncidentItems(runtime).filter(item => item.level === 'warn').length;
        renderBadges('dashIncidentTimelineBadges', [
          { text: warnCount > 0 ? `${warnCount}개 확인 필요` : '즉시 인시던트 없음', tone: warnCount > 0 ? 'warn' : '' },
          { text: filtersActive ? `필터 결과 ${items.length}/${allItems.length}` : `전체 ${allItems.length}` },
          { text: `EventRecord ${eventCount}` },
          { text: sourceIssueCount > 0 ? `source health ${sourceIssueCount}` : 'source health 정상', tone: sourceIssueCount > 0 ? 'warn' : '' },
          { text: ruleWarningCount > 0 ? `rule warning ${ruleWarningCount}` : 'rule warning 정상', tone: ruleWarningCount > 0 ? 'warn' : 'info' },
          { text: runtimeWarningCount > 0 ? `runtime status ${runtimeWarningCount}` : 'runtime status 정상', tone: runtimeWarningCount > 0 ? 'warn' : 'info' },
          { text: diagnosticLog?.available === false ? 'log tail 없음' : 'log tail' }
        ]);
        setText('dashIncidentTimelineText', filtersActive && items.length === 0
          ? '필터에 맞는 인시던트 단서가 없습니다.'
          : (warnCount > 0
            ? '최근 단서를 시간순으로 묶었습니다. 확인 항목부터 관련 화면으로 이동합니다.'
            : '최근 EventRecord와 source health 단서를 기준으로 즉시 대응할 인시던트가 없습니다.'));
        const list = document.getElementById('dashIncidentTimeline');
        if (!list) return items;
        if (items.length === 0) {
          list.innerHTML = '<div class="empty">필터에 맞는 인시던트 단서가 없습니다.<br />다른 검색어 또는 출처 필터를 선택하세요.</div>';
          window.MediaServerUi?.translatePage?.();
          return items;
        }
        list.innerHTML = items.map(item => {
          const incidentMeta = [
            item.incidentId ? `incident ${item.incidentId}` : '',
            item.correlationId ? `cid ${item.correlationId}` : ''
          ].filter(Boolean).join(' · ');
          return `<article class="root-cause-item ${escapeHtml(item.level)}" data-incident-unit="${escapeHtml(dashboardIncidentSourceKey(item))}" data-incident-workflow="cause-impact-next-action">
          <div>
            <strong>${opsHtml(item.title)}</strong>
            <p>${opsHtml(item.detail)}</p>
          </div>
          <span class="chip${item.level === 'warn' ? ' warn' : (item.level === 'bad' ? ' bad' : '')}">${opsHtml(item.time || item.source)}</span>
          ${incidentMeta ? `<span class="root-cause-correlation">${escapeHtml(incidentMeta)}</span>` : ''}
          ${item.evidence ? `<p class="root-cause-evidence">${opsHtml(item.evidence)}</p>` : ''}
          <p class="incident-workflow"><span><strong>원인</strong> ${opsHtml(item.cause || item.detail || '미제공')}</span><span><strong>영향</strong> ${opsHtml(item.impact || item.evidence || '미제공')}</span><span><strong>다음</strong> ${opsHtml(item.nextAction || '상태 추세를 확인합니다.')}</span></p>
          <p class="root-cause-action">출처 ${opsHtml(item.source || '대시보드')}${item.nextAction ? ` · 다음 조치 ${opsHtml(item.nextAction)}` : ''}</p>
          ${item.actionHref ? `<a class="btn small root-cause-next-action" href="${escapeHtml(item.actionHref)}">관련 화면</a>` : ''}
        </article>`;
        }).join('');
        window.MediaServerUi?.translatePage?.();
        return items;
      };
      const dashboardRuntimeOpsEventRecords = (eventsStatus = {}, tap = {}, timeline = []) => {
        const records = dashboardIncidentEventRecords(eventsStatus);
        const lastEventIds = new Set((Array.isArray(timeline) ? timeline : [])
          .map(item => String(item?.lastEventId || '').trim())
          .filter(Boolean));
        const selectedRuleId = String(tap?.selectedRuleId || '').trim();
        const streamKey = String(tap?.streamKey || '').trim();
        const scoped = records.filter(item => {
          const eventId = String(item?.eventId || '').trim();
          const ruleId = String(item?.ruleId || item?.vaRuleId || item?.selectedRuleId || '').trim();
          const stream = String(item?.streamId || item?.channelId || '').trim();
          return (eventId && lastEventIds.has(eventId)) ||
            (selectedRuleId && ruleId === selectedRuleId) ||
            (streamKey && stream === streamKey);
        });
        return (scoped.length > 0 ? scoped : records).slice(0, 5);
      };
      const dashboardRuntimeOpsEventFailures = records => (Array.isArray(records) ? records : [])
        .filter(item => ['failed', 'failure', 'error', 'dropped'].includes(String(item?.status || '').toLowerCase()))
        .length;
      const dashboardRuntimeOpsTrackHealth = (metricsReport = {}, issueReport = {}) => {
        const trackHealth = metricsReport?.trackHealth || {};
        const retainedIssues = numberValue(issueReport?.retainedIssues);
        const totalIssues = numberValue(issueReport?.totalIssues);
        const unstable = numberValue(trackHealth.unstableTrackCount);
        const overlapRisk = numberValue(trackHealth.overlapRiskTrackCount);
        const missedFrames = numberValue(trackHealth.missedFrameTrackCount);
        const directionChanges = numberValue(trackHealth.directionChangeTrackCount);
        const issueText = retainedIssues > 0
          ? `TrackHealth 이슈 ${retainedIssues}/${totalIssues}`
          : 'TrackHealth 이슈 없음';
        return {
          retainedIssues,
          totalIssues,
          unstable,
          overlapRisk,
          missedFrames,
          directionChanges,
          issueText,
          detailText: `${issueText} · 불안정 ${unstable} · 겹침위험 ${overlapRisk} · missed ${missedFrames} · 방향변경 ${directionChanges}`
        };
      };
      const dashboardRuntimeOpsHighWater = tapState => {
        const capacity = numberValue(tapState?.maxQueueSize);
        const pending = numberValue(tapState?.pendingFrames);
        const peak = numberValue(tapState?.peakPendingFrames);
        const maxWait = tapState?.maxQueueWaitMs;
        const maxInference = tapState?.maxInferenceMs;
        const pressure = capacity > 0 && Math.max(pending, peak) >= capacity * 0.8;
        return {
          pressure,
          text: `high-water queue ${peak}/${capacity || '미제공'} · wait ${timelineTime(maxWait)} · inference ${timelineTime(maxInference)}`
        };
      };
      const dashboardRuntimeOpsNextAction = ({ tap, activeTimeline, trackHealth, recentEvents, eventFailures, highWater }) => {
        if (!tap?.tapId) return '활성 tap이 생기면 /ops/rules의 VA 룰 연결과 source 입력을 기준으로 다시 확인합니다.';
        if (trackHealth.retainedIssues > 0) return '트래킹 이슈 그룹에서 type/class/track을 확인하고 /ops/rules에서 선택 룰의 Tracker/Re-ID opt-in 조합, geometry, 입력 FPS를 함께 조정합니다. 이 warning은 default-on 근거가 아닙니다.';
        if (eventFailures > 0) return '최근 EventRecord 실패 상태를 /ops/events에서 열어 POST/storage와 evidence 저장 상태를 확인합니다.';
        if (highWater.pressure) return 'queue high-water가 높습니다. tap metrics의 pending/latency를 보고 입력 FPS 또는 sampling 설정을 점검합니다.';
        if (activeTimeline.length > 0 && recentEvents.length === 0) return '시나리오가 진행 중이지만 EventRecord가 없습니다. cooldown, duration, threshold 조건을 확인합니다.';
        return '현 상태는 정상 범위입니다. active 구간 high-water 메모를 유지하며 다음 refresh에서 추세를 봅니다.';
      };
      const renderDashboardRuntimeOpsEmpty = message => {
        renderBadges('dashRuntimeOpsBadges', [{ text: '분석 탭 대기', tone: 'info' }]);
        setText('dashRuntimeOpsText', message);
        const list = document.getElementById('dashRuntimeOpsList');
        if (list) list.innerHTML = '<div class="empty">활성 분석 탭이 있으면 runtime/state/event buffer를 운영 순서로 묶어 표시합니다.</div>';
      };
      const renderDashboardRuntimeOpsError = error => {
        renderBadges('dashRuntimeOpsBadges', [{ text: '운영 판독 실패', tone: 'warn' }]);
        setText('dashRuntimeOpsText', error?.message || '런타임 운영 판독을 불러오지 못했습니다.');
        const list = document.getElementById('dashRuntimeOpsList');
        if (list) list.innerHTML = '<div class="empty">state-dump 또는 metrics 조회 실패로 운영 판독을 표시하지 못했습니다.</div>';
      };
      const renderDashboardRuntimeOperations = (tap, stateDump = {}, metricsDump = {}, eventsStatus = {}) => {
        const list = document.getElementById('dashRuntimeOpsList');
        if (!list) return [];
        if (!tap?.tapId) {
          renderDashboardRuntimeOpsEmpty('활성 분석 탭이 있으면 운영 판독을 표시합니다.');
          return [];
        }
        const debugState = stateDump?.analyticsState?.debugState || {};
        const timeline = Array.isArray(debugState?.scenarioTimeline) ? debugState.scenarioTimeline : [];
        const activeTimeline = timeline.filter(item => item?.active !== false);
        const issueReport = {
          ...(metricsDump?.trackingIssueReport || {}),
          trackingPolicy: tap?.trackingPolicy || metricsDump?.trackingIssueReport?.trackingPolicy || {}
        };
        const metricsReport = metricsDump?.metricsReport || stateDump?.analyticsState?.metricsReport || {};
        const tapState = metricsDump?.tapState || {};
        const trackState = metricsDump?.trackState || metricsReport?.trackState || {};
        const recentEvents = dashboardRuntimeOpsEventRecords(eventsStatus, tap, timeline);
        const eventFailures = dashboardRuntimeOpsEventFailures(recentEvents);
        const trackHealth = dashboardRuntimeOpsTrackHealth(metricsReport, issueReport);
        const highWater = dashboardRuntimeOpsHighWater(tapState);
        const activeTracks = numberValue(trackState?.activeTracks ?? metricsReport?.trackState?.activeTracks);
        const emittedEvents = numberValue(metricsReport?.eventState?.eventsEmitted);
        const dedupedEvents = numberValue(metricsReport?.eventState?.eventsDeduped);
        const leadScenario = activeTimeline[0] || timeline[0] || null;
        const nextAction = dashboardRuntimeOpsNextAction({ tap, activeTimeline, trackHealth, recentEvents, eventFailures, highWater });
        const causeLevel = trackHealth.retainedIssues > 0 || eventFailures > 0 || highWater.pressure ? 'warn' : 'info';
        const impactLevel = trackHealth.retainedIssues > 0 || eventFailures > 0 ? 'warn' : 'info';
        const items = [
          {
            step: '원인',
            level: causeLevel,
            title: leadScenario
              ? `${scenarioPhaseLabel(leadScenario.currentPhase || leadScenario.scenarioPhase)} · ${display(leadScenario.scenarioName || leadScenario.scenarioKey || 'scenario')}`
              : (trackHealth.retainedIssues > 0 ? 'TrackHealth 이슈 우선 확인' : '즉시 원인 없음'),
            detail: leadScenario
              ? `rule ${display(leadScenario.ruleId || tap.selectedRuleId || '미선택')} · track ${display(leadScenario.trackId || '미제공')} · ${trackHealth.issueText}`
              : `${dashboardRuntimeStreamLabel(tap.streamKey)} · ${trackHealth.issueText}`,
            evidence: `${highWater.text} · recent EventRecord ${recentEvents.length}`,
            action: trackHealth.retainedIssues > 0
              ? 'TrackHealth 이슈가 원인 후보입니다.'
              : (leadScenario ? '시나리오 phase와 cooldown 상태를 먼저 봅니다.' : 'runtime/state/event buffer에서 즉시 확인할 원인은 없습니다.')
          },
          {
            step: '영향',
            level: impactLevel,
            title: `active track ${activeTracks} · timeline ${timeline.length}`,
            detail: `EventRecord ${recentEvents.length} · 실패 ${eventFailures} · 발행 ${emittedEvents} · 중복제거 ${dedupedEvents}`,
            evidence: trackHealth.detailText,
            action: eventFailures > 0
              ? 'EventRecord 실패가 downstream 영향 후보입니다.'
              : '영향 범위는 선택 tap의 state-dump와 metrics 범위로 제한됩니다.'
          },
          {
            step: '다음 조치',
            level: causeLevel,
            title: trackHealth.retainedIssues > 0 || eventFailures > 0 || highWater.pressure ? '운영자 확인 필요' : '관찰 유지',
            detail: nextAction,
            evidence: recentEvents[0]
              ? `최근 ${display(recentEvents[0].eventType || 'event')} · ${display(recentEvents[0].status || 'status')}`
              : '최근 EventRecord 없음',
            action: `선택 tap ${display(tap.tapId)} · ${dashboardRuntimeStreamLabel(tap.streamKey)}`
          }
        ];
        renderBadges('dashRuntimeOpsBadges', [
          { text: `탭 ${tap.tapId}` },
          { text: tap.selectedRuleId ? `룰 ${tap.selectedRuleId}` : '룰 미선택', tone: tap.selectedRuleId ? '' : 'info' },
          { text: `timeline ${timeline.length}` },
          { text: trackHealth.retainedIssues > 0 ? `TrackHealth ${trackHealth.retainedIssues}` : 'TrackHealth 정상', tone: trackHealth.retainedIssues > 0 ? 'warn' : 'info' },
          { text: eventFailures > 0 ? `EventRecord 실패 ${eventFailures}` : `EventRecord ${recentEvents.length}`, tone: eventFailures > 0 ? 'warn' : 'info' },
          { text: highWater.pressure ? 'high-water 확인' : 'high-water 관찰', tone: highWater.pressure ? 'warn' : 'info' }
        ]);
        setText('dashRuntimeOpsText', 'runtime/status, state-dump, metrics, EventRecord를 새 schema 없이 운영 판독 순서로 묶었습니다.');
        list.innerHTML = items.map(item => `<article class="root-cause-item ${escapeHtml(item.level)}">
          <div>
            <strong>${opsHtml(item.title)}</strong>
            <p>${opsHtml(item.detail)}</p>
          </div>
          ${badge(item.step, item.level === 'warn' ? 'warn' : 'info')}
          <p class="root-cause-evidence">${opsHtml(item.evidence)}</p>
          <p class="root-cause-action">${opsHtml(item.action)}</p>
        </article>`).join('');
        window.MediaServerUi?.translatePage?.();
        return items;
      };
      const scenarioPhaseLabel = phase => ({
        idle: 'Idle',
        'line-crossed': 'LineCrossed',
        'zone-entered': 'ZoneEntered',
        candidate: 'Candidate',
        observing: 'Observing',
        confirmed: 'Confirmed',
        cooldown: 'Cooldown',
        ended: 'Ended'
      })[String(phase || '').toLowerCase()] || display(phase || '미제공');
      const scenarioPhaseTone = phase => {
        const value = String(phase || '').toLowerCase();
        if (value === 'confirmed') return '';
        if (value === 'cooldown') return 'warn';
        if (value === 'ended') return 'info';
        if (['candidate', 'observing', 'line-crossed', 'zone-entered'].includes(value)) return 'info';
        return 'info';
      };
      const dashboardPrimaryTap = runtime => {
        const taps = Array.isArray(runtime?.analysisMatching?.activeTaps) ? runtime.analysisMatching.activeTaps : [];
        const hashTap = String(opsHashParams().get('tap') || '').trim();
        if (hashTap) {
          const selected = taps.find(tap => String(tap?.tapId || '') === hashTap);
          if (selected) return selected;
        }
        return taps.find(tap => String(tap?.selectedRuleId || '').trim()) || taps[0] || null;
      };
      const timelineTime = value => value === null || value === undefined ? '미제공' : ms(value);
      let dashboardVaQualityLastTimeline = [];
      let dashboardVaQualityLastIssueReport = {};
      let dashboardVaQualityFilterBound = false;
      const dashboardVaQualityFilterTerm = () =>
        String(document.getElementById('dashVaQualityFilterInput')?.value || '').trim().toLowerCase();
      const dashboardVaQualityMatches = (parts, term) => !term || parts
        .filter(part => part !== null && part !== undefined && part !== '')
        .map(part => String(part).toLowerCase())
        .some(part => part.includes(term));
      const scenarioPhaseRank = phase => {
        const value = String(phase || '').toLowerCase();
        if (value === 'confirmed') return 0;
        if (['observing', 'candidate', 'line-crossed', 'zone-entered'].includes(value)) return 1;
        if (value === 'cooldown') return 2;
        if (value === 'idle') return 3;
        if (value === 'ended') return 4;
        return 5;
      };
      const scenarioTimelineSearchParts = item => [
        item?.scenarioName,
        item?.scenarioKey,
        item?.currentPhase,
        item?.scenarioPhase,
        item?.ruleId,
        item?.ruleId ? `rule ${item.ruleId}` : '',
        item?.trackId,
        item?.trackId ? `track ${item.trackId}` : '',
        item?.zoneId,
        item?.zoneId ? `zone ${item.zoneId}` : '',
        item?.lineId,
        item?.lineId ? `line ${item.lineId}` : '',
        scenarioPhaseLabel(item?.currentPhase || item?.scenarioPhase)
      ];
      const scenarioTimelineSortValue = item =>
        numberValue(item?.phaseEnteredAtMs ?? item?.trackLastSeenAtMs ?? item?.trackFirstSeenAtMs);
      const bindDashboardVaQualityFilter = () => {
        if (dashboardVaQualityFilterBound) return;
        const input = document.getElementById('dashVaQualityFilterInput');
        if (!input) return;
        dashboardVaQualityFilterBound = true;
        input.addEventListener('input', () => {
          renderDashboardScenarioTimeline(dashboardVaQualityLastTimeline);
          renderDashboardTrackingIssues(dashboardVaQualityLastIssueReport);
        });
      };
      const renderDashboardScenarioTimeline = items => {
        const root = document.getElementById('dashScenarioTimeline');
        if (!root) return;
        const term = dashboardVaQualityFilterTerm();
        const rows = (Array.isArray(items) ? items : [])
          .filter(item => dashboardVaQualityMatches(scenarioTimelineSearchParts(item), term))
          .sort((a, b) => {
            const rank = scenarioPhaseRank(a?.currentPhase || a?.scenarioPhase) -
              scenarioPhaseRank(b?.currentPhase || b?.scenarioPhase);
            if (rank !== 0) return rank;
            return scenarioTimelineSortValue(b) - scenarioTimelineSortValue(a);
          });
        if (rows.length === 0) {
          root.innerHTML = term
            ? '<div class="empty">필터와 일치하는 시나리오 타임라인이 없습니다.</div>'
            : '<div class="empty">활성 시나리오 인스턴스가 없습니다.</div>';
          return;
        }
        root.innerHTML = rows.slice(0, 8).map(item => {
          const phase = item?.currentPhase || item?.scenarioPhase || '';
          const cooldown = item?.cooldownRemainingMs;
          const cooldownText = cooldown === null || cooldown === undefined ? '쿨다운 없음' : `쿨다운 ${timelineTime(cooldown)}`;
          const dedupe = numberValue(item?.dedupeSuppressedCount);
          const emitted = numberValue(item?.eventEmittedCount);
          const context = [
            item?.ruleId ? `rule ${item.ruleId}` : '',
            item?.trackId ? `track ${item.trackId}` : '',
            item?.zoneId ? `zone ${item.zoneId}` : '',
            item?.lineId ? `line ${item.lineId}` : ''
          ].filter(Boolean).join(' · ') || '컨텍스트 미제공';
          return `<article class="root-cause-item ${item?.active === false ? 'info' : 'info'}">
            <div>
              <strong>${escapeHtml(display(item?.scenarioName || item?.scenarioKey || 'scenario'))}</strong>
              <p>${escapeHtml(context)}</p>
            </div>
            ${badge(scenarioPhaseLabel(phase), scenarioPhaseTone(phase))}
            <p class="root-cause-evidence">단계 ${timelineTime(item?.phaseElapsedMs)} · ${escapeHtml(cooldownText)} · 발행 ${emitted} · 중복제거 ${dedupe}</p>
            <p class="root-cause-action">진입 ${escapeHtml(timelineTime(item?.phaseEnteredAtMs))} · 트랙 ${escapeHtml(timelineTime(item?.trackFirstSeenAtMs))} → ${escapeHtml(timelineTime(item?.trackLastSeenAtMs))}</p>
          </article>`;
        }).join('');
      };
      const groupTrackingIssues = report => {
        const groups = new Map();
        const issues = Array.isArray(report?.issues) ? report.issues : [];
        for (const issue of issues) {
          const type = String(issue?.type || 'unknown');
          if (!groups.has(type)) {
            groups.set(type, { type, count: 0, tracks: new Set(), severity: String(issue?.severity || 'info'), samples: [] });
          }
          const group = groups.get(type);
          group.count += 1;
          if (issue?.trackId) group.tracks.add(String(issue.trackId));
          group.samples.push(issue);
          if (String(issue?.severity || '') === 'warning') group.severity = 'warning';
        }
        return Array.from(groups.values()).sort((a, b) => {
          const severityRank = (b.severity === 'warning' ? 1 : 0) - (a.severity === 'warning' ? 1 : 0);
          if (severityRank !== 0) return severityRank;
          return b.count - a.count;
        });
      };
      const trackingIssueMetric = value => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '미제공';
        if (Math.abs(n) >= 10) return String(Math.round(n));
        return n.toFixed(2).replace(/\.?0+$/u, '');
      };
      const dashboardTrackingPolicySummary = report => {
        const policy = report?.trackingPolicy || {};
        const tracker = String(policy.tracker || report?.trackerPolicy || report?.effectiveTracker || '').trim();
        const effectiveTracker = String(policy.effectiveTracker || report?.effectiveTracker || '').trim();
        const reid = String(policy.reid || report?.reidPolicy || '').trim();
        const parts = [];
        if (tracker) parts.push(`tracker ${tracker}`);
        if (effectiveTracker && effectiveTracker !== tracker) parts.push(`effective ${effectiveTracker}`);
        if (reid) parts.push(`Re-ID ${reid}`);
        return parts.join(' · ') || 'Tracker/Re-ID 정책 미제공';
      };
      const dashboardTrackerWarningNextAction = group => {
        const type = String(group?.type || '').toLowerCase();
        if (type === 'overlap-risk') {
          return '다음 조치: /ops/rules에서 선택 룰의 region/line geometry와 class 범위를 좁혀 재검증합니다.';
        }
        if (type === 'missed-frame-spike' || type === 'lost' || type === 'reacquired') {
          return '다음 조치: source frame continuity, FPS, lost-buffer 조건을 먼저 확인한 뒤 룰 단위 Tracker/Re-ID 조합을 비교합니다.';
        }
        if (type === 'direction-change-spike' || type === 'low-association-confidence' || type === 'unstable-track') {
          return '다음 조치: Tracker/Re-ID 조합은 룰 단위 opt-in으로만 비교하고 geometry/FPS 튜닝 결과와 함께 기록합니다.';
        }
        return '다음 조치: type/class/track을 기준으로 /ops/rules의 선택 룰 튜닝 후보를 좁힙니다.';
      };
      const trackingIssueGroupSummary = (group, report = {}) => {
        const samples = Array.isArray(group?.samples) ? group.samples : [];
        const sample = samples.find(issue => String(issue?.severity || '') === 'warning') || samples[0] || {};
        const classes = Array.from(new Set(samples
          .map(issue => String(issue?.className || '').trim())
          .filter(Boolean))).slice(0, 3);
        const health = sample?.trackHealth || {};
        const metrics = [
          `class ${classes.join(', ') || '미제공'}`,
          `assoc ${trackingIssueMetric(health.associationConfidence)}`,
          `overlap ${trackingIssueMetric(health.overlapRisk)}`,
          `missed ${trackingIssueMetric(health.missedFrameCount)}`,
          `direction ${trackingIssueMetric(health.directionChangeCount)}`
        ].join(' · ');
        const message = String(sample?.message || '').trim() || '샘플 메시지 없음';
        const boundary = group?.severity === 'warning'
          ? '사용자 opt-in 튜닝 참고 · default-on 근거 아님'
          : '정보성 추적 상태';
        const nextAction = dashboardTrackerWarningNextAction(group);
        const policy = dashboardTrackingPolicySummary(report);
        return { metrics, message, boundary, nextAction, policy };
      };
      const trackingIssueSearchParts = group => [
        group?.type,
        group?.severity,
        ...Array.from(group?.tracks || []),
        ...Array.from(group?.tracks || []).map(track => `track ${track}`),
        ...(Array.isArray(group?.samples) ? group.samples.flatMap(issue => [
          issue?.trackId,
          issue?.trackId ? `track ${issue.trackId}` : '',
          issue?.className,
          issue?.reason,
          issue?.state,
          issue?.detail
        ]) : [])
      ];
      const renderDashboardTrackingIssues = report => {
        const root = document.getElementById('dashTrackingIssueGroups');
        if (!root) return;
        const term = dashboardVaQualityFilterTerm();
        const groups = groupTrackingIssues(report)
          .filter(group => dashboardVaQualityMatches(trackingIssueSearchParts(group), term));
        const totals = {
          retained: numberValue(report?.retainedIssues),
          total: numberValue(report?.totalIssues),
          rateLimited: numberValue(report?.rateLimitedCount)
        };
        if (groups.length === 0) {
          root.innerHTML = term
            ? `<div class="empty">필터와 일치하는 트래킹 이슈가 없습니다. · 유지 ${totals.retained}/${totals.total} · 제한 ${totals.rateLimited}</div>`
            : `<div class="empty">트래킹 이슈 없음 · 유지 ${totals.retained}/${totals.total} · 제한 ${totals.rateLimited}</div>`;
          return;
        }
        root.innerHTML = groups.slice(0, 8).map(group => {
          const summary = trackingIssueGroupSummary(group, report);
          return `<article class="root-cause-item ${group.severity === 'warning' ? 'warn' : 'info'}">
            <div>
              <strong>${escapeHtml(group.type)}</strong>
              <p>트랙 ${escapeHtml(Array.from(group.tracks).slice(0, 6).join(', ') || '미제공')}</p>
            </div>
            ${badge(`${group.count}건`, group.severity === 'warning' ? 'warn' : 'info')}
            <p class="root-cause-evidence">${opsHtml(summary.metrics)} · 정책 ${opsHtml(summary.policy)} · 유지 ${totals.retained}/${totals.total} · 제한 ${totals.rateLimited}</p>
            <p class="root-cause-action">${opsHtml(summary.boundary)}</p>
            <p class="root-cause-action">${opsHtml(summary.nextAction)} · ${opsHtml(summary.message)}</p>
          </article>`;
        }).join('');
      };
      const renderDashboardVaQualityEmpty = message => {
        bindDashboardVaQualityFilter();
        dashboardVaQualityLastTimeline = [];
        dashboardVaQualityLastIssueReport = {};
        renderBadges('dashVaQualityBadges', [{ text: '분석 탭 대기', tone: 'info' }]);
        setText('dashVaQualityText', message);
        renderDashboardScenarioTimeline([]);
        renderDashboardTrackingIssues({});
        renderDashboardRuntimeOpsEmpty(message);
      };
      const renderDashboardVaQualityError = error => {
        bindDashboardVaQualityFilter();
        renderBadges('dashVaQualityBadges', [{ text: '디버그 조회 실패', tone: 'warn' }]);
        setText('dashVaQualityText', error?.message || 'VA 런타임 디버그를 불러오지 못했습니다.');
        renderDashboardRuntimeOpsError(error);
      };
      async function refreshDashboardVaQuality(runtime, eventsStatus = {}) {
        bindDashboardVaQualityFilter();
        const tap = dashboardPrimaryTap(runtime);
        if (!tap?.tapId) {
          renderDashboardVaQualityEmpty('활성 분석 탭이 있으면 타임라인과 트래킹 이슈를 표시합니다.');
          return;
        }
        const [stateDump, metricsDump] = await Promise.all([
          requestJson(`/lab/analysis/taps/${encodeURIComponent(tap.tapId)}/state-dump`),
          requestJson(`/lab/analysis/taps/${encodeURIComponent(tap.tapId)}/metrics`)
        ]);
        const debugState = stateDump?.analyticsState?.debugState || {};
        const timeline = Array.isArray(debugState?.scenarioTimeline) ? debugState.scenarioTimeline : [];
        const issueReport = {
          ...(metricsDump?.trackingIssueReport || {}),
          trackingPolicy: tap?.trackingPolicy || metricsDump?.trackingIssueReport?.trackingPolicy || {}
        };
        dashboardVaQualityLastTimeline = timeline;
        dashboardVaQualityLastIssueReport = issueReport;
        renderBadges('dashVaQualityBadges', [
          { text: `탭 ${tap.tapId}` },
          { text: tap.selectedRuleId ? `룰 ${tap.selectedRuleId}` : '룰 미선택', tone: tap.selectedRuleId ? '' : 'info' },
          { text: `타임라인 ${timeline.length}` },
          { text: `이슈 ${numberValue(issueReport.retainedIssues)}`, tone: numberValue(issueReport.retainedIssues) > 0 ? 'warn' : 'info' }
        ]);
        setText('dashVaQualityText',
          `${dashboardRuntimeStreamLabel(tap.streamKey)} · 단계/쿨다운/중복제거는 state-dump 디버그 계층에서만 표시합니다.`);
        renderDashboardRuntimeOperations(tap, stateDump, metricsDump, eventsStatus);
        renderDashboardScenarioTimeline(timeline);
        renderDashboardTrackingIssues(issueReport);
      }
      async function refreshLive() {
        const [sources, views, catalog, runtime, events, users, diagnosticLog] = await Promise.all([
          requestJson('/ops/api/sources'),
          requestJson('/ops/api/views'),
          requestJson('/ops/api/rules/catalog'),
          requestJson('/ops/api/runtime/status'),
          requestJson('/ops/api/events/status?limit=12').catch(error => ({ error: error.message, records: { records: [] } })),
          requestJson('/ops/api/users').catch(error => ({ error: error.message, users: [] })),
          requestJson('/ops/api/diagnostics/log-tail?limit=80').catch(error => ({ error: error.message, available: false, lines: [] }))
        ]);
        const sourceItems = Array.isArray(sources.sources) ? sources.sources : [];
        const viewItems = Array.isArray(views.views) ? views.views : [];
        const eventRuleItems = Array.isArray(catalog.rules) ? catalog.rules : [];
        const vaRuleItems = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
        const userItems = Array.isArray(users.users) ? users.users : [];
        const counts = runtimeCounts(runtime);
        const staleTapCount = counts.activeTaps.filter(tap => numberValue(tap.lastUsedAgeMs) > 5000).length;
        setText('homeChannelCount', sourceItems.length);
        setText('homeVaRuleCount', vaRuleItems.length);
        setText('homeEventRuleCount', eventRuleItems.length);
        setText('homeUserCount', users.error ? '권한 없음' : userItems.length);
        setText('homeActiveSessions', counts.sessions);
        setText('homeActiveStreams', counts.streams);
        setText('homeAnalysisTaps', counts.taps);
        setText('homeStaleTaps', staleTapCount);
        renderBadges('homeConfigState', [
          { text: `${sourceItems.length} 채널` },
          { text: `${vaRuleItems.length} VA 룰` },
          { text: users.error ? '사용자 비공개' : `${userItems.length} 사용자`, tone: users.error ? 'info' : '' }
        ]);
        setText('homeConfigText', users.error
          ? '사용자 수는 현재 권한으로 숨김입니다.'
          : '등록된 구성을 보여줍니다.');
        renderBadges('homeRuntimeState', [
          { text: staleTapCount > 0 ? '확인 필요' : '정상', tone: staleTapCount > 0 ? 'warn' : '' },
          { text: counts.streams > 0 ? '활성' : '대기', tone: counts.streams > 0 ? '' : 'info' }
        ]);
        setText('homeRuntimeText', staleTapCount > 0
          ? `지연 탭 ${staleTapCount}개`
          : '지연 탭 없음');
        renderRaw('opsHomeRaw', 'opsHomePretty', { sources, views, catalog, runtime, events, users });
      }
      async function refreshDashboard() {
        const [runtime, principal, eventsStatus, browserConfig, diagnosticLog, sourceHealth, catalog] = await Promise.all([
          requestJson('/ops/api/runtime/status'),
          applyPrincipalVisibility().catch(() => null),
          requestJson('/ops/api/events/status?limit=5&includeArchives=1').catch(error => ({ error: error.message, records: { records: [] } })),
          requestJson('/webrtc/config').catch(error => ({ error: error.message })),
          requestJson('/ops/api/diagnostics/log-tail?limit=80').catch(error => ({ error: error.message, available: false, lines: [] })),
          requestJson('/ops/api/source-health').catch(error => ({ error: error.message, sourceHealth: [], summary: {} })),
          requestJson('/ops/api/rules/catalog').catch(error => ({ error: error.message, rules: [], vaRules: [], profiles: [] }))
        ]);
        const counts = runtimeCounts(runtime);
        const sourceHealthCounts = dashboardSourceHealthCounts(sourceHealth);
        const metadata = runtime?.webrtcHttp?.metadataDataChannel || {};
        const sideChannel = runtime?.webrtcHttp?.metadataSideChannel || {};
        setText('dashActiveSessions', counts.sessions);
        setText('dashActiveStreams', counts.streams);
        setText('dashActiveTaps', counts.taps);
        setText('dashPublishSources', counts.publishSources);
        renderBadges('dashHealthBadges', [
          { text: counts.streams > 0 ? '스트림 활성' : '스트림 대기', tone: counts.streams > 0 ? '' : 'info' },
          { text: counts.taps > 0 ? '분석 활성' : '분석 대기', tone: counts.taps > 0 ? '' : 'info' },
          { text: counts.egress > 0 ? '송출 활성' : '송출 대기', tone: counts.egress > 0 ? '' : 'info' },
          { text: `라이브 소스 ${sourceHealthCounts.live}/${sourceHealthCounts.total}`, tone: sourceHealthCounts.offline > 0 ? 'bad' : (sourceHealthCounts.stale > 0 ? 'warn' : 'info') }
        ]);
        setText('dashHealthText', `세션 ${counts.sessions} · 스트림 ${counts.streams} · 분석 ${counts.taps} · ${dashboardSourceHealthStatusText(sourceHealth)}`);
        renderBadges('dashRuntimeRows', [
          { text: `송출 ${counts.egress}` },
          { text: `발행 ${counts.publish}` },
          { text: `재사용 그룹 ${runtime?.analysisMatching?.reuseGroupCount ?? 0}` }
        ]);
        setText('dashRuntimeText', `프로파일 ${runtime?.analysisMatching?.profileDocumentCount ?? 0} · 룰 ${runtime?.analysisMatching?.ruleDocumentCount ?? 0}`);
        renderBadges('dashBackpressureRows', [
          { text: `메타데이터 채널 ${Array.isArray(metadata.channels) ? metadata.channels.length : 0}` },
          { text: `sse ${sideChannel.activeSseClients ?? 0}` },
          { text: `ws ${sideChannel.activeWebSocketClients ?? 0}` }
        ]);
        setText('dashBackpressureText', 'DataChannel/SSE/WS 상태입니다.');
        const debugKeys = Object.keys(counts.debugCounters);
        renderBadges('dashCleanupRows', [
          { text: `진단 항목 ${debugKeys.length}` },
          { text: counts.debugCounters.cleanupRequests != null ? `정리 요청 ${counts.debugCounters.cleanupRequests}` : '정리 요청 미제공', tone: counts.debugCounters.cleanupRequests != null ? '' : 'info' },
          { text: counts.debugCounters.cleanupCompleted != null ? `정리 완료 ${counts.debugCounters.cleanupCompleted}` : '정리 완료 미제공', tone: counts.debugCounters.cleanupCompleted != null ? '' : 'info' }
        ]);
        setText('dashCleanupText', debugKeys.length > 0 ? '정리 상태입니다.' : '정리 카운터 없음');
        setText('dashEgressCount', counts.egress);
        setText('dashPublishCount', counts.publish);
        setText('dashReuseGroupCount', runtime?.analysisMatching?.reuseGroupCount ?? 0);
        setText('dashMetadataChannelCount', Array.isArray(metadata.channels) ? metadata.channels.length : 0);
        setText('dashSseClientCount', sideChannel.activeSseClients ?? 0);
        setText('dashWsClientCount', sideChannel.activeWebSocketClients ?? 0);
        setText('dashDetailText',
          `프로파일 ${runtime?.analysisMatching?.profileDocumentCount ?? 0} · 룰 ${runtime?.analysisMatching?.ruleDocumentCount ?? 0} · 발행 ${counts.publish} · 송출 ${counts.egress}`);
        const rootCauseItems = renderDashboardRootCause(runtime, principal, eventsStatus, browserConfig, diagnosticLog, sourceHealth);
        renderDashboardIncidentTimeline(rootCauseItems, eventsStatus, diagnosticLog, sourceHealth, runtime, catalog);
        await refreshDashboardVaQuality(runtime, eventsStatus).catch(renderDashboardVaQualityError);
        renderRaw('opsDashboardRaw', 'opsDashboardPretty', runtime);
        window.MediaServerUi?.translatePage?.();
      }
      let opsVlmSelectedOptionId = '';
      const opsVlmControlValue = (id, fallback = '') => {
        const element = document.getElementById(id);
        return element ? String(element.value || fallback) : fallback;
      };
      const opsVlmResourceText = option => {
        const estimate = option?.impact?.resourceEstimate || {};
        const memory = estimate.memory?.localWorkingSetGb;
        const disk = estimate.disk?.modelArtifactGb;
        const latency = estimate.latency || {};
        const pieces = [];
        if (memory != null) pieces.push(`memory ${memory}GB`);
        if (disk != null) pieces.push(`disk ${disk}GB`);
        if (latency.p50Seconds != null && latency.p95Seconds != null) {
          pieces.push(`P50 ${latency.p50Seconds}s / P95 ${latency.p95Seconds}s`);
        } else if (latency.label) {
          pieces.push(latency.label);
        }
        return pieces.length ? pieces.join(' · ') : 'planning estimate 미제공';
      };
      const renderOpsVlmOptions = payload => {
        const options = Array.isArray(payload?.options) ? payload.options : [];
        const selectableIds = new Set(payload?.decision?.selectableOptionIds || []);
        if (!opsVlmSelectedOptionId || !selectableIds.has(opsVlmSelectedOptionId)) {
          opsVlmSelectedOptionId = payload?.decision?.selectableOptionIds?.[0] || '';
        }
        const tbody = document.getElementById('opsVlmOptionRows');
        if (tbody) {
          if (options.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">선택 가능한 local/cloud dry-run 후보가 없습니다.</td></tr>';
          } else {
            tbody.innerHTML = options.map(option => {
              const selectable = option.selectable === true;
              const selected = selectable && option.id === opsVlmSelectedOptionId;
              const state = selectable
                ? (selected ? badge('선택됨') : badge('선택 가능', 'info'))
                : badge((option.disabledReasons || []).join(', ') || '비활성', 'warn');
              return `<tr data-vlm-option-row="${escapeHtml(option.id)}">
                <td><button type="button" class="button-secondary button-compact" data-vlm-option-id="${escapeHtml(option.id)}" ${selectable ? '' : 'disabled'}>${selected ? '선택됨' : '선택'}</button></td>
                <td><strong>${escapeHtml(option.model || '-')}</strong><br><span class="ops-rule-note">${escapeHtml(option.tier || '-')}</span></td>
                <td>${escapeHtml(option.deployment || '-')}<br><span class="ops-rule-note">${escapeHtml(option.actionType || '-')}</span></td>
                <td>${escapeHtml(opsVlmResourceText(option))}<br><span class="ops-rule-note">${escapeHtml(option.impact?.installImpactSummary || '')}</span></td>
                <td>${state}</td>
              </tr>`;
            }).join('');
          }
        }
        const selected = options.find(option => option.id === opsVlmSelectedOptionId);
        setText('opsVlmSelectionSummary', selected
          ? `${selected.model} · ${selected.actionType} · S05 profile 저장 전 dry-run 선택 상태`
          : '선택한 후보 없음');
      };
      const renderOpsVlmDisabled = payload => {
        const root = document.getElementById('opsVlmDisabledList');
        const disabled = Array.isArray(payload?.disabledOptions) ? payload.disabledOptions : [];
        if (!root) return;
        if (disabled.length === 0) {
          root.innerHTML = '<div class="empty">비추천 후보 없음</div>';
          return;
        }
        root.innerHTML = disabled.map(item => `<article class="root-cause-item info">
          <div>
            <strong>${escapeHtml(item.model || item.id || '-')}</strong>
            <p>${escapeHtml(item.reason || item.disabledReason || '-')}</p>
          </div>
          ${badge(item.disabledReason || 'disabled', item.licenseReviewRequired ? 'warn' : 'info')}
        </article>`).join('');
      };
      async function refreshOpsVlmInstallConnection() {
        const status = document.getElementById('opsVlmStatus');
        setFeedback(status, '', false, { collapseEmpty: true });
        const params = new URLSearchParams({
          hardwareClass: opsVlmControlValue('opsVlmHardwareClass', 'local-standard'),
          runtimeReadiness: opsVlmControlValue('opsVlmRuntimeReadiness', 'missing'),
          privacyMode: opsVlmControlValue('opsVlmPrivacyMode', 'local-only'),
          cloudOptIn: opsVlmControlValue('opsVlmCloudOptIn', 'not-acknowledged')
        });
        const payload = await requestJson(`/ops/api/vlm/install-connection/dry-run?${params.toString()}`);
        setText('opsVlmDecisionStatus', payload.decision?.status || '-');
        setText('opsVlmSelectableCount', (payload.decision?.selectableOptionIds || []).length);
        setText('opsVlmHardwareSummary', payload.pcCapability?.hardwareClass || '-');
        setText('opsVlmTransferSummary', payload.privacy?.externalTransferAllowed ? 'cloud allowed' : 'local only');
        setText('opsVlmDecisionText', payload.decision?.blockedReason
          ? `선택 차단: ${payload.decision.blockedReason}`
          : '후보 중 하나만 선택해 다음 단계의 profile 저장 전 검토 상태로 둡니다.');
        renderBadges('opsVlmWarnings', (payload.warnings || []).map(text => ({
          text,
          tone: text.includes('required') || text.includes('high') ? 'warn' : 'info'
        })));
        renderBadges('opsVlmBoundaryBadges', [
          { text: payload.contractInvariants?.installPerformed === false ? '설치 없음' : '설치 확인 필요', tone: payload.contractInvariants?.installPerformed === false ? '' : 'warn' },
          { text: payload.contractInvariants?.cloudProviderApiCalled === false ? 'provider 호출 없음' : 'provider 확인 필요', tone: payload.contractInvariants?.cloudProviderApiCalled === false ? '' : 'warn' },
          { text: payload.contractInvariants?.profileStored === false ? 'profile 저장 없음' : 'profile 확인 필요', tone: payload.contractInvariants?.profileStored === false ? '' : 'warn' },
          { text: payload.contractInvariants?.runtimeVlmCallPerformed === false ? 'VLM 호출 없음' : 'VLM 호출 확인 필요', tone: payload.contractInvariants?.runtimeVlmCallPerformed === false ? '' : 'warn' },
          { text: payload.contractInvariants?.viewerClientExposureAdded === false ? 'viewer 비노출' : 'viewer 노출 확인 필요', tone: payload.contractInvariants?.viewerClientExposureAdded === false ? '' : 'warn' }
        ]);
        renderOpsVlmOptions(payload);
        renderOpsVlmDisabled(payload);
        renderRaw('opsVlmRaw', 'opsVlmPretty', payload);
        window.MediaServerUi?.translatePage?.();
      }
      const wireOpsVlmControls = () => {
        document.getElementById('opsVlmRefresh')?.addEventListener('click', () => refreshOpsVlmInstallConnection().catch(error => setFeedback(document.getElementById('opsVlmStatus'), error.message, true, { collapseEmpty: true })));
        for (const id of ['opsVlmHardwareClass', 'opsVlmRuntimeReadiness', 'opsVlmPrivacyMode', 'opsVlmCloudOptIn']) {
          document.getElementById(id)?.addEventListener('change', () => {
            opsVlmSelectedOptionId = '';
            refreshOpsVlmInstallConnection().catch(error => setFeedback(document.getElementById('opsVlmStatus'), error.message, true, { collapseEmpty: true }));
          });
        }
        document.getElementById('opsVlmOptionRows')?.addEventListener('click', event => {
          const button = event.target.closest('[data-vlm-option-id]');
          if (!button || button.disabled) return;
          opsVlmSelectedOptionId = String(button.dataset.vlmOptionId || '');
          refreshOpsVlmInstallConnection().catch(error => setFeedback(document.getElementById('opsVlmStatus'), error.message, true, { collapseEmpty: true }));
        });
      };
      const OPS_EVENT_RECORD_LIMIT = 25;
      let opsEventRecordsOffset = 0;
      let alertDeliveryPayloadCache = null;
      const eventRecordTime = value => {
        if (value === null || value === undefined || value === '') return '미제공';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '미제공';
        if (numeric > 1000000000000) return new Date(numeric).toLocaleString();
        return `${Math.round(numeric)}ms`;
      };
      const eventRecordEvidence = item => {
        const snapshotPath = String(item?.snapshotPath || '').trim();
        const clipPath = String(item?.clipPath || '').trim();
        const badges = [];
        if (snapshotPath) badges.push(badge('snapshot'));
        if (clipPath) badges.push(badge('clip'));
        if (badges.length === 0) badges.push(badge('없음', 'info'));
        const names = [snapshotPath, clipPath]
          .filter(Boolean)
          .map(value => value.split(/[\\/]/).pop())
          .filter(Boolean)
          .slice(0, 2);
        const evidenceHref = value => `/lab/analysis/events/evidence?path=${encodeURIComponent(value)}&download=1`;
        const bundlePayload = item => {
          const params = new URLSearchParams();
          const eventId = String(item?.eventId || '').trim();
          if (eventId) params.set('eventId', eventId);
          if (snapshotPath) params.set('snapshotPath', snapshotPath);
          if (clipPath) params.set('clipPath', clipPath);
          params.set('expiresAtMs', String(Date.now() + 24 * 60 * 60 * 1000));
          params.set('download', '1');
          return Object.fromEntries(params.entries());
        };
        const actions = [
          snapshotPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(snapshotPath))}">snapshot 다운로드</a>` : '',
          clipPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(clipPath))}">clip manifest</a>` : '',
          (snapshotPath || clipPath) ? `<button type="button" class="button button-secondary button-compact" data-evidence-bundle="${escapeHtml(JSON.stringify(bundlePayload(item)))}">signed bundle zip</button>` : ''
        ].filter(Boolean).join('');
        return `<div class="event-evidence-cell">
          <div class="badge-row">${badges.join('')}</div>
          ${names.length ? `<span class="ops-rule-note">${escapeHtml(names.join(' · '))}</span>` : ''}
          ${actions ? `<div class="event-evidence-actions">${actions}</div>` : ''}
        </div>`;
      };
      function renderEventRows(items) {
        const tbody = document.getElementById('eventRecordRows');
        if (!tbody) return;
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(tbody, 7, '조회된 이벤트 기록이 없습니다.');
          return;
        }
        tbody.innerHTML = items.map(item => {
          const ruleId = display(item?.metadata?.ruleId || item?.ruleId || item?.vaRuleId || '');
          const eventHtml = `<div class="ops-rule-value-stack">
            <span class="table-identity-pill table-identity-id">${escapeHtml(display(item?.eventId || '-'))}</span>
            <span class="ops-rule-note">${escapeHtml(display(item?.eventType || 'event'))}</span>
            ${ruleId ? `<span class="ops-rule-note">rule ${escapeHtml(ruleId)}</span>` : ''}
          </div>`;
          const scenarioParts = [item?.scenarioName, item?.scenarioPhase].filter(Boolean).map(display);
          return `<tr>
            ${tableCellHtml('이벤트', eventHtml)}
            ${tableCellHtml('상태', badge(item?.status || '미제공', item?.status === 'ended' ? 'info' : ''), 'table-cell-status')}
            ${tableCellHtml('스트림', escapeHtml(display(item?.streamId || item?.channelId || '-')))}
            ${tableCellHtml('트랙', escapeHtml(display(item?.trackId ?? '-')))}
            ${tableCellHtml('시나리오', escapeHtml(scenarioParts.join(' · ') || display(item?.className || '-')))}
            ${tableCellHtml('증거', eventRecordEvidence(item))}
            ${tableCellHtml('수정 시각', escapeHtml(eventRecordTime(item?.updateTime || item?.startTime)), 'table-cell-nowrap')}
          </tr>`;
        }).join('');
        bindEvidenceBundleActions();
      }
      const EVENT_REVIEW_STATUSES = ['new', 'reviewing', 'confirmed', 'dismissed', 'needs-follow-up'];
      const EVENT_REVIEW_CLASSES = ['unclassified', 'true-positive', 'false-positive', 'duplicate', 'needs-tuning'];
      const eventReviewSelectHtml = (name, values, selected) => {
        const value = String(selected || values[0] || '').trim();
        return `<select data-event-review-field="${escapeHtml(name)}">
          ${values.map(item => `<option value="${escapeHtml(item)}"${item === value ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('')}
        </select>`;
      };
      function renderEventReviewRows(items) {
        const tbody = document.getElementById('eventReviewRows');
        if (!tbody) return;
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(tbody, 5, '검토할 Rule/Scenario 이벤트가 없습니다.');
          return;
        }
        tbody.innerHTML = items.map(entry => {
          const event = entry?.event || {};
          const review = entry?.review || {};
          const eventId = String(review.eventId || event.eventId || '').trim();
          const scenarioParts = [event?.scenarioName, event?.scenarioPhase]
            .filter(Boolean)
            .map(display);
          const eventHtml = `<div class="ops-rule-value-stack">
            <span class="table-identity-pill table-identity-id">${escapeHtml(display(eventId || '-'))}</span>
            <span class="ops-rule-note">${escapeHtml(display(event?.eventType || event?.className || 'event'))}${scenarioParts.length ? ` · ${escapeHtml(scenarioParts.join(' · '))}` : ''}</span>
          </div>`;
          const note = String(review.note || '');
          const noteHtml = `<input class="event-review-note-input" data-event-review-field="note" maxlength="500" value="${escapeHtml(note)}" placeholder="운영자 메모" />`;
          const updated = review.updatedAtMs ? `${eventRecordTime(review.updatedAtMs)} · ${display(review.actor || '-')}` : '미검토';
          return `<tr data-event-review-row data-event-id="${escapeHtml(eventId)}">
            ${tableCellHtml('이벤트', eventHtml)}
            ${tableCellHtml('리뷰', eventReviewSelectHtml('reviewStatus', EVENT_REVIEW_STATUSES, review.reviewStatus || 'new'))}
            ${tableCellHtml('분류', eventReviewSelectHtml('classification', EVENT_REVIEW_CLASSES, review.classification || 'unclassified'))}
            ${tableCellHtml('메모', noteHtml)}
            ${tableCellHtml('업데이트', `<div class="event-review-actions"><span>${escapeHtml(updated)}</span><button type="button" class="button button-secondary button-compact" data-event-review-save ${eventId ? '' : 'disabled'}>저장</button></div>`)}
          </tr>`;
        }).join('');
        bindEventReviewActions();
      }
      function bindEventReviewActions() {
        document.querySelectorAll('[data-event-review-save]').forEach(button => {
          button.addEventListener('click', async () => {
            const row = button.closest('[data-event-review-row]');
            const eventId = String(row?.dataset.eventId || '').trim();
            if (!eventId) {
              setText('eventReviewSummary', 'eventId가 없어 review를 저장할 수 없습니다.');
              return;
            }
            const payload = {
              reviewStatus: row.querySelector('[data-event-review-field="reviewStatus"]')?.value || 'reviewing',
              classification: row.querySelector('[data-event-review-field="classification"]')?.value || 'unclassified',
              note: row.querySelector('[data-event-review-field="note"]')?.value || ''
            };
            button.disabled = true;
            try {
              const result = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              setText('eventReviewSummary', `${eventId} review 저장됨 · ${result.review?.reviewStatus || payload.reviewStatus}`);
              await refreshEvents();
            } catch (error) {
              setText('eventReviewSummary', `review 저장 실패: ${error.message}`);
            } finally {
              button.disabled = false;
            }
          });
        });
      }
      function bindEvidenceBundleActions() {
        document.querySelectorAll('[data-evidence-bundle]').forEach(button => {
          button.addEventListener('click', async () => {
            try {
              const payload = JSON.parse(button.dataset.evidenceBundle || '{}');
              const params = new URLSearchParams(payload);
              const tokenPayload = await requestJson(`/lab/analysis/events/evidence/bundle-token?${params.toString()}`);
              if (!tokenPayload.bundleUrl) throw new Error('bundle token URL missing');
              window.location.href = tokenPayload.bundleUrl;
            } catch (error) {
              setText('eventRecordSummary', `bundle token 발급 실패: ${error.message}`);
            }
          });
        });
      }
      function eventRecordQueryParams() {
        const eventParams = new URLSearchParams({
          limit: String(OPS_EVENT_RECORD_LIMIT),
          offset: String(Math.max(0, opsEventRecordsOffset))
        });
        const channelFilter = String(opsHashParams().get('channel') || '').trim();
        if (channelFilter) eventParams.set('channelId', channelFilter);
        const evidence = String(document.getElementById('eventRecordsEvidenceSelect')?.value || '').trim();
        if (evidence) eventParams.set('evidence', evidence);
        if (document.getElementById('eventRecordsIncludeArchives')?.checked) {
          eventParams.set('includeArchives', '1');
        }
        return { eventParams, channelFilter, evidence };
      }
      function eventReviewQueryParams(eventParams) {
        const reviewParams = new URLSearchParams(eventParams.toString());
        const reviewStatus = String(document.getElementById('eventReviewStatusFilter')?.value || '').trim();
        const classification = String(document.getElementById('eventReviewClassFilter')?.value || '').trim();
        if (reviewStatus) reviewParams.set('reviewStatus', reviewStatus);
        if (classification) reviewParams.set('classification', classification);
        return reviewParams;
      }
      function alertDeliveryBodyFromForm() {
        const kind = String(document.getElementById('alertDeliveryKind')?.value || 'webhook').trim();
        const endpoint = String(document.getElementById('alertDeliveryEndpoint')?.value || '').trim();
        const body = {
          id: String(document.getElementById('alertDeliveryId')?.value || '').trim(),
          kind,
          label: String(document.getElementById('alertDeliveryLabel')?.value || '').trim(),
          enabled: Boolean(document.getElementById('alertDeliveryEnabled')?.checked),
          endpoint,
          retryMax: numberValue(document.getElementById('alertDeliveryRetryMax')?.value || 3),
          retryBackoffMs: numberValue(document.getElementById('alertDeliveryRetryBackoff')?.value || 2000)
        };
        if (kind === 'webhook') body.webhookUrl = endpoint;
        if (kind === 'email') body.emailTo = endpoint;
        if (kind === 'slack') body.slackChannel = endpoint;
        return body;
      }
      function alertDeliveryFilterState() {
        return {
          query: String(document.getElementById('alertDeliveryFilter')?.value || '').trim().toLowerCase(),
          kind: String(document.getElementById('alertDeliveryKindFilter')?.value || '').trim(),
          enabled: String(document.getElementById('alertDeliveryEnabledFilter')?.value || '').trim()
        };
      }
      function alertDeliveryMatchesFilter(item, filter) {
        const enabled = Boolean(item?.enabled);
        if (filter.kind && String(item?.kind || '') !== filter.kind) return false;
        if (filter.enabled === 'enabled' && !enabled) return false;
        if (filter.enabled === 'disabled' && enabled) return false;
        if (!filter.query) return true;
        const haystack = [
          item?.id,
          item?.label,
          item?.kind,
          item?.endpointMasked,
          item?.retryPolicy?.maxAttempts,
          item?.retryPolicy?.backoffMs
        ].map(value => String(value ?? '').toLowerCase()).join(' ');
        return haystack.includes(filter.query);
      }
      function renderAlertDeliveryRows(payload = {}) {
        const tbody = document.getElementById('alertDeliveryRows');
        if (!tbody) return;
        const integrations = Array.isArray(payload.integrations) ? payload.integrations : [];
        const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
        const filter = alertDeliveryFilterState();
        const filteredIntegrations = integrations.filter(item => alertDeliveryMatchesFilter(item, filter));
        const latestById = new Map();
        for (const attempt of attempts) {
          const id = String(attempt?.deliveryId || '');
          if (id && !latestById.has(id)) latestById.set(id, attempt);
        }
        if (integrations.length === 0) {
          setTableEmpty(tbody, 4, '등록된 alert delivery integration이 없습니다.');
          return;
        }
        if (filteredIntegrations.length === 0) {
          setTableEmpty(tbody, 4, '필터 조건에 맞는 alert delivery integration이 없습니다.');
          return;
        }
        tbody.innerHTML = filteredIntegrations.map(item => {
          const attempt = latestById.get(String(item?.id || '')) || {};
          const retry = item?.retryPolicy || {};
          return `<tr>
            ${tableCellHtml('Integration', `
              <div class="table-cell-main">
                <strong>${escapeHtml(display(item?.label || item?.id))}</strong>
                <span>${escapeHtml(display(item?.kind))} · ${escapeHtml(display(item?.endpointMasked || 'redacted'))}</span>
              </div>`)}
            ${tableCellHtml('상태', badge(item?.enabled ? '활성' : '비활성', item?.enabled ? '' : 'warn'), 'status')}
            ${tableCellHtml('Retry', escapeHtml(`${display(retry.maxAttempts)}회 · ${display(retry.backoffMs)}ms`))}
            ${tableCellHtml('최근 시도', `
              <div class="table-cell-note">${escapeHtml(display(attempt?.status || '미제공'))}${attempt?.transport ? ` · ${escapeHtml(display(attempt.transport))}` : ''}</div>
              ${opsRowActionsHtml(`<button class="button-secondary" type="button" data-alert-delivery-test="${escapeHtml(item?.id || '')}">Fixture</button>`, 'table-actions')}`, 'actions')}
          </tr>`;
        }).join('');
        bindAlertDeliveryRowActions();
      }
      function renderAlertDelivery(payload = {}) {
        alertDeliveryPayloadCache = payload;
        const integrations = Array.isArray(payload.integrations) ? payload.integrations : [];
        const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
        const enabledCount = integrations.filter(item => item?.enabled).length;
        const filteredCount = integrations.filter(item => alertDeliveryMatchesFilter(item, alertDeliveryFilterState())).length;
        renderBadges('alertDeliveryBadges', [
          { text: `등록 ${integrations.length}` },
          { text: `필터 ${filteredCount}` },
          { text: `활성 ${enabledCount}`, tone: enabledCount > 0 ? '' : 'warn' },
          { text: `시도 ${attempts.length}` },
          { text: payload?.contract?.eventPostPayloadChanged === false ? 'Event POST 변경 없음' : '계약 확인 필요', tone: payload?.contract?.eventPostPayloadChanged === false ? 'info' : 'warn' },
          { text: payload?.contract?.auditMasking ? 'audit masking' : 'audit 확인 필요', tone: payload?.contract?.auditMasking ? 'info' : 'warn' }
        ]);
        setText(
          'alertDeliverySummary',
          payload.error
            ? `alert delivery 조회 실패: ${payload.error}`
            : `transports webhook/email/slack · list/filter ${filteredCount}/${integrations.length} · bounded retry · fixture smoke · Event POST payload 변경 없음`
        );
        renderAlertDeliveryRows(payload);
      }
      function rerenderAlertDeliveryFilters() {
        if (alertDeliveryPayloadCache) {
          renderAlertDelivery(alertDeliveryPayloadCache);
        }
      }
      async function saveAlertDeliveryIntegration() {
        const payload = await requestJson('/ops/api/alerts/deliveries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertDeliveryBodyFromForm())
        });
        showToast?.('Alert delivery 저장 완료');
        return payload;
      }
      async function testAlertDeliveryIntegration(id = '') {
        const body = id ? { deliveryId: id } : { deliveryId: alertDeliveryBodyFromForm().id };
        const payload = await requestJson('/ops/api/alerts/deliveries/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        showToast?.('Alert delivery fixture 전송 완료');
        return payload;
      }
      function bindAlertDeliveryRowActions() {
        document.querySelectorAll('[data-alert-delivery-test]').forEach(button => {
          if (button.dataset.boundAlertDeliveryTest === '1') return;
          button.dataset.boundAlertDeliveryTest = '1';
          button.addEventListener('click', async () => {
            try {
              await testAlertDeliveryIntegration(button.dataset.alertDeliveryTest || '');
              await refreshEvents();
            } catch (error) {
              setText('alertDeliverySummary', `fixture 전송 실패: ${error.message}`);
            }
          });
        });
      }
      async function refreshEvents() {
        const { eventParams, channelFilter, evidence } = eventRecordQueryParams();
        const [payload, alertPayload] = await Promise.all([
          requestJson(`/ops/api/events/status?${eventParams.toString()}`),
          requestJson('/ops/api/alerts/deliveries').catch(error => ({ error: error.message, integrations: [], attempts: [] }))
        ]);
        const reviewParams = eventReviewQueryParams(eventParams);
        const reviewPayload = await requestJson(`/ops/api/events/reviews?${reviewParams.toString()}`)
          .catch(error => ({ error: error.message, records: [] }));
        const storage = payload.storage || {};
        const post = payload.post || {};
        const records = payload.records || { records: [] };
        const policy = storage.evidencePolicy || {};
        renderBadges('eventStorageBadges', [
          { text: storage.enabled ? '활성' : '비활성', tone: storage.enabled ? '' : 'warn' },
          { text: `저장 ${storage.storedCount ?? 0}` },
          { text: `실패 ${storage.failedCount ?? 0}`, tone: numberValue(storage.failedCount) > 0 ? 'bad' : '' },
          { text: `드롭 ${storage.droppedCount ?? 0}`, tone: numberValue(storage.droppedCount) > 0 ? 'warn' : '' }
        ]);
        setText('eventStorageText', `큐 ${storage.queueSize ?? 0}/${storage.maxQueueSize ?? 0} · 파일 ${(storage.activeFileSizeBytes ?? 0)} bytes · 복구 ${storage.lastRecoveryStatus || '미제공'}`);
        renderBadges('eventPostBadges', [
          { text: post.enabled ? '활성' : '비활성', tone: post.enabled ? '' : 'warn' },
          { text: `전송 ${post.sentCount ?? 0}` },
          { text: `실패 ${post.failedCount ?? 0}`, tone: numberValue(post.failedCount) > 0 ? 'bad' : '' },
          { text: `억제 ${post.suppressedCount ?? 0}` }
        ]);
        setText('eventPostText', post.lastError ? `마지막 오류: ${post.lastError}` : `큐 ${post.queueSize ?? 0}/${post.maxQueueSize ?? 0}`);
        renderBadges('eventEvidencePolicyBadges', [
          { text: policy.longRecording === false ? '장기 녹화 없음' : '장기 녹화 확인 필요', tone: policy.longRecording === false ? 'info' : 'warn' },
          { text: policy.snapshotEnabled ? 'snapshot hook' : 'snapshot off', tone: policy.snapshotEnabled ? '' : 'info' },
          { text: policy.clipBundleEnabled ? 'clip bundle hook' : 'clip off', tone: policy.clipBundleEnabled ? '' : 'info' },
          { text: policy.compactionDestructive === false ? '비파괴 compaction' : 'compaction 확인 필요', tone: policy.compactionDestructive === false ? '' : 'warn' }
        ]);
        setText('eventEvidencePolicyText', `${policy.scope || 'event-short-evidence'} · ${policy.clipFormat || 'frame-bundle'} · MP4/VMS 장기 녹화 범위 아님`);
        const exportPolicy = policy.exportPolicy || {};
        const retentionPolicy = policy.retentionPolicy || {};
        const deletePolicy = policy.deletePolicy || {};
        renderBadges('eventExportPolicyBadges', [
          { text: exportPolicy.snapshotDownload ? 'snapshot 다운로드' : 'snapshot export off', tone: exportPolicy.snapshotDownload ? '' : 'warn' },
          { text: exportPolicy.clipManifestDownload ? 'clip manifest 다운로드' : 'clip export off', tone: exportPolicy.clipManifestDownload ? '' : 'warn' },
          { text: exportPolicy.bundleArchiveDownload ? 'bundle zip 다운로드' : 'bundle zip 없음', tone: exportPolicy.bundleArchiveDownload ? '' : 'info' },
          { text: exportPolicy.bundleSignedToken ? 'signed token' : 'token 없음', tone: exportPolicy.bundleSignedToken ? 'info' : 'warn' },
          { text: exportPolicy.exportAudit ? 'export audit 기록' : 'export audit 없음', tone: exportPolicy.exportAudit ? '' : 'warn' },
          { text: exportPolicy.bundleMaxAgeMs ? `bundle 만료 ${Math.round(exportPolicy.bundleMaxAgeMs / 3600000)}h` : 'bundle 만료 미지정', tone: exportPolicy.bundleMaxAgeMs ? 'info' : 'warn' },
          { text: deletePolicy.compactionDelete ? 'compaction 삭제 가능' : '삭제 제한', tone: deletePolicy.compactionDelete ? 'info' : 'warn' }
        ]);
        setText('eventExportPolicyText',
          `보존 ${retentionPolicy.archiveRetention || 'oldest-rotated-only'} · bundle ${retentionPolicy.bundleExpiry || 'signed-token-expiresAtMs'} · audit ${exportPolicy.auditAction || 'export-bundle'} · evidence 파일 직접 삭제 ${deletePolicy.evidenceFileDelete ? '허용' : '불가'}`);
        renderAlertDelivery(alertPayload);
        const eventItems = Array.isArray(records.records) ? records.records : [];
        setText(
          'eventRecordSummary',
          records.error
            ? `조회 실패: ${records.error}`
            : `records ${eventItems.length}/${records.matchedRecords ?? eventItems.length} · offset ${records.offset ?? opsEventRecordsOffset} · hasMore ${records.hasMore ? 'yes' : 'no'}${channelFilter ? ` · channel ${channelFilter}` : ''}${evidence ? ` · evidence ${evidence}` : ''}`
        );
        renderEventRows(eventItems);
        const reviewItems = Array.isArray(reviewPayload.records) ? reviewPayload.records : [];
        setText(
          'eventReviewSummary',
          reviewPayload.error
            ? `review 조회 실패: ${reviewPayload.error}`
            : `review ${reviewItems.length}개 · Event POST payload 변경 없음 · audit action event-review-update`
        );
        renderEventReviewRows(reviewItems);
        const prevButton = document.getElementById('eventRecordsPrev');
        const nextButton = document.getElementById('eventRecordsNext');
        if (prevButton) prevButton.disabled = opsEventRecordsOffset <= 0;
        if (nextButton) nextButton.disabled = !records.hasMore;
        if (records.nextOffset != null) nextButton?.setAttribute('data-next-offset', String(records.nextOffset));
        renderRaw('opsEventsRaw', 'opsEventsPretty', { storage, post, alertDelivery: alertPayload, records, reviews: reviewPayload });
      }
      const itemId = item => display(item?.id || item?.ruleId || item?.profileId || '-');
      const opsRulesIdText = value => {
        const text = String(value ?? '').trim();
        return text || '-';
      };
      function opsRulesIdentityBadgeHtml(kind, value, note = '') {
        const text = String(value ?? '').trim();
        const label = text || '-';
        return `<div class="ops-rule-value-stack">
          <span class="table-identity-pill table-identity-${escapeHtml(kind)}">${escapeHtml(label)}</span>
          ${note ? `<span class="ops-rule-note">${escapeHtml(note)}</span>` : ''}
        </div>`;
      }
      const listText = value => Array.isArray(value) ? (value.length ? value.join(', ') : '미제공') : display(value);
      const sourceText = source => {
        if (!source || typeof source !== 'object') return '미제공';
        if (source.kind === 'file') return `파일 · ${display(source.file)}`;
        if (source.kind === 'webrtc') return `Published WebRTC · ${display(source.webrtcSourceId || source.sourceId)}`;
        if (source.kind === 'whep') return `외부 WHEP · ${display(source.whepUrl || source.url)}`;
        if (source.url) return `${display(source.kind)} · ${source.url}`;
        return display(source.kind);
      };
      const matchText = match => {
        if (!match || typeof match !== 'object') return '전체';
        const parts = [
          `source ${display(match.sourceKind || '*')}`,
          `route ${display(match.route || '*')}`
        ];
        if (match.clientId) parts.push(`client ${match.clientId}`);
        if (match.vaRule) parts.push(`vaRule ${match.vaRule}`);
        return parts.join(' · ');
      };
      const outputsText = outputs => {
        if (!outputs || typeof outputs !== 'object') return '미제공';
        return Object.entries(outputs)
          .filter(([, value]) => value === true || value === 'true')
          .map(([key]) => key)
          .join(', ') || '미제공';
      };
      function opsRulesEditorStatus(message, failed = false) {
        setFeedback(document.getElementById('opsRulesStatus'), message, failed, { collapseEmpty: true });
      }
      function opsRulesConfirmDangerAction(key, message) {
        if (opsRulesPendingDangerAction !== key) {
          opsRulesPendingDangerAction = key;
          opsRulesEditorStatus(`${message} 다시 누르면 실행합니다.`, false);
          return false;
        }
        opsRulesPendingDangerAction = '';
        return true;
      }
      let opsCatalogEventTemplates = [];
      let opsCatalogProfiles = [];
      let opsCatalogBuiltInProfiles = [];
      let opsCatalogVaRules = [];
      let opsRulesSources = [];
      let opsRulesViews = [];
      let opsRulesChannels = [];
      let opsRuleCategoryCatalog = [];
      let opsRulesValidationIssues = [];
      let opsRulesActiveMode = 'va-rule';
      let opsRulesDetailMode = 'closed';
      let opsRulesDetailRecordId = '';
      let opsRulesPendingDangerAction = '';
      let opsVaRuleTemplateId = '';
      let opsRulesCurrentRecord = null;
      const opsVaRulePreviewState = {
        viewId: '',
        sessionId: '',
        pc: null,
        iceTimer: null,
        status: 'idle',
        connectionStatus: 'idle',
        lastError: '',
        operationInFlight: false
      };
      let opsVaGeometryDragIndex = -1;
      let opsVaGeometryDragPointerId = null;
      let opsVaGeometryDidDrag = false;
      let opsVaGeometryUndoStack = [];
      const opsLabAnalysisBase = ['/lab', 'analysis'].join('/');
      const opsLabProfilesPath = `${opsLabAnalysisBase}/profiles`;
      const opsLabRulesPath = `${opsLabAnalysisBase}/rules`;
      const opsLabVaRulesPath = `${opsLabAnalysisBase}/va-rules`;
      const opsRuleDefaultCategories = ['person', 'vehicle'];
      const OPS_RULES_MAX_NUMERIC_ID = 9999;
      const OPS_RULES_POLYGON_MAX_POINTS = 12;
      const OPS_RULES_LINE_MAX_POINTS = 2;
      const OPS_RULES_GEOMETRY_HIT_RADIUS_PX = 16;
      const OPS_RULES_GEOMETRY_UNDO_MAX = 20;
      const OPS_RULES_GEOMETRY_VIEWBOX_WIDTH = 100;
      const OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT = 56.25;
      let opsWebRtcConfigPromise = null;
      const opsRulesDefaultSummary = '채널 설정을 먼저 관리합니다.';
      const opsRulesFieldOwnership = {
        profile: ['detector', 'fps', 'maxQueue', 'confidence', 'nms', 'inputWidth', 'inputHeight', 'adaptive'],
        eventTemplate: ['event.type', 'event.region.direction', 'event.minConfidence', 'event.minDurationMs', 'analysis.classes', 'scenario.*'],
        vaRule: ['source', 'binding', 'analysis.profileId', 'templateStart.ruleId', 'event.region.points', 'name', 'enabled']
      };
      const opsRulesModeConfigs = {
        'va-rule': {
          label: '채널 분석 설정',
          summary: '채널에 이벤트 템플릿과 분석 프로파일을 연결하는 최종 조립 단계입니다.',
          composerTitle: '채널 분석 설정',
          composerHint: '채널, 이벤트 템플릿, 분석 프로파일, 영역/라인을 연결하는 최종 설정입니다.',
          saveText: '저장',
          saveProxyId: 'saveVaRuleBtn',
          steps: [
            { sectionId: 'ruleBasicSection', title: '설정 정보', hint: '이름과 활성 상태를 정합니다.' },
            { sectionId: 'ruleScenarioSection', title: '템플릿 선택', hint: '시나리오와 대상 객체는 이벤트 템플릿에서 가져옵니다.' },
            { sectionId: 'profileSection', title: '프로파일 선택', hint: '분석 엔진 설정은 프로파일에서 가져옵니다.' },
            { sectionId: 'ruleSourceSection', title: '채널 선택', hint: '어느 채널에 붙일지 고릅니다.' },
            { sectionId: 'ruleGeometrySection', title: '영역/라인', hint: '채널별 geometry는 여기서 연결합니다.' }
          ]
        },
        'event-rule': {
          label: '이벤트 템플릿',
          summary: '시나리오 조건과 대상 객체를 재사용하는 이벤트 템플릿입니다.',
          composerTitle: '이벤트 템플릿',
          composerHint: '채널 분석 설정에서 선택하는 공통 이벤트 규칙입니다.',
          saveText: '저장',
          saveProxyId: 'saveRuleBtn',
          steps: [
            { sectionId: 'ruleBasicSection', title: '템플릿 정보', hint: '재사용할 템플릿 ID를 확인합니다.' },
            { sectionId: 'ruleScenarioSection', title: '시나리오', hint: '기본 이벤트 또는 시나리오 템플릿을 선택합니다.' },
            { sectionId: 'ruleObjectsSection', title: '대상 객체', hint: '이 조건이 판정할 객체 범위를 정합니다.' },
            { sectionId: 'ruleOutputSection', title: '조건 값', hint: '체류, cooldown, 점유 조건을 정합니다.' }
          ]
        },
        profile: {
          label: '분석 프로파일',
          summary: '검출기, FPS, 신뢰도 같은 분석 엔진 설정을 모아 둡니다.',
          composerTitle: '분석 프로파일',
          composerHint: '채널 설정이나 템플릿에서 선택합니다.',
          saveText: '저장',
          saveProxyId: 'saveProfileBtn',
          steps: [
            { sectionId: 'profileSection', title: '프로파일 설정', hint: '검출기, FPS, 신뢰도, 입력 크기만 설정합니다.' }
          ]
        }
      };
      function opsRulesModeConfig(mode) {
        return opsRulesModeConfigs[mode] || null;
      }
      function opsRulesDetailLabel(mode, detailMode) {
        const config = opsRulesModeConfig(mode);
        const label = config?.label || '항목';
        if (detailMode === 'view') return `${label} 상세`;
        if (detailMode === 'edit') return `${label} 수정`;
        if (detailMode === 'new') return `${label} 추가`;
        return label;
      }
      function setOpsRulesEditorModeButtons(mode) {
        const buttons = [
          ['va-rule', document.getElementById('opsAddVaRuleBtn')],
          ['event-rule', document.getElementById('opsAddEventRuleBtn')],
          ['profile', document.getElementById('opsAddProfileBtn')]
        ];
        for (const [buttonMode, button] of buttons) {
          if (!button) continue;
          const active = mode === buttonMode;
          button.classList.toggle('button-primary', active);
          button.classList.toggle('button-secondary', !active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
      }
      function setOpsRulesCatalogVisibility(mode) {
        const sections = {
          'va-rule': document.getElementById('opsVaRulesSection'),
          'event-rule': document.getElementById('opsEventRulesSection'),
          profile: document.getElementById('opsProfileRulesSection')
        };
        const activeMode = mode && sections[mode] ? mode : 'va-rule';
        opsRulesActiveMode = activeMode;
        const summary = document.getElementById('opsRulesEditorSummary');
        const config = opsRulesModeConfig(activeMode);
        if (summary) summary.textContent = config?.summary || opsRulesDefaultSummary;
        for (const [sectionMode, section] of Object.entries(sections)) {
          if (!section) continue;
          section.hidden = sectionMode !== activeMode;
        }
      }
      function setOpsRulesDetailChrome(mode, detailMode = 'closed', recordId = '') {
        const panel = document.getElementById('opsRulesDetailPanel');
        const title = document.getElementById('opsRulesComposerTitle');
        const hint = document.getElementById('opsRulesComposerHint');
        const badge = document.getElementById('opsRulesDetailMode');
        const idBadge = document.getElementById('opsRulesDetailId');
        const edit = document.getElementById('opsRulesComposerEdit');
        const save = document.getElementById('opsRulesComposerSave');
        const config = opsRulesModeConfig(mode);
        opsRulesDetailMode = detailMode;
        opsRulesDetailRecordId = String(recordId || '');
        if (!config || detailMode === 'closed') {
          setOpsDetailPanelOpen(panel, false);
          return;
        }
        setOpsDetailPanelOpen(panel, true);
        if (badge) badge.textContent = detailMode === 'view' ? '상세' : (detailMode === 'edit' ? '수정' : '추가');
        if (idBadge) {
          idBadge.hidden = !opsRulesDetailRecordId;
          idBadge.textContent = opsRulesIdText(opsRulesDetailRecordId);
        }
        if (title) title.textContent = opsRulesDetailLabel(mode, detailMode);
        const readOnlyBuiltInProfile = mode === 'profile' && opsRulesCurrentRecord?.item?.builtIn === true;
        if (hint) {
          hint.textContent = readOnlyBuiltInProfile
            ? '기본 분석 프로파일입니다. 채널 분석 설정에서 선택할 수 있지만 수정/삭제하지 않습니다.'
            : (detailMode === 'view'
              ? '저장된 내용입니다.'
              : (detailMode === 'edit' ? '값을 바꾼 뒤 저장합니다.' : '값을 입력한 뒤 저장합니다.'));
        }
        if (edit) edit.hidden = detailMode !== 'view' || readOnlyBuiltInProfile;
        if (save) {
          save.hidden = detailMode === 'view';
          save.textContent = '저장';
        }
      }
      function opsVaRuleStartMeta(item) {
        const inferred = opsRulesInferTemplateForVaRule(item);
        return {
          templateRuleId: inferred.templateId,
          inferred: inferred.inferred && !String(item?.templateStart?.ruleId || '').trim(),
          template: inferred.template
        };
      }
      const opsScenarioTypes = new Set([
        'intrusion-dwell',
        're-entry',
        'wrong-direction',
        'intrusion-after-line-crossing',
        'loitering',
        'zone-occupancy'
      ]);
      const opsBasicEventTypes = ['presence', 'enter', 'exit', 'line-crossing'];
      const opsScenarioEventTypes = [
        'intrusion-dwell',
        're-entry',
        'wrong-direction',
        'intrusion-after-line-crossing',
        'loitering',
        'zone-occupancy'
      ];
      const opsLineEventTypes = new Set(['line-crossing', 'wrong-direction']);
      const opsRulesEventTypes = [
        'presence',
        'enter',
        'exit',
        'line-crossing',
        'intrusion-dwell',
        're-entry',
        'wrong-direction',
        'intrusion-after-line-crossing',
        'loitering',
        'zone-occupancy'
      ];
      const opsScenarioPresetBaselines = {
        default: {
          all: { minConfidence: 0.25, minDurationMs: 0, cooldownMs: 5000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 2000, dwellTimeMs: 10000 },
          're-entry': { reEntryWindowMs: 10000 },
          'wrong-direction': { cooldownMs: 5000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 10000, dwellTimeMs: 3000 },
          loitering: { minDwellTimeMs: 30000, maxMovementRadius: 0.08, minTrajectoryPoints: 4, cooldownMs: 12000 },
          'zone-occupancy': { occupancyThreshold: 4, minDwellTimeMs: 7000, cooldownMs: 12000 }
        },
        road: {
          all: { minConfidence: 0.35, cooldownMs: 10000 },
          'line-crossing': { minDurationMs: 0 },
          'wrong-direction': { cooldownMs: 8000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 6000, dwellTimeMs: 1500 },
          loitering: { minDwellTimeMs: 60000, maxMovementRadius: 0.12, minTrajectoryPoints: 5, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 8, minDwellTimeMs: 5000, cooldownMs: 10000 }
        },
        retail: {
          all: { minConfidence: 0.3, cooldownMs: 10000 },
          'line-crossing': { minDurationMs: 0 },
          loitering: { minDwellTimeMs: 20000, maxMovementRadius: 0.06, minTrajectoryPoints: 4, cooldownMs: 10000 },
          'zone-occupancy': { occupancyThreshold: 4, minDwellTimeMs: 7000, cooldownMs: 12000 }
        },
        park: {
          all: { minConfidence: 0.3, cooldownMs: 15000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 3000, dwellTimeMs: 15000 },
          loitering: { minDwellTimeMs: 60000, maxMovementRadius: 0.12, minTrajectoryPoints: 5, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 6, minDwellTimeMs: 10000, cooldownMs: 15000 }
        },
        indoor: {
          all: { minConfidence: 0.3, cooldownMs: 8000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 1500, dwellTimeMs: 5000 },
          loitering: { minDwellTimeMs: 20000, maxMovementRadius: 0.06, minTrajectoryPoints: 4, cooldownMs: 10000 },
          'zone-occupancy': { occupancyThreshold: 4, minDwellTimeMs: 7000, cooldownMs: 12000 }
        },
        lobby: {
          all: { minConfidence: 0.32, cooldownMs: 12000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 1000, dwellTimeMs: 4000 },
          're-entry': { reEntryWindowMs: 12000 },
          loitering: { minDwellTimeMs: 30000, maxMovementRadius: 0.08, minTrajectoryPoints: 4, cooldownMs: 12000 },
          'zone-occupancy': { occupancyThreshold: 6, minDwellTimeMs: 10000, cooldownMs: 15000 }
        },
        platform: {
          all: { minConfidence: 0.35, cooldownMs: 10000 },
          'line-crossing': { minDurationMs: 0 },
          'wrong-direction': { cooldownMs: 6000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 5000, dwellTimeMs: 1000 },
          loitering: { minDwellTimeMs: 45000, maxMovementRadius: 0.1, minTrajectoryPoints: 5, cooldownMs: 15000 },
          'zone-occupancy': { occupancyThreshold: 8, minDwellTimeMs: 5000, cooldownMs: 10000 }
        },
        entrance: {
          all: { minConfidence: 0.32, cooldownMs: 6000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 1000, dwellTimeMs: 3000 },
          're-entry': { reEntryWindowMs: 10000 },
          loitering: { minDwellTimeMs: 15000, maxMovementRadius: 0.05, minTrajectoryPoints: 3, cooldownMs: 8000 },
          'zone-occupancy': { occupancyThreshold: 3, minDwellTimeMs: 3000, cooldownMs: 8000 }
        },
        doorway: {
          all: { minConfidence: 0.32, cooldownMs: 8000 },
          'line-crossing': { minDurationMs: 0 },
          loitering: { minDwellTimeMs: 15000, maxMovementRadius: 0.05, minTrajectoryPoints: 3, cooldownMs: 8000 },
          'zone-occupancy': { occupancyThreshold: 3, minDwellTimeMs: 3000, cooldownMs: 8000 }
        },
        parking: {
          all: { minConfidence: 0.35, cooldownMs: 20000 },
          'line-crossing': { minDurationMs: 0 },
          loitering: { minDwellTimeMs: 60000, maxMovementRadius: 0.12, minTrajectoryPoints: 5, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 5, minDwellTimeMs: 10000, cooldownMs: 15000 }
        },
        elevator: {
          all: { minConfidence: 0.32, cooldownMs: 12000 },
          'line-crossing': { minDurationMs: 0 },
          loitering: { minDwellTimeMs: 30000, maxMovementRadius: 0.08, minTrajectoryPoints: 4, cooldownMs: 12000 },
          'zone-occupancy': { occupancyThreshold: 5, minDwellTimeMs: 8000, cooldownMs: 12000 }
        }
      };
      const opsScenarioPresetLabels = {
        default: '기본',
        road: '도로',
        retail: '매장 통로',
        park: '공원',
        indoor: '실내',
        lobby: '로비',
        platform: '승강장',
        entrance: '출입구',
        doorway: '문 앞 정체',
        parking: '주차장 가장자리',
        elevator: '승강기 홀',
        custom: '직접 설정'
      };
      function opsEventRuleModeForType(type) {
        return opsRulesIsScenarioType(type) ? 'scenario' : 'event';
      }
      function opsRulesScenarioBaseline(type, presetId = 'default') {
        const normalizedType = String(type || '').trim();
        const normalizedPreset = String(presetId || 'default').trim();
        const defaults = opsScenarioPresetBaselines.default || {};
        const preset = opsScenarioPresetBaselines[normalizedPreset] || {};
        return {
          ...(defaults.all || {}),
          ...(defaults[normalizedType] || {}),
          ...(preset.all || {}),
          ...(preset[normalizedType] || {})
        };
      }
      function opsRulesPresetNumber(value, digits = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '';
        return digits > 0 ? number.toFixed(digits) : String(Math.round(number));
      }
      function opsRulesPresetMs(value) {
        const text = opsRulesPresetNumber(value);
        return text ? `${text}ms` : '';
      }
      function opsRulesPresetBaselineSummary(type, baseline = {}) {
        const normalizedType = String(type || '').trim();
        const parts = [];
        const confidence = opsRulesPresetNumber(baseline.minConfidence, 2);
        if (confidence) parts.push(`신뢰도 ${confidence}`);
        if (normalizedType === 'line-crossing') {
          parts.push('line 2점');
          parts.push('방향 직접 선택');
          return parts.join(' · ');
        }
        if (normalizedType === 'loitering') {
          const dwell = opsRulesPresetMs(baseline.minDwellTimeMs);
          const radius = opsRulesPresetNumber(baseline.maxMovementRadius, 2);
          const points = opsRulesPresetNumber(baseline.minTrajectoryPoints);
          if (dwell) parts.push(`체류 ${dwell}`);
          if (radius) parts.push(`반경 ${radius}`);
          if (points) parts.push(`경로점 ${points}`);
          if (baseline.useGroundPlaneMovementRadius) parts.push('ground-plane');
        } else if (normalizedType === 'zone-occupancy') {
          const threshold = opsRulesPresetNumber(baseline.occupancyThreshold);
          const dwell = opsRulesPresetMs(baseline.minDwellTimeMs);
          if (threshold) parts.push(`점유 ${threshold}`);
          if (dwell) parts.push(`체류 ${dwell}`);
        } else if (normalizedType === 'intrusion-after-line-crossing') {
          const delay = opsRulesPresetMs(baseline.maxDelayAfterCrossingMs);
          const dwell = opsRulesPresetMs(baseline.dwellTimeMs);
          if (delay) parts.push(`라인 후 ${delay}`);
          if (dwell) parts.push(`체류 ${dwell}`);
        } else if (normalizedType === 'intrusion-dwell') {
          const candidate = opsRulesPresetMs(baseline.candidateTimeMs);
          const dwell = opsRulesPresetMs(baseline.dwellTimeMs);
          if (candidate) parts.push(`후보 ${candidate}`);
          if (dwell) parts.push(`확정 ${dwell}`);
        } else if (normalizedType === 're-entry') {
          const windowLabel = opsRulesPresetMs(baseline.reEntryWindowMs);
          if (windowLabel) parts.push(`재진입 ${windowLabel}`);
        }
        const cooldown = opsRulesPresetMs(baseline.cooldownMs);
        if (cooldown) parts.push(`재알림 ${cooldown}`);
        return parts.join(' · ');
      }
      function opsRulesPresetWarningText(type) {
        const normalizedType = String(type || '').trim();
        if (normalizedType === 'line-crossing') {
          return '라인 통과 preset은 최소 신뢰도 시작값만 채웁니다. 방향과 2점 line geometry를 현장 영상에서 확인하세요.';
        }
        if (normalizedType === 'loitering') {
          return '배회 preset은 field sample replay 기준 시작값입니다. TrackHealth가 불안정하면 dwell부터 늘리세요.';
        }
        if (normalizedType === 'zone-occupancy') {
          return '점유 preset은 polygon이 병목 구간만 포함한다는 전제입니다. 정상 피크에서 confirmed가 반복되면 threshold를 올리세요.';
        }
        return 'Preset은 시작값입니다. 저장 전 현장 영상, geometry, 대상 객체를 확인하세요.';
      }
      function opsEventRulePresetVisible(mode, type) {
        return String(mode || '').trim() === 'scenario' || String(type || '').trim() === 'line-crossing';
      }
      function opsEventRuleUpdatePresetSummary(type = '', presetId = '', baseline = null) {
        const summary = document.getElementById('opsEventRulePresetSummary');
        if (!summary) return;
        const mode = String(document.getElementById('opsEventRuleModeSelect')?.value || 'scenario');
        const currentType = String(type || document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const visible = opsEventRulePresetVisible(mode, currentType);
        summary.hidden = !visible;
        if (!visible) return;
        const currentPreset = String(presetId || document.getElementById('opsEventRulePresetSelect')?.value || 'default');
        if (currentPreset === 'custom') {
          summary.textContent = '직접 설정은 preset 숫자를 덮어쓰지 않습니다. 저장 전 replay/현장 영상 기준으로 값만 남깁니다.';
          return;
        }
        const currentBaseline = baseline || opsRulesScenarioBaseline(currentType, currentPreset);
        const label = opsScenarioPresetLabels[currentPreset] || currentPreset || '기본';
        const baselineText = opsRulesPresetBaselineSummary(currentType, currentBaseline);
        const warningText = opsRulesPresetWarningText(currentType);
        summary.textContent = `${label} preset · ${baselineText || '기본 시작값'} · ${warningText}`;
      }
      function opsRulesClone(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
      }
      function opsRulesSplitList(value) {
        return String(value ?? '')
          .split(/[\n,]/)
          .map(item => item.trim())
          .filter(Boolean);
      }
      function opsScenarioBuilderState() {
        const typeSelect = document.getElementById('opsScenarioBuilderType');
        const presetSelect = document.getElementById('opsScenarioBuilderPreset');
        const classesInput = document.getElementById('opsScenarioBuilderClasses');
        const type = opsScenarioEventTypes.includes(String(typeSelect?.value || '').trim())
          ? String(typeSelect.value || '').trim()
          : 'intrusion-dwell';
        const presetId = Object.prototype.hasOwnProperty.call(opsScenarioPresetBaselines, String(presetSelect?.value || 'default').trim())
          || String(presetSelect?.value || '').trim() === 'custom'
          ? String(presetSelect?.value || 'default').trim()
          : 'default';
        const parsedClasses = opsRulesNormalizeCategories(opsRulesSplitList(classesInput?.value || 'person, vehicle'));
        const classes = parsedClasses.length > 0 ? parsedClasses : ['person', 'vehicle'];
        return { type, presetId, classes, baseline: opsRulesScenarioBaseline(type, presetId) };
      }
      function opsScenarioBuilderDraft() {
        const { type, presetId, classes, baseline } = opsScenarioBuilderState();
        const lineMode = opsRulesIsLineEventType(type);
        const event = {
          type,
          region: {
            type: lineMode ? 'line' : 'polygon',
            direction: lineMode ? 'any' : undefined,
            points: lineMode ? opsRulesDefaultLinePoints() : opsRulesDefaultPolygonPoints()
          },
          minConfidence: Number(baseline.minConfidence ?? 0.25),
          minDurationMs: Number(baseline.minDurationMs ?? 0)
        };
        if (!lineMode) delete event.region.direction;
        const scenario = {
          type,
          presetId,
          enabled: true,
          cooldownMs: Number(baseline.cooldownMs ?? 5000)
        };
        if (type === 'intrusion-dwell') {
          scenario.candidateTimeMs = Number(baseline.candidateTimeMs ?? 2000);
          scenario.dwellTimeMs = Number(baseline.dwellTimeMs ?? 10000);
          scenario.targetClasses = classes;
          scenario.restrictedZoneIds = [];
        } else if (type === 're-entry') {
          scenario.reEntryWindowMs = Number(baseline.reEntryWindowMs ?? 10000);
          scenario.targetClasses = classes;
          scenario.reEntryMode = 'same-zone';
          scenario.reEntryZoneIds = [];
          scenario.restrictedZoneIds = [];
        } else if (type === 'wrong-direction') {
          scenario.targetClasses = classes;
        } else if (type === 'intrusion-after-line-crossing') {
          scenario.maxDelayAfterCrossingMs = Number(baseline.maxDelayAfterCrossingMs ?? 10000);
          scenario.dwellTimeMs = Number(baseline.dwellTimeMs ?? 3000);
          scenario.targetZoneIds = [];
          scenario.triggerLine = { id: 'line-1', direction: 'any', points: opsRulesDefaultLinePoints() };
        } else if (type === 'loitering') {
          scenario.minDwellTimeMs = Number(baseline.minDwellTimeMs ?? 30000);
          scenario.maxMovementRadius = Number(baseline.maxMovementRadius ?? 0.08);
          scenario.minTrajectoryPoints = Number(baseline.minTrajectoryPoints ?? 4);
          scenario.useGroundPlaneMovementRadius = Boolean(baseline.useGroundPlaneMovementRadius ?? false);
          scenario.targetClasses = classes;
          scenario.restrictedZoneIds = [];
        } else if (type === 'zone-occupancy') {
          scenario.occupancyThreshold = Number(baseline.occupancyThreshold ?? 4);
          scenario.minDwellTimeMs = Number(baseline.minDwellTimeMs ?? 7000);
          scenario.targetClasses = classes;
          scenario.restrictedZoneIds = [];
        }
        return {
          ruleKind: 'scenario',
          analysis: { classes },
          event,
          scenario
        };
      }
      function renderOpsScenarioBuilder() {
        const root = document.querySelector('[data-testid="ops-scenario-builder"]');
        if (!root) return;
        const state = opsScenarioBuilderState();
        const typeSelect = document.getElementById('opsScenarioBuilderType');
        const presetSelect = document.getElementById('opsScenarioBuilderPreset');
        const classesInput = document.getElementById('opsScenarioBuilderClasses');
        if (typeSelect) typeSelect.value = state.type;
        if (presetSelect) presetSelect.value = state.presetId;
        if (classesInput && !String(classesInput.value || '').trim()) classesInput.value = state.classes.join(', ');
        const label = opsScenarioPresetLabels[state.presetId] || state.presetId || '기본';
        const baselineText = opsRulesPresetBaselineSummary(state.type, state.baseline) || '기본 시작값';
        const warningText = opsRulesPresetWarningText(state.type);
        setText('opsScenarioBuilderBaseline', `${opsRuleEventTypeLabel(state.type)} · ${label} preset · ${baselineText} · 대상 ${opsRulesCategorySummaryText(state.classes)} · ${warningText}`);
        const draft = document.getElementById('opsScenarioBuilderDraft');
        if (draft) draft.textContent = JSON.stringify(opsScenarioBuilderDraft(), null, 2);
      }
      async function applyOpsScenarioBuilderToEventRule() {
        const state = opsScenarioBuilderState();
        await openOpsRulesEditor('event-rule', 'new');
        const modeSelect = document.getElementById('opsEventRuleModeSelect');
        if (modeSelect) modeSelect.value = 'scenario';
        opsEventRuleRefreshTypeOptions(state.type);
        const typeSelect = document.getElementById('opsEventRuleTypeSelect');
        if (typeSelect) typeSelect.value = state.type;
        const presetSelect = document.getElementById('opsEventRulePresetSelect');
        if (presetSelect) presetSelect.value = state.presetId;
        opsEventRuleUpdateModeUi();
        opsEventRuleApplyPresetToInputs(state.presetId);
        opsRulesSetSelectedCategories('opsEventRuleClassChecks', state.classes, 'opsEventRuleClassesSummary', '객체를 선택하세요.');
        opsRulesEditorStatus('시나리오 빌더 초안을 이벤트 템플릿 폼에 적용했습니다. 저장 전 채널 영상 기준으로 geometry와 숫자 조건을 확인하세요.', false);
        document.getElementById('opsRulesDetailPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function opsRulesIsScenarioType(type) {
        return opsScenarioTypes.has(String(type || '').trim());
      }
      function opsRulesIsLineEventType(type) {
        return opsLineEventTypes.has(String(type || '').trim());
      }
      function opsRulesEventTypeForItem(item = {}) {
        return String(item?.scenario?.type || item?.event?.type || item?.eventType || '').trim();
      }
      function opsRulesStringArray(value = []) {
        return Array.isArray(value)
          ? value.map(item => String(item || '').trim()).filter(Boolean)
          : [];
      }
      function opsRulesSetEqual(left = [], right = []) {
        const leftItems = opsRulesStringArray(left);
        const rightItems = opsRulesStringArray(right);
        if (leftItems.length !== rightItems.length) return false;
        const rightSet = new Set(rightItems);
        return leftItems.every(item => rightSet.has(item));
      }
      function opsRulesSetIncludesAll(left = [], right = []) {
        const leftSet = new Set(opsRulesStringArray(left));
        return opsRulesStringArray(right).every(item => leftSet.has(item));
      }
      function opsRulesTemplateClasses(item = {}) {
        return opsRulesStringArray(item?.analysis?.classes || item?.scenario?.targetClasses || []);
      }
      function opsRulesProfileClasses(item = {}) {
        return opsRulesStringArray(item?.trackingClasses || item?.analysis?.classes || item?.classes || item?.targetClasses || []);
      }
      function opsRulesAllowedOverlayModes(view = {}) {
        const modes = opsRulesStringArray(view?.allowedOverlayModes || []);
        return modes.length > 0 ? modes : ['raw', 'va-overlay'];
      }
      function opsRulesViewAllowsVaRuleMode(view = {}) {
        return opsRulesAllowedOverlayModes(view).includes('va-rule');
      }
      function opsRulesViewAllowsRuleId(view = {}, ruleId = '') {
        const id = String(ruleId || '').trim();
        if (!id) return false;
        const allowed = new Set([
          String(view?.defaultRuleId || '').trim(),
          ...opsRulesStringArray(view?.allowedRuleIds || [])
        ].filter(Boolean));
        return allowed.has(id);
      }
      function opsRulesViewHasClientAccess(view = {}) {
        return view?.enabled !== false
          && (view?.showDashboard !== false || view?.showEvents !== false || view?.showMetadataSummary !== false);
      }
      function opsRulesDocumentInactive(item = {}) {
        return item?.enabled === false || String(item?.status || '').toLowerCase() === 'inactive';
      }
      function opsRulesRulePriority(rule = {}) {
        const value = Number(rule?.priority ?? rule?.match?.priority ?? 0);
        return Number.isFinite(value) ? value : 0;
      }
      function opsRulesClassConflictMessages(rule = {}, template = null, profile = null) {
        const messages = [];
        const ruleClasses = opsRulesTemplateClasses(rule);
        const templateClasses = opsRulesTemplateClasses(template || {});
        const profileClasses = opsRulesProfileClasses(profile || {});
        if (template && templateClasses.length > 0 && !opsRulesSetIncludesAll(ruleClasses, templateClasses)) {
          messages.push(`룰 대상(${opsRulesCategorySummaryText(ruleClasses, '없음')})이 템플릿 대상(${opsRulesCategorySummaryText(templateClasses, '없음')})을 모두 포함하지 않습니다.`);
        }
        if (profileClasses.length > 0 && templateClasses.length > 0 && !opsRulesSetIncludesAll(profileClasses, templateClasses)) {
          messages.push(`프로파일 대상(${opsRulesCategorySummaryText(profileClasses, '없음')})이 템플릿 대상(${opsRulesCategorySummaryText(templateClasses, '없음')})과 맞지 않습니다.`);
        }
        return messages;
      }
      function opsRulesInferTemplateForVaRule(item = {}) {
        const explicitId = String(item?.templateStart?.ruleId || '').trim();
        if (explicitId) {
          return { templateId: explicitId, inferred: false, template: findOpsEventTemplateById(explicitId) || null };
        }
        const type = opsRulesEventTypeForItem(item);
        if (!type) return { templateId: '', inferred: false, template: null };
        const candidates = opsCatalogEventTemplates.filter(template => opsRulesEventTypeForItem(template) === type);
        if (candidates.length === 0) return { templateId: '', inferred: false, template: null };
        const itemClasses = opsRulesTemplateClasses(item);
        const exact = candidates.find(template => opsRulesSetEqual(opsRulesTemplateClasses(template), itemClasses));
        const template = exact || (candidates.length === 1 ? candidates[0] : null);
        const templateId = String(template?.id || '').trim();
        return { templateId, inferred: Boolean(templateId), template };
      }
      function opsRulesDefaultPolygonPoints() {
        return [
          { x: 0.2, y: 0.22 },
          { x: 0.8, y: 0.22 },
          { x: 0.8, y: 0.78 },
          { x: 0.2, y: 0.78 }
        ];
      }
      function opsRulesDefaultLinePoints() {
        return [
          { x: 0.25, y: 0.5 },
          { x: 0.75, y: 0.5 }
        ];
      }
      function opsRulesNextNumericId(items = [], start = 1) {
        const normalizedStart = Math.max(1, Number(start) || 1);
        const used = new Set();
        for (const item of items) {
          const value = String(item?.id || item?.profileId || '').trim();
          if (/^[0-9]+$/.test(value)) {
            const numeric = Number(value);
            if (numeric >= 1 && numeric <= OPS_RULES_MAX_NUMERIC_ID) {
              used.add(numeric);
            }
          }
        }
        for (let candidate = normalizedStart; candidate <= OPS_RULES_MAX_NUMERIC_ID; candidate += 1) {
          if (!used.has(candidate)) return String(candidate);
        }
        for (let candidate = 1; candidate < normalizedStart; candidate += 1) {
          if (!used.has(candidate)) return String(candidate);
        }
        throw new Error(`ID 사용량이 한도(${OPS_RULES_MAX_NUMERIC_ID})에 도달했습니다.`);
      }
      function opsRulesNextProfileId() {
        return opsRulesNextNumericId([...opsCatalogBuiltInProfiles, ...opsCatalogProfiles], 1);
      }
      function opsRulesPreferredProfileId() {
        return String(
          opsCatalogProfiles[0]?.id
          || opsCatalogBuiltInProfiles[0]?.id
          || '1'
        );
      }
      function opsRulesSourcePayload(source = {}) {
        const kind = String(source.kind || 'file').trim() || 'file';
        if (kind === 'file') return { kind: 'file', file: source.file || 'sample_h264.mp4' };
        if (kind === 'rtsp') return { kind: 'rtsp', url: source.rtspUrl || source.url || '' };
        if (kind === 'whep') return { kind: 'whep', url: source.whepUrl || source.url || '' };
        if (kind === 'http' || kind === 'hls') return { kind: 'http', url: source.httpUrl || source.url || '' };
        if (kind === 'webrtc') return { kind: 'webrtc', url: source.webrtcSourceId || source.sourceId || source.url || '' };
        return { kind, url: source.url || '' };
      }
      function opsRulesHasSourceTag(source, tag) {
        return Array.isArray(source?.tags) &&
          source.tags.map(item => String(item || '').toLowerCase()).includes(String(tag || '').toLowerCase());
      }
      function opsRulesDisplayKindForSource(source) {
        return opsRulesHasSourceTag(source, 'onvif') ? 'ONVIF' : opsRulesSourceKindLabel(source?.kind);
      }
      function opsRulesSourceMatches(left = {}, right = {}) {
        const leftPayload = opsRulesSourcePayload(left);
        const rightPayload = opsRulesSourcePayload(right);
        return leftPayload.kind === rightPayload.kind
          && String(leftPayload.file || leftPayload.url || '') === String(rightPayload.file || rightPayload.url || '');
      }
      function opsRulesBuildChannels() {
        const viewsBySource = new Map();
        for (const view of opsRulesViews) {
          const sourceId = String(view?.sourceId || '').trim();
          if (!sourceId) continue;
          if (!viewsBySource.has(sourceId)) viewsBySource.set(sourceId, []);
          viewsBySource.get(sourceId).push(view);
        }
        opsRulesChannels = opsRulesSources.map((source) => {
          const sourceId = String(source?.sourceId || '').trim();
          const views = viewsBySource.get(sourceId) || [];
          const primaryView = views.find(view => String(view?.viewId || '') === sourceId) || views[0] || null;
          return {
            id: sourceId,
            sourceId,
            displayName: source?.displayName || primaryView?.displayName || `채널 ${sourceId}`,
            source,
            view: primaryView,
            views
          };
        });
      }
      function opsRulesChannelOptionLabel(channel) {
        const kind = channel?.source ? opsRulesDisplayKindForSource(channel.source) : '입력';
        return `${display(channel.displayName)} · ${kind}`;
      }
      function opsRulesSourceDetailLabel(source) {
        if (!source || typeof source !== 'object') return '';
        if (source.kind === 'file') return display(source.file || '');
        if (source.kind === 'rtsp') return display(source.url || source.rtspUrl || '');
        if (source.kind === 'whep') return display(source.whepUrl || source.url || '');
        if (source.kind === 'webrtc') return display(source.webrtcSourceId || source.sourceId || '');
        if (source.kind === 'http' || source.kind === 'hls') return display(source.httpUrl || source.url || '');
        return display(source.url || source.file || '');
      }
      function opsRulesFindChannelById(channelId) {
        return opsRulesChannels.find((channel) => String(channel?.id || '') === String(channelId || '')) || null;
      }
      function opsRulesFindChannelForVaRule(item = {}) {
        const source = item?.source || {};
        const sourceMatched = opsRulesChannels.find(channel => opsRulesSourceMatches(channel?.source, source));
        if (sourceMatched) return sourceMatched;
        const itemId = String(item?.id || '').trim();
        if (itemId) {
          const ruleBoundChannels = [];
          for (const channel of opsRulesChannels) {
            const view = channel?.view;
            const allowed = Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds.map(String) : [];
            if (String(view?.defaultRuleId || '') === itemId || allowed.includes(itemId)) {
              ruleBoundChannels.push(channel);
            }
          }
          return ruleBoundChannels.find(channel => channel?.source?.enabled !== false && channel?.view?.enabled !== false)
            || ruleBoundChannels[0]
            || null;
        }
        return null;
      }
      function opsRulesRuleBasePayload(type, existingEvent = {}, classes = ['person']) {
        const lineMode = opsRulesIsLineEventType(type);
        const region = opsRulesClone(existingEvent.region || {});
        if (region.type !== (lineMode ? 'line' : 'polygon')) {
          region.type = lineMode ? 'line' : 'polygon';
        }
        if (!Array.isArray(region.points) || region.points.length < (lineMode ? 2 : 3)) {
          region.points = lineMode ? opsRulesDefaultLinePoints() : opsRulesDefaultPolygonPoints();
        }
        if (lineMode && !region.direction) region.direction = 'any';
        const event = {
          ...existingEvent,
          type,
          region,
          minConfidence: Number(existingEvent.minConfidence ?? opsRulesScenarioBaseline(type).minConfidence ?? 0.25),
          minDurationMs: Number(existingEvent.minDurationMs ?? opsRulesScenarioBaseline(type).minDurationMs ?? 0)
        };
        const scenario = existingEvent.scenario || {};
        const baseline = opsRulesScenarioBaseline(type, scenario.presetId || 'default');
        if (type === 'intrusion-dwell') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              candidateTimeMs: Number(scenario.candidateTimeMs ?? baseline.candidateTimeMs ?? 2000),
              dwellTimeMs: Number(scenario.dwellTimeMs ?? baseline.dwellTimeMs ?? 10000),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 5000),
              targetClasses: Array.isArray(scenario.targetClasses) && scenario.targetClasses.length > 0 ? scenario.targetClasses : classes,
              restrictedZoneIds: Array.isArray(scenario.restrictedZoneIds) ? scenario.restrictedZoneIds : []
            }
          };
        }
        if (type === 're-entry') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              reEntryWindowMs: Number(scenario.reEntryWindowMs ?? baseline.reEntryWindowMs ?? 10000),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 5000),
              targetClasses: Array.isArray(scenario.targetClasses) && scenario.targetClasses.length > 0 ? scenario.targetClasses : classes,
              reEntryMode: scenario.reEntryMode || 'same-zone',
              reEntryZoneIds: Array.isArray(scenario.reEntryZoneIds) ? scenario.reEntryZoneIds : [],
              restrictedZoneIds: Array.isArray(scenario.restrictedZoneIds) ? scenario.restrictedZoneIds : []
            }
          };
        }
        if (type === 'wrong-direction') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 5000),
              targetClasses: Array.isArray(scenario.targetClasses) && scenario.targetClasses.length > 0 ? scenario.targetClasses : classes
            }
          };
        }
        if (type === 'intrusion-after-line-crossing') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              maxDelayAfterCrossingMs: Number(scenario.maxDelayAfterCrossingMs ?? baseline.maxDelayAfterCrossingMs ?? 10000),
              dwellTimeMs: Number(scenario.dwellTimeMs ?? baseline.dwellTimeMs ?? 3000),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 5000),
              targetZoneIds: Array.isArray(scenario.targetZoneIds) ? scenario.targetZoneIds : [],
              triggerLine: {
                id: scenario.triggerLine?.id || 'line-1',
                direction: scenario.triggerLine?.direction || 'any',
                points: Array.isArray(scenario.triggerLine?.points) && scenario.triggerLine.points.length >= 2
                  ? scenario.triggerLine.points
                  : opsRulesDefaultLinePoints()
              }
            }
          };
        }
        if (type === 'loitering') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              minDwellTimeMs: Number(scenario.minDwellTimeMs ?? scenario.dwellTimeMs ?? baseline.minDwellTimeMs ?? 30000),
              maxMovementRadius: Number(scenario.maxMovementRadius ?? baseline.maxMovementRadius ?? 0.08),
              minTrajectoryPoints: Number(scenario.minTrajectoryPoints ?? baseline.minTrajectoryPoints ?? 4),
              useGroundPlaneMovementRadius: Boolean(scenario.useGroundPlaneMovementRadius ?? baseline.useGroundPlaneMovementRadius ?? false),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 12000),
              targetClasses: Array.isArray(scenario.targetClasses) && scenario.targetClasses.length > 0 ? scenario.targetClasses : classes,
              restrictedZoneIds: Array.isArray(scenario.restrictedZoneIds) ? scenario.restrictedZoneIds : []
            }
          };
        }
        if (type === 'zone-occupancy') {
          return {
            ruleKind: 'scenario',
            event,
            scenario: {
              ...scenario,
              type,
              presetId: scenario.presetId || 'default',
              enabled: scenario.enabled !== false,
              occupancyThreshold: Number(scenario.occupancyThreshold ?? baseline.occupancyThreshold ?? 4),
              minDwellTimeMs: Number(scenario.minDwellTimeMs ?? baseline.minDwellTimeMs ?? 7000),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 12000),
              targetClasses: Array.isArray(scenario.targetClasses) && scenario.targetClasses.length > 0 ? scenario.targetClasses : classes,
              restrictedZoneIds: Array.isArray(scenario.restrictedZoneIds) ? scenario.restrictedZoneIds : []
            }
          };
        }
        return { ruleKind: 'basic', event, scenario: null };
      }
      function opsRulesDefaultOutputs(existing = {}) {
        return {
          overlay: existing.overlay !== false,
          metadata: existing.metadata !== false,
          events: existing.events !== false
        };
      }
      function opsRulesDefaultEventActions(existing = {}) {
        return {
          highlight: {
            enabled: existing?.highlight?.enabled !== false,
            mode: existing?.highlight?.mode || 'blink',
            target: existing?.highlight?.target || 'matched-object',
            durationMs: Number(existing?.highlight?.durationMs ?? 1200),
            color: existing?.highlight?.color || '#ff0000'
          },
          post: {
            enabled: existing?.post?.enabled === true,
            method: existing?.post?.method || 'POST',
            url: existing?.post?.url || '',
            contentType: existing?.post?.contentType || 'application/json',
            payloadFormat: existing?.post?.payloadFormat || 'media-server.va.event.v1'
          }
        };
      }
      function opsRulesNormalizeTrackerPolicy(value = '') {
        const token = String(value || '').trim().toLowerCase();
        if (token === 'none' || token === 'off' || token === 'disabled') return 'none';
        if (token === 'kalman-lite' || token === 'kalman' || token === 'kalmanlite') return 'kalman-lite';
        if (token === 'bytetrack' || token === 'byte-track' || token === 'byte track') return 'bytetrack';
        return 'lite';
      }
      function opsRulesNormalizeReidPolicy(value = '') {
        const token = String(value || '').trim().toLowerCase();
        if (token === 'assist' || token === 'association-assist' || token === 'reid-assist') return 'assist';
        return 'off';
      }
      function opsRulesTrackingPolicyHasExplicitTracker(policy = {}) {
        return Object.prototype.hasOwnProperty.call(policy, 'tracker') ||
          Object.prototype.hasOwnProperty.call(policy, 'trackerPolicy');
      }
      function opsRulesTrackingPolicyFromItem(item = {}) {
        const policy = item?.analysis?.trackingPolicy || item?.trackingPolicy || {};
        const hasTracker = opsRulesTrackingPolicyHasExplicitTracker(policy);
        const tracker = hasTracker ? opsRulesNormalizeTrackerPolicy(policy.tracker || policy.trackerPolicy || '') : 'lite';
        const reid = !hasTracker || tracker === 'none'
          ? 'off'
          : opsRulesNormalizeReidPolicy(policy.reid || policy.reId || policy.reID || policy.reidPolicy || '');
        return { tracker, reid };
      }
      function opsRulesTrackerPolicyLabel(value = '') {
        const tracker = opsRulesNormalizeTrackerPolicy(value);
        if (tracker === 'none') return 'Tracking off';
        if (tracker === 'kalman-lite') return 'Kalman-lite';
        if (tracker === 'bytetrack') return 'ByteTrack';
        return 'Lite tracker';
      }
      function opsRulesReidPolicyLabel(value = '') {
        return opsRulesNormalizeReidPolicy(value) === 'assist' ? 'Re-ID assist' : 'Re-ID off';
      }
      function opsRulesTrackingPolicySummary(policy = {}) {
        const normalized = opsRulesTrackingPolicyFromItem({ analysis: { trackingPolicy: policy } });
        return `${opsRulesTrackerPolicyLabel(normalized.tracker)} · ${opsRulesReidPolicyLabel(normalized.reid)}`;
      }
      function opsRulesSelectHasValue(select, value) {
        return Array.from(select?.options || []).some(option => String(option.value || '') === String(value || ''));
      }
      function opsRulesSetTrackingPolicyControls(policy = {}) {
        const trackerSelect = document.getElementById('opsVaRuleTrackerSelect');
        const reidSelect = document.getElementById('opsVaRuleReidSelect');
        const normalized = opsRulesTrackingPolicyFromItem({ analysis: { trackingPolicy: policy } });
        if (trackerSelect) {
          trackerSelect.value = opsRulesSelectHasValue(trackerSelect, normalized.tracker) ? normalized.tracker : 'lite';
        }
        if (reidSelect) {
          reidSelect.value = opsRulesSelectHasValue(reidSelect, normalized.reid) ? normalized.reid : 'off';
        }
        opsRulesUpdateTrackingPolicyUi();
      }
      function opsRulesCurrentTrackingPolicy() {
        const tracker = opsRulesNormalizeTrackerPolicy(document.getElementById('opsVaRuleTrackerSelect')?.value || 'lite');
        const reid = tracker === 'none'
          ? 'off'
          : opsRulesNormalizeReidPolicy(document.getElementById('opsVaRuleReidSelect')?.value || 'off');
        return { tracker, reid };
      }
      function opsRulesUpdateTrackingPolicyUi() {
        const trackerSelect = document.getElementById('opsVaRuleTrackerSelect');
        const reidSelect = document.getElementById('opsVaRuleReidSelect');
        const summary = document.getElementById('opsVaRuleTrackingSummary');
        if (!trackerSelect || !reidSelect) return;
        const tracker = opsRulesNormalizeTrackerPolicy(trackerSelect.value || 'lite');
        trackerSelect.value = opsRulesSelectHasValue(trackerSelect, tracker) ? tracker : 'lite';
        if (tracker === 'none') {
          reidSelect.value = 'off';
        } else {
          const reid = opsRulesNormalizeReidPolicy(reidSelect.value || 'off');
          reidSelect.value = opsRulesSelectHasValue(reidSelect, reid) ? reid : 'off';
        }
        const readOnly = trackerSelect.disabled === true;
        reidSelect.disabled = readOnly || trackerSelect.value === 'none';
        if (summary) summary.textContent = opsRulesTrackingPolicySummary(opsRulesCurrentTrackingPolicy());
      }
      function opsRulesTrackingPolicyHtml(item = {}) {
        const policy = opsRulesTrackingPolicyFromItem(item);
        return `<div class="ops-rule-value-stack">
          <strong>${escapeHtml(opsRulesTrackerPolicyLabel(policy.tracker))}</strong>
          <span class="ops-rule-note">${escapeHtml(opsRulesReidPolicyLabel(policy.reid))}</span>
        </div>`;
      }
      function opsRulesEventTemplateSkeleton(id = opsRulesNextNumericId(opsCatalogEventTemplates, 1)) {
        const type = 'intrusion-dwell';
        const classes = ['person', 'vehicle'];
        const base = opsRulesRuleBasePayload(type, {}, classes);
        return {
          id,
          enabled: true,
          analysis: { classes },
          event: base.event,
          ruleKind: base.ruleKind,
          scenario: base.scenario
        };
      }
      function opsRulesVaRuleSkeleton(id = opsRulesNextNumericId(opsCatalogVaRules, 1)) {
        const channel = opsRulesChannels[0] || null;
        const template = opsCatalogEventTemplates[0] ? opsRulesClone(opsCatalogEventTemplates[0]) : null;
        const templateId = String(template?.id || '').trim();
        const base = template || opsRulesEventTemplateSkeleton(id);
        return {
          ...base,
          id,
          name: `채널 분석 설정 ${id}`,
          source: channel ? opsRulesSourcePayload(channel.source) : { kind: 'file', file: 'sample_h264.mp4' },
          analysis: {
            ...(base.analysis || {}),
            profileId: opsRulesPreferredProfileId(),
            trackingPolicy: opsRulesTrackingPolicyFromItem(base)
          },
          match: { sourceKind: '*', route: '*', vaRule: String(id) },
          binding: {
            urlMode: `vaRule=${id}`,
            sourceLocked: true,
            sourceOverrideAllowed: false
          },
          templateStart: templateId ? { ruleId: templateId } : undefined
        };
      }
      function opsRulesProfileSkeleton(id = opsRulesNextProfileId()) {
        return {
          id,
          detector: 'yolo',
          fps: 6,
          maxQueue: 1,
          confidence: 0.25,
          nms: 0.45,
          inputWidth: 640,
          inputHeight: 640,
          adaptive: true
        };
      }
      function refreshOpsVaTemplateAssistOptions() {
        const select = document.getElementById('opsVaRuleTemplateSeedSelect');
        if (!select) return;
        const current = String(select.value || opsVaRuleTemplateId || '').trim();
        setSelectOptions(
          select,
          [{ value: '', label: '템플릿 선택' }].concat(
            opsCatalogEventTemplates.map((item) => {
              const id = String(item?.id || '').trim();
              const type = item?.scenario?.type || item?.event?.type || item?.eventType || 'event';
              return { value: id, label: `${id} · ${opsRuleEventTypeLabel(type)}` };
            })
          ),
          current
        );
      }
      function opsRulesCategoryConfigs() {
        return [
          { prefix: 'opsEventRuleClasses', containerId: 'opsEventRuleClassChecks', summaryId: 'opsEventRuleClassesSummary', emptyText: '객체를 선택하세요.' },
          { prefix: 'opsProfileClasses', containerId: 'opsProfileClassChecks', summaryId: 'opsProfileClassesSummary', emptyText: '추적 대상을 선택하세요.' }
        ];
      }
      function opsRulesCategoryConfig(prefix) {
        return opsRulesCategoryConfigs().find(item => item.prefix === prefix) || null;
      }
      function opsRulesCategoryItems() {
        if (Array.isArray(opsRuleCategoryCatalog) && opsRuleCategoryCatalog.length > 0) {
          return opsRuleCategoryCatalog;
        }
        return [
          { value: 'person', label: '사람', displayLabels: ['사람'] },
          { value: 'vehicle', label: '차량', displayLabels: ['차량'] }
        ];
      }
      function opsRulesNormalizeCategories(values) {
        const items = opsRulesCategoryItems();
        const allValues = items.map(item => String(item.value || ''));
        const raw = Array.isArray(values) ? values.map(value => String(value || '').trim()).filter(Boolean) : [];
        if (raw.includes('*')) return allValues;
        const seen = new Set();
        const normalized = [];
        for (const value of raw) {
          if (seen.has(value)) continue;
          seen.add(value);
          normalized.push(value);
        }
        return normalized;
      }
      function opsRulesCategorySummaryText(values, emptyText = '선택 없음') {
        const selected = opsRulesNormalizeCategories(values);
        if (selected.length === 0) return emptyText;
        const items = opsRulesCategoryItems();
        return selected.map((value) => {
          const found = items.find(item => String(item.value || '') === value);
          if (!found) return value;
          return String(found.label || found.value || value);
        }).join(', ');
      }
      function opsRulesCompactCategoryText(values, maxItems = 2, emptyText = '미설정') {
        const selected = opsRulesNormalizeCategories(values);
        if (selected.length === 0) return emptyText;
        const labels = opsRulesCategorySummaryText(selected, emptyText).split(',').map(item => item.trim()).filter(Boolean);
        if (labels.length <= maxItems) return labels.join(', ');
        return `${labels.slice(0, maxItems).join(', ')} 외 ${labels.length - maxItems}개`;
      }
      function opsRulesSelectedCategories(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
          .map(input => String(input.value || '').trim())
          .filter(Boolean);
      }
      function opsRulesUpdateCategorySummary(containerId, summaryId, emptyText) {
        const summary = document.getElementById(summaryId);
        if (!summary) return;
        summary.textContent = opsRulesCategorySummaryText(opsRulesSelectedCategories(containerId), emptyText);
      }
      function opsRulesSetSelectedCategories(containerId, values, summaryId = '', emptyText = '선택 없음') {
        const container = document.getElementById(containerId);
        if (!container) return;
        const selected = new Set(opsRulesNormalizeCategories(values));
        for (const input of container.querySelectorAll('input[type="checkbox"]')) {
          input.checked = selected.has(String(input.value || ''));
        }
        if (summaryId) {
          opsRulesUpdateCategorySummary(containerId, summaryId, emptyText);
        }
      }
      function opsRulesApplyCategoryPreset(prefix, preset) {
        const config = opsRulesCategoryConfig(prefix);
        if (!config) return;
        const items = opsRulesCategoryItems();
        if (preset === 'default') {
          opsRulesSetSelectedCategories(config.containerId, opsRuleDefaultCategories, config.summaryId, config.emptyText);
          return;
        }
        if (preset === 'all') {
          opsRulesSetSelectedCategories(config.containerId, items.map(item => item.value), config.summaryId, config.emptyText);
          return;
        }
        opsRulesSetSelectedCategories(config.containerId, [], config.summaryId, config.emptyText);
      }
      function opsRulesWireCategoryButtons(prefix) {
        const config = opsRulesCategoryConfig(prefix);
        if (!config) return;
        const actions = [
          ['DefaultBtn', 'default'],
          ['AllBtn', 'all'],
          ['ClearBtn', 'clear']
        ];
        actions.forEach(([suffix, preset]) => {
          const button = document.getElementById(`${prefix}${suffix}`);
          if (!button) return;
          button.onclick = (event) => {
            event.preventDefault();
            opsRulesApplyCategoryPreset(prefix, preset);
          };
        });
      }
      function opsRulesRenderCategorySelector(prefix, values = opsRuleDefaultCategories) {
        const config = opsRulesCategoryConfig(prefix);
        if (!config) return;
        const container = document.getElementById(config.containerId);
        if (!container) return;
        const items = opsRulesCategoryItems();
        container.innerHTML = items.map((item) => {
          const labels = Array.isArray(item.displayLabels) && item.displayLabels.length > 0
            ? item.displayLabels.join(', ')
            : display(item.label || item.value);
          return `<label class="ops-category-check">
            <input type="checkbox" value="${escapeHtml(String(item.value || ''))}" />
            <span class="ops-category-copy">
              <span class="ops-category-title">${escapeHtml(display(item.label || item.value))}</span>
              <span class="ops-category-detail">${escapeHtml(labels)}</span>
            </span>
          </label>`;
        }).join('');
        for (const input of container.querySelectorAll('input[type="checkbox"]')) {
          input.addEventListener('change', () => opsRulesUpdateCategorySummary(config.containerId, config.summaryId, config.emptyText));
        }
        opsRulesWireCategoryButtons(prefix);
        opsRulesSetSelectedCategories(config.containerId, values, config.summaryId, config.emptyText);
      }
      function opsRulesRefreshCategorySelectors() {
        for (const config of opsRulesCategoryConfigs()) {
          const currentValues = opsRulesSelectedCategories(config.containerId);
          opsRulesRenderCategorySelector(config.prefix, currentValues.length > 0 ? currentValues : opsRuleDefaultCategories);
        }
      }
      function opsRulesApplyVaRuleTemplateSeed(templateId) {
        const id = String(templateId || '').trim();
        if (!id) {
          opsVaRuleTemplateId = '';
          opsRulesUpdateVaRuleFormSummary();
          opsRulesRefreshVaGeometryUi(true);
          return;
        }
        const template = findOpsEventTemplateById(id);
        if (!template) {
          opsRulesUpdateVaRuleFormSummary();
          return;
        }
        opsVaRuleTemplateId = id;
        opsRulesUpdateVaRuleFormSummary();
        opsRulesRefreshVaGeometryUi(true);
      }
      function opsEventRuleToggleField(fieldId, visible) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.hidden = !visible;
      }
      function opsEventRuleRefreshTypeOptions(preferred = '') {
        const mode = String(document.getElementById('opsEventRuleModeSelect')?.value || 'scenario');
        const select = document.getElementById('opsEventRuleTypeSelect');
        if (!select) return;
        const options = (mode === 'scenario' ? opsScenarioEventTypes : opsBasicEventTypes)
          .map(value => ({ value, label: opsRuleEventTypeLabel(value) }));
        setSelectOptions(select, options);
        const candidate = String(preferred || '').trim();
        const fallback = options[0]?.value || 'presence';
        select.value = options.some(option => option.value === candidate) ? candidate : fallback;
      }
      function opsEventRuleUpdateModeUi() {
        const mode = String(document.getElementById('opsEventRuleModeSelect')?.value || 'scenario');
        const type = String(document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const lineMode = opsRulesIsLineEventType(type);
        const dwellMode = type === 'intrusion-dwell';
        const reEntryMode = type === 're-entry';
        const lineAfterMode = type === 'intrusion-after-line-crossing';
        const loiteringMode = type === 'loitering';
        const zoneOccupancyMode = type === 'zone-occupancy';
        const settingsHeading = document.getElementById('opsEventRuleSettingsHeading');
        const formNote = document.getElementById('opsEventRuleFormNote');
        if (settingsHeading) settingsHeading.textContent = mode === 'scenario' ? '시나리오 조건' : '이벤트 조건';
        if (formNote) {
          formNote.textContent = mode === 'scenario'
            ? '여러 채널 분석 설정에서 다시 고를 수 있는 공통 시나리오 템플릿입니다.'
            : '여러 채널 분석 설정에서 다시 고를 수 있는 기본 이벤트 템플릿입니다.';
        }
        const presetVisible = opsEventRulePresetVisible(mode, type);
        opsEventRuleToggleField('opsEventRulePresetField', presetVisible);
        opsEventRuleToggleField('opsEventRulePresetSummary', presetVisible);
        opsEventRuleToggleField('opsEventRuleLineDirectionField', lineMode);
        opsEventRuleToggleField('opsEventRuleMinDurationField', !lineMode);
        opsEventRuleToggleField('opsEventRuleCandidateField', dwellMode);
        opsEventRuleToggleField('opsEventRuleDwellField', dwellMode || lineAfterMode || loiteringMode);
        opsEventRuleToggleField('opsEventRuleReEntryWindowField', reEntryMode);
        opsEventRuleToggleField('opsEventRuleReEntryModeField', reEntryMode);
        opsEventRuleToggleField('opsEventRuleLineDelayField', lineAfterMode);
        opsEventRuleToggleField('opsEventRuleTriggerDirectionField', lineAfterMode);
        opsEventRuleToggleField('opsEventRuleLoiteringRadiusField', loiteringMode);
        opsEventRuleToggleField('opsEventRuleLoiteringPointsField', loiteringMode);
        opsEventRuleToggleField('opsEventRuleLoiteringGroundPlaneField', loiteringMode);
        opsEventRuleToggleField('opsEventRuleZoneThresholdField', zoneOccupancyMode);
        opsEventRuleToggleField('opsEventRuleZoneDwellField', zoneOccupancyMode);
        opsEventRuleToggleField('opsEventRuleCooldownField', mode === 'scenario');
        opsEventRuleToggleField('opsEventRuleTargetZonesField', mode === 'scenario' && lineAfterMode);
        opsEventRuleToggleField('opsEventRuleRestrictedZonesField', mode === 'scenario' && (dwellMode || loiteringMode || zoneOccupancyMode));
        opsEventRuleToggleField('opsEventRuleReEntryZonesField', mode === 'scenario' && reEntryMode);
        opsEventRuleUpdatePresetSummary(type, document.getElementById('opsEventRulePresetSelect')?.value || 'default');
      }
      function opsEventRuleApplyPresetToInputs(presetId = '') {
        const type = String(document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const selected = String(presetId || document.getElementById('opsEventRulePresetSelect')?.value || 'default');
        const baseline = opsRulesScenarioBaseline(type, selected);
        opsEventRuleUpdatePresetSummary(type, selected, baseline);
        if (selected === 'custom') return;
        const setNumber = (id, value) => {
          const input = document.getElementById(id);
          if (input && value !== undefined) input.value = String(value);
        };
        const setChecked = (id, value) => {
          const input = document.getElementById(id);
          if (input) input.checked = Boolean(value);
        };
        setNumber('opsEventRuleConfidenceInput', baseline.minConfidence);
        setNumber('opsEventRuleMinDurationInput', baseline.minDurationMs);
        setNumber('opsEventRuleCooldownInput', baseline.cooldownMs);
        setNumber('opsEventRuleCandidateInput', baseline.candidateTimeMs);
        setNumber('opsEventRuleDwellInput', baseline.dwellTimeMs ?? baseline.minDwellTimeMs);
        setNumber('opsEventRuleReEntryWindowInput', baseline.reEntryWindowMs);
        setNumber('opsEventRuleLineDelayInput', baseline.maxDelayAfterCrossingMs);
        setNumber('opsEventRuleLoiteringRadiusInput', baseline.maxMovementRadius);
        setNumber('opsEventRuleLoiteringPointsInput', baseline.minTrajectoryPoints);
        setChecked('opsEventRuleLoiteringGroundPlaneToggle', baseline.useGroundPlaneMovementRadius);
        setNumber('opsEventRuleZoneThresholdInput', baseline.occupancyThreshold);
        setNumber('opsEventRuleZoneDwellInput', baseline.minDwellTimeMs);
      }
      function opsRulesCurrentForm(mode) {
        return ({
          'va-rule': document.getElementById('opsVaRuleForm'),
          'event-rule': document.getElementById('opsEventRuleForm'),
          profile: document.getElementById('opsProfileForm')
        })[mode] || null;
      }
      function opsRulesShowNativeForm(mode) {
        ['va-rule', 'event-rule', 'profile'].forEach((entryMode) => {
          const form = opsRulesCurrentForm(entryMode);
          if (form) form.hidden = entryMode !== mode;
        });
      }
      function setOpsGeneratedId(inputId, displayId, value, emptyLabel = '자동 배정') {
        const normalized = String(value || '').trim();
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (input) input.value = normalized;
        if (display) {
          display.textContent = normalized || emptyLabel;
          display.dataset.empty = normalized ? 'false' : 'true';
        }
      }
      function opsRulesSetFormDisabled(mode, disabled) {
        const form = opsRulesCurrentForm(mode);
        if (!form) return;
        for (const field of form.querySelectorAll('input, select, textarea, button')) {
          field.disabled = Boolean(disabled);
        }
      }
      function opsRulesNativeRecord(mode, detailMode, recordId) {
        if (mode === 'va-rule') {
          if (detailMode === 'new') return opsRulesVaRuleSkeleton();
          return findOpsVaRuleById(recordId);
        }
        if (mode === 'event-rule') {
          if (detailMode === 'new') return opsRulesEventTemplateSkeleton();
          return findOpsEventTemplateById(recordId);
        }
        if (mode === 'profile') {
          if (detailMode === 'new') return opsRulesProfileSkeleton();
          return findOpsProfileById(recordId);
        }
        return null;
      }
      function opsRulesProfileOptions() {
        return [
          ...opsCatalogBuiltInProfiles.map(item => ({ value: item.id, label: `[기본] ${item.id}` })),
          ...opsCatalogProfiles.map(item => ({ value: item.id || item.profileId, label: `[저장] ${item.id || item.profileId}` }))
        ];
      }
      function opsRulesPopulateFormOptions() {
        setSelectOptions(
          document.getElementById('opsVaRuleChannelSelect'),
          [{ value: '', label: '채널 선택' }].concat(
            opsRulesChannels.map(channel => ({ value: channel.id, label: opsRulesChannelOptionLabel(channel) }))
          )
        );
        const profileOptions = opsRulesProfileOptions();
        setSelectOptions(document.getElementById('opsVaRuleProfileSelect'), profileOptions);
        opsEventRuleRefreshTypeOptions(document.getElementById('opsEventRuleTypeSelect')?.value || '');
        refreshOpsVaTemplateAssistOptions();
      }
      function opsRulesUpdateVaRuleFormSummary() {
        const channel = opsRulesFindChannelById(document.getElementById('opsVaRuleChannelSelect')?.value || '');
        const templateId = String(document.getElementById('opsVaRuleTemplateSeedSelect')?.value || '').trim();
        const template = templateId ? findOpsEventTemplateById(templateId) : null;
        const currentMeta = opsVaRuleStartMeta(opsRulesCurrentRecord?.item || {});
        const bindingSummary = document.getElementById('opsVaRuleBindingSummary');
        const templateSummary = document.getElementById('opsVaRuleTemplateSummary');
        if (bindingSummary) {
          bindingSummary.textContent = channel
            ? `${display(channel.displayName)} · ${opsRulesSourceKindLabel(channel?.source?.kind)} 채널의 source와 기본 PublishedView에 연결합니다.`
            : '이벤트 템플릿과 분석 프로파일을 고른 뒤 채널을 선택하세요.';
        }
        if (templateSummary) {
          if (!templateId) {
            templateSummary.textContent = '이벤트 템플릿을 먼저 고르세요. 시나리오와 대상 객체는 템플릿에서 가져옵니다.';
          } else if (!template) {
            templateSummary.textContent = `선택 템플릿: ${display(templateId)}`;
          } else {
            const eventType = template?.scenario?.type || template?.event?.type || 'event';
            const classes = listText(template?.analysis?.classes || template?.scenario?.targetClasses || []);
            const prefix = currentMeta.inferred && currentMeta.templateRuleId === templateId
              ? '기존 설정에서 추정한 템플릿'
              : '선택 템플릿';
            templateSummary.textContent = `${prefix} ${display(templateId)} · ${opsRuleEventTypeLabel(eventType)} · ${classes}`;
          }
        }
        opsRulesUpdateTrackingPolicyUi();
      }
      function opsRulesVaGeometryTypeFromItem(item = {}) {
        const templateId = String(document.getElementById('opsVaRuleTemplateSeedSelect')?.value || item?.templateStart?.ruleId || '').trim();
        const template = templateId ? findOpsEventTemplateById(templateId) : null;
        const templateType = template?.event?.region?.type || (opsRulesIsLineEventType(template?.scenario?.type || template?.event?.type) ? 'line' : '');
        const currentType = String(item?.event?.region?.type || '').trim();
        return templateType || currentType || 'polygon';
      }
      function opsRulesGeometryKindLabel() {
        return String(document.getElementById('opsVaRuleGeometryKindText')?.value || '영역') === '라인' ? '라인' : '영역';
      }
      function opsRulesGeometryIsLineMode() {
        return opsRulesGeometryKindLabel() === '라인';
      }
      function opsRulesGeometryMinimumPoints() {
        return opsRulesGeometryIsLineMode() ? 2 : 3;
      }
      function opsRulesGeometryMaxPoints() {
        return opsRulesGeometryIsLineMode() ? OPS_RULES_LINE_MAX_POINTS : OPS_RULES_POLYGON_MAX_POINTS;
      }
      function opsRulesGeometryEditable() {
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        return Boolean(input && !input.disabled);
      }
      function opsRulesClampGeometryPoint(point = {}) {
        return {
          x: Math.max(0, Math.min(1, Number(point.x) || 0)),
          y: Math.max(0, Math.min(1, Number(point.y) || 0))
        };
      }
      function opsRulesNormalizeNearRectanglePoints(points = []) {
        if (!Array.isArray(points) || points.length !== 4 || opsRulesGeometryIsLineMode()) {
          return points;
        }
        const normalized = points.map(opsRulesClampGeometryPoint);
        const [topLeft, topRight, bottomRight, bottomLeft] = normalized;
        const tolerance = 0.025;
        const looksRect =
          Math.abs(topLeft.x - bottomLeft.x) <= tolerance &&
          Math.abs(topRight.x - bottomRight.x) <= tolerance &&
          Math.abs(topLeft.y - topRight.y) <= tolerance &&
          Math.abs(bottomLeft.y - bottomRight.y) <= tolerance &&
          topLeft.x < topRight.x &&
          bottomLeft.x < bottomRight.x &&
          topLeft.y < bottomLeft.y &&
          topRight.y < bottomRight.y;
        if (!looksRect) return points;
        const left = (topLeft.x + bottomLeft.x) / 2;
        const right = (topRight.x + bottomRight.x) / 2;
        const top = (topLeft.y + topRight.y) / 2;
        const bottom = (bottomLeft.y + bottomRight.y) / 2;
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom }
        ].map(opsRulesClampGeometryPoint);
      }
      function opsRulesFormatGeometryPoints(points = []) {
        return (Array.isArray(points) ? points : [])
          .filter(point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)))
          .map(point => `${Number(point.x).toFixed(2)},${Number(point.y).toFixed(2)}`)
          .join('\n');
      }
      function opsRulesParseGeometryPoints(text) {
        return String(text || '')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [xText, yText] = line.split(',').map(part => String(part || '').trim());
            const x = Number(xText);
            const y = Number(yText);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
          })
          .filter(Boolean);
      }
      function opsRulesCurrentGeometryPoints() {
        return opsRulesParseGeometryPoints(document.getElementById('opsVaRuleGeometryPointsInput')?.value || '');
      }
      function opsRulesClearGeometryUndo() {
        opsVaGeometryUndoStack = [];
        opsVaGeometryDragIndex = -1;
        opsVaGeometryDragPointerId = null;
        opsVaGeometryDidDrag = false;
      }
      function opsRulesPushGeometryUndo(points = opsRulesCurrentGeometryPoints()) {
        const snapshot = JSON.stringify(points.map(opsRulesClampGeometryPoint));
        if (opsVaGeometryUndoStack[opsVaGeometryUndoStack.length - 1] === snapshot) return;
        opsVaGeometryUndoStack.push(snapshot);
        if (opsVaGeometryUndoStack.length > OPS_RULES_GEOMETRY_UNDO_MAX) {
          opsVaGeometryUndoStack = opsVaGeometryUndoStack.slice(-OPS_RULES_GEOMETRY_UNDO_MAX);
        }
      }
      function opsRulesLineDirectionLabel(value = '') {
        const direction = String(value || opsRulesCurrentLineDirection() || 'any');
        if (direction === 'forward') return '정방향';
        if (direction === 'reverse') return '역방향';
        return '양방향';
      }
      function opsRulesCurrentLineDirection() {
        const templateId = String(document.getElementById('opsVaRuleTemplateSeedSelect')?.value || opsRulesCurrentRecord?.item?.templateStart?.ruleId || '').trim();
        const template = templateId ? findOpsEventTemplateById(templateId) : null;
        return String(
          template?.event?.region?.direction ||
          template?.scenario?.triggerLine?.direction ||
          opsRulesCurrentRecord?.item?.event?.region?.direction ||
          'any'
        );
      }
      function opsRulesSvgNumber(value) {
        return Number(value).toFixed(2).replace(/\.?0+$/, '');
      }
      function opsRulesGeometrySvgX(point = {}) {
        return opsRulesSvgNumber(Number(point.x || 0) * OPS_RULES_GEOMETRY_VIEWBOX_WIDTH);
      }
      function opsRulesGeometrySvgY(point = {}) {
        return opsRulesSvgNumber(Number(point.y || 0) * OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT);
      }
      function opsRulesGeometryPointList(points = []) {
        return points.map(point => `${opsRulesGeometrySvgX(point)},${opsRulesGeometrySvgY(point)}`).join(' ');
      }
      function opsRulesGeometryBadgeSvg(x, y, label) {
        const text = String(label || '');
        const width = Math.max(8, text.length * 1.35 + 3.2);
        const safeX = Math.max(1, Math.min(99 - width, x));
        const safeY = Math.max(1, Math.min(OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT - 4.4, y));
        return `<g class="ops-geometry-badge">
          <rect x="${opsRulesSvgNumber(safeX)}" y="${opsRulesSvgNumber(safeY)}" width="${opsRulesSvgNumber(width)}" height="3.4" rx="1.2"></rect>
          <text x="${opsRulesSvgNumber(safeX + width / 2)}" y="${opsRulesSvgNumber(safeY + 2.35)}" text-anchor="middle">${escapeHtml(text)}</text>
        </g>`;
      }
      function opsRulesGeometryArrowSvg(startX, startY, endX, endY) {
        const angle = Math.atan2(endY - startY, endX - startX);
        const size = 1.7;
        const leftX = endX - Math.cos(angle - Math.PI / 7) * size;
        const leftY = endY - Math.sin(angle - Math.PI / 7) * size;
        const rightX = endX - Math.cos(angle + Math.PI / 7) * size;
        const rightY = endY - Math.sin(angle + Math.PI / 7) * size;
        return `<line class="ops-geometry-direction" x1="${opsRulesSvgNumber(startX)}" y1="${opsRulesSvgNumber(startY)}" x2="${opsRulesSvgNumber(endX)}" y2="${opsRulesSvgNumber(endY)}"></line>
          <path class="ops-geometry-direction-head" d="M ${opsRulesSvgNumber(endX)} ${opsRulesSvgNumber(endY)} L ${opsRulesSvgNumber(leftX)} ${opsRulesSvgNumber(leftY)} L ${opsRulesSvgNumber(rightX)} ${opsRulesSvgNumber(rightY)} Z"></path>`;
      }
      function opsRulesGeometryDirectionSvg(points = []) {
        if (!opsRulesGeometryIsLineMode() || points.length < 2) return '';
        const start = points[0];
        const end = points[1];
        const x1 = start.x * OPS_RULES_GEOMETRY_VIEWBOX_WIDTH;
        const y1 = start.y * OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT;
        const x2 = end.x * OPS_RULES_GEOMETRY_VIEWBOX_WIDTH;
        const y2 = end.y * OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        if (!Number.isFinite(length) || length < 1) return '';
        const normalX = -dy / length;
        const normalY = dx / length;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const arrowLength = Math.max(4.8, Math.min(8.5, length * 0.18));
        const drawOne = (multiplier, label) => {
          const startArrowX = centerX - normalX * multiplier * arrowLength * 0.38;
          const startArrowY = centerY - normalY * multiplier * arrowLength * 0.38;
          const endArrowX = centerX + normalX * multiplier * arrowLength * 0.66;
          const endArrowY = centerY + normalY * multiplier * arrowLength * 0.66;
          return `<g class="ops-geometry-direction-group">
            ${opsRulesGeometryArrowSvg(startArrowX, startArrowY, endArrowX, endArrowY)}
            ${opsRulesGeometryBadgeSvg(endArrowX + normalX * multiplier * 1.4, endArrowY + normalY * multiplier * 1.4 - 1.8, label)}
          </g>`;
        };
        const direction = opsRulesCurrentLineDirection();
        if (direction === 'forward') return drawOne(1, '정방향');
        if (direction === 'reverse') return drawOne(-1, '역방향');
        const firstStartX = centerX - normalX * arrowLength * 0.62;
        const firstStartY = centerY - normalY * arrowLength * 0.62;
        const firstEndX = centerX + normalX * arrowLength * 0.62;
        const firstEndY = centerY + normalY * arrowLength * 0.62;
        return `<g class="ops-geometry-direction-group">
          ${opsRulesGeometryArrowSvg(firstStartX, firstStartY, firstEndX, firstEndY)}
          ${opsRulesGeometryArrowSvg(firstEndX, firstEndY, firstStartX, firstStartY)}
          ${opsRulesGeometryBadgeSvg(centerX + normalX * 2.1, centerY + normalY * 2.1 - 1.8, '양방향')}
        </g>`;
      }
      function opsRulesGeometryStatusText(points = []) {
        const kind = opsRulesGeometryKindLabel();
        const minimum = opsRulesGeometryMinimumPoints();
        const maxPoints = opsRulesGeometryMaxPoints();
        const ready = points.length >= minimum;
        return {
          kind,
          minimum,
          maxPoints,
          ready,
          direction: opsRulesGeometryIsLineMode() ? opsRulesLineDirectionLabel() : '영역 내부'
        };
      }
      function opsRulesUpdateGeometryStatus(points = opsRulesCurrentGeometryPoints()) {
        const status = opsRulesGeometryStatusText(points);
        setText('opsVaRuleGeometryModeText', status.kind);
        setText('opsVaRuleGeometryPointCountText', `${points.length}/${status.maxPoints}`);
        setText('opsVaRuleGeometryMinimumText', status.ready ? '저장 가능' : `최소 ${status.minimum}점`);
        setText('opsVaRuleGeometryDirectionText', status.direction);
        const minimumText = document.getElementById('opsVaRuleGeometryMinimumText');
        if (minimumText) minimumText.dataset.state = status.ready ? 'ready' : 'warn';
        const editable = opsRulesGeometryEditable();
        const defaultBtn = document.getElementById('opsVaRuleGeometryDefaultBtn');
        const undoBtn = document.getElementById('opsVaRuleGeometryUndoBtn');
        const deleteBtn = document.getElementById('opsVaRuleGeometryDeleteLastBtn');
        const clearBtn = document.getElementById('opsVaRuleGeometryClearBtn');
        if (defaultBtn) defaultBtn.disabled = !editable;
        if (undoBtn) undoBtn.disabled = !editable || opsVaGeometryUndoStack.length === 0;
        if (deleteBtn) deleteBtn.disabled = !editable || points.length === 0;
        if (clearBtn) clearBtn.disabled = !editable || points.length === 0;
      }
      function opsRulesRenderVaGeometryPreview() {
        const svg = document.getElementById('opsVaRuleGeometryPreview');
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        const summary = document.getElementById('opsVaRuleGeometrySummary');
        if (!svg || !input) return;
        const points = opsRulesParseGeometryPoints(input.value);
        const status = opsRulesGeometryStatusText(points);
        const pointList = opsRulesGeometryPointList(points);
        const grid = Array.from({ length: 9 }, (_, index) => (index + 1) * 10)
          .map(value => {
            const y = opsRulesSvgNumber((value / 100) * OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT);
            return `<line class="ops-geometry-grid" x1="${value}" y1="0" x2="${value}" y2="${OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT}"></line><line class="ops-geometry-grid" x1="0" y1="${y}" x2="${OPS_RULES_GEOMETRY_VIEWBOX_WIDTH}" y2="${y}"></line>`;
          })
          .join('');
        let shape = '';
        if (points.length >= 2 && status.kind === '라인') {
          shape = `<polyline class="ops-geometry-line" points="${escapeHtml(pointList)}"></polyline>${opsRulesGeometryDirectionSvg(points)}`;
        } else if (points.length >= 3) {
          shape = `<polygon class="ops-geometry-polygon" points="${escapeHtml(pointList)}"></polygon>`;
        } else if (points.length >= 2) {
          shape = `<polyline class="ops-geometry-incomplete" points="${escapeHtml(pointList)}"></polyline>`;
        }
        const dots = points.map((point, index) => {
          const x = opsRulesGeometrySvgX(point);
          const y = opsRulesGeometrySvgY(point);
          const activeClass = index === opsVaGeometryDragIndex ? ' is-active' : '';
          return `<g class="ops-geometry-point${activeClass}" data-index="${index}">
            <circle class="ops-geometry-touch-target" cx="${x}" cy="${y}" r="2.8"></circle>
            <circle cx="${x}" cy="${y}" r="0.95"></circle>
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${index + 1}</text>
          </g>`;
        }).join('');
        const header = [
          opsRulesGeometryBadgeSvg(2, 3, `${status.kind} ${points.length}/${status.maxPoints}`),
          status.kind === '라인' ? opsRulesGeometryBadgeSvg(2, 12, `방향 ${status.direction}`) : ''
        ].join('');
        svg.innerHTML = `<rect class="ops-geometry-frame-dim" x="0" y="0" width="${OPS_RULES_GEOMETRY_VIEWBOX_WIDTH}" height="${OPS_RULES_GEOMETRY_VIEWBOX_HEIGHT}"></rect>${grid}${shape}${dots}${header}`;
        if (summary) {
          summary.textContent = points.length === 0
            ? '영상 위를 눌러 점을 추가합니다. 기존 점은 드래그해서 옮깁니다.'
            : `${status.kind} 점 ${points.length}/${status.maxPoints} · ${status.ready ? '저장 가능' : `최소 ${status.minimum}점 필요`}${status.kind === '라인' ? ` · ${status.direction}` : ''}`;
        }
        opsRulesUpdateGeometryStatus(points);
      }
      function opsRulesSetGeometryPoints(points = []) {
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!input) return;
        input.value = opsRulesFormatGeometryPoints(points.slice(0, opsRulesGeometryMaxPoints()).map(opsRulesClampGeometryPoint));
        opsRulesRenderVaGeometryPreview();
      }
      function opsRulesGeometryPointFromEvent(event) {
        const svg = document.getElementById('opsVaRuleGeometryPreview');
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return opsRulesClampGeometryPoint({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height
        });
      }
      function opsRulesGeometryHitTestPoint(points = [], point = null) {
        const svg = document.getElementById('opsVaRuleGeometryPreview');
        if (!svg || !point) return -1;
        const rect = svg.getBoundingClientRect();
        let bestIndex = -1;
        let bestDistance = OPS_RULES_GEOMETRY_HIT_RADIUS_PX;
        points.forEach((candidate, index) => {
          const dx = (candidate.x - point.x) * rect.width;
          const dy = (candidate.y - point.y) * rect.height;
          const distance = Math.hypot(dx, dy);
          if (distance <= bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });
        return bestIndex;
      }
      function opsRulesGeometryTargetPointIndex(event) {
        const target = event?.target;
        const pointNode = target && typeof target.closest === 'function'
          ? target.closest('.ops-geometry-point')
          : null;
        const index = Number(pointNode?.dataset?.index);
        return Number.isInteger(index) && index >= 0 ? index : -1;
      }
      function opsRulesAppendGeometryPointFromClick(event) {
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!input) return;
        if (input.disabled) return;
        const nextPoint = opsRulesGeometryPointFromEvent(event);
        if (!nextPoint) return;
        const points = opsRulesParseGeometryPoints(input.value);
        if (points.length >= opsRulesGeometryMaxPoints()) return;
        opsRulesPushGeometryUndo(points);
        const trimmed = points.slice(0, opsRulesGeometryMaxPoints() - 1);
        trimmed.push(nextPoint);
        opsRulesSetGeometryPoints(trimmed);
      }
      function opsRulesDeleteLastGeometryPoint() {
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!input) return;
        if (input.disabled) return;
        const points = opsRulesParseGeometryPoints(input.value);
        if (points.length === 0) return;
        opsRulesPushGeometryUndo(points);
        points.pop();
        opsRulesSetGeometryPoints(points);
      }
      function opsRulesRemoveLastGeometryPoint() {
        opsRulesDeleteLastGeometryPoint();
      }
      function opsRulesUndoGeometryChange() {
        const input = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!input || input.disabled) return;
        const snapshot = opsVaGeometryUndoStack.pop();
        if (!snapshot) {
          opsRulesRenderVaGeometryPreview();
          return;
        }
        try {
          opsRulesSetGeometryPoints(JSON.parse(snapshot));
        } catch (_) {
          opsRulesRenderVaGeometryPreview();
        }
      }
      function opsRulesClearGeometryPoints() {
        const points = opsRulesCurrentGeometryPoints();
        if (points.length === 0) return;
        opsRulesPushGeometryUndo(points);
        opsRulesSetGeometryPoints([]);
      }
      function opsRulesStartGeometryPointer(event) {
        const svg = document.getElementById('opsVaRuleGeometryPreview');
        if (!svg || !opsRulesGeometryEditable()) return;
        if (opsVaGeometryDragIndex >= 0) return;
        if (event.button !== undefined && event.button !== 0) return;
        const point = opsRulesGeometryPointFromEvent(event);
        if (!point) return;
        event.preventDefault();
        const points = opsRulesCurrentGeometryPoints();
        const targetIndex = opsRulesGeometryTargetPointIndex(event);
        const hitIndex = points[targetIndex] ? targetIndex : opsRulesGeometryHitTestPoint(points, point);
        opsVaGeometryDidDrag = false;
        if (hitIndex >= 0) {
          opsRulesPushGeometryUndo(points);
          opsVaGeometryDragIndex = hitIndex;
        } else {
          if (points.length >= opsRulesGeometryMaxPoints()) {
            opsRulesRenderVaGeometryPreview();
            return;
          }
          opsRulesPushGeometryUndo(points);
          points.push(point);
          opsVaGeometryDragIndex = points.length - 1;
          opsVaGeometryDidDrag = true;
          opsRulesSetGeometryPoints(points);
        }
        opsVaGeometryDragPointerId = event.pointerId ?? null;
        if (event.pointerId !== undefined && typeof svg.setPointerCapture === 'function') {
          svg.setPointerCapture(event.pointerId);
        }
        window.addEventListener('pointermove', opsRulesMoveGeometryPointer);
        window.addEventListener('pointerup', opsRulesFinishGeometryPointer);
        window.addEventListener('pointercancel', opsRulesFinishGeometryPointer);
        window.addEventListener('mousemove', opsRulesMoveGeometryPointer);
        window.addEventListener('mouseup', opsRulesFinishGeometryPointer);
        opsRulesRenderVaGeometryPreview();
      }
      function opsRulesMoveGeometryPointer(event) {
        if (opsVaGeometryDragIndex < 0 || !opsRulesGeometryEditable()) return;
        const point = opsRulesGeometryPointFromEvent(event);
        if (!point) return;
        event.preventDefault();
        const points = opsRulesCurrentGeometryPoints();
        if (!points[opsVaGeometryDragIndex]) return;
        points[opsVaGeometryDragIndex] = point;
        opsVaGeometryDidDrag = true;
        opsRulesSetGeometryPoints(points);
      }
      function opsRulesFinishGeometryPointer(event) {
        const svg = document.getElementById('opsVaRuleGeometryPreview');
        if (opsVaGeometryDragIndex < 0) return;
        event.preventDefault();
        if (event.pointerId !== undefined && svg && typeof svg.hasPointerCapture === 'function' && svg.hasPointerCapture(event.pointerId)) {
          svg.releasePointerCapture(event.pointerId);
        }
        opsVaGeometryDragIndex = -1;
        opsVaGeometryDragPointerId = null;
        opsVaGeometryDidDrag = false;
        window.removeEventListener('pointermove', opsRulesMoveGeometryPointer);
        window.removeEventListener('pointerup', opsRulesFinishGeometryPointer);
        window.removeEventListener('pointercancel', opsRulesFinishGeometryPointer);
        window.removeEventListener('mousemove', opsRulesMoveGeometryPointer);
        window.removeEventListener('mouseup', opsRulesFinishGeometryPointer);
        opsRulesRenderVaGeometryPreview();
      }
      function opsRulesRefreshVaGeometryUi(resetPoints = false) {
        const kindInput = document.getElementById('opsVaRuleGeometryKindText');
        const pointsInput = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!kindInput || !pointsInput) return;
        const templateId = String(document.getElementById('opsVaRuleTemplateSeedSelect')?.value || '').trim();
        const template = templateId ? findOpsEventTemplateById(templateId) : null;
        const type = opsRulesVaGeometryTypeFromItem(template || opsRulesCurrentRecord?.item || {});
        const isLine = type === 'line';
        kindInput.value = isLine ? '라인' : '영역';
        const currentPoints = opsRulesParseGeometryPoints(pointsInput.value);
        const minimum = isLine ? 2 : 3;
        if (resetPoints || currentPoints.length < minimum) {
          const defaults = isLine ? opsRulesDefaultLinePoints() : opsRulesDefaultPolygonPoints();
          pointsInput.value = opsRulesFormatGeometryPoints(defaults);
        }
        opsRulesRenderVaGeometryPreview();
      }
      function opsRulesFillVaGeometryForm(item = {}) {
        const kindInput = document.getElementById('opsVaRuleGeometryKindText');
        const pointsInput = document.getElementById('opsVaRuleGeometryPointsInput');
        if (!kindInput || !pointsInput) return;
        const type = opsRulesVaGeometryTypeFromItem(item);
        const isLine = type === 'line';
        const points = Array.isArray(item?.event?.region?.points) && item.event.region.points.length > 0
          ? item.event.region.points
          : (isLine ? opsRulesDefaultLinePoints() : opsRulesDefaultPolygonPoints());
        kindInput.value = isLine ? '라인' : '영역';
        pointsInput.value = opsRulesFormatGeometryPoints(opsRulesNormalizeNearRectanglePoints(points));
        opsRulesClearGeometryUndo();
        opsRulesRenderVaGeometryPreview();
      }
      function opsRulesPrereqState() {
        const channelCount = opsRulesChannels.length;
        const profileCount = opsCatalogBuiltInProfiles.length + opsCatalogProfiles.length;
        const templateCount = opsCatalogEventTemplates.length;
        return {
          channelCount,
          profileCount,
          templateCount,
          vaRuleCount: opsCatalogVaRules.length,
          channelsReady: channelCount > 0,
          profilesReady: profileCount > 0,
          templatesReady: templateCount > 0
        };
      }
      function opsRulesVaRuleReadiness(state = opsRulesPrereqState()) {
        const missing = [];
        if (!state.channelsReady) missing.push('채널');
        if (!state.profilesReady) missing.push('분석 프로파일');
        if (!state.templatesReady) missing.push('이벤트 템플릿');
        return {
          ready: missing.length === 0,
          missing,
          message: missing.length
            ? `채널 분석 설정을 만들 수 없습니다. 먼저 ${missing.join(', ')}을(를) 준비하세요.`
            : '채널, 프로파일, 템플릿이 준비되었습니다. 이제 채널 분석 설정을 만들 수 있습니다.'
        };
      }
      function opsRulesSetPrereqChip(id, ready, readyLabel = '준비됨', pendingLabel = '필요') {
        const chip = document.getElementById(id);
        if (!chip) return;
        chip.textContent = ready ? readyLabel : pendingLabel;
        chip.classList.toggle('warn', !ready);
        chip.classList.toggle('info', ready);
      }
      function opsRulesRefreshPrereqUi() {
        const state = opsRulesPrereqState();
        setText('opsRulesPrereqChannelsCount', `${state.channelCount}개`);
        setText('opsRulesPrereqProfilesCount', `${state.profileCount}개`);
        setText('opsRulesPrereqTemplatesCount', `${state.templateCount}개`);
        setText('opsRulesPrereqVaRulesCount', `${state.vaRuleCount}개`);
        opsRulesSetPrereqChip('opsRulesPrereqChannelsState', state.channelsReady);
        opsRulesSetPrereqChip('opsRulesPrereqProfilesState', state.profilesReady);
        opsRulesSetPrereqChip('opsRulesPrereqTemplatesState', state.templatesReady);
        const readiness = opsRulesVaRuleReadiness(state);
        const readyForVaRule = readiness.ready;
        opsRulesSetPrereqChip('opsRulesPrereqVaRulesState', readyForVaRule, '시작 가능', '준비 필요');
        const summary = document.getElementById('opsRulesPrereqSummary');
        if (summary) {
          summary.textContent = readiness.message;
        }
        const createVaButtons = [
          document.getElementById('opsCreateVaRuleBtn'),
          document.getElementById('opsRulesPrereqVaRulesAction')
        ];
        createVaButtons.forEach((button) => {
          if (!button) return;
          button.disabled = false;
          button.setAttribute('aria-disabled', readyForVaRule ? 'false' : 'true');
          button.classList.toggle('is-blocked', !readyForVaRule);
          button.title = readyForVaRule ? '' : readiness.message;
          button.dataset.blockReason = readyForVaRule ? '' : readiness.message;
        });
      }
      function setOpsRulesComposer(mode, detailMode = opsRulesDetailMode, recordId = opsRulesDetailRecordId) {
        const config = opsRulesModeConfig(mode);
        const steps = document.getElementById('opsRulesComposerSteps');
        setOpsRulesDetailChrome(mode, detailMode, recordId);
        if (!config || detailMode === 'closed') {
          if (steps) {
            steps.innerHTML = '';
            steps.hidden = true;
          }
          opsVaRuleTemplateId = '';
          return;
        }
        if (steps) {
          steps.innerHTML = '';
          steps.hidden = true;
        }
        if (mode === 'va-rule') {
          opsRulesUpdateVaRuleFormSummary();
          updateOpsVaRulePreviewUi();
        }
      }
      function opsRulesFillVaRuleForm(item, detailMode) {
        const form = document.getElementById('opsVaRuleForm');
        if (!form) return;
        const analysis = item?.analysis || {};
        const channel = opsRulesFindChannelForVaRule(item);
        const templateMeta = opsVaRuleStartMeta(item);
        const templateRuleId = templateMeta.templateRuleId;
        setOpsGeneratedId('opsVaRuleIdInput', 'opsVaRuleIdDisplay', item?.id || '');
        document.getElementById('opsVaRuleNameInput').value = String(item?.name || `채널 분석 설정 ${item?.id || ''}`).trim();
        document.getElementById('opsVaRuleEnabledInput').value = item?.enabled === false ? 'false' : 'true';
        document.getElementById('opsVaRuleChannelSelect').value = channel?.id || '';
        document.getElementById('opsVaRuleProfileSelect').value = String(analysis.profileId || item?.profileId || opsRulesPreferredProfileId());
        document.getElementById('opsVaRuleTemplateSeedSelect').value = templateRuleId;
        opsVaRuleTemplateId = templateRuleId;
        opsRulesSetTrackingPolicyControls(opsRulesTrackingPolicyFromItem(item));
        opsRulesSetFormDisabled('va-rule', detailMode === 'view');
        opsRulesUpdateVaRuleFormSummary();
        opsRulesFillVaGeometryForm(item);
        updateOpsVaRulePreviewUi();
      }
      function opsRulesFillEventRuleForm(item, detailMode) {
        const analysis = item?.analysis || {};
        const eventType = item?.scenario?.type || item?.event?.type || 'intrusion-dwell';
        const event = item?.event || {};
        const scenario = item?.scenario || {};
        const modeSelect = document.getElementById('opsEventRuleModeSelect');
        if (modeSelect) {
          modeSelect.value = opsEventRuleModeForType(eventType);
        }
        opsEventRuleRefreshTypeOptions(eventType);
        const presetId = String(scenario?.presetId || 'default');
        const baseline = opsRulesScenarioBaseline(eventType, presetId);
        const presetSelect = document.getElementById('opsEventRulePresetSelect');
        if (presetSelect) {
          presetSelect.value = opsScenarioPresetBaselines[presetId] ? presetId : 'custom';
        }
        setOpsGeneratedId('opsEventRuleIdInput', 'opsEventRuleIdDisplay', item?.id || '');
        document.getElementById('opsEventRuleTypeSelect').value = eventType;
        document.getElementById('opsEventRuleConfidenceInput').value = String(event?.minConfidence ?? baseline.minConfidence ?? 0.25);
        document.getElementById('opsEventRuleMinDurationInput').value = String(event?.minDurationMs ?? baseline.minDurationMs ?? 0);
        opsRulesRenderCategorySelector('opsEventRuleClasses', Array.isArray(analysis.classes) && analysis.classes.length > 0 ? analysis.classes : opsRuleDefaultCategories);
        document.getElementById('opsEventRuleLineDirectionSelect').value = String(
          eventType === 'wrong-direction'
            ? (scenario?.allowedDirection || event?.region?.direction || 'forward')
            : (event?.region?.direction || 'any')
        );
        document.getElementById('opsEventRuleCandidateInput').value = String(scenario?.candidateTimeMs ?? baseline.candidateTimeMs ?? 2000);
        document.getElementById('opsEventRuleDwellInput').value = String(scenario?.dwellTimeMs ?? scenario?.minDwellTimeMs ?? baseline.dwellTimeMs ?? baseline.minDwellTimeMs ?? 10000);
        document.getElementById('opsEventRuleReEntryWindowInput').value = String(scenario?.reEntryWindowMs ?? baseline.reEntryWindowMs ?? 10000);
        document.getElementById('opsEventRuleReEntryModeSelect').value = String(scenario?.reEntryMode || 'same-zone');
        document.getElementById('opsEventRuleLineDelayInput').value = String(scenario?.maxDelayAfterCrossingMs ?? baseline.maxDelayAfterCrossingMs ?? 10000);
        document.getElementById('opsEventRuleTriggerDirectionSelect').value = String(scenario?.triggerLine?.direction || 'any');
        document.getElementById('opsEventRuleLoiteringRadiusInput').value = String(scenario?.maxMovementRadius ?? baseline.maxMovementRadius ?? 0.08);
        document.getElementById('opsEventRuleLoiteringPointsInput').value = String(scenario?.minTrajectoryPoints ?? baseline.minTrajectoryPoints ?? 4);
        document.getElementById('opsEventRuleLoiteringGroundPlaneToggle').checked = Boolean(scenario?.useGroundPlaneMovementRadius ?? baseline.useGroundPlaneMovementRadius ?? false);
        document.getElementById('opsEventRuleZoneThresholdInput').value = String(scenario?.occupancyThreshold ?? baseline.occupancyThreshold ?? 4);
        document.getElementById('opsEventRuleZoneDwellInput').value = String(scenario?.minDwellTimeMs ?? baseline.minDwellTimeMs ?? 7000);
        document.getElementById('opsEventRuleCooldownInput').value = String(scenario?.cooldownMs ?? baseline.cooldownMs ?? 5000);
        document.getElementById('opsEventRuleTargetZonesInput').value = opsRulesStringArray(scenario?.targetZoneIds || []).join(', ');
        document.getElementById('opsEventRuleRestrictedZonesInput').value = opsRulesStringArray(scenario?.restrictedZoneIds || []).join(', ');
        document.getElementById('opsEventRuleReEntryZonesInput').value = opsRulesStringArray(scenario?.reEntryZoneIds || []).join(', ');
        opsRulesSetFormDisabled('event-rule', detailMode === 'view');
        opsEventRuleUpdateModeUi();
      }
      function opsRulesFillProfileForm(item, detailMode) {
        setOpsGeneratedId('opsProfileIdInput', 'opsProfileIdDisplay', item?.id || item?.profileId || '');
        document.getElementById('opsProfileDetectorSelect').value = String(item?.detector || 'yolo');
        document.getElementById('opsProfileFpsInput').value = String(item?.fps ?? 6);
        document.getElementById('opsProfileQueueInput').value = String(item?.maxQueue ?? 1);
        document.getElementById('opsProfileConfidenceInput').value = String(item?.confidence ?? 0.25);
        document.getElementById('opsProfileNmsInput').value = String(item?.nms ?? 0.45);
        document.getElementById('opsProfileInputWidthInput').value = String(item?.inputWidth ?? 640);
        document.getElementById('opsProfileInputHeightInput').value = String(item?.inputHeight ?? 640);
        document.getElementById('opsProfileAdaptiveToggle').checked = item?.adaptive !== false;
        opsRulesRenderCategorySelector('opsProfileClasses', opsRulesProfileClasses(item).length > 0 ? opsRulesProfileClasses(item) : opsRuleDefaultCategories);
        opsRulesSetFormDisabled('profile', detailMode === 'view' || item?.builtIn === true);
      }
      function opsRulesFillNativeForm(mode, item, detailMode) {
        if (mode === 'va-rule') {
          opsRulesFillVaRuleForm(item, detailMode);
          return;
        }
        if (mode === 'event-rule') {
          opsRulesFillEventRuleForm(item, detailMode);
          return;
        }
        if (mode === 'profile') {
          opsRulesFillProfileForm(item, detailMode);
        }
      }
      function opsRulesReadEventTemplateForm(baseRecord = {}, forcedId = '') {
        const classes = opsRulesSelectedCategories('opsEventRuleClassChecks');
        const type = String(document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const presetId = String(document.getElementById('opsEventRulePresetSelect')?.value || 'default');
        const base = opsRulesClone(baseRecord);
        const defaults = opsRulesRuleBasePayload(type, base.event || {}, classes.length > 0 ? classes : ['person', 'vehicle']);
        const event = {
          ...(base.event || {}),
          ...defaults.event,
          minConfidence: Number(document.getElementById('opsEventRuleConfidenceInput')?.value || 0.25),
          minDurationMs: Number(document.getElementById('opsEventRuleMinDurationInput')?.value || 0)
        };
        if (opsRulesIsLineEventType(type)) {
          event.region = {
            ...(event.region || {}),
            direction: String(document.getElementById('opsEventRuleLineDirectionSelect')?.value || 'any')
          };
        }
        const scenario = defaults.scenario ? {
          ...defaults.scenario
        } : null;
        if (scenario) {
          scenario.presetId = presetId;
          scenario.cooldownMs = Number(document.getElementById('opsEventRuleCooldownInput')?.value || scenario.cooldownMs || 5000);
          const targetZoneIds = opsRulesSplitList(document.getElementById('opsEventRuleTargetZonesInput')?.value || '');
          const restrictedZoneIds = opsRulesSplitList(document.getElementById('opsEventRuleRestrictedZonesInput')?.value || '');
          const reEntryZoneIds = opsRulesSplitList(document.getElementById('opsEventRuleReEntryZonesInput')?.value || '');
          if (type === 'intrusion-dwell') {
            scenario.candidateTimeMs = Number(document.getElementById('opsEventRuleCandidateInput')?.value || scenario.candidateTimeMs || 2000);
            scenario.dwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.dwellTimeMs || 10000);
            scenario.restrictedZoneIds = restrictedZoneIds;
          } else if (type === 're-entry') {
            scenario.reEntryWindowMs = Number(document.getElementById('opsEventRuleReEntryWindowInput')?.value || scenario.reEntryWindowMs || 10000);
            scenario.reEntryMode = String(document.getElementById('opsEventRuleReEntryModeSelect')?.value || scenario.reEntryMode || 'same-zone');
            scenario.reEntryZoneIds = reEntryZoneIds;
            scenario.restrictedZoneIds = restrictedZoneIds;
          } else if (type === 'wrong-direction') {
            scenario.allowedDirection = String(document.getElementById('opsEventRuleLineDirectionSelect')?.value || scenario.allowedDirection || 'forward');
          } else if (type === 'intrusion-after-line-crossing') {
            scenario.maxDelayAfterCrossingMs = Number(document.getElementById('opsEventRuleLineDelayInput')?.value || scenario.maxDelayAfterCrossingMs || 10000);
            scenario.dwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.dwellTimeMs || 3000);
            scenario.targetZoneIds = targetZoneIds;
            scenario.triggerLine = {
              ...(scenario.triggerLine || {}),
              direction: String(document.getElementById('opsEventRuleTriggerDirectionSelect')?.value || scenario.triggerLine?.direction || 'any')
            };
          } else if (type === 'loitering') {
            scenario.minDwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.minDwellTimeMs || 30000);
            scenario.maxMovementRadius = Number(document.getElementById('opsEventRuleLoiteringRadiusInput')?.value || scenario.maxMovementRadius || 0.08);
            scenario.minTrajectoryPoints = Number(document.getElementById('opsEventRuleLoiteringPointsInput')?.value || scenario.minTrajectoryPoints || 4);
            scenario.useGroundPlaneMovementRadius = Boolean(document.getElementById('opsEventRuleLoiteringGroundPlaneToggle')?.checked);
            scenario.restrictedZoneIds = restrictedZoneIds;
          } else if (type === 'zone-occupancy') {
            scenario.occupancyThreshold = Number(document.getElementById('opsEventRuleZoneThresholdInput')?.value || scenario.occupancyThreshold || 4);
            scenario.minDwellTimeMs = Number(document.getElementById('opsEventRuleZoneDwellInput')?.value || scenario.minDwellTimeMs || 7000);
            scenario.restrictedZoneIds = restrictedZoneIds;
          }
        }
        const payload = {
          ...base,
          id: String(forcedId || document.getElementById('opsEventRuleIdInput')?.value || '').trim(),
          enabled: true,
          analysis: {
            ...(base.analysis || {}),
            classes: classes.length > 0 ? classes : ['person', 'vehicle']
          },
          event
        };
        delete payload.match;
        delete payload.outputs;
        delete payload.eventActions;
        delete payload.analysis.profileId;
        payload.ruleKind = defaults.ruleKind;
        if (scenario) payload.scenario = scenario;
        else delete payload.scenario;
        return payload;
      }
      function opsRulesReadVaRuleForm(baseRecord = {}, forcedId = '') {
        const selectedTemplateId = String(document.getElementById('opsVaRuleTemplateSeedSelect')?.value || '').trim();
        const templateBase = selectedTemplateId ? opsRulesClone(findOpsEventTemplateById(selectedTemplateId)) : null;
        const base = templateBase || opsRulesClone(baseRecord);
        const id = String(forcedId || document.getElementById('opsVaRuleIdInput')?.value || '').trim();
        const channel = opsRulesFindChannelById(document.getElementById('opsVaRuleChannelSelect')?.value || '');
        const geometryType = String(document.getElementById('opsVaRuleGeometryKindText')?.value || '영역') === '라인' ? 'line' : 'polygon';
        const points = opsRulesNormalizeNearRectanglePoints(
          opsRulesParseGeometryPoints(document.getElementById('opsVaRuleGeometryPointsInput')?.value || '')
        );
        const existingPriority = Number(baseRecord?.priority ?? baseRecord?.match?.priority);
        const payload = {
          ...base,
          id,
          name: String(document.getElementById('opsVaRuleNameInput')?.value || '').trim() || `채널 분석 설정 ${id}`,
          enabled: String(document.getElementById('opsVaRuleEnabledInput')?.value || 'true') !== 'false',
          source: channel ? opsRulesSourcePayload(channel.source) : opsRulesClone(base.source || opsRulesVaRuleSkeleton(id).source),
          analysis: {
            ...(base.analysis || {}),
            profileId: String(document.getElementById('opsVaRuleProfileSelect')?.value || opsRulesPreferredProfileId()),
            trackingPolicy: opsRulesCurrentTrackingPolicy()
          },
          binding: {
            ...(base.binding || {}),
            urlMode: `vaRule=${id}`,
            sourceLocked: true,
            sourceOverrideAllowed: false
          },
          match: {
            sourceKind: '*',
            route: '*',
            vaRule: id
          }
        };
        if (Number.isFinite(existingPriority)) {
          payload.priority = existingPriority;
        }
        payload.templateStart = { ruleId: selectedTemplateId };
        payload.event = {
          ...(base.event || {}),
          region: {
            ...(base.event?.region || {}),
            type: geometryType,
            points
          }
        };
        return { payload, channel };
      }
      function opsRulesReadProfileForm(baseRecord = {}) {
        const base = opsRulesClone(baseRecord);
        const trackingClasses = opsRulesSelectedCategories('opsProfileClassChecks');
        return {
          ...base,
          id: String(document.getElementById('opsProfileIdInput')?.value || '').trim(),
          detector: String(document.getElementById('opsProfileDetectorSelect')?.value || 'yolo'),
          fps: Number(document.getElementById('opsProfileFpsInput')?.value || 6),
          maxQueue: Number(document.getElementById('opsProfileQueueInput')?.value || 1),
          confidence: Number(document.getElementById('opsProfileConfidenceInput')?.value || 0.25),
          nms: Number(document.getElementById('opsProfileNmsInput')?.value || 0.45),
          inputWidth: Number(document.getElementById('opsProfileInputWidthInput')?.value || 640),
          inputHeight: Number(document.getElementById('opsProfileInputHeightInput')?.value || 640),
          adaptive: document.getElementById('opsProfileAdaptiveToggle')?.checked !== false,
          trackingClasses
        };
      }
      function opsRulesAssertNumberRange(value, label, options = {}) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
          throw new Error(`${label}은(는) 숫자여야 합니다.`);
        }
        if (options.integer && !Number.isInteger(number)) {
          throw new Error(`${label}은(는) 정수여야 합니다.`);
        }
        if (options.min !== undefined && number < options.min) {
          throw new Error(`${label}은(는) ${options.min} 이상이어야 합니다.`);
        }
        if (options.max !== undefined && number > options.max) {
          throw new Error(`${label}은(는) ${options.max} 이하이어야 합니다.`);
        }
        return number;
      }
      function opsRulesValidateEventTemplatePayload(payload = {}) {
        const event = payload.event || {};
        const scenario = payload.scenario || null;
        const type = String(scenario?.type || event?.type || '').trim();
        opsRulesAssertNumberRange(event.minConfidence, 'Confidence', { min: 0, max: 1 });
        opsRulesAssertNumberRange(event.minDurationMs, '최소 지속 시간', { min: 0 });
        const direction = String(event?.region?.direction || 'any').trim();
        if (opsRulesIsLineEventType(type) && !['any', 'forward', 'reverse'].includes(direction)) {
          throw new Error('라인 방향은 any, forward, reverse 중 하나여야 합니다.');
        }
        if (!scenario) return;
        opsRulesAssertNumberRange(scenario.cooldownMs, '재알림 대기', { min: 0 });
        if (type === 'intrusion-dwell') {
          opsRulesAssertNumberRange(scenario.candidateTimeMs, '후보 판단 시간', { min: 0 });
          opsRulesAssertNumberRange(scenario.dwellTimeMs, '확정/체류 시간', { min: 0 });
        } else if (type === 're-entry') {
          opsRulesAssertNumberRange(scenario.reEntryWindowMs, '재진입 허용 시간', { min: 0 });
        } else if (type === 'wrong-direction') {
          if (!['forward', 'reverse'].includes(direction)) {
            throw new Error('역방향 이동은 allowed direction을 forward 또는 reverse로 선택해야 합니다.');
          }
        } else if (type === 'intrusion-after-line-crossing') {
          opsRulesAssertNumberRange(scenario.maxDelayAfterCrossingMs, '라인 후 최대 지연', { min: 0 });
          opsRulesAssertNumberRange(scenario.dwellTimeMs, '확정/체류 시간', { min: 0 });
          const triggerDirection = String(scenario?.triggerLine?.direction || 'any').trim();
          if (!['any', 'forward', 'reverse'].includes(triggerDirection)) {
            throw new Error('트리거 라인 방향은 any, forward, reverse 중 하나여야 합니다.');
          }
        } else if (type === 'loitering') {
          opsRulesAssertNumberRange(scenario.minDwellTimeMs, '최소 체류 시간', { min: 0 });
          opsRulesAssertNumberRange(scenario.maxMovementRadius, '최대 이동 반경', { min: 0.01, max: 1 });
          opsRulesAssertNumberRange(scenario.minTrajectoryPoints, '최소 이동 경로 점수', { min: 2, integer: true });
        } else if (type === 'zone-occupancy') {
          opsRulesAssertNumberRange(scenario.occupancyThreshold, '점유 임계값', { min: 1, integer: true });
          opsRulesAssertNumberRange(scenario.minDwellTimeMs, '최소 점유 체류', { min: 0 });
        }
      }
      async function opsRulesAttachVaRuleToSelectedChannel(ruleId, channel) {
        if (!ruleId || !channel?.view) return;
        const view = channel.view;
        const allowedRuleIds = Array.isArray(view.allowedRuleIds) ? [...view.allowedRuleIds].map(String) : [];
        if (!allowedRuleIds.includes(String(ruleId))) {
          allowedRuleIds.push(String(ruleId));
        }
        const allowedOverlayModes = Array.isArray(view.allowedOverlayModes) && view.allowedOverlayModes.length > 0
          ? [...view.allowedOverlayModes]
          : ['raw', 'va-overlay'];
        if (!allowedOverlayModes.includes('va-rule')) {
          allowedOverlayModes.push('va-rule');
        }
        await requestJson(`/ops/api/views/${encodeURIComponent(view.viewId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewId: view.viewId,
            displayName: view.displayName || channel.displayName,
            sourceId: view.sourceId || channel.sourceId,
            defaultRuleId: view.defaultRuleId || String(ruleId),
            allowedRuleIds,
            allowedOverlayModes,
            showDashboard: view.showDashboard !== false,
            showEvents: view.showEvents !== false,
            showMetadataSummary: view.showMetadataSummary !== false,
            clientGroups: Array.isArray(view.clientGroups) ? view.clientGroups : [],
            maxTiles: Number(view.maxTiles || 1),
            enabled: view.enabled !== false
          })
        });
      }
      async function opsRulesDetachVaRuleFromViews(ruleId) {
        const targetId = String(ruleId || '').trim();
        if (!targetId) return;
        for (const view of opsRulesViews) {
          const viewId = String(view?.viewId || '').trim();
          if (!viewId) continue;
          const allowedRuleIds = Array.isArray(view.allowedRuleIds)
            ? view.allowedRuleIds.map(item => String(item || '').trim()).filter(Boolean)
            : [];
          const defaultRuleId = String(view?.defaultRuleId || '').trim();
          if (defaultRuleId !== targetId && !allowedRuleIds.includes(targetId)) continue;
          const nextAllowed = allowedRuleIds.filter(item => item !== targetId);
          const nextDefault = defaultRuleId === targetId ? (nextAllowed[0] || '') : defaultRuleId;
          await requestJson(`/ops/api/views/${encodeURIComponent(viewId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              viewId,
              displayName: view.displayName || viewId,
              sourceId: view.sourceId || '',
              defaultRuleId: nextDefault,
              allowedRuleIds: nextAllowed,
              allowedOverlayModes: Array.isArray(view.allowedOverlayModes) ? view.allowedOverlayModes : ['raw', 'va-overlay', 'va-rule'],
              showDashboard: view.showDashboard !== false,
              showEvents: view.showEvents !== false,
              showMetadataSummary: view.showMetadataSummary !== false,
              clientGroups: Array.isArray(view.clientGroups) ? view.clientGroups : [],
              maxTiles: Number(view.maxTiles || 1),
              enabled: view.enabled !== false
            })
          });
        }
      }
      async function opsRulesSaveNativeRecord(mode) {
        const current = opsRulesCurrentRecord?.item || {};
        if (mode === 'va-rule') {
          const forcedId = String(document.getElementById('opsVaRuleIdInput')?.value || '').trim() || opsRulesNextNumericId(opsCatalogVaRules, 1);
          setOpsGeneratedId('opsVaRuleIdInput', 'opsVaRuleIdDisplay', forcedId);
          const { payload, channel } = opsRulesReadVaRuleForm(current, forcedId);
          const payloadTemplateId = String(payload?.templateStart?.ruleId || '').trim();
          const geometryPoints = Array.isArray(payload?.event?.region?.points) ? payload.event.region.points : [];
          const isLine = String(payload?.event?.region?.type || '') === 'line';
          if (!payload.id) throw new Error('채널 분석 설정 ID가 필요합니다.');
          if (!String(payload.name || '').trim()) throw new Error('채널 분석 설정 이름을 입력하세요.');
          if (!channel) throw new Error('채널을 선택하세요.');
          if (!channel.view) throw new Error('선택한 채널에 PublishedView가 없어 저장할 수 없습니다. 채널 탭에서 채널을 다시 저장하세요.');
          if (!String(payload.analysis?.profileId || '').trim()) throw new Error('분석 프로파일을 선택하세요.');
          if (!payloadTemplateId) {
            throw new Error('이벤트 템플릿을 선택하세요.');
          }
          if (geometryPoints.length < (isLine ? 2 : 3)) {
            throw new Error(isLine ? '라인 좌표는 2점 이상 필요합니다.' : '영역 좌표는 3점 이상 필요합니다.');
          }
          const blockingIssues = opsRulesDraftBlockingIssues(mode, payload, current, channel);
          if (blockingIssues.length) throw new Error(`저장 전 검증 실패: ${blockingIssues.join(' / ')}`);
          const response = await requestJson(`${opsLabVaRulesPath}/${encodeURIComponent(payload.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          await opsRulesAttachVaRuleToSelectedChannel(payload.id, channel);
          await recordOpsAudit({
            area: 'rules',
            action: current?.id ? 'update' : 'create',
            target: `va-rule:${payload.id}`,
            before: current?.id ? current : null,
            after: payload
          });
          renderOpsAuditTrail('ops-rules-audit-list', 'rules');
          return String(response?.vaRule?.id || payload.id);
        }
        if (mode === 'event-rule') {
          const forcedId = String(document.getElementById('opsEventRuleIdInput')?.value || '').trim() || opsRulesNextNumericId(opsCatalogEventTemplates, 1);
          setOpsGeneratedId('opsEventRuleIdInput', 'opsEventRuleIdDisplay', forcedId);
          const payload = opsRulesReadEventTemplateForm(current, forcedId);
          if (!payload.id) throw new Error('이벤트 템플릿 ID가 필요합니다.');
          if (!opsRulesEventTypeForItem(payload)) throw new Error('이벤트/시나리오 종류를 선택하세요.');
          if (!Array.isArray(payload.analysis?.classes) || payload.analysis.classes.length === 0) {
            throw new Error('분석 대상을 하나 이상 선택하세요.');
          }
          opsRulesValidateEventTemplatePayload(payload);
          const blockingIssues = opsRulesDraftBlockingIssues(mode, payload, current);
          if (blockingIssues.length) throw new Error(`저장 전 검증 실패: ${blockingIssues.join(' / ')}`);
          const response = await requestJson(`${opsLabRulesPath}/${encodeURIComponent(payload.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          await recordOpsAudit({
            area: 'rules',
            action: current?.id ? 'update' : 'create',
            target: `event-template:${payload.id}`,
            before: current?.id ? current : null,
            after: payload
          });
          renderOpsAuditTrail('ops-rules-audit-list', 'rules');
          return String(response?.rule?.id || payload.id);
        }
        if (mode === 'profile') {
          const payload = opsRulesReadProfileForm(current);
          if (!payload.id) {
            payload.id = opsRulesNextProfileId();
            setOpsGeneratedId('opsProfileIdInput', 'opsProfileIdDisplay', payload.id);
          }
          if (!payload.id) throw new Error('분석 프로파일 ID가 필요합니다.');
          if (!Number.isFinite(payload.fps) || payload.fps <= 0) throw new Error('분석 FPS는 1 이상이어야 합니다.');
          if (!Number.isFinite(payload.maxQueue) || payload.maxQueue <= 0) throw new Error('분석 Queue는 1 이상이어야 합니다.');
          if (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1) throw new Error('Confidence는 0 이상 1 이하이어야 합니다.');
          if (!Number.isFinite(payload.nms) || payload.nms < 0 || payload.nms > 1) throw new Error('NMS는 0 이상 1 이하이어야 합니다.');
          if (!Number.isFinite(payload.inputWidth) || !Number.isFinite(payload.inputHeight) || payload.inputWidth <= 0 || payload.inputHeight <= 0) {
            throw new Error('입력 해상도는 1 이상이어야 합니다.');
          }
          if (!Array.isArray(payload.trackingClasses) || payload.trackingClasses.length === 0) {
            throw new Error('추적 대상을 하나 이상 선택하세요.');
          }
          const blockingIssues = opsRulesDraftBlockingIssues(mode, payload, current);
          if (blockingIssues.length) throw new Error(`저장 전 검증 실패: ${blockingIssues.join(' / ')}`);
          const response = await requestJson(`${opsLabProfilesPath}/${encodeURIComponent(payload.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          await recordOpsAudit({
            area: 'rules',
            action: current?.id || current?.profileId ? 'update' : 'create',
            target: `profile:${payload.id}`,
            before: current?.id || current?.profileId ? current : null,
            after: payload
          });
          renderOpsAuditTrail('ops-rules-audit-list', 'rules');
          return String(response?.profile?.id || payload.id);
        }
        throw new Error('저장할 룰 종류를 찾지 못했습니다.');
      }
      async function openOpsRulesEditor(mode, detailMode = 'new', recordId = '') {
        try {
          setOpsRulesCatalogVisibility(mode);
          setOpsRulesEditorModeButtons(mode);
          const item = opsRulesNativeRecord(mode, detailMode, recordId);
          if (!item) {
            throw new Error('선택한 항목을 불러오지 못했습니다.');
          }
          opsRulesCurrentRecord = { mode, detailMode, item: opsRulesClone(item) };
          opsRulesShowNativeForm(mode);
          opsRulesPopulateFormOptions();
          opsRulesFillNativeForm(mode, opsRulesCurrentRecord.item, detailMode);
          setOpsRulesComposer(mode, detailMode, item.id || recordId);
          opsRulesEditorStatus('', false);
          document.getElementById('opsRulesDetailPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
          closeOpsRulesEditor();
          opsRulesEditorStatus(`룰 편집기 로드 실패: ${error.message}`, true);
        }
      }
      async function openOpsVaRuleCreateWhenReady() {
        const readiness = opsRulesVaRuleReadiness();
        if (!readiness.ready) {
          opsRulesEditorStatus(readiness.message, true);
          showToast(readiness.message, true);
          document.getElementById('opsRulesPrereqSummary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        await openOpsRulesEditor('va-rule', 'new');
      }
      async function selectOpsRulesMode(mode) {
        const nextMode = opsRulesModeConfig(mode) ? mode : 'va-rule';
        if (opsRulesDetailMode !== 'closed' && opsRulesActiveMode !== nextMode) {
          await closeOpsRulesEditor();
        }
        setOpsRulesCatalogVisibility(nextMode);
        setOpsRulesEditorModeButtons(nextMode);
      }
      function resetOpsRulesEditorState() {
        opsRulesCurrentRecord = null;
        opsVaRuleTemplateId = '';
        opsRulesShowNativeForm('');
        setOpsRulesComposer('', 'closed');
        setOpsRulesEditorModeButtons(opsRulesActiveMode);
        opsRulesEditorStatus('', false);
      }
      async function closeOpsRulesEditor() {
        resetOpsRulesEditorState();
        await stopOpsVaRulePreview({ preserveView: false }).catch(() => {});
      }
      function wireOpsRulesShellClose() {
        return;
      }
      async function editCurrentOpsRulesRecord() {
        const mode = opsRulesCurrentRecord?.mode || opsRulesActiveMode;
        const recordId = opsRulesDetailRecordId || opsRulesCurrentRecord?.item?.id || '';
        await openOpsRulesEditor(mode, 'edit', recordId);
      }
      async function triggerOpsRulesSave() {
        const mode = opsRulesCurrentRecord?.mode || opsRulesActiveMode;
        if (!opsRulesModeConfig(mode)) return;
        try {
          const savedId = await opsRulesSaveNativeRecord(mode);
          await refreshRules();
          await openOpsRulesEditor(mode, 'view', savedId);
        } catch (error) {
          setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true });
        }
      }
      const opsRulesSearchTerm = () => {
        const inputValue = String(document.getElementById('opsRulesFilterInput')?.value || '').trim();
        const hashValue = String(opsHashParams().get('q') || '').trim();
        return (inputValue || hashValue).toLowerCase();
      };
      const opsRuleEventTypeLabel = (value) => {
        const type = String(value || '').trim();
        if (type === 'intrusion-dwell') return '침입 후 체류';
        if (type === 're-entry') return '재진입';
        if (type === 'wrong-direction') return '역방향 이동';
        if (type === 'intrusion-after-line-crossing') return '라인 통과 후 영역 침입';
        if (type === 'loitering') return '배회';
        if (type === 'zone-occupancy') return '영역 점유';
        if (type === 'presence') return '감지';
        if (type === 'enter') return '진입';
        if (type === 'exit') return '이탈';
        if (type === 'line-crossing') return '라인 통과';
        return type || '이벤트';
      };
      const opsRuleSearchableText = item => {
        const analysis = item?.analysis || {};
        const source = item?.source || {};
        const eventName = item?.scenario?.type || item?.scenario?.name || item?.event?.type || item?.eventType || '';
        return [
          item?.id,
          item?.ruleId,
          item?.profileId,
          item?.name,
          source?.sourceId,
          source?.displayName,
          source?.file,
          source?.url,
          source?.rtspUrl,
          source?.whepUrl,
          source?.httpUrl,
          item?.templateStart?.ruleId,
          analysis?.profileId,
          analysis?.detector,
          analysis?.trackingPolicy?.tracker,
          analysis?.trackingPolicy?.reid,
          eventName,
          ...(Array.isArray(analysis?.classes) ? analysis.classes : [])
        ].filter(Boolean).join(' ').toLowerCase();
      };
      function opsRulesStatusBadge(enabled) {
        const tone = enabled === false ? ' warn' : '';
        const text = enabled === false ? '비활성' : '활성';
        return `<span class="chip ops-rules-status-chip${tone}" style="display:inline-block;min-width:64px;padding:4px 12px;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;text-align:center;">${escapeHtml(text)}</span>`;
      }
      function opsRuleActionButton(label, action, id, tone = 'secondary') {
        const classes = tone === 'danger'
          ? 'danger button-compact'
          : 'button-secondary button-compact';
        return `<button type="button" class="${classes}" data-ops-rule-action="${escapeHtml(action)}" data-ops-rule-id="${escapeHtml(String(id || ''))}">${escapeHtml(label)}</button>`;
      }
      function opsRuleActionButtons(actions) {
        const normalized = actions.map(action => String(action || '').trim()).filter(Boolean);
        return opsContextActionsHtml(normalized[0] || '', normalized.slice(1).join(''), 'ops-rule-row-actions', '추가 작업');
      }
      function opsRulesMsLabel(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return '';
        if (numeric % 1000 === 0) {
          return `${Math.round(numeric / 1000)}초`;
        }
        return `${numeric}ms`;
      }
      function opsRulesSourceKindLabel(kind) {
        const value = String(kind || '').trim();
        if (value === '*' || !value) return '전체 입력';
        if (value === 'onvif') return 'ONVIF';
        if (value === 'file') return '파일';
        if (value === 'rtsp') return 'RTSP';
        if (value === 'whep') return 'WHEP';
        if (value === 'webrtc') return 'Published WebRTC';
        if (value === 'http' || value === 'hls') return 'HTTP/HLS';
        if (value === 'youtube') return 'YouTube';
        return value;
      }
      function opsRulesRtspHost() {
        let host = window.location.hostname || '127.0.0.1';
        if (host === 'localhost') host = '127.0.0.1';
        return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
      }
      async function opsRulesCopyText(value) {
        const text = String(value || '').trim();
        if (!text) throw new Error('복사할 값이 없습니다.');
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
        throw clipboardError || new Error('클립보드 복사 실패');
      }
      function opsRulesCurrentVaOutputContext() {
        const channel = opsRulesFindChannelById(document.getElementById('opsVaRuleChannelSelect')?.value || '')
          || opsRulesFindChannelForVaRule(opsRulesCurrentRecord?.item || {});
        const ruleId = String(document.getElementById('opsVaRuleIdInput')?.value || opsRulesCurrentRecord?.item?.id || '').trim();
        const viewId = String(channel?.view?.viewId || channel?.sourceId || '').trim();
        return { channel, ruleId, viewId };
      }
      function opsRulesCurrentVaPreviewViewId() {
        const { channel } = opsRulesCurrentVaOutputContext();
        return String(channel?.view?.viewId || '').trim();
      }
      function updateOpsVaRulePreviewUi() {
        const startBtn = document.getElementById('opsVaRulePreviewStartBtn');
        const restartBtn = document.getElementById('opsVaRulePreviewRestartBtn');
        const stopBtn = document.getElementById('opsVaRulePreviewStopBtn');
        const summary = document.getElementById('opsVaRulePreviewSummary');
        const placeholder = document.getElementById('opsVaRulePreviewPlaceholder');
        const viewId = opsRulesCurrentVaPreviewViewId();
        const currentChannel = opsRulesCurrentVaOutputContext().channel;
        const channelLabel = currentChannel ? opsRulesChannelOptionLabel(currentChannel) : '';
        const hasSession = Boolean(opsVaRulePreviewState.sessionId);
        const operationInFlight = Boolean(opsVaRulePreviewState.operationInFlight);
        if (summary) {
          if (!viewId) {
            summary.textContent = 'PublishedView가 있는 채널을 골라야 미리보기를 열 수 있습니다.';
          } else if (operationInFlight) {
            summary.textContent = `${channelLabel || viewId} 미리보기 연결을 처리하고 있습니다.`;
          } else if (hasSession) {
            summary.textContent = `${channelLabel || viewId} 미리보기를 보고 있습니다. 필요할 때 정지하거나 다시 연결할 수 있습니다.`;
          } else {
            summary.textContent = `${channelLabel || viewId} 영상을 재생해 영역/라인 기준을 확인할 수 있습니다.`;
          }
        }
        if (placeholder) {
          placeholder.hidden = hasSession && !operationInFlight;
          placeholder.textContent = opsVaRulePreviewState.lastError || (viewId ? '재생 버튼으로 채널 영상을 확인하세요.' : '채널을 먼저 고르세요.');
        }
        if (startBtn) startBtn.disabled = !viewId || hasSession || operationInFlight;
        if (restartBtn) restartBtn.disabled = !viewId || operationInFlight;
        if (stopBtn) stopBtn.disabled = !hasSession || operationInFlight;
      }
      async function stopOpsVaRulePreview(options = {}) {
        if (opsVaRulePreviewState.iceTimer) {
          clearInterval(opsVaRulePreviewState.iceTimer);
          opsVaRulePreviewState.iceTimer = null;
        }
        if (opsVaRulePreviewState.pc) {
          try { opsVaRulePreviewState.pc.close(); } catch {}
        }
        opsVaRulePreviewState.pc = null;
        const video = document.getElementById('opsVaRulePreviewVideo');
        if (video?.srcObject) {
          for (const track of video.srcObject.getTracks()) track.stop();
          video.srcObject = null;
        }
        const sessionId = opsVaRulePreviewState.sessionId;
        const viewId = opsVaRulePreviewState.viewId;
        opsVaRulePreviewState.sessionId = '';
        if (sessionId && viewId) {
          await fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
            keepalive: Boolean(options.keepalive)
          }).catch(() => {});
        }
        if (!options.keepError) opsVaRulePreviewState.lastError = '';
        if (!options.preserveView) opsVaRulePreviewState.viewId = '';
        opsVaRulePreviewState.status = 'idle';
        opsVaRulePreviewState.connectionStatus = 'idle';
        updateOpsVaRulePreviewUi();
      }
      async function pollOpsVaRulePreviewIce() {
        if (!opsVaRulePreviewState.viewId || !opsVaRulePreviewState.sessionId || !opsVaRulePreviewState.pc) return;
        const response = await fetch(`/client/api/views/${encodeURIComponent(opsVaRulePreviewState.viewId)}/webrtc/session/${encodeURIComponent(opsVaRulePreviewState.sessionId)}/ice`).catch(() => null);
        if (!response || !response.ok) return;
        const payload = await response.json().catch(() => ({}));
        for (const item of payload.candidates || []) {
          try { await opsVaRulePreviewState.pc.addIceCandidate(item); } catch {}
        }
      }
      async function loadOpsWebRtcConfig() {
        if (!opsWebRtcConfigPromise) {
          opsWebRtcConfigPromise = fetch('/webrtc/config', {
            cache: 'no-store',
            credentials: 'same-origin'
          }).then(async response => {
            if (!response.ok) throw new Error(`/webrtc/config HTTP ${response.status}`);
            return response.json();
          });
        }
        return opsWebRtcConfigPromise;
      }
      function opsPeerConnectionConfigFromPayload(payload) {
        const raw = payload && payload.peerConnectionConfig && typeof payload.peerConnectionConfig === 'object'
          ? payload.peerConnectionConfig
          : {};
        const config = {};
        if (Array.isArray(raw.iceServers)) {
          config.iceServers = raw.iceServers;
        }
        if (raw.iceTransportPolicy === 'relay' || raw.iceTransportPolicy === 'all') {
          config.iceTransportPolicy = raw.iceTransportPolicy;
        }
        return config;
      }
      async function createOpsVaRulePeerConnection() {
        try {
          return new RTCPeerConnection(opsPeerConnectionConfigFromPayload(await loadOpsWebRtcConfig()));
        } catch (error) {
          console.warn('Ops rule preview ICE config fallback', error);
          return new RTCPeerConnection();
        }
      }
      async function startOpsVaRulePreview(options = {}) {
        if (opsVaRulePreviewState.operationInFlight) {
          updateOpsVaRulePreviewUi();
          return;
        }
        const viewId = opsRulesCurrentVaPreviewViewId();
        if (!viewId) {
          updateOpsVaRulePreviewUi();
          return;
        }
        opsVaRulePreviewState.operationInFlight = true;
        try {
          if (opsVaRulePreviewState.sessionId && opsVaRulePreviewState.viewId !== viewId) {
            await stopOpsVaRulePreview({ preserveView: false });
          } else if (opsVaRulePreviewState.sessionId) {
            await stopOpsVaRulePreview({ preserveView: true });
          }
          opsVaRulePreviewState.viewId = viewId;
          opsVaRulePreviewState.lastError = '';
          opsVaRulePreviewState.status = options.restart ? 'reconnecting' : 'connecting';
          opsVaRulePreviewState.connectionStatus = 'connecting';
          updateOpsVaRulePreviewUi();
          const pc = await createOpsVaRulePeerConnection();
          opsVaRulePreviewState.pc = pc;
          pc.onconnectionstatechange = () => {
            opsVaRulePreviewState.connectionStatus = pc.connectionState || 'connecting';
            updateOpsVaRulePreviewUi();
          };
          pc.oniceconnectionstatechange = () => {
            opsVaRulePreviewState.connectionStatus = pc.iceConnectionState || opsVaRulePreviewState.connectionStatus;
            updateOpsVaRulePreviewUi();
          };
          pc.ontrack = event => {
            const video = document.getElementById('opsVaRulePreviewVideo');
            if (video) {
              video.srcObject = event.streams[0] || new MediaStream([event.track]);
              video.muted = true;
              const play = video.play();
              if (play && typeof play.catch === 'function') play.catch(() => {});
            }
            opsVaRulePreviewState.status = 'live';
            updateOpsVaRulePreviewUi();
          };
          pc.onicecandidate = event => {
            if (!opsVaRulePreviewState.sessionId || !event.candidate) return;
            fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(opsVaRulePreviewState.sessionId)}/ice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                candidate: event.candidate.candidate
              })
            }).catch(() => {});
          };
          const response = await fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              overlayMode: allowedOverlayModes(opsRulesCurrentVaOutputContext().channel?.view || {}).includes('va-overlay')
                ? 'va-overlay'
                : 'raw',
              labelLang: window.MediaServerUi?.currentLanguage?.() || 'ko'
            })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          opsVaRulePreviewState.sessionId = payload.sessionId || '';
          if (!opsVaRulePreviewState.sessionId || !payload.offer) throw new Error('session offer missing');
          await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(opsVaRulePreviewState.sessionId)}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: answer.sdp
          });
          opsVaRulePreviewState.iceTimer = setInterval(() => pollOpsVaRulePreviewIce().catch(() => {}), 1000);
          updateOpsVaRulePreviewUi();
        } catch (error) {
          opsVaRulePreviewState.lastError = error.message || 'preview start failed';
          await stopOpsVaRulePreview({ keepError: true, preserveView: true });
        } finally {
          opsVaRulePreviewState.operationInFlight = false;
          updateOpsVaRulePreviewUi();
        }
      }
      function opsRulesVaOutputUrl(kind, ruleId = '', viewId = '') {
        if (!ruleId) return '';
        if (kind === 'rtsp') {
          return `rtsp://${opsRulesRtspHost()}:${opsRtspPort}/${encodeURIComponent(opsStreamRoute)}?vaRule=${encodeURIComponent(ruleId)}`;
        }
        if (kind === 'whep') {
          const url = new URL('/whep', window.location.origin);
          url.searchParams.set('vaRule', ruleId);
          return url.toString();
        }
        if (kind === 'client' && viewId) {
          const hash = new URLSearchParams();
          hash.set('view', viewId);
          hash.set('mode', 'va-rule');
          hash.set('rule', ruleId);
          return `${window.location.origin}/client/live#${hash.toString()}`;
        }
        return '';
      }
      async function opsRulesCopyVaOutput(kind, ruleId = '', viewId = '') {
        const url = opsRulesVaOutputUrl(kind, ruleId, viewId);
        if (!url) {
          throw new Error(kind === 'client' ? 'PublishedView가 있어야 WebRTC 경로를 복사할 수 있습니다.' : '채널 분석 설정 ID를 정한 뒤 복사할 수 있습니다.');
        }
        await opsRulesCopyText(url);
        opsRulesEditorStatus('', false);
        showToast(`${kind === 'client' ? 'WebRTC' : kind.toUpperCase()} URL 복사 완료`);
      }
      function wireOpsRulesNavLinks() {
        return;
      }
      function opsRuleSourceHtml(source) {
        if (!source || typeof source !== 'object') {
          return `<div class="ops-rule-value-stack"><strong>미제공</strong></div>`;
        }
        if (source.kind === 'file') {
          return `<div class="ops-rule-value-stack"><strong>파일</strong><span class="ops-rule-note">${escapeHtml(display(source.file))}</span></div>`;
        }
        if (opsRulesHasSourceTag(source, 'onvif')) {
          return `<div class="ops-rule-value-stack"><strong>ONVIF</strong><span class="ops-rule-note">${escapeHtml(display(source.rtspUrl || source.httpUrl || source.url))}</span></div>`;
        }
        if (source.kind === 'webrtc') {
          return `<div class="ops-rule-value-stack"><strong>Published WebRTC</strong><span class="ops-rule-note">${escapeHtml(display(source.webrtcSourceId || source.sourceId))}</span></div>`;
        }
        if (source.kind === 'whep') {
          return `<div class="ops-rule-value-stack"><strong>외부 WHEP</strong><span class="ops-rule-note">${escapeHtml(display(source.whepUrl || source.url))}</span></div>`;
        }
        if (source.url) {
          return `<div class="ops-rule-value-stack"><strong>${escapeHtml(display(source.kind))}</strong><span class="ops-rule-note">${escapeHtml(display(source.url))}</span></div>`;
        }
        return `<div class="ops-rule-value-stack"><strong>${escapeHtml(display(source.kind))}</strong></div>`;
      }
      function opsRulesVaRuleChannelHtml(item) {
        const channel = opsRulesFindChannelForVaRule(item);
        if (channel) {
          const kind = channel?.source ? opsRulesDisplayKindForSource(channel.source) : '입력';
          const detail = opsRulesSourceDetailLabel(channel.source);
          return `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(display(channel.displayName))}</strong>
            <span class="ops-rule-note">${escapeHtml(kind)}</span>
            ${detail ? `<span class="ops-rule-note">${escapeHtml(detail)}</span>` : ''}
          </div>`;
        }
        return opsRuleSourceHtml(item?.source);
      }
      function opsRulesVaRuleTemplateHtml(item) {
        const meta = opsVaRuleStartMeta(item);
        if (!meta.templateRuleId) {
          return `<div class="ops-rule-value-stack">
            <strong>저장 불가</strong>
            <span class="ops-rule-note">이벤트 템플릿 누락</span>
          </div>`;
        }
        const template = findOpsEventTemplateById(meta.templateRuleId);
        const eventType = template?.scenario?.type || template?.event?.type || item?.scenario?.type || item?.event?.type || 'event';
        return `<div class="ops-rule-value-stack">
          <span class="table-identity-pill table-identity-template">${escapeHtml(opsRulesIdText(display(meta.templateRuleId)))}</span>
          <span class="ops-rule-note">${escapeHtml(`${opsRuleEventTypeLabel(eventType)}${meta.inferred ? ' · 추정' : ''}`)}</span>
        </div>`;
      }
      function opsRulesVaRuleProfileHtml(item) {
        const analysis = item?.analysis || {};
        const profileId = String(analysis.profileId || item?.profileId || '1').trim() || '1';
        const profile = findOpsProfileById(profileId) || {};
        const name = String(profile.displayName || profile.name || '').trim();
        const detector = String(profile.detector || '').trim();
        const fps = Number(profile.fps);
        const details = [];
        if (detector) details.push(detector);
        if (Number.isFinite(fps) && fps > 0) details.push(`${fps}fps`);
        return `<div class="ops-rule-value-stack">
          <span class="table-identity-pill table-identity-profile">${escapeHtml(opsRulesIdText(display(profileId)))}</span>
          <span class="ops-rule-note">${escapeHtml(name || details.join(' · ') || '기본 프로파일')}</span>
        </div>`;
      }
      function opsRulesGeometryHtml(item) {
        const region = item?.event?.region || {};
        const points = Array.isArray(region?.points) ? region.points.filter(point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))) : [];
        const type = String(region?.type || '').trim();
        if (type === 'line') {
          const direction = region?.direction === 'forward'
            ? '정방향'
            : (region?.direction === 'reverse' ? '역방향' : '양방향');
          return `<div class="ops-rule-value-stack">
            <strong>라인</strong>
            <span class="ops-rule-note">${escapeHtml(`${Math.max(points.length, 2)}점 · ${direction}`)}</span>
          </div>`;
        }
        if (type === 'polygon') {
          return `<div class="ops-rule-value-stack">
            <strong>영역</strong>
            <span class="ops-rule-note">${escapeHtml(`${Math.max(points.length, 3)}점`)}</span>
          </div>`;
        }
        return `<div class="ops-rule-value-stack"><strong>미설정</strong></div>`;
      }
      function opsRulesVaOutputButtonsHtml(item) {
        const channel = opsRulesFindChannelForVaRule(item);
        const ruleId = String(item?.id || '').trim();
        const viewId = String(channel?.view?.viewId || '').trim();
        const isOnvif = opsRulesHasSourceTag(channel?.source, 'onvif');
        const prefix = isOnvif ? 'ONVIF ' : '';
        return opsRowActionsHtml(`
          <button type="button" class="secondary" data-ops-rule-copy-kind="rtsp" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="${prefix}이 채널 분석 설정의 RTSP URL 복사" aria-label="${prefix}이 채널 분석 설정의 RTSP URL 복사">${isOnvif ? 'ONVIF RTSP' : 'RTSP'}</button>
          <button type="button" class="secondary" data-ops-rule-copy-kind="whep" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="${prefix}이 채널 분석 설정의 WHEP URL 복사" aria-label="${prefix}이 채널 분석 설정의 WHEP URL 복사">${isOnvif ? 'ONVIF WHEP' : 'WHEP'}</button>
          <button type="button" class="secondary" data-ops-rule-copy-kind="client" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="${prefix}이 채널 분석 설정의 WebRTC 링크 복사" aria-label="${prefix}이 채널 분석 설정의 WebRTC 링크 복사"${viewId ? '' : ' disabled'}>WebRTC</button>
        `, 'ops-stream-actions channel-stream-actions');
      }
      function opsRulesEventSummaryHtml(item = {}) {
        const type = item?.scenario?.type || item?.event?.type || item?.eventType || 'event';
        return `<div class="ops-rule-value-stack">
          <strong>${escapeHtml(opsRuleEventTypeLabel(type))}</strong>
        </div>`;
      }
      function opsRulesEventModeHtml(item = {}) {
        const type = item?.scenario?.type || item?.event?.type || item?.eventType || '';
        const isScenario = Boolean(item?.scenario) || opsRulesIsScenarioType(type);
        return `<div class="ops-rule-value-stack">
          <span class="chip${isScenario ? ' info' : ''}">${isScenario ? '시나리오' : '이벤트'}</span>
        </div>`;
      }
      function opsRulesZoneIdSummary(value = []) {
        const ids = opsRulesStringArray(value);
        if (ids.length === 0) return '';
        const preview = ids.slice(0, 3).join(', ');
        return ids.length > 3 ? `${preview} 외 ${ids.length - 3}` : preview;
      }
      function opsRulesConditionHtml(item = {}) {
        const type = item?.scenario?.type || item?.event?.type || item?.eventType || 'event';
        const scenario = item?.scenario || {};
        const details = [];
        if (type === 'intrusion-dwell') {
          const candidate = opsRulesMsLabel(scenario?.candidateTimeMs);
          const dwell = opsRulesMsLabel(scenario?.dwellTimeMs);
          if (candidate) details.push(`후보 ${candidate}`);
          if (dwell) details.push(`확정 ${dwell}`);
        } else if (type === 're-entry') {
          const windowLabel = opsRulesMsLabel(scenario?.reEntryWindowMs);
          if (windowLabel) details.push(`window ${windowLabel}`);
          if (scenario?.reEntryMode) {
            details.push(scenario.reEntryMode === 'configured-zones' ? '지정 영역' : '같은 영역');
          }
          const zones = opsRulesZoneIdSummary(scenario?.reEntryZoneIds || []);
          if (zones) details.push(`재진입 ${zones}`);
        } else if (type === 'intrusion-after-line-crossing') {
          const delay = opsRulesMsLabel(scenario?.maxDelayAfterCrossingMs);
          const dwell = opsRulesMsLabel(scenario?.dwellTimeMs);
          const direction = scenario?.triggerLine?.direction || 'any';
          if (delay) details.push(`라인 후 ${delay}`);
          if (dwell) details.push(`체류 ${dwell}`);
          details.push(direction === 'forward' ? '정방향' : (direction === 'reverse' ? '역방향' : '양방향'));
          const zones = opsRulesZoneIdSummary(scenario?.targetZoneIds || []);
          if (zones) details.push(`대상 ${zones}`);
        } else if (type === 'loitering') {
          const dwell = opsRulesMsLabel(scenario?.minDwellTimeMs);
          if (dwell) details.push(`체류 ${dwell}`);
          if (Number.isFinite(Number(scenario?.maxMovementRadius))) {
            details.push(`반경 ${Number(scenario.maxMovementRadius).toFixed(2)}`);
          }
          if (scenario?.useGroundPlaneMovementRadius) details.push('ground-plane');
          const zones = opsRulesZoneIdSummary(scenario?.restrictedZoneIds || []);
          if (zones) details.push(`영역 ${zones}`);
        } else if (type === 'zone-occupancy') {
          if (Number.isFinite(Number(scenario?.occupancyThreshold))) {
            details.push(`임계 ${Number(scenario.occupancyThreshold)}`);
          }
          const dwell = opsRulesMsLabel(scenario?.minDwellTimeMs);
          if (dwell) details.push(`체류 ${dwell}`);
          const zones = opsRulesZoneIdSummary(scenario?.restrictedZoneIds || []);
          if (zones) details.push(`영역 ${zones}`);
        } else if (opsRulesIsLineEventType(type)) {
          const direction = item?.event?.region?.direction || 'any';
          details.push(direction === 'forward' ? '정방향' : (direction === 'reverse' ? '역방향' : '양방향'));
        }
        const cooldown = opsRulesMsLabel(scenario?.cooldownMs);
        if (cooldown) details.push(`재알림 ${cooldown}`);
        return `<div class="ops-rule-value-stack">
          <span class="ops-rule-note">${escapeHtml(details.join(' · ') || '기본 이벤트')}</span>
        </div>`;
      }
      function opsRulesTargetHtml(classes = []) {
        return `<div class="ops-rule-value-stack">
          <strong>${escapeHtml(opsRulesCompactCategoryText(classes))}</strong>
          <span class="ops-rule-note">${escapeHtml(opsRulesCategorySummaryText(classes, '미설정'))}</span>
        </div>`;
      }
      function renderOpsVaRules(items) {
        const body = document.getElementById('opsVaRuleRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 9, '저장된 채널 분석 설정이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const id = String(item?.id || '');
          const statusHtml = opsRulesStatusBadge(item?.enabled !== false);
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-va', id),
            opsRuleActionButton('삭제', 'delete-va', id, 'danger')
          ]);
          const statusCellHtml = opsRowActionsHtml(statusHtml, 'ops-rule-status-actions');
          return opsTableRowHtml([
            tableCellHtml('ID', opsRulesIdentityBadgeHtml('id', itemId(item))),
            tableCellHtml('채널', opsRulesVaRuleChannelHtml(item)),
            tableCellHtml('이벤트 템플릿', opsRulesVaRuleTemplateHtml(item)),
            tableCellHtml('프로파일', opsRulesVaRuleProfileHtml(item)),
            tableCellHtml('Tracker/Re-ID', opsRulesTrackingPolicyHtml(item)),
            tableCellHtml('영역/라인', opsRulesGeometryHtml(item)),
            tableCellHtml('출력', opsRulesVaOutputButtonsHtml(item)),
            tableCellHtml('상태', statusCellHtml, 'table-cell-nowrap table-cell-status'),
            tableCellHtml('작업', actionsHtml, 'table-cell-actions')
          ]);
        }).join('');
      }
      function renderOpsEventRules(items) {
        const body = document.getElementById('opsEventRuleRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 6, '저장된 이벤트 템플릿이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const id = String(item?.id || '');
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-event-template', id),
            opsRuleActionButton('삭제', 'delete-event-template', id, 'danger')
          ]);
          return opsTableRowHtml([
            tableCellHtml('ID', opsRulesIdentityBadgeHtml('template', itemId(item))),
            tableCellHtml('구분', opsRulesEventModeHtml(item)),
            tableCellHtml('종류', opsRulesEventSummaryHtml(item)),
            tableCellHtml('대상', opsRulesTargetHtml(item?.analysis?.classes || item?.scenario?.targetClasses || [])),
            tableCellHtml('조건', opsRulesConditionHtml(item)),
            tableCellHtml('작업', actionsHtml, 'table-cell-actions')
          ]);
        }).join('');
      }
      function opsProfileUsageSummary(profileId) {
        const profileText = String(profileId || '').trim();
        if (!profileText) return '없음';
        let vaRuleCount = 0;
        for (const item of opsCatalogVaRules) {
          if (String(item?.analysis?.profileId || '').trim() === profileText) vaRuleCount += 1;
        }
        if (vaRuleCount === 0) return '없음';
        return `채널 ${vaRuleCount}`;
      }
      function renderOpsProfiles(items) {
        const body = document.getElementById('opsProfileRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 7, '분석 프로파일이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const id = String(item?.id || item?.profileId || '');
          const builtIn = item?.builtIn === true;
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-profile', id),
            builtIn ? '' : opsRuleActionButton('삭제', 'delete-profile', id, 'danger')
          ]);
          const detectorHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(display(item.detector || item.runtime || '미제공'))}</strong>
            ${builtIn ? '<span class="ops-rule-note">기본 프로파일</span>' : '<span class="ops-rule-note">저장 프로파일</span>'}
          </div>`;
          const fpsHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(display(item.fps || item.maxFps || '미제공'))}</strong>
          </div>`;
          const inputSize = `${display(item.inputWidth || 640)}x${display(item.inputHeight || 640)}`;
          const inputNote = `큐 ${display(item.maxQueue ?? 1)} · 신뢰도 ${display(item.confidence ?? 0.25)} · NMS ${display(item.nms ?? 0.45)}`;
          const inputHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(inputSize)}</strong>
            <span class="ops-rule-note">${escapeHtml(inputNote)}</span>
          </div>`;
          const usageHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(opsProfileUsageSummary(id))}</strong>
          </div>`;
          return opsTableRowHtml([
            tableCellHtml('ID', opsRulesIdentityBadgeHtml('profile', itemId(item))),
            tableCellHtml('검출기', detectorHtml),
            tableCellHtml('FPS', fpsHtml),
            tableCellHtml('입력', inputHtml),
            tableCellHtml('추적 대상', opsRulesTargetHtml(opsRulesProfileClasses(item))),
            tableCellHtml('사용처', usageHtml),
            tableCellHtml('작업', actionsHtml, 'table-cell-actions')
          ]);
        }).join('');
      }
      function findOpsVaRuleById(id) {
        return opsCatalogVaRules.find((item) => String(item?.id || '') === String(id || ''));
      }
      function findOpsEventTemplateById(id) {
        return opsCatalogEventTemplates.find((item) => String(item?.id || '') === String(id || ''));
      }
      function findOpsProfileById(id) {
        return [...opsCatalogBuiltInProfiles, ...opsCatalogProfiles]
          .find((item) => String(item?.id || item?.profileId || '') === String(id || ''));
      }
      function opsRulesDuplicateIds(items, idGetter) {
        const seen = new Set();
        const duplicates = new Set();
        for (const item of items || []) {
          const id = String(idGetter(item) || '').trim();
          if (!id) continue;
          if (seen.has(id)) duplicates.add(id);
          seen.add(id);
        }
        return Array.from(duplicates);
      }
      function opsRulesIssue(kind, target, title, detail, severity = 'bad') {
        return { kind, target, title, detail, severity };
      }
      function opsRulesBuildValidationIssues() {
        const issues = [];
        for (const id of opsRulesDuplicateIds(opsCatalogVaRules, item => item?.id)) {
          issues.push(opsRulesIssue('duplicate', `va-rule:${id}`, `중복 채널 분석 설정 ID ${id}`, '저장 전 고유 ID로 바꾸세요.'));
        }
        for (const id of opsRulesDuplicateIds(opsCatalogEventTemplates, item => item?.id)) {
          issues.push(opsRulesIssue('duplicate', `event-template:${id}`, `중복 이벤트 템플릿 ID ${id}`, '템플릿 ID는 중복될 수 없습니다.'));
        }
        for (const id of opsRulesDuplicateIds(opsCatalogProfiles, item => item?.id || item?.profileId)) {
          issues.push(opsRulesIssue('duplicate', `profile:${id}`, `중복 분석 프로파일 ID ${id}`, '프로파일 ID는 중복될 수 없습니다.'));
        }
        for (const rule of opsCatalogVaRules) {
          const id = String(rule?.id || '').trim() || '(미지정)';
          const profileId = String(rule?.analysis?.profileId || '').trim();
          const templateId = String(rule?.templateStart?.ruleId || '').trim();
          const channel = opsRulesFindChannelForVaRule(rule);
          const profile = profileId ? findOpsProfileById(profileId) : null;
          const template = templateId ? findOpsEventTemplateById(templateId) : null;
          if (!profileId) {
            issues.push(opsRulesIssue('missing-profile', `va-rule:${id}`, `채널 분석 설정 ${id}에 프로파일이 없습니다.`, '분석 프로파일을 선택해야 저장/운영할 수 있습니다.'));
          } else if (!profile) {
            issues.push(opsRulesIssue('missing-profile', `va-rule:${id}`, `채널 분석 설정 ${id}의 프로파일 ${profileId}을 찾을 수 없습니다.`, '삭제됐거나 아직 생성되지 않은 프로파일입니다.'));
          } else if (opsRulesDocumentInactive(profile)) {
            issues.push(opsRulesIssue('inactive-profile', `va-rule:${id}`, `채널 분석 설정 ${id}의 프로파일 ${profileId}이 비활성입니다.`, '활성 프로파일을 선택한 뒤 저장하세요.'));
          }
          if (!templateId) {
            issues.push(opsRulesIssue('missing-template', `va-rule:${id}`, `채널 분석 설정 ${id}에 이벤트 템플릿이 없습니다.`, '이벤트 템플릿을 먼저 선택하세요.'));
          } else if (!template) {
            issues.push(opsRulesIssue('missing-template', `va-rule:${id}`, `채널 분석 설정 ${id}의 템플릿 ${templateId}을 찾을 수 없습니다.`, '삭제됐거나 아직 생성되지 않은 템플릿입니다.'));
          } else if (opsRulesDocumentInactive(template)) {
            issues.push(opsRulesIssue('inactive-template', `va-rule:${id}`, `채널 분석 설정 ${id}의 템플릿 ${templateId}이 비활성입니다.`, '활성 이벤트 템플릿을 선택한 뒤 저장하세요.'));
          }
          if (!channel) {
            issues.push(opsRulesIssue('missing-source', `va-rule:${id}`, `채널 분석 설정 ${id}의 소스가 채널 목록에 없습니다.`, '채널 탭에서 소스와 PublishedView를 다시 저장하세요.'));
          } else if (channel.view && !opsRulesSourceMatches(channel.source, rule.source || {})) {
            issues.push(opsRulesIssue('source-mismatch', `va-rule:${id}`, `채널 분석 설정 ${id}의 소스가 PublishedView 소스와 다릅니다.`, `${channel.displayName || channel.id} 채널의 소스와 룰 소스를 맞추세요.`));
          }
          if (channel?.source?.enabled === false) {
            issues.push(opsRulesIssue('inactive-channel', `va-rule:${id}`, `채널 분석 설정 ${id}가 비활성 채널에 연결되어 있습니다.`, `${channel.displayName || channel.id} 채널을 활성화하거나 다른 채널로 연결하세요.`));
          }
          if (channel?.view?.enabled === false) {
            issues.push(opsRulesIssue('inactive-view', `va-rule:${id}`, `채널 분석 설정 ${id}가 비활성 PublishedView에 연결되어 있습니다.`, '채널 탭에서 PublishedView를 활성화한 뒤 저장하세요.'));
          }
          if (channel?.view && !opsRulesViewAllowsVaRuleMode(channel.view)) {
            issues.push(opsRulesIssue('view-mode-not-allowed', `va-rule:${id}`, `PublishedView가 va-rule 모드를 허용하지 않습니다.`, '채널 탭에서 보기 방식에 va-rule을 추가해야 클라이언트 Live에서 사용할 수 있습니다.'));
          }
          if (channel?.view && !opsRulesViewHasClientAccess(channel.view)) {
            issues.push(opsRulesIssue('unauthorized-view', `va-rule:${id}`, `PublishedView가 클라이언트 노출 권한을 모두 닫고 있습니다.`, '대시보드/이벤트/메타데이터 중 최소 하나를 허용한 뷰에 룰을 연결하세요.'));
          }
          if (channel?.view && id !== '(미지정)' && !opsRulesViewAllowsRuleId(channel.view, id)) {
            issues.push(opsRulesIssue('view-rule-not-allowed', `va-rule:${id}`, `PublishedView 허용 룰 목록에 ${id}가 없습니다.`, '채널 탭에서 defaultRuleId/allowedRuleIds를 맞추거나 룰을 다시 연결하세요.'));
          }
          const rawPolicy = rule?.analysis?.trackingPolicy || {};
          const rawPolicyHasTracker = opsRulesTrackingPolicyHasExplicitTracker(rawPolicy);
          const rawTracker = rawPolicyHasTracker ? opsRulesNormalizeTrackerPolicy(rawPolicy.tracker || rawPolicy.trackerPolicy || '') : 'lite';
          const rawReid = opsRulesNormalizeReidPolicy(rawPolicy.reid || rawPolicy.reId || rawPolicy.reID || rawPolicy.reidPolicy || '');
          if (!rawPolicyHasTracker && rawReid !== 'off') {
            issues.push(opsRulesIssue('tracking-policy-conflict', `va-rule:${id}`, `채널 분석 설정 ${id}의 Re-ID 조합이 유효하지 않습니다.`, 'Re-ID assist는 명시적으로 선택한 Tracker와 함께 저장해야 합니다.'));
          } else if (rawTracker === 'none' && rawReid !== 'off') {
            issues.push(opsRulesIssue('tracking-policy-conflict', `va-rule:${id}`, `채널 분석 설정 ${id}의 Re-ID 조합이 유효하지 않습니다.`, 'Tracker를 사용 안 함으로 선택하면 Re-ID는 off여야 합니다.'));
          }
          for (const message of opsRulesClassConflictMessages(rule, template, profile)) {
            issues.push(opsRulesIssue('template-profile-conflict', `va-rule:${id}`, `채널 분석 설정 ${id}의 대상 클래스가 충돌합니다.`, message));
          }
        }
        for (const view of opsRulesViews) {
          const viewId = String(view?.viewId || '').trim();
          const ruleIds = new Set([
            String(view?.defaultRuleId || '').trim(),
            ...(Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds.map(item => String(item || '').trim()) : [])
          ].filter(Boolean));
          for (const ruleId of ruleIds) {
            const rule = findOpsVaRuleById(ruleId);
            if (!rule) {
              issues.push(opsRulesIssue('missing-rule', `view:${viewId}`, `PublishedView ${viewId}가 없는 룰 ${ruleId}을 참조합니다.`, '채널 탭에서 허용 룰 목록을 다시 저장하세요.'));
            }
          }
          if (ruleIds.size > 0 && !opsRulesViewAllowsVaRuleMode(view)) {
            issues.push(opsRulesIssue('view-mode-not-allowed', `view:${viewId}`, `PublishedView ${viewId}가 룰을 참조하지만 va-rule 모드를 허용하지 않습니다.`, '보기 방식과 허용 룰 목록을 함께 저장하세요.'));
          }
          if (ruleIds.size > 0 && !opsRulesViewHasClientAccess(view)) {
            issues.push(opsRulesIssue('unauthorized-view', `view:${viewId}`, `PublishedView ${viewId}가 룰을 참조하지만 클라이언트 노출 권한이 없습니다.`, '대시보드/이벤트/메타데이터 노출 중 최소 하나를 활성화하세요.'));
          }
          const priorityBuckets = new Map();
          for (const ruleId of ruleIds) {
            const rule = findOpsVaRuleById(ruleId);
            if (!rule || rule.enabled === false) continue;
            const priority = opsRulesRulePriority(rule);
            if (!priorityBuckets.has(priority)) priorityBuckets.set(priority, []);
            priorityBuckets.get(priority).push(ruleId);
          }
          for (const [priority, ids] of priorityBuckets.entries()) {
            if (ids.length > 1) {
              issues.push(opsRulesIssue('priority-conflict', `view:${viewId}`, `PublishedView ${viewId}의 룰 priority ${priority}가 중복됩니다.`, `중복 룰: ${ids.join(', ')}. 저장 전 우선순위를 분리하세요.`));
            }
          }
        }
        return issues;
      }
      function opsRulesRenderValidationIssues(issues) {
        const summary = document.getElementById('opsRulesValidationSummary');
        const list = document.getElementById('opsRulesValidationList');
        if (!summary || !list) return;
        list.textContent = '';
        if (!issues.length) {
          summary.textContent = '저장 전 차단 항목이 없습니다.';
          list.innerHTML = '<div class="empty">소스 불일치, 중복 ID, 누락된 프로파일/템플릿, 비활성 채널/뷰, 뷰 권한 충돌이 없습니다.</div>';
          return;
        }
        summary.textContent = `저장 전 확인이 필요한 항목 ${issues.length}개`;
        for (const issue of issues) {
          const item = document.createElement('article');
          item.className = `validation-item ${issue.severity === 'warn' ? 'warn' : 'bad'}`;
          item.innerHTML = `
            <span class="chip ${issue.severity === 'warn' ? 'warn' : 'bad'}">${escapeHtml(issue.kind)}</span>
            <div>
              <strong>${escapeHtml(issue.title)}</strong>
              <p>${escapeHtml(issue.detail || '')}</p>
            </div>`;
          list.appendChild(item);
        }
      }
      function opsRulesDraftBlockingIssues(mode, payload, current = {}, channel = null) {
        const issues = [];
        const id = String(payload?.id || payload?.profileId || '').trim();
        const currentId = String(current?.id || current?.profileId || '').trim();
        if (mode === 'va-rule') {
          const existing = findOpsVaRuleById(id);
          if (existing && id !== currentId) issues.push(`채널 분석 설정 ID ${id}는 이미 사용 중입니다.`);
          const profileId = String(payload?.analysis?.profileId || '').trim();
          const templateId = String(payload?.templateStart?.ruleId || '').trim();
          const profile = profileId ? findOpsProfileById(profileId) : null;
          const template = templateId ? findOpsEventTemplateById(templateId) : null;
          if (!profileId || !profile) issues.push(`분석 프로파일 ${profileId || '(비어 있음)'}을 찾을 수 없습니다.`);
          if (!templateId || !template) issues.push(`이벤트 템플릿 ${templateId || '(비어 있음)'}을 찾을 수 없습니다.`);
          if (profile && opsRulesDocumentInactive(profile)) issues.push(`분석 프로파일 ${profileId}이 비활성입니다.`);
          if (template && opsRulesDocumentInactive(template)) issues.push(`이벤트 템플릿 ${templateId}이 비활성입니다.`);
          if (!channel?.view) issues.push('선택한 채널에 PublishedView가 없습니다.');
          if (channel?.source?.enabled === false) issues.push('비활성 채널에는 룰을 연결할 수 없습니다.');
          if (channel?.view?.enabled === false) issues.push('비활성 PublishedView에는 룰을 연결할 수 없습니다.');
          if (channel?.view && !opsRulesViewHasClientAccess(channel.view)) {
            issues.push('선택한 PublishedView에 클라이언트 노출 권한이 없습니다.');
          }
          issues.push(...opsRulesClassConflictMessages(payload, template, profile));
          if (channel?.source && payload?.source && !opsRulesSourceMatches(channel.source, payload.source)) {
            issues.push('선택한 채널 source와 룰 source가 일치하지 않습니다.');
          }
          const policy = payload?.analysis?.trackingPolicy || {};
          const policyHasTracker = opsRulesTrackingPolicyHasExplicitTracker(policy);
          const tracker = policyHasTracker ? opsRulesNormalizeTrackerPolicy(policy.tracker || policy.trackerPolicy || '') : 'lite';
          const reid = opsRulesNormalizeReidPolicy(policy.reid || policy.reId || policy.reID || policy.reidPolicy || '');
          if (!policyHasTracker && reid !== 'off') {
            issues.push('Re-ID assist는 명시적으로 선택한 Tracker와 함께 저장해야 합니다.');
          } else if (tracker === 'none' && reid !== 'off') {
            issues.push('Tracker를 사용 안 함으로 선택하면 Re-ID는 off여야 합니다.');
          }
          const priority = opsRulesRulePriority(payload);
          const conflictingRule = opsCatalogVaRules.find(rule => {
            const otherId = String(rule?.id || '').trim();
            if (!otherId || otherId === id || rule?.enabled === false) return false;
            return opsRulesRulePriority(rule) === priority && channel?.source && opsRulesSourceMatches(channel.source, rule.source || {});
          });
          if (conflictingRule) {
            issues.push(`같은 채널에 priority ${priority}인 룰 ${conflictingRule.id}가 이미 있습니다.`);
          }
        } else if (mode === 'event-rule') {
          const existing = findOpsEventTemplateById(id);
          if (existing && id !== currentId) issues.push(`이벤트 템플릿 ID ${id}는 이미 사용 중입니다.`);
        } else if (mode === 'profile') {
          const existing = findOpsProfileById(id);
          if (existing && id !== currentId) issues.push(`분석 프로파일 ID ${id}는 이미 사용 중입니다.`);
          if (!String(payload?.detector || '').trim()) issues.push('분석 프로파일 detector가 비어 있습니다.');
        }
        return issues;
      }
      async function openOpsVaRuleRecord(id, detailMode = 'view') {
        if (!findOpsVaRuleById(id)) {
          opsRulesEditorStatus('선택한 채널 분석 설정을 불러오지 못했습니다.', true);
          return;
        }
        await openOpsRulesEditor('va-rule', detailMode, id);
        opsRulesEditorStatus(`채널 분석 설정 ${opsRulesIdText(id)}을 불러왔습니다.`, false);
      }
      async function openOpsEventTemplateRecord(id, detailMode = 'view') {
        if (!findOpsEventTemplateById(id)) {
          opsRulesEditorStatus('선택한 이벤트 템플릿을 불러오지 못했습니다.', true);
          return;
        }
        await openOpsRulesEditor('event-rule', detailMode, id);
        opsRulesEditorStatus(`이벤트 템플릿 ${opsRulesIdText(id)}을 불러왔습니다.`, false);
      }
      async function openOpsProfileRecord(id, detailMode = 'view') {
        if (!findOpsProfileById(id)) {
          opsRulesEditorStatus('선택한 분석 프로파일을 불러오지 못했습니다.', true);
          return;
        }
        await openOpsRulesEditor('profile', detailMode, id);
        opsRulesEditorStatus(`분석 프로파일 '${id}'를 불러왔습니다.`, false);
      }
      async function deleteOpsVaRuleRecord(id) {
        const item = findOpsVaRuleById(id);
        if (!item) {
          opsRulesEditorStatus('삭제할 채널 분석 설정을 찾지 못했습니다.', true);
          return;
        }
        const name = item?.name ? ` '${item.name}'` : '';
        if (!opsRulesConfirmDangerAction(`delete-va-rule:${id}`, `채널 분석 설정 ${opsRulesIdText(id)}${name} 삭제 확인:`)) return;
        await requestJson(`${opsLabVaRulesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await opsRulesDetachVaRuleFromViews(id);
        await recordOpsAudit({ area: 'rules', action: 'delete', target: `va-rule:${id}`, before: item, after: null });
        renderOpsAuditTrail('ops-rules-audit-list', 'rules');
        if (String(opsRulesDetailRecordId || '') === String(id)) {
          await closeOpsRulesEditor();
        }
        await refreshRules();
        opsRulesEditorStatus(`채널 분석 설정 ${opsRulesIdText(id)}를 삭제했습니다.`, false);
      }
      async function deleteOpsEventTemplateRecord(id) {
        const item = findOpsEventTemplateById(id);
        if (!item) {
          opsRulesEditorStatus('삭제할 이벤트 템플릿을 찾지 못했습니다.', true);
          return;
        }
        if (!opsRulesConfirmDangerAction(`delete-event-template:${id}`, `이벤트 템플릿 '${id}' 삭제 확인:`)) return;
        await requestJson(`${opsLabRulesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await recordOpsAudit({ area: 'rules', action: 'delete', target: `event-template:${id}`, before: item, after: null });
        renderOpsAuditTrail('ops-rules-audit-list', 'rules');
        if (String(opsRulesDetailRecordId || '') === String(id)) {
          await closeOpsRulesEditor();
        }
        await refreshRules();
        opsRulesEditorStatus(`이벤트 템플릿 '${id}'를 삭제했습니다.`, false);
      }
      async function deleteOpsProfileRecord(id) {
        const item = findOpsProfileById(id);
        if (!item) {
          opsRulesEditorStatus('삭제할 분석 프로파일을 찾지 못했습니다.', true);
          return;
        }
        const usage = opsProfileUsageSummary(id);
        const usagePrompt = usage === '없음' ? '' : `\n현재 사용처: ${usage}`;
        const usageText = usagePrompt ? ` 현재 사용처: ${usage}` : '';
        if (!opsRulesConfirmDangerAction(`delete-profile:${id}`, `분석 프로파일 '${id}' 삭제 확인:${usageText}`)) return;
        await requestJson(`${opsLabProfilesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await recordOpsAudit({ area: 'rules', action: 'delete', target: `profile:${id}`, before: item, after: null });
        renderOpsAuditTrail('ops-rules-audit-list', 'rules');
        if (String(opsRulesDetailRecordId || '') === String(id)) {
          await closeOpsRulesEditor();
        }
        await refreshRules();
        opsRulesEditorStatus(`분석 프로파일 '${id}'를 삭제했습니다.`, false);
      }
      function wireOpsRuleTableActions() {
        const bodies = [
          document.getElementById('opsVaRuleRows'),
          document.getElementById('opsEventRuleRows'),
          document.getElementById('opsProfileRows')
        ];
        for (const body of bodies) {
          if (!body || body.dataset.opsRuleWired === '1') continue;
          body.dataset.opsRuleWired = '1';
          body.addEventListener('click', (event) => {
            const copyButton = event.target.closest('[data-ops-rule-copy-kind]');
            if (copyButton) {
              event.preventDefault();
              opsRulesCopyVaOutput(
                String(copyButton.dataset.opsRuleCopyKind || ''),
                String(copyButton.dataset.opsRuleCopyId || ''),
                String(copyButton.dataset.opsRuleCopyView || '')
              ).catch((error) => {
                opsRulesEditorStatus(error.message || '출력 경로 복사 실패', true);
              });
              return;
            }
            const button = event.target.closest('[data-ops-rule-action]');
            if (!button) return;
            const action = String(button.dataset.opsRuleAction || '');
            const id = String(button.dataset.opsRuleId || '');
            if (!id) return;
            const task = ({
              'view-va': () => openOpsVaRuleRecord(id, 'view'),
              'delete-va': () => deleteOpsVaRuleRecord(id),
              'view-event-template': () => openOpsEventTemplateRecord(id, 'view'),
              'delete-event-template': () => deleteOpsEventTemplateRecord(id),
              'view-profile': () => openOpsProfileRecord(id, 'view'),
              'delete-profile': () => deleteOpsProfileRecord(id)
            })[action];
            if (!task) return;
            task().catch((error) => {
              opsRulesEditorStatus(error.message || '룰 작업 처리 실패', true);
            });
          });
        }
      }
      async function refreshRules() {
        const status = document.getElementById('opsRulesStatus');
        setFeedback(status, '', false, { collapseEmpty: true });
        const [catalog, profilesPayload, sourcesPayload, views, capabilities] = await Promise.all([
          requestJson('/ops/api/rules/catalog'),
          requestJson('/lab/analysis/profiles'),
          requestJson('/ops/api/sources'),
          requestJson('/ops/api/views'),
          requestJson('/lab/analysis/capabilities').catch(() => ({ trackingCategories: [] }))
        ]);
        const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
        const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
        const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
        opsCatalogBuiltInProfiles = (Array.isArray(profilesPayload.builtInProfiles) ? profilesPayload.builtInProfiles : [])
          .map(item => ({ ...item, builtIn: true }));
        opsCatalogProfiles = profiles;
        opsCatalogEventTemplates = rules;
        opsCatalogVaRules = vaRules;
        opsRulesSources = Array.isArray(sourcesPayload.sources) ? sourcesPayload.sources : [];
        const viewItems = Array.isArray(views.views) ? views.views : [];
        opsRulesViews = viewItems;
        opsRuleCategoryCatalog = Array.isArray(capabilities?.trackingCategories) ? capabilities.trackingCategories : [];
        opsRulesBuildChannels();
        opsRulesValidationIssues = opsRulesBuildValidationIssues();
        opsRulesRenderValidationIssues(opsRulesValidationIssues);
        opsRulesRefreshCategorySelectors();
        const boundRuleIds = new Set();
        for (const view of viewItems) {
          if (view.defaultRuleId) boundRuleIds.add(String(view.defaultRuleId));
          if (Array.isArray(view.allowedRuleIds)) {
            view.allowedRuleIds.forEach(id => boundRuleIds.add(String(id)));
          }
        }
        const filterInput = document.getElementById('opsRulesFilterInput');
        const hashQuery = String(opsHashParams().get('q') || '').trim();
        if (filterInput && hashQuery && !String(filterInput.value || '').trim()) {
          filterInput.value = hashQuery;
        }
        const searchTerm = opsRulesSearchTerm();
        const filteredVaRules = searchTerm ? vaRules.filter(item => opsRuleSearchableText(item).includes(searchTerm)) : vaRules;
        const filteredRules = searchTerm ? rules.filter(item => opsRuleSearchableText(item).includes(searchTerm)) : rules;
        const allProfiles = [...opsCatalogBuiltInProfiles, ...profiles];
        const filteredProfiles = searchTerm ? allProfiles.filter(item => opsRuleSearchableText(item).includes(searchTerm)) : allProfiles;
        setText('rulesVaRuleCount', vaRules.length);
        setText('rulesEventRuleCount', rules.length);
        setText('rulesProfileCount', allProfiles.length);
        setText('rulesViewBindingCount', boundRuleIds.size);
        opsRulesRefreshPrereqUi();
        setText('opsVaRuleSummary', `총 ${filteredVaRules.length}/${vaRules.length}개 · 연결 ${boundRuleIds.size}개`);
        setText('opsEventRuleSummary', `총 ${filteredRules.length}/${rules.length}개`);
        setText('opsProfileSummary', `총 ${filteredProfiles.length}/${allProfiles.length}개`);
        refreshOpsVaTemplateAssistOptions();
        renderOpsScenarioBuilder();
        renderOpsVaRules(filteredVaRules);
        renderOpsEventRules(filteredRules);
        renderOpsProfiles(filteredProfiles);
        wireOpsRuleTableActions();
      }
      function wireOpsRefresh() {
        document.getElementById('opsHomeRefresh')?.addEventListener('click', () => refreshLive().catch(error => setText('homeRuntimeText', error.message)));
        document.getElementById('opsRulesFilterInput')?.addEventListener('input', () => refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddVaRuleBtn')?.addEventListener('click', () => selectOpsRulesMode('va-rule').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddEventRuleBtn')?.addEventListener('click', () => selectOpsRulesMode('event-rule').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddProfileBtn')?.addEventListener('click', () => selectOpsRulesMode('profile').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateVaRuleBtn')?.addEventListener('click', () => openOpsVaRuleCreateWhenReady().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateEventRuleBtn')?.addEventListener('click', () => openOpsRulesEditor('event-rule', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateProfileBtn')?.addEventListener('click', () => openOpsRulesEditor('profile', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqProfilesAction')?.addEventListener('click', () => selectOpsRulesMode('profile').then(() => openOpsRulesEditor('profile', 'new')).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqTemplatesAction')?.addEventListener('click', () => selectOpsRulesMode('event-rule').then(() => openOpsRulesEditor('event-rule', 'new')).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqVaRulesAction')?.addEventListener('click', () => selectOpsRulesMode('va-rule').then(() => openOpsVaRuleCreateWhenReady()).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsScenarioBuilderType')?.addEventListener('change', () => renderOpsScenarioBuilder());
        document.getElementById('opsScenarioBuilderPreset')?.addEventListener('change', () => renderOpsScenarioBuilder());
        document.getElementById('opsScenarioBuilderClasses')?.addEventListener('input', () => renderOpsScenarioBuilder());
        document.getElementById('opsScenarioBuilderApply')?.addEventListener('click', () => applyOpsScenarioBuilderToEventRule().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVaRuleTemplateSeedSelect')?.addEventListener('change', (event) => opsRulesApplyVaRuleTemplateSeed(event.target.value || ''));
        document.getElementById('opsVaRuleChannelSelect')?.addEventListener('change', () => {
          opsRulesUpdateVaRuleFormSummary();
          stopOpsVaRulePreview({ preserveView: false }).catch(() => {});
          updateOpsVaRulePreviewUi();
        });
        document.getElementById('opsVaRuleIdInput')?.addEventListener('input', () => {
          opsRulesUpdateVaRuleFormSummary();
        });
        document.getElementById('opsVaRuleTrackerSelect')?.addEventListener('change', () => opsRulesUpdateTrackingPolicyUi());
        document.getElementById('opsVaRuleReidSelect')?.addEventListener('change', () => opsRulesUpdateTrackingPolicyUi());
        document.getElementById('opsVaRuleGeometryPointsInput')?.addEventListener('input', () => opsRulesRenderVaGeometryPreview());
        document.getElementById('opsVaRuleGeometryDefaultBtn')?.addEventListener('click', () => {
          opsRulesPushGeometryUndo();
          opsRulesRefreshVaGeometryUi(true);
        });
        document.getElementById('opsVaRuleGeometryUndoBtn')?.addEventListener('click', () => opsRulesUndoGeometryChange());
        document.getElementById('opsVaRuleGeometryDeleteLastBtn')?.addEventListener('click', () => opsRulesRemoveLastGeometryPoint());
        document.getElementById('opsVaRuleGeometryClearBtn')?.addEventListener('click', () => opsRulesClearGeometryPoints());
        const geometryPreview = document.getElementById('opsVaRuleGeometryPreview');
        geometryPreview?.addEventListener('pointerdown', (event) => opsRulesStartGeometryPointer(event));
        geometryPreview?.addEventListener('mousedown', (event) => opsRulesStartGeometryPointer(event));
        geometryPreview?.addEventListener('pointermove', (event) => opsRulesMoveGeometryPointer(event));
        geometryPreview?.addEventListener('pointerup', (event) => opsRulesFinishGeometryPointer(event));
        geometryPreview?.addEventListener('pointercancel', (event) => opsRulesFinishGeometryPointer(event));
        document.getElementById('opsVaRulePreviewStartBtn')?.addEventListener('click', () => startOpsVaRulePreview().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVaRulePreviewRestartBtn')?.addEventListener('click', () => startOpsVaRulePreview({ restart: true }).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVaRulePreviewStopBtn')?.addEventListener('click', () => stopOpsVaRulePreview({ preserveView: true }).catch(() => {}));
        document.getElementById('opsEventRuleModeSelect')?.addEventListener('change', () => {
          opsEventRuleRefreshTypeOptions('');
          opsEventRuleUpdateModeUi();
          opsEventRuleApplyPresetToInputs();
        });
        document.getElementById('opsEventRuleTypeSelect')?.addEventListener('change', () => {
          opsEventRuleUpdateModeUi();
          opsEventRuleApplyPresetToInputs();
        });
        document.getElementById('opsEventRulePresetSelect')?.addEventListener('change', () => opsEventRuleApplyPresetToInputs());
        document.getElementById('opsRulesComposerEdit')?.addEventListener('click', () => editCurrentOpsRulesRecord().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesComposerClose')?.addEventListener('click', () => closeOpsRulesEditor().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesComposerSave')?.addEventListener('click', () => triggerOpsRulesSave().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsDashboardRefresh')?.addEventListener('click', () => refreshDashboard().catch(error => setText('dashHealthText', error.message)));
        syncDashboardIncidentFilterFromHash();
        document.getElementById('dashIncidentTimelineSearch')?.addEventListener('input', () => handleDashboardIncidentFilterChange());
        document.getElementById('dashIncidentTimelineSource')?.addEventListener('change', () => handleDashboardIncidentFilterChange());
        document.getElementById('dashIncidentTimelineShare')?.addEventListener('click', () => copyDashboardIncidentFilterLink().catch(error => showToast(error.message || '인시던트 필터 링크 복사 실패', true)));
        window.addEventListener('hashchange', () => handleDashboardIncidentHashChange());
        document.getElementById('opsEventsRefresh')?.addEventListener('click', () => refreshEvents().catch(error => setText('eventRecordSummary', error.message)));
        document.getElementById('eventRecordsEvidenceSelect')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
        document.getElementById('eventRecordsIncludeArchives')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
        document.getElementById('eventReviewStatusFilter')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventReviewSummary', error.message));
        });
        document.getElementById('eventReviewClassFilter')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventReviewSummary', error.message));
        });
        document.getElementById('alertDeliverySave')?.addEventListener('click', async () => {
          try {
            await saveAlertDeliveryIntegration();
            await refreshEvents();
          } catch (error) {
            setText('alertDeliverySummary', `저장 실패: ${error.message}`);
          }
        });
        document.getElementById('alertDeliveryTest')?.addEventListener('click', async () => {
          try {
            await testAlertDeliveryIntegration();
            await refreshEvents();
          } catch (error) {
            setText('alertDeliverySummary', `fixture 전송 실패: ${error.message}`);
          }
        });
        document.getElementById('alertDeliveryFilter')?.addEventListener('input', rerenderAlertDeliveryFilters);
        document.getElementById('alertDeliveryKindFilter')?.addEventListener('change', rerenderAlertDeliveryFilters);
        document.getElementById('alertDeliveryEnabledFilter')?.addEventListener('change', rerenderAlertDeliveryFilters);
        document.getElementById('eventRecordsPrev')?.addEventListener('click', () => {
          opsEventRecordsOffset = Math.max(0, opsEventRecordsOffset - OPS_EVENT_RECORD_LIMIT);
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
        document.getElementById('eventRecordsNext')?.addEventListener('click', event => {
          const next = Number(event.currentTarget?.getAttribute('data-next-offset') || opsEventRecordsOffset + OPS_EVENT_RECORD_LIMIT);
          opsEventRecordsOffset = Number.isFinite(next) ? Math.max(0, next) : opsEventRecordsOffset + OPS_EVENT_RECORD_LIMIT;
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
        document.getElementById('opsRulesRefresh')?.addEventListener('click', () => refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesAuditRefresh')?.addEventListener('click', () => renderOpsAuditTrail('ops-rules-audit-list', 'rules'));
        document.getElementById('opsDashboardPretty')?.addEventListener('change', () => refreshDashboard().catch(() => {}));
        document.getElementById('opsEventsPretty')?.addEventListener('change', () => refreshEvents().catch(() => {}));
      }
      applyPrincipalVisibility().catch(() => {});
      wireOpsRefresh();
      wireOpsVlmControls();
      wireOpsRulesNavLinks();
      wireOpsRulesShellClose();
      if (activeOpsPage === 'dashboard') {
        refreshDashboard().catch(error => setText('dashHealthText', error.message));
      } else if (activeOpsPage === 'events') {
        refreshEvents().catch(error => setText('eventRecordSummary', error.message));
      } else if (activeOpsPage === 'rules') {
        renderOpsAuditTrail('ops-rules-audit-list', 'rules');
        refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
        setOpsRulesCatalogVisibility('va-rule');
        setOpsRulesEditorModeButtons('va-rule');
        setOpsRulesComposer('', 'closed');
        window.addEventListener('pageshow', () => {
          closeOpsRulesEditor().catch(() => {});
          setOpsRulesCatalogVisibility('va-rule');
          setOpsRulesEditorModeButtons('va-rule');
        });
        window.addEventListener('pagehide', () => {
          closeOpsRulesEditor().catch(() => {});
        });
      } else if (activeOpsPage === 'home') {
        refreshLive().catch(error => setText('homeRuntimeText', error.message));
      } else if (activeOpsPage === 'vlm') {
        refreshOpsVlmInstallConnection().catch(error => setFeedback(document.getElementById('opsVlmStatus'), error.message, true, { collapseEmpty: true }));
      }
    </script>
)OPSSCRIPT";
}

void AppendOpsSourcesPageScript(std::ostringstream& out, const std::string& stream_route_json, int rtsp_port) {
    out << R"OPSSOURCES(  <script>
    const statusEl = document.querySelector('#status');
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
      const [sources, views, clientViews, principal] = await Promise.all([
        requestJson('/ops/api/sources'),
        requestJson('/ops/api/views'),
        requestJson('/client/api/views'),
        requestJson('/auth/whoami').catch(() => null)
      ]);
      opsPrincipal = principal;
      loadedSources = sources.sources || [];
      loadedViews = views.views || [];
      applySourceWriteAccessUi();
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
      setOnvifProbeDraftStatus('');
    });
    document.querySelector('#refresh').addEventListener('click', () => loadAll().catch(error => setStatus(error.message, true)));
    document.querySelector('#channel-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('channel-audit-list', 'channels'));
    renderOpsAuditTrail('channel-audit-list', 'channels');
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSSOURCES";
}

void AppendOpsUsersPageScript(std::ostringstream& out) {
    out << R"OPSUSERS(  <script>
    const statusEl = document.querySelector('#status');
    const requestStatusEl = document.querySelector('#request-status');
    const usersBody = document.querySelector('#users-body');
    const requestsBody = document.querySelector('#access-requests-body');
    const inviteOutput = document.querySelector('#request-invite-output');
    const invitesBody = document.querySelector('#invite-list-body');
    const inviteCreateForm = document.querySelector('#invite-create-form');
    const inviteCreateOutput = document.querySelector('#invite-create-output');
    const inviteStatusEl = document.querySelector('#invite-status');
    const form = document.querySelector('#user-form');
    const userDetailPanel = document.querySelector('#user-detail-panel');
    const userEditorTitle = document.querySelector('#user-editor-title');
    const userEditorMode = document.querySelector('#user-editor-mode');
    const userEditorId = document.querySelector('#user-editor-id');
    const userEditorHelp = document.querySelector('#user-editor-help');
    const editSelectedButton = document.querySelector('#user-edit-selected');
    const saveSelectedButton = document.querySelector('#user-save-selected');
    const closeUserButton = document.querySelector('#user-close');
    const assignment = document.querySelector('#view-assignment');
    const assignmentOptions = document.querySelector('#view-assignment-options');
    const passwordFields = document.querySelector('#password-fields');
    const scopePreview = document.querySelector('#scope-template-preview');
    const lifecycleSummary = document.querySelector('#user-lifecycle-summary');
    const resetPasswordPanel = document.querySelector('#user-reset-password-panel');
    const resetPasswordInput = document.querySelector('#user-reset-password');
    const resetPasswordConfirmInput = document.querySelector('#user-reset-password-confirm');
    const resetPasswordButton = document.querySelector('#user-reset-password-button');
    const resetPasswordStatus = document.querySelector('#user-reset-password-status');
    const scopeTemplateButtons = [
      document.querySelector('#apply-view-scope-template'),
      document.querySelector('#apply-role-default-scope-template'),
      document.querySelector('#clear-custom-scopes')
    ];
    let loadedUsers = [];
    let loadedRequests = [];
    let loadedInvites = [];
    let loadedClientViews = [];
    let editorMode = 'view';
    let pendingUserDangerAction = '';
    const {
      escapeHtml,
      requestJson,
      formDataObject,
      setFeedback,
      splitList,
      setHidden,
      setRequired,
      setTableEmpty,
      opsRowActionsHtml,
      opsContextActionsHtml,
      setOpsDetailPanelOpen,
      appendTableCell,
      recordOpsAudit,
      renderOpsAuditTrail
    } = window.MediaServerUi;
    const setStatus = (message, failed = false) => setFeedback(statusEl, message, failed, { collapseEmpty: true });
    const setRequestStatus = (message, failed = false) => setFeedback(requestStatusEl, message, failed, { collapseEmpty: true });
    const setInviteStatus = (message, failed = false) => setFeedback(inviteStatusEl, message, failed, { collapseEmpty: true });
    const setResetPasswordStatus = (message, failed = false) => setFeedback(resetPasswordStatus, message, failed, { collapseEmpty: true });
    function confirmUserDangerAction(key, message, feedback = setStatus) {
      if (pendingUserDangerAction !== key) {
        pendingUserDangerAction = key;
        feedback(`${message} 다시 누르면 실행합니다.`);
        return false;
      }
      pendingUserDangerAction = '';
      return true;
    }
    function compactUserStoreError(error) {
      const message = String(error?.message || error || '').trim();
      if (message.includes('auth users file not found') || message.includes('auth users file is missing')) {
        return '사용자 저장소 없음. 사용자 추가로 초기화하세요.';
      }
      return message.replace(/\/Users\/[^\s"']+/g, '사용자 저장소 경로');
    }
    function hideUserEditor() {
      setOpsDetailPanelOpen(userDetailPanel, false);
      editorMode = 'view';
      setResetPasswordStatus('');
    }
    function setInviteOutput(text = '') {
      inviteOutput.textContent = text;
      inviteOutput.hidden = !text;
    }
    function setInviteCreateOutput(text = '') {
      if (!inviteCreateOutput) return;
      inviteCreateOutput.textContent = text;
      inviteCreateOutput.hidden = !text;
    }
    function setPasswordFieldsVisible(visible) {
      setHidden(passwordFields, !visible);
      setRequired(form.elements.password, visible);
      setRequired(form.elements.confirmPassword, visible);
    }
    function setFormDisabled(disabled) {
      for (const element of Array.from(form.elements)) {
        element.disabled = disabled;
      }
      for (const button of scopeTemplateButtons) {
        if (button) button.disabled = disabled;
      }
      saveSelectedButton.hidden = disabled;
      editSelectedButton.hidden = !disabled;
    }
    function setUsernameLocked(locked) {
      form.elements.username.readOnly = locked;
      form.elements.username.disabled = locked;
    }
    function setEditorMode(mode, title, username = '') {
      editorMode = mode;
      setOpsDetailPanelOpen(userDetailPanel, true);
      userEditorTitle.textContent = title;
      userEditorMode.textContent = mode === 'new' ? '새 사용자' : (mode === 'view' ? '상세' : '수정 중');
      userEditorId.textContent = username ? `@${username}` : '@-';
      userEditorHelp.textContent = mode === 'view' ? '저장된 내용입니다.' : '값을 바꾼 뒤 저장합니다.';
      setPasswordFieldsVisible(mode === 'new');
      editSelectedButton.textContent = '수정';
      saveSelectedButton.textContent = '저장';
      closeUserButton.textContent = '닫기';
      setFormDisabled(mode === 'view');
      setUsernameLocked(mode !== 'new');
      if (resetPasswordPanel) resetPasswordPanel.hidden = mode === 'new';
      setResetPasswordStatus('');
      if (resetPasswordInput) resetPasswordInput.value = '';
      if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = '';
      updateAssignmentVisibility();
    }
    function updateAssignmentVisibility() {
      const role = form.elements.role.value;
      assignment.style.display = (role === 'viewer' || role === 'integrator') ? 'grid' : 'none';
      updateScopeTemplatePreview();
    }
    function normalizeAssignmentViewIds(value) {
      const raw = Array.isArray(value)
        ? value
        : String(value || '').split(/[\s,]+/);
      return Array.from(new Set(raw
        .map(item => String(item || '').trim())
        .filter(Boolean)));
    }
    function selectedAssignmentViewIds() {
      return Array.from(assignmentOptions?.querySelectorAll('[data-assignment-view]:checked') || [])
        .map(input => String(input.value || '').trim())
        .filter(Boolean);
    }
    function syncAssignmentHiddenField() {
      if (form.elements.viewId) {
        form.elements.viewId.value = selectedAssignmentViewIds().join(',');
      }
    }
    function setAssignmentSelection(viewIds = []) {
      const wanted = new Set(normalizeAssignmentViewIds(viewIds));
      for (const input of Array.from(assignmentOptions?.querySelectorAll('[data-assignment-view]') || [])) {
        input.checked = wanted.has(String(input.value || '').trim());
      }
      syncAssignmentHiddenField();
    }
    const scopedRoleTargets = viewIds => {
      const normalized = normalizeAssignmentViewIds(viewIds);
      return normalized.length ? normalized : ['__unassigned__'];
    };
    const clientViewLocationParts = view => [
      view?.site,
      view?.group,
      view?.floor,
      view?.zone
    ].map(item => String(item || '').trim()).filter(Boolean);
    const clientViewLocationLabel = view => clientViewLocationParts(view).join(' / ');
    function findClientView(viewId) {
      return (loadedClientViews || []).find(view => String(view.viewId || '') === String(viewId || '')) || null;
    }
    function renderAssignmentOptions() {
      if (!assignmentOptions) return;
      const selected = selectedAssignmentViewIds();
      if (!Array.isArray(loadedClientViews) || loadedClientViews.length === 0) {
        assignmentOptions.innerHTML = '<span class="channel-assignment-empty">선택 가능한 채널이 없습니다.</span>';
        syncAssignmentHiddenField();
        return;
      }
      assignmentOptions.innerHTML = loadedClientViews.map(view => {
        const location = clientViewLocationLabel(view);
        const label = [
          view.displayName || view.viewId,
          location
        ].filter(Boolean).join(' - ');
        const value = String(view.viewId || '').trim();
        return `<label class="channel-assignment-option">
          <input type="checkbox" data-assignment-view value="${escapeHtml(value)}" />
          <span title="${escapeHtml(label)}">${escapeHtml(label || value)}</span>
        </label>`;
      }).join('');
      setAssignmentSelection(selected);
    }
    function scopeTemplateForRole(role, viewIds = []) {
      const normalizedRole = String(role || '').trim().toLowerCase();
      if (normalizedRole === 'admin') return ['*'];
      if (normalizedRole === 'operator') {
        return ['ops:read', 'rule:write', 'source:write', 'dashboard:read:*', 'event:read:*'];
      }
      if (normalizedRole === 'viewer') {
        return scopedRoleTargets(viewIds).flatMap(target => [
          `view:read:${target}`,
          `dashboard:read:${target}`,
          `event:read:${target}`,
          `metadata:read:${target}`
        ]);
      }
      if (normalizedRole === 'integrator') {
        return scopedRoleTargets(viewIds).flatMap(target => [
          `metadata:read:${target}`,
          `event:read:${target}`
        ]);
      }
      return [];
    }
    function viewIdsFromScopes(scopes) {
      const targets = new Set();
      for (const scope of Array.isArray(scopes) ? scopes : []) {
        const match = String(scope || '').trim().match(/^(view|dashboard|event|metadata):read:(.+)$/);
        if (match && match[2] && match[2] !== '*' && match[2] !== '__unassigned__') {
          targets.add(match[2]);
        }
      }
      return Array.from(targets);
    }
    function updateScopeTemplatePreview() {
      if (!scopePreview) return;
      const role = form.elements.role.value;
      const viewIds = selectedAssignmentViewIds();
      syncAssignmentHiddenField();
      const scopes = scopeTemplateForRole(role, viewIds);
      const scopedRole = role === 'viewer' || role === 'integrator';
      const suffix = scopedRole && viewIds.length === 0
        ? '채널 ID가 비어 있어 미배정 범위로 계산됩니다.'
        : `적용 예정 ${scopes.length}개`;
      const selectedLabels = scopedRole
        ? viewIds.map(id => {
            const view = findClientView(id);
            const location = view ? clientViewLocationLabel(view) : '';
            return [view?.displayName || id, location].filter(Boolean).join(' / ');
          })
        : [];
      const locationText = selectedLabels.length ? ` · 채널: ${selectedLabels.join(', ')}` : '';
      scopePreview.textContent = scopes.length
        ? `${suffix}${locationText}: ${scopes.join(', ')}`
        : '이 역할에는 적용할 권한 템플릿이 없습니다.';
    }
    function applyScopeTemplate(useRoleDefault = false) {
      const role = form.elements.role.value;
      const viewIds = useRoleDefault ? [] : selectedAssignmentViewIds();
      const scopes = scopeTemplateForRole(role, viewIds);
      form.elements.scopes.value = scopes.join('\n');
      updateScopeTemplatePreview();
    }
    function formValue(data, name) {
      if (Object.prototype.hasOwnProperty.call(data, name)) {
        return data[name] || '';
      }
      return form.elements[name]?.value || '';
    }
    function formPayload() {
      const data = formDataObject(form);
      const selectedViewIds = selectedAssignmentViewIds();
      const explicitScopes = splitList(formValue(data, 'scopes'));
      const role = formValue(data, 'role');
      return {
        username: formValue(data, 'username').trim(),
        displayName: formValue(data, 'displayName').trim(),
        role,
        viewId: selectedViewIds[0] || '',
        scopes: explicitScopes.length ? explicitScopes : scopeTemplateForRole(role, selectedViewIds),
        password: data.password || '',
        confirmPassword: data.confirmPassword || '',
        enabled: form.elements.enabled.checked,
        mustChangePassword: form.elements.mustChangePassword.checked
      };
    }
    function findLoadedUser(username) {
      return loadedUsers.find(user => String(user.username || '') === String(username || '')) || null;
    }
    function roleLabel(role) {
      return ({
        admin: '관리자',
        operator: '운영자',
        integrator: '연동',
        viewer: '시청자'
      })[role] || role || '미제공';
    }
    function requestStatusLabel(status) {
      return ({
        pending: '대기',
        approved: '승인됨',
        rejected: '거절됨'
      })[status] || status || '미제공';
    }
    function requestStatusTone(status) {
      return status === 'pending' ? 'warn' : status === 'rejected' ? 'bad' : '';
    }
    function accessRequestLifecycleText(request = {}) {
      if (request.status === 'approved') return '승인됨: 초대 링크 만료 전 비밀번호 설정 후 로그인 가능';
      if (request.status === 'rejected') return '거절됨: 새 요청 또는 관리자 재초대 필요';
      return '승인 전: 로그인/세션/채널 권한 없음';
    }
    function yesNo(value) {
      return value ? '예' : '아니오';
    }
    function displayValue(value, fallback = '미제공') {
      return value === null || value === undefined || value === '' ? fallback : String(value);
    }
    function userLifecycleText(user = {}) {
      const notes = [];
      if (user.enabled === false) {
        notes.push(user.disabledAt ? `비활성 상태: ${user.disabledAt} 이후 로그인/세션 차단` : '비활성 상태: 로그인/세션 차단');
      } else {
        notes.push('활성 상태: 권한 범위 안에서 로그인 가능');
      }
      if (user.lockedUntil) notes.push(`로그인 잠금 해제 예정: ${user.lockedUntil}`);
      notes.push(user.mustChangePassword ? '다음 로그인 시 비밀번호 변경 필요' : '다음 로그인 비밀번호 변경 요구 없음');
      return notes.join(' · ');
    }
    function userLifecycleTableText(user = {}) {
      const notes = [];
      notes.push(user.enabled === false ? '로그인 차단' : '로그인 가능');
      if (user.lockedUntil) notes.push('잠금 중');
      notes.push(user.mustChangePassword ? '변경 필요' : '변경 없음');
      return notes.join(' · ');
    }
    function updateLifecycleSummary(user = null) {
      if (!lifecycleSummary) return;
      const candidate = user || {
        enabled: form.elements.enabled.checked,
        mustChangePassword: form.elements.mustChangePassword.checked,
        lockedUntil: '',
        disabledAt: ''
      };
      lifecycleSummary.textContent = userLifecycleText(candidate);
    }
    function fillForm(user) {
      form.elements.username.value = user.username;
      form.elements.displayName.value = user.displayName || '';
      form.elements.role.value = user.role || 'viewer';
      setAssignmentSelection(viewIdsFromScopes(user.scopes || []));
      form.elements.scopes.value = (user.scopes || []).join('\n');
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      form.elements.enabled.checked = Boolean(user.enabled);
      form.elements.mustChangePassword.checked = Boolean(user.mustChangePassword);
      setEditorMode('view', `사용자 @${user.username}`, user.username);
      updateLifecycleSummary(user);
      userDetailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function resetUserForm() {
      form.reset();
      form.elements.role.value = 'viewer';
      setAssignmentSelection([]);
      form.elements.enabled.checked = true;
      form.elements.mustChangePassword.checked = true;
      setEditorMode('new', '사용자 추가');
      updateLifecycleSummary();
      form.elements.username.focus();
    }
    function userRowCells(user) {
      return [
        user.username,
        user.displayName || '',
        roleLabel(user.role),
        user.enabled ? '활성' : '비활성',
        String(user.scopesCount ?? (user.scopes || []).length),
        user.lastLoginAt || '미제공',
        user.lockedUntil || '없음',
        yesNo(user.mustChangePassword)
      ];
    }
    function userActionButton(label, className, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.onclick = onClick;
      return button;
    }
    function chipElement(text, tone = '') {
      const span = document.createElement('span');
      span.className = `chip${tone ? ` ${tone}` : ''}`;
      span.textContent = text;
      return span;
    }
      function chip(text, tone = '') {
        return `<span class="chip${tone ? ` ${tone}` : ''}">${escapeHtml(displayValue(text, ''))}</span>`;
      }
      function appendTextCell(tr, value, className = '') {
        const td = document.createElement('td');
        td.textContent = displayValue(value);
        if (className) td.className = className;
        tr.appendChild(td);
        return td;
      }
      function appendLabeledCell(tr, label, html, className = '') {
        return appendTableCell(tr, label, html, className);
      }
      function userValueHtml(primary, note = '') {
        return `<div class="user-value-stack"><strong>${escapeHtml(displayValue(primary))}</strong>${note ? `<span class="user-note">${escapeHtml(displayValue(note, ''))}</span>` : ''}</div>`;
      }
      function parseUserScope(scope) {
        const value = displayValue(scope, '').trim();
        if (!value) return null;
        if (value === '*') return { label: '모든 범위' };
        if (value === 'ops:read') return { label: '운영 콘솔' };
        if (value === 'rule:write') return { label: '룰 관리' };
        if (value === 'source:write') return { label: '채널 관리' };
        if (value === 'lab:read') return { label: '개발/검증 API' };
        const scopedMatch = value.match(/^(view|dashboard|event|metadata):read:(.+)$/);
        if (!scopedMatch) return { label: value };
        const featureLabel = ({
          view: '라이브',
          dashboard: '대시보드',
          event: '이벤트',
          metadata: '메타데이터'
        })[scopedMatch[1]] || scopedMatch[1];
        const target = scopedMatch[2] || '';
        const targetLabel = target === '*'
          ? '전체'
          : target === '__unassigned__'
            ? '미배정 채널'
            : `채널 ${target}`;
        return { label: featureLabel, target: targetLabel };
      }
      function userScopeHtml(scopes) {
        const items = Array.isArray(scopes)
          ? scopes.map(item => displayValue(item, '')).filter(Boolean)
          : [];
        if (items.includes('*')) {
          return userValueHtml('모든 범위');
        }
        if (items.length === 0) {
          return userValueHtml('범위 없음');
        }
        const parsed = items.map(parseUserScope).filter(Boolean);
        if (parsed.length === 0) {
          return userValueHtml('범위 없음');
        }
        const targets = Array.from(new Set(parsed.map(item => item.target).filter(Boolean)));
        const labels = Array.from(new Set(parsed.map(item => item.label).filter(Boolean)));
        if (targets.length > 1) {
          const previewTargets = targets.slice(0, 4).join(', ');
          const suffix = targets.length > 4 ? ` 외 ${targets.length - 4}개` : '';
          const featureText = labels.length > 0 ? labels.join(', ') : '조회';
          return userValueHtml(`${targets.length}개 채널`, `${previewTargets}${suffix} / ${featureText}`);
        }
        if (targets.length === 1 && labels.length > 0) {
          const primary = labels.length <= 2 ? labels.join(', ') : `${labels.length}개 범위`;
          const note = labels.length <= 2
            ? targets[0]
            : `${labels.join(', ')} / ${targets[0]}`;
          return userValueHtml(primary, note);
        }
        if (labels.length <= 2) {
          return userValueHtml(labels.join(', '));
        }
        const preview = labels.slice(0, 3).join(', ');
        return userValueHtml(`${labels.length}개 범위`, labels.length > 3 ? `${preview} 외 ${labels.length - 3}개` : preview);
      }
      function appendUserRow(user) {
        const tr = document.createElement('tr');
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(user.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(user.displayName || '미제공'));
        appendLabeledCell(tr, '권한', userValueHtml(roleLabel(user.role)));
        appendLabeledCell(
          tr,
          '상태',
          opsRowActionsHtml(
            `${chip(user.enabled ? '활성' : '비활성', user.enabled ? '' : 'warn')}<span class="user-note">${escapeHtml(userLifecycleTableText(user))}</span>`,
            'ops-status-actions user-status-actions'
          ),
          'table-cell-status'
        );
        appendLabeledCell(tr, '권한 범위', userScopeHtml(user.scopes), 'user-scope-cell');
        appendLabeledCell(tr, '마지막 로그인', userValueHtml(user.lastLoginAt || '미제공'));
        appendLabeledCell(tr, '잠금 만료', userValueHtml(user.lockedUntil || '없음'));
        appendLabeledCell(tr, '비밀번호 변경', userValueHtml(yesNo(user.mustChangePassword)));
        const nextEnabled = user.enabled ? 'false' : 'true';
        const lifecycleAction = user.enabled ? '비활성화' : '복구';
        const lifecycleClass = user.enabled ? 'danger' : 'secondary';
        const actionsHtml = opsContextActionsHtml(
          `<button type="button" class="secondary" data-user-view="${escapeHtml(displayValue(user.username))}">상세</button>`,
          `<button type="button" class="secondary" data-user-reset-password="${escapeHtml(displayValue(user.username))}">초기화</button>
          <button type="button" class="${lifecycleClass}" data-user-set-enabled="${nextEnabled}" data-user-action-username="${escapeHtml(displayValue(user.username))}">${lifecycleAction}</button>`,
          'user-row-actions',
          '추가 작업'
        );
        appendLabeledCell(tr, '작업', actionsHtml, 'table-cell-actions');
        usersBody.appendChild(tr);
      }
    function renderUsers(users) {
      usersBody.textContent = '';
      if (!Array.isArray(users) || users.length === 0) {
        setTableEmpty(usersBody, 9, '등록된 사용자가 없습니다. 사용자 추가로 계정을 생성하세요.');
        return;
      }
      for (const user of users) {
        appendUserRow(user);
      }
    }
      function appendRequestRow(request) {
        const tr = document.createElement('tr');
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(request.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(request.displayName || '미제공'));
        appendLabeledCell(tr, '연락처', userValueHtml(request.contact || '미제공'));
        appendLabeledCell(tr, '채널', userValueHtml(request.viewId || '미지정'));
        appendLabeledCell(tr, '사유', userValueHtml(request.reason || '미제공'));
        appendLabeledCell(
          tr,
          '상태',
          opsRowActionsHtml(
            `${chip(requestStatusLabel(request.status), requestStatusTone(request.status))}<span class="user-note">${escapeHtml(accessRequestLifecycleText(request))}</span>`,
            'ops-status-actions user-status-actions'
          ),
          'table-cell-status'
        );
        appendLabeledCell(tr, '요청/결정', userValueHtml(request.createdAt || '미제공', request.decidedAt || accessRequestLifecycleText(request)));
        const actionsHtml = request.status === 'pending'
          ? opsRowActionsHtml(`
              <label class="request-approve-view">
                <span>승인 채널 ID</span>
                <input data-request-approve-view="${escapeHtml(displayValue(request.requestId))}" value="${escapeHtml(displayValue(request.viewId || ''))}" placeholder="채널 ID" />
              </label>
              <button type="button" class="primary" data-request-approve="${escapeHtml(displayValue(request.requestId))}">승인</button>
              <button type="button" class="danger" data-request-reject="${escapeHtml(displayValue(request.requestId))}">거절</button>
            `, 'user-row-actions')
          : chip('처리 완료');
        appendLabeledCell(tr, '작업', actionsHtml, 'table-cell-actions');
        requestsBody.appendChild(tr);
      }
    function renderAccessRequests(requests) {
      requestsBody.textContent = '';
      if (!Array.isArray(requests) || requests.length === 0) {
        setTableEmpty(requestsBody, 8, '대기 중인 접근 요청이 없습니다.');
        return;
      }
      const order = { pending: 0, approved: 1, rejected: 2 };
      const sorted = requests.slice().sort((a, b) => {
        const left = order[a.status] ?? 9;
        const right = order[b.status] ?? 9;
        if (left !== right) return left - right;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      for (const request of sorted) {
        appendRequestRow(request);
      }
    }
      function inviteStatusText(invite = {}) {
        if (invite.used) return '사용 완료';
        if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) return '만료';
        return '대기';
      }
      function inviteStatusTone(status) {
        if (status === '대기') return 'warn';
        if (status === '만료') return 'bad';
        return '';
      }
      function appendInviteRow(invite) {
        if (!invitesBody) return;
        const tr = document.createElement('tr');
        const status = inviteStatusText(invite);
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><span class="table-identity-pill table-identity-user">${escapeHtml(displayValue(invite.username))}</span></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(invite.displayName || '미제공', invite.inviteId || ''));
        appendLabeledCell(tr, '권한', userValueHtml(roleLabel(invite.role)));
        appendLabeledCell(tr, '채널', userValueHtml(invite.viewId || '미지정'));
        appendLabeledCell(tr, '상태', chip(status, inviteStatusTone(status)), 'table-cell-status');
        appendLabeledCell(tr, '만료', userValueHtml(invite.expiresAt || '미제공'));
        appendLabeledCell(tr, '발급/사용', userValueHtml(invite.createdAt || '미제공', invite.usedAt ? `사용: ${invite.usedAt}` : `발급자: ${invite.createdBy || '미제공'}`));
        invitesBody.appendChild(tr);
      }
      function renderInvites(invites) {
        if (!invitesBody) return;
        invitesBody.textContent = '';
        if (!Array.isArray(invites) || invites.length === 0) {
          setTableEmpty(invitesBody, 7, '발급된 초대가 없습니다.');
          return;
        }
        const sorted = invites.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        for (const invite of sorted) {
          appendInviteRow(invite);
        }
      }
    async function loadUsers() {
      try {
        const json = await requestJson('/ops/api/users');
        loadedUsers = Array.isArray(json.users) ? json.users : [];
        renderUsers(loadedUsers);
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        loadedUsers = [];
        setTableEmpty(usersBody, 9, '사용자 저장소가 아직 없습니다. 사용자 추가로 계정을 생성하세요.');
        renderOpsAuditTrail('user-audit-list', 'users');
        setStatus(compactUserStoreError(error), true);
      }
    }
    async function loadAccessRequests() {
      try {
        const json = await requestJson('/ops/api/access-requests');
        loadedRequests = Array.isArray(json.accessRequests) ? json.accessRequests : [];
        renderAccessRequests(loadedRequests);
      } catch (error) {
        loadedRequests = [];
        setTableEmpty(requestsBody, 8, '승인 대기 요청이 없습니다.');
        setRequestStatus(compactUserStoreError(error), true);
      }
    }
    async function loadInvites() {
      if (!invitesBody) return;
      try {
        const json = await requestJson('/ops/api/invites');
        loadedInvites = Array.isArray(json.invites) ? json.invites : [];
        renderInvites(loadedInvites);
      } catch (error) {
        loadedInvites = [];
        setTableEmpty(invitesBody, 7, '초대 목록을 불러오지 못했습니다.');
        setInviteStatus(compactUserStoreError(error), true);
      }
    }
      async function loadAll({ clearMessages = true } = {}) {
      const [clientViewsPayload] = await Promise.all([
        requestJson('/client/api/views').catch(() => ({ views: [] })),
        loadUsers(),
        loadAccessRequests(),
        loadInvites()
      ]);
      loadedClientViews = Array.isArray(clientViewsPayload.views) ? clientViewsPayload.views : [];
      renderAssignmentOptions();
      if (clearMessages) {
        setStatus('');
        setRequestStatus('');
        setInviteStatus('');
      }
    }
    async function setEnabled(username, enabled) {
      try {
        const before = findLoadedUser(username);
        if (!enabled && username === 'admin') {
          setStatus('마지막 활성 admin이면 서버가 비활성화를 거부합니다.', true);
        }
        await requestJson(`/ops/api/users/${encodeURIComponent(username)}/${enabled ? 'enable' : 'disable'}`, { method: 'POST' });
        await loadAll();
        const afterUser = findLoadedUser(username) || { ...(before || { username }), enabled };
        await recordOpsAudit({
          area: 'users',
          action: enabled ? 'enable' : 'disable',
          target: `user:${username}`,
          before,
          after: afterUser
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setStatus(enabled
          ? `사용자 @${username} 복구 완료. 로그인 잠금과 실패 횟수가 초기화되었습니다.`
          : `사용자 @${username} 비활성화 완료. 기존 세션은 회수됩니다.`);
      } catch (error) {
        setStatus(error.message, true);
      }
    }
    async function resetUserPassword(username) {
      const password = String(resetPasswordInput?.value || '');
      const confirm = String(resetPasswordConfirmInput?.value || '');
      if (!username) return;
      if (!password) {
        setResetPasswordStatus('새 임시 비밀번호를 입력하세요.', true);
        return;
      }
      if (password !== confirm) {
        setResetPasswordStatus('새 임시 비밀번호 확인이 일치하지 않습니다.', true);
        return;
      }
      try {
        const before = findLoadedUser(username);
        await requestJson(`/ops/api/users/${encodeURIComponent(username)}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        if (resetPasswordInput) resetPasswordInput.value = '';
        if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = '';
        await loadAll();
        const afterUser = findLoadedUser(username) || { ...(before || { username }), mustChangePassword: true };
        await recordOpsAudit({
          area: 'users',
          action: 'reset-password',
          target: `user:${username}`,
          before,
          after: { ...afterUser, passwordReset: true }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setResetPasswordStatus('비밀번호 초기화 완료. 다음 로그인에서 변경이 필요합니다.');
        setStatus(`사용자 @${username} 비밀번호 초기화 완료. 기존 세션은 회수됩니다.`);
      } catch (error) {
        setResetPasswordStatus(error.message, true);
      }
    }
    function approveViewIdFor(request) {
      const requestId = String(request?.requestId || '');
      const input = [...(requestsBody?.querySelectorAll('[data-request-approve-view]') || [])]
        .find(element => String(element.dataset.requestApproveView || '') === requestId);
      return String(input?.value ?? request?.viewId ?? '').trim();
    }
    async function approveAccessRequest(request) {
      try {
        const payload = {};
        const normalizedViewId = approveViewIdFor(request);
        if (!normalizedViewId) {
          setRequestStatus('승인할 채널 ID를 입력하세요.', true);
          return;
        }
        if (normalizedViewId) payload.viewId = normalizedViewId;
        const result = await requestJson(`/ops/api/access-requests/${encodeURIComponent(request.requestId)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const invite = result.invite || {};
        const setupUrl = invite.setupUrl || (invite.token ? `/invite/setup?token=${encodeURIComponent(invite.token)}` : '');
        setInviteOutput([
          `계정: ${request.username || ''}`,
          setupUrl ? `초대 링크: ${setupUrl}` : '',
          invite.expiresAt ? `초대 링크 만료: ${invite.expiresAt}` : '',
          invite.token ? `토큰: ${invite.token}` : '',
          '초대 설정 완료 전까지는 로그인/세션/채널 권한이 열리지 않습니다.'
        ].filter(Boolean).join('\n'));
        setRequestStatus('접근 요청 승인 완료');
        await loadAll({ clearMessages: false });
        await recordOpsAudit({
          area: 'users',
          action: 'approve',
          target: `request:${request.requestId}`,
          before: request,
          after: { ...request, status: 'approved', viewId: normalizedViewId || request.viewId || '' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        setRequestStatus(error.message, true);
      }
    }
    async function rejectAccessRequest(request) {
      const label = request.username || request.requestId;
      if (!confirmUserDangerAction(`reject-request:${request.requestId}`, `${label} 요청 거절 확인:`, setRequestStatus)) return;
      try {
        await requestJson(`/ops/api/access-requests/${encodeURIComponent(request.requestId)}/reject`, { method: 'POST' });
        setInviteOutput('');
        setRequestStatus('접근 요청 거절 완료');
        await loadAll({ clearMessages: false });
        await recordOpsAudit({
          area: 'users',
          action: 'reject',
          target: `request:${request.requestId}`,
          before: request,
          after: { ...request, status: 'rejected' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        setRequestStatus(error.message, true);
      }
    }
    async function createInviteFromForm(event) {
      event.preventDefault();
      if (!inviteCreateForm) return;
      try {
        const data = formDataObject(inviteCreateForm);
        const payload = {
          username: String(data.username || '').trim(),
          displayName: String(data.displayName || '').trim(),
          role: String(data.role || 'viewer').trim(),
          viewId: String(data.viewId || '').trim(),
          ttlSeconds: Number.parseInt(String(data.ttlSeconds || '86400'), 10)
        };
        if (!payload.username) throw new Error('초대할 계정명을 입력하세요.');
        const result = await requestJson('/ops/api/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const invite = result.invite || {};
        setInviteCreateOutput([
          `계정: ${payload.username}`,
          invite.setupUrl ? `초대 링크: ${invite.setupUrl}` : '',
          invite.expiresAt ? `초대 링크 만료: ${invite.expiresAt}` : '',
          invite.token ? `토큰: ${invite.token}` : '',
          '이 목록에는 토큰/토큰 해시를 저장하거나 다시 표시하지 않습니다.'
        ].filter(Boolean).join('\n'));
        await loadInvites();
        await recordOpsAudit({
          area: 'users',
          action: 'invite-create',
          target: `invite:${payload.username}`,
          before: null,
          after: { ...invite, token: undefined, setupUrl: invite.setupUrl ? 'issued-once' : '' }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        setInviteStatus('초대 발급 완료');
        inviteCreateForm.reset();
        inviteCreateForm.elements.role.value = 'viewer';
        inviteCreateForm.elements.ttlSeconds.value = '86400';
      } catch (error) {
        setInviteStatus(error.message, true);
      }
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const payload = formPayload();
        if (editorMode === 'new') {
          if (!payload.password) throw new Error('초기 비밀번호를 입력하세요.');
          if (payload.password !== payload.confirmPassword) throw new Error('비밀번호 확인이 일치하지 않습니다.');
          delete payload.confirmPassword;
          await requestJson('/ops/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          form.reset();
          form.elements.enabled.checked = true;
          form.elements.mustChangePassword.checked = true;
          hideUserEditor();
          updateAssignmentVisibility();
          await loadAll();
          await recordOpsAudit({
            area: 'users',
            action: 'create',
            target: `user:${payload.username}`,
            before: null,
            after: payload
          });
          renderOpsAuditTrail('user-audit-list', 'users');
          setStatus('사용자 추가 완료');
          return;
        }
        if (!payload.username) return;
        const before = findLoadedUser(payload.username);
        delete payload.password;
        delete payload.confirmPassword;
        await requestJson(`/ops/api/users/${encodeURIComponent(payload.username)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadAll();
        await recordOpsAudit({
          area: 'users',
          action: 'update',
          target: `user:${payload.username}`,
          before,
          after: payload
        });
        renderOpsAuditTrail('user-audit-list', 'users');
        hideUserEditor();
        setStatus('사용자 저장 완료');
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    inviteCreateForm?.addEventListener('submit', createInviteFromForm);
    editSelectedButton.onclick = () => {
      const username = String(form.elements.username.value || '').trim();
      if (!username) return;
      setEditorMode('edit', `사용자 @${username}`, username);
      updateLifecycleSummary();
    };
    closeUserButton.onclick = () => {
      hideUserEditor();
    };
    resetPasswordButton?.addEventListener('click', () => {
      const username = String(form.elements.username.value || '').trim();
      resetUserPassword(username);
    });
    document.querySelector('#user-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('user-audit-list', 'users'));
    renderOpsAuditTrail('user-audit-list', 'users');
    document.addEventListener('click', event => {
      const viewButton = event.target.closest('[data-user-view]');
      if (viewButton) {
        const user = (loadedUsers || []).find(item => String(item.username || '') === String(viewButton.dataset.userView || ''));
        if (user) fillForm(user);
        return;
      }
      const resetButton = event.target.closest('[data-user-reset-password]');
      if (resetButton) {
        const user = (loadedUsers || []).find(item => String(item.username || '') === String(resetButton.dataset.userResetPassword || ''));
        if (user) {
          fillForm(user);
          resetPasswordInput?.focus();
          setResetPasswordStatus('임시 비밀번호를 입력해 초기화합니다.');
        }
        return;
      }
      const approveButton = event.target.closest('[data-request-approve]');
      if (approveButton) {
        const request = (loadedRequests || []).find(item => String(item.requestId || '') === String(approveButton.dataset.requestApprove || ''));
        if (request) approveAccessRequest(request);
        return;
      }
      const lifecycleButton = event.target.closest('[data-user-set-enabled]');
      if (lifecycleButton) {
        const username = String(lifecycleButton.dataset.userActionUsername || '').trim();
        const enabled = lifecycleButton.dataset.userSetEnabled === 'true';
        if (!username) return;
        if (!enabled && !confirmUserDangerAction(`disable-user:${username}`, `사용자 @${username} 로그인 비활성화와 기존 세션 회수 확인:`)) return;
        setEnabled(username, enabled);
        return;
      }
      const rejectButton = event.target.closest('[data-request-reject]');
      if (rejectButton) {
        const request = (loadedRequests || []).find(item => String(item.requestId || '') === String(rejectButton.dataset.requestReject || ''));
        if (request) rejectAccessRequest(request);
      }
    });
    document.querySelector('#add-user-btn').onclick = resetUserForm;
    form.elements.role.addEventListener('change', updateAssignmentVisibility);
    assignmentOptions?.addEventListener('change', () => {
      syncAssignmentHiddenField();
      updateScopeTemplatePreview();
    });
    form.elements.viewId.addEventListener('input', updateScopeTemplatePreview);
    form.elements.scopes.addEventListener('input', updateScopeTemplatePreview);
    form.elements.enabled.addEventListener('change', () => updateLifecycleSummary());
    form.elements.mustChangePassword.addEventListener('change', () => updateLifecycleSummary());
    document.querySelector('#apply-view-scope-template').onclick = () => applyScopeTemplate(false);
    document.querySelector('#apply-role-default-scope-template').onclick = () => applyScopeTemplate(true);
    document.querySelector('#clear-custom-scopes').onclick = () => {
      form.elements.scopes.value = '';
      updateScopeTemplatePreview();
    };
    document.querySelector('#refresh-btn').onclick = () => {
      setInviteOutput('');
      setInviteCreateOutput('');
      loadAll().catch(error => setStatus(error.message, true));
    };
    updateAssignmentVisibility();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSUSERS";
}


}  // namespace ingress
