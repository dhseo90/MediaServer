#!/usr/bin/env node
// 파일 용도: server.sh command dispatch, 문서 명령 참조, JS 옵션 검증 적용 범위를 정적 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
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
  - 현재 command set에 구버전 verify-v*/verify_v* release verifier가 남아 있지 않음
  - 추적 중인 scripts 파일이 server command, helper, example, env template 중 하나로 분류됨
  - 사용자 노출 JS 스크립트의 옵션 검증 helper 적용 여부
`);
}

const checks = [];
const projectInventory = readText(path.join(rootDir, "docs/project-feature-test-inventory.md"));
const cmake = readText(path.join(rootDir, "CMakeLists.txt"));

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

check("current command set excludes version-specific release verifiers", () => {
  const dispatches = parseServerDispatches();
  const versionCommands = dispatches
    .map(item => item.command)
    .filter(command => /^verify-v[0-9]/.test(command));
  assert(
    versionCommands.length === 0,
    `version-specific command(s) remain in server.sh dispatch:\n${versionCommands.join("\n")}`,
  );

  const scriptDirPath = path.join(rootDir, "scripts/internal");
  const versionScripts = fs
    .readdirSync(scriptDirPath)
    .filter(name => /^verify_v[0-9]/.test(name));
  assert(
    versionScripts.length === 0,
    `version-specific verifier script(s) remain in scripts/internal:\n${versionScripts.join("\n")}`,
  );

  const server = readText(path.join(rootDir, "server.sh"));
  assert(!/verify-v[0-9]/.test(server), "server.sh usage still documents a version-specific verify-v command");
  assert(!/verify_v[0-9]/.test(server), "server.sh still references a version-specific verify_v script");
});

check("tracked scripts are classified and referenced", () => {
  const dispatches = parseServerDispatches();
  const dispatchTargets = new Set(dispatches.map(item => path.join("scripts/internal", item.script)));
  const trackedScripts = gitLsFiles(["scripts"]);
  const trackedTextFiles = gitLsFiles([])
    .filter(file => !/\.(png|jpe?g|mp4|onnx|pyc)$/i.test(file))
    .filter(file => !file.startsWith("build"))
    .filter(file => !file.startsWith("docs/assets/"));
  const texts = new Map();
  for (const file of trackedTextFiles) {
    try {
      texts.set(file, readText(path.join(rootDir, file)));
    } catch {
      // 바이너리나 플랫폼별 인코딩 파일은 텍스트 참조 스캔에서 제외한다.
    }
  }

  const unclassified = [];
  for (const file of trackedScripts) {
    const basename = path.basename(file);
    const references = [];
    for (const [candidate, text] of texts.entries()) {
      if (candidate === file) continue;
      if (text.includes(file) || text.includes(basename)) {
        references.push(candidate);
      }
    }

    const classified =
      dispatchTargets.has(file) ||
      file === "scripts/.media_server.env.example" ||
      file.startsWith("scripts/examples/") ||
      basename === "env_common.sh" ||
      basename === "script_arg_utils.mjs" ||
      basename.endsWith("_helpers.mjs") ||
      basename.endsWith("_helpers.sh") ||
      basename.endsWith("_lib.mjs") ||
      references.length > 0;
    if (!classified) {
      unclassified.push(file);
    }
  }
  assert(unclassified.length === 0, `unclassified or unreferenced script(s):\n${unclassified.join("\n")}`);
});

check("project inventory lists every tracked script file", () => {
  const missing = [];
  for (const file of gitLsFiles(["scripts"])) {
    if (!projectInventory.includes(`\`${file}\``)) {
      missing.push(file);
    }
  }
  assert(missing.length === 0, `project feature/test inventory missing script file(s):\n${missing.join("\n")}`);
  for (const phrase of [
    "### Tracked Script File Detail",
    "ignored runtime 생성물",
    "`scripts/.media_server.env`",
    "`scripts/**/__pycache__/`",
    "`*.pyc`",
    "#### server-command",
    "#### sub-verifier",
    "#### test-entry",
  ]) {
    assert(projectInventory.includes(phrase), `project inventory missing script inventory phrase: ${phrase}`);
  }
});

check("project inventory command detail covers server.sh dispatch commands", () => {
  const dispatches = parseServerDispatches();
  const documentedCommands = parseProjectInventoryCommandDetails();
  const missing = [];
  for (const item of dispatches) {
    if (!documentedCommands.has(item.command)) {
      missing.push(item.command);
    }
  }
  assert(missing.length === 0, `project inventory command detail missing dispatch command(s):\n${missing.join("\n")}`);
  assert(
    projectInventory.includes("command-to-script dispatch matrix"),
    "project inventory does not define server-command detail as the command-to-script dispatch matrix",
  );
});

check("CMake does not define a separate untracked CTest registry", () => {
  const forbidden = /\b(enable_testing|add_test|CTest)\b/g;
  const matches = [...cmake.matchAll(forbidden)].map(match => match[0]);
  assert(matches.length === 0, `CMake test registry exists but is not inventoried:\n${[...new Set(matches)].join("\n")}`);
  for (const phrase of [
    "CMakeLists.txt에는 `enable_testing`, `add_test`, `CTest` 기반 별도 test registry가",
    "현재 테스트 source-of-truth는 `server.sh` dispatch와",
    "CMake/CTest 별도 test registry가 생기면",
  ]) {
    assert(projectInventory.includes(phrase), `project inventory missing CMake/CTest boundary phrase: ${phrase}`);
  }
});

