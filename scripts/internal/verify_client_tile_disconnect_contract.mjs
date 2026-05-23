#!/usr/bin/env node
// 파일 용도: Client Live 타일/워크스페이스 연결 해제 계약을 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const script = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
const css = fs.readFileSync("src/ingress/product_ui_css.cpp", "utf8");
const i18n = fs.readFileSync("src/ingress/product_ui_js.cpp", "utf8");
const uiSmoke = fs.readFileSync("scripts/internal/verify_ops_client_ui_smoke.mjs", "utf8");
const args = parseArgs(process.argv.slice(2));
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
  "tile disconnect contract marker is declared",
  script.includes('data-disconnect-contract="tile-disconnect-clears-slot,workspace-disconnect-keeps-layout"') &&
    script.includes('data-disconnect-scope="tile"'),
);
check(
  "individual tile disconnect clears only the selected slot",
  script.includes("async function disconnectLiveTile") &&
    script.includes("clearLiveTileSlot(tile)") &&
    script.includes("tile.viewId = ''") &&
    script.includes("root.querySelector('[data-action=\"stop\"]')?.addEventListener('click', () => disconnectLiveTile(tile.index))") &&
    script.includes("event.key === 'Delete'") &&
    script.includes("disconnectLiveTile(tile.index)"),
);
check(
  "workspace disconnect remains a workspace-level action",
  script.includes('id="liveAllStop"') &&
    script.includes("전체 연결 해제") &&
    script.includes("async function stopAllLiveTiles()") &&
    script.includes("Promise.all(liveTiles.map(tile => stopLiveTile(tile.index)))") &&
    !script.includes("Promise.all(liveTiles.map(tile => disconnectLiveTile(tile.index)))"),
);
check(
  "workspace action menu stays inside narrow client viewport",
  css.includes("body.client-shell .workspace-actions[open]::after") &&
    css.includes("left: 0;") &&
    css.includes("body.client-shell .live-layout-presets,") &&
    css.includes("body.client-shell #liveAllStop") &&
    css.includes("max-width: calc(100vw - 20px);"),
);
check(
  "disconnect labels are localized",
  i18n.includes("'연결 해제': 'Disconnect'") &&
    i18n.includes("'전체 연결 해제': 'Disconnect all'") &&
    i18n.includes("연결 해제|채널 선택"),
);
check(
  "ops/client UI smoke tracks tile disconnect contract",
  uiSmoke.includes('data-disconnect-contract="tile-disconnect-clears-slot,workspace-disconnect-keeps-layout"') &&
    uiSmoke.includes('data-disconnect-scope="tile"') &&
    uiSmoke.includes("disconnectLiveTile") &&
    uiSmoke.includes("타일 ${tile.index + 1} 연결 해제") &&
    i18n.includes("'연결 해제': 'Disconnect'"),
);

if (args.browserSmoke) {
  await runBrowserDisconnectSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Client tile disconnect 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Client tile disconnect 통과 ==");

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9930,
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

async function runBrowserDisconnectSmoke() {
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/client/live",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          await wait(400);
          const first = document.querySelector('.live-drop-tile[data-tile="0"]');
          const second = document.querySelector('.live-drop-tile[data-tile="1"]');
          const disconnect = first?.querySelector('[data-action="stop"][data-disconnect-scope="tile"]');
          const workspaceDisconnect = document.querySelector('#liveAllStop');
          const before = {
            firstView: first?.dataset.viewId || '',
            secondView: second?.dataset.viewId || '',
            firstAssignment: first?.querySelector('[data-role="view-label"]')?.textContent || '',
            secondAssignment: second?.querySelector('[data-role="view-label"]')?.textContent || '',
          };
          workspaceDisconnect?.click();
          await wait(250);
          const afterWorkspace = {
            firstView: first?.dataset.viewId || '',
            secondView: second?.dataset.viewId || '',
            firstAssignment: first?.querySelector('[data-role="view-label"]')?.textContent || '',
            secondAssignment: second?.querySelector('[data-role="view-label"]')?.textContent || '',
          };
          disconnect?.click();
          await wait(500);
          const after = {
            firstView: first?.dataset.viewId || '',
            secondView: second?.dataset.viewId || '',
            firstAssignment: first?.querySelector('[data-role="view-label"]')?.textContent || '',
            secondAssignment: second?.querySelector('[data-role="view-label"]')?.textContent || '',
            workspaceText: document.querySelector('#liveAllStop')?.textContent || '',
            contract: document.querySelector('[data-disconnect-contract]')?.dataset.disconnectContract || '',
            forbidden: ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics']
              .filter(item => document.body.innerText.includes(item)),
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
          return {
            ok: before.firstView &&
              before.firstView === afterWorkspace.firstView && before.secondView === afterWorkspace.secondView &&
              before.firstAssignment === afterWorkspace.firstAssignment && before.secondAssignment === afterWorkspace.secondAssignment &&
              !after.firstView && after.firstAssignment.includes('소스 없음') &&
              before.secondView === after.secondView && before.secondAssignment === after.secondAssignment &&
              after.workspaceText.includes('전체 연결 해제') && after.forbidden.length === 0 && after.overflowX <= 2,
            before,
            afterWorkspace,
            after,
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser tile disconnect clears one slot and preserves adjacent tiles", Boolean(result?.ok));
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }

  const mobileBrowser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/client/live",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort + 1,
    width: 320,
    height: 900,
  });
  try {
    const mobileResult = await mobileBrowser.evaluate(
      `
        (async () => {
          const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          await wait(400);
          const details = document.querySelector('.workspace-actions');
          const summary = details?.querySelector('summary');
          summary?.click();
          await wait(150);
          const viewportWidth = window.innerWidth;
          const menuItems = Array.from(document.querySelectorAll('.live-layout-presets, .live-layout-presets *, #liveAllStop'))
            .filter(item => {
              const rect = item.getBoundingClientRect();
              const style = getComputedStyle(item);
              return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            })
            .map(item => {
              const rect = item.getBoundingClientRect();
              return {
                tag: item.tagName.toLowerCase(),
                id: item.id || '',
                text: (item.innerText || item.getAttribute('aria-label') || '').trim(),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              };
            });
          const clipped = menuItems.filter(item => item.left < -1 || item.right > viewportWidth + 1);
          return {
            ok: Boolean(details?.open) && menuItems.length >= 4 && clipped.length === 0,
            open: Boolean(details?.open),
            viewportWidth,
            menuItems,
            clipped,
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser mobile workspace action menu is not clipped", Boolean(mobileResult?.ok));
    if (!mobileResult?.ok) console.log(JSON.stringify(mobileResult, null, 2));
  } finally {
    await mobileBrowser.close();
  }
}
