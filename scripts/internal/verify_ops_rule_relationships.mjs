#!/usr/bin/env node
// 파일 용도: 채널/PublishedView/VA 룰/이벤트 템플릿/분석 프로파일 참조 관계와 저장 전 validation을 검증한다.

import process from "node:process";

import { nextNumericIds } from "./numeric_id_helpers.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops rule relationship smoke

Usage:
  ./server.sh verify-ops-rule-relationships [options]

Options:
  --http-base <url>  실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["http-base", "h", "help"]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");

const initial = await loadGraph();
assertCleanGraph("initial", initial);

const usedIds = new Set([
  ...initial.eventTemplates.map(item => String(item?.id || "")),
  ...initial.vaRules.map(item => String(item?.id || "")),
  ...initial.profiles.map(item => String(item?.id || item?.profileId || "")),
]);
const ids = nextNumericIds(usedIds, { count: 10, start: 9901, end: 9999, label: "ops rule relationship id" });
const inactiveProfileId = ids[0];
const inactiveEventRuleId = ids[1];
const eventRuleId = ids[2];
const validVaRuleId = ids[3];
const invalidVaRuleId = ids[4];
const mismatchedVaRuleId = ids[5];
const inactiveViewVaRuleId = ids[6];
const inactiveChannelVaRuleId = ids[7];
const notAllowedVaRuleId = ids[8];
const existingConnectionVaRuleId = ids[9];
const created = [];

