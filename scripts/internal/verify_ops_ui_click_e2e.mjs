#!/usr/bin/env node
// 파일 용도: Ops 제품 UI의 주요 탭/패널 흐름을 실제 브라우저 포인터 클릭으로 검증한다.

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage, parseWidthList } from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops UI direct click E2E

Usage:
  ./server.sh verify-ops-click-e2e [options]

Options:
  --http-base <url>         실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>         브라우저 대기 시간입니다. 기본 15000.
  --chrome-path <path>      Chrome/Chromium 실행 파일 경로입니다.
  --widths <csv>            클릭 검증 viewport 폭 목록입니다. 기본 390,1180.
  --height <px>             viewport 높이입니다. 기본 900.
  --debug-port-base <port>  Chrome CDP port 시작값입니다. 기본 9750.
  --output-dir <path>       screenshot/log 출력 디렉터리입니다.
  --auth-users-file <path>  접근 요청 승인/거절 fixture 복원 대상 users file입니다.
                            기본 MEDIA_SERVER_AUTH_USERS_FILE 또는 repo .media_server.users.json.
  --auth-ui-flow            session auth 제품 UI 흐름(/setup,/login,/invite/setup,/password/change)을 검증합니다.
  -h, --help                도움말 출력

Notes:
  - 위험 작업은 native dialog 없이 제품 화면 안 2회 확인 흐름으로 검증합니다.
  - Codex 인앱 브라우저 pane나 사용자 클릭에 의존하지 않습니다.
  - --auth-ui-flow는 MEDIA_SERVER_VERIFY_AUTH_* 비밀번호 환경변수가 없으면 시작하지 않습니다.
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "chrome-path",
  "widths",
  "height",
  "debug-port-base",
  "output-dir",
  "auth-users-file",
  "auth-ui-flow",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 15000);
const chromePath = args.chromePath || findChrome();
const widths = parseWidthList(args.widths || "390,1180");
const height = Number(args.height || 900);
const debugPortBase = Number(args.debugPortBase || 9750);
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_ops_click_e2e_${Date.now()}_${process.pid}`);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const authUsersFile = args.authUsersFile || process.env.MEDIA_SERVER_AUTH_USERS_FILE || ".media_server.users.json";
const authUiFlow = isTruthy(args.authUiFlow);
const authUiPasswords = authUiFlow ? readAuthUiPasswords() : null;

if (!chromePath) {
  console.error("[fail] Chrome executable not found");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

let passCount = 0;
let failCount = 0;
const failures = [];
const results = [];
const createdPrereqs = authUiFlow ? null : await ensureOpsClickPrereqs();

try {
  for (let index = 0; index < widths.length; index += 1) {
    const width = widths[index];
    const label = `${authUiFlow ? "auth-ui" : "ops-click"}-${width}`;
    const browser = await openBrowserPage({
      httpBase,
      pagePath: authUiFlow ? "/" : "/ops/sources",
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + index,
      width,
      height,
      outputDir,
    });
    try {
      const result = authUiFlow
        ? await runAuthUiFlow(browser, { width, label, passwords: authUiPasswords })
        : await runOpsClickFlow(browser, { width, label });
      passCount += 1;
      results.push({ label, width, status: "PASS", steps: result.steps });
      for (const step of result.steps) {
        console.log(`[pass] ${label} click step ${step}`);
      }
    } catch (error) {
      failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      const detail = error instanceof Error && error.stack ? `${message}\n${error.stack}` : message;
      failures.push(`[${label}] ${detail}`);
      results.push({ label, width, status: "FAIL", error: message });
      console.log(`[fail] ${label}: ${message}`);
    } finally {
      await browser.close();
    }
  }
} finally {
  if (!authUiFlow) await cleanupOpsClickPrereqs(createdPrereqs);
}

console.log("");
console.log(`== ${authUiFlow ? "Auth UI browser E2E" : "Ops UI direct click E2E"} 요약 ==`);
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);
writeE2eSummary({ authUiFlow, passCount, failCount, failures, results });
if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  await exitAfterSummary(1);
}
await exitAfterSummary(0);

function writeE2eSummary({ authUiFlow, passCount, failCount, failures, results }) {
  const title = authUiFlow ? "Auth UI browser E2E" : "Ops UI direct click E2E";
  const summary = {
    schema: "media-server.ops-ui-click-e2e-summary.v1",
    title,
    generatedAt: new Date().toISOString(),
    httpBase,
    widths,
    height,
    passCount,
    failCount,
    outputDir,
    results,
    failures,
  };
  const jsonPath = path.join(outputDir, "ops-click-e2e-summary.json");
  const mdPath = path.join(outputDir, "ops-click-e2e-summary.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(mdPath, buildE2eSummaryMarkdown(summary));
  console.log(`- evidence: ${jsonPath}`);
}

async function exitAfterSummary(code) {
  await Promise.all([
    flushStream(process.stdout),
    flushStream(process.stderr),
  ]);
  process.exit(code);
}

function flushStream(stream) {
  return new Promise(resolve => {
    if (!stream || stream.destroyed || !stream.writable) {
      resolve();
      return;
    }
    stream.write("", () => resolve());
  });
}

function buildE2eSummaryMarkdown(summary) {
  const lines = [
    `# ${summary.title}`,
    "",
    `- generatedAt: ${summary.generatedAt}`,
    `- httpBase: ${summary.httpBase}`,
    `- widths: ${summary.widths.join(",")}`,
    `- passCount: ${summary.passCount}`,
    `- failCount: ${summary.failCount}`,
    "",
    "| Label | Status | Steps |",
    "| --- | --- | ---: |",
  ];
  for (const item of summary.results) {
    lines.push(`| ${item.label} | ${item.status} | ${Array.isArray(item.steps) ? item.steps.length : 0} |`);
  }
  if (summary.failures.length > 0) {
    lines.push("", "## Failures", "");
    for (const failure of summary.failures) {
      lines.push(`- ${failure.replace(/\n/g, " ")}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function ensureOpsClickPrereqs() {
  const created = { eventRuleId: "", profileId: "" };
  const catalog = await requestJson("/ops/api/rules/catalog");
  const profiles = Array.isArray(catalog.profiles) ? catalog.profiles : [];
  const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
  const vaRules = Array.isArray(catalog.vaRules) ? catalog.vaRules : [];
  if (profiles.length === 0) {
    const profileId = nextNumericId([
      ...profiles.map(item => item?.id || item?.profileId),
      ...rules.map(item => item?.id),
      ...vaRules.map(item => item?.id),
    ], 9891);
    await requestJson(`/lab/analysis/profiles/${encodeURIComponent(profileId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opsClickProfilePayload(profileId)),
    });
    created.profileId = profileId;
  }
  if (rules.length > 0) return created;
  const id = nextNumericId([
    ...rules.map(item => item?.id),
    ...profiles.map(item => item?.id || item?.profileId),
    ...vaRules.map(item => item?.id),
    created.profileId,
  ], 9901);
  await requestJson(`/lab/analysis/rules/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opsClickEventTemplatePayload(id)),
  });
  created.eventRuleId = id;
  return created;
}

async function cleanupOpsClickPrereqs(created) {
  if (created?.eventRuleId) {
    await requestJson(`/lab/analysis/rules/${encodeURIComponent(created.eventRuleId)}`, {
      method: "DELETE",
    }).catch(error => console.log(`[warn] ops-click event template cleanup failed: ${error.message}`));
  }
  if (created?.profileId) {
    await requestJson(`/lab/analysis/profiles/${encodeURIComponent(created.profileId)}`, {
      method: "DELETE",
    }).catch(error => console.log(`[warn] ops-click profile cleanup failed: ${error.message}`));
  }
}

function nextNumericId(values, startAt) {
  const used = new Set((values || []).map(item => String(item || "")).filter(Boolean));
  for (let candidate = Number(startAt || 9901); candidate < 10000; candidate += 1) {
    if (!used.has(String(candidate))) return String(candidate);
  }
  throw new Error("no free numeric id for ops click prereq");
}

function opsClickProfilePayload(id) {
  return {
    id,
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

function opsClickEventTemplatePayload(id) {
  return {
    id,
    enabled: true,
    analysis: { classes: ["person", "vehicle"] },
    event: {
      type: "intrusion-dwell",
      region: {
        type: "polygon",
        points: [{ x: 0.2, y: 0.22 }, { x: 0.8, y: 0.22 }, { x: 0.8, y: 0.78 }, { x: 0.2, y: 0.78 }],
      },
      minConfidence: 0.25,
      minDurationMs: 0,
    },
    ruleKind: "scenario",
    scenario: {
      type: "intrusion-dwell",
      enabled: true,
      candidateTimeMs: 2000,
      dwellTimeMs: 10000,
      cooldownMs: 5000,
      targetClasses: ["person", "vehicle"],
    },
  };
}

async function requestJson(pathValue, options = {}) {
  const response = await fetch(`${httpBase}${pathValue}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${pathValue} returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) {
    throw new Error(`${pathValue} failed HTTP ${response.status}: ${payload?.error || text}`);
  }
  return payload;
}

async function requestStatus(pathValue, options = {}) {
  const response = await fetch(`${httpBase}${pathValue}`, options);
  const text = await response.text();
  return { status: response.status, ok: response.ok, text };
}

async function runOpsClickFlow(browser, context) {
  const steps = [];
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  await assertNoOverflow(browser, `${context.label}:sources-initial`);

  await clickSelector(browser, 'a[href="/ops/dashboard"]', "운영 대시보드");
  await waitForPath(browser, "/ops/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await assertVisible(browser, "#dashIncidentTimelineSearch", "인시던트 검색 입력");
  await assertVisible(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "__no_match__", "인시던트 검색 no-match");
  await assertHashParam(browser, "incidentQ", "__no_match__", "인시던트 검색 hash 저장");
  await assertText(browser, "#dashIncidentTimelineText", "필터에 맞는", "인시던트 필터 no-match 문구");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "", "인시던트 검색 초기화");
  await assertHashParamAbsent(browser, "incidentQ", "인시던트 검색 hash 초기화");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "event-record", "인시던트 출처 필터");
  await assertHashParam(browser, "incidentSource", "event-record", "인시던트 출처 hash 저장");
  await assertText(browser, "#dashIncidentTimelineBadges", "필터 결과", "인시던트 출처 필터 badge");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "event", "인시던트 공유 검색");
  await assertHashParam(browser, "incidentQ", "event", "인시던트 공유 검색 hash 저장");
  await clickSelector(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사");
  const shareUrl = await incidentShareUrl(browser, "인시던트 필터 링크 data");
  assertUrlContains(shareUrl, "/ops/dashboard", "인시던트 공유 링크 path");
  assertUrlContains(shareUrl, "incidentQ=event", "인시던트 공유 링크 검색");
  assertUrlContains(shareUrl, "incidentSource=event-record", "인시던트 공유 링크 출처");
  await installClipboardFailureStub(browser);
  await clickSelector(browser, "#dashIncidentTimelineShare", "인시던트 필터 링크 복사 fallback");
  await assertToastContains(browser, "주소창의 필터 링크", "인시던트 필터 링크 clipboard fallback");
  await restoreClipboardFailureStub(browser);
  await navigatePath(browser, "/ops/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await navigatePath(browser, shareUrl);
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await assertFormValue(browser, "#dashIncidentTimelineSearch", "event", "인시던트 검색 deeplink");
  await assertFormValue(browser, "#dashIncidentTimelineSource", "event-record", "인시던트 출처 deeplink");
  await assertText(browser, "#dashIncidentTimelineBadges", "필터 결과", "인시던트 deeplink 필터 badge");
  await setTextValue(browser, "#dashIncidentTimelineSearch", "", "인시던트 deeplink 검색 초기화");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "", "인시던트 출처 필터 초기화");
  await assertHashParamAbsent(browser, "incidentQ", "인시던트 deeplink 검색 hash 초기화");
  await assertHashParamAbsent(browser, "incidentSource", "인시던트 deeplink 출처 hash 초기화");
  await assertNoOverflow(browser, `${context.label}:dashboard-incident-filter`);
  await clickSelector(browser, "[data-root-cause-kind]", "문제 원인 다음 조치");
  await assertVisible(browser, "#dashRootCauseActionOutput", "문제 원인 조치 결과");
  await assertOpsDashboardRuntimeHealthFlow(browser, context);
  await assertNoOverflow(browser, `${context.label}:dashboard-root-cause-action`);
  await clickSelector(browser, 'a[href="/ops/sources"]', "채널 탭");
  await waitForPath(browser, "/ops/sources");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  steps.push("dashboard:incident-filter", "dashboard:root-cause-action", "dashboard:runtime-health-log");

  await clickSelector(browser, "#add-channel", "채널 추가");
  await assertVisible(browser, "#channel-detail-panel", "채널 추가 패널");
  await assertText(browser, "#channel-editor-title", "채널 추가", "채널 추가 제목");
  await setSelectValue(browser, '[name="kind"]', "onvif", "ONVIF 채널 타입");
  await assertFormValue(browser, '[name="kind"]', "onvif", "ONVIF kind");
  await assertVisible(browser, '[data-source-kind="onvif"]', "ONVIF Stream URI 입력");
  await assertText(browser, "#channel-detail-panel", "WS-Discovery 자동 검색", "ONVIF no-device boundary");
  await assertText(browser, "#channel-detail-panel", "Profile G/Recording/Replay", "ONVIF field-smoke boundary");
  await assertNoOverflow(browser, `${context.label}:sources-add`);
  steps.push("sources:add-onvif-kind", "sources:onvif-no-device-boundary");

  await clickSelector(browser, "#channel-close", "채널 패널 닫기");
  await assertHidden(browser, "#channel-detail-panel", "채널 패널 닫힘");

  await clickSelector(browser, "[data-view-channel]", "채널 상세");
  await assertVisible(browser, "#channel-detail-panel", "채널 상세 패널");
  await assertText(browser, "#channel-editor-title", "채널", "채널 상세 제목");
  await clickSelector(browser, "#channel-close", "채널 상세 닫기");
  await clickSelector(browser, "[data-clone-channel]", "채널 복제");
  await assertText(browser, "#channel-editor-title", "채널 복제", "채널 복제 제목");
  await clickSelector(browser, "#channel-close", "채널 복제 닫기");
  steps.push("sources:detail");
  await assertSourceCrudFlow(browser, context);
  steps.push("sources:crud-view-lifecycle");
  await assertSourceKindMatrixFlow(browser, context);
  steps.push("sources:kind-matrix-health-wrapper");

  await clickSelector(browser, 'a[href="/ops/rules"]', "룰 탭");
  await waitForPath(browser, "/ops/rules");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');

  await clickSelector(browser, "#opsAddEventRuleBtn", "이벤트 템플릿 탭");
  await clickSelector(browser, "#opsCreateEventRuleBtn", "이벤트 템플릿 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "이벤트 템플릿 패널");
  await assertVisible(browser, "#opsEventRuleForm", "이벤트 템플릿 폼");
  await clickSelector(browser, "#opsRulesComposerClose", "이벤트 템플릿 닫기");
  steps.push("rules:event-template");

  await clickSelector(browser, "#opsAddProfileBtn", "분석 프로파일 탭");
  await clickSelector(browser, "#opsCreateProfileBtn", "분석 프로파일 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "분석 프로파일 패널");
  await assertVisible(browser, "#opsProfileForm", "분석 프로파일 폼");
  await clickSelector(browser, "#opsRulesComposerClose", "분석 프로파일 닫기");
  steps.push("rules:profile");

  await clickSelector(browser, "#opsAddVaRuleBtn", "채널 분석 설정 탭");
  await clickSelector(browser, "#opsCreateVaRuleBtn", "채널 분석 설정 추가");
  await assertVisible(browser, "#opsRulesDetailPanel", "채널 분석 설정 패널");
  await assertVisible(browser, "#opsVaRuleForm", "채널 분석 설정 폼");
  await assertNoOverflow(browser, `${context.label}:rules-va-add`);
  await clickSelector(browser, "#opsRulesComposerClose", "채널 분석 설정 닫기");
  await assertRulesNativeCrudAndPolicyFlow(browser, context);
  await clickSelector(browser, 'a[href="/ops/sources"]', "채널 탭으로 이동");
  await waitForPath(browser, "/ops/sources");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  steps.push("rules:va-nav-away", "rules:native-crud-policy");

  await clickSelector(browser, 'a[href="/ops/users"]', "사용자 탭");
  await waitForPath(browser, "/ops/users");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');

  await clickSelector(browser, "#add-user-btn", "사용자 추가");
  await assertVisible(browser, "#user-detail-panel", "사용자 추가 패널");
  await assertText(browser, "#user-editor-title", "사용자 추가", "사용자 추가 제목");
  await assertNoOverflow(browser, `${context.label}:users-add`);
  await clickSelector(browser, "#user-close", "사용자 패널 닫기");
  await assertHidden(browser, "#user-detail-panel", "사용자 패널 닫힘");
  if (await isElementVisible(browser, "[data-user-view]")) {
    await clickSelector(browser, "[data-user-view]", "사용자 상세");
    await assertVisible(browser, "#user-detail-panel", "사용자 상세 패널");
    await clickSelector(browser, "#user-close", "사용자 상세 닫기");
    steps.push("users:add-detail");
  } else {
    steps.push("users:add-empty");
  }
  await assertAccessRequestApprovalFlow(browser, context);
  await assertAccessRequestRejectFlow(browser, context);
  steps.push("users:access-request-approve", "users:access-request-reject");
  await assertUserLifecycleFlow(browser, context);
  await assertInviteCreateFlow(browser, context);
  steps.push("users:lifecycle-edit-reset-disable-restore", "users:invite-create");

  await assertOpsEventsFlow(browser, context);
  steps.push("events:delivery-review-audit");

  await clickSelector(browser, 'a[href="/client/live"]', "클라이언트 라이브");
  await waitForPath(browser, "/client/live");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-live-preview`);
  await clickSelector(browser, '.account-shortcut[href="/ops/home"]', "클라이언트 미리보기 Ops 복귀");
  await waitForPath(browser, "/ops/home");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/home", '[data-testid="ops-home-page"]');
  await clickSelector(browser, 'a[href="/client/live"]', "클라이언트 미리보기 재진입");
  await waitForPath(browser, "/client/live");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-live-return`);
  await assertClientCopyPayload(browser, '[data-client-copy="status"]', ["채널:", "상태 요약:", "연결:"], "클라이언트 라이브 상태 복사");
  await assertClientCopyFallback(browser, '[data-client-copy="status"]', ["채널:", "상태 요약:", "연결:"], "클라이언트 라이브 상태 복사 fallback");
  await assertClientCopyPayload(browser, '[data-client-copy="events"]', ["이벤트 요약", "경고:"], "클라이언트 라이브 이벤트 복사");
  steps.push("client:preview-admin", "client:live-copy");
  await clickSelector(browser, 'a[href="/client/dashboard"]', "클라이언트 대시보드");
  await waitForPath(browser, "/client/dashboard");
  await installErrorCollector(browser);
  await assertReady(browser, "/client/dashboard", '[data-testid="client-shell-page"]');
  await assertClientPreviewAdminAffordance(browser, `${context.label}:client-dashboard-preview`);
  await assertVisible(browser, '[data-testid="client-dashboard-compare"]', "클라이언트 채널 비교");
  await setSelectValue(browser, "#clientDashboardCompareFilter", "warnings", "클라이언트 비교 필터");
  await setSelectValue(browser, "#clientDashboardCompareSort", "events", "클라이언트 비교 정렬");
  await clickSelector(browser, '[data-testid="client-dashboard-preset-config"] summary', "클라이언트 preset 설정");
  await assertVisible(browser, "#clientDashboardPresetConfigInput", "클라이언트 preset 설정 입력");
  await setTextValue(browser, "#clientDashboardPresetConfigInput", JSON.stringify({
    placePresets: [{ key: "road", label: "도로 운영", weight: 88, terms: ["road", "도로"] }],
    eventPresets: [{ key: "line", label: "라인 감시", weight: 92, terms: ["line"] }]
  }, null, 2), "클라이언트 preset JSON");
  await clickSelector(browser, "#clientDashboardPresetApply", "클라이언트 preset 적용");
  await assertText(browser, "#clientDashboardPresetStatus", "저장됨", "클라이언트 preset 저장 상태");
  await clickSelector(browser, '[data-testid="client-dashboard-preset-config"] summary', "클라이언트 preset 설정 다시 열기");
  await clickSelector(browser, "#clientDashboardPresetReset", "클라이언트 preset 초기화");
  await assertText(browser, "#clientDashboardPresetStatus", "초기화됨", "클라이언트 preset 초기화 상태");
  await clickSelector(browser, ".view", "클라이언트 대시보드 채널 선택");
  await assertVisible(browser, '[data-testid="client-dashboard-field-summary"]', "클라이언트 현장 요약");
  await assertClientCopyPayload(browser, '[data-client-copy="status"]', ["채널:", "현장 상태:", "상태 요약:"], "클라이언트 대시보드 상태 복사");
  await assertClientCopyFallback(browser, '[data-client-copy="status"]', ["채널:", "현장 상태:", "상태 요약:"], "클라이언트 대시보드 상태 복사 fallback");
  await assertClientCopyPayload(browser, '[data-client-copy="events"]', ["이벤트 요약", "경고:"], "클라이언트 대시보드 이벤트 복사");
  await assertNoOverflow(browser, `${context.label}:client-dashboard`);
  steps.push("client:dashboard", "client:preset-config", "client:dashboard-copy");

  await assertBrowserErrors(browser, context.label);
  return { steps };
}

async function assertSourceCrudFlow(browser, context) {
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  const sourceId = await createFileChannelViaUi(browser, context);
  try {
    await assertSourceVisibleInClientLive(browser, sourceId, "created source client live mapping");
    await updateFileChannelViaUi(browser, sourceId, context);
    await assertSourceVisibleInClientLive(browser, sourceId, "updated source client live mapping");
    await setChannelEnabledViaUi(browser, sourceId, false);
    await assertClientViewBlocked(sourceId, "disabled source/view client API block");
    await assertClientSessionBlocked(sourceId, "disabled source/view session block");
    await setChannelEnabledViaUi(browser, sourceId, true);
    await assertSourceVisibleInClientLive(browser, sourceId, "re-enabled source client live mapping");
    await deleteChannelViaUi(browser, sourceId);
    await assertClientViewBlocked(sourceId, "deleted source/view client API block");
    await assertClientSessionBlocked(sourceId, "deleted source/view session block");
    await assertNoOverflow(browser, `${context.label}:sources-crud`);
  } catch (error) {
    await cleanupSourceCrudFixture(sourceId).catch(cleanupError => {
      console.log(`[warn] source CRUD fixture cleanup failed for ${sourceId}: ${cleanupError.message}`);
    });
    throw error;
  }
}

async function createFileChannelViaUi(browser, context) {
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  await clickSelector(browser, "#add-channel", "source CRUD channel add");
  await assertVisible(browser, "#channel-detail-panel", "source CRUD channel panel");
  await setSelectValue(browser, '[name="kind"]', "rtsp", "source CRUD RTSP kind");
  await assertVisible(browser, '[data-source-kind="rtsp"]', "source CRUD RTSP URL input");
  const sourceId = await readFormValue(browser, '[name="channelId"]', "source CRUD generated channel id");
  const fixtureUrl = `rtsp://127.0.0.1:${rtspListenPort()}/dhseo?file=sample_h264.mp4&crud=${encodeURIComponent(sourceId)}&w=${encodeURIComponent(String(context.width || ""))}`;
  await setTextValue(browser, '[name="displayName"]', `Source CRUD ${context.label} ${sourceId}`, "source CRUD displayName");
  await setTextValue(browser, '[name="rtspUrl"]', fixtureUrl, "source CRUD RTSP URL");
  await setTextValue(browser, '[name="site"]', "QA Site", "source CRUD site");
  await setTextValue(browser, '[name="group"]', "QA Group", "source CRUD group");
  await setTextValue(browser, '[name="floor"]', "1F", "source CRUD floor");
  await setTextValue(browser, '[name="zone"]', "North", "source CRUD zone");
  await clickSelector(browser, "#channel-save-selected", "source CRUD save");
  await assertText(browser, "#status", "채널 저장 완료", "source CRUD save status");
  await assertSourceApiRecord(sourceId, source => source.kind === "rtsp" && source.rtspUrl === fixtureUrl && source.enabled !== false, "source CRUD source API create");
  await assertViewApiRecord(sourceId, view => view.sourceId === sourceId && view.enabled !== false, "source CRUD view API create");
  await assertTableContains(browser, "#channels-body", sourceId, "source CRUD row id");
  await assertTableContains(browser, "#channels-body", `Source CRUD ${context.label} ${sourceId}`, "source CRUD row name");
  return sourceId;
}

async function updateFileChannelViaUi(browser, sourceId, context) {
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  await clickSelector(browser, attrEqualsSelector("data-view-channel", sourceId), "source CRUD detail open");
  await clickSelector(browser, "#channel-edit-selected", "source CRUD edit");
  const updatedName = `Source CRUD Updated ${context.label} ${sourceId}`;
  await setTextValue(browser, '[name="displayName"]', updatedName, "source CRUD displayName update");
  await setTextValue(browser, '[name="zone"]', "South", "source CRUD zone update");
  await clickSelector(browser, "#channel-save-selected", "source CRUD update save");
  await assertText(browser, "#status", "채널 저장 완료", "source CRUD update status");
  await assertSourceApiRecord(sourceId, source => source.displayName === updatedName && source.zone === "South", "source CRUD source API update");
  await assertViewApiRecord(sourceId, view => view.displayName === updatedName && view.sourceId === sourceId, "source CRUD view API update");
  await assertTableContains(browser, "#channels-body", updatedName, "source CRUD updated row name");
}

async function setChannelEnabledViaUi(browser, sourceId, enabled) {
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  const selector = attrEqualsSelector("data-toggle-channel", sourceId);
  await clickSelector(browser, selector, enabled ? "source CRUD enable" : "source CRUD disable");
  await assertText(browser, "#status", `상태 변경 완료: ${enabled ? '활성' : '비활성'}`, enabled ? "source CRUD enable status" : "source CRUD disable status");
  await assertSourceApiRecord(sourceId, source => (source.enabled !== false) === enabled, enabled ? "source CRUD source enabled" : "source CRUD source disabled");
  await assertViewApiRecord(sourceId, view => (view.enabled !== false) === enabled, enabled ? "source CRUD view enabled" : "source CRUD view disabled");
}

async function deleteChannelViaUi(browser, sourceId) {
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  const selector = attrEqualsSelector("data-delete-channel", sourceId);
  await clickSelector(browser, selector, "source CRUD delete confirm");
  await assertText(browser, "#status", "삭제 확인", "source CRUD delete first status");
  await clickSelector(browser, selector, "source CRUD delete execute");
  await assertText(browser, "#status", "채널 삭제 완료", "source CRUD delete status");
}

async function assertSourceVisibleInClientLive(browser, sourceId, description) {
  await navigatePath(browser, "/client/live");
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertVisible(browser, `${attrEqualsSelector("data-source-view", sourceId)}`, description);
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
}

async function assertClientViewBlocked(sourceId, description) {
  const result = await requestStatus(`/client/api/views/${encodeURIComponent(sourceId)}`);
  if (![403, 404].includes(result.status)) {
    throw new Error(`${description}: expected 403/404, got ${result.status} ${result.text.slice(0, 160)}`);
  }
}

async function assertClientSessionBlocked(sourceId, description) {
  const result = await requestStatus(`/client/api/views/${encodeURIComponent(sourceId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "raw" }),
  });
  if (![403, 404, 409].includes(result.status)) {
    throw new Error(`${description}: expected blocked session status, got ${result.status} ${result.text.slice(0, 160)}`);
  }
}

async function assertSourceApiRecord(sourceId, predicate, description) {
  await waitForApiPredicate("/ops/api/sources", payload => {
    const source = (payload.sources || []).find(item => String(item?.sourceId || "") === String(sourceId));
    return source && predicate(source);
  }, description);
}

async function assertViewApiRecord(sourceId, predicate, description) {
  await waitForApiPredicate("/ops/api/views", payload => {
    const view = (payload.views || []).find(item => String(item?.viewId || "") === String(sourceId));
    return view && predicate(view);
  }, description);
}

async function waitForApiPredicate(pathValue, predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await requestJson(pathValue).catch(error => ({ error: error.message }));
    if (predicate(last)) return last;
    await delay(150);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last).slice(0, 500)}`);
}

async function cleanupSourceCrudFixture(sourceId) {
  if (!sourceId) return;
  await requestStatus(`/ops/api/views/${encodeURIComponent(sourceId)}`, { method: "DELETE" }).catch(() => null);
  await requestStatus(`/ops/api/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" }).catch(() => null);
}

async function assertOpsDashboardRuntimeHealthFlow(browser, context) {
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await assertTextNotEqual(browser, "#dashActiveSessions", "-", "dashboard active session metric");
  await assertText(browser, "#dashHealthBadges", "라이브 소스", "dashboard source health badges");
  await assertText(browser, "#dashIncidentTimelineBadges", "log tail", "dashboard log tail badge");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "source-health", "dashboard source-health incident filter");
  await assertHashParam(browser, "incidentSource", "source-health", "dashboard source-health hash");
  await assertText(browser, "#dashIncidentTimelineBadges", "source health", "dashboard source-health badge");
  await setSelectValue(browser, "#dashIncidentTimelineSource", "log-tail", "dashboard log-tail incident filter");
  await assertHashParam(browser, "incidentSource", "log-tail", "dashboard log-tail hash");
  await assertText(browser, "#dashIncidentTimelineBadges", "log tail", "dashboard log-tail filter badge");
  await assertDashboardLogTailRedaction(browser, "dashboard log-tail redaction");
  await assertText(browser, "#dashRuntimeOpsBadges", "분석", "dashboard runtime operations status");
  await assertText(browser, "#dashVaQualityBadges", "분석", "dashboard VA quality status");
  await assertNoOverflow(browser, `${context.label}:dashboard-runtime-health`);

  await navigatePath(browser, "/ops/home");
  await assertReady(browser, "/ops/home", '[data-testid="ops-home-page"]');
  await assertTextNotEqual(browser, "#homeChannelCount", "-", "home channel count");
  await assertTextNotEqual(browser, "#homeActiveSessions", "-", "home active session count");
  await assertTextNotEqual(browser, "#homeRuntimeText", "불러오는 중", "home runtime summary");
  await navigatePath(browser, "/ops/dashboard");
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
}

async function assertDashboardLogTailRedaction(browser, description) {
  const payload = await requestJson("/ops/api/diagnostics/log-tail?limit=50");
  const lines = Array.isArray(payload?.lines) ? payload.lines.map(item => String(item || "")) : [];
  if (payload?.available !== true) {
    throw new Error(`${description}: log tail unavailable ${JSON.stringify(payload).slice(0, 240)}`);
  }
  const serialized = JSON.stringify(lines).toLowerCase();
  const forbidden = [
    "passwordhash",
    "passwordhistory",
    "tokenhash",
    "authorization:",
    "bearer ",
    "set-cookie",
    "sessionsecret",
    "plainpassword",
  ];
  const leaked = forbidden.filter(item => serialized.includes(item));
  if (leaked.length > 0) {
    throw new Error(`${description}: sensitive log-tail material leaked ${leaked.join(", ")}`);
  }
  await waitForResult(
    browser,
    `
      (() => {
        const badges = String(document.getElementById('dashIncidentTimelineBadges')?.textContent || '');
        const text = String(document.getElementById('dashIncidentTimelineText')?.textContent || '');
        const timeline = String(document.getElementById('dashIncidentTimeline')?.textContent || '');
        return {
          ok: badges.includes('log tail') && (text.includes('log tail') || timeline.includes('log-tail') || timeline.includes('diagnostics')),
          badges,
          text,
          timeline: timeline.slice(0, 500),
        };
      })()
    `,
    item => item?.ok === true,
    `${description} UI`,
  );
}

async function assertSourceKindMatrixFlow(browser, context) {
  const created = [];
  try {
    const rtspId = await createExternalChannelViaUi(browser, context, {
      kind: "rtsp",
      label: "RTSP",
      fieldSelector: '[name="rtspUrl"]',
      locator: sourceId => `rtsp://127.0.0.1:${rtspListenPort()}/dhseo?file=sample_h264.mp4&ui=${encodeURIComponent(sourceId)}`,
      sourcePredicate: (source, locator) => source.kind === "rtsp" && source.rtspUrl === locator,
    });
    created.push(rtspId);
    await assertClientSessionLifecycle(rtspId, "RTSP source client wrapper lifecycle");
    await assertSourceHealthMentions(browser, rtspId, "RTSP source health listing");

    const httpId = await createExternalChannelViaUi(browser, context, {
      kind: "http",
      label: "HTTP",
      fieldSelector: '[name="httpUrl"]',
      locator: sourceId => `${httpBase}/whep?file=sample_h264.mp4&ui=${encodeURIComponent(sourceId)}`,
      sourcePredicate: (source, locator) => ["http", "hls"].includes(source.kind) && source.httpUrl === locator,
    });
    created.push(httpId);
    await assertSourceHealthMentions(browser, httpId, "HTTP source health listing");

    const whepId = await createExternalChannelViaUi(browser, context, {
      kind: "whep",
      label: "WHEP",
      fieldSelector: '[name="whepUrl"]',
      locator: sourceId => `${httpBase}/whep?file=sample_h264.mp4&ui=${encodeURIComponent(sourceId)}`,
      sourcePredicate: (source, locator) => source.kind === "whep" && source.whepUrl === locator,
    });
    created.push(whepId);
    await assertClientSessionLifecycle(whepId, "WHEP source client wrapper lifecycle");

    const webrtcId = await createExternalChannelViaUi(browser, context, {
      kind: "webrtc",
      label: "WHIP",
      fieldSelector: '[name="webrtcSourceId"]',
      locator: sourceId => `ui-whip-${sourceId}`,
      sourcePredicate: (source, locator) => source.kind === "webrtc" && source.webrtcSourceId === locator,
    });
    created.push(webrtcId);

    await assertOpsAuditControls(browser, "channel-audit-list", "channels", "source kind matrix audit");
    await assertNoOverflow(browser, `${context.label}:sources-kind-matrix`);
  } finally {
    for (const sourceId of created.reverse()) {
      await cleanupSourceCrudFixture(sourceId).catch(error => {
        console.log(`[warn] source kind matrix cleanup failed for ${sourceId}: ${error.message}`);
      });
    }
  }
}

