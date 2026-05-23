#!/usr/bin/env node
// 파일 용도: 현재 v1.8 기준 기능/UI/검증 inventory 문서가 실제 command/route 범위를 덮는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Project feature/test inventory verification

Usage:
  ./server.sh verify-project-inventory

Checks:
  - docs/project-feature-test-inventory.md exists and is linked from docs/README.md
  - inventory lists required current sections, UI routes, closed routes, and comparison/gap states
  - inventory covers current v1.8 route/API surface families from the HTTP server and product UI scripts
  - every current server.sh command appears in the inventory
  - current-facing docs outside backlog/history do not mention pre-v1.8 baselines
  - current command set has no version-specific verify-v*/verify_v* release verifier
`);
}

assertKnownOptions(rawArgs, ["help"]);

const checks = [];

const inventoryPath = path.join(rootDir, "docs/project-feature-test-inventory.md");
const inventory = readText(inventoryPath);
const docsIndex = readText(path.join(rootDir, "docs/README.md"));
const server = readText(path.join(rootDir, "server.sh"));
const routeSource = [
  readText(path.join(rootDir, "src/ingress/webrtc_http_server.cpp")),
  readText(path.join(rootDir, "src/ingress/product_ui_page_scripts.cpp")),
].join("\n");

check("inventory document is indexed and scoped to current v1.8.0", () => {
  assert(docsIndex.includes("project-feature-test-inventory.md"), "docs index does not link project inventory");
  requireText(inventory, "현재 release 목표 `v1.8.0`", "inventory does not pin v1.8.0 release target");
  requireText(inventory, "인앱 브라우저에서 모든 기능을 직접 클릭하고", "inventory does not separate manual UI full-test evidence");
  requireText(inventory, "이 문서는 현재 제품 기준만 다룹니다", "inventory does not separate archive history");
});

check("inventory has required feature/UI/test/comparison sections", () => {
  for (const heading of [
    "## Code Feature Inventory",
    "## UI-Accessible Feature Inventory",
    "## Route/API Surface Audit",
    "## Current Verification Inventory",
    "## Comparison Result",
    "## Current Gaps",
    "## Maintenance Rules",
  ]) {
    requireText(inventory, heading, `inventory missing section ${heading}`);
  }
});

check("inventory covers required product UI and closed routes", () => {
  for (const route of [
    "/",
    "/setup",
    "/login",
    "/password/change",
    "/invite/setup",
    "/client/request-access",
    "/ops",
    "/ops/home",
    "/ops/dashboard",
    "/ops/sources",
    "/ops/rules",
    "/ops/users",
    "/ops/events",
    "/client",
    "/client/live",
    "/client/dashboard",
    "/client/events",
    "/lab",
    "/lab/rules",
    "/lab/import",
    "/webrtc/test",
  ]) {
    requireText(inventory, `\`${route}\``, `inventory missing route ${route}`);
  }

  for (const boundary of [
    "열리면 실패",
    "직접 제품 UI 없음",
    "제품 UI 없음",
    "UI 풀테스트 evidence는 별도 수행 필요",
    "이 문서 기준 미수행",
  ]) {
    requireText(inventory, boundary, `inventory missing boundary phrase: ${boundary}`);
  }
});

