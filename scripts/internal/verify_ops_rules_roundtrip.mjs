#!/usr/bin/env node
// 파일 용도: Ops 룰 저장/조회와 오프라인 VA replay의 실제 runtime 결속을 함께 검증한다.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { nextNumericIds } from "./numeric_id_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops rules round-trip smoke

Usage:
  ./server.sh verify-ops-rules-roundtrip [options]

Options:
  --http-base <url>  실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --token <value>    token auth 서버의 관리자 bearer token입니다.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["http-base", "token", "h", "help"]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const bearerToken = String(args.token || "").trim();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
let replayOutputDir = "";
let replayBinaryReady = false;

const catalog = await requestJson("/ops/api/rules/catalog");
const rulesShell = await requestText("/ops/rules");
const usedIds = new Set([
  ...(Array.isArray(catalog.rules) ? catalog.rules : []).map((item) => String(item?.id || "")),
  ...(Array.isArray(catalog.vaRules) ? catalog.vaRules : []).map((item) => String(item?.id || "")),
]);
const ids = nextNumericIds(usedIds, { count: 20, start: 9801, end: 9999, label: "ops rules roundtrip id" });
assertRuleCatalogLists(catalog, ids);
assertGeneratedRuleIdUiReadback(rulesShell);

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
        direction: "any",
        points: [{ x: 0.5, y: 0.0 }, { x: 0.5, y: 1.0 }],
      },
      minConfidence: 0.1,
      minDurationMs: 0,
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
        points: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.5 }, { x: 0.1, y: 0.5 }],
      },
      minConfidence: 0.1,
      minDurationMs: 0,
    },
    scenario: {
      type: "re-entry",
      enabled: true,
      reEntryWindowMs: 3000,
      reEntryMode: "configured-zones",
      reEntryZoneIds: [ids[11]],
      cooldownMs: 1000,
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
  {
    id: ids[3],
    enabled: true,
    ruleKind: "basic",
    analysis: {
      classes: ["person"],
      trackingPolicy: { tracker: "bytetrack", reid: "assist" },
    },
    event: {
      type: "presence",
      region: {
        type: "polygon",
        points: [{ x: 0.25, y: 0.22 }, { x: 0.76, y: 0.22 }, { x: 0.74, y: 0.76 }, { x: 0.25, y: 0.74 }],
      },
      minConfidence: 0.31,
      minDurationMs: 0,
    },
  },
  {
    id: ids[7],
    enabled: true,
    ruleKind: "basic",
    analysis: { classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } },
    event: {
      type: "enter",
      region: {
        type: "polygon",
        points: [{ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.2 }, { x: 0.7, y: 0.8 }, { x: 0.3, y: 0.8 }],
      },
      minConfidence: 0.29,
      minDurationMs: 0,
    },
  },
  {
    id: ids[8],
    enabled: true,
    ruleKind: "basic",
    analysis: { classes: ["person"] },
    event: {
      type: "exit",
      region: {
        type: "polygon",
        points: [{ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.2 }, { x: 0.7, y: 0.8 }, { x: 0.3, y: 0.8 }],
      },
      minConfidence: 0.29,
      minDurationMs: 0,
    },
  },
  {
    id: ids[9],
    enabled: true,
    ruleKind: "scenario",
    analysis: { classes: ["person"] },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }],
      },
      minConfidence: 0.3,
      minDurationMs: 1000,
    },
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 500,
      dwellTimeMs: 2000,
      cooldownMs: 1000,
      targetClasses: ["person"],
      restrictedZoneIds: [ids[9]],
    },
  },
  {
    id: ids[10],
    enabled: true,
    ruleKind: "scenario",
    analysis: { classes: ["person"] },
    event: {
      type: "wrong-direction",
      region: {
        type: "line",
        direction: "forward",
        points: [{ x: 0.5, y: 0.05 }, { x: 0.5, y: 0.95 }],
      },
      minConfidence: 0.3,
      minDurationMs: 0,
    },
    scenario: {
      type: "wrong-direction",
      enabled: true,
      cooldownMs: 1000,
      targetClasses: ["person"],
      targetLineIds: [ids[10]],
      allowedDirection: "forward",
    },
  },
  {
    id: ids[11], enabled: true, ruleKind: "basic", analysis: { classes: ["person"] },
    event: { type: "presence", region: { type: "polygon", points: [{ x: 0.7, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.5 }, { x: 0.7, y: 0.5 }] }, minConfidence: 0.99, minDurationMs: 0 },
  },
  {
    id: ids[12], enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
    event: { type: "intrusion-after-line-crossing", region: { type: "polygon", points: [{ x: 0.65, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.5 }, { x: 0.65, y: 0.5 }] }, minConfidence: 0.1, minDurationMs: 0 },
    scenario: { type: "intrusion-after-line-crossing", enabled: true, maxDelayAfterCrossingMs: 5000, dwellTimeMs: 2000, cooldownMs: 1000, targetZoneIds: [ids[17]], triggerLine: { id: ids[16], direction: "reverse", points: [{ x: 0.5, y: 0.0 }, { x: 0.5, y: 1.0 }] } },
  },
  {
    id: ids[13], enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
    event: { type: "loitering", region: { type: "polygon", points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }] }, minConfidence: 0.3, minDurationMs: 0 },
    scenario: { type: "loitering", enabled: true, minDwellTimeMs: 3000, maxMovementRadius: 0.08, minTrajectoryPoints: 4, cooldownMs: 1000, restrictedZoneIds: [ids[13]], useGroundPlaneMovementRadius: true },
  },
  {
    id: ids[14], enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
    event: { type: "zone-occupancy", region: { type: "polygon", points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }] }, minConfidence: 0.3, minDurationMs: 0 },
    scenario: { type: "zone-occupancy", enabled: true, occupancyThreshold: 2, minDwellTimeMs: 1000, cooldownMs: 1000, restrictedZoneIds: [ids[14]] },
  },
  {
    id: ids[15], enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
    event: { type: "re-entry", region: { type: "polygon", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.1, y: 0.5 }] }, minConfidence: 0.1, minDurationMs: 0 },
    scenario: { type: "re-entry", enabled: true, reEntryWindowMs: 3000, cooldownMs: 1000, targetClasses: ["person"] },
  },
  {
    id: ids[16], enabled: true, ruleKind: "basic", analysis: { classes: ["person"] },
    event: { type: "presence", region: { type: "line", direction: "any", points: [{ x: 0.5, y: 0.0 }, { x: 0.5, y: 1.0 }] }, minConfidence: 0.99, minDurationMs: 0 },
  },
  {
    id: ids[17], enabled: true, ruleKind: "basic", analysis: { classes: ["person"] },
    event: { type: "presence", region: { type: "polygon", points: [{ x: 0.65, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.5 }, { x: 0.65, y: 0.5 }] }, minConfidence: 0.99, minDurationMs: 0 },
  },
];

