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
  constructor(){this.value='';this.checked=false;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.selectedOptions=[{value:'1'}];this.options=[];this.duration=10;this.readyState=0;this.currentTime=0;}
  addEventListener(name,fn){const list=this.events.get(name)||[];list.push(fn);this.events.set(name,list);}
  fire(name){return Promise.all((this.events.get(name)||[]).map(fn=>fn({preventDefault(){}})));}
  setAttribute(name,value){this.attrs[name]=value;}
  getAttribute(name){return this.attrs[name]??null;}
  removeAttribute(name){delete this.attrs[name];}
  set src(value){this.attrs.src=value;this.readyState=0;}
  get src(){return this.attrs.src||'';}
  pause(){this.paused=true;}
  load(){}
  append(value){this.children.push(value);}
  replaceChildren(...values){this.children=values;this.options=values;}
  querySelectorAll(){return this.children;}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
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
  answer(newer,{playable:true,playbackUrl:'/ops/api/recordings/media/b',seekAvailable:true,targetSeconds:4});await b;
  answer(older,{playable:true,playbackUrl:'/ops/api/recordings/media/a',seekAvailable:true,targetSeconds:8});await a;
  assert.equal(el('opsSearchPlayer').src,'/ops/api/recordings/media/b');el('opsSearchPlayer').readyState=4;
  await el('opsSearchPlayer').fire('loadedmetadata');assert.equal(el('opsSearchPlayer').currentTime,4);
  await el('opsSearchForm').fire('input');el('opsSearchPlayer').currentTime=0;await el('opsSearchPlayer').fire('loadedmetadata');assert.equal(el('opsSearchPlayer').currentTime,0);assert.equal(el('opsSearchPlayer').src,'');
});
test('expired snapshot asks for new search and never loads a file',async()=>{
  const {el,pending,answer}=fixture();await flush();await el('opsSearchForm').fire('submit');answer(pending.shift(),page('s',[hit('a')]));await flush();
  const selected=el('opsSearchRows').children[0].fire('click');answer(pending.shift(),{},410);await selected;
  assert.match(el('opsSearchPlayback').textContent,/만료/);assert.equal(el('opsSearchPlayer').src,'');
});
