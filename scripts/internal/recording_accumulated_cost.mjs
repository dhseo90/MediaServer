// R165: 기존 mixed 요청 중 사전 고정 15건만 결속. 제품/API/부하와 독립인 시험용 소비자.
import {diagnosticLines} from './recording_diagnostic_lines.mjs';
export const batches=[0,40,80,92,100], slots=[0,10,20,23,25];
const required=['service-wait','service-hold','preparation-wait','preparation-hold','Refresh','WithPlayback','SnapshotBegin','CurrentnessJson'];
const need=(b,m)=>{if(!b)throw Error(m);};
const number=n=>Number.isSafeInteger(n)&&n>=0;
export function selection(batch,client){const i=batches.indexOf(batch);return i<0||client>1?0:i*3+client+1;}
export function aSelection(slot){const i=slots.indexOf(slot);return i<0?0:i*3+3;}
export function costCollector(){
 const records={client:new Map(),server:new Map(),search:new Map()},started=new Set();let first=null;
 const lines=[0,1].map(()=>diagnosticLines(['[R154-','[search-cost-loss]','[search-failure-loss]'],8192));
 const fail=error=>{if(!first)first={code:error.message,detectedMs:performance.now()};return first;};
 function accept(kind,r){
  need(!first,'sticky-diagnostic-failure');need(records[kind]&&r&&number(r.id)&&r.id>=1&&r.id<=15,'request-identity');
  need(!records[kind].has(r.id),'duplicate-terminal');need(r.loss===false,'trace-loss');
  const order=keys=>{const a=keys.map(k=>r[k]);need(a.every(number)&&a.every((v,i)=>v>0&&(!i||v>=a[i-1])),'record-order');};
  if(kind==='server'){
   need(r.class===(r.id%3===0?3:1),'request-class');order(['accepted','parsed','handler','prepared','sendBegin','sendEnd','end']);need(r.sent===true,'send-incomplete');
  }else if(kind==='search'){
   order(['begin','end']);need(r.diagnosticId===r.id&&r.status===200,'search-identity-status');
   need(Array.isArray(r.phases)&&r.phases.length<=40,'phase-cap');
   for(const p of r.phases)need(Array.isArray(p)&&p.length===3&&typeof p[0]==='string'&&number(p[1])&&number(p[2])&&p[1]>0&&p[2]>=p[1]&&p[2]<=r.end,'phase-order');
   need(required.every(n=>r.phases.some(p=>p[0]===n)),'missing-phase');
  }else{
   need(started.has(r.id),'unstarted-client');need(r.status===200&&r.outcome==='ok'&&r.phase==='complete'&&r.bytes>0,'client-incomplete');
   need(number(r.totalElapsedMs)&&r.totalElapsedMs<=5000,'client-timeout');
  }
  records[kind].set(r.id,r);
 }
 return {
  start(id){try{need(number(id)&&id>=1&&id<=15&&!started.has(id),'duplicate-start');started.add(id);}catch(e){fail(e);throw e;}},
  client(r){try{accept('client',r);}catch(e){fail(e);throw e;}},
  append(chunk,stream){try{lines[stream].append(chunk,line=>{
   if(line.startsWith('[R154-loss]')||line.startsWith('[search-'))throw Error('trace-loss-marker');
   const m=line.match(/^\[R154-(server|search)\] (.*)$/);need(m,'unexpected-record');accept(m[1],JSON.parse(m[2]));
  });}catch(e){fail(e);}},
  failure(){return first;},
  complete(){for(const line of lines)line.finish();if(first)throw Error(first.code);
   for(const id of started){const c=records.client.get(id),s=records.server.get(id),q=records.search.get(id);need(c&&s&&q,'missing-terminal');
    need(s.handler<=q.begin&&q.end<=s.prepared,'search-outside-handler');
    need(q.phases.every(p=>p[1]>=s.handler&&p[2]<=q.end),'phase-outside-handler');}
   need(Object.values(records).every(m=>m.size===started.size),'unbound-terminal');return Object.fromEntries(Object.entries(records).map(([k,m])=>[k,[...m.values()]]));},
  ready(channels){return Array.from({length:9},(_,i)=>i+1).every(id=>started.has(id))&&Object.values(records).every(m=>m.size===started.size)&&[...records.client.values()].filter(r=>r.id%3!==0&&r.totalElapsedMs>=2000).length>=2&&['9101','9201'].every(k=>channels[k].finalized>=600);}
 };
}

