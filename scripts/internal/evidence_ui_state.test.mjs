// 파일 용도: 제품 증거 workspace의 중복 보존·늦은 응답·권한·안전 렌더 상태 회귀.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=fs.readFileSync(new URL('../../src/ingress/product_ui_page_scripts.cpp',import.meta.url),'utf8');
const start=source.indexOf('        const evidenceUi = (() => {');
const end=source.indexOf("        if (window.location.pathname === '/ops/events' && document.getElementById('opsSearchForm')) {",start);
assert(start>=0&&end>start);
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.events=new Map();this.value=tag==='textarea'?'':'1';this.style={};this.textContent='';this.disabled=false;this.attrs={};}
  set disabled(value){this.isDisabled=!!value;}
  get disabled(){return this.isDisabled;}
  addEventListener(name,fn){const list=this.events.get(name)||[];list.push(fn);this.events.set(name,list);}
  fire(name){return Promise.all((this.events.get(name)||[]).map(fn=>fn({preventDefault(){}})));}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  querySelectorAll(tag){return this.children.filter(x=>x.tag===tag);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  set innerHTML(_){throw Error('raw HTML forbidden');}
  pause(){}
  load(){}
  scrollIntoView(){this.scrolled=true;}
  focus(){this.focused=true;}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const id='ep-'+'a'.repeat(64);
function fixture(){
  const elements=new Map(),pending=[],timers=new Map(),windowEvents=new Map();let timerId=0;
  const el=name=>{const key=name.startsWith('opsEvidence')?name:'opsEvidence'+name;if(!elements.has(key))elements.set(key,new Element());return elements.get(key);};
  const context={window:{location:{pathname:'/ops/events'},addEventListener:(name,fn)=>windowEvents.set(name,fn)},document:{getElementById:el,createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('text'),{textContent:text})},
    URLSearchParams,Date,Error,AbortController,TextEncoder,setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))};
  vm.runInNewContext(source.slice(start,end)+'\nglobalThis.evidenceTest=evidenceUi;',context);
  const answer=(request,data,status=200)=>request.resolve({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
  answer(pending.shift(),{channels:[{channelId:'1',displayName:'Camera'}]});
  const find=(node,id)=>node.id===id?node:node.children.map(child=>find(child,id)).find(Boolean);
  return {el,pending,answer,api:context.evidenceTest,timers,leave:()=>windowEvents.get('pagehide')(),review:name=>find(el('Detail'),'opsVaReview'+name),a:name=>find(el('Detail'),'opsAReview'+name),
    tick:async()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);return fn();}};
}
const detail=()=>({id,manifest:{channelId:'1',status:'complete',createdAtMs:1,frames:[{}],references:[],assets:[{contentType:'image/png'}]},currentSources:[{kind:'recording',state:'deleted'}]});
test('V440-U01 explicit POST preserves selected parameters and admits one creation',async()=>{
  const f=fixture();await flush();
  const a=f.api.button('search',{snapshotId:'snapshot-old',hitId:'selected',channelIds:'1'});
  const b=f.api.button('visual-search',{channelId:'1',hitId:'other'});
  const work=a.fire('click');await flush();await b.fire('click');
  assert.equal(f.pending.length,1);assert(a.disabled);
  const request=f.pending.shift();assert.equal(request.options.method,'POST');assert.equal(request.options.body,'{}');
  assert.equal(request.options.headers['Content-Type'],'application/json');
  assert.match(request.url,/snapshotId=snapshot-old/);assert.match(request.url,/hitId=selected/);
  f.answer(request,{id,status:'complete'},201);await flush();assert.equal(f.pending[0].url,'/ops/api/recordings/evidence/'+id);
  f.answer(f.pending.shift(),detail());await work;
  assert.match(f.el('Detail').children[1].textContent,/원본이 삭제/);
  const image=f.el('Detail').children.find(x=>x.tag==='img');assert.equal(image.src,'/ops/api/recordings/evidence/'+id+'/assets/0');
  assert.equal(a.disabled,false);
});
test('V440-U01 channel change suppresses late detail and old media errors',async()=>{
  const f=fixture();await flush();const button=f.api.button('search',{snapshotId:'s',hitId:'h'});
  const work=button.fire('click');await flush();f.answer(f.pending.shift(),{id,status:'partial'},201);await flush();
  const old=f.pending.shift();await f.el('Channel').fire('change');f.answer(old,detail());await work;
  assert.equal(f.el('Detail').children.length,0);assert.match(f.el('Status').textContent,/목록 조회/);
});
test('V440-U01 forbidden and disabled are explicit without success state',async()=>{
  for(const [status,error,pattern] of [[403,'forbidden',/권한/],[503,'evidence-disabled',/비활성/],[503,'evidence-capacity',/용량/],[410,'search-snapshot-expired',/만료/]]){
    const f=fixture();await flush();const button=f.api.button('search',{snapshotId:'s',hitId:'h'});
    const work=button.fire('click');await flush();f.answer(f.pending.shift(),{error},status);await work;
    assert.match(f.el('CreateStatus').textContent,pattern);assert.equal(f.el('Detail').children.length,0);assert.equal(button.disabled,false);
  }
});
test('V440-U01 invalid artifact ID never becomes a fetch URL',async()=>{
  const f=fixture();await flush();const button=f.api.button('visual-search',{channelId:'1',hitId:'h'});
  const work=button.fire('click');await flush();f.answer(f.pending.shift(),{id:'https://external.invalid/private',status:'complete'},201);await work;
  assert.equal(f.pending.length,0);assert.equal(f.el('Detail').children.length,0);
});
test('V440-U01 obsolete list does not repopulate changed channel',async()=>{
  const f=fixture();await flush();const work=f.el('Refresh').fire('click');await flush();
  const request=f.pending.shift();f.el('Channel').value='2';await f.el('Channel').fire('change');
  f.answer(request,{items:[{id,createdAtMs:1,frames:1,status:'complete'}],nextAfter:id});await work;
  assert.equal(f.el('Rows').children.length,0);assert.equal(f.el('Next').disabled,true);assert.equal(f.el('Refresh').disabled,false);
});
test('V440-U01 media loads sequentially within server admission; stale queue stops',async()=>{
  const f=fixture();await flush();const button=f.api.button('search',{snapshotId:'s',hitId:'h'});
  const work=button.fire('click');await flush();f.answer(f.pending.shift(),{id,status:'complete'},201);await flush();
  const data=detail();data.manifest.assets=Array.from({length:8},()=>({contentType:'image/png'}));
  f.answer(f.pending.shift(),data);await work;
  const images=f.el('Detail').children.filter(x=>x.tag==='img');
  assert.equal(images.filter(x=>x.src).length,1);
  await images[0].fire('load');assert.equal(images.filter(x=>x.src).length,2);
  await images[1].fire('error');assert.equal(images.filter(x=>x.src).length,3);
  await f.el('Channel').fire('change');await images[2].fire('load');assert.equal(images.filter(x=>x.src).length,3);
});

