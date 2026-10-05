#!/usr/bin/env node
// 파일 용도: V450-A01 실제 제품 HTTP/Auth/worker/재시작의 격리 단기 검사.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bootstrapRecordingUiAuth,createUiAuthPasswords,reservePort,stopServer,assertPortClosed}
  from './verify_v410_recording_ui_contract.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-va-http-'));
fs.chmodSync(root,0o700);const identity=fs.statSync(root);const started=Date.now();
const report={featureId:'V450-A01',command:'bash scripts/internal/verify_va_review.sh --http-only',startedAtMs:started,
  sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  actualUiPass:false,actualModel:false,checks:[],cleanup:{},status:'RUNNING',root,
  rootIdentity:{dev:identity.dev,ino:identity.ino,uid:identity.uid}};
let child,provider,udp,httpPort,rtspPort,providerPort,timer,expired=false,failed=false,admin;
let delay=false,chatCalls=0,blockedRequests=0,providerError=false,diagnostics='';const pending=new Set(),secrets=[];
const assert=(ok,id)=>{if(!ok)throw Error(id);};
const check=(ok,id)=>{report.checks.push({id,status:ok?'PASS':'FAIL'});assert(ok,id);};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const binary=path.join(repo,'build-gst-onnx/media_server');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
try{
  for(const name of ['data','input','events','recordings','tmp','gst-cache','cache'])fs.mkdirSync(path.join(root,name),{mode:0o700});
  fs.copyFileSync(path.join(repo,'video/sample_h264_video_only.mp4'),path.join(root,'input/sample.mp4'));
  fs.copyFileSync(path.join(repo,'video/sample_h264_video_only.mp4'),path.join(root,'input/second.mp4'));
  fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:['1','2'].map(sourceId=>({sourceId,
    displayName:'fixture '+sourceId,kind:'file',file:sourceId==='1'?'sample.mp4':'second.mp4',enabled:false,recording:{enabled:false}}))}),{mode:0o600});
  fs.writeFileSync(path.join(root,'data/views.json'),'{"views":[]}',{mode:0o600});
  const seed=spawnSync(process.env.MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN,[root,'--seed','unused'],{encoding:'utf8',timeout:10000});
  assert(seed.status===0,'seed');const {packages}=JSON.parse(fs.readFileSync(path.join(root,'seed.json'),'utf8'));
  report.binarySha256=hash(binary);report.fixtureSha256=hash(process.env.MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN);
  provider=http.createServer(async(req,res)=>{
    try {
    let body='';for await(const b of req)body+=b;
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'qwen3-vl:8b-instruct-q4_K_M',digest:'a'.repeat(64)}]}));return;}
    if(req.url!=='/api/chat'){res.writeHead(404);res.end('{}');return;}
    ++chatCalls;const data=JSON.parse(body);
    assert(data.messages[1].images.length===1,'ordered image supplied');
    const finish=()=>{if(!res.destroyed)res.end(JSON.stringify({model:data.model,done:true,done_reason:'stop',message:{role:'assistant',
      content:JSON.stringify({schema:'media-server.va-review-provider.v9',claims:{c0:{claim:JSON.parse(data.messages[data.messages.length-1].content.split('Metadata: ')[1].split('\n')[0]).claim,
        target:'사각형',property:'color',scope:'single',observations:{f0:{identity:'same',visibility:'visible',value:'빨간색'}},
        summary:'빨간 사각형이 보입니다.',verdict:'supported',gaps:{}}},confidence:0.8})}}));};
    if(delay){++blockedRequests;pending.add(res);res.on('close',()=>pending.delete(res));}else finish();
    }catch{providerError=true;if(!res.destroyed){res.writeHead(500);res.end('{}');}}
  });
  await new Promise((resolve,reject)=>{provider.once('error',reject);provider.listen(0,'127.0.0.1',resolve);});providerPort=provider.address().port;
  httpPort=await reservePort();rtspPort=await reservePort();assert(httpPort!==rtspPort,'distinct ports');
  udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
  report.ports={http:httpPort,rtsp:rtspPort,provider:providerPort,udp:udp.address().port};
  const base=`http://127.0.0.1:${httpPort}`;
  const env={PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C',LC_ALL:'C',TMPDIR:path.join(root,'tmp'),XDG_CACHE_HOME:path.join(root,'cache'),
    MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',MEDIA_SERVER_BIN_PATH:binary,
    MEDIA_SERVER_BUILD_DIR:path.dirname(binary),MEDIA_SERVER_AUTH_MODE:'auto',MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',
    MEDIA_SERVER_ENABLE_LAB:'0',MEDIA_SERVER_ENABLE_AI:'1',MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',
    MEDIA_SERVER_LISTEN_PORT:String(rtspPort),MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),MEDIA_SERVER_FORCE_RTSP_TCP:'1',
    MEDIA_SERVER_FILE_ROOT:path.join(root,'input'),MEDIA_SERVER_DEFAULT_FILE:path.join(root,'input/sample.mp4'),
    MEDIA_SERVER_STATE_DIR:path.join(root,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),
    MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),
    MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_RECORDING_ENABLED:'1',
    MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),MEDIA_SERVER_EVIDENCE_ENABLED:'1',MEDIA_SERVER_VISUAL_SEARCH_ENABLED:'0',
    MEDIA_SERVER_VA_REVIEW_ENABLED:'1',MEDIA_SERVER_VA_REVIEW_LOCAL_ENDPOINT:`http://127.0.0.1:${providerPort}`,
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
    MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',
    MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udp.address().port}`,MEDIA_SERVER_WEBRTC_TURN_SERVER:''};
  const call=async(route,options={})=>{assert(!expired,'deadline');return fetch(base+route,{...options,redirect:'manual',signal:AbortSignal.timeout(5000)});};
  const start=async(enabled)=>{
    child=spawn('./server.sh',['foreground'],{cwd:repo,env:{...env,MEDIA_SERVER_VA_REVIEW_ENABLED:enabled?'1':'0'},stdio:['ignore','pipe','pipe']});
    report.pid=child.pid;
    for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{diagnostics=(diagnostics+bytes.toString()).slice(-16384);});
    child.on('error',()=>{failed=true;});
    for(let i=0;i<60;++i){assert(!failed&&child.exitCode===null&&!expired,'server startup');try{const r=await call('/health');await r.arrayBuffer();if(r.status===200)return;}catch{}await pause(100);}
    throw Error('readiness');
  };
  timer=setTimeout(()=>{expired=true;child?.kill('SIGTERM');},Math.max(1,50000-(Date.now()-started)));
  await start(true);
  const passwords=createUiAuthPasswords();secrets.push(...passwords);
  const auth=await bootstrapRecordingUiAuth(base,passwords,async(url,options)=>call(new URL(url).pathname,options));
  secrets.push(...auth.cookies);
  const cookies=auth.cookies;admin=cookies[0];const prefix='/ops/api/recordings/va-reviews';const jobs='/ops/api/recordings/va-review-jobs/';
  const req=async(route,cookie=admin,method='GET',body,expected=200)=>{
    const r=await call(route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},
      ...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
    const text=await r.text();check(r.status===expected,`${method} ${route.split('?')[0]} status ${expected}`);
    if(route.startsWith('/ops/api/recordings/')){
      check(r.headers.get('cache-control')==='no-store'&&r.headers.get('x-content-type-options')==='nosniff','private response headers');
      check(!/passwordHash|passwordHistory|tokenHash|sourceUrl|absolutePath|\/Users\/|\/private\/|file:\/\//i.test(text),'private fields absent');
    }
    return JSON.parse(text);
  };
  const submit=(question,cookie=admin,packageId=packages[0])=>req(prefix,cookie,'POST',{packageId,question,provider:'ollama'},202);
  const waitJob=async(id,state)=>{for(let i=0;i<80;++i){const r=await call(jobs+id,{headers:{Cookie:admin}});const data=await r.json();if(data.state===state)return data;await pause(25);}throw Error('job '+state);};
  for(const route of [prefix+'?packageId='+packages[0],prefix+'/vr-'+'a'.repeat(64),jobs+'vj-'+'b'.repeat(32)+'-1']){
    await req(route,null,'GET',undefined,401);for(const i of [2,4])await req(route,cookies[i],'GET',undefined,403);
  }
  await req(prefix,cookies[1],'POST',{packageId:packages[0],question:'Red?',provider:'ollama'},403);
  await req(prefix+'?packageId='+packages[1],cookies[1],'GET',undefined,403);
  await req(prefix+'?packageId='+packages[0],cookies[3],'GET',undefined,403);
  const listed=await req(prefix+'?packageId='+packages[0],cookies[1]);check(listed.enabled&&!listed.canExecute&&!Object.hasOwn(listed,'externalEnabled'),'read only capabilities');
  for(const body of ['{}','{"packageId":"x","packageId":"y","question":"x","provider":"ollama"}',
    {packageId:packages[0],question:'x',provider:'ollama',url:'http://127.0.0.1'},
    {packageId:packages[0],question:'',provider:'ollama'},{packageId:packages[0],question:'x'.repeat(513),provider:'ollama'}])
    await req(prefix,admin,'POST',body,400);
  await req(prefix,admin,'POST',{packageId:packages[0],question:'Red?',provider:'gemini'},400);await req(prefix,admin,'POST',{packageId:packages[0],question:'Red?',provider:'unknown'},400);check(chatCalls===0,'invalid/forbidden external requests do not call provider');
  const one=await submit('Is a red square visible?');const completed=await waitJob(one.id,'completed');
  const record=await req(prefix+'/'+completed.reviewId);check(record.output.supports[0].frameIndices[0]===0&&record.packageId===packages[0],'result and frame references');
  await req(prefix+'/'+completed.reviewId,cookies[3],'GET',undefined,403);
  const two=await submit('Is a red square visible?');const repeated=await waitJob(two.id,'completed');check(repeated.reviewId!==completed.reviewId,'rerun immutable revision');
  check((await req(prefix+'?packageId='+packages[0])).items.length===2,'history retained');
  const createOperator=async username=>{
    const password=createUiAuthPasswords()[0];
    secrets.push(password);
    await req('/ops/api/users',admin,'POST',{username,displayName:username,role:'operator',scopes:['ops:read','ops:write','source:read:1'],password,enabled:true,mustChangePassword:false},201);
    const login=await call('/login',{method:'POST',body:new URLSearchParams({username,password})});assert(login.status===302,'operator login');await login.arrayBuffer();
    const cookie=login.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');secrets.push(cookie);return cookie;
  };
  const writer=await createOperator('va-writer'),other=await createOperator('va-other');
  delay=true;
  const active=await submit('Cancel owner',writer);await waitJob(active.id,'running');
  await req(jobs+active.id,other,'DELETE',undefined,403);
  await req(jobs+active.id,writer,'DELETE');await waitJob(active.id,'cancelled');check(true,'owner cancellation');
  const active2=await submit('Cancel admin',writer);await waitJob(active2.id,'running');await req(jobs+active2.id,admin,'DELETE');await waitJob(active2.id,'cancelled');check(true,'admin cancellation');
  const before=blockedRequests;const revoked=await submit('Revoked while transmitting',writer);
  for(let i=0;i<80&&blockedRequests===before;++i)await pause(25);check(blockedRequests>before,'provider call began before revocation');
  const usersFile=path.join(root,'data/users.json');const users=JSON.parse(fs.readFileSync(usersFile,'utf8'));
  const rows=Array.isArray(users)?users:users.users;const user=rows.find(v=>v.username==='va-writer');assert(user,'user fixture');
  user.scopes=['ops:read','source:read:1'];fs.writeFileSync(usersFile+'.new',JSON.stringify(users),{mode:0o600});fs.renameSync(usersFile+'.new',usersFile);
  check((await waitJob(revoked.id,'failed')).error==='review-forbidden','current write scope revocation stops provider');
  const logout=await submit('Logout while transmitting',other);await waitJob(logout.id,'running');
  const out=await call('/logout',{method:'POST',headers:{Cookie:other}});await out.arrayBuffer();
  check((await waitJob(logout.id,'failed')).error==='review-forbidden','logout revokes worker authorization');
  check((await req(prefix+'?packageId='+packages[0])).items.length===2,'cancel/revoke/logout publish no result');
  const stopping=await submit('Stop server');await waitJob(stopping.id,'running');
  report.cleanup.firstProcess=await stopServer(child);await assertPortClosed(httpPort);await assertPortClosed(rtspPort);child=null;
  delay=false;await start(false);
  const login=await call('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:passwords[0]})});await login.arrayBuffer();admin=login.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');
  check(!(await req(prefix+'?packageId='+packages[0])).enabled,'disabled capability no execution');
  await req(prefix,admin,'POST',{packageId:packages[0],question:'Red?',provider:'ollama'},503);
  report.cleanup.secondProcess=await stopServer(child);await assertPortClosed(httpPort);await assertPortClosed(rtspPort);child=null;
  await start(true);
  const relogin=await call('/login',{method:'POST',body:new URLSearchParams({username:'admin',password:passwords[0]})});await relogin.arrayBuffer();admin=relogin.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ');
  await req(jobs+one.id,admin,'GET',undefined,410);
  check((await req(prefix+'/'+completed.reviewId)).output.supports.length===1,'persisted record survives restart');
  check((await req(prefix+'?packageId='+packages[0])).items.length===2,'shutdown publishes no result');
  check(!providerError,'provider handler observed no error');check(!expired,'50 second work budget');report.status='PASS';
}catch(error){failed=true;report.status='FAIL';report.failure=error.message.replace(/(?:\/[\w.-]+){2,}/g,'[route]');
  let safe=diagnostics;for(const value of secrets)if(value)safe=safe.split(value).join('[secret]');
  report.failureDiagnostics=safe.split('\n').filter(line=>/error|fail|fatal|invalid/i.test(line)).slice(-12)
    .map(line=>line.replace(/(?:https?|rtsp|stun|turn):\/\/\S+/g,'[url]').replace(/(?:\/[\w.-]+){2,}/g,'[path]'));
}
finally{
  clearTimeout(timer);
  if(child){try{report.cleanup.process=await stopServer(child);}catch{failed=true;report.cleanup.process={exited:child.exitCode!==null||child.signalCode!==null,exitCode:child.exitCode,signalCode:child.signalCode,normal:false};}}
  for(const [name,port] of [['http',httpPort],['rtsp',rtspPort]])if(port){try{report.cleanup[name]=await assertPortClosed(port);}catch{failed=true;report.cleanup[name]={closed:false};}}
  if(provider){try{for(const res of pending)res.destroy();provider.closeAllConnections();await new Promise(resolve=>provider.close(resolve));report.cleanup.provider=providerPort?await assertPortClosed(providerPort):{neverOpened:true};}catch{failed=true;report.cleanup.provider={closed:false};}}
  if(udp){try{await new Promise(resolve=>udp.close(resolve));report.cleanup.udpClosed=true;}catch{failed=true;report.cleanup.udpClosed=!report.ports?.udp;}}
  try{
    assert(!child||child.exitCode!==null||child.signalCode!==null,'active process prevents root cleanup');
    const stat=fs.lstatSync(root);assert(!stat.isSymbolicLink()&&stat.dev===identity.dev&&stat.ino===identity.ino&&stat.uid===process.getuid(),'cleanup ownership');
    fs.rmSync(root,{recursive:true});report.cleanup.rootAbsent=!fs.existsSync(root);assert(report.cleanup.rootAbsent,'cleanup remains');
  }catch{failed=true;report.cleanup.failed=true;}
  report.status=failed?'FAIL':'PASS';report.exit=failed?1:0;report.elapsedMs=Date.now()-started;
  const output=path.join(repo,'docs/release-artifacts/v4.5.0/06-http.json');
  if(fs.existsSync(output)){const old=JSON.parse(fs.readFileSync(output));const {previousRuns=[],...last}=old;report.previousRuns=[...previousRuns,last];}
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure,elapsedMs:report.elapsedMs,cleanup:report.cleanup}));
  process.exitCode=report.exit;
}
