#!/usr/bin/env node
// 파일 용도: 현재 v1.8 기준 기능/UI/검증 inventory 문서가 단일 개별 기능 표로 유지되는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
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
  - inventory is scoped to current v1.8.0 and explicitly separates unverified manual UI evidence
  - grouped inventory tables were deleted
  - the single Individual Function Code UI Test Matrix has one feature/action/route/command per row
  - each row separates stability, 30-minute, 120-minute, and UI test scope
  - required product UI, route/API, auth, VA scenario, client, ONVIF, metadata, release, and server command rows exist
  - every current server.sh command has its own row
`);
}

assertKnownOptions(rawArgs, ["help"]);

const checks = [];

const inventoryPath = path.join(rootDir, "docs/project-feature-test-inventory.md");
const inventory = readText(inventoryPath);
const docsIndex = readText(path.join(rootDir, "docs/README.md"));
const server = readText(path.join(rootDir, "server.sh"));

check("inventory document is indexed and scoped to current v1.8.0", () => {
  requireText(docsIndex, "project-feature-test-inventory.md", "docs index does not link project inventory");
  requireText(inventory, "현재 release 목표 `v1.8.0`", "inventory does not pin v1.8.0 release target");
  requireText(
    inventory,
    "인앱 브라우저에서 모든 기능을 직접 클릭하고 타이핑한 full manual UI evidence",
    "inventory does not separate manual UI full-test evidence"
  );
  requireText(inventory, "이 문서는 현재 제품 기준만 다룹니다", "inventory does not separate archive history");
  for (const phrase of [
    "테스트 단계 역할",
    "안정화 테스트 | 30분/120분/UI 테스트의 선수 테스트",
    "기능 개발 중 로드맵의 각 스텝이 끝날 때 수행",
    "30분 테스트 | 장기간 테스트를 지시받았을 때 기본으로 수행",
    "각 버전별 로드맵 개발이 끝나면 수행합니다",
    "120분 테스트 | 메모리 릭",
    "필요하다고 판단하면 사용자에게 먼저 알리고 승인/지시를 받습니다",
    "UI 테스트 | 인앱 브라우저에서 직접 클릭/타이핑/반응형/시각 품질",
  ]) {
    requireText(inventory, phrase, `inventory missing test phase rule: ${phrase}`);
  }
});

check("grouped table sections are deleted", () => {
  for (const heading of [
    "## Atomic Code Logic / UI / Test Matrix",
    "## Code Feature Inventory",
    "## Source Module Inventory Audit",
    "## Support Artifact Inventory Audit",
    "## UI-Accessible Feature Inventory",
    "## UI Action Inventory Audit",
    "## Route/API Surface Audit",
    "## Current Verification Inventory",
    "## Fixture And Test Artifact Inventory Audit",
    "## Script Inventory Audit",
    "### Tracked Script File Detail",
    "## Comparison Result",
  ]) {
    assert(!inventory.includes(heading), `grouped section remains: ${heading}`);
  }

  for (const heading of [
    "# Project Feature Test Inventory",
    "## Individual Function Code UI Test Matrix",
    "## Current Gaps",
    "## Maintenance Rules",
  ]) {
    requireText(inventory, heading, `inventory missing required section ${heading}`);
  }
});

check("single matrix has individual feature rows", () => {
  const { rows, byFeature } = parseMatrix();
  assert(rows.length >= 560, `individual matrix is too small: ${rows.length} row(s)`);
  assert(byFeature.size === rows.length, "individual matrix has duplicate feature names");

  for (const row of rows) {
    assert(row.feature.trim(), "matrix row has empty feature");
    assert(row.code.trim(), `matrix row has empty code logic: ${row.feature}`);
    assert(row.uiNeed.trim(), `matrix row has empty UI requirement: ${row.feature}`);
    assert(row.ui.trim(), `matrix row has empty UI state: ${row.feature}`);
    assert(row.test.trim(), `matrix row has empty test evidence: ${row.feature}`);
    assert(row.pass.trim(), `matrix row has empty PASS output/judgement: ${row.feature}`);
    assert(row.stability.trim(), `matrix row has empty stability scope: ${row.feature}`);
    assert(row.soak30.trim(), `matrix row has empty 30-minute scope: ${row.feature}`);
    assert(row.soak120.trim(), `matrix row has empty 120-minute scope: ${row.feature}`);
    assert(row.uiTest.trim(), `matrix row has empty UI test scope: ${row.feature}`);
    const isTestExcluded = row.ui.startsWith("제외:") ||
      row.stability.startsWith("제외:") ||
      row.soak30.startsWith("제외:") ||
      row.soak120.startsWith("제외:") ||
      row.uiTest.startsWith("제외:");
    if (isTestExcluded) {
      assert(row.uiNeed.startsWith("제외:"), `excluded row must mark UI requirement as excluded: ${row.feature}`);
      assert(row.ui.startsWith("제외:"), `excluded row must mark UI state as excluded: ${row.feature}`);
      assert(row.test.includes("테스트 항목 제외"), `excluded row must explicitly state test exclusion: ${row.feature}`);
      assert(row.pass.includes("PASS 없음"), `excluded row must not claim PASS output: ${row.feature}`);
      for (const [label, value] of [
        ["stability", row.stability],
        ["30-minute", row.soak30],
        ["120-minute", row.soak120],
        ["UI test", row.uiTest],
      ]) {
        assert(value.startsWith("제외:"), `excluded row ${label} scope must start with 제외: ${row.feature}`);
        assert(value.includes("실기기") && value.includes("테스트 항목 제외"), `excluded row ${label} scope must name real-device test exclusion: ${row.feature}`);
      }
      continue;
    }
    assert(
      row.uiNeed.startsWith("필수:") || row.uiNeed.startsWith("비대상:"),
      `matrix row UI requirement must be 필수 or 비대상: ${row.feature}`
    );
    assert(
      row.stability.startsWith("존재:") || row.stability.startsWith("조건부:") || row.stability.startsWith("없음:"),
      `matrix row stability scope must state test existence: ${row.feature}`
    );
    assert(row.soak30.includes("verify-predev --soak-minutes 30"), `matrix row 30-minute scope must name 30-minute predev command: ${row.feature}`);
    assert(row.soak120.includes("120분") && row.soak120.includes("사용자"), `matrix row 120-minute scope must state user-confirmed 120-minute rule: ${row.feature}`);
    if (row.ui.startsWith("있음")) {
      assert(row.uiNeed.startsWith("필수:"), `UI-present row must mark UI as required: ${row.feature}`);
      assert(row.pass.startsWith("PASS 출력:"), `UI-present row must state PASS output: ${row.feature}`);
      assert(row.pass.includes("exit 0") && row.pass.includes("summary fail 0"), `UI-present row PASS must require exit 0 and fail 0: ${row.feature}`);
      assert(row.uiTest.startsWith("존재:"), `UI-present row must record UI test existence: ${row.feature}`);
    } else if (row.ui.startsWith("부분")) {
      assert(row.uiNeed.startsWith("필수:"), `partial UI row must mark UI as required: ${row.feature}`);
      assert(row.pass.startsWith("ISSUE:"), `partial UI row must not claim PASS: ${row.feature}`);
      assert(row.uiTest.startsWith("ISSUE:"), `partial UI row must record partial UI issue: ${row.feature}`);
    } else if (row.ui.startsWith("없음")) {
      assert(row.uiNeed.startsWith("비대상:"), `non-UI row must be marked UI not required: ${row.feature}`);
      assert(row.pass.startsWith("PASS 출력:"), `UI-not-required row must state PASS output: ${row.feature}`);
      assert(row.uiTest.startsWith("비대상:"), `non-UI row must record UI-not-required status: ${row.feature}`);
    }
  }

  for (const forbidden of [
    "source update/delete",
    "view create/update/delete",
    "event template create/edit/delete",
    "analysis profile create/edit/delete",
    "user disable/restore",
    "profile detector/FPS/queue/confidence/NMS/input/adaptive fields",
    "preview reconnect/stop",
    "geometry reset/undo/last/clear",
    "client tile play/restart/stop",
    "dashboard compare filter/sort",
    "copy status/events",
    "preset JSON apply/reset",
  ]) {
    assert(!byFeature.has(forbidden), `grouped feature row remains: ${forbidden}`);
  }
});

check("matrix splits formerly grouped source, rule, user, client, and event actions", () => {
  const { byFeature } = parseMatrix();
  for (const feature of [
    "source create API",
    "source update API",
    "source delete API",
    "view create API",
    "view update API",
    "view delete API",
    "VA preview start",
    "VA preview restart",
    "VA preview stop",
    "VA geometry default coordinates",
    "VA geometry undo",
    "VA geometry delete last point",
    "VA geometry clear points",
    "event template create API",
    "event template save API",
    "event template delete API",
    "analysis profile create API",
    "analysis profile save API",
    "analysis profile delete API",
    "analysis profile detector select",
    "analysis profile FPS input",
    "analysis profile queue input",
    "analysis profile confidence input",
    "analysis profile NMS input",
    "analysis profile input width",
    "analysis profile input height",
    "analysis profile adaptive toggle",
    "ops user enable API",
    "ops user disable API",
    "event review status filter",
    "event review class filter",
    "event review status edit",
    "event review class edit",
    "event review note edit",
    "client live tile playback toggle",
    "client live tile restart",
    "client live tile disconnect",
    "client dashboard status copy",
    "client dashboard events copy",
    "client dashboard compare filter",
    "client dashboard compare sort",
    "client dashboard preset apply",
    "client dashboard preset reset",
  ]) {
    assert(byFeature.has(feature), `missing individual feature row: ${feature}`);
  }
});

check("matrix covers auth roles, scopes, and account flows individually", () => {
  const { byFeature } = parseMatrix();
  for (const feature of [
    "admin bearer token auth",
    "operator bearer token auth",
    "viewer bearer token auth",
    "integrator bearer token auth",
    "admin role scope template",
    "operator role scope template",
    "viewer role scope template",
    "integrator role scope template",
    "scope validation for admin",
    "scope validation for operator",
    "scope validation for viewer",
    "scope validation for integrator",
    "client access request username input",
    "client access request display-name input",
    "client access request contact input",
    "client access request channel input",
    "client access request reason input",
    "client access request submit",
    "ops access request approve",
    "ops access request reject",
    "ops invite create",
    "ops invite list",
    "ops user reset password API",
    "last active admin disable guard",
    "last active admin role-change guard",
  ]) {
    assert(byFeature.has(feature), `missing auth/account row: ${feature}`);
  }
});

check("matrix covers product UI routes and active Lab API boundaries", () => {
  for (const route of [
    "`/`",
    "`/setup`",
    "`/login`",
    "`/logout`",
    "`/password/change`",
    "`/invite/setup`",
    "`/client/request-access`",
    "`/ops`",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/events`",
    "`/lab/files`",
    "`/lab/reports`",
    "`/lab/reports/content`",
    "`/lab/runtime/status`",
  ]) {
    requireText(inventory, route, `inventory missing route ${route}`);
  }
});

