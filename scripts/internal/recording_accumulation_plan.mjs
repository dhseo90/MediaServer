// 파일 용도: LP26-O10 독립 계수 oracle. 제품 성능 합격 기준을 만들지 않는다.
import {normalizeOwner} from './recording_catalog_comparison_guard.mjs';
export const casePlan=()=>[16,1020,2048,2049].map(sources=>({sources,records:sources*4}));
export function assertDrain(value,sources){
  if(value.mutationCount!==sources*4||value.partialBytes!==0||value.backlog!==false||
    ['recording_order_reserved','segment_v2_bound_finalized','segment_v2_state','segment_v2_deleted'].some(k=>value.typeCounts[k]!==sources))throw Error('drain-oracle');
}
export function assertRotation(value){if(value.fresh!==0||value.rotations<1)throw Error('rotation-oracle');}
function tracker(notify,stages){let index=0,active=null;
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
export function stageTracker(notify){return tracker(notify,['recovery','timeline-projection','cold-binding','checkpoint-cold','checkpoint-repeat']);}
export function ownershipStageTracker(notify,reopen=false){return tracker(notify,reopen?['ownership-reopen']:['ownership-open','ownership-timeline','ownership-acquire','ownership-release','ownership-checkpoint']);}
export function ownershipCollector(sources){
  const observed=new Map(),memory=new Set(),owners=new Set(['journal','live','shadow','prefix']),observeStages=new Set(['pre-checkpoint','handles-held','handles-released','requery-released','post-checkpoint','fresh-reopen']);let initial=null,reopen=null;
  const exact=(value,keys)=>value&&Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
  return {line(line){
    if(line.startsWith('[lp17] ')){const row=JSON.parse(line.slice(7));if(row.kind==='memory'){
      if(!exact(row,['kind','stage','sources','currentRssBytes','peakRssBytes'])||!observeStages.has(row.stage)||row.sources!==sources||![row.currentRssBytes,row.peakRssBytes].every(Number.isSafeInteger))throw Error('ownership-memory');memory.add(row.stage);return;}
      const value=normalizeOwner(row);if(!value||(!observeStages.has(value.stage)&&!['snapshot-held','snapshot-released'].includes(value.stage))||(!owners.has(value.owner)&&value.owner!=='snapshot'))throw Error('ownership-owner');
      const key=value.stage+':'+value.owner;if(observed.has(key))throw Error('ownership-owner-duplicate');observed.set(key,value);return;
    }
    if(line.startsWith('[ownership-lifecycle] ')){initial=JSON.parse(line.slice('[ownership-lifecycle] '.length));return;}
    if(line.startsWith('[ownership-reopen] ')){reopen=JSON.parse(line.slice('[ownership-reopen] '.length));}
  },finish(){for(const stage of observeStages){if(!memory.has(stage))throw Error('ownership-memory-missing');for(const owner of owners)if(!observed.has(stage+':'+owner))throw Error('ownership-owner-missing');}
    for(const stage of ['snapshot-held','snapshot-released'])if(!observed.has(stage+':snapshot'))throw Error('ownership-snapshot-missing');
    if(!initial||!reopen||initial.sources!==sources||reopen.sources!==sources||initial.readers!==Math.min(sources,8)||reopen.readers!==Math.min(sources,8)||initial.bindingSha256!==reopen.bindingSha256||!/^[a-f0-9]{64}$/.test(initial.bindingSha256)||initial.expiredWeak!==initial.readers*2||initial.heldDistinctObjects<1||initial.heldDistinctObjects>initial.readers*2||initial.sameObject+initial.heldDistinctObjects!==initial.readers*2||initial.samplesPerBinding!==60||reopen.samplesPerBinding!==60||initial.mediaFiles!==0||initial.serializedEqual!==true||reopen.serializedEqual!==true||initial.deleted!==true||reopen.deleted!==true||initial.snapshotReleased!==true||initial.handlesReleased!==true||initial.wholeHeapAttributed!==false||initial.rssLeakProven!==false)throw Error('ownership-lifecycle');
    return {owners:[...observed.values()],initial,reopen};}};
}
