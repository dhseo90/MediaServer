// 파일 용도: 버전 진입 문서 검증기의 정상·오류·경계 검사. 제품 실행 증거가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEntryInputs,validateBoundaryCase,semverAtLeast,parseEntryRoot} from './entry_baseline_documentation.mjs';

const sample=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/entry_baseline_cases.json',import.meta.url)));
const sourceVersion='4.1.1';
const context={schema:'media-server.release-context.v1',repository:'example/project',releaseTarget:'v4.1.1',priorPublishedTag:'v4.1.0',releaseNotes:'docs/release-notes.md',roadmap:'docs/roadmap.md',distribution:'source-only',tagType:'signed-annotated',published:{tag:'v4.1.0',url:'https://github.com/example/project/releases/tag/v4.1.0',observedAt:'2000-01-01T00:00:00Z'}};
const readme='![source](https://img.shields.io/badge/source-4.1.1-blue)\n[Latest](https://github.com/example/project/releases/latest)\n[문서](docs/README.md)\n';
function fixture(run){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-entry-docs-'));
  const put=(file,data)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof data==='string'?data:JSON.stringify(data));};
  try{
    put('VERSION',sourceVersion);put('CMakeLists.txt','project(media_server VERSION 4.1.1 LANGUAGES CXX)');
    put('README.md',readme);put('README.en.md',readme);put('docs/README.md','# 분야별 문서');
    put('docs/release-policy.md','<!-- release-metadata -->\n```json\n'+JSON.stringify(context)+'\n```\n');
    put(context.roadmap,'# 미래 계획');put(context.releaseNotes,'# 변경 사항');
    put('server.sh',sample.cases.map(c=>'\n  '+c.command+')\n    exec verify_'+c.command.slice(7).replaceAll('-','_')+'.mjs\n    ;;\n').join(''));
    put('docs/project-feature-test-inventory.md',sample.cases.flatMap(c=>c.featureIds.map(id=>`| ${id} | ${c.command} | 테스트 정의 |`)).join('\n'));
    put('test/fixtures/project_feature_implementation_evidence.json',{items:sample.cases.flatMap(c=>c.featureIds.map(id=>({id,verifierEvidence:{command:c.command}})))});
    put('test/fixtures/entry_baseline_cases.json',sample);return run({root,put});
  }finally{fs.rmSync(root,{recursive:true,force:true});assert(!fs.existsSync(root));}
}
function cli(c,root,args=[]){return spawnSync(process.execPath,[fileURLToPath(new URL('./verify_'+c.command.slice(7).replaceAll('-','_')+'.mjs',import.meta.url)),'--root',root,...args],{encoding:'utf8'});}

