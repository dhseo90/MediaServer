#!/usr/bin/env node
// 파일 용도: 녹화 UI acceptance의 CLI, 31행 manifest, redaction, artifact containment helper를 검증한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RECORDING_UI_ACTIONS,createResultManifest,parseAcceptanceArgs,prepareOutputDirectory,redactAcceptanceText,writeSanitizedArtifact,findSeekSeedItem,findTimelinePosition,validateI30Observation} from './run_recording_ui_acceptance.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-recording-ui-acceptance-test-'));let pass=0,fail=0;
function check(name,fn){try{fn();pass++;console.log(`PASS: ${name}`);}catch(error){fail++;console.log(`FAIL: ${name}: ${error.message}`);}}
try {
  check('AU01 CLI는 mode와 절대 output만 허용',()=>{assert.deepEqual(parseAcceptanceArgs(['--focus-i30','--output-dir','/tmp/media-server-recording-ui-acceptance-x']).mode,'--focus-i30');assert.throws(()=>parseAcceptanceArgs(['--all']));assert.throws(()=>parseAcceptanceArgs(['--all','--output-dir','relative']));});
  check('AU02 exact manifest는 template title을 포함한 all 31행과 focus I30 3행을 보존',()=>{assert.equal(createResultManifest('--all').length,31);assert.equal(createResultManifest('--focus-i30').length,3);assert(RECORDING_UI_ACTIONS.some(row=>row.title==='재생')&&RECORDING_UI_ACTIONS.some(row=>row.title==='1180 dark'));assert(createResultManifest('--all').every(row=>row.status==='notRun'));});
  check('AU03 redaction은 비밀·credential header·JSON·URL·경로를 evidence에서 제거',()=>{const text=redactAcceptanceText('password=secret Authorization: Bearer cookie=opaque {"token":"raw"} http://host/a /tmp/private-file',['secret','opaque','raw']);assert(!text.includes('secret')&&!text.includes('opaque')&&!text.includes('raw')&&!text.includes('http://host')&&!text.includes('/tmp/private-file'));});
  check('AU04 owned temp만 생성하고 artifact escape를 거부',()=>{const out=path.join(fs.realpathSync(os.tmpdir()),'media-server-recording-ui-acceptance-unit');const prepared=prepareOutputDirectory(out);const item=writeSanitizedArtifact(prepared,'safe.json','token=secret',['secret']);assert(item.sha256.length===64);assert.throws(()=>writeSanitizedArtifact(prepared,'../escape','x'));fs.rmSync(prepared,{recursive:true});});
  check('AU05 독립 응답 순서·숨김·미확인 목록으로 정확한 행을 선택한다',()=>{
    const row={itemId:'seek-row',segmentId:'seek-1',playable:true,kind:'continuous'};
    assert.equal(findSeekSeedItem({seek:{id:'seek-1'},pages:[{items:[],unplacedItems:[row]}]}),row);
    const page={items:[{itemId:'hidden',kind:'continuous',hideByEvent:true},row],unplacedItems:[]};
    assert.equal(findTimelinePosition(page,'seek-row',false).index,0);
    assert.equal(findTimelinePosition(page,'seek-row',true).index,1);
    assert.throws(()=>findTimelinePosition(page,'absent',true));
    assert.throws(()=>findSeekSeedItem({seek:{id:'seek-1'},pages:[{items:[row],unplacedItems:[row]}]}));
  });
  check('AU06 I30 시간·프레임·Range 누락·타파일 반례를 거부한다',()=>{
    const good={metadata:{duration:10,videoWidth:1280,videoHeight:720,readyState:1},beforePlay:{paused:true,currentTime:0,frames:0},afterPlay:{paused:false,currentTime:1,frames:2},beforePause:{currentTime:1},afterPause:{paused:true,currentTime:1.01,elapsedMs:350},beforeSeek:{currentTime:1,frames:2},afterSeek:{currentTime:6,frames:3,seekingObserved:true,seekedObserved:true},media:[{id:'seek',status:206,range:'bytes=0-',contentRange:'bytes 0-1/10'}],selectedId:'seek'};
    assert.equal(validateI30Observation(good),true);
    for(const bad of [{...good,afterPlay:{...good.afterPlay,currentTime:0,frames:0}},{...good,afterPause:{...good.afterPause,currentTime:2}},{...good,media:[]},{...good,media:[{...good.media[0],id:'wrong'}]},{...good,afterSeek:{...good.afterSeek,frames:2}},{...good,media:[{...good.media[0],range:''}]}])assert.throws(()=>validateI30Observation(bad));
  });
} finally {fs.rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({pass,fail,actualUi:false}));process.exitCode=fail?1:0;
