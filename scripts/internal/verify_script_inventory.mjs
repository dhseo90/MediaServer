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
  - 추적 중인 scripts 파일이 server command, helper, example, env template 중 하나로 분류됨
  - 기능 inventory는 script 전체 목록을 중복 나열하지 않고 verify-script-inventory로 위임함
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

check("tracked scripts are classified and referenced", () => {
  const dispatches = parseServerDispatches();
  const dispatchTargets = new Set(dispatches.map(item => path.join("scripts/internal", item.script)));
  const trackedScripts = gitLsFiles(["scripts"]).filter(fileExists);
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

check("project inventory delegates script file inventory to this verifier", () => {
  for (const phrase of [
    "## Script Inventory Boundary",
    "`./server.sh verify-script-inventory`가 source-of-truth",
    "script 파일 하나하나를",
    "기능 row로 다시 나열하지 않습니다",
  ]) {
    assert(projectInventory.includes(phrase), `project inventory missing script boundary phrase: ${phrase}`);
  }
});

check("project inventory maps verifier families without duplicating dispatch details", () => {
  for (const phrase of [
    "## Verifier Coverage Map",
    "verify-script-inventory",
    "기준표 작성 완료",
    "실행 증거 아님",
    "coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.",
  ]) {
    assert(projectInventory.includes(phrase), `project inventory missing verifier coverage phrase: ${phrase}`);
  }
});

check("CMake does not define a separate untracked CTest registry", () => {
  const forbidden = /\b(enable_testing|add_test|CTest)\b/g;
  const matches = [...cmake.matchAll(forbidden)].map(match => match[0]);
  assert(matches.length === 0, `CMake test registry exists but is not inventoried:\n${[...new Set(matches)].join("\n")}`);
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
    if (!testAll.includes(entry)) {
      missing.push(entry);
    }
  }
  assert(missing.length === 0, `test entry script(s) are not reachable from test_all:\n${missing.join("\n")}`);
});

check("auth verifier has no hardcoded test password defaults", () => {
  const authWorkflow = readText(path.join(rootDir, "scripts/internal/verify_auth_workflow.sh"));
  const streamVerification = readText(path.join(rootDir, "docs/stream-verification.md"));
  const uiGuide = readText(path.join(rootDir, "docs/ui-guide.md"));
  const agents = readText(path.join(rootDir, "AGENTS.md"));
  for (const [label, text] of [
    ["verify_auth_workflow.sh", authWorkflow],
    ["docs/stream-verification.md", streamVerification],
    ["docs/ui-guide.md", uiGuide],
    ["AGENTS.md", agents],
  ]) {
    assert(!/qweasd0-|wrong-qweasd/i.test(text), `${label}: hardcoded auth verifier password remains`);
  }
  for (const envName of [
    "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
    "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
    "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
  ]) {
    assert(authWorkflow.includes(`require_auth_secret_env ${envName}`), `auth workflow does not require ${envName}`);
    assert(streamVerification.includes(envName), `stream verification docs missing ${envName}`);
    assert(agents.includes(envName), `AGENTS.md missing ${envName}`);
  }
  assert(authWorkflow.includes("Auth verifier passwords must be provided by the test operator"), "auth workflow missing explicit no-default failure message");
});

check("VA EventRecord dispatch verifier fails early and dispatches every poll by default", () => {
  const vaEvents = readText(path.join(rootDir, "scripts/internal/verify_va_tracking_events.sh"));
  const streamVerification = readText(path.join(rootDir, "docs/stream-verification.md"));
  for (const phrase of [
    'DISPATCH_EVERY_N="${MEDIA_SERVER_VERIFY_VA_EVENTS_DISPATCH_EVERY_N:-}"',
    'if [[ "${DISPATCH_RECORDS}" == "1" ]]; then',
    "DISPATCH_EVERY_N=1",
    "EventRecord storage is disabled",
    "EventRecord storage enabled",
    "EventRecord storage disabled during dispatch verification",
  ]) {
    assert(vaEvents.includes(phrase), `verify_va_tracking_events.sh missing EventRecord dispatch guard: ${phrase}`);
  }
  for (const phrase of [
    "verify-va-events --dispatch-records",
    "모든 poll을",
    "storage가 꺼져 있으면 긴 polling 전에 실패합니다",
  ]) {
    assert(streamVerification.includes(phrase), `stream verification docs missing EventRecord dispatch wording: ${phrase}`);
  }
});

check("critical verifier pass output avoids grouped feature-result wording", () => {
  const forbiddenSnippets = [
    "adaptive input-size downshift/fallback 검증",
    "SSE metadata schema/tracks/events/scenarios 확인",
    "ICE candidate 수집/정책 확인",
    "trackingClasses category/all/mixed/direct/alias 정책 확인",
    "카테고리별 presence 이벤트 확인",
    "Profile/Rule 카테고리 저장·복원 확인",
    "ObjectTracker IoU/distance/direction/class association scoring",
    "TrackStateManager, TrackHealth, Appearance extractor/fallback, cleanup limits",
    "SceneContextBuilder zone/line/dwell/channel/vaRule scoping",
    "EventManager lifecycle/cooldown/dedup/cleanup",
    "ScenarioEngine and IntrusionDwellScenario phase/dedup/re-entry/cleanup",
    "ReEntryScenario exit/re-entry/cooldown/window",
    "WrongDirectionScenario allowed/raw direction/cooldown",
    "IntrusionAfterLineCrossingScenario line/zone/dwell/dedup/window",
    "LoiteringScenario dwell/trajectory/radius/dedup/exit",
    "ZoneOccupancyScenario occupancy/dwell/representative/dedup/zone-filter",
    "EventStorage archive query/compaction",
    "Event recorder snapshot/clip media hooks",
    "VaRuntimeMetadata builder/schema/WebRTC compatibility",
    "Pass(\"VaMetadata subscription filters\")",
    "POST payload schema, 실패 카운터, cooldown 검증",
    "POST endpoint recovery 후 실패/성공 counter 검증",
    "EventStorage corrupt/partial JSON Lines recovery policy 검증",
    "line-crossing forward/reverse 분할",
    "PASS/FAIL/NOT RUN/미확인",
    "NO_EVIDENCE",
    "browserUiTest: NOT RUN",
    "eventOccurrenceReview: NOT RUN",
    "[pass] ops-rules-roundtrip",
    "[pass] ops-scenario-presets",
    "[pass] scenario-preset-ui",
    "[pass] ops-rule-relationships",
    "[pass] ops-rules-native-smoke",
    "[pass] auth-scope-picker",
    "[pass] ops-event-records-scope",
    "[pass] ops-events evidence controls rendered",
    "[pass] lab event-storage evidence policy",
    "[pass] lab event evidence zip bundle",
    "[pass] lab event-records populated fixture",
    "[pass] lab event-records evidence filter",
    "[pass] ops events API includes populated record and evidence policy",
    "[pass] ops-source-lifecycle",
    "[pass] VA metadata replay baselines:",
    "[pass] ops-api-contract: runtime/rules/events product endpoints available",
    "[pass] client-api-views: sensitive source/debug fields omitted",
    "[pass] WebRTC video track / ICE connected / DataChannel metadata sync 진단 확인",
    "WebRTC metadata tracks/events arrays 확인",
    "WebSocket handshake/open 확인",
    "WebSocket unsubscribe/status control ack 확인",
    "WebSocket reset control ack 및 기본값 복원 확인",
    "[pass] tracker stability 반복 요약 생성",
    "[pass] initial relationship graph:",
    "[pass] with-fixture relationship graph:",
    "[pass] negative route matrix HTTP status smoke",
    "[pass] ONVIF probe error wording fixture matrix",
    "[pass] ONVIF probe error wording redaction",
    "[pass] ONVIF SOAP Fault/malformed fixture matrix",
    "[pass] ONVIF SOAP Fault/malformed redaction",
    "[pass] ONVIF SOAP fault/malformed scenario",
    "[pass] ONVIF SOAP fault/malformed redaction scenario",
    "[pass] ONVIF auth injection loopback smoke",
    "[pass] ONVIF credential provider skeleton smoke",
    "[pass] ONVIF SOAP parser service/profile/stream smoke",
    "[pass] ONVIF RTSPS import draft smoke",
    "[pass] ONVIF probe adapter action/sanitization smoke",
    "[pass] ONVIF local simulator fixture smoke",
    "[pass] ONVIF HTTP/HTTPS SOAP transport smoke",
    "[pass] ONVIF HTTPS transport failure matrix",
    "[pass] ops sources UI renders and copies ONVIF URLs",
    "[pass] ops sources UI renders ONVIF channel copy controls",
    "[pass] ops sources UI copies ONVIF source URL to clipboard",
    "[pass] ops sources API preserved ONVIF source fields",
    "[pass] ops views API preserved ONVIF PublishedView fields",
    "[pass] ops rules UI renders and copies ONVIF URLs",
    "[pass] ops rules UI renders ONVIF VA rule copy controls",
    "[pass] ops rules UI copies ONVIF VA rule URL to clipboard",
    "[pass] client API redacts ONVIF source locator",
    "[pass] onvif-probe-draft response omits credential, endpoint, raw SOAP, and raw diagnostics",
    "[pass] onvif-probe-draft rejects malformed and unsafe route payloads",
    "[pass] onvif-import-draft response omits credential, endpoint, and raw diagnostics",
    "[pass] onvif-import-draft rejects malformed and unsafe route payloads",
    "[pass] ONVIF TLS fixture smoke coverage",
    "[pass] ONVIF credential reference redaction coverage",
    "[pass] onvif-probe-draft response contract",
    "[pass] onvif-import-draft response contract",
    "[pass] ONVIF field smoke redaction checklist content",
    "[pass] ONVIF field smoke redaction forbidden literals absent",
    "[pass] ONVIF field smoke sample bundle content",
    "[pass] ONVIF field smoke sample bundle redaction",
    "[pass] client view detail redacts RTSP locator and ONVIF details",
    "[pass] ONVIF field smoke redaction checklist has required document sections",
    "[pass] ONVIF field smoke redaction checklist defines shareable and forbidden artifact values",
    "[pass] ONVIF field smoke redaction checklist defines operator and artifact checklist fields",
    "[pass] ONVIF field smoke redaction checklist defines gate decision fields",
    "[pass] ONVIF field smoke redaction checklist defines sanitized failure wording",
    "[pass] ONVIF field smoke redaction checklist names required verification commands",
    "[pass] ONVIF field smoke redaction checklist has at least 10 actionable items",
    "[pass] ONVIF field smoke sample bundle manifest and summary schemas match",
    "[pass] ONVIF field smoke sample bundle required wording terms are present",
    "[pass] ONVIF field smoke sample bundle omits synthetic credential sentinel",
    "[pass] ONVIF field smoke sample bundle omits documentation endpoint literals",
    "[pass] ONVIF field smoke sample bundle omits RTSP locator literals",
    "[pass] ONVIF field smoke sample bundle omits RTSPS locator literals",
    "[pass] ONVIF field smoke sample bundle omits HTTP endpoint literals",
    "[pass] ONVIF field smoke sample bundle omits HTTPS endpoint literals",
    "[pass] ONVIF field smoke sample bundle omits auth header and cookie literals",
    "[pass] ONVIF field smoke sample bundle omits raw SOAP and diagnostic JSON literals",
    "[pass] browser ops-events populated screenshot:",
    "[pass] browser ops-events controls width=",
    "[pass] ONVIF TLS transport policy document",
    "[pass] ONVIF TLS fixture harness design document",
    "[pass] ONVIF TLS policy links support matrix entry",
    "[pass] ONVIF credential reference policy document",
    "[pass] ONVIF credential store integration design",
    "[pass] ONVIF credential provider interface skeleton",
    "[pass] ONVIF credential policy is linked from live support document",
    "[pass] ONVIF auth design references auth injection loopback verifier",
    "[pass] ONVIF auth design references in-memory fixture provider",
    "[pass] ONVIF protocol matrix references auth loopback verifier",
    "[pass] ONVIF draft API smoke forbids credentialRef in response",
    "[pass] ONVIF draft API smoke forbids synthetic credential value in response",
    "[pass] ONVIF field probe exposes credential reference boolean only",
    "[pass] ONVIF persistent credential store policy decision",
    "[pass] ONVIF credential provider status and auth scheme codes are stable",
    "[pass] ONVIF RTSPS import draft response redacts credential reference and duplicate stream URI",
    "[pass] ONVIF probe adapter performs GetServices before profile and stream URI actions",
    "[pass] ONVIF probe adapter redacts credential reference and endpoint from failure summary",
    "[pass] ONVIF HTTPS SOAP transport sends service request line and SOAPAction",
    "[pass] ONVIF fixture contract requires credentialRef instead of plaintext secret",
    "[pass] ONVIF SOAP parser extracts Media2 profile token/name/api",
    "[pass] ONVIF SOAP parser extracts Media2 profile encoding/resolution/fps",
    "[pass] ONVIF SOAP parser extracts Media profile resolution/fps",
    "no TensorRT/OpenVINO references",
    ": tables=",
    "-detail-audit: detail=",
    "forbidden=0, textLength=",
    "accountItems=",
    "brand=${",
    "navWidth=",
    "accountTop=",
    "tiles=${",
    "selected=${",
    "active=${",
    ", overflow=",
    ": overflow=",
    "hintHeight=",
    "toolHeight=",
    "[pass] ops users scope picker controls rendered",
    "[pass] browser auth scope picker width=",
    "[pass] release bundle dry-run:",
    "[pass] release bundle candidates:",
    "[pass] release bundle dry-run summary:",
    "[pass] release bundle dry-run cleanup complete",
    "[pass] UI visual artifact maintenance:",
    "[pass] manual UI full-test seed applied to throwaway registry",
    "[pass] manual UI full-test seed dry-run",
  ];
  const files = [
    ...gitLsFiles(["scripts/internal"]).filter(fileExists),
    ...gitLsFiles(["docs"]).filter(fileExists),
    "AGENTS.md",
  ].filter(file => !/\.(png|jpe?g|mp4|onnx|pyc)$/i.test(file));
  const violations = [];
  for (const file of files) {
    if (file === "scripts/internal/verify_script_inventory.mjs") {
      continue;
    }
    const text = readText(path.join(rootDir, file));
    for (const snippet of forbiddenSnippets) {
      if (text.includes(snippet)) {
        violations.push(`${file}: ${snippet}`);
      }
    }
  }
  assert(violations.length === 0, `grouped feature-result wording remains:\n${violations.join("\n")}`);
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
    "verify_v190_entry_baseline_report.mjs",
    "verify_feature_scope_decision_gate.mjs",
    "verify_post_release_reconciliation.mjs",
    "verify_release_closeout_helper.mjs",
    "prepare_manual_ui_fulltest_seed.mjs",
    "verify_actions_security.mjs",
    "verify_ci_local_gate_parity.mjs",
    "verify_release_bundle_dry_run.mjs",
    "verify_reid_advanced_tracking_experiment.mjs",
    "verify_oc_sort_benchmark_boundary.mjs",
    "verify_bot_sort_deepsort_research_boundary.mjs",
    "verify_public_repo_readiness.mjs",
    "verify_integrator_contract_artifact.mjs",
    "detect_vlm_pc_capability.mjs",
    "verify_vlm_selection_decision.mjs",
    "verify_vlm_pc_capability_detector.mjs",
    "recommend_vlm_model.mjs",
    "verify_vlm_recommendation_engine.mjs",
    "verify_vlm_install_connection_scope_gate.mjs",
    "vlm_install_connection_dry_run.mjs",
    "verify_vlm_install_connection_dry_run.mjs",
    "verify_vlm_install_connection_ui.mjs",
    "verify_vlm_profile_storage.mjs",
    "evaluate_vlm_harness.mjs",
    "verify_vlm_evaluation_harness.mjs",
    "verify_vlm_event_evidence_extraction.mjs",
    "verify_vlm_observation_sidecar.mjs",
    "verify_code_comments.mjs",
    "verify_docs_links.mjs",
    "verify_project_feature_test_inventory.mjs",
    "verify_manual_ui_evidence.mjs",
    "verify_ui_fulltest_one_shot.mjs",
    "verify_ops_client_ui_smoke.mjs",
    "verify_ui_blocking_dialog_policy.mjs",
    "verify_product_shell_examples.mjs",
    "verify_runtime_dashboard_longrun_template.mjs",
    "verify_runtime_media_longrun_trigger_matrix.mjs",
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

function fileExists(file) {
  return fs.existsSync(path.join(rootDir, file));
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
  return gitLsFiles(["README.md", "docs", "scripts"])
    .filter(file => /\.(md|sh|mjs|py)$/.test(file))
    .map(file => path.join(rootDir, file));
}
