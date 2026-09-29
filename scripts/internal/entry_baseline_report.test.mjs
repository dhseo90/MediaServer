// 초기 진입 보고서의 비실행·현행 연결·출력 경계 자체검사. 실제 제품 검사가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const cases=[
  ['190','baseline','report',9],['210','baseline','',15],['220','boundary','',14],['230','baseline','',16],
].map(([version,suffix,extra,count])=>({version,command:`verify-v${version}-entry-${suffix}`,script:`verify_v${version}_entry_${suffix}${extra?'_'+extra:''}.mjs`,schema:`media-server.v${version}-entry-${suffix}-report.v1`,count}));
const commonCommands=['verify-release-metadata','verify-release-evidence-index','verify-integrator-contract-artifact','verify-event-post','verify-auth-routes','verify-codecs','verify-webrtc-ice','verify-webrtc-va-metadata','verify-va-metadata-sidechannel','verify-ws-metadata','verify-release-closeout-helper','verify-predev','verify-va-runtime-console-longrun'];
const context={schema:'media-server.release-context.v1',repository:'example/project',releaseTarget:'v4.1.1',priorPublishedTag:'v4.1.0',releaseNotes:'docs/notes.md',roadmap:'docs/roadmap.md',distribution:'source-only',tagType:'signed-annotated',published:{tag:'v4.1.0',url:'https://github.com/example/project/releases/tag/v4.1.0',observedAt:'2000-01-01T00:00:00Z'}};
function fixture(run){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-entry-report-test-'));
  const put=(file,value)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof value==='string'?value:JSON.stringify(value));};
  const copy=file=>{const p=path.join(repo,file);if(!fs.existsSync(p))return;put(file,fs.readFileSync(p,'utf8'));};
  try{
    put('VERSION','4.1.1');put('CMakeLists.txt','project(media_server VERSION 4.1.1 LANGUAGES CXX)');
    for(const f of ['README.md','README.en.md'])put(f,'![source](https://img.shields.io/badge/source-4.1.1-blue)\n[Latest](https://github.com/example/project/releases/latest)\n[문서](docs/README.md)\n');
    put('docs/README.md','# 문서');put('docs/notes.md','# 변경 사항');put('docs/roadmap.md','# 미래 계획');
    put('docs/release-policy.md','<!-- release-metadata -->\n```json\n'+JSON.stringify(context)+'\n```\n');
    // 동반 명령을 한 문서에 전수 복사할 필요는 없다. 실제 dispatch는 별도로 검사한다.
    put('docs/stream-verification.md',cases.map(c=>c.command+' '+c.schema).join('\n'));
    put('server.sh',[...cases,...commonCommands.map(command=>({command,script:command.replaceAll('-','_')+'.mjs'}))].map(c=>`\n  ${c.command})\n    require_internal ${c.script}\n    exec "\${INTERNAL_DIR}/${c.script}" "$@"\n    ;;\n`).join(''));
    put('scripts/internal/verify_script_inventory.mjs',cases.map(c=>c.script).join('\n'));
    put('src/analysis/incident_memory.cpp','IncidentProjectionContainsForbiddenMaterial force_jsonl_bm25_fallback');
    for(const f of [...cases.map(c=>c.script),'script_arg_utils.mjs','script_dispatch_parser.mjs','documentation_contract_lib.mjs','entry_baseline_report.mjs','release_documentation_contract.mjs'])copy('scripts/internal/'+f);
    const cli=(c,args=[])=>spawnSync(process.execPath,[path.join(root,'scripts/internal',c.script),...args],{cwd:root,encoding:'utf8',timeout:10000});
    return run({root,put,cli});
  }finally{fs.rmSync(root,{recursive:true,force:true});assert(!fs.existsSync(root));}
}

