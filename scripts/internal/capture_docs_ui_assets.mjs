#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8082").replace(/\/+$/, "");
const chromePath = args.chromePath || findChrome();
const outputDir = args.outputDir
  ? path.resolve(args.outputDir)
  : path.resolve("docs/assets/ui");
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
    clip: { selectors: ['header', '[data-testid="ops-home-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1020 },
  },
  {
    name: "ops-live",
    file: "ops-live.png",
    pagePath: "/ops/live",
    viewport: { width: 1680, height: 1220 },
    setup: async (browser) => {
      await applyDarkTheme(browser);
      await delay(500);
      await evaluate(browser, `(() => {
        const first = document.querySelector('[data-live-row-id]');
        if (first) first.click();
        return !!first;
      })()`);
      await delay(600);
    },
    clip: { selectors: ['header', '[data-testid="ops-live-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1050 },
  },
  {
    name: "ops-channels",
    file: "ops-channels.png",
    pagePath: "/ops/sources",
    viewport: { width: 1680, height: 1250 },
    clip: { selectors: ['header', '[data-testid="ops-sources-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1080 },
  },
  {
    name: "ops-rules",
    file: "ops-rules.png",
    pagePath: "/ops/rules",
    viewport: { width: 1680, height: 1250 },
    clip: { selectors: ['header', '[data-testid="ops-rules-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1080 },
  },
  {
    name: "ops-users",
    file: "ops-users.png",
    pagePath: "/ops/users",
    viewport: { width: 1680, height: 1250 },
    clip: { selectors: ['header', '[data-testid="ops-users-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1080 },
  },
  {
    name: "ops-dashboard",
    file: "ops-dashboard.png",
    pagePath: "/ops/dashboard",
    viewport: { width: 1680, height: 1220 },
    clip: { selectors: ['header', '[data-testid="ops-dashboard-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1040 },
  },
  {
    name: "client-live",
    file: "client-live.png",
    pagePath: "/client/live",
    viewport: { width: 1680, height: 1220 },
    setup: setupClientLive,
    clip: { selectors: ['header', '[data-testid="client-shell-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1040 },
  },
  {
    name: "client-dashboard",
    file: "client-dashboard.png",
    pagePath: "/client/dashboard",
    viewport: { width: 1680, height: 1180 },
    setup: setupClientDashboard,
    clip: { selectors: ['header', '[data-testid="client-shell-page"]'], fitMainWidth: true, margin: 18, maxHeight: 1000 },
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
    clip: { selectors: ["main"], margin: 24, minWidth: 920, minHeight: 620, maxHeight: 620 },
    optional: true,
  },
  {
    name: "analysis-rule-list",
    file: "analysis-rule-list.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1280 },
    setup: async (browser) => {
      await applyDarkTheme(browser);
      await delay(600);
      await click(browser, "analysisSettingsTabBtn");
      await delay(500);
    },
    clip: { selectors: ['#vaRuleLibraryCard'], margin: 18, maxHeight: 980 },
  },
  {
    name: "analysis-rule-editor-basic",
    file: "analysis-rule-editor-basic.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1320 },
    setup: async (browser) => {
      await openLabRuleEditor(browser, "1");
      await scrollIntoView(browser, "#ruleBasicSection");
    },
    clip: { selectors: ['#vaRuleEditorPanel', '#ruleBasicSection'], margin: 18, maxHeight: 980 },
  },
  {
    name: "analysis-rule-editor-scenario",
    file: "analysis-rule-editor-scenario.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1440 },
    setup: async (browser) => {
      await openLabRuleEditor(browser, "1");
      await evaluate(browser, `(() => {
        const scenario = document.querySelector('input[name="ruleKind"][value="scenario"]');
        if (scenario) {
          scenario.click();
          scenario.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const type = document.getElementById('scenarioType');
        if (type) {
          type.value = 'loitering';
          type.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      })()`);
      await delay(500);
      await scrollIntoView(browser, "#ruleScenarioSection");
    },
    clip: { selectors: ['#ruleScenarioSection'], margin: 18, maxHeight: 1120 },
  },
  {
    name: "analysis-region-canvas",
    file: "analysis-region-canvas.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1560 },
    setup: async (browser) => {
      await openLabRuleEditor(browser, "1");
      await startRulePreviewForCanvas(browser);
      await scrollIntoView(browser, "#ruleGeometrySection");
    },
    clip: { selectors: ['#ruleGeometrySection'], margin: 18, maxHeight: 1320 },
  },
  {
    name: "analysis-preview",
    file: "analysis-preview.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1480 },
    setup: async (browser) => {
      await openLabViewer(browser, { mode: "overlay", file: "va_four_scene_sample.mp4" });
      await scrollIntoView(browser, "#viewerPanel");
    },
    clip: { selectors: ['#viewerPanel'], margin: 18, maxHeight: 1220 },
  },
  {
    name: "analysis-developer-url",
    file: "analysis-developer-url.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1600 },
    setup: async (browser) => {
      await openLabViewer(browser, { mode: "overlay", file: "va_four_scene_sample.mp4" });
      await evaluate(browser, `(() => {
        const details = document.querySelector('.developer-url-details');
        if (details) details.open = true;
        return true;
      })()`);
      await delay(500);
      await scrollIntoView(browser, ".developer-url-details");
    },
    clip: { selectors: ['.developer-url-details'], margin: 18, maxHeight: 1380 },
  },
  {
    name: "analysis-runtime-dashboard",
    file: "analysis-runtime-dashboard.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1580 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardPanel");
    },
    clip: { selectors: ['#dashboardPanel', '#dashboardTrendSummary', '#dashboardMetadataTitle'], margin: 18, maxHeight: 1020 },
  },
  {
    name: "analysis-runtime-dashboard-trend",
    file: "analysis-runtime-dashboard-trend.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1700 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardTrendSummary");
    },
    clip: { selectors: ['#dashboardTrendSummary', '#dashboardTrendRows'], margin: 18, maxHeight: 1320 },
  },
  {
    name: "analysis-runtime-dashboard-metadata",
    file: "analysis-runtime-dashboard-metadata.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1700 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardMetadataTitle");
    },
    clip: { selectors: ['#dashboardMetadataTitle', '#dashboardMetadataTitle + p', '#dashboardMetadataTitle'], margin: 18, maxHeight: 1320, extraSelectors: ['[aria-labelledby="dashboardMetadataTitle"]'] },
  },
  {
    name: "analysis-runtime-dashboard-runtime",
    file: "analysis-runtime-dashboard-runtime.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1700 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardRuntimeDetailTitle");
    },
    clip: { selectors: ['[aria-labelledby="dashboardRuntimeDetailTitle"]', '[aria-labelledby="dashboardVaRuleDebugTitle"]'], margin: 18, maxHeight: 1320 },
  },
  {
    name: "analysis-runtime-dashboard-tracks",
    file: "analysis-runtime-dashboard-tracks.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1520 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardTracksTitle");
    },
    clip: { selectors: ['[aria-labelledby="dashboardTracksTitle"]'], margin: 18, maxHeight: 1180 },
  },
  {
    name: "analysis-runtime-dashboard-scenarios",
    file: "analysis-runtime-dashboard-scenarios.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1660 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardScenariosTitle");
    },
    clip: { selectors: ['[aria-labelledby="dashboardScenariosTitle"]', '[aria-labelledby="dashboardScenarioTimelineTitle"]'], margin: 18, maxHeight: 1320 },
  },
  {
    name: "analysis-runtime-dashboard-records",
    file: "analysis-runtime-dashboard-records.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1820 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await openEventRecordResults(browser);
      await scrollIntoView(browser, "#dashboardEventRecordsDetails");
    },
    clip: { selectors: ['#dashboardEventRecordsDetails'], margin: 18, maxHeight: 1460 },
  },
  {
    name: "analysis-runtime-dashboard-tracking-issues",
    file: "analysis-runtime-dashboard-tracking-issues.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1700 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await scrollIntoView(browser, "#dashboardIssuesTitle");
    },
    clip: { selectors: ['[aria-labelledby="dashboardIssuesTitle"]'], margin: 18, maxHeight: 1320 },
  },
  {
    name: "analysis-runtime-dashboard-records-issues",
    file: "analysis-runtime-dashboard-records-issues.png",
    pagePath: "/lab/rules",
    viewport: { width: 1680, height: 1900 },
    setup: async (browser) => {
      await prepareRuntimeDashboard(browser);
      await openEventRecordResults(browser);
      await scrollIntoView(browser, "#dashboardEventRecordsDetails");
    },
    clip: { selectors: ['#dashboardEventRecordsDetails', '[aria-labelledby="dashboardIssuesTitle"]'], margin: 18, maxHeight: 1540 },
  },
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
console.log(`- pass: ${passCount}`);
console.log(`- fail: ${failCount}`);

