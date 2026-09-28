// 초기 버전 CLI의 보고서 형식을 유지하되 현재 문서 검사와 과거 기준을 분리한다.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReleaseContext,validateReleaseContext,validateLocalReleaseDocuments} from './release_documentation_contract.mjs';
import {parseServerDispatches} from './script_dispatch_parser.mjs';

function options(args) {
  const out={};
  for(let i=0;i<args.length;i++){
    const match=/^--(report|json-report)(?:=(.*))?$/.exec(args[i]);
    if(!match||Object.hasOwn(out,match[1]))throw Error('출력 옵션 오류 또는 중복');
    const value=match[2]??args[++i];
    if(!value||value.startsWith('-'))throw Error('출력 파일 경로 필요');
    out[match[1]]=value;
  }
  return out;
}

export function createEntryReportRunner({url,args,command,schema,expectedIds,companionCommands=[]}) {
  const root=path.resolve(path.dirname(fileURLToPath(url)),'../..'),checks=[];
  const check=(name,fn)=>checks.push({name,fn});
  const readText=relative=>{
    const base=fs.realpathSync(root),file=fs.realpathSync(path.join(base,relative));
    if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())throw Error('입력 파일 경로 이탈');
    return fs.readFileSync(file,'utf8');
  };
  const opts=options(args),outputs=Object.entries(opts).map(([kind,file])=>({kind,file:path.resolve(root,file)}));
  assert.equal(new Set(outputs.map(x=>x.file)).size,outputs.length,'출력 경로 중복');
  for(const {file}of outputs){
    assert(!file.split(path.sep).includes('.git'),'Git 내부에 보고서 생성 금지');
    assert(!fs.existsSync(file)&&!fs.lstatSync(file,{throwIfNoEntry:false}),'기존 출력 파일 덮어쓰기 금지');
  }
  const version=readText('VERSION').trim(),context=readReleaseContext(readText('docs/release-policy.md'));
  const git=gitContext(root),branch=git.branch,head=git.head;
  check('현재 source·CMake·공개 관측과 문서 연결',()=>{
    assert.deepEqual([...validateReleaseContext(context,version),...validateLocalReleaseDocuments(root,context,version)],[]);
  });
  check('기존 CLI와 동반 명령의 실제 dispatch·정의 연결',()=>{
    const server=readText('server.sh'),docs=readText('docs/stream-verification.md');
    const dispatches=parseServerDispatches(server);
    for(const name of [command,...companionCommands]){
      const matches=dispatches.filter(item=>item.command===name);
      assert.equal(matches.length,1,`명령 dispatch 없음 또는 중복: ${name}`);
      if(name===command){
        assert.equal(matches[0].script,path.basename(fileURLToPath(url)),'다른 스크립트로 연결됨');
        assert(docs.includes(name),`명령 정의 없음: ${name}`);
      }
    }
    assert(docs.includes(schema),'JSON 식별자 문서 연결 없음');
  });
  return {version,branch,head,readText,check,finish(payload){
    // 과거 고정값·조건은 정의다. 확인하지 않은 published/제품 결과를 recorded-pass로 만들지 않는다.
    const historicalBaseline={scope:'historical-not-current-policy'};
    for(const key of ['release','currentRelease','entryTarget','entryBranch','activeRoadmap','baselineStatus','baselineDecision','boundaryDecision']){
      if(Object.hasOwn(payload,key)){historicalBaseline[key]=payload[key];delete payload[key];}
    }
    payload.historicalBaseline=historicalBaseline;
    payload.currentContext={sourceVersion:version,releaseTarget:context.releaseTarget,publishedSnapshot:context.published,roadmap:context.roadmap,git};
    payload.productExecutionEvidence=false;
    payload.scope='local-documentation-check-not-product-or-release-pass';
    payload.evidence=payload.evidence.map(row=>{
      assert(['미실행','미확인','manual-not-run','current-run-required'].includes(row.status),`${row.id}: 정의를 실행 PASS로 승격할 수 없음`);
      return {...row,status:row.status==='미확인'?'미확인':'미실행',
        definitionScope:'historical-companion-definition-not-current-release-requirement'};
    });
    check('보고서 개별 정의·미실행·승인·미집계 경계',()=>{
      assert.equal(payload.schema,schema);assert.deepEqual(payload.evidence.map(x=>x.id),expectedIds);
      assert.equal(new Set(expectedIds).size,expectedIds.length);
      for(const row of payload.evidence){
        assert(['미실행','미확인'].includes(row.status));
        for(const key of ['tokenStart','tokenEnd','tokenConsumed','elapsed','source'])assert(Object.hasOwn(row.tokenUsage,key),`${row.id}: ${key}`);
      }
      for(const id of ['ui-fulltest','soak-30min','longrun-120min'])assert.equal(payload.evidence.find(x=>x.id===id)?.status,'미실행');
      assert.equal(payload.evidence.find(x=>x.id==='longrun-120min').approvalRequired,true);
    });
    payload.checks=[];
    for(const {name,fn}of checks){
      try{fn();payload.checks.push({name,status:'pass'});console.log(`[pass] ${name}`);}
      catch(error){payload.checks.push({name,status:'fail',message:error.message});console.log(`[fail] ${name}: ${error.message}`);}
    }
    payload.status=payload.checks.some(x=>x.status==='fail')?'fail':'pass';
    console.log(`== ${command} 문서·보고서 검사 ==\n- sourceVersion: ${version}\n- 제품 실행 증거가 아님\n- pass: ${payload.checks.filter(x=>x.status==='pass').length}\n- fail: ${payload.checks.filter(x=>x.status==='fail').length}`);
    for(const {kind,file}of outputs){
      fs.mkdirSync(path.dirname(file),{recursive:true});
      fs.writeFileSync(file,kind==='report'?render(payload):JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
    }
    if(payload.status==='fail')process.exitCode=1;
  }};
}

