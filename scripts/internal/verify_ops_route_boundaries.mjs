#!/usr/bin/env node
// 파일 용도: Ops/Client 제품 route와 Lab analysis API 경계를 검증한다.

import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops/Client route boundary smoke

Usage:
  ./server.sh verify-ops-route-boundaries [options]

Options:
  --http-base <url>  실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>  HTTP 대기 시간입니다. 기본 10000.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["http-base", "timeout-ms", "h", "help"]);
const args = parseArgs(rawArgs);
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 10000);

const opsShellMust = [
  'class="product-shell',
  'aria-label="운영 메뉴"',
  'href="/ops/home"',
  'href="/client/live"',
  "window.MediaServerUi",
];

const opsShellMustNot = [
  'id="opsRulesEditorComponent"',
];

const clientShellMust = [
  'class="product-shell',
  'aria-label="클라이언트 메뉴"',
  'data-testid="client-shell-page"',
  'id="views-data"',
  '<script type="application/json" id="views-data">',
  "window.MediaServerUi",
];

const clientShellMustNot = [
  'aria-label="운영 메뉴"',
  "/ops/api/sources",
  "/ops/api/views",
  "/ops/api/rules",
  "/ops/api/runtime/status",
  "/ops/api/events/status",
  "/ops/api/source-health",
  "/ops/api/diagnostics",
  "/ops/api/users",
  "/ops/api/access-requests",
  "/ops/api/invites",
  "/lab/analysis/",
  "Registry raw JSON",
  "debugCounters",
  "Developer URL",
  "BBox diagnostics",
  "sources-json",
  "views-json",
  "client-views-json",
  "rtsp://",
  "sessionToken",
];

const clientForbiddenJsonKeys = [
  "rtspUrl",
  "httpUrl",
  "file",
  "webrtcSourceId",
  "whepUrl",
  "storagePath",
  "debugCounters",
  "passwordHash",
  "tokenHash",
  "sessionToken",
];

const checks = [
  {
    name: "ops-home-shell",
    run: async () => assertHtmlContract("/ops/home", opsShellMust, [
      'data-testid="ops-home-page"',
      'data-ops-panel="home"',
    ], opsShellMustNot),
  },
  {
    name: "ops-dashboard-shell",
    run: async () => assertHtmlContract("/ops/dashboard", opsShellMust, [
      'data-testid="ops-dashboard-page"',
      'id="dashActiveSessions"',
      "/ops/api/runtime/status",
    ], opsShellMustNot),
  },
  {
    name: "ops-events-direct-route-shell",
    run: async () => assertHtmlContract("/ops/events", opsShellMust, [
      'data-testid="ops-events-page"',
      'data-route-scope="direct-diagnostic"',
      "Primary nav에는 표시하지 않는 direct/diagnostic route",
      'id="opsEventsRefresh"',
      "/ops/api/events/status",
    ], opsShellMustNot),
  },
  {
    name: "ops-sources-shell",
    run: async () => assertHtmlContract("/ops/sources", opsShellMust, [
      'data-testid="ops-sources-page"',
      'id="channels-body"',
      'id="channel-detail-panel"',
      "/ops/api/sources",
      "/ops/api/views",
    ], opsShellMustNot),
  },
  {
    name: "ops-rules-shell",
    run: async () => assertHtmlContract("/ops/rules", opsShellMust, [
      'data-testid="ops-rules-page"',
      'id="opsVaRuleRows"',
      'id="opsEventRuleRows"',
      'id="opsProfileRows"',
      "/ops/api/rules/catalog",
    ], opsShellMustNot),
  },
  {
    name: "ops-users-shell",
    run: async () => assertHtmlContract("/ops/users", opsShellMust, [
      'data-testid="ops-users-page"',
      'id="users-body"',
      'id="access-requests-body"',
      "/ops/api/users",
      "/ops/api/access-requests",
    ], opsShellMustNot),
  },
  {
    name: "client-live-shell",
    run: async () => assertHtmlContract("/client/live", clientShellMust, [
      'data-client-active="live"',
      'id="views"',
      'id="detail"',
      "/client/api/views",
    ], clientShellMustNot),
  },
  {
    name: "client-dashboard-shell",
    run: async () => assertHtmlContract("/client/dashboard", clientShellMust, [
      'data-client-active="dashboard"',
      'id="views"',
      'id="detail"',
      "/client/api/views",
    ], clientShellMustNot),
  },
  {
    name: "client-events-shell",
    run: async () => assertHtmlContract("/client/events", clientShellMust, [
      'data-client-active="events"',
      'id="views"',
      'id="detail"',
      "/client/api/views",
    ], clientShellMustNot),
  },
  {
    name: "lab-analysis-api-remains-open",
    run: async () => {
      await assertJsonPath("/lab/files", ["files"]);
      await assertJsonPath("/lab/analysis/capabilities", ["detectors"]);
      await assertJsonPath("/lab/analysis/profiles", ["status", "builtInProfiles"]);
      await assertJsonPath("/lab/analysis/rules", ["status", "rules"]);
      await assertJsonPath("/lab/analysis/va-rules", ["status", "vaRules"]);
    },
  },
  {
    name: "ops-api-boundary",
    run: async () => {
      await assertJsonPath("/ops/api/runtime/status", ["ok"]);
      await assertJsonPath("/ops/api/rules/catalog", ["status", "profiles", "rules", "vaRules"]);
      await assertJsonPath("/ops/api/sources", ["sources"]);
      await assertJsonPath("/ops/api/views", ["views"]);
    },
  },
  {
    name: "client-api-viewer-contract",
    run: async () => {
      const text = await requestText("/client/api/views", { accept: "application/json" });
      assertJsonKeysOmitted("client-api-views", text, clientForbiddenJsonKeys);
      assertOmits("client-api-views", text, [
        '"rtspUrl"',
        '"httpUrl"',
        '"file":',
        '"webrtcSourceId"',
        '"whepUrl"',
        '"storagePath"',
        '"debugCounters"',
        "/ops/api/",
        "/lab/analysis/",
        "SourceRegistry",
      ]);
      const payload = parseJson("client-api-views", text);
      if (!Array.isArray(payload.views)) {
        throw new Error("client-api-views: views 배열이 없습니다");
      }
    },
  },
];

