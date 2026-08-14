// 파일 용도: 클라이언트 접근 요청과 viewer shell JavaScript controller를 조립한다.
#include "ingress/product_ui_page_scripts.h"

#include <sstream>
#include <string>

namespace ingress {

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
    const activePage = document.body?.dataset?.clientActive || 'dashboard';
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
    const isPreviewMode = document.body?.dataset?.clientPreview === 'true';
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
      const digestItems = Array.isArray(events.incidentDigest?.digestItems) ? events.incidentDigest.digestItems.slice(0, 3) : [];
      for (const item of digestItems) {
        lines.push(`요약: ${item.summaryText || 'viewer-safe event summary'} / ${item.severity || 'normal'}`);
      }
      const eventDigestItems = Array.isArray(events.eventDigest?.digestItems) ? events.eventDigest.digestItems.slice(0, 3) : [];
      for (const item of eventDigestItems) {
        lines.push(`이벤트 digest: ${item.summaryText || 'viewer-safe event summary'} / ${item.severity || 'normal'} / ${item.timelineHint || 'recorded event'}`);
      }
      const resolutionDigestItems = Array.isArray(events.resolutionDigest?.digestItems) ? events.resolutionDigest.digestItems.slice(0, 3) : [];
      for (const item of resolutionDigestItems) {
        lines.push(`판정 digest: ${item.summaryText || 'viewer-safe resolution summary'} / ${item.resolutionStatus || 'review-needed'} / ${item.timelineHint || 'active resolution'}`);
      }
      const sourceStatusDigestItems = Array.isArray(events.sourceStatusDigest?.digestItems) ? events.sourceStatusDigest.digestItems.slice(0, 3) : [];
      for (const item of sourceStatusDigestItems) {
        lines.push(`소스 상태 digest: ${item.summaryText || 'viewer-safe source status summary'} / ${item.sourceStatus || 'offline'} / ${item.connectionStatus || 'disconnected'}`);
      }
      const maintenanceDigestItems = Array.isArray(events.maintenanceDigest?.digestItems) ? events.maintenanceDigest.digestItems.slice(0, 3) : [];
      for (const item of maintenanceDigestItems) {
        lines.push(`정비 digest: ${item.summaryText || 'viewer-safe maintenance summary'} / ${item.maintenanceState || 'unavailable'} / ${item.timelineHint || 'unavailable'}`);
      }
      const impactForecastItems = Array.isArray(events.clientImpactForecast?.digestItems) ? events.clientImpactForecast.digestItems.slice(0, 3) : [];
      for (const item of impactForecastItems) {
        lines.push(`영향 forecast: ${item.summaryText || 'viewer-safe client impact forecast'} / ${item.liveImpact || 'client live unchanged'} / ${item.eventDigestImpact || 'event digest unchanged'}`);
      }
      const operationsNoticeItems = Array.isArray(events.clientOperationsNotice?.noticeItems) ? events.clientOperationsNotice.noticeItems.slice(0, 3) : [];
      for (const item of operationsNoticeItems) {
        lines.push(`운영 notice: ${item.operationsStatus || 'degraded'} / ${item.timelineHint || 'degraded'}`);
      }
      const actionNoticeItems = Array.isArray(events.clientActionNoticePreview?.noticeItems) ? events.clientActionNoticePreview.noticeItems.slice(0, 3) : [];
      for (const item of actionNoticeItems) {
        lines.push(`Action notice: ${item.noticeStatus || 'degraded'} / ${item.timelineHint || 'degraded'}`);
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
      const incident = clientIncidentStatusSummary(payload);
      return [
        `채널: ${view.displayName || view.viewId || '미제공'}`,
        `현장 상태: ${fieldState.text}`,
        `인시던트: ${incident.label}`,
        `인시던트 근거: ${incident.detail}`,
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
    function renderClientSafeIncidentDigest(incidentDigest = {}) {
      const items = Array.isArray(incidentDigest.digestItems) ? incidentDigest.digestItems : [];
      return `<section class="client-safe-incident-digest" data-testid="client-safe-incident-digest" data-client-incident-digest="viewer-safe" aria-label="viewer-safe incident digest">
        <div class="toolbar">
          <div>
            <h3>인시던트 요약</h3>
            <p>${incidentDigest.viewerSafe === true ? '안전 요약만 표시됩니다.' : '요약 상태 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${incidentDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${incidentDigest.sourceLocatorIncluded === false ? 'info' : 'warn'}">locator ${incidentDigest.sourceLocatorIncluded === false ? '숨김' : '확인'}</span>
            <span class="chip ${incidentDigest.rawEvidenceIncluded === false ? 'info' : 'warn'}">raw ${incidentDigest.rawEvidenceIncluded === false ? '숨김' : '확인'}</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('인시던트 요약 없음', '표시할 viewer-safe digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe event summary')}</strong>
                <span>${escapeHtml(item.eventType || 'event')} · ${escapeHtml(item.status || 'recorded')} · ${escapeHtml(formatTime(item.time))}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'normal')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientSafeEventDigest(eventDigest = {}) {
      const items = Array.isArray(eventDigest.digestItems) ? eventDigest.digestItems : [];
      return `<section class="client-safe-event-digest" data-testid="client-safe-event-digest" data-client-event-digest="viewer-safe" aria-label="viewer-safe event digest" data-client-digest-schema="media-server.client.event-digest.v1">
        <div class="toolbar">
          <div>
            <h3>이벤트 digest</h3>
            <p>${eventDigest.viewerSafe === true ? '허용된 이벤트 요약만 표시됩니다.' : '이벤트 digest 상태 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${eventDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${eventDigest.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip ${eventDigest.encodedClipPathIncluded === false ? 'info' : 'warn'}">clip path ${eventDigest.encodedClipPathIncluded === false ? '숨김' : '확인'}</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('이벤트 digest 없음', '표시할 viewer-safe event digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe event summary')}</strong>
                <span>${escapeHtml(item.eventType || 'event')} · ${escapeHtml(item.status || 'recorded')} · ${escapeHtml(item.timelineHint || 'recorded event')} · ${escapeHtml(formatTime(item.time))}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'normal')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientSafeResolutionDigest(resolutionDigest = {}) {
      const items = Array.isArray(resolutionDigest.digestItems) ? resolutionDigest.digestItems : [];
      return `<section class="client-safe-resolution-digest" data-testid="client-safe-resolution-digest" data-client-resolution-digest="viewer-safe" aria-label="viewer-safe resolution digest" data-client-digest-schema="media-server.client.resolution-digest.v1">
        <div class="toolbar">
          <div>
            <h3>판정 digest</h3>
            <p>${resolutionDigest.viewerSafe === true ? '허용된 판정 상태 요약만 표시됩니다.' : '판정 digest 상태 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${resolutionDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${resolutionDigest.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip info">operator note 숨김</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('판정 digest 없음', '표시할 viewer-safe resolution digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe resolution summary')}</strong>
                <span>${escapeHtml(item.resolutionStatus || 'review-needed')} · ${escapeHtml(item.resolutionLabel || 'review needed')} · ${escapeHtml(item.timelineHint || 'active resolution')} · ${escapeHtml(formatTime(item.time))}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'normal')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientSafeSourceStatusDigest(sourceStatusDigest = {}) {
      const items = Array.isArray(sourceStatusDigest.digestItems) ? sourceStatusDigest.digestItems : [];
      return `<section class="client-safe-source-status-digest" data-testid="client-safe-source-status-digest" data-client-source-status-digest="viewer-safe" aria-label="viewer-safe source status digest" data-client-digest-schema="media-server.client.source-status-digest.v1">
        <div class="toolbar">
          <div>
            <h3>소스 상태 digest</h3>
            <p>${sourceStatusDigest.viewerSafe === true ? '허용된 소스 상태와 연결 요약만 표시됩니다.' : '소스 상태 digest 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${sourceStatusDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${sourceStatusDigest.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip info">locator 숨김</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('소스 상태 digest 없음', '표시할 viewer-safe source status digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe source status summary')}</strong>
                <span>${escapeHtml(item.sourceStatus || 'offline')} · ${escapeHtml(item.connectionStatus || 'disconnected')} · video ${escapeHtml(item.videoFrameStatus || 'unavailable')} · metadata ${escapeHtml(item.metadataStatus || 'unavailable')} · ${escapeHtml(item.timelineHint || 'source unavailable')}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'attention')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientSafeMaintenanceDigest(maintenanceDigest = {}) {
      const items = Array.isArray(maintenanceDigest.digestItems) ? maintenanceDigest.digestItems : [];
      return `<section class="client-safe-maintenance-digest" data-testid="client-safe-maintenance-digest" data-client-maintenance-digest="viewer-safe" aria-label="viewer-safe maintenance digest" data-client-digest-schema="media-server.client.v340-maintenance-digest.v1">
        <div class="toolbar">
          <div>
            <h3>정비 상태 digest</h3>
            <p>${maintenanceDigest.viewerSafe === true ? '정비/복구/미제공 요약만 표시됩니다.' : '정비 상태 digest 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${maintenanceDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${maintenanceDigest.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip info">raw 숨김</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('정비 상태 digest 없음', '표시할 viewer-safe maintenance digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe maintenance summary')}</strong>
                <span>${escapeHtml(item.maintenanceState || 'unavailable')} · ${escapeHtml(item.timelineHint || 'unavailable')}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'attention')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientOperationsNotice(clientOperationsNotice = {}) {
      const items = Array.isArray(clientOperationsNotice.noticeItems) ? clientOperationsNotice.noticeItems : [];
      return `<section class="client-operations-notice" data-testid="client-operations-notice" data-client-operations-notice="viewer-safe" aria-label="viewer-safe operations notice" data-client-digest-schema="media-server.client.v350-operations-notice.v1">
        <div class="toolbar">
          <div>
            <h3>운영 notice</h3>
            <p>${clientOperationsNotice.viewerSafe === true ? '운영 상태와 timeline hint만 표시됩니다.' : '운영 notice 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${clientOperationsNotice.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${clientOperationsNotice.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip info">status/timeline only</span>
          </div>
        </div>
        <div class="client-operations-notice-list">
          ${items.length === 0
            ? emptyState('운영 notice 없음', '표시할 viewer-safe operations notice가 없습니다.')
            : items.map(item => `<article class="client-operations-notice-item">
              <strong>${escapeHtml(item.operationsStatus || 'degraded')}</strong>
              <span>${escapeHtml(item.timelineHint || 'degraded')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientActionNoticePreview(clientActionNoticePreview = {}) {
      const items = Array.isArray(clientActionNoticePreview.noticeItems) ? clientActionNoticePreview.noticeItems : [];
      const allowedStatus = value => ['maintenance', 'degraded', 'recovering', 'available'].includes(String(value || '')) ? String(value || '') : 'degraded';
      return `<section class="client-action-notice-preview" data-testid="client-action-notice-preview" data-client-action-notice-preview="viewer-safe" aria-label="viewer-safe action notice preview" data-client-digest-schema="media-server.client.v380-action-notice-preview.v1">
        <div class="toolbar">
          <div>
            <h3>Action notice</h3>
            <p>${clientActionNoticePreview.viewerSafe === true ? '상태와 일정만 표시됩니다.' : '상태 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${clientActionNoticePreview.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${clientActionNoticePreview.previewOnly === true ? 'info' : 'warn'}">preview</span>
            <span class="chip info">status/timeline</span>
          </div>
        </div>
        <div class="client-action-notice-list">
          ${items.length === 0
            ? emptyState('Action notice 없음', '표시할 viewer-safe action notice가 없습니다.')
            : items.map(item => `<article class="client-action-notice-item">
              <div>
                <strong>${escapeHtml(item.viewerSafeTitle || 'Action notice')}</strong>
                <span>${escapeHtml(item.viewerSafeBody || 'Service status is being reviewed.')}</span>
              </div>
              <small>${escapeHtml(allowedStatus(item.noticeStatus))} · ${escapeHtml(item.timelineHint || allowedStatus(item.noticeStatus))}</small>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientImpactForecast(clientImpactForecast = {}) {
      const items = Array.isArray(clientImpactForecast.digestItems) ? clientImpactForecast.digestItems : [];
      return `<section class="client-impact-forecast" data-testid="client-impact-forecast" data-client-impact-forecast="viewer-safe" aria-label="viewer-safe client impact forecast" data-client-digest-schema="media-server.client.v350-impact-forecast.v1">
        <div class="toolbar">
          <div>
            <h3>영향 forecast</h3>
            <p>${clientImpactForecast.viewerSafe === true ? 'source/view/command plan 영향이 안전 요약으로 표시됩니다.' : '영향 forecast 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${clientImpactForecast.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${clientImpactForecast.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip info">command detail 숨김</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('영향 forecast 없음', '표시할 viewer-safe client impact forecast가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.summaryText || 'viewer-safe client impact forecast')}</strong>
                <span>${escapeHtml(item.sourceImpact || 'source impact unavailable')} · ${escapeHtml(item.viewImpact || 'view impact unavailable')} · ${escapeHtml(item.commandPlanImpact || 'command plan impact pending')}</span>
                <span>${escapeHtml(item.liveImpact || 'client live unchanged')} · ${escapeHtml(item.dashboardImpact || 'dashboard unchanged')} · ${escapeHtml(item.eventDigestImpact || 'event digest unchanged')} · ${escapeHtml(item.timelineHint || 'available')}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'info')}</span>
            </article>`).join('')}
        </div>
      </section>`;
    }
    function renderClientSafeFollowUpDigest(followUpDigest = {}) {
      const items = Array.isArray(followUpDigest.digestItems) ? followUpDigest.digestItems : [];
      return `<section class="client-safe-followup-digest" data-testid="client-safe-followup-digest" data-client-followup-digest="viewer-safe" aria-label="viewer-safe follow-up digest">
        <div class="toolbar">
          <div>
            <h3>후속 조치 요약</h3>
            <p>${followUpDigest.viewerSafe === true ? '허용된 view의 상태만 표시됩니다.' : '후속 조치 요약 확인이 필요합니다.'}</p>
          </div>
          <div class="meta">
            <span class="chip ${followUpDigest.viewerSafe === true ? 'info' : 'warn'}">viewer-safe</span>
            <span class="chip ${followUpDigest.publishedViewScoped === true ? 'info' : 'warn'}">view scope</span>
            <span class="chip ${followUpDigest.rawEvidenceIncluded === false ? 'info' : 'warn'}">raw ${followUpDigest.rawEvidenceIncluded === false ? '숨김' : '확인'}</span>
          </div>
        </div>
        <div class="client-safe-digest-list">
          ${items.length === 0
            ? emptyState('후속 조치 요약 없음', '표시할 viewer-safe follow-up digest가 없습니다.')
            : items.map(item => `<article class="client-safe-digest-item">
              <div>
                <strong>${escapeHtml(item.followUpStatus || 'recorded')}</strong>
                <span>${escapeHtml(formatTime(item.time))}</span>
              </div>
              <span class="chip ${item.severity === 'attention' ? 'warn' : 'info'}">${escapeHtml(item.severity || 'normal')}</span>
            </article>`).join('')}
        </div>
      </section>`;
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
    const clientIncidentStatusSummary = (dashboardPayload = {}) => {
      const health = dashboardPayload.health || {};
      const analysis = dashboardPayload.analysis || {};
      const events = dashboardPayload.events || {};
      const recent = Array.isArray(events.recent) ? events.recent : [];
      const counts = Array.isArray(events.countsByType) ? events.countsByType : [];
      const activeCount = numberValue(analysis.activeEventCount);
      const fieldState = dashboardFieldState(health, events);
      const leadEventType = String(recent[0]?.eventType || counts[0]?.eventType || '').trim();
      if (events.provided === false) {
        return {
          label: '이벤트 미제공',
          tone: 'info',
          detail: '이 view는 이벤트 요약 권한이 꺼져 있어 상태와 신호만 표시합니다.',
          eventType: '',
          count: 0
        };
      }
      if (events.warning || activeCount > 0 || recent.length > 0) {
        const countText = activeCount > 0 ? `${activeCount}건 활성` : `${recent.length}건 최근`;
        return {
          label: events.warning ? '확인 필요' : '최근 이벤트 있음',
          tone: 'warn',
          detail: `${leadEventType || 'event'} · ${countText}`,
          eventType: leadEventType,
          count: activeCount || recent.length
        };
      }
      if (fieldState.tone === 'warn' || fieldState.tone === 'bad') {
        return {
          label: '상태 확인',
          tone: fieldState.tone,
          detail: fieldState.text,
          eventType: '',
          count: 0
        };
      }
      if (fieldState.tone === 'info') {
        return {
          label: '신호 확인 중',
          tone: 'info',
          detail: fieldState.text,
          eventType: '',
          count: 0
        };
      }
      return {
        label: '인시던트 없음',
        tone: '',
        detail: '최근 이벤트와 source health가 viewer-safe 정상 범위입니다.',
        eventType: '',
        count: 0
      };
    };
    const clientSafeStatusSummaryHtml = (dashboardPayload = {}, options = {}) => {
      const health = dashboardPayload.health || {};
      const analysis = dashboardPayload.analysis || {};
      const events = dashboardPayload.events || {};
      const incident = clientIncidentStatusSummary(dashboardPayload);
      const latest = analysis.latestEventTime ?? events.latestEventTime;
      const testId = options.testId || 'client-safe-status-summary';
      const title = options.title || 'Client-safe 상태 요약';
      return `
        <section class="events client-safe-status-summary" data-testid="${escapeHtml(testId)}" data-client-summary-contract="viewer-safe-event-source-health-incident" data-client-redaction-review="viewer-safe-no-locator-debug">
          <div class="client-incident-banner${incident.tone ? ` ${incident.tone}` : ''}">
            <div>
              <span>인시던트 상태</span>
              <strong>${escapeHtml(incident.label)}</strong>
            </div>
            <p>${escapeHtml(incident.detail)}</p>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <div class="summary client-status-evidence">
            <div class="metric"><span>Source health</span><strong>${escapeHtml(clientHealthSummaryLabel(health.summary || health.status))}</strong></div>
            <div class="metric"><span>영상 신호</span><strong>${escapeHtml(clientStatusLabel(health.videoFrameStatus || health.status))}</strong></div>
            <div class="metric"><span>메타데이터</span><strong>${escapeHtml(clientStatusLabel(health.metadataStatus))}</strong></div>
            <div class="metric"><span>최근 이벤트</span><strong>${escapeHtml(formatTime(latest))}</strong></div>
          </div>
        </section>
      `;
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
	        <div class="client-dashboard-shell client-viewer-dashboard" data-testid="client-dashboard-shell" data-viewer-flow="status-events" data-client-redaction-review="viewer-safe-no-locator-debug" data-admin-preview-review="preview-aware">
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
        <section class="events client-field-summary client-viewer-summary" data-testid="client-dashboard-field-summary">
          <h3>현장 요약</h3>
          <div class="summary">
            <div class="metric"><span>현장 상태</span><strong>${escapeHtml(fieldState.text)}</strong></div>
            <div class="metric"><span>상태 요약</span><strong>${escapeHtml(clientHealthSummaryLabel(health.summary || health.status))}</strong></div>
            <div class="metric"><span>영상 신호</span><strong>${escapeHtml(clientStatusLabel(health.videoFrameStatus || health.status))}</strong></div>
            <div class="metric"><span>데이터 지연</span><strong>${escapeHtml(ms(health.metadataAgeMs))}</strong></div>
          </div>
        </section>
        ${clientSafeStatusSummaryHtml(payload, { testId: 'client-dashboard-safe-summary', title: 'Viewer-safe event/status summary' })}
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
        <section class="events client-dashboard-compare client-viewer-compare" data-testid="client-dashboard-compare">
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
	        <section class="events client-viewer-events-summary">
	          <h3>이벤트 요약</h3>
          <div class="meta">
            ${(events.countsByType || []).map(item => `<span class="chip">${escapeHtml(item.eventType || '이벤트')} ${escapeHtml(item.count)}</span>`).join('') || '<span class="chip info">이벤트 없음</span>'}
          </div>
          ${renderClientSafeSourceStatusDigest(events.sourceStatusDigest || {})}
          ${renderClientSafeMaintenanceDigest(events.maintenanceDigest || {})}
          ${renderClientOperationsNotice(events.clientOperationsNotice || {})}
          ${renderClientActionNoticePreview(events.clientActionNoticePreview || {})}
          ${renderClientImpactForecast(events.clientImpactForecast || {})}
          ${renderClientSafeEventDigest(events.eventDigest || {})}
          ${renderClientSafeResolutionDigest(events.resolutionDigest || {})}
          ${renderClientSafeIncidentDigest(events.incidentDigest || {})}
          ${renderClientSafeFollowUpDigest(events.followUpDigest || {})}
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
        <div class="client-viewer-events" data-viewer-flow="events-first" data-client-redaction-review="viewer-safe-no-locator-debug" data-admin-preview-review="preview-aware">
        <div class="toolbar client-events-head">
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
        ${renderClientSafeSourceStatusDigest(events.sourceStatusDigest || {})}
        ${renderClientSafeMaintenanceDigest(events.maintenanceDigest || {})}
        ${renderClientOperationsNotice(events.clientOperationsNotice || {})}
        ${renderClientActionNoticePreview(events.clientActionNoticePreview || {})}
        ${renderClientImpactForecast(events.clientImpactForecast || {})}
        ${renderClientSafeEventDigest(events.eventDigest || {})}
        ${renderClientSafeResolutionDigest(events.resolutionDigest || {})}
        ${renderClientSafeIncidentDigest(events.incidentDigest || {})}
        ${renderClientSafeFollowUpDigest(events.followUpDigest || {})}
        <section class="events client-viewer-event-feed">${renderEvents(events.recent || [])}</section>
        </div>
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
	        <aside class="live-source-dock client-live-dock" data-testid="client-live-source-tree" data-viewer-redaction="source-url-hidden" data-client-redaction-review="viewer-safe-no-locator-debug" data-admin-preview-review="preview-aware" aria-label="라이브 소스 트리">
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
	          <section class="live-dock-event-feed client-live-event-dock" data-testid="client-live-dock-event-feed" data-redaction="viewer-safe-events" data-client-redaction-review="viewer-safe-no-locator-debug" data-admin-preview-review="preview-aware" aria-live="polite">
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
	        <div class="live-monitor live-sketch-monitor client-live-workspace" data-testid="client-live-action-reduction" data-viewer-flow="video-first" data-client-redaction-review="viewer-safe-no-locator-debug" data-admin-preview-review="preview-aware" data-action-model="source-drag,tile-selection,icon-actions,keyboard-shortcuts" data-disconnect-contract="tile-disconnect-clears-slot,workspace-disconnect-keeps-layout">
	          <div class="live-workspace-layout live-sketch-layout client-live-layout" data-testid="client-live-workspace" data-workspace-model="source-tree,drag-drop-grid,multi-source" data-dock-side="${escapeHtml(liveDockSide)}">
	            ${liveSourceTreeHtml()}
	            <section class="live-workspace-main live-sketch-workspace client-live-primary" aria-label="라이브 워크스페이스">
	          <div class="live-toolbar live-sketch-toolbar client-live-toolbar">
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
	              <div class="live-grid client-live-video-grid" data-testid="client-live-drop-grid" data-grid-size="${liveTileCount}" data-density="${escapeHtml(liveDensity)}">
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
        ${renderClientSafeSourceStatusDigest(events.sourceStatusDigest || {})}
        ${renderClientSafeMaintenanceDigest(events.maintenanceDigest || {})}
        ${renderClientOperationsNotice(events.clientOperationsNotice || {})}
        ${renderClientActionNoticePreview(events.clientActionNoticePreview || {})}
        ${renderClientImpactForecast(events.clientImpactForecast || {})}
        ${renderClientSafeEventDigest(events.eventDigest || {})}
	        ${renderClientSafeResolutionDigest(events.resolutionDigest || {})}
	        ${renderClientSafeIncidentDigest(events.incidentDigest || {})}
	        ${renderClientSafeFollowUpDigest(events.followUpDigest || {})}
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
      if (view.showDashboard === false) {
        container.innerHTML = `
          <div class="toolbar" data-dashboard-access="denied">
            <div>
              <h2>${escapeHtml(view.displayName || view.viewId)}</h2>
              <p>타일 ${tile.index + 1} · ${escapeHtml(overlayLabel(tile.overlayMode || defaultOverlayModeForView(view)))}</p>
            </div>
            <div class="meta">
              ${statusChip(tile.status)}
              <span class="chip${tileStatusClass(tile.stale ? 'stale' : 'fresh')}" data-selected-stale>${tile.stale ? '지연' : '정상'}</span>
            </div>
          </div>
          <div class="summary">
            <div class="metric"><span>연결</span><strong>${escapeHtml(clientDynamicText(liveTileConnectionLabel(tile)))}</strong></div>
            <div class="metric"><span>트랙</span><strong>${escapeHtml(display(tile.trackCount))}</strong></div>
            <div class="metric"><span>이벤트</span><strong>${escapeHtml(display(tile.eventCount))}</strong></div>
          </div>
        `;
        updateTileDom(tile);
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
          ${clientSafeStatusSummaryHtml(payload, { testId: 'client-live-safe-summary', title: '선택 타일 event/status summary' })}
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

}  // namespace ingress
