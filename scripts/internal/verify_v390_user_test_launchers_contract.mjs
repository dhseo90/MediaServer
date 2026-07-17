#!/usr/bin/env node
// 파일 용도: REVIEW4-62/65 사용자용 무옵션 launcher 네 개의 위임·금지 인자·조건부 120분 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyLongrun120ChangedAreas } from "./v390_longrun_evidence_measurement_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const temporaryRoots = [];
const checks = [];

if (process.argv.length !== 2) {
  console.error("사용법: ./server.sh verify-v390-user-test-launchers-contract");
  process.exit(64);
}

process.on("exit", () => {
  for (const target of temporaryRoots) fs.rmSync(target, { recursive: true, force: true });
});

const launchers = [
  { file: "test_server_30min.sh", suite: "server-30", command: "./test_server_30min.sh" },
  { file: "test_server_120min.sh", suite: "server-120", command: "./test_server_120min.sh" },
  { file: "test_ui.sh", suite: "ui", command: "./test_ui.sh" },
  { file: "test_release.sh", suite: "release", command: "./test_release.sh" },
];
const commonSource = read("scripts/internal/user_test_launcher_common.sh");
const bundleSource = read("scripts/internal/verify_v390_test_acceptance_bundle.mjs");
const longrunSource = read("scripts/internal/verify_v390_server_longrun.mjs");

check("four root launchers are executable zero-option entrypoints", () => {
  for (const item of launchers) {
    const fullPath = path.join(rootDir, item.file);
    assert(fs.existsSync(fullPath), `missing ${item.file}`);
    assert((fs.statSync(fullPath).mode & 0o111) !== 0, `${item.file} is not executable`);
    const source = read(item.file);
    assertIncludes(source, `media_server_run_user_test "${item.suite}" "$@"`, item.file);
    const rejected = spawnSync(fullPath, ["--forbidden-option"], {
      cwd: rootDir,
      env: contractEnv(),
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    assert(rejected.status === 64, `${item.file} did not reject arguments with exit 64`);
    assert(`${rejected.stdout}\n${rejected.stderr}`.includes(`사용법: ${item.command}`), `${item.file} usage mismatch`);
  }
});

check("common launcher owns output, contract preflight, sanitization, and exact delegation", () => {
  for (const snippet of [
    'if [[ "$#" -ne 0 ]]',
    "mktemp -d",
    "verify-v390-user-test-launchers-contract",
    "unset MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
    "unset MEDIA_SERVER_V390_UI_ROLE_SECRETS",
    "unset MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT",
    "unset MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT",
    "verify-v390-server-longrun --duration-minutes 30",
    "--user-launcher test_server_30min",
    "verify-v390-server-longrun --duration-minutes 120",
    "--user-launcher test_server_120min",
    "verify-v390-test-acceptance-bundle --output-dir \"${output_dir}\" --suite ui",
    "verify-v390-test-acceptance-bundle --output-dir \"${output_dir}\" --auto-run-120",
    "failureStage=launcher-contract",
    "testcaseId=",
    "reproductionCommand=",
    "laterNotRun=",
  ]) assertIncludes(commonSource, snippet, "common user launcher");
  assert(!commonSource.includes("--run-120"), "release launcher unconditionally requests 120 minutes");
  assert(!commonSource.includes("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD="), "launcher assigns a password");
  assert(!commonSource.includes("MEDIA_SERVER_V390_UI_ROLE_SECRETS="), "launcher assigns a role-secret envelope");
});

check("release alone uses repository canonical output while focused launchers retain OS temp", () => {
  for (const snippet of [
    'if [[ "${suite}" == "release" ]]',
    'output_dir="${root_dir}/docs/release-artifacts/v3.9.0/test-acceptance-current-final"',
    'output_dir="$(mktemp -d "${temp_root%/}/${output_prefix}.XXXXXX")"',
  ]) assertIncludes(commonSource, snippet, "launcher evidence lifecycle");
  assert(commonSource.indexOf('if [[ "${suite}" == "release" ]]') <
    commonSource.indexOf('output_dir="$(mktemp -d'),
  "focused launcher temp fallback is not separated from canonical release output");
  assertIncludes(bundleSource,
    'canonicalReleaseOutputDir = path.join(rootDir, "docs/release-artifacts/v3.9.0/test-acceptance-current-final")',
    "canonical acceptance output boundary");
  assertIncludes(bundleSource,
    'executionMode === "actual" && outputDir !== canonicalReleaseOutputDir',
    "canonical acceptance output rejection");
});

check("30-minute launcher delegates only the runner-owned 30-minute suite", () => {
  const outputDir = fixtureRoot("server-30");
  const result = runLower([
    "verify-v390-server-longrun", "--duration-minutes", "30", "--output-dir", outputDir,
    "--user-launcher", "test_server_30min", "--fixture-pass",
  ]);
  assert(result.status === 0, result.stderr || result.stdout);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.durationMinutes === 30, "30-minute duration mismatch");
  assert(summary.authorization?.status === "not-required", "30-minute authorization mismatch");
  assert(summary.authorization?.source === "direct-user-entrypoint-30", "30-minute entrypoint source mismatch");
  assert(summary.ports?.allocation === "runner-owned-ephemeral-loopback", "30-minute ports are not runner-owned");
});

check("120-minute launcher invocation is recorded as direct user authorization", () => {
  const outputDir = fixtureRoot("server-120");
  const result = runLower([
    "verify-v390-server-longrun", "--duration-minutes", "120", "--output-dir", outputDir,
    "--user-launcher", "test_server_120min", "--fixture-pass",
  ]);
  assert(result.status === 0, result.stderr || result.stdout);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.durationMinutes === 120, "120-minute duration mismatch");
  assert(summary.authorization?.status === "approved", "direct 120-minute authorization missing");
  assert(summary.authorization?.source === "direct-user-entrypoint-120", "direct 120-minute authorization source mismatch");
  assert(summary.authorization?.userLauncher === "./test_server_120min.sh", "direct 120-minute user command mismatch");
});

