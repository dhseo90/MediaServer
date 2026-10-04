#!/usr/bin/env node
// 파일 용도: 증거 패키지 HTTP의 역할·scope·비활성·입력 경계를 소유 fixture에서 검사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bootstrapRecordingUiAuth,createUiAuthPasswords,reservePort,stopServer,assertPortClosed,writeUiLoginHandoff}
  from "file:///Users/dhseo/.codex/worktrees/v440-pr77-fixes/mediaServer/scripts/internal/verify_v410_recording_ui_contract.mjs";
import {assertLocalIceConfig} from "file:///Users/dhseo/.codex/worktrees/v440-pr77-fixes/mediaServer/scripts/internal/verify_local_ice_guard.mjs";

const repo="/Users/dhseo/.codex/worktrees/v440-pr77-fixes/mediaServer";
const fixtureBinary=process.env.MEDIA_SERVER_EVIDENCE_FIXTURE_BIN;
const uiMode=process.env.MEDIA_SERVER_EVIDENCE_UI==='1';
const visualMode=process.env.MEDIA_SERVER_EVIDENCE_VISUAL==='1';
function assert(value,message){if(!value)throw Error(message);}
function digest(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
async function verifyEvidenceHttp({cookies,integratorCookie,call,check}){
  const prefix='/ops/api/recordings/';
  const query=new URLSearchParams({channelIds:'1',startTimeMs:'1789084800000',endTimeMs:'1789084801000',snapshotId:'expired',hitId:'not-client-metadata'});
  const requests=[['list',prefix+'evidence?channelId=1','GET'],['detail',prefix+'evidence/ep-'+'a'.repeat(64),'GET'],
    ['asset',prefix+'evidence/ep-'+'a'.repeat(64)+'/assets/0','GET'],['create',prefix+'search/evidence?'+query,'POST'],
    ['visual-create',prefix+'visual-search/evidence?channelId=1&hitId=missing','POST']];
  const verify=async(id,url,method,cookie,expected,headers={})=>{
    const response=await call(url,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{}),...headers},...(method==='POST'?{body:'{}'}:{})});
    const text=await response.text();let body;try{body=JSON.parse(text);}catch{}
    check(response.status===expected,id+' status',expected,response.status);
    check(response.headers.get('cache-control')==='no-store',id+' no-store','no-store',response.headers.get('cache-control'));
    check(Boolean(body&&typeof body.error==='string'),id+' structured error',true,Boolean(body&&typeof body.error==='string'));
    const leaked=/passwordHash|passwordHistory|tokenHash|absolutePath|mediaRelpath|sourceUrl|\/Users\/|\/private\/|file:\/\//i.test(text);
    check(!leaked,id+' private data absent',false,leaked);
  };
  for(const [name,url,method] of requests){
    for(const [role,cookie] of [['viewer',cookies[2]],['integrator',integratorCookie],['no-ops',cookies[4]]])await verify(name+' '+role,url,method,cookie,403);
    await verify(name+' anonymous',url,method,null,401);
    await verify(name+' admin disabled',url,method,cookies[0],503);
  }
  await verify('scoped allowed disabled',prefix+'evidence?channelId=1','GET',cookies[1],503);
  await verify('scoped forbidden channel',prefix+'evidence?channelId=2','GET',cookies[1],403);
  await verify('no source',prefix+'evidence?channelId=1','GET',cookies[3],403);
  await verify('invalid channel',prefix+'evidence?channelId=..','GET',cookies[0],400);
  await verify('invalid asset index',prefix+'evidence/ep-'+'a'.repeat(64)+'/assets/999','GET',cookies[0],400);
  await verify('simple form create denied',prefix+'search/evidence?'+query,'POST',cookies[0],400,{'Content-Type':'text/plain'});
}

async function integratorSession(cookies,call){
  const password='Aa1!'+crypto.randomBytes(24).toString('base64url');
  const created=await call('/ops/api/users',{method:'POST',headers:{Cookie:cookies[0],'Content-Type':'application/json'},
    body:JSON.stringify({username:'v440-integrator',displayName:'isolated fixture',role:'integrator',
      scopes:['event:read:1','metadata:read:1'],password,enabled:true,mustChangePassword:false})});
  assert(created.ok,'integrator fixture create');await created.arrayBuffer();
  const login=await call('/login',{method:'POST',body:new URLSearchParams({username:'v440-integrator',password})});
  assert(login.status===302,'integrator fixture login');
  const cookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.arrayBuffer();
  assert(cookie.length>0,'integrator fixture session');return {cookie,password};
}

