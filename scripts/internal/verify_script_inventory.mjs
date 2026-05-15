#!/usr/bin/env node
// 파일 용도: server.sh command dispatch, 문서 명령 참조, JS 옵션 검증 적용 범위를 정적 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Script inventory verification

Usage:
  ./server.sh verify-script-inventory

Checks:
  - server.sh command dispatch target exists and is executable
  - README/docs/scripts에 적힌 ./server.sh 명령이 실제 command와 일치
  - 사용자 노출 JS 스크립트의 옵션 검증 helper 적용 여부
`);
}

const checks = [];

check("server.sh dispatch targets exist and are executable", () => {
  const dispatches = parseServerDispatches();
  assert(dispatches.length > 0, "server.sh dispatch command not found");
  for (const item of dispatches) {
    const target = path.join(rootDir, "scripts/internal", item.script);
    assert(fs.existsSync(target), `${item.command}: missing target script ${item.script}`);
    const mode = fs.statSync(target).mode;
    assert((mode & 0o111) !== 0, `${item.command}: target script is not executable ${item.script}`);
  }
});

check("documented server.sh commands resolve to dispatch table", () => {
  const commands = new Set(parseServerDispatches().map(item => item.command));
  const files = walkDocsAndScripts();
  const misses = [];
  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(/\.\/server\.sh\s+([a-zA-Z0-9_.-]+)/g)) {
      const command = match[1];
      if (!commands.has(command)) {
        misses.push(`${path.relative(rootDir, file)}: ${command}`);
      }
    }
  }
  assert(misses.length === 0, `unknown documented command(s):\n${misses.join("\n")}`);
});

check("user-facing JS option parsers reject unknown options", () => {
  const strictScripts = [
    "run_ops_evidence_retention_cleanup.mjs",
    "archive_rc_gate_artifact.mjs",
    "write_rc_release_checklist.mjs",
    "write_dependency_notice.mjs",
    "write_dependency_snapshot.mjs",
    "write_source_offer_checklist.mjs",
    "verify_bundle_distribution_policy.mjs",
    "verify_actions_security.mjs",
    "verify_release_bundle_dry_run.mjs",
    "verify_public_repo_readiness.mjs",
    "verify_v1_1_boundary_keywords.mjs",
    "verify_code_comments.mjs",
    "verify_docs_links.mjs",
    "verify_ops_client_ui_smoke.mjs",
    "verify_ops_ui_click_e2e.mjs",
    "verify_ops_tables_layout.mjs",
    "verify_ops_rules_embed_smoke.mjs",
    "verify_ops_rules_roundtrip.mjs",
    "verify_ops_route_boundaries.mjs",
    "verify_ops_rule_relationships.mjs",
    "verify_ops_event_records_scope.mjs",
    "verify_ops_source_lifecycle.mjs",
    "verify_ops_backup_restore_dry_run.mjs",
    "verify_ops_scenario_presets.mjs",
    "verify_onvif_ops_sources_ui_roundtrip.mjs",
    "verify_onvif_protocol_support_matrix.mjs",
    "verify_onvif_rtsps_draft_policy.mjs",
    "verify_onvif_field_smoke_redaction.mjs",
    "verify_onvif_field_http_probe.mjs",
    "verify_onvif_closed_loopback_failure_matrix.mjs",
    "verify_onvif_probe_profile_variants.mjs",
    "verify_onvif_field_smoke_sample_bundle.mjs",
    "verify_onvif_tls_transport_policy.mjs",
    "verify_onvif_credential_reference_policy.mjs",
    "verify_onvif_probe_error_wording_matrix.mjs",
    "verify_onvif_no_device_suite.mjs",
    "verify_onvif_no_device_mode.mjs",
    "verify_webrtc_va_metadata.mjs",
    "verify_ws_va_metadata.mjs",
  ];
  for (const script of strictScripts) {
    const text = readText(path.join(rootDir, "scripts/internal", script));
    assert(text.includes("script_arg_utils.mjs"), `${script}: missing script_arg_utils import`);
    assert(text.includes("assertKnownOptions"), `${script}: missing assertKnownOptions`);
  }
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
console.log("== Script inventory verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseServerDispatches() {
  const server = readText(path.join(rootDir, "server.sh"));
  const dispatches = [];
  const regex = /^\s{2}([a-zA-Z0-9_.|-]+)\)\n\s+require_internal [^\n]+\n\s+exec "\$\{INTERNAL_DIR\}\/([^"\n]+)"/gm;
  let match;
  while ((match = regex.exec(server)) !== null) {
    for (const command of match[1].split("|")) {
      dispatches.push({ command, script: match[2] });
    }
  }
  return dispatches;
}

function walkDocsAndScripts() {
  const roots = ["README.md", "docs", "scripts"];
  const files = [];
  for (const root of roots) {
    const full = path.join(rootDir, root);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isFile()) {
      files.push(full);
    } else {
      files.push(...walk(full));
    }
  }
  return files.filter(file => /\.(md|sh|mjs|py)$/.test(file));
}

function walk(dir) {
  const result = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === "__pycache__") continue;
    const current = path.join(dir, name);
    const relative = path.relative(rootDir, current);
    if (relative.startsWith(".media_server.test") || relative.startsWith("build")) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) result.push(...walk(current));
    else result.push(current);
  }
  return result;
}
