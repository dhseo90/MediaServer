#!/usr/bin/env node
// 파일 용도: WebRTC VA metadata DataChannel을 브라우저 RTCPeerConnection으로 자동 검증한다.
// 동작 요약: vaMetadata=1 세션에서 video track, ICE 연결, DataChannel open, metadata schema를 확인한다.

import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { assertKnownOptions } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
assertKnownOptions(rawArgs, [
  "http-base",
  "file",
  "timeout-ms",
  "hold-ms",
  "stall-after-ms",
  "interval-ms",
  "max-buffered-bytes",
  "debug-port",
  "chrome-path",
  "summary-file",
  "log-file",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = (args.httpBase || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_HTTP_BASE || "http://127.0.0.1:8080").replace(/\/+$/, "");
const fileToken = args.file || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_FILE || "sample_h264.mp4";
const timeoutMs = Number(args.timeoutMs || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_TIMEOUT_MS || 45000);
const holdMs = Number(args.holdMs || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_HOLD_MS || 0);
const stallAfterMs = Number(args.stallAfterMs || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_STALL_AFTER_MS || 10000);
const intervalMs = Number(args.intervalMs || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_INTERVAL_MS || 100);
const maxBufferedBytes = Number(args.maxBufferedBytes || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_MAX_BUFFERED_BYTES || 0);
const debugPort = Number(args.debugPort || process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_DEBUG_PORT || 9233);
const chromePath = args.chromePath || process.env.CHROME_PATH || findChrome();
const summaryFile =
  args.summaryFile ||
  process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_SUMMARY ||
  path.join(os.tmpdir(), `media_server_webrtc_va_metadata_summary_${Date.now()}.json`);
const logFile =
  args.logFile ||
  process.env.MEDIA_SERVER_VERIFY_WEBRTC_VA_METADATA_LOG ||
  path.join(os.tmpdir(), `media_server_webrtc_va_metadata_chrome_${Date.now()}.log`);

const egressSource = fs.readFileSync("src/ingress/webrtc_egress_session.cpp", "utf8");
const setRemoteAnswerSource = extractFunctionBody(egressSource, "bool WebRtcEgressSession::SetRemoteAnswer(");
const applyNegotiatedPayloadTypesSource = extractFunctionBody(egressSource, "void WebRtcEgressSession::ApplyNegotiatedPayloadTypes(");
const publishMetadataSource = extractFunctionBody(egressSource, "bool WebRtcEgressSession::PublishAnalysisMetadata(");
const iceStateSource = extractFunctionBody(egressSource, "void WebRtcEgressSession::HandleIceConnectionStateChanged()");
assertSourceContract(setRemoteAnswerSource.includes("ApplyNegotiatedPayloadTypes(sdp_answer)") && applyNegotiatedPayloadTypesSource.includes("encoding-name=H264") && applyNegotiatedPayloadTypesSource.includes('g_object_set(video_pay, "pt", *video_pt, nullptr)'), "MEDIA-015 exact H264 negotiation state missing from SetRemoteAnswer");
assertSourceContract(publishMetadataSource.includes("++metadata_send_failures_") && !publishMetadataSource.includes("StopMediaOutput") && iceStateSource.includes('StartMediaOutputIfReady("ice-connected")'), "MEDIA-018 metadata failure must remain isolated from media output readiness");
assertSourceContract(publishMetadataSource.includes("gst_webrtc_data_channel_send_string_full") && publishMetadataSource.includes("++metadata_send_failures_") && publishMetadataSource.includes("return false;"), "MEDIA-020 DataChannel send failure counter must not become a media-path failure");

if (args.help || args.h) {
  console.log(`WebRTC VA metadata DataChannel smoke

Usage:
  ./server.sh verify-webrtc-va-metadata [--http-base <url>] [--file <token>] [--timeout-ms <ms>]
    [--hold-ms <ms>] [--stall-after-ms <ms>] [--interval-ms <ms>] [--max-buffered-bytes <bytes>]

Summary JSON:
  ${summaryFile}
`);
  process.exit(0);
}

const summary = {
  ok: false,
  kind: "webrtc-va-metadata",
  httpBase,
  file: fileToken,
  timeoutMs,
  holdMs,
  stallAfterMs,
  intervalMs,
  maxBufferedBytes,
  debugPort,
  logFile,
  checks: [
    "webrtcSessionCreated",
    "videoTrackOnTrack",
    "iceConnected",
    "dataChannelOpen",
    "metadataMessageReceived",
    "metadataSchemaParse",
    "tracksEventsArrays",
    "syncDiagnostics",
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
  const result = await browser.evaluate(buildBrowserVerificationExpression(), timeoutMs + holdMs + 5000);
  validateResult(result);
  Object.assign(summary, result, { ok: true, pass: 8, fail: 0 });
  logPass("WebRTC video track 수신 확인");
  logPass("WebRTC ICE connected 확인");
  logPass("WebRTC DataChannel open 확인");
  logPass("WebRTC DataChannel label va-metadata 확인");
  logPass("WebRTC metadata message 수신 확인");
  logPass("WebRTC metadata schema 확인");
  logPass("WebRTC metadata tracks array 확인");
  logPass("WebRTC metadata events array 확인");
  logPass("WebRTC metadata sync diagnostics 확인");
  console.log("[summary] pass=8 fail=0");
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
      const state = {
        sessionId: '',
        videoTrack: false,
        trackKinds: [],
        iceConnectionState: '',
        connectionState: '',
        dataChannelLabel: '',
        dataChannelState: 'disabled',
        dataChannelOpened: false,
        metadataMessageCount: 0,
        latestMetadataTimestampMs: 0,
        metadataStalled: false,
        fetchRetryCount: 0,
        tracksCount: 0,
        eventsCount: 0,
        scenariosCount: 0,
        metadataSchema: '',
        syncStatus: '',
        syncDeltaMs: null,
        syncToleranceMs: null,
        metadataSequence: 0,
        sentAtMs: 0,
        videoFramePtsMs: null,
        analysisPtsMs: null,
        frameWidth: 0,
        frameHeight: 0,
        coordinateSpace: '',
        syncDeltaSamples: 0,
        syncDeltaSum: 0,
        syncDeltaAbsSum: 0,
        maxSyncDeltaMs: null,
        maxAbsSyncDeltaMs: null,
        avgSyncDeltaMs: null,
        avgAbsSyncDeltaMs: null,
        syncStatusCounts: {},
        metadataSequenceFirst: 0,
        metadataSequenceLast: 0,
        sequenceGapDropCount: 0,
        messageBytesMax: 0,
        interMessageGapSamples: 0,
        interMessageGapMinMs: null,
        interMessageGapMaxMs: null,
        interMessageGapAvgMs: null,
        interMessageGapSumMs: 0,
        clientBufferedAmountMax: 0,
        parseErrors: [],
        metadataFieldTypes: {},
      };
      let pc = null;
      let iceTimer = null;
      let metadataChannel = null;
      const baseUrl = ${JSON.stringify(httpBase)};
      const endpoint = (path) => new URL(path, baseUrl).toString();
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const stillWaiting = () => Date.now() - startedAt < timeoutMs;
      const assertOk = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const fetchJson = async (path, init = {}, options = {}) => {
        const attempts = Math.max(1, Number(options.attempts || 8));
        let lastError = '';
        for (let attempt = 1; attempt <= attempts && stillWaiting(); attempt += 1) {
          try {
            const response = await fetch(endpoint(path), { cache: 'no-store', ...init });
            const text = await response.text();
            if (response.ok) {
              return JSON.parse(text || '{}');
            }
            lastError = path + ' HTTP ' + response.status + ': ' + text;
            if (![408, 409, 425, 429, 500, 502, 503, 504].includes(response.status)) {
              break;
            }
          } catch (error) {
            lastError = path + ' fetch failed: ' + (error && error.message ? error.message : String(error));
          }
          if (attempt < attempts) {
            state.fetchRetryCount += 1;
            await wait(Math.min(250 * attempt, 1500));
          }
        }
        throw new Error(lastError || (path + ' fetch failed'));
      };
      const pollIce = async () => {
        if (!state.sessionId || !pc) return;
        const payload = await fetchJson('/webrtc/session/' + encodeURIComponent(state.sessionId) + '/ice').catch(() => null);
        const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
        for (const candidate of candidates) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (_) {
          }
        }
      };

      try {
        const config = await fetchJson('/webrtc/config', { cache: 'no-store' }).catch(() => ({ peerConnectionConfig: { iceServers: [] } }));
        pc = new RTCPeerConnection(config.peerConnectionConfig || { iceServers: [] });
        pc.onconnectionstatechange = () => { state.connectionState = pc.connectionState || ''; };
        pc.oniceconnectionstatechange = () => { state.iceConnectionState = pc.iceConnectionState || ''; };
        pc.ontrack = (event) => {
          state.videoTrack = state.videoTrack || event.track.kind === 'video';
          if (!state.trackKinds.includes(event.track.kind)) state.trackKinds.push(event.track.kind);
        };
        pc.ondatachannel = (event) => {
          metadataChannel = event.channel;
          state.dataChannelLabel = metadataChannel.label || '';
          state.dataChannelState = metadataChannel.readyState || 'connecting';
          metadataChannel.onopen = () => {
            state.dataChannelOpened = true;
            state.dataChannelState = 'open';
          };
          metadataChannel.onclose = () => { state.dataChannelState = 'closed'; };
          metadataChannel.onerror = () => { state.dataChannelState = 'error'; };
          metadataChannel.onmessage = (messageEvent) => {
            state.dataChannelOpened = true;
            state.dataChannelState = 'receiving';
            state.metadataMessageCount += 1;
            const receivedAtMs = Date.now();
            if (state.latestMetadataTimestampMs > 0) {
              const gapMs = receivedAtMs - state.latestMetadataTimestampMs;
              state.interMessageGapSamples += 1;
              state.interMessageGapSumMs += gapMs;
              state.interMessageGapMinMs = state.interMessageGapMinMs === null ? gapMs : Math.min(state.interMessageGapMinMs, gapMs);
              state.interMessageGapMaxMs = state.interMessageGapMaxMs === null ? gapMs : Math.max(state.interMessageGapMaxMs, gapMs);
              state.interMessageGapAvgMs = Number((state.interMessageGapSumMs / state.interMessageGapSamples).toFixed(2));
            }
            state.latestMetadataTimestampMs = receivedAtMs;
            state.clientBufferedAmountMax = Math.max(state.clientBufferedAmountMax, Number(metadataChannel.bufferedAmount || 0));
            try {
              const rawMessage = String(messageEvent.data || '');
              state.messageBytesMax = Math.max(state.messageBytesMax, new TextEncoder().encode(rawMessage).length);
              const payload = JSON.parse(rawMessage);
              state.metadataFieldTypes = {
                schema: typeof payload.schema,
                tracks: Array.isArray(payload.tracks) ? 'array' : typeof payload.tracks,
                events: Array.isArray(payload.events) ? 'array' : typeof payload.events,
                syncStatus: typeof payload.syncStatus,
                metadataSequence: typeof payload.metadataSequence,
                sentAtMs: typeof payload.sentAtMs,
                videoFramePtsMs: typeof payload.videoFramePtsMs,
                analysisPtsMs: typeof payload.analysisPtsMs,
                syncDeltaMs: typeof payload.syncDeltaMs,
                syncToleranceMs: typeof payload.syncToleranceMs,
                coordinateSpace: typeof payload.coordinateSpace,
              };
              state.metadataSchema = payload.schema || '';
              state.tracksCount = Array.isArray(payload.tracks) ? payload.tracks.length : -1;
              state.eventsCount = Array.isArray(payload.events) ? payload.events.length : -1;
              state.scenariosCount = Array.isArray(payload.scenarios) ? payload.scenarios.length : 0;
              state.syncStatus = payload.syncStatus || '';
              state.syncDeltaMs = Number.isFinite(Number(payload.syncDeltaMs)) ? Number(payload.syncDeltaMs) : null;
              state.syncToleranceMs = Number.isFinite(Number(payload.syncToleranceMs)) ? Number(payload.syncToleranceMs) : null;
              state.metadataSequence = Number.isFinite(Number(payload.metadataSequence)) ? Number(payload.metadataSequence) : 0;
              if (state.metadataSequence > 0) {
                if (state.metadataSequenceFirst <= 0) {
                  state.metadataSequenceFirst = state.metadataSequence;
                }
                if (state.metadataSequenceLast > 0 && state.metadataSequence > state.metadataSequenceLast + 1) {
                  state.sequenceGapDropCount += state.metadataSequence - state.metadataSequenceLast - 1;
                }
                state.metadataSequenceLast = Math.max(state.metadataSequenceLast, state.metadataSequence);
              }
              state.sentAtMs = Number.isFinite(Number(payload.sentAtMs)) ? Number(payload.sentAtMs) : 0;
              state.videoFramePtsMs = Number.isFinite(Number(payload.videoFramePtsMs)) ? Number(payload.videoFramePtsMs) : null;
              state.analysisPtsMs = Number.isFinite(Number(payload.analysisPtsMs)) ? Number(payload.analysisPtsMs) : null;
              state.frameWidth = Number.isFinite(Number(payload.frameWidth)) ? Number(payload.frameWidth) : 0;
              state.frameHeight = Number.isFinite(Number(payload.frameHeight)) ? Number(payload.frameHeight) : 0;
              state.coordinateSpace = payload.coordinateSpace || '';
              const status = state.syncStatus || 'unknown';
              state.syncStatusCounts[status] = (state.syncStatusCounts[status] || 0) + 1;
              if (state.syncDeltaMs !== null) {
                const deltaMs = Number(state.syncDeltaMs);
                const absDeltaMs = Math.abs(deltaMs);
                state.syncDeltaSamples += 1;
                state.syncDeltaSum += deltaMs;
                state.syncDeltaAbsSum += absDeltaMs;
                state.maxSyncDeltaMs = state.maxSyncDeltaMs === null ? deltaMs : Math.max(state.maxSyncDeltaMs, deltaMs);
                state.maxAbsSyncDeltaMs = state.maxAbsSyncDeltaMs === null ? absDeltaMs : Math.max(state.maxAbsSyncDeltaMs, absDeltaMs);
                state.avgSyncDeltaMs = Number((state.syncDeltaSum / state.syncDeltaSamples).toFixed(2));
                state.avgAbsSyncDeltaMs = Number((state.syncDeltaAbsSum / state.syncDeltaSamples).toFixed(2));
              }
              if (!Array.isArray(payload.tracks) || !Array.isArray(payload.events)) {
                state.parseErrors.push('tracks/events arrays missing');
              }
              const allowedSyncStatuses = ['exact', 'near', 'fallback-latest', 'missing', 'stale'];
              if (!allowedSyncStatuses.includes(state.syncStatus)) {
                state.parseErrors.push('syncStatus missing or invalid');
              }
              if (state.videoFramePtsMs === null || state.analysisPtsMs === null || state.syncDeltaMs === null || state.syncToleranceMs === null) {
                state.parseErrors.push('sync timing fields missing or invalid');
              }
              if (state.metadataSequence <= 0 || state.sentAtMs <= 0) {
                state.parseErrors.push('metadataSequence/sentAtMs missing or invalid');
              }
              if (state.coordinateSpace !== 'normalized-frame') {
                state.parseErrors.push('coordinateSpace missing or invalid');
              }
            } catch (error) {
              state.parseErrors.push(error && error.message ? error.message : String(error));
            }
          };
        };
        pc.onicecandidate = async (event) => {
          if (!state.sessionId || !event.candidate) return;
          await fetch(endpoint('/webrtc/session/' + encodeURIComponent(state.sessionId) + '/ice'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate,
            }),
          }).catch(() => {});
        };

        const params = new URLSearchParams();
        params.set('file', ${JSON.stringify(fileToken)});
        params.set('va', '1');
        params.set('vaMetadata', '1');
        params.set('vaMetadataIntervalMs', ${JSON.stringify(String(intervalMs))});
        params.set('vaMetadataMaxMessageBytes', '65536');
        if (${JSON.stringify(maxBufferedBytes)} > 0) {
          params.set('vaMetadataMaxBufferedBytes', ${JSON.stringify(String(maxBufferedBytes))});
        }
        const session = await fetchJson('/webrtc/session?' + params.toString(), { method: 'POST' }, { attempts: 6 });
        state.sessionId = session.sessionId || '';
        assertOk(state.sessionId && session.offer, 'CreateOffer WebRTC session response missing sessionId/offer');
        assertOk(/H264/i.test(String(session.offer || '')), 'MEDIA-015 WebRTC offer missing H264 codec capability');
        await pc.setRemoteDescription({ type: 'offer', sdp: session.offer });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const answerReadback = await fetchJson('/webrtc/session/' + encodeURIComponent(state.sessionId) + '/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: answer.sdp,
        });
        assertOk(answerReadback?.ok === true, 'set-remote-answer response was not accepted');
        iceTimer = setInterval(() => { pollIce().catch(() => {}); }, 500);

        while (stillWaiting()) {
          state.iceConnectionState = pc.iceConnectionState || state.iceConnectionState;
          state.connectionState = pc.connectionState || state.connectionState;
          const iceConnected = ['connected', 'completed'].includes(state.iceConnectionState) || state.connectionState === 'connected';
          const channelOpen = state.dataChannelOpened || (metadataChannel && ['open', 'receiving'].includes(metadataChannel.readyState || state.dataChannelState));
          if (state.videoTrack && iceConnected && channelOpen && state.metadataMessageCount > 0) {
            break;
          }
          await wait(250);
        }
        const holdStartedAt = Date.now();
        const holdMs = ${JSON.stringify(holdMs)};
        const stallAfterMs = ${JSON.stringify(stallAfterMs)};
        while (holdMs > 0 && Date.now() - holdStartedAt < holdMs && stillWaiting()) {
          state.iceConnectionState = pc.iceConnectionState || state.iceConnectionState;
          state.connectionState = pc.connectionState || state.connectionState;
          state.dataChannelState = metadataChannel ? (metadataChannel.readyState || state.dataChannelState) : state.dataChannelState;
          if (state.latestMetadataTimestampMs > 0 && Date.now() - state.latestMetadataTimestampMs > stallAfterMs) {
            state.metadataStalled = true;
            break;
          }
          await wait(1000);
        }
        state.iceConnectionState = pc.iceConnectionState || state.iceConnectionState;
        state.connectionState = pc.connectionState || state.connectionState;
        state.dataChannelState = metadataChannel ? (metadataChannel.readyState || state.dataChannelState) : state.dataChannelState;
        return state;
      } finally {
        if (iceTimer) clearInterval(iceTimer);
        if (metadataChannel) {
          try { metadataChannel.close(); } catch (_) {}
        }
        if (pc) {
          try {
            for (const sender of pc.getSenders ? pc.getSenders() : []) {
              if (sender.track) sender.track.stop();
            }
            for (const receiver of pc.getReceivers ? pc.getReceivers() : []) {
              if (receiver.track) receiver.track.stop();
            }
            pc.close();
          } catch (_) {}
        }
        if (state.sessionId) {
          await fetch(endpoint('/webrtc/session/' + encodeURIComponent(state.sessionId)), { method: 'DELETE' }).catch(() => {});
        }
      }
    })()
  `;
}

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("browser verification returned no result");
  }
  if (!result.videoTrack || !Array.isArray(result.trackKinds) || !result.trackKinds.includes("video")) {
    throw new Error(`bridge->Start video ontrack was not observed: ${JSON.stringify(result)}`);
  }
  const iceConnected =
    ["connected", "completed"].includes(result.iceConnectionState) || result.connectionState === "connected";
  if (!iceConnected) {
    throw new Error(`add-ice-candidate ICE did not connect: ${JSON.stringify(result)}`);
  }
  if (!result.dataChannelOpened && Number(result.metadataMessageCount || 0) <= 0) {
    throw new Error(`DataChannel did not open: ${JSON.stringify(result)}`);
  }
  if ((result.dataChannelLabel || "") !== "va-metadata") {
    throw new Error(`unexpected DataChannel label: ${result.dataChannelLabel}`);
  }
  if (Number(result.metadataMessageCount || 0) <= 0) {
    throw new Error(`metadata message was not received: ${JSON.stringify(result)}`);
  }
  if (result.metadataSchema !== "media-server.webrtc.va-metadata.v1") {
    throw new Error(`PublishAnalysisMetadata unexpected WebRTC metadata schema: ${result.metadataSchema}`);
  }
  const metadataProjectionSha256 = crypto.createHash("sha256").update(JSON.stringify(result.metadataFieldTypes || {})).digest("hex");
  if (metadataProjectionSha256 !== "e11c527612491bf82f60f64015b9e4aadac7b96d81af51e475f8559bc008a76d") {
    throw new Error(`WebRTC metadata field/type frozen baseline SHA-256 mismatch: ${metadataProjectionSha256}`);
  }
  if (Number(result.tracksCount) < 0 || Number(result.eventsCount) < 0) {
    throw new Error(`tracks/events arrays are missing: ${JSON.stringify(result)}`);
  }
  const allowedSyncStatuses = ["exact", "near", "fallback-latest", "missing", "stale"];
  if (!allowedSyncStatuses.includes(result.syncStatus || "")) {
    throw new Error(`syncStatus is missing or invalid: ${JSON.stringify(result)}`);
  }
  if (
    !Number.isFinite(Number(result.videoFramePtsMs)) ||
    !Number.isFinite(Number(result.analysisPtsMs)) ||
    !Number.isFinite(Number(result.syncDeltaMs)) ||
    !Number.isFinite(Number(result.syncToleranceMs)) ||
    Number(result.metadataSequence || 0) <= 0 ||
    Number(result.sentAtMs || 0) <= 0 ||
    result.coordinateSpace !== "normalized-frame"
  ) {
    throw new Error(`sync diagnostic fields are missing or invalid: ${JSON.stringify(result)}`);
  }
  if (Array.isArray(result.parseErrors) && result.parseErrors.length > 0) {
    throw new Error(`metadata parse errors: ${result.parseErrors.join(", ")}`);
  }
  if (result.metadataStalled) {
    throw new Error(`metadata DataChannel stalled: ${JSON.stringify(result)}`);
  }
}

function extractFunctionBody(source, signature) {
  const start = source.indexOf(signature);
  assertSourceContract(start >= 0, `function signature missing: ${signature}`);
  const open = source.indexOf("{", start);
  assertSourceContract(open >= 0, `function body missing: ${signature}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function body: ${signature}`);
}

function assertSourceContract(condition, message) {
  if (!condition) throw new Error(message);
}

async function launchBrowser(port) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-chrome-"));
  const targetUrl = `${httpBase}/health?verify-webrtc-va-metadata=${Date.now()}`;
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
