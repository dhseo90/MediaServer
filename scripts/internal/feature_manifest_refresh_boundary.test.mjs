// 검증 도구 CLI의 쓰기 경계 자체검사. 제품 기능이나 독립 승인을 대신하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const source = fileURLToPath(new URL('./verify_feature_implementation_evidence.mjs', import.meta.url));
const retired = '--refresh-manifest is retired';
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-manifest-write-boundary-'));
  const files = new Map();
  const put = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text); files.set(file, text);
  };
  try {
    put('scripts/internal/verify_feature_implementation_evidence.mjs', fs.readFileSync(source, 'utf8'));
    // 실제 의존 모듈을 읽기만 한다. CLI의 rootDir와 모든 쓰기 대상은 격리된 root다.
    for (const file of ['feature_implementation_manifest_lib.mjs', 'feature_semantic_evidence_lib.mjs', 'script_arg_utils.mjs']) {
      fs.symlinkSync(fileURLToPath(new URL('./' + file, import.meta.url)), path.join(root, 'scripts/internal', file));
    }
    const report = path.join(root, 'report.json');
    const invoke = args => spawnSync(process.execPath, [path.join(root, 'scripts/internal/verify_feature_implementation_evidence.mjs'), ...args], {
      cwd: root, encoding: 'utf8', timeout: 10000,
    });
    run({put, invoke, report});
    for (const [file, bytes] of files) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), bytes, file + ' 변경');
    assert(!fs.existsSync(report), '거부한 요청이 보고서를 생성함');
  } finally {
    // mkdtemp로 생성한 경로만 제거하며 의존 모듈 symlink는 따라가지 않는다.
    fs.rmSync(root, {recursive: true, force: true}); assert(!fs.existsSync(root));
  }
}
function refused(result, reason = retired, exit = 1) {
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  assert.equal(result.status, exit); assert(result.stderr.includes(reason), result.stderr);
  assert(!result.stdout.includes('[pass]'));
}

test('MANIFEST-WRITE-01 기존 REVIEW4 승인 자료를 일반 재생성으로 덮어쓰지 않음', () => fixture(({put, invoke, report}) => {
  put('docs/project-feature-test-inventory.md', '# 격리된 정의\n');
  put('test/fixtures/project_feature_implementation_evidence.json', JSON.stringify({review4ApprovalEnvelope: {sentinel: 'preserve'}, items: []}));
  refused(invoke(['--refresh-manifest', '--json-report', report]));
}));
test('MANIFEST-WRITE-02 누락·손상 입력에서도 읽기/쓰기 전 거부', () => fixture(({put, invoke, report}) => {
  refused(invoke(['--refresh-manifest']));
  put('test/fixtures/project_feature_implementation_evidence.json', '{invalid-json');
  refused(invoke(['--refresh-manifest', '--json-report', report]));
}));
test('MANIFEST-WRITE-03 기존 옵션 충돌·무승인 migration 거부 유지', () => fixture(({invoke}) => {
  refused(invoke(['--refresh-manifest', '--migrate-review3']), 'mutually exclusive');
  refused(invoke(['--migrate-review3']), '--migrate-review3 was removed');
  refused(invoke(['--review-ids', 'UI-001']), '--review-ids requires');
  refused(invoke(['--refresh-manifest', '--unknown']), 'unknown option', 2);
}));
test('MANIFEST-WRITE-04 도움말은 독립 승인 경로와 실행 증거 경계를 안내', () => fixture(({invoke}) => {
  const result = invoke(['--help']); assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.includes('--refresh-manifest  Retired'));
  assert(result.stdout.includes('verify-v390-review4-feature-semantic-source-audit --apply-approved-manifest'));
  assert(result.stdout.includes('does not execute product tests'));
}));
test('MANIFEST-WRITE-05 정상 입력 검증 실패 뒤 반례를 PASS로 실행하지 않음', () => fixture(({put, invoke}) => {
  put('docs/project-feature-test-inventory.md', '# 빈 격리 입력\n');
  put('test/fixtures/project_feature_implementation_evidence.json', JSON.stringify({items: []}));
  const result = invoke([]); assert.equal(result.error, undefined); assert.equal(result.status, 1);
  assert.equal((result.stdout.match(/\[not-run\] negative fixture /g) || []).length, 15);
  assert(!result.stdout.includes('[pass]')); assert(result.stdout.includes('- negativeFixtures: 0/15'));
}));
