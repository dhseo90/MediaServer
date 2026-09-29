// 파일 용도: 현행 문서의 정책 진입점·공개 식별자 연결을 검사한다. 과거 실행 결과는 읽지 않는다.
import {parseServerDispatches} from './script_dispatch_parser.mjs';

// 문서 표현·역사 기록 대신 현재 계약 식별자와 exact 기능/명령 연결을 확인한다.
// 실제 제품 동작·승인·UI/장시간 실행 판정은 이 함수의 범위가 아니다.
export function validateFeatureDocumentation({document, identifiers, command, script, featureIds, inventory, implementation, verification, server}) {
  const errors = [];
  if (!Array.isArray(identifiers) || !identifiers.length || identifiers.some(value => typeof value !== 'string' || !value)) errors.push('필수 계약 식별자 목록 없음');
  else for (const identifier of identifiers) if (typeof document !== 'string' || !document.includes(identifier)) errors.push('현행 문서 식별자 누락: ' + identifier);
  if (!/^verify-[a-z0-9-]+$/.test(command || '')) errors.push('검증 명령 형식 오류');
  const commands = text => new Set(String(text || '').match(/\bverify-[a-z0-9-]+\b/g) || []);
  if (!commands(verification).has(command)) errors.push('현행 검증 안내 명령 누락: ' + command);
  if (!Array.isArray(featureIds) || !featureIds.length || new Set(featureIds).size !== featureIds.length || featureIds.some(id => !/^[A-Z]+-\d+$/.test(id))) errors.push('기능 ID 목록 누락/중복/형식 오류');
  else for (const id of featureIds) {
    const rows = String(inventory || '').split(/\r?\n/).filter(line => line.startsWith('|') && line.split('|')[1]?.trim() === id);
    const declaredCommands = commands(rows[0]);
    // UI 정의처럼 명령이 표에 없는 경우에만 기존 구현 manifest의 exact 연결을 사용한다.
    // 명시된 다른 명령을 manifest로 덮어쓰거나, 이 연결 검사를 독립 승인 검토로 간주하지 않는다.
    const entries = Array.isArray(implementation?.items) ? implementation.items.filter(item => item.id === id) : [];
    const linked = declaredCommands.size > 0 ? declaredCommands.has(command)
      : entries.length === 1 && entries[0].verifierEvidence?.command === command;
    if (rows.length !== 1 || !linked) errors.push(id + ' 현행 기능 정의/명령 연결 누락 또는 중복');
  }
  const targets = parseServerDispatches(String(server || '')).filter(item => item.command === command);
  if (targets.length !== 1 || targets[0].script !== script) errors.push('실제 dispatch 누락/중복/대상 불일치: ' + command);
  return errors;
}

