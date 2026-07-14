#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.6.0 S05 ScenarioEngine cross-zone re-entry 후보와 schema 불변 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const failures = [];

const header = readText("include/analysis/re_entry_scenario.h");
const scenario = readText("src/analysis/re_entry_scenario.cpp");
const ruleEngine = readText("src/analysis/event_rule_engine.cpp");
const stateSmoke = readText("scripts/internal/analysis_state_smoke.cpp");
const replayShell = readText("scripts/internal/verify_va_replay_baselines.sh");
const replayRules = readText("test/fixtures/va_replay/re_entry_cross_zone_rules.json");
const replayExpected = readText("test/fixtures/va_replay/re_entry_cross_zone_expected.json");
const server = readWebRtcHttpServerBundle(readText);
const pageScripts = readText("src/ingress/product_ui_page_scripts.cpp");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const videoDoc = readText("docs/video-analysis.md");
const uiGuide = readText("docs/ui-guide.md");
const configRef = readText("docs/config-reference.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");

check("roadmap records V260-S05 scenario extension boundary", () => {
  const hasCurrentRoadmapRow = /\| 5 \| V260-S05 \| P2 \| (진행|완료) \| Scenario extension \|/.test(backlog);
  const hasArchivedRoadmapRow = backlog.includes("| V260-S05 | 완료 | ScenarioEngine cross-zone re-entry 후보 |");
  assert(hasCurrentRoadmapRow || hasArchivedRoadmapRow,
    "backlog V260-S05 row must be present in current or archived roadmap format");
  for (const snippet of [
    "ScenarioEngine cross-zone re-entry",
    "A→B",
    "verify-v260-scenario-cross-zone-reentry",
  ]) {
    assertIncludes(backlog, snippet, "backlog S05 boundary");
  }
});

check("ReEntryScenario separates source and destination zones for configured-zones", () => {
  const scenarioEvaluateBlock = extractCppFunctionBlock(scenario, "ScenarioUpdate ReEntryScenario::Evaluate(");
  assert(scenarioEvaluateBlock.includes("update.confirmed = true;  // configured-zone re-entry confirmation"),
    "LAB-073 cross-zone update.confirmed product block readback mismatch");
  for (const snippet of [
    "std::string re_entry_mode{\"same-zone\"}",
    "std::vector<std::string> re_entry_zone_ids",
    "bool ConfiguredZoneMode() const",
    "bool SourceZoneAllowed",
    "bool EntryZoneAllowed",
    "bool IsRecentExitRecord",
  ]) {
    assertIncludes(header, snippet, "ReEntryScenario header");
  }
  for (const snippet of [
    "options_.re_entry_mode != \"configured-zones\"",
    "ConfiguredZoneMode()",
    "options_.re_entry_zone_ids",
    "EntryZoneAllowed(zone_state.current_zone)",
    "SourceZoneAllowed(zone_state.previous_zone)",
    "return &record;",
  ]) {
    assertIncludes(scenario, snippet, "ReEntryScenario implementation");
  }
});

check("stored rule scenario payload maps existing UI fields into runtime options", () => {
  for (const snippet of [
    "ParseStringField(scenario, \"reEntryMode\")",
    "ParseStringListFromFields(scenario, {\"reEntryZoneIds\"}, {\"reEntryZoneId\"})",
    "options.re_entry_mode",
    "options.re_entry_zone_ids",
  ]) {
    assertIncludes(ruleEngine, snippet, "EventRuleEngine re-entry parser");
  }
});

