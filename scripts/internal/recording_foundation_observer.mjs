// 파일 용도: 관측 집계만 제공한다. catalog 수용/fsync/메모리 누수 판정이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {RecordingJournalReader} from './recording_journal_reader.mjs';
const types=['segment_finalized','event_link_created','observation_put','observation_v2_put','deletion_requested','deletion_completed','corruption_detected'];
export function observationCompleted({enabled,final,failed,error,processesClosed}) {
  return enabled===true&&!!final&&failed===0&&!error&&processesClosed===true;
}
// R102 fixed diagnostic shape. Never retain arbitrary collector strings/payloads.
export function fdObservation(value){
  if(!value||value.scope!=='complete-round-sequential-v1'||typeof value.complete!=='boolean'||
    !(value.startIdentity===null||/^(macos:\d+:\d+|linux:\d+)$/.test(value.startIdentity??''))||
    !['startedAt','completedAt','roundStartedAt','roundCompletedAt','rounds','capacityRetries','closedRetries','detailCalls'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0)||
    value.rounds>4||value.capacityRetries>4||value.closedRetries>4||!Array.isArray(value.failures)||value.failures.length>4)return null;
  const failures=[];for(const f of value.failures){
    if(!['fd','listedType','returned','errno','nextType','at'].every(k=>Number.isSafeInteger(f[k]))||f.fd<0||f.at<0)return null;
    failures.push(Object.fromEntries(['fd','listedType','returned','errno','nextType','at'].map(k=>[k,f[k]])));
  }
  return {scope:value.scope,complete:value.complete,startIdentity:value.startIdentity,
    ...Object.fromEntries(['startedAt','completedAt','roundStartedAt','roundCompletedAt','rounds','capacityRetries','closedRetries','detailCalls'].map(k=>[k,value[k]])),failures};
}
export function completeFdObservation(metrics){
  const f=fdObservation(metrics?.fdObservation);
  return !!f&&f.complete&&f.startIdentity===metrics.startIdentity&&f.rounds>=1&&f.startedAt>0&&
    f.startedAt<=f.roundStartedAt&&f.roundStartedAt<=f.roundCompletedAt&&f.roundCompletedAt<=f.completedAt;
}
export function collectProcess(binary,pid) {
  return new Promise((resolve,reject)=>{
    execFile(binary,[String(pid)],{timeout:3000,killSignal:'SIGKILL',maxBuffer:16384,env:{PATH:process.env.PATH}},(error,stdout)=>{
      let parsed=null;try{parsed=JSON.parse(stdout);}catch{}
      if(error||!parsed?.valid||!completeFdObservation(parsed)){
        const failure=Error('observer-collector-unavailable');let measurement=null;
        try{if(!parsed)throw Error();measurement=Object.fromEntries(Object.entries(parsed).filter(([key,value])=>
          ['pid','startIdentity','rssBytes','threadCount','fdCount','anonymousFileBytes','anonymousAllocatedBytes','anonymousFiles','footprintBytes','sampledAt','valid','error'].includes(key)&&
          (value===null||typeof value==='boolean'||Number.isSafeInteger(value)||(typeof value==='string'&&value.length<=160&&/^[a-zA-Z0-9:=-]+$/.test(value)))));if(fdObservation(parsed.fdObservation))measurement.fdObservation=fdObservation(parsed.fdObservation);}catch{}
        failure.collectorDiagnostic={exitCode:Number.isInteger(error?.code)?error.code:null,spawnCode:typeof error?.code==='string'?error.code:null,
          signal:error?.signal??null,killed:!!error?.killed,stdoutBytes:Buffer.byteLength(stdout),measurement};
        reject(failure);return;
      }
      resolve(parsed);
    });
  });
}
// 준비 실행의 launch 증거. spawn 관측 시각은 OS identity가 아니며 정규 시계열 표본에도 넣지 않는다.
const identityPattern=/^(macos:[1-9]\d{0,19}:\d{1,6}|linux:[1-9]\d{0,19})$/;
const identityCodes=new Set(['identity-process-exited','identity-health-failed','identity-pid-mismatch','identity-value-invalid',
  'identity-changed','identity-fd-incomplete','identity-metrics-invalid','identity-permission','identity-timeout','identity-collector-error']);
