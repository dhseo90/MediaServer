#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: EventRecord가 장기 녹화가 아닌 짧은 증거 기록 범위로 노출되고, /ops/events UI가 그 계약을 표시하는지 검증한다.

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops EventRecord scope smoke

Usage:
  ./server.sh verify-ops-event-records-scope [options]

Options:
  --http-base <url>     실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>     브라우저 대기 시간입니다. 기본 10000.
  --chrome-path <path>  Chrome/Chromium 실행 파일 경로입니다.
  --visual-width <px>   viewport 폭입니다. 기본 390.
  --visual-height <px>  viewport 높이입니다. 기본 900.
  --debug-port <port>   Chrome CDP port입니다. 기본 9910.
  --output-dir <path>   screenshot/log 출력 디렉터리입니다.
  --event-history-dir <path>
                        manual UI fulltest seed/event run directory를 읽어
                        registry rule별 EventRecord 발생 이력을 대조합니다.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "visual-width",
  "visual-height",
  "debug-port",
  "output-dir",
  "event-history-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const chromePath = args.chromePath || findChrome();
const visualWidth = Number(args.visualWidth || 390);
const visualHeight = Number(args.visualHeight || 900);
const debugPort = Number(args.debugPort || 9910);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_event_records_${Date.now()}_${process.pid}`);
const eventHistoryDir = args.eventHistoryDir ? resolvePath(args.eventHistoryDir) : "";
fs.mkdirSync(outputDir, { recursive: true });

const opsEventsHtml = await requestText("/ops/events");
const opsEventsControls = [
  'data-testid="ops-events-page"',
  'id="eventEvidencePolicyBadges"',
  'id="eventExportPolicyBadges"',
  'id="eventExportPolicyText"',
  'id="eventRecordsEvidenceSelect"',
  'id="eventRecordsIncludeArchives"',
  'id="eventRecordsPrev"',
  'id="eventRecordsNext"',
  'class="ops-data-table event-record-table"',
];
assertContains("ops-events-html", opsEventsHtml, opsEventsControls);
for (const control of opsEventsControls) {
  console.log(`[pass] ops-events html contains ${control}`);
}

const storageStatus = await requestJson("/lab/analysis/event-storage/status");
const eventPostStatus = await requestJson("/lab/analysis/events/post/status");
if (!Number.isFinite(Number(eventPostStatus?.failedCount))) {
  throw new Error("event POST status failedCount readback missing");
}
if (!Number.isFinite(Number(storageStatus?.skippedCorruptLines))) {
  throw new Error("event storage skippedCorruptLines readback missing");
}
const serverSource = readWebRtcHttpServerBundle(file => fs.readFileSync(file, "utf8"));
assertContains("evidence-resolved-path-source", serverSource, ["*resolved_path = resolved;"]);
assertEvidencePolicy("lab-storage-status", storageStatus.evidencePolicy);
if (storageStatus.enabled !== true) {
  throw new Error("event storage must be enabled for populated ops-events fixture smoke");
}
console.log("[pass] lab event-storage status is enabled");
const auditSnapshot = snapshotFile(path.resolve(".media_server.ops_audit.jsonl"));
const fixture = seedPopulatedEventRecordFixture(storageStatus);
try {
  await verifyEvidenceBundleDownload(storageStatus);
  await verifyEventRecordCompactionLifecycle(fixture);

  const populatedRecords = await requestJson("/lab/analysis/events/records?limit=5&evidence=any&includeArchives=1");
  assertRecordList("lab-records-evidence-any", populatedRecords);
  console.log("[pass] lab event-records evidence-any schema is event-record-list");
  console.log("[pass] lab event-records evidence-any records is array");
  console.log("[pass] lab event-records evidence-any includes storage summary");
  assertRecordListContains("lab-records-evidence-any", populatedRecords, fixture.eventId);
  console.log("[pass] lab event-records evidence-any includes populated fixture event");

  const records = await requestJson("/lab/analysis/events/records?limit=5&evidence=missing&includeArchives=1");
  assertRecordList("lab-records-evidence-missing", records);
  console.log("[pass] lab event-records evidence-missing schema is event-record-list");
  console.log("[pass] lab event-records evidence-missing records is array");
  console.log("[pass] lab event-records evidence-missing includes storage summary");

  const opsStatus = await requestJson("/ops/api/events/status?limit=5&evidence=any&includeArchives=1");
  if (opsStatus?.status !== "ops-events") {
    throw new Error(`ops events status mismatch: ${JSON.stringify(opsStatus).slice(0, 160)}`);
  }
  if (opsStatus?.records?.schema !== "media-server.va.event-record-list.v1") throw new Error(`/ops/events EventRecord schema mismatch: ${opsStatus?.records?.schema || "(missing)"}`);
  console.log("[pass] ops events API status is ops-events");
  assertEvidencePolicy("ops-events-status", opsStatus?.storage?.evidencePolicy);
  assertRecordList("ops-events-records", opsStatus?.records);
  console.log("[pass] ops events API records schema is event-record-list");
  console.log("[pass] ops events API records is array");
  console.log("[pass] ops events API records includes storage summary");
  assertRecordListContains("ops-events-records", opsStatus?.records, fixture.eventId);
  console.log("[pass] ops events API records include populated fixture event");

  await expectHttpError(
    "/lab/analysis/events/records?evidence=video",
    400,
    "evidence must be snapshot, clip, any, both, or missing",
  );
  console.log("[pass] invalid evidence query rejected");

  await verifyBrowserUi(fixture);
  if (eventHistoryDir) {
    verifyEventHistoryCoverage(eventHistoryDir);
  }
  console.log("[summary] ops-event-records-scope complete");
} finally {
  cleanupPopulatedEventRecordFixture(fixture);
  restoreFileSnapshot(auditSnapshot);
}

async function verifyEventRecordCompactionLifecycle(fixture) {
  const compacted = await requestJsonWithInit(
    `/lab/analysis/events/records/compact?eventId=${encodeURIComponent(fixture.eventId)}&limit=10`,
    { method: "POST" },
  );
  if (compacted?.schema !== "media-server.va.event-record-compaction.v1" ||
      !compacted?.fileName || Number(compacted?.recordCount || 0) < 1) {
    throw new Error(`EVT compaction observed response mismatch: ${JSON.stringify(compacted).slice(0, 320)}`);
  }
  const fileName = String(compacted.fileName);
  const compacted_path = fileName;
  const listed = await requestJson("/lab/analysis/events/records/compactions");
  if (listed?.schema !== "media-server.va.event-record-compacted-list.v1" ||
      !Array.isArray(listed?.files) || !listed.files.some(item => item?.fileName === compacted_path)) {
    throw new Error(`EVT compaction list observed file mismatch: ${JSON.stringify(listed).slice(0, 320)}`);
  }
  const fetched = await requestText(`/lab/analysis/events/records/compactions/${encodeURIComponent(fileName)}`);
  if (!fetched.split(/\r?\n/).some(line => line.includes(fixture.eventId))) {
    throw new Error(`EVT compacted artifact observed EventRecord mismatch: ${fileName}`);
  }
  const deleted = await requestJsonWithInit(
    `/lab/analysis/events/records/compactions/${encodeURIComponent(fileName)}`,
    { method: "DELETE" },
  );
  if (deleted?.schema !== "media-server.va.event-record-compacted-delete.v1" ||
      deleted?.fileName !== fileName || deleted?.deleted !== true) {
    throw new Error(`EVT compaction delete observed response mismatch: ${JSON.stringify(deleted).slice(0, 320)}`);
  }
  const deletedReadback = await requestJson("/lab/analysis/events/records/compactions");
  if (deletedReadback.files.some(item => item?.fileName === fileName)) {
    throw new Error(`EVT compacted artifact deleted readback still listed: ${fileName}`);
  }
}

async function verifyBrowserUi(fixture) {
  const browser = await openBrowserPage({
    httpBase,
    pagePath: "/ops/events",
    timeoutMs,
    chromePath,
    debugPort,
    width: visualWidth,
    height: visualHeight,
    outputDir,
  });
  try {
    const initial = await browser.evaluate(
      `
        (async () => {
          const waitFor = async (predicate, label) => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < ${JSON.stringify(timeoutMs)}) {
              if (predicate()) return true;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error(label + ' timeout');
          };
    const selectors = [
            '#eventEvidencePolicyBadges',
            '#eventEvidencePolicyText',
            '#eventExportPolicyBadges',
            '#eventExportPolicyText',
            '#eventRecordsEvidenceSelect',
            '#eventRecordsIncludeArchives',
            '#eventRecordsPrev',
            '#eventRecordsNext',
            '#eventRecordRows',
            '.event-record-table',
          ];
          const missing = selectors.filter(selector => !document.querySelector(selector));
          await waitFor(() => {
            const text = document.querySelector('#eventEvidencePolicyText')?.textContent || '';
            return text.includes('event-short-evidence') || text.includes('frame-bundle');
          }, 'evidence policy text');
          await waitFor(() => {
            const text = document.querySelector('#eventRecordRows')?.textContent || '';
            return text.includes(${JSON.stringify(fixture.eventId)});
          }, 'populated event record row');
          const rowText = document.querySelector('#eventRecordRows')?.textContent || '';
          const doc = document.documentElement;
          const body = document.body;
          const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
          return {
            ok: missing.length === 0 &&
              overflowX <= 2 &&
              rowText.includes(${JSON.stringify(fixture.eventId)}) &&
              rowText.includes('snapshot') &&
              rowText.includes('clip') &&
              rowText.includes('signed bundle zip'),
            missing,
            overflowX,
            rowText: rowText.slice(0, 600),
            viewport: { width: window.innerWidth, height: window.innerHeight },
          };
        })()
      `,
      timeoutMs + 5000,
    );
    if (!initial?.ok) {
      throw new Error(`browser populated UI check failed: ${JSON.stringify(initial)}`);
    }
    for (const selector of [
      "#eventEvidencePolicyBadges",
      "#eventEvidencePolicyText",
      "#eventExportPolicyBadges",
      "#eventExportPolicyText",
      "#eventRecordsEvidenceSelect",
      "#eventRecordsIncludeArchives",
      "#eventRecordsPrev",
      "#eventRecordsNext",
      "#eventRecordRows",
      ".event-record-table",
    ]) {
      console.log(`[pass] browser ops-events contains selector ${selector}`);
    }
    console.log("[pass] browser ops-events evidence policy text shows short evidence scope");
    console.log("[pass] browser ops-events row contains populated fixture eventId");
    console.log("[pass] browser ops-events row contains snapshot evidence label");
    console.log("[pass] browser ops-events row contains clip evidence label");
    console.log("[pass] browser ops-events row contains signed bundle zip label");
    console.log(`[pass] browser ops-events populated viewport overflowX=${initial.overflowX}`);
    const screenshotPath = path.join(outputDir, `ops-events-populated-${visualWidth}.png`);
    await browser.screenshot(screenshotPath);
    console.log(`[pass] browser ops-events populated screenshot written ${screenshotPath}`);

    const actionResult = await browser.evaluate(
      `
        (async () => {
          const button = Array.from(document.querySelectorAll('#eventRecordRows [data-evidence-bundle]'))
            .find(item => !item.disabled && item.textContent.includes('signed bundle'));
          if (!button) return { ok: false, reason: 'missing evidence bundle button' };
          const originalFetch = window.fetch.bind(window);
          window.__opsEventBundleFetches = [];
          window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            const url = String(args[0]?.url || args[0] || '');
            if (url.includes('/lab/analysis/events/evidence/bundle-token')) {
              window.__opsEventBundleFetches.push({ url, ok: response.ok, status: response.status });
            }
            return response;
          };
          button.click();
          const startedAt = Date.now();
          while (Date.now() - startedAt < ${JSON.stringify(timeoutMs)}) {
            const fetches = window.__opsEventBundleFetches || [];
            const summary = document.querySelector('#eventRecordSummary')?.textContent || '';
            if (summary.includes('bundle token 발급 실패')) {
              return { ok: false, reason: summary, fetches };
            }
            if (fetches.length > 0) {
              return { ok: fetches.some(item => item.ok && item.status === 200), fetches, summary };
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          return { ok: false, reason: 'bundle token fetch timeout', fetches: window.__opsEventBundleFetches || [] };
        })()
      `,
      timeoutMs + 5000,
    );
    if (!actionResult?.ok) {
      throw new Error(`browser evidence bundle action failed: ${JSON.stringify(actionResult)}`);
    }
    console.log("[pass] browser ops-events signed bundle action requests bundle token");

    const result = await browser.evaluate(
      `
        (async () => {
          const waitFor = async (predicate, label) => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < ${JSON.stringify(timeoutMs)}) {
              if (predicate()) return true;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error(label + ' timeout');
          };
          const select = document.querySelector('#eventRecordsEvidenceSelect');
          select.click();
          select.value = 'missing';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          await waitFor(() => (document.querySelector('#eventRecordSummary')?.textContent || '').includes('evidence missing'), 'evidence filter refresh');
          const includeArchives = document.querySelector('#eventRecordsIncludeArchives');
          includeArchives.click();
          await waitFor(() => includeArchives.checked === true, 'archive checkbox click');
          const prevButton = document.querySelector('#eventRecordsPrev');
          prevButton.click();
          const nextButton = document.querySelector('#eventRecordsNext');
          nextButton.click();
          const doc = document.documentElement;
          const body = document.body;
          const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
          const rows = document.querySelector('#eventRecordRows')?.children.length || 0;
          return {
            ok: overflowX <= 2 && rows > 0 && select.value === 'missing',
            overflowX,
            rows,
            evidence: select.value,
            archiveChecked: includeArchives.checked,
            summary: document.querySelector('#eventRecordSummary')?.textContent || '',
            viewport: { width: window.innerWidth, height: window.innerHeight },
          };
        })()
      `,
      timeoutMs + 5000,
    );
    if (!result?.ok) {
      throw new Error(`browser UI check failed: ${JSON.stringify(result)}`);
    }
    console.log("[pass] browser ops-events evidence filter selects missing");
    console.log("[pass] browser ops-events archive checkbox toggles on");
    console.log("[pass] browser ops-events prev button click completes");
    console.log("[pass] browser ops-events next button click completes");
    console.log(`[pass] browser ops-events filtered row count ${result.rows}`);
    console.log(`[pass] browser ops-events controls viewport width=${visualWidth}`);
    console.log(`[pass] browser ops-events controls overflowX=${result.overflowX}`);
  } finally {
    await browser.close();
  }
}

function seedPopulatedEventRecordFixture(storageStatus) {
  const activePath = path.resolve(String(storageStatus?.activePath || storageStatus?.path || ".media_server.va_events.jsonl"));
  const snapshotDir = path.resolve(String(storageStatus?.snapshotHook?.directory || ".media_server.va_snapshots"));
  const clipDir = path.resolve(String(storageStatus?.clipHook?.directory || ".media_server.va_clips"));
  const eventId = `ops-events-populated-${Date.now()}-${process.pid}`;
  const eventSnapshot = snapshotFile(activePath);
  fs.mkdirSync(path.dirname(activePath), { recursive: true });
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });
  const snapshotPath = path.join(snapshotDir, `${eventId}.ppm`);
  const clipBundleDir = path.join(clipDir, `${eventId}.clip`);
  fs.mkdirSync(clipBundleDir, { recursive: true });
  const clipPath = path.join(clipBundleDir, "manifest.json");
  const framePath = path.join(clipBundleDir, "frame-000001.ppm");
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
    streamId: "ops-events-fixture-stream",
    channelId: "ops-events-fixture-channel",
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
    preEventMs: 200,
    postEventMs: 0,
    metadata: {
      schema: "media-server.va.event-record.metadata.v1",
      fixture: "ops-events-populated-screenshot",
    },
  };
  const line = `${JSON.stringify(record)}\n`;
  const previous = eventSnapshot.existed ? eventSnapshot.content : Buffer.alloc(0);
  fs.writeFileSync(activePath, Buffer.concat([Buffer.from(line, "utf8"), previous]));
  fs.chmodSync(activePath, eventSnapshot.existed ? eventSnapshot.mode : 0o600);
  return {
    eventId,
    activePath,
    snapshotPath,
    clipBundleDir,
    eventSnapshot,
  };
}

function cleanupPopulatedEventRecordFixture(fixture) {
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

function assertEvidencePolicy(label, policy) {
  if (!policy || typeof policy !== "object") {
    throw new Error(`${label}: missing evidencePolicy`);
  }
  const expected = {
    scope: "event-short-evidence",
    longRecording: false,
    videoArchive: false,
    clipFormat: "frame-bundle",
    compactionDestructive: false,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (policy[key] !== value) {
      throw new Error(`${label}: evidencePolicy.${key} expected ${JSON.stringify(value)} got ${JSON.stringify(policy[key])}`);
    }
    console.log(`[pass] ${label} evidencePolicy.${key} is ${JSON.stringify(value)}`);
  }
  if (!Array.isArray(policy.snapshotFormats) || !policy.snapshotFormats.includes("jpg") || !policy.snapshotFormats.includes("ppm")) {
    throw new Error(`${label}: evidencePolicy.snapshotFormats missing jpg/ppm`);
  }
  console.log(`[pass] ${label} evidencePolicy.snapshotFormats includes jpg`);
  console.log(`[pass] ${label} evidencePolicy.snapshotFormats includes ppm`);
  const exportPolicy = policy.exportPolicy || {};
  if (exportPolicy.snapshotDownload !== true ||
      exportPolicy.clipManifestDownload !== true ||
      exportPolicy.bundleArchiveDownload !== true ||
      exportPolicy.bundleFormat !== "zip" ||
      exportPolicy.bundleMaxAgeMs !== 86400000 ||
      exportPolicy.bundleSignedToken !== true ||
      exportPolicy.bundleTokenParam !== "token" ||
      exportPolicy.bundleTokenIssuer !== "/lab/analysis/events/evidence/bundle-token" ||
      exportPolicy.auditAction !== "export-bundle" ||
      exportPolicy.exportAudit !== true ||
      exportPolicy.longVideoExport !== false) {
    throw new Error(`${label}: exportPolicy mismatch ${JSON.stringify(exportPolicy)}`);
  }
  for (const [key, value] of Object.entries({
    snapshotDownload: true,
    clipManifestDownload: true,
    bundleArchiveDownload: true,
    bundleFormat: "zip",
    bundleMaxAgeMs: 86400000,
    bundleSignedToken: true,
    bundleTokenParam: "token",
    bundleTokenIssuer: "/lab/analysis/events/evidence/bundle-token",
    auditAction: "export-bundle",
    exportAudit: true,
    longVideoExport: false,
  })) {
    console.log(`[pass] ${label} exportPolicy.${key} is ${JSON.stringify(value)}`);
  }
  const retentionPolicy = policy.retentionPolicy || {};
  if (retentionPolicy.activeFileProtected !== true ||
      retentionPolicy.archiveRetention !== "oldest-rotated-only" ||
      retentionPolicy.bundleExpiry !== "signed-token-expiresAtMs" ||
      retentionPolicy.expiredBundleCleanup !== "token-expiry-no-server-file") {
    throw new Error(`${label}: retentionPolicy mismatch ${JSON.stringify(retentionPolicy)}`);
  }
  for (const [key, value] of Object.entries({
    activeFileProtected: true,
    archiveRetention: "oldest-rotated-only",
    bundleExpiry: "signed-token-expiresAtMs",
    expiredBundleCleanup: "token-expiry-no-server-file",
  })) {
    console.log(`[pass] ${label} retentionPolicy.${key} is ${JSON.stringify(value)}`);
  }
  const deletePolicy = policy.deletePolicy || {};
  if (deletePolicy.compactionDelete !== true ||
      deletePolicy.evidenceFileDelete !== false ||
      deletePolicy.evidenceFileDeletePermission !== "blocked-for-all-roles") {
    throw new Error(`${label}: deletePolicy mismatch ${JSON.stringify(deletePolicy)}`);
  }
  for (const [key, value] of Object.entries({
    compactionDelete: true,
    evidenceFileDelete: false,
    evidenceFileDeletePermission: "blocked-for-all-roles",
  })) {
    console.log(`[pass] ${label} deletePolicy.${key} is ${JSON.stringify(value)}`);
  }
}

async function verifyEvidenceBundleDownload(storageStatus) {
  const snapshotDir = path.resolve(String(storageStatus?.snapshotHook?.directory || ".media_server.va_snapshots"));
  const clipDir = path.resolve(String(storageStatus?.clipHook?.directory || ".media_server.va_clips"));
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });
  const eventId = `verify-bundle-${Date.now()}-${process.pid}`;
  const snapshotPath = path.join(snapshotDir, `${eventId}.ppm`);
  const clipBundleDir = path.join(clipDir, `${eventId}.clip`);
  fs.mkdirSync(clipBundleDir, { recursive: true });
  const clipPath = path.join(clipBundleDir, "manifest.json");
  const framePath = path.join(clipBundleDir, "frame-000001.ppm");
  fs.writeFileSync(snapshotPath, "P3\n1 1\n255\n255 0 0\n", "utf8");
  fs.writeFileSync(framePath, "P3\n1 1\n255\n0 255 0\n", "utf8");
  fs.writeFileSync(clipPath, JSON.stringify({
    schema: "media-server.va.event-clip-hook.v1",
    eventId,
    frames: [{ file: path.basename(framePath), relativeTimeMs: 0 }],
  }), "utf8");
  try {
    const params = new URLSearchParams({
      eventId,
      snapshotPath,
      clipPath,
      expiresAtMs: String(Date.now() + 60000),
      download: "1",
    });
    const tokenPayload = await requestJson(`/lab/analysis/events/evidence/bundle-token?${params.toString()}`);
    if (!tokenPayload?.token || !String(tokenPayload?.bundleUrl || "").includes("token=")) {
      throw new Error(`bundle token payload mismatch: ${JSON.stringify(tokenPayload).slice(0, 240)}`);
    }
    console.log("[pass] lab event evidence bundle token payload includes token");
    console.log("[pass] lab event evidence bundle token payload includes signed bundle URL");
    const response = await fetch(`${httpBase}${tokenPayload.bundleUrl}`);
    const body = Buffer.from(await response.arrayBuffer());
    const disposition = response.headers.get("content-disposition") || "";
    if (response.status !== 200) {
      throw new Error(`bundle response status mismatch status=${response.status}`);
    }
    console.log("[pass] lab event evidence bundle download returns HTTP 200");
    if (!String(response.headers.get("content-type") || "").includes("application/zip")) {
      throw new Error(`bundle response content-type mismatch type=${response.headers.get("content-type")}`);
    }
    console.log("[pass] lab event evidence bundle download content-type is application/zip");
    if (!disposition.includes("event-evidence-")) {
      throw new Error(`bundle response disposition mismatch disposition=${disposition}`);
    }
    console.log("[pass] lab event evidence bundle download disposition names event-evidence archive");
    if (body.subarray(0, 2).toString("utf8") !== "PK") {
      throw new Error(`bundle response zip signature mismatch bytes=${body.length}`);
    }
    console.log("[pass] lab event evidence bundle download has ZIP signature");
    if (!body.includes(Buffer.from("manifest.json"))) {
      throw new Error(`bundle response missing manifest.json bytes=${body.length}`);
    }
    console.log("[pass] lab event evidence bundle contains manifest.json");
    if (!body.includes(Buffer.from(path.basename(snapshotPath)))) {
      throw new Error(`bundle response missing snapshot ${path.basename(snapshotPath)} bytes=${body.length}`);
    }
    console.log("[pass] lab event evidence bundle contains snapshot file");
    if (!body.includes(Buffer.from(path.basename(framePath)))) {
      throw new Error(`bundle response missing frame ${path.basename(framePath)} bytes=${body.length}`);
    }
    console.log("[pass] lab event evidence bundle contains clip frame file");

    const releaseSafeParams = new URLSearchParams({
      eventId,
      snapshotPath,
      clipPath,
      expiresAtMs: String(Date.now() + 60000),
      download: "1",
      releaseSafe: "1",
    });
    const releaseSafeToken = await requestJson(`/lab/analysis/events/evidence/bundle-token?${releaseSafeParams.toString()}`);
    if (releaseSafeToken?.releaseSafe !== true || !String(releaseSafeToken?.bundleUrl || "").includes("releaseSafe=1")) {
      throw new Error(`release-safe token payload mismatch: ${JSON.stringify(releaseSafeToken).slice(0, 240)}`);
    }
    const releaseSafeResponse = await fetch(`${httpBase}${releaseSafeToken.bundleUrl}`);
    const releaseSafeBody = Buffer.from(await releaseSafeResponse.arrayBuffer());
    if (releaseSafeResponse.status !== 200) {
      throw new Error(`release-safe bundle response status mismatch status=${releaseSafeResponse.status}`);
    }
    const releaseSafeDisposition = releaseSafeResponse.headers.get("content-disposition") || "";
    if (!releaseSafeDisposition.includes("redacted-incident-evidence-")) {
      throw new Error(`release-safe bundle disposition mismatch disposition=${releaseSafeDisposition}`);
    }
    if (!releaseSafeBody.includes(Buffer.from("media-server.v250.redacted-incident-evidence-bundle.v1")) ||
        !releaseSafeBody.includes(Buffer.from('"rawEvidenceIncluded":false'))) {
      throw new Error("release-safe manifest readback must keep rawEvidenceIncluded=false");
    }
    if (releaseSafeBody.includes(Buffer.from('"rawJson"')) ||
        releaseSafeBody.includes(Buffer.from('"rawLocator"'))) {
      throw new Error("release-safe manifest readback must exclude raw material");
    }
    if (releaseSafeBody.includes(Buffer.from('"sourceUrl"'))) {
      throw new Error("release-safe manifest readback must exclude sourceUrl material");
    }
    if (releaseSafeBody.includes(Buffer.from('"credential"'))) {
      throw new Error("release-safe manifest readback must exclude credential material");
    }
    if (releaseSafeBody.includes(Buffer.from('"debugMaterial"'))) {
      throw new Error("release-safe manifest readback must exclude debug material");
    }
    if (releaseSafeBody.includes(Buffer.from('"providerMaterial"'))) {
      throw new Error("release-safe manifest readback must exclude provider material");
    }
    if (releaseSafeBody.includes(Buffer.from(path.basename(snapshotPath))) ||
        releaseSafeBody.includes(Buffer.from(path.basename(framePath))) ||
        releaseSafeBody.includes(Buffer.from("255 0 0")) ||
        releaseSafeBody.includes(Buffer.from("0 255 0"))) {
      throw new Error("release-safe manifest-only export contains raw snapshot/clip material");
    }
    console.log("[pass] release-safe manifest export readback is redacted and excludes raw evidence files");
    const audit = await requestJson("/ops/api/audit?area=events&limit=5");
    const entries = Array.isArray(audit?.entries) ? audit.entries : [];
    if (!entries.some(item => item?.action === "export-bundle" && String(item?.target || "").includes(eventId))) {
      throw new Error(`missing export-bundle audit entry: ${JSON.stringify(entries).slice(0, 240)}`);
    }
    console.log("[pass] lab event evidence bundle download records export-bundle audit entry");
    const expiredParams = new URLSearchParams({
      eventId,
      snapshotPath,
      expiresAtMs: "1",
      download: "1",
    });
    await expectHttpError(
      `/lab/analysis/events/evidence/bundle?${expiredParams.toString()}`,
      400,
      "evidence bundle link has expired",
    );
    console.log("[pass] lab event evidence bundle rejects expired token");
    const tamperedParams = new URLSearchParams({
      eventId,
      snapshotPath,
      expiresAtMs: String(Date.now() + 60000),
      token: "bad-token",
      download: "1",
    });
    await expectHttpError(
      `/lab/analysis/events/evidence/bundle?${tamperedParams.toString()}`,
      400,
      "evidence bundle token is invalid",
    );
    console.log("[pass] lab event evidence bundle rejects tampered token");
    await expectHttpError(
      `/lab/analysis/events/evidence?path=${encodeURIComponent(snapshotPath)}`,
      403,
      "evidence file deletion is disabled by policy",
      { method: "DELETE" },
    );
    console.log("[pass] lab event evidence file deletion is blocked by policy");
  } finally {
    fs.rmSync(snapshotPath, { force: true });
    fs.rmSync(clipBundleDir, { recursive: true, force: true });
  }
}

function assertRecordList(label, payload) {
  if (payload?.schema !== "media-server.va.event-record-list.v1") {
    throw new Error(`${label}: schema mismatch ${payload?.schema || "(missing)"}`);
  }
  if (!Array.isArray(payload.records)) {
    throw new Error(`${label}: records is not an array`);
  }
  if (!payload.storage || typeof payload.storage !== "object") {
    throw new Error(`${label}: missing storage summary`);
  }
}

function assertRecordListContains(label, payload, eventId) {
  const records = Array.isArray(payload?.records) ? payload.records : [];
  if (!records.some(record => String(record?.eventId || "") === eventId)) {
    throw new Error(`${label}: missing populated fixture eventId=${eventId}`);
  }
}

function assertContains(label, text, needles) {
  const missing = needles.filter(item => !text.includes(item));
  if (missing.length > 0) {
    throw new Error(`${label}: missing ${missing.join(", ")}`);
  }
}

async function expectHttpError(pathname, status, messagePart, init = {}) {
  const response = await fetch(`${httpBase}${pathname}`, init);
  const text = await response.text();
  if (response.status !== status || !text.includes(messagePart)) {
    throw new Error(`${pathname} expected HTTP ${status} with ${messagePart}, got ${response.status}: ${text.slice(0, 160)}`);
  }
}

async function requestText(pathname) {
  const response = await fetch(`${httpBase}${pathname}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${pathname} failed HTTP ${response.status}: ${text.slice(0, 160)}`);
  }
  return text;
}

async function requestJson(pathname) {
  const text = await requestText(pathname);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${pathname} returned non-JSON: ${text.slice(0, 160)}`);
  }
}

