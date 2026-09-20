// LP17 진단 전용. 기존 LP16 RSS 판정/제품 경로를 변경하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';

export const limits=Object.freeze({historicalRss:536870912,rss:1073741824,disk:536870912,output:2097152,seconds:180});
const number=v=>Number.isSafeInteger(v)&&v>=0;
// version 1의 열 순서는 C++ Emit과 함께 고정한다. 기존 객체형은 과거 부분 계측도 허용한다.
export const ownerColumns=Object.freeze('records samples fileSamples mappings stringBytes stringCapacity vectorCapacityBytes jobs segments bindings tombstones accessUnits uniqueEnvelopes sharedEnvelopeReferences logicalEnvelopeBytes uniqueBindingObjects sharedBindingReferences logicalBindingSamples uniqueJobObjects sharedJobReferences logicalLinkCount logicalEnvelopeChargeBytes weakLinkCount residentFallbackLinkCount coldEnvelopes residentBindings coldBindings residentJobs coldJobs entryStorageBytes locationStorageBytes'.split(' '));
export function normalizeOwner(row){
 if(!row||typeof row!=='object'||Array.isArray(row)||!['owner','owner-packed'].includes(row.kind)||
  !['journal','live','shadow','prefix','fixture','snapshot'].includes(row.owner)||typeof row.stage!=='string'||!/^[a-z0-9_-]+$/.test(row.stage))throw Error('owner-format');
 if(row.kind==='owner-packed'){
  if(Object.keys(row).sort().join(',')!=='kind,owner,stage,values,version'||row.version!==1||
   !Array.isArray(row.values)||row.values.length!==ownerColumns.length||!row.values.every(number))throw Error('owner-packed-format');
  return {kind:'owner',stage:row.stage,owner:row.owner,...Object.fromEntries(ownerColumns.map((key,i)=>[key,row.values[i]]))};
 }
 for(const [key,value] of Object.entries(row))if(!['kind','owner','stage'].includes(key)&&(!ownerColumns.includes(key)||!number(value)))throw Error('owner-format');
 return {...row};
}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function treeBytes(root){
 const s=fs.lstatSync(root);
 if(s.isSymbolicLink()||s.isFile())return s.size;
 if(!s.isDirectory())throw Error('unsupported-owned-entry');
 return fs.readdirSync(root).reduce((n,name)=>n+treeBytes(path.join(root,name)),0);
}
// 실행 중 컴파일러가 목록 조회 직후 임시 파일을 지울 수 있다. 소유 root가
// 동일할 때에만 전체 관측을 한 번 다시 수행한다. 정리 시 treeBytes는 계속 strict다.
export function liveTreeBytes(root,scan=treeBytes){
 const before=fs.lstatSync(root);
 if(!before.isDirectory()||before.isSymbolicLink())throw Error('unsupported-owned-entry');
 const same=()=>{const after=fs.lstatSync(root);if(!after.isDirectory()||after.isSymbolicLink()||
  after.dev!==before.dev||after.ino!==before.ino)throw Error('unsupported-owned-entry');};
 try{const bytes=scan(root);same();return bytes;}
 catch(e){if(e?.code!=='ENOENT')throw e;same();const bytes=scan(root);same();return bytes;}
}
export function manifest(root){
 const entries=[];
 function walk(p){const s=fs.lstatSync(p);if(s.isSymbolicLink()||(!s.isFile()&&!s.isDirectory()))throw Error('manifest-entry');
  if(s.isDirectory()){for(const name of fs.readdirSync(p).sort())walk(path.join(p,name));}
  else entries.push([path.relative(root,p),s.size,sha(fs.readFileSync(p))]);}
 walk(root);return sha(JSON.stringify(entries));
}
export function cleanupOwned(root,parent=fs.realpathSync(os.tmpdir())){
 const s=fs.lstatSync(root);
 if(path.dirname(root)!==parent||!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(root))||
  !s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||fs.realpathSync(root)!==root)throw Error('cleanup-ownership');
 const bytes=treeBytes(root);fs.rmSync(root,{recursive:true});
 if(fs.existsSync(root))throw Error('cleanup-remains');
 return {bytes,removed:true};
}
export function processGroup(text,pgid){
 if(!number(pgid)||pgid<=1||typeof text!=='string'||!text.trim())throw Error('process-observation');
 const rows=[];
 for(const line of text.trim().split('\n')){
  // ps는 단명 프로세스의 상태를 '?' 등으로 표시할 수 있다. 상태 표기는
  // 메모리 수치의 oracle가 아니며, 다른 그룹의 RSS/상태를 소유 가드에 섞지 않는다.
  const m=line.match(/^\s*(\d+)\s+(-?\d+)\s+(\S+)\s+(\S+)\s*$/);
  if(!m)throw Error('process-observation');
  const pid=Number(m[1]),group=Number(m[2]);
  if(!number(pid)||!Number.isSafeInteger(group))throw Error('process-observation');
  if(group!==pgid)continue;
  if(!/^\d+$/.test(m[3]))throw Error('process-observation');
  const kib=Number(m[3]);if(!number(kib*1024))throw Error('process-observation');
  // 알 수 없는 상태는 살아 있는 것으로 취급한다. zombie만 보수적으로 제외한다.
  if(!m[4].startsWith('Z'))rows.push({pid,rssBytes:kib*1024});
 }
 return {pids:rows.map(r=>r.pid),rssBytes:rows.reduce((n,r)=>n+r.rssBytes,0)};
}
function readGroup(pgid){
 const r=spawnSync('/bin/ps',['-axo','pid=,pgid=,rss=,stat='],{encoding:'utf8',timeout:1000,maxBuffer:4*1024*1024});
 if(r.status!==0){const e=Error('process-observation');e.code=r.error?.code||'PS_NONZERO';throw e;}return processGroup(r.stdout,pgid);
}
export function observations(stdout,expected){
 const rows=[];let valid=true,peak=0;
 for(const line of stdout.split('\n').filter(l=>l.startsWith('[lp17] '))){
  try{const row=JSON.parse(line.slice(7));if(!row||typeof row!=='object'||Array.isArray(row))throw Error();rows.push(['owner','owner-packed'].includes(row.kind)?normalizeOwner(row):row);}catch{valid=false;}
 }
 const memories=rows.filter(r=>r.kind==='memory');
 for(const r of memories){
  if(!/^[a-z0-9_-]+$/.test(r.stage)||!number(r.sources)||!number(r.currentRssBytes)||r.currentRssBytes===0||
   !number(r.peakRssBytes)||r.peakRssBytes===0||r.peakRssBytes<peak)valid=false;
  peak=Math.max(peak,number(r.peakRssBytes)?r.peakRssBytes:0);
 }
 const owners=rows.filter(r=>r.kind==='owner');
 for(const r of owners){
  if(!['journal','live','shadow','prefix','fixture','snapshot'].includes(r.owner)||!/^[a-z0-9_-]+$/.test(r.stage))valid=false;
  for(const [key,value] of Object.entries(r))if(!['kind','owner','stage'].includes(key)&&!number(value))valid=false;
 }
 const summaries=rows.filter(r=>r.kind==='summary');const summary=summaries[0];
 const summaryValid=summaries.length===1&&summary.mode===expected.mode&&summary.arm===expected.arm&&
  summary.samples===expected.samples&&summary.count===expected.count&&number(summary.pass)&&summary.pass>0&&summary.fail===0;
 const sequence=[];const add=(stage,sources)=>sequence.push([stage,sources]);
 if(expected.mode==='prepare'){add('prepare_before',0);add('prepare_after',expected.count);}
 if(expected.mode==='scale'){
  add('fixture_before',0);add('store_after',0);
  for(let i=1;i<=expected.count;i++){add('commit_before',i);add('commit_after',i);
   if(i===16||i===expected.count)for(const stage of ['snapshot_before','snapshot_after','checkpoint_before','checkpoint_after'])add(stage,i);}
  for(const stage of ['delete_before','delete_after','store_released'])add(stage,expected.count);
 }
 if(expected.mode==='reopen')for(const stage of ['reopen_before','reopen_after','reopen_verified','reopen_released'])add(stage,expected.count);
 if(expected.mode==='job'){
  add('job_before',0);
  const transitions=rows.filter(r=>r.kind==='jobTransition');
  for(let i=0;i<2;i++){
   const names=transitions.filter(r=>r.jobIndex===i).map(r=>r.stage);
   if(names[0]!=='job_intent'||names.filter(n=>n==='job_files').length<1||names.slice(-3).join(',')!=='job_ready,job_committed,job_complete'||
    names.slice(1,-3).some(n=>n!=='job_files'))valid=false;
  }
  if(transitions.some(r=>![0,1].includes(r.jobIndex)||r.expectedState!==r.observedState))valid=false;
  for(const row of transitions)add(row.stage,3);
  add('job_finished',3);add('job_released',0);
 }
 const sequenceValid=sequence.length===memories.length&&sequence.every(([stage,sources],i)=>memories[i].stage===stage&&memories[i].sources===sources);
 return {valid:valid&&sequenceValid&&memories.length>0&&summaryValid&&!rows.some(r=>r.kind==='error')&&(expected.mode==='prepare'||owners.length>0),
  selfPeakRssBytes:peak,summary:summaryValid?summary:null,memories,owners};
}
export function classify({stdout,stderr,code,signal,stopReason,groupClean,expected}){
 const found=observations(stdout,expected);
 const times=stderr.split('\n').filter(l=>l.includes('maximum resident set size'));
 const matched=times.length===1?times[0].match(/^\s*([1-9][0-9]*)\s+maximum resident set size\s*$/):null;
 const timePeak=matched?Number(matched[1]):null;
 const measured=number(timePeak)&&timePeak>0;
 const peak=measured?Math.max(timePeak,found.selfPeakRssBytes):null;
 const semanticPass=code===0&&signal===null&&found.summary!==null;
 const observationValid=measured&&found.valid;
 const safetyReason=stopReason||(peak!==null&&peak>limits.rss?'rss-safety-cap':null);
 return {historicalRssPass:peak===null?null:peak<=limits.historicalRss,observationValid,semanticPass,
  cleanupPass:groupClean,diagnosticPass:observationValid&&semanticPass&&groupClean&&!safetyReason,
  peakRssBytes:peak,stopReason:safetyReason,exitCode:code,signal,summary:found.summary};
}

