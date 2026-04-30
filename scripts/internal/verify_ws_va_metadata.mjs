#!/usr/bin/env node
// 파일 용도: VA metadata WebSocket side-channel의 handshake와 첫 metadata frame을 검증한다.
// 동작 요약: 실행 중인 서버에 raw WebSocket으로 접속해 schema와 임시 tap cleanup을 확인한다.
import crypto from "node:crypto";
import net from "node:net";

const args = process.argv.slice(2);
let httpBase = process.env.MEDIA_SERVER_VERIFY_WS_METADATA_HTTP_BASE || "http://127.0.0.1:8080";
let fileToken = process.env.MEDIA_SERVER_VERIFY_WS_METADATA_FILE || "sample_h264.mp4";
let timeoutMs = Number(process.env.MEDIA_SERVER_VERIFY_WS_METADATA_TIMEOUT_MS || 8000);

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--http-base") {
    httpBase = args[++i] || httpBase;
  } else if (arg === "--file") {
    fileToken = args[++i] || fileToken;
  } else if (arg === "--timeout-ms") {
    timeoutMs = Number(args[++i] || timeoutMs);
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

function parseHeaders(raw) {
  const lines = raw.split("\r\n");
  const status = lines.shift() || "";
  const headers = new Map();
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return { status, headers };
}

function tryParseFrame(buffer) {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  let offset = 2;
  let length = buffer[1] & 0x7f;
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return null;
    const high = buffer.readUInt32BE(2);
    const low = buffer.readUInt32BE(6);
    length = high * 2 ** 32 + low;
    offset = 10;
  }
  if (buffer.length < offset + length) return null;
  return {
    opcode,
    payload: buffer.subarray(offset, offset + length).toString("utf8"),
    rest: buffer.subarray(offset + length),
  };
}

async function readWebSocketMetadata(pathname) {
  return await new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const expectedAccept = crypto
      .createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
    const socket = net.connect({
      host: base.hostname,
      port: Number(base.port || 80),
    });
    let buffer = Buffer.alloc(0);
    let handshaken = false;
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("WebSocket metadata smoke timed out"));
    }, timeoutMs);

    socket.on("connect", () => {
      socket.write(
        [
          `GET ${pathname} HTTP/1.1`,
          `Host: ${base.host}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${key}`,
          "Sec-WebSocket-Version: 13",
          "",
          "",
        ].join("\r\n")
      );
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!handshaken) {
        const headerEnd = buffer.indexOf("\r\n\r\n");
        if (headerEnd < 0) return;
        const { status, headers } = parseHeaders(buffer.subarray(0, headerEnd).toString("utf8"));
        if (!status.includes("101")) {
          clearTimeout(timer);
          socket.destroy();
          reject(new Error(`expected 101 Switching Protocols, got ${status}`));
          return;
        }
        if (headers.get("sec-websocket-accept") !== expectedAccept) {
          clearTimeout(timer);
          socket.destroy();
          reject(new Error("Sec-WebSocket-Accept mismatch"));
          return;
        }
        handshaken = true;
        logPass("WebSocket handshake 101/Sec-WebSocket-Accept 확인");
        buffer = buffer.subarray(headerEnd + 4);
      }

      const frame = tryParseFrame(buffer);
      if (!frame) return;
      if (frame.opcode !== 1) {
        return;
      }
      clearTimeout(timer);
      socket.end();
      resolve(JSON.parse(frame.payload));
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

await fetchJson("/health");
logPass("HTTP health ok");

function assertRuntimeMetadata(payload, label) {
  if (payload.schema !== "media-server.va.runtime-metadata.v1") {
    fail(`${label}: unexpected schema: ${payload.schema}`);
  }
  if (!Array.isArray(payload.tracks) || !Array.isArray(payload.events) || !Array.isArray(payload.scenarios)) {
    fail(`${label}: runtime metadata arrays are missing`);
  }
  if (!payload.metrics || typeof payload.metrics !== "object") {
    fail(`${label}: runtime metrics summary is missing`);
  }
}

const payload = await readWebSocketMetadata(tempPath);
assertRuntimeMetadata(payload, "temporary source WebSocket");
logPass("WebSocket 임시 source metadata schema/tracks/events/scenarios/metrics 확인");

await new Promise((resolve) => setTimeout(resolve, 300));
let taps = await fetchJson("/lab/analysis/taps");
if (Number(taps.activeTaps || 0) !== 0) {
  fail(`temporary WebSocket tap was not cleaned up: activeTaps=${taps.activeTaps}`);
}
logPass("WebSocket 임시 analysis tap cleanup 확인");

const created = await fetchJson(`/lab/analysis/taps?file=${encodeURIComponent(fileToken)}&va=1`, {
  method: "POST",
});
const tapId = created.tapId;
if (!tapId) fail("failed to create explicit analysis tap");
const tapPayload = await readWebSocketMetadata(
  `/ws/va-metadata?tapId=${encodeURIComponent(tapId)}&intervalMs=100&maxMessages=1&streamMaxDurationMs=${Math.max(timeoutMs - 1000, 1000)}`
);
assertRuntimeMetadata(tapPayload, "tapId WebSocket");
logPass("WebSocket tapId 재사용 metadata schema 확인");

await fetchJson(`/lab/analysis/taps/${encodeURIComponent(tapId)}`, { method: "DELETE" });
logPass("WebSocket smoke용 명시적 analysis tap 삭제 확인");

console.log("[summary] pass=5 fail=0");