const created = [];
const storedRuleReadbacks = [];
const createdVaRules = [];
const createdProfiles = [];
try {
  for (const payload of fixtures) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    created.push(payload.id);
    const readback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(payload.id)}`);
    storedRuleReadbacks.push(readback.rule);
    assertRuleRoundTrip(payload, readback.rule);
    assertRuleTemplateSemanticReadback(payload, readback.rule, rulesShell);
    assertScenarioRuleSemanticReadback(payload, readback.rule);
    console.log(`[pass] roundtrip ${payload.id}: ${payload.event.type}`);
  }
  const presetBase = fixtures.find(item => item.event.type === "intrusion-dwell");
  for (const [index, presetId] of ["default", "road", "retail", "park", "indoor", "lobby", "platform", "entrance", "doorway", "parking", "elevator", "custom"].entries()) {
    const presetPayload = {
      ...presetBase,
      scenario: {
        ...presetBase.scenario,
        presetId,
        candidateTimeMs: 500 + index * 10,
        dwellTimeMs: 2000 + index * 20,
        cooldownMs: 1000 + index * 30,
      },
    };
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(presetPayload.id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(presetPayload),
    });
    const presetReadback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(presetPayload.id)}`);
    assertScenarioPresetReadback(presetReadback.rule, presetPayload, rulesShell);
  }
  const eventTemplateList = await requestJson("/lab/analysis/rules");
  assertEventTemplateListReadback(eventTemplateList, fixtures);
  assertEventTemplateDetailReadback((await requestJson(`/lab/analysis/rules/${encodeURIComponent(fixtures[1].id)}`)).rule, fixtures[1]);

  const updatedTemplate = {
    ...fixtures[0],
    event: { ...fixtures[0].event, minConfidence: 0.55, region: { ...fixtures[0].event.region, direction: "forward" } },
  };
  const updatedTemplateResponse = await requestJson(`/lab/analysis/rules/${encodeURIComponent(updatedTemplate.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedTemplate),
  });
  const updatedTemplateReadback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(updatedTemplate.id)}`);
  assertEventTemplateUpdateReadback(updatedTemplateResponse, updatedTemplateReadback.rule, updatedTemplate);
  assertEqual(updatedTemplateReadback.rule?.event?.region?.direction, "forward", "RULE-046 UpsertRule forward line direction readback");
  const reverseTemplate = {
    ...updatedTemplate,
    event: { ...updatedTemplate.event, region: { ...updatedTemplate.event.region, direction: "reverse" } },
  };
  await requestJson(`/lab/analysis/rules/${encodeURIComponent(reverseTemplate.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reverseTemplate),
  });
  const reverseTemplateReadback = await requestJson(`/lab/analysis/rules/${encodeURIComponent(reverseTemplate.id)}`);
  assertEqual(reverseTemplateReadback.rule?.event?.region?.direction, "reverse", "RULE-047 UpsertRule reverse line direction readback");
  assertRuleWorkflowRuntimeReplayReadback(rulesShell, storedRuleReadbacks, updatedTemplateReadback.rule, reverseTemplateReadback.rule);
  const duplicateTemplateError = await assertRequestFails("/lab/analysis/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fixtures[0]),
  }, "analysis document id already exists");
  console.log("[pass] duplicate event template create rejects existing id");
  const duplicateVaRule = {
    id: ids[4],
    name: "Roundtrip Channel Analysis Setting",
    priority: 812,
    enabled: true,
    source: { kind: "file", file: "rule-roundtrip-duplicate-id.mp4" },
    analysis: {
      profileId: "1",
      classes: ["person", "vehicle"],
      trackingPolicy: { tracker: "none", reid: "off" },
    },
    templateStart: { ruleId: fixtures[0].id },
    binding: { urlMode: `vaRule=${ids[4]}`, sourceLocked: true, sourceOverrideAllowed: false },
    event: fixtures[0].event,
  };
  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(duplicateVaRule.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duplicateVaRule),
  });
  createdVaRules.push(duplicateVaRule.id);
  const vaRuleReadback = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(duplicateVaRule.id)}`);
  const storedVaRule = vaRuleReadback.vaRule;
  assertVaRuleCreateDetailReadback(storedVaRule, duplicateVaRule);
  assertVaRuleTrackingStorageReadback(storedVaRule, duplicateVaRule.analysis.trackingPolicy);
  for (const trackingPolicy of [
    { tracker: "lite", reid: "off" },
    { tracker: "kalman-lite", reid: "off" },
    { tracker: "bytetrack", reid: "assist" },
  ]) {
    const policyPayload = {
      ...duplicateVaRule,
      analysis: { ...duplicateVaRule.analysis, trackingPolicy },
    };
    await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(policyPayload.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policyPayload),
    });
    const policyReadback = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(policyPayload.id)}`);
    assertVaRuleTrackingStorageReadback(policyReadback.vaRule, trackingPolicy);
  }
  assertEqual(storedVaRule?.id, duplicateVaRule.id, "stored vaRule.id");
  assertEqual(storedVaRule?.analysis?.profileId, duplicateVaRule.analysis.profileId, "stored vaRule.analysis.profileId");
  const ruleProfileProjection = {
    ruleId: typeof storedVaRule?.id,
    profileId: typeof storedVaRule?.analysis?.profileId,
    sourceKind: typeof storedVaRule?.source?.kind,
    templateRuleId: typeof storedVaRule?.templateStart?.ruleId,
  };
  const ruleProfileProjectionSha256 = crypto.createHash("sha256").update(JSON.stringify(ruleProfileProjection)).digest("hex");
  assertEqual(ruleProfileProjectionSha256, "71271658be99bff1f4782ce82c8245fa50d933a70e78b6f277201c15bc32d9c0", "Rule/Profile storage field/type freeze SHA-256");
  const duplicateVaRuleError = await assertRequestFails("/lab/analysis/va-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(duplicateVaRule),
  }, "vaRule id already exists");
  assertEqual(duplicateTemplateError.includes("analysis document id already exists") && duplicateVaRuleError.includes("vaRule id already exists"), true, "RULE-092 duplicate event-template/vaRule id rejection readback");
  console.log("[pass] duplicate vaRule create rejects existing id");
  const updatedVaRule = {
    ...duplicateVaRule,
    name: "Roundtrip Channel Analysis Setting Updated",
    enabled: false,
    event: { ...duplicateVaRule.event, minConfidence: 0.61 },
  };
  const updatedVaRuleResponse = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(updatedVaRule.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedVaRule),
  });
  const updatedVaRuleReadback = await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(updatedVaRule.id)}`);
  assertVaRuleUpdateStatusReadback(updatedVaRuleResponse, updatedVaRuleReadback.vaRule, updatedVaRule);
  const invalidTrackerNoneAssist = await assertRequestFails(`/lab/analysis/va-rules/${encodeURIComponent(ids[5])}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...duplicateVaRule,
      id: ids[5],
      analysis: { ...duplicateVaRule.analysis, trackingPolicy: { tracker: "none", reid: "assist" } },
    }),
  }, "reid must be off when tracker is none");
  const invalidTrackerNoneList = await requestJson("/lab/analysis/va-rules");
  const trackerNoneWritePerformed = (invalidTrackerNoneList.vaRules || []).some(item => String(item.id) === String(ids[5]));
  assertEqual(invalidTrackerNoneAssist.includes("reid must be off when tracker is none") && trackerNoneWritePerformed === false, true, "RULE-040 UpsertVaRule tracker=none forces Re-ID off rejection/no-write readback");
  console.log("[pass] trackingPolicy validation rejects tracker=none + reid=assist");
  await assertRequestFails(`/lab/analysis/va-rules/${encodeURIComponent(ids[11])}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...duplicateVaRule,
      id: ids[11],
      analysis: { ...duplicateVaRule.analysis, trackingPolicy: { reid: "assist" } },
    }),
  }, "trackingPolicy.tracker is required for explicit opt-in policy");
  console.log("[pass] trackingPolicy validation rejects reid=assist without explicit tracker");

  const profile = {
    id: ids[6],
    detector: "yolo",
    fps: 6,
    maxQueue: 2,
    confidence: 0.25,
    nms: 0.45,
    inputWidth: 640,
    inputHeight: 640,
    adaptive: true,
    trackingClasses: ["person", "vehicle"],
    trackingPolicy: { tracker: "bytetrack", reid: "off" },
  };
  const profileCreate = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profile.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  createdProfiles.push(profile.id);
  const profileCreateReadback = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profile.id)}`);
  assertProfileCreateDetailReadback(profileCreate, profileCreateReadback.profile, profile);
  assertProfileSemanticReadback(profileCreateReadback.profile, profile, rulesShell);
  const updatedProfile = {
    ...profile,
    detector: "dummy",
    fps: 9,
    maxQueue: 3,
    confidence: 0.35,
    nms: 0.5,
    inputWidth: 960,
    inputHeight: 544,
    adaptive: false,
    trackingClasses: ["person"],
  };
  const profileUpdate = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profile.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedProfile),
  });
  const profileUpdateReadback = await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profile.id)}`);
  assertProfileUpdateReadback(profileUpdate, profileUpdateReadback.profile, updatedProfile);
  assertProfileSemanticReadback(profileUpdateReadback.profile, updatedProfile, rulesShell);
  await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profile.id)}`, { method: "DELETE" });
  createdProfiles.splice(createdProfiles.indexOf(profile.id), 1);
  const profileListAfterDelete = await requestJson("/lab/analysis/profiles");
  assertProfileDeleteReadback(profileListAfterDelete, profile.id);

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(duplicateVaRule.id)}`, { method: "DELETE" });
  createdVaRules.splice(createdVaRules.indexOf(duplicateVaRule.id), 1);
  const vaRuleListAfterDelete = await requestJson("/lab/analysis/va-rules");
  assertVaRuleDeleteReadback(vaRuleListAfterDelete, duplicateVaRule.id);

  await requestJson(`/lab/analysis/rules/${encodeURIComponent(fixtures[3].id)}`, { method: "DELETE" });
  created.splice(created.indexOf(fixtures[3].id), 1);
  const eventTemplateListAfterDelete = await requestJson("/lab/analysis/rules");
  assertEventTemplateDeleteReadback(eventTemplateListAfterDelete, fixtures[3].id);
  console.log("[summary] ops-rules-roundtrip complete");
} finally {
  for (const id of createdProfiles.reverse()) {
    await requestJson(`/lab/analysis/profiles/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
  for (const id of createdVaRules.reverse()) {
    await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
  for (const id of created.reverse()) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
  if (replayOutputDir) fs.rmSync(replayOutputDir, { recursive: true, force: true });
}

function assertRuleCatalogLists(payload, generatedIds) {
  const candidate = generatedIds.length === 20 && generatedIds.every(id => /^\d+$/.test(String(id))) && new Set(generatedIds).size === generatedIds.length;
  const vaRules = payload.vaRules;
  const rules = payload.rules;
  const profiles = payload.profiles || payload.builtInProfiles;
  assertEqual(Array.isArray(vaRules), true, "RULE-001 channel analysis rule catalog list");
  assertEqual(Array.isArray(rules), true, "RULE-002 event template catalog list");
  assertEqual(Array.isArray(profiles), true, "RULE-003 analysis profile catalog list");
  assertEqual(candidate, true, "RULE-016 vaRule numeric id automatic generation");
}

function assertGeneratedRuleIdUiReadback(shell) {
  const opsVaRuleIdInput = shell.includes('id="opsVaRuleIdInput" type="text"');
  assertEqual(shell.includes('id="opsVaRuleIdDisplay"') && shell.includes('data-generated-id="va-rule"'), true, "RULE-016 generated vaRule id display runtime readback");
  assertEqual(opsVaRuleIdInput, false, "RULE-017 editable vaRule id input absent runtime readback");
}

function assertEventTemplateListReadback(payload, expected) {
  const rows = Array.isArray(payload.rules) ? payload.rules : [];
  const UpsertRule = rows;
  const ids = new Set(rows.map(item => String(item.id)));
  assertEqual(expected.every(item => ids.has(String(item.id))), true, "RULE-002 event template list readback");
  assertEqual(UpsertRule.some(item => item.ruleKind === "scenario" && item.scenario?.type), true, "RULE-018 event template create list readback");
}

function assertEventTemplateDetailReadback(actual, expected) {
  const RuleJson = actual;
  assertEqual(RuleJson?.id, expected.id, "RULE-021 event template detail id");
  assertEqual(RuleJson?.event?.type, expected.event.type, "RULE-021 event template detail condition");
  assertEqual(RuleJson?.event?.region?.type, expected.event.region.type, "RULE-021 event template detail geometry");
}

function assertEventTemplateUpdateReadback(response, actual, expected) {
  const UpsertRule = { response, actual };
  assertEqual(UpsertRule.response?.status, "updated", "RULE-019 event template update status");
  assertEqual(UpsertRule.actual?.event?.minConfidence, expected.event.minConfidence, "RULE-019 event template update readback");
  assertEqual(UpsertRule.actual?.event?.region?.direction, "forward", "RULE-013 line geometry direction readback");
}

function assertEventTemplateDeleteReadback(payload, deletedId) {
  const rows = Array.isArray(payload.rules) ? payload.rules : [];
  const DeleteRule = rows.some(item => String(item.id) === String(deletedId));
  assertEqual(DeleteRule, false, "RULE-020 event template delete list absence");
}

function assertVaRuleCreateDetailReadback(actual, expected) {
  const UpsertVaRule = actual;
  const VaRuleJson = actual;
  const opsRulesVaOutputButtonsHtml = actual;
  const opsRulesStatusBadge = actual;
  const geometryType = UpsertVaRule?.event?.region?.type;
  assertEqual(UpsertVaRule?.id, expected.id, "RULE-004 channel analysis setting create id");
  assertEqual(UpsertVaRule?.source?.file, expected.source.file, "RULE-009 channel analysis setting source selection");
  assertEqual(UpsertVaRule?.templateStart?.ruleId, expected.templateStart.ruleId, "RULE-010 event template binding");
  assertEqual(UpsertVaRule?.analysis?.profileId, expected.analysis.profileId, "RULE-011 analysis profile binding");
  assertEqual(geometryType, "line", "RULE-012 region geometry setting");
  assertEqual(UpsertVaRule?.event?.region?.points?.length, 2, "RULE-013 line geometry points");
  assertEqual(opsRulesVaOutputButtonsHtml?.binding?.urlMode, `vaRule=${expected.id}`, "RULE-014 output URL mode");
  assertEqual(opsRulesStatusBadge?.enabled, true, "RULE-015 channel analysis setting active status");
  assertEqual(VaRuleJson?.name, expected.name, "RULE-007 channel analysis setting detail");
}

function assertVaRuleUpdateStatusReadback(response, actual, expected) {
  const UpsertVaRule = { response, actual };
  assertEqual(UpsertVaRule.response?.status, "updated", "RULE-005 channel analysis setting update status");
  assertEqual(UpsertVaRule.actual?.name, expected.name, "RULE-005 channel analysis setting update detail");
  assertEqual(UpsertVaRule.actual?.enabled, false, "RULE-008 channel analysis setting inactive state");
  assertEqual(UpsertVaRule.actual?.event?.minConfidence, expected.event.minConfidence, "RULE-005 channel analysis setting update payload");
}

function assertVaRuleDeleteReadback(payload, deletedId) {
  const rows = Array.isArray(payload.vaRules) ? payload.vaRules : [];
  const DeleteVaRule = rows.some(item => String(item.id) === String(deletedId));
  assertEqual(DeleteVaRule, false, "RULE-006 channel analysis setting delete list absence");
}

function assertProfileCreateDetailReadback(response, actual, expected) {
  const UpsertProfile = { response, actual };
  const ProfileJson = actual;
  assertEqual(UpsertProfile.response?.status === "created" || UpsertProfile.response?.status === "updated", true, "RULE-022 analysis profile create status");
  assertEqual(UpsertProfile.actual?.id, expected.id, "RULE-022 analysis profile create id");
  assertEqual(ProfileJson?.detector, expected.detector, "RULE-025 analysis profile detail detector");
  assertEqual(ProfileJson?.fps, expected.fps, "RULE-025 analysis profile detail fps");
  assertEqual(ProfileJson?.trackingClasses, expected.trackingClasses, "RULE-025 analysis profile detail tracking classes");
}

function assertProfileSemanticReadback(actual, expected, rulesShell) {
  const UpsertProfile = { actual, expected, rulesShell };
  if (expected.detector === "yolo") {
    assertEqual(UpsertProfile.actual?.detector === "yolo" && UpsertProfile.rulesShell.includes('<option value="yolo">yolo</option>'), true, "RULE-026 UpsertProfile YOLO ONNX detector readback");
  }
  if (expected.detector === "dummy") {
    assertEqual(UpsertProfile.actual?.detector === "dummy" && UpsertProfile.rulesShell.includes('<option value="dummy">dummy</option>'), true, "RULE-027 UpsertProfile dummy detector readback");
  }
  assertEqual(UpsertProfile.actual?.fps === expected.fps && UpsertProfile.rulesShell.includes("payload.fps <= 0"), true, "RULE-028 UpsertProfile FPS numeric validation/storage readback");
  assertEqual(UpsertProfile.actual?.maxQueue === expected.maxQueue && UpsertProfile.rulesShell.includes("payload.maxQueue <= 0"), true, "RULE-029 UpsertProfile queue numeric validation/storage readback");
  assertEqual(UpsertProfile.actual?.confidence === expected.confidence && UpsertProfile.rulesShell.includes("payload.confidence > 1"), true, "RULE-030 UpsertProfile confidence range validation/storage readback");
  assertEqual(UpsertProfile.actual?.nms === expected.nms && UpsertProfile.rulesShell.includes("payload.nms > 1"), true, "RULE-031 UpsertProfile NMS range validation/storage readback");
  assertEqual(UpsertProfile.actual?.inputWidth === expected.inputWidth && UpsertProfile.actual?.inputHeight === expected.inputHeight && UpsertProfile.rulesShell.includes("payload.inputWidth <= 0") && UpsertProfile.rulesShell.includes("payload.inputHeight <= 0"), true, "RULE-032 UpsertProfile input size validation/storage readback");
  assertEqual(UpsertProfile.actual?.trackingClasses, expected.trackingClasses, "RULE-033 UpsertProfile tracking category summary readback");
}

function assertVaRuleTrackingStorageReadback(actual, expectedPolicy) {
  const UpsertVaRule = { actual, expectedPolicy };
  const tracker = expectedPolicy?.tracker;
  const reid = expectedPolicy?.reid;
  if (tracker === "none") assertEqual(UpsertVaRule.actual?.analysis?.trackingPolicy?.tracker, "none", "RULE-034 UpsertVaRule tracker none storage readback");
  assertEqual(UpsertVaRule.actual?.analysis?.trackingPolicy?.tracker, tracker, "UpsertVaRule trackingPolicy tracker storage readback");
  assertEqual(UpsertVaRule.actual?.analysis?.trackingPolicy?.reid, reid, "UpsertVaRule trackingPolicy Re-ID storage readback");
}

function assertRuleWorkflowRuntimeReplayReadback(rulesShell, storedRules, forwardRule, reverseRule) {
  const byType = type => storedRules.find(item => item.event?.type === type && item.scenario?.type === type);
  const byId = id => storedRules.find(item => String(item?.id || "") === String(id));
  const clone = value => JSON.parse(JSON.stringify(value));
  const anyRule = storedRules.find(item => item.event?.type === "line-crossing");
  const lineAnyTypes = runStoredRuleReplay("saved-line-any", [anyRule], "line_crossing_metadata.json");
  const lineForwardTypes = runStoredRuleReplay("saved-line-forward", [forwardRule], "line_crossing_metadata.json");
  const lineReverseTypes = runStoredRuleReplay("saved-line-reverse", [reverseRule], "line_crossing_metadata.json");
  assertEqual(rulesShell.includes("opsRulesSaveNativeRecord") && anyRule?.event?.region?.direction === "any" && lineAnyTypes.has("line-crossing"), true, "RULE-045 UpsertRule exact saved any direction is consumed by runtime line-crossing readback");
  assertEqual(forwardRule?.event?.region?.direction === "forward" && !lineForwardTypes.has("line-crossing") && lineReverseTypes.has("line-crossing"), true, "RULE-046 UpsertRule exact saved forward direction suppresses reverse-oriented runtime metadata mutation RED");
  assertEqual(reverseRule?.event?.region?.direction === "reverse" && lineReverseTypes.has("line-crossing") && !lineForwardTypes.has("line-crossing"), true, "RULE-047 UpsertRule exact saved reverse direction accepts reverse-oriented runtime metadata mutation readback");

  const intrusionDwell = byType("intrusion-dwell");
  const configuredReEntry = storedRules.find(item => item.event?.type === "re-entry" && item.scenario?.reEntryMode === "configured-zones");
  const defaultReEntry = storedRules.find(item => item.event?.type === "re-entry" && !item.scenario?.reEntryMode);
  const reEntryDestination = byId(configuredReEntry?.scenario?.reEntryZoneIds?.[0]);
  const wrongDirection = byType("wrong-direction");
  const intrusionAfterLine = storedRules.find(item => item.event?.type === "intrusion-after-line-crossing" && byId(item.scenario?.triggerLine?.id) && byId(item.scenario?.targetZoneIds?.[0]));
  const intrusionAfterTrigger = byId(intrusionAfterLine?.scenario?.triggerLine?.id);
  const intrusionAfterZone = byId(intrusionAfterLine?.scenario?.targetZoneIds?.[0]);
  const loitering = byType("loitering");
  const zoneOccupancy = byType("zone-occupancy");
  const intrusionDwellTypes = runStoredRuleReplay("saved-intrusion-dwell", [intrusionDwell], "intrusion_dwell_metadata.json");
  const configuredReEntryTypes = runStoredRuleReplay("saved-re-entry-configured", [configuredReEntry, reEntryDestination], "re_entry_cross_zone_metadata.json", ["--no-intrusion-dwell", "--enable-re-entry"]);
  const defaultReEntryTypes = runStoredRuleReplay("saved-re-entry-default", [defaultReEntry], "re_entry_metadata.json", ["--no-intrusion-dwell", "--enable-re-entry"]);
  const wrongDirectionTypes = runStoredRuleReplay("saved-wrong-direction", [wrongDirection], "wrong_direction_metadata.json", ["--no-intrusion-dwell", "--enable-wrong-direction"]);
  const intrusionAfterTypes = runStoredRuleReplay("saved-intrusion-after-line", [intrusionAfterLine, intrusionAfterTrigger, intrusionAfterZone], "intrusion_after_line_crossing_metadata.json", ["--no-intrusion-dwell", "--enable-intrusion-after-line-crossing"]);
  const loiteringTypes = runStoredRuleReplay("saved-loitering", [loitering], "loitering_metadata.json", ["--no-intrusion-dwell", "--enable-loitering"]);
  const zoneOccupancyTypes = runStoredRuleReplay("saved-zone-occupancy", [zoneOccupancy], "zone_occupancy_metadata.json", ["--no-intrusion-dwell", "--enable-zone-occupancy"]);

  const badZoneReEntry = clone(configuredReEntry);
  badZoneReEntry.scenario.reEntryZoneIds = ["missing-runtime-zone"];
  const badZoneTypes = runStoredRuleReplay("mutated-re-entry-missing-zone", [badZoneReEntry, reEntryDestination], "re_entry_cross_zone_metadata.json", ["--no-intrusion-dwell", "--enable-re-entry"]);
  const highThresholdOccupancy = clone(zoneOccupancy);
  highThresholdOccupancy.scenario.occupancyThreshold = 3;
  const highThresholdTypes = runStoredRuleReplay("mutated-zone-occupancy-threshold", [highThresholdOccupancy], "zone_occupancy_metadata.json", ["--no-intrusion-dwell", "--enable-zone-occupancy"]);

  assertEqual(rulesShell.includes("intrusion-dwell") && intrusionDwellTypes.has("intrusion-dwell"), true, "RULE-048 UpsertRule exact saved UI/API intrusion-dwell is consumed by runtime EventRecord readback");
  assertEqual(rulesShell.includes("re-entry") && configuredReEntryTypes.has("re-entry") && !badZoneTypes.has("re-entry"), true, "RULE-049 UpsertRule exact saved UI/API re-entry is consumed by runtime and missing-zone mutation is RED");
  assertEqual(rulesShell.includes("wrong-direction") && wrongDirectionTypes.has("wrong-direction"), true, "RULE-050 UpsertRule exact saved UI/API wrong-direction is consumed by runtime EventRecord readback");
  assertEqual(rulesShell.includes("intrusion-after-line-crossing") && intrusionAfterTypes.has("intrusion-after-line-crossing"), true, "RULE-051 UpsertRule exact saved UI/API intrusion-after-line-crossing is consumed by runtime EventRecord readback");
  assertEqual(rulesShell.includes("loitering") && loiteringTypes.has("loitering"), true, "RULE-052 UpsertRule exact saved UI/API loitering is consumed by runtime EventRecord readback");
  assertEqual(rulesShell.includes("zone-occupancy") && zoneOccupancyTypes.has("zone-occupancy") && !highThresholdTypes.has("zone-occupancy"), true, "RULE-053 UpsertRule exact saved UI/API zone-occupancy is consumed by runtime and threshold mutation is RED");
  assertEqual(rulesShell.includes("reEntryMode") && rulesShell.includes("reEntryZoneIds") && configuredReEntryTypes.has("re-entry") && defaultReEntryTypes.has("re-entry") && !badZoneTypes.has("re-entry"), true, "RULE-103 UpsertRule exact saved configured/default re-entry rules are runtime-consumed and zone mutation is RED");
}

function runStoredRuleReplay(caseName, ruleDocuments, metadataFile, flags = []) {
  assertEqual(ruleDocuments.every(Boolean), true, `${caseName} exact saved rule document lookup`);
  if (!replayOutputDir) replayOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-rule-workflow-replay-${process.pid}-`));
  const rootDir = path.resolve(scriptDir, "../..");
  const fixtureDir = path.join(rootDir, "test/fixtures/va_replay");
  const rulesPath = path.join(replayOutputDir, `${caseName}-rules.json`);
  const outputPath = path.join(replayOutputDir, `${caseName}.json`);
  const buildDir = path.join(replayOutputDir, "build");
  fs.writeFileSync(rulesPath, `${JSON.stringify(ruleDocuments, null, 2)}\n`);
  const replayArgs = ["--input", path.join(fixtureDir, metadataFile), "--rules", rulesPath, "--output", outputPath, ...flags];
  const env = { ...process.env, MEDIA_SERVER_VA_REPLAY_BUILD_DIR: buildDir };
  if (!replayBinaryReady) {
    execFileSync(path.join(scriptDir, "replay_va_metadata.sh"), replayArgs, { cwd: rootDir, env, stdio: "pipe" });
    replayBinaryReady = true;
  } else {
    execFileSync(path.join(buildDir, "va_metadata_replay"), replayArgs, { cwd: rootDir, env, stdio: "pipe" });
  }
  const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  return new Set((payload.events || []).map(item => String(item?.type || "")));
}

