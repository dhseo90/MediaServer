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
  "product-theme-observation",
  "live-video-session-evidence",
  "request-correlation",
  "request-start-ledger",
  "network-quiet",
  "role-session-switch",
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

export function secretStrippedBrowserEnv(sourceEnv = process.env) {
  const env = { ...sourceEnv };
  delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD;
  delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  return env;
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
  onRuntimeSecret = null,
}) {
  const consoleEntries = [];
  const networkEntries = [];
  let requestSequence = 0;
  const requestIds = new WeakMap();
  const pendingRequests = new Map();
  const pendingSafeResponseReads = new Set();
  const safeResponseReadFailures = [];
  const observedRuntimeSecrets = new Set();
  const browser = await playwright.chromium.launch({
    headless: true,
    env: secretStrippedBrowserEnv(),
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
  await context.addInitScript(theme => {
    localStorage.setItem("mediaServerTheme", theme);
    document.documentElement.dataset.theme = theme;
  }, colorScheme);
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on("console", message => {
    consoleEntries.push({ level: message.type(), text: message.text() });
  });
  page.on("pageerror", error => {
    consoleEntries.push({ level: "error", text: error instanceof Error ? error.message : String(error) });
  });
  const requestIdentity = request => {
    const existing = requestIds.get(request);
    if (existing) return existing;
    const requestId = `native-request-${++requestSequence}`;
    requestIds.set(request, requestId);
    return requestId;
  };
  page.on("request", request => {
    const correlationId = String(request.headers()["x-media-server-correlation-id"] || "");
    const requestId = requestIdentity(request);
    pendingRequests.set(request, { requestId, correlationId });
    networkEntries.push({
      phase: "request-start",
      requestId,
      correlationId,
      correlationSource: correlationId ? 'request-header' : 'none',
      method: request.method(),
      status: 0,
      url: request.url(),
      requestBody: safeRequestBodyProjection(request),
    });
  });
  page.on("response", response => {
    const request = response.request();
    const correlationId = String(request.headers()["x-media-server-correlation-id"] || "");
    const entry = {
      phase: "response",
      requestId: requestIdentity(request),
      correlationId,
      correlationSource: correlationId ? 'request-header' : 'none',
      method: request.method(),
      status: response.status(),
      url: response.url(),
    };
    networkEntries.push(entry);
    if (request.method() === "POST" && /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(urlPath(response.url()))) {
      const read = response.json()
        .then(payload => {
          entry.safeResponseBody = {
            sessionId: typeof payload?.sessionId === "string" ? payload.sessionId : "",
            offerReceived: typeof payload?.offer === "string" && payload.offer.length > 0,
          };
        })
        .catch(() => {
          entry.safeResponseBody = { sessionId: "", offerReceived: false };
        })
        .finally(() => pendingSafeResponseReads.delete(read));
      pendingSafeResponseReads.add(read);
    } else if (request.method() === "POST" && urlPath(response.url()) === "/ops/api/onvif/import-draft") {
      const read = response.json()
        .then(payload => {
          const gate = payload?.credentialGate || {};
          const redaction = gate.redactionGuard || {};
          entry.safeResponseBody = {
            credentialGate: {
              schema: String(gate.schema || ""),
              requiredScope: String(gate.requiredScope || ""),
              primaryStoreProvider: String(gate.primaryStoreProvider || ""),
              primaryStoreDecision: String(gate.primaryStoreDecision || ""),
              credentialReferenceStatus: String(gate.credentialReferenceStatus || ""),
              urlCredentialsRejected: redaction.urlCredentialsRejected === true,
              secretMaterialStored: gate.secretMaterialStored === true,
            },
          };
        })
        .catch(() => {
          entry.safeResponseBody = { credentialGate: null };
        })
        .finally(() => pendingSafeResponseReads.delete(read));
      pendingSafeResponseReads.add(read);
    } else if (request.method() === "POST" && [
      "/ops/api/users",
      "/ops/api/invites",
      "/client/api/access-requests",
    ].includes(urlPath(response.url()))) {
      const read = response.json()
        .then(payload => {
          if (urlPath(response.url()) === "/ops/api/invites") {
            const issuedToken = typeof payload?.invite?.token === "string" ? payload.invite.token : "";
            if (issuedToken) {
              observedRuntimeSecrets.add(issuedToken);
              if (typeof onRuntimeSecret !== "function") {
                throw new Error("invite response runtime secret sink is unavailable");
              }
              onRuntimeSecret({ kind: "issued-invite-token", value: issuedToken });
            }
          }
          entry.safeResponseBody = safeFormResponseProjection(urlPath(response.url()), payload);
        })
        .catch(error => {
          safeResponseReadFailures.push(error instanceof Error ? error.message : String(error));
          entry.safeResponseBody = safeFormResponseProjection(urlPath(response.url()), null);
        })
        .finally(() => pendingSafeResponseReads.delete(read));
      pendingSafeResponseReads.add(read);
    }
  });
  page.on("requestfinished", request => pendingRequests.delete(request));
  page.on("requestfailed", request => pendingRequests.delete(request));
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
    replaceStorageState: async (storageStatePath = "") => {
      await context.clearCookies();
      if (!storageStatePath) return;
      const state = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
      }
      for (const origin of Array.isArray(state.origins) ? state.origins : []) {
        if (!origin?.origin || !Array.isArray(origin.localStorage)) continue;
        await page.goto(origin.origin, { waitUntil: "load", timeout: timeoutMs });
        await page.evaluate(entries => {
          for (const entry of entries) localStorage.setItem(entry.name, entry.value);
        }, origin.localStorage);
      }
    },
    request: async ({ method = "GET", urlPath }) => page.evaluate(async ({ requestMethod, requestPath }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "follow",
      });
      return {
        status: response.status,
        url: response.url,
      };
    }, {
      requestMethod: String(method).toUpperCase(),
      requestPath: String(urlPath),
    }),
    waitForNetworkQuiet: async ({ correlationId, minimumObservationMs = 750, quietMs = 250 } = {}) => {
      const startedAt = Date.now();
      const deadline = startedAt + timeoutMs;
      const correlatedEntryCount = () => networkEntries.reduce((count, entry) =>
        count + ((!correlationId || entry.correlationId === correlationId) ? 1 : 0), 0);
      let lastEntryCount = correlatedEntryCount();
      let quietStartedAt = Date.now();
      while (Date.now() < deadline) {
        const currentEntryCount = correlatedEntryCount();
        if (currentEntryCount !== lastEntryCount) {
          lastEntryCount = currentEntryCount;
          quietStartedAt = Date.now();
        }
        const actionPending = [...pendingRequests.values()].some(item =>
          !correlationId || item.correlationId === correlationId);
        if (Date.now() - startedAt >= minimumObservationMs &&
            !actionPending && pendingSafeResponseReads.size === 0 &&
            Date.now() - quietStartedAt >= quietMs) {
          if (safeResponseReadFailures.length > 0) {
            throw new Error("safe response projection or runtime secret registration failed");
          }
          return {
            correlationId: correlationId || "",
            observedMs: Date.now() - startedAt,
            entryCount: currentEntryCount,
          };
        }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`network quiet timeout for correlation ${correlationId || "(any)"}`);
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
    registerRuntimeSecret: value => {
      if (typeof value === "string" && value) observedRuntimeSecrets.add(value);
    },
    captureInviteRuntimeSecret: async (selector = "#invite-create-output") => {
      const captured = await page.evaluate(({ targetSelector, replacement }) => {
        const target = document.querySelector(targetSelector);
        const text = String(target?.textContent || "");
        const tokenLineMatch = text.match(/(?:^|\n)\s*토큰:\s*([^\s]+)\s*(?:\n|$)/);
        const setupUrlMatch = text.match(/\/invite\/setup\?token=([^\s]+)/);
        let secret = String(tokenLineMatch?.[1] || "");
        if (!secret && setupUrlMatch?.[1]) {
          try {
            secret = decodeURIComponent(setupUrlMatch[1]);
          } catch {
            secret = String(setupUrlMatch[1]);
          }
        }
        if (!secret) return {
          secret: "",
          redactedNodes: 0,
          targetExists: Boolean(target),
          textPresent: text.length > 0,
          tokenLinePresent: text.includes("토큰:"),
          setupUrlPresent: text.includes("/invite/setup?token="),
        };
        const variants = [...new Set([secret, encodeURIComponent(secret)])].filter(Boolean);
        const replaceSecrets = source => {
          let next = String(source || "");
          for (const value of variants) next = next.split(value).join(replacement);
          return next;
        };
        let redactedNodes = 0;
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const next = replaceSecrets(node.nodeValue);
          if (next !== node.nodeValue) {
            node.nodeValue = next;
            redactedNodes += 1;
          }
        }
        for (const element of document.querySelectorAll("*")) {
          if ("value" in element && typeof element.value === "string") {
            element.value = replaceSecrets(element.value);
          }
          for (const attribute of [...element.attributes]) {
            const next = replaceSecrets(attribute.value);
            if (next !== attribute.value) element.setAttribute(attribute.name, next);
          }
        }
        return {
          secret,
          redactedNodes,
          targetExists: true,
          textPresent: true,
          tokenLinePresent: Boolean(tokenLineMatch),
          setupUrlPresent: Boolean(setupUrlMatch),
        };
      }, { targetSelector: selector, replacement: "[REDACTED-RUNTIME-SECRET]" });
      if (!captured.secret) {
        return {
          captured: false,
          redactedNodes: 0,
          targetExists: captured.targetExists,
          textPresent: captured.textPresent,
          tokenLinePresent: captured.tokenLinePresent,
          setupUrlPresent: captured.setupUrlPresent,
        };
      }
      observedRuntimeSecrets.add(captured.secret);
      if (typeof onRuntimeSecret !== "function") {
        throw new Error("invite DOM runtime secret sink is unavailable");
      }
      onRuntimeSecret({ kind: "issued-invite-token", value: captured.secret });
      captured.secret = "";
      return {
        captured: true,
        redactedNodes: captured.redactedNodes,
        targetExists: captured.targetExists,
        textPresent: captured.textPresent,
        tokenLinePresent: captured.tokenLinePresent,
        setupUrlPresent: captured.setupUrlPresent,
      };
    },
    cookieHeader: async () => (await context.cookies())
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join("; "),
    redactObservedSecrets: async () => {
      await Promise.all([...pendingSafeResponseReads]);
      if (safeResponseReadFailures.length > 0) {
        throw new Error("safe response projection or runtime secret registration failed");
      }
      const variants = secretVariants([...observedRuntimeSecrets]);
      if (variants.length === 0) {
        return {
          schema: "media-server.v390-ui-runtime-secret-redaction.v1",
          status: "PASS",
          registeredSecrets: 0,
          redactedTextNodes: 0,
          redactedValues: 0,
          redactedAttributes: 0,
          residualSecrets: 0,
        };
      }
      const redactDomPass = () => page.evaluate(({ secretVariants: values, replacement }) => {
        const replaceSecrets = source => {
          let next = String(source || "");
          for (const value of values) next = next.split(value).join(replacement);
          return next;
        };
        let redactedTextNodes = 0;
        let redactedValues = 0;
        let redactedAttributes = 0;
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const next = replaceSecrets(node.nodeValue);
          if (next !== node.nodeValue) {
            node.nodeValue = next;
            redactedTextNodes += 1;
          }
        }
        for (const element of document.querySelectorAll("input,textarea,select,option")) {
          if (!("value" in element)) continue;
          const next = replaceSecrets(element.value);
          if (next !== element.value) {
            element.value = next;
            redactedValues += 1;
          }
        }
        for (const element of document.querySelectorAll("*")) {
          for (const attribute of [...element.attributes]) {
            const next = replaceSecrets(attribute.value);
            if (next !== attribute.value) {
              element.setAttribute(attribute.name, next);
              redactedAttributes += 1;
            }
          }
        }
        const serialized = document.documentElement.outerHTML;
        const residualSecrets = values.filter(value => serialized.includes(value)).length;
        return { redactedTextNodes, redactedValues, redactedAttributes, residualSecrets };
      }, { secretVariants: variants, replacement: "[REDACTED-RUNTIME-SECRET]" });
      const result = {
        redactedTextNodes: 0,
        redactedValues: 0,
        redactedAttributes: 0,
        residualSecrets: 0,
      };
      for (let pass = 0; pass < 5; pass += 1) {
        const observed = await redactDomPass();
        result.redactedTextNodes += observed.redactedTextNodes;
        result.redactedValues += observed.redactedValues;
        result.redactedAttributes += observed.redactedAttributes;
        result.residualSecrets = observed.residualSecrets;
        if (pass < 4) await page.waitForTimeout(50);
      }
      if (result.residualSecrets !== 0) {
        throw new Error("runtime secret remained in the evidence DOM after redaction");
      }
      return {
        schema: "media-server.v390-ui-runtime-secret-redaction.v1",
        status: "PASS",
        registeredSecrets: observedRuntimeSecrets.size,
        ...result,
      };
    },
    snapshot: async (selector) => sanitizeEvidenceValue(await page.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const rect = element ? element.getBoundingClientRect() : null;
      const style = element ? getComputedStyle(element) : null;
      return {
        selector: ${JSON.stringify(selector)},
        exists: Boolean(element),
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
        tag: String(element?.tagName || '').toLowerCase(),
        hidden: Boolean(element?.hidden),
        disabled: Boolean(element && 'disabled' in element && element.disabled),
        readOnly: Boolean(element && 'readOnly' in element && element.readOnly),
        open: Boolean(element && 'open' in element && element.open),
        href: String(element?.getAttribute?.('href') || ''),
        title: String(element?.getAttribute?.('title') || ''),
        ariaLabel: String(element?.getAttribute?.('aria-label') || ''),
        ariaPressed: String(element?.getAttribute?.('aria-pressed') || ''),
        text: String(element?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 4000),
        value: element && 'value' in element ? String(element.value || '') : '',
        checked: Boolean(element && 'checked' in element && element.checked),
        selectedValues: element?.tagName === 'SELECT' ? Array.from(element.selectedOptions).map(option => String(option.value)) : [],
        optionValues: element?.tagName === 'SELECT' ? Array.from(element.options).filter(option => !option.disabled).map(option => String(option.value)) : [],
        url: location.href,
      };
    })()`), observedRuntimeSecrets),
    measureVisualState: async (selector = "body", {
      caseBinding = null,
      requestedTheme = colorScheme,
      liveVideoSpec = null,
      liveCorrelationId = "",
    } = {}) => {
      const geometry = await page.evaluate(async ({ targetSelector, binding, requestedThemeValue, liveSpec }) => {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const target = document.querySelector(targetSelector);
        const rectValue = element => {
          const rect = element?.getBoundingClientRect?.();
          if (!rect) return null;
          return { x: rect.x, y: rect.y, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const isVisible = element => {
          const rect = element?.getBoundingClientRect?.();
          const style = element ? getComputedStyle(element) : null;
          return Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0);
        };
        const effectiveBackground = element => {
          let current = element;
          while (current) {
            const value = getComputedStyle(current).backgroundColor;
            const match = value.match(/^rgba?\(\s*[0-9.]+[, ]+[0-9.]+[, ]+[0-9.]+(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i);
            const alpha = value.startsWith("rgb(") ? 1 : Number(match?.[1] || 0);
            if (alpha >= 0.99) return value;
            current = current.parentElement;
          }
          return document.documentElement.dataset.theme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
        };
        const elements = Array.from(document.querySelectorAll("body *")).filter(isVisible).slice(0, 400);
        const textSamples = elements.filter(element => String(element.innerText || "").trim().length > 0).slice(0, 120).map(element => {
          const style = getComputedStyle(element);
          return { foreground: style.color, background: effectiveBackground(element), fontSizePx: Number.parseFloat(style.fontSize || "0"), fontWeight: style.fontWeight, rect: rectValue(element) };
        });
        const roleResponse = await fetch("/auth/whoami", { credentials: "same-origin", cache: "no-store" });
        let accountRole = "";
        if (roleResponse.status === 401) accountRole = "anonymous";
        else if (roleResponse.ok) {
          const principal = await roleResponse.json();
          if (principal?.authenticated === false) accountRole = "anonymous";
          else if (principal?.authenticated === true && typeof principal?.role === "string") accountRole = principal.role;
        }
        const sampleLive = () => {
          if (!liveSpec) return null;
          const tile = document.querySelector(liveSpec.tileSelector);
          const stage = document.querySelector(liveSpec.stageSelector);
          const video = document.querySelector(liveSpec.videoSelector);
          const placeholder = document.querySelector(liveSpec.placeholderSelector);
          const modeControls = document.querySelector(liveSpec.modeControlsSelector);
          const mode = document.querySelector(liveSpec.modeSelector);
          if (!tile) return null;
          const tileIdentity = `tile-${String(tile.getAttribute("data-tile") || "")}:${String(tile.getAttribute("data-view-id") || "")}`;
          const stageRect = rectValue(stage);
          const videoRect = rectValue(video);
          let contentRect = null;
          if (videoRect && Number(video?.videoWidth || 0) > 0 && Number(video?.videoHeight || 0) > 0) {
            const intrinsicRatio = Number(video.videoWidth) / Number(video.videoHeight);
            const elementRatio = videoRect.width / videoRect.height;
            const contentWidth = elementRatio > intrinsicRatio ? videoRect.height * intrinsicRatio : videoRect.width;
            const contentHeight = elementRatio > intrinsicRatio ? videoRect.height : videoRect.width / intrinsicRatio;
            const left = videoRect.left + (videoRect.width - contentWidth) / 2;
            const top = videoRect.top + (videoRect.height - contentHeight) / 2;
            contentRect = { left, top, right: left + contentWidth, bottom: top + contentHeight, width: contentWidth, height: contentHeight };
          }
          const playbackQuality = video?.getVideoPlaybackQuality?.();
          return {
            tileIdentity,
            tile: { selector: liveSpec.tileSelector, identity: tileIdentity, viewId: String(tile.getAttribute("data-view-id") || ""), visible: isVisible(tile), rect: rectValue(tile) },
            stage: { selector: liveSpec.stageSelector, tileIdentity, visible: isVisible(stage), rect: stageRect },
            video: { selector: liveSpec.videoSelector, tileIdentity, visible: isVisible(video), rect: videoRect },
            placeholder: { selector: liveSpec.placeholderSelector, tileIdentity, hidden: Boolean(placeholder?.hidden || !isVisible(placeholder)) },
            modeControls: { selector: liveSpec.modeControlsSelector, tileIdentity, visible: isVisible(modeControls) },
            mode: { selector: liveSpec.modeSelector, tileIdentity, active: Boolean(mode && mode.getAttribute("aria-pressed") === "true"), value: String(mode?.getAttribute("data-mode-action") || "") },
            playback: {
              tileIdentity,
              srcObject: Boolean(video?.srcObject),
              liveVideoTracks: Number(video?.srcObject?.getVideoTracks?.().filter(track => track.readyState === "live").length || 0),
              readyState: Number(video?.readyState || 0),
              videoWidth: Number(video?.videoWidth || 0),
              videoHeight: Number(video?.videoHeight || 0),
              currentTime: Number(video?.currentTime || 0),
              presentedFrames: Number(playbackQuality?.totalVideoFrames || 0),
            },
            rendering: { tileIdentity, objectFit: String(video ? getComputedStyle(video).objectFit : ""), stageRect, contentRect },
            controls: (liveSpec.controlSelectors || []).map(controlSelector => {
              const control = document.querySelector(controlSelector);
              return { selector: controlSelector, tileIdentity, visible: isVisible(control), rect: rectValue(control) };
            }),
            genericDomOverlays: Array.from(document.querySelectorAll("canvas,[data-testid*='overlay' i],[class*='overlay' i]")).filter(isVisible).map(element => ({
              selector: element.id ? `#${element.id}` : String(element.getAttribute("data-testid") || element.className || element.tagName),
              visible: true,
              rect: rectValue(element),
            })),
            video,
          };
        };
        const liveBefore = sampleLive();
        if (liveBefore?.video) {
          await Promise.race([
            new Promise(resolve => {
              if (typeof liveBefore.video.requestVideoFrameCallback === "function") liveBefore.video.requestVideoFrameCallback(() => resolve());
              else setTimeout(resolve, 350);
            }),
            new Promise(resolve => setTimeout(resolve, 600)),
          ]);
        }
        const liveAfter = sampleLive();
        const liveVideo = liveAfter ? {
          tile: liveAfter.tile,
          stage: liveAfter.stage,
          video: liveAfter.video,
          placeholder: liveAfter.placeholder,
          modeControls: liveAfter.modeControls,
          mode: liveAfter.mode,
          playback: {
            ...liveAfter.playback,
            currentTimeBefore: Number(liveBefore?.playback?.currentTime || 0),
            currentTimeAfter: Number(liveAfter.playback.currentTime || 0),
            presentedFramesBefore: Number(liveBefore?.playback?.presentedFrames || 0),
            presentedFramesAfter: Number(liveAfter.playback.presentedFrames || 0),
          },
          rendering: liveAfter.rendering,
          controls: liveAfter.controls,
          genericDomOverlays: liveAfter.genericDomOverlays,
        } : null;
        return {
          schema: "media-server.ui-browser-visual-measurement.v2",
          caseBinding: binding,
          route: location.pathname,
          accountRole,
          requestedTheme: requestedThemeValue,
          appliedTheme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
          mediaTheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
          document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight },
          target: { selector: targetSelector, visible: isVisible(target), rect: rectValue(target) },
          textSamples,
          liveVideo,
        };
      }, {
        targetSelector: String(selector),
        binding: caseBinding,
        requestedThemeValue: String(requestedTheme),
        liveSpec: liveVideoSpec,
      });
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
      if (geometry.liveVideo) {
        await Promise.all([...pendingSafeResponseReads]);
        geometry.liveVideo.session = buildLiveSessionEvidence(
          networkEntries,
          liveCorrelationId,
          geometry.liveVideo.tile?.identity || "",
          geometry.liveVideo.tile?.viewId || "",
        );
      }
      return { ...geometry, focusSamples };
    },
    waitForLiveVideoReady: async ({ videoSelector, modeSelector, timeout = timeoutMs }) => {
      await page.waitForFunction(({ videoSelectorValue, modeSelectorValue }) => {
        const video = document.querySelector(videoSelectorValue);
        const mode = document.querySelector(modeSelectorValue);
        const liveTracks = video?.srcObject?.getVideoTracks?.().filter(track => track.readyState === "live").length || 0;
        return Boolean(mode && mode.getAttribute("aria-pressed") === "true" && video?.readyState >= 2 &&
          video.videoWidth > 0 && video.videoHeight > 0 && liveTracks > 0);
      }, { videoSelectorValue: videoSelector, modeSelectorValue: modeSelector }, { timeout });
    },
    evaluate: (expression, argument) => page.evaluate(expression, argument),
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
          if (principal?.authenticated === false) {
            accountRole = 'anonymous';
          } else if (principal?.authenticated === true && typeof principal?.role === 'string') {
            accountRole = principal.role;
          } else {
            throw new Error('whoami observation returned an invalid authenticated principal');
          }
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
    screenshot: async outputFile => {
      await assertEvidenceDomSecretsAbsent(page, observedRuntimeSecrets);
      return page.screenshot({ path: outputFile, fullPage: false });
    },
    consoleEntries: () => sanitizeEvidenceValue(consoleEntries, observedRuntimeSecrets),
    networkEntries: () => sanitizeEvidenceValue(networkEntries.map(item => ({ ...item })), observedRuntimeSecrets),
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

