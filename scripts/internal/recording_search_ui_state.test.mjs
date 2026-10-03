// 파일 용도: 실제 UI script의 비동기 응답 순서를 제어해 stale 검색/seek 차단을 검증한다.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=fs.readFileSync(new URL('../../src/ingress/product_ui_page_scripts.cpp',import.meta.url),'utf8');
const start=source.indexOf("        if (window.location.pathname === '/ops/events' && document.getElementById('opsSearchForm')) {");
const end=source.indexOf("        document.getElementById('eventRecordsEvidenceSelect')",start);
assert(start>=0&&end>start);
const script=source.slice(start,end);
class Element {
  constructor(){this.value='';this.checked=false;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.selectedOptions=[{value:'1'}];this.options=[];this.duration=10;this.readyState=0;this.currentTime=0;this.seeking=false;this.error=null;}
  addEventListener(name,fn){const list=this.events.get(name)||[];list.push(fn);this.events.set(name,list);}
  fire(name){return Promise.all((this.events.get(name)||[]).map(fn=>fn({preventDefault(){}})));}
  setAttribute(name,value){this.attrs[name]=value;}
  getAttribute(name){return this.attrs[name]??null;}
  removeAttribute(name){delete this.attrs[name];}
  set src(value){this.attrs.src=value;this.readyState=0;}
  get src(){return this.attrs.src||'';}
  cloneNode(){const copy=new Element();copy.replaceHook=this.replaceHook;return copy;}
  replaceWith(copy){this.replaceHook(copy);}
  pause(){this.paused=true;}
  load(){}
  append(value){this.children.push(value);}
  replaceChildren(...values){this.children=values;this.options=values;}
  querySelectorAll(){return this.children;}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,new Element());elements.get(id).replaceHook=copy=>elements.set(id,copy);return elements.get(id);};
  const pending=[];
  const context={window:{location:{pathname:'/ops/events'}},document:{getElementById:el,createElement:()=>new Element()},URLSearchParams,Date,Number,BigInt,Error,fetch:url=>new Promise(resolve=>pending.push({url,resolve}))};
  vm.runInNewContext(script,context);
  const answer=(entry,data,status=200)=>entry.resolve({ok:status===200,status,json:async()=>data});
  answer(pending.shift(),{channels:[{channelId:'1'}]});
  el('opsSearchStart').value='2026-09-11T00:00';el('opsSearchEnd').value='2026-09-11T01:00';el('opsSearchLimit').value='20';
  return {el,pending,answer};
}
const hit=id=>({id,channelId:'1',kind:'recording',startTimeNs:'1789084800000000000',endTimeNs:'1789084801000000000',playable:true,selectionReason:'original'});
const page=(id,items)=>({snapshotId:id,items,knownCount:items.length,unplacedCount:0,nextCursor:null});
test('late search response cannot replace newer query or revive invalidated results',async()=>{
  const {el,pending,answer}=fixture();await flush();
  await el('opsSearchForm').fire('submit');const old=pending.shift();
  el('opsSearchObject').value='person';await el('opsSearchForm').fire('input');
  await el('opsSearchForm').fire('submit');const current=pending.shift();
  answer(current,page('new',[hit('new-hit')]));await flush();
  answer(old,page('old',[hit('old-hit')]));await flush();
  assert.equal(el('opsSearchRows').children[0].dataset.hit,'new-hit');
  await el('opsSearchForm').fire('input');assert.equal(el('opsSearchRows').children.length,0);assert.equal(el('opsSearchPlayer').src,'');
});
test('late seek and metadata cannot move a newer selected file',async()=>{
  const {el,pending,answer}=fixture();await flush();await el('opsSearchForm').fire('submit');answer(pending.shift(),page('s',[hit('a'),hit('b')]));await flush();
  const a=el('opsSearchRows').children[0].fire('click');const older=pending.shift();
  const b=el('opsSearchRows').children[1].fire('click');const newer=pending.shift();
  answer(newer,{playable:true,playbackUrl:'/ops/api/recordings/media/b',seekAvailable:true,targetSeconds:4,frameDurationSeconds:1/30});await b;
  answer(older,{playable:true,playbackUrl:'/ops/api/recordings/media/a',seekAvailable:true,targetSeconds:8,frameDurationSeconds:1/30});await a;
  assert.equal(el('opsSearchPlayer').src,'/ops/api/recordings/media/b');el('opsSearchPlayer').readyState=4;
  await el('opsSearchPlayer').fire('loadedmetadata');assert.equal(el('opsSearchPlayer').currentTime,4);
  await el('opsSearchForm').fire('input');el('opsSearchPlayer').currentTime=0;await el('opsSearchPlayer').fire('loadedmetadata');assert.equal(el('opsSearchPlayer').currentTime,0);assert.equal(el('opsSearchPlayer').src,'');
});
test('expired snapshot asks for new search and never loads a file',async()=>{
  const {el,pending,answer}=fixture();await flush();await el('opsSearchForm').fire('submit');answer(pending.shift(),page('s',[hit('a')]));await flush();
  const selected=el('opsSearchRows').children[0].fire('click');answer(pending.shift(),{},410);await selected;
  assert.match(el('opsSearchPlayback').textContent,/만료/);assert.equal(el('opsSearchPlayer').src,'');
});

