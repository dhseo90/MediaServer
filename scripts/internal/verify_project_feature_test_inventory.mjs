#!/usr/bin/env node
// 파일 용도: 현재 릴리즈 기능별 UI 필요/테스트 영역 inventory가 실행 evidence와 분리되어 유지되는지 검증한다.

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
  - inventory pins the current release and states it is not execution evidence
  - all feature IDs use the current UI/test-area matrix shape
  - coverage, verifier, VA seed, 30-minute, 120-minute, and four-area boundaries exist
  - manual UI docs reference the feature inventory
  - the manual UI VA seed matrix fixture covers API-ready numeric IDs, basic events, scenarios, presets, tracker/Re-ID policies, and invalid policy cases
  - the manual UI seed dry-run command is documented as preparation, not evidence
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
const agents = readText("AGENTS.md");
const seedFixturePath = "test/fixtures/manual_ui_fulltest_va_seed_matrix.json";
const seedFixtureText = readText(seedFixturePath);
const seedFixture = JSON.parse(seedFixtureText);
const currentVersion = readText("VERSION").trim();
const currentTag = `v${currentVersion}`;

const checks = [];

check("docs index references feature inventory", () => {
  requireText(docsIndex, "project-feature-test-inventory.md", "docs index missing inventory link");
});

check("feature inventory pins current release scope", () => {
  requireText(inventory, `현재 release 목표 \`${currentTag}\``, `inventory does not pin ${currentTag}`);
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
    "## Coverage Start Conditions",
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
  const declaredTotal = summaryCount(inventory, "전체 기능 항목");
  assert(rows.length === declaredTotal, `expected ${declaredTotal} feature rows, found ${rows.length}`);
  const ids = rows.map(row => row.id);
  assert(new Set(ids).size === ids.length, "duplicate feature IDs in inventory");
  for (const prefix of ["UI", "AUTH", "SRC", "RULE", "EVT", "CLIENT", "MEDIA", "LAB", "SAFE", "OPS"]) {
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
    soak120: rows.filter(row => hasArea(row.area, "120분")).length,
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
    ["120분 대상", counts.soak120],
  ];
  for (const [label, count] of expected) {
    requireText(inventory, `| ${label} | ${count} |`, `summary count mismatch for ${label}: ${count}`);
    console.log(`[pass] inventory summary count ${label} ${count}`);
  }
});

check("feature rows have required matrix columns", () => {
  const allowedAreas = new Set(["안정화", "30분", "120분", "UI"]);
  for (const row of parseFeatureRows(inventory)) {
    assert(row.id, "feature row missing ID");
    assert(row.feature, `feature row ${row.id} missing feature`);
    assert(["필요", "간접", "비대상"].includes(row.uiNeed), `feature row ${row.id} has invalid UI need: ${row.uiNeed}`);
    assert(row.testNeed === "필요", `feature row ${row.id} must mark test need as 필요`);
    assert(row.area, `feature row ${row.id} missing test area`);
    for (const area of splitAreas(row.area)) {
      assert(allowedAreas.has(area), `feature row ${row.id} has unsupported test area: ${area}`);
    }
    assert(row.pass, `feature row ${row.id} missing PASS criteria`);
    console.log(`[pass] feature ${row.id} name present`);
    console.log(`[pass] feature ${row.id} UI need ${row.uiNeed}`);
    console.log(`[pass] feature ${row.id} test need ${row.testNeed}`);
    console.log(`[pass] feature ${row.id} test area assigned`);
    console.log(`[pass] feature ${row.id} pass criteria present`);
  }
});

check("inventory rejects separate test-area labels", () => {
  const featureAreaText = parseFeatureRows(inventory).map(row => row.area).join("\n");
  for (const forbidden of [
    "필드 별도",
    "field 별도",
    "30분 조건부",
    "120분 조건부",
    "field-smoke-or-exclusion",
    "field exclusion",
  ]) {
    assert(!featureAreaText.includes(forbidden), `inventory must not contain unsupported test-area wording: ${forbidden}`);
  }
});

