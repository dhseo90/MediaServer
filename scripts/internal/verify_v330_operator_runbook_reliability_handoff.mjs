#!/usr/bin/env node
// 파일 용도: 라이브 입력 운영 안내의 현행 계약·문서·검증 연결을 확인한다. 과거 실행 원장은 읽지 않는다.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from "./script_arg_utils.mjs";
import {hasDocumentLink, validateFeatureDocumentation, validateVerificationDocumentation, validateUiPolicyDocumentation} from "./documentation_contract_lib.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import {parseServerDispatches} from "./script_dispatch_parser.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`운영 runbook 문서 연결 검사
Usage: ./server.sh verify-v330-operator-runbook-reliability-handoff
현행 계약 식별자·기능 정의·문서 및 독립 실행 명령만 확인합니다.
문장/제목/과거 완료 기록을 고정하지 않으며 제품·실제 UI·장시간·복구·공개 실행을 수행하지 않습니다.
색인 도달성·링크/앵커 유효성은 verify-docs-links에서 별도로 확인합니다.`);
assertKnownOptions(args, ["h", "help"]);
const command = "verify-v330-operator-runbook-reliability-handoff";
const featureIds = ["SAFE-120", "OPS-087"];
const checks = [];

check("현행 기능 정의와 독립 명령 연결", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const implementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  const errors = validateFeatureDocumentation({
    document: readText("docs/live-source-health.md"),
    identifiers: ["media-server.ops.source-health.v1", "media-server.ops.source-health.bulk.v1", "retryBody"],
    command, script: "verify_v330_operator_runbook_reliability_handoff.mjs", featureIds,
    inventory, implementation, verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  for (const id of featureIds) {
    const entries = implementation.items.filter(item => item.id === id);
    if (entries.length !== 1 || entries[0].verifierEvidence?.command !== command) errors.push(id + " 명령 연결 누락·중복·불일치");
  }
  assert(errors.length === 0, errors.join("; "));
});

check("OPS-087 canonical runbook handoff gate", () => {
  const guide = readText("docs/live-source-health.md");
  const documentErrors = validateRunbookConnections(guide);
  const ops087GateObserved = documentErrors.length === 0;
  assert(ops087GateObserved, "OPS-087: " + documentErrors.join("; "));
});

check("SAFE-120 canonical operator runbook boundary", () => {
  const guide = readText("docs/live-source-health.md");
  const policyErrors = validateRunbookPolicyConnections(guide);
  const safe120BoundaryObserved = policyErrors.length === 0;
  assert(safe120BoundaryObserved, "SAFE-120: " + policyErrors.join("; "));
});

check("분리된 진단·문서 검사 안내와 실제 dispatch", () => {
  // 전용 안내에 있는 명령을 중앙 문서에도 중복 복사하도록 강제하지 않는다.
  const verification = ["docs/stream-verification.md", "docs/live-source-health.md", "docs/ops-backup-recovery.md"]
    .map(readText).join("\n");
  const dispatches = parseServerDispatches(readText("server.sh"));
  for (const [name, script] of [
    [command, "verify_v330_operator_runbook_reliability_handoff.mjs"],
    ["verify-docs-links", "verify_docs_links.mjs"],
    ["verify-ops-source-health-bulk", "verify_ops_source_health_bulk.mjs"],
    ["verify-ops-audit-trail", "verify_ops_audit_trail.mjs"],
    ["verify-ops-source-lifecycle", "verify_ops_source_lifecycle.mjs"],
    ["verify-ops-backup-restore-dry-run", "verify_ops_backup_restore_dry_run.mjs"],
  ]) {
    const targets = dispatches.filter(item => item.command === name);
    assert(verification.includes(name) && targets.length === 1 && targets[0].script === script,
      name + " 안내/dispatch 누락·중복·대상 불일치");
  }
});

check("전수 기능 검증과 필수 ID 연결", () => {
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const inventory = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  assert(coverage.includes("validateImplementationManifest") && coverage.includes("verifierEvidenceRows === rows.length"),
    "전수 기능 manifest 검사 연결 누락");
  for (const id of featureIds) assert(inventory.includes('"' + id + '"'), id + " 필수 기능 검사 연결 누락");
});

let pass = 0, fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log("[pass] " + item.name); }
  catch (error) { fail += 1; console.log("[fail] " + item.name + ": " + error.message); }
}
console.log("");
console.log("== v3.3.0 operator runbook and reliability handoff ==");
console.log("- source-of-truth: docs/live-source-health.md");
console.log("- scope: current documentation wiring; no execution evidence");
for (const key of ["uiFulltest", "longrun30Or120", "publishedMetadata", "backupRestore", "searchMetrics", "fieldSmoke"])
  console.log("- " + key + ": not-run-by-this-command");
console.log("- unchanged: product API/schema/media, SourceRegistry/PublishedView writes, automatic recovery");
console.log("- pass: " + pass);
console.log("- fail: " + fail);
if (fail > 0) process.exit(1);

function validateRunbookConnections(guide) {
  const errors = [];
  for (const identifier of ["/ops/api/source-registry/snapshot", "/ops/api/source-registry/onboarding-quality",
    "/ops/api/source-registry/reliability-timeline", "/ops/api/events/reviews", "/client/live", "/client/dashboard"]) {
    if (!guide.includes(identifier)) errors.push("운영 안내 식별자 누락: " + identifier);
  }
  for (const file of ["ui-guide.md", "config-reference.md", "ops-backup-recovery.md"]) {
    if (!hasDocumentLink(guide, file)) errors.push("운영 안내의 담당 문서 링크 누락: " + file);
    if (!hasDocumentLink(readText("docs/" + file), "live-source-health.md")) errors.push(file + ": 운영 안내 링크 누락");
  }
  // 전체 문서 그래프의 색인 도달성/앵커는 verify-docs-links가 담당한다.
  return errors;
}
function validateRunbookPolicyConnections(guide) {
  const errors = [];
  for (const identifier of ["dry-run", "SourceRegistry", "PublishedView"])
    if (!guide.includes(identifier)) errors.push("읽기/변경 경계 식별자 누락: " + identifier);
  for (const file of ["stream-verification.md", "manual-ui-fulltest.md", "release-policy.md"])
    if (!hasDocumentLink(guide, file)) errors.push("독립 검증/공개 기준 링크 누락: " + file);
  const agents = readText("AGENTS.md");
  const uiPolicy = JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  errors.push(...validatePolicy(uiPolicy));
  errors.push(...validateUiPolicyDocumentation({agents, fulltest: readText("docs/manual-ui-fulltest.md"), policy: uiPolicy}));
  errors.push(...validateVerificationDocumentation({agents, verification: readText("docs/stream-verification.md")}));
  // 문장 의미는 전문 검토 대상이다. 단어 존재를 실제 동작/미실행의 증명으로 삼지 않는다.
  return errors;
}
function check(name, fn) { checks.push({name, fn}); }
function assert(value, message) { if (!value) throw new Error(message); }
function readText(relative) { return fs.readFileSync(path.join(rootDir, relative), "utf8"); }