try {
  const { ruleSource: source, view: mismatchedView } = pickSourcePair(initial.sources, initial.views);
  const inactiveFixture = pickFileSourceView(initial.sources, initial.views);
  const inactiveFixtureViewId = String(inactiveFixture.view?.viewId || "");
  const mismatchedViewId = String(mismatchedView?.viewId || "");
  await requestJson(`/lab/analysis/profiles/${encodeURIComponent(inactiveProfileId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profilePayload(inactiveProfileId, { enabled: false })),
  });
  created.push({ type: "profile", id: inactiveProfileId });
  console.log(`[pass] relationship-fixture inactive-profile ${inactiveProfileId}`);

  await requestJson(`/lab/analysis/rules/${encodeURIComponent(inactiveEventRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventTemplatePayload(inactiveEventRuleId, { enabled: false })),
  });
  created.push({ type: "rule", id: inactiveEventRuleId });
  console.log(`[pass] relationship-fixture inactive-template ${inactiveEventRuleId}`);

  await requestJson(`/lab/analysis/rules/${encodeURIComponent(eventRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventTemplatePayload(eventRuleId)),
  });
  created.push({ type: "rule", id: eventRuleId });
  console.log(`[pass] relationship-fixture event-template ${eventRuleId}`);

  await expectHttpError(
    `/lab/analysis/va-rules/${encodeURIComponent(invalidVaRuleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vaRulePayload(invalidVaRuleId, eventRuleId, "999999999", source)),
    },
    400,
    "vaRule analysis.profileId does not exist",
  );
  console.log("[pass] missing-profile rejected");

  await expectHttpError(
    `/lab/analysis/va-rules/${encodeURIComponent(invalidVaRuleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vaRulePayload(invalidVaRuleId, "999999998", "1", source)),
    },
    400,
    "vaRule templateStart.ruleId does not exist",
  );
  console.log("[pass] missing-template rejected");

  await expectHttpError(
    `/lab/analysis/va-rules/${encodeURIComponent(invalidVaRuleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vaRulePayload(invalidVaRuleId, eventRuleId, inactiveProfileId, source)),
    },
    400,
    "vaRule analysis.profileId is inactive",
  );
  console.log("[pass] inactive-profile rejected");

  await expectHttpError(
    `/lab/analysis/va-rules/${encodeURIComponent(invalidVaRuleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vaRulePayload(invalidVaRuleId, inactiveEventRuleId, "1", source)),
    },
    400,
    "vaRule templateStart.ruleId is inactive",
  );
  console.log("[pass] inactive-template rejected");

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(mismatchedVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(mismatchedVaRuleId, eventRuleId, "1", source)),
  });
  created.push({ type: "vaRule", id: mismatchedVaRuleId });
  console.log(`[pass] relationship-fixture mismatched-source va-rule ${mismatchedVaRuleId}`);

  await requestJson(`/ops/api/views/${encodeURIComponent(mismatchedViewId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewPayloadWithRule(mismatchedView, mismatchedVaRuleId)),
  });
  created.push({ type: "viewRestore", id: mismatchedViewId, payload: viewRestorePayload(mismatchedView) });
  console.log(`[pass] relationship-fixture mismatched-source view ${mismatchedViewId}`);

  const sourceMismatchGraph = await loadGraph();
  expectRelationshipIssue(
    "source-mismatch",
    sourceMismatchGraph,
    `PublishedView ${mismatchedViewId} vaRule ${mismatchedVaRuleId} source mismatch`,
  );

  await expectHttpError(
    `/client/api/views/${encodeURIComponent(mismatchedViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: mismatchedVaRuleId }),
    },
    400,
    "vaRule source must match PublishedView source",
  );
  console.log("[pass] source-mismatch client va-rule session rejected");

  await deleteCreatedItem({ type: "viewRestore", id: mismatchedViewId, payload: viewRestorePayload(mismatchedView) });
  await deleteCreatedItem({ type: "vaRule", id: mismatchedVaRuleId });

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(inactiveViewVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(inactiveViewVaRuleId, eventRuleId, "1", inactiveFixture.source)),
  });
  created.push({ type: "vaRule", id: inactiveViewVaRuleId });
  await requestJson(`/ops/api/views/${encodeURIComponent(inactiveFixtureViewId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewPayloadWithRule(inactiveFixture.view, inactiveViewVaRuleId, { enabled: false })),
  });
  created.push({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  const inactiveViewGraph = await loadGraph();
  expectRelationshipIssue(
    "inactive-view",
    inactiveViewGraph,
    `PublishedView ${inactiveFixtureViewId} is inactive for vaRule ${inactiveViewVaRuleId}`,
  );
  await expectHttpError(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: inactiveViewVaRuleId }),
    },
    404,
    "PublishedView not found",
  );
  console.log("[pass] inactive-view client va-rule session rejected");
  await deleteCreatedItem({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  await deleteCreatedItem({ type: "vaRule", id: inactiveViewVaRuleId });

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(inactiveChannelVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(inactiveChannelVaRuleId, eventRuleId, "1", inactiveFixture.source)),
  });
  created.push({ type: "vaRule", id: inactiveChannelVaRuleId });
  await requestJson(`/ops/api/views/${encodeURIComponent(inactiveFixtureViewId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewPayloadWithRule(inactiveFixture.view, inactiveChannelVaRuleId)),
  });
  created.push({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  await requestJson(`/ops/api/sources/${encodeURIComponent(inactiveFixture.source.sourceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sourceRestorePayload(inactiveFixture.source, { enabled: false })),
  });
  created.push({ type: "sourceRestore", id: inactiveFixture.source.sourceId, payload: sourceRestorePayload(inactiveFixture.source) });
  const inactiveChannelGraph = await loadGraph();
  expectRelationshipIssue(
    "inactive-channel",
    inactiveChannelGraph,
    `PublishedView ${inactiveFixtureViewId} source ${inactiveFixture.source.sourceId} is inactive for vaRule ${inactiveChannelVaRuleId}`,
  );
  await expectHttpError(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: inactiveChannelVaRuleId }),
    },
    404,
    "PublishedView source is not available",
  );
  console.log("[pass] inactive-channel client va-rule session rejected");
  await deleteCreatedItem({ type: "sourceRestore", id: inactiveFixture.source.sourceId, payload: sourceRestorePayload(inactiveFixture.source) });
  await deleteCreatedItem({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  await deleteCreatedItem({ type: "vaRule", id: inactiveChannelVaRuleId });

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(notAllowedVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(notAllowedVaRuleId, eventRuleId, "1", inactiveFixture.source)),
  });
  created.push({ type: "vaRule", id: notAllowedVaRuleId });
  const notAllowedGraph = await loadGraph();
  expectVaRuleNotAllowed(notAllowedGraph, notAllowedVaRuleId, inactiveFixtureViewId);
  await expectHttpError(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: notAllowedVaRuleId }),
    },
    400,
    "allowed vaRule is required for va-rule mode",
  );
  console.log("[pass] va-rule-not-allowed client session rejected");
  await deleteCreatedItem({ type: "vaRule", id: notAllowedVaRuleId });

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(existingConnectionVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(existingConnectionVaRuleId, eventRuleId, "1", inactiveFixture.source)),
  });
  created.push({ type: "vaRule", id: existingConnectionVaRuleId });
  await requestJson(`/ops/api/views/${encodeURIComponent(inactiveFixtureViewId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewPayloadWithRule(inactiveFixture.view, existingConnectionVaRuleId)),
  });
  created.push({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  const existingSession = await requestJson(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: existingConnectionVaRuleId }),
    },
  );
  const existingSessionId = String(existingSession?.sessionId || "");
  if (!existingSessionId) {
    throw new Error("existing-connection-allowed-rule sessionId missing");
  }
  created.push({ type: "clientSession", viewId: inactiveFixtureViewId, id: existingSessionId });
  console.log("[pass] existing-connection-allowed-rule client session created");
  await requestJson(`/ops/api/views/${encodeURIComponent(inactiveFixtureViewId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewRestorePayload(inactiveFixture.view)),
  });
  await expectHttpStatus(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session/${encodeURIComponent(existingSessionId)}/ice`,
    { method: "GET" },
    200,
  );
  console.log("[pass] existing-connection-allowed-rule existing session ICE remains reachable after allowedRuleIds removal");
  await expectHttpStatus(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session/${encodeURIComponent(existingSessionId)}`,
    { method: "DELETE" },
    200,
  );
  console.log("[pass] existing-connection-allowed-rule existing session delete allowed after allowedRuleIds removal");
  await expectHttpError(
    `/client/api/views/${encodeURIComponent(inactiveFixtureViewId)}/webrtc/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overlayMode: "va-rule", ruleId: existingConnectionVaRuleId }),
    },
    400,
    "allowed vaRule is required for va-rule mode",
  );
  console.log("[pass] existing-connection-allowed-rule new session rejected after allowedRuleIds removal");
  await deleteCreatedItem({ type: "viewRestore", id: inactiveFixtureViewId, payload: viewRestorePayload(inactiveFixture.view) });
  await deleteCreatedItem({ type: "vaRule", id: existingConnectionVaRuleId });

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(validVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(validVaRuleId, eventRuleId, "1", source)),
  });
  created.push({ type: "vaRule", id: validVaRuleId });
  console.log(`[pass] relationship-fixture va-rule ${validVaRuleId}`);

  const withFixture = await loadGraph();
  assertCleanGraph("with-fixture", withFixture);
  console.log("[summary] ops-rule-relationships complete");
} finally {
  for (const item of created.reverse()) {
    await deleteCreatedItem(item);
  }
}

async function loadGraph() {
  const [catalog, profilesPayload, sourcesPayload, viewsPayload] = await Promise.all([
    requestJson("/ops/api/rules/catalog"),
    requestJson("/lab/analysis/profiles"),
    requestJson("/ops/api/sources"),
    requestJson("/ops/api/views"),
  ]);
  return {
    profiles: [
      ...(Array.isArray(profilesPayload.builtInProfiles) ? profilesPayload.builtInProfiles : []),
      ...(Array.isArray(catalog.profiles) ? catalog.profiles : []),
    ],
    eventTemplates: Array.isArray(catalog.rules) ? catalog.rules : [],
    vaRules: Array.isArray(catalog.vaRules) ? catalog.vaRules : [],
    sources: Array.isArray(sourcesPayload.sources) ? sourcesPayload.sources : [],
    views: Array.isArray(viewsPayload.views) ? viewsPayload.views : [],
  };
}

function assertCleanGraph(label, graph) {
  const { issues, stats } = relationshipIssues(graph);
  if (issues.length > 0) {
    throw new Error(`${label} relationship issues:\n- ${issues.join("\n- ")}`);
  }
  console.log(`[pass] ${label} relationship profile index count ${graph.profiles.length}`);
  console.log(`[pass] ${label} relationship event-template index count ${graph.eventTemplates.length}`);
  console.log(`[pass] ${label} relationship va-rule index count ${graph.vaRules.length}`);
  console.log(`[pass] ${label} relationship source index count ${graph.sources.length}`);
  console.log(`[pass] ${label} relationship published-view index count ${graph.views.length}`);
  console.log(`[pass] ${label} va-rule profile references valid checked=${stats.vaRuleProfileRefs}`);
  console.log(`[pass] ${label} va-rule event-template references valid checked=${stats.vaRuleTemplateRefs}`);
  console.log(`[pass] ${label} va-rule source references registered checked=${stats.vaRuleSourceRefs}`);
  console.log(`[pass] ${label} published-view default rule belongs to allowed set checked=${stats.viewDefaultRules}`);
  console.log(`[pass] ${label} published-view va-rule references exist checked=${stats.viewRuleRefs}`);
  console.log(`[pass] ${label} published-view va-rule source matches view source checked=${stats.viewRuleSourceMatches}`);
}

function expectRelationshipIssue(label, graph, expected) {
  const { issues } = relationshipIssues(graph);
  if (!issues.some(issue => issue.includes(expected))) {
    throw new Error(`${label} relationship issue missing: ${expected}\n- ${issues.join("\n- ")}`);
  }
  console.log(`[pass] ${label} relationship issue detected`);
}

function expectVaRuleNotAllowed(graph, ruleId, viewId) {
  const rule = graph.vaRules.find(item => String(item?.id || "") === String(ruleId));
  const view = graph.views.find(item => String(item?.viewId || "") === String(viewId));
  const source = graph.sources.find(item => String(item?.sourceId || "") === String(view?.sourceId || ""));
  if (!rule || !view || !source) {
    throw new Error(`va-rule-not-allowed fixture missing rule/view/source: rule=${ruleId} view=${viewId}`);
  }
  const ruleKey = sourceKeyForVaRule(rule.source || {});
  const viewKey = sourceKeyForSource(source);
  const allowed = new Set((Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds : []).map(String).filter(Boolean));
  const defaultRuleId = String(view.defaultRuleId || "").trim();
  if (defaultRuleId) allowed.add(defaultRuleId);
  if (ruleKey !== viewKey) {
    throw new Error(`va-rule-not-allowed fixture source mismatch: ${ruleKey} !== ${viewKey}`);
  }
  if (allowed.has(String(ruleId))) {
    throw new Error(`va-rule-not-allowed fixture unexpectedly allowed rule ${ruleId} on view ${viewId}`);
  }
  console.log("[pass] va-rule-not-allowed relationship fixture detected");
}

function relationshipIssues(graph) {
  const issues = [];
  const stats = {
    vaRuleProfileRefs: 0,
    vaRuleTemplateRefs: 0,
    vaRuleSourceRefs: 0,
    viewDefaultRules: 0,
    viewRuleRefs: 0,
    viewRuleSourceMatches: 0,
  };
  const profileIds = new Set(graph.profiles.map(item => String(item?.id || item?.profileId || "")).filter(Boolean));
  const eventTemplateIds = new Set(graph.eventTemplates.map(item => String(item?.id || "")).filter(Boolean));
  const vaRulesById = new Map(graph.vaRules.map(item => [String(item?.id || ""), item]).filter(([id]) => id));
  const sourcesById = new Map(graph.sources.map(item => [String(item?.sourceId || ""), item]).filter(([id]) => id));

  for (const rule of graph.vaRules) {
    const id = String(rule?.id || "");
    const profileId = String(rule?.analysis?.profileId || "").trim();
    const templateId = String(rule?.templateStart?.ruleId || "").trim();
    stats.vaRuleProfileRefs += 1;
    if (!profileId) {
      issues.push(`vaRule ${id || "(unknown)"} missing analysis.profileId`);
    } else if (!profileIds.has(profileId)) {
      issues.push(`vaRule ${id || "(unknown)"} references missing profile ${profileId}`);
    }
    stats.vaRuleTemplateRefs += 1;
    if (!templateId) {
      issues.push(`vaRule ${id || "(unknown)"} missing templateStart.ruleId`);
    } else if (!eventTemplateIds.has(templateId)) {
      issues.push(`vaRule ${id || "(unknown)"} references missing event template ${templateId}`);
    }
    const sourceKey = sourceKeyForVaRule(rule?.source || {});
    if (sourceKey && !graph.sources.some(source => sourceKeyForSource(source) === sourceKey)) {
      issues.push(`vaRule ${id || "(unknown)"} source is not registered as a channel source`);
    }
    if (sourceKey) {
      stats.vaRuleSourceRefs += 1;
    }
  }

  for (const view of graph.views) {
    const viewId = String(view?.viewId || "");
    const viewSource = sourcesById.get(String(view?.sourceId || ""));
    const allowed = new Set((Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds : []).map(String).filter(Boolean));
    const defaultRuleId = String(view?.defaultRuleId || "").trim();
    if (defaultRuleId) {
      stats.viewDefaultRules += 1;
    }
    if (defaultRuleId && !allowed.has(defaultRuleId)) {
      issues.push(`PublishedView ${viewId} defaultRuleId ${defaultRuleId} is not included in allowedRuleIds`);
    }
    for (const ruleId of new Set([...allowed, defaultRuleId].filter(Boolean))) {
      stats.viewRuleRefs += 1;
      const rule = vaRulesById.get(ruleId);
      if (!rule) {
        issues.push(`PublishedView ${viewId} references missing vaRule ${ruleId}`);
        continue;
      }
      if (!viewSource) {
        issues.push(`PublishedView ${viewId} sourceId ${view?.sourceId || ""} is missing`);
        continue;
      }
      if (view.enabled === false) {
        issues.push(`PublishedView ${viewId} is inactive for vaRule ${ruleId}`);
        continue;
      }
      if (viewSource.enabled === false) {
        issues.push(`PublishedView ${viewId} source ${view?.sourceId || ""} is inactive for vaRule ${ruleId}`);
        continue;
      }
      const viewKey = sourceKeyForSource(viewSource);
      const ruleKey = sourceKeyForVaRule(rule.source || {});
      if (viewKey && ruleKey) {
        stats.viewRuleSourceMatches += 1;
      }
      if (viewKey && ruleKey && viewKey !== ruleKey) {
        issues.push(`PublishedView ${viewId} vaRule ${ruleId} source mismatch`);
      }
    }
  }
  return { issues, stats };
}

function pickSourcePair(sources, views) {
  const candidates = sources.filter(item => item?.enabled !== false && sourcePayload(item));
  const viewsBySourceId = new Map((Array.isArray(views) ? views : [])
    .filter(view => view?.enabled !== false && String(view?.sourceId || "").trim())
    .map(view => [String(view.sourceId), view]));
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < candidates.length; rightIndex += 1) {
      if (leftIndex === rightIndex) continue;
      const view = viewsBySourceId.get(String(candidates[rightIndex]?.sourceId || ""));
      if (view && sourceKeyForSource(candidates[leftIndex]) !== sourceKeyForSource(candidates[rightIndex])) {
        return { ruleSource: candidates[leftIndex], viewSource: candidates[rightIndex], view };
      }
    }
  }
  throw new Error("two distinct sources with an enabled PublishedView are required for source mismatch fixture");
}

function pickFileSourceView(sources, views) {
  const sourceById = new Map((Array.isArray(sources) ? sources : [])
    .filter(source => source?.enabled !== false && source?.kind === "file" && sourcePayload(source))
    .map(source => [String(source.sourceId), source]));
  const preferred = (Array.isArray(views) ? views : [])
    .filter(view => view?.enabled !== false && sourceById.has(String(view?.sourceId || "")))
    .sort((left, right) => {
      const leftRules = (Array.isArray(left?.allowedRuleIds) ? left.allowedRuleIds : []).length + (left?.defaultRuleId ? 1 : 0);
      const rightRules = (Array.isArray(right?.allowedRuleIds) ? right.allowedRuleIds : []).length + (right?.defaultRuleId ? 1 : 0);
      return leftRules - rightRules;
    })[0];
  if (!preferred) {
    throw new Error("an enabled file source with an enabled PublishedView is required for inactive source/view fixture");
  }
  return { source: sourceById.get(String(preferred.sourceId)), view: preferred };
}

function profilePayload(id, { enabled = true } = {}) {
  return {
    id,
    enabled,
    detector: "yolo",
    fps: 6,
    maxQueue: 1,
    confidence: 0.25,
    nms: 0.45,
    trackingClasses: ["person"],
    analysis: { classes: ["person"] },
  };
}

function eventTemplatePayload(id, { enabled = true } = {}) {
  return {
    id,
    enabled,
    ruleKind: "scenario",
    analysis: { classes: ["person"] },
    event: {
      type: "loitering",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }],
      },
      minConfidence: 0.35,
      minDurationMs: 0,
    },
    scenario: {
      type: "loitering",
      enabled: true,
      dwellTimeMs: 10000,
      cooldownMs: 20000,
      targetClasses: ["person"],
    },
  };
}

function vaRulePayload(id, templateRuleId, profileId, source) {
  return {
    id,
    name: `관계 검증 ${id}`,
    enabled: true,
    priority: Number(id),
    source: sourcePayload(source),
    analysis: {
      profileId,
      classes: ["person"],
    },
    event: {
      type: "loitering",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }],
      },
      minConfidence: 0.35,
      minDurationMs: 0,
    },
    scenario: {
      type: "loitering",
      enabled: true,
      dwellTimeMs: 10000,
      cooldownMs: 20000,
      targetClasses: ["person"],
    },
    templateStart: { ruleId: templateRuleId },
  };
}

function viewPayloadWithRule(view, ruleId, { enabled = true } = {}) {
  const allowedOverlayModes = new Set([
    ...(Array.isArray(view?.allowedOverlayModes) ? view.allowedOverlayModes.map(String) : []),
    "va-rule",
  ].filter(Boolean));
  const allowedRuleIds = new Set([
    ...(Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds.map(String) : []),
    String(ruleId),
  ].filter(Boolean));
  return {
    ...viewRestorePayload(view),
    enabled,
    allowedOverlayModes: Array.from(allowedOverlayModes),
    defaultRuleId: ruleId,
    allowedRuleIds: Array.from(allowedRuleIds),
  };
}

function viewRestorePayload(view) {
  return {
    viewId: String(view?.viewId || ""),
    sourceId: String(view?.sourceId || ""),
    displayName: String(view?.displayName || view?.viewId || ""),
    enabled: view?.enabled !== false,
    showDashboard: view?.showDashboard !== false,
    showEvents: view?.showEvents !== false,
    showMetadataSummary: view?.showMetadataSummary !== false,
    allowedOverlayModes: Array.isArray(view?.allowedOverlayModes) ? view.allowedOverlayModes.map(String) : [],
    defaultRuleId: String(view?.defaultRuleId || ""),
    allowedRuleIds: Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds.map(String) : [],
    clientGroups: Array.isArray(view?.clientGroups) ? view.clientGroups.map(String) : [],
    maxTiles: Number(view?.maxTiles || 1),
  };
}

function sourceRestorePayload(source, { enabled = source?.enabled !== false } = {}) {
  const payload = {
    sourceId: String(source?.sourceId || ""),
    displayName: String(source?.displayName || source?.sourceId || ""),
    kind: String(source?.kind || ""),
    enabled,
    tags: Array.isArray(source?.tags) ? source.tags.map(String) : [],
    ownerGroup: String(source?.ownerGroup || ""),
    site: String(source?.site || ""),
    group: String(source?.group || ""),
    floor: String(source?.floor || ""),
    zone: String(source?.zone || ""),
  };
  if (payload.kind === "file") payload.file = String(source?.file || "");
  if (payload.kind === "rtsp") payload.rtspUrl = String(source?.rtspUrl || source?.url || "");
  if (payload.kind === "whep") payload.whepUrl = String(source?.whepUrl || source?.url || "");
  if (payload.kind === "webrtc") payload.webrtcSourceId = String(source?.webrtcSourceId || source?.url || "");
  if (payload.kind === "http" || payload.kind === "hls" || payload.kind === "youtube") {
    payload.httpUrl = String(source?.httpUrl || source?.url || "");
  }
  return payload;
}

async function deleteCreatedItem(item) {
  const path = item.type === "vaRule"
    ? `/lab/analysis/va-rules/${encodeURIComponent(item.id)}`
    : item.type === "profile"
      ? `/lab/analysis/profiles/${encodeURIComponent(item.id)}`
      : item.type === "viewRestore"
        ? `/ops/api/views/${encodeURIComponent(item.id)}`
        : item.type === "sourceRestore"
          ? `/ops/api/sources/${encodeURIComponent(item.id)}`
        : item.type === "clientSession"
          ? `/client/api/views/${encodeURIComponent(item.viewId)}/webrtc/session/${encodeURIComponent(item.id)}`
          : `/lab/analysis/rules/${encodeURIComponent(item.id)}`;
  if (item.type === "viewRestore" || item.type === "sourceRestore") {
    await requestJson(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload),
    }).catch(() => {});
    return;
  }
  if (item.type === "clientSession") {
    await requestJson(path, { method: "DELETE" }).catch(() => {});
    return;
  }
  await requestJson(path, { method: "DELETE" }).catch(() => {});
}

function sourcePayload(source) {
  const kind = String(source?.kind || "").trim();
  if (kind === "file" && source?.file) return { kind: "file", file: source.file };
  if (kind === "rtsp" && source?.rtspUrl) return { kind: "rtsp", url: source.rtspUrl };
  if (kind === "whep" && source?.whepUrl) return { kind: "whep", url: source.whepUrl };
  if ((kind === "http" || kind === "hls" || kind === "youtube") && source?.httpUrl) {
    return { kind, url: source.httpUrl };
  }
  if (kind === "webrtc" && source?.webrtcSourceId) return { kind: "webrtc", url: source.webrtcSourceId };
  return null;
}

function sourceKeyForSource(source) {
  if (source?.canonicalSourceKey) return String(source.canonicalSourceKey);
  return sourceKeyForPayload(sourcePayload(source));
}

function sourceKeyForVaRule(source) {
  return sourceKeyForPayload(source);
}

function sourceKeyForPayload(source) {
  const kind = String(source?.kind || "").trim();
  if (kind === "file") return source?.file ? `file:${normalizeFileToken(source.file)}` : "";
  const url = String(source?.url || source?.rtspUrl || source?.whepUrl || source?.httpUrl || source?.webrtcSourceId || "").trim();
  if (!url) return "";
  if (kind === "webrtc") return `webrtc:${url.toLowerCase()}`;
  if (kind === "whep") return `whep:${canonicalUrl(url)}`;
  if (kind === "rtsp") return `rtsp:${canonicalUrl(url)}`;
  if (kind === "http" || kind === "hls" || kind === "youtube") return `http:${canonicalUrl(url)}`;
  return `${kind}:${url}`;
}

function normalizeFileToken(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return String(value || "").trim();
  }
}

async function expectHttpError(path, options, status, errorNeedle) {
  const response = await fetch(`${httpBase}${path}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {}
  if (response.status !== status) {
    throw new Error(`${path} expected HTTP ${status}, got ${response.status}: ${text.slice(0, 160)}`);
  }
  const message = String(payload?.error || text || "");
  if (errorNeedle && !message.includes(errorNeedle)) {
    throw new Error(`${path} error did not include ${errorNeedle}: ${message}`);
  }
  return payload;
}

async function expectHttpStatus(path, options, status) {
  const response = await fetch(`${httpBase}${path}`, options);
  const text = await response.text();
  if (response.status !== status) {
    throw new Error(`${path} expected HTTP ${status}, got ${response.status}: ${text.slice(0, 160)}`);
  }
  return text;
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
