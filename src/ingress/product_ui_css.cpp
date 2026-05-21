// 파일 용도: 제품 UI의 디자인 토큰, 운영자 화면, 클라이언트 화면 CSS를 C++ 문자열로 조립한다.
#include "ingress/product_ui_css.h"

#include <string>

namespace ingress {

// 주요 동작: 라이트/다크 테마와 overlay, table, form 계열에서 공유하는 CSS 변수를 제공한다.
std::string ProductDesignTokensCss() {
    return R"CSS(
    :root {
      --color-bg: #f3f6f8;
      --color-bg-elevated: #ffffff;
      --color-surface: #ffffff;
      --color-surface-raised: #ffffff;
      --color-surface-muted: #eef3f5;
      --color-surface-subtle: #f8fafb;
      --color-surface-hover: #e5f2ef;
      --color-border: #d7dee5;
      --color-border-strong: #aebbc6;
      --color-text: #171c1f;
      --color-text-muted: #5c6972;
      --color-text-subtle: #87939c;
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
      --color-selection-ring: rgba(15, 118, 110, 0.16);
      --color-modal-backdrop: rgba(15, 23, 42, 0.44);
      --color-input-disabled-bg: #eef2f6;
      --color-placeholder: #94a3b8;
      --color-table-header-bg: #edf2f5;
      --color-table-row-hover: #f4fbf9;
      --color-table-row-selected: #d9f0ed;
      --color-table-border: #dfe6ec;
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
      --overlay-stage-gloss-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 -36px 72px rgba(0, 0, 0, 0.24);
      --overlay-point-shadow: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
      --overlay-badge-stroke: rgba(255, 255, 255, 0.18);
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --shadow-sm: 0 1px 2px rgba(23, 28, 31, 0.06);
      --shadow-md: 0 12px 28px rgba(23, 28, 31, 0.11);
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
      --color-bg: #151719;
      --color-bg-elevated: #1d2023;
      --color-surface: #202427;
      --color-surface-raised: #242a2e;
      --color-surface-muted: #2a3034;
      --color-surface-subtle: #191c1f;
      --color-surface-hover: #1f3d39;
      --color-border: #3c454c;
      --color-border-strong: #65717a;
      --color-text: #f5f7f8;
      --color-text-muted: #c6cdd2;
      --color-text-subtle: #969fa7;
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
      --color-input-bg: #171a1d;
      --color-input-border: #4a555e;
      --color-input-focus: #5eead4;
      --color-focus-ring: rgba(94, 234, 212, 0.28);
      --color-selection-ring: rgba(45, 212, 191, 0.20);
      --color-modal-backdrop: rgba(2, 6, 23, 0.62);
      --color-input-disabled-bg: #262c31;
      --color-placeholder: #7f8fa3;
      --color-table-header-bg: #2a3034;
      --color-table-row-hover: #213530;
      --color-table-row-selected: #214c45;
      --color-table-border: #3e4850;
      --color-code-bg: #0b1120;
      --color-code-text: #e5edf5;
      --color-debug-bg: #171a1d;
      --color-debug-border: #4a555e;
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
      width: min(1440px, calc(100% - 28px));
      margin: 0 auto;
      padding: 14px 0 48px;
      display: grid;
      gap: var(--space-4);
    }
    .product-page > * {
      min-width: 0;
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
    body.product-shell {
      --color-bg: #f5f7fb;
      --color-bg-elevated: #ffffff;
      --color-surface: #ffffff;
      --color-surface-raised: #ffffff;
      --color-surface-muted: #f0f3f7;
      --color-surface-subtle: #f8fafc;
      --color-surface-hover: #eef5ff;
      --color-border: #d8e0ea;
      --color-border-strong: #aeb9c7;
      --color-text: #152033;
      --color-text-muted: #667386;
      --color-primary: #3b82f6;
      --color-primary-hover: #2563eb;
      --color-primary-weak-bg: #e8f1ff;
      --color-primary-weak-text: #2563eb;
      --color-link: #2563eb;
      --color-table-header-bg: #f3f6fa;
      --color-table-row-hover: #f7fbff;
      --color-table-border: #e3e9f1;
      --color-input-bg: #ffffff;
      --color-input-border: #cfd8e5;
      background: var(--color-bg);
      overflow-x: hidden;
    }
    body.product-shell .product-page {
      width: 100%;
      max-width: none;
      padding: 0;
      gap: 0;
    }
    body.product-shell .product-page > .panel,
    body.product-shell .product-page > .workspace {
      width: min(1480px, calc(100% - 32px));
      max-width: calc(100vw - 32px);
      margin: 16px auto 48px;
    }
    body.product-shell .app-chrome {
      width: 100%;
      max-width: 100vw;
      min-height: 60px;
      padding: 0 22px;
      border-width: 0 0 1px;
      border-radius: 0;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 1px 0 rgba(15, 23, 42, 0.05);
      backdrop-filter: blur(18px);
      overflow: clip;
    }
    body.product-shell .app-header-top {
      grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
      min-height: 60px;
      gap: 14px;
    }
    body.product-shell .app-nav-cluster {
      min-width: 0;
      grid-template-columns: minmax(220px, max-content) minmax(0, 1fr);
      gap: 16px;
    }
    body.product-shell .app-brand {
      min-width: 0;
      min-height: 48px;
      padding: 0;
      border: 0;
      background: transparent;
      grid-template-columns: 34px minmax(0, 1fr);
    }
    body.product-shell .brand-mark {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      font-size: 0;
      background: #3b82f6;
      box-shadow: 0 6px 18px rgba(59, 130, 246, 0.22);
    }
    body.product-shell .brand-mark::before {
      content: "▶";
      margin-left: 2px;
      color: #ffffff;
      font-size: 15px;
      line-height: 1;
    }
    body.product-shell .brand-copy {
      min-width: 0;
      max-width: min(42vw, 520px);
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    body.product-shell .brand-copy strong {
      flex: 0 0 auto;
      font-size: 15px;
      line-height: 1;
      white-space: nowrap;
    }
    body.product-shell .brand-copy span {
      min-width: 0;
      display: inline;
      color: var(--color-text);
      font-size: 15px;
      font-weight: 650;
      line-height: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      -webkit-line-clamp: initial;
    }
    body.product-shell .image-nav-tabs {
      min-width: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      width: auto;
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      grid-auto-rows: 60px;
      gap: 2px;
      align-items: stretch;
      justify-content: start;
    }
    body.product-shell .image-nav-tabs::-webkit-scrollbar {
      display: none;
    }
    body.product-shell .image-nav {
      height: 60px;
      min-height: 60px;
      padding: 0 10px;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 13px;
      position: relative;
    }
    body.product-shell .image-nav:hover {
      background: #f3f7fc;
      color: var(--color-text);
    }
    body.product-shell .image-nav.active {
      background: transparent;
      color: var(--color-primary);
    }
    body.product-shell .image-nav.active::after {
      content: "";
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 0;
      height: 3px;
      border-radius: 999px 999px 0 0;
      background: var(--color-primary);
    }
    body.product-shell .image-nav svg {
      width: 15px;
      height: 15px;
    }
    body.product-shell .account-menu {
      width: auto;
      max-width: min(38vw, 390px);
      min-width: 0;
      min-height: 44px;
      height: auto;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    body.product-shell .account-menu-top {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    body.product-shell .sketch-status-chip {
      flex: 0 0 auto;
      min-height: 26px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 9px;
      border: 1px solid #cfe2ff;
      border-radius: 999px;
      background: #eef6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }
    body.product-shell .sketch-status-chip span {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
    }
    body.product-shell .account-identity {
      min-width: 0;
      gap: 8px;
    }
    body.product-shell .account-avatar {
      width: 26px;
      height: 26px;
      color: #172033;
    }
    body.product-shell .account-copy {
      min-width: 0;
      max-width: 132px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    body.product-shell .account-name {
      min-width: 0;
      font-size: 13px;
      font-weight: 800;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.product-shell .account-meta {
      min-width: 0;
      color: var(--color-text-muted);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.product-shell .account-controls {
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 8px;
    }
    body.product-shell .account-menu > form {
      flex: 0 0 auto;
    }
    body.product-shell .theme-toggle,
    body.product-shell .language-select,
    body.product-shell .account-shortcut,
    body.product-shell .account-menu > form > button {
      min-height: 34px;
      height: 34px;
      border-radius: 7px;
      background: #ffffff;
    }
    body.product-shell .panel,
    body.product-shell .section-card,
    body.product-shell .card,
    body.product-shell .metric-card {
      border-color: var(--color-border);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    body.product-shell .section-card {
      padding: 16px;
    }
    body.product-shell .metric,
    body.product-shell .metric-card,
    body.product-shell .rules-prereq-card,
    body.product-shell .ops-category-section,
    body.product-shell .ops-selection-review,
    body.product-shell .ops-template-settings {
      border-radius: 8px;
      background: #f8fafc;
    }
    body.product-shell table {
      background: #ffffff;
    }
    body.product-shell th {
      background: var(--color-table-header-bg);
      color: #3f4b5f;
      font-size: 12px;
      font-weight: 850;
    }
    body.product-shell td {
      background: #ffffff;
    }
    body.ops-shell .product-page > .panel {
      display: grid;
      gap: 16px;
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }
    body.ops-shell [data-ops-panel] > .panel-title-toolbar {
      min-width: 0;
      min-height: 68px;
      padding: 16px 18px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    body.ops-shell [data-ops-panel] > .panel-title-toolbar h2 {
      font-size: 19px;
      line-height: 1.1;
    }
    body.ops-shell [data-ops-panel] > .panel-title-toolbar p {
      margin-top: 5px;
      font-size: 13px;
    }
    body.ops-shell [data-ops-panel] > .section-card,
    body.ops-shell [data-ops-panel] > .grid > .section-card,
    body.ops-shell [data-ops-panel] .metric-card,
    body.ops-shell [data-ops-panel] .status-stat {
      min-width: 0;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.94);
    }
    body.ops-shell .toolbar,
    body.ops-shell .actions,
    body.ops-shell .badge-row,
    body.ops-shell .meta {
      min-width: 0;
    }
    body.ops-shell .toolbar > *,
    body.ops-shell .actions > *,
    body.ops-shell .badge-row > *,
    body.ops-shell .meta > * {
      min-width: 0;
    }
    body.ops-shell .ops-data-table {
      width: 100%;
      max-width: 100%;
    }
    body.ops-shell .ops-data-table th,
    body.ops-shell .ops-data-table td {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    body.ops-shell .ops-dashboard-card-grid,
    body.ops-shell .ops-metric-grid {
      gap: 12px;
    }
    .app-header {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
    }
    .app-chrome {
      position: relative;
      top: auto;
      z-index: 20;
      display: grid;
      gap: var(--space-3);
      padding: 10px;
      background: color-mix(in srgb, var(--color-surface-raised) 94%, transparent);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      backdrop-filter: blur(16px);
    }
    .route-header {
      gap: var(--space-2);
    }
    .app-header-top {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 300px);
      align-items: center;
      gap: var(--space-3);
    }
    .app-nav-cluster {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(180px, 185px) minmax(0, 1fr);
      align-items: center;
      gap: var(--space-3);
    }
    .app-brand {
      min-width: 0;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      display: inline-grid;
      place-items: center;
      border-radius: 8px;
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0;
    }
    .brand-copy {
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    .brand-copy strong {
      min-width: 0;
      color: var(--color-text);
      font-size: 13px;
      font-weight: 950;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }
    .brand-copy span {
      min-width: 0;
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 750;
      line-height: 1.25;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
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
      grid-template-columns: repeat(auto-fit, minmax(98px, 1fr));
      grid-auto-rows: 44px;
      height: auto;
      gap: 6px;
      align-items: stretch;
      align-self: center;
    }
    .image-nav {
      min-height: 44px;
      height: 44px;
      display: inline-grid;
      grid-template-columns: auto auto;
      align-content: center;
      align-items: center;
      justify-content: center;
      justify-items: center;
      gap: 7px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
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
      width: 17px;
      height: 17px;
      display: block;
      color: currentColor;
    }
    .image-nav span {
      overflow-wrap: anywhere;
      line-height: 1.12;
    }
    .account-menu {
      flex: 0 0 auto;
      min-height: 54px;
      height: 100%;
      min-width: 0;
      display: flex;
      align-items: stretch;
      justify-content: flex-end;
      gap: 8px;
      padding: 7px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
    }
    .account-menu-top {
      flex: 1 1 auto;
      display: grid;
      align-content: center;
      justify-content: stretch;
      gap: 4px;
      min-width: 0;
    }
    .account-menu .account-identity {
      display: flex;
    }
    .account-menu .language-control span {
      display: none;
    }
    .account-menu .language-control {
      min-width: 76px;
    }
    .account-controls {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .account-shortcut {
      width: auto;
      min-width: 52px;
      min-height: 30px;
      padding: 5px 8px;
      font-size: 12px;
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
      width: 28px;
      height: 28px;
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
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .account-meta {
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 850;
    }
    .account-menu > form {
      width: auto;
      margin: 0;
      display: flex;
      align-items: center;
    }
    .account-menu > form > button {
      width: auto;
      min-width: 58px;
      min-height: 34px;
      padding: 5px 7px;
      font-size: 12px;
    }
    h1, h2, h3 { margin: 0; letter-spacing: 0; }
    h1 { font-size: clamp(24px, 2.2vw, 32px); line-height: 1.08; }
    h2 { font-size: 19px; }
    h3 { font-size: 15px; }
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
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 8px 12px;
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
    button:disabled,
    .button-primary:disabled,
    .button-secondary:disabled,
    button[aria-disabled="true"],
    .button-primary[aria-disabled="true"],
    .button-secondary[aria-disabled="true"] {
      opacity: 0.58;
      cursor: not-allowed;
      box-shadow: none;
      filter: saturate(0.72);
    }
    button[aria-disabled="true"],
    .button-primary[aria-disabled="true"],
    .button-secondary[aria-disabled="true"] {
      cursor: help;
    }
    .button-primary.is-blocked,
    button.primary.is-blocked {
      background: var(--color-warning-bg);
      border-color: color-mix(in srgb, var(--color-warning) 62%, var(--color-border));
      color: var(--color-warning);
    }
    .button-danger,
    button.danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: var(--color-on-danger);
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
      width: 34px;
      min-width: 34px;
      min-height: 34px;
      height: 34px;
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      padding: 0;
      border-radius: 999px;
      font-size: 0;
    }
    .language-control {
      width: auto;
      min-width: 88px;
      flex: 0 0 auto;
      display: grid;
      gap: 3px;
      color: var(--color-text-muted);
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }
    .language-control span {
      line-height: 1;
    }
    .language-select {
      width: 100%;
      min-height: 34px;
      height: 34px;
      padding: 5px 8px;
      border-radius: var(--radius-md);
      font-size: 12px;
      font-weight: 900;
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
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
    }
    .panel,
    .section-card,
    .card {
      display: grid;
      gap: var(--space-4);
      padding: 18px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-4);
    }
    .ops-metric-grid,
    .ops-dashboard-card-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .ops-dashboard-card-grid .section-card {
      min-height: 142px;
      align-content: start;
    }
    .split-grid {
      display: grid;
      grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
      gap: var(--space-4);
      align-items: start;
    }
    .metric-card {
      min-height: 82px;
      display: grid;
      align-content: center;
      gap: var(--space-1);
      padding: 13px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
    }
    .metric-card span {
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .metric-card strong {
      color: var(--color-text);
      font-size: 25px;
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
      min-height: 58px;
      display: grid;
      align-content: center;
      gap: 3px;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
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
    .panel-title-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }
    .panel-title-toolbar > .refresh-icon-button {
      justify-self: end;
    }
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
      min-height: 24px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--color-primary-weak-bg);
      color: var(--color-primary-weak-text);
      font-size: 11px;
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
      min-width: 0;
      max-width: 100%;
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
    .audit-date-input {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0;
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
    .check-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 38px;
    }
    .check-inline input {
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
      min-height: clamp(180px, 44vw, 300px);
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
      box-shadow: var(--overlay-stage-gloss-shadow);
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
      filter: var(--overlay-point-shadow);
      cursor: grab;
      pointer-events: auto;
    }
    .ops-geometry-overlay .ops-geometry-touch-target {
      fill: transparent;
      stroke: transparent;
      pointer-events: auto;
    }
    .ops-geometry-overlay .ops-geometry-point.is-active {
      cursor: grabbing;
    }
    .ops-geometry-overlay .ops-geometry-point circle:not(.ops-geometry-touch-target) {
      fill: var(--overlay-point-fill);
      stroke: var(--overlay-point-text);
      stroke-width: 0.4;
      vector-effect: non-scaling-stroke;
    }
    .ops-geometry-overlay .ops-geometry-point.is-active circle:not(.ops-geometry-touch-target) {
      fill: var(--overlay-box-selected);
      stroke-width: 0.6;
    }
    .ops-geometry-overlay .ops-geometry-point .ops-geometry-touch-target {
      fill: transparent;
      stroke: transparent;
    }
    .ops-geometry-overlay .ops-geometry-point text {
      fill: var(--overlay-point-text);
      font-size: 1.45px;
      font-weight: 900;
      pointer-events: none;
    }
    .ops-geometry-overlay .ops-geometry-badge rect {
      fill: var(--overlay-label-bg);
      stroke: var(--overlay-badge-stroke);
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
    .clipboard-fallback {
      margin-top: var(--space-3);
      padding: var(--space-3);
      display: grid;
      gap: var(--space-2);
      border: 1px solid color-mix(in srgb, var(--color-warning) 46%, var(--color-border));
      border-radius: var(--radius-md);
      background: var(--color-warning-bg);
    }
    .clipboard-fallback strong {
      color: var(--color-warning);
      font-size: 13px;
      font-weight: 950;
    }
    .clipboard-fallback p {
      margin: 2px 0 0;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 800;
    }
    .clipboard-fallback textarea {
      min-height: 92px;
      resize: vertical;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.45;
    }
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
      font-size: 12px;
    }
    th,
    td {
      border-bottom: 1px solid var(--color-table-border);
      padding: 8px 9px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--color-table-header-bg);
      color: var(--color-text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0;
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
    .audit-list {
      display: grid;
      gap: var(--space-3);
    }
    .audit-controls,
    .audit-presets,
    .audit-toolbar,
    .audit-entry-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      align-items: end;
    }
    .audit-filter-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(170px, 1fr));
      gap: var(--space-2);
      flex: 1 1 520px;
      min-width: 0;
    }
    .audit-filter-grid label {
      display: grid;
      gap: 4px;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
      min-width: 0;
    }
    .audit-toolbar {
      justify-content: flex-end;
    }
    .audit-presets {
      justify-content: flex-start;
    }
    .audit-source-label {
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .audit-entry {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
    }
    .audit-entry-head,
    .audit-entry-meta,
    .audit-diff-grid {
      display: grid;
      gap: var(--space-2);
    }
    .audit-entry-head {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }
    .audit-entry-head span,
    .audit-entry-meta {
      color: var(--color-text-muted);
      font-size: 12px;
    }
    .audit-entry-meta {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .audit-entry-meta span {
      overflow-wrap: anywhere;
    }
    .audit-review-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }
    .audit-entry details summary {
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .audit-diff-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: var(--space-2);
    }
    .audit-detail-modal {
      width: min(920px, calc(100vw - 32px));
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .audit-detail-modal::backdrop {
      background: var(--color-modal-backdrop);
    }
    .audit-detail-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-3);
      align-items: start;
      margin-bottom: var(--space-3);
    }
    .audit-detail-head p {
      margin: 4px 0 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .validation-list {
      display: grid;
      gap: var(--space-2);
    }
    .validation-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-3);
      align-items: start;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
    }
    .validation-item strong {
      display: block;
      margin-bottom: 2px;
    }
    .validation-item p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1.4;
    }
    .validation-item .compact-list {
      margin: var(--space-2) 0 0;
      padding-left: 18px;
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .validation-item.warn {
      border-color: color-mix(in srgb, var(--color-warning) 56%, var(--color-border));
    }
    .validation-item.bad {
      border-color: color-mix(in srgb, var(--color-danger) 56%, var(--color-border));
    }
    .event-evidence-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }
    .root-cause-list {
      display: grid;
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
    .root-cause-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2) var(--space-3);
      align-items: start;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
    }
    .root-cause-item.warn {
      border-color: color-mix(in srgb, var(--color-warning) 56%, var(--color-border));
    }
    .root-cause-item.bad {
      border-color: color-mix(in srgb, var(--color-danger) 56%, var(--color-border));
    }
    .root-cause-item strong {
      display: block;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .root-cause-item p {
      margin: 2px 0 0;
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .root-cause-action {
      grid-column: 1 / -1;
    }
    .root-cause-correlation {
      justify-self: end;
      max-width: 100%;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: var(--color-info-bg);
      color: var(--color-info);
      font-family: var(--font-mono);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .root-cause-evidence {
      grid-column: 1 / -1;
      color: var(--color-text);
      font-weight: 600;
    }
    .root-cause-log {
      grid-column: 1 / -1;
      padding: 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-code-bg);
      color: var(--color-code-text);
      font-family: var(--font-mono);
    }
    .root-cause-next-action {
      justify-self: start;
      grid-column: 1 / -1;
    }
    .root-cause-action-output {
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-3);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
      min-width: 0;
    }
    .root-cause-action-output[hidden] {
      display: none;
    }
    .root-cause-action-output ul {
      display: grid;
      gap: 4px;
      margin: 0;
      padding-left: 18px;
    }
    .root-cause-action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .root-cause-action-output pre {
      max-width: 100%;
      margin: 0;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
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
      min-height: 136px;
      display: grid;
      align-content: start;
      gap: 10px;
      padding: 14px 16px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .rules-prereq-card .actions {
      margin-top: auto;
    }
    .rules-prereq-card strong {
      color: var(--color-text);
      font-size: 22px;
      font-variant-numeric: tabular-nums;
    }
    .rules-prereq-card p {
      font-size: 13px;
      line-height: 1.5;
    }
    .ops-scenario-builder {
      gap: var(--space-4);
    }
    .scenario-builder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-3);
      align-items: end;
    }
    .scenario-builder-review {
      display: grid;
      grid-template-columns: minmax(220px, 0.7fr) minmax(260px, 1.3fr);
      gap: var(--space-3);
      align-items: stretch;
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-muted);
    }
    .scenario-builder-review strong {
      color: var(--color-text);
      font-size: 14px;
    }
    .scenario-builder-draft {
      min-height: 128px;
      max-height: 260px;
      margin: 0;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-elevated);
      color: var(--color-text);
      overflow: auto;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
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
    .ops-data-table,
    .ops-responsive-table,
    .ops-rules-table,
    .user-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      min-width: 0;
    }
    .ops-rules-col-id { width: 64px; }
    .ops-rules-col-source { width: auto; }
    .ops-rules-col-template { width: 140px; }
    .ops-rules-col-profile { width: 140px; }
    .ops-rules-col-tracking { width: 128px; }
    .ops-rules-col-geometry { width: 92px; }
    .ops-rules-col-output { width: 200px; }
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
    .event-record-col-event { width: 156px; }
    .event-record-col-status { width: 92px; }
    .event-record-col-stream { width: auto; }
    .event-record-col-track { width: 76px; }
    .event-record-col-scenario { width: 142px; }
    .event-record-col-evidence { width: 156px; }
    .event-record-col-time { width: 156px; }
    .user-col-username { width: 136px; }
    .user-col-name { width: 118px; }
    .user-col-role { width: 96px; }
    .user-col-status { width: 84px; }
    .user-col-scopes { width: auto; }
    .user-col-last-login { width: 132px; }
    .user-col-locked-until { width: 108px; }
    .user-col-password { width: 84px; }
    .user-col-actions { width: 166px; }
    .request-col-username { width: 136px; }
    .request-col-name { width: 124px; }
    .request-col-contact { width: 136px; }
    .request-col-channel { width: 104px; }
    .request-col-reason { width: auto; }
    .request-col-status { width: 84px; }
    .request-col-decision { width: 132px; }
    .request-col-actions { width: 148px; }
    .ops-data-table th,
    .ops-data-table td,
    .user-table th,
    .user-table td,
    .ops-rules-table th,
    .ops-rules-table td {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      min-width: 0;
      max-width: 100%;
    }
    .ops-data-table td > * {
      max-width: 100%;
      min-width: 0;
    }
    .ops-data-table .table-actions,
    .ops-data-table .ops-row-actions,
    .ops-data-table .ops-rule-row-actions,
    .ops-data-table .user-row-actions,
    .ops-data-table .channel-status-actions,
    .ops-data-table .channel-stream-actions,
    .ops-data-table .channel-row-actions {
      max-width: 100%;
      min-width: 0;
    }
    .ops-data-table button {
      max-width: 100%;
    }
    .ops-row-actions {
      max-width: 100%;
      min-width: 0;
    }
    .ops-context-row-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: nowrap;
    }
    .ops-context-actions {
      position: relative;
      flex: 0 0 auto;
    }
    .ops-context-actions > summary {
      min-height: 32px;
      padding: 6px 9px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-muted);
      color: var(--color-text);
      cursor: pointer;
      font-size: 11px;
      font-weight: 850;
      line-height: 1.2;
      list-style: none;
      white-space: nowrap;
      user-select: none;
    }
    .ops-context-actions > summary::-webkit-details-marker {
      display: none;
    }
    .ops-context-actions[open] > summary {
      border-color: var(--color-primary);
      background: var(--color-primary-weak-bg);
      color: var(--color-primary);
    }
    .ops-context-actions-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 20;
      display: grid;
      gap: var(--space-2);
      min-width: 132px;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-elevated);
      box-shadow: var(--shadow-lg);
    }
    .ops-context-actions-menu button,
    .ops-context-actions-menu .button,
    .ops-context-actions-menu .button-secondary {
      width: 100%;
      justify-content: flex-start;
      text-align: left;
    }
    .ops-status-actions,
    .ops-stream-actions {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
    }
    .ops-detail-panel > .toolbar {
      align-items: flex-start;
    }
    .ops-detail-panel > .toolbar .actions {
      min-width: 0;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .ops-rules-va-table {
      min-width: 0;
    }
    .ops-rules-table .table-actions {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .event-record-controls label {
      min-width: 128px;
    }
    .event-review-controls label {
      min-width: 142px;
    }
    .event-review-table select,
    .event-review-note-input {
      width: 100%;
      min-width: 0;
    }
    .event-review-actions {
      display: grid;
      gap: var(--space-2);
      justify-items: start;
    }
    .ops-alert-delivery-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-3);
      align-items: end;
    }
    .ops-alert-delivery-form .actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .alert-delivery-table .table-cell-note {
      overflow-wrap: anywhere;
    }
    .incident-timeline-controls {
      align-items: end;
    }
    .incident-timeline-controls label {
      min-width: 150px;
      display: grid;
      gap: 4px;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 850;
    }
    .incident-timeline-controls button {
      min-height: 38px;
      white-space: nowrap;
    }
    .incident-workflow {
      display: grid;
      gap: 4px;
      color: var(--color-text-muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .incident-workflow span {
      overflow-wrap: anywhere;
    }
    .incident-workflow strong {
      color: var(--color-text);
      margin-right: 4px;
    }
    .event-record-controls .check-inline {
      min-width: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 38px;
    }
    .event-record-controls .check-inline input {
      width: auto;
      min-height: auto;
    }
    .event-evidence-cell {
      display: grid;
      gap: 4px;
    }
    .scope-template-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      align-items: center;
    }
    .scope-template-actions button {
      max-width: 100%;
    }
    .user-lifecycle-policy .status-stat strong {
      font-size: 16px;
      line-height: 1.35;
    }
    .user-reset-password-panel {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
    }
    .user-reset-password-panel > div:first-child {
      display: grid;
      gap: 4px;
    }
    .user-reset-password-panel strong {
      color: var(--color-text);
      font-size: 14px;
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
      min-width: 0;
      max-width: 100%;
      font-size: 13px;
      color: var(--color-text);
      line-height: 1.45;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .ops-rule-value-stack > *,
    .user-value-stack > * {
      min-width: 0;
      max-width: 100%;
    }
    .ops-rule-note,
    .user-note {
      display: block;
      color: var(--color-text-muted);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      word-break: break-word;
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
    .ops-rule-row-actions.ops-context-row-actions,
    .channel-row-actions.ops-context-row-actions,
    .user-row-actions.ops-context-row-actions {
      display: grid;
      grid-template-columns: none;
      width: 100%;
      align-items: stretch;
      justify-content: stretch;
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
    .channel-col-name { width: 18%; }
    .channel-col-kind { width: 130px; }
    .channel-col-status { width: 112px; }
    .channel-col-input { width: auto; }
    .channel-col-live-url,
    .channel-col-va-url { width: 172px; }
    .channel-col-actions { width: 150px; }
    .channel-id-cell,
    .channel-name-stack,
    .channel-kind-cell,
    .channel-input-stack {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .channel-name-stack {
      display: grid;
      gap: 3px;
    }
    .channel-name-stack strong,
    .channel-name-stack span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .channel-name-stack span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .channel-status-actions {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
    }
    .channel-stream-actions {
      display: grid;
      width: 100%;
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
    .channel-row-actions.ops-context-row-actions button,
    .user-row-actions.ops-context-row-actions button {
      width: 100%;
      min-width: 0;
    }
    .ops-rule-row-actions.ops-context-row-actions button,
    .ops-rule-row-actions.ops-context-row-actions .ops-context-actions,
    .ops-rule-row-actions.ops-context-row-actions .ops-context-actions > summary,
    .channel-row-actions.ops-context-row-actions .ops-context-actions,
    .channel-row-actions.ops-context-row-actions .ops-context-actions > summary,
    .user-row-actions.ops-context-row-actions .ops-context-actions,
    .user-row-actions.ops-context-row-actions .ops-context-actions > summary {
      width: 100%;
      min-width: 0;
    }
    .user-row-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-2);
      min-width: 0;
    }
    .request-approve-view {
      display: grid;
      gap: 4px;
      font-size: 11px;
      color: var(--muted);
    }
    .request-approve-view input {
      width: 100%;
      min-width: 0;
      min-height: 32px;
      padding: 6px 9px;
      font-size: 12px;
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
      width: 100%;
      min-height: 32px;
      padding: 6px 9px;
      font-size: 11px;
      white-space: nowrap;
    }
    .channel-stream-actions button[data-copy-stream-channel][title^="ONVIF"],
    .channel-stream-actions button[data-ops-rule-copy-kind][title^="ONVIF"] {
      font-size: 10px;
    }
    .ops-rules-table .channel-stream-actions {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .ops-rules-table .channel-stream-actions button {
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: anywhere;
      line-height: 1.15;
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
      .app-nav-cluster { grid-template-columns: 1fr; }
      .header-utilities { justify-content: flex-start; }
      .account-menu { width: 100%; }
      body.product-shell .account-menu {
        width: 100%;
        max-width: 100%;
        grid-template-columns: 1fr;
        justify-content: stretch;
        align-items: start;
        gap: 8px;
        padding: 0 0 10px;
      }
      .account-menu-top,
      body.product-shell .account-menu-top {
        justify-content: flex-start;
        flex-wrap: wrap;
      }
      body.product-shell .account-controls {
        flex-wrap: wrap;
      }
      body.product-shell .account-menu > form {
        justify-self: start;
      }
      .image-nav-tabs {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-auto-flow: row;
        grid-auto-columns: auto;
        justify-content: stretch;
      }
      .image-nav { width: 100%; min-width: 0; }
      .nav-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nav { width: 100%; }
      .audit-controls {
        display: grid;
        grid-template-columns: 1fr;
        align-items: stretch;
      }
      .audit-filter-grid {
        width: 100%;
        flex: 1 1 auto;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .audit-toolbar,
      .audit-presets {
        justify-content: flex-start;
      }
      .grid.rules-metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ops-geometry-status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 1180px) and (min-width: 861px) {
      body.product-shell .app-header-top,
      body.client-shell .app-header-top {
        grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
        align-items: center;
      }
      body.product-shell .app-nav-cluster,
      body.client-shell .app-nav-cluster {
        grid-template-columns: minmax(190px, max-content) minmax(0, 1fr);
        gap: 10px;
      }
      body.product-shell .brand-copy,
      body.client-shell .brand-copy {
        max-width: min(34vw, 390px);
      }
      body.product-shell .image-nav-tabs,
      body.client-shell .image-nav-tabs {
        grid-template-columns: none;
        grid-auto-flow: column;
        grid-auto-columns: max-content;
      }
      body.product-shell .image-nav,
      body.client-shell .image-nav {
        padding: 0 8px;
      }
      body.product-shell .account-menu,
      body.client-shell .account-menu {
        max-width: 340px;
        min-height: 44px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        padding: 0;
      }
      body.product-shell .account-menu-top,
      body.client-shell .account-menu-top {
        min-width: 0;
        height: auto;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
      }
      body.product-shell .account-copy,
      body.client-shell .account-copy {
        max-width: 104px;
      }
      body.product-shell .sketch-status-chip,
      body.client-shell .sketch-status-chip {
        padding: 0 7px;
      }
      .app-header-top {
        grid-template-columns: minmax(0, 1fr) minmax(280px, 300px);
        align-items: stretch;
      }
      .app-header-top .image-nav-tabs:not(.client-image-nav-tabs) {
        grid-template-columns: repeat(auto-fit, minmax(98px, 1fr));
      }
      .account-menu {
        min-height: 64px;
        align-content: center;
        gap: var(--space-2);
        padding: 6px 8px;
      }
      .account-menu-top {
        height: 100%;
        justify-content: flex-end;
        align-items: center;
      }
      .account-identity {
        align-items: center;
      }
      body.client-shell .app-header-top {
        grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
        align-items: center;
      }
      body.client-shell .account-menu {
        max-width: 340px;
        min-height: 44px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        padding: 0;
      }
      body.client-shell .account-menu-top {
        min-width: 0;
        height: auto;
        justify-content: flex-end;
        gap: 8px;
      }
      body.client-shell .account-identity {
        display: flex;
      }
      body.client-shell .account-menu > form {
        width: auto;
      }
      body.client-shell .account-menu > form > button {
        width: auto;
        min-width: 52px;
        padding: 5px 7px;
      }
      body.client-shell .language-control {
        min-width: 64px;
      }
      body.client-shell .language-select {
        padding: 4px 5px;
        font-size: 11px;
      }
      body.client-shell .theme-toggle {
        width: 30px;
        min-width: 30px;
        min-height: 30px;
        height: 30px;
      }
    }
    @media (max-width: 1040px) {
      .ops-metric-grid,
      .ops-dashboard-card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ops-responsive-table,
      .ops-responsive-table tbody,
      .ops-responsive-table tr,
      .ops-responsive-table td {
        display: block;
        width: 100%;
      }
      .ops-responsive-table {
        min-width: 0;
        table-layout: auto;
      }
      .ops-responsive-table colgroup,
      .ops-responsive-table thead {
        display: none;
      }
      .ops-responsive-table tr {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-table-border);
      }
      .ops-responsive-table tr:last-child {
        border-bottom: 0;
      }
      .ops-responsive-table th,
      .ops-responsive-table td {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
      }
      .ops-responsive-table td {
        min-height: 42px;
        display: grid;
        grid-template-columns: minmax(108px, 132px) minmax(0, 1fr);
        gap: var(--space-3);
        align-items: start;
        border-bottom: 0;
        padding: 8px var(--space-3);
        white-space: normal;
      }
      .ops-responsive-table td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .ops-responsive-table .table-cell-status,
      .ops-responsive-table .table-cell-actions {
        min-width: 0;
        width: auto;
      }
      .ops-responsive-table .table-actions {
        justify-content: flex-start;
      }
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
        display: grid;
        grid-template-columns: minmax(108px, 28%) minmax(0, 1fr);
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
      .event-record-table,
      .event-review-table,
      .alert-delivery-table,
      .event-record-table tbody,
      .event-review-table tbody,
      .alert-delivery-table tbody,
      .event-record-table tr,
      .event-review-table tr,
      .alert-delivery-table tr,
      .event-record-table td,
      .event-review-table td,
      .alert-delivery-table td,
      .user-table,
      .user-table tbody,
      .user-table tr,
      .user-table td {
        display: block;
        width: 100%;
      }
      .ops-rules-table,
      .event-record-table,
      .event-review-table,
      .alert-delivery-table,
      .user-table {
        min-width: 0;
        table-layout: auto;
      }
      .ops-rules-table colgroup,
      .ops-rules-table thead,
      .event-record-table colgroup,
      .event-record-table thead,
      .event-review-table colgroup,
      .event-review-table thead,
      .alert-delivery-table colgroup,
      .alert-delivery-table thead,
      .user-table colgroup,
      .user-table thead {
        display: none;
      }
      .ops-rules-table tr,
      .event-record-table tr,
      .event-review-table tr,
      .alert-delivery-table tr,
      .user-table tr {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-table-border);
      }
      .ops-rules-table tr:last-child,
      .event-record-table tr:last-child,
      .event-review-table tr:last-child,
      .alert-delivery-table tr:last-child,
      .user-table tr:last-child {
        border-bottom: 0;
      }
      .ops-rules-table th,
      .ops-rules-table td,
      .event-record-table th,
      .event-record-table td,
      .event-review-table th,
      .event-review-table td,
      .alert-delivery-table th,
      .alert-delivery-table td,
      .user-table th,
      .user-table td {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
      }
      .ops-rules-table td,
      .event-record-table td,
      .event-review-table td,
      .alert-delivery-table td,
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
      .event-record-table td::before,
      .event-review-table td::before,
      .alert-delivery-table td::before,
      .user-table td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .ops-rules-table .table-cell-status,
      .ops-rules-table .table-cell-actions,
      .event-record-table .table-cell-status,
      .event-record-table .table-cell-actions,
      .event-review-table .table-cell-status,
      .event-review-table .table-cell-actions,
      .alert-delivery-table .table-cell-status,
      .alert-delivery-table .table-cell-actions,
      .user-table .table-cell-status,
      .user-table .table-cell-actions {
        min-width: 0;
        width: auto;
      }
      .ops-rules-table .table-actions {
        justify-content: flex-start;
      }
      .event-record-controls {
        width: 100%;
      }
      .event-review-controls {
        width: 100%;
      }
      .incident-timeline-controls {
        width: 100%;
      }
      .incident-timeline-controls label {
        min-width: min(100%, 150px);
        flex: 1 1 150px;
      }
      .incident-timeline-controls button {
        flex: 1 1 120px;
      }
    }
    @media (max-width: 560px) {
      .grid.rules-metrics-grid {
        grid-template-columns: 1fr;
      }
      .ops-metric-grid,
      .ops-dashboard-card-grid {
        grid-template-columns: 1fr;
      }
      .ops-va-stage-grid {
        grid-template-columns: 1fr;
      }
      .scenario-builder-review {
        grid-template-columns: 1fr;
      }
      .ops-geometry-status-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .ops-geometry-status-card {
        padding: 8px 9px;
      }
      .ops-geometry-status-card strong {
        font-size: 13px;
      }
      .ops-rule-preview-stage {
        min-height: 180px;
        border-radius: var(--radius-md);
      }
      .ops-geometry-toolbar .actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
      }
      .ops-geometry-toolbar .actions > button {
        width: 100%;
        min-width: 0;
      }
      .ops-context-row-actions,
      .ops-rule-row-actions.ops-context-row-actions,
      .channel-row-actions.ops-context-row-actions,
      .user-row-actions.ops-context-row-actions {
        display: grid;
        grid-template-columns: 1fr;
        width: 100%;
      }
      .ops-context-actions,
      .ops-context-actions > summary {
        width: 100%;
      }
      .ops-context-actions-menu {
        position: static;
        margin-top: var(--space-2);
        box-shadow: none;
      }
      .channel-table td {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .ops-responsive-table td {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .channel-row-actions {
        grid-template-columns: 1fr;
      }
      .ops-rules-table td,
      .event-record-table td,
      .alert-delivery-table td,
      .user-table td {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .channel-table td::before,
      .ops-responsive-table td::before,
      .ops-rules-table td::before,
      .event-record-table td::before,
      .alert-delivery-table td::before,
      .user-table td::before {
        line-height: 1.35;
      }
      .ops-rules-table .table-actions,
      .event-record-controls,
      .scope-template-actions,
      .ops-rule-row-actions,
      .audit-controls,
      .audit-filter-grid,
      .audit-presets,
      .audit-toolbar,
      .audit-entry-head,
      .audit-entry-meta,
      .audit-review-flags,
      .audit-diff-grid,
      .audit-detail-head,
      .validation-item,
      .event-evidence-actions,
      .root-cause-item,
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
    main { max-width: 1440px; margin: 0 auto; padding: 18px 14px 40px; display: grid; gap: 16px; }
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
      grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
      width: 100%;
      align-items: center;
      gap: var(--space-3);
    }
    header.app-chrome .image-nav-tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(98px, 1fr));
      width: 100%;
      min-width: 0;
      gap: 6px;
    }
    .client-image-nav-tabs {
      flex: 1 1 320px;
      min-width: min(320px, 100%);
      grid-template-columns: repeat(2, minmax(104px, 1fr));
    }
    body.client-shell header.app-chrome .app-header-top {
      grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
      align-items: center;
    }
    body.client-shell .account-menu {
      max-width: min(38vw, 390px);
      min-height: 44px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      padding: 0;
    }
    body.client-shell .account-identity {
      display: flex;
    }
    body.client-shell .language-control {
      min-width: 64px;
    }
    body.client-shell .account-menu-top {
      min-width: 0;
      justify-content: flex-end;
      gap: 8px;
    }
    body.client-shell .account-menu > form > button {
      min-width: 52px;
      padding: 5px 7px;
    }
    body.client-shell .language-select {
      padding: 4px 5px;
      font-size: 11px;
    }
    body.client-shell .theme-toggle {
      width: 30px;
      min-width: 30px;
      min-height: 30px;
      height: 30px;
    }
    a.nav { min-height: 36px; display: inline-flex; align-items: center; border-radius: 6px; padding: 0 12px; background: var(--panel-soft); color: var(--text); text-decoration: none; font-weight: 900; }
    a.nav.active { background: var(--color-primary); color: var(--color-on-primary); }
    .workspace { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: 14px; align-items: start; }
    .workspace.live-workspace { grid-template-columns: 1fr; }
    .workspace.live-workspace > .panel:first-child { display: none; }
    .panel { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
    .views { display: grid; gap: 10px; }
    .view { width: 100%; text-align: left; display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--bg); color: var(--text); cursor: pointer; }
    .view.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--color-selection-ring); }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--color-primary-weak-text); font-size: 12px; font-weight: 900; }
    .chip.warn { background: var(--warn-soft); color: var(--warn); }
    .chip.bad { background: var(--bad-soft); color: var(--bad); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .metric { min-height: 76px; display: grid; align-content: center; gap: 4px; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--bg); }
    .metric span { color: var(--muted); font-size: 12px; font-weight: 800; }
    .metric strong { font-size: 20px; }
    .client-field-summary .metric strong {
      font-size: 17px;
      overflow-wrap: anywhere;
    }
    .client-dashboard-compare {
      min-width: 0;
    }
    .client-compare-toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: end;
    }
    .client-compare-toolbar label {
      display: grid;
      gap: 4px;
      min-width: min(180px, 100%);
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .client-preset-config {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg);
    }
    .client-preset-config summary {
      cursor: pointer;
      font-weight: 900;
    }
    .client-preset-config textarea {
      width: 100%;
      min-height: 120px;
      box-sizing: border-box;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.45;
    }
    .client-compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
    }
    .client-compare-card {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg);
    }
    .client-compare-card.warn { border-color: color-mix(in srgb, var(--warn) 52%, var(--line)); }
    .client-compare-card.bad { border-color: color-mix(in srgb, var(--bad) 52%, var(--line)); }
    .client-compare-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 8px;
    }
    .client-compare-head strong,
    .client-compare-card p {
      overflow-wrap: anywhere;
    }
    .client-compare-preset {
      margin: 0;
      color: var(--text);
      font-size: 13px;
      font-weight: 850;
    }
    .client-compare-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .client-compare-metrics span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .client-loading-state {
      min-height: 220px;
      display: grid;
      align-content: center;
    }
    .events { display: grid; gap: 8px; }
    .event { display: grid; gap: 5px; border-top: 1px solid var(--line); padding-top: 10px; }
    .event:first-child { border-top: 0; padding-top: 0; }
    button { min-height: 38px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-elevated); color: var(--color-text); padding: 0 14px; font-weight: 850; cursor: pointer; }
    .refresh-icon-button { width: 40px; min-width: 40px; min-height: 40px; height: 40px; display: inline-grid; place-items: center; padding: 0; border-radius: 999px; font-size: 0; }
    .refresh-icon { width: 20px; height: 20px; display: block; }
    button:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong); }
    .ghost { background: var(--color-bg-elevated); color: var(--color-text); }
    .empty { min-height: 80px; display: grid; align-content: center; gap: 8px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .client-copy-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .client-copy-actions button { min-height: 32px; padding: 0 10px; font-size: 12px; }
    .live-monitor { display: grid; gap: 12px; }
    .live-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto auto auto;
      gap: 10px;
      align-items: end;
    }
    .workspace-actions {
      position: relative;
      align-self: end;
    }
    .workspace-actions summary {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0 12px;
      background: var(--color-bg-elevated);
      color: var(--color-text);
      font-weight: 850;
      cursor: pointer;
      list-style: none;
    }
    .workspace-actions summary::-webkit-details-marker { display: none; }
    .workspace-actions summary::after { content: "⋯"; font-weight: 950; }
    .workspace-actions[open] summary {
      border-color: var(--color-border-strong);
      background: var(--color-surface-hover);
    }
    .workspace-actions button {
      margin-top: 6px;
      width: 100%;
      white-space: nowrap;
    }
    .live-layout-presets {
      display: grid;
      gap: 6px;
      min-width: 180px;
      margin-top: 6px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-soft);
    }
    .live-layout-presets .chip {
      justify-self: start;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .live-layout-presets button {
      margin-top: 0;
    }
    .live-workspace-layout {
      display: grid;
      grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    .live-workspace-layout[data-dock-side="right"] {
      grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    }
    .live-workspace-layout[data-dock-side="right"] .live-source-dock { order: 2; }
    .live-workspace-layout[data-dock-side="right"] .live-workspace-main { order: 1; }
    .live-source-dock {
      display: grid;
      gap: 10px;
      position: sticky;
      top: 12px;
      min-width: 0;
    }
    .live-source-dock-head {
      display: flex;
      gap: 8px;
      align-items: start;
      justify-content: space-between;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: var(--panel);
    }
    .live-source-dock-head h3 { margin: 0; font-size: 16px; }
    .live-source-dock-head p { margin: 4px 0 0; color: var(--muted); font-size: 12px; font-weight: 800; }
    .live-source-tree {
      display: grid;
      gap: 8px;
      max-height: min(64vh, 680px);
      overflow: auto;
      padding-right: 2px;
    }
    .live-source-group {
      display: grid;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      background: var(--panel);
    }
    .live-source-group summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 30px;
      cursor: pointer;
      color: var(--text);
      font-size: 12px;
      font-weight: 900;
      list-style-position: inside;
    }
    .live-source-group summary span {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
    }
    .live-source-floor {
      background: var(--bg);
      padding: 6px;
    }
    .live-source-leaves {
      display: grid;
      gap: 8px;
    }
    .live-source-node {
      width: 100%;
      min-width: 0;
      min-height: 64px;
      display: grid;
      gap: 6px;
      text-align: left;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: var(--bg);
      color: var(--text);
    }
    .live-source-node.active,
    .live-source-node:focus-visible {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--color-selection-ring);
    }
    .live-source-node.assigned { background: var(--panel-soft); }
    .live-source-node.limit-reached { opacity: 0.62; }
    .live-source-node.dragging { border-style: dashed; }
    .live-source-title {
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 14px;
      font-weight: 900;
    }
    .live-source-meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .live-workspace-main {
      display: grid;
      gap: 12px;
      min-width: 0;
    }
    .live-dock-event-feed {
      display: grid;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: var(--panel);
    }
    .live-dock-event-head,
    .live-dock-event-summary {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      min-width: 0;
    }
    .live-dock-event-head h3 { margin: 0; font-size: 16px; }
    .live-dock-event-summary strong,
    .live-dock-event-summary span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .live-dock-event-summary span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .live-dock-events { display: grid; gap: 8px; }
    .live-dock-event {
      display: grid;
      gap: 5px;
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }
    .live-dock-event:first-child { border-top: 0; padding-top: 0; }
    .live-dock-event strong,
    .live-dock-event span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .live-dock-event > span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
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
    .tile.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--color-selection-ring); }
    .tile:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; border-color: var(--accent); }
    .tile-head { display: grid; gap: 8px; }
    .tile-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .tile-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(110px, 150px); gap: 8px; }
    .tile-controls label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; font-weight: 800; }
    .tile-assignment {
      min-width: 0;
      display: grid;
      gap: 3px;
      border: 1px dashed var(--line);
      border-radius: 6px;
      padding: 8px;
      background: var(--panel-soft);
    }
    .tile-assignment span,
    .tile-assignment small {
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .tile-assignment strong {
      min-width: 0;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .live-drop-tile[data-drop-state="over"] {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--color-selection-ring);
    }
    .live-drop-tile[data-drop-state="over"] .tile-assignment {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .tile-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease;
    }
    .tile:hover .tile-actions,
    .tile:focus-within .tile-actions,
    .tile.selected .tile-actions {
      opacity: 1;
      pointer-events: auto;
    }
    .icon-button {
      width: 38px;
      min-width: 38px;
      height: 38px;
      min-height: 38px;
      display: inline-grid;
      place-items: center;
      padding: 0;
      border-radius: 999px;
      font-size: 15px;
      line-height: 1;
    }
    .icon-button[disabled] { opacity: 0.48; cursor: not-allowed; }
    .tile-action-primary { background: var(--color-primary); color: var(--color-on-primary); border-color: var(--color-primary); }
    .tile-stage { position: relative; min-height: 150px; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: var(--color-media-bg); display: grid; place-items: center; color: var(--color-code-text); }
    .live-grid[data-density="compact"] .tile-stage { min-height: 108px; }
    .tile-stage video { width: 100%; height: 100%; object-fit: contain; background: var(--color-media-bg); }
    .tile-stage span { position: absolute; inset: auto 10px 10px 10px; font-size: 12px; font-weight: 800; color: var(--color-code-text); }
    .tile-info-overlay {
      position: absolute;
      inset: auto 8px 8px 8px;
      display: grid;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      background: rgba(2, 6, 23, 0.78);
      color: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
      pointer-events: none;
    }
    .tile-info-overlay[hidden] { display: none; }
    .tile-info-overlay-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .tile-info-overlay-head strong,
    .tile-info-overlay-head span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      position: static;
      inset: auto;
      color: #ffffff;
    }
    .tile-info-overlay-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px;
    }
    .tile-info-overlay-grid span {
      position: static;
      inset: auto;
      display: grid;
      gap: 2px;
      min-width: 0;
      color: rgba(255, 255, 255, 0.72);
      font-size: 10px;
      line-height: 1.1;
    }
    .tile-info-overlay-grid strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffffff;
      font-size: 11px;
    }
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
    :root[data-theme="dark"] .chip { color: var(--color-primary-weak-text); }
    :root[data-theme="dark"] .chip.warn { color: var(--color-warning); }
    :root[data-theme="dark"] .chip.bad { color: var(--color-danger); }
    :root[data-theme="dark"] a.nav.active { background: var(--color-primary); color: var(--color-on-primary); }
    body.client-shell {
      --bg: #f5f7fb;
      --panel: #ffffff;
      --panel-soft: #f1f4f8;
      --line: #d8e0ea;
      --text: #152033;
      --muted: #667386;
      --accent: #3b82f6;
      --accent-soft: #e8f1ff;
      background: var(--bg);
      color: var(--text);
    }
    body.client-shell main.product-page {
      width: 100%;
      max-width: none;
      padding: 0;
      gap: 0;
    }
    body.client-shell .product-page > .workspace {
      width: 100%;
      margin: 0;
    }
    body.client-shell header.app-chrome {
      min-height: 60px;
      padding: 0 22px;
      border-width: 0 0 1px;
      border-radius: 0;
      background: rgba(255, 255, 255, 0.97);
      box-shadow: 0 1px 0 rgba(15, 23, 42, 0.06);
    }
    body.client-shell header.app-chrome .app-header-top {
      grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
      min-height: 60px;
      align-items: center;
      gap: 14px;
    }
    body.client-shell .app-nav-cluster {
      min-width: 0;
      grid-template-columns: minmax(220px, max-content) minmax(0, 1fr);
      gap: 16px;
    }
    body.client-shell .brand-copy {
      max-width: min(42vw, 520px);
    }
    body.client-shell .client-image-nav-tabs {
      width: auto;
      min-width: 0;
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      overflow-x: auto;
      scrollbar-width: none;
    }
    body.client-shell .client-image-nav-tabs::-webkit-scrollbar {
      display: none;
    }
    body.client-shell .account-menu {
      max-width: min(38vw, 390px);
      min-height: 44px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      padding: 0;
      border: 0;
      background: transparent;
    }
    body.client-shell .workspace.live-workspace {
      min-height: calc(100vh - 60px);
      background: #f5f7fb;
    }
    body.client-shell #detail.panel {
      width: 100%;
      min-height: calc(100vh - 60px);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    body.client-shell .client-workspace-shell:not(.live-workspace) {
      width: min(1480px, calc(100% - 32px));
      max-width: calc(100vw - 32px);
      margin: 16px auto 48px;
      display: grid;
      grid-template-columns: 345px minmax(0, 1fr);
      gap: 14px;
      align-items: stretch;
    }
    body.client-shell .client-workspace-shell:not(.live-workspace) #detail.panel {
      min-height: calc(100vh - 92px);
      padding: 0;
    }
    body.client-shell .client-channel-dock {
      position: sticky;
      top: 76px;
      min-width: 0;
      align-self: start;
      max-height: calc(100vh - 92px);
      overflow: auto;
      border-radius: 8px;
      background: #ffffff;
    }
    body.client-shell .client-dashboard-shell {
      min-width: 0;
      display: grid;
      gap: 14px;
    }
    body.client-shell .client-dashboard-head,
    body.client-shell .client-dashboard-shell > .summary,
    body.client-shell .client-dashboard-shell > .events {
      min-width: 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    body.client-shell .client-dashboard-head {
      align-items: start;
      gap: 12px;
    }
    body.client-shell .client-dashboard-head h2 {
      font-size: 20px;
      line-height: 1.1;
    }
    body.client-shell .client-dashboard-head .meta,
    body.client-shell .client-copy-actions {
      justify-content: flex-end;
    }
    body.client-shell .client-dashboard-shell .summary {
      grid-template-columns: repeat(auto-fit, minmax(164px, 1fr));
    }
    body.client-shell .live-monitor {
      position: relative;
      min-height: calc(100vh - 60px);
      gap: 0;
      background: #f5f7fb;
    }
    body.client-shell .live-toolbar {
      position: absolute;
      top: 14px;
      right: 22px;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0;
      pointer-events: auto;
    }
    body.client-shell .live-toolbar > .live-workspace-title {
      display: none;
    }
    body.client-shell .live-toolbar label {
      min-width: 78px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
    }
    body.client-shell .live-toolbar label select {
      min-height: 34px;
      border-radius: 7px;
      background: #ffffff;
      font-size: 12px;
    }
    body.client-shell .live-info-toggle {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #ffffff;
      white-space: nowrap;
    }
    body.client-shell .live-copy-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    body.client-shell .live-copy-actions button {
      min-height: 34px;
      padding: 0 10px;
      border-radius: 7px;
      background: #ffffff;
      font-size: 12px;
      white-space: nowrap;
    }
    body.client-shell .workspace-actions {
      align-self: center;
    }
    body.client-shell .workspace-actions summary {
      min-height: 36px;
      border-radius: 7px;
      background: #2f3540;
      color: #ffffff;
      border-color: #2f3540;
      font-size: 0;
      width: 42px;
      padding: 0;
    }
    body.client-shell .workspace-actions summary::after {
      content: "⋮";
      font-size: 22px;
      line-height: 1;
    }
    body.client-shell .workspace-actions[open] {
      z-index: 50;
    }
    body.client-shell .workspace-actions[open] summary {
      background: #2f3540;
      color: #ffffff;
    }
    body.client-shell .workspace-actions[open]::after {
      content: "";
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 180px;
      height: 0;
    }
    body.client-shell .live-layout-presets {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 55;
      min-width: 190px;
      padding: 10px;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
    }
    body.client-shell #liveAllStop {
      position: absolute;
      top: calc(100% + 178px);
      right: 0;
      z-index: 55;
      min-width: 190px;
      background: #ffffff;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
    }
    body.client-shell .summary,
    body.client-shell .detail-box {
      display: none;
    }
    body.client-shell .live-workspace-layout,
    body.client-shell .live-workspace-layout[data-dock-side],
    body.client-shell .live-workspace-layout[data-dock-side="right"] {
      min-height: calc(100vh - 60px);
      display: grid;
      grid-template-columns: 365px minmax(0, 1fr);
      gap: 0;
      align-items: stretch;
    }
    body.client-shell .live-workspace-layout[data-dock-side="right"] {
      grid-template-columns: minmax(0, 1fr) 365px;
    }
    body.client-shell .live-source-dock {
      position: sticky;
      top: 60px;
      align-self: stretch;
      height: calc(100vh - 60px);
      gap: 0;
      padding: 0;
      border-right: 1px solid var(--line);
      background: #ffffff;
      overflow: hidden;
    }
    body.client-shell .live-workspace-layout[data-dock-side="right"] .live-source-dock {
      border-right: 0;
      border-left: 1px solid var(--line);
    }
    body.client-shell .live-source-dock-head {
      min-height: 54px;
      padding: 16px 22px 10px;
      border: 0;
      border-radius: 0;
      background: #ffffff;
    }
    body.client-shell .live-source-dock-head h3 {
      font-size: 16px;
      letter-spacing: 0;
    }
    body.client-shell .live-source-dock-head p {
      display: none;
    }
    body.client-shell .live-source-search {
      position: relative;
      margin: 8px 22px 14px;
    }
    body.client-shell .live-source-search input {
      width: 100%;
      min-height: 36px;
      padding: 0 38px 0 12px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #ffffff;
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
    }
    body.client-shell .live-source-search span {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      font-size: 18px;
      line-height: 1;
    }
    body.client-shell .live-source-tree {
      max-height: calc(100vh - 386px);
      padding: 0 18px 12px;
      gap: 6px;
      overflow: auto;
    }
    body.client-shell .live-source-group {
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      gap: 4px;
    }
    body.client-shell .live-source-group summary {
      min-height: 30px;
      padding: 0 4px;
      color: #1f2a3d;
      font-size: 13px;
      font-weight: 800;
    }
    body.client-shell .live-source-floor summary {
      padding-left: 20px;
      color: #3f4b5f;
    }
    body.client-shell .live-source-leaves {
      gap: 6px;
      padding-left: 28px;
    }
    body.client-shell .live-source-node {
      min-height: 42px;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px 8px;
      padding: 8px 10px;
      border-radius: 7px;
      background: #ffffff;
    }
    body.client-shell .live-source-node.active {
      background: #e8f1ff;
      border-color: #b7d3ff;
      box-shadow: none;
    }
    body.client-shell .live-source-title {
      font-size: 13px;
    }
    body.client-shell .live-source-meta {
      grid-column: 1 / -1;
      font-size: 11px;
    }
    body.client-shell .live-dock-event-feed {
      margin-top: auto;
      max-height: 330px;
      padding: 14px 12px 18px;
      border-width: 1px 0 0;
      border-radius: 0;
      background: #ffffff;
      overflow: auto;
    }
    body.client-shell .live-dock-event-head {
      padding: 0 10px 8px;
    }
    body.client-shell .live-dock-event-head h3 {
      font-size: 16px;
    }
    body.client-shell .live-dock-event {
      min-height: 54px;
      padding: 10px;
      border: 1px solid #edf1f6;
      border-radius: 7px;
      background: #ffffff;
    }
    body.client-shell .live-workspace-main {
      min-height: calc(100vh - 60px);
      padding: 70px 8px 22px 16px;
      background: #f5f7fb;
    }
    body.client-shell .live-grid,
    body.client-shell .live-grid[data-grid-size] {
      height: calc(100vh - 92px);
      display: grid;
      gap: 8px;
      grid-auto-rows: minmax(0, 1fr);
    }
    body.client-shell .live-grid[data-grid-size="1"] {
      grid-template-columns: 1fr;
    }
    body.client-shell .live-grid[data-grid-size="2"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    body.client-shell .live-grid[data-grid-size="4"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
    }
    body.client-shell .live-grid[data-grid-size="6"],
    body.client-shell .live-grid[data-grid-size="9"] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    body.client-shell .tile,
    body.client-shell .live-grid[data-density="compact"] .tile {
      position: relative;
      min-height: 0;
      display: block;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #161b22;
      border: 1px solid #cfd8e5;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }
    body.client-shell .tile.selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
    }
    body.client-shell .tile-head {
      position: absolute;
      inset: 12px 12px auto 12px;
      z-index: 12;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 136px;
      align-items: flex-start;
      gap: 12px;
      pointer-events: none;
    }
    body.client-shell .tile-title {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
      justify-content: flex-start;
      overflow: hidden;
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
    }
    body.client-shell .tile-title span,
    body.client-shell .tile-actions span {
      position: static;
      inset: auto;
    }
    body.client-shell .tile-presence-dot {
      width: 7px;
      height: 7px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: #facc15;
      box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.18);
    }
    body.client-shell .tile-title h3 {
      min-width: 0;
      font-size: 15px;
      font-weight: 850;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.client-shell .tile-title .chip {
      flex: 0 0 auto;
      max-width: 100%;
      min-height: 22px;
      padding: 2px 7px;
      background: rgba(59, 130, 246, 0.9);
      color: #ffffff;
    }
    body.client-shell .tile-controls {
      display: none;
    }
    body.client-shell .tile-actions {
      position: static;
      opacity: 1;
      pointer-events: auto;
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      justify-self: end;
    }
    body.client-shell .tile-actions .icon-button {
      width: 40px;
      min-width: 40px;
      height: 40px;
      min-height: 40px;
      border-radius: 8px;
      border-color: rgba(255, 255, 255, 0.38);
      background: rgba(12, 18, 28, 0.66);
      color: #ffffff;
      backdrop-filter: blur(12px);
    }
    body.client-shell .tile-actions .tile-action-primary {
      background: rgba(59, 130, 246, 0.92);
      border-color: rgba(255, 255, 255, 0.46);
    }
    body.client-shell .tile-stage,
    body.client-shell .live-grid[data-density="compact"] .tile-stage {
      width: 100%;
      height: 100%;
      min-height: 100%;
      aspect-ratio: auto;
      border-radius: 0;
      background:
        linear-gradient(180deg, rgba(15, 23, 42, 0.20), rgba(15, 23, 42, 0.78)),
        radial-gradient(circle at 50% 35%, rgba(148, 163, 184, 0.25), transparent 34%),
        #151a22;
    }
    body.client-shell .tile[data-view-id=""] .tile-stage {
      border: 1px dashed rgba(255, 255, 255, 0.34);
      background:
        linear-gradient(180deg, rgba(15, 23, 42, 0.15), rgba(15, 23, 42, 0.70)),
        #20252d;
    }
    body.client-shell .tile-stage video {
      object-fit: cover;
      filter: grayscale(0.85) brightness(0.72) contrast(1.05);
    }
    body.client-shell .tile-stage > span[data-role="placeholder"] {
      inset: 50% 22px auto 22px;
      transform: translateY(-50%);
      color: rgba(255, 255, 255, 0.82);
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }
    body.client-shell .tile-status {
      display: none;
    }
    body.client-shell .tile-info-overlay {
      inset: 76px auto auto 14px;
      width: min(278px, calc(100% - 28px));
      padding: 14px;
      border-radius: 7px;
      background: rgba(14, 19, 28, 0.72);
      backdrop-filter: blur(12px);
    }
    body.client-shell .tile-info-overlay-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 12px;
    }
    body.client-shell .tile-info-overlay-grid span {
      font-size: 12px;
    }
    body.client-shell .tile-info-overlay-grid strong {
      font-size: 13px;
    }
    @media (max-width: 900px) { .live-grid, .live-grid[data-grid-size] { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 860px) {
      body.client-shell header.app-chrome .app-header-top {
        grid-template-columns: 1fr;
        gap: var(--space-3);
      }
      body.client-shell .app-nav-cluster {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      body.client-shell .brand-copy {
        max-width: 100%;
      }
      body.client-shell header.app-chrome .image-nav-tabs,
      body.client-shell header.app-chrome .client-image-nav-tabs {
        grid-column: 1 / -1;
        width: 100%;
        min-width: 0;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-auto-flow: row;
        grid-auto-columns: auto;
        justify-content: stretch;
      }
      body.client-shell header.app-chrome .image-nav {
        width: 100%;
        min-width: 0;
      }
      body.client-shell .account-menu {
        width: 100%;
        max-width: 100%;
        grid-template-columns: 1fr;
        justify-content: space-between;
        align-items: start;
        gap: 8px;
      }
      body.client-shell .account-menu-top,
      body.client-shell .account-controls {
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      body.client-shell .account-menu > form {
        justify-self: start;
      }
    }
    @media (max-width: 430px) {
      body.client-shell main {
        padding: 20px 10px 36px;
      }
      body.client-shell .account-menu {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: stretch;
      }
      body.client-shell .account-menu-top {
        min-width: 0;
      }
      body.client-shell .account-controls {
        flex-wrap: wrap;
      }
      body.client-shell .account-menu > form {
        align-self: center;
      }
    }
    @media (max-width: 780px) {
      .workspace, .live-toolbar, .live-workspace-layout { grid-template-columns: 1fr; }
      .live-workspace-layout[data-dock-side] { grid-template-columns: 1fr; }
      .live-workspace-layout[data-dock-side] .live-source-dock,
      .live-workspace-layout[data-dock-side] .live-workspace-main { order: initial; }
      .live-source-dock { position: static; }
      .live-source-tree {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        max-height: none;
        overflow: visible;
      }
      body.client-shell .live-workspace-layout,
      body.client-shell .live-workspace-layout[data-dock-side],
      body.client-shell .live-workspace-layout[data-dock-side="right"] {
        min-height: auto;
        grid-template-columns: 1fr;
      }
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-source-dock,
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-workspace-main {
        order: initial;
      }
      body.client-shell .live-source-dock,
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-source-dock {
        position: static;
        height: auto;
        max-height: none;
        border-right: 0;
        border-left: 0;
        border-bottom: 1px solid var(--line);
      }
      body.client-shell .live-source-tree {
        max-height: 260px;
        overflow: auto;
      }
      body.client-shell .live-dock-event-feed {
        max-height: 220px;
      }
      body.client-shell .live-workspace-main {
        min-height: auto;
        padding: 14px 10px 24px;
      }
      body.client-shell .live-toolbar {
        position: static;
        justify-content: flex-start;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      body.client-shell .live-grid,
      body.client-shell .live-grid[data-grid-size],
      body.client-shell .live-grid[data-grid-size="2"],
      body.client-shell .live-grid[data-grid-size="4"],
      body.client-shell .live-grid[data-grid-size="6"],
      body.client-shell .live-grid[data-grid-size="9"] {
        height: auto;
        min-height: auto;
        grid-template-columns: 1fr;
        grid-template-rows: none;
      }
      body.client-shell .tile,
      body.client-shell .live-grid[data-density="compact"] .tile {
        min-height: 282px;
      }
      body.client-shell .client-workspace-shell:not(.live-workspace) {
        grid-template-columns: 1fr;
      }
      body.client-shell .client-channel-dock {
        position: static;
        max-height: none;
      }
      body.client-shell .client-dashboard-head {
        display: grid;
        grid-template-columns: 1fr;
        align-items: start;
      }
      body.client-shell .client-dashboard-head .meta,
      body.client-shell .client-dashboard-head .client-copy-actions {
        width: 100%;
        justify-content: flex-start;
      }
      body.client-shell .client-dashboard-head .client-copy-actions button {
        min-width: 0;
      }
    }
    @media (max-width: 560px) {
      .live-grid, .live-grid[data-grid-size] { grid-template-columns: 1fr; }
      .tile-controls { grid-template-columns: 1fr; }
      .tile-actions { opacity: 1; pointer-events: auto; }
      .tile-actions .icon-button { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
      body.client-shell .tile-head {
        grid-template-columns: minmax(0, 1fr) 150px;
      }
      body.client-shell .tile-actions .icon-button {
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
      }
    }
    @media (max-width: 340px) {
      .tile-actions { justify-content: flex-start; }
    }
    @media (max-width: 560px) {
      .client-compare-head,
      .client-compare-metrics {
        grid-template-columns: 1fr;
      }
    }
  </style>
)CSS";
}

}  // namespace ingress