// 검색 전용 결과는 장시간/삭제/메모리/릴리즈 적격성을 부여하지 않는다.
export function assertSearchPerformanceCapacity(contract=null){
 // Historical callers remain blocked. Only the SHA-bound official closeout
 // package supplies this contract; it grants pre-run eligibility, not runtime FIT.
 need(contract?.profile==='s03-official-closeout-v1','CAPACITY_UNPROVEN: official closeout binding required');
 const expected={channels:3,initialReviews:3,aSlots:45,requests:484,batches:121,identities:1,
  observationMs:1800000,driverMs:1870000,launcherSeconds:1900,parentBytes:2097152,
  reportBytes:1048576,normalReportUpperBytes:993381,closeoutReserveBytes:6291456};
 for(const [k,v] of Object.entries(expected))need(contract[k]===v,'CAPACITY_UNPROVEN: '+k);
 need(contract.finalizerSha256==='af234c2f9d1003220f79800a965962f01b820927517226430522256e2a81b200','CAPACITY_UNPROVEN: finalizer');
 for(const role of ['runner','supervisor','generator','consumer','finalizer','sourceBinding']){
  const r=contract.files?.[role];need(r&&path.isAbsolute(r.path)&&/^[a-f0-9]{64}$/.test(r.sha256),'CAPACITY_UNPROVEN: file binding');
  const s=fs.lstatSync(r.path);need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid(),'CAPACITY_UNPROVEN: file ownership');
  need(crypto.createHash('sha256').update(fs.readFileSync(r.path)).digest('hex')===r.sha256,'CAPACITY_UNPROVEN: file sha');
 }
 need(contract.files.finalizer.sha256===contract.finalizerSha256,'CAPACITY_UNPROVEN: finalizer binding');
 return {status:'PRE_RUN_READY',runtimeCapacity:'NOT_TESTED'};
}
// Official final report only. Keep every JSON value; wire ledgers and all
// other checkpoint consumers retain their existing serialization contracts.
export function checkpointSearchPerformanceReport(artifacts,report,firstFailure=null){
 const verifiedWrite=(name,bytes)=>{
  need(bytes.length<=1048576,'search-report-cap');
  const receipt=artifacts.write(name,bytes),file=path.join(artifacts.outputDir,name),s=fs.lstatSync(file);
  need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid()&&s.size===bytes.length,'search-report-file');
  const saved=fs.readFileSync(file),sha256=crypto.createHash('sha256').update(saved).digest('hex');
  need(saved.equals(bytes)&&receipt.bytes===saved.length&&receipt.sha256===sha256,'search-report-readback');return receipt;
 };
 let bytes;
 try{
  bytes=Buffer.from(JSON.stringify({...report,artifactRoot:artifacts.outputDir})+'\n');
  return verifiedWrite('report.json',bytes);
 }catch(error){
  // This is failure evidence, never a smaller replacement report or success receipt.
  // Keep original strings intact. A second cap/I/O failure is explicitly incomplete.
  try{
  const failure={status:'INCOMPLETE',reportComplete:false,reportBytes:bytes?.length??null,
   reportSha256:bytes?crypto.createHash('sha256').update(bytes).digest('hex'):null,
   reportStorageError:{name:error.name,message:error.message,code:error.code??null},firstFailure:firstFailure??report.firstFailure??null,
   workspaceFailure:report.workspaceFailure??null,recordingStatusFailure:report.recordingStatusFailure??null,
   ledgerFirstFailure:report.failureAttribution?.firstFailure??null,
   aFailures:(report.aLoad?.schedule??[]).filter(row=>row.state==='failed'||row.error!==undefined)};
   error.reportPreservation={status:'PRESERVED',receipt:verifiedWrite('report-storage-failure.json',Buffer.from(JSON.stringify(failure)+'\n'))};
  }catch(preservationError){
   error.reportPreservation={status:'EVIDENCE_INCOMPLETE',error:{name:preservationError.name,message:preservationError.message,code:preservationError.code??null}};
  }
  console.error('[report-storage-failure] '+JSON.stringify({status:error.reportPreservation.status,reportComplete:false}));
  throw error;
 }
}
// S03 only: four named observation producers, not a general stdout collector.
export const officialObservationKinds=Object.freeze(['memory-attribution-cycle','current-observation','visual-query-observation','root-storage']);
export const officialObservationLimits=Object.freeze({chunkBytes:1048576,chunks:64,metadataBytes:32768,records:32000});
const observationKindCaps=[10000,10000,242,10008];
const observationSchema='s03-observation-jsonl-v1';
const observationDigest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function observationRead(dir,name,cap,strict=true){
 need(path.basename(name)===name&&fs.realpathSync(dir)===dir,'observation-path');
 const root=fs.lstatSync(dir);need(root.isDirectory()&&root.uid===process.getuid()&&(root.mode&511)===448,'observation-root');
 const file=path.join(dir,name),s=fs.lstatSync(file);
 need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid()&&(s.mode&511)===384&&(strict?s.size<cap:s.size<=cap),'observation-file');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const actual=fs.fstatSync(fd);need(actual.dev===s.dev&&actual.ino===s.ino&&actual.size===s.size&&actual.nlink===1,'observation-read-identity');
  const bytes=fs.readFileSync(fd);need(bytes.length===s.size,'observation-read-size');return bytes;
 }finally{fs.closeSync(fd);}
}
export function verifyOfficialObservationEvidence(dir,{allowPartial=false,record=null}={}){
 const limits=officialObservationLimits,start=JSON.parse(observationRead(dir,'s03-observation-start.json',limits.metadataBytes,false));
 need(start.schema===observationSchema&&JSON.stringify(start.kinds)===JSON.stringify(officialObservationKinds)&&JSON.stringify(start.limits)===JSON.stringify(limits),'observation-start');
 const manifestBytes=observationRead(dir,'s03-observation-manifest.json',limits.metadataBytes,false),m=JSON.parse(manifestBytes);
 need(m.schema===observationSchema&&['COMPLETE','PARTIAL'].includes(m.status)&&(allowPartial||m.status==='COMPLETE'),'observation-incomplete');
 need(m.startSha256===observationDigest(observationRead(dir,'s03-observation-start.json',limits.metadataBytes,false)),'observation-start-sha');
 need(Array.isArray(m.files)&&m.files.length<=limits.chunks,'observation-file-count');
 const counts=[0,0,0,0],digest=crypto.createHash('sha256');let seq=0,total=0;
 for(const [i,f] of m.files.entries()){
  need(f.file===`s03-observation-${String(i).padStart(4,'0')}.jsonl`&&f.first===seq+1,'observation-file-order');
  const bytes=observationRead(dir,f.file,limits.chunkBytes);need(bytes.length===f.bytes&&observationDigest(bytes)===f.sha256,'observation-file-sha');
  need(bytes.length>0&&bytes.at(-1)===10,'observation-record-tail');digest.update(bytes);total+=bytes.length;
  for(const line of bytes.toString('utf8').slice(0,-1).split('\n')){
   const v=JSON.parse(line);need(Array.isArray(v)&&v.length===3&&v[0]===++seq&&Number.isInteger(v[1])&&v[1]>=0&&v[1]<4,'observation-sequence');
   need(v[2]!==null&&typeof v[2]==='object'&&!Array.isArray(v[2]),'observation-value');
   need(++counts[v[1]]<=observationKindCaps[v[1]]&&seq<=limits.records,'observation-count-cap');
   if(record)record(officialObservationKinds[v[1]],v[2],v[0]);
  }
  need(seq===f.last,'observation-file-last');
 }
 const names=fs.readdirSync(dir).filter(n=>n.startsWith('s03-observation-')).sort();
 need(JSON.stringify(names)===JSON.stringify(['s03-observation-start.json','s03-observation-manifest.json',...m.files.map(f=>f.file)].sort()),'observation-file-set');
 need(m.storedRecords===seq&&JSON.stringify(m.storedCounts)===JSON.stringify(counts)&&m.dataBytes===total&&m.recordsSha256===digest.digest('hex'),'observation-summary');
 need(Number.isSafeInteger(m.acceptedRecords)&&m.acceptedRecords>=seq&&m.acceptedRecords<=limits.records&&Number.isSafeInteger(m.dropped)&&m.dropped>=0,'observation-accepted-count');
 if(m.status==='COMPLETE')need(m.acceptedRecords===seq&&m.dropped===0&&m.firstFailure===null&&m.observationFailure===null,'observation-complete');
 return {file:'s03-observation-manifest.json',bytes:manifestBytes.length,sha256:observationDigest(manifestBytes),status:m.status,records:seq,counts,dataBytes:total};
}
export function createOfficialObservationEvidence(artifacts,{admit}={}){
 need(typeof admit==='function','observation-admission-required');
 const limits=officialObservationLimits,files=[],counts=[0,0,0,0],storedCounts=[0,0,0,0],digest=crypto.createHash('sha256');
 let pending=[],pendingBytes=0,accepted=0,stored=0,total=0,dropped=0,first=null,firstRaised=false,writeFailed=false,closed=false;
 const fail=e=>{first??={name:e.name,message:e.message,code:e.code??null};return e;};
 const write=(name,bytes,cap,strict=false)=>{
  need(strict?bytes.length<cap:bytes.length<=cap,'observation-write-cap');
  admit(bytes.length+limits.metadataBytes);
  try{const receipt=artifacts.write(name,bytes),saved=observationRead(artifacts.outputDir,name,cap,strict);
   need(saved.equals(bytes)&&receipt.bytes===bytes.length&&receipt.sha256===observationDigest(bytes),'observation-write-readback');return receipt;
  }catch(e){writeFailed=true;throw e;}
 };
 const start=Buffer.from(JSON.stringify({schema:observationSchema,kinds:officialObservationKinds,limits})+'\n');
 // Retain the failed writer too: cleanup must not recreate/claim its start file.
 try{write('s03-observation-start.json',start,limits.metadataBytes);}catch(e){fail(e);}
 const flush=()=>{
  if(!pending.length)return;need(files.length<limits.chunks,'observation-chunk-cap');
  const bytes=Buffer.from(pending.map(p=>p.line).join('')),file=`s03-observation-${String(files.length).padStart(4,'0')}.jsonl`;
  const receipt=write(file,bytes,limits.chunkBytes,true);
  files.push({...receipt,first:stored+1,last:stored+pending.length});
  for(const p of pending)storedCounts[p.kind]++;stored+=pending.length;total+=bytes.length;digest.update(bytes);pending=[];pendingBytes=0;
 };
 return {
  failure:()=>first,
  append(kind,value){
   need(!closed,'observation-closed');if(first){dropped++;if(!firstRaised){firstRaised=true;throw Object.assign(Error(first.message),{code:first.code});}return false;}
   try{
    const k=officialObservationKinds.indexOf(kind);need(k>=0&&value!==null&&typeof value==='object'&&!Array.isArray(value),'observation-kind-value');
    need(accepted<limits.records&&counts[k]<observationKindCaps[k],'observation-count-cap');
    const line=JSON.stringify([accepted+1,k,value])+'\n',bytes=Buffer.byteLength(line);need(bytes<limits.chunkBytes,'observation-record-cap');
    if(pendingBytes+bytes>=limits.chunkBytes)flush();need(files.length<limits.chunks,'observation-chunk-cap');
    pending.push({line,kind:k});pendingBytes+=bytes;accepted++;counts[k]++;return true;
   }catch(e){dropped++;firstRaised=true;throw fail(e);}
  },
  finish(complete,observationFailure=null){
   need(!closed,'observation-closed');closed=true;
   if(!writeFailed)try{flush();}catch(e){fail(e);}
   const manifest={schema:observationSchema,status:complete&&!first&&!observationFailure?'COMPLETE':'PARTIAL',startSha256:observationDigest(start),
    acceptedRecords:accepted,storedRecords:stored,storedCounts,dataBytes:total,dropped,recordsSha256:digest.digest('hex'),files,firstFailure:first,observationFailure};
   let receipt;
   try{write('s03-observation-manifest.json',Buffer.from(JSON.stringify(manifest)+'\n'),limits.metadataBytes);
    receipt=verifyOfficialObservationEvidence(artifacts.outputDir,{allowPartial:manifest.status==='PARTIAL'});
   }catch(e){if(first)throw Object.assign(Error(first.message),{code:first.code,preservationError:e.message});throw e;}
   if(first)throw Object.assign(Error(first.message),{code:first.code,observationReceipt:receipt});return receipt;
  }
 };
}
// S03 common request() failure only. Search ledger IDs are not invented here.
export const officialHttpBodyLimits=Object.freeze({bodyBytes:4194304,chunkBytes:1048575,chunks:5,metadataBytes:32768});
export function verifyOfficialHttpErrorEvidence(dir,{allowPartial=false}={}){
 const l=officialHttpBodyLimits,read=name=>observationRead(dir,name,l.metadataBytes,false);
 const intentBytes=read('s03-http-error-intent.json'),intent=JSON.parse(intentBytes),m=JSON.parse(read('s03-http-error-receipt.json'));
 need(intent.schema==='s03-http-body-v1'&&intent.kind==='control'&&intent.mandatoryRequestId===null&&/^control-[1-9][0-9]{0,15}$/.test(intent.requestId),'http-evidence-identity');
 need(Number.isInteger(intent.status)&&intent.status>=100&&intent.status<=599&&intent.firstFailure===`http-status-${intent.status}`&&intent.stage==='response-status','http-evidence-status');
 need(Number.isSafeInteger(intent.bodyBytes)&&intent.bodyBytes>=0&&intent.bodyBytes<=l.bodyBytes&&/^[a-f0-9]{64}$/.test(intent.bodySha256),'http-evidence-body-cap');
 need(m.schema===intent.schema&&m.intentSha256===observationDigest(intentBytes)&&['COMPLETE','PARTIAL'].includes(m.status)&&(allowPartial||m.status==='COMPLETE'),'http-evidence-incomplete');
 need(Array.isArray(m.chunks)&&m.chunks.length<=l.chunks&&Array.isArray(m.evidenceErrors),'http-evidence-chunk-cap');
 const parts=[];let total=0;
 for(const [i,c] of m.chunks.entries()){
  need(c.file===`s03-http-body-${i}.bin`&&c.offset===total,'http-evidence-order');
  const b=observationRead(dir,c.file,l.chunkBytes,false);
  need(b.length>0&&b.length===c.bytes&&observationDigest(b)===c.sha256,'http-evidence-chunk-sha');parts.push(b);total+=b.length;
 }
 const names=fs.readdirSync(dir).filter(n=>n.startsWith('s03-http-body-')).sort();
 need(JSON.stringify(names)===JSON.stringify(m.chunks.map(c=>c.file).sort()),'http-evidence-file-set');
 const bytes=Buffer.concat(parts);
 need(total===m.storedBytes&&total<=intent.bodyBytes&&m.firstFailure===intent.firstFailure,'http-evidence-summary');
 if(m.status==='COMPLETE')need(total===intent.bodyBytes&&observationDigest(bytes)===intent.bodySha256&&m.evidenceErrors.length===0,'http-evidence-whole-sha');
 return {intent,receipt:m,bytes};
}
export function preserveOfficialHttpError(artifacts,{bytes,status,requestId,method,route,admit}){
 const l=officialHttpBodyLimits,error=Error(`http-status-${status}`),chunks=[],evidenceErrors=[];
 let intent=null,storedBytes=0,complete=false;
 const write=(name,data,cap)=>{need(data.length<=cap,'http-evidence-write-cap');admit(data.length+l.metadataBytes);
  const r=artifacts.write(name,data),saved=observationRead(artifacts.outputDir,name,cap,false);
  need(saved.equals(data)&&r.bytes===data.length&&r.sha256===observationDigest(data),'http-evidence-readback');return r;};
 try{
  need(typeof admit==='function'&&Buffer.isBuffer(bytes)&&bytes.length<=l.bodyBytes,'http-evidence-input-cap');
  need(/^control-[1-9][0-9]{0,15}$/.test(requestId)&&['GET','POST','PUT','DELETE','HEAD','PATCH'].includes(method)&&typeof route==='string'&&Buffer.byteLength(route)<=4096,'http-evidence-request');
  need(Number.isInteger(status)&&status>=100&&status<=599,'http-evidence-status');
  const value={schema:'s03-http-body-v1',requestId,mandatoryRequestId:null,kind:'control',method,route,status,stage:'response-status',firstFailure:error.message,
   bodyBytes:bytes.length,bodySha256:observationDigest(bytes),headers:'NOT_CAPTURED; existing request path does not persist headers'};
  intent=write('s03-http-error-intent.json',Buffer.from(JSON.stringify(value)+'\n'),l.metadataBytes);
  for(let offset=0;offset<bytes.length;offset+=l.chunkBytes){
   need(chunks.length<l.chunks,'http-evidence-chunk-cap');
   const chunk=bytes.subarray(offset,offset+l.chunkBytes),r=write(`s03-http-body-${chunks.length}.bin`,chunk,l.chunkBytes);
   chunks.push({...r,offset});storedBytes+=chunk.length;
  }
  complete=true;
 }catch(later){evidenceErrors.push({name:later.name,message:later.message,code:later.code??null});}
 try{
  const receipt={schema:'s03-http-body-v1',status:complete?'COMPLETE':'PARTIAL',intentSha256:intent?.sha256??null,firstFailure:error.message,storedBytes,chunks,evidenceErrors};
  const r=write('s03-http-error-receipt.json',Buffer.from(JSON.stringify(receipt)+'\n'),l.metadataBytes);
  if(complete){const restored=verifyOfficialHttpErrorEvidence(artifacts.outputDir);need(restored.bytes.equals(bytes),'http-evidence-reconstruction');}
  error.httpEvidence={file:r.file,sha256:r.sha256,status:receipt.status};
 }catch(later){complete=false;evidenceErrors.push({name:later.name,message:later.message,code:later.code??null});}
 // Errors stay private in the receipt/in-memory exception. stdout never expands them.
 error.evidenceErrors=evidenceErrors;
 error.httpReference={code:error.message,requestId:/^control-[1-9][0-9]{0,15}$/.test(requestId)?requestId:null,status,
  bodyBytes:Buffer.isBuffer(bytes)?bytes.length:null,bodySha256:Buffer.isBuffer(bytes)?observationDigest(bytes):null,
  file:error.httpEvidence?.file??null,sha256:error.httpEvidence?.sha256??null,preservation:complete?'COMPLETE':'PARTIAL'};
 return error;
}
// Official Driver/A call sites only. Framed binary avoids base64 expansion and
// preserves raw HTTP bytes separately from already-formatted diagnostic text.
export const officialRemainingLimits=Object.freeze({chunkBytes:1048575,chunks:64,records:32000,headerBytes:16384,bodyBytes:4194304,textBytes:8388608,manifestBytes:32768});
export function verifyOfficialRemainingEvidence(dir,{allowPartial=false}={}){
 const l=officialRemainingLimits,m=JSON.parse(observationRead(dir,'s03-remaining-manifest.json',l.manifestBytes,false));
 need(m.schema==='s03-remaining-v1'&&['COMPLETE','PARTIAL'].includes(m.status)&&(allowPartial||m.status==='COMPLETE'),'remaining-incomplete');
 need(Array.isArray(m.files)&&m.files.length<=l.chunks,'remaining-file-count');
 const parts=[];let total=0;
 for(const [i,f] of m.files.entries()){
  need(f.file===`s03-remaining-${String(i).padStart(3,'0')}.bin`&&f.offset===total,'remaining-file-order');
  const b=observationRead(dir,f.file,l.chunkBytes,false);need(b.length>0&&b.length===f.bytes&&observationDigest(b)===f.sha256,'remaining-file-sha');parts.push(b);total+=b.length;
 }
 need(JSON.stringify(fs.readdirSync(dir).filter(n=>/^s03-remaining-.*\.bin$/.test(n)).sort())===JSON.stringify(m.files.map(f=>f.file).sort()),'remaining-file-set');
 const stream=Buffer.concat(parts);need(total===m.storedBytes&&observationDigest(stream)===m.streamSha256,'remaining-stream-sha');
 const records=[];let at=0;
 while(at<stream.length){
  if(at+4>stream.length)break;const size=stream.readUInt32BE(at);need(size>0&&size<=l.headerBytes,'remaining-header-cap');
  if(at+4+size>stream.length)break;const h=JSON.parse(stream.subarray(at+4,at+4+size));
  need(h.sequence===records.length+1&&h.sequence<=l.records&&['response','stdout','stderr'].includes(h.kind),'remaining-sequence');
  need(Number.isSafeInteger(h.bytes)&&h.bytes>=0&&h.bytes<=(h.kind==='response'?l.bodyBytes:l.textBytes),'remaining-record-cap');
  let body;
  if(h.reuse!==null){need(h.kind==='response'&&Number.isInteger(h.reuse)&&h.reuse>0&&h.reuse<h.sequence,'remaining-reuse');const prior=records[h.reuse-1];need(prior.kind==='response','remaining-reuse-kind');body=prior.body;}
  else{if(at+4+size+h.bytes>stream.length)break;body=stream.subarray(at+4+size,at+4+size+h.bytes);}
  need(body.length===h.bytes&&observationDigest(body)===h.sha256,'remaining-body-sha');
  records.push({...h,body});at+=4+size+(h.reuse===null?h.bytes:0);
 }
 need(records.length<=m.acceptedRecords&&m.acceptedRecords<=l.records,'remaining-count');
 if(m.status==='COMPLETE')need(at===stream.length&&records.length===m.acceptedRecords&&m.firstFailure===null&&m.observationFailure===null,'remaining-complete');
 return {manifest:m,records,partialTailBytes:stream.length-at,reference:{file:'s03-remaining-manifest.json',sha256:observationDigest(observationRead(dir,'s03-remaining-manifest.json',l.manifestBytes,false)),status:m.status,records:records.length,bytes:total}};
}
export function createOfficialRemainingEvidence(artifacts,{admit}){
 need(typeof admit==='function','remaining-admission');const l=officialRemainingLimits,files=[],dedup=new Map(),hash=crypto.createHash('sha256');
 let pending=Buffer.alloc(0),accepted=0,stored=0,first=null,closed=false,writeFailed=false;
 const fail=e=>{first??={name:e.name,message:e.message,code:e.code??null};return e;};
 const write=(name,bytes,cap)=>{need(bytes.length<=cap,'remaining-write-cap');admit(bytes.length+l.manifestBytes);
  try{const r=artifacts.write(name,bytes),b=observationRead(artifacts.outputDir,name,cap,false);need(b.equals(bytes)&&r.sha256===observationDigest(bytes)&&r.bytes===bytes.length,'remaining-write-readback');return r;}
  catch(e){writeFailed=true;throw e;}};
 const flush=()=>{if(!pending.length)return;need(files.length<l.chunks,'remaining-chunk-cap');const r=write(`s03-remaining-${String(files.length).padStart(3,'0')}.bin`,pending,l.chunkBytes);files.push({...r,offset:stored});stored+=pending.length;hash.update(pending);pending=Buffer.alloc(0);};
 const append=(kind,body,meta)=>{
  need(!closed,'remaining-closed');if(first)throw Object.assign(Error(first.message),{code:first.code});
  try{
   need(Buffer.isBuffer(body)&&body.length<=(kind==='response'?l.bodyBytes:l.textBytes)&&accepted<l.records,'remaining-input-cap');
   const sha256=observationDigest(body),reuse=kind==='response'?(dedup.get(sha256)??null):null;
   const header=Buffer.from(JSON.stringify({sequence:accepted+1,kind,bytes:body.length,sha256,reuse,meta}));need(header.length<=l.headerBytes,'remaining-header-cap');
   const length=Buffer.alloc(4);length.writeUInt32BE(header.length);const frame=Buffer.concat([length,header,...(reuse===null?[body]:[])]);
   need(stored+pending.length+frame.length<=l.chunkBytes*l.chunks,'remaining-total-cap');
   // Reserve the entire accepted frame before emitting any part; keep the existing closeout reserve in the caller.
   admit(pending.length+frame.length+l.manifestBytes);accepted++;
   for(let offset=0;offset<frame.length;){const n=Math.min(l.chunkBytes-pending.length,frame.length-offset);pending=Buffer.concat([pending,frame.subarray(offset,offset+n)]);offset+=n;if(pending.length===l.chunkBytes)flush();}
   if(kind==='response'&&reuse===null)dedup.set(sha256,accepted);return accepted;
  }catch(e){throw fail(e);}
 };
 return {failure:()=>first,
  response(bytes,meta){need(meta&&Number.isInteger(meta.status)&&typeof meta.route==='string'&&typeof meta.method==='string','remaining-response-meta');return append('response',bytes,{...meta,validation:'NOT_EVALUATED_AT_CAPTURE; bind subsequent check/failure diagnostics and Report'});},
  diagnostic(stream,text){need(['stdout','stderr'].includes(stream)&&typeof text==='string','remaining-diagnostic');return append(stream,Buffer.from(text+'\n'),null);},
  finish(complete,observationFailure=null){need(!closed,'remaining-closed');closed=true;if(!writeFailed)try{flush();}catch(e){fail(e);}
   const m={schema:'s03-remaining-v1',status:complete&&!first&&!observationFailure?'COMPLETE':'PARTIAL',acceptedRecords:accepted,storedBytes:stored,files,streamSha256:hash.digest('hex'),firstFailure:first,observationFailure};
   let r,verified;try{r=write('s03-remaining-manifest.json',Buffer.from(JSON.stringify(m)+'\n'),l.manifestBytes);
    verified=verifyOfficialRemainingEvidence(artifacts.outputDir,{allowPartial:m.status==='PARTIAL'});
   }catch(later){if(first)throw Object.assign(Error(first.message),{code:first.code,preservationError:later.message});throw later;}
   if(first)throw Object.assign(Error(first.message),{code:first.code,remainingReceipt:r});return verified.reference;
  }};
}
export function searchPerformanceResult({final,trace,completion,logsCaptured,batches}){
 const omitted={retentionDeletion:'NOT_RUN',retentionPostDeletionStability:'NOT_RUN',memoryP0:'NOT_RUN',readiness120:'NOT_RUN',releaseQualification:'NOT_RUN'};
 const m=final.evidenceLoad,a=final.aLoad, channels=final.phase?.channels;
 const progression=['9101','9201'].every(id=>Number.isSafeInteger(channels?.[id]?.finalized)&&channels[id].finalized>0);
 const latencies=m?.searchLatencyMs;
 const timing=Array.isArray(latencies)&&latencies.length>0&&latencies.every(n=>Number.isFinite(n)&&n>=0)&&latencies.length===m.searchSuccess;
 const ordered=timing?[...latencies].sort((a,b)=>a-b):[];
 const p95=ordered.at(Math.ceil(ordered.length*.95)-1)??null,max=ordered.at(-1)??null;
 const latency=timing?(p95<=2000&&max<=5000?'PASS':'FAIL'):'INCOMPLETE';
 const bound=['client','server','search'].every(kind=>Array.isArray(trace?.[kind])&&trace[kind].length===15&&new Set(trace[kind].map(r=>r.id)).size===15&&trace[kind].every(r=>Number.isInteger(r.id)&&r.id>=1&&r.id<=15&&r.loss===false));
 const collection=Array.isArray(completion)&&completion.length===final.processCount&&completion.length>0&&completion.every(c=>c.status==='captured')&&logsCaptured===true;
 const workload=Number.isSafeInteger(batches)&&batches>0&&m?.searchSuccessByClient?.length===4&&m.searchSuccessByClient.every(n=>Number.isSafeInteger(n)&&n>0)&&m.searchSuccessByClient.reduce((a,b)=>a+b,0)===m.searchSuccess&&Number.isSafeInteger(m.searchUnavailable)&&m.searchUnavailable>=0&&m.searchSuccess+m.searchUnavailable===batches*4&&m.cycles>0&&m.createComplete>0&&m.visualResults>0&&m.visualCreated>0&&m.windows?.length===3&&m.windows.every(w=>['structured','visual','evidence','visualEvidence'].every(k=>w[k]>0))&&a?.completed?.some(r=>r.state==='completed'&&r.label?.startsWith('main-'));
 const complete=timing&&bound&&collection&&workload&&final.verifiedDurationMs>=1800000;
 const status=!complete?'INCOMPLETE':final.failed!==0||!progression||latency==='FAIL'||final.processesClosed!==true||final.udpClosed!==true?'FAIL':'PASS';
 return {...omitted,status,recordingProgression:progression?'PASS':'FAIL',latency:{status:latency,count:ordered.length,p95,max,limitP95:2000,limitMax:5000},requestCompleteness:workload?'PASS':'INCOMPLETE',selectedCorrelation:bound?'PASS':'INCOMPLETE',completionCollection:collection?'PASS':'INCOMPLETE',outputBudget:'CAPACITY_UNPROVEN'};
}

