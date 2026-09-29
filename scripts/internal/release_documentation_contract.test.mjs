// 파일 용도: 문서 표현과 릴리즈 사실 검증을 분리하는 격리 자체검사. 제품 실행 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReleaseContext, validateReleaseContext, validateReadmeMetadata, validateLocalReleaseDocuments} from './release_documentation_contract.mjs';

// CLI 소비자의 읽기 입력만 격리한다. 제품·문서 원본은 변경하지 않는다.
function runPolicyConsumer(file, mutation, temporaryRoot, args = []) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const source = `
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    import childProcess from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
    const root=${JSON.stringify(root)}, mutation=${JSON.stringify(mutation)};
    if(${JSON.stringify(file)}==='verify_release_closeout_helper.mjs') {
      childProcess.spawnSync=(command,args)=>{
        if(command!=='git')throw new Error('dry-run에서 외부 실행 금지');
        return {status:0,stdout:args[0]==='branch'?'fixture-branch':'',stderr:''};
      };
      syncBuiltinESMExports();
    }
    if(mutation?.childFailure){
      childProcess.spawnSync=()=>({status:17,signal:null,stdout:'partial fixture output',stderr:'fixture-child-failed'});
      syncBuiltinESMExports();
    }
    const read=fs.readFileSync;
    fs.readFileSync=function(file, options) {
      const relative=path.relative(root,String(file));
      if (['docs/release-evidence-index.md','docs/release-test-records.md','docs/development-backlog.md'].includes(relative))
        throw new Error('종료 기록 읽기 금지: '+relative);
      const raw=read.call(this,file,options);
      let text=String(raw);
      if (['docs/release-policy.md','docs/versioning-policy.md'].includes(relative))
        text=text.replace(/^#{1,6} .*$/gm,'# 표현을 바꾼 현행 제목');
      if (mutation?.path===relative) {
        if(mutation.featureCommand) {
          const data=JSON.parse(text);
          data.items.find(item=>item.id===mutation.featureCommand.id).verifierEvidence.command=mutation.featureCommand.command;
          text=JSON.stringify(data);
        } else text=text.replaceAll(mutation.remove,mutation.replace ?? '');
      }
      if(mutation?.generatedFailure&&String(file).endsWith('/release-checklist.md'))text=text.replaceAll('overall: PASS','overall: FAIL');
      if(mutation?.generatedHtmlFailure&&String(file).endsWith('/release-checklist.html'))text=text.replaceAll('RC Release Checklist','broken fixture heading');
      return Buffer.isBuffer(raw)?Buffer.from(text):text;
    };
    if(mutation?.cleanupFailure)fs.rmSync=()=>{throw new Error('fixture cleanup failure');};
    process.argv=[process.execPath,${JSON.stringify(file)},...${JSON.stringify(args)}];
    await import(pathToFileURL(path.join(root,'scripts/internal',${JSON.stringify(file)})).href);
  `;
  return spawnSync(process.execPath,['--input-type=module','--eval',source],{
    cwd:root,encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024,
    env:{...process.env,TMPDIR:temporaryRoot},
  });
}

const context = {
  schema: 'media-server.release-context.v1', repository: 'example/project', releaseTarget: 'v4.1.1',
  priorPublishedTag: 'v4.1.0', releaseNotes: 'docs/release-notes.md', roadmap: 'docs/roadmap.md',
  distribution: 'source-only', tagType: 'signed-annotated',
  published: {tag: 'v4.1.0', url: 'https://github.com/example/project/releases/tag/v4.1.0', observedAt: '2026-09-28T13:00:00Z'},
};
const policy = c => '<!-- release-metadata -->\n```json\n'+JSON.stringify(c)+'\n```\n';
const readme = `# 제품\n![소스](https://img.shields.io/badge/source-4.1.1-blue)\n[공개 릴리즈](https://github.com/example/project/releases/latest)\n[사용 안내](docs/README.md)\n`;
function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-release-docs-'));
  const put=(file,text)=>{const absolute=path.join(root,file);fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,text);};
  try {
    put('VERSION','4.1.1\n');put('CMakeLists.txt','project(media_server VERSION 4.1.1 LANGUAGES CXX)\n');
    put('README.md',readme);put('README.en.md',readme);put('docs/README.md','# 문서\n');
    put('docs/release-policy.md',policy(context));put(context.releaseNotes,'# 변경 사항\n');put(context.roadmap,'# 다음 계획\n');
    put('test/fixtures/release_metadata_boundary.json',fs.readFileSync(new URL('../../test/fixtures/release_metadata_boundary.json',import.meta.url),'utf8'));
    return run({root,put});
  } finally {fs.rmSync(root,{recursive:true,force:true});assert(!fs.existsSync(root));}
}