async function createExternalChannelViaUi(browser, context, spec) {
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
  await clickSelector(browser, "#add-channel", `${spec.label} source add`);
  await assertVisible(browser, "#channel-detail-panel", `${spec.label} source panel`);
  await setSelectValue(browser, '[name="kind"]', spec.kind, `${spec.label} source kind`);
  const sourceId = await readFormValue(browser, '[name="channelId"]', `${spec.label} generated source id`);
  const locator = spec.locator(sourceId);
  const displayName = `${spec.label} Source ${context.label} ${sourceId}`;
  await setTextValue(browser, '[name="displayName"]', displayName, `${spec.label} displayName`);
  await setTextValue(browser, spec.fieldSelector, locator, `${spec.label} locator`);
  await setTextValue(browser, '[name="site"]', "QA Site", `${spec.label} site`);
  await setTextValue(browser, '[name="group"]', "QA Matrix", `${spec.label} group`);
  await setTextValue(browser, '[name="floor"]', "2F", `${spec.label} floor`);
  await setTextValue(browser, '[name="zone"]', spec.label, `${spec.label} zone`);
  await clickSelector(browser, "#channel-save-selected", `${spec.label} save`);
  await assertText(browser, "#status", "채널 저장 완료", `${spec.label} save status`);
  await assertSourceApiRecord(sourceId, source =>
    spec.sourcePredicate(source, locator) &&
    source.displayName === displayName &&
    source.site === "QA Site" &&
    source.zone === spec.label,
  `${spec.label} source API create`);
  await assertViewApiRecord(sourceId, view =>
    view.sourceId === sourceId &&
    view.displayName === displayName &&
    view.showDashboard !== false &&
    view.showEvents !== false,
  `${spec.label} view API create`);
  await assertTableContains(browser, "#channels-body", sourceId, `${spec.label} row id`);
  await assertTableContains(browser, "#channels-body", displayName, `${spec.label} row name`);
  await assertSourceVisibleInClientLive(browser, sourceId, `${spec.label} client live source mapping`);
  return sourceId;
}

async function assertClientSessionLifecycle(viewId, description) {
  const created = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "raw" }),
  });
  const sessionId = String(created?.sessionId || "");
  if (!sessionId || !created?.offer) {
    throw new Error(`${description}: missing sessionId/offer ${JSON.stringify(created).slice(0, 240)}`);
  }
  const deleted = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!deleted.ok) {
    throw new Error(`${description}: delete failed HTTP ${deleted.status} ${deleted.text.slice(0, 160)}`);
  }
}

async function assertSourceHealthMentions(browser, sourceId, description) {
  const payload = await waitForApiPredicate("/ops/api/source-health", item => {
    const values = JSON.stringify(item || {});
    return values.includes(String(sourceId));
  }, description);
  if (!payload?.sourceHealth && !payload?.summary) {
    throw new Error(`${description}: missing source health payload shape`);
  }
  await navigatePath(browser, "/ops/dashboard");
  await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
  await setSelectValue(browser, "#dashIncidentTimelineSource", "source-health", `${description} dashboard filter`);
  await assertText(browser, "#dashIncidentTimelineBadges", "source health", `${description} dashboard badge`);
  await navigatePath(browser, "/ops/sources");
  await assertReady(browser, "/ops/sources", '[data-testid="ops-sources-page"]');
}

async function assertOpsEventsFlow(browser, context) {
  await navigatePath(browser, "/ops/events");
  await assertReady(browser, "/ops/events", '[data-testid="ops-events-page"]');
  await assertVisible(browser, '[data-testid="ops-alert-delivery-integrations"]', "alert delivery panel");
  await assertVisible(browser, '[data-testid="ops-event-review-inbox"]', "event review inbox");
  const deliveryId = `ui-delivery-${context.width}`;
  await setTextValue(browser, "#alertDeliveryId", deliveryId, "alert delivery id");
  await setSelectValue(browser, "#alertDeliveryKind", "webhook", "alert delivery kind");
  await setTextValue(browser, "#alertDeliveryLabel", `UI Delivery ${context.label}`, "alert delivery label");
  await setTextValue(browser, "#alertDeliveryEndpoint", `https://alerts.example.invalid/${deliveryId}`, "alert delivery endpoint");
  await setTextValue(browser, "#alertDeliveryRetryMax", "2", "alert delivery retry");
  await setTextValue(browser, "#alertDeliveryRetryBackoff", "750", "alert delivery backoff");
  await setCheckboxValue(browser, "#alertDeliveryEnabled", true, "alert delivery enabled");
  await clickSelector(browser, "#alertDeliverySave", "alert delivery save");
  await assertText(browser, "#alertDeliverySummary", "Event POST payload 변경 없음", "alert delivery summary");
  await assertTableContains(browser, "#alertDeliveryRows", `UI Delivery ${context.label}`, "alert delivery row");
  await clickSelector(browser, "#alertDeliveryTest", "alert delivery fixture");
  await assertText(browser, "#alertDeliveryBadges", "시도", "alert delivery attempt badge");
  await assertText(browser, "#alertDeliveryRows", "[redacted-alert-target]", "alert delivery endpoint redaction");
  await setTextValue(browser, "#alertDeliveryFilter", deliveryId, "alert delivery search filter");
  await assertText(browser, "#alertDeliverySummary", "list/filter 1", "alert delivery filtered summary");
  await assertTableContains(browser, "#alertDeliveryRows", `UI Delivery ${context.label}`, "alert delivery filtered row");
  await setSelectValue(browser, "#alertDeliveryKindFilter", "webhook", "alert delivery kind filter");
  await assertText(browser, "#alertDeliveryBadges", "필터 1", "alert delivery kind filter badge");
  await setSelectValue(browser, "#alertDeliveryEnabledFilter", "enabled", "alert delivery enabled filter");
  await assertText(browser, "#alertDeliveryRows", "활성", "alert delivery enabled filtered row");
  await clickSelector(browser, `[data-alert-delivery-test="${deliveryId}"]`, "alert delivery row fixture");
  await assertText(browser, "#alertDeliveryRows", "delivered", "alert delivery row fixture attempt");
  await setTextValue(browser, "#alertDeliveryFilter", `${deliveryId}-missing`, "alert delivery empty filter");
  await assertText(browser, "#alertDeliveryRows", "필터 조건에 맞는", "alert delivery empty filter row");
  await setTextValue(browser, "#alertDeliveryFilter", "", "alert delivery filter clear");
  await setSelectValue(browser, "#alertDeliveryKindFilter", "", "alert delivery kind filter clear");
  await setSelectValue(browser, "#alertDeliveryEnabledFilter", "", "alert delivery enabled filter clear");
  await assertText(browser, "#alertDeliveryBadges", "필터", "alert delivery filter badge reset");

  await setSelectValue(browser, "#eventReviewStatusFilter", "confirmed", "event review status filter");
  await assertText(browser, "#eventReviewSummary", "Event POST payload 변경 없음", "event review summary");
  await setSelectValue(browser, "#eventReviewClassFilter", "false-positive", "event review class filter");
  await assertText(browser, "#eventReviewSummary", "Event POST payload 변경 없음", "event review class summary");
  await setSelectValue(browser, "#eventRecordsEvidenceSelect", "missing", "event evidence missing filter");
  await assertFormValue(browser, "#eventRecordsEvidenceSelect", "missing", "event evidence filter value");
  await assertText(browser, "#eventRecordSummary", "records", "event evidence filter summary");
  await setCheckboxValue(browser, "#eventRecordsIncludeArchives", true, "event archive toggle");
  await assertText(browser, "#eventRecordSummary", "records", "event archive refresh summary");
  await clickSelector(browser, "#opsEventsRefresh", "ops events refresh");
  await assertText(browser, "#eventExportPolicyBadges", "audit", "event export audit badge");

  await assertOpsAuditControls(browser, "ops-rules-audit-list", "rules", "rules audit controls from events flow", { ensureRoute: "/ops/rules" });
  await assertNoOverflow(browser, `${context.label}:ops-events-flow`);
}

async function assertOpsAuditControls(browser, containerId, area, description, options = {}) {
  if (options.ensureRoute) {
    await navigatePath(browser, options.ensureRoute);
    await assertReady(browser, options.ensureRoute, options.ensureRoute === "/ops/rules" ? '[data-testid="ops-rules-page"]' : '[data-testid="ops-sources-page"]');
  }
  const root = `#${containerId}`;
  await assertVisible(browser, root, `${description} audit root`);
  await assertVisible(browser, `${root} [data-audit-apply]`, `${description} audit apply`);
  await setTextValue(browser, `${root} #${containerId}-audit-q`, area === "rules" ? "rule" : "channel", `${description} audit query`);
  await setSelectValue(browser, `${root} #${containerId}-audit-action`, "create", `${description} audit action`);
  await clickSelector(browser, `${root} [data-audit-apply]`, `${description} audit search`);
  await assertVisible(browser, `${root} [data-audit-export="json"]`, `${description} audit json export`);
  await assertVisible(browser, `${root} [data-audit-export="csv"]`, `${description} audit csv export`);
  await assertVisible(browser, `${root} [data-audit-export="diff-json"]`, `${description} audit diff export`);
  for (const format of ["json", "csv", "diff-json"]) {
    const result = await requestStatus(`/ops/api/audit?area=${encodeURIComponent(area)}&format=${encodeURIComponent(format)}&download=1&limit=1000&offset=0`);
    if (!result.ok) {
      throw new Error(`${description} audit ${format} export endpoint failed HTTP ${result.status}: ${result.text.slice(0, 160)}`);
    }
  }
}

