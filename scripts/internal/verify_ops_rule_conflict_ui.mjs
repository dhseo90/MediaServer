#!/usr/bin/env node
// 파일 용도: 운영자 룰 화면의 저장 전 validation panel과 충돌 차단 로직을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("ops rules page exposes validation panel", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    'data-testid="ops-rules-validation-panel"',
    'id="opsRulesValidationSummary"',
    'id="opsRulesValidationList"',
    "저장 전 검증",
  ];
  for (const snippet of required) {
    assert(html.includes(snippet), `rules page is missing validation panel snippet: ${snippet}`);
  }
});

check("ops rules script detects conflict references", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "opsRulesBuildValidationIssues",
    "opsRulesDraftBlockingIssues",
    "source-mismatch",
    "missing-profile",
    "missing-template",
    "missing-rule",
    "inactive-channel",
    "inactive-view",
    "inactive-profile",
    "inactive-template",
    "unauthorized-view",
    "priority-conflict",
    "view-mode-not-allowed",
    "view-rule-not-allowed",
    "template-profile-conflict",
    "opsRulesClassConflictMessages",
    "opsRulesViewAllowsVaRuleMode",
    "duplicate",
    "저장 전 검증 실패",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `rules script is missing conflict guard snippet: ${snippet}`);
  }
});

check("ops rules browser smoke blocks invalid profile", () => {
  const browserSmoke = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
  for (const snippet of [
    "pre-save validation did not block invalid profile",
    "__missing_profile_e2e__",
    "pre-save validation did not block invalid template",
    "__missing_template_e2e__",
    "attemptedWrites.length === 0",
  ]) {
    assert(browserSmoke.includes(snippet), `rules browser smoke is missing pre-save e2e snippet: ${snippet}`);
  }
});

check("server rejects va rule template class mismatch", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    "StringArrayFieldValues",
    "AnalysisClassesFromDocument",
    "vaRule analysis.classes must include template analysis.classes",
    "vaRule profile classes must include template analysis.classes",
    "vaRule analysis.profileId is inactive",
    "vaRule templateStart.ruleId is inactive",
    "vaRule priority conflicts with existing rule on same source",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `server validation is missing snippet: ${snippet}`);
  }
});

check("validation panel has responsive styling", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".validation-list",
    ".validation-item",
    ".validation-item.warn",
    ".validation-item.bad",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `rules validation CSS is missing snippet: ${snippet}`);
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
console.log("== Ops rule conflict UI verification summary ==");
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