export function hasDocumentLink(text, target) {
  return [...text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .some((match) => match[1].split('#')[0].replace(/^\.\//, '') === target);
}

// 기록 정책의 현재 진입점/기능/명령 연결만 확인한다. 자연어 의미 전체나 실제 실행
// 결과를 판정하지 않으며 종료 원장·과거 PASS는 읽지 않는다.
export function validateReleaseRecordDocumentation({read, kind}) {
  const contracts = {
    index: ['verify-release-evidence-index', 'verify_release_evidence_index.mjs', ['OPS-039']],
    consistency: ['verify-v230-test-evidence-consistency', 'verify_v230_test_evidence_consistency.mjs', []],
    records: ['verify-v290-release-test-records-enforcement', 'verify_v290_release_test_records_enforcement.mjs', ['SAFE-075', 'OPS-045']],
    hygiene: ['verify-v290-release-evidence-hygiene', 'verify_v290_release_evidence_hygiene.mjs', ['SAFE-077', 'OPS-047']],
  };
  if (!Object.hasOwn(contracts, kind)) return ['기록 검사 종류 오류'];
  const [command, script, featureIds] = contracts[kind], errors = [];
  const agents = read('AGENTS.md'), policy = read('docs/release-policy.md');
  const verification = read('docs/stream-verification.md'), server = read('server.sh');
  const inventory = read('docs/project-feature-test-inventory.md');
  const implementation = JSON.parse(read('test/fixtures/project_feature_implementation_evidence.json'));
  for (const target of ['docs/stream-verification.md', 'docs/release-policy.md', 'docs/project-feature-test-inventory.md', 'docs/manual-ui-fulltest.md']) {
    if (!hasDocumentLink(agents, target)) errors.push('AGENTS 기록 기준 링크 누락: ' + target);
  }
  for (const target of ['../AGENTS.md', 'stream-verification.md', 'project-feature-test-inventory.md', 'manual-ui-fulltest.md']) {
    if (!hasDocumentLink(policy, target)) errors.push('릴리즈 기록 정책 링크 누락: ' + target);
  }
  for (const target of ['../AGENTS.md', 'project-feature-test-inventory.md', 'manual-ui-fulltest.md']) {
    if (!hasDocumentLink(verification, target)) errors.push('검증 기준 링크 누락: ' + target);
  }
  // 안정된 용어의 연결 확인이다. 문장/제목이나 과거 token 수치를 고정하지 않는다.
  for (const identifier of ['PASS', 'FAIL', 'manual-not-run', 'cleanup', 'token', 'elapsed', 'stdout/stderr']) {
    if (!policy.includes(identifier)) errors.push('기록 정책 식별자 누락: ' + identifier);
  }
  const fulltest = read('docs/manual-ui-fulltest.md');
  if (!hasDocumentLink(fulltest, 'stream-verification.md') || !fulltest.includes('Policy v4')) errors.push('실제 UI 기준 연결 누락');
  const commands = new Set(verification.match(/\bverify-[a-z0-9-]+\b/g) || []);
  if (!commands.has(command)) errors.push('기록 명령 안내 누락: ' + command);
  const dispatch = parseServerDispatches(server);
  const companions = kind === 'consistency' ? ['verify-release-evidence-index', 'verify-feature-inventory-coverage', 'verify-longrun-separation', 'verify-manual-ui-evidence']
    : kind === 'hygiene' ? ['verify-release-evidence-index', 'verify-script-inventory', 'verify-manual-ui-evidence'] : [];
  for (const [name, file] of [[command, script], ...companions.map(name => [name, name.replaceAll('-', '_') + '.mjs'])]) {
    const targets = dispatch.filter(item => item.command === name);
    if (targets.length !== 1 || targets[0].script !== file) errors.push('기록 dispatch 누락/중복/대상 불일치: ' + name);
  }
  if (featureIds.length) errors.push(...validateFeatureDocumentation({document: policy,
    identifiers: ['PASS', 'FAIL'], command, script, featureIds, inventory, implementation, verification, server}));
  for (const id of featureIds) {
    const entries = implementation.items?.filter(item => item.id === id) || [];
    if (entries.length !== 1 || entries[0].verifierEvidence?.command !== command) errors.push(id + ' canonical 명령 연결 누락/중복');
  }
  return errors;
}

// 기존 UI 명령은 유지하고 현재 기술 안내·정확한 dispatch만 연결한다.
// 제목·옛 단계 완료/미실행·과거 실행 원장은 입력이 아니다. 실제 화면 판정은 별도다.
export function validateUiComponentDocumentation({document, kind, verification, server}) {
  const scripts = {
    architecture: ['verify-v220-ui-architecture-inventory', 'verify_v220_ui_architecture_inventory.mjs'],
    responsive: ['verify-v220-responsive-task-shell', 'verify_v220_responsive_task_shell.mjs'],
    tokens: ['verify-v220-design-token-refresh', 'verify_v220_design_token_refresh.mjs'],
    primitives: ['verify-v220-component-primitives', 'verify_v220_component_primitives.mjs'],
    renderer: ['verify-v230-ui-renderer-module-decomposition', 'verify_v230_ui_renderer_module_decomposition.mjs'],
  };
  if (!Object.hasOwn(scripts, kind)) return ['UI 문서 검사 종류 오류'];
  const errors = [], doc = String(document || ''), [command, script] = scripts[kind];
  for (const link of ['ui-guide.md', 'manual-ui-fulltest.md', '../AGENTS.md']) {
    if (!hasDocumentLink(doc, link)) errors.push('UI 문서 정책 링크 누락: ' + link);
  }
  const commands = text => new Set(String(text || '').match(/\bverify-[a-z0-9-]+\b/g) || []);
  if (!commands(doc).has(command)) errors.push('UI 안내 명령 누락: ' + command);
  if (!hasDocumentLink(String(verification || ''), 'product-shell-component-examples.md')) {
    errors.push('검증 안내의 UI 기술 문서 링크 누락');
  }
  const targets = parseServerDispatches(String(server || '')).filter(item => item.command === command);
  if (targets.length !== 1 || targets[0].script !== script) errors.push('UI 명령 dispatch 누락/중복/대상 불일치: ' + command);
  if (kind === 'responsive') {
    const rows = doc.split(/\r?\n/).filter(line => line.trim().startsWith('|'))
      .map(line => line.split('|').slice(1, -1).map(cell => cell.replace(/`/g, '').trim()));
    for (const width of ['320', '390', '760', '1180']) {
      const matches = rows.filter(cells => new RegExp('^' + width + '(?:px)?\\+?$').test(cells[0]));
      if (matches.length !== 1 || !matches[0][1] || !matches[0][2]) errors.push('UI viewport 기준 누락/중복: ' + width);
    }
    for (const route of ['/setup', '/login', '/password/change', '/client/request-access',
      '/ops/home', '/ops/dashboard', '/ops/events', '/ops/sources', '/ops/rules', '/ops/users',
      '/client/live', '/client/dashboard', '/client/events']) {
      const matches = rows.filter(cells => cells[0]?.split(/[,\s]+/).includes(route));
      if (matches.length !== 1 || !matches[0][1] || !matches[0][2]) errors.push('UI route 작업 기준 누락/중복: ' + route);
    }
  }
  return errors;
}

// 작업 영역의 현재 route/정의와 정적 명령을 연결한다. 실제 UI·Auth 실행 증거나
// canonical runtime verifier 연결을 이 동반 검사로 대체하지 않는다.
export function validateUiWorkspaceDocumentation({document, kind, inventory, verification, server}) {
  const contracts = {
    'auth-setup-redesign': {routes: ['/setup', '/login', '/password/change', '/invite/setup', '/client/request-access'], ids: ['UI-002', 'UI-003', 'UI-004', 'UI-007', 'UI-008']},
    'client-live-redesign': {routes: ['/client/live', '/client/dashboard', '/client/events'], ids: ['UI-015', 'UI-016', 'UI-017']},
    'ops-workspace-redesign': {routes: ['/ops/home', '/ops/dashboard', '/ops/events'], ids: ['UI-009', 'UI-010', 'UI-014']},
    'rules-workspace-redesign': {routes: ['/ops/rules'], ids: ['UI-012']},
    'ops-channels-workspace': {routes: ['/ops/sources', 'ONVIF', 'WHEP', 'WHIP', 'PublishedView'], ids: ['UI-011']},
    'ops-users-access-workspace': {routes: ['/ops/users', '/client/request-access', '/invite/setup'], ids: ['UI-013', 'UI-007', 'UI-008']},
    'ops-vlm-containment': {routes: ['/ops/vlm', 'default-off', 'opsVlmRawDetails'], ids: ['UI-022', 'UI-023', 'UI-024', 'SAFE-025']},
    'client-preview-redaction-review': {routes: ['/client/live', '/client/dashboard', '/client/events', 'ops:read'], ids: ['SRC-028', 'CLIENT-014', 'CLIENT-018', 'SAFE-018']},
  };
  if (!Object.hasOwn(contracts, kind)) return ['UI 작업 영역 종류 오류'];
  const errors = [], doc = String(document || ''), {routes, ids} = contracts[kind];
  const command = 'verify-v220-' + kind, script = 'verify_v220_' + kind.replaceAll('-', '_') + '.mjs';
  for (const link of ['ui-guide.md', 'manual-ui-fulltest.md', '../AGENTS.md']) {
    if (!hasDocumentLink(doc, link)) errors.push('UI 작업 영역 정책 링크 누락: ' + link);
  }
  for (const route of routes) if (!doc.includes(route)) errors.push('UI 작업 영역 계약 식별자 누락: ' + route);
  const commands = new Set(doc.match(/\bverify-[a-z0-9-]+\b/g) || []);
  if (!commands.has(command)) errors.push('UI 작업 영역 명령 안내 누락: ' + command);
  if (!hasDocumentLink(String(verification || ''), 'product-shell-component-examples.md')) errors.push('UI 작업 영역 검증 안내 링크 누락');
  const targets = parseServerDispatches(String(server || '')).filter(item => item.command === command);
  if (targets.length !== 1 || targets[0].script !== script) errors.push('UI 작업 영역 dispatch 누락/중복/대상 불일치: ' + command);
  for (const id of ids) {
    const rows = String(inventory || '').split(/\r?\n/).filter(line => line.startsWith('|') && line.split('|')[1]?.trim() === id);
    if (rows.length !== 1 || !rows[0].split('|')[2]?.trim()) errors.push('UI 작업 영역 현행 정의 누락/중복: ' + id);
  }
  return errors;
}

// 공개 필드/값은 유지하되 inline field=value와 읽기 쉬운 key/value 표를 모두 허용한다.
export function hasDocumentFieldValue(text, field, value) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('\\b' + escaped + '=' + value + '(?![\\w-])').test(text)) return true;
  return String(text).split(/\r?\n/).some(line => {
    const cells = line.trim().split('|').slice(1, -1).map(cell => cell.replace(/`/g, '').trim());
    return cells.length >= 2 && cells[0].split(',').map(key => key.trim()).includes(field) && cells[1] === value;
  });
}

// 현장 검증의 현행 식별자/기본 상태를 연결한다. 옛 제목·완료 기록·체크박스 개수는 계약이 아니다.
// 문서와 fixture 검사는 실장비·외부 네트워크 성공이나 자연어 의미 전체를 증명하지 않는다.
export function validateFieldGateDocumentation(text, kind) {
  const doc = String(text || ''), errors = [];
  const contracts = {
    onvif: {
      ids: ['media-server.onvif-field-smoke-gate.v1', 'realDeviceTestPerformed', 'verificationStatus',
        'RTSP/RTSPS', 'source:write', 'sourceDraft', '--credential-ref-present', '--allow-missing-endpoint',
        'MEDIA_SERVER_ONVIF_FIELD_ENDPOINT', 'Digest', 'WS-Security', 'persistent credential store',
        'WS-Discovery', 'Profile G', 'RTSP/WebRTC media path', 'SourceRegistry/PublishedView',
        'verify-onvif-field-smoke-gate', 'verify-onvif-field-smoke-redaction', 'verify-onvif-field-smoke-sample-bundle'],
      links: ['onvif-field-smoke-artifact-redaction.md', 'onvif-live-source-support.md',
        'onvif-no-device-verification.md', 'onvif-credential-reference-policy.md'],
      fields: [['releaseDevelopmentStatus', 'procedure-fixed'], ['noDeviceSuiteCountsAsFieldSuccess', 'false'],
        ['endpointRedacted', 'true'], ['streamUriRedacted', 'true'], ['rawSoapIncluded', 'false'], ['plaintextSecretIncluded', 'false']],
      states: {gateDecision: ['not-run', 'blocked', 'failed', 'passed'], realDeviceEndpointSuccess: ['pass', 'fail', 'unverified'],
        playbackStatus: ['pass', 'fail', 'skipped'], redactionArtifactReview: ['pass', 'fail'], fieldSmokeReportReview: ['pass', 'fail']},
    },
    redaction: {
      ids: ['sourceDraft', 'source locator', 'ONVIF endpoint', 'credential reference', 'raw diagnostic JSON',
        '/client/api/views', '/ops/sources', '/ops/rules', 'clientRedaction', 'opsCopyParity', 'probeErrorWording',
        'gateDecision', 'playbackStatus', 'redactionArtifactReview', 'fieldSmokeReportReview', 'operatorChecklistStatus',
        'failureWording', 'verificationStatus', 'evidenceIndex', 'verify-onvif-probe-error-wording',
        'verify-onvif-field-smoke-gate', 'verify-onvif-field-smoke-redaction'],
      links: ['onvif-field-smoke-gate.md'], fields: [], states: {},
    },
    external: {
      ids: ['media-server.external-turn-whep-field-gate-fixtures.v1', 'media-server.external-turn-whep-field-gate-report.v1',
        'test/fixtures/external_turn_whep_field_gate/cases.json', 'verify-external-turn-whep-field-gate',
        'credentialMaterialStored', 'rawTurnServerStored', 'rawWhepUrlStored', 'rawIceCandidateStored', 'sourceUrlStored',
        'viewerClientExposureAdded', 'MEDIA-021', 'SAFE-039', 'checks', 'cases', 'summary'],
      links: ['onvif-field-smoke-gate.md'],
      fields: [['externalNetworkAttempted', 'false'], ['defaultReleasePassClaimAllowed', 'false'], ['fieldGatePassEligible', 'false']],
      states: {gateStatus: ['pass', 'fail'], fieldSmokeStatus: ['not-run', 'blocked', 'failed', 'passed'],
        turnRelayStatus: ['not-run', 'missing-credential', 'failed', 'passed'], whepPlaybackStatus: ['not-run', 'missing-endpoint', 'failed', 'passed']},
    },
  };
  const contract = contracts[kind];
  if (!contract) return ['unknown field document kind: ' + kind];
  for (const id of contract.ids) if (!doc.includes(id)) errors.push('field ' + kind + ' definition missing: ' + id);
  for (const link of contract.links) if (!hasDocumentLink(doc, link)) errors.push('field ' + kind + ' contract link missing: ' + link);
  for (const [field, value] of contract.fields) if (!hasDocumentFieldValue(doc, field, value)) errors.push('field ' + kind + ' field/value missing: ' + field);
  for (const [field, values] of Object.entries(contract.states)) {
    const rows = doc.split('\n').map(line => line.split('|').slice(1, -1).map(cell => cell.replace(/`/g, '').trim())).filter(cells => cells[0] === field);
    const actual = rows[0]?.[1]?.split(',').map(value => value.trim());
    if (rows.length !== 1 || !actual || actual.length !== values.length || values.some(value => !actual.includes(value))) errors.push('field ' + kind + ' states missing/invalid: ' + field);
  }
  return errors;
}

// 지원 표의 기술 식별자와 조건을 검사한다. 도입 버전·옛 제목·실행 성공 문구는 계약이 아니다.
// 표 행 안의 조건을 보므로 다른 행의 비지원 문구로 잘못된 지원 선언을 가리지 않는다.
// 이 정적 연결 검사만으로 실장비·네트워크 동작을 PASS로 판정하지 않는다.
export function validateOnvifSupportMatrixDocumentation(text) {
  const errors = [];
  const rows = String(text || '').split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  const requireRow = (name, identifiers, status) => {
    const matches = rows.map(line => line.split('|').slice(1, -1).map(cell => cell.trim().replace(/`/g, '')))
      .filter(cells => cells[0] === name);
    if (matches.length !== 1) { errors.push('matrix row missing/duplicate: ' + name); return; }
    const [label, state, ...detail] = matches[0];
    if (status && !status.test(state)) errors.push('matrix unsupported/conditional status missing: ' + label);
    for (const id of identifiers) if (![state, ...detail].join(' ').includes(id)) errors.push(label + ' missing: ' + id);
  };
  requireRow('ONVIF Device service SOAP', ['http://', 'https://', 'OpenSSL', 'GetServices']);
  requireRow('ONVIF Media2 service SOAP', ['Media2.GetProfiles', 'Media2.GetStreamUri']);
  requireRow('ONVIF Media service SOAP', ['Media.GetProfiles', 'Media.GetStreamUri']);
  requireRow('Live stream URI import', ['rtsp://', 'rtsps://', 'kind=rtsp']);
  requireRow('수동 ONVIF stream URI 등록', ['/ops/sources', 'rtsp://', 'rtsps://', 'http://', 'https://']);
  requireRow('MediaServer egress URL', ['RTSP', 'WHEP', 'WebRTC']);
  requireRow('HTTPS/TLS ONVIF SOAP endpoint', ['OpenSSL', 'certificate', 'hostname', 'fail-closed'], /제한|조건/);
  requireRow('Credential reference / HTTP Basic auth', ['provider', 'http_basic', 'Authorization', 'credential']);
  requireRow('SOAP Fault / malformed response', ['raw SOAP']);
  for (const name of ['ONVIF WS-Discovery', 'ONVIF PTZ', 'ONVIF Events / PullPoint',
    'ONVIF Profile G / Recording / Replay', 'ONVIF Analytics service', 'ONVIF Imaging service',
    'ONVIF Device management', 'WS-Security UsernameToken', 'HTTP Digest auth 주입']) {
    requireRow(name, [], /^(?:비지원|미지원)$/);
  }
  for (const target of ['onvif-rtsps-draft-policy.md', 'onvif-https-soap-transport-design.md',
    'onvif-https-tls-fixture-harness-design.md', 'onvif-auth-injection-design.md',
    'onvif-credential-store-integration-design.md', 'onvif-unsupported-api-guard.md',
    'onvif-no-device-verification.md']) {
    if (!hasDocumentLink(String(text || ''), target)) errors.push('matrix contract link missing: ' + target);
  }
  return errors;
}

// 실장비 제외 검사의 현행 명령/출력 계약을 연결한다. 과거 수행 시각·완료 문구는 요구하지 않는다.
// 이 문서 검사는 suite 실행이나 실장비 성공을 증명하지 않는다.
export function validateOnvifNoDeviceDocumentation(text) {
  const errors = [], doc = String(text || '');
  for (const [field, value] of [['mode', '실장비 제외'], ['realDeviceEndpointSuccess', '미확인']]) {
    if (!hasDocumentFieldValue(doc, field, value)) errors.push('no-device summary field/value missing: ' + field);
  }
  for (const id of [
    'media-server.onvif-no-device-suite-summary.v1', 'generatedAt', 'total', 'completed', 'failed',
    'results', 'index', 'command', 'ok', 'status', 'GetStreamUri', 'Media2', 'Media',
    'SourceRegistry', 'PublishedView', 'loopback', 'redaction',
    'test/fixtures/onvif_no_device_suite_success_summary.json',
    'test/fixtures/onvif_no_device_suite_failure_summary.json',
    'test/fixtures/onvif_synthetic_vendor_fixture_pack.json',
    'verify-onvif-no-device-suite --json-output', '--allow-missing-endpoint',
    '--expect-failure', '--credential-ref-present', '--output',
    'MEDIA_SERVER_ONVIF_FIELD_ENDPOINT',
    ...['no-device-mode', 'no-device-completion', 'protocol-support-matrix',
      'https-tls-fixture', 'auth-injection-loopback', 'probe-profile-variants',
      'synthetic-vendor-fixtures', 'local-simulator', 'soap-fault-matrix',
      'field-smoke-gate', 'field-http-probe', 'closed-loopback-failure-matrix',
      'field-smoke-redaction', 'field-smoke-sample-bundle'].map(name => 'verify-onvif-' + name),
  ]) if (!doc.includes(id)) errors.push('no-device definition missing: ' + id);
  for (const link of ['onvif-protocol-support-matrix.md', 'onvif-field-smoke-gate.md',
    'onvif-tls-transport-policy.md', 'onvif-credential-reference-policy.md']) {
    if (!hasDocumentLink(doc, link)) errors.push('no-device contract link missing: ' + link);
  }
  return errors;
}

// TLS 문서는 현행 전송/검사 식별자와 실제 출력 경계를 연결한다.
// 제목·버전·과거 PASS·미구현 JSON 예시는 요구하지 않는다. 자연어 의미는 별도 리뷰 대상이다.
export function validateOnvifTlsDocumentation(text, kind) {
  const doc = String(text || ''), errors = [];
  const contracts = {
    policy: {
      ids: ['SendOnvifSoapHttp', 'http://', 'https://', 'OpenSSL', 'certificate verification',
        'hostname verification', 'MEDIA_SERVER_ONVIF_TLS_CA_FILE', 'https transport requires OpenSSL support',
        'TLS trust store load failed', 'userinfo', 'http_basic', 'Authorization', 'raw SOAP',
        'verify-onvif-tls-transport-policy', 'verify-onvif-https-soap-transport-design',
        'verify-onvif-https-tls-fixture', 'verify-onvif-http-transport', '미확인'],
      links: ['onvif-https-soap-transport-design.md', 'onvif-https-tls-fixture-harness-design.md', 'onvif-credential-reference-policy.md'],
    },
    transport: {
      ids: ['SendOnvifSoapHttp', 'ParseHttpUrl', 'http://', 'https://', 'OpenSSL', 'userinfo',
        'invalid endpoint URL', 'MEDIA_SERVER_ONVIF_TLS_CA_FILE', 'SSL_VERIFY_PEER', 'SSL_set1_host',
        'SSL_connect', 'SSL_CTX_load_verify_locations', 'SSL_CTX_set_default_verify_paths',
        'https transport requires OpenSSL support', 'TLS certificate verification failed', 'TLS handshake failed',
        'http_basic', 'Authorization', 'raw SOAP', 'RunHttpsTransportFailureMatrix',
        'verify-onvif-https-soap-transport-design', 'verify-onvif-https-tls-fixture', 'verify-onvif-http-transport'],
      links: ['onvif-tls-transport-policy.md', 'onvif-https-tls-fixture-harness-design.md', 'onvif-auth-injection-design.md'],
    },
    fixture: {
      ids: ['verify-onvif-https-tls-fixture', 'verify-onvif-http-transport', 'SendOnvifSoapHttp',
        'Node', 'stdout', 'ephemeral CA', 'fixture CA bundle', 'hostname verification',
        'trusted fixture success', 'untrusted CA failure', 'hostname mismatch failure',
        'certificate expired failure', 'handshake failure', 'connection refused',
        'certificate dump', 'private key', 'raw SOAP', 'finally'],
      links: ['onvif-https-soap-transport-design.md', 'onvif-tls-transport-policy.md', 'onvif-field-smoke-artifact-redaction.md'],
    },
  };
  const contract = contracts[kind];
  if (!contract) return ['unknown TLS document kind: ' + kind];
  for (const id of contract.ids) if (!doc.includes(id)) errors.push('TLS ' + kind + ' definition missing: ' + id);
  for (const link of contract.links) if (!hasDocumentLink(doc, link)) errors.push('TLS ' + kind + ' contract link missing: ' + link);
  if (kind === 'fixture') for (const [field, value] of [['mode', 'fixture-only'], ['trustedFixtureSuccess', 'true'],
    ['redactionVerified', 'true'], ['realDeviceEndpointSuccess', '미확인'], ['failures', '0']]) {
    if (!hasDocumentFieldValue(doc, field, value)) errors.push('TLS fixture summary field/value missing: ' + field);
  }
  return errors;
}

// credential 안내에서 현재 API/내부 provider/향후 저장소를 분리한다.
// 실제 상태·secret 거부·권한·wire 주입은 기존 독립 source/fixture/C++ 검사를 그대로 사용한다.
export function validateOnvifCredentialDocumentation(text, kind) {
  const doc = String(text || ''), errors = [];
  const contracts = {
    policy: {
      ids: ['credentialRefPresent', 'credential_ref_present', 'plaintext_secret_included=false',
        'SourceRegistry', 'PublishedView', 'client/viewer', 'sourceDraft', 'publishedViewDraft', 'source:write',
        'POST /ops/api/onvif/import-draft', 'GET /ops/api/onvif/credential-provider-status',
        'media-server.onvif-credential-binding-gate.v1',
        'media-server.ops.v390-onvif-credential-provider-status.v1', 'sanitizedCredentialProviderStatusSummary',
        'NoneCredentialSecretProvider', 'InMemoryCredentialSecretProvider', 'RunOnvifProbeAdapter',
        'verify-onvif-credential-reference-policy', 'verify-onvif-probe-draft-api'],
      links: ['onvif-credential-store-integration-design.md', 'onvif-auth-injection-design.md'],
      fields: [['credentialLookupPerformed', 'false'], ['productPersistentSecretStoreEnabled', 'false'],
        ['externalSecretManagerEnabled', 'false'], ['referenceValueExposed', 'false'], ['credentialMaterialExposed', 'false']],
    },
    auth: {
      ids: ['RunOnvifProbeAdapter', 'NoneOnvifCredentialProvider', 'ApplyCredentialMaterial',
        'credential_ready', 'secret_material_present=true', 'http_basic', 'Authorization', 'credentialRefPresent',
        'source:write', '401', '403', 'redaction.mustRedact',
        'media-server.onvif-auth-method-design-matrix.v1', 'onvif_auth_method_design_matrix.json',
        'verify-onvif-auth-injection-design', 'verify-onvif-auth-injection-loopback'],
      links: ['onvif-credential-reference-policy.md', 'onvif-credential-store-integration-design.md', 'onvif-https-soap-transport-design.md'],
      fields: [['realDeviceEndpointSuccess', '미확인'], ['plaintextSecretIncluded', 'false'],
        ['rawSoapIncluded', 'false'], ['persistentSecretStoreImplemented', 'false']],
    },
    store: {
      ids: ['CredentialSecretProvider', 'ProviderId', 'Lookup', 'CredentialSecretMaterial',
        'NoneCredentialSecretProvider', 'InMemoryCredentialSecretProvider', 'UpsertHttpBasic', 'MarkStatus', 'Erase',
        'CredentialLookupStatusCode', 'credential_ready', 'credential_missing', 'credential_provider_unavailable',
        'credential_denied', 'credential_expired', 'credential_material_rejected', 'CredentialBindingStore',
        'defer-product-persistent-store', 'onvif_credential_store_policy_decision.json', 'source:write',
        'local-encrypted', 'external-secret-manager', 'libsodium', 'rotation', 'expiry', 'audit',
        'verify-onvif-credential-reference-policy'],
      links: ['onvif-credential-reference-policy.md', 'onvif-auth-injection-design.md'],
      fields: [],
    },
  };
  const contract = contracts[kind];
  if (!contract) return ['unknown credential document kind: ' + kind];
  for (const id of contract.ids) if (!doc.includes(id)) errors.push('credential ' + kind + ' definition missing: ' + id);
  for (const link of contract.links) if (!hasDocumentLink(doc, link)) errors.push('credential ' + kind + ' contract link missing: ' + link);
  for (const [field, value] of contract.fields) if (!hasDocumentFieldValue(doc, field, value)) errors.push('credential ' + kind + ' field/value missing: ' + field);
  if (kind === 'auth') for (const [method, state] of [['http-basic-provider-material', 'implemented-provider-boundary'],
    ['http-digest-challenge-retry', 'design-only'], ['ws-security-username-token-text', 'design-only'], ['ws-security-password-digest', 'design-only']]) {
    const rows = doc.split('\n').map(line => line.split('|').slice(1, -1).map(cell => cell.replace(/`/g, '').trim())).filter(cells => cells[0] === method);
    if (rows.length !== 1 || !rows[0][1]?.includes(state)) errors.push('credential method state missing/duplicate: ' + method);
  }
  return errors;
}

export function validateOnvifRtspsDocumentation(text) {
  const errors = [], doc = String(text || '');
  for (const id of ['GetStreamUri', 'Media2', 'Media', 'rtsp://', 'rtsps://',
    'sourceDraft', 'kind=rtsp', 'rtspUrl', '/ops/sources', 'POST /ops/api/onvif/import-draft',
    'https://', 'OpenSSL', 'SendOnvifSoapHttp', '미확인',
    'test/fixtures/onvif_probe_result_rtsps_stub.json', 'verify-onvif-rtsps-draft-policy',
    'verify-onvif-probe-draft-api --fixture test/fixtures/onvif_probe_result_rtsps_stub.json',
    'verify-onvif-probe-draft-api --profile-variant media-rtsps-fallback-when-media2-non-rtsp']) {
    if (!doc.includes(id)) errors.push('RTSPS definition missing: ' + id);
  }
  for (const link of ['onvif-protocol-support-matrix.md', 'onvif-live-source-support.md', 'onvif-tls-transport-policy.md']) {
    if (!hasDocumentLink(doc, link)) errors.push('RTSPS contract link missing: ' + link);
  }
  return errors;
}

// 사용자 안내는 출력 계약과 승인 기준으로 연결한다. 옛 영문 제목/설명 문장을 요구하지 않는다.
// 승인 양식의 필수 항목·실제 승인·시각 품질 판정은 각각의 독립 검사/검토 범위다.
export function validateVisualArtifactGuideDocumentation(guide) {
  const errors = [];
  const text = typeof guide === 'string' ? guide : '';
  for (const identifier of ['visual-regression-manifest.json', 'media-server.ui-visual-artifact-index.v1',
    'media-server.ui-visual-artifact-retention.v1', 'compare-ui-visual-baseline', 'reviewRequired']) {
    if (!text.includes(identifier)) errors.push('UI 안내의 시각 자료 계약 식별자 누락: ' + identifier);
  }
  if (!hasDocumentLink(text, 'ui-visual-release-baseline-approval-template.md')) {
    errors.push('UI 안내의 baseline 승인 기준 링크 누락');
  }
  return errors;
}

// 구조 문서 전체의 옛 SHA는 녹화 등 별개 기능 설명까지 동결한다. 현행 문서에서는
// 권한·공개 소비 경로의 식별자 연결을 확인하고, 의미는 코드 리뷰/인증 회귀로 판정한다.
// 이것은 Auth 동작이나 과거 freeze 시점의 파일 바이트를 검증하는 함수가 아니다.
export function validateArchitectureContractDocumentation(text) {
  const errors = [];
  for (const identifier of [
    'Principal', 'UserRegistry', 'SessionStore', 'RequireRole', 'RequireScope',
    'MEDIA_SERVER_AUTH_MODE=auto', '/setup', '/auth/whoami',
    'admin', 'operator', 'viewer', 'integrator',
    'ops:read', 'lab:read', 'view:read:{viewId}',
    'dashboard:read:{viewId}', 'event:read:{viewId}', 'metadata:read:{viewId}',
    '/client/api/views/{viewId}/webrtc/session',
  ]) {
    if (typeof text !== 'string' || !text.includes(identifier)) {
      errors.push('서버 구조 문서의 권한/소비 경로 식별자 누락: ' + identifier);
    }
  }
  return errors;
}

// 전체 파일의 역사 SHA와 현행 metadata 소비 계약 연결을 구분한다. payload 동작 검사는 아니다.
export function validateWebRtcMetadataDocumentation(text) {
  const errors = [];
  for (const identifier of [
    'media-server.webrtc.va-metadata.v1', 'va-metadata', 'vaMetadata=1',
    '/webrtc/session', '/client/api/views/{viewId}/webrtc/session', 'lab:read',
    'coordinateSpace=normalized-frame', 'tracks', 'events',
    'videoFramePtsMs', 'analysisPtsMs', 'syncDeltaMs', 'syncStatus', 'syncToleranceMs',
    'scripts/examples/webrtc_va_metadata_client.html', 'verify-webrtc-va-metadata',
  ]) {
    if (typeof text !== 'string' || !text.includes(identifier)) {
      errors.push('WebRTC metadata 문서의 계약/소비 경로 식별자 누락: ' + identifier);
    }
  }
  return errors;
}

export function validateVerificationDocumentation({agents, verification}) {
  const errors = [];
  if (!hasDocumentLink(agents, 'docs/stream-verification.md')) errors.push('AGENTS: 검증 기준 문서 링크 없음');
  // 명령·환경변수·테스트 축은 계약이다. 절 번호·완성 문장·과거 단계명은 계약으로 고정하지 않는다.
  for (const identifier of [
    'MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD',
    'MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD', 'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE',
    'MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO',
    'event type', 'scenario type', 'line direction', 'tracker policy', 'Re-ID policy', 'EventRecord',
    'PASS', 'FAIL', 'verify-predev --soak-minutes 30',
  ]) {
    if (!verification.includes(identifier)) errors.push(`검증 기준 문서: 식별자 없음: ${identifier}`);
  }
  return errors;
}

export function validateUiPolicyDocumentation({agents, fulltest, policy}) {
  const errors = [];
  if (!hasDocumentLink(agents, 'docs/manual-ui-fulltest.md')) errors.push('AGENTS: UI 정책 문서 링크 없음');
  for (const identifier of [
    ...policy.uiEvidenceModes, ...policy.suiteClosure.allowedCaseStatuses,
    'test/fixtures/ui_fulltest_evidence_policy_v4.json', 'verify-ui-fulltest-evidence-policy-v4',
    'policyValidationResult', 'uiFulltestPass', 'completion oracle', 'manualIntervention',
    'hash/type/path containment', 'redaction', 'reviewRequired',
  ]) {
    if (!fulltest.includes(identifier)) errors.push(`UI 정책 문서: 식별자 없음: ${identifier}`);
  }
  return errors;
}
