// 파일 용도: manifest 검증의 집합/개별 항목 분리 자체검사. 실제 986개 소스 검증을 대체하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import * as validation from './feature_implementation_manifest_lib.mjs';
const inventoryText = '# 격리 검증 입력\n';
function input() {
  const rows = Array.from({length: 986}, (_, index) => ({id: `OPS-${index + 1}`, feature: '격리 항목', uiNeed: '비대상', testNeed: '필요', area: '안정화', pass: '정해진 응답 확인'}));
  const manifest = {
    schema: 'media-server.feature-implementation-evidence.v2',
    semanticClosureSchema: 'media-server.feature-semantic-implementation-closure.v2',
    expectedFeatureRows: 986, inventorySha256: createHash('sha256').update(inventoryText).digest('hex'),
    items: rows.map(row => ({id: row.id, section: 'J', surfaceKind: 'ops-evidence-release-gate',
      feature: row.feature, uiNeed: row.uiNeed, testNeed: row.testNeed, testAreas: ['안정화'],
      review: {reason: row.id}, sourceEvidence: {file: 'src/owner.cpp', anchor: 'OwnerMarker'},
      verifierEvidence: {file: 'scripts/internal/verify_fixture.mjs', anchor: 'assertExpected', command: 'verify-fixture'},
      uiEvidence: null, manualUiCaseId: null})),
  };
  return {rows, manifest, inventoryText};
}
function fixture(run) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-manifest-validation-'));
  try {
    for (const [file, text] of Object.entries({
      'server.sh': '  verify-fixture)\n    require_internal verify_fixture.mjs\n    exec "$INTERNAL_DIR/verify_fixture.mjs"\n    ;;\n',
      'src/owner.cpp': 'OwnerMarker\n', 'scripts/internal/verify_fixture.mjs': 'assertExpected\n',
    })) {fs.mkdirSync(path.dirname(path.join(rootDir, file)), {recursive: true});fs.writeFileSync(path.join(rootDir, file), text);}
    execFileSync('git', ['init', '-q', rootDir]);execFileSync('git', ['-C', rootDir, 'add', 'server.sh', 'src/owner.cpp', 'scripts/internal/verify_fixture.mjs']);
    run(rootDir);
  } finally {fs.rmSync(rootDir, {recursive: true, force: true});assert(!fs.existsSync(rootDir));}
}
test('MANIFEST-SPLIT-01 집합 검증은 전체 ID·해시·승인 사유를 검사', () => {
  assert.equal(typeof validation.validateImplementationManifestStructure, 'function');
  assert.deepEqual(validation.validateImplementationManifestStructure(input()), []);
});
test('MANIFEST-SPLIT-02 누락·중복·해시·승인 사유 반례 유지', () => {
  for (const [mutate, expected] of [
    [m => m.items.pop(), 'manifest missing feature ID OPS-986'],
    [m => m.items[1].id = m.items[0].id, 'manifest contains duplicate feature IDs'],
    [m => m.inventorySha256 = '0'.repeat(64), 'inventorySha256 drift'],
    [m => m.items[1].review.reason = m.items[0].review.reason, 'bulk or duplicate semantic review reason detected'],
    [m => delete m.items[0].review.reason, 'every feature requires a review reason'],
    [m => m.items = null, 'items must be an array'],
  ]) {const args = input();mutate(args.manifest);assert(validation.validateImplementationManifestStructure(args).some(e => e.includes(expected)), expected);}
});
test('MANIFEST-SPLIT-03 전체 검증은 집합·모든 항목 검사를 빠짐없이 합성', () => fixture(rootDir => {
  const args = {...input(), rootDir};const before = JSON.stringify(args);
  const whole = validation.validateImplementationManifest(args);
  const individual = validation.validateImplementationManifestEntries({...args, items: args.manifest.items});
  const structure = validation.validateImplementationManifestStructure(args);
  assert.deepEqual(whole.errors, [...structure, ...individual]);
  assert.equal(whole.ok, false);assert.equal(individual.length, 986);
  assert(individual.every(e => e.includes('semantic evidence schema drift')));
  assert.equal(JSON.stringify(args), before);
}));
test('MANIFEST-SPLIT-04 변경된 항목의 실제 검사와 원본 불변', () => fixture(rootDir => {
  const args = input();const before = JSON.stringify(args);
  const item = structuredClone(args.manifest.items[0]);item.sourceEvidence.file = 'src/missing.cpp';
  const errors = validation.validateImplementationManifestEntries({rootDir, rows: args.rows, items: [item]});
  assert(errors.some(e => e.includes('OPS-1 sourceEvidence file is not tracked')));
  assert(errors.every(e => e.startsWith('OPS-1 ')));assert.equal(JSON.stringify(args), before);
}));