function assertScenarioPresetReadback(actual, expected, rulesShell) {
  const UpsertRule = { actual, expected, rulesShell };
  const presetId = expected.scenario?.presetId;
  const reflected = UpsertRule.actual?.scenario?.presetId === presetId && UpsertRule.actual?.scenario?.candidateTimeMs === expected.scenario.candidateTimeMs;
  if (presetId === "default") assertEqual(reflected && rulesShell.includes("default: {"), true, "RULE-054 UpsertRule default preset condition readback");
  if (presetId === "road") assertEqual(reflected && rulesShell.includes("road: {"), true, "RULE-055 UpsertRule road preset condition readback");
  if (presetId === "retail") assertEqual(reflected && rulesShell.includes("retail: {"), true, "RULE-056 UpsertRule retail preset condition readback");
  if (presetId === "park") assertEqual(reflected && rulesShell.includes("park: {"), true, "RULE-057 UpsertRule park preset condition readback");
  if (presetId === "indoor") assertEqual(reflected && rulesShell.includes("indoor: {"), true, "RULE-058 UpsertRule indoor preset condition readback");
  if (presetId === "lobby") assertEqual(reflected && rulesShell.includes("lobby: {"), true, "RULE-059 UpsertRule lobby preset condition readback");
  if (presetId === "platform") assertEqual(reflected && rulesShell.includes("platform: {"), true, "RULE-060 UpsertRule platform preset condition readback");
  if (presetId === "entrance") assertEqual(reflected && rulesShell.includes("entrance: {"), true, "RULE-061 UpsertRule entrance preset condition readback");
  if (presetId === "doorway") assertEqual(reflected && rulesShell.includes("doorway: {"), true, "RULE-062 UpsertRule doorway preset condition readback");
  if (presetId === "parking") assertEqual(reflected && rulesShell.includes("parking: {"), true, "RULE-063 UpsertRule parking preset condition readback");
  if (presetId === "elevator") assertEqual(reflected && rulesShell.includes("elevator: {"), true, "RULE-064 UpsertRule elevator preset condition readback");
  if (presetId === "custom") assertEqual(reflected && rulesShell.includes("custom: '직접 설정'"), true, "RULE-065 UpsertRule custom preset condition readback");
}

