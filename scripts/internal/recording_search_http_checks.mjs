// 파일 용도: 격리된 기존 인증 HTTP fixture에서 v420 검색 계약을 직접 검사한다.
export async function verifyRecordingSearchHttp({cookies,call,seed,check}) {
  const params = new URLSearchParams({channelIds:'1',startTimeMs:seed.startTimeMs,endTimeMs:seed.endTimeMs,limit:'1'});
  const route = '/ops/api/recordings/search?';
  const get = (p,cookie=cookies[1],prefix=route) => call(prefix+p,{headers:cookie?{Cookie:cookie}:{}});
  for(let i=0;i<cookies.length;++i){
    const response=await get(params,cookies[i]); const body=await response.text();
    check(response.status===(i<2?200:403),`V420-A01 search role/scope principal ${i}`);
    check(!/passwordHash|passwordHistory|tokenHash|mediaRelpath|absolutePath|storeId|jobId/.test(body),'V420-A02 sanitized search response');
    if(i<2)check(response.headers.get('cache-control')==='no-store','V420-A02 search no-store');
  }
  const anonymous=await get(params,null);check(anonymous.status===401,'V420-A01 anonymous denied');await anonymous.arrayBuffer();
  const mixed=new URLSearchParams(params);mixed.set('channelIds','1,2');
  const forbidden=await get(mixed);check(forbidden.status===403,'V420-A01 mixed channel request denied');await forbidden.arrayBuffer();
  const initial=await get(params);const first=await initial.json();
  check(initial.status===200&&first.items.length===1&&first.nextCursor,'V420-C01 first page and cursor');
  const next=new URLSearchParams(params);next.set('cursor',first.nextCursor);
  const other=await get(next,cookies[0]);check(other.status===403,'V420-C02 cross-user cursor denied');await other.arrayBuffer();
  const ids=new Set(first.items.map(x=>x.id));let cursor=first.nextCursor;
  for(let n=0;cursor&&n<20;++n){next.set('cursor',cursor);const r=await get(next);const page=await r.json();
    check(r.status===200&&page.snapshotId===first.snapshotId,'V420-C01 stable HTTP snapshot');
    for(const item of page.items){check(!ids.has(item.id),'V420-C01 no duplicate hit');ids.add(item.id);}cursor=page.nextCursor;}
  check(!cursor&&ids.size===first.knownCount+first.unplacedCount,'V420-C01 exact total membership');
  const seek=new URLSearchParams(params);seek.set('snapshotId',first.snapshotId);seek.set('hitId',first.items[0].id);
  const seekRoute='/ops/api/recordings/search/seek?';
  const located=await get(seek,cookies[1],seekRoute);const target=await located.json();
  check(located.status===200&&target.playable&&target.playbackUrl.startsWith('/ops/api/recordings/media/'),'V420-P03 authenticated hit playback URL');
  const bytes=await call(target.playbackUrl,{headers:{Cookie:cookies[1],Range:'bytes=0-31'}});
  check(bytes.status===206&&(await bytes.arrayBuffer()).byteLength===32,'V420-P03 selected media uses existing protected range route');
  seek.set('hitId','absent-hit');const absent=await get(seek,cookies[1],seekRoute);
  check(absent.status===410,'V420-P03 snapshot nonmember denied');await absent.arrayBuffer();
  next.set('cursor','');const invalid=await get(next);check(invalid.status===400,'V420-F10 empty cursor rejected');await invalid.arrayBuffer();
}
