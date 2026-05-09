#include "ingress/product_ui_page_scripts.h"

#include <sstream>
#include <string>

namespace ingress {

namespace {

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
        await requestJson('/client/api/access-requests', {
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
        setMessage('요청이 pending 상태로 저장되었습니다.');
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
    const { escapeHtml, display, numberValue, requestJson, applyPrincipalVisibility, setSelectOptions } = window.MediaServerUi;
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
      const text = display(value);
      const cls = ['stale', 'offline', 'disconnected', 'warning'].includes(String(value)) ? ' warn' :
        ['unavailable'].includes(String(value)) ? ' bad' : '';
      const label = ({
        warning: '경고',
        normal: '정상',
        stale: '지연',
        offline: '오프라인',
        disconnected: '연결 끊김',
        unavailable: '미제공',
        connected: '연결됨',
        connecting: '연결 중',
        live: '라이브',
        metadata: '메타데이터'
      })[String(value)] || text;
      return `<span class="chip${cls}">${escapeHtml(label)}</span>`;
    };
    const clientStatusLabel = value => ({
      offline: '오프라인',
      connecting: '연결 중',
      connected: '연결됨',
      completed: '연결됨',
      live: '라이브',
      metadata: '메타데이터',
      disconnected: '연결 끊김',
      failed: '실패',
      error: '오류',
      closed: '닫힘',
      stale: '지연',
      fresh: '정상'
    })[String(value)] || display(value);
    const emptyState = (title, message, actionHref = '', actionLabel = '') => `
      <div class="empty">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${actionHref ? `<div class="actions"><a class="button button-secondary" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a></div>` : ''}
      </div>
    `;
    applyPrincipalVisibility().catch(() => {});
    const normalizeOverlayMode = mode => {
      const raw = String(mode || '').trim().toLowerCase();
      if (!raw || ['raw', 'none', 'video', 'live'].includes(raw)) return 'raw';
      if (['va-overlay', 'va', 'overlay', 'metadata', 'server-overlay'].includes(raw)) return 'va-overlay';
      if (['va-rule', 'rule', 'varule'].includes(raw)) return 'va-rule';
      return '';
    };
    let requestedClientOverlayMode = normalizeOverlayMode(clientHashParams().get('mode') || '');
    let requestedClientRuleId = String(clientHashParams().get('rule') || '').trim();
    const overlayLabel = mode => ({
      raw: '원본',
      'va-overlay': 'VA 오버레이',
      'va-rule': 'VA 룰'
    })[mode] || mode || '미제공';
    const sourceKindLabel = kind => ({
      file: '파일',
      rtsp: 'RTSP',
      whep: '외부 WHEP',
      http: 'HTTP/HLS',
      hls: 'HTTP/HLS',
      webrtc: 'Published WebRTC'
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
          isPreviewMode ? '/ops/sources' : '',
          isPreviewMode ? '채널 관리' : ''
        );
        return;
      }
      host.innerHTML = views.map(view => `
        <button class="view${view.viewId === selectedViewId ? ' active' : ''}" type="button" data-view-id="${escapeHtml(view.viewId)}">
          <h3>${escapeHtml(view.displayName || view.viewId)}</h3>
	          <div class="meta">
	            <span class="chip">${escapeHtml(sourceKindLabel(view.sourceKind))}</span>
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
      if (events.warning) return { text: '현장 확인 필요', tone: 'warn' };
      if (['stale', 'offline', 'disconnected', 'warning'].includes(String(health.status || ''))) return { text: '영상 상태 확인', tone: 'warn' };
      if (['stale', 'warning'].includes(String(health.metadataStatus || ''))) return { text: '메타데이터 지연', tone: 'warn' };
      if (String(health.status || '') === 'unavailable') return { text: '신호 미제공', tone: 'bad' };
      return { text: '정상 관제 중', tone: '' };
    };
    let clientDashboardCompareFilter = localStorage.getItem('mediaServerClientDashboardCompareFilter') || 'all';
    let clientDashboardCompareSort = localStorage.getItem('mediaServerClientDashboardCompareSort') || 'priority';
    const clientDashboardPlacePreset = payload => {
      const view = payload?.view || {};
      const raw = [
        ...(Array.isArray(view.sourceTags) ? view.sourceTags : []),
        view.ownerGroup,
        view.displayName,
        view.sourceDisplayName
      ].map(value => String(value || '').toLowerCase()).join(' ');
      const presets = [
        { key: 'road', label: '도로', weight: 80, terms: ['road', 'traffic', 'street', '도로', '차도'] },
        { key: 'park', label: '공원', weight: 40, terms: ['park', 'plaza', '공원', '광장'] },
        { key: 'indoor', label: '실내', weight: 30, terms: ['indoor', 'inside', 'room', '실내'] },
        { key: 'lobby', label: '로비', weight: 45, terms: ['lobby', 'hall', '로비', '홀'] },
        { key: 'platform', label: '승강장', weight: 70, terms: ['platform', 'station', '승강장', '역사'] },
        { key: 'entrance', label: '출입구', weight: 75, terms: ['entrance', 'gate', 'door', '출입구', '게이트'] },
        { key: 'parking', label: '주차장', weight: 55, terms: ['parking', 'garage', '주차'] }
      ];
      return presets.find(preset => preset.terms.some(term => raw.includes(term))) || { key: 'default', label: '기본 현장', weight: 0, terms: [] };
    };
    const clientDashboardEventPreset = eventType => {
      const normalized = String(eventType || '').toLowerCase();
      if (normalized.includes('line')) return { label: '라인 통과', weight: 90 };
      if (normalized.includes('intrusion')) return { label: '침입', weight: 95 };
      if (normalized.includes('loiter')) return { label: '배회', weight: 70 };
      if (normalized.includes('occupancy')) return { label: '혼잡/점유', weight: 75 };
      if (normalized.includes('enter') || normalized.includes('exit')) return { label: '출입', weight: 65 };
      if (normalized.includes('presence')) return { label: '존재 감지', weight: 35 };
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
              <span>연결 ${escapeHtml(display(health.connectionStatus || health.status))}</span>
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
	        <div class="toolbar">
	          <div>
            <h2>${escapeHtml(view.displayName || view.viewId || '대시보드')}</h2>
            <p>${escapeHtml(view.sourceDisplayName || '미제공')}</p>
          </div>
          <div class="meta">
            <span class="chip${fieldState.tone ? ` ${fieldState.tone}` : ''}">${escapeHtml(fieldState.text)}</span>
            ${statusChip(health.status)}
            ${statusChip(health.metadataStatus)}
            ${events.warning ? '<span class="chip warn">경고</span>' : ''}
          </div>
        </div>
        <section class="events client-field-summary" data-testid="client-dashboard-field-summary">
          <h3>현장 요약</h3>
          <div class="summary">
            <div class="metric"><span>현장 상태</span><strong>${escapeHtml(fieldState.text)}</strong></div>
            <div class="metric"><span>영상 신호</span><strong>${escapeHtml(display(health.videoFrameStatus || health.status))}</strong></div>
            <div class="metric"><span>데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
            <div class="metric"><span>점검 권장</span><strong>${events.warning ? '이벤트 확인' : '정기 확인'}</strong></div>
          </div>
        </section>
        <div class="summary">
          <div class="metric"><span>연결 상태</span><strong>${escapeHtml(display(health.connectionStatus))}</strong></div>
          <div class="metric"><span>영상 프레임</span><strong>${escapeHtml(display(health.videoFrameStatus))}</strong></div>
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
	            <div class="metric"><span>소스 종류</span><strong>${escapeHtml(sourceKindLabel(view.sourceKind))}</strong></div>
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
              <select id="clientDashboardCompareFilter">
                <option value="all">전체</option>
                <option value="warnings">확인 필요</option>
                <option value="events">이벤트 있음</option>
                <option value="live">라이브</option>
              </select>
            </label>
            <label>정렬
              <select id="clientDashboardCompareSort">
                <option value="priority">경고 우선</option>
                <option value="events">이벤트 많은 순</option>
                <option value="name">이름순</option>
              </select>
            </label>
          </div>
          ${renderDashboardCompare(compareItems)}
        </section>
	        <section class="events">
	          <h3>이벤트 요약</h3>
          <div class="meta">
            ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
          </div>
          ${renderEvents(events.recent || [])}
        </section>
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
        </div>
        <div class="meta">
          ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
        </div>
        <section class="events">${renderEvents(events.recent || [])}</section>
      `;
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
	    const liveTiles = Array.from({ length: maxLiveTiles }, (_, index) => ({
	      index,
	      viewId: defaultLiveViewIdList[index] || '',
	      overlayMode: '',
	      sessionId: '',
      pc: null,
      dataChannel: null,
      iceTimer: null,
      status: 'offline',
      connectionStatus: 'offline',
      trackCount: null,
      eventCount: null,
      lastMetadataAt: 0,
      lastError: '',
      restartCount: 0,
      stale: false
    }));
    let selectedLiveTile = views.length > 0 ? 0 : null;
    let liveStatusTimer = null;
    let liveDashboardTimer = null;
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
	      if (!select) return;
	      select.innerHTML = liveViewOptionsHtml(tile);
	      select.value = tile.viewId || '';
	      select.disabled = Boolean(tile.sessionId);
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
      return modes.includes('raw') ? 'raw' : (modes[0] || '');
    }
    function tileRuleId(view) {
      return requestedRuleIdForView(view);
    }
    function tileStatusClass(value) {
      if (['offline', 'disconnected', 'stale', 'failed', 'error'].includes(String(value))) return ' warn';
      if (['unavailable', '미제공'].includes(String(value))) return ' bad';
      return '';
    }
    function updateTileDom(tile) {
      const root = document.querySelector(`[data-tile="${tile.index}"]`);
      if (!root) return;
      root.classList.toggle('selected', selectedLiveTile === tile.index);
      const view = tileView(tile);
      const status = tile.status || 'offline';
      const stale = tile.lastMetadataAt && Date.now() - tile.lastMetadataAt > 5000;
      tile.stale = Boolean(stale);
      root.querySelector('[data-role="status"]').textContent = stale ? '지연' : ({
        offline: '오프라인',
        connecting: '연결 중',
        live: '라이브',
        error: '오류'
      })[String(status)] || status;
      root.querySelector('[data-role="status"]').className = `chip${tileStatusClass(stale ? 'stale' : status)}`;
      root.querySelector('[data-role="connection"]').textContent = clientStatusLabel(tile.connectionStatus);
      root.querySelector('[data-role="tracks"]').textContent = display(tile.trackCount);
      root.querySelector('[data-role="events"]').textContent = display(tile.eventCount);
      root.querySelector('[data-role="stale"]').textContent = stale ? '지연' : (tile.sessionId ? '정상' : '미제공');
      const restarts = root.querySelector('[data-role="restarts"]');
      if (restarts) restarts.textContent = String(tile.restartCount || 0);
      const placeholder = root.querySelector('[data-role="placeholder"]');
      if (placeholder) placeholder.textContent = tile.lastError || clientStatusLabel(tile.connectionStatus || status);
	      root.querySelector('[data-role="placeholder"]').hidden = Boolean(tile.sessionId);
	      const startBtn = root.querySelector('[data-action="start"]');
	      const stopBtn = root.querySelector('[data-action="stop"]');
	      const restartBtn = root.querySelector('[data-action="restart"]');
	      if (startBtn) {
	        const limitReached = viewActiveLimitReached(view, tile.index);
	        startBtn.disabled = !view || Boolean(tile.sessionId) || limitReached;
	        startBtn.title = limitReached ? `이 채널은 최대 ${viewMaxTiles(view)}개 타일까지만 동시에 재생할 수 있습니다.` : '';
	      }
	      if (stopBtn) stopBtn.disabled = !tile.sessionId;
	      if (restartBtn) restartBtn.disabled = !view;
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
    }
	    function setTileView(index, viewId) {
	      const tile = liveTiles[index];
	      if (!tile || tile.sessionId) return;
	      const nextView = viewById(viewId || '');
	      if (nextView && viewAssignmentLimitReached(nextView, index)) {
	        tile.status = 'error';
	        tile.connectionStatus = `최대 ${viewMaxTiles(nextView)}개`;
	        updateTileViewSelect(tile);
	        updateTileDom(tile);
	        refreshSelectedTileDetail();
	        return;
	      }
	      tile.viewId = viewId || '';
	      const root = document.querySelector(`[data-tile="${index}"]`);
	      if (root) {
        const viewSelect = root.querySelector('[data-role="view"]');
        if (viewSelect) viewSelect.value = tile.viewId;
	      }
	      applyTileModeOptions(tile);
	      updateTileDom(tile);
	      updateVisibleLiveTileControls();
	      refreshSelectedTileDetail();
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
	        <article class="tile${selectedLiveTile === tile.index ? ' selected' : ''}" data-tile="${tile.index}">
	          <div class="tile-head">
	            <div class="tile-title">
	              <h3>타일 ${tile.index + 1}</h3>
	              <span class="chip" data-role="status">offline</span>
	            </div>
	            <div class="tile-controls">
	              <label>채널
		                <select data-role="view" aria-label="채널">
		                  ${liveViewOptionsHtml(tile)}
		                </select>
	              </label>
	              <label data-role="mode-wrap">보기 방식
	                <select data-role="mode" aria-label="보기 방식"></select>
	              </label>
	            </div>
	            <div class="tile-actions">
	              <button type="button" data-action="start">시작</button>
	              <button type="button" data-action="restart" class="ghost">재연결</button>
	              <button type="button" data-action="stop" class="ghost" disabled>정지</button>
	            </div>
	          </div>
	          <div class="tile-stage">
	            <video playsinline muted autoplay></video>
	            <span data-role="placeholder">오프라인</span>
	          </div>
	          <div class="tile-status">
	            <div class="metric"><span>연결</span><strong data-role="connection">offline</strong></div>
	            <div class="metric"><span>트랙</span><strong data-role="tracks">미제공</strong></div>
	            <div class="metric"><span>이벤트</span><strong data-role="events">미제공</strong></div>
	            <div class="metric"><span>상태</span><strong data-role="stale">미제공</strong></div>
	            <div class="metric"><span>재시도</span><strong data-role="restarts">0</strong></div>
	          </div>
	        </article>
	      `;
	    }
	    function liveMonitorHtml() {
	      return `
	        <div class="live-monitor">
	          <div class="live-toolbar">
	            <div>
	              <h2>라이브</h2>
	            </div>
	            <label>그리드
	              <select id="liveGridSize">
	                ${liveGridOptionsHtml()}
	              </select>
	            </label>
	            <label>밀도
	              <select id="liveDensity">
	                <option value="comfortable"${liveDensity === 'comfortable' ? ' selected' : ''}>표준</option>
	                <option value="compact"${liveDensity === 'compact' ? ' selected' : ''}>고밀도</option>
	              </select>
	            </label>
	            <button id="liveAllRestart" class="ghost" type="button">전체 재연결</button>
	            <button id="liveAllStop" class="ghost" type="button">전체 정지</button>
	          </div>
	          <div class="summary" id="liveSummary">
	            <div class="metric"><span>타일</span><strong data-summary="total">0</strong></div>
	            <div class="metric"><span>라이브</span><strong data-summary="live">0</strong></div>
	            <div class="metric"><span>연결 중</span><strong data-summary="connecting">0</strong></div>
	            <div class="metric"><span>지연</span><strong data-summary="stale">0</strong></div>
	            <div class="metric"><span>오프라인</span><strong data-summary="offline">0</strong></div>
	          </div>
	          <section class="detail-box" id="liveSelectedDetail">${emptyState('타일을 선택하세요', '선택한 타일의 연결, 메타데이터, 이벤트 상태가 여기에 표시됩니다.')}</section>
	          <div class="live-grid" data-grid-size="${liveTileCount}" data-density="${escapeHtml(liveDensity)}">
	            ${liveTiles.slice(0, liveTileCount).map(liveTileHtml).join('')}
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
	          if (!tile.sessionId) tile.overlayMode = modeSelect.value;
	        });
	      }
	      root.querySelector('[data-action="start"]')?.addEventListener('click', () => startLiveTile(tile.index));
	      root.querySelector('[data-action="restart"]')?.addEventListener('click', () => restartLiveTile(tile.index));
	      root.querySelector('[data-action="stop"]')?.addEventListener('click', () => stopLiveTile(tile.index));
	      root.addEventListener('click', event => {
	        if (!event.target.closest('button') && !event.target.closest('select')) {
	          selectLiveTile(tile.index);
	        }
	      });
	      applyTileModeOptions(tile);
	      updateTileDom(tile);
	    }
	    function bindLiveGridControls() {
	      document.querySelector('#liveAllStop')?.addEventListener('click', () => stopAllLiveTiles());
	      document.querySelector('#liveAllRestart')?.addEventListener('click', () => restartAllLiveTiles());
	      document.querySelector('#liveDensity')?.addEventListener('change', event => {
	        liveDensity = event.target.value === 'compact' ? 'compact' : 'comfortable';
	        localStorage.setItem('mediaServerClientLiveDensity', liveDensity);
	        const grid = document.querySelector('.live-grid');
	        if (grid) grid.dataset.density = liveDensity;
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
	        renderLiveMonitor();
	      });
	    }
	    function renderLiveMonitor() {
	      workspace?.classList.add('live-workspace');
	      if (views.length === 0) {
        detail.innerHTML = emptyState(
          'Live view가 없습니다',
          isPreviewMode
            ? '미리보기할 채널이 없습니다. Ops에서 채널을 만들고 계정 권한을 연결하세요.'
            : '라이브를 보려면 관리자에게 채널 접근 권한을 받아야 합니다.',
          isPreviewMode ? '/ops/sources' : '',
          isPreviewMode ? '채널 관리' : ''
	        );
	        return;
	      }
	      detail.innerHTML = liveMonitorHtml();
	      for (const tile of liveTiles.slice(0, liveTileCount)) {
	        bindLiveTile(tile);
	      }
	      bindLiveGridControls();
      if (!liveStatusTimer) {
        liveStatusTimer = setInterval(() => {
          updateAllTileDom();
          updateSelectedTileStatusText();
        }, 1000);
      }
      if (!liveDashboardTimer) {
        liveDashboardTimer = setInterval(() => refreshSelectedTileDetail(), 3000);
      }
      refreshSelectedTileDetail();
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
      selectLiveTile(index);
      tile.status = 'connecting';
      tile.connectionStatus = 'connecting';
      tile.trackCount = null;
      tile.eventCount = null;
      tile.lastMetadataAt = 0;
      tile.lastError = '';
      updateTileDom(tile);
      try {
        const pc = await createClientPeerConnection();
        tile.pc = pc;
        pc.onconnectionstatechange = () => {
          tile.connectionStatus = pc.connectionState || 'connecting';
          if (['connected', 'completed'].includes(tile.connectionStatus)) tile.status = 'live';
          if (['failed', 'disconnected', 'closed'].includes(tile.connectionStatus)) {
            tile.status = pc.connectionState === 'failed' ? 'error' : 'offline';
            tile.lastError = clientStatusLabel(pc.connectionState);
          }
          updateTileDom(tile);
        };
        pc.oniceconnectionstatechange = () => {
          tile.connectionStatus = pc.iceConnectionState || tile.connectionStatus;
          updateTileDom(tile);
        };
        pc.ondatachannel = event => attachTileDataChannel(tile, event.channel);
        pc.ontrack = event => {
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
        const body = { overlayMode: mode };
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
        tile.sessionId = payload.sessionId || '';
        if (!tile.sessionId || !payload.offer) throw new Error('session offer missing');
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch(clientSessionUrl(tile, '/answer'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: answer.sdp
        });
        tile.iceTimer = setInterval(() => pollTileIce(tile).catch(() => {}), 1000);
        updateTileDom(tile);
        refreshSelectedTileDetail();
      } catch (error) {
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
        await fetch(`/client/api/views/${encodeURIComponent(tile.viewId || '')}/webrtc/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {});
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
    async function stopAllLiveTiles() {
      await Promise.all(liveTiles.map(tile => stopLiveTile(tile.index)));
    }
    async function restartAllLiveTiles() {
      await Promise.all(visibleLiveTiles().map(tile => restartLiveTile(tile.index)));
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
              ${statusChip(health.metadataStatus)}
              <span class="chip${tileStatusClass(tile.stale ? 'stale' : 'fresh')}" data-selected-stale>${tile.stale ? '지연' : '정상'}</span>
            </div>
          </div>
          <div class="summary">
            <div class="metric"><span>연결</span><strong>${escapeHtml(clientStatusLabel(tile.connectionStatus))}</strong></div>
            <div class="metric"><span>라이브</span><strong>${escapeHtml(clientStatusLabel(health.status || tile.status))}</strong></div>
            <div class="metric"><span>트랙</span><strong>${escapeHtml(display(tile.trackCount ?? analysis.trackCount))}</strong></div>
            <div class="metric"><span>이벤트</span><strong>${escapeHtml(display(tile.eventCount ?? analysis.activeEventCount))}</strong></div>
            <div class="metric"><span>메타데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
            <div class="metric"><span>마지막 프레임</span><strong>${escapeHtml(ms(health.lastFrameAgeMs))}</strong></div>
            <div class="metric"><span>시나리오</span><strong>${escapeHtml(display(analysis.scenarioCount))}</strong></div>
            <div class="metric"><span>경고</span><strong>${events.warning ? '경고' : '정상'}</strong></div>
          </div>
        `;
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
        detail.innerHTML = emptyState(title, message, isPreviewMode ? '/ops/sources' : '', isPreviewMode ? '채널 관리' : '');
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
      renderLiveMonitor();
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
        chip: badge,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility,
        setSelectOptions,
        recordOpsAudit,
        renderOpsAuditTrail
      } = window.MediaServerUi;
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
      const dashboardRootCauseItems = (runtime, principal, eventsStatus = {}, browserConfig = {}, diagnosticLog = {}) => {
        const counts = runtimeCounts(runtime);
        const lifecycle = runtime?.sourceLifecycle || {};
        const matching = runtime?.analysisMatching || {};
        const publishSources = Array.isArray(runtime?.webrtcHttp?.publishSources) ? runtime.webrtcHttp.publishSources : [];
        const activeTaps = Array.isArray(matching.activeTaps) ? matching.activeTaps : [];
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
          ? '모든 source lifecycle 리소스가 idle입니다.'
          : `세션 ${numberValue(lifecycle.activeSessions)} · stream ${numberValue(lifecycle.resourceActiveStreams)}/${numberValue(lifecycle.registryActiveStreams)} · tap ${numberValue(lifecycle.activeAnalysisTaps)}`;
        const recentSummary = recentEvents.length > 0
          ? recentEvents.slice(0, 2).map(item => `${item.eventType || 'event'}:${item.status || 'status'}`).join(' · ')
          : '최근 EventRecord 없음';
        const logLines = Array.isArray(diagnosticLog?.lines) ? diagnosticLog.lines : [];
        const logEvidence = patterns => {
          const regex = new RegExp(patterns, 'i');
          const match = [...logLines].reverse().find(line => regex.test(String(line || '')));
          return match ? String(match).slice(0, 220) : (diagnosticLog?.available === false ? '최근 로그 없음' : '로그 미제공');
        };
        return [
          {
            level: stalledResources ? 'warn' : 'info',
            title: stalledResources ? 'Source lifecycle 정리 확인 필요' : 'Source lifecycle',
            detail: sourceSummary,
            evidence: `cleanup ${cleanupCompleted}/${cleanupRequests} · ${recentSummary}`,
            log: logEvidence('cleanup|source lifecycle|resourceActive|activeAnalysisTaps'),
            action: stalledResources ? '종료된 세션 뒤에 resource stream/tap이 남았는지 cleanup 로그와 채널 상태를 확인합니다.' : 'idle 또는 활성 수치가 일치합니다.',
            actionHref: '/ops/sources',
            actionLabel: '채널 상태'
          },
          {
            level: staleTaps.length > 0 ? 'warn' : 'info',
            title: staleTaps.length > 0 ? 'Stale 분석 탭 감지' : 'Stale detection',
            detail: staleTaps.length > 0
              ? staleTaps.slice(0, 3).map(tap => `${tap.tapId || 'tap'} ${Math.round(numberValue(tap.lastUsedAgeMs))}ms`).join(' · ')
              : '5초 초과 미사용 분석 탭이 없습니다.',
            evidence: staleTaps.length > 0
              ? staleTaps.slice(0, 2).map(tap => `${tap.streamKey || 'stream'} / ${tap.selectedRuleId || 'rule 없음'}`).join(' · ')
              : `active tap ${activeTaps.length}`,
            log: logEvidence('stale|metadata skipped|lastUsedAge|tapId'),
            action: staleTaps.length > 0 ? 'viewer 종료, route 이동, 탭 재사용 해제 흐름을 점검합니다.' : '분석 탭 age가 정상 범위입니다.',
            actionHref: '/ops/rules',
            actionLabel: '룰 연결'
          },
          {
            level: inactivePublishSources.length > 0 || cleanupBacklog ? 'warn' : 'info',
            title: inactivePublishSources.length > 0 || cleanupBacklog ? 'Reconnect / cleanup 확인 필요' : 'Reconnect / cleanup',
            detail: inactivePublishSources.length > 0
              ? inactivePublishSources.slice(0, 3).map(source => `${source.sourceId || 'source'} video=${source.hasVideo ? 'on' : 'off'}`).join(' · ')
              : `publish ${counts.publish} · egress ${counts.egress} · cleanup ${cleanupCompleted}/${cleanupRequests}`,
            evidence: post.lastError || storage.lastError
              ? `최근 오류 ${post.lastError || storage.lastError}`
              : `EventRecord 저장 ${storage.storedCount ?? 0} · POST 전송 ${post.sentCount ?? 0}`,
            log: logEvidence('reconnect|cleanup|WHIP|publisher|failed to create|event post|event storage'),
            action: inactivePublishSources.length > 0
              ? 'WHIP publisher 재접속과 video track 생성 여부를 확인합니다.'
              : (cleanupBacklog ? 'cleanup completed가 requests를 따라가지 못하는지 로그를 확인합니다.' : 'reconnect/cleanup 지표가 정상 범위입니다.'),
            actionHref: '/ops/events',
            actionLabel: '이벤트 기록'
          },
          {
            level: principal && hasOpsRead && !relayFallback ? 'info' : 'warn',
            title: principal && hasOpsRead && !relayFallback ? 'Auth / config' : 'Auth / config 확인 필요',
            detail: principal
              ? `role ${principal.role || '미제공'} · auth ${principal.authMode || '미제공'} · ops:read ${hasOpsRead ? '사용' : '없음'}`
              : 'whoami 응답을 확인하지 못했습니다.',
            evidence: relayFallback ? `${iceText} · relay fallback` : iceText,
            log: logEvidence('auth|login|session|scope|ICE|TURN|relay'),
            action: principal && hasOpsRead && !relayFallback ? '운영 대시보드 접근 권한과 ICE 설정이 정상 범위입니다.' : '세션, role/scope, auth mode, TURN/ICE 설정을 확인합니다.',
            actionHref: '/ops/users',
            actionLabel: '권한 확인'
          }
        ];
      };
      const renderDashboardRootCause = (runtime, principal, eventsStatus = {}, browserConfig = {}, diagnosticLog = {}) => {
        const items = dashboardRootCauseItems(runtime, principal, eventsStatus, browserConfig, diagnosticLog);
        const warnCount = items.filter(item => item.level === 'warn' || item.level === 'bad').length;
        renderBadges('dashRootCauseBadges', [
          { text: warnCount > 0 ? `${warnCount}개 확인 필요` : '즉시 조치 없음', tone: warnCount > 0 ? 'warn' : '' },
          { text: 'source lifecycle' },
          { text: 'stale' },
          { text: 'reconnect' },
          { text: 'auth/config' }
        ]);
        setText('dashRootCauseText', warnCount > 0
          ? '아래 항목을 기준으로 원인을 좁혀 확인합니다.'
          : '운영자가 바로 확인할 source lifecycle, stale, reconnect, auth/config 문제가 없습니다.');
        const list = document.getElementById('dashRootCauseList');
        if (!list) return;
        list.innerHTML = items.map(item => `<article class="root-cause-item ${escapeHtml(item.level)}">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </div>
          <span class="chip${item.level === 'warn' ? ' warn' : (item.level === 'bad' ? ' bad' : '')}">${item.level === 'info' ? '정상' : '확인'}</span>
          ${item.evidence ? `<p class="root-cause-evidence">${escapeHtml(item.evidence)}</p>` : ''}
          ${item.log ? `<p class="root-cause-log">${escapeHtml(item.log)}</p>` : ''}
          <p class="root-cause-action">${escapeHtml(item.action)}</p>
          ${item.actionHref ? `<a class="button button-secondary button-compact root-cause-next-action" href="${escapeHtml(item.actionHref)}">${escapeHtml(item.actionLabel || '다음 조치')}</a>` : ''}
        </article>`).join('');
      };
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
        const [runtime, principal, eventsStatus, browserConfig] = await Promise.all([
          requestJson('/ops/api/runtime/status'),
          applyPrincipalVisibility().catch(() => null),
          requestJson('/ops/api/events/status?limit=5&includeArchives=1').catch(error => ({ error: error.message, records: { records: [] } })),
          requestJson('/webrtc/config').catch(error => ({ error: error.message }))
        ]);
        const counts = runtimeCounts(runtime);
        const metadata = runtime?.webrtcHttp?.metadataDataChannel || {};
        const sideChannel = runtime?.webrtcHttp?.metadataSideChannel || {};
        setText('dashActiveSessions', counts.sessions);
        setText('dashActiveStreams', counts.streams);
        setText('dashActiveTaps', counts.taps);
        setText('dashPublishSources', counts.publishSources);
        renderBadges('dashHealthBadges', [
          { text: counts.streams > 0 ? '스트림 활성' : '스트림 대기', tone: counts.streams > 0 ? '' : 'info' },
          { text: counts.taps > 0 ? '분석 활성' : '분석 대기', tone: counts.taps > 0 ? '' : 'info' },
          { text: counts.egress > 0 ? '송출 활성' : '송출 대기', tone: counts.egress > 0 ? '' : 'info' }
        ]);
        setText('dashHealthText', `세션 ${counts.sessions} · 스트림 ${counts.streams} · 분석 ${counts.taps}`);
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
        renderDashboardRootCause(runtime, principal, eventsStatus, browserConfig, diagnosticLog);
        renderRaw('opsDashboardRaw', 'opsDashboardPretty', runtime);
      }
      const OPS_EVENT_RECORD_LIMIT = 25;
      let opsEventRecordsOffset = 0;
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
        const bundleHref = item => {
          const params = new URLSearchParams();
          const eventId = String(item?.eventId || '').trim();
          if (eventId) params.set('eventId', eventId);
          if (snapshotPath) params.set('snapshotPath', snapshotPath);
          if (clipPath) params.set('clipPath', clipPath);
          params.set('expiresAtMs', String(Date.now() + 24 * 60 * 60 * 1000));
          params.set('download', '1');
          return `/lab/analysis/events/evidence/bundle?${params.toString()}`;
        };
        const actions = [
          snapshotPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(snapshotPath))}">snapshot 다운로드</a>` : '',
          clipPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(clipPath))}">clip manifest</a>` : '',
          (snapshotPath || clipPath) ? `<a class="button button-secondary button-compact" href="${escapeHtml(bundleHref(item))}">bundle zip</a>` : ''
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
          const eventHtml = `<div class="ops-rule-value-stack">
            <span class="table-identity-pill table-identity-id">${escapeHtml(display(item?.eventId || '-'))}</span>
            <span class="ops-rule-note">${escapeHtml(display(item?.eventType || 'event'))}</span>
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
      async function refreshEvents() {
        const { eventParams, channelFilter, evidence } = eventRecordQueryParams();
        const payload = await requestJson(`/ops/api/events/status?${eventParams.toString()}`);
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
          { text: exportPolicy.exportAudit ? 'export audit 기록' : 'export audit 없음', tone: exportPolicy.exportAudit ? '' : 'warn' },
          { text: exportPolicy.bundleMaxAgeMs ? `bundle 만료 ${Math.round(exportPolicy.bundleMaxAgeMs / 3600000)}h` : 'bundle 만료 미지정', tone: exportPolicy.bundleMaxAgeMs ? 'info' : 'warn' },
          { text: deletePolicy.compactionDelete ? 'compaction 삭제 가능' : '삭제 제한', tone: deletePolicy.compactionDelete ? 'info' : 'warn' }
        ]);
        setText('eventExportPolicyText',
          `보존 ${retentionPolicy.archiveRetention || 'oldest-rotated-only'} · bundle ${retentionPolicy.bundleExpiry || 'download-link-expiresAtMs'} · audit ${exportPolicy.auditAction || 'export-bundle'} · evidence 파일 직접 삭제 ${deletePolicy.evidenceFileDelete ? '허용' : '불가'}`);
        const eventItems = Array.isArray(records.records) ? records.records : [];
        setText(
          'eventRecordSummary',
          records.error
            ? `조회 실패: ${records.error}`
            : `records ${eventItems.length}/${records.matchedRecords ?? eventItems.length} · offset ${records.offset ?? opsEventRecordsOffset} · hasMore ${records.hasMore ? 'yes' : 'no'}${channelFilter ? ` · channel ${channelFilter}` : ''}${evidence ? ` · evidence ${evidence}` : ''}`
        );
        renderEventRows(eventItems);
        const prevButton = document.getElementById('eventRecordsPrev');
        const nextButton = document.getElementById('eventRecordsNext');
        if (prevButton) prevButton.disabled = opsEventRecordsOffset <= 0;
        if (nextButton) nextButton.disabled = !records.hasMore;
        if (records.nextOffset != null) nextButton?.setAttribute('data-next-offset', String(records.nextOffset));
        renderRaw('opsEventsRaw', 'opsEventsPretty', { storage, post, records });
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
      let opsVaRuleTemplateId = '';
      let opsRulesCurrentRecord = null;
      const opsVaRulePreviewState = {
        viewId: '',
        sessionId: '',
        pc: null,
        iceTimer: null,
        status: 'idle',
        connectionStatus: 'idle',
        lastError: ''
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
          summary: '검출기, FPS, confidence 같은 분석 엔진 설정을 모아 둡니다.',
          composerTitle: '분석 프로파일',
          composerHint: '채널 설정이나 템플릿에서 선택합니다.',
          saveText: '저장',
          saveProxyId: 'saveProfileBtn',
          steps: [
            { sectionId: 'profileSection', title: '프로파일 설정', hint: 'detector, FPS, confidence, 입력 크기만 설정합니다.' }
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
          if (panel) panel.hidden = true;
          return;
        }
        if (panel) panel.hidden = false;
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
          'intrusion-dwell': { candidateTimeMs: 2000, dwellTimeMs: 10000 },
          're-entry': { reEntryWindowMs: 10000 },
          'wrong-direction': { cooldownMs: 5000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 10000, dwellTimeMs: 3000 },
          loitering: { minDwellTimeMs: 30000, maxMovementRadius: 0.08, minTrajectoryPoints: 4, cooldownMs: 10000 },
          'zone-occupancy': { occupancyThreshold: 3, minDwellTimeMs: 5000, cooldownMs: 10000 }
        },
        road: {
          all: { minConfidence: 0.35, cooldownMs: 10000 },
          'line-crossing': { minDurationMs: 0 },
          'wrong-direction': { cooldownMs: 8000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 6000, dwellTimeMs: 1500 },
          loitering: { minDwellTimeMs: 45000, maxMovementRadius: 0.12, minTrajectoryPoints: 5, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 8, minDwellTimeMs: 15000, cooldownMs: 20000 }
        },
        park: {
          all: { minConfidence: 0.3, cooldownMs: 15000 },
          'intrusion-dwell': { candidateTimeMs: 3000, dwellTimeMs: 15000 },
          loitering: { minDwellTimeMs: 60000, maxMovementRadius: 0.1, minTrajectoryPoints: 5, cooldownMs: 30000 },
          'zone-occupancy': { occupancyThreshold: 5, minDwellTimeMs: 10000, cooldownMs: 20000 }
        },
        indoor: {
          all: { minConfidence: 0.3, cooldownMs: 8000 },
          'intrusion-dwell': { candidateTimeMs: 1500, dwellTimeMs: 5000 },
          loitering: { minDwellTimeMs: 30000, maxMovementRadius: 0.06, minTrajectoryPoints: 4, cooldownMs: 15000 },
          'zone-occupancy': { occupancyThreshold: 4, minDwellTimeMs: 5000, cooldownMs: 10000 }
        },
        lobby: {
          all: { minConfidence: 0.32, cooldownMs: 8000 },
          'intrusion-dwell': { candidateTimeMs: 1000, dwellTimeMs: 4000 },
          're-entry': { reEntryWindowMs: 12000 },
          loitering: { minDwellTimeMs: 45000, maxMovementRadius: 0.07, minTrajectoryPoints: 4, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 6, minDwellTimeMs: 7000, cooldownMs: 12000 }
        },
        platform: {
          all: { minConfidence: 0.35, cooldownMs: 10000 },
          'line-crossing': { minDurationMs: 0 },
          'wrong-direction': { cooldownMs: 6000 },
          'intrusion-after-line-crossing': { maxDelayAfterCrossingMs: 5000, dwellTimeMs: 1000 },
          loitering: { minDwellTimeMs: 50000, maxMovementRadius: 0.08, minTrajectoryPoints: 5, cooldownMs: 20000 },
          'zone-occupancy': { occupancyThreshold: 8, minDwellTimeMs: 8000, cooldownMs: 15000 }
        },
        entrance: {
          all: { minConfidence: 0.32, cooldownMs: 6000 },
          'line-crossing': { minDurationMs: 0 },
          'intrusion-dwell': { candidateTimeMs: 1000, dwellTimeMs: 3000 },
          're-entry': { reEntryWindowMs: 10000 },
          'zone-occupancy': { occupancyThreshold: 3, minDwellTimeMs: 4000, cooldownMs: 10000 }
        }
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
      function opsRulesClone(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
      }
      function opsRulesSplitList(value) {
        return String(value ?? '')
          .split(/[\n,]/)
          .map(item => item.trim())
          .filter(Boolean);
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
        return opsRulesStringArray(item?.analysis?.classes || item?.classes || item?.targetClasses || []);
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
        const kind = channel?.source?.kind ? opsRulesSourceKindLabel(channel.source.kind) : '입력';
        return `${display(channel.displayName)} · ${kind}`;
      }
      function opsRulesSourceDetailLabel(source) {
        if (!source || typeof source !== 'object') return '';
        if (source.kind === 'file') return display(source.file || '');
        if (source.kind === 'rtsp') return display(source.url || source.rtspUrl || '');
        if (source.kind === 'whep') return display(source.whepUrl || source.url || '');
        if (source.kind === 'webrtc') return display(source.webrtcSourceId || source.sourceId || '');
        if (source.kind === 'http' || source.kind === 'hls') return display(source.url || '');
        return display(source.url || source.file || '');
      }
      function opsRulesFindChannelById(channelId) {
        return opsRulesChannels.find((channel) => String(channel?.id || '') === String(channelId || '')) || null;
      }
      function opsRulesFindChannelForVaRule(item = {}) {
        const itemId = String(item?.id || '').trim();
        if (itemId) {
          for (const channel of opsRulesChannels) {
            const view = channel?.view;
            const allowed = Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds.map(String) : [];
            if (String(view?.defaultRuleId || '') === itemId || allowed.includes(itemId)) {
              return channel;
            }
          }
        }
        const source = item?.source || {};
        return opsRulesChannels.find(channel => opsRulesSourceMatches(channel?.source, source)) || null;
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
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 10000),
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
              occupancyThreshold: Number(scenario.occupancyThreshold ?? baseline.occupancyThreshold ?? 3),
              minDwellTimeMs: Number(scenario.minDwellTimeMs ?? baseline.minDwellTimeMs ?? 5000),
              cooldownMs: Number(scenario.cooldownMs ?? baseline.cooldownMs ?? 10000),
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
            profileId: opsRulesPreferredProfileId()
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
          { prefix: 'opsEventRuleClasses', containerId: 'opsEventRuleClassChecks', summaryId: 'opsEventRuleClassesSummary', emptyText: '객체를 선택하세요.' }
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
        opsEventRuleToggleField('opsEventRulePresetField', mode === 'scenario');
        opsEventRuleToggleField('opsEventRuleLineDirectionField', lineMode);
        opsEventRuleToggleField('opsEventRuleCandidateField', dwellMode);
        opsEventRuleToggleField('opsEventRuleDwellField', dwellMode || lineAfterMode || loiteringMode || zoneOccupancyMode);
        opsEventRuleToggleField('opsEventRuleReEntryWindowField', reEntryMode);
        opsEventRuleToggleField('opsEventRuleReEntryModeField', reEntryMode);
        opsEventRuleToggleField('opsEventRuleLineDelayField', lineAfterMode);
        opsEventRuleToggleField('opsEventRuleTriggerDirectionField', lineAfterMode);
        opsEventRuleToggleField('opsEventRuleLoiteringRadiusField', loiteringMode);
        opsEventRuleToggleField('opsEventRuleLoiteringPointsField', loiteringMode);
        opsEventRuleToggleField('opsEventRuleZoneThresholdField', zoneOccupancyMode);
        opsEventRuleToggleField('opsEventRuleZoneDwellField', zoneOccupancyMode);
      }
      function opsEventRuleApplyPresetToInputs(presetId = '') {
        const type = String(document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const selected = String(presetId || document.getElementById('opsEventRulePresetSelect')?.value || 'default');
        if (selected === 'custom') return;
        const baseline = opsRulesScenarioBaseline(type, selected);
        const setNumber = (id, value) => {
          const input = document.getElementById(id);
          if (input && value !== undefined) input.value = String(value);
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
            <circle cx="${x}" cy="${y}" r="1.25"></circle>
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
        const readyForVaRule = state.channelsReady && state.profilesReady && state.templatesReady;
        opsRulesSetPrereqChip('opsRulesPrereqVaRulesState', readyForVaRule, '시작 가능', '준비 필요');
        const summary = document.getElementById('opsRulesPrereqSummary');
        if (summary) {
          if (readyForVaRule) {
            summary.textContent = '채널, 프로파일, 템플릿이 준비되었습니다. 이제 채널 분석 설정을 만들 수 있습니다.';
          } else {
            const missing = [];
            if (!state.channelsReady) missing.push('채널');
            if (!state.profilesReady) missing.push('분석 프로파일');
            if (!state.templatesReady) missing.push('이벤트 템플릿');
            summary.textContent = `${missing.join(', ')}을(를) 먼저 준비한 뒤 채널 분석 설정을 만듭니다.`;
          }
        }
        const createVaButtons = [
          document.getElementById('opsCreateVaRuleBtn'),
          document.getElementById('opsRulesPrereqVaRulesAction')
        ];
        createVaButtons.forEach((button) => {
          if (!button) return;
          button.disabled = !readyForVaRule;
          button.title = readyForVaRule ? '' : '채널, 프로파일, 이벤트 템플릿이 먼저 필요합니다.';
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
        document.getElementById('opsVaRuleIdInput').value = String(item?.id || '');
        document.getElementById('opsVaRuleNameInput').value = String(item?.name || `채널 분석 설정 ${item?.id || ''}`).trim();
        document.getElementById('opsVaRuleEnabledInput').value = item?.enabled === false ? 'false' : 'true';
        document.getElementById('opsVaRuleChannelSelect').value = channel?.id || '';
        document.getElementById('opsVaRuleProfileSelect').value = String(analysis.profileId || item?.profileId || opsRulesPreferredProfileId());
        document.getElementById('opsVaRuleTemplateSeedSelect').value = templateRuleId;
        opsVaRuleTemplateId = templateRuleId;
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
        document.getElementById('opsEventRuleIdInput').value = String(item?.id || '');
        document.getElementById('opsEventRuleTypeSelect').value = eventType;
        document.getElementById('opsEventRuleConfidenceInput').value = String(event?.minConfidence ?? baseline.minConfidence ?? 0.25);
        document.getElementById('opsEventRuleMinDurationInput').value = String(event?.minDurationMs ?? baseline.minDurationMs ?? 0);
        opsRulesRenderCategorySelector('opsEventRuleClasses', Array.isArray(analysis.classes) && analysis.classes.length > 0 ? analysis.classes : opsRuleDefaultCategories);
        document.getElementById('opsEventRuleLineDirectionSelect').value = String(event?.region?.direction || 'any');
        document.getElementById('opsEventRuleCandidateInput').value = String(scenario?.candidateTimeMs ?? baseline.candidateTimeMs ?? 2000);
        document.getElementById('opsEventRuleDwellInput').value = String(scenario?.dwellTimeMs ?? scenario?.minDwellTimeMs ?? baseline.dwellTimeMs ?? baseline.minDwellTimeMs ?? 10000);
        document.getElementById('opsEventRuleReEntryWindowInput').value = String(scenario?.reEntryWindowMs ?? baseline.reEntryWindowMs ?? 10000);
        document.getElementById('opsEventRuleReEntryModeSelect').value = String(scenario?.reEntryMode || 'same-zone');
        document.getElementById('opsEventRuleLineDelayInput').value = String(scenario?.maxDelayAfterCrossingMs ?? baseline.maxDelayAfterCrossingMs ?? 10000);
        document.getElementById('opsEventRuleTriggerDirectionSelect').value = String(scenario?.triggerLine?.direction || 'any');
        document.getElementById('opsEventRuleLoiteringRadiusInput').value = String(scenario?.maxMovementRadius ?? baseline.maxMovementRadius ?? 0.08);
        document.getElementById('opsEventRuleLoiteringPointsInput').value = String(scenario?.minTrajectoryPoints ?? baseline.minTrajectoryPoints ?? 4);
        document.getElementById('opsEventRuleZoneThresholdInput').value = String(scenario?.occupancyThreshold ?? baseline.occupancyThreshold ?? 3);
        document.getElementById('opsEventRuleZoneDwellInput').value = String(scenario?.minDwellTimeMs ?? baseline.minDwellTimeMs ?? 5000);
        document.getElementById('opsEventRuleCooldownInput').value = String(scenario?.cooldownMs ?? baseline.cooldownMs ?? 5000);
        opsRulesSetFormDisabled('event-rule', detailMode === 'view');
        opsEventRuleUpdateModeUi();
      }
      function opsRulesFillProfileForm(item, detailMode) {
        document.getElementById('opsProfileIdInput').value = String(item?.id || item?.profileId || '');
        document.getElementById('opsProfileDetectorSelect').value = String(item?.detector || 'yolo');
        document.getElementById('opsProfileFpsInput').value = String(item?.fps ?? 6);
        document.getElementById('opsProfileQueueInput').value = String(item?.maxQueue ?? 1);
        document.getElementById('opsProfileConfidenceInput').value = String(item?.confidence ?? 0.25);
        document.getElementById('opsProfileNmsInput').value = String(item?.nms ?? 0.45);
        document.getElementById('opsProfileInputWidthInput').value = String(item?.inputWidth ?? 640);
        document.getElementById('opsProfileInputHeightInput').value = String(item?.inputHeight ?? 640);
        document.getElementById('opsProfileAdaptiveToggle').checked = item?.adaptive !== false;
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
          if (type === 'intrusion-dwell') {
            scenario.candidateTimeMs = Number(document.getElementById('opsEventRuleCandidateInput')?.value || scenario.candidateTimeMs || 2000);
            scenario.dwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.dwellTimeMs || 10000);
          } else if (type === 're-entry') {
            scenario.reEntryWindowMs = Number(document.getElementById('opsEventRuleReEntryWindowInput')?.value || scenario.reEntryWindowMs || 10000);
            scenario.reEntryMode = String(document.getElementById('opsEventRuleReEntryModeSelect')?.value || scenario.reEntryMode || 'same-zone');
          } else if (type === 'intrusion-after-line-crossing') {
            scenario.maxDelayAfterCrossingMs = Number(document.getElementById('opsEventRuleLineDelayInput')?.value || scenario.maxDelayAfterCrossingMs || 10000);
            scenario.dwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.dwellTimeMs || 3000);
            scenario.triggerLine = {
              ...(scenario.triggerLine || {}),
              direction: String(document.getElementById('opsEventRuleTriggerDirectionSelect')?.value || scenario.triggerLine?.direction || 'any')
            };
          } else if (type === 'loitering') {
            scenario.minDwellTimeMs = Number(document.getElementById('opsEventRuleDwellInput')?.value || scenario.minDwellTimeMs || 30000);
            scenario.maxMovementRadius = Number(document.getElementById('opsEventRuleLoiteringRadiusInput')?.value || scenario.maxMovementRadius || 0.08);
            scenario.minTrajectoryPoints = Number(document.getElementById('opsEventRuleLoiteringPointsInput')?.value || scenario.minTrajectoryPoints || 4);
          } else if (type === 'zone-occupancy') {
            scenario.occupancyThreshold = Number(document.getElementById('opsEventRuleZoneThresholdInput')?.value || scenario.occupancyThreshold || 3);
            scenario.minDwellTimeMs = Number(document.getElementById('opsEventRuleZoneDwellInput')?.value || scenario.minDwellTimeMs || 5000);
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
        const payload = {
          ...base,
          id,
          name: String(document.getElementById('opsVaRuleNameInput')?.value || '').trim() || `채널 분석 설정 ${id}`,
          enabled: String(document.getElementById('opsVaRuleEnabledInput')?.value || 'true') !== 'false',
          source: channel ? opsRulesSourcePayload(channel.source) : opsRulesClone(base.source || opsRulesVaRuleSkeleton(id).source),
          analysis: {
            ...(base.analysis || {}),
            profileId: String(document.getElementById('opsVaRuleProfileSelect')?.value || opsRulesPreferredProfileId())
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
          adaptive: document.getElementById('opsProfileAdaptiveToggle')?.checked !== false
        };
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
      async function opsRulesSaveNativeRecord(mode) {
        const current = opsRulesCurrentRecord?.item || {};
        if (mode === 'va-rule') {
          const forcedId = String(document.getElementById('opsVaRuleIdInput')?.value || '').trim() || opsRulesNextNumericId(opsCatalogVaRules, 1);
          document.getElementById('opsVaRuleIdInput').value = forcedId;
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
          document.getElementById('opsEventRuleIdInput').value = forcedId;
          const payload = opsRulesReadEventTemplateForm(current, forcedId);
          if (!payload.id) throw new Error('이벤트 템플릿 ID가 필요합니다.');
          if (!opsRulesEventTypeForItem(payload)) throw new Error('이벤트/시나리오 종류를 선택하세요.');
          if (!Array.isArray(payload.analysis?.classes) || payload.analysis.classes.length === 0) {
            throw new Error('분석 대상을 하나 이상 선택하세요.');
          }
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
            const idInput = document.getElementById('opsProfileIdInput');
            if (idInput) idInput.value = payload.id;
          }
          if (!payload.id) throw new Error('분석 프로파일 ID가 필요합니다.');
          if (!Number.isFinite(payload.fps) || payload.fps <= 0) throw new Error('분석 FPS는 1 이상이어야 합니다.');
          if (!Number.isFinite(payload.inputWidth) || !Number.isFinite(payload.inputHeight) || payload.inputWidth <= 0 || payload.inputHeight <= 0) {
            throw new Error('입력 해상도는 1 이상이어야 합니다.');
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
        } catch (error) {
          closeOpsRulesEditor();
          opsRulesEditorStatus(`룰 편집기 로드 실패: ${error.message}`, true);
        }
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
        return `<div class="table-actions ops-rule-row-actions">${actions.join('')}</div>`;
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
        if (summary) {
          if (!viewId) {
            summary.textContent = 'PublishedView가 있는 채널을 골라야 미리보기를 열 수 있습니다.';
          } else if (hasSession) {
            summary.textContent = `${channelLabel || viewId} 미리보기를 보고 있습니다. 필요할 때 정지하거나 다시 연결할 수 있습니다.`;
          } else {
            summary.textContent = `${channelLabel || viewId} 영상을 재생해 영역/라인 기준을 확인할 수 있습니다.`;
          }
        }
        if (placeholder) {
          placeholder.hidden = hasSession;
          placeholder.textContent = opsVaRulePreviewState.lastError || (viewId ? '재생 버튼으로 채널 영상을 확인하세요.' : '채널을 먼저 고르세요.');
        }
        if (startBtn) startBtn.disabled = !viewId || hasSession;
        if (restartBtn) restartBtn.disabled = !viewId;
        if (stopBtn) stopBtn.disabled = !hasSession;
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
        const viewId = opsRulesCurrentVaPreviewViewId();
        if (!viewId) {
          updateOpsVaRulePreviewUi();
          return;
        }
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
        try {
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
                : 'raw'
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
          const kind = channel?.source?.kind ? opsRulesSourceKindLabel(channel.source.kind) : '입력';
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
        return `<div class="channel-stream-actions">
          <button type="button" class="secondary" data-ops-rule-copy-kind="rtsp" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="이 채널 분석 설정의 RTSP URL 복사" aria-label="이 채널 분석 설정의 RTSP URL 복사">RTSP 복사</button>
          <button type="button" class="secondary" data-ops-rule-copy-kind="whep" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="이 채널 분석 설정의 WHEP URL 복사" aria-label="이 채널 분석 설정의 WHEP URL 복사">WHEP 복사</button>
          <button type="button" class="secondary" data-ops-rule-copy-kind="client" data-ops-rule-copy-id="${escapeHtml(ruleId)}" data-ops-rule-copy-view="${escapeHtml(viewId)}" title="이 채널 분석 설정의 WebRTC 링크 복사" aria-label="이 채널 분석 설정의 WebRTC 링크 복사"${viewId ? '' : ' disabled'}>WebRTC 복사</button>
        </div>`;
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
        } else if (type === 'intrusion-after-line-crossing') {
          const delay = opsRulesMsLabel(scenario?.maxDelayAfterCrossingMs);
          const dwell = opsRulesMsLabel(scenario?.dwellTimeMs);
          const direction = scenario?.triggerLine?.direction || 'any';
          if (delay) details.push(`라인 후 ${delay}`);
          if (dwell) details.push(`체류 ${dwell}`);
          details.push(direction === 'forward' ? '정방향' : (direction === 'reverse' ? '역방향' : '양방향'));
        } else if (type === 'loitering') {
          const dwell = opsRulesMsLabel(scenario?.minDwellTimeMs);
          if (dwell) details.push(`체류 ${dwell}`);
          if (Number.isFinite(Number(scenario?.maxMovementRadius))) {
            details.push(`반경 ${Number(scenario.maxMovementRadius).toFixed(2)}`);
          }
        } else if (type === 'zone-occupancy') {
          if (Number.isFinite(Number(scenario?.occupancyThreshold))) {
            details.push(`임계 ${Number(scenario.occupancyThreshold)}`);
          }
          const dwell = opsRulesMsLabel(scenario?.minDwellTimeMs);
          if (dwell) details.push(`체류 ${dwell}`);
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
          setTableEmpty(body, 8, '저장된 채널 분석 설정이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const id = String(item?.id || '');
          const statusHtml = opsRulesStatusBadge(item?.enabled !== false);
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-va', id),
            opsRuleActionButton('삭제', 'delete-va', id, 'danger')
          ]);
          const statusCellHtml = `<div class="ops-rule-status-actions">${statusHtml}</div>`;
          return `<tr>
            ${tableCellHtml('ID', opsRulesIdentityBadgeHtml('id', itemId(item)))}
            ${tableCellHtml('채널', opsRulesVaRuleChannelHtml(item))}
            ${tableCellHtml('이벤트 템플릿', opsRulesVaRuleTemplateHtml(item))}
            ${tableCellHtml('프로파일', opsRulesVaRuleProfileHtml(item))}
            ${tableCellHtml('영역/라인', opsRulesGeometryHtml(item))}
            ${tableCellHtml('출력', opsRulesVaOutputButtonsHtml(item))}
            ${tableCellHtml('상태', statusCellHtml, 'table-cell-nowrap table-cell-status')}
            ${tableCellHtml('작업', actionsHtml, 'table-cell-actions')}
          </tr>`;
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
          return `<tr>
            ${tableCellHtml('ID', opsRulesIdentityBadgeHtml('template', itemId(item)))}
            ${tableCellHtml('구분', opsRulesEventModeHtml(item))}
            ${tableCellHtml('종류', opsRulesEventSummaryHtml(item))}
            ${tableCellHtml('대상', opsRulesTargetHtml(item?.analysis?.classes || item?.scenario?.targetClasses || []))}
            ${tableCellHtml('조건', opsRulesConditionHtml(item))}
            ${tableCellHtml('작업', actionsHtml, 'table-cell-actions')}
          </tr>`;
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
          setTableEmpty(body, 6, '분석 프로파일이 없습니다.');
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
          const inputNote = `queue ${display(item.maxQueue ?? 1)} · conf ${display(item.confidence ?? 0.25)} · nms ${display(item.nms ?? 0.45)}`;
          const inputHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(inputSize)}</strong>
            <span class="ops-rule-note">${escapeHtml(inputNote)}</span>
          </div>`;
          const usageHtml = `<div class="ops-rule-value-stack">
            <strong>${escapeHtml(opsProfileUsageSummary(id))}</strong>
          </div>`;
          return `<tr>
            ${tableCellHtml('ID', opsRulesIdentityBadgeHtml('profile', itemId(item)))}
            ${tableCellHtml('검출기', detectorHtml)}
            ${tableCellHtml('FPS', fpsHtml)}
            ${tableCellHtml('입력', inputHtml)}
            ${tableCellHtml('사용처', usageHtml)}
            ${tableCellHtml('작업', actionsHtml, 'table-cell-actions')}
          </tr>`;
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
            issues.push(opsRulesIssue('missing-source', `va-rule:${id}`, `채널 분석 설정 ${id}의 source가 채널 목록에 없습니다.`, '채널 탭에서 source와 PublishedView를 다시 저장하세요.'));
          } else if (channel.view && !opsRulesSourceMatches(channel.source, rule.source || {})) {
            issues.push(opsRulesIssue('source-mismatch', `va-rule:${id}`, `채널 분석 설정 ${id}의 source가 PublishedView source와 다릅니다.`, `${channel.displayName || channel.id} 채널의 source와 룰 source를 맞추세요.`));
          }
          if (channel?.source?.enabled === false) {
            issues.push(opsRulesIssue('inactive-channel', `va-rule:${id}`, `채널 분석 설정 ${id}가 비활성 채널에 연결되어 있습니다.`, `${channel.displayName || channel.id} 채널을 활성화하거나 다른 채널로 연결하세요.`));
          }
          if (channel?.view?.enabled === false) {
            issues.push(opsRulesIssue('inactive-view', `va-rule:${id}`, `채널 분석 설정 ${id}가 비활성 PublishedView에 연결되어 있습니다.`, '채널 탭에서 PublishedView를 활성화한 뒤 저장하세요.'));
          }
          if (channel?.view && !opsRulesViewAllowsVaRuleMode(channel.view)) {
            issues.push(opsRulesIssue('view-mode-not-allowed', `va-rule:${id}`, `PublishedView가 va-rule 모드를 허용하지 않습니다.`, '채널 탭에서 보기 방식에 va-rule을 추가해야 Client Live에서 사용할 수 있습니다.'));
          }
          if (channel?.view && !opsRulesViewHasClientAccess(channel.view)) {
            issues.push(opsRulesIssue('unauthorized-view', `va-rule:${id}`, `PublishedView가 Client 노출 권한을 모두 닫고 있습니다.`, 'dashboard/events/metadata 중 최소 하나를 허용한 view에 룰을 연결하세요.'));
          }
          if (channel?.view && id !== '(미지정)' && !opsRulesViewAllowsRuleId(channel.view, id)) {
            issues.push(opsRulesIssue('view-rule-not-allowed', `va-rule:${id}`, `PublishedView 허용 룰 목록에 ${id}가 없습니다.`, '채널 탭에서 defaultRuleId/allowedRuleIds를 맞추거나 룰을 다시 연결하세요.'));
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
            issues.push(opsRulesIssue('unauthorized-view', `view:${viewId}`, `PublishedView ${viewId}가 룰을 참조하지만 Client 노출 권한이 없습니다.`, 'dashboard/events/metadata 노출 중 최소 하나를 활성화하세요.'));
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
          list.innerHTML = '<div class="empty">source mismatch, 중복 ID, 누락된 프로파일/템플릿, 비활성 채널/뷰, view 권한 충돌이 없습니다.</div>';
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
          if (channel?.view && !opsRulesViewAllowsVaRuleMode(channel.view)) {
            issues.push('선택한 PublishedView가 va-rule 모드를 허용하지 않습니다.');
          }
          if (channel?.view && !opsRulesViewHasClientAccess(channel.view)) {
            issues.push('선택한 PublishedView에 Client 노출 권한이 없습니다.');
          }
          if (channel?.view && currentId && !opsRulesViewAllowsRuleId(channel.view, id)) {
            issues.push(`선택한 PublishedView의 허용 룰 목록에 ${id}가 없습니다.`);
          }
          issues.push(...opsRulesClassConflictMessages(payload, template, profile));
          if (channel?.source && payload?.source && !opsRulesSourceMatches(channel.source, payload.source)) {
            issues.push('선택한 채널 source와 룰 source가 일치하지 않습니다.');
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
        if (!window.confirm(`채널 분석 설정 ${opsRulesIdText(id)}${name}을 삭제할까요?`)) return;
        await requestJson(`${opsLabVaRulesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
        if (!window.confirm(`이벤트 템플릿 '${id}'를 삭제할까요?`)) return;
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
        if (!window.confirm(`분석 프로파일 '${id}'를 삭제할까요?${usagePrompt}`)) return;
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
        document.getElementById('opsCreateVaRuleBtn')?.addEventListener('click', () => openOpsRulesEditor('va-rule', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateEventRuleBtn')?.addEventListener('click', () => openOpsRulesEditor('event-rule', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateProfileBtn')?.addEventListener('click', () => openOpsRulesEditor('profile', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqProfilesAction')?.addEventListener('click', () => selectOpsRulesMode('profile').then(() => openOpsRulesEditor('profile', 'new')).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqTemplatesAction')?.addEventListener('click', () => selectOpsRulesMode('event-rule').then(() => openOpsRulesEditor('event-rule', 'new')).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesPrereqVaRulesAction')?.addEventListener('click', () => selectOpsRulesMode('va-rule').then(() => openOpsRulesEditor('va-rule', 'new')).catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVaRuleTemplateSeedSelect')?.addEventListener('change', (event) => opsRulesApplyVaRuleTemplateSeed(event.target.value || ''));
        document.getElementById('opsVaRuleChannelSelect')?.addEventListener('change', () => {
          opsRulesUpdateVaRuleFormSummary();
          stopOpsVaRulePreview({ preserveView: false }).catch(() => {});
          updateOpsVaRulePreviewUi();
        });
        document.getElementById('opsVaRuleIdInput')?.addEventListener('input', () => {
          opsRulesUpdateVaRuleFormSummary();
        });
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
        document.getElementById('opsEventsRefresh')?.addEventListener('click', () => refreshEvents().catch(error => setText('eventRecordSummary', error.message)));
        document.getElementById('eventRecordsEvidenceSelect')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
        document.getElementById('eventRecordsIncludeArchives')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventRecordSummary', error.message));
        });
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
    const bulkSelectAll = document.querySelector('#channel-bulk-select-all');
    const bulkDryRun = document.querySelector('#channel-bulk-dry-run');
    const bulkValidateButton = document.querySelector('#channel-bulk-validate');
    const bulkCloneButton = document.querySelector('#channel-bulk-clone');
    const bulkDisableButton = document.querySelector('#channel-bulk-disable');
    const bulkRetryFailedButton = document.querySelector('#channel-bulk-retry-failed');
    const bulkRollbackButton = document.querySelector('#channel-bulk-rollback');
    const bulkSummary = document.querySelector('#channelBulkSummary');
    const bulkDiagnostics = document.querySelector('#channelBulkDiagnostics');
    const streamRoute = ")OPSSOURCES" << stream_route_json << R"OPSSOURCES(";
    const rtspPort = )OPSSOURCES" << rtsp_port << R"OPSSOURCES(;
    let loadedSources = [];
    let loadedViews = [];
    let currentChannelId = '';
    let editorMode = 'view';
    let currentChannelEnabled = true;
    let initializedHashChannel = false;
    let lastChannelBulkResult = null;
    let lastChannelBulkPreview = null;
    const selectedChannelIds = new Set();
	    const { escapeHtml, requestJson, formDataObject, setFeedback, showToast, setTableEmpty, tableCellHtml, setSelectOptions, recordOpsAudit, renderOpsAuditTrail } = window.MediaServerUi;
	    const hashParams = () => new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
	    const setStatus = (message, failed = false) => {
	      setFeedback(statusEl, message, failed, { collapseEmpty: true });
	    };
	    const setChannelValidation = message => {
	      setFeedback(channelValidation, message, Boolean(message));
	    };
    const kindLabel = kind => ({
      file: '파일',
      rtsp: 'RTSP pull',
      whep: '외부 WHEP pull',
      webrtc: 'Published WebRTC',
      http: 'HTTP/HLS pull'
    })[kind] || kind || '미제공';
    const locatorForSource = source => {
      if (source.webrtcSourceId) return `Published sourceId: ${source.webrtcSourceId}`;
      if (source.whepUrl) return `외부 WHEP URL: ${source.whepUrl}`;
      return source.file || source.rtspUrl || source.httpUrl || '미제공';
    };
    const streamTransportLabel = type => ({
      rtsp: 'RTSP',
      whep: 'WHEP'
    })[type] || type;
    const streamModeLabel = mode => mode === 'va' ? 'VA' : '라이브';
    const streamCopyLabel = (type, mode) => `${streamTransportLabel(type)} ${streamModeLabel(mode)}`;
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
      const copyMode = mode === 'va' ? 'va' : 'raw';
      return `
        <div class="table-actions channel-stream-actions">
          <button type="button" class="secondary" data-copy-stream-type="rtsp" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${label} RTSP 복사" aria-label="${label} RTSP 복사">RTSP</button>
          <button type="button" class="secondary" data-copy-stream-type="whep" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${label} WHEP 복사" aria-label="${label} WHEP 복사">WHEP</button>
        </div>
      `;
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
      const url = streamUrlForChannel(channelId, type, mode || 'raw');
      if (!url) {
        setStatus(`채널 #${channelId}의 ${streamCopyLabel(type, mode)} URL을 만들 수 없습니다.`, true);
        return;
      }
      try {
        await copyTextToClipboard(url);
        setStatus('');
        showToast(`${streamCopyLabel(type, mode)} URL 복사 완료`);
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
      let next = 1;
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
    const selectedChannelRows = () => channelRows(loadedSources, loadedViews)
      .filter(row => selectedChannelIds.has(String(row.id || '')));
    const channelBulkItems = rows => rows.map(row => ({
      sourceId: row.id,
      source: sourcePayloadFromRecord(row.source || {}, row.source?.enabled !== false),
      view: viewPayloadFromRecord(row.view || { viewId: row.id, sourceId: row.id }, row.source || {}, row.view?.enabled !== false)
    }));
    const channelBulkRollbackItems = bulk => {
      const operation = bulk?.operation || '';
      const rows = Array.isArray(bulk?.rows) ? bulk.rows : [];
      const results = Array.isArray(bulk?.result?.results) ? bulk.result.results : [];
      return results
        .map((result, index) => ({ result, row: rows[index] }))
        .filter(item => item.result?.ok && item.row)
        .map(({ result, row }) => {
          if (operation === 'clone') {
            const resultId = String(result.resultSourceId || result.rollbackSourceId || '').trim();
            return {
              sourceId: resultId,
              resultSourceId: resultId,
              rollbackMode: 'disable-created',
              source: sourcePayloadFromRecord(row.source || {}, false),
              view: viewPayloadFromRecord(row.view || { viewId: resultId, sourceId: resultId }, row.source || {}, false)
            };
          }
          return {
            sourceId: row.id,
            rollbackMode: 'restore',
            source: sourcePayloadFromRecord(row.source || {}, row.source?.enabled !== false),
            view: viewPayloadFromRecord(row.view || { viewId: row.id, sourceId: row.id }, row.source || {}, row.view?.enabled !== false)
          };
        });
    };
    const channelBulkDiffPreview = (operation, rows, { rollback = false } = {}) => {
      const items = rollback ? rows.map(row => row.result || row) : channelBulkItems(rows);
      return items.map((item, index) => {
        const row = rows[index] || {};
        const sourceId = String(item.sourceId || row.id || row.sourceId || '');
        const resultSourceId = String(item.resultSourceId || item.rollbackSourceId || sourceId || '(server-assigned)');
        const rollbackMode = String(item.rollbackMode || 'restore');
        const before = {
          sourceId,
          enabled: row.source?.enabled !== false && row.view?.enabled !== false,
          name: row.view?.displayName || row.source?.displayName || sourceId
        };
        let after = before;
        if (operation === 'clone') {
          after = { sourceId: resultSourceId, enabled: false, name: `${before.name || sourceId} 복제` };
        } else if (operation === 'disable') {
          after = { ...before, enabled: false };
        } else if (operation === 'rollback' && rollbackMode === 'disable-created') {
          after = { sourceId: resultSourceId, enabled: false, name: before.name };
        } else if (operation === 'rollback') {
          after = {
            sourceId,
            enabled: item.source?.enabled !== false && item.view?.enabled !== false,
            name: item.view?.displayName || item.source?.displayName || before.name
          };
        }
        return {
          sourceId,
          target: `channel:${resultSourceId || sourceId}`,
          operation,
          rollbackMode,
          before,
          after
        };
      });
    };
    const renderChannelBulkPreview = preview => {
      const items = Array.isArray(preview?.items) ? preview.items : [];
      if (items.length === 0) return '';
      return `<div class="validation-item info">
          ${chip('diff preview', 'info')}
          <div><strong>${escapeHtml(preview.title || '대량 작업 diff preview')}</strong>
          <p>${escapeHtml(preview.note || '감사 로그 before/after에 같은 diff preview가 기록됩니다.')}</p>
          <ul class="compact-list">
            ${items.slice(0, 6).map(item => `<li><span class="token">${escapeHtml(item.target)}</span> ${escapeHtml(display(item.before?.enabled ? '활성' : '비활성'))} → ${escapeHtml(display(item.after?.enabled ? '활성' : '비활성'))} · ${escapeHtml(item.after?.name || item.before?.name || '')}</li>`).join('')}
          </ul></div>
        </div>`;
    };
    const sourceLocatorKey = source => {
      if (!source || !source.kind) return '';
      if (source.kind === 'file') return `file:${source.file || ''}`;
      if (source.kind === 'rtsp') return `rtsp:${source.rtspUrl || source.url || ''}`;
      if (source.kind === 'whep') return `whep:${source.whepUrl || source.url || ''}`;
      if (source.kind === 'webrtc') return `webrtc:${source.webrtcSourceId || source.sourceId || ''}`;
      if (source.kind === 'http' || source.kind === 'hls') return `${source.kind}:${source.httpUrl || source.url || ''}`;
      return `${source.kind}:${source.url || source.file || ''}`;
    };
    function channelBulkIssues(rows) {
      const issues = [];
      const locatorMap = new Map();
      let disabledCount = 0;
      let noViewCount = 0;
      let noStreamUrlCount = 0;
      for (const row of rows) {
        const id = String(row.id || '');
        const source = row.source || {};
        const view = row.view || null;
        if (!view) {
          noViewCount += 1;
          issues.push({ level: 'warn', title: `채널 #${id} PublishedView 없음`, detail: 'client/live와 dashboard 노출 전 view 연결이 필요합니다.' });
        } else if (String(view.sourceId || '') !== id) {
          issues.push({ level: 'warn', title: `채널 #${id} sourceId 불일치`, detail: `view.sourceId=${view.sourceId || '미제공'} · sourceId=${id}` });
        }
        if (source.enabled === false || view?.enabled === false) disabledCount += 1;
        if (!sourceStreamParams(source)) {
          noStreamUrlCount += 1;
          issues.push({ level: 'bad', title: `채널 #${id} 입력 미완성`, detail: `${kindLabel(source.kind)} locator가 없어 RTSP/WHEP URL을 만들 수 없습니다.` });
        }
        const locatorKey = sourceLocatorKey(source);
        if (locatorKey && !locatorKey.endsWith(':')) {
          if (!locatorMap.has(locatorKey)) locatorMap.set(locatorKey, []);
          locatorMap.get(locatorKey).push(id);
        }
      }
      for (const [locator, ids] of locatorMap.entries()) {
        if (ids.length > 1) {
          issues.push({ level: 'warn', title: `중복 입력 ${ids.join(', ')}`, detail: locator });
        }
      }
      return { issues, disabledCount, noViewCount, noStreamUrlCount };
    }
    function renderChannelBulkDiagnostics(forceOpen = false) {
      const rows = channelRows(loadedSources, loadedViews);
      const selectedCount = selectedChannelIds.size;
      const { issues, disabledCount, noViewCount, noStreamUrlCount } = channelBulkIssues(rows);
      if (bulkSummary) {
        bulkSummary.innerHTML = [
          chip(`전체 ${rows.length}`),
          chip(`선택 ${selectedCount}`, selectedCount > 0 ? '' : 'info'),
          chip(`비활성 ${disabledCount}`, disabledCount > 0 ? 'warn' : 'info'),
          chip(`view 누락 ${noViewCount}`, noViewCount > 0 ? 'warn' : 'info'),
          chip(`입력 미완성 ${noStreamUrlCount}`, noStreamUrlCount > 0 ? 'bad' : 'info')
        ].join('');
      }
      if (bulkValidateButton) bulkValidateButton.disabled = rows.length === 0;
      if (bulkCloneButton) bulkCloneButton.disabled = selectedCount === 0;
      if (bulkDisableButton) bulkDisableButton.disabled = selectedCount === 0;
      const failedRetryCount = Array.isArray(lastChannelBulkResult?.failedRows) ? lastChannelBulkResult.failedRows.length : 0;
      const rollbackCount = channelBulkRollbackItems(lastChannelBulkResult).length;
      if (bulkRetryFailedButton) bulkRetryFailedButton.disabled = failedRetryCount === 0;
      if (bulkRollbackButton) bulkRollbackButton.disabled = rollbackCount === 0 || lastChannelBulkResult?.dryRun === true;
      if (bulkSelectAll) {
        bulkSelectAll.checked = rows.length > 0 && selectedCount === rows.length;
        bulkSelectAll.indeterminate = selectedCount > 0 && selectedCount < rows.length;
      }
      if (!bulkDiagnostics) return;
      const previewPanel = renderChannelBulkPreview(lastChannelBulkPreview);
      const resultPanel = lastChannelBulkResult?.result ? `<div class="validation-item ${lastChannelBulkResult.result.failCount ? 'warn' : 'info'}">
          ${chip(lastChannelBulkResult.dryRun ? 'dry-run' : 'bulk', lastChannelBulkResult.result.failCount ? 'warn' : 'info')}
          <div><strong>${escapeHtml(lastChannelBulkResult.operation)} 결과: 성공 ${escapeHtml(display(lastChannelBulkResult.result.okCount))}, 실패 ${escapeHtml(display(lastChannelBulkResult.result.failCount))}</strong>
          <p>감사 ${escapeHtml(lastChannelBulkResult.result.auditAction || 'bulk')} · ${escapeHtml(lastChannelBulkResult.result.retryPolicy || '실패 항목은 수정 후 재시도할 수 있습니다.')} · ${escapeHtml(lastChannelBulkResult.result.rollbackPolicy || '성공 항목은 필요 시 롤백 정책에 따라 되돌립니다.')}</p>
          <a class="btn small" href="#channel-audit-list">감사 이력 보기</a></div>
        </div>` : '';
      if (issues.length === 0 && !forceOpen) {
        bulkDiagnostics.innerHTML = previewPanel + (resultPanel || '<div class="empty">source/view 연결, 중복 입력, 비활성 상태가 정상 범위입니다.</div>');
        return;
      }
      bulkDiagnostics.innerHTML = previewPanel + resultPanel + (issues.length === 0
        ? '<div class="empty">검증 결과: 대량 작업 전 차단할 문제가 없습니다.</div>'
        : issues.map(issue => `<div class="validation-item ${escapeHtml(issue.level)}">
            ${chip(issue.level === 'bad' ? '오류' : '확인', issue.level)}
            <div><strong>${escapeHtml(issue.title)}</strong><p>${escapeHtml(issue.detail)}</p></div>
          </div>`).join(''));
    }
    function syncBulkSelectionFromDom() {
      selectedChannelIds.clear();
      document.querySelectorAll('[data-select-channel]:checked').forEach(input => {
        const id = String(input.dataset.selectChannel || '').trim();
        if (id) selectedChannelIds.add(id);
      });
      renderChannelBulkDiagnostics(false);
    }
    function setFormDisabled(disabled) {
      for (const element of Array.from(channelForm.elements)) {
        element.disabled = disabled;
      }
      saveButton.hidden = disabled;
      editSelectedButton.hidden = !disabled || !currentChannelId;
    }
    function updateKindFields() {
      const kind = channelForm.elements.kind.value || 'file';
      document.querySelectorAll('[data-source-kind]').forEach(field => {
        field.hidden = field.dataset.sourceKind !== kind;
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
	        setTableEmpty(channelBody, 9, '등록된 채널이 없습니다. 채널 추가로 첫 카메라/소스를 등록하세요.');
          renderChannelBulkDiagnostics(false);
	        return;
	      }
        const validIds = new Set(rows.map(row => String(row.id || '')));
        for (const id of Array.from(selectedChannelIds)) {
          if (!validIds.has(id)) selectedChannelIds.delete(id);
        }
	      channelBody.innerHTML = rows.map(row => {
        const source = row.source || {};
        const view = row.view || {};
        const enabled = source.enabled !== false && view.enabled !== false;
        const liveButtons = source.sourceId ? streamButtonsForChannel(source, 'raw') : '<span class="hint">소스 미등록</span>';
        const vaButtons = source.sourceId ? streamButtonsForChannel(source, 'va') : '<span class="hint">소스 미등록</span>';
        const channelName = view.displayName || source.displayName || '';
        const inputText = source.sourceId ? locatorForSource(source) : '소스 미등록';
        const checked = selectedChannelIds.has(String(row.id || '')) ? ' checked' : '';
        const selectCellHtml = `<input type="checkbox" data-select-channel="${escapeHtml(row.id || '')}" aria-label="채널 ${escapeHtml(row.id || '')} 선택"${checked} />`;
        const idCellHtml = `<div class="channel-id-cell">
          <span class="table-identity-pill table-identity-id">${escapeHtml(row.id || '-')}</span>
        </div>`;
        const kindCellHtml = `<div class="channel-kind-cell">
          <strong>${escapeHtml(kindLabel(source.kind))}</strong>
        </div>`;
        const statusCellHtml = `<div class="table-actions channel-status-actions">
          ${enabled ? chip('활성') : chip('비활성', 'warn')}
          <button type="button" class="secondary" data-toggle-channel="${escapeHtml(row.id || '')}">${enabled ? '비활성화' : '적용'}</button>
        </div>`;
        const inputCellHtml = `<div class="channel-input-stack">
          <span class="token">${escapeHtml(inputText)}</span>
          ${source.sourceId ? '' : '<span class="channel-source-note">PublishedView 연결 전</span>'}
        </div>`;
        const actionsCellHtml = `<div class="table-actions channel-row-actions">
          <button type="button" class="secondary" data-view-channel="${escapeHtml(row.id || '')}">상세</button>
          <button type="button" class="secondary" data-clone-channel="${escapeHtml(row.id || '')}">복제</button>
          <button type="button" class="secondary" data-open-client-live="${escapeHtml(row.id || '')}" ${view?.enabled === false ? 'disabled' : ''}>라이브 보기</button>
          <button type="button" class="danger" data-delete-channel="${escapeHtml(row.id || '')}">삭제</button>
        </div>`;
        return `
        <tr>
          ${tableCellHtml('선택', selectCellHtml, 'table-cell-status')}
          ${tableCellHtml('ID', idCellHtml)}
          ${tableCellHtml('이름', escapeHtml(channelName))}
          ${tableCellHtml('종류', kindCellHtml)}
          ${tableCellHtml('상태', statusCellHtml, 'table-cell-status')}
          ${tableCellHtml('입력', inputCellHtml)}
          ${tableCellHtml('라이브 URL', liveButtons)}
          ${tableCellHtml('VA URL', vaButtons)}
          ${tableCellHtml('작업', actionsCellHtml, 'table-cell-actions')}
	        </tr>
	      `;
	      }).join('');
        renderChannelBulkDiagnostics(false);
	      bindChannelRowActions();
	    }
	    function bindChannelRowActions() {
        document.querySelectorAll('[data-select-channel]').forEach(input => {
          input.addEventListener('change', syncBulkSelectionFromDom);
        });
	      document.querySelectorAll('[data-view-channel]').forEach(button => {
	        button.addEventListener('click', () => openChannel(button.dataset.viewChannel || '', 'view'));
	      });
      document.querySelectorAll('[data-clone-channel]').forEach(button => {
        button.addEventListener('click', () => openChannel(button.dataset.cloneChannel || '', 'clone'));
      });
      document.querySelectorAll('[data-toggle-channel]').forEach(button => {
        button.addEventListener('click', () => toggleChannelEnabled(button.dataset.toggleChannel || ''));
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
	        button.addEventListener('click', () => deleteChannel(button.dataset.deleteChannel || ''));
	      });
	    }
    async function loadFileOptions(selected = '') {
      const select = channelForm.elements.file;
      try {
        const payload = await requestJson('/lab/files');
        const files = Array.isArray(payload.files) ? payload.files : [];
        if (files.length === 0) return;
        const previous = selected || select.value || payload.defaultFile || files[0];
        setSelectOptions(select, files);
        select.value = files.includes(previous) ? previous : files[0];
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
        ownerGroup: source.ownerGroup || ''
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
      channelForm.reset();
      channelForm.elements.channelId.value = nextChannelId();
      currentChannelEnabled = true;
      setChannelValidation('');
      updateKindFields();
      loadFileOptions();
      channelPanel.hidden = false;
      syncEditorChrome(mode, '');
      channelPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      channelForm.elements.channelId.focus();
    }
    function fillChannel(id, mode = 'view') {
      const source = findSource(id) || {};
      const view = findChannelView(id) || {};
      const isClone = mode === 'clone';
      channelForm.elements.channelId.value = isClone ? nextChannelId(id) : id;
      channelForm.elements.displayName.value = view.displayName || source.displayName || '';
      channelForm.elements.kind.value = source.kind || 'file';
      loadFileOptions(source.file || '');
      channelForm.elements.rtspUrl.value = source.rtspUrl || '';
      channelForm.elements.webrtcSourceId.value = source.webrtcSourceId || '';
      channelForm.elements.whepUrl.value = source.whepUrl || '';
      channelForm.elements.httpUrl.value = source.httpUrl || '';
      currentChannelEnabled = isClone ? false : (source.enabled !== false && view.enabled !== false);
      if (isClone && channelForm.elements.displayName.value) {
        channelForm.elements.displayName.value = `${channelForm.elements.displayName.value} 복제`;
      }
      updateKindFields();
      setChannelValidation('');
      channelPanel.hidden = false;
      syncEditorChrome(mode, isClone ? '' : id);
      channelPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function openChannel(id, mode = 'view') {
      if (!id) return;
      fillChannel(id, mode);
    }
    function validateChannelForm(form) {
      const data = formDataObject(form);
      if (!isNumericChannelId(data.channelId)) return '채널 ID는 1 이상의 숫자만 사용할 수 있습니다.';
      const kind = data.kind || 'file';
      const locatorByKind = {
        file: data.file,
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
      return '';
    }
    function channelPayloadsFromFormData(data) {
      const channelId = data.channelId.trim();
      const sourcePayload = {
        sourceId: channelId,
        displayName: data.displayName,
        kind: data.kind,
        enabled: currentChannelEnabled,
        tags: [],
        ownerGroup: ''
      };
      if (data.kind === 'file') sourcePayload.file = (data.file || '').trim();
      if (data.kind === 'rtsp') sourcePayload.rtspUrl = (data.rtspUrl || '').trim();
      if (data.kind === 'webrtc') sourcePayload.webrtcSourceId = (data.webrtcSourceId || '').trim();
      if (data.kind === 'whep') sourcePayload.whepUrl = (data.whepUrl || '').trim();
      if (data.kind === 'http') sourcePayload.httpUrl = (data.httpUrl || '').trim();
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
      const [sources, views, clientViews] = await Promise.all([
        requestJson('/ops/api/sources'),
        requestJson('/ops/api/views'),
        requestJson('/client/api/views')
      ]);
      loadedSources = sources.sources || [];
      loadedViews = views.views || [];
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
    async function runChannelBulkOperation(operation, rows, { dryRun = false, rollback = false, previewTitle = '', previewNote = '' } = {}) {
      if (rows.length === 0) {
        setStatus('대량 작업을 수행할 채널을 선택하세요.', true);
        return;
      }
      const items = rollback ? rows.map(row => row.result || row) : channelBulkItems(rows);
      const diffPreview = channelBulkDiffPreview(operation, rows, { rollback });
      lastChannelBulkPreview = {
        title: previewTitle || (rollback ? '롤백 실행 전 diff preview' : `${operation} 실행 diff preview`),
        note: previewNote || '이 preview는 bulk 감사 로그 before에 함께 기록됩니다.',
        items: diffPreview
      };
      const result = await requestJson('/ops/api/channels/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, dryRun, items })
      });
      const failedSourceIds = new Set((result.results || []).filter(item => !item.ok && item.retryable !== false).map(item => String(item.sourceId || '')));
      const failedRows = rows.filter(row => failedSourceIds.has(String(row.id || row.sourceId || '')));
      lastChannelBulkResult = { operation, rows, result, dryRun, failedRows, diffPreview };
      if (!dryRun) {
        selectedChannelIds.clear();
        await loadAll();
      } else {
        renderChannelBulkDiagnostics(true);
      }
      await recordOpsAudit({
        area: 'channels',
        action: result.auditAction || (dryRun ? 'bulk-dry-run' : (operation === 'rollback' ? 'bulk-rollback' : `bulk-${operation}`)),
        target: (Array.isArray(result.auditTargets) ? result.auditTargets : (result.results || []).map(item => `channel:${item.resultSourceId || item.sourceId}`)).join(', '),
        before: { rows: rows.map(row => ({ source: row.source || null, view: row.view || null })), diffPreview },
        after: { ...result, diffPreview }
      });
      renderOpsAuditTrail('channel-audit-list', 'channels');
      const failed = Number(result.failCount || 0);
      setStatus(`${operation} ${dryRun ? 'dry-run ' : ''}완료: 성공 ${result.okCount ?? 0}, 실패 ${failed}`, failed > 0);
      return result;
    }
    async function bulkDisableSelectedChannels() {
      const rows = selectedChannelRows();
      if (rows.length === 0) {
        setStatus('비활성화할 채널을 선택하세요.', true);
        return;
      }
      try {
        await runChannelBulkOperation('disable', rows, { dryRun: bulkDryRun?.checked === true });
      } catch (error) {
        setStatus(`선택 비활성화 실패: ${error.message}`, true);
      }
    }
    async function bulkCloneSelectedChannels() {
      const rows = selectedChannelRows();
      if (rows.length === 0) {
        setStatus('복제할 채널을 선택하세요.', true);
        return;
      }
      try {
        const result = await runChannelBulkOperation('clone', rows, { dryRun: bulkDryRun?.checked === true });
        const created = (result.results || []).filter(item => item.ok).map(item => item.resultSourceId).filter(Boolean);
        setStatus(`${bulkDryRun?.checked ? '복제 dry-run' : '복제 채널 생성'} 완료: ${created.join(', ') || '없음'} · 실패 ${result.failCount ?? 0}`, Number(result.failCount || 0) > 0);
      } catch (error) {
        setStatus(`선택 복제 실패: ${error.message}`, true);
      }
    }
    async function retryFailedChannelBulk() {
      const rows = Array.isArray(lastChannelBulkResult?.failedRows) ? lastChannelBulkResult.failedRows : [];
      if (!lastChannelBulkResult || rows.length === 0) {
        setStatus('재시도할 실패 항목이 없습니다.', true);
        return;
      }
      try {
        lastChannelBulkPreview = {
          title: '실패 재시도 전 diff preview',
          note: '실패 항목만 다시 실행하며, 이 preview가 감사 로그에 연결됩니다.',
          items: channelBulkDiffPreview(lastChannelBulkResult.operation, rows)
        };
        renderChannelBulkDiagnostics(true);
        await runChannelBulkOperation(lastChannelBulkResult.operation, rows, {
          dryRun: false,
          previewTitle: '실패 재시도 전 diff preview',
          previewNote: '실패 항목만 다시 실행하며, 이 preview가 감사 로그에 연결됩니다.'
        });
      } catch (error) {
        setStatus(`실패 항목 재시도 실패: ${error.message}`, true);
      }
    }
    async function rollbackSuccessfulChannelBulk() {
      const items = channelBulkRollbackItems(lastChannelBulkResult);
      if (!lastChannelBulkResult || items.length === 0) {
        setStatus('롤백할 성공 항목이 없습니다.', true);
        return;
      }
      try {
        const rows = items.map(item => ({
          id: item.sourceId,
          sourceId: item.sourceId,
          source: item.source,
          view: item.view,
          result: item
        }));
        await runChannelBulkOperation('rollback', rows, { dryRun: false, rollback: true });
      } catch (error) {
        setStatus(`성공 항목 롤백 실패: ${error.message}`, true);
      }
    }
    async function deleteChannel(id) {
      if (!id) id = channelForm.elements.channelId.value.trim();
      if (!id) return;
      if (!window.confirm(`채널 #${id}을 삭제할까요? 현재 API는 source/view를 비활성화합니다.`)) return;
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
        if (currentChannelId === id) channelPanel.hidden = true;
      } catch (error) {
        setStatus(error.message, true);
      }
    }
    document.querySelector('#add-channel').addEventListener('click', () => resetChannelForm('new'));
    closeChannelButton.addEventListener('click', () => {
      channelPanel.hidden = true;
      document.querySelector('[data-ops-panel], .panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    editSelectedButton.addEventListener('click', () => currentChannelId && fillChannel(currentChannelId, 'edit'));
    channelForm.elements.kind.addEventListener('change', updateKindFields);
    document.querySelector('#refresh').addEventListener('click', () => loadAll().catch(error => setStatus(error.message, true)));
    bulkSelectAll?.addEventListener('change', () => {
      const rows = channelRows(loadedSources, loadedViews);
      selectedChannelIds.clear();
      if (bulkSelectAll.checked) {
        for (const row of rows) {
          if (row.id) selectedChannelIds.add(String(row.id));
        }
      }
      renderChannels(loadedSources, loadedViews);
    });
    bulkValidateButton?.addEventListener('click', () => renderChannelBulkDiagnostics(true));
    bulkCloneButton?.addEventListener('click', () => bulkCloneSelectedChannels());
    bulkDisableButton?.addEventListener('click', () => bulkDisableSelectedChannels());
    bulkRetryFailedButton?.addEventListener('click', () => retryFailedChannelBulk());
    bulkRollbackButton?.addEventListener('click', () => rollbackSuccessfulChannelBulk());
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
    const passwordFields = document.querySelector('#password-fields');
    const scopePreview = document.querySelector('#scope-template-preview');
    const scopeTemplateButtons = [
      document.querySelector('#apply-view-scope-template'),
      document.querySelector('#apply-role-default-scope-template'),
      document.querySelector('#clear-custom-scopes')
    ];
    let loadedUsers = [];
    let loadedRequests = [];
    let editorMode = 'view';
    const {
      escapeHtml,
      requestJson,
      formDataObject,
      setFeedback,
      splitList,
      setHidden,
      setRequired,
      setTableEmpty,
      appendTableCell,
      recordOpsAudit,
      renderOpsAuditTrail
    } = window.MediaServerUi;
    const setStatus = (message, failed = false) => setFeedback(statusEl, message, failed);
    const setRequestStatus = (message, failed = false) => setFeedback(requestStatusEl, message, failed);
    function hideUserEditor() {
      userDetailPanel.hidden = true;
      editorMode = 'view';
    }
    function setInviteOutput(text = '') {
      inviteOutput.textContent = text;
      inviteOutput.hidden = !text;
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
      userDetailPanel.hidden = false;
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
      updateAssignmentVisibility();
    }
    function updateAssignmentVisibility() {
      const role = form.elements.role.value;
      assignment.style.display = (role === 'viewer' || role === 'integrator') ? 'grid' : 'none';
      updateScopeTemplatePreview();
    }
    const scopedRoleTarget = viewId => String(viewId || '').trim() || '__unassigned__';
    function scopeTemplateForRole(role, viewId = '') {
      const normalizedRole = String(role || '').trim().toLowerCase();
      const target = scopedRoleTarget(viewId);
      if (normalizedRole === 'admin') return ['*'];
      if (normalizedRole === 'operator') {
        return ['ops:read', 'rule:write', 'source:write', 'dashboard:read:*', 'event:read:*'];
      }
      if (normalizedRole === 'viewer') {
        return [`view:read:${target}`, `dashboard:read:${target}`, `event:read:${target}`, `metadata:read:${target}`];
      }
      if (normalizedRole === 'integrator') {
        return [`metadata:read:${target}`, `event:read:${target}`];
      }
      return [];
    }
    function viewIdFromScopes(scopes) {
      const targets = new Set();
      for (const scope of Array.isArray(scopes) ? scopes : []) {
        const match = String(scope || '').trim().match(/^(view|dashboard|event|metadata):read:(.+)$/);
        if (match && match[2] && match[2] !== '*' && match[2] !== '__unassigned__') {
          targets.add(match[2]);
        }
      }
      return targets.size === 1 ? Array.from(targets)[0] : '';
    }
    function updateScopeTemplatePreview() {
      if (!scopePreview) return;
      const role = form.elements.role.value;
      const viewId = String(form.elements.viewId.value || '').trim();
      const scopes = scopeTemplateForRole(role, viewId);
      const scopedRole = role === 'viewer' || role === 'integrator';
      const suffix = scopedRole && !viewId
        ? '채널 ID가 비어 있어 미배정 범위로 계산됩니다.'
        : `적용 예정 ${scopes.length}개`;
      scopePreview.textContent = scopes.length
        ? `${suffix}: ${scopes.join(', ')}`
        : '이 역할에는 적용할 권한 템플릿이 없습니다.';
    }
    function applyScopeTemplate(useRoleDefault = false) {
      const role = form.elements.role.value;
      const viewId = useRoleDefault ? '' : form.elements.viewId.value;
      const scopes = scopeTemplateForRole(role, viewId);
      form.elements.scopes.value = scopes.join('\n');
      updateScopeTemplatePreview();
    }
    function formPayload() {
      const data = formDataObject(form);
      return {
        username: data.username.trim(),
        displayName: data.displayName.trim(),
        role: data.role,
        viewId: data.viewId.trim(),
        scopes: splitList(data.scopes || ''),
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
    function yesNo(value) {
      return value ? '예' : '아니오';
    }
    function displayValue(value, fallback = '미제공') {
      return value === null || value === undefined || value === '' ? fallback : String(value);
    }
    function fillForm(user) {
      form.elements.username.value = user.username;
      form.elements.displayName.value = user.displayName || '';
      form.elements.role.value = user.role || 'viewer';
      form.elements.viewId.value = viewIdFromScopes(user.scopes || []);
      form.elements.scopes.value = (user.scopes || []).join('\n');
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      form.elements.enabled.checked = Boolean(user.enabled);
      form.elements.mustChangePassword.checked = Boolean(user.mustChangePassword);
      setEditorMode('view', `사용자 @${user.username}`, user.username);
      userDetailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function resetUserForm() {
      form.reset();
      form.elements.role.value = 'viewer';
      form.elements.enabled.checked = true;
      form.elements.mustChangePassword.checked = true;
      setEditorMode('new', '사용자 추가');
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
        appendLabeledCell(tr, '상태', `<div class="user-status-actions">${chip(user.enabled ? '활성' : '비활성', user.enabled ? '' : 'warn')}</div>`, 'table-cell-status');
        appendLabeledCell(tr, '권한 범위', userScopeHtml(user.scopes), 'user-scope-cell');
        appendLabeledCell(tr, '마지막 로그인', userValueHtml(user.lastLoginAt || '미제공'));
        appendLabeledCell(tr, '잠금 만료', userValueHtml(user.lockedUntil || '없음'));
        appendLabeledCell(tr, '비밀번호 변경', userValueHtml(yesNo(user.mustChangePassword)));
        const actionsHtml = `
          <div class="table-actions user-row-actions">
            <button type="button" class="secondary" data-user-view="${escapeHtml(displayValue(user.username))}">상세</button>
          </div>`;
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
        appendLabeledCell(tr, '상태', `<div class="user-status-actions">${chip(requestStatusLabel(request.status), requestStatusTone(request.status))}</div>`, 'table-cell-status');
        appendLabeledCell(tr, '요청/결정', userValueHtml(request.createdAt || '미제공', request.decidedAt || ''));
        const actionsHtml = request.status === 'pending'
          ? `<div class="table-actions user-row-actions">
              <button type="button" class="primary" data-request-approve="${escapeHtml(displayValue(request.requestId))}">승인</button>
              <button type="button" class="danger" data-request-reject="${escapeHtml(displayValue(request.requestId))}">거절</button>
            </div>`
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
    async function loadUsers() {
      const json = await requestJson('/ops/api/users');
      loadedUsers = Array.isArray(json.users) ? json.users : [];
      renderUsers(loadedUsers);
      renderOpsAuditTrail('user-audit-list', 'users');
    }
    async function loadAccessRequests() {
      const json = await requestJson('/ops/api/access-requests');
      loadedRequests = Array.isArray(json.accessRequests) ? json.accessRequests : [];
      renderAccessRequests(loadedRequests);
    }
      async function loadAll({ clearMessages = true } = {}) {
      await Promise.all([loadUsers(), loadAccessRequests()]);
      if (clearMessages) {
        setStatus('');
        setRequestStatus('');
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
        await recordOpsAudit({
          area: 'users',
          action: enabled ? 'enable' : 'disable',
          target: `user:${username}`,
          before,
          after: { ...(before || { username }), enabled }
        });
        renderOpsAuditTrail('user-audit-list', 'users');
      } catch (error) {
        setStatus(error.message, true);
      }
    }
    async function approveAccessRequest(request) {
      const viewId = window.prompt('승인할 채널 ID', request.viewId || '');
      if (viewId === null) return;
      try {
        const payload = {};
        const normalizedViewId = viewId.trim();
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
          invite.token ? `토큰: ${invite.token}` : ''
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
      if (!window.confirm(`${request.username || request.requestId} 요청을 거절할까요?`)) return;
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
    editSelectedButton.onclick = () => {
      const username = String(form.elements.username.value || '').trim();
      if (!username) return;
      setEditorMode('edit', `사용자 @${username}`, username);
    };
    closeUserButton.onclick = () => {
      hideUserEditor();
    };
    document.querySelector('#user-audit-refresh')?.addEventListener('click', () => renderOpsAuditTrail('user-audit-list', 'users'));
    renderOpsAuditTrail('user-audit-list', 'users');
    document.addEventListener('click', event => {
      const viewButton = event.target.closest('[data-user-view]');
      if (viewButton) {
        const user = (loadedUsers || []).find(item => String(item.username || '') === String(viewButton.dataset.userView || ''));
        if (user) fillForm(user);
        return;
      }
      const approveButton = event.target.closest('[data-request-approve]');
      if (approveButton) {
        const request = (loadedRequests || []).find(item => String(item.requestId || '') === String(approveButton.dataset.requestApprove || ''));
        if (request) approveAccessRequest(request);
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
    form.elements.viewId.addEventListener('input', updateScopeTemplatePreview);
    form.elements.scopes.addEventListener('input', updateScopeTemplatePreview);
    document.querySelector('#apply-view-scope-template').onclick = () => applyScopeTemplate(false);
    document.querySelector('#apply-role-default-scope-template').onclick = () => applyScopeTemplate(true);
    document.querySelector('#clear-custom-scopes').onclick = () => {
      form.elements.scopes.value = '';
      updateScopeTemplatePreview();
    };
    document.querySelector('#refresh-btn').onclick = () => {
      setInviteOutput('');
      loadAll().catch(error => setStatus(error.message, true));
    };
    updateAssignmentVisibility();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSUSERS";
}


}  // namespace ingress