check("coverage wording separates mapping from execution", () => {
  for (const phrase of [
    "실제 안정화 테스트,",
    "UI 풀테스트를 실행했다는 뜻이 아닙니다.",
    "| 제품 UI 위치 |",
    "| UI 풀테스트 결과 |",
    "| VA seed 데이터 |",
    "dry-run 준비 가능, 서버 적용 evidence 없음",
    "Verifier Coverage Map",
    "실제 UI 이벤트 발생 전수 evidence 없음",
    "inventory 단독으로 UI PASS 판정 불가",
    "결과 문서 없이 inventory만으로 UI PASS 판정 불가",
  ]) {
    requireText(inventory, phrase, `inventory missing coverage boundary wording: ${phrase}`);
  }
});

check("current feature expansion rows exist", () => {
  const requiredRows = [
    "UI-025",
    "UI-026",
    "UI-027",
    "UI-028",
    "UI-029",
    "UI-030",
    "UI-031",
    "UI-032",
    "UI-033",
    "UI-034",
    "UI-035",
    "UI-036",
    "UI-037",
    "UI-038",
    "UI-039",
    "UI-040",
    "UI-041",
    "UI-042",
    "UI-043",
    "UI-044",
    "UI-045",
    "UI-046",
    "UI-047",
    "UI-048",
    "UI-049",
    "UI-050",
    "UI-051",
    "UI-052",
    "UI-053",
    "UI-054",
    "UI-055",
    "UI-056",
    "UI-057",
    "UI-058",
    "UI-059",
    "UI-060",
    "UI-061",
    "SRC-031",
    "SRC-032",
    "RULE-103",
    "RULE-104",
    "EVT-029",
    "EVT-030",
    "EVT-031",
    "EVT-032",
    "EVT-033",
    "EVT-034",
    "EVT-035",
    "EVT-036",
    "EVT-037",
    "EVT-038",
    "EVT-039",
    "EVT-040",
    "EVT-041",
    "EVT-042",
    "EVT-043",
    "EVT-044",
    "EVT-045",
    "EVT-046",
    "EVT-047",
    "EVT-048",
    "EVT-049",
    "EVT-050",
    "EVT-051",
    "EVT-052",
    "EVT-053",
    "EVT-054",
    "EVT-055",
    "EVT-056",
    "EVT-057",
    "EVT-058",
    "EVT-059",
    "EVT-060",
    "EVT-061",
    "EVT-062",
    "CLIENT-023",
    "CLIENT-024",
    "CLIENT-025",
    "CLIENT-026",
    "OPS-036",
    "OPS-037",
    "OPS-038",
    "OPS-039",
    "OPS-040",
    "OPS-041",
    "OPS-042",
    "OPS-043",
    "OPS-044",
    "OPS-045",
    "OPS-046",
    "OPS-047",
    "OPS-048",
    "OPS-049",
    "OPS-050",
    "OPS-051",
    "OPS-052",
    "OPS-053",
    "OPS-054",
    "OPS-055",
    "OPS-056",
    "OPS-057",
    "OPS-058",
    "OPS-059",
    "OPS-063",
    "MEDIA-021",
    "LAB-045",
    "LAB-046",
    "LAB-047",
    "LAB-048",
    "LAB-049",
    "LAB-050",
    "LAB-051",
    "LAB-052",
    "LAB-053",
    "LAB-054",
    "LAB-055",
    "LAB-056",
    "LAB-057",
    "LAB-058",
    "LAB-059",
    "LAB-060",
    "LAB-061",
    "LAB-062",
    "LAB-063",
    "LAB-064",
    "LAB-065",
    "LAB-066",
    "LAB-067",
    "LAB-068",
    "LAB-069",
    "LAB-070",
    "LAB-071",
    "LAB-072",
    "LAB-073",
    "LAB-074",
    "LAB-075",
    "LAB-076",
    "LAB-077",
    "LAB-078",
    "LAB-079",
    "LAB-080",
    "LAB-081",
    "LAB-082",
    "LAB-083",
    "LAB-084",
    "LAB-085",
    "LAB-086",
    "LAB-087",
    "LAB-088",
    "SAFE-025",
    "SAFE-026",
    "SAFE-027",
    "SAFE-028",
    "SAFE-029",
    "SAFE-030",
    "SAFE-031",
    "SAFE-032",
    "SAFE-033",
    "SAFE-034",
    "SAFE-035",
    "SAFE-036",
    "SAFE-037",
    "SAFE-038",
    "SAFE-039",
    "SAFE-040",
    "SAFE-041",
    "SAFE-042",
    "SAFE-043",
    "SAFE-044",
    "SAFE-045",
    "SAFE-046",
    "SAFE-047",
    "SAFE-048",
    "SAFE-049",
    "SAFE-050",
    "SAFE-051",
    "SAFE-052",
    "SAFE-053",
    "SAFE-054",
    "SAFE-055",
    "SAFE-056",
    "SAFE-057",
    "SAFE-058",
    "SAFE-059",
    "SAFE-060",
    "SAFE-061",
    "SAFE-062",
    "SAFE-063",
    "SAFE-064",
    "SAFE-065",
    "SAFE-066",
    "SAFE-067",
    "SAFE-068",
    "SAFE-069",
    "SAFE-070",
    "SAFE-071",
    "SAFE-072",
    "SAFE-073",
    "SAFE-074",
    "SAFE-075",
    "SAFE-076",
    "SAFE-077",
    "SAFE-078",
    "SAFE-079",
    "SAFE-080",
    "SAFE-081",
    "SAFE-082",
    "SAFE-083",
    "SAFE-084",
    "SAFE-085",
    "SAFE-086",
    "SAFE-087",
    "SAFE-088",
    "SAFE-089",
    "SAFE-090",
    "SAFE-091",
    "SAFE-092",
    "SAFE-093",
    "SAFE-094",
    "SAFE-095",
    "SAFE-096",
    "OPS-060",
    "OPS-061",
    "OPS-062",
    "OPS-064",
    "OPS-065",
    "OPS-066",
    "OPS-067",
    "OPS-068",
    "SAFE-097",
    "SAFE-098",
    "SAFE-099",
    "SAFE-100",
    "SAFE-101",
    "LAB-089",
    "OPS-069",
    "SAFE-102",
    "EVT-063",
    "SAFE-103",
    "OPS-070",
    "UI-062",
    "EVT-064",
    "SAFE-104",
    "OPS-071",
    "UI-063",
    "EVT-065",
    "SAFE-105",
    "OPS-072",
    "UI-064",
    "EVT-066",
    "SAFE-106",
    "OPS-073",
    "UI-065",
    "EVT-067",
    "SAFE-107",
    "OPS-074",
    "UI-066",
    "EVT-068",
    "SAFE-108",
    "OPS-075",
    "UI-067",
    "EVT-069",
    "SAFE-109",
    "OPS-076",
    "UI-069",
    "EVT-070",
    "SAFE-111",
    "OPS-078",
    "SAFE-112",
    "OPS-079",
    "SAFE-113",
    "OPS-080",
    "SRC-033",
    "SAFE-114",
    "OPS-081",
    "SRC-034",
    "SAFE-115",
    "OPS-082",
    "SRC-035",
    "SAFE-116",
    "OPS-083",
  ];
  const ids = new Set(parseFeatureRows(inventory).map(row => row.id));
  for (const id of requiredRows) {
    assert(ids.has(id), `missing current expanded feature row: ${id}`);
  }
  for (const snippet of [
    "`UI-001`~`UI-018`, `UI-022`~`UI-069`",
    "`SRC-001`~`SRC-035`",
    "`EVT-001`~`EVT-070`",
    "`MEDIA-001`~`MEDIA-021`",
    "`LAB-001`~`LAB-089`",
    "`SAFE-001`~`SAFE-116`",
    "`OPS-035`~`OPS-083`",
    "VLM route, control, action, runtime state, sidecar, privacy guard",
    "V300-S02 Frame Bundle Extraction",
    "V300-S03 Feature Schema and Privacy Policy",
    "V300-S04 VLM Feature Queue",
    "V300-S05 Feature-only Retention",
    "V300-S07 Feature/Search Index",
    "V300-S09 Retention/Pin/Cleanup",
    "V300-S10 Stabilization and Release Readiness",
    "V310-S00 Baseline/source-of-truth",
    "V310-S01 Encoded Event Clip Contract",
    "V310-S05 Scoped Integrator Search API",
    "V310-S06 Operator Feature Correction",
    "V310-S07 Optional Vector Search",
    "V310-S08 Retention/Export Hardening",
    "V310-S09 Stabilization and Release Readiness",
    "v3.2.0 (1) v3.2.0 baseline 정렬",
    "v3.2.0 (2) Resolution State Contract",
    "CLIENT-026",
    "SAFE-097",
    "OPS-064",
    "UI-061",
    "EVT-061",
    "EVT-062",
    "LAB-089",
    "SAFE-098",
    "OPS-065",
    "SAFE-099",
    "OPS-066",
    "SAFE-100",
    "OPS-067",
    "SAFE-101",
    "OPS-068",
    "SAFE-102",
    "OPS-069",
    "EVT-063",
    "SAFE-103",
    "OPS-070",
    "v3.2.0 (3) Unified Ops Events Workspace",
    "UI-062",
    "EVT-064",
    "SAFE-104",
    "OPS-071",
    "v3.2.0 (4) Evidence Quality Layer",
    "UI-063",
    "EVT-065",
    "SAFE-105",
    "OPS-072",
    "v3.2.0 (5) Source Reliability Context",
    "UI-064",
    "EVT-066",
    "SAFE-106",
    "OPS-073",
    "v3.2.0 (6) AI Review Quality Context",
    "UI-065",
    "EVT-067",
    "SAFE-107",
    "OPS-074",
    "v3.2.0 (7) Operator Resolution Flow",
    "UI-066",
    "EVT-068",
    "SAFE-108",
    "OPS-075",
    "v3.2.0 (8) Action Readiness Checklist",
    "UI-067",
    "EVT-069",
    "SAFE-109",
    "OPS-076",
    "v3.2.0 (9) Client-safe Resolution Digest",
    "UI-068",
    "CLIENT-027",
    "SAFE-110",
    "OPS-077",
    "v3.2.0 (10) Resolution Search & Metrics",
    "UI-069",
    "EVT-070",
    "SAFE-111",
    "OPS-078",
    "v3.2.0 (11) Stabilization and Release Readiness",
    "SAFE-112",
    "OPS-079",
    "v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬",
    "SAFE-113",
    "OPS-080",
    "v3.3.0 (2) Source Registry Snapshot and Identity",
    "SRC-033",
    "SAFE-114",
    "OPS-081",
    "v3.3.0 (3) Source Onboarding Quality Summary",
    "SRC-034",
    "SAFE-115",
    "OPS-082",
    "v3.3.0 (4) Reliability Timeline and Health History",
    "SRC-035",
    "SAFE-116",
    "OPS-083",
  ]) {
    requireText(inventory, snippet, `inventory missing current expansion snippet: ${snippet}`);
  }
});

