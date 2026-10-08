// 파일 용도: 혼합 관측의 A 부하만 구성한다. 합성 projector 자료를 현재 검색 snapshot으로 보존하고 실제 확인/worker/저장을 통과한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const prefix='/ops/api/recordings/a-record-reviews',packs='/ops/api/recordings/a-record-packages';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function requireMixedWindows(windows){
  assert(windows.length===3&&windows.every(w=>w.structured>0&&w.visual>0&&w.evidence>0&&w.visualEvidence>0),'mixed early middle late work missing');
}
export class AOpportunities {
  constructor(start,duration){assert(duration===30000||duration===7200000);this.start=start;this.end=start+duration;this.next=0;this.maximum=duration===30000?1:120;this.rows=[];}
  take(now,busy){if(now>=this.end||this.next>=this.maximum||now<this.start+this.next*60000)return null;
    // 지연된 기회를 한꺼번에 접수하지 않는다. 지나간 기회는 별도 미접수로 보존한다.
    const due=Math.min(this.maximum-1,Math.floor((now-this.start)/60000));
    while(this.next<due)this.rows.push({slot:this.next++,state:'missed',elapsedMs:now-this.start});
    const row={slot:this.next++,state:busy?'waiting-previous':'admitting',elapsedMs:now-this.start};this.rows.push(row);return busy?null:row;
  }
}
export class MixedALoad {
  constructor({root,seedInfo,request,check,budget}){Object.assign(this,{root,seedInfo,request,check,budget});this.completed=[];this.controlsResult={};this.active=null;this.initial=this.inventory();this.immutable=new Map();
    for(const name of this.initial.names)this.remember('va-reviews/'+name);
    this.check(this.initial.names.length+124<512&&this.initial.bytes+124*(128*1024+8)<64*1024*1024,'A planned store quota including controls and restart');}
  inventory(){const dir=path.join(this.root,'recordings/va-reviews'),names=fs.readdirSync(dir).filter(x=>x.endsWith('.review')).sort();return {names,bytes:names.reduce((n,k)=>n+fs.statSync(path.join(dir,k)).size,0)};}
  remember(rel){const file=path.join(this.root,'recordings',rel),bytes=fs.readFileSync(file),digest=hash(bytes);if(this.immutable.has(rel))this.check(this.immutable.get(rel).sha256===digest,'A preserved bytes unchanged');else this.immutable.set(rel,{bytes:bytes.length,sha256:digest});}
  async req(app,route,method='GET',body,expected=200){this.budget();const r=await this.request(app,route,method,body);let value;try{value=JSON.parse(r.bytes);}catch{throw Error('A response JSON');}
    console.log('[A-http] '+JSON.stringify({route:route.split('?')[0],method,status:r.status,elapsedMs:r.elapsedMs,bytes:r.bytes.length,error:value.error??null}));
    this.check(r.status===expected,'A HTTP '+method+' '+route.split('?')[0]+' '+expected);
    if(route.startsWith('/ops/api/recordings/'))this.check(r.headers.get('cache-control')==='no-store','A private no-store');return value;}
  async prepare(app,label){
    const q=new URLSearchParams({channelIds:'1',startTimeMs:String(this.seedInfo.startTimeMs),endTimeMs:String(this.seedInfo.endTimeMs),object:'synthetic-target',includeUnplaced:'true'});
    const found=await this.req(app,'/ops/api/recordings/search?'+q),hit=found.items.find(x=>x.track==='track-77');
    console.log('[A-search-selection] '+JSON.stringify({snapshotId:found.snapshotId,items:found.items.map(x=>({id:x.id,kind:x.kind,track:x.track,object:x.object,startTimeNs:x.startTimeNs}))}));this.check(!!hit&&!!found.snapshotId,'A exact synthetic target in current catalog search');q.set('snapshotId',found.snapshotId);q.set('hitId',hit.id);
    const created=await this.req(app,'/ops/api/recordings/search/a-record-evidence?'+q,'POST',{},201),pack=await this.req(app,packs+'/'+created.id);
    this.check(pack.frames.length===1&&pack.targetLabel==='track-77'&&pack.analysisNamespace==='synthetic-analysis-tap','A selected sample manifest from current snapshot');this.remember('evidence-packages/'+pack.id+'.evp');
    const body={packageId:pack.id,targetKey:pack.targetKey,question:'합성 A 분석 기록의 가시성 값과 단일 시점의 비교 자료 부족 확인',claims:[
      {relation:'visibility-at',requiredColor:'red',requiredVisible:true,frames:[0]},
      {relation:'visibility-at',requiredColor:'red',requiredVisible:false,frames:[0]},
      {relation:'endpoint-right',requiredColor:'red',requiredVisible:true,frames:[0]}]};
    const draft=await this.req(app,prefix+'/drafts','POST',body,201);await this.req(app,prefix+'/drafts/'+draft.id+'/confirm','POST',{revision:draft.revision});
    return {label,packageId:pack.id,snapshotId:found.snapshotId,hitId:hit.id,draftId:draft.id,revision:draft.revision,preparedAt:performance.now(),pid:app.child.pid};
  }
  async submit(app,row){const job=await this.req(app,prefix+'/drafts/'+row.draftId+'/execute','POST',{revision:row.revision},202);Object.assign(row,{jobId:job.id,admittedAt:performance.now(),state:'admitted'});this.active=row;console.log('[A-admitted] '+JSON.stringify(row));}
  async poll(app){if(!this.active)return;const row=this.active,job=await this.req(app,prefix+'/jobs/'+row.jobId);row.lastState=job.state;
    if(['queued','running'].includes(job.state)){this.check(performance.now()-row.admittedAt<=90000,'A queue30 execution60 budget');return;}
    this.check(job.state==='completed','A normal worker completes');await this.completedJob(app,row,job);this.active=null;}
  async completedJob(app,row,job){const result=await this.req(app,prefix+'/'+job.reviewId);
    this.check(result.decisions?.map(d=>d.verdict).join(',')==='supported,contradicted,insufficient','A fixed independent record expectations');
    this.check(result.scope==='analysis-record-consistency'&&result.questionsState==='not-generated'&&result.modelQuality==='not-evaluated'&&result.confirmedAtMs>0,'A authenticated confirmation provenance and no model generation');
    this.check(result.materialRequests?.origin==='server-rule'&&result.materialRequests.status==='available'&&result.decisions[2].gaps.length===1&&result.decisions[2].gaps[0].kind==='ordered-time'&&result.materialRequests.items.length===1&&result.materialRequests.items.every(i=>i.frames.every(f=>f.index===0)),'A ordered additional time server materials');
    const list=await this.req(app,prefix+'?packageId='+row.packageId);this.check(list.items.some(x=>x.id===job.reviewId),'A atomically stored result listed');
    this.remember('va-reviews/'+job.reviewId+'.review');Object.assign(row,{state:'completed',reviewId:job.reviewId,completedAt:performance.now(),jobElapsedMs:performance.now()-row.admittedAt,resultHash:hash(Buffer.from(JSON.stringify(result)))});this.completed.push({...row});console.log('[A-completed] '+JSON.stringify(row));}
  start(begin,duration){this.schedule=new AOpportunities(begin,duration);}
  async tick(app){await this.poll(app);const slot=this.schedule.take(performance.now(),!!this.active);if(!slot)return;
    try{Object.assign(slot,await this.prepare(app,'main-'+slot.slot));await this.submit(app,slot);}catch(error){slot.state='failed';slot.error=error.message;throw error;}}
  async finish(app){await this.poll(app);this.check(!this.active,'A last admitted work terminal by observation end');
    const rows=this.completed.filter(x=>x.label.startsWith('main-'));this.check(rows.length>0,'A mixed completion not only allowed errors');
    if(this.schedule.maximum===120)for(let n=0;n<3;n++)this.check(rows.some(x=>x.admittedAt>=this.schedule.start+n*2400000&&x.completedAt<this.schedule.start+(n+1)*2400000),'A early middle late completion '+n);}
  async settle(app){const end=performance.now()+90000;while(this.active&&performance.now()<end){await this.poll(app);if(this.active)await new Promise(r=>setTimeout(r,100));}this.check(!this.active,'A controlled work terminal');}
  async controls(app,password){
    const row=await this.prepare(app,'cancel-race'),cancelBefore=this.inventory();await this.submit(app,row);const cancelled=await this.request(app,prefix+'/jobs/'+row.jobId,'DELETE');
    this.check(cancelled.status===200,'A cancel or completion conflict');const returned=JSON.parse(cancelled.bytes);let job=returned;
    const end=performance.now()+90000;while(['queued','running'].includes(job.state)&&performance.now()<end){job=await this.req(app,prefix+'/jobs/'+row.jobId);if(['queued','running'].includes(job.state))await new Promise(r=>setTimeout(r,100));}
    this.check(['completed','cancelled'].includes(job.state),'A cancel race real terminal state');if(job.state==='completed')await this.completedJob(app,row,job);
    else{this.check(JSON.stringify(this.inventory())===JSON.stringify(cancelBefore),'A cancelled work unpublished');}
    this.active=null;this.controlsResult.cancel={httpStatus:cancelled.status,state:job.state,reviewId:job.reviewId??null};
    const username='mixed-a-writer';await this.req(app,'/ops/api/users','POST',{username,displayName:username,role:'operator',scopes:['ops:read','ops:write','source:read:1'],password,enabled:true,mustChangePassword:false},201);
    const login=await fetch(app.base+'/login',{method:'POST',body:new URLSearchParams({username,password}),redirect:'manual',signal:AbortSignal.timeout(5000)});this.check(login.status===302,'A lifecycle writer login');await login.arrayBuffer();
    const writer={...app,cookie:login.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ')},pending=await this.prepare(writer,'revoked-before-execute'),before=this.inventory();
    await this.req(app,'/ops/api/users/'+username+'/disable','POST',{});
    const denied=await this.request(writer,prefix+'/drafts/'+pending.draftId+'/execute','POST',{revision:pending.revision});this.check([401,403].includes(denied.status),'A revoked principal execution rejected');
    this.check(JSON.stringify(this.inventory())===JSON.stringify(before),'A revoked execution no record publication');this.controlsResult.revoke={status:denied.status,unchangedStore:true};this.transient=pending;
  }
  async readback(app){for(const [rel,value] of this.immutable)this.check(hash(fs.readFileSync(path.join(this.root,'recordings',rel)))===value.sha256,'A restart preserved bytes');
    const main=this.completed.filter(x=>x.label.startsWith('main-'));for(const row of new Set([main[0],main[Math.floor(main.length/2)],main.at(-1)])){const result=await this.req(app,prefix+'/'+row.reviewId);this.check(hash(Buffer.from(JSON.stringify(result)))===row.resultHash,'A restarted process immutable result and guidance');}
    await this.req(app,prefix+'/drafts/'+this.transient.draftId+'/confirm','POST',{revision:this.transient.revision},410);this.controlsResult.restart={allLocalBytesUnchanged:true,independentHttpReadbackCount:new Set([main[0],main[Math.floor(main.length/2)],main.at(-1)]).size,transientExpired:true};}
  async reactivate(app){const row=await this.prepare(app,'reactivated');await this.submit(app,row);await this.settle(app);this.check(row.reviewId!==this.completed[0].reviewId,'A new result distinct after restart');}
  report(){return {source:'synthetic AnalysisObservationProjector before server start; current live catalog snapshot selection and A worker each admission',detectorEvaluated:false,schedule:this.schedule?.rows??[],completed:this.completed,controls:this.controlsResult,initialStore:this.initial,finalStore:this.inventory(),immutableFiles:[...this.immutable].map(([path,v])=>({path,...v}))};}
}
