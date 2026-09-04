// 승인된 S05 ID 매핑 수정의 실제 foreground 검증. 원본 RED 실행 source는 별도 보존한다.
// 실행은 부모 GO 후에만: node <이 파일> <mktemp로 만든 빈 전용 root>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const self=fileURLToPath(import.meta.url);
const repo=path.resolve(path.dirname(self),'../../../..');
const root=process.argv[2];
const reportPath=path.join(path.dirname(self),'actual-foreground.json');
const rtsp=18765, http=18766, base=`http://127.0.0.1:${http}`;
const stateNames=['.media_server.pid','.media_server.address','.media_server.port','.media_server.log','.media_server.mode','.media_server.launchd.plist'];
const started=Date.now(), rows=[];
let child, childExit, childEnv, before, tapId='', stage='S05-I27-G02';
let outcome='선행조건 미완료', failure='', rootOwned=false;
const report={schema:'media-server.s05.actual-identity-verification.v1',mode:'foreground',rows};
const binary=path.join(repo,'build-gst-onnx/media_server');
let binaryBefore;

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function demand(ok,message){if(!ok)throw new Error(message);}
function digest(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function redact(text){return String(text??'').replaceAll(process.env.HOME||'\0','<기존 HOME>').replaceAll(root||'\0','<run-root>').replace(/(Bearer\s+)[^\s]+/gi,'$1<redacted>').replace(/((?:password|token|secret|cookie)\s*[=:]\s*)[^\s,]+/gi,'$1<redacted>');}
function record(id,ok,detail){const row={id,result:ok?'pass':'fail',detail,elapsedMs:Date.now()-started};rows.push(row);console.log(JSON.stringify(row));}
function guardedSpawn(env,callback){demand(typeof env.HOME==='string'&&env.HOME.length>0,'HOME 누락: 프로세스를 생성하지 않음');return callback();}
function command(cmd,args,env=process.env,timeout=10000){const p=spawnSync(cmd,args,{cwd:repo,env,encoding:'utf8',timeout,maxBuffer:2*1024*1024});return {exit:p.status,signal:p.signal,stdout:p.stdout?.trim()||'',stderr:p.stderr?.trim()||'',error:p.error?.message};}
function checkedCommand(cmd,args,env,timeout){const p=guardedSpawn(env,()=>command(cmd,args,env,timeout));demand(p.exit===0,`${cmd} exit=${p.exit}: ${redact(p.stderr||p.error)}`);return p;}
function listPids(port){const p=command('/usr/sbin/lsof',['-nP','-a',`-iTCP:${port}`,'-sTCP:LISTEN','-Fp']);demand([0,1].includes(p.exit),`lsof ${port} 확인 불가`);return p.stdout.split('\n').filter(x=>x.startsWith('p')).map(x=>Number(x.slice(1)));}
async function freePort(port){demand(listPids(port).length===0,`기존 port ${port} 사용 중`);await new Promise((resolve,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(port,'127.0.0.1',()=>socket.close(resolve));});}
function snapshot(){const names=new Set([...fs.readdirSync(repo).filter(n=>n.startsWith('.media_server')),'.media_server.users.json','.analysis_registry.json','.views.json','scripts/.media_server.env']);const values={};for(const n of [...names].sort()){const f=path.join(repo,n);if(!fs.existsSync(f)){values[n]='absent';continue;}const stat=fs.lstatSync(f);values[n]=stat.isFile()?digest(f):stat.isSymbolicLink()?`link:${fs.readlinkSync(f)}`:'directory';}return values;}
function measure(directory){let files=0,bytes=0;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const f=path.join(directory,entry.name);if(entry.isDirectory()){const subtotal=measure(f);files+=subtotal.files;bytes+=subtotal.bytes;}else{files++;bytes+=fs.lstatSync(f).size;}}return {files,bytes};}
async function api(method,route,body){const response=await fetch(base+route,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});const raw=await response.text();demand(response.ok,`${method} ${route}: HTTP ${response.status} ${redact(raw.slice(0,250))}`);let json;try{json=JSON.parse(raw);}catch{throw new Error(`${method} ${route}: JSON 응답 아님`);}return {status:response.status,json};}
async function until(label,limit,check){const end=Date.now()+limit;while(Date.now()<end){demand(!childExit,`서비스 조기 종료: ${JSON.stringify(childExit)}`);const value=await check();if(value)return value;await delay(500);}throw new Error(`${label}: ${limit}ms 선행조건 deadline 초과`);}
function sql(query){const p=command('/usr/bin/sqlite3',['-readonly','-json',path.join(root,'recordings/recording-catalog.sqlite3'),query]);demand(p.exit===0,`read-only catalog 실패: ${redact(p.stderr)}`);return p.stdout?JSON.parse(p.stdout):[];}
function events(){const file=path.join(root,'events/events.jsonl');if(!fs.existsSync(file))return [];const lines=fs.readFileSync(file,'utf8').split('\n');return lines.slice(0,-1).filter(Boolean).map(x=>JSON.parse(x)).filter(x=>x.eventId&&x.eventType==='presence');}