check("manual UI docs reference inventory", () => {
  for (const [label, text] of [
    ["manual-ui-fulltest.md", fulltest],
    ["manual-ui-checklist.md", checklist],
    ["manual-ui-result-template.md", template],
    ["stream-verification.md", streamVerification],
    ["release-evidence-index.md", releaseEvidence],
  ]) {
    requireText(text, "project-feature-test-inventory.md", `${label} missing inventory reference`);
  }
});

check("manual checklist references seed fixture", () => {
  requireText(checklist, seedFixturePath, "manual checklist missing VA seed fixture path");
  requireText(checklist, "prepare-manual-ui-fulltest-seed --dry-run", "manual checklist missing seed dry-run command");
  requireText(checklist, "--emit-registry-dir <dir>", "manual checklist missing seed registry dir command");
});

check("manual result template references seed fixture", () => {
  requireText(template, seedFixturePath, "manual result template missing VA seed fixture path");
  requireText(template, "prepare-manual-ui-fulltest-seed --dry-run", "manual result template missing seed dry-run command");
  requireText(template, "seed registry dir", "manual result template missing seed registry dir field");
  requireText(template, "## VA Seed / 최종 룰 상태", "manual result template missing VA seed result section");
});

check("AGENTS requires individual future feature test rows", () => {
  for (const phrase of [
    "VA rule, scenario, tracker, Re-ID처럼 기능 축이 늘어나는 경우",
    "각 event type, scenario type, line direction",
    "tracker policy, Re-ID policy, invalid 조합",
    "각각 독립 기능 ID/결과 행으로 추가한다.",
    "기능별 테스트 결과 행의 판정값은 `PASS`와 `FAIL`만 쓴다.",
    "`제외 기록`에만 남긴다.",
  ]) {
    requireText(agents, phrase, `AGENTS.md missing future feature test rule: ${phrase}`);
  }
});

