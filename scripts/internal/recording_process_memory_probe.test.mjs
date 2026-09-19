import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseSummary,combinedPhaseSummary,expectedStages,validateMemoryStages} from './recording_memory_phase.mjs';
import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const good={phase:'fixture',platform:'darwin',code:0,signal:null,timeText:'123456 maximum resident set size\n'};
const stageText=()=>expectedStages.map(([stage,sources],i)=>'[memory] '+JSON.stringify({stage,sources,currentRssBytes:100,peakRssBytes:200+i,unit:'bytes',peakScope:'process-lifetime'})).join('\n')+'\n';
test('LP16-M02 정상 macOS compiler/fixture RSS 분리',()=>{
 for(const phase of ['compiler','fixture']){
  const result=phaseSummary({phase,platform:'darwin',code:0,signal:null,timeText:' 123456 maximum resident set size\n'});
  assert.equal(result.status,'complete');assert.equal(result.peakRssBytes,123456);
 }
});
for(const [name,timeText] of [['누락',''],['중복',good.timeText.repeat(2)],['음수','-1 maximum resident set size'],['비숫자','secret-canary maximum resident set size'],['overflow','9007199254740992 maximum resident set size']])test(`LP16-M02 time ${name} 거부`,()=>{const r=phaseSummary({...good,timeText});assert.equal(r.status,'unknown');assert.equal(r.peakRssBytes,null);assert(!JSON.stringify(r).includes('canary'));});
test('LP16-M02 fixture cap과compiler 측정 분리',()=>{const timeText='536870913 maximum resident set size';assert.equal(phaseSummary({...good,timeText}).pass,false);assert.equal(phaseSummary({...good,timeText,phase:'compiler'}).pass,true);assert.equal(phaseSummary({...good,timeText:'536870912 maximum resident set size'}).pass,true);});
test('LP16-M02 platform·phase·signal·exit 거부와관측보존',()=>{for(const change of [{platform:'linux'},{phase:'secret-canary'},{signal:'SIGKILL',code:null},{code:7}]){const r=phaseSummary({...good,...change});assert.equal(r.pass,false);assert(!JSON.stringify(r).includes('canary'));}assert.equal(phaseSummary({...good,code:7}).exitCode,7);});
test('LP16-M01 고정28stage 전수·누락·순서·추가필드·불완전값',()=>{const text=stageText();assert(validateMemoryStages(text));assert(!validateMemoryStages(text.split('\n').slice(1).join('\n')));assert(!validateMemoryStages(text+text));assert(!validateMemoryStages(text.replace('"stage":0','"stage":1')));assert(!validateMemoryStages(text.replace('"unit":"bytes"','"extra":1,"unit":"bytes"')));assert(!validateMemoryStages(text.replace('"currentRssBytes":100','"currentRssBytes":0')));assert(!validateMemoryStages(text+'[memory-error] code=unavailable'));assert(!validateMemoryStages(text.replace('"peakRssBytes":227','"peakRssBytes":100')));});
test('LP16-M02 self/time peak 큰값으로cap판정·불일치허용',()=>{
 const above=stageText().replace(/"peakRssBytes":\d+/g,'"peakRssBytes":536870913');
 const r=combinedPhaseSummary(good,above);assert.equal(r.status,'failed');assert.equal(r.selfPeakRssBytes,536870913);assert.equal(r.peakRssBytes,123456);assert.equal(r.effectivePeakRssBytes,536870913);assert.equal(r.pass,false);
 const exact=stageText().replace(/"peakRssBytes":\d+/g,'"peakRssBytes":536870912');assert(combinedPhaseSummary(good,exact).pass);
 assert(!combinedPhaseSummary({...good,timeText:'536870913 maximum resident set size'},stageText()).pass);
 assert(combinedPhaseSummary(good,stageText().replace(/"currentRssBytes":100/g,'"currentRssBytes":999')).pass);
});
test('LP16-M01 실제 C++ macOS 자기RSS·오류경계8개',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-memory-selftest.'));fs.chmodSync(root,0o700);
 try{
  const binary=path.join(root,'check');execFileSync(process.env.CXX||'c++',['-std=c++17','-Wall','-Wextra','-Werror','-I',here,path.join(here,'recording_process_memory_probe_smoke.cpp'),'-o',binary],{stdio:'pipe'});
  const output=execFileSync(binary,[],{encoding:'utf8'});console.log(output.trimEnd());assert.equal(output.split('\n').filter(x=>x.startsWith('[pass]')).length,8);
 }finally{const binary=path.join(root,'check'),bytes=fs.existsSync(binary)?fs.statSync(binary).size:0;fs.rmSync(root,{recursive:true});console.log('[cleanup] '+JSON.stringify({root,binaryBytes:bytes,removed:!fs.existsSync(root)}));assert(!fs.existsSync(root));}
});
for(const code of [0,7])test(`LP16-M02 소유Node자식 exit${code}·분리time 관측`,()=>{
 const child=spawnSync(process.execPath,[path.join(here,'recording_memory_phase.mjs'),'fixture',process.execPath,'-e',`process.stdout.write(${JSON.stringify(stageText())});process.exit(${code});`],{encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024});
 console.log(child.stdout.trimEnd());assert.equal(child.status,code);assert.equal(child.signal,null);const line=child.stdout.split('\n').find(x=>x.startsWith('[memory-phase] '));assert(line);const row=JSON.parse(line.slice(15));assert.equal(row.exitCode,code);assert.equal(row.stagesValid,true);assert(row.peakRssBytes>0);assert.equal(row.pass,code===0);
});
test('LP16-M02 exit0이어도stage미확보는unknown',()=>{const child=spawnSync(process.execPath,[path.join(here,'recording_memory_phase.mjs'),'fixture',process.execPath,'-e','process.exit(0)'],{encoding:'utf8',timeout:10000});console.log(child.stdout.trimEnd());assert.equal(child.status,2);assert(child.stdout.includes('"status":"unknown"'));});
