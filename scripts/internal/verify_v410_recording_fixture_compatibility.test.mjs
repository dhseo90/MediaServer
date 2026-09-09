import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, cpSync, rmSync, appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { validateFixtures, cleanupOwned } from './verify_v410_recording_fixture_compatibility.mjs';

const original = resolve('test/fixtures/recording/v1');
function isolated(body) {
  const root = mkdtempSync(join(tmpdir(), 's08-a-fixtures-'));
  try { cpSync(original, root, { recursive: true }); body(root); }
  finally { cleanupOwned(root); }
}
test('S08-A-01 missing manifest fails closed', () => isolated(root => {
  rmSync(join(root, 'compatibility-manifest.json'), { force: true });
  assert.throws(() => validateFixtures(root), /manifest/);
}));
test('S08-A-02 modified golden bytes fail closed', () => isolated(root => {
  appendFileSync(join(root, 'segments.jsonl'), '\n');
  assert.throws(() => validateFixtures(root), /digest mismatch/);
}));
test('S08-A-03 intact four golden files accepted', () => {
  assert.equal(validateFixtures(original).files.length, 4);
});
test('S08-A-04 missing fixture fails closed', () => isolated(root => {
  rmSync(join(root, 'observations.jsonl'));
  assert.throws(() => validateFixtures(root), /ENOENT/);
}));
for (const mutation of ['json', 'schema', 'digest', 'extra', 'missing']) {
  test(`S08-A-05 manifest ${mutation} rejected`, () => isolated(root => {
    const path = join(root, 'compatibility-manifest.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    if (mutation === 'schema') manifest.schema = 'v2';
    if (mutation === 'digest') manifest.files['segments.jsonl'] = '0'.repeat(64);
    if (mutation === 'extra') manifest.files['../escape'] = '0'.repeat(64);
    if (mutation === 'missing') delete manifest.files['segments.jsonl'];
    writeFileSync(path, mutation === 'json' ? '{' : JSON.stringify(manifest));
    assert.throws(() => validateFixtures(root), /manifest/);
  }));
}
