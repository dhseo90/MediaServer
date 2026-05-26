#!/usr/bin/env node
// 파일 용도: Auth/session/scope 회귀 matrix를 role, route, secret redaction, invite/request 단위로 고정한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Auth regression matrix verification

Usage:
  ./server.sh verify-auth-regression-matrix [options]

Options:
  --report <path>       Markdown matrix report를 저장합니다.
  --json-report <path>  JSON matrix report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - admin/operator/viewer/integrator role, session, invite/request, scope, redaction row를 개별 matrix로 기록
  - verify-auth-bootstrap/users/routes와 UI evidence 경계가 각 row를 커버하는지 정적으로 확인
  - operator-provided password env가 없으면 auth smoke를 시작하지 않는 정책을 유지
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const rows = authRows();
const checks = [];

check("auth workflow requires operator-provided password env values", () => {
  const workflow = readText("scripts/internal/verify_auth_workflow.sh");
  for (const snippet of [
    "require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
    "require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
    "require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
    "require_auth_secret_env MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
    "Auth verifier passwords must be provided by the test operator",
    "auth verifier password env values must be distinct",
  ]) {
    assert(workflow.includes(snippet), `auth workflow missing password env policy: ${snippet}`);
  }
});

check("auth bootstrap/users/routes wrappers map to workflow modes", () => {
  const bootstrap = readText("scripts/internal/verify_auth_bootstrap.sh");
  const users = readText("scripts/internal/verify_auth_users.sh");
  const routes = readText("scripts/internal/verify_auth_routes.sh");
  assert(bootstrap.includes("verify_auth_workflow.sh\" bootstrap"), "verify-auth-bootstrap wrapper drifted");
  assert(users.includes("verify_auth_workflow.sh\" users"), "verify-auth-users wrapper drifted");
  assert(routes.includes("verify_auth_workflow.sh\" routes"), "verify-auth-routes wrapper drifted");
});

check("session and password lifecycle rows are covered", () => {
  const workflow = [
    readText("scripts/internal/verify_auth_workflow.sh"),
    readText("scripts/internal/verify_ops_ui_click_e2e.mjs"),
  ].join("\n");
  for (const snippet of [
    "logout invalidates session",
    "admin reset forces next-login password change",
    "password history reuse rejected",
    "admin disables viewer",
    "disabled user login rejected",
    "lockout-smoke",
    "auth:last-admin-guard",
  ]) {
    assert(workflow.includes(snippet), `auth workflow missing session/password snippet: ${snippet}`);
  }
});

check("role and scope guard rows are covered", () => {
  const workflow = readText("scripts/internal/verify_auth_workflow.sh");
  for (const snippet of [
    "operator login route",
    "readonly operator login route",
    "viewer login route",
    "integrator login keeps API-only landing",
    "viewer ops denied",
    "readonly operator ops read allowed",
    "source write scope required for view create",
    "rule write scope required for lab rule write",
    "integrator event scope allowed",
    "integrator metadata scope allowed",
    "integrator dashboard scope denied",
  ]) {
    assert(workflow.includes(snippet), `auth workflow missing role/scope snippet: ${snippet}`);
  }
});

check("invite/request and secret redaction rows are covered", () => {
  const workflow = readText("scripts/internal/verify_auth_workflow.sh");
  for (const snippet of [
    "invite token issued once",
    "invite list API exposed token material",
    "pending invite does not change existing role/scope",
    "pending invite future scope not applied",
    "accepted invite revokes previous session",
    "approved request keeps user pending until invite setup",
    "approved request viewer login",
    "hash leaked in user API",
    "ONVIF import draft leaked credential or endpoint",
    "client WebRTC wrapper leaked internal signaling detail",
  ]) {
    assert(workflow.includes(snippet), `auth workflow missing invite/redaction snippet: ${snippet}`);
  }
});

check("viewer/integrator client redaction rows are covered", () => {
  const workflow = readText("scripts/internal/verify_auth_workflow.sh");
  for (const snippet of [
    "viewer assigned view visible in client API",
    "viewer unassigned view hidden from client API",
    "viewer client live layout preference rejects source URL material",
    "viewer cross-view dashboard denied",
    "viewer cross-view WebRTC wrapper denied",
    "viewer generic WebRTC denied",
    "viewer WHEP denied",
    "viewer WHIP publish denied",
    "viewer metadata websocket denied",
    "client WebRTC wrapper source override denied",
  ]) {
    assert(workflow.includes(snippet), `auth workflow missing viewer redaction/scope snippet: ${snippet}`);
  }
});

check("docs and inventory expose the auth regression matrix", () => {
  const docs = [
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/development-backlog.md"),
  ].join("\n");
  for (const snippet of [
    "verify-auth-regression-matrix",
    "media-server.auth-session-scope-regression-matrix.v1",
    "Auth/session/scope regression matrix",
  ]) {
    assert(docs.includes(snippet), `auth regression docs missing snippet: ${snippet}`);
  }
});

