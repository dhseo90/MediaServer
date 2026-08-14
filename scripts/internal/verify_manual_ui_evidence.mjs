#!/usr/bin/env node
// 파일 용도: 현재 release 수동 UI 풀테스트 문서가 PASS/FAIL 이원화와 개별 기능 증거를 강제하는지 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Manual UI evidence verification

Usage:
  ./server.sh verify-manual-ui-evidence [options]

Options:
  --result <path>  실제 manual UI result 문서입니다. 지정한 경우 template 구조도 함께 검증합니다.
  -h, --help       도움말 출력

Checks:
  - 현재 릴리즈 기준 UI 풀테스트 판정이 PASS/FAIL만 쓰고 개별 기능 결과를 기록하는지 확인
  - client/viewer 비노출 항목과 admin preview 경계가 명시됐는지 확인
  - 사용자 명시 제외 항목은 판정표 밖 제외 기록으로 남기는지 확인
`);
}

assertKnownOptions(rawArgs, ["result", "h", "help"]);

const args = parseArgs(rawArgs);
const resultPath = args.result ? path.resolve(rootDir, args.result) : "";
const result = resultPath ? fs.readFileSync(resultPath, "utf8") : "";
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const fulltest = readText("docs/manual-ui-fulltest.md");
const backlog = readText("docs/development-backlog.md");
const inventory = readText("docs/project-feature-test-inventory.md");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const seedFixturePath = "test/fixtures/manual_ui_fulltest_va_seed_matrix.json";
const seedFixture = JSON.parse(readText(seedFixturePath));
const currentVersion = readText("VERSION").trim();
const currentTag = `v${currentVersion}`;

const checks = [];

check("manual UI docs are current release baseline", () => {
  assertIncludes(checklist, [
    `현재 release 목표는 \`${currentTag}\``,
    "현재 제품 UI actual-browser evidence 없이 완료 판정에 포함하지 않습니다.",
    "qualified-native-automation",
    "Policy v4 qualifier",
    `${currentTag} release UI gate`,
    "V390-REQ-001",
    "V390-REQ-002",
    "V390-REQ-003",
    "v3.5-v3.8 UI coverage bridge",
    "`/setup`",
    "`/login`",
    "`/ops/rules`",
    "`/client/live`",
    "Evidence index",
    "raw JSON/API-only 확인",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "현재 제품 UI 기준",
    `${currentTag} Feature Completion`,
    "V390-REQ-001",
    "V390-REQ-002",
    "V390-REQ-003",
    "v3.5-v3.8 UI coverage bridge",
    "지원 가능한 모든 exact 기능 case를 실제 브라우저 조작으로",
    "Policy v4",
    "테스트 영역 역할 분리",
    "UI 풀테스트는 `스크립트 테스트`와 별도 영역입니다.",
    "열지 않은 화면",
    "UI 풀테스트 판정값은 `PASS`와 `FAIL`만 사용합니다.",
    "카테고리 묶음 판정은 금지합니다.",
    "제외 기록",
  ], "docs/manual-ui-fulltest.md");
});

check("manual UI docs pin v3.9 required closeout and coverage bridge", () => {
  assertIncludes(checklist, [
    "v3.9.0 Required Closeout / v3.5-v3.8 coverage bridge",
    "Manual UI 기준서 v3.9 current화",
    "장시간/UI 테스트 시작 조건 v3.9화",
    "v3.5-v3.8 UI coverage bridge",
    "UI-080",
    "UI-107",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "v3.9.0 Required Closeout coverage bridge",
    "V390-REQ-001",
    "V390-REQ-002",
    "V390-REQ-003",
    "UI-080",
    "UI-107",
    "이 bridge를 만족해도 인앱 브라우저 UI 풀테스트",
  ], "docs/manual-ui-fulltest.md");
  assertIncludes(template, [
    "## v3.9.0 Required Closeout 기록 기준",
    "V390-REQ-001",
    "V390-REQ-002",
    "V390-REQ-003",
    "v3.5-v3.8 UI coverage bridge",
    "UI-080",
    "UI-107",
  ], "docs/manual-ui-result-template.md");
  assertNotIncludes(checklist, [
    "현재 release 목표는 `v2.9.0`",
  ], "docs/manual-ui-checklist.md");
  assertNotIncludes(fulltest, [
    "최신 공개 release 기준은 `v2.8.0 Operator-Supervised Action Readiness`",
  ], "docs/manual-ui-fulltest.md");
});

