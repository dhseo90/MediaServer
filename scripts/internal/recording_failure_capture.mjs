// 내부 검증기 전용. 최초 진단은 독립 재현보다 먼저 별도 불변 파일로 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

export function runDiagnosticProbe({binary,root,index,reference,mode,environmentScript,env,deadline}){
  const remaining=Math.floor(deadline-performance.now());
  if(!Number.isFinite(remaining)||remaining<=0)throw Error('diagnostic-deadline');
  const args=[root,String(index),reference,mode];
  const basic=mode==='--diagnose-basic';
  if(!basic&&!['--diagnose-failed','--replay-failed'].includes(mode))throw Error('diagnostic-mode');
  return JSON.parse(execFileSync(basic?binary:'/bin/bash',basic?args:['-c','set -e; source "$1"; media_server_apply_homebrew_gst_env; shift; exec "$@"','recording-diagnostic',environmentScript,binary,...args],{env,timeout:Math.min(15000,remaining),maxBuffer:1024*1024,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
}

const codes=new Set(['unknown','job-remux: file-original-timestamp-mismatch','job-remux: source-binding-incomplete','job-source-unavailable','job-cancelled-or-deadline','job-attempt-create','job-output-create','job-remux: media-budget-exceeded','job-remux: work-cancelled','job-remux: output-byte-budget-exceeded']);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const decimal=x=>typeof x==='string'&&/^-?\d{1,20}$/.test(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
const bool=x=>typeof x==='boolean';
const literal=x=>v=>v===x;
const nullable=p=>x=>x===null||p(x);
const array=p=>x=>Array.isArray(x)&&x.length<=4096&&x.every(p);
function fields(value,schema){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===Object.keys(schema).length&&Object.entries(schema).every(([k,p])=>Object.hasOwn(value,k)&&p(value[k]));}
const source=x=>fields(x,{segmentIdSha256:hash,epochSha256:hash,generationSha256:hash,trackSha256:hash,bindingSha256:hash,generationOrder:decimal,startPts:decimal,endPts:nullable(decimal),lastAcceptedOrdinal:decimal,timeBaseNum:count,timeBaseDen:x=>count(x)&&x>0,sampleCount:count,indexComplete:bool,fileEvidencePresent:bool});
const file=x=>fields(x,{segmentIdSha256:hash,expected:hash,actual:nullable(hash),actualHashAvailable:bool,matches:nullable(bool),status:x=>['matched','mismatched','unavailable','hash-error'].includes(x)})&&
  (x.actualHashAvailable ? hash(x.actual)&&x.matches===(x.expected===x.actual)&&x.status===(x.matches?'matched':'mismatched') : x.actual===null&&x.matches===null&&['unavailable','hash-error'].includes(x.status));
function diagnostic(value){
  if(!fields(value,{state:literal('failed'),failureReason:x=>codes.has(x),sourceCount:count,outputCount:count,plannedOutputCount:count,fileReceiptCount:count,copyCatalogOpened:literal(true),capturedIntentSha256:hash,snapshotBasis:literal('offline-copy-at-query'),evidenceBasis:literal('persisted-job-intent'),fileHashBasis:literal('resolve-media-validated-fd'),reproducibleBundle:literal(false),remuxPerformed:literal(false),sourceEvidence:array(source),sourceFileHashes:array(file)})||value.sourceCount!==value.sourceEvidence.length||value.sourceCount!==value.sourceFileHashes.length||value.sourceEvidence.some((s,i)=>s.segmentIdSha256!==value.sourceFileHashes[i].segmentIdSha256))throw Error('unsafe-diagnostic');
  return value;
}
function basic(value){
  if(!fields(value,{state:literal('failed'),failureReason:x=>codes.has(x),sourceCount:count,outputCount:count,plannedOutputCount:count,fileReceiptCount:count,copyCatalogOpened:literal(true),capturedIntentSha256:hash}))throw Error('unsafe-basic-diagnostic');
  return value;
}
function replaySummary(value){
  // 재현 상세는 최초 진단과 분리한다. 가변 문자열·미확인 필드는 저장하지 않는다.
  const schema={persistedFailure:x=>codes.has(x),replayFailure:x=>x==='none'||codes.has(x),verifiedOutput:bool,sameFailure:bool,persistedRecordUnchanged:literal(true),capturedIntentSha256:hash,snapshotBasis:literal('offline-copy-at-query'),maxWorkMs:count,serviceRemainingBudgetEquivalent:literal(false)};
  const result=Object.fromEntries(Object.keys(schema).map(k=>[k,value?.[k]]));
  if(!fields(result,schema))throw Error('unsafe-replay');
  if(result.sameFailure&&(result.verifiedOutput||result.persistedFailure==='unknown'||result.persistedFailure!==result.replayFailure))throw Error('unsafe-replay');
  return result;
}
function preserve(file,value){
  const parent=path.dirname(file);
  if(!path.isAbsolute(file)||fs.realpathSync(parent)!==parent)throw Error('evidence-parent');
  const text=JSON.stringify(value)+'\n';if(Buffer.byteLength(text)>1024*1024)throw Error('evidence-byte-cap');
  const temporary=path.join(parent,'.pending-'+crypto.randomUUID());
  let fd;
  try{fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,text);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.linkSync(temporary,file);}
  finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  const directory=fs.openSync(parent,fs.constants.O_RDONLY);try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
}
export function captureFailureEvidence({diagnose,collect,replay,evidencePath}){
  const status={diagnosticStatus:'not-run',diagnosticEvidenceStatus:'not-run',detailStatus:'not-run',detailEvidenceStatus:'not-run',replayStatus:'not-run',replayEvidenceStatus:'not-run',cleanupAllowed:false};
  let initial;
  try{initial=basic(diagnose());status.diagnosticStatus='complete';}catch{status.diagnosticStatus='failed';return status;}
  try{preserve(evidencePath,{diagnostic:initial});status.diagnosticEvidenceStatus='preserved';}catch{status.diagnosticEvidenceStatus='failed';return status;}
  let detail;
  try{detail=diagnostic(collect());if(Object.keys(initial).some(k=>initial[k]!==detail[k]))throw Error('detail-identity');status.detailStatus='complete';}
  catch(error){status.detailStatus=error?.code==='ETIMEDOUT'?'timeout':'failed';return status;}
  try{preserve(evidencePath+'.details.json',{diagnostic:detail});status.detailEvidenceStatus='preserved';status.cleanupAllowed=true;}catch{status.detailEvidenceStatus='failed';return status;}
  let result;
  try{result={replay:replaySummary(replay())};if(result.replay.capturedIntentSha256!==initial.capturedIntentSha256||result.replay.persistedFailure!==initial.failureReason)throw Error('replay-identity');status.replayStatus='complete';}
  catch(error){status.replayStatus=error?.code==='ETIMEDOUT'?'timeout':'failed';result={replayStatus:status.replayStatus};}
  try{preserve(evidencePath+'.replay.json',result);status.replayEvidenceStatus='preserved';}catch{status.replayEvidenceStatus='failed';}
  return status;
}
export function removeDiagnosticRoot(root,expected,evidencePreserved){
  if(!evidencePreserved)throw Error('evidence-not-preserved');
  const actual=fs.lstatSync(root,{bigint:true});
  if(!actual.isDirectory()||actual.isSymbolicLink()||actual.dev!==expected.dev||actual.ino!==expected.ino)throw Error('cleanup-ownership');
  fs.rmSync(root,{recursive:true});if(fs.existsSync(root))throw Error('cleanup-incomplete');
}