async function assertRulesNativeCrudAndPolicyFlow(browser, context) {
  const created = { sourceIds: [], profileIds: [], eventRuleIds: [], vaRuleIds: [] };
  try {
    const sourceId = await createExternalChannelViaUi(browser, context, {
      kind: "rtsp",
      label: "RULE RTSP",
      fieldSelector: '[name="rtspUrl"]',
      locator: id => `rtsp://127.0.0.1:${rtspListenPort()}/dhseo?file=sample_h264.mp4&rule=${encodeURIComponent(id)}&w=${encodeURIComponent(String(context.width || ""))}`,
      sourcePredicate: (source, locator) => source.kind === "rtsp" && source.rtspUrl === locator,
    });
    created.sourceIds.push(sourceId);

    const profileId = await createAnalysisProfileViaUi(browser, context);
    created.profileIds.push(profileId);
    await updateAnalysisProfileViaUi(browser, profileId, context);

    const scenarioTemplateId = await createEventTemplateViaUi(browser, context, {
      mode: "scenario",
      type: "intrusion-dwell",
      preset: "custom",
      confidence: "0.34",
      candidateMs: "1500",
      dwellMs: "4500",
      cooldownMs: "2300",
    });
    created.eventRuleIds.push(scenarioTemplateId);
    await updateEventTemplateViaUi(browser, scenarioTemplateId, {
      confidence: "0.41",
      candidateMs: "2500",
      dwellMs: "5500",
      cooldownMs: "3300",
    });

    const lineTemplateId = await createEventTemplateViaUi(browser, context, {
      mode: "event",
      type: "line-crossing",
      confidence: "0.29",
      lineDirection: "forward",
    });
    created.eventRuleIds.push(lineTemplateId);
    await assertRulesScenarioFormMatrixFlow(browser, context, created, { sourceId, profileId });

    await assertVaRuleMissingSourceValidation(browser, {
      profileId,
      templateId: scenarioTemplateId,
      name: `UI VA Rule Missing Source ${context.label}`,
    });
    const vaRuleId = await createVaRuleViaUi(browser, context, {
      sourceId,
      profileId,
      templateId: scenarioTemplateId,
      name: `UI VA Rule ${context.label}`,
      enabled: true,
      tracker: "lite",
      reid: "off",
      geometryPoints: "0.18,0.20\n0.82,0.20\n0.82,0.76\n0.18,0.76",
      expectedGeometryType: "polygon",
      previewPlayback: true,
    });
    created.vaRuleIds.push(vaRuleId);
    await assertClientViewAllowedRuleApis(sourceId, vaRuleId, "created VA rule client allowed rule APIs");
    await assertVaRuleClientSession(sourceId, vaRuleId, "created VA rule client va-rule session");
    await assertVaRuleRuntimeTrackingPolicy(sourceId, vaRuleId, { tracker: "lite", reid: "off" }, "created VA rule runtime Re-ID off policy");
    await assertDashboardActiveVaRuntime(browser, sourceId, vaRuleId, "created VA rule dashboard active runtime");
    await assertOpsRuleCopyPayload(browser, "rtsp", vaRuleId, ["rtsp://", `vaRule=${vaRuleId}`], "VA rule RTSP copy");
    await assertOpsRuleCopyPayload(browser, "whep", vaRuleId, ["/whep", `vaRule=${vaRuleId}`], "VA rule WHEP copy");
    await assertOpsRuleCopyPayload(browser, "client", vaRuleId, ["/client/live#", "mode=va-rule", `rule=${vaRuleId}`], "VA rule client copy");
    await assertClientScreenDoesNotExposeOpsRuleCopyControls(browser, vaRuleId, "client screen ops rule copy boundary");

    await updateVaRuleViaUi(browser, vaRuleId, {
      name: `UI VA Rule Disabled ${context.label}`,
      enabled: false,
      tracker: "none",
      reid: "off",
      templateId: scenarioTemplateId,
      geometryPoints: "0.20,0.22\n0.80,0.22\n0.80,0.78\n0.20,0.78",
      expectedGeometryType: "polygon",
      expectedTracker: "none",
      expectedReid: "off",
    });
    await assertRuleCatalogVaRule(vaRuleId, rule => rule.enabled === false, "VA rule inactive state reflected");

    await updateVaRuleViaUi(browser, vaRuleId, {
      enabled: true,
      tracker: "kalman-lite",
      reid: "off",
      templateId: lineTemplateId,
      geometryPoints: "0.12,0.50\n0.88,0.50",
      expectedGeometryType: "line",
      expectedTracker: "kalman-lite",
      expectedReid: "off",
    });
    await assertVaRuleClientSession(sourceId, vaRuleId, "line VA rule client va-rule session");

    await updateVaRuleTrackingViaUi(browser, vaRuleId, { tracker: "bytetrack", reid: "off" });
    await assertVaRuleClientSession(sourceId, vaRuleId, "bytetrack VA rule client va-rule session");
    await assertVaRuleRuntimeTrackingPolicy(sourceId, vaRuleId, { tracker: "bytetrack", reid: "off" }, "ByteTrack VA rule runtime Re-ID off policy");
    await updateVaRuleTrackingViaUi(browser, vaRuleId, { tracker: "lite", reid: "assist" });
    await assertVaRuleClientSession(sourceId, vaRuleId, "reid assist VA rule client va-rule session");
    await updateVaRuleTrackingViaUi(browser, vaRuleId, { tracker: "none", reid: "off", expectedReid: "off" });
    await assertVaRuleRuntimeTrackingPolicy(sourceId, vaRuleId, { tracker: "none", effectiveTracker: "none", reid: "off" }, "tracking disabled VA rule runtime Re-ID off policy");

    await deleteEventTemplateViaUi(browser, lineTemplateId);
    removeCreated(created.eventRuleIds, lineTemplateId);
    await assertOpsRulesValidationIssue(browser, `템플릿 ${lineTemplateId}을 찾을 수 없습니다`, "event template delete reference validation");
    await deleteProfileViaUi(browser, profileId);
    removeCreated(created.profileIds, profileId);
    await assertOpsRulesValidationIssue(browser, `프로파일 ${profileId}을 찾을 수 없습니다`, "profile delete reference validation");
    await deleteVaRuleViaUi(browser, vaRuleId, sourceId);
    removeCreated(created.vaRuleIds, vaRuleId);
    await assertVaRuleSessionBlocked(sourceId, vaRuleId, "deleted VA rule client session rejected");

    await deleteEventTemplateViaUi(browser, scenarioTemplateId);
    removeCreated(created.eventRuleIds, scenarioTemplateId);
    await assertNoOverflow(browser, `${context.label}:rules-native-crud-policy`);
  } finally {
    await cleanupRulesNativeCrudFixtures(created);
  }
}

async function createAnalysisProfileViaUi(browser, context) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddProfileBtn", "analysis profile tab");
  await clickSelector(browser, "#opsCreateProfileBtn", "analysis profile create");
  await assertVisible(browser, "#opsProfileForm", "analysis profile form");
  const profileId = await readFormValue(browser, "#opsProfileIdInput", "analysis profile generated id");
  await assertTextNotEqual(browser, "#opsProfileIdDisplay", "자동 배정", "analysis profile generated id display");
  await setSelectValue(browser, "#opsProfileDetectorSelect", "yolo", "analysis profile detector yolo");
  await setTextValue(browser, "#opsProfileFpsInput", "0", "analysis profile invalid FPS");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile invalid FPS save");
  await assertText(browser, "#opsRulesStatus", "분석 FPS", "analysis profile FPS validation");
  await setTextValue(browser, "#opsProfileFpsInput", "7", "analysis profile FPS");
  await setTextValue(browser, "#opsProfileQueueInput", "0", "analysis profile invalid Queue");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile invalid Queue save");
  await assertText(browser, "#opsRulesStatus", "Queue", "analysis profile Queue validation");
  await setTextValue(browser, "#opsProfileQueueInput", "2", "analysis profile Queue");
  await setTextValue(browser, "#opsProfileConfidenceInput", "1.2", "analysis profile invalid Confidence");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile invalid Confidence save");
  await assertText(browser, "#opsRulesStatus", "Confidence", "analysis profile Confidence validation");
  await setTextValue(browser, "#opsProfileConfidenceInput", "0.31", "analysis profile Confidence");
  await setTextValue(browser, "#opsProfileNmsInput", "-0.1", "analysis profile invalid NMS");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile invalid NMS save");
  await assertText(browser, "#opsRulesStatus", "NMS", "analysis profile NMS validation");
  await setTextValue(browser, "#opsProfileNmsInput", "0.44", "analysis profile NMS");
  await setTextValue(browser, "#opsProfileInputWidthInput", "0", "analysis profile invalid width");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile invalid width save");
  await assertText(browser, "#opsRulesStatus", "입력 해상도", "analysis profile input size validation");
  await setTextValue(browser, "#opsProfileInputWidthInput", "640", "analysis profile width");
  await setTextValue(browser, "#opsProfileInputHeightInput", "480", "analysis profile height");
  await setCheckboxValue(browser, "#opsProfileAdaptiveToggle", true, "analysis profile adaptive");
  await clickSelector(browser, "#opsProfileClassesClearBtn", "analysis profile tracking categories clear");
  await assertText(browser, "#opsProfileClassesSummary", "추적 대상을 선택하세요", "analysis profile tracking category empty summary");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile empty tracking category save");
  await assertText(browser, "#opsRulesStatus", "추적 대상", "analysis profile tracking category validation");
  await clickSelector(browser, "#opsProfileClassesAllBtn", "analysis profile tracking categories all");
  await assertText(browser, "#opsProfileClassesSummary", "사람", "analysis profile tracking category summary");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile save");
  await assertRuleCatalogProfile(profileId, profile =>
    profile.detector === "yolo" &&
    Number(profile.fps) === 7 &&
    Number(profile.maxQueue) === 2 &&
    Number(profile.confidence) === 0.31 &&
    Number(profile.nms) === 0.44 &&
    Number(profile.inputWidth) === 640 &&
    Number(profile.inputHeight) === 480 &&
    profile.adaptive !== false &&
    Array.isArray(profile.trackingClasses) &&
    profile.trackingClasses.includes("person") &&
    profile.trackingClasses.includes("vehicle"),
  "analysis profile API create");
  await assertTableContains(browser, "#opsProfileRows", profileId, "analysis profile row id");
  await assertTableContains(browser, "#opsProfileRows", "사람", "analysis profile tracking category row");
  await assertNoOverflow(browser, `${context.label}:rules-profile-create`);
  return profileId;
}

async function updateAnalysisProfileViaUi(browser, profileId, context) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddProfileBtn", "analysis profile tab for edit");
  await clickRuleAction(browser, "view-profile", profileId, "analysis profile detail");
  await assertVisible(browser, "#opsProfileForm", "analysis profile detail form");
  await assertText(browser, "#opsProfileClassesSummary", "사람", "analysis profile tracking category detail summary");
  await clickSelector(browser, "#opsRulesComposerEdit", "analysis profile edit");
  await setSelectValue(browser, "#opsProfileDetectorSelect", "dummy", "analysis profile detector dummy");
  await setTextValue(browser, "#opsProfileFpsInput", "8", "analysis profile FPS update");
  await setTextValue(browser, "#opsProfileQueueInput", "3", "analysis profile Queue update");
  await setTextValue(browser, "#opsProfileConfidenceInput", "0.36", "analysis profile Confidence update");
  await setTextValue(browser, "#opsProfileNmsInput", "0.42", "analysis profile NMS update");
  await setTextValue(browser, "#opsProfileInputWidthInput", "512", "analysis profile width update");
  await setTextValue(browser, "#opsProfileInputHeightInput", "384", "analysis profile height update");
  await setCheckboxValue(browser, "#opsProfileAdaptiveToggle", false, "analysis profile adaptive update");
  await clickSelector(browser, "#opsRulesComposerSave", "analysis profile update save");
  await assertRuleCatalogProfile(profileId, profile =>
    profile.detector === "dummy" &&
    Number(profile.fps) === 8 &&
    Number(profile.maxQueue) === 3 &&
    Number(profile.confidence) === 0.36 &&
    Number(profile.nms) === 0.42 &&
    Number(profile.inputWidth) === 512 &&
    Number(profile.inputHeight) === 384 &&
    profile.adaptive === false &&
    Array.isArray(profile.trackingClasses) &&
    profile.trackingClasses.includes("person") &&
    profile.trackingClasses.includes("vehicle"),
  "analysis profile API update");
  await assertTableContains(browser, "#opsProfileRows", "dummy", "analysis profile detector row");
  await assertTableContains(browser, "#opsProfileRows", "8", "analysis profile FPS row");
  await assertTableContains(browser, "#opsProfileRows", "큐 3", "analysis profile queue row");
  await assertTableContains(browser, "#opsProfileRows", "사람", "analysis profile tracking category update row");
  await assertNoOverflow(browser, `${context.label}:rules-profile-update`);
}

async function createEventTemplateViaUi(browser, context, spec) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddEventRuleBtn", `${spec.type} event template tab`);
  await clickSelector(browser, "#opsCreateEventRuleBtn", `${spec.type} event template create`);
  await assertVisible(browser, "#opsEventRuleForm", `${spec.type} event template form`);
  const eventRuleId = await readFormValue(browser, "#opsEventRuleIdInput", `${spec.type} event template generated id`);
  await assertTextNotEqual(browser, "#opsEventRuleIdDisplay", "자동 배정", `${spec.type} event template generated id display`);
  await setSelectValue(browser, "#opsEventRuleModeSelect", spec.mode, `${spec.type} event template mode`);
  await setSelectValue(browser, "#opsEventRuleTypeSelect", spec.type, `${spec.type} event template type`);
  if (spec.preset) await setSelectValue(browser, "#opsEventRulePresetSelect", spec.preset, `${spec.type} event template preset`);
  await clickSelector(browser, "#opsEventRuleClassesAllBtn", `${spec.type} event template all classes before validation`);
  await assertText(browser, "#opsEventRuleClassesSummary", "사람", `${spec.type} event template class summary before validation`);
  for (const check of spec.validationChecks || []) {
    if (check.kind === "select") {
      await setSelectValue(browser, check.selector, check.invalid, `${spec.type} event template invalid ${check.description}`);
    } else {
      await setTextValue(browser, check.selector, check.invalid, `${spec.type} event template invalid ${check.description}`);
    }
    await clickSelector(browser, "#opsRulesComposerSave", `${spec.type} event template invalid ${check.description} save`);
    await assertText(browser, "#opsRulesStatus", check.message, `${spec.type} event template ${check.description} validation`);
    if (check.kind === "select") {
      await setSelectValue(browser, check.selector, check.valid, `${spec.type} event template valid ${check.description}`);
    } else {
      await setTextValue(browser, check.selector, check.valid, `${spec.type} event template valid ${check.description}`);
    }
  }
  await applyEventTemplateSpec(browser, spec);
  await clickSelector(browser, "#opsEventRuleClassesAllBtn", `${spec.type} event template all classes`);
  await assertText(browser, "#opsEventRuleClassesSummary", "사람", `${spec.type} event template class summary`);
  await clickSelector(browser, "#opsRulesComposerSave", `${spec.type} event template save`);
  await assertRuleCatalogEventTemplate(eventRuleId, template =>
    ruleEventType(template) === spec.type &&
    Array.isArray(template.analysis?.classes) &&
    template.analysis.classes.includes("person") &&
    (spec.mode === "scenario" ? Boolean(template.scenario) : !template.scenario) &&
    eventTemplateMatchesSpec(template, spec),
  `${spec.type} event template API create`);
  await assertTableContains(browser, "#opsEventRuleRows", eventRuleId, `${spec.type} event template row id`);
  await assertNoOverflow(browser, `${context.label}:rules-template-${spec.type}`);
  return eventRuleId;
}

async function applyEventTemplateSpec(browser, spec) {
  if (spec.confidence !== undefined) await setTextValue(browser, "#opsEventRuleConfidenceInput", spec.confidence, `${spec.type} event template confidence`);
  if (spec.minDurationMs !== undefined) await setTextValue(browser, "#opsEventRuleMinDurationInput", spec.minDurationMs, `${spec.type} event template min duration`);
  if (spec.lineDirection !== undefined) await setSelectValue(browser, "#opsEventRuleLineDirectionSelect", spec.lineDirection, `${spec.type} event template line direction`);
  if (spec.candidateMs !== undefined) await setTextValue(browser, "#opsEventRuleCandidateInput", spec.candidateMs, `${spec.type} event template candidate`);
  if (spec.dwellMs !== undefined) await setTextValue(browser, "#opsEventRuleDwellInput", spec.dwellMs, `${spec.type} event template dwell`);
  if (spec.cooldownMs !== undefined) await setTextValue(browser, "#opsEventRuleCooldownInput", spec.cooldownMs, `${spec.type} event template cooldown`);
  if (spec.reEntryWindowMs !== undefined) await setTextValue(browser, "#opsEventRuleReEntryWindowInput", spec.reEntryWindowMs, `${spec.type} event template re-entry window`);
  if (spec.reEntryMode !== undefined) await setSelectValue(browser, "#opsEventRuleReEntryModeSelect", spec.reEntryMode, `${spec.type} event template re-entry mode`);
  if (spec.lineDelayMs !== undefined) await setTextValue(browser, "#opsEventRuleLineDelayInput", spec.lineDelayMs, `${spec.type} event template line delay`);
  if (spec.triggerDirection !== undefined) await setSelectValue(browser, "#opsEventRuleTriggerDirectionSelect", spec.triggerDirection, `${spec.type} event template trigger direction`);
  if (spec.loiteringRadius !== undefined) await setTextValue(browser, "#opsEventRuleLoiteringRadiusInput", spec.loiteringRadius, `${spec.type} event template loitering radius`);
  if (spec.loiteringPoints !== undefined) await setTextValue(browser, "#opsEventRuleLoiteringPointsInput", spec.loiteringPoints, `${spec.type} event template loitering points`);
  if (spec.groundPlane !== undefined) await setCheckboxValue(browser, "#opsEventRuleLoiteringGroundPlaneToggle", spec.groundPlane, `${spec.type} event template ground-plane`);
  if (spec.zoneThreshold !== undefined) await setTextValue(browser, "#opsEventRuleZoneThresholdInput", spec.zoneThreshold, `${spec.type} event template zone threshold`);
  if (spec.zoneDwellMs !== undefined) await setTextValue(browser, "#opsEventRuleZoneDwellInput", spec.zoneDwellMs, `${spec.type} event template zone dwell`);
  if (spec.targetZoneIds !== undefined) await setTextValue(browser, "#opsEventRuleTargetZonesInput", spec.targetZoneIds.join(", "), `${spec.type} event template target zones`);
  if (spec.restrictedZoneIds !== undefined) await setTextValue(browser, "#opsEventRuleRestrictedZonesInput", spec.restrictedZoneIds.join(", "), `${spec.type} event template restricted zones`);
  if (spec.reEntryZoneIds !== undefined) await setTextValue(browser, "#opsEventRuleReEntryZonesInput", spec.reEntryZoneIds.join(", "), `${spec.type} event template re-entry zones`);
}

async function updateEventTemplateViaUi(browser, eventRuleId, spec) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddEventRuleBtn", "event template tab for edit");
  await clickRuleAction(browser, "view-event-template", eventRuleId, "event template detail");
  await assertVisible(browser, "#opsEventRuleForm", "event template detail form");
  await clickSelector(browser, "#opsRulesComposerEdit", "event template edit");
  if (spec.confidence) await setTextValue(browser, "#opsEventRuleConfidenceInput", spec.confidence, "event template confidence update");
  if (spec.candidateMs) await setTextValue(browser, "#opsEventRuleCandidateInput", spec.candidateMs, "event template candidate update");
  if (spec.dwellMs) await setTextValue(browser, "#opsEventRuleDwellInput", spec.dwellMs, "event template dwell update");
  if (spec.cooldownMs) await setTextValue(browser, "#opsEventRuleCooldownInput", spec.cooldownMs, "event template cooldown update");
  await clickSelector(browser, "#opsRulesComposerSave", "event template update save");
  await assertRuleCatalogEventTemplate(eventRuleId, template =>
    Number(template.event?.minConfidence) === Number(spec.confidence) &&
    Number(template.scenario?.candidateTimeMs) === Number(spec.candidateMs) &&
    Number(template.scenario?.dwellTimeMs) === Number(spec.dwellMs) &&
    Number(template.scenario?.cooldownMs) === Number(spec.cooldownMs),
  "event template API update");
  await assertTableContains(browser, "#opsEventRuleRows", "후보", "event template condition row");
}

