// 파일 용도: 기록 정책/결과 파서의 합성 자체검사. 제품·실제 실행 기록 PASS가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyReleaseEvidenceIndex} from './verify_release_evidence_index.mjs';
import {verifyTestEvidenceConsistency, renderMarkdown} from './verify_v230_test_evidence_consistency.mjs';
import {verifyReleaseTestRecords, validateReleaseRecordResult} from './verify_v290_release_test_records_enforcement.mjs';
import {verifyReleaseEvidenceHygiene} from './verify_v290_release_evidence_hygiene.mjs';
import {validateV390ReviewHistory, validateCurrentGateDocumentation} from './documentation_contract_lib.mjs';
import {parseServerDispatches} from './script_dispatch_parser.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['AGENTS.md', 'docs/stream-verification.md', 'docs/release-policy.md',
  'docs/manual-ui-fulltest.md', 'docs/project-feature-test-inventory.md', 'server.sh',
  'test/fixtures/project_feature_implementation_evidence.json', 'test/fixtures/release_metadata_boundary.json'];
const originals = new Map(files.map(p => [p, fs.readFileSync(root + p, 'utf8')]));
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const reviewHistoryPath = 'test/fixtures/v390_user_review_history.json';
const reviewHistory = JSON.parse(fs.readFileSync(root + reviewHistoryPath, 'utf8'));
test('REVIEW-HISTORY 승인 전·기록된 종료는 현재 승인/실행 PASS가 아니다', () => {
  const report = validateV390ReviewHistory(reviewHistory);
  assert.deepEqual(report.errors, []);
  assert.equal(report.currentApprovalStatus, 'not-assessed');
  assert.equal(report.currentFeatureDevelopmentStatus, 'not-assessed');
  assert.equal(report.executionPassClaimed, false);
});
for (const [name, mutate] of [
  ['schema', v => {v.schema = 'PASS';}],
  ['version', v => {v.sourceVersion = '4.1.1';}],
  ['출처 누락', v => {delete v.provenance;}],
  ['commit', v => {v.provenance.commit = '0'.repeat(40);}],
  ['path', v => {v.provenance.path = 'other.md';}],
  ['blob', v => {v.provenance.blob = '0'.repeat(40);}],
  ['section', v => {v.provenance.section = 'approved';}],
  ['pending를 승인 처리', v => {v.initial.approval = 'approved-through-recorded-user-goals';}],
  ['blocked를 완료 처리', v => {v.initial.development = 'closed-with-evidence';}],
  ['closure 누락', v => {delete v.laterRecordedClosure;}],
  ['후속 미승인을 완료 처리', v => {v.laterRecordedClosure.approval = 'pending-user-approval';}],
  ['개발 순서', v => {v.requiredOrder.reverse();}],
  ['과거 결과로 실행 PASS 승격', v => {v.closureIsExecutionEvidence = true;}],
]) test('REVIEW-HISTORY 반례 ' + name, () => {
  const value = structuredClone(reviewHistory); mutate(value);
  const report = validateV390ReviewHistory(value);
  assert(report.errors.length > 0);
  assert.equal(report.currentApprovalStatus, 'not-assessed');
  assert.equal(report.executionPassClaimed, false);
});
function currentReviewGate(mutate = () => {}, target = {
  command: 'verify-v390-user-review-gate', script: 'verify_v390_user_review_gate.mjs', featureIds: ['SAFE-198','OPS-165'],
}) {
  const memory = new Map(originals); mutate(memory);
  return validateCurrentGateDocumentation({read: p => {
    assert(memory.has(p), '중앙 기록/Git 읽기 금지: ' + p); return memory.get(p);
  }, ...target});
}
test('REVIEW-CURRENT 중앙 기록/Git 없는 현행 정의 연결', () => assert.deepEqual(currentReviewGate(), []));
function changeReviewRow(memory, transform) {
  const file = 'docs/project-feature-test-inventory.md';
  memory.set(file, memory.get(file).replace(/^\| SAFE-198 \|.*$/m, transform));
}
function changeReviewManifest(memory, command) {
  const file = 'test/fixtures/project_feature_implementation_evidence.json';
  const value = JSON.parse(memory.get(file));
  value.items.find(item => item.id === 'SAFE-198').verifierEvidence.command = command;
  memory.set(file, JSON.stringify(value));
}
const unrelatedCommand = 'verify-v390-onvif-credential-provider-status';
const unrelatedScript = 'verify_v390_onvif_credential_provider_status.mjs';
function changeToExistingUnrelatedManifest(memory) {
  // dispatch와 파일이 모두 정상인 다른 기능의 쌍이다. 입력 누락/구문 오류 반례가 아니다.
  const dispatches = parseServerDispatches(memory.get('server.sh')).filter(x => x.command === unrelatedCommand);
  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].script, unrelatedScript);
  assert(fs.statSync(root + 'scripts/internal/' + unrelatedScript).isFile());
  const file = 'test/fixtures/project_feature_implementation_evidence.json';
  const value = JSON.parse(memory.get(file));
  const evidence = value.items.find(x => x.id === 'SAFE-198').verifierEvidence;
  evidence.command = unrelatedCommand;
  evidence.file = 'scripts/internal/' + unrelatedScript;
  memory.set(file, JSON.stringify(value));
}
for (const forgedSummary of [false, true]) {
  test('REVIEW-CURRENT-A-REAL-PAIR 무관한 실제 manifest 쌍 거부, 요약 위조=' + forgedSummary, () => {
    const errors = currentReviewGate(m => {
      changeToExistingUnrelatedManifest(m);
      if (forgedSummary) {
        const file = 'docs/project-feature-test-inventory.md';
        m.set(file, m.get(file) + '\n| 합성 companion 주장 | `SAFE-198` | `verify-v390-user-review-gate`, `' + unrelatedCommand + '` | 선언만으로 허용 금지 |\n');
      }
    });
    assert.deepEqual(errors, ['현행 기능 정의/명령 연결 불일치: SAFE-198']);
  });
}
test('REVIEW-CURRENT-A 실제 무관한 명령으로 기능 행만 변경하면 거부', () => {
  assert.deepEqual(currentReviewGate(m => changeReviewRow(m, row => row.replaceAll('verify-v390-user-review-gate', unrelatedCommand))),
    ['현행 기능 정의/명령 연결 불일치: SAFE-198']);
});
test('REVIEW-CURRENT-A 명령 생략도 무관한 실제 manifest 쌍은 거부', () => {
  assert.deepEqual(currentReviewGate(m => {
    changeReviewRow(m, row => row.replaceAll('`verify-v390-user-review-gate`', '해당 회귀 검사'));
    changeToExistingUnrelatedManifest(m);
  }), ['현행 기능 정의/명령 연결 불일치: SAFE-198']);
});
test('REVIEW-CURRENT-A canonical 명령의 다른 스크립트 연결 거부', () => {
  assert.deepEqual(currentReviewGate(m => {
    const p = 'test/fixtures/project_feature_implementation_evidence.json', value = JSON.parse(m.get(p));
    value.items.find(x => x.id === 'SAFE-198').verifierEvidence.file = 'scripts/internal/' + unrelatedScript;
    m.set(p, JSON.stringify(value));
  }), ['현행 기능 정의/명령 연결 불일치: SAFE-198']);
});
// 기존 정적 gate와 canonical의 실제 계약: API readback 두 관계, coverage 비승격,
// ONVIF paired-save, VLM server-owned promotion. 합성 이름 유사성으로 만든 관계가 아니다.
for (const [command, canonical, featureIds] of [
  ['verify-v390-backup-recovery-handoff-validation', 'verify-ops-source-registry-api', ['SRC-067','OPS-174']],
  ['verify-v390-onvif-credential-provider-status', 'verify-ops-source-registry-api', ['SRC-065']],
  ['verify-v390-evidence-test-gate-prep', 'verify-feature-inventory-coverage', ['SAFE-200']],
  ['verify-v390-onvif-live-import-persist-decision', 'verify-v390-onvif-source-view-atomicity', ['UI-109','SRC-066','SAFE-204','OPS-171']],
  ['verify-v390-vlm-evaluation-promotion-guard', 'verify-v390-vlm-promotion-trust-boundary', ['UI-111','LAB-123','SAFE-206','OPS-173']],
]) test('REVIEW-CURRENT-A 실제 companion 계약 유지 ' + command, () => {
  const implementation = JSON.parse(originals.get('test/fixtures/project_feature_implementation_evidence.json'));
  for (const id of featureIds) assert.equal(implementation.items.find(x => x.id === id).verifierEvidence.command, canonical);
  assert.deepEqual(currentReviewGate(undefined, {command, script: command.replaceAll('-', '_') + '.mjs', featureIds}), []);
});
test('REVIEW-CURRENT-A 기능 행의 다른 명령을 manifest로 덮지 않음', () => {
  assert(currentReviewGate(m => changeReviewRow(m, row => row.replaceAll('verify-v390-user-review-gate', 'verify-other-gate'))).length > 0);
});
test('REVIEW-CURRENT-A manifest와 명시 기능 행 불일치 거부', () => {
  assert(currentReviewGate(m => changeReviewManifest(m, 'verify-other-gate')).length > 0);
});
test('REVIEW-CURRENT-A 복수 명령은 허용', () => {
  assert.deepEqual(currentReviewGate(m => changeReviewRow(m, row => row.replace('`verify-v390-user-review-gate`', '`verify-v390-user-review-gate`, `verify-feature-inventory-coverage`'))), []);
});
test('REVIEW-CURRENT-A 명령 생략은 정확한 canonical manifest로 연결', () => {
  assert.deepEqual(currentReviewGate(m => changeReviewRow(m, row => row.replaceAll('`verify-v390-user-review-gate`', '해당 회귀 검사'))), []);
});
test('REVIEW-CURRENT-A 생략과 다른 manifest 조합 거부', () => {
  assert(currentReviewGate(m => {
    changeReviewRow(m, row => row.replaceAll('`verify-v390-user-review-gate`', '해당 회귀 검사'));
    changeReviewManifest(m, 'verify-other-gate');
  }).length > 0);
});
test('REVIEW-CURRENT-A 기존 직접 호출자의 canonical·companion·생략 형식', () => {
  // 제품/구조 검증기 자체를 import하지 않고 해당 문서 연결 호출의 입력만 재사용한다.
  const directory = new URL('./', import.meta.url);
  let checked = 0;
  for (const name of fs.readdirSync(directory).filter(name => /^verify_v390_.*\.mjs$/.test(name))) {
    const source = fs.readFileSync(new URL(name, directory), 'utf8');
    const call = source.match(/validateCurrentGateDocumentation\(\{([\s\S]*?)\}\)/);
    const list = call?.[1].match(/featureIds:\s*\[([^\]]+)\]/)?.[1];
    if (!list) continue; // truthfulness의 세 연결은 각 직접 호출자에서 함께 확인한다.
    const featureIds = [...list.matchAll(/['"]([A-Z]+-\d+)['"]/g)].map(match => match[1]);
    const command = source.match(/const command = "([^"]+)"/)?.[1] || call[1].match(/command:\s*'([^']+)'/)?.[1];
    const errors = validateCurrentGateDocumentation({read: p => {
      assert(originals.has(p), '종료 기록 또는 미등록 읽기: ' + p); return originals.get(p);
    }, command, script: name, featureIds});
    assert.deepEqual(errors, [], name);
    checked++;
  }
  assert.equal(checked, 15, '검토한 직접 호출자 집합 변경');
});
for (const mode of ['normal', 'missing-fixture', 'wrong-provenance', 'pending-as-approved']) {
  test('REVIEW-CLI 중앙 기록 없는 실제 자식 ' + mode, () => {
    const source = `
      import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
      const original=fs.readFileSync, root=${JSON.stringify(root)}, mode=${JSON.stringify(mode)};
      fs.readFileSync=function(p,...args) {
        const name=String(p);
        if (['development-backlog.md','release-test-records.md','release-evidence-index.md'].some(x=>name.endsWith('/docs/'+x))) throw Error('central-record-read-forbidden');
        if (name === root + ${JSON.stringify(reviewHistoryPath)}) {
          if(mode==='missing-fixture') throw Error('fixture-missing');
          const value=JSON.parse(original.call(this,p,...args));
          if(mode==='wrong-provenance') value.provenance.blob='wrong';
          if(mode==='pending-as-approved') value.initial.approval='approved-through-recorded-user-goals';
          return JSON.stringify(value);
        }
        return original.call(this,p,...args);
      };
      syncBuiltinESMExports();
      await import(${JSON.stringify(new URL('./verify_v390_user_review_gate.mjs', import.meta.url).href)});
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', source], {encoding:'utf8', timeout:15000});
    assert.equal(r.signal, null, r.stderr);
    assert.equal(r.status, mode === 'normal' ? 0 : 1, r.stdout + r.stderr);
    assert(!r.stderr.includes('central-record-read-forbidden'), r.stderr);
    if (mode === 'normal') {
      assert.match(r.stdout, /currentApprovalStatus: not-assessed/);
      assert.match(r.stdout, /currentFeatureDevelopmentStatus: not-assessed/);
      assert.match(r.stdout, /historical-regression-only/);
      assert(!r.stdout.includes('currentApprovalStatus: approved'));
    }
  });
}
for (const [name, mutate] of [
  ['기능 ID', m => m.set('docs/project-feature-test-inventory.md', m.get('docs/project-feature-test-inventory.md').replace(/^\| SAFE-198 \|.*$/m, ''))],
  ['명령 안내', m => m.set('docs/stream-verification.md', m.get('docs/stream-verification.md').replaceAll('verify-v390-user-review-gate', 'removed-command'))],
  ['dispatch', m => m.set('server.sh', m.get('server.sh').replaceAll('verify_v390_user_review_gate.mjs', 'wrong.mjs'))],
  ['정책 링크', m => m.set('docs/stream-verification.md', m.get('docs/stream-verification.md').replaceAll('../AGENTS.md', '../missing.md'))],
  ['정의 중복', m => {const p='docs/project-feature-test-inventory.md';m.set(p,m.get(p)+'\n'+m.get(p).match(/^\| SAFE-198 \|.*$/m)[0]);}],
]) test('REVIEW-CURRENT 반례 ' + name, () => assert(currentReviewGate(mutate).length > 0));
const cases = [
  ['index', verifyReleaseEvidenceIndex, 'verify-release-evidence-index', 'verify_release_evidence_index.mjs'],
  ['consistency', verifyTestEvidenceConsistency, 'verify-v230-test-evidence-consistency', 'verify_v230_test_evidence_consistency.mjs'],
  ['records', verifyReleaseTestRecords, 'verify-v290-release-test-records-enforcement', 'verify_v290_release_test_records_enforcement.mjs'],
  ['hygiene', verifyReleaseEvidenceHygiene, 'verify-v290-release-evidence-hygiene', 'verify_v290_release_evidence_hygiene.mjs'],
];
const good = '| 항목 | 결과(pass/fail) | 최종 evidence |\n| --- | --- | --- |\n| 합성 검사 | PASS | [원출력](artifacts/run.json) |\n';
function run(fn, mutate = () => {}, result, changeOnRead = false) {
  const memory = new Map(originals); mutate(memory);
  if (result !== undefined) memory.set('/memory/result.md', result);
  let resultReads = 0;
  const read = p => {
    assert(memory.has(p), '허용 입력 밖/종료 원장 읽기: ' + p);
    if (p === '/memory/result.md' && ++resultReads > 1 && changeOnRead) return memory.get(p) + '\nchanged';
    return memory.get(p);
  };
  const report = fn({read, resultPath: result === undefined ? '' : '/memory/result.md', provenance: {branch: 'unknown', head: 'unknown'}});
  for (const [p, s] of originals) assert.equal(hash(fs.readFileSync(root + p)), hash(s), p + ' 원본 불변');
  if (result !== undefined) assert.equal(memory.get('/memory/result.md'), result, '사용자 입력 불변');
  return report;
}
const edit = (p, from, to = '') => m => {assert(m.get(p).includes(from), '반례 대상 없음');m.set(p, m.get(p).replaceAll(from, to));};
for (const [name, mutate] of [
  ['누락', x => {delete x.v280Boundary;}],
  ['source 오류', x => {x.v280Boundary.sourceVersion = '2.9.0';}],
  ['published 오류', x => {x.v280Boundary.publishedTag = 'v2.8.0';}],
  ['next 오류', x => {x.v280Boundary.nextSourceTag = 'v2.9.0';}],
  ['runway 오류', x => {x.v280Boundary.runwayVersions.pop();}],
  ['major 오류', x => {x.v280Boundary.majorBoundary = '2.9.0';}],
  ['출처 오류', x => {x.v280Boundary.provenance.featureId = 'OPS-041';}],
  ['실행 증거 위장', x => {x.executionEvidence = true;}],
  ['boundary 실행 증거 위장', x => {x.v280Boundary.status = 'PASS';}],
]) test('RECORD-DOC OPS-039 ' + name, () => {
  const r = run(verifyReleaseEvidenceIndex, m => {const p = 'test/fixtures/release_metadata_boundary.json', x = JSON.parse(m.get(p));mutate(x);m.set(p, JSON.stringify(x));});
  assert.equal(r.exitCode, 1); assert.match(JSON.stringify(r.checks), /OPS-039/);
});
for (const [name, fn, command, script] of cases) {
  test('RECORD-DOC 종료 기록/Git 없는 읽기 입력 ' + name, () => {
    const r = run(fn); assert.equal(r.exitCode, 0, JSON.stringify(r.checks));
  });
  test('RECORD-DOC 정책 링크 누락 ' + name, () => {
    const r = run(fn, edit('AGENTS.md', 'docs/stream-verification.md', 'missing.md'));
    assert.equal(r.exitCode, 1); assert.match(JSON.stringify(r.checks), /링크/);
  });
  test('RECORD-DOC 현행 명령 안내 누락 ' + name, () => {
    assert.equal(run(fn, edit('docs/stream-verification.md', command, 'removed-command')).exitCode, 1);
  });
  test('RECORD-DOC require/exec 동시 오연결 ' + name, () => {
    assert.equal(run(fn, edit('server.sh', script, 'wrong.mjs')).exitCode, 1);
  });
}
for (const [fn, id] of [[verifyReleaseTestRecords, 'SAFE-075'], [verifyReleaseTestRecords, 'OPS-045'],
  [verifyReleaseEvidenceHygiene, 'SAFE-077'], [verifyReleaseEvidenceHygiene, 'OPS-047']]) {
  test('RECORD-DOC exact 기능 ID 누락 ' + id, () => {
    assert.equal(run(fn, m => m.set('docs/project-feature-test-inventory.md', m.get('docs/project-feature-test-inventory.md').replace(new RegExp('^\\| ' + id + ' \\|.*$', 'm'), ''))).exitCode, 1);
  });
}
test('RECORD-RESULT 입력 없는 검사는 실제 결과 미실행', () => {
  const r = run(verifyReleaseTestRecords); assert.equal(r.resultInspection.status, 'not-run');
  assert.equal(r.executionEvidenceVerified, false);
});
test('RECORD-RESULT 합성 PASS 구조와 본문 임시 정리 언급', () => {
  const r = run(verifyReleaseTestRecords, undefined, good + '\n임시자료 정리: /tmp/run, /private/tmp/run, $TMPDIR\n');
  assert.equal(r.exitCode, 0, JSON.stringify(r)); assert.equal(r.resultInspection.resultRows[0].value, 'PASS');
  assert.equal(r.executionEvidenceVerified, false);
});
test('RECORD-RESULT 실제 FAIL 보존/exit1', () => {
  const r = run(verifyReleaseTestRecords, undefined, good.replace('| PASS |', '| FAIL |'));
  assert.equal(r.exitCode, 1); assert.equal(r.resultInspection.resultRows[0].value, 'FAIL');
});
for (const status of ['미실행', '제외', '미확인', 'manual-not-run', '부분']) {
  test('RECORD-RESULT 별도 상태표 미완료 ' + status, () => {
    const r = run(verifyReleaseTestRecords, undefined, good + '\n| 항목 | 상태 |\n| --- | --- |\n| UI | ' + status + ' |\n');
    assert.equal(r.exitCode, 1); assert.equal(r.resultInspection.statusRows[0].value, status);
  });
}
for (const [name, result] of [['빈 문서', ''], ['빈 표', good.split('| 합성')[0]],
  ['미인식 결과', good.replace('PASS', 'okay')], ['미실행 결과 칸', good.replace('PASS', '미실행')],
  ['깨진 행', good.replace('| PASS |', '| PASS | extra |')], ['code fence뿐', '```md\n' + good + '```']]) {
  test('RECORD-RESULT 거부 ' + name, () => assert.equal(run(verifyReleaseTestRecords, undefined, result).exitCode, 1));
}
for (const target of ['/tmp/run.json', '/private/tmp/run.json', '$TMPDIR/run.json', 'file:///tmp/run.json']) {
  test('RECORD-RESULT 최종 임시 링크 거부 ' + target, () => {
    assert.equal(run(verifyReleaseTestRecords, undefined, good.replace('artifacts/run.json', target)).exitCode, 1);
  });
}
test('RECORD-RESULT 입력 전후 hash 변화 거부', () => {
  const r = run(verifyReleaseTestRecords, undefined, good, true);
  assert.equal(r.exitCode, 1); assert.equal(r.resultInspection.inputUnchanged, false);
});
for (const [name, input, valid] of [
  ['shortcut 임시', good.replace('[원출력](artifacts/run.json)', '[출력]') + '\n[출력]: /tmp/run.json', false],
  ['autolink 임시', good.replace('[원출력](artifacts/run.json)', '<file:///tmp/run.json>'), false],
  ['reference 미해결', good.replace('[원출력](artifacts/run.json)', '[없는 출력]'), false],
  ['reference 중복 정의', good.replace('[원출력](artifacts/run.json)', '[출력]') + '\n[출력]: /tmp/run.json\n[출력]: artifacts/run.json', false],
  ['shortcut 정상', good.replace('[원출력](artifacts/run.json)', '[출력]') + '\n[출력]: artifacts/run.json', true],
  ['autolink 정상', good.replace('[원출력](artifacts/run.json)', '<https://example.invalid/run.json>'), true],
]) test('RECORD-RESULT ' + name, () => assert.equal(run(verifyReleaseTestRecords, undefined, input).exitCode, valid ? 0 : 1));
test('RECORD-RESULT status 표는 result 행으로 세지 않음', () => {
  const r = validateReleaseRecordResult('| 항목 | 상태 |\n| --- | --- |\n| UI | 미실행 |');
  assert.equal(r.resultRows.length, 0); assert.equal(r.statusRows.length, 1); assert(r.errors.length > 0);
});
test('RECORD-CONSISTENCY 기존 JSON 키/미실행/미집계 및 Markdown 경계', () => {
  const r = run(verifyTestEvidenceConsistency);
  for (const key of ['schema','generatedAt','status','targetStep','activeRoadmap','branch','head','checks','completionBoundary','evidence']) assert(Object.hasOwn(r, key), key);
  assert.equal(r.schema, 'media-server.v230-test-evidence-consistency.v1');
  assert.equal(new Set(r.evidence.map(x => x.area)).size, 4);
  assert(r.evidence.every(x => x.status !== 'pass' && x.tokenUsage.tokenConsumed === '미집계'));
  assert.match(renderMarkdown(r), /미실행/);
  const failed = run(verifyTestEvidenceConsistency, edit('AGENTS.md', 'docs/stream-verification.md', 'missing.md'));
  assert.equal(failed.status, 'fail'); assert.equal(failed.exitCode, 1); assert.match(renderMarkdown(failed), /fail/);
});

// 실제 CLI의 exit/output 분기를 자식 메모리에서 검사한다. 원장/Git/사용자 파일 쓰기는 차단한다.
function cli(script, {args = [], result, missingLink = false, writeError = false} = {}) {
  const source = `
    import fs from 'node:fs'; import cp from 'node:child_process';
    import {syncBuiltinESMExports} from 'node:module'; import {pathToFileURL} from 'node:url';
    const root=${JSON.stringify(root)}, script=${JSON.stringify(script)}, outputs={};
    const original=fs.readFileSync;
    fs.readFileSync=function(p,opts){
      const name=String(p), rel=name.startsWith(root)?name.slice(root.length):name;
      if(['docs/release-evidence-index.md','docs/release-test-records.md','docs/development-backlog.md'].includes(rel))throw new Error('종료 원장 읽기');
      if(name==='/memory/result.md')return opts==='utf8'?${JSON.stringify(result ?? '')}:Buffer.from(${JSON.stringify(result ?? '')});
      const raw=original.call(this,p,opts);
      if(${missingLink}&&rel==='AGENTS.md'){const text=String(raw).replaceAll('docs/stream-verification.md','missing.md');return Buffer.isBuffer(raw)?Buffer.from(text):text;}
      return raw;
    };
    fs.mkdirSync=function(p){if(!String(p).startsWith('/memory'))throw new Error('허용하지 않은 쓰기');};
    fs.writeFileSync=function(p,text){if(${writeError})throw new Error('synthetic output write failure');if(!String(p).startsWith('/memory'))throw new Error('허용하지 않은 쓰기');outputs[p]=String(text);};
    cp.spawnSync=function(command){if(command!=='git')throw new Error('외부/제품 명령 금지');return {status:128,stdout:'',stderr:'source archive'};};
    syncBuiltinESMExports(); process.argv=[process.execPath,root+'scripts/internal/'+script,...${JSON.stringify(args)}];
    process.on('exit',()=>process.stdout.write('\\n__reports__'+JSON.stringify(outputs)+'\\n'));
    await import(pathToFileURL(process.argv[1]).href);
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {cwd: root, encoding: 'utf8'});
}
for (const [name, , , script] of cases) test('RECORD-DOC CLI 실제 실패 exit ' + name, () => {
  const r = cli(script, {missingLink: true}); assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(r.stdout, /\[fail\]/); assert.match(r.stdout, /링크/);
});
test('RECORD-RESULT CLI FAIL 원문 보존/실제 exit', () => {
  const r = cli('verify_v290_release_test_records_enforcement.mjs', {args: ['--result', '/memory/result.md'], result: good.replace('| PASS |', '| FAIL |')});
  assert.equal(r.status, 1, r.stderr); assert.match(r.stdout, /"value":"FAIL"/); assert.match(r.stdout, /"inputUnchanged":true/);
});
test('RECORD-CONSISTENCY CLI JSON/Markdown 출력과 archive provenance', () => {
  const r = cli('verify_v230_test_evidence_consistency.mjs', {args: ['--report', '/memory/report.md', '--json-report', '/memory/report.json']});
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const outputs = JSON.parse(r.stdout.split('__reports__')[1]), report = JSON.parse(outputs['/memory/report.json']);
  assert.equal(report.branch, 'unknown'); assert.equal(report.head, 'unknown'); assert.equal(report.status, 'pass');
  assert.match(outputs['/memory/report.md'], /미실행/);
});
test('RECORD-CONSISTENCY CLI 실패도 report 보존/exit1', () => {
  const r = cli('verify_v230_test_evidence_consistency.mjs', {missingLink: true, args: ['--json-report', '/memory/report.json']});
  assert.equal(r.status, 1, r.stderr);
  const outputs = JSON.parse(r.stdout.split('__reports__')[1]); assert.equal(JSON.parse(outputs['/memory/report.json']).status, 'fail');
});
test('RECORD-CONSISTENCY CLI output 쓰기 실패 전파', () => {
  const r = cli('verify_v230_test_evidence_consistency.mjs', {writeError: true, args: ['--json-report', '/memory/report.json']});
  assert.equal(r.status, 1); assert.match(r.stderr, /synthetic output write failure/);
});

// 현행 후보 기준만으로 검사하고 종료 원장·옛 backlog 본문 접근은 금지한다.
function scopeGate(mutation) {
  const source = `
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    const root=${JSON.stringify(root)}, mutation=${JSON.stringify(mutation || null)};
    const original=fs.readFileSync;
    fs.readFileSync=function(file, options) {
      const p=path.relative(root,String(file));
      if(['docs/release-test-records.md','docs/release-evidence-index.md'].includes(p))throw Error('종료 원장 읽기 금지');
      const raw=original.call(this,file,options);
      let text=String(raw);
      if(p==='docs/development-backlog.md')text=text.split('## 축약 보류 중인 과거 본문')[0];
      if(mutation?.file===p) {
        if(mutation.headings)text=text.replace(/^#{1,6} .*$/gm,'# 바꾼 제목');
        if(mutation.remove)text=text.replaceAll(mutation.remove,mutation.replace||'');
        if(mutation.append)text+=mutation.append;
      }
      return Buffer.isBuffer(raw)?Buffer.from(text):text;
    };
    for(const method of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync'])
      fs[method]=()=>{throw Error('읽기 전용 검사');};
    await import(pathToFileURL(root+'scripts/internal/verify_feature_scope_decision_gate.mjs'));
  `;
  return spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:root,encoding:'utf8',timeout:15000});
}
for (const [name, mutation, exit] of [
  ['종료 원장 없이 현행 계약', null, 0],
  ['제목 변경 허용', {file:'docs/development-backlog.md',headings:true}, 0],
  ['범위 기준 링크 누락', {file:'docs/development-backlog.md',remove:'../AGENTS.md'}, 1],
  ['미승인 후보 실행 불가', {file:'docs/development-backlog.md',remove:'| candidate-only | 없음 |',replace:'| candidate-only | 허용 |'}, 1],
  ['보류 실행 불가', {file:'docs/development-backlog.md',remove:'| deferred-non-scope | 없음 |',replace:'| deferred-non-scope | 허용 |'}, 1],
  ['승인 범위 확대 거부', {file:'docs/development-backlog.md',remove:'승인된 범위만',replace:'전체 구현 허용'}, 1],
  ['중복 권한 거부', {file:'docs/development-backlog.md',append:'\n| candidate-only | 허용 |\n'}, 1],
  ['다른 위치의 정상 문자열로 잘못된 행을 덮지 않음', {file:'docs/development-backlog.md',remove:'| candidate-only | 없음 |',replace:'| candidate-only | 허용 |\ncandidate-only=없음'}, 1],
  ...['owner approval','target version','contract impact','non-scope','verification'].map(field =>
    ['검토 항목 누락 '+field,{file:'docs/development-backlog.md',remove:'| '+field+' |'},1]),
  ['승인 주체 변경 거부',{file:'docs/development-backlog.md',remove:'사용자 명시 승인',replace:'검사 성공'},1],
  ...['WebRTC DataChannel','Event POST','SSE/WS metadata','Auth/Role/Scope','인증·세션','RTSP/WebRTC media path'].map(field =>
    ['보호 계약 누락 '+field,{file:'docs/development-backlog.md',remove:field},1]),
  ['검증 안내 누락',{file:'docs/stream-verification.md',remove:'./server.sh verify-feature-scope-gate'},1],
  ['dispatch 오류',{file:'server.sh',remove:'verify_feature_scope_decision_gate.mjs',replace:'wrong.mjs'},1],
]) test('SCOPE-DOC '+name, () => {
  const result=scopeGate(mutation);
  assert.equal(result.error,undefined);assert.equal(result.signal,null);
  assert.equal(result.status,exit,result.stdout+result.stderr);
  assert.match(result.stdout,exit===0?/- pass: 5/:/\[fail\]/);
});
