#!/usr/bin/env node
// 파일 용도: Ops audit trail의 서버 영속 저장 API와 UI 연동 hook을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("server exposes persistent ops audit API", () => {
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    "/ops/api/audit",
    "OpsAuditStoragePath",
    ".media_server.ops_audit.jsonl",
    "AppendOpsAuditRecord",
    "OpsAuditEntriesJson",
    "OpsAuditEntriesCsv",
    "OpsAuditEntriesDiffJson",
    "OpsAuditRetentionDays",
    "MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS",
    "searchIndex",
    "\"target\"",
    "\"user\"",
    "ops-audit-diff.json",
    "\"offset\"",
    "\\\"hasMore\\\"",
    "RedactAuditJsonFragment",
    "persistent\\\":true",
    "Content-Disposition",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `server audit persistence is missing snippet: ${snippet}`);
  }
});

check("shared UI writes audit records to server and falls back locally", () => {
  const shared = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "persistOpsAuditTrail",
    "fetchOpsAuditTrailPage",
    "fetchOpsAuditTrail",
    "auditQueryParams",
    "opsAuditViewStates",
    "openOpsAuditDetail",
    "data-audit-export=\"diff-json\"",
    "-audit-user",
    "-audit-target",
    "requestJson('/ops/api/audit'",
    "server audit unavailable",
    "서버 감사 로그",
    "브라우저 캐시",
    "JSON",
    "CSV",
  ];
  for (const snippet of required) {
    assert(shared.includes(snippet), `shared audit UI is missing snippet: ${snippet}`);
  }
});

check("audit persistence has visible source label styling", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  assert(css.includes(".audit-source-label"), "audit source label CSS is missing");
  assert(css.includes(".audit-detail-modal"), "audit detail modal CSS is missing");
  assert(css.includes(".audit-filter-grid"), "audit filter CSS is missing");
});

check("docs describe persistent audit scope", () => {
  const docs = readText("docs/ui-guide.md");
  assert(docs.includes("서버 감사 로그"), "ui-guide is missing server audit log wording");
  assert(docs.includes("JSON/CSV export"), "ui-guide is missing audit export wording");
  assert(docs.includes("Diff JSON export"), "ui-guide is missing audit diff export wording");
  assert(docs.includes("MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS"), "ui-guide is missing audit retention env wording");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Ops audit persistence verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
