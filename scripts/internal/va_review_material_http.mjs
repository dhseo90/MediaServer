// 파일 용도: V450-A03/U03 자료 요청 GET과 변경 화면만 실제 HTTP/브라우저로 검사한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable} from './v390_ui_native_adapter.mjs';
export async function checkMaterials({repo,root,base,req,execute,body,prefix,packs,packageInfo,packages,seedInfo,cookies,admin,report,check,pause,started}){
  const right=await execute();check(right.result.materialRequests.status==='not-needed'&&right.result.materialRequests.items.length===0,'supported without request remains readable');
  const left=await execute(body(packageInfo,'endpoint-left'));check(left.result.decisions[0].verdict==='contradicted'&&left.result.materialRequests.status==='not-needed','contradiction without request');
  const unsupported=await execute(body(packageInfo,'continuous-motion'));check(unsupported.result.materialRequests.status==='unavailable-unsupported'&&unsupported.result.decisions[0].verdict==='unsupported','unsupported does not promise solvable materials');
  const missing=await req(packs+'/'+packages[1]);const gaps=await execute(body(missing));
  check(gaps.result.materialRequests.status==='available'&&gaps.result.materialRequests.items.length===2,'real missing A record yields identity and position materials');
  for(const item of gaps.result.materialRequests.items){check(item.source==='A-analysis-record-consistency'&&item.frames.map(f=>f.index).join(',')==='0,7'&&item.frames.every(f=>f.observationState==='missing')&&item.analysisTrack==='track-999','A source exact frame/sample metadata');
    for(const f of item.frames)check(f.ptsNs===missing.frames[f.index].ptsNs&&f.sampleOrdinal!==null,'PTS and sample retained');}
  check(gaps.result.questionsState==='not-generated'&&gaps.result.modelQuality==='not-evaluated'&&gaps.result.materialRequests.origin==='server-rule','server display distinct from ungenerated model');
  const partial=body(packageInfo,'endpoint-right');partial.claims[0].frames=[0,1];const partialResult=await execute(partial);
  check(partialResult.result.materialRequests.items.length===2&&partialResult.result.materialRequests.items.every(i=>i.frames.every(f=>f.index===1)),'only absent middle sample requested');
  // 다른 scope와 목적을 가진16claim. 표시 한도에도 모든 구조화 gap을 유지한다.
  const many=body(missing,'endpoint-right',16);many.claims.forEach((c,i)=>{c.relation=i<8?'endpoint-right':'endpoint-left';c.frames=[i%8];});
  const limit=await execute(many);check(limit.result.claims.length===16&&limit.result.decisions.length===16&&limit.result.decisions.every(d=>d.gaps.length===3)&&limit.result.materialRequests.status==='unavailable-limit'&&limit.result.materialRequests.items.length===0,'display limit preserves all 16 claims and 48 gaps');
  check(Buffer.byteLength(JSON.stringify(limit.result))<=40*1024,'API total serialized budget');
  const recordFile=path.join(root,'recordings/va-reviews',gaps.done.reviewId+'.review');const before=fs.readFileSync(recordFile);await req(prefix+'/'+gaps.done.reviewId);
  check(before.equals(fs.readFileSync(recordFile)),'GET rendering never rewrites stored record');report.savedRecordHash=crypto.createHash('sha256').update(before).digest('hex');
  for(const index of [2,3,4])await req(prefix+'/'+gaps.done.reviewId,cookies[index],'GET',undefined,403);
  check((await req(prefix+'/'+gaps.done.reviewId,cookies[1])).materialRequests.status==='available','authorized read-only role sees scoped guidance');
  await req(prefix+'/'+seedInfo.internalId,admin,'GET',undefined,404);await req(prefix+'/'+seedInfo.v1Id,admin,'GET',undefined,404);
  check((await req('/ops/api/recordings/va-reviews/'+seedInfo.v1Id)).provider==='ollama','legacy v1 unchanged');
  const bad=Buffer.from(before);bad[bad.length-1]^=1;fs.writeFileSync(recordFile,bad,{mode:0o600});try{await req(prefix+'/'+gaps.done.reviewId,admin,'GET',undefined,404);}finally{fs.writeFileSync(recordFile,before,{mode:0o600});}
  const {playwright,moduleVersion}=resolvePlaywrightModule();let browser;
  report.browser={engine:'chromium',moduleVersion,checks:[],screenshots:[],pageErrors:[]};
  const ui=(ok,id)=>{check(ok,'browser '+id);report.browser.checks.push(id);};
  try{
    browser=await playwright.chromium.launch({headless:true,executablePath:resolveNativeBrowserExecutable(),args:['--disable-background-networking','--disable-component-update','--no-first-run']});
    const ctx=await browser.newContext({viewport:{width:1280,height:1000}});
    const login=(context,cookie)=>context.addCookies(cookie.split('; ').map(v=>{const at=v.indexOf('=');return {name:v.slice(0,at),value:v.slice(at+1),url:base,httpOnly:true,sameSite:'Lax'};}));
    await login(ctx,admin);const page=await ctx.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.browser.pageErrors.push(e.message));
    const open=async(id)=>{await page.goto(base+'/ops/events');await page.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await page.selectOption('#opsEvidenceChannel','1');await page.selectOption('#opsEvidenceKind','A');await page.locator(`[data-package-id="${id}"]`).click();await page.locator('#opsAReviewRows button').first().waitFor();};
    const clickResult=async(index)=>{const old=await page.locator('#opsAReviewMaterials').count()?await page.locator('#opsAReviewMaterials').elementHandle():null;await page.locator('#opsAReviewRows button').nth(index).click();if(old)await page.waitForFunction(el=>!el.isConnected,old);await page.locator('#opsAReviewMaterials').waitFor();};
    const show=async(id)=>{const list=await req(prefix+'?packageId='+packages[1]);const index=list.items.findIndex(r=>r.id===id);check(index>=0,'saved result listed');await clickResult(index);};
    await open(packages[1]);await show(gaps.done.reviewId);
    const text=await page.locator('#opsAReviewMaterials').innerText();ui(text.includes('추가로 필요한 자료 — 서버 규칙')&&text.includes('sample 기록 연결')&&text.includes('원본 화면 기준 위치')&&text.includes('물리적 동일성 인증 아님')&&text.includes('미디어 PTS')&&!text.includes('AI가 생성'),'actual request meaning and origin');
    ui((await page.locator('#opsAReviewResult').innerText()).includes('모델 질문: 미생성')&&await page.locator('#opsAReviewResult script').count()===0,'model state and literal original HTML retained');
    const shot=async(width,theme)=>{await page.setViewportSize({width,height:1000});await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('media-server-theme',t);},theme);
      const file=path.join(repo,`docs/release-artifacts/v4.5.0/46-materials-${width}-${theme}-${started}.png`);await page.locator('#opsAReviewResult').screenshot({path:file});report.browser.screenshots.push({file:path.basename(file),width,theme,scope:'whole saved result and material guidance'});ui(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+width+' '+theme);};
    for(const [width,theme] of [[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']])await shot(width,theme);
    report.browser.materialsText=text;
    await page.setViewportSize({width:1280,height:1000});await show(limit.done.reviewId);const limitText=await page.locator('#opsAReviewResult').innerText();
    ui(limitText.includes('자료 요청의 표현 한도')&&(limitText.match(/분석 기록상의 관계/g)||[]).length===16&&(limitText.match(/구조화 부족 근거/g)||[]).length===16,'limit keeps every structured decision and gap');
    await open(packages[0]);const choose=async(id)=>{const list=await req(prefix+'?packageId='+packages[0]);await clickResult(list.items.findIndex(x=>x.id===id));};
    await choose(unsupported.done.reviewId);ui((await page.locator('#opsAReviewMaterials').innerText()).includes('추가 자료만으로 지원이 보장되지 않습니다'),'unsupported shown without data promise');
    await choose(right.done.reviewId);ui((await page.locator('#opsAReviewMaterials').innerText()).includes('요청할 자료가 없습니다'),'not-needed still normal result');
    // 현재 선택이 바뀐 뒤 실제 GET 응답을 늦게 전달한다. 원 응답 본문을 바꾸지 않는다.
    let release,arrived,finished;const gate=new Promise(r=>release=r),arrival=new Promise(r=>arrived=r),done=new Promise(r=>finished=r);
    await page.route('**/a-record-reviews/'+right.done.reviewId,async route=>{const response=await route.fetch();arrived();await gate;try{await route.fulfill({response});}catch{}finally{finished();}});
    const list=await req(prefix+'?packageId='+packages[0]);await page.locator('#opsAReviewRows button').nth(list.items.findIndex(x=>x.id===right.done.reviewId)).click();await arrival;
    await page.selectOption('#opsEvidenceKind','v1');release();await done;await page.unroute('**/a-record-reviews/'+right.done.reviewId);await pause(100);
    ui(await page.locator('#opsAReviewMaterials').count()===0&&await page.locator('#opsAReviewPanel').count()===0,'late result cannot replace new selection');
    for(const index of [1,2,3]){const other=await browser.newContext();await login(other,cookies[index]);const p=await other.newPage();await p.goto(base+'/ops/events');
      if(index===1){await p.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await p.selectOption('#opsEvidenceKind','A');await p.locator(`[data-package-id="${packages[1]}"]`).click();await p.locator('#opsAReviewRows button').first().click();await p.locator('#opsAReviewMaterials').waitFor();ui(await p.locator('#opsAReviewPrepare').isDisabled(),'read-only scoped guidance without execution');}
      else ui(await p.locator('#opsAReviewMaterials').count()===0,'viewer or wrong channel no guidance '+index);await other.close();}
    ui(report.browser.pageErrors.length===0,'no browser exceptions');await ctx.close();report.scopedBrowserExecuted=true;report.actualUiPass=false;
  }finally{if(browser)await browser.close();report.cleanup.browserClosed=true;}
}