async function assertRulesScenarioFormMatrixFlow(browser, context, created, binding) {
  const specs = [
    {
      mode: "event",
      type: "presence",
      preset: "custom",
      confidence: "0.32",
      minDurationMs: "500",
    },
    {
      mode: "event",
      type: "enter",
      preset: "custom",
      confidence: "0.33",
      minDurationMs: "0",
    },
    {
      mode: "event",
      type: "exit",
      preset: "custom",
      confidence: "0.34",
      minDurationMs: "0",
    },
    {
      mode: "event",
      type: "line-crossing",
      preset: "custom",
      confidence: "0.35",
      minDurationMs: "0",
      lineDirection: "any",
    },
    {
      mode: "event",
      type: "line-crossing",
      preset: "custom",
      confidence: "0.36",
      minDurationMs: "0",
      lineDirection: "forward",
    },
    {
      mode: "event",
      type: "line-crossing",
      preset: "custom",
      confidence: "0.37",
      minDurationMs: "0",
      lineDirection: "reverse",
    },
    {
      mode: "scenario",
      type: "intrusion-dwell",
      preset: "custom",
      confidence: "0.38",
      candidateMs: "1600",
      dwellMs: "5200",
      cooldownMs: "2400",
      validationChecks: [
        { selector: "#opsEventRuleCandidateInput", invalid: "-1", valid: "1600", message: "후보 판단 시간", description: "candidate" },
        { selector: "#opsEventRuleDwellInput", invalid: "-1", valid: "5200", message: "확정/체류 시간", description: "dwell" },
        { selector: "#opsEventRuleCooldownInput", invalid: "-1", valid: "2400", message: "재알림 대기", description: "cooldown" },
      ],
    },
    {
      mode: "scenario",
      type: "re-entry",
      preset: "custom",
      confidence: "0.39",
      reEntryWindowMs: "9000",
      reEntryMode: "configured-zones",
      reEntryZoneIds: ["zone-a", "zone-b"],
      cooldownMs: "2500",
      validationChecks: [
        { selector: "#opsEventRuleReEntryWindowInput", invalid: "-1", valid: "9000", message: "재진입 허용 시간", description: "re-entry window" },
        { selector: "#opsEventRuleCooldownInput", invalid: "-1", valid: "2500", message: "재알림 대기", description: "cooldown" },
      ],
    },
    {
      mode: "scenario",
      type: "wrong-direction",
      preset: "custom",
      confidence: "0.4",
      minDurationMs: "0",
      lineDirection: "forward",
      cooldownMs: "2600",
      validationChecks: [
        { kind: "select", selector: "#opsEventRuleLineDirectionSelect", invalid: "any", valid: "forward", message: "allowed direction", description: "allowed direction" },
      ],
    },
    {
      mode: "scenario",
      type: "intrusion-after-line-crossing",
      preset: "custom",
      confidence: "0.41",
      lineDelayMs: "6500",
      dwellMs: "1800",
      triggerDirection: "reverse",
      targetZoneIds: ["zone-entry", "zone-core"],
      cooldownMs: "2700",
      validationChecks: [
        { selector: "#opsEventRuleLineDelayInput", invalid: "-1", valid: "6500", message: "라인 후 최대 지연", description: "line delay" },
        { selector: "#opsEventRuleDwellInput", invalid: "-1", valid: "1800", message: "확정/체류 시간", description: "dwell" },
      ],
    },
    {
      mode: "scenario",
      type: "loitering",
      preset: "custom",
      confidence: "0.42",
      dwellMs: "21000",
      loiteringRadius: "0.07",
      loiteringPoints: "5",
      groundPlane: true,
      restrictedZoneIds: ["zone-loiter"],
      cooldownMs: "2800",
      validationChecks: [
        { selector: "#opsEventRuleDwellInput", invalid: "-1", valid: "21000", message: "최소 체류 시간", description: "min dwell" },
        { selector: "#opsEventRuleLoiteringRadiusInput", invalid: "0", valid: "0.07", message: "최대 이동 반경", description: "radius" },
        { selector: "#opsEventRuleLoiteringPointsInput", invalid: "1", valid: "5", message: "최소 이동 경로 점수", description: "trajectory points" },
      ],
    },
    {
      mode: "scenario",
      type: "zone-occupancy",
      preset: "custom",
      confidence: "0.43",
      zoneThreshold: "6",
      zoneDwellMs: "8000",
      restrictedZoneIds: ["zone-lobby"],
      cooldownMs: "2900",
      validationChecks: [
        { selector: "#opsEventRuleZoneThresholdInput", invalid: "0", valid: "6", message: "점유 임계값", description: "occupancy threshold" },
        { selector: "#opsEventRuleZoneDwellInput", invalid: "-1", valid: "8000", message: "최소 점유 체류", description: "zone dwell" },
      ],
    },
  ];
  const lineTemplates = [];
  for (const spec of specs) {
    const id = await createEventTemplateViaUi(browser, context, spec);
    created.eventRuleIds.push(id);
    if (spec.type === "line-crossing") lineTemplates.push({ id, spec });
    await clickRuleAction(browser, "view-event-template", id, `${spec.type} scenario matrix detail`);
    await assertVisible(browser, "#opsEventRuleForm", `${spec.type} scenario matrix detail form`);
    await assertFormValue(browser, "#opsEventRuleTypeSelect", spec.type, `${spec.type} scenario matrix detail type`);
    await assertEventTemplateDetailMatchesSpec(browser, spec);
    await assertTableContains(browser, "#opsEventRuleRows", id, `${spec.type} scenario matrix table id`);
  }
  await assertTableContains(browser, "#opsEventRuleRows", "정방향", "line direction forward summary");
  await assertTableContains(browser, "#opsEventRuleRows", "역방향", "line direction reverse summary");
  await assertTableContains(browser, "#opsEventRuleRows", "ground-plane", "loitering ground-plane summary");
  await assertTableContains(browser, "#opsEventRuleRows", "임계 6", "zone occupancy threshold summary");
  await assertTableContains(browser, "#opsEventRuleRows", "zone-entry", "intrusion-after-line-crossing target zone summary");
  await assertTableContains(browser, "#opsEventRuleRows", "zone-loiter", "loitering restricted zone summary");
  await assertTableContains(browser, "#opsEventRuleRows", "zone-lobby", "zone occupancy restricted zone summary");
  for (const { id, spec } of lineTemplates) {
    const vaRuleId = await createVaRuleViaUi(browser, context, {
      sourceId: binding.sourceId,
      profileId: binding.profileId,
      templateId: id,
      name: `UI Line ${spec.lineDirection} ${context.label}`,
      enabled: true,
      tracker: "lite",
      reid: "off",
      geometryPoints: "0.10,0.50\n0.90,0.50",
      expectedGeometryType: "line",
    });
    created.vaRuleIds.push(vaRuleId);
    await assertClientViewAllowedRuleApis(binding.sourceId, vaRuleId, `line ${spec.lineDirection} allowed rule APIs`);
    await assertVaRuleClientSession(binding.sourceId, vaRuleId, `line ${spec.lineDirection} VA rule client session`);
    await deleteVaRuleViaUi(browser, vaRuleId, binding.sourceId);
    removeCreated(created.vaRuleIds, vaRuleId);
    await assertVaRuleSessionBlocked(binding.sourceId, vaRuleId, `line ${spec.lineDirection} deleted session rejected`);
  }
  await assertNoOverflow(browser, `${context.label}:rules-scenario-form-matrix`);
}

async function assertEventTemplateDetailMatchesSpec(browser, spec) {
  if (spec.lineDirection !== undefined) {
    await assertFormValue(browser, "#opsEventRuleLineDirectionSelect", spec.lineDirection, `${spec.type} detail line direction`);
  }
  if (spec.targetZoneIds !== undefined) {
    await assertFormValue(browser, "#opsEventRuleTargetZonesInput", spec.targetZoneIds.join(", "), `${spec.type} detail target zones`);
  }
  if (spec.restrictedZoneIds !== undefined) {
    await assertFormValue(browser, "#opsEventRuleRestrictedZonesInput", spec.restrictedZoneIds.join(", "), `${spec.type} detail restricted zones`);
  }
  if (spec.reEntryZoneIds !== undefined) {
    await assertFormValue(browser, "#opsEventRuleReEntryZonesInput", spec.reEntryZoneIds.join(", "), `${spec.type} detail re-entry zones`);
  }
}

async function assertVaRuleMissingSourceValidation(browser, spec) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddVaRuleBtn", "VA rule missing source tab");
  await clickSelector(browser, "#opsCreateVaRuleBtn", "VA rule missing source create");
  await assertVisible(browser, "#opsVaRuleForm", "VA rule missing source form");
  await setTextValue(browser, "#opsVaRuleNameInput", spec.name, "VA rule missing source name");
  await setSelectValue(browser, "#opsVaRuleChannelSelect", "", "VA rule missing source empty channel");
  await setSelectValue(browser, "#opsVaRuleTemplateSeedSelect", spec.templateId, "VA rule missing source template");
  await setSelectValue(browser, "#opsVaRuleProfileSelect", spec.profileId, "VA rule missing source profile");
  await clickSelector(browser, "#opsRulesComposerSave", "VA rule missing source save");
  await assertText(browser, "#opsRulesStatus", "채널을 선택하세요", "VA rule missing source validation");
  await clickSelector(browser, "#opsRulesComposerClose", "VA rule missing source close");
}

async function createVaRuleViaUi(browser, context, spec) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddVaRuleBtn", "VA rule tab");
  await clickSelector(browser, "#opsCreateVaRuleBtn", "VA rule create");
  await assertVisible(browser, "#opsVaRuleForm", "VA rule form");
  const vaRuleId = await readFormValue(browser, "#opsVaRuleIdInput", "VA rule generated id");
  await assertHidden(browser, "#opsVaRuleIdInput", "VA rule hidden id input");
  await assertTextNotEqual(browser, "#opsVaRuleIdDisplay", "자동 배정", "VA rule generated id display");
  await setTextValue(browser, "#opsVaRuleNameInput", spec.name, "VA rule name");
  await setSelectValue(browser, "#opsVaRuleEnabledInput", spec.enabled ? "true" : "false", "VA rule enabled");
  await setSelectValue(browser, "#opsVaRuleChannelSelect", spec.sourceId, "VA rule channel");
  await setSelectValue(browser, "#opsVaRuleTemplateSeedSelect", spec.templateId, "VA rule template");
  await setSelectValue(browser, "#opsVaRuleProfileSelect", spec.profileId, "VA rule profile");
  await setSelectValue(browser, "#opsVaRuleTrackerSelect", spec.tracker, "VA rule tracker");
  await setSelectValue(browser, "#opsVaRuleReidSelect", spec.reid, "VA rule Re-ID");
  await assertText(browser, "#opsVaRulePreviewSummary", "영상을", "VA rule preview summary");
  if (spec.previewPlayback) {
    await assertVaRulePreviewPlayback(browser, "VA rule preview playback");
  }
  await clickSelector(browser, "#opsVaRuleGeometryClearBtn", "VA rule geometry clear");
  await assertText(browser, "#opsVaRuleGeometryPointCountText", "0/", "VA rule geometry cleared point count");
  await assertText(browser, "#opsVaRuleGeometryMinimumText", "최소", "VA rule geometry clear validation");
  await clickSelector(browser, "#opsVaRuleGeometryDefaultBtn", "VA rule geometry default");
  await assertText(browser, "#opsVaRuleGeometryMinimumText", "저장 가능", "VA rule geometry default ready");
  await setTextValue(browser, "#opsVaRuleGeometryPointsInput", spec.geometryPoints, "VA rule geometry points");
  await assertVaGeometryKind(browser, spec.expectedGeometryType, "VA rule geometry kind");
  await clickSelector(browser, "#opsRulesComposerSave", "VA rule save");
  await assertVaRuleSaved(vaRuleId, spec, "VA rule API create");
  await assertFormValue(browser, "#opsVaRuleChannelSelect", spec.sourceId, "VA rule detail source select");
  await assertFormValue(browser, "#opsVaRuleTemplateSeedSelect", spec.templateId, "VA rule detail template select");
  await assertFormValue(browser, "#opsVaRuleProfileSelect", spec.profileId, "VA rule detail profile select");
  await assertFormValue(browser, "#opsVaRuleEnabledInput", spec.enabled ? "true" : "false", "VA rule detail enabled select");
  await assertText(browser, "#opsVaRuleGeometryPointCountText", spec.expectedGeometryType === "line" ? "2/" : "4/", "VA rule detail geometry point count");
  await assertViewRuleBinding(spec.sourceId, vaRuleId, true, "VA rule PublishedView binding create");
  await assertTableContains(browser, "#opsVaRuleRows", vaRuleId, "VA rule row id");
  await assertText(browser, "#opsVaRuleRows", spec.enabled ? "활성" : "비활성", "VA rule row status");
  await assertTableContains(browser, "#opsVaRuleRows", spec.expectedGeometryType === "line" ? "라인" : "영역", "VA rule geometry row");
  await assertTableContains(browser, "#opsVaRuleRows", trackerPolicyLabel(spec.tracker), "VA rule tracker row");
  await assertTableContains(browser, "#opsVaRuleRows", reidPolicyLabel(spec.reid), "VA rule reid row");
  await assertNoOverflow(browser, `${context.label}:rules-va-create`);
  return vaRuleId;
}

async function assertVaRulePreviewPlayback(browser, description) {
  await clickSelector(browser, "#opsVaRulePreviewStartBtn", `${description} start`);
  await waitForResult(
    browser,
    `
      (() => {
        const video = document.getElementById('opsVaRulePreviewVideo');
        const summary = String(document.getElementById('opsVaRulePreviewSummary')?.textContent || '');
        const placeholder = document.getElementById('opsVaRulePreviewPlaceholder');
        return {
          ok: Boolean(video) &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            summary.includes('미리보기를 보고') &&
            placeholder?.hidden === true,
          readyState: video?.readyState || 0,
          videoWidth: video?.videoWidth || 0,
          videoHeight: video?.videoHeight || 0,
          summary,
          placeholderHidden: placeholder?.hidden === true,
        };
      })()
    `,
    item => item?.ok === true,
    `${description} video ready`,
  );
  await clickSelector(browser, "#opsVaRulePreviewStopBtn", `${description} stop`);
  await waitForResult(
    browser,
    `
      (() => {
        const video = document.getElementById('opsVaRulePreviewVideo');
        const summary = String(document.getElementById('opsVaRulePreviewSummary')?.textContent || '');
        const stopBtn = document.getElementById('opsVaRulePreviewStopBtn');
        return {
          ok: Boolean(video) && !video.srcObject && stopBtn?.disabled === true && summary.includes('영상을 재생'),
          hasSrcObject: Boolean(video?.srcObject),
          stopDisabled: stopBtn?.disabled === true,
          summary,
        };
      })()
    `,
    item => item?.ok === true,
    `${description} stopped`,
  );
}

async function updateVaRuleViaUi(browser, vaRuleId, spec) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddVaRuleBtn", "VA rule tab for edit");
  await clickRuleAction(browser, "view-va", vaRuleId, "VA rule detail");
  await assertVisible(browser, "#opsVaRuleForm", "VA rule detail form");
  await clickSelector(browser, "#opsRulesComposerEdit", "VA rule edit");
  if (spec.name) await setTextValue(browser, "#opsVaRuleNameInput", spec.name, "VA rule name update");
  if (typeof spec.enabled === "boolean") await setSelectValue(browser, "#opsVaRuleEnabledInput", spec.enabled ? "true" : "false", "VA rule enabled update");
  if (spec.templateId) await setSelectValue(browser, "#opsVaRuleTemplateSeedSelect", spec.templateId, "VA rule template update");
  if (spec.tracker) await setSelectValue(browser, "#opsVaRuleTrackerSelect", spec.tracker, "VA rule tracker update");
  if (spec.tracker === "none") await assertFormValue(browser, "#opsVaRuleReidSelect", "off", "VA rule Re-ID forced off for disabled tracker");
  if (spec.reid) await setSelectValue(browser, "#opsVaRuleReidSelect", spec.reid, "VA rule Re-ID update");
  if (spec.geometryPoints) await setTextValue(browser, "#opsVaRuleGeometryPointsInput", spec.geometryPoints, "VA rule geometry update");
  if (spec.expectedGeometryType) await assertVaGeometryKind(browser, spec.expectedGeometryType, "VA rule geometry kind update");
  await clickSelector(browser, "#opsRulesComposerSave", "VA rule update save");
  await assertVaRuleSaved(vaRuleId, spec, "VA rule API update");
  if (spec.expectedGeometryType) {
    await assertText(browser, "#opsVaRuleGeometryPointCountText", spec.expectedGeometryType === "line" ? "2/" : "4/", "VA rule geometry update point count");
  }
  if (spec.expectedTracker || spec.tracker) {
    await assertTableContains(browser, "#opsVaRuleRows", trackerPolicyLabel(spec.expectedTracker || spec.tracker), "VA rule tracker update row");
  }
  if (spec.expectedReid || spec.reid) {
    await assertTableContains(browser, "#opsVaRuleRows", reidPolicyLabel(spec.expectedReid || spec.reid), "VA rule reid update row");
  }
}

async function updateVaRuleTrackingViaUi(browser, vaRuleId, spec) {
  await updateVaRuleViaUi(browser, vaRuleId, {
    tracker: spec.tracker,
    reid: spec.reid,
    expectedTracker: spec.tracker,
    expectedReid: spec.expectedReid || spec.reid,
  });
}

async function deleteVaRuleViaUi(browser, vaRuleId, viewId) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddVaRuleBtn", "VA rule tab for delete");
  await clickRuleAction(browser, "delete-va", vaRuleId, "VA rule delete confirm");
  await assertText(browser, "#opsRulesStatus", "삭제 확인", "VA rule delete first confirmation");
  await clickRuleAction(browser, "delete-va", vaRuleId, "VA rule delete execute");
  await assertText(browser, "#opsRulesStatus", "삭제했습니다", "VA rule delete status");
  await assertNoRuleCatalogItem("vaRule", vaRuleId, "VA rule API delete");
  await assertViewRuleBinding(viewId, vaRuleId, false, "VA rule PublishedView binding delete");
}

async function deleteEventTemplateViaUi(browser, eventRuleId) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddEventRuleBtn", "event template tab for delete");
  await clickRuleAction(browser, "delete-event-template", eventRuleId, "event template delete confirm");
  await assertText(browser, "#opsRulesStatus", "삭제 확인", "event template delete first confirmation");
  await clickRuleAction(browser, "delete-event-template", eventRuleId, "event template delete execute");
  await assertText(browser, "#opsRulesStatus", "삭제했습니다", "event template delete status");
  await assertNoRuleCatalogItem("eventRule", eventRuleId, "event template API delete");
}

async function deleteProfileViaUi(browser, profileId) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddProfileBtn", "profile tab for delete");
  await clickRuleAction(browser, "delete-profile", profileId, "profile delete confirm");
  await assertText(browser, "#opsRulesStatus", "삭제 확인", "profile delete first confirmation");
  await clickRuleAction(browser, "delete-profile", profileId, "profile delete execute");
  await assertText(browser, "#opsRulesStatus", "삭제했습니다", "profile delete status");
  await assertNoRuleCatalogItem("profile", profileId, "profile API delete");
}

async function clickRuleAction(browser, action, id, description) {
  const selector = `${attrEqualsSelector("data-ops-rule-action", action)}${attrEqualsSelector("data-ops-rule-id", id)}`;
  if (!(await isElementVisible(browser, selector))) {
    await markRuleContextSummary(browser, selector, description);
    await clickSelector(browser, attrEqualsSelector("data-ops-click-menu-target", `${action}:${id}`), `${description} context menu`);
  }
  await clickSelector(browser, selector, description);
}

async function markRuleContextSummary(browser, actionSelector, description) {
  const result = await browser.evaluate(`
    (() => {
      const selector = ${JSON.stringify(actionSelector)};
      const button = document.querySelector(selector);
      if (!button) return { ok: false, message: 'missing action button' };
      const details = button.closest('details');
      const summary = details?.querySelector('summary');
      if (!details || !summary) return { ok: false, message: 'missing context summary' };
      summary.dataset.opsClickMenuTarget = String(button.dataset.opsRuleAction || '') + ':' + String(button.dataset.opsRuleId || '');
      return { ok: true, target: summary.dataset.opsClickMenuTarget, text: String(button.textContent || '').trim() };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} context menu 표시 실패: ${JSON.stringify(result)}`);
  }
}

async function assertOpsRuleCopyPayload(browser, kind, ruleId, expectedSnippets, description) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await clickSelector(browser, "#opsAddVaRuleBtn", `${description} VA rule tab`);
  const selector = `${attrEqualsSelector("data-ops-rule-copy-kind", kind)}${attrEqualsSelector("data-ops-rule-copy-id", ruleId)}`;
  await installClipboardCaptureStub(browser);
  try {
    await clickSelector(browser, selector, description);
    await waitForResult(
      browser,
      `
        (() => {
          const value = String(window.__opsClickClipboardCaptured || '');
          const expected = ${JSON.stringify(expectedSnippets)};
          const missing = expected.filter(item => !value.includes(item));
          return { ok: value.length > 0 && missing.length === 0, missing, value };
        })()
      `,
      item => item?.ok === true,
      `${description} clipboard payload`,
    );
  } finally {
    await restoreClipboardCaptureStub(browser);
  }
}

async function assertVaGeometryKind(browser, expectedType, description) {
  const expectedLabel = expectedType === "line" ? "라인" : "영역";
  await assertFormValue(browser, "#opsVaRuleGeometryKindText", expectedLabel, description);
}

async function assertVaRuleSaved(vaRuleId, spec, description) {
  await assertRuleCatalogVaRule(vaRuleId, rule => {
    const tracker = String(rule.analysis?.trackingPolicy?.tracker || "");
    const reid = String(rule.analysis?.trackingPolicy?.reid || "");
    const expectedTracker = String(spec.expectedTracker || spec.tracker || tracker);
    const expectedReid = String(spec.expectedReid || spec.reid || reid);
    const geometryType = String(rule.event?.region?.type || "");
    return (!spec.name || rule.name === spec.name) &&
      (typeof spec.enabled !== "boolean" || (rule.enabled !== false) === spec.enabled) &&
      (!spec.sourceId || sourcePayloadKey(rule.source || {}).includes(String(spec.sourceId)) || String(rule.source?.sourceId || "") === String(spec.sourceId)) &&
      (!spec.templateId || String(rule.templateStart?.ruleId || "") === String(spec.templateId)) &&
      (!spec.profileId || String(rule.analysis?.profileId || "") === String(spec.profileId)) &&
      (!expectedTracker || tracker === expectedTracker) &&
      (!expectedReid || reid === expectedReid) &&
      (!spec.expectedGeometryType || geometryType === spec.expectedGeometryType) &&
      (!spec.geometryPoints || Array.isArray(rule.event?.region?.points) && rule.event.region.points.length >= (spec.expectedGeometryType === "line" ? 2 : 3));
  }, description);
}

async function assertVaRuleClientSession(viewId, vaRuleId, description) {
  const created = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "va-rule", ruleId: vaRuleId }),
  });
  const sessionId = String(created?.sessionId || "");
  if (!sessionId || !created?.offer) {
    throw new Error(`${description}: missing sessionId/offer ${JSON.stringify(created).slice(0, 240)}`);
  }
  const deleted = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!deleted.ok) {
    throw new Error(`${description}: delete failed HTTP ${deleted.status} ${deleted.text.slice(0, 160)}`);
  }
}