check("inventory covers current v1.8 route/API surface families", () => {
  const routeFamilies = [
    {
      name: "Auth/session",
      sourceNeedles: [
        'request.path == "/setup"',
        'request.path == "/login"',
        'request.path == "/logout"',
        'request.path == "/password/change"',
        'request.path == "/invite/setup"',
        'request.path == "/auth/whoami"',
        'request.path == "/client/request-access"',
        'request.path == "/client/api/access-requests"',
      ],
      inventoryNeedles: [
        "Auth/session",
        "/logout",
        "/auth/whoami",
        "/client/api/access-requests",
      ],
    },
    {
      name: "Ops shell",
      sourceNeedles: [
        'path == "/ops"',
        '"/ops/home"',
        '"/ops/dashboard"',
        '"/ops/events"',
        'request.path == "/ops/sources"',
        'request.path == "/ops/users"',
        'request.path == "/ops/rules"',
      ],
      inventoryNeedles: [
        "Ops shell",
        "/ops",
        "/ops/home",
        "/ops/events",
        "primary nav 기준은 Home/Dashboard/Channels/Rules/Users/Client Preview",
      ],
    },
    {
      name: "Client shell",
      sourceNeedles: [
        'path == "/client"',
        '"/client/live"',
        '"/client/dashboard"',
        '"/client/events"',
      ],
      inventoryNeedles: [
        "Client shell",
        "/client",
        "/client/events",
        "primary nav 기준은 Live/Dashboard",
      ],
    },
    {
      name: "Ops source/view/channel APIs",
      sourceNeedles: [
        'request.path == "/ops/api/sources"',
        'request.path == "/ops/api/views"',
        'request.path == "/ops/api/channels/bulk"',
        'request.path == "/ops/api/onvif/import-draft"',
      ],
      inventoryNeedles: [
        "Ops source/view/channel APIs",
        "/ops/api/sources/{sourceId}",
        "/ops/api/views/{viewId}",
        "/ops/api/onvif/import-draft",
      ],
    },
    {
      name: "Ops rule/config APIs",
      sourceNeedles: [
        'request.path == "/ops/api/rules/catalog"',
        'request.path == "/lab/analysis/profiles"',
        'request.path == "/lab/analysis/rules"',
        'request.path == "/lab/analysis/va-rules"',
        'std::string("/lab/analysis/profiles/")',
        'std::string("/lab/analysis/rules/")',
        'std::string("/lab/analysis/va-rules/")',
      ],
      inventoryNeedles: [
        "Ops rule/config APIs",
        "/lab/analysis/profiles/{profileId}",
        "/lab/analysis/rules/{ruleId}",
        "/lab/analysis/va-rules/{ruleId}",
      ],
    },
    {
      name: "Ops runtime/diagnostics APIs",
      sourceNeedles: [
        'request.path == "/ops/api/runtime/status"',
        'request.path == "/ops/api/source-health"',
        'request.path == "/ops/api/source-health/bulk"',
        'request.path == "/ops/api/diagnostics/log-tail"',
      ],
      inventoryNeedles: [
        "Ops runtime/diagnostics APIs",
        "/ops/api/runtime/status",
        "/ops/api/source-health/bulk",
        "/ops/api/diagnostics/log-tail",
      ],
    },
    {
      name: "Ops events/reviews/alerts/audit APIs",
      sourceNeedles: [
        'request.path == "/ops/api/events/status"',
        'request.path == "/ops/api/events/reviews"',
        'request.path.rfind("/ops/api/events/reviews/", 0) == 0',
        'request.path == "/ops/api/alerts/deliveries"',
        'request.path == "/ops/api/alerts/deliveries/test"',
        'request.path == "/ops/api/audit"',
      ],
      inventoryNeedles: [
        "Ops events/reviews/alerts/audit APIs",
        "/ops/api/events/reviews/{eventId}",
        "/ops/api/alerts/deliveries/test",
        "/ops/api/audit",
      ],
    },
    {
      name: "Ops users/access/invites APIs",
      sourceNeedles: [
        'request.path == "/ops/api/users"',
        'request.path.rfind("/ops/api/users/", 0) == 0',
        'request.path == "/ops/api/access-requests"',
        'request.path.rfind("/ops/api/access-requests/", 0) == 0',
        'request.path == "/ops/api/invites"',
      ],
      inventoryNeedles: [
        "Ops users/access/invites APIs",
        "/ops/api/users/{username}/enable",
        "/ops/api/users/{username}/disable",
        "/ops/api/users/{username}/reset-password",
        "/ops/api/access-requests/{requestId}/approve",
        "/ops/api/access-requests/{requestId}/reject",
      ],
    },
    {
      name: "Client scoped APIs",
      sourceNeedles: [
        'request.path == "/client/api/views"',
        'request.path.rfind("/client/api/views/", 0) == 0',
        'request.path == "/client/api/preferences/live-layout"',
        'subresource == "dashboard"',
        'subresource == "events"',
        'subresource == "metadata"',
      ],
      inventoryNeedles: [
        "Client scoped APIs",
        "/client/api/views/{viewId}/dashboard",
        "/client/api/views/{viewId}/events",
        "/client/api/views/{viewId}/metadata",
        "/client/api/preferences/live-layout",
      ],
    },
    {
      name: "Client WebRTC proxy APIs",
      sourceNeedles: [
        'subresource == "webrtc/session"',
        'client_session_prefix = "webrtc/session/"',
        'session_suffix == "/answer"',
        'session_suffix == "/ice"',
      ],
      inventoryNeedles: [
        "Client WebRTC proxy APIs",
        "/client/api/views/{viewId}/webrtc/session",
        "/client/api/views/{viewId}/webrtc/session/{sessionId}/answer",
        "/client/api/views/{viewId}/webrtc/session/{sessionId}/ice",
      ],
    },
    {
      name: "Lab analysis runtime APIs",
      sourceNeedles: [
        'request.path == "/lab/analysis/capabilities"',
        'std::string("/lab/analysis/image")',
        'request.path == "/lab/analysis/metadata/stream"',
        'request.path == "/lab/analysis/taps"',
        'std::string("/lab/analysis/taps/")',
        'request.path == "/ws/va-metadata"',
        'suffix == "/bbox-diagnostics"',
        'suffix == "/events"',
      ],
      inventoryNeedles: [
        "Lab analysis runtime APIs",
        "/lab/analysis/image/overlay.jpg",
        "/lab/analysis/taps/{tapId}/bbox-diagnostics",
        "/lab/analysis/taps/{tapId}/state-dump",
        "/lab/analysis/taps/{tapId}/metrics-dump",
        "/ws/va-metadata",
      ],
    },
    {
      name: "Event storage/evidence APIs",
      sourceNeedles: [
        'request.path == "/lab/analysis/event-post/status"',
        'request.path == "/lab/analysis/event-storage/status"',
        'request.path == "/lab/analysis/events/records"',
        'request.path == "/lab/analysis/events/records/compact"',
        'request.path == "/lab/analysis/events/records/compactions"',
        'request.path == "/lab/analysis/events/records/compactions/cleanup"',
        'std::string("/lab/analysis/events/records/compactions/")',
        'request.path == "/lab/analysis/events/evidence"',
        'request.path == "/lab/analysis/events/evidence/bundle-token"',
        'request.path == "/lab/analysis/events/evidence/bundle"',
      ],
      inventoryNeedles: [
        "Event storage/evidence APIs",
        "/lab/analysis/events/records/compactions/{file}",
        "/lab/analysis/events/evidence/bundle-token",
        "/lab/analysis/events/evidence/bundle",
      ],
    },
    {
      name: "Generic WebRTC/WHEP/WHIP signaling",
      sourceNeedles: [
        'request.path == "/webrtc/config"',
        'request.path == "/webrtc/session"',
        'request.path == "/whep"',
        'request.path == "/whip/publish"',
        'std::string("/webrtc/session/")',
        'std::string("/whep/session/")',
        'std::string("/whip/publish/session/")',
      ],
      inventoryNeedles: [
        "Generic WebRTC/WHEP/WHIP signaling",
        "/webrtc/session/{sessionId}/answer",
        "/webrtc/session/{sessionId}/ice",
        "/whep/session/{sessionId}",
        "/whip/publish/session/{sessionId}",
      ],
    },
    {
      name: "Runtime utility and closed UI boundaries",
      sourceNeedles: [
        'request.path == "/health"',
        'request.path == "/favicon.ico"',
        'request.path == "/lab/runtime/status"',
        'request.path == "/webrtc/test"',
        'request.path == "/lab"',
        'request.path == "/lab/rules"',
        'request.path == "/lab/import"',
      ],
      inventoryNeedles: [
        "Runtime utility and closed UI boundaries",
        "/lab/runtime/status",
        "closed `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`",
      ],
    },
  ];

  const missing = [];
  for (const family of routeFamilies) {
    for (const needle of family.sourceNeedles) {
      if (!routeSource.includes(needle)) {
        missing.push(`${family.name}: source missing ${needle}`);
      }
    }
    for (const needle of family.inventoryNeedles) {
      if (!inventory.includes(needle)) {
        missing.push(`${family.name}: inventory missing ${needle}`);
      }
    }
  }
  assert(missing.length === 0, `route/API surface audit mismatch:\n${missing.join("\n")}`);
});

