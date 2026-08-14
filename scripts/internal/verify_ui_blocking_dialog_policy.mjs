#!/usr/bin/env node
// 파일 용도: 제품 UI와 UI 테스트 harness의 blocking dialog 허용/금지 정책을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI blocking dialog policy verification

Usage:
  ./server.sh verify-ui-blocking-dialog-policy [options]

Options:
  --report <path>       Markdown policy report를 저장합니다.
  --json-report <path>  JSON policy report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - product UI source does not use native alert/confirm/prompt
  - beforeunload cleanup remains non-blocking and does not request browser confirmation
  - in-page modal/dialog usage is allowlisted and non-mutating
  - dangerous actions use in-page two-step confirmation and autonomous UI fail-fast evidence
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const sourceTargets = [
  "src/ingress/product_ui_page_scripts.cpp",
  "src/ingress/product_ui_js.cpp",
];
const modalAllowlist = [
  {
    id: "opsAuditDetailDialog",
    className: "audit-detail-modal",
    functionName: "openOpsAuditDetail",
    reason: "read-only audit diff detail; closes with form method=dialog",
  },
];
const checks = [];
const payload = {
  schema: "media-server.ui-blocking-dialog-policy.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  summary: {
    policyRows: policyRows().length,
    findings: 0,
    allowedModals: modalAllowlist.length,
  },
  policy: policyRows(),
  modalAllowlist,
  findings: [],
  checks: [],
};

check("product UI native dialog APIs are forbidden", () => {
  const findings = scanActualSources().filter(item => item.category === "native-dialog");
  assert(findings.length === 0, formatFindings(findings));
});

