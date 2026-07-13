#!/usr/bin/env node
// 파일 용도: 공통 source/session lifecycle 상태가 active 후 idle로 정리되는지 검증한다.

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops source lifecycle smoke

Usage:
  ./server.sh verify-ops-source-lifecycle [options]

Options:
  --http-base <url>       실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --auto-start[=0|1]      서버가 없으면 임시 auth-off 서버를 자동 시작합니다. 기본 1.
  --rtsp-port <port>      자동 시작 서버 RTSP port입니다. 기본 8555.
  --random-ports[=0|1]    자동 시작 서버 포트를 임시 free port로 잡습니다. 기본 0.
  --timeout-ms <ms>       idle/active 대기 시간입니다. 기본 12000.
  --poll-interval-ms <ms> polling 간격입니다. 기본 250.
  --settle-ms <ms>        active 확인 후 DELETE 전 안정화 대기입니다. 기본 500.
  -h, --help              도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "auto-start",
  "rtsp-port",
  "random-ports",
  "timeout-ms",
  "poll-interval-ms",
  "settle-ms",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const hasExplicitHttpBase = args.httpBase !== undefined && args.httpBase !== null && args.httpBase !== "";
const hasExplicitRtspPort = args.rtspPort !== undefined && args.rtspPort !== null && args.rtspPort !== "";
let httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const autoStart = parseBool(args.autoStart, true);
let rtspPort = Number(args.rtspPort || 8555);
const randomPorts = parseBool(args.randomPorts, false);
const timeoutMs = Number(args.timeoutMs || 12000);
const pollIntervalMs = Number(args.pollIntervalMs || 250);
const settleMs = Number(args.settleMs || 500);
const runId = `ops-source-lifecycle-${Date.now()}-${process.pid}`;
const managedStateDir = path.join("/private/tmp", `media_server_${runId}_state`);
let managedServer = null;
let managedServerLogs = [];

try {
  await ensureServerReady();
  await runLifecycleSmoke();
} finally {
  await stopManagedServer();
}

async function runLifecycleSmoke() {
  const initial = await runtimeStatus();
  assertLifecycleShape(initial, "initial");
  if (!initial.sourceLifecycle.idle) {
    throw new Error(`initial lifecycle is not idle: ${JSON.stringify(initial.sourceLifecycle)}`);
  }
  console.log("[pass] source-lifecycle initial idle");

  const sessionIds = [];
  try {
    const created = await requestJson("/webrtc/session?file=sample_h264.mp4", { method: "POST" });
    const sessionId = String(created.sessionId || "");
    if (!sessionId || !created.offer) {
      throw new Error(`SessionJson WebRTC session response missing sessionId/offer: ${JSON.stringify(created).slice(0, 200)}`);
    }
    sessionIds.push(sessionId);
    console.log(`[pass] source-lifecycle session-created ${sessionId}`);

    const active = await waitForLifecycle(
      item => item.sourceLifecycle.httpEgressSessions > 0 ||
        item.sourceLifecycle.activeSessions > 0 ||
        item.sourceLifecycle.resourceActiveStreams > 0,
      "active WebRTC lifecycle",
    );
    if (active.sourceLifecycle.idle) {
      throw new Error(`active lifecycle unexpectedly idle: ${JSON.stringify(active.sourceLifecycle)}`);
    }
    console.log("[pass] source-lifecycle active accounting");

    const reused = await requestJson("/webrtc/session?file=sample_h264.mp4", { method: "POST" });
    const reusedSessionId = String(reused.sessionId || "");
    if (!reusedSessionId || !reused.offer || reusedSessionId === sessionId) {
      throw new Error(`shared stream second session response mismatch: ${JSON.stringify(reused).slice(0, 200)}`);
    }
    sessionIds.push(reusedSessionId);
    const shared = await waitForLifecycle(
      item => item.sourceLifecycle.activeSessions >= 2 &&
        item.sourceLifecycle.httpEgressSessions >= 2 &&
        item.sourceLifecycle.resourceActiveStreams === 1 &&
        item.sourceLifecycle.registryActiveStreams === 1,
      "shared stream reuse",
    );
    if (shared.sourceLifecycle.resourceActiveSessions < 2 ||
        shared.sourceLifecycle.resourceActiveStreams !== shared.sourceLifecycle.registryActiveStreams) {
      throw new Error(`shared stream accounting mismatch: ${JSON.stringify(shared.sourceLifecycle)}`);
    }
    if (shared.sourceLifecycle.resourceActiveStreams !== 1) {
      throw new Error(`MEDIA-011 StreamRegistry created = false reuse expected resourceActiveStreams=1: ${JSON.stringify(shared.sourceLifecycle)}`);
    }
    if (shared.sourceLifecycle.activeSessions < 2) {
      throw new Error(`MEDIA-012 source_running_ worker lifecycle expected two activeSessions: ${JSON.stringify(shared.sourceLifecycle)}`);
    }
    if (shared.sourceLifecycle.registryActiveStreams !== 1) {
      throw new Error(`MEDIA-013 streams_ registry expected registryActiveStreams=1: ${JSON.stringify(shared.sourceLifecycle)}`);
    }
    console.log("[pass] source-lifecycle two sessions reuse one registered source worker");
    if (settleMs > 0) {
      await delay(settleMs);
    }
  } finally {
    for (const sessionId of sessionIds.reverse()) {
      await requestJson(`/webrtc/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  await assertIndependentCleanupReadback();
  console.log("[pass] source-lifecycle cleanup idle");
  console.log("[summary] ops-source-lifecycle complete");
}

async function assertIndependentCleanupReadback() {
  const readback = await waitForLifecycle(item => item.sourceLifecycle.idle === true, "CloseSession idle cleanup");
  assertZeroLifecycle(readback.sourceLifecycle);
  if (readback.sourceLifecycle.idle !== true || readback.sourceLifecycle.activeSessions !== 0 || readback.sourceLifecycle.registryActiveStreams !== 0) {
    throw new Error(`CloseSession independent runtime readback retained session or registry state: ${JSON.stringify(readback.sourceLifecycle)}`);
  }
}

async function runtimeStatus() {
  return requestJson("/lab/runtime/status");
}

async function ensureServerReady() {
  try {
    await fetchHealth();
    console.log(`[pass] source-lifecycle server ready ${httpBase}`);
    return;
  } catch (error) {
    if (!autoStart) {
      throw new Error(`source lifecycle server is not reachable at ${httpBase}: ${error.message}`);
    }
  }

  await resolveManagedServerPorts();
  managedServer = startManagedServer();
  await waitForManagedServer();
  console.log(`[pass] source-lifecycle auto-started server ${httpBase}`);
}

async function resolveManagedServerPorts() {
  if (!randomPorts) return;
  if (!hasExplicitHttpBase) {
    const httpPort = await findFreePort();
    httpBase = `http://127.0.0.1:${httpPort}`;
  }
  if (!hasExplicitRtspPort) {
    rtspPort = await findFreePort();
    const httpPort = Number(new URL(httpBase).port || 0);
    if (rtspPort === httpPort) {
      rtspPort = await findFreePort();
    }
  }
}

function startManagedServer() {
  const httpUrl = new URL(httpBase);
  const httpPort = httpUrl.port || (httpUrl.protocol === "https:" ? "443" : "80");
  fs.mkdirSync(managedStateDir, { recursive: true });
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_AUTH_MODE: "off",
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(managedStateDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(managedStateDir, "views.json"),
      MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(managedStateDir, "analysis.json"),
      MEDIA_SERVER_AUTH_USERS_FILE: path.join(managedStateDir, "users.json"),
      MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || "build-gst-onnx",
      MEDIA_SERVER_SKIP_BUILD: process.env.MEDIA_SERVER_SKIP_BUILD || "1",
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
      MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => rememberManagedServerLog(chunk));
  child.stderr.on("data", chunk => rememberManagedServerLog(chunk));
  return child;
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => {
        if (error) {
          reject(error);
        } else if (port > 0) {
          resolve(port);
        } else {
          reject(new Error("failed to allocate random port"));
        }
      });
    });
  });
}

