// 파일 용도: 문서 표현과 릴리즈 사실 검증을 분리하는 격리 자체검사. 제품 실행 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readReleaseContext, validateReleaseContext, validateReadmeMetadata, validateLocalReleaseDocuments} from './release_documentation_contract.mjs';

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
