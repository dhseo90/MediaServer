#!/usr/bin/env node
// 파일 용도: 현행 기록 기준과 선택한 Markdown 결과 구조를 검사한다. 원실행 적격 증명이 아니다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertKnownOptions, hasHelpFlag, printUsageAndExit} from './script_arg_utils.mjs';
import {validateReleaseRecordDocumentation} from './documentation_contract_lib.mjs';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const readText = p => fs.readFileSync(path.resolve(rootDir, p), 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const clean = value => String(value).replace(/[\x60*_]/g, '').trim();
const incomplete = new Set(['미실행', '제외', '미확인', 'manual-not-run', '부분', 'not-run', 'partial', 'excluded', 'unverified', 'skip', 'skipped']);
const cells = line => {
  const s = line.trim();
  return s.startsWith('|') && s.endsWith('|') ? s.slice(1, -1).split(/(?<!\\)\|/).map(x => x.replace(/\\\|/g, '|').trim()) : null;
};
const resultHeader = s => /^(?:결과|result)(?:\s*\(\s*pass\s*\/\s*fail\s*\))?$/i.test(clean(s));
const evidenceHeader = s => /^(?:(?:최종|final)\s*)?(?:evidence|증거)(?:\s*(?:링크|link|ref))?$/i.test(clean(s));
function temporaryEvidence(target) {
  let value = target.trim().replace(/^<|>$/g, '');
  try {value = decodeURIComponent(value);} catch {return true;}
  return /^(?:\/(?:private\/)?tmp(?:\/|$)|\$(?:TMPDIR|\{TMPDIR\})(?:\/|$)|file:\/\/)/i.test(value);
}

// 결과 칸은 PASS/FAIL만 허용한다. 별도 상태표의 미완료 상태를 실제 FAIL로 바꾸지 않는다.
// 링크 판정은 최종 evidence 칸/항목에 한정하여 임시자료 정리 설명을 오탐하지 않는다.
export function validateReleaseRecordResult(markdown) {
  const errors = [], resultRows = [], statusRows = [], evidenceLinks = [];
  const lines = String(markdown).split(/\r?\n/), visible = [];
  let fence = '';
  for (const line of lines) {
    const match = /^\s*(\x60{3,}|~{3,})/.exec(line);
    if (match) {if (!fence) fence = match[1][0]; else if (match[1][0] === fence) fence = ''; visible.push('');}
    else visible.push(fence ? '' : line);
  }
  if (fence) errors.push('닫히지 않은 code fence');
  const references = new Map();
  const referenceKey = name => name.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const line of visible) {
    const match = /^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/.exec(line);
    if (match) {
      const key = referenceKey(match[1]);
      if (references.has(key)) errors.push('중복 evidence reference 정의: ' + key);
      else references.set(key, match[2]);
    }
  }
  const inspectEvidence = (text, line) => {
    const targets = [];
    const referenceTarget = label => {
      const target = references.get(referenceKey(label));
      if (target) targets.push(target); else errors.push('미해결 evidence reference: ' + line);
    };
    let remaining = text.replace(/\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/g,
      (_, target) => {targets.push(target); return '';});
    remaining = remaining.replace(/\[([^\]]+)\]\[([^\]]*)\]/g,
      (_, label, reference) => {referenceTarget(reference || label); return '';});
    remaining = remaining.replace(/<([^<>\r\n]+)>/g, (_, target) => {targets.push(target); return '';});
    remaining.replace(/\[([^\]]+)\]/g, (_, label) => {referenceTarget(label); return '';});
    // 명시 evidence 칸의 plain/backtick 경로도 검사한다.
    const raw = clean(text);
    for (const match of raw.matchAll(/(?:^|\s)(\/(?:private\/)?tmp(?:\/[^\s]*)?|\$(?:TMPDIR|\{TMPDIR\})(?:\/[^\s]*)?|file:\/\/[^\s]*)/gi)) targets.push(match[1]);
    for (const target of targets) {
      evidenceLinks.push({line, target});
      if (temporaryEvidence(target)) errors.push('최종 임시 evidence 거부: ' + line + ': ' + target);
    }
  };
  for (let i = 0; i < visible.length; i += 1) {
    const item = /^\s*[-*]\s*((?:(?:최종|final)\s*)?(?:evidence|증거)(?:\s*(?:링크|link|ref))?)\s*:\s*(.*)$/i.exec(visible[i]);
    if (item) inspectEvidence(item[2], i + 1);
    const header = cells(visible[i]);
    if (!header) continue;
    const resultIndex = header.findIndex(resultHeader);
    const statusIndex = header.findIndex(x => /^(상태|status)$/i.test(clean(x)));
    const evidenceIndexes = header.map((x, n) => evidenceHeader(x) ? n : -1).filter(n => n >= 0);
    if (resultIndex < 0 && statusIndex < 0 && evidenceIndexes.length === 0) continue;
    const separator = cells(visible[i + 1] || '');
    if (!separator || separator.length !== header.length || separator.some(x => !/^:?-{3,}:?$/.test(x))) {
      errors.push('깨진 결과/상태/evidence 표: ' + (i + 1)); continue;
    }
    let count = 0; i += 2;
    for (; i < visible.length && visible[i].trim().startsWith('|'); i += 1) {
      const row = cells(visible[i]); count += 1;
      if (!row || row.length !== header.length) {errors.push('깨진 결과 행: ' + (i + 1)); continue;}
      if (resultIndex >= 0) {
        const value = clean(row[resultIndex]); resultRows.push({line: i + 1, value});
        if (!/^(PASS|FAIL)$/i.test(value)) errors.push('결과는 PASS/FAIL만 허용: ' + (i + 1) + ': ' + value);
        else if (value.toUpperCase() === 'FAIL') errors.push('실제 FAIL 결과: ' + (i + 1));
      }
      if (statusIndex >= 0) {
        const value = clean(row[statusIndex]); statusRows.push({line: i + 1, value});
        if (incomplete.has(value.toLowerCase())) errors.push('미완료 상태: ' + (i + 1) + ': ' + value);
        else if (!/^PASS$/i.test(value)) errors.push('FAIL 또는 미인식 상태: ' + (i + 1) + ': ' + value);
      }
      for (const n of evidenceIndexes) inspectEvidence(row[n], i + 1);
    }
    if (!count) errors.push('빈 결과/상태/evidence 표');
    i -= 1;
  }
  if (!resultRows.length) errors.push('인식 가능한 실제 결과 행 없음');
  return {errors, resultRows, statusRows, evidenceLinks};
}

