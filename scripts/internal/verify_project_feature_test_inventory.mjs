#!/usr/bin/env node
// 파일 용도: v1.8.0 기능별 UI 필요/테스트 영역 inventory가 실행 evidence와 분리되어 유지되는지 검증한다.

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
  - docs/project-feature-test-inventory.md is indexed
  - inventory pins v1.8.0 and states it is not execution evidence
  - all feature IDs use the current UI/test-area matrix shape
  - coverage, verifier, VA seed, 30-minute, 120-minute, and field-smoke boundaries exist
  - manual UI docs reference the feature inventory
  - the manual UI VA seed matrix fixture covers basic events, scenarios, presets, tracker/Re-ID policies, and invalid policy cases
`);
}

assertKnownOptions(rawArgs, ["help"]);

const inventory = readText("docs/project-feature-test-inventory.md");
const docsIndex = readText("docs/README.md");
const fulltest = readText("docs/manual-ui-fulltest.md");
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const streamVerification = readText("docs/stream-verification.md");
const releaseEvidence = readText("docs/release-evidence-index.md");
const seedFixturePath = "test/fixtures/manual_ui_fulltest_va_seed_matrix.json";
const seedFixtureText = readText(seedFixturePath);
const seedFixture = JSON.parse(seedFixtureText);

const checks = [];

check("inventory is indexed and scoped", () => {
  requireText(docsIndex, "project-feature-test-inventory.md", "docs index missing inventory link");
  requireText(inventory, "현재 release 목표 `v1.8.0`", "inventory does not pin v1.8.0");
  requireText(inventory, "테스트 실행 결과 문서가 아닙니다", "inventory must reject execution-evidence wording");
  requireText(inventory, "현재 테스트가 존재한다는 증거가 아닙니다", "inventory must reject test-exists wording");
  requireText(inventory, "coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.", "inventory missing no-overclaim rule");
});

check("required sections exist", () => {
  for (const heading of [
    "## Test Area Roles",
    "## Summary",
    "## Current Coverage Status",
    "## Owner Source Map",
    "## Verifier Coverage Map",
    "## VA Manual UI Seed Matrix",
    "## 30-Minute And 120-Minute Mapping",
    "## A. Screen And Route",
    "## B. Auth, Account, Role, Scope",
    "## C. Channel, Source, Published View",
    "## D. Rule, Profile, Scenario, Tracker",
    "## E. Runtime, Dashboard, Events",
    "## F. Client And Viewer",
    "## G. Media And Streaming",
    "## H. Lab, Development API, Metadata",
    "## I. Safety, Boundary, Invariant Contract",
    "## Coverage Review To Do",
  ]) {
    requireText(inventory, heading, `inventory missing section: ${heading}`);
  }
});

check("summary counts match current feature IDs", () => {
  const rows = parseFeatureRows(inventory);
  assert(rows.length === 316, `expected 316 feature rows, found ${rows.length}`);
  const ids = rows.map(row => row.id);
  assert(new Set(ids).size === ids.length, "duplicate feature IDs in inventory");
  for (const prefix of ["UI", "AUTH", "SRC", "RULE", "EVT", "CLIENT", "MEDIA", "LAB", "SAFE"]) {
    assert(ids.some(id => id.startsWith(`${prefix}-`)), `missing ${prefix}-* feature IDs`);
  }
  const counts = {
    total: rows.length,
    uiDirect: rows.filter(row => row.uiNeed === "필요").length,
    uiIndirect: rows.filter(row => row.uiNeed === "간접").length,
    uiNone: rows.filter(row => row.uiNeed === "비대상").length,
    testRequired: rows.filter(row => row.testNeed === "필요").length,
    stability: rows.filter(row => hasArea(row.area, "안정화")).length,
    ui: rows.filter(row => hasArea(row.area, "UI")).length,
    soak30: rows.filter(row => hasArea(row.area, "30분")).length,
    soak120: rows.filter(row => hasArea(row.area, "120분 조건부")).length,
    field: rows.filter(row => hasArea(row.area, "필드 별도")).length,
  };
  const expected = [
    ["전체 기능 항목", counts.total],
    ["UI 직접 필요", counts.uiDirect],
    ["UI 간접 필요", counts.uiIndirect],
    ["UI 비대상", counts.uiNone],
    ["테스트 필요", counts.testRequired],
    ["안정화 대상", counts.stability],
    ["UI 풀테스트 대상", counts.ui],
    ["30분 soak 대상", counts.soak30],
    ["120분 조건부 대상", counts.soak120],
    ["필드 별도 조건 포함", counts.field],
  ];
  for (const [label, count] of expected) {
    requireText(inventory, `| ${label} | ${count} |`, `summary count mismatch for ${label}: ${count}`);
  }
});

check("feature rows have required matrix columns", () => {
  for (const row of parseFeatureRows(inventory)) {
    assert(row.id, "feature row missing ID");
    assert(row.feature, `feature row ${row.id} missing feature`);
    assert(["필요", "간접", "비대상"].includes(row.uiNeed), `feature row ${row.id} has invalid UI need: ${row.uiNeed}`);
    assert(row.testNeed === "필요", `feature row ${row.id} must mark test need as 필요`);
    assert(row.area, `feature row ${row.id} missing test area`);
    assert(row.pass, `feature row ${row.id} missing PASS criteria`);
  }
});

check("coverage and verifier wording separates mapping from execution", () => {
  for (const phrase of [
    "실제 안정화 테스트,",
    "UI 풀테스트를 실행했다는 뜻이 아닙니다.",
    "| 제품 UI 위치 |",
    "| UI 풀테스트 evidence |",
    "| VA seed 데이터 |",
    "fixture 기준 작성, 서버 적용 NOT RUN",
    "Verifier Coverage Map",
    "실제 UI 이벤트 발생 전수는 아직 NOT RUN",
    "직접 조작 NOT RUN",
  ]) {
    requireText(inventory, phrase, `inventory missing coverage boundary wording: ${phrase}`);
  }
});

check("manual UI docs reference inventory and seed fixture", () => {
  for (const [label, text] of [
    ["manual-ui-fulltest.md", fulltest],
    ["manual-ui-checklist.md", checklist],
    ["manual-ui-result-template.md", template],
    ["stream-verification.md", streamVerification],
    ["release-evidence-index.md", releaseEvidence],
  ]) {
    requireText(text, "project-feature-test-inventory.md", `${label} missing inventory reference`);
  }
  requireText(checklist, seedFixturePath, "manual checklist missing VA seed fixture path");
  requireText(template, seedFixturePath, "manual result template missing VA seed fixture path");
  requireText(template, "## VA Seed / 최종 룰 상태", "manual result template missing VA seed result section");
});

check("manual UI VA seed matrix covers required v1.8.0 cases", () => {
  assert(seedFixture.schema === "media-server.manual-ui-fulltest-va-seed-matrix.v1", "unexpected seed fixture schema");
  assert(seedFixture.releaseTarget === "v1.8.0", "seed fixture must pin v1.8.0");
  assert(seedFixture.usageBoundary?.notEvidenceUntilAppliedAndVerified === true, "seed fixture must not be evidence by itself");
  assert(seedFixture.usageBoundary?.keepFinalRulesForEventLogReview === true, "seed fixture must preserve final rules for event review");
  assert(seedFixture.usageBoundary?.separateCrudFromScenarioEventReview === true, "seed fixture must separate CRUD from event review");

  const accounts = new Set(arrayAt(seedFixture, "accounts").map(item => item.role));
  for (const role of ["admin", "operator", "viewer", "integrator"]) {
    assert(accounts.has(role), `seed fixture missing account role: ${role}`);
  }

  const eventTypes = new Set(arrayAt(seedFixture, "eventTemplates").map(item => item.type));
  for (const type of ["presence", "enter", "exit", "line-crossing", "intrusion-dwell", "re-entry", "wrong-direction", "intrusion-after-line-crossing", "loitering", "zone-occupancy"]) {
    assert(eventTypes.has(type), `seed fixture missing event/scenario type: ${type}`);
  }

  const directions = new Set(arrayAt(seedFixture, "eventTemplates")
    .filter(item => item.type === "line-crossing")
    .map(item => item.direction));
  for (const direction of ["any", "forward", "reverse"]) {
    assert(directions.has(direction), `seed fixture missing line direction: ${direction}`);
  }

  const presets = new Set(arrayAt(seedFixture, "scenarioPresets"));
  for (const preset of ["default", "road", "retail", "park", "indoor", "lobby", "platform", "entrance", "doorway", "parking", "elevator", "custom"]) {
    assert(presets.has(preset), `seed fixture missing scenario preset: ${preset}`);
  }

  const trackerPairs = new Set(arrayAt(seedFixture, "profiles").map(item => `${item.trackingPolicy?.tracker}/${item.trackingPolicy?.reid}`));
  for (const pair of ["none/off", "lite/off", "kalman-lite/off", "bytetrack/off", "lite/assist", "kalman-lite/assist", "bytetrack/assist"]) {
    assert(trackerPairs.has(pair), `seed fixture missing tracker/Re-ID pair: ${pair}`);
  }
  assert(arrayAt(seedFixture, "invalidPolicyCases").some(item => item.trackingPolicy?.tracker === "none" && item.trackingPolicy?.reid === "assist"), "seed fixture missing tracker=none + reid=assist invalid case");
  assert(seedFixture.finalStateMinimums?.vaRules >= 12, "seed fixture must require at least 12 final VA rules");
});

runChecks();

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
      };
    });
}

function hasArea(area, token) {
  return area.split(",").map(item => item.trim()).includes(token);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function arrayAt(value, key) {
  const item = value?.[key];
  assert(Array.isArray(item), `${key} must be an array`);
  return item;
}

function requireText(text, needle, message) {
  assert(text.includes(needle), message);
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runChecks() {
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
  console.log("== Project feature/test inventory summary ==");
  console.log(`- featureRows: ${parseFeatureRows(inventory).length}`);
  console.log(`- seedFixture: ${seedFixturePath}`);
  console.log(`- pass: ${pass}`);
  console.log(`- fail: ${fail}`);
  if (fail > 0) process.exit(1);
}
