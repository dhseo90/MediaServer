#!/usr/bin/env node
// 파일 용도: Lab WebRTC metadata viewer의 video frame / metadata overlay sync를 자동 검증한다.
// 동작 요약: 실제 /lab/rules UI에서 WebRTC Metadata Viewer를 시작하고 requestVideoFrameCallback stall을 재현한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = parseArgs(process.argv.slice(2));
const httpBase = (args.httpBase || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_HTTP_BASE || "http://127.0.0.1:8080").replace(/\/+$/, "");
const fileToken = args.file || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_FILE || "sample_h264.mp4";
const timeoutMs = Number(args.timeoutMs || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_TIMEOUT_MS || 60000);
const stallAfterFrames = Number(args.stallAfterFrames || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_STALL_AFTER_FRAMES || 18);
const debugPort = Number(args.debugPort || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_DEBUG_PORT || 9236);
const chromePath = args.chromePath || process.env.CHROME_PATH || findChrome();
const summaryFile =
  args.summaryFile ||
  process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_SUMMARY ||
  path.join(os.tmpdir(), `media_server_webrtc_va_metadata_sync_summary_${Date.now()}.json`);
const logFile =
  args.logFile ||
  process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SYNC_LOG ||
  path.join(os.tmpdir(), `media_server_webrtc_va_metadata_sync_chrome_${Date.now()}.log`);

if (args.help || args.h) {
  console.log(`WebRTC VA metadata overlay sync verification

Usage:
  ./server.sh verify-webrtc-va-metadata-sync [--http-base <url>] [--file <token>]
    [--timeout-ms <ms>] [--stall-after-frames <count>] [--debug-port <port>]

Summary JSON:
  ${summaryFile}
`);
  process.exit(0);
}

const summary = {
  ok: false,
  kind: "webrtc-va-metadata-sync",
  httpBase,
  file: fileToken,
  timeoutMs,
  stallAfterFrames,
  debugPort,
  logFile,
  checks: [
    "labUiLoaded",
    "webrtcSessionCreated",
    "videoTrackOnTrack",
    "iceConnected",
    "dataChannelOpen",
    "metadataMessageReceived",
    "requestVideoFrameCallbackFrames",
    "syncFieldsPresent",
    "metadataBufferBounded",
    "fallbackLatestNotDrawnByDefault",
    "staleOverlayCleared",
    "drawStopsDuringVideoStall",
  ],
};

let browser = null;
try {
  if (!chromePath) {
    throw new Error("Chrome executable not found. Set CHROME_PATH or install Chrome/Chromium.");
  }
  await fetchJson("/health");
  logPass("HTTP health ok");

  browser = await launchBrowser(debugPort);
  const result = await browser.evaluate(buildBrowserVerificationExpression(), timeoutMs + 5000);
  validateResult(result);
  Object.assign(summary, result, { ok: true, pass: summary.checks.length, fail: 0 });
  logPass("WebRTC metadata overlay sync / fallback / stale clear 확인");
  console.log(`[summary] pass=${summary.checks.length} fail=0`);
  process.exitCode = 0;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  summary.error = message;
  summary.pass = 0;
  summary.fail = 1;
  console.error(`[fail] ${message}`);
  console.error(`[log] ${logFile}`);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }
  writeSummary(summaryFile, summary);
}

