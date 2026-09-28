// 파일 용도: 관측용 bounded reader. strict duplicate-key/catalog 검증이나 fsync 판정이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import {TextDecoder} from 'node:util';
const types=new Set(['segment_finalized','event_link_created','observation_put','observation_v2_put',
  'deletion_requested','deletion_completed','corruption_detected']);
const fail=code=>Object.assign(new Error(code),{code});
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const opaque=x=>typeof x==='string'&&x.length>0;
function envelope(bytes) {
  let value;
  try { value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
  catch { throw fail('invalid-json-or-utf8'); }
  if(!object(value)||value.schema!=='media-server.recording-mutation.v1'||!types.has(value.mutationType)||
    !opaque(value.mutationId)||!opaque(value.entityId)||!Number.isSafeInteger(value.occurredAtMs)||!object(value.payload))
    throw fail('invalid-envelope');
  return value;
}
function directories(target) {
  const output=[];
  let current=path.parse(target).root;
  for(const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
    current=path.join(current,part);
    const stat=fs.lstatSync(current,{bigint:true});
    if(!stat.isDirectory()||stat.isSymbolicLink()) throw fail('unsafe-directory');
    output.push({path:current,stat});
  }
  return output;
}
export class RecordingJournalReader {
  constructor(root,file,{chunkBytes=65536,pollBytes=4194304,lineBytes=1048576,nativeLines=false}={}) {
    this.offset=0;
    this.error=null;
    this.fd=null;
    this.closed=false;
    if(typeof root!=='string'||!path.isAbsolute(root)||typeof file!=='string'||!file.length) throw fail('invalid-path');
    this.root=path.resolve(root);
    this.file=path.resolve(this.root,file);
    if(this.file===this.root||!this.file.startsWith(this.root+path.sep)) throw fail('root-escape');
    if(![chunkBytes,pollBytes,lineBytes].every(Number.isSafeInteger)||chunkBytes<1||chunkBytes>65536||
      typeof nativeLines!=='boolean'||pollBytes<chunkBytes||pollBytes>(nativeLines?33554432:4194304)||
      lineBytes<1||lineBytes>(nativeLines?16777216:1048576)||lineBytes>=pollBytes) throw fail('invalid-limits');
    this.nativeLines=nativeLines;
    this.chunkBytes=chunkBytes;
    this.pollBytes=pollBytes;
    this.lineBytes=lineBytes;
    try {
      this.parents=directories(path.dirname(this.file));
      const stat=fs.lstatSync(this.file,{bigint:true});
      if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1n) throw fail('unsafe-file');
      this.fd=fs.openSync(this.file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
      this.identity=fs.fstatSync(this.fd,{bigint:true});
      if(!same(stat,this.identity)) throw fail('file-replaced');
      this.validate();
    } catch(e) {
      if(this.fd!==null) {fs.closeSync(this.fd);this.fd=null;}
      throw fail(e.code?.startsWith('E')?'open-unavailable':e.code||'open-unavailable');
    }
  }
  validate() {
    for(const parent of this.parents) {
      const current=fs.lstatSync(parent.path,{bigint:true});
      if(!current.isDirectory()||current.isSymbolicLink()||!same(parent.stat,current)) throw fail('parent-replaced');
    }
    const fd=fs.fstatSync(this.fd,{bigint:true}), leaf=fs.lstatSync(this.file,{bigint:true});
    if(!fd.isFile()||fd.nlink!==1n||!leaf.isFile()||leaf.isSymbolicLink()||!same(fd,leaf)||!same(fd,this.identity))
      throw fail('file-replaced-or-unsafe');
    if(fd.size>BigInt(Number.MAX_SAFE_INTEGER)) throw fail('file-size-out-of-range');
    if(fd.size<BigInt(this.offset)) throw fail('consumed-prefix-truncated');
    return Number(fd.size);
  }
  poll() {
    if(this.error) throw this.error;
    if(this.closed) {this.error=fail('reader-closed');throw this.error;}
    try {
      const size=this.validate(), begin=this.offset;
      const end=Math.min(size,begin+this.pollBytes);
      const batch=[];
      let position=begin, consumed=begin, pending=Buffer.alloc(0), lineCount=0;
      const chunk=Buffer.alloc(Math.min(this.chunkBytes,Math.max(1,end-begin)));
      while(position<end) {
        const count=fs.readSync(this.fd,chunk,0,Math.min(chunk.length,end-position),position);
        if(count===0) throw fail('read-incomplete');
        position+=count;
        const data=Buffer.concat([pending,chunk.subarray(0,count)]);
        let start=0;
        for(let lf=data.indexOf(10,start);lf>=0;lf=data.indexOf(10,start)) {
          if(lf-start>this.lineBytes) throw fail('line-limit');
          if(lf>start) batch.push(this.nativeLines?new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(start,lf)):envelope(data.subarray(start,lf)));
          lineCount++;
          consumed+=lf-start+1;
          start=lf+1;
        }
        pending=Buffer.from(data.subarray(start));
        if(pending.length>this.lineBytes) throw fail('line-limit');
      }
      const finalSize=this.validate();
      if(finalSize<position) throw fail('file-shrank-during-read');
      this.offset=consumed;
      return {batch,consumedOffset:consumed,consumedBytes:consumed-begin,lineCount,
        partialBytes:pending.length,backlogBytes:finalSize-position,backlog:finalSize>position,readBytes:position-begin};
    } catch(e) {
      this.error=fail(e.code?.startsWith('E')?'read-unavailable':e.code||'read-unavailable');
      throw this.error;
    }
  }
  close() {
    if(this.closed) return;
    this.closed=true;
    const fd=this.fd;
    this.fd=null;
    if(fd!==null) {
      try {fs.closeSync(fd);} catch {this.error=fail('close-unavailable');throw this.error;}
    }
  }
}
