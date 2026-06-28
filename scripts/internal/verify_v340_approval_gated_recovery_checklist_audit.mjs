#!/usr/bin/env node
// 파일 용도: v3.4.0 Step 7 approval-gated recovery checklist/audit 구현과 문서 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Approval-Gated Recovery Checklist and Audit verification

Usage:
  ./server.sh verify-v340-approval-gated-recovery-checklist-audit

Checks:
  - Ops-only read model exposes operator note, ready/blocked/field-smoke-needed/not-run status, dry-run result, and audit linkage
  - /ops/sources renders the checklist read-only and does not perform automatic recovery
  - client/viewer scripts do not expose checklist internals, source locator, raw JSON, debug, or credential material
  - backlog, stream verification, release records, manual UI checklist, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-approval-gated-recovery-checklist-audit";
const schema = "media-server.ops.v340-approval-gated-recovery-checklist.v1";
const route = "/ops/api/source-registry/approval-gated-recovery-checklist";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  registry: readText("src/ingress/source_view_registry.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  manualUi: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops API exposes approval-gated recovery checklist read model", () => {
  for (const snippet of [
    "OpsV340ApprovalGatedRecoveryChecklistJson",
    "BuildV340ApprovalGatedRecoveryChecklist",
    route,
    schema,
    "approvalGatedRecoveryChecklistSummary",
    "approvalGatedRecoveryChecklistItems",
    "operatorNote",
    "ready",
    "blocked",
    "field-smoke-needed",
    "not-run",
    "dryRunResult",
    "opsAuditLinkage",
    "automaticRecoveryPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
  ]) {
    assertIncludes(files.server, snippet, "v340 approval-gated recovery checklist server");
  }
});

check("/ops/sources declares approval-gated recovery checklist UI shell", () => {
  for (const snippet of [
    "ops-approval-gated-recovery-checklist",
    "source-recovery-checklist-status",
    "source-recovery-checklist-ready-count",
    "source-recovery-checklist-blocked-count",
    "source-recovery-checklist-field-smoke-needed-count",
    "source-recovery-checklist-not-run-count",
    "source-recovery-checklist-list",
    "data-source-recovery-checklist",
    schema,
  ]) {
    assertIncludes(files.server, snippet, "v340 approval-gated recovery checklist HTML");
  }
});

check("/ops/sources renders operator note, status, dry-run result, and audit route", () => {
  for (const snippet of [
    "renderApprovalGatedRecoveryChecklistAudit",
    `requestJson('${route}')`,
    "approvalGatedRecoveryChecklistSummary",
    "approvalGatedRecoveryChecklistItems",
    "operatorNote",
    "readinessStatus",
    "dryRunResult",
    "opsAuditLinkage",
    "data-source-recovery-checklist-item",
    "data-source-recovery-checklist-status",
    "automaticRecoveryPerformed",
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "v340 approval-gated recovery checklist renderer");
  }
});

check("approval-gated checklist styling and smoke markers are tracked", () => {
  for (const snippet of [
    ".source-recovery-checklist-grid",
    ".source-recovery-checklist-list",
    ".source-recovery-checklist-card",
    ".source-recovery-checklist-boundary",
  ]) {
    assertIncludes(files.css, snippet, "v340 approval-gated recovery checklist CSS");
  }
  for (const snippet of [
    "ops-approval-gated-recovery-checklist",
    "source-recovery-checklist-status",
    schema,
    route,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.4 Step 7 marker");
  }
});

check("client/viewer surfaces do not expose approval-gated recovery checklist material", () => {
  for (const forbidden of [
    schema,
    "source-recovery-checklist",
    "approvalGatedRecoveryChecklistItems",
    "operatorNote",
    "opsAuditLinkage",
    "dryRunResult",
    "approval-gated-recovery-checklist",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 7 recovery checklist material: ${forbidden}`);
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "operatorNote",
    "opsAuditLinkage",
    "rawLocator",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap records v3.4 Step 7 without overclaiming digest or export", () => {
  for (const snippet of [
    "| 7 | v3.4.0 (7) Approval-Gated Recovery Checklist and Audit | P1 | 완료 |",
    "## v3.4.0 Step 7 개발 기록",
    "OpsV340ApprovalGatedRecoveryChecklistJson",
    "renderApprovalGatedRecoveryChecklistAudit",
    `\`./server.sh ${command}\``,
    "Client-safe Maintenance Digest 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 7");
  }
});

check("stream verification exposes v3.4 Step 7 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (7) | \`./server.sh ${command}\` | Approval-Gated Recovery Checklist and Audit.`,
    "/ops/sources",
    "operator note, ready/blocked/field-smoke-needed/not-run 상태",
    "automatic recovery",
    "source URL/raw locator/raw JSON/debug/credential material",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 7");
  }
});

check("feature inventory, manual UI, and release records map v3.4 Step 7", () => {
  for (const snippet of [
    `v3.4.0 (7) Approval-Gated Recovery Checklist and Audit | \`UI-076\`, \`SAFE-130\`, \`OPS-097\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-076 | V340 Step 7 Approval-Gated Recovery Checklist and Audit UI",
    "SAFE-130 | V340 Step 7 approval-gated recovery no-auto boundary",
    "OPS-097 | V340 Step 7 Approval-Gated Recovery Checklist and Audit 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-079`",
    "`SAFE-001`~`SAFE-134`",
    "`OPS-035`~`OPS-101`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 7");
  }
  for (const snippet of [
    "| V340 Step 7 Approval-Gated Recovery Checklist and Audit | `UI-076`, `SAFE-130`, `OPS-097` | `/ops/sources` |",
    "Approval-Gated Recovery Checklist",
    schema,
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.4 Step 7");
  }
  for (const snippet of [
    "V340 Approval-Gated Recovery Checklist and Audit",
    `\`./server.sh ${command}\``,
    "v340 Step 7 RED approval-gated recovery checklist audit gate",
    "v340 Step 7 approval-gated recovery checklist audit final",
    "v340 Step 7 UI 풀테스트",
    "v340 Step 7 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 7");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 7 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_approval_gated_recovery_checklist_audit.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-076", "SAFE-130", "OPS-097"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-018`, `UI-022`~`UI-079`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-134`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-101`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v340_approval_gated_recovery_checklist_audit.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 approval-gated recovery checklist and audit ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (7)");
console.log("- route: /ops/sources");
console.log("- shows: operator note, readiness status, dry-run result, ops audit linkage");
console.log("- automaticRecovery: not-run-by-this-command");
console.log("- clientExposure: false");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
