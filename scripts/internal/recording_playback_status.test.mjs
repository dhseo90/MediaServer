// 파일 용도: 녹화 공개 DTO 소비와 기존 재생 상태 초기화를 실제 제품 스크립트로 검사한다.
// 실제 브라우저가 아니며 실행 전 정의는 s10-public-consumption/C-definition.md다.
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
const playable = {itemId:'event-item-one',segmentId:'event-one',channelId:'1',kind:'event',eventId:'one',referenceId:'ref-one',jobId:'job-one',jobState:'complete',catalogState:'finalized',playable:true,contentType:'video/mp4',playbackUrl:'/ops/api/recordings/media/event-one',completeness:'complete',startTimeMs:'1000',endTimeMs:'2000',rangeBasis:'source-utc-mapping',requestedRange:{timeBasis:'media-pts-ms',startTimeMs:'7000',endTimeMs:'8500',preMs:'0',postMs:'0'},actualRange:null,utcRange:{startNs:'1000000000',endNs:'2000000000',provenance:'source-utc-mapping',mappingProvenance:'estimated',mappingId:'map-one',uncertaintyNs:'1000000'},mediaRange:{timeBasis:'output-file-pts',startPts:'0',endPts:'1000000000',timeBaseNum:'1',timeBaseDen:'1000000000'},orderSequence:'9007199254740993',hideByEvent:false,supersededByEventIds:[],eventOverlaps:[],unavailableReason:''};
const original = {...playable,itemId:'source-item',segmentId:'source-one',kind:'continuous',eventId:'',referenceId:'',jobId:'',jobState:'',rangeBasis:'segment',playbackUrl:'/ops/api/recordings/media/source-one',requestedRange:null};
const result = (items,unplacedItems=[],total=items.length,unplacedTotal=unplacedItems.length)=>({items,unplacedItems,total,unplacedTotal,offset:0,limit:100});
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
async function fixture(initial=result([playable]),typeSupport='probably') {
  const elements = new Map();
  const field = id => { if(!elements.has(id)) elements.set(id,new Element()); return elements.get(id); };
  let response = initial, failed = false, deferred = null;
  const routes=[];field('opsRecordingPlayer').canPlayType=()=>typeSupport;
  vm.runInNewContext(block, {window:{location:{pathname:'/ops/events'}},document:{getElementById:field,createElement:()=>new Element()},Date,Number,Set,URLSearchParams,
    setText:(id,text)=>{field(id).textContent=text;},renderBadges:()=>{},
    requestJson:async route=>{if(route.endsWith('/status'))return {channels:[{channelId:'1'}]};routes.push(route);if(failed)throw Error('controlled failure');if(deferred){const value=deferred;deferred=null;return value;}return response;}});
  await flush();
  return {field,routes,async reload(items,error=false){response=result(items);failed=error;field('opsRecordingFilterForm').emit('submit');await flush();},async respond(value){response=value;failed=false;field('opsRecordingFilterForm').emit('submit');await flush();},holdNext(){let resolve;deferred=new Promise(done=>{resolve=done;});field('opsRecordingFilterForm').emit('submit');return async value=>{resolve(value);await flush();};}};
}
let pass=0,fail=0;
const started=Date.now();
async function check(name,fn){try{await fn();pass++;console.log(`PASS ${name}`);}catch(error){fail++;console.log(`FAIL ${name}: ${error.message}`);}}
const support=f=>f.field('opsRecordingPlaybackSupport').textContent;
const loaded=f=>f.field('opsRecordingPlayer').emit('loadedmetadata');
const resetState=f=>{assert.equal(f.field('opsRecordingPlayer').getAttribute('src'),null);assert.equal(f.field('opsRecordingPlayer').paused,true);assert.equal(f.field('opsRecordingKindBadge').textContent,'선택 없음');assert(!support(f).includes('메타데이터 로드 완료'));};
await check('normal selected metadata updates visible support',async()=>{const f=await fixture();loaded(f);assert(support(f).includes('메타데이터 로드 완료'));assert.equal(f.field('opsRecordingPlayer').src,playable.playbackUrl);});
await check('I31-R01 failed timeline clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([],true);resetState(f);assert(f.field('opsRecordingListStatus').textContent.includes('불러오지 못했습니다'));});
await check('I31-R01 empty timeline clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([]);resetState(f);assert(f.field('opsRecordingListStatus').textContent.includes('데이터가 없습니다'));});
await check('I31-R01 unplayable selection clears previous support',async()=>{const f=await fixture();loaded(f);await f.reload([{...playable,itemId:'missing-item',segmentId:'missing',playable:false,playbackUrl:''}]);f.field('opsRecordingTimelineRows').children[0].emit('click');assert.equal(f.field('opsRecordingPlayer').getAttribute('src'),null);assert(!support(f).includes('메타데이터 로드 완료'));assert(f.field('opsRecordingPlaybackStatus').textContent.includes('재생할 수 없습니다'));});
await check('I31-R02 late metadata cannot contaminate unselected state',async()=>{const f=await fixture();await f.reload([]);const before=support(f);loaded(f);assert.equal(support(f),before);});
await check('unselected error preserves selection prompt',async()=>{const f=await fixture();await f.reload([]);f.field('opsRecordingPlayer').emit('error');assert.equal(f.field('opsRecordingPlaybackStatus').textContent,'재생할 구간을 선택하세요.');});
await check('selected media error shows failure notice',async()=>{const f=await fixture();f.field('opsRecordingPlayer').emit('error');assert(f.field('opsRecordingPlaybackStatus').textContent.includes('재생 실패'));});
const rows=f=>f.field('opsRecordingTimelineRows').children;
const unknownRows=f=>f.field('opsRecordingUnplacedRows').children;
const labels=list=>list.map(row=>row.textContent).join(' ');
await check('D3C-01 UTC zero is a date, not unknown',async()=>{const f=await fixture(result([{...playable,startTimeMs:'0',endTimeMs:'1000'}]));assert(labels(rows(f)).includes(new Date(0).toLocaleString()));assert(!labels(rows(f)).includes('시간 미확인'));});
await check('D3C-02 null times stay in separate unplaced list',async()=>{const f=await fixture(result([],[{...playable,startTimeMs:null,endTimeMs:null,utcRange:null}]));assert.equal(rows(f).length,0);assert.equal(unknownRows(f).length,1);assert(labels(unknownRows(f)).includes('시간 미확인'));assert(!labels(unknownRows(f)).includes('1970'));assert(f.field('opsRecordingUnplacedStatus').textContent.includes('조회 시간에 속한다는 의미가 아닙니다'));});
for(const [name,value] of [['number',1000],['empty',''],['fraction','1.5'],['date-range','8640000000000001'],['unsafe','9007199254740993']])await check(`D3C-03 ${name} is not guessed as a date`,async()=>{const f=await fixture(result([{...playable,startTimeMs:value,endTimeMs:value}]));assert(labels(rows(f)).includes('시간 미확인'));assert(!labels(rows(f)).includes('Invalid Date'));});
await check('D3C-04 same file rows have independent selected item IDs',async()=>{const f=await fixture(result([playable,{...playable,itemId:'event-item-two'}]));rows(f)[1].emit('click');assert.equal(rows(f)[0].getAttribute('aria-pressed'),'false');assert.equal(rows(f)[1].getAttribute('aria-pressed'),'true');});
await check('D3C-05 partial overlap preserves original',async()=>{const f=await fixture(result([playable,{...original,supersededByEventIds:['one'],eventOverlaps:[{itemId:playable.itemId,timeBasis:'source-media-ns',startNs:'1',endNs:'2'}]}]));assert.equal(rows(f).length,2);assert(labels(rows(f)).includes('부분 중첩'));rows(f)[1].emit('click');assert(f.field('opsRecordingCompleteness').textContent.includes('원본 미디어 중첩: 1 ~ 2 ns'));});
await check('D3C-06 off-page event still hides fully covered original',async()=>{const f=await fixture(result([{...original,hideByEvent:true,supersededByEventIds:['outside-page']}],[],2));assert.equal(rows(f).length,0);assert(f.field('opsRecordingListStatus').textContent.includes('원본 보기'));});
await check('D3C-07 original view restores hidden rows',async()=>{const f=await fixture(result([{...original,hideByEvent:true}]));f.field('opsRecordingOriginalView').checked=true;f.field('opsRecordingOriginalView').emit('change');assert.equal(rows(f).length,1);f.field('opsRecordingOriginalView').checked=false;f.field('opsRecordingOriginalView').emit('change');assert.equal(rows(f).length,0);});
await check('D3C-08 next page uses independent unknown total',async()=>{const f=await fixture(result([playable],[{...original,startTimeMs:null,endTimeMs:null,utcRange:null}],1,101));assert.equal(f.field('opsRecordingNext').disabled,false);f.field('opsRecordingNext').emit('click');await flush();assert(f.routes.at(-1).includes('offset=100'));assert.equal(f.field('opsRecordingPrevious').disabled,false);f.field('opsRecordingPrevious').emit('click');await flush();assert(f.routes.at(-1).includes('offset=0'));});
await check('D3C-09 request media axis is shown without date conversion',async()=>{const f=await fixture();const text=f.field('opsRecordingCompleteness').textContent;assert(text.includes('원본 미디어'));assert(text.includes('7000'));assert(text.includes('8500'));});
await check('D3C-10 estimated UTC preserves uncertainty label',async()=>{const f=await fixture();assert(labels(rows(f)).includes('추정 시각'));assert(labels(rows(f)).includes('1000000 ns'));});
await check('D3C-11 selection never seeks by UTC and ended never auto-advances',async()=>{const f=await fixture(result([playable,{...playable,itemId:'second',segmentId:'second',playbackUrl:'/ops/api/recordings/media/second'}]));const player=f.field('opsRecordingPlayer');let writes=0;Object.defineProperty(player,'currentTime',{set(){writes++;}});rows(f)[1].emit('click');assert.equal(writes,0);assert(f.field('opsRecordingPlaybackStatus').textContent.includes('파일 시작'));player.emit('ended');assert.equal(player.src,'/ops/api/recordings/media/second');assert.equal(rows(f)[1].getAttribute('aria-pressed'),'true');});
await check('D3C-12 unsupported type is only a warning',async()=>{const f=await fixture(result([playable]),'');assert(support(f).includes('지원하지 않을 수 있습니다'));assert(!support(f).includes('성공'));});
await check('D3C-13 job completion and partial deleted output remain separate',async()=>{const f=await fixture(result([{...playable,completeness:'partial',catalogState:'deleted',playable:false,playbackUrl:''}]));rows(f)[0].emit('click');const text=f.field('opsRecordingCompleteness').textContent;assert(text.includes('작업 완료'));assert(text.includes('일부 구간'));assert(text.includes('삭제됨'));assert.equal(f.field('opsRecordingPlayer').getAttribute('src'),null);});
await check('D3C-14 late response cannot replace newer selection',async()=>{const f=await fixture();const resolve=f.holdNext();await f.respond(result([{...playable,itemId:'new',segmentId:'new',playbackUrl:'/ops/api/recordings/media/new'}]));await resolve(result([playable]));assert.equal(f.field('opsRecordingPlayer').src,'/ops/api/recordings/media/new');});
await check('D3C-15 unknown-only page remains selectable',async()=>{const f=await fixture(result([],[{...playable,startTimeMs:null,endTimeMs:null,utcRange:null}],0,101));assert.equal(unknownRows(f).length,1);unknownRows(f)[0].emit('click');assert.equal(f.field('opsRecordingPlayer').src,playable.playbackUrl);assert.equal(f.field('opsRecordingNext').disabled,false);});
await check('I31-R03 unknown-only page does not auto-play outside requested time',async()=>{const f=await fixture(result([],[{...playable,startTimeMs:null,endTimeMs:null,utcRange:null}]));assert.equal(unknownRows(f).length,1);resetState(f);assert.equal(unknownRows(f)[0].getAttribute('aria-pressed'),'false');unknownRows(f)[0].emit('click');assert.equal(f.field('opsRecordingPlayer').src,playable.playbackUrl);});
for(const total of [-1,Number.MAX_SAFE_INTEGER+1])await check(`D3C-16 invalid total ${total} cannot enable paging`,async()=>{const f=await fixture(result([playable],[],total));assert.equal(f.field('opsRecordingNext').disabled,true);assert(f.field('opsRecordingListStatus').textContent.includes('불러오지 못했습니다'));});
await check('D3C-17 unknown debug fields are not rendered',async()=>{const f=await fixture(result([{...playable,sourceUrl:'private-source-sentinel',path:'private-path-sentinel',rawJson:'private-json-sentinel'}]));const text=labels(rows(f))+f.field('opsRecordingCompleteness').textContent+f.field('opsRecordingPlaybackStatus').textContent;assert(!text.includes('sentinel'));});
console.log(JSON.stringify({pass,fail,elapsedMs:Date.now()-started,actualBrowser:false,tempArtifacts:0}));
process.exitCode=fail?1:0;
