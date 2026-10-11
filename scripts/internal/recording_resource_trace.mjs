// 파일 용도: opt-in 실제 제품 owner 로그의 고정 크기 수집·누락/종료 판정. 제품 RSS와 별개다.
const prefix='[recording-resource] ';
export function resourceTraceCollector(pid){return {pid,carry:'',skip:false,count:0,last:null,opened:false,before:false,after:false,final:false,error:null};}
export function collectResourceTrace(state,chunk){
 if(state.error)return;
 try{
  let text=state.carry+chunk.toString('utf8');state.carry='';
  for(;;){const end=text.indexOf('\n');if(end<0)break;const line=text.slice(0,end);text=text.slice(end+1);
   if(state.skip){state.skip=false;continue;}
   if(!line.startsWith(prefix))continue;
   if(line.length>1024)throw Error('resource-line-cap');
   const r=JSON.parse(line.slice(prefix.length));
   const keys=['pid','seq','elapsedMs','ram','ramPeak','ramLimit','ramRejected','scratchDisk','scratchDiskPeak','scratchDiskLimit','scratchFd','scratchFdPeak','scratchFdLimit','scratchRam','preservedDisk','preservedFd'];
   if(!keys.every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||r.pid!==state.pid||r.seq!==state.count||state.final||r.readerCleanupHealthy!==true)throw Error('resource-row-invalid');
   if(r.ramLimit!==640*1024*1024||r.ram>r.ramLimit||r.ramPeak>r.ramLimit||r.scratchFd>r.scratchFdLimit||r.preservedDisk||r.preservedFd||r.ramRejected)throw Error('resource-budget-or-lifetime');
   if(state.last&&(r.elapsedMs<state.last.elapsedMs||r.ramPeak<state.last.ramPeak))throw Error('resource-order');
   if(r.phase==='opened'){if(state.count!==0)throw Error('resource-open-order');state.opened=true;}
   else if(r.phase==='sample'){if(!state.opened||state.before)throw Error('resource-sample-order');}
   else if(r.phase==='before-Finish'){if(!state.opened||state.before)throw Error('resource-finish-order');state.before=true;}
   else if(r.phase==='after-Finish'){if(!state.before||state.after)throw Error('resource-finish-residue');state.after=true;}
   else if(r.phase==='after-storage-destruction'){if(!state.after||r.ram||r.scratchFd||r.scratchDisk)throw Error('resource-final-residue');state.final=true;}
   else throw Error('resource-phase');
   state.last=r;state.count++;if(state.count>1600)throw Error('resource-count-cap');state.receivedAt=performance.now();
  }
  if(text.length>4096){if(text.startsWith(prefix))throw Error('resource-fragment-cap');state.skip=true;}else state.carry=text;
 }catch(e){state.error=e.message;}
}
export function currentResourceTrace(state){
 if(state.error)throw Error(state.error);
 if(!state.last||performance.now()-state.receivedAt>15000)throw Error('resource-sample-missing-or-stale');
 return {...state.last};
}
export function finishResourceTrace(state){
 if(state.error||!state.final||state.carry.startsWith(prefix))throw Error(state.error||'resource-final-missing-or-truncated');
 return {status:'captured',count:state.count,final:state.last,scope:'actual shared product owner; logical charges, not total heap or RSS; sequential counter reads'};
}
