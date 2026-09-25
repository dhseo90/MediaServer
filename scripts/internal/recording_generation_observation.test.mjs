// B 관측기의 실제 제품 codec/원장 반례. 서버·장시간/UI 검증은 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {CurrentRecordingObserver,CurrentLongrunProgress,closedJournalComplete} from './recording_current_observer.mjs';
const base=process.argv[2],binary=path.join(base,'normalize'),start=performance.now();
let passed=0,failed=0;
const check=(label,fn)=>{try{fn();++passed;console.log('[pass] '+label);}catch(e){++failed;console.log('[fail] '+label);throw e;}};
const native=(args)=>spawnSync(binary,args,{encoding:'utf8',timeout:3000,maxBuffer:33554432});
const fixture=(root,mode)=>{const p=native(['--generation-fixture',root,mode]);assert.equal(p.status,0,p.stderr);};
const poll=(root,seen=0)=>{const p=native(['--observe-generation',root,String(seen)]);assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);};
const active=root=>path.join(root,JSON.parse(fs.readFileSync(path.join(root,'recording-generation.json'))).active.name);
const tree=root=>fs.readdirSync(root).filter(x=>fs.statSync(path.join(root,x)).isFile()).sort().map(x=>[x,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,x))).digest('hex')]);
try{
  const root=path.join(base,'generation');fixture(root,'one');let first;
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
console.log(JSON.stringify({scope:'generation-observer-short',passed,failed,elapsedMs:Math.round(performance.now()-start),longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));process.exitCode=failed?1:0;