test('ENTRY-DOC-01 과거 실행 기록·Git 없이 현행 문서와 다섯 회귀 입력 연결',()=>fixture(({root})=>{
  for(const c of sample.cases){const x=loadEntryInputs(root,c.command);assert.deepEqual(x.errors,[]);assert.deepEqual(validateBoundaryCase(x.fixture,x.baseline,c),[]);}
}));
test('ENTRY-DOC-02 버전 순서와 잘못된 버전 거부',()=>{
  assert(semverAtLeast('4.1.1','3.8.0'));assert(semverAtLeast('3.8.0','3.8.0'));
  for(const current of ['3.7.9','bad','03.8.0','3.8'])assert(!semverAtLeast(current,'3.8.0'));
});
test('ENTRY-DOC-03 과거 source·published·roadmap·ID 변조 거부',()=>{
  for(const c of sample.cases)for(const patch of [{sourceVersion:'0.0.0'},{publishedTag:'v0.0.0'},{roadmap:'다른 계획'},{featureIds:[]},{command:'unknown'}])assert(validateBoundaryCase(sample,{...c,...patch},c).length>0);
});
test('ENTRY-DOC-04 과거 PASS를 현재 실행 증거로 사용하거나 출처 제거하면 거부',()=>{
  const c=sample.cases[0];assert(validateBoundaryCase({...sample,executionEvidence:true},c,c).length>0);
  assert(validateBoundaryCase({...sample,provenance:{}},c,c).length>0);
  for(const key of Object.keys(c.claims))assert(validateBoundaryCase(sample,{...c,claims:{...c.claims,[key]:'PASS'}},c).length>0);
});
test('ENTRY-DOC-05 source/CMake·문서 링크 오류와 현행 문서 누락 유지',()=>fixture(({root,put})=>{
  put('CMakeLists.txt','project(media_server VERSION 4.1.0 LANGUAGES CXX)');assert(loadEntryInputs(root,sample.cases[0].command).errors.length>0);
  put('README.md',readme.replace('/releases/latest','/other'));assert(loadEntryInputs(root,sample.cases[0].command).errors.some(x=>x.includes('Latest')));
  fs.unlinkSync(path.join(root,context.roadmap));assert(loadEntryInputs(root,sample.cases[0].command).errors.some(x=>x.includes('roadmap')));
}));
test('ENTRY-DOC-06 다른 branch에만 있는 dispatch·누락/중복 ID·명령 불일치 거부',()=>fixture(({root,put})=>{
  const c=sample.cases[0];put('server.sh','\n  '+c.command+')\n ;;\n exec verify_v340_entry_baseline.mjs');assert(loadEntryInputs(root,c.command).errors.some(x=>x.includes('dispatch')));
  put('docs/project-feature-test-inventory.md',`| ${c.featureIds[0]} | ${c.command} |\n| ${c.featureIds[0]} | ${c.command} |`);assert(loadEntryInputs(root,c.command).errors.some(x=>x.includes('테스트 정의')));
  put('test/fixtures/project_feature_implementation_evidence.json',{items:c.featureIds.map(id=>({id,verifierEvidence:{command:'wrong'}}))});assert(loadEntryInputs(root,c.command).errors.some(x=>x.includes('실행 명령')));
}));
test('ENTRY-DOC-07 회귀 입력 누락/중복·외부 symlink 거부',()=>fixture(({root,put})=>{
  const c=sample.cases[0];put('test/fixtures/entry_baseline_cases.json',{...sample,cases:[]});assert.throws(()=>loadEntryInputs(root,c.command));
  put('test/fixtures/entry_baseline_cases.json',{...sample,cases:[c,c]});assert.throws(()=>loadEntryInputs(root,c.command));
  const target=path.join(root,'test/fixtures/entry_baseline_cases.json');fs.unlinkSync(target);fs.symlinkSync('/etc/passwd',target);assert.throws(()=>loadEntryInputs(root,c.command),/경로 이탈/);
}));
test('ENTRY-DOC-08 기존 CLI 다섯 개를 종료 기록 없는 소스에서 실행',()=>fixture(({root})=>{
  for(const c of sample.cases){const r=cli(c,root);assert.equal(r.status,0,r.stdout+r.stderr);assert(r.stdout.includes('- fail: 0'));assert(r.stdout.includes('- featureImplementation: not-run-by-this-command'));assert(r.stdout.includes('- uiFulltest: not-run-by-this-command'));}
}));
test('ENTRY-DOC-09 CLI 실제 실패 exit와 옵션 오류 전파',()=>fixture(({root,put})=>{
  put('CMakeLists.txt','project(media_server VERSION 0.0.0 LANGUAGES CXX)');
  for(const c of sample.cases){const r=cli(c,root);assert.equal(r.status,1);assert(r.stdout.includes('[fail]'));assert.notEqual(cli(c,root,['--published']).status,0);}
  assert.throws(()=>parseEntryRoot(['--root'],'/'));assert.throws(()=>parseEntryRoot(['--root','--published'],'/'));
}));
test('ENTRY-DOC-10 CLI 회귀 fixture 변조·실행 승격 거부',()=>fixture(({root,put})=>{
  for(const c of sample.cases){put('test/fixtures/entry_baseline_cases.json',{...sample,executionEvidence:true});assert.equal(cli(c,root).status,1);}
}));
