// 파일 용도: 장시간 관측 진행·표본 연속성·삭제 확인 계약 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parseLongrunArgs, LongrunProgress, sampleContinuity,nextRecordingSettings,mediaAbsent} from './recording_longrun_progress.mjs';
let passed=0,failed=0; const start=Date.now();
function check(name,fn){try{fn();passed++;console.log(`[pass] ${name}`);}catch{failed++;console.log(`[fail] ${name}`);}}
check('explicit 120 minutes accepted',()=>assert.equal(parseLongrunArgs(['--duration-minutes','120']),7200000));
for(const args of [[],['120'],['--duration-minutes','30'],['--duration-minutes','120','extra'],['--unknown','120']])
  check(`invalid CLI ${JSON.stringify(args)}`,()=>assert.throws(()=>parseLongrunArgs(args)));
const row=(id,ch,time)=>({mutationId:`m-${id}`,entityId:id,mutationType:'segment_finalized',payload:{mediaRelpath:`channel/${id}.mp4`,segment:{segment_id:id,channel_id:ch,retention_class:'continuous',lifecycle:'finalized',start:{utc_ms:time,pts:time,time_base_num:1,time_base_den:1000},end:{utc_ms:time+1,pts:time+1,time_base_num:1,time_base_den:1000},size_bytes:8,checksum_sha256:'a'.repeat(64),finalized_at_ms:time+1}}});
const deletion=(id,type)=>({mutationId:`${type}-${id}`,entityId:id,mutationType:type,payload:{}});
check('two channels progress and ordered deletion',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',1),row('b','9201',1)],1000);p.consume(['a','b'].flatMap(id=>[deletion(id,'deletion_requested'),deletion(id,'deletion_completed')]),2000);assert.equal(p.status(2000).channels['9101'].deleted,1);assert.equal(p.status(2000).channels['9201'].finalized,1);});
check('stall rejected',()=>assert.throws(()=>new LongrunProgress(0).status(30001)));
check('duplicate rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.consume([row('a','9101',1),row('a','9101',1)],1));});
check('UTC regression rejected',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',3)],1);assert.throws(()=>p.consume([row('b','9101',2)],2));});
check('completion without request rejected',()=>{const p=new LongrunProgress(0);p.consume([row('a','9101',1)],1);assert.throws(()=>p.consume([deletion('a','deletion_completed')],2));});
check('invalid media metadata rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.segment.size_bytes=0;assert.throws(()=>p.consume([r],1));});
check('duration cannot be shortened',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.finish(1));});
check('unknown channel cannot satisfy progress',()=>{const p=new LongrunProgress(0);p.consume([row('a','9999',1)],1);assert.throws(()=>p.status(30001));});
check('backward clock rejected',()=>{const p=new LongrunProgress(10);assert.throws(()=>p.status(9));});
const samples=[{pid:5,startIdentity:'linux:1',phaseAt:0},{pid:5,startIdentity:'linux:1',phaseAt:5000}];
check('sample continuous accepted',()=>assert(sampleContinuity(samples,0,5000,5,'linux:1')));
check('sample gap rejected',()=>assert(!sampleContinuity([samples[0],{...samples[1],phaseAt:16000}],0,16000,5,'linux:1')));
check('sample wrong PID rejected',()=>assert(!sampleContinuity(samples,0,5000,6,'linux:1')));
check('sample wrong identity rejected',()=>assert(!sampleContinuity(samples,0,5000,5,'linux:2')));
check('sample missing beginning rejected',()=>assert(!sampleContinuity(samples,-16000,5000,5,'linux:1')));
check('sample missing end rejected',()=>assert(!sampleContinuity(samples,0,21000,5,'linux:1')));
check('sample insufficient rejected',()=>assert(!sampleContinuity(samples.slice(0,1),0,0,5,'linux:1')));
check('actual golden schema accepted',()=>{const s=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/recording/v1/segments.jsonl',import.meta.url),'utf8').split('\n')[0]);s.channel_id='9101';const p=new LongrunProgress(0);p.consume([{mutationId:'golden',entityId:s.segment_id,mutationType:'segment_finalized',payload:{segment:s,mediaRelpath:'golden.mp4'}}],1);assert.equal(p.status(1).channels['9101'].finalized,1);});
check('full duration distributed progress accepted',()=>{const p=new LongrunProgress(0);for(let t=5000;t<=7200000;t+=5000){const rows=['9101','9201'].flatMap(c=>{const id=`${c}-${t}`;return[row(id,c,t),deletion(id,'deletion_requested'),deletion(id,'deletion_completed')];});p.consume(rows,t);}assert.equal(p.finish(7200000).elapsedMs,7200000);});
check('last moment only cannot pass',()=>assert.throws(()=>new LongrunProgress(0).consume([row('a','9101',1)],7200000)));
check('ID limit rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>{for(let i=0;i<=100000;i++)p.add(`x${i}`);});});
check('UTF8 byte limit rejected',()=>{const p=new LongrunProgress(0);assert.throws(()=>p.add('가'.repeat(11184811)));});
const registry={sources:[{sourceId:'9101',recording:{revision:8}}]};
check('queried revision advanced disable',()=>assert.deepEqual(nextRecordingSettings(registry,'9101',false),{enabled:false,revision:9,continuousMaxBytes:134217728,eventMaxBytes:134217728,continuousMaxAgeMs:10800000,eventMaxAgeMs:10800000}));
check('missing source rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[]},'9101',true)));
check('duplicate source rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[...registry.sources,...registry.sources]},'9101',true)));
check('invalid revision rejected',()=>assert.throws(()=>nextRecordingSettings({sources:[{sourceId:'9101',recording:{revision:0}}]},'9101',true)));
for(const args of [[],['120'],['--duration-minutes','30'],['--duration-minutes','120','extra'],['--unknown','120']]){
  check(`public CLI rejects ${JSON.stringify(args)}`,()=>{const r=spawnSync('bash',['scripts/internal/verify_v410_recording_longrun.sh',...args],{encoding:'utf8',timeout:3000,env:{PATH:process.env.PATH,TMPDIR:'/path-must-not-be-used'}});assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/usage:/);});
}
check('completed batch returns media path once',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.mediaRelpath='channel/a.mp4';p.consume([r,deletion('a','deletion_requested')],1);assert.deepEqual(p.consume([deletion('a','deletion_completed')],2),[{entityId:'a',mediaRelpath:'channel/a.mp4'}]);assert.deepEqual(p.consume([],3),[]);});
check('missing media path rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);delete r.payload.mediaRelpath;assert.throws(()=>p.consume([r],1));});
check('media path byte limit rejected',()=>{const p=new LongrunProgress(0),r=row('a','9101',1);r.payload.mediaRelpath='x'.repeat(33554432);assert.throws(()=>p.consume([r],1));});
check('ENOENT media absent',()=>assert(mediaAbsent(()=>{throw Object.assign(Error(),{code:'ENOENT'});})));
check('regular media present rejected',()=>assert(!mediaAbsent(()=>({isFile:()=>true}))));
check('dangling symlink present rejected',()=>assert(!mediaAbsent(()=>({isSymbolicLink:()=>true}))));
check('media permission error rejected',()=>assert.throws(()=>mediaAbsent(()=>{throw Object.assign(Error(),{code:'EACCES'});})));
check('S09-LD01 invalid segment diagnostics are specific and redacted',()=>{
  for(const [reason,mutate] of [
    ['positive-metadata',s=>{s.size_bytes=0;}],
    ['utc-progress',s=>{s.start.utc_ms=1;s.end.utc_ms=2;}],
    ['pts-range',s=>{s.end.pts=s.start.pts;}],
    ['checksum',s=>{s.checksum_sha256='secret-checksum-text';}],
  ]){
    const p=new LongrunProgress(0);p.consume([row('first','9101',10)],1);
    const r=row('secret-id','9101',20);r.payload.mediaRelpath='secret-source-path';mutate(r.payload.segment);
    assert.throws(()=>p.consume([r],2),e=>{
      assert.match(e.message,/^longrun-invalid-segment /);
      const d=JSON.parse(e.message.slice('longrun-invalid-segment '.length));
      assert(d.reasons.includes(reason));assert.equal(d.previousStartUTC,10);
      assert(!e.message.includes('secret'));return true;
    });
  }
});
check('S09-LD01 missing timestamp diagnostics remain specific and redacted',()=>{
  for(const field of ['start','end']){
    const p=new LongrunProgress(0),r=row('secret-id','9101',20);
    delete r.payload.segment[field];
    r.payload.mediaRelpath='secret-source-path';
    assert.throws(()=>p.consume([r],2),e=>{
      assert.match(e.message,/^longrun-invalid-segment /);
      const d=JSON.parse(e.message.slice('longrun-invalid-segment '.length));
      assert(d.reasons.includes('positive-metadata'));
      assert.equal(d[field==='start'?'startUTC':'endUTC'],null);
      assert(!e.message.includes('secret'));return true;
    });
  }
});
if(passed+failed!==45)failed++;
console.log(`[summary] passed=${passed} failed=${failed} elapsedMs=${Date.now()-start}`);process.exitCode=failed?1:0;
