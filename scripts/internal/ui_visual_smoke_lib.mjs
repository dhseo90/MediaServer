// 파일 용도: UI visual smoke script들이 공유하는 Chrome 실행, 페이지 검사, screenshot helper를 제공한다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

export async function runVisualSmoke({
  checks,
  httpBase,
  timeoutMs,
  chromePath,
  visualWidths,
  visualHeight,
  debugPortBase,
  outputDir,
  summaryTitle,
  labelPrefix = "visual",
}) {
  if (!chromePath) {
    return { passCount: 0, failCount: 1, failures: [browserFallbackUnavailableMessage()], outputDir };
  }
  fs.mkdirSync(outputDir, { recursive: true });
  let passCount = 0;
  let failCount = 0;
  const failures = [];
  let index = 0;
  for (const check of checks) {
    for (const width of visualWidths) {
      const label = `${check.name}-${width}`;
      const debugPort = debugPortBase + index;
      index += 1;
      try {
        const result = await runVisualPageCheck(check, width, debugPort, label, {
          httpBase,
          timeoutMs,
          chromePath,
          visualHeight,
          outputDir,
        });
        passCount += 1;
        console.log(`[pass] ${labelPrefix}-${label} overflowX ${result.overflowX}`);
      } catch (error) {
        failCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`[${labelPrefix}-${label}] ${message}`);
        console.log(`[fail] ${labelPrefix}-${label}: ${message}`);
      }
    }
  }
  console.log("");
  console.log(`== ${summaryTitle} ==`);
  console.log(`- 통과: ${passCount}`);
  console.log(`- 실패: ${failCount}`);
  console.log(`- screenshots: ${outputDir}`);
  if (failures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount, failCount, failures, outputDir };
}

