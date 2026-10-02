// 파일 용도: actual-app live 재측정의 경합·상한·소유 반례와 무결성 경계를 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {scanCurrentAppTree,measureCurrentAppBudget} from './recording_current_app_scan.mjs';

function fixture(t){
  const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'media-server-current-scan-'));
  fs.chmodSync(root,0o700);const identity=fs.lstatSync(root,{bigint:true});
  t.after(()=>{assert(!fs.lstatSync(root).isSymbolicLink());fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));});
  const write=(name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);return file;};
  return {root,identity,write};
}
const missing=()=>Object.assign(Error('injected-listed-entry-missing'),{code:'ENOENT'});
function disappearOnce(file,change=()=>{}){
  let calls=0;
  return {io:{...fs,lstatSync:(name,options)=>{
    if(name===file&&calls++===0){change();fs.unlinkSync(file);}
    return fs.lstatSync(name,options);
  }},calls:()=>calls};
}
test('live 고정 tree는 기존 순회의 bytes/entries/files와 동일',t=>{
  const {root,identity,write}=fixture(t);write('recordings/snapshot-1.jsonl','abc');write('events/event.jsonl','event');
  const report=[];assert.deepEqual(measureCurrentAppBudget(root,identity,{report:x=>report.push(x)}),scanCurrentAppTree(root,root));
  assert.deepEqual(report,[{attempts:1,retries:0,outcome:'pass'}]);
});
test('퇴역 snapshot 경합은 부분 합계와 목록을 버리고 새 전체 측정',t=>{
  const {root,identity,write}=fixture(t);write('recordings/a-first','first-pass-is-long');const old=write('recordings/snapshot-1.jsonl','old');
  const injected=disappearOnce(old,()=>{write('recordings/a-first','a');write('recordings/snapshot-2.jsonl','fresh');});const report=[];
  const result=measureCurrentAppBudget(root,identity,{io:injected.io,report:x=>report.push(x)});
  assert.deepEqual(result,{bytes:6,entries:3,files:[{path:'recordings/a-first',bytes:1},{path:'recordings/snapshot-2.jsonl',bytes:5}],transientJournalMisses:0});
  assert.deepEqual(report,[{attempts:2,retries:1,outcome:'pass'}]);assert.equal(injected.calls(),1);
});
test('재측정에서 새 파일의 상한 초과도 실패',t=>{
  const {root,identity,write}=fixture(t),old=write('snapshot-1.jsonl','old');const injected=disappearOnce(old,()=>write('snapshot-2.jsonl','new'));
  const io={...injected.io,lstatSync:(name,options)=>{const s=injected.io.lstatSync(name,options);if(name.endsWith('snapshot-2.jsonl'))s.size=512*1024*1024+1;return s;}};
  const report=[];assert.throws(()=>measureCurrentAppBudget(root,identity,{io,report:x=>report.push(x)}),/root-byte-cap/);
  assert.deepEqual(report,[{attempts:2,retries:1,outcome:'fail'}]);
});
test('연속 ENOENT는 최초+추가2회에서 종료',t=>{
  const {root,identity,write}=fixture(t),file=write('snapshot-1.jsonl','abc');let lists=0,stats=0;const report=[];
  const io={...fs,readdirSync:p=>{lists++;return fs.readdirSync(p);},lstatSync:(p,o)=>{if(p===file){stats++;throw missing();}return fs.lstatSync(p,o);}};
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io,report:x=>report.push(x)}),/root-live-scan-retry-exhausted/);
  assert.equal(lists,3);assert.equal(stats,3);assert.deepEqual(report,[{attempts:3,retries:2,outcome:'fail'}]);
});
for(const code of ['EACCES','ENOTDIR','ELOOP'])test(`live ${code}는 재시도하지 않고 실패`,t=>{
  const {root,identity,write}=fixture(t),file=write('snapshot-1.jsonl','abc');let calls=0;
  const io={...fs,lstatSync:(p,o)=>{if(p===file){calls++;throw Object.assign(Error(code),{code});}return fs.lstatSync(p,o);}};
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io}),e=>e.code===code);assert.equal(calls,1);
});
test('root 부재는 목록화 항목 경합으로 재시도하지 않음',t=>{
  const {root,identity}=fixture(t);let calls=0;
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io:{...fs,lstatSync:()=>{calls++;throw missing();}}}),e=>e.code==='ENOENT');assert.equal(calls,1);
});
for(const change of ['ino','uid','mode','canonical'])test(`경합 뒤 root ${change} 변화는 거부`,t=>{
  const {root,identity,write}=fixture(t),file=write('snapshot-1.jsonl','abc');let changed=false,listed=0;
  const io={...fs,readdirSync:p=>{listed++;return fs.readdirSync(p);},realpathSync:p=>changed&&change==='canonical'?root+'-other':fs.realpathSync(p),lstatSync:(p,o)=>{
    if(p===file){changed=true;throw missing();}const s=fs.lstatSync(p,o);
    if(changed&&p===root){if(change==='ino'||change==='uid')s[change]+=1n;if(change==='mode')s.mode=0o40755n;}
    return s;
  }};
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io}),/live-scan-root-binding/);assert.equal(listed,1);
});
test('하위 디렉터리의 symlink 교체와 목록 경로 이탈은 거부',t=>{
  const {root,identity,write}=fixture(t);write('recordings/a','a');
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io:{...fs,realpathSync:p=>p===path.join(root,'recordings')?'/outside':fs.realpathSync(p)}}),/live-scan-directory-path/);
  for(const name of ['../outside','/outside','.','a/b'])assert.throws(()=>measureCurrentAppBudget(root,identity,{io:{...fs,readdirSync:()=>[name]}}),/live-scan-entry-path/);
});
test('기존 cache symlink는 링크 크기만 세고 대상은 읽지 않음',t=>{
  const {root,identity}=fixture(t),link=path.join(root,'cache-link');fs.symlinkSync('/unavailable-external-target',link);
  const result=measureCurrentAppBudget(root,identity);assert.equal(result.bytes,fs.lstatSync(link).size);assert.equal(result.entries,1);assert.deepEqual(result.files,[]);
  assert.throws(()=>scanCurrentAppTree(root,root,{strict:true}),/archive-symlink/);
});
test('안전하지 않은 파일 형식은 재시도 없이 거부',t=>{
  const {root,identity,write}=fixture(t),file=write('special','abc');
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io:{...fs,lstatSync:(p,o)=>{const s=fs.lstatSync(p,o);if(p===file)s.isFile=()=>false;return s;}}}),/archive-not-regular-single-link/);
});
test('512MiB와 4096개 경계의 기존 초과 조건 유지',t=>{
  const {root,identity,write}=fixture(t),file=write('unit','x'),s=fs.lstatSync(file);
  const sizeIo={...fs,lstatSync:(p,o)=>p===root?fs.lstatSync(p,o):{...s,size:512*1024*1024}};
  // Stats의 형식 판별 메서드를 유지하는 주입이다.
  sizeIo.lstatSync=(p,o)=>{const v=fs.lstatSync(p,o);if(p===file)v.size=512*1024*1024;return v;};
  assert.equal(measureCurrentAppBudget(root,identity,{io:sizeIo}).bytes,512*1024*1024);
  let count=4096;const entryIo={...fs,readdirSync:()=>Array.from({length:count},(_,i)=>String(i)),lstatSync:(p,o)=>p===root?fs.lstatSync(p,o):s};
  assert.equal(measureCurrentAppBudget(root,identity,{io:entryIo}).entries,4096);count++;
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io:entryIo}),/root-entry-cap/);
});
for(const reason of ['actual-app-cancelled','actual-app-deadline','app-log-cap'])test(`재측정 중 ${reason} 보호 유지`,t=>{
  const {root,identity,write}=fixture(t),file=write('snapshot-1.jsonl','abc');let missingSeen=false;
  const io={...fs,lstatSync:(p,o)=>{if(p===file){missingSeen=true;throw missing();}return fs.lstatSync(p,o);}};
  assert.throws(()=>measureCurrentAppBudget(root,identity,{io,guard:()=>{if(missingSeen)throw Error(reason);}}),new RegExp(reason));
});
for(const options of [{strict:true},{hash:true},{strict:true,hash:true}])test(`archive ${JSON.stringify(options)} 누락은 재시도 없음`,t=>{
  const {root,write}=fixture(t),file=write('snapshot-1.jsonl','abc');let calls=0;
  const io={...fs,lstatSync:(p,o)=>{if(p===file){calls++;throw missing();}return fs.lstatSync(p,o);}};
  assert.throws(()=>scanCurrentAppTree(root,root,options,io),e=>e.code==='ENOENT');assert.equal(calls,1);
});
test('archive 동일 크기 hash 변조와 필수 파일 삭제는 기존 copy 대조에서 불일치',t=>{
  const {root,write}=fixture(t),file=write('snapshot-1.jsonl','abc');const before=scanCurrentAppTree(root,root,{strict:true,hash:true});
  write('snapshot-1.jsonl','abd');assert.notDeepEqual(scanCurrentAppTree(root,root,{strict:true,hash:true}),before);
  fs.unlinkSync(file);assert.notDeepEqual(scanCurrentAppTree(root,root,{strict:true,hash:true}),before);
});
test('live 측정 성공은 현재 manifest의 필수 snapshot 누락·손상을 승인하지 않음',t=>{
  const {root,identity,write}=fixture(t),repo=path.resolve(import.meta.dirname,'../..'),store=path.join(root,'recordings');fs.mkdirSync(store);
  // 기존 제품 manifest Open 선검사를 작은 소유 대역에서 호출한다. catalog 전체 PASS를 대신하지 않는다.
  const source=write('manifest-probe.cpp',`#include "recording/recording_generation_manifest.h"
#include <fstream>
#include <string>
int main(int argc,char** argv){
 if(argc!=3)return 2;const std::filesystem::path root(argv[1]);std::string error;
 if(std::string(argv[2])=="init"){
  const std::string hash="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  recording::RecordingGenerationManifest m;m.store_id="live-budget-test";m.generation=1;m.cut_ordinal=1;
  m.snapshot={"snapshot-1.jsonl",3,hash};m.active={"active-1.jsonl",3,hash};
  std::ofstream(root/m.snapshot.name)<<"abc";std::ofstream(root/m.active.name)<<"abc";
  if(recording::PublishRecordingGenerationManifest(root,m,&error)!=recording::RecordingGenerationPublishResult::Published)return 3;
 }
 recording::RecordingGenerationReadResult result;
 return recording::ReadRecordingGenerationManifestForOpen(root,&result,&error)?0:1;
}
`);
  const flags=execFileSync('pkg-config',['--cflags','--libs','openssl'],{encoding:'utf8'}).trim().split(/\s+/),binary=path.join(root,'manifest-probe');
  execFileSync('c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_OPENSSL=1','-I'+path.join(repo,'include'),source,path.join(repo,'src/domain/strict_json.cpp'),path.join(repo,'src/recording/recording_generation_manifest.cpp'),...flags,'-o',binary],{stdio:['ignore','pipe','pipe']});
  const run=mode=>spawnSync(binary,[store,mode],{encoding:'utf8'});
  assert.equal(run('init').status,0);const file=path.join(store,'snapshot-1.jsonl'),injected=disappearOnce(file),report=[];
  measureCurrentAppBudget(root,identity,{io:injected.io,report:x=>report.push(x)});assert.equal(report[0].retries,1);
  assert.equal(run('read').status,1);write('recordings/snapshot-1.jsonl','abc');assert.equal(run('read').status,0);
  write('recordings/snapshot-1.jsonl','abd');measureCurrentAppBudget(root,identity);assert.equal(run('read').status,1);
});
