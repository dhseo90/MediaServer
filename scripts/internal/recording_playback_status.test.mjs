// 파일 용도: I31-R01/R02 녹화 재생 상태 초기화와 늦은 메타데이터 이벤트를 실제 제품 스크립트로 검증한다.
// 실행 전 명세: 조회 실패/빈 목록/재생 불가 선택의 이전 지원 문구 제거, 무선택 metadata 무시, 정상 metadata/error 유지.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../../src/ingress/product_ui_page_scripts.cpp', import.meta.url), 'utf8');
const start = "        if (window.location.pathname === '/ops/events' && document.getElementById('opsRecordingFilterForm')) {";
const end = "        document.getElementById('eventRecordsEvidenceSelect')";
assert.equal(source.split(start).length, 2);
const block = source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
assert(block.endsWith('        }\n'));
class Element {
  value = ''; textContent = ''; children = []; listeners = {}; paused = true; checked = false;
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  emit(name) { for (const callback of this.listeners[name] || []) callback({preventDefault(){}}); }
  replaceChildren(...children) { this.children = children; if (children.length && children[0].value) this.value = children[0].value; }
  append(child) { this.children.push(child); }
  setAttribute(name,value) { this[name] = value; }
  getAttribute(name) { return this[name] ?? null; }
  removeAttribute(name) { delete this[name]; }
  pause() { this.paused = true; }
  load() {}
  canPlayType() { return 'probably'; }
}
const playable = {segmentId:'event-one',kind:'event',eventId:'one',playable:true,contentType:'video/mp4',playbackUrl:'/ops/api/recordings/media/event-one',completeness:'complete',startTimeMs:1000,endTimeMs:2000};
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
async function fixture() {
  const elements = new Map();
  const field = id => { if(!elements.has(id)) elements.set(id,new Element()); return elements.get(id); };
  let response = {items:[playable],total:1}, failed = false;
  vm.runInNewContext(block, {window:{location:{pathname:'/ops/events'}},document:{getElementById:field,createElement:()=>new Element()},Date,Number,Set,URLSearchParams,
    setText:(id,text)=>{field(id).textContent=text;},renderBadges:()=>{},
    requestJson:async route=>{if(route.endsWith('/status'))return {channels:[{channelId:'1'}]};if(failed)throw Error('controlled failure');return response;}});
  await flush();
  return {field,async reload(items,error=false){response={items,total:items.length};failed=error;field('opsRecordingFilterForm').emit('submit');await flush();}};
}
let pass=0,fail=0;
const started=Date.now();
async function check(name,fn){try{await fn();pass++;console.log(`PASS ${name}`);}catch{fail++;console.log(`FAIL ${name}`);}}
const support=f=>f.field('opsRecordingPlaybackSupport').textContent;
const loaded=f=>f.field('opsRecordingPlayer').emit('loadedmetadata');
const resetState=f=>{assert.equal(f.field('opsRecordingPlayer').getAttribute('src'),null);assert.equal(f.field('opsRecordingPlayer').paused,true);assert.equal(f.field('opsRecordingKindBadge').textContent,'선택 없음');assert(!support(f).includes('메타데이터 로드 완료'));};
await check('normal selected metadata updates visible support',async()=>{const f=await fixture();loaded(f);assert(support(f).includes('메타데이터 로드 완료'));assert.equal(f.field('opsRecordingPlayer').src,playable.playbackUrl);});
await check('I31-R01 failed timeline clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([],true);resetState(f);assert(f.field('opsRecordingListStatus').textContent.includes('불러오지 못했습니다'));});
await check('I31-R01 empty timeline clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([]);resetState(f);assert(f.field('opsRecordingListStatus').textContent.includes('데이터가 없습니다'));});
await check('I31-R01 unplayable selection clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([{...playable,segmentId:'missing',playable:false,playbackUrl:''}]);f.field('opsRecordingTimelineRows').children[0].emit('click');assert.equal(f.field('opsRecordingPlayer').getAttribute('src'),null);assert(!support(f).includes('메타데이터 로드 완료'));assert(f.field('opsRecordingPlaybackStatus').textContent.includes('재생할 수 없습니다'));});
await check('I31-R02 late metadata cannot contaminate unselected state',async()=>{const f=await fixture();await f.reload([]);const before=support(f);loaded(f);assert.equal(support(f),before);});
await check('unselected error preserves selection prompt',async()=>{const f=await fixture();await f.reload([]);f.field('opsRecordingPlayer').emit('error');assert.equal(f.field('opsRecordingPlaybackStatus').textContent,'재생할 구간을 선택하세요.');});
await check('selected media error shows failure notice',async()=>{const f=await fixture();f.field('opsRecordingPlayer').emit('error');assert(f.field('opsRecordingPlaybackStatus').textContent.includes('재생 실패'));});
console.log(JSON.stringify({pass,fail,elapsedMs:Date.now()-started,actualBrowser:false,tempArtifacts:0}));
process.exitCode=fail?1:0;
