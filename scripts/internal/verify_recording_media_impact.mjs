#!/usr/bin/env node
// 파일 용도: HW-03: 기존 codec/ICE 검사만 소유 loopback 환경에서 재사용한다. 실제 브라우저 검사가 아니다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import assertNode from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reservePort, stopServer, assertPortClosed} from './verify_v410_recording_ui_contract.mjs';
import {assertLocalIceEnvironment, assertLocalIceConfig} from './verify_local_ice_guard.mjs';

const modes = ['--providers','--http','--prefix','--run','--self-test'];
export function selectedMode(args) {
  if(args.length!==1||!modes.includes(args[0]))throw Error('invalid-mode');
  return args[0];
}
export function selectedSources(config,mode) {
  const names=mode==='--prefix'?['file_local_h264_aac','file_local_h265_aac','http_local_h264_aac','http_local_h264_video_only']:
    ['http_local_h264_aac','http_local_h264_video_only'];
  if(mode==='--run')return structuredClone(config.sources);
  const result=names.map(name=>{
    const matches=config.sources.filter(s=>s.name===name);
    if(matches.length!==1||!matches[0].enabled||matches[0].requires_network!==false)throw Error('source-selection');
    return structuredClone(matches[0]);
  });
  return result;
}
export function commandPlan(mode) {
  if(mode==='--providers')return [['verify-codecs',2,0]];
  if(mode==='--http')return [['verify-codecs',8,0]];
  if(mode==='--prefix')return [['verify-codecs',28,0]];
  if(mode==='--run')return [['verify-codecs',67,3],['verify-webrtc-ice',8,0]];
  throw Error('invalid-command-mode');
}
// 원시 로그는 소유 root 밖으로 전달하지 않는다. timestamp는 event 자체가 아닌 수신 시각이다.
export class SafeServerObservation {
  constructor(){this.tail='';this.events=[];this.overflow=false;this.ordinals=new Map();}
  feed(chunk,elapsedMs){
    for(const line of (this.tail+chunk).split('\n').slice(0,-1))this.line(line,elapsedMs);
    this.tail=(this.tail+chunk).split('\n').at(-1);
    if(this.tail.length>16384){this.tail='';this.overflow=true;}
  }
  line(line,elapsedMs){
    if(this.events.length>=512){this.overflow=true;return;}
    const lifecycle=line.match(/^\[runtime-debug-counter\] (rtsp\.(?:media\.(?:configured|unprepared)|egress\.(?:started|stopped|destroyed))) session=([A-Za-z0-9_:-]+)$/);
    const ready=line.match(/^\[uri-source\] source ready kind=(http|hls) .* tracks=(\d+) elapsed_ms=(\d+)$/);
    const sample=line.match(/^\[uri-source\] sample ready kind=(video|audio) codec=(h264|aac) /);
    const failure=line.includes('decoder compatibility setup failed')||line.includes('Decoder compatibility setup failed');
    let event;
    if(lifecycle){
      if(!this.ordinals.has(lifecycle[2]))this.ordinals.set(lifecycle[2],this.ordinals.size+1);
      event={event:lifecycle[1],sessionOrdinal:this.ordinals.get(lifecycle[2])};
    }else if(ready)event={event:'uri-ready',kind:ready[1],tracks:Number(ready[2]),elapsedMs:Number(ready[3])};
    else if(sample)event={event:'uri-sample-ready',kind:sample[1],codec:sample[2]};
    else if(failure)event={event:'compatibility-setup-failed'};
    else if(line.includes('pollfd with fd')&&line.includes('Bad file descriptor'))event={event:'glib-bad-fd'};
    else if(line.includes('Could not find component'))event={event:'nice-missing-component'};
    if(!event)return;
    this.events.push({...event,observedElapsedMs:Math.round(elapsedMs)});
  }
  result(){return {events:this.events,overflow:this.overflow,clock:'runner-monotonic-receipt',firstRtpObserved:false};}
}
function selfTest(){
  assertNode.equal(selectedMode(['--http']),'--http');assertNode.throws(()=>selectedMode([]));assertNode.throws(()=>selectedMode(['--unknown']));
  console.log('[pass] HWD01 exact mode parsing rejects unregistered options');
  const fixture={sources:['file_local_h264_aac','file_local_h265_aac','http_local_h264_aac','http_local_h264_video_only'].map(name=>({name,enabled:true,requires_network:false}))};
  assertNode.equal(selectedSources(fixture,'--http').length,2);assertNode.equal(selectedSources(fixture,'--prefix').length,4);
  assertNode.throws(()=>selectedSources({sources:[]},'--http'));assertNode.deepEqual(commandPlan('--run'),[['verify-codecs',67,3],['verify-webrtc-ice',8,0]]);
  console.log('[pass] HWD02 selected source and command expectations remain exact');
  const observer=new SafeServerObservation();observer.feed('[runtime-debug-counter] rtsp.media.configured session=private-token\n[uri-source] source ready kind=http source=http://private/secret tracks=2 elapsed_ms=8\npassword=secret\n',1);
  assertNode.equal(observer.result().events.length,2);assertNode.ok(!JSON.stringify(observer.result()).includes('private'));assertNode.ok(!JSON.stringify(observer.result()).includes('secret'));
  console.log('[pass] HWD03 safe server observations do not publish raw identifiers');
  for(let i=0;i<520;i++)observer.line('[runtime-debug-counter] rtsp.media.configured session=private-token',2);
  assertNode.equal(observer.result().overflow,true);assertNode.equal(observer.result().firstRtpObserved,false);
  assertNode.deepEqual(commandPlan('--providers'),[['verify-codecs',2,0]]);
  console.log('[pass] HWD04 incomplete observation is explicit and provider proof is separate');
  console.log('[summary] pass=4 fail=0');
}
async function main(mode){
if(mode==='--self-test'){selfTest();return;}
// 실행 전용 자식의 기존 /tmp launcher 로그도 0600으로 생성한다. 사용자 전역 설정은 바꾸지 않는다.
process.umask(0o077);
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assert=(ok,code)=>{if(!ok)throw Error(code);};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const started=performance.now(), temp=fs.realpathSync(os.tmpdir());
const root=fs.mkdtempSync(path.join(temp,'media-server-hw-media-'));fs.chmodSync(root,0o700);
const prefix=path.basename(root), owned=new Set(), ports=new Set(), commands=[];
let rtspPort,httpPort;
let server,udp,active,clean=true,udpMessages=0;
const serverObservation=new SafeServerObservation();
function size(p){const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
function ownedPath(p){assert(!fs.existsSync(p),'preexisting-owned-target');owned.add(p);}
function launch(args, env, name){
  const log=path.join(root,name+'.log'),fd=fs.openSync(log,'wx',0o600);
  const child=spawn('./server.sh',args,{cwd:repo,env,detached:true,stdio:['ignore','pipe','pipe']});
  let bytes=0,bounded=true,spawnError=false;
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{
    bytes+=data.length;
    if(bytes<=16*1024*1024){fs.writeSync(fd,data);if(name==='server')serverObservation.feed(data.toString('utf8'),performance.now()-started);}
    else if(bounded){bounded=false;try{process.kill(-child.pid,'SIGTERM');}catch{}}
  });
  const done=new Promise(resolve=>{
    child.once('error',()=>{spawnError=true;});
    child.once('close',(code,signal)=>{fs.closeSync(fd);resolve({code,signal,spawnError,bounded});});
  });
  return {child,log,done};
}
try{
  assert(process.platform==='darwin','unsupported-platform');
  assert(!fs.existsSync(path.join(repo,'scripts/.media_server.env')),'local-env-present');
  rtspPort=await reservePort();ports.add(rtspPort);
  httpPort=await reservePort();assert(!ports.has(httpPort),'duplicate-port');ports.add(httpPort);
  for(const name of ['data','tmp','gst','events','recordings'])fs.mkdirSync(path.join(root,name),{mode:0o700});
  const configBytes=fs.readFileSync(path.join(repo,'config/codec_test_sources.json'));
  const config={sources:selectedSources(JSON.parse(configBytes),mode)};
  for(const source of config.sources){
    if(!source.enabled){assert(source.requires_network===true,'unexpected-disabled-local');continue;}
    assert(source.requires_network===false,'external-enabled');
    source.name=prefix+'-'+source.name;
    if(['http','hls','rtsp'].includes(source.source_kind))assert(new URL(source.source).hostname==='127.0.0.1','nonlocal-source');
    if(source.launcher?.port){
      const old=source.launcher.port,port=await reservePort();assert(!ports.has(port),'duplicate-port');ports.add(port);
      source.launcher.port=port;source.source=source.source.replace(':'+old+'/',':'+port+'/');
    }
    const type=source.launcher?.type;
    if(type){
      const suffix={local_rtsp:'.launcher.log',local_http:'.http.log',local_hls:'.hls.log',whip_publish:'.publisher.log'}[type];
      assert(suffix,'unknown-launcher');ownedPath('/private/tmp/'+source.name+suffix);
      if(type==='local_hls')ownedPath('/private/tmp/'+source.name+'_hls');
    }
  }
  const configFile=path.join(root,'codec-sources.json');fs.writeFileSync(configFile,JSON.stringify(config),{mode:0o600});
  const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(root,'tmp'),
    MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',MEDIA_SERVER_ENABLE_AI:'1',
    MEDIA_SERVER_BIN_PATH:path.join(repo,'build-gst-onnx/media_server'),MEDIA_SERVER_AUTH_MODE:'off',
    MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',MEDIA_SERVER_ENABLE_LAB:'1',
    MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',
    MEDIA_SERVER_LISTEN_PORT:String(rtspPort),MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),
    MEDIA_SERVER_FILE_ROOT:path.join(repo,'video'),MEDIA_SERVER_DEFAULT_FILE:path.join(repo,'video/sample_h264.mp4'),
    MEDIA_SERVER_STATE_DIR:path.join(root,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),
    MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),
    MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',
    MEDIA_SERVER_RECORDING_ENABLED:'0',MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),
    MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',
    GST_REGISTRY:path.join(root,'gst-registry.bin'),GST_REGISTRY_1_0:path.join(root,'gst-registry.bin'),
    MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE:'1',MEDIA_SERVER_VERIFY_CODEC_DIAGNOSTICS_DIR:root,
    MEDIA_SERVER_VERIFY_CODEC_LAUNCHERS_ONLY:mode==='--providers'?'1':'0',
    MEDIA_SERVER_WEBRTC_TURN_SERVER:'',MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL:'0',MEDIA_SERVER_VERIFY_CONFIG:configFile,
    MEDIA_SERVER_VERIFY_WEBRTC_ICE_HTTP_BASE:`http://127.0.0.1:${httpPort}`};
  let udpPort=null;
  if(mode!=='--providers'){
  udp=dgram.createSocket('udp4');udp.on('message',()=>{udpMessages++;});
  await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
  udpPort=udp.address().port;env.MEDIA_SERVER_WEBRTC_STUN_SERVER=`stun://127.0.0.1:${udpPort}`;
  assertLocalIceEnvironment(env,udpPort);
  }
  for(const port of ports)await assertPortClosed(port);
  console.log('[environment] '+JSON.stringify({mode,utc:new Date().toISOString(),platform:process.platform,arch:process.arch,node:process.version,root,rtspPort,httpPort,udpPort,configSha256:sha(configBytes),binarySha256:sha(fs.readFileSync(env.MEDIA_SERVER_BIN_PATH)),runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url)))}));
  if(mode!=='--providers'){
  server=launch(['foreground'],env,'server');let ready=false;
  for(let i=0;i<100;i++){
    assert(server.child.exitCode===null&&server.child.signalCode===null,'server-exited-before-ready');
    try{if((await fetch(`http://127.0.0.1:${httpPort}/health`,{signal:AbortSignal.timeout(500)})).ok){ready=true;break;}}catch{}
    await sleep(100);
  }
  assert(ready,'server-readiness-timeout');console.log('[pass] HW-MEDIA03 owned server ready, loopback ICE only');
  }
  for(const [command,expected,expectedSkip] of commandPlan(mode)){
    if(mode!=='--providers'){
    assertLocalIceEnvironment(env,udpPort);
    const response=await fetch(`http://127.0.0.1:${httpPort}/webrtc/config`,{signal:AbortSignal.timeout(3000)});
    assert(response.ok,'ice-config-http');assertLocalIceConfig(await response.json(),udpPort);
    }
    const begin=performance.now(),epochStart=Math.floor(Date.now()/1000);
    active=launch([command],env,command);const pid=active.child.pid;
    let forceTimer,timedOut=false;
    const timer=setTimeout(()=>{
      timedOut=true;try{process.kill(-pid,'SIGTERM');}catch{}
      forceTimer=setTimeout(()=>{try{process.kill(-pid,'SIGKILL');}catch{}},5000);
    },600000);
    const result=await active.done;clearTimeout(timer);clearTimeout(forceTimer);
    const epochEnd=Math.ceil(Date.now()/1000);
    if(command==='verify-webrtc-ice'){
      const pattern=new RegExp('^media_server_webrtc-ice-(\\d+)-'+pid+'_(candidates\\.ndjson|session\\.json|webrtc_config\\.json|summary\\.json|whip\\.log)$');
      for(const name of fs.readdirSync('/private/tmp')){const m=pattern.exec(name);if(m&&Number(m[1])>=epochStart&&Number(m[1])<=epochEnd)owned.add('/private/tmp/'+name);}
    }
    const raw=fs.readFileSync(active.log,'utf8');
    const passes=raw.split('\n').filter(line=>line.startsWith('[pass] '));
    const failures=raw.split('\n').filter(line=>line.startsWith('[fail] '));
    const skips=raw.split('\n').filter(line=>line.startsWith('[skip] '));
    for(const line of passes)console.log(line.replaceAll(prefix+'-','').replace(/(session created \()[^)]*(\))/,'$1<redacted>$2').replace(/(session 생성: ).*/,'$1<redacted>'));
    for(const line of skips)console.log(line.replaceAll(prefix+'-',''));
    const summary={command,...result,timedOut,elapsedMs:Math.round(performance.now()-begin),pass:passes.length,fail:failures.length,skip:skips.length,rawSha256:sha(raw),rawBytes:Buffer.byteLength(raw)};
    commands.push(summary);console.log('[command] '+JSON.stringify(summary));active=null;
    assert(result.code===0&&result.signal===null&&!result.spawnError&&!timedOut&&result.bounded&&passes.length===expected&&failures.length===0&&skips.length===expectedSkip,'media-command-failed');
  }
}catch(error){console.log('[failure] '+JSON.stringify({code:/^[a-z-]+$/.test(error.message)?error.message:'preparation-or-cleanup-error',rawPublished:false}));process.exitCode=1;}
finally{
  if(active){try{process.kill(-active.child.pid,'SIGTERM');await active.done;}catch{}clean=false;}
  if(server){try{console.log('[server-exit] '+JSON.stringify(await stopServer(server.child)));await server.done;}catch{clean=false;console.log('[failure] server-exit-not-normal');}}
  for(const port of ports){try{await assertPortClosed(port);console.log('[port] '+JSON.stringify({port,closed:true}));}catch{clean=false;console.log('[port] '+JSON.stringify({port,closed:false}));}}
  if(udp)await new Promise(resolve=>{try{udp.close(resolve);}catch{resolve();}});
  console.log('[udp] '+JSON.stringify({used:!!udp,closed:true,messages:udpMessages}));
  if(!clean)process.exitCode=1;
  const manifest={mode,root,owned:[...owned],commands,cleanupReady:clean,exit:process.exitCode??0};
  fs.writeFileSync(path.join(root,'server-diagnostics.json'),JSON.stringify(serverObservation.result(),null,2),{mode:0o600});
  console.log('[server-diagnostics] '+JSON.stringify(serverObservation.result()));
  fs.writeFileSync(path.join(root,'execution.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  // 성공/실패 모두 최소 진단을 먼저 보존한다. main이 hash/개별 결과 이관 뒤 소유 경로만 정리한다.
  console.log('[retained] '+JSON.stringify({root,owned:[...owned],bytes:size(root),reason:'diagnostics-before-cleanup'}));
  console.log('[execution] '+JSON.stringify({exit:process.exitCode??0,elapsedMs:Math.round(performance.now()-started),tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음',browser:false,releasePass:false}));
}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{await main(selectedMode(process.argv.slice(2)));}
  catch{console.error('[fail] invalid-mode-or-preparation');process.exitCode=2;}
}
