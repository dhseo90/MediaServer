// 파일 용도: 내부 검증기 전용. 최초 진단은 독립 재현보다 먼저 별도 불변 파일로 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

// 현재 recorder의 고정 사유만 허용한다. source별 원인이나 실패 시점의 증거는 아니다.
const writerCodes=new Set(('hash timestamp-unavailable empty-nal nal-size nal-width nal-header nal-bound vcl-missing mp4-field-bound mp4-depth mp4-box-count mp4-header mp4-zero-size-profile mp4-box-bound mp4-profile mp4-duplicate-box mp4-missing-box mp4-time-version mp4-timescale mp4-table-bound mp4-video-only mp4-data-reference-count mp4-self-contained-reference mp4-edit-profile mp4-edit-rate mp4-description-count mp4-avc-entry mp4-avcc-version mp4-stsz-version mp4-sample-count mp4-sample-size mp4-stts-version mp4-stts-count mp4-stts-total mp4-ctts-version mp4-ctts-count mp4-ctts-total mp4-chunk-table mp4-chunk-version mp4-stsc-version mp4-empty-chunks mp4-stsc-run mp4-mdat-offset mp4-mdat-containment mp4-native-overflow mp4-sample-total file-size-cap file-binding file-read file-hash-binding capture-profile-or-cap segment-unobserved capture-count file-open ambiguous-original-vcl native-count ambiguous-mux-raw mux-file-payload original-file-vcl finish-exception gstreamer-unavailable').split(' '));
for(const code of ['file evidence profile/bound 오류','file evidence identity/timestamp/duplicate 오류','file evidence forward table 오류','file evidence origin/edit 오류'])writerCodes.add(code);
// phase별 실제 검사 코드만 조합한다. 임의 capture-* prefix는 허용하지 않는다.
const capturePhases={
  'attach-input-caps':['input-caps','input-format','input-alignment','input-codec-data','input-avcc-header','input-nal-width','input-codec-conflict'],
  'attach-core':['gstreamer-profile'],'attach-parser-pad':['parser-pad'],'attach-mux-pad':['mux-pad'],'attach-mux-element':['mux-element'],'attach-plugin':['plugin-profile'],'attach-probe':['probe-install'],
  'observe-lock':[],'observe-segment':['segment-profile'],'observe-count':['sample-cap'],'observe-buffer-size':['buffer-cap'],
  'observe-pts':['timestamp-unavailable'],'observe-dts':['timestamp-unavailable'],'observe-duration':['timestamp-unavailable'],
  'observe-caps':['caps-unavailable'],'observe-avc':['avc-profile'],'observe-buffer-read':['buffer-read'],
  'observe-vcl':['empty-nal','nal-size','nal-width','nal-header','nal-bound','vcl-missing','hash'],'observe-hash':['hash'],'observe-append':[],
  'accept-lock':[],'accept-count':['sample-cap'],'accept-original-fields':['original-timestamp'],'accept-buffer-size':['buffer-cap'],
  'accept-pts':['timestamp-unavailable'],'accept-dts':['timestamp-unavailable'],'accept-duration':['timestamp-unavailable'],
  'accept-vcl':['empty-nal','nal-size','nal-width','nal-header','nal-bound','vcl-missing','hash'],'accept-append':[]};
for(const [phase,reasons] of Object.entries(capturePhases))for(const reason of [...reasons,'unknown'])writerCodes.add(`capture-${phase}-${reason}`);
export function createWriterEvidenceCollector(){
  const prefix='[recording] file evidence unavailable: ';let pending='',discard=false,total=0,truncated=false,finished=false;const counts=new Map();
  function line(text){if(!text.startsWith(prefix))return;if(total===4096){truncated=true;return;}const suffix=text.slice(prefix.length),code=writerCodes.has(suffix)?suffix:'unknown';total++;counts.set(code,(counts.get(code)??0)+1);}
  return {append(chunk){if(finished)throw Error('writer-collector-finished');for(const part of String(chunk).split(/(?<=\n)/)){const ended=part.endsWith('\n');if(!discard){if(Buffer.byteLength(pending)+Buffer.byteLength(part)>4096){pending='';discard=true;truncated=true;}else pending+=part;}if(ended){if(!discard)line(pending.slice(0,-1));pending='';discard=false;}}},finish(){if(!finished){if(discard||pending)truncated=true;pending='';finished=true;}return {basis:'run-wide-stderr',sourceBindingEquivalent:false,total,truncated,counts:[...counts].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([code,count])=>({code,count}))};}};
}