test('REL-DOC-01 제목·완료 문장 없이 명시 metadata 읽기',()=>{
  assert.deepEqual(readReleaseContext('# 다른 제목\n'+policy(context)),context);
  assert.deepEqual(validateReleaseContext(context,'4.1.1'),[]);
});
test('REL-DOC-02 누락·중복·잘못된 JSON은 실패',()=>{
  for(const text of ['',policy(context)+policy(context),'<!-- release-metadata -->\n```json\n{broken}\n```'])assert.throws(()=>readReleaseContext(text));
});
test('REL-DOC-03 source/target·공개 tag·서명·배포 정책 불일치 거부',()=>{
  for(const change of [{repository:['example/project']},{releaseTarget:'v4.2.0'},{priorPublishedTag:'v9.0.0'},{tagType:'lightweight'},{distribution:'binary-default'},{published:{...context.published,tag:'v9.0.0'}},{published:{...context.published,url:'https://example.invalid/release'}}])assert(validateReleaseContext({...context,...change},'4.1.1').length>0);
});
test('REL-DOC-04 README 표현 변경·옛 단계명 삭제 허용',()=>{
  assert.deepEqual(validateReadmeMetadata(readme,'4.1.1',context),[]);
  assert.deepEqual(validateReadmeMetadata(readme.replace('![소스](https://img.shields.io/badge/source-4.1.1-blue)','현재 소스 버전: `4.1.1`'),'4.1.1',context),[]);
});
test('REL-DOC-05 틀린 source·target·공개 주장과 필수 링크 누락 거부',()=>{
  for(const text of [readme.replace('source-4.1.1','source-4.0.0'),readme+'\n현재 소스 버전: `4.0.0`',readme+'\n![목표](https://img.shields.io/badge/release%20target-v9.0.0-blue)',readme+'\nLatest published GitHub Release: [v4.1.1](https://github.com/example/project/releases/tag/v4.1.1)',readme.replace('/releases/latest','/release/unknown'),readme.replace('docs/README.md','other.md')])assert(validateReadmeMetadata(text,'4.1.1',context).length>0);
});
test('REL-DOC-06 Git·과거 실행 기록 없는 소스에서도 현행 문서 검사',()=>fixture(({root})=>{
  assert.deepEqual(validateLocalReleaseDocuments(root,context,'4.1.1'),[]);
}));
test('REL-DOC-07 CMake 불일치·현행 문서 누락 실패',()=>fixture(({root,put})=>{
  put('CMakeLists.txt','project(media_server VERSION 4.1.0 LANGUAGES CXX)');
  assert(validateLocalReleaseDocuments(root,context,'4.1.1').some(x=>x.includes('CMake')));
  fs.unlinkSync(path.join(root,context.roadmap));
  assert(validateLocalReleaseDocuments(root,context,'4.1.1').some(x=>x.includes('roadmap')));
}));
test('REL-DOC-08 metadata 문서 경로 이탈·외부 symlink 거부',()=>fixture(({root})=>{
  for(const file of ['../outside.md','/etc/passwd'])assert(validateLocalReleaseDocuments(root,{...context,roadmap:file},'4.1.1').length>0);
  fs.unlinkSync(path.join(root,context.roadmap));fs.symlinkSync('/etc/passwd',path.join(root,context.roadmap));
  assert(validateLocalReleaseDocuments(root,context,'4.1.1').length>0);
}));
test('REL-DOC-09 예제 코드의 metadata 주장은 실제 README가 아님',()=>{
  assert(validateReadmeMetadata('```md\n'+readme+'```\n','4.1.1',context).length>0);
});
test('REL-DOC-10 CLI 소스 archive 실행과 실패 exit·보고서 전파',()=>fixture(({root,put})=>{
  const cli=fileURLToPath(new URL('./verify_release_metadata_consistency.mjs',import.meta.url));
  const report=path.join(root,'result.json');
  const run=()=>spawnSync(process.execPath,[cli,'--root',root,'--json-report',report],{encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr+result.stdout);
  let data=JSON.parse(fs.readFileSync(report));assert.equal(data.publishedEvidence.status,'external-not-checked');
  assert.equal(data.mode,'local-release-metadata');assert.equal(data.github.latestRelease,null);
  put('README.md',readme.replace('source-4.1.1','source-0.0.0'));
  result=run();assert.equal(result.status,1);data=JSON.parse(fs.readFileSync(report));assert.equal(data.status,'fail');
  assert(data.checks.some(x=>x.status==='fail'));assert.equal(data.publishedEvidence.status,'external-not-checked');
}));
test('REL-DOC-11 기존 entry 명령은 같은 판정·실패를 전달',()=>fixture(({root,put})=>{
  for(const [runtime,file] of [['bash','verify_v410_entry_baseline.sh'],[process.execPath,'verify_v400_entry_baseline.mjs'],...['roadmap_contract','user_review_gate','release_readiness'].map(name=>[process.execPath,`verify_v400_${name}.mjs`])]){
    put('CMakeLists.txt','project(media_server VERSION 4.1.1 LANGUAGES CXX)');
    const cli=fileURLToPath(new URL('./'+file,import.meta.url));
    const run=extra=>spawnSync(runtime,[cli,'--root',root,...extra],{encoding:'utf8'});
    let result=run([]);assert.equal(result.status,0,result.stderr+result.stdout);assert(result.stdout.includes('과거 실행 증거가 아닙니다'));
    put('CMakeLists.txt','project(media_server VERSION 4.0.0 LANGUAGES CXX)');
    result=run([]);assert.equal(result.status,1);assert(result.stdout.includes('CMake'));
    for(const extra of [['--unknown'],['--published']])assert.notEqual(run(extra).status,0);
  }
}));
test('REL-DOC-12 root 누락·unknown 옵션·격리 root의 published 모드는 거부',()=>fixture(({root})=>{
  const cli=fileURLToPath(new URL('./verify_release_metadata_consistency.mjs',import.meta.url));
  for(const args of [['--root'],['--unknown'],['--root',root,'--published']]){
    const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
    assert.notEqual(result.status,0);assert(!result.stdout.includes('[pass] GitHub'));
  }
}));
test('REL-DOC-13 과거 사례 입력의 경계 훼손·실행 증거 위장 거부',()=>fixture(({root,put})=>{
  const cli=fileURLToPath(new URL('./verify_release_metadata_consistency.mjs',import.meta.url));
  const source=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/release_metadata_boundary.json'),'utf8'));
  const report=path.join(root,'result.json');
  const variants=[
    {...source,executionEvidence:true},
    {...source,case:{...source.case,sourceVersion:'2.8.0'}},
    {...source,case:{...source.case,context:{...source.case.context,releaseTarget:'v2.8.0'}}},
    {...source,case:{...source.case,roadmapTitle:'근거 없는 대체 계획'}},
  ];
  for(const input of variants){
    put('test/fixtures/release_metadata_boundary.json',JSON.stringify(input));
    const result=spawnSync(process.execPath,[cli,'--root',root,'--json-report',report],{encoding:'utf8'});
    assert.equal(result.status,1,result.stdout+result.stderr);
    const data=JSON.parse(fs.readFileSync(report,'utf8'));
    assert(data.checks.some(item=>item.name.startsWith('historical v2.9')&&item.status==='fail'));
    assert.equal(data.publishedEvidence.status,'external-not-checked');
  }
}));

test('REL-DOC-14 v4.0 승인·완료 기록은 현재 승인/실행 결과나 문서 오류의 대체 근거가 아님',()=>fixture(({root,put})=>{
  for(const name of ['roadmap_contract','user_review_gate','release_readiness']){
    const script=fileURLToPath(new URL(`./verify_v400_${name}.mjs`,import.meta.url));
    const run=extra=>spawnSync(process.execPath,[script,'--root',root,...extra],{encoding:'utf8',timeout:10000});
    put('CMakeLists.txt','project(media_server VERSION 4.1.1 LANGUAGES CXX)');
    let r=run([]);assert.equal(r.status,0,r.stdout+r.stderr);
    assert(r.stdout.includes('승인·출시 가능 판정이 아닙니다'));
    assert(!r.stdout.includes('fresh-executed-pass'));
    assert(!r.stdout.includes('approved-through-recorded-user-goals'));
    for(const file of ['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md'])put(file,'과거 기록: fresh-executed-pass approved-through-recorded-user-goals');
    put('CMakeLists.txt','project(media_server VERSION 0.0.0 LANGUAGES CXX)');
    r=run([]);assert.equal(r.status,1);assert(r.stdout.includes('CMake'));
    for(const args of [['--published'],['--help','--published'],['--root'],['--root',root,'--root',root]])assert.notEqual(run(args).status,0);
    for(const file of ['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md'])fs.unlinkSync(path.join(root,file));
  }
}));

test('REL-POL-01 현행 정책 소비자는 종료 기록·옛 제목 없이 실행하고 계약 누락은 거부',async t=>{
  const cases=[
    ['Actions 현행 문서','verify_actions_security.mjs',null,0,'- failures: 0'],
    ['Actions runner 기준 누락','verify_actions_security.mjs',{path:'docs/release-policy.md',remove:'2.327.1'},1,'2.327.1'],
    ['Actions 쓰기 권한 반례','verify_actions_security.mjs',{path:'.github/workflows/preflight.yml',remove:'contents: read',replace:'contents: write'},1,'write permission'],
    ['Actions warning 차단','verify_actions_security.mjs',null,1,'blocking check-run annotation',['--annotations-json','test/fixtures/actions_annotations/warning-annotation.json']],
    ['Actions notice 허용','verify_actions_security.mjs',null,0,'- blocking annotations: 0',['--annotations-json','test/fixtures/actions_annotations/notice-annotation.json']],
    ['CI 현행 문서','verify_ci_local_gate_parity.mjs',null,0,'- fail: 0'],
    ['CI 실제 명령 누락','verify_ci_local_gate_parity.mjs',{path:'.github/workflows/preflight.yml',remove:'./server.sh verify-actions-security'},1,'preflight workflow missing command'],
    ['v240 현행 문서','verify_v240_release_readiness_gate.mjs',null,0,'- fail: 0'],
    ['v240 실행 대상 동시 오연결','verify_v240_release_readiness_gate.mjs',{path:'server.sh',remove:'verify_release_metadata_consistency.mjs',replace:'verify_docs_links.mjs'},1,'dispatch'],
    ['v250 UI 실행 대상 동시 오연결','verify_v250_owner_release_readiness.mjs',{path:'server.sh',remove:'verify_v250_ops_events_semantic_search_ui.mjs',replace:'verify_v250_owner_release_readiness.mjs'},1,'UI-044'],
    ['v250 현행 문서','verify_v250_owner_release_readiness.mjs',null,0,'- fail: 0'],
    ['v240 UI 정책 변조','verify_v240_release_readiness_gate.mjs',{path:'test/fixtures/ui_fulltest_evidence_policy_v4.json',remove:'"requireCurrentSourceVerification": true',replace:'"requireCurrentSourceVerification": false'},1,'source'],
    ['v250 제품 연결 누락','verify_v250_owner_release_readiness.mjs',{path:'include/ingress/ops_event_route_owner.h',remove:'IsLabEventEvidenceBundleTokenRoute'},1,'route owner header'],
    ['v250 현재 기능 ID 누락','verify_v250_owner_release_readiness.mjs',{path:'docs/project-feature-test-inventory.md',remove:'| OPS-036 |'},1,'OPS-036'],
    ['v250 독립 UI 명령을 readiness로 대체 금지','verify_v250_owner_release_readiness.mjs',{path:'test/fixtures/project_feature_implementation_evidence.json',featureCommand:{id:'UI-044',command:'verify-v250-owner-release-readiness'}},1,'UI-044'],
    ['v250 UI 정의 누락','verify_v250_owner_release_readiness.mjs',{path:'docs/manual-ui-checklist.md',remove:'UI-044'},1,'UI-044'],
    ['closeout 현행 문서','verify_release_closeout_helper.mjs',null,0,'- tag: not created'],
    ['RC 현행 문서','verify_rc_release_gate.mjs',null,0,'- fail: 0'],
    ['reconciliation 현행 문서','verify_post_release_reconciliation.mjs',null,0,'- fail: 0'],
    ['closeout 서명 계약 변조','verify_release_closeout_helper.mjs',{path:'docs/release-policy.md',remove:'signed-annotated',replace:'lightweight'},1,'tag'],
    ['closeout 승인 기준 링크 누락','verify_release_closeout_helper.mjs',{path:'docs/release-policy.md',remove:'../AGENTS.md',replace:'../absent.md'},1,'AGENTS'],
    ['closeout 실제 명령 연결 누락','verify_release_closeout_helper.mjs',{path:'server.sh',remove:'verify_release_closeout_helper.mjs'},1,'dispatch'],
    ['RC 보존 출력 식별자 누락','verify_rc_release_gate.mjs',{path:'docs/stream-verification.md',remove:'SHA256SUMS'},1,'SHA256SUMS'],
    ['RC workflow 누락','verify_rc_release_gate.mjs',{path:'.github/workflows/rc-release-gate.yml',remove:'actions/upload-artifact@v6'},1,'actions/upload-artifact@v6'],
    ['RC 기본 smoke 장시간 혼입','verify_rc_release_gate.mjs',{path:'scripts/internal/test_all.sh',remove:'#!/usr/bin/env bash',replace:'#!/usr/bin/env bash\nverify-va-runtime-console-longrun'},1,'test_all.sh'],
    ['RC 생성 결과 실패 유지','verify_rc_release_gate.mjs',{generatedFailure:true},1,'release checklist missing PASS status'],
    ['RC HTML 관측 보존','verify_rc_release_gate.mjs',{generatedHtmlFailure:true},1,'release checklist HTML missing title'],
    ['RC 자식 실패 출력 보존','verify_rc_release_gate.mjs',{childFailure:true},1,'fixture child failed'],
    ['RC 정리 실패 전파','verify_rc_release_gate.mjs',{cleanupFailure:true},1,'fixture cleanup failure'],
    ['reconciliation 서명 계약 변조','verify_post_release_reconciliation.mjs',{path:'docs/release-policy.md',remove:'signed-annotated',replace:'lightweight'},1,'tag'],
    ['reconciliation UI 판정 연결 누락','verify_post_release_reconciliation.mjs',{path:'docs/manual-ui-fulltest.md',remove:'uiFulltestPass'},1,'uiFulltestPass'],
    ['reconciliation UI 정책 완화','verify_post_release_reconciliation.mjs',{path:'test/fixtures/ui_fulltest_evidence_policy_v4.json',remove:'"requireCurrentSourceVerification": true',replace:'"requireCurrentSourceVerification": false'},1,'source'],
  ];
  for(const [name,script,mutation,exit,reason,args=[]] of cases)await t.test(name,()=>{
    const temporaryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-policy-consumer-'));
    try {
      const r=runPolicyConsumer(script,mutation,temporaryRoot,args);
      assert.equal(r.error,undefined);assert.equal(r.signal,null);
      assert.equal(r.status,exit,r.stdout+r.stderr);
      assert((r.stdout+r.stderr).includes(reason),r.stdout+r.stderr);
      const remaining=fs.readdirSync(temporaryRoot);
      if(mutation?.cleanupFailure)assert(remaining.length>0,'의도한 정리 실패의 자료 유지');
      else assert.equal(remaining.length,0,'검증기 소유 임시 파일 정리: '+remaining.join(','));
      if(mutation?.cleanupFailure)assert(r.stdout.includes('- not-run: 4'),'정리 실패 후 나머지 검사 미실행');
      if(mutation?.generatedFailure){
        const row=r.stdout.split('\n').find(line=>line.startsWith('{"kind":"rc-fixture-failure"'));
        const data=JSON.parse(row);
        assert(data.files.some(item=>item.path==='release-checklist.md'&&item.observed.text.includes('overall: FAIL')),'실패 관측값 정리 전 보존');
        assert(data.files.every(item=>/^[a-f0-9]{64}$/.test(item.sha256)));
        assert.equal(data.children[0].exit,0,'자식 성공 이후 assertion 실패 구분');
      }
      if(mutation?.generatedHtmlFailure||mutation?.childFailure){
        const row=r.stdout.split('\n').find(line=>line.startsWith('{"kind":"rc-fixture-failure"'));
        const data=JSON.parse(row);
        if(mutation.generatedHtmlFailure)assert(data.files.some(item=>item.path==='release-checklist.html'&&item.observed.text.includes('broken fixture heading')));
        else {
          assert.equal(data.children[0].exit,17);
          assert.equal(data.children[0].stdout.text,'partial fixture output');
          assert.equal(data.children[0].stderr.text,'fixture-child-failed');
        }
      }
    } finally {fs.rmSync(temporaryRoot,{recursive:true,force:true});}
  });
});

test('REL-POL-02 선택 과거 기록의 확인/미확인/미실행 형식만 검사하며 실제 PASS로 승격하지 않음',()=>{
  const temporaryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-policy-history-'));
  const file=path.join(temporaryRoot,'history.md');
  try {
    for(const [text,exit] of [['확인됨: 도구 검사\n미확인: 공개 상태\n미실행: 제품 테스트\n',0],['확인됨: PASS\n',1]]){
      fs.writeFileSync(file,text);
      const r=runPolicyConsumer('verify_post_release_reconciliation.mjs',null,temporaryRoot,['--history',file]);
      assert.equal(r.status,exit,r.stdout+r.stderr);
      assert(r.stdout.includes('실제 릴리즈·UI·장시간 실행 결과가 아닙니다'));
    }
  } finally {fs.rmSync(temporaryRoot,{recursive:true,force:true});}
});
