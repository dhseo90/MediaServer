// 파일 용도: 현행 문서의 정책 진입점·공개 식별자 연결을 검사한다. 과거 실행 결과는 읽지 않는다.

export function hasDocumentLink(text, target) {
  return [...text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .some((match) => match[1].split('#')[0].replace(/^\.\//, '') === target);
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
