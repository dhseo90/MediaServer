// 파일 용도: 현행 안전 계약의 정적 검사. 종료 버전의 실행 결과·완료 표는 읽지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {parseServerDispatches} from './script_dispatch_parser.mjs';
import {parseEntryRoot} from './entry_baseline_documentation.mjs';
import {EXPECTED_FEATURE_ROWS, parseFeatureRows, validateImplementationManifestStructure} from './feature_implementation_manifest_lib.mjs';
import {validateReview4AppliedManifest, validateSemanticItem} from './feature_semantic_evidence_lib.mjs';

const commands = {
  layer: 'verify-v400-verification-layer-reduction',
  freeze: 'verify-v400-local-ops-policy-freeze',
  incident: 'verify-v400-incident-os-policy',
  evidence: 'verify-v400-evidence-ops-policy',
  stabilization: 'verify-v400-local-ops-stabilization',
};
const boundIds = ['OPS-041', 'OPS-163', 'SAFE-196', 'OPS-179', 'SAFE-199', 'SAFE-200'];
const decisionIds = ['action-execution', 'persistent-credential-store', 'production-restore', 'external-vlm-provider-call', 'model-backed-reid-session'];
const nav = ['/ops/home', '/ops/dashboard', '/ops/sources', '/ops/rules', '/ops/users', '/client/live'];
const incidentCommands = ['verify-v320-unified-ops-events-workspace', 'verify-v320-resolution-search-metrics', 'verify-v310-replay-timeline-ui', 'verify-ops-event-review-inbox'];
const evidenceCommands = ['verify-v300-event-evidence-contract', 'verify-v300-feature-only-retention', 'verify-v300-retention-pin-cleanup'];
const layerCommands = ['verify-v400-roadmap-contract', 'verify-v400-entry-baseline', 'verify-v400-user-review-gate', commands.layer, commands.freeze, commands.incident, commands.evidence, commands.stabilization, 'verify-v400-release-readiness'];

function reader(root) {
  const base = fs.realpathSync(root);
  return relative => {
    assert(typeof relative === 'string' && relative && !path.isAbsolute(relative), '입력 경로 형식 오류');
    const candidate = path.resolve(base, relative);
    assert(candidate.startsWith(base + path.sep), '입력 경로 이탈');
    const real = fs.realpathSync(candidate);
    assert(real.startsWith(base + path.sep) && fs.statSync(real).isFile(), '입력 경로 이탈 또는 일반 파일 아님');
    return fs.readFileSync(real, 'utf8');
  };
}
function list(value, count, label) {
  assert(Array.isArray(value) && value.length === count && new Set(value).size === count && value.every(item => typeof item === 'string' && item), label + ' 검사 목록 불일치');
}
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
function contains(source, tokens, label) {
  for (const token of tokens) assert(source.includes(token), label + ' 토큰 누락: ' + token);
}
function dispatch(read, names) {
  const observed = parseServerDispatches(read('server.sh'));
  for (const command of names) {
    const entries = observed.filter(entry => entry.command === command);
    assert(entries.length === 1, command + ' dispatch 누락/중복');
    // 이 명령들의 기존 CLI/파일 대응은 변경하지 않는다.
    const script = command === 'verify-project-inventory'
      ? 'verify_project_feature_test_inventory.mjs' : command.replaceAll('-', '_') + '.mjs';
    assert.equal(entries[0].script, script, command + ' dispatch 대상 불일치');
    read('scripts/internal/' + entries[0].script);
  }
}

// 전체 집합·독립 승인 envelope와 지정된 기존 6개 proof를 검사한다.
// 소스 전체 파일 hash를 갱신해서 승인을 만들어내지 않는다.
export function validatePolicyBoundSources({rootDir, inventoryText, manifest}) {
  const rows = parseFeatureRows(inventoryText);
  const errors = validateImplementationManifestStructure({inventoryText, rows, manifest});
  if (errors.length) return errors;
  errors.push(...validateReview4AppliedManifest({rows, manifest}));
  for (const id of boundIds) {
    const row = rows.find(item => item.id === id), item = manifest.items.find(value => value.id === id);
    if (!row || !item || item.review?.approvalSource !== 'review4-independent-source-audit') {
      errors.push(id + ' 기존 REVIEW4 승인 누락'); continue;
    }
    errors.push(...validateSemanticItem({rootDir, row, item}));
  }
  return errors;
}