const report = {
  schema: "media-server.auth-session-scope-regression-matrix.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  summary: {
    rows: rows.length,
    authBootstrapRows: rows.filter(row => row.verifiers.includes("verify-auth-bootstrap")).length,
    authUsersRows: rows.filter(row => row.verifiers.includes("verify-auth-users")).length,
    authRoutesRows: rows.filter(row => row.verifiers.includes("verify-auth-routes")).length,
    uiEvidenceRows: rows.filter(row => row.uiEvidenceRequired === true).length,
  },
  rows,
  checks: [],
};

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    report.status = "fail";
    report.checks.push({ name: item.name, status: "fail", message: error instanceof Error ? error.message : String(error) });
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== Auth regression matrix summary ==");
console.log(`- rows: ${report.summary.rows}`);
console.log(`- UI evidence rows: ${report.summary.uiEvidenceRows}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(report));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
if (fail > 0) process.exit(1);

function authRows() {
  return [
    row("AUTH-MAT-001", "admin", "/setup", "missing users file or admin passwordHash redirects to setup", ["verify-auth-bootstrap"], true, ["AUTH-005", "UI-001"]),
    row("AUTH-MAT-002", "admin", "/login", "session login, whoami, logout invalidation", ["verify-auth-bootstrap"], true, ["AUTH-016", "AUTH-017", "UI-005"]),
    row("AUTH-MAT-003", "admin", "/password/change", "password policy and password history reuse rejection", ["verify-auth-bootstrap", "verify-auth-users"], true, ["AUTH-006", "AUTH-009", "UI-003"]),
    row("AUTH-MAT-004", "admin", "/ops/users", "reset password forces must-change and revokes prior session", ["verify-auth-users"], true, ["AUTH-022"]),
    row("AUTH-MAT-005", "admin", "/ops/users", "last admin disable/role downgrade is blocked", ["verify-auth-users", "verify-ops-click-e2e --auth-ui-flow"], true, ["AUTH-023"]),
    row("AUTH-MAT-006", "admin", "/ops/users", "passwordHash/passwordHistory/tokenHash/invite tokenHash never appear in API/UI", ["verify-auth-users", "verify-auth-routes"], true, ["AUTH-012", "AUTH-013", "AUTH-014", "AUTH-015"]),
    row("AUTH-MAT-007", "operator", "/ops/home", "operator lands in ops and can perform allowed source/rule writes", ["verify-auth-routes"], true, ["AUTH-025", "AUTH-029"]),
    row("AUTH-MAT-008", "operator-readonly", "/ops/sources", "ops:read can read but source/rule/user writes are blocked", ["verify-auth-routes"], true, ["AUTH-028"]),
    row("AUTH-MAT-009", "viewer", "/client/live", "viewer lands in client, assigned view only, ops/lab/generic media denied", ["verify-auth-routes", "verify-ops-client-ui"], true, ["AUTH-026", "AUTH-030", "CLIENT-001", "CLIENT-011"]),
    row("AUTH-MAT-010", "viewer", "/client/dashboard", "cross-view dashboard/session access denied", ["verify-auth-routes"], true, ["CLIENT-006", "CLIENT-011"]),
    row("AUTH-MAT-011", "viewer", "/client/live", "source URL/raw/internal session material is rejected or hidden", ["verify-auth-routes", "verify-ops-client-ui"], true, ["CLIENT-014", "SAFE-018"]),
    row("AUTH-MAT-012", "integrator", "/auth/whoami", "integrator keeps API-only landing and cannot enter client shell", ["verify-auth-routes"], true, ["AUTH-027"]),
    row("AUTH-MAT-013", "integrator", "/client/api/views/{id}", "metadata/event scopes allowed, dashboard/live view list denied", ["verify-auth-routes"], false, ["AUTH-027", "CLIENT-008"]),
    row("AUTH-MAT-014", "public", "/client/request-access", "request submit is public but pending creates no user/session/view scope", ["verify-auth-users", "verify-ops-click-e2e --auth-ui-flow"], true, ["AUTH-036", "AUTH-039", "UI-008"]),
    row("AUTH-MAT-015", "admin", "/ops/users access requests", "approve creates one-time invite; reject creates no user/session/scope", ["verify-auth-users", "verify-ops-click-e2e --auth-ui-flow"], true, ["AUTH-037", "AUTH-038"]),
    row("AUTH-MAT-016", "invite", "/invite/setup", "invite setup applies role/scope only after token acceptance and revokes previous session", ["verify-auth-users"], true, ["AUTH-033", "AUTH-034", "UI-007"]),
    row("AUTH-MAT-017", "unauth", "generic media/session routes", "unauth generic WebRTC/WHEP/WS metadata denied", ["verify-auth-routes"], false, ["AUTH-041", "MEDIA-009"]),
    row("AUTH-MAT-018", "viewer", "generic media/session routes", "viewer generic WebRTC/WHEP/WHIP/WS metadata denied outside client wrapper", ["verify-auth-routes"], false, ["AUTH-026", "MEDIA-009"]),
    row("AUTH-MAT-019", "session", "WebRTC follow-up", "session capability token required for generic follow-up and client alias cannot be used on generic route", ["verify-auth-routes"], false, ["AUTH-040", "CLIENT-002"]),
    row("AUTH-MAT-020", "all roles", "auth store", "users file mode remains 600 and secret values are not defaulted by verifier", ["verify-auth-bootstrap", "verify-auth-users", "verify-auth-routes"], false, ["AUTH-001", "AUTH-002"]),
  ];
}

function row(id, actor, surface, scenario, verifiers, uiEvidenceRequired, featureIds) {
  return {
    id,
    actor,
    surface,
    scenario,
    verifiers,
    uiEvidenceRequired,
    featureIds,
    expectedVerdict: "PASS",
  };
}

function renderMarkdown(payload) {
  const lines = [
    "# Auth Session Scope Regression Matrix",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    `- rows: ${payload.summary.rows}`,
    `- UI evidence rows: ${payload.summary.uiEvidenceRows}`,
    "",
    "| ID | Actor | Surface | Scenario | Verifiers | UI Evidence | Feature IDs |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of payload.rows) {
    lines.push([
      item.id,
      item.actor,
      item.surface,
      item.scenario,
      item.verifiers.join(", "),
      item.uiEvidenceRequired ? "required" : "not-required",
      item.featureIds.join(", "),
    ].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
