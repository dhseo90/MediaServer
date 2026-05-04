#include "ingress/product_ui_assets.h"

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
      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = display(value);
      };
      const chip = (text, tone = '') => `<span class="chip${tone ? ' ' + tone : ''}">${escapeHtml(display(text))}</span>`;
      const renderBadges = (id, items = []) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = items.length > 0
          ? items.map(item => chip(item.text, item.tone)).join('')
          : chip('상태 없음', 'info');
      };
      const renderRaw = (preId, checkboxId, payload) => {
        const pre = document.getElementById(preId);
        const checkbox = document.getElementById(checkboxId);
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
        setText,
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

std::string ProductThemeToggleButtonHtml() {
    return R"(<button id="themeToggleBtn" class="theme-toggle" type="button" aria-label="다크 모드로 전환" title="다크 모드로 전환"><svg class="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 14.5A7.8 7.8 0 0 1 9.5 3a8.8 8.8 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><svg class="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v2.3M12 18.9v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.8 12h2.3M18.9 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>)";
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

std::string ProductNavIconSvg(const std::string& key) {
    if (key == "home") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M8 23 24 10l16 13v16a3 3 0 0 1-3 3h-8V29H19v13h-8a3 3 0 0 1-3-3V23Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>)";
    }
    if (key == "dashboard") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M9 32a15 15 0 1 1 30 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M24 31 33 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M14 36h20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "channels") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="12" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="26" y="12" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="8" y="28" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="26" y="28" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/></svg>)";
    }
    if (key == "rules") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M13 14h22M13 24h22M13 34h22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="24" r="4" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="23" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="3"/></svg>)";
    }
    if (key == "events") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><path d="M24 8 11 30h11l-2 10 17-24H26l-2-8Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>)";
    }
    if (key == "client") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="11" width="32" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M19 40h10M24 33v7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "users") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><circle cx="19" cy="18" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 39c2-8 7-12 11-12s9 4 11 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 30c5 1 8 4 10 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
    }
    if (key == "live") {
        return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><rect x="8" y="11" width="32" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="m21 18 11 6-11 6V18Z" fill="currentColor"/></svg>)";
    }
    return R"(<svg viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M17 25h14M24 18v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
}

std::string ProductAccountAvatarSvg() {
    return R"(<svg class="account-avatar" viewBox="0 0 48 48" role="img" aria-label="Account"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="19" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 38c3-8 8-12 12-12s9 4 12 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>)";
}

}  // namespace ingress
