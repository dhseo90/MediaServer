// 현행 정책 검증 도구 자체검사. 격리 입력은 제품 실행 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const helper = new URL('./v400_current_policy.mjs', import.meta.url);
const api = fs.existsSync(helper) ? await import(helper.href) : {};
const freezePath = 'test/fixtures/v400_local_ops_policy_freeze.json';
const incidentPath = 'test/fixtures/v400_incident_os_policy.json';
const samplePath = 'test/fixtures/event_evidence_contract/evidence_manifest_sample.json';
const actual = file => fs.readFileSync(path.join(repo, file), 'utf8');
function isolated(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-server-v400-policy-'));
  const put = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const changeJson = (file, edit) => { const value = JSON.parse(read(file)); edit(value); put(file, JSON.stringify(value)); };
  try {
    const freeze = JSON.parse(actual(freezePath)), incident = JSON.parse(actual(incidentPath));
    for (const file of [freezePath, incidentPath, samplePath, freeze.inheritedSignoff.fixture, freeze.fieldSmoke.fixture]) put(file, actual(file));
    for (const item of freeze.frozenDecisions) {
      const old = fs.existsSync(path.join(root, item.sourceFile)) ? read(item.sourceFile) : '';
      put(item.sourceFile, old + '\n' + item.requiredSnippets.join('\n'));
    }
    put(incident.sourceAnchors.opsShell, [...incident.sourceAnchors.requiredNavSnippets, ...incident.sourceAnchors.workspaceSnippets].join('\n'));
    put(incident.sourceAnchors.eventPostBoundaryFile, incident.sourceAnchors.eventPostBoundarySnippets.join('\n'));
    put('src/analysis/event_storage.cpp', 'bool WriteEvidenceManifest(\nmedia-server.event-evidence-contract.v1');
    put('scripts/internal/verify_v320_unified_ops_events_workspace.mjs', 'readWebRtcHttpServerBundle');
    put('docs/event-evidence-contract.md', 'EvidenceManifest FrameRef media-server.event-evidence-contract.v1 pinned dry-run raw LLM/VLM prompt raw provider response');
    put('server.sh', actual('server.sh'));
    // dispatch의 파일 존재를 검사하되 실제 verifier를 실행하지 않는다.
    for (const match of read('server.sh').matchAll(/require_internal ["']?([a-zA-Z0-9_.-]+)/g)) {
      const file = 'scripts/internal/' + match[1];
      if (!fs.existsSync(path.join(root, file))) put(file, '// 격리 dispatch 대상\n');
    }
    return fn({root, put, read, changeJson, freeze, incident});
  } finally {
    // 이 함수가 만든 단일 root만 제거하고 symlink 대상은 따라가지 않는다.
    fs.rmSync(root, {recursive: true, force: true}); assert(!fs.existsSync(root));
  }
}
function pass(kind, root) {
  const result = api.inspectCurrentPolicy(kind, root);
  assert(result.length > 0); assert.deepEqual(result.filter(item => !item.pass), []);
}
function fail(kind, root, reason) {
  const result = api.inspectCurrentPolicy(kind, root);
  assert(result.some(item => !item.pass && item.detail.includes(reason)), JSON.stringify(result));
}

test('V400-CURRENT 현행 계약과 종료 기록 분리', async t => {
  assert.equal(typeof api.inspectCurrentPolicy, 'function', '공통 현행 정책 검사 함수 필요');
  await t.test('01 과거 기록 없이 4개 안전 계약 검사', () => isolated(({root}) => {
    for (const kind of ['freeze', 'incident', 'evidence', 'stabilization']) pass(kind, root);
  }));
  await t.test('02 false 토큰과 빈 검사 목록 훼손', () => isolated(({root, put, read, freeze, changeJson}) => {
    const first = freeze.frozenDecisions[0];
    put(first.sourceFile, read(first.sourceFile).replace(first.requiredSnippets[0], 'enabled:true'));
    fail('freeze', root, '토큰');
    changeJson(freezePath, value => { value.frozenDecisions[0].requiredSnippets = []; });
    fail('freeze', root, '검사 목록');
  }));
  await t.test('02 승인 원본 hash와 정확한 5개 결정 유지', () => isolated(({root, put, read, freeze, changeJson}) => {
    put(freeze.inheritedSignoff.fixture, read(freeze.inheritedSignoff.fixture) + '\n');
    fail('freeze', root, '승인 원본 hash');
    changeJson(freezePath, value => value.frozenDecisions.pop());
    fail('freeze', root, '5개 결정');
  }));
  await t.test('02 field-smoke 자료를 실제 PASS로 승격하지 않음', () => isolated(({root, changeJson, freeze}) => {
    changeJson(freeze.fieldSmoke.fixture, value => { value.fieldPassClaimed = true; });
    fail('freeze', root, 'field-smoke 원본 hash');
  }));
  await t.test('03 메뉴·workspace·Event POST 실제 경계 누락', () => isolated(({root, put, incident}) => {
    put(incident.sourceAnchors.opsShell, incident.sourceAnchors.forbiddenNavSnippet);
    fail('incident', root, '메뉴');
    put(incident.sourceAnchors.eventPostBoundaryFile, '');
    fail('incident', root, 'Event POST');
  }));
  await t.test('03 빈 앵커 목록은 통과하지 않음', () => isolated(({root, changeJson}) => {
    changeJson(incidentPath, value => { value.sourceAnchors.workspaceSnippets = []; });
    fail('incident', root, '검사 목록');
  }));
  for (const [field, value] of [['pinnedExcludesAutomaticCleanup', false], ['cleanupRequiresDryRun', false]]) {
    await t.test('04 보존 안전 조건 ' + field, () => isolated(({root, changeJson}) => {
      changeJson(samplePath, sample => { sample.retention[field] = value; }); fail('evidence', root, field);
    }));
  }
  for (const field of ['rawPromptStored', 'rawProviderResponseStored', 'identityFeaturesAllowed']) {
    await t.test('04 개인정보 조건 ' + field, () => isolated(({root, changeJson}) => {
      changeJson(samplePath, sample => { sample.privacy[field] = true; }); fail('evidence', root, field);
    }));
  }
  await t.test('04 sidecar와 별도 녹화 지원을 혼동하지 않음', () => isolated(({root, put}) => {
    put('docs/config-reference.md', '상시녹화·이벤트 녹화·타임라인 재생 지원'); pass('evidence', root);
  }));
  await t.test('05 주석에 명령만 존재하는 경우 실패', () => isolated(({root, put}) => {
    put('server.sh', '# verify-v400-incident-os-policy verify_v400_incident_os_policy.mjs');
    fail('incident', root, 'dispatch');
  }));
  await t.test('05 화면 검증 연결 누락·역사 파일 수 비고정', () => isolated(({root, put}) => {
    pass('stabilization', root);
    put('scripts/internal/verify_v320_unified_ops_events_workspace.mjs', '');
    fail('stabilization', root, 'bundle');
  }));
  await t.test('06 경로 이탈 및 외부 symlink 거부', () => isolated(({root, changeJson, incident}) => {
    changeJson(incidentPath, value => { value.sourceAnchors.opsShell = '../outside.cpp'; });
    fail('incident', root, '경로');
    changeJson(incidentPath, value => { value.sourceAnchors.opsShell = incident.sourceAnchors.opsShell; });
    const target = path.join(root, incident.sourceAnchors.opsShell); fs.unlinkSync(target); fs.symlinkSync(path.join(repo, incident.sourceAnchors.opsShell), target);
    fail('incident', root, '경로');
  }));
  await t.test('06 CLI 정상/실패·옵션·미실행 표시', () => isolated(({root, put}) => {
    const cli = path.join(repo, 'scripts/internal/verify_v400_incident_os_policy.mjs');
    const invoke = args => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8', timeout: 10000});
    const good = invoke(['--root', root]); assert.equal(good.status, 0, good.stderr);
    for (const field of ['productRuntime', 'uiFulltest', 'longrun30Or120', 'publishedMetadata']) assert(good.stdout.includes(field + ': not-run-by-this-command'));
    for (const args of [['--root'], ['--root', root, '--root', root], ['--help', '--published'], ['--unknown']]) {
      const bad = invoke(args); assert(bad.status !== 0); assert.equal(bad.error, undefined); assert(!bad.stdout.includes('[pass]'));
    }
    put('server.sh', ''); const bad = invoke(['--root', root]); assert.equal(bad.status, 1); assert(bad.stdout.includes('[fail]'));
  }));
  await t.test('07 실제 승인·소스 proof와 훼손 반례', () => {
    const inventoryText = actual('docs/project-feature-test-inventory.md');
    const manifest = JSON.parse(actual('test/fixtures/project_feature_implementation_evidence.json'));
    const verify = value => api.validatePolicyBoundSources({rootDir: repo, inventoryText, manifest: value});
    assert.deepEqual(verify(manifest), []);
    const damaged = structuredClone(manifest); delete damaged.review4ApprovalEnvelope;
    assert(verify(damaged).length > 0);
    const item = damaged.items.find(row => row.id === 'OPS-041');
    damaged.review4ApprovalEnvelope = manifest.review4ApprovalEnvelope;
    item.semanticEvidence.review4Proof.roles.owner.anchor = 'missing-source-proof';
    assert(verify(damaged).some(error => error.includes('OPS-041')));
  });
  await t.test('07 계층 검사도 과거 문서·종료 정책 fixture를 읽지 않음', () => {
    const original = fs.readFileSync;
    const forbidden = ['docs/release-test-records.md', 'docs/release-evidence-index.md', 'docs/development-backlog.md', 'test/fixtures/v400_verification_layer.json'];
    fs.readFileSync = function(file, ...args) {
      const relative = path.relative(repo, String(file));
      assert(!forbidden.includes(relative), '과거 기록 읽기: ' + relative);
      return original.call(this, file, ...args);
    };
    try { pass('layer', repo); } finally { fs.readFileSync = original; }
  });
  await t.test('08 실제 정의 개수·wrapper 실행 분리 및 반례', () => {
    const inventory = actual('docs/project-feature-test-inventory.md');
    const wrapper = actual('scripts/internal/verify_ui_fulltest_one_shot.mjs');
    const coverage = actual('scripts/internal/verify_feature_inventory_coverage.mjs');
    assert.deepEqual(api.validateLayerDefinitions(inventory, wrapper, coverage), []);
    assert(api.validateLayerDefinitions(inventory.replace(/^\| UI-001 .*$/m, ''), wrapper, coverage).length > 0);
    assert(api.validateLayerDefinitions(inventory, '', coverage).length > 0);
    assert(api.validateLayerDefinitions(inventory, wrapper, coverage + '\ncoverageStatus: covered means execution PASS').length > 0);
  });
});