check("manual UI VA seed matrix covers required current release cases", () => {
  assert(seedFixture.schema === "media-server.manual-ui-fulltest-va-seed-matrix.v1", "unexpected seed fixture schema");
  assert(seedFixture.releaseTarget === currentTag, `seed fixture must pin ${currentTag}`);
  assert(seedFixture.usageBoundary?.notEvidenceUntilAppliedAndVerified === true, "seed fixture must not be evidence by itself");
  assert(seedFixture.usageBoundary?.keepFinalRulesForEventLogReview === true, "seed fixture must preserve final rules for event review");
  assert(seedFixture.usageBoundary?.separateCrudFromScenarioEventReview === true, "seed fixture must separate CRUD from event review");

  const accounts = new Set(arrayAt(seedFixture, "accounts").map(item => item.role));
  for (const role of ["admin", "operator", "viewer", "integrator"]) {
    assert(accounts.has(role), `seed fixture missing account role: ${role}`);
    console.log(`[pass] manual UI seed account role ${role}`);
  }

  const profileIds = new Set();
  for (const profile of arrayAt(seedFixture, "profiles")) {
    assert(/^\d+$/.test(String(profile.id || "")), `seed fixture profile id must be numeric: ${profile.id}`);
    assert(!["1", "2", "3", "4", "5"].includes(String(profile.id)), `seed fixture profile id is reserved: ${profile.id}`);
    assert(profile.payload?.id === profile.id, `seed fixture profile payload id mismatch: ${profile.id}`);
    assert(Array.isArray(profile.payload?.trackingClasses) && profile.payload.trackingClasses.length > 0, `seed fixture profile missing trackingClasses: ${profile.id}`);
    assert(profile.payload?.analysis?.trackingPolicy === undefined, `seed fixture profile must not place trackingPolicy in profile payload: ${profile.id}`);
    profileIds.add(String(profile.id));
    console.log(`[pass] manual UI seed profile ${profile.id} numeric id`);
    console.log(`[pass] manual UI seed profile ${profile.id} tracking classes present`);
  }

  const eventTypes = new Set(arrayAt(seedFixture, "eventTemplates").map(item => item.type));
  for (const type of ["presence", "enter", "exit", "line-crossing", "intrusion-dwell", "re-entry", "wrong-direction", "intrusion-after-line-crossing", "loitering", "zone-occupancy"]) {
    assert(eventTypes.has(type), `seed fixture missing event/scenario type: ${type}`);
    console.log(`[pass] manual UI seed event type ${type}`);
  }
  const eventTemplateIds = new Set();
  const trackerPairs = new Set();
  for (const item of arrayAt(seedFixture, "eventTemplates")) {
    assert(/^\d+$/.test(String(item.id || "")), `seed fixture event template id must be numeric: ${item.id}`);
    assert(item.payload?.id === item.id, `seed fixture event template payload id mismatch: ${item.id}`);
    assert(item.payload?.event?.type === item.type, `seed fixture event template type mismatch: ${item.id}`);
    assert(profileIds.has(String(item.payload?.analysis?.profileId || "")), `seed fixture event template missing profile reference: ${item.id}`);
    trackerPairs.add(trackerPairFromPayload(item.payload, `event template ${item.id}`));
    eventTemplateIds.add(String(item.id));
    console.log(`[pass] manual UI seed event template ${item.id} numeric id`);
    console.log(`[pass] manual UI seed event template ${item.id} event type ${item.type}`);
    console.log(`[pass] manual UI seed event template ${item.id} profile reference`);
  }

  const directions = new Set(arrayAt(seedFixture, "eventTemplates")
    .filter(item => item.type === "line-crossing")
    .map(item => item.direction || item.payload?.event?.region?.direction));
  for (const direction of ["any", "forward", "reverse"]) {
    assert(directions.has(direction), `seed fixture missing line direction: ${direction}`);
    console.log(`[pass] manual UI seed line direction ${direction}`);
  }

  const presets = new Set(arrayAt(seedFixture, "scenarioPresets"));
  for (const preset of ["default", "road", "retail", "park", "indoor", "lobby", "platform", "entrance", "doorway", "parking", "elevator", "custom"]) {
    assert(presets.has(preset), `seed fixture missing scenario preset: ${preset}`);
    console.log(`[pass] manual UI seed scenario preset ${preset}`);
  }

  for (const item of arrayAt(seedFixture, "vaRules")) {
    assert(/^\d+$/.test(String(item.id || "")), `seed fixture vaRule id must be numeric: ${item.id}`);
    assert(item.payload?.id === item.id, `seed fixture vaRule payload id mismatch: ${item.id}`);
    assert(profileIds.has(String(item.profileId || "")), `seed fixture vaRule missing profile reference: ${item.id}`);
    assert(eventTemplateIds.has(String(item.eventTemplateId || "")), `seed fixture vaRule missing event template reference: ${item.id}`);
    assert(item.payload?.analysis?.profileId === item.profileId, `seed fixture vaRule profile payload mismatch: ${item.id}`);
    assert(item.payload?.templateStart?.ruleId === item.eventTemplateId, `seed fixture vaRule template payload mismatch: ${item.id}`);
    trackerPairs.add(trackerPairFromPayload(item.payload, `vaRule ${item.id}`));
    console.log(`[pass] manual UI seed vaRule ${item.id} numeric id`);
    console.log(`[pass] manual UI seed vaRule ${item.id} profile reference`);
    console.log(`[pass] manual UI seed vaRule ${item.id} event template reference`);
  }
  for (const pair of ["none/off", "lite/off", "kalman-lite/off", "bytetrack/off", "lite/assist", "kalman-lite/assist", "bytetrack/assist"]) {
    assert(trackerPairs.has(pair), `seed fixture missing tracker/Re-ID pair: ${pair}`);
    console.log(`[pass] manual UI seed tracker Re-ID pair ${pair}`);
  }
  assert(arrayAt(seedFixture, "invalidPolicyCases").some(item => item.payload?.analysis?.trackingPolicy?.tracker === "none" && item.payload?.analysis?.trackingPolicy?.reid === "assist" && item.expected === "reject"), "seed fixture missing tracker=none + reid=assist invalid case");
  console.log("[pass] manual UI seed invalid policy tracker none Re-ID assist");
  assert(seedFixture.finalStateMinimums?.vaRules >= 12, "seed fixture must require at least 12 final VA rules");
  console.log("[pass] manual UI seed final state minimum vaRules");
  requireText(inventory, "registry 파일 준비", "inventory missing registry materialization row");
  requireText(inventory, "preconditions.json", "inventory missing registry preconditions file");
});