check("v3.5-v3.8 bridge binds all 36 exact IDs to route/control/action semantic evidence", () => {
  const expectedIds = v350ToV380BridgeIds();
  const result = validateBridgeItems(expectedIds, implementationManifest.items || []);
  assert(result.errors.length === 0, result.errors.join("; "));
  assert(expectedIds.length === 36, `bridge ID count drift: ${expectedIds.length}`);
  assertIncludes(fulltest, [
    "`UI-080`~`UI-087`, `CLIENT-031`~`CLIENT-032`",
    "`UI-088`~`UI-094`",
    "`UI-095`~`UI-101`, `CLIENT-037`~`CLIENT-039`",
    "`UI-102`~`UI-107`, `CLIENT-040`~`CLIENT-042`",
  ], "docs/manual-ui-fulltest.md exact bridge ranges");

  const omitted = (implementationManifest.items || []).filter(item => item.id !== "UI-094");
  const negative = validateBridgeItems(expectedIds, omitted);
  assert(negative.errors.some(error => error.includes("UI-094")),
    "middle-ID omission negative must reject UI-094 removal");
});

check("inventory longrun mapping counts are derived from the current 986-row manifest", () => {
  assert(implementationManifest.expectedFeatureRows === 986 && implementationManifest.items?.length === 986,
    "implementation manifest must contain the current 986 rows");
  const soak30 = implementationManifest.items.filter(item => item.longrunEvidence?.soak30).length;
  const soak120 = implementationManifest.items.filter(item => item.longrunEvidence?.soak120).length;
  assert(inventory.includes(`| 30분 soak 대상 | ${soak30} |`),
    `inventory 30-minute summary must equal derived ${soak30}`);
  assert(inventory.includes(`| 120분 대상 | ${soak120} |`),
    `inventory 120-minute summary must equal derived ${soak120}`);
  assert(inventory.includes(`| 30분 mapping | ${soak30}/${soak30} |`),
    `completed coverage 30-minute mapping must equal derived ${soak30}/${soak30}`);
  assert(inventory.includes(`| 120분 mapping | ${soak120}/${soak120} |`),
    `completed coverage 120-minute mapping must equal derived ${soak120}/${soak120}`);
});