export async function runBounded({root,command,args=[],env=process.env,seconds=limits.seconds,outputCap=limits.output,rssCap=limits.rss,diskCap=limits.disk}){
 if(!fs.lstatSync(root).isDirectory()||seconds<=0||seconds>180||!Number.isSafeInteger(outputCap)||outputCap<=0||outputCap>limits.output||
  !Number.isSafeInteger(rssCap)||rssCap<=0||rssCap>limits.rss||!Number.isSafeInteger(diskCap)||diskCap<=0||diskCap>limits.disk)throw Error('bounded-arguments');
 const start=Date.now();let stdout='',stderr='',bytes=0,reason=null,groupPeakRssBytes=0,closed=false,force=null,poll=null,timer=null,observationFailure=null;
 const child=spawn('/usr/bin/time',['-l',command,...args],{env,stdio:['ignore','pipe','pipe'],detached:true});
 const signal=sig=>{if(child.pid)try{process.kill(-child.pid,sig);}catch(e){if(e.code!=='ESRCH')reason??='group-signal';}};
 const stop=why=>{reason??=why;signal('SIGTERM');if(!force)force=setTimeout(()=>signal('SIGKILL'),1000);};
 const abort=()=>stop('parent-interrupted');process.once('SIGINT',abort);process.once('SIGTERM',abort);
 function collect(buffer,error){
  const remain=Math.max(0,outputCap-bytes);bytes+=buffer.length;
  if(remain){const kept=buffer.subarray(0,remain).toString();if(error)stderr+=kept;else stdout+=kept;}
  if(bytes>outputCap)stop('output-cap');
 }
 child.stdout.on('data',b=>collect(b,false));child.stderr.on('data',b=>collect(b,true));
 child.on('error',()=>{reason??='spawn-failed';});
 const failedObservation=(part,e)=>{observationFailure??={part,code:['ENOENT','ENOTDIR','EPERM','EACCES','ETIMEDOUT','PS_NONZERO'].includes(e?.code)?e.code:e?.message==='unsupported-owned-entry'?'UNSUPPORTED_ENTRY':'INVALID_OBSERVATION'};stop('resource-observation');};
 const monitor=()=>{if(closed||!child.pid)return;try{
  const group=readGroup(child.pid);groupPeakRssBytes=Math.max(groupPeakRssBytes,group.rssBytes);
  if(group.rssBytes>rssCap)stop('rss-safety-cap');
 }catch(e){failedObservation('process',e);return;}
 try{if(liveTreeBytes(root)>diskCap)stop('disk-cap');}catch(e){failedObservation('disk',e);}};
 poll=setInterval(monitor,250);timer=setTimeout(()=>stop('timeout'),seconds*1000);
 const ended=await new Promise(resolve=>child.once('close',(code,signalName)=>resolve({code,signal:signalName})));
 closed=true;clearInterval(poll);clearTimeout(timer);
 let groupClean=false;
 if(child.pid){
  for(let i=0;i<15;i++){
   try{if(readGroup(child.pid).pids.length===0){groupClean=true;break;}}catch{reason??='process-observation';break;}
   stop('child-remains');if(i>=10)signal('SIGKILL');await new Promise(resolve=>setTimeout(resolve,100));
  }
 }else groupClean=true;
 clearTimeout(force);process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);
 return {...ended,stdout,stderr,stopReason:reason,groupClean,groupPeakRssBytes,observationFailure,outputBytes:bytes,elapsedMs:Date.now()-start};
}
