#!/usr/bin/env node
// 파일 용도: /client/dashboard polish(다중 view 비교, 상태 문구, 로딩/오류/빈 상태)를 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("client dashboard script renders field summary and comparison", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "dashboardFieldState",
    "renderDashboardCompare",
    "loadClientDashboardCompare",
    "clientDashboardCompareFilter",
    "clientDashboardCompareSort",
    "clientDashboardComparePriority",
    "clientDashboardComparePreset",
    "clientDashboardPresetConfigKey",
    "clientDashboardPresetPolicy",
    "clientDashboardDefaultPlacePresets",
    "clientDashboardDefaultEventPresets",
    "normalizeClientDashboardPresetList",
    "mediaServerClientDashboardPresetConfig.v1",
    "clientDashboardPlacePreset",
    "clientDashboardEventPreset",
    "sourceTags",
    "ownerGroup",
    'data-testid="client-dashboard-field-summary"',
    'data-testid="client-dashboard-compare"',
    'data-testid="client-dashboard-preset-config"',
    'id="clientDashboardCompareFilter"',
    'id="clientDashboardCompareSort"',
    'id="clientDashboardPresetConfigInput"',
    "clientDashboardPresetApply",
    "clientDashboardPresetReset",
    "현장 요약",
    "채널 비교",
    "Preset 설정",
    "경고 우선",
    "이벤트 많은 순",
    "기본 현장",
    "모니터링",
    "라인 통과",
    "출입구",
    "정상 관제 중",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `client dashboard script is missing snippet: ${snippet}`);
  }
});

check("client dashboard has loading empty error wording", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "현장 상태 불러오는 중",
    "상태를 불러오지 못했습니다",
    "현장 대시보드를 보려면",
    "최근 이벤트 없음",
    "비교할 채널이 없습니다",
    "필터에 맞는 채널이 없습니다",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `client dashboard state wording is missing snippet: ${snippet}`);
  }
});

check("client dashboard comparison is responsive", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".client-dashboard-compare",
    ".client-compare-toolbar",
    ".client-preset-config",
    ".client-compare-grid",
    ".client-compare-card",
    ".client-compare-preset",
    ".client-compare-metrics",
    ".client-loading-state",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `client dashboard CSS is missing snippet: ${snippet}`);
  }
});

check("client dashboard API exposes sanitized field preset inputs", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    "\\\"sourceTags\\\"",
    "\\\"ownerGroup\\\"",
    "AppendClientViewIdentityJson",
    "ClientViewDashboardJson",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `client dashboard API is missing snippet: ${snippet}`);
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
console.log("== Client dashboard polish verification summary ==");
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