check("manual result template covers required screens", () => {
  assertIncludes(template, [
    "# Manual UI Result Template",
    "evidence mode: direct-browser / qualified-native-automation / hybrid",
    "policy validation result:",
    "UI fulltest pass:",
    "`/setup`",
    "`/login`",
    "`/password/change`",
    "`/invite/setup`",
    "`/ops/home`",
    "`/ops/dashboard`",
    "`/ops/sources`",
    "`/ops/rules`",
    "`/ops/users`",
    "`/ops/events`",
    "`/client/live`",
    "`/client/dashboard`",
    "`/client/request-access`",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template splits tracker policy results", () => {
  assertIncludes(template, [
    "profile: tracker `none` + Re-ID `off`",
    "profile: tracker `lite` + Re-ID `off`",
    "profile: tracker `kalman-lite` + Re-ID `off`",
    "profile: tracker `bytetrack` + Re-ID `off`",
    "profile: tracker `lite` + Re-ID `assist`",
    "profile: tracker `kalman-lite` + Re-ID `assist`",
    "profile: tracker `bytetrack` + Re-ID `assist`",
    "invalid policy: tracker `none` + Re-ID `assist`",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template splits event template results", () => {
  assertIncludes(template, [
    "event template: line-crossing any",
    "event template: line-crossing forward",
    "event template: line-crossing reverse",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template splits scenario preset results", () => {
  assertIncludes(template, [
    "scenario preset: default",
    "scenario preset: custom",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template splits vaRule results", () => {
  assertIncludes(template, [
    "vaRule: line-crossing any",
    "vaRule: line-crossing forward",
    "vaRule: line-crossing reverse",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template splits event record keys", () => {
  assertIncludes(template, [
    "`line-crossing:any`",
    "`line-crossing:forward`",
    "`line-crossing:reverse`",
  ], "docs/manual-ui-result-template.md");
  assertNotIncludes(template, [
    "tracker/Re-ID 조합 7개",
    "basic 6개 + scenario 6개",
    "basic/scenario 최종 12개 이상",
    "| `/ops` |",
    "| `/client` |",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template separates qualified UI execution from support smoke", () => {
  assertIncludes(template, [
    "## 테스트 영역별 판정",
    "스크립트 테스트와 UI 풀테스트는 서로 대체하지 않습니다.",
    "안정화 테스트",
    "30분 테스트",
    "120분 테스트",
    "## 스크립트 테스트 기록",
    "## UI 풀테스트 기록",
    "관련 자동 검증",
    "verify-product-ui-no-native-dialogs",
    "verify-ops-click-e2e",
    "## 확인됨",
    "실제로 열고 클릭한 화면만 적습니다.",
    "Policy v4 qualifier",
    "completion oracle",
    "policyValidationResult",
    "uiFulltestPass",
    "자동 smoke나 raw JSON 확인만으로 채우지 않습니다.",
    "raw JSON/API-only로만 확인한 항목",
    "## 제외 기록",
    "## 실패",
  ], "docs/manual-ui-result-template.md");
  assertNotIncludes(template, [
    "PASS/FAIL/BLOCKED",
    "PASS/FAIL/미확인",
    "PASS/FAIL/BLOCKED/미확인",
    "## 미확인",
    "## 건너뜀",
    "NOT RUN",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs separate script stability tests from UI full test", () => {
  assertIncludes(checklist, [
    "스크립트 테스트, 30분 안정화, 120분 장시간 테스트",
    "UI 풀테스트와",
    "스크립트 안정화 테스트는 서로 대체하지 않으며",
    "verify-predev --soak-minutes 30",
    "verify-predev --soak-minutes 120",
    "verify-va-runtime-console-longrun --duration-minutes 120",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "30분 테스트",
    "120분 테스트",
    "로드맵 각 스텝 종료 시 먼저 수행합니다",
    "장기간 테스트 지시 시 기본으로 수행",
    "메모리 릭",
    "UI 풀테스트 PASS를 대체하지 않습니다.",
    "30분/120분 안정화 PASS를 대체하지 않습니다.",
  ], "docs/manual-ui-fulltest.md");
});

check("manual UI docs require native-dialog-free autonomous UI flow", () => {
  assertIncludes(checklist, [
    "verify-product-ui-no-native-dialogs",
    "native confirm/alert/prompt가 아니라 제품 화면 안",
    "첫 클릭에서 POST가 발생하지",
    "두 번째 클릭 뒤 거절 POST",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "사용자에게 pane 열기, 버튼 클릭, 팝업 확인을",
    "테스트 harness FAIL",
    "verify-product-ui-no-native-dialogs",
    "위험 action은 제품 화면 안 2회 확인 상태",
    "첫 클릭에는 write POST가",
  ], "docs/manual-ui-fulltest.md");
  assertIncludes(template, [
    "direct-browser 또는 Policy v4-qualified actual-browser 조작",
    "verify-product-ui-no-native-dialogs",
    "verify-ops-click-e2e",
  ], "docs/manual-ui-result-template.md");
  assertNotIncludes(checklist, [
    "runner가 자동 수락",
  ], "docs/manual-ui-checklist.md");
  assertNotIncludes(fulltest, [
    "팝업은 테스트 runner가 정책대로 처리",
  ], "docs/manual-ui-fulltest.md");
});

check("manual result template pins admin preview boundary", () => {
  assertIncludes(template, [
    "Client Preview as admin",
    "client/viewer 화면에서 보이지 않아야 하는 항목입니다.",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template pins client redaction boundary", () => {
  assertIncludes(template, [
    "source URL:",
    "Developer URL:",
    "raw JSON:",
    "debug counter:",
    "BBox diagnostics:",
    "rule/profile editor:",
    "Ops/Lab primary navigation:",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs require operator-provided auth verifier passwords", () => {
  for (const envName of [
    "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
    "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
  ]) {
    assertIncludes(checklist, [envName], "docs/manual-ui-checklist.md");
    assertIncludes(template, [envName], "docs/manual-ui-result-template.md");
  }
  assertIncludes(checklist, [
    "값이 없으면 auth 테스트를 시작하지 않고",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "Auth verifier 선수 조건",
    "SET / MISSING",
  ], "docs/manual-ui-result-template.md");
});

check("manual result template records explicit exclusions outside UI verdict", () => {
  assertIncludes(template, [
    "## 제외 기록",
    "사용자가 의도적으로 UI 풀테스트 기준에서 제외하라고 한 항목만 적습니다.",
    "여기에 있는 항목은 PASS/FAIL 판정표에 넣지 않습니다.",
    "제외 이유",
    "후속 확인 조건",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs keep rewrite requirements", () => {
  assertIncludes(template, [
    "## 문서 재작성/신규 작성/비교 병합",
    "재작성한 UI 풀테스트 관련 문서:",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs keep new document requirements", () => {
  assertIncludes(template, [
    "새로 작성한 UI 풀테스트 문서:",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs keep merge requirements", () => {
  assertIncludes(template, [
    "비교 결과:",
    "병합 결과:",
  ], "docs/manual-ui-result-template.md");
});

check("manual checklist references UI fulltest document", () => {
  assertIncludes(checklist, [
    "UI 풀테스트 문서를 재작성하거나 새 문서를 추가한 경우",
    "manual-ui-fulltest.md",
  ], "docs/manual-ui-checklist.md");
});

check("manual checklist links evidence verifier", () => {
  assertIncludes(checklist, [
    "verify-manual-ui-evidence",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(checklist, [
    "--emit-registry-dir <dir>",
  ], "docs/manual-ui-checklist.md");
});

check("manual template links evidence verifier", () => {
  assertIncludes(template, [
    "verify-manual-ui-evidence",
    "seed registry dir",
    "## 현재 보존 증적",
    "retained artifact",
  ], "docs/manual-ui-result-template.md");
});

check("manual UI docs link v2.2.0 UI Evidence Close-out", () => {
  assertIncludes(checklist, [
    "v2.2.0 UI Evidence Close-out",
    "V220-F02",
    "V220-F03",
    "V220-F04",
    "V220-F05",
    "V220-F06",
    "verify-v220-ui-evidence-closeout",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(fulltest, [
    "v2.2.0 UI Evidence Close-out",
    "F06는 UI 풀테스트 실행 결과가 아니라",
    "기능 inventory",
    "manual UI checklist",
    "result template",
  ], "docs/manual-ui-fulltest.md");
  assertIncludes(template, [
    "## v2.2.0 UI Evidence Close-out 기록 기준",
    "로드맵 항목",
    "실행 evidence",
    "V220-F06",
  ], "docs/manual-ui-result-template.md");
});

check("roadmap links evidence verifier", () => {
  assertIncludes(backlog, [
    "| V180-P0-03 |",
    "verify-manual-ui-evidence",
  ], "docs/development-backlog.md");
});

check("current release UI checklist requires direct UI evidence index", () => {
  assertIncludes(checklist, [
    `${currentTag} release UI gate`,
    "`/setup`",
    "`/login`",
    "`/ops`",
    "`/client`",
    "`/ops/rules`",
    "`/client/live`",
    "Evidence index",
    "열지 않은 화면은 `FAIL`",
    "raw JSON/API-only 확인만",
    "판정은 `PASS` 또는 `FAIL`만 사용합니다.",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "evidence index:",
    `## ${currentTag} Release Evidence Index`,
    "자동 smoke나 raw JSON 확인만으로 채우지 않습니다.",
    "| `/setup` |",
    "| `/login` |",
    "| `/ops/home` |",
    "| `/ops/dashboard` |",
    "| `/ops/sources` |",
    "| `/ops/users` |",
    "| `/ops/events` |",
    "| `/ops/rules` |",
    "| `/client/live` |",
    "| `/client/dashboard` |",
    "직접 열어보지 않은 화면",
    "실패 후 재검수한 화면",
    "client/viewer 비노출 재확인",
    "카테고리 묶음 판정은 금지합니다.",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(backlog, [
    "| V180-P0-03 |",
    "Manual UI evidence checklist hardening",
    "`/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live`",
    "evidence index",
  ], "docs/development-backlog.md");
});

if (resultPath) {
  check("provided manual result follows current evidence structure", () => {
    assertIncludes(result, [
      "## 검수 메타데이터",
      "## 확인됨",
      "## 제외 기록",
      "## 실패",
      "푸시 수행 여부",
    ], path.relative(rootDir, resultPath).replaceAll(path.sep, "/"));
    assertNotIncludes(result, [
      "PASS/FAIL/BLOCKED",
      "PASS/FAIL/미확인",
      "PASS/FAIL/BLOCKED/미확인",
      "## 미확인",
      "## 건너뜀",
      "NOT RUN",
    ], path.relative(rootDir, resultPath).replaceAll(path.sep, "/"));
  });

  check("provided manual result covers every UI-target feature ID", () => {
    const inventoryRows = uiTargetFeatureIds();
    const resultRows = parseFeatureRows(result);
    const resultIds = new Set(resultRows.map(row => row.id));
    const missing = inventoryRows.filter(id => !resultIds.has(id));
    assert(missing.length === 0, `manual result missing UI target feature rows: ${missing.join(", ")}`);
    for (const row of resultRows) {
      if (!/^(UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+$/.test(row.id)) continue;
      assert(["PASS", "FAIL"].includes(row.verdict), `manual result row ${row.id} verdict must be PASS or FAIL: ${row.verdict || "(empty)"}`);
    }
  });

  check("provided manual result UI summary count matches UI-target rows", () => {
    const uiIds = new Set(uiTargetFeatureIds());
    const resultRows = parseFeatureRows(result).filter(row => uiIds.has(row.id));
    const pass = resultRows.filter(row => row.verdict === "PASS").length;
    const fail = resultRows.filter(row => row.verdict === "FAIL").length;
    const summary = result.match(/UI 풀테스트\s*\|\s*(\d+)개 UI 대상 기능 ID 중 (\d+) PASS, (\d+) FAIL/);
    assert(summary, "manual result missing UI full-test summary count");
    const [, totalText, passText, failText] = summary;
    assert(Number(totalText) === uiIds.size, `manual result UI summary total mismatch: ${totalText} != ${uiIds.size}`);
    assert(Number(passText) === pass, `manual result UI summary PASS mismatch: ${passText} != ${pass}`);
    assert(Number(failText) === fail, `manual result UI summary FAIL mismatch: ${failText} != ${fail}`);
  });

  check("provided manual result retained evidence paths exist", () => {
    const section = sectionBetween(result, "## 현재 보존 증적", "## 스크립트 테스트 기록");
    assert(section, "manual result missing retained evidence section");
    const rows = parseGenericTableRows(section)
      .filter(row => row[1]?.startsWith("`/"));
    assert(rows.length >= 6, `manual result retained evidence rows too small: ${rows.length}`);
    const missing = [];
    for (const row of rows) {
      const rawPath = String(row[1] || "").replace(/^`|`$/g, "");
      if (!fs.existsSync(rawPath)) {
        missing.push(rawPath);
      }
      const status = String(row[2] || "").trim();
      if (status !== "exists") {
        missing.push(`${rawPath} status=${status || "(empty)"}`);
      }
    }
    assert(missing.length === 0, `manual result retained evidence paths missing: ${missing.join(", ")}`);
  });

  check("provided manual result covers every RULE feature ID", () => {
    const inventoryRuleIds = parseFeatureRows(inventory)
      .filter(row => row.id.startsWith("RULE-"))
      .map(row => row.id);
    const resultIds = new Set(parseFeatureRows(result).map(row => row.id));
    const missing = inventoryRuleIds.filter(id => !resultIds.has(id));
    assert(missing.length === 0, `manual result missing RULE feature rows: ${missing.join(", ")}`);
  });

  check("provided manual result populates VA seed matrix rows", () => {
    const section = sectionBetween(result, "## VA Seed / 최종 룰 상태", "## VA Event Occurrence Coverage");
    assert(section, "manual result missing VA Seed / final rule section");
    const expectedRows = expectedSeedResultRows(seedFixture);
    const rows = parseGenericTableRows(section);
    const byName = new Map(rows.map(row => [row[0], row]));
    const missing = expectedRows.filter(name => !byName.has(name));
    assert(missing.length === 0, `manual result missing VA seed matrix rows: ${missing.join(", ")}`);
    const incomplete = [];
    for (const name of expectedRows) {
      const row = byName.get(name) || [];
      const actual = row[2] || "";
      const verdict = row[3] || "";
      if (!actual || !["PASS", "FAIL"].includes(verdict) || verdict === "PASS/FAIL") {
        incomplete.push(name);
      }
    }
    assert(incomplete.length === 0, `manual result has unpopulated VA seed matrix rows: ${incomplete.join(", ")}`);
  });

  check("provided manual result splits VA EventRecord coverage by exact event key", () => {
    const section = sectionBetween(result, "## VA Event Occurrence Coverage", "### VA EventRecord 후속");
    assert(section, "manual result missing VA Event Occurrence Coverage section");
    const expectedKeys = [
      "`presence`",
      "`enter`",
      "`exit`",
      "`line-crossing:any`",
      "`line-crossing:forward`",
      "`line-crossing:reverse`",
      "`intrusion-dwell`",
      "`re-entry`",
      "`wrong-direction`",
      "`intrusion-after-line-crossing`",
      "`loitering`",
      "`zone-occupancy`",
    ];
    const rows = parseGenericTableRows(section)
      .filter(row => row[0]?.startsWith("`"));
    const byKey = new Map(rows.map(row => [row[0], row]));
    const missing = expectedKeys.filter(key => !byKey.has(key));
    assert(missing.length === 0, `manual result missing exact VA EventRecord rows: ${missing.join(", ")}`);
    const extraCombined = rows
      .map(row => row[0])
      .filter(key => key.includes("/") || key.includes("any/forward/reverse"));
    assert(extraCombined.length === 0, `manual result has combined VA EventRecord rows instead of exact rows: ${extraCombined.join(", ")}`);
    const invalidPass = [];
    for (const key of expectedKeys) {
      const row = byKey.get(key) || [];
      const evidence = eventCoverageEvidence(row);
      const verdict = evidence.verdict;
      if (!["PASS", "FAIL"].includes(verdict || "")) {
        invalidPass.push(`${key}: invalid verdict ${verdict || "(empty)"}`);
      } else if (verdict === "PASS" && (!/^(yes|[1-9]\d*)$/i.test(evidence.uiRows) || Number(evidence.jsonRecords) <= 0)) {
        invalidPass.push(`${key}: PASS without UI row and record evidence`);
      }
    }
    assert(invalidPass.length === 0, `manual result has invalid VA EventRecord verdicts: ${invalidPass.join("; ")}`);
  });
}

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== Manual UI evidence verification summary ==");
console.log(`- result: ${resultPath ? path.relative(rootDir, resultPath).replaceAll(path.sep, "/") : "not provided; template/checklist only"}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
        verdict: cells[5] || "",
      };
    });
}

function hasArea(area, token) {
  return String(area || "").split(",").map(item => item.trim()).includes(token);
}

function uiTargetFeatureIds() {
  return parseFeatureRows(inventory)
    .filter(row => hasArea(row.area, "UI"))
    .map(row => row.id);
}

function sectionBetween(text, startHeading, nextHeading) {
  const start = text.indexOf(startHeading);
  if (start < 0) return "";
  const next = text.indexOf(nextHeading, start + startHeading.length);
  return text.slice(start, next >= 0 ? next : undefined);
}

function parseGenericTableRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => line.startsWith("|") && !/^\|\s*-+\s*\|/.test(line))
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length > 0 && cells.some(Boolean))
    .filter(cells => !/^(개별 항목|개별 event 기능|ID)$/.test(cells[0] || ""));
}

function expectedSeedResultRows(seed) {
  return [
    ...arrayAt(seed, "accounts").map(item => `account: ${item.role}`),
    ...expectedTrackerPairs(seed).map(pair => `profile: tracker \`${pair.tracker}\` + Re-ID \`${pair.reid}\``),
    "invalid policy: tracker `none` + Re-ID `assist`",
    ...arrayAt(seed, "eventTemplates").map(item => `event template: ${eventTemplateLabel(item)}`),
    ...arrayAt(seed, "scenarioPresets").map(preset => `scenario preset: ${preset}`),
    ...arrayAt(seed, "vaRules").map(item => `vaRule: ${eventTemplateLabel(arrayAt(seed, "eventTemplates").find(templateRow => templateRow.id === item.eventTemplateId) || {})}`),
  ];
}

function eventCoverageEvidence(row) {
  if (row.length >= 7) {
    return {
      uiRows: row[3] || "",
      jsonRecords: row[4] || "",
      verdict: row[6] || "",
    };
  }
  return {
    uiRows: row[1] || "",
    jsonRecords: row[2] || "",
    verdict: row[3] || "",
  };
}

function expectedTrackerPairs(seed) {
  const pairs = new Map();
  for (const collectionName of ["eventTemplates", "vaRules"]) {
    for (const item of arrayAt(seed, collectionName)) {
      const policy = item.payload?.analysis?.trackingPolicy || {};
      const tracker = String(policy.tracker || "").trim();
      const reid = String(policy.reid || "off").trim();
      if (tracker && reid && !(tracker === "none" && reid !== "off")) {
        pairs.set(`${tracker}/${reid}`, { tracker, reid });
      }
    }
  }
  return [...pairs.values()].sort((left, right) => `${left.tracker}/${left.reid}`.localeCompare(`${right.tracker}/${right.reid}`));
}

function v350ToV380BridgeIds() {
  const range = (prefix, start, end) => Array.from(
    { length: end - start + 1 },
    (_unused, offset) => `${prefix}-${String(start + offset).padStart(3, "0")}`,
  );
  return [
    ...range("UI", 80, 107),
    ...range("CLIENT", 31, 32),
    ...range("CLIENT", 37, 42),
  ];
}

function validateBridgeItems(expectedIds, items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const errors = [];
  const signatures = [];
  for (const id of expectedIds) {
    const item = byId.get(id);
    if (!item) {
      errors.push(`bridge missing exact ID ${id}`);
      continue;
    }
    const semantic = item.semanticEvidence || {};
    if (!semantic.handler?.file || !semantic.handler?.symbol || !semantic.handler?.anchor) {
      errors.push(`${id} bridge handler locator missing`);
    }
    if (!semantic.actionHandler?.file || !semantic.actionHandler?.symbol || !semantic.actionHandler?.anchor) {
      errors.push(`${id} bridge action locator missing`);
    }
    if (!semantic.stateOracle?.locator?.file || !semantic.stateOracle?.expectedBehaviorSha256) {
      errors.push(`${id} bridge state oracle missing`);
    }
    if (!semantic.route?.applicability) errors.push(`${id} bridge route applicability missing`);
    if (!semantic.controlSelector?.applicability) errors.push(`${id} bridge control applicability missing`);
    if (item.testAreas?.includes("UI") &&
        semantic.controlSelector?.applicability !== "product-control" &&
        !semantic.controlSelector?.reason) {
      errors.push(`${id} UI bridge exact control or N/A reason missing`);
    }
    signatures.push({
      id,
      route: semantic.route,
      control: semantic.controlSelector,
      action: semantic.actionHandler,
      stateBehaviorSha256: semantic.stateOracle?.expectedBehaviorSha256,
      reviewDigest: item.review?.semanticDigest || null,
    });
  }
  const digest = crypto.createHash("sha256").update(JSON.stringify(signatures)).digest("hex");
  return { errors, digest, count: signatures.length };
}

function eventTemplateLabel(item) {
  if (!item?.type) return "";
  if (item.type === "line-crossing") {
    return `line-crossing ${item.direction || item.payload?.event?.region?.direction || ""}`.trim();
  }
  return item.type;
}

function arrayAt(value, key) {
  const item = value?.[key];
  if (!Array.isArray(item)) throw new Error(`${key} must be an array`);
  return item;
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
}

function assertNotIncludes(text, terms, label) {
  const present = terms.filter(term => text.includes(term));
  if (present.length > 0) {
    throw new Error(`${label} contains forbidden wording: ${present.join(", ")}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
