// 내부 격리 검증기의 선택 시도 진단 파서. 공개 API가 아니다.
const count=x=>Number.isSafeInteger(x)&&x>=0;
const int32=x=>Number.isInteger(x)&&x>=-2147483648&&x<=2147483647;
const decimal=x=>typeof x==='string'&&/^-?\d{1,20}$/.test(x);
const bool=x=>typeof x==='boolean';
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const nullable=p=>x=>x===null||p(x);
const array=(p,cap)=>x=>Array.isArray(x)&&x.length<=cap&&x.every(p);
const tuple=n=>x=>Array.isArray(x)&&x.length===n&&x.every(count);
const fields=(x,s)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===Object.keys(s).length&&Object.entries(s).every(([k,p])=>Object.hasOwn(x,k)&&p(x[k]));
const source=x=>fields(x,{segment_id_sha256:nullable(hash),media_epoch_id_sha256:nullable(hash),source_generation_sha256:nullable(hash),track_id_sha256:nullable(hash),generation_order:decimal,start_pts:decimal,end_pts:nullable(decimal),time_base_num:int32,time_base_den:int32,lifecycle:v=>count(v)&&v<=5,deleted:bool,binding_present:bool,binding_valid:bool,available_for_selection:bool});
const decoded=x=>fields(x,{namespace_valid:bool,range_comparable:bool,incomplete:bool,frames_truncated:bool,frame_count:count,relevant_count:count,identity_matched:count,identity_rejected:count,generation_mismatch:count,pts_mismatch:count,duration_invalid:count,minimum_pts_ns:nullable(decimal),maximum_pts_ns:nullable(decimal),maximum_valid_end_ns:nullable(decimal)});
const unknown=x=>fields(x,{start_ns:decimal,end_ns:decimal,reason:v=>count(v)&&v<10})&&BigInt(x.start_ns)<BigInt(x.end_ns);
export function validateSelectionTrace(x){
  if(!fields(x,{reference_sha256:hash,attempt:count,attempt_limit:count,elapsed_ms:decimal,wait_ms:decimal,deadline_exhausted:bool,attempt_exhausted:bool,selection_complete:bool,expanded_start_ns:decimal,expanded_end_ns:decimal,source_count:count,unknown_count:count,sources_truncated:bool,unknown_truncated:bool,sources:array(source,256),decoded,slice_state_counts:tuple(6),reason_counts:tuple(10),unknown_ranges:array(unknown,8)})||x.attempt<1||x.attempt>x.attempt_limit||x.attempt_limit>121||BigInt(x.elapsed_ms)<0n||BigInt(x.wait_ms)<0n||BigInt(x.wait_ms)>60000n||BigInt(x.expanded_start_ns)>=BigInt(x.expanded_end_ns)||x.sources.length!==Math.min(x.source_count,256)||x.sources_truncated!==(x.source_count>256)||x.unknown_ranges.length!==Math.min(x.unknown_count,8)||x.unknown_truncated!==(x.unknown_count>8))throw Error('selection-trace-invalid');
  return x;
}
export function createSelectionTraceCollector(){
  let pending='';const rows=[];const prefix='[recording-selection-attempt] ';
  return {append(chunk){pending+=chunk;for(;;){const end=pending.indexOf('\n');if(end<0)break;if(Buffer.byteLength(pending.slice(0,end))>262144)throw Error('selection-trace-line-cap');const line=pending.slice(0,end);pending=pending.slice(end+1);if(line.startsWith(prefix)){if(rows.length>=512)throw Error('selection-trace-count-cap');let value;try{value=JSON.parse(line.slice(prefix.length));}catch{throw Error('selection-trace-invalid');}rows.push(validateSelectionTrace(value));}}if(Buffer.byteLength(pending)>262144)throw Error('selection-trace-line-cap');},finish(){if(pending.startsWith(prefix))throw Error('selection-trace-incomplete');return rows.slice();}};
}
export function matchSelectionTrace(rows,referenceHash){
  const matches=rows.filter(r=>r.reference_sha256===referenceHash);
  if(!matches.length||matches.some((r,i)=>r.attempt!==i+1||r.attempt_limit!==matches[0].attempt_limit||r.wait_ms!==matches[0].wait_ms||r.expanded_start_ns!==matches[0].expanded_start_ns||r.expanded_end_ns!==matches[0].expanded_end_ns||(i>0&&BigInt(r.elapsed_ms)<BigInt(matches[i-1].elapsed_ms))))throw Error('selection-trace-sequence');
  const last=matches.at(-1);if(!last.selection_complete&&!last.deadline_exhausted&&!last.attempt_exhausted)throw Error('selection-trace-terminal-missing');
  return matches;
}