async function verifyEnabled({cookies,call,check,seed}){
  const get=async(url,cookie=cookies[0],options={})=>call(url,{...options,headers:{Cookie:cookie,...options.headers}});
  const prefix='/ops/api/recordings/';
  const list=await get(prefix+'evidence?channelId=1');const listed=await list.json();
  check(list.status===200&&listed.items.some(v=>v.id===seed.packageId),'enabled seeded package listing',true,list.status===200&&listed.items.some(v=>v.id===seed.packageId));
  const query=new URLSearchParams({channelIds:'1',startTimeMs:String(seed.startTimeMs),endTimeMs:String(seed.endTimeMs)});
  const found=await get(prefix+'search?'+query);const page=await found.json();
  check(found.status===200&&page.items?.length>0,'current product search returns seeded recording',true,found.status===200&&page.items?.length>0);
  const selection=new URLSearchParams(query);selection.set('snapshotId',page.snapshotId);selection.set('hitId',page.items[0].id);
  const post={method:'POST',headers:{'Content-Type':'application/json'},body:'{}'};
  const created=await get(prefix+'search/evidence?'+selection,cookies[0],post);const made=await created.json();
  check(created.status===201&&/^ep-[a-f0-9]{64}$/.test(made.id),'server snapshot creates immutable evidence',true,created.status===201&&/^ep-[a-f0-9]{64}$/.test(made.id));
  const detail=await get(prefix+'evidence/'+made.id);const body=await detail.json();
  check(detail.status===200&&body.manifest.status==='complete'&&body.manifest.frames.length===8,'created manifest and eight exact frames',true,detail.status===200&&body.manifest.status==='complete'&&body.manifest.frames.length===8);
  const assetUrl=prefix+'evidence/'+made.id+'/assets/0';const asset=await get(assetUrl);const bytes=Buffer.from(await asset.arrayBuffer());
  check(asset.status===200&&crypto.createHash('sha256').update(bytes).digest('hex')===body.manifest.assets[0].sha256,'download bytes match immutable SHA256',true,asset.status===200&&crypto.createHash('sha256').update(bytes).digest('hex')===body.manifest.assets[0].sha256);
  check(asset.headers.get('cache-control')==='no-store'&&asset.headers.get('x-content-type-options')==='nosniff','asset cache/content boundary',true,asset.headers.get('cache-control')==='no-store'&&asset.headers.get('x-content-type-options')==='nosniff');
  const range=await get(assetUrl,cookies[0],{headers:{Range:'bytes=1-7'}});const slice=Buffer.from(await range.arrayBuffer());
  check(range.status===206&&slice.equals(bytes.subarray(1,8)),'byte range exact slice',true,range.status===206&&slice.equals(bytes.subarray(1,8)));
  const head=await get(assetUrl,cookies[0],{method:'HEAD'});
  check(head.status===200&&Number(head.headers.get('content-length'))===bytes.length&&(await head.arrayBuffer()).byteLength===0,'asset HEAD no body and full length',true,head.status===200&&Number(head.headers.get('content-length'))===bytes.length);
  const expect=async(id,url,cookie,status,options={})=>{const response=await get(url,cookie,options);await response.arrayBuffer();check(response.status===status,id,status,response.status);};
  await expect('range outside asset',assetUrl,cookies[0],416,{headers:{Range:'bytes='+bytes.length+'-'}});
  for(const [name,cookie] of [['viewer',cookies[2]],['without source',cookies[3]]]){
    await expect(name+' detail blocked',prefix+'evidence/'+made.id,cookie,403);
    await expect(name+' asset blocked',assetUrl,cookie,403);
  }
  await expect('read-only operator cannot create',prefix+'search/evidence?'+selection,cookies[1],403,post);
  await expect('allowed operator reads asset',assetUrl,cookies[1],200);
  const invalid=new URLSearchParams(selection);invalid.set('snapshotId','malformed');
  await expect('malformed snapshot rejected',prefix+'search/evidence?'+invalid,cookies[0],400,post);
  const expired=new URLSearchParams(selection);expired.set('snapshotId','0'.repeat(32));
  await expect('expired snapshot cannot create',prefix+'search/evidence?'+expired,cookies[0],410,post);
  const forged=new URLSearchParams(selection);forged.set('hitId','forged');
  await expect('forged hit cannot create',prefix+'search/evidence?'+forged,cookies[0],410,post);
  await expect('missing valid ID',prefix+'evidence/ep-'+'b'.repeat(64),cookies[0],404);
}

