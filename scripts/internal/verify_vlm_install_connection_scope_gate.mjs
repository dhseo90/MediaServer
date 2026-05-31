#!/usr/bin/env node
// 파일 용도: V200-S04 VLM 설치/연결 UI 착수 범위 gate를 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM install/connection scope gate verification

Usage:
  ./server.sh verify-vlm-install-connection-scope-gate [options]

Checks:
  - V200-S04 remains an Ops-only install/connection UI scope, not profile/runtime/sidecar work
  - docs and feature inventory name the allowed and forbidden S04 boundaries
  - existing S01/S03 gates no longer block Ops-only S04 UI route/provider wording
  - source/config/fixture tree still has no VLM runtime/sidecar/client/model artifacts beyond S05 profile storage
`);
}

assertKnownOptions(rawArgs, ["help"]);

const checks = [];

check("roadmap defines V200-S04 scope gate and completion evidence", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "### V200-S04 VLM 설치/연결 UI 범위 gate",
    "S04에서 허용",
    "S04에서 금지",
    "profile 저장은 `V200-S05`",
    "VLM runtime 호출은 `V200-S06` 이후",
    "VLMObservation sidecar 저장은 `V200-S08`",
    "Event POST, WebRTC DataChannel, SSE/WS metadata schema",
    "RTSP/WebRTC media path",
    "viewer/client 화면 노출",
    "`./server.sh verify-vlm-install-connection-scope-gate`",
    "### V200-S04 VLM 설치/연결 Ops UI 완료 기준",
    "완료 evidence",
    "브라우저 직접 확인에서 `/ops/vlm`",
    "cloud opt-in 전",
    "`gemini-2.5-flash` 비활성",
    "opt-in 후 cloud 후보 선택 상태",
    "실행/저장 false",
    "브라우저 직접 확인에서 `/client/live`",
    "invalid query",
    "400 JSON",
    "v2.0.0 전체 UI 풀테스트와 close-out evidence는 S18 범위",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing S04 gate snippet: ${snippet}`);
  }
  assert(/\| 4 \| V200-S04 \| 완료 \| VLM 설치\/연결 UI \|/.test(backlog),
    "V200-S04 roadmap row must be complete only after Ops UI evidence is documented");
});

check("stream verification documents the S04 scope gate command and limits", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "VLM 설치/연결 UI 범위 gate는 `V200-S04` 착수 전후에",
    "./server.sh verify-vlm-install-connection-scope-gate",
    "Ops-only 설치/연결 UI 준비",
    "profile 저장",
    "VLM runtime 호출",
    "sidecar 저장",
    "cloud provider API 호출",
    "Event POST/WebRTC/SSE/WS",
    "metadata schema 변경",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S04 gate snippet: ${snippet}`);
  }
});

check("feature inventory and coverage gate include the S04 scope gate", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
  for (const snippet of [
    "| SAFE-022 | VLM 설치/연결 UI scope gate | 비대상 | 필요 | 안정화 |",
    "verify-vlm-install-connection-scope-gate",
    "| `SAFE-001`~`SAFE-023` |",
    "| 전체 기능 항목 | 330 |",
    "| UI 직접 필요 | 206 |",
    "| UI 비대상 | 97 |",
    "| 테스트 필요 | 330 |",
    "| 안정화 대상 | 320 |",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing S04 scope gate snippet: ${snippet}`);
  }
  assert(coverage.includes("verify-vlm-install-connection-scope-gate"), "coverage verifier missing S04 scope command");
  assert(projectInventoryVerifier.includes("rows.length === 330"), "project inventory verifier must expect 330 feature rows");
});

check("server command and script inventory are wired", () => {
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "verify-vlm-install-connection-scope-gate",
    "verify_vlm_install_connection_scope_gate.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("verify_vlm_install_connection_scope_gate.mjs"), "script inventory missing S04 scope gate script");
});

check("previous VLM gates permit S04 Ops UI wording and S05 profile storage while runtime artifacts stay blocked", () => {
  const gateFiles = [
    "scripts/internal/verify_vlm_boundary.mjs",
    "scripts/internal/verify_vlm_selection_decision.mjs",
    "scripts/internal/verify_vlm_recommendation_engine.mjs",
  ];
  for (const file of gateFiles) {
    const text = readText(file);
    assert(!text.includes("/\\/ops\\/vlm/i"), `${file} still blocks Ops-only /ops/vlm route wording`);
    assert(!text.includes("\\bvlm[_-]?provider\\b"), `${file} still blocks S04 provider wording`);
    const blocksClientRoute = text.includes("/\\/client\\/vlm/i");
    const blocksModelArtifacts = text.includes("gguf") && text.includes("safetensors");
    const blocksRuntimeCalls = text.includes("runtimeVlmCallPerformed") || text.includes("VLM runtime 호출");
    assert(blocksClientRoute || blocksModelArtifacts || blocksRuntimeCalls,
      `${file} must still block at least one runtime/client/model non-scope artifact class`);
  }
  const profileStorage = readText("scripts/internal/verify_vlm_profile_storage.mjs");
  for (const snippet of [
    "media-server.vlm-profile.v1",
    "credentialStored",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "viewerClientExposureAdded",
  ]) {
    assert(profileStorage.includes(snippet), `S05 profile storage gate missing boundary snippet: ${snippet}`);
  }
  const recommendation = readText("scripts/internal/verify_vlm_recommendation_engine.mjs");
  assert(recommendation.includes("/\\/client\\/vlm/i"), "recommendation gate must still block client VLM route exposure");
});

check("tracked source/config/fixture files do not introduce forbidden runtime/sidecar/client/model artifacts", () => {
  const files = gitLsFiles(["src", "include", "config", "test/fixtures"])
    .filter(file => !isBinaryPath(file));
  const allowlisted = new Set([
    "test/fixtures/vlm_model_catalog/selection_decision.json",
    "test/fixtures/vlm_pc_capability/cases.json",
    "test/fixtures/vlm_recommendation/cases.json",
  ]);
  const forbidden = [
    /\bVLMObservation\b/,
    /\bvlm[_-]?sidecar\b/i,
    /\/client\/vlm/i,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  const hits = [];
  for (const file of files) {
    if (allowlisted.has(file)) continue;
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S04 artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM install/connection scope gate summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function gitLsFiles(pathspecs) {
  return execFileSync("git", ["ls-files", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8",
  }).split(/\r?\n/).filter(Boolean);
}

function isBinaryPath(file) {
  return /\.(png|jpe?g|gif|mp4|mov|onnx|pyc|zip|tar|gz)$/i.test(file);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
