// 파일 용도: 녹화 세대 관측 helper의 read-only 동작을 단위 검증한다.
// B 관측기의 실제 제품 codec/원장 반례. 서버·장시간/UI 검증은 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn as nodeSpawn,spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';
import {CurrentRecordingObserver,CurrentLongrunProgress,GenerationObservationSession,closedJournalComplete} from './recording_current_observer.mjs';
const base=process.argv[2],transportOnly=process.argv[3]==='--transport-self-test',metadataOnly=process.argv[3]==='--metadata-self-test',binary=path.join(base,'normalize'),start=performance.now();
let passed=0,failed=0;
let generationRoot=null;
const check=(label,fn)=>{try{fn();++passed;console.log('[pass] '+label);}catch(e){++failed;console.log('[fail] '+label);throw e;}};
const checkAsync=async(label,fn)=>{try{await fn();++passed;console.log('[pass] '+label);}catch(e){++failed;console.log('[fail] '+label);throw e;}};
const native=(args)=>spawnSync(binary,args,{encoding:'utf8',timeout:3000,maxBuffer:33554432});
const fixture=(root,mode)=>{const p=native(['--generation-fixture',root,mode]);assert.equal(p.status,0,p.stderr);};
const poll=(root,seen=0)=>{const p=native(['--observe-generation',root,String(seen)]);assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);};
const active=root=>path.join(root,JSON.parse(fs.readFileSync(path.join(root,'recording-generation.json'))).active.name);
const tree=root=>fs.readdirSync(root).filter(x=>fs.statSync(path.join(root,x)).isFile()).sort().map(x=>[x,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x))).digest('hex')]);
const fakeSpawn=script=>(_binary,_args,options)=>nodeSpawn(process.execPath,['--input-type=module','--eval',script],options);
const hungSpawn=holder=>(_binary,_args,_options)=>{const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.write=()=>true;child.stdin.end=()=>{};child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>true;holder.child=child;return child;};
const transportReply='{"busy":false,"storeHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","generation":"1","prefix":[],"rows":[],"backlog":false,"partialBytes":0,"consumedOffset":0}';
async function TransportSelfTest(){
  const root=fs.mkdtempSync(path.join(base,'transport-'));fs.chmodSync(root,0o700);let session;
  try{
    await checkAsync('B11-O01 session request serializes one canonical line and waits for one JSON line',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("let b='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{b+=d;for(;;){const n=b.indexOf('\\n');if(n<0)return;const line=b.slice(0,n);b=b.slice(n+1);process.stdout.write(JSON.stringify({seen:line})+'\\n');}});")});
      assert.equal(await session.request(0),'{"seen":"0"}');assert.equal(await session.request(1),'{"seen":"1"}');await session.closeAsync();await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 UTF-8 response split across chunks remains one exact line',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stdin.once('data',()=>{const b=Buffer.from('{\\\"value\\\":\\\"한\\\"}\\n');process.stdout.write(b.subarray(0,12));setTimeout(()=>process.stdout.write(b.subarray(12)),5);});")});
      assert.equal(await session.request(0),'{"value":"한"}');await session.closeAsync();session=null;
    });
    check('B11-O01 transport constructor rejects limits above fixed policy caps',()=>{
      assert.throws(()=>new GenerationObservationSession(root,'ignored',{timeoutMs:3001}),/observer-native-session-limits/);
      assert.throws(()=>new GenerationObservationSession(root,'ignored',{outputCap:33554433}),/observer-native-session-limits/);
      assert.throws(()=>new GenerationObservationSession(root,'ignored',{stderrCap:65537}),/observer-native-session-limits/);
    });
    await checkAsync('B11-O01 concurrent persistent request is rejected before a second write',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stdin.setEncoding('utf8');process.stdin.once('data',()=>setTimeout(()=>process.stdout.write('{}\\n'),80));")});
      const first=session.request(0);assert.throws(()=>session.request(0),/observer-native-request-in-flight/);await first;await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 extra session output line is rejected without publishing a body',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stdin.once('data',()=>process.stdout.write('{}\\n{}\\n'))")});await assert.rejects(session.request(0),/observer-native-output-invalid/);await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 persistent request timeout is latched and then closes',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stdin.resume();"),timeoutMs:20});await assert.rejects(session.request(0),/observer-native-timeout/);await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 session stdout cap is enforced per request',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stdin.once('data',()=>process.stdout.write('x'.repeat(1025)));"),outputCap:1024});await assert.rejects(session.request(0),/observer-native-output-cap/);await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 session stderr cap is bounded without raw stderr publication',async()=>{
      session=new GenerationObservationSession(root,'ignored',{spawnChild:fakeSpawn("process.stderr.write('x'.repeat(1025));process.stdin.resume();"),stderrCap:1024});await assert.rejects(session.request(0),/observer-native-stderr-cap/);await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 cleanup timeout is explicit and repeated close can settle after child exit',async()=>{
      const holder={};session=new GenerationObservationSession(root,'ignored',{spawnChild:hungSpawn(holder)});session.start();await assert.rejects(session.closeAsync(),/observer-native-cleanup-blocked/);holder.child.emit('close',0,null);await session.closeAsync();session=null;
    });
    await checkAsync('B11-O01 pollAsync shares generation acceptance with the synchronous parser',async()=>{
      fs.writeFileSync(path.join(root,'recording-generation.json'),'{}\n',{mode:0o600});
      const good=new CurrentRecordingObserver(root,'ignored',undefined,{spawnChild:fakeSpawn(`process.stdin.on('data',()=>process.stdout.write('${transportReply}\\n'));`)});
      assert.equal((await good.pollAsync()).mutationCount,0);await good.closeAsync();
    });
    await checkAsync('B11-O01 EPIPE or late child exit latches without synchronous fallback',async()=>{
      const bad=new CurrentRecordingObserver(root,'ignored',undefined,{spawnChild:fakeSpawn('process.exit(1);')});await assert.rejects(bad.pollAsync(),/observer-native-rejected/);await assert.rejects(bad.pollAsync(),/observer-native-rejected/);assert.throws(()=>bad.poll(),/observer-native-rejected/);await bad.closeAsync();
      const late=new CurrentRecordingObserver(root,'ignored',undefined,{spawnChild:fakeSpawn(`process.stdin.once('data',()=>{process.stdout.write('${transportReply}\\n');setTimeout(()=>process.exit(1),10);});`)});
      assert.equal((await late.pollAsync()).mutationCount,0);await new Promise(resolve=>setTimeout(resolve,30));await assert.rejects(late.pollAsync(),/observer-native-rejected/);await assert.rejects(late.closeAsync(),/observer-native-rejected/);
    });
  }finally{if(session)await session.closeAsync().catch(()=>{});fs.rmSync(root,{recursive:true,force:true});assert.equal(fs.existsSync(root),false);}
}
async function MetadataSelfTest(){
  const dir=fileURLToPath(new URL('../../docs/release-artifacts/v4.1.0/s11-final-20260926/',import.meta.url));
  const archive=path.join(dir,'b10-observer-metadata.tar.xz'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'b10-observer-input-manifest.json'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  const parent=fs.mkdtempSync(path.join(base,'media-server-current-observer-actual-')),root=path.join(parent,'recordings');fs.mkdirSync(root,{mode:0o700});
  const expectedIds=new Set(),expectedSegments=new Map(),expectedDeleted=new Set();
  check('B11-O02 fixed B10 archive hash members and every metadata byte verified',()=>{
    assert.equal(hash(fs.readFileSync(archive)),'d0eba4711feb83742d17ff28af2f803069d92ca9f7e105d6b7e7402574f3a3ab');
    const list=spawnSync('tar',['-tf',archive],{encoding:'utf8',timeout:3000});assert.equal(list.status,0);const names=list.stdout.trimEnd().split('\n');
    assert.deepEqual(names.slice().sort(),manifest.files.map(f=>f.path).sort());assert.equal(new Set(names).size,names.length);
    for(const n of names)assert(/^\.?[a-zA-Z0-9_.-]+$/.test(n)&&n!=='.'&&n!=='..');
    const unpack=spawnSync('tar',['-xf',archive,'-C',root],{encoding:'utf8',timeout:3000});assert.equal(unpack.status,0);
    for(const f of manifest.files){const file=path.join(root,f.path),s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size===f.bytes);assert.equal(hash(fs.readFileSync(file)),f.sha256);}
    // 문자열 식별값·집합만 독립 예상값에 사용한다. UTC/PTS를 JS 숫자로 재저장하지 않는다.
    for(const name of names.filter(n=>/^active-[1-9]\d*\.jsonl$/.test(n)))for(const line of fs.readFileSync(path.join(root,name),'utf8').split('\n').filter(Boolean)){
      const m=JSON.parse(line);assert.equal(typeof m.mutationId,'string');expectedIds.add(m.mutationId);
      if(m.mutationType==='segment_v2_bound_finalized')expectedSegments.set(m.entityId,m.payload.segment.channel_id);
      if(m.mutationType==='segment_v2_deleted')expectedDeleted.add(m.entityId);
    }
    assert.equal(expectedSegments.size,1116);assert.equal(expectedDeleted.size,1110);
  });
  const prepare=performance.now();
  check('B11-O02 owned clone uses product checkpoint to compact current deleted details',()=>{
    const child=spawnSync(binary,['--retire-metadata-fixture',root],{encoding:'utf8',timeout:15000,maxBuffer:16384});assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout),{fixture:true});
    const m=JSON.parse(fs.readFileSync(path.join(root,'recording-generation.json')));const rows=fs.readFileSync(path.join(root,m.snapshot.name),'utf8').trimEnd().split('\n').slice(1).map(JSON.parse);
    assert.equal(rows.filter(r=>r.kind==='retired-v2').length,1110);assert.equal(rows.filter(r=>r.kind==='tombstone-v2').length,0);assert.equal(rows.filter(r=>r.kind==='segment-v2').length,6);
    console.log('[metadata-preparation] '+JSON.stringify({elapsedMs:performance.now()-prepare,snapshotBytes:m.snapshot.size,originals:1116,deleted:1110,mediaAvailable:false}));
  });
  const before=tree(root),observer=new CurrentRecordingObserver(root,binary),progress=new CurrentLongrunProgress(0),samples=[];let seen=0,last;
  const begin=performance.now();
  try{
    await checkAsync('B11-O02 actual normalized backlog drains all independent IDs within unchanged observation gap',async()=>{
      for(let batch=0;batch<128;batch++){
        const at=performance.now();last=await observer.pollAsync();samples.push(performance.now()-at);assert.equal(last.busy,false);assert(last.rows.length<=128);
        progress.consume(last.rows,performance.now()-begin);seen+=last.rows.length;
        assert(performance.now()-begin<=15000,'observer backlog must fit existing 15s observation gap');if(!last.backlog)break;
      }
      assert(closedJournalComplete(last));assert.equal(seen,expectedIds.size);assert.deepEqual([...observer.ids].sort(),[...expectedIds].sort());
      assert.equal(progress.records.size,1116);assert.equal(Object.values(progress.channels).reduce((s,c)=>s+c.deleted,0),1110);
      for(const [id,channel] of expectedSegments){assert.equal(progress.records.get(id).channel,channel);assert.equal(progress.records.get(id).state,expectedDeleted.has(id)?'deleted':'finalized');}
      console.log('[metadata-drain] '+JSON.stringify({batches:samples.length,mutations:seen,elapsedMs:performance.now()-begin,maxBatchMs:Math.max(...samples),firstBatchMs:samples[0],lastBatchMs:samples.at(-1),logicalIdentityBytes:observer.bytes}));
    });
    await checkAsync('B11-O02 warm immutable polls and one-shot strict comparison preserve exact prefix',async()=>{
      const warm=[];for(let n=0;n<5;n++){const at=performance.now();const value=await observer.pollAsync();assert.equal(value.rows.length,0);assert(closedJournalComplete(value));warm.push(performance.now()-at);}
      const at=performance.now(),strict=poll(root,seen),coldMs=performance.now()-at;assert.deepEqual(strict.prefix,observer.prefix);assert.equal(strict.rows.length,0);
      const stats=JSON.parse(await observer.generationSession.request(seen)).parseCache;assert(stats.snapshotHits>0&&stats.identityHits>0&&stats.logicalBytes<=33554432);
      console.log('[metadata-compare] '+JSON.stringify({warmMs:warm,oneShotMs:coldMs,parseCache:stats,nativeDeadlineMs:3000,readOutputCapBytes:33554432}));
    });
  }finally{await observer.closeAsync();}
  check('B11-O02 observer closed and all durable metadata remains byte-identical',()=>{assert.deepEqual(tree(root),before);assert.equal(hash(fs.readFileSync(archive)),'d0eba4711feb83742d17ff28af2f803069d92ca9f7e105d6b7e7402574f3a3ab');assert(observer.closed);});
}
if(metadataOnly){
  try{await MetadataSelfTest();}catch(e){if(!failed){++failed;console.log('[fail] B11-O02 metadata setup');}console.error(String(e.message).slice(0,300));}
}else if(transportOnly){
  try{await TransportSelfTest();}catch(e){if(!failed){++failed;console.log('[fail] B11-O01 transport setup');}console.error(String(e.message).slice(0,300));}
}else try{
  const root=path.join(base,'generation');generationRoot=root;fixture(root,'one');let first;
  check('B06-V03 actual B observation uses current C++ format not retained empty legacy journal',()=>{first=poll(root);assert.equal(first.busy,false);assert.equal(first.rows.length,1);assert.equal(first.rows[0].id,'observe-one');assert.equal(first.prefix.length,1);assert.equal(first.backlog,false);assert.equal(first.partialBytes,0);});
  check('B06-V03 same observation does not modify durable files or repeat rows',()=>{const before=tree(root),again=poll(root,1);assert.equal(again.rows.length,0);assert.deepEqual(again.prefix,first.prefix);assert.deepEqual(tree(root),before);});
  fixture(root,'two');const second=poll(root,1);
  check('B06-V03 append exposes one new literal reservation and preserves old prefix',()=>{assert.equal(second.rows.length,1);assert.equal(second.rows[0].id,'observe-two');assert.equal(second.prefix[0],first.prefix[0]);});
  fixture(root,'checkpoint');
  check('B06-V03 checkpoint changes generation without lost/repeated first acceptances',()=>{const current=poll(root,2);assert.equal(current.rows.length,0);assert.deepEqual(current.prefix,second.prefix);assert.notEqual(current.generation,second.generation);const fresh=poll(root);assert.deepEqual(fresh.rows.map(r=>r.id),['observe-one','observe-two']);});
  fixture(root,'three');const file=active(root),bytes=fs.readFileSync(file);fs.writeFileSync(file,bytes.subarray(0,-1));
  check('B06-V03 incomplete last LF is observed, not consumed or called complete',()=>{const result=poll(root,2);assert.equal(result.rows.length,0);assert(result.partialBytes>0);});
  fs.appendFileSync(file,'\n');const third=poll(root,2);
  check('B06-V03 completed tail consumed once and identical physical retry deduplicated',()=>{assert.equal(third.rows[0].id,'observe-three');fs.appendFileSync(file,bytes);const retry=poll(root,3);assert.equal(retry.rows.length,0);assert.equal(retry.prefix.length,3);});
  const receipt=path.join(root,'.recording-generation-transaction.stage');fs.writeFileSync(receipt,'owned pending fixture');
  check('B06-V03 pending transaction is busy, never Catalog acceptance',()=>assert.deepEqual(poll(root,3),{busy:true}));fs.unlinkSync(receipt);
  fs.appendFileSync(file,'{bad}\n');
  check('B06-V03 completed malformed row rejected without raw body output',()=>{const result=native(['--observe-generation',root,'3']);assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr,'native-observation-invalid\n');});
  fs.writeFileSync(file,bytes);
  const moved=file+'.owned';fs.renameSync(file,moved);fs.symlinkSync(path.basename(moved),file);
  check('B06-V03 active symlink refused',()=>assert.equal(native(['--observe-generation',root,'0']).status,1));fs.unlinkSync(file);fs.renameSync(moved,file);
  check('B06-V03 actual JS dispatch owns B prefix and refuses pending as closed',()=>{
    const o=new CurrentRecordingObserver(root,binary),a=o.poll();assert.equal(a.rows.length,3);assert.equal(a.catalogAcceptancePass,false);assert.equal(o.poll().rows.length,0);
    fs.writeFileSync(receipt,'pending');const busy=o.poll();assert.equal(busy.busy,true);assert.equal(closedJournalComplete(busy),false);fs.unlinkSync(receipt);assert.equal(o.poll().rows.length,0);o.close();
  });
  check('B06-V03 canonical changed prefix is rejected and failure latched',()=>{
    const o=new CurrentRecordingObserver(root,binary);o.poll();const m=JSON.parse(bytes);m.occurredAtMs+=1;fs.writeFileSync(file,JSON.stringify(m)+'\n');
    assert.throws(()=>o.poll(),/prefix-mismatch/);assert.throws(()=>o.poll(),/prefix-mismatch/);o.close();fs.writeFileSync(file,bytes);
  });
  check('B06-V03 confirmed active prefix ending inside a row is rejected',()=>{
    const name=path.join(root,'recording-generation.json'),original=fs.readFileSync(name),m=JSON.parse(original);m.active.size=1;m.active.sha256=crypto.createHash('sha256').update(bytes.subarray(0,1)).digest('hex');
    fs.writeFileSync(name,JSON.stringify(m)+'\n');assert.equal(native(['--observe-generation',root,'0']).status,1);fs.writeFileSync(name,original);
  });
  check('B06-V03 first pending B observation never falls back to retained legacy journal',()=>{
    const name=path.join(root,'recording-generation.json'),saved=fs.readFileSync(name),o=new CurrentRecordingObserver(root,binary);
    fs.writeFileSync(receipt,'pending');assert.equal(o.poll().busy,true);fs.unlinkSync(receipt);fs.unlinkSync(name);
    assert.throws(()=>o.poll(),/native-rejected/);o.close();fs.writeFileSync(name,saved);
  });
  check('B06-V03 bounded batch consumes 128 then remaining physical rows exactly once',()=>{
    const batchRoot=path.join(base,'batch');fixture(batchRoot,'batch');
    const o=new CurrentRecordingObserver(batchRoot,binary),a=o.poll();assert.equal(a.rows.length,128);assert.equal(a.backlog,true);
    const b=o.poll();assert.equal(b.rows.length,2);assert.equal(b.backlog,false);assert.equal(o.poll().rows.length,0);o.close();
  });
  check('B06-V03 actual B writer, deletion and sealed cold evidence match independent progress',()=>{
    const mediaRoot=path.join(base,'recordings'),r=spawnSync(binary,['--generation-media-fixture',mediaRoot],{encoding:'utf8',timeout:15000,maxBuffer:33554432});assert.equal(r.status,0,r.stderr);
    const o=new CurrentRecordingObserver(mediaRoot,binary),a=o.poll(),p=new CurrentLongrunProgress(0),deleted=p.consume(a.rows,1);
    assert.equal(deleted.length,2);for(const id of ['9101','9201']){assert(p.channels[id].finalized>=2);assert.equal(p.channels[id].deleted,1);}
    assert.equal(o.poll().rows.length,0);assert(closedJournalComplete(a));o.close();
    const s=spawnSync(binary,['--snapshot',mediaRoot],{encoding:'utf8',timeout:15000,maxBuffer:16384});assert.equal(s.status,0,s.stderr);const result=JSON.parse(s.stdout);assert.equal(result.deleted,2);assert(result.available>=2);
  });
}catch(e){if(!failed){++failed;console.log('[fail] B06 generation fixture/setup');}console.error(String(e.message).slice(0,300));}
if(!transportOnly&&!metadataOnly&&failed===0)try{
  await checkAsync('B11-O01 actual native session preserves prefix, uses bounded parse cache, and observes checkpoint',async()=>{
    const session=new GenerationObservationSession(generationRoot,binary);try{
      const first=JSON.parse(await session.request(0));assert(first.rows.length>=3);assert.equal(first.parseCache.snapshotMisses,1);assert(first.parseCache.identityMisses>=1);
      const second=JSON.parse(await session.request(first.prefix.length));assert.equal(second.rows.length,0);assert(second.parseCache.snapshotHits>=1);assert(second.parseCache.identityHits>=1);
      fixture(generationRoot,'checkpoint');const checkpoint=JSON.parse(await session.request(first.prefix.length));assert.notEqual(checkpoint.generation,first.generation);assert(checkpoint.parseCache.snapshotMisses>second.parseCache.snapshotMisses);
    }finally{await session.closeAsync();}
  });
  await checkAsync('B11-O01 actual native session rejects active inode replacement and stays failed closed',async()=>{
    const tamperRoot=path.join(base,'async-tamper');fixture(tamperRoot,'one');const session=new GenerationObservationSession(tamperRoot,binary),file=active(tamperRoot),moved=file+'.session-owned';try{
      const initial=await session.request(0);assert.equal(JSON.parse(initial).busy,false);fs.renameSync(file,moved);fs.symlinkSync(path.basename(moved),file);await assert.rejects(session.request(0),/observer-native-rejected/);await assert.rejects(async()=>session.request(0),/observer-native-rejected/);
    }finally{try{if(fs.lstatSync(file).isSymbolicLink())fs.unlinkSync(file);}catch{}try{fs.renameSync(moved,file);}catch{}await session.closeAsync();}
  });
  for(const kind of ['snapshot-inode','identity-content','root-inode'])await checkAsync('B11-O01 cached native session rejects '+kind,async()=>{
    const r=path.join(base,'guard-'+kind);fixture(r,'one');fixture(r,'checkpoint');const o=new CurrentRecordingObserver(r,binary);
    const manifest=JSON.parse(fs.readFileSync(path.join(r,'recording-generation.json'))),snapshot=fs.readFileSync(path.join(r,manifest.snapshot.name),'utf8').split('\n')[0];
    let restore=()=>{};
    try{await o.pollAsync();
      if(kind==='snapshot-inode'){const f=path.join(r,manifest.snapshot.name),m=f+'.owned';fs.renameSync(f,m);fs.copyFileSync(m,f);restore=()=>{fs.unlinkSync(f);fs.renameSync(m,f);};}
      else if(kind==='identity-content'){const f=path.join(r,JSON.parse(snapshot).identityHead.name),b=fs.readFileSync(f);const bad=Buffer.from(b);bad[5]^=1;fs.writeFileSync(f,bad);restore=()=>fs.writeFileSync(f,b);}
      else{const moved=r+'.owned';fs.renameSync(r,moved);fs.cpSync(moved,r,{recursive:true});restore=()=>{fs.rmSync(r,{recursive:true});fs.renameSync(moved,r);};}
      await assert.rejects(o.pollAsync(),/observer-native-rejected/);await assert.rejects(o.pollAsync(),/observer-native-rejected/);
    }finally{restore();await o.closeAsync();}
  });
  await checkAsync('B11-O01 async batch pending and partial tail preserve completion boundaries',async()=>{
    const r=path.join(base,'async-boundaries');fixture(r,'batch');const o=new CurrentRecordingObserver(r,binary);
    try{const a=await o.pollAsync();assert.equal(a.rows.length,128);assert(a.backlog);assert.equal((await o.pollAsync()).rows.length,2);
      const pending=path.join(r,'.recording-generation-transaction.stage');fs.writeFileSync(pending,'pending');assert.equal((await o.pollAsync()).busy,true);fs.unlinkSync(pending);
      fixture(r,'three');const f=active(r),b=fs.readFileSync(f);fs.writeFileSync(f,b.subarray(0,-1));const partial=await o.pollAsync();assert(partial.partialBytes>0);assert.equal(partial.rows.length,0);fs.appendFileSync(f,'\n');assert.equal((await o.pollAsync()).rows.length,1);
    }finally{await o.closeAsync();}await assert.rejects(o.pollAsync(),/observer-closed/);
  });
  check('B11-O01 native rejects noncanonical oversized partial and NUL requests',()=>{
    for(const input of ['00\n','1000000\n','1','0\0x\n','\n']){const p=spawnSync(binary,['--observe-generation-session',path.join(base,'generation')],{input,encoding:'utf8',timeout:3000,maxBuffer:1024});assert.equal(p.status,1);assert.equal(p.stdout,'');assert.equal(p.stderr,'native-observation-invalid\n');}
  });
  await TransportSelfTest();
}catch(e){if(!failed){++failed;console.log('[fail] B11-O01 native session');}console.error(String(e.message).slice(0,300));}
console.log(JSON.stringify({scope:'generation-observer-short',passed,failed,elapsedMs:Math.round(performance.now()-start),longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));process.exitCode=failed?1:0;
