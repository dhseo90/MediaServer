// 파일 용도: actual-app의 live 용량 재측정과 엄격한 archive 순회를 분리한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {statCurrentRunEntry} from './recording_current_observer.mjs';

// archive/copy 호출은 기존 파일 목록·hash·single-link 판정을 그대로 사용한다.
export function scanCurrentAppTree(root,directory,{hash=false,strict=false,live=false}={},io=fs){
  if(live&&(directory!==root||hash||strict))throw Error('live-scan-mode');
  const result=[];let bytes=0,entries=0,transientJournalMisses=0;
  function visit(current){
    if(live&&io.realpathSync(current)!==current)throw Error('live-scan-directory-path');
    for(const name of io.readdirSync(current).sort()){
      if(live&&(!name||name==='.'||name==='..'||path.basename(name)!==name))throw Error('live-scan-entry-path');
      const full=path.join(current,name);if(++entries>4096)throw Error('root-entry-cap');
      let s;
      try{s=hash||strict||live?io.lstatSync(full):statCurrentRunEntry(root,full,io.lstatSync);}
      catch(error){
        // 목록화된 항목의 lstat ENOENT만 재측정 원인이다. 부분 결과는 반환하지 않는다.
        if(live&&error.code==='ENOENT')throw Object.assign(Error('live-scan-entry-disappeared'),{code:'ENOENT',entryDisappeared:true,cause:error});
        throw error;
      }
      if(!s){transientJournalMisses++;continue;}
      if(s.isDirectory()){visit(full);continue;}
      bytes+=s.size;if(bytes>512*1024*1024)throw Error('root-byte-cap');
      if(s.isSymbolicLink()){if(strict)throw Error('archive-symlink');continue;}
      if(!s.isFile()||(strict&&s.nlink!==1))throw Error('archive-not-regular-single-link');
      const item={path:path.relative(directory,full),bytes:s.size};
      if(hash){const digest=crypto.createHash('sha256'),fd=io.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const after=io.fstatSync(fd);if(after.ino!==s.ino||after.dev!==s.dev)throw Error('file-race');const buffer=Buffer.alloc(65536);let n;while((n=io.readSync(fd,buffer,0,buffer.length,null)))digest.update(buffer.subarray(0,n));item.hash=digest.digest('hex');}finally{io.closeSync(fd);}}
      result.push(item);
    }
  }
  visit(directory);return {bytes,entries,files:result,transientJournalMisses};
}

// live 측정은 무결성 판정이 아니다. 새 전체 측정 최대 3회이며 archive/hash에는 적용하지 않는다.
export function measureCurrentAppBudget(root,identity,{guard=()=>{},report=()=>{},io=fs}={}){
  let attempts=0;
  function bound(){
    const current=io.lstatSync(root,{bigint:true});
    if(!current.isDirectory()||current.isSymbolicLink()||io.realpathSync(root)!==root||path.resolve(root)!==root||
      current.dev!==identity.dev||current.ino!==identity.ino||current.uid!==identity.uid||current.uid!==BigInt(process.getuid())||
      (current.mode&0o777n)!==0o700n)throw Error('live-scan-root-binding');
  }
  try{
    for(;;){
      guard();bound();attempts++;
      try{
        const measured=scanCurrentAppTree(root,root,{live:true},io);
        bound();guard();report({attempts,retries:attempts-1,outcome:'pass'});return measured;
      }catch(error){
        bound();guard();
        if(!error.entryDisappeared||error.code!=='ENOENT')throw error;
        if(attempts===3)throw Error('root-live-scan-retry-exhausted',{cause:error});
      }
    }
  }catch(error){report({attempts,retries:Math.max(0,attempts-1),outcome:'fail'});throw error;}
}