export function newLaunchIdentity({launchId,launchIndex,phase,pid,spawnObservedAt,logFile}) {
  return {schema:'recording-launch-identity-v1',launchId,launchIndex,phase,pid:pid??null,spawnObservedAt,logFile,
    startIdentity:null,identitySource:null,identityCapturedAt:null,status:'pending',error:null};
}
function identityError(error) {
  if(identityCodes.has(error?.message))return error.message;
  const d=error?.collectorDiagnostic;
  if(['EACCES','EPERM'].includes(d?.spawnCode))return 'identity-permission';
  if(d?.killed&&d?.signal==='SIGKILL')return 'identity-timeout';
  if(d?.measurement?.fdObservation&&!completeFdObservation(d.measurement))return 'identity-fd-incomplete';
  return 'identity-collector-error';
}
function validateLaunchMetrics(identity,metrics) {
  if(!Number.isSafeInteger(identity.pid)||identity.pid<=0||identity.pid>2147483647||metrics?.pid!==identity.pid)throw Error('identity-pid-mismatch');
  if(typeof metrics.startIdentity!=='string'||!identityPattern.test(metrics.startIdentity))throw Error('identity-value-invalid');
  if(identity.startIdentity!==null&&identity.startIdentity!==metrics.startIdentity)throw Error('identity-changed');
  if(metrics.valid!==true||metrics.error!==null)throw Error('identity-metrics-invalid');
  if(!completeFdObservation(metrics))throw Error('identity-fd-incomplete');
}
export function assertLaunchMetrics(identity,metrics) {
  try{if(identity?.status!=='captured')throw Error('identity-value-invalid');validateLaunchMetrics(identity,metrics);}
  catch(error){recordLaunchMetricsFailure(identity,error);throw error;}
}
export function recordLaunchMetricsFailure(identity,error){if(identity)identity.bindingError??=identityError(error);}
function preserveLaunchIdentity(identity,write) {
  try{
    const bytes=JSON.stringify(identity)+'\n';if(Buffer.byteLength(bytes)>4096)throw Error('identity-artifact-limit');
    identity.artifact=write(`process-identity-${identity.launchIndex}.json`,bytes);
  }catch{identity.artifactError='identity-artifact-write-failed';throw Error(identity.artifactError);}
}
export function failLaunchIdentity(identity,code,write) {
  identity.status='failed';identity.error=identityCodes.has(code)?code:'identity-collector-error';
  preserveLaunchIdentity(identity,write);
}
export async function captureLaunchIdentity(identity,{collect,isRunning,write,now=()=>new Date().toISOString()}) {
  let metrics=null;
  try{
    if(!isRunning())throw Error('identity-process-exited');
    metrics=await collect(identity.pid);
    if(!isRunning())throw Error('identity-process-exited');
    validateLaunchMetrics(identity,metrics);
    identity.startIdentity=metrics.startIdentity;
    identity.identitySource=metrics.startIdentity.startsWith('macos:')?'recording_process_metrics:PROC_PIDTBSDINFO':'recording_process_metrics:proc-stat-field-22';
    identity.identityCapturedAt=now();identity.status='captured';identity.fdObservation=fdObservation(metrics.fdObservation);
  }catch(error){
    identity.status='failed';identity.error=identityError(error);
    const d=error?.collectorDiagnostic,m=metrics??d?.measurement;
    identity.collectionFailure={exitCode:Number.isInteger(d?.exitCode)?d.exitCode:null,
      spawnCode:['EPERM','EACCES','ENOENT','ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(d?.spawnCode)?d.spawnCode:null,
      signal:['SIGKILL','SIGTERM'].includes(d?.signal)?d.signal:null,killed:d?.killed===true,
      stdoutBytes:Number.isSafeInteger(d?.stdoutBytes)&&d.stdoutBytes>=0?d.stdoutBytes:null,
      observedPid:Number.isSafeInteger(m?.pid)?m.pid:null,
      observedStartIdentity:typeof m?.startIdentity==='string'&&identityPattern.test(m.startIdentity)?m.startIdentity:null,
      fdObservation:fdObservation(m?.fdObservation)};
  }
  preserveLaunchIdentity(identity,write);
  if(identity.status!=='captured')throw Error(identity.error);
  return identity;
}
// 종료 후 원본 artifact 재조회와 launch별 로그/수집/cleanup 결속. 실패는 기존 기능 PASS와 별도다.
export function launchIdentityCoverage(entries,outputDir) {
  const ids=new Set(),indices=new Set(),osIdentities=new Set();
  const launches=entries.map(entry=>{
    const i=entry.identity;let error=null;
    try{
      if(!i||i.status!=='captured'||i.error||i.artifactError||i.bindingError)throw Error(i?.artifactError||i?.bindingError||i?.error||'identity-missing');
      if(!/^[a-f0-9-]{36}$/.test(i.launchId)||!Number.isSafeInteger(i.launchIndex)||i.launchIndex<1||
        !['initial','disabled-restart','reactivated-restart'].includes(i.phase)||!Number.isFinite(Date.parse(i.spawnObservedAt))||!Number.isFinite(Date.parse(i.identityCapturedAt)))throw Error('identity-metadata-invalid');
      validateLaunchMetrics(i,{pid:i.pid,startIdentity:i.startIdentity,valid:true,error:null,fdObservation:i.fdObservation});
      const key=`${i.pid}/${i.startIdentity}`;
      if(ids.has(i.launchId)||indices.has(i.launchIndex)||osIdentities.has(key))throw Error('identity-duplicate');
      ids.add(i.launchId);indices.add(i.launchIndex);osIdentities.add(key);
      const a=i.artifact;if(!a||a.file!==`process-identity-${i.launchIndex}.json`||a.bytes>4096)throw Error('identity-artifact-invalid');
      const fd=fs.openSync(path.join(outputDir,a.file),fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
      try{
        const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.nlink!==1||stat.uid!==process.getuid()||stat.size!==a.bytes||stat.size>4096)throw Error('identity-artifact-invalid');
        const bytes=fs.readFileSync(fd);
        if(crypto.createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('identity-artifact-changed');
        const saved=JSON.parse(bytes);const {artifact,artifactError,bindingError,...expected}=i;
        if(JSON.stringify(saved)!==JSON.stringify(expected))throw Error('identity-artifact-binding');
      }finally{fs.closeSync(fd);}
      if(entry.log?.file!==i.logFile||!entry.log.complete||!/^[a-f0-9]{64}$/.test(entry.log.sha256)||
        entry.completion?.status!=='captured'||entry.resource?.status!=='captured'||entry.resource.final?.pid!==i.pid)throw Error('identity-output-binding');
      if(entry.cleanup?.pid!==i.pid||entry.cleanup.normalShutdownPass!==true||entry.cleanup.archiveSafe!==true)throw Error('identity-cleanup-incomplete');
    }catch(e){error=/^identity-[a-z-]+$/.test(e.message)?e.message:'identity-evidence-unavailable';}
    return {...entry,status:error?'FAIL':'PASS',error};
  });
  return {schema:'recording-launch-identity-coverage-v1',status:launches.length>0&&launches.every(x=>x.status==='PASS')?'PASS':'FAIL',
    generated:entries.length,captured:entries.filter(e=>e.identity?.status==='captured').length,launches};
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