function assertRuleTemplateSemanticReadback(expected, actual, rulesShell) {
  const UpsertRule = { expected, actual, rulesShell };
  if (expected.event?.type === "line-crossing" && expected.event?.region?.direction === "any") {
    assertEqual(UpsertRule.actual?.event?.region?.direction, "any", "RULE-045 UpsertRule any line direction readback");
  }
  if (expected.event?.type === "intrusion-dwell") {
    assertEqual(UpsertRule.actual?.event?.region?.type === "polygon" && UpsertRule.actual?.scenario?.restrictedZoneIds?.length > 0, true, "RULE-066 UpsertRule intrusion-dwell zone geometry readback");
    assertEqual(UpsertRule.actual?.scenario?.candidateTimeMs === expected.scenario.candidateTimeMs && rulesShell.includes("candidateTimeMs"), true, "RULE-067 UpsertRule candidateTimeMs validation/storage readback");
    assertEqual(UpsertRule.actual?.scenario?.dwellTimeMs === expected.scenario.dwellTimeMs && rulesShell.includes("dwellTimeMs"), true, "RULE-068 UpsertRule dwellTimeMs validation/storage readback");
    assertEqual(UpsertRule.actual?.scenario?.cooldownMs === expected.scenario.cooldownMs && rulesShell.includes("scenario.cooldownMs"), true, "RULE-069 UpsertRule intrusion-dwell cooldown validation/storage readback");
  }
  if (expected.event?.type === "re-entry") {
    assertEqual(UpsertRule.actual?.event?.region?.type === "polygon" && (UpsertRule.actual?.scenario?.reEntryMode !== "configured-zones" || UpsertRule.actual?.scenario?.reEntryZoneIds?.length > 0), true, "RULE-070 UpsertRule re-entry polygon zone readback");
    assertEqual(UpsertRule.actual?.scenario?.reEntryWindowMs === expected.scenario.reEntryWindowMs && rulesShell.includes("reEntryWindowMs"), true, "RULE-071 UpsertRule reEntryWindowMs validation/storage readback");
    assertEqual(UpsertRule.actual?.scenario?.cooldownMs === expected.scenario.cooldownMs && rulesShell.includes("scenario.cooldownMs"), true, "RULE-072 UpsertRule re-entry cooldown validation/storage readback");
    if (expected.scenario?.reEntryMode === "configured-zones") {
      assertEqual(UpsertRule.actual?.scenario?.reEntryMode === "configured-zones" && JSON.stringify(UpsertRule.actual?.scenario?.reEntryZoneIds) === JSON.stringify(expected.scenario.reEntryZoneIds), true, "RULE-103 reEntryMode configured-zones and reEntryZoneIds storage/GET readback");
    }
  }
  if (expected.event?.type === "wrong-direction") {
    assertEqual(UpsertRule.actual?.event?.region?.type === "line" && UpsertRule.actual?.event?.region?.points?.length === 2, true, "RULE-073 UpsertRule wrong-direction line geometry readback");
    assertEqual(["forward", "reverse"].includes(UpsertRule.actual?.scenario?.allowedDirection) && UpsertRule.rulesShell.includes("allowed direction을 forward 또는 reverse"), true, "RULE-074 UpsertRule wrong-direction allowed direction excludes any readback");
    assertEqual(UpsertRule.actual?.scenario?.cooldownMs === expected.scenario.cooldownMs && rulesShell.includes("scenario.cooldownMs"), true, "RULE-075 UpsertRule wrong-direction cooldown validation/storage readback");
  }
}

