// 파일 용도: 녹화 관측기의 집계·자식 종료·오류 경계 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FoundationObserver,collectProcess,observationCompleted} from './recording_foundation_observer.mjs';
const start=Date.now(),root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-observer-'))),observers=[];
let passed=0,failed=0;
const row=(id,type='segment_finalized',entity='e')=>JSON.stringify({schema:'media-server.recording-mutation.v1',mutationId:id,mutationType:type,entityId:entity,occurredAtMs:1,payload:{}})+'\n';
const metric=pid=>({pid,startIdentity:'macos:1:2',rssBytes:1000,threadCount:1,fdCount:3,sampledAt:Date.now(),valid:true,error:null});
function observer(file='journal',collect=async pid=>metric(pid),options={}){const o=new FoundationObserver({root,file,collect,...options});observers.push(o);return o;}
async function check(name,fn){try{await fn();passed++;console.log(`[pass] ${name}`);}catch(e){failed++;console.log(`[fail] ${name}`);throw e;}}
try{
  fs.writeFileSync(path.join(root,'journal'),row('m1'));
  const o=observer();
  await check('OBS01 first mutation counted',async()=>assert.equal((await o.tick(123)).mutationCount,1));
  await check('OBS01 no duplicate poll count',async()=>{const s=await o.tick(123);assert.equal(s.mutationCount,1);assert.equal(s.uniqueMutationIds,1);assert.equal(s.uniqueEntityIds,1);});
  fs.appendFileSync(path.join(root,'journal'),row('m1')+row('m2','observation_v2_put','obs'));
  await check('OBS02 raw rows distinct from unique IDs',async()=>{const s=await o.tick(123);assert.equal(s.mutationCount,3);assert.equal(s.uniqueMutationIds,2);assert.equal(s.uniqueEntityIds,2);assert.equal(s.storedIdCount,4);assert.equal(s.idUtf8Bytes,8);});
  await check('OBS03 new PID distinct group same cursor',async()=>{await o.tick(124);assert.equal(o.groups.size,2);assert.equal(o.counts().mutationCount,3);});
  const all=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
  fs.writeFileSync(path.join(root,'types'),all.map((t,i)=>row('t'+i,t)).join(''));
  await check('OBS01 all seven type counts',async()=>{const s=await observer('types').tick(10);assert.deepEqual(Object.values(s.typeCounts),[1,1,1,1,1,1,1]);assert.equal(s.resourceTrendPass,false);});
  const pending=observer('future');
  await check('OBS04 initial absent journal pending not zero',async()=>assert.deepEqual((await pending.tick(5)).journal,{status:'pending'}));
  fs.writeFileSync(path.join(root,'future'),row('future'));
  await check('OBS04 journal created later observed',async()=>assert.equal((await pending.tick(5)).journal.status,'observed'));
  await check('OBS04 final unmeasured rejected',async()=>assert.throws(()=>observer('never').close(),/unmeasured/));
  const nojournal=observer('never2');await nojournal.tick(7);
  await check('OBS04 final pending rejected',async()=>assert.throws(()=>nojournal.close(),/unmeasured/));
  await check('OBS02 total ID count bound',async()=>await assert.rejects(()=>observer('journal',undefined,{maxIds:2}).tick(8),/id-limit/));
  fs.writeFileSync(path.join(root,'unicode'),row('영상','segment_finalized','e'));
  await check('OBS02 UTF8 byte bound',async()=>await assert.rejects(()=>observer('unicode',undefined,{maxIdBytes:6}).tick(8),/id-limit/));
  await check('OBS03 missing collector binary fails',async()=>await assert.rejects(()=>collectProcess(path.join(root,'missing-binary'),1),/collector-unavailable/));
  for(const [name,bad] of [['null',null],['invalid',{...metric(1),valid:false}],['wrongpid',metric(2)],['missingfd',{...metric(1),fdCount:null}],['rsszero',{...metric(1),rssBytes:0}]])
    await check(`OBS03 ${name} sample rejected`,async()=>await assert.rejects(()=>observer('journal',async()=>bad).tick(1),/incomplete/));
  let changed=false;const identity=observer('journal',async pid=>({...metric(pid),startIdentity:changed?'macos:2:3':'macos:1:2'}));await identity.tick(77);changed=true;
  await check('OBS03 live identity change rejected',async()=>await assert.rejects(()=>identity.tick(77),/identity-changed/));
  changed=false;
  await check('OBS03 identity error latched',async()=>await assert.rejects(()=>identity.tick(77),/identity-changed/));
  fs.writeFileSync(path.join(root,'truncate'),row('x'));const truncated=observer('truncate');await truncated.tick(11);fs.truncateSync(path.join(root,'truncate'),0);
  await check('OBS03 reader error not empty archive',async()=>await assert.rejects(()=>truncated.tick(11),/truncated/));
  let resolve,calls=0;const blocked=observer('journal',pid=>{calls++;return new Promise(r=>{resolve=()=>r(metric(pid));});});
  const tick=blocked.tick(88);
  await check('OBS04 duplicate tick not launched',async()=>{assert.equal(await blocked.tick(88),null);assert.equal(calls,1);});
  let paused=false;const pause=blocked.pause().then(()=>{paused=true;});
  await check('OBS04 pause waits active tick',async()=>{await Promise.resolve();assert.equal(paused,false);resolve();await tick;await pause;assert.equal(paused,true);});
  await check('OBS04 measured close returns groups not resource pass',async()=>{const s=blocked.close();assert.equal(s.groups.length,1);assert.equal(s.resourceTrendPass,false);});
  await check('OBS04 closed tick rejected',async()=>await assert.rejects(()=>blocked.tick(88),/closed/));
  fs.writeFileSync(path.join(root,'partial'),row('partial')+'{"unfinished":');
  const partial=observer('partial');
  await check('OBS04 live partial observed without consuming tail',async()=>{const s=await partial.tick(9);assert.equal(s.mutationCount,1);assert.equal(s.journal.partialBytes,14);});
  await check('OBS04 final partial rejected and reader closed',async()=>{assert.throws(()=>partial.close(),/unmeasured/);assert.throws(()=>partial.reader.poll(),/closed/);});
  await check('OBS04 failure cleanup closes reader',async()=>{const fd=truncated.reader.fd;truncated.close(false);assert.equal(truncated.reader.fd,null);assert.throws(()=>fs.fstatSync(fd),{code:'EBADF'});assert.throws(()=>truncated.reader.poll(),/truncated/);});
  const complete={enabled:true,final:{groups:[{}]},failed:0,error:null,processesClosed:true};
  await check('OBS04 complete observation predicate positive',async()=>assert.equal(observationCompleted(complete),true));
  for(const [name,change] of [['failure',{failed:1}],['process-unclosed',{processesClosed:false}],['no-final',{final:null}],['error',{error:'failure'}],['disabled',{enabled:false}]])
    await check(`OBS04 ${name} completion rejected`,async()=>assert.equal(observationCompleted({...complete,...change}),false));
}catch(e){if(!failed){failed++;console.log('[fail] fixture setup');}}
finally{
  for(const o of observers){try{await o.pause();o.close(false);}catch{failed++;}}
  function bytes(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+bytes(path.join(p,x)),0):s.size;}
  const size=bytes(root);fs.rmSync(root,{recursive:true});let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
  if(!absent)failed++;console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
  console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음',scope:'observer-unit-only'}));process.exitCode=failed?1:0;
}
