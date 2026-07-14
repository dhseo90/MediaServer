#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
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
    "auditFilterPresetsFor",
    "auditHashStateFor",
    "auditPreset",
    "auditAction",
    "auditTarget",
    "auditQ",
    'data-audit-preset="',
    "data-audit-export",
    "<option value=\"reset-password\">비밀번호 초기화</option>",
    "auditKeyRedacted",
    "password|token|hash|secret|credential|capability",
    "before",
    "after",
  ];
  for (const snippet of required) {
    assert(shared.includes(snippet), `product_ui_js.cpp is missing audit helper snippet: ${snippet}`);
  }
});

check("ops pages expose audit panels", () => {
  const html = readWebRtcHttpServerBundle(readText);
  const required = [
    'id="channel-audit-list"',
    'data-audit-area="channels"',
    'id="ops-rules-audit-list"',
    'data-audit-area="rules"',
    'id="user-audit-list"',
    'data-audit-area="users"',
    "서버 감사 로그에서 채널 변경",
    "서버 감사 로그에서 룰 변경",
    "서버 감사 로그에서 사용자 변경",
  ];
  for (const snippet of required) {
    assert(html.includes(snippet), `webrtc_http_server.cpp is missing audit panel snippet: ${snippet}`);
  }
});

check("ops page scripts record audited mutations", () => {
  const script = [
    "src/ingress/product_ui_page_scripts.cpp",
    "src/ingress/product_ui_ops_sources_script.cpp",
    "src/ingress/product_ui_ops_users_script.cpp",
  ].map(readText).join("\n");
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
    "action: 'reset-password'",
    "target: `request:${request.requestId}`",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `ops page scripts are missing audit mutation snippet: ${snippet}`);
  }
});

check("source health state changes write channel audit records", () => {
  const server = readWebRtcHttpServerBundle(readText);
  const required = [
    "g_source_health_audit_state",
    "AppendOpsSourceHealthAuditChanges",
    "source-health-state-change",
    "\\\"target\\\":\\\"source:",
    "SourceHealthAuditRecordBody",
  ];
  for (const snippet of required) {
    assert(server.includes(snippet), `source health audit hook is missing snippet: ${snippet}`);
  }
});

check("audit layout has mobile-safe CSS", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const required = [
    ".audit-list",
    ".audit-controls",
    ".audit-presets",
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