function assertScenarioRuleSemanticReadback(expected, actual) {
  const scenarioType = expected.scenario?.type;
  if (scenarioType === "intrusion-after-line-crossing") {
    assertEqual(JSON.stringify(actual?.scenario?.triggerLine), JSON.stringify(expected.scenario.triggerLine), "RULE-076 UpsertRule triggerLine id/geometry storage and GET readback");
    assertEqual(actual?.scenario?.triggerLine?.direction, expected.scenario.triggerLine.direction, "RULE-077 UpsertRule triggerLine direction storage and GET readback");
    assertEqual(actual?.scenario?.targetZoneIds, expected.scenario.targetZoneIds, "RULE-078 UpsertRule targetZoneIds storage and GET readback");
    assertEqual(actual?.scenario?.maxDelayAfterCrossingMs, expected.scenario.maxDelayAfterCrossingMs, "RULE-079 UpsertRule maxDelayAfterCrossingMs storage and GET readback");
    assertEqual(actual?.scenario?.dwellTimeMs, expected.scenario.dwellTimeMs, "RULE-080 UpsertRule dwellTimeMs storage and GET readback");
    assertEqual(actual?.scenario?.cooldownMs, expected.scenario.cooldownMs, "RULE-081 UpsertRule intrusion-after-line-crossing cooldown_ms/cooldownMs storage and GET readback");
  }
  if (scenarioType === "loitering") {
    assertEqual(actual?.scenario?.restrictedZoneIds, expected.scenario.restrictedZoneIds, "RULE-082 UpsertRule loitering restrictedZoneIds storage and GET readback");
    assertEqual(actual?.scenario?.minDwellTimeMs, expected.scenario.minDwellTimeMs, "RULE-083 UpsertRule loitering minDwellTimeMs storage and GET readback");
    assertEqual(actual?.scenario?.maxMovementRadius, expected.scenario.maxMovementRadius, "RULE-084 UpsertRule loitering maxMovementRadius storage and GET readback");
    assertEqual(actual?.scenario?.minTrajectoryPoints, expected.scenario.minTrajectoryPoints, "RULE-085 UpsertRule loitering minTrajectoryPoints storage and GET readback");
    assertEqual(actual?.scenario?.cooldownMs, expected.scenario.cooldownMs, "RULE-086 UpsertRule loitering cooldown_ms/cooldownMs storage and GET readback");
    assertEqual(actual?.scenario?.useGroundPlaneMovementRadius, expected.scenario.useGroundPlaneMovementRadius, "RULE-087 UpsertRule useGroundPlaneMovementRadius storage and GET readback");
  }
  if (scenarioType === "zone-occupancy") {
    assertEqual(actual?.scenario?.restrictedZoneIds, expected.scenario.restrictedZoneIds, "RULE-088 UpsertRule zone-occupancy restrictedZoneIds storage and GET readback");
    assertEqual(actual?.scenario?.occupancyThreshold, expected.scenario.occupancyThreshold, "RULE-089 UpsertRule occupancyThreshold storage and GET readback");
    assertEqual(actual?.scenario?.minDwellTimeMs, expected.scenario.minDwellTimeMs, "RULE-090 UpsertRule zone-occupancy minDwellTimeMs storage and GET readback");
    assertEqual(actual?.scenario?.cooldownMs, expected.scenario.cooldownMs, "RULE-091 UpsertRule zone-occupancy cooldown_ms/cooldownMs storage and GET readback");
  }
}

