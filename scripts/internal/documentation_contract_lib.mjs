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
