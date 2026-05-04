#!/usr/bin/env node
// 파일 용도: /ops와 /client 제품 shell의 안정 selector와 client 노출 금지 항목을 빠르게 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = parseArgs(process.argv.slice(2));
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const screenshotEnabled = isTruthy(args.screenshots);
const chromePath = args.chromePath || findChrome();
const visualWidths = parseWidthList(args.visualWidths || "390,1180");
const visualHeight = Number(args.visualHeight || 900);
const debugPortBase = Number(args.debugPortBase || 9700);
const runId = `ops-client-ui-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);

const productShellMust = [
  'class="product-shell"',
  'id="themeToggleBtn"',
  'class="account-menu"',
  "window.MediaServerUi",
];

const opsShellMust = [
  'aria-label="운영 메뉴"',
  'href="/ops/home"',
  'href="/client/live"',
];

const clientShellMust = [
  'aria-label="클라이언트 메뉴"',
  'id="views-data"',
  '<script type="application/json" id="views-data">',
];

const pageChecks = [
  {
    name: "ops-home",
    path: "/ops/home",
    visualSelector: '[data-testid="ops-home-page"]',
    must: ['data-testid="ops-home-page"', 'data-ops-panel="home"', 'id="homeChannelCount"', 'class="debug-drawer"'],
  },
  {
    name: "ops-dashboard",
    path: "/ops/dashboard",
    visualSelector: '[data-testid="ops-dashboard-page"]',
    must: ['data-testid="ops-dashboard-page"', 'id="opsDashboardFrame"', "/lab/rules?embed=1&tab=dashboard&panel=dashboard"],
  },
  {
    name: "ops-sources",
    path: "/ops/sources",
    visualSelector: '[data-testid="ops-sources-page"]',
    must: ['data-testid="ops-sources-page"', 'id="channels-body"', 'id="channel-detail-panel"', "Registry raw JSON"],
  },
  {
    name: "ops-users",
    path: "/ops/users",
    visualSelector: '[data-testid="ops-users-page"]',
    must: ['data-testid="ops-users-page"', 'id="users-body"', 'id="user-editor"', 'id="view-assignment"'],
  },
  {
    name: "client-live",
    path: "/client/live",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="live"', 'id="views"', 'id="detail"'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
  {
    name: "client-dashboard",
    path: "/client/dashboard",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
  {
    name: "client-events",
    path: "/client/events",
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
];

let passCount = 0;
let failCount = 0;
const failures = [];

for (const check of pageChecks) {
  try {
    const html = await requestText(check.path);
    const shellMust = check.shellMust || opsShellMust;
    assertContains(check.name, html, [...productShellMust, ...shellMust, ...(check.must || [])]);
    assertOmits(check.name, html, check.mustNot || []);
    passCount += 1;
    console.log(`[pass] ${check.name}: ${check.path}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${check.name}] ${message}`);
    console.log(`[fail] ${check.name}: ${message}`);
  }
}

try {
  const payload = await requestText("/client/api/views");
  assertOmits("client-api-views", payload, [
    '"rtspUrl"',
    '"httpUrl"',
    '"file":',
    '"webrtcSourceId"',
    '"storagePath"',
    '"debugCounters"',
    "Developer URL",
    "BBox diagnostics",
    "data-copy-stream-channel",
    "channel-stream-actions",
    "SourceRegistry",
  ]);
  passCount += 1;
  console.log("[pass] client-api-views: sensitive source/debug fields omitted");
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[client-api-views] ${message}`);
  console.log(`[fail] client-api-views: ${message}`);
}

console.log("");
console.log("== Ops/Client UI smoke 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);

if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

if (screenshotEnabled) {
  if (!chromePath) {
    console.log("[fail] visual-smoke: Chrome executable not found");
    process.exit(1);
  }
  fs.mkdirSync(outputDir, { recursive: true });
  await runVisualSmoke();
}

function clientForbiddenText() {
  return [
    "Registry raw JSON",
    "debugCounters",
    "Developer URL",
    "BBox diagnostics",
    "developer-url-details",
    "opsLiveRaw",
    "opsEventsRaw",
    "sources-json",
    "views-json",
    "client-views-json",
    "rtsp://",
    "WHIP sourceId",
    "Event POST",
    "/lab/runtime/status",
    "/lab/analysis/event-post",
    "/lab/analysis/taps",
  ];
}

function assertContains(name, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`missing selector/text: ${needle}`);
    }
  }
}

function assertOmits(name, text, needles) {
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`forbidden client/debug text leaked: ${needle}`);
    }
  }
}

