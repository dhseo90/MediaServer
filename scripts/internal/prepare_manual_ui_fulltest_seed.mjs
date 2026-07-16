#!/usr/bin/env node
// 파일 용도: 수동 UI 풀테스트용 VA seed fixture가 실제 registry API 적용 직전 상태인지 점검한다.
// 동작 요약: 기본 dry-run은 HTTP 요청을 만들지 않고 numeric ID, payload 참조, tracker/Re-ID/scenario coverage만 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Manual UI full-test seed preparation

Usage:
  ./server.sh prepare-manual-ui-fulltest-seed [options]

Options:
  --dry-run                    Explicit dry-run flag. This is also the default.
  --fixture <path>             Seed fixture path. Default: test/fixtures/manual_ui_fulltest_va_seed_matrix.json
  --published-seed-baseline    Validate the fixture against config/docs_ui_assets.json baseline.publishedRelease.
  --emit-plan <path>           Write the validated ordered seed plan as JSON.
  --emit-registry-dir <dir>    Write throwaway sources/views/analysis/preconditions files. Sends 0 HTTP requests.
  --apply                      Apply the seed to a running throwaway server. Not a default action.
  --http-base <url>            Server HTTP base for --apply. Default: http://127.0.0.1:8081
  --cookie-file <path>         Optional file containing the Cookie header value for --apply.
  --confirm-throwaway-data     Required with --apply.
  -h, --help                   Show this help.

Boundaries:
  - dry-run sends 0 HTTP requests and is not manual UI test evidence
  - --apply mutates throwaway source/view/profile/rule/vaRule registry data only after explicit confirmation
  - browser clicking, event occurrence, screenshots, and event log review are not produced by this seed helper
`);
}

assertKnownOptions(rawArgs, [
  "dry-run",
  "fixture",
  "published-seed-baseline",
  "emit-plan",
  "emit-registry-dir",
  "apply",
  "http-base",
  "cookie-file",
  "confirm-throwaway-data",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const fixturePath = path.resolve(rootDir, args.fixture || "test/fixtures/manual_ui_fulltest_va_seed_matrix.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const relativeFixturePath = path.relative(rootDir, fixturePath);
const currentVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
const currentTag = `v${currentVersion}`;
const seedTargetSelection = args.publishedSeedBaseline
  ? readPublishedSeedBaseline()
  : {
      mode: "current-source",
      expectedReleaseTarget: currentTag,
      policyPath: "VERSION",
      policySha256: sha256Text(`${currentVersion}\n`),
    };
const plan = buildValidatedPlan(fixture, relativeFixturePath, seedTargetSelection);

if (args.apply && args.dryRun) {
  fail("--apply and --dry-run cannot be used together");
}
if (args.apply && !args.confirmThrowawayData) {
  fail("--apply requires --confirm-throwaway-data");
}
if (args.emitPlan) {
  const outputPath = path.resolve(rootDir, args.emitPlan);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`);
}
if (args.emitRegistryDir) {
  const outputDir = path.resolve(rootDir, args.emitRegistryDir);
  writeRegistryFiles(outputDir, fixture, plan);
}

if (args.apply) {
  await applySeedPlan(plan, {
    httpBase: String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, ""),
    cookieFile: args.cookieFile ? path.resolve(rootDir, args.cookieFile) : "",
  });
} else {
  printDryRun(plan, Boolean(args.emitPlan));
}

