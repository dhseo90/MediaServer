#!/usr/bin/env node
// 파일 용도: 운영자 화면의 audit trail UI, helper, mutation 기록 연결이 유지되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("shared product UI script provides local audit trail helpers", () => {
  const shared = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "mediaServerOpsAuditTrail.v1",
    "recordOpsAudit",
    "renderOpsAuditTrail",
    "opsAuditViewStates",
    "fetchOpsAuditTrailPage",
    "openOpsAuditDetail",
    "data-audit-export",
    "auditKeyRedacted",
    "password|token|hash|secret|capability",
    "before",
    "after",
  ];
  for (const snippet of required) {
    assert(shared.includes(snippet), `product_ui_js.cpp is missing audit helper snippet: ${snippet}`);
  }
});

check("ops channel/rule/user pages expose audit panels", () => {
  const html = readText("src/ingress/webrtc_http_server.cpp");
  const required = [
    'id="channel-audit-list"',
    'data-audit-area="channels"',
    'id="ops-rules-audit-list"',
    'data-audit-area="rules"',
    'id="user-audit-list"',
    'data-audit-area="users"',
  ];
  for (const snippet of required) {
    assert(html.includes(snippet), `webrtc_http_server.cpp is missing audit panel snippet: ${snippet}`);
  }
});

check("ops page scripts record channel/rule/user mutations", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "area: 'channels'",
    "target: `channel:${channelId}`",
    "target: `channel:${id}`",
    "area: 'rules'",
    "target: `va-rule:${payload.id}`",
    "target: `event-template:${payload.id}`",
    "target: `profile:${payload.id}`",
    "area: 'users'",
    "target: `user:${payload.username}`",
    "target: `request:${request.requestId}`",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `product_ui_page_scripts.cpp is missing audit mutation snippet: ${snippet}`);
  }
});

check("audit layout has mobile-safe CSS", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".audit-list",
    ".audit-controls",
    ".audit-filter-grid",
    ".audit-entry",
    ".audit-detail-modal",
    ".audit-diff-grid",
    ".audit-entry-meta",
    "@media (max-width: 560px)",
  ];
  for (const snippet of required) {
    assert(css.includes(snippet), `product_ui_css.cpp is missing audit CSS snippet: ${snippet}`);
  }
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
console.log("== Ops audit trail verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