async function requestText(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
      credentials: "same-origin",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function runVisualSmoke() {
  const visualPages = pageChecks.filter((check) => check.visualSelector);
  let visualPass = 0;
  let visualFail = 0;
  const visualFailures = [];
  let index = 0;
  for (const check of visualPages) {
    for (const width of visualWidths) {
      const label = `${check.name}-${width}`;
      const debugPort = debugPortBase + index;
      index += 1;
      try {
        const result = await runVisualPageCheck(check, width, debugPort, label);
        visualPass += 1;
        console.log(`[pass] visual-${label}: overflow=${result.overflowX}`);
      } catch (error) {
        visualFail += 1;
        const message = error instanceof Error ? error.message : String(error);
        visualFailures.push(`[visual-${label}] ${message}`);
        console.log(`[fail] visual-${label}: ${message}`);
      }
    }
  }
  console.log("");
  console.log("== Ops/Client screenshot smoke 요약 ==");
  console.log(`- 통과: ${visualPass}`);
  console.log(`- 실패: ${visualFail}`);
  console.log(`- screenshots: ${outputDir}`);
  if (visualFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of visualFailures) {
      console.log(`  - ${failure}`);
    }
    process.exit(1);
  }
}

async function runVisualPageCheck(check, width, debugPort, label) {
  const url = new URL(check.path, `${httpBase}/`).toString();
  const browser = await launchBrowser(debugPort, width, visualHeight, url);
  try {
    const result = await browser.evaluate(
      `
        (() => {
          const selector = ${JSON.stringify(check.visualSelector)};
          const target = document.querySelector(selector);
          const body = document.body;
          const doc = document.documentElement;
          const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
          const required = [
            ['body.product-shell', document.querySelector('body.product-shell')],
            ['themeToggleBtn', document.getElementById('themeToggleBtn')],
            ['account-menu', document.querySelector('.account-menu')],
            [selector, target],
          ];
          const missing = required.filter(([, el]) => !el).map(([name]) => name);
          const targetRect = target ? target.getBoundingClientRect() : null;
          const targetVisible = targetRect ? targetRect.width > 0 && targetRect.height > 0 : false;
          return {
            ok: missing.length === 0 && targetVisible && overflowX <= 2,
            missing,
            targetVisible,
            overflowX,
            title: document.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
          };
        })()
      `,
      10000,
    );
    const screenshotFile = path.join(outputDir, `${label}.png`);
    await captureScreenshot(browser.cdp, screenshotFile);
    if (!result?.ok) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function launchBrowser(port, width, viewportHeight, targetUrl) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-ops-client-chrome-"));
  const pending = new Map();
  let messageId = 0;
  let ws = null;
  const chrome = spawn(
    chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${viewportHeight}`,
      "--headless=new",
      "--hide-scrollbars=false",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  chrome.stdout.on("data", (chunk) => {
    if (args.verbose) process.stdout.write(`[chrome] ${chunk}`);
  });
  chrome.stderr.on("data", (chunk) => {
    if (args.verbose) process.stderr.write(`[chrome] ${chunk}`);
  });
  const cdp = (method, params = {}) => {
    if (!ws) throw new Error("CDP websocket is not connected");
    const id = ++messageId;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  };
  const close = async () => {
    for (const [id, entry] of pending.entries()) {
      entry.reject(new Error(`CDP closed before response for message ${id}`));
    }
    pending.clear();
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    if (chrome && !chrome.killed) {
      chrome.kill("SIGTERM");
      await onceExit(chrome, 5000).catch(() => {
        chrome.kill("SIGKILL");
      });
    }
    fs.rmSync(userDataDir, { recursive: true, force: true });
  };
  try {
    const target = await waitForAnyPageTarget(port, timeoutMs);
    ws = await connectWebSocket(target.webSocketDebuggerUrl, pending);
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: width <= 560,
    });
    await cdp("Page.navigate", { url: targetUrl });
    await waitForDocumentReady((expression, evalTimeoutMs) => evaluateWithCdp(cdp, expression, evalTimeoutMs), timeoutMs);
    return {
      cdp,
      evaluate: (expression, evalTimeoutMs) => evaluateWithCdp(cdp, expression, evalTimeoutMs),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

async function captureScreenshot(cdp, outputFile) {
  const result = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(outputFile, Buffer.from(result.data, "base64"));
}

async function waitForAnyPageTarget(port, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error(`Chrome CDP target timeout: port=${port}`);
}

async function connectWebSocket(url, pending) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", (event) => reject(event.error || new Error("WebSocket open failed")), { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id !== "number") return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
    } else {
      entry.resolve(message.result);
    }
  });
  socket.addEventListener("close", () => {
    for (const [id, entry] of pending.entries()) {
      pending.delete(id);
      entry.reject(new Error("CDP socket closed"));
    }
  });
  return socket;
}

async function waitForDocumentReady(evaluate, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const state = await evaluate("document.readyState", 5000);
      if (state === "complete") return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("document.readyState=complete timeout");
}

async function evaluateWithCdp(cdp, expression, evalTimeoutMs) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Runtime.evaluate timeout: ${evalTimeoutMs}ms`)), evalTimeoutMs);
  });
  const result = await Promise.race([
    cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    }),
    timeout,
  ]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
  if (!result || !result.result) return undefined;
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result.result.value;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[toCamel(raw)] = next;
      index += 1;
    } else {
      result[toCamel(raw)] = "1";
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function parseWidthList(value) {
  const parsed = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (parsed.length === 0) {
    throw new Error(`invalid visual widths: ${value}`);
  }
  return parsed;
}

function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function onceExit(child, waitTimeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child exit timeout")), waitTimeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}
