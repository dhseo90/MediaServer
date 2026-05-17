#!/usr/bin/env node
// 파일 용도: Ops 룰 이벤트 템플릿의 저장/조회 round-trip을 영상 재생 없이 빠르게 검증한다.

import process from "node:process";

import { nextNumericIds } from "./numeric_id_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops rules round-trip smoke

Usage:
  ./server.sh verify-ops-rules-roundtrip [options]

Options:
  --http-base <url>  실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["http-base", "h", "help"]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");

const catalog = await requestJson("/ops/api/rules/catalog");
const usedIds = new Set([
  ...(Array.isArray(catalog.rules) ? catalog.rules : []).map((item) => String(item?.id || "")),
  ...(Array.isArray(catalog.vaRules) ? catalog.vaRules : []).map((item) => String(item?.id || "")),
]);
const ids = nextNumericIds(usedIds, { count: 4, start: 9801, end: 9999, label: "ops rules roundtrip id" });

const fixtures = [
  {
    id: ids[0],
    enabled: true,
    ruleKind: "basic",
    analysis: {
      classes: ["person", "vehicle"],
      trackingPolicy: { tracker: "none", reid: "off" },
    },
    event: {
      type: "line-crossing",
      region: {
        type: "line",
        direction: "reverse",
        points: [{ x: 0.22, y: 0.44 }, { x: 0.78, y: 0.46 }],
      },
      minConfidence: 0.42,
      minDurationMs: 1200,
    },
  },
  {
    id: ids[1],
    enabled: true,
    ruleKind: "scenario",
    analysis: { classes: ["person"] },
    event: {
      type: "re-entry",
      region: {
        type: "polygon",
        points: [{ x: 0.18, y: 0.2 }, { x: 0.82, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.18, y: 0.78 }],
      },
      minConfidence: 0.33,
      minDurationMs: 0,
    },
    scenario: {
      type: "re-entry",
      enabled: true,
      reEntryWindowMs: 17000,
      reEntryMode: "configured-zones",
      reEntryZoneIds: ["zone-a"],
      cooldownMs: 9000,
      targetClasses: ["person"],
    },
  },
  {
    id: ids[2],
    enabled: true,
    ruleKind: "scenario",
    analysis: {
      classes: ["person", "vehicle"],
      trackingPolicy: { tracker: "kalman-lite", reid: "off" },
    },
    event: {
      type: "intrusion-after-line-crossing",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.18 }, { x: 0.84, y: 0.18 }, { x: 0.82, y: 0.82 }, { x: 0.22, y: 0.82 }],
      },
      minConfidence: 0.37,
      minDurationMs: 500,
    },
    scenario: {
      type: "intrusion-after-line-crossing",
      enabled: true,
      maxDelayAfterCrossingMs: 13000,
      dwellTimeMs: 4500,
      cooldownMs: 11000,
      targetZoneIds: ["zone-b"],
      triggerLine: {
        id: "line-b",
        direction: "forward",
        points: [{ x: 0.24, y: 0.52 }, { x: 0.76, y: 0.52 }],
      },
    },
  },
];

const created = [];
try {
  for (const payload of fixtures) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    created.push(payload.id);
    const readback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`);
    assertRuleRoundTrip(payload, readback.rule);
    console.log(`[pass] roundtrip ${payload.id}: ${payload.event.type}`);
  }
  await assertRequestFails(`/lab/analysis/rules/${encodeURIComponent(ids[3])}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: ids[3],
      enabled: true,
      ruleKind: "basic",
      analysis: {
        classes: ["person"],
        trackingPolicy: { tracker: "none", reid: "assist" },
      },
      event: { type: "presence", region: fixtures[0].event.region },
    }),
  }, "reid must be off when tracker is none");
  console.log("[pass] trackingPolicy validation rejects tracker=none + reid=assist");
  console.log("[pass] ops-rules-roundtrip");
} finally {
  for (const id of created.reverse()) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
}

async function assertRequestFails(path, options, expectedSnippet) {
  const response = await fetch(`${httpBase}${path}`, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text };
  }
  if (response.ok) {
    throw new Error(`${path} unexpectedly succeeded`);
  }
  const message = String(payload?.error || text || "");
  if (!message.includes(expectedSnippet)) {
    throw new Error(`${path} failed with unexpected message: ${message}`);
  }
}

function assertRuleRoundTrip(expected, actual) {
  if (!actual || typeof actual !== "object") {
    throw new Error(`missing readback for ${expected.id}`);
  }
  assertEqual(actual.id, expected.id, "id");
  assertEqual(actual.ruleKind, expected.ruleKind, "ruleKind");
  assertEqual(actual.event?.type, expected.event.type, "event.type");
  assertEqual(actual.event?.region?.type, expected.event.region.type, "event.region.type");
  assertEqual(actual.analysis?.classes, expected.analysis.classes, "analysis.classes");
  if (expected.analysis?.trackingPolicy) {
    assertEqual(actual.analysis?.trackingPolicy?.tracker, expected.analysis.trackingPolicy.tracker, "analysis.trackingPolicy.tracker");
    assertEqual(actual.analysis?.trackingPolicy?.reid, expected.analysis.trackingPolicy.reid, "analysis.trackingPolicy.reid");
  } else if (actual.analysis?.trackingPolicy !== undefined) {
    throw new Error(`rule ${expected.id} unexpectedly read back trackingPolicy`);
  }
  if (expected.scenario) {
    assertEqual(actual.scenario?.type, expected.scenario.type, "scenario.type");
    for (const key of ["reEntryWindowMs", "reEntryMode", "maxDelayAfterCrossingMs", "dwellTimeMs", "cooldownMs"]) {
      if (expected.scenario[key] !== undefined) {
        assertEqual(actual.scenario?.[key], expected.scenario[key], `scenario.${key}`);
      }
    }
    if (expected.scenario.triggerLine) {
      assertEqual(actual.scenario?.triggerLine?.direction, expected.scenario.triggerLine.direction, "scenario.triggerLine.direction");
    }
  } else if (actual.scenario !== undefined) {
    throw new Error(`basic event ${expected.id} unexpectedly read back scenario`);
  }
}

function assertEqual(actual, expected, label) {
  if (Array.isArray(expected)) {
    const actualJson = JSON.stringify(actual || []);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
      throw new Error(`${label} mismatch: ${actualJson} !== ${expectedJson}`);
    }
    return;
  }
  if (actual !== expected) {
    throw new Error(`${label} mismatch: ${actual} !== ${expected}`);
  }
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
