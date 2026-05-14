#!/usr/bin/env node
// 파일 용도: 문서에 쓰는 대표 UI screenshot asset을 Chrome으로 자동 캡처한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8082").replace(/\/+$/, "");
const chromePath = args.chromePath || findChrome();
const language = normalizeLanguage(args.lang || args.language || "ko");
const outputDir = args.outputDir
  ? path.resolve(args.outputDir)
  : path.resolve(language === "en" ? "docs/assets/ui/en" : "docs/assets/ui");
const debugPortBase = Number(args.debugPortBase || 9950);
const verbose = isTruthy(args.verbose);
const onlyTokens = String(args.only || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const tasks = [
  {
    name: "ops-home",
    file: "ops-home.png",
    pagePath: "/ops/home",
    viewport: { width: 1680, height: 1180 },
    clip: { selectors: ['header', '[data-testid="ops-home-page"]'], fitMainWidth: true, margin: 18 },
  },
  {
    name: "client-live",
    file: "client-live.png",
    pagePath: "/client/live",
    viewport: { width: 1680, height: 1800 },
    setup: setupClientLive,
    clip: {
      selectors: [
        'header',
        '[data-testid="client-shell-page"] h2',
        '[data-tile="0"]'
      ],
      fitMainWidth: true,
      margin: 18,
    },
  },
  {
    name: "ops-channels",
    file: "ops-channels.png",
    pagePath: "/ops/sources",
    viewport: { width: 1680, height: 1250 },
    clip: { selectors: ['header', '[data-testid="ops-sources-page"]'], fitMainWidth: true, margin: 18 },
  },
  {
    name: "ops-rules",
    file: "ops-rules.png",
    pagePath: "/ops/rules",
    viewport: { width: 1680, height: 1500 },
    setup: setupOpsRulesOverview,
    clip: {
      selectors: [
        'header',
        '[data-testid="ops-rules-page"] .rules-metrics-grid',
        '#opsVaRulesSection'
      ],
      fitMainWidth: true,
      margin: 18,
    },
  },
  {
    name: "ops-rules-preview",
    file: "ops-rules-preview.png",
    pagePath: "/ops/rules",
    viewport: { width: 1680, height: 1600 },
    setup: setupOpsRules,
    clip: { selectors: ['.ops-va-stage-settings'], fitMainWidth: true, margin: 18 },
  },
  {
    name: "ops-users",
    file: "ops-users.png",
    pagePath: "/ops/users",
    viewport: { width: 1680, height: 1500 },
    setup: setupOpsUsers,
    clip: { selectors: ['header', '[data-testid="ops-users-page"]'], fitMainWidth: true, margin: 18 },
  },
  {
    name: "ops-dashboard",
    file: "ops-dashboard.png",
    pagePath: "/ops/dashboard",
    viewport: { width: 1680, height: 1220 },
    clip: { selectors: ['header', '[data-testid="ops-dashboard-page"]'], fitMainWidth: true, margin: 18 },
  },
  {
    name: "client-dashboard",
    file: "client-dashboard.png",
    pagePath: "/client/dashboard",
    viewport: { width: 1680, height: 1180 },
    setup: setupClientDashboard,
    clip: { selectors: ['header', '[data-testid="client-shell-page"]'], fitMainWidth: true, margin: 18 },
    optional: true,
  },
  {
    name: "auth-login",
    file: "auth-login.png",
    pagePath: "/login",
    viewport: { width: 1680, height: 1080 },
    setup: async (browser) => {
      await applyDarkTheme(browser);
      await delay(500);
    },
    clip: { selectors: [".auth-card"], margin: 24, minWidth: 700, minHeight: 420 },
    optional: true,
  }
];

let passCount = 0;
let failCount = 0;
const failures = [];
const filteredTasks = onlyTokens.length > 0
  ? tasks.filter((task) => {
      const haystack = [task.name, task.file, task.pagePath].join(" ").toLowerCase();
      return onlyTokens.some((token) => haystack.includes(token.toLowerCase()));
    })
  : tasks;

if (onlyTokens.length > 0 && filteredTasks.length === 0) {
  console.error(`[fail] no capture tasks matched --only=${onlyTokens.join(",")}`);
  process.exit(1);
}

for (let index = 0; index < filteredTasks.length; index += 1) {
  const task = filteredTasks[index];
  const port = debugPortBase + index;
  try {
    await captureTask(task, port);
    passCount += 1;
    console.log(`[pass] ${task.file}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (task.optional) {
      console.log(`[skip] ${task.file}: ${message}`);
    } else {
      failCount += 1;
      failures.push(`${task.file}: ${message}`);
      console.log(`[fail] ${task.file}: ${message}`);
    }
  }
}

console.log("");
console.log("== UI asset capture summary ==");
console.log(`- output: ${outputDir}`);
console.log(`- language: ${language}`);
console.log(`- pass: ${passCount}`);
console.log(`- fail: ${failCount}`);

if (failures.length) {
  console.log("- failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

async function captureTask(task, debugPort) {
  const pagePath = withLanguageParam(task.pagePath);
  const browser = await openBrowserPage({
    httpBase,
    pagePath,
    timeoutMs: 20000,
    chromePath,
    debugPort,
    width: task.viewport.width,
    height: task.viewport.height,
    outputDir,
    verbose,
    locale: language === "en" ? "en-US" : "ko-KR",
  });
  try {
    await applyDarkTheme(browser);
    await delay(400);
    if (task.setup) {
      await task.setup(browser);
    }
    await applyDarkTheme(browser);
    await waitForLanguage(browser);
    await delay(500);
    const clip = await computeClip(browser, task.clip);
    await saveClip(browser, path.join(outputDir, task.file), clip);
  } finally {
    await browser.close();
  }
}

function withLanguageParam(pagePath) {
  const separator = String(pagePath).includes("?") ? "&" : "?";
  return `${pagePath}${separator}lang=${encodeURIComponent(language)}`;
}

async function applyDarkTheme(browser) {
  await evaluate(browser, `(() => {
    localStorage.setItem('mediaServerTheme', 'dark');
    localStorage.setItem('mediaServerLanguage', ${JSON.stringify(language)});
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.lang = ${JSON.stringify(language)};
    document.documentElement.dataset.lang = ${JSON.stringify(language)};
    window.MediaServerUi?.setLanguage?.(${JSON.stringify(language)}, { persist: true });
    return document.documentElement.dataset.theme;
  })()`);
}

async function waitForLanguage(browser) {
  await waitFor(browser, `(() => {
    const expected = ${JSON.stringify(language)};
    window.MediaServerUi?.setLanguage?.(expected, { persist: true });
    const select = document.querySelector('.language-select');
    return document.documentElement.dataset.lang === expected && (!select || select.value === expected);
  })()`, 5000);
}

async function setupClientLive(browser) {
  await applyDarkTheme(browser);
  await waitFor(browser, `(() => {
    const grid = document.getElementById('liveGridSize');
    const view = document.querySelector('[data-tile="0"] [data-role="view"]');
    return Boolean(grid && view && (view.options?.length || 0) > 1);
  })()`, 12000);
  await evaluate(browser, `(() => {
    document.querySelector('#liveAllStop')?.click();
    return true;
  })()`);
  await delay(1800);
  await evaluate(browser, `(() => {
    const selectByValue = (select, value) => {
      if (!select) return false;
      const option = Array.from(select.options || []).find((item) => String(item.value) === String(value));
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const grid = document.getElementById('liveGridSize');
    selectByValue(grid, '1');
    const density = document.getElementById('liveDensity');
    selectByValue(density, 'comfortable');
    return true;
  })()`);
  await delay(700);
  await waitFor(browser, `(() => {
    const tiles = Array.from(document.querySelectorAll('[data-tile]'));
    const view = document.querySelector('[data-tile="0"] [data-role="view"]');
    return tiles.length === 1 && Boolean(view) && (view.options?.length || 0) > 1;
  })()`, 8000);
  await evaluate(browser, `(() => {
    const tiles = Array.from(document.querySelectorAll('[data-tile]'));
    for (const [index, tile] of tiles.entries()) {
      const view = tile.querySelector('[data-role="view"]');
      if (!view) continue;
      if (index === 0) {
        const sample = Array.from(view.options || []).find((option) =>
          option.textContent.includes('VA Test File') ||
          option.textContent.includes('va_four_scene_sample'));
        if (sample) {
          view.value = sample.value;
          view.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        view.value = '';
        view.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return true;
  })()`);
  await delay(700);
  await waitFor(browser, `(() => {
    const mode = document.querySelector('[data-tile="0"] [data-role="mode"]');
    return Boolean(mode) && (mode.options?.length || 0) > 1;
  })()`, 8000);
  await evaluate(browser, `(() => {
    const tile = document.querySelector('[data-tile="0"]');
    const mode = tile?.querySelector('[data-role="mode"]');
    if (mode) {
      const canOverlay = Array.from(mode.options || []).some((option) => option.value === 'va-overlay');
      mode.value = canOverlay ? 'va-overlay' : 'raw';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const start = document.querySelector('[data-action="start"]');
    if (start) start.click();
    return !!start;
  })()`, 8000);
  await waitFor(browser, `(() => {
    const root = document.querySelector('[data-tile="0"]');
    const video = root?.querySelector('video');
    const placeholder = root?.querySelector('[data-role="placeholder"]');
    return Boolean(video && video.readyState >= 2 && placeholder?.hidden);
  })()`, 15000);
  await delay(3500);
}

async function setupOpsRules(browser) {
  await setupOpsRulesOverview(browser);
  await evaluate(browser, `(() => {
    const action = Array.from(document.querySelectorAll('[data-ops-rule-action="view-va"]'))
      .find((button) => button.closest('tr')?.textContent.includes('VA Test File')) ||
      document.querySelector('[data-ops-rule-action="view-va"]');
    if (!action) return false;
    action.click();
    return true;
  })()`);
  await waitFor(browser, `(() => {
    const panel = document.getElementById('opsRulesDetailPanel');
    return Boolean(panel && !panel.hidden && document.getElementById('opsVaRulePreviewStartBtn'));
  })()`, 8000);
  await evaluate(browser, `(() => {
    document.getElementById('opsRulesComposerEdit')?.click();
    return true;
  })()`);
  await waitFor(browser, `(() => {
    const channel = document.getElementById('opsVaRuleChannelSelect');
    return Boolean(channel && !channel.disabled);
  })()`, 8000);
  await evaluate(browser, `(() => {
    const selectByText = (select, matcher) => {
      if (!select) return false;
      const option = Array.from(select.options || []).find((item) => matcher(item.textContent.trim()));
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    selectByText(document.getElementById('opsVaRuleChannelSelect'), (text) =>
      text.includes('VA Test File') || text.includes('va_four_scene_sample'));
    selectByText(document.getElementById('opsVaRuleTemplateSeedSelect'), (text) =>
      text.includes('침입 후 체류') || text.includes('2 ·'));
    const start = document.getElementById('opsVaRulePreviewStartBtn');
    if (start && !start.disabled) start.click();
    return true;
  })()`);
  await waitFor(browser, `(() => {
    const video = document.getElementById('opsVaRulePreviewVideo');
    const placeholder = document.getElementById('opsVaRulePreviewPlaceholder');
    return Boolean(video && video.readyState >= 2 && placeholder?.hidden);
  })()`, 18000);
  await delay(3500);
}

async function setupOpsRulesOverview(browser) {
  await applyDarkTheme(browser);
  await waitFor(browser, `(() => {
    const row = document.querySelector('#opsVaRuleRows tr');
    return Boolean(row && !row.textContent.includes('로딩 중'));
  })()`, 12000);
}

async function setupOpsUsers(browser) {
  await applyDarkTheme(browser);
  await waitFor(browser, `(() => {
    const bodyText = document.body?.textContent || '';
    if (bodyText.includes('auth users file not found')) {
      throw new Error('auth users file not found');
    }
    const usersBody = document.querySelector('#users-body');
    const requestsBody = document.querySelector('#access-requests-body');
    const userRow = usersBody?.querySelector('tr');
    return Boolean(usersBody && requestsBody && userRow && !usersBody.textContent.includes('로딩 중'));
  })()`, 12000);
}

async function setupClientDashboard(browser) {
  await applyDarkTheme(browser);
  await evaluate(browser, `(() => {
    const viewButton = document.querySelector('#views .view[data-view-id="2"]') || document.querySelector('#views .view');
    if (viewButton) viewButton.click();
    return !!viewButton;
  })()`);
  await delay(1000);
}

async function computeClip(browser, clipSpec) {
  const selectors = []
    .concat(clipSpec.selectors || [])
    .concat(clipSpec.extraSelectors || []);
  if (selectors.length === 0) {
    throw new Error("clip selectors are required");
  }
  const result = await evaluate(browser, `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const margin = ${Number(clipSpec.margin || 16)};
    const maxHeight = ${clipSpec.maxHeight ? Number(clipSpec.maxHeight) : "null"};
    const minWidth = ${clipSpec.minWidth ? Number(clipSpec.minWidth) : "null"};
    const minHeight = ${clipSpec.minHeight ? Number(clipSpec.minHeight) : "null"};
    const fitMainWidth = ${clipSpec.fitMainWidth ? "true" : "false"};
    const nodes = selectors.map((selector) => document.querySelector(selector)).filter(Boolean);
    if (nodes.length === 0) {
      throw new Error('missing clip selectors: ' + selectors.join(', '));
    }
    const rects = nodes.map((node) => node.getBoundingClientRect());
    const main = fitMainWidth ? (document.querySelector('main') || document.body) : null;
    const mainRect = main ? main.getBoundingClientRect() : null;
    const left = fitMainWidth && mainRect ? mainRect.left : Math.min(...rects.map((rect) => rect.left));
    const right = fitMainWidth && mainRect ? mainRect.right : Math.max(...rects.map((rect) => rect.right));
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const rawWidth = Math.ceil((right - left) + margin * 2);
    const rawHeight = Math.ceil((bottom - top) + margin * 2);
    let x = Math.max(0, Math.floor(window.scrollX + left - margin));
    let y = Math.max(0, Math.floor(window.scrollY + top - margin));
    let width = rawWidth;
    let height = maxHeight ? Math.min(rawHeight, maxHeight) : rawHeight;
    if (minWidth && width < minWidth) {
      const delta = minWidth - width;
      x = Math.max(0, Math.floor(x - (delta / 2)));
      width = minWidth;
    }
    if (minHeight && height < minHeight) {
      const delta = minHeight - height;
      y = Math.max(0, Math.floor(y - (delta / 2)));
      height = minHeight;
    }
    const cropped = height < rawHeight || width < rawWidth;
    return {
      x,
      y,
      width,
      height,
      rawWidth,
      rawHeight,
      cropped,
      selectors,
      documentHeight: Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 0),
    };
  })()`, 8000);
  if (result?.cropped && !clipSpec.allowCrop) {
    throw new Error(`clip would crop selected content: selectors=${result.selectors.join(", ")} raw=${result.rawWidth}x${result.rawHeight} clip=${result.width}x${result.height}`);
  }
  return result;
}

async function saveClip(browser, outputFile, clip) {
  const result = await browser.cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      scale: 1,
    },
  });
  fs.writeFileSync(outputFile, Buffer.from(result.data, "base64"));
}

async function evaluate(browser, expression, timeoutMs = 5000) {
  return browser.evaluate(expression, timeoutMs);
}

async function waitFor(browser, expression, timeoutMs = 8000, intervalMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await evaluate(browser, expression, Math.max(2000, intervalMs * 4));
    if (result) return result;
    await delay(intervalMs);
  }
  throw new Error(`timed out waiting for condition: ${expression}`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function normalizeLanguage(value) {
  return String(value || "").toLowerCase().startsWith("en") ? "en" : "ko";
}
