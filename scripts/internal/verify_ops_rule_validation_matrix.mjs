#!/usr/bin/env node
// 파일 용도: Ops rule 저장 전/서버 validation 시나리오를 fixture matrix로 고정한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

const ruleValidationMatrixFixtures = [
  {
    id: "duplicate-id",
    owner: "server-ui",
    fixture: {
      vaRules: [{ id: "10" }, { id: "10" }],
      eventTemplates: [{ id: "20" }, { id: "20" }],
      profiles: [{ id: "30" }, { id: "30" }],
    },
    uiSnippets: [
      "opsRulesDuplicateIds",
      "opsRulesIssue('duplicate'",
      "중복 채널 분석 설정 ID",
      "중복 이벤트 템플릿 ID",
      "중복 분석 프로파일 ID",
    ],
    serverSnippets: ["vaRule id already exists", "analysis document id already exists"],
    docSnippets: ["duplicate id", "중복 ID"],
  },
  {
    id: "inactive-profile",
    owner: "server-ui",
    fixture: {
      profile: { id: "profile-inactive", enabled: false, analysis: { classes: ["person"] } },
      vaRule: { analysis: { profileId: "profile-inactive", classes: ["person"] } },
    },
    uiSnippets: ["inactive-profile"],
    serverSnippets: ["vaRule analysis.profileId is inactive"],
    docSnippets: ["inactive profile/template"],
  },
  {
    id: "missing-profile",
    owner: "server-ui",
    fixture: {
      vaRule: { analysis: { profileId: "profile-missing", classes: ["person"] } },
    },
    uiSnippets: ["missing-profile", "프로파일", "찾을 수 없습니다"],
    serverSnippets: ["vaRule analysis.profileId does not exist"],
    docSnippets: ["missing reference"],
  },
  {
    id: "inactive-template",
    owner: "server-ui",
    fixture: {
      template: { id: "template-inactive", enabled: false, analysis: { classes: ["person"] } },
      vaRule: { templateStart: { ruleId: "template-inactive" } },
    },
    uiSnippets: ["inactive-template"],
    serverSnippets: ["vaRule templateStart.ruleId is inactive"],
    docSnippets: ["inactive profile/template"],
  },
  {
    id: "missing-template",
    owner: "server-ui",
    fixture: {
      vaRule: { templateStart: { ruleId: "template-missing" } },
    },
    uiSnippets: ["missing-template", "이벤트 템플릿", "찾을 수 없습니다"],
    serverSnippets: ["vaRule templateStart.ruleId does not exist"],
    docSnippets: ["missing reference"],
  },
  {
    id: "priority-conflict",
    owner: "server-ui",
    fixture: {
      existing: { id: "10", priority: 20, source: { kind: "file", file: "sample_h264.mp4" } },
      candidate: { id: "11", priority: 20, source: { kind: "file", file: "sample_h264.mp4" } },
    },
    uiSnippets: ["priority-conflict"],
    serverSnippets: ["vaRule priority conflicts with existing rule on same source"],
    docSnippets: ["priority conflict"],
  },
  {
    id: "unauthorized-view",
    owner: "ui",
    fixture: {
      view: { viewId: "1", allowedOverlayModes: ["raw", "va-overlay"], allowedRuleIds: [] },
      vaRule: { id: "10", source: { kind: "file", file: "sample_h264.mp4" } },
    },
    uiSnippets: ["unauthorized-view", "view-mode-not-allowed", "view-rule-not-allowed"],
    serverSnippets: [],
    docSnippets: ["unauthorized view"],
  },
  {
    id: "template-class-mismatch",
    owner: "server-ui",
    fixture: {
      template: { id: "template-person", analysis: { classes: ["person"] } },
      vaRule: { analysis: { classes: ["vehicle"], profileId: "1" } },
    },
    uiSnippets: ["template-profile-conflict", "opsRulesClassConflictMessages"],
    serverSnippets: ["vaRule analysis.classes must include template analysis.classes"],
    docSnippets: ["VA class mismatch"],
  },
  {
    id: "profile-template-class-mismatch",
    owner: "server-ui",
    fixture: {
      profile: { id: "profile-vehicle", analysis: { classes: ["vehicle"] } },
      template: { id: "template-person", analysis: { classes: ["person"] } },
    },
    uiSnippets: ["template-profile-conflict", "opsRulesClassConflictMessages"],
    serverSnippets: ["vaRule profile classes must include template analysis.classes"],
    docSnippets: ["VA class mismatch"],
  },
  {
    id: "source-mismatch",
    owner: "server-ui",
    fixture: {
      view: { viewId: "1", sourceId: "1" },
      vaRule: { id: "10", source: { kind: "file", file: "other.mp4" } },
    },
    uiSnippets: ["source-mismatch"],
    serverSnippets: ["vaRule source must match PublishedView source"],
    docSnippets: ["source mismatch"],
  },
  {
    id: "inactive-channel",
    owner: "server-ui",
    fixture: {
      source: { sourceId: "1", enabled: false },
      view: { viewId: "1", enabled: true, allowedRuleIds: ["10"] },
      vaRule: { id: "10" },
    },
    uiSnippets: ["inactive-channel", "비활성 채널"],
    serverSnippets: ["PublishedView source is not available"],
    docSnippets: ["비활성 채널/PublishedView"],
  },
  {
    id: "inactive-view",
    owner: "server-ui",
    fixture: {
      source: { sourceId: "1", enabled: true },
      view: { viewId: "1", enabled: false, allowedRuleIds: ["10"] },
      vaRule: { id: "10" },
    },
    uiSnippets: ["inactive-view", "비활성 PublishedView"],
    serverSnippets: ["PublishedView not found"],
    docSnippets: ["비활성 채널/PublishedView"],
  },
];