// R171 owned opt-in companion to costCollector, same bounded line decoder.
const attributionErrors=['recording-search-unavailable','search-capacity-exceeded','search-event-evidence-incomplete','search-snapshot-expired','search-hit-unavailable','search-cursor-binding-mismatch','search-invalid-cursor','search-invalid-query','search-invalid-behaviour','recording-channel-forbidden','invalid-recording-search-query'];
export function attributionError(bytes){try{if(!bytes||bytes.length>256)return 'UNKNOWN';const r=JSON.parse(bytes.toString());return attributionErrors.includes(r.error)?r.error:'UNKNOWN';}catch{return 'UNKNOWN';}}
export function failureCollector(){
 const maps=Object.fromEntries(['dispatch','search-enter','search','server','client'].map(k=>[k,new Map()]));
 const starts=new Set(),lines=[0,1].map(()=>diagnosticLines(['[R171-'],16384));let first=null,total=0,clientBytes=0,details=0;
 const fail=e=>first??={code:e.message,detectedMs:performance.now()};
 const valid=id=>number(id)&&id>=1&&id<=512;
 function accept(kind,r){
  need(!first,'sticky-attribution-loss');need(maps[kind]&&r&&valid(r.id)&&starts.has(r.id),'attribution-id');need(!maps[kind].has(r.id),'attribution-duplicate');need(r.loss===false,'attribution-loss');
  const stamp=n=>number(n)&&n>0;
  if(kind==='dispatch'||kind==='search-enter')need(stamp(r.at),'attribution-stamp');
  if(kind==='server'){
   need(['dispatch','handler','prepared','sendBegin','sendEnd','end'].every(k=>number(r[k]))&&stamp(r.dispatch)&&r.end>=r.dispatch,'attribution-server-order');
   const a=[r.dispatch,r.handler,r.prepared,r.sendBegin,r.sendEnd,r.end].filter(Boolean);need(a.every((v,i)=>!i||v>=a[i-1]),'attribution-server-order');
   need(number(r.status)&&r.status<=599&&typeof r.sent==='boolean','attribution-server-status');if(r.sent)need(r.status>=100&&r.sendBegin>0&&r.sendEnd>=r.sendBegin,'attribution-send');
  }
  if(kind==='search'){
   need(stamp(r.begin)&&stamp(r.end)&&r.end>=r.begin&&number(r.diagnosticStatus)&&r.diagnosticStatus>=100&&r.diagnosticStatus<=599&&typeof r.detail==='boolean','attribution-search-order');
   need(['none','bad-alloc','length-error','retained-read','resource','std-exception'].includes(r.exception)&&Array.isArray(r.rejections)&&r.rejections.length===2&&r.rejections.every(number)&&r.rejections[1]>=r.rejections[0],'attribution-exception-resource');
   need(Array.isArray(r.attempts)&&r.attempts.length>=1&&r.attempts.length<=3,'attribution-attempts');
   const stages=['start','parse','snapshot-resume','refresh','capture-source','validate-source','event-facts','with-playback','snapshot-begin','currentness-json','reference-resolution','playback-candidates','playback-model-build','model-build','model-delta'];
   const reasons=['none','internal-unavailable','search-source-changed','search-source-unavailable','search-capacity-exceeded','search-playback-candidate-capacity','search-snapshot-capacity','search-event-evidence-incomplete','search-snapshot-expired','search-cursor-binding-mismatch','search-invalid-cursor','search-invalid-query'];
   for(const a of r.attempts)need(stages.includes(a.stage)&&reasons.includes(a.reason)&&number(a.captured)&&number(a.current)&&typeof a.authority==='boolean','attribution-reason');
   need(Array.isArray(r.captures)&&r.captures.length<=6&&Array.isArray(r.phases)&&r.phases.length<=40,'attribution-shape');
   if(r.detail)need(++details<=24,'attribution-detail-cap');else need(!r.captures.length&&!r.phases.length,'attribution-normal-detail');
   for(const [i,c] of r.captures.entries()){
    need(Array.isArray(c)&&c.length===21&&c.slice(0,20).every(number)&&typeof c[20]==='boolean','attribution-capture-shape');
    need(c[0]===i+1&&c[1]<c[0]&&c[2]<r.attempts.length&&c[3]>=r.begin&&c[4]>=c[3]&&c[4]<=r.end&&c[11]<=c[10]&&c[19]>=c[18],'attribution-capture-order');
    if(c[1]){const p=r.captures[c[1]-1];need(p[2]===c[2]&&c[3]>=p[3]&&c[4]<=p[4],'attribution-capture-parent');}
    need(c[8]<=c[4]-c[3]&&c[9]<=c[4]-c[3],'attribution-capture-duration');
   }
   for(const p of r.phases)need(Array.isArray(p)&&p.length===3&&typeof p[0]==='string'&&p[0].length<=64&&stamp(p[1])&&stamp(p[2])&&p[1]>=r.begin&&p[2]>=p[1]&&p[2]<=r.end,'attribution-phase');
  }
  if(kind==='client'){
   need((r.status===null||number(r.status)&&r.status>=100&&r.status<=599)&&number(r.totalElapsedMs)&&number(r.bytes)&&['ok','error','timeout'].includes(r.outcome)&&['header','body','complete'].includes(r.phase)&&typeof r.headerReceived==='boolean'&&['UNKNOWN',...attributionErrors].includes(r.reason),'attribution-client');
   need(r.headerReceived===(r.status!==null)&&(!(r.phase==='complete')||r.headerReceived&&r.outcome==='ok'),'attribution-client-completion');
  }
  maps[kind].set(r.id,r);
 }
 return {
  start(id){try{need(valid(id)&&!starts.has(id),'attribution-duplicate-start');starts.add(id);}catch(e){fail(e);throw e;}},
  client(r){try{const line='[R171-client] '+JSON.stringify(r)+'\n';clientBytes+=Buffer.byteLength(line);need(Buffer.byteLength(line)<=512&&clientBytes<=256*1024,'attribution-client-cap');accept('client',r);return line;}catch(e){fail(e);throw e;}},
  append(chunk,stream){try{lines[stream].append(chunk,line=>{total+=Buffer.byteLength(line)+1;need(total<=512*1024,'attribution-byte-cap');const m=line.match(/^\[R171-(dispatch|search-enter|search|server)\] (.*)$/);need(m,'attribution-record');accept(m[1],JSON.parse(m[2]));});}catch(e){fail(e);}},
  failure(){return first;},
  snapshot(){return [...starts].map(id=>({id,client:maps.client.get(id)??null,dispatchObserved:maps.dispatch.has(id),searchObserved:maps['search-enter'].has(id),server:maps.server.get(id)??null,search:maps.search.get(id)??null,internalCause:maps.search.has(id)&&maps.server.has(id)?'OBSERVED_TERMINAL':'UNKNOWN'}));},
  complete(){try{for(const l of lines)l.finish();if(first)throw Error(first.code);for(const id of starts){const d=maps.dispatch.get(id),s=maps.server.get(id),q=maps.search.get(id),e=maps['search-enter'].get(id);need(maps.client.has(id)&&d&&s,'attribution-missing-terminal');need(s.dispatch===d.at,'attribution-dispatch-mismatch');need(s.sent,'attribution-send-incomplete');if(s.status===200)need(q&&e,'attribution-missing-search');need(!!q===!!e,'attribution-missing-search-terminal');if(maps.client.get(id).status!==null)need(maps.client.get(id).status===s.status,'attribution-http-status');if(q)need(q.diagnosticStatus===s.status,'attribution-search-status');if(q)need(s.handler>0&&s.handler<=e.at&&e.at===q.begin&&q.end<=s.prepared,'attribution-search-binding');}return {status:'captured',serverBytes:total,clientBytes,details,requests:this.snapshot()};}catch(e){fail(e);throw e;}}
 };
}

