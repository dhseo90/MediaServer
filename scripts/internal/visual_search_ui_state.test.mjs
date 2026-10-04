// 파일 용도: 영상 검색의 실제 UI script에서 비동기 경계·현재 재생 판정을 검증한다.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=fs.readFileSync(new URL('../../src/ingress/product_ui_page_scripts.cpp',import.meta.url),'utf8');
const start=source.indexOf("        if (window.location.pathname === '/ops/events' && document.getElementById('opsVisualForm')) {");
const end=source.indexOf("        document.getElementById('eventRecordsEvidenceSelect')",start);
assert(start>=0&&end>start);
const script=source.slice(start,end);
class Element {
  constructor(){this.value='';this.checked=false;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.selectedOptions=[{value:'1'}];this.options=[];this.duration=10;this.readyState=0;this.currentTime=0;this.seeking=false;this.error=null;this.paused=true;}
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
  const elements=new Map();const el=name=>{const id='opsVisual'+name;if(!elements.has(id))elements.set(id,new Element());elements.get(id).replaceHook=copy=>elements.set(id,copy);return elements.get(id);};
  const pending=[];
  vm.runInNewContext(script,{evidenceUi:null,window:{location:{pathname:'/ops/events'}},document:{getElementById:id=>el(id.slice(9)),createElement:()=>new Element()},URLSearchParams,Date,Number,BigInt,Error,Set,fetch:url=>new Promise(resolve=>pending.push({url,resolve}))});
  const answer=(entry,data,status=200)=>entry.resolve({ok:status===200,status,json:async()=>data});
  answer(pending.shift(),{enabled:true,searchAvailable:true,state:'ready',sampleSeconds:10,scanSeconds:60,channels:[{channelId:'1',indexedFrames:3,examinedSegments:3,unsupportedSegments:0}]});
  el('Text').value='붉은 장면';el('Limit').value='20';el('Threshold').value='-1';
  return {el,pending,answer};
}
const item=id=>({id,channelId:'1',timeNs:null,score:.12});
async function results(){const f=fixture();await flush();const work=f.el('Form').fire('submit');f.answer(f.pending.shift(),{items:[item('a'),item('b')]});await work;return f;}
test('late query cannot revive results after changed input',async()=>{
  const f=fixture();await flush();const older=f.el('Form').fire('submit');const old=f.pending.shift();
  await f.el('Form').fire('input');const newer=f.el('Form').fire('submit');const current=f.pending.shift();
  f.answer(current,{items:[item('current')]});await newer;f.answer(old,{items:[item('old'),item('old2')]});await older;
  assert.equal(f.el('Rows').children.length,1);await f.el('Form').fire('input');assert.equal(f.el('Rows').children.length,0);assert.equal(f.el('Player').src,'');
});
test('late selection and old media events cannot change current player',async()=>{
  const f=await results();f.el('Rows').children[0].fire('click');const old=f.pending.shift();
  f.el('Rows').children[1].fire('click');const current=f.pending.shift();
  f.answer(current,{playable:true,seekAvailable:true,playbackUrl:'/ops/api/recordings/media/b',targetSeconds:4,frameDurationSeconds:1/30});await flush();
  const player=f.el('Player');f.answer(old,{playable:true,seekAvailable:true,playbackUrl:'/ops/api/recordings/media/a',targetSeconds:8,frameDurationSeconds:1/30});await flush();
  assert.equal(player.src,'/ops/api/recordings/media/b');player.readyState=1;player.seeking=true;await player.fire('loadedmetadata');assert.equal(player.currentTime,4);
  assert.doesNotMatch(f.el('Playback').textContent,/이동했습니다/);player.readyState=4;player.seeking=false;await player.fire('seeked');assert.match(f.el('Playback').textContent,/이동했습니다/);
  await f.el('Form').fire('input');const text=f.el('Playback').textContent;player.error={code:3};await player.fire('error');await player.fire('seeked');assert.equal(f.el('Playback').textContent,text);assert.equal(f.el('Player').src,'');
});
test('permission and removed source errors never load media',async()=>{
  for(const code of [403,410,503]){const f=await results();f.el('Rows').children[0].fire('click');f.answer(f.pending.shift(),{},code);await flush();assert.equal(f.el('Player').src,'');assert.doesNotMatch(f.el('Playback').textContent,/이동했습니다/);}
});
test('unsafe playback URL and invalid seek time are rejected',async()=>{
  for(const override of [{playbackUrl:'https://outside.invalid/video'},{targetSeconds:-1},{frameDurationSeconds:0}]){
    const f=await results();f.el('Rows').children[0].fire('click');f.answer(f.pending.shift(),{playable:true,seekAvailable:true,playbackUrl:'/ops/api/recordings/media/a',targetSeconds:4,frameDurationSeconds:1/30,...override});await flush();assert.equal(f.el('Player').src,'');
  }
});
test('same current position waits for decoded data and later manual seeking preserves completion',async()=>{
  const f=await results();f.el('Rows').children[0].fire('click');f.answer(f.pending.shift(),{playable:true,seekAvailable:true,playbackUrl:'/ops/api/recordings/media/a',targetSeconds:0,frameDurationSeconds:1/30});await flush();
  const p=f.el('Player');p.readyState=1;await p.fire('loadedmetadata');assert.doesNotMatch(f.el('Playback').textContent,/이동했습니다/);
  p.readyState=2;await p.fire('loadeddata');assert.match(f.el('Playback').textContent,/이동했습니다/);
  p.currentTime=2;await p.fire('seeked');assert.match(f.el('Playback').textContent,/이동했습니다/);
});
test('empty results and disabled state are distinguished',async()=>{
  const f=fixture();await flush();const request=f.el('Form').fire('submit');f.answer(f.pending.shift(),{items:[]});await request;assert.match(f.el('Status').textContent,/없습니다/);
  const refresh=f.el('Refresh').fire('click');f.answer(f.pending.shift(),{enabled:false,state:'disabled',channels:[]});await refresh;assert.equal(f.el('Submit').disabled,true);assert.match(f.el('Coverage').textContent,/비활성/);
});

test('first completed seek outside frame tolerance is rejected',async()=>{
  const f=await results();f.el('Rows').children[0].fire('click');f.answer(f.pending.shift(),{playable:true,seekAvailable:true,playbackUrl:'/ops/api/recordings/media/a',targetSeconds:4,frameDurationSeconds:1/30});await flush();
  const p=f.el('Player');p.readyState=1;await p.fire('loadedmetadata');p.currentTime=2;p.readyState=4;await p.fire('seeked');assert.match(f.el('Playback').textContent,/이동하지 못/);
});


test('refresh clears previous result count during pending, success and failure',async()=>{
  for(const code of [200,503]){
    const f=await results();assert.match(f.el('Status').textContent,/2개/);
    const refresh=f.el('Refresh').fire('click');
    assert.equal(f.el('Rows').children.length,0);assert.doesNotMatch(f.el('Status').textContent,/2개/);
    f.answer(f.pending.shift(),{enabled:true,searchAvailable:true,state:'ready',sampleSeconds:1,scanSeconds:1,channels:[]},code);
    await refresh;assert.doesNotMatch(f.el('Status').textContent,/2개/);
    assert.match(f.el('Status').textContent,code===200?/다시 검색/:/못했습니다/);
  }
});
