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
  "query",
  "assert",
  "click",
  "fill",
  "type",
  "select",
  "screenshot",
  "evaluate",
  "visual-geometry",
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
    measureVisualState: async (selector = "body") => {
      const geometry = await page.evaluate(`(() => {
        const selector = ${JSON.stringify(selector)};
        const target = document.querySelector(selector) || document.body;
        const rectValue = element => {
          const rect = element?.getBoundingClientRect?.();
          if (!rect) return null;
          return { x: rect.x, y: rect.y, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const isVisible = element => {
          const rect = element?.getBoundingClientRect?.();
          const style = element ? getComputedStyle(element) : null;
          return Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0);
        };
        const elements = Array.from(document.querySelectorAll('body *')).filter(isVisible).slice(0, 400);
        const effectiveBackground = element => {
          let current = element;
          while (current) {
            const value = getComputedStyle(current).backgroundColor;
            const match = value.match(/^rgba?\([^)]*(?:[,/]\s*([0-9.]+))?\)$/i);
            const alpha = value.startsWith('rgb(') ? 1 : Number(match?.[1] || 0);
            if (alpha >= 0.99) return value;
            current = current.parentElement;
          }
          return matchMedia('(prefers-color-scheme: dark)').matches ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
        };
        const textSamples = elements.filter(element => String(element.innerText || '').trim().length > 0).slice(0, 120).map(element => {
          const style = getComputedStyle(element);
          return { foreground: style.color, background: effectiveBackground(element), fontSizePx: Number.parseFloat(style.fontSize || '0'), fontWeight: style.fontWeight, rect: rectValue(element) };
        });
        const videos = Array.from(document.querySelectorAll('video')).filter(isVisible).map(element => ({ rect: rectValue(element), readyState: Number(element.readyState || 0), videoWidth: Number(element.videoWidth || 0), videoHeight: Number(element.videoHeight || 0) }));
        const overlays = Array.from(new Set([
          ...document.querySelectorAll('canvas'),
          ...document.querySelectorAll('[data-testid*="overlay" i]'),
          ...document.querySelectorAll('[class*="overlay" i]')
        ])).filter(isVisible).map(element => ({ rect: rectValue(element), tag: String(element.tagName || '').toLowerCase() }));
        return {
          schema: 'media-server.ui-browser-visual-measurement.v1',
          route: location.pathname,
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight },
          target: { selector, visible: isVisible(target), rect: rectValue(target) },
          textSamples,
          videos,
          overlays,
        };
      })()`);
      const focusSamples = [];
      for (let index = 0; index < 8; index += 1) {
        await page.keyboard.press("Tab");
        focusSamples.push(await page.evaluate(`(() => {
          const element = document.activeElement;
          const style = element ? getComputedStyle(element) : null;
          const rect = element?.getBoundingClientRect?.();
          return {
            index: ${index},
            tag: String(element?.tagName || '').toLowerCase(),
            id: String(element?.id || ''),
            testId: String(element?.getAttribute?.('data-testid') || ''),
            visible: Boolean(rect && rect.width > 0 && rect.height > 0),
            outlineStyle: String(style?.outlineStyle || ''),
            outlineWidth: String(style?.outlineWidth || ''),
            boxShadow: String(style?.boxShadow || ''),
          };
        })()`));
      }
      return { ...geometry, focusSamples };
    },
    evaluate: (expression) => page.evaluate(expression),
    observeRequestedObservedState: async ({ selector = null, applicability = "required" } = {}) => {
      return page.evaluate(`(async () => {
        const selector = ${JSON.stringify(selector)};
        const applicability = ${JSON.stringify(applicability)};
        const response = await fetch('/auth/whoami', { credentials: 'same-origin', cache: 'no-store' });
        let accountRole = '';
        if (response.status === 401) {
          accountRole = 'anonymous';
        } else {
          if (!response.ok) throw new Error('whoami observation failed with status ' + response.status);
          const principal = await response.json();
          if (principal?.authenticated !== true || typeof principal?.role !== 'string') {
            throw new Error('whoami observation returned an invalid authenticated principal');
          }
          accountRole = principal.role;
        }
        const element = selector ? document.querySelector(selector) : null;
        const rect = element?.getBoundingClientRect?.() || null;
        const style = element ? getComputedStyle(element) : null;
        const exists = Boolean(element);
        const visible = Boolean(rect && rect.width > 0 && rect.height > 0 && style &&
          style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0);
        const disabled = Boolean(element && 'disabled' in element && element.disabled);
        return {
          schema: 'media-server.v390-ui-runtime-observed.v1',
          screenRoute: location.pathname,
          accountRole,
          viewport: { width: innerWidth, height: innerHeight },
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          controlAction: {
            selector,
            applicability,
            exists,
            visible,
            enabled: visible && !disabled,
          },
          provenance: {
            screenRoute: 'browser-location',
            accountRole: 'session-whoami',
            viewport: 'browser-inner-size',
            theme: 'browser-media-query',
            controlAction: 'dom-selector-state',
          },
        };
      })()`);
    },
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