async function assertVaRuleRuntimeTrackingPolicy(viewId, vaRuleId, expected, description) {
  const created = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "va-rule", ruleId: vaRuleId }),
  });
  const sessionId = String(created?.sessionId || "");
  if (!sessionId || !created?.offer) {
    throw new Error(`${description}: missing sessionId/offer ${JSON.stringify(created).slice(0, 240)}`);
  }
  try {
    await waitForApiPredicate("/ops/api/runtime/status", payload => {
      const taps = Array.isArray(payload?.analysisMatching?.activeTaps) ? payload.analysisMatching.activeTaps : [];
      return taps.some(tap => {
        const policy = tap?.trackingPolicy || {};
        if (String(policy.ruleId || tap?.selectedRuleId || "") !== String(vaRuleId)) return false;
        if (String(policy.source || "") !== "rule") return false;
        if (policy.specified !== true) return false;
        if (expected.tracker && String(policy.tracker || "") !== String(expected.tracker)) return false;
        if (expected.effectiveTracker && String(policy.effectiveTracker || "") !== String(expected.effectiveTracker)) return false;
        if (expected.reid && String(policy.reid || "") !== String(expected.reid)) return false;
        return true;
      });
    }, description);
  } finally {
    const deleted = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    }).catch(error => ({ ok: false, status: 0, text: String(error?.message || error) }));
    if (!deleted.ok) {
      throw new Error(`${description}: cleanup delete failed HTTP ${deleted.status} ${deleted.text.slice(0, 160)}`);
    }
  }
}

async function assertDashboardActiveVaRuntime(browser, viewId, vaRuleId, description) {
  const created = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "va-rule", ruleId: vaRuleId }),
  });
  const sessionId = String(created?.sessionId || "");
  if (!sessionId || !created?.offer) {
    throw new Error(`${description}: missing sessionId/offer ${JSON.stringify(created).slice(0, 240)}`);
  }
  try {
    const runtime = await waitForApiPredicate("/ops/api/runtime/status", payload => {
      const taps = Array.isArray(payload?.analysisMatching?.activeTaps) ? payload.analysisMatching.activeTaps : [];
      return taps.some(tap => String(tap?.selectedRuleId || tap?.trackingPolicy?.ruleId || "") === String(vaRuleId));
    }, `${description} active tap`);
    const activeSessions = Number(runtime?.sessionManager?.activeSessions || 0);
    const activeTaps = Number(runtime?.sessionManager?.activeAnalysisTaps || 0);
    if (activeSessions <= 0 || activeTaps <= 0) {
      throw new Error(`${description}: runtime counters did not show active session/tap ${JSON.stringify(runtime?.sessionManager || {})}`);
    }
    await navigatePath(browser, "/ops/dashboard");
    await assertReady(browser, "/ops/dashboard", '[data-testid="ops-dashboard-page"]');
    await waitForResult(
      browser,
      `
        (() => {
          const runtimeBadges = String(document.getElementById('dashRuntimeOpsBadges')?.textContent || '');
          const runtimeText = String(document.getElementById('dashRuntimeOpsText')?.textContent || '');
          const runtimeList = String(document.getElementById('dashRuntimeOpsList')?.textContent || '');
          const vaBadges = String(document.getElementById('dashVaQualityBadges')?.textContent || '');
          const vaText = String(document.getElementById('dashVaQualityText')?.textContent || '');
          return {
            ok: runtimeBadges.includes(${JSON.stringify(`룰 ${vaRuleId}`)}) &&
              runtimeBadges.includes('탭') &&
              runtimeText.includes('runtime/status') &&
              runtimeList.includes('선택 tap') &&
              vaBadges.includes(${JSON.stringify(`룰 ${vaRuleId}`)}) &&
              vaBadges.includes('타임라인') &&
              !vaText.includes('활성 분석 탭이 있으면'),
            runtimeBadges,
            runtimeText,
            runtimeList: runtimeList.slice(0, 600),
            vaBadges,
            vaText,
          };
        })()
      `,
      item => item?.ok === true,
      `${description} dashboard active summary`,
    );
    await navigatePath(browser, "/ops/home");
    await assertReady(browser, "/ops/home", '[data-testid="ops-home-page"]');
    await waitForResult(
      browser,
      `
        (() => {
          const active = String(document.getElementById('homeActiveSessions')?.textContent || '').trim();
          const text = String(document.getElementById('homeRuntimeText')?.textContent || '');
          return {
            ok: active && active !== '-' && active !== '0' && !text.includes('불러오는 중'),
            active,
            text,
          };
        })()
      `,
      item => item?.ok === true,
      `${description} home active summary`,
    );
    await navigatePath(browser, "/ops/rules");
    await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  } finally {
    const deleted = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    }).catch(error => ({ ok: false, status: 0, text: String(error?.message || error) }));
    if (!deleted.ok) {
      throw new Error(`${description}: cleanup delete failed HTTP ${deleted.status} ${deleted.text.slice(0, 160)}`);
    }
  }
}

async function assertVaRuleSessionBlocked(viewId, vaRuleId, description) {
  const result = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "va-rule", ruleId: vaRuleId }),
  });
  if (![400, 403, 404, 409].includes(result.status)) {
    throw new Error(`${description}: expected blocked session status, got ${result.status} ${result.text.slice(0, 160)}`);
  }
}

async function assertClientScreenDoesNotExposeOpsRuleCopyControls(browser, vaRuleId, description) {
  await navigatePath(browser, "/client/live");
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  const result = await browser.evaluate(`
    (() => {
      const body = String(document.body?.textContent || '');
      const opsCopyButtons = Array.from(document.querySelectorAll('[data-ops-rule-copy-kind]'))
        .map(item => ({ kind: item.getAttribute('data-ops-rule-copy-kind') || '', id: item.getAttribute('data-ops-rule-copy-id') || '' }));
      return {
        ok: opsCopyButtons.length === 0 && !body.includes(${JSON.stringify(`vaRule=${vaRuleId}`)}),
        opsCopyButtons,
        leakedVaRuleUrl: body.includes(${JSON.stringify(`vaRule=${vaRuleId}`)}),
      };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description}: client screen exposed ops rule copy affordance ${JSON.stringify(result)}`);
  }
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
}

async function assertRuleCatalogVaRule(id, predicate, description) {
  await waitForApiPredicate("/ops/api/rules/catalog", payload => {
    const rule = (payload.vaRules || []).find(item => String(item?.id || "") === String(id));
    return rule && predicate(rule, payload);
  }, description);
}

async function assertRuleCatalogEventTemplate(id, predicate, description) {
  await waitForApiPredicate("/ops/api/rules/catalog", payload => {
    const rule = (payload.rules || []).find(item => String(item?.id || "") === String(id));
    return rule && predicate(rule, payload);
  }, description);
}

async function assertRuleCatalogProfile(id, predicate, description) {
  await waitForApiPredicate("/ops/api/rules/catalog", payload => {
    const profile = (payload.profiles || []).find(item => String(item?.id || item?.profileId || "") === String(id));
    return profile && predicate(profile, payload);
  }, description);
}

async function assertNoRuleCatalogItem(kind, id, description) {
  await waitForApiPredicate("/ops/api/rules/catalog", payload => {
    const items = kind === "vaRule"
      ? payload.vaRules || []
      : (kind === "eventRule" ? payload.rules || [] : payload.profiles || []);
    return !items.some(item => String(item?.id || item?.profileId || "") === String(id));
  }, description);
}

async function assertViewRuleBinding(viewId, ruleId, expected, description) {
  await waitForApiPredicate("/ops/api/views", payload => {
    const view = (payload.views || []).find(item => String(item?.viewId || "") === String(viewId));
    if (!view) return false;
    const allowed = Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds.map(String) : [];
    const modes = Array.isArray(view.allowedOverlayModes) ? view.allowedOverlayModes.map(String) : [];
    const hasRule = String(view.defaultRuleId || "") === String(ruleId) || allowed.includes(String(ruleId));
    return expected
      ? hasRule && modes.includes("va-rule")
      : !hasRule;
  }, description);
}

async function assertClientViewAllowedRuleApis(viewId, ruleId, description) {
  const listPayload = await requestJson("/client/api/views");
  const listViews = Array.isArray(listPayload?.views) ? listPayload.views : (Array.isArray(listPayload) ? listPayload : []);
  const listView = listViews.find(item => String(item?.viewId || item?.id || "") === String(viewId));
  if (!listView) {
    throw new Error(`${description}: client list API missing view ${viewId}`);
  }
  const detailPayload = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}`);
  const detailView = detailPayload?.view || detailPayload;
  const listAllowed = Array.isArray(listView.allowedRuleIds) ? listView.allowedRuleIds.map(String) : [];
  const detailAllowed = Array.isArray(detailView.allowedRuleIds) ? detailView.allowedRuleIds.map(String) : [];
  const expected = String(ruleId);
  if (!listAllowed.includes(expected) || !detailAllowed.includes(expected)) {
    throw new Error(`${description}: missing allowedRuleIds in client APIs list=${JSON.stringify(listAllowed)} detail=${JSON.stringify(detailAllowed)}`);
  }
  const unexpected = [...listAllowed, ...detailAllowed].filter(item => item && item !== expected);
  if (unexpected.length > 0) {
    throw new Error(`${description}: unexpected extra allowedRuleIds ${JSON.stringify(unexpected)}`);
  }
  const dashboardPayload = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/dashboard`);
  if (String(dashboardPayload?.view?.viewId || "") !== String(viewId)) {
    throw new Error(`${description}: dashboard endpoint did not stay scoped to view ${viewId}`);
  }
  const metadataPayload = await requestJson(`/client/api/views/${encodeURIComponent(viewId)}/metadata`);
  if (String(metadataPayload?.view?.viewId || "") !== String(viewId) || metadataPayload?.metadata?.schema !== "media-server.client.metadata-summary.v1") {
    throw new Error(`${description}: metadata endpoint did not stay scoped to view ${viewId}`);
  }
  const blocked = await requestStatus(`/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlayMode: "va-rule", ruleId: `${ruleId}-not-allowed` }),
  });
  if (![400, 403, 404, 409].includes(blocked.status)) {
    throw new Error(`${description}: disallowed va-rule session was not blocked, got ${blocked.status} ${blocked.text.slice(0, 160)}`);
  }
}

async function assertOpsRulesValidationIssue(browser, expectedText, description) {
  await navigatePath(browser, "/ops/rules");
  await assertReady(browser, "/ops/rules", '[data-testid="ops-rules-page"]');
  await assertText(browser, "#opsRulesValidationList", expectedText, description);
}

function ruleEventType(item) {
  return String(item?.scenario?.type || item?.event?.type || item?.eventType || "");
}

function sameNumber(actual, expected) {
  if (expected === undefined) return true;
  return Number(actual) === Number(expected);
}

function sameStringArray(actual, expected) {
  if (expected === undefined) return true;
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const actualValues = actual.map(item => String(item || ""));
  return expected.every(item => actualValues.includes(String(item || "")));
}

function eventTemplateMatchesSpec(template, spec) {
  const event = template?.event || {};
  const scenario = template?.scenario || {};
  return sameNumber(event.minConfidence, spec.confidence) &&
    sameNumber(event.minDurationMs, spec.minDurationMs) &&
    (spec.lineDirection === undefined || String(event?.region?.direction || scenario?.allowedDirection || "") === String(spec.lineDirection)) &&
    sameNumber(scenario.candidateTimeMs, spec.candidateMs) &&
    (!["intrusion-dwell", "intrusion-after-line-crossing"].includes(spec.type) || sameNumber(scenario.dwellTimeMs, spec.dwellMs)) &&
    sameNumber(scenario.cooldownMs, spec.cooldownMs) &&
    sameNumber(scenario.reEntryWindowMs, spec.reEntryWindowMs) &&
    (spec.reEntryMode === undefined || String(scenario.reEntryMode || "") === String(spec.reEntryMode)) &&
    (spec.type !== "wrong-direction" || String(scenario.allowedDirection || event?.region?.direction || "") === String(spec.lineDirection || "forward")) &&
    sameNumber(scenario.maxDelayAfterCrossingMs, spec.lineDelayMs) &&
    (spec.triggerDirection === undefined || String(scenario?.triggerLine?.direction || "") === String(spec.triggerDirection)) &&
    (spec.type !== "loitering" || sameNumber(scenario.minDwellTimeMs, spec.dwellMs)) &&
    (spec.type !== "zone-occupancy" || sameNumber(scenario.minDwellTimeMs, spec.zoneDwellMs)) &&
    sameNumber(scenario.maxMovementRadius, spec.loiteringRadius) &&
    sameNumber(scenario.minTrajectoryPoints, spec.loiteringPoints) &&
    (spec.groundPlane === undefined || Boolean(scenario.useGroundPlaneMovementRadius) === Boolean(spec.groundPlane)) &&
    sameNumber(scenario.occupancyThreshold, spec.zoneThreshold) &&
    sameStringArray(scenario.targetZoneIds, spec.targetZoneIds) &&
    sameStringArray(scenario.restrictedZoneIds, spec.restrictedZoneIds) &&
    sameStringArray(scenario.reEntryZoneIds, spec.reEntryZoneIds);
}

function trackerPolicyLabel(value) {
  const tracker = String(value || "").trim();
  if (tracker === "none") return "Tracking off";
  if (tracker === "kalman-lite") return "Kalman-lite";
  if (tracker === "bytetrack") return "ByteTrack";
  return "Lite tracker";
}

function reidPolicyLabel(value) {
  return String(value || "").trim() === "assist" ? "Re-ID assist" : "Re-ID off";
}

function sourcePayloadKey(source) {
  return [
    source?.sourceId,
    source?.file,
    source?.rtspUrl,
    source?.whepUrl,
    source?.httpUrl,
    source?.webrtcSourceId,
    source?.url,
  ].map(item => String(item || "")).join("|");
}

function removeCreated(items, id) {
  const index = items.indexOf(id);
  if (index >= 0) items.splice(index, 1);
}

async function cleanupRulesNativeCrudFixtures(created) {
  for (const id of [...created.vaRuleIds].reverse()) {
    await requestStatus(`/lab/analysis/va-rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
  }
  for (const id of [...created.eventRuleIds].reverse()) {
    await requestStatus(`/lab/analysis/rules/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
  }
  for (const id of [...created.profileIds].reverse()) {
    await requestStatus(`/lab/analysis/profiles/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
  }
  for (const id of [...created.sourceIds].reverse()) {
    await cleanupSourceCrudFixture(id).catch(error => {
      console.log(`[warn] rules native fixture source cleanup failed for ${id}: ${error.message}`);
    });
  }
}

function rtspListenPort() {
  const value = Number(process.env.MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT || process.env.MEDIA_SERVER_LISTEN_PORT || 8554);
  return Number.isFinite(value) && value > 0 ? value : 8554;
}

async function runAuthUiFlow(browser, context) {
  const steps = [];
  const snapshot = snapshotAuthStore();
  let scopeFixture = null;
  const suffix = `${process.pid}-${String(context?.width || "w")}-${Date.now()}`;
  const lifecycleUsername = `auth-ui-life-${suffix}`.slice(0, 64);
  const requestUsername = `auth-ui-req-${suffix}`.slice(0, 64);
  const rejectUsername = `auth-ui-reject-${suffix}`.slice(0, 64);
  const passwords = context.passwords;
  try {
    clearAuthStoreForFreshSetup(snapshot);
    await installErrorCollector(browser);

    await navigatePathExpect(browser, "/", "/setup");
    await assertVisible(browser, 'form[action="/setup"]', "초기 setup form");
    await setTextValue(browser, 'form[action="/setup"] [name="password"]', passwords.admin, "초기 admin 비밀번호");
    await setTextValue(browser, 'form[action="/setup"] [name="confirm"]', passwords.admin, "초기 admin 비밀번호 확인");
    await clickSelector(browser, 'form[action="/setup"] button[type="submit"]', "초기 admin setup 제출");
    await waitForPath(browser, "/login");
    await assertStoreUser("admin", user => user.role === "admin" && user.enabled === true && Boolean(user.passwordHash), "bootstrap admin 저장");
    steps.push("auth:setup-bootstrap");

    await loginViaForm(browser, "admin", passwords.admin, "/ops/home");
    await assertWhoami(browser, { username: "admin", role: "admin" }, "admin whoami");
    scopeFixture = await authUiScopeFixture(browser);
    await navigatePath(browser, "/client/live");
    await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
    await assertClientPreviewAdminAffordance(browser, `${context.label}:session-admin-preview`);
    steps.push("auth:admin-login-client-preview");

    await logoutViaPost(browser);
    await navigatePathExpect(browser, "/ops/home", "/login");
    await assertLoginRejected(browser, "admin", passwords.wrongOne, "잘못된 admin 비밀번호 거부");
    steps.push("auth:logout-route-guard");

    await loginViaForm(browser, "admin", passwords.admin, "/ops/home");
    await createLifecycleUserViaUi(browser, lifecycleUsername, passwords.userInitial, context, scopeFixture.initialViewId);
    await editLifecycleUserScopeViaUi(browser, lifecycleUsername, scopeFixture.updatedViewId, scopeFixture.initialViewId);
    await resetLifecycleUserPasswordViaUi(browser, lifecycleUsername, passwords.userReset);
    await disableLifecycleUserViaUi(browser, lifecycleUsername);
    await logoutViaPost(browser);
    await assertLoginRejected(browser, lifecycleUsername, passwords.userReset, "비활성 사용자 로그인 거부");
    await loginViaForm(browser, "admin", passwords.admin, "/ops/home");
    await restoreLifecycleUserViaUi(browser, lifecycleUsername);
    await logoutViaPost(browser);
    await loginViaForm(browser, lifecycleUsername, passwords.userReset, "/password/change");
    await changePasswordViaForm(browser, passwords.userReset, passwords.userChanged);
    await assertLoginRejected(browser, lifecycleUsername, passwords.userReset, "이전 임시 비밀번호 재사용 로그인 거부");
    await loginViaForm(browser, lifecycleUsername, passwords.userChanged, "/client/live");
    await assertWhoami(browser, { username: lifecycleUsername, role: "viewer" }, "복구 사용자 whoami");
    await assertClientSourceTreeOnly(browser, scopeFixture.updatedViewId, "scope 수정 viewer source tree");
    steps.push("auth:user-lifecycle-session", "auth:viewer-scope-change-source-tree");
    await assertClientLiveSessionCleanupViaUi(browser, context);
    steps.push("client:live-session-cleanup");

    await logoutViaPost(browser);
    await submitPublicAccessRequestViaUi(browser, requestUsername, scopeFixture.ruleViewId);
    await assertStoreAccessRequest(requestUsername, request => request.status === "pending" && !findStoreUser(requestUsername), "접근 요청 pending 저장과 user 미생성");
    await loginViaForm(browser, "admin", passwords.admin, "/ops/home");
    const approvedToken = await approveAccessRequestViaUi(browser, requestUsername, scopeFixture.ruleViewId);
    await assertStoreAccessRequest(requestUsername, request => request.status === "approved" && Boolean(request.inviteId), "접근 요청 승인 저장");
    await assertStoreNoUser(requestUsername, "초대 설정 전 접근 요청 user 미생성");
    await logoutViaPost(browser);
    await acceptInviteViaUi(browser, approvedToken, passwords.inviteAccepted);
    await assertStoreUser(requestUsername, user => user.enabled === true && user.role === "viewer" && hasScope(user, `view:read:${scopeFixture.ruleViewId}`), "초대 수락 user/scope 생성");
    await loginViaForm(browser, requestUsername, passwords.inviteAccepted, "/client/live");
    await assertWhoami(browser, { username: requestUsername, role: "viewer" }, "초대 수락 viewer whoami");
    await assertViewerRuleScopeBoundaryViaUi(browser, "초대 수락 viewer rule/view scope boundary", scopeFixture);
    await logoutViaPost(browser);
    await assertConsumedInviteRejected(browser, approvedToken, passwords.wrongTwo);
    steps.push("auth:access-request-approve-invite-setup", "auth:viewer-rule-scope-boundary");

    await submitPublicAccessRequestViaUi(browser, rejectUsername, scopeFixture.ruleViewId);
    await assertStoreAccessRequest(rejectUsername, request => request.status === "pending" && !findStoreUser(rejectUsername), "거절 요청 pending 저장과 user 미생성");
    await loginViaForm(browser, "admin", passwords.admin, "/ops/home");
    await rejectAccessRequestViaUi(browser, rejectUsername);
    await assertStoreAccessRequest(rejectUsername, request => request.status === "rejected", "접근 요청 거절 저장");
    await assertStoreNoUser(rejectUsername, "접근 요청 거절 후 user 미생성");
    await assertStoreNoInvite(rejectUsername, "접근 요청 거절 후 invite 미생성");
    steps.push("auth:access-request-reject");

    await assertLastAdminGuardViaUi(browser);
    steps.push("auth:last-admin-guard");
    await assertBrowserErrors(browser, context.label);
    return { steps };
  } finally {
    await restoreAuthStoreSnapshot(snapshot);
  }
}

async function createLifecycleUserViaUi(browser, username, password, context, viewId) {
  await navigatePath(browser, "/ops/users");
  await installErrorCollector(browser);
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  await clickSelector(browser, "#add-user-btn", "session 사용자 추가");
  await assertVisible(browser, "#user-detail-panel", "session 사용자 추가 패널");
  await setTextValue(browser, '#user-form [name="username"]', username, "session 사용자 계정명");
  await setTextValue(browser, '#user-form [name="displayName"]', "Auth UI Lifecycle", "session 사용자 표시 이름");
  await setTextValue(browser, '#user-form [name="password"]', password, "session 사용자 초기 비밀번호");
  await setTextValue(browser, '#user-form [name="confirmPassword"]', password, "session 사용자 초기 비밀번호 확인");
  await setSelectValue(browser, '#user-form [name="role"]', "viewer", "session 사용자 권한");
  await setTextValue(browser, "#user-scopes-input", viewerScopes(viewId).join("\n"), "session 사용자 scope");
  await setCheckboxValue(browser, '#user-form [name="enabled"]', true, "session 사용자 활성화");
  await setCheckboxValue(browser, '#user-form [name="mustChangePassword"]', false, "session 사용자 must-change 해제");
  await clickSelector(browser, "#user-save-selected", "session 사용자 저장");
  await assertText(browser, "#status", "사용자 추가 완료", "session 사용자 추가 상태");
  await assertStoreUser(username, user =>
    user.enabled === true &&
    user.role === "viewer" &&
    user.mustChangePassword === false &&
    hasScope(user, `view:read:${viewId}`),
  "session 사용자 저장 결과");
  await assertUserRowText(browser, username, "Auth UI Lifecycle", "session 사용자 row");
  await assertNoOverflow(browser, `${context.label}:auth-users-create`);
}

