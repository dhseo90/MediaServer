#!/usr/bin/env node
// 파일 용도: UA01~08 인증 UI 준비의 옵션·비밀·실제 catalog seed를 검증한다. 실제 UI PASS가 아니다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {uiAuthPreparationOptions,createUiAuthPasswords,writeUiLoginHandoff,bootstrapRecordingUiAuth,uiLiveSource,uiSeedEnvironment,createUiSeekFixture,validateUiSeekProbe} from './verify_v410_recording_ui_contract.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'s09-ui-auth-prep-test-'));
let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log('PASS: '+name);}catch{fail++;console.log('FAIL: '+name);}}
function assert(x){if(!x)throw Error('assertion');}
function checkSeedCleanup(result, label) {
  check(label, () => {
    const lines = String(result.stdout || '').split(/\r?\n/);
    const sizes = lines.map(line => /^(\d+)\t(.+)$/.exec(line)).filter(Boolean);
    const removed = lines.filter(line => line.startsWith('[pass] read-model 임시 root 삭제 확인: '));
    assert(result.status === 0 && sizes.length === 1 && removed.length === 1);
    const target = sizes[0][2];
    assert(path.isAbsolute(target) && path.normalize(target) === target &&
      path.dirname(target) === fs.realpathSync(os.tmpdir()) &&
      /^media-server-s06-read\.[A-Za-z0-9]+$/.test(path.basename(target)) &&
      Number.isSafeInteger(Number(sizes[0][1])));
    assert(removed[0] === `[pass] read-model 임시 root 삭제 확인: ${target}`);
    // 전체 seed 출력은 전달하지 않는다. 검증된 소유 경로·KiB·삭제행만 보존한다.
    console.log(sizes[0][0]);
    console.log(removed[0]);
    let absent = false;
    try { fs.lstatSync(target); } catch (error) { absent = error.code === 'ENOENT'; }
    assert(absent);
  });
}
try {
  check('SF01 optional seek fixture is accepted only with explicit UI anchor',()=>{
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000','--ui-seek-fixture']).seekFixture===true);
    assert(uiAuthPreparationOptions(['--ui-anchor-utc-ms','1789084800000']).seekFixture===false);
    for(const mode of ['--ui-direct','--http-auth']){
      const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/verify_v410_recording_ui_contract.mjs'),mode,'--ui-seek-fixture'],{encoding:'utf8'});
      assert(r.status===1&&r.stderr.includes('seek fixture requires UI auth direct mode'));
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
  check('UA05 inherited anchor and auth values are removed from legacy seed environment',()=>{
    const e=uiSeedEnvironment(null,{PATH:'local',MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA:'foreign',MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS:'1789084800000',MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:passwords[0]});
    assert(!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_RECORDING_UI_EVENT_MEDIA'));
    assert(e.PATH==='local'&&!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS')&&!Object.hasOwn(e,'MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD'));
    assert(uiSeedEnvironment(1789084800000,{}).MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS==='1789084800000');
  });
  check('UA02 random temporary passwords are distinct with sufficient length',()=>assert(passwords.length===5&&new Set(passwords).size===5&&passwords.every(x=>x.length>=12)));
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
  const seed=spawnSync('bash',[path.join(repo,'scripts/internal/verify_v410_recording_timeline.sh'),'--seed-ui',root,path.join(repo,'video/sample_h264_video_only.mp4')],{cwd:repo,encoding:'utf8',timeout:120000,env:{...process.env,MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS:'1789084800000'}});
  checkSeedCleanup(seed, 'UA08-A anchored seed compile root cleanup');
  if(seed.status!==0)console.log(JSON.stringify({seedExit:seed.status,signal:seed.signal,compilerDiagnostics:(seed.stderr||'').split('\n').filter(x=>/error:|warning:/.test(x)).slice(0,8),seedStages:(seed.stderr||'').split('\n').filter(x=>/^\[seed-failure\] [a-z-]+$/.test(x))}));
  check('UA06 actual seed command completes',()=>assert(seed.status===0));
  check('UA06 actual catalog preserves anchored corrupt deleted and pending states',()=>{
    const rows=fs.readFileSync(path.join(root,'recording-mutations.jsonl'),'utf8');
    assert(rows.includes('1789084801000')&&rows.includes('ui-corrupt')&&rows.includes('ui-deleted')&&rows.includes('ui-incomplete')&&rows.includes('deletion_completed'));
    assert(seed.stdout.includes('anchored corrupt/deleted media blocked'));
    assert(!fs.existsSync(path.join(root,'channel-1/ui-deleted.mp4')));
  });
  const legacy=path.join(root,'legacy');fs.mkdirSync(legacy);
  const env={...process.env};delete env.MEDIA_SERVER_VERIFY_RECORDING_UI_ANCHOR_UTC_MS;
  const old=spawnSync('bash',[path.join(repo,'scripts/internal/verify_v410_recording_timeline.sh'),'--seed-ui',legacy,path.join(repo,'video/sample_h264_video_only.mp4')],{cwd:repo,encoding:'utf8',timeout:120000,env});
  checkSeedCleanup(old, 'UA08-B legacy seed compile root cleanup');
  check('UA05 legacy UI seed retains original time and excludes new states',()=>{
    assert(old.status===0);const rows=fs.readFileSync(path.join(legacy,'recording-mutations.jsonl'),'utf8');
    assert(rows.includes('1000')&&!rows.includes('1789084801000')&&!rows.includes('ui-incomplete')&&!rows.includes('ui-corrupt'));
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
  const seekRoot=path.join(root,'seek-catalog');fs.mkdirSync(seekRoot);
  const override=spawnSync('bash',[path.join(repo,'scripts/internal/verify_v410_recording_timeline.sh'),'--seed-ui',seekRoot,path.join(repo,'video/sample_h264_video_only.mp4')],{cwd:repo,encoding:'utf8',timeout:120000,env:uiSeedEnvironment(1789084800000,process.env,seek.file)});
  checkSeedCleanup(override, 'UA08-C seek seed compile root cleanup');
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  check('SF04 only http-event catalog binds actual seek fixture size and SHA',()=>{
    assert(override.status===0);const event=path.join(seekRoot,'channel-1/http-event.mp4');assert(hash(event)===hash(seek.file));
    const rows=fs.readFileSync(path.join(seekRoot,'recording-mutations.jsonl'),'utf8').split('\n').filter(Boolean).map(JSON.parse);
    const finalized=rows.find(row=>row.mutationType==='segment_finalized'&&row.payload.segment.segment_id==='http-event');
    assert(finalized.payload.segment.size_bytes===seek.sizeBytes&&finalized.payload.segment.checksum_sha256===hash(seek.file));
  });
  check('SF05 other seeded media retain small original bytes',()=>{
    assert(override.status===0);const expected=hash(path.join(repo,'video/sample_h264_video_only.mp4'));
    const files=fs.readdirSync(path.join(seekRoot,'channel-1')).filter(name=>!['http-event.mp4','ui-corrupt.mp4'].includes(name));assert(files.length===102);
    assert(files.every(name=>hash(path.join(seekRoot,'channel-1',name))===expected));
  });
} finally {
  let bytes=0;function count(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())count(f);else bytes+=fs.lstatSync(f).size;}}count(root);
  fs.rmSync(root,{recursive:true});let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
  check('UA08 test root cleanup',()=>assert(absent));console.log(`[cleanup] ${root} bytes=${bytes} absent=${absent}`);
}
console.log(JSON.stringify({pass,fail,actualUi:false}));process.exitCode=fail?1:0;
