#!/usr/bin/env node
// 파일 용도: EventRecord가 장기 녹화가 아닌 짧은 증거 기록 범위로 노출되고, /ops/events UI가 그 계약을 표시하는지 검증한다.

import os from "node:os";
import path from "node:path";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);
const chromePath = args.chromePath || findChrome();
const visualWidth = Number(args.visualWidth || 390);
const visualHeight = Number(args.visualHeight || 900);
const debugPort = Number(args.debugPort || 9910);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_event_records_${Date.now()}_${process.pid}`);

const opsEventsHtml = await requestText("/ops/events");
assertContains("ops-events-html", opsEventsHtml, [
  'data-testid="ops-events-page"',
  'id="eventEvidencePolicyBadges"',
  'id="eventRecordsEvidenceSelect"',
  'id="eventRecordsIncludeArchives"',
  'id="eventRecordsPrev"',
  'id="eventRecordsNext"',
  'class="ops-data-table event-record-table"',
]);
console.log("[pass] ops-events evidence controls rendered");

const storageStatus = await requestJson("/lab/analysis/event-storage/status");
assertEvidencePolicy("lab-storage-status", storageStatus.evidencePolicy);
console.log("[pass] lab event-storage evidence policy");

const records = await requestJson("/lab/analysis/events/records?limit=5&evidence=missing&includeArchives=1");
assertRecordList("lab-records-evidence-missing", records);
console.log("[pass] lab event-records evidence filter");

const opsStatus = await requestJson("/ops/api/events/status?limit=5&evidence=any&includeArchives=1");
if (opsStatus?.status !== "ops-events") {
  throw new Error(`ops events status mismatch: ${JSON.stringify(opsStatus).slice(0, 160)}`);
}
assertEvidencePolicy("ops-events-status", opsStatus?.storage?.evidencePolicy);
assertRecordList("ops-events-records", opsStatus?.records);
console.log("[pass] ops events API includes evidence policy");

await expectHttpError(
  "/lab/analysis/events/records?evidence=video",
  400,
  "evidence must be snapshot, clip, any, both, or missing",
);
console.log("[pass] invalid evidence query rejected");

await verifyBrowserUi();
console.log("[pass] ops-event-records-scope");

async function verifyBrowserUi() {
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
          const selectors = [
            '#eventEvidencePolicyBadges',
            '#eventEvidencePolicyText',
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
            ok: missing.length === 0 && overflowX <= 2 && rows > 0 && select.value === 'missing',
            missing,
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
    console.log(`[pass] browser ops-events controls width=${visualWidth} overflow=${result.overflowX}`);
  } finally {
    await browser.close();
  }
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
  }
  if (!Array.isArray(policy.snapshotFormats) || !policy.snapshotFormats.includes("jpg") || !policy.snapshotFormats.includes("ppm")) {
    throw new Error(`${label}: evidencePolicy.snapshotFormats missing jpg/ppm`);
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

function assertContains(label, text, needles) {
  const missing = needles.filter(item => !text.includes(item));
  if (missing.length > 0) {
    throw new Error(`${label}: missing ${missing.join(", ")}`);
  }
}

async function expectHttpError(pathname, status, messagePart) {
  const response = await fetch(`${httpBase}${pathname}`);
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
