// 파일 용도: 녹화 UI의 조회·이벤트 우선·원본 보기 6개 pre-playback action을 실제 DOM으로 수행한다.

function assert(value,message){if(!value)throw new Error(message);}
function equal(actual,expected,message){assert(JSON.stringify(actual)===JSON.stringify(expected),message);}
function pageFor(seed,offset){const page=(seed.pages||[])[offset/100];assert(page&&Array.isArray(page.items)&&Array.isArray(page.unplacedItems),'seed page missing');return page;}
function knownSeed(seed){return (seed.pages||[]).reduce((sum,page)=>sum+(page.items||[]).length,0);}
function unknownSeed(seed){return (seed.pages||[]).reduce((sum,page)=>sum+(page.unplacedItems||[]).length,0);}
function dateLocal(value){const date=new Date(Number(value)),pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;}
function seedBounds(seed){const values=(seed.pages||[]).flatMap(page=>(page.items||[]).flatMap(item=>[Number(item.startTimeMs),Number(item.endTimeMs)])).filter(Number.isSafeInteger);assert(values.length>0,'seed known bounds missing');return {start:Math.floor(Math.min(...values)/60000)*60000,end:Math.ceil(Math.max(...values)/60000)*60000};}
async function text(page,selector){return (await page.locator(selector).textContent())||'';}
async function playerEmpty(page){return await page.locator('#opsRecordingPlayer').evaluate(node=>!node.getAttribute('src'));}
function requestTimelineCount(network){return network.filter(entry=>entry.route==='/ops/api/recordings/timeline').length;}
async function assertCurrent(h,seed,offset){const current=await h.getTimeline(),expected=pageFor(seed,offset);equal(current.items,expected.items,'timeline items seed mismatch');equal(current.unplacedItems,expected.unplacedItems,'timeline unplaced seed mismatch');assert(current.total===expected.total&&current.unplacedTotal===expected.unplacedTotal,'timeline total seed mismatch');return current;}