function makeEnv(){
  demand(process.env.HOME?.length>0,'HOME 누락: 실제 서버/preflight를 생성하지 않음');
  const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:root};
  for(const key of ['USER','LOGNAME'])if(process.env[key]!==undefined)env[key]=process.env[key];
  const local={SKIP_LOCAL_ENV:'1',SKIP_BUILD:'1',ENABLE_AI:'1',BUILD_DIR:path.join(repo,'build-gst-onnx'),LISTEN_ADDRESS:'127.0.0.1',HTTP_LISTEN_ADDRESS:'127.0.0.1',LISTEN_PORT:String(rtsp),HTTP_LISTEN_PORT:String(http),AUTH_MODE:'off',ENABLE_LAB:'1',ENABLE_OPS:'1',FILE_ROOT:path.join(root,'input'),DEFAULT_FILE:path.join(root,'input/identity.mp4'),AUTH_USERS_FILE:path.join(root,'data/users.json'),SOURCE_REGISTRY:path.join(root,'data/sources.json'),PUBLISHED_VIEWS:path.join(root,'data/views.json'),ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),ANALYSIS_EVENT_STORAGE_ENABLED:'1',ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'1',ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),ANALYSIS_EVENT_PRE_EVENT_MS:'500',ANALYSIS_EVENT_POST_EVENT_MS:'500',ANALYSIS_EVENT_CLIP_BUFFER_MS:'3000',ANALYSIS_EVENT_POST_ENABLED:'0',RECORDING_ENABLED:'1',RECORDING_STORAGE_ROOT:path.join(root,'recordings'),RECORDING_SEGMENT_DURATION_SECONDS:'2',RECORDING_RESERVED_FREE_BYTES:'67108864',RECORDING_RETENTION_INTERVAL_MS:'1000',GST_CACHE_DIR:path.join(root,'cache'),ANALYSIS_MODEL:path.join(repo,'models/yolo11n.onnx'),ANALYSIS_LABELS:path.join(repo,'models/coco.names'),ANALYSIS_DETECTOR:'yolo',ANALYSIS_FPS:'8',ANALYSIS_CONFIDENCE:'0.25',ANALYSIS_ADAPTIVE:'0'};
  for(const [key,value]of Object.entries(local))env[`MEDIA_SERVER_${key}`]=value;
  env.GST_REGISTRY=env.GST_REGISTRY_1_0=path.join(root,'cache/registry.bin');
  return Object.freeze(env);
}

