#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const chromePath = args.chromePath || findChrome();
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const mode = args.mode || "simple";
const sourceId = args.sourceId || `publisher-browser-${Date.now()}`;
const existingSourceId = args.existingSourceId || "";
const holdMs = Number(args.holdMs || 30000);
const timeoutMs = Number(args.timeoutMs || 45000);
const debugPort = Number(args.debugPort || 9223);
const targetUrl = `${httpBase}/webrtc/test?run=${Date.now()}`;

if (!chromePath) {
  console.error("[browser-check] failed: Chrome executable not found");
  process.exit(1);
}

let chrome = null;
let ws = null;
let messageId = 0;
const pending = new Map();

try {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-chrome-"));
  chrome = spawn(
    chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debugPort}`,
      "--headless=new",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--allow-http-screen-capture",
      "--no-first-run",
      "--no-default-browser-check",
      targetUrl,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  chrome.stdout.on("data", (chunk) => {
    if (args.verbose) {
      process.stdout.write(`[chrome] ${chunk}`);
    }
  });
  chrome.stderr.on("data", (chunk) => {
    if (args.verbose) {
      process.stderr.write(`[chrome] ${chunk}`);
    }
  });

  const pageTarget = await waitForTarget(debugPort, targetUrl, timeoutMs);
  ws = await connectWebSocket(pageTarget.webSocketDebuggerUrl);

  await cdp("Page.enable");
  await cdp("Runtime.enable");

  await waitForDocumentReady(timeoutMs);
  await waitForTestApi(timeoutMs);

  const script = `
    (async () => {
      const api = window.__mediaServerTestApi;
      if (!api) {
        throw new Error('missing window.__mediaServerTestApi');
      }
      document.getElementById('publishSourceIdInput').value = ${JSON.stringify(sourceId)};
      document.getElementById('webrtcSourceInput').value = ${JSON.stringify(existingSourceId || sourceId)};
      await api.stopSession();
      await api.stopPublisher();
      if (${JSON.stringify(Boolean(existingSourceId))}) {
        document.getElementById('sourceType').value = 'webrtc';
      } else {
        await api.startPublish();
        await api.waitForPlayback('publisher', 15000);
      }
      if (${JSON.stringify(mode)} === 'publish-only') {
        await new Promise((resolve) => setTimeout(resolve, ${JSON.stringify(holdMs)}));
        return api.snapshotState();
      } else if (${JSON.stringify(mode)} === 'whep') {
        await api.playPublishedWhep();
      } else {
        await api.playPublishedSimple();
      }
      const finalState = await api.waitForPlayback('consumer', 20000);
      return finalState;
    })()
  `;

  const result = await evaluate(script, timeoutMs);
  if (Array.isArray(result?.consumerTrackKinds) && result.consumerTrackKinds.includes("video")) {
    const decodedFrames = Number(result?.stats?.inboundVideoFramesDecoded || 0);
    const renderedWidth = Number(result?.consumerVideoWidth || 0);
    if (decodedFrames <= 0 && renderedWidth <= 0) {
      throw new Error(`consumer video did not decode: ${JSON.stringify(result)}`);
    }
  }
  console.log(JSON.stringify({
    ok: true,
    mode,
    sourceId,
    state: result,
  }, null, 2));

  await evaluate(
    `(async () => { const api = window.__mediaServerTestApi; if (api) { await api.stopSession(); await api.stopPublisher(); } return true; })()`,
    10000,
  ).catch(() => {});
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[browser-check] failed: ${message}`);
  try {
    const snapshot = await evaluate(
      `(async () => { const api = window.__mediaServerTestApi; return api ? api.snapshotState() : { missingApi: true }; })()`,
      5000,
    );
    console.error(JSON.stringify(snapshot, null, 2));
  } catch (_) {}
  process.exitCode = 1;
} finally {
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
}

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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

async function waitForTarget(port, urlPrefix, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((item) => item.type === "page" && String(item.url || "").startsWith(urlPrefix));
        if (page && page.webSocketDebuggerUrl) {
          return page;
        }
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error(`timed out waiting for Chrome target: ${urlPrefix}`);
}

async function connectWebSocket(url) {
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

function cdp(method, params = {}) {
  const id = ++messageId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function waitForDocumentReady(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const state = await evaluate("document.readyState", 5000);
      if (state === "complete") {
        return;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error("timed out waiting for document.readyState=complete");
}

async function waitForTestApi(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const exists = await evaluate("Boolean(window.__mediaServerTestApi)", 5000);
      if (exists) {
        return;
      }
    } catch (_) {}
    await delay(250);
  }
  throw new Error("timed out waiting for window.__mediaServerTestApi");
}

async function evaluate(expression, timeoutMs) {
  const result = await Promise.race([
    cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    }),
    delay(timeoutMs).then(() => {
      throw new Error(`timed out evaluating expression after ${timeoutMs}ms`);
    }),
  ]);
  if (!result || !result.result) {
    return undefined;
  }
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
  }
  return result.result.value;
}

function onceExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child exit timeout")), timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}
