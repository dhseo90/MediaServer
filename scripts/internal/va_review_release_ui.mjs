// 파일 용도: 실제 Ops 변경 영역의 출시 제한·이력·A·늦은 capability 응답을 확인한다.
import path from 'node:path';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable} from './v390_ui_native_adapter.mjs';
export async function verifyReleaseUi({base,repo,packages,aInfo,cookies,report,check,started}){
  const {playwright,moduleVersion}=resolvePlaywrightModule();
  const browser=await playwright.chromium.launch({headless:true,executablePath:resolveNativeBrowserExecutable(),args:['--disable-background-networking','--disable-component-update','--no-first-run']});
  report.browser={moduleVersion,checks:[],screenshots:[],closed:false};
  const ui=(ok,id)=>{check(ok,'browser '+id);report.browser.checks.push(id);};
  const cookie=async(ctx,value)=>ctx.addCookies(value.split('; ').map(v=>{const at=v.indexOf('=');return {name:v.slice(0,at),value:v.slice(at+1),url:base,httpOnly:true,sameSite:'Lax'};}));
  try{
    const ctx=await browser.newContext({viewport:{width:1280,height:900}});await cookie(ctx,cookies[0]);
    const page=await ctx.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const open=async()=>{await page.goto(base+'/ops/events');await page.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await page.selectOption('#opsEvidenceChannel','1');await page.click('#opsEvidenceRefresh');await page.locator(`[data-package-id="${packages[0]}"]`).click();await page.locator('#opsVaReviewStatus').filter({hasText:'품질 미충족'}).waitFor();};
    await open();await page.fill('#opsVaReviewQuestion','유효한 질문');
    ui(await page.locator('#opsVaReviewExecute').isDisabled(),'admin model execution disabled with release reason');
    await page.locator('#opsVaReviewRows button').first().click();await page.locator('#opsVaReviewResult h5').first().waitFor();
    ui((await page.locator('#opsVaReviewResult').innerText()).includes('밝기'),'historical result remains readable');
    const request=await ctx.request.post(base+'/ops/api/recordings/va-reviews',{data:{packageId:packages[0],question:'stale tab valid question',provider:'ollama'}});
    ui(request.status()===409&&(await request.json()).error==='review-model-not-adopted','stale tab direct request rejected on server');
    for(const [width,theme] of [[1280,'light'],[390,'dark']]){
      await page.setViewportSize({width,height:900});await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('media-server-theme',t);},theme);
      const panel=page.locator('section[aria-label="영상 근거 검토"]');await panel.scrollIntoViewIfNeeded();
      const file=`54-model-${width}-${theme}-${started}.png`;await panel.screenshot({path:path.join(repo,'docs/release-artifacts/v4.5.0',file)});report.browser.screenshots.push(file);
      ui(await panel.locator('#opsVaReviewExecute').isDisabled(),'responsive disabled '+width+' '+theme);
    }
    let release;let seen;let finished;let routeStarted=false;
    const pending=new Promise(r=>seen=r),gate=new Promise(r=>release=r),settled=new Promise(r=>finished=r);
    const pattern='**/ops/api/recordings/va-reviews?*';
    // 지연 응답을 완료한 뒤 route를 제거한다. callback 오류도 호출자가 회수해 HTTP finally로 전달한다.
    const delayed=async route=>{routeStarted=true;let error;try{const response=await route.fetch({timeout:5000});seen();await gate;await route.fulfill({response});}
      catch(e){error=e;seen();}finally{finished(error);}};
    await page.route(pattern,delayed,{times:1});
    try{
      await page.click('#opsVaReviewRefresh');await Promise.race([pending,page.waitForTimeout(6000).then(()=>{throw Error('delayed capability request missing');})]);
      await page.selectOption('#opsEvidenceKind','A');await page.locator(`[data-package-id="${aInfo.missingId}"]`).click();await page.locator('#opsAReviewQuestion').waitFor();
    }finally{release();const error=routeStarted?await settled:null;await page.unroute(pattern,delayed);if(error)throw error;}
    await page.fill('#opsAReviewQuestion','선택 sample 위치 자료를 확인하고 싶습니다.');
    await page.waitForTimeout(100);ui(await page.locator('#opsVaReviewExecute').count()===0&&!await page.locator('#opsAReviewPrepare').isDisabled(),'late model response cannot replace A selection');
    await page.click('#opsAReviewPrepare');await page.click('#opsAReviewConfirm');await page.waitForFunction(()=>!document.getElementById('opsAReviewExecute').disabled);
    await page.click('#opsAReviewExecute');await page.locator('#opsAReviewResult h5').first().waitFor();
    const text=await page.locator('#opsAReviewResult').innerText();ui(text.includes('자료')&&text.includes('서버 규칙'),'A confirm execute store result and server material guide');
    const aShot=`54-A-${started}.png`;await page.locator('#opsAReviewPanel').screenshot({path:path.join(repo,'docs/release-artifacts/v4.5.0',aShot)});report.browser.screenshots.push(aShot);
    await open();let fail=true;await page.route(pattern,async route=>{if(fail)await route.fulfill({status:503,contentType:'application/json',body:'{"error":"review-store-unavailable"}'});else await route.continue();});
    await page.click('#opsVaReviewRefresh');await page.locator('#opsVaReviewStatus').filter({hasText:'완료하지 못했습니다'}).waitFor();
    ui(await page.locator('#opsVaReviewExecute').isDisabled(),'communication failure never enables execution');fail=false;
    await page.click('#opsVaReviewRefresh');await page.locator('#opsVaReviewStatus').filter({hasText:'품질 미충족'}).waitFor();await page.unroute(pattern);
    ui(await page.locator('#opsVaReviewRows button').count()===1,'error recovery retains history and release restriction');
    for(const i of [1,2,3]){const role=await browser.newContext();await cookie(role,cookies[i]);const p=await role.newPage();await p.goto(base+'/ops/events');
      if(i===1){await p.locator('#opsEvidenceChannel option[value="1"]').waitFor({state:'attached'});await p.selectOption('#opsEvidenceChannel','1');await p.click('#opsEvidenceRefresh');await p.locator(`[data-package-id="${packages[0]}"]`).click();await p.locator('#opsVaReviewRows button').first().waitFor();ui(await p.locator('#opsVaReviewExecute').isDisabled(),'read only history without execution');}
      else ui(await p.locator('#opsVaReviewRows button').count()===0,'unauthorized role/channel has no history '+i);await role.close();}
    ui(errors.length===0,'changed page no script errors');await ctx.close();report.scopedBrowserExecuted=true;
  }finally{await browser.close();report.browser.closed=true;}
}
