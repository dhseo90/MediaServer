#!/usr/bin/env node
// 파일 용도: 실제 /whep 신호협상과 세션 수명만 검사한다. RTP 수신/ICE 연결/브라우저 PASS가 아니다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reservePort,stopServer,assertPortClosed} from './verify_v410_recording_ui_contract.mjs';
import {assertLocalIceEnvironment,assertLocalIceConfig} from './verify_local_ice_guard.mjs';
import {assertKnownOptions,hasHelpFlag} from './script_arg_utils.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const check=(ok,code)=>{if(!ok)throw Error(code);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const MAX_BODY=65536,MAX_PROCESS=8*1024*1024;
export function selectedMode(args){check(args.length===1&&['--run','--self-test'].includes(args[0]),'invalid-mode');return args[0];}
function sdp(body,direction){
  check(typeof body==='string'&&Buffer.byteLength(body)<=MAX_BODY&&!body.includes('\0'),'sdp-size');
  const lines=body.trimEnd().split(/\r?\n/);
  check(lines[0]==='v=0'&&lines.length<=256&&lines.every(x=>x.length<=2048),'sdp-shape');
  const medias=lines.filter(x=>x.startsWith('m='));
  check(medias.length===1,'sdp-media-count');
  const media=/^m=video ([1-9][0-9]*) UDP\/TLS\/RTP\/SAVPF ([0-9]+(?: [0-9]+)*)$/.exec(medias[0]);
  check(media&&Number(media[1])<=65535,'sdp-video');
  const one=prefix=>{const values=lines.filter(x=>x.startsWith(prefix)).map(x=>x.slice(prefix.length));check(values.length===1,'sdp-attribute');return values[0];};
  const mid=one('a=mid:');check(/^[A-Za-z0-9_-]{1,64}$/.test(mid),'sdp-mid');
  check(one('a=group:BUNDLE ')===mid,'sdp-bundle');
  const directions=lines.filter(x=>/^a=(sendonly|recvonly|sendrecv|inactive)$/.test(x));
  check(directions.length===1&&directions[0]==='a='+direction,'sdp-direction');
  const setup=one('a=setup:');check(direction==='recvonly'?setup==='actpass':['active','passive'].includes(setup),'sdp-setup');
  check(/^[A-Za-z0-9+/]{4,256}$/.test(one('a=ice-ufrag:'))&&/^[A-Za-z0-9+/_-]{4,256}$/.test(one('a=ice-pwd:')),'sdp-ice');
  check(/^sha-256 (?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(one('a=fingerprint:')),'sdp-fingerprint');
  check(lines.includes('a=rtcp-mux'),'sdp-rtcp-mux');
  const maps=lines.map(x=>/^a=rtpmap:([0-9]+) H264\/90000$/i.exec(x)).filter(Boolean);
  check(maps.length===1&&media[2].split(' ').includes(maps[0][1]),'sdp-h264');
  return {mid,payload:Number(maps[0][1])};
}
export const validateOffer=body=>sdp(body,'recvonly');
export function validateCreated(response,offer){
  check(response.status===201,'whep-create-status');
  check(response.contentType?.split(';')[0].trim().toLowerCase()==='application/sdp','whep-create-content-type');
  check(typeof response.location==='string'&&/^\/whep\/session\/[A-Za-z0-9_-]{1,160}$/.test(response.location),'whep-location');
  const answer=sdp(response.body,'sendonly');
  assert(answer.mid===offer.mid&&answer.payload===offer.payload,'whep-answer-offer-mismatch');
  return {location:response.location};
}
export function validateIce(r){
  check(r.status===200&&r.contentType?.startsWith('application/json'),'ice-response');
  const json=JSON.parse(r.body);check(Array.isArray(json.candidates)&&json.candidates.length<=256,'ice-shape');
  check(json.candidates.every(c=>typeof c.candidate==='string'&&c.candidate.length<=2048&&c.sdpMLineIndex===0),'ice-candidate');
  return json.candidates.length;
}
export function validateDeleted(r,repeated){
  check(r.status===(repeated?404:200),'delete-status');
  if(!repeated)check(JSON.parse(r.body)?.ok===true,'delete-body');
}
export function validateMalformed(r){check(r.status===400&&r.location==null&&r.contentType?.split(';')[0]!=='application/sdp'&&typeof r.body==='string'&&r.body.length>0&&!r.body.startsWith('v=0'),'malformed-offer-rejection');}
export function validateProcess(r){check(r.code===0&&!r.signal&&!r.timedOut&&!r.overflow&&!r.spawnError,'native-preparation-failed');}
export function safeProcessFacts(r){return {code:r.code,signal:r.signal??null,bytes:r.bytes,sha256:r.sha256};}
export function safeFailureFacts(error,phase){
  const codes=['EPERM','EACCES','EADDRINUSE','EADDRNOTAVAIL','ENOENT','ENOSPC','EMFILE','ENFILE'];
  const phases=['owned-input','reserve-http','reserve-rtsp','precheck-ports','bind-udp','environment','native-offer','server-ready','ice-config','whep-create','location','ice-read','delete','delete-again','malformed'];
  const reasons=['invalid-mode','sdp-size','sdp-shape','sdp-media-count','sdp-video','sdp-attribute','sdp-mid','sdp-bundle','sdp-direction','sdp-setup','sdp-ice','sdp-fingerprint','sdp-rtcp-mux','sdp-h264','whep-create-status','whep-create-content-type','whep-location','whep-answer-offer-mismatch','ice-response','ice-shape','ice-candidate','delete-status','delete-body','malformed-offer-rejection','native-preparation-failed','cleanup-ownership','global-deadline','http-output-overflow','missing-input','stale-product-build','copy-mismatch','duplicate-port','server-early-exit','server-not-ready','ice-config-status','unsafe-location'];
  return {phase:phases.includes(phase)?phase:'unknown',errno:codes.includes(error?.code)?error.code:'unknown',reason:reasons.includes(error?.message)?error.message:'unknown',rawPublished:false};
}

// 원문 로그를 저장하거나 전달하지 않는다. native SDP만 bounded memory로 부모 oracle에 전달한다.
function childProcess(command,args,env,{timeoutMs,capture=false}={}){
  const child=spawn(command,args,{cwd:repo,env,detached:true,stdio:['ignore','pipe','pipe']});
  const hash=crypto.createHash('sha256');let bytes=0,stdout='',overflow=false,timedOut=false,spawnError=false,closed=false;
  const kill=()=>{if(child.pid&&!closed){try{process.kill(-child.pid,'SIGKILL');}catch{}}};
  const timer=timeoutMs?setTimeout(()=>{timedOut=true;kill();},timeoutMs):null;
  for(const [name,stream]of [['stdout',child.stdout],['stderr',child.stderr]])stream.on('data',data=>{
    bytes+=data.length;hash.update(data);
    if(bytes>MAX_PROCESS||(capture&&name==='stdout'&&Buffer.byteLength(stdout)+data.length>MAX_BODY)){overflow=true;kill();return;}
    if(capture&&name==='stdout')stdout+=data.toString('utf8');
  });
  const done=new Promise(resolve=>{
    child.once('error',()=>{spawnError=true;});
    child.once('close',(code,signal)=>{closed=true;clearTimeout(timer);resolve({code,signal,bytes,sha256:hash.digest('hex'),overflow,timedOut,spawnError,stdout});});
  });
  return {child,done,kill};
}
function directoryBytes(root){const stat=fs.lstatSync(root);return stat.isDirectory()&&!stat.isSymbolicLink()?fs.readdirSync(root).reduce((sum,n)=>sum+directoryBytes(path.join(root,n)),0):stat.size;}
function assertOwned(root,parent){const st=fs.lstatSync(root);check(st.isDirectory()&&!st.isSymbolicLink()&&fs.realpathSync(root)===root&&path.dirname(root)===parent&&/^media-server-whep-local-[A-Za-z0-9]+$/.test(path.basename(root))&&st.uid===process.getuid()&&(st.mode&0o777)===0o700,'cleanup-ownership');}

async function run(){
  process.umask(0o077);
  const started=performance.now(),parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'media-server-whep-local-'));
  fs.chmodSync(root,0o700);
  let stage='WLR01',phase='owned-input',pass=0,fail=0,server,active,udp,udpPort,location,base,env;
  let sourceHash,binaryHash,inputHash,sourceFile,binary,input;
  const ports=[],controller=new AbortController();
  const timer=setTimeout(()=>{controller.abort();active?.kill();server?.kill();},180000);
  const interrupted=()=>{controller.abort();active?.kill();server?.kill();};
  process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
  const passed=(id,detail)=>{pass++;console.log(`[pass] ${id} ${detail}`);};
  const failed=(id,code)=>{fail++;console.log(`[fail] ${id} ${code} rawPublished=false`);};
  async function request(route,options={}){
    check(!controller.signal.aborted,'global-deadline');
    const r=await fetch(base+route,{...options,redirect:'manual',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(4000)])});
    const reader=r.body?.getReader();let size=0;const chunks=[];
    if(reader){try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;check(size<=MAX_BODY,'http-output-overflow');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}}
    return {status:r.status,contentType:r.headers.get('content-type')??'',location:r.headers.get('location'),body:Buffer.concat(chunks).toString('utf8')};
  }
  async function native(command,args,timeoutMs,capture=false){
    active=childProcess(command,args,env,{timeoutMs,capture});const result=await active.done;active=null;
    console.log('[process] '+JSON.stringify(safeProcessFacts(result)));validateProcess(result);return result.stdout;
  }
  try{
    assertOwned(root,parent);
    sourceFile=path.join(repo,'video/sample_h264_video_only.mp4');binary=path.join(repo,'build-gst-onnx/media_server');
    check(fs.statSync(sourceFile).isFile()&&fs.statSync(binary).isFile(),'missing-input');
    for(const relative of ['src/ingress/webrtc_http_server_runtime.cpp','src/ingress/webrtc_egress_session.cpp','src/core/gst_decode_compatibility.cpp','CMakeLists.txt'])check(fs.statSync(path.join(repo,relative)).mtimeMs<=fs.statSync(binary).mtimeMs,'stale-product-build');
    sourceHash=sha(fs.readFileSync(sourceFile));binaryHash=sha(fs.readFileSync(binary));
    for(const name of ['media','data','tmp','gst','events','recordings'])fs.mkdirSync(path.join(root,name),{mode:0o700});
    input=path.join(root,'media/sample.mp4');fs.copyFileSync(sourceFile,input);fs.chmodSync(input,0o600);inputHash=sha(fs.readFileSync(input));check(inputHash===sourceHash,'copy-mismatch');
    phase='reserve-http';const httpPort=await reservePort();ports.push(httpPort);
    phase='reserve-rtsp';const rtspPort=await reservePort();check(httpPort!==rtspPort,'duplicate-port');ports.push(rtspPort);
    phase='precheck-ports';
    for(const port of ports)await assertPortClosed(port);
    phase='bind-udp';
    udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});udpPort=udp.address().port;
    phase='environment';
    env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(root,'tmp'),
      MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',MEDIA_SERVER_BIN_PATH:binary,
      MEDIA_SERVER_ENABLE_AI:'1',MEDIA_SERVER_AUTH_MODE:'off',MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',MEDIA_SERVER_ENABLE_LAB:'1',
      MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_LISTEN_PORT:String(rtspPort),MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),
      MEDIA_SERVER_FILE_ROOT:path.join(root,'media'),MEDIA_SERVER_DEFAULT_FILE:input,MEDIA_SERVER_STATE_DIR:path.join(root,'data'),
      MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
      MEDIA_SERVER_RECORDING_ENABLED:'0',MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),
      MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',GST_REGISTRY:path.join(root,'gst/registry.bin'),GST_REGISTRY_1_0:path.join(root,'gst/registry.bin'),GST_DEBUG:'0',
      MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udpPort}`,MEDIA_SERVER_WEBRTC_TURN_SERVER:'',MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY:'all'};
    assertLocalIceEnvironment(env,udpPort);base=`http://127.0.0.1:${httpPort}`;
    console.log('[environment] '+JSON.stringify({root,platform:process.platform,arch:process.arch,node:process.version,sourceSha256:sourceHash,binarySha256:binaryHash,runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),httpTimeoutMs:4000,nativeTimeoutMs:10000,totalTimeoutMs:180000,rawPublished:false}));
    passed(stage,'owned loopback fixture and original hashes captured');
    stage='WLR02';phase='native-offer';const offerBinary=path.join(root,'offer');
    await native('bash',['-c','set -euo pipefail; source "$1"; media_server_apply_homebrew_gst_env; read -r -a flags <<<"$(pkg-config --cflags --libs gstreamer-webrtc-1.0 gstreamer-sdp-1.0)"; c++ -std=c++17 -Wall -Wextra -Werror -DGST_USE_UNSTABLE_API "$2" "${flags[@]}" -o "$3"','whep-build',path.join(here,'env_common.sh'),path.join(here,'whep_local_offer.cpp'),offerBinary],30000);
    const offer=await native('bash',['-c','set -euo pipefail; source "$1"; media_server_apply_homebrew_gst_env; exec "$2"','whep-offer',path.join(here,'env_common.sh'),offerBinary],10000,true);
    const expected=validateOffer(offer);passed(stage,'native recvonly H264 offer bounded and validated');
    stage='WLR03';phase='server-ready';server=childProcess('./server.sh',['foreground'],env);
    const deadline=performance.now()+10000;let ready=false;
    while(performance.now()<deadline){check(server.child.exitCode===null&&server.child.signalCode===null,'server-early-exit');try{if((await request('/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
    check(ready,'server-not-ready');passed(stage,'owned server ready');
    stage='WLR04';phase='ice-config';const config=await request('/webrtc/config');check(config.status===200,'ice-config-status');assertLocalIceConfig(JSON.parse(config.body),udpPort);passed(stage,'advertised ICE is owned loopback STUN and empty TURN');
    stage='WLR05';phase='whep-create';const created=await request('/whep?file=sample.mp4',{method:'POST',headers:{'Content-Type':'application/sdp'},body:offer});
    location=validateCreated(created,expected).location;passed(stage,'POST offer receives 201 application/sdp compatible H264 sendonly answer');
    stage='WLR06';phase='location';check(/^\/whep\/session\/[A-Za-z0-9_-]{1,160}$/.test(location),'unsafe-location');passed(stage,'relative WHEP Location is safe before follow-up');
    stage='WLR07';phase='ice-read';const count=validateIce(await request(location+'/ice'));passed(stage,`ICE candidate readback shape accepted count=${count} connectivityNotClaimed=true`);
    stage='WLR08';phase='delete';validateDeleted(await request(location,{method:'DELETE'}),false);passed(stage,'DELETE reports ok true');
    stage='WLR09';phase='delete-again';validateDeleted(await request(location,{method:'DELETE'}),true);location=null;passed(stage,'second DELETE is exactly 404');
    stage='WLR10';phase='malformed';validateMalformed(await request('/whep?file=sample.mp4',{method:'POST',headers:{'Content-Type':'application/sdp'},body:'invalid-local-offer'}));passed(stage,'malformed offer is rejected with 400');
  }catch(error){const facts=safeFailureFacts(error,phase);console.log('[failure-facts] '+JSON.stringify(facts));failed(stage,facts.reason);}
  finally{
    let clean=true;
    if(active){active.kill();await active.done;clean=false;}
    if(location&&base&&!controller.signal.aborted){try{await request(location,{method:'DELETE'});}catch{clean=false;}}
    if(server){try{const stopped=await stopServer(server.child);const result=await server.done;console.log('[server-exit] '+JSON.stringify({...safeProcessFacts(result),forced:stopped.forced}));check(!result.overflow&&!result.spawnError&&!result.timedOut,'server-process-failure');}catch{clean=false;}}
    for(const port of ports){try{await assertPortClosed(port);}catch{clean=false;}}
    if(udp){await new Promise(resolve=>{udp.once('close',resolve);try{udp.close();}catch{clean=false;resolve();}});}
    if(clean&&server){passed('WLR11','normal server shutdown and owned TCP/UDP closure');}else{failed('WLR11','shutdown-or-port-cleanup');}
    let inputsUnchanged=false;
    try{
      check(sourceHash&&binaryHash&&inputHash,'input-hashes-missing');
      check(sha(fs.readFileSync(sourceFile))===sourceHash&&sha(fs.readFileSync(binary))===binaryHash&&sha(fs.readFileSync(input))===inputHash,'input-changed');
      inputsUnchanged=true;
    }catch{ /* 입력 관측 실패와 소유 root 정리는 독립으로 판정한다. */ }
    try{
      check(clean,'cleanup-process-incomplete');assertOwned(root,parent);const bytes=directoryBytes(root);fs.rmSync(root,{recursive:true});check(!fs.existsSync(root),'cleanup-root-remains');
      console.log('[cleanup] '+JSON.stringify({root,bytes,absent:true,inputsUnchanged}));
      if(inputsUnchanged)passed('WLR12','original inputs unchanged and owned root absent');else failed('WLR12','input-unchanged-not-proven');
    }catch{failed('WLR12','owned-root-cleanup');console.log('[retained] '+JSON.stringify({root,reason:'cleanup-not-proven'}));}
    clearTimeout(timer);process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);
    console.log('[summary] '+JSON.stringify({pass,fail,complete:fail===0&&pass===12,scope:'local-whep-signaling-lifecycle',rtpPass:false,uiPass:false,releasePass:false,elapsedMs:Math.round(performance.now()-started),tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
    process.exitCode=fail||pass!==12?1:0;
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.length===1&&hasHelpFlag(args)){
      assertKnownOptions(args,['help','h']);
      console.log('사용법: ./server.sh verify-whep-local-signaling --self-test | --run\n격리 loopback 신호협상/수명만 검사. RTP·브라우저·릴리즈 PASS가 아님.');
    }else{
    // 공용 parser보다 먼저 exact shape를 검사하여 임의 CLI 원문이 진단에 출력되지 않게 한다.
    const mode=selectedMode(args);assertKnownOptions(args,['run','self-test']);
    if(mode==='--self-test'){
      const child=spawn(process.execPath,['--test',path.join(here,'verify_whep_local_signaling.test.mjs')],{stdio:'inherit'});
      process.exitCode=await new Promise(resolve=>{child.once('error',()=>resolve(2));child.once('close',code=>resolve(code??2));});
    }else await run();
    }
  }catch{console.error('[fail] preparation-or-invalid-mode rawPublished=false');process.exitCode=2;}
}