export function runDiagnosticProbe({binary,root,index,reference,mode,environmentScript,env,deadline}){
  const remaining=Math.floor(deadline-performance.now());
  if(!Number.isFinite(remaining)||remaining<=0)throw Error('diagnostic-deadline');
  const args=[root,String(index),reference,mode];
  const basic=['--diagnose-state','--diagnose-basic','--diagnose-completeness'].includes(mode);
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
const bounded=(limit,p)=>x=>Array.isArray(x)&&x.length<=limit&&x.every(p);
const int32=x=>Number.isInteger(x)&&x>=-2147483648&&x<=2147483647;
const proofSchema={segmentIdSha256:hash,segmentPresent:bool,bindingPresent:bool,bindingValid:nullable(bool),fileEvidencePresent:bool,fileEvidenceValid:nullable(bool),bindingSha256:nullable(hash)};
const proofConsistent=x=>(x.bindingValid!==null)===(x.segmentPresent&&x.bindingPresent)&&(x.fileEvidenceValid!==null)===x.fileEvidencePresent&&(!x.fileEvidencePresent||x.bindingPresent)&&(!x.bindingSha256||x.bindingPresent);
const catalogSource=x=>fields(x,{...proofSchema,segmentMatchesIntent:nullable(bool),bindingMatchesIntentWithoutFileEvidence:nullable(bool)})&&proofConsistent(x)&&(x.segmentMatchesIntent!==null)===x.segmentPresent&&(x.bindingMatchesIntentWithoutFileEvidence!==null)===x.bindingPresent;
const candidate=x=>fields(x,{...proofSchema,selected:bool,lifecycle:x=>count(x)&&x<=5,deleted:bool,eligible:bool,startPts:decimal,endPts:nullable(decimal),timeBaseNum:int32,timeBaseDen:int32})&&proofConsistent(x)&&x.segmentPresent&&(!x.eligible||x.bindingValid===true);
const candidates=x=>fields(x,{status:v=>['complete','cap-exceeded','unavailable'].includes(v),count:nullable(count),truncated:bool,items:bounded(256,candidate)})&&(x.status==='complete'?x.count===x.items.length&&!x.truncated:x.count===null&&x.items.length===0&&x.truncated===(x.status==='cap-exceeded'));
function fields(value,schema){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===Object.keys(schema).length&&Object.entries(schema).every(([k,p])=>Object.hasOwn(value,k)&&p(value[k]));}
const source=x=>fields(x,{segmentIdSha256:hash,epochSha256:hash,generationSha256:hash,trackSha256:hash,bindingSha256:hash,generationOrder:decimal,startPts:decimal,endPts:nullable(decimal),lastAcceptedOrdinal:decimal,timeBaseNum:count,timeBaseDen:x=>count(x)&&x>0,sampleCount:count,indexComplete:bool,fileEvidencePresent:bool});
const file=x=>fields(x,{segmentIdSha256:hash,expected:hash,actual:nullable(hash),actualHashAvailable:bool,matches:nullable(bool),status:x=>['matched','mismatched','unavailable','hash-error'].includes(x)})&&
  (x.actualHashAvailable ? hash(x.actual)&&x.matches===(x.expected===x.actual)&&x.status===(x.matches?'matched':'mismatched') : x.actual===null&&x.matches===null&&['unavailable','hash-error'].includes(x.status));
function diagnostic(value){
  if(!fields(value,{state:literal('failed'),failureReason:x=>codes.has(x),sourceCount:count,outputCount:count,plannedOutputCount:count,fileReceiptCount:count,copyCatalogOpened:literal(true),capturedIntentSha256:hash,snapshotBasis:literal('offline-copy-at-query'),evidenceBasis:literal('persisted-job-intent'),fileHashBasis:literal('resolve-media-validated-fd'),reproducibleBundle:literal(false),remuxPerformed:literal(false),sourceEvidence:bounded(8,source),sourceFileHashes:bounded(8,file),intentProfile:x=>['h264-mp4-to-mpegts-video-only-v1','h264-mp4-native-to-mpegts-video-only-v1','h264-mp4-to-fmp4-video-only-v1','h264-mp4-native-to-fmp4-video-only-v1','unknown'].includes(x),catalogEvidenceBasis:literal('offline-copy-catalog'),failureTimeEquivalent:literal(false),proofValidationBasis:literal('strict-structure-only'),catalogSourceEvidence:bounded(8,catalogSource),catalogCandidateScope:literal('request-related-snapshot'),catalogCandidates:candidates})||value.sourceCount!==value.sourceEvidence.length||value.sourceCount!==value.sourceFileHashes.length||value.sourceCount!==value.catalogSourceEvidence.length||value.sourceEvidence.some((s,i)=>s.segmentIdSha256!==value.sourceFileHashes[i].segmentIdSha256||s.segmentIdSha256!==value.catalogSourceEvidence[i].segmentIdSha256))throw Error('unsafe-diagnostic');
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
const choice=values=>value=>values.includes(value);
const completenessReasons=choice(['unknown','multiple-time-or-recording-candidates','unconfirmed-interval-no-trusted-watermark','original-deleted','original-coverage-unconfirmed','direct-time-interval-only','multiple-utc-candidates','unconfirmed-utc-mapping','piecewise-utc-time-only','missing-original-identity','time-selection-only-not-playability','interval-evidence-incomplete','file-duration-uncovered']);
const interval=(value,a,b)=>BigInt(value[a])<BigInt(value[b]);
const completionSlice=value=>fields(value,{startNs:decimal,endNs:decimal,state:choice(['confirmed','unknown','gap','deleted','ambiguous','awaiting-post-roll']),reason:completenessReasons,candidateSegmentIdSha256:array(hash)})&&interval(value,'startNs','endNs');
const completionSource=value=>fields(value,{segmentIdSha256:hash,epochSha256:hash,generationSha256:hash,trackSha256:hash,bindingSha256:hash,generationOrder:decimal,startPts:decimal,endPts:nullable(decimal),timeBaseNum:count,timeBaseDen:x=>count(x)&&x>0,sampleCount:count,indexComplete:bool,fileEvidencePresent:bool});
const unfulfilled=value=>fields(value,{segmentIdSha256:nullable(hash),axis:choice(['request-ns','original-pts-ns','unknown']),reason:completenessReasons,start:decimal,end:decimal})&&interval(value,'start','end');
const accessUnit=value=>fields(value,{ordinal:decimal,originalPtsNs:decimal,filePtsNs:decimal,fileDurationNs:decimal,outputPtsNs:decimal,outputDurationNs:decimal,sourceVclSha256:hash,outputVclSha256:hash});
const completionOutput=value=>fields(value,{outputIdSha256:hash,sourceIndex:count,sourceSegmentIdSha256:hash,verifiedOutput:bool,requestFullySatisfied:bool,sizeBytes:decimal,checksumSha256:hash,sourceOriginNs:decimal,requestedStartNs:decimal,requestedEndNs:decimal,actualStartNs:decimal,actualEndNs:decimal,accessUnitCount:count,decodedSourceCount:count,decodedOutputCount:count,decodedHashesMatch:bool,actualRangeBasis:choice(['file-duration-on-source-pts-axis','unknown']),associationQuality:choice(['complete-file-pts-to-binding-timestamp-match','unknown']),payloadQuality:choice(['source-file-vcl-and-visible-decoded-pixels','unknown']),accessUnits:array(accessUnit)})&&value.accessUnitCount===value.accessUnits.length&&interval(value,'requestedStartNs','requestedEndNs')&&interval(value,'actualStartNs','actualEndNs');
function completeness(value){
  const selection=v=>fields(v,{complete:bool,reason:completenessReasons,expandedStartNs:decimal,expandedEndNs:decimal,slices:array(completionSlice)})&&interval(v,'expandedStartNs','expandedEndNs');
  if(!fields(value,{state:literal('complete'),snapshotBasis:literal('offline-copy-at-query'),evidenceBasis:literal('persisted-job-intent-and-ready'),reproducibleBundle:literal(false),remuxPerformed:literal(false),capturedIntentSha256:hash,readySha256:hash,verifiedOutput:literal(true),requestFullySatisfied:bool,selection,sources:array(completionSource),unfulfilled:array(unfulfilled),outputs:array(completionOutput)})||value.outputs.some(o=>o.sourceIndex>=value.sources.length||o.sourceSegmentIdSha256!==value.sources[o.sourceIndex].segmentIdSha256))throw Error('unsafe-completeness');
  return value;
}
export function captureCompletenessEvidence({collect,evidencePath}){
  const result={diagnosticStatus:'not-run',evidenceStatus:'not-run',cleanupAllowed:false};let value;
  try{value=completeness(collect());result.diagnosticStatus='complete';}catch(error){result.diagnosticStatus=error?.code==='ETIMEDOUT'?'timeout':'failed';return result;}
  try{preserve(evidencePath,{diagnostic:value});result.evidenceStatus='preserved';result.cleanupAllowed=true;}catch{result.evidenceStatus='failed';}
  return result;
}
export function captureStateEvidence({collect,evidencePath,expectedReferenceSha256}){
  const result={diagnosticStatus:'not-run',evidenceStatus:'not-run',cleanupAllowed:false};let value;
  try{
    if(!hash(expectedReferenceSha256))throw Error('state-reference-required');
    value=collect();const small=x=>count(x)&&x<=8;
    if(value?.referenceSha256!==expectedReferenceSha256)throw Error('state-reference-mismatch');
    if(!fields(value,{state:choice(['absent','intent','ready','committed','complete','failed']),managed:bool,jobCount:x=>x===0||x===1,referenceSha256:hash,capturedIntentSha256:nullable(hash),sourceCount:small,outputCount:small,plannedOutputCount:small,fileReceiptCount:x=>count(x)&&x<=4096,copyCatalogOpened:literal(true),snapshotBasis:literal('offline-copy-at-query'),failureTimeEquivalent:literal(false),remuxPerformed:literal(false)})||
      (value.state==='absent'?(value.jobCount!==0||value.capturedIntentSha256!==null||['sourceCount','outputCount','plannedOutputCount','fileReceiptCount'].some(k=>value[k]!==0)):(value.jobCount!==1||!value.managed||!hash(value.capturedIntentSha256))))throw Error('unsafe-state-diagnostic');
    result.diagnosticStatus='complete';
  }catch(error){result.diagnosticStatus=error?.code==='ETIMEDOUT'?'timeout':'failed';return result;}
  try{preserve(evidencePath,{diagnostic:value});result.evidenceStatus='preserved';result.cleanupAllowed=true;}catch{result.evidenceStatus='failed';}
  return result;
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
