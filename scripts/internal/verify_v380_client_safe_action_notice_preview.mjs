#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 11 Client-safe Action Notice Preview 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Client-safe Action Notice Preview verification

Usage:
  ./server.sh verify-v380-client-safe-action-notice-preview

Checks:
  - /client/api/views/{id}/events and dashboard payloads expose a viewer-safe action notice preview
  - client live/dashboard/events render only maintenance/degraded/recovering/available status and timeline fields
  - internal blocker, approval, readiness, source locator, credential, raw diagnostic, and Ops-only action material stay out of client scripts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-client-safe-action-notice-preview";
const schema = "media-server.client.v380-action-notice-preview.v1";
const featureIds = ["UI-103", "CLIENT-040", "SAFE-190", "OPS-157"];
const files = loadFiles();
const checks = [];

check("client API builds the v3.8 client-safe action notice preview payload", () => {
  for (const snippet of [
    "struct ClientActionNoticePreview",
    "ClientActionNoticePreviewStatusFor",
    "ClientActionNoticePreviewFor",
    "AppendClientActionNoticePreviewJson",
    "ClientActionNoticePreviewJson",
    schema,
    "viewerSafeActionNoticePreview",
    "clientActionNoticePreview",
    "noticeStatusCatalog",
    "maintenance",
    "degraded",
    "recovering",
    "available",
  ]) {
    assertIncludes(files.server, snippet, "v380 client-safe action notice server model");
  }
});

check("client API appends action notice preview to events and dashboard without restricted material", () => {
  for (const snippet of [
    "ClientActionNoticePreviewJson(",
    "client_action_notice_preview_json",
    "clientActionNoticePreview",
    "viewerSafe",
    "previewOnly",
    "statusTimelineOnly",
    "operatorOnlyBlockerDetailIncluded",
    "approvalDecisionDetailIncluded",
    "readinessBlockerDetailIncluded",
    "actionExecutionPerformed",
    "clientNoticeSent",
    "noticeDraftPersisted",
    "noticeQueueWritePerformed",
    "eventPostPayloadChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(files.server, snippet, "v380 client action notice payload append");
  }
  for (const forbidden of [
    "/ops/api/actions/",
    "approvalDecisionGate",
    "actionReadinessPreflight",
    "readiness-blocked",
    "client-notice-send-disabled",
    "operator-detail-hidden",
    "auditRef",
    "reviewer",
    "sourceLocator",
    "credential",
  ]) {
    assert(!clientPayloadBlock().includes(forbidden), `client action notice payload must not expose restricted material: ${forbidden}`);
  }
});

check("client renderer shows action notice preview on dashboard, events, and live dock", () => {
  for (const snippet of [
    "renderClientActionNoticePreview",
    "clientActionNoticePreview",
    "client-action-notice-preview",
    "data-testid=\"client-action-notice-preview\"",
    "data-client-action-notice-preview=\"viewer-safe\"",
    schema,
    "client-action-notice-list",
    "client-action-notice-item",
    "maintenance",
    "degraded",
    "recovering",
    "available",
    "events.clientActionNoticePreview",
  ]) {
    assertIncludes(files.clientScripts, snippet, "v380 client action notice renderer");
  }
});

check("client renderer does not expose internal blocker or Ops-only action details", () => {
  for (const forbidden of [
    "/ops/api/actions/",
    "approvalDecisionGate",
    "actionReadinessPreflight",
    "readiness-blocked",
    "client-notice-send-disabled",
    "operator-detail-hidden",
    "auditRef",
    "reviewer",
    "idempotencyKey",
    "runbookId",
    "sourceRecheck",
    "ruleDraftActionPackage",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose action notice internal material: ${forbidden}`);
  }
});

check("client action notice styling is stable and fits existing client cards", () => {
  for (const snippet of [
    ".client-action-notice-preview",
    ".client-action-notice-list",
    ".client-action-notice-item",
  ]) {
    assertIncludes(files.css, snippet, "v380 client action notice CSS");
  }
});

check("docs, inventory, and dispatch map v3.8 Step 11 without overclaiming UI fulltest or longrun", () => {
  for (const snippet of [
    "| 11 | v3.8.0 (11) Client-safe Action Notice Preview | P1 | 완료 |",
    "## v3.8.0 Step 11 개발 기록",
    "ClientActionNoticePreviewJson",
    "renderClientActionNoticePreview",
    "client-action-notice-preview",
    `\`./server.sh ${command}\``,
    "Outcome Observer and Reconciliation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 11");
  }
  assertIncludes(
    files.streamVerification,
    `| v3.8.0 (11) | \`./server.sh ${command}\` | Client-safe Action Notice Preview.`,
    "stream verification v3.8 Step 11",
  );
  assertIncludes(files.featureInventory, "v3.8.0 (11) Client-safe Action Notice Preview", "feature inventory v3.8 Step 11");
  for (const id of featureIds) {
    assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.releaseRecords, "V380 Client-safe Action Notice Preview", "release records v3.8 Step 11");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.8 Step 11");
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_client_safe_action_notice_preview.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v380_client_safe_action_notice_preview.mjs", "script inventory");
});

finish("== v3.8.0 Client-safe Action Notice Preview summary ==", {
  schema,
  step: "v3.8.0 (11)",
  route: "/client/api/views/{id}/events",
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
    css: readText("src/ingress/product_ui_css.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function clientPayloadBlock() {
  return extractBlock(files.server, "std::string ClientViewEventsJson", "std::string ClientViewMetadataJson");
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- exposure: viewer-safe statuses and timeline only");
  console.log("- delivery: preview-only; no client notice sent");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) {
    process.exit(1);
  }
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[PASS] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[FAIL] ${item.name}`);
      console.log(`       ${error instanceof Error ? error.message : String(error)}`);
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
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing: ${snippet}`);
}