function secretVariants(values) {
  const variants = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !value) continue;
    variants.add(value);
    variants.add(encodeURIComponent(value));
    variants.add(new URLSearchParams({ value }).toString().slice("value=".length));
  }
  return [...variants].filter(Boolean).sort((left, right) => right.length - left.length);
}

function sanitizeEvidenceValue(value, secrets) {
  const variants = secretVariants([...secrets]);
  const sanitizeString = source => {
    let next = source;
    for (const secret of variants) next = next.split(secret).join("[REDACTED-RUNTIME-SECRET]");
    return next;
  };
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(item => sanitizeEvidenceValue(item, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeEvidenceValue(item, secrets)]));
  }
  return value;
}

async function assertEvidenceDomSecretsAbsent(page, secrets) {
  const variants = secretVariants([...secrets]);
  if (variants.length === 0) return;
  const residual = await page.evaluate(values => {
    const serialized = document.documentElement.outerHTML;
    return values.filter(value => serialized.includes(value)).length;
  }, variants);
  if (residual !== 0) throw new Error("runtime secret reached an evidence capture boundary");
}

function unique(values) {
  return [...new Set(values)];
}

function safeRequestBodyProjection(request) {
  try {
    if (!["POST", "PUT", "DELETE"].includes(request.method())) return null;
    const pathname = new URL(request.url()).pathname;
    if (/^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(pathname)) {
      const parsed = JSON.parse(request.postData() || "{}");
      return {
        overlayMode: typeof parsed.overlayMode === "string" ? parsed.overlayMode : "",
      };
    }
    const allowed = [
      /^\/ops\/api\/(?:sources|views|onvif\/channels|vlm\/profiles|users|invites|access-requests|events\/reviews)(?:\/|$)/,
      /^\/lab\/analysis\/(?:va-rules|rules|profiles)(?:\/|$)/,
      /^\/client\/api\/(?:access-requests|preferences\/live-layout)$/,
      /^\/(?:setup|login|logout|password\/change|invite\/setup)$/,
    ];
    if (!allowed.some(pattern => pattern.test(pathname))) return null;
    const contentType = String(request.headers()["content-type"] || "");
    let parsed = {};
    if (contentType.includes("application/json")) {
      parsed = JSON.parse(request.postData() || "{}");
    } else {
      parsed = Object.fromEntries(new URLSearchParams(request.postData() || ""));
    }
    return safePersistedRequestBodyProjection(parsed);
  } catch {
    return { projectionError: true };
  }
}

