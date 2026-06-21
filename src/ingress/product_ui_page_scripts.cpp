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

// 주요 동작: 운영자 shell 공통 controller를 route별 초기화와 API 호출에 연결한다.
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
      const opsContainsSensitiveSourceMaterial = value => {
        const text = String(value || '').trim().toLowerCase();
        return /(?:rtsp|rtsps|whep|wheps):\/\//.test(text) ||
          text.includes('file::') ||
          text.includes('file://') ||
          text.includes('/users/') ||
          text.includes('\\users\\') ||
          text.includes('/home/') ||
          text.includes('\\home\\') ||
          text.includes('/tmp/') ||
          text.includes('\\tmp\\') ||
          text.includes('/private/') ||
          text.includes('\\private\\') ||
          text.includes('sourceurl') ||
          text.includes('developerurl') ||
          text.includes('debugcounters') ||
          text.includes('bbox diagnostics');
      };
      const opsSafeSourceLabel = value => {
        const text = String(value || '').trim();
        if (!text || text === '-') return text || '-';
        return opsContainsSensitiveSourceMaterial(text) ? 'unknown-source' : display(text);
      };
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
      const MAX_RUNTIME_TREND_SAMPLES = 12;
      let dashboardRuntimeTrendSamples = [];
      const runtimeTrendSampleFrom = (runtime = {}, sourceHealth = {}, eventsStatus = {}) => {
        const counts = runtimeCounts(runtime);
        const metadata = runtime?.webrtcHttp?.metadataDataChannel || {};
        const sideChannel = runtime?.webrtcHttp?.metadataSideChannel || {};
        const sourceCounts = dashboardSourceHealthCounts(sourceHealth);
        const records = dashboardIncidentEventRecords(eventsStatus);
        const metadataClients = numberValue(sideChannel.activeSseClients) +
          numberValue(sideChannel.activeWebSocketClients) +
          (Array.isArray(metadata.channels) ? metadata.channels.length : 0);
        return {
          sampledAt: Date.now(),
          sessions: counts.sessions,
          streams: counts.streams,
          taps: counts.taps,
          metadataClients,
          liveSources: sourceCounts.live,
          sourceTotal: sourceCounts.total,
          eventRecords: records.length,
          loadScore: counts.sessions + counts.streams + counts.taps + metadataClients + records.length
        };
      };
      const runtimeTrendDeltaText = (latest, baseline, key, label) => {
        const delta = numberValue(latest?.[key]) - numberValue(baseline?.[key]);
        if (delta === 0) return `${label} 변동 없음`;
        return `${label} ${delta > 0 ? '+' : ''}${delta}`;
      };
      const runtimeTrendSparklineHtml = (samples = []) => {
        if (!samples.length) return '<span class="runtime-spark-empty">sample 대기</span>';
        const values = samples.map(sample => numberValue(sample.loadScore));
        const maxValue = Math.max(1, ...values);
        return values.map((value, index) => {
          const height = Math.max(12, Math.round((value / maxValue) * 100));
          return `<span class="runtime-spark-bar" style="height:${height}%" title="sample ${index + 1}: ${value}" aria-label="sample ${index + 1} value ${value}"></span>`;
        }).join('');
      };
      const renderDashboardRuntimeTrend = (runtime = {}, sourceHealth = {}, eventsStatus = {}) => {
        const sample = runtimeTrendSampleFrom(runtime, sourceHealth, eventsStatus);
        dashboardRuntimeTrendSamples = [...dashboardRuntimeTrendSamples, sample].slice(-MAX_RUNTIME_TREND_SAMPLES);
        const baseline = dashboardRuntimeTrendSamples[0] || sample;
        const latest = dashboardRuntimeTrendSamples[dashboardRuntimeTrendSamples.length - 1] || sample;
        const sparkline = document.getElementById('dashRuntimeTrendSparkline');
        if (sparkline) {
          sparkline.innerHTML = runtimeTrendSparklineHtml(dashboardRuntimeTrendSamples);
          sparkline.setAttribute('aria-label', `runtime trend sparkline ${dashboardRuntimeTrendSamples.length} page-session-only samples`);
        }
        renderBadges('dashRuntimeTrendBadges', [
          { text: `sample ${dashboardRuntimeTrendSamples.length}/${MAX_RUNTIME_TREND_SAMPLES}` },
          { text: 'page-session-only', tone: 'info' },
          { text: 'longrun evidence 아님', tone: 'warn' }
        ]);
        setText('dashRuntimeTrendText', [
          runtimeTrendDeltaText(latest, baseline, 'sessions', '세션'),
          runtimeTrendDeltaText(latest, baseline, 'streams', '스트림'),
          runtimeTrendDeltaText(latest, baseline, 'taps', '분석'),
          runtimeTrendDeltaText(latest, baseline, 'metadataClients', '메타데이터')
        ].join(' · '));
        setText('dashRuntimeTrendBaseline',
          `baseline ${baseline.sessions}/${baseline.streams}/${baseline.taps} · latest ${latest.sessions}/${latest.streams}/${latest.taps} · source ${latest.liveSources}/${latest.sourceTotal} · EventRecord ${latest.eventRecords}`);
        return { baseline, latest, samples: dashboardRuntimeTrendSamples };
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
      const dashboardIncidentSourceFilterLabel = source => {
        const normalized = String(source || '').trim();
        if (normalized === 'event-record') return 'EventRecord';
        if (normalized === 'source-health') return 'source health';
        if (normalized === 'rule-warning') return 'rule warning';
        if (normalized === 'runtime-status') return 'runtime status';
        if (normalized === 'log-tail') return 'log tail';
        return '전체 출처';
      };
      const dashboardIncidentEmptyFilterText = filter => {
        if (!filter?.source) return '필터에 맞는 인시던트 단서가 없습니다.';
        const parts = [`${dashboardIncidentSourceFilterLabel(filter.source)} 필터`];
        if (filter?.query) parts.push(`검색어 "${filter.query}"`);
        return `${parts.join(' / ')}에 맞는 인시던트 단서가 없습니다.`;
      };
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
            const streamLabel = dashboardRuntimeStreamLabel(stream);
            const scenario = [item?.scenarioName, item?.scenarioPhase].filter(Boolean).map(display).join(' · ');
            return {
              level,
              source: 'EventRecord',
              time: dashboardIncidentTimeLabel(item),
              sort: dashboardIncidentSortValue(item),
              incidentId: `event:${item?.eventId || item?.trackId || item?.streamId || index}`,
              sourceId: streamLabel,
              title: `${display(item?.eventType || 'event')} · ${display(item?.status || '상태 미제공')}`,
              detail: `${display(streamLabel)}${item?.trackId ? ` · track ${display(item.trackId)}` : ''}${scenario ? ` · ${scenario}` : ''}`,
              evidence: item?.eventId ? `eventId ${display(item.eventId)}` : 'eventId 미제공',
              correlationId: item?.eventId || item?.trackId || '',
              cause: `EventRecord status ${display(item?.status || '미제공')}`,
              impact: `${display(streamLabel)}${item?.trackId ? ` · track ${display(item.trackId)}` : ''}`,
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
        const emptyFilterText = dashboardIncidentEmptyFilterText(filter);
        setText('dashIncidentTimelineText', filtersActive && items.length === 0
          ? emptyFilterText
          : (warnCount > 0
            ? '최근 단서를 시간순으로 묶었습니다. 확인 항목부터 관련 화면으로 이동합니다.'
            : '최근 EventRecord와 source health 단서를 기준으로 즉시 대응할 인시던트가 없습니다.'));
        const list = document.getElementById('dashIncidentTimeline');
        if (!list) return items;
        if (items.length === 0) {
          list.innerHTML = `<div class="empty">${escapeHtml(emptyFilterText)}<br />다른 검색어 또는 출처 필터를 선택하세요.</div>`;
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
        renderDashboardRuntimeTrend(runtime, sourceHealth, eventsStatus);
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
      let opsVlmLastPayload = null;
      let opsVlmRuntimeStatusPayload = null;
      let opsVlmEvaluationPayload = null;
      let opsVlmSelectedEvaluationCandidateId = '';
      let opsVlmProfiles = [];
      let opsVlmPendingDelete = '';
      const opsVlmControlValue = (id, fallback = '') => {
        const element = document.getElementById(id);
        return element ? String(element.value || fallback) : fallback;
      };
      const opsVlmProfileStatus = (message, failed = false) => {
        setFeedback(document.getElementById('opsVlmProfileStatus'), message, failed, { collapseEmpty: true });
      };
      const opsVlmSlug = value => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'profile';
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
      const opsVlmSelectedOption = () => {
        const options = Array.isArray(opsVlmLastPayload?.options) ? opsVlmLastPayload.options : [];
        return options.find(option => option.id === opsVlmSelectedOptionId) || null;
      };
      const opsVlmOptionUsesExternalTransfer = option =>
        option?.externalTransfer === true || option?.actionType === 'cloud-api-connection-dry-run';
      const opsVlmActiveProfile = () =>
        opsVlmProfiles.find(profile => profile?.activation?.enabled === true && profile?.activation?.status === 'active') ||
        opsVlmProfiles.find(profile => profile?.activation?.status === 'fallback') ||
        opsVlmProfiles[0] ||
        null;
      const opsVlmEvaluationCandidates = () =>
        Array.isArray(opsVlmEvaluationPayload?.profileCandidates) ? opsVlmEvaluationPayload.profileCandidates : [];
      const opsVlmSelectedEvaluationCandidate = () =>
        opsVlmEvaluationCandidates().find(candidate => candidate.id === opsVlmSelectedEvaluationCandidateId) || null;
      const opsVlmRuntimeForOption = option => {
        if (option?.actionType === 'cloud-api-connection-dry-run') return 'provider-api';
        const readiness = option?.impact?.localRuntimeReadiness || {};
        if (readiness.status === 'ready') return readiness.vllmModuleAvailable ? 'vllm' : 'ollama';
        return 'not-configured';
      };
      const opsVlmRuntimeStatusSummary = (payload, runtimePayload) => {
        const selected = opsVlmSelectedOption();
        const activeProfile = opsVlmActiveProfile();
        const contract = activeProfile?.runtimeContract ||
          buildOpsVlmRuntimeContract(selected, payload, 'pending-evaluation', false);
        const externalTransfer = opsVlmOptionUsesExternalTransfer(selected) || contract?.mode === 'cloud-provider';
        const readiness = selected?.impact?.localRuntimeReadiness || payload?.recommendation?.runtimeReadiness || {};
        const evaluation = activeProfile?.evaluation || {};
        const activation = activeProfile?.activation || {};
        const disabledReasons = Array.isArray(selected?.disabledReasons) ? selected.disabledReasons : [];
        const failureReason = contract?.status === 'disabled'
          ? (activation.disabledReason || 'default-off')
          : (['missing-model', 'invalid-output', 'timeout'].includes(contract?.status)
              ? contract.status
              : (disabledReasons[0] || payload?.decision?.blockedReason || 'none'));
        const runtimeLoaded = runtimePayload && !runtimePayload.error;
        const counts = runtimeLoaded ? runtimeCounts(runtimePayload) : null;
        return {
          selected,
          activeProfile,
          contract,
          externalTransfer,
          providerStatus: externalTransfer
            ? (payload?.privacy?.cloudOptInState === 'acknowledged' ? 'cloud opt-in acknowledged' : 'cloud opt-in required')
            : (selected?.provider || activeProfile?.provider || 'local runtime candidate'),
          runtimeStatus: externalTransfer
            ? 'provider field smoke only'
            : (readiness.status === 'ready' ? `local ready · ${opsVlmRuntimeForOption(selected)}` : (contract?.status || 'missing-model')),
          evaluationStatus: evaluation.status || 'not-run',
          failureReason,
          privacyMode: activeProfile?.privacyMode || payload?.privacy?.mode || opsVlmControlValue('opsVlmPrivacyMode', 'local-only'),
          defaultOffStatus: contract?.defaultEnabled === false && contract?.runtimeCallAllowed === false
            ? 'default-off'
            : 'check-required',
          runtimeEndpointText: runtimeLoaded
            ? `runtime/status ok · taps ${counts.taps} · sessions ${counts.sessions} · egress ${counts.egress}`
            : `runtime/status ${runtimePayload?.error ? 'error' : 'loading'}`,
        };
      };
      const renderOpsVlmRuntimeStatus = (payload = opsVlmLastPayload) => {
        if (!payload) return;
        const summary = opsVlmRuntimeStatusSummary(payload, opsVlmRuntimeStatusPayload);
        setText('opsVlmProviderStatus', summary.providerStatus);
        setText('opsVlmRuntimeConnectionStatus', summary.runtimeStatus);
        setText('opsVlmLastEvaluationStatus', summary.evaluationStatus);
        setText('opsVlmFailureReason', summary.failureReason);
        setText('opsVlmPrivacyModeStatus', summary.privacyMode);
        setText('opsVlmDefaultOffStatus', summary.defaultOffStatus);
        renderBadges('opsVlmRuntimeStatusBadges', [
          { text: summary.externalTransfer ? 'provider field smoke 분리' : 'local/runtime 상태', tone: summary.externalTransfer ? 'warn' : 'info' },
          { text: summary.defaultOffStatus === 'default-off' ? 'defaultEnabled=false' : 'default 확인 필요', tone: summary.defaultOffStatus === 'default-off' ? 'info' : 'warn' },
          { text: summary.contract?.runtimeCallAllowed === false ? 'runtime 호출 없음' : 'runtime 호출 확인 필요', tone: summary.contract?.runtimeCallAllowed === false ? 'info' : 'warn' },
          { text: summary.contract?.providerCallAllowed === false ? 'provider 호출 없음' : 'provider 호출 확인 필요', tone: summary.contract?.providerCallAllowed === false ? 'info' : 'warn' },
          { text: opsVlmRuntimeStatusPayload?.error ? 'runtime/status 오류' : 'runtime/status 연결', tone: opsVlmRuntimeStatusPayload?.error ? 'warn' : 'info' }
        ]);
        const root = document.getElementById('opsVlmRuntimeStatusList');
        if (!root) return;
        const profileId = summary.activeProfile?.id || '저장 profile 없음';
        const statusItems = [
          {
            title: 'Provider',
            text: summary.externalTransfer
              ? 'Cloud provider는 opt-in field smoke와 credential env 준비 전까지 release PASS가 아닙니다.'
              : 'Local runtime 후보는 operator supplied runtime/model 상태만 표시하고 자동 설치나 호출을 시작하지 않습니다.',
            state: summary.providerStatus
          },
          {
            title: 'Runtime connection',
            text: `${summary.runtimeStatus} · ${summary.runtimeEndpointText}`,
            state: summary.contract?.status || 'not-run'
          },
          {
            title: 'Last evaluation',
            text: `${profileId} · ${summary.evaluationStatus}`,
            state: summary.evaluationStatus
          },
          {
            title: 'Failure reason',
            text: summary.failureReason === 'none'
              ? '현재 선택/profile 기준으로 표시할 VLM-only 실패 사유가 없습니다.'
              : `${summary.failureReason} 상태는 media/Event/metadata/Event POST 실패로 전파하지 않습니다.`,
            state: summary.failureReason
          },
          {
            title: 'Privacy/default-off',
            text: `${summary.privacyMode} · ${summary.defaultOffStatus} · prompt/raw response/source URL/credential 비노출`,
            state: summary.defaultOffStatus
          }
        ];
        root.innerHTML = statusItems.map(item => `<article class="root-cause-item ${item.state === 'none' || item.state === 'default-off' || item.state === 'not-run' ? 'info' : (String(item.state).includes('required') || String(item.state).includes('missing') || String(item.state).includes('timeout') || String(item.state).includes('invalid') ? 'warn' : 'info')}">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.text)}</p>
          </div>
          ${badge(item.state || 'not-run', String(item.state).includes('required') || String(item.state).includes('missing') || String(item.state).includes('timeout') || String(item.state).includes('invalid') ? 'warn' : 'info')}
        </article>`).join('');
      };
      const opsVlmEvaluationDimensionText = candidate => {
        const dimensions = candidate?.dimensions || {};
        return ['latency', 'jsonStability', 'explanationQuality', 'hallucinationRisk', 'languageQuality']
          .map(key => `${key}:${dimensions[key] || '-'}`)
          .join(' · ');
      };
      const renderOpsVlmEvaluationResults = () => {
        const payload = opsVlmEvaluationPayload;
        const candidates = opsVlmEvaluationCandidates();
        const selected = opsVlmSelectedEvaluationCandidate();
        setText('opsVlmEvaluationWorkflowStatus', payload?.status || '-');
        setText('opsVlmEvaluationCaseCount', payload?.summary?.sampleCases ?? '-');
        setText('opsVlmEvaluationCandidateCount', payload?.summary?.profileCandidates ?? candidates.length);
        setText('opsVlmEvaluationSelectedProfile', selected?.id || '-');
        renderBadges('opsVlmEvaluationBadges', [
          { text: payload?.sourceReportSchema || 'evaluation report 미제공', tone: 'info' },
          { text: payload?.selectionPolicy?.autoActivateSelectedProfile === false ? 'auto activate 없음' : 'activation 확인 필요', tone: payload?.selectionPolicy?.autoActivateSelectedProfile === false ? 'info' : 'warn' },
          { text: payload?.contractInvariants?.runtimeVlmCallPerformed === false ? 'runtime 호출 없음' : 'runtime 호출 확인 필요', tone: payload?.contractInvariants?.runtimeVlmCallPerformed === false ? 'info' : 'warn' },
          { text: payload?.contractInvariants?.eventPostPayloadChanged === false ? 'Event POST 변경 없음' : 'Event POST 확인 필요', tone: payload?.contractInvariants?.eventPostPayloadChanged === false ? 'info' : 'warn' },
          { text: payload?.contractInvariants?.viewerClientExposureAdded === false ? 'viewer 비노출' : 'viewer 노출 확인 필요', tone: payload?.contractInvariants?.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        const tbody = document.getElementById('opsVlmEvaluationRows');
        if (tbody) {
          if (!payload) {
            tbody.innerHTML = '<tr><td colspan="4">평가 결과를 불러오는 중입니다.</td></tr>';
          } else if (candidates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">profile 후보로 반영할 평가 결과가 없습니다.</td></tr>';
          } else {
            tbody.innerHTML = candidates.map(candidate => {
              const allowed = candidate?.selection?.profileDraftAllowed === true;
              const selectedRow = candidate.id === opsVlmSelectedEvaluationCandidateId;
              const status = candidate?.evaluation?.status || 'not-run';
              const statusTone = status === 'failed' ? 'warn' : (status === 'review-required' ? 'warn' : 'info');
              return `<tr data-vlm-evaluation-row="${escapeHtml(candidate.id || '')}">
                <td><button type="button" class="button-secondary button-compact" data-vlm-evaluation-candidate-id="${escapeHtml(candidate.id || '')}" ${allowed ? '' : 'disabled'}>${selectedRow ? '반영됨' : 'profile draft 반영'}</button></td>
                <td><strong>${escapeHtml(candidate.model || '-')}</strong><br><span class="ops-rule-note">${escapeHtml(candidate.promptProfile?.id || '-')} · ${escapeHtml(candidate.promptProfile?.language || '-')}</span></td>
                <td>${escapeHtml(opsVlmEvaluationDimensionText(candidate))}<br><span class="ops-rule-note">score ${escapeHtml(String(candidate.score?.total ?? '-'))} · latency P50 ${escapeHtml(String(candidate.latencyMs?.p50 ?? '-'))}ms / P95 ${escapeHtml(String(candidate.latencyMs?.p95 ?? '-'))}ms</span></td>
                <td>${badge(status, statusTone)}<br><span class="ops-rule-note">${escapeHtml(candidate.selection?.reason || '')}</span></td>
              </tr>`;
            }).join('');
          }
        }
        const recommended = payload?.summary?.recommendedCandidateId || '-';
        setText('opsVlmEvaluationSelectionSummary', selected
          ? `${selected.model} · ${selected.promptProfile?.id || '-'} · ${selected.evaluation?.status || 'not-run'} 상태를 profile draft에 반영했습니다.`
          : `추천 평가 후보 ${recommended}; 아직 profile draft에는 반영하지 않았습니다.`);
      };
      const applyOpsVlmEvaluationCandidate = candidate => {
        if (!candidate) return;
        if (candidate?.selection?.profileDraftAllowed !== true) {
          setText('opsVlmEvaluationSelectionSummary', `${candidate.id || '-'} 평가 결과는 profile draft 반영 대상이 아닙니다.`);
          return;
        }
        opsVlmSelectedEvaluationCandidateId = candidate.id || '';
        const options = Array.isArray(opsVlmLastPayload?.options) ? opsVlmLastPayload.options : [];
        const matchingOption = options.find(option =>
          option?.selectable === true &&
          String(option?.model || '') === String(candidate.selectedOptionModel || candidate.model || ''));
        if (matchingOption) {
          opsVlmSelectedOptionId = matchingOption.id;
        }
        const profileId = document.getElementById('opsVlmProfileId');
        if (profileId) {
          profileId.value = `vlm-eval-${opsVlmSlug(candidate.selectedOptionModel || candidate.model)}-${opsVlmSlug(candidate.promptProfile?.id || 'prompt')}`;
          profileId.dataset.userEdited = '1';
        }
        const prompt = document.getElementById('opsVlmPromptProfile');
        if (prompt && candidate.promptProfile?.id) prompt.value = candidate.promptProfile.id;
        const evaluation = document.getElementById('opsVlmEvaluationStatus');
        if (evaluation) evaluation.value = candidate.evaluation?.status || 'review-required';
        const activation = document.getElementById('opsVlmActivationStatus');
        if (activation) activation.value = candidate.selection?.activationDefault || 'pending-evaluation';
        const enabled = document.getElementById('opsVlmProfileEnabled');
        if (enabled) enabled.checked = candidate.selection?.enabledDefault === true;
        const disabledReason = document.getElementById('opsVlmDisabledReason');
        if (disabledReason) {
          disabledReason.value = candidate.evaluation?.status === 'passed'
            ? 'operator-pending-activation'
            : `evaluation-${candidate.evaluation?.status || 'review-required'}`;
        }
        renderOpsVlmOptions(opsVlmLastPayload);
        renderOpsVlmEvaluationResults();
        syncOpsVlmProfileDraft(opsVlmSelectedOption(), opsVlmLastPayload);
      };
      async function refreshOpsVlmEvaluationResults() {
        opsVlmEvaluationPayload = await requestJson('/ops/api/vlm/evaluation-results');
        renderOpsVlmEvaluationResults();
      }
      async function refreshOpsVlmRuntimeStatus(payload = opsVlmLastPayload) {
        try {
          opsVlmRuntimeStatusPayload = await requestJson('/ops/api/runtime/status');
        } catch (error) {
          opsVlmRuntimeStatusPayload = { error: error.message || 'runtime status unavailable' };
        }
        renderOpsVlmRuntimeStatus(payload);
      }
      const buildOpsVlmRuntimeContract = (selected, payload, activationStatus, enabled) => {
        const externalTransfer = opsVlmOptionUsesExternalTransfer(selected);
        const readiness = selected?.impact?.localRuntimeReadiness?.status || payload?.recommendation?.runtimeReadiness?.status || '';
        let mode = externalTransfer ? 'cloud-provider' : 'local-runtime';
        let status = externalTransfer ? 'cloud-provider' : 'local-runtime';
        if (activationStatus === 'disabled') {
          mode = 'disabled';
          status = 'disabled';
        } else if (!externalTransfer && readiness !== 'ready') {
          status = 'missing-model';
        }
        return {
          schema: 'media-server.vlm-runtime-opt-in-contract.v1',
          targetStep: 'V210-S01',
          mode,
          status,
          defaultEnabled: false,
          operatorOptInRequired: true,
          operatorOptInAcknowledged: enabled === true,
          runtimeCallAllowed: false,
          providerCallAllowed: false,
          providerFieldSmokeRequired: externalTransfer,
          failurePolicy: {
            missingModel: 'blocked-missing-model-no-media-path-failure',
            invalidOutput: 'rejected-invalid-output-no-sidecar-write',
            timeout: 'timeout-no-media-path-failure'
          },
          sideEffects: {
            runtimeVlmCallPerformed: false,
            cloudProviderApiCalled: false,
            modelArtifactDownloaded: false,
            modelArtifactBundled: false,
            credentialStored: false,
            sidecarStored: false,
            eventPostPayloadChanged: false,
            webrtcDataChannelSchemaChanged: false,
            sseMetadataSchemaChanged: false,
            wsMetadataSchemaChanged: false,
            rtspOrWebrtcMediaPathChanged: false,
            viewerClientExposureAdded: false
          }
        };
      };
      const renderOpsVlmPrivacyTransferGuard = payload => {
        const selected = opsVlmSelectedOption();
        const guard = selected?.privacyTransferGuard || payload?.privacyTransferGuard || {};
        const redaction = guard.redaction || {};
        const providerLogging = guard.providerLoggingPolicy || {};
        const usesExternalTransfer = opsVlmOptionUsesExternalTransfer(selected);
        const externalAck = document.getElementById('opsVlmExternalTransferWarningAck');
        const providerReviewed = document.getElementById('opsVlmProviderLoggingReviewed');
        if (externalAck) {
          externalAck.disabled = !usesExternalTransfer;
          externalAck.checked = usesExternalTransfer ? payload?.privacy?.cloudOptInState === 'acknowledged' : false;
        }
        if (providerReviewed) {
          providerReviewed.disabled = !usesExternalTransfer;
          if (!usesExternalTransfer) providerReviewed.checked = false;
        }
        renderBadges('opsVlmPrivacyGuardBadges', [
          { text: usesExternalTransfer ? '외부 전송 후보' : 'local-only 후보', tone: usesExternalTransfer ? 'warn' : '' },
          { text: redaction.credentialMaterialStored === false ? 'credential 비저장' : 'credential 확인 필요', tone: redaction.credentialMaterialStored === false ? '' : 'warn' },
          { text: redaction.promptStored === false ? 'prompt 비저장' : 'prompt 확인 필요', tone: redaction.promptStored === false ? '' : 'warn' },
          { text: redaction.rawProviderResponseStored === false ? 'raw response 비저장' : 'raw response 확인 필요', tone: redaction.rawProviderResponseStored === false ? '' : 'warn' },
          { text: redaction.sourceUrlStored === false ? 'source URL 비저장' : 'source URL 확인 필요', tone: redaction.sourceUrlStored === false ? '' : 'warn' }
        ]);
        const root = document.getElementById('opsVlmPrivacyGuardList');
        if (root) {
          root.innerHTML = [
            {
              title: '외부 전송',
              text: usesExternalTransfer
                ? 'cloud provider 후보는 profile 저장 전 외부 전송 경고 확인과 provider policy 검토가 필요합니다.'
                : 'local 후보는 외부 provider 전송을 만들지 않습니다.',
              state: usesExternalTransfer ? (externalAck?.checked ? 'acknowledged' : 'ack-required') : 'not-applicable'
            },
            {
              title: 'Provider logging',
              text: usesExternalTransfer
                ? 'provider logging/retention/terms 검토는 저장 payload의 privacyGuard에 accepted 상태로 남깁니다.'
                : 'local runtime 후보에는 provider logging review가 적용되지 않습니다.',
              state: usesExternalTransfer ? (providerReviewed?.checked ? 'accepted' : (providerLogging.reviewStatus || 'review-required')) : 'not-applicable'
            },
            {
              title: 'Redaction',
              text: 'credential, prompt, raw response, source URL, raw frame bytes는 profile, sidecar, viewer/client에 저장하거나 노출하지 않습니다.',
              state: 'enforced'
            }
          ].map(item => `<article class="root-cause-item ${item.state === 'accepted' || item.state === 'enforced' || item.state === 'not-applicable' ? 'info' : 'warn'}">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.text)}</p>
            </div>
            ${badge(item.state, item.state === 'ack-required' || item.state === 'review-required' ? 'warn' : 'info')}
          </article>`).join('');
        }
      };
      const syncOpsVlmProfileDraft = (selected, payload) => {
        const idInput = document.getElementById('opsVlmProfileId');
        if (idInput && selected) {
          const suggested = `vlm-${opsVlmSlug(selected.id || selected.model)}`;
          const edited = idInput.dataset.userEdited === '1';
          if (!edited || !String(idInput.value || '').trim()) {
            idInput.value = suggested;
          }
        }
        const disabledReason = document.getElementById('opsVlmDisabledReason');
        if (disabledReason && !String(disabledReason.value || '').trim()) {
          disabledReason.value = 'evaluation-not-run';
        }
        const activation = document.getElementById('opsVlmActivationStatus');
        const enabled = document.getElementById('opsVlmProfileEnabled');
        const evaluation = document.getElementById('opsVlmEvaluationStatus');
        if (activation && enabled && evaluation) {
          if (enabled.checked && evaluation.value === 'passed') {
            activation.value = 'active';
          } else if (!enabled.checked && activation.value === 'active') {
            activation.value = 'pending-evaluation';
          }
        }
        const saveButton = document.getElementById('opsVlmSaveProfile');
        if (saveButton) {
          const selectableIds = new Set(payload?.decision?.selectableOptionIds || []);
          const externalTransfer = opsVlmOptionUsesExternalTransfer(selected);
          const privacyReady = !externalTransfer ||
            (document.getElementById('opsVlmExternalTransferWarningAck')?.checked === true &&
             document.getElementById('opsVlmProviderLoggingReviewed')?.checked === true);
          saveButton.disabled = !selected || !selectableIds.has(selected.id) || !privacyReady;
          saveButton.setAttribute('aria-disabled', saveButton.disabled ? 'true' : 'false');
        }
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
          ? `${selected.model} · ${selected.actionType} · S05 profile 저장 가능`
          : '선택한 후보 없음');
        renderOpsVlmPrivacyTransferGuard(payload);
        syncOpsVlmProfileDraft(selected, payload);
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
      const renderOpsVlmProfiles = () => {
        const tbody = document.getElementById('opsVlmProfileRows');
        if (!tbody) return;
        if (opsVlmProfiles.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5">저장된 VLM profile이 없습니다.</td></tr>';
          return;
        }
        tbody.innerHTML = opsVlmProfiles.map(profile => {
          const activation = profile.activation || {};
          const evaluation = profile.evaluation || {};
          const fallback = activation.fallbackProfileId || activation.disabledReason || '-';
          return `<tr data-vlm-profile-row="${escapeHtml(profile.id || '')}">
            <td><strong>${escapeHtml(profile.id || '-')}</strong><br><span class="ops-rule-note">${escapeHtml(profile.selectedOptionId || '-')}</span></td>
            <td>${escapeHtml(profile.model || '-')}<br><span class="ops-rule-note">${escapeHtml(profile.provider || '-')} · ${escapeHtml(profile.runtime || '-')}</span></td>
            <td>${badge(evaluation.status || 'not-run', evaluation.status === 'passed' ? '' : 'info')} ${badge(activation.status || 'pending-evaluation', activation.enabled ? '' : 'warn')}</td>
            <td>${escapeHtml(fallback)}</td>
            <td><button type="button" class="danger button-compact" data-delete-vlm-profile="${escapeHtml(profile.id || '')}">삭제</button></td>
          </tr>`;
        }).join('');
      };
      async function refreshOpsVlmProfiles(showMessage = false) {
        const payload = await requestJson('/ops/api/vlm/profiles');
        opsVlmProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
        renderOpsVlmProfiles();
        renderOpsVlmRuntimeStatus();
        if (showMessage) opsVlmProfileStatus(`저장된 VLM profile ${opsVlmProfiles.length}개를 불러왔습니다.`);
      }
      const buildOpsVlmProfilePayload = () => {
        const selected = opsVlmSelectedOption();
        if (!selected) throw new Error('저장할 VLM dry-run 후보를 먼저 선택하세요.');
        const id = opsVlmControlValue('opsVlmProfileId').trim();
        const promptId = opsVlmControlValue('opsVlmPromptProfile', 'event-review-default');
        const evaluationStatus = opsVlmControlValue('opsVlmEvaluationStatus', 'not-run');
        const activationStatus = opsVlmControlValue('opsVlmActivationStatus', 'pending-evaluation');
        const enabled = document.getElementById('opsVlmProfileEnabled')?.checked === true;
        const fallbackProfileId = opsVlmControlValue('opsVlmFallbackProfileId').trim();
        const disabledReason = opsVlmControlValue('opsVlmDisabledReason', activationStatus === 'disabled' ? 'operator-disabled' : 'evaluation-not-run').trim();
        const externalTransfer = opsVlmOptionUsesExternalTransfer(selected);
        const providerLoggingReviewed = externalTransfer
          ? document.getElementById('opsVlmProviderLoggingReviewed')?.checked === true
          : false;
        const selectedEvaluation = opsVlmSelectedEvaluationCandidate();
        return {
          schema: 'media-server.vlm-profile.v1',
          id,
          selectedOptionId: selected.id,
          provider: selected.provider || (selected.actionType === 'cloud-api-connection-dry-run' ? 'cloud-provider-api' : 'user-supplied-local-runtime'),
          model: selected.model || '',
          runtime: opsVlmRuntimeForOption(selected),
          privacyMode: opsVlmLastPayload?.privacy?.mode || opsVlmControlValue('opsVlmPrivacyMode', 'local-only'),
          cloudOptInAcknowledged: opsVlmLastPayload?.privacy?.cloudOptInState === 'acknowledged',
          privacyGuard: {
            schema: 'media-server.vlm-privacy-transfer-guard.v1',
            targetStep: 'V200-S11',
            externalTransfer,
            externalTransferWarningRequired: externalTransfer,
            externalTransferWarningAcknowledged: externalTransfer
              ? document.getElementById('opsVlmExternalTransferWarningAck')?.checked === true
              : false,
            redaction: {
              credentialMaterialStored: false,
              promptStored: false,
              rawProviderResponseStored: false,
              sourceUrlStored: false,
              rawFrameBytesStored: false,
              viewerClientExposureAdded: false
            },
            providerLoggingPolicy: {
              provider: externalTransfer ? 'gemini-api' : 'operator-local-runtime',
              reviewRequired: externalTransfer,
              reviewStatus: externalTransfer ? (providerLoggingReviewed ? 'accepted' : 'review-required') : 'not-applicable',
              loggingAndRetentionReviewed: providerLoggingReviewed,
              termsReviewed: providerLoggingReviewed,
              currentProviderPolicyStored: false
            }
          },
          promptProfile: {
            id: promptId,
            version: 'v1',
            language: 'ko-en'
          },
          evaluation: {
            status: evaluationStatus,
            source: selectedEvaluation ? 'v210-s06-evaluation-result-workflow' : 'manual-s05-profile-state',
            workflowSchema: selectedEvaluation ? opsVlmEvaluationPayload?.schema : null,
            sourceReportSchema: selectedEvaluation ? opsVlmEvaluationPayload?.sourceReportSchema : null,
            candidateId: selectedEvaluation?.id || null,
            caseIds: selectedEvaluation?.caseIds || [],
            dimensions: selectedEvaluation?.dimensions || {},
            score: selectedEvaluation?.score || null
          },
          activation: {
            enabled,
            status: activationStatus,
            fallbackProfileId,
            disabledReason
          },
          runtimeContract: buildOpsVlmRuntimeContract(selected, opsVlmLastPayload, activationStatus, enabled),
          sourceStep: 'V210-S01',
          storageScope: 'profile-storage-only',
          contractInvariants: {
            runtimeVlmCallPerformed: false,
            sidecarStored: false,
            cloudProviderApiCalled: false,
            credentialStored: false,
            eventPostPayloadChanged: false,
            webrtcDataChannelSchemaChanged: false,
            sseMetadataSchemaChanged: false,
            wsMetadataSchemaChanged: false,
            rtspOrWebrtcMediaPathChanged: false,
            viewerClientExposureAdded: false
          }
        };
      };
      async function saveOpsVlmProfile() {
        const payload = buildOpsVlmProfilePayload();
        await requestJson(`/ops/api/vlm/profiles/${encodeURIComponent(payload.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        opsVlmProfileStatus(`VLM profile '${payload.id}'를 저장했습니다.`);
        await refreshOpsVlmProfiles();
      }
      async function deleteOpsVlmProfile(id) {
        const profile = opsVlmProfiles.find(item => item.id === id);
        if (!profile) {
          opsVlmProfileStatus('삭제할 VLM profile을 찾지 못했습니다.', true);
          return;
        }
        if (opsVlmPendingDelete !== id) {
          opsVlmPendingDelete = id;
          opsVlmProfileStatus(`VLM profile '${id}' 삭제 확인: 다시 누르면 삭제합니다.`);
          return;
        }
        opsVlmPendingDelete = '';
        await requestJson(`/ops/api/vlm/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
        opsVlmProfileStatus(`VLM profile '${id}'를 삭제했습니다.`);
        await refreshOpsVlmProfiles();
      }
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
        opsVlmLastPayload = payload;
        await refreshOpsVlmRuntimeStatus(payload);
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
        renderOpsVlmRuntimeStatus(payload);
        renderOpsVlmEvaluationResults();
        renderRaw('opsVlmRaw', 'opsVlmPretty', payload);
        window.MediaServerUi?.translatePage?.();
      }
      const wireOpsVlmControls = () => {
        document.getElementById('opsVlmRefresh')?.addEventListener('click', () => refreshOpsVlmInstallConnection().catch(error => setFeedback(document.getElementById('opsVlmStatus'), error.message, true, { collapseEmpty: true })));
        document.getElementById('opsVlmProfileId')?.addEventListener('input', event => { event.target.dataset.userEdited = '1'; });
        document.getElementById('opsVlmProfileEnabled')?.addEventListener('change', () => syncOpsVlmProfileDraft(opsVlmSelectedOption(), opsVlmLastPayload));
        document.getElementById('opsVlmEvaluationStatus')?.addEventListener('change', () => syncOpsVlmProfileDraft(opsVlmSelectedOption(), opsVlmLastPayload));
        document.getElementById('opsVlmExternalTransferWarningAck')?.addEventListener('change', () => {
          renderOpsVlmPrivacyTransferGuard(opsVlmLastPayload);
          syncOpsVlmProfileDraft(opsVlmSelectedOption(), opsVlmLastPayload);
        });
        document.getElementById('opsVlmProviderLoggingReviewed')?.addEventListener('change', () => {
          renderOpsVlmPrivacyTransferGuard(opsVlmLastPayload);
          syncOpsVlmProfileDraft(opsVlmSelectedOption(), opsVlmLastPayload);
        });
        document.getElementById('opsVlmSaveProfile')?.addEventListener('click', () => saveOpsVlmProfile().catch(error => opsVlmProfileStatus(error.message, true)));
        document.getElementById('opsVlmProfileRows')?.addEventListener('click', event => {
          const button = event.target.closest('[data-delete-vlm-profile]');
          if (!button) return;
          deleteOpsVlmProfile(String(button.dataset.deleteVlmProfile || '')).catch(error => opsVlmProfileStatus(error.message, true));
        });
        document.getElementById('opsVlmEvaluationRows')?.addEventListener('click', event => {
          const button = event.target.closest('[data-vlm-evaluation-candidate-id]');
          if (!button || button.disabled) return;
          const candidate = opsVlmEvaluationCandidates()
            .find(item => item.id === String(button.dataset.vlmEvaluationCandidateId || ''));
          applyOpsVlmEvaluationCandidate(candidate);
        });
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
        refreshOpsVlmProfiles().catch(error => opsVlmProfileStatus(error.message, true));
        refreshOpsVlmEvaluationResults().catch(error => setText('opsVlmEvaluationSelectionSummary', `evaluation 결과 조회 실패: ${error.message}`));
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
        const releaseSafeBundlePayload = item => {
          const payload = bundlePayload(item);
          payload.releaseSafe = '1';
          return payload;
        };
        const actions = [
          snapshotPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(snapshotPath))}">snapshot 다운로드</a>` : '',
          clipPath ? `<a class="button button-secondary button-compact" href="${escapeHtml(evidenceHref(clipPath))}">clip manifest</a>` : '',
          (snapshotPath || clipPath) ? `<button type="button" class="button button-secondary button-compact" data-evidence-bundle="${escapeHtml(JSON.stringify(bundlePayload(item)))}">signed bundle zip</button>` : '',
          (snapshotPath || clipPath) ? `<button type="button" class="button button-secondary button-compact" data-release-safe-evidence-bundle="redacted incident evidence bundle" data-evidence-bundle="${escapeHtml(JSON.stringify(releaseSafeBundlePayload(item)))}">release-safe bundle</button>` : ''
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
          const streamLabel = opsSafeSourceLabel(item?.streamId || item?.channelId || '-');
          const eventHtml = `<div class="ops-rule-value-stack">
            <span class="table-identity-pill table-identity-id">${escapeHtml(display(item?.eventId || '-'))}</span>
            <span class="ops-rule-note">${escapeHtml(display(item?.eventType || 'event'))}</span>
            ${ruleId ? `<span class="ops-rule-note">rule ${escapeHtml(ruleId)}</span>` : ''}
          </div>`;
          const scenarioParts = [item?.scenarioName, item?.scenarioPhase].filter(Boolean).map(display);
          return `<tr>
            ${tableCellHtml('이벤트', eventHtml)}
            ${tableCellHtml('상태', badge(item?.status || '미제공', item?.status === 'ended' ? 'info' : ''), 'table-cell-status')}
            ${tableCellHtml('스트림', escapeHtml(streamLabel))}
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
      const INCIDENT_WORKFLOW_STATUSES = ['new', 'review-needed', 'acknowledged', 'in-progress', 'closed', 'false-positive'];
      const VLM_REVIEW_ACTIONS = ['not-reviewed', 'accept', 'dismiss', 'review-needed'];
      const VLM_REVIEW_ACTION_TARGETS = ['summary', 'eventExplanation', 'falsePositiveHints', 'operatorReviewQuestions'];
      const eventReviewSelectHtml = (name, values, selected) => {
        const value = String(selected || values[0] || '').trim();
        return `<select data-event-review-field="${escapeHtml(name)}">
          ${values.map(item => `<option value="${escapeHtml(item)}"${item === value ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('')}
        </select>`;
      };
      function eventReviewIncidentHtml(review = {}) {
        const workflow = review?.incidentWorkflow || {};
        const incidentId = String(workflow.incidentId || review.incidentId || '').trim();
        const status = workflow.status || review.incidentStatus || 'new';
        const actionTarget = String(workflow.actionTarget || review.actionTarget || 'operator-triage').trim();
        return `<div class="event-incident-action-controls" data-testid="ops-event-incident-action-controls" data-incident-action-workflow="ops-only-incident-state">
          <label>Incident ${eventReviewSelectHtml('incidentStatus', INCIDENT_WORKFLOW_STATUSES, status)}</label>
          <input class="event-review-note-input" data-event-review-field="incidentId" maxlength="160" value="${escapeHtml(incidentId)}" placeholder="incident:<eventId>" />
          <input class="event-review-note-input" data-event-review-field="actionTarget" maxlength="160" value="${escapeHtml(actionTarget)}" placeholder="operator-triage" />
        </div>`;
      }
      function renderIncidentRuleSuggestionReview(entry = {}) {
        const review = entry?.incidentRuleSuggestionReview || {};
        const report = review.sourceCandidateReport || {};
        const candidates = Array.isArray(report.candidates) ? report.candidates : [];
        const suggestion = review.matchingRuleSuggestion || {};
        const draft = suggestion.draftRule || {};
        const hasSuggestion = review.matchingRuleSuggestionPresent === true;
        const kind = review.proposedRuleKind || suggestion.kind || draft.eventType || 'rule suggestion';
        const draftRoute = review.manualDraftRoute || suggestion.targetRoute || '/ops/rules';
        const draftApiRoute = review.draftApiRoute || '/ops/api/vlm/rule-suggestion-drafts';
        const count = report.matchedCandidates ?? candidates.length;
        const classes = Array.isArray(draft.classes) ? draft.classes : [];
        const classesText = classes.length ? classes.map(display).join(', ') : '대상 클래스 확인 필요';
        const badges = [
          { text: review.candidateStatus || 'no-rule-suggestion-candidate', tone: hasSuggestion ? 'info' : 'warn' },
          { text: `source candidates ${count}`, tone: count > 0 ? '' : 'warn' },
          { text: review.sourceCandidateSchema || 'media-server.vlm-rule-suggestion-candidates.v1' },
          { text: review.contract?.ruleRegistryWritePerformed === false ? 'draft only' : 'write 확인 필요', tone: review.contract?.ruleRegistryWritePerformed === false ? 'info' : 'warn' },
          { text: review.contract?.autoRuleApplied === false ? 'no auto apply' : 'auto 확인 필요', tone: review.contract?.autoRuleApplied === false ? 'info' : 'warn' }
        ];
        const body = hasSuggestion
          ? `${display(kind)} · ${classesText} · ${display(suggestion.rationale || '운영자가 geometry와 조건을 검토한 뒤 수동 저장합니다.')}`
          : 'matching VLM rule suggestion 후보가 없습니다. /ops/rules draft workflow에서 전체 후보를 다시 조회할 수 있습니다.';
        return `<div class="ops-incident-rule-suggestion-review ops-incident-rule-suggestion-card" data-testid="ops-incident-rule-suggestion-review" data-incident-rule-suggestion-review="ops-only-draft-route">
          <div class="badge-row">${badges.map(item => `<span class="chip${item.tone ? ` ${escapeHtml(item.tone)}` : ''}">${escapeHtml(item.text)}</span>`).join('')}</div>
          <strong>Incident-to-rule manual review</strong>
          <span class="ops-rule-note">${escapeHtml(body)}</span>
          <span class="ops-rule-note">draft API ${escapeHtml(draftApiRoute)} · 저장은 /ops/rules 수동 저장 버튼에서만 수행합니다.</span>
          <a class="button button-secondary button-compact" data-incident-rule-draft-route href="${escapeHtml(draftRoute)}">룰 draft 검토</a>
        </div>`;
      }
      function eventReviewVlmHtml(entry = {}) {
        const vlm = entry?.vlmReview || {};
        const review = entry?.review || {};
        const vlmAction = review.vlmAction || {};
        const evidence = vlm.evidence || {};
        const explanation = vlm.explanation || {};
        const hints = Array.isArray(explanation.falsePositiveHints) ? explanation.falsePositiveHints : [];
        const questions = Array.isArray(explanation.operatorReviewQuestions) ? explanation.operatorReviewQuestions : [];
        const badges = [
          { text: vlm.eventRecordPresent ? 'EventRecord' : 'EventRecord 없음', tone: vlm.eventRecordPresent ? 'info' : 'warn' },
          { text: evidence.snapshotPathPresent ? 'snapshot' : 'snapshot 없음', tone: evidence.snapshotPathPresent ? 'info' : 'warn' },
          { text: evidence.clipPathPresent ? 'short clip' : 'clip 없음', tone: evidence.clipPathPresent ? 'info' : 'warn' },
          { text: vlm.observationPresent ? 'VLM 설명' : 'VLM 대기', tone: vlm.observationPresent ? 'info' : 'warn' }
        ];
        const hintText = hints.length ? hints.slice(0, 2).map(display).join(' · ') : '오탐 힌트 없음';
        const questionText = questions.length ? questions.slice(0, 2).map(display).join(' · ') : '운영자 질문 없음';
        return `<div class="ops-vlm-event-review" data-testid="ops-vlm-event-review-card" data-vlm-review-contract="ops-only-no-client-exposure">
          <div class="badge-row">${badges.map(item => `<span class="chip${item.tone ? ` ${escapeHtml(item.tone)}` : ''}">${escapeHtml(item.text)}</span>`).join('')}</div>
          <strong>${escapeHtml(display(explanation.summary || 'VLM explanation pending'))}</strong>
          <span class="ops-rule-note">${escapeHtml(display(explanation.eventExplanation || 'EventRecord evidence와 matching observation이 있으면 설명을 표시합니다.'))}</span>
          <span class="ops-rule-note">오탐: ${escapeHtml(hintText)}</span>
          <span class="ops-rule-note">확인: ${escapeHtml(questionText)}</span>
          <div class="ops-vlm-review-action-controls" data-testid="ops-vlm-review-action-controls" data-vlm-review-action-workflow="ops-only-review-state">
            <label>VLM action ${eventReviewSelectHtml('vlmAction', VLM_REVIEW_ACTIONS, vlmAction.action || 'not-reviewed')}</label>
            <label>Action target ${eventReviewSelectHtml('vlmActionTarget', VLM_REVIEW_ACTION_TARGETS, vlmAction.target || 'eventExplanation')}</label>
            <input class="event-review-note-input" data-event-review-field="vlmActionNote" maxlength="300" value="${escapeHtml(vlmAction.note || '')}" placeholder="VLM action note" />
          </div>
        </div>${renderIncidentRuleSuggestionReview(entry)}`;
      }
      function renderEventReviewRows(items) {
        const tbody = document.getElementById('eventReviewRows');
        if (!tbody) return;
        if (!Array.isArray(items) || items.length === 0) {
          setTableEmpty(tbody, 7, '검토할 Rule/Scenario 이벤트가 없습니다.');
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
          return `<tr data-event-review-row data-event-id="${escapeHtml(eventId)}" data-event-review-detail="event-list-detail" data-event-review-action-target="false-positive-or-vlm-target">
            ${tableCellHtml('이벤트', eventHtml)}
            ${tableCellHtml('리뷰', eventReviewSelectHtml('reviewStatus', EVENT_REVIEW_STATUSES, review.reviewStatus || 'new'))}
            ${tableCellHtml('분류', eventReviewSelectHtml('classification', EVENT_REVIEW_CLASSES, review.classification || 'unclassified'))}
            ${tableCellHtml('Incident / Action', eventReviewIncidentHtml(review))}
            ${tableCellHtml('메모', noteHtml)}
            ${tableCellHtml('Evidence / VLM', eventReviewVlmHtml(entry))}
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
              incidentId: row.querySelector('[data-event-review-field="incidentId"]')?.value || '',
              incidentStatus: row.querySelector('[data-event-review-field="incidentStatus"]')?.value || 'new',
              actionTarget: row.querySelector('[data-event-review-field="actionTarget"]')?.value || 'operator-triage',
              note: row.querySelector('[data-event-review-field="note"]')?.value || '',
              vlmAction: {
                schema: 'media-server.ops.vlm-review-action-state.v1',
                action: row.querySelector('[data-event-review-field="vlmAction"]')?.value || 'not-reviewed',
                target: row.querySelector('[data-event-review-field="vlmActionTarget"]')?.value || 'eventExplanation',
                note: row.querySelector('[data-event-review-field="vlmActionNote"]')?.value || ''
              }
            };
            button.disabled = true;
            try {
              const result = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              setText('eventReviewSummary', `${eventId} review 저장됨 · incident ${result.review?.incidentStatus || payload.incidentStatus} · VLM ${result.review?.vlmAction?.action || payload.vlmAction.action}`);
              renderOpsAuditTrail('event-review-audit-list', 'events', { action: 'incident-action-update' });
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
        const incidentStatus = String(document.getElementById('eventReviewIncidentStatusFilter')?.value || '').trim();
        if (reviewStatus) reviewParams.set('reviewStatus', reviewStatus);
        if (classification) reviewParams.set('classification', classification);
        if (incidentStatus) reviewParams.set('incidentStatus', incidentStatus);
        return reviewParams;
      }
      function incidentMemoryQueryParams(eventParams) {
        const memoryParams = new URLSearchParams(eventParams.toString());
        const q = String(document.getElementById('opsIncidentSearchInput')?.value || '').trim();
        const ruleId = String(document.getElementById('opsIncidentSearchRuleFilter')?.value || '').trim();
        const sourceId = String(document.getElementById('opsIncidentSearchSourceFilter')?.value || '').trim();
        const incidentStatus = String(document.getElementById('opsIncidentSearchStatusFilter')?.value || '').trim();
        const startTimeMs = String(document.getElementById('opsIncidentSearchStartTime')?.value || '').trim();
        const endTimeMs = String(document.getElementById('opsIncidentSearchEndTime')?.value || '').trim();
        if (q) memoryParams.set('q', q);
        if (ruleId) memoryParams.set('ruleId', ruleId);
        if (sourceId) memoryParams.set('sourceId', sourceId);
        if (incidentStatus) memoryParams.set('incidentStatus', incidentStatus);
        if (startTimeMs) memoryParams.set('startTimeMs', startTimeMs);
        if (endTimeMs) memoryParams.set('endTimeMs', endTimeMs);
        return memoryParams;
      }
      function v300EventEvidenceSearchQueryParams(eventParams) {
        const v300Params = new URLSearchParams(eventParams.toString());
        const q = String(
          document.getElementById('opsV300EventEvidenceSearchInput')?.value ||
          document.getElementById('opsIncidentSearchInput')?.value ||
          ''
        ).trim();
        const retryFilter = String(document.getElementById('opsV300EventEvidenceRetryFilter')?.value || '').trim();
        if (q) v300Params.set('v300Q', q);
        if (retryFilter) v300Params.set('v300RetryFilter', retryFilter);
        if (document.getElementById('opsV300EventEvidencePinnedOnly')?.checked) {
          v300Params.set('v300PinnedOnly', '1');
        }
        return v300Params;
      }
      function incidentMemoryHighlightHtml(fragment, matchedTerms = []) {
        let html = escapeHtml(display(fragment || ''));
        for (const term of matchedTerms) {
          const needle = String(term || '').trim();
          if (!needle) continue;
          const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(new RegExp(`(${escapedNeedle})`, 'ig'), '<mark class="incident-memory-highlight">$1</mark>');
        }
        return html;
      }
      function renderIncidentMemorySearch(memorySearch = {}) {
        const root = document.getElementById('opsIncidentSearchRows');
        if (!root) return;
        const hits = Array.isArray(memorySearch.hits) ? memorySearch.hits : [];
        const q = String(memorySearch.query || document.getElementById('opsIncidentSearchInput')?.value || '').trim();
        renderBadges('opsIncidentSearchBadges', [
          { text: `backend ${display(memorySearch.backend || 'jsonl-bm25')}`, tone: 'info' },
          { text: `docs ${memorySearch.documentCount ?? 0}` },
          { text: `hits ${hits.length}`, tone: hits.length > 0 ? '' : 'warn' },
          { text: memorySearch.modelProviderDependency === false ? 'no provider' : 'provider 확인 필요', tone: memorySearch.modelProviderDependency === false ? 'info' : 'warn' },
          { text: memorySearch.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: memorySearch.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentSearchSummary',
          q
            ? `query "${q}" · ${hits.length} hit · local incident memory · matched evidence highlight`
            : '검색어를 입력하면 local incident memory에서 matched evidence highlight를 표시합니다.'
        );
        if (!q) {
          root.innerHTML = '<p class="ops-rule-note">검색어를 입력하면 EventRecord/review projection의 matched evidence highlight가 표시됩니다.</p>';
          return;
        }
        if (hits.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">필터에 맞는 incident memory 검색 결과가 없습니다.</p>';
          return;
        }
        root.innerHTML = hits.map(hit => {
          const matchedTerms = Array.isArray(hit.matchedTerms) ? hit.matchedTerms : [];
          const fragments = Array.isArray(hit.highlightFragments) && hit.highlightFragments.length
            ? hit.highlightFragments
            : [hit.summary || hit.title || hit.documentId || 'matched evidence'];
          return `<article class="incident-memory-result" data-incident-memory-hit="${escapeHtml(hit.documentId || '')}" data-source-kind="${escapeHtml(hit.sourceKind || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(hit.title || hit.documentId || 'incident memory'))}</strong>
              <span>${escapeHtml(display(hit.sourceKind || 'document'))} · ${escapeHtml(display(hit.incidentId || '-'))} · ${escapeHtml(display(hit.sourceId || '-'))}</span>
            </div>
            <div class="badge-row">${matchedTerms.map(term => `<span class="chip info">${escapeHtml(term)}</span>`).join('')}</div>
            <div class="incident-memory-fragments">${fragments.map(fragment => `<p>${incidentMemoryHighlightHtml(fragment, matchedTerms)}</p>`).join('')}</div>
          </article>`;
        }).join('');
      }
      function renderV300EventEvidenceSearchUi(eventEvidenceSearch = {}) {
        const root = document.getElementById('opsV300EventEvidenceRows');
        if (!root) return;
        const items = Array.isArray(eventEvidenceSearch.items) ? eventEvidenceSearch.items : [];
        const query = String(
          eventEvidenceSearch.query ||
          document.getElementById('opsV300EventEvidenceSearchInput')?.value ||
          document.getElementById('opsIncidentSearchInput')?.value ||
          ''
        ).trim();
        renderBadges('opsV300EventEvidenceSearchBadges', [
          { text: eventEvidenceSearch.schema || 'media-server.ops.v300-event-evidence-search-ui.v1' },
          { text: eventEvidenceSearch.featureSearchIndexBacked === true ? 'Feature/Search Index' : 'index 확인 필요', tone: eventEvidenceSearch.featureSearchIndexBacked === true ? 'info' : 'warn' },
          { text: `hits ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: eventEvidenceSearch.modelProviderDependency === false ? 'no provider' : 'provider 확인 필요', tone: eventEvidenceSearch.modelProviderDependency === false ? 'info' : 'warn' },
          { text: eventEvidenceSearch.vectorSearchPerformed === false ? 'no vector' : 'vector 확인 필요', tone: eventEvidenceSearch.vectorSearchPerformed === false ? 'info' : 'warn' },
          { text: eventEvidenceSearch.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: eventEvidenceSearch.viewerClientExposureAdded === false ? 'info' : 'warn' },
          { text: eventEvidenceSearch.retentionCleanupExecuted === false ? 'cleanup 미실행' : 'cleanup 확인 필요', tone: eventEvidenceSearch.retentionCleanupExecuted === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsV300EventEvidenceSearchSummary',
          eventEvidenceSearch.searchDslValid === false
            ? `V300 query rejected: ${display(eventEvidenceSearch.rejectionReason || 'invalid query')}`
            : `V300 evidence detail${query ? ` · query "${query}"` : ''} · evidence timeline · feature reasons · retry/pin/retention status`
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 V300 evidence detail이 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const timeline = Array.isArray(item?.evidenceTimeline) ? item.evidenceTimeline : [];
          const reasons = Array.isArray(item?.featureReasons) ? item.featureReasons : [];
          const retry = item?.retryActions || {};
          const pin = item?.pinStatus || {};
          const retention = item?.retentionStatus || {};
          return `<article class="v300-event-evidence-card" data-v300-event-evidence-card="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventType || item?.eventId || 'event evidence'))}</strong>
              <span>${escapeHtml(display(item?.eventId || '-'))} · ${escapeHtml(display(item?.sourceId || 'unknown-source'))} · review ${escapeHtml(display(item?.reviewState || 'new'))}</span>
            </div>
            <div class="v300-evidence-timeline" data-v300-evidence-timeline="${escapeHtml(item?.eventId || '')}">
              ${timeline.map(point => `<div class="v300-evidence-timeline-point" data-v300-evidence-phase="${escapeHtml(point?.phase || '')}">
                <span>${escapeHtml(display(point?.phase || 'phase'))}</span>
                <strong>${escapeHtml(display(point?.status || 'unknown'))}</strong>
                <p>${escapeHtml(display(point?.reason || point?.ref || 'local evidence'))}</p>
              </div>`).join('')}
            </div>
            <div class="v300-feature-reason-grid">
              ${reasons.map(reason => `<p data-v300-feature-reason="${escapeHtml(reason?.field || '')}">
                <strong>${escapeHtml(display(reason?.field || 'feature'))}</strong>
                <span>${escapeHtml(display(reason?.value || '-'))}</span>
              </p>`).join('')}
            </div>
            <div class="v300-retention-status-grid">
              <p><strong>retry</strong><span>${escapeHtml(display(retry.status || 'unknown'))} · write ${retry.retryWritePerformed === false ? 'not-run' : '확인 필요'}</span></p>
              <p><strong>pin</strong><span>${pin.pinned === true ? 'pinned' : 'eligible'} · write ${pin.pinWritePerformed === false ? 'not-run' : '확인 필요'}</span></p>
              <p><strong>retention</strong><span>${escapeHtml(display(retention.status || 'seven-day-window'))} · cleanup ${retention.retentionCleanupExecuted === false ? 'not-run' : '확인 필요'}</span></p>
            </div>
            <div class="v300-retry-action-list">
              <span class="chip ${retry.status === 'retryable' ? 'info' : 'warn'}">retryActions ${escapeHtml(display(retry.status || 'unknown'))}</span>
              <span class="chip ${pin.pinned === true ? 'info' : ''}">pinStatus ${pin.pinned === true ? 'pinned' : 'eligible-not-pinned'}</span>
              <span class="chip info">retentionStatus ${escapeHtml(display(retention.status || 'seven-day-window'))}</span>
            </div>
          </article>`;
        }).join('');
      }
      function renderV310ReplayTimelineUi(replayTimeline = {}) {
        const root = document.getElementById('opsV310ReplayTimelineRows');
        if (!root) return;
        const items = Array.isArray(replayTimeline.items) ? replayTimeline.items : [];
        renderBadges('opsV310ReplayTimelineBadges', [
          { text: replayTimeline.schema || 'media-server.ops.v310-replay-timeline-ui.v1' },
          { text: `events ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: replayTimeline.frameRefPtsMappingRequired === true ? 'FrameRef/PTS' : 'mapping 확인 필요', tone: replayTimeline.frameRefPtsMappingRequired === true ? 'info' : 'warn' },
          { text: replayTimeline.encodedClipTimelineRequired === true ? 'encoded clip timeline' : 'clip 확인 필요', tone: replayTimeline.encodedClipTimelineRequired === true ? 'info' : 'warn' },
          { text: replayTimeline.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: replayTimeline.viewerClientExposureAdded === false ? 'info' : 'warn' },
          { text: replayTimeline.sourceUrlExposed === false && replayTimeline.rawJsonExposed === false && replayTimeline.debugMaterialExposed === false ? 'redacted refs' : 'redaction 확인 필요', tone: replayTimeline.sourceUrlExposed === false && replayTimeline.rawJsonExposed === false && replayTimeline.debugMaterialExposed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsV310ReplayTimelineSummary',
          items.length
            ? `V310 replay timeline · ${items.length} event · event frame / representative image / frame bundle / encoded clip`
            : 'EventRecord evidence refs와 encoded clip manifest가 있으면 replay timeline이 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 V310 replay timeline이 없습니다.</p>';
          return;
        }
        const artifactCard = (label, artifact = {}) => `<p data-v310-replay-artifact="${escapeHtml(label)}">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(display(artifact.status || (artifact.available ? 'present' : 'missing')))}</span>
          <small>${escapeHtml(display(artifact.storageKey || artifact.encodedClipManifestPath || artifact.encodedClipMediaPath || 'not-available'))}</small>
        </p>`;
        root.innerHTML = items.map(item => {
          const timelinePoints = Array.isArray(item?.timelinePoints) ? item.timelinePoints : [];
          const playbackSegments = Array.isArray(item?.playbackSegments) ? item.playbackSegments : [];
          const mapping = item?.frameRefPtsMapping || {};
          const encodedClip = item?.encodedClip || {};
          return `<article class="v310-replay-timeline-card" data-v310-replay-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventType || item?.eventId || 'replay event'))}</strong>
              <span>${escapeHtml(display(item?.eventId || '-'))} · ${escapeHtml(display(item?.sourceId || 'unknown-source'))} · review ${escapeHtml(display(item?.reviewState || 'new'))}</span>
            </div>
            <div class="v310-replay-artifact-grid">
              ${artifactCard('eventFrame', item?.eventFrame)}
              ${artifactCard('representativeImage', item?.representativeImage)}
              ${artifactCard('frameBundle', item?.frameBundle)}
              ${artifactCard('encodedClip', encodedClip)}
            </div>
            <div class="v310-replay-timeline-rail" data-v310-replay-timeline="${escapeHtml(item?.eventId || '')}">
              ${timelinePoints.map(point => `<div class="v310-replay-timeline-point" data-v310-replay-phase="${escapeHtml(point?.phase || '')}">
                <span>${escapeHtml(display(point?.phase || 'phase'))}</span>
                <strong>${escapeHtml(display(point?.status || 'unknown'))}</strong>
                <p>${escapeHtml(display(point?.label || point?.ref || 'evidence ref'))}</p>
              </div>`).join('')}
            </div>
            <div class="v310-replay-playback-segments">
              ${playbackSegments.map(segment => `<span class="chip ${segment?.status === 'completed' ? 'info' : ''}" data-v310-replay-segment="${escapeHtml(segment?.key || '')}">
                ${escapeHtml(display(segment?.key || 'segment'))} ${escapeHtml(display(segment?.startRelativeToEventMs ?? '-'))}→${escapeHtml(display(segment?.endRelativeToEventMs ?? '-'))}ms · ${escapeHtml(display(segment?.status || 'unknown'))}
              </span>`).join('')}
            </div>
            <p class="ops-rule-note">FrameRef/PTS eventClipPtsMs ${escapeHtml(display(mapping.eventClipPtsMs ?? '-'))} · encodedClipMediaPath ${escapeHtml(display(encodedClip.encodedClipMediaPath || 'not-available'))} · sourceUrlExposed ${item?.sourceUrlExposed === false ? 'false' : '확인 필요'} · rawJsonExposed ${item?.rawJsonExposed === false ? 'false' : '확인 필요'} · debugMaterialExposed ${item?.debugMaterialExposed === false ? 'false' : '확인 필요'}</p>
          </article>`;
        }).join('');
      }
      function renderVlmSummaryCandidateReview(vlmSummaryCandidateReview = {}) {
        const root = document.getElementById('opsVlmSummaryCandidateRows');
        if (!root) return;
        const report = vlmSummaryCandidateReview.sourceCandidateReport || {};
        const candidates = Array.isArray(report.candidates) ? report.candidates : [];
        const q = String(vlmSummaryCandidateReview.query || report.query || document.getElementById('opsIncidentSearchInput')?.value || '').trim();
        renderBadges('opsVlmSummaryCandidateBadges', [
          { text: vlmSummaryCandidateReview.candidateStatus || 'ops-manual-review-not-auto-applied', tone: 'info' },
          { text: `candidates ${candidates.length}`, tone: candidates.length > 0 ? '' : 'warn' },
          { text: report.schema || vlmSummaryCandidateReview.sourceCandidateSchema || 'media-server.vlm-summary-search-candidates.v1' },
          { text: vlmSummaryCandidateReview.manualReviewRoute || '/ops/events' },
          { text: vlmSummaryCandidateReview.contract?.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: vlmSummaryCandidateReview.contract?.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        if (!q) {
          setText('opsVlmSummaryCandidateSummary', '검색어를 입력하면 sidecar summary candidate를 sourceCandidateReport로 감싸 manual review 후보로 표시합니다.');
          root.innerHTML = '<p class="ops-rule-note">검색어를 입력하면 VLM summary candidate review가 표시됩니다.</p>';
          return;
        }
        if (vlmSummaryCandidateReview.error) {
          setText('opsVlmSummaryCandidateSummary', `VLM summary candidate review 실패: ${vlmSummaryCandidateReview.error}`);
          root.innerHTML = '<p class="ops-rule-note">candidate report를 불러오지 못했습니다.</p>';
          return;
        }
        setText('opsVlmSummaryCandidateSummary', `query "${q}" · ${candidates.length} VLM summary candidate · manual review only · 자동 적용 없음`);
        if (candidates.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 VLM summary candidate가 없습니다.</p>';
          return;
        }
        root.innerHTML = candidates.map(candidate => {
          const matchedTerms = Array.isArray(candidate.matchedTerms) ? candidate.matchedTerms : [];
          const summary = candidate.summary || candidate.eventExplanation || 'summary candidate';
          return `<article class="vlm-summary-candidate-card" data-vlm-summary-candidate-event="${escapeHtml(candidate.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(candidate.eventId || candidate.observationId || 'vlm summary candidate'))}</strong>
              <span>${escapeHtml(display(candidate.sourceId || '-'))} · ${escapeHtml(display(candidate.ruleId || '-'))} · score ${escapeHtml(display(candidate.matchScore ?? '-'))}</span>
            </div>
            <div class="badge-row">${matchedTerms.map(term => `<span class="chip info">${escapeHtml(term)}</span>`).join('')}</div>
            <p>${escapeHtml(display(summary))}</p>
            <p class="form-note">manualReviewRoute ${escapeHtml(display(vlmSummaryCandidateReview.manualReviewRoute || '/ops/events'))} · sourceCandidateReport preserved · auto apply false</p>
          </article>`;
        }).join('');
      }
      function renderIncidentTriageBoard(incidentTriageBoard = {}) {
        const root = document.getElementById('opsIncidentTriageBoardRows');
        if (!root) return;
        const cards = Array.isArray(incidentTriageBoard.cards) ? [...incidentTriageBoard.cards] : [];
        const laneFilter = String(document.getElementById('opsIncidentTriageLaneFilter')?.value || 'all');
        const priorityFilter = String(document.getElementById('opsIncidentTriagePriorityFilter')?.value || 'all');
        const sortMode = String(document.getElementById('opsIncidentTriageSort')?.value || 'priority');
        const filtered = cards
          .filter(card => laneFilter === 'all' || String(card?.lane || '') === laneFilter)
          .filter(card => priorityFilter === 'all' || String(card?.priority || '') === priorityFilter);
        filtered.sort((left, right) => {
          if (sortMode === 'review-age') {
            return numberValue(right?.reviewUpdatedAtMs) - numberValue(left?.reviewUpdatedAtMs);
          }
          if (sortMode === 'event-time') {
            return numberValue(right?.eventTimeMs) - numberValue(left?.eventTimeMs);
          }
          return numberValue(right?.priorityRank) - numberValue(left?.priorityRank);
        });
        const lanes = Array.isArray(incidentTriageBoard.laneFilters)
          ? incidentTriageBoard.laneFilters.filter(item => item !== 'all')
          : ['needs-triage', 'in-progress', 'watchlist', 'resolved'];
        renderBadges('opsIncidentTriageBoardBadges', [
          { text: incidentTriageBoard.schema || 'media-server.ops.incident-triage-board.v1' },
          { text: `cards ${filtered.length}/${cards.length}`, tone: filtered.length > 0 ? '' : 'warn' },
          { text: `lane ${laneFilter}` },
          { text: `sort ${sortMode}` },
          { text: incidentTriageBoard.contract?.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: incidentTriageBoard.contract?.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentTriageBoardSummary',
          cards.length
            ? `priority/reviewState/sourceId/ruleId/scenario/similarIncidentKey/vlmCandidateStatus 기준 · ${filtered.length}개 표시`
            : 'EventRecord와 review state를 불러오면 lane/filter/sort board가 표시됩니다.'
        );
        if (filtered.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">현재 필터에 맞는 triage card가 없습니다.</p>';
          return;
        }
        root.innerHTML = lanes.map(lane => {
          const laneCards = filtered.filter(card => String(card?.lane || 'watchlist') === lane);
          return `<section class="incident-triage-lane" data-incident-triage-lane="${escapeHtml(lane)}">
            <div class="toolbar">
              <h4>${escapeHtml(lane)}</h4>
              <span class="chip">${laneCards.length}</span>
            </div>
            <div class="incident-triage-card-list">
              ${laneCards.length ? laneCards.map(card => {
                const reasons = Array.isArray(card?.priorityReasons) ? card.priorityReasons : [];
                return `<article class="incident-triage-card" data-incident-triage-card="${escapeHtml(card?.eventId || '')}" data-priority="${escapeHtml(card?.priority || 'low')}">
                  <div class="table-cell-main">
                    <strong>${escapeHtml(display(card?.eventId || 'event'))}</strong>
                    <span>${escapeHtml(display(card?.sourceId || '-'))} · ${escapeHtml(display(card?.ruleId || '-'))} · ${escapeHtml(display(card?.scenario || '-'))}</span>
                  </div>
                  <div class="badge-row">
                    <span class="chip ${card?.priority === 'urgent' ? 'warn' : 'info'}">${escapeHtml(display(card?.priority || 'low'))}</span>
                    <span class="chip">${escapeHtml(display(card?.reviewState || 'new'))}</span>
                    <span class="chip">${escapeHtml(display(card?.incidentStatus || 'new'))}</span>
                  </div>
                  <p class="ops-rule-note">similarIncidentKey ${escapeHtml(display(card?.similarIncidentKey || '-'))}</p>
                  <p class="ops-rule-note">vlmCandidateStatus ${escapeHtml(display(card?.vlmCandidateStatus || 'no-rule-suggestion-candidate'))}</p>
                  <div class="badge-row">${reasons.map(reason => `<span class="chip">${escapeHtml(display(reason))}</span>`).join('')}</div>
                </article>`;
              }).join('') : '<p class="ops-rule-note">이 lane에는 card가 없습니다.</p>'}
            </div>
          </section>`;
        }).join('');
      }
      function renderIncidentDecisionScorecard(incidentDecisionScorecard = {}) {
        const root = document.getElementById('opsIncidentDecisionScorecardRows');
        if (!root) return;
        const scorecards = Array.isArray(incidentDecisionScorecard.scorecards) ? incidentDecisionScorecard.scorecards : [];
        renderBadges('opsIncidentDecisionScorecardBadges', [
          { text: incidentDecisionScorecard.schema || 'media-server.ops.incident-decision-scorecard.v1' },
          { text: `scorecards ${scorecards.length}`, tone: scorecards.length > 0 ? '' : 'warn' },
          { text: incidentDecisionScorecard.deterministicPriorityReasons === true ? 'deterministic' : 'reason 확인 필요', tone: incidentDecisionScorecard.deterministicPriorityReasons === true ? 'info' : 'warn' },
          { text: incidentDecisionScorecard.contract?.rawJsonExposed === false ? 'raw payload hidden' : 'raw payload 확인 필요', tone: incidentDecisionScorecard.contract?.rawJsonExposed === false ? 'info' : 'warn' },
          { text: incidentDecisionScorecard.contract?.sourceUrlExposed === false ? 'source URL hidden' : 'source URL 확인 필요', tone: incidentDecisionScorecard.contract?.sourceUrlExposed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentDecisionScorecardSummary',
          scorecards.length
            ? `EventRecord/sourceHealth/similarIncident/VLM summary/rule candidate/operator review age · ${scorecards.length} scorecard`
            : 'EventRecord와 review state를 불러오면 deterministic priority reason chip이 표시됩니다.'
        );
        if (scorecards.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 decision scorecard가 없습니다.</p>';
          return;
        }
        root.innerHTML = scorecards.map(card => {
          const chips = Array.isArray(card?.priorityReasonChips) ? card.priorityReasonChips : [];
          const eventBasis = card?.eventRecordBasis || {};
          const sourceBasis = card?.sourceHealthBasis || {};
          const similarBasis = card?.similarIncidentBasis || {};
          return `<article class="incident-decision-scorecard-card" data-incident-decision-scorecard-event="${escapeHtml(card?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(card?.eventId || 'event'))}</strong>
              <span>EventRecord ${escapeHtml(display(eventBasis.eventType || 'event'))} · ${escapeHtml(display(eventBasis.status || 'unknown'))}</span>
            </div>
            <div class="badge-row">
              ${chips.map(chip => `<span class="chip priority-reason-chip ${chip?.tone ? escapeHtml(chip.tone) : ''}">${escapeHtml(display(chip?.label || chip))}</span>`).join('')}
            </div>
            <div class="incident-decision-basis-grid">
              <p><strong>sourceHealthBasis</strong><span>${escapeHtml(display(sourceBasis.sourceId || '-'))} · ${escapeHtml(display(sourceBasis.status || '-'))}</span></p>
              <p><strong>similarIncidentBasis</strong><span>${escapeHtml(display(similarBasis.similarIncidentKey || '-'))}</span></p>
              <p><strong>VLM</strong><span>summary ${escapeHtml(display(card?.vlmSummaryCandidateStatus || '-'))} · rule ${escapeHtml(display(card?.vlmRuleCandidateStatus || '-'))}</span></p>
              <p><strong>operatorReviewAgeMs</strong><span>${escapeHtml(display(card?.operatorReviewAgeMs ?? '-'))}</span></p>
            </div>
          </article>`;
        }).join('');
      }
      function renderOperationalActionPack(operationalActionPack = {}) {
        const root = document.getElementById('opsOperationalActionPackRows');
        if (!root) return;
        const items = Array.isArray(operationalActionPack.items) ? operationalActionPack.items : [];
        renderBadges('opsOperationalActionPackBadges', [
          { text: operationalActionPack.schema || 'media-server.ops.operational-action-pack.v1' },
          { text: `actions ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: operationalActionPack.contract?.externalDeliveryPerformed === false ? 'external delivery 미수행' : 'delivery 확인 필요', tone: operationalActionPack.contract?.externalDeliveryPerformed === false ? 'info' : 'warn' },
          { text: operationalActionPack.contract?.ruleRegistryWritePerformed === false ? 'rule write 없음' : 'rule write 확인 필요', tone: operationalActionPack.contract?.ruleRegistryWritePerformed === false ? 'info' : 'warn' },
          { text: operationalActionPack.contract?.sourceHealthWritePerformed === false ? 'source write 없음' : 'source write 확인 필요', tone: operationalActionPack.contract?.sourceHealthWritePerformed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsOperationalActionPackSummary',
          items.length
            ? `release-safe evidence bundle/rule draft/alert dry-run/source health recheck · ${items.length} action pack`
            : 'EventRecord와 review state를 불러오면 수동 조치 pack이 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Operational Action Pack이 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const actions = item?.actions || {};
          const evidence = actions.releaseSafeEvidenceBundle || {};
          const ruleDraftRoute = actions.ruleDraftRoute || {};
          const alertDryRunRoute = actions.alertDryRunRoute || {};
          const sourceHealthRecheck = actions.sourceHealthRecheck || {};
          const bundlePayload = JSON.stringify(evidence.bundlePayload || { releaseSafe: '1', eventId: item?.eventId || '' });
          const actionButtons = [
            evidence.available ? `<button type="button" class="button button-secondary button-compact" data-release-safe-evidence-bundle="redacted incident evidence bundle" data-evidence-bundle="${escapeHtml(bundlePayload)}">release-safe bundle</button>` : `<span class="chip warn">evidence 없음</span>`,
            ruleDraftRoute.available ? `<a class="button button-secondary button-compact" data-rule-draft-route="manual-draft-only" href="${escapeHtml(ruleDraftRoute.route || '/ops/rules')}">rule draft</a>` : `<span class="chip warn">rule draft 대기</span>`,
            alertDryRunRoute.available ? `<button type="button" class="button button-secondary button-compact" data-action-pack-alert-dry-run="${escapeHtml(item?.eventId || '')}">alert dry-run</button>` : '',
            sourceHealthRecheck.available ? `<a class="button button-secondary button-compact" data-source-health-recheck="dry-run" href="/ops/dashboard">source health recheck</a>` : `<span class="chip warn">source health 대기</span>`
          ].filter(Boolean).join('');
          return `<article class="operational-action-pack-card" data-operational-action-pack-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip">${escapeHtml(display(item?.incidentStatus || 'new'))}</span>
              <span class="chip">${evidence.releaseSafe === true ? 'release-safe' : 'bundle 확인 필요'}</span>
              <span class="chip">${ruleDraftRoute.ruleRegistryWritePerformed === false ? 'manual draft only' : 'rule write 확인 필요'}</span>
              <span class="chip">${alertDryRunRoute.externalDeliveryPerformed === false ? 'dry-run only' : 'delivery 확인 필요'}</span>
              <span class="chip">${sourceHealthRecheck.sourceHealthWritePerformed === false ? 'source check only' : 'source write 확인 필요'}</span>
            </div>
            <div class="operational-action-pack-actions">${actionButtons}</div>
          </article>`;
        }).join('');
        document.querySelectorAll('[data-action-pack-alert-dry-run]').forEach(button => {
          if (button.dataset.boundActionPackAlertDryRun === '1') return;
          button.dataset.boundActionPackAlertDryRun = '1';
          button.addEventListener('click', async () => {
            try {
              await dryRunAlertDeliveryIntegration('');
              await refreshEvents();
            } catch (error) {
              setText('opsOperationalActionPackSummary', `alert dry-run 실패: ${error.message}`);
            }
          });
        });
      }
      function renderIncidentActionReadinessQueue(incidentActionReadinessQueue = {}) {
        const root = document.getElementById('opsIncidentActionReadinessQueueRows');
        if (!root) return;
        const items = Array.isArray(incidentActionReadinessQueue.items) ? incidentActionReadinessQueue.items : [];
        const counts = incidentActionReadinessQueue.readinessCounts || {};
        renderBadges('opsIncidentActionReadinessQueueBadges', [
          { text: incidentActionReadinessQueue.schema || 'media-server.ops.incident-action-readiness-queue.v1' },
          { text: `items ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: `ready ${counts.ready || 0}`, tone: counts.ready > 0 ? 'info' : '' },
          { text: `blocked ${counts.blocked || 0}`, tone: counts.blocked > 0 ? 'warn' : '' },
          { text: `field-smoke-needed ${counts.fieldSmokeNeeded || 0}`, tone: counts.fieldSmokeNeeded > 0 ? 'warn' : '' },
          { text: `not-run ${counts.notRun || 0}`, tone: counts.notRun > 0 ? 'warn' : '' },
          { text: incidentActionReadinessQueue.contract?.externalDeliveryPerformed === false ? 'external delivery 미수행' : 'delivery 확인 필요', tone: incidentActionReadinessQueue.contract?.externalDeliveryPerformed === false ? 'info' : 'warn' },
          { text: incidentActionReadinessQueue.contract?.autoActionWritePerformed === false ? 'auto action write 없음' : 'action write 확인 필요', tone: incidentActionReadinessQueue.contract?.autoActionWritePerformed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentActionReadinessQueueSummary',
          items.length
            ? `ready ${counts.ready || 0} · blocked ${counts.blocked || 0} · field-smoke-needed ${counts.fieldSmokeNeeded || 0} · not-run ${counts.notRun || 0} · operator approval required`
            : 'EventRecord와 review state를 불러오면 readiness queue가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Incident Action Readiness Queue가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const followUps = Array.isArray(item?.followUps) ? item.followUps : [];
          const blockers = Array.isArray(item?.blockerReasons) ? item.blockerReasons : [];
          const status = item?.readinessStatus || 'not-run';
          return `<article class="incident-action-readiness-queue-card" data-incident-action-readiness-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${status === 'ready' ? 'info' : status === 'blocked' || status === 'field-smoke-needed' ? 'warn' : ''}">readinessStatus ${escapeHtml(display(status))}</span>
              <span class="chip">${item?.fieldSmokeRequired === true ? 'fieldSmokeRequired true' : 'fieldSmokeRequired false'}</span>
              <span class="chip">${item?.manualApprovalRequired === true ? 'manual approval required' : 'approval 확인 필요'}</span>
              <span class="chip">${item?.autoActionWritePerformed === false ? 'autoActionWritePerformed false' : 'action write 확인 필요'}</span>
              <span class="chip">${item?.externalDeliveryPerformed === false ? 'externalDeliveryPerformed false' : 'delivery 확인 필요'}</span>
            </div>
            <div class="incident-action-readiness-blockers">
              <strong>blockerReasons</strong>
              <span>${escapeHtml(blockers.length ? blockers.map(display).join(', ') : 'none')}</span>
            </div>
            <div class="incident-action-readiness-followups">
              ${followUps.map(followUp => `<p class="incident-action-readiness-followup" data-readiness-follow-up="${escapeHtml(followUp?.type || '')}">
                <strong>${escapeHtml(display(followUp?.label || followUp?.type || 'follow-up'))}</strong>
                <span>${escapeHtml(display(followUp?.status || 'not-run'))} · ${escapeHtml(display(followUp?.route || '-'))}</span>
                <span>${followUp?.fieldSmokeRequired === true ? 'field smoke required' : 'field smoke not required'} · ${followUp?.externalDeliveryPerformed === false ? 'external delivery 미수행' : 'delivery 확인 필요'} · ${followUp?.autoActionWritePerformed === false ? 'auto action write 없음' : 'action write 확인 필요'}</span>
                ${followUp?.blocker ? `<span class="muted">${escapeHtml(display(followUp.blocker))}</span>` : ''}
              </p>`).join('')}
            </div>
          </article>`;
        }).join('');
      }
      function renderEvidenceIntakeFieldReadiness(evidenceIntakeFieldReadiness = {}) {
        const root = document.getElementById('opsEvidenceIntakeFieldReadinessRows');
        if (!root) return;
        const items = Array.isArray(evidenceIntakeFieldReadiness.items) ? evidenceIntakeFieldReadiness.items : [];
        const counts = evidenceIntakeFieldReadiness.readinessCounts || {};
        renderBadges('opsEvidenceIntakeFieldReadinessBadges', [
          { text: evidenceIntakeFieldReadiness.schema || 'media-server.ops.evidence-intake-field-readiness.v1' },
          { text: `items ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: `passed ${counts.passed || 0}`, tone: counts.passed > 0 ? 'info' : '' },
          { text: `failed ${counts.failed || 0}`, tone: counts.failed > 0 ? 'bad' : '' },
          { text: `blocked ${counts.blocked || 0}`, tone: counts.blocked > 0 ? 'warn' : '' },
          { text: `not-run ${counts.notRun || 0}`, tone: counts.notRun > 0 ? 'warn' : '' },
          { text: evidenceIntakeFieldReadiness.contract?.endpointCredentialFieldPassClaimed === false ? 'no endpoint field PASS' : 'field PASS 확인 필요', tone: evidenceIntakeFieldReadiness.contract?.endpointCredentialFieldPassClaimed === false ? 'info' : 'warn' },
          { text: evidenceIntakeFieldReadiness.contract?.credentialMaterialExposed === false ? 'credential redacted' : 'credential 확인 필요', tone: evidenceIntakeFieldReadiness.contract?.credentialMaterialExposed === false ? 'info' : 'warn' },
          { text: evidenceIntakeFieldReadiness.contract?.rawEvidenceMaterialExposed === false ? 'raw evidence hidden' : 'raw evidence 확인 필요', tone: evidenceIntakeFieldReadiness.contract?.rawEvidenceMaterialExposed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsEvidenceIntakeFieldReadinessSummary',
          items.length
            ? `redacted evidence/source health/field smoke precondition · passed ${counts.passed || 0} · failed ${counts.failed || 0} · blocked ${counts.blocked || 0} · not-run ${counts.notRun || 0}`
            : 'EventRecord와 review state를 불러오면 Evidence Intake and Field Readiness가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Evidence Intake and Field Readiness가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const preconditions = Array.isArray(item?.preconditions) ? item.preconditions : [];
          const redaction = item?.redaction || {};
          const releaseSafe = item?.releaseSafeEvidenceIntake || {};
          const statusTone = status => status === 'passed' ? 'info' : (status === 'failed' || status === 'blocked' ? 'warn' : '');
          return `<article class="evidence-intake-field-readiness-card" data-evidence-intake-field-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${statusTone(item?.evidenceIntakeStatus)}">evidenceIntakeStatus ${escapeHtml(display(item?.evidenceIntakeStatus || 'not-run'))}</span>
              <span class="chip ${statusTone(item?.sourceHealthReadiness)}">sourceHealthReadiness ${escapeHtml(display(item?.sourceHealthReadiness || 'not-run'))}</span>
              <span class="chip ${statusTone(item?.fieldSmokeStatus)}">fieldSmokeStatus ${escapeHtml(display(item?.fieldSmokeStatus || 'not-run'))}</span>
              <span class="chip">${item?.endpointCredentialRequired === true ? 'endpointCredentialRequired true' : 'endpointCredentialRequired false'}</span>
              <span class="chip">${escapeHtml(display(item?.fieldSmokeCredentialStatus || 'not-required'))}</span>
            </div>
            <div class="evidence-intake-field-readiness-grid">
              <p><strong>redactedEvidenceBundleStatus</strong><span>${escapeHtml(display(item?.redactedEvidenceBundleStatus || '-'))}</span></p>
              <p><strong>snapshot/clip</strong><span>snapshot ${releaseSafe.snapshotPathPresent === true ? 'present' : 'missing'} · clip ${releaseSafe.clipPathPresent === true ? 'present' : 'missing'}</span></p>
              <p><strong>redaction</strong><span>credentialMaterialExposed ${redaction.credentialMaterialExposed === false ? 'false' : 'check'} · rawEvidenceMaterialExposed ${redaction.rawEvidenceMaterialExposed === false ? 'false' : 'check'} · endpointCredentialFieldPassClaimed ${redaction.endpointCredentialFieldPassClaimed === false ? 'false' : 'check'}</span></p>
            </div>
            <div class="evidence-intake-field-preconditions">
              ${preconditions.map(precondition => `<p class="evidence-intake-field-precondition" data-evidence-intake-precondition="${escapeHtml(precondition?.type || '')}">
                <strong>${escapeHtml(display(precondition?.label || precondition?.type || 'precondition'))}</strong>
                <span>${escapeHtml(display(precondition?.status || 'not-run'))} · ${escapeHtml(display(precondition?.detail || '-'))}</span>
                <span>${precondition?.operatorFollowUpRequired === true ? 'operator follow-up required' : 'operator follow-up optional'}</span>
              </p>`).join('')}
            </div>
          </article>`;
        }).join('');
      }
      function renderRuntimeEvidenceWindow(runtimeEvidenceWindow = {}) {
        const root = document.getElementById('opsRuntimeEvidenceWindowRows');
        if (!root) return;
        const items = Array.isArray(runtimeEvidenceWindow.items) ? runtimeEvidenceWindow.items : [];
        const counts = runtimeEvidenceWindow.windowCounts || {};
        renderBadges('opsRuntimeEvidenceWindowBadges', [
          { text: runtimeEvidenceWindow.schema || 'media-server.ops.runtime-evidence-window.v1' },
          { text: `items ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: `bounded ${counts.bounded || 0}`, tone: counts.bounded > 0 ? 'info' : '' },
          { text: `blocked ${counts.blocked || 0}`, tone: counts.blocked > 0 ? 'warn' : '' },
          { text: `not-run ${counts.notRun || 0}`, tone: counts.notRun > 0 ? 'warn' : '' },
          { text: runtimeEvidenceWindow.boundedLocalBuffer === true ? 'boundedLocalBuffer' : 'buffer 확인 필요', tone: runtimeEvidenceWindow.boundedLocalBuffer === true ? 'info' : 'warn' },
          { text: runtimeEvidenceWindow.pageSessionOnly === true ? 'pageSessionOnly' : 'session 확인 필요', tone: runtimeEvidenceWindow.pageSessionOnly === true ? 'info' : 'warn' },
          { text: runtimeEvidenceWindow.contract?.longrunSubstitute === false ? 'longrun substitute 아님' : 'longrun 확인 필요', tone: runtimeEvidenceWindow.contract?.longrunSubstitute === false ? 'info' : 'warn' },
          { text: runtimeEvidenceWindow.contract?.persistentArchiveCreated === false ? 'no persistent archive' : 'archive 확인 필요', tone: runtimeEvidenceWindow.contract?.persistentArchiveCreated === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsRuntimeEvidenceWindowSummary',
          items.length
            ? `bounded runtime/source/event evidence window · ${runtimeEvidenceWindow.eventWindowMs || 0}ms · longrun substitute 아님 · persistent archive 없음`
            : 'EventRecord와 review state를 불러오면 Runtime Evidence Window가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Runtime Evidence Window가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const packet = item?.runtimeEvidencePacket || {};
          const status = item?.runtimeWindowStatus || 'not-run';
          return `<article class="runtime-evidence-window-card" data-runtime-evidence-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${status === 'bounded' ? 'info' : status === 'blocked' ? 'warn' : ''}">runtimeWindowStatus ${escapeHtml(display(status))}</span>
              <span class="chip">${packet.boundedLocalBuffer === true ? 'boundedLocalBuffer true' : 'buffer 확인 필요'}</span>
              <span class="chip">${packet.pageSessionOnly === true ? 'pageSessionOnly true' : 'session 확인 필요'}</span>
              <span class="chip">${packet.longrunSubstitute === false ? 'longrunSubstitute false' : 'longrun 확인 필요'}</span>
              <span class="chip">${packet.persistentArchiveCreated === false ? 'persistentArchiveCreated false' : 'archive 확인 필요'}</span>
            </div>
            <div class="runtime-evidence-window-grid">
              <p><strong>windowScope</strong><span>${escapeHtml(display(packet.windowScope || runtimeEvidenceWindow.windowScope || '-'))}</span></p>
              <p><strong>eventWindowMs</strong><span>${escapeHtml(display(packet.eventWindowMs ?? runtimeEvidenceWindow.eventWindowMs ?? '-'))} · ${escapeHtml(display(packet.windowStartMs ?? '-'))} → ${escapeHtml(display(packet.windowEndMs ?? '-'))}</span></p>
              <p><strong>runtime/source/event</strong><span>${escapeHtml(display(packet.sourceRuntimeStatus || '-'))} · ${escapeHtml(display(packet.eventBufferStatus || '-'))} · ${escapeHtml(display(packet.metadataWindowStatus || '-'))}</span></p>
            </div>
            <div class="runtime-evidence-packet">
              <span>snapshot ${packet.snapshotPathPresent === true ? 'present' : 'missing'}</span>
              <span>clip ${packet.clipPathPresent === true ? 'present' : 'missing'}</span>
              <span>thirtyMinutePassClaimed ${packet.thirtyMinutePassClaimed === false ? 'false' : 'check'}</span>
              <span>oneHundredTwentyMinutePassClaimed ${packet.oneHundredTwentyMinutePassClaimed === false ? 'false' : 'check'}</span>
            </div>
          </article>`;
        }).join('');
      }
      function renderRuleWhatIfPreview(ruleWhatIfPreview = {}) {
        const root = document.getElementById('opsRuleWhatIfPreviewRows');
        if (!root) return;
        const items = Array.isArray(ruleWhatIfPreview.items) ? ruleWhatIfPreview.items : [];
        renderBadges('opsRuleWhatIfPreviewBadges', [
          { text: ruleWhatIfPreview.schema || 'media-server.ops.rule-what-if-preview.v1' },
          { text: `previews ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: ruleWhatIfPreview.contract?.fullReplayEngineExecuted === false ? 'no full replay' : 'replay 확인 필요', tone: ruleWhatIfPreview.contract?.fullReplayEngineExecuted === false ? 'info' : 'warn' },
          { text: ruleWhatIfPreview.contract?.ruleRegistryWritePerformed === false ? 'rule write 없음' : 'rule write 확인 필요', tone: ruleWhatIfPreview.contract?.ruleRegistryWritePerformed === false ? 'info' : 'warn' },
          { text: ruleWhatIfPreview.contract?.autoRuleApplied === false ? 'no auto apply' : 'auto 확인 필요', tone: ruleWhatIfPreview.contract?.autoRuleApplied === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsRuleWhatIfPreviewSummary',
          items.length
            ? `selected incident/EventRecord와 rule suggestion 후보 · ${items.length} condition preview`
            : 'EventRecord와 review state를 불러오면 rule what-if preview가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Rule What-if Preview가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const preview = item?.preview || {};
          const draftComparison = preview.draftComparison || {};
          const conditionPreview = preview.conditionPreview || {};
          const classes = Array.isArray(conditionPreview.classes) ? conditionPreview.classes : [];
          const manualDraftRoute = preview.manualDraftRoute || `/ops/rules?draftEventId=${encodeURIComponent(preview.eventId || item?.eventId || '')}&whatIfPreview=1`;
          return `<article class="rule-what-if-preview-card" data-rule-what-if-preview-event="${escapeHtml(preview.eventId || item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(preview.eventId || item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(preview.sourceId || '-'))} · ${escapeHtml(display(preview.ruleId || '-'))} · ${escapeHtml(display(preview.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${preview.matchingRuleSuggestionPresent ? 'info' : 'warn'}">${escapeHtml(display(preview.candidateStatus || 'no-rule-suggestion-candidate'))}</span>
              <span class="chip">${preview.draftOnly === true ? 'draft-only' : 'draft 확인 필요'}</span>
              <span class="chip">${preview.manualSaveRequired === true ? 'manual save' : 'save 확인 필요'}</span>
              <span class="chip">${draftComparison.fullReplayEngineExecuted === false ? 'no full replay' : 'replay 확인 필요'}</span>
              <span class="chip">${preview.ruleRegistryWritePerformed === false ? 'rule write 없음' : 'rule write 확인 필요'}</span>
            </div>
            <div class="rule-what-if-preview-comparison">
              <p><strong>draftComparison</strong><span>${escapeHtml(display(draftComparison.sourceEventType || '-'))} → ${escapeHtml(display(draftComparison.proposedRuleKind || '-'))} · ${escapeHtml(display(draftComparison.comparisonResult || '-'))}</span></p>
              <p><strong>conditionPreview</strong><span>${escapeHtml(display(conditionPreview.eventType || '-'))} · ${escapeHtml(classes.map(display).join(', ') || '대상 클래스 확인 필요')} · confidence ${escapeHtml(display(conditionPreview.minConfidence ?? '-'))} · duration ${escapeHtml(display(conditionPreview.minDurationMs ?? '-'))}</span></p>
            </div>
            <div class="operational-action-pack-actions">
              <a class="button button-secondary button-compact" data-rule-what-if-draft-route="draft-only-manual-save" href="${escapeHtml(manualDraftRoute)}">/ops/rules draft-only 검토</a>
            </div>
          </article>`;
        }).join('');
      }
      function renderApprovalGatedRuleDraftReadiness(approvalGatedRuleDraftReadiness = {}) {
        const root = document.getElementById('opsApprovalGatedRuleDraftReadinessRows');
        if (!root) return;
        const items = Array.isArray(approvalGatedRuleDraftReadiness.items) ? approvalGatedRuleDraftReadiness.items : [];
        const counts = approvalGatedRuleDraftReadiness.readinessCounts || {};
        renderBadges('opsApprovalGatedRuleDraftReadinessBadges', [
          { text: approvalGatedRuleDraftReadiness.schema || 'media-server.ops.approval-gated-rule-draft-readiness.v1' },
          { text: `staged drafts ${items.length}`, tone: items.length > 0 ? '' : 'warn' },
          { text: `ready ${counts.readyForApproval || 0}`, tone: counts.readyForApproval > 0 ? 'info' : '' },
          { text: `blocked ${counts.blocked || 0}`, tone: counts.blocked > 0 ? 'warn' : '' },
          { text: approvalGatedRuleDraftReadiness.contract?.noAutoSave === true ? 'no auto save' : 'auto save 확인 필요', tone: approvalGatedRuleDraftReadiness.contract?.noAutoSave === true ? 'info' : 'warn' },
          { text: approvalGatedRuleDraftReadiness.contract?.noAutoApply === true ? 'no auto apply' : 'auto apply 확인 필요', tone: approvalGatedRuleDraftReadiness.contract?.noAutoApply === true ? 'info' : 'warn' },
          { text: approvalGatedRuleDraftReadiness.contract?.ruleRegistryWritePerformed === false ? 'rule write 없음' : 'rule write 확인 필요', tone: approvalGatedRuleDraftReadiness.contract?.ruleRegistryWritePerformed === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsApprovalGatedRuleDraftReadinessSummary',
          items.length
            ? `approval-required ${counts.readyForApproval || 0} · blocked ${counts.blocked || 0} · staged draft manual save only`
            : 'EventRecord와 review state를 불러오면 approval-gated staged draft readiness가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Approval-gated Rule Draft Readiness가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const validation = item?.validationSummary || {};
          const stagedDraft = item?.stagedDraft || {};
          const issues = Array.isArray(validation.issues) ? validation.issues : [];
          const approvalState = item?.approvalState || 'blocked';
          const validationState = item?.validationState || validation.status || 'not-run';
          const manualDraftRoute = stagedDraft.manualDraftRoute || `/ops/rules?draftEventId=${encodeURIComponent(item?.eventId || '')}&whatIfPreview=1&approvalDraft=1&approvalState=${encodeURIComponent(approvalState)}`;
          return `<article class="approval-gated-rule-draft-readiness-card" data-approval-gated-rule-draft-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${approvalState === 'approval-required' ? 'info' : 'warn'}">approvalState ${escapeHtml(display(approvalState))}</span>
              <span class="chip ${validationState === 'ready-for-approval' ? 'info' : 'warn'}">validationSummary ${escapeHtml(display(validationState))}</span>
              <span class="chip">${item?.manualApprovalRequired === true ? 'manual approval required' : 'approval 확인 필요'}</span>
              <span class="chip">${stagedDraft.noAutoSave === true ? 'noAutoSave true' : 'auto save 확인 필요'}</span>
              <span class="chip">${stagedDraft.noAutoApply === true ? 'noAutoApply true' : 'auto apply 확인 필요'}</span>
              <span class="chip">${stagedDraft.ruleRegistryWritePerformed === false ? 'ruleRegistryWritePerformed false' : 'rule write 확인 필요'}</span>
            </div>
            <div class="approval-gated-rule-draft-grid">
              <p><strong>validationSummary</strong><span>${escapeHtml(issues.length ? issues.map(display).join(', ') : 'ready-for-manual-approval')}</span></p>
              <p><strong>stagedDraft</strong><span>${escapeHtml(display(stagedDraft.eventType || '-'))} · ${escapeHtml(Array.isArray(stagedDraft.classes) ? stagedDraft.classes.map(display).join(', ') : 'classes 확인 필요')} · confidence ${escapeHtml(display(stagedDraft.minConfidence ?? '-'))}</span></p>
              <p><strong>full replay</strong><span>${validation.fullReplayEngineExecuted === false ? 'not-run · manual evidence required before apply' : 'replay 확인 필요'}</span></p>
            </div>
            <div class="operational-action-pack-actions">
              <a class="button button-secondary button-compact" data-approval-gated-rule-draft-route="manual-approval-staged-only" href="${escapeHtml(manualDraftRoute)}">/ops/rules approval draft 검토</a>
            </div>
          </article>`;
        }).join('');
      }
      function renderOperatorOutcomeMemory(operatorOutcomeMemory = {}) {
        const root = document.getElementById('opsOperatorOutcomeMemoryRows');
        if (!root) return;
        const items = Array.isArray(operatorOutcomeMemory.items) ? operatorOutcomeMemory.items : [];
        const counts = operatorOutcomeMemory.aggregateOutcomeCounts || {};
        renderBadges('opsOperatorOutcomeMemoryBadges', [
          { text: operatorOutcomeMemory.schema || 'media-server.ops.operator-outcome-memory.v1' },
          { text: `accepted ${counts.acceptedCount ?? 0}` },
          { text: `dismissed ${counts.dismissedCount ?? 0}` },
          { text: `review-needed ${counts.reviewNeededCount ?? 0}` },
          { text: operatorOutcomeMemory.contract?.operatorOutcomeMemoryPersistentWrite === false ? 'read-only' : 'write 확인 필요', tone: operatorOutcomeMemory.contract?.operatorOutcomeMemoryPersistentWrite === false ? 'info' : 'warn' },
          { text: operatorOutcomeMemory.contract?.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: operatorOutcomeMemory.contract?.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsOperatorOutcomeMemorySummary',
          items.length
            ? `accept/dismiss/review-needed outcome · review state/audit action 기반 deterministic history hint · ${items.length}개`
            : 'EventRecord와 review state를 불러오면 operator outcome history hint가 표시됩니다.'
        );
        if (items.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 Operator Outcome Memory가 없습니다.</p>';
          return;
        }
        root.innerHTML = items.map(item => {
          const hint = item?.deterministicHistoryHint || {};
          const basis = item?.reviewStateBasis || {};
          const audit = item?.auditActionRefs || {};
          const itemCounts = item?.outcomeCounts || {};
          return `<article class="operator-outcome-memory-card" data-operator-outcome-memory-event="${escapeHtml(item?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(item?.eventId || 'event'))}</strong>
              <span>${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.ruleId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))}</span>
            </div>
            <div class="badge-row">
              <span class="chip ${item?.currentOutcome === 'dismiss' ? 'warn' : 'info'}">${escapeHtml(display(item?.currentOutcome || 'not-reviewed'))}</span>
              <span class="chip">accepted ${escapeHtml(display(itemCounts.acceptedCount ?? 0))}</span>
              <span class="chip">dismissed ${escapeHtml(display(itemCounts.dismissedCount ?? 0))}</span>
              <span class="chip">review-needed ${escapeHtml(display(itemCounts.reviewNeededCount ?? 0))}</span>
            </div>
            <div class="operator-outcome-memory-hint">
              <p><strong>deterministicHistoryHint</strong><span>${escapeHtml(display(hint.deterministicHistoryHint || '-'))}</span></p>
              <p><strong>reviewStateBasis</strong><span>${escapeHtml(display(basis.reviewStatus || '-'))} · ${escapeHtml(display(basis.incidentStatus || '-'))} · ${escapeHtml(display(basis.classification || '-'))} · ${escapeHtml(display(basis.vlmAction || '-'))}</span></p>
              <p><strong>auditActionRefs</strong><span>${escapeHtml(display(audit.eventReviewUpdate || 'event-review-update'))} · ${escapeHtml(display(audit.incidentActionUpdate || 'incident-action-update'))}</span></p>
            </div>
          </article>`;
        }).join('');
      }
      function renderSimilarIncidentLookup(similarIncidents = {}) {
        const root = document.getElementById('opsSimilarIncidentRows');
        if (!root) return;
        const groups = Array.isArray(similarIncidents.groups) ? similarIncidents.groups : [];
        renderBadges('opsSimilarIncidentBadges', [
          { text: `groups ${similarIncidents.groupCount ?? groups.length}` },
          { text: `candidates ${similarIncidents.candidateCount ?? 0}` },
          { text: similarIncidents.deterministicScoring === true ? 'deterministic' : 'score 확인 필요', tone: similarIncidents.deterministicScoring === true ? 'info' : 'warn' },
          { text: similarIncidents.modelProviderDependency === false ? 'no provider' : 'provider 확인 필요', tone: similarIncidents.modelProviderDependency === false ? 'info' : 'warn' },
          { text: similarIncidents.eventPostPayloadChanged === false ? 'Event POST 변경 없음' : 'payload 확인 필요', tone: similarIncidents.eventPostPayloadChanged === false ? 'info' : 'warn' },
          { text: similarIncidents.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: similarIncidents.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsSimilarIncidentSummary',
          similarIncidents.error
            ? `similar incident lookup 실패: ${similarIncidents.error}`
            : `같은 rule/scenario/source/status 패턴 · ${groups.length} group · local deterministic scoring`
        );
        if (groups.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 similar incident lookup 결과가 없습니다.</p>';
          return;
        }
        root.innerHTML = groups.map(group => {
          const related = Array.isArray(group?.related) ? group.related : [];
          return `<article class="similar-incident-group" data-similar-incident-group="${escapeHtml(group?.baseEventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(group?.baseEventId || 'base event'))}</strong>
              <span>${escapeHtml(display(group?.baseIncidentId || '-'))} · ${escapeHtml(display(group?.baseSourceId || '-'))} · ${escapeHtml(display(group?.baseScenario || '-'))}</span>
            </div>
            <div class="similar-incident-related-list">
              ${related.map(item => {
                const terms = Array.isArray(item?.explanationTerms) ? item.explanationTerms : [];
                return `<div class="similar-incident-related" data-similar-incident-related="${escapeHtml(item?.eventId || '')}">
                  <div class="table-cell-main">
                    <strong>${escapeHtml(display(item?.eventId || 'related event'))}</strong>
                    <span>${escapeHtml(display(item?.incidentId || '-'))} · ${escapeHtml(display(item?.sourceId || '-'))} · ${escapeHtml(display(item?.scenario || '-'))} · ${escapeHtml(display(item?.incidentStatus || '-'))}</span>
                  </div>
                  <span class="similar-incident-score">${escapeHtml(display(item?.score ?? 0))}</span>
                  <div class="badge-row">${terms.map(term => `<span class="chip info">${escapeHtml(term)}</span>`).join('')}</div>
                </div>`;
              }).join('')}
            </div>
          </article>`;
        }).join('');
      }
      function incidentTimelineStageLabel(stage) {
        const normalized = String(stage || '').trim();
        if (normalized === 'source-state') return 'Source';
        if (normalized === 'event-record') return 'Event';
        if (normalized === 'operator-action') return 'Action';
        if (normalized === 'alert-dry-run') return 'Alert';
        if (normalized === 'close-state') return 'Close';
        return display(normalized || 'stage');
      }
      function renderIncidentTimelineGraph(timelineGraph = {}) {
        const root = document.getElementById('opsIncidentTimelineGraphRows');
        if (!root) return;
        const nodes = Array.isArray(timelineGraph.nodes) ? timelineGraph.nodes : [];
        const edges = Array.isArray(timelineGraph.edges) ? timelineGraph.edges : [];
        const auditLinkage = timelineGraph.auditLinkage || {};
        renderBadges('opsIncidentTimelineGraphBadges', [
          { text: `graphs ${timelineGraph.graphCount ?? 0}` },
          { text: `nodes ${nodes.length}` },
          { text: `edges ${edges.length}` },
          { text: timelineGraph.eventPostPayloadChanged === false ? 'Event POST 변경 없음' : 'payload 확인 필요', tone: timelineGraph.eventPostPayloadChanged === false ? 'info' : 'warn' },
          { text: timelineGraph.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: timelineGraph.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentTimelineGraphSummary',
          timelineGraph.error
            ? `timeline graph 조회 실패: ${timelineGraph.error}`
            : `source state → event → operator action → alert dry-run → close · audit ${display(auditLinkage.incidentAction || 'incident-action-update')}`
        );
        if (nodes.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 incident timeline graph가 없습니다.</p>';
          return;
        }
        const edgeByFrom = new Map(edges.map(edge => [String(edge?.from || ''), edge]));
        root.innerHTML = nodes.map((node, index) => {
          const edge = edgeByFrom.get(String(node?.id || ''));
          const edgeHtml = edge
            ? `<div class="incident-timeline-edge" data-incident-timeline-edge="${escapeHtml(edge.from || '')}:${escapeHtml(edge.to || '')}">${escapeHtml(display(edge.label || 'linked'))}</div>`
            : '';
          return `<div class="incident-timeline-graph-item">
            <article class="incident-timeline-node" data-incident-timeline-node="${escapeHtml(node?.id || '')}" data-stage="${escapeHtml(node?.stage || '')}">
              <span>${escapeHtml(incidentTimelineStageLabel(node?.stage))}</span>
              <strong>${escapeHtml(display(node?.title || node?.id || `node ${index + 1}`))}</strong>
              <p>${escapeHtml(display(node?.detail || node?.status || 'linked'))}</p>
            </article>
            ${edgeHtml}
          </div>`;
        }).join('');
      }
      function incidentBriefSlotLabel(slot = {}) {
        const key = String(slot.key || '').trim();
        if (key === 'action') return 'Action';
        if (key === 'object') return 'Object';
        if (key === 'context') return 'Context';
        if (key === 'environment') return 'Environment';
        return display(slot.label || key || 'Slot');
      }
      function renderExplainableIncidentBrief(incidentBrief = {}) {
        const root = document.getElementById('opsIncidentBriefRows');
        if (!root) return;
        const briefs = Array.isArray(incidentBrief.briefs) ? incidentBrief.briefs : [];
        renderBadges('opsIncidentBriefBadges', [
          { text: `briefs ${briefs.length}` },
          { text: incidentBrief.defaultVlmEnrichmentEnabled === false ? 'VLM default-off' : 'VLM 확인 필요', tone: incidentBrief.defaultVlmEnrichmentEnabled === false ? 'info' : 'warn' },
          { text: incidentBrief.modelProviderDependency === false ? 'no provider' : 'provider 확인 필요', tone: incidentBrief.modelProviderDependency === false ? 'info' : 'warn' },
          { text: incidentBrief.eventPostPayloadChanged === false ? 'Event POST 변경 없음' : 'payload 확인 필요', tone: incidentBrief.eventPostPayloadChanged === false ? 'info' : 'warn' },
          { text: incidentBrief.viewerClientExposureAdded === false ? 'Ops only' : '노출 확인 필요', tone: incidentBrief.viewerClientExposureAdded === false ? 'info' : 'warn' }
        ]);
        setText(
          'opsIncidentBriefSummary',
          incidentBrief.error
            ? `incident brief 조회 실패: ${incidentBrief.error}`
            : `action/object/context/environment slots · VLM enrichment ${incidentBrief.defaultVlmEnrichmentEnabled === false ? 'default-off' : '확인 필요'}`
        );
        if (briefs.length === 0) {
          root.innerHTML = '<p class="ops-rule-note">표시할 explainable incident brief가 없습니다.</p>';
          return;
        }
        const slotKeys = ['actionSlot', 'objectSlot', 'contextSlot', 'environmentSlot'];
        root.innerHTML = briefs.map(brief => {
          const slots = slotKeys.map(key => brief?.[key]).filter(Boolean);
          return `<article class="incident-brief-card" data-incident-brief-card="${escapeHtml(brief?.eventId || '')}">
            <div class="table-cell-main">
              <strong>${escapeHtml(display(brief?.title || brief?.incidentId || 'incident brief'))}</strong>
              <span>${escapeHtml(display(brief?.incidentId || '-'))} · review ${escapeHtml(display(brief?.reviewStatus || '-'))} · incident ${escapeHtml(display(brief?.incidentStatus || '-'))}</span>
            </div>
            <div class="incident-brief-slot-grid">
              ${slots.map(slot => `<div class="incident-brief-slot" data-incident-brief-slot="${escapeHtml(slot?.key || '')}">
                <span>${escapeHtml(incidentBriefSlotLabel(slot))}</span>
                <strong>${escapeHtml(display(slot?.value || '-'))}</strong>
                <p>${escapeHtml(display(slot?.evidence || 'local evidence'))}</p>
              </div>`).join('')}
            </div>
          </article>`;
        }).join('');
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
              <div class="table-cell-note">${escapeHtml(display(attempt?.status || '미제공'))}${attempt?.transport ? ` · ${escapeHtml(display(attempt.transport))}` : ''}${attempt?.dryRun ? ' · dry-run' : ''}${attempt?.externalDeliveryPerformed === false ? ' · 외부 전송 없음' : ''}</div>
              ${opsRowActionsHtml(`
                <button class="button-secondary" type="button" data-alert-delivery-dry-run="${escapeHtml(item?.id || '')}">Dry-run</button>
                <button class="button-secondary" type="button" data-alert-delivery-test="${escapeHtml(item?.id || '')}">Fixture</button>
              `, 'table-actions')}`, 'actions')}
          </tr>`;
        }).join('');
        bindAlertDeliveryRowActions();
      }
      function renderAlertDeliveryDryRun(payload = {}) {
        const previews = Array.isArray(payload.payloadPreviews) ? payload.payloadPreviews : [];
        const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
        const first = previews[0] || {};
        const firstEvent = first.event || {};
        const previewLines = previews.length
          ? [
              `schema ${display(first.schema)}`,
              `target ${display(first.deliveryId)} · ${display(first.kind)} · ${display(first.endpointMasked)}`,
              `event ${display(firstEvent.eventId)} · ${display(firstEvent.eventType)} · ${display(firstEvent.sourceId)}`,
              `payload redacted ${first.payloadRedacted === true ? 'yes' : 'check'} · Event POST 변경 없음`
            ]
          : ['payload preview 미생성'];
        const resultLines = [
          `dry-run ${payload?.dryRun === true ? 'true' : 'false'} · attempts ${attempts.length}`,
          `external delivery ${payload?.externalDeliveryPerformed === false ? 'not performed' : 'check'}`,
          `attempt log ${payload?.contract?.deliveryAttemptLog ? 'recorded' : 'check'} · audit ${display(payload?.audit?.action)}`
        ];
        setText('alertDeliveryPayloadPreview', previewLines.join(' | '));
        setText('alertDeliveryDryRunResult', resultLines.join(' | '));
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
          { text: payload?.contract?.dryRunOnly ? 'dry-run only' : 'dry-run 확인 필요', tone: payload?.contract?.dryRunOnly ? 'info' : 'warn' },
          { text: payload?.contract?.auditMasking ? 'audit masking' : 'audit 확인 필요', tone: payload?.contract?.auditMasking ? 'info' : 'warn' }
        ]);
        setText(
          'alertDeliverySummary',
          payload.error
            ? `alert delivery 조회 실패: ${payload.error}`
            : `transports webhook/email/slack · list/filter ${filteredCount}/${integrations.length} · bounded retry · dry-run preview · attempt log · Event POST payload 변경 없음`
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
      async function dryRunAlertDeliveryIntegration(id = '') {
        const body = id ? { deliveryId: id } : alertDeliveryBodyFromForm();
        const payload = await requestJson('/ops/api/alerts/deliveries/dry-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        renderAlertDeliveryDryRun(payload);
        showToast?.('Alert delivery dry-run 완료');
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
        document.querySelectorAll('[data-alert-delivery-dry-run]').forEach(button => {
          if (button.dataset.boundAlertDeliveryDryRun === '1') return;
          button.dataset.boundAlertDeliveryDryRun = '1';
          button.addEventListener('click', async () => {
            try {
              await dryRunAlertDeliveryIntegration(button.dataset.alertDeliveryDryRun || '');
              await refreshEvents();
            } catch (error) {
              setText('alertDeliverySummary', `dry-run 실패: ${error.message}`);
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
        const reviewParams = v300EventEvidenceSearchQueryParams(incidentMemoryQueryParams(eventReviewQueryParams(eventParams)));
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
            : `review ${reviewItems.length}개 · incident/action workflow · VLM review panel ${reviewItems.filter(item => item?.vlmReview).length}개 · Event POST payload 변경 없음 · audit action event-review-update/incident-action-update`
        );
        renderEventReviewRows(reviewItems);
        renderIncidentTriageBoard(reviewPayload.incidentTriageBoard || {});
        renderIncidentDecisionScorecard(reviewPayload.incidentDecisionScorecard || {});
        renderOperationalActionPack(reviewPayload.operationalActionPack || {});
        renderIncidentActionReadinessQueue(reviewPayload.incidentActionReadinessQueue || {});
        renderEvidenceIntakeFieldReadiness(reviewPayload.evidenceIntakeFieldReadiness || {});
        renderRuntimeEvidenceWindow(reviewPayload.runtimeEvidenceWindow || {});
        renderRuleWhatIfPreview(reviewPayload.ruleWhatIfPreview || {});
        renderApprovalGatedRuleDraftReadiness(reviewPayload.approvalGatedRuleDraftReadiness || {});
        renderOperatorOutcomeMemory(reviewPayload.operatorOutcomeMemory || {});
        renderV300EventEvidenceSearchUi(reviewPayload.eventEvidenceSearch || {});
        renderV310ReplayTimelineUi(reviewPayload.replayTimeline || {});
        renderIncidentMemorySearch(reviewPayload.memorySearch || {});
        renderVlmSummaryCandidateReview(reviewPayload.memorySearch?.vlmSummaryCandidateReview || {});
        renderSimilarIncidentLookup(reviewPayload.similarIncidents || {});
        renderIncidentTimelineGraph(reviewPayload.timelineGraph || {});
        renderExplainableIncidentBrief(reviewPayload.incidentBrief || {});
        const prevButton = document.getElementById('eventRecordsPrev');
        const nextButton = document.getElementById('eventRecordsNext');
        if (prevButton) prevButton.disabled = opsEventRecordsOffset <= 0;
        if (nextButton) nextButton.disabled = !records.hasMore;
        if (records.nextOffset != null) nextButton?.setAttribute('data-next-offset', String(records.nextOffset));
        renderRaw('opsEventsRaw', 'opsEventsPretty', { storage, post, alertDelivery: alertPayload, records, reviews: reviewPayload, incidentTriageBoard: reviewPayload.incidentTriageBoard || {}, incidentDecisionScorecard: reviewPayload.incidentDecisionScorecard || {}, operationalActionPack: reviewPayload.operationalActionPack || {}, incidentActionReadinessQueue: reviewPayload.incidentActionReadinessQueue || {}, evidenceIntakeFieldReadiness: reviewPayload.evidenceIntakeFieldReadiness || {}, runtimeEvidenceWindow: reviewPayload.runtimeEvidenceWindow || {}, ruleWhatIfPreview: reviewPayload.ruleWhatIfPreview || {}, approvalGatedRuleDraftReadiness: reviewPayload.approvalGatedRuleDraftReadiness || {}, operatorOutcomeMemory: reviewPayload.operatorOutcomeMemory || {}, eventEvidenceSearch: reviewPayload.eventEvidenceSearch || {}, replayTimeline: reviewPayload.replayTimeline || {}, memorySearch: reviewPayload.memorySearch || {}, vlmSummaryCandidateReview: reviewPayload.memorySearch?.vlmSummaryCandidateReview || {}, similarIncidents: reviewPayload.similarIncidents || {}, timelineGraph: reviewPayload.timelineGraph || {}, incidentBrief: reviewPayload.incidentBrief || {} });
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
      let opsVlmRuleDraftPayload = null;
      function opsRuleWhatIfDraftContextFromLocation() {
        const params = new URLSearchParams(window.location.search || '');
        const draftEventId = String(params.get('draftEventId') || '').trim();
        const whatIfPreview = params.get('whatIfPreview') === '1';
        const approvalDraft = params.get('approvalDraft') === '1';
        const approvalState = String(params.get('approvalState') || 'approval-required').trim();
        return { draftEventId, whatIfPreview, approvalDraft, approvalState, enabled: Boolean(draftEventId && whatIfPreview) };
      }
      function renderOpsRuleWhatIfDraftContext() {
        const target = document.getElementById('opsRuleWhatIfDraftContext');
        if (!target) return;
        const context = opsRuleWhatIfDraftContextFromLocation();
        if (!context.enabled) {
          target.textContent = 'draftEventId와 whatIfPreview=1 query가 있으면 selected incident preview context를 표시합니다. 저장은 운영자가 수동으로 실행해야 합니다.';
          return;
        }
        target.innerHTML = `selected incident <strong>${escapeHtml(context.draftEventId)}</strong>의 Rule What-if Preview context입니다. 조건과 geometry는 아래 draft form에서 운영자가 확인하고, 저장은 운영자가 수동으로 실행해야 합니다.`;
      }
      function renderOpsApprovalGatedRuleDraftContext() {
        const target = document.getElementById('opsApprovalGatedRuleDraftContext');
        const rows = document.getElementById('opsApprovalGatedRuleDraftRows');
        if (!target || !rows) return;
        const context = opsRuleWhatIfDraftContextFromLocation();
        renderBadges('opsApprovalGatedRuleDraftBadges', [
          { text: 'media-server.ops.approval-gated-rule-draft-readiness.v1' },
          { text: context.approvalDraft ? 'approvalDraft=1' : 'approvalDraft 대기', tone: context.approvalDraft ? 'info' : 'warn' },
          { text: `approvalState ${context.approvalState || 'approval-required'}` },
          { text: 'no-auto-save', tone: 'info' },
          { text: 'no-auto-apply', tone: 'info' },
          { text: 'rule write 없음', tone: 'info' }
        ]);
        if (!context.enabled || !context.approvalDraft) {
          target.textContent = 'approvalDraft=1 query가 있으면 저장 전 approval state, validation summary, staged draft context를 표시합니다.';
          rows.innerHTML = '<p class="ops-rule-note">저장은 기존 `/ops/rules` 수동 저장 버튼에서만 수행됩니다.</p>';
          return;
        }
        target.innerHTML = `selected incident <strong>${escapeHtml(context.draftEventId)}</strong>의 approval-gated staged draft context입니다. approval state와 validation summary를 확인한 뒤 운영자가 수동 저장해야 합니다.`;
        rows.innerHTML = `<article class="ops-approval-gated-rule-draft-card" data-approval-state="${escapeHtml(context.approvalState || 'approval-required')}">
          <div class="table-cell-main">
            <strong>${escapeHtml(context.draftEventId)}</strong>
            <span>approvalState ${escapeHtml(context.approvalState || 'approval-required')} · staged draft · validation summary required</span>
          </div>
          <div class="badge-row">
            <span class="chip info">manual approval required</span>
            <span class="chip info">noAutoSave true</span>
            <span class="chip info">noAutoApply true</span>
            <span class="chip info">ruleRegistryWritePerformed false</span>
            <span class="chip info">fullReplayEngineExecuted false</span>
          </div>
          <p class="ops-rule-note">이 context는 draft form을 자동 저장하거나 rule/profile registry를 쓰지 않습니다. 운영자는 아래 form에서 조건, geometry, conflict를 확인하고 기존 저장 버튼을 직접 실행해야 합니다.</p>
        </article>`;
      }
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
          opsRulesUpdateReviewLoop();
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
        opsRulesUpdateReviewLoop();
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
        if (normalizedType === 're-entry') {
          return '지정 영역 기준은 source zone 이탈 후 reEntryZoneIds destination 진입을 보는 A→B 후보입니다. Event/metadata schema는 그대로 유지합니다.';
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
      function opsRulesReviewIssueText(messages = [], emptyText = '확인된 항목 없음') {
        const clean = messages.map(item => String(item || '').trim()).filter(Boolean);
        if (clean.length === 0) return emptyText;
        const head = clean.slice(0, 3).join(' / ');
        return clean.length > 3 ? `${head} 외 ${clean.length - 3}개` : head;
      }
      function opsRulesReviewSetCard(key, chipId, titleId, detailId, chipText, title, detail, tone = '') {
        const item = document.querySelector(`[data-rule-review-item="${key}"]`);
        const chip = document.getElementById(chipId);
        if (item) {
          item.classList.toggle('warn', tone === 'warn');
          item.classList.toggle('bad', tone === 'bad');
          item.classList.toggle('info', tone === 'info');
        }
        if (chip) {
          chip.textContent = chipText;
          chip.classList.toggle('warn', tone === 'warn');
          chip.classList.toggle('bad', tone === 'bad');
          chip.classList.toggle('info', tone === 'info');
        }
        setText(titleId, title);
        setText(detailId, detail);
      }
      function opsRulesReviewEventType(payload = {}, template = null) {
        return String(template?.scenario?.type || template?.event?.type || payload?.scenario?.type || payload?.event?.type || payload?.eventType || '').trim();
      }
      function opsRulesReviewCoverageHref(eventType = '') {
        const params = new URLSearchParams();
        const normalized = String(eventType || '').trim();
        if (normalized) params.set('eventType', normalized);
        params.set('from', 'ops-rules-review');
        const hash = params.toString();
        return hash ? `/ops/events#${hash}` : '/ops/events';
      }
      function opsRulesReviewPresetImpact(mode, payload = {}, template = null) {
        const source = mode === 'va-rule' ? (template || payload) : payload;
        const eventType = opsRulesReviewEventType(source);
        const scenario = source?.scenario || null;
        const presetId = String(scenario?.presetId || document.getElementById('opsEventRulePresetSelect')?.value || 'default').trim();
        if (scenario || opsRulesIsScenarioType(eventType) || eventType === 'line-crossing') {
          const label = opsScenarioPresetLabels[presetId] || presetId || '기본';
          const baseline = opsRulesScenarioBaseline(eventType, presetId);
          const baselineText = opsRulesPresetBaselineSummary(eventType, baseline) || '기본 시작값';
          return `${label} preset · ${baselineText}`;
        }
        return 'basic event 템플릿은 scenario preset 숫자 조건을 적용하지 않습니다.';
      }
      function opsRulesReviewMissingReferences(mode, payload = {}, channel = null) {
        const messages = [];
        if (mode === 'va-rule') {
          const profileId = String(payload?.analysis?.profileId || '').trim();
          const templateId = String(payload?.templateStart?.ruleId || '').trim();
          const profile = profileId ? findOpsProfileById(profileId) : null;
          const template = templateId ? findOpsEventTemplateById(templateId) : null;
          if (!channel) messages.push('채널 reference 없음');
          else if (!channel.view) messages.push('PublishedView reference 없음');
          if (!profileId || !profile) messages.push(`분석 프로파일 ${profileId || '(비어 있음)'} reference 없음`);
          if (!templateId || !template) messages.push(`이벤트 템플릿 ${templateId || '(비어 있음)'} reference 없음`);
          if (profile && opsRulesDocumentInactive(profile)) messages.push(`분석 프로파일 ${profileId} 비활성`);
          if (template && opsRulesDocumentInactive(template)) messages.push(`이벤트 템플릿 ${templateId} 비활성`);
        }
        return messages;
      }
      function opsRulesReviewConflictMessages(allIssues = [], missingIssues = []) {
        const missingSet = new Set(missingIssues);
        return allIssues.filter(item => !missingSet.has(item));
      }
      function opsRulesBuildDraftReview(mode) {
        const current = opsRulesCurrentRecord?.item || {};
        if (mode === 'va-rule') {
          const forcedId = String(document.getElementById('opsVaRuleIdInput')?.value || '').trim() || opsRulesNextNumericId(opsCatalogVaRules, 1);
          const { payload, channel } = opsRulesReadVaRuleForm(current, forcedId);
          const templateId = String(payload?.templateStart?.ruleId || '').trim();
          const template = templateId ? findOpsEventTemplateById(templateId) : null;
          const eventType = opsRulesReviewEventType(payload, template);
          const allIssues = opsRulesDraftBlockingIssues(mode, payload, current, channel);
          const missingIssues = opsRulesReviewMissingReferences(mode, payload, channel);
          return { mode, payload, channel, template, eventType, allIssues, missingIssues };
        }
        if (mode === 'event-rule') {
          const forcedId = String(document.getElementById('opsEventRuleIdInput')?.value || '').trim() || opsRulesNextNumericId(opsCatalogEventTemplates, 1);
          const payload = opsRulesReadEventTemplateForm(current, forcedId);
          const allIssues = opsRulesDraftBlockingIssues(mode, payload, current);
          try {
            opsRulesValidateEventTemplatePayload(payload);
          } catch (error) {
            allIssues.push(error.message || '이벤트 템플릿 값 검증 실패');
          }
          return { mode, payload, template: payload, eventType: opsRulesReviewEventType(payload), allIssues, missingIssues: [] };
        }
        if (mode === 'profile') {
          const payload = opsRulesReadProfileForm(current);
          const allIssues = opsRulesDraftBlockingIssues(mode, payload, current);
          return { mode, payload, template: null, eventType: '', allIssues, missingIssues: [] };
        }
        return null;
      }
      function opsRulesUpdateReviewLoop() {
        const panel = document.getElementById('opsRulesReviewLoop');
        if (!panel) return;
        const mode = opsRulesCurrentRecord?.mode || '';
        if (!opsRulesModeConfig(mode) || opsRulesDetailMode === 'closed') {
          panel.hidden = true;
          return;
        }
        panel.hidden = false;
        let review = null;
        try {
          review = opsRulesBuildDraftReview(mode);
        } catch (error) {
          opsRulesReviewSetCard('event-type', 'opsRulesReviewEventTypeChip', 'opsRulesReviewEventTypeTitle', 'opsRulesReviewEventTypeDetail', 'draft', 'Draft 계산 실패', error.message || '폼 값을 읽지 못했습니다.', 'bad');
          opsRulesReviewSetCard('conflict', 'opsRulesReviewConflictChip', 'opsRulesReviewConflictTitle', 'opsRulesReviewConflictDetail', 'error', '검토 필요', '저장 전 검토 루프가 draft를 계산하지 못했습니다.', 'bad');
          return;
        }
        if (!review) return;
        const eventType = review.eventType;
        const eventLabel = eventType ? opsRuleEventTypeLabel(eventType) : (mode === 'profile' ? '프로파일' : '미정');
        const modeLabel = mode === 'va-rule' ? '채널 분석 설정' : (mode === 'event-rule' ? '이벤트 템플릿' : '분석 프로파일');
        const conflictIssues = opsRulesReviewConflictMessages(review.allIssues, review.missingIssues);
        const coverageHref = opsRulesReviewCoverageHref(eventType);
        const coverageLink = document.getElementById('opsRulesReviewEventRecordLink');
        if (coverageLink) {
          coverageLink.href = coverageHref;
          coverageLink.dataset.eventRecordCoverageLink = coverageHref;
          coverageLink.textContent = eventType ? `${opsRuleEventTypeLabel(eventType)} EventRecord` : 'EventRecord 열기';
        }
        setText('opsRulesReviewSummary', `${modeLabel} draft를 저장하기 전 event type, reference, conflict, preset 영향, EventRecord coverage를 확인합니다.`);
        opsRulesReviewSetCard(
          'event-type',
          'opsRulesReviewEventTypeChip',
          'opsRulesReviewEventTypeTitle',
          'opsRulesReviewEventTypeDetail',
          eventType || 'profile',
          eventLabel,
          eventType ? `저장 후 EventRecord eventType 후보는 ${eventType}입니다.` : '프로파일은 직접 EventRecord type을 만들지 않고 연결된 룰의 분석 대상에 영향을 줍니다.',
          'info'
        );
        opsRulesReviewSetCard(
          'conflict',
          'opsRulesReviewConflictChip',
          'opsRulesReviewConflictTitle',
          'opsRulesReviewConflictDetail',
          conflictIssues.length ? `${conflictIssues.length}개` : '0개',
          conflictIssues.length ? '충돌 확인 필요' : '충돌 없음',
          opsRulesReviewIssueText(conflictIssues, '중복 ID, priority, source/class 충돌이 없습니다.'),
          conflictIssues.length ? 'bad' : 'info'
        );
        opsRulesReviewSetCard(
          'missing-reference',
          'opsRulesReviewMissingChip',
          'opsRulesReviewMissingTitle',
          'opsRulesReviewMissingDetail',
          review.missingIssues.length ? `${review.missingIssues.length}개` : '0개',
          review.missingIssues.length ? '참조 확인 필요' : '참조 준비됨',
          opsRulesReviewIssueText(review.missingIssues, mode === 'va-rule' ? '채널, PublishedView, 템플릿, 프로파일 참조가 준비됐습니다.' : '이 draft는 별도 참조 누락이 없습니다.'),
          review.missingIssues.length ? 'bad' : 'info'
        );
        opsRulesReviewSetCard(
          'preset-impact',
          'opsRulesReviewPresetChip',
          'opsRulesReviewPresetTitle',
          'opsRulesReviewPresetDetail',
          eventType && (review.payload?.scenario || review.template?.scenario || eventType === 'line-crossing') ? '적용' : '비대상',
          'Preset 영향',
          opsRulesReviewPresetImpact(mode, review.payload, review.template),
          'info'
        );
        opsRulesReviewSetCard(
          'event-record-coverage',
          'opsRulesReviewCoverageChip',
          'opsRulesReviewCoverageTitle',
          'opsRulesReviewCoverageDetail',
          eventType ? '연결' : '간접',
          eventType ? `${eventLabel} coverage` : '간접 coverage',
          eventType
            ? `${coverageHref}에서 status/evidence를 확인하고 verify-va-event-coverage-report matrix와 연결합니다.`
            : '프로파일은 채널 분석 설정을 통해 EventRecord 대상 class와 quality에 간접 반영됩니다.',
          'info'
        );
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
      function opsVlmRuleDraftCandidates(payload = opsVlmRuleDraftPayload) {
        const report = payload?.sourceCandidateReport || payload || {};
        return Array.isArray(report.candidates) ? report.candidates : [];
      }
      function opsVlmRuleDraftType(candidate = {}) {
        const suggestion = candidate?.ruleSuggestion || {};
        const draft = suggestion?.draftRule || {};
        return String(draft.eventType || draft.type || candidate?.proposedRuleKind || suggestion?.kind || '').trim();
      }
      function opsVlmRuleDraftClasses(draft = {}) {
        const classes = Array.isArray(draft.classes)
          ? draft.classes
          : (Array.isArray(draft.targetClasses) ? draft.targetClasses : []);
        const normalized = opsRulesNormalizeCategories(classes);
        return normalized.length > 0 ? normalized : ['person'];
      }
      function renderOpsVlmRuleDrafts(payload = opsVlmRuleDraftPayload) {
        const list = document.getElementById('opsVlmRuleDraftList');
        const summary = document.getElementById('opsVlmRuleDraftSummary');
        if (!list) return;
        if (payload?.error) {
          list.innerHTML = `<div class="empty">${escapeHtml(payload.error)}</div>`;
          if (summary) summary.textContent = 'VLM rule draft 후보를 불러오지 못했습니다.';
          return;
        }
        const report = payload?.sourceCandidateReport || {};
        const candidates = opsVlmRuleDraftCandidates(payload);
        if (summary) {
          const matched = Number(report.matchedCandidates ?? candidates.length);
          const excluded = Number(report.excludedAutoApplySuggestions ?? 0);
          summary.textContent = `수동 저장 후보 ${candidates.length}/${matched}개 · 자동 적용 제외 ${excluded}개 · 저장 전 registry write 없음`;
        }
        if (!candidates.length) {
          list.innerHTML = '<div class="empty">수동 저장 가능한 VLM rule draft 후보가 없습니다.</div>';
          return;
        }
        list.innerHTML = candidates.map((candidate, index) => {
          const type = opsVlmRuleDraftType(candidate);
          const suggestion = candidate?.ruleSuggestion || {};
          const draft = suggestion?.draftRule || {};
          const label = opsRuleEventTypeLabel(type);
          const eventId = candidate?.eventId || '-';
          const summaryText = candidate?.summary || suggestion?.rationale || '후보 요약 없음';
          const classesText = opsRulesCategorySummaryText(opsVlmRuleDraftClasses(draft), '대상 없음');
          const review = suggestion?.manualReviewRequired === true && suggestion?.autoApply === false;
          return `
            <article class="ops-vlm-rule-draft-card" data-vlm-rule-draft-card="${index}">
              <div class="toolbar compact-toolbar">
                <div>
                  <div class="badge-row">
                    <span class="chip info">${escapeHtml(label)}</span>
                    <span class="chip">${escapeHtml(eventId)}</span>
                    <span class="chip">${review ? '수동 저장' : '검토 필요'}</span>
                  </div>
                  <p>${escapeHtml(summaryText)}</p>
                  <p class="form-note">대상 ${escapeHtml(classesText)} · ${escapeHtml(suggestion?.rationale || '운영자가 geometry와 숫자 조건을 확인합니다.')}</p>
                </div>
                <div class="actions">
                  <button type="button" class="button-secondary button-compact" data-vlm-rule-draft-index="${index}" ${review ? '' : 'disabled'}>폼에 적용</button>
                </div>
              </div>
            </article>`;
        }).join('');
      }
      async function refreshOpsVlmRuleDrafts() {
        const kind = String(document.getElementById('opsVlmRuleDraftKindSelect')?.value || '').trim();
        const params = new URLSearchParams();
        params.set('limit', '10');
        if (kind) params.set('suggestionKind', kind);
        const payload = await requestJson(`/ops/api/vlm/rule-suggestion-drafts?${params.toString()}`);
        opsVlmRuleDraftPayload = payload;
        renderOpsVlmRuleDrafts(payload);
        return payload;
      }
      function setOpsVlmRuleDraftInputValue(id, value) {
        const input = document.getElementById(id);
        if (!input || value === undefined || value === null || value === '') return;
        input.value = String(value);
      }
      async function applyOpsVlmRuleSuggestionDraft(index) {
        const candidates = opsVlmRuleDraftCandidates();
        const candidate = candidates[Number(index)];
        if (!candidate) {
          throw new Error('선택한 VLM rule draft 후보를 찾지 못했습니다.');
        }
        const suggestion = candidate?.ruleSuggestion || {};
        const draft = suggestion?.draftRule || {};
        if (suggestion.autoApply !== false || suggestion.manualReviewRequired !== true) {
          throw new Error('수동 검토 후보만 이벤트 템플릿 draft로 가져올 수 있습니다.');
        }
        const type = opsVlmRuleDraftType(candidate);
        if (!opsRulesEventTypes.includes(type)) {
          throw new Error(`지원하지 않는 VLM rule draft 종류입니다: ${type || 'unknown'}`);
        }
        await openOpsRulesEditor('event-rule', 'new');
        const modeSelect = document.getElementById('opsEventRuleModeSelect');
        if (modeSelect) modeSelect.value = opsEventRuleModeForType(type);
        opsEventRuleRefreshTypeOptions(type);
        const typeSelect = document.getElementById('opsEventRuleTypeSelect');
        if (typeSelect) typeSelect.value = type;
        const presetSelect = document.getElementById('opsEventRulePresetSelect');
        if (presetSelect) presetSelect.value = 'custom';
        opsEventRuleUpdateModeUi();
        opsRulesSetSelectedCategories(
          'opsEventRuleClassChecks',
          opsVlmRuleDraftClasses(draft),
          'opsEventRuleClassesSummary',
          '객체를 선택하세요.'
        );
        setOpsVlmRuleDraftInputValue('opsEventRuleConfidenceInput', draft.minConfidence);
        setOpsVlmRuleDraftInputValue('opsEventRuleMinDurationInput', draft.minDurationMs);
        setOpsVlmRuleDraftInputValue('opsEventRuleLineDirectionSelect', draft.direction || draft.lineDirection || draft.allowedDirection);
        setOpsVlmRuleDraftInputValue('opsEventRuleCandidateInput', draft.candidateTimeMs);
        setOpsVlmRuleDraftInputValue('opsEventRuleDwellInput', draft.dwellTimeMs ?? draft.minDurationMs);
        setOpsVlmRuleDraftInputValue('opsEventRuleCooldownInput', draft.cooldownMs);
        setOpsVlmRuleDraftInputValue('opsEventRuleZoneThresholdInput', draft.occupancyThreshold ?? draft.minOccupancy);
        setOpsVlmRuleDraftInputValue('opsEventRuleZoneDwellInput', draft.minDwellTimeMs ?? draft.minDurationMs);
        opsRulesEditorStatus(`VLM 후보 ${candidate.eventId || candidate.candidateId || '-'}를 이벤트 템플릿 draft에 반영했습니다. 저장은 운영자가 수동으로 실행해야 합니다.`, false);
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
          opsRulesUpdateReviewLoop();
          return;
        }
        const template = findOpsEventTemplateById(id);
        if (!template) {
          opsRulesUpdateVaRuleFormSummary();
          opsRulesUpdateReviewLoop();
          return;
        }
        opsVaRuleTemplateId = id;
        opsRulesUpdateVaRuleFormSummary();
        opsRulesRefreshVaGeometryUi(true);
        opsRulesUpdateReviewLoop();
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
        opsRulesUpdateReviewLoop();
      }
      function opsEventRuleApplyPresetToInputs(presetId = '') {
        const type = String(document.getElementById('opsEventRuleTypeSelect')?.value || 'intrusion-dwell');
        const selected = String(presetId || document.getElementById('opsEventRulePresetSelect')?.value || 'default');
        const baseline = opsRulesScenarioBaseline(type, selected);
        opsEventRuleUpdatePresetSummary(type, selected, baseline);
        if (selected === 'custom') {
          opsRulesUpdateReviewLoop();
          return;
        }
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
        opsRulesUpdateReviewLoop();
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
        opsRulesUpdateReviewLoop();
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
            details.push(scenario.reEntryMode === 'configured-zones' ? 'A→B 지정 영역' : '같은 영역');
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
        renderOpsRuleWhatIfDraftContext();
        renderOpsApprovalGatedRuleDraftContext();
        refreshOpsVlmRuleDrafts().catch((error) => renderOpsVlmRuleDrafts({ error: error.message || 'VLM rule draft 후보 로드 실패' }));
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
        document.getElementById('opsVlmRuleDraftKindSelect')?.addEventListener('change', () => refreshOpsVlmRuleDrafts().catch(error => renderOpsVlmRuleDrafts({ error: error.message || 'VLM rule draft 후보 로드 실패' })));
        document.getElementById('opsVlmRuleDraftRefresh')?.addEventListener('click', () => refreshOpsVlmRuleDrafts().catch(error => renderOpsVlmRuleDrafts({ error: error.message || 'VLM rule draft 후보 로드 실패' })));
        document.getElementById('opsVlmRuleDraftList')?.addEventListener('click', (event) => {
          const button = event.target.closest('[data-vlm-rule-draft-index]');
          if (!button) return;
          applyOpsVlmRuleSuggestionDraft(button.dataset.vlmRuleDraftIndex || '0')
            .catch(error => setFeedback(document.getElementById('opsRulesStatus'), error.message, true, { collapseEmpty: true }));
        });
        document.getElementById('opsRulesDetailPanel')?.addEventListener('input', () => opsRulesUpdateReviewLoop());
        document.getElementById('opsRulesDetailPanel')?.addEventListener('change', () => opsRulesUpdateReviewLoop());
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
        document.getElementById('eventReviewIncidentStatusFilter')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('eventReviewSummary', error.message));
        });
        ['opsIncidentSearchInput', 'opsIncidentSearchRuleFilter', 'opsIncidentSearchSourceFilter', 'opsIncidentSearchStartTime', 'opsIncidentSearchEndTime'].forEach(id => {
          document.getElementById(id)?.addEventListener('input', () => {
            opsEventRecordsOffset = 0;
            refreshEvents().catch(error => setText('opsIncidentSearchSummary', error.message));
          });
        });
        document.getElementById('opsIncidentSearchStatusFilter')?.addEventListener('change', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('opsIncidentSearchSummary', error.message));
        });
        document.getElementById('opsV300EventEvidenceSearchInput')?.addEventListener('input', () => {
          opsEventRecordsOffset = 0;
          refreshEvents().catch(error => setText('opsV300EventEvidenceSearchSummary', error.message));
        });
        ['opsV300EventEvidenceRetryFilter', 'opsV300EventEvidencePinnedOnly'].forEach(id => {
          document.getElementById(id)?.addEventListener('change', () => {
            opsEventRecordsOffset = 0;
            refreshEvents().catch(error => setText('opsV300EventEvidenceSearchSummary', error.message));
          });
        });
        ['opsIncidentTriageLaneFilter', 'opsIncidentTriagePriorityFilter', 'opsIncidentTriageSort'].forEach(id => {
          document.getElementById(id)?.addEventListener('change', () => {
            refreshEvents().catch(error => setText('opsIncidentTriageBoardSummary', error.message));
          });
        });
        document.getElementById('eventReviewAuditRefresh')?.addEventListener('click', () => renderOpsAuditTrail('event-review-audit-list', 'events'));
        document.getElementById('alertDeliverySave')?.addEventListener('click', async () => {
          try {
            await saveAlertDeliveryIntegration();
            await refreshEvents();
          } catch (error) {
            setText('alertDeliverySummary', `저장 실패: ${error.message}`);
          }
        });
        document.getElementById('alertDeliveryDryRun')?.addEventListener('click', async () => {
          try {
            await dryRunAlertDeliveryIntegration();
            await refreshEvents();
          } catch (error) {
            setText('alertDeliverySummary', `dry-run 실패: ${error.message}`);
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
        renderOpsAuditTrail('event-review-audit-list', 'events');
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



}  // namespace ingress
