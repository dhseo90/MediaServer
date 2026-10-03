#!/usr/bin/env node
// 파일 용도: 모델 OFF 실제 HTTP의 인증·scope·응답 경계를 소유 fixture에서 검사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bootstrapRecordingUiAuth,createUiAuthPasswords,reservePort,stopServer,assertPortClosed}
  from './verify_v410_recording_ui_contract.mjs';
import {assertLocalIceConfig} from './verify_local_ice_guard.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const route='/ops/api/recordings/visual-search';
const search=route+'?'+new URLSearchParams({text:'A public sample street',channelIds:'1'});
const seek=route+'/seek?'+new URLSearchParams({channelId:'1',hitId:'fixture-hit'});
const status=route+'/status';
function assert(value,message){if(!value)throw Error(message);}
function digest(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}

async function responseCase({call,check,cookie,request,id,expected,disabled=false}){
  const response=await call(request,{headers:cookie?{Cookie:cookie}:{}});
  const text=await response.text();let body;
  try{body=JSON.parse(text);}catch{body=null;}
  const actual={status:response.status,cacheControl:response.headers.get('cache-control'),
    contentType:response.headers.get('content-type'),jsonKeys:body&&typeof body==='object'?Object.keys(body).sort():null};
  check(response.status===expected,id+' status',expected,actual.status);
  check(actual.cacheControl==='no-store',id+' no-store','no-store',actual.cacheControl);
  const validJson=Boolean(body&&typeof body==='object'&&!Array.isArray(body)&&actual.contentType?.startsWith('application/json'));
  check(validJson,id+' JSON',true,validJson);
  if(disabled){
    check(JSON.stringify(body)===JSON.stringify({enabled:false,state:'disabled',channels:[]}),
      id+' disabled public shape','enabled/state/channels only',actual.jsonKeys);
  }else{
    check(actual.jsonKeys?.length===1&&actual.jsonKeys[0]==='error'&&typeof body.error==='string',
      id+' error public shape','error only',actual.jsonKeys);
    if(expected===503)check(body.error==='visual-search-unavailable',id+' allowed service unavailable',
      'visual-search-unavailable',typeof body.error==='string'?'string':'invalid');
  }
  // 응답 값을 보고서로 복사하지 않고 public error/status 전체를 검사한다.
  const leaked=/passwordHash|passwordHistory|tokenHash|mediaRelpath|absolutePath|storeId|modelDirectory|cacheDirectory|embedding|vector|frame_sha256|media_sha256|\/Users\/|\/private\/|third_party\/|models\/|file:\/\//i.test(text);
  check(!leaked,id+' no private material',false,leaked);
}

// enabled UI fixtureでもこの関数の拒否ケースはモデルを呼ばない。actual UI PASSではない。
export async function verifyVisualSearchHttpDenials({cookies,integratorCookie,call,check}){
  assert(cookies?.length===5&&integratorCookie,'HTTP fixture principals missing');
  for(const [label,cookie] of [['viewer',cookies[2]],['integrator',integratorCookie],['no-ops',cookies[4]]])
    for(const [name,request] of [['search',search],['seek',seek],['status',status]])
      await responseCase({call,check,cookie,request,id:`V430-A02 ${label} ${name}`,expected:403});
  for(const [name,request] of [['search',search],['seek',seek]])
    await responseCase({call,check,cookie:cookies[3],request,id:`V430-A02 no-source ${name}`,expected:403});
  for(const [name,request] of [['search',search],['seek',seek],['status',status]])
    await responseCase({call,check,request,id:`V430-A02 anonymous ${name}`,expected:401});
  for(const [label,request] of [
    ['channel2 search',route+'?'+new URLSearchParams({text:'public fixture',channelIds:'2'})],
    ['mixed search',route+'?'+new URLSearchParams({text:'public fixture',channelIds:'1,2'})],
    ['channel2 seek',route+'/seek?'+new URLSearchParams({channelId:'2',hitId:'fixture-hit'})]])
    await responseCase({call,check,cookie:cookies[1],request,id:`V430-A02 ${label}`,expected:403});
  for(const [label,cookie,request,expected] of [
    ['viewer malformed',cookies[2],route+'?channelIds=1',403],
    ['integrator malformed',integratorCookie,route+'/seek?channelId=..',403],
    ['anonymous malformed',null,route+'?channelIds=1',401]])
    await responseCase({call,check,cookie,request,id:`V430-A02 ${label}`,expected});
}