// v2 is an explicit owned-overlay opt-in. Legacy collectors above keep their contracts.
// Stream PID comes from the owned child pipe; OS identity/sequence come from native samples.
export function mandatoryRequestLedger(){
 const requests=new Map(),processes=new Map(),wire=[0,1].map(()=>diagnosticLines(['[R171-'],16384));
 const disabled=[false,false];let first=null,serverBytes=0,detailBytes=0,clientBytes=0,detailErrors=0,detailRecords=0;
 const finite=n=>Number.isFinite(n)&&n>=0,stamp=n=>number(n)&&n>0;
 const latch=(code,id=null)=>first??={code,id,detectedMs:performance.now()};
 const requireValue=(ok,code)=>need(ok,code);
 const audit={eligible:0,captured:0,omittedCap:0,omittedBytes:0,firstOmission:null};
 const ordinals=new Set();
 const stages=new Set(['start','parse','snapshot-resume','refresh','capture-source','validate-source','event-facts','with-playback','snapshot-begin','currentness-json','reference-resolution','playback-candidates','playback-model-build','model-build','model-delta']);
 const reasons=new Set(['none','internal-unavailable','search-source-changed','search-source-unavailable','search-capacity-exceeded','search-playback-candidate-capacity','search-snapshot-capacity','search-event-evidence-incomplete','search-snapshot-expired','search-cursor-binding-mismatch','search-invalid-cursor','search-invalid-query']);
 function encode(kind,r){const line=`[R171-${kind}] ${JSON.stringify(r)}\n`;const bytes=Buffer.byteLength(line);
  requireValue(bytes<=512&&clientBytes+bytes<=256*1024,'ledger-client-cap');clientBytes+=bytes;return line;}
 function crossCheck(q){
  const {client:c,server:s,search:x}=q;if(!s)return;
  if(c&&c.status!==null&&c.status!==s.status)latch('ledger-http-status',q.id);
  if(c?.outcome==='ok'&&(!s.sent||c.phase!=='complete'))latch('ledger-incomplete-send',q.id);
  if(x&&(x.diagnosticStatus!==s.status||!s.handler||s.handler>x.begin||x.end>s.prepared))latch('ledger-search-binding',q.id);
 }
 function receive(kind,r,pid){
  requireValue(r?.v===2&&number(r.id)&&requests.has(r.id),'ledger-request-id');const q=requests.get(r.id);
  requireValue(r.pid===q.pid&&pid===q.pid,'ledger-stream-pid');requireValue(!q[kind],'ledger-duplicate-'+kind);
  if(kind==='server'){
   requireValue(['dispatch','handler','prepared','sendBegin','sendEnd','end'].every(k=>number(r[k]))&&stamp(r.dispatch),'ledger-server-clock');
   const a=[r.dispatch,r.handler,r.prepared,r.sendBegin,r.sendEnd,r.end].filter(Boolean);
   requireValue(a.every((v,i)=>!i||v>=a[i-1])&&r.end>=r.dispatch,'ledger-server-order');
   requireValue(number(r.status)&&r.status<=599&&typeof r.sent==='boolean'&&typeof r.loss==='boolean','ledger-server-status');
   requireValue(!r.sent||(r.status>=100&&r.sendBegin>0&&r.sendEnd>=r.sendBegin),'ledger-server-send');
  }else if(kind==='search'){
   requireValue(q.kind==='structured'&&stamp(r.begin)&&stamp(r.end)&&r.end>=r.begin,'ledger-search-clock');
   requireValue(number(r.diagnosticStatus)&&r.diagnosticStatus>=100&&r.diagnosticStatus<=599&&typeof r.loss==='boolean','ledger-search-status');
   requireValue(['none','bad-alloc','length-error','retained-read','resource','std-exception'].includes(r.exception),'ledger-exception');
   requireValue(Array.isArray(r.rejections)&&r.rejections.length===2&&r.rejections.every(number)&&r.rejections[1]>=r.rejections[0],'ledger-rejections');
   requireValue(number(r.retry)&&r.retry<=2&&Array.isArray(r.attempts)&&r.attempts.length===r.retry+1,'ledger-retry');
   for(const a of r.attempts)requireValue(stages.has(a.stage)&&reasons.has(a.reason)&&number(a.captured)&&number(a.current)&&typeof a.authority==='boolean','ledger-attempt');
   for(const k of ['waitNs','holdNs'])requireValue(r[k]===null||(number(r[k])&&r[k]<=r.end-r.begin),'ledger-phase-duration');
   requireValue(typeof r.detailEligible==='boolean'&&number(r.detailOrdinal)&&['not-selected','captured','detail-cap','detail-byte-budget','error'].includes(r.detailState),'ledger-detail-state');
   if(!r.detailEligible)requireValue(r.detailOrdinal===0&&r.detailState==='not-selected','ledger-detail-selection');
   else{
    requireValue(r.detailOrdinal>=1&&r.detailOrdinal<=512&&!ordinals.has(r.detailOrdinal)&&r.detailState!=='not-selected','ledger-detail-ordinal');
    requireValue(r.detailOrdinal>24?r.detailState==='detail-cap'||r.detailState==='error':r.detailState!=='detail-cap','ledger-detail-cap');
    ordinals.add(r.detailOrdinal);audit.eligible++;
    if(r.detailState==='captured')audit.captured++;
    if(r.detailState==='detail-cap')audit.omittedCap++;
    if(r.detailState==='detail-byte-budget')audit.omittedBytes++;
    if(r.detailState==='error'){detailErrors++;latch('ledger-detail-error',r.id);}
    if(['detail-cap','detail-byte-budget'].includes(r.detailState)&&(!audit.firstOmission||r.detailOrdinal<audit.firstOmission.ordinal))audit.firstOmission={id:r.id,ordinal:r.detailOrdinal,reason:r.detailState};
   }
   requireValue(audit.captured<=24,'ledger-detail-count');
  }else if(kind==='detail'){
   requireValue(q.search?.detailState==='captured'&&detailRecords<24,'ledger-unexpected-detail');
   requireValue(Array.isArray(r.captures)&&r.captures.length<=6&&Array.isArray(r.phases)&&r.phases.length<=40,'ledger-detail-shape');
   for(const [i,c] of r.captures.entries()){
    requireValue(Array.isArray(c)&&c.length===21&&c.slice(0,20).every(number)&&typeof c[20]==='boolean','ledger-capture-shape');
    requireValue(c[0]===i+1&&c[1]<c[0]&&c[2]<=q.search.retry&&c[3]>=q.search.begin&&c[4]>=c[3]&&c[4]<=q.search.end&&c[8]<=c[4]-c[3]&&c[9]<=c[4]-c[3]&&c[11]<=c[10]&&c[19]>=c[18],'ledger-capture-order');
    if(c[1]){const parent=r.captures[c[1]-1];requireValue(parent[2]===c[2]&&c[3]>=parent[3]&&c[4]<=parent[4],'ledger-capture-parent');}
   }
   for(const p of r.phases)requireValue(Array.isArray(p)&&p.length===3&&typeof p[0]==='string'&&p[0].length<=64&&stamp(p[1])&&stamp(p[2])&&p[1]>=q.search.begin&&p[2]>=p[1]&&p[2]<=q.search.end,'ledger-detail-phase');
   detailRecords++;
   // Full optional payload already lives in the bounded product log, not a second heap queue.
   q.detail={captured:true};return;
  }else throw Error('ledger-record-kind');
  q[kind]=r;if(r.loss)latch('ledger-producer-loss',r.id);crossCheck(q);
 }
 const resultRows=()=>[...requests.values()].map(q=>{
  const c=q.client,s=q.server,x=q.search;
  let state=!c?'supervisor-incomplete':c.outcome==='ok'&&c.phase==='complete'?(c.status>=200&&c.status<300?'success':'http-error'):c.outcome;
  if(state==='ok')state='incomplete';
  const clientTerminalMissing=!c||c.outcome==='incomplete'||(c.outcome==='ok'&&c.phase!=='complete');
  const serverTerminalMissing=!s,searchTerminalMissing=q.kind==='structured'&&s?.status===200&&!x;
  return {...q,client:c??null,server:s??null,search:x??null,state,clientTerminalMissing,serverTerminalMissing,searchTerminalMissing,serverSearchLatencyMs:x?(x.end-x.begin)/1e6:null,retry:x?.retry??null,
   preparationWaitNs:x?.waitNs??null,preparationHoldNs:x?.holdNs??null,
   searchObservation:x?'observed':q.kind==='visual'?'not-instrumented':'not-observed',
   terminalMissing:clientTerminalMissing||serverTerminalMissing||searchTerminalMissing};
 });
 function metrics(rows){const times=rows.filter(q=>q.state==='success'&&!q.terminalMissing).map(q=>q.client.totalElapsedMs).sort((a,b)=>a-b);
  const percentile=p=>times.length?times[Math.ceil(times.length*p)-1]:null;
  return {started:rows.length,completed:rows.filter(q=>!q.clientTerminalMissing).length,success:rows.filter(q=>q.state==='success').length,
   errors:rows.filter(q=>['error','http-error'].includes(q.state)).length,timeouts:rows.filter(q=>q.state==='timeout').length,cancelled:rows.filter(q=>q.state==='cancelled').length,
   terminalMissing:rows.filter(q=>q.terminalMissing).length,validSamples:times.length,p50:percentile(.5),p90:percentile(.9),p95:percentile(.95),max:times.at(-1)??null};}
 return {
  failure:()=>first,
  fail(code,id=null){return latch(code,id);},
  bindProcess(m,resource){try{
   requireValue(m?.valid===true&&m.error===null&&stamp(m.pid)&&typeof m.startIdentity==='string'&&m.startIdentity.length<=96&&/^(macos:\d+:\d+|linux:\d+)$/.test(m.startIdentity),'ledger-process-identity');
   requireValue(resource?.pid===m.pid&&number(resource.seq),'ledger-resource-binding');
   const previous=processes.get(m.pid);requireValue(!previous||previous.startIdentity===m.startIdentity,'ledger-identity-changed');
   requireValue(!previous||resource.seq>=previous.resourceSequence,'ledger-resource-sequence');requireValue(previous||processes.size<3,'ledger-process-cap');
   processes.set(m.pid,{pid:m.pid,startIdentity:m.startIdentity,resourceSequence:resource.seq});
  }catch(e){latch(e.message);throw e;}},
  start(id,{kind,pid,startedMs}){try{
   requireValue(!first,'ledger-stopped');requireValue(number(id)&&id>=1&&id<=512&&!requests.has(id),'ledger-start-id');
   requireValue(['structured','visual'].includes(kind)&&finite(startedMs)&&processes.has(pid),'ledger-start-binding');
   const q={v:2,id,kind,...processes.get(pid),startedMs};const line=encode('start',q);requests.set(id,q);return line;
  }catch(e){latch(e.message,id);throw e;}},
  client(r){try{
   const q=requests.get(r?.id);requireValue(q&&r.v===2&&r.pid===q.pid,'ledger-client-binding');requireValue(!q.client,'ledger-duplicate-client');
   requireValue(['ok','error','timeout','cancelled','incomplete'].includes(r.outcome)&&['header','body','complete','unobserved'].includes(r.phase),'ledger-client-outcome');
   requireValue(r.status===null||(number(r.status)&&r.status>=100&&r.status<=599),'ledger-client-status');
   requireValue(finite(r.endedMs)&&r.endedMs>=q.startedMs&&(r.totalElapsedMs===null||finite(r.totalElapsedMs)),'ledger-client-clock');
   requireValue(r.totalElapsedMs===null||r.totalElapsedMs<=r.endedMs-q.startedMs+1,'ledger-client-duration');
   requireValue(number(r.bytes)&&typeof r.headerReceived==='boolean'&&r.headerReceived===(r.status!==null)&&['UNKNOWN',...attributionErrors].includes(r.reason),'ledger-client-receipt');
   requireValue(r.phase!=='complete'||(r.headerReceived&&r.outcome==='ok'&&finite(r.totalElapsedMs)),'ledger-client-complete');
   const line=encode('client',r);q.client=r;crossCheck(q);
   if(r.outcome==='incomplete'||(r.outcome==='ok'&&r.phase!=='complete'))latch('ledger-incomplete-client',r.id);
   return line;
  }catch(e){latch(e.message,r?.id??null);throw e;}},
  append(chunk,stream,pid){if(disabled[stream])return;try{wire[stream].append(chunk,(line,bytes)=>{
   // Catch per record so the existing decoder resets carry and drains subsequent terminals.
   let kind=null;try{
    const match=line.match(/^\[R171-(server|search|detail)\] (.*)$/);requireValue(match,'ledger-wire-kind');kind=match[1];
    if(kind==='detail'){detailBytes+=bytes;requireValue(detailBytes<=128*1024,'ledger-detail-bytes');}
    else{serverBytes+=bytes;requireValue(serverBytes<=384*1024-192,'ledger-server-cap');}
    receive(kind,JSON.parse(match[2]),pid);
   }catch(e){if(kind==='detail')detailErrors++;latch(e instanceof SyntaxError?'ledger-invalid-json':e.message);}
  });}catch(e){disabled[stream]=true;latch(e.message);}},
  report({cleanupComplete=false}={}){
   for(const line of wire)try{line.finish();}catch(e){latch(e.message);}
   for(const q of requests.values())try{
    requireValue(q.client&&q.client.outcome!=='incomplete'&&q.client.phase!=='unobserved','ledger-missing-client');
    requireValue(q.server,'ledger-missing-server');const c=q.client,s=q.server,x=q.search;
    requireValue(c.status===null||c.status===s.status,'ledger-http-status');
    if(c.outcome==='ok')requireValue(s.sent&&c.phase==='complete','ledger-incomplete-send');
    if(q.kind==='structured'&&s.status===200)requireValue(x,'ledger-missing-search');
    if(x){requireValue(x.diagnosticStatus===s.status&&s.handler>0&&s.handler<=x.begin&&x.end<=s.prepared,'ledger-search-binding');
     if(x.detailState==='captured')requireValue(q.detail,'ledger-missing-detail');}
   }catch(e){latch(e.message,q.id);}
   if(ordinals.size&&[...ordinals].sort((a,b)=>a-b).some((n,i)=>n!==i+1))latch('ledger-detail-ordinal-gap');
   if(!cleanupComplete)latch('ledger-cleanup-incomplete');
   const rows=resultRows(),result={schema:'search-mandatory-ledger-v2',status:first?'incomplete':'captured',firstFailure:first,
    clocks:{client:'performance.now milliseconds; no server-origin subtraction',server:'steady_clock nanoseconds',identity:'native process sample bound to owned pipe; not sampled on every request'},
    bytes:{mandatoryServer:serverBytes,optionalDetail:detailBytes,client:clientBytes},detail:{...audit,records:detailRecords,errors:detailErrors,missing:rows.filter(q=>q.search?.detailState==='captured'&&!q.detail).length},
    metrics:{structured:metrics(rows.filter(q=>q.kind==='structured')),visual:metrics(rows.filter(q=>q.kind==='visual')),combined:metrics(rows)},requests:rows,
    officialGate:'unchanged combined successful-search gate; no PASS from this diagnostic summary',cleanup:{complete:cleanupComplete},full30minCapacity:'UNPROVEN'};
   if(Buffer.byteLength(JSON.stringify(result))>1024*1024){latch('ledger-report-cap');throw Error('ledger-report-cap');}return result;
  }
 };
}

