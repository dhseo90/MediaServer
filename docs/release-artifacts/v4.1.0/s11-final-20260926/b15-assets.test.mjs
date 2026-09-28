// 파일 용도: 최종 UI asset manifest와 이미지 복제본으로 directReview 무결성 반례를 격리 검증한다.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(testDir, "../../../..");
const sourceManifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, "config/docs_ui_assets.json"), "utf8"));

const requiredFiles = [
  "VERSION",
  "README.md",
  "README.en.md",
  "config/docs_ui_assets.json",
  "docs/ui-guide.md",
  "docs/assets/ui/README.md",
  "scripts/internal/capture_docs_ui_assets.mjs",
  "scripts/internal/rule_preview_fixture_helpers.mjs",
  "scripts/internal/source_block_assertion_utils.mjs",
  "scripts/internal/verify_docs_ui_assets.mjs",
  "scripts/internal/verify_ops_rules_embed_smoke.mjs",
  "src/ingress/product_ui_js.cpp",
];

test("최종 directReview 20개 receipt는 현재 이미지와 일치하면 통과한다", () => {
  const outcome = runFixture();
  assert.equal(outcome.status, 0, outcome.stderr || outcome.stdout);
  assert.match(outcome.stdout, /pass: 10/);
  assert.equal(outcome.cleanupAbsent, true);
});

test("directReview SHA-256 변조를 거부한다", () => {
  const outcome = runFixture(({ manifest }) => {
    manifest.directReview.assets[0].sha256 = "0".repeat(64);
  });
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /SHA-256 drifted/);
  assert.equal(outcome.cleanupAbsent, true);
});

test("directReview receipt 누락을 거부한다", () => {
  const outcome = runFixture(({ manifest }) => {
    manifest.directReview.assets.pop();
  });
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /receipt count does not match assetCount/);
  assert.equal(outcome.cleanupAbsent, true);
});

test("directReview 중복 path를 거부한다", () => {
  const outcome = runFixture(({ manifest }) => {
    manifest.directReview.assets[1].path = manifest.directReview.assets[0].path;
  });
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /duplicate paths/);
  assert.equal(outcome.cleanupAbsent, true);
});

test("directReview repository 밖 path를 거부한다", () => {
  const outcome = runFixture(({ manifest }) => {
    manifest.directReview.assets[0].path = "../outside.png";
  });
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /exact Korean\/English UI 18 and historical VA 2 paths/);
  assert.equal(outcome.cleanupAbsent, true);
});

test("receipt hash를 다시 맞춰도 너무 긴 UI 이미지를 거부한다", () => {
  const outcome = runFixture(({ fixtureRoot, manifest }) => {
    const reviewed = manifest.directReview.assets.find((asset) => asset.path === "docs/assets/ui/ops-home.png");
    assert(reviewed, "ops-home.png directReview receipt가 필요합니다");
    const imagePath = path.join(fixtureRoot, reviewed.path);
    const bytes = fs.readFileSync(imagePath);
    const width = bytes.readUInt32BE(16);
    const height = Math.max(1451, Math.floor(width * 1.15) + 1);
    bytes.writeUInt32BE(height, 20);
    fs.writeFileSync(imagePath, bytes);
    reviewed.bytes = bytes.length;
    reviewed.sha256 = createHash("sha256").update(bytes).digest("hex");
    reviewed.width = width;
    reviewed.height = height;
  });
  assert.equal(outcome.status, 1);
  assert.match(outcome.stdout, /height exceeds 1450|height\/width exceeds 1\.15/);
  assert.equal(outcome.cleanupAbsent, true);
});

function runFixture(mutate = () => {}) {
  assert(Array.isArray(sourceManifest.directReview?.assets), "최종 directReview.assets가 먼저 생성되어야 합니다");
  assert.equal(sourceManifest.directReview.assets.length, 20, "최종 directReview receipt는 20개여야 합니다");
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-b15-assets-"));

  try {
    for (const relativePath of requiredFiles) copyFromSource(fixtureRoot, relativePath);
    for (const reviewed of sourceManifest.directReview.assets) copyFromSource(fixtureRoot, reviewed.path);

    const manifest = structuredClone(sourceManifest);
    mutate({ fixtureRoot, manifest });
    fs.writeFileSync(
      path.join(fixtureRoot, "config/docs_ui_assets.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    const binDir = path.join(fixtureRoot, "fixture-bin");
    fs.mkdirSync(binDir, { recursive: true, mode: 0o700 });
    const trackedPngs = sourceManifest.assets.flatMap((asset) => [
      `docs/assets/ui/${asset.file}`,
      `docs/assets/ui/en/${asset.file}`,
    ]);
    const gitStub = `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(`${trackedPngs.join("\n")}\n`)});\n`;
    fs.writeFileSync(path.join(binDir, "git"), gitStub, { encoding: "utf8", mode: 0o700 });

    const verifier = path.join(fixtureRoot, "scripts/internal/verify_docs_ui_assets.mjs");
    const result = spawnSync(process.execPath, [verifier], {
      cwd: fixtureRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
      },
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      cleanupAbsent: true,
    };
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    assert.equal(fs.existsSync(fixtureRoot), false, `격리 fixture 정리 실패: ${fixtureRoot}`);
  }
}

function copyFromSource(fixtureRoot, relativePath) {
  assert.equal(typeof relativePath, "string", "복제할 source path는 문자열이어야 합니다");
  assert(!path.isAbsolute(relativePath), `복제할 source path는 상대 경로여야 합니다: ${relativePath}`);
  const sourcePath = path.resolve(sourceRoot, relativePath);
  assert(sourcePath.startsWith(`${sourceRoot}${path.sep}`), `복제할 source path가 repository를 벗어납니다: ${relativePath}`);
  const destinationPath = path.resolve(fixtureRoot, relativePath);
  assert(destinationPath.startsWith(`${fixtureRoot}${path.sep}`), `fixture destination이 root를 벗어납니다: ${relativePath}`);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}