export async function verifyVisualSearchHttpDisabled(context){
  await verifyVisualSearchHttpDenials(context);
  const {cookies,call,check}=context;
  for(const [label,cookie] of [['admin',cookies[0]],['scoped-operator',cookies[1]]]){
    for(const [name,request] of [['search',search],['seek',seek]])
      await responseCase({call,check,cookie,request,id:`V430-A02 ${label} ${name}`,expected:503});
    await responseCase({call,check,cookie,request:status,id:`V430-A02 ${label} status`,expected:200,disabled:true});
  }
  await responseCase({call,check,cookie:cookies[3],request:status,id:'V430-A02 no-source disabled status',expected:200,disabled:true});
  await responseCase({call,check,cookie:cookies[0],request:route+'?channelIds=1',id:'V430-A02 allowed malformed',expected:400});
}

async function integratorSession(cookies,call){
  const password='Aa1!'+crypto.randomBytes(24).toString('base64url');
  const created=await call('/ops/api/users',{method:'POST',headers:{Cookie:cookies[0],'Content-Type':'application/json'},
    body:JSON.stringify({username:'v430-integrator',displayName:'isolated fixture',role:'integrator',
      scopes:['event:read:1','metadata:read:1'],password,enabled:true,mustChangePassword:false})});
  assert(created.ok,'integrator fixture create');await created.arrayBuffer();
  const login=await call('/login',{method:'POST',body:new URLSearchParams({username:'v430-integrator',password})});
  assert(login.status===302,'integrator fixture login');
  const cookie=login.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');await login.arrayBuffer();
  assert(cookie.length>0,'integrator fixture session');return {cookie,password};
}

