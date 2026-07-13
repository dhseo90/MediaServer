#!/usr/bin/env node
// 파일 용도: v2.6.0 S06 release readiness gate의 문서/인벤토리/명령 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.6.0 S06 release readiness verification

Usage:
  ./server.sh verify-v260-owner-release-readiness

Checks:
  - v2.6.0 S06 feature inventory, release policy, evidence index, manual UI criteria가 같은 local readiness gate를 가리키는지 확인
  - local readiness verifier와 release metadata/docs/assets/coverage/evidence/close-out dry-run companion command가 문서화됐는지 확인
  - UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release 경계가 S06 local readiness PASS로 승격되지 않는지 확인
  - server.sh가 S06 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v260-owner-release-readiness",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-feature-inventory-coverage",
  "verify-manual-ui-evidence",
  "verify-release-evidence-index",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("feature inventory maps S06 release readiness IDs and coverage", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const projectInventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  for (const snippet of [
    "| V260-S06 Release readiness | `UI-045`, `UI-046`, `UI-047`, `UI-048`, `UI-049`, `OPS-037`, `SAFE-057` | `verify-v260-owner-release-readiness` |",
    "| OPS-037 | V260-S06 릴리즈 준비 게이트 |",
    "| SAFE-057 | V260-S06 릴리즈 준비 경계 |",
  ]) {
    assert(inventory.includes(snippet), `inventory missing S06 snippet: ${snippet}`);
  }
  assert(coverage.includes("verifierEvidenceRows === rows.length"),
    "feature coverage must validate verifier evidence for every inventory row");
  assert(projectInventory.includes('"OPS-037"'), "project inventory verifier missing OPS-037 required row");
  assert(projectInventory.includes('"SAFE-057"'), "project inventory verifier missing SAFE-057 required row");
});

check("manual UI criteria records v2.6.0 operational hardening controls without claiming execution", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  for (const text of [fulltest, checklist]) {
    for (const snippet of [
      "v2.6.0 Operational Hardening UI 풀테스트 기준",
      "UI-045",
      "UI-046",
      "UI-047",
      "UI-048",
      "UI-049",
      "/ops/events",
      "/ops/sources",
      "/ops/dashboard",
      "/ops/rules",
    ]) {
      assert(text.includes(snippet), `manual UI criteria missing S06 snippet: ${snippet}`);
    }
  }
  assert(fulltest.includes("raw JSON/API-only/static smoke/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다"),
    "manual UI fulltest missing non-equivalence boundary");
  assert(checklist.includes("실제 UI 직접 조작 미실행 상태를 PASS로 쓰지 않음"),
    "manual UI checklist missing non-execution boundary");
});

check("release policy and evidence index record S06 readiness without promoting not-run gates", () => {
  const backlog = readText("docs/development-backlog.md");
  const policy = readText("docs/release-policy.md");
  const evidence = readText("docs/release-evidence-index.md");
  const publishedMetadataCommand = "verify-release-metadata --published";
  const publishedMetadataStillManual = policy.includes(`\`${publishedMetadataCommand}\` 미실행`) &&
    policy.includes("UI 풀테스트 직접 조작 미실행") && policy.includes("30분 테스트 미실행") &&
    policy.includes("120분 테스트 미실행");
  assert(publishedMetadataStillManual,
    "verify-release-metadata --published and UI/30분/120분 must remain manual-not-run");
  assert(/\| V260-S06 \| 완료 \| v2\.6\.0 owner release readiness local gate \|/.test(backlog),
    "backlog V260-S06 historical completion row missing");
  for (const snippet of readinessCommands) {
    assert(evidence.includes(snippet), `release evidence missing S06 command: ${snippet}`);
  }
  for (const snippet of [
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assert(policy.includes(snippet), `release policy missing S06 readiness snippet: ${snippet}`);
  }
  for (const snippet of [
    "v260-s06-owner-release-readiness-20260615",
    "media-server.v260-owner-release-readiness.v1",
    "v2.6.0 S06 소유권 분리 / 릴리즈 준비",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "Not run for `v260-s06-owner-release-readiness-20260615`",
  ]) {
    assert(evidence.includes(snippet), `release evidence missing S06 readiness snippet: ${snippet}`);
  }
});

check("stream verification and server entrypoint expose the S06 verifier", () => {
  const streamVerification = readText("docs/stream-verification.md");
  const serverSh = readText("server.sh");
  assert(streamVerification.includes("verify-v260-owner-release-readiness"),
    "stream verification missing S06 command");
  assert(serverSh.includes("verify-v260-owner-release-readiness"),
    "server.sh missing verify-v260-owner-release-readiness");
  assert(serverSh.includes("verify_v260_owner_release_readiness.mjs"),
    "server.sh missing S06 verifier script dispatch");
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
console.log("== v2.6.0 S06 owner/release readiness summary ==");
console.log("- schema: media-server.v260-owner-release-readiness.v1");
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