check("server launcher preserves first failure and later not-run evidence", () => {
  const outputDir = fixtureRoot("server-fail");
  const result = runLower([
    "verify-v390-server-longrun", "--duration-minutes", "30", "--output-dir", outputDir,
    "--user-launcher", "test_server_30min", "--fixture-fail-phase", "integrated-smoke",
  ]);
  assert(result.status === 1, "fixture first failure must exit 1");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.failedPhase === "integrated-smoke", "server first-failure phase mismatch");
  assert(summary.failure?.reproductionCommand === "./test_server_30min.sh", "server user reproduction command mismatch");
  for (const id of ["soak-case-loop", "runtime-idle"]) {
    assert(summary.phases.find(item => item.id === id)?.status === "not-run", `${id} must be not-run`);
  }
});

check("UI launcher delegates only exact 424 environment and Policy v4 stages", () => {
  const outputDir = fixtureRoot("ui-pass");
  const result = runLower([
    "verify-v390-test-acceptance-bundle", "--output-dir", outputDir, "--suite", "ui", "--fixture-pass",
  ]);
  assert(result.status === 0, result.stderr || result.stdout);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.suite === "ui", "UI suite identity mismatch");
  for (const id of ["preflight", "ui-environment-bootstrap", "ui-exact-424", "ui-server-cleanup", "ui-fulltest-qualification", "cleanup", "report"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "PASS", `${id} must execute in UI suite`);
  }
  for (const id of ["build", "feature-gates", "server-longrun-30", "longrun-120-decision", "server-longrun-120", "final-integrity"]) {
    assert(summary.stages.find(item => item.id === id)?.status === "not-run", `${id} must not run in UI suite`);
  }
});

check("UI launcher fail-stop keeps Policy v4 not-run and still cleans up", () => {
  const outputDir = fixtureRoot("ui-fail");
  const result = runLower([
    "verify-v390-test-acceptance-bundle", "--output-dir", outputDir, "--suite", "ui",
    "--fixture-fail-stage", "ui-exact-424",
  ]);
  assert(result.status === 1, "UI fixture failure must exit 1");
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.failedStage === "ui-exact-424", "UI first-failure stage mismatch");
  assert(summary.stages.find(item => item.id === "ui-fulltest-qualification")?.status === "not-run", "Policy v4 must be not-run after exact failure");
  assert(summary.stages.find(item => item.id === "ui-server-cleanup")?.status === "PASS", "UI server cleanup must still run");
  assert(summary.stages.find(item => item.id === "cleanup")?.status === "PASS", "root cleanup must still run");
});

check("release launcher records 120 minutes as not-required without a trigger", () => {
  const outputDir = fixtureRoot("release-no-trigger");
  const result = runLower([
    "verify-v390-test-acceptance-bundle", "--output-dir", outputDir, "--auto-run-120", "--fixture-pass",
  ]);
  assert(result.status === 0, result.stderr || result.stdout);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.longrun120?.decision?.executionDecision === "not-required", "120 minutes must be not-required without a trigger");
  assert(summary.stages.find(item => item.id === "server-longrun-120")?.status === "not-run", "120-minute stage must be not-run without a trigger");
  assert(summary.stages.find(item => item.id === "final-integrity")?.status === "PASS", "release must continue to final integrity fixture");
});

