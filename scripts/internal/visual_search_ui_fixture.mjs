#!/usr/bin/env node
// 파일 용도: 실제 모델 UI fixture. API 인증 준비와 실제 브라우저 판정을 분리한다.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import dgram from 'node:dgram';import {spawn,execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {reservePort,stopServer,assertPortClosed,bootstrapRecordingUiAuth,createUiAuthPasswords,writeUiLoginHandoff} from './verify_v410_recording_ui_contract.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),reportAt=args.indexOf('--report');
const reportArg=reportAt<0?null:args.splice(reportAt,2)[1];
if(reportAt>=0&&(!reportArg||reportArg.startsWith('--')))throw Error('report path required');
const resultPath=reportArg?path.resolve(reportArg):path.join(repo,'docs/release-artifacts/v4.3.0/development/visual-ui-preparation.json');
if(reportArg&&(!resultPath.startsWith(path.join(repo,'docs/release-artifacts')+path.sep)||fs.existsSync(resultPath)))throw Error('fresh report in release-artifacts required');
function need(value,code){if(!value)throw Error(code);}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function bytes(root){if(!fs.existsSync(root))return 0;const st=fs.lstatSync(root);if(st.isSymbolicLink())return 0;
  return st.isDirectory()?fs.readdirSync(root).reduce((sum,name)=>sum+bytes(path.join(root,name)),0):st.size;}
