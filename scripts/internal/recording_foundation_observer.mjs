// 파일 용도: 관측 집계만 제공한다. catalog 수용/fsync/메모리 누수 판정이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
const types=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
export function observationCompleted({enabled,final,failed,error,processesClosed}) {
  return enabled===true&&!!final&&failed===0&&!error&&processesClosed===true;
}
export function collectProcess(binary,pid) {
  return new Promise((resolve,reject)=>{
    execFile(binary,[String(pid)],{timeout:3000,killSignal:'SIGKILL',maxBuffer:16384,env:{PATH:process.env.PATH}},(error,stdout)=>{
      if(error){reject(Error('observer-collector-unavailable'));return;}
      try{resolve(JSON.parse(stdout));}catch{reject(Error('observer-collector-invalid-json'));}
    });
  });
}
export class FoundationObserver {
  constructor({root,file,collect,maxIds=100000,maxIdBytes=33554432}) {
    if(!Number.isSafeInteger(maxIds)||maxIds<1||maxIds>100000||!Number.isSafeInteger(maxIdBytes)||maxIdBytes<1||maxIdBytes>33554432)
      throw Error('observer-invalid-limits');
    this.root=root;this.file=file;this.collect=collect;this.maxIds=maxIds;this.maxIdBytes=maxIdBytes;
    this.reader=null;this.pending=null;this.error=null;this.closed=false;
    this.mutations=new Set();this.entities=new Set();this.idBytes=0;this.rows=0;
    this.typeCounts=Object.fromEntries(types.map(x=>[x,0]));this.groups=new Map();this.lastJournal=null;
  }
  add(set,id) {
    if(set.has(id))return;
    const bytes=Buffer.byteLength(id);
    if(this.mutations.size+this.entities.size+1>this.maxIds||this.idBytes+bytes>this.maxIdBytes)throw Error('observer-id-limit');
    set.add(id);this.idBytes+=bytes;
  }
  journal() {
    if(!this.reader) {
      try{fs.lstatSync(path.resolve(this.root,this.file));}
      catch(e){if(e.code==='ENOENT')return {status:'pending'};throw Error('observer-journal-unavailable');}
      this.reader=new RecordingJournalReader(this.root,this.file);
    }
    const result=this.reader.poll();
    for(const row of result.batch){
      this.add(this.mutations,row.mutationId);this.add(this.entities,row.entityId);
      this.rows++;this.typeCounts[row.mutationType]++;
    }
    this.lastJournal={status:'observed',consumedOffset:result.consumedOffset,partialBytes:result.partialBytes,backlogBytes:result.backlogBytes,backlog:result.backlog};
    return this.lastJournal;
  }
  counts() {
    return {mutationCount:this.rows,typeCounts:{...this.typeCounts},uniqueMutationIds:this.mutations.size,uniqueEntityIds:this.entities.size,
      storedIdCount:this.mutations.size+this.entities.size,idUtf8Bytes:this.idBytes};
  }
  tick(pid) {
    if(this.error)return Promise.reject(this.error);
    if(this.closed)return Promise.reject(Error('observer-closed'));
    if(this.pending)return Promise.resolve(null);
    this.pending=(async()=>{
      if(!Number.isSafeInteger(pid)||pid<=0)throw Error('observer-invalid-pid');
      const m=await this.collect(pid);
      if(m?.valid!==true||m.pid!==pid||m.error!==null||typeof m.startIdentity!=='string'||! /^(macos:\d+:\d+|linux:\d+)$/.test(m.startIdentity)||
        ![m.rssBytes,m.threadCount,m.sampledAt].every(x=>Number.isSafeInteger(x)&&x>0)||!Number.isSafeInteger(m.fdCount)||m.fdCount<0)
        throw Error('observer-incomplete-metrics');
      const prior=this.groups.get(pid);
      if(prior&&prior.startIdentity!==m.startIdentity)throw Error('observer-live-identity-changed');
      if(!prior&&this.groups.size>=64)throw Error('observer-group-limit');
      const journal=this.journal();
      this.groups.set(pid,{pid,startIdentity:m.startIdentity,samples:(prior?.samples||0)+1});
      return {pid,startIdentity:m.startIdentity,rssBytes:m.rssBytes,threadCount:m.threadCount,fdCount:m.fdCount,sampledAt:m.sampledAt,
        journal,...this.counts(),resourceTrendPass:false};
    })().catch(e=>{this.error=Error(e.code||e.message||'observer-unavailable');throw this.error;}).finally(()=>{this.pending=null;});
    return this.pending;
  }
  async pause(){if(this.pending)await this.pending;}
  close(requireMeasured=true) {
    if(this.closed)return;
    if(this.pending)throw Error('observer-tick-in-flight');
    try {
      if(requireMeasured) {
        if(this.error)throw this.error;
        for(let i=0;i<128;i++){const j=this.journal();if(!j.backlog)break;}
        if(!this.groups.size||!this.lastJournal||this.lastJournal.backlog||this.lastJournal.partialBytes>0)throw Error('observer-final-unmeasured');
      }
    } finally {this.closed=true;if(this.reader)this.reader.close();}
    return {groups:[...this.groups.values()],journal:this.lastJournal,...this.counts(),resourceTrendPass:false};
  }
}
