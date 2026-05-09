// 파일 용도: 제품 UI 전역에서 쓰는 테마 초기화와 공통 DOM/API helper JavaScript를 C++ 문자열로 조립한다.
#include "ingress/product_ui_js.h"

#include <sstream>

namespace ingress {

// 주요 동작: 화면 렌더링 전에 저장된 테마 또는 시스템 테마를 document에 적용한다.
std::string ProductThemeBootScript() {
    return R"THEME(  <script>
    (() => {
      const saved = localStorage.getItem('mediaServerTheme');
      const preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved : preferred;
    })();
  </script>
)THEME";
}

// 주요 동작: 폼 직렬화, toast, API 호출, 테이블/감사 이력 helper를 전역 객체로 노출한다.
std::string ProductSharedUiScript() {
    return R"SCRIPT(  <script>
    window.MediaServerUi = window.MediaServerUi || (() => {
      const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch]);
      const display = value => value === null || value === undefined || value === '' ? '미제공' : String(value);
      const numberValue = value => Number.isFinite(Number(value)) ? Number(value) : 0;
      const byId = id => document.getElementById(id);
      const qs = (selector, root = document) => root.querySelector(selector);
      const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
      const on = (target, event, handler, options) => {
        if (target) target.addEventListener(event, handler, options);
        return target;
      };
      const setText = (id, value) => {
        const el = byId(id);
        if (el) el.textContent = display(value);
      };
      const setHidden = (el, hidden) => {
        if (el) el.hidden = Boolean(hidden);
        return el;
      };
      const setRequired = (el, required) => {
        if (el) el.required = Boolean(required);
        return el;
      };
      const setFeedback = (el, message, failed = false, options = {}) => {
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', failed);
        if (options.collapseEmpty) el.hidden = !message;
      };
      const showToast = (message, failed = false) => {
        const text = display(message);
        if (!text || text === '미제공') return;
        let stack = document.querySelector('.toast-stack');
        if (!stack) {
          stack = document.createElement('div');
          stack.className = 'toast-stack';
          stack.setAttribute('aria-live', 'polite');
          stack.setAttribute('aria-atomic', 'false');
          document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        toast.className = `toast${failed ? ' error' : ''}`;
        toast.setAttribute('role', failed ? 'alert' : 'status');
        toast.textContent = text;
        stack.appendChild(toast);
        window.setTimeout(() => {
          toast.classList.add('leaving');
          window.setTimeout(() => {
            toast.remove();
            if (!stack.children.length) stack.remove();
          }, 220);
        }, failed ? 3200 : 1600);
      };
      const formDataObject = form => Object.fromEntries(new FormData(form).entries());
      const splitList = value => String(value ?? '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
      const setTableEmpty = (tbody, colspan, message) => {
        if (!tbody) return;
        tbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = Number(colspan) || 1;
        td.textContent = message;
        tr.appendChild(td);
        tbody.appendChild(tr);
      };
      const tableCellHtml = (label, html, className = '') => {
        const classText = String(className || '').trim();
        const classAttr = classText ? ` class="${escapeHtml(classText)}"` : '';
        return `<td data-label="${escapeHtml(label)}"${classAttr}>${html}</td>`;
      };
      const opsClassNames = (...items) => items
        .flatMap(item => Array.isArray(item) ? item : String(item || '').split(/\s+/))
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(' ');
      const opsRowActionsHtml = (html, className = '') =>
        `<div class="${escapeHtml(opsClassNames('table-actions', 'ops-row-actions', className))}">${html}</div>`;
      const opsTableRowHtml = (cells = [], className = '') => {
        const classText = opsClassNames(className);
        const classAttr = classText ? ` class="${escapeHtml(classText)}"` : '';
        return `<tr${classAttr}>${cells.join('')}</tr>`;
      };
      const appendTableCell = (tr, label, html, className = '') => {
        const td = document.createElement('td');
        td.setAttribute('data-label', label);
        if (className) td.className = String(className);
        td.innerHTML = html;
        tr.appendChild(td);
        return td;
      };
      const setOpsDetailPanelOpen = (panel, open = true, options = {}) => {
        if (!panel) return null;
        panel.classList.add('ops-detail-panel');
        panel.hidden = !open;
        if (open && options.scroll) {
          panel.scrollIntoView({
            behavior: options.behavior || 'smooth',
            block: options.block || 'start'
          });
        }
        return panel;
      };
      const setSelectOptions = (select, items = [], selected = '') => {
        if (!select) return;
        select.textContent = '';
        for (const item of items) {
          const option = document.createElement('option');
          const value = typeof item === 'object' && item !== null ? item.value : item;
          const label = typeof item === 'object' && item !== null ? item.label : item;
          option.value = String(value ?? '');
          option.textContent = display(label);
          select.appendChild(option);
        }
        if (selected !== '') select.value = selected;
      };
      const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(display(text))}</span>`;
      const renderBadges = (id, items = []) => {
        const el = byId(id);
        if (!el) return;
        el.textContent = '';
        const badges = items.length > 0 ? items : [{ text: '상태 없음', tone: 'info' }];
        for (const item of badges) {
          const span = document.createElement('span');
          span.className = `chip${item.tone ? ' ' + item.tone : ''}`;
          span.textContent = display(item.text);
          el.appendChild(span);
        }
      };
      const renderRaw = (preId, checkboxId, payload) => {
        const pre = byId(preId);
        const checkbox = byId(checkboxId);
        if (!pre) return;
        const pretty = !checkbox || checkbox.checked;
        pre.textContent = JSON.stringify(payload, null, pretty ? 2 : 0);
      };
      async function requestJson(url, options = {}) {
        const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
        const text = await response.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
        if (!response.ok) throw new Error(json.error || `${response.status} ${response.statusText}`);
        return json;
      }
      async function applyPrincipalVisibility() {
        const response = await fetch('/auth/whoami', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) return null;
        const who = await response.json();
        const scopes = Array.isArray(who.scopes) ? who.scopes : [];
        const isAdmin = who.role === 'admin';
        const isOperator = who.role === 'operator';
        const hasOps = isAdmin || scopes.includes('*') || scopes.includes('ops:read');
        const hasLab = isAdmin || isOperator || scopes.includes('*') || scopes.includes('lab:read');
        document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = !isAdmin; });
        document.querySelectorAll('[data-ops-scope]').forEach(el => { el.hidden = !hasOps; });
        document.querySelectorAll('[data-lab-scope]').forEach(el => { el.hidden = !hasLab; });
        return who;
      }
      let principalPromise = null;
      async function currentPrincipal() {
        if (!principalPromise) principalPromise = applyPrincipalVisibility().catch(() => null);
        return principalPromise;
      }
      const auditStoreKey = 'mediaServerOpsAuditTrail.v1';
      const auditKeyRedacted = key => /(password|token|hash|secret|capability)/i.test(String(key || ''));
      const compactAuditValue = (value, depth = 0) => {
        if (value === null || value === undefined) return value;
        if (auditKeyRedacted('' + value) && typeof value === 'string' && value.length > 24) return '[redacted]';
        if (typeof value === 'string') return value.length > 180 ? `${value.slice(0, 177)}...` : value;
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (depth >= 3) return '[nested]';
        if (Array.isArray(value)) return value.slice(0, 12).map(item => compactAuditValue(item, depth + 1));
        if (typeof value === 'object') {
          const out = {};
          for (const [key, entry] of Object.entries(value)) {
            out[key] = auditKeyRedacted(key) ? '[redacted]' : compactAuditValue(entry, depth + 1);
          }
          return out;
        }
        return display(value);
      };
      const stableAuditJson = value => JSON.stringify(compactAuditValue(value));
      const summarizeAuditChange = (beforeValue, afterValue) => {
        const before = beforeValue && typeof beforeValue === 'object' && !Array.isArray(beforeValue) ? beforeValue : {};
        const after = afterValue && typeof afterValue === 'object' && !Array.isArray(afterValue) ? afterValue : {};
        const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
        const changed = [];
        for (const key of keys) {
          if (auditKeyRedacted(key)) continue;
          if (stableAuditJson(before[key]) !== stableAuditJson(after[key])) changed.push(key);
        }
        return changed.slice(0, 6).join(', ') || '상태';
      };
      const loadOpsAuditTrail = () => {
        try {
          const parsed = JSON.parse(localStorage.getItem(auditStoreKey) || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      const saveOpsAuditTrail = entries => {
        localStorage.setItem(auditStoreKey, JSON.stringify(entries.slice(0, 80)));
      };
      async function persistOpsAuditTrail(entry) {
        const payload = await requestJson('/ops/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        return payload.entry || entry;
      }
      const opsAuditViewStates = new Map();
      const auditFilterEntry = (entry, state = {}) => {
        if (state.actor && !String(entry.actor || '').includes(state.actor)) return false;
        if (state.user) {
          const userNeedle = String(state.user).toLowerCase();
          const userHaystack = `${entry.actor || ''} ${entry.target || ''}`.toLowerCase();
          if (!userHaystack.includes(userNeedle)) return false;
        }
        if (state.target && !String(entry.target || '').toLowerCase().includes(String(state.target).toLowerCase())) return false;
        if (state.action && String(entry.action || '') !== state.action) return false;
        const entryTime = Number(entry.receivedAtMs || (entry.at ? Date.parse(entry.at) : 0));
        if (state.fromMs && (!Number.isFinite(entryTime) || entryTime < Number(state.fromMs))) return false;
        if (state.toMs && (!Number.isFinite(entryTime) || entryTime > Number(state.toMs))) return false;
        if (state.q) {
          const haystack = JSON.stringify(entry).toLowerCase();
          if (!haystack.includes(String(state.q).toLowerCase())) return false;
        }
        return true;
      };
      const auditQueryParams = (area = '', filters = {}) => {
        const params = new URLSearchParams({ limit: String(filters.limit || 20) });
        if (area) params.set('area', area);
        if (filters.actor) params.set('actor', filters.actor);
        if (filters.user) params.set('user', filters.user);
        if (filters.target) params.set('target', filters.target);
        if (filters.action) params.set('action', filters.action);
        if (filters.q) params.set('q', filters.q);
        if (filters.fromMs) params.set('fromMs', String(filters.fromMs));
        if (filters.toMs) params.set('toMs', String(filters.toMs));
        if (filters.offset) params.set('offset', String(filters.offset));
        return params;
      };
      const auditLocalDateTime = value => {
        const numeric = Number(value || 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return '';
        const date = new Date(numeric);
        const pad = number => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };
      const auditDateTimeMs = value => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? String(parsed) : '';
      };
      async function fetchOpsAuditTrailPage(area = '', filters = {}) {
        const params = auditQueryParams(area, filters);
        const payload = await requestJson(`/ops/api/audit?${params.toString()}`);
        return {
          ...payload,
          entries: Array.isArray(payload.entries) ? payload.entries : [],
          offset: Number(payload.offset || 0),
          limit: Number(payload.limit || filters.limit || 20),
          total: Number(payload.total || 0),
          hasMore: Boolean(payload.hasMore)
        };
      }
      async function fetchOpsAuditTrail(area = '', filters = {}) {
        const payload = await fetchOpsAuditTrailPage(area, filters);
        return payload.entries;
      }
      async function recordOpsAudit({ area = 'ops', action = 'update', target = '', before = null, after = null } = {}) {
        const who = await currentPrincipal();
        const actor = who?.username || who?.displayName || who?.role || 'dev-admin';
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          actor,
          role: who?.role || '',
          area,
          action,
          target: String(target || ''),
          summary: summarizeAuditChange(before, after),
          before: compactAuditValue(before),
          after: compactAuditValue(after)
        };
        const entries = loadOpsAuditTrail();
        entries.unshift(entry);
        saveOpsAuditTrail(entries);
        let persisted = entry;
        try {
          persisted = await persistOpsAuditTrail(entry);
          const current = loadOpsAuditTrail().filter(item => item.id !== entry.id && item.id !== persisted.id);
          current.unshift(persisted);
          saveOpsAuditTrail(current);
        } catch (error) {
          persisted = { ...entry, persistenceError: error.message || 'server audit unavailable' };
        }
        window.dispatchEvent(new CustomEvent('mediaServer.audit', { detail: persisted }));
        return persisted;
      }
      function ensureOpsAuditDetailModal() {
        let dialog = byId('opsAuditDetailDialog');
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.id = 'opsAuditDetailDialog';
        dialog.className = 'audit-detail-modal';
        dialog.innerHTML = `
          <form method="dialog">
            <div class="audit-detail-head">
              <div>
                <strong id="opsAuditDetailTitle">변경 상세</strong>
                <p id="opsAuditDetailMeta"></p>
              </div>
              <button type="submit" class="btn small">닫기</button>
            </div>
            <div class="audit-diff-grid">
              <pre id="opsAuditDetailBefore"></pre>
              <pre id="opsAuditDetailAfter"></pre>
            </div>
          </form>`;
        document.body.appendChild(dialog);
        return dialog;
      }
      function openOpsAuditDetail(entry) {
        const dialog = ensureOpsAuditDetailModal();
        byId('opsAuditDetailTitle').textContent = `${display(entry.area)} ${display(entry.action)} · ${display(entry.target)}`;
        byId('opsAuditDetailMeta').textContent = `${display(entry.actor)} · ${entry.at ? new Date(entry.at).toLocaleString() : '시각 미제공'} · ${display(entry.summary)}`;
        byId('opsAuditDetailBefore').textContent = JSON.stringify(entry.before ?? null, null, 2);
        byId('opsAuditDetailAfter').textContent = JSON.stringify(entry.after ?? null, null, 2);
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', 'open');
      }
      function auditStateFor(containerId, area = '') {
        if (!opsAuditViewStates.has(containerId)) {
          opsAuditViewStates.set(containerId, { area, q: '', actor: '', user: '', target: '', action: '', fromMs: '', toMs: '', limit: 10, offset: 0 });
        }
        const state = opsAuditViewStates.get(containerId);
        state.area = area;
        return state;
      }
      function renderOpsAuditTrail(containerId, area = '') {
        const el = byId(containerId);
        if (!el) return;
        const state = auditStateFor(containerId, area);
        const renderEntries = (entries, sourceLabel = '', page = {}) => {
        const list = el.querySelector('[data-audit-list-body]');
        if (!list) return;
        if (entries.length === 0) {
          list.innerHTML = '<div class="empty">아직 기록된 변경 이력이 없습니다.</div>';
          return;
        }
        const actionLabel = value => ({
          create: '생성',
          update: '수정',
          delete: '삭제',
          enable: '활성화',
          disable: '비활성화',
          'bulk-clone': '대량 복제',
          'bulk-disable': '대량 비활성화',
          approve: '승인',
          reject: '거절'
        })[String(value || '')] || display(value);
        const areaLabel = value => ({
          channels: '채널',
          rules: '룰',
          users: '사용자',
          events: '이벤트'
        })[String(value || '')] || display(value);
        list.innerHTML = `${sourceLabel ? `<div class="audit-source-label">${escapeHtml(sourceLabel)}${Number.isFinite(page.total) ? ` · ${escapeHtml(display(page.offset + 1))}-${escapeHtml(display(page.offset + entries.length))} / ${escapeHtml(display(page.total))}` : ''}</div>` : ''}` + entries.map((entry, index) => `
          <article class="audit-entry">
            <div class="audit-entry-head">
              <strong>${escapeHtml(areaLabel(entry.area))} ${escapeHtml(actionLabel(entry.action))}</strong>
              <span>${escapeHtml(new Date(entry.at).toLocaleString())}</span>
            </div>
            <div class="audit-entry-meta">
              <span>대상 ${escapeHtml(display(entry.target))}</span>
              <span>작업자 ${escapeHtml(display(entry.actor))}${entry.role ? ` · ${escapeHtml(entry.role)}` : ''}</span>
              <span>변경 ${escapeHtml(display(entry.summary))}</span>
            </div>
            <div class="audit-entry-actions">
              <button type="button" class="btn small" data-audit-detail="${index}">상세</button>
            </div>
            <details>
              <summary>전/후 보기</summary>
              <div class="audit-diff-grid">
                <pre>${escapeHtml(JSON.stringify(entry.before ?? null, null, 2))}</pre>
                <pre>${escapeHtml(JSON.stringify(entry.after ?? null, null, 2))}</pre>
              </div>
            </details>
          </article>
        `).join('');
        list.querySelectorAll('[data-audit-detail]').forEach(button => {
          button.addEventListener('click', () => {
            const entry = entries[Number(button.dataset.auditDetail || 0)];
            if (entry) openOpsAuditDetail(entry);
          });
        });
        };
        el.innerHTML = `
          <div class="audit-controls">
            <div class="audit-filter-grid">
              <label>검색
                <input id="${containerId}-audit-q" value="${escapeHtml(state.q)}" placeholder="대상, 요약, diff 검색">
              </label>
              <label>작업자
                <input id="${containerId}-audit-actor" value="${escapeHtml(state.actor)}" placeholder="username">
              </label>
              <label>사용자
                <input id="${containerId}-audit-user" value="${escapeHtml(state.user)}" placeholder="actor 또는 user target">
              </label>
              <label>대상
                <input id="${containerId}-audit-target" value="${escapeHtml(state.target)}" placeholder="channel:1, user:name">
              </label>
              <label>동작
                <select id="${containerId}-audit-action">
                  <option value="">전체</option>
                  <option value="create">생성</option>
                  <option value="update">수정</option>
                  <option value="delete">삭제</option>
                  <option value="enable">활성화</option>
                  <option value="disable">비활성화</option>
                  <option value="bulk-clone">대량 복제</option>
                  <option value="bulk-disable">대량 비활성화</option>
                  <option value="approve">승인</option>
                  <option value="reject">거절</option>
                  <option value="export-bundle">증거 export</option>
                </select>
              </label>
              <label>시작
                <input id="${containerId}-audit-from" type="datetime-local" value="${escapeHtml(auditLocalDateTime(state.fromMs))}">
              </label>
              <label>종료
                <input id="${containerId}-audit-to" type="datetime-local" value="${escapeHtml(auditLocalDateTime(state.toMs))}">
              </label>
              <label>페이지 크기
                <select id="${containerId}-audit-limit">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
            </div>
            <div class="audit-toolbar">
              <button type="button" class="btn small" data-audit-apply>검색</button>
              <button type="button" class="btn small" data-audit-prev>이전</button>
              <button type="button" class="btn small" data-audit-next>다음</button>
              <button type="button" class="btn small" data-audit-export="json">JSON</button>
              <button type="button" class="btn small" data-audit-export="csv">CSV</button>
              <button type="button" class="btn small" data-audit-export="diff-json">Diff JSON</button>
            </div>
          </div>
          <div data-audit-list-body></div>`;
        byId(`${containerId}-audit-action`).value = state.action;
        byId(`${containerId}-audit-limit`).value = String(state.limit);
        const syncState = resetOffset => {
          state.q = byId(`${containerId}-audit-q`)?.value.trim() || '';
          state.actor = byId(`${containerId}-audit-actor`)?.value.trim() || '';
          state.user = byId(`${containerId}-audit-user`)?.value.trim() || '';
          state.target = byId(`${containerId}-audit-target`)?.value.trim() || '';
          state.action = byId(`${containerId}-audit-action`)?.value || '';
          state.fromMs = auditDateTimeMs(byId(`${containerId}-audit-from`)?.value || '');
          state.toMs = auditDateTimeMs(byId(`${containerId}-audit-to`)?.value || '');
          state.limit = Number(byId(`${containerId}-audit-limit`)?.value || 10);
          if (resetOffset) state.offset = 0;
        };
        el.querySelector('[data-audit-apply]')?.addEventListener('click', () => {
          syncState(true);
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelector('[data-audit-prev]')?.addEventListener('click', () => {
          syncState(false);
          state.offset = Math.max(0, state.offset - state.limit);
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelector('[data-audit-next]')?.addEventListener('click', () => {
          syncState(false);
          state.offset += state.limit;
          renderOpsAuditTrail(containerId, area);
        });
        el.querySelectorAll('[data-audit-export]').forEach(button => {
          button.addEventListener('click', () => {
            syncState(false);
            const format = button.dataset.auditExport || 'json';
            const params = auditQueryParams(area, { ...state, limit: 1000, offset: 0 });
            params.set('format', format);
            params.set('download', '1');
            window.location.href = `/ops/api/audit?${params.toString()}`;
          });
        });
        const localEntries = loadOpsAuditTrail()
          .filter(entry => !area || entry.area === area)
          .filter(entry => auditFilterEntry(entry, state))
          .slice(state.offset, state.offset + state.limit);
        renderEntries(localEntries, '브라우저 캐시');
        fetchOpsAuditTrailPage(area, state)
          .then(payload => renderEntries(payload.entries, '서버 감사 로그', payload))
          .catch(() => {
            if (localEntries.length === 0) {
              const list = el.querySelector('[data-audit-list-body]');
              if (list) list.innerHTML = '<div class="empty">서버 감사 로그를 불러오지 못했습니다.</div>';
            }
          });
      }
      return {
        escapeHtml,
        display,
        numberValue,
        byId,
        qs,
        qsa,
        on,
        setText,
        setHidden,
        setRequired,
        setFeedback,
        showToast,
        formDataObject,
        splitList,
        setTableEmpty,
        tableCellHtml,
        opsRowActionsHtml,
        opsTableRowHtml,
        appendTableCell,
        setOpsDetailPanelOpen,
        setSelectOptions,
        chip,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility,
        fetchOpsAuditTrailPage,
        fetchOpsAuditTrail,
        recordOpsAudit,
        renderOpsAuditTrail
      };
    })();
  </script>
)SCRIPT";
}

void AppendProductThemeScript(std::ostringstream& out) {
    out << R"SCRIPT(    <script>
	      (() => {
	        const button = document.getElementById('themeToggleBtn');
	        const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
	        const syncFrames = (theme = currentTheme()) => {
	          document.querySelectorAll('iframe').forEach(frame => {
	            try {
	              frame.contentWindow?.postMessage({ type: 'mediaServer.theme', theme }, window.location.origin);
	            } catch {}
	          });
	        };
	        const bindFrameThemeSync = () => {
	          document.querySelectorAll('iframe').forEach(frame => {
	            if (frame.dataset.themeSyncBound === '1') return;
	            frame.dataset.themeSyncBound = '1';
	            frame.addEventListener('load', () => syncFrames());
	          });
	          syncFrames();
	        };
	        const sync = () => {
	          const theme = currentTheme();
	          const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
	          if (button) {
	            button.setAttribute('aria-label', label);
	            button.setAttribute('title', label);
	          }
	          bindFrameThemeSync();
	        };
	        sync();
	        if (button) {
	          button.addEventListener('click', () => {
	            const next = currentTheme() === 'dark' ? 'light' : 'dark';
	            document.documentElement.dataset.theme = next;
	            localStorage.setItem('mediaServerTheme', next);
	            syncFrames(next);
	            sync();
	          });
	        }
	        window.addEventListener('load', bindFrameThemeSync);
	        setTimeout(bindFrameThemeSync, 0);
	      })();
	    </script>
)SCRIPT";
}

}  // namespace ingress