// Existing HTTP operations retain their 5s abort and outer deadline. No new retry/timer.
export async function settleLedgerBatch(ledger,operations){
 if(ledger.failure())throw Error(ledger.failure().code);
 const results=await Promise.allSettled(operations.map(operation=>Promise.resolve().then(()=>{
  if(ledger.failure())throw Error(ledger.failure().code);return operation();
 }).catch(error=>{ledger.fail('ledger-batch-failed');throw error;})));
 const rejected=results.find(r=>r.status==='rejected');
 if(rejected)throw rejected.reason;if(ledger.failure())throw Error(ledger.failure().code);
 return results.map(r=>r.value);
}

// Separate diagnostic contract. The reserve is a scheduling allowance, not
// proof of background-output capacity or a guaranteed shutdown duration.
export const limitedSearchContract=Object.freeze({option:'--limited-search-diagnostic',hardMs:300000,intervalMs:15000,batches:20,requests:80,httpMs:5000,finishReserveMs:60000});
export function limitedSearchCapacity(){return {
 status:'BLOCKED',mandatoryServerBytes:40*2047+80*511,optionalDetailBytes:128*1024,clientBytes:80*2*512,
 unresolved:['product-background-4MiB','completion-row-byte-cap','resource-memory-fd-continuity','parent-artifacts','workspace-variable-copy-combined','shutdown-and-supervisor-deadline','isolated-latest-build-link'],
 costs:{
  mandatory:{upperBytes:122760,capBytes:384*1024-192},detail:{upperBytes:128*1024,capBytes:128*1024},client:{upperBytes:81920,capBytes:256*1024},
  productLog:{upperBytes:null,capBytes:4*1024*1024,guard:'captureBoundedProcessLog; overflow is fatal'},
  completion:{upperBytes:null,capBytes:2*1024*1024,rowCap:4096,guard:'completionTrace.error -> stop'},
  resource:{upperBytes:null,sampleCap:1600,guard:'resourceTrace.error -> stop'},
  memory:{upperBytes:null,sampleCap:1600,guard:'memoryTrace.error -> stop when enabled'},
  fdRss:{upperBytes:null,guard:'existing sample identity/receipt and resource budgets'},
  parentLog:{upperBytes:2*1024*1024,capBytes:2*1024*1024,guard:'LimitedParentCapture; combined pipe; at-cap fails; raw-prefix SHA receipt'},
  parentReceipts:{upperBytes:2*32768,capBytes:2*32768,guard:'two exclusive bounded receipts; not extra log allowance'},
  startupShutdown:{upperBytes:null},evidence:{upperBytes:null},
  mediaSqliteJournal:{upperBytes:null,variableCapBytes:448*1024*1024},
  copy:{upperBytes:null,capBytes:448*1024*1024},combined:{upperBytes:null,formula:'fixedBytes + 2 * 448MiB; strict less-than'},
  build:{upperBytes:null,capBytes:512*1024*1024,sharedSeconds:180,rssBytes:1024*1024*1024,outputBytes:2*1024*1024,guard:'runLimitedIsolatedBuild -> runBounded; shared remaining budget; actual build capacity unproven'},
 },
};}
export function assertLimitedSearchCapacity(){throw Error('LIMITED_CAPACITY_BLOCKED: '+limitedSearchCapacity().unresolved.join(','));}

export function limitedPreparationStart({originNs,nowNs=()=>process.hrtime.bigint(),now=()=>performance.now()}){
 need(typeof originNs==='string'&&/^[1-9][0-9]{0,19}$/.test(originNs),'limited-shared-clock-missing');
 // Python monotonic_ns and Node hrtime use the host monotonic clock. Reject
 // incompatible/future/expired epochs rather than substituting Driver start.
 const elapsed=nowNs()-BigInt(originNs);need(elapsed>=0n&&elapsed<300000000000n,'limited-shared-clock-invalid');
 const start=now()-Number(elapsed)/1000000;
 need(Number.isFinite(start),'limited-shared-clock-invalid');return start;
}

export function limitedSearchSchedule({startedAt,now=()=>performance.now()}){
 const c=limitedSearchContract;need(Number.isFinite(startedAt)&&startedAt>=0,'limited-clock');
 let last=startedAt,epoch=null,batches=0,requests=0,completed=0,active=null,first=null,stopReason=null;
 const fail=code=>first??={code,atMs:last};
 function tick(){const t=now();if(!Number.isFinite(t)||t<last){fail('limited-clock');throw Error(first.code);}last=t;return t;}
 function decision(){const t=tick();if(first)return {start:false,reason:first.code};
  if(t>=startedAt+c.hardMs){fail('limited-deadline');return {start:false,reason:first.code};}
  if(active!==null)return {start:false,reason:'in-flight'};
  if(batches>=c.batches)return {start:false,reason:'batch-cap'};
  if(t+c.httpMs+c.finishReserveMs>startedAt+c.hardMs)return {start:false,reason:'finish-reserve'};
  if(epoch!==null&&t<epoch+batches*c.intervalMs)return {start:false,reason:'interval',waitMs:epoch+batches*c.intervalMs-t};
  return {start:true};}
 return {fail,decision,
  begin(){const d=decision();need(d.start,'limited-'+d.reason);epoch??=last;active={index:batches++,started:0};return active.index;},
  request(){const t=tick();need(!first&&active&&active.started<4&&requests<c.requests,'limited-request-bound');
   if(t+c.httpMs+c.finishReserveMs>startedAt+c.hardMs){fail('limited-request-deadline');throw Error(first.code);}
   active.started++;return ++requests;},
  settled(ok){need(active!==null,'limited-unstarted-batch');tick();if(last>=startedAt+c.hardMs)fail('limited-deadline');
   if(ok&&active.started===4)completed++;else fail('limited-batch-failed');active=null;},
  stop(reason){stopReason??=reason;},
  report({cleanupComplete=false}={}){tick();if(last>startedAt+c.hardMs)fail('limited-deadline');if(!cleanupComplete)fail('limited-cleanup');if(!completed)fail('limited-no-completed-batch');
   return {status:first||active!==null?'INCOMPLETE':'BOUNDED',firstFailure:first,stopReason,startedBatches:batches,completedBatches:completed,startedRequests:requests,
    all20Completed:completed===20,elapsedMs:last-startedAt,hardDeadlineMs:startedAt+c.hardMs,cleanupComplete};}
 };
}

// Injected operations are the existing sample/fetch/pause/ledger hooks; tests
// use virtual time. No retry, timer extension or synthetic terminal is added.
export async function runLimitedSearch({schedule,ledger,sample,routes,fetch,pause}){
 try{while(true){
  if(ledger.failure())throw Error(ledger.failure().code);
  let d=schedule.decision();if(!d.start){if(d.reason==='interval'){await pause(Math.min(d.waitMs,1000));continue;}schedule.stop(d.reason);break;}
  await sample();d=schedule.decision();if(!d.start){schedule.stop(d.reason);break;}
  const batchRoutes=routes();need(batchRoutes.length===4,'limited-route-count');schedule.begin();let ok=false;
  try{await settleLedgerBatch(ledger,batchRoutes.map(route=>()=>{schedule.request();return fetch(route);}));ok=true;}
  catch(error){schedule.fail(error.message);throw error;}
  finally{schedule.settled(ok);}
 }}catch(error){schedule.fail(error.message);throw error;}
}

// Limited build-only adapter. No default/30-minute entry invokes this function.
// The injected hooks are only the deterministic Mock seam; production uses the
// existing group supervisor and the same owned-root filesystem operations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runBounded,limits as buildLimits} from './recording_catalog_comparison_guard.mjs';
import {spawnSync as preparationSpawnSync} from 'node:child_process';
import {collectProcess as preparationCollectProcess} from './recording_foundation_observer.mjs';
import {measureCurrentRootStable as preparationMeasureRoot,measureCurrentCopy as preparationMeasureCopy,workspaceBounds as preparationWorkspaceBounds} from './recording_current_observer.mjs';

