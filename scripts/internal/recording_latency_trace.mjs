// 파일 용도: 내부 검증 전용 bounded latency parser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const prefix='[recording-latency] ',keys=['k','o','s','l','m','t','r','b','a','e','n','w','h','x','y'];
const uint=x=>Number.isSafeInteger(x)&&x>=0;
export function validateLatencyRow(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k)&&uint(v[k])))throw Error('latency-schema');
  if(v.k===3){if(v.n!==1||keys.some(k=>!['k','n'].includes(k)&&v[k]!==0))throw Error('latency-drop');return v;}
  if(v.k>2||v.o<1||v.o>13||v.s>5||v.l>100000||v.m>128||!v.t||v.t>65536||v.r>100000||v.b>v.a||v.a>v.e||!v.n||v.n>100000000||v.x>v.w||v.y>v.h)throw Error('latency-range');
  if(v.k===2){if(v.s!==0||v.l!==0)throw Error('latency-aggregate');}
  else if(!v.s||!v.l||v.n!==1||v.w!==v.a-v.b||v.h!==v.e-v.a||v.x!==v.w||v.y!==v.h||(v.k===0&&(v.o!==1||!v.m))||(v.k===1&&v.o===1))throw Error('latency-span');
  return v;
}
export function createLatencyTraceCollector(){
  let pending='',discard=false,code='none',bytes=0;const rows=[];
  const reject=value=>{if(code==='none')code=value;};
  function line(text){if(!text.startsWith(prefix)||code!=='none')return;bytes+=Buffer.byteLength(text)+1;if(bytes>2*1024*1024){reject('latency-byte-cap');return;}if(rows.length===16385){reject('latency-count-cap');return;}let row;try{row=validateLatencyRow(JSON.parse(text.slice(prefix.length)));}catch{reject('latency-invalid');return;}rows.push(row);if(row.k===3)reject('latency-dropped');}
  return {append(chunk){for(const part of String(chunk).split(/(?<=\n)/)){const end=part.endsWith('\n');if(!discard){pending+=part;if(Buffer.byteLength(pending)>512){if(pending.startsWith(prefix))reject('latency-line-cap');pending='';discard=true;}}if(end){if(!discard)line(pending.slice(0,-1));pending='';discard=false;}}},finish(expectedRequests){if(pending.startsWith(prefix))reject('latency-incomplete');const requests=rows.filter(r=>r.k===1&&r.o===2).map(r=>r.r).sort((a,b)=>a-b);if(expectedRequests!==undefined&&(!uint(expectedRequests)||requests.length!==expectedRequests||requests.some((r,i)=>r!==i+1)))reject('latency-request-missing');if(expectedRequests!==undefined&&requests.some(request=>[3,4,5].some(op=>rows.filter(row=>row.r===request&&row.k===1&&row.o===op).length!==1)))reject('latency-phase-missing');return {expectedRequestCount:expectedRequests??null,observedRequestCount:requests.length,schema:'recording-latency-trace-v1',status:code==='none'?'complete':'incomplete',code,thresholdNs:1000000,fastDetailOmitted:true,clockBasis:'service-steady-relative-ns',clientClockSubtraction:false,acceptedCount:rows.length,bytes,rows:rows.slice()};}};
}
export function preserveLatencyEvidence(file,value){
  const fixed=['expectedRequestCount','observedRequestCount','schema','status','code','thresholdNs','fastDetailOmitted','clockBasis','clientClockSubtraction','acceptedCount','bytes','rows'];
  if(!value||Object.keys(value).length!==fixed.length||!fixed.every(k=>Object.hasOwn(value,k))||value.schema!=='recording-latency-trace-v1'||!['complete','incomplete'].includes(value.status)||!['none','latency-byte-cap','latency-count-cap','latency-invalid','latency-dropped','latency-line-cap','latency-incomplete','latency-request-missing','latency-phase-missing'].includes(value.code)||value.thresholdNs!==1000000||value.fastDetailOmitted!==true||value.clockBasis!=='service-steady-relative-ns'||value.clientClockSubtraction!==false||!uint(value.observedRequestCount)||!(value.expectedRequestCount===null||uint(value.expectedRequestCount))||!uint(value.bytes)||!Array.isArray(value.rows)||value.rows.length>16385||value.acceptedCount!==value.rows.length)throw Error('latency-evidence-schema');
  for(const row of value.rows)validateLatencyRow(row);
  if(!path.isAbsolute(file)||fs.realpathSync(path.dirname(file))!==path.dirname(file))throw Error('latency-evidence-parent');
  const temporary=path.join(path.dirname(file),'.pending-latency-'+crypto.randomUUID());let fd;
  try{fd=fs.openSync(temporary,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.linkSync(temporary,file);}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}

// Diagnostic sample windows are explicit; unsampled time is never attributed.
export function catalogHolderSummary(text,required=true,expectedRequests=null) {
 const rows=[];let end=null,code=null;
 try {
  for(const line of text.split('\n')){
   if(line.startsWith('[catalog-holder-loss]'))throw Error('holder-loss');
   if(line.startsWith('[catalog-holder-end] ')){if(end)throw Error('duplicate-end');end=JSON.parse(line.slice(21));continue;}
   if(!line.startsWith('[catalog-holder]'))continue;
   if(!line.startsWith('[catalog-holder] ')||Buffer.byteLength(line)>=320||rows.length>=8192)throw Error('holder-cap');
   const v=JSON.parse(line.slice(17));
   if(Object.keys(v).length!==11||!['id','m','t','r','l','work','b','a','e'].every(k=>uint(v[k]))||v.id!==rows.length+1||v.m<1||v.m>128||v.t<1||v.work>6||v.b>v.a||v.a>v.e||!Array.isArray(v.counts)||v.counts.length!==4||!v.counts.every(uint)||typeof v.site!=='string'||!/^[A-Za-z_~][A-Za-z0-9_~()]{0,95}$/.test(v.site))throw Error('holder-row');
   rows.push(v);
  }
  if(!required&&!rows.length&&!end)return {status:'not-observed',rows:[]};
  if(end?.version===3){
   if(expectedRequests!==null&&expectedRequests!=='slow-first')throw Error('holder-selection');
   if(!['request','begin','end','thresholdNs','overwrittenEndNs','completedRequests','maxCompletedNs','endNs'].every(k=>uint(end[k]))||end.thresholdNs!==2000000000||!end.completedRequests)throw Error('holder-completion');
   const requests=text.split('\n').filter(x=>x.startsWith('[visual-request] ')).map(x=>JSON.parse(x.slice(17)));
   const totals=text.split('\n').filter(x=>x.startsWith('[visual-request-end] '));
   if(totals.length!==1)throw Error('holder-request-completion');
   const total=JSON.parse(totals[0].slice(21));
   if(total.started!==total.completed||total.completed!==end.completedRequests||requests.length!==total.completed||requests.some((r,i)=>!uint(r.id)||!uint(r.elapsedNs))||new Set(requests.map(r=>r.id)).size!==requests.length||requests.some(r=>r.id<1||r.id>total.started)||Math.max(...requests.map(r=>r.elapsedNs))!==end.maxCompletedNs)throw Error('holder-request-completion');
   if(!end.request){
    if(end.loss!==false||end.inflight!==0||end.records!==0||rows.length||end.begin||end.end||end.maxCompletedNs>=end.thresholdNs||requests.some(r=>!uint(r.elapsedNs)||r.elapsedNs>=end.thresholdNs))throw Error('holder-completion');
    return {status:'captured',sampledOnly:true,selection:'no-completed-slow-request',rows:[],end,windows:[]};
   }
   const selected=requests.filter(r=>r.id===end.request);
   if(selected.length!==1||selected[0].startNs!==end.begin||selected[0].elapsedNs!==end.end-end.begin||end.end-end.begin<end.thresholdNs||end.overwrittenEndNs>end.begin)throw Error('holder-selection-coverage');
   end={...end,requests:[end.request],windows:[end.begin],ends:[end.end]};
  }
  if(!end||![1,2,3].includes(end.version)||end.loss!==false||end.inflight!==0||end.records!==rows.length||!uint(end.endNs)||!Array.isArray(end.windows)||end.windows.length!==(end.version===3?1:3)||!end.windows.every(uint))throw Error('holder-completion');
  if(expectedRequests!==null&&expectedRequests!=='slow-first'&&(end.version!==2||JSON.stringify(end.requests)!==JSON.stringify(expectedRequests)))throw Error('holder-selection');
  if(expectedRequests==='slow-first'&&end.version!==3)throw Error('holder-selection');
  const ends=end.version===1?end.windows.map(b=>b+end.widthNs):end.ends;
  if(end.version===1&&(end.widthNs!==1000000000||end.windows.some((b,i)=>i&&b<=end.windows[i-1]+end.widthNs)))throw Error('holder-completion');
  if(end.version===2&&(!['[1,2,3]','[4,5,6]','[77,78,79]'].includes(JSON.stringify(end.requests))||!Array.isArray(ends)||ends.length!==3||!ends.every(uint)))throw Error('holder-completion');
  if(end.windows.some((b,i)=>!b||ends[i]<b||ends[i]>end.endNs))throw Error('holder-completion');
  for(const v of rows)if(!end.windows.some((b,i)=>v.b<ends[i]&&v.e>b))throw Error('holder-outside');
  const byMutex=new Map();for(const v of rows){if(!byMutex.has(v.m))byMutex.set(v.m,[]);byMutex.get(v.m).push(v);}
  for(const values of byMutex.values()){
   values.sort((a,b)=>a.a-b.a||a.e-b.e);for(let i=1;i<values.length;i++)if(values[i].a<values[i-1].e)throw Error('holder-overlap');
  }
  const windows=end.windows.map((begin,index)=>{
   const finish=ends[index],byWork={};let waitNs=0,coveredNs=0;
   for(const waiter of rows){if(!waiter.r||(end.version!==1&&waiter.r!==end.requests[index]))continue;const a=Math.max(begin,waiter.b),b=Math.min(finish,waiter.a);if(b<=a)continue;waitNs+=b-a;
    for(const holder of byMutex.get(waiter.m)||[]){const lo=Math.max(a,holder.a),hi=Math.min(b,holder.e);if(hi<=lo)continue;
     coveredNs+=hi-lo;const key=holder.work+':'+holder.site+':'+holder.l;byWork[key]=(byWork[key]||0)+hi-lo;
    }
   }
   const held={};for(const h of rows){const ns=Math.min(finish,h.e)-Math.max(begin,h.a);if(ns<=0)continue;const key=h.work+':'+h.site+':'+h.l;const x=held[key]??={count:0,heldNs:0,counts:[0,0,0,0],completeIntervals:0};x.count++;x.heldNs+=ns;if(h.a>=begin&&h.e<=finish){x.completeIntervals++;h.counts.forEach((n,i)=>x.counts[i]+=n);}}
   return {selectedRequest:(end.version!==1?end.requests:[7,41,77])[index],beginNs:begin,endNs:finish,waitNs,coveredNs,unclassifiedNs:waitNs-coveredNs,overlapByHolder:byWork,held};
  });
  return {status:'captured',sampledOnly:true,rows,end,windows};
 }catch(error){code=error.message;}
 return {status:'incomplete',code,rows,end};
}
