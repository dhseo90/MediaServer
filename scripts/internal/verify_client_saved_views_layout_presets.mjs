#!/usr/bin/env node
// 파일 용도: Saved Views/Layout Presets의 preference API/UI/권한 preset 분리 계약을 검증한다.

import fs from "node:fs";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log(`Saved Views/Layout Presets verification

Usage:
  ./server.sh verify-client-saved-views-layout-presets [--roundtrip-smoke] [--browser-smoke]
    [--http-base <url>] [--timeout-ms <ms>] [--chrome-path <path>] [--debug-port <port>]`);
  process.exit(0);
}
const failures = [];
const args = parseArgs(rawArgs);

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_client_scripts.cpp");
const css = readText("src/ingress/product_ui_client_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const auth = readText("src/ingress/http_auth.cpp");
const serverSh = readText("server.sh");

for (const [label, snippet] of [
  ["client live UI defines layout preference endpoint", "liveLayoutPreferenceEndpoint"],
  ["client live UI defines layout preference schema", "media-server.client-live-layout.v1"],
  ["client live UI captures current layout snapshot", "liveCurrentLayoutSnapshot"],
  ["client live UI applies saved layout preference", "applyLiveLayoutPreference"],
  ["client live UI persists workspace layout", "workspaceLayout"],
  ["client live UI persists selected sources", "selectedSources"],
  ["client live UI persists overlay defaults", "overlayDefaults"],
  ["client live UI persists selected tile event feed", "eventFeed: 'selected-tile'"],
  ["client live UI exposes save layout control", "id=\"liveSaveLayoutPreference\""],
  ["client live UI exposes apply user layout control", "id=\"liveApplyUserLayoutPreference\""],
  ["client live UI exposes apply role preset control", "id=\"liveApplyRoleLayoutPreset\""],
  ["client live UI exposes layout presets panel", "data-testid=\"client-live-layout-presets\""],
  ["client live UI marks user preference role preset contract", "data-preset-contract=\"user-preference,role-preset\""],
]) {
  check(label, () => {
    assertIncludes(script, snippet, "client live layout UI");
  });
}

check("saved layout UI styles layout preset panel", () => {
  assertIncludes(css, ".live-layout-presets", "client live layout preset styles");
});

check("saved layout UI styles stable preset grid", () => {
  assertIncludes(css, "grid-template-columns: minmax(0, 1fr) auto auto auto auto auto", "client live layout preset styles");
});

for (const [label, forbidden] of [
  ["saved layout UI hides RTSP URL", "rtspUrl"],
  ["saved layout UI hides source URL", "sourceUrl"],
  ["saved layout UI hides developer URL", "Developer URL"],
  ["saved layout UI hides raw JSON", "raw JSON"],
  ["saved layout UI hides debug counters", "debugCounters"],
  ["saved layout UI hides BBox diagnostics", "BBox diagnostics"],
  ["saved layout UI hides password hash", "passwordHash"],
  ["saved layout UI hides token hash", "tokenHash"],
]) {
  check(label, () => {
    const layoutBlock = script.slice(
      script.indexOf("const liveLayoutPreferenceEndpoint"),
      script.indexOf("function tileView"),
    );
    assert(!layoutBlock.includes(forbidden), `layout UI must not expose ${forbidden}`);
  });
}

check("server command exposes saved layout verifier command", () => {
  assertIncludes(uiSmoke + serverSh, "verify-client-saved-views-layout-presets", "saved layout smoke wiring");
});

check("server command exposes saved layout verifier script", () => {
  assertIncludes(uiSmoke + serverSh, "verify_client_saved_views_layout_presets.mjs", "saved layout smoke wiring");
});

check("client UI smoke tracks saved layout presets panel", () => {
  assertIncludes(uiSmoke + serverSh, "data-testid=\"client-live-layout-presets\"", "saved layout smoke wiring");
});

check("client UI smoke tracks layout preference endpoint", () => {
  assertIncludes(uiSmoke + serverSh, "liveLayoutPreferenceEndpoint", "saved layout smoke wiring");
});

check("client UI smoke tracks layout preference API route", () => {
  assertIncludes(uiSmoke + serverSh, "/client/api/preferences/live-layout", "saved layout smoke wiring");
});

check("saved layout preference API does not add layout read scope", () => {
  assert(!auth.includes("layout:read"), "auth scopes must not add layout:read");
});

check("saved layout preference API does not add layout write scope", () => {
  assert(!auth.includes("layout:write"), "auth scopes must not add layout:write");
});

check("saved layout preference API does not add preference read scope", () => {
  assert(!auth.includes("preference:read"), "auth scopes must not add preference:read");
});

check("saved layout preference API does not add preference write scope", () => {
  assert(!auth.includes("preference:write"), "auth scopes must not add preference:write");
});

check("client live layout preference endpoint exists", () => {
  assertIncludes(server, "/client/api/preferences/live-layout", "client live layout preference API");
});

check("client live layout preference storage exists", () => {
  assertIncludes(server, ".media_server.client_live_layout_preferences.jsonl", "client live layout preference API");
});

check("client live layout preference JSON serializer exists", () => {
  assertIncludes(server, "ClientLiveLayoutPreferencesJson", "client live layout preference API");
});

check("client live layout preference upsert exists", () => {
  assertIncludes(server, "UpsertClientLiveLayoutPreference", "client live layout preference API");
});

check("client live layout preference stays separate from role preset", () => {
  assertIncludes(server, "userPreferenceSeparateFromRolePreset", "client live layout preference API");
});

check("client live role preset stays separate from user preference", () => {
  assertIncludes(server, "rolePresetSeparateFromUserPreference", "client live layout preference API");
});

check("client live layout preference does not change auth scope", () => {
  assertIncludes(server, "authScopeChanged", "client live layout preference API");
});

check("client live layout preference does not change media path", () => {
  assertIncludes(server, "mediaPathChanged", "client live layout preference API");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}
if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Saved Views/Layout Presets 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Saved Views/Layout Presets 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    roundtripSmoke: false,
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9943,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--browser-smoke") {
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

async function checkAsync(name, fn) {
  try {
    await fn();
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

async function requestJson(resourcePath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(`${args.httpBase}${resourcePath}`, {
      cache: "no-store",
      signal: controller.signal,
      ...options,
    });
    const text = await response.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { response, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function runRoundtripSmoke() {
  await checkAsync("preference API roundtrip separates user preference from role preset", async () => {
    const views = await requestJson("/client/api/views");
    assert(views.response.ok, `/client/api/views HTTP ${views.response.status}`);
    const viewId = views.json?.views?.[0]?.viewId || "";
    const first = await requestJson("/client/api/preferences/live-layout");
    assert(first.response.ok, `GET preference HTTP ${first.response.status}`);
    assert(first.json?.contract?.userPreferenceSeparateFromRolePreset === true, "contract separation missing");
    assert(first.json?.rolePreset?.presetType === "role", "role preset missing");

    const layout = {
      schema: "media-server.client-live-layout.v1",
      presetType: "user",
      workspaceLayout: { gridSize: 2, density: "compact", dockSide: "right" },
      filters: { eventFeed: "selected-tile", selectedTileIndex: 1, selectedViewId: viewId },
      overlayDefaults: { infoOverlayEnabled: true },
      selectedSources: [
        { slot: 0, viewId, overlayMode: "raw" },
        { slot: 1, viewId: "", overlayMode: "" },
      ],
      tiles: [
        { slot: 0, viewId, overlayMode: "raw", selected: false },
        { slot: 1, viewId: "", overlayMode: "", selected: true },
      ],
    };
    const saved = await requestJson("/client/api/preferences/live-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout),
    });
    assert(saved.response.ok, `PUT preference HTTP ${saved.response.status}: ${saved.text}`);
    assert(saved.json?.saved === true, "saved flag missing");
    assert(saved.json?.userPreference?.workspaceLayout?.gridSize === 2 && saved.json?.userPreference?.workspaceLayout?.density === "compact" && saved.json?.userPreference?.workspaceLayout?.dockSide === "right", "ClientLiveLayoutPreferenceRecordJson saved grid/density/dock did not roundtrip");
    assert(saved.json?.userPreference?.overlayDefaults?.infoOverlayEnabled === true, "overlay default did not roundtrip");
    assert(saved.json?.rolePreset?.presetType === "role", "role preset was not returned separately");

    const rejected = await requestJson("/client/api/preferences/live-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...layout,
        sourceUrl: "rtsp://192.0.2.10/live",
      }),
    });
    assert(rejected.response.status === 400, `forbidden source URL preference was not rejected: ${rejected.response.status}`);
    for (const forbidden of ["rtsp://", "passwordHash", "tokenHash", "debugCounters", "BBox diagnostics"]) {
      assert(!saved.text.includes(forbidden), `preference response leaked ${forbidden}`);
    }
  });
}

async function runBrowserSmoke() {
  const firstBrowser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/client/live",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const saved = await firstBrowser.evaluate(
      `
        (async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          for (let i = 0; i < 30 && !document.querySelector('#liveSaveLayoutPreference'); i += 1) {
            await wait(150);
          }
          const grid = document.querySelector('#liveGridSize');
          const dock = document.querySelector('#liveDockSide');
          const density = document.querySelector('#liveDensity');
          const overlay = document.querySelector('#liveInfoOverlayToggle');
          const save = document.querySelector('#liveSaveLayoutPreference');
          if (!grid || !dock || !density || !overlay || !save) {
            return { ok: false, reason: 'layout controls missing' };
          }
          grid.value = '2';
          grid.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(250);
          document.querySelector('#liveDockSide').value = 'right';
          document.querySelector('#liveDockSide').dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelector('#liveDensity').value = 'compact';
          document.querySelector('#liveDensity').dispatchEvent(new Event('change', { bubbles: true }));
          const nextOverlay = document.querySelector('#liveInfoOverlayToggle');
          if (!nextOverlay.checked) nextOverlay.click();
          document.querySelector('#liveSaveLayoutPreference').click();
          await wait(900);
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          return {
            ok: forbidden.length === 0,
            grid: document.querySelector('#liveGridSize')?.value,
            dock: document.querySelector('#liveDockSide')?.value,
            density: document.querySelector('#liveDensity')?.value,
            overlay: document.querySelector('#liveInfoOverlayToggle')?.checked,
            userPreference: {
              grid: document.querySelector('#liveGridSize')?.value,
              dock: document.querySelector('#liveDockSide')?.value,
              density: document.querySelector('#liveDensity')?.value,
              overlay: document.querySelector('#liveInfoOverlayToggle')?.checked,
            },
            status: document.querySelector('[data-role="layout-preset-status"]')?.textContent || '',
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser saved layout write smoke", () => {
      assert(Boolean(saved?.ok), "browser saved layout write result was not ok");
    });
    if (!saved?.ok) console.log(JSON.stringify(saved, null, 2));
  } finally {
    await firstBrowser.close();
  }

  const secondBrowser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/client/live",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort + 1,
    width: 1180,
    height: 900,
  });
  try {
    const result = await secondBrowser.evaluate(
      `
        (async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          for (let i = 0; i < 30 && !document.querySelector('#liveSaveLayoutPreference'); i += 1) {
            await wait(150);
          }
          const text = document.body.innerText || '';
          const forbidden = ['rtsp://', 'source URL', 'Developer URL', 'raw JSON', 'debugCounters', 'BBox diagnostics', 'passwordHash', 'tokenHash']
            .filter(item => text.includes(item));
          return {
            ok: document.querySelector('#liveGridSize')?.value === '2' &&
              document.querySelector('#liveDockSide')?.value === 'right' &&
              document.querySelector('#liveDensity')?.value === 'compact' &&
              document.querySelector('#liveInfoOverlayToggle')?.checked === true &&
              Boolean(document.querySelector('[data-testid="client-live-layout-presets"]')) &&
              forbidden.length === 0,
            grid: document.querySelector('#liveGridSize')?.value,
            dock: document.querySelector('#liveDockSide')?.value,
            density: document.querySelector('#liveDensity')?.value,
            overlay: document.querySelector('#liveInfoOverlayToggle')?.checked,
            userPreference: {
              grid: document.querySelector('#liveGridSize')?.value,
              dock: document.querySelector('#liveDockSide')?.value,
              density: document.querySelector('#liveDensity')?.value,
              overlay: document.querySelector('#liveInfoOverlayToggle')?.checked,
            },
            status: document.querySelector('[data-role="layout-preset-status"]')?.textContent || '',
            forbidden,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser saved layout reload smoke", () => {
      assert(Boolean(result?.ok) && result?.userPreference?.grid === "2" && result?.userPreference?.dock === "right", "browser userPreference saved layout result was not restored");
    });
    if (!result?.ok) console.log(JSON.stringify(result, null, 2));
  } finally {
    await secondBrowser.close();
  }
}
