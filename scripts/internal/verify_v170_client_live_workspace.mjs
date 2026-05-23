#!/usr/bin/env node
// 파일 용도: v1.7.0 Client Live가 source tree와 drag/drop workspace 계약을 유지하는지 정적으로 검증한다.

import fs from "node:fs";
import process from "node:process";

import {
  findChrome,
  openBrowserPage,
} from "./ui_visual_smoke_lib.mjs";

const script = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
const css = fs.readFileSync("src/ingress/product_ui_css.cpp", "utf8");
const uiSmoke = fs.readFileSync("scripts/internal/verify_ops_client_ui_smoke.mjs", "utf8");
const args = parseArgs(process.argv.slice(2));
const liveSourceTreeBlock = script.slice(
  script.indexOf("function liveSourceTreeHtml()"),
  script.indexOf("function liveSummaryCounts()"),
);

const failures = [];

function check(name, condition) {
  if (condition) {
    console.log(`[pass] ${name}`);
  } else {
    failures.push(name);
    console.log(`[fail] ${name}`);
  }
}

check(
  "client live declares workspace replacement contract",
  script.includes('data-testid="client-live-workspace"') &&
    script.includes('data-workspace-model="source-tree,drag-drop-grid,multi-source"') &&
    script.includes('data-testid="client-live-drop-grid"'),
);
check(
  "source tree exposes viewer-safe draggable view cards",
  script.includes('data-testid="client-live-source-tree"') &&
    script.includes('role="tree"') &&
    script.includes('role="treeitem"') &&
    script.includes('draggable="true"') &&
    script.includes('data-source-view="${escapeHtml(view.viewId)}"') &&
    !liveSourceTreeBlock.includes("rtspUrl") &&
    !liveSourceTreeBlock.includes("sourceUrl"),
);
check(
  "workspace tiles accept drag/drop assignment without new route",
  script.includes("async function assignViewToTile") &&
    script.includes("assignSourceToSelectedTile") &&
    script.includes("root.addEventListener('dragover'") &&
    script.includes("root.addEventListener('drop'") &&
    script.includes("event.dataTransfer.setData('text/plain', viewId)") &&
    script.includes("fetch(`/client/api/views/${encodeURIComponent(view.viewId)}/webrtc/session`"),
);
check(
  "tile channel selector was replaced by assignment display",
  script.includes('class="tile-assignment"') &&
    script.includes('data-role="view-label"') &&
    script.includes('data-role="source-meta"') &&
    !script.includes('aria-label="타일 ${tile.index + 1} 채널 선택"'),
);
check(
  "workspace has responsive source dock and drop state styling",
  css.includes(".live-workspace-layout") &&
    css.includes(".live-source-dock") &&
    css.includes(".live-source-node") &&
    css.includes('.live-drop-tile[data-drop-state="over"]') &&
    css.includes("@media (max-width: 780px)"),
);
check(
  "client shell keeps live video tiles at 16:9 without cover-cropping",
  css.includes("body.client-shell .tile,") &&
    css.includes("aspect-ratio: 16 / 9;") &&
    css.includes("body.client-shell .tile-stage video") &&
    css.includes("object-fit: contain;") &&
    !css.includes("body.client-shell .tile-stage video {\n      object-fit: cover;"),
);
check(
  "client shell exposes viewer-safe VA overlay mode controls",
  script.includes('data-testid="client-live-va-overlay-toggle"') &&
    script.includes('data-mode-action="raw"') &&
    script.includes('data-mode-action="va-overlay"') &&
    script.includes("async function setTileOverlayMode") &&
    script.includes("await restartLiveTile(index)") &&
    script.includes('data-action="toggle-playback"') &&
    script.includes("async function toggleLiveTilePlayback") &&
    script.includes('data-role="tile-playback-icon"') &&
    script.includes("requestedClientModeParam === null") &&
    script.includes("modes.includes('va-overlay') ? 'va-overlay'") &&
    script.includes("const savedModeValue = String(saved?.overlayMode || '').trim()") &&
    css.includes("body.client-shell .tile-mode-controls") &&
    css.includes(".tile-status-pill") &&
    uiSmoke.includes('data-testid="client-live-va-overlay-toggle"') &&
    uiSmoke.includes("first tile default VA overlay mode is not active"),
);
check(
  "client header account controls are covered by screenshot overlap smoke",
  uiSmoke.includes("client account controls overlap") &&
    uiSmoke.includes("client account item outside menu") &&
    uiSmoke.includes("account controls overlap") &&
    uiSmoke.includes("Shell account header smoke") &&
    uiSmoke.includes("client header is not stable while scrolling") &&
    css.includes("body.client-shell .account-copy") &&
    css.includes("body.client-shell .account-controls") &&
    css.includes("position: sticky;"),
);
check(
  "product shell uses formal brand mark and client nav label",
  uiSmoke.includes('class="brand-mark"') &&
    uiSmoke.includes("'클라이언트'") &&
    css.includes("body.product-shell .brand-mark") &&
    !css.includes('body.product-shell .brand-mark::before'),
);
check(
  "ops/client UI smoke tracks the workspace replacement contract",
  uiSmoke.includes('data-testid="client-live-workspace"') &&
    uiSmoke.includes('data-workspace-model="source-tree,drag-drop-grid,multi-source"') &&
    uiSmoke.includes("root.addEventListener('drop'") &&
    uiSmoke.includes("dataTransfer.setData"),
);

if (failures.length > 0) {
  console.log("");
  console.log("== v1.7.0 Client Live workspace 실패 ==");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

if (args.browserSmoke) {
  await runBrowserDragDropSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== v1.7.0 Client Live workspace 실패 ==");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log("");
console.log("== v1.7.0 Client Live workspace 통과 ==");

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9877,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--browser-smoke") {
      parsed.browserSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else if (arg === "--chrome-path") {
      parsed.chromePath = rawArgs[++index] || "";
    } else if (arg === "--debug-port") {
      parsed.debugPort = Number(rawArgs[++index] || parsed.debugPort);
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
}

async function runBrowserDragDropSmoke() {
  const chromePath = args.chromePath || findChrome();
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/client/live",
    timeoutMs: args.timeoutMs,
    chromePath,
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          const sourceNodes = Array.from(document.querySelectorAll('[data-source-view]'));
          const targetTile = document.querySelector('.live-drop-tile[data-tile="0"]');
          const source = sourceNodes.find(node => String(node.querySelector('[data-role="assigned-count"]')?.textContent || '').startsWith('0/')) || sourceNodes[sourceNodes.length - 1];
          if (!source || !targetTile) return { ok: false, reason: 'source or target tile missing' };
          const beforeView = targetTile.dataset.viewId || '';
          const nextView = source.dataset.sourceView || '';
          const dataTransfer = new DataTransfer();
          source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
          targetTile.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
          targetTile.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
          targetTile.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
          source.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer }));
          await wait(1200);
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics']
            .filter(text => document.body.innerText.includes(text));
          const afterView = targetTile.dataset.viewId || '';
          const overflowX = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
          return {
            ok: afterView === nextView && beforeView !== afterView && forbidden.length === 0 && overflowX <= 2,
            beforeView,
            afterView,
            nextView,
            assignment: targetTile.querySelector('[data-role="view-label"]')?.textContent || '',
            sourceCounts: sourceNodes.map(node => ({
              view: node.dataset.sourceView || '',
              count: node.querySelector('[data-role="assigned-count"]')?.textContent || '',
            })),
            forbidden,
            overflowX,
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser drag/drop assigns a source to a workspace tile", Boolean(result?.ok));
    if (!result?.ok) {
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await browser.close();
  }
}