// V450-U01 실행 전 고정한 기대: 정상 명시 POST→단일 polling→완료 결과/근거 이동,
// disabled/쓰기권한없음/빈 프레임/빈 질문/513바이트/미지원 provider는 API에서 거부.
// 중복 실행·취소는 각 1회, 오류는 안전 문구, 상세/채널/페이지 전환은 abort·timer 정리 및 늦은 응답 무시.
const reviewId='vr-'+'b'.repeat(64),jobId='vj-'+'c'.repeat(32)+'-1';
const job=(state='running',extra={})=>({id:jobId,packageId:id,state,error:'',reviewId:'',canCancel:true,...extra});
const listData=(extra={})=>({enabled:true,canExecute:true,items:[],...extra});
async function openReview(f,data=detail(),settings=listData()){
  await flush();const work=f.api.button('search',{snapshotId:'s',hitId:'h'}).fire('click');await flush();
  f.answer(f.pending.shift(),{id,status:'complete'},201);await flush();f.answer(f.pending.shift(),data);await work;
  const request=f.pending.shift();assert.match(request.url,/va-reviews\?packageId=/);f.answer(request,settings);await flush();
}
async function input(f,text='A red square is visible.') {f.review('Question').value=text;await f.review('Question').fire('input');}
test('V450-U01 explicit review completes and frame indices resolve through references, not asset position',async()=>{
  const f=fixture(),data=detail();data.manifest.frames=[{segmentId:'s',ptsNs:10}];
  data.manifest.assets=[{contentType:'video/mp4'},{contentType:'image/png'}];data.manifest.references=[{kind:'frame',state:'preserved',id:'s:10',assetIndex:1}];
  await openReview(f,data);assert.equal(f.pending.length,0);await input(f);
  const submit=f.review('Execute').fire('click');await flush();await f.review('Execute').fire('click');assert.equal(f.pending.length,1);
  const request=f.pending.shift();assert.equal(request.options.method,'POST');assert.deepEqual(JSON.parse(request.options.body),{packageId:id,question:'A red square is visible.',provider:'ollama'});
  f.answer(request,job('queued'),202);await submit;assert(f.review('Execute').disabled);assert.equal(f.timers.size,1);
  const poll=f.tick();await flush();assert.equal(f.pending[0].url,'/ops/api/recordings/va-review-jobs/'+jobId);
  f.answer(f.pending.shift(),job('completed',{reviewId,canCancel:false}));await poll;assert.equal(f.timers.size,0);
  const requests=f.pending.splice(0);f.answer(requests.find(r=>r.url.includes('?')),listData({items:[{id:reviewId,question:'A red square is visible.',provider:'ollama',createdAtMs:1}]}));
  f.answer(requests.find(r=>r.url.endsWith(reviewId)),{id:reviewId,packageId:id,question:'A red square is visible.',output:{supports:[{text:'<script>literal</script>',frameIndices:[0,99]}],contradictions:[],questions:[],unclear:[],confidence:.8}});await flush();
  const result=f.review('Result'),row=result.children.find(n=>n.children.some(x=>x.tag==='button'));
  assert.equal(row.children[0].textContent,'<script>literal</script>');assert.equal(row.children.filter(n=>n.tag==='button').length,1);
  await row.children.find(n=>n.tag==='button').fire('click');const image=f.el('Detail').children.find(n=>n.tag==='img');assert(image.scrolled&&image.focused);
  assert.match(f.review('Status').textContent,/완료/);assert.equal(f.review('Execute').disabled,false);
});
test('V450-U01 disabled, read-only, missing frames, byte boundaries cannot submit',async()=>{
  for(const [settings,frames] of [[listData({enabled:false}),[{}]],[listData({canExecute:false}),[{}]],[listData(),[]]]){
    const f=fixture(),data=detail();data.manifest.frames=frames;await openReview(f,data,settings);await input(f);await f.review('Execute').fire('click');assert(f.review('Execute').disabled);assert.equal(f.pending.length,0);
  }
  const f=fixture();await openReview(f);for(const text of ['', '   ','a'.repeat(513),'가'.repeat(171),'https://private.invalid','line\nbreak']){await input(f,text);assert(f.review('Execute').disabled);await f.review('Execute').fire('click');assert.equal(f.pending.length,0);}
  await input(f,'가'.repeat(170)+'aa');assert.equal(f.review('Execute').disabled,false);
  assert.equal(f.review('Provider'),undefined);assert.equal(f.review('TransferConsent'),undefined);assert.equal(f.review('ExternalNotice'),undefined);
});
test('V450-U01 API errors use safe messages; disabled/forbidden block execution and transient failures allow retry',async()=>{
  for(const [status,error,pattern] of [[503,'review-disabled',/비활성/],[503,'review-queue-full',/대기열/],[503,'review-tls-failed',/보안 연결/],[503,'review-provider-auth',/인증/],[503,'review-provider-rate-limit',/한도/],[403,'review-forbidden',/권한/],[400,'review-invalid-input',/질문/],[410,'unknown',/찾을 수/]]){
    const f=fixture();await openReview(f);await input(f);const submit=f.review('Execute').fire('click');await flush();
    f.answer(f.pending.shift(),{error,raw:'Bearer private https://private.invalid'},status);await submit;
    assert.match(f.review('Status').textContent,pattern);assert.doesNotMatch(f.review('Status').textContent,/Bearer|https|unknown/);assert.equal(f.review('Execute').disabled,error==='review-disabled'||status===403);assert.equal(f.timers.size,0);
  }
});
test('V450-U01 cancel aborts pending poll, admits one DELETE and suppresses its late running response',async()=>{
  const f=fixture();await openReview(f);await input(f);const submit=f.review('Execute').fire('click');await flush();f.answer(f.pending.shift(),job(),202);await submit;
  const poll=f.tick();await flush();const old=f.pending.shift();const cancel=f.review('Cancel').fire('click');await flush();await f.review('Cancel').fire('click');assert(old.options.signal.aborted);assert.equal(f.pending.length,1);
  const request=f.pending.shift();assert.equal(request.options.method,'DELETE');f.answer(request,job('cancelled',{error:'review-cancelled',canCancel:false}));await cancel;
  f.answer(old,job());await poll;assert.match(f.review('Status').textContent,/취소/);assert.equal(f.timers.size,0);assert(f.review('Cancel').disabled);
});
test('V450-U01 channel/page exit aborts local requests without cancelling the server job',async()=>{
  for(const page of [false,true]){
    const f=fixture();await openReview(f);await input(f);const status=f.review('Status');const submit=f.review('Execute').fire('click');await flush();const request=f.pending.shift();
    if(page)f.leave();else await f.el('Channel').fire('change');assert(request.options.signal.aborted);f.answer(request,job(),202);await submit;
    assert.equal(f.timers.size,0);assert.equal(f.pending.length,0);assert.equal(f.el('Detail').children.length,0);assert.doesNotMatch(status.textContent,/대기 중/);
  }
});
test('V450-U01 existing read-only results render safely and late result/list responses stay detached',async()=>{
  const f=fixture();await openReview(f,detail(),listData({canExecute:false,items:[{id:reviewId,question:'old',provider:'ollama',createdAtMs:1},{id:'https://private.invalid',question:'bad'}]}));
  assert.equal(f.review('Rows').children.length,1);const status=f.review('Status');const result=f.review('Result');const work=f.review('Rows').children[0].fire('click');await flush();const old=f.pending.shift();
  const refresh=f.review('Refresh').fire('click');await flush();const oldList=f.pending.shift();await f.el('Channel').fire('change');assert(old.options.signal.aborted&&oldList.options.signal.aborted);
  f.answer(old,{id:reviewId,packageId:id,question:'late',output:{supports:[],contradictions:[],questions:[],unclear:[],confidence:null}});f.answer(oldList,listData());await work;await refresh;
  assert.equal(result.children.length,0);assert.match(status.textContent,/실행 권한/);assert.equal(f.el('Detail').children.length,0);
});
test('V450-U01 failed jobs stop polling; unknown progress stays locked until an explicit recheck',async()=>{
  for(const error of ['review-timeout','review-invalid-output']){
    const f=fixture();await openReview(f);await input(f);const submit=f.review('Execute').fire('click');await flush();f.answer(f.pending.shift(),job(),202);await submit;
    const poll=f.tick();await flush();f.answer(f.pending.shift(),job('failed',{error,canCancel:false}));await poll;
    assert.match(f.review('Status').textContent,error==='review-timeout'?/제한 시간/:/검증/);assert.equal(f.timers.size,0);assert.equal(f.review('Execute').disabled,false);
  }
  const f=fixture();await openReview(f);await input(f);const submit=f.review('Execute').fire('click');await flush();f.answer(f.pending.shift(),job(),202);await submit;
  const poll=f.tick();await flush();f.answer(f.pending.shift(),{error:'unknown',raw:'private'},503);await poll;
  assert(f.review('Execute').disabled);assert.equal(f.timers.size,0);assert.match(f.review('Status').textContent,/다시 확인/);
  const refresh=f.review('Refresh').fire('click');await flush();assert.equal(f.pending.length,2);
  const requests=f.pending.splice(0);f.answer(requests.find(r=>r.url.includes('?')),listData());f.answer(requests.find(r=>r.url.includes('va-review-jobs')),job('cancelled',{error:'review-cancelled',canCancel:false}));await refresh;await flush();
  assert.equal(f.review('Execute').disabled,false);assert.match(f.review('Status').textContent,/취소/);
});
test('V450-U01 active timer is cleared on page exit and malformed IDs cannot become job URLs',async()=>{
  const f=fixture();await openReview(f);await input(f);const submit=f.review('Execute').fire('click');await flush();f.answer(f.pending.shift(),job(),202);await submit;
  assert.equal(f.timers.size,1);f.leave();assert.equal(f.timers.size,0);assert.equal(f.pending.length,0);
  const bad=fixture();await openReview(bad);await input(bad,'a');const work=bad.review('Execute').fire('click');await flush();bad.answer(bad.pending.shift(),job('running',{id:'https://private.invalid'}),202);await work;
  assert.equal(bad.timers.size,0);assert.equal(bad.pending.length,0);assert.match(bad.review('Status').textContent,/읽지 못/);
});

