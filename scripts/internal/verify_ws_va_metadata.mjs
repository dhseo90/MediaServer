#!/usr/bin/env node
// 파일 용도: VA metadata WebSocket side-channel의 handshake, control ack, metadata payload를 검증한다.
// 동작 요약: 실행 중인 서버에 WebSocket으로 접속해 schema, 제어 ack, 임시 tap cleanup을 확인한다.

import { assertKnownOptions } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
assertKnownOptions(args, ["http-base", "file", "timeout-ms", "h", "help"]);
let httpBase = process.env.MEDIA_SERVER_VERIFY_WS_METADATA_HTTP_BASE || "http://127.0.0.1:8080";
let fileToken = process.env.MEDIA_SERVER_VERIFY_WS_METADATA_FILE || "sample_h264.mp4";
let timeoutMs = Number(process.env.MEDIA_SERVER_VERIFY_WS_METADATA_TIMEOUT_MS || 8000);

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
  const name = eq >= 0 ? arg.slice(0, eq) : arg;
  const inlineValue = eq >= 0 ? arg.slice(eq + 1) : undefined;
  const nextValue = () => inlineValue ?? args[++i];
  if (name === "--http-base") {
    httpBase = nextValue() || httpBase;
  } else if (name === "--file") {
    fileToken = nextValue() || fileToken;
  } else if (name === "--timeout-ms") {
    timeoutMs = Number(nextValue() || timeoutMs);
  } else if (arg === "-h" || arg === "--help") {
    console.log(`VA metadata WebSocket smoke

Usage:
  ./server.sh verify-ws-metadata [--http-base <url>] [--file <token>] [--timeout-ms <ms>]
`);
    process.exit(0);
  } else {
    throw new Error(`unknown option: ${arg}`);
  }
}

const base = new URL(httpBase);
const wsBase = new URL(httpBase);
wsBase.protocol = wsBase.protocol === "https:" ? "wss:" : "ws:";
const tempPath =
  `/ws/va-metadata?file=${encodeURIComponent(fileToken)}` +
  `&va=1&intervalMs=100&maxMessages=1&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 1000)}`;