export async function runRecordingBeforePlayback(h){
  const {page,context,action,timelineAction,selectSeedRow,snapshot,getTimeline,network}=h;assert(page&&context?.seed&&action&&timelineAction&&selectSeedRow&&snapshot&&getTimeline&&Array.isArray(network),'pre-playback harness incomplete');
  const seed=context.seed,bounds=seedBounds(seed),start=dateLocal(bounds.start),end=dateLocal(bounds.end);
  const fields={channel:'#opsRecordingChannelFilter',start:'#opsRecordingStartTime',end:'#opsRecordingEndTime',load:'#opsRecordingLoad',original:'#opsRecordingOriginalView',next:'#opsRecordingNext',previous:'#opsRecordingPrevious'};
  const load=async(offset=0,expectedSeed=true)=>timelineAction(async()=>{await page.locator(fields.load).click();},offset,expectedSeed);
  await action('I27-filter',async()=>{
    if(await page.locator(fields.channel).inputValue()!=='1')await timelineAction(async()=>{await page.locator(fields.channel).selectOption('1');},0,true);await page.locator(fields.start).fill(start);await page.locator(fields.end).fill(end);await load(0,true);const current=await assertCurrent(h,seed,0);
    const list=await text(page,'#opsRecordingListStatus'),unknown=await text(page,'#opsRecordingUnplacedStatus');assert(list.includes(`시간 확인 ${current.total}`)&&list.includes(`현재 페이지 ${current.items.length}`),'known list status mismatch');assert(unknown.includes(`시간 귀속 미확인 ${current.unplacedTotal}`),'unknown list status mismatch');assert(current.total===knownSeed(seed)&&current.unplacedTotal===unknownSeed(seed),'seed total mismatch');
    return {total:current.total,unplacedTotal:current.unplacedTotal,knownStatus:list,unknownStatus:unknown};
  });
  await action('I27-empty',async()=>{
    const before=requestTimelineCount(network);await page.locator(fields.start).fill('');await page.locator(fields.load).click();const invalid=await page.locator(fields.start).evaluate(node=>!node.checkValidity());assert(invalid,'empty start must be invalid');assert(requestTimelineCount(network)===before,'invalid submit issued timeline request');
    await page.locator(fields.start).fill(start);await timelineAction(async()=>{await page.locator(fields.channel).selectOption('2');},0,false);const empty=await getTimeline();assert(empty.items.length===0&&empty.unplacedItems.length===0&&empty.total===0&&empty.unplacedTotal===0,'channel2 must be empty');const cleared=await playerEmpty(page);assert(cleared,'empty result must clear player');await timelineAction(async()=>{await page.locator(fields.channel).selectOption('1');},0,true);await assertCurrent(h,seed,0);
    return {invalid,timelineRequestsBefore:before,emptyCounts:{items:empty.items.length,unplacedItems:empty.unplacedItems.length,total:empty.total,unplacedTotal:empty.unplacedTotal},playerCleared:cleared};
  });
  await action('I27-inverted',async()=>{
    const before=requestTimelineCount(network);await page.locator(fields.start).fill(dateLocal(bounds.end+60000));await page.locator(fields.end).fill(end);const invalidStartValue=await page.locator(fields.start).inputValue();await page.locator(fields.load).click();assert(requestTimelineCount(network)===before,'inverted range issued timeline request');const status=await text(page,'#opsRecordingListStatus'),cleared=await playerEmpty(page);assert(status.includes('올바른 시작·종료'),'inverted range guidance missing');assert(cleared,'inverted range must clear player');await page.locator(fields.start).fill(start);await page.locator(fields.end).fill(end);await load(0,true);
    return {invalidStartValue,status,playerCleared:cleared};
  });
  await action('I27-page',async()=>{
    const initial=await assertCurrent(h,seed,0);const next=pageFor(seed,100);assert(initial.total>100||initial.unplacedTotal>100,'seed has no second page');await timelineAction(async()=>{await page.locator(fields.next).click();},100,true);await assertCurrent(h,seed,100);const previousEnabled=await page.locator(fields.previous).isEnabled(),nextDisabled=await page.locator(fields.next).isDisabled();assert(previousEnabled,'previous must enable at offset100');assert(nextDisabled===(100+100>=Math.max(next.total,next.unplacedTotal)),'next disabled state mismatch');await timelineAction(async()=>{await page.locator(fields.previous).click();},0,true);await assertCurrent(h,seed,0);const previousDisabled=await page.locator(fields.previous).isDisabled();assert(previousDisabled,'previous must disable at offset0');return {pageOffset:100,previousEnabled,nextDisabled,previousDisabled};
  });
  await action('I28-event',async()=>{
    await page.locator(fields.original).uncheck();await load(0,true);const current=await assertCurrent(h,seed,0),expected=current.items.find(item=>item.kind==='event'&&item.playable);assert(expected&&typeof expected.playbackUrl==='string','playable event missing');const selected=await snapshot();const badge=await text(page,'#opsRecordingKindBadge');assert(selected.src.endsWith(expected.playbackUrl),'event source mismatch');assert(badge.includes('이벤트 우선'),'event badge missing');return {expected:expected.itemId,actualSrc:selected.src,badge};
  });
  await action('I29-original',async()=>{
    // ID·순서가 무작위인 seed에서 겹친 원본이 첫 페이지에 있다는 가정은 하지 않는다.
    const targetPage=seed.pages.findIndex(page=>page.items.some(item=>item.kind==='continuous'&&item.hideByEvent));
    assert(targetPage>=0,'hidden original fixture missing from all pages');
    await page.locator(fields.original).uncheck();await load(0,true);
    for(let index=1;index<=targetPage;index++)await timelineAction(()=>page.locator(fields.next).click(),index*100,true);
    const before=await getTimeline(),beforeRows=await page.locator('#opsRecordingTimelineRows button').count();const hidden=before.items.filter(item=>item.kind==='continuous'&&item.hideByEvent);assert(hidden.length>0,'hidden original fixture missing');await page.locator(fields.original).check();const afterRows=await page.locator('#opsRecordingTimelineRows button').count();assert(afterRows===beforeRows+hidden.length,'original checkbox did not reveal hidden originals');const row=hidden[0];await selectSeedRow(row);const selected=await snapshot(),badge=await text(page,'#opsRecordingKindBadge');assert(selected.src&&selected.src.endsWith(row.playbackUrl),'selected original source missing');assert(badge.includes('상시녹화 원본'),'original badge missing');await page.locator(fields.original).uncheck();const cleared=await playerEmpty(page),afterSrc=(await snapshot()).src;assert(cleared||afterSrc!==row.playbackUrl,'unchecked hidden original must not remain selected');const unknown=(await getTimeline()).unplacedTotal;assert(unknown===before.unplacedTotal,'unknown total changed by original toggle');return {hiddenBefore:hidden.length,beforeRows,afterRows,selectedSrc:selected.src,afterSrc,playerCleared:cleared,unknownTotal:unknown};
  });
}
