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
    let selectedViewId = views[0]?.viewId || '';
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
      http: 'HTTP/HLS',
      hls: 'HTTP/HLS',
      webrtc: 'WebRTC'
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
    const maxLiveTiles = isPreviewMode ? 9 : 4;
    const initialLiveTileCount = Math.min(maxLiveTiles, Math.max(1, Number(localStorage.getItem('mediaServerClientLiveGrid') || 4) || 4));
    let liveTileCount = initialLiveTileCount;
    const liveTiles = Array.from({ length: maxLiveTiles }, (_, index) => ({
      index,
      viewId: views[index]?.viewId || views[0]?.viewId || '',
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
      stale: false
    }));
    let selectedLiveTile = views.length > 0 ? 0 : null;
    let liveStatusTimer = null;
    let liveDashboardTimer = null;
    function tileView(tile) {
      return viewById(tile?.viewId || '');
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
      root.querySelector('[data-role="placeholder"]').hidden = Boolean(tile.sessionId);
      const startBtn = root.querySelector('[data-action="start"]');
      const stopBtn = root.querySelector('[data-action="stop"]');
      if (startBtn) startBtn.disabled = !view || Boolean(tile.sessionId);
      if (stopBtn) stopBtn.disabled = !tile.sessionId;
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
      tile.viewId = viewId || '';
      const root = document.querySelector(`[data-tile="${index}"]`);
      if (root) {
        const viewSelect = root.querySelector('[data-role="view"]');
        if (viewSelect) viewSelect.value = tile.viewId;
      }
      applyTileModeOptions(tile);
	      updateTileDom(tile);
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
	                  ${views.map(view => `<option value="${escapeHtml(view.viewId)}">${escapeHtml(view.displayName || view.viewId)}</option>`).join('')}
	                </select>
	              </label>
	              <label data-role="mode-wrap">보기 방식
	                <select data-role="mode" aria-label="보기 방식"></select>
	              </label>
	            </div>
	            <div class="tile-actions">
	              <button type="button" data-action="start">시작</button>
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
	            <button id="liveAllStop" class="ghost" type="button">전체 정지</button>
	          </div>
	          <section class="detail-box" id="liveSelectedDetail">${emptyState('타일을 선택하세요', '선택한 타일의 연결, 메타데이터, 이벤트 상태가 여기에 표시됩니다.')}</section>
	          <div class="live-grid" data-grid-size="${liveTileCount}">
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
	        viewSelect.value = tile.viewId;
	        viewSelect.disabled = Boolean(tile.sessionId);
	        viewSelect.addEventListener('change', () => setTileView(tile.index, viewSelect.value));
	      }
	      const modeSelect = root.querySelector('[data-role="mode"]');
	      if (modeSelect) {
	        modeSelect.addEventListener('change', () => {
	          if (!tile.sessionId) tile.overlayMode = modeSelect.value;
	        });
	      }
	      root.querySelector('[data-action="start"]')?.addEventListener('click', () => startLiveTile(tile.index));
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
      updateTileDom(tile);
      try {
        const pc = await createClientPeerConnection();
        tile.pc = pc;
        pc.onconnectionstatechange = () => {
          tile.connectionStatus = pc.connectionState || 'connecting';
          if (['connected', 'completed'].includes(tile.connectionStatus)) tile.status = 'live';
          if (['failed', 'disconnected', 'closed'].includes(tile.connectionStatus)) tile.status = 'offline';
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
        await stopLiveTile(index, { keepError: true });
        updateTileDom(tile);
      }
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
      }
      tile.trackCount = null;
      tile.eventCount = null;
      tile.lastMetadataAt = 0;
      applyTileModeOptions(tile);
      updateTileDom(tile);
      refreshSelectedTileDetail();
    }
    async function stopAllLiveTiles() {
      await Promise.all(liveTiles.map(tile => stopLiveTile(tile.index)));
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
      const eventTime = record => record.updateTime ?? record.startTime ?? record.timestamp ?? record.endTime ?? '';
      const formatTime = value => {
        if (value === null || value === undefined || value === '') return '미제공';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return String(value);
        return numeric > 1000000000000 ? new Date(numeric).toLocaleString() : `${Math.round(numeric)}ms`;
      };
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
      async function refreshLive() {
        const [sources, catalog, runtime, users] = await Promise.all([
          requestJson('/ops/api/sources'),
          requestJson('/ops/api/rules/catalog'),
          requestJson('/ops/api/runtime/status'),
          requestJson('/ops/api/users').catch(error => ({ error: error.message, users: [] }))
        ]);
        const sourceItems = Array.isArray(sources.sources) ? sources.sources : [];
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
        renderBadges('homeRuntimeState', [
          { text: staleTapCount > 0 ? '확인 필요' : '정상', tone: staleTapCount > 0 ? 'warn' : '' },
          { text: counts.streams > 0 ? '활성' : '대기', tone: counts.streams > 0 ? '' : 'info' }
        ]);
        setText('homeRuntimeText', staleTapCount > 0
          ? `${staleTapCount}개 분석 탭이 지연 상태입니다. 대시보드에서 런타임 상세를 확인하세요.`
          : '현재 지연 탭 경고는 없습니다.');
        renderRaw('opsLiveRaw', 'opsLivePretty', { sources, catalog, runtime, users });
      }
      async function refreshDashboard() {
        const runtime = await requestJson('/ops/api/runtime/status');
        const counts = runtimeCounts(runtime);
        setText('dashActiveSessions', counts.sessions);
        setText('dashActiveStreams', counts.streams);
        setText('dashActiveTaps', counts.taps);
        setText('dashPublishSources', counts.publishSources);
        renderBadges('dashHealthBadges', [
          { text: counts.streams > 0 ? '스트림 활성' : '스트림 대기', tone: counts.streams > 0 ? '' : 'info' },
          { text: counts.taps > 0 ? '분석 활성' : '분석 대기', tone: counts.taps > 0 ? '' : 'info' },
          { text: counts.egress > 0 ? '송출 활성' : '송출 대기', tone: counts.egress > 0 ? '' : 'info' }
        ]);
        setText('dashHealthText', `세션 ${counts.sessions} · 스트림 ${counts.streams} · 분석 탭 ${counts.taps}`);
        renderBadges('dashRuntimeRows', [
          { text: `송출 ${counts.egress}` },
          { text: `발행 ${counts.publish}` },
          { text: `재사용 그룹 ${runtime?.analysisMatching?.reuseGroupCount ?? 0}` }
        ]);
        setText('dashRuntimeText', `프로파일 문서 ${runtime?.analysisMatching?.profileDocumentCount ?? 0} · 룰 문서 ${runtime?.analysisMatching?.ruleDocumentCount ?? 0}`);
        const metadata = runtime?.webrtcHttp?.metadataDataChannel || {};
        renderBadges('dashBackpressureRows', [
          { text: `메타데이터 채널 ${Array.isArray(metadata.channels) ? metadata.channels.length : 0}` },
          { text: `sse ${runtime?.webrtcHttp?.metadataSideChannel?.activeSseClients ?? 0}` },
          { text: `ws ${runtime?.webrtcHttp?.metadataSideChannel?.activeWebSocketClients ?? 0}` }
        ]);
        setText('dashBackpressureText', 'DataChannel/SSE/WS 상태는 raw JSON 접힘 영역에서 세부 카운터를 확인합니다.');
        const debugKeys = Object.keys(counts.debugCounters);
        renderBadges('dashCleanupRows', debugKeys.slice(0, 4).map(key => ({ text: key })));
        setText('dashCleanupText', debugKeys.length > 0 ? `${debugKeys.length}개 cleanup/debug counter group 사용 가능` : 'cleanup counter가 아직 수집되지 않았습니다.');
        renderRaw('opsDashboardRaw', 'opsDashboardPretty', runtime);
      }
      async function refreshEvents() {
        const payload = await requestJson('/ops/api/events/status?limit=25');
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
        setText('eventRecordSummary', records.error ? `조회 실패: ${records.error}` : `records ${eventItems.length} · hasMore ${records.hasMore ? 'yes' : 'no'}`);
        renderEventRows(eventItems);
        renderRaw('opsEventsRaw', 'opsEventsPretty', { storage, post, records });
      }
      const itemId = item => display(item?.id || item?.ruleId || item?.profileId || '-');
      const listText = value => Array.isArray(value) ? (value.length ? value.join(', ') : '미제공') : display(value);
      const sourceText = source => {
        if (!source || typeof source !== 'object') return '미제공';
        if (source.kind === 'file') return `파일 · ${display(source.file)}`;
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
      const statusBadge = item => item?.enabled === false ? badge('비활성', 'warn') : badge('적용 중');
      function renderOpsVaRules(items) {
        const body = document.getElementById('opsVaRuleRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 6, '저장된 VA 룰이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const analysis = item.analysis || {};
          const eventName = item.scenario?.type || item.scenario?.name || item.event?.type || item.eventType || (item.outputs?.events ? 'events' : 'metadata');
          return `<tr>
            <td data-label="룰">#${escapeHtml(itemId(item))}</td>
            <td data-label="소스">${escapeHtml(sourceText(item.source))}</td>
            <td data-label="프로파일">${escapeHtml(display(analysis.profileId || item.profileId || 'server-default-va'))}</td>
            <td data-label="이벤트">${escapeHtml(display(eventName))}</td>
            <td data-label="대상">${escapeHtml(listText(analysis.classes || item.classes || analysis.trackingClasses))}</td>
            <td data-label="상태">${statusBadge(item)}</td>
          </tr>`;
        }).join('');
      }
      function renderOpsEventRules(items) {
        const body = document.getElementById('opsEventRuleRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 5, '저장된 이벤트 룰이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => {
          const analysis = item.analysis || {};
          return `<tr>
            <td data-label="룰">#${escapeHtml(itemId(item))}</td>
            <td data-label="매칭">${escapeHtml(matchText(item.match))}</td>
            <td data-label="분석">${escapeHtml(display(analysis.profileId || analysis.detector || '미제공'))}</td>
            <td data-label="출력">${escapeHtml(outputsText(item.outputs))}</td>
            <td data-label="상태">${statusBadge(item)}</td>
          </tr>`;
        }).join('');
      }
      function renderOpsProfiles(items) {
        const body = document.getElementById('opsProfileRows');
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(body, 5, '저장된 분석 프로파일이 없습니다.');
          return;
        }
        body.innerHTML = items.map(item => `<tr>
          <td data-label="프로파일">${escapeHtml(itemId(item))}</td>
          <td data-label="검출기">${escapeHtml(display(item.detector || item.runtime || '미제공'))}</td>
          <td data-label="FPS">${escapeHtml(display(item.fps || item.maxFps || '미제공'))}</td>
          <td data-label="대상">${escapeHtml(listText(item.trackingClasses || item.classes))}</td>
          <td data-label="상태">${statusBadge(item)}</td>
        </tr>`).join('');
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
        const viewItems = Array.isArray(views.views) ? views.views : [];
        const boundRuleIds = new Set();
        for (const view of viewItems) {
          if (view.defaultRuleId) boundRuleIds.add(String(view.defaultRuleId));
          if (Array.isArray(view.allowedRuleIds)) {
            view.allowedRuleIds.forEach(id => boundRuleIds.add(String(id)));
          }
        }
        setText('rulesVaRuleCount', vaRules.length);
        setText('rulesEventRuleCount', rules.length);
        setText('rulesProfileCount', profiles.length);
        setText('rulesViewBindingCount', boundRuleIds.size);
        setText('opsVaRuleSummary', `VA 룰 ${vaRules.length}개 · PublishedView 연결 ${boundRuleIds.size}개`);
        setText('opsEventRuleSummary', `이벤트 룰 ${rules.length}개`);
        setText('opsProfileSummary', `분석 프로파일 ${profiles.length}개`);
        renderOpsVaRules(vaRules);
        renderOpsEventRules(rules);
        renderOpsProfiles(profiles);
      }
      function wireOpsRefresh() {
        document.getElementById('opsLiveRefresh')?.addEventListener('click', () => refreshLive().catch(error => setText('homeRuntimeText', error.message)));
        document.getElementById('opsDashboardRefresh')?.addEventListener('click', () => refreshDashboard().catch(error => setText('dashHealthText', error.message)));
        document.getElementById('opsEventsRefresh')?.addEventListener('click', () => refreshEvents().catch(error => setText('eventRecordSummary', error.message)));
        document.getElementById('opsRulesRefresh')?.addEventListener('click', () => refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsLivePretty')?.addEventListener('change', () => refreshLive().catch(() => {}));
        document.getElementById('opsDashboardPretty')?.addEventListener('change', () => refreshDashboard().catch(() => {}));
        document.getElementById('opsEventsPretty')?.addEventListener('change', () => refreshEvents().catch(() => {}));
      }
      applyPrincipalVisibility().catch(() => {});
      wireOpsRefresh();
      if (activeOpsPage === 'dashboard') {
        refreshDashboard().catch(error => setText('dashHealthText', error.message));
      } else if (activeOpsPage === 'events') {
        refreshEvents().catch(error => setText('eventRecordSummary', error.message));
      } else if (activeOpsPage === 'rules') {
        refreshRules().catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
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
    const saveButton = document.querySelector('#save-channel');
    const deleteButton = document.querySelector('#delete-channel');
    const editSelectedButton = document.querySelector('#channel-edit-selected');
    const copySelectedButton = document.querySelector('#channel-copy-selected');
    const streamRoute = ")OPSSOURCES" << stream_route_json << R"OPSSOURCES(";
    const rtspPort = )OPSSOURCES" << rtsp_port << R"OPSSOURCES(;
    let loadedSources = [];
    let loadedViews = [];
    let currentChannelId = '';
    let editorMode = 'view';
    let currentChannelEnabled = true;
	    const { escapeHtml, requestJson, formDataObject, setFeedback, setTableEmpty, setSelectOptions } = window.MediaServerUi;
	    const setStatus = (message, failed = false) => {
	      setFeedback(statusEl, message, failed, { collapseEmpty: true });
	    };
	    const setChannelValidation = message => {
	      setFeedback(channelValidation, message, Boolean(message));
	    };
    const kindLabel = kind => ({
      file: '파일',
      rtsp: 'RTSP URL',
      webrtc: 'WHIP sourceId',
      http: 'HTTP/HLS URL'
    })[kind] || kind || '미제공';
    const locatorForSource = source => {
      if (source.webrtcSourceId) return `WHIP sourceId: ${source.webrtcSourceId}`;
      return source.file || source.rtspUrl || source.httpUrl || '미제공';
    };
    const streamTransportLabel = type => ({
      rtsp: 'RTSP',
      whep: 'WebRTC'
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
          <button type="button" class="secondary" data-copy-stream-type="whep" data-copy-stream-mode="${copyMode}" data-copy-stream-channel="${id}" title="${label} WebRTC 복사" aria-label="${label} WebRTC 복사">WebRTC</button>
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
    const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(text)}</span>`;
    const findSource = id => loadedSources.find(source => source.sourceId === id) || null;
    const findView = id => loadedViews.find(view => view.viewId === id || view.sourceId === id) || null;
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
      const rows = [];
      const claimedSources = new Set();
      for (const view of views) {
        const source = sources.find(item => item.sourceId === view.sourceId) || sources.find(item => item.sourceId === view.viewId) || null;
        if (source) claimedSources.add(source.sourceId);
        rows.push({ id: view.viewId || view.sourceId, source, view });
      }
      for (const source of sources) {
        if (!claimedSources.has(source.sourceId)) rows.push({ id: source.sourceId, source, view: null });
      }
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
        if (element.id === 'delete-channel') continue;
        element.disabled = disabled;
      }
      saveButton.hidden = disabled;
      deleteButton.hidden = editorMode === 'new' || editorMode === 'clone';
      editSelectedButton.hidden = !disabled || !currentChannelId;
      copySelectedButton.hidden = !currentChannelId;
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
      const isClone = mode === 'clone';
      channelMode.textContent = isNew ? '새 채널' : (isClone ? '복제' : (isView ? '보기' : '수정'));
      const visibleId = channelForm.elements.channelId.value || id || currentChannelId;
      channelIdBadge.textContent = visibleId ? `#${visibleId}` : '#-';
      channelTitle.textContent = isNew
        ? '채널 추가'
        : (isClone ? '채널 복제' : `채널 #${channelForm.elements.channelId.value || id}`);
      channelHelp.textContent = isView
        ? '선택한 채널의 저장 상태입니다. 수정하려면 수정 버튼을 누르세요.'
        : '채널 이름, 종류, 입력값, 활성 상태만 저장합니다.';
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
        const numericId = isNumericChannelId(row.id);
        const liveButtons = source.sourceId ? streamButtonsForChannel(source, 'raw') : '<span class="hint">소스 미등록</span>';
        const vaButtons = source.sourceId ? streamButtonsForChannel(source, 'va') : '<span class="hint">소스 미등록</span>';
        return `
        <tr>
          <td data-label="번호"><div class="badge-row"><span>${escapeHtml(row.id || '')}</span>${numericId ? '' : chip('기존 문자열 ID', 'warn')}</div></td>
          <td data-label="이름">${escapeHtml(view.displayName || source.displayName || '')}</td>
          <td data-label="종류">${escapeHtml(kindLabel(source.kind))}</td>
          <td data-label="상태">
            <div class="channel-status-actions">
              ${enabled ? chip('적용 중') : chip('비활성', 'warn')}
              <button type="button" class="secondary" data-toggle-channel="${escapeHtml(row.id || '')}">${enabled ? '비활성화' : '적용'}</button>
            </div>
          </td>
          <td data-label="입력" class="token channel-input-cell">${escapeHtml(source.sourceId ? locatorForSource(source) : '소스 미등록')}</td>
          <td data-label="라이브 URL">${liveButtons}</td>
          <td data-label="VA URL">${vaButtons}</td>
          <td data-label="작업">
            <div class="channel-row-actions">
              <button type="button" class="secondary" data-view-channel="${escapeHtml(row.id || '')}">보기</button>
              <button type="button" class="secondary" data-edit-channel="${escapeHtml(row.id || '')}">수정</button>
              <button type="button" class="secondary" data-copy-channel="${escapeHtml(row.id || '')}">복제</button>
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
      document.querySelectorAll('[data-edit-channel]').forEach(button => {
        button.addEventListener('click', () => openChannel(button.dataset.editChannel || '', 'edit'));
      });
      document.querySelectorAll('[data-copy-channel]').forEach(button => {
        button.addEventListener('click', () => openChannel(button.dataset.copyChannel || '', 'clone'));
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
      const view = findView(id) || {};
      const isClone = mode === 'clone';
      channelForm.elements.channelId.value = isClone ? nextChannelId(id) : (isNumericChannelId(id) ? id : '');
      channelForm.elements.displayName.value = view.displayName || source.displayName || '';
      channelForm.elements.kind.value = source.kind || 'file';
      loadFileOptions(source.file || '');
      channelForm.elements.rtspUrl.value = source.rtspUrl || '';
      channelForm.elements.webrtcSourceId.value = source.webrtcSourceId || '';
      channelForm.elements.httpUrl.value = source.httpUrl || '';
      currentChannelEnabled = isClone ? false : (source.enabled !== false && view.enabled !== false);
      if (isClone && channelForm.elements.displayName.value) {
        channelForm.elements.displayName.value = `${channelForm.elements.displayName.value} 복제`;
      }
      updateKindFields();
	      const legacyIdMessage = !isClone && id && !isNumericChannelId(id)
	        ? `기존 문자열 ID "${id}"는 legacy 데이터입니다. 새 저장은 숫자 채널 ID로만 가능합니다.`
	        : '';
	      setChannelValidation(legacyIdMessage);
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
        http: data.httpUrl
      };
      if (!(locatorByKind[kind] || '').trim()) {
        if (kind === 'webrtc') return 'WHIP publish로 등록된 Source ID가 필요합니다. 외부 WebRTC/WHEP URL pull은 아직 지원하지 않습니다.';
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
      const view = findView(id) || { viewId: id, sourceId: source.sourceId };
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
        setStatus(`채널 #${id} 상태 변경 완료: ${enabled ? '적용 중' : '비활성'}`);
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
    document.querySelector('#delete-channel').addEventListener('click', () => deleteChannel(''));
    document.querySelector('#channel-close').addEventListener('click', () => {
      channelPanel.hidden = true;
      document.querySelector('[data-ops-panel], .panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    editSelectedButton.addEventListener('click', () => currentChannelId && fillChannel(currentChannelId, 'edit'));
    copySelectedButton.addEventListener('click', () => currentChannelId && fillChannel(currentChannelId, 'clone'));
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
    const userEditor = document.querySelector('#user-editor');
    const userEditorTitle = document.querySelector('#user-editor-title');
    const createButton = document.querySelector('#create-btn');
    const updateButton = document.querySelector('#update-btn');
    const assignment = document.querySelector('#view-assignment');
    const passwordFields = document.querySelector('#password-fields');
    const {
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
      userEditor.open = false;
      userEditor.hidden = true;
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
    function setEditorMode(mode, title) {
      userEditor.hidden = false;
      userEditorTitle.textContent = title;
      setPasswordFieldsVisible(mode === 'create');
      createButton.hidden = mode !== 'create';
      updateButton.hidden = mode === 'create';
      updateAssignmentVisibility();
      userEditor.open = true;
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
      setEditorMode('edit', `사용자 수정 · ${user.username}`);
      userEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function resetUserForm() {
      form.reset();
      form.elements.role.value = 'viewer';
      form.elements.enabled.checked = true;
      form.elements.mustChangePassword.checked = true;
      setEditorMode('create', '사용자 추가');
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
    function appendTextCell(tr, value, className = '') {
      const td = document.createElement('td');
      td.textContent = displayValue(value);
      if (className) td.className = className;
      tr.appendChild(td);
      return td;
    }
    function appendUserRow(user) {
      const tr = document.createElement('tr');
      userRowCells(user).forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (index === 3) {
          td.textContent = '';
          const wrap = document.createElement('div');
          wrap.className = 'user-status-actions';
          wrap.appendChild(chipElement(value, user.enabled ? '' : 'warn'));
          td.appendChild(wrap);
        }
        if (index === 4) {
          td.className = 'user-scope-cell';
        }
        tr.appendChild(td);
      });
      const actionTd = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'user-row-actions';
      actions.append(
        userActionButton('수정', 'secondary', () => fillForm(user)),
        userActionButton(user.enabled ? '비활성화' : '활성화', user.enabled ? 'danger' : 'secondary', () => setEnabled(user.username, !user.enabled))
      );
      actionTd.appendChild(actions);
      tr.appendChild(actionTd);
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
      appendTextCell(tr, request.username);
      appendTextCell(tr, request.displayName || '');
      appendTextCell(tr, request.contact || '');
      appendTextCell(tr, request.viewId || '미지정');
      appendTextCell(tr, request.reason || '');
      const statusTd = document.createElement('td');
      statusTd.appendChild(chipElement(requestStatusLabel(request.status), requestStatusTone(request.status)));
      tr.appendChild(statusTd);
      appendTextCell(tr, `${request.createdAt || '미제공'}${request.decidedAt ? `\n${request.decidedAt}` : ''}`);
      const actionTd = document.createElement('td');
      if (request.status === 'pending') {
        const actions = document.createElement('div');
        actions.className = 'user-row-actions';
        actions.append(
          userActionButton('승인', 'primary', () => approveAccessRequest(request)),
          userActionButton('거절', 'danger', () => rejectAccessRequest(request))
        );
        actionTd.appendChild(actions);
      } else {
        actionTd.appendChild(chipElement('처리 완료'));
      }
      tr.appendChild(actionTd);
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
      renderUsers(json.users || []);
    }
    async function loadAccessRequests() {
      const json = await requestJson('/ops/api/access-requests');
      renderAccessRequests(json.accessRequests || []);
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
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    document.querySelector('#update-btn').onclick = async () => {
      const payload = formPayload();
      if (!payload.username) return;
      try {
        delete payload.password;
        delete payload.confirmPassword;
        await requestJson(`/ops/api/users/${encodeURIComponent(payload.username)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadAll();
        hideUserEditor();
      } catch (error) {
        setStatus(error.message, true);
      }
    };
    document.querySelector('#cancel-user-edit-btn').onclick = () => {
      hideUserEditor();
    };
    document.querySelector('#add-user-btn').onclick = resetUserForm;
    form.elements.role.addEventListener('change', updateAssignmentVisibility);
    document.querySelector('#refresh-btn').onclick = () => {
      setInviteOutput('');
      loadAll().catch(error => setStatus(error.message, true));
    };
    updateButton.hidden = true;
    updateAssignmentVisibility();
    loadAll().catch(error => setStatus(error.message, true));
  </script>
)OPSUSERS";
}


}  // namespace ingress