function logPass(message) {
  console.log(`[pass] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function fetchJson(pathname, init = undefined) {
  const response = await fetch(new URL(pathname, base), init);
  const text = await response.text();
  if (!response.ok) {
    fail(`${pathname} HTTP ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function waitForTapCleanup(timeout = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const taps = await fetchJson("/lab/analysis/taps");
    if (Number(taps.activeTaps || 0) === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const taps = await fetchJson("/lab/analysis/taps");
  fail(`temporary WebSocket tap was not cleaned up: activeTaps=${taps.activeTaps}`);
}

async function deleteAllTaps() {
  const taps = await fetchJson("/lab/analysis/taps");
  for (const tap of Array.isArray(taps.taps) ? taps.taps : []) {
    const tapId = String(tap.tapId || "");
    if (!tapId) continue;
    await fetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}`, { method: "DELETE" });
  }
}

function assertRuntimeMetadata(payload, label) {
  if (payload.schema !== "media-server.va.runtime-metadata.v1") {
    fail(`${label}: unexpected schema: ${payload.schema}`);
  }
  if (!Array.isArray(payload.tracks) || !Array.isArray(payload.events) || !Array.isArray(payload.scenarios)) {
    fail(`${label}: runtime metadata arrays are missing`);
  }
}

async function readWebSocketSession(pathname, options = {}) {
  const wsUrl = new URL(pathname, wsBase).toString();
  return await new Promise((resolve, reject) => {
    const controls = [];
    let metadata = null;
    let settled = false;
    let opened = false;
    const expectedControlCount = Number(options.expectedControlCount || 0);
    const expectMetadata = options.expectMetadata !== false;
    const commandDelayMs = Number(options.commandDelayMs || 0);
    const timer = setTimeout(() => {
      finishReject(new Error("WebSocket metadata smoke timed out"));
    }, timeoutMs);
    const socket = new WebSocket(wsUrl);

    function finishResolve(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      resolve(value);
    }

    function finishReject(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      reject(error);
    }

    function maybeResolve() {
      if (expectedControlCount > 0 && controls.length < expectedControlCount) {
        return;
      }
      if (expectMetadata && metadata == null) {
        return;
      }
      finishResolve({
        controls,
        metadata,
      });
    }

    socket.addEventListener("open", () => {
      opened = true;
      logPass("WebSocket handshake/open 확인");
      const commands = Array.isArray(options.commands)
        ? options.commands
        : (options.command ? [options.command] : []);
      if (commands.length === 0) {
        return;
      }
      setTimeout(() => {
        for (const command of commands) {
          socket.send(JSON.stringify(command));
        }
      }, commandDelayMs);
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        if (payload.schema === "media-server.va.metadata-control.v1") {
          controls.push(payload);
        } else {
          metadata = payload;
        }
        maybeResolve();
      } catch (error) {
        finishReject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    socket.addEventListener("error", () => {
      if (opened && expectedControlCount > 0 && controls.length >= expectedControlCount && (!expectMetadata || metadata != null)) {
        maybeResolve();
        return;
      }
      finishReject(new Error("WebSocket client error"));
    });

    socket.addEventListener("close", () => {
      if (settled) {
        return;
      }
      if (expectedControlCount > 0 && controls.length >= expectedControlCount && (!expectMetadata || metadata != null)) {
        maybeResolve();
        return;
      }
      if (!expectMetadata && expectedControlCount === 0) {
        finishResolve({ controls, metadata });
        return;
      }
      finishReject(new Error("WebSocket closed before expected payloads arrived"));
    });
  });
}

await fetchJson("/health");
logPass("HTTP health ok");
await deleteAllTaps();
logPass("WebSocket smoke 시작 전 기존 analysis tap 정리");

const temp = await readWebSocketSession(tempPath, { expectMetadata: true });
assertRuntimeMetadata(temp.metadata, "temporary source WebSocket");
if (!temp.metadata.metrics || typeof temp.metadata.metrics !== "object") {
  fail("temporary source WebSocket: runtime metrics summary is missing");
}
logPass("WebSocket 임시 source metadata schema/tracks/events/scenarios/metrics 확인");

await waitForTapCleanup();
logPass("WebSocket 임시 analysis tap cleanup 확인");

const created = await fetchJson(`/lab/analysis/taps?file=${encodeURIComponent(fileToken)}&va=1`, {
  method: "POST",
});
const tapId = created.tapId;
if (!tapId) fail("failed to create explicit analysis tap");

const tapPayload = await readWebSocketSession(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=100&maxMessages=1&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 1000)}`,
  { expectMetadata: true }
);
assertRuntimeMetadata(tapPayload.metadata, "tapId WebSocket");
logPass("WebSocket tapId 재사용 metadata schema 확인");

const subscribed = await readWebSocketSession(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=1000&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 2000)}`,
  {
    command: {
      type: "subscribe",
      eventType: "loitering",
      includeMetrics: false,
      maxEvents: 3,
      staleAfterMs: 300,
      maxMessages: 2,
    },
    expectedControlCount: 1,
    expectMetadata: false,
  }
);
const subscribeAck = subscribed.controls?.[0];
if (!Array.isArray(subscribeAck?.filter?.eventTypes) ||
    subscribeAck.filter.eventTypes[0] !== "loitering" ||
    subscribeAck.includeMetrics !== false ||
    Number(subscribeAck.maxEvents) !== 3 ||
    Number(subscribeAck.staleAfterMs) !== 1000 ||
    Number(subscribeAck.maxMessages) !== 2) {
  fail(`WebSocket subscribe ack mismatch: ${JSON.stringify(subscribeAck)}`);
}
logPass("WebSocket subscribe control ack 확인");

const paused = await readWebSocketSession(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=1000&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 2000)}`,
  {
    commands: [{ type: "unsubscribe" }, { type: "status" }],
    expectedControlCount: 2,
    expectMetadata: false,
    commandDelayMs: 50,
  }
);
const unsubscribeAck = paused.controls?.[0];
const statusAck = paused.controls?.[1];
if (unsubscribeAck?.subscribed !== false || statusAck?.subscribed !== false || statusAck?.action !== "status") {
  fail(`WebSocket unsubscribe/status subscribed state mismatch: ${JSON.stringify(paused.controls)}`);
}
logPass("WebSocket unsubscribe/status control ack 확인");

const resumed = await readWebSocketSession(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=1000&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 2000)}`,
  {
    commands: [{ type: "unsubscribe" }, { type: "resume" }],
    expectedControlCount: 2,
    expectMetadata: false,
    commandDelayMs: 50,
  }
);
const resumeAck = resumed.controls?.[1];
if (resumeAck?.subscribed !== true || resumeAck?.action !== "resume") {
  fail(`WebSocket resume ack mismatch: ${JSON.stringify(resumed.controls)}`);
}
logPass("WebSocket resume control ack 확인");

const reset = await readWebSocketSession(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=1000&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 2000)}`,
  {
    commands: [
      { type: "subscribe", eventType: "loitering", includeMetrics: false, maxMessages: 2 },
      { type: "reset" },
    ],
    expectedControlCount: 2,
    expectMetadata: false,
    commandDelayMs: 50,
  }
);
const resetAck = reset.controls?.[1];
if (!Array.isArray(resetAck?.filter?.eventTypes) ||
    resetAck.filter.eventTypes.length !== 0 ||
    resetAck.includeMetrics !== true ||
    Number(resetAck.maxMessages) !== 0 ||
    resetAck.action !== "reset") {
  fail(`WebSocket reset ack mismatch: ${JSON.stringify(reset.controls)}`);
}
logPass("WebSocket reset control ack 및 기본값 복원 확인");

await fetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}`, { method: "DELETE" });
logPass("WebSocket smoke용 명시적 analysis tap 삭제 확인");

console.log("[summary] pass=9 fail=0");