async function editLifecycleUserScopeViaUi(browser, username, nextViewId, previousViewId) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  await clickSelector(browser, attrEqualsSelector("data-user-view", username), "session 사용자 상세");
  await clickSelector(browser, "#user-edit-selected", "session 사용자 수정");
  await setTextValue(browser, '#user-form [name="displayName"]', "Auth UI Lifecycle Updated", "session 사용자 표시 이름 수정");
  await setTextValue(browser, "#user-scopes-input", viewerScopes(nextViewId).join("\n"), "session 사용자 scope 수정");
  await clickSelector(browser, "#user-save-selected", "session 사용자 수정 저장");
  await assertText(browser, "#status", "사용자 저장 완료", "session 사용자 수정 상태");
  await assertStoreUser(username, user =>
    user.displayName === "Auth UI Lifecycle Updated" &&
    hasScope(user, `view:read:${nextViewId}`) &&
    !hasScope(user, `view:read:${previousViewId}`),
  "session 사용자 scope 수정 저장");
  await assertUserRowText(browser, username, "Auth UI Lifecycle Updated", "session 사용자 수정 row");
}

async function resetLifecycleUserPasswordViaUi(browser, username, password) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  await clickSelector(browser, attrEqualsSelector("data-user-reset-password", username), "session 사용자 비밀번호 초기화 패널");
  await assertVisible(browser, "#user-reset-password-panel", "session 사용자 비밀번호 초기화 패널 표시");
  await setTextValue(browser, "#user-reset-password", password, "session 사용자 임시 비밀번호");
  await setTextValue(browser, "#user-reset-password-confirm", password, "session 사용자 임시 비밀번호 확인");
  await clickSelector(browser, "#user-reset-password-button", "session 사용자 비밀번호 초기화");
  await assertText(browser, "#user-reset-password-status", "비밀번호 초기화 완료", "session 사용자 비밀번호 초기화 상태");
  await assertStoreUser(username, user => user.mustChangePassword === true && Boolean(user.passwordHash), "session 사용자 must-change 저장");
}

async function disableLifecycleUserViaUi(browser, username) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  const selector = `${attrEqualsSelector("data-user-set-enabled", "false")}${attrEqualsSelector("data-user-action-username", username)}`;
  await clickSelector(browser, selector, "session 사용자 비활성화 1차 확인");
  await assertText(browser, "#status", "로그인 비활성화와 기존 세션 회수 확인", "session 사용자 비활성화 1차 상태");
  await clickSelector(browser, selector, "session 사용자 비활성화 실행");
  await assertText(browser, "#status", "비활성화 완료", "session 사용자 비활성화 상태");
  await assertStoreUser(username, user => user.enabled === false, "session 사용자 비활성화 저장");
}

async function restoreLifecycleUserViaUi(browser, username) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  const selector = `${attrEqualsSelector("data-user-set-enabled", "true")}${attrEqualsSelector("data-user-action-username", username)}`;
  await clickSelector(browser, selector, "session 사용자 복구");
  await assertText(browser, "#status", "복구 완료", "session 사용자 복구 상태");
  await assertStoreUser(username, user => user.enabled === true, "session 사용자 복구 저장");
}

async function submitPublicAccessRequestViaUi(browser, username, viewId) {
  await logoutViaPost(browser).catch(() => null);
  await navigatePath(browser, "/client/request-access");
  await waitForPath(browser, "/client/request-access");
  await assertVisible(browser, "#request-form", "공개 접근 요청 form");
  await setTextValue(browser, '#request-form [name="username"]', username, "공개 접근 요청 계정명");
  await setTextValue(browser, '#request-form [name="displayName"]', "Auth UI Request", "공개 접근 요청 표시 이름");
  await setTextValue(browser, '#request-form [name="contact"]', `${username}@example.test`, "공개 접근 요청 연락처");
  await setTextValue(browser, '#request-form [name="viewId"]', viewId, "공개 접근 요청 채널");
  await setTextValue(browser, '#request-form [name="reason"]', "auth ui browser e2e request", "공개 접근 요청 사유");
  await submitForm(browser, "#request-form", "공개 접근 요청 제출");
  await assertText(browser, "#message", "승인 전에는 로그인/채널 접근이 열리지 않습니다", "공개 접근 요청 pending 안내");
}

async function approveAccessRequestViaUi(browser, username, viewId) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  const request = await waitForStore("승인 대상 접근 요청", () => findStoreAccessRequest(username));
  const viewSelector = attrEqualsSelector("data-request-approve-view", request.requestId);
  const approveSelector = attrEqualsSelector("data-request-approve", request.requestId);
  await assertVisible(browser, viewSelector, "session 접근 요청 승인 채널 입력");
  await setTextValue(browser, viewSelector, viewId, "session 접근 요청 승인 채널");
  await assertAccessRequestRow(browser, username, "대기", "session 접근 요청 pending row");
  await clickSelector(browser, approveSelector, "session 접근 요청 승인");
  await assertText(browser, "#request-status", "접근 요청 승인 완료", "session 접근 요청 승인 상태");
  await assertText(browser, "#request-invite-output", `계정: ${username}`, "session 접근 요청 승인 계정 출력");
  const token = await tokenFromOutput(browser, "#request-invite-output", "session 접근 요청 승인 token");
  await assertAccessRequestRow(browser, username, "승인됨", "session 접근 요청 approved row");
  return token;
}

async function rejectAccessRequestViaUi(browser, username) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  const request = await waitForStore("거절 대상 접근 요청", () => findStoreAccessRequest(username));
  const rejectSelector = attrEqualsSelector("data-request-reject", request.requestId);
  await assertVisible(browser, rejectSelector, "session 접근 요청 거절 버튼");
  await assertAccessRequestRow(browser, username, "대기", "session 접근 요청 reject pending row");
  await clickSelector(browser, rejectSelector, "session 접근 요청 거절 1차 확인");
  await assertText(browser, "#request-status", "요청 거절 확인", "session 접근 요청 거절 1차 상태");
  await clickSelector(browser, rejectSelector, "session 접근 요청 거절 실행");
  await assertText(browser, "#request-status", "접근 요청 거절 완료", "session 접근 요청 거절 상태");
  await assertAccessRequestRow(browser, username, "거절됨", "session 접근 요청 rejected row");
}

async function acceptInviteViaUi(browser, token, password) {
  await navigatePath(browser, `/invite/setup?token=${encodeURIComponent(token)}`);
  await waitForPath(browser, "/invite/setup");
  await assertVisible(browser, 'form[action="/invite/setup"]', "초대 설정 form");
  await assertFormValue(browser, 'form[action="/invite/setup"] [name="token"]', token, "초대 설정 token");
  await setTextValue(browser, 'form[action="/invite/setup"] [name="password"]', password, "초대 설정 비밀번호");
  await setTextValue(browser, 'form[action="/invite/setup"] [name="confirm"]', password, "초대 설정 비밀번호 확인");
  await clickSelector(browser, 'form[action="/invite/setup"] button[type="submit"]', "초대 설정 제출");
  await waitForPath(browser, "/login");
}

async function assertConsumedInviteRejected(browser, token, password) {
  await navigatePath(browser, `/invite/setup?token=${encodeURIComponent(token)}`);
  await waitForPath(browser, "/invite/setup");
  await setTextValue(browser, 'form[action="/invite/setup"] [name="password"]', password, "사용 완료 초대 비밀번호");
  await setTextValue(browser, 'form[action="/invite/setup"] [name="confirm"]', password, "사용 완료 초대 비밀번호 확인");
  await clickSelector(browser, 'form[action="/invite/setup"] button[type="submit"]', "사용 완료 초대 재사용 제출");
  await waitForPath(browser, "/invite/setup");
  await assertText(browser, "form.auth-form", "invalid invite token", "사용 완료 초대 재사용 거부");
}

async function assertViewerRuleScopeBoundaryViaUi(browser, description, scopeFixture) {
  const assignedViewId = String(scopeFixture.ruleViewId);
  const blockedViewId = String(scopeFixture.blockedViewId);
  const disallowedRuleId = String(scopeFixture.disallowedRuleId);
  await navigatePath(browser, "/client/live");
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await assertClientSourceTreeOnly(browser, assignedViewId, `${description} source tree`);
  await waitForResult(
    browser,
    `
      (() => {
        const text = String(document.body?.textContent || '');
        return {
          ok: !text.includes(${JSON.stringify(`view ${blockedViewId}`)}) &&
            !text.includes(${JSON.stringify(`viewId":"${blockedViewId}`)}),
          text: text.slice(0, 500),
        };
      })()
    `,
    item => item?.ok === true,
    `${description} UI unassigned copy boundary`,
  );
  await waitForResult(
    browser,
    `
      (async () => {
        const read = async (url, options = {}) => {
          const response = await fetch(url, {
            credentials: 'same-origin',
            cache: 'no-store',
            ...options,
            headers: {
              ...(options.headers || {})
            }
          });
          const text = await response.text();
          let payload = {};
          try { payload = text ? JSON.parse(text) : {}; } catch {}
          return { ok: response.ok, status: response.status, text, payload };
        };
        const list = await read('/client/api/views');
        const views = Array.isArray(list.payload?.views) ? list.payload.views : (Array.isArray(list.payload) ? list.payload : []);
        const assignedViewId = ${JSON.stringify(assignedViewId)};
        const blockedViewId = ${JSON.stringify(blockedViewId)};
        const disallowedRuleId = ${JSON.stringify(disallowedRuleId)};
        const assigned = views.find(view => String(view?.viewId || view?.id || '') === assignedViewId);
        const leakedViews = views.filter(view => String(view?.viewId || view?.id || '') !== assignedViewId).map(view => String(view?.viewId || view?.id || ''));
        const allowed = Array.isArray(assigned?.allowedRuleIds) ? assigned.allowedRuleIds.map(String) : [];
        const detail = await read('/client/api/views/' + encodeURIComponent(assignedViewId));
        const detailView = detail.payload?.view || detail.payload || {};
        const detailAllowed = Array.isArray(detailView.allowedRuleIds) ? detailView.allowedRuleIds.map(String) : [];
        const crossDashboard = await read('/client/api/views/' + encodeURIComponent(blockedViewId) + '/dashboard');
        const crossSession = await read('/client/api/views/' + encodeURIComponent(blockedViewId) + '/webrtc/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overlayMode: 'raw' })
        });
        const disallowedRuleSession = await read('/client/api/views/' + encodeURIComponent(assignedViewId) + '/webrtc/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overlayMode: 'va-rule', ruleId: disallowedRuleId })
        });
        return {
          ok: list.ok &&
            Boolean(assigned) &&
            leakedViews.length === 0 &&
            allowed.length > 0 &&
            detail.ok &&
            String(detailView.viewId || detailView.id || '') === assignedViewId &&
            detailAllowed.join(',') === allowed.join(',') &&
            !allowed.includes(disallowedRuleId) &&
            [403, 404].includes(crossDashboard.status) &&
            [403, 404].includes(crossSession.status) &&
            [400, 403, 404, 409].includes(disallowedRuleSession.status),
          listStatus: list.status,
          views: views.map(view => ({ viewId: view?.viewId || view?.id, allowedRuleIds: view?.allowedRuleIds || [] })),
          allowed,
          detailAllowed,
          leakedViews,
          disallowedRuleId,
          crossDashboard: crossDashboard.status,
          crossSession: crossSession.status,
          disallowedRuleSession: disallowedRuleSession.status,
        };
      })()
    `,
    item => item?.ok === true,
    `${description} client API boundary`,
  );
}

