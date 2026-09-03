// 파일 용도: 실제 EventStorage 통합 시험 네 프로세스와 두 source mutation 음성 대조를 실행한다.
// 임시 source 변경은 자체 mkdtemp 안에서만 수행하고 제품 source/DB/미디어는 수정하지 않는다.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_s05_storage_runtime_"));
const started = Date.now();
function run(command, args, timeout = 120000) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  return result;
}
function checked(command, args) {
  const result = run(command, args);
  assert.equal(result.status, 0, `${command} 실패\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim().split(/\s+/).filter(Boolean);
}

try {
  const packages = ["sqlite3", "openssl", "gstreamer-1.0", "gstreamer-app-1.0"];
  const flags = checked("pkg-config", ["--cflags", ...packages]);
  const libs = checked("pkg-config", ["--libs", ...packages]);
  const common = [
    "scripts/internal/event_storage_recording_runtime_smoke.cpp",
    "src/analysis/snapshot_encoder.cpp",
    "src/recording/event_recording_bridge.cpp", "src/recording/event_clip_deriver.cpp",
    "src/recording/recording_journal.cpp", "src/recording/recording_catalog.cpp",
    "src/recording/retention_coordinator.cpp", "src/recording/recording_contracts.cpp",
    "src/domain/strict_json.cpp",
  ].map(p => path.join(root, p));
  function build(storageSource, name) {
    const binary = path.join(temp, name);
    checked(process.env.CXX || "c++", ["-std=c++17", "-Wall", "-Wextra", "-Werror", "-pthread",
      `-I${root}/include`, ...flags, ...common, storageSource,
      "-DMEDIA_SERVER_USE_SQLITE3=1", "-DMEDIA_SERVER_USE_GSTREAMER=1", "-DMEDIA_SERVER_USE_OPENSSL=1",
      ...libs, "-o", binary]);
    return binary;
  }
  const originalFile = path.join(root, "src/analysis/event_storage.cpp");
  const binary = build(originalFile, "runtime-smoke");
  const sample = path.join(root, "video/sample_h264_video_only.mp4");
  for (const mode of ["disabled", "enabled"]) {
    for (const phase of ["admit", "recover"]) {
      const result = run(binary, [`${mode}-${phase}`, path.join(temp, mode), sample], 40000);
      process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      assert.equal(result.status, 0, `${mode}-${phase} 실행 실패`);
    }
  }
  const original = fs.readFileSync(originalFile, "utf8");
  const guard = "if (!config.analysis_event_storage_enabled && !recording_bridge)";
  assert.equal(original.split(guard).length, 2, "disabled guard mutation 대상은 정확히 하나여야 함");
  const enqueueStart = original.indexOf("    void Enqueue(AnalysisResult result, EventRecord record)");
  const bridgeStart = original.indexOf("        if (recording_bridge) {", enqueueStart);
  const bridgeEnd = original.indexOf("        std::lock_guard lock(mu_);", bridgeStart);
  assert(enqueueStart > 0 && bridgeStart > enqueueStart && bridgeEnd > bridgeStart, "prequeue mutation 경계 없음");
  const removed = original.slice(bridgeStart, bridgeEnd);
  assert(removed.includes("recording_bridge->TryResolve(result, record, options)"), "prequeue 실제 접수 대상 없음");
  const mutations = [
    { name: "disabled-guard", scenario: "disabled-admit", source: original.replace(guard, "if (!config.analysis_event_storage_enabled)"),
      failure: "실제 EventStorage worker 진입을 관찰한다" },
    { name: "prequeue-admission", scenario: "enabled-admit", source: original.slice(0, bridgeStart) + original.slice(bridgeEnd),
      failure: "worker 처리 전에 첫 이벤트 연결이 내구 접수된다" },
  ];
  for (const mutation of mutations) {
    const source = path.join(temp, `${mutation.name}.cpp`);
    fs.writeFileSync(source, mutation.source);
    const mutant = build(source, mutation.name);
    const result = run(mutant, [mutation.scenario, path.join(temp, mutation.name + "-data"), sample], 10000);
    assert.equal(result.status, 1, `${mutation.name}: assertion 실패 대신 종료/성공함\n${result.stdout}\n${result.stderr}`);
    assert(result.stderr.includes(`[s05-runtime-fail] case=${mutation.scenario} ${mutation.failure}`),
      `${mutation.name}: 기대한 런타임 assertion이 아닌 이유로 실패함\n${result.stderr}`);
    console.log(`[s05-runtime-mutation] ${mutation.name}: PASS (실제 assertion의 RED 확인)`);
  }
  console.log(`[s05-runtime-negative] pass=2 fail=0 elapsedMs=${Date.now() - started}`);
} catch (error) {
  console.error("[s05-runtime-fail] " + error.message);
  process.exitCode = 1;
} finally {
  // 이 프로세스가 만든 전용 디렉터리만 삭제한다. 대용량 파생 미디어를 evidence로 남기지 않는다.
  let files = 0, bytes = 0;
  function measure(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) measure(file);
      else { ++files; bytes += fs.lstatSync(file).size; }
    }
  }
  measure(temp);
  fs.rmSync(temp, { recursive: true });
  console.log(`[s05-runtime-cleanup] ${JSON.stringify({ path: temp, files, bytes, removed: !fs.existsSync(temp) })}`);
}