function gitContext(root) {
  const run=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:5000});return r.status===0?r.stdout.trim():'';};
  const top=run(['rev-parse','--show-toplevel']);
  if(!top||fs.realpathSync(top)!==fs.realpathSync(root))return {applicable:false,branch:'unknown',head:'unknown',reason:'이 소스 루트의 Git 정보 없음. 문서 검사에는 필요하지 않음'};
  return {applicable:true,branch:run(['rev-parse','--abbrev-ref','HEAD'])||'unknown',head:run(['rev-parse','HEAD'])||'unknown'};
}

function render(report) {
  const cell=value=>String(value).replaceAll('|','\\|').replace(/\s+/g,' ');
  return ['# 진입 문서·보고서 검사','',
    '이 보고서의 PASS는 아래 문서 검사만 의미하며 제품 실행 증거가 아님.',
    `- schema: ${report.schema}`,`- status: ${report.status}`,`- 생성 시각: ${report.generatedAt}`,
    `- 현재 source: ${report.currentContext.sourceVersion}`,`- 공개 관측값(원격 재확인 아님): ${report.currentContext.publishedSnapshot.tag}`,
    `- Git: ${report.currentContext.git.applicable?'로컬 확인':'적용 불가'}`,'',
    '## 과거 기준 — 현행 정책·실행 결과 아님','',
    '```json',JSON.stringify(report.historicalBaseline,null,2),'```','',
    '## 동반 검사 정의 — 여기서 실행하지 않음','',
    '| ID | 항목 | 실행 상태 | 정의의 명령·조건 |','| --- | --- | --- | --- |',
    ...report.evidence.map(x=>`| ${[x.id,x.area,x.status,x.source].map(cell).join(' | ')} |`),'',
    '## 이번 문서 검사','',...report.checks.map(x=>`- ${x.status}: ${x.name}${x.message?' — '+cell(x.message):''}`),'',
  ].join('\n')+'\n';
}