check("matrix covers VA scenario functions as partial where manual event evidence is absent", () => {
  const { byFeature } = parseMatrix();
  for (const feature of [
    "intrusion event rule",
    "line crossing event rule",
    "intrusion dwell candidate phase",
    "intrusion dwell confirmed phase",
    "intrusion dwell ended event",
    "wrong direction scenario",
    "re-entry scenario",
    "intrusion after line crossing trigger",
    "intrusion after line crossing dwell",
    "loitering dwell check",
    "loitering movement-radius check",
    "loitering trajectory-points check",
    "zone occupancy threshold check",
    "zone occupancy dwell check",
    "scene zone membership calculation",
    "scene line side calculation",
    "scenario stable-track requirement",
    "scenario cooldown enforcement",
  ]) {
    const row = byFeature.get(feature);
    assert(row, `missing VA scenario row: ${feature}`);
    assert(
      row.test.includes("브라우저 실제 이벤트 전수 evidence 없음") ||
        row.test.includes("브라우저 전수 evidence 없음") ||
        row.test.includes("backend"),
      `VA scenario row does not state limited/manual evidence boundary: ${feature}`
    );
  }
});

check("matrix covers media, metadata, analysis, ONVIF, release, and sample boundaries", () => {
  const { byFeature } = parseMatrix();
  for (const feature of [
    "RTSP egress session create",
    "RTSP VA overlay render",
    "generic WebRTC session create",
    "generic WebRTC session answer",
    "generic WebRTC session ICE",
    "generic WebRTC session delete",
    "WHEP session create",
    "WHEP session answer",
    "WHEP session ICE",
    "WHEP session delete",
    "WHIP publish session create",
    "WHIP publish session ICE",
    "WHIP publish session delete",
    "client WebRTC session create",
    "client WebRTC session answer",
    "client WebRTC session ICE",
    "client WebRTC session delete",
    "WebRTC DataChannel metadata",
    "SSE metadata side-channel",
    "WS metadata side-channel",
    "analysis tap bbox diagnostics API",
    "analysis tap metrics API",
    "runtime metadata builder",
    "ONVIF probe draft apply",
    "ONVIF profile variant select",
    "ONVIF field smoke gate",
    "integrator event-post schema artifact",
    "public repo readiness check",
    "manual UI evidence verifier",
    "sample H264 media fixture",
    "sample MP4 media fixture",
    "predev release gate",
  ]) {
    assert(byFeature.has(feature), `missing media/metadata/boundary row: ${feature}`);
  }

  requireText(inventory, "모든 이벤트 수동 evidence 아님", "sample media rows do not reject all-event manual evidence");
  requireText(inventory, "schema 변경 금지", "metadata schema boundary is not documented");
});

