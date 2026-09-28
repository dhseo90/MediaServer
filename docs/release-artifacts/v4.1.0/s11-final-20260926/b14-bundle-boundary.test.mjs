// 파일 용도: B14 source-tree 제외가 실제 bundle의 차단 정책을 우회하지 않는지 검사한다.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const rootDir = fileURLToPath(new URL("../../../../", import.meta.url));
const bundlePolicyPath = path.join(rootDir, "config/bundle_distribution_policy.json");
const publicPolicyPath = path.join(rootDir, "config/public_repo_policy.json");
const verifierPath = path.join(rootDir, "scripts/internal/verify_bundle_distribution_policy.mjs");
const cacheRootName = ".media_server.gstreamer";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("source tree 제외는 로컬 GStreamer cache 이름 한 개만 정확히 추가한다", () => {
  const policy = readJson(bundlePolicyPath);
  assert.deepEqual(policy.sourceTreeExcludes, [
    ".git",
    ".media_server.test",
    cacheRootName,
    "build",
    "build-gst",
    "build-gst-onnx",
    "build-release-gst-onnx",
    "third_party",
    "models",
    "video",
  ]);
  assert.equal(policy.sourceTreeExcludes.filter((item) => item === cacheRootName).length, 1);
  assert.deepEqual(policy.alwaysExcludeNames, [".DS_Store", "__pycache__"]);
});

test("explicit bundle에서는 source tree 제외를 적용하지 않고 위험 경로 세 개를 검출한다", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-b14-bundle-"));
  const reportPath = path.join(fixtureRoot, "report.json");
  try {
    const pluginDir = path.join(fixtureRoot, cacheRootName, "lib", "gstreamer-1.0");
    fs.mkdirSync(pluginDir, {recursive: true, mode: 0o700});
    for (const name of ["libgstlibav.dylib", "libgstx264.dylib", "libgstx265.dylib"]) {
      fs.writeFileSync(path.join(pluginDir, name), "synthetic bundle boundary fixture\n", {mode: 0o600});
    }

    const result = spawnSync(process.execPath, [
      verifierPath,
      "--bundle-dir", fixtureRoot,
      "--policy", bundlePolicyPath,
      "--json-output", reportPath,
    ], {
      cwd: rootDir,
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1);
    const report = readJson(reportPath);
    assert.equal(report.status, "fail");
    assert.equal(report.scanLinkedLibraries, true);
    assert.equal(report.filesScanned, 3);
    assert.equal(report.pathHitCount, 3);
    assert.equal(report.linkedHitCount, 0);
    assert.deepEqual(
      report.hits.map((hit) => hit.file).sort(),
      ["libgstlibav.dylib", "libgstx264.dylib", "libgstx265.dylib"]
        .map((name) => `${cacheRootName}/lib/gstreamer-1.0/${name}`)
        .sort(),
    );
    assert.ok(report.hits.every((hit) => hit.kind === "path"));
  } finally {
    fs.rmSync(fixtureRoot, {recursive: true, force: true});
  }
  assert.equal(fs.existsSync(fixtureRoot), false);
});

test("공개 저장소의 media_server 추적 거부 패턴은 그대로 유지한다", () => {
  const policy = readJson(publicPolicyPath);
  const expected = "^\\.media_server";
  assert.equal(policy.deniedTrackedPathPatterns.filter((pattern) => pattern === expected).length, 1);
  assert.equal(new RegExp(expected).test(`${cacheRootName}/lib/gstreamer-1.0/plugin.dylib`), true);
});