check("beforeunload handlers remain non-blocking cleanup only", () => {
  const findings = scanActualSources().filter(item => item.category === "blocking-beforeunload");
  assert(findings.length === 0, formatFindings(findings));
  const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
  const beforeUnloadBlock = extractBeforeUnloadBlock(clientScript);
  assert(beforeUnloadBlock.includes("method: 'DELETE'") && beforeUnloadBlock.includes("keepalive: true"), "beforeunload cleanup block must use non-blocking DELETE keepalive");
  assert(!/returnValue|preventDefault\s*\(|alert\s*\(|confirm\s*\(|prompt\s*\(/.test(beforeUnloadBlock), "beforeunload cleanup block must not request a blocking dialog");
});

check("product modal usage is allowlisted and non-mutating", () => {
  const findings = scanActualSources().filter(item => item.category === "modal-allowlist");
  assert(findings.length === 0, formatFindings(findings));
  const ui = readText("src/ingress/product_ui_js.cpp");
  for (const allowed of modalAllowlist) {
    assert(ui.includes(allowed.id), `allowed modal missing id: ${allowed.id}`);
    assert(ui.includes(allowed.className), `allowed modal missing class: ${allowed.className}`);
    assert(ui.includes('method="dialog"'), `allowed modal must close through form method=dialog: ${allowed.id}`);
  }
});

check("manual UI and click harness document fail-fast blocking policy", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  const template = readText("docs/manual-ui-result-template.md");
  const clickE2e = readText("scripts/internal/verify_ops_ui_click_e2e.mjs");
  assertIncludes(fulltest, [
    "테스트 harness FAIL",
    "위험 action은 제품 화면 안 2회 확인 상태",
    "첫 클릭에는 write POST",
    "verify-ui-blocking-dialog-policy",
  ], "docs/manual-ui-fulltest.md");
  assertIncludes(checklist, [
    "native confirm/alert/prompt가 아니라 제품 화면 안",
    "첫 클릭에서 POST가",
    "발생하지",
    "않는지와",
    "verify-ui-blocking-dialog-policy",
  ], "docs/manual-ui-checklist.md");
  assertIncludes(template, [
    "verify-ui-blocking-dialog-policy",
    "blocking dialog policy",
  ], "docs/manual-ui-result-template.md");
  assertIncludes(clickE2e, [
    "native dialog 없이 제품 화면 안 2회 확인 흐름",
  ], "scripts/internal/verify_ops_ui_click_e2e.mjs");
});

check("blocking dialog policy command is wired into release docs", () => {
  const server = readText("server.sh");
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const text of [server, stream, inventory, coverage]) {
    assert(text.includes("verify-ui-blocking-dialog-policy"), "verify-ui-blocking-dialog-policy reference missing");
  }
  assert(inventory.includes("SAFE-021"), "feature inventory missing SAFE-021 blocking dialog policy row");
});

check("negative blocking dialog fixtures fail", () => {
  const nativeFindings = scanText("fixture.js", "window.confirm('delete?');");
  const unloadFindings = scanText("fixture.js", "window.addEventListener('beforeunload', event => { event.preventDefault(); event.returnValue = ''; });");
  const modalFindings = scanText("fixture.js", "function openDanger(){ const dialog = byId('dangerDeleteDialog'); dialog.showModal(); }");
  assert(nativeFindings.some(item => item.category === "native-dialog"), "native confirm fixture did not fail");
  assert(unloadFindings.some(item => item.category === "blocking-beforeunload"), "blocking beforeunload fixture did not fail");
  assert(modalFindings.some(item => item.category === "modal-allowlist"), "unallowlisted modal fixture did not fail");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    payload.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    payload.status = "fail";
    payload.checks.push({ name: item.name, status: "fail", message: error instanceof Error ? error.message : String(error) });
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

payload.findings = scanActualSources();
payload.summary.findings = payload.findings.length;

console.log("");
console.log("== UI blocking dialog policy summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- policyRows: ${payload.summary.policyRows}`);
console.log(`- allowedModals: ${payload.summary.allowedModals}`);
console.log(`- findings: ${payload.summary.findings}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function policyRows() {
  return [
    row("DIALOG-001", "native alert/confirm/prompt", "forbidden", "FAIL", "Browser native dialogs stop autonomous UI execution."),
    row("DIALOG-002", "blocking beforeunload confirmation", "forbidden", "FAIL", "beforeunload may send keepalive cleanup only; no preventDefault/returnValue."),
    row("DIALOG-003", "read-only in-page dialog", "allowlist", "PASS", "Allowed only when listed with non-mutating reason and close control."),
    row("DIALOG-004", "dangerous action confirmation", "in-page-two-step", "PASS", "First click arms UI state without write POST; second click performs action."),
    row("DIALOG-005", "manual user or OS popup wait", "forbidden", "FAIL", "Harness stalls are test FAIL, not product PASS evidence."),
    row("DIALOG-006", "explicit external exclusion", "exclusion-only", "PASS", "Only user-approved external/device exclusions stay outside feature PASS rows."),
  ];
}

function row(id, surface, policy, verdict, reason) {
  return { id, surface, policy, verdict, reason };
}

function scanActualSources() {
  return sourceTargets.flatMap(target => scanText(target, readText(target)));
}

function scanText(file, text) {
  return [
    ...scanNativeDialogCalls(file, text),
    ...scanBlockingBeforeUnload(file, text),
    ...scanModalAllowlist(file, text),
  ];
}

function scanNativeDialogCalls(file, text) {
  const patterns = [
    { pattern: "window.alert", regex: /\bwindow\s*\.\s*alert\s*\(/g },
    { pattern: "window.confirm", regex: /\bwindow\s*\.\s*confirm\s*\(/g },
    { pattern: "window.prompt", regex: /\bwindow\s*\.\s*prompt\s*\(/g },
    { pattern: "bare alert", regex: /(?<![\w$.])alert\s*\(/g },
    { pattern: "bare confirm", regex: /(?<![\w$.])confirm\s*\(/g },
    { pattern: "bare prompt", regex: /(?<![\w$.])prompt\s*\(/g },
  ];
  return scanLinePatterns(file, text, patterns, "native-dialog");
}

function scanBlockingBeforeUnload(file, text) {
  const findings = [];
  const regex = /addEventListener\s*\(\s*['"]beforeunload['"][\s\S]{0,800}?\}\s*\)\s*;?/g;
  for (const match of text.matchAll(regex)) {
    const snippet = match[0];
    if (!/\bpreventDefault\s*\(|\.returnValue\s*=|return\s+['"`]/.test(snippet)) continue;
    findings.push({
      category: "blocking-beforeunload",
      file,
      line: lineNumber(text, match.index || 0),
      pattern: "beforeunload confirmation",
      text: oneLine(snippet),
    });
  }
  return findings;
}

function scanModalAllowlist(file, text) {
  const findings = [];
  const showModalRegex = /\.showModal\s*\(/g;
  for (const match of text.matchAll(showModalRegex)) {
    const start = Math.max(0, (match.index || 0) - 900);
    const end = Math.min(text.length, (match.index || 0) + 300);
    const context = text.slice(start, end);
    const allowed = modalAllowlist.some(item => context.includes(item.id) || context.includes(item.className) || context.includes(item.functionName));
    if (!allowed) {
      findings.push({
        category: "modal-allowlist",
        file,
        line: lineNumber(text, match.index || 0),
        pattern: "unallowlisted showModal",
        text: oneLine(context),
      });
    }
  }
  return findings;
}

function scanLinePatterns(file, text, patterns, category) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          category,
          file,
          line: index + 1,
          pattern: pattern.pattern,
          text: line.trim(),
        });
      }
    }
  }
  return findings;
}

function renderMarkdown(report) {
  const lines = [
    "# UI Blocking Dialog Policy",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- findings: ${report.summary.findings}`,
    "",
    "| ID | Surface | Policy | Verdict | Reason |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const item of report.policy) {
    lines.push([item.id, item.surface, item.policy, item.verdict, item.reason].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("## Modal Allowlist");
  lines.push("");
  for (const item of report.modalAllowlist) {
    lines.push(`- ${item.id}: ${item.className} - ${item.reason}`);
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.findings) {
      lines.push(`- ${item.file}:${item.line} ${item.pattern} - ${item.text}`);
    }
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

function extractBeforeUnloadBlock(source) {
  const marker = "window.addEventListener('beforeunload', () => {";
  const start = source.indexOf(marker);
  assert(start >= 0, "beforeunload cleanup block missing");
  const endMarker = "\n      });";
  const end = source.indexOf(endMarker, start);
  assert(end > start, "beforeunload cleanup block end missing");
  return source.slice(start, end + endMarker.length);
}

function assertIncludes(text, snippets, label) {
  const missing = snippets.filter(snippet => !text.includes(snippet));
  assert(missing.length === 0, `${label} missing required wording: ${missing.join(", ")}`);
}

function formatFindings(findings) {
  return findings.map(item => `${item.file}:${item.line} ${item.pattern}: ${item.text}`).join("\n");
}

function oneLine(value) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 240);
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
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
