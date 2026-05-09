#include "ingress/product_ui_css.h"

#include <string>

namespace ingress {

std::string ProductDesignTokensCss() {
    return R"CSS(
    :root {
      --color-bg: #f6f8fb;
      --color-bg-elevated: #ffffff;
      --color-surface: #ffffff;
      --color-surface-raised: #ffffff;
      --color-surface-muted: #f1f5f9;
      --color-surface-subtle: #f8fafc;
      --color-surface-hover: #e8f3f2;
      --color-border: #d8e0e8;
      --color-border-strong: #b7c4d1;
      --color-text: #172026;
      --color-text-muted: #5f6f7a;
      --color-text-subtle: #84919c;
      --color-link: #0f766e;
      --color-primary: #0f766e;
      --color-primary-hover: #0b5f59;
      --color-primary-weak-bg: #e0f2f1;
      --color-primary-weak-text: #0f766e;
      --color-success: #15803d;
      --color-warning: #b45309;
      --color-danger: #dc2626;
      --color-danger-hover: #b91c1c;
      --color-danger-weak-bg: #fff1f1;
      --color-info: #2563eb;
      --color-neutral: #64748b;
      --color-on-primary: #ffffff;
      --color-on-danger: #ffffff;
      --color-success-bg: #dcfce7;
      --color-warning-bg: #fff4d6;
      --color-danger-bg: #fee7e7;
      --color-info-bg: #dbeafe;
      --color-neutral-bg: #e2e8f0;
      --color-input-bg: #ffffff;
      --color-input-border: #cbd5e1;
      --color-input-focus: #14b8a6;
      --color-focus-ring: rgba(20, 184, 166, 0.28);
      --color-input-disabled-bg: #eef2f6;
      --color-placeholder: #94a3b8;
      --color-table-header-bg: #f1f5f9;
      --color-table-row-hover: #edf7f6;
      --color-table-row-selected: #d9f0ed;
      --color-table-border: #e2e8f0;
      --color-code-bg: #111827;
      --color-code-text: #e5edf5;
      --color-debug-bg: #f8fafc;
      --color-debug-border: #cbd5e1;
      --color-media-bg: #0b1120;
      --color-action-fill-bg: var(--color-primary);
      --color-action-fill-hover: var(--color-primary-hover);
      --color-action-fill-text: var(--color-on-primary);
      --color-action-weak-bg: var(--color-bg-elevated);
      --color-action-weak-hover: var(--color-surface-hover);
      --color-action-weak-text: var(--color-text);
      --color-action-ghost-text: var(--color-link);
      --color-action-danger-bg: var(--color-danger);
      --color-action-danger-hover: var(--color-danger-hover);
      --color-action-danger-text: var(--color-on-danger);
      --overlay-box-track: #34d399;
      --overlay-box-detector: #f472b6;
      --overlay-box-selected: #facc15;
      --overlay-label-bg: rgba(15, 23, 42, 0.82);
      --overlay-label-text: #ffffff;
      --overlay-stale-opacity: 0.35;
      --overlay-debug-line: rgba(226, 232, 240, 0.35);
      --overlay-event-highlight: rgba(250, 204, 21, 0.22);
      --overlay-frame-dim: rgba(0, 0, 0, 0.18);
      --overlay-canvas-bg: #08110e;
      --overlay-canvas-text: rgba(242, 240, 223, 0.84);
      --overlay-region-fill: rgba(52, 211, 153, 0.22);
      --overlay-line: #facc15;
      --overlay-point-fill: #facc15;
      --overlay-point-text: #12120d;
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
      --shadow-md: 0 8px 18px rgba(15, 23, 42, 0.10);
      --space-1: 4px;
      --space-2: 8px;
      --space-3: 12px;
      --space-4: 16px;
      --space-5: 20px;
      --space-6: 24px;
      --space-8: 32px;
      --bg: var(--color-bg);
      --panel: var(--color-surface);
      --panel2: var(--color-surface-muted);
      --ink: var(--color-text);
      --muted: var(--color-text-muted);
      --accent: var(--color-primary);
      --accent2: var(--color-primary-hover);
      --danger: var(--color-danger);
      --line: var(--color-border);
      --card-bg: var(--color-surface);
      --field-bg: var(--color-input-bg);
      --secondary-bg: var(--color-bg-elevated);
      --soft-bg: var(--color-surface-muted);
      --code-bg: var(--color-code-bg);
      --code-ink: var(--color-code-text);
      --canvas-bg: var(--color-debug-bg);
      --shadow: var(--shadow-md);
    }
    :root[data-theme="dark"] {
      --color-bg: #111827;
      --color-bg-elevated: #17212f;
      --color-surface: #1f2937;
      --color-surface-raised: #243042;
      --color-surface-muted: #263241;
      --color-surface-subtle: #151f2e;
      --color-surface-hover: #203f3d;
      --color-border: #405163;
      --color-border-strong: #64748b;
      --color-text: #f8fafc;
      --color-text-muted: #cbd5e1;
      --color-text-subtle: #94a3b8;
      --color-link: #5eead4;
      --color-primary: #2dd4bf;
      --color-primary-hover: #5eead4;
      --color-primary-weak-bg: rgba(45, 212, 191, 0.14);
      --color-primary-weak-text: #99f6e4;
      --color-success: #4ade80;
      --color-warning: #fbbf24;
      --color-danger: #f87171;
      --color-danger-hover: #fb7185;
      --color-danger-weak-bg: rgba(248, 113, 113, 0.14);
      --color-info: #60a5fa;
      --color-neutral: #cbd5e1;
      --color-on-primary: #06231f;
      --color-on-danger: #260606;
      --color-success-bg: rgba(34, 197, 94, 0.18);
      --color-warning-bg: rgba(245, 158, 11, 0.17);
      --color-danger-bg: rgba(239, 68, 68, 0.16);
      --color-info-bg: rgba(59, 130, 246, 0.20);
      --color-neutral-bg: rgba(148, 163, 184, 0.18);
      --color-input-bg: #111827;
      --color-input-border: #4b5f73;
      --color-input-focus: #5eead4;
      --color-focus-ring: rgba(94, 234, 212, 0.28);
      --color-input-disabled-bg: #202938;
      --color-placeholder: #7f8fa3;
      --color-table-header-bg: #263241;
      --color-table-row-hover: #1f3938;
      --color-table-row-selected: #24504c;
      --color-table-border: #53677a;
      --color-code-bg: #0b1120;
      --color-code-text: #e5edf5;
      --color-debug-bg: #151f2e;
      --color-debug-border: #4b5f73;
      --color-media-bg: #020617;
      --overlay-label-bg: rgba(2, 6, 23, 0.86);
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.22);
      --shadow-md: 0 10px 24px rgba(0, 0, 0, 0.28);
    }
)CSS";
}

