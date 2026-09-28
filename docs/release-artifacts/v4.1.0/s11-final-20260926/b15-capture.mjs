// 파일 용도: B15 문서용 실제 화면을 격리 fixture에서 촬영한다. 제품 UI 풀테스트가 아니다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {runVerifier} from '../../../../scripts/internal/verify_v410_recording_ui_contract.mjs';
import {resolvePlaywrightModule,resolveNativeBrowserExecutable,secretStrippedBrowserEnv} from '../../../../scripts/internal/v390_ui_native_adapter.mjs';
import {redactAcceptanceText} from '../../../../scripts/internal/run_recording_ui_acceptance.mjs';
const output=process.argv[2];
assert(output&&path.isAbsolute(output)&&/^media-server-b15\.[A-Za-z0-9]+$/.test(path.basename(output)),'소유 출력 디렉터리 필요');
const outputStat=fs.lstatSync(output);
assert(outputStat.isDirectory()&&!outputStat.isSymbolicLink()&&outputStat.uid===process.getuid()&&(outputStat.mode&0o777)===0o700&&fs.readdirSync(output).length===0,'빈 0700 소유 디렉터리 필요');
const rows=[];
const requested=(process.argv[3]||'').split(',').filter(Boolean);
assert(requested.every(x=>/^(ko|en)-(ops-rules|ops-users|client-dashboard|client-live)$/.test(x)),'미지원 촬영 대상');
await runVerifier('--ui-auth-direct',{uiArgs:['--ui-anchor-utc-ms',String(Date.now())],uiDriver:async context=>{
  const browser=await resolvePlaywrightModule().playwright.chromium.launch({headless:true,executablePath:resolveNativeBrowserExecutable(),env:secretStrippedBrowserEnv(),args:['--no-first-run']});
  try{
    const session=await browser.newContext({viewport:{width:1680,height:960},locale:'ko-KR'});
    const page=await session.newPage();
    await page.goto(context.baseUrl+'/login');
    await page.locator('input[name="username"]').fill(context.accounts[0].username);
    await page.locator('input[name="password"]').fill(context.accounts[0].password);
    await Promise.all([page.waitForURL(url=>url.pathname!=='/login'),page.locator('button[type="submit"]').click()]);
    const api=async(route,data)=>{const r=await session.request.put(context.baseUrl+route,{data});assert(r.ok(),route+' '+r.status());return r;};
    fs.copyFileSync('video/va_four_scene_sample.mp4',path.join(context.root,'input/va_four_scene_sample.mp4'));
    await api('/ops/api/sources/9001',{sourceId:'9001',displayName:'VA Test File',kind:'file',file:'va_four_scene_sample.mp4',enabled:true,recording:{enabled:false},site:'Demo',group:'Local sample',floor:'1F',allowDuplicateSource:true});
    await api('/ops/api/views/9001',{viewId:'9001',displayName:'VA Test File',sourceId:'9001',allowedOverlayModes:['raw','va-overlay'],showDashboard:true,showEvents:true,showMetadataSummary:true,maxTiles:4,enabled:true});
    // 문서 예시는 모든 샘플 채널을 조회하는 viewer다. 인증 회귀용 단일 채널 case와 혼동하지 않는다.
    await api('/ops/api/users/s06-viewer',{username:'s06-viewer',displayName:'Sample Viewer',role:'viewer',scopes:['view:read:*'],enabled:true});
    await api('/lab/analysis/profiles/9901',{id:'9901',enabled:true,detector:'yolo',fps:6,maxQueue:1,confidence:0.25,nms:0.45,inputWidth:640,inputHeight:640,adaptive:true,analysis:{classes:['person']},trackingClasses:['person']});
    const points=[{x:0.1,y:0.1},{x:0.9,y:0.1},{x:0.9,y:0.9},{x:0.1,y:0.9}];
    await api('/lab/analysis/rules/9911',{id:'9911',enabled:true,match:{sourceKind:'*',route:'*'},analysis:{profileId:'9901',classes:['person']},event:{type:'intrusion',region:{type:'polygon',points},minConfidence:0.25,minDurationMs:0},outputs:{overlay:true,metadata:true,events:true}});
    for(const id of ['9921','9922'])await api('/lab/analysis/va-rules/'+id,{id,name:'Sample '+id,enabled:true,source:{kind:'file',file:'va_four_scene_sample.mp4'},analysis:{profileId:'9901',classes:['person']},templateStart:{ruleId:'9911'},priority:Number(id)-9921,outputs:{overlay:true,metadata:true,events:true},geometry:{type:'polygon',points}});
    const tasks=[
      ['ops-rules','/ops/rules','.rules-workspace-catalog-grid'],
      ['ops-users','/ops/users','[data-access-task="users"]'],
      ['client-dashboard','/client/dashboard','.client-dashboard-head,[data-testid="client-dashboard-field-summary"],[data-testid="client-dashboard-safe-summary"]'],
      ['client-live','/client/live','.live-workspace-main,.live-toolbar'],
    ];
    for(const lang of ['ko','en'])for(const [name,route,selector] of tasks){
      if(requested.length&&!requested.includes(lang+'-'+name))continue;
      // Live는 별도 도크까지 긴 한 장으로 묶지 않고 영상·toolbar가 모두 든 완결 workspace를 촬영한다.
      await page.setViewportSize(name==='client-live'?{width:1920,height:1080}:{width:1680,height:960});
      await page.goto(context.baseUrl+route+'?lang='+lang,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>{localStorage.setItem('mediaServerTheme','dark');});
      await page.reload({waitUntil:'networkidle'});
      if(name==='ops-rules')await page.locator('#opsVaRuleRows tr').first().waitFor();
      if(name==='ops-users')await page.locator('#users-body tr').first().waitFor();
      if(name==='client-dashboard')await page.locator('#views [data-view-id="9001"]').click();
      if(name==='client-live'){
        await page.locator('#liveGridSize').selectOption('1');
        await page.locator('#liveDensity').selectOption('compact');
        await page.locator('[data-source-view="9001"]').click();
        // 소스 선택은 VA 기본 mode로 자동 재생한다. readyState가 낮다고 toggle하면 시작 중인 세션을 정지한다.
        await page.waitForFunction(()=>{const v=document.querySelector('[data-tile="0"] video');return v&&!v.paused&&v.readyState>=2;},{},{timeout:25000});
        assert.equal(await page.locator('[data-tile="0"] [data-mode-action="va-overlay"]').getAttribute('aria-pressed'),'true');
      }
      await page.waitForTimeout(1200);
      await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
      assert(await page.locator('input[type="password"]').evaluateAll(nodes=>nodes.every(n=>!n.value)),'비밀번호 촬영 금지');
      const geometry=await page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0).map(n=>{const r=n.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth};}));
      assert(geometry.length,'촬영할 실제 완결 영역 없음');
      const left=Math.min(...geometry.map(r=>r.x)),top=Math.min(...geometry.map(r=>r.y));
      const right=Math.max(...geometry.map(r=>r.x+r.width)),bottom=Math.max(...geometry.map(r=>r.y+r.height));
      const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
      const x=Math.max(0,Math.floor(left)-12),y=Math.max(0,Math.floor(top)-12);
      const clip={x,y,width:Math.min(bounds.width,Math.ceil(right)+12)-x,height:Math.min(bounds.height,Math.ceil(bottom)+12)-y};
      assert(clip.width>=700&&clip.height<=1450&&clip.height/clip.width<=1.15,'길이/가독성 조건 미충족');
      const file=lang+'-'+name+'.png';
      // clip은 문서 좌표다. fullPage 없이 넘기면 viewport 밖 카드가 잘리거나 빈 영역이 된다.
      await page.screenshot({path:path.join(output,file),clip,fullPage:true});
      const data=fs.readFileSync(path.join(output,file));
      assert(data.readUInt32BE(16)===clip.width&&data.readUInt32BE(20)===clip.height,'실제 PNG가 요청한 완결 영역과 다름');
      const row={file,lang,name,route,selector,clip,geometry,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),capturedAt:new Date().toISOString(),browserVersion:browser.version(),source:'현재 제품·격리 샘플·실제 브라우저',uiFulltestPass:false};
      rows.push(row);fs.writeFileSync(path.join(output,'capture.json'),JSON.stringify(rows,null,2)+'\n');
      console.log(JSON.stringify({captured:file,width:clip.width,height:clip.height,bytes:data.length}));
      if(name==='client-live')await page.locator('[data-tile="0"] [data-action="stop"]').click();
    }
    await session.close();
  }catch(error){console.error('문서 촬영 실패: '+redactAcceptanceText(error.message,context.accounts.map(a=>a.password)));throw error;}
  finally{await browser.close();}
}});