function buildBrowserVerificationExpression() {
  return `
    (async () => {
      const startedAt = Date.now();
      const timeoutMs = ${JSON.stringify(timeoutMs)};
      const fileToken = ${JSON.stringify(fileToken)};
      const stallAfterFrames = ${JSON.stringify(stallAfterFrames)};
      const state = {
        labUiLoaded: false,
        videoTrack: false,
        iceConnected: false,
        dataChannelOpen: false,
        metadataMessageCount: 0,
        metadataReceivedCount: 0,
        videoFrameCount: 0,
        videoPresentedFrameCount: 0,
        drawnOverlayCount: 0,
        metadataDrawnCount: 0,
        metadataDroppedCount: 0,
        maxMetadataBufferSize: 0,
        metadataBufferLimit: 0,
        metadataBufferGuardExercised: false,
        fallbackHiddenCount: 0,
        staleCount: 0,
        staleClearCount: 0,
        maxSyncDelta: null,
        maxSyncDeltaMs: null,
        avgSyncDelta: null,
        averageSyncDeltaMs: null,
        syncDeltaSamples: 0,
        syncStatuses: {},
        fallbackLatestMessages: 0,
        parseErrors: [],
        metadataBufferHasSyncFields: false,
        fallbackCheckboxDefault: null,
        fallbackDrawnByDefault: false,
        videoStalled: false,
        videoStalledText: '',
        lastVideoFrameText: '',
        lastMetadataText: '',
        channelStateText: '',
        connectionStateText: '',
        drawCountAtStall: 0,
        drawCountAfterStallWait: 0,
        metadataCountAtStall: 0,
        metadataCountAfterStallWait: 0,
        hook: null,
      };
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const stillWaiting = () => Date.now() - startedAt < timeoutMs;
      const fail = (message) => { throw new Error(message + ': ' + JSON.stringify(snapshot())); };
      const $ = (id) => document.getElementById(id);
      const numberText = (id) => {
        const value = Number(String($(id)?.textContent || '0').replace(/[^0-9.-]/g, ''));
        return Number.isFinite(value) ? value : 0;
      };
      const text = (id) => String($(id)?.textContent || '').trim();
      const snapshot = () => ({
        videoFrameCount: numberText('metadataVideoFrameCountText'),
        metadataMessageCount: numberText('metadataMessageCountText'),
        drawnOverlayCount: numberText('metadataDrawCountText'),
        metadataBufferSize: numberText('metadataBufferCountText'),
        metadataDroppedCount: numberText('metadataBufferDropCountText'),
        fallbackHiddenCount: numberText('metadataFallbackHiddenCountText'),
        staleCount: numberText('metadataStaleCountText'),
        videoStalledText: text('metadataVideoStalledText'),
        channelStateText: text('metadataChannelStateText'),
        connectionStateText: text('viewConnectionStateText'),
        staleBadgeHidden: $('metadataStaleBadge')?.hidden,
        hook: window.__vaMetadataSyncVerify || {},
      });
      const waitFor = async (predicate, message, intervalMs = 250) => {
        while (stillWaiting()) {
          if (predicate()) return;
          await wait(intervalMs);
        }
        fail(message);
      };
      const installHooks = () => {
        if (window.__vaMetadataSyncVerifyInstalled) return;
        window.__vaMetadataSyncVerifyInstalled = true;
        window.__vaMetadataSyncVerify = {
          rvfcCount: 0,
          rvfcBlocked: false,
          clearCount: 0,
          clearAfterBlockCount: 0,
          strokeCount: 0,
          metadataMessages: 0,
          fallbackMessages: 0,
          syncDeltaSum: 0,
          syncDeltaCount: 0,
          maxAbsSyncDelta: 0,
          syncStatuses: {},
          parseErrors: [],
        };
        const hook = window.__vaMetadataSyncVerify;
        const originalRvfc = HTMLVideoElement.prototype.requestVideoFrameCallback;
        const originalCancelRvfc = HTMLVideoElement.prototype.cancelVideoFrameCallback;
        const blockedHandles = new Set();
        let fakeHandle = 800000;
        HTMLVideoElement.prototype.requestVideoFrameCallback = function(callback) {
          if (this && this.id === 'viewWebRtcVideo') {
            if (hook.rvfcBlocked) {
              const handle = ++fakeHandle;
              blockedHandles.add(handle);
              return handle;
            }
            return originalRvfc.call(this, (now, metadata) => {
              hook.rvfcCount += 1;
              callback(now, metadata);
              if (hook.rvfcCount >= stallAfterFrames) {
                hook.rvfcBlocked = true;
              }
            });
          }
          return originalRvfc.call(this, callback);
        };
        HTMLVideoElement.prototype.cancelVideoFrameCallback = function(handle) {
          if (blockedHandles.has(handle)) {
            blockedHandles.delete(handle);
            return;
          }
          return originalCancelRvfc.call(this, handle);
        };
        const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function(...args) {
          if (this.canvas && this.canvas.id === 'viewMetadataOverlayCanvas') {
            hook.clearCount += 1;
            if (hook.rvfcBlocked) hook.clearAfterBlockCount += 1;
          }
          return originalClearRect.apply(this, args);
        };
        const originalStrokeRect = CanvasRenderingContext2D.prototype.strokeRect;
        CanvasRenderingContext2D.prototype.strokeRect = function(...args) {
          if (this.canvas && this.canvas.id === 'viewMetadataOverlayCanvas') {
            hook.strokeCount += 1;
          }
          return originalStrokeRect.apply(this, args);
        };
        const pcDescriptor = Object.getOwnPropertyDescriptor(RTCPeerConnection.prototype, 'ondatachannel');
        Object.defineProperty(RTCPeerConnection.prototype, 'ondatachannel', {
          configurable: true,
          enumerable: pcDescriptor?.enumerable ?? true,
          get() {
            return pcDescriptor?.get ? pcDescriptor.get.call(this) : this.__verifyOnDataChannel || null;
          },
          set(handler) {
            const wrapped = (event) => {
              if (event?.channel) {
                event.channel.addEventListener('open', () => { hook.dataChannelOpen = true; });
                event.channel.addEventListener('message', (messageEvent) => {
                  hook.metadataMessages += 1;
                  try {
                    const payload = JSON.parse(String(messageEvent.data || ''));
                    const status = String(payload.syncStatus || 'unknown');
                    hook.syncStatuses[status] = (hook.syncStatuses[status] || 0) + 1;
                    if (status === 'fallback-latest') {
                      hook.fallbackMessages += 1;
                    }
                    const delta = Number(payload.syncDeltaMs);
                    if (Number.isFinite(delta)) {
                      hook.syncDeltaSum += delta;
                      hook.syncDeltaCount += 1;
                      hook.maxAbsSyncDelta = Math.max(hook.maxAbsSyncDelta, Math.abs(delta));
                    }
                    if (
                      Number.isFinite(Number(payload.videoFramePtsMs)) &&
                      Number.isFinite(Number(payload.analysisPtsMs)) &&
                      Number.isFinite(Number(payload.syncDeltaMs)) &&
                      Number.isFinite(Number(payload.syncToleranceMs)) &&
                      Number.isFinite(Number(payload.metadataSequence)) &&
                      Number.isFinite(Number(payload.sentAtMs))
                    ) {
                      hook.metadataBufferHasSyncFields = true;
                    }
                  } catch (error) {
                    hook.parseErrors.push(error && error.message ? error.message : String(error));
                  }
                });
              }
              if (typeof handler === 'function') {
                return handler.call(this, event);
              }
            };
            this.__verifyOnDataChannel = wrapped;
            if (pcDescriptor?.set) {
              pcDescriptor.set.call(this, wrapped);
            } else {
              this.addEventListener('datachannel', wrapped);
            }
          },
        });
      };

      installHooks();
      state.labUiLoaded = Boolean($('analysisViewerTabBtn') && $('startViewPreviewBtn'));
      if (!state.labUiLoaded) fail('Lab rule UI was not loaded');
      $('analysisViewerTabBtn').click();
      const metadataMode = document.querySelector('input[name="viewMode"][value="metadata"]');
      if (!metadataMode) fail('metadata view mode radio not found');
      metadataMode.checked = true;
      metadataMode.dispatchEvent(new Event('change', { bubbles: true }));
      const fileSelect = $('viewFileSelect');
      if (!fileSelect) fail('view file select not found');
      if (!Array.from(fileSelect.options).some((option) => option.value === fileToken)) {
        const option = document.createElement('option');
        option.value = fileToken;
        option.textContent = fileToken;
        fileSelect.appendChild(option);
      }
      fileSelect.value = fileToken;
      fileSelect.dispatchEvent(new Event('change', { bubbles: true }));
      const fallbackInput = $('metadataOverlayFallbackInput');
      state.fallbackCheckboxDefault = Boolean(fallbackInput?.checked);
      if (fallbackInput) {
        fallbackInput.checked = false;
        fallbackInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      $('startViewPreviewBtn').click();

      await waitFor(() => {
        const s = snapshot();
        return s.metadataMessageCount > 0 && s.videoFrameCount > 0 && s.channelStateText !== '오류';
      }, 'metadata/video frame counters did not start');
      await waitFor(() => {
        const s = snapshot();
        return s.drawnOverlayCount > 0 || (window.__vaMetadataSyncVerify?.strokeCount || 0) > 0;
      }, 'metadata overlay was not drawn before stall');
      await waitFor(() => {
        const s = snapshot();
        return s.videoStalledText === '예';
      }, 'video stalled state was not reported', 200);

      const stalledSnapshot = snapshot();
      state.drawCountAtStall = stalledSnapshot.drawnOverlayCount;
      state.metadataCountAtStall = stalledSnapshot.metadataMessageCount;
      await wait(1800);
      const debugBeforeBufferGuard = window.__vaMetadataViewerDebug?.snapshot?.() || null;
      const bufferGuardSnapshot = window.__vaMetadataViewerDebug?.injectSyntheticBufferEntries?.(140) || null;
      await wait(50);
      const afterStallSnapshot = snapshot();
      Object.assign(state, {
        videoFrameCount: afterStallSnapshot.videoFrameCount,
        videoPresentedFrameCount: afterStallSnapshot.videoFrameCount,
        metadataMessageCount: afterStallSnapshot.metadataMessageCount,
        metadataReceivedCount: afterStallSnapshot.metadataMessageCount,
        drawnOverlayCount: afterStallSnapshot.drawnOverlayCount,
        metadataDrawnCount: afterStallSnapshot.drawnOverlayCount,
        metadataDroppedCount: afterStallSnapshot.metadataDroppedCount,
        maxMetadataBufferSize: Math.max(
          afterStallSnapshot.metadataBufferSize || 0,
          bufferGuardSnapshot?.metadataBufferSize || 0
        ),
        metadataBufferLimit: Number(bufferGuardSnapshot?.maxMetadataBufferEntries || debugBeforeBufferGuard?.maxMetadataBufferEntries || 0),
        metadataBufferGuardExercised: Boolean(
          bufferGuardSnapshot &&
          Number(bufferGuardSnapshot.metadataBufferSize || 0) <= Number(bufferGuardSnapshot.maxMetadataBufferEntries || 0) &&
          Number(bufferGuardSnapshot.metadataBufferDropCount || 0) > Number(debugBeforeBufferGuard?.metadataBufferDropCount || 0)
        ),
        fallbackHiddenCount: afterStallSnapshot.fallbackHiddenCount,
        staleCount: afterStallSnapshot.staleCount,
        staleClearCount: Number(window.__vaMetadataSyncVerify?.clearAfterBlockCount || 0),
        videoStalled: afterStallSnapshot.videoStalledText === '예',
        videoStalledText: afterStallSnapshot.videoStalledText,
        lastVideoFrameText: text('metadataLastVideoFrameText'),
        lastMetadataText: text('metadataLastMessageAtText'),
        channelStateText: afterStallSnapshot.channelStateText,
        connectionStateText: afterStallSnapshot.connectionStateText,
        drawCountAfterStallWait: afterStallSnapshot.drawnOverlayCount,
        metadataCountAfterStallWait: afterStallSnapshot.metadataMessageCount,
      });
      const hook = window.__vaMetadataSyncVerify || {};
      state.videoTrack = state.videoFrameCount > 0;
      state.iceConnected = ['재생 중', '연결 중'].includes(state.connectionStateText) || state.connectionStateText.includes('재생');
      state.dataChannelOpen = ['열림', '수신 중'].includes(state.channelStateText);
      state.metadataBufferHasSyncFields = Boolean(hook.metadataBufferHasSyncFields);
      state.syncStatuses = hook.syncStatuses || {};
      state.fallbackLatestMessages = Number(hook.fallbackMessages || 0);
      state.parseErrors = hook.parseErrors || [];
      state.syncDeltaSamples = Number(hook.syncDeltaCount || 0);
      state.maxSyncDelta = state.syncDeltaSamples > 0 ? Number(hook.maxAbsSyncDelta || 0) : null;
      state.avgSyncDelta = state.syncDeltaSamples > 0 ? Number((Number(hook.syncDeltaSum || 0) / state.syncDeltaSamples).toFixed(2)) : null;
      state.maxSyncDeltaMs = state.maxSyncDelta;
      state.averageSyncDeltaMs = state.avgSyncDelta;
      state.fallbackDrawnByDefault = state.fallbackLatestMessages > 0 && state.fallbackHiddenCount <= 0 && state.fallbackCheckboxDefault === false;
      state.bufferGuardSnapshot = bufferGuardSnapshot;
      state.hook = hook;

      $('stopViewPreviewBtn')?.click();
      await wait(250);
      return state;
    })()
  `;
}

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("browser verification returned no result");
  }
  const failures = [];
  if (!result.labUiLoaded) failures.push("Lab UI did not load");
  if (!result.videoTrack || Number(result.videoFrameCount || 0) <= 0) failures.push("requestVideoFrameCallback frame count did not increase");
  if (!result.iceConnected) failures.push(`ICE/WebRTC playback did not reach connected state: ${result.connectionStateText || "-"}`);
  if (!result.dataChannelOpen) failures.push(`DataChannel did not open/receive: ${result.channelStateText || "-"}`);
  if (Number(result.metadataMessageCount || 0) <= 0) failures.push("metadata message was not received");
  if (!result.metadataBufferHasSyncFields) failures.push("metadata sync fields were not observed");
  if (!result.metadataBufferGuardExercised) failures.push("metadata buffer bounded guard was not exercised");
  if (Number(result.metadataBufferLimit || 0) <= 0) failures.push("metadata buffer limit was not reported");
  if (Number(result.maxMetadataBufferSize || 0) > Number(result.metadataBufferLimit || 0)) {
    failures.push(`metadata buffer exceeded limit: max=${result.maxMetadataBufferSize} limit=${result.metadataBufferLimit}`);
  }
  if (Number(result.metadataDroppedCount || 0) <= 0) failures.push("metadata dropped count did not increase during buffer guard check");
  if (Number(result.drawnOverlayCount || 0) <= 0) failures.push("overlay draw count did not increase before stall");
  if (!result.videoStalled) failures.push("video stalled state was not reported");
  if (Number(result.staleClearCount || 0) <= 0) failures.push("overlay clear was not observed after video stall");
  if (Number(result.drawCountAfterStallWait || 0) !== Number(result.drawCountAtStall || 0)) {
    failures.push("overlay draw count changed while video was stalled");
  }
  if (result.fallbackCheckboxDefault === true) failures.push("fallback metadata checkbox should be off by default");
  if (result.fallbackDrawnByDefault) failures.push("fallback-latest metadata appears to be drawn by default");
  if (!Number.isFinite(Number(result.maxSyncDelta)) && Number(result.syncDeltaSamples || 0) <= 0) {
    failures.push("syncDelta samples were not collected");
  }
  if (Array.isArray(result.parseErrors) && result.parseErrors.length > 0) {
    failures.push(`metadata parse errors: ${result.parseErrors.join(", ")}`);
  }
  if (failures.length > 0) {
    throw new Error(`${failures.join("; ")} | stats=${JSON.stringify(result)}`);
  }
}