check("inventory covers current server.sh command set", () => {
  const commands = parseServerCommands();
  const missing = [];
  for (const command of commands) {
    if (!inventory.includes(`\`${command}\``)) {
      missing.push(command);
    }
  }
  assert(missing.length === 0, `inventory missing server.sh command(s):\n${missing.join("\n")}`);
});

check("inventory comparison reports code/UI/test mismatch classes", () => {
  for (const phrase of [
    "Code + UI + automated tests 있음",
    "Code + tests 있음, 제품 UI 없음",
    "Code + tests 있음, UI 노출 제한",
    "UI + tests 있음, 실제 full manual evidence 없음",
    "Tests 있음, 현재 제품 기능 아님",
    "Tests 있음, 환경/field gate",
  ]) {
    requireText(inventory, phrase, `inventory missing comparison class: ${phrase}`);
  }

  for (const gap of [
    "Manual UI full test evidence는 아직 없음",
    "모든 VA scenario가 실제 브라우저 UI에서 실제 이벤트 발생까지 확인됐다는 증거는",
    "실장비 ONVIF, 외부 WHEP/TURN, 장시간 soak",
    "Integrator role은 API/scope 중심",
  ]) {
    requireText(inventory, gap, `inventory missing explicit gap: ${gap}`);
  }
});