check("real-device field smoke rows are excluded from current test items", () => {
  const { byFeature } = parseMatrix();
  const excludedFeatures = [
    "ONVIF field smoke gate",
    "server command: verify-onvif-field-http-probe",
    "script file: scripts/internal/onvif_field_http_probe_smoke.cpp",
    "script file: scripts/internal/verify_onvif_field_http_probe.mjs",
  ];
  const excludedSectionStart = inventory.indexOf("### 실기기 필요 테스트 항목 제외");
  const issueSectionStart = inventory.indexOf("### 기능-UI-테스트 필수 누락 항목");
  assert(excludedSectionStart >= 0, "missing real-device test exclusion section");
  assert(issueSectionStart > excludedSectionStart, "real-device exclusion section must precede stability issue list");
  const excludedSection = inventory.slice(excludedSectionStart, issueSectionStart);
  const issueSection = inventory.slice(issueSectionStart);

  for (const feature of excludedFeatures) {
    const row = byFeature.get(feature);
    assert(row, `missing real-device excluded matrix row: ${feature}`);
    assert(row.uiNeed.startsWith("제외:"), `real-device row must be excluded from UI requirement: ${feature}`);
    assert(row.ui.startsWith("제외:"), `real-device row must be excluded from UI requirement: ${feature}`);
    assert(row.test.includes("테스트 항목 제외"), `real-device row must state test exclusion: ${feature}`);
    assert(row.pass.includes("PASS 없음"), `real-device row must not claim pass output: ${feature}`);
    assert(row.stability.startsWith("제외:"), `real-device row must be excluded from stability tests: ${feature}`);
    assert(row.soak30.startsWith("제외:"), `real-device row must be excluded from 30-minute tests: ${feature}`);
    assert(row.soak120.startsWith("제외:"), `real-device row must be excluded from 120-minute tests: ${feature}`);
    assert(row.uiTest.startsWith("제외:"), `real-device row must be excluded from UI tests: ${feature}`);
    assert(excludedSection.includes(`| ${feature} |`), `real-device exclusion table missing feature: ${feature}`);
    assert(!issueSection.includes(`| ${feature} |`), `real-device excluded feature remains in stability issue list: ${feature}`);
  }
});

