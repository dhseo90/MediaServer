import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {limits,observations,classify,processGroup,cleanupOwned,manifest,runBounded,liveTreeBytes,treeBytes} from './recording_catalog_comparison_guard.mjs';

const expected={mode:'reopen',arm:'A',samples:32,count:2};
const line=v=>'[lp17] '+JSON.stringify(v)+'\n';
const memory={kind:'memory',stage:'after-commit',sources:2,currentRssBytes:600000000,peakRssBytes:650000000};
const summary={kind:'summary',...expected,pass:10,fail:0};
const text=()=>['reopen_before','reopen_after','reopen_verified','reopen_released'].map(stage=>line({...memory,stage})).join('')+line({kind:'owner',owner:'live',stage:'after-commit',samples:64})+line(summary);
const input=()=>({stdout:text(),stderr:'650000000 maximum resident set size\n',code:0,signal:null,stopReason:null,groupClean:true,expected});
const root=()=>{const p=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-catalog-cost.'));fs.chmodSync(p,0o700);return p;};
function finish(p){const result=cleanupOwned(p);console.log('[selftest-cleanup] '+JSON.stringify(result));assert(result.removed);}

test('LP20-C04 임시 파일 삭제 경쟁은 동일 root의 전체 관측으로 재확인',()=>{
 const p=root();try{fs.writeFileSync(path.join(p,'kept'),'12345',{flag:'wx'});let calls=0;
  assert.equal(liveTreeBytes(p,()=>{if(++calls===1)throw Object.assign(Error(),{code:'ENOENT'});return treeBytes(p);}),5);
  assert.equal(calls,2);assert.equal(liveTreeBytes(p),5);
 }finally{finish(p);}
});
test('LP20-C04 반복 관측 실패·권한 실패·root 교체는 계속 거부',()=>{
 const p=root();try{for(const code of ['ENOENT','EACCES']){let calls=0;
  assert.throws(()=>liveTreeBytes(p,()=>{++calls;throw Object.assign(Error(),{code});}));assert.equal(calls,code==='ENOENT'?2:1);}
  const moved=p+'-moved';try{assert.throws(()=>liveTreeBytes(p,()=>{fs.renameSync(p,moved);fs.mkdirSync(p);throw Object.assign(Error(),{code:'ENOENT'});}));}
  finally{fs.rmdirSync(p);fs.renameSync(moved,p);}
 }finally{finish(p);}
});

const ownerColumns='records samples fileSamples mappings stringBytes stringCapacity vectorCapacityBytes jobs segments bindings tombstones accessUnits uniqueEnvelopes sharedEnvelopeReferences logicalEnvelopeBytes uniqueBindingObjects sharedBindingReferences logicalBindingSamples uniqueJobObjects sharedJobReferences logicalLinkCount logicalEnvelopeChargeBytes weakLinkCount residentFallbackLinkCount coldEnvelopes residentBindings coldBindings residentJobs coldJobs entryStorageBytes locationStorageBytes'.split(' ');
const packed=()=>({kind:'owner-packed',version:1,stage:'after-commit',owner:'live',values:ownerColumns.map((_,i)=>i===30?Number.MAX_SAFE_INTEGER:i)});
const withOwner=row=>text().replace(line({kind:'owner',owner:'live',stage:'after-commit',samples:64}),line(row));
test('LP19-H01 계측 손실 없는 왕복',()=>{
 const p=packed(),r=observations(withOwner(p),expected);
 assert(r.valid);assert.deepEqual(r.owners,[{kind:'owner',stage:p.stage,owner:p.owner,...Object.fromEntries(ownerColumns.map((k,i)=>[k,p.values[i]]))}]);
 assert(observations(text(),expected).valid);
 const cpp=fs.readFileSync(new URL('./recording_catalog_comparison_ownership.h',import.meta.url),'utf8');
 const emit=cpp.slice(cpp.indexOf('inline void Emit('),cpp.indexOf('// 정의는 복제 journal.cpp'));
 assert.deepEqual([...emit.matchAll(/n\.([A-Za-z]+)/g)].map(m=>m[1]),ownerColumns);
 assert.match(emit,/owner-packed/);
});
test('LP19-H02 잘못된 축약 표현 거부',()=>{
 const p=packed();
 // 잘못된 packed가 정상 owner 옆에 있어도 무시되어서는 안 된다.
 for(const row of [{...p,version:2},{...p,version:undefined},{...p,values:p.values.slice(1)},
  {...p,values:[...p.values,0]},{...p,records:0},{...p,unknown:0},{...p,owner:'unknown'},
  {...p,stage:'bad stage'},{...p,kind:'owner',values:p.values},
  ...[-1,0.5,Number.MAX_SAFE_INTEGER+1,null,'1'].map(v=>({...p,values:[v,...p.values.slice(1)]}))])
  assert(!observations(text()+line(row),expected).valid);
});

test('LP17-H01 기존 RSS 실패와 유효 진단 분리',()=>{
 const r=classify(input());assert.equal(r.historicalRssPass,false);assert.equal(r.diagnosticPass,true);
 assert.equal(r.semanticPass,true);assert.equal(r.observationValid,true);
});
test('LP17-H02 관측 누락·손상·역행·잘못된 owner 거부',()=>{
 for(const value of [0,-1,9007199254740992])assert(!observations(text().replace('"peakRssBytes":650000000',`"peakRssBytes":${value}`),expected).valid);
 assert(!observations(text().replace('"currentRssBytes":600000000','"currentRssBytes":0'),expected).valid);
 assert(!observations(text()+line({...memory,peakRssBytes:10}),expected).valid);
 assert(!observations(text()+'[lp17] {bad\n',expected).valid);
 assert(!observations(text().replace('"owner":"live"','"owner":"unregistered"'),expected).valid);
 assert(!observations(text().replace('"samples":64','"samples":-1'),expected).valid);
 assert(!observations(text().replace(line({...memory,stage:'reopen_after'}),''),expected).valid);
 assert(!classify({...input(),stderr:''}).diagnosticPass);
});
test('LP17-H03 완료 summary 누락·중복·다른 작업·실패 거부',()=>{
 assert(!observations(text().replace(line(summary),''),expected).valid);
 assert(!observations(text()+line(summary),expected).valid);
 for(const change of [{mode:'job'},{arm:'B'},{samples:4096},{count:32},{fail:1},{pass:0}])
  assert(!observations(text().replace(line(summary),line({...summary,...change})),expected).valid);
});
test('LP17-H04 process group 단위와 외부·zombie 제외',()=>{
 assert.deepEqual(processGroup(' 11 11 100 S\n12 11 50 R+\n13 11 80 Z\n14 99 123 S',11),{pids:[11,12],rssBytes:153600});
 assert.throws(()=>processGroup('malformed',11));assert.throws(()=>processGroup('',11));
 assert.throws(()=>processGroup('11 11 9007199254740992 S',11));
 assert.deepEqual(processGroup('11 11 10 ?\n12 -1 - ?\n13 99 - ?',11),{pids:[11],rssBytes:10240});
 assert.throws(()=>processGroup('11 11 - ?',11));
});
test('LP17-H05 실행 안전 상한·기능 실패·정리 실패 분리',()=>{
 for(const stopReason of ['rss-safety-cap','disk-cap','output-cap','timeout','resource-observation'])assert(!classify({...input(),stopReason}).diagnosticPass);
 assert(!classify({...input(),groupClean:false}).diagnosticPass);
 assert(!classify({...input(),code:7}).diagnosticPass);
 assert(!classify({...input(),signal:'SIGTERM'}).diagnosticPass);
 assert.equal(classify({...input(),stderr:(limits.rss+1)+' maximum resident set size'}).stopReason,'rss-safety-cap');
});
test('LP17-H06 실제 소유 자식 exit0/7와 그룹 종료 확인',async()=>{
 const p=root();try{for(const code of [0,7]){const r=await runBounded({root:p,command:process.execPath,args:['-e',`process.exit(${code})`],seconds:5});
  assert.equal(r.code,code);assert.equal(r.stopReason,null);assert(r.groupClean);assert.match(r.stderr,/maximum resident set size/);}}
 finally{finish(p);}
});
test('LP17-H07 실제 timeout 자식 종료와 뒤 단계 차단',async()=>{
 const p=root();try{const r=await runBounded({root:p,command:process.execPath,args:['-e','setInterval(()=>{},100)'],seconds:0.1});
  assert.equal(r.stopReason,'timeout');assert(r.groupClean);assert(!classify({...input(),...r}).diagnosticPass);}
 finally{finish(p);}
});
test('LP17-H08 출력 초과 종료와 보존량 상한',async()=>{
 const p=root();try{const r=await runBounded({root:p,command:process.execPath,args:['-e','process.stdout.write("x".repeat(100000));setInterval(()=>{},100)'],outputCap:1024,seconds:5});
  assert.equal(r.stopReason,'output-cap');assert(Buffer.byteLength(r.stdout+r.stderr)<=1024);assert(r.groupClean);}
 finally{finish(p);}
});
test('LP17-H09 정리 소유권·symlink target 보존',()=>{
 const p=root(),outside=root();try{
  fs.writeFileSync(path.join(outside,'keep'),'unchanged',{flag:'wx'});fs.symlinkSync(outside,path.join(p,'link'));
  assert.throws(()=>cleanupOwned(p,path.dirname(path.dirname(p))));
  finish(p);assert.equal(fs.readFileSync(path.join(outside,'keep'),'utf8'),'unchanged');
 }finally{if(fs.existsSync(p))finish(p);finish(outside);}
});
test('LP17-H10 입력 manifest 변조와 symlink 거부',()=>{
 const p=root();try{const f=path.join(p,'seed');fs.writeFileSync(f,'original',{flag:'wx'});const before=manifest(p);
  assert.equal(before,manifest(p));fs.writeFileSync(f,'changed');assert.notEqual(before,manifest(p));
  fs.symlinkSync(f,path.join(p,'alias'));assert.throws(()=>manifest(p));}
 finally{finish(p);}
});
test('LP17-H11 자식만 남긴 종료를 정상 완료로 오인하지 않음',async()=>{
 const p=root();try{const r=await runBounded({root:p,command:process.execPath,args:['-e',
  'require("node:child_process").spawn(process.execPath,["-e","setInterval(()=>{},100)"],{stdio:"ignore"}).unref();'],seconds:5});
  assert.equal(r.stopReason,'child-remains');assert(r.groupClean);assert(!classify({...input(),...r}).diagnosticPass);}
 finally{finish(p);}
});
