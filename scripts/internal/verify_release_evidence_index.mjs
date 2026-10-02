#!/usr/bin/env node
// 파일 용도: 현행 기록 기준 연결과 OPS-039 버전 경계 회귀 입력을 확인한다. 실행 원장이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from './script_arg_utils.mjs';
import {validateReleaseRecordDocumentation} from './documentation_contract_lib.mjs';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const readText = p => fs.readFileSync(path.resolve(rootDir, p), 'utf8');

export function verifyReleaseEvidenceIndex({read = readText} = {}) {
  const checks = [];
  const check = (name, fn) => {
    try {fn(); checks.push({name, status: 'pass'});}
    catch (error) {checks.push({name, status: 'fail', message: error.message});}
  };
  check('현행 기록 정책·기능·명령 연결', () => {
    const errors = validateReleaseRecordDocumentation({read, kind: 'index'});
    assert(errors.length === 0, errors.join('; '));
  });
  check('OPS-039 source/published/next/runway 경계 회귀 정의', () => {
    const fixture = JSON.parse(read('test/fixtures/release_metadata_boundary.json'));
    const boundary = fixture.v280Boundary;
    const v280BoundaryObserved = fixture.schema === 'media-server.release-boundary-fixture.v1' &&
      fixture.executionEvidence === false && boundary &&
      boundary.sourceVersion === '2.8.0' && boundary.publishedTag === 'v2.7.0' &&
      boundary.nextSourceTag === 'v2.8.0' &&
      JSON.stringify(boundary.runwayVersions) === JSON.stringify(['2.8.0', '2.9.0']) &&
      boundary.majorBoundary === '3.0.0' &&
      /^[0-9a-f]{40}$/.test(boundary.provenance?.commit || '') &&
      boundary.provenance?.path === 'docs/project-feature-test-inventory.md' &&
      boundary.provenance?.featureId === 'OPS-039' &&
      Object.keys(boundary).every(key => ['provenance', 'sourceVersion', 'publishedTag', 'nextSourceTag', 'runwayVersions', 'majorBoundary'].includes(key));
    assert(v280BoundaryObserved, 'OPS-039 회귀 정의 누락/값/출처/실행 증거 경계 불일치');
  });
  const fail = checks.filter(row => row.status === 'fail').length;
  return {status: fail ? 'fail' : 'pass', checks, pass: checks.length - fail, fail,
    exitCode: fail ? 1 : 0, executionEvidenceVerified: false};
}
function assert(condition, message) {if (!condition) throw new Error(message);}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (hasHelpFlag(args)) printUsageAndExit('현행 기록 기준 검사\n\nUsage:\n  ./server.sh verify-release-evidence-index\n\n종료 원장 없이 정책·정의·명령과 OPS-039 회귀 입력을 확인합니다.\n실제 실행 기록/UI/장시간/공개 상태 PASS 검사가 아닙니다.');
  assertKnownOptions(args, ['h', 'help']);
  const report = verifyReleaseEvidenceIndex();
  for (const row of report.checks) console.log('[' + row.status + '] ' + row.name + (row.message ? ': ' + row.message : ''));
  console.log('\n== Release evidence index verification summary ==');
  console.log('- scope: current-definitions-only; execution-evidence-not-verified');
  console.log('- pass: ' + report.pass + '\n- fail: ' + report.fail);
  process.exitCode = report.exitCode;
}
