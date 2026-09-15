// 실제 서버 없이 adapter의 원본/alias 거부를 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('S11-CI11 adapter 원본선택·symlink·원본hardlink 거부와 원본불변',()=>{
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-current-integration-unit-')));fs.chmodSync(root,0o700);
  const directory=path.dirname(fileURLToPath(import.meta.url));
  try{
    for(const sub of ['recordings','projection-copy-1/recordings','tmp','gst-cache'])fs.mkdirSync(path.join(root,sub),{recursive:true,mode:0o700});
    const original=path.join(root,'recordings/fixture'),copy=path.join(root,'projection-copy-1/recordings/fixture');fs.writeFileSync(original,'source-unchanged',{mode:0o600});
    const before=fs.readFileSync(original),stat=fs.statSync(original);
    const build=spawnSync('/bin/bash',[path.join(directory,'build_recording_current_archive_probe.sh'),root],{env:{PATH:process.env.PATH,HOME:root,TMPDIR:path.join(root,'tmp')},encoding:'utf8',timeout:30000});
    assert.equal(build.status,0,'adapter compile 선수조건 실패: '+build.stderr);
    const run=index=>spawnSync(path.join(root,'archive-probe'),[root,index,'reference-unit'],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:5000});
    let result=run('recordings');assert.equal(result.status,1);assert.match(result.stderr,/copy-index/);
    fs.symlinkSync(original,copy);result=run('1');assert.equal(result.status,1);assert.match(result.stderr,/copy-entry-bound/);fs.unlinkSync(copy);
    fs.linkSync(original,copy);result=run('1');assert.equal(result.status,1);assert.match(result.stderr,/copy-regular-single-link/);fs.unlinkSync(copy);
    assert.deepEqual(fs.readFileSync(original),before);assert.equal(fs.statSync(original).ino,stat.ino);assert.equal(fs.statSync(original).nlink,1);
  }finally{
    let bytes=0;function size(dir){for(const item of fs.readdirSync(dir)){const file=path.join(dir,item),s=fs.lstatSync(file);if(s.isDirectory())size(file);else bytes+=s.size;}}size(root);
    fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));console.log(`[cleanup] path=${root} bytes=${bytes} absent=true`);
  }
});