if (failures.length) {
  console.log("- failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

async function captureTask(task, debugPort) {
  const browser = await openBrowserPage({
    httpBase,
    pagePath: task.pagePath,
    timeoutMs: 20000,
    chromePath,
    debugPort,
    width: task.viewport.width,
    height: task.viewport.height,
    outputDir,
    verbose,
  });
  try {
    await applyDarkTheme(browser);
    await delay(400);
    if (task.setup) {
      await task.setup(browser);
    }
    await delay(500);
    const clip = await computeClip(browser, task.clip);
    await saveClip(browser, path.join(outputDir, task.file), clip);
  } finally {
    await browser.close();
  }
}

async function applyDarkTheme(browser) {
  await evaluate(browser, `(() => {
    localStorage.setItem('mediaServerTheme', 'dark');
    document.documentElement.dataset.theme = 'dark';
    return document.documentElement.dataset.theme;
  })()`);
}

async function setupClientLive(browser) {
  await applyDarkTheme(browser);
  await evaluate(browser, `(() => {
    const viewButton = document.querySelector('#views .view[data-view-id="2"]') || document.querySelector('#views .view');
    if (viewButton) viewButton.click();
    return !!viewButton;
  })()`);
  await delay(500);
  await evaluate(browser, `(() => {
    const density = document.getElementById('liveDensity');
    const grid = document.getElementById('liveGridSize');
    if (density) {
      density.value = 'comfortable';
      density.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (grid) {
      grid.value = '1';
      grid.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  })()`);
  await delay(700);
  await evaluate(browser, `(() => {
    if (typeof setTileView === 'function') setTileView(0, '2');
    const tile = document.querySelector('[data-tile="0"]');
    const mode = tile?.querySelector('[data-role="mode"]');
    if (mode) {
      mode.value = 'raw';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const start = document.querySelector('[data-action="start"]');
    if (start) start.click();
    return !!start;
  })()`, 8000);
  await delay(6500);
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

async function openLabRuleEditor(browser, ruleId) {
  await applyDarkTheme(browser);
  await click(browser, "analysisSettingsTabBtn");
  await delay(400);
  await evaluate(browser, `(() => {
    if (typeof openVaRuleEditorForEdit === 'function') {
      openVaRuleEditorForEdit(${JSON.stringify(ruleId)});
      return true;
    }
    throw new Error('openVaRuleEditorForEdit unavailable');
  })()`, 8000);
  await delay(700);
}

async function startRulePreviewForCanvas(browser) {
  await evaluate(browser, `(() => {
    const mode = document.getElementById('previewSourceMode');
    const file = document.getElementById('previewFileSelect');
    const overlay = document.getElementById('previewOverlayInput');
    const auto = document.getElementById('autoPreviewInput');
    if (mode) {
      mode.value = 'file';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (file) {
      file.value = 'va_four_scene_sample.mp4';
      file.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (overlay && !overlay.checked) overlay.click();
    if (auto && !auto.checked) auto.click();
    return true;
  })()`);
  await delay(500);
  await evaluate(browser, `(async () => {
    if (typeof startRulePreview !== 'function') throw new Error('startRulePreview unavailable');
    await startRulePreview();
    return true;
  })()`, 20000);
  await delay(3000);
}

async function openLabViewer(browser, { mode = "overlay", file = "va_four_scene_sample.mp4" } = {}) {
  await applyDarkTheme(browser);
  await click(browser, "analysisViewerTabBtn");
  await delay(500);
  await evaluate(browser, `(() => {
    const radio = document.querySelector('input[name="viewMode"][value=${JSON.stringify(mode)}]');
    if (radio) radio.click();
    const sourceKind = document.getElementById('viewSourceKind');
    const fileSelect = document.getElementById('viewFileSelect');
    if (sourceKind) {
      sourceKind.value = 'file';
      sourceKind.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (fileSelect) {
      fileSelect.value = ${JSON.stringify(file)};
      fileSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  })()`);
  await delay(500);
  await evaluate(browser, `(async () => {
    if (typeof startViewPreview !== 'function') throw new Error('startViewPreview unavailable');
    await startViewPreview();
    return true;
  })()`, 25000);
  await delay(5000);
}

async function prepareRuntimeDashboard(browser) {
  await openLabViewer(browser, { mode: "rule", file: "va_four_scene_sample.mp4" });
  await evaluate(browser, `(() => {
    const select = document.getElementById('viewVaRuleSelect');
    if (select) {
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  })()`);
  await delay(500);
  await evaluate(browser, `(async () => {
    if (typeof startViewPreview !== 'function') throw new Error('startViewPreview unavailable');
    await startViewPreview();
    return true;
  })()`, 25000);
  await delay(8000);
  await click(browser, "analysisDashboardTabBtn");
  await delay(2500);
  await evaluate(browser, `(() => {
    const tapSelect = document.getElementById('dashboardTapSelect');
    if (tapSelect && tapSelect.options.length > 1) {
      const next = Array.from(tapSelect.options).find((option) => option.value);
      if (next) {
        tapSelect.value = next.value;
        tapSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const details = document.getElementById('dashboardEventRecordsDetails');
    if (details) details.open = true;
    return tapSelect ? tapSelect.value : '';
  })()`, 10000);
  await delay(2500);
}

async function openEventRecordResults(browser) {
  await evaluate(browser, `(() => {
    const details = document.getElementById('dashboardEventRecordsDetails');
    if (details) details.open = true;
    return true;
  })()`);
  await delay(300);
  await click(browser, "eventRecordSearchBtn");
  await delay(2500);
}

async function click(browser, id) {
  await evaluate(browser, `(() => {
    const button = document.getElementById(${JSON.stringify(id)});
    if (!button) throw new Error('missing element: ' + ${JSON.stringify(id)});
    button.click();
    return true;
  })()`, 8000);
}

async function scrollIntoView(browser, selector) {
  await evaluate(browser, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    return !!node;
  })()`);
  await delay(350);
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
    let x = Math.max(0, Math.floor(window.scrollX + left - margin));
    let y = Math.max(0, Math.floor(window.scrollY + top - margin));
    let width = Math.ceil((right - left) + margin * 2);
    const rawHeight = Math.ceil((bottom - top) + margin * 2);
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
    return { x, y, width, height };
  })()`, 8000);
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
