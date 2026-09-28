// 파일 용도: 내부 검증 전용 bounded latency parser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const prefix='[recording-latency] ',keys=['k','o','s','l','m','t','r','b','a','e','n','w','h','x','y'];
const uint=x=>Number.isSafeInteger(x)&&x>=0;
export function validateLatencyRow(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k)&&uint(v[k])))throw Error('latency-schema');
  if(v.k===3){if(v.n!==1||keys.some(k=>!['k','n'].includes(k)&&v[k]!==0))throw Error('latency-drop');return v;}
  if(v.k>2||v.o<1||v.o>10||v.s>5||v.l>100000||v.m>128||!v.t||v.t>65536||v.r>100000||v.b>v.a||v.a>v.e||!v.n||v.n>100000000||v.x>v.w||v.y>v.h)throw Error('latency-range');
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
