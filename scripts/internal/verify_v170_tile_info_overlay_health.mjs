#!/usr/bin/env node
// 파일 용도: v1.7.0 Client Live tile info overlay와 playback health UI 계약을 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const script = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
const css = fs.readFileSync("src/ingress/product_ui_css.cpp", "utf8");
const uiSmoke = fs.readFileSync("scripts/internal/verify_ops_client_ui_smoke.mjs", "utf8");
const serverSh = fs.readFileSync("server.sh", "utf8");
const clientLiveBlock = script.slice(
  script.indexOf("function defaultLiveViewIds()"),
  script.indexOf("async function loadDetail()"),
);
const overlayBlock = script.slice(
  script.indexOf("function tileInfoOverlayVisible"),
  script.indexOf("function updateAllTileDom()"),
);

check("tile info overlay is controlled only by the info toggle", () => {
  for (const snippet of [
    'id="liveInfoOverlayToggle"',
    "mediaServerClientLiveInfoOverlay",
    "function tileInfoOverlayVisible",
    "return Boolean(tile) && liveInfoOverlayEnabled",
    'data-testid="client-live-tile-info-overlay"',
    'data-overlay-trigger="info-toggle"',
    "root.dataset.infoOverlay",
  ]) {
    assertIncludes(script, snippet, "tile info overlay");
  }
  assert(!script.includes("liveInfoOverlayEnabled || selectedLiveTile === tile.index"), "tile selection must not force the info overlay");
});

check("overlay reports playback health from WebRTC stats without media path changes", () => {
  for (const snippet of [
    "async function refreshTilePlaybackStats",
    "tile.pc.getStats",
    "stat.type === 'inbound-rtp'",
    "framesPerSecond",
    "bytesReceived",
    "framesDropped",
    "bitrateKbps",
    "freezeCount",
    "restartCount",
  ]) {
    assertIncludes(script, snippet, "playback health stats");
  }
  assert(!clientLiveBlock.includes("new RTCPeerConnection({ iceServers: [] })"), "must keep existing ICE config loading");
  assert(!clientLiveBlock.includes("renderVideoOverlay") || clientLiveBlock.includes("overlayMode"), "overlay must not force server overlay");
});

check("overlay is a DOM layer over native video and avoids raw/debug material", () => {
  for (const snippet of [
    ".tile-info-overlay",
    ".tile-stage video",
    "pointer-events: none",
    "FPS <strong",
    "Bitrate <strong",
    "Dropped <strong",
    "Freeze <strong",
    "VA/Event <strong",
  ]) {
    assertIncludes(css + script, snippet, "tile overlay DOM/CSS");
  }
  for (const forbidden of ["JSON.stringify", "rtspUrl", "sourceUrl", "debugCounters", "SDP", "ICE detail"]) {
    assert(!overlayBlock.includes(forbidden), `client live overlay must not expose ${forbidden}`);
  }
});

check("ops/client UI smoke and server command track tile info overlay contract", () => {
  for (const snippet of [
    'id="liveInfoOverlayToggle"',
    'data-testid="client-live-tile-info-overlay"',
    "refreshTilePlaybackStats",
    "verify-v170-tile-info-overlay-health",
    "verify_v170_tile_info_overlay_health.mjs",
  ]) {
    assertIncludes(uiSmoke + serverSh, snippet, "tile info overlay smoke wiring");
  }
});

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== v1.7.0 Tile info overlay/playback health 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v1.7.0 Tile info overlay/playback health 통과 ==");

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9942,
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

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

async function runBrowserSmoke() {
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
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          await wait(400);
          const tiles = Array.from(document.querySelectorAll('.live-drop-tile'));
          const first = tiles[0];
          const second = tiles[1];
          const toggle = document.querySelector('#liveInfoOverlayToggle');
          const firstOverlay = first?.querySelector('[data-testid="client-live-tile-info-overlay"]');
          const secondOverlay = second?.querySelector('[data-testid="client-live-tile-info-overlay"]');
          if (toggle && toggle.checked) {
            toggle.click();
            await wait(150);
          }
          first?.click();
          await wait(150);
          const selectedHidden = firstOverlay && firstOverlay.hidden;
          const adjacentHidden = secondOverlay && secondOverlay.hidden;
          if (toggle && !toggle.checked) {
            toggle.click();
            await wait(150);
          }
          const toggleShowsSelected = firstOverlay && !firstOverlay.hidden;
          const toggleShowsAdjacent = secondOverlay && !secondOverlay.hidden;
          const tileRect = first?.getBoundingClientRect();
          const overlayRect = firstOverlay?.getBoundingClientRect();
          const overlayInsetLeft = overlayRect && tileRect ? Math.round(overlayRect.left - tileRect.left) : null;
          const overlayInsetRight = overlayRect && tileRect ? Math.round(tileRect.right - overlayRect.right) : null;
          const overlayInsetAligned = Number.isFinite(overlayInsetLeft) &&
            Number.isFinite(overlayInsetRight) &&
            Math.abs(overlayInsetLeft - overlayInsetRight) <= 1;
          const toolbarItems = Array.from(document.querySelectorAll('.live-toolbar select, .live-info-toggle, .live-copy-actions button, .workspace-actions summary'));
          const bottoms = toolbarItems.map(item => Math.round(item.getBoundingClientRect().bottom));
          const toolbarAligned = bottoms.length > 0 && bottoms.every(bottom => bottom === bottoms[0]);
          const infoToggleWidth = Math.round(document.querySelector('.live-info-toggle')?.getBoundingClientRect().width || 0);
          const infoToggleCompact = infoToggleWidth > 0 && infoToggleWidth <= 44;
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'SDP', 'ICE detail']
            .filter(item => text.includes(item));
          const fields = ['FPS', 'Bitrate', 'Dropped', 'Freeze', 'Reconnect', 'VA/Event'];
          return {
            ok: Boolean(selectedHidden && adjacentHidden && toggleShowsSelected && toggleShowsAdjacent && overlayInsetAligned && toolbarAligned && infoToggleCompact) &&
              fields.every(field => firstOverlay?.innerText.includes(field)) &&
              forbidden.length === 0,
            selectedHidden: Boolean(selectedHidden),
            adjacentHidden: Boolean(adjacentHidden),
            toggleShowsSelected: Boolean(toggleShowsSelected),
            toggleShowsAdjacent: Boolean(toggleShowsAdjacent),
            overlayInsetLeft,
            overlayInsetRight,
            overlayInsetAligned,
            toolbarBottoms: bottoms,
            toolbarAligned,
            infoToggleWidth,
            infoToggleCompact,
            overlayText: firstOverlay?.innerText || '',
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser tile info overlay visibility/redaction smoke", () => {
      assert(Boolean(result?.ok), "browser result was not ok");
    });
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