function assertProfileUpdateReadback(response, actual, expected) {
  const UpsertProfile = { response, actual };
  assertEqual(UpsertProfile.response?.status, "updated", "RULE-023 analysis profile update status");
  assertEqual(UpsertProfile.actual?.fps, expected.fps, "RULE-023 analysis profile update fps");
  assertEqual(UpsertProfile.actual?.maxQueue, expected.maxQueue, "RULE-023 analysis profile update queue");
  assertEqual(UpsertProfile.actual?.adaptive, expected.adaptive, "RULE-023 analysis profile update adaptive state");
}

function assertProfileDeleteReadback(payload, deletedId) {
  const rows = Array.isArray(payload.profiles) ? payload.profiles : [];
  const DeleteProfile = rows.some(item => String(item.id) === String(deletedId));
  assertEqual(DeleteProfile, false, "RULE-024 analysis profile delete list absence");
}

async function assertRequestFails(path, options, expectedSnippet) {
  const response = await fetch(`${httpBase}${path}`, authorizedOptions(options));
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
  return message;
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
  const payloadShape = {
    id: typeof actual.id,
    ruleKind: typeof actual.ruleKind,
    event: { type: typeof actual.event?.type, region: { type: typeof actual.event?.region?.type } },
    analysis: { classes: Array.isArray(actual.analysis?.classes) ? "array" : typeof actual.analysis?.classes },
  };
  const payloadFreezeSha256 = crypto.createHash("sha256").update(JSON.stringify(payloadShape)).digest("hex");
  assertEqual(payloadFreezeSha256, "0a81c36d85c93355b5a85f36843fad99b411d5ebcc1eed09c2ac78b6322c5f06", "rule payload/schema freeze SHA-256");
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
  const response = await fetch(`${httpBase}${path}`, authorizedOptions(options));
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

async function requestText(path, options = {}) {
  const response = await fetch(`${httpBase}${path}`, authorizedOptions(options));
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${path} failed HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return text;
}

function authorizedOptions(options = {}) {
  if (!bearerToken) return options;
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${bearerToken}`,
    },
  };
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
