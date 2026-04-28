#!/usr/bin/env node
// 파일 용도: Lab 주요 화면의 반응형 레이아웃을 실제 브라우저 폭별로 검증한다.
// 동작 요약: headless Chrome에서 /lab과 정적 이미지 분석 섹션을 열어 overflow, 1열/2열 배치, screenshot 산출물을 확인한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = parseArgs(process.argv.slice(2));
const chromePath = args.chromePath || findChrome();
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const widths = parseWidthList(args.widths || "390,768,1180,1365,1600");
const height = Number(args.height || 900);
const timeoutMs = Number(args.timeoutMs || 30000);
const debugPortBase = Number(args.debugPortBase || 9600);
const screenshotEnabled = !isTruthy(args.noScreenshots);
const runId = `lab-layout-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);
const summaryFile = args.summaryFile || path.join(os.tmpdir(), `media_server_${runId}_summary.json`);

if (!chromePath) {
  console.error("[fail] Chrome 실행 파일을 찾지 못했습니다. CHROME_PATH 또는 --chrome-path를 지정하세요.");
  process.exit(1);
}

if (!Number.isFinite(height) || height <= 0) {
  console.error(`[fail] height 값이 올바르지 않습니다: ${args.height}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const pages = [
  { name: "stream", path: "/lab", expectedSelector: "#stream-test .hero" },
  { name: "image-analysis", path: "/lab#image-analysis", expectedSelector: ".image-analysis-grid" },
];
const results = [];
let passCount = 0;
let failCount = 0;

for (const page of pages) {
  for (let index = 0; index < widths.length; index += 1) {
    const width = widths[index];
    const debugPort = debugPortBase + results.length;
    const label = `${page.name}-${width}`;
    try {
      const result = await runLayoutCheck(page, width, height, debugPort, label);
      results.push(result);
      if (result.ok) {
        passCount += 1;
        console.log(`[pass] ${label}: overflow=${result.layout.overflowX} mode=${result.layout.expectedMode}`);
      } else {
        failCount += 1;
        console.log(`[fail] ${label}`);
        for (const failure of result.layout.failures) {
          console.log(`  - ${failure.name}: ${failure.detail}`);
        }
      }
    } catch (error) {
      failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      results.push({ page: page.name, width, height, ok: false, error: message });
      console.log(`[fail] ${label}: ${message}`);
    }
  }
}

writeSummary();