check("test entry scripts are reachable from test_all", () => {
  const testAll = readText(path.join(rootDir, "scripts/internal/test_all.sh"));
  const entries = [
    "scripts/internal/test_external_access.sh",
    "scripts/internal/test_external_source_reachability.sh",
    "scripts/internal/test_rule_registry.sh",
  ];
  const missing = [];
  for (const entry of entries) {
    if (!testAll.includes(entry) || !projectInventory.includes(`\`${entry}\``)) {
      missing.push(entry);
    }
  }
  assert(missing.length === 0, `test entry script(s) are not reachable from test_all or inventory:\n${missing.join("\n")}`);
  assert(
    projectInventory.includes("`test-entry` script는 `scripts/internal/test_all.sh`에서 호출되는 하위 entry"),
    "project inventory does not define test-entry reachability",
  );
});

check("user-facing JS option parsers reject unknown options", () => {
  const strictScripts = [
    "run_ops_evidence_retention_cleanup.mjs",
    "archive_rc_gate_artifact.mjs",
    "manage_ui_visual_artifacts.mjs",
    "write_ui_visual_baseline_comment.mjs",
    "write_ui_visual_qa_issue_links.mjs",
    "write_rc_release_checklist.mjs",
    "write_dependency_notice.mjs",
    "write_dependency_snapshot.mjs",
    "write_source_offer_checklist.mjs",
    "verify_bundle_distribution_policy.mjs",
    "verify_release_metadata_consistency.mjs",
    "verify_release_evidence_index.mjs",
    "verify_feature_scope_decision_gate.mjs",
    "verify_post_release_reconciliation.mjs",
    "verify_release_closeout_helper.mjs",
    "verify_actions_security.mjs",
    "verify_release_bundle_dry_run.mjs",
    "verify_reid_advanced_tracking_experiment.mjs",
    "verify_oc_sort_benchmark_boundary.mjs",
    "verify_bot_sort_deepsort_research_boundary.mjs",
    "verify_public_repo_readiness.mjs",
    "verify_integrator_contract_artifact.mjs",
    "verify_code_comments.mjs",
    "verify_docs_links.mjs",
    "verify_project_feature_test_inventory.mjs",
    "verify_manual_ui_evidence.mjs",
    "verify_ops_client_ui_smoke.mjs",
    "verify_product_shell_examples.mjs",
    "verify_runtime_dashboard_longrun_template.mjs",
    "verify_ui_copy_matrix.mjs",
    "verify_ui_copy_i18n_parity.mjs",
    "verify_ui_release_baseline_approval_log.mjs",
    "verify_ops_ui_click_e2e.mjs",
    "verify_ops_tables_layout.mjs",
    "verify_ops_rules_embed_smoke.mjs",
    "verify_ops_rules_roundtrip.mjs",
    "verify_ops_route_boundaries.mjs",
    "verify_ops_rule_relationships.mjs",
    "verify_ops_event_records_scope.mjs",
    "verify_fixture_cleanup_contracts.mjs",
    "verify_flaky_verifier_stabilization.mjs",
    "verify_ops_source_lifecycle.mjs",
    "verify_ops_backup_restore_dry_run.mjs",
    "verify_ops_scenario_presets.mjs",
    "verify_onvif_ops_sources_ui_roundtrip.mjs",
    "verify_onvif_protocol_support_matrix.mjs",
    "verify_onvif_rtsps_draft_policy.mjs",
    "verify_onvif_https_soap_transport_design.mjs",
    "verify_onvif_https_tls_fixture.mjs",
    "verify_onvif_auth_injection_design.mjs",
    "verify_onvif_ws_discovery_ux.mjs",
    "verify_onvif_unsupported_api_guard.mjs",
    "verify_onvif_field_smoke_redaction.mjs",
    "verify_onvif_field_smoke_gate.mjs",
    "verify_onvif_field_http_probe.mjs",
    "verify_onvif_closed_loopback_failure_matrix.mjs",
    "verify_onvif_probe_profile_variants.mjs",
    "verify_onvif_synthetic_vendor_fixture_pack.mjs",
    "verify_onvif_field_smoke_sample_bundle.mjs",
    "verify_onvif_tls_transport_policy.mjs",
    "verify_onvif_credential_reference_policy.mjs",
    "verify_onvif_probe_error_wording_matrix.mjs",
    "verify_onvif_soap_fault_matrix.mjs",
    "verify_onvif_no_device_suite.mjs",
    "verify_onvif_no_device_mode.mjs",
    "verify_onvif_no_device_completion.mjs",
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

function gitLsFiles(args) {
  return execFileSync("git", ["ls-files", ...args], {
    cwd: rootDir,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
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

function parseProjectInventoryCommandDetails() {
  const commands = new Set();
  const regex = /^- `scripts\/internal\/[^`]+` - commands: (.+)$/gm;
  let match;
  while ((match = regex.exec(projectInventory)) !== null) {
    for (const commandMatch of match[1].matchAll(/`([^`]+)`/g)) {
      commands.add(commandMatch[1]);
    }
  }
  return commands;
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
