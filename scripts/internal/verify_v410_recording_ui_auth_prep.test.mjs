#!/usr/bin/env node
// 파일 용도: UA01~08 인증 UI 준비의 옵션·비밀·실제 catalog seed를 검증한다. 실제 UI PASS가 아니다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {uiAuthPreparationOptions,createUiAuthPasswords,writeUiLoginHandoff,bootstrapRecordingUiAuth,uiLiveSource,uiSeedEnvironment,createUiSeekFixture,validateUiSeekProbe} from './verify_v410_recording_ui_contract.mjs';
import {validateCurrentUiSeed} from './recording_current_ui_seed.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const startedAt=Date.now();
if(process.argv.includes('--lp26-contract-only')) {
  const current=fs.existsSync(path.join(repo,'scripts/internal/recording_current_ui_seed.mjs'))&&
    fs.readFileSync(path.join(repo,'scripts/internal/verify_v410_recording_ui_contract.mjs'),'utf8').includes("'scripts/internal/verify_recording_current_ui_seed.sh'");
  console.log(`${current?'PASS':'FAIL'}: LP26-U01 current managed UI seed entry contract`);
  process.exit(current?0:1);
}
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-current-ui-seed.')));
let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS: '+name);}catch{fail++;console.log('FAIL: '+name);}}
function assert(x){if(!x)throw Error('assertion');}
function checkSeedCleanup(result, label) {
  check(label, () => {
    const lines = String(result.stdout || '').split(/\r?\n/);
    const cleanup = lines.filter(line => line.startsWith('[cleanup] ')).map(line=>JSON.parse(line.slice(10)));
    assert(result.status === 0 && cleanup.length === 1);
    const target = cleanup[0].path;
    assert(path.isAbsolute(target) && path.normalize(target) === target &&
      path.dirname(target) === fs.realpathSync(os.tmpdir()) &&
      /^media-server-current-ui-seed\.[A-Za-z0-9]+$/.test(path.basename(target)) &&
      Number.isSafeInteger(cleanup[0].bytes)&&cleanup[0].removed===true);
    console.log('[cleanup] '+JSON.stringify(cleanup[0]));
    let absent = false;
    try { fs.lstatSync(target); } catch (error) { absent = error.code === 'ENOENT'; }
    assert(absent);
  });
}
function seedCase(name,anchor,seek='none'){
  const caseRoot=path.join(root,'media-server-current-ui-seed.'+name);fs.mkdirSync(caseRoot);
  // seek 입력은 반드시 seed 소유 parent 아래에만 둔다.
  let input='none';if(seek!=='none'){fs.mkdirSync(path.join(caseRoot,'input'));input=path.join(caseRoot,'input/seek-event.mp4');fs.copyFileSync(seek,input);}
  const manifest=path.join(caseRoot,'manifest.json');
  const run=spawnSync('bash',[path.join(repo,'scripts/internal/verify_recording_current_ui_seed.sh'),path.join(caseRoot,'recordings'),manifest,anchor===null?'unknown':String(anchor),input],
    {cwd:repo,encoding:'utf8',timeout:120000,env:uiSeedEnvironment()});
  for(const line of String(run.stdout||'').split(/\r?\n/).filter(Boolean))console.log(`[seed-${name}] ${line}`);
  const warnings=String(run.stderr||'').split(/\r?\n/).filter(Boolean);
  for(const line of warnings)if(line==='[recording] file evidence unavailable: file evidence profile/bound 오류')console.log(`[seed-${name}] ${line}`);
  checkSeedCleanup(run,`UA08-${name} current seed compile root cleanup`);
  if(run.status!==0){console.log(JSON.stringify({seedCase:name,seedExit:run.status,signal:run.signal,diagnostics:(run.stderr||'').split('\n').filter(x=>/^FAIL:|error:|warning:/.test(x)).slice(0,8)}));throw Error('current seed preparation failed');}
  if(warnings.some(line=>line!=='[recording] file evidence unavailable: file evidence profile/bound 오류'))throw Error('unexpected seed diagnostics: private raw output not emitted');
  const seed=JSON.parse(fs.readFileSync(manifest,'utf8'));const summary=validateCurrentUiSeed(caseRoot,seed);
  console.log('[ui-seed-summary] '+JSON.stringify({case:name,...summary}));return {root:caseRoot,seed};
}
try {
  check('SF01 optional seek fixture is accepted only with explicit UI anchor',()=>{
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000','--ui-seek-fixture']).seekFixture===true);
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000']).seekFixture===false);
    for(const mode of ['--ui-direct','--http-auth']){
      const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/verify_v410_recording_ui_contract.mjs'),mode,'--ui-seek-fixture'],{encoding:'utf8'});
      assert(r.status===1&&/UI anchor required|seek fixture requires UI anchor/.test(r.stderr));
    }
  });
  check('UA01 anchor bounds and unknown options are rejected',()=>{
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000']).anchor===1789084800000);
    for(const args of [[],['--other','1789084800000'],['--ui-anchor-utc-ms','-1'],['--ui-anchor-utc-ms','1.2'],['--ui-anchor-utc-ms','Infinity']]) {
      let rejected=false;try{uiAuthPreparationOptions(args);}catch{rejected=true;}assert(rejected);
    }
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000']).holdMs===3600000);
  });
  const passwords=createUiAuthPasswords();
  check('UA05 inherited anchor and auth values are removed from seed environment',()=>{
    const e=uiSeedEnvironment(null,{PATH:'local',MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA:'foreign',MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS:'1789084800000',MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:passwords[0]});
    assert(!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA'));
    assert(e.PATH==='local'&&!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS')&&!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD'));
    assert(uiSeedEnvironment(1789084800000,{}).MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS==='1789084800000');
  });
  check('UA02 random temporary passwords are distinct with sufficient length',()=>assert(passwords.length===5&&new Set(passwords).size===5&&passwords.every(x=>x.length>=12)));
  check('B08-H01 temporary passwords avoid product policy pattern rejection',()=>assert(passwords.every(x=>/^A!(?:[a-f0-9]{2}-){15}[a-f0-9]{2}-b7$/.test(x))));
  const calls=[];
  const auth=await bootstrapRecordingUiAuth('http://127.0.0.1:1',passwords,async(url,options)=>{
    const route=new URL(url).pathname;calls.push({route,method:options.method,redirect:options.redirect,body:options.body,headers:options.headers});
    return {status:route==='/ops/api/users'?201:302,ok:route==='/ops/api/users',headers:{getSetCookie:()=>['test-session=opaque; HttpOnly']},arrayBuffer:async()=>new ArrayBuffer(0)};
  });
  check('UA03 actual bootstrap function orders setup five logins and four users',()=>{
    assert(calls.map(x=>x.route).join(',')==='/setup,/login,/ops/api/users,/login,/ops/api/users,/login,/ops/api/users,/login,/ops/api/users,/login');
    assert(calls.every(x=>x.method==='POST'&&x.redirect==='manual'));
    const users=calls.filter(x=>x.route==='/ops/api/users').map(x=>JSON.parse(x.body));
    assert(users.map(x=>x.role).join(',')==='operator,viewer,operator,operator');
    assert(JSON.stringify(users.map(x=>x.scopes))===JSON.stringify([['ops:read','source:read:1'],['view:read:1'],['ops:read'],['source:read:1']]));
    assert(auth.cookies.length===5);
  });
  check('UA04 one-time handoff is mode0600 and refuses overwrite',()=>{
    const file=writeUiLoginHandoff(root,auth.accounts);assert((fs.statSync(file).mode&0o777)===0o600);
    assert(JSON.parse(fs.readFileSync(file)).accounts.length===5);
    let rejected=false;try{writeUiLoginHandoff(root,auth.accounts);}catch{rejected=true;}assert(rejected);
    fs.unlinkSync(file);assert(!fs.existsSync(file));
  });
  check('UA07 live source payload distinguishes active quota from blocked reservation',()=>{
    const active=uiLiveSource('3','s06-channel-3.mp4'),blocked=uiLiveSource('4','s06-channel-4.mp4',true);
    assert(active.enabled&&active.recording.enabled&&active.recording.continuousMaxBytes===134217728);
    assert(blocked.recording.continuousMaxBytes===1048576&&blocked.recording.eventMaxBytes===134217728);
  });
  check('UA01 new auth direct mode rejects missing anchor before preparation',()=>{
    const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/verify_v410_recording_ui_contract.mjs'),'--ui-auth-direct'],{encoding:'utf8'});
    assert(r.status!==0 && r.stderr.includes('UI anchor required'));
  });
  const anchored=seedCase('anchored',1789084800000);
  check('UA06 LP26-U02~06 actual managed catalog anchored scenarios and reopen',()=>assert(validateCurrentUiSeed(anchored.root,anchored.seed).known>100));
  const unanchored=seedCase('unknown',null);
  check('UA05 LP26-U02 no anchor remains unknown rather than fake 1970 UTC',()=>{
    const result=validateCurrentUiSeed(unanchored.root,unanchored.seed);assert(result.known===0&&result.unknown>100&&unanchored.seed.anchorUtcMs===null);
  });
  check('LP26-U01~05 invalid anchor duplicate row hash and completeness rejected',()=>{
    const invalid=[s=>{s.anchorUtcMs='1000';},s=>{s.pages[0].items[1]=s.pages[0].items[0];},s=>{s.original.sha256='0'.repeat(64);},s=>{s.jobs[0].outputs.pop();}];
    for(const change of invalid){const seed=structuredClone(anchored.seed);change(seed);let rejected=false;try{validateCurrentUiSeed(anchored.root,seed);}catch{rejected=true;}assert(rejected);}
  });
  fs.mkdirSync(path.join(root,'input'));fs.mkdirSync(path.join(root,'tmp'));
  const seek=createUiSeekFixture(root);
  check('SF02 bounded owned seek fixture generation completes',()=>assert(seek.file===path.join(fs.realpathSync(root),'input/seek-event.mp4')&&seek.sizeBytes>133000&&seek.sizeBytes<=16777216));
  check('SF03 actual H264 silent 1280x720 ten-second first-keyframe fixture',()=>assert(seek.codec==='h264'&&!seek.audio&&seek.width===1280&&seek.height===720&&seek.duration>=9.95&&seek.duration<=10.10&&seek.firstKeyframe));
  console.log('[seek-fixture] '+JSON.stringify({sizeBytes:seek.sizeBytes,duration:seek.duration,codec:seek.codec,width:seek.width,height:seek.height,audio:seek.audio,firstKeyframe:seek.firstKeyframe}));
  check('SF06 malformed media metadata and symlink input directory are rejected',()=>{
    const good={streams:[{codec_type:'video',codec_name:'h264',width:1280,height:720}],format:{duration:'10.0'},packets:[{flags:'K_'}]};
    for(const bad of [{...good,streams:[]},{...good,streams:[...good.streams,{codec_type:'audio'}]},{...good,format:{duration:'11'}},{...good,packets:[{flags:'__'}]}]){let rejected=false;try{validateUiSeekProbe(bad);}catch{rejected=true;}assert(rejected);}
    const badRoot=path.join(root,'bad');fs.mkdirSync(badRoot);fs.symlinkSync(path.join(root,'input'),path.join(badRoot,'input'));let rejected=false;try{createUiSeekFixture(badRoot);}catch{rejected=true;}assert(rejected);fs.unlinkSync(path.join(badRoot,'input'));fs.rmdirSync(badRoot);
  });
  const withSeek=seedCase('seek',1789084800000,seek.file);
  check('SF04 LP26-U08 managed original seek file actual size SHA and duration',()=>{
    const info=withSeek.seed.seek;assert(info&&info.contentType==='video/mp4');
    const file=path.join(withSeek.root,'recordings',info.relativePath);
    assert(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===info.sha256);
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-read_intervals','%+#1','-show_packets','-of','json',file],{encoding:'utf8',timeout:30000});
    assert(probe.status===0);validateUiSeekProbe(JSON.parse(probe.stdout));
  });
  check('SF05 LP26-U08 other originals remain short and actual derived outputs remain MP4',()=>{
    const seed=withSeek.seed;assert(seed.original.sizeBytes<seed.seek.sizeBytes&&seed.jobs.every(j=>j.outputs.every(o=>o.contentType==='video/mp4'&&o.id!==seed.seek.id)));
  });
} finally {
  let bytes=0;function count(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())count(f);else bytes+=fs.lstatSync(f).size;}}count(root);
  fs.rmSync(root,{recursive:true});let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
  check('UA08 test root cleanup',()=>assert(absent));console.log(`[cleanup] ${root} bytes=${bytes} absent=${absent}`);
}
console.log(JSON.stringify({pass,fail,actualUi:false,elapsedMs:Date.now()-startedAt,elapsedSource:'Date.now verifier duration'}));process.exitCode=fail?1:0;