console.log("");
console.log("== Lab layout 검증 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);
console.log(`- summary: ${summaryFile}`);
console.log(`- screenshots: ${outputDir}`);

if (failCount > 0) {
  process.exit(1);
}

// 단일 폭/페이지 조합을 Chrome으로 열어 layout 상태와 screenshot을 수집한다.
async function runLayoutCheck(page, width, viewportHeight, debugPort, label) {
  const targetUrl = buildTargetUrl(page.path, label);
  const browser = await launchBrowser(debugPort, width, viewportHeight, targetUrl);
  try {
    const layout = await browser.evaluate(buildLayoutExpression(page.name, width), 10000);
    const screenshotFile = screenshotEnabled ? path.join(outputDir, `${label}.png`) : "";
    if (screenshotFile) {
      await captureScreenshot(browser.cdp, screenshotFile);
    }
    return {
      page: page.name,
      path: page.path,
      url: targetUrl,
      width,
      height: viewportHeight,
      ok: Boolean(layout?.ok),
      layout,
      screenshotFile,
    };
  } finally {
    await browser.close();
  }
}

// hash가 있는 Lab URL에도 cache-buster query를 안전하게 붙인다.
function buildTargetUrl(pagePath, label) {
  const url = new URL(pagePath, `${httpBase}/`);
  url.searchParams.set("layoutRun", label);
  return url.toString();
}

// 브라우저 내부에서 실행할 레이아웃 판정 코드를 만든다.
function buildLayoutExpression(pageName, width) {
  const expectTwoColumn = width > 1180;
  return `
    (async () => {
      const pageName = ${JSON.stringify(pageName)};
      const expectTwoColumn = ${JSON.stringify(expectTwoColumn)};
      const imageDetails = document.getElementById('image-analysis');
      if (imageDetails && pageName === 'image-analysis') {
        imageDetails.open = true;
        imageDetails.scrollIntoView({ block: 'start' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return {
          selector,
          left: value.left,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          width: value.width,
          height: value.height,
        };
      };

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
      };
      const failures = [];
      const checks = [];
      const addCheck = (name, ok, detail) => {
        checks.push({ name, ok: Boolean(ok), detail });
        if (!ok) failures.push({ name, detail });
      };
      const overflowX = Math.max(viewport.scrollWidth, viewport.bodyScrollWidth) - viewport.width;
      addCheck('no-horizontal-overflow', overflowX <= 2, 'overflowX=' + overflowX + ', viewport=' + JSON.stringify(viewport));
      const withinViewport = (name, value) => {
        addCheck(name + '-exists', Boolean(value), 'rect=' + JSON.stringify(value));
        if (!value) return;
        addCheck(name + '-within-viewport', value.left >= -2 && value.right <= viewport.width + 2, 'rect=' + JSON.stringify(value) + ', viewport=' + JSON.stringify(viewport));
      };

      if (pageName === 'stream') {
        const streamPanel = rect('#stream-test .stream-panel');
        const controls = rect('#stream-test > .hero > .controls');
        const videoFrame = rect('#stream-test .video-frame');
        withinViewport('stream-panel', streamPanel);
        withinViewport('stream-controls', controls);
        withinViewport('stream-video-frame', videoFrame);
        if (streamPanel && controls) {
          if (expectTwoColumn) {
            addCheck('stream-two-column', controls.left >= streamPanel.right - 4, 'stream=' + JSON.stringify(streamPanel) + ', controls=' + JSON.stringify(controls));
          } else {
            addCheck('stream-one-column', controls.top >= streamPanel.bottom - 4, 'stream=' + JSON.stringify(streamPanel) + ', controls=' + JSON.stringify(controls));
          }
        }
      }

      if (pageName === 'image-analysis') {
        const grid = rect('.image-analysis-grid');
        const stack = rect('.image-analysis-grid > .controls');
        const preview = rect('.image-preview-panel');
        withinViewport('image-grid', grid);
        withinViewport('image-controls-stack', stack);
        withinViewport('image-preview-panel', preview);
        if (stack && preview) {
          if (expectTwoColumn) {
            addCheck('image-two-column', preview.left >= stack.right - 4, 'stack=' + JSON.stringify(stack) + ', preview=' + JSON.stringify(preview));
          } else {
            addCheck('image-one-column', preview.top >= stack.bottom - 4, 'stack=' + JSON.stringify(stack) + ', preview=' + JSON.stringify(preview));
          }
        }
        const assertRange = (id, min, max, step, defaultValue) => {
          const input = document.getElementById(id);
          addCheck(id + '-range-exists', Boolean(input), 'missing range input');
          if (!input) return;
          const output = document.querySelector('[data-range-value-for="' + id + '"]');
          addCheck(id + '-range-type', input.type === 'range', 'type=' + input.type);
          addCheck(id + '-range-bounds', input.min === min && input.max === max && input.step === step && input.dataset.default === defaultValue, 'min=' + input.min + ', max=' + input.max + ', step=' + input.step + ', default=' + input.dataset.default);
          addCheck(id + '-range-output', Boolean(output && output.textContent.trim()), 'output=' + (output ? output.textContent : ''));
        };
        [
          ['analysisFpsInput', '1', '30', '1', '8'],
          ['analysisQueueInput', '1', '8', '1', '1'],
          ['analysisOverlayWaitInput', '0', '2000', '20', '180'],
          ['analysisOverlayToleranceInput', '0', '5000', '50', '400'],
          ['analysisRedactionBlockInput', '4', '128', '1', '20'],
          ['analysisRedactionMarginInput', '0', '0.5', '0.01', '0.08'],
          ['imageAnalysisQuality', '1', '100', '1', '88'],
          ['imageAnalysisThickness', '1', '16', '1', '3'],
          ['imageAnalysisRedactionBlock', '4', '128', '1', '20'],
          ['imageAnalysisRedactionMargin', '0', '0.5', '0.01', '0.08'],
        ].forEach((item) => assertRange(...item));
      }

      return {
        ok: failures.length === 0,
        pageName,
        expectedMode: expectTwoColumn ? 'two-column' : 'one-column',
        viewport,
        overflowX,
        checks,
        failures,
      };
    })()
  `;
}

// Chrome을 독립 profile과 CDP port로 띄우고 지정 viewport에서 페이지를 연다.
async function launchBrowser(port, width, viewportHeight, targetUrl) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-layout-chrome-"));
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
      try {
        ws.close();
      } catch (_) {}
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

// 현재 화면을 PNG screenshot으로 저장해 수동 리뷰 근거를 남긴다.
async function captureScreenshot(cdp, outputFile) {
  const result = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(outputFile, Buffer.from(result.data, "base64"));
}

// Chrome CDP target 목록에서 첫 페이지 target이 열릴 때까지 기다린다.
async function waitForAnyPageTarget(port, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (page) {
          return page;
        }
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error(`Chrome CDP target 대기 시간 초과: port=${port}`);
}

// Chrome CDP WebSocket을 열고 request/response id를 promise로 연결한다.
async function connectWebSocket(url, pending) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", (event) => reject(event.error || new Error("WebSocket open failed")), { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id !== "number") {
      return;
    }
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
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

// 페이지 로딩이 끝났는지 document.readyState로 확인한다.
async function waitForDocumentReady(evaluate, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const state = await evaluate("document.readyState", 5000);
      if (state === "complete") {
        return;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error("document.readyState=complete 대기 시간 초과");
}

// CDP Runtime.evaluate에 timeout을 얹어 브라우저 내부 값을 안전하게 읽는다.
async function evaluateWithCdp(cdp, expression, evalTimeoutMs) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Runtime.evaluate 시간 초과: ${evalTimeoutMs}ms`)), evalTimeoutMs);
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
  if (!result || !result.result) {
    return undefined;
  }
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result.result.value;
}

// CLI 인자를 --kebab-case 또는 --camelCase 모두 접근 가능한 형태로 파싱한다.
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const rawKey = token.slice(2);
    const key = rawKey.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "1";
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

// 쉼표 구분 폭 목록을 양수 정수 배열로 바꾼다.
function parseWidthList(value) {
  const parsed = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (parsed.length === 0) {
    throw new Error(`widths 값이 올바르지 않습니다: ${value}`);
  }
  return parsed;
}

// 문자열 옵션을 boolean으로 해석한다.
function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

// macOS 개발 환경에서 흔히 쓰는 Chrome/Chromium 경로를 찾는다.
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

// child process 종료를 timeout과 함께 기다려 Chrome profile 정리를 보장한다.
function onceExit(child, waitTimeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child exit timeout")), waitTimeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

// 전체 결과를 summary JSON으로 남긴다.
function writeSummary() {
  const summary = {
    kind: "lab-layout",
    status: failCount > 0 ? "fail" : "pass",
    pass: passCount,
    fail: failCount,
    httpBase,
    widths,
    height,
    outputDir,
    results,
    finishedAtEpochMs: Date.now(),
  };
  fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
