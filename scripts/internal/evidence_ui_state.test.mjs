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
  constructor(tag='div'){this.tag=tag;this.children=[];this.events=new Map();this.value='1';this.style={};this.textContent='';this.disabled=false;this.attrs={};}
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
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const id='ep-'+'a'.repeat(64);
function fixture(){
  const elements=new Map(),pending=[];
  const el=name=>{const key=name.startsWith('opsEvidence')?name:'opsEvidence'+name;if(!elements.has(key))elements.set(key,new Element());return elements.get(key);};
  const context={window:{location:{pathname:'/ops/events'}},document:{getElementById:el,createElement:tag=>new Element(tag)},
    URLSearchParams,Date,Error,fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))};
  vm.runInNewContext(source.slice(start,end)+'\nglobalThis.evidenceTest=evidenceUi;',context);
  const answer=(request,data,status=200)=>request.resolve({ok:status>=200&&status<300,status,json:async()=>data});
  answer(pending.shift(),{channels:[{channelId:'1',displayName:'Camera'}]});
  return {el,pending,answer,api:context.evidenceTest};
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
