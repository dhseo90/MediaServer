// 파일 용도: /ops/rules preview와 문서 screenshot 검증이 같은 rule/profile fixture를 쓰도록 돕는다.
// 동작 요약: 필요한 profile/rule/VA rule fixture를 생성하고 검증 후 정리할 helper를 제공한다.

export async function ensureRulePreviewPrerequisites({
  httpBase,
  includeVaRule = false,
  includeInactiveReferences = false,
  profileStart = 9901,
  ruleStart = 9911,
  vaRuleStart = 9921,
} = {}) {
  if (!httpBase) throw new Error("httpBase is required");
  const created = { profileId: "", ruleId: "", vaRuleId: "", inactiveProfileId: "", inactiveRuleId: "" };
  const catalog = await requestJson(httpBase, "/ops/api/rules/catalog");
  const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
  const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
  const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
  if (profiles.length === 0) {
    created.profileId = findFreeNumericId([profiles, rules, vaRules], profileStart);
    await requestJson(httpBase, `/lab/analysis/profiles/${encodeURIComponent(created.profileId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulePreviewProfilePayload(created.profileId)),
    });
  }
  if (rules.length === 0) {
    const nextCatalog = created.profileId ? await requestJson(httpBase, "/ops/api/rules/catalog") : catalog;
    created.ruleId = findFreeNumericId([nextCatalog.profiles, nextCatalog.rules, nextCatalog.vaRules], ruleStart);
    await requestJson(httpBase, `/lab/analysis/rules/${encodeURIComponent(created.ruleId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulePreviewEventTemplatePayload(
        created.ruleId,
        created.profileId || findFirstProfileId(nextCatalog) || "1",
      )),
    });
  }
  if (includeVaRule && vaRules.length === 0) {
    const nextCatalog = created.ruleId || created.profileId
      ? await requestJson(httpBase, "/ops/api/rules/catalog")
      : catalog;
    const profileId = created.profileId || findFirstProfileId(nextCatalog) || "1";
    const ruleId = created.ruleId || findFirstRuleId(nextCatalog) || "1";
    const template = (Array.isArray(nextCatalog.rules) ? nextCatalog.rules : [])
      .find(item => String(item?.id || item?.ruleId || "").trim() === ruleId);
    const templateClasses = classesFromRuleTemplate(template);
    created.vaRuleId = findFreeNumericId([nextCatalog.profiles, nextCatalog.rules, nextCatalog.vaRules], vaRuleStart);
    await requestJson(httpBase, `/lab/analysis/va-rules/${encodeURIComponent(created.vaRuleId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulePreviewVaRulePayload(created.vaRuleId, profileId, ruleId, templateClasses)),
    });
  }
  if (includeInactiveReferences) {
    const inactiveProfileCatalog = await requestJson(httpBase, "/ops/api/rules/catalog");
    created.inactiveProfileId = findFreeNumericId(
      [inactiveProfileCatalog.profiles, inactiveProfileCatalog.rules, inactiveProfileCatalog.vaRules],
      profileStart + 100,
    );
    await requestJson(httpBase, `/lab/analysis/profiles/${encodeURIComponent(created.inactiveProfileId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulePreviewProfilePayload(created.inactiveProfileId, { enabled: false })),
    });
    const inactiveRuleCatalog = await requestJson(httpBase, "/ops/api/rules/catalog");
    created.inactiveRuleId = findFreeNumericId(
      [inactiveRuleCatalog.profiles, inactiveRuleCatalog.rules, inactiveRuleCatalog.vaRules],
      ruleStart + 100,
    );
    await requestJson(httpBase, `/lab/analysis/rules/${encodeURIComponent(created.inactiveRuleId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rulePreviewEventTemplatePayload(
        created.inactiveRuleId,
        findFirstProfileId(inactiveRuleCatalog) || "1",
        { enabled: false },
      )),
    });
  }
  return created.profileId || created.ruleId || created.vaRuleId || created.inactiveProfileId || created.inactiveRuleId
    ? created
    : null;
}

export async function cleanupRulePreviewPrerequisites({ httpBase, created } = {}) {
  if (!httpBase || !created) return;
  if (created.vaRuleId) {
    await requestJson(httpBase, `/lab/analysis/va-rules/${encodeURIComponent(created.vaRuleId)}`, { method: "DELETE" }).catch(() => {});
  }
  if (created.inactiveRuleId) {
    await requestJson(httpBase, `/lab/analysis/rules/${encodeURIComponent(created.inactiveRuleId)}`, { method: "DELETE" }).catch(() => {});
  }
  if (created.ruleId) {
    await requestJson(httpBase, `/lab/analysis/rules/${encodeURIComponent(created.ruleId)}`, { method: "DELETE" }).catch(() => {});
  }
  if (created.inactiveProfileId) {
    await requestJson(httpBase, `/lab/analysis/profiles/${encodeURIComponent(created.inactiveProfileId)}`, { method: "DELETE" }).catch(() => {});
  }
  if (created.profileId) {
    await requestJson(httpBase, `/lab/analysis/profiles/${encodeURIComponent(created.profileId)}`, { method: "DELETE" }).catch(() => {});
  }
}

async function requestJson(httpBase, urlPath, options = {}) {
  const response = await fetch(`${httpBase}${urlPath}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 180)}`);
  }
  if (!response.ok) {
    throw new Error(`${urlPath} failed HTTP ${response.status}: ${payload?.error || text.slice(0, 180)}`);
  }
  return payload;
}

function findFirstProfileId(catalog) {
  return (Array.isArray(catalog?.profiles) ? catalog.profiles : [])
    .map(item => String(item?.id || item?.profileId || "").trim())
    .find(Boolean) || "";
}

function findFirstRuleId(catalog) {
  return (Array.isArray(catalog?.rules) ? catalog.rules : [])
    .map(item => String(item?.id || item?.ruleId || "").trim())
    .find(Boolean) || "";
}

function classesFromRuleTemplate(rule) {
  const candidates = [
    rule?.analysis?.classes,
    rule?.scenario?.targetClasses,
  ];
  const classes = candidates
    .find(value => Array.isArray(value) && value.length > 0)
    ?.map(item => String(item || "").trim())
    .filter(Boolean) || [];
  return classes.length ? Array.from(new Set(classes)) : ["person"];
}

function findFreeNumericId(groups, start) {
  const used = new Set();
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      for (const key of ["id", "profileId", "ruleId"]) {
        const value = String(item?.[key] || "").trim();
        if (value) used.add(value);
      }
    }
  }
  for (let id = start; id < start + 200; id += 1) {
    const candidate = String(id);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`failed to allocate temporary rule preview id from ${start}`);
}

function rulePreviewProfilePayload(id, { enabled = true } = {}) {
  return {
    id,
    enabled,
    detector: "yolo",
    fps: 6,
    maxQueue: 1,
    confidence: 0.25,
    nms: 0.45,
    inputWidth: 640,
    inputHeight: 640,
    adaptive: true,
  };
}

function rulePreviewEventTemplatePayload(id, profileId, { enabled = true } = {}) {
  return {
    id,
    enabled,
    match: { sourceKind: "*", route: "*" },
    analysis: { profileId, classes: ["person"] },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
      },
      minConfidence: 0.25,
      minDurationMs: 0,
    },
    outputs: { overlay: true, metadata: true, events: true },
    ruleKind: "scenario",
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 2000,
      dwellTimeMs: 10000,
      cooldownMs: 5000,
      targetClasses: ["person"],
    },
  };
}

function rulePreviewVaRulePayload(id, profileId, ruleId, classes = ["person"]) {
  const normalizedClasses = Array.isArray(classes) && classes.length > 0 ? classes : ["person"];
  return {
    id,
    name: "VA Test File preview",
    enabled: true,
    source: { kind: "file", file: "va_four_scene_sample.mp4" },
    analysis: { profileId, classes: normalizedClasses },
    templateStart: { ruleId },
    priority: 0,
    outputs: { overlay: true, metadata: true, events: true },
    geometry: {
      type: "polygon",
      points: [{ x: 0.18, y: 0.2 }, { x: 0.82, y: 0.2 }, { x: 0.82, y: 0.78 }, { x: 0.18, y: 0.78 }],
    },
  };
}