check("release launcher automatically runs 120 minutes only after a trigger", () => {
  const outputDir = fixtureRoot("release-trigger");
  const result = runLower([
    "verify-v390-test-acceptance-bundle", "--output-dir", outputDir, "--auto-run-120",
    "--fixture-pass", "--fixture-120-trigger",
  ]);
  assert(result.status === 0, result.stderr || result.stdout);
  const summary = readJson(path.join(outputDir, "summary.json"));
  assert(summary.longrun120?.decision?.executionDecision === "run", "120-minute trigger must select run");
  assert(summary.longrun120?.decision?.triggerReasons?.includes("changed-area:cleanup-port-lifecycle"), "120-minute trigger reason missing");
  assert(summary.stages.find(item => item.id === "server-longrun-120")?.status === "PASS", "triggered 120-minute fixture must execute");
});

check("AGENTS 7.6.2 change classifier covers every automatic 120-minute area", () => {
  const areas = classifyLongrun120ChangedAreas([
    "src/transport/rtsp_webrtc_media_path.cpp",
    "src/core/source_worker_lifecycle.cpp",
    "include/core/shared_stream_reuse.h",
    "src/ingress/runtime_metadata_sse_fanout.cpp",
    "scripts/internal/verify_v390_test_acceptance_bundle.mjs",
    "docs/stream-verification.md",
  ]);
  assert(JSON.stringify(areas.map(item => item.category)) === JSON.stringify([
    "rtsp-webrtc-whep-whip-media-path",
    "source-worker-lifecycle",
    "shared-stream-reuse",
    "runtime-metadata-fanout",
    "cleanup-port-lifecycle",
  ]), "AGENTS 7.6.2 change-area classification mismatch");
  assert(areas.every(item => item.files.length === 1 && item.modules.length > 0), "change-area evidence is not exact");
  assert(!areas.some(item => item.files.includes("docs/stream-verification.md")), "docs-only change created a 120-minute trigger");
});

check("media-path ICE classification requires an independent path token", () => {
  const files = [
    "src/transport/rtsp_server.cpp",
    "src/transport/webrtc_session.cpp",
    "src/transport/whep_endpoint.cpp",
    "src/transport/whip_endpoint.cpp",
    "src/core/media_codec.cpp",
    "src/core/media_session.cpp",
    "src/core/media_path.cpp",
    "src/core/ice_transport.cpp",
    "src/transport/webrtc_ice_config.cpp",
    "src/application/event_storage_application_service.cpp",
    "src/core/nice_transport.cpp",
  ];
  const mediaArea = classifyLongrun120ChangedAreas(files)
    .find(item => item.category === "rtsp-webrtc-whep-whip-media-path");
  assert(mediaArea, "media-path classification is missing");
  for (const expected of files.slice(0, 9)) {
    assert(mediaArea.files.includes(expected), `media-path trigger missing: ${expected}`);
  }
  assert(!mediaArea.files.includes("src/application/event_storage_application_service.cpp"),
    "general service filename falsely matched ICE");
  assert(!mediaArea.files.includes("src/core/nice_transport.cpp"),
    "ICE substring without token boundaries created a trigger");
});

check("lower runners expose automatic UI suite and conditional 120 source contracts", () => {
  for (const snippet of [
    'suite: "release"',
    '"auto-run-120"',
    'options.suite === "ui"',
    "stageSelectedForSuite(stageId)",
    "automaticScopeDecision?.conditionMet === true",
  ]) assertIncludes(bundleSource, snippet, "acceptance bundle source");
  for (const snippet of [
    '"user-launcher"',
    "allocatePortPair()",
    'allocation: "runner-owned-ephemeral-loopback"',
    'source: direct ? "direct-user-entrypoint-120"',
    "env: longrunChildEnv()",
  ]) assertIncludes(longrunSource, snippet, "longrun source");
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
console.log("== v3.9.0 user test launcher contract summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- actual30: not-run-by-contract");
console.log("- actual120: not-run-by-contract");
console.log("- actualUI: not-run-by-contract");
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function fixtureRoot(label) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), `media_server_v390_user_launcher_contract_${label}_`));
  temporaryRoots.push(target);
  return target;
}

function runLower(args) {
  return spawnSync("./server.sh", args, {
    cwd: rootDir,
    env: contractEnv(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function contractEnv() {
  const env = { ...process.env, MEDIA_SERVER_USER_TEST_CONTRACT_ACTIVE: "1", MEDIA_SERVER_SKIP_LOCAL_ENV: "1" };
  delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD;
  delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  delete env.MEDIA_SERVER_VERIFY_PREDEV_HTTP_PORT;
  delete env.MEDIA_SERVER_VERIFY_PREDEV_RTSP_PORT;
  return env;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertIncludes(source, snippet, label) {
  assert(source.includes(snippet), `${label} missing: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