async function assertClientSourceTreeOnly(browser, expectedViewId, description) {
  await navigatePath(browser, "/client/live");
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await waitForResult(
    browser,
    `
      (() => {
        const nodes = Array.from(document.querySelectorAll('[data-testid="client-live-source-tree"] [data-source-view]'))
          .map(node => String(node.getAttribute('data-source-view') || node.dataset.sourceView || node.dataset.viewId || '').trim())
          .filter(Boolean);
        return {
          ok: nodes.length === 1 && nodes[0] === ${JSON.stringify(String(expectedViewId))},
          nodes,
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertLastAdminGuardViaUi(browser) {
  await navigatePath(browser, "/ops/users");
  await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
  const selector = `${attrEqualsSelector("data-user-set-enabled", "false")}${attrEqualsSelector("data-user-action-username", "admin")}`;
  await clickSelector(browser, selector, "마지막 admin 비활성화 1차 확인");
  await assertText(browser, "#status", "다시 누르면 실행합니다", "마지막 admin 비활성화 1차 상태");
  await clickSelector(browser, selector, "마지막 admin 비활성화 실행");
  await assertText(browser, "#status", "마지막 활성 admin", "마지막 admin 비활성화 거부 상태");
  await assertStoreUser("admin", user => user.enabled === true && user.role === "admin", "마지막 admin 유지");
}

async function assertClientLiveSessionCleanupViaUi(browser, context) {
  await assertReady(browser, "/client/live", '[data-testid="client-shell-page"]');
  await installClientLiveSessionSpy(browser);
  await assertVisible(browser, '[data-testid="client-live-source-tree"] [data-source-view]', "viewer live source node");
  await clickSelector(browser, '[data-testid="client-live-source-tree"] [data-source-view]', "viewer live source start");
  const firstSession = await waitForClientSessionRequest(browser, { method: "POST", sequence: 1 }, "viewer live first session POST");
  await assertClientLiveTilePlaying(browser, "viewer live first session UI");

  await clickSelector(browser, '.live-drop-tile[data-tile="0"] [data-action="stop"]', "viewer live tile disconnect");
  await waitForClientSessionRequest(browser, { method: "DELETE", sessionId: firstSession.sessionId }, "viewer live disconnect DELETE");
  await assertClientLiveTileDisconnected(browser, "viewer live disconnect UI");

  await clickSelector(browser, '[data-testid="client-live-source-tree"] [data-source-view]', "viewer live reconnect");
  const secondSession = await waitForClientSessionRequest(browser, { method: "POST", sequence: 2 }, "viewer live reconnect POST");
  if (secondSession.sessionId && firstSession.sessionId && secondSession.sessionId === firstSession.sessionId) {
    throw new Error(`viewer live reconnect reused session id: ${secondSession.sessionId}`);
  }
  await assertClientLiveTilePlaying(browser, "viewer live reconnect UI");

  await clickSelector(browser, 'form[action="/logout"] button[type="submit"]', "viewer logout with live session");
  await waitForPath(browser, "/login");
  await loginViaForm(browser, "admin", context.passwords.admin, "/ops/home");
  await assertClientRuntimeIdle(browser, "viewer logout live cleanup runtime");
}

async function installClientLiveSessionSpy(browser) {
  await browser.evaluate(`
    (() => {
      if (!window.__clientLiveSessionOriginalFetch) {
        window.__clientLiveSessionOriginalFetch = window.fetch;
      }
      window.__clientLiveSessionRequests = [];
      window.fetch = async function(input, init) {
        const method = String(init?.method || (input?.method) || 'GET').toUpperCase();
        const url = String(input?.url || input || '');
        const absolute = new URL(url, window.location.href);
        const isClientSession = absolute.pathname.includes('/client/api/views/') &&
          absolute.pathname.includes('/webrtc/session');
        const response = await window.__clientLiveSessionOriginalFetch.apply(this, arguments);
        if (isClientSession && (method === 'POST' || method === 'DELETE')) {
          const item = {
            method,
            path: absolute.pathname,
            ok: response.ok,
            status: response.status,
            sessionId: '',
          };
          if (method === 'POST') {
            try {
              const payload = await response.clone().json();
              item.sessionId = String(payload?.sessionId || '');
            } catch (_) {}
          } else {
            const match = absolute.pathname.match(new RegExp('/webrtc/session/([^/]+)$'));
            item.sessionId = match ? decodeURIComponent(match[1]) : '';
          }
          window.__clientLiveSessionRequests.push(item);
        }
        return response;
      };
      return true;
    })()
  `, 3000);
}

async function waitForClientSessionRequest(browser, expected, description) {
  return await waitForResult(
    browser,
    `
      (() => {
        const requests = Array.isArray(window.__clientLiveSessionRequests) ? window.__clientLiveSessionRequests : [];
        const method = ${JSON.stringify(expected.method)};
        const sessionId = ${JSON.stringify(expected.sessionId || "")};
        const matches = requests.filter(item =>
          item?.method === method &&
          item?.ok === true &&
          (method !== 'POST' || Boolean(item?.sessionId)) &&
          (!sessionId || item?.sessionId === sessionId)
        );
        const index = Math.max(0, Number(${JSON.stringify(expected.sequence || 1)}) - 1);
        const item = matches[index] || null;
        return {
          ok: Boolean(item?.sessionId || method === 'DELETE'),
          item,
          requests,
          sessionId: item?.sessionId || '',
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertClientLiveTilePlaying(browser, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const tile = document.querySelector('.live-drop-tile[data-tile="0"]');
        const status = String(tile?.querySelector('[data-role="status"]')?.textContent || '').trim();
        const connection = String(tile?.querySelector('[data-role="connection"]')?.textContent || '').trim();
        const action = tile?.querySelector('[data-action="toggle-playback"]');
        const label = String(action?.getAttribute('aria-label') || '');
        const placeholderHidden = tile?.querySelector('[data-role="placeholder"]')?.hidden === true;
        return {
          ok: Boolean(tile) && label.includes('정지') && placeholderHidden &&
            !['오프라인', '오류'].includes(status),
          status,
          connection,
          label,
          placeholderHidden,
          viewId: tile?.dataset?.viewId || '',
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertClientLiveTileDisconnected(browser, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const tile = document.querySelector('.live-drop-tile[data-tile="0"]');
        const status = String(tile?.querySelector('[data-role="status"]')?.textContent || '').trim();
        const connection = String(tile?.querySelector('[data-role="connection"]')?.textContent || '').trim();
        const action = tile?.querySelector('[data-action="toggle-playback"]');
        const label = String(action?.getAttribute('aria-label') || '');
        return {
          ok: Boolean(tile) &&
            !tile.dataset.viewId &&
            status === '오프라인' &&
            connection === '연결 끊김' &&
            label.includes('재생'),
          status,
          connection,
          label,
          viewId: tile?.dataset?.viewId || '',
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertClientRuntimeIdle(browser, description) {
  await waitForResult(
    browser,
    `
      (() => fetch('/lab/runtime/status', { credentials: 'same-origin', cache: 'no-store' })
        .then(response => response.json().then(payload => ({ ok: response.ok, payload })))
        .then(({ ok, payload }) => {
          const lifecycle = payload?.sourceLifecycle || {};
          return {
            ok: ok &&
              lifecycle.idle === true &&
              Number(lifecycle.activeSessions || 0) === 0 &&
              Number(lifecycle.httpEgressSessions || 0) === 0 &&
              Number(lifecycle.resourceActiveStreams || 0) === 0,
            statusOk: ok,
            lifecycle,
          };
        })
        .catch(error => ({ ok: false, error: String(error?.message || error) })))()
    `,
    item => item?.ok === true,
    description,
  );
}

async function loginViaForm(browser, username, password, expectedPath) {
  await navigatePath(browser, "/login");
  await waitForPath(browser, "/login");
  await setTextValue(browser, 'form[action="/login"] [name="username"]', username, `${username} 로그인 계정명`);
  await setTextValue(browser, 'form[action="/login"] [name="password"]', password, `${username} 로그인 비밀번호`);
  await clickSelector(browser, 'form[action="/login"] button[type="submit"]', `${username} 로그인 제출`);
  await waitForPath(browser, expectedPath);
}

async function assertLoginRejected(browser, username, password, description) {
  await logoutViaPost(browser).catch(() => null);
  await navigatePath(browser, "/login");
  await waitForPath(browser, "/login");
  await setTextValue(browser, 'form[action="/login"] [name="username"]', username, `${description} 계정명`);
  await setTextValue(browser, 'form[action="/login"] [name="password"]', password, `${description} 비밀번호`);
  await clickSelector(browser, 'form[action="/login"] button[type="submit"]', `${description} 로그인 제출`);
  await waitForPath(browser, "/login");
  await assertText(browser, "form.auth-form", "로그인 정보가 올바르지 않습니다", description);
}

async function logoutViaPost(browser) {
  await browser.evaluate(`
    (() => fetch('/logout', { method: 'POST', credentials: 'same-origin' }).then(() => true).catch(() => true))()
  `, 5000).catch(() => null);
  await navigatePath(browser, "/login");
  await waitForPath(browser, "/login");
}

async function changePasswordViaForm(browser, currentPassword, nextPassword) {
  await waitForPath(browser, "/password/change");
  await setTextValue(browser, 'form[action="/password/change"] [name="currentPassword"]', currentPassword, "비밀번호 변경 현재 비밀번호");
  await setTextValue(browser, 'form[action="/password/change"] [name="password"]', nextPassword, "비밀번호 변경 새 비밀번호");
  await setTextValue(browser, 'form[action="/password/change"] [name="confirm"]', nextPassword, "비밀번호 변경 새 비밀번호 확인");
  await clickSelector(browser, 'form[action="/password/change"] button[type="submit"]', "비밀번호 변경 제출");
  const outcome = await waitForResult(
    browser,
    `
      (() => {
        const pathname = window.location.pathname;
        const error = document.querySelector('.auth-form .message.error')?.textContent?.trim() || '';
        return {
          ok: document.readyState === 'complete' && pathname === '/login',
          failed: document.readyState === 'complete' && pathname === '/password/change' && Boolean(error),
          pathname,
          error,
        };
      })()
    `,
    result => result?.ok === true || result?.failed === true,
    "비밀번호 변경 결과",
  );
  if (outcome?.failed) {
    throw new Error(`비밀번호 변경 실패: ${outcome.error}`);
  }
}

async function assertWhoami(browser, expected, description) {
  await waitForResult(
    browser,
    `
      (() => fetch('/auth/whoami', { credentials: 'same-origin', cache: 'no-store' })
        .then(response => response.json().then(payload => ({ ok: response.ok, payload })))
        .then(({ ok, payload }) => ({
          ok: ok &&
            String(payload?.username || '') === ${JSON.stringify(expected.username)} &&
            String(payload?.role || '') === ${JSON.stringify(expected.role)},
          statusOk: ok,
          username: payload?.username || '',
          role: payload?.role || '',
          scopes: payload?.scopes || [],
        }))
        .catch(error => ({ ok: false, error: String(error?.message || error) })))()
    `,
    item => item?.ok === true,
    description,
  );
}

function readAuthUiPasswords() {
  const values = {
    admin: requireSecretEnv("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD"),
    userInitial: requireSecretEnv("MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD"),
    userReset: requireSecretEnv("MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD"),
    userChanged: requireSecretEnv("MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE"),
    inviteAccepted: requireSecretEnv("MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO"),
  };
  const distinct = new Set(Object.values(values));
  if (distinct.size !== Object.keys(values).length) {
    throw new Error("MEDIA_SERVER_VERIFY_AUTH_* values used by --auth-ui-flow must be distinct");
  }
  return {
    ...values,
    wrongOne: values.userChanged,
    wrongTwo: values.inviteAccepted,
  };
}

function requireSecretEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for --auth-ui-flow`);
  }
  return value;
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function clearAuthStoreForFreshSetup(snapshot) {
  const filePath = snapshot.filePath;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function authUiScopeFixture(browser) {
  const views = await readPublishedViewsForAuthUi(browser);
  if (views.length < 2) {
    throw new Error(`--auth-ui-flow requires at least two enabled PublishedView entries, found ${views.length}`);
  }
  const ids = views.map(viewIdOf).filter(Boolean);
  const ruleView = views.find(view => Array.isArray(view.allowedRuleIds) && view.allowedRuleIds.length > 0) || views[0];
  const ruleViewId = viewIdOf(ruleView);
  const blockedView = views.find(view => viewIdOf(view) && viewIdOf(view) !== ruleViewId) || views[1];
  const blockedViewId = viewIdOf(blockedView);
  const disallowedRuleId = views
    .flatMap(view => Array.isArray(view.allowedRuleIds) ? view.allowedRuleIds.map(String) : [])
    .find(ruleId => !new Set((ruleView.allowedRuleIds || []).map(String)).has(ruleId)) || "999999";
  return {
    initialViewId: ids[0],
    updatedViewId: ids.find(id => id !== ids[0]) || ids[0],
    ruleViewId,
    blockedViewId,
    disallowedRuleId,
  };
}

async function readPublishedViewsForAuthUi(browser) {
  const apiViews = await browser.evaluate(`
    (async () => {
      const response = await fetch('/ops/api/views', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload?.views) ? payload.views : (Array.isArray(payload) ? payload : []);
    })()
  `, 5000).catch(() => []);
  if (Array.isArray(apiViews) && apiViews.length > 0) {
    return apiViews.filter(view => view?.enabled !== false);
  }
  const filePath = resolvePublishedViewsPath();
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
  const fileViews = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.views) ? parsed.views : []);
  return fileViews.filter(view => view?.enabled !== false);
}

function resolvePublishedViewsPath() {
  const raw = process.env.MEDIA_SERVER_PUBLISHED_VIEWS || ".media_server.views.json";
  return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(rootDir, raw);
}

function viewIdOf(view) {
  return String(view?.viewId || view?.id || "").trim();
}

function viewerScopes(viewId) {
  return [
    `view:read:${viewId}`,
    `dashboard:read:${viewId}`,
    `event:read:${viewId}`,
    `metadata:read:${viewId}`,
  ];
}

function readAuthStore() {
  const filePath = resolveAuthStorePath();
  if (!fs.existsSync(filePath)) return { users: [], invites: [], accessRequests: [] };
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    accessRequests: Array.isArray(parsed.accessRequests) ? parsed.accessRequests : [],
  };
}

function findStoreUser(username) {
  return readAuthStore().users.find(user => String(user?.username || "") === String(username || "")) || null;
}

function findStoreInvite(username) {
  return readAuthStore().invites.find(invite => String(invite?.username || "") === String(username || "")) || null;
}

function findStoreAccessRequest(username) {
  return readAuthStore().accessRequests.find(request => String(request?.username || "") === String(username || "")) || null;
}

function hasScope(user, scope) {
  return Array.isArray(user?.scopes) && user.scopes.includes(scope);
}

async function assertStoreUser(username, predicate, description) {
  await waitForStore(description, () => {
    const user = findStoreUser(username);
    return user && predicate(user) ? user : null;
  });
}

async function assertStoreNoUser(username, description) {
  await waitForStore(description, () => findStoreUser(username) ? null : { ok: true });
}

async function assertStoreNoInvite(username, description) {
  await waitForStore(description, () => findStoreInvite(username) ? null : { ok: true });
}

async function assertStoreAccessRequest(username, predicate, description) {
  await waitForStore(description, () => {
    const request = findStoreAccessRequest(username);
    return request && predicate(request) ? request : null;
  });
}

async function waitForStore(description, lookup) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = lookup();
    if (last) return last;
    await delay(100);
  }
  throw new Error(`${description} store 확인 실패: ${JSON.stringify(last)}`);
}

async function assertClientPreviewAdminAffordance(browser, label) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const body = document.body;
        const shortcut = document.querySelector('.account-shortcut[href="/ops/home"]');
        const previewCopy = document.querySelector('.brand-copy span');
        const accountName = document.querySelector('.account-menu .account-name');
        const accountMeta = document.querySelector('.account-menu .account-meta');
        const navLinks = Array.from(document.querySelectorAll('.client-image-nav-tabs a'))
          .map(link => ({
            href: link.getAttribute('href') || '',
            text: (link.textContent || '').trim(),
          }));
        const issues = [];
        if (body?.dataset?.clientPreview !== 'true') issues.push('missing client preview flag');
        const previewText = previewCopy?.textContent || '';
        const shortcutText = shortcut?.textContent || '';
        if (!previewCopy || !(/Client Preview as admin|관리자 클라이언트 미리보기/.test(previewText))) {
          issues.push('missing admin preview copy');
        }
        if (!shortcut || !(/Ops|운영/.test(shortcutText))) issues.push('missing Ops shortcut');
        if (!accountName || !(accountName.textContent || '').trim()) issues.push('missing account name');
        if (!accountMeta || !(accountMeta.textContent || '').includes('admin')) issues.push('missing admin role');
        if (!navLinks.some(link => link.href === '/client/live')) issues.push('missing client live nav');
        if (!navLinks.some(link => link.href === '/client/dashboard')) issues.push('missing client dashboard nav');
        if (navLinks.some(link => link.href.startsWith('/ops/'))) issues.push('ops nav leaked into client primary nav');
        return {
          ok: issues.length === 0,
          issues,
          previewCopy: (previewCopy?.textContent || '').trim(),
          shortcutText: (shortcut?.textContent || '').trim(),
          accountName: (accountName?.textContent || '').trim(),
          accountMeta: (accountMeta?.textContent || '').trim(),
          navLinks,
        };
      })()
    `,
    item => item?.ok === true,
    label,
  );
  return result;
}

async function assertAccessRequestApprovalFlow(browser, context) {
  const fixture = await createAccessRequestFixture(context);
  try {
    await navigatePath(browser, "/ops/users");
    await installErrorCollector(browser);
    await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
    await installAccessRequestApprovalSpy(browser, fixture.requestId);
    const viewSelector = attrEqualsSelector("data-request-approve-view", fixture.requestId);
    const approveSelector = attrEqualsSelector("data-request-approve", fixture.requestId);
    await assertVisible(browser, viewSelector, "접근 요청 승인 채널 ID 입력");
    await assertFormValue(browser, viewSelector, fixture.initialViewId, "접근 요청 승인 채널 ID 기본값");
    await setTextValue(browser, viewSelector, fixture.approvalViewId, "접근 요청 승인 채널 ID 변경");
    await assertAccessRequestRow(browser, fixture.username, "대기", "접근 요청 pending row");
    await clickSelector(browser, approveSelector, "접근 요청 승인");
    await assertText(browser, "#request-status", "접근 요청 승인 완료", "접근 요청 승인 상태");
    await assertText(browser, "#request-invite-output", `계정: ${fixture.username}`, "접근 요청 승인 계정 출력");
    await assertText(browser, "#request-invite-output", "초대 링크:", "접근 요청 승인 invite 링크 출력");
    await assertText(browser, "#request-invite-output", "초대 링크 만료:", "접근 요청 승인 invite 만료 출력");
    await assertText(browser, "#request-invite-output", "초대 설정 완료 전까지는 로그인/세션/채널 권한이 열리지 않습니다.", "접근 요청 승인 전 권한 안내");
    await assertApproveRequestPayload(browser, fixture.requestId, fixture.approvalViewId);
    await assertAccessRequestRow(browser, fixture.username, "승인됨", "접근 요청 approved row");
    await assertNoOverflow(browser, `${context.label}:users-access-request-approve`);
  } finally {
    await restoreAccessRequestApprovalSpy(browser);
    await restoreAuthStoreSnapshot(fixture.snapshot);
    await assertAccessRequestFixtureCleaned(fixture);
  }
}

async function assertAccessRequestRejectFlow(browser, context) {
  const fixture = await createAccessRequestFixture(context);
  try {
    await navigatePath(browser, "/ops/users");
    await installErrorCollector(browser);
    await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
    await installAccessRequestRejectSpy(browser, fixture.requestId);
    const rejectSelector = attrEqualsSelector("data-request-reject", fixture.requestId);
    await assertVisible(browser, rejectSelector, "접근 요청 거절 버튼");
    await assertAccessRequestRow(browser, fixture.username, "대기", "접근 요청 pending row");
    await clickSelector(browser, rejectSelector, "접근 요청 거절");
    await assertText(browser, "#request-status", "요청 거절 확인", "접근 요청 거절 1차 확인 상태");
    await assertRejectRequestNotPosted(browser, fixture.requestId);
    await clickSelector(browser, rejectSelector, "접근 요청 거절 확인");
    await assertText(browser, "#request-status", "접근 요청 거절 완료", "접근 요청 거절 상태");
    await assertAccessRequestRow(browser, fixture.username, "거절됨", "접근 요청 rejected row");
    await assertRejectRequestPosted(browser, fixture.requestId);
    await assertRejectedRequestDidNotCreateUser(browser, fixture.username);
    await assertNoOverflow(browser, `${context.label}:users-access-request-reject`);
  } finally {
    await restoreAccessRequestRejectSpy(browser);
    await restoreAuthStoreSnapshot(fixture.snapshot);
    await assertAccessRequestFixtureCleaned(fixture);
  }
}

async function assertUserLifecycleFlow(browser, context) {
  const snapshot = snapshotAuthStore();
  const suffix = `${process.pid}-${String(context?.width || "w")}-${Date.now()}`;
  const username = `click-user-${suffix}`.slice(0, 64);
  const initialPassword = "UiAuthFlow9!Beta";
  const resetPassword = "UiResetFlow9!Beta";
  try {
    ensureAuthStoreExists(snapshot);
    await requestJson("/ops/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        displayName: "Click User",
        role: "viewer",
        viewId: "1",
        password: initialPassword,
        enabled: true,
        mustChangePassword: false,
      }),
    });
    await navigatePath(browser, "/ops/users");
    await installErrorCollector(browser);
    await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
    await assertUserRowText(browser, username, "활성", "사용자 lifecycle fixture active row");

    await clickSelector(browser, attrEqualsSelector("data-user-view", username), "사용자 lifecycle 상세");
    await assertVisible(browser, "#user-detail-panel", "사용자 lifecycle 상세 패널");
    await clickSelector(browser, "#user-edit-selected", "사용자 lifecycle 수정");
    await setTextValue(browser, '#user-form [name="displayName"]', "Click User Updated", "사용자 표시 이름 수정");
    await setSelectValue(browser, '#user-form [name="role"]', "operator", "사용자 role 수정");
    await clickSelector(browser, "#user-save-selected", "사용자 저장");
    await assertText(browser, "#status", "사용자 저장 완료", "사용자 수정 저장 상태");
    await assertUserRowText(browser, username, "Click User Updated", "사용자 수정 row 반영");
    await assertUserRowText(browser, username, "운영자", "사용자 role row 반영");

    await clickSelector(browser, attrEqualsSelector("data-user-reset-password", username), "사용자 비밀번호 초기화 패널");
    await assertVisible(browser, "#user-reset-password-panel", "사용자 비밀번호 초기화 패널 표시");
    await setTextValue(browser, "#user-reset-password", resetPassword, "사용자 임시 비밀번호");
    await setTextValue(browser, "#user-reset-password-confirm", resetPassword, "사용자 임시 비밀번호 확인");
    await clickSelector(browser, "#user-reset-password-button", "사용자 비밀번호 초기화");
    await assertText(browser, "#user-reset-password-status", "비밀번호 초기화 완료", "사용자 비밀번호 초기화 상태");
    await assertText(browser, "#status", "비밀번호 초기화 완료", "사용자 비밀번호 초기화 전체 상태");
    await assertUserRowText(browser, username, "예", "사용자 must-change row 반영");

    const disableSelector = `${attrEqualsSelector("data-user-set-enabled", "false")}${attrEqualsSelector("data-user-action-username", username)}`;
    await clickSelector(browser, disableSelector, "사용자 비활성화 1차 확인");
    await assertText(browser, "#status", "로그인 비활성화와 기존 세션 회수 확인", "사용자 비활성화 1차 확인 상태");
    await assertUserRowText(browser, username, "활성", "사용자 비활성화 1차 확인 전 row 유지");
    await clickSelector(browser, disableSelector, "사용자 비활성화 실행");
    await assertText(browser, "#status", "비활성화 완료", "사용자 비활성화 상태");
    await assertUserRowText(browser, username, "비활성", "사용자 비활성화 row 반영");

    const restoreSelector = `${attrEqualsSelector("data-user-set-enabled", "true")}${attrEqualsSelector("data-user-action-username", username)}`;
    await clickSelector(browser, restoreSelector, "사용자 복구 실행");
    await assertText(browser, "#status", "복구 완료", "사용자 복구 상태");
    await assertUserRowText(browser, username, "활성", "사용자 복구 row 반영");
    await assertNoOverflow(browser, `${context.label}:users-lifecycle`);
  } finally {
    await restoreAuthStoreSnapshot(snapshot);
    await assertUserFixtureCleaned(username);
  }
}

async function assertInviteCreateFlow(browser, context) {
  const snapshot = snapshotAuthStore();
  const suffix = `${process.pid}-${String(context?.width || "w")}-${Date.now()}`;
  const username = `click-invite-${suffix}`.slice(0, 64);
  try {
    ensureAuthStoreExists(snapshot);
    await navigatePath(browser, "/ops/users");
    await installErrorCollector(browser);
    await assertReady(browser, "/ops/users", '[data-testid="ops-users-page"]');
    await setTextValue(browser, '#invite-create-form [name="username"]', username, "초대 계정명");
    await setTextValue(browser, '#invite-create-form [name="displayName"]', "Click Invite", "초대 표시 이름");
    await setSelectValue(browser, '#invite-create-form [name="role"]', "viewer", "초대 권한");
    await setTextValue(browser, '#invite-create-form [name="viewId"]', "1", "초대 채널 ID");
    await setTextValue(browser, '#invite-create-form [name="ttlSeconds"]', "3600", "초대 만료 시간");
    await submitForm(browser, "#invite-create-form", "초대 발급");
    await assertText(browser, "#invite-status", "초대 발급 완료", "초대 발급 상태");
    await assertText(browser, "#invite-create-output", `계정: ${username}`, "초대 발급 계정 출력");
    await assertText(browser, "#invite-create-output", "초대 링크:", "초대 설정 링크 출력");
    await assertText(browser, "#invite-create-output", "토큰:", "초대 token one-time 출력");
    await assertText(browser, "#invite-create-output", "토큰/토큰 해시를 저장하거나 다시 표시하지 않습니다.", "초대 redaction 안내");
    const oneTimeToken = await inviteOutputToken(browser);
    await assertInviteListRow(browser, username, "대기", "초대 목록 row");
    await assertInviteListRedaction(browser, username, oneTimeToken);
    await assertNoOverflow(browser, `${context.label}:users-invite-create`);
  } finally {
    await restoreAuthStoreSnapshot(snapshot);
    await assertInviteFixtureCleaned(username);
  }
}

async function createAccessRequestFixture(context) {
  const snapshot = snapshotAuthStore();
  const suffix = `${process.pid}-${String(context?.width || "w")}-${Date.now()}`;
  const username = `click-request-${suffix}`.slice(0, 64);
  const requestId = `req-click-${suffix}`.slice(0, 64);
  const payload = {
    username,
    displayName: "Click Request",
    contact: `${username}@example.test`,
    viewId: "1",
    reason: "ops click e2e access request fixture",
  };
  try {
    writeAccessRequestFixture(snapshot, { ...payload, requestId });
    return {
      snapshot,
      username,
      requestId,
      initialViewId: payload.viewId,
      approvalViewId: "2",
    };
  } catch (error) {
    await restoreAuthStoreSnapshot(snapshot);
    throw error;
  }
}

function writeAccessRequestFixture(snapshot, fixture) {
  const filePath = snapshot.filePath;
  let store = {};
  if (snapshot.existed) {
    store = JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
  }
  if (!Array.isArray(store.users)) store.users = [];
  if (!Array.isArray(store.invites)) store.invites = [];
  if (!Array.isArray(store.accessRequests)) store.accessRequests = [];
  if (store.accessRequests.some(item => String(item?.requestId || "") === fixture.requestId)) {
    throw new Error(`duplicate access request fixture id: ${fixture.requestId}`);
  }
  store.accessRequests.push({
    requestId: fixture.requestId,
    username: fixture.username,
    displayName: fixture.displayName,
    contact: fixture.contact,
    reason: fixture.reason,
    viewId: fixture.viewId,
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: "",
    decidedBy: "",
    inviteId: "",
  });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, { mode: snapshot.mode || 0o600 });
  fs.chmodSync(filePath, snapshot.mode || 0o600);
}

function ensureAuthStoreExists(snapshot) {
  if (snapshot?.existed) return;
  const filePath = snapshot.filePath;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ users: [], invites: [], accessRequests: [] }, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function snapshotAuthStore() {
  const filePath = resolveAuthStorePath();
  if (!fs.existsSync(filePath)) {
    return { filePath, existed: false, content: "", mode: 0o600 };
  }
  const stat = fs.statSync(filePath);
  return {
    filePath,
    existed: true,
    content: fs.readFileSync(filePath),
    mode: stat.mode & 0o777,
  };
}

async function restoreAuthStoreSnapshot(snapshot) {
  if (!snapshot?.filePath) return;
  if (snapshot.existed) {
    fs.writeFileSync(snapshot.filePath, snapshot.content);
    fs.chmodSync(snapshot.filePath, snapshot.mode || 0o600);
    return;
  }
  if (fs.existsSync(snapshot.filePath)) {
    fs.unlinkSync(snapshot.filePath);
  }
}

function resolveAuthStorePath() {
  const raw = authUsersFile;
  return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(rootDir, raw);
}

async function assertAccessRequestFixtureCleaned(fixture) {
  const result = await requestJson("/ops/api/access-requests");
  const requests = Array.isArray(result.accessRequests) ? result.accessRequests : [];
  const leaked = requests.find(request =>
    String(request?.requestId || "") === fixture.requestId ||
    String(request?.username || "") === fixture.username
  );
  if (leaked) {
    throw new Error(`access request fixture cleanup failed: ${JSON.stringify({
      authUsersFile: resolveAuthStorePath(),
      requestId: fixture.requestId,
      username: fixture.username,
      status: leaked.status || "",
    })}`);
  }
}

async function assertUserFixtureCleaned(username) {
  const result = await requestJson("/ops/api/users").catch(error => ({ error: error.message, users: [] }));
  const users = Array.isArray(result.users) ? result.users : [];
  const leaked = users.find(user => String(user?.username || "") === username);
  if (leaked) {
    throw new Error(`user lifecycle fixture cleanup failed: ${username}`);
  }
}

async function assertInviteFixtureCleaned(username) {
  const result = await requestJson("/ops/api/invites").catch(error => ({ error: error.message, invites: [] }));
  const invites = Array.isArray(result.invites) ? result.invites : [];
  const leaked = invites.find(invite => String(invite?.username || "") === username);
  if (leaked) {
    throw new Error(`invite fixture cleanup failed: ${username}`);
  }
}

async function installAccessRequestApprovalSpy(browser, requestId) {
  await browser.evaluate(`
    (() => {
      const requestId = ${JSON.stringify(requestId)};
      if (!window.__opsClickOriginalFetch) {
        window.__opsClickOriginalFetch = window.fetch.bind(window);
      }
      window.__opsClickApprovalBody = null;
      window.__opsClickApprovalResponse = null;
      window.__opsClickAuditPosts = [];
      window.fetch = async (input, init = {}) => {
        const url = String(typeof input === 'string' ? input : input?.url || '');
        const method = String(init?.method || input?.method || 'GET').toUpperCase();
        if (method === 'POST' && url.includes('/ops/api/audit')) {
          window.__opsClickAuditPosts.push(String(init?.body || ''));
          return new Response(JSON.stringify({ status: 'ops-audit', persistent: false, entry: {} }), {
            status: 201,
            statusText: 'Created',
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const response = await window.__opsClickOriginalFetch(input, init);
        if (method === 'POST' && url.includes('/ops/api/access-requests/' + encodeURIComponent(requestId) + '/approve')) {
          window.__opsClickApprovalBody = String(init?.body || '');
          response.clone().json()
            .then(payload => { window.__opsClickApprovalResponse = payload; })
            .catch(error => { window.__opsClickApprovalResponse = { error: String(error?.message || error) }; });
        }
        return response;
      };
      return true;
    })()
  `, 3000);
}

async function restoreAccessRequestApprovalSpy(browser) {
  await browser.evaluate(`
    (() => {
      if (window.__opsClickOriginalFetch) {
        window.fetch = window.__opsClickOriginalFetch;
        window.__opsClickOriginalFetch = null;
      }
      return true;
    })()
  `, 3000).catch(() => null);
}

async function installAccessRequestRejectSpy(browser, requestId) {
  await browser.evaluate(`
    (() => {
      const requestId = ${JSON.stringify(requestId)};
      if (!window.__opsClickOriginalFetch) {
        window.__opsClickOriginalFetch = window.fetch.bind(window);
      }
      window.__opsClickRejectCalled = false;
      window.__opsClickRejectResponse = null;
      window.__opsClickAuditPosts = [];
      window.fetch = async (input, init = {}) => {
        const url = String(typeof input === 'string' ? input : input?.url || '');
        const method = String(init?.method || input?.method || 'GET').toUpperCase();
        if (method === 'POST' && url.includes('/ops/api/audit')) {
          window.__opsClickAuditPosts.push(String(init?.body || ''));
          return new Response(JSON.stringify({ status: 'ops-audit', persistent: false, entry: {} }), {
            status: 201,
            statusText: 'Created',
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const response = await window.__opsClickOriginalFetch(input, init);
        if (method === 'POST' && url.includes('/ops/api/access-requests/' + encodeURIComponent(requestId) + '/reject')) {
          window.__opsClickRejectCalled = true;
          response.clone().json()
            .then(payload => { window.__opsClickRejectResponse = payload; })
            .catch(error => { window.__opsClickRejectResponse = { error: String(error?.message || error) }; });
        }
        return response;
      };
      return true;
    })()
  `, 3000);
}

async function restoreAccessRequestRejectSpy(browser) {
  await browser.evaluate(`
    (() => {
      if (window.__opsClickOriginalFetch) {
        window.fetch = window.__opsClickOriginalFetch;
        window.__opsClickOriginalFetch = null;
      }
      return true;
    })()
  `, 3000).catch(() => null);
}

async function assertApproveRequestPayload(browser, requestId, expectedViewId) {
  await waitForResult(
    browser,
    `
      (() => {
        let body = {};
        try {
          body = JSON.parse(String(window.__opsClickApprovalBody || '{}'));
        } catch (error) {
          return { ok: false, reason: 'invalid body', error: String(error?.message || error), raw: window.__opsClickApprovalBody || '' };
        }
        const response = window.__opsClickApprovalResponse || {};
        return {
          ok: body.viewId === ${JSON.stringify(expectedViewId)} &&
            response.status === 'approved' &&
            response.invite &&
            String(response.invite.setupUrl || '').includes('/invite/setup'),
          requestId: ${JSON.stringify(requestId)},
          body,
          responseStatus: response.status || '',
          setupUrl: response.invite?.setupUrl || '',
        };
      })()
    `,
    item => item?.ok === true,
    "접근 요청 승인 POST payload",
  );
}

async function assertRejectRequestNotPosted(browser, requestId) {
  await waitForResult(
    browser,
    `
      (() => {
        return {
          ok: window.__opsClickRejectCalled !== true,
          requestId: ${JSON.stringify(requestId)},
          called: window.__opsClickRejectCalled === true,
        };
      })()
    `,
    item => item?.ok === true,
    "접근 요청 거절 1차 확인 전 POST 미발생",
  );
}

async function assertRejectRequestPosted(browser, requestId) {
  await waitForResult(
    browser,
    `
      (() => {
        const response = window.__opsClickRejectResponse || {};
        return {
          ok: window.__opsClickRejectCalled === true && response.status === 'rejected',
          requestId: ${JSON.stringify(requestId)},
          called: window.__opsClickRejectCalled === true,
          responseStatus: response.status || '',
        };
      })()
    `,
    item => item?.ok === true,
    "접근 요청 거절 POST",
  );
}

async function assertRejectedRequestDidNotCreateUser(browser, username) {
  await waitForResult(
    browser,
    `
      (() => {
        const username = ${JSON.stringify(username)};
        const row = Array.from(document.querySelectorAll('#users-body tr'))
          .find(candidate => String(candidate.textContent || '').includes(username));
        return {
          ok: !row,
          rowText: String(row?.textContent || '').replace(/\\s+/g, ' ').trim(),
        };
      })()
    `,
    item => item?.ok === true,
    "접근 요청 거절 후 user row 미생성",
  );
}

async function assertAccessRequestRow(browser, username, expectedStatus, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const username = ${JSON.stringify(username)};
        const expectedStatus = ${JSON.stringify(expectedStatus)};
        const row = Array.from(document.querySelectorAll('#access-requests-body tr'))
          .find(candidate => String(candidate.textContent || '').includes(username));
        const text = String(row?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          ok: Boolean(row) && text.includes(expectedStatus),
          text,
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertUserRowText(browser, username, expectedText, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const username = ${JSON.stringify(username)};
        const expectedText = ${JSON.stringify(expectedText)};
        const row = Array.from(document.querySelectorAll('#users-body tr'))
          .find(candidate => String(candidate.textContent || '').includes(username));
        const text = String(row?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          ok: Boolean(row) && text.includes(expectedText),
          text,
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function inviteOutputToken(browser) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const text = String(document.querySelector('#invite-create-output')?.textContent || '');
        const match = text.match(/토큰:\\s*([^\\s]+)/);
        return {
          ok: Boolean(match && match[1]),
          token: match?.[1] || '',
          text,
        };
      })()
    `,
    item => item?.ok === true,
    "초대 one-time token 추출",
  );
  return String(result.token || "");
}

async function tokenFromOutput(browser, selector, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const text = String(document.querySelector(${JSON.stringify(selector)})?.textContent || '');
        const match = text.match(/토큰:\\s*([^\\s]+)/);
        return {
          ok: Boolean(match && match[1]),
          token: match?.[1] || '',
          text,
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return String(result.token || "");
}

async function assertInviteListRow(browser, username, expectedStatus, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const username = ${JSON.stringify(username)};
        const expectedStatus = ${JSON.stringify(expectedStatus)};
        const row = Array.from(document.querySelectorAll('#invite-list-body tr'))
          .find(candidate => String(candidate.textContent || '').includes(username));
        const text = String(row?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          ok: Boolean(row) && text.includes(expectedStatus),
          text,
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertInviteListRedaction(browser, username, token) {
  await waitForResult(
    browser,
    `
      (() => {
        const username = ${JSON.stringify(username)};
        const token = ${JSON.stringify(token)};
        const row = Array.from(document.querySelectorAll('#invite-list-body tr'))
          .find(candidate => String(candidate.textContent || '').includes(username));
        const text = String(row?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          ok: Boolean(row) && !text.includes(token) && !/tokenHash|토큰:\\s*\\S+/.test(text),
          text,
        };
      })()
    `,
    item => item?.ok === true,
    "초대 목록 token/tokenHash 비노출",
  );
}

function attrEqualsSelector(attribute, value) {
  return `[${attribute}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

async function clickSelector(browser, selector, description) {
  await waitForResult(
    browser,
    buildElementCenterExpression(selector),
    result => result?.ok === true,
    `${description} 클릭 대상`,
  );
  await waitForScrollIdle(browser);
  const target = await waitForResult(
    browser,
    buildElementCenterExpression(selector, { scroll: false }),
    result => result?.ok === true,
    `${description} 클릭 좌표`,
  );
  const hit = await browser.evaluate(`
    (() => {
      const selector = ${JSON.stringify(selector)};
      const x = ${JSON.stringify(target.x)};
      const y = ${JSON.stringify(target.y)};
      const expected = Array.from(document.querySelectorAll(selector));
      const actual = document.elementFromPoint(x, y);
      return { ok: expected.some(node => node === actual || node.contains(actual)), actual: actual?.outerHTML?.slice(0, 120) || '' };
    })()
  `, 3000).catch(error => ({ ok: false, actual: error.message }));
  if (!hit?.ok) {
    await browser.evaluate(`
      (() => {
        const selector = ${JSON.stringify(selector)};
        const visible = (node) => {
          if (!node || node.hidden) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const node = Array.from(document.querySelectorAll(selector)).find(visible);
        if (!node) throw new Error('missing visible element for click fallback: ' + selector);
        node.click();
        return true;
      })()
    `, 5000);
    await delay(180);
    return;
  }
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: target.x,
    y: target.y,
    button: "none",
  });
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: target.x,
    y: target.y,
    button: "left",
    clickCount: 1,
  });
  await browser.cdp("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: target.x,
    y: target.y,
    button: "left",
    clickCount: 1,
  });
  await delay(180);
}

async function submitForm(browser, selector, description) {
  const result = await browser.evaluate(`
    (() => {
      const form = document.querySelector(${JSON.stringify(selector)});
      if (!form) return { ok: false, message: 'missing form' };
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
      return { ok: true };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} form submit 실패: ${JSON.stringify(result)}`);
  }
  await delay(180);
}