let passCount = 0;
const failures = [];

for (const check of checks) {
  try {
    await check.run();
    passCount += 1;
    console.log(`[pass] ${check.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${check.name}] ${message}`);
    console.log(`[fail] ${check.name}: ${message}`);
  }
}

console.log("");
console.log("== Ops/Client/Lab route boundary 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failures.length}`);

if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

async function assertHtmlContract(path, shellNeedles, pageNeedles, forbiddenNeedles) {
  const text = await requestText(path, { accept: "text/html" });
  assertContains(path, text, shellNeedles);
  assertContains(path, text, pageNeedles);
  assertOmits(path, text, forbiddenNeedles);
  if (path === "/ops" || path.startsWith("/ops/")) {
    assertOpsPrimaryNavContract(path, text);
  }
}

async function assertJsonPath(path, requiredKeys) {
  const text = await requestText(path, { accept: "application/json" });
  const payload = parseJson(path, text);
  for (const key of requiredKeys) {
    if (!Object.hasOwn(payload, key)) {
      throw new Error(`${path}: JSON key missing: ${key}`);
    }
  }
  return payload;
}

function assertContains(name, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${name}: missing selector/text: ${needle}`);
    }
  }
}

function assertOmits(name, text, needles) {
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`${name}: forbidden route/debug text leaked: ${needle}`);
    }
  }
}

function assertOpsPrimaryNavContract(name, text) {
  const match = text.match(/<nav class="image-nav-tabs"[^>]*aria-label="운영 메뉴"[\s\S]*?<\/nav>/);
  if (!match) {
    throw new Error(`${name}: ops primary nav block not found`);
  }
  const nav = match[0];
  const requiredHrefs = [
    'href="/ops/home"',
    'href="/ops/dashboard"',
    'href="/ops/sources"',
    'href="/ops/rules"',
    'href="/client/live"',
  ];
  for (const href of requiredHrefs) {
    if (!nav.includes(href)) {
      throw new Error(`${name}: primary nav missing ${href}`);
    }
  }
  if (nav.includes('href="/ops/events"')) {
    throw new Error(`${name}: /ops/events must remain a direct route, not primary nav`);
  }
}

function assertJsonKeysOmitted(name, text, keys) {
  const forbidden = new Set(keys);
  const payload = parseJson(name, text);
  const visit = (value, path = "$") => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (forbidden.has(key)) {
        throw new Error(`${name}: forbidden JSON key leaked at ${childPath}`);
      }
      visit(child, childPath);
    }
  };
  visit(payload);
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${name}: invalid JSON: ${error.message}`);
  }
}

async function assertStatus(path, expectedStatus) {
  const response = await request(path, { accept: "text/html,application/json" });
  await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected HTTP ${expectedStatus}, got ${response.status}`);
  }
}

async function requestText(path, options = {}) {
  const response = await request(path, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 180)}`);
  }
  return text;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { Accept: options.accept || "text/html,application/json" },
      credentials: "same-origin",
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const key = toCamel(raw);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = "1";
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}