export function verifyReleaseTestRecords({read = readText, resultPath = '', readResult} = {}) {
  const checks = [], check = (name, fn) => {
    try {fn(); checks.push({name, status: 'pass'});}
    catch (error) {checks.push({name, status: 'fail', message: error.message});}
  };
  check('현행 기록 정책·SAFE-075/OPS-045 정의·명령 연결', () => {
    const errors = validateReleaseRecordDocumentation({read, kind: 'records'});
    if (errors.length) throw new Error(errors.join('; '));
  });
  check('합성 결과 파서 경계 자체검사(실제 기록 아님)', () => {
    const good = '| 항목 | 결과 | evidence |\n| --- | --- | --- |\n| synthetic | PASS | [출력](run.json) |';
    const cases = [[good, true], [good.replace('PASS', 'FAIL'), false],
      [good.replace('PASS', '미실행'), false], ['결과 요약뿐', false],
      [good.replace('run.json', '/tmp/run.json'), false]];
    if (!cases.every(([text, valid]) => (validateReleaseRecordResult(text).errors.length === 0) === valid)) throw new Error('합성 결과 파서 판정 불일치');
  });
  let resultInspection = {status: 'not-run', resultRows: [], statusRows: [], evidenceLinks: []};
  if (resultPath) check('명시 결과 구조·미완료/FAIL·최종 증거·입력 불변', () => {
    const inputRead = readResult || (read === readText ? p => fs.readFileSync(path.resolve(rootDir, p)) : read);
    const before = inputRead(resultPath);
    const parsed = validateReleaseRecordResult(Buffer.isBuffer(before) ? before.toString('utf8') : before);
    resultInspection = {...parsed, status: 'fail', inputSha256: sha256(before), inputUnchanged: false};
    const after = inputRead(resultPath);
    const inputUnchanged = resultInspection.inputSha256 === sha256(after);
    resultInspection.inputUnchanged = inputUnchanged;
    const recordsBoundaryObserved = inputUnchanged && parsed.errors.length === 0;
    if (!recordsBoundaryObserved) throw new Error([...parsed.errors, ...(!inputUnchanged ? ['입력 원본 변경 감지'] : [])].join('; '));
    resultInspection.status = 'pass';
  });
  const fail = checks.filter(row => row.status === 'fail').length;
  return {schema: 'media-server.v290-release-test-records-enforcement.v1', status: fail ? 'fail' : 'pass',
    checks, pass: checks.length - fail, fail, exitCode: fail ? 1 : 0, resultInspection, executionEvidenceVerified: false};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (hasHelpFlag(args)) printUsageAndExit('기록 기준/선택 결과 구조 검사\n\nUsage:\n  ./server.sh verify-v290-release-test-records-enforcement [--result <Markdown 파일>]\n\n기본은 현행 정의와 합성 자체검사이며 실제 결과 검사는 미실행입니다.\n--result는 PASS/FAIL 결과, 별도 미완료 상태, 최종 임시 evidence, 입력 불변을 확인합니다.\n실제 FAIL/미완료/빈 결과/깨진 결과는 exit 1입니다. 원실행·artifact hash·UI/미디어 적격 증명이 아닙니다.');
  assertKnownOptions(args, ['result', 'h', 'help']);
  let resultPath = '';
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--result') {
      if (!args[i + 1] || args[i + 1].startsWith('-') || resultPath) throw new Error('--result 경로 누락/중복');
      resultPath = args[++i];
    } else if (args[i].startsWith('--result=')) {
      if (resultPath || !args[i].slice(9)) throw new Error('--result 경로 누락/중복');
      resultPath = args[i].slice(9);
    } else throw new Error('unexpected argument: ' + args[i]);
  }
  const report = verifyReleaseTestRecords({resultPath});
  for (const row of report.checks) console.log('[' + row.status + '] ' + row.name + (row.message ? ': ' + row.message : ''));
  console.log('\n== v2.9.0 release test records enforcement summary ==\n- schema: ' + report.schema);
  console.log('- recordsSourceOfTruth: current-policy; explicit-per-run-input\n- resultCells: pass-or-fail-only\n- tmpEvidence: not-final-evidence\n- summaryOnlyCompletion: forbidden');
  console.log('- resultInspection: ' + report.resultInspection.status);
  if (resultPath) console.log('- resultDetails: ' + JSON.stringify(report.resultInspection));
  console.log('- executionEvidenceVerified: false\n- uiFulltest: not-run-by-this-command\n- longrun30Or120: not-run-by-this-command\n- publishedMetadata: not-run-by-this-command');
  console.log('- pass: ' + report.pass + '\n- fail: ' + report.fail);
  process.exitCode = report.exitCode;
}