std::string ProductUiCss() {
    return R"CSS(  <style>
)CSS" + ProductDesignTokensCss() + R"CSS(
    :root {
      color-scheme: light;
    }
    :root[data-theme="dark"] {
      color-scheme: dark;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body.product-shell,
    body.auth-shell {
      margin: 0;
      min-height: 100vh;
      font-family: "Avenir Next", "Pretendard", "Noto Sans KR", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--color-text);
      background: var(--color-bg);
    }
    a { color: var(--color-link); text-decoration: none; font-weight: 800; }
    a:hover { text-decoration: underline; }
    .product-page {
      width: min(1280px, calc(100% - 32px));
      margin: 0 auto;
      padding: var(--space-3) 0 56px;
      display: grid;
      gap: var(--space-5);
    }
    .app-header,
    .auth-card,
    .card,
    .panel,
    .section-card {
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .app-header {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
    }
    .app-chrome {
      position: sticky;
      top: var(--space-2);
      z-index: 20;
      display: grid;
      gap: var(--space-2);
      padding: 0;
      background: var(--color-bg);
      border: 0;
      border-radius: 0;
      box-shadow:
        0 calc(-1 * var(--space-2)) 0 var(--space-2) var(--color-bg),
        0 0 0 100vmax var(--color-bg);
      clip-path: inset(calc(-1 * var(--space-2)) -100vmax 0 -100vmax);
    }
    .route-header {
      gap: var(--space-2);
    }
    .app-header-top {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-4);
    }
    .shell-summary-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
    }
    .shell-summary-row {
      align-items: center;
    }
    .app-title-block { display: grid; gap: var(--space-1); }
    .shell-title-block h1 { font-size: clamp(22px, 2.2vw, 28px); }
    .shell-title-block p:not(.eyebrow) { max-width: 760px; }
    .header-utilities {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .image-nav-tabs {
      flex: 1 1 0;
      width: 100%;
      min-width: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
      gap: var(--space-2);
      align-items: stretch;
    }
    .image-nav {
      min-height: 84px;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 6px;
      padding: 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg-elevated);
      color: var(--color-text);
      text-align: center;
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
    }
    .image-nav:hover {
      background: var(--color-surface-hover);
      border-color: var(--color-border-strong);
      text-decoration: none;
    }
    .image-nav.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .image-nav svg {
      width: 34px;
      height: 34px;
      display: block;
      color: currentColor;
    }
    .image-nav span {
      overflow-wrap: anywhere;
      line-height: 1.12;
    }
    .account-menu {
      flex: 0 0 auto;
      min-height: 84px;
      min-width: 210px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      justify-items: stretch;
      gap: var(--space-3);
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg-elevated);
    }
    .account-menu-top {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      min-width: 0;
    }
    .account-shortcut {
      width: auto;
      min-width: 84px;
      white-space: nowrap;
      flex: 0 0 auto;
    }
    .account-identity {
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-3);
    }
    .account-avatar {
      width: 44px;
      height: 44px;
      flex: 0 0 auto;
      color: var(--color-primary);
    }
    .account-copy {
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    .account-name {
      color: var(--color-text);
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .account-meta {
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .account-menu > form {
      width: 100%;
      margin: 0;
    }
    .account-menu > form > button {
      width: 100%;
    }
    h1, h2, h3 { margin: 0; letter-spacing: 0; }
    h1 { font-size: clamp(26px, 3vw, 36px); line-height: 1.08; }
    h2 { font-size: 20px; }
    h3 { font-size: 16px; }
    p { margin: 0; color: var(--color-text-muted); line-height: 1.55; }
    .eyebrow {
      margin: 0;
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .muted { color: var(--color-text-muted); }
    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
      color: var(--color-text-muted);
      font-size: 13px;
      font-weight: 800;
    }
    .nav-tabs {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .nav,
    .button,
    button {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 9px 13px;
      background: var(--color-bg-elevated);
      color: var(--color-text);
      font: inherit;
      font-weight: 850;
      text-decoration: none;
      cursor: pointer;
      box-shadow: none;
    }
    .nav:hover,
    .button:hover,
    button:hover {
      background: var(--color-surface-hover);
      border-color: var(--color-border-strong);
      text-decoration: none;
    }
    .nav.active,
    .button-primary,
    button.primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .button-danger,
    button.danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: #ffffff;
    }
    .button-secondary,
    button.secondary,
    .ghost,
    .theme-toggle {
      background: var(--color-bg-elevated);
      color: var(--color-text);
      border-color: var(--color-border);
    }
    .button-link {
      min-height: auto;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-link);
      box-shadow: none;
    }
    .theme-toggle {
      width: 40px;
      min-width: 40px;
      min-height: 40px;
      height: 40px;
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      padding: 0;
      border-radius: 999px;
      font-size: 0;
    }
    .theme-toggle svg {
      width: 20px;
      height: 20px;
      display: block;
    }
    .refresh-icon-button {
      width: 40px;
      min-width: 40px;
      min-height: 40px;
      height: 40px;
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      padding: 0;
      border-radius: 999px;
      font-size: 0;
    }
    .refresh-icon {
      width: 20px;
      height: 20px;
      display: block;
    }
    .theme-toggle .theme-icon-moon { display: block !important; }
    .theme-toggle .theme-icon-sun { display: none !important; }
    :root[data-theme="dark"] .theme-toggle .theme-icon-moon { display: none !important; }
    :root[data-theme="dark"] .theme-toggle .theme-icon-sun { display: block !important; }
    .auth-theme-control {
      position: fixed;
      top: var(--space-4);
      right: var(--space-4);
      z-index: 30;
    }
    .panel,
    .section-card,
    .card {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-4);
    }
    .split-grid {
      display: grid;
      grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
      gap: var(--space-4);
      align-items: start;
    }
    .metric-card {
      min-height: 94px;
      display: grid;
      align-content: center;
      gap: var(--space-1);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .metric-card span {
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .metric-card strong {
      color: var(--color-text);
      font-size: 24px;
      font-variant-numeric: tabular-nums;
    }
    .compact-card {
      gap: var(--space-3);
      padding: var(--space-4);
    }
    .status-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-3);
    }
    .status-stat {
      min-height: 62px;
      display: grid;
      align-content: center;
      gap: 3px;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-muted);
    }
    .status-stat span {
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .status-stat strong {
      color: var(--color-text);
      font-size: 18px;
      font-variant-numeric: tabular-nums;
    }
    .toolbar,
    .actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .actions { justify-content: flex-start; }
    .badge-row,
    .meta {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      align-items: center;
    }
    .chip,
    .badge,
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--color-primary-weak-bg);
      color: var(--color-primary-weak-text);
      font-size: 12px;
      font-weight: 900;
    }
    .chip.warn,
    .badge.warn { background: var(--color-warning-bg); color: var(--color-warning); }
    .chip.bad,
    .badge.bad { background: var(--color-danger-bg); color: var(--color-danger); }
    .chip.info,
    .badge.info { background: var(--color-info-bg); color: var(--color-info); }
    form,
    .form-grid {
      display: grid;
      gap: var(--space-3);
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--color-text-muted);
      font-size: 13px;
      font-weight: 850;
    }
    input,
    select,
    textarea {
      width: 100%;
      min-height: 38px;
      border: 1px solid var(--color-input-border);
      border-radius: var(--radius-md);
      padding: 8px 10px;
      background: var(--color-input-bg);
      color: var(--color-text);
      font: inherit;
      -webkit-user-select: text;
      user-select: text;
    }
    textarea { min-height: 82px; resize: vertical; }
    input:focus,
    select:focus,
    textarea:focus {
      outline: 3px solid var(--color-focus-ring);
      border-color: var(--color-input-focus);
    }
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-3);
    }
    .checks {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .checks label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .checks input {
      width: auto;
      min-height: auto;
    }
    .ops-category-section {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .ops-category-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .ops-category-header strong {
      color: var(--color-text);
      font-size: 14px;
    }
    .ops-category-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      align-items: center;
    }
    .ops-category-actions .button-secondary,
    .ops-category-actions button {
      min-height: 34px;
      padding: 7px 10px;
      font-size: 12px;
    }
    .ops-category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-2);
    }
    .ops-category-check {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-elevated);
      cursor: pointer;
    }
    .ops-category-check input {
      width: auto;
      min-height: auto;
      margin-top: 2px;
      flex: 0 0 auto;
    }
    .ops-category-copy {
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    .ops-category-title {
      color: var(--color-text);
      font-size: 13px;
      font-weight: 850;
    }
    .ops-category-detail {
      color: var(--color-text-muted);
      font-size: 11px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .ops-selection-review,
    .ops-template-settings {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .ops-va-stage-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
      gap: var(--space-4);
      align-items: start;
    }
    .ops-va-stage-grid-single {
      grid-template-columns: minmax(0, 1fr);
    }
    .ops-va-stage-panel {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }
    .compact-toolbar {
      gap: var(--space-3);
      align-items: start;
    }
    .ops-geometry-status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-2);
    }
    .ops-geometry-status-card {
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      display: grid;
      gap: 3px;
    }
    .ops-geometry-status-card span {
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .ops-geometry-status-card strong {
      color: var(--color-text);
      font-size: 14px;
      line-height: 1.25;
      min-width: 0;
      overflow-wrap: normal;
      white-space: nowrap;
    }
    .ops-geometry-status-card strong[data-state="ready"] {
      color: var(--color-success);
    }
    .ops-geometry-status-card strong[data-state="warn"] {
      color: var(--color-warning);
    }
    .ops-rule-preview-stage {
      position: relative;
      aspect-ratio: 16 / 9;
      min-height: 260px;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-surface) 84%, black 16%);
      display: grid;
      place-items: center;
    }
    .ops-rule-preview-stage::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 -36px 72px rgba(0, 0, 0, 0.24);
      z-index: 1;
    }
    .ops-rule-preview-stage video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      background: black;
    }
    .ops-rule-preview-stage span {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: var(--space-4);
      color: var(--color-text-muted);
      font-size: 13px;
      text-align: center;
      pointer-events: none;
      z-index: 3;
    }
    .ops-geometry-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      color: var(--color-info);
      z-index: 2;
      cursor: crosshair;
      touch-action: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .ops-geometry-overlay .ops-geometry-frame-dim {
      fill: var(--overlay-frame-dim);
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-grid {
      stroke: var(--overlay-debug-line);
      stroke-width: 0.35;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-polygon {
      fill: var(--overlay-region-fill);
      stroke: var(--overlay-box-track);
      stroke-width: 0.75;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-incomplete {
      fill: none;
      stroke: var(--overlay-box-track);
      stroke-width: 0.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 4 3;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-line {
      fill: none;
      stroke: var(--overlay-line);
      stroke-width: 0.7;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-direction,
    .ops-geometry-overlay .ops-geometry-direction-head {
      stroke: var(--overlay-box-selected);
      fill: var(--overlay-box-selected);
      stroke-width: 0.55;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-point {
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
      cursor: grab;
      pointer-events: auto;
    }
    .ops-geometry-overlay .ops-geometry-point.is-active {
      cursor: grabbing;
    }
    .ops-geometry-overlay .ops-geometry-point circle {
      fill: var(--overlay-point-fill);
      stroke: var(--overlay-point-text);
      stroke-width: 0.4;
      vector-effect: non-scaling-stroke;
    }
    .ops-geometry-overlay .ops-geometry-point.is-active circle {
      fill: var(--overlay-box-selected);
      stroke-width: 0.6;
    }
    .ops-geometry-overlay .ops-geometry-point text {
      fill: var(--overlay-point-text);
      font-size: 1.45px;
      font-weight: 900;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-badge rect {
      fill: var(--overlay-label-bg);
      stroke: rgba(255, 255, 255, 0.18);
      stroke-width: 0.25;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-badge text {
      fill: var(--overlay-label-text);
      font-size: 1.45px;
      font-weight: 850;
      pointer-events: none;
    }
    .ops-geometry-toolbar {
      align-items: center;
      margin-top: var(--space-1);
    }
    .hint,
    .form-note {
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .status,
    .message {
      min-height: 24px;
      color: var(--color-info);
      font-size: 13px;
      font-weight: 850;
    }
    .status.error,
    .message.error { color: var(--color-danger); }
    .toast-stack {
      position: fixed;
      right: clamp(16px, 3vw, 32px);
      bottom: clamp(16px, 3vw, 32px);
      display: grid;
      gap: var(--space-2);
      z-index: 2147483600;
      pointer-events: none;
    }
    .toast {
      max-width: min(360px, calc(100vw - 32px));
      padding: 10px 14px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
      color: var(--color-text);
      box-shadow: var(--shadow-md);
      font-size: 13px;
      font-weight: 850;
      line-height: 1.35;
      opacity: 1;
      transform: translateY(0);
      transition: opacity 180ms ease, transform 180ms ease;
    }
    .toast.error {
      border-color: color-mix(in srgb, var(--color-danger) 60%, var(--color-border));
      color: var(--color-danger);
    }
    .toast.leaving {
      opacity: 0;
      transform: translateY(8px);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th,
    td {
      border-bottom: 1px solid var(--color-table-border);
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--color-table-header-bg);
      color: var(--color-text-muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    tr:hover td { background: var(--color-table-row-hover); }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    .table-wrap table th:first-child { border-top-left-radius: var(--radius-lg); }
    .table-wrap table th:last-child { border-top-right-radius: var(--radius-lg); }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      padding: var(--space-4);
      border: 1px solid var(--color-debug-border);
      border-radius: var(--radius-md);
      background: var(--color-code-bg);
      color: var(--color-code-text);
      font-size: 12px;
      line-height: 1.45;
      max-height: 420px;
      overflow: auto;
    }
    .empty {
      min-height: 86px;
      display: grid;
      align-content: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
    }
    .embedded-frame {
      width: 100%;
      min-height: min(1120px, calc(100vh - 220px));
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg-elevated);
    }
    .dashboard-embedded-frame {
      height: 1280px;
      min-height: 980px;
    }
    .collapsed-editor {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      overflow: hidden;
    }
    .collapsed-editor > summary {
      cursor: pointer;
      padding: var(--space-4);
      color: var(--color-text);
      font-weight: 900;
    }
    .collapsed-editor[open] > summary {
      border-bottom: 1px solid var(--color-border);
    }
    .collapsed-editor-body {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
    }
    .table-actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      flex-wrap: wrap;
    }
    .table-cell-muted,
    .table-empty {
      color: var(--color-text-muted);
    }
    .table-cell-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      overflow-wrap: anywhere;
    }
    .table-empty {
      text-align: center;
      white-space: normal;
    }
    .table-cell-nowrap {
      white-space: nowrap;
    }
    .table-cell-status,
    .table-cell-actions {
      white-space: normal;
    }
    .table-cell-status {
      min-width: 84px;
      text-align: left;
    }
    .table-cell-actions {
      min-width: 148px;
    }
    .table-cell-status .badge,
    .table-cell-status .chip,
    .table-cell-status .status-chip {
      display: inline-block;
      min-width: 64px;
      width: max-content;
      max-width: none;
      padding-inline: 12px;
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: normal;
      line-break: strict;
      text-align: center;
      margin-inline-end: auto;
    }
    .table-cell-status > * {
      justify-content: flex-start;
      text-align: left;
    }
    .grid.rules-metrics-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .rules-prereq-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-3);
    }
    .rules-prereq-card {
      min-height: 168px;
      display: grid;
      align-content: start;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .rules-prereq-card strong {
      color: var(--color-text);
      font-size: 24px;
      font-variant-numeric: tabular-nums;
    }
    .rules-prereq-card p {
      font-size: 13px;
      line-height: 1.5;
    }
    .rule-mode-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }
    .rule-mode-button {
      min-width: 140px;
      min-height: 40px;
      font-weight: 800;
      white-space: nowrap;
    }
    .ops-rules-table,
    .user-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      min-width: 0;
    }
    .ops-rules-col-id { width: 58px; }
    .ops-rules-col-source { width: auto; }
    .ops-rules-col-template { width: 140px; }
    .ops-rules-col-profile { width: 140px; }
    .ops-rules-col-geometry { width: 92px; }
    .ops-rules-col-output { width: 96px; }
    .ops-rules-col-target { width: 148px; }
    .ops-rules-col-status { width: 84px; }
    .ops-rules-col-actions { width: 148px; }
    .ops-event-col-id { width: 72px; }
    .ops-event-col-mode { width: 96px; }
    .ops-event-col-analysis { width: 136px; }
    .ops-event-col-target { width: 156px; }
    .ops-event-col-condition { width: auto; }
    .ops-event-col-actions { width: 148px; }
    .ops-profile-col-id { width: 112px; }
    .ops-profile-col-detector { width: 132px; }
    .ops-profile-col-fps { width: 80px; }
    .ops-profile-col-input { width: auto; }
    .ops-profile-col-usage { width: 120px; }
    .ops-profile-col-actions { width: 148px; }
    .user-col-username { width: 136px; }
    .user-col-name { width: 118px; }
    .user-col-role { width: 96px; }
    .user-col-status { width: 84px; }
    .user-col-scopes { width: auto; }
    .user-col-last-login { width: 132px; }
    .user-col-locked-until { width: 108px; }
    .user-col-password { width: 84px; }
    .user-col-actions { width: 148px; }
    .request-col-username { width: 136px; }
    .request-col-name { width: 124px; }
    .request-col-contact { width: 136px; }
    .request-col-channel { width: 104px; }
    .request-col-reason { width: auto; }
    .request-col-status { width: 84px; }
    .request-col-decision { width: 132px; }
    .request-col-actions { width: 148px; }
    .user-table th,
    .user-table td,
    .ops-rules-table th,
    .ops-rules-table td {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .ops-rules-va-table {
      min-width: 0;
    }
    .ops-rules-table .table-actions {
      flex-wrap: nowrap;
      justify-content: flex-start;
    }
    .ops-va-template-assist {
      display: grid;
      gap: 12px;
      margin-bottom: 14px;
    }
    #opsVaRuleTemplateAssistActions.actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #opsVaRuleTemplateAssistState {
      margin: 0;
    }
    .ops-rule-id-cell,
    .ops-rule-value-stack,
    .user-id-cell,
    .user-value-stack {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .ops-rule-id-cell > strong,
    .ops-rule-value-stack > strong,
    .user-id-cell > strong,
    .user-value-stack > strong {
      display: block;
      font-size: 13px;
      color: var(--color-text);
      line-height: 1.45;
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
    .ops-rule-note,
    .user-note {
      display: block;
      color: var(--color-text-muted);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: break-word;
      word-break: normal;
    }
    .table-identity-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: max-content;
      max-width: 100%;
      min-height: 26px;
      padding: 4px 10px;
      border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent 28%);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      line-height: 1.2;
      letter-spacing: 0;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      text-align: center;
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-surface-raised) 84%, transparent 16%);
    }
    .table-identity-id { background: var(--color-info-bg); color: var(--color-info); }
    .table-identity-channel { background: var(--color-success-bg); color: var(--color-success); }
    .table-identity-profile { background: var(--color-warning-bg); color: var(--color-warning); }
    .table-identity-template { background: var(--color-danger-bg); color: var(--color-danger); }
    .table-identity-user { background: var(--color-primary-weak-bg); color: var(--color-primary); }
    .ops-rule-status-actions,
    .user-status-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-2);
      min-width: 0;
    }
    .ops-rule-row-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .ops-rule-row-actions button,
    .user-row-actions button,
    .user-status-actions button {
      width: auto;
      min-width: 78px;
      min-height: 32px;
      padding: 6px 9px;
      font-size: 11px;
      white-space: nowrap;
    }
    .channel-table {
      table-layout: fixed;
    }
    .channel-table th,
    .channel-table td {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .channel-col-id { width: 58px; }
    .channel-col-name { width: 16%; }
    .channel-col-kind { width: 118px; }
    .channel-col-status { width: 118px; }
    .channel-col-input { width: auto; }
    .channel-col-live-url,
    .channel-col-va-url { width: 104px; }
    .channel-col-actions { width: 164px; }
    .channel-id-cell,
    .channel-kind-cell,
    .channel-input-stack {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .channel-status-actions {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
    }
    .channel-stream-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
    }
    .channel-stream-rule {
      margin-top: var(--space-2);
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 850;
    }
    .channel-row-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
    }
    .channel-row-actions button {
      width: 100%;
      min-width: 0;
    }
    .user-row-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
      min-width: 0;
    }
    .user-scope-cell {
      max-width: none;
      white-space: normal;
      word-break: normal;
      overflow-wrap: anywhere;
    }
    .user-scope-cell .user-value-stack > strong {
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
    .user-scope-cell .user-note {
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
    .channel-stream-actions button,
    .channel-status-actions button,
    .channel-row-actions button {
      min-height: 32px;
      padding: 6px 9px;
      font-size: 11px;
      white-space: nowrap;
    }
    .channel-input-stack .token,
    .channel-source-note {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .auth-shell {
      display: grid;
      place-items: center;
      padding: var(--space-5);
    }
    .auth-card {
      width: min(460px, 100%);
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5);
    }
    .auth-card-wide {
      width: min(520px, 100%);
    }
    .auth-form { display: grid; gap: var(--space-3); }
    .auth-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .token {
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    @media (max-width: 860px) {
      .product-page { width: min(100% - 20px, 760px); padding-top: var(--space-5); }
      .split-grid { grid-template-columns: 1fr; }
      .shell-summary-row { align-items: stretch; }
      .app-header-top { grid-template-columns: 1fr; }
      .header-utilities { justify-content: flex-start; }
      .account-menu { width: 100%; }
      .account-menu-top { justify-content: flex-start; }
      .image-nav-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nav-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nav { width: 100%; }
      .grid.rules-metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ops-geometry-status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 1180px) and (min-width: 861px) {
      .app-header-top {
        grid-template-columns: minmax(0, 1fr) minmax(252px, 296px);
        align-items: stretch;
      }
      .app-header-top > .image-nav-tabs:not(.client-image-nav-tabs) {
        grid-template-columns: repeat(3, minmax(92px, 1fr));
      }
      .account-menu {
        min-height: 176px;
        grid-template-rows: minmax(0, 1fr) auto;
        align-content: stretch;
        gap: var(--space-4);
        padding: 12px 14px;
      }
      .account-menu-top {
        height: 100%;
        justify-content: flex-start;
        align-items: center;
      }
      .account-identity {
        align-items: center;
      }
      body.client-shell .app-header-top {
        grid-template-columns: minmax(0, 1fr) minmax(232px, 272px);
        align-items: start;
      }
      body.client-shell .account-menu {
        min-height: 84px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: 10px 12px;
      }
      body.client-shell .account-menu-top {
        flex: 1 1 auto;
        min-width: 0;
        justify-content: flex-start;
      }
      body.client-shell .account-identity {
        min-width: 0;
      }
      body.client-shell .account-menu > form {
        width: auto;
        flex: 0 0 auto;
      }
      body.client-shell .account-menu > form > button {
        width: auto;
        min-width: 96px;
      }
    }
    @media (max-width: 1040px) {
      .channel-table,
      .channel-table tbody,
      .channel-table tr,
      .channel-table td {
        display: block;
        width: 100%;
      }
      .channel-table {
        table-layout: auto;
      }
      .channel-table colgroup,
      .channel-table thead {
        display: none;
      }
      .channel-table tr {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-table-border);
      }
      .channel-table tr:last-child {
        border-bottom: 0;
      }
      .channel-table td {
        min-height: 42px;
        display: grid;
        grid-template-columns: minmax(108px, 28%) minmax(0, 1fr);
        gap: var(--space-3);
        align-items: start;
        border-bottom: 0;
        padding: 8px var(--space-3);
      }
      .channel-table td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .channel-status-actions,
      .channel-stream-actions,
      .channel-row-actions {
        min-width: 0;
      }
    }
    @media (max-width: 1040px) {
      .ops-rules-table,
      .ops-rules-table tbody,
      .ops-rules-table tr,
      .ops-rules-table td,
      .user-table,
      .user-table tbody,
      .user-table tr,
      .user-table td {
        display: block;
        width: 100%;
      }
      .ops-rules-table,
      .user-table {
        min-width: 0;
        table-layout: auto;
      }
      .ops-rules-table colgroup,
      .ops-rules-table thead,
      .user-table colgroup,
      .user-table thead {
        display: none;
      }
      .ops-rules-table tr,
      .user-table tr {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-table-border);
      }
      .ops-rules-table tr:last-child,
      .user-table tr:last-child {
        border-bottom: 0;
      }
      .ops-rules-table th,
      .ops-rules-table td,
      .user-table th,
      .user-table td {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
      }
      .ops-rules-table td,
      .user-table td {
        min-height: 42px;
        display: grid;
        grid-template-columns: minmax(108px, 132px) minmax(0, 1fr);
        gap: var(--space-3);
        align-items: start;
        border-bottom: 0;
        padding: 8px var(--space-3);
        white-space: normal;
      }
      .ops-rules-table td::before,
      .user-table td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .ops-rules-table .table-cell-status,
      .ops-rules-table .table-cell-actions,
      .user-table .table-cell-status,
      .user-table .table-cell-actions {
        min-width: 0;
        width: auto;
      }
      .ops-rules-table .table-actions {
        justify-content: flex-start;
      }
    }
    @media (max-width: 560px) {
      .grid.rules-metrics-grid {
        grid-template-columns: 1fr;
      }
      .ops-va-stage-grid {
        grid-template-columns: 1fr;
      }
      .ops-geometry-status-grid {
        grid-template-columns: 1fr;
      }
      .channel-table td {
        grid-template-columns: 1fr;
        gap: 4px;
      }
      .channel-row-actions {
        grid-template-columns: 1fr;
      }
      .ops-rules-table td,
      .user-table td {
        grid-template-columns: 1fr;
        gap: 4px;
      }
      .ops-rules-table .table-actions,
      .ops-rule-row-actions,
      .user-row-actions {
        display: grid;
        grid-template-columns: 1fr;
      }
    }
  </style>
)CSS";
}

