// 파일 용도: 녹화 원장 증분 판독의 경계와 오류 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
const start=Date.now(), readers=[];
let passed=0, failed=0;
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-journal-reader-')));
const fixture=(id='m1',type='segment_finalized')=>JSON.stringify({schema:'media-server.recording-mutation.v1',mutationId:id,mutationType:type,occurredAtMs:1,entityId:'entity',payload:{note:'영상'}});
const check=(name,fn)=>{try{fn();passed++;console.log(`[pass] ${name}`);}catch(e){failed++;console.log(`[fail] ${name}`);throw e;}};
function reader(file='journal.jsonl',options) { const r=new RecordingJournalReader(root,file,options);readers.push(r);return r; }
function bytes(p) { const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+bytes(path.join(p,x)),0):s.size; }
try {
  fs.writeFileSync(path.join(root,'journal.jsonl'),fixture()+'\n');
  const r=reader();
  check('JR01 complete LF row emitted',()=>assert.equal(r.poll().batch.length,1));
  if(process.argv[2]!=='--red') {
    check('JR01 repeated poll no duplicate',()=>assert.equal(r.poll().batch.length,0));
    check('JR01 byte offset includes UTF8 bytes',()=>assert.equal(r.offset,Buffer.byteLength(fixture()+'\n')));
    fs.appendFileSync(path.join(root,'journal.jsonl'),fixture('m2')+'\n');
    check('JR01 append next row only',()=>assert.equal(r.poll().batch[0].mutationId,'m2'));
    fs.writeFileSync(path.join(root,'empty'),'');
    check('JR01 empty regular file',()=>assert.deepEqual(reader('empty').poll().batch,[]));
    fs.writeFileSync(path.join(root,'tail'),fixture('no-lf'));
    const tail=reader('tail');
    check('JR02 complete JSON without LF unconsumed',()=>{
      const result=tail.poll();assert.equal(result.batch.length,0);assert.equal(result.consumedOffset,0);assert.equal(result.partialBytes,Buffer.byteLength(fixture('no-lf')));assert.equal(result.backlogBytes,0);assert.equal(result.backlog,false);
    });
    fs.writeFileSync(path.join(root,'tail'),fixture('repaired')+'\n');
    check('JR02 tail replacement reread without old concatenation',()=>assert.equal(tail.poll().batch[0].mutationId,'repaired'));
    const utf=Buffer.from(fixture('utf')+'\n'), split=utf.indexOf(Buffer.from('영상'))+1;
    fs.writeFileSync(path.join(root,'utf'),utf.subarray(0,split));
    const u=reader('utf',{chunkBytes:7});
    check('JR02 split UTF8 no premature decode',()=>assert.equal(u.poll().batch.length,0));
    fs.appendFileSync(path.join(root,'utf'),utf.subarray(split));
    check('JR02 split UTF8 append recovered',()=>assert.equal(u.poll().batch[0].payload.note,'영상'));
    fs.writeFileSync(path.join(root,'partial-after-prefix'),fixture('prefix')+'\n'+fixture('old'));
    const p=reader('partial-after-prefix');
    const consumed=p.poll().consumedOffset;
    fs.truncateSync(path.join(root,'partial-after-prefix'),consumed);
    fs.appendFileSync(path.join(root,'partial-after-prefix'),fixture('new')+'\n');
    check('JR02 repair after consumed prefix',()=>assert.equal(p.poll().batch[0].mutationId,'new'));
    const many=Array.from({length:20},(_,i)=>fixture('batch-'+i)+'\n').join('');
    fs.writeFileSync(path.join(root,'many'),many);
    const b=reader('many',{chunkBytes:64,pollBytes:512,lineBytes:256});
    const first=b.poll(), ids=first.batch.map(x=>x.mutationId);
    check('JR03 poll byte budget and backlog',()=>{assert.equal(first.readBytes,512);assert(first.backlog);assert(first.backlogBytes>0);});
    check('JR03 poll boundary partial distinguished from EOF',()=>{assert(first.partialBytes>0);assert.equal(first.consumedBytes+first.partialBytes,512);assert(first.backlog);});
    check('JR03 bounded poll progress and completion',()=>{
      for(let attempts=0;b.offset<Buffer.byteLength(many)&&attempts<20;attempts++) {
        const previous=b.offset,result=b.poll();
        assert(result.consumedOffset>previous);
        ids.push(...result.batch.map(x=>x.mutationId));
      }
      assert.equal(b.offset,Buffer.byteLength(many));
    });
    check('JR03 bounded multi poll no missing duplicate',()=>assert.deepEqual(ids,Array.from({length:20},(_,i)=>'batch-'+i)));
    const large=Array.from({length:26000},(_,i)=>fixture('large-'+i)+'\n').join('');
    fs.writeFileSync(path.join(root,'large'),large);
    const largeReader=reader('large'), largeFirst=largeReader.poll();
    check('JR03 default 4MiB read ceiling',()=>{assert.equal(largeFirst.readBytes,4194304);assert(largeFirst.backlog);});
    const largeSecond=largeReader.poll();
    check('JR03 default ceiling complete second batch',()=>{assert.equal(largeFirst.batch.length+largeSecond.batch.length,26000);assert.equal(largeSecond.consumedOffset,Buffer.byteLength(large));assert.equal(largeSecond.backlog,false);});
    fs.writeFileSync(path.join(root,'long'),Buffer.alloc(1048577,65));
    const long=reader('long');
    check('JR03 default line bound',()=>assert.throws(()=>long.poll(),/line-limit/));
    fs.writeFileSync(path.join(root,'long'),'');
    check('JR03 line error latched after file repaired',()=>assert.throws(()=>long.poll(),/line-limit/));
    check('JR03 invalid limits rejected',()=>assert.throws(()=>reader('empty',{pollBytes:10,lineBytes:20}),/invalid-limits/));
    const allTypes=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
    fs.writeFileSync(path.join(root,'types'),allTypes.map((t,i)=>fixture('type'+i,t)+'\n').join(''));
    check('JR04 seven known types accepted',()=>assert.deepEqual(reader('types').poll().batch.map(x=>x.mutationType),allTypes));
    const bad=[['json','{broken}\n'],['schema',JSON.stringify({...JSON.parse(fixture()),schema:'wrong'})+'\n'],
      ['type',fixture('bad','unknown')+'\n'],['field',JSON.stringify({...JSON.parse(fixture()),entityId:null})+'\n'],
      ['payload',JSON.stringify({...JSON.parse(fixture()),payload:[]})+'\n'],['integer',JSON.stringify({...JSON.parse(fixture()),occurredAtMs:1.5})+'\n']];
    for(const [name,text] of bad) {
      fs.writeFileSync(path.join(root,'bad-'+name),text);
      check(`JR04 ${name} rejected`,()=>assert.throws(()=>reader('bad-'+name).poll(),/invalid-/));
    }
    fs.writeFileSync(path.join(root,'invalid-utf'),Buffer.from([0xff,10]));
    check('JR04 invalid UTF8 rejected',()=>assert.throws(()=>reader('invalid-utf').poll(),/invalid-json-or-utf8/));
    fs.writeFileSync(path.join(root,'replace'),fixture()+'\n');
    const replaced=reader('replace');replaced.poll();
    fs.renameSync(path.join(root,'replace'),path.join(root,'old-inode'));
    fs.writeFileSync(path.join(root,'replace'),fixture()+'\n');
    check('JR05 inode replacement latched',()=>assert.throws(()=>replaced.poll(),/file-replaced/));
    fs.writeFileSync(path.join(root,'truncate'),fixture()+'\n');
    const truncated=reader('truncate');truncated.poll();fs.truncateSync(path.join(root,'truncate'),0);
    check('JR05 consumed prefix truncate rejected',()=>assert.throws(()=>truncated.poll(),/consumed-prefix-truncated/));
    fs.appendFileSync(path.join(root,'truncate'),fixture()+'\n');
    check('JR05 truncate latch prevents reset',()=>assert.throws(()=>truncated.poll(),/consumed-prefix-truncated/));
    fs.symlinkSync('empty',path.join(root,'symlink'));
    check('JR05 leaf symlink rejected',()=>assert.throws(()=>reader('symlink'),/unsafe-file/));
    fs.mkdirSync(path.join(root,'dir'));fs.symlinkSync('dir',path.join(root,'parent-link'));
    fs.writeFileSync(path.join(root,'dir','file'),'');
    check('JR05 parent symlink rejected',()=>assert.throws(()=>reader('parent-link/file'),/unsafe-directory/));
    check('JR05 symlink root rejected',()=>assert.throws(()=>new RecordingJournalReader(path.join(root,'parent-link'),'file'),/unsafe-directory/));
    fs.mkdirSync(path.join(root,'pinned'));fs.writeFileSync(path.join(root,'pinned','file'),'');
    const parentPinned=reader('pinned/file');
    fs.renameSync(path.join(root,'pinned'),path.join(root,'pinned-old'));fs.mkdirSync(path.join(root,'pinned'));fs.writeFileSync(path.join(root,'pinned','file'),'');
    check('JR05 parent replacement rejected',()=>assert.throws(()=>parentPinned.poll(),/parent-replaced/));
    check('JR05 root escape rejected',()=>assert.throws(()=>reader('../outside'),/root-escape/));
    check('JR05 nonregular directory rejected',()=>assert.throws(()=>reader('dir'),/unsafe-file/));
    check('JR05 absent file rejected',()=>assert.throws(()=>reader('missing'),/open-unavailable/));
    fs.linkSync(path.join(root,'empty'),path.join(root,'hardlink'));
    check('JR05 hardlink rejected',()=>assert.throws(()=>reader('hardlink'),/unsafe-file/));
    fs.writeFileSync(path.join(root,'removed'),'');const removed=reader('removed');fs.unlinkSync(path.join(root,'removed'));
    check('JR05 read path error latch',()=>assert.throws(()=>removed.poll(),/read-unavailable|file-replaced/));
    r.close();r.close();
    check('JR05 closed poll rejected',()=>assert.throws(()=>r.poll(),/reader-closed/));
  }
} catch(e) { if (!failed) {failed++;console.log('[fail] test setup or runtime error');} }
finally {
  for(const r of readers) { try{r.close();}catch{failed++;console.log('[fail] reader close');} }
  const size=bytes(root);
  fs.rmSync(root,{recursive:true});
  let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
  if(!absent) failed++;
  console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
  console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음'}));
  process.exitCode=failed?1:0;
}