async function runHarness(){
  const started=Date.now();const temporaryParent=fs.realpathSync(os.tmpdir());
  const root=fs.mkdtempSync(path.join(temporaryParent,'media-server-evidence-http-'));fs.chmodSync(root,0o700);
  const ownership=fs.lstatSync(root,{bigint:true});const identity=`${ownership.dev}:${ownership.ino}`;
  const binary=path.join(repo,'build-pr77/media_server');
  const workBudgetMs=uiMode?345000:45000;
  const report={schema:'media-server.evidence-http-auth.v1',featureId:uiMode?'V440-U01-PREPARATION':'V440-A01-HTTP',status:'RUNNING',
    scope:'actual loopback HTTP, model OFF; separate from actual-model API and actual UI',startedAtMs:started,
    command:'node scripts/internal/evidence_http_checks.mjs',checks:[],cleanup:{},modelInference:false,
    totalBudgetMs:workBudgetMs+15000,workBudgetMs,actualUiPass:false};
  const output=process.env.MEDIA_SERVER_V440_UI_PREPARATION_RESULT;
  if(fs.existsSync(output)){const previous=JSON.parse(fs.readFileSync(output,'utf8'));
    const {previousRuns=[],...last}=previous;report.previousRuns=[...previousRuns,last];}
  let child,httpPort,rtspPort,udp,udpPort,timer,expired=false,primary,stage='file preparation',diagnostics='';
  const secrets=[];
  const check=(ok,id,expected,actual)=>{report.checks.push({id,status:ok?'PASS':'FAIL',expected,actual});
    if(!ok){report.firstFailure??={id,expected,actual};throw Error(id);} };
  try{
    assert(fs.realpathSync(binary)===binary&&fs.statSync(binary).isFile(),'fixed product binary missing');
    report.binarySha256=digest(binary);report.sourceSha256=digest(fileURLToPath(import.meta.url));
    for(const name of ['data','input','events/snapshots','events/clips','recordings','tmp','gst-cache','cache'])
      fs.mkdirSync(path.join(root,name),{recursive:true,mode:0o700});
    const sample="/Users/dhseo/Workspace/mediaServer/video/sample_h264_video_only.mp4";
    fs.copyFileSync(sample,path.join(root,'input/sample_h264_video_only.mp4'));
    fs.copyFileSync(sample,path.join(root,'input/second_h264.mp4'));
    fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:['1','2'].map(sourceId=>({sourceId,
      displayName:'isolated disabled source '+sourceId,kind:'file',file:sourceId==='1'?'sample_h264_video_only.mp4':'second_h264.mp4',enabled:false,
      recording:{enabled:false}}))}),{mode:0o600,flag:'wx'});
    fs.writeFileSync(path.join(root,'data/views.json'),' {"views":[]}',{mode:0o600,flag:'wx'});
    stage='RTSP loopback port preparation';rtspPort=await reservePort();
    stage='HTTP loopback port preparation';httpPort=await reservePort();assert(rtspPort!==httpPort,'distinct TCP ports');
    stage='UDP loopback port preparation';
    udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
    udpPort=udp.address().port;report.ports={http:httpPort,rtsp:rtspPort,udp:udpPort};
    let seed;
    if(fixtureBinary){
      stage='actual recording fixture';
      const prepared=spawnSync(fixtureBinary,[root,'--seed'],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
      assert(prepared.status===0,'native seed failed');seed=JSON.parse(fs.readFileSync(path.join(root,'seed.json'),'utf8'));
      report.fixtureSha256=digest(fixtureBinary);
    }
    // HOME은 기존 사용자 값을 보존하고 cache/temp·제품 상태만 소유 경로로 격리한다.
    const environment={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(root,'tmp'),
      XDG_CACHE_HOME:path.join(root,'cache'),LANG:'C',LC_ALL:'C',
      MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',
      MEDIA_SERVER_BUILD_DIR:path.dirname(binary),MEDIA_SERVER_BIN_PATH:binary,MEDIA_SERVER_AUTH_MODE:'auto',
      MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',MEDIA_SERVER_ENABLE_LAB:'0',MEDIA_SERVER_ENABLE_AI:'1',
      MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',
      MEDIA_SERVER_LISTEN_PORT:String(rtspPort),MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),MEDIA_SERVER_FORCE_RTSP_TCP:'1',
      MEDIA_SERVER_FILE_ROOT:path.join(root,'input'),MEDIA_SERVER_DEFAULT_FILE:path.join(root,'input/sample_h264_video_only.mp4'),
      MEDIA_SERVER_STATE_DIR:path.join(root,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),
      MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),
      MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_RECORDING_ENABLED:fixtureBinary?'1':'0',
      MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),MEDIA_SERVER_VISUAL_SEARCH_ENABLED:'0',MEDIA_SERVER_EVIDENCE_ENABLED:process.env.MEDIA_SERVER_V440_UI_DISABLED==='1'?'0':fixtureBinary?'1':'0',
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
      MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),
      MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',GST_REGISTRY:path.join(root,'gst-cache/registry.bin'),
      GST_REGISTRY_1_0:path.join(root,'gst-cache/registry.bin'),MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udpPort}`,
      MEDIA_SERVER_WEBRTC_TURN_SERVER:''};
    if(visualMode){environment.MEDIA_SERVER_VISUAL_SEARCH_ENABLED='1';
      environment.MEDIA_SERVER_VISUAL_SEARCH_MODEL_DIRECTORY="/Users/dhseo/Workspace/mediaServer/models/v430-siglip2";
      environment.MEDIA_SERVER_VISUAL_SEARCH_SCAN_SECONDS='1';environment.MEDIA_SERVER_VISUAL_SEARCH_SAMPLE_SECONDS='1';
      report.modelInference=true;
    }
    // 원문 server logs는 저장/출력하지 않는다. 사용 credential은 메모리만 사용한다.
    stage='product server startup';child=spawn('./server.sh',['foreground'],{cwd:repo,env:environment,stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{diagnostics=(diagnostics+bytes.toString()).slice(-32768);});
    let spawnError=false;child.on('error',()=>{spawnError=true;});
    report.pid=child.pid;
    // 60초 전체 한도 중 종료·TCP 폐쇄 확인에 15초를 남긴다.
    timer=setTimeout(()=>{expired=true;child.kill('SIGTERM');},Math.max(1,workBudgetMs-(Date.now()-started)));
    const base=`http://127.0.0.1:${httpPort}`;
    const localFetch=async(url,options={})=>{
      const target=new URL(url);assert(target.origin===base,'nonlocal HTTP request blocked');
      assert(!expired,'HTTP fixture deadline');return fetch(url,{...options,redirect:'manual',
        signal:AbortSignal.timeout(Math.max(1,Math.min(5000,workBudgetMs-(Date.now()-started))))});};
    let ready=false;
    for(let i=0;i<80&&!ready;++i){assert(!expired&&!spawnError&&child.exitCode===null&&child.signalCode===null,'server readiness');
      try{const response=await localFetch(base+'/health');ready=response.status===200;await response.arrayBuffer();}catch{}
      if(!ready)await new Promise(resolve=>setTimeout(resolve,100));}
    assert(ready,'server readiness timeout');
    stage='isolated auth bootstrap';
    const passwords=createUiAuthPasswords();secrets.push(...passwords);const {cookies,call,accounts}=await bootstrapRecordingUiAuth(base,passwords,localFetch);
    const ice=await call('/webrtc/config',{headers:{Cookie:cookies[0]}});assert(ice.ok,'isolated ICE HTTP');
    assertLocalIceConfig(await ice.json(),udpPort);
    const {cookie:integratorCookie,password:integratorPassword}=await integratorSession(cookies,call);
    secrets.push(integratorPassword,...cookies,integratorCookie);
    stage='actual HTTP role/scope checks';
    if(uiMode){
      writeUiLoginHandoff(root,accounts);
      report.cleanup={root,rootIdentity:identity,rootAbsent:false};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
      console.log(JSON.stringify({ready:true,baseUrl:base,root,seed,actualUiPass:false}));
      await new Promise((resolve,reject)=>{const poll=setInterval(()=>{
        if(expired||child.exitCode!==null||child.signalCode!==null){clearInterval(poll);reject(Error('UI preparation ended'));}
        else if(fs.existsSync(path.join(root,'ui-stop'))){clearInterval(poll);resolve();}
      },200);});
    }else if(visualMode){
      let state;const until=Date.now()+15000;
      do{const response=await call('/ops/api/recordings/visual-search/status',{headers:{Cookie:cookies[0]}});state=await response.json();
        if(state.searchAvailable&&state.channels?.some(c=>c.indexedFrames>0))break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }while(Date.now()<until);
      check(state.searchAvailable&&state.channels.some(c=>c.indexedFrames>0),'actual model index ready',true,Boolean(state.searchAvailable&&state.channels?.some(c=>c.indexedFrames>0)));
      const response=await call('/ops/api/recordings/visual-search?channelIds=1&text=ball&threshold=-1&limit=1',{headers:{Cookie:cookies[0]}});
      const found=await response.json();check(response.status===200&&found.items?.length===1,'actual model search hit',true,response.status===200&&found.items?.length===1);
      const selected=new URLSearchParams({channelId:'1',hitId:found.items[0].id});
      const created=await call('/ops/api/recordings/visual-search/evidence?'+selected,{method:'POST',headers:{Cookie:cookies[0],'Content-Type':'application/json'},body:'{}'});
      const saved=await created.json();check(created.status===201,'actual visual hit creates package',201,created.status);
      const detail=await call('/ops/api/recordings/evidence/'+saved.id,{headers:{Cookie:cookies[0]}});const v=await detail.json();
      check(detail.status===200&&v.manifest.queryKind==='visual'&&v.manifest.frames.length===1&&Boolean(v.manifest.storeId)&&Boolean(v.manifest.mediaEpochId),'visual exact frame and native provenance',true,detail.status===200&&v.manifest.queryKind==='visual'&&v.manifest.frames.length===1&&Boolean(v.manifest.storeId)&&Boolean(v.manifest.mediaEpochId));
    }else if(fixtureBinary)await verifyEnabled({cookies,call,check,seed});
    else await verifyEvidenceHttp({cookies,integratorCookie,call,check});
    const usersFile=path.join(root,'data/users.json');const users=fs.readFileSync(usersFile,'utf8');
    const credentialsAbsent=[...passwords,integratorPassword].every(secret=>!users.includes(secret));
    check(credentialsAbsent,'V440-A01 plaintext credentials absent',true,credentialsAbsent);
    check((fs.statSync(usersFile).mode&0o777)===0o600,'V440-A01 authstore private mode',0o600,fs.statSync(usersFile).mode&0o777);
    assert(!expired,'HTTP fixture deadline');report.status='PASS';
  }catch(error){primary=error;report.status='FAIL';report.firstFailure??={id:stage,expected:'successful isolated run',actual:'sanitized '+(expired?'deadline':error.code??'failure')};
    let safe=diagnostics;for(const value of secrets)if(value)safe=safe.split(value).join('[secret]');
    report.failureDiagnostics=safe.split('\n').filter(line=>/error|fail|fatal|recording/i.test(line)).slice(-12)
      .map(line=>line.replace(/(?:https?|rtsp|stun|turn):\/\/\S+/g,'[url]').replace(/(?:\/[A-Za-z0-9_.-]+){2,}/g,'[path]'));
  }
  finally{
    clearTimeout(timer);const cleanup=report.cleanup;cleanup.root=root;cleanup.rootIdentity=identity;
    if(child){try{cleanup.process=await stopServer(child);}catch{cleanup.process={exited:child.exitCode!==null||child.signalCode!==null,
      exitCode:child.exitCode,signalCode:child.signalCode,graceful:false};primary??=Error('owned process cleanup');}}
    for(const [name,port] of [['http',httpPort],['rtsp',rtspPort]])if(port){try{cleanup[name]=await assertPortClosed(port);}catch{cleanup[name]={closed:false};primary??=Error('owned port cleanup');}}
    if(udp){await new Promise(resolve=>udp.close(resolve));cleanup.udpClosed=true;}
    const exited=!child||child.exitCode!==null||child.signalCode!==null;
    if(exited){try{const stat=fs.lstatSync(root,{bigint:true});assert(!stat.isSymbolicLink()&&stat.isDirectory()&&`${stat.dev}:${stat.ino}`===identity&&path.dirname(fs.realpathSync(root))===temporaryParent,'owned root cleanup');
      fs.rmSync(root,{recursive:true});cleanup.rootAbsent=!fs.existsSync(root);assert(cleanup.rootAbsent,'owned root absence');}catch{cleanup.rootAbsent=false;primary??=Error('owned root cleanup');}}
    else cleanup.rootAbsent=false;
    report.finishedAtMs=Date.now();report.elapsedMs=report.finishedAtMs-started;
    report.exit=primary?1:0;if(primary)report.status='FAIL';
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({featureId:report.featureId,status:report.status,checks:report.checks.length,
    elapsedMs:report.elapsedMs,modelInference:report.modelInference,cleanup:report.cleanup,report:path.relative(repo,output)}));
  if(primary)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runHarness().catch(()=>{console.error('V440-A01-HTTP harness failed; sanitized result/cleanup may be incomplete');process.exitCode=1;});
}