async function runHarness(){
  const started=Date.now();const temporaryParent=fs.realpathSync(os.tmpdir());
  const root=fs.mkdtempSync(path.join(temporaryParent,'media-server-visual-http-'));fs.chmodSync(root,0o700);
  const ownership=fs.lstatSync(root,{bigint:true});const identity=`${ownership.dev}:${ownership.ino}`;
  const binary=path.join(repo,'build-gst-onnx/media_server');
  const report={schema:'media-server.visual-http-auth.v1',featureId:'V430-A02-HTTP',status:'RUNNING',
    scope:'actual loopback HTTP, model OFF; separate from actual-model API and actual UI',startedAtMs:started,
    command:'node scripts/internal/visual_search_http_checks.mjs',checks:[],cleanup:{},modelInference:false,
    totalBudgetMs:60000,workBudgetMs:45000};
  const output=path.join(repo,'docs/release-artifacts/v4.3.0/development/visual-http.json');
  if(fs.existsSync(output)){const previous=JSON.parse(fs.readFileSync(output,'utf8'));
    const {previousRuns=[],...last}=previous;report.previousRuns=[...previousRuns,last];}
  let child,httpPort,rtspPort,udp,udpPort,timer,expired=false,primary,stage='file preparation';
  const check=(ok,id,expected,actual)=>{report.checks.push({id,status:ok?'PASS':'FAIL',expected,actual});
    if(!ok){report.firstFailure??={id,expected,actual};throw Error(id);} }; 
  try{
    assert(fs.realpathSync(binary)===binary&&fs.statSync(binary).isFile(),'fixed product binary missing');
    report.binarySha256=digest(binary);report.sourceSha256=digest(fileURLToPath(import.meta.url));
    for(const name of ['data','input','events/snapshots','events/clips','recordings','tmp','gst-cache','cache'])
      fs.mkdirSync(path.join(root,name),{recursive:true,mode:0o700});
    const sample=path.join(repo,'video/sample_h264_video_only.mp4');
    fs.copyFileSync(sample,path.join(root,'input/sample_h264_video_only.mp4'));
    fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:['1','2'].map(sourceId=>({sourceId,
      displayName:'isolated disabled source '+sourceId,kind:'file',file:'sample_h264_video_only.mp4',enabled:false,
      recording:{enabled:false}}))}),{mode:0o600,flag:'wx'});
    fs.writeFileSync(path.join(root,'data/views.json'),' {"views":[]}',{mode:0o600,flag:'wx'});
    stage='RTSP loopback port preparation';rtspPort=await reservePort();
    stage='HTTP loopback port preparation';httpPort=await reservePort();assert(rtspPort!==httpPort,'distinct TCP ports');
    stage='UDP loopback port preparation';
    udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
    udpPort=udp.address().port;report.ports={http:httpPort,rtsp:rtspPort,udp:udpPort};
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
      MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_RECORDING_ENABLED:'0',
      MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),MEDIA_SERVER_VISUAL_SEARCH_ENABLED:'0',
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
      MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),
      MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',GST_REGISTRY:path.join(root,'gst-cache/registry.bin'),
      GST_REGISTRY_1_0:path.join(root,'gst-cache/registry.bin'),MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udpPort}`,
      MEDIA_SERVER_WEBRTC_TURN_SERVER:''};
    // 원문 server logs는 저장/출력하지 않는다. 사용 credential은 메모리만 사용한다.
    stage='product server startup';child=spawn('./server.sh',['foreground'],{cwd:repo,env:environment,stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr])stream.on('data',()=>{});
    let spawnError=false;child.on('error',()=>{spawnError=true;});
    report.pid=child.pid;
    // 60초 전체 한도 중 종료·TCP 폐쇄 확인에 15초를 남긴다.
    timer=setTimeout(()=>{expired=true;child.kill('SIGTERM');},Math.max(1,45000-(Date.now()-started)));
    const base=`http://127.0.0.1:${httpPort}`;
    const localFetch=async(url,options={})=>{
      const target=new URL(url);assert(target.origin===base,'nonlocal HTTP request blocked');
      assert(!expired,'HTTP fixture deadline');return fetch(url,{...options,redirect:'manual',
        signal:AbortSignal.timeout(Math.max(1,Math.min(5000,45000-(Date.now()-started))))});};
    let ready=false;
    for(let i=0;i<80&&!ready;++i){assert(!expired&&!spawnError&&child.exitCode===null&&child.signalCode===null,'server readiness');
      try{const response=await localFetch(base+'/health');ready=response.status===200;await response.arrayBuffer();}catch{}
      if(!ready)await new Promise(resolve=>setTimeout(resolve,100));}
    assert(ready,'server readiness timeout');
    stage='isolated auth bootstrap';
    const passwords=createUiAuthPasswords();const {cookies,call}=await bootstrapRecordingUiAuth(base,passwords,localFetch);
    const ice=await call('/webrtc/config',{headers:{Cookie:cookies[0]}});assert(ice.ok,'isolated ICE HTTP');
    assertLocalIceConfig(await ice.json(),udpPort);
    const {cookie:integratorCookie,password:integratorPassword}=await integratorSession(cookies,call);
    stage='actual HTTP role/scope checks';await verifyVisualSearchHttpDisabled({cookies,integratorCookie,call,check});
    const usersFile=path.join(root,'data/users.json');const users=fs.readFileSync(usersFile,'utf8');
    const credentialsAbsent=[...passwords,integratorPassword].every(secret=>!users.includes(secret));
    check(credentialsAbsent,'V430-A02 plaintext credentials absent',true,credentialsAbsent);
    check((fs.statSync(usersFile).mode&0o777)===0o600,'V430-A02 authstore private mode',0o600,fs.statSync(usersFile).mode&0o777);
    assert(!expired,'HTTP fixture deadline');report.status='PASS';
  }catch(error){primary=error;report.status='FAIL';report.firstFailure??={id:stage,expected:'successful isolated run',actual:'sanitized '+(expired?'deadline':error.code??'failure')};}
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
    elapsedMs:report.elapsedMs,modelInference:false,cleanup:report.cleanup,report:path.relative(repo,output)}));
  if(primary)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runHarness().catch(()=>{console.error('V430-A02-HTTP harness failed; sanitized result/cleanup may be incomplete');process.exitCode=1;});
}
