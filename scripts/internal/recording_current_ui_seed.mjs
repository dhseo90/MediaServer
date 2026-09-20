// 파일 용도: 현행 UI seed의 실제 공개 응답·파일 hash oracle. UI PASS를 반환하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
function requireValue(value,code){if(!value)throw Error(code);}
export function validateCurrentUiSeed(root,seed){
  root=fs.realpathSync(root);
  requireValue(seed?.schema==='recording-current-ui-fixture.v1'&&seed.channelId==='1'&&seed.actualUiPass===false&&seed.reopenedUnchanged===true,'LP26-U01 manifest contract');
  requireValue(seed.anchorUtcMs===null||/^\d{12,13}$/.test(seed.anchorUtcMs)&&BigInt(seed.anchorUtcMs)>=946684800000n&&BigInt(seed.anchorUtcMs)<=4102444800000n,'LP26-U01 anchor');
  requireValue(Array.isArray(seed.pages)&&seed.pages.length>=2&&seed.pages.length<42,'LP26-U04 pages');
  const rows=[],ids=new Set();let total,unplacedTotal;
  for(const [index,page] of seed.pages.entries()){
    requireValue(Array.isArray(page.items)&&Array.isArray(page.unplacedItems)&&page.offset===index*100&&page.limit===100,'LP26-U04 page shape');
    if(index===0){total=page.total;unplacedTotal=page.unplacedTotal;}
    requireValue(page.total===total&&page.unplacedTotal===unplacedTotal,'LP26-U04 stable totals');
    for(const [list,unknown] of [[page.items,false],[page.unplacedItems,true]])for(const row of list){
      requireValue(typeof row.itemId==='string'&&!ids.has(row.itemId),'LP26-U04 unique itemId');ids.add(row.itemId);rows.push(row);
      requireValue(unknown?row.startTimeMs===null&&row.endTimeMs===null&&row.utcRange===null:typeof row.startTimeMs==='string'&&typeof row.endTimeMs==='string','LP26-U02 integer/null UTC');
      if(unknown)requireValue(row.hideByEvent===false,'LP26-U02 unknown not hidden');
    }
  }
  requireValue(rows.length===total+unplacedTotal&&Math.max(total,unplacedTotal)>100,'LP26-U04 full pagination');
  const known=seed.pages.flatMap(p=>p.items),unknown=seed.pages.flatMap(p=>p.unplacedItems);
  requireValue(unknown.length>0&&(seed.anchorUtcMs===null?known.length===0:known.length>0),'LP26-U02 known unknown separation');
  const rootFiles=path.join(root,'recordings'),seenFiles=new Set();
  function file(info,condition='healthy'){
    requireValue(info&&typeof info.id==='string'&&typeof info.relativePath==='string'&&!path.isAbsolute(info.relativePath)&&!info.relativePath.split(/[\\/]/).includes('..')&&/^[a-f0-9]{64}$/.test(info.sha256)&&Number.isSafeInteger(info.sizeBytes)&&info.sizeBytes>0&&info.sizeBytes<=16*1024*1024,'LP26-U03 file metadata');
    const full=path.join(rootFiles,info.relativePath);
    requireValue(full.startsWith(rootFiles+path.sep)&&!seenFiles.has(full),'LP26-U03 unique owned files');seenFiles.add(full);
    if(condition==='deleted'){requireValue(!fs.existsSync(full),'LP26-U05 deleted absent');return;}
    const stat=fs.lstatSync(full);requireValue(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&fs.realpathSync(full)===full&&stat.size===info.sizeBytes,'LP26-U03 physical file');
    const digest=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    requireValue(condition==='corrupt'?digest!==info.sha256:digest===info.sha256,'LP26-U03 actual file hash');
  }
  file(seed.original);
  requireValue(Array.isArray(seed.jobs)&&seed.jobs.map(j=>j.name).join(',')==='full,partial,corrupt,deleted','LP26-U03 scenarios');
  for(const job of seed.jobs){
    requireValue(typeof job.jobId==='string'&&job.outputs.length===2&&new Set(job.outputs.map(o=>o.id)).size===2,'LP26-U03 actual two outputs');
    for(const [index,output] of job.outputs.entries()){
      const state=index===0&&['corrupt','deleted'].includes(job.name)?job.name:'healthy';file(output,state);
      const matches=rows.filter(r=>r.segmentId===output.id&&r.jobId===job.jobId);
      requireValue(output.contentType==='video/mp2t'&&matches.length>0&&matches.every(r=>r.kind==='event'&&r.jobState==='complete'),'LP26-U03 complete actual TS output');
      requireValue(matches.every(r=>state==='healthy'?r.playable&&r.playbackUrl===`/ops/api/recordings/media/${output.id}`:!r.playable&&!r.playbackUrl),'LP26-U05 playback binding');
      if(job.name==='deleted'&&index===0)requireValue(matches.every(r=>r.catalogState==='deleted'),'LP26-U05 deleted state');
      if(job.name==='corrupt'&&index===0)requireValue(matches.every(r=>r.catalogState==='corrupt'),'LP26-U05 corrupt state');
      if(['full','partial'].includes(job.name))requireValue(matches.every(r=>r.completeness===(job.name==='full'?'complete':'partial')),'LP26-U03 completeness');
    }
  }
  requireValue(rows.some(r=>r.referenceId==='ui-accepted-only'&&!r.playable&&!r.playbackUrl),'LP26-U05 accepted-only unavailable');
  if(seed.anchorUtcMs!==null){
    requireValue(known.some(r=>r.kind==='continuous'&&r.hideByEvent)&&known.some(r=>r.kind==='continuous'&&!r.hideByEvent&&r.eventOverlaps?.length),'LP26-U04 full/partial overlap');
    const bySegment=new Map();for(const row of known.filter(r=>r.kind==='continuous')){const list=bySegment.get(row.segmentId)||[];list.push(row);bySegment.set(row.segmentId,list);}
    requireValue([...bySegment.values()].some(list=>list.some(a=>list.some(b=>a!==b&&BigInt(a.endTimeMs)+1000n<BigInt(b.startTimeMs)))),'LP26-U02 discontinuity preserved');
  }
  if(seed.seek){file(seed.seek);requireValue(seed.seek.contentType==='video/mp4'&&rows.some(r=>r.segmentId===seed.seek.id&&r.kind==='continuous'&&r.playable),'LP26-U08 managed source seek');}
  return {rows:rows.length,known:known.length,unknown:unknown.length,pages:seed.pages.length,actualUiPass:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {const result=validateCurrentUiSeed(process.argv[2],JSON.parse(fs.readFileSync(process.argv[3],'utf8')));
    for(const id of ['LP26-U01-A','LP26-U02-A','LP26-U03-A','LP26-U04-A','LP26-U05-A'])console.log(`PASS: ${id} current managed UI seed oracle`);
    console.log('[ui-seed-summary] '+JSON.stringify(result));
  }catch(error){console.error('FAIL: '+error.message);process.exitCode=1;}
}