test('setting currentTime is seeking, only current media completion succeeds',async()=>{
  const {el,pending,answer}=fixture();await flush();await el('opsSearchForm').fire('submit');answer(pending.shift(),page('s',[hit('a')]));await flush();
  const selected=el('opsSearchRows').children[0].fire('click');
  answer(pending.shift(),{playable:true,playbackUrl:'/ops/api/recordings/media/a',seekAvailable:true,targetSeconds:4,frameDurationSeconds:1/30});await selected;
  const player=el('opsSearchPlayer');player.readyState=4;player.seeking=true;
  await player.fire('loadedmetadata');assert.match(el('opsSearchPlayback').textContent,/탐색 중/);
  player.seeking=false;await player.fire('seeked');assert.match(el('opsSearchPlayback').textContent,/이동했습니다/);
});

async function selectedFixture(target=4,available=true){
  const f=fixture();await flush();await f.el('opsSearchForm').fire('submit');f.answer(f.pending.shift(),page('s',[hit('a'),hit('b')]));await flush();
  f.choose=async(index,seconds=target,seekAvailable=available)=>{const task=f.el('opsSearchRows').children[index].fire('click');f.answer(f.pending.shift(),{playable:true,playbackUrl:'/ops/api/recordings/media/same',seekAvailable,targetSeconds:seconds,frameDurationSeconds:1/30});await task;return f.el('opsSearchPlayer');};
  return f;
}
test('same URL new selection rejects old metadata seeked and error events',async()=>{
  const f=await selectedFixture();const old=await f.choose(0);old.readyState=4;old.seeking=true;await old.fire('loadedmetadata');
  const current=await f.choose(1,6);assert.notEqual(old,current);current.readyState=4;current.seeking=true;await current.fire('loadedmetadata');
  old.currentTime=4;old.seeking=false;old.error={code:3};await old.fire('loadedmetadata');await old.fire('seeked');await old.fire('error');
  assert.equal(current.currentTime,6);assert.match(f.el('opsSearchPlayback').textContent,/탐색 중/);
  current.seeking=false;await current.fire('seeked');assert.match(f.el('opsSearchPlayback').textContent,/이동했습니다/);
  await f.el('opsSearchForm').fire('input');const text=f.el('opsSearchPlayback').textContent;
  current.error={code:3};await current.fire('seeked');await current.fire('error');assert.equal(f.el('opsSearchPlayback').textContent,text);
});
test('completion requires data, no pending seek, no media error, and target within frame tolerance',async()=>{
  const f=await selectedFixture();const p=await f.choose(0);p.readyState=1;p.seeking=true;await p.fire('loadedmetadata');
  await p.fire('seeked');assert.match(f.el('opsSearchPlayback').textContent,/탐색 중/);
  p.readyState=4;p.seeking=false;p.currentTime=3;await p.fire('seeked');assert.match(f.el('opsSearchPlayback').textContent,/완료하지 못/);
});
test('same current position waits for current data without needing seeked',async()=>{
  const f=await selectedFixture();const p=await f.choose(0,0);p.readyState=1;await p.fire('loadedmetadata');assert.match(f.el('opsSearchPlayback').textContent,/탐색 중/);
  p.readyState=2;await p.fire('loadeddata');assert.match(f.el('opsSearchPlayback').textContent,/이동했습니다/);
});
test('bounds invalid response unsupported position and media failure remain distinct',async()=>{
  const f=await selectedFixture();let p=await f.choose(0,11);p.readyState=4;await p.fire('loadedmetadata');assert.match(f.el('opsSearchPlayback').textContent,/범위/);
  p=await f.choose(0,-1);assert.match(f.el('opsSearchPlayback').textContent,/올바르지/);assert.equal(p.src,'');
  p=await f.choose(0,0,false);p.readyState=4;await p.fire('loadedmetadata');assert.match(f.el('opsSearchPlayback').textContent,/파일 시작/);
  p.error={code:3};await p.fire('error');assert.match(f.el('opsSearchPlayback').textContent,/읽지 못/);
});
test('incomplete evidence is not empty success',async()=>{
  const f=fixture();await flush();await f.el('opsSearchForm').fire('submit');f.answer(f.pending.shift(),{error:'search-event-evidence-incomplete'},503);await flush();
  assert.match(f.el('opsSearchStatus').textContent,/근거가 부족/);assert.doesNotMatch(f.el('opsSearchStatus').textContent,/일치하는 결과가 없/);assert.equal(f.el('opsSearchRows').children.length,0);
});

test('seeked before current data stays pending until loadeddata',async()=>{
  const f=await selectedFixture();const p=await f.choose(0);p.readyState=1;await p.fire('loadedmetadata');
  p.seeking=false;await p.fire('seeked');assert.match(f.el('opsSearchPlayback').textContent,/탐색 중/);
  p.readyState=2;await p.fire('loadeddata');assert.match(f.el('opsSearchPlayback').textContent,/이동했습니다/);
});