function buildValidatedPlan(seed, fixtureLabel, seedTargetSelection) {
  assert(seed.schema === "media-server.manual-ui-fulltest-va-seed-matrix.v1", "unexpected seed fixture schema");
  assert(seed.releaseTarget === seedTargetSelection.expectedReleaseTarget,
    `seed fixture must pin ${seedTargetSelection.expectedReleaseTarget}`);
  assert(seed.usageBoundary?.notEvidenceUntilAppliedAndVerified === true, "seed fixture must not be evidence by itself");
  assert(seed.usageBoundary?.keepFinalRulesForEventLogReview === true, "seed fixture must keep final rules for event log review");
  assert(seed.usageBoundary?.separateCrudFromScenarioEventReview === true, "seed fixture must separate CRUD from scenario review");

  const accounts = requireArray(seed.accounts, "accounts");
  const sources = requireArray(seed.sources, "sources");
  const profiles = requireArray(seed.profiles, "profiles");
  const eventTemplates = requireArray(seed.eventTemplates, "eventTemplates");
  const scenarioPresets = requireArray(seed.scenarioPresets, "scenarioPresets");
  const vaRules = requireArray(seed.vaRules, "vaRules");
  const invalidPolicyCases = requireArray(seed.invalidPolicyCases, "invalidPolicyCases");

  const accountRoles = new Set(accounts.map(item => String(item?.role || "").trim()));
  for (const role of ["admin", "operator", "viewer", "integrator"]) {
    assert(accountRoles.has(role), `missing account role: ${role}`);
  }

  const sourceIds = new Set();
  for (const source of sources) {
    const id = requireNonEmptyString(source.id, "source.id");
    sourceIds.add(id);
    if (source.kind === "file") {
      const localPath = requireNonEmptyString(source.localPath, `source ${id} localPath`);
      assert(fs.existsSync(path.join(rootDir, localPath)), `source ${id} local file missing: ${localPath}`);
    }
  }

  const profileIds = new Set();
  for (const profile of profiles) {
    const id = requireNumericId(profile.id, "profile.id");
    assert(!["1", "2", "3", "4", "5"].includes(id), `profile ${id} uses built-in reserved id`);
    const payload = requireObject(profile.payload, `profile ${id} payload`);
    assert(payload.id === id, `profile ${id} payload.id mismatch`);
    assert(Array.isArray(payload.trackingClasses) && payload.trackingClasses.length > 0, `profile ${id} missing trackingClasses`);
    assert(Array.isArray(payload.analysis?.classes) && payload.analysis.classes.length > 0, `profile ${id} missing analysis.classes`);
    profileIds.add(id);
  }

  const requiredEventTypes = [
    "presence",
    "enter",
    "exit",
    "line-crossing",
    "intrusion-dwell",
    "re-entry",
    "wrong-direction",
    "intrusion-after-line-crossing",
    "loitering",
    "zone-occupancy",
  ];
  const eventTypes = new Set();
  const lineDirections = new Set();
  const ruleIds = new Set();
  const trackerPairs = new Set();
  for (const template of eventTemplates) {
    const id = requireNumericId(template.id, "eventTemplate.id");
    const payload = requireObject(template.payload, `eventTemplate ${id} payload`);
    assert(payload.id === id, `eventTemplate ${id} payload.id mismatch`);
    assert(payload.enabled === true, `eventTemplate ${id} must be enabled`);
    assert(payload.ruleKind === "basic" || payload.ruleKind === "scenario", `eventTemplate ${id} invalid ruleKind`);
    assert(profileIds.has(String(payload.analysis?.profileId || "")), `eventTemplate ${id} references missing profile`);
    assert(Array.isArray(payload.analysis?.classes) && payload.analysis.classes.length > 0, `eventTemplate ${id} missing analysis.classes`);
    assert(payload.event?.type === template.type, `eventTemplate ${id} type mismatch`);
    assert(payload.event?.region?.type === "polygon" || payload.event?.region?.type === "line", `eventTemplate ${id} invalid region type`);
    if (template.type === "line-crossing") {
      lineDirections.add(String(template.direction || payload.event.region.direction || ""));
    }
    if (payload.ruleKind === "scenario") {
      assert(payload.scenario?.type === template.type, `eventTemplate ${id} scenario.type mismatch`);
      assert(payload.scenario?.enabled === true, `eventTemplate ${id} scenario must be enabled`);
      assert(scenarioPresets.includes(payload.scenario?.presetId), `eventTemplate ${id} scenario preset missing from scenarioPresets`);
    }
    eventTypes.add(template.type);
    ruleIds.add(id);
    trackerPairs.add(trackerPairFromPayload(payload, `eventTemplate ${id}`));
  }
  for (const type of requiredEventTypes) {
    assert(eventTypes.has(type), `missing event/scenario type: ${type}`);
  }
  for (const direction of ["any", "forward", "reverse"]) {
    assert(lineDirections.has(direction), `missing line-crossing direction: ${direction}`);
  }
  for (const preset of ["default", "road", "retail", "park", "indoor", "lobby", "platform", "entrance", "doorway", "parking", "elevator", "custom"]) {
    assert(scenarioPresets.includes(preset), `missing scenario preset: ${preset}`);
  }

  const sourcePriorityKeys = new Set();
  const vaRuleIds = new Set();
  for (const vaRule of vaRules) {
    const id = requireNumericId(vaRule.id, "vaRule.id");
    assert(sourceIds.has(vaRule.sourceId), `vaRule ${id} references missing source ${vaRule.sourceId}`);
    assert(profileIds.has(String(vaRule.profileId || "")), `vaRule ${id} references missing profile`);
    assert(ruleIds.has(String(vaRule.eventTemplateId || "")), `vaRule ${id} references missing eventTemplate`);
    const payload = requireObject(vaRule.payload, `vaRule ${id} payload`);
    assert(payload.id === id, `vaRule ${id} payload.id mismatch`);
    assert(payload.enabled === true, `vaRule ${id} must be enabled`);
    assert(payload.source?.kind === "file" || payload.source?.url, `vaRule ${id} missing source`);
    assert(payload.analysis?.profileId === vaRule.profileId, `vaRule ${id} analysis.profileId mismatch`);
    assert(payload.templateStart?.ruleId === vaRule.eventTemplateId, `vaRule ${id} templateStart.ruleId mismatch`);
    assert(Array.isArray(payload.analysis?.classes) && payload.analysis.classes.length > 0, `vaRule ${id} missing analysis.classes`);
    const template = eventTemplates.find(item => item.id === vaRule.eventTemplateId);
    assert(includesAll(payload.analysis.classes, template.payload.analysis.classes), `vaRule ${id} classes do not include template classes`);
    const sourceKey = `${payload.source.kind}:${payload.source.file || payload.source.url || ""}`;
    const priorityKey = `${sourceKey}:${Number(payload.priority || 0)}`;
    assert(!sourcePriorityKeys.has(priorityKey), `vaRule ${id} priority conflicts on ${sourceKey}`);
    sourcePriorityKeys.add(priorityKey);
    trackerPairs.add(trackerPairFromPayload(payload, `vaRule ${id}`));
    vaRuleIds.add(id);
  }

  for (const pair of ["none/off", "lite/off", "kalman-lite/off", "bytetrack/off", "lite/assist", "kalman-lite/assist", "bytetrack/assist"]) {
    assert(trackerPairs.has(pair), `missing tracker/Re-ID pair: ${pair}`);
  }

  assert(invalidPolicyCases.some(item => {
    const policy = item?.payload?.analysis?.trackingPolicy || {};
    return policy.tracker === "none" && policy.reid === "assist" && item.expected === "reject";
  }), "missing invalid tracker=none + reid=assist reject case");
  for (const item of invalidPolicyCases) {
    const id = requireNumericId(item.id, "invalidPolicyCase.id");
    assert(!ruleIds.has(id) && !vaRuleIds.has(id), `invalidPolicyCase ${id} conflicts with valid seed id`);
    assert(item.kind === "rule" || item.kind === "vaRule", `invalidPolicyCase ${id} invalid kind`);
    assert(item.expected === "reject", `invalidPolicyCase ${id} must expect reject`);
    assert(String(item.expectedErrorSnippet || "").trim(), `invalidPolicyCase ${id} missing expectedErrorSnippet`);
    trackerPairFromPayload(item.payload, `invalidPolicyCase ${id}`);
  }

  const minimums = seed.finalStateMinimums || {};
  assert(accounts.length >= Number(minimums.accounts || 0), "finalStateMinimums.accounts not met");
  assert(sources.length >= Number(minimums.sources || 0), "finalStateMinimums.sources not met");
  assert(profiles.length >= Number(minimums.profiles || 0), "finalStateMinimums.profiles not met");
  assert(eventTemplates.length >= Number(minimums.eventTemplates || 0), "finalStateMinimums.eventTemplates not met");
  assert(vaRules.length >= Number(minimums.vaRules || 0), "finalStateMinimums.vaRules not met");

  const profilePayloads = profiles.map(item => item.payload);
  const eventTemplatePayloads = eventTemplates.map(item => item.payload);
  const vaRulePayloads = vaRules.map(item => item.payload);
  const registryRecords = materializeRegistryRecords(seed, vaRulePayloads);

  return {
    schema: "media-server.manual-ui-fulltest-seed-plan.v1",
    fixture: fixtureLabel,
    releaseTarget: seed.releaseTarget,
    seedTargetSelection,
    mode: "dry-run",
    httpRequests: 0,
    boundaries: {
      notExecutionEvidence: true,
      browserUiTestEvidenceProduced: false,
      eventOccurrenceReviewEvidenceProduced: false,
      longRunEvidenceProduced: false,
    },
    counts: {
      accounts: accounts.length,
      sources: sources.length,
      profiles: profiles.length,
      eventTemplates: eventTemplates.length,
      vaRules: vaRules.length,
      invalidPolicyCases: invalidPolicyCases.length,
    },
    coverage: {
      eventTypes: [...eventTypes].sort(),
      lineDirections: [...lineDirections].sort(),
      scenarioPresets: [...scenarioPresets].sort(),
      trackerPairs: [...trackerPairs].sort(),
    },
    applyOrder: {
      sources: registryRecords.sources,
      views: registryRecords.views,
      profiles: profilePayloads,
      eventTemplates: eventTemplatePayloads,
      vaRules: vaRulePayloads,
      invalidPolicyCases: invalidPolicyCases.map(item => ({
        id: item.id,
        kind: item.kind,
        expected: item.expected,
        expectedErrorSnippet: item.expectedErrorSnippet,
        payload: item.payload,
      })),
    },
  };
}

