#!/usr/bin/env node
// 파일 용도: v2.8.0 S07 release readiness gate의 문서/인벤토리/명령 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.8.0 S07 release readiness verification

Usage:
  ./server.sh verify-v280-owner-release-readiness

Checks:
  - v2.8.0 S02~S07 feature inventory, manual UI criteria, release policy, evidence index가 같은 local readiness gate를 가리키는지 확인
  - v2.8.0 local readiness verifier와 release metadata/docs/assets/coverage/evidence/close-out dry-run companion command가 문서화됐는지 확인
  - UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release 경계가 S07 local readiness PASS로 승격되지 않는지 확인
  - server.sh가 S07 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v280-owner-release-readiness",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-feature-inventory-coverage",
  "verify-manual-ui-evidence",
  "verify-release-evidence-index",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("feature inventory maps v2.8.0 S02-S07 readiness IDs and coverage", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const projectInventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  for (const snippet of [
    "| V280-S02 Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` | `verify-v280-incident-action-readiness-queue` |",
    "| V280-S03 Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` | `verify-v280-approval-gated-rule-draft` |",
    "| V280-S04 Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` | `verify-v280-evidence-intake-field-readiness` |",
    "| V280-S05 Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` | `verify-v280-runtime-evidence-window` |",
    "| V280-S06 Client-safe Follow-up Digest | `CLIENT-024`, `SAFE-069` | `verify-v280-client-safe-followup-digest` |",
    "| V280-S07 Release readiness | `UI-055`, `UI-056`, `UI-057`, `UI-058`, `CLIENT-024`, `OPS-040`, `SAFE-070` | `verify-v280-owner-release-readiness` |",
    "| OPS-040 | V280-S07 릴리즈 준비 게이트 |",
    "| SAFE-070 | V280-S07 릴리즈 준비 경계 |",
    "`SAFE-001`~`SAFE-070`",
    "`OPS-035`~`OPS-040`",
  ]) {
    assert(inventory.includes(snippet), `inventory missing v2.8.0 readiness snippet: ${snippet}`);
  }
  assert(coverage.includes("verify-v280-owner-release-readiness"), "feature coverage missing V280-S07 verifier");
  assert(projectInventory.includes('"OPS-040"'), "project inventory verifier missing OPS-040 required row");
  assert(projectInventory.includes('"SAFE-070"'), "project inventory verifier missing SAFE-070 required row");
});

check("manual UI criteria records v2.8.0 controls without claiming execution", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  for (const text of [fulltest, checklist]) {
    for (const snippet of [
      "v2.8.0 Operator-Supervised Action Readiness UI 풀테스트 기준",
      "UI-055",
      "UI-056",
      "UI-057",
      "UI-058",
      "CLIENT-024",
      "OPS-040",
      "SAFE-070",
      "/ops/events",
      "/ops/rules",
      "/client/live",
      "/client/dashboard",
      "/client/events",
      "raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다",
    ]) {
      assert(text.includes(snippet), `manual UI criteria missing V280-S07 snippet: ${snippet}`);
    }
  }
});

check("release policy, evidence index, and backlog record S07 readiness without promoting not-run gates", () => {
  const backlog = readText("docs/development-backlog.md");
  const policy = readText("docs/release-policy.md");
  const evidence = readText("docs/release-evidence-index.md");
  assert(/\| 7 \| V280-S07 \| P2 \| 완료 \| 릴리즈 준비 \|/.test(backlog),
    "backlog V280-S07 row must be 완료");
  for (const snippet of readinessCommands) {
    assert(backlog.includes(snippet), `backlog missing V280-S07 command: ${snippet}`);
    assert(policy.includes(snippet), `release policy missing V280-S07 command: ${snippet}`);
    assert(evidence.includes(snippet), `release evidence missing V280-S07 command: ${snippet}`);
  }
  for (const snippet of [
    "## v2.8.0 소유권 분리 / 릴리즈 준비 게이트",
    "media-server.v280-owner-release-readiness.v1",
    "v2.8.0 Operator-Supervised Action Readiness Coverage Mapping",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "tag/push/GitHub Release 실행은 S07 gate PASS로 대체하지 않습니다.",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assert(policy.includes(snippet), `release policy missing V280-S07 readiness snippet: ${snippet}`);
  }
  assert(!policy.includes("아직 구현 후보 이름"), "release policy must no longer describe V280-S07 as a candidate verifier");
  for (const snippet of [
    "v280-s07-owner-release-readiness-20260618",
    "media-server.v280-owner-release-readiness.v1",
    "v2.8.0 S07 소유권 분리 / 릴리즈 준비",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "Not run for `v280-s07-owner-release-readiness-20260618`",
  ]) {
    assert(evidence.includes(snippet), `release evidence missing V280-S07 readiness snippet: ${snippet}`);
  }
});

check("stream verification and server entrypoint expose the S07 verifier", () => {
  const streamVerification = readText("docs/stream-verification.md");
  const serverSh = readText("server.sh");
  assert(streamVerification.includes("verify-v280-owner-release-readiness"),
    "stream verification missing V280-S07 command");
  assert(serverSh.includes("verify-v280-owner-release-readiness"),
    "server.sh missing verify-v280-owner-release-readiness");
  assert(serverSh.includes("verify_v280_owner_release_readiness.mjs"),
    "server.sh missing V280-S07 verifier script dispatch");
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
console.log("== v2.8.0 S07 owner/release readiness summary ==");
console.log("- schema: media-server.v280-owner-release-readiness.v1");
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
