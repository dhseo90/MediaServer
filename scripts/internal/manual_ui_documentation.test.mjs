// 파일 용도: 문서/결과 파서 자체검사. 메모리 합성 결과이며 실제 UI 실행 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyManualUiEvidence} from './verify_manual_ui_evidence.mjs';
import {verifyUiEvidenceCloseout} from './verify_v220_ui_evidence_closeout.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['docs/manual-ui-fulltest.md', 'docs/manual-ui-checklist.md', 'docs/manual-ui-result-template.md',
  'docs/project-feature-test-inventory.md', 'docs/stream-verification.md', 'AGENTS.md', 'VERSION', 'server.sh',
  'test/fixtures/project_feature_implementation_evidence.json', 'test/fixtures/manual_ui_fulltest_va_seed_matrix.json',
  'test/fixtures/ui_fulltest_evidence_policy_v4.json'];
const originals = new Map(files.map(file => [file, fs.readFileSync(root + file, 'utf8')]));
const hashes = new Map(files.map(file => [file, hash(originals.get(file))]));
const template = 'docs/manual-ui-result-template.md';
const fulltest = 'docs/manual-ui-fulltest.md';
function hash(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function run({mutate = () => {}, result, closeout = false, missingArtifact = false} = {}) {
  const memory = new Map(originals);
  mutate(memory);
  if (result !== undefined) memory.set('/memory/result.md', result);
  const read = file => {
    assert(memory.has(file), '입력 allowlist 밖/종료 기록 읽기 금지: ' + file);
    return memory.get(file);
  };
  const report = closeout ? verifyUiEvidenceCloseout({read}) : verifyManualUiEvidence({read,
    resultPath: result === undefined ? '' : '/memory/result.md',
    exists: file => !missingArtifact && /^\/memory\/artifact[0-5]$/.test(file)});
  for (const [file, digest] of hashes) assert.equal(hash(fs.readFileSync(root + file, 'utf8')), digest, file + ' 원본 불변');
  return report;
}
function expect(options, valid, reason = '') {
  const report = run(options), errors = report.checks.filter(row => !row.ok).map(row => row.error).join('\n');
  assert.equal(report.fail === 0, valid, errors);
  if (reason) assert(errors.includes(reason), errors);
}
function edit(file, from, to = '') { return memory => {
  assert(memory.get(file).includes(from), '반례 대상 없음: ' + from);
  memory.set(file, memory.get(file).replaceAll(from, to));
}; }

// 기존 결과 표 구조를 채우는 합성 입력. 디스크·브라우저·서버·외부 요청은 만들지 않는다.
function resultFixture() {
  let text = originals.get(template).replaceAll('PASS/FAIL', 'PASS');
  text = text.replace('432개 UI 대상 기능 ID 중 N PASS, M FAIL, K 미실행', '432개 UI 대상 기능 ID 중 432 PASS, 0 FAIL, 0 미실행')
    .replace('- 최종 결론: PASS 또는 FAIL', '- 최종 결론: PASS');
  let artifact = 0;
  text = text.split('\n').map(line => {
    if (!line.startsWith('|')) return line;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (/^V410-S06-I/.test(cells[0])) cells[2] = 'PASS';
    if (/^(account:|profile:|invalid policy:|event template:|scenario preset:|vaRule:)/.test(cells[0])) {
      cells[2] = 'synthetic observed'; cells[3] = 'PASS';
    }
    if (cells.length === 7 && /^`(?:presence|enter|exit|line-crossing:|intrusion|re-entry|wrong-direction|loitering|zone-occupancy)/.test(cells[0])) {
      cells[1] = 'synthetic-rule'; cells[2] = 'synthetic-va-rule'; cells[3] = '1'; cells[4] = '1'; cells[6] = 'PASS';
    }
    if (cells.length === 3 && cells[2] === 'exists/FAIL') {
      cells[1] = '`/memory/artifact' + artifact++ + '`'; cells[2] = 'exists';
    }
    return '| ' + cells.join(' | ') + ' |';
  }).join('\n');
  const ids = originals.get('docs/project-feature-test-inventory.md').split('\n')
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells[0].startsWith('RULE-') || cells[4].split(',').map(x => x.trim()).includes('UI'))
    .map(cells => cells[0]);
  text = text.replace(/^(\| (?:UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE)-\d+ \|).*\n/gm, '');
  return text + '\n' + ids.map(id => '| ' + id + ' | synthetic action | scope | expected | observed | PASS | memory-only |').join('\n');
}

for (const closeout of [false, true]) {
  test('MANUAL-UI-DOC 정상·종료 기록 비의존 ' + closeout, () => expect({closeout}, true));
  test('MANUAL-UI-DOC 역사 제목 비의존 ' + closeout, () => expect({closeout, mutate: memory => {
    for (const file of [fulltest, 'docs/manual-ui-checklist.md', template]) memory.set(file, memory.get(file).replace(/^#{1,6} .*$/gm, '# 다른 제목'));
  }}, true));
  test('MANUAL-UI-DOC 필수 문서 누락 실패 전파 ' + closeout, () => expect({closeout, mutate: edit(fulltest, originals.get(fulltest))}, false));
}
test('MANUAL-UI-DOC 432 매핑/녹화 action 누락', () => expect({mutate: edit(template, '| V410-S06-I30 | 정지:', '| 누락 | 정지:')}, false, 'recording action mapping'));
test('MANUAL-UI-DOC baseline UI ID 누락', () => expect({mutate: memory => {
  const file = 'test/fixtures/project_feature_implementation_evidence.json', value = JSON.parse(memory.get(file));
  value.items = value.items.filter(item => item.id !== 'UI-094'); memory.set(file, JSON.stringify(value));
}}, false, '424'));
test('MANUAL-UI-DOC 사용자 관리 권한 정의 훼손', () => expect({mutate: edit(template, '| `/ops/users` | admin |', '| `/ops/users` | viewer |')}, false, 'UI route role'));
test('MANUAL-UI-DOC Policy 비승격 경계 훼손', () => expect({mutate: memory => {
  const file = 'test/fixtures/ui_fulltest_evidence_policy_v4.json', value = JSON.parse(memory.get(file));
  value.boundaries.policyVerifierPassIsUiFulltestPass = true; memory.set(file, JSON.stringify(value));
}}, false, 'Policy non-promotion'));
test('MANUAL-UI-DOC 실제 dispatch 동시 오연결', () => expect({mutate: edit('server.sh', 'verify_manual_ui_evidence.mjs', 'wrong.mjs')}, false, 'dispatch'));
test('MANUAL-UI-RESULT 합성 정상 구조', () => expect({result: resultFixture()}, true));
test('MANUAL-UI-RESULT 실제 FAIL 기록은 유효하되 PASS로 승격하지 않음', () => {
  const failed = resultFixture().replace('| UI-001 | synthetic action | scope | expected | observed | PASS |', '| UI-001 | synthetic action | scope | expected | observed | FAIL |')
    .replace('432 PASS, 0 FAIL', '431 PASS, 1 FAIL');
  expect({result: failed}, false, 'PASS contradicts');
  expect({result: failed.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')}, true);
});
test('MANUAL-UI-RESULT 미실행을 실제 FAIL로 바꾸지 않음', () => {
  const notRun = resultFixture().replace('| UI-001 | synthetic action | scope | expected | observed | PASS |', '| UI-001 | synthetic action | scope | expected | observed | 미실행 |')
    .replace('432 PASS, 0 FAIL, 0 미실행', '431 PASS, 0 FAIL, 1 미실행');
  expect({result: notRun}, false, 'PASS contradicts');
  expect({result: notRun.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')}, true);
});
test('MANUAL-UI-RESULT 녹화 action 누락', () => expect({result: resultFixture().replace(/^\| V410-S06-I30 \| 정지:.*\n/m, '')}, false, 'recording action row count'));
test('MANUAL-UI-RESULT baseline 누락', () => expect({result: resultFixture().replace(/^\| UI-001 \|.*$/m, '')}, false, 'missing UI target'));
test('MANUAL-UI-RESULT cleanup FAIL은 전체 PASS 불가', () => {
  const failed = resultFixture().replace('- temp cleanup: PASS', '- temp cleanup: FAIL');
  expect({result: failed}, false, 'cleanup failure');
  expect({result: failed.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')}, true);
});
test('MANUAL-UI-RESULT 보존 경로 누락', () => expect({result: resultFixture(), missingArtifact: true}, false, 'evidence paths missing'));
test('MANUAL-UI-RESULT EventRecord 없는 PASS 거부', () => expect({result: resultFixture().replace('`presence` | synthetic-rule | synthetic-va-rule | 1 | 1 |', '`presence` | synthetic-rule | synthetic-va-rule | 0 | 0 |')}, false, 'PASS without UI row'));
test('MANUAL-UI-RESULT EventRecord 비수치 PASS 거부', () => expect({result: resultFixture().replace('`presence` | synthetic-rule | synthetic-va-rule | 1 | 1 |', '`presence` | synthetic-rule | synthetic-va-rule | 1 | unknown |')}, false, 'PASS without UI row'));
test('MANUAL-UI-RESULT VA 미실행 사유 보존/최종 PASS 거부', () => {
  const result = resultFixture().replace('| account: admin | admin 로그인/ops 접근 가능 | synthetic observed | PASS |',
    '| account: admin | admin 로그인/ops 접근 가능 | 준비 안 됨: 미실행 | 미실행 |')
    .replace(/^(\| `presence` \|.*)\| PASS \|$/m, '$1| 미실행 |')
    .replace('- VA 미실행 사유:', '- VA 미실행 사유: 격리 서버 실행 승인 없음');
  expect({result}, false, 'PASS contradicts');
  expect({result: result.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')}, true);
  expect({result: result.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')
    .replace('- VA 미실행 사유: 격리 서버 실행 승인 없음', '- VA 미실행 사유:')}, false, 'not-run reason');
});
test('MANUAL-UI-RESULT VA 실제 FAIL을 최종 PASS로 승격하지 않음', () => {
  const result = resultFixture().replace('| account: admin | admin 로그인/ops 접근 가능 | synthetic observed | PASS |',
    '| account: admin | admin 로그인/ops 접근 가능 | 로그인 거부 관측 | FAIL |');
  expect({result}, false, 'PASS contradicts');
  expect({result: result.replace('- 최종 결론: PASS', '- 최종 결론: FAIL')}, true);
});
