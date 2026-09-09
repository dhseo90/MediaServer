#!/usr/bin/env node
// 고정 V1 바이트 무결성과 실제 C++ reader 검증. 자동 digest 갱신은 없다.
import { readFileSync, mkdtempSync, rmSync, statSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function cleanupOwned(root) {
  function bytes(path) { const stat = statSync(path); return stat.isDirectory() ? readdirSync(path).reduce((n, name) => n + bytes(join(path, name)), 0) : stat.size; }
  const size = bytes(root);
  rmSync(root, { recursive: true, force: true });
  if (existsSync(root)) throw new Error(`cleanup failed: ${root}`);
  console.log(`[cleanup] path=${root} bytes=${size} removed=true`);
}
const pins = Object.freeze({
  'segments.jsonl': '11b7f8b1b41ad7ba0d8921bcfa9ba132051d8c5234a9a0c7a0e34f58276769d9',
  'event-links.jsonl': '92151bef9763ef928f4fda1b0185be5443dd89a19b0b30c31e457245ec8d550d',
  'observations.jsonl': '70c3bc9705e22606b1a2cf7738e92ea427a03f6ab3d632b33fab62c8e1fe94a7',
  'tombstones.jsonl': '0def653610a2c5afdd2e2ef9bea58ca9ba19a4b9a3b322362201619c7853cfe8',
});
export function validateFixtures(root, manifest = join(root, 'compatibility-manifest.json')) {
  let data;
  try { data = JSON.parse(readFileSync(manifest, 'utf8')); }
  catch (error) { throw new Error(`manifest: ${error.message}`); }
  if (data?.schema !== 'media-server.recording-v1-compatibility-manifest.v1' ||
      Object.keys(data).sort().join(',') !== 'files,schema' || !data.files || Array.isArray(data.files) ||
      Object.keys(data.files).sort().join(',') !== Object.keys(pins).sort().join(',')) throw new Error('manifest schema/entries mismatch');
  for (const [name, digest] of Object.entries(pins)) {
    if (data.files[name] !== digest) throw new Error(`manifest fixed digest mismatch: ${name}`);
    if (createHash('sha256').update(readFileSync(join(root, name))).digest('hex') !== digest) throw new Error(`digest mismatch: ${name}`);
  }
  return { ok: true, files: Object.keys(pins) };
}
export function runReader(root) {
  const output = mkdtempSync(join(tmpdir(), 's08-a-reader-'));
  try {
    const binary = join(output, 'recording-contracts');
    for (const [command, args] of [
      [process.env.CXX || 'c++', ['-std=c++17', '-Wall', '-Wextra', '-Werror', `-I${join(repo, 'include')}`,
        join(repo, 'scripts/internal/recording_contract_smoke.cpp'), join(repo, 'src/recording/recording_contracts.cpp'),
        join(repo, 'src/domain/strict_json.cpp'), '-o', binary]], [binary, [root]],
    ]) {
      const result = spawnSync(command, args, { encoding: 'utf8', timeout: 60000 });
      process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
      if (result.error || result.status !== 0) throw new Error(`reader command failed (${result.status}): ${result.error?.message || command}`);
    }
  } finally { cleanupOwned(output); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let root = join(repo, 'test/fixtures/recording/v1'); let manifest;
    for (let i = 2; i < process.argv.length; i += 2) {
      const flag = process.argv[i], value = process.argv[i + 1];
      if (!value || !['--fixture-root', '--manifest'].includes(flag)) throw new Error('usage: [--fixture-root path] [--manifest path]');
      if (flag === '--fixture-root') root = resolve(value); else manifest = resolve(value);
    }
    validateFixtures(root, manifest); console.log('[golden-integrity] pass=4 fail=0');
    runReader(root); console.log('[recording-fixture-compatibility] PASS; cleanup=PASS');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
