// 파일 용도: 승인된 exact 소유·제한 파일 연결과 기존 직접 packet 계약 진입점을 검사한다.
// SAFE-211/SAFE-215 관련 데이터 자체검사이며 전체 graph·readiness PASS가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyModule, fileDependencyAllowed, validateFileDependencyPolicy} from './structure_dependency_policy_lib.mjs';

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
const classifiers = [classifyModule];
test('C1 execution/readiness/strict JSON use the same exact owner and policy semantics', () => {
  for (const name of ['structure_stabilization_execution','structure_stabilization_readiness','strict_json_service_boundary']) {
    const source = read(`scripts/internal/verify_v390_${name}.mjs`);
    assert(source.includes('from "./structure_dependency_policy_lib.mjs"'));
    assert(!source.includes('function classifyModule('));
  }
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
test('OWNER-C 공통 분류기의 기존 exact 8개·중복 없는 소유', () => {
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
    assert.throws(() => classify([...expected.keys()][0], duplicate), /ambiguous exact/);
    const repeated = structuredClone(graph.moduleClassifiers);
    repeated.find(item => item.exactFiles.includes([...expected.keys()][0])).exactFiles.push([...expected.keys()][0]);
    assert.throws(() => classify([...expected.keys()][0], repeated), /ambiguous exact/);
    assert.throws(() => classify('src/synthetic.cpp', [
      {id: 'one', exactFiles: [], prefixes: ['src/']},
      {id: 'two', exactFiles: [], prefixes: ['src/']},
    ]), /ambiguous production/);
    assert.throws(() => classify('include/recording/unclassified-fixture.h', graph.moduleClassifiers), /unclassified/);
  }
});
test('OWNER-C 실제 최종 소스는 모두 단일 소유: 정책 허용 판정과 구분', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), {withFileTypes: true}).flatMap(entry => {
    const file = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() && /\.(h|cpp)$/.test(file) ? [file] : [];
  });
  const files = graph.productionRoots.flatMap(walk).sort();
  const remaining = files.filter(file => {
    try {classifiers[0](file, graph.moduleClassifiers); return false;}
    catch (error) {assert.match(error.message, /unclassified/); return true;}
  });
  assert.deepEqual(remaining, []);
  const exact = graph.moduleClassifiers.flatMap(item => item.exactFiles);
  assert.equal(new Set(exact).size, exact.length, '중복 exact 소유');
  for (const item of graph.moduleClassifiers) for (const file of item.exactFiles) {
    assert(files.includes(file), `없는 exact 소유: ${file}`);
    assert.equal(classifyModule(file, graph.moduleClassifiers), item.id);
  }
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

// 승인된 제한 정책/값 계약을 확인한다. 소유 분류와 모든 연결의 허용 판정은 별개다.
const executionSource = read('scripts/internal/verify_v390_structure_stabilization_execution.mjs');
const functionSource = name => {
  const start = executionSource.indexOf(`function ${name}(`);
  const end = executionSource.indexOf('\nfunction ', start + 1);
  assert(start >= 0 && end > start, name);
  return executionSource.slice(start, end);
};
const hash = value => createHash('sha256').update(value).digest('hex');
const policyFunctions = {fileDependencyAllowed, validateFileDependencyPolicy, classifyModule,
  findCycleComponents: vm.runInNewContext(`(${functionSource('findCycleComponents')})`)};
const {fileDependencyAllowed: allowed, validateFileDependencyPolicy: validateExact} = policyFunctions;
const ownership = [...new Map(policy.allowedFileDependencies.flatMap(item =>
  [[item.source, item.from], [item.target, item.to]])).entries()].map(([file, owner]) => ({file, owner}));