function readPublishedSeedBaseline() {
  const assetConfigPath = path.join(rootDir, "config/docs_ui_assets.json");
  const assetConfigText = fs.readFileSync(assetConfigPath, "utf8");
  const assetConfig = JSON.parse(assetConfigText);
  const publishedRelease = requireNonEmptyString(
    assetConfig?.baseline?.publishedRelease,
    "docs UI asset published release",
  );
  assert(assetConfig?.baseline?.sourceVersion === currentVersion,
    `docs UI asset source version must be ${currentVersion}`);
  assert(/^v\d+\.\d+\.\d+$/.test(publishedRelease),
    `invalid docs UI asset published release: ${publishedRelease}`);
  assert(assetConfig?.baseline?.publicReleaseStatus === `${publishedRelease}-published-source-only`,
    "docs UI asset public release status mismatch");
  return {
    mode: "published-seed-baseline",
    expectedReleaseTarget: publishedRelease,
    policyPath: "config/docs_ui_assets.json",
    policySha256: sha256Text(assetConfigText),
  };
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function applySeedPlan(plan, { httpBase, cookieFile }) {
  const headers = { "Content-Type": "application/json" };
  if (cookieFile) {
    headers.Cookie = readCookieHeaderValue(cookieFile);
  }
  let requests = 0;
  for (const payload of plan.applyOrder.sources || []) {
    await putJson(httpBase, `/ops/api/sources/${encodeURIComponent(payload.sourceId)}`, payload, headers);
    requests += 1;
  }
  for (const payload of plan.applyOrder.profiles) {
    await putJson(httpBase, `/lab/analysis/profiles/${encodeURIComponent(payload.id)}`, payload, headers);
    requests += 1;
  }
  for (const payload of plan.applyOrder.eventTemplates) {
    await putJson(httpBase, `/lab/analysis/rules/${encodeURIComponent(payload.id)}`, payload, headers);
    requests += 1;
  }
  for (const payload of plan.applyOrder.vaRules) {
    await putJson(httpBase, `/lab/analysis/va-rules/${encodeURIComponent(payload.id)}`, payload, headers);
    requests += 1;
  }
  for (const payload of plan.applyOrder.views || []) {
    await putJson(httpBase, `/ops/api/views/${encodeURIComponent(payload.viewId)}`, payload, headers);
    requests += 1;
  }
  for (const item of plan.applyOrder.invalidPolicyCases) {
    const pathPrefix = item.kind === "vaRule" ? "/lab/analysis/va-rules" : "/lab/analysis/rules";
    await expectPutReject(httpBase, `${pathPrefix}/${encodeURIComponent(item.id)}`, item.payload, headers, item.expectedErrorSnippet);
    requests += 1;
  }
  console.log("[pass] manual UI full-test seed validated account fixtures as external auth prerequisites");
  console.log("[pass] manual UI full-test seed applied source fixtures to throwaway registry");
  console.log("[pass] manual UI full-test seed applied profile fixtures to throwaway registry");
  console.log("[pass] manual UI full-test seed applied event-template fixtures to throwaway registry");
  console.log("[pass] manual UI full-test seed applied va-rule fixtures to throwaway registry");
  console.log("[pass] manual UI full-test seed rejected invalid policy fixtures");
  console.log(`- httpBase: ${httpBase}`);
  console.log(`- httpRequests: ${requests}`);
  console.log(`- not-ui-test-evidence: browser click evidence is not produced by this seed helper`);
  console.log(`- not-event-evidence: event occurrence review is not produced by this seed helper`);
}

function readCookieHeaderValue(cookieFile) {
  const rawCookie = fs.readFileSync(cookieFile, "utf8").trim();
  if (!rawCookie) return "";
  const cookieHeader = rawCookie.replace(/^Cookie:\s*/i, "");
  const jarCookies = [];
  for (const line of rawCookie.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") && !trimmed.startsWith("#HttpOnly_")) continue;
    const fields = trimmed.split(/\t+/);
    if (fields.length < 7) continue;
    const name = fields[5]?.trim();
    const value = fields[6]?.trim();
    if (name && value) jarCookies.push(`${name}=${value}`);
  }
  return jarCookies.length > 0 ? jarCookies.join("; ") : cookieHeader;
}

async function putJson(httpBase, urlPath, payload, headers) {
  const response = await fetch(`${httpBase}${urlPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${urlPath} failed HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
}

async function expectPutReject(httpBase, urlPath, payload, headers, expectedSnippet) {
  const response = await fetch(`${httpBase}${urlPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (response.ok) {
    throw new Error(`${urlPath} unexpectedly accepted invalid policy`);
  }
  if (!text.includes(expectedSnippet)) {
    throw new Error(`${urlPath} rejected with unexpected response: ${text.slice(0, 240)}`);
  }
}

function printDryRun(plan, emittedPlan) {
  console.log("[pass] manual UI seed dry-run mode selected for full-test fixture");
  console.log("[pass] manual UI seed dry-run emitted no HTTP requests");
  console.log(`- fixture: ${plan.fixture}`);
  console.log(`- mode: dry-run`);
  console.log(`- httpRequests: 0`);
  console.log(`- accounts: ${plan.counts.accounts}`);
  console.log(`- sources: ${plan.counts.sources}`);
  console.log(`- profiles: ${plan.counts.profiles}`);
  console.log(`- eventTemplates: ${plan.counts.eventTemplates}`);
  console.log(`- vaRules: ${plan.counts.vaRules}`);
  console.log(`- invalidPolicyCases: ${plan.counts.invalidPolicyCases}`);
  console.log(`- trackerPairs: ${plan.coverage.trackerPairs.join(", ")}`);
  console.log(`- eventTypes: ${plan.coverage.eventTypes.join(", ")}`);
  console.log(`- not-ui-test-evidence: browser click evidence is not produced by this seed helper`);
  console.log(`- not-event-evidence: event occurrence review is not produced by this seed helper`);
  if (emittedPlan) {
    console.log(`- emitPlan: written`);
  }
  if (args.emitRegistryDir) {
    console.log(`- emitRegistryDir: written`);
  }
}

function writeRegistryFiles(outputDir, seed, plan) {
  fs.mkdirSync(outputDir, { recursive: true });

  const analysis = {
    profiles: plan.applyOrder.profiles,
    rules: plan.applyOrder.eventTemplates,
    vaRules: plan.applyOrder.vaRules,
  };
  const preconditions = {
    schema: "media-server.manual-ui-fulltest-registry-preconditions.v1",
    releaseTarget: plan.releaseTarget,
    fixture: plan.fixture,
    notExecutionEvidence: true,
    browserUiTestEvidenceProduced: false,
    eventOccurrenceReviewEvidenceProduced: false,
    authUsersFile: {
      status: "required-separately",
      reason: "password hashes must be created with operator-provided password values; this script does not invent or store default passwords",
      requiredEnv: [
        "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
        "MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
        "MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
        "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
        "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
      ],
      accounts: seed.accounts,
    },
    files: {
      sourceRegistry: "sources.json",
      publishedViews: "views.json",
      analysisRegistry: "analysis.json",
    },
    counts: {
      sources: plan.applyOrder.sources.length,
      views: plan.applyOrder.views.length,
      profiles: analysis.profiles.length,
      eventTemplates: analysis.rules.length,
      vaRules: analysis.vaRules.length,
    },
  };

  writeJson(path.join(outputDir, "sources.json"), { sources: plan.applyOrder.sources });
  writeJson(path.join(outputDir, "views.json"), { views: plan.applyOrder.views });
  writeJson(path.join(outputDir, "analysis.json"), analysis);
  writeJson(path.join(outputDir, "preconditions.json"), preconditions);
}

function materializeRegistryRecords(seed, vaRulePayloads) {
  const fileSources = seed.sources.filter(source => source.kind === "file" && source.file);
  assert(fileSources.length >= 2, "seed fixture must include at least two file sources for registry materialization");

  const sourceIdBySeedId = new Map();
  const sources = fileSources.map((source, index) => {
    const sourceId = String(9001 + index);
    sourceIdBySeedId.set(source.id, sourceId);
    return {
      sourceId,
      displayName: sourceDisplayName(source),
      kind: "file",
      enabled: true,
      tags: ["manual-ui-fulltest", "throwaway"],
      ownerGroup: "Manual UI Fulltest",
      site: "QA Seed",
      group: "Manual UI",
      floor: "Fixture",
      zone: sourceZoneName(source),
      canonicalSourceKey: `file:${source.file}`,
      file: source.file,
    };
  });

  const views = fileSources.map((source, index) => {
    const sourceId = sourceIdBySeedId.get(source.id);
    const allowedRuleIds = vaRulePayloads
      .filter(rule => seed.vaRules.find(item => item.id === rule.id)?.sourceId === source.id)
      .map(rule => rule.id);
    return {
      viewId: String(9001 + index),
      displayName: sourceViewDisplayName(source),
      sourceId,
      defaultRuleId: allowedRuleIds[0] || "",
      allowedRuleIds,
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      showDashboard: true,
      showEvents: true,
      showMetadataSummary: true,
      clientGroups: ["manual-ui-fulltest"],
      maxTiles: source.id === "ui-file-va-four-scene" ? 4 : 1,
      enabled: true,
    };
  });

  return { sources, views };
}

function sourceDisplayName(source) {
  const labels = {
    "ui-file-sample-h264": "UI Fulltest Sample H264",
    "ui-file-va-four-scene": "UI Fulltest VA Four Scene",
    "ui-file-va-tracking-event": "UI Fulltest VA Tracking Event",
    "ui-file-va-tracking-long": "UI Fulltest VA Tracking Long",
  };
  return labels[source.id] || `UI Fulltest ${source.id}`;
}

function sourceViewDisplayName(source) {
  const labels = {
    "ui-file-sample-h264": "UI Fulltest Playback",
    "ui-file-va-four-scene": "UI Fulltest VA Visual Matrix",
    "ui-file-va-tracking-event": "UI Fulltest VA Event Matrix",
    "ui-file-va-tracking-long": "UI Fulltest Re-entry Matrix",
  };
  return labels[source.id] || `${sourceDisplayName(source)} View`;
}

function sourceZoneName(source) {
  if (source.id === "ui-file-va-four-scene") return "VA Visual";
  if (source.id === "ui-file-va-tracking-event") return "VA Events";
  if (source.id === "ui-file-va-tracking-long") return "VA Long Events";
  return "Playback";
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function trackerPairFromPayload(payload, label) {
  const policy = payload?.analysis?.trackingPolicy;
  assert(policy && typeof policy === "object", `${label} missing analysis.trackingPolicy`);
  const tracker = String(policy.tracker || "").trim();
  const reid = String(policy.reid || "off").trim();
  assert(["none", "lite", "kalman-lite", "bytetrack"].includes(tracker), `${label} invalid tracker: ${tracker}`);
  assert(["off", "assist"].includes(reid), `${label} invalid reid: ${reid}`);
  if (tracker === "none" && reid !== "off") {
    assert(label.startsWith("invalidPolicyCase"), `${label} uses invalid tracker=none + reid=${reid}`);
  }
  return `${tracker}/${reid}`;
}

function includesAll(source, required) {
  const sourceSet = new Set(source);
  return required.every(item => sourceSet.has(item));
}

function requireArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  return value;
}

function requireObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value;
}

function requireNonEmptyString(value, label) {
  const text = String(value || "").trim();
  assert(text, `${label} must be a non-empty string`);
  return text;
}

function requireNumericId(value, label) {
  const text = requireNonEmptyString(value, label);
  assert(/^\d+$/.test(text), `${label} must be numeric: ${text}`);
  return text;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      result.dryRun = true;
    } else if (token === "--published-seed-baseline") {
      result.publishedSeedBaseline = true;
    } else if (token === "--apply") {
      result.apply = true;
    } else if (token === "--confirm-throwaway-data") {
      result.confirmThrowawayData = true;
    } else if (token.startsWith("--fixture=")) {
      result.fixture = token.slice("--fixture=".length);
    } else if (token === "--fixture") {
      result.fixture = requireOptionValue(argv, ++index, token);
    } else if (token.startsWith("--emit-plan=")) {
      result.emitPlan = token.slice("--emit-plan=".length);
    } else if (token === "--emit-plan") {
      result.emitPlan = requireOptionValue(argv, ++index, token);
    } else if (token.startsWith("--emit-registry-dir=")) {
      result.emitRegistryDir = token.slice("--emit-registry-dir=".length);
    } else if (token === "--emit-registry-dir") {
      result.emitRegistryDir = requireOptionValue(argv, ++index, token);
    } else if (token.startsWith("--http-base=")) {
      result.httpBase = token.slice("--http-base=".length);
    } else if (token === "--http-base") {
      result.httpBase = requireOptionValue(argv, ++index, token);
    } else if (token.startsWith("--cookie-file=")) {
      result.cookieFile = token.slice("--cookie-file=".length);
    } else if (token === "--cookie-file") {
      result.cookieFile = requireOptionValue(argv, ++index, token);
    }
  }
  return result;
}

function requireOptionValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    fail(`${option} requires a value`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
