// 파일 용도: 정책 문구 위치 변경과 실제 계약 누락을 구분하는 짧은 자체검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateVerificationDocumentation, validateUiPolicyDocumentation} from './documentation_contract_lib.mjs';
import {validatePolicy, evaluateEvidence} from './ui_fulltest_evidence_policy_v4_lib.mjs';

const read = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const agents = read('AGENTS.md');
const verification = read('docs/stream-verification.md');
const fulltest = read('docs/manual-ui-fulltest.md');
const policy = JSON.parse(read('test/fixtures/ui_fulltest_evidence_policy_v4.json'));

test('DOC-POL-01 현재 진입점과 상세 정책 연결', () => {
  assert.deepEqual(validateVerificationDocumentation({agents, verification}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents, fulltest, policy}), []);
});
test('DOC-POL-02 제목·절 번호·옛 완료 문구는 정책 계약이 아님', () => {
  const rewrite = (s) => s.replace(/^#{1,6}.*$/gm, '# 표현을 바꾼 제목').replace(/V390-ADD1-12|7\.6\.3|Current 실행은 pass 0\/not-run 424/g, '');
  assert.deepEqual(validateVerificationDocumentation({agents: rewrite(agents), verification: rewrite(verification)}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents: rewrite(agents), fulltest: rewrite(fulltest), policy}), []);
});
test('DOC-POL-03 정책 진입점 제거·환경변수 누락은 실패', () => {
  assert(validateVerificationDocumentation({agents: '', verification}).length > 0);
  assert(validateVerificationDocumentation({agents, verification: verification.replaceAll('MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD', '')}).length > 0);
});
test('DOC-POL-04 UI 적격 식별자·판정 분리 누락은 실패', () => {
  for (const identifier of [...policy.uiEvidenceModes, 'policyValidationResult', 'uiFulltestPass', 'completion oracle', 'redaction']) {
    assert(validateUiPolicyDocumentation({agents, fulltest: fulltest.replaceAll(identifier, ''), policy}).length > 0, identifier);
  }
  assert(validateUiPolicyDocumentation({agents: '', fulltest, policy}).length > 0);
});
test('DOC-POL-05 과거 원장·완료 문구 없이도 정의만으로 검사', () => {
  const a = '[기준](docs/stream-verification.md) [UI](docs/manual-ui-fulltest.md)';
  const v = verification.slice(verification.indexOf('## 검증 정책'), verification.indexOf('## 빠른 실행 경계'));
  const u = fulltest.slice(fulltest.indexOf('## Policy v4 증거 적격 기준'), fulltest.indexOf('## 1. 정의'));
  assert.deepEqual(validateVerificationDocumentation({agents: a, verification: v}), []);
  assert.deepEqual(validateUiPolicyDocumentation({agents: a, fulltest: u, policy}), []);
});
test('DOC-POL-06 실제 UI 없이 문서·정책만 통과해도 UI PASS 불가', () => {
  assert.deepEqual(validatePolicy(policy), []);
  const summary = JSON.parse(read('test/fixtures/v390_ui_current_evidence_state.json'));
  const result = evaluateEvidence(policy, summary);
  assert.equal(result.uiFulltestPass, false);
  assert.equal(result.evidenceEligibility, 'ineligible');
});
test('DOC-POL-07 UI 반례·완료 조건 완화는 기존 기계 정책이 거부', () => {
  for (const mutate of [
    p => { p.caseEquivalence.forbiddenEvidenceKinds = []; },
    p => { p.suiteClosure.requiredZeroCounts = []; },
    p => { p.sourceBinding.requireCurrentSourceVerification = false; },
  ]) {
    const copy = structuredClone(policy);
    mutate(copy);
    assert(validatePolicy(copy).length > 0);
  }
});