test('POLICY-C1 nine approved include pairs only; unrelated and reverse denied', () => {
  assert.equal(policy.allowedFileDependencies.length, 9);
  const pairs = [
    ['src/application/media_server_application.cpp', 'include/recording/recording_catalog.h'],
    ['src/application/media_server_application.cpp', 'include/recording/recording_journal.h'],
    ['include/recording/recording_runtime_composition.h', 'include/recording/recording_catalog.h'],
    ['include/recording/recording_supervisor.h', 'include/core/recording_runtime_config_data.h'],
    ['include/recording/segment_writer.h', 'include/recording/recording_time_snapshot.h'],
    ['src/recording/recording_derived_event_worker.cpp', 'include/recording/recording_completion_trace.h'],
    ['src/recording/recording_read_service.cpp', 'include/recording/recording_latency_trace.h'],
    ['src/ingress/recording_application_service.cpp', 'include/recording/recording_latency_trace.h'],
    ['src/recording/recording_read_service.cpp', 'include/recording/recording_completion_trace.h'],
  ];
  assert.deepEqual(policy.allowedFileDependencies.map(item => [item.source, item.target]), pairs);
  assert.equal(validateExact(policy, ownership).length, 0);
  for (const item of policy.allowedFileDependencies) {
    const includes = [...read(item.source).matchAll(/^\s*#\s*include\s*"([^"]+)"/gm)].flatMap(match =>
      [path.posix.join(path.posix.dirname(item.source), match[1]), `include/${match[1]}`, `src/${match[1]}`]);
    assert(includes.includes(item.target), `${item.source} 실제 include`);
    assert(allowed(policy, item.source, item.target, item.from, item.to));
    assert(!allowed(policy, item.source, 'include/core/unrelated.h', item.from, item.to));
    assert(!allowed(policy, 'src/unrelated.cpp', item.target, item.from, item.to));
    assert(!allowed(policy, item.target, item.source, item.to, item.from));
  }
  assert(!allowed(policy, 'include/analysis/a.h', 'include/core/a.h', 'analysis-services', 'core-utilities'));
  for (const entry of policy.immutableHistoricalBindings) assert.equal(hash(fs.readFileSync(path.join(root, entry.path))), entry.sha256);
  const ledger = JSON.parse(read('test/fixtures/v390_structure_stabilization_execution.json'));
  assert.equal(ledger.currentArchitecturePolicy.sha256, hash(read(ledger.currentArchitecturePolicy.path)));
});

test('POLICY-2A malformed, duplicate, unknown or wrong owner cannot grant a file allowance', () => {
  for (const change of [
    value => value.allowedFileDependencies.push({...value.allowedFileDependencies[0]}),
    value => {value.allowedFileDependencies[0].source = 'src/../outside.cpp';},
    value => {value.allowedFileDependencies[0].target = 'include/recording/*.h';},
    value => {value.allowedFileDependencies[0].to = 'unknown-owner';},
    value => {value.allowedFileDependencies[0].from = 'core-media-interfaces';},
  ]) {const value = structuredClone(policy); change(value); assert(validateExact(value, ownership).length > 0);}
  assert(validateExact(policy, ownership.slice(1)).length > 0);
});

function collectFixture(contents, extraPolicy = []) {
  const sources = Object.keys(contents);
  const value = {
    productionRoots: ['src', 'include'], sourceExtensions: ['.h', '.cpp'], cmake: {file: 'CMakeLists.txt'},
    moduleClassifiers: [
      {id: 'application-service-interfaces', exactFiles: ['src/application.cpp'], prefixes: []},
      {id: 'core-utilities', exactFiles: ['include/allowed.h', 'include/forbidden.h'], prefixes: []},
    ],
  };
  const fixturePolicy = {ownerIds: value.moduleClassifiers.map(item => item.id), allowedDependencyDirections: [],
    allowedFileDependencies: [{source: 'src/application.cpp', target: 'include/allowed.h',
      from: 'application-service-interfaces', to: 'core-utilities', reason: 'fixture exact edge'}, ...extraPolicy]};
  const collect = vm.runInNewContext(`(${functionSource('collectCurrentGraph')})`, {
    ...policyFunctions, path, rootDir: '/fixture', readText: file => contents[file] || '', sha256Text: hash,
    walkFiles: dir => sources.filter(file => path.posix.dirname('/fixture/' + file) === dir).map(file => '/fixture/' + file),
    parseCmakeBuildGraph: () => ({}),
  });
  return collect(value, fixturePolicy);
}
test('POLICY-2A direction grouping does not hide one forbidden witness; unknown and cycles retained', () => {
  const normal = {'src/application.cpp': '#include "allowed.h"', 'include/allowed.h': '', 'include/forbidden.h': ''};
  const good = collectFixture(normal);
  assert.equal(good.observedModuleEdges[0].allowedByTarget, true);
  const mixed = collectFixture({...normal, 'src/application.cpp': '#include "allowed.h"\n#include "forbidden.h"'});
  assert.equal(mixed.observedModuleEdges[0].witnessCount, 2);
  assert.equal(mixed.observedModuleEdges[0].allowedByTarget, false);
  assert.deepEqual(Array.from(mixed.forbiddenFileDependencies), ['src/application.cpp -> include/forbidden.h']);
  assert.throws(() => collectFixture({...normal, 'include/unknown.h': ''}), /unclassified/);
  const cycle = collectFixture({...normal, 'include/allowed.h': '#include "../src/application.cpp"'});
  assert.equal(cycle.stronglyConnectedComponents.length, 1);
  assert(cycle.observedModuleEdges.some(edge => !edge.allowedByTarget));
});

test('C1 strict JSON and execution agree on exact allowances and mixed forbidden witnesses', () => {
  const source = read('scripts/internal/verify_v390_strict_json_service_boundary.mjs');
  const start = source.indexOf('function collectObservedEdges(');
  const end = source.indexOf('\nfunction ', start + 1);
  for (const include of ['#include "allowed.h"', '#include "allowed.h"\n#include "forbidden.h"']) {
    const contents = {'src/application.cpp': include, 'include/allowed.h': '', 'include/forbidden.h': ''};
    const fixtureGraph = {moduleClassifiers: [
      {id: 'application-service-interfaces', exactFiles: ['src/application.cpp'], prefixes: []},
      {id: 'core-utilities', exactFiles: ['include/allowed.h', 'include/forbidden.h'], prefixes: []},
    ]};
    const fixturePolicy = {allowedDependencyDirections: [], allowedFileDependencies: [{
      source: 'src/application.cpp', target: 'include/allowed.h',
      from: 'application-service-interfaces', to: 'core-utilities',
    }]};
    const collect = vm.runInNewContext(`(${source.slice(start, end)})`, {
      path, classifyModule, fileDependencyAllowed, sha256Text: hash,
      walkProduction: () => Object.keys(contents), read: file => contents[file],
    });
    assert.equal(JSON.stringify(collect(fixtureGraph, fixturePolicy)), JSON.stringify(collectFixture(contents).observedModuleEdges));
  }
});

test('C1 moved completion diagnostics retain opt-in, bounds, redaction and failure isolation', () => {
  const trace = read('include/recording/recording_completion_trace.h');
  assert(trace.includes('if(!latency::Enabled())return;'));
  assert(trace.includes('rows>=4095') && trace.includes('2*1024*1024-512'));
  assert(trace.includes('Hash(reference,ref)&&Hash(job,id)'));
  assert(trace.includes('catch(...)') && trace.includes('noexcept'));
  const service = read('src/recording/recording_read_service.cpp');
  assert(service.includes('completion::Emit('));
  assert(!/if\s*\(\s*completion::Emit/.test(service));
});

test('POLICY-2A new value contracts have exact domain ownership without broad prefixes', () => {
  const files = ['recording_query_values.h', 'recording_selection_values.h', 'recording_remux_result.h']
    .map(name => 'include/recording/' + name);
  const exact = graph.moduleClassifiers.flatMap(item => item.exactFiles);
  assert.equal(new Set(exact).size, exact.length);
  for (const file of files) for (const classify of classifiers) {
    assert.equal(classify(file, graph.moduleClassifiers), 'domain-and-registry-owners');
    assert.equal(graph.moduleClassifiers.filter(item => item.exactFiles.includes(file)).length, 1);
  }
  assert(!graph.moduleClassifiers.some(item => item.prefixes.includes('include/recording/')));
  for (const classify of classifiers) assert.throws(() => classify('include/recording/not-assigned.h', graph.moduleClassifiers), /unclassified/);
});

test('POLICY-2A stored allowance is bound to actual witnesses; stale and forged flags rejected', () => {
  const validate = vm.runInNewContext(`(${functionSource('validateGraphPolicy')}\n)`, {
    validateFileDependencyPolicy: validateExact, sha256Text: hash,
  });
  const from='application-service-interfaces', to='core-utilities';
  const value={ownerIds:[from,to],allowedDependencyDirections:[],allowedFileDependencies:[{
    source:'src/application.cpp',target:'include/allowed.h',from,to,reason:'fixture',
  }]};
  const actual=collectFixture({'src/application.cpp':'#include "allowed.h"','include/allowed.h':''});
  actual.cmake={duplicateSources:[],missingSources:[],unknownSources:[],targets:[],internalTargetSeparation:false};
  const stored={observedModuleEdges:structuredClone(actual.observedModuleEdges),cmake:{targets:[],internalTargetSeparation:false}};
  assert.equal(validate(stored,value,actual).length,0);
  stored.observedModuleEdges[0].allowedByTarget=false;
  assert(validate(stored,value,actual).some(error=>error.includes('stored-allowed-direction-drift')));
  stored.observedModuleEdges[0].allowedByTarget=true;stored.observedModuleEdges[0].witnessSha256='0'.repeat(64);
  assert(validate(stored,value,actual).some(error=>error.includes('stored-witness-drift')));
  value.temporaryDebtExceptions=[{direction:from+' -> '+to,countsAsTargetViolation:true}];
  value.allowedDependencyDirections.push(from+' -> '+to);
  assert(validate(stored,value,actual).some(error=>error.includes('temporary-debt-hidden')));
});

test('OWNER-2B ticket 저장 책임과 복구 조정의 exact 소유', () => {
  const groups = {
    'domain-and-registry-owners': ['include/recording/recording_finalize_ticket.h',
      'include/recording/recording_finalize_ticket_io.h', 'src/recording/recording_finalize_ticket.cpp',
      'src/recording/recording_catalog.cpp'],
    'application-service-interfaces': ['include/recording/recording_finalize_recovery.h',
      'src/recording/recording_finalize_recovery.cpp'],
  };
  for (const classify of classifiers) for (const [owner, files] of Object.entries(groups))
    for (const file of files) {
      assert(fs.statSync(path.join(root, file)).isFile(), file);
      assert.equal(graph.moduleClassifiers.filter(c => c.exactFiles.includes(file)).length, 1, file);
      assert.equal(classify(file, graph.moduleClassifiers), owner, file);
    }
  assert(!read('src/recording/recording_catalog.cpp').includes('#include "recording/recording_finalize_recovery.h"'));
  for (const file of groups['domain-and-registry-owners'].slice(0, 3))
    assert(!read(file).includes('#include "recording/recording_media_inspector.h"'));
});

test('OWNER-2B timeline 순수 계산·투영과 파일 조회 조정의 exact 소유', () => {
  const groups = {
    'domain-and-registry-owners': ['include/recording/recording_timeline.h',
      'include/recording/recording_timeline_calculations.h', 'src/recording/recording_timeline_projection.cpp'],
    'application-service-interfaces': ['include/recording/recording_read_service.h',
      'src/recording/recording_read_service.cpp'],
  };
  for (const classify of classifiers) for (const [owner, files] of Object.entries(groups))
    for (const file of files) {
      assert.equal(graph.moduleClassifiers.filter(c => c.exactFiles.includes(file)).length, 1, file);
      assert.equal(classify(file, graph.moduleClassifiers), owner, file);
    }
  const projection = read('src/recording/recording_timeline_projection.cpp');
  assert(!projection.includes('#include "recording/recording_read_service.h"'));
  assert(!projection.includes('RecordingReadService::'));
  const service = read('src/recording/recording_read_service.cpp');
  assert(service.includes('RecordingReadService::FinishTimelineV2('));
  assert(service.includes('RecordingReadService::FinishTimelineWithContext('));
});

test('OWNER-2B supervisor는 명시 입력을 소유하고 전역 설정을 읽지 않는다', () => {
  for (const classify of classifiers)
    for (const file of ['include/recording/recording_supervisor.h', 'src/recording/recording_supervisor.cpp'])
      assert.equal(classify(file, graph.moduleClassifiers), 'application-service-interfaces');
  const implementation = read('src/recording/recording_supervisor.cpp');
  assert(!implementation.includes('GetAppConfig'));
  assert(!implementation.includes('#include "app_config.h"'));
  assert(read('include/recording/recording_supervisor.h').includes('const std::string stream_route_;'));
});
