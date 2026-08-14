// 파일 용도: 클라이언트 viewer shell 전용 CSS module을 조립한다.
#include "ingress/product_ui_css.h"

#include <string>

namespace ingress {

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
      font-family: var(--font-ui);
    }
    body { margin: 0; background: var(--bg); color: var(--text); }
    main { max-width: 1440px; margin: 0 auto; padding: 18px 14px 40px; display: grid; gap: 16px; }
    h1, h2, h3 { margin: 0; }
    h1 { font-size: var(--font-size-xl); }
    h2 { font-size: var(--font-size-lg); }
    h3 { font-size: 16px; }
    p { margin: 0; color: var(--muted); line-height: var(--line-height-base); }
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
      max-width: min(42vw, 430px);
      min-height: 44px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0;
    }
    body.client-shell .account-identity {
      display: flex;
      flex: 0 0 auto;
    }
    body.client-shell .account-copy {
      display: none;
    }
    body.client-shell .language-control {
      min-width: 64px;
    }
    body.client-shell .account-menu-top {
      min-width: 0;
      overflow: hidden;
      justify-content: flex-end;
      gap: 12px;
    }
    body.client-shell .account-controls {
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 10px;
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
    .view h3,
    .view .meta {
      justify-self: start;
      text-align: left;
    }
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
    .client-safe-status-summary {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--panel-soft);
    }
    .client-safe-status-summary h3 {
      font-size: 15px;
    }
    .client-incident-banner {
      display: grid;
      grid-template-columns: minmax(0, 0.42fr) minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      border: 1px solid color-mix(in srgb, var(--accent) 32%, var(--line));
      border-radius: 8px;
      padding: 10px;
      background: var(--bg);
    }
    .client-incident-banner.warn {
      border-color: color-mix(in srgb, var(--warn) 54%, var(--line));
      background: var(--warn-soft);
    }
    .client-incident-banner.bad {
      border-color: color-mix(in srgb, var(--bad) 54%, var(--line));
      background: var(--bad-soft);
    }
    .client-incident-banner.info {
      border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
    }
    .client-incident-banner span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .client-incident-banner strong,
    .client-incident-banner p {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .client-incident-banner strong {
      font-size: 18px;
    }
    .client-status-evidence .metric {
      min-height: 66px;
    }
    .client-status-evidence .metric strong {
      font-size: 16px;
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
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.45;
    }
    .client-compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
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
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: 8px;
    }
    .client-compare-head .chip {
      justify-self: start;
    }
    .client-compare-head strong,
    .client-compare-card p {
      overflow-wrap: break-word;
      word-break: normal;
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
      border: 1px solid color-mix(in srgb, var(--overlay-label-text) 18%, transparent);
      border-radius: 6px;
      background: var(--overlay-label-bg);
      color: var(--overlay-label-text);
      box-shadow: 0 10px 30px color-mix(in srgb, var(--color-code-bg) 28%, transparent);
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
      color: var(--overlay-label-text);
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
      color: color-mix(in srgb, var(--overlay-label-text) 72%, transparent);
      font-size: 10px;
      line-height: 1.1;
    }
    .tile-info-overlay-grid strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--overlay-label-text);
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
      --bg: var(--color-bg);
      --panel: var(--color-surface-raised);
      --panel-soft: var(--color-surface-muted);
      --line: var(--color-border);
      --text: var(--color-text);
      --muted: var(--color-text-muted);
      --accent: var(--color-info);
      --accent-soft: color-mix(in srgb, var(--accent) 14%, var(--color-surface-raised));
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
      position: sticky;
      top: 0;
      z-index: 80;
      min-height: 60px;
      padding: 0 22px;
      border-width: 0 0 1px;
      border-radius: 0;
      background: color-mix(in srgb, var(--panel) 97%, transparent);
      box-shadow: 0 1px 0 color-mix(in srgb, var(--line) 70%, transparent);
      overflow: visible;
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
      grid-auto-columns: minmax(118px, 132px);
      overflow-x: auto;
      scrollbar-width: none;
    }
    body.client-shell .client-image-nav-tabs::-webkit-scrollbar {
      display: none;
    }
    body.client-shell .account-menu {
      max-width: min(42vw, 430px);
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
      background: var(--bg);
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
      background: var(--panel);
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
      background: var(--panel);
      box-shadow: var(--shadow-sm);
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
    body.client-shell .client-viewer-workspace,
    body.client-shell .client-viewer-dock,
    body.client-shell .client-viewer-detail,
    body.client-shell .client-live-workspace,
    body.client-shell .client-live-layout,
    body.client-shell .client-live-primary,
    body.client-shell .client-live-video-grid,
    body.client-shell .client-live-dock,
    body.client-shell .client-live-event-dock,
    body.client-shell .client-viewer-dashboard,
    body.client-shell .client-viewer-events {
      min-width: 0;
    }
    body.client-shell .client-viewer-workspace {
      align-items: start;
    }
    body.client-shell .client-preview-redaction-strip {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-soft);
    }
    body.client-shell .client-redaction-review-chip {
      flex: 0 0 auto;
    }
    body.client-shell .client-redaction-review-copy {
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      overflow-wrap: anywhere;
    }
    body.client-shell .client-viewer-detail {
      overflow: clip;
    }
    body.client-shell .client-live-primary {
      display: grid;
      align-content: start;
      gap: 12px;
      min-height: calc(100vh - 60px);
    }
    body.client-shell .client-live-video-grid {
      width: 100%;
    }
    body.client-shell .client-live-dock {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
    }
    body.client-shell .client-live-event-dock {
      min-height: 0;
      overflow: auto;
    }
    body.client-shell .client-viewer-dashboard,
    body.client-shell .client-viewer-events {
      display: grid;
      gap: 14px;
    }
    body.client-shell .client-events-head,
    body.client-shell .client-viewer-event-feed {
      min-width: 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow-sm);
    }
    body.client-shell .client-viewer-events > .meta {
      min-width: 0;
      padding: 12px 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }
    body.client-shell .live-monitor {
      position: relative;
      min-height: calc(100vh - 60px);
      gap: 0;
      background: var(--bg);
    }
    body.client-shell .live-toolbar {
      position: absolute;
      top: 14px;
      right: 22px;
      z-index: 30;
      display: flex;
      align-items: flex-end;
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
      display: grid;
      gap: 3px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 850;
      line-height: 1;
    }
    body.client-shell .live-toolbar label select {
      min-height: 36px;
      border-radius: 7px;
      background: var(--panel);
      font-size: 12px;
    }
    body.client-shell .live-toolbar .live-info-toggle {
      position: relative;
      min-width: 42px;
      width: 42px;
      max-width: 42px;
      flex: 0 0 42px;
      min-height: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
      white-space: nowrap;
    }
    body.client-shell .live-toolbar .live-info-toggle input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    body.client-shell .live-toolbar .live-info-toggle span {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid currentColor;
      font-size: 13px;
      font-weight: 950;
      line-height: 1;
      pointer-events: none;
    }
    body.client-shell .live-toolbar .live-info-toggle:has(input:checked) {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    body.client-shell .live-toolbar .live-info-toggle:has(input:focus-visible) {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    body.client-shell .live-copy-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    body.client-shell .live-copy-actions button {
      min-height: 36px;
      width: 84px;
      padding: 0 10px;
      border-radius: 7px;
      background: var(--panel);
      font-size: 12px;
      white-space: nowrap;
    }
    body.client-shell .workspace-actions {
      align-self: flex-end;
    }
    body.client-shell .workspace-actions summary {
      min-height: 36px;
      border-radius: 7px;
      background: var(--color-code-bg);
      color: var(--color-code-text);
      border-color: var(--color-code-bg);
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
      background: var(--color-code-bg);
      color: var(--color-code-text);
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
      background: var(--panel);
      box-shadow: var(--shadow-md);
    }
    body.client-shell #liveAllStop {
      position: absolute;
      top: calc(100% + 178px);
      right: 0;
      z-index: 55;
      min-width: 190px;
      border-color: color-mix(in srgb, var(--color-danger) 64%, var(--color-border));
      background: var(--color-danger-weak-bg);
      color: var(--color-danger);
      box-shadow: var(--shadow-md);
    }
    body.client-shell .live-summary-rail,
    body.client-shell .live-selected-detail {
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
      background: var(--panel);
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
      background: var(--panel);
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
      background: var(--panel);
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
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
    }
    body.client-shell .live-source-floor summary {
      padding-left: 20px;
      color: var(--muted);
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
      background: var(--panel);
    }
    body.client-shell .live-source-node.active {
      background: var(--accent-soft);
      border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
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
      background: var(--panel);
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
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--panel);
    }
    body.client-shell .live-workspace-main {
      min-height: calc(100vh - 60px);
      padding: 70px 8px 22px 16px;
      background: var(--bg);
    }
    body.client-shell .live-grid,
    body.client-shell .live-grid[data-grid-size] {
      height: auto;
      min-height: 0;
      display: grid;
      gap: 8px;
      grid-auto-rows: auto;
      align-content: start;
    }
    body.client-shell .live-grid[data-grid-size="1"] {
      grid-template-columns: 1fr;
    }
    body.client-shell .live-grid[data-grid-size="2"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    body.client-shell .live-grid[data-grid-size="4"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: none;
    }
    body.client-shell .live-grid[data-grid-size="6"],
    body.client-shell .live-grid[data-grid-size="9"] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    body.client-shell .tile,
    body.client-shell .live-grid[data-density="compact"] .tile {
      position: relative;
      min-height: 0;
      aspect-ratio: 16 / 9;
      display: block;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      background: var(--color-media-bg);
      border: 1px solid var(--line);
      box-shadow: 0 1px 2px color-mix(in srgb, var(--color-code-bg) 8%, transparent);
    }
    body.client-shell .tile.selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
    }
    body.client-shell .tile-head {
      position: absolute;
      inset: 12px 12px auto 12px;
      z-index: 12;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: flex-start;
      gap: 8px;
      pointer-events: none;
    }
    body.client-shell .tile-title {
      grid-column: 1;
      grid-row: 2;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
      justify-content: flex-start;
      overflow: hidden;
      color: var(--overlay-label-text);
      text-shadow: 0 1px 3px color-mix(in srgb, var(--color-code-bg) 55%, transparent);
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
      background: var(--overlay-point-fill);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--overlay-point-fill) 18%, transparent);
    }
    body.client-shell .tile-title h3 {
      min-width: 0;
      max-width: 100%;
      min-height: 18px;
      font-size: 15px;
      font-weight: 850;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.client-shell .tile-status-pill {
      flex: 0 0 auto;
      width: auto;
      min-width: 66px;
      max-width: 84px;
      min-height: 28px;
      padding: 3px 9px;
      border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--line));
      background: var(--accent-soft);
      color: var(--color-primary-weak-text);
      justify-content: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.client-shell .tile-status-pill.warn {
      border-color: color-mix(in srgb, var(--warn) 30%, var(--line));
      background: var(--warn-soft);
      color: var(--warn);
    }
    body.client-shell .tile-status-pill.bad {
      border-color: color-mix(in srgb, var(--bad) 30%, var(--line));
      background: var(--bad-soft);
      color: var(--bad);
    }
    body.client-shell .tile-mode-controls {
      max-width: 100%;
      display: inline-flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 3px;
      padding: 3px;
      border: 1px solid color-mix(in srgb, var(--overlay-label-text) 34%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-code-bg) 64%, transparent);
      backdrop-filter: blur(12px);
      pointer-events: auto;
    }
    body.client-shell .tile-mode-controls[hidden],
    body.client-shell .tile-mode-button[hidden] {
      display: none;
    }
    body.client-shell .tile-mode-button {
      min-width: 42px;
      min-height: 26px;
      padding: 3px 8px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: color-mix(in srgb, var(--overlay-label-text) 86%, transparent);
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
      box-shadow: none;
    }
    body.client-shell .tile-mode-button[aria-pressed="true"] {
      background: color-mix(in srgb, var(--accent) 92%, transparent);
      color: var(--overlay-label-text);
    }
    body.client-shell .tile-mode-button:focus-visible {
      outline: 2px solid var(--overlay-label-text);
      outline-offset: 2px;
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
      align-items: center;
      gap: 7px;
      grid-column: 1;
      grid-row: 1;
      justify-self: end;
    }
    body.client-shell .tile-actions .icon-button {
      width: 40px;
      min-width: 40px;
      height: 40px;
      min-height: 40px;
      border-radius: 8px;
      border-color: color-mix(in srgb, var(--overlay-label-text) 38%, transparent);
      background: color-mix(in srgb, var(--color-code-bg) 66%, transparent);
      color: var(--overlay-label-text);
      backdrop-filter: blur(12px);
    }
    body.client-shell .tile-actions .tile-action-primary {
      background: color-mix(in srgb, var(--accent) 92%, transparent);
      border-color: color-mix(in srgb, var(--overlay-label-text) 46%, transparent);
    }
    body.client-shell .tile-stage,
    body.client-shell .live-grid[data-density="compact"] .tile-stage {
      position: absolute;
      inset: 0;
      width: auto;
      height: auto;
      min-height: 0;
      aspect-ratio: auto;
      border-radius: 0;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--color-code-bg) 20%, transparent), color-mix(in srgb, var(--color-code-bg) 78%, transparent)),
        radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--color-neutral) 25%, transparent), transparent 34%),
        var(--color-media-bg);
    }
    body.client-shell .tile[data-view-id=""] .tile-stage {
      border: 1px dashed color-mix(in srgb, var(--overlay-label-text) 34%, transparent);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--color-code-bg) 15%, transparent), color-mix(in srgb, var(--color-code-bg) 70%, transparent)),
        var(--color-media-bg);
    }
    body.client-shell .tile-stage video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: none;
    }
    body.client-shell .tile-stage > span[data-role="placeholder"] {
      display: none;
      inset: 50% 22px auto 22px;
      transform: translateY(-50%);
      color: color-mix(in srgb, var(--overlay-label-text) 82%, transparent);
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }
    body.client-shell .tile[data-view-id=""] .tile-stage > span[data-role="placeholder"] {
      display: block;
    }
    body.client-shell .tile-status {
      display: none;
    }
    body.client-shell .tile-info-overlay {
      inset: auto 14px 14px 14px;
      width: auto;
      padding: 12px;
      border-radius: 7px;
      background: color-mix(in srgb, var(--color-code-bg) 72%, transparent);
      backdrop-filter: blur(12px);
    }
    body.client-shell .tile-info-overlay-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 10px;
    }
    body.client-shell .tile-info-overlay-grid span {
      font-size: 12px;
    }
    body.client-shell .tile-info-overlay-grid strong {
      font-size: 13px;
    }
    @media (max-width: 520px) {
      body.client-shell .tile-info-overlay-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
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
        overflow: visible;
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
      .live-workspace-layout[data-dock-side] .live-source-dock { order: 2; }
      .live-workspace-layout[data-dock-side] .live-workspace-main { order: 1; }
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
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-source-dock { order: 2; }
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-workspace-main { order: 1; }
      body.client-shell .live-source-dock,
      body.client-shell .live-workspace-layout[data-dock-side="right"] .live-source-dock {
        position: static;
        height: auto;
        max-height: none;
        border-right: 0;
        border-left: 0;
        border-bottom: 1px solid var(--line);
      }
      body.client-shell .client-live-layout .client-live-dock,
      body.client-shell .client-live-layout[data-dock-side] .client-live-dock,
      body.client-shell .client-live-layout[data-dock-side="right"] .client-live-dock {
        order: 2;
      }
      body.client-shell .client-live-layout .client-live-primary,
      body.client-shell .client-live-layout[data-dock-side] .client-live-primary,
      body.client-shell .client-live-layout[data-dock-side="right"] .client-live-primary {
        order: 1;
      }
      body.client-shell .live-source-tree {
        max-height: 260px;
        overflow: auto;
      }
      body.client-shell .live-dock-event-feed {
        max-height: none;
        overflow: visible;
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
      body.client-shell .client-live-toolbar label,
      body.client-shell .client-live-toolbar .live-copy-actions,
      body.client-shell .client-live-toolbar .workspace-actions {
        min-width: 0;
      }
      body.client-shell .client-live-toolbar .live-copy-actions {
        flex-wrap: wrap;
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
        min-height: 0;
        aspect-ratio: 16 / 9;
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
      body.client-shell .client-events-head {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      body.client-shell .client-events-head .meta,
      body.client-shell .client-events-head .client-copy-actions {
        justify-content: flex-start;
      }
    }
    @media (max-width: 560px) {
      .live-grid, .live-grid[data-grid-size] { grid-template-columns: 1fr; }
      .tile-controls { grid-template-columns: 1fr; }
      .tile-actions { opacity: 1; pointer-events: auto; }
      .tile-actions .icon-button { width: 44px; min-width: 44px; height: 44px; min-height: 44px; }
      body.client-shell .tile-head {
        grid-template-columns: minmax(0, 1fr);
      }
      body.client-shell .tile-title {
        grid-column: 1;
        grid-row: 2;
      }
      body.client-shell .tile-actions {
        grid-column: 1;
        grid-row: 1;
        justify-self: stretch;
        max-width: 100%;
        min-width: 0;
        flex-wrap: wrap;
        justify-content: flex-start;
      }
      body.client-shell .tile-status-pill {
        flex: 0 1 auto;
        min-height: 44px;
        max-width: 90px;
      }
      body.client-shell .tile-mode-controls {
        flex: 0 1 auto;
      }
      body.client-shell .tile-actions .icon-button {
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
      }
      body.client-shell .client-live-toolbar {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }
      body.client-shell .client-live-toolbar label,
      body.client-shell .client-live-toolbar label select,
      body.client-shell .client-live-toolbar .live-copy-actions,
      body.client-shell .client-live-toolbar .live-copy-actions button,
      body.client-shell .client-live-toolbar .workspace-actions,
      body.client-shell .client-live-toolbar .workspace-actions summary {
        width: 100%;
        max-width: none;
      }
      body.client-shell .client-live-toolbar .live-info-toggle {
        width: 100%;
        max-width: none;
        flex-basis: auto;
      }
      body.client-shell .client-viewer-workspace,
      body.client-shell .client-viewer-dashboard,
      body.client-shell .client-viewer-events {
        gap: 10px;
      }
      body.client-shell .tile-mode-button {
        min-width: 48px;
        min-height: 44px;
      }
      body.client-shell .workspace-actions[open]::after {
        right: auto;
        left: 0;
        width: min(180px, calc(100vw - 20px));
      }
      body.client-shell .live-layout-presets,
      body.client-shell #liveAllStop {
        right: auto;
        left: 0;
        min-width: min(190px, calc(100vw - 20px));
        max-width: calc(100vw - 20px);
      }
    }
    @media (max-width: 340px) {
      .tile-actions { justify-content: flex-start; }
      body.client-shell .tile,
      body.client-shell .live-grid[data-density="compact"] .tile {
        aspect-ratio: auto;
        min-height: 176px;
      }
    }
    @media (max-width: 560px) {
      .client-compare-head,
      .client-compare-metrics {
        grid-template-columns: 1fr;
      }
      .client-incident-banner {
        grid-template-columns: 1fr;
      }
    }
  </style>
)CSS";
}

}  // namespace ingress