check("every current server.sh command has its own row", () => {
  const { byFeature } = parseMatrix();
  const missing = parseServerCommands()
    .map(command => `server command: ${command}`)
    .filter(feature => !byFeature.has(feature));
  assert(missing.length === 0, `missing server command row(s):\n${missing.join("\n")}`);
});

check("explicit gaps and maintenance rules prevent completion overstatement", () => {
  for (const phrase of [
    "Manual UI full test evidence는 아직 없음",
    "모든 VA scenario가 실제 브라우저 UI에서 실제 이벤트 발생까지 확인됐다는 증거는 아직 없습니다",
    "실장비 ONVIF, 외부 WHEP/TURN, 30분/120분 soak",
    "Integrator role은 API/scope 중심",
    "sample_h264 같은 sample media 재생은 영상 표시 evidence일 뿐",
    "기능을 묶어서 쓰지 않습니다",
    "create, save, delete, filter, sort, copy, start, restart, stop은 각각 행을 분리합니다",
    "안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 테스트` 칸을 함께 채웁니다",
    "## Current Required Triad Count",
    "정상 기준은 먼저 `UI 필요` 여부를 분리해서 봅니다",
    "| 전체 기능 row | 754 |",
    "| 기능-UI-테스트 모두 존재 row | 294 |",
    "| UI 없어야 정상 row | 407 |",
    "| 기능-UI-테스트 필수 누락 row | 49 |",
    "| 테스트 없음 | 0 |",
    "| 실기기 필요로 테스트 항목 제외 | 4 |",
    "| UI 필수인데 UI 부분 존재 | 49 |",
    "### 실기기 필요 테스트 항목 제외",
    "### 기능-UI-테스트 필수 누락 항목",
  ]) {
    requireText(inventory, phrase, `inventory missing gap/rule phrase: ${phrase}`);
  }
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

function parseMatrix() {
  const startHeading = "## Individual Function Code UI Test Matrix";
  const endHeading = "## Current Gaps";
  const start = inventory.indexOf(startHeading);
  assert(start >= 0, `missing section ${startHeading}`);
  const end = inventory.indexOf(endHeading, start + startHeading.length);
  assert(end >= 0, `missing section end ${endHeading}`);
  const section = inventory.slice(start, end);
  requireText(section, "| 기능 | 코드상 로직 | UI 필요 | UI 존재 | 테스트 | PASS 출력/판정 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 |", "matrix header changed");

  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("| ")) continue;
    if (line.startsWith("| 기능 ") || line.startsWith("| ---")) continue;
    const cells = splitMarkdownRow(line);
    assert(cells.length === 10, `matrix row must have 10 cells: ${line}`);
    rows.push({
      feature: cells[0],
      code: cells[1],
      uiNeed: cells[2],
      ui: cells[3],
      test: cells[4],
      pass: cells[5],
      stability: cells[6],
      soak30: cells[7],
      soak120: cells[8],
      uiTest: cells[9],
    });
  }
  const byFeature = new Map(rows.map(row => [row.feature, row]));
  return { rows, byFeature };
}

function splitMarkdownRow(line) {
  const cells = [];
  let current = "";
  let escaped = false;
  const trimmed = line.trim();
  for (let i = 1; i < trimmed.length - 1; i += 1) {
    const ch = trimmed[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      current += ch;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim().replace(/\\\|/g, "|"));
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim().replace(/\\\|/g, "|"));
  return cells;
}

function parseServerCommands() {
  const commands = [];
  const regex = /^\s{2}([a-zA-Z0-9_.|-]+)\)/gm;
  let match;
  while ((match = regex.exec(server)) !== null) {
    for (const command of match[1].split("|")) {
      if (command !== "*" && !commands.includes(command)) commands.push(command);
    }
  }
  return commands;
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

function walkIfExists(dir) {
  if (!fs.existsSync(dir)) return [];
  return walk(dir);
}

function rootMarkdownFiles() {
  return fs
    .readdirSync(rootDir)
    .filter(name => name.endsWith(".md"))
    .map(name => path.join(rootDir, name));
}