std::string ClientShellCss() {
    return R"CSS(  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--color-bg);
      --panel: var(--color-surface-raised);
      --panel-soft: var(--color-surface-muted);
      --line: var(--color-border);
      --text: var(--color-text);
      --muted: var(--color-text-muted);
      --accent: var(--color-primary);
      --accent-soft: var(--color-primary-weak-bg);
      --warn: var(--color-warning);
      --warn-soft: var(--color-warning-bg);
      --bad: var(--color-danger);
      --bad-soft: var(--color-danger-bg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { margin: 0; background: var(--bg); color: var(--text); }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 40px; display: grid; gap: 18px; }
    h1, h2, h3 { margin: 0; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; }
    h3 { font-size: 16px; }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
    header.app-chrome {
      display: grid;
      gap: var(--space-2);
      align-items: stretch;
    }
    header.app-chrome .app-header-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      width: 100%;
      align-items: start;
      gap: var(--space-4);
    }
    header.app-chrome .image-nav-tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
      width: 100%;
      min-width: 0;
      gap: var(--space-2);
    }
    .client-image-nav-tabs {
      flex: 1 1 320px;
      min-width: min(320px, 100%);
      grid-template-columns: repeat(2, minmax(92px, 1fr));
    }
    a.nav { min-height: 36px; display: inline-flex; align-items: center; border-radius: 6px; padding: 0 12px; background: var(--panel-soft); color: var(--text); text-decoration: none; font-weight: 900; }
    a.nav.active { background: var(--color-primary); color: var(--color-on-primary); }
    .workspace { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: 14px; align-items: start; }
    .workspace.live-workspace { grid-template-columns: 1fr; }
    .workspace.live-workspace > .panel:first-child { display: none; }
    .panel { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
    .views { display: grid; gap: 10px; }
    .view { width: 100%; text-align: left; display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--bg); color: var(--text); cursor: pointer; }
    .view.active { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.16); }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 8px; border-radius: 999px; background: var(--accent-soft); color: #115e59; font-size: 12px; font-weight: 900; }
    .chip.warn { background: var(--warn-soft); color: var(--warn); }
    .chip.bad { background: var(--bad-soft); color: var(--bad); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .metric { min-height: 76px; display: grid; align-content: center; gap: 4px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--bg); }
    .metric span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .metric strong { font-size: 20px; }
    .events { display: grid; gap: 8px; }
    .event { display: grid; gap: 5px; border-top: 1px solid var(--line); padding-top: 10px; }
    .event:first-child { border-top: 0; padding-top: 0; }
    button { min-height: 38px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-elevated); color: var(--color-text); padding: 0 14px; font-weight: 850; cursor: pointer; }
    .refresh-icon-button { width: 40px; min-width: 40px; min-height: 40px; height: 40px; display: inline-grid; place-items: center; padding: 0; border-radius: 999px; font-size: 0; }
    .refresh-icon { width: 20px; height: 20px; display: block; }
    button:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong); }
    .ghost { background: var(--color-bg-elevated); color: var(--color-text); }
    .empty { min-height: 80px; display: grid; align-content: center; gap: 8px; }
    .toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .live-monitor { display: grid; gap: 12px; }
    .live-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto auto;
      gap: 10px;
      align-items: end;
    }
    .live-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .live-grid[data-grid-size="1"] { grid-template-columns: 1fr; }
    .live-grid[data-grid-size="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .live-grid[data-grid-size="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .live-grid[data-grid-size="6"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .live-grid[data-grid-size="9"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .live-grid[data-density="compact"] { gap: 8px; }
    .tile { min-height: 280px; display: grid; grid-template-rows: auto minmax(140px, 1fr) auto; gap: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--bg); }
    .live-grid[data-density="compact"] .tile { min-height: 224px; grid-template-rows: auto minmax(108px, 1fr) auto; gap: 8px; padding: 8px; }
    .tile.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.16); }
    .tile-head { display: grid; gap: 8px; }
    .tile-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .tile-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(110px, 150px); gap: 8px; }
    .tile-controls label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; font-weight: 800; }
    .tile-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .tile-stage { position: relative; min-height: 150px; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #111827; display: grid; place-items: center; color: #cbd5e1; }
    .live-grid[data-density="compact"] .tile-stage { min-height: 108px; }
    .tile-stage video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    .tile-stage span { position: absolute; inset: auto 10px 10px 10px; font-size: 12px; font-weight: 800; color: #cbd5e1; }
    .tile-status { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .live-grid[data-density="compact"] .tile-status { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .tile-status .metric { min-height: 54px; padding: 8px; }
    .live-grid[data-density="compact"] .tile-status .metric { min-height: 44px; padding: 6px; }
    .tile-status .metric strong { font-size: 15px; }
    .detail-box { display: grid; gap: 10px; border-top: 1px solid var(--line); padding-top: 12px; }
    select { width: 100%; min-height: 36px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--text); padding: 0 8px; font: inherit; font-weight: 700; }
    :root[data-theme="dark"] {
      --bg: var(--color-bg);
      --panel: var(--color-surface-raised);
      --panel-soft: var(--color-surface-muted);
      --line: var(--color-border);
      --text: var(--color-text);
      --muted: var(--color-text-muted);
      --accent-soft: var(--color-primary-weak-bg);
      --warn-soft: var(--color-warning-bg);
      --bad-soft: var(--color-danger-bg);
    }
    :root[data-theme="dark"] .chip { color: #99f6e4; }
    :root[data-theme="dark"] .chip.warn { color: #fcd34d; }
    :root[data-theme="dark"] .chip.bad { color: #fca5a5; }
    :root[data-theme="dark"] a.nav.active { background: var(--color-primary); color: var(--color-on-primary); }
    @media (max-width: 900px) { .live-grid, .live-grid[data-grid-size] { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 860px) {
      header.app-chrome .app-header-top { grid-template-columns: 1fr; }
      header.app-chrome .image-nav-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .client-image-nav-tabs { min-width: 0; }
    }
    @media (max-width: 780px) { .workspace, .live-toolbar { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .live-grid, .live-grid[data-grid-size] { grid-template-columns: 1fr; } }
  </style>
)CSS";
}

}  // namespace ingress
