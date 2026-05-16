#!/usr/bin/env node
// 파일 용도: 제품 UI 주요 한국어 문구가 English translation map/pattern과 함께 유지되는지 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI copy i18n parity verification

Usage:
  ./server.sh verify-ui-copy-i18n-parity

Checks:
  - 최근 UI copy가 product English translation map에 등록되어 있는지
  - 반복 UI aria-label 패턴이 English translation pattern에 포함되는지
  - copy matrix 문서가 i18n parity 검증을 안내하는지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("product translation map includes recent UI copy", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "'최근 인시던트 흐름': 'Recent Incident Timeline'",
    "'최근 인시던트 없음': 'No recent incidents'",
    "'즉시 인시던트 없음': 'No immediate incidents'",
    "'관련 화면': 'Related screen'",
    "'소스 상태 변경 이력': 'Source status change history'",
    "'상태 변화 audit은 /ops/sources 변경 이력의 소스 상태 변경 preset에서 확인합니다.':",
    "'재연결': 'Reconnect'",
    "'정지': 'Stop'",
    "'보기 방식': 'View mode'",
    "'채널 미선택': 'No channel selected'",
    "'상태 복사': 'Copy status'",
    "'상태 요약 복사 완료': 'Status summary copied'",
    "'복사할 상태가 없습니다.': 'No status is available to copy.'",
    "'이벤트 복사': 'Copy events'",
    "'이벤트 요약 복사 완료': 'Event summary copied'",
    "'클립보드 복사 실패': 'Clipboard copy failed'",
    "'클립보드 복사 실패. 주소창의 필터 링크를 직접 복사하세요.': 'Clipboard copy failed. Copy the filter link from the address bar.'",
  ];
  for (const snippet of required) {
    assert(js.includes(snippet), `translation map missing snippet: ${snippet}`);
  }
});

check("product translation patterns include repeated live tile labels", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "^타일\\s+(\\d+):\\s+(.+)$",
    "^타일\\s+(\\d+)\\s+(시작|재연결|정지|채널|보기 방식)$",
    "^상태\\s+(.+)$",
    "^메타데이터\\s+(.+)$",
    "^재시도\\s+(\\d+)$",
    "Tile ${count}",
    "translatePattern(detail.trim())",
  ];
  for (const snippet of required) {
    assert(js.includes(snippet), `translation pattern missing snippet: ${snippet}`);
  }
});

check("client live tile a11y i18n snapshot is pinned", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const clientScript = readText("src/ingress/product_ui_page_scripts.cpp");
  const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
  const fixture = JSON.parse(readText("test/fixtures/client_live_tile_a11y_i18n_snapshot.json"));
  assert(fixture.schema === "media-server.client-live-tile-a11y-i18n-snapshot.v1", "snapshot schema mismatch");
  assert(clientScript.includes("liveTileA11yStatus"), "client live script missing liveTileA11yStatus");
  assert(uiSmoke.includes("client_live_tile_a11y_i18n_snapshot.json"), "ops/client UI smoke does not load client live a11y snapshot");
  assert(uiSmoke.includes("domExtraction.requiredKoreanParts"), "ops/client UI smoke does not use snapshot DOM extraction fields");
  assert(Array.isArray(fixture.scenarios) && fixture.scenarios.length >= 4, "snapshot scenarios must cover at least 4 tile states");
  assert(fixture.domExtraction?.selector === "[data-role=\"a11y-status\"]", "snapshot DOM extraction selector mismatch");
  for (const value of ["타일 1:", "상태", "연결", "트랙", "이벤트", "메타데이터", "재시도"]) {
    assert((fixture.domExtraction?.requiredKoreanParts || []).includes(value), `snapshot DOM extraction missing part: ${value}`);
  }
  for (const value of fixture.requiredKoreanParts || []) {
    assert(fixture.korean.includes(value), `snapshot Korean text missing part: ${value}`);
  }
  for (const value of fixture.requiredEnglishParts || []) {
    assert(fixture.english.includes(value), `snapshot English text missing part: ${value}`);
  }
  for (const scenario of fixture.scenarios || []) {
    assert(scenario.id && scenario.korean && scenario.english, `snapshot scenario is incomplete: ${JSON.stringify(scenario)}`);
    for (const snippet of ["타일", "상태", "연결", "트랙", "이벤트", "메타데이터", "재시도"]) {
      assert(scenario.korean.includes(snippet), `snapshot scenario ${scenario.id} missing Korean snippet: ${snippet}`);
    }
    for (const snippet of ["Tile", "Status", "Connection", "Tracks", "Events", "Metadata", "Retry"]) {
      assert(scenario.english.includes(snippet), `snapshot scenario ${scenario.id} missing English snippet: ${snippet}`);
    }
  }
  for (const snippet of [
    "Status Live",
    "Connection Connected",
    "Metadata Normal",
    "Status Stale",
    "Connection Connecting",
    "Connection Failed",
    "Status Error",
  ]) {
    assert(fixture.scenarios.some((scenario) => String(scenario.english || "").includes(snippet)), `snapshot scenarios missing English state: ${snippet}`);
  }
  for (const snippet of [
    "'라이브': 'Live'",
    "'채널 미선택': 'No channel selected'",
    "'오프라인': 'Offline'",
    "'연결됨': 'Connected'",
    "'연결 중': 'Connecting'",
    "'연결 끊김': 'Disconnected'",
    "'실패': 'Failed'",
    "'정상': 'Normal'",
    "'지연': 'Stale'",
    "'오류': 'Error'",
    "'트랙': 'Tracks'",
    "'이벤트': 'Events'",
    "'메타데이터': 'Metadata'",
    "'미제공': 'Not provided'",
    "'재시도': 'Retry'",
    "^타일\\s+(\\d+):\\s+(.+)$",
    "^상태\\s+(.+)$",
    "^연결\\s+(.+)$",
    "^트랙\\s+(.+)$",
    "^이벤트\\s+(.+)$",
    "^메타데이터\\s+(.+)$",
    "^재시도\\s+(\\d+)$",
  ]) {
    assert(js.includes(snippet), `snapshot translation support missing snippet: ${snippet}`);
  }
});

check("copy matrix references i18n parity verifier", () => {
  const doc = readText("docs/ui-empty-loading-error-copy-matrix.md");
  const backlog = readText("docs/development-backlog.md");
  assert(doc.includes("./server.sh verify-ui-copy-i18n-parity"), "copy matrix doc missing i18n verifier");
  assert(doc.includes("client_live_tile_a11y_i18n_snapshot.json"), "copy matrix doc missing client live a11y i18n snapshot");
  assert(backlog.includes("UI copy Korean/English parity"), "backlog missing i18n parity closure");
});

check("server entrypoint exposes i18n parity verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-ui-copy-i18n-parity"), "server.sh is missing verify-ui-copy-i18n-parity");
  assert(server.includes("verify_ui_copy_i18n_parity.mjs"), "server.sh is missing verifier script reference");
  assert(inventory.includes("verify_ui_copy_i18n_parity.mjs"), "script inventory is missing verify_ui_copy_i18n_parity.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.error(`[fail] ${item.name}: ${error.message}`);
  }
}

console.log("");
console.log("== UI copy i18n parity verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