async function requestJsonWithInit(pathname, init) {
  const response = await fetch(`${httpBase}${pathname}`, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${pathname} failed HTTP ${response.status}: ${text.slice(0, 160)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${pathname} returned non-JSON: ${text.slice(0, 160)}`);
  }
}

function verifyEventHistoryCoverage(historyDir) {
  const registryPath = path.join(historyDir, "registry", "analysis.json");
  const eventsPath = path.join(historyDir, "events", "va_events.jsonl");
  const pagingPath = path.join(historyDir, "browser", "ops-events-type-paging-more.json");
  const registry = readJsonFile(registryPath);
  const records = readJsonLines(eventsPath);
  const paging = readJsonFile(pagingPath);
  const rules = Array.isArray(registry.rules) ? registry.rules : [];
  if (rules.length === 0) {
    throw new Error(`event history registry has no rules: ${registryPath}`);
  }
  const expectedKeys = [
    "presence",
    "enter",
    "exit",
    "line-crossing:any",
    "line-crossing:forward",
    "line-crossing:reverse",
    "intrusion-dwell",
    "re-entry",
    "wrong-direction",
    "intrusion-after-line-crossing",
    "loitering",
    "zone-occupancy",
  ];
  const coverage = [];
  const keyCounts = new Map();
  for (const rule of rules) {
    if (rule?.enabled === false) continue;
    const type = String(rule?.event?.type || "");
    if (!type) continue;
    const direction = type === "line-crossing"
      ? String(rule?.event?.region?.direction || "any")
      : "";
    const key = direction ? `${type}:${direction}` : type;
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    const ruleId = String(rule.id || "");
    const matched = records.filter(record => eventRecordMatchesRule(record, { ruleId, type }));
    coverage.push({
      ruleId,
      name: String(rule.name || ""),
      type,
      direction,
      key,
      count: matched.length,
      sampleEventId: matched[0]?.eventId || "",
    });
  }
  const missingKeys = expectedKeys.filter(key => !keyCounts.has(key));
  if (missingKeys.length > 0) {
    throw new Error(`event history registry missing expected rule keys: ${missingKeys.join(", ")}`);
  }
  const missingRules = coverage.filter(item => item.count <= 0);
  if (missingRules.length > 0) {
    throw new Error(`event history records missing rule coverage: ${missingRules.map(item => `${item.ruleId}:${item.key}`).join(", ")}`);
  }
  const seenTypes = Array.isArray(paging.seenTypes) ? paging.seenTypes.map(String) : [];
  const expectedTypes = [...new Set(expectedKeys.map(key => key.split(":")[0]))];
  const missingUiTypes = expectedTypes.filter(type => !seenTypes.includes(type));
  if (missingUiTypes.length > 0) {
    throw new Error(`ops-events pagination missing expected types: ${missingUiTypes.join(", ")}`);
  }
  const summary = {
    schema: "media-server.manual-ui-event-history-coverage.v1",
    generatedAt: new Date().toISOString(),
    historyDir,
    registryPath,
    eventsPath,
    pagingPath,
    expectedKeys,
    seenTypes,
    records: records.length,
    coverage,
  };
  const jsonPath = path.join(outputDir, "event-history-coverage.json");
  const mdPath = path.join(outputDir, "event-history-coverage.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(mdPath, buildEventHistoryCoverageMarkdown(summary));
  console.log(`[pass] event history registry covers ${coverage.length} enabled event/scenario rules`);
  console.log(`[pass] event history records cover every registry event/scenario rule`);
  console.log(`[pass] ops-events pagination covers ${expectedTypes.length} event types`);
  console.log(`[pass] event history coverage written ${jsonPath}`);
}

function eventRecordMatchesRule(record, rule) {
  const eventType = String(record?.eventType || record?.type || "");
  if (eventType !== rule.type) return false;
  const ruleId = String(rule.ruleId || "");
  const metadataRuleId = String(record?.metadata?.ruleId || record?.metadata?.eventRuleId || "");
  if (metadataRuleId === ruleId) return true;
  if (metadataRuleId.endsWith(`:${ruleId}`)) return true;
  if (metadataRuleId.includes(`:${ruleId}:`)) return true;
  if (String(record?.zoneId || "") === ruleId) return true;
  if (String(record?.lineId || "") === ruleId) return true;
  const metadata = record?.metadata?.eventMetadata || {};
  if (String(metadata?.zoneId || "") === ruleId) return true;
  if (String(metadata?.lineId || "") === ruleId) return true;
  return false;
}

function buildEventHistoryCoverageMarkdown(summary) {
  const lines = [
    "# Event History Coverage",
    "",
    `- generatedAt: ${summary.generatedAt}`,
    `- historyDir: ${summary.historyDir}`,
    `- records: ${summary.records}`,
    `- seenTypes: ${summary.seenTypes.join(", ")}`,
    "",
    "| Rule | Type | Count | Sample |",
    "| --- | --- | ---: | --- |",
  ];
  for (const item of summary.coverage) {
    lines.push(`| ${item.ruleId} | ${item.key} | ${item.count} | ${item.sampleEventId} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing JSON file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing JSON Lines file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function resolvePath(inputPath) {
  return path.isAbsolute(inputPath) ? path.normalize(inputPath) : path.resolve(inputPath);
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