// Limited-only producer. Reuses existing native/Workspace readers, not a new
// collector. The caller supervises this observer command and its lifetime.
export async function observeLimitedPreparation({root,rootIdentity,copyRoot=null,copyIdentity=null,launcherPid,childPid=null,knownPids=[],collector,collectorSha256}){
 const owned=(p,identity)=>{const s=fs.lstatSync(p);need(path.isAbsolute(p)&&fs.realpathSync(p)===p&&s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o777)===0o700&&s.dev===identity?.dev&&s.ino===identity?.ino,'limited-root-identity');};
 owned(root,rootIdentity);if(copyRoot){owned(copyRoot,copyIdentity);need(copyRoot!==root&&!copyRoot.startsWith(root+path.sep)&&!root.startsWith(copyRoot+path.sep),'limited-copy-overlap');}
 const cs=fs.lstatSync(collector);need(cs.isFile()&&!cs.isSymbolicLink()&&cs.nlink===1&&cs.uid===process.getuid()&&(cs.mode&0o777)===0o700&&fs.realpathSync(collector)===collector,'limited-collector-file');
 need(crypto.createHash('sha256').update(fs.readFileSync(collector)).digest('hex')===collectorSha256,'limited-collector-sha');
 need(Number.isInteger(launcherPid)&&launcherPid>1&&(!childPid||Number.isInteger(childPid)&&childPid>1)&&Array.isArray(knownPids)&&knownPids.every(p=>Number.isInteger(p)&&p>1),'limited-pid-input');
 const table=()=>{const r=preparationSpawnSync('/bin/ps',['-axo','pid=,ppid=,pgid='],{encoding:'utf8',timeout:1000,maxBuffer:1048576});need(r.status===0&&!r.error&&!r.signal,'limited-process-table');
  return r.stdout.trim().split('\n').map(l=>{const m=l.match(/^\s*(\d+)\s+(\d+)\s+(-?\d+)\s*$/);need(m,'limited-process-table');return {pid:Number(m[1]),ppid:Number(m[2]),pgid:Number(m[3])};});};
 const discover=rows=>{
  // The observer and its native/ps children are instrumentation, not workload
  // samples. Their RSS/short lifetimes remain an explicit readiness gap.
  const excluded=new Set([process.pid]);let change=true;
  while(change){change=false;for(const r of rows)if(excluded.has(r.ppid)&&!excluded.has(r.pid)){excluded.add(r.pid);change=true;}}
  const selected=new Set([launcherPid,...knownPids.filter(p=>rows.some(r=>r.pid===p))]);if(childPid&&rows.some(r=>r.pid===childPid))selected.add(childPid);
  change=true;while(change){change=false;for(const r of rows)if(!excluded.has(r.pid)&&(selected.has(r.ppid)||childPid&&r.pgid===childPid)&&!selected.has(r.pid)){selected.add(r.pid);change=true;}}
  return rows.filter(r=>selected.has(r.pid)&&!excluded.has(r.pid));
 };
 const startedNs=process.hrtime.bigint().toString(),before=discover(table());need(before.some(r=>r.pid===launcherPid),'limited-launcher-missing');
 const processes=[];
 for(const p of before){const started=process.hrtime.bigint().toString(),m=await preparationCollectProcess(collector,p.pid);need(m.pid===p.pid,'limited-native-pid');processes.push({...m,pgid:p.pgid,expectedPgid:p.pid===launcherPid?p.pgid:childPid,observedStartNs:started,observedEndNs:process.hrtime.bigint().toString()});}
 const after=discover(table());need(JSON.stringify(before.map(r=>[r.pid,r.pgid]).sort())===JSON.stringify(after.map(r=>[r.pid,r.pgid]).sort()),'limited-process-tree-changed');
 owned(root,rootIdentity);if(copyRoot)owned(copyRoot,copyIdentity);
 const total=preparationMeasureRoot(root).totalBytes,copy=copyRoot?preparationMeasureCopy(copyRoot,copyIdentity).bytes:0;
 // Before a fixed-media baseline exists, every named byte remains variable.
 // Anonymous bytes are conservatively charged per process, not deduplicated
 // physical usage. Missing measurements are never replaced with zero.
 let anonymous=0;for(const p of processes){need([p.anonymousFileBytes,p.anonymousAllocatedBytes].every(number),'limited-anonymous-unobserved');anonymous+=Math.max(p.anonymousFileBytes,p.anonymousAllocatedBytes);}
 preparationWorkspaceBounds(total+anonymous,0,copy);
 return {complete:true,expectedPids:processes.map(p=>p.pid),processes,workspace:{totalBytes:total,fixedBytes:0,copyBytes:copy,anonymousBytes:anonymous},startedNs,endedNs:process.hrtime.bigint().toString(),
  coverage:'two process-table snapshots; short-lived unseen processes and observer overhead NOT_PROVEN',writeAdmission:'NOT_BOUND'};
}
const buildScript=fileURLToPath(new URL('./recording_accumulated_cost.py',import.meta.url));
const buildSha=b=>crypto.createHash('sha256').update(b).digest('hex');
function buildTreeBytes(root){
 const s=fs.lstatSync(root);
 need(!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.isDirectory()||s.isFile()),'build-owned-entry');
 if(s.isFile()){need(s.nlink===1,'build-hardlink');return s.size;}
 return fs.readdirSync(root).reduce((n,k)=>n+buildTreeBytes(path.join(root,k)),0);
}
function buildSave(file,data){
 const fd=fs.openSync(file,'wx',0o600);
 try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 need(fs.readFileSync(file).equals(data),'build-evidence-readback');
 return {path:path.basename(file),bytes:data.length,sha256:buildSha(data)};
}
// Link Map only: lossless raw-byte chunks, never a replacement for link verification.
export const linkMapChunkBytes=2000000;
export function linkMapChunkCapacity({bytes,existing,reserved=5,external=0,used,manifestBytes}){
 need(Number.isSafeInteger(bytes)&&bytes>buildLimits.output,'LINK_MAP_CHUNK_SOURCE_SIZE');
 for(const n of [existing,reserved,external,used,manifestBytes])need(Number.isSafeInteger(n)&&n>=0,'LINK_MAP_CAPACITY_INPUT');
 const chunks=Math.ceil(bytes/linkMapChunkBytes),items=existing+external+chunks+1+reserved;
 need(items<=64,'LINK_MAP_ITEM_CAP');need(manifestBytes<=65536,'LINK_MAP_MANIFEST_CAP');
 // No temporary reconstructed file. Reserve all remaining receipts at their cap.
 const projected=used+bytes+manifestBytes+reserved*65536;
 need(projected<=buildLimits.disk,'LINK_MAP_DISK_CAP');return {chunks,items,projected};
}
function mapOwnedChain(p,directory=false){
 need(path.isAbsolute(p)&&fs.realpathSync(p)===p,'LINK_MAP_UNSAFE_PATH');
 const parts=p.split(path.sep);let current='/';
 for(let i=1;i<parts.length;i++){
  current=path.join(current,parts[i]);const s=fs.lstatSync(current);
  need(!s.isSymbolicLink(),'LINK_MAP_UNSAFE_PATH');
  if(i===parts.length-1){need(s.uid===process.getuid()&&(directory?s.isDirectory():s.isFile()&&s.nlink===1),'LINK_MAP_UNSAFE_PATH');
   need((s.mode&0o777)===(directory?0o700:0o600),'LINK_MAP_UNSAFE_PATH');return s;}
  need(s.isDirectory(),'LINK_MAP_UNSAFE_PATH');
 }
}
function mapIdentity(a,b){return ['dev','ino','size','mtimeMs','ctimeMs','uid','mode','nlink'].every(k=>a[k]===b[k]);}
function mapHashStream(p,check){
 const before=mapOwnedChain(p),fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
 const h=crypto.createHash('sha256'),b=Buffer.alloc(65536);let bytes=0;
 try{need(mapIdentity(before,fs.fstatSync(fd)),'LINK_MAP_SOURCE_CHANGED');let n;
  while((n=fs.readSync(fd,b,0,b.length,null))>0){check();h.update(b.subarray(0,n));bytes+=n;}
  need(mapIdentity(before,fs.fstatSync(fd))&&mapIdentity(before,mapOwnedChain(p)),'LINK_MAP_SOURCE_CHANGED');
 }finally{fs.closeSync(fd);}
 return {bytes,sha256:h.digest('hex'),identity:before};
}
export function verifyLinkMapChunks(directory,manifest,{check=()=>{}}={}){
 const ds=mapOwnedChain(directory,true),h=crypto.createHash('sha256');let bytes=0;
 need(manifest?.representation==='raw-byte-chunks-v1'&&Number.isSafeInteger(manifest.sourceBytes)&&manifest.sourceBytes>buildLimits.output,'LINK_MAP_MANIFEST_INVALID');
 need(/^[a-f0-9]{64}$/.test(manifest.sourceSha256),'LINK_MAP_MANIFEST_INVALID');
 need(Array.isArray(manifest.chunks)&&manifest.chunkCount===manifest.chunks.length&&manifest.chunkCount===Math.ceil(manifest.sourceBytes/linkMapChunkBytes)&&manifest.chunkCount<=64,'LINK_MAP_CHUNK_COUNT');
 for(let i=0;i<manifest.chunks.length;i++){
  check();const c=manifest.chunks[i],name=`link.map.part-${String(i+1).padStart(3,'0')}`;
  need(c.index===i+1&&c.path===name,'LINK_MAP_CHUNK_ORDER');
  need(c.bytes===Math.min(linkMapChunkBytes,manifest.sourceBytes-bytes),'LINK_MAP_CHUNK_SIZE');
  const p=path.join(directory,name),s=mapOwnedChain(p);need(s.size===c.bytes,'LINK_MAP_CHUNK_SIZE');
  const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK),part=crypto.createHash('sha256'),buf=Buffer.alloc(65536);let count=0;
  try{need(mapIdentity(s,fs.fstatSync(fd)),'LINK_MAP_CHUNK_CHANGED');let n;
   while((n=fs.readSync(fd,buf,0,buf.length,null))>0){check();count+=n;need(count<=c.bytes,'LINK_MAP_CHUNK_SIZE');part.update(buf.subarray(0,n));h.update(buf.subarray(0,n));}
   need(mapIdentity(s,fs.fstatSync(fd))&&mapIdentity(s,mapOwnedChain(p)),'LINK_MAP_CHUNK_CHANGED');
  }finally{fs.closeSync(fd);}
  need(count===c.bytes&&part.digest('hex')===c.sha256,'LINK_MAP_CHUNK_SHA');bytes+=count;
 }
 const sha256=h.digest('hex'),after=mapOwnedChain(directory,true);
 need(after.dev===ds.dev&&after.ino===ds.ino,'LINK_MAP_UNSAFE_PATH');
 need(bytes===manifest.sourceBytes&&sha256===manifest.sourceSha256,'LINK_MAP_RECONSTRUCT_SHA');
 return {bytes,sha256,verified:true};
}
export function preserveLargeLinkMap({source,evidence,binding,expectedSha256,externalItems=0,reservedItems=5,check,usedBytes,save=buildSave}){
 need(typeof check==='function'&&typeof usedBytes==='function','LINK_MAP_SUPERVISION_REQUIRED');
 const sourceDir=mapOwnedChain(path.dirname(source),true),dest=mapOwnedChain(evidence,true);
 const safe=()=>{check();const a=mapOwnedChain(path.dirname(source),true),b=mapOwnedChain(evidence,true);
  need(a.dev===sourceDir.dev&&a.ino===sourceDir.ino&&b.dev===dest.dev&&b.ino===dest.ino,'LINK_MAP_UNSAFE_PATH');};
 safe();const initial=mapOwnedChain(source),startedAt=new Date().toISOString();
 const count=Math.ceil(initial.size/linkMapChunkBytes);
 const manifest={representation:'raw-byte-chunks-v1',startedAt,completedAt:null,binding,source,sourceBytes:initial.size,
  sourceSha256:'0'.repeat(64),chunkCount:count,chunks:[],reconstruction:{bytes:initial.size,sha256:'0'.repeat(64),verified:true}};
 // Bound allocation before constructing the per-chunk receipt.
 linkMapChunkCapacity({bytes:initial.size,existing:fs.readdirSync(evidence).length,reserved:reservedItems,external:externalItems,used:usedBytes(),manifestBytes:0});
 for(let i=0;i<count;i++)manifest.chunks.push({index:i+1,path:`link.map.part-${String(i+1).padStart(3,'0')}`,bytes:Math.min(linkMapChunkBytes,initial.size-i*linkMapChunkBytes),sha256:'0'.repeat(64)});
 const encode=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
 const bound=encode({...manifest,completedAt:new Date().toISOString()}).length;
 const capacity=linkMapChunkCapacity({bytes:initial.size,existing:fs.readdirSync(evidence).length,reserved:reservedItems,external:externalItems,used:usedBytes(),manifestBytes:bound});
 const original=mapHashStream(source,safe);need(mapIdentity(initial,original.identity),'LINK_MAP_SOURCE_CHANGED');
 if(expectedSha256!==undefined)need(original.sha256===expectedSha256,'LINK_MAP_SOURCE_SHA');manifest.sourceSha256=original.sha256;
 const fd=fs.openSync(source,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK),buf=Buffer.alloc(linkMapChunkBytes),stream=crypto.createHash('sha256');
 try{need(mapIdentity(initial,fs.fstatSync(fd)),'LINK_MAP_SOURCE_CHANGED');
  for(const c of manifest.chunks){safe();let n=0;while(n<c.bytes){const got=fs.readSync(fd,buf,n,c.bytes-n,null);need(got>0,'LINK_MAP_SOURCE_CHANGED');n+=got;}
   const data=buf.subarray(0,n);c.sha256=buildSha(data);stream.update(data);
   need(usedBytes()+n+bound+reservedItems*65536<=buildLimits.disk,'LINK_MAP_DISK_CAP');
   save(path.join(evidence,c.path),data);safe();
  }
  need(fs.readSync(fd,Buffer.alloc(1),0,1,null)===0&&mapIdentity(initial,fs.fstatSync(fd)),'LINK_MAP_SOURCE_CHANGED');
  need(stream.digest('hex')===original.sha256,'LINK_MAP_SOURCE_SHA');
 }finally{fs.closeSync(fd);}
 manifest.reconstruction=verifyLinkMapChunks(evidence,manifest,{check:safe});
 const after=mapHashStream(source,safe);need(mapIdentity(initial,after.identity)&&after.sha256===original.sha256,'LINK_MAP_SOURCE_SHA');
 manifest.completedAt=new Date().toISOString();const data=encode(manifest);need(data.length<=65536&&data.length<=bound,'LINK_MAP_MANIFEST_CAP');
 const manifestPath=path.join(evidence,'link.map.chunks.json');save(manifestPath,data);
 const saved=mapHashStream(manifestPath,safe);need(saved.sha256===buildSha(data),'LINK_MAP_MANIFEST_SHA');
 verifyLinkMapChunks(evidence,JSON.parse(fs.readFileSync(manifestPath,'utf8')),{check:safe});
 const finalSource=mapHashStream(source,safe);need(mapIdentity(initial,finalSource.identity)&&finalSource.sha256===original.sha256,'LINK_MAP_SOURCE_SHA');
 need(fs.readdirSync(evidence).length+externalItems+reservedItems<=64,'LINK_MAP_ITEM_CAP');safe();
 return {status:'LINK_MAP_CHUNKS_PRESERVED',sourceBytes:original.bytes,sourceSha256:original.sha256,
  artifact:{path:'link.map.chunks.json',bytes:data.length,sha256:buildSha(data)},chunkCount:count,reconstruction:manifest.reconstruction,capacity};
}