async function main(){
  need(args.every(value=>['--seed-only','--browser-ready','--evidence'].includes(value)),'known preparation mode');
  const seedOnly=process.argv.includes('--seed-only'),browserReady=process.argv.includes('--browser-ready');
  need(!(seedOnly&&browserReady),'exclusive preparation mode');const holdMs=browserReady?600000:300000;
  const started=Date.now(),temporaryParent=fs.realpathSync(os.tmpdir());
  const root=fs.mkdtempSync(path.join(temporaryParent,'media-server-visual-ui-'));fs.chmodSync(root,0o700);
  const owner=fs.lstatSync(root,{bigint:true}),identity=`${owner.dev}:${owner.ino}:${owner.uid}`;
  const binary=path.join(repo,'build-gst-onnx/media_server'),model=path.join(repo,'models/v430-siglip2');
  const report={schema:'media-server.visual-ui-preparation.v1',featureId:'V430-U01-SEED',status:'RUNNING',
    command:['node','scripts/internal/visual_search_ui_fixture.mjs',...process.argv.slice(2)],startedAtMs:started,preparationBudgetMs:60000,
    uiHoldBudgetMs:seedOnly?0:holdMs,actualUiPass:false,scope:'real V2 codec-derived public sample preparation; main owns browser actions',
    sourceEnabled:false,sourceRecordingEnabled:false,homePolicy:'preserve inherited HOME',checks:[],cleanup:{},commands:[]};
  if(fs.existsSync(resultPath)){const {previousRuns=[],...last}=JSON.parse(fs.readFileSync(resultPath,'utf8'));report.previousRuns=[...previousRuns,last];}
  const save=()=>{fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');};
  let child,httpPort,rtspPort,udp,timer,monitor,primary,stage='owned paths',stdinHandler;
  const check=(value,id,expected,actual)=>{report.checks.push({id,status:value?'PASS':'FAIL',expected,actual});
    if(!value){report.firstFailure??={stage,id,expected,actual};throw Error(id);}};
  const environment={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(root,'tmp'),
    XDG_CACHE_HOME:path.join(root,'cache'),LANG:'C',LC_ALL:'C',GST_REGISTRY:path.join(root,'gst-cache/registry.bin'),
    GST_REGISTRY_1_0:path.join(root,'gst-cache/registry.bin'),MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),
    MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless'};
  const command=(argv,timeout=10000)=>{report.commands.push(argv);try{return execFileSync(argv[0],argv.slice(1),
      {cwd:repo,env:environment,encoding:'utf8',timeout:Math.max(1,Math.min(timeout,60000-(Date.now()-started))),maxBuffer:1024*1024});}
    catch(error){report.firstFailure??={stage,command:argv,expectedExit:0,actualExit:error.status??null,
        stdout:String(error.stdout??'').slice(0,4096),stderr:String(error.stderr??'').slice(0,4096)};throw Error('owned command failed');}};
  try{
    need(fs.realpathSync(binary)===binary,'fixed binary');report.binarySha256=sha(binary);
    report.scriptSha256=sha(fileURLToPath(import.meta.url));report.seedSourceSha256=sha(path.join(repo,'scripts/internal/visual_search_ui_seed.cpp'));
    for(const name of ['data','input','events/snapshots','events/clips','recordings','tmp','cache','gst-cache','seed-build'])
      fs.mkdirSync(path.join(root,name),{recursive:true,mode:0o700});
    const source=path.join(repo,'video/va_four_scene_sample.mp4'),copy=path.join(root,'input/va_four_scene_sample.mp4');
    check(sha(source)==='bba0c676f6cfc5fcad72ecaaf1c8db104d3a96b89329f96ca3108621ec3abb0b','fixed public sample',true,true);
    fs.copyFileSync(source,copy);
    const used=[model,path.join(repo,'third_party/v430-embedding'),path.join(repo,'build-gst-onnx')].reduce((sum,p)=>sum+bytes(p),0);
    report.workspace={beforeBytes:used,reservedTemporaryOnnxBytes:1129352764,fixtureReserveBytes:64*1024*1024,budgetBytes:8*1024**3};
    check(used+1129352764+64*1024*1024<=8*1024**3,'8GiB workspace admission',true,true);
    stage='compile current V2 seed';
    const link=fs.readFileSync(path.join(repo,'build-gst-onnx/CMakeFiles/media_server.dir/link.txt'),'utf8').trim().split(/\s+/);
    const archive=link.indexOf('libmedia_server_runtime.a');need(archive>=0,'current runtime link');
    const flags=command(['pkg-config','--cflags','gstreamer-app-1.0','openssl','sqlite3','glib-2.0']).trim().split(/\s+/);
    const tool=path.join(root,'seed-build/visual-ui-seed');
    command(['c++','-std=c++17','-O2','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_GSTREAMER=1',
      '-DMEDIA_SERVER_USE_OPENSSL=1','-DMEDIA_SERVER_USE_SQLITE3=1','-DMEDIA_SERVER_USE_SIGLIP2=1',
      '-DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1','-I'+path.join(repo,'include'),...flags,
      path.join(repo,'scripts/internal/visual_search_ui_seed.cpp'),path.join(repo,'build-gst-onnx/libmedia_server_runtime.a'),
      ...link.slice(archive+1),'-o',tool],30000);
    stage='identity transformer rejection checks';
    const transformer=path.join(repo,'scripts/internal/v430_fixture_h264_identity.py');
    const transformerChecks=JSON.parse(command(['python3',transformer,'--self-test']).trim());
    report.identityTransformerChecks=transformerChecks;
    check(transformerChecks.status==='PASS'&&transformerChecks.checks.every(item=>item.status==='PASS'),
      'strict identity transformer focused rejection/byte preservation',true,true);
    stage='owned lossless CAVLC codec input';const derivative=path.join(root,'input/va_four_scene_codec_fixture.mp4');
    const codecInput=path.join(root,'input/va_four_scene_codec_input.mp4');
    const codecParameterVersion='v3-cavlc-identity12';
    const codecCommand=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',copy,'-map','0:v:0','-an',
      '-frames:v','240','-fps_mode','passthrough','-c:v','libx264','-preset','veryfast','-qp','0','-pix_fmt','yuv420p',
      '-x264-params','keyint=240:min-keyint=240:scenecut=0:bframes=0:ref=1:threads=1:cabac=0:weightp=0:intra-refresh=0','-map_metadata','-1',
      '-fflags','+bitexact','-flags:v','+bitexact','-movflags','+faststart',codecInput];
    const ffmpegVersion=command(['ffmpeg','-version']).split('\n')[0];command(codecCommand,20000);
    const annexb=path.join(root,'input/codec-input.h264'),identityAnnexb=path.join(root,'input/codec-identity12.h264');
    command(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',codecInput,'-map','0:v:0','-c:v','copy',
      '-bsf:v','h264_mp4toannexb','-f','h264',annexb]);
    stage='strict fixture identity transformation';
    command(['python3',transformer,'--input',annexb,'--output',identityAnnexb,'--report',path.join(root,'identity.json')]);
    report.identityTransformation=JSON.parse(fs.readFileSync(path.join(root,'identity.json'),'utf8'));
    stage='identity fixture MP4 remux';
    const remuxCommand=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-fflags','+genpts','-r','30','-i',identityAnnexb,
      '-map','0:v:0','-an','-c:v','copy','-map_metadata','-1','-fflags','+bitexact','-flags:v','+bitexact','-movflags','+faststart',derivative];
    command(remuxCommand);
    const derivativeSha=sha(derivative),priorDerivative=[...(report.previousRuns??[])].reverse().find(run=>
      run.derivative?.codecParameterVersion===codecParameterVersion&&run.derivative?.sha256);
    report.derivative={codecParameterVersion,sha256:derivativeSha,bytes:fs.statSync(derivative).size,ffmpegVersion,command:codecCommand,
      remuxCommand,codecInputSha256:sha(codecInput),transformCodeSha256:sha(transformer),
      supersedesFailedCodecSha256:'3927802e0dea2f4533f23d7f06c019a1ed43d544b48b6c87502194eb9075bf08',
      publicOriginalSha256:sha(copy),codecOnly:true,qualityFixtureChanged:false};
    if(priorDerivative)check(derivativeSha===priorDerivative.derivative.sha256,'fixed codec derivative reproduction',priorDerivative.derivative.sha256,derivativeSha);
    const decodedHash=file=>command(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-i',file,'-map','0:v:0','-an',
      '-frames:v','240','-c:v','rawvideo','-pix_fmt','yuv420p','-f','hash','-hash','sha256','-'],10000).trim();
    const originalPixels=decodedHash(copy),codecPixels=decodedHash(codecInput),derivativePixels=decodedHash(derivative);
    need(/^SHA256=[0-9a-f]{64}$/.test(originalPixels),'decoded YUV hash format');
    report.derivative.decodedYuv420Sha256=derivativePixels.slice(7);
    check(originalPixels===codecPixels&&codecPixels===derivativePixels,
      'original codec transform decoded YUV420 content exact',originalPixels,{codec:codecPixels,transform:derivativePixels});
    check(sha(source)===report.derivative.publicOriginalSha256&&sha(copy)===report.derivative.publicOriginalSha256,
      'public original unchanged after codec derivation',true,true);
    stage='actual V2 writer seed';const manifest=path.join(root,'seed.json');
    command([tool,path.join(root,'recordings'),derivative,manifest,String(Date.now()),derivativeSha],15000);
    const seed=JSON.parse(fs.readFileSync(manifest,'utf8'));report.seed=seed;
    check(seed.sourceAuCount===240&&seed.width===1280&&seed.height===720&&seed.sourceEvidenceExact&&seed.currentSourceVerified&&
      seed.reopenedUnchanged&&seed.representativePtsNs.length===8&&seed.uniqueOriginalVclCount===240&&
      seed.sourceSha256===derivativeSha&&seed.codecDerivedFixture===true,
      'actual 8-second V2 codec seed and eight exact representatives',true,true);
    if(seedOnly){report.status='SEED_PREPARATION_PASS';report.preparationElapsedMs=Date.now()-started;}
    else{
    fs.writeFileSync(path.join(root,'data/sources.json'),JSON.stringify({sources:[{sourceId:'1',displayName:'공개 4신 녹화 이력',
      kind:'file',file:'va_four_scene_codec_fixture.mp4',enabled:false,recording:{enabled:false}}]}),{flag:'wx',mode:0o600});
    fs.writeFileSync(path.join(root,'data/views.json'),'{"views":[]}',{flag:'wx',mode:0o600});
    stage='owned network ports';rtspPort=await reservePort();httpPort=await reservePort();need(rtspPort!==httpPort,'distinct ports');
    udp=dgram.createSocket('udp4');await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,'127.0.0.1',resolve);});
    const udpPort=udp.address().port;
    Object.assign(environment,{MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',
      MEDIA_SERVER_BUILD_DIR:path.dirname(binary),MEDIA_SERVER_BIN_PATH:binary,MEDIA_SERVER_AUTH_MODE:'auto',
      MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'1',MEDIA_SERVER_ENABLE_LAB:'0',MEDIA_SERVER_ENABLE_AI:'1',
      MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_LISTEN_PORT:String(rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),MEDIA_SERVER_FORCE_RTSP_TCP:'1',MEDIA_SERVER_FILE_ROOT:path.join(root,'input'),
      MEDIA_SERVER_DEFAULT_FILE:derivative,MEDIA_SERVER_STATE_DIR:path.join(root,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(root,'data/users.json'),
      MEDIA_SERVER_SOURCE_REGISTRY:path.join(root,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(root,'data/views.json'),
      MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(root,'data/analysis.json'),MEDIA_SERVER_RECORDING_ENABLED:'1',
      MEDIA_SERVER_EVIDENCE_ENABLED:args.includes('--evidence')?'1':'0',
      MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(root,'recordings'),MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES:'0',
      MEDIA_SERVER_VISUAL_SEARCH_ENABLED:'1',MEDIA_SERVER_VISUAL_SEARCH_MODEL_DIRECTORY:model,
      MEDIA_SERVER_VISUAL_SEARCH_SCAN_SECONDS:'1',MEDIA_SERVER_VISUAL_SEARCH_SAMPLE_SECONDS:'1',
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(root,'events/events.jsonl'),
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR:path.join(root,'events/snapshots'),
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED:'0',MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR:path.join(root,'events/clips'),
      MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',MEDIA_SERVER_WEBRTC_STUN_SERVER:`stun://127.0.0.1:${udpPort}`,MEDIA_SERVER_WEBRTC_TURN_SERVER:''});
    stage='actual model product startup';child=spawn('./server.sh',['foreground'],{cwd:repo,env:environment,stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr])stream.on('data',()=>{});let spawnError=false;child.on('error',()=>{spawnError=true;});
    report.pid=child.pid;report.ports={http:httpPort,rtsp:rtspPort,udp:udpPort};
    const base=`http://127.0.0.1:${httpPort}`;let ready=false;
    while(Date.now()-started<60000&&!ready){need(!spawnError&&child.exitCode===null&&child.signalCode===null,'server premature exit');
      try{const health=await fetch(base+'/health',{signal:AbortSignal.timeout(500)});ready=health.status===200;await health.arrayBuffer();}catch{}
      if(!ready)await new Promise(resolve=>setTimeout(resolve,100));}
    need(ready,'60-second preparation health');
    let cached=false;
    while(Date.now()-started<60000&&!cached){const probe=spawn(tool,['--cache-check',path.join(root,'recordings/visual-cache')],
        {cwd:repo,env:environment,stdio:['ignore','pipe','pipe']});let output='';probe.stdout.on('data',b=>{output+=b;});probe.stderr.on('data',()=>{});
      const exit=await new Promise(resolve=>probe.once('exit',resolve));if(exit===0){report.index=JSON.parse(output);cached=true;}
      else if(exit!==3)throw Error('index cache fixture contract');if(!cached)await new Promise(resolve=>setTimeout(resolve,100));}
    check(cached,'actual product cache eight finite normalized embeddings',true,cached);
    const who=await fetch(base+'/auth/whoami',{redirect:'manual',signal:AbortSignal.timeout(2000)});const whoBody=await who.json();
    check(who.status===200&&whoBody.setupRequired===true&&!fs.existsSync(path.join(root,'data/users.json')),
      'no fixture credentials; browser setup required',true,whoBody.setupRequired===true);
    let loginHandoff;
    if(browserReady){
      stage='isolated API auth preparation';const passwords=createUiAuthPasswords();
      const {accounts}=await bootstrapRecordingUiAuth(base,passwords);
      loginHandoff=writeUiLoginHandoff(root,accounts);
      const users=fs.readFileSync(path.join(root,'data/users.json'),'utf8');
      check(passwords.every(secret=>!users.includes(secret)),'auth store contains no plaintext fixture passwords',true,true);
      report.authPreparation='API fixture bootstrap; not browser setup evidence';
    }
    report.status='READY';report.preparationElapsedMs=Date.now()-started;report.baseUrl=base;
    report.readyAtMs=Date.now();report.holdDeadlineMs=report.readyAtMs+holdMs;report.stopMethod='write stop followed by newline to this owned process stdin';save();
    console.log(JSON.stringify({ready:true,baseUrl:base,loginHandoff,setupUrl:base+'/setup',opsUrl:base+'/ops/events',
      holdDeadlineUtc:new Date(report.holdDeadlineMs).toISOString(),stopMethod:report.stopMethod,
      sourceCollectionEnabled:false,indexedFrames:8,representativePtsNs:seed.representativePtsNs,actualUiPass:false}));
    stage='main-owned browser UI hold';report.maxSampledRssBytes=0;
    await new Promise((resolve,reject)=>{
      let input='';const onInput=chunk=>{input+=chunk;let newline;
        while((newline=input.indexOf('\n'))>=0){const line=input.slice(0,newline).trim();input=input.slice(newline+1);if(line==='stop'){report.stopReason='main-stdin';resolve();}}};
      stdinHandler=onInput;process.stdin.setEncoding('utf8');process.stdin.on('data',onInput);process.stdin.resume();
      timer=setTimeout(()=>{report.stopReason=`${holdMs/1000}-second-deadline`;resolve();},holdMs);
      monitor=setInterval(()=>{if(child.exitCode!==null||child.signalCode!==null){reject(Error('server exited during UI hold'));return;}
        try{const rss=Number(execFileSync('ps',['-o','rss=','-p',String(child.pid)],{encoding:'utf8',timeout:1000}).trim())*1024;
          report.maxSampledRssBytes=Math.max(report.maxSampledRssBytes,rss);if(rss>4*1024**3)reject(Error('sampled process RSS budget'));}catch{reject(Error('RSS observation'));}},1000);
    });
    report.status='PREPARATION_PASS';
    }
  }catch(error){primary=error;report.status='FAIL';report.firstFailure??={stage,expected:'bounded fixture preparation/hold',actual:error.code??error.message};}
  finally{
    clearTimeout(timer);clearInterval(monitor);if(stdinHandler)process.stdin.removeListener('data',stdinHandler);process.stdin.pause();
    if(child){try{report.cleanup.process=await stopServer(child);}catch{report.cleanup.process={exited:child.exitCode!==null||child.signalCode!==null,
      exitCode:child.exitCode,signalCode:child.signalCode,graceful:false};primary??=Error('server cleanup');}}
    for(const [name,port] of [['http',httpPort],['rtsp',rtspPort]])if(port){try{report.cleanup[name]=await assertPortClosed(port);}catch{report.cleanup[name]={closed:false};primary??=Error('port cleanup');}}
    if(udp){await new Promise(resolve=>udp.close(resolve));report.cleanup.udpClosed=true;}
    report.cleanup.root=root;report.cleanup.rootIdentity=identity;
    if(!child||child.exitCode!==null||child.signalCode!==null){try{const st=fs.lstatSync(root,{bigint:true});need(!st.isSymbolicLink()&&st.isDirectory()&&
      `${st.dev}:${st.ino}:${st.uid}`===identity&&path.dirname(fs.realpathSync(root))===temporaryParent,'root ownership');
      report.cleanup.rootBytes=bytes(root);fs.rmSync(root,{recursive:true});report.cleanup.rootAbsent=!fs.existsSync(root);need(report.cleanup.rootAbsent,'root absence');}
      catch{report.cleanup.rootAbsent=false;primary??=Error('root cleanup');}}
    else report.cleanup.rootAbsent=false;
    report.finishedAtMs=Date.now();report.elapsedMs=report.finishedAtMs-started;report.exit=primary?1:0;if(primary)report.status='FAIL';
    save();
  }
  console.log(JSON.stringify({status:report.status,exit:report.exit,actualUiPass:false,cleanup:report.cleanup,
    report:path.relative(repo,resultPath)}));if(primary)process.exitCode=1;
}
main().catch(()=>{console.error('visual UI preparation failed; sanitized report/cleanup may be incomplete');process.exitCode=1;});
