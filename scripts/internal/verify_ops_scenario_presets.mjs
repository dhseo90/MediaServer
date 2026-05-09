#!/usr/bin/env node
// 파일 용도: 현장형 VA 시나리오 preset UI 노출과 이벤트 템플릿 threshold round-trip을 검증한다.

import process from "node:process";

import { nextNumericIds } from "./numeric_id_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops scenario preset smoke

Usage:
  ./server.sh verify-ops-scenario-presets [options]

Options:
  --http-base <url>  실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["http-base", "h", "help"]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");

const rulesHtml = await requestText("/ops/rules");
for (const needle of [
  'id="opsEventRulePresetSelect"',
  '<option value="road">도로</option>',
  '<option value="park">공원</option>',
  '<option value="indoor">실내</option>',
  '<option value="lobby">로비</option>',
  '<option value="platform">승강장</option>',
  '<option value="entrance">출입구</option>',
]) {
  if (!rulesHtml.includes(needle)) {
    throw new Error(`scenario preset UI missing: ${needle}`);
  }
}
console.log("[pass] scenario-preset-ui");

const catalog = await requestJson("/ops/api/rules/catalog");
const usedIds = new Set((Array.isArray(catalog.rules) ? catalog.rules : []).map(item => String(item?.id || "")));
const ids = nextNumericIds(usedIds, { count: 4, start: 9911, end: 9999, label: "scenario preset id" });
const fixtures = [
  {
    id: ids[0],
    name: "park loitering",
    payload: {
      id: ids[0],
      enabled: true,
      ruleKind: "scenario",
      analysis: { classes: ["person"] },
      event: {
        type: "loitering",
        region: polygonRegion(),
        minConfidence: 0.3,
        minDurationMs: 0,
      },
      scenario: {
        type: "loitering",
        presetId: "park",
        enabled: true,
        minDwellTimeMs: 60000,
        maxMovementRadius: 0.1,
        minTrajectoryPoints: 5,
        cooldownMs: 30000,
        targetClasses: ["person"],
      },
    },
    checks: {
      "scenario.presetId": "park",
      "scenario.minDwellTimeMs": 60000,
      "scenario.maxMovementRadius": 0.1,
      "scenario.minTrajectoryPoints": 5,
      "scenario.cooldownMs": 30000,
    },
  },
  {
    id: ids[1],
    name: "platform occupancy",
    payload: {
      id: ids[1],
      enabled: true,
      ruleKind: "scenario",
      analysis: { classes: ["person"] },
      event: {
        type: "zone-occupancy",
        region: polygonRegion(),
        minConfidence: 0.35,
        minDurationMs: 0,
      },
      scenario: {
        type: "zone-occupancy",
        presetId: "platform",
        enabled: true,
        occupancyThreshold: 8,
        minDwellTimeMs: 8000,
        cooldownMs: 15000,
        targetClasses: ["person"],
      },
    },
    checks: {
      "scenario.presetId": "platform",
      "scenario.occupancyThreshold": 8,
      "scenario.minDwellTimeMs": 8000,
      "scenario.cooldownMs": 15000,
    },
  },
  {
    id: ids[2],
    name: "road line crossing",
    payload: {
      id: ids[2],
      enabled: true,
      ruleKind: "basic",
      analysis: { classes: ["person", "vehicle"] },
      event: {
        type: "line-crossing",
        region: {
          type: "line",
          direction: "forward",
          points: [{ x: 0.22, y: 0.5 }, { x: 0.82, y: 0.5 }],
        },
        minConfidence: 0.35,
        minDurationMs: 0,
      },
    },
    checks: {
      "event.type": "line-crossing",
      "event.region.direction": "forward",
      "event.minConfidence": 0.35,
      "event.minDurationMs": 0,
    },
  },
  {
    id: ids[3],
    name: "platform intrusion after line",
    payload: {
      id: ids[3],
      enabled: true,
      ruleKind: "scenario",
      analysis: { classes: ["person"] },
      event: {
        type: "intrusion-after-line-crossing",
        region: polygonRegion(),
        minConfidence: 0.35,
        minDurationMs: 0,
      },
      scenario: {
        type: "intrusion-after-line-crossing",
        presetId: "platform",
        enabled: true,
        maxDelayAfterCrossingMs: 5000,
        dwellTimeMs: 1000,
        cooldownMs: 10000,
        triggerLine: {
          id: "line-1",
          direction: "forward",
          points: [{ x: 0.22, y: 0.5 }, { x: 0.82, y: 0.5 }],
        },
      },
    },
    checks: {
      "scenario.presetId": "platform",
      "scenario.maxDelayAfterCrossingMs": 5000,
      "scenario.dwellTimeMs": 1000,
      "scenario.cooldownMs": 10000,
      "scenario.triggerLine.direction": "forward",
    },
  },
];

const created = [];
try {
  for (const fixture of fixtures) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(fixture.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fixture.payload),
    });
    created.push(fixture.id);
    const readback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(fixture.id)}`);
    for (const [path, expected] of Object.entries(fixture.checks)) {
      const actual = getPath(readback.rule, path);
      if (actual !== expected) {
        throw new Error(`${fixture.name} ${path} mismatch: ${actual} !== ${expected}`);
      }
    }
    console.log(`[pass] scenario-preset ${fixture.name}`);
  }
  console.log("[pass] ops-scenario-presets");
} finally {
  for (const id of created.reverse()) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
}

function polygonRegion() {
  return {
    type: "polygon",
    points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }],
  };
}

function getPath(value, path) {
  return String(path).split(".").reduce((current, key) => current?.[key], value);
}

async function requestText(path, options = {}) {
  const response = await fetch(`${httpBase}${path}`, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} failed HTTP ${response.status}: ${text.slice(0, 160)}`);
  }
  return text;
}

async function requestJson(path, options = {}) {
  const text = await requestText(path, options);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${path} returned non-JSON: ${text.slice(0, 160)}`);
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
