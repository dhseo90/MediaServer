#!/usr/bin/env node
// 파일 용도: 설치 없는 bundled Playwright를 찾아 wait/click/fill/select/screenshot 네이티브 UI 동작을 제공한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const nativeCapabilities = [
  "navigate",
  "wait",
  "click",
  "fill",
  "type",
  "select",
  "screenshot",
  "evaluate",
  "request-correlation",
];

export function discoverPlaywrightCandidates(explicitModulePath = "") {
  const nodePathCandidates = String(process.env.NODE_PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map(entry => path.join(entry, "playwright"));
  return unique([
    explicitModulePath,
    process.env.MEDIA_SERVER_PLAYWRIGHT_MODULE_PATH || "",
    process.env.CODEX_PRIMARY_RUNTIME_PLAYWRIGHT_PATH || "",
    path.join(process.cwd(), "node_modules/playwright"),
    path.resolve(path.dirname(process.execPath), "../node_modules/playwright"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),
    ...nodePathCandidates,
  ].filter(Boolean).map(candidate => path.resolve(candidate)));
}

export function resolvePlaywrightModule({ modulePath = "", requireExplicit = false } = {}) {
  const candidates = requireExplicit && modulePath
    ? [path.resolve(modulePath)]
    : discoverPlaywrightCandidates(modulePath);
  const attempts = [];
  for (const candidate of candidates) {
    const packagePath = path.join(candidate, "package.json");
    if (!fs.existsSync(packagePath)) {
      attempts.push({ candidate, status: "missing-package-json" });
      continue;
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      const playwright = require(candidate);
      if (!playwright?.chromium) throw new Error("chromium browser type missing");
      attempts.push({ candidate, status: "selected", version: packageJson.version || "unknown" });
      return {
        playwright,
        modulePath: fs.realpathSync(candidate),
        moduleVersion: packageJson.version || "unknown",
        attempts,
      };
    } catch (error) {
      attempts.push({
        candidate,
        status: "load-failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const failure = new Error("native Playwright module unavailable; set MEDIA_SERVER_PLAYWRIGHT_MODULE_PATH to a Playwright package directory");
  failure.attempts = attempts;
  throw failure;
}

export async function createNativePlaywrightAdapter({ modulePath = "", chromePath = "" } = {}) {
  const resolved = resolvePlaywrightModule({ modulePath, requireExplicit: Boolean(modulePath) });
  const executablePath = resolveNativeBrowserExecutable(chromePath);
  return {
    summary: {
      tool: "playwright",
      engine: "playwright-native",
      fallbackUsed: false,
      fallbackReason: "",
      visualOnly: false,
      dependencyStatus: "bundled-module-available",
      modulePath: resolved.modulePath,
      moduleVersion: resolved.moduleVersion,
      browserExecutable: executablePath || "playwright-managed-browser",
      capabilities: nativeCapabilities,
    },
    attempts: resolved.attempts.map(item => ({
      tool: "playwright",
      engine: "playwright-native",
      status: item.status,
      reason: item.reason || (item.status === "selected" ? `Playwright ${item.version}` : item.candidate),
      modulePath: item.candidate,
    })),
    openPage: args => openNativePlaywrightPage(resolved.playwright, {
      ...args,
      executablePath,
    }),
  };
}

export function resolveNativeBrowserExecutable(explicitPath = "") {
  const candidates = unique([
    explicitPath,
    process.env.CHROME_PATH || "",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean).map(candidate => path.resolve(candidate)));
  if (explicitPath && !fs.existsSync(path.resolve(explicitPath))) {
    throw new Error(`native browser executable does not exist: ${path.resolve(explicitPath)}`);
  }
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || "";
}

async function openNativePlaywrightPage(playwright, {
  httpBase,
  pagePath,
  timeoutMs,
  width = 390,
  height = 844,
  executablePath = "",
  storageStatePath = "",
  colorScheme = "light",
  navigationCorrelationId = "",
}) {
  const consoleEntries = [];
  const networkEntries = [];
  let requestSequence = 0;
  const browser = await playwright.chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme,
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
    ...(navigationCorrelationId ? {
      extraHTTPHeaders: { "x-media-server-correlation-id": navigationCorrelationId },
    } : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on("console", message => {
    consoleEntries.push({ level: message.type(), text: message.text() });
  });
  page.on("pageerror", error => {
    consoleEntries.push({ level: "error", text: error instanceof Error ? error.message : String(error) });
  });
  page.on("response", response => {
    const request = response.request();
    const correlationId = String(request.headers()["x-media-server-correlation-id"] || "");
    networkEntries.push({
      requestId: `native-request-${++requestSequence}`,
      correlationId,
      correlationSource: correlationId ? 'request-header' : 'none',
      method: request.method(),
      status: response.status(),
      url: response.url(),
    });
  });
  const navigationResponse = await page.goto(new URL(pagePath, `${httpBase}/`).toString(), {
    waitUntil: "load",
    timeout: timeoutMs,
  });
  return {
    navigation: {
      status: navigationResponse?.status() || 0,
      url: page.url(),
    },
    waitForSelector: (selector, options = {}) => page.locator(selector).waitFor({ state: options.state || "visible", timeout: options.timeout || timeoutMs }),
    navigate: async (nextPagePath) => {
      const response = await page.goto(new URL(nextPagePath, `${httpBase}/`).toString(), {
        waitUntil: "load",
        timeout: timeoutMs,
      });
      return { status: response?.status() || 0, url: page.url() };
    },
    setCorrelationId: async (correlationId) => {
      await context.setExtraHTTPHeaders(correlationId
        ? { "x-media-server-correlation-id": String(correlationId) }
        : {});
    },
    click: async (selector) => {
      await page.locator(selector).click();
    },
    fill: async (selector, value) => {
      await page.locator(selector).fill(String(value));
    },
    type: async (selector, value) => {
      await page.locator(selector).pressSequentially(String(value));
    },
    select: async (selector, value) => {
      await page.locator(selector).selectOption(String(value));
    },
    waitForText: async (selector, expected, waitTimeoutMs = timeoutMs) => {
      await page.locator(selector).filter({ hasText: String(expected) }).waitFor({ state: "visible", timeout: waitTimeoutMs });
      return page.locator(selector).innerText();
    },
    snapshot: (selector) => page.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const rect = element ? element.getBoundingClientRect() : null;
      const style = element ? getComputedStyle(element) : null;
      return {
        selector: ${JSON.stringify(selector)},
        exists: Boolean(element),
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
        tag: String(element?.tagName || '').toLowerCase(),
        disabled: Boolean(element && 'disabled' in element && element.disabled),
        open: Boolean(element && 'open' in element && element.open),
        href: String(element?.getAttribute?.('href') || ''),
        text: String(element?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 4000),
        value: element && 'value' in element ? String(element.value || '') : '',
        checked: Boolean(element && 'checked' in element && element.checked),
        selectedValues: element?.tagName === 'SELECT' ? Array.from(element.selectedOptions).map(option => String(option.value)) : [],
        optionValues: element?.tagName === 'SELECT' ? Array.from(element.options).filter(option => !option.disabled).map(option => String(option.value)) : [],
        url: location.href,
      };
    })()`),
    evaluate: (expression) => page.evaluate(expression),
    screenshot: outputFile => page.screenshot({ path: outputFile, fullPage: false }),
    consoleEntries: () => consoleEntries,
    networkEntries: () => networkEntries.map(item => ({ ...item })),
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

function unique(values) {
  return [...new Set(values)];
}