// Terminal Helper package only. A missing observer is not a zero-byte snapshot.
export function limitedHelperPackageSnapshot(guard,root,elapsedMs,reserveBytes=0){
 const errors=[];let bytes=null;
 try{
  if(typeof guard?.treeBytes!=='function')throw Error('observer-not-initialized');
  const observed=guard.treeBytes(root);
  if(!number(observed))throw Error('invalid-disk-snapshot');
  bytes=observed;
 }catch(e){errors.push({code:'HELPER_PACKAGE_DISK_UNOBSERVED',detail:e.message});}
 if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=buildLimits.seconds*1000)errors.push({code:'HELPER_PACKAGE_DEADLINE'});
 if(!number(reserveBytes)||bytes!==null&&bytes+reserveBytes>buildLimits.disk)errors.push({code:'HELPER_PACKAGE_DISK_CAP'});
 return {bytes,elapsedMs,reserveBytes,errors,complete:errors.length===0};
}
export function verifyLimitedHelperExternalInputs(inputs,resolvedInputs){
 need(inputs&&resolvedInputs&&Object.keys(inputs).sort().join('\n')===Object.keys(resolvedInputs).sort().join('\n'),'helper-external-input-set');
 for(const [original,expected] of Object.entries(inputs)){
  const resolved=resolvedInputs[original];
  need(path.isAbsolute(original)&&typeof resolved==='string'&&path.isAbsolute(resolved)&&fs.realpathSync(original)===resolved&&fs.realpathSync(resolved)===resolved,'helper-external-input-path');
  const fd=fs.openSync(resolved,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK),h=crypto.createHash('sha256'),buf=Buffer.alloc(65536);
  try{
   const before=fs.fstatSync(fd);need(before.isFile(),'helper-external-input-kind');
   let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));
   const after=fs.fstatSync(fd),current=fs.lstatSync(resolved);
   need(current.isFile()&&!current.isSymbolicLink()&&current.dev===before.dev&&current.ino===before.ino&&after.size===before.size&&after.mtimeMs===before.mtimeMs&&after.ctimeMs===before.ctimeMs&&fs.realpathSync(original)===resolved,'helper-external-input-changed');
   need(h.digest('hex')===expected,'helper-external-input-sha');
  }finally{fs.closeSync(fd);}
 }
 return {matched:Object.keys(inputs).length};
}

