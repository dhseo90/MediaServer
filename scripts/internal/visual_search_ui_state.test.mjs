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
  dispatchEvent(event){return this.fire(event.type);}
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
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());elements.get(id).replaceHook=copy=>elements.set(id,copy);return elements.get(id);};const el=name=>get('opsVisual'+name);
  const pending=[];
  vm.runInNewContext(script,{evidenceUi:null,window:{location:{pathname:'/ops/events'}},document:{getElementById:get,createElement:()=>new Element()},URLSearchParams,Date,Number,BigInt,Error,Set,Event,fetch:url=>new Promise(resolve=>pending.push({url,resolve}))});
  const answer=(entry,data,status=200)=>entry.resolve({ok:status===200,status,json:async()=>Array.isArray(data.items)?{appliedQuery:appliedQuery(),index:publication(),refreshAtSearch:refreshState(),sampleSeconds:1,scanSeconds:60,...data}:data});
  answer(pending.shift(),{enabled:true,searchAvailable:true,state:'ready',index:publication(),refresh:refreshState(),sampleSeconds:10,scanSeconds:60,channels:[{channelId:'1',indexedFrames:3,examinedSegments:3,unsupportedSegments:0}]});
  el('Text').value='붉은 장면';el('Limit').value='20';el('Threshold').value='-1';
  return {el,get,pending,answer};
}
const publication=(generation=1)=>({instanceId:'worker-1',generation,publishedAtMs:1000,origin:'rebuild',channels:[{channelId:'1',indexedFrames:3,unknownTimeFrames:3,firstSampleTimeNs:null,lastSampleTimeNs:null}]});
const refreshState=()=>({attemptState:'succeeded',lastSuccessAtMs:1000,attemptStartedAtMs:900,attemptFinishedAtMs:1000});
const appliedQuery=()=>({text:'붉은 장면',encoderText:'붉은 장면',bodyTokens:5,maxBodyTokens:63,channelIds:['1'],startTimeMs:null,endTimeMs:null,threshold:-1,limit:20});
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


test('status refresh preserves results and their publication on success and error',async()=>{
  for(const code of [200,503]){
    const f=await results();const used=f.el('UsedIndex').textContent,applied=f.el('Applied').textContent;
    const work=f.el('Refresh').fire('click');assert.equal(f.el('Rows').children.length,2);
    f.answer(f.pending.shift(),{enabled:true,searchAvailable:true,state:'ready',index:publication(2),refresh:refreshState(),channels:[{channelId:'1'}]},code);await work;
    assert.equal(f.el('Rows').children.length,2);assert.equal(f.el('UsedIndex').textContent,used);assert.equal(f.el('Applied').textContent,applied);
    assert.match(f.el('Coverage').textContent,code===200?/세대 2/:/조회 실패/);
  }
});
test('failed refresh keeps old publication searchable without raw diagnostic',async()=>{
  const f=await results();const work=f.el('Refresh').fire('click');
  f.answer(f.pending.shift(),{enabled:true,searchAvailable:true,state:'degraded',index:publication(),refresh:{...refreshState(),attemptState:'failed',usingPreviousPublication:true,error:'private'},channels:[{channelId:'1'}]});await work;
  assert.equal(f.el('Submit').disabled,false);assert.match(f.el('Coverage').textContent,/최근 색인 갱신에 실패/);assert.match(f.el('Coverage').textContent,/이전 완성 색인/);assert.doesNotMatch(f.el('Coverage').textContent,/private/);
});
test('late status cannot replace current selection or result explanation',async()=>{
  const f=await results();const work=f.el('Refresh').fire('click'),pending=f.pending.shift();
  await f.el('Form').fire('input');const after=f.el('Coverage').textContent;
  f.answer(pending,{enabled:true,searchAvailable:true,channels:[{channelId:'else'}],index:publication(9)});await work;
  assert.equal(f.el('Coverage').textContent,after);assert.equal(f.el('UsedIndex').textContent,'');assert.equal(f.el('Channels').options[0].value,'1');
});
test('camera/time copy is explicit, preserves unique filters and rejects unavailable channel',async()=>{
  const f=await results(),target=n=>f.get('opsSearch'+n);target('Channels').options=[{value:'1',selected:false}];
  target('Object').value='person';target('Track').value='99';f.el('Text').value='붉은 장면';f.el('Start').value='2026-09-11T00:00';f.el('End').value='2026-09-11T01:00';
  let invalidated=0;target('Form').addEventListener('input',()=>++invalidated);await f.el('ToSearch').fire('click');
  assert.equal(invalidated,1);assert.equal(target('Start').value,f.el('Start').value);assert.equal(target('Object').value,'person');assert.equal(target('Track').value,'99');assert.equal(f.el('Text').value,'붉은 장면');assert.equal(target('Channels').options[0].selected,true);
  f.el('Channels').selectedOptions=[{value:'denied'}];await f.el('ToSearch').fire('click');assert.equal(invalidated,1);assert.match(f.el('Status').textContent,/같은 카메라/);
});

// 서버가 적용한 값만 표시하고 현재 편집 내용이나 늦은 응답으로 대체하지 않는다.
test('applied query renders server defaults, UTC and escaped text without duplicate prose',async()=>{
  const f=fixture();await flush();const work=f.el('Form').fire('submit');
  f.answer(f.pending.shift(),{items:[],appliedQuery:{...appliedQuery(),text:'<B>RED</B>',encoderText:'<b>red</b>',startTimeMs:1000,endTimeMs:2000,channelIds:['2'],limit:10,threshold:.25}});await work;
  const text=f.el('Applied').textContent;assert.match(text,/<B>RED<\/B>/);assert.match(text,/<b>red<\/b>/);assert.match(text,/1970-01-01T00:00:01.000Z/);assert.match(text,/카메라: 2/);assert.match(text,/최대 결과 수: 10/);assert.match(text,/최소 유사도: 0.25/);
  await f.el('Form').fire('change');assert.equal(f.el('Applied').textContent,'');
  const next=f.el('Form').fire('submit');f.answer(f.pending.shift(),{items:[]});await next;
  assert.equal(f.el('Applied').textContent.split('붉은 장면').length-1,1);
  const before=f.el('Applied').textContent;const refresh=f.el('Refresh').fire('click');assert.equal(f.el('Applied').textContent,before);f.answer(f.pending.shift(),{},503);await refresh;
});
test('token rejection explains no truncation and permits a corrected search',async()=>{
  const f=await results();const work=f.el('Form').fire('submit');assert.equal(f.el('Applied').textContent,'');
  f.answer(f.pending.shift(),{error:'visual-text-token-limit'},400);await work;
  assert.match(f.el('Status').textContent,/63토큰/);assert.match(f.el('Status').textContent,/줄여/);assert.equal(f.el('Rows').children.length,0);assert.equal(f.el('Submit').disabled,false);
  const retry=f.el('Form').fire('submit');f.answer(f.pending.shift(),{items:[item('corrected')]});await retry;assert.equal(f.el('Rows').children.length,1);assert.match(f.el('Applied').textContent,/본문 토큰: 5\/63/);
});
test('late response cannot restore applied query after an edit',async()=>{
  const f=fixture();await flush();const work=f.el('Form').fire('submit');const pending=f.pending.shift();await f.el('Form').fire('input');
  f.answer(pending,{items:[item('stale')]});await work;assert.equal(f.el('Applied').textContent,'');assert.equal(f.el('Rows').children.length,0);
});
