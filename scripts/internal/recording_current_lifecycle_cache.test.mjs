// 파일 용도: 격리 SQLite로 lifecycle hold 관측 경로를 검증한다. 실제 HTTP/UI 검사는 아니다.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {readRecordingLifecycleHold} from './verify_v410_recording_ui_contract.mjs';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-lifecycle-cache-')));fs.chmodSync(root,0o700);
const identity=fs.lstatSync(root);let sequence=0;
function sql(db,text){execFileSync('/usr/bin/sqlite3',[db,text],{encoding:'utf8'});}
function fixture(generation){
 const base=path.join(root,String(++sequence)),dir=path.join(base,'recordings');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(dir,'.recording-store-format'),JSON.stringify({format:`media-server.managed-recording-store.v${generation?2:1}`,storeId:'fixture'}));
 if(generation)fs.writeFileSync(path.join(dir,'recording-generation.json'),'{}');
 const legacy=path.join(dir,'recording-catalog.sqlite3'),current=path.join(dir,'recording-generation-catalog.sqlite3');
 sql(legacy,"CREATE TABLE recording_segment_states_v2(segment_id TEXT,hold_count INTEGER); INSERT INTO recording_segment_states_v2 VALUES('segment',7)");
 if(generation)sql(current,"CREATE TABLE b_hold(id TEXT PRIMARY KEY,count INTEGER); INSERT INTO b_hold VALUES('segment',0)");
 return {base,dir,legacy,current};
}
test('B06-V04 legacy lifecycle hold0/1 uses legacy cache',()=>{
 const f=fixture(false);for(const count of [0,1,0]){sql(f.legacy,`UPDATE recording_segment_states_v2 SET hold_count=${count}`);assert.equal(readRecordingLifecycleHold(f.base,'segment'),count);}
});
test('B06-V04 B lifecycle uses current cache, not stale legacy value',()=>{
 const f=fixture(true);for(const count of [0,1,0]){sql(f.current,`UPDATE b_hold SET count=${count}`);assert.equal(readRecordingLifecycleHold(f.base,'segment'),count);}
 assert.equal(execFileSync('/usr/bin/sqlite3',['-readonly',f.legacy,'SELECT hold_count FROM recording_segment_states_v2'],{encoding:'utf8'}).trim(),'7');
});
test('B06-V04 B missing cache/row and invalid count never become hold0 or legacy fallback',()=>{
 const f=fixture(true);assert.throws(()=>readRecordingLifecycleHold(f.base,'missing'),/hold row missing or invalid/);
 for(const value of ['-1','1.5',"'unknown'"]){sql(f.current,`UPDATE b_hold SET count=${value}`);assert.throws(()=>readRecordingLifecycleHold(f.base,'segment'),/hold row missing or invalid/);}
 fs.unlinkSync(f.current);assert.throws(()=>readRecordingLifecycleHold(f.base,'segment'),/ENOENT/);assert(!fs.existsSync(f.current));
});
test('B06-V04 unknown format and manifest contradiction fail closed',()=>{
 const f=fixture(false);fs.writeFileSync(path.join(f.dir,'recording-generation.json'),'{}');assert.throws(()=>readRecordingLifecycleHold(f.base,'segment'),/manifest format mismatch/);
 fs.writeFileSync(path.join(f.dir,'.recording-store-format'),'{"format":"unknown"}');assert.throws(()=>readRecordingLifecycleHold(f.base,'segment'),/managed format/);
});
after(()=>{
 const now=fs.lstatSync(root);assert(now.dev===identity.dev&&now.ino===identity.ino&&now.uid===process.getuid()&&!now.isSymbolicLink()&&path.dirname(fs.realpathSync(root))===fs.realpathSync(os.tmpdir()));
 function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,x)=>n+size(path.join(p,x)),0):s.size;}
 const bytes=size(root);fs.rmSync(root,{recursive:true});console.log(`[cleanup] path=${root} bytes=${bytes} removed=${!fs.existsSync(root)}`);assert(!fs.existsSync(root));
});