check("analysis state and replay baselines include A-to-B re-entry evidence", () => {
  for (const snippet of [
    "cross_zone_options.re_entry_mode = \"configured-zones\"",
    "cross_zone_options.re_entry_zone_ids = {\"restricted-b\"}",
    "Cross-zone ReEntry must emit when a track exits A and enters configured B inside the window",
    "ReEntryScenario emits configured cross-zone re-entry candidate",
  ]) {
    assertIncludes(stateSmoke, snippet, "analysis state smoke S05 case");
  }
  for (const snippet of [
    "re-entry-cross-zone",
    "re_entry_cross_zone_metadata.json",
    "re_entry_cross_zone_expected.json",
    "re_entry_cross_zone_rules.json",
  ]) {
    assertIncludes(replayShell, snippet, "VA replay S05 case");
  }
  assertIncludes(replayRules, "\"reEntryMode\": \"configured-zones\"", "cross-zone replay rules");
  assertIncludes(replayRules, "\"reEntryZoneIds\": [\"destination-zone\"]", "cross-zone replay rules");
  assertIncludes(replayExpected, "\"zoneId\": \"destination-zone\"", "cross-zone replay expected");
});

check("/ops/rules UI labels configured-zones as A-to-B review candidate", () => {
  for (const snippet of [
    "지정 영역 A→B 후보",
    "id=\"opsEventRuleReEntryModeSelect\"",
  ]) {
    assertIncludes(server, snippet, "ops rules re-entry mode select");
  }
  for (const snippet of [
    "A→B 후보",
    "source zone 이탈 후 reEntryZoneIds destination 진입",
    "A→B 지정 영역",
  ]) {
    assertIncludes(pageScripts, snippet, "ops rules S05 UI copy");
    assertIncludes(pageScripts, "reEntryZoneIds", "UI-049 canonical product state");
    assertIncludes(pageScripts, "/ops/rules", "UI-049 canonical route obligation");
    assertIncludes(pageScripts, "configured-zones", "UI-049 canonical field obligation");
  }
});

check("docs and inventory track S05 without claiming full UI or longrun evidence", () => {
  for (const snippet of [
    "configured-zones",
    "A→B",
    "Event POST payload schema, WebRTC/SSE/WS metadata schema",
  ]) {
    assertIncludes(videoDoc, snippet, "video analysis S05 docs");
    assertIncludes(uiGuide, snippet, "UI guide S05 docs");
  }
  assertIncludes(configRef, "A→B cross-zone 재진입 후보", "config reference S05 docs");
  for (const snippet of [
    "| V260-S05 Scenario extension | `UI-049`, `RULE-103`, `EVT-049`, `LAB-073`, `SAFE-056` | `verify-v260-scenario-cross-zone-reentry` |",
    "| UI-049 | `/ops/rules` ReEntry cross-zone review control |",
    "| RULE-103 | re-entry cross-zone A→B 후보 |",
    "| EVT-049 | ScenarioEngine cross-zone re-entry candidate |",
    "| LAB-073 | V260-S05 cross-zone re-entry replay/static guard |",
    "| SAFE-056 | V260-S05 scenario schema/media boundary |",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S05 row");
  }
  assertIncludes(streamVerification, "verify-v260-scenario-cross-zone-reentry", "stream verification S05 command");
  assertIncludes(serverSh, "verify-v260-scenario-cross-zone-reentry", "server.sh S05 command");
  assertIncludes(serverSh, "verify_v260_scenario_cross_zone_reentry.mjs", "server.sh S05 script target");
});

check("S05 keeps event type, external schema, media path, and client exposure side effects absent", () => {
  for (const forbidden of [
    "cross-zone-re-entry",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
    "/client/api/re-entry-cross-zone",
    "30분 테스트 PASS 완료",
    "120분 테스트 PASS 완료",
  ]) {
    assert(!header.includes(forbidden) &&
      !scenario.includes(forbidden) &&
      !ruleEngine.includes(forbidden) &&
      !server.includes(forbidden) &&
      !pageScripts.includes(forbidden) &&
      !inventory.includes(forbidden) &&
      !backlog.includes(forbidden),
    `forbidden S05 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.6.0 S05 scenario cross-zone re-entry 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.6.0 S05 scenario cross-zone re-entry 통과 ==");
console.log("[summary] analysis_state=required va_replay=required ui_rule_marker=present schema_media_boundary=unchanged");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