function rememberManagedServerLog(chunk) {
  const text = String(chunk || "");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    managedServerLogs.push(line.slice(0, 240));
    if (managedServerLogs.length > 80) {
      managedServerLogs.shift();
    }
  }
}

async function waitForManagedServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (managedServer.exitCode !== null) {
      throw new Error(`auto-started server exited early: ${managedServerLogs.slice(-20).join(" | ")}`);
    }
    try {
      await fetchHealth();
      return;
    } catch {
      await delay(pollIntervalMs);
    }
  }
  throw new Error(`auto-started server did not become ready: ${managedServerLogs.slice(-20).join(" | ")}`);
}

async function fetchHealth() {
  const response = await fetch(`${httpBase}/health`);
  if (!response.ok) {
    throw new Error(`health HTTP ${response.status}`);
  }
  return response;
}

async function stopManagedServer() {
  try {
    if (managedServer && managedServer.exitCode === null) {
      managedServer.kill("SIGTERM");
      const startedAt = Date.now();
      while (managedServer.exitCode === null && Date.now() - startedAt < 3000) {
        await delay(100);
      }
      if (managedServer.exitCode === null) {
        managedServer.kill("SIGKILL");
      }
    }
  } finally {
    fs.rmSync(managedStateDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

function assertLifecycleShape(payload, label) {
  const lifecycle = payload?.sourceLifecycle;
  if (!lifecycle || typeof lifecycle !== "object") {
    throw new Error(`${label}: missing sourceLifecycle`);
  }
  for (const key of [
    "idle",
    "activeSessions",
    "resourceActiveSessions",
    "resourceActiveStreams",
    "registryActiveStreams",
    "activeAnalysisTaps",
    "httpEgressSessions",
    "whipPublishSessions",
    "activePublishSources",
    "activeMetadataClients",
  ]) {
    if (!(key in lifecycle)) {
      throw new Error(`${label}: sourceLifecycle missing ${key}`);
    }
  }
}

function assertZeroLifecycle(lifecycle) {
  for (const key of [
    "activeSessions",
    "resourceActiveSessions",
    "resourceActiveStreams",
    "registryActiveStreams",
    "activeAnalysisTaps",
    "httpEgressSessions",
    "whipPublishSessions",
    "activePublishSources",
    "activeMetadataClients",
  ]) {
    if (Number(lifecycle[key] || 0) !== 0) {
      throw new Error(`lifecycle ${key} not zero after cleanup: ${JSON.stringify(lifecycle)}`);
    }
  }
}

async function waitForLifecycle(predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await runtimeStatus();
    assertLifecycleShape(last, description);
    if (predicate(last)) return last;
    await delay(pollIntervalMs);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last?.sourceLifecycle || last)}`);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${httpBase}${path}`, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) {
    throw new Error(`${path} failed HTTP ${response.status}: ${payload?.error || text}`);
  }
  return payload;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
