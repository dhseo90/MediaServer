// 파일 용도: LP26-O06 격리 root 용량 진단 자체검사. 제품/장시간 PASS가 아니다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {CURRENT_ROOT_CAP_BYTES,measureCurrentRoot,measureCurrentRootStable,measureCurrentSqlitePages,statCurrentRunEntry,isTransientSqliteJournalMiss,freezeCurrentWorkspace,measureCurrentWorkspace,workspaceBounds,createWorkspaceFailureCapture,admitWorkspaceSnapshot,measureCurrentCopy,runCurrentRecovery} from './recording_current_observer.mjs';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-root-storage-test-')));
fs.chmodSync(root,0o700);
const fdObservation={scope:'complete-round-sequential-v1',complete:true,startIdentity:'linux:1',startedAt:1,completedAt:2,roundStartedAt:1,roundCompletedAt:2,rounds:1,capacityRetries:0,closedRetries:0,detailCalls:1,failures:[]};
const start=performance.now();let passed=0,failed=0;
const check=(title,run)=>{try{run();passed++;console.log('[pass] '+title);}catch(error){failed++;console.log('[fail] '+title);throw error;}};
function write(name,bytes){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.alloc(bytes));return file;}
try{
  check('LP26-O06 R96 exact operands survive first rejection and later smaller sample',()=>{
    const directory=path.join(root,'failure-slot');fs.mkdirSync(directory,{mode:0o700});
    const sink=createWorkspaceFailureCapture(directory),storage={totalBytes:80,copyBytes:0,parentOutputBytes:5,measurementStartedAt:1,measurementCompletedAt:2};
    const metrics={fdObservation,valid:true,pid:12,startIdentity:'linux:1',anonymousFileBytes:25,anonymousAllocatedBytes:30,measurementStartedAt:0,measurementCompletedAt:1};
    assert.equal(fs.statSync(path.join(directory,'workspace-first-failure.json')).size,32768);
    let failure;try{admitWorkspaceSnapshot({storage,baseline:{fixedBytes:10,capBytes:100},metrics,expectedPid:12,expectedStart:'linux:1',context:{sampleIndex:495}},sink);}catch(e){failure=e;}
    assert.equal(failure.message,'workspace-variable-cap');assert.equal(failure.workspaceDecision.input.totalBytes,110);
    assert.equal(failure.workspaceDecision.excessBytes,0);assert.equal(failure.workspaceDecision.context.anonymousUsedBytes,30);
    assert.equal(failure.workspaceDecision.context.storage.measurementCompletedAt,2);
    assert.equal(sink.summary().decision.input.totalBytes,110);
    sink.capture(Error('later'));assert.equal(sink.summary().primary,'workspace-variable-cap');sink.close();sink.close();
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'workspace-first-failure.json'))).decision.input.totalBytes,110);
  });
  check('LP26-O06 R96 strict named/copy bounds and arithmetic overflow',()=>{
    assert.equal(workspaceBounds(109,10,99,100).variableBytes,99);
    for(const [values,code] of [[[110,10,0,100],'workspace-variable-cap'],[[109,10,100,100],'workspace-copy-cap'],[[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,0,100],'workspace-size-bound'],[[101,0,0,100],'workspace-variable-cap']]){
      assert.throws(()=>workspaceBounds(...values),e=>e.message===code&&e.workspaceDecision.input.totalBytes===values[0]);
    }
    // Combined cap cannot independently fail after both strict component inequalities pass.
    for(let live=0;live<100;live++)for(let copy=0;copy<100;copy++)assert(workspaceBounds(live+10,10,copy,100).combinedBytes<210);
  });
  check('LP26-O06 R96 missing/process replacement and copy anonymous rejected',()=>{
    for(const [name,metrics,copy,code] of [
      ['incomplete',{fdObservation:{...fdObservation,complete:false},valid:true,pid:12,startIdentity:'linux:1',anonymousFileBytes:0,anonymousAllocatedBytes:0},false,'workspace-process-measurement-invalid'],
      ['scope-missing',{valid:true,pid:12,startIdentity:'linux:1',anonymousFileBytes:0,anonymousAllocatedBytes:0},false,'workspace-process-measurement-invalid'],
      ['missing',{fdObservation,valid:true,pid:12,startIdentity:'linux:1'},false,'workspace-process-measurement-invalid'],
      ['changed',{fdObservation,valid:true,pid:13,startIdentity:'other',anonymousFileBytes:0,anonymousAllocatedBytes:0},false,'workspace-process-measurement-invalid'],
      ['copy',{fdObservation,valid:true,pid:12,startIdentity:'linux:1',anonymousFileBytes:30,anonymousAllocatedBytes:40},true,'workspace-copy-cap']]){
      const d=path.join(root,name);fs.mkdirSync(d);const sink=createWorkspaceFailureCapture(d);
      assert.throws(()=>admitWorkspaceSnapshot({storage:{totalBytes:20,copyBytes:60},baseline:{fixedBytes:10,capBytes:100},metrics,expectedPid:12,expectedStart:'linux:1',anonymousInCopy:copy},sink),e=>e.message===code);
      assert.equal(sink.summary().primary,code);sink.close();
    }
  });
  check('LP26-O06 R96 first cap plus short-write/fsync collection failure remain separate',()=>{
    for(const mode of ['short','sync']){const d=path.join(root,'failed-'+mode);fs.mkdirSync(d);let calls=0;
      const sink=createWorkspaceFailureCapture(d,mode==='short'?{write:(...args)=>++calls===1?fs.writeSync(...args):1}:{sync:fd=>{if(++calls>1)throw Error('injected-fsync');fs.fsyncSync(fd);}});
      assert.throws(()=>admitWorkspaceSnapshot({storage:{totalBytes:100,copyBytes:0},baseline:{fixedBytes:0,capBytes:100}},sink),e=>e.message==='workspace-variable-cap'&&e.workspaceEvidence.preserved===false);
      assert.equal(sink.summary().primary,'workspace-variable-cap');assert(sink.summary().collectionError);assert.throws(()=>sink.close());
    }
  });
  check('LP26-O06 R96 replaced reserved path is collection failure, replacement untouched',()=>{
    const d=path.join(root,'replaced');fs.mkdirSync(d);const sink=createWorkspaceFailureCapture(d),file=path.join(d,'workspace-first-failure.json');
    fs.renameSync(file,file+'.old');fs.writeFileSync(file,'replacement');
    assert.throws(()=>admitWorkspaceSnapshot({storage:{totalBytes:100},baseline:{fixedBytes:0,capBytes:100}},sink),/workspace-variable-cap/);
    assert.equal(sink.summary().collectionError,'workspace-evidence-identity');assert.equal(fs.readFileSync(file,'utf8'),'replacement');assert.throws(()=>sink.close());
    fs.unlinkSync(file);fs.unlinkSync(file+'.old');fs.rmdirSync(d);
  });
  check('LP26-O06 R96 actual child guard -> reserved file -> parent final record',()=>{
    const d=path.join(root,'child-capture');fs.mkdirSync(d);const module=new URL('./recording_current_observer.mjs',import.meta.url).href;
    const code=`import {createWorkspaceFailureCapture,admitWorkspaceSnapshot} from ${JSON.stringify(module)};
      const sink=createWorkspaceFailureCapture(process.argv[1]);let failed=false;
      try{admitWorkspaceSnapshot({storage:{totalBytes:101,copyBytes:0},baseline:{fixedBytes:0,capBytes:100},context:{decisionId:'child-first'}},sink);}catch{failed=true;}
      sink.close();console.log(JSON.stringify({failed,workspaceFailure:sink.summary()}));process.exitCode=failed?1:0;`;
    const child=spawnSync(process.execPath,['--input-type=module','-e',code,d],{encoding:'utf8',timeout:3000,maxBuffer:32768});
    assert.equal(child.status,1);assert.equal(child.signal,null);const final=JSON.parse(child.stdout),disk=JSON.parse(fs.readFileSync(path.join(d,'workspace-first-failure.json')));
    assert.deepEqual(final.workspaceFailure.decision,disk.decision);assert.equal(disk.decision.excessBytes,1);
  });
  check('LP26-O06 R96 named -> anonymous is distinct timed evidence, never silent subtraction',()=>{
    const file=write('transition-owned',77),fd=fs.openSync(file,'r');const before=fs.fstatSync(fd);fs.unlinkSync(file);const after=fs.fstatSync(fd);
    assert.equal(before.ino,after.ino);assert.equal(before.dev,after.dev);assert.equal(after.nlink,0);
    const d=path.join(root,'transition');fs.mkdirSync(d);const sink=createWorkspaceFailureCapture(d);
    assert.throws(()=>admitWorkspaceSnapshot({storage:{totalBytes:77,copyBytes:0},baseline:{fixedBytes:0,capBytes:150},metrics:{fdObservation,valid:true,pid:12,startIdentity:'linux:1',anonymousFileBytes:77,anonymousAllocatedBytes:77},expectedPid:12,context:{namedAt:1,anonymousAt:2,sameInode:true}},sink),/workspace-variable-cap/);
    assert.equal(sink.summary().decision.actual,154);assert.match(sink.summary().decision.context.simultaneity,/not an atomic peak/);sink.close();fs.closeSync(fd);
  });
  for(const name of ['failure-slot','incomplete','scope-missing','missing','changed','copy','failed-short','failed-sync','child-capture','transition']){fs.unlinkSync(path.join(root,name,'workspace-first-failure.json'));fs.rmdirSync(path.join(root,name));}
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
  check('B11-O04 live 파일 소멸은 전체 측정 재시작 후 정확히 포함',()=>{
    const rotating=write('recordings/channel/rotating.mp4',17);let misses=0;
    const measured=measureCurrentRootStable(root,{lstat:file=>{if(file===rotating&&misses++===0)throw Object.assign(Error('entry vanished'),{code:'ENOENT'});return fs.lstatSync(file);}});
    assert.equal(measured.transientTreeRetries,1);assert.equal(measured.categories.media.bytes,17);assert.equal(measured.categories.media.files,1);
    let unlinks=0;const unlinked=measureCurrentRootStable(root,{lstat:file=>{const stat=fs.lstatSync(file);if(file===rotating&&unlinks++===0)return new Proxy(stat,{get(target,key){return key==='nlink'?0:Reflect.get(target,key,target);}});return stat;}});
    assert.equal(unlinked.transientTreeRetries,1);assert.equal(unlinked.categories.media.bytes,17);
    let attempts=0;assert.throws(()=>measureCurrentRootStable(root,{lstat:file=>{if(file===rotating){attempts++;throw Object.assign(Error('entry vanished'),{code:'ENOENT'});}return fs.lstatSync(file);}}),/root-snapshot-retry-exhausted/);assert.equal(attempts,3);
    assert.throws(()=>measureCurrentRootStable(root,{lstat:file=>{const stat=fs.lstatSync(file);return file===rotating?new Proxy(stat,{get(target,key){return key==='nlink'?0:Reflect.get(target,key,target);}}):stat;}}),/root-snapshot-retry-exhausted/);
    assert.throws(()=>measureCurrentRootStable(root,{lstat:file=>{if(file===rotating)throw Object.assign(Error('permission'),{code:'EACCES'});return fs.lstatSync(file);}}),{code:'EACCES'});
    fs.unlinkSync(rotating);
  });
  check('B11-O04 세대 transaction의 일시적 두 링크는 전체 측정만 재시작',()=>{
    const recordings=path.join(root,'recordings'),stage=path.join(recordings,'.recording-generation-prepare-'+ 'b'.repeat(32));
    fs.mkdirSync(stage);const staged=path.join(stage,'snapshot-81.jsonl'),promoted=path.join(recordings,'snapshot-81.jsonl');
    fs.writeFileSync(staged,Buffer.alloc(19));fs.linkSync(staged,promoted);
    const receipt=path.join(recordings,'.recording-generation-transaction.json');let receiptReads=0;
    const measured=measureCurrentRootStable(root,{lstat:file=>{
      if(file===receipt){
        if(receiptReads++===0){const stat=fs.lstatSync(promoted);fs.unlinkSync(staged);return new Proxy(stat,{get(target,key){return key==='nlink'?1:Reflect.get(target,key,target);}});}
        throw Object.assign(Error('transaction closed'),{code:'ENOENT'});
      }
      return fs.lstatSync(file);
    }});
    assert.equal(measured.transientTreeRetries,1);assert.equal(measured.categories.generationSnapshot.bytes,19);
    fs.linkSync(promoted,staged);receiptReads=0;
    assert.throws(()=>measureCurrentRootStable(root,{lstat:file=>{
      if(file===receipt){receiptReads++;const stat=fs.lstatSync(promoted);return new Proxy(stat,{get(target,key){return key==='nlink'?1:Reflect.get(target,key,target);}});}
      return fs.lstatSync(file);
    }}),/root-generation-transition-retry-exhausted/);
    assert.equal(fs.lstatSync(promoted).nlink,2);assert(receiptReads>1);
    fs.unlinkSync(staged);fs.unlinkSync(promoted);fs.rmdirSync(stage);
  });
  check('B11-O04 세그먼트 partial 무교체 게시의 두 링크는 전체 측정만 재시작',()=>{
    const nonce='12345678-1234-1234-1234-123456789abc',directory=path.join(root,'recordings','publish');
    fs.mkdirSync(directory);const final=path.join(directory,'segment.mp4'),partial=final+'.partial.'+nonce;
    fs.writeFileSync(partial,Buffer.alloc(23));fs.linkSync(partial,final);let mediaReads=0;
    const measured=measureCurrentRootStable(root,{lstat:file=>{
      if((file===partial||file===final)&&++mediaReads===4)fs.unlinkSync(partial);
      return fs.lstatSync(file);
    }});
    assert(measured.transientTreeRetries>=1);assert.equal(measured.categories.media.bytes,23);
    assert.equal(measured.categories.media.files,1);assert.equal(measured.categories.mediaPartial.files,0);
    fs.linkSync(final,partial);
    assert.throws(()=>measureCurrentRootStable(root),/root-media-publication-retry-exhausted/);
    assert.equal(fs.lstatSync(final).nlink,2);
    fs.unlinkSync(partial);fs.unlinkSync(final);fs.rmdirSync(directory);
  });
  check('R135 diagnostic-only expected RED: recording publication rejected by default managed root',()=>{
    const dir=path.join(root,'recording','channel');fs.mkdirSync(dir,{recursive:true});
    const final=path.join(dir,'segment.mp4'),partial=final+'.partial.12345678-1234-1234-1234-123456789abc';
    fs.writeFileSync(partial,Buffer.alloc(23));fs.linkSync(partial,final);
    try{assert.throws(()=>measureCurrentRootStable(root),e=>{const d=e.collectorDiagnostic;
      assert.equal(e.message,'root-unsafe-file');assert.equal(d.top,'recording');assert.equal(d.category,'other');assert.equal(d.type,'regular');assert.equal(d.nlink,2);
      assert(d.counterpart.sameDev&&d.counterpart.sameIno);assert.equal(d.scan.attempt,1);
      const text=JSON.stringify(d);assert(!text.includes('segment')&&!text.includes(root));console.log('[R135-expected-red] '+text);return true;});}
    finally{fs.unlinkSync(partial);fs.unlinkSync(final);fs.rmdirSync(dir);fs.rmdirSync(path.dirname(dir));}
  });
  check('R135 explicit managed root: media restart, helpers, defaults and unsafe negatives',()=>{
    for(const top of ['recordings','recording']){
      const base=fs.mkdtempSync(path.join(root,'managed-')),dir=path.join(base,top,'channel');fs.mkdirSync(dir,{recursive:true});
      const opts={recordingTop:top},final=path.join(dir,'segment.mp4'),partial=final+'.partial.12345678-1234-1234-1234-123456789abc';
      fs.writeFileSync(final,Buffer.alloc(23));
      if(top==='recordings')assert.deepEqual(measureCurrentRootStable(base),measureCurrentRootStable(base,opts));
      assert.equal(measureCurrentRoot(base,opts).categories.media.bytes,23);
      fs.linkSync(final,partial);let reads=0;
      const m=measureCurrentRootStable(base,{...opts,lstat:file=>{if((file===final||file===partial)&&++reads===4)fs.unlinkSync(partial);return fs.lstatSync(file);}});
      assert(m.transientTreeRetries>=1);assert.equal(m.categories.media.bytes,23);assert.equal(m.categories.mediaPartial.bytes,0);assert.equal(m.ownership.productRecording.bytes,23);
      fs.linkSync(final,partial);assert.throws(()=>measureCurrentRootStable(base,opts),/root-media-publication-retry-exhausted/);fs.unlinkSync(partial);
      // Keep the unrelated second link outside the measured base: only the intended media operand can reject.
      const alias=path.join(root,'outside-alias-'+top);fs.linkSync(final,alias);
      const rejectMedia=(counterpart,nlink=2)=>assert.throws(()=>measureCurrentRootStable(base,opts),e=>{
        const d=e.collectorDiagnostic;assert.equal(e.message,'root-unsafe-file');assert.equal(d.category,'media');assert.equal(d.top,top);assert.equal(d.type,'regular');assert.equal(d.nlink,nlink);assert.equal(d.ino,fs.lstatSync(final).ino);counterpart(d.counterpart);return true;
      });
      rejectMedia(c=>assert.equal(c.exists,false)); // unrelated external pair
      fs.writeFileSync(partial,'different');rejectMedia(c=>{assert.equal(c.type,'regular');assert.equal(c.sameIno,false);});fs.unlinkSync(partial);
      fs.mkdirSync(partial);rejectMedia(c=>assert.equal(c.type,'directory'));fs.rmdirSync(partial);
      fs.symlinkSync(final,partial);rejectMedia(c=>assert.equal(c.type,'symlink'));fs.unlinkSync(partial);
      fs.linkSync(final,partial);rejectMedia(c=>assert(c.sameIno),3);fs.unlinkSync(partial);fs.unlinkSync(alias);
      fs.linkSync(final,final+'.partial.invalid');rejectMedia(c=>assert.equal(c.exists,false));fs.unlinkSync(final+'.partial.invalid');
      for(const other of ['tmp','other']){fs.mkdirSync(path.join(base,other));const link=path.join(base,other,'hardlink');fs.linkSync(final,link);assert.throws(()=>measureCurrentRootStable(base,opts),/root-unsafe-file/);fs.unlinkSync(link);}
      const outside=path.join(root,'outside.mp4.partial.12345678-1234-1234-1234-123456789abc');fs.linkSync(final,outside);assert.throws(()=>measureCurrentRootStable(base,opts),/root-unsafe-file/);fs.unlinkSync(outside);
      // Device/socket stats must reach the same fail-closed nonregular branch; no device creation is needed.
      for(const type of ['socket','device']){fs.writeFileSync(final,'nonregular-stat');assert.throws(()=>measureCurrentRootStable(base,{...opts,lstat:file=>{const st=fs.lstatSync(file);return file===final?Object.assign(Object.create(st),{isFile:()=>false,isDirectory:()=>false,isSymbolicLink:()=>false,isSocket:()=>type==='socket',isCharacterDevice:()=>type==='device'}):st;}}),e=>e.message==='root-unsafe-file'&&e.collectorDiagnostic.type==='other');fs.unlinkSync(final);}
      const fifo=path.join(dir,'fifo');assert.equal(spawnSync('mkfifo',[fifo]).status,0);assert.throws(()=>measureCurrentRootStable(base,opts),e=>e.message==='root-unsafe-file'&&e.collectorDiagnostic.type==='other');fs.unlinkSync(fifo);
      const symlink=path.join(dir,'escape');fs.symlinkSync(root,symlink);assert.throws(()=>measureCurrentRootStable(base,opts),/root-unsafe-symlink/);fs.unlinkSync(symlink);
      const journal=path.join(base,top,'recording-generation-catalog.sqlite3-journal');
      assert(isTransientSqliteJournalMiss(base,journal,{code:'ENOENT'},opts));assert(!isTransientSqliteJournalMiss(base,path.join(base,top==='recording'?'recordings':'recording','recording-generation-catalog.sqlite3-journal'),{code:'ENOENT'},opts));
      assert.equal(statCurrentRunEntry(base,journal,()=>{throw Object.assign(Error(),{code:'ENOENT'});},opts),null);
      fs.writeFileSync(path.join(base,top,'recording-generation.json'),'marker');fs.writeFileSync(path.join(base,top,'recording-generation-catalog.sqlite3'),'db');
      assert.equal(measureCurrentSqlitePages(base,(_b,args)=>{assert.equal(args[1],path.join(base,top,'recording-generation-catalog.sqlite3'));return {status:0,stdout:'4096 1 0'};},opts).liveBytes,4096);
      const stage=path.join(base,top,'.recording-generation-prepare-'+ 'a'.repeat(32));fs.mkdirSync(stage);const staged=path.join(stage,'snapshot-9.jsonl'),promoted=path.join(base,top,'snapshot-9.jsonl');fs.writeFileSync(staged,'snapshot');fs.linkSync(staged,promoted);
      const receipt=path.join(base,top,'.recording-generation-transaction.json');fs.writeFileSync(receipt,'receipt');let observed=false;
      const g=measureCurrentRootStable(base,{...opts,lstat:file=>{const st=fs.lstatSync(file);if(file===receipt&&!observed){observed=true;fs.unlinkSync(staged);}return st;}});assert(observed&&g.transientTreeRetries>=1);assert.equal(g.categories.generationSnapshot.bytes,8);
      fs.rmSync(base,{recursive:true});
    }
    for(const recordingTop of ['../recording','/recording','tmp','',null])assert.throws(()=>measureCurrentRoot(root,{recordingTop}),/root-recording-top-invalid/);
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
    assert(runner.includes('AbortSignal.timeout(4000)'));assert(runner.includes("rootDiagnostic('sample')"));assert(runner.includes("rootDiagnostic('failure-live',storageNow(),true)"));
    assert(runner.includes("const storage=storageNow();if(storage.capExceeded){rootDiagnostic('root-cap')"));
    assert(runner.includes("rootDiagnostic('final-live',storageNow(),true)"));assert(runner.includes('journalMutationTypesCoverage'));
  });
  check('B11-O05 live SQLite PRAGMA를 금지하고 종료 뒤에만 page 통계를 측정',()=>{
    const runner=fs.readFileSync(new URL('./verify_recording_current_longrun.mjs',import.meta.url),'utf8');
    assert(runner.includes('function rootDiagnostic(reason,measurement=storageNow(),final=false)'));
    const stopped=runner.indexOf('for(const app of processes)try{await stop(app);}catch{failed++;}');
    const postStop=runner.indexOf("rootDiagnostic('post-stop',{...measureCurrentRootStable(root,{sqlitePages:true}),...storageNow()},true)");
    assert(stopped>=0&&postStop>stopped);
    const live=runner.slice(0,stopped);assert(!live.includes("measureCurrentRootStable(root,{sqlitePages:true})"));
  });
  check('B06-V04 staged components count as transaction, not committed generation',()=>{
    const before=measureCurrentRoot(root);write('recordings/.recording-generation-prepare-'+ 'a'.repeat(32)+'/snapshot-8.jsonl',151);
    const after=measureCurrentRoot(root);assert.equal(after.categories.generationTransaction.bytes,before.categories.generationTransaction.bytes+151);
    assert.deepEqual(after.categories.generationSnapshot,before.categories.generationSnapshot);assert.equal(after.totalBytes,before.totalBytes+151);
  });
  const workspaceRoot=path.join(root,'workspace');fs.mkdirSync(workspaceRoot,{mode:0o700});fs.mkdirSync(path.join(workspaceRoot,'input'));
  for(const name of ['input/retention-9101.mp4','input/retention-9201.mp4','normalize','process-metrics','catalog-instrumented.cpp'])fs.writeFileSync(path.join(workspaceRoot,name),'fixed');
  const baseline=freezeCurrentWorkspace(workspaceRoot,{capBytes:1024,inputMaxBytes:64});
  check('W01 fixed/variable total and unknown files',()=>{assert.equal(baseline.fixedBytes,25);fs.writeFileSync(path.join(workspaceRoot,'new-unknown'),Buffer.alloc(7));const m=measureCurrentWorkspace(workspaceRoot,baseline);assert.equal(m.totalBytes,32);assert.equal(m.variableBytes,7);assert.equal(measureCurrentRoot(workspaceRoot).capBytes,CURRENT_ROOT_CAP_BYTES);});
  check('W02 boundary equality and overage fail closed',()=>{assert.equal(workspaceBounds(1023+25,25,1023,1024).combinedBytes,2071);for(const n of [1024,1025]){assert.throws(()=>workspaceBounds(n+25,25,0,1024));assert.throws(()=>workspaceBounds(25,25,n,1024));}assert.throws(()=>workspaceBounds(25+1024,25,1024,1024));});
  check('W03 changed, replaced, missing fixed files are never rebased',()=>{const f=path.join(workspaceRoot,'normalize');fs.appendFileSync(f,'x');assert.throws(()=>measureCurrentWorkspace(workspaceRoot,baseline));fs.unlinkSync(f);assert.throws(()=>measureCurrentWorkspace(workspaceRoot,baseline));fs.writeFileSync(f,'fixed');assert.throws(()=>measureCurrentWorkspace(workspaceRoot,baseline));});
  const current=freezeCurrentWorkspace(workspaceRoot,{capBytes:1024,inputMaxBytes:64}),copyRoot=path.join(root,'workspace-copy');fs.mkdirSync(copyRoot,{mode:0o700});const cs=fs.statSync(copyRoot),copy={root:copyRoot,identity:{dev:cs.dev,ino:cs.ino}};
  check('W04 copy ownership symlink and entry limits',()=>{fs.symlinkSync(workspaceRoot,path.join(copyRoot,'escape'));assert.throws(()=>measureCurrentCopy(copyRoot,copy.identity));fs.unlinkSync(path.join(copyRoot,'escape'));for(let i=0;i<4096;i++)fs.writeFileSync(path.join(copyRoot,String(i)),'');assert.throws(()=>measureCurrentCopy(copyRoot,copy.identity));for(let i=0;i<4096;i++)fs.unlinkSync(path.join(copyRoot,String(i)));});
  const observe=()=>measureCurrentWorkspace(workspaceRoot,current,copy);
  const run=script=>runCurrentRecovery({command:process.execPath,args:['-e',script],env:{PATH:process.env.PATH},observe,timeoutMs:1500,intervalMs:20});
  const success=await run('setTimeout(()=>process.exit(0),70)');check('W05 async native success monitored and group closed',()=>{assert.equal(success.status,0);assert.equal(success.monitor.failure,null);assert(success.monitor.samples>1&&success.groupClosed);});
  const growth=await run('require("fs").writeFileSync('+JSON.stringify(path.join(copyRoot,'native-temp'))+',Buffer.alloc(1024));setInterval(()=>{},1000)');
  check('W06 actual native temporary growth detected during execution',()=>{assert.equal(growth.monitor.failure,'workspace-copy-cap');assert(growth.groupClosed);assert.notEqual(growth.status,0);});fs.unlinkSync(path.join(copyRoot,'native-temp'));
  const childFailure=await run('process.exit(7)');check('W07 child failure remains failure',()=>{assert.equal(childFailure.status,7);assert(childFailure.groupClosed);});
  let probes=0;const monitorFailure=await runCurrentRecovery({command:process.execPath,args:['-e','setInterval(()=>{},1000)'],env:{PATH:process.env.PATH},observe:()=>{if(++probes>1)throw Error('injected-monitor-failure');},timeoutMs:1500,intervalMs:20});
  check('W08 observation failure stops child and cannot pass',()=>{assert.equal(monitorFailure.monitor.failure,'injected-monitor-failure');assert(monitorFailure.groupClosed);});
}catch{if(!failed){failed++;console.log('[fail] LP26-O06 setup/runtime');}}
finally{
  let bytes=null;try{bytes=measureCurrentRoot(root).totalBytes;}catch{failed++;}
  fs.rmSync(root,{recursive:true});const absent=!fs.existsSync(root);if(!absent)failed++;
  console.log('[cleanup] '+JSON.stringify({root,bytes,absent}));
  console.log(JSON.stringify({scope:'root-storage-short-self-test',passed,failed,elapsedMs:Math.round(performance.now()-start),longrunPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
  process.exitCode=failed?1:0;
}