test('ENTRY-REPORT-01 종료 기록 없는 소스에서 기존 보고서 명령 실행',()=>fixture(({root,cli})=>{
  for(const c of cases){
    const r=cli(c,['--json-report',`out/${c.version}.json`]);
    assert.equal(r.status,0,`${c.command}: ${r.stdout}\n${r.stderr}`);
    const report=JSON.parse(fs.readFileSync(path.join(root,'out',c.version+'.json')));
    assert.equal(report.schema,c.schema);assert.equal(report.status,'pass');
    assert.equal(report.evidence.length,c.count);assert.equal(report.currentContext.sourceVersion,'4.1.1');
    assert.equal(report.currentContext.git.applicable,false);assert.equal(report.productExecutionEvidence,false);
    assert.equal(report.historicalBaseline.scope,'historical-not-current-policy');
    assert(report.evidence.every(row=>['미실행','미확인'].includes(row.status)));
    assert(!fs.existsSync(path.join(root,'docs/release-test-records.md')));
  }
}));
test('ENTRY-REPORT-02 현재 CMake 오류는 실제 FAIL·exit·보고서로 전파',()=>fixture(({root,put,cli})=>{
  put('CMakeLists.txt','project(media_server VERSION 0.0.0 LANGUAGES CXX)');
  for(const c of cases){const r=cli(c,['--json-report',`fail/${c.version}.json`]);assert.equal(r.status,1);const report=JSON.parse(fs.readFileSync(path.join(root,'fail',c.version+'.json')));assert.equal(report.status,'fail');assert(report.checks.some(x=>x.status==='fail'&&x.message.includes('CMake')));assert.equal(report.checks.filter(x=>x.status==='fail').length,1);assert(report.evidence.every(x=>!x.status.includes('pass')));}
}));
test('ENTRY-REPORT-03 실제 분기와 문서 명령 연결 누락 거부',()=>{
  fixture(({put,cli})=>{
    put('server.sh','\n  other)\n exec verify_v190_entry_baseline_report.mjs\n ;;\n');
    const r=cli(cases[0]);assert.equal(r.status,1);assert(r.stdout.includes('명령 dispatch 없음'));
  });
  fixture(({root,put,cli})=>{
    const source=fs.readFileSync(path.join(root,'server.sh'),'utf8');
    // 주석의 원래 파일명이나 다른 분기의 실행으로 현재 명령을 통과시키지 않는다.
    put('server.sh',source.replace(`    require_internal ${cases[0].script}`,`    # ${cases[0].script}\n    require_internal wrong.mjs`).replace(`    exec "\${INTERNAL_DIR}/${cases[0].script}"`, '    exec "${INTERNAL_DIR}/wrong.mjs"'));
    const r=cli(cases[0]);assert.equal(r.status,1);assert(r.stdout.includes('다른 스크립트로 연결됨'));
  });
  fixture(({put,cli})=>{
    put('docs/stream-verification.md','# 명령 없는 문서');
    const r=cli(cases[1]);assert.equal(r.status,1);assert(r.stdout.includes('명령 정의 없음'));
  });
});
test('ENTRY-REPORT-04 잘못된 옵션·값 누락·중복 경로 거부, 기존 파일 보존',()=>fixture(({root,put,cli})=>{
  put('existing.md','사용자 원문');
  for(const c of cases){
    for(const args of [['--published'],['--help','--published'],['--report'],['--json-report','--report'],['--report','a','--report','b'],['--report','same','--json-report','same'],['unexpected']])assert.notEqual(cli(c,args).status,0,JSON.stringify(args));
    assert.notEqual(cli(c,['--report','existing.md']).status,0);assert.equal(fs.readFileSync(path.join(root,'existing.md'),'utf8'),'사용자 원문');
    assert.equal(cli(c,['--help']).status,0);
  }
}));
test('ENTRY-REPORT-05 정상 Markdown/JSON 출력은 실제 실행과 분리',()=>fixture(({root,cli})=>{
  for(const c of cases){const r=cli(c,['--report',`out/${c.version}.md`,'--json-report',`out/${c.version}.json`]);assert.equal(r.status,0,r.stderr);const text=fs.readFileSync(path.join(root,'out',c.version+'.md'),'utf8');assert(text.includes('제품 실행 증거가 아님'));assert(!text.includes('recorded-pass'));}
}));
test('ENTRY-REPORT-06 v2.2 incident redaction/fallback 정적 경계 유지',()=>fixture(({put,cli})=>{
  for(const source of ['force_jsonl_bm25_fallback','IncidentProjectionContainsForbiddenMaterial']){put('src/analysis/incident_memory.cpp',source);const r=cli(cases[2]);assert.equal(r.status,1);assert(r.stdout.includes('incident projection'));}
}));
test('ENTRY-REPORT-07 문서 누락·외부 symlink 입력 거부',()=>fixture(({root,cli})=>{
  const file=path.join(root,'README.md');fs.unlinkSync(file);
  assert.equal(cli(cases[0]).status,1);fs.symlinkSync('/etc/passwd',file);assert.equal(cli(cases[0]).status,1);
}));
test('ENTRY-REPORT-08 후속 명령의 미실행·승인·미집계 유지와 PASS 위장 거부',()=>{
  fixture(({root,cli})=>{
    for(const c of cases){assert.equal(cli(c,['--json-report',c.version+'.json']).status,0);const p=JSON.parse(fs.readFileSync(path.join(root,c.version+'.json')));for(const row of p.evidence){for(const k of ['tokenStart','tokenEnd','tokenConsumed','elapsed','source'])assert(Object.hasOwn(row.tokenUsage,k));}assert.equal(p.evidence.find(x=>x.id==='longrun-120min').approvalRequired,true);assert.equal(p.evidence.find(x=>x.id==='ui-fulltest').status,'미실행');assert.equal(p.evidence.find(x=>x.id==='soak-30min').status,'미실행');}
  });
  fixture(({root,put,cli})=>{
    for(const c of cases){
      const file='scripts/internal/'+c.script,source=fs.readFileSync(path.join(root,file),'utf8');
      assert(source.includes('status: "미실행"'));
      put(file,source.replace('status: "미실행"','status: "pass"'));
      const r=cli(c);assert.equal(r.status,1);assert(r.stderr.includes('정의를 실행 PASS로 승격할 수 없음'));
    }
  });
});
