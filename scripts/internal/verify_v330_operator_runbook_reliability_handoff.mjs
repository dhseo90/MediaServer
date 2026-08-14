#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 8 Operator Runbook and Reliability Handoff 문서, inventory, verifier 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Operator Runbook and Reliability Handoff verification

Usage:
  ./server.sh verify-v330-operator-runbook-reliability-handoff

Checks:
  - v3.3.0 roadmap order matches Step 8 Operator Runbook, Step 9 Search/Metrics, Step 10 Backup Handoff
  - the operator runbook lives in live-source-health.md and defines source reliability workspace usage and handoff checklist
  - docs index, UI guide, config reference, and backup/recovery guide link the runbook without creating a new release gate
  - feature inventory, stream verification, release records, coverage verifier, script inventory, and server dispatch are wired
  - the runbook does not claim UI fulltest, 30/120-minute longrun, release publish, field smoke, or automatic recovery completion
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-operator-runbook-reliability-handoff";
const files = {
  backlog: readText("docs/development-backlog.md"),
  liveSourceHealth: readText("docs/live-source-health.md"),
  docsIndex: readText("docs/README.md"),
  uiGuide: readText("docs/ui-guide.md"),
  configReference: readText("docs/config-reference.md"),
  backupRecovery: readText("docs/ops-backup-recovery.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("roadmap records v3.3 Step 8 as Operator Runbook and keeps later steps in user-provided order", () => {
  for (const snippet of [
    "| 8 | v3.3.0 (8) Operator Runbook and Reliability Handoff | P1 | 완료 | source reliability workspace 사용 흐름, 운영자 runbook, docs index/UI guide/config/backup 문서 연결 |",
    "| 9 | v3.3.0 (9) Source Reliability Search and Metrics | P2 | 완료 | source health filter, saved reliability view, reconnect/stale/offline metric summary |",
    "| 10 | v3.3.0 (10) Ops Backup and Recovery Source Handoff | P2 | 완료 | source registry, PublishedView, source health snapshot, recovery validation plan 연결 |",
    "## v3.3.0 Step 8 개발 기록",
    "docs/live-source-health.md",
    `\`./server.sh ${command}\``,
    "이번 Step 8은 operator runbook과 reliability handoff 문서 연결입니다",
    "Source Reliability Search and Metrics, Ops Backup and Recovery Source Handoff 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 8");
  }
});

check("live source health owns the operator runbook and reliability handoff checklist", () => {
  for (const snippet of [
    "## Operator Runbook and Reliability Handoff",
    "독자: 운영자, on-call, release handoff reviewer",
    "Lifecycle: v3.3.0 Live Source Reliability Workspace 동안 유지되는 운영 runbook",
    "Source-of-truth: 이 섹션은 source reliability workspace 사용 흐름의 기준이고",
    "### Runbook quick path",
    "1. `/ops/sources`에서 Source Registry Snapshot and Identity를 확인합니다.",
    "2. Source Onboarding Quality Summary에서 저장 전 validation, 중복, 충돌, 누락, ready 상태를 확인합니다.",
    "3. Reliability Timeline and Health History에서 live/stale/offline/reconnect 변화와 Ops audit handoff를 확인합니다.",
    "4. `/ops/events`에서 Incident-to-Source Correlation Layer와 Operator Recheck and Recovery Queue를 함께 확인합니다.",
    "5. `/client/live`, `/client/dashboard`, `/client/events`에서 viewer-safe Source Status Digest만 노출되는지 확인합니다.",
    "### Handoff checklist",
    "source registry snapshot",
    "onboarding quality summary",
    "reliability timeline",
    "incident-to-source correlation",
    "operator recheck recovery queue",
    "client-safe source status digest",
    "### Boundary and rollback",
    "자동 recovery, 자동 registry mutation, PublishedView write, EventRecord/Event POST schema 변경은 이 runbook 범위가 아닙니다.",
  ]) {
    assertIncludes(files.liveSourceHealth, snippet, "live source health operator runbook");
  }
});