export function validateLayerDefinitions(inventoryText, wrapper, coverage) {
  const errors = [], rows = parseFeatureRows(inventoryText);
  if (EXPECTED_FEATURE_ROWS !== 986 || rows.length !== 986 || new Set(rows.map(row => row.id)).size !== 986) errors.push('986개 고유 기능 정의 불일치');
  for (const [area, expected] of [['UI', 424], ['30분', 50], ['120분', 7]]) {
    if (rows.filter(row => row.area.split(',').map(value => value.trim()).includes(area)).length !== expected) errors.push(area + ' 정의 개수 불일치');
  }
  for (const token of ['wrapperResult', 'resultScope', 'uiFulltestEvidenceStatus', 'manualResultStatus', 'longrunStatus']) {
    if (!wrapper.includes(token)) errors.push('wrapper 실행 분리 토큰 누락: ' + token);
  }
  if (!wrapper.includes('wrapperResult is not UI fulltest, 30-minute, 120-minute, or manual-result execution evidence')) errors.push('wrapper 비실행 경계 누락');
  for (const token of ['coverageStatus', 'executionEvidenceStatus', 'not-execution-evidence']) if (!coverage.includes(token)) errors.push('coverage 실행 분리 토큰 누락: ' + token);
  for (const token of ['wrapperResult is UI fulltest', 'coverageStatus: covered means execution PASS', 'contract PASS is UI fulltest PASS']) {
    if (wrapper.includes(token) || coverage.includes(token)) errors.push('실행 PASS 과장: ' + token);
  }
  return errors;
}

