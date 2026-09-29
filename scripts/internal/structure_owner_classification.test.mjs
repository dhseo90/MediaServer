// 파일 용도: 승인된 exact 소유 8개와 기존 직접 packet 계약 진입점만 검사한다.
// SAFE-211/SAFE-215 관련 데이터 자체검사이며 전체 graph·readiness PASS가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const graph = JSON.parse(read('test/fixtures/v390_structure_stabilization_current_graph.json'));
const policy = JSON.parse(read('test/fixtures/v390_structure_stabilization_current_architecture_policy.json'));
const expected = new Map([
  ['include/ingress/recording_application_service.h', 'application-service-interfaces'],
  ['src/ingress/recording_application_service.cpp', 'application-service-interfaces'],
  ['src/ingress/recording_evidence_application_mapping.h', 'application-service-interfaces'],
  ['include/ingress/recording_request_gate.h', 'transport-and-auth-adapter'],
  ['src/ingress/site_operations_request_diagnostic.h', 'transport-and-auth-adapter'],
  ['include/media/gstreamer_sample_observation.h', 'core-media-interfaces'],
  ['include/core/recording_runtime_config_data.h', 'core-utilities'],
  ['include/core/recording_runtime_defaults.h', 'core-utilities'],
]);
const classifiers = ['execution', 'readiness'].map(kind => {
  const source = read(`scripts/internal/verify_v390_structure_stabilization_${kind}.mjs`);
  const start = source.indexOf('function classifyModule(');
  const end = source.indexOf('\nfunction ', start + 1);
  assert(start >= 0 && end > start, '기존 분류 함수 추출 범위');
  return vm.runInNewContext(`(${source.slice(start, end)})`, {assert});
});
function checkExactOwners(value, classify) {
  const exact = value.flatMap(item => item.exactFiles);
  assert.equal(new Set(exact).size, exact.length, '중복 exact 소유');
  for (const [file, owner] of expected) {
    assert(fs.statSync(path.join(root, file)).isFile(), file);
    assert.equal(value.filter(item => item.exactFiles.includes(file)).length, 1, file);
    assert.equal(classify(file, value), owner, file);
  }
}
test('OWNER-C 기존 두 분류기의 exact 8개·중복 없는 소유', () => {
  for (const classify of classifiers) checkExactOwners(graph.moduleClassifiers, classify);
});
test('OWNER-C 중복 exact·앞선 광범위 prefix·미분류 검출 유지', () => {
  for (const classify of classifiers) {
    const duplicate = structuredClone(graph.moduleClassifiers);
    duplicate[0].exactFiles.push([...expected.keys()][0]);
    assert.throws(() => checkExactOwners(duplicate, classify), /중복 exact/);
    const ambiguous = structuredClone(graph.moduleClassifiers);
    ambiguous.unshift({id: 'wrong-owner', exactFiles: [], prefixes: ['include/']});
    assert.throws(() => checkExactOwners(ambiguous, classify));
    assert.throws(() => classify('include/recording/unclassified-fixture.h', graph.moduleClassifiers), /unclassified/);
  }
});
test('OWNER-C 나머지 실제 미분류 목록 관측: 전체 graph 통과 아님', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), {withFileTypes: true}).flatMap(entry => {
    const file = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && /\.(h|cpp)$/.test(file) ? [file] : [];
  });
  const files = graph.productionRoots.flatMap(walk).sort();
  const remaining = files.filter(file => {
    try {classifiers[0](file, graph.moduleClassifiers); return false;}
    catch (error) {assert.match(error.message, /unclassified/); return true;}
  });
  assert(remaining.length > 0, '이번 수정은 전체 분류 완료가 아님');
  assert(remaining.every(file => /^(include|src)\/recording\//.test(file)));
  console.log('[owner-observation] ' + JSON.stringify({productionFiles: files.length, exactAssignments: expected.size,
    remainingCount: remaining.length, remaining, fullGraphAssessed: false}));
});
test('OWNER-D 설정 utility와 기존 packet 진입점의 직접 의존 방향', () => {
  const classify = file => classifiers[0](file, graph.moduleClassifiers);
  assert.equal(classify('include/app_config.h'), classify('include/core/recording_runtime_config_data.h'));
  assert.equal(classify('include/core/recording_runtime_config_data.h'), classify('include/core/recording_runtime_defaults.h'));
  const source = read('include/analysis/frame_source_association.h');
  assert(source.includes('#include "core/media_packet_contract.h"'));
  assert(!source.includes('#include "media_types.h"'));
  assert(read('include/analysis/raw_video_decoder.h').includes('#include "core/media_packet_contract.h"'));
  // 전이 의존은 남는다. 기존 정책은 실제 include edge의 소유 방향을 검사한다.
  assert(read('include/core/media_packet_contract.h').includes('#include "media_types.h"'));
  for (const [from, to] of [
    ['include/analysis/frame_source_association.h', 'include/core/media_packet_contract.h'],
    ['include/core/media_packet_contract.h', 'include/media_types.h'],
  ]) assert(policy.allowedDependencyDirections.includes(`${classify(from)} -> ${classify(to)}`));
  assert(!policy.allowedDependencyDirections.includes('analysis-services -> core-utilities'));
});