runChecks();

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d+ \|/.test(line))
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
  return splitAreas(area).includes(token);
}

function splitAreas(area) {
  return area.split(",").map(item => item.trim()).filter(Boolean);
}

function summaryCount(text, label) {
  const pattern = new RegExp(`^\\| ${escapeRegex(label)} \\| (\\d+) \\|$`, "m");
  const match = text.match(pattern);
  assert(match, `missing summary count for ${label}`);
  return Number(match[1]);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function arrayAt(value, key) {
  const item = value?.[key];
  assert(Array.isArray(item), `${key} must be an array`);
  return item;
}

function trackerPairFromPayload(payload, label) {
  const policy = payload?.analysis?.trackingPolicy;
  assert(policy && typeof policy === "object", `${label} missing analysis.trackingPolicy`);
  const tracker = String(policy.tracker || "").trim();
  const reid = String(policy.reid || "off").trim();
  assert(["none", "lite", "kalman-lite", "bytetrack"].includes(tracker), `${label} invalid tracker: ${tracker}`);
  assert(["off", "assist"].includes(reid), `${label} invalid Re-ID: ${reid}`);
  if (tracker === "none" && reid !== "off") {
    assert(label.startsWith("invalid"), `${label} uses invalid tracker/Re-ID pair`);
  }
  return `${tracker}/${reid}`;
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