async function launchBrowser(port) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-chrome-"));
  const targetUrl = `${httpBase}/lab/rules?verify-webrtc-va-metadata-sync=${Date.now()}`;
  const pending = new Map();
  let messageId = 0;
  let ws = null;
  const logStream = fs.createWriteStream(logFile, { flags: "a" });
  const chrome = spawn(
    chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      "--headless=new",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--no-first-run",
      "--no-default-browser-check",
      targetUrl,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  chrome.stdout.on("data", (chunk) => logStream.write(chunk));
  chrome.stderr.on("data", (chunk) => logStream.write(chunk));

  const cdp = (method, params = {}) => {
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
      await onceExit(chrome, 5000).catch(() => chrome.kill("SIGKILL"));
    }
    logStream.end();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  };

  try {
    const pageTarget = await waitForTarget(port, targetUrl, timeoutMs);
    ws = await connectWebSocket(pageTarget.webSocketDebuggerUrl, pending);
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await waitForDocumentReady((expr, ms) => evaluateWithCdp(cdp, expr, ms), timeoutMs);
    await delay(1000);
    return {
      evaluate: (expr, ms) => evaluateWithCdp(cdp, expr, ms),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

async function fetchJson(pathname, init = undefined) {
  const response = await fetch(new URL(pathname, httpBase), init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${pathname} HTTP ${response.status}: ${text}`);
  }
  return JSON.parse(text);
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
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

async function waitForTarget(port, urlPrefix, waitTimeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitTimeoutMs) {
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
  throw new Error("timed out waiting for document.readyState=complete");
}

async function evaluateWithCdp(cdp, expression, evalTimeoutMs) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out evaluating expression after ${evalTimeoutMs}ms`)), evalTimeoutMs);
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
    if (timer !== null) {
      clearTimeout(timer);
    }
  });
  if (!result || !result.result) {
    return undefined;
  }
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate exception");
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

function logPass(message) {
  console.log(`[pass] ${message}`);
}

function writeSummary(target, payload) {
  if (!target) {
    return;
  }
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[summary-json] ${target}`);
}