check("docs index, UI guide, config reference, and backup guide link the runbook handoff", () => {
  const runbookHandoffObserved = files.docsIndex.includes("live-source-health.md#operator-runbook-and-reliability-handoff");
  assert(runbookHandoffObserved, "OPS-087 canonical runbook handoff link missing");
  for (const snippet of [
    "source reliability operator runbook",
    "live-source-health.md#operator-runbook-and-reliability-handoff",
  ]) {
    assertIncludes(files.docsIndex, snippet, "docs index runbook link");
  }
  for (const snippet of [
    "Live Source Reliability Workspace 사용 흐름",
    "Operator Runbook and Reliability Handoff",
    "live-source-health.md#operator-runbook-and-reliability-handoff",
    "UI guide는 화면 위치와 조작 순서만 설명하고 runbook source-of-truth는 live-source-health.md에 둡니다.",
  ]) {
    assertIncludes(files.uiGuide, snippet, "UI guide runbook handoff");
  }
  for (const snippet of [
    "Source reliability handoff bundle",
    "source registry snapshot, onboarding quality, reliability timeline, incident correlation, recovery queue, client-safe digest",
    "config reference는 env와 bundle 수집 기준만 설명하고 runbook 판단 기준은 live-source-health.md에 둡니다.",
  ]) {
    assertIncludes(files.configReference, snippet, "config reference runbook handoff");
  }
  for (const snippet of [
    "Source reliability handoff",
    "복구용 백업 완료 evidence가 아니라 operator handoff 입력입니다.",
    "live-source-health.md#operator-runbook-and-reliability-handoff",
    "Ops Backup and Recovery Source Handoff는 별도 roadmap step evidence가 있어야 완료로 기록합니다.",
  ]) {
    assertIncludes(files.backupRecovery, snippet, "backup recovery runbook handoff");
  }
});

