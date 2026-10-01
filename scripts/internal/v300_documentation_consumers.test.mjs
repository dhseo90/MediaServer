// 파일 용도: 문서 소비자 자체검사: 읽기 결과만 격리 자식 프로세스 메모리에서 바꾸고 실제 파일은 보존한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as docs from './documentation_contract_lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cases = [
  ['event_evidence_contract', 'test/fixtures/event_evidence_contract/evidence_manifest_sample.json', value => { value.privacy.rawPromptStored = true; }, 'raw prompt'],
  ['feature_schema_privacy', 'test/fixtures/event_feature_schema_privacy/feature_set_sample.json', value => { value.privacy.identityFeaturesAllowed = true; }, 'identityFeaturesAllowed'],
  ['vlm_feature_queue', 'test/fixtures/v300_vlm_feature_queue/cases.json', value => { value.cases[0].contractInvariants.mediaPathBlocked = true; }, 'media path'],
  ['feature_only_retention', 'test/fixtures/v300_feature_only_retention/cases.json', value => { value.cases[0].contractInvariants.rawPromptStored = true; }, 'raw prompt'],
  ['search_dsl_query_convert', 'test/fixtures/v300_search_dsl_query_convert/cases.json', value => { value.cases[0].contractInvariants.runtimeProviderCallPerformed = true; }, 'provider'],
  ['feature_search_index', 'test/fixtures/v300_feature_search_index/cases.json', value => { value.cases[0].contractInvariants.runtimeProviderCallPerformed = true; }, 'provider'],
  ['retention_pin_cleanup', 'test/fixtures/v300_retention_pin_cleanup/cases.json', value => { value.cases[0].contractInvariants.rawPromptStored = true; }, 'raw prompt'],
  ['ops_events_ui', 'src/ingress/product_ui_server_pages.cpp', null, 'opsV300EventEvidenceRows'],
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(new URL('../../' + file, import.meta.url))).digest('hex');
function invoke(name, mutation = null) {
  const deny = ['docs/release-test-records.md', 'docs/release-evidence-index.md', 'docs/development-backlog.md', 'docs/README.md'];
  const source = `
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    const root = ${JSON.stringify(root)}, deny = ${JSON.stringify(deny)};
    const original = fs.readFileSync;
    fs.readFileSync = function(file, options) {
      const relative = path.relative(root, String(file));
      if (deny.includes(relative)) throw new Error('과거 기록 또는 직접 색인 의존: ' + relative);
      const value = original.call(this, file, options);
      if (typeof value !== 'string') return value;
      let text = value;
      if (relative.startsWith('docs/') && relative.endsWith('.md')) text = text.replace(/^#{1,6} .*$/gm, '# 다른 제목');
      ${mutation ? `if (relative === ${JSON.stringify(mutation.path)}) {
        ${mutation.edit ? `const parsed = JSON.parse(text); (${mutation.edit.toString()})(parsed); text = JSON.stringify(parsed);` : `text = text.replaceAll('opsV300EventEvidenceRows', 'removed-control');`}
      }` : ''}
      return text;
    };
    for (const key of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'rmSync', 'renameSync', 'mkdirSync']) fs[key] = () => { throw new Error('정적 검사의 쓰기 금지'); };
    await import(pathToFileURL(path.join(root, 'scripts/internal/verify_v300_${name}.mjs')).href);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  return result;
}

test('V300-DOC 문서 소비자와 실제 안전 검사 구분', async t => {
  assert.equal(typeof docs.validateFeatureDocumentation, 'function', '현행 기능 문서 검사 함수 필요');
  const base = {
    document: '# 임의 제목\nFeatureSet rawPromptStored', identifiers: ['FeatureSet', 'rawPromptStored'],
    command: 'verify-example', script: 'verify_example.mjs', featureIds: ['LAB-001'],
    inventory: '| LAB-001 | 설명 | 비대상 | verify-example | 안정화 | 안전 조건 |',
    verification: '명령: verify-example',
    server: '  verify-example)\n    require_internal verify_example.mjs\n    exec node "${INTERNAL_DIR}/verify_example.mjs" "$@"\n    ;;',
  };
  await t.test('01 현재 식별자와 기능별 명령 연결', () => {
    assert.deepEqual(docs.validateFeatureDocumentation(base), []);
    assert.deepEqual(docs.validateFeatureDocumentation({...base, document: base.document.replace('# 임의 제목', '# 제목 변경')}), []);
  });
  await t.test('02 문서·식별자·정의·dispatch 누락/중복은 실패', () => {
    for (const change of [
      {document: ''}, {identifiers: []}, {document: 'FeatureSet'}, {featureIds: []},
      {inventory: ''}, {inventory: base.inventory + '\n' + base.inventory},
      {inventory: base.inventory.replace('verify-example', 'verify-example-other')},
      {verification: ''}, {server: ''}, {script: 'another.mjs'},
    ]) assert(docs.validateFeatureDocumentation({...base, ...change}).length > 0, JSON.stringify(change));
  });
  await t.test('02 명령 없는 정의는 exact manifest만 사용하고 명시 오류는 덮어쓰지 않음', () => {
    const item = {id: 'LAB-001', verifierEvidence: {command: 'verify-example'}};
    const noInline = {...base, inventory: '| LAB-001 | 사용자 조작과 기대 상태 |', implementation: {items: [item]}};
    assert.deepEqual(docs.validateFeatureDocumentation(noInline), []);
    for (const implementation of [undefined, {}, {items: []}, {items: [item, item]},
      {items: [{...item, id: 'LAB-002'}]}, {items: [{...item, verifierEvidence: {command: 'verify-other'}}]}]) {
      assert(docs.validateFeatureDocumentation({...noInline, implementation}).length > 0);
    }
    assert(docs.validateFeatureDocumentation({...noInline, inventory: '| LAB-001 | verify-other |'}).length > 0);
    assert(docs.validateFeatureDocumentation({...noInline, inventory: ''}).length > 0);
  });
  for (const [name, path, edit, reason] of cases) {
    await t.test('03 과거 기록 없는 정상 ' + name, () => {
      const result = invoke(name); assert.equal(result.status, 0, result.stderr + result.stdout);
      assert(result.stdout.includes('uiFulltest: not-run-by-this-command'));
      assert(result.stdout.includes('longrun30Or120: not-run-by-this-command'));
    });
    await t.test('04 기존 안전 반례 ' + name, () => {
      const before = hash(path); const result = invoke(name, {path, edit});
      assert.equal(result.status, 1, result.stderr + result.stdout);
      assert(result.stdout.includes('[fail]') && result.stdout.includes(reason), result.stderr + result.stdout);
      assert.equal(hash(path), before, '실제 입력 파일 변경 금지');
    });
  }
  for (const [name, id] of [['feature_schema_privacy', 'SAFE-064'], ['vlm_feature_queue', 'LAB-002']]) {
    await t.test('04 기존 독립 검사 연결 훼손 거부 ' + id, () => {
      const path = 'test/fixtures/project_feature_implementation_evidence.json';
      const before = hash(path);
      const edit = id === 'SAFE-064'
        ? value => { value.items.find(item => item.id === 'SAFE-064').verifierEvidence.command = 'verify-v300-feature-schema-privacy'; }
        : value => { value.items.find(item => item.id === 'LAB-002').verifierEvidence.command = 'verify-v300-vlm-feature-queue'; };
      const result = invoke(name, {path, edit});
      assert.equal(result.status, 1, result.stderr + result.stdout);
      assert(result.stdout.includes(id + ' manifest verifier command drift'), result.stderr + result.stdout);
      assert.equal(hash(path), before);
    });
  }
});
