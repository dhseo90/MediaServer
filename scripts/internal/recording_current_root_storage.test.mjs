// 파일 용도: LP26-O06 격리 root 용량 진단 자체검사. 제품/장시간 PASS가 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CURRENT_ROOT_CAP_BYTES,measureCurrentRoot,measureCurrentSqlitePages,statCurrentRunEntry,isTransientSqliteJournalMiss} from './recording_current_observer.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-root-storage-test-'));
fs.chmodSync(root,0o700);
const start=performance.now();let passed=0,failed=0;
const check=(title,run)=>{try{run();passed++;console.log('[pass] '+title);}catch(error){failed++;console.log('[fail] '+title);throw error;}};
function write(name,bytes){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.alloc(bytes));return file;}
try{
  check('B08-I02 SQLite 임시 journal의 목록화 뒤 ENOENT만 구분',()=>{
    const journal=write('recordings/recording-generation-catalog.sqlite3-journal',7);
    const miss=()=>{throw Object.assign(new Error('entry vanished'),{code:'ENOENT'});};
    assert.equal(isTransientSqliteJournalMiss(root,journal,{code:'ENOENT'}),true);
    assert.equal(isTransientSqliteJournalMiss(root,journal,{code:'EACCES'}),false);
    assert.equal(isTransientSqliteJournalMiss(root,path.join(root,'recordings','required.mp4'),{code:'ENOENT'}),false);
    assert.equal(statCurrentRunEntry(root,journal,miss),null);
    assert.throws(()=>statCurrentRunEntry(root,path.join(root,'recordings','required.mp4'),miss),{code:'ENOENT'});
    assert.throws(()=>statCurrentRunEntry(root,journal,()=>{throw Object.assign(new Error('permission'),{code:'EACCES'});}),{code:'EACCES'});
    const live=measureCurrentRoot(root,{lstat:file=>file===journal?miss():fs.lstatSync(file)});
    assert.equal(live.transientJournalMisses,1);
    assert.equal(live.totalBytes,0);
    fs.unlinkSync(journal);
  });
  check('LP26-O06-A disjoint categories preserve exact aggregate and redact names',()=>{
    const files=[['input/private-source.mp4','input'],['recordings/channel/segment.mp4','media'],['recordings/recording-v2-mutations.jsonl','journal'],
      ['recordings/.recording-checkpoint.tmp','checkpoint'],['recordings/recording-catalog.sqlite3','sqlite'],['recordings/recording-catalog.sqlite3-wal','wal'],
      ['recordings/recording-catalog.sqlite3-shm','sqliteAux'],['tmp/private-token','tmp'],['server-1.private.log','log'],['state/users.json','state'],
      ['events/private-event','events'],['gst-cache/plugin','cache'],['normalize','tools'],['recordings/unknown-private-file','recordingsOther'],['private-unknown','other']];
    let expected=0;for(const [i,[file]] of files.entries()){write(file,i+1);expected+=i+1;}
    const result=measureCurrentRoot(root);assert.equal(result.totalBytes,expected);assert.equal(result.capExceeded,false);
    assert.equal(Object.hasOwn(result,'sqlitePages'),false);assert.equal(Object.hasOwn(measureCurrentRoot(root,{sqlitePages:true}),'sqlitePages'),true);
    assert.equal(Object.values(result.categories).reduce((n,c)=>n+c.bytes,0),expected);
    assert.deepEqual(result.ownership.productRecording,{bytes:2+3+4+5+6+7+14,files:7});
    assert.deepEqual(result.ownership.fixtureInput,{bytes:1,files:1});assert.deepEqual(result.ownership.observerTools,{bytes:13,files:1});
    assert.deepEqual(result.ownership.cache,{bytes:12,files:1});assert.deepEqual(result.ownership.runtimeSupport,{bytes:9+10+11,files:3});
    assert.equal(Object.values(result.ownership).reduce((n,c)=>n+c.bytes,0),expected);
    for(const [i,[,category]] of files.entries())assert.deepEqual(result.categories[category],{bytes:i+1,files:1});
    const output=JSON.stringify(result);assert(!output.includes(root));for(const [file] of files)assert(!output.includes(file));assert.equal(result.rawPathsPublished,false);
  });
  check('LP26-O06-A partial media and cleanup markers remain disjoint in aggregate',()=>{
    const before=measureCurrentRoot(root),nonce='12345678-1234-1234-1234-123456789abc';
    write('recordings/channel/active.mp4.partial.'+nonce,101);write('recordings/channel/active.webm.partial.'+nonce,103);
    for(const name of ['active.mp4.cleanup-pending','active.mp4.partial.','active.mp4.partial.invalid','active.mp4.partial.'+nonce+'.cleanup-pending'])write('recordings/channel/'+name,7);
    write('input/source.mp4.partial.'+nonce,11);
    const result=measureCurrentRoot(root);assert.deepEqual(result.categories.mediaPartial,{bytes:204,files:2});
    assert.deepEqual(result.categories.media,before.categories.media);
    assert.equal(result.categories.recordingsOther.bytes,before.categories.recordingsOther.bytes+28);
    assert.equal(result.categories.recordingsOther.files,before.categories.recordingsOther.files+4);
    assert.equal(result.categories.input.bytes,before.categories.input.bytes+11);
    assert.equal(result.totalBytes,before.totalBytes+243);
    assert.equal(Object.values(result.categories).reduce((sum,c)=>sum+c.bytes,0),result.totalBytes);
    assert.equal(Object.values(result.categories).reduce((sum,c)=>sum+c.files,0),Object.values(before.categories).reduce((sum,c)=>sum+c.files,0)+7);
  });
  check('LP26-O06-B exact 448 MiB logical cap remains inclusive',()=>{
    const previous=measureCurrentRoot(root).totalBytes,file=write('cap-probe',0);
    fs.truncateSync(file,CURRENT_ROOT_CAP_BYTES-previous-1);assert.equal(measureCurrentRoot(root).capExceeded,false);
    fs.truncateSync(file,CURRENT_ROOT_CAP_BYTES-previous);const exact=measureCurrentRoot(root);assert.equal(exact.totalBytes,448*1024*1024);assert.equal(exact.capExceeded,true);
    fs.unlinkSync(file);
  });
  check('LP26-O06-C cache symlink counts link only and unsafe links fail closed',()=>{
    const before=measureCurrentRoot(root).totalBytes,link=path.join(root,'gst-cache/link');fs.symlinkSync('/nonexistent/private-target',link);
    assert.equal(measureCurrentRoot(root).totalBytes,before+fs.lstatSync(link).size);fs.unlinkSync(link);
    const unsafe=path.join(root,'tmp/link');fs.symlinkSync('/nonexistent/private-target',unsafe);assert.throws(()=>measureCurrentRoot(root),/root-unsafe-symlink/);fs.unlinkSync(unsafe);
    const hardlink=path.join(root,'tmp/hardlink');fs.linkSync(path.join(root,'normalize'),hardlink);assert.throws(()=>measureCurrentRoot(root),/root-unsafe-file/);fs.unlinkSync(hardlink);
  });
  check('LP26-O06-D SQLite page observation uses bounded read-only numeric PRAGMA and fails closed',()=>{
    // 기존 fixture catalog는 의도적으로 SQLite 데이터베이스가 아니므로 runner 결과만 바꿔 안전한 projection을 검증한다.
    const sqlite=path.join(root,'recordings/recording-catalog.sqlite3');assert(fs.existsSync(sqlite));
    const observed=measureCurrentSqlitePages(root,(_binary,args,options)=>{assert.equal(_binary,'sqlite3');assert.deepEqual(args.slice(0,2),['-readonly',sqlite]);assert(options.timeout<=3000&&options.maxBuffer<=1024);return {status:0,stdout:'4096\n10\n3\n'};});
    assert.deepEqual(observed,{status:'observed',mainBytes:5,walBytes:6,pageSize:4096,pageCount:10,freePageCount:3,livePageCount:7,liveBytes:28672,freeBytes:12288});
    assert.equal(measureCurrentSqlitePages(root,()=>({status:0,stdout:'4096\n10\n11\n'})).status,'unavailable');
    assert.equal(measureCurrentSqlitePages(root,()=>{throw Error('runner unavailable');}).status,'unavailable');
  });
  check('B06-V04 B components disjoint and current SQLite preferred over retained legacy cache',()=>{
    const before=measureCurrentRoot(root),files=[['active-7.jsonl','journal',101],['snapshot-7.jsonl','generationSnapshot',103],
      ['identity-7.jsonl','generationIdentity',107],['evidence-1-0.jsonl','generationEvidence',109],['recording-generation.json','generationManifest',113],
      ['.recording-generation-transaction.json','generationTransaction',127],['recording-generation-catalog.sqlite3','sqlite',131],
      ['recording-generation-catalog.sqlite3-wal','wal',137],['recording-generation-catalog.sqlite3-shm','sqliteAux',139]];
    for(const [name,,bytes] of files)write('recordings/'+name,bytes);
    const actual=measureCurrentRoot(root),sum=files.reduce((v,r)=>v+r[2],0);
    assert.equal(actual.totalBytes,before.totalBytes+sum);assert.equal(actual.ownership.productRecording.bytes,before.ownership.productRecording.bytes+sum);
    for(const [,category,bytes] of files)assert.equal(actual.categories[category].bytes,(before.categories[category]?.bytes??0)+bytes);
    const observed=measureCurrentSqlitePages(root,(_binary,args)=>{assert.equal(args[1],path.join(root,'recordings/recording-generation-catalog.sqlite3'));return {status:0,stdout:'4096\n10\n3\n'};});
    assert.equal(observed.mainBytes,131);assert.equal(observed.walBytes,137);
    fs.unlinkSync(path.join(root,'recordings/recording-generation-catalog.sqlite3'));
    assert.equal(measureCurrentSqlitePages(root,()=>{throw Error('must not read old cache');}).status,'absent');
  });
  check('LP26-O06-C runner retains timeout and emits periodic and failure measurements',()=>{
    const runner=fs.readFileSync(new URL('./verify_recording_current_longrun.mjs',import.meta.url),'utf8');
    assert(runner.includes('AbortSignal.timeout(4000)'));assert(runner.includes("rootDiagnostic('sample')"));assert(runner.includes("rootDiagnostic('failure',measureCurrentRoot(root,{sqlitePages:true}),true)"));
    assert(runner.includes("const storage=measureCurrentRoot(root);if(storage.capExceeded){rootDiagnostic('root-cap')"));
    assert(runner.includes("rootDiagnostic('final',measureCurrentRoot(root,{sqlitePages:true}),true)"));assert(runner.includes('journalMutationTypesCoverage'));
  });
  check('B06-V04 staged components count as transaction, not committed generation',()=>{
    const before=measureCurrentRoot(root);write('recordings/.recording-generation-prepare-'+ 'a'.repeat(32)+'/snapshot-8.jsonl',151);
    const after=measureCurrentRoot(root);assert.equal(after.categories.generationTransaction.bytes,before.categories.generationTransaction.bytes+151);
    assert.deepEqual(after.categories.generationSnapshot,before.categories.generationSnapshot);assert.equal(after.totalBytes,before.totalBytes+151);
  });
}catch{if(!failed){failed++;console.log('[fail] LP26-O06 setup/runtime');}}
finally{
  let bytes=null;try{bytes=measureCurrentRoot(root).totalBytes;}catch{failed++;}
  fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);if(!absent)failed++;
  console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));
  console.log(JSON.stringify({scope:'root-storage-short-self-test',passed,failed,elapsedMs:Math.round(performance.now()-start),longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
  process.exitCode=failed?1:0;
}
