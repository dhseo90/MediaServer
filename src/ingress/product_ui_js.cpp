#include "ingress/product_ui_js.h"

#include <sstream>

namespace ingress {

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
        formDataObject,
        splitList,
        setTableEmpty,
        setSelectOptions,
        chip,
        renderBadges,
        renderRaw,
        requestJson,
        applyPrincipalVisibility
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