// V450-U02/R55-F1: 실제 제품 스크립트의 제어된 fetch/timer. 영상·HTTP 성공 대역이 아니다.
const aBase='/ops/api/recordings/a-record-reviews';
const aPack={id,canExecute:true,targetKey:'target',targetLabel:'분석 대상',analysisNamespace:'fixture',frames:[{index:0,ptsNs:10},{index:1,ptsNs:20}]};
const aDraft={id:'draft',revision:'r1',question:'새 검토',targetLabel:'대상',analysisNamespace:'fixture',engineEpisodes:[1],claims:[],limitation:'A 기록'};
const aRecord=question=>({question,targetLabel:'대상',analysisNamespace:'fixture',engineEpisodes:[1],confirmedBy:'fixture',confirmedAtMs:1,evidenceAvailability:'available',projectionStatus:'available',claims:[],decisions:[],materialRequests:{status:'not-needed',items:[],unsupportedClaims:[],rendererVersion:'1'}});
const aList={items:[{id:'past',question:'과거 결과'},{id:'older',question:'이전 결과'}]};
async function openA(f){await flush();const w=f.api.button('search',{snapshotId:'s',hitId:'h'},true).fire('click');await flush();f.answer(f.pending.shift(),{id,status:'complete'},201);await flush();f.answer(f.pending.shift(),aPack);await w;f.answer(f.pending.shift(),aList);await flush();f.a('Question').value='새 검토';await f.a('Question').fire('input');}
async function prepareA(f){const w=f.a('Prepare').fire('click');await flush();f.answer(f.pending.shift(),aDraft);await w;}
async function confirmA(f){const w=f.a('Confirm').fire('click');await flush();f.answer(f.pending.shift(),{});await w;}
async function executeA(f){await prepareA(f);await confirmA(f);const w=f.a('Execute').fire('click');await flush();f.answer(f.pending.shift(),job());await w;}
async function pastA(f,index=0){const w=f.a('Rows').children[index].fire('click');await flush();f.answer(f.pending.shift(),aRecord(index?'이전 결과':'과거 결과'));await w;}
test('V450-U02 R55-F1 past result during pending job GET keeps single polling and completion',async()=>{
  const f=fixture();await openA(f);await executeA(f);const p=f.tick();await flush();const held=f.pending.shift();
  await pastA(f);f.answer(held,job());await p;
  assert.equal(f.timers.size,1,'past-result lookup must not invalidate job polling');
  const refresh=f.a('Refresh').fire('click');await flush();assert.equal(f.pending.length,1,'refresh must not duplicate scheduled poll');f.answer(f.pending.shift(),aList);await refresh;
  const done=f.tick();await flush();f.answer(f.pending.shift(),job('completed',{reviewId:'new',canCancel:false}));await flush();
  f.answer(f.pending.shift(),aList);await done;assert.equal(f.timers.size,0);assert.equal(f.a('Question').disabled,false);
  assert.equal(f.a('Result').children[1].textContent,'과거 결과','selected history stays visible');assert.match(f.a('Status').textContent,/완료/);
});
test('V450-U02 history lookup does not invalidate pending prepare, confirm or execute',async()=>{
  for(const stage of ['Prepare','Confirm','Execute']){
    const f=fixture();await openA(f);if(stage!=='Prepare')await prepareA(f);if(stage==='Execute')await confirmA(f);
    const work=f.a(stage).fire('click');await flush();const held=f.pending.shift();await pastA(f);
    f.answer(held,stage==='Prepare'?aDraft:stage==='Confirm'?{}:job());await work;
    assert.equal(f.a(stage==='Prepare'?'Confirm':stage==='Confirm'?'Execute':'Cancel').disabled,false,stage);
    if(stage==='Execute')assert.equal(f.timers.size,1);
  }
});
test('V450-U02 late saved result and list cannot overwrite newer selection',async()=>{
  const f=fixture();await openA(f);const old=f.a('Rows').children[0].fire('click');await flush();const held=f.pending.shift();await pastA(f,1);
  f.answer(held,aRecord('오래된 늦은 응답'));await old;assert.equal(f.a('Result').children[1].textContent,'이전 결과');
  const refresh1=f.a('Refresh').fire('click');await flush();const list=f.pending.shift();const refresh2=f.a('Refresh').fire('click');await flush();f.answer(f.pending.shift(),aList);await refresh2;
  f.answer(list,{items:[]});await refresh1;assert.equal(f.a('Rows').children.length,2);
});
test('V450-U02 cancel aborts pending GET; late previous job cannot replace new job',async()=>{
  const f=fixture();await openA(f);await executeA(f);const p=f.tick();await flush();const held=f.pending.shift();
  const cancel=f.a('Cancel').fire('click');await flush();assert(held.options.signal.aborted);await f.a('Cancel').fire('click');assert.equal(f.pending.length,1);
  f.answer(f.pending.shift(),job('cancelled',{error:'review-cancelled',canCancel:false}));await cancel;assert.equal(f.timers.size,0);assert.equal(f.a('Question').disabled,false);
  await executeA(f);f.answer(held,job('completed',{reviewId:'old'}));await p;assert.equal(f.timers.size,1);assert.equal(f.a('Cancel').disabled,false);assert.equal(f.pending.length,0);
});
test('V450-U02 failed/cancelled jobs unlock controls while history stays visible',async()=>{
  for(const [state,error] of [['failed','review-write-failed'],['cancelled','review-cancelled']]){
    const f=fixture();await openA(f);await executeA(f);const p=f.tick();await flush();const held=f.pending.shift();await pastA(f);f.answer(held,job(state,{error,canCancel:false}));await p;
    assert.equal(f.timers.size,0);assert.equal(f.a('Question').disabled,false);assert.equal(f.a('Result').children[1].textContent,'과거 결과');assert.match(f.a('Status').textContent,/실패|취소/);
  }
});
test('V450-U02 completion wins cancellation without overwriting selected history',async()=>{
  const f=fixture();await openA(f);await executeA(f);await pastA(f);const w=f.a('Cancel').fire('click');await flush();f.answer(f.pending.shift(),job('completed',{reviewId:'new',canCancel:false}));await flush();f.answer(f.pending.shift(),aList);await w;
  assert.match(f.a('Status').textContent,/완료/);assert.equal(f.a('Result').children[1].textContent,'과거 결과');assert.equal(f.timers.size,0);assert.equal(f.a('Question').disabled,false);
});
test('V450-U02 progress retry has at most one GET and no extra timer',async()=>{
  const f=fixture();await openA(f);await executeA(f);let p=f.tick();await flush();f.answer(f.pending.shift(),{error:'temporary'},503);await p;assert.equal(f.timers.size,0);
  const r1=f.a('Refresh').fire('click');const r2=f.a('Refresh').fire('click');await flush();const pending=f.pending.splice(0);assert.equal(pending.filter(r=>r.url.includes('/jobs/')).length,1);
  for(const r of pending)f.answer(r,r.url.includes('/jobs/')?job():aList);await r1;await r2;await flush();assert.equal(f.timers.size,1);
});
test('V450-U02 permission error and panel exit stop in-flight and timers',async()=>{
  for(const mode of ['permission','channel','page']){
    const f=fixture();await openA(f);await executeA(f);const p=f.tick();await flush();const held=f.pending.shift();
    if(mode==='permission'){f.answer(held,{error:'review-forbidden'},403);await p;assert(f.a('Prepare').disabled);assert(f.a('Execute').disabled);}
    else {if(mode==='page')f.leave();else await f.el('Channel').fire('change');assert(held.options.signal.aborted);f.answer(held,job());await p;assert.equal(f.el('Detail').children.length,0);}
    assert.equal(f.timers.size,0);assert.equal(f.pending.length,0);
  }
});
test('V450-U02 changed specification still rejects late confirmation',async()=>{
  const f=fixture();await openA(f);await prepareA(f);const work=f.a('Confirm').fire('click');await flush();const held=f.pending.shift();f.a('Question').value='새 명세';await f.a('Question').fire('input');f.answer(held,{});await work;assert(f.a('Execute').disabled);assert.equal(f.a('Prepare').disabled,false);
});

test('V450-U02 permission revocation invalidates an in-flight confirmation',async()=>{
  const f=fixture();await openA(f);await prepareA(f);const confirmation=f.a('Confirm').fire('click');await flush();const held=f.pending.shift();
  const history=f.a('Rows').children[0].fire('click');await flush();f.answer(f.pending.shift(),{error:'review-forbidden'},403);await history;
  f.answer(held,{});await confirmation;assert(f.a('Confirm').disabled);assert(f.a('Execute').disabled);assert.equal(f.timers.size,0);
});