function safePersistedRequestBodyProjection(value) {
  const record = value && typeof value === "object" ? value : {};
  const identity = source => ({
    id: String(source?.id || ""),
    sourceId: String(source?.sourceId || ""),
    viewId: String(source?.viewId || ""),
    channelId: String(source?.channelId || ""),
    ruleId: String(source?.ruleId || ""),
    profileId: String(source?.profileId || ""),
    eventId: String(source?.eventId || ""),
    username: String(source?.username || ""),
  });
  const result = {
    identity: identity(record),
    fieldNames: Object.keys(record).filter(name => !/password|token|confirm|credential|secret/i.test(name)).sort(),
  };
  if (record.source && typeof record.source === "object") result.sourceIdentity = identity(record.source);
  if (record.publishedView && typeof record.publishedView === "object") {
    result.publishedViewIdentity = identity(record.publishedView);
  }
  if (record.workspaceLayout && typeof record.workspaceLayout === "object") {
    result.workspaceLayout = {
      gridSize: Number(record.workspaceLayout.gridSize || 0),
      density: String(record.workspaceLayout.density || ""),
      dockSide: String(record.workspaceLayout.dockSide || ""),
    };
  }
  if (typeof record.role === "string") result.role = record.role;
  if (typeof record.reviewStatus === "string") result.reviewStatus = record.reviewStatus;
  return result;
}

