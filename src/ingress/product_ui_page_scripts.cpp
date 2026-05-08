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
    const { escapeHtml, display, requestJson, applyPrincipalVisibility, setSelectOptions } = window.MediaServerUi;
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
    const allowedOverlayModes = view => {
      const seen = new Set();
      const out = [];
      const ruleId = tileRuleId(view);
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
	    function renderDashboard(payload) {
	      const view = payload.view || {};
	      const health = payload.health || {};
	      const analysis = payload.analysis || {};
	      const connection = payload.connection || {};
	      const events = payload.events || {};
	      const assignedView = viewById(view.viewId || selectedViewId) || viewById(selectedViewId) || {};
	      const dashboardModes = allowedOverlayModes(assignedView);
	      const dashboardModeText = (dashboardModes.length ? dashboardModes : ['raw']).map(overlayLabel).join(', ');
	      const dashboardRuleId = tileRuleId(assignedView);
	      detail.innerHTML = `
	        <div class="toolbar">
	          <div>
            <h2>${escapeHtml(view.displayName || view.viewId || '대시보드')}</h2>
            <p>${escapeHtml(view.sourceDisplayName || '미제공')}</p>
          </div>
          <div class="meta">
            ${statusChip(health.status)}
            ${statusChip(health.metadataStatus)}
            ${events.warning ? '<span class="chip warn">경고</span>' : ''}
          </div>
        </div>
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
	        <section class="events">
	          <h3>이벤트 요약</h3>
          <div class="meta">
            ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
          </div>
          ${renderEvents(events.recent || [])}
        </section>
      `;
    }
    function renderEvents(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return emptyState('최근 이벤트가 없습니다', '선택한 채널에서 표시할 이벤트가 아직 없거나 이벤트 표시가 꺼져 있습니다.');
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
      return modes.includes('raw') ? 'raw' : (modes[0] || '');
    }
    function tileRuleId(view) {
      return view?.defaultRuleId || (Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds[0] : '') || '';
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
          ? '이벤트를 보려면 이벤트 권한이 있는 채널이 필요합니다.'
          : '대시보드를 보려면 대시보드 권한이 있는 채널이 필요합니다.';
        detail.innerHTML = emptyState(title, message, isPreviewMode ? '/ops/sources' : '', isPreviewMode ? '채널 관리' : '');
        return;
      }
      detail.innerHTML = emptyState('불러오는 중', '선택한 채널의 상태를 조회하고 있습니다.');
      try {
        if (activePage === 'events') {
          renderEventPage(await requestJson(`/client/api/views/${encodeURIComponent(selectedViewId)}/events?limit=20`));
        } else {
          renderDashboard(await requestJson(`/client/api/views/${encodeURIComponent(selectedViewId)}/dashboard`));
        }
      } catch (error) {
        detail.innerHTML = `<div class="empty"><p>${escapeHtml(error.message || '미제공')}</p></div>`;
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

void AppendOpsShellScript(std::ostringstream& out, const std::string& active) {
    out << R"OPSSCRIPT(    <script>
      const activeOpsPage = )OPSSCRIPT" << JsStringLiteral(active) << R"OPSSCRIPT(;
      const {
        escapeHtml,
        display,
        numberValue,
        setText,
        setFeedback,
        setTableEmpty,
        chip: badge,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility
      } = window.MediaServerUi;
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
      let opsLiveState = {
        rows: [],
        selectedRowId: ''
      };
      const opsLiveDashboardCache = new Map();
      const opsLiveDashboardPromiseCache = new Map();
      const opsLiveDashboardLoadedAt = new Map();
      let opsPreviewConfigPromise = null;
      const opsPreviewSlots = [
        { key: 'primary', label: '슬롯 A', prefix: 'Primary' },
        { key: 'secondary', label: '슬롯 B', prefix: 'Secondary' }
      ];
      let opsPreviewTarget = 'primary';
      const opsPreviewStates = Object.fromEntries(opsPreviewSlots.map(slot => [slot.key, {
        key: slot.key,
        label: slot.label,
        prefix: slot.prefix,
        rowId: '',
        viewId: '',
        overlayMode: 'raw',
        sessionId: '',
        pc: null,
        iceTimer: null,
        status: 'offline',
        connectionStatus: 'offline',
        lastError: '',
        metadataAgeMs: null,
        lastFrameAgeMs: null,
        trackCount: null,
        eventCount: null
      }]));
      const opsHashParams = () => new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      const eventTime = record => record.updateTime ?? record.startTime ?? record.timestamp ?? record.endTime ?? '';
      const formatTime = value => {
        if (value === null || value === undefined || value === '') return '미제공';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return String(value);
        return numeric > 1000000000000 ? new Date(numeric).toLocaleString() : `${Math.round(numeric)}ms`;
      };
      const liveRowKeys = row => {
        const source = row?.source || {};
        const view = row?.view || {};
        return [source.sourceId, view.viewId, source.canonicalSourceKey]
          .map(value => String(value || '').trim())
          .filter(Boolean);
      };
      const recordEvidenceText = record => {
        const snapshot = String(record?.snapshotPath || '').trim();
        const clip = String(record?.clipPath || '').trim();
        if (snapshot && clip) return 'snapshot + clip';
        if (snapshot) return 'snapshot';
        if (clip) return 'clip';
        return '없음';
      };
      const liveTapForRow = (row, activeTaps) => {
        const keys = new Set(liveRowKeys(row));
        const taps = (Array.isArray(activeTaps) ? activeTaps : [])
          .filter(tap => keys.has(String(tap?.streamKey || '').trim()))
          .sort((left, right) => numberValue(left?.lastUsedAgeMs) - numberValue(right?.lastUsedAgeMs));
        return taps[0] || null;
      };
      const liveRecordsForRow = (row, eventRecords) => {
        const keys = new Set(liveRowKeys(row));
        return (Array.isArray(eventRecords) ? eventRecords : [])
          .filter(record => keys.has(String(record?.streamId || '').trim()) ||
            keys.has(String(record?.channelId || '').trim()))
          .sort((left, right) => numberValue(eventTime(right)) - numberValue(eventTime(left)));
      };
      const timelineTone = value => {
        const text = String(value || '').toLowerCase();
        if (text.includes('stale') || text.includes('disabled') || text.includes('unassigned') || text.includes('active')) return 'warn';
        if (text.includes('published') || text.includes('fresh') || text.includes('ok') || text.includes('captured')) return '';
        return 'info';
      };
      const opsPreviewStatusLabel = value => ({
        offline: '오프라인',
        connecting: '연결 중',
        reconnecting: '재연결 중',
        live: '라이브',
        connected: '연결됨',
        completed: '연결됨',
        failed: '실패',
        disconnected: '연결 끊김',
        closed: '닫힘',
        error: '오류'
      })[String(value || '')] || display(value || 'offline');
      function selectedOpsLiveRow() {
        return opsLiveState.rows.find(row => String(row.id) === String(opsLiveState.selectedRowId || '')) || null;
      }
      function opsPreviewStateFor(key = opsPreviewTarget) {
        return opsPreviewStates[key] || opsPreviewStates.primary;
      }
      function opsLiveDashboardForRow(row = selectedOpsLiveRow()) {
        const viewId = String(row?.view?.viewId || '').trim();
        return viewId ? (opsLiveDashboardCache.get(viewId) || null) : null;
      }
      async function refreshOpsLiveRowDashboard(row = selectedOpsLiveRow(), options = {}) {
        const viewId = String(row?.view?.viewId || '').trim();
        if (!viewId) return null;
        const loadedAt = Number(opsLiveDashboardLoadedAt.get(viewId) || 0);
        if (!options.force && opsLiveDashboardCache.has(viewId) && Date.now() - loadedAt < 5000) {
          return opsLiveDashboardCache.get(viewId) || null;
        }
        if (!options.force && opsLiveDashboardPromiseCache.has(viewId)) {
          return opsLiveDashboardPromiseCache.get(viewId);
        }
        const request = requestJson(`/client/api/views/${encodeURIComponent(viewId)}/dashboard`)
          .then(payload => {
            opsLiveDashboardCache.set(viewId, payload || null);
            opsLiveDashboardLoadedAt.set(viewId, Date.now());
            return payload || null;
          })
          .catch(() => {
            opsLiveDashboardCache.delete(viewId);
            opsLiveDashboardLoadedAt.delete(viewId);
            return null;
          })
          .finally(() => {
            opsLiveDashboardPromiseCache.delete(viewId);
            if (String(opsLiveState.selectedRowId || '') === String(row?.id || '')) {
              renderOpsLiveTimeline(selectedOpsLiveRow());
            }
          });
        opsLiveDashboardPromiseCache.set(viewId, request);
        return request;
      }
      function opsLivePreviewRuleId(row = selectedOpsLiveRow()) {
        const view = row?.view || {};
        const tap = row?.tap || null;
        return String(view.defaultRuleId || tap?.selectedRuleId || (Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds[0] : '') || '').trim();
      }
      function opsLivePreviewAllowedModes(row = selectedOpsLiveRow()) {
        const view = row?.view || {};
        const modes = allowedOverlayModes(view);
        return modes.length > 0 ? modes : ['raw'];
      }
      function syncOpsLivePreviewModeSelect(row = selectedOpsLiveRow()) {
        const select = document.getElementById('opsLivePreviewMode');
        if (!select) return;
        const state = opsPreviewStateFor();
        const modes = opsLivePreviewAllowedModes(row);
        if (!modes.includes(state.overlayMode)) {
          state.overlayMode = modes.includes('raw') ? 'raw' : modes[0];
        }
        select.innerHTML = modes.map(mode =>
          `<option value="${escapeHtml(mode)}">${escapeHtml(overlayLabel(mode))}</option>`
        ).join('');
        select.value = state.overlayMode;
        select.disabled = !row?.view?.viewId || row?.enabled === false || Boolean(state.sessionId);
      }
      function opsLivePreviewSessionUrl(state, suffix = '') {
        return `/client/api/views/${encodeURIComponent(state.viewId || '')}/webrtc/session/${encodeURIComponent(state.sessionId || '')}${suffix}`;
      }
      async function loadOpsLiveWebRtcConfig() {
        if (!opsPreviewConfigPromise) {
          opsPreviewConfigPromise = fetch('/webrtc/config', {
            cache: 'no-store',
            credentials: 'same-origin'
          }).then(async response => {
            if (!response.ok) throw new Error(`/webrtc/config HTTP ${response.status}`);
            return response.json();
          });
        }
        return opsPreviewConfigPromise;
      }
      function opsLivePeerConfig(payload) {
        const raw = payload && payload.peerConnectionConfig && typeof payload.peerConnectionConfig === 'object'
          ? payload.peerConnectionConfig
          : {};
        const config = {};
        if (Array.isArray(raw.iceServers)) config.iceServers = raw.iceServers;
        if (raw.iceTransportPolicy === 'relay' || raw.iceTransportPolicy === 'all') {
          config.iceTransportPolicy = raw.iceTransportPolicy;
        }
        return config;
      }
      async function createOpsLivePeerConnection() {
        try {
          return new RTCPeerConnection(opsLivePeerConfig(await loadOpsLiveWebRtcConfig()));
        } catch (error) {
          console.warn('Ops Live preview ICE config fallback', error);
          return new RTCPeerConnection();
        }
      }
      function activePreviewSlotCount() {
        return opsPreviewSlots.filter(slot => Boolean(opsPreviewStateFor(slot.key).sessionId)).length;
      }
      const opsAgeTone = value => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'info';
        if (numeric > 3000) return 'warn';
        return '';
      };
      async function refreshOpsLivePreviewHealth() {
        await Promise.all(opsPreviewSlots.map(async slot => {
          const state = opsPreviewStateFor(slot.key);
          if (!state.viewId || !state.sessionId) return;
          try {
            const payload = await requestJson(`/client/api/views/${encodeURIComponent(state.viewId)}/dashboard`);
            const health = payload.health || {};
            const connection = payload.connection || {};
            const analysis = payload.analysis || {};
            state.metadataAgeMs = health.metadataAgeMs ?? null;
            state.lastFrameAgeMs = health.lastFrameAgeMs ?? connection.lastFrameAgeMs ?? null;
            state.trackCount = analysis.trackCount ?? null;
            state.eventCount = analysis.activeEventCount ?? null;
          } catch (_) {
            state.metadataAgeMs = null;
            state.lastFrameAgeMs = null;
          }
        }));
        updateOpsLivePreviewUi();
      }
      function updateOpsLivePreviewUi(row = selectedOpsLiveRow()) {
        const startBtn = document.getElementById('opsLivePreviewStart');
        const restartBtn = document.getElementById('opsLivePreviewRestart');
        const stopBtn = document.getElementById('opsLivePreviewStop');
        const targetSelect = document.getElementById('opsLivePreviewTarget');
        const state = opsPreviewStateFor();
        const hasView = Boolean(row?.view?.viewId);
        const enabled = row?.enabled !== false;
        const activeForRow = Boolean(row) && String(state.rowId || '') === String(row.id || '');
        const previewMode = state.overlayMode || 'raw';
        const previewRuleId = opsLivePreviewRuleId(row);
        const ruleRequired = previewMode === 'va-rule';
        if (targetSelect) targetSelect.value = opsPreviewTarget;
        syncOpsLivePreviewModeSelect(row);
        for (const slot of opsPreviewSlots) {
          const slotState = opsPreviewStateFor(slot.key);
          const placeholder = document.getElementById(`opsLivePreview${slot.prefix}Placeholder`);
          const video = document.getElementById(`opsLivePreview${slot.prefix}Video`);
          renderBadges(`opsLivePreview${slot.prefix}HealthBadges`, [
            { text: `ice ${opsPreviewStatusLabel(slotState.connectionStatus)}`, tone: ['failed', 'disconnected', 'error'].includes(String(slotState.connectionStatus)) ? 'warn' : 'info' },
            { text: `meta ${ms(slotState.metadataAgeMs)}`, tone: opsAgeTone(slotState.metadataAgeMs) },
            { text: `frame ${ms(slotState.lastFrameAgeMs)}`, tone: opsAgeTone(slotState.lastFrameAgeMs) },
            { text: `track ${display(slotState.trackCount)}`, tone: 'info' },
            { text: `event ${display(slotState.eventCount)}`, tone: Number(slotState.eventCount || 0) > 0 ? 'warn' : 'info' }
          ]);
          setText(`opsLivePreview${slot.prefix}StatusText`, opsPreviewStatusLabel(slotState.status));
          setText(`opsLivePreview${slot.prefix}ConnectionText`, opsPreviewStatusLabel(slotState.connectionStatus));
          setText(`opsLivePreview${slot.prefix}ViewText`, slotState.viewId || '-');
          setText(`opsLivePreview${slot.prefix}ModeText`, overlayLabel(slotState.overlayMode || 'raw'));
          if (video) video.muted = true;
          if (!slotState.viewId) {
            setText(`opsLivePreview${slot.prefix}Summary`, `${slot.label} 비어 있음`);
            if (placeholder) {
              placeholder.hidden = false;
              placeholder.textContent = `${slot.label}는 비어 있습니다.`;
            }
          } else if (slotState.sessionId) {
            setText(`opsLivePreview${slot.prefix}Summary`, `${slotState.viewId} · ${overlayLabel(slotState.overlayMode || 'raw')} 연결 중`);
            if (placeholder) placeholder.hidden = true;
          } else {
            setText(`opsLivePreview${slot.prefix}Summary`, `${slotState.viewId} · ${overlayLabel(slotState.overlayMode || 'raw')} 대기`);
            if (placeholder) {
              placeholder.hidden = false;
              placeholder.textContent = slotState.lastError || `${slot.label}는 시작 대기 중입니다.`;
            }
          }
        }
        if (!row) {
          setText('opsLivePreviewSummary', `선택한 PublishedView를 최대 2개 슬롯에 수동으로 미리보기합니다. 활성 슬롯 ${activePreviewSlotCount()}개.`);
        } else if (!hasView) {
          setText('opsLivePreviewSummary', 'PublishedView가 없는 채널은 제품 미리보기를 열 수 없습니다.');
        } else if (!enabled) {
          setText('opsLivePreviewSummary', `${row.view.viewId} 미리보기는 채널이 비활성 상태라 시작할 수 없습니다.`);
        } else if (ruleRequired && !previewRuleId) {
          setText('opsLivePreviewSummary', `${row.view.viewId}는 VA 룰 모드가 허용되지 않거나 연결된 rule이 없습니다.`);
        } else if (activeForRow && state.sessionId) {
          setText('opsLivePreviewSummary', `${row.view.viewId} ${overlayLabel(previewMode)} preview가 ${state.label}에 연결되어 있습니다. 활성 슬롯 ${activePreviewSlotCount()}개.`);
        } else {
          const ruleHint = ruleRequired && previewRuleId ? ` · rule ${previewRuleId}` : '';
          setText('opsLivePreviewSummary', `${row.view.viewId} ${overlayLabel(previewMode)} 미리보기를 ${state.label}에 열 수 있습니다.${ruleHint} 활성 슬롯 ${activePreviewSlotCount()}개.`);
        }
        if (startBtn) startBtn.disabled = !row || !hasView || !enabled || (ruleRequired && !previewRuleId) || (activeForRow && Boolean(state.sessionId));
        if (restartBtn) restartBtn.disabled = !row || !hasView || !enabled || (ruleRequired && !previewRuleId);
        if (stopBtn) stopBtn.disabled = !Boolean(state.sessionId);
      }
      async function stopOpsLivePreview(slotKey = opsPreviewTarget, options = {}) {
        const state = opsPreviewStateFor(slotKey);
        if (state.iceTimer) {
          clearInterval(state.iceTimer);
          state.iceTimer = null;
        }
        if (state.pc) {
          try { state.pc.close(); } catch {}
        }
        state.pc = null;
        const prefix = state.prefix;
        const video = document.getElementById(`opsLivePreview${prefix}Video`);
        if (video?.srcObject) {
          for (const track of video.srcObject.getTracks()) track.stop();
          video.srcObject = null;
        }
        const sessionId = state.sessionId;
        const viewId = state.viewId;
        state.sessionId = '';
        state.metadataAgeMs = null;
        state.lastFrameAgeMs = null;
        state.trackCount = null;
        state.eventCount = null;
        if (sessionId && viewId) {
          await fetch(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
            keepalive: Boolean(options.keepalive)
          }).catch(() => {});
        }
        if (!options.keepError) state.lastError = '';
        state.status = 'offline';
        state.connectionStatus = 'offline';
        if (!options.preserveRow) {
          state.rowId = '';
          state.viewId = '';
        }
        updateOpsLivePreviewUi();
      }
      function opsLiveSourcePayloadFromRow(row, enabled) {
        const source = row?.source || {};
        return {
          sourceId: source.sourceId || row?.id || '',
          displayName: source.displayName || source.sourceId || row?.id || '',
          kind: source.kind || 'file',
          file: source.file || '',
          rtspUrl: source.rtspUrl || '',
          webrtcSourceId: source.webrtcSourceId || '',
          whepUrl: source.whepUrl || '',
          httpUrl: source.httpUrl || '',
          enabled,
          tags: Array.isArray(source.tags) ? source.tags : [],
          ownerGroup: source.ownerGroup || ''
        };
      }
      function opsLiveViewPayloadFromRow(row, enabled) {
        const view = row?.view || {};
        return {
          viewId: view.viewId || row?.id || '',
          displayName: view.displayName || view.viewId || row?.id || '',
          sourceId: view.sourceId || row?.source?.sourceId || row?.id || '',
          defaultRuleId: view.defaultRuleId || '',
          allowedRuleIds: Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds : [],
          allowedOverlayModes: Array.isArray(view.allowedOverlayModes) && view.allowedOverlayModes.length > 0
            ? view.allowedOverlayModes
            : ['raw'],
          showDashboard: view.showDashboard !== false,
          showEvents: view.showEvents !== false,
          showMetadataSummary: view.showMetadataSummary !== false,
          clientGroups: Array.isArray(view.clientGroups) ? view.clientGroups : [],
          maxTiles: Number.isFinite(Number(view.maxTiles)) ? Number(view.maxTiles) : 1,
          enabled
        };
      }
      async function opsLiveToggleChannel(row = selectedOpsLiveRow()) {
        if (!row?.source?.sourceId || !row?.view?.viewId) return;
        const nextEnabled = row.enabled === false;
        await requestJson(`/ops/api/sources/${encodeURIComponent(row.source.sourceId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opsLiveSourcePayloadFromRow(row, nextEnabled))
        });
        await requestJson(`/ops/api/views/${encodeURIComponent(row.view.viewId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opsLiveViewPayloadFromRow(row, nextEnabled))
        });
        if (!nextEnabled) {
          for (const slot of opsPreviewSlots) {
            const state = opsPreviewStateFor(slot.key);
            if (String(state.rowId || '') === String(row.id || '')) {
              await stopOpsLivePreview(slot.key, { preserveRow: false }).catch(() => {});
            }
          }
        }
        await refreshLive();
        setText('opsLiveActionSummary', `${row.id} 채널을 ${nextEnabled ? '활성' : '비활성'} 상태로 변경했습니다.`);
      }
      async function opsLiveStopSelectedPreviews(row = selectedOpsLiveRow()) {
        if (!row) return;
        for (const slot of opsPreviewSlots) {
          const state = opsPreviewStateFor(slot.key);
          if (String(state.rowId || '') === String(row.id || '')) {
            await stopOpsLivePreview(slot.key, { preserveRow: true }).catch(() => {});
          }
        }
        updateOpsLivePreviewUi(row);
        setText('opsLiveActionSummary', `${row.id} 채널 preview를 정지했습니다.`);
      }
      async function pollOpsLivePreviewIce(slotKey = opsPreviewTarget) {
        const state = opsPreviewStateFor(slotKey);
        if (!state.sessionId || !state.pc) return;
        const response = await fetch(opsLivePreviewSessionUrl(state, '/ice')).catch(() => null);
        if (!response || !response.ok) return;
        const payload = await response.json().catch(() => ({}));
        for (const item of payload.candidates || []) {
          try { await state.pc.addIceCandidate(item); } catch {}
        }
      }
      async function startOpsLivePreview(options = {}) {
        const state = opsPreviewStateFor();
        const row = selectedOpsLiveRow();
        const viewId = String(row?.view?.viewId || '').trim();
        const overlayMode = state.overlayMode || 'raw';
        const ruleId = opsLivePreviewRuleId(row);
        if (!row || !viewId || row.enabled === false) {
          updateOpsLivePreviewUi(row);
          return;
        }
        if (overlayMode === 'va-rule' && !ruleId) {
          updateOpsLivePreviewUi(row);
          return;
        }
        for (const slot of opsPreviewSlots) {
          if (slot.key === state.key) continue;
          const other = opsPreviewStateFor(slot.key);
          if (other.sessionId && String(other.rowId || '') === String(row.id || '')) {
            await stopOpsLivePreview(slot.key, { preserveRow: false });
          }
        }
        if (state.sessionId && String(state.rowId || '') !== String(row.id || '')) {
          await stopOpsLivePreview(state.key, { preserveRow: false });
        } else if (state.sessionId) {
          await stopOpsLivePreview(state.key, { preserveRow: true });
        }
        state.rowId = String(row.id || '');
        state.viewId = viewId;
        state.status = options.restart ? 'reconnecting' : 'connecting';
        state.connectionStatus = 'connecting';
        state.lastError = '';
        updateOpsLivePreviewUi(row);
        try {
          const pc = await createOpsLivePeerConnection();
          state.pc = pc;
          pc.onconnectionstatechange = () => {
            state.connectionStatus = pc.connectionState || 'connecting';
            if (['connected', 'completed'].includes(pc.connectionState)) state.status = 'live';
            if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
              state.status = pc.connectionState === 'failed' ? 'error' : 'offline';
              state.lastError = opsPreviewStatusLabel(pc.connectionState);
            }
            updateOpsLivePreviewUi();
          };
          pc.oniceconnectionstatechange = () => {
            state.connectionStatus = pc.iceConnectionState || state.connectionStatus;
            updateOpsLivePreviewUi();
          };
          pc.ontrack = event => {
            const video = document.getElementById(`opsLivePreview${state.prefix}Video`);
            const placeholder = document.getElementById(`opsLivePreview${state.prefix}Placeholder`);
            if (video) {
              video.srcObject = event.streams[0];
              video.muted = true;
              const play = video.play();
              if (play && typeof play.catch === 'function') play.catch(() => {});
            }
            if (placeholder) placeholder.hidden = true;
            state.status = 'live';
            updateOpsLivePreviewUi();
          };
          pc.onicecandidate = event => {
            if (!state.sessionId || !event.candidate) return;
            fetch(opsLivePreviewSessionUrl(state, '/ice'), {
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
              overlayMode,
              ...(overlayMode === 'va-rule' && ruleId ? { ruleId } : {})
            })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          state.sessionId = payload.sessionId || '';
          if (!state.sessionId || !payload.offer) throw new Error('session offer missing');
          await pc.setRemoteDescription({ type: 'offer', sdp: payload.offer });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch(opsLivePreviewSessionUrl(state, '/answer'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: answer.sdp
          });
          state.iceTimer = setInterval(() => pollOpsLivePreviewIce(state.key).catch(() => {}), 1000);
          refreshOpsLivePreviewHealth().catch(() => {});
          updateOpsLivePreviewUi();
        } catch (error) {
          state.status = 'error';
          state.connectionStatus = error.message || 'error';
          state.lastError = error.message || 'error';
          await stopOpsLivePreview(state.key, { keepError: true, preserveRow: true });
          updateOpsLivePreviewUi(row);
        }
      }
      const opsLiveActionLink = (href, label) =>
        `<a class="button button-secondary" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
      const opsLiveActionButton = (action, label) =>
        `<button type="button" class="button button-secondary" data-ops-live-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;
      function renderOpsLiveActions(row) {
        const container = document.getElementById('opsLiveActionButtons');
        if (!container) return;
        if (!row) {
          setText('opsLiveActionSummary', '선택한 채널 기준으로 채널, 이벤트, 클라이언트, 룰 화면으로 이동합니다.');
          container.innerHTML = '<span class="chip info">선택 없음</span>';
          return;
        }
        const view = row.view || {};
        const tap = row.tap || null;
        const source = row.source || {};
        const ruleId = String(view.defaultRuleId || tap?.selectedRuleId || (Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds[0] : '') || '').trim();
        const links = [
          opsLiveActionLink(`/ops/sources#channel=${encodeURIComponent(String(row.id || ''))}`, '채널 관리')
        ];
        if (view.viewId) {
          links.push(opsLiveActionLink(`/client/live#view=${encodeURIComponent(String(view.viewId))}`, '클라이언트 미리보기'));
        }
        if (ruleId) {
          links.push(opsLiveActionLink(`/ops/rules#q=${encodeURIComponent(ruleId)}`, '룰 카탈로그'));
        }
        if (row.hasView) {
          links.push(opsLiveActionButton('stop-preview', 'preview 정지'));
          links.push(opsLiveActionButton('toggle-channel', row.enabled ? '채널 비활성' : '채널 활성'));
        }
        setText(
          'opsLiveActionSummary',
          `${view.displayName || source.displayName || row.id} 기준 작업 · ${tap?.tapId ? `tap ${tap.tapId} · ` : ''}${ruleId ? `rule ${ruleId}` : 'rule 없음'}`
        );
        container.innerHTML = links.join('');
        container.querySelectorAll('[data-ops-live-action]').forEach(button => {
          button.addEventListener('click', async () => {
            try {
              if (button.dataset.opsLiveAction === 'toggle-channel') {
                await opsLiveToggleChannel(selectedOpsLiveRow());
              } else if (button.dataset.opsLiveAction === 'stop-preview') {
                await opsLiveStopSelectedPreviews(selectedOpsLiveRow());
              }
            } catch (error) {
              setText('opsLiveActionSummary', error.message || 'action failed');
            }
          });
        });
      }
      function buildOpsLiveTimeline(row) {
        if (!row) return [];
        const view = row.view || {};
        const source = row.source || {};
        const tap = row.tap || null;
        const dashboard = opsLiveDashboardForRow(row);
        const dashboardHealth = dashboard?.health || {};
        const dashboardAnalysis = dashboard?.analysis || {};
        const dashboardEvents = dashboard?.events || {};
        const entries = [];
        entries.push({
          time: '',
          kind: 'channel',
          state: row.enabled ? 'enabled' : 'disabled',
          note: `${view.displayName || source.displayName || row.id} · ${sourceText(source)}`
        });
        entries.push({
          time: '',
          kind: 'view',
          state: row.hasView ? 'published' : 'unassigned',
          note: row.hasView ? `${view.viewId || row.id}${view.defaultRuleId ? ` · rule ${view.defaultRuleId}` : ''}` : 'PublishedView 미배정'
        });
        if (tap) {
          entries.push({
            time: '',
            kind: 'tap',
            state: row.staleTap ? 'stale' : 'fresh',
            note: `${tap.tapId || '-'} · age ${formatTime(tap.lastUsedAgeMs)}${tap.selectedRuleId ? ` · rule ${tap.selectedRuleId}` : ''}`
          });
        }
        if (dashboard) {
          entries.push({
            time: formatTime(dashboardAnalysis.latestEventTime),
            kind: 'runtime',
            state: dashboardHealth.stale ? 'stale' : (dashboardHealth.status || 'live'),
            note: [
              `track ${display(dashboardAnalysis.trackCount)}`,
              `scenario ${display(dashboardAnalysis.scenarioCount)}`,
              `active event ${display(dashboardAnalysis.activeEventCount)}`,
              `frame ${ms(dashboardHealth.lastFrameAgeMs)}`,
              `meta ${ms(dashboardHealth.metadataAgeMs)}`
            ].join(' · ')
          });
          if (Array.isArray(dashboardEvents.countsByType) && dashboardEvents.countsByType.length > 0) {
            entries.push({
              time: formatTime(dashboardEvents.latestEventTime),
              kind: 'event-summary',
              state: dashboardEvents.warning ? 'warning' : 'normal',
              note: dashboardEvents.countsByType.slice(0, 4).map(item =>
                `${item.eventType || 'event'} ${item.count || 0}`).join(' · ')
            });
          }
        }
        for (const record of (Array.isArray(row.eventRecords) ? row.eventRecords : []).slice(0, 8)) {
          const evidence = recordEvidenceText(record);
          const route = [record.zoneId, record.lineId].filter(Boolean).join(' / ');
          entries.push({
            time: formatTime(eventTime(record)),
            kind: 'event',
            state: record.status || record.scenarioPhase || 'recorded',
            note: [
              record.eventType || record.eventId || 'event',
              record.scenarioName || record.scenarioPhase || '',
              route,
              evidence !== '없음' ? `${evidence} captured` : 'evidence 없음'
            ].filter(Boolean).join(' · ')
          });
        }
        return entries;
      }
      function renderOpsLiveTimeline(row) {
        const body = document.getElementById('opsLiveTimelineRows');
        if (!body) return;
        if (!row) {
          setText('opsLiveTimelineSummary', '선택한 채널의 최근 상태 변화 순서를 표시합니다.');
          setTableEmpty(body, 4, '채널을 선택하면 timeline을 표시합니다.');
          return;
        }
        const entries = buildOpsLiveTimeline(row);
        setText('opsLiveTimelineSummary', `최근 ${entries.length}개 상태 변화를 표시합니다.`);
        body.innerHTML = entries.map(entry => `
          <tr>
            <td>${escapeHtml(entry.time || '현재')}</td>
            <td>${escapeHtml(entry.kind)}</td>
            <td>${badge(entry.state || '-', timelineTone(entry.state))}</td>
            <td>${escapeHtml(entry.note || '-')}</td>
          </tr>
        `).join('');
      }
      function renderOpsLiveDrilldown(row) {
        const recordsBody = document.getElementById('opsLiveDetailEventRows');
        if (!row) {
          setText('opsLiveDrilldownSummary', '타일 또는 최근 이벤트를 선택하면 source health, active tap, recent event, evidence 상태를 표시합니다.');
          renderBadges('opsLiveDrilldownBadges', [{ text: '선택 없음', tone: 'info' }]);
          setText('opsLiveDetailChannelText', '-');
          setText('opsLiveDetailSourceText', '-');
          setText('opsLiveDetailViewText', '-');
          setText('opsLiveDetailTapText', '-');
          setText('opsLiveDetailLatestEventText', '-');
          setText('opsLiveDetailEvidenceText', '-');
          setTableEmpty(recordsBody, 4, '채널을 선택하면 최근 event detail을 표시합니다.');
          renderOpsLiveTimeline(null);
          renderOpsLiveActions(null);
          updateOpsLivePreviewUi(null);
          const detail = document.getElementById('opsLiveDetailJson');
          if (detail) detail.textContent = '선택한 채널 detail 없음';
          return;
        }
        const view = row.view || {};
        const source = row.source || {};
        const latestEvent = Array.isArray(row.eventRecords) && row.eventRecords.length > 0 ? row.eventRecords[0] : null;
        const tap = row.tap || null;
        const snapshotCount = row.eventRecords.filter(record => Boolean(record?.snapshotPath)).length;
        const clipCount = row.eventRecords.filter(record => Boolean(record?.clipPath)).length;
        setText('opsLiveDrilldownSummary',
          `${view.displayName || source.displayName || row.id} · ${sourceText(source)} · event ${row.recentEventCount}`);
        renderBadges('opsLiveDrilldownBadges', [
          { text: row.hasView ? 'published' : 'unassigned', tone: row.hasView ? '' : 'warn' },
          { text: row.enabled ? 'enabled' : 'disabled', tone: row.enabled ? '' : 'warn' },
          { text: tap ? `tap ${tap.tapId || '-'}` : 'tap 없음', tone: tap ? (row.staleTap ? 'warn' : '') : 'info' },
          { text: `event ${row.recentEventCount}`, tone: row.recentEventCount > 0 ? 'warn' : 'info' },
          { text: `snapshot ${snapshotCount}`, tone: snapshotCount > 0 ? '' : 'info' },
          { text: `clip ${clipCount}`, tone: clipCount > 0 ? '' : 'info' }
        ]);
        setText('opsLiveDetailChannelText', `#${row.id}`);
        setText('opsLiveDetailSourceText', sourceText(source));
        setText('opsLiveDetailViewText', view.viewId ? `${view.viewId}${view.defaultRuleId ? ` · rule ${view.defaultRuleId}` : ''}` : '미배정');
        setText('opsLiveDetailTapText', tap ? `${tap.tapId || '-'} · age ${formatTime(tap.lastUsedAgeMs)}` : 'active tap 없음');
        setText('opsLiveDetailLatestEventText', latestEvent ? `${latestEvent.eventType || latestEvent.eventId || 'event'} · ${formatTime(eventTime(latestEvent))}` : '최근 이벤트 없음');
        setText('opsLiveDetailEvidenceText', `snapshot ${snapshotCount} · clip ${clipCount}`);
        if (!Array.isArray(row.eventRecords) || row.eventRecords.length === 0) {
          setTableEmpty(recordsBody, 4, '선택한 채널의 최근 EventRecord가 없습니다.');
        } else {
          recordsBody.innerHTML = row.eventRecords.slice(0, 8).map(record => `
            <tr>
              <td>${escapeHtml(record.eventType || record.eventId || 'event')}</td>
              <td>${badge(record.status || '미제공', String(record.status || '').toLowerCase() === 'active' ? 'warn' : '')}</td>
              <td>${escapeHtml(formatTime(eventTime(record)))}</td>
              <td>${escapeHtml(recordEvidenceText(record))}</td>
            </tr>
          `).join('');
        }
        renderOpsLiveTimeline(row);
        renderOpsLiveActions(row);
        updateOpsLivePreviewUi(row);
        refreshOpsLiveRowDashboard(row).catch(() => {});
        const detail = document.getElementById('opsLiveDetailJson');
        if (detail) {
          detail.textContent = JSON.stringify({
            id: row.id,
            enabled: row.enabled,
            hasView: row.hasView,
            attention: row.attention,
            staleTap: row.staleTap,
            source,
            view,
            tap,
            latestEvent,
            recentEventCount: row.recentEventCount,
            eventRecords: row.eventRecords.slice(0, 8)
          }, null, 2);
        }
      }
      function selectOpsLiveRow(rowId) {
        opsLiveState.selectedRowId = String(rowId || '');
        renderOpsLiveDrilldown(opsLiveState.rows.find(row => String(row.id) === opsLiveState.selectedRowId) || null);
        document.querySelectorAll('[data-live-row-id]').forEach(node => {
          node.classList.toggle('is-selected', String(node.dataset.liveRowId || '') === opsLiveState.selectedRowId);
        });
      }
      function renderEventRows(records) {
        const body = document.getElementById('eventRecordRows');
        if (!body) return;
        if (!Array.isArray(records) || records.length === 0) {
          body.innerHTML = '<tr><td colspan="6">Event record가 없습니다.</td></tr>';
          return;
        }
        body.innerHTML = records.slice(0, 25).map(record => `
          <tr>
            <td>${escapeHtml(record.eventType || record.eventId || 'event')}</td>
            <td>${badge(record.status || '미제공', String(record.status || '').toLowerCase() === 'active' ? 'warn' : '')}</td>
            <td>${escapeHtml(record.streamId || record.channelId || '미제공')}</td>
            <td>${escapeHtml(record.trackId ?? '미제공')}</td>
            <td>${escapeHtml(record.scenarioName || record.scenarioPhase || record.zoneId || '미제공')}</td>
            <td>${escapeHtml(formatTime(eventTime(record)))}</td>
          </tr>
        `).join('');
      }
      function renderOpsLiveEventRows(records) {
        const body = document.getElementById('opsLiveEventRows');
        if (!body) return;
        if (!Array.isArray(records) || records.length === 0) {
          setTableEmpty(body, 5, '최근 EventRecord가 없습니다.');
          return;
        }
        body.innerHTML = records.slice(0, 12).map(record => {
          const matchedRow = opsLiveState.rows.find(row =>
            row.eventRecords.some(item => String(item.eventId || '') === String(record.eventId || '')));
          const rowId = matchedRow ? String(matchedRow.id) : '';
          return `
          <tr data-live-row-id="${escapeHtml(rowId)}">
            <td>${escapeHtml(record.eventType || record.eventId || 'event')}</td>
            <td>${badge(record.status || '미제공', String(record.status || '').toLowerCase() === 'active' ? 'warn' : '')}</td>
            <td>${escapeHtml(record.streamId || record.channelId || '미제공')}</td>
            <td>${escapeHtml(record.trackId ?? '미제공')}</td>
            <td>${escapeHtml(record.scenarioName || record.scenarioPhase || record.zoneId || '미제공')}</td>
          </tr>
        `;
        }).join('');
        body.querySelectorAll('tr[data-live-row-id]').forEach(node => {
          node.addEventListener('click', () => {
            if (node.dataset.liveRowId) selectOpsLiveRow(node.dataset.liveRowId);
          });
        });
      }
      function renderOpsLiveTiles(sources, views, counts, runtime, eventRecords) {
        const grid = document.getElementById('opsLiveTileGrid');
        if (!grid) return;
        const density = document.getElementById('opsLiveDensity')?.value || 'compact';
        const focus = document.getElementById('opsLiveFocus')?.value || 'all';
        const search = String(document.getElementById('opsLiveFilterInput')?.value || '').trim().toLowerCase();
        const sourceById = new Map((Array.isArray(sources) ? sources : []).map(source => [String(source.sourceId || ''), source]));
        const eventCountByKey = new Map();
        for (const record of Array.isArray(eventRecords) ? eventRecords : []) {
          const streamId = String(record?.streamId || '').trim();
          const channelId = String(record?.channelId || '').trim();
          for (const key of [streamId, channelId]) {
            if (!key) continue;
            eventCountByKey.set(key, (eventCountByKey.get(key) || 0) + 1);
          }
        }
        const rows = [];
        for (const view of Array.isArray(views) ? views : []) {
          const source = sourceById.get(String(view.sourceId || view.viewId || '')) || null;
          rows.push({ id: view.viewId || view.sourceId || '-', view, source });
        }
        for (const source of Array.isArray(sources) ? sources : []) {
          const claimed = rows.some(row => row.source === source);
          if (!claimed) rows.push({ id: source.sourceId || '-', view: null, source });
        }
        rows.sort((lhs, rhs) => String(lhs.id).localeCompare(String(rhs.id), undefined, { numeric: true }));
        if (rows.length === 0) {
          grid.innerHTML = '<div class="empty">등록된 채널이 없습니다.</div>';
          return;
        }
        const tapCount = counts.activeTaps.length;
        const describedRows = rows.map(row => {
          const view = row.view || {};
          const source = row.source || {};
          const sourceId = String(source.sourceId || '');
          const viewId = String(view.viewId || '');
          const tap = liveTapForRow(row, counts.activeTaps);
          const rowEventRecords = liveRecordsForRow(row, eventRecords);
          const staleTap = numberValue(tap?.lastUsedAgeMs) > 5000;
          const enabled = source.enabled !== false && view.enabled !== false;
          const hasView = Boolean(viewId);
          const recentEventCount = rowEventRecords.length > 0
            ? rowEventRecords.length
            : ((eventCountByKey.get(sourceId) || 0) + (eventCountByKey.get(viewId) || 0));
          const attention = !enabled || !hasView || recentEventCount > 0 || staleTap;
          const searchable = [row.id, view.displayName, view.viewId, source.displayName, source.sourceId, source.kind, tap?.selectedRuleId]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return { ...row, enabled, hasView, recentEventCount, attention, searchable, tap, staleTap, eventRecords: rowEventRecords };
        });
        const filteredRows = describedRows.filter(row => {
          if (focus === 'attention' && !row.attention) return false;
          if (focus === 'published' && !row.hasView) return false;
          if (focus === 'unassigned' && row.hasView) return false;
          if (search && !row.searchable.includes(search)) return false;
          return true;
        });
        const attentionCount = describedRows.filter(row => row.attention).length;
        const unassignedCount = describedRows.filter(row => !row.hasView).length;
        grid.classList.toggle('dashboard-card-grid-compact', density !== 'comfortable');
        if (filteredRows.length === 0) {
          grid.innerHTML = '<div class="empty">현재 필터에 맞는 채널이 없습니다.</div>';
        } else {
          const selectedRowId = String(opsLiveState.selectedRowId || '');
          grid.innerHTML = filteredRows.slice(0, density === 'comfortable' ? 12 : 24).map(row => {
          const view = row.view || {};
          const source = row.source || {};
          const overlays = Array.isArray(view.allowedOverlayModes) ? view.allowedOverlayModes.join(', ') : 'raw';
          const rules = [view.defaultRuleId, ...(Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds : [])].filter(Boolean);
          return `
            <button type="button" class="metric-card${selectedRowId === String(row.id) ? ' is-selected' : ''}" data-live-row-id="${escapeHtml(String(row.id || ''))}">
              <span>#${escapeHtml(row.id)} · ${escapeHtml(row.enabled ? 'enabled' : 'disabled')}</span>
              <strong>${escapeHtml(view.displayName || source.displayName || source.sourceId || row.id)}</strong>
              <small>${escapeHtml(sourceText(source))}</small>
              <small>overlay ${escapeHtml(overlays || 'raw')} · rule ${escapeHtml(rules.join(', ') || '없음')}</small>
              <small>${escapeHtml(row.tap ? `tap ${row.tap.tapId || '-'} · age ${formatTime(row.tap.lastUsedAgeMs)}` : 'tap 없음')}</small>
              <div class="badge-row">
                ${badge(row.hasView ? 'published' : 'unassigned', row.hasView ? '' : 'warn')}
                ${badge(row.enabled ? 'enabled' : 'disabled', row.enabled ? '' : 'warn')}
                ${badge(`event ${row.recentEventCount}`, row.recentEventCount > 0 ? 'warn' : 'info')}
                ${badge(row.staleTap ? 'stale tap' : 'tap ok', row.staleTap ? 'warn' : 'info')}
              </div>
            </button>
          `;
          }).join('');
          grid.querySelectorAll('[data-live-row-id]').forEach(node => {
            node.addEventListener('click', () => selectOpsLiveRow(node.dataset.liveRowId));
          });
        }
        opsLiveState.rows = describedRows;
        if (!describedRows.some(row => String(row.id) === String(opsLiveState.selectedRowId || ''))) {
          opsLiveState.selectedRowId = filteredRows[0] ? String(filteredRows[0].id) : '';
        }
        renderOpsLiveDrilldown(describedRows.find(row => String(row.id) === String(opsLiveState.selectedRowId || '')) || null);
        setText('opsLiveSummary', `tiles ${filteredRows.length}/${rows.length} · active taps ${tapCount} · sessions ${counts.sessions} · attention ${attentionCount}`);
        renderBadges('opsLiveBadges', [
          { text: `focus ${focus}` },
          { text: search ? `search ${search}` : 'search 없음', tone: search ? '' : 'info' },
          { text: counts.streams > 0 ? '스트림 활성' : '스트림 대기', tone: counts.streams > 0 ? '' : 'info' },
          { text: counts.taps > 0 ? '분석 활성' : '분석 대기', tone: counts.taps > 0 ? '' : 'info' },
          { text: `attention ${attentionCount}`, tone: attentionCount > 0 ? 'warn' : '' },
          { text: `reuse ${runtime?.analysisMatching?.reuseGroupCount ?? 0}` }
        ]);
        setText('opsLiveAttentionCount', attentionCount);
        setText('opsLiveUnassignedCount', unassignedCount);
      }
      async function refreshLive() {
        const [sources, views, catalog, runtime, events, users] = await Promise.all([
          requestJson('/ops/api/sources'),
          requestJson('/ops/api/views'),
          requestJson('/ops/api/rules/catalog'),
          requestJson('/ops/api/runtime/status'),
          requestJson('/ops/api/events/status?limit=12').catch(error => ({ error: error.message, records: { records: [] } })),
          requestJson('/ops/api/users').catch(error => ({ error: error.message, users: [] }))
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
        setText('opsLiveChannelCount', sourceItems.length);
        setText('opsLiveViewCount', viewItems.length);
        setText('opsLiveActiveStreams', counts.streams);
        setText('opsLiveStaleTaps', staleTapCount);
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
        const eventItems = Array.isArray(events.records?.records) ? events.records.records : [];
        renderOpsLiveTiles(sourceItems, viewItems, counts, runtime, eventItems);
        setText('opsLiveEventSummary', events.error ? `조회 실패: ${events.error}` : `records ${eventItems.length}`);
        renderOpsLiveEventRows(eventItems);
        renderRaw('opsHomeRaw', 'opsHomePretty', { sources, views, catalog, runtime, events, users });
      }
      async function refreshDashboard() {
        const runtime = await requestJson('/ops/api/runtime/status');
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
          { text: `debug 그룹 ${debugKeys.length}` },
          { text: counts.debugCounters.cleanupRequests != null ? `cleanup 요청 ${counts.debugCounters.cleanupRequests}` : 'cleanup 요청 미제공', tone: counts.debugCounters.cleanupRequests != null ? '' : 'info' },
          { text: counts.debugCounters.cleanupCompleted != null ? `cleanup 완료 ${counts.debugCounters.cleanupCompleted}` : 'cleanup 완료 미제공', tone: counts.debugCounters.cleanupCompleted != null ? '' : 'info' }
        ]);
        setText('dashCleanupText', debugKeys.length > 0 ? 'cleanup/debug 상태입니다.' : 'cleanup counter 없음');
        setText('dashEgressCount', counts.egress);
        setText('dashPublishCount', counts.publish);
        setText('dashReuseGroupCount', runtime?.analysisMatching?.reuseGroupCount ?? 0);
        setText('dashMetadataChannelCount', Array.isArray(metadata.channels) ? metadata.channels.length : 0);
        setText('dashSseClientCount', sideChannel.activeSseClients ?? 0);
        setText('dashWsClientCount', sideChannel.activeWebSocketClients ?? 0);
        setText('dashDetailText',
          `프로파일 ${runtime?.analysisMatching?.profileDocumentCount ?? 0} · 룰 ${runtime?.analysisMatching?.ruleDocumentCount ?? 0} · 발행 ${counts.publish} · 송출 ${counts.egress}`);
        renderRaw('opsDashboardRaw', 'opsDashboardPretty', runtime);
      }
      async function refreshEvents() {
        const eventParams = new URLSearchParams({ limit: '25' });
        const channelFilter = String(opsHashParams().get('channel') || '').trim();
        if (channelFilter) eventParams.set('channelId', channelFilter);
        const payload = await requestJson(`/ops/api/events/status?${eventParams.toString()}`);
        const storage = payload.storage || {};
        const post = payload.post || {};
        const records = payload.records || { records: [] };
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
        const eventItems = Array.isArray(records.records) ? records.records : [];
        setText(
          'eventRecordSummary',
          records.error
            ? `조회 실패: ${records.error}`
            : `records ${eventItems.length} · hasMore ${records.hasMore ? 'yes' : 'no'}${channelFilter ? ` · channel ${channelFilter}` : ''}`
        );
        renderEventRows(eventItems);
        renderRaw('opsEventsRaw', 'opsEventsPretty', { storage, post, records });
      }
      const itemId = item => display(item?.id || item?.ruleId || item?.profileId || '-');
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
      let opsCatalogVaRules = [];
      let opsRulesActiveMode = 'va-rule';
      let opsRulesDetailMode = 'closed';
      let opsRulesDetailRecordId = '';
      let opsVaRuleStartMode = 'direct';
      let opsVaRuleTemplateId = '';
      const opsLabAnalysisBase = ['/lab', 'analysis'].join('/');
      const opsLabProfilesPath = `${opsLabAnalysisBase}/profiles`;
      const opsLabRulesPath = `${opsLabAnalysisBase}/rules`;
      const opsLabVaRulesPath = `${opsLabAnalysisBase}/va-rules`;
      const opsRulesDefaultSummary = '채널 설정을 먼저 관리합니다.';
      const opsRulesModeConfigs = {
        'va-rule': {
          label: '채널 분석 설정',
          summary: '채널에 붙는 설정입니다.',
          composerTitle: '채널 분석 설정',
          composerHint: '채널에 붙는 최종 설정입니다.',
          saveText: '저장',
          saveProxyId: 'saveVaRuleBtn',
          steps: [
            { sectionId: 'ruleBasicSection', title: '설정 정보', hint: '설정 이름과 적용 상태를 정합니다.' },
            { sectionId: 'ruleSourceSection', title: '채널 선택', hint: '운영 채널 하나를 골라 이 설정에 바로 연결합니다.' },
            { sectionId: 'profileSection', title: '프로파일 선택', hint: '이미 저장된 프로파일 중 이 설정에 연결할 것만 선택합니다.' },
            { sectionId: 'ruleScenarioSection', title: '이벤트 방식', hint: '기본 이벤트 또는 시나리오를 고릅니다.' },
            { sectionId: 'ruleObjectsSection', title: '대상 객체', hint: '어떤 객체를 감지하고 판정할지 정합니다.' },
            { sectionId: 'ruleGeometrySection', title: '영역/라인', hint: '이 설정에서 사용할 영역 또는 라인을 지정합니다.' },
            { sectionId: 'ruleOutputSection', title: '출력 동작', hint: '오버레이 강조와 이벤트 POST 동작을 정합니다.' },
            { sectionId: 'ruleReviewSection', title: '저장 전 검토', hint: '최종 요약을 확인한 뒤 저장합니다.' }
          ]
        },
        'event-rule': {
          label: '이벤트 템플릿',
          summary: '채널 설정에서 불러오는 보조 템플릿입니다.',
          composerTitle: '이벤트 템플릿',
          composerHint: '채널 설정에서 불러와 시작합니다.',
          saveText: '저장',
          saveProxyId: 'saveRuleBtn',
          steps: [
            { sectionId: 'ruleBasicSection', title: '템플릿 정보', hint: '재사용할 템플릿 ID와 적용 상태를 정합니다.' },
            { sectionId: 'ruleSourceSection', title: '템플릿 적용 범위', hint: '특정 채널 하나가 아니라 어떤 소스 종류와 송출 경로에 공통 적용할지 정합니다.' },
            { sectionId: 'profileSection', title: '프로파일 선택', hint: '이미 저장된 프로파일 중 이 조건이 사용할 것만 선택합니다.' },
            { sectionId: 'ruleScenarioSection', title: '이벤트 방식', hint: '기본 이벤트 또는 시나리오 템플릿을 선택합니다.' },
            { sectionId: 'ruleObjectsSection', title: '대상 객체', hint: '이 조건이 판정할 객체 범위를 정합니다.' },
            { sectionId: 'ruleGeometrySection', title: '영역/라인', hint: '조건에 필요한 영역 또는 라인을 지정합니다.' },
            { sectionId: 'ruleOutputSection', title: '출력 동작', hint: '오버레이 강조와 이벤트 POST 동작을 정합니다.' }
          ]
        },
        profile: {
          label: '분석 프로파일',
          summary: '채널 설정과 템플릿에서 고르는 보조 프로파일입니다.',
          composerTitle: '분석 프로파일',
          composerHint: '채널 설정이나 템플릿에서 선택합니다.',
          saveText: '저장',
          saveProxyId: 'saveProfileBtn',
          steps: [
            { sectionId: 'profileSection', title: '프로파일 설정', hint: 'detector, FPS, 입력 크기와 추적 대상만 설정합니다.' }
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
        const host = document.getElementById('opsRulesEditorComponent');
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
          if (host) {
            host.hidden = true;
            host.dataset.mode = '';
          }
          return;
        }
        if (panel) panel.hidden = false;
        if (host) {
          host.hidden = false;
          host.dataset.mode = mode;
        }
        if (badge) badge.textContent = detailMode === 'view' ? '상세' : (detailMode === 'edit' ? '수정' : '추가');
        if (idBadge) {
          idBadge.hidden = !opsRulesDetailRecordId;
          idBadge.textContent = opsRulesDetailRecordId ? `#${opsRulesDetailRecordId}` : '#-';
        }
        if (title) title.textContent = opsRulesDetailLabel(mode, detailMode);
        if (hint) {
          hint.textContent = detailMode === 'view'
            ? '저장된 내용입니다.'
            : (detailMode === 'edit' ? '값을 바꾼 뒤 저장합니다.' : '값을 입력한 뒤 저장합니다.');
        }
        if (edit) edit.hidden = detailMode !== 'view';
        if (save) {
          save.hidden = detailMode === 'view';
          save.textContent = '저장';
        }
      }
      function opsVaRuleStartMeta(item) {
        const templateRuleId = String(item?.templateStart?.ruleId || '').trim();
        return {
          mode: templateRuleId ? 'template' : 'direct',
          templateRuleId
        };
      }
      function opsVaRuleStartLabel(item) {
        const meta = opsVaRuleStartMeta(item);
        return meta.mode === 'template'
          ? `템플릿 적용 · ${display(meta.templateRuleId)}`
          : '개별 설정';
      }
      function syncEmbeddedVaRuleStartFields(root) {
        const startModeInput = root?.getElementById('vaRuleStartMode');
        const templateInput = root?.getElementById('vaRuleTemplateRuleId');
        if (startModeInput) startModeInput.value = opsVaRuleStartMode;
        if (templateInput) templateInput.value = opsVaRuleTemplateId;
      }
      function refreshOpsVaTemplateAssistOptions() {
        const select = document.getElementById('opsVaRuleTemplateSelect');
        if (!select) return;
        const current = String(select.value || opsVaRuleTemplateId || '').trim();
        select.innerHTML = [`<option value="">템플릿을 고르세요</option>`].concat(
          opsCatalogEventTemplates.map((item) => {
            const id = String(item?.id || '').trim();
            const type = item?.scenario?.type || item?.event?.type || item?.eventType || 'event';
            return `<option value="${escapeHtml(id)}">${escapeHtml(`${id} · ${opsRuleEventTypeLabel(type)}`)}</option>`;
          })
        ).join('');
        select.value = current;
      }
      async function applyOpsVaTemplateSelection(templateId) {
        const root = await ensureOpsRulesEditorReady();
        const api = window.__mediaServerRuleEditorApi;
        const normalizedId = String(templateId || '').trim();
        if (!root || !api) return;
        if (!normalizedId) {
          opsVaRuleStartMode = 'direct';
          opsVaRuleTemplateId = '';
          syncEmbeddedVaRuleStartFields(root);
          updateOpsVaTemplateAssistUi();
          return;
        }
        const item = findOpsEventTemplateById(normalizedId);
        if (!item || typeof api.loadRule !== 'function') return;
        opsVaRuleStartMode = 'template';
        opsVaRuleTemplateId = normalizedId;
        api.loadRule(JSON.parse(JSON.stringify(item)));
        syncEmbeddedVaRuleStartFields(root);
        updateOpsVaTemplateAssistUi();
      }
      function updateOpsVaTemplateAssistUi() {
        const panel = document.getElementById('opsVaRuleTemplateAssist');
        const actions = document.getElementById('opsVaRuleTemplateAssistActions');
        const hint = document.getElementById('opsVaRuleTemplateAssistHint');
        const state = document.getElementById('opsVaRuleTemplateAssistState');
        const selectField = document.getElementById('opsVaRuleTemplateSelectField');
        const directButton = document.getElementById('opsVaRuleStartDirect');
        const templateButton = document.getElementById('opsVaRuleStartTemplate');
        const select = document.getElementById('opsVaRuleTemplateSelect');
        const show = opsRulesActiveMode === 'va-rule' && opsRulesDetailMode !== 'closed';
        const viewMode = opsRulesDetailMode === 'view';
        if (panel) panel.hidden = !show;
        if (!show) return;
        if (directButton) {
          const active = opsVaRuleStartMode !== 'template';
          directButton.classList.toggle('button-primary', active);
          directButton.classList.toggle('button-secondary', !active);
          directButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (templateButton) {
          const active = opsVaRuleStartMode === 'template';
          templateButton.classList.toggle('button-primary', active);
          templateButton.classList.toggle('button-secondary', !active);
          templateButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (actions) actions.hidden = viewMode;
        if (selectField) selectField.hidden = viewMode || opsVaRuleStartMode !== 'template';
        if (select) select.value = opsVaRuleTemplateId;
        if (hint) {
          hint.textContent = viewMode
            ? (opsVaRuleStartMode === 'template'
              ? `이 설정은 템플릿 ${display(opsVaRuleTemplateId)}에서 시작했습니다.`
              : '이 설정은 개별 설정으로 시작했습니다.')
            : (opsVaRuleStartMode === 'template'
              ? '선택한 템플릿 값으로 현재 채널 설정 입력을 먼저 채웁니다.'
              : '채널에 붙는 설정을 바로 작성합니다.');
        }
        if (state) {
          state.hidden = !viewMode;
          state.textContent = opsVaRuleStartMode === 'template'
            ? `설정 방식: 템플릿 적용 · ${display(opsVaRuleTemplateId)}`
            : '설정 방식: 개별 설정';
        }
      }
      function syncOpsVaTemplateAssist(mode) {
        if (mode !== 'va-rule') {
          const panel = document.getElementById('opsVaRuleTemplateAssist');
          if (panel) panel.hidden = true;
          return;
        }
        refreshOpsVaTemplateAssistOptions();
        updateOpsVaTemplateAssistUi();
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
          opsVaRuleStartMode = 'direct';
          opsVaRuleTemplateId = '';
          syncOpsVaTemplateAssist('');
          return;
        }
        if (steps) {
          steps.innerHTML = '';
          steps.hidden = true;
        }
        syncOpsVaTemplateAssist(mode);
      }
      function transformEmbeddedComponentScript(text) {
        return text
          .replaceAll('document.getElementById(', 'root.getElementById(')
          .replaceAll('document.querySelector(', 'root.querySelector(')
          .replaceAll('document.querySelectorAll(', 'root.querySelectorAll(')
          .replaceAll('document.documentElement.dataset.embedPanel', '__MEDIA_SERVER_EMBED_PANEL__')
          .replaceAll('document.documentElement.dataset.embed', '__MEDIA_SERVER_EMBED__')
          .replaceAll('__MEDIA_SERVER_EMBED_PANEL__', "(root.host?.dataset?.embedPanel || document.documentElement.dataset.embedPanel)")
          .replaceAll('__MEDIA_SERVER_EMBED__', "(root.host?.dataset?.embed || document.documentElement.dataset.embed)")
          .replaceAll("root.getElementById('themeToggleBtn').onclick = () => {", "const __themeToggleBtn = root.getElementById('themeToggleBtn'); if (__themeToggleBtn) __themeToggleBtn.onclick = () => {")
          .replaceAll("$('themeToggleBtn').onclick = () => {", "if ($('themeToggleBtn')) $('themeToggleBtn').onclick = () => {");
      }
      function isEmbeddedComponentBootScript(text) {
        const compact = text.replace(/\s+/g, ' ');
        return compact.includes(`const saved = localStorage.getItem('mediaServerTheme')`)
          && compact.includes(`document.documentElement.dataset.embed = params.get('embed') === '1' ? '1' : '0'`);
      }
      async function hydrateEmbeddedComponent(host) {
        if (!host) return null;
        if (host.dataset.loaded === '1' && host.shadowRoot) return host.shadowRoot;
        const url = host.dataset.componentUrl;
        if (!url) return null;
        try {
          const parsed = new URL(url, window.location.origin);
          host.dataset.embed = parsed.searchParams.get('embed') === '1' ? '1' : '0';
          host.dataset.embedPanel = parsed.searchParams.get('panel') || '';
        } catch {
          host.dataset.embed = host.dataset.embed || '0';
          host.dataset.embedPanel = host.dataset.embedPanel || '';
        }
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '';
        const baseStyle = document.createElement('style');
        baseStyle.textContent = `
          :host {
            display: block;
            color: var(--ink);
            font-family: "Avenir Next", "Pretendard", "Noto Sans KR", sans-serif;
          }
          .topbar, .standalone-nav { display: none !important; }
          .component-main {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: grid !important;
            gap: 18px !important;
          }
          .component-main > .hero,
          .component-main > .card,
          .component-main .card {
            box-shadow: none !important;
          }
        `;
        shadow.appendChild(baseStyle);
        for (const style of doc.querySelectorAll('style')) {
          const clonedStyle = document.createElement('style');
          clonedStyle.textContent = style.textContent || '';
          shadow.appendChild(clonedStyle);
        }
        const main = doc.querySelector('main');
        if (main) {
          const componentMain = document.createElement('main');
          componentMain.className = 'component-main';
          for (const child of Array.from(main.children)) {
            if (child.classList && (child.classList.contains('topbar') || child.classList.contains('standalone-nav'))) continue;
            componentMain.appendChild(document.importNode(child, true));
          }
          shadow.appendChild(componentMain);
        }
        for (const dialog of doc.querySelectorAll('body > dialog')) {
          shadow.appendChild(document.importNode(dialog, true));
        }
        for (const script of doc.querySelectorAll('script')) {
          const scriptText = script.textContent || '';
          if (!scriptText.trim()) continue;
          if (isEmbeddedComponentBootScript(scriptText)) continue;
          new Function('root', transformEmbeddedComponentScript(scriptText))(shadow);
        }
        stripEmbeddedLegacyOpsPanels(shadow);
        host.dataset.loaded = '1';
        host.classList.add('is-loaded');
        return shadow;
      }
      async function ensureOpsRulesEditorReady() {
        const host = document.getElementById('opsRulesEditorComponent');
        return hydrateEmbeddedComponent(host);
      }
      function setEmbeddedVisibility(root, id, visible) {
        const element = root?.getElementById(id);
        if (element) element.hidden = !visible;
        return element;
      }
      function setEmbeddedSectionMeta(root, sectionId, index, title, hint) {
        const section = root?.getElementById(sectionId);
        if (!section) return;
        const stepTitle = section.querySelector('.step-title');
        const numberEl = stepTitle?.querySelector('span');
        const titleEl = stepTitle?.querySelector('h2');
        const hintEl = stepTitle?.querySelector('p.hint');
        if (numberEl) {
          numberEl.hidden = true;
          numberEl.textContent = '';
        }
        if (titleEl) titleEl.textContent = title;
        if (hintEl && hint) hintEl.textContent = hint;
      }
      function setEmbeddedFieldLabel(root, fieldId, text) {
        const field = root?.getElementById(fieldId);
        const label = field?.querySelector('.field-label');
        if (label) label.textContent = text;
      }
      function setEmbeddedFormDisabled(root, disabled) {
        if (!root) return;
        const fields = root.querySelectorAll('input, select, textarea, button');
        for (const field of fields) {
          if (field.id === 'themeToggleBtn') continue;
          field.disabled = disabled;
        }
      }
      function setEmbeddedEditorHeading(root, title, note = '') {
        const heading = root?.getElementById('vaRuleEditorTitle');
        if (heading) heading.textContent = title;
        const hint = root?.querySelector('.rule-editor-identity .hint');
        if (hint) hint.textContent = note;
      }
      function reorderEmbeddedSections(root, orderedSectionIds = []) {
        const main = root?.querySelector('.component-main');
        if (!main) return;
        for (const sectionId of orderedSectionIds) {
          const section = root.getElementById(sectionId);
          if (section && section.parentElement === main) {
            main.appendChild(section);
          }
        }
      }
      function nextEmbeddedRuleId(root) {
        const select = root?.getElementById('ruleSelect');
        let maxId = 0;
        for (const option of Array.from(select?.options || [])) {
          const value = String(option.value || '').replace(/^custom:/, '');
          if (/^[0-9]+$/.test(value)) {
            maxId = Math.max(maxId, Number(value));
          }
        }
        return String(maxId + 1 || 1);
      }
      function nextEmbeddedProfileId(root) {
        const used = new Set();
        for (const option of Array.from(root?.getElementById('profileSelect')?.options || [])) {
          const value = String(option.value || '').replace(/^(builtin|custom):/, '');
          if (value) used.add(value);
        }
        let index = 1;
        while (used.has(`profile-${index}`)) index += 1;
        return `profile-${index}`;
      }
      function ensureOpsRulesModeStyles(root) {
        if (!root) return null;
        let style = root.querySelector('style[data-ops-rules-mode-style="1"]');
        if (style) return style;
        style = document.createElement('style');
        style.dataset.opsRulesModeStyle = '1';
        style.textContent = `
          .component-main > .hero,
          .component-main > .primary-tabs,
          #rulePreviewSection,
          #viewerPanel,
          #dashboardPanel,
          #vaRuleLibraryCard,
          .editor-save-actions,
          .editor-sticky-stack,
          .edit-step-nav,
          .edit-step-select,
          .debug-panel {
            display: none !important;
          }
          :host([data-ops-rules-mode="none"]) #vaRuleLibraryCard,
          :host([data-ops-rules-mode="none"]) #vaRuleEditorPanel {
            display: none !important;
          }
          :host([data-ops-rules-mode]) #ruleDocumentPanel,
          :host([data-ops-rules-mode]) #profileGuidePanel,
          :host([data-ops-rules-mode]) #profileCreatePanel,
          :host([data-ops-rules-mode]) #profileDraftActions,
          :host([data-ops-rules-mode]) #ruleDocumentActions,
          :host([data-ops-rules-mode]) #vaRuleReviewActions {
            display: none !important;
          }
          :host([data-ops-rules-mode]) #rulePreviewSection,
          :host([data-ops-rules-mode]) #viewerPanel,
          :host([data-ops-rules-mode]) #dashboardPanel {
            display: none !important;
          }
          :host([data-ops-rules-mode="profile"]) #profileDetailsPanel > summary {
            display: none !important;
          }
        `;
        root.appendChild(style);
        return style;
      }
      function stripEmbeddedLegacyOpsPanels(root) {
        if (!root) return;
        for (const buttonId of ['analysisViewerTabBtn', 'analysisDashboardTabBtn']) {
          root.getElementById(buttonId)?.remove();
        }
        const previewSection = root.getElementById('rulePreviewSection');
        if (previewSection) previewSection.hidden = true;
        for (const panelId of ['viewerPanel', 'dashboardPanel']) {
          const panel = root.getElementById(panelId);
          if (!panel) continue;
          panel.hidden = true;
          panel.replaceChildren();
        }
      }
      function focusEmbeddedModeHost(root, mode) {
        const config = opsRulesModeConfig(mode);
        focusEmbeddedRuleSection(root, config?.steps?.[0]?.sectionId || 'ruleBasicSection');
      }
      function applyEmbeddedModeSections(root, mode) {
        const config = opsRulesModeConfig(mode);
        const visible = new Set((config?.steps || []).map((step) => step.sectionId));
        const allSections = [
          'ruleBasicSection',
          'ruleSourceSection',
          'profileSection',
          'ruleScenarioSection',
          'ruleObjectsSection',
          'ruleGeometrySection',
          'ruleOutputSection',
          'ruleReviewSection'
        ];
        for (const sectionId of allSections) {
          setEmbeddedVisibility(root, sectionId, visible.has(sectionId));
        }
        (config?.steps || []).forEach((step, index) => {
          setEmbeddedSectionMeta(root, step.sectionId, index + 1, step.title, step.hint);
        });
        reorderEmbeddedSections(root, (config?.steps || []).map((step) => step.sectionId));
      }
      function applyEmbeddedSharedChrome(root) {
        const editorPanel = root?.getElementById('vaRuleEditorPanel');
        const launchButton = root?.getElementById('addVaRuleBtn');
        if (editorPanel?.hidden && launchButton) {
          launchButton.click();
        } else if (editorPanel) {
          editorPanel.hidden = false;
        }
        setEmbeddedVisibility(root, 'ruleDocumentPanel', false);
        setEmbeddedVisibility(root, 'profileGuidePanel', false);
        setEmbeddedVisibility(root, 'profileCreatePanel', false);
        setEmbeddedVisibility(root, 'profileDraftActions', false);
        setEmbeddedVisibility(root, 'vaRuleReviewActions', false);
        const deleteProfileButton = root?.getElementById('deleteProfileBtn');
        if (deleteProfileButton) deleteProfileButton.hidden = true;
        const profileDetails = root?.getElementById('profileDetailsPanel');
        if (profileDetails) profileDetails.open = false;
        const profileSummary = root?.querySelector('#profileDetailsPanel > summary');
        if (profileSummary) profileSummary.hidden = false;
      }
      function applyVaRuleMode(root) {
        setEmbeddedEditorHeading(root, '채널 분석 설정', '선택한 채널에 바로 붙는 최종 설정을 편집합니다.');
        setEmbeddedFieldLabel(root, 'ruleBasicIdField', '설정 번호');
        setEmbeddedFieldLabel(root, 'vaRuleNameField', '설정 이름');
        setEmbeddedFieldLabel(root, 'ruleProfileSelectField', '연결할 프로파일');
        const ruleIdInput = root?.getElementById('ruleId');
        if (ruleIdInput) ruleIdInput.type = 'hidden';
        const ruleIdDisplay = root?.getElementById('vaRuleIdDisplay');
        if (ruleIdDisplay) ruleIdDisplay.hidden = false;
        const ruleIdNote = root?.getElementById('ruleBasicIdNote');
        if (ruleIdNote) ruleIdNote.textContent = '저장하면 번호가 붙고, 선택 채널에 연결됩니다.';
        setEmbeddedVisibility(root, 'vaRuleNameField', true);
        setEmbeddedVisibility(root, 'ruleEnabledField', true);
        setEmbeddedVisibility(root, 'opsRuleChannelPicker', true);
        setEmbeddedVisibility(root, 'directVaRuleSourceFields', false);
        setEmbeddedVisibility(root, 'directRuleMatchFields', false);
        setEmbeddedVisibility(root, 'ruleProfileSelectField', true);
        setEmbeddedVisibility(root, 'profileSummaryText', true);
        setEmbeddedVisibility(root, 'profileDetailsPanel', false);
        setEmbeddedVisibility(root, 'ruleDocumentPanel', false);
        const profileSelectNote = root?.querySelector('#ruleProfileSelectField .form-note');
        if (profileSelectNote) profileSelectNote.textContent = '저장된 프로파일 하나를 골라 연결합니다.';
        const sourceHint = root?.getElementById('vaRuleSourceHelp');
        if (sourceHint) sourceHint.textContent = '채널 하나를 고르면 이 설정이 바로 연결됩니다.';
        const sourceSummary = root?.getElementById('vaRuleSourceSummary');
        if (sourceSummary) sourceSummary.hidden = false;
        const vaRuleSelect = root?.getElementById('vaRuleSelect');
        if (vaRuleSelect) {
          vaRuleSelect.value = '';
          vaRuleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncEmbeddedVaRuleStartFields(root);
      }
      function applyEventRuleMode(root) {
        setEmbeddedEditorHeading(root, '이벤트 템플릿', '채널 분석 설정에서 불러와 쓰는 보조 템플릿입니다.');
        setEmbeddedFieldLabel(root, 'ruleBasicIdField', '템플릿 ID');
        setEmbeddedFieldLabel(root, 'ruleProfileSelectField', '사용할 프로파일');
        const ruleIdInput = root?.getElementById('ruleId');
        if (ruleIdInput) {
          ruleIdInput.type = 'text';
          if (!/^[0-9]+$/.test(String(ruleIdInput.value || '')) || String(ruleIdInput.value || '').trim() === 'file-person-vehicle-area') {
            ruleIdInput.value = nextEmbeddedRuleId(root);
          }
        }
        const ruleIdDisplay = root?.getElementById('vaRuleIdDisplay');
        if (ruleIdDisplay) ruleIdDisplay.hidden = true;
        const ruleIdNote = root?.getElementById('ruleBasicIdNote');
        if (ruleIdNote) ruleIdNote.textContent = '다른 채널 분석 설정에서 다시 쓸 템플릿 ID입니다.';
        setEmbeddedVisibility(root, 'vaRuleNameField', false);
        setEmbeddedVisibility(root, 'ruleEnabledField', true);
        setEmbeddedVisibility(root, 'opsRuleChannelPicker', false);
        setEmbeddedVisibility(root, 'directVaRuleSourceFields', false);
        setEmbeddedVisibility(root, 'directRuleMatchFields', true);
        setEmbeddedVisibility(root, 'ruleProfileSelectField', true);
        setEmbeddedVisibility(root, 'profileSummaryText', true);
        setEmbeddedVisibility(root, 'profileDetailsPanel', false);
        const profileSelectNote = root?.querySelector('#ruleProfileSelectField .form-note');
        if (profileSelectNote) profileSelectNote.textContent = '저장된 프로파일 하나를 골라 연결합니다.';
        const sourceHint = root?.getElementById('vaRuleSourceHelp');
        if (sourceHint) sourceHint.textContent = '채널에 바로 붙지 않고, 채널 분석 설정에서 불러와 씁니다.';
        const sourceSummary = root?.getElementById('vaRuleSourceSummary');
        if (sourceSummary) sourceSummary.hidden = true;
        const ruleSourceKind = root?.getElementById('ruleSourceKind');
        if (ruleSourceKind) ruleSourceKind.value = '*';
        const ruleRoute = root?.getElementById('ruleRoute');
        if (ruleRoute) ruleRoute.value = '*';
        const ruleKindBasic = root?.querySelector('input[name="ruleKind"][value="basic"]');
        if (ruleKindBasic) {
          ruleKindBasic.checked = true;
          ruleKindBasic.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const ruleSelect = root?.getElementById('ruleSelect');
        if (ruleSelect) {
          ruleSelect.value = '';
          ruleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      function applyProfileMode(root) {
        setEmbeddedEditorHeading(root, '분석 프로파일', '채널 분석 설정과 이벤트 템플릿에서 고르는 보조 프로파일입니다.');
        setEmbeddedVisibility(root, 'ruleProfileSelectField', false);
        setEmbeddedVisibility(root, 'profileSummaryText', false);
        setEmbeddedVisibility(root, 'profileDetailsPanel', true);
        const newProfileButton = root?.getElementById('newProfileBtn');
        if (newProfileButton) newProfileButton.click();
        const profileDetails = root?.getElementById('profileDetailsPanel');
        if (profileDetails) profileDetails.open = true;
        const profileSummary = root?.querySelector('#profileDetailsPanel > summary');
        if (profileSummary) profileSummary.hidden = true;
        const profileId = root?.getElementById('profileId');
        if (profileId && (!String(profileId.value || '').trim() || String(profileId.value) === 'fast-local')) {
          profileId.value = nextEmbeddedProfileId(root);
        }
      }
      function configureEmbeddedEditorForMode(root, mode) {
        if (!root?.host) return;
        ensureOpsRulesModeStyles(root);
        root.host.dataset.opsRulesMode = mode || 'none';
        applyEmbeddedSharedChrome(root);
        applyEmbeddedModeSections(root, mode);
        if (mode === 'profile') applyProfileMode(root);
        else if (mode === 'event-rule') applyEventRuleMode(root);
        else applyVaRuleMode(root);
        focusEmbeddedModeHost(root, mode);
      }
      function focusEmbeddedRuleSection(root, targetId) {
        const target = root?.getElementById(targetId);
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      function loadOpsRulesRecordIntoEditor(mode, recordId) {
        const api = window.__mediaServerRuleEditorApi;
        const id = String(recordId || '');
        if (!api || !id) return false;
        if (mode === 'va-rule' && typeof api.loadVaRule === 'function') {
          const item = findOpsVaRuleById(id);
          if (!item) return false;
          const startMeta = opsVaRuleStartMeta(item);
          opsVaRuleStartMode = startMeta.mode;
          opsVaRuleTemplateId = startMeta.templateRuleId;
          api.loadVaRule(JSON.parse(JSON.stringify(item)));
          return true;
        }
        if (mode === 'event-rule' && typeof api.loadRule === 'function') {
          const item = findOpsEventTemplateById(id);
          if (!item) return false;
          api.loadRule(JSON.parse(JSON.stringify(item)));
          return true;
        }
        if (mode === 'profile' && typeof api.loadProfile === 'function') {
          const item = findOpsProfileById(id);
          if (!item) return false;
          api.loadProfile(JSON.parse(JSON.stringify(item)));
          return true;
        }
        return false;
      }
      async function openOpsRulesEditor(mode, detailMode = 'new', recordId = '') {
        try {
          setOpsRulesCatalogVisibility(mode);
          setOpsRulesEditorModeButtons(mode);
          setOpsRulesComposer(mode, detailMode, recordId);
          const root = await ensureOpsRulesEditorReady();
          if (!root) return;
          configureEmbeddedEditorForMode(root, mode);
          if (mode === 'va-rule' && detailMode === 'new') {
            opsVaRuleStartMode = 'direct';
            opsVaRuleTemplateId = '';
            syncEmbeddedVaRuleStartFields(root);
          }
          if (recordId && !loadOpsRulesRecordIntoEditor(mode, recordId)) {
            throw new Error('선택한 항목을 불러오지 못했습니다.');
          }
          if (mode === 'va-rule') {
            syncEmbeddedVaRuleStartFields(root);
          }
          setEmbeddedFormDisabled(root, detailMode === 'view');
          syncOpsVaTemplateAssist(mode);
          opsRulesEditorStatus('', false);
        } catch (error) {
          setOpsRulesComposer('', 'closed');
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
      async function closeOpsRulesEditor() {
        const host = document.getElementById('opsRulesEditorComponent');
        opsVaRuleStartMode = 'direct';
        opsVaRuleTemplateId = '';
        syncEmbeddedVaRuleStartFields(host?.shadowRoot || null);
        if (host) {
          host.hidden = true;
          host.dataset.mode = '';
          if (host.shadowRoot?.host) host.shadowRoot.host.dataset.opsRulesMode = 'none';
        }
        setOpsRulesComposer('', 'closed');
        setOpsRulesEditorModeButtons(opsRulesActiveMode);
        opsRulesEditorStatus('', false);
      }
      function wireOpsRulesShellClose() {
        if (activeOpsPage !== 'rules') return;
        const nav = document.querySelector('.image-nav-tabs[aria-label="운영 메뉴"]');
        if (!nav || nav.dataset.opsRulesCloseWired === '1') return;
        nav.dataset.opsRulesCloseWired = '1';
        nav.addEventListener('click', (event) => {
          const link = event.target.closest('a[href]');
          if (!link) return;
          if (opsRulesDetailMode === 'closed') return;
          closeOpsRulesEditor().catch(() => {});
        });
      }
      async function editCurrentOpsRulesRecord() {
        const mode = opsRulesActiveMode;
        const recordId = opsRulesDetailRecordId;
        await openOpsRulesEditor(mode, 'edit', recordId);
      }
      async function triggerOpsRulesSave() {
        const host = document.getElementById('opsRulesEditorComponent');
        const mode = String(host?.dataset.mode || '');
        const config = opsRulesModeConfig(mode);
        if (!config) return;
        const root = await ensureOpsRulesEditorReady();
        const button = root?.getElementById(config.saveProxyId);
        if (!button) {
          opsRulesEditorStatus('저장 버튼을 찾지 못했습니다.', true);
          return;
        }
        button.click();
        window.setTimeout(async () => {
          try {
            await refreshRules();
            const savedId = mode === 'profile'
              ? String(host.shadowRoot?.getElementById('profileId')?.value || '')
              : (mode === 'event-rule'
                ? String(host.shadowRoot?.getElementById('ruleId')?.value || '')
                : String(host.shadowRoot?.getElementById('vaRuleId')?.value || ''));
            await openOpsRulesEditor(mode, 'view', savedId);
          } catch (error) {
            setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true });
          }
        }, 350);
      }
      const opsRulesSearchTerm = () => {
        const inputValue = String(document.getElementById('opsRulesFilterInput')?.value || '').trim();
        const hashValue = String(opsHashParams().get('q') || '').trim();
        return (inputValue || hashValue).toLowerCase();
      };
      const opsRuleEventTypeLabel = (value) => {
        const type = String(value || '').trim();
        if (type === 'intrusion-dwell') return 'Intrusion Dwell';
        if (type === 're-entry') return 'Re-Entry';
        if (type === 'wrong-direction') return 'Wrong Direction';
        if (type === 'intrusion-after-line-crossing') return '라인 통과 후 영역 침입';
        if (type === 'loitering') return 'Loitering';
        if (type === 'zone-occupancy') return 'Zone Occupancy';
        if (type === 'presence') return 'Presence';
        if (type === 'enter') return 'Enter';
        if (type === 'exit') return 'Exit';
        if (type === 'line-crossing') return 'Line Crossing';
        return type || 'event';
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
          ...(Array.isArray(analysis?.classes) ? analysis.classes : []),
          ...(Array.isArray(item?.trackingClasses) ? item.trackingClasses : [])
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
        return `<div class="ops-rule-row-actions">${actions.join('')}</div>`;
      }
      function opsVaRuleStartModeHtml(item) {
        const meta = opsVaRuleStartMeta(item);
        if (meta.mode === 'template') {
          return `<div class="ops-rule-value-stack"><strong>템플릿 적용</strong><span class="ops-rule-note">${escapeHtml(meta.templateRuleId)}</span></div>`;
        }
        return `<div class="ops-rule-value-stack"><strong>개별 설정</strong></div>`;
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
      function renderOpsVaRules(items) {
        const body = document.getElementById('opsVaRuleRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 8, '저장된 채널 분석 설정이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const analysis = item.analysis || {};
          const eventName = item.scenario?.type || item.scenario?.name || item.event?.type || item.eventType || (item.outputs?.events ? 'events' : 'metadata');
          const id = String(item?.id || '');
          const startModeText = opsVaRuleStartLabel(item);
          const statusHtml = opsRulesStatusBadge(item?.enabled !== false);
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-va', id),
            opsRuleActionButton('삭제', 'delete-va', id, 'danger')
          ]);
          return `<tr>
            <td data-label="룰">
              <div class="ops-rule-id-cell">
                <strong>#${escapeHtml(itemId(item))}</strong>
              </div>
            </td>
            <td data-label="소스">${opsRuleSourceHtml(item.source)}</td>
            <td data-label="프로파일">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(display(analysis.profileId || item.profileId || 'server-default-va'))}</strong>
              </div>
            </td>
            <td data-label="설정 방식">${opsVaRuleStartModeHtml(item)}</td>
            <td data-label="이벤트">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(opsRuleEventTypeLabel(display(eventName)))}</strong>
              </div>
            </td>
            <td data-label="대상">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(listText(analysis.classes || item.classes || analysis.trackingClasses))}</strong>
              </div>
            </td>
            <td class="table-cell-nowrap table-cell-status" data-label="상태">
              <div class="ops-rule-status-actions">${statusHtml}</div>
            </td>
            <td class="table-cell-actions" data-label="작업">${actionsHtml}</td>
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
          const analysis = item.analysis || {};
          const type = item.scenario?.type || item.event?.type || item.eventType || 'event';
          const stateText = opsRulesStatusBadge(item?.enabled !== false);
          const id = String(item?.id || '');
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-event-template', id),
            opsRuleActionButton('삭제', 'delete-event-template', id, 'danger')
          ]);
          return `<tr>
            <td data-label="룰">
              <div class="ops-rule-id-cell">
                <strong>#${escapeHtml(itemId(item))}</strong>
              </div>
            </td>
            <td data-label="매칭">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(matchText(item.match))}</strong>
              </div>
            </td>
            <td data-label="분석">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(display(analysis.profileId || analysis.detector || '미제공'))}</strong>
              </div>
            </td>
            <td data-label="출력">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(`${opsRuleEventTypeLabel(type)} · ${outputsText(item.outputs)}`)}</strong>
              </div>
            </td>
            <td class="table-cell-nowrap table-cell-status" data-label="상태">
              <div class="ops-rule-status-actions">${stateText}</div>
            </td>
            <td class="table-cell-actions" data-label="작업">${actionsHtml}</td>
          </tr>`;
        }).join('');
      }
      function opsProfileUsageSummary(profileId) {
        const profileText = String(profileId || '').trim();
        if (!profileText) return '없음';
        let vaRuleCount = 0;
        let templateCount = 0;
        for (const item of opsCatalogVaRules) {
          if (String(item?.analysis?.profileId || '').trim() === profileText) vaRuleCount += 1;
        }
        for (const item of opsCatalogEventTemplates) {
          if (String(item?.analysis?.profileId || '').trim() === profileText) templateCount += 1;
        }
        if (vaRuleCount === 0 && templateCount === 0) return '없음';
        return `채널 ${vaRuleCount} / 템플릿 ${templateCount}`;
      }
      function renderOpsProfiles(items) {
        const body = document.getElementById('opsProfileRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 6, '저장된 분석 프로파일이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const id = String(item?.id || item?.profileId || '');
          const actionsHtml = opsRuleActionButtons([
            opsRuleActionButton('상세', 'view-profile', id),
            opsRuleActionButton('삭제', 'delete-profile', id, 'danger')
          ]);
          return `<tr>
            <td data-label="프로파일">
              <div class="ops-rule-id-cell">
                <strong>${escapeHtml(itemId(item))}</strong>
              </div>
            </td>
            <td data-label="검출기">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(display(item.detector || item.runtime || '미제공'))}</strong>
              </div>
            </td>
            <td data-label="FPS">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(display(item.fps || item.maxFps || '미제공'))}</strong>
              </div>
            </td>
            <td data-label="대상">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(listText(item.trackingClasses || item.classes))}</strong>
              </div>
            </td>
            <td data-label="사용처">
              <div class="ops-rule-value-stack">
                <strong>${escapeHtml(opsProfileUsageSummary(id))}</strong>
              </div>
            </td>
            <td class="table-cell-actions" data-label="작업">${actionsHtml}</td>
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
        return opsCatalogProfiles.find((item) => String(item?.id || item?.profileId || '') === String(id || ''));
      }
      async function openOpsVaRuleRecord(id, detailMode = 'view') {
        if (!findOpsVaRuleById(id)) {
          opsRulesEditorStatus('선택한 채널 분석 설정을 불러오지 못했습니다.', true);
          return;
        }
        await openOpsRulesEditor('va-rule', detailMode, id);
        opsRulesEditorStatus(`채널 분석 설정 #${id}을 불러왔습니다.`, false);
      }
      async function openOpsEventTemplateRecord(id, detailMode = 'view') {
        if (!findOpsEventTemplateById(id)) {
          opsRulesEditorStatus('선택한 이벤트 템플릿을 불러오지 못했습니다.', true);
          return;
        }
        await openOpsRulesEditor('event-rule', detailMode, id);
        opsRulesEditorStatus(`이벤트 템플릿 #${id}을 불러왔습니다.`, false);
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
        if (!window.confirm(`채널 분석 설정 #${id}${name}을 삭제할까요?`)) return;
        await requestJson(`${opsLabVaRulesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const root = await ensureOpsRulesEditorReady();
        if (String(root?.getElementById('vaRuleId')?.value || '') === String(id)) {
          await closeOpsRulesEditor();
        }
        await refreshRules();
        opsRulesEditorStatus(`채널 분석 설정 #${id}를 삭제했습니다.`, false);
      }
      async function deleteOpsEventTemplateRecord(id) {
        const item = findOpsEventTemplateById(id);
        if (!item) {
          opsRulesEditorStatus('삭제할 이벤트 템플릿을 찾지 못했습니다.', true);
          return;
        }
        if (!window.confirm(`이벤트 템플릿 '${id}'를 삭제할까요?`)) return;
        await requestJson(`${opsLabRulesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const root = await ensureOpsRulesEditorReady();
        if (String(root?.getElementById('ruleId')?.value || '') === String(id)) {
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
        const root = await ensureOpsRulesEditorReady();
        if (String(root?.getElementById('profileId')?.value || '') === String(id)) {
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
        const [catalog, views] = await Promise.all([
          requestJson('/ops/api/rules/catalog'),
          requestJson('/ops/api/views')
        ]);
        const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
        const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
        const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
        opsCatalogProfiles = profiles;
        opsCatalogEventTemplates = rules;
        opsCatalogVaRules = vaRules;
        const viewItems = Array.isArray(views.views) ? views.views : [];
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
        const filteredProfiles = searchTerm ? profiles.filter(item => opsRuleSearchableText(item).includes(searchTerm)) : profiles;
        setText('rulesVaRuleCount', vaRules.length);
        setText('rulesEventRuleCount', rules.length);
        setText('rulesProfileCount', profiles.length);
        setText('rulesViewBindingCount', boundRuleIds.size);
        setText('opsVaRuleSummary', `총 ${filteredVaRules.length}/${vaRules.length}개 · 연결 ${boundRuleIds.size}개`);
        setText('opsEventRuleSummary', `총 ${filteredRules.length}/${rules.length}개`);
        setText('opsProfileSummary', `총 ${filteredProfiles.length}/${profiles.length}개`);
        refreshOpsVaTemplateAssistOptions();
        renderOpsVaRules(filteredVaRules);
        renderOpsEventRules(filteredRules);
        renderOpsProfiles(filteredProfiles);
        wireOpsRuleTableActions();
      }
      function wireOpsRefresh() {
        document.getElementById('opsHomeRefresh')?.addEventListener('click', () => refreshLive().catch(error => setText('homeRuntimeText', error.message)));
        document.getElementById('opsLiveRefresh')?.addEventListener('click', () => refreshLive().catch(error => setText('opsLiveSummary', error.message)));
        document.getElementById('opsLiveDensity')?.addEventListener('change', () => refreshLive().catch(error => setText('opsLiveSummary', error.message)));
        document.getElementById('opsLiveFocus')?.addEventListener('change', () => refreshLive().catch(error => setText('opsLiveSummary', error.message)));
        document.getElementById('opsLiveFilterInput')?.addEventListener('input', () => refreshLive().catch(error => setText('opsLiveSummary', error.message)));
        document.getElementById('opsLivePreviewTarget')?.addEventListener('change', event => {
          opsPreviewTarget = String(event.target.value || 'primary');
          updateOpsLivePreviewUi();
        });
        document.getElementById('opsLivePreviewStart')?.addEventListener('click', () => startOpsLivePreview().catch(error => {
          opsPreviewStateFor().lastError = error.message || 'preview start failed';
          updateOpsLivePreviewUi();
        }));
        document.getElementById('opsLivePreviewMode')?.addEventListener('change', event => {
          opsPreviewStateFor().overlayMode = normalizeOverlayMode(event.target.value) || 'raw';
          updateOpsLivePreviewUi();
        });
        document.getElementById('opsLivePreviewRestart')?.addEventListener('click', () => startOpsLivePreview({ restart: true }).catch(error => {
          opsPreviewStateFor().lastError = error.message || 'preview restart failed';
          updateOpsLivePreviewUi();
        }));
        document.getElementById('opsLivePreviewStop')?.addEventListener('click', () => stopOpsLivePreview(opsPreviewTarget, { preserveRow: true }).catch(() => {}));
        document.getElementById('opsRulesFilterInput')?.addEventListener('input', () => refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddVaRuleBtn')?.addEventListener('click', () => selectOpsRulesMode('va-rule').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddEventRuleBtn')?.addEventListener('click', () => selectOpsRulesMode('event-rule').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsAddProfileBtn')?.addEventListener('click', () => selectOpsRulesMode('profile').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateVaRuleBtn')?.addEventListener('click', () => openOpsRulesEditor('va-rule', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateEventRuleBtn')?.addEventListener('click', () => openOpsRulesEditor('event-rule', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsCreateProfileBtn')?.addEventListener('click', () => openOpsRulesEditor('profile', 'new').catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVaRuleStartDirect')?.addEventListener('click', () => {
          ensureOpsRulesEditorReady().then((root) => {
            opsVaRuleStartMode = 'direct';
            opsVaRuleTemplateId = '';
            syncEmbeddedVaRuleStartFields(root);
            updateOpsVaTemplateAssistUi();
          }).catch((error) => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
        });
        document.getElementById('opsVaRuleStartTemplate')?.addEventListener('click', () => {
          opsVaRuleStartMode = 'template';
          updateOpsVaTemplateAssistUi();
          const selectedId = String(document.getElementById('opsVaRuleTemplateSelect')?.value || '').trim();
          ensureOpsRulesEditorReady().then((root) => {
            if (selectedId) {
              return applyOpsVaTemplateSelection(selectedId);
            }
            syncEmbeddedVaRuleStartFields(root);
            return null;
          }).catch((error) => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
        });
        document.getElementById('opsVaRuleTemplateSelect')?.addEventListener('change', (event) => {
          applyOpsVaTemplateSelection(String(event.target.value || '')).catch((error) => {
            opsRulesEditorStatus(error.message || '템플릿을 불러오지 못했습니다.', true);
          });
        });
        document.getElementById('opsRulesComposerEdit')?.addEventListener('click', () => editCurrentOpsRulesRecord().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesComposerClose')?.addEventListener('click', () => closeOpsRulesEditor().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsRulesComposerSave')?.addEventListener('click', () => triggerOpsRulesSave().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsDashboardRefresh')?.addEventListener('click', () => refreshDashboard().catch(error => setText('dashHealthText', error.message)));
        document.getElementById('opsEventsRefresh')?.addEventListener('click', () => refreshEvents().catch(error => setText('eventRecordSummary', error.message)));
        document.getElementById('opsRulesRefresh')?.addEventListener('click', () => refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsLivePretty')?.addEventListener('change', () => refreshLive().catch(() => {}));
        document.getElementById('opsDashboardPretty')?.addEventListener('change', () => refreshDashboard().catch(() => {}));
        document.getElementById('opsEventsPretty')?.addEventListener('change', () => refreshEvents().catch(() => {}));
      }
      applyPrincipalVisibility().catch(() => {});
      wireOpsRefresh();
      wireOpsRulesShellClose();
      if (activeOpsPage === 'dashboard') {
        refreshDashboard().catch(error => setText('dashHealthText', error.message));
      } else if (activeOpsPage === 'events') {
        refreshEvents().catch(error => setText('eventRecordSummary', error.message));
      } else if (activeOpsPage === 'rules') {
        refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
        setOpsRulesCatalogVisibility('va-rule');
        setOpsRulesEditorModeButtons('va-rule');
        setOpsRulesComposer('', 'closed');
      } else if (activeOpsPage === 'home') {
        refreshLive().catch(error => setText('homeRuntimeText', error.message));
      } else if (activeOpsPage === 'live') {
        refreshLive().catch(error => setText('opsLiveSummary', error.message));
        setInterval(() => refreshOpsLivePreviewHealth().catch(() => {}), 3000);
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) Promise.all(opsPreviewSlots.map(slot => stopOpsLivePreview(slot.key, { preserveRow: true }))).catch(() => {});
        });
        window.addEventListener('pagehide', () => Promise.all(opsPreviewSlots.map(slot => stopOpsLivePreview(slot.key, { keepalive: true }))).catch(() => {}));
        window.addEventListener('beforeunload', () => {
          for (const slot of opsPreviewSlots) {
            const state = opsPreviewStateFor(slot.key);
            if (state.sessionId && state.viewId) {
              fetch(`/client/api/views/${encodeURIComponent(state.viewId)}/webrtc/session/${encodeURIComponent(state.sessionId)}`, {
                method: 'DELETE',
                keepalive: true
              }).catch(() => {});
            }
          }
        });
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
    const streamRoute = ")OPSSOURCES" << stream_route_json << R"OPSSOURCES(";
    const rtspPort = )OPSSOURCES" << rtsp_port << R"OPSSOURCES(;
    let loadedSources = [];
    let loadedViews = [];
    let currentChannelId = '';
    let editorMode = 'view';
    let currentChannelEnabled = true;
    let initializedHashChannel = false;
	    const { escapeHtml, requestJson, formDataObject, setFeedback, setTableEmpty, setSelectOptions } = window.MediaServerUi;
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
    const kindHelpText = source => {
      const kind = String(source?.kind || '').toLowerCase();
      if (kind === 'webrtc') return 'WHIP publish로 이미 등록된 sourceId를 연결합니다.';
      if (kind === 'whep') return '외부 WHEP playback URL을 서버가 pull합니다.';
      if (kind === 'rtsp') return '카메라/게이트웨이 RTSP 주소를 서버가 pull합니다.';
      if (kind === 'http') return 'HTTP/HLS URL을 서버가 pull합니다.';
      if (kind === 'file') return '서버 로컬 파일 기반 채널입니다.';
      return '입력 종류를 확인하세요.';
    };
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
        <div class="channel-stream-actions">
          <button type="button" class="secondary" data-copy-stream-type="rtsp" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${label} RTSP 복사" aria-label="${label} RTSP 복사">RTSP</button>
          <button type="button" class="secondary" data-copy-stream-type="whep" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${label} WHEP 복사" aria-label="${label} WHEP 복사">WHEP</button>
        </div>
      `;
    }
    async function copyTextToClipboard(value) {
      const text = String(value || '');
      if (!text) throw new Error('empty clipboard value');
      let clipboardError = null;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (error) {
          clipboardError = error;
        }
      }
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
      if (copyByEvent()) return;
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
        if (document.execCommand('copy')) return;
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
      const isNew = mode === 'new';
      channelMode.textContent = isNew ? '새 채널' : (isView ? '상세' : '수정 중');
      const visibleId = channelForm.elements.channelId.value || id || currentChannelId;
      channelIdBadge.textContent = visibleId ? `#${visibleId}` : '#-';
      channelTitle.textContent = isNew
        ? '채널 추가'
        : `채널 #${channelForm.elements.channelId.value || id}`;
      channelHelp.textContent = isView
        ? '저장된 내용입니다.'
        : '값을 바꾼 뒤 저장합니다.';
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
        const inputText = source.sourceId ? locatorForSource(source) : '소스 미등록';
        return `
        <tr>
          <td data-label="번호">
            <div class="channel-id-cell">
              <strong>${escapeHtml(row.id || '')}</strong>
            </div>
          </td>
          <td data-label="이름">${escapeHtml(channelName)}</td>
          <td data-label="종류">
            <div class="channel-kind-cell">
              <strong>${escapeHtml(kindLabel(source.kind))}</strong>
              <span class="channel-kind-note">${escapeHtml(kindHelpText(source))}</span>
            </div>
          </td>
          <td data-label="상태">
            <div class="channel-status-actions">
              ${enabled ? chip('활성') : chip('비활성', 'warn')}
              <button type="button" class="secondary" data-toggle-channel="${escapeHtml(row.id || '')}">${enabled ? '비활성화' : '적용'}</button>
            </div>
          </td>
          <td data-label="입력">
            <div class="channel-input-stack">
              <span class="token">${escapeHtml(inputText)}</span>
              <span class="channel-source-note">${escapeHtml(source.sourceId ? `sourceId ${source.sourceId}` : 'PublishedView 연결 전')}</span>
            </div>
          </td>
          <td data-label="라이브 URL">${liveButtons}</td>
          <td data-label="VA URL">${vaButtons}</td>
          <td data-label="작업">
            <div class="channel-row-actions">
              <button type="button" class="secondary" data-view-channel="${escapeHtml(row.id || '')}">상세</button>
              <button type="button" class="secondary" data-open-client-live="${escapeHtml(row.id || '')}" ${view?.enabled === false ? 'disabled' : ''}>라이브 보기</button>
              <button type="button" class="danger" data-delete-channel="${escapeHtml(row.id || '')}">삭제</button>
            </div>
          </td>
	        </tr>
	      `;
	      }).join('');
	      bindChannelRowActions();
	    }
	    function bindChannelRowActions() {
	      document.querySelectorAll('[data-view-channel]').forEach(button => {
	        button.addEventListener('click', () => openChannel(button.dataset.viewChannel || '', 'view'));
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
	    function renderRegistryRaw(sources, views, clientViews) {
	      document.querySelector('#sources-json').textContent = JSON.stringify(sources, null, 2);
	      document.querySelector('#views-json').textContent = JSON.stringify(views, null, 2);
	      document.querySelector('#client-views-json').textContent = JSON.stringify(clientViews, null, 2);
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
      renderRegistryRaw(sources, views, clientViews);
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
        currentChannelEnabled = enabled;
        setStatus(`채널 #${id} 상태 변경 완료: ${enabled ? '활성' : '비활성'}`);
      } catch (error) {
        setStatus(`채널 상태 변경 실패: ${error.message}`, true);
      }
    }
    async function deleteChannel(id) {
      if (!id) id = channelForm.elements.channelId.value.trim();
      if (!id) return;
      if (!window.confirm(`채널 #${id}을 삭제할까요? 현재 API는 source/view를 비활성화합니다.`)) return;
      try {
        const results = await Promise.allSettled([
          requestJson(`/ops/api/views/${encodeURIComponent(id)}`, { method: 'DELETE' }),
          requestJson(`/ops/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' })
        ]);
        const failed = results.filter(result => result.status === 'rejected');
        await loadAll();
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
      setTableEmpty
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
      form.elements.viewId.value = '';
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
        const td = document.createElement('td');
        td.setAttribute('data-label', label);
        if (className) td.className = className;
        td.innerHTML = html;
        tr.appendChild(td);
        return td;
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
        if (value === 'lab:read') return { label: 'Lab 보기' };
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
          const primary = labels.length <= 2 ? labels.join(' · ') : `${labels.length}개 범위`;
          const note = labels.length <= 2
            ? targets[0]
            : `${labels.join(' · ')} · ${targets[0]}`;
          return userValueHtml(primary, note);
        }
        if (labels.length <= 2) {
          return userValueHtml(labels.join(' · '));
        }
        const preview = labels.slice(0, 3).join(' · ');
        return userValueHtml(`${labels.length}개 범위`, labels.length > 3 ? `${preview} 외 ${labels.length - 3}개` : preview);
      }
      function appendUserRow(user) {
        const tr = document.createElement('tr');
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><strong>${escapeHtml(displayValue(user.username))}</strong></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(user.displayName || '미제공'));
        appendLabeledCell(tr, '권한', userValueHtml(roleLabel(user.role)));
        appendLabeledCell(tr, '상태', `<div class="user-status-actions">${chip(user.enabled ? '활성' : '비활성', user.enabled ? '' : 'warn')}</div>`, 'table-cell-status');
        appendLabeledCell(tr, '권한 범위', userScopeHtml(user.scopes), 'user-scope-cell');
        appendLabeledCell(tr, '마지막 로그인', userValueHtml(user.lastLoginAt || '미제공'));
        appendLabeledCell(tr, '잠금 만료', userValueHtml(user.lockedUntil || '없음'));
        appendLabeledCell(tr, '비밀번호 변경', userValueHtml(yesNo(user.mustChangePassword)));
        const actionsHtml = `
          <div class="user-row-actions">
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
        appendLabeledCell(tr, '계정명', `<div class="user-id-cell"><strong>${escapeHtml(displayValue(request.username))}</strong></div>`);
        appendLabeledCell(tr, '이름', userValueHtml(request.displayName || '미제공'));
        appendLabeledCell(tr, '연락처', userValueHtml(request.contact || '미제공'));
        appendLabeledCell(tr, '채널', userValueHtml(request.viewId || '미지정'));
        appendLabeledCell(tr, '사유', userValueHtml(request.reason || '미제공'));
        appendLabeledCell(tr, '상태', `<div class="user-status-actions">${chip(requestStatusLabel(request.status), requestStatusTone(request.status))}</div>`, 'table-cell-status');
        appendLabeledCell(tr, '요청/결정', userValueHtml(request.createdAt || '미제공', request.decidedAt || ''));
        const actionsHtml = request.status === 'pending'
          ? `<div class="user-row-actions">
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
        if (!enabled && username === 'admin') {
          setStatus('마지막 활성 admin이면 서버가 비활성화를 거부합니다.', true);
        }
        await requestJson(`/ops/api/users/${encodeURIComponent(username)}/${enabled ? 'enable' : 'disable'}`, { method: 'POST' });
        await loadAll();
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
          setStatus('사용자 추가 완료');
          return;
        }
        if (!payload.username) return;
        delete payload.password;
        delete payload.confirmPassword;
        await requestJson(`/ops/api/users/${encodeURIComponent(payload.username)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadAll();
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