check("rule validation matrix has required fixtures", () => {
  const ids = new Set();
  for (const fixture of ruleValidationMatrixFixtures) {
    assert(fixture.id && !ids.has(fixture.id), `duplicate or empty fixture id: ${fixture.id}`);
    ids.add(fixture.id);
    assert(fixture.owner, `fixture ${fixture.id} is missing owner`);
    assert(fixture.fixture && Object.keys(fixture.fixture).length > 0, `fixture ${fixture.id} has no payload`);
    assert(Array.isArray(fixture.uiSnippets), `fixture ${fixture.id} has no uiSnippets`);
    assert(Array.isArray(fixture.serverSnippets), `fixture ${fixture.id} has no serverSnippets`);
  }
  for (const required of ["duplicate-id", "inactive-profile", "missing-profile", "inactive-template", "missing-template", "priority-conflict", "unauthorized-view", "template-class-mismatch", "profile-template-class-mismatch", "inactive-channel", "inactive-view"]) {
    assert(ids.has(required), `required fixture missing: ${required}`);
  }
});

check("UI validation covers every matrix fixture", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  for (const fixture of ruleValidationMatrixFixtures) {
    for (const snippet of fixture.uiSnippets) {
      assert(script.includes(snippet), `UI validation missing ${fixture.id} snippet: ${snippet}`);
    }
  }
});

check("server validation covers server-owned fixtures", () => {
  const server = [
    readText("src/ingress/webrtc_http_server.cpp"),
    readText("src/ingress/source_view_registry.cpp"),
  ].join("\n");
  for (const fixture of ruleValidationMatrixFixtures.filter(item => item.owner.includes("server"))) {
    for (const snippet of fixture.serverSnippets) {
      assert(server.includes(snippet), `server validation missing ${fixture.id} snippet: ${snippet}`);
    }
  }
});

check("docs list rule validation matrix scenarios", () => {
  const docs = readText("docs/ui-guide.md");
  for (const fixture of ruleValidationMatrixFixtures) {
    for (const snippet of fixture.docSnippets) {
      assert(docs.includes(snippet), `docs missing ${fixture.id} snippet: ${snippet}`);
    }
  }
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Ops rule validation matrix summary ==");
console.log(`- fixtures: ${ruleValidationMatrixFixtures.length}`);
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