check("stream verification, feature inventory, and release records map v3.3 Step 8", () => {
  for (const snippet of [
    `| v3.3.0 (8) | \`./server.sh ${command}\` | Operator Runbook and Reliability Handoff.`,
    "source reliability workspace 사용 흐름",
    "docs index/UI guide/config/backup 문서 연결",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, real backup/restore, search/metrics PASS로 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 8");
  }
  for (const snippet of [
    `v3.3.0 (8) Operator Runbook and Reliability Handoff | \`SAFE-120\`, \`OPS-087\` | \`${command}\`, \`verify-docs-links\``,
    "SAFE-120 | V330 Step 8 operator runbook reliability handoff boundary",
    "OPS-087 | V330 Step 8 Operator Runbook and Reliability Handoff 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 8");
  }
  assert(rangeCovers(files.featureInventory, "SAFE", 123), "feature inventory SAFE range below 123");
  assert(rangeCovers(files.featureInventory, "OPS", 90), "feature inventory OPS range below 090");
  for (const snippet of [
    "V330 Operator Runbook and Reliability Handoff",
    `\`./server.sh ${command}\``,
    "v330 Step 8 RED operator runbook reliability handoff gate",
    "v330 Step 8 UI 풀테스트",
    "v330 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_operator_runbook_reliability_handoff.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SAFE-120", "OPS-087"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assert(rangeCovers(files.projectInventoryVerifier, "SAFE", 123), "project inventory SAFE range below 123");
  assert(rangeCovers(files.projectInventoryVerifier, "OPS", 90), "project inventory OPS range below 090");
  assertIncludes(files.scriptInventory, "verify_v330_operator_runbook_reliability_handoff.mjs", "script inventory");
});

check("runbook does not overclaim release, longrun, UI fulltest, search metrics, or backup handoff completion", () => {
  const runbookBlock = extractBlock(files.liveSourceHealth, "## Operator Runbook and Reliability Handoff", "## Verification Plan");
  for (const snippet of [
    "이 runbook은 UI 풀테스트 PASS가 아닙니다.",
    "이 runbook은 30분/120분 장시간 안정화 PASS가 아닙니다.",
    "이 runbook은 GitHub Release publish 또는 published metadata PASS가 아닙니다.",
    "이 runbook은 real ONVIF/WHEP/TURN/cloud field smoke PASS가 아닙니다.",
    "이 runbook은 Source Reliability Search and Metrics 완료가 아닙니다.",
    "이 runbook은 Ops Backup and Recovery Source Handoff 완료가 아닙니다.",
  ]) {
    assertIncludes(runbookBlock, snippet, "runbook no-overclaim boundary");
  }
});

check("SAFE-120 canonical operator runbook boundary", () => {
  const runbookBlock = extractBlock(files.liveSourceHealth, "## Operator Runbook and Reliability Handoff", "## Verification Plan");
  const runbookCommandDocumented = files.serverSh.includes("verify-v330-operator-runbook-reliability-handoff)");
  const handoffDocumented = files.liveSourceHealth.includes("Operator Runbook") && files.backupRecovery.includes("source") && files.featureInventory.includes("SAFE-120");
  const productMutationClaimed = !runbookBlock.includes("이 runbook은 Ops Backup and Recovery Source Handoff 완료가 아닙니다.") ||
    !runbookBlock.includes("이 runbook은 real ONVIF/WHEP/TURN/cloud field smoke PASS가 아닙니다.");
  const sourceRegistryWriteClaimed = !runbookBlock.includes("자동 recovery, 자동 registry mutation, PublishedView write, EventRecord/Event POST schema 변경은 이 runbook 범위가 아닙니다.");
  const safe120BoundaryObserved = runbookCommandDocumented && handoffDocumented && productMutationClaimed === false && sourceRegistryWriteClaimed === false;
  assert(safe120BoundaryObserved && (runbookCommandDocumented && handoffDocumented && productMutationClaimed === false && sourceRegistryWriteClaimed === false) && productMutationClaimed === false && sourceRegistryWriteClaimed === false,
    "SAFE-120 runbook handoff must remain documentation-only without product API/UI schema, SourceRegistry/PublishedView write, automatic recovery, or real backup/restore claims");
});

check("OPS-087 canonical runbook handoff gate", () => {
  const runbookBlock = extractBlock(files.liveSourceHealth, "## Operator Runbook and Reliability Handoff", "## Verification Plan");
  const runbookSourcesBound = files.liveSourceHealth.includes("Operator Runbook") &&
    files.docsIndex.includes("live-source-health.md") && files.uiGuide.includes("live-source-health.md") &&
    files.configReference.includes("live-source-health.md") && files.backupRecovery.includes("source");
  const excludedExecutionsRemainExplicit = [
    "UI 풀테스트",
    "30분/120분",
    "GitHub Release publish",
    "real ONVIF/WHEP/TURN/cloud field smoke",
  ].every((item) => runbookBlock.includes(item));
  const ops087GateObserved = runbookSourcesBound && excludedExecutionsRemainExplicit &&
    files.serverSh.includes("verify-v330-operator-runbook-reliability-handoff)");
  assert(ops087GateObserved && runbookSourcesBound && excludedExecutionsRemainExplicit,
    "OPS-087 runbook source/link/dispatch and explicit UI/long-run/publish/field-smoke exclusion boundary missing");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 operator runbook and reliability handoff ==");
console.log("- step: v3.3.0 (8)");
console.log("- source-of-truth: docs/live-source-health.md#operator-runbook-and-reliability-handoff");
console.log("- linked docs: docs/README.md, docs/ui-guide.md, docs/config-reference.md, docs/ops-backup-recovery.md");
console.log("- unchanged: product API schema, EventRecord/Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, SourceRegistry/PublishedView writes");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
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
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function rangeCovers(text, prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...text.matchAll(pattern)];
  return matches.some((match) => Number.parseInt(match[1], 10) >= minimum);
}

function extractBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  assert(startIndex >= 0, `missing block start: ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `missing block end after ${start}: ${end}`);
  return text.slice(startIndex, endIndex);
}
