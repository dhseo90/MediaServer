#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 5 sourceReliability 런타임 item 샘플을 fixture EventRecord로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Source Reliability runtime sample verification

Usage:
  ./server.sh verify-v320-source-reliability-runtime-sample [options]

Options:
  --http-base <url>     실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>     HTTP 대기 시간입니다. 기본 10000.
  -h, --help            도움말 출력

Checks:
  - A throwaway EventRecord fixture appears in /ops/api/events/reviews
  - The matching unifiedResolutionWorkspace item contains sourceReliability
  - sourceReliability keeps Ops-only boundary flags and does not expose source URL/raw JSON/debug material
  - The EventRecord fixture and snapshot/clip files are restored or removed after verification
`);
}

assertKnownOptions(rawArgs, ["http-base", "timeout-ms", "h", "help"]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);

await requestJson("/health");
const storageStatus = await requestJson("/lab/analysis/event-storage/status");
if (storageStatus?.enabled !== true) {
  throw new Error("EventRecord storage must be enabled for v3.2 Step 5 runtime sample verification");
}

const fixture = seedSourceReliabilityEventRecordFixture(storageStatus);
try {
  const response = await requestJson(
    `/ops/api/events/reviews?eventId=${encodeURIComponent(fixture.eventId)}&limit=5&evidence=any&includeArchives=1`,
  );
  const workspace = response?.unifiedResolutionWorkspace || {};
  assert(workspace.schema === "media-server.ops.v320-unified-events-workspace.v1", "workspace schema mismatch");
  assert(workspace.sourceReliabilityContextImplemented === true, "source reliability implementation flag missing");
  assert(workspace.sourceReliabilitySummary?.schema === "media-server.ops.v320-source-reliability-context.v1", "source reliability summary schema mismatch");
  assert(workspace.sourceReliabilitySummary?.sourceRegistryWritePerformed === false, "summary must not perform source registry writes");
  assert(workspace.sourceReliabilitySummary?.sourceUrlExposed === false, "summary must not expose source URL");
  assert(workspace.sourceReliabilitySummary?.rawJsonExposed === false, "summary must not expose raw JSON");
  assert(workspace.sourceReliabilitySummary?.debugMaterialExposed === false, "summary must not expose debug material");

  const rows = Array.isArray(workspace.resolutionQueue) ? workspace.resolutionQueue : [];
  const item = rows.find(candidate => candidate?.eventId === fixture.eventId);
  assert(item, `runtime workspace item missing fixture eventId ${fixture.eventId}`);
  const reliability = item.sourceReliability || {};
  assert(reliability.schema === "media-server.ops.v320-source-reliability-context.v1", "item sourceReliability schema mismatch");
  assert(reliability.sourceId === fixture.sourceId, `sourceReliability sourceId mismatch: ${reliability.sourceId}`);
  assert(reliability.sourceHealthStatus !== "source-missing", "source id should be read from fixture EventRecord");
  assert(reliability.operatorRecheckRoute === "/ops/api/source-health", "operator recheck route mismatch");
  assert(typeof reliability.operatorRecheckHint === "string" && reliability.operatorRecheckHint.length > 0, "operator recheck hint missing");
  assert(reliability.sourceRegistryWritePerformed === false, "item must not perform source registry writes");
  assert(reliability.opsOnly === true, "item sourceReliability must be Ops-only");
  assert(reliability.eventPostPayloadChanged === false, "Event POST payload must remain unchanged");
  assert(reliability.webrtcDataChannelSchemaChanged === false, "WebRTC DataChannel schema must remain unchanged");
  assert(reliability.sseMetadataSchemaChanged === false, "SSE metadata schema must remain unchanged");
  assert(reliability.wsMetadataSchemaChanged === false, "WS metadata schema must remain unchanged");
  assert(reliability.rtspOrWebrtcMediaPathChanged === false, "RTSP/WebRTC media path must remain unchanged");
  assert(reliability.ruleProfilePayloadChanged === false, "Rule/Profile payload must remain unchanged");
  assert(reliability.viewerClientExposureAdded === false, "viewer/client exposure must not be added");
  assert(reliability.sourceUrlExposed === false, "item must not expose source URL");
  assert(reliability.rawJsonExposed === false, "item must not expose raw JSON");
  assert(reliability.debugMaterialExposed === false, "item must not expose debug material");

  const responseText = JSON.stringify(response);
  assert(!responseText.includes("rtsp://internal.example"), "runtime sample leaked source URL fixture text");
  assert(!responseText.includes("fixture-token"), "runtime sample leaked token fixture text");

  console.log("[pass] runtime health reachable");
  console.log("[pass] EventRecord storage enabled");
  console.log("[pass] fixture EventRecord appears in unified resolution workspace");
  console.log("[pass] fixture item contains sourceReliability schema");
  console.log("[pass] sourceReliability reads fixture sourceId");
  console.log("[pass] sourceReliability keeps Ops-only boundary flags");
  console.log("[pass] sourceReliability avoids source URL/raw JSON/debug/client exposure");
  console.log("[pass] sourceReliability runtime response avoids fixture secret text");
  console.log("");
  console.log("== v3.2.0 source reliability runtime sample summary ==");
  console.log(`- eventId: ${fixture.eventId}`);
  console.log(`- sourceId: ${fixture.sourceId}`);
  console.log(`- sourceHealthStatus: ${reliability.sourceHealthStatus}`);
  console.log(`- sourceHealthReason: ${reliability.sourceHealthReason}`);
  console.log(`- recentFailureContext: ${reliability.recentFailureContext}`);
  console.log(`- operatorRecheckRoute: ${reliability.operatorRecheckRoute}`);
  console.log("- sourceRegistryWritePerformed: false");
  console.log("- sourceUrlExposed: false");
  console.log("- rawJsonExposed: false");
  console.log("- debugMaterialExposed: false");
  console.log("- pass: 8");
  console.log("- fail: 0");
} finally {
  cleanupSourceReliabilityEventRecordFixture(fixture);
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
    } else {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        parsed[toCamel(raw)] = next;
        index += 1;
      } else {
        parsed[toCamel(raw)] = "1";
      }
    }
  }
  return parsed;
}

async function requestJson(route) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${httpBase}${route}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const text = await response.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      throw new Error(json.error || `${response.status} ${response.statusText}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function seedSourceReliabilityEventRecordFixture(storageStatus) {
  const activePath = path.resolve(String(storageStatus?.activePath || storageStatus?.path || ".media_server.va_events.jsonl"));
  const snapshotDir = path.resolve(String(storageStatus?.snapshotHook?.directory || ".media_server.va_snapshots"));
  const clipDir = path.resolve(String(storageStatus?.clipHook?.directory || ".media_server.va_clips"));
  const eventId = `v320-source-reliability-runtime-${Date.now()}-${process.pid}`;
  const sourceId = `v320-source-reliability-source-${Date.now()}-${process.pid}`;
  const eventSnapshot = snapshotFile(activePath);
  fs.mkdirSync(path.dirname(activePath), { recursive: true });
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });

  const snapshotPath = path.join(snapshotDir, `${eventId}.ppm`);
  const clipBundleDir = path.join(clipDir, `${eventId}.clip`);
  fs.mkdirSync(clipBundleDir, { recursive: true });
  const framePath = path.join(clipBundleDir, "frame-000001.ppm");
  const clipPath = path.join(clipBundleDir, "manifest.json");
  fs.writeFileSync(snapshotPath, "P3\n2 1\n255\n255 0 0 0 0 255\n", "utf8");
  fs.writeFileSync(framePath, "P3\n2 1\n255\n0 255 0 255 255 0\n", "utf8");
  fs.writeFileSync(clipPath, JSON.stringify({
    schema: "media-server.va.event-clip-hook.v1",
    eventId,
    frames: [{ file: path.basename(framePath), relativeTimeMs: 0 }],
  }, null, 2), "utf8");

  const now = Date.now();
  const record = {
    schema: "media-server.va.event-record.v1",
    eventId,
    eventType: "intrusion-dwell",
    sourceId,
    streamId: sourceId,
    channelId: "v320-source-reliability-channel",
    trackId: 42,
    classId: 0,
    className: "person",
    startTime: now - 3000,
    updateTime: now,
    endTime: 0,
    status: "active",
    zoneId: "zone-a",
    lineId: "",
    scenarioName: "침입 후 체류",
    scenarioPhase: "dwell",
    confidence: 0.92,
    snapshotPath,
    clipPath,
    metadata: {
      schema: "media-server.va.event-record.metadata.v1",
      fixture: "v320-source-reliability-runtime-sample",
    },
  };

  const previous = eventSnapshot.existed ? eventSnapshot.content : Buffer.alloc(0);
  fs.writeFileSync(activePath, Buffer.concat([Buffer.from(`${JSON.stringify(record)}\n`, "utf8"), previous]));
  fs.chmodSync(activePath, eventSnapshot.existed ? eventSnapshot.mode : 0o600);
  return { eventId, sourceId, activePath, snapshotPath, clipBundleDir, eventSnapshot };
}

function cleanupSourceReliabilityEventRecordFixture(fixture) {
  if (!fixture) return;
  restoreFileSnapshot(fixture.eventSnapshot);
  fs.rmSync(fixture.snapshotPath, { force: true });
  fs.rmSync(fixture.clipBundleDir, { recursive: true, force: true });
}

function snapshotFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { filePath, existed: false, content: Buffer.alloc(0), mode: 0o600 };
  }
  const stat = fs.statSync(filePath);
  return {
    filePath,
    existed: true,
    content: fs.readFileSync(filePath),
    mode: stat.mode & 0o777,
  };
}

function restoreFileSnapshot(snapshot) {
  if (!snapshot?.filePath) return;
  if (snapshot.existed) {
    fs.writeFileSync(snapshot.filePath, snapshot.content);
    fs.chmodSync(snapshot.filePath, snapshot.mode || 0o600);
    return;
  }
  fs.rmSync(snapshot.filePath, { force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
}