export function inspectCurrentPolicy(kind, root) {
  assert(Object.hasOwn(commands, kind), '알 수 없는 정책 검사');
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({name, pass: true}); }
    catch (error) { results.push({name, pass: false, detail: error.message}); }
  };
  const read = reader(root), json = file => JSON.parse(read(file));
  check('현재 명령 dispatch', () => dispatch(read, [commands[kind]]));
  if (kind === 'freeze') {
    const fixture = () => json('test/fixtures/v400_local_ops_policy_freeze.json');
    check('정확한 5개 결정과 현재 비구현 경계', () => {
      const f = fixture();
      assert.equal(f.schema, 'media-server.v400-local-ops-policy-freeze.v1');
      assert.deepEqual(f.frozenDecisions.map(item => item.id), decisionIds, '정확한 5개 결정 불일치');
      assert.equal(f.inheritedSignoff.editPolicy, 'reuse-do-not-edit');
      for (const id of ['OPS-181', 'SAFE-214']) assert(f.inheritedFeatureIds.includes(id), '기능 ID 누락');
      assert.equal(f.fieldSmoke.status, 'conditional-not-run');
      assert.equal(f.fieldSmoke.includedInDeferredDecisionSet, false);
      for (const item of f.frozenDecisions) list(item.requiredSnippets, 2, item.id);
    });
    check('기존 독립 결정 원본과 비실행 상태', () => {
      const f = fixture(), text = read(f.inheritedSignoff.fixture);
      assert.equal(f.inheritedSignoff.sha256, '7cbd812941e5488e1bb9cd3d4604dcb14f1cb17b93022832e247b8c52d38485d', '승인 원본 hash 기준 변경');
      assert.equal(sha(text), f.inheritedSignoff.sha256, '승인 원본 hash 불일치');
      const signoff = JSON.parse(text);
      assert.equal(signoff.schema, 'media-server.v390-deferred-product-owner-signoff.v3');
      assert.deepEqual(signoff.decisions.map(item => item.id), decisionIds, '정확한 5개 결정 불일치');
      for (const frozen of f.frozenDecisions) {
        const item = signoff.decisions.find(value => value.id === frozen.id);
        assert.equal(item.implementationStatus, frozen.implementationStatus);
        assert.equal(item.capabilityStatus?.[frozen.writeStatusField], frozen.writeStatus);
        assert.equal(item.evidence?.method, frozen.method); assert.equal(item.evidence?.route, frozen.route);
        for (const key of ['fieldPassClaimed', 'releasePassClaimed', 'uiFulltestPassClaimed', 'longrunPassClaimed']) assert.equal(item[key], false, key);
      }
      assert.equal(signoff.externalFieldSmoke?.status, 'conditional-not-run');
      assert.equal(signoff.externalFieldSmoke?.includedInDeferredDecisionSet, false);
    });
    check('field-smoke 원본과 실제 실행의 구분', () => {
      const f = fixture(), text = read(f.fieldSmoke.fixture);
      assert.equal(f.fieldSmoke.sha256, '6905b0f03efa61b6a5f9a68c565358f4f31d61dc254d29a956527e6fd8b9ec47', 'field-smoke 원본 hash 기준 변경');
      assert.equal(sha(text), f.fieldSmoke.sha256, 'field-smoke 원본 hash 불일치');
      const field = JSON.parse(text);
      assert.equal(field.executionStatus, 'conditional-not-run');
      assert.equal(field.fieldPassClaimed, false); assert.equal(field.releasePassClaimed, false);
    });
    check('제품 소스의 비구현 false 토큰', () => {
      for (const item of fixture().frozenDecisions) {
        list(item.requiredSnippets, 2, item.id);
        assert(item.requiredSnippets.every(value => value.endsWith(':false')), item.id + ' false 토큰 조건');
        contains(read(item.sourceFile), item.requiredSnippets, item.id);
      }
    });
    check('기존 결정·상태 명령 dispatch', () => {
      const f = fixture();
      dispatch(read, [f.inheritedSignoff.command, f.fieldSmoke.command, ...f.frozenDecisions.map(item => item.inheritedCommand)]);
    });
  } else if (kind === 'incident') {
    const fixture = () => json('test/fixtures/v400_incident_os_policy.json');
    check('기존 화면·route·기능 정의', () => {
      const f = fixture(); assert.equal(f.schema, 'media-server.v400-incident-os-policy.v1');
      assert.deepEqual(f.surfaces.map(item => item.id), ['search', 'timeline', 'resolution']);
      assert(f.surfaces.every(item => item.route === '/ops/events'));
      assert.equal(f.iaPolicy.eventsRoute, '/ops/events');
      assert.equal(f.iaPolicy.eventsNavRole, 'diagnostic-direct-route-not-primary-nav');
      assert.deepEqual(f.iaPolicy.primaryNav, nav);
      assert.equal(f.unchangedContracts.eventPostSchema, 'unchanged');
      for (const id of ['UI-062', 'OPS-071']) assert(f.inheritedFeatureIds.includes(id), '기능 ID 누락');
    });
    check('Ops 메뉴·workspace 소스 연결', () => {
      const f = fixture(), a = f.sourceAnchors, source = read(a.opsShell);
      list(a.requiredNavSnippets, 6, '메뉴'); list(a.workspaceSnippets, 3, 'workspace');
      assert.deepEqual(a.requiredNavSnippets, nav.map(route => `AppendImageNavLink(out, "${route}"`));
      assert.equal(a.forbiddenNavSnippet, 'AppendImageNavLink(out, "/ops/events"');
      contains(source, a.requiredNavSnippets, '메뉴'); contains(source, a.workspaceSnippets, 'workspace');
      assert(!source.includes(a.forbiddenNavSnippet), '진단 route의 primary 메뉴 승격');
    });
    check('Event POST 기존 선언 경계', () => {
      const a = fixture().sourceAnchors; list(a.eventPostBoundarySnippets, 2, 'Event POST');
      contains(read(a.eventPostBoundaryFile), a.eventPostBoundarySnippets, 'Event POST');
    });
    check('기존 이벤트 검사 dispatch', () => {
      assert.deepEqual(fixture().inheritedCommands, incidentCommands); dispatch(read, incidentCommands);
    });
  } else if (kind === 'evidence') {
    check('이벤트 이미지 sidecar 계약·구현 연결', () => {
      contains(read('src/analysis/event_storage.cpp'), ['bool WriteEvidenceManifest(', 'media-server.event-evidence-contract.v1'], 'event sidecar');
      contains(read('docs/event-evidence-contract.md'), ['EvidenceManifest', 'FrameRef', 'media-server.event-evidence-contract.v1', 'pinned', 'dry-run', 'raw LLM/VLM prompt', 'raw provider response'], '이벤트 증거 계약');
    });
    check('현행 sidecar fixture 보존·개인정보 경계', () => {
      const f = json('test/fixtures/event_evidence_contract/evidence_manifest_sample.json');
      assert.equal(f.schema, 'media-server.event-evidence-contract.v1'); assert.equal(f.contractVersion, 1);
      assert.equal(f.retention?.defaultDays, 7);
      for (const key of ['pinnedExcludesAutomaticCleanup', 'cleanupRequiresDryRun', 'operatorConfigurable']) assert.equal(f.retention?.[key], true, key);
      for (const key of ['rawPromptStored', 'rawProviderResponseStored', 'identityFeaturesAllowed']) assert.equal(f.privacy?.[key], false, key);
      assert.equal(f.privacy?.allowedDurableFeatureMode, 'structured-non-identifying-feature-only');
    });
    check('기존 이벤트 저장·보존 검사 dispatch', () => dispatch(read, evidenceCommands));
  } else if (kind === 'stabilization') {
    check('이벤트 workspace 화면·검증 연결', () => {
      contains(read('src/ingress/product_ui_server_pages.cpp'), ['data-testid="ops-v320-unified-events-workspace"'], 'workspace');
      contains(read('scripts/internal/verify_v320_unified_ops_events_workspace.mjs'), ['readWebRtcHttpServerBundle'], 'bundle');
    });
    check('현재 로컬 운영 검사 dispatch', () => dispatch(read, [commands.freeze, commands.incident, commands.evidence, commands.layer, 'verify-project-inventory', 'verify-script-inventory']));
  } else {
    check('기능 정의 개수와 wrapper·실행 증거 분리', () => {
      assert.deepEqual(validateLayerDefinitions(read('docs/project-feature-test-inventory.md'), read('scripts/internal/verify_ui_fulltest_one_shot.mjs'), read('scripts/internal/verify_feature_inventory_coverage.mjs')), []);
    });
    check('기존 정책 명령 allowlist와 실제 dispatch', () => {
      const server = read('server.sh');
      const observed = [...new Set([...parseServerDispatches(server).map(item => item.command), ...[...server.matchAll(/^  (verify-v400-[a-z0-9-]+)$/gm)].map(match => match[1])])].filter(command => command.startsWith('verify-v400-'));
      assert.deepEqual(observed.sort(), [...layerCommands].sort()); dispatch(read, layerCommands);
    });
    check('REVIEW4 독립 승인과 지정 소스 proof', () => {
      assert.deepEqual(validatePolicyBoundSources({rootDir: root, inventoryText: read('docs/project-feature-test-inventory.md'), manifest: json('test/fixtures/project_feature_implementation_evidence.json')}), []);
    });
  }
  return results;
}

export function runCurrentPolicyCli(kind, args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log(`./server.sh ${commands[kind]} [--root <소스 경로>]\n현행 소스·fixture·명령 연결의 정적 검사입니다. 과거 완료 기록·제품 실행·릴리즈 PASS가 아닙니다.`); return;
  }
  const root = parseEntryRoot(args, fileURLToPath(new URL('../../', import.meta.url)));
  const results = inspectCurrentPolicy(kind, root);
  for (const item of results) console.log(`[${item.pass ? 'pass' : 'fail'}] ${item.name}${item.detail ? ': ' + item.detail : ''}`);
  console.log(`== ${commands[kind]} 현행 정적 계약 검사 ==`);
  for (const key of ['productRuntime', 'uiFulltest', 'longrun30Or120', 'publishedMetadata']) console.log(`- ${key}: not-run-by-this-command`);
  console.log(`- pass: ${results.filter(item => item.pass).length}\n- fail: ${results.filter(item => !item.pass).length}`);
  if (results.some(item => !item.pass)) process.exitCode = 1;
}
