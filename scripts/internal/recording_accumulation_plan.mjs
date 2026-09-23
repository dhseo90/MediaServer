// 파일 용도: LP26-O10 독립 계수 oracle. 제품 성능 합격 기준을 만들지 않는다.
export const casePlan=()=>[16,1020,2049].map(sources=>({sources,records:sources*4}));
export function assertDrain(value,sources){
  if(value.mutationCount!==sources*4||value.partialBytes!==0||value.backlog!==false||
    ['recording_order_reserved','segment_v2_bound_finalized','segment_v2_state','segment_v2_deleted'].some(k=>value.typeCounts[k]!==sources))throw Error('drain-oracle');
}
export function assertRotation(value){if(value.fresh!==0||value.rotations<1)throw Error('rotation-oracle');}
export function stageTracker(notify){
  const stages=['recovery','cold-binding','checkpoint-cold','checkpoint-repeat'];let index=0,active=null;
  return {line(line){
    if(line.startsWith('[probe-stage] ')){
      const stage=line.slice(14).replace(/ begin$/,'');
      if(active!==null||index>=stages.length||stage!==stages[index]||line!=='[probe-stage] '+stage+' begin')throw Error('stage-sequence');
      active=stage;notify({stage,state:'begin'});
    }else if(line.startsWith('[probe-wall] ')){
      let value;try{value=JSON.parse(line.slice(13));}catch{throw Error('stage-wall');}
      if(active===null||!value||Object.keys(value).sort().join(',')!=='elapsedUs,ok,stage'||value.stage!==active||!Number.isSafeInteger(value.elapsedUs)||value.elapsedUs<0||value.ok!==true)throw Error('stage-wall');
      if(value.elapsedUs>15000000)throw Error('stage-time-cap');
      notify({stage:active,state:'end'});active=null;index++;
    }
  },finish(){if(index!==stages.length||active!==null)throw Error('stage-incomplete');}};
}