try{
  demand(root&&/^\/private\/tmp\/media-server-s05-identity\.[A-Za-z0-9]+$/.test(root),'mktemp 전용 root 인자 필요');
  demand(fs.realpathSync(root)===root&&fs.statSync(root).uid===process.getuid()&&fs.readdirSync(root).length===0,'전용 root 소유·빈 경계 오류');
  demand(!fs.existsSync(reportPath),'기존 실행 보고서를 덮어쓸 수 없음');rootOwned=true;
  let spawnCount=0;const rejected=[];
  for(const candidate of [{}, {HOME:''}]){try{guardedSpawn(candidate,()=>{spawnCount++;});}catch(error){rejected.push(error.message);}}
  demand(rejected.length===2&&spawnCount===0,'HOME guard가 spawn을 차단하지 못함');
  record(stage,true,{cases:2,rejected:2,spawnCount,diagnostic:'HOME 누락: 프로세스를 생성하지 않음'});
  stage='S05-I27-G03';childEnv=makeEnv();demand(childEnv.HOME===process.env.HOME&&Object.isFrozen(childEnv),'HOME 값 또는 환경 불변성 오류');
  const initialEnvDigest=crypto.createHash('sha256').update(JSON.stringify(childEnv)).digest('hex');
  record(stage,true,{homePresent:true,homeUnchanged:true,childEnvFrozen:true,osIdentityKeys:['HOME',...['USER','LOGNAME'].filter(k=>childEnv[k]!==undefined)],priorServiceConfigInherited:false});
  stage='S05-I27-L01';for(const name of stateNames)demand(!fs.existsSync(path.join(repo,name)),`기존 상태 파일: ${name}`);
  const label=command('/bin/launchctl',['print',`gui/${process.getuid()}/com.dhseo.mediaserver`]);
  demand(label.exit===113&&label.stderr.includes('Could not find service'),'기존 launchd 서비스 부재 미확인');
  before=snapshot();for(const port of [rtsp,http])await freePort(port);
  record(stage,true,{launchctlExit:label.exit,serviceAbsent:true,stateFilesAbsent:6,portsFree:[rtsp,http],originalFiles:before});
  stage='S05-I27-L02';for(const dir of ['input','data','events','recordings','cache'])fs.mkdirSync(path.join(root,dir));
  fs.copyFileSync(path.join(repo,'video/imports/va_tracking_event_1280x720_30fps_h264.mp4'),path.join(root,'input/identity.mp4'));
  fs.copyFileSync(path.join(repo,'video/sample_h264_video_only.mp4'),path.join(root,'input/bootstrap.mp4'));
  fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:[{sourceId:'9100',kind:'file',file:'bootstrap.mp4',displayName:'외부 기본 source 방지',enabled:false}]}));
  fs.writeFileSync(path.join(root,'data/views.json'),JSON.stringify({views:[]}));
  record(stage,true,{root,inputBytes:fs.statSync(path.join(root,'input/identity.mp4')).size,bootstrapDisabled:true,actualSourceCreation:'POST API 예정'});
  stage='S05-I27-G04';const brew=checkedCommand('/opt/homebrew/bin/brew',['--prefix'],childEnv);
  demand(brew.stdout==='/opt/homebrew','예상 Homebrew prefix 불일치');record(stage,true,{command:'/opt/homebrew/bin/brew --prefix',exit:brew.exit,prefix:brew.stdout,stderr:redact(brew.stderr)});
  stage='S05-I27-G05';
  const selectedKeys=['HOMEBREW_PREFIX','GST_PLUGIN_SCANNER_1_0','GST_PLUGIN_PATH_1_0','GST_PLUGIN_SYSTEM_PATH_1_0','GST_REGISTRY_1_0'];
  const js=`console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(selectedKeys)}.map(k=>[k,process.env[k]]))))`;
  const shell='set -euo pipefail; source "$1"; media_server_apply_homebrew_gst_env; exec "$2" -e "$3"';
  const common=checkedCommand('/bin/bash',['-c',shell,'s05-preflight',path.join(repo,'scripts/internal/env_common.sh'),process.execPath,js],childEnv,30000);
  const gst=JSON.parse(common.stdout);record(stage,true,{command:'동일 child env: source env_common.sh; media_server_apply_homebrew_gst_env',exit:common.exit,stderr:redact(common.stderr)});
  stage='S05-I27-G06';
  demand(gst.GST_REGISTRY_1_0===path.join(root,'cache/registry.bin'),'registry 격리 불일치');
  demand(fs.realpathSync(path.dirname(gst.GST_REGISTRY_1_0)).startsWith(root+'/'),'registry parent 격리 불일치');
  demand(gst.GST_PLUGIN_SYSTEM_PATH_1_0==='','system plugin path 비어 있지 않음');
  const mirrors=gst.GST_PLUGIN_PATH_1_0?.split(':')||[];
  demand(mirrors.length>0&&mirrors.every(p=>fs.realpathSync(p).startsWith(root+'/cache/')),'plugin mirror 격리 불일치');
  const installedScanner='/opt/homebrew/opt/gstreamer/libexec/gstreamer-1.0/gst-plugin-scanner';
  fs.accessSync(gst.GST_PLUGIN_SCANNER_1_0,fs.constants.X_OK);
  demand(fs.realpathSync(gst.GST_PLUGIN_SCANNER_1_0)===fs.realpathSync(installedScanner),'scanner 설치본 provenance 불일치');
  record(stage,true,{gst,registryInRoot:true,pluginMirrorsInRoot:true,scannerInstalledReadOnly:true,sameInputEnvDigest:initialEnvDigest});
  report.childEnvKeys=Object.keys(childEnv);report.childEnvDigest=initialEnvDigest;
  stage='S05-I27-L03';
  for(const name of stateNames)demand(!fs.existsSync(path.join(repo,name)),`기동 직전 상태 파일 충돌 ${name}`);
  const labelAgain=command('/bin/launchctl',['print',`gui/${process.getuid()}/com.dhseo.mediaserver`]);demand(labelAgain.exit===113&&labelAgain.stderr.includes('Could not find service'),'기동 직전 launchd 충돌');
  for(const port of [rtsp,http])await freePort(port);
  demand(crypto.createHash('sha256').update(JSON.stringify(childEnv)).digest('hex')===initialEnvDigest,'preflight 후 child env 변경');
  binaryBefore={sha256:digest(binary),mtimeMs:fs.statSync(binary).mtimeMs};
  report.binary={path:binary,before:binaryBefore};
  const fd=fs.openSync(path.join(root,'server.log'),'w');
  child=guardedSpawn(childEnv,()=>spawn('./server.sh',['foreground'],{cwd:repo,env:childEnv,stdio:['ignore',fd,fd]}));fs.closeSync(fd);
  child.on('exit',(code,signal)=>{childExit={code,signal};});child.on('error',error=>{childExit={error:error.message};});report.pid=child.pid;
  console.log(JSON.stringify({stage,pid:child.pid,status:'프로세스 생성; 기동 PASS 아님'}));
  const health=await until('HTTP health',30000,async()=>{try{return await api('GET','/health');}catch{return null;}});
  const ownedPorts=[rtsp,http].map(port=>({port,pids:listPids(port)}));demand(ownedPorts.every(p=>p.pids.includes(child.pid)),'health PID/listener 소유 불일치');
  record(stage,true,{command:'./server.sh foreground',pid:child.pid,healthStatus:health.status,childEnvUnchanged:true});
  stage='S05-I27-L04';record(stage,true,{method:'GET',path:'/health',status:health.status,ownedPorts});
  stage='S05-I27-L05';const created=await api('POST','/ops/api/sources',{sourceId:'9101',displayName:'S05 정체성 수정 검증',kind:'file',file:'identity.mp4',enabled:true,recording:{enabled:true,continuousMaxBytes:268435456,eventMaxBytes:268435456,continuousMaxAgeMs:3600000,eventMaxAgeMs:3600000,revision:1}});
  demand(created.status===201&&created.json.ok===true&&created.json.source?.sourceId==='9101','source POST 생성 응답 계약 불일치');
  record(stage,true,{method:'POST',path:'/ops/api/sources',status:created.status,responseStatus:created.json.status,requestedSourceId:'9101'});
  stage='S05-I27-L06';const sourceResponse=await api('GET','/ops/api/sources');const source=sourceResponse.json.sources?.find(s=>s.sourceId==='9101');
  demand(source?.recording?.enabled===true&&source.file==='identity.mp4','source 9101 녹화 readback 실패');
  report.source={sourceId:source.sourceId,kind:source.kind,file:source.file,recording:source.recording};record(stage,true,{method:'GET',path:'/ops/api/sources',status:sourceResponse.status,source:report.source});
  stage='S05-I27-L07';const segments=await until('finalized numeric 채널 녹화',30000,async()=>{const s=sql("SELECT segment_id,source_id,channel_id,stream_epoch_id,start_utc_ms,end_utc_ms,start_pts,end_pts,time_base_num,time_base_den,size_bytes,retention_class,lifecycle,media_relpath FROM recording_segments WHERE channel_id='9101' AND lifecycle='finalized' AND retention_class='continuous'");return s.length?s:null;});
  for(const s of segments){const file=path.resolve(root,'recordings',s.media_relpath);demand(file.startsWith(root+'/recordings/')&&fs.statSync(file).size>0,'finalized MP4 실파일 없음');}
  report.segments=segments;record(stage,true,{readonlySql:true,segments});
  stage='S05-I27-L08';const rule=await api('PUT','/lab/analysis/rules/9101',{id:'9101',priority:100,enabled:true,match:{sourceKind:'file',route:'http'},analysis:{classes:['person']},event:{type:'presence',minConfidence:0.25,region:{type:'polygon',points:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]}},eventActions:{highlight:{enabled:true,mode:'blink',target:'matched-object',durationMs:1500,color:'#00ff00'},post:{enabled:false,method:'POST',url:'',payloadFormat:'media-server.va.event.v1'}}});
  record(stage,true,{method:'PUT',path:'/lab/analysis/rules/9101',status:rule.status,responseStatus:rule.json.status});
  stage='S05-I27-L09';const tap=await api('POST','/lab/analysis/taps?file=identity.mp4&va=1&fps=8&maxQueue=1&trackIds=1');tapId=tap.json.tapId;demand(tap.status===200&&tapId,'실제 tap 생성 응답 계약 불일치');
  report.tap={tapId,streamKey:tap.json.streamKey};record(stage,true,{method:'POST',path:'/lab/analysis/taps',status:tap.status,tap:report.tap});
  stage='S05-I27-L10';let eventResponse;
  const realEvents=await until('presence EventRecord',45000,async()=>{eventResponse=await api('GET',`/lab/analysis/taps/${tapId}/events?dispatch=1`);const r=events();return r.length?r:null;});
  report.events=realEvents.map(e=>({eventId:e.eventId,eventType:e.eventType,channelId:e.channelId,streamId:e.streamId,startTime:e.startTime,updateTime:e.updateTime,endTime:e.endTime,timeBasis:e.timeBasis??'',timeAnchorUtcMs:e.timeAnchorUtcMs??0,timeAnchorPtsMs:e.timeAnchorPtsMs??0,streamEpochId:e.streamEpochId??'',preEventMs:e.preEventMs,postEventMs:e.postEventMs,recordingLinkId:e.recordingLinkId??'',recordingCompleteness:e.recordingCompleteness??'',fallbackPath:e.clipPath??'',fallbackPathExists:!!e.clipPath&&fs.existsSync(e.clipPath)}));
  record(stage,true,{method:'GET',path:`/lab/analysis/taps/${tapId}/events?dispatch=1`,status:eventResponse.status,events:report.events});
  stage='S05-I27-L11';await delay(2500);const links=sql('SELECT * FROM recording_event_links');report.links=links;
  const originalIdentityPreserved=report.events.every(e=>e.streamId===report.tap.streamKey&&e.channelId===report.tap.streamKey);
  const linked=report.events.length>0&&originalIdentityPreserved&&report.events.every(e=>e.recordingLinkId&&links.some(l=>l.event_id===e.eventId&&l.link_id===e.recordingLinkId&&l.source_id==='9101'&&l.channel_id==='9101'));
  outcome=linked?'실제 이벤트 원본 ID 보존 및 numeric 채널 녹화 연결 내구 접수 성공':'실제 이벤트 녹화 연결 또는 원본 ID 보존 실패';
  record(stage,linked,{expected:'원본 EventRecord stream/channel 불변, recordingLinkId와 numeric source/channel 9101 catalog 일치',originalIdentityPreserved,eventChannelIds:report.events.map(e=>e.channelId),segmentChannelIds:segments.map(s=>s.channel_id),links,scope:'내구 접수 검증이며 finalized 구간 coverage·파생 clip 완성 PASS가 아님',fallbackPathExists:report.events.map(e=>e.fallbackPathExists)});
}catch(error){failure=redact(error.message);record(stage,false,{message:failure,classification:'현재 stage 검증 실패; 후속 실행 중단'});}
finally{
  if(child&&!childExit){
    if(tapId){try{const d=await api('DELETE',`/lab/analysis/taps/${tapId}`);demand(d.status===200,'tap DELETE 응답은 200이어야 함');record('S05-I27-L12',true,{method:'DELETE',path:`/lab/analysis/taps/${tapId}`,status:d.status});}catch(error){record('S05-I27-L12',false,{error:redact(error.message)});}}
    try{const processInfo=command('/bin/ps',['-p',String(child.pid),'-o','comm=']);demand(processInfo.exit===0&&processInfo.stdout===path.join(repo,'build-gst-onnx/media_server'),'SIGTERM 전 PID 실행경로 소유 미확인');child.kill('SIGTERM');const end=Date.now()+15000;while(!childExit&&Date.now()<end)await delay(200);demand(childExit?.code===0,`정상 종료 미확인 ${JSON.stringify(childExit)}`);record('S05-I27-L13',true,{pid:child.pid,signal:'SIGTERM',exit:childExit});}catch(error){record('S05-I27-L13',false,{error:redact(error.message)});}
  }else if(child){record('S05-I27-L13',false,{earlyExit:childExit,signalSent:false});}
  if(before){try{const ports=[rtsp,http].map(port=>({port,pids:listPids(port)}));record('S05-I27-L14',ports.every(p=>p.pids.length===0),{ports});const after=snapshot();record('S05-I27-L15',JSON.stringify(before)===JSON.stringify(after),{before,after});}catch(error){record('S05-I27-L15',false,{error:redact(error.message)});}}
  if(binaryBefore){try{const binaryAfter={sha256:digest(binary),mtimeMs:fs.statSync(binary).mtimeMs};report.binary.after=binaryAfter;record('S05-I27-G07',JSON.stringify(binaryBefore)===JSON.stringify(binaryAfter),{binary:report.binary,criterion:'검증 중 실행 바이너리 SHA/mtime 불변'});}catch(error){record('S05-I27-G07',false,{error:redact(error.message)});}}
  report.outcome=outcome;report.failure=failure;report.processExit=childExit;report.elapsedMs=Date.now()-started;report.tokens={start:null,end:null,consumed:null,source:'계측값 미제공'};report.scriptSha256=digest(self);
  if(rootOwned){
    const logFile=path.join(root,'server.log');if(fs.existsSync(logFile)){const raw=fs.readFileSync(logFile,'utf8');report.serverLog={bytes:Buffer.byteLength(raw),lastLines:redact(raw).split('\n').slice(-20)};}
    report.cleanup={path:root,...measure(root),action:!child||childExit?'삭제':'서비스 종료 미확인으로 보존'};
    if(!child||childExit){fs.rmSync(root,{recursive:true});report.cleanup.removed=!fs.existsSync(root);record('S05-I27-L16',report.cleanup.removed,report.cleanup);}else record('S05-I27-L16',false,report.cleanup);
    fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  }
  console.log(JSON.stringify({outcome,failure,report:rootOwned?reportPath:null,elapsedMs:report.elapsedMs}));
  process.exitCode=failure||rows.some(r=>r.result==='fail')?1:0;
}