export function writeVisualArtifactIndex({
  outputDir,
  title = "UI Visual Regression Artifacts",
  httpBase = "",
  visualWidths = [],
  visualHeight = 0,
  checks = [],
  command = "",
  retentionPolicy = defaultVisualArtifactRetentionPolicy(),
} = {}) {
  if (!outputDir) {
    throw new Error("outputDir is required for visual artifact index");
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const screenshots = collectVisualScreenshots(outputDir, checks, visualHeight);
  const manifest = {
    schema: "media-server.ui-visual-artifact-index.v1",
    generatedAt,
    title,
    command,
    httpBase,
    viewport: {
      widths: visualWidths,
      height: visualHeight,
    },
    retentionPolicy,
    screenshotCount: screenshots.length,
    screenshots,
  };
  const manifestPath = path.join(outputDir, "visual-regression-manifest.json");
  const indexPath = path.join(outputDir, "index.md");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(indexPath, buildVisualArtifactMarkdown(manifest));
  console.log(`[pass] visual artifact manifest: ${manifestPath}`);
  console.log(`[pass] visual artifact index: ${indexPath}`);
  return manifest;
}

function collectVisualScreenshots(outputDir, checks = [], visualHeight = 0) {
  const checkByName = new Map((Array.isArray(checks) ? checks : []).map((check) => [check.name, check]));
  if (!fs.existsSync(outputDir)) return [];
  return fs.readdirSync(outputDir)
    .filter((name) => name.endsWith(".png"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
      const fullPath = path.join(outputDir, file);
      const stat = fs.statSync(fullPath);
      const base = file.replace(/\.png$/i, "");
      const widthMatch = base.match(/-(\d+)$/);
      const width = widthMatch ? Number(widthMatch[1]) : null;
      const label = widthMatch ? base.slice(0, -widthMatch[0].length) : base;
      const check = checkByName.get(label);
      return {
        file,
        label,
        page: check?.path || "",
        selector: check?.visualSelector || "",
        viewport: {
          width,
          height: visualHeight || null,
        },
        bytes: stat.size,
        mtimeMs: Math.round(stat.mtimeMs),
      };
    });
}

function buildVisualArtifactMarkdown(manifest) {
  const lines = [
    "# UI Visual Regression Artifact Index",
    "",
    `- schema: ${manifest.schema}`,
    `- generatedAt: ${manifest.generatedAt}`,
    `- command: ${manifest.command || "(unspecified)"}`,
    `- httpBase: ${manifest.httpBase || "(unspecified)"}`,
    `- viewportWidths: ${(manifest.viewport?.widths || []).join(", ") || "(unspecified)"}`,
    `- viewportHeight: ${manifest.viewport?.height || "(unspecified)"}`,
    `- retentionDefaultDays: ${manifest.retentionPolicy?.defaultDays ?? "(unspecified)"}`,
    `- retentionReleaseBaselineDays: ${manifest.retentionPolicy?.releaseBaselineDays ?? "(unspecified)"}`,
    `- screenshots: ${manifest.screenshotCount}`,
    "",
    "| File | Label | Page | Width | Bytes |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const item of manifest.screenshots || []) {
    lines.push(`| [${item.file}](./${item.file}) | ${item.label || ""} | ${item.page || ""} | ${item.viewport?.width ?? ""} | ${item.bytes ?? 0} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function defaultVisualArtifactRetentionPolicy() {
  return {
    schema: "media-server.ui-visual-artifact-retention.v1",
    defaultDays: retentionDaysFromEnv("MEDIA_SERVER_UI_VISUAL_ARTIFACT_RETENTION_DAYS", 14),
    releaseBaselineDays: retentionDaysFromEnv("MEDIA_SERVER_UI_VISUAL_RELEASE_BASELINE_RETENTION_DAYS", 45),
    localTempPolicy: "temporary-unless-output-dir-is-persisted",
    privacyReview: "do-not-retain-client-source-url-developer-url-raw-json-debug-artifacts",
  };
}

function retentionDaysFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

export function parseWidthList(value) {
  const parsed = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  if (parsed.length === 0) {
    throw new Error(`invalid visual widths: ${value}`);
  }
  return parsed;
}

export function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

export function findChrome() {
  if (!chromeFallbackAvailableForThisEnvironment()) {
    return "";
  }
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

export function chromeFallbackAvailableForThisEnvironment() {
  if (process.env.CODEX_SHELL || process.env.CODEX_THREAD_ID || process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE) {
    return false;
  }
  const mode = String(process.env.MEDIA_SERVER_UI_BROWSER_MODE || "auto").trim().toLowerCase();
  if (mode === "in-app" || mode === "static") {
    return false;
  }
  if (process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK != null) {
    return isTruthy(process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK);
  }
  return mode === "auto" || mode === "chrome";
}

export function browserFallbackUnavailableMessage() {
  if (process.env.CODEX_SHELL || process.env.CODEX_THREAD_ID || process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE) {
    return "Codex environment requires in-app browser evidence; fallback browser is disabled";
  }
  return "Chrome executable not found";
}

export function cookieHeaderFromNetscapeFile(cookieFile) {
  if (!cookieFile || !fs.existsSync(cookieFile)) return "";
  const pairs = [];
  for (let line of fs.readFileSync(cookieFile, "utf8").split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith("#HttpOnly_")) {
      line = line.slice("#HttpOnly_".length);
    } else if (line.startsWith("#")) {
      continue;
    }
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    const name = parts[5];
    const value = parts.slice(6).join("\t");
    if (name) pairs.push(`${name}=${value}`);
  }
  return pairs.join("; ");
}

export async function openBrowserPage({
  httpBase,
  pagePath,
  timeoutMs,
  chromePath,
  debugPort,
  width = 1280,
  height = 900,
  outputDir = "",
  verbose = false,
  cookieHeader = "",
  locale = "",
}) {
  if (!chromePath) {
    throw new Error(browserFallbackUnavailableMessage());
  }
  const url = new URL(pagePath, `${httpBase}/`).toString();
  return launchBrowser(debugPort, width, height, url, {
    httpBase,
    timeoutMs,
    chromePath,
    visualHeight: height,
    outputDir,
    verbose,
    cookieHeader,
    locale,
  });
}

async function runVisualPageCheck(check, width, debugPort, label, options) {
  const url = new URL(check.path, `${options.httpBase}/`).toString();
  const browser = await launchBrowser(debugPort, width, options.visualHeight, url, options);
  try {
    const result = await browser.evaluate(
      `
        (() => {
          const selector = ${JSON.stringify(check.visualSelector)};
          const requiredSelectors = ${JSON.stringify(check.requiredSelectors || [])};
          const target = document.querySelector(selector);
          const body = document.body;
          const doc = document.documentElement;
          const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
          const required = requiredSelectors.map(item => [item, document.querySelector(item)]);
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
    const screenshotFile = path.join(options.outputDir, `${label}.png`);
    await captureScreenshot(browser.cdp, screenshotFile);
    if (!result?.ok) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  } finally {
    await browser.close();
  }
}

async function launchBrowser(port, width, viewportHeight, targetUrl, options) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-ui-chrome-"));
  const pending = new Map();
  let messageId = 0;
  let ws = null;
  const chrome = spawn(
    options.chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${viewportHeight}`,
      ...(options.locale ? [`--lang=${options.locale}`] : []),
      "--headless=new",
      "--hide-scrollbars=false",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  chrome.stdout.on("data", (chunk) => {
    if (options.verbose) process.stdout.write(`[chrome] ${chunk}`);
  });
  chrome.stderr.on("data", (chunk) => {
    if (options.verbose) process.stderr.write(`[chrome] ${chunk}`);
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
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  };
  try {
    const target = await waitForAnyPageTarget(port, options.timeoutMs);
    ws = await connectWebSocket(target.webSocketDebuggerUrl, pending);
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: width <= 560,
    });
    if (options.locale) {
      await cdp("Emulation.setLocaleOverride", { locale: options.locale });
    }
    if (options.cookieHeader) {
      await cdp("Network.enable");
      await cdp("Network.setExtraHTTPHeaders", { headers: { Cookie: options.cookieHeader } });
    }
    await cdp("Page.navigate", { url: targetUrl });
    await waitForDocumentReady((expression, evalTimeoutMs) => evaluateWithCdp(cdp, expression, evalTimeoutMs), options.timeoutMs);
    return {
      cdp,
      evaluate: (expression, evalTimeoutMs) => evaluateWithCdp(cdp, expression, evalTimeoutMs),
      screenshot: (outputFile) => captureScreenshot(cdp, outputFile),
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
  throw new Error(`browser CDP target timeout: port=${port}`);
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
    const detail = result.exceptionDetails.exception?.description ||
      result.exceptionDetails.exception?.value ||
      result.exceptionDetails.text ||
      "Runtime.evaluate exception";
    throw new Error(String(detail));
  }
  return result.result.value;
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
