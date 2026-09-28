// 파일 용도: 녹화 UI의 오류·운영 상태·역할·반응형 22개 action을 실제 브라우저에서 확인한다.
import fs from 'node:fs';
import path from 'node:path';
function assert(value,message){if(!value)throw Error(message);}
function rowFor(seed,name){
  const job=seed.jobs.find(j=>j.name===name);assert(job,'seed scenario');
  const row=seed.pages.flatMap(p=>[...p.items,...p.unplacedItems]).find(r=>r.jobId===job.jobId&&r.segmentId===job.outputs[0].id);
  assert(row,'seed scenario row');return row;
}
async function text(page,id){return (await page.locator(id).textContent())||'';}
export function recordingGeometry(nodes,width){
  assert(nodes.length>0&&nodes.every(n=>n.visible&&n.width>0&&n.height>0&&n.left>=-1&&n.right<=width+1),'recording control horizontal clipping');
  assert(nodes.every(n=>n.label),'recording accessible label missing');
  return true;
}
export function foreignPlayableMedia(page){
  return [...page.items,...page.unplacedItems].find(row=>row.playable&&row.playbackUrl)?.playbackUrl??null;
}
export async function runRecordingAfterPlayback(h){
  const {context,action,selectSeedRow,snapshot,timelineAction,write,expectedErrors}=h,seed=context.seed;
  const p=()=>h.page,allRows=seed.pages.flatMap(page=>[...page.items,...page.unplacedItems]);
  const load=()=>timelineAction(()=>p().locator('#opsRecordingLoad').click());
  await action('I31-partial',async()=>{
    const row=rowFor(seed,'partial');await selectSeedRow(row);
    const label=await text(p(),'#opsRecordingCompleteness');assert(label.includes('일부 구간')&&row.playable&&(await snapshot()).src===row.playbackUrl,'partial state');
    await p().waitForFunction(()=>document.querySelector('#opsRecordingPlayer').readyState>=2);
    return {item:row.itemId,label,media:await snapshot()};
  });
  for(const [id,name] of [['I31-deleted','deleted'],['I31-corrupt','corrupt'],['I31-pending','pending']]){
    await action(id,async()=>{
      const row=name==='pending'?allRows.find(r=>r.referenceId==='ui-accepted-only'):rowFor(seed,name);
      assert(row&&!row.playable&&!row.playbackUrl,'unavailable seed');
      await selectSeedRow(row);const state=await snapshot(),message=await text(p(),'#opsRecordingPlaybackStatus');
      assert(!state.src&&state.paused&&message.includes('재생할 수 없습니다'),'unavailable playback guard');
      return {scenario:name,item:row.itemId,catalogState:row.catalogState,message,state};
    });
  }
  await action('I31-gap',async()=>{
    await timelineAction(()=>p().locator('#opsRecordingChannelFilter').selectOption('2'),0,false);
    const rows=h.getTimeline(),state=await snapshot(),message=await text(p(),'#opsRecordingListStatus');
    assert(!rows.items.length&&!rows.unplacedItems.length&&!state.src&&state.paused&&message.includes('없습니다'),'gap stale playback');
    const proof={rows:rows.total,unknown:rows.unplacedTotal,state,message};await timelineAction(()=>p().locator('#opsRecordingChannelFilter').selectOption('1'));
    return proof;
  });
  await action('I31-error',async()=>{
    await selectSeedRow(rowFor(seed,'full'));assert((await snapshot()).src,'pre-error selected media');
    const marker=path.join(context.root,'timeline-fault-once');assert(!fs.existsSync(marker),'fault marker must be absent');
    fs.writeFileSync(marker,'timeline-503\n',{flag:'wx',mode:0o600});
    expectedErrors.push({action:'I31-error',route:'/ops/api/recordings/timeline',status:503});
    const waiting=p().waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/timeline');
    const [response]=await Promise.all([waiting,p().locator('#opsRecordingLoad').click()]);assert(response.status()===503,'expected one shot503');
    await p().waitForFunction(()=>document.querySelector('#opsRecordingListStatus').textContent.includes('불러오지 못했습니다'));
    const state=await snapshot(),message=await text(p(),'#opsRecordingListStatus');assert(!state.src&&state.paused&&!fs.existsSync(marker),'error must clear stale media');
    const proof={status:503,state,message};await load();return proof;
  });
  async function status(){
    const waiting=p().waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/recordings/status');
    const [response]=await Promise.all([waiting,p().locator('#opsEventsRefresh').click()]);assert(response.status()===200,'status response');
    const data=await response.json();
    const expected=data.channels.map(c=>(c.displayName||c.channelId)+': '+(c.active?'녹화 중':'녹화 중 아님')+(c.storageBlocked?' · 저장 공간 차단':'')+' · 상시 '+c.continuousBytes+'/'+(c.continuousMaxBytes||'무제한')+' bytes · 이벤트 '+c.eventBytes+'/'+(c.eventMaxBytes||'무제한')+' bytes').join(' / ');
    await p().waitForFunction(value=>document.querySelector('#opsRecordingStatusText').textContent===value,expected);
    return data;
  }
  let foreignMedia=null;
  await action('I32-quota',async()=>{
    const data=await status();const shown=await text(p(),'#opsRecordingStatusText');
    for(const c of data.channels){
      const expected=(c.displayName||c.channelId)+': '+(c.active?'녹화 중':'녹화 중 아님')+(c.storageBlocked?' · 저장 공간 차단':'')+' · 상시 '+c.continuousBytes+'/'+(c.continuousMaxBytes||'무제한')+' bytes · 이벤트 '+c.eventBytes+'/'+(c.eventMaxBytes||'무제한')+' bytes';
      assert(shown.includes(expected),'status quota DOM differs from response');
    }
    const active=data.channels.find(c=>c.channelId==='3'),blocked=data.channels.find(c=>c.channelId==='4');
    assert(active.continuousMaxBytes===134217728&&active.eventMaxBytes===134217728&&blocked.continuousMaxBytes===1048576,'configured independent quota');
    // 타 채널 거부용 opaque media를 관리자가 실제 UI 조회 응답에서 얻는다.
    const now=Date.now(),local=ms=>{const d=new Date(ms);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
    await p().locator('#opsRecordingStartTime').fill(local(now-3600000));await p().locator('#opsRecordingEndTime').fill(local(now+60000));
    const page=await timelineAction(()=>p().locator('#opsRecordingChannelFilter').selectOption('3'),0,false);
    write('I32-live-oracle.json',page);
    foreignMedia=foreignPlayableMedia(page);assert(foreignMedia,'actual foreign channel media required');
    await h.openRecordings();return {channels:data.channels,shown,foreignMedia};
  });
  async function setEnabled(enabled){
    await p().goto(context.baseUrl+'/ops/sources',{waitUntil:'networkidle'});
    await p().locator('[data-view-channel="3"]').click();await p().locator('#channel-edit-selected').click();
    await p().waitForFunction(()=>document.querySelector('#channel-form [name="file"]').value==='s06-channel-3.mp4');
    await p().locator('#channel-form [name="recordingEnabled"]').setChecked(enabled);
    // 입력 fixture의 1시간 정책을 UI가 제공하는 최소 1일로 명시 변경한다.
    // 제품 정책을 바꾸지 않으며 검증 소유 source만 저장한다.
    await p().locator('#channel-form [name="recordingRetentionDays"]').fill('1');
    const waiting=p().waitForResponse(r=>new URL(r.url()).pathname==='/ops/api/sources/3'&&r.request().method()==='PUT');
    const [response]=await Promise.all([waiting,p().locator('#channel-save-selected').click()]);assert(response.status()===200,'UI source save');
    const data=await response.json();
    const saved={enabled:data.source?.enabled,file:data.source?.file,recording:data.source?.recording};
    write('I32-saved-'+enabled+'.json',saved);
    assert(saved.recording?.enabled===enabled&&saved.enabled===true&&saved.file==='s06-channel-3.mp4','recording policy and input preserved');
    await p().waitForFunction(()=>document.querySelector('#channel-save-selected').hidden);
    await h.openRecordings();const current=await status(),channel=current.channels.find(c=>c.channelId==='3');
    write('I32-state-'+enabled+'.json',channel);
    assert(channel&&channel.active===enabled,'actual recording active transition');
    return {enabled,sourceRevision:data.source.recording.revision,channel,shown:await text(p(),'#opsRecordingStatusText')};
  }
  await action('I32-active',async()=>({disabled:await setEnabled(false),enabled:await setEnabled(true)}));
  await action('I32-blocked',async()=>{
    const data=await status(),channel=data.channels.find(c=>c.channelId==='4'),shown=await text(p(),'#opsRecordingStatusText');
    assert(channel?.storageBlocked===true&&shown.includes((channel.displayName||'4')+': '+(channel.active?'녹화 중':'녹화 중 아님')+' · 저장 공간 차단'),'actual storage blocked');
    return {channel,shown};
  });
  await action('I33-navigation',async()=>{
    const links=await p().locator('nav[aria-label="운영 메뉴"] a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,href:n.getAttribute('href')})));
    for(const route of ['/ops/home','/ops/dashboard','/ops/sources','/ops/rules','/ops/users','/client/live'])assert(links.some(l=>l.href===route),'primary nav missing '+route);
    assert(!links.some(l=>l.href==='/ops/events'),'diagnostic route must not become primary nav');
    const form=await p().locator('#opsRecordingFilterForm').innerText();assert(!/vector|embedding|자연어/i.test(form),'new search UI outside recording scope');
    return {links,form};
  });
  await action('I34-admin',async()=>{
    assert(h.getPrincipal().observedRole==='admin','admin actual identity');
    await selectSeedRow(rowFor(seed,'full'));const state=await snapshot();assert(state.src,'admin media access');
    return {principal:h.getPrincipal(),state};
  });
  async function denied(id,route,statusCode){
    expectedErrors.push({action:id,route:new URL(context.baseUrl+route).pathname,status:statusCode});
    const response=await p().goto(context.baseUrl+route,{waitUntil:'domcontentloaded'});
    assert(response.status()===statusCode,'role denial '+statusCode);
    return {route,status:response.status(),body:await p().locator('body').innerText()};
  }
  await action('I34-operator',async()=>{
    await h.switchAccount(1);await h.openRecordings();
    const channels=await p().locator('#opsRecordingChannelFilter option').evaluateAll(nodes=>nodes.map(n=>n.value));assert(JSON.stringify(channels)==='["1"]','operator scoped channel list');
    await selectSeedRow(rowFor(seed,'full'));assert((await snapshot()).src,'operator allowed media');
    const deniedChannel=await denied('I34-operator','/ops/api/recordings/timeline?channelId=2&startTimeMs=1000&endTimeMs=10000',403);
    const deniedMedia=await denied('I34-operator',foreignMedia,404);
    await h.openRecordings();const proof={principal:h.getPrincipal(),channels,deniedChannel,deniedMedia};
    await h.switchAccount(3);await p().goto(context.baseUrl+'/ops/events',{waitUntil:'networkidle'});
    assert(await p().locator('#opsRecordingChannelFilter option').count()===0,'no-source scoped channels');
    proof.noSource=h.getPrincipal();
    await h.switchAccount(4);proof.noOps=await denied('I34-operator','/ops/events',403);
    await h.switchAccount(1);await h.openRecordings();return proof;
  });
  await action('I34-viewer-unauth',async()=>{
    await h.switchAccount(2);const viewer=await denied('I34-viewer-unauth','/ops/events',403);
    assert(await p().locator('#opsRecordingFilterForm').count()===0,'viewer no recording controls');
    await h.switchAccount(null);await p().goto(context.baseUrl+'/ops/events',{waitUntil:'domcontentloaded'});
    assert(new URL(p().url()).pathname==='/login'&&await p().locator('#opsRecordingFilterForm').count()===0,'unauth login guard');
    const proof={viewer,unauthRedirect:'/login'};await h.screenshot('I34-unauth-empty-login');await h.switchAccount(1);await h.openRecordings();return proof;
  });
  await action('I34-redaction',async()=>{
    const body=await p().locator('body').innerText(),html=await p().content();
    assert(!/passwordHash|passwordHistory|tokenHash|mediaRelpath|absolutePath|\/Users\/|\/private\/|debugCounters|sourceUrl/i.test(body),'operator visible private fields');
    assert(context.accounts.every(a=>!html.includes(a.password)),'credential HTML exposure');
    await h.switchAccount(2);await p().goto(context.baseUrl+'/client',{waitUntil:'networkidle'});
    const client=await p().locator('body').innerText();assert(!/\/Users\/|\/private\/|passwordHash|tokenHash|debugCounters|sourceUrl|Developer URL/.test(client),'viewer private fields');
    await h.screenshot('I34-viewer-redaction');await h.switchAccount(0);await h.openRecordings();
    return {operatorPrivateFields:false,credentialPlaintext:false,viewerPrivateFields:false};
  });
  for(const width of [320,390,760,1180])for(const theme of ['light','dark']){
    const id='I34-'+width+'-'+theme;
    await action(id,async()=>{
      await p().setViewportSize({width,height:900});
      // 각 viewport의 실제 페이지 진입을 확인한다. 직전 폭의 native control paint를 재사용하지 않는다.
      await h.openRecordings();
      const current=await p().locator('html').getAttribute('data-theme');
      if((current==='dark'?'dark':'light')!==theme)await p().locator('#themeToggleBtn').click();
      assert((await p().locator('html').getAttribute('data-theme')||'light')===theme,'actual theme');
      await selectSeedRow(seed.pages.flatMap(x=>[...x.items,...x.unplacedItems]).find(r=>r.segmentId===seed.seek.id));
      const controls=['opsRecordingChannelFilter','opsRecordingStartTime','opsRecordingEndTime','opsRecordingLoad','opsRecordingOriginalView','opsRecordingPlayer'];
      const geometry=await p().evaluate(ids=>ids.map(id=>{
        const n=document.getElementById(id),r=n.getBoundingClientRect(),style=getComputedStyle(n);
        return {id,left:r.left,right:r.right,width:r.width,height:r.height,visible:!!n.offsetParent,label:n.getAttribute('aria-label')||n.labels?.[0]?.textContent||n.textContent,color:style.color,background:style.backgroundColor,outline:style.outline,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth};
      }),controls);
      write(id+'-geometry.json',{width,theme,geometry});recordingGeometry(geometry,width);
      // datetime-local 내부 분할 field의 Tab 순서를 전체 input 이동으로 오인하지 않는다.
      await p().locator('#opsRecordingChannelFilter').focus();await p().keyboard.press('Tab');
      const focus=await p().evaluate(()=>({id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outline,boxShadow:getComputedStyle(document.activeElement).boxShadow}));
      assert(focus.id==='opsRecordingStartTime','keyboard focus order');await h.screenshot(id+'-filters');
      await p().locator('#opsRecordingOriginalView').focus();await p().keyboard.press('Space');const toggled=await p().locator('#opsRecordingOriginalView').isChecked();assert(!toggled,'keyboard checkbox toggled');
      await p().keyboard.press('Space');assert(await p().locator('#opsRecordingOriginalView').isChecked(),'keyboard checkbox restored');
      await p().locator('#opsRecordingPlayer').scrollIntoViewIfNeeded();await p().locator('#opsRecordingPlayer').hover();
      await p().waitForFunction(()=>{const v=document.querySelector('#opsRecordingPlayer');return v.readyState>=2&&v.getVideoPlaybackQuality().totalVideoFrames>0&&!v.seeking;});
      await p().waitForTimeout(350); // native control 로딩 표시의 paint 전이를 포함해 관측한다.
      return {width,theme,geometry,focus,video:await snapshot(),visualReviewRequired:true};
    });
  }
}
