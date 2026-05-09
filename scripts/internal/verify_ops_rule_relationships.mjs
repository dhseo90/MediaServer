#!/usr/bin/env node
// 파일 용도: 채널/PublishedView/VA 룰/이벤트 템플릿/분석 프로파일 참조 관계와 저장 전 validation을 검증한다.

import process from "node:process";

import { nextNumericIds } from "./numeric_id_helpers.mjs";

const args = parseArgs(process.argv.slice(2));
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");

const initial = await loadGraph();
assertCleanGraph("initial", initial);

const usedIds = new Set([
  ...initial.eventTemplates.map(item => String(item?.id || "")),
  ...initial.vaRules.map(item => String(item?.id || "")),
  ...initial.profiles.map(item => String(item?.id || item?.profileId || "")),
]);
const ids = nextNumericIds(usedIds, { count: 3, start: 9901, end: 9999, label: "ops rule relationship id" });
const eventRuleId = ids[0];
const validVaRuleId = ids[1];
const invalidVaRuleId = ids[2];
const created = [];

try {
  const source = pickSource(initial.sources);
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
    "profileId",
  );
  console.log("[pass] invalid-profile rejected");

  await expectHttpError(
    `/lab/analysis/va-rules/${encodeURIComponent(invalidVaRuleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vaRulePayload(invalidVaRuleId, "999999998", "1", source)),
    },
    400,
    "templateStart.ruleId",
  );
  console.log("[pass] invalid-template rejected");

  await requestJson(`/lab/analysis/va-rules/${encodeURIComponent(validVaRuleId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vaRulePayload(validVaRuleId, eventRuleId, "1", source)),
  });
  created.push({ type: "vaRule", id: validVaRuleId });
  console.log(`[pass] relationship-fixture va-rule ${validVaRuleId}`);

  const withFixture = await loadGraph();
  assertCleanGraph("with-fixture", withFixture);
  console.log("[pass] ops-rule-relationships");
} finally {
  for (const item of created.reverse()) {
    const path = item.type === "vaRule"
      ? `/lab/analysis/va-rules/${encodeURIComponent(item.id)}`
      : `/lab/analysis/rules/${encodeURIComponent(item.id)}`;
    await requestJson(path, { method: "DELETE" }).catch(() => {});
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
  const issues = relationshipIssues(graph);
  if (issues.length > 0) {
    throw new Error(`${label} relationship issues:\n- ${issues.join("\n- ")}`);
  }
  console.log(`[pass] ${label} relationship graph: profiles=${graph.profiles.length}, eventTemplates=${graph.eventTemplates.length}, vaRules=${graph.vaRules.length}, views=${graph.views.length}`);
}

function relationshipIssues(graph) {
  const issues = [];
  const profileIds = new Set(graph.profiles.map(item => String(item?.id || item?.profileId || "")).filter(Boolean));
  const eventTemplateIds = new Set(graph.eventTemplates.map(item => String(item?.id || "")).filter(Boolean));
  const vaRulesById = new Map(graph.vaRules.map(item => [String(item?.id || ""), item]).filter(([id]) => id));
  const sourcesById = new Map(graph.sources.map(item => [String(item?.sourceId || ""), item]).filter(([id]) => id));

  for (const rule of graph.vaRules) {
    const id = String(rule?.id || "");
    const profileId = String(rule?.analysis?.profileId || "").trim();
    const templateId = String(rule?.templateStart?.ruleId || "").trim();
    if (!profileId) {
      issues.push(`vaRule ${id || "(unknown)"} missing analysis.profileId`);
    } else if (!profileIds.has(profileId)) {
      issues.push(`vaRule ${id || "(unknown)"} references missing profile ${profileId}`);
    }
    if (!templateId) {
      issues.push(`vaRule ${id || "(unknown)"} missing templateStart.ruleId`);
    } else if (!eventTemplateIds.has(templateId)) {
      issues.push(`vaRule ${id || "(unknown)"} references missing event template ${templateId}`);
    }
    const sourceKey = sourceKeyForVaRule(rule?.source || {});
    if (sourceKey && !graph.sources.some(source => sourceKeyForSource(source) === sourceKey)) {
      issues.push(`vaRule ${id || "(unknown)"} source is not registered as a channel source`);
    }
  }

  for (const view of graph.views) {
    const viewId = String(view?.viewId || "");
    const viewSource = sourcesById.get(String(view?.sourceId || ""));
    const allowed = new Set((Array.isArray(view?.allowedRuleIds) ? view.allowedRuleIds : []).map(String).filter(Boolean));
    const defaultRuleId = String(view?.defaultRuleId || "").trim();
    if (defaultRuleId && !allowed.has(defaultRuleId)) {
      issues.push(`PublishedView ${viewId} defaultRuleId ${defaultRuleId} is not included in allowedRuleIds`);
    }
    for (const ruleId of new Set([...allowed, defaultRuleId].filter(Boolean))) {
      const rule = vaRulesById.get(ruleId);
      if (!rule) {
        issues.push(`PublishedView ${viewId} references missing vaRule ${ruleId}`);
        continue;
      }
      if (!viewSource) {
        issues.push(`PublishedView ${viewId} sourceId ${view?.sourceId || ""} is missing`);
        continue;
      }
      const viewKey = sourceKeyForSource(viewSource);
      const ruleKey = sourceKeyForVaRule(rule.source || {});
      if (viewKey && ruleKey && viewKey !== ruleKey) {
        issues.push(`PublishedView ${viewId} vaRule ${ruleId} source mismatch`);
      }
    }
  }
  return issues;
}

function pickSource(sources) {
  const source = sources.find(item => item?.enabled !== false && sourcePayload(item));
  if (!source) {
    throw new Error("no source available for relationship fixture");
  }
  return source;
}

function eventTemplatePayload(id) {
  return {
    id,
    enabled: true,
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
