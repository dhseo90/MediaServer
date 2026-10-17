// completion/evidence 공통 유한 수집 receipt. 제품 업무 결과와 별도 판정한다.
import {diagnosticLines} from './recording_diagnostic_lines.mjs';
import {validateCompletionRow} from './recording_completion_trace.mjs';
const completion='[recording-completion] ', evidence='[recording-evidence] ', terminal='[recording-completion-end] ', late='[recording-completion-after-end] ';
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys.split(' ').sort().join(',');
export function completionCollection(){
 const state={rows:0,bytes:0,error:null,receipt:null,receiptStream:null};
 const streams={stdout:diagnosticLines([completion,evidence,terminal,late],767),stderr:diagnosticLines([completion,evidence,terminal,late],767)};
 return {
  append(chunk,stream='stderr'){
   if(state.error)return;
   try{if(!streams[stream])throw Error('completion-stream');streams[stream].append(chunk,(line,bytes)=>{
    const p=[completion,evidence,terminal,late].find(p=>line.startsWith(p));if(!p)throw Error('completion-prefix');
    const r=JSON.parse(line.slice(p.length));
    if(p===late)throw Error('completion-after-end');
    if(state.receiptStream===stream)throw Error('completion-after-end');
    if(p===terminal){
     if(state.receipt||bytes>256||!exact(r,'v rows bytes lost writeError complete')||r.v!==1||!integer(r.rows)||!integer(r.bytes)||!['lost','writeError','complete'].every(k=>typeof r[k]==='boolean'))throw Error('completion-receipt-invalid');
     state.receipt=r;state.receiptStream=stream;
     if(r.lost||r.writeError||!r.complete)throw Error('completion-receipt-loss');
     return;
    }
    if(p===completion){if(bytes>511)throw Error('completion-wire-cap');validateCompletionRow(r);if(r.event===14)throw Error('completion-loss');}
    else {
     if(exact(r,'lost')&&r.lost===true)throw Error('evidence-loss');
     if(!exact(r,'stage first exception builder http published checked current captureRevision checkRevision')||!['stage','first','builder','http'].every(k=>typeof r[k]==='string'&&r[k].length<=128&&/^[a-zA-Z0-9-]*$/.test(r[k]))||!['exception','published','checked','current'].every(k=>r[k]===0||r[k]===1)||!integer(r.captureRevision)||!integer(r.checkRevision))throw Error('evidence-invalid');
    }
    if(++state.rows>4095||(state.bytes+=bytes)>2*1024*1024-512)throw Error('completion-cap');
   });}catch(e){state.error=e.message;}
  },
  get error(){return state.error;},
  finish(){
   try{if(state.error)throw Error(state.error);for(const s of Object.values(streams))s.finish();
    if(!state.receipt)throw Error('completion-receipt-missing');
    if(state.rows!==state.receipt.rows||state.bytes!==state.receipt.bytes)throw Error('completion-receipt-mismatch');
    return {status:'captured',rows:state.rows,bytes:state.bytes,receipt:state.receipt};
   }catch(e){return {status:'incomplete',code:e.message,rows:state.rows,bytes:state.bytes,receipt:state.receipt};}
  }
 };
}
