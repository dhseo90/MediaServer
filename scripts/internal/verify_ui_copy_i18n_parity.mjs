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
    "'홈': 'Home'",
    "'운영': 'Ops'",
    "'대시보드': 'Dashboard'",
    "'채널': 'Channels'",
    "'룰': 'Rules'",
    "'사용자': 'Users'",
    "'미리보기': 'Client Preview'",
    "'관리자 클라이언트 미리보기': 'Client Preview as admin'",
    "'라이브': 'Live'",
    "'채널 목록': 'Channels'",
    "'사용자 목록': 'Users'",
    "'작업': 'Actions'",
    "'최근 인시던트 흐름': 'Recent Incident Timeline'",
    "'제목, 출처, incident/cid 검색': 'Search title, source, incident, or cid'",
    "'최근 인시던트 없음': 'No recent incidents'",
    "'즉시 인시던트 없음': 'No immediate incidents'",
    "'관련 화면': 'Related screen'",
    "'소스 상태 변경 이력': 'Source status change history'",
    "'상태 변화 audit은 /ops/sources 변경 이력의 소스 상태 변경 preset에서 확인합니다.':",
    "'상태 변경 이력과 retryable-only 재검증을 확인합니다.':",
    "'소스 상태 변경 이력에서 같은 source incident 흐름을 확인합니다.':",
    "'EventRecord 저장/POST 상태와 source health 단서를 함께 확인합니다.':",
    "'관련 root-cause 또는 source health incident와 같은 cid를 비교합니다.':",
    "'재생': 'Play'",
    "'재연결': 'Reconnect'",
    "'새로고침': 'Refresh'",
    "'정지': 'Stop'",
    "'도크': 'Dock'",
    "'비트레이트': 'Bitrate'",
    "'드롭': 'Dropped'",
    "'프리즈': 'Freeze'",
    "'VA/이벤트': 'VA/Event'",
    "'보기 방식': 'View mode'",
    "'채널 미선택': 'No channel selected'",
    "'상태 복사': 'Copy status'",
    "'상태 요약 복사 완료': 'Status summary copied'",
    "'복사할 상태가 없습니다.': 'No status is available to copy.'",
    "'클립보드 복사 실패. 아래 내용을 선택해 직접 복사하세요.': 'Clipboard copy failed. Select the text below and copy it manually.'",
    "'아래 텍스트를 선택해 직접 복사하세요.': 'Select the text below and copy it manually.'",
    "'수동 복사용 텍스트': 'Manual copy text'",
    "'계정 라이프사이클 정책': 'Account Lifecycle Policy'",
    "'초대 만료, 비밀번호 초기화, 비활성화/복구, 사용자 감사 export를 같은 운영 절차로 확인합니다.':",
    "'비밀번호 초기화': 'Reset password'",
    "서버 감사 로그에서 사용자 변경의 작업자",
    "서버 감사 로그에서 채널 변경의 작업자",
    "서버 감사 로그에서 룰 변경의 작업자",
    "사용자 감사 JSON/CSV/Diff JSON export를 내려받습니다.",
    "'이벤트 복사': 'Copy events'",
    "'이벤트 요약 복사 완료': 'Event summary copied'",
    "'클립보드 복사 실패': 'Clipboard copy failed'",
    "'클립보드 복사 실패. 주소창의 필터 링크를 직접 복사하세요.': 'Clipboard copy failed. Copy the filter link from the address bar.'",
    "'메타데이터 오류': 'Metadata error'",
  ];
  for (const snippet of required) {
    assert(js.includes(snippet), `translation map missing snippet: ${snippet}`);
  }
});

check("English screenshot-visible copy QA is pinned", () => {
  const policy = readText("docs/assets/ui/README.md");
  const capture = readText("scripts/internal/capture_docs_ui_assets.mjs");
  const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
  const manifest = readText("config/docs_ui_assets.json");
  for (const snippet of [
    "English visual copy QA checklist",
    "Home, Dashboard, Channels, Rules, Users, Client Preview",
    "Live, Dashboard",
    "nav, card title, table header, table action, tile control text",
    "Korean residue",
    "translation map",
  ]) {
    assert(policy.includes(snippet), `docs/assets/ui/README.md missing English visual QA snippet: ${snippet}`);
  }
  for (const snippet of [
    "withLanguageParam",
    "lang=${encodeURIComponent(language)}",
    "localStorage.setItem('mediaServerLanguage'",
    "locale: language === \"en\" ? \"en-US\" : \"ko-KR\"",
    "docs/assets/ui/en",
  ]) {
    assert(capture.includes(snippet), `capture_docs_ui_assets.mjs missing English capture snippet: ${snippet}`);
  }
  for (const snippet of [
    "/client/live?lang=en",
    "overflowX",
    "first tile a11y status mismatch",
    "document horizontal overflow",
  ]) {
    assert(uiSmoke.includes(snippet), `verify_ops_client_ui_smoke.mjs missing English visual smoke snippet: ${snippet}`);
  }
  for (const snippet of [
    "\"clientSafe\": true",
    "\"client-live.png\"",
    "\"client-dashboard.png\"",
  ]) {
    assert(manifest.includes(snippet), `docs UI asset manifest missing English client-safe snippet: ${snippet}`);
  }
});

check("product translation patterns include repeated live tile labels", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "^타일\\s+(\\d+):\\s+(.+)$",
    "^타일\\s+(\\d+)\\s+(시작|재생|재연결|새로고침|정지|연결 해제|채널 선택|채널|보기 방식|VA 오버레이|VA 룰)$",
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
  assert(clientScript.includes("clientDynamicText"), "client live script must render dynamic a11y copy in the current language");
  assert(uiSmoke.includes("client_live_tile_a11y_i18n_snapshot.json"), "ops/client UI smoke does not load client live a11y snapshot");
  assert(uiSmoke.includes("domExtraction.requiredKoreanParts"), "ops/client UI smoke does not use snapshot DOM extraction fields");
  assert(uiSmoke.includes("/client/live?lang=en"), "ops/client UI smoke does not verify English client live a11y DOM");
  assert(uiSmoke.includes("first tile a11y status mismatch"), "ops/client UI smoke does not compare extracted DOM text with snapshot");
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
    "'온라인': 'Online'",
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
