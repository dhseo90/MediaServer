#!/usr/bin/env node
// 파일 용도: 네 검증 영역의 현행 기록 기준 연결을 보고한다. 동반 명령/제품 테스트를 실행하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from './script_arg_utils.mjs';
import {validateReleaseRecordDocumentation} from './documentation_contract_lib.mjs';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const readText = p => fs.readFileSync(path.resolve(rootDir, p), 'utf8');
export function verifyTestEvidenceConsistency({read = readText, provenance = {branch: 'unknown', head: 'unknown'}} = {}) {
  const report = buildReport(provenance), check = (name, fn) => {
    try {fn(); report.checks.push({name, status: 'pass'});}
    catch (error) {report.checks.push({name, status: 'fail', message: error.message});}
  };
  check('현행 기록 정책·네 영역 companion 명령 연결', () => {
    const errors = validateReleaseRecordDocumentation({read, kind: 'consistency'});
    if (errors.length) throw new Error(errors.join('; '));
  });
  check('보고서 네 영역/미집계/실제 실행 비승격', () => {
    const allowed = new Set(['안정화 테스트', '30분 테스트', '120분 테스트', 'UI 풀테스트']);
    for (const item of report.evidence) {
      if (!allowed.has(item.area) || !['current-run-required', '미실행'].includes(item.status)) throw new Error('영역/실행 상태 불일치');
      for (const key of ['tokenStart', 'tokenEnd', 'tokenConsumed', 'elapsed', 'source']) {
        if (!Object.hasOwn(item.tokenUsage, key)) throw new Error('tokenUsage 필드 누락: ' + key);
      }
    }
    if (new Set(report.evidence.map(item => item.area)).size !== allowed.size) throw new Error('네 영역 누락');
  });
  report.fail = report.checks.filter(row => row.status === 'fail').length;
  report.pass = report.checks.length - report.fail;
  report.status = report.fail ? 'fail' : 'pass';
  report.exitCode = report.fail ? 1 : 0;
  return report;
}
function evidenceRow(id, area, status, source, approvalRequired = false) {
  return {id, area, status, approvalRequired, source, tokenUsage: {
    tokenStart: '미집계', tokenEnd: '미집계', tokenConsumed: '미집계', elapsed: '미집계',
    source: 'not-collected-by-consistency-report-generator'}};
}
function buildReport({branch, head}) {
  return {
    schema: 'media-server.v230-test-evidence-consistency.v1', generatedAt: new Date().toISOString(),
    status: 'pass', targetStep: 'V230-S02', activeRoadmap: 'docs/development-backlog.md',
    branch, head, checks: [],
    completionBoundary: {
      primary: '현행 정책/기능 정의/명령을 동일한 네 검증 영역으로 연결하는 정의 검사. targetStep은 기존 명령의 호환 식별자이며 activeRoadmap은 현행 계획 진입점이다.',
      excluded: [
        '이 검사는 30분/120분/UI 풀테스트, field/provider smoke, push, PR, tag, GitHub Release를 실행하지 않는다.',
        'field/provider/no-device/외부 credential 조건은 안정화 조건 또는 UI 제외 기록이며 다섯 번째 테스트 영역이 아니다.',
        'companion 행은 실행 정의이며 자식 명령 실행이나 PASS 증거가 아니다.']
    },
    evidence: [
      evidenceRow('s02-consistency-verifier', '안정화 테스트', 'current-run-required', './server.sh verify-v230-test-evidence-consistency'),
      evidenceRow('release-evidence-index', '안정화 테스트', 'current-run-required', './server.sh verify-release-evidence-index'),
      evidenceRow('feature-inventory-coverage', '안정화 테스트', 'current-run-required', './server.sh verify-feature-inventory-coverage'),
      evidenceRow('longrun-separation', '안정화 테스트', 'current-run-required', './server.sh verify-longrun-separation'),
      evidenceRow('manual-ui-evidence-standard', 'UI 풀테스트', 'current-run-required', './server.sh verify-manual-ui-evidence'),
      evidenceRow('soak-30min-execution', '30분 테스트', '미실행', './server.sh verify-predev --soak-minutes 30; 이 명령에서 실행하지 않음'),
      evidenceRow('longrun-120min-execution', '120분 테스트', '미실행', './server.sh verify-predev --soak-minutes 120 또는 ./server.sh verify-va-runtime-console-longrun --duration-minutes 120; 별도 실행 승인 필요', true),
      evidenceRow('ui-fulltest-execution', 'UI 풀테스트', '미실행', '이 정의 검사는 실제 UI 풀테스트를 실행하지 않음')
    ]
  };
}
export function renderMarkdown(report) {
  return ['# 네 검증 영역 기록 기준 검사', '',
    '- schema: ' + report.schema, '- status: ' + report.status, '- targetStep: ' + report.targetStep,
    '- activeRoadmap: ' + report.activeRoadmap, '- branch: ' + report.branch, '- head: ' + report.head, '',
    '## Completion Boundary', '', '- primary: ' + report.completionBoundary.primary, '- excluded:',
    ...report.completionBoundary.excluded.map(item => '  - ' + item), '', '## Evidence Rows', '',
    '| id | area | status | approval required | source | token source |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.evidence.map(item => '| ' + [item.id, item.area, item.status, item.approvalRequired ? 'yes' : 'no', item.source, item.tokenUsage.source].join(' | ') + ' |'),
    '', '## Checks', '', ...report.checks.map(item => '- ' + item.status + ': ' + item.name + (item.message ? ' - ' + item.message : '')), ''
  ].join('\n') + '\n';
}
function readGit(args) {
  const result = spawnSync('git', args, {cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  return !result.error && result.status === 0 ? result.stdout.trim() || 'unknown' : 'unknown';
}
function writeText(target, text) {fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, text, 'utf8');}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (hasHelpFlag(args)) printUsageAndExit('네 검증 영역 기록 기준 검사\n\nUsage:\n  ./server.sh verify-v230-test-evidence-consistency [--report <path>] [--json-report <path>]\n\n현행 정의와 명령 연결을 검사합니다. JSON/Markdown은 정의 검사 결과이며 실제 테스트 실행 증거가 아닙니다.\nGit provenance는 읽기 전용으로 확인하고 Git 없는 source archive에서는 unknown입니다.');
  assertKnownOptions(args, ['report', 'json-report', 'h', 'help']);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const match = /^--(report|json-report)(?:=(.*))?$/.exec(args[i]);
    if (!match) throw new Error('unexpected argument: ' + args[i]);
    const value = match[2] === undefined ? args[++i] : match[2];
    if (!value || value.startsWith('--') || Object.hasOwn(options, match[1])) throw new Error('출력 경로 누락/중복: ' + match[1]);
    options[match[1]] = path.resolve(rootDir, value);
  }
  const report = verifyTestEvidenceConsistency({provenance: {
    branch: readGit(['rev-parse', '--abbrev-ref', 'HEAD']), head: readGit(['rev-parse', 'HEAD'])}});
  for (const row of report.checks) console.log('[' + row.status + '] ' + row.name + (row.message ? ': ' + row.message : ''));
  console.log('\n== v2.3.0 S02 evidence consistency summary ==');
  for (const key of ['schema', 'targetStep', 'branch', 'head']) console.log('- ' + key + ': ' + report[key]);
  console.log('- evidenceRows: ' + report.evidence.length + '\n- pass: ' + report.pass + '\n- fail: ' + report.fail);
  if (options.report) writeText(options.report, renderMarkdown(report));
  if (options['json-report']) writeText(options['json-report'], JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.exitCode;
}
