#!/usr/bin/env node
// 파일 용도: Client Live source tree/dock event feed와 viewer-safe redaction 계약을 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const script = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
const css = fs.readFileSync("src/ingress/product_ui_css.cpp", "utf8");
const uiSmoke = fs.readFileSync("scripts/internal/verify_ops_client_ui_smoke.mjs", "utf8");
const args = parseArgs(process.argv.slice(2));
const failures = [];
const clientLiveBlock = script.slice(
  script.indexOf("function defaultLiveViewIds()"),
  script.indexOf("async function loadDetail()"),
);

function check(name, condition) {
  if (condition) {
    console.log(`[pass] ${name}`);
  } else {
    failures.push(name);
    console.log(`[fail] ${name}`);
  }
}

check(
  "source tree is grouped by site/floor/source without API schema changes",
  script.includes("function liveSourceTreeGroups()") &&
    script.includes('data-tree-model="group/site/floor/source"') &&
    script.includes('data-tree-level="site"') &&
    script.includes('data-tree-level="floor"') &&
    script.includes('data-source-view="${escapeHtml(view.viewId)}"'),
);
check(
  "dock side is user switchable and persisted",
  script.includes("let liveDockSide") &&
    script.includes('id="liveDockSide"') &&
    script.includes("mediaServerClientLiveDockSide") &&
    script.includes('data-dock-side="${escapeHtml(liveDockSide)}"') &&
    css.includes('.live-workspace-layout[data-dock-side="right"]'),
);
check(
  "dock event feed uses client scoped events only",
  script.includes('data-testid="client-live-dock-event-feed"') &&
    script.includes('data-redaction="viewer-safe-events"') &&
    script.includes("refreshLiveDockEventFeed") &&
    script.includes("/client/api/views/${encodeURIComponent(view.viewId)}/events?limit=6") &&
    !clientLiveBlock.includes("/ops/api/events/status?limit=6") &&
    !clientLiveBlock.includes("/lab/analysis/events"),
);
check(
  "event feed renderer avoids raw/debug/source material",
  script.includes("liveDockEventItemsHtml") &&
    script.includes("item.eventType") &&
    script.includes("item.status") &&
    script.includes("item.scenarioName || item.className || item.eventId") &&
    !clientLiveBlock.includes("JSON.stringify(item)") &&
    !clientLiveBlock.includes("sourceUrl") &&
    !clientLiveBlock.includes("rtspUrl"),
);
check(
  "UI smoke tracks source tree and dock event feed contract",
  uiSmoke.includes('data-tree-model="group/site/floor/source"') &&
    uiSmoke.includes('data-testid="client-live-dock-event-feed"') &&
    uiSmoke.includes('data-redaction="viewer-safe-events"') &&
    uiSmoke.includes("client live source site group missing") &&
    uiSmoke.includes("client live dock event feed missing"),
);

if (args.browserSmoke) {
  await runBrowserRedactionSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Client source dock/events 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Client source dock/events 통과 ==");

function parseArgs(rawArgs) {
  const parsed = {
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9920,
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

async function runBrowserRedactionSmoke() {
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
          await wait(700);
          const layout = document.querySelector('[data-testid="client-live-workspace"]');
          const dockSide = document.querySelector('#liveDockSide');
          if (dockSide) {
            dockSide.value = 'right';
            dockSide.dispatchEvent(new Event('change', { bubbles: true }));
          }
          await wait(120);
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          const siteGroups = document.querySelectorAll('[data-testid="client-live-source-tree"] [data-tree-level="site"]').length;
          const floorGroups = document.querySelectorAll('[data-testid="client-live-source-tree"] [data-tree-level="floor"]').length;
          const feed = document.querySelector('[data-testid="client-live-dock-event-feed"][data-redaction="viewer-safe-events"]');
          return {
            ok: Boolean(layout && feed) && layout.dataset.dockSide === 'right' && siteGroups > 0 && floorGroups > 0 && forbidden.length === 0,
            dockSide: layout?.dataset.dockSide || '',
            siteGroups,
            floorGroups,
            feedText: feed?.textContent?.trim().slice(0, 160) || '',
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser source tree/dock event feed redaction smoke", Boolean(result?.ok));
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}
