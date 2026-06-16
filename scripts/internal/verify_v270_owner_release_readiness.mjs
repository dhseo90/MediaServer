#!/usr/bin/env node
// 파일 용도: v2.7.0 S06 release readiness gate의 문서/인벤토리/명령 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.7.0 S06 release readiness verification

Usage:
  ./server.sh verify-v270-owner-release-readiness

Checks:
  - v2.7.0 S01~S06 feature inventory, manual UI criteria, release policy, evidence index가 같은 local readiness gate를 가리키는지 확인
  - v2.7.0 local readiness verifier와 release metadata/docs/assets/coverage/evidence/close-out dry-run companion command가 문서화됐는지 확인
  - UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release 경계가 S06 local readiness PASS로 승격되지 않는지 확인
  - server.sh가 S06 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v270-owner-release-readiness",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-feature-inventory-coverage",
  "verify-manual-ui-evidence",
  "verify-release-evidence-index",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("feature inventory maps v2.7.0 S01-S06 readiness IDs and coverage", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const projectInventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  for (const snippet of [
    "| V270-S01 Incident Triage Board | `UI-050`, `EVT-050`, `LAB-074`, `SAFE-058` | `verify-v270-incident-triage-board` |",
    "| V270-S02 Decision scorecard | `UI-051`, `EVT-051`, `LAB-075`, `SAFE-059` | `verify-v270-incident-decision-scorecard` |",
    "| V270-S03 Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` | `verify-v270-operational-action-pack` |",
    "| V270-S04 Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` | `verify-v270-rule-what-if-preview` |",
    "| V270-S05 Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` | `verify-v270-operator-outcome-memory` |",
    "| V270-S06 Release readiness | `UI-050`, `UI-051`, `UI-052`, `UI-053`, `UI-054`, `OPS-038`, `SAFE-063` | `verify-v270-owner-release-readiness` |",
    "| OPS-038 | V270-S06 릴리즈 준비 게이트 |",
    "| SAFE-063 | V270-S06 릴리즈 준비 경계 |",
    "`UI-001`~`UI-018`, `UI-022`~`UI-054`",
    "`OPS-035`~`OPS-038`",
    "`SAFE-001`~`SAFE-063`",
  ]) {
    assert(inventory.includes(snippet), `inventory missing v2.7.0 readiness snippet: ${snippet}`);
  }
  assert(coverage.includes("verify-v270-owner-release-readiness"), "feature coverage missing V270-S06 verifier");
  assert(projectInventory.includes('"OPS-038"'), "project inventory verifier missing OPS-038 required row");
  assert(projectInventory.includes('"SAFE-063"'), "project inventory verifier missing SAFE-063 required row");
});

check("manual UI criteria records v2.7.0 controls without claiming execution", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  for (const text of [fulltest, checklist]) {
    for (const snippet of [
      "v2.7.0 Operational Incident Command Loop UI 풀테스트 기준",
      "UI-050",
      "UI-051",
      "UI-052",
      "UI-053",
      "UI-054",
      "OPS-038",
      "SAFE-063",
      "/ops/events",
      "/ops/rules",
      "raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다",
    ]) {
      assert(text.includes(snippet), `manual UI criteria missing V270-S06 snippet: ${snippet}`);
    }
  }
});

check("release policy, evidence index, and backlog record S06 readiness without promoting not-run gates", () => {
  const backlog = readText("docs/development-backlog.md");
  const policy = readText("docs/release-policy.md");
  const evidence = readText("docs/release-evidence-index.md");
  assert(/\| 6 \| V270-S06 \| P2 \| (진행|완료) \| 릴리즈 준비 \|/.test(backlog),
    "backlog V270-S06 row must be 진행 or 완료");
  for (const snippet of readinessCommands) {
    assert(backlog.includes(snippet), `backlog missing V270-S06 command: ${snippet}`);
    assert(policy.includes(snippet), `release policy missing V270-S06 command: ${snippet}`);
    assert(evidence.includes(snippet), `release evidence missing V270-S06 command: ${snippet}`);
  }
  for (const snippet of [
    "## v2.7.0 소유권 분리 / 릴리즈 준비 게이트",
    "media-server.v270-owner-release-readiness.v1",
    "v2.7.0 Operational Incident Command Loop Coverage Mapping",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "tag/push/GitHub Release 실행은 S06 gate PASS로 대체하지 않습니다.",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assert(policy.includes(snippet), `release policy missing V270-S06 readiness snippet: ${snippet}`);
  }
  for (const snippet of [
    "v270-s06-owner-release-readiness-20260616",
    "media-server.v270-owner-release-readiness.v1",
    "v2.7.0 S06 소유권 분리 / 릴리즈 준비",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "Not run for `v270-s06-owner-release-readiness-20260616`",
  ]) {
    assert(evidence.includes(snippet), `release evidence missing V270-S06 readiness snippet: ${snippet}`);
  }
});

check("stream verification and server entrypoint expose the S06 verifier", () => {
  const streamVerification = readText("docs/stream-verification.md");
  const serverSh = readText("server.sh");
  assert(streamVerification.includes("verify-v270-owner-release-readiness"),
    "stream verification missing V270-S06 command");
  assert(serverSh.includes("verify-v270-owner-release-readiness"),
    "server.sh missing verify-v270-owner-release-readiness");
  assert(serverSh.includes("verify_v270_owner_release_readiness.mjs"),
    "server.sh missing V270-S06 verifier script dispatch");
});

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
console.log("== v2.7.0 S06 owner/release readiness summary ==");
console.log("- schema: media-server.v270-owner-release-readiness.v1");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