function buildElementCenterExpression(selector, options = {}) {
  const shouldScroll = options.scroll !== false;
  return `
    (() => {
      const selector = ${JSON.stringify(selector)};
      const shouldScroll = ${JSON.stringify(shouldScroll)};
      const visible = (node) => {
        if (!node || node.hidden) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const matches = Array.from(document.querySelectorAll(selector));
      const node = matches.find(visible) || matches[0];
      if (!node) return { ok: false, message: 'missing element', selector, pathname: window.location.pathname };
      if (shouldScroll) {
        node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      }
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const isVisible = visible(node);
      return {
        ok: isVisible,
        selector,
        pathname: window.location.pathname,
        matchCount: matches.length,
        display: style.display,
        visibility: style.visibility,
        text: (node.textContent || '').trim().slice(0, 80),
        x: Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2)),
      };
    })()
  `;
}

async function waitForScrollIdle(browser) {
  let previous = null;
  for (let index = 0; index < 12; index += 1) {
    const current = await browser.evaluate(`
      (() => ({ x: window.scrollX, y: window.scrollY }))()
    `, 2000).catch(() => null);
    if (current && previous && current.x === previous.x && current.y === previous.y) {
      return;
    }
    previous = current;
    await delay(80);
  }
}

async function assertReady(browser, path, selector) {
  await waitForPath(browser, path);
  await assertVisible(browser, selector, `${path} root`);
}

async function navigatePath(browser, pathValue) {
  const url = new URL(pathValue, `${httpBase}/`).toString();
  await browser.cdp("Page.navigate", { url });
  await waitForPath(browser, new URL(url).pathname);
}

async function navigatePathExpect(browser, pathValue, expectedPath) {
  const url = new URL(pathValue, `${httpBase}/`).toString();
  await browser.cdp("Page.navigate", { url });
  await waitForPath(browser, expectedPath);
}

async function assertEnabled(browser, selector, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: false, message: 'missing element' };
        return { ok: node.disabled !== true, disabled: node.disabled === true };
      })()
    `,
    result => result?.ok === true,
    `${description} enabled`,
  );
}

async function waitForPath(browser, path) {
  await waitForResult(
    browser,
    `
      (() => ({
        ok: document.readyState === 'complete' && window.location.pathname === ${JSON.stringify(path)},
        readyState: document.readyState,
        pathname: window.location.pathname
      }))()
    `,
    result => result?.ok === true,
    `path ${path}`,
  );
}

async function setSelectValue(browser, selector, value, description) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing select' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, value: node.value };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 선택 실패: ${JSON.stringify(result)}`);
  }
}

async function setTextValue(browser, selector, value, description) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing text input' };
      node.value = ${JSON.stringify(value)};
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.value === ${JSON.stringify(value)}, length: node.value.length };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 입력 실패: ${JSON.stringify(result)}`);
  }
}

async function setCheckboxValue(browser, selector, checked, description) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return { ok: false, message: 'missing checkbox' };
      node.checked = ${JSON.stringify(Boolean(checked))};
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: node.checked === ${JSON.stringify(Boolean(checked))}, checked: node.checked };
    })()
  `, 3000);
  if (!result?.ok) {
    throw new Error(`${description} 체크 상태 변경 실패: ${JSON.stringify(result)}`);
  }
}

async function assertVisible(browser, selector, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: false, reason: 'missing' };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          ok: !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          hidden: node.hidden,
          display: style.display,
          visibility: style.visibility,
          width: rect.width,
          height: rect.height
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertHidden(browser, selector, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return { ok: true, reason: 'missing' };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          ok: node.hidden || style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0,
          hidden: node.hidden,
          display: style.display,
          visibility: style.visibility,
          width: rect.width,
          height: rect.height
        };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function isElementVisible(browser, selector) {
  const result = await browser.evaluate(`
    (() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    })()
  `, 3000).catch(() => false);
  return Boolean(result);
}

async function assertText(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const text = (node?.textContent || '').trim();
        return { ok: text.includes(${JSON.stringify(expected)}), text };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertTextNotEqual(browser, selector, forbidden, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const text = (node?.textContent || '').trim();
        return { ok: Boolean(node) && text !== ${JSON.stringify(forbidden)} && text.length > 0, text };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertFormValue(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.value || '');
        return { ok: value === ${JSON.stringify(expected)}, value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function readFormValue(browser, selector, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.value || '').trim();
        return { ok: Boolean(value), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result.value;
}

async function assertFormValueContains(browser, selector, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.value || '');
        return { ok: value.includes(${JSON.stringify(expected)}), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertTableContains(browser, selector, expected, description) {
  await waitForResult(
    browser,
    `
      (() => {
        const text = String(document.querySelector(${JSON.stringify(selector)})?.textContent || '').replace(/\\s+/g, ' ').trim();
        return { ok: text.includes(${JSON.stringify(expected)}), text: text.slice(0, 500) };
      })()
    `,
    item => item?.ok === true,
    description,
  );
}

async function assertAttributeContains(browser, selector, attribute, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const value = String(node?.getAttribute(${JSON.stringify(attribute)}) || '');
        return { ok: value.includes(${JSON.stringify(expected)}), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function incidentShareUrl(browser, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const node = document.querySelector('#dashIncidentTimelineShare');
        const value = String(node?.getAttribute('data-incident-share-url') || '');
        return { ok: value.includes('/ops/dashboard#') && value.includes('incidentSource=event-record'), value };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result.value;
}

function assertUrlContains(value, expected, description) {
  if (!String(value || "").includes(expected)) {
    throw new Error(`${description}: ${JSON.stringify(value)} does not include ${JSON.stringify(expected)}`);
  }
}

async function installClipboardFailureStub(browser) {
  await browser.evaluate(`
    (() => {
      window.__opsClickClipboardOriginalExecCommand = document.execCommand;
      document.execCommand = () => false;
      try {
        window.__opsClickClipboardOriginal = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('forced clipboard failure')) },
        });
      } catch (_) {}
      return true;
    })()
  `, 3000);
}

async function restoreClipboardFailureStub(browser) {
  await browser.evaluate(`
    (() => {
      if (window.__opsClickClipboardOriginalExecCommand) {
        document.execCommand = window.__opsClickClipboardOriginalExecCommand;
      }
      try {
        if (window.__opsClickClipboardOriginal !== undefined) {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: window.__opsClickClipboardOriginal,
          });
        }
      } catch (_) {}
      return true;
    })()
  `, 3000).catch(() => null);
}

async function installClipboardCaptureStub(browser) {
  await browser.evaluate(`
    (() => {
      window.__opsClickClipboardCaptured = '';
      window.__opsClickClipboardCaptureOriginalExecCommand = document.execCommand;
      document.execCommand = function(command) {
        if (String(command || '').toLowerCase() === 'copy') {
          const node = document.activeElement;
          window.__opsClickClipboardCaptured = String(node?.value || window.getSelection()?.toString() || '');
          return true;
        }
        if (typeof window.__opsClickClipboardCaptureOriginalExecCommand === 'function') {
          return window.__opsClickClipboardCaptureOriginalExecCommand.apply(document, arguments);
        }
        return false;
      };
      try {
        window.__opsClickClipboardCaptureOriginal = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: value => {
              window.__opsClickClipboardCaptured = String(value || '');
              return Promise.resolve();
            },
          },
        });
      } catch (_) {}
      return true;
    })()
  `, 3000);
}

async function restoreClipboardCaptureStub(browser) {
  await browser.evaluate(`
    (() => {
      if (window.__opsClickClipboardCaptureOriginalExecCommand) {
        document.execCommand = window.__opsClickClipboardCaptureOriginalExecCommand;
      }
      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: window.__opsClickClipboardCaptureOriginal,
        });
      } catch (_) {}
      window.__opsClickClipboardCaptured = '';
      return true;
    })()
  `, 3000).catch(() => null);
}

async function assertClientCopyPayload(browser, selector, expectedSnippets, description) {
  const forbiddenSnippets = [
    "rtsp://",
    "http://",
    "https://",
    "/webrtc/session",
    "/lab/analysis",
    "/ws/va-metadata",
    "sessionToken",
    "client-live-internal",
    "analysisTapId",
    "sourceUrl",
    "Developer URL",
    "raw diagnostic",
    "BBox",
  ];
  await installClipboardCaptureStub(browser);
  try {
    await clickSelector(browser, selector, description);
    return await waitForResult(
      browser,
      `
        (() => {
          const value = String(window.__opsClickClipboardCaptured || '');
          const expected = ${JSON.stringify(expectedSnippets)};
          const forbidden = ${JSON.stringify(forbiddenSnippets)};
          const missing = expected.filter(item => !value.includes(item));
          const leaked = forbidden.filter(item => value.includes(item));
          return {
            ok: value.length > 0 && missing.length === 0 && leaked.length === 0,
            missing,
            leaked,
            value: value.slice(0, 500),
          };
        })()
      `,
      item => item?.ok === true,
      `${description} clipboard payload`,
    );
  } finally {
    await restoreClipboardCaptureStub(browser);
  }
}

async function assertClientCopyFallback(browser, selector, expectedSnippets, description) {
  const forbiddenSnippets = [
    "rtsp://",
    "http://",
    "https://",
    "/webrtc/session",
    "/lab/analysis",
    "/ws/va-metadata",
    "sessionToken",
    "analysisTapId",
    "sourceUrl",
    "Developer URL",
    "raw diagnostic",
    "BBox",
  ];
  await installClipboardFailureStub(browser);
  try {
    await clickSelector(browser, selector, description);
    await assertToastContains(browser, "아래 텍스트를 선택", `${description} toast`);
    await waitForResult(
      browser,
      `
        (() => {
          const box = document.querySelector('[data-client-copy-fallback]');
          const value = String(box?.querySelector('textarea')?.value || '');
          const expected = ${JSON.stringify(expectedSnippets)};
          const forbidden = ${JSON.stringify(forbiddenSnippets)};
          const missing = expected.filter(item => !value.includes(item));
          const leaked = forbidden.filter(item => value.includes(item));
          return {
            ok: Boolean(box) && value.length > 0 && missing.length === 0 && leaked.length === 0,
            missing,
            leaked,
            value: value.slice(0, 500),
          };
        })()
      `,
      item => item?.ok === true,
      `${description} fallback content`,
    );
    await browser.evaluate(`
      (() => {
        document.querySelector('[data-client-copy-fallback] [data-clipboard-fallback-close]')?.click();
        return true;
      })()
    `, 3000);
  } finally {
    await restoreClipboardFailureStub(browser);
  }
}

async function assertToastContains(browser, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const toasts = Array.from(document.querySelectorAll('.toast.error, .toast'));
        const text = toasts.map(node => String(node.textContent || '')).join('\\n');
        return { ok: text.includes(${JSON.stringify(expected)}), text };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertHashParam(browser, key, expected, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
        const value = String(params.get(${JSON.stringify(key)}) || '');
        return { ok: value === ${JSON.stringify(expected)}, value, hash: window.location.hash };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertHashParamAbsent(browser, key, description) {
  const result = await waitForResult(
    browser,
    `
      (() => {
        const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
        return { ok: !params.has(${JSON.stringify(key)}), hash: window.location.hash };
      })()
    `,
    item => item?.ok === true,
    description,
  );
  return result;
}

async function assertNoOverflow(browser, description) {
  const result = await browser.evaluate(`
    (() => {
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      return { ok: overflowX <= 2, overflowX, width: window.innerWidth };
    })()
  `, 5000);
  if (!result?.ok) {
    throw new Error(`${description}: horizontal overflow=${result?.overflowX}`);
  }
}

async function installErrorCollector(browser) {
  await browser.evaluate(`
    (() => {
      window.__opsClickErrors = [];
      window.addEventListener('error', event => {
        window.__opsClickErrors.push(String(event.message || 'error'));
      });
      window.addEventListener('unhandledrejection', event => {
        window.__opsClickErrors.push(String(event.reason?.message || event.reason || 'unhandledrejection'));
      });
      if (!console.__opsClickWrapped) {
        const originalError = console.error.bind(console);
        console.error = (...args) => {
          window.__opsClickErrors.push(args.map(item => String(item?.message || item)).join(' '));
          originalError(...args);
        };
        console.__opsClickWrapped = true;
      }
      return true;
    })()
  `, 5000);
}

async function assertBrowserErrors(browser, label) {
  const errors = await browser.evaluate(`
    (() => (window.__opsClickErrors || []).filter(Boolean))()
  `, 5000);
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`${label}: browser errors: ${errors.slice(0, 5).join(' | ')}`);
  }
}

async function waitForResult(browser, expression, predicate, description) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await browser.evaluate(expression, Math.min(5000, timeoutMs)).catch(error => ({
      ok: false,
      error: error.message,
    }));
    if (predicate(last)) return last;
    await delay(150);
  }
  throw new Error(`${description} timeout: ${JSON.stringify(last)}`);
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
