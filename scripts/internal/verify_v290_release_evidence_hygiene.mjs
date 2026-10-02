#!/usr/bin/env node
// 파일 용도: 현행 기록 정책/기능/명령 연결을 확인한다. 과거 원장이나 실행 PASS를 읽지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from './script_arg_utils.mjs';
import {validateReleaseRecordDocumentation} from './documentation_contract_lib.mjs';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const readText = p => fs.readFileSync(path.resolve(rootDir, p), 'utf8');
export function verifyReleaseEvidenceHygiene({read = readText} = {}) {
  const checks = [];
  try {
    const recordInputs = {read, kind: 'hygiene'};
    const errors = validateReleaseRecordDocumentation(recordInputs);
    const safe077BoundaryObserved = errors.length === 0;
    if (!safe077BoundaryObserved) throw new Error(errors.join('; '));
    checks.push({name: 'SAFE-077/OPS-047 현행 정책·정의·명령·UI 기준 연결', status: 'pass'});
  } catch (error) {checks.push({name: 'SAFE-077/OPS-047 현행 기록 기준 연결', status: 'fail', message: error.message});}
  const fail = checks.filter(row => row.status === 'fail').length;
  return {schema: 'media-server.v290-release-evidence-hygiene.v1', status: fail ? 'fail' : 'pass',
    checks, pass: checks.length - fail, fail, exitCode: fail ? 1 : 0, executionEvidenceVerified: false};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (hasHelpFlag(args)) printUsageAndExit('기록 기준 연결 검사\n\nUsage:\n  ./server.sh verify-v290-release-evidence-hygiene\n\n현행 정책·정의·명령·UI 기준 연결만 확인합니다. 실제 결과/제품/UI/장시간/공개 상태 검사는 아닙니다.');
  assertKnownOptions(args, ['h', 'help']);
  const report = verifyReleaseEvidenceHygiene();
  for (const row of report.checks) console.log('[' + row.status + '] ' + row.name + (row.message ? ': ' + row.message : ''));
  console.log('\n== v2.9.0 release evidence hygiene summary ==\n- schema: ' + report.schema);
  console.log('- index: current-policy-links\n- detailedRecords: per-run; not-read-by-this-command\n- inventory: docs/project-feature-test-inventory.md');
  console.log('- manualUiEvidence: criteria-only\n- directUiFulltest: not-run-by-this-command\n- longrun30And120: not-run-by-this-command\n- publishedMetadata: not-run-by-this-command');
  console.log('- pass: ' + report.pass + '\n- fail: ' + report.fail);
  process.exitCode = report.exitCode;
}