function safeFormResponseProjection(pathname, payload) {
  const value = payload && typeof payload === "object" ? payload : {};
  const record = value.accessRequest || value.invite || value.user || {};
  const token = typeof value.invite?.token === "string" ? value.invite.token : "";
  const setupUrl = typeof value.invite?.setupUrl === "string" ? value.invite.setupUrl : "";
  return {
    pathname,
    status: String(value.status || record.status || ""),
    username: String(record.username || ""),
    requestId: String(record.requestId || ""),
    inviteId: String(record.inviteId || ""),
    tokenPresent: token.length > 0,
    setupUrlTokenBound: Boolean(token && setupUrl.includes(encodeURIComponent(token))),
    persistentSecretFieldsPresent: objectContainsKey(value,
      new Set(["passwordHash", "passwordHistory", "tokenHash"])),
  };
}

function objectContainsKey(value, forbidden) {
  if (Array.isArray(value)) return value.some(item => objectContainsKey(item, forbidden));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) =>
    forbidden.has(key) || objectContainsKey(item, forbidden));
}

export function buildLiveSessionEvidence(entries, correlationId, tileIdentity, tileViewId) {
  const correlated = entries.filter(item => !correlationId || item.correlationId === correlationId);
  const sessionStart = [...correlated].reverse().find(item => {
    if (item.phase !== "request-start" || item.method !== "POST") return false;
    return /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(urlPath(item.url));
  });
  const sessionResponse = sessionStart
    ? correlated.find(item => item.phase === "response" && item.requestId === sessionStart.requestId)
    : null;
  const sessionMatch = sessionStart ? urlPath(sessionStart.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session$/) : null;
  const answerStart = [...correlated].reverse().find(item => {
    if (item.phase !== "request-start" || item.method !== "POST") return false;
    const match = urlPath(item.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session\/([^/]+)\/answer$/);
    return Boolean(match && (!sessionMatch || match[1] === sessionMatch[1]));
  });
  const answerResponse = answerStart
    ? correlated.find(item => item.phase === "response" && item.requestId === answerStart.requestId)
    : null;
  const answerMatch = answerStart ? urlPath(answerStart.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session\/([^/]+)\/answer$/) : null;
  const responseSessionId = String(sessionResponse?.safeResponseBody?.sessionId || "");
  return {
    tileIdentity,
    tileViewId,
    requestViewId: decodePathSegment(sessionMatch?.[1]),
    answerViewId: decodePathSegment(answerMatch?.[1]),
    correlationId: sessionStart?.correlationId || correlationId || "",
    requestMethod: sessionStart?.method || "",
    requestPath: sessionStart ? urlPath(sessionStart.url) : "",
    requestBody: sessionStart?.requestBody || {},
    responseStatus: Number(sessionResponse?.status || 0),
    sessionId: responseSessionId,
    responseSessionId,
    answerSessionId: decodePathSegment(answerMatch?.[2]),
    offerReceived: Boolean(sessionResponse?.safeResponseBody?.offerReceived && answerStart),
    answerMethod: answerStart?.method || "",
    answerPath: answerStart ? urlPath(answerStart.url) : "",
    answerStatus: Number(answerResponse?.status || 0),
  };
}

function decodePathSegment(value) {
  try { return decodeURIComponent(String(value || "")); }
  catch { return ""; }
}

function urlPath(value) {
  try { return new URL(String(value)).pathname; }
  catch { return ""; }
}
