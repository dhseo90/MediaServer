#!/usr/bin/env node
// 파일 용도: 공통 source/session lifecycle 상태가 active 후 idle로 정리되는지 검증한다.

import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 12000);
const pollIntervalMs = Number(args.pollIntervalMs || 250);

const initial = await runtimeStatus();
assertLifecycleShape(initial, "initial");
if (!initial.sourceLifecycle.idle) {
  throw new Error(`initial lifecycle is not idle: ${JSON.stringify(initial.sourceLifecycle)}`);
}
console.log("[pass] source-lifecycle initial idle");

let sessionId = "";
try {
  const created = await requestJson("/webrtc/session?file=sample_h264.mp4", { method: "POST" });
  sessionId = String(created.sessionId || "");
  if (!sessionId || !created.offer) {
    throw new Error(`WebRTC session response missing sessionId/offer: ${JSON.stringify(created).slice(0, 200)}`);
  }
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
} finally {
  if (sessionId) {
    await requestJson(`/webrtc/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" }).catch(() => {});
  }
}

const idle = await waitForLifecycle(item => item.sourceLifecycle.idle === true, "idle cleanup");
assertZeroLifecycle(idle.sourceLifecycle);
console.log("[pass] source-lifecycle cleanup idle");
console.log("[pass] ops-source-lifecycle");

async function runtimeStatus() {
  return requestJson("/lab/runtime/status");
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

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
