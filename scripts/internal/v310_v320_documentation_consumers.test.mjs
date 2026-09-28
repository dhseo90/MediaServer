// 문서 소비자 자체검사. 실제 제품 실행 대신 격리 자식 프로세스의 읽기 값만 변경한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cases = [
  ['v310_event_clip_contract', 'OPS-062', 'media-server.encoded-event-clip-contract.v1'],
  ['v310_replay_timeline_ui', 'UI-060', 'media-server.ops.v310-replay-timeline-ui.v1'],
  ['v310_client_safe_event_digest', 'CLIENT-025', 'media-server.client.event-digest.v1'],
  ['v310_scoped_integrator_search_api', 'CLIENT-026', 'media-server.integrator.scoped-event-search.v1'],
  ['v310_operator_feature_correction', 'EVT-061', 'media-server.ops.operator-feature-correction.v1'],
  ['v310_optional_vector_search', 'LAB-089', 'media-server.v310-optional-vector-search-report.v1'],
  ['v310_retention_export_hardening', 'EVT-062', 'media-server.v310.retention-export-hardening.v1'],
  ['v320_resolution_state_contract', 'EVT-063', 'media-server.ops.resolution-state.v1'],
  ['v320_unified_ops_events_workspace', 'UI-062', 'media-server.ops.v320-unified-events-workspace.v1'],
  ['v320_evidence_quality_layer', 'UI-063', 'media-server.ops.v320-evidence-quality.v1'],
  ['v320_source_reliability_context', 'UI-064', 'media-server.ops.v320-source-reliability-context.v1'],
  ['v320_ai_review_quality_context', 'UI-065', 'media-server.ops.v320-ai-review-quality-context.v1'],
  ['v320_operator_resolution_flow', 'UI-066', 'media-server.ops.v320-operator-resolution-flow.v1'],
  ['v320_action_readiness_checklist', 'UI-067', 'media-server.ops.v320-action-readiness-checklist.v1'],
  ['v320_client_safe_resolution_digest', 'CLIENT-027', 'media-server.client.resolution-digest.v1'],
  ['v320_resolution_search_metrics', 'UI-069', 'media-server.ops.v320-resolution-search-metrics.v1'],
];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function snapshot() {
  return Object.fromEntries(['src', 'include', 'test/fixtures'].flatMap(dir => fs.readdirSync(root + dir, {recursive: true})
    .map(name => dir + '/' + name).filter(name => fs.statSync(root + name).isFile()))
    .map(name => [name, sha(fs.readFileSync(root + name))]));
}
function invoke(name, mutation = {}) {
  const code = String.raw`
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    const root = ${JSON.stringify(root)}, mutation = ${JSON.stringify(mutation)};
    const original = fs.readFileSync;
    fs.readFileSync = function(file, options) {
      const relative = path.relative(root, String(file));
      if (['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md','docs/README.md'].includes(relative)) throw new Error('종료 기록/직접 색인 의존: ' + relative);
      let value = original.call(this, file, options);
      if (typeof value !== 'string') return value;
      if (relative.startsWith('docs/') && relative.endsWith('.md')) value = value.replace(/^#{1,6} .*$/gm, '# 변경 가능한 제목');
      if (mutation.schema && (relative.startsWith('src/') || relative.startsWith('include/'))) value = value.replaceAll(mutation.schema, 'missing-contract-schema');
      if (mutation.removeId && relative === 'docs/project-feature-test-inventory.md') value = value.split('\n').filter(line => !line.startsWith('| ' + mutation.removeId + ' |')).join('\n');
      if (mutation.manual && relative === 'docs/manual-ui-checklist.md') value = '';
      if (mutation.mapping && relative === 'test/fixtures/project_feature_implementation_evidence.json') {
        const parsed = JSON.parse(value); parsed.items.find(item => item.id === mutation.mapping).verifierEvidence.command = 'verify-wrong-command'; value = JSON.stringify(parsed);
      }
      if (mutation.anchor && relative === 'test/fixtures/project_feature_implementation_evidence.json') {
        const parsed = JSON.parse(value); parsed.items.find(item => item.id === 'UI-069').verifierEvidence.anchor = 'UI-069'; value = JSON.stringify(parsed);
      }
      if (mutation.duplicate && relative === 'scripts/internal/verify_v320_resolution_search_metrics.mjs') value += '\nassertIncludes(searchMetricsBlock, "media-server.ops.v320-resolution-search-metrics.v1", "UI-069 block-scoped canonical product state");\n';
      if (mutation.control && relative === 'src/ingress/product_ui_server_pages.cpp') value = value.replaceAll('ops-v320-unified-events-workspace', 'removed-workspace-control');
      if (mutation.pin && relative === 'src/analysis/event_retention_cleanup.cpp') value = value.replaceAll('item.pinned && request.policy.pinned_excludes_automatic_cleanup', 'item.pinned && !request.policy.pinned_excludes_automatic_cleanup');
      if (mutation.identity && relative === 'test/fixtures/v310_optional_vector_search/cases.json') {
        const parsed = JSON.parse(value); parsed.cases[0].contractInvariants.identityEmbeddingIndexed = true; value = JSON.stringify(parsed);
      }
      return value;
    };
    for (const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync']) fs[key] = () => {throw new Error('정적 검사의 파일 변경 금지');};
    await import(pathToFileURL(path.join(root, 'scripts/internal/verify_' + ${JSON.stringify(name)} + '.mjs')).href);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  return result;
}
function rejected(result, reason) {
  assert.equal(result.status, 1, result.stderr + result.stdout);
  const output = result.stdout + result.stderr;
  assert(output.includes('[fail]') && output.includes(reason), output);
}
test('V31-V32-DOC 기능 문서 소비자', async t => {
  const before = snapshot();
  try {
    for (const [name, id, schema] of cases) {
      await t.test('01 종료 기록 없이 정상 ' + name, () => {
        const result = invoke(name); assert.equal(result.status, 0, result.stderr + result.stdout);
        assert(result.stdout.includes('uiFulltest: not-run-by-this-command'));
        assert(result.stdout.includes('longrun30Or120: not-run-by-this-command'));
      });
      await t.test('02 현재 정의 누락 거부 ' + id, () => rejected(invoke(name, {removeId: id}), id));
      await t.test('03 기존 제품 계약 검사 실패 전파 ' + name, () => rejected(invoke(name, {schema}), schema));
    }
    for (const name of ['v310_client_safe_event_digest','v310_operator_feature_correction','v320_client_safe_resolution_digest']) {
      await t.test('04 실제 UI 정의 연결 유지 ' + name, () => rejected(invoke(name, {manual: true}), 'manual UI'));
    }
    for (const [name, id] of [['v310_replay_timeline_ui','SAFE-095'], ['v310_operator_feature_correction','SAFE-098'], ['v320_source_reliability_context','EVT-066']]) {
      await t.test('05 독립 인증/런타임 연결 유지 ' + id, () => rejected(invoke(name, {mapping: id}), id));
    }
    await t.test('06 pin 보호 반례', () => rejected(invoke('v310_retention_export_hardening', {pin: true}), 'pinned'));
    await t.test('06 신원 embedding 반례', () => rejected(invoke('v310_optional_vector_search', {identity: true}), 'identity embedding'));
    await t.test('07 분리된 UI control 누락 거부', () => rejected(invoke('v320_unified_ops_events_workspace', {control: true}), 'ops-v320-unified-events-workspace'));
    await t.test('07 구형 ID anchor 거부', () => rejected(invoke('v320_resolution_search_metrics', {anchor: true}), 'UI-069'));
    await t.test('07 중복 assertion 위치 거부', () => rejected(invoke('v320_resolution_search_metrics', {duplicate: true}), 'one location'));
  } finally {
    assert.deepEqual(snapshot(), before, '실제 제품/fixture는 불변이어야 함');
  }
});
