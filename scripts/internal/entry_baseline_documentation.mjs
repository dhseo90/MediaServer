// 파일 용도: 과거 진입 검증기의 현행 문서·명령 연결과 회귀 입력을 검사한다. 실행 이력은 읽지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {readReleaseContext, validateReleaseContext, validateLocalReleaseDocuments} from './release_documentation_contract.mjs';

const versionPattern=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function semverAtLeast(current,baseline) {
  if(!versionPattern.test(current)||!versionPattern.test(baseline))return false;
  const left=current.split('.').map(BigInt),right=baseline.split('.').map(BigInt);
  for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]>right[i];
  return true;
}

export function parseEntryRoot(args,defaultRoot) {
  if(!args.length)return defaultRoot;
  if(args.length===2&&args[0]==='--root'&&args[1]&&!args[1].startsWith('--'))return path.resolve(args[1]);
  throw new Error('허용 옵션은 --root <소스 경로>뿐입니다');
}

function read(root,relative) {
  const base=fs.realpathSync(root),candidate=path.resolve(base,relative),real=fs.realpathSync(candidate);
  if(!real.startsWith(base+path.sep)||!fs.statSync(real).isFile())throw new Error(`입력 경로 이탈: ${relative}`);
  return fs.readFileSync(real,'utf8');
}

export function validateBoundaryCase(fixture,baseline,expected) {
  const errors=[];
  if(fixture.schema!=='media-server.entry-baseline-cases.v1'||fixture.executionEvidence!==false)errors.push('회귀 입력이 실행 증거로 표시됐거나 schema가 다름');
  if(!/^[a-f0-9]{40}$/.test(fixture.provenance?.commit??'')||fixture.provenance?.path!=='docs/project-feature-test-inventory.md')errors.push('회귀 입력 출처 없음');
  if(!baseline||typeof baseline!=='object')return [...errors,'선택된 회귀 입력 없음'];
  for(const key of ['command','sourceVersion','publishedTag','roadmap'])if(baseline[key]!==expected[key])errors.push(`회귀 입력 ${key} 불일치`);
  if(JSON.stringify(baseline.featureIds)!==JSON.stringify(expected.featureIds))errors.push('회귀 입력 기능 ID 불일치');
  if(expected.decision!==undefined||baseline.decision!==undefined) {
    if(expected.decision?.scope!=='historical-not-current-policy'||!isDeepStrictEqual(baseline.decision,expected.decision))errors.push('과거 선택·대안·제외·제약 불일치 또는 현행 정책 승격');
    if(!/^[a-f0-9]{40}$/.test(fixture.provenance?.decisionSource?.commit??'')||fixture.provenance?.decisionSource?.path!=='docs/development-backlog.md')errors.push('과거 선택 근거 출처 없음');
  }
  for(const key of ['featureImplementation','uiFulltest','longrun30Or120','publishedMetadata'])if(baseline.claims?.[key]!=='not-run-by-this-command')errors.push(`${key} 실행 승격 금지`);
  return errors;
}

export function loadEntryInputs(root,command) {
  const files={
    cmake:read(root,'CMakeLists.txt'),
    serverSh:read(root,'server.sh'),
    featureInventory:read(root,'docs/project-feature-test-inventory.md'),
  };
  const version=read(root,'VERSION').trim();
  const context=readReleaseContext(read(root,'docs/release-policy.md'));
  const fixture=JSON.parse(read(root,'test/fixtures/entry_baseline_cases.json'));
  if(!Array.isArray(fixture.cases))throw new Error('회귀 입력 목록 없음');
  const selected=fixture.cases.filter(item=>item.command===command);
  if(selected.length!==1)throw new Error('회귀 입력은 명령마다 정확히 하나여야 함');
  const baseline=selected[0];
  const implementation=JSON.parse(read(root,'test/fixtures/project_feature_implementation_evidence.json'));
  const errors=[...validateReleaseContext(context,version),...validateLocalReleaseDocuments(root,context,version)];
  const branchStart=files.serverSh.indexOf(`\n  ${command})`);
  const branchEnd=files.serverSh.indexOf(';;',branchStart);
  const script=`verify_${command.slice('verify-'.length).replaceAll('-','_')}.mjs`;
  if(branchStart<0||branchEnd<branchStart||!files.serverSh.slice(branchStart,branchEnd).includes(script))errors.push('실제 명령 dispatch 누락');
  for(const id of baseline.featureIds??[]) {
    const rows=files.featureInventory.split(/\r?\n/).filter(line=>line.split('|')[1]?.trim()===id);
    if(rows.length!==1||!rows[0].includes(command))errors.push(`${id} 테스트 정의 연결 누락/중복`);
    const items=(implementation.items??[]).filter(item=>item.id===id);
    if(items.length!==1||items[0].verifierEvidence?.command!==command)errors.push(`${id} 실행 명령 연결 누락/중복`);
  }
  return {files,version,context,fixture,baseline,errors};
}

export function reportEntryChecks(checks,inputs,command) {
  let pass=0,fail=0;
  for(const [name,run]of checks)try{run();pass++;console.log(`[pass] ${name}`);}catch(error){fail++;console.log(`[fail] ${name}: ${error.message}`);}
  console.log(`== ${command} 문서 계약 검사 ==`);
  console.log(`- currentVersion: ${inputs.version}`);
  console.log(`- publishedSnapshot: ${inputs.context.published.tag} (현재 원격 확인 아님)`);
  console.log(`- historicalFixture: ${inputs.baseline.sourceVersion} / ${inputs.baseline.publishedTag}`);
  for(const key of ['featureImplementation','uiFulltest','longrun30Or120','publishedMetadata'])console.log(`- ${key}: not-run-by-this-command`);
  console.log(`- pass: ${pass}\n- fail: ${fail}`);
  if(fail)process.exitCode=1;
}