export async function runLimitedIsolatedBuild({root,approved,python,env=process.env,budgetStarted},hooks={}){
 const now=hooks.now??(()=>performance.now()),bounded=hooks.runBounded??runBounded;
 const disk=hooks.disk??buildTreeBytes,save=hooks.save??buildSave;
 const cleanup=hooks.cleanup??(p=>{buildTreeBytes(p);fs.rmSync(p,{recursive:true});need(!fs.existsSync(p),'build-cleanup-remains');});
 const helperOnly=approved?.helperBuild!==undefined;
 const start=helperOnly&&budgetStarted!==undefined?budgetStarted:now(),deadline=start+buildLimits.seconds*1000;
 const budgetRoot=helperOnly&&approved.helperBuild.packageRoot?approved.helperBuild.packageRoot:root;
 const result={status:'FAIL',limits:{seconds:180,rssBytes:buildLimits.rss,diskBytes:buildLimits.disk,outputBytes:buildLimits.output},
  steps:[],firstFailure:null,errors:[],cleanupErrors:[],evidenceErrors:[],outputBytes:0,storedOutputBytes:0,peakRssBytes:0,peakDiskBytes:0,
  productExecution:'NOT_TESTED',limitedCapacity:'BLOCKED',
  diskPeakScope:'adapter checkpoints; runBounded polls disk cap; transient peak not proven',
  validityContract:'Require returned terminal status and no finalization-failure.json; result.json alone is not final approval'};
 let last=start,stage='root',claimed=false,workCreated=false,groupsClean=true,rootIdentity=null,workIdentity=null,evidenceIdentity=null;
 let linkAttempted=false,linkVerified=false;
 const evidence=path.join(root,'evidence'),work=path.join(root,'work');
 function fail(code,where=stage,detail=null){const e={stage:where,code,detail};result.firstFailure??=e;if(result.errors.length<32)result.errors.push(e);}
 function sameRoot(){const s=fs.lstatSync(root);need(rootIdentity&&s.dev===rootIdentity.dev&&s.ino===rootIdentity.ino&&s.isDirectory()&&!s.isSymbolicLink(),'build-root-replaced');}
 function check(){
  sameRoot();
  const t=now();need(Number.isFinite(t)&&t>=last,'build-clock');last=t;
  need(t<deadline,'build-deadline');need(result.outputBytes<buildLimits.output,'build-output-cap');
  const used=disk(budgetRoot);need(number(used),'build-disk-observation');result.peakDiskBytes=Math.max(result.peakDiskBytes,used);
  need(used<=buildLimits.disk,'build-disk-cap');
  const after=now();need(Number.isFinite(after)&&after>=last,'build-clock');last=after;need(after<deadline,'build-deadline');return deadline-after;
 }
 function sameEvidence(){const s=fs.lstatSync(evidence);need(evidenceIdentity&&s.dev===evidenceIdentity.dev&&s.ino===evidenceIdentity.ino&&
  s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o777)===0o700,'build-evidence-replaced');}
 function put(name,data){try{sameRoot();sameEvidence();return save(path.join(evidence,name),data);}catch(e){result.evidenceErrors.push({stage,code:e.message});throw e;}}
 function json(name,value){const b=Buffer.from(JSON.stringify(value,null,2)+'\n');need(b.length<=65536,'build-receipt-cap');return put(name,b);}
 function readPlan(name){const p=path.join(evidence,name);need(fs.lstatSync(p).size<=65536,'build-plan-cap');return JSON.parse(fs.readFileSync(p,'utf8'));}
 function seal(name){
  sameEvidence();buildTreeBytes(evidence);const names=fs.readdirSync(evidence).sort();need(names.length<=64,'build-artifact-count');
  const files=names.map(n=>{const p=path.join(evidence,n);need(fs.lstatSync(p).size<=buildLimits.output,'build-artifact-cap');return buildSha(fs.readFileSync(p))+'  '+n;});
  put(name,Buffer.from(files.join('\n')+'\n'));
  for(const line of files){const [h,n]=line.split('  ');need(buildSha(fs.readFileSync(path.join(evidence,n)))===h,'build-manifest-readback');}
 }
 function preserveLinkMap(){
  stage='map-evidence';
  const receipt=result.linkMap={status:'LINK_MAP_NOT_CREATED',linkAttempted,linkVerified,
   validity:linkVerified?'LINK_VERIFIED':'NOT_VERIFIED; may be partial or invalid',source:'work/link.map'};
  function ownedDirectory(p,identity){
   const s=fs.lstatSync(p);
   need(identity&&s.dev===identity.dev&&s.ino===identity.ino&&s.isDirectory()&&!s.isSymbolicLink()&&
    s.uid===process.getuid()&&(s.mode&0o777)===0o700,'LINK_MAP_UNSAFE_PATH');
  }
  function readOwned(p,artifact=false){
   const s=fs.lstatSync(p);
   const safe=v=>v.isFile()&&!v.isSymbolicLink()&&v.uid===process.getuid()&&v.nlink===1&&(!artifact||(v.mode&0o777)===0o600);
   need(safe(s),'LINK_MAP_UNSAFE_PATH');
   need(s.size<=buildLimits.output,'LINK_MAP_SIZE_EXCEEDED');
   const fd=fs.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
   try{
    const before=fs.fstatSync(fd);need(safe(before)&&before.dev===s.dev&&before.ino===s.ino,'LINK_MAP_UNSAFE_PATH');
    need(before.size<=buildLimits.output,'LINK_MAP_SIZE_EXCEEDED');
    const data=Buffer.alloc(before.size);let n=0;
    while(n<data.length){const got=fs.readSync(fd,data,n,data.length-n,null);need(got>0,'build-map-changed');n+=got;}
    need(fs.readSync(fd,Buffer.alloc(1),0,1,null)===0,'build-map-changed');
    const after=fs.fstatSync(fd),current=fs.lstatSync(p);
    need(safe(after)&&safe(current)&&current.dev===before.dev&&current.ino===before.ino,'LINK_MAP_UNSAFE_PATH');
    need(after.size===before.size&&after.mtimeMs===before.mtimeMs&&after.ctimeMs===before.ctimeMs&&
     current.size===after.size&&current.mtimeMs===after.mtimeMs&&current.ctimeMs===after.ctimeMs,'build-map-changed');
    return data;
   }finally{fs.closeSync(fd);}
  }
  try{
   sameRoot();ownedDirectory(root,rootIdentity);ownedDirectory(work,workIdentity);ownedDirectory(evidence,evidenceIdentity);
   const map=path.join(work,'link.map');
   try{fs.lstatSync(map);}catch(e){if(e.code==='ENOENT'){if(linkVerified)throw Error('build-map-missing');return;}throw e;}
   need(groupsClean,'build-map-group-unconfirmed');
   // Inspect the entry before tree accounting: never follow an unsafe map.
   const mapStat=fs.lstatSync(map);
   if(mapStat.isFile()&&!mapStat.isSymbolicLink()&&mapStat.size>buildLimits.output){
    const approval=readPlan('approved.json'),verified=linkVerified?readPlan('link-binding.json'):null;
    if(linkVerified)need(/^[a-f0-9]{64}$/.test(verified?.outputs?.['work/link.map']??''),'build-map-binding-missing');
    Object.assign(receipt,preserveLargeLinkMap({source:map,evidence,check,usedBytes:()=>disk(budgetRoot),save,
     expectedSha256:verified?.outputs?.['work/link.map'],
     binding:{buildRoot:root,head:approval.head,sourceManifest:approval.sourceManifest,linkAttempted,linkVerified,
      resultId:path.join(root,'evidence/result.json'),validity:receipt.validity}}));
    return;
   }
   const data=readOwned(map);check();
   const used=disk(budgetRoot);need(number(used)&&used+data.length<=buildLimits.disk,'build-disk-cap');
   receipt.sourceBytes=data.length;receipt.sourceSha256=buildSha(data);
   ownedDirectory(evidence,evidenceIdentity);put('link.map',data);
   ownedDirectory(work,workIdentity);ownedDirectory(evidence,evidenceIdentity);
   const copy=readOwned(path.join(evidence,'link.map'),true),source=readOwned(map);
   need(copy.length===data.length&&source.length===data.length&&buildSha(copy)===receipt.sourceSha256&&
    buildSha(source)===receipt.sourceSha256,'build-map-evidence-readback');
   receipt.artifact={path:'link.map',bytes:copy.length,sha256:buildSha(copy)};
   check();receipt.status='LINK_MAP_PRESERVED';
  }catch(e){
   receipt.status=['LINK_MAP_SIZE_EXCEEDED','LINK_MAP_UNSAFE_PATH'].includes(e.message)?e.message:'LINK_MAP_PRESERVATION_FAILED';
   receipt.error=e.message;result.evidenceErrors.push({stage,code:e.message,status:receipt.status});fail(e.message);
  }
 }
 async function step(name,command,cwd=work){
  stage=name;need(!result.firstFailure,'build-stopped');const remaining=check();
  need(Array.isArray(command)&&command.length>0&&command.every(s=>typeof s==='string'&&!s.includes('\0')),'build-command');
  need(cwd===work||cwd===path.join(work,'build'),'build-cwd');
  const receipt={stage:name,command,cwd,startedMs:now()-start,remainingMs:remaining,outputAllowance:buildLimits.output-result.outputBytes};
  // runBounded stops on > cap. Subtract one byte so its live stop fires at
  // the cumulative limit, not one byte after it. A new timed command cannot
  // fit even its required rusage receipt in a one-byte remainder.
  need(receipt.outputAllowance>1,'build-output-reserve');
  receipt.supervisorOutputCap=receipt.outputAllowance-1;
  result.steps.push(receipt);
  // Passing positional argv avoids shell interpolation. Umask confines every
  // generated object/cache/plan; HOME/TMPDIR/cache all share the measured root.
  if(name==='link')linkAttempted=true;
  groupsClean=false; // A thrown/unreturned supervisor receipt cannot authorize deletion.
  const r=await bounded({root:budgetRoot,command:'/bin/sh',args:['-c','umask 077; cd "$1" && shift && exec "$@"','limited-build',cwd,...command],
   env:buildEnv,seconds:remaining/1000,outputCap:receipt.supervisorOutputCap,rssCap:buildLimits.rss,diskCap:buildLimits.disk});
  Object.assign(receipt,{endedMs:now()-start,code:r.code,signal:r.signal,stopReason:r.stopReason,groupId:r.groupId,groupClean:r.groupClean,
   observationFailure:r.observationFailure,outputBytes:r.outputBytes,groupPeakRssBytes:r.groupPeakRssBytes,elapsedMs:r.elapsedMs});
  groupsClean=r.groupClean===true;
  // Stop reason is the supervisor's first observation; preserve exit/diagnostic
  // separately rather than claiming the chronology of a buffered compiler line.
  if(r.stopReason)fail(r.stopReason);
  else if(r.code!==0||r.signal)fail('build-command-failed',stage,{code:r.code,signal:r.signal});
  if(!r.groupClean){result.cleanupErrors.push({stage,code:'build-group-remains'});fail('build-group-remains');}
  if(r.observationFailure)fail('build-resource-observation');
  need(number(r.outputBytes)&&number(r.groupPeakRssBytes),'build-receipt-observation');
  // Fast commands can finish between group polls; retain /usr/bin/time's
  // independently reported peak when present, never interpret zero as observed.
  const timeRows=typeof r.stderr==='string'?r.stderr.split('\n').filter(l=>l.includes('maximum resident set size')):[];
  const timeMatch=timeRows.length===1?timeRows[0].match(/^\s*([1-9][0-9]*)\s+maximum resident set size\s*$/):null;
  const timePeak=timeMatch?Number(timeMatch[1]):0;
  receipt.timePeakRssBytes=number(timePeak)&&timePeak>0?timePeak:null;
  if(!r.groupPeakRssBytes&&!receipt.timePeakRssBytes)fail('build-rss-unobserved');
  result.outputBytes+=r.outputBytes;result.peakRssBytes=Math.max(result.peakRssBytes,r.groupPeakRssBytes,receipt.timePeakRssBytes??0);
  if(result.peakRssBytes>buildLimits.rss)fail('build-rss-cap');
  if(result.outputBytes>=buildLimits.output)fail('build-output-cap');
  receipt.outputRepresentation='runBounded UTF-8 string; SHA is stored representation, not original pipe bytes';
  receipt.pipeByteEquality='NOT_PROVEN';receipt.outputComplete=!r.stopReason&&r.outputBytes<receipt.outputAllowance;
  for(const stream of ['stdout','stderr']){
   need(typeof r[stream]==='string','build-output-observation');
   const b=Buffer.from(r[stream]),left=buildLimits.output-result.storedOutputBytes,kept=b.subarray(0,Math.max(0,left));
   if(kept.length!==b.length){receipt.outputComplete=false;fail('build-stored-output-cap');}
   // Even when one artifact fails, try to retain the other diagnostic stream.
   // Charge the attempted prefix too: a partial write must not free the budget.
   result.storedOutputBytes+=kept.length;
   try{receipt[stream]=put(name+'.'+stream+'.txt',kept);}
   catch(e){receipt.outputComplete=false;receipt[stream]={error:e.message,attemptedBytes:kept.length};fail('build-output-evidence',stage,{stream,code:e.message});}
  }
  json(name+'.receipt.json',receipt);check();need(!result.firstFailure,'build-stopped');
 }
 const buildEnv={PATH:env.PATH,HOMEBREW_PREFIX:env.HOMEBREW_PREFIX??'/opt/homebrew',LANG:'C.UTF-8',LC_ALL:'C.UTF-8',
  HOME:path.join(work,'home'),TMPDIR:path.join(work,'tmp'),XDG_CACHE_HOME:path.join(work,'cache'),
  PYTHONDONTWRITEBYTECODE:'1',GIT_OPTIONAL_LOCKS:'0',...(helperOnly?{
   PKG_CONFIG_PATH:'/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig',
   DYLD_LIBRARY_PATH:'/opt/homebrew/lib:/usr/local/lib:/usr/lib',DYLD_FALLBACK_LIBRARY_PATH:'/opt/homebrew/lib:/usr/local/lib:/usr/lib'}:{})};
 try{
  if(budgetRoot!==root){
   const p=fs.lstatSync(budgetRoot);
   need(helperOnly&&path.dirname(budgetRoot)==='/private/tmp'&&/^media-server-[a-zA-Z0-9_-]+$/.test(path.basename(budgetRoot))&&fs.realpathSync(budgetRoot)===budgetRoot&&p.isDirectory()&&p.uid===process.getuid()&&(p.mode&0o777)===0o700&&root===path.join(budgetRoot,'build'),'helper-package-root');
  }
  need(path.isAbsolute(root)&&fs.realpathSync(root)===root&&(budgetRoot!==root||path.dirname(root)==='/private/tmp'&&/^media-server-[a-zA-Z0-9_-]+$/.test(path.basename(root))),'build-root');
  const st=fs.lstatSync(root);need(st.isDirectory()&&st.uid===process.getuid()&&(st.mode&0o777)===0o700,'build-root-owner');
  rootIdentity=st;need(fs.readdirSync(root).length===0,'build-root-not-fresh');
  buildSave(path.join(root,'claimed.json'),Buffer.from(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})));claimed=true;
  fs.mkdirSync(evidence,{mode:0o700});evidenceIdentity=fs.lstatSync(evidence);check();
  need(typeof python==='string'&&path.isAbsolute(python),'build-python');
  need(approved?.head==='45b19bd88cd2ea9c7be48a25329580e562c2a3ee'&&typeof approved.status==='string','build-approved-binding');
  // Full tracked build input coverage exceeds the 64KiB receipt cap. Preserve
  // it once under the existing artifact cap; every bridge receipt binds its SHA.
  const {sourceSha256,...approval}=approved;
  need(sourceSha256&&typeof sourceSha256==='object'&&!Array.isArray(sourceSha256),'build-source-manifest');
  const manifest=Buffer.from(JSON.stringify(sourceSha256,null,2)+'\n');
  need(manifest.length<=buildLimits.output,'build-source-manifest-cap');
  const used=disk(budgetRoot);need(number(used)&&used+manifest.length<=buildLimits.disk,'build-disk-cap');
  put('source-sha256.json',manifest);
  json('approved.json',{...approval,sourceManifest:{path:'source-sha256.json',bytes:manifest.length,sha256:buildSha(manifest)}});
  json('environment.json',buildEnv);check();
  fs.mkdirSync(work,{mode:0o700});workCreated=true;workIdentity=fs.lstatSync(work);
  for(const p of [buildEnv.HOME,buildEnv.TMPDIR,buildEnv.XDG_CACHE_HOME])fs.mkdirSync(p,{mode:0o700});
  const bridge=name=>[python,'-B',buildScript,'--limited-build-stage',name,root];
  if(helperOnly){
   result.scope='LIMITED_HELPER_BUILD_ONLY';result.helperExecution='NOT_TESTED';
   await step('helper-inputs',bridge('helper-inputs'));
   const inputs=readPlan('helper-inputs.json');
   need(inputs.flagsCommand?.length===5&&inputs.flagsCommand[0]===approved.helperBuild.pkgConfig,'helper-flags-command');
   await step('helper-flags',inputs.flagsCommand);
   await step('helper-plan',bridge('helper-plan'));
   const plan=readPlan('helper-plan.json'),names=['normalize','process-metrics','review-seed'];
   need(JSON.stringify(plan.names)===JSON.stringify(names)&&plan.commands.length===3,'helper-plan-count');
   need(plan.archive===path.join(approved.helperBuild.referenceBuild,'libmedia_server_runtime.a'),'helper-archive');
   need(plan.instrument[0]===approved.helperBuild.node,'helper-instrument-command');
   await step('helper-instrument',plan.instrument);
   for(let i=0;i<3;i++){
    const c=plan.commands[i];need(c[0]===approved.helperBuild.compiler&&c.at(-2)==='-o'&&c.at(-1)===path.join(work,'helpers',names[i]),'helper-output-command');
    await step('helper-'+names[i],c);
   }
   await step('helper-verify',bridge('helper-verify'));
   const file=path.join(evidence,'helper-artifacts.json'),artifact=readPlan('helper-artifacts.json');
   need(artifact.root===path.join(root,'artifacts')&&JSON.stringify(Object.keys(artifact.files))===JSON.stringify([...names,'catalog-instrumented.cpp']),'helper-artifact-set');
   buildTreeBytes(artifact.root);
   for(const [name,entry] of Object.entries(artifact.files))need(buildSha(fs.readFileSync(path.join(artifact.root,name)))===entry.sha256,'helper-artifact-sha');
   result.helperArtifacts={path:file,sha256:buildSha(fs.readFileSync(file)),retained:true};
  }else{
  await step('plan',bridge('plan'));
  const plan=readPlan('cmake-plan.json');need(plan.buildRoot===path.join(work,'build')&&plan.commands.length===2,'build-plan-binding');
  await step('configure',plan.commands[0]);await step('runtime-product',plan.commands[1]);
  await step('link-plan',bridge('link-plan'));
  const link=readPlan('link-plan.json');need(link.commands.length===4&&link.cwd===plan.buildRoot&&link.archive===path.join(plan.buildRoot,'libmedia_server_runtime.a'),'build-link-binding');
  for(let i=0;i<4;i++)await step(i<3?'overlay-'+i:'link',link.commands[i],link.cwd);
  await step('symbols',['/usr/bin/nm','-gU',path.join(work,'media_server')]);
  await step('verify',bridge('verify'));
  need(readPlan('link-binding.json').uniqueSymbols===true,'build-link-unverified');
  linkVerified=true;
  }
 }catch(e){fail(e.message);}
 // Preserve even a failed link/verification's partial map before deleting work.
 // A preservation error blocks deletion without replacing the first build error.
 if(workCreated&&!helperOnly)preserveLinkMap();
 // No deletion with a live/unobserved group, and no deletion after an evidence
 // write failure. Preserve the owned partial tree for a separately scoped review.
 if(claimed){
  stage='pre-cleanup';
  try{check();}catch(e){fail(e.message);}
  let preserved=false;
  try{json('before-cleanup.json',result);seal('pre-cleanup-SHA256SUMS');preserved=true;}catch(e){result.evidenceErrors.push({stage,code:e.message});fail(e.message);}
  stage='cleanup';
  if(workCreated&&groupsClean&&preserved&&!result.evidenceErrors.length){
   try{sameRoot();const s=fs.lstatSync(work);need(s.dev===workIdentity.dev&&s.ino===workIdentity.ino,'build-work-replaced');cleanup(work);result.workAbsent=!fs.existsSync(work);}catch(e){result.cleanupErrors.push({stage,code:e.message});fail('build-cleanup');}
  }else{result.workAbsent=!fs.existsSync(work);result.cleanupDeferred=workCreated;}
  stage='post-cleanup';try{check();}catch(e){fail(e.message);}
  result.elapsedMs=now()-start;
  result.status=!result.firstFailure&&result.workAbsent&&groupsClean?'PASS':'FAIL';
  stage='final-evidence';
  try{
   // Seal the files already written. Final receipt is self-excluding; its SHA is
   // returned to the caller and can be placed in the outer execution manifest.
   seal('SHA256SUMS');
   try{check();}catch(e){fail(e.message);result.status='FAIL';}
   result.elapsedMs=now()-start;result.finalReceipt=json('result.json',result);
   // A receipt that crosses the deadline is invalidated by the terminal failure
   // artifact and the returned FAIL; a caller must check both, never receipt alone.
   if(now()>=deadline)throw Error('build-deadline');
   const finalDisk=disk(budgetRoot);need(number(finalDisk),helperOnly?'build-disk-observation':'build-disk-cap');
   result.peakDiskBytes=Math.max(result.peakDiskBytes,finalDisk);need(finalDisk<=buildLimits.disk,'build-disk-cap');
   result.elapsedMs=now()-start;need(result.elapsedMs<buildLimits.seconds*1000,'build-deadline');
  }catch(e){fail(e.message);result.status='FAIL';result.finalizationIncomplete=true;
   try{json('finalization-failure.json',{firstFailure:result.firstFailure,errors:result.errors,elapsedMs:now()-start,status:'FAIL'});}catch{/* returned result still reports missing durable receipt */}
  }
 }
 result.elapsedMs=now()-start;return result;
}