check("current command set excludes version-specific release verifiers", () => {
  const commands = parseServerCommands().filter(command => /^verify-v[0-9]/.test(command));
  assert(commands.length === 0, `version-specific verify-v command(s) remain:\n${commands.join("\n")}`);

  const versionScripts = fs
    .readdirSync(path.join(rootDir, "scripts/internal"))
    .filter(name => /^verify_v[0-9]/.test(name));
  assert(versionScripts.length === 0, `version-specific verify_v script(s) remain:\n${versionScripts.join("\n")}`);

  assert(!/verify-v[0-9]/.test(server), "server.sh still documents version-specific verify-v command");
  assert(!/verify_v[0-9]/.test(server), "server.sh still references version-specific verify_v script");
});

check("current-facing docs outside backlog/history do not carry pre-v1.8 baselines", () => {
  const offenders = [];
  for (const file of walk(path.join(rootDir, "docs"))) {
    const relative = path.relative(rootDir, file);
    if (!relative.endsWith(".md")) continue;
    if (relative === "docs/development-backlog.md") continue;
    if (relative.startsWith("docs/history/")) continue;
    const text = readText(file);
    const matches = [...text.matchAll(/v1\.(?:1|2|3|4|5|6|7)(?:\.0|\.1)?/g)].map(match => match[0]);
    if (matches.length > 0) {
      offenders.push(`${relative}: ${[...new Set(matches)].join(", ")}`);
    }
  }
  assert(offenders.length === 0, `old version baseline mention(s) remain outside archive:\n${offenders.join("\n")}`);
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== Project feature/test inventory verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(text, needle, message) {
  assert(text.includes(needle), message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseServerCommands() {
  const commands = [];
  const regex = /^\s{2}([a-zA-Z0-9_.|-]+)\)/gm;
  let match;
  while ((match = regex.exec(server)) !== null) {
    for (const command of match[1].split("|")) {
      if (!commands.includes(command)) commands.push(command);
    }
  }
  return commands.filter(command => command !== "*");
}

function walk(dir) {
  const result = [];
  for (const name of fs.readdirSync(dir)) {
    const current = path.join(dir, name);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) result.push(...walk(current));
    else result.push(current);
  }
  return result;
}
