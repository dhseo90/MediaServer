#!/usr/bin/env node
// 파일 용도: 녹화 UI acceptance의 CLI, 31행 manifest, redaction, artifact containment helper를 검증한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RECORDING_UI_ACTIONS,createResultManifest,parseAcceptanceArgs,prepareOutputDirectory,redactAcceptanceText,writeSanitizedArtifact,findSeekSeedItem,findTimelinePosition,validateI30Observation,assessRecordingConsole} from './run_recording_ui_acceptance.mjs';
import {validateC03Unplaced} from './run_recording_search_ui_acceptance.mjs';
import {recordingGeometry,foreignPlayableMedia} from './recording_ui_after_playback.mjs';
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
  check('AU07 geometry는 화면 밖 control·빈 label·숨김을 거부한다',()=>{
    const n={visible:true,width:100,height:30,left:10,right:110,label:'시간'};
    assert(recordingGeometry([n],320));
    for(const bad of [{...n,right:322},{...n,label:''},{...n,visible:false},{...n,width:0}])assert.throws(()=>recordingGeometry([bad],320));
  });
  check('AU08 타 채널 영상은 시간 확인·미확인 양쪽에서 찾고 미재생 행은 거부한다',()=>{
    const row={playable:true,playbackUrl:'/ops/api/recordings/media/opaque'};
    assert.equal(foreignPlayableMedia({items:[row],unplacedItems:[]}),row.playbackUrl);
    assert.equal(foreignPlayableMedia({items:[],unplacedItems:[row]}),row.playbackUrl);
    assert.equal(foreignPlayableMedia({items:[{...row,playable:false}],unplacedItems:[]}),null);
  });
  check('AU09 console은 같은 세션·action·유일 응답·명시 계약에만 결속한다',()=>{
    const c={type:'error',text:'Failed to load resource: the server responded with a status of 403 (Forbidden)',session:1,action:'I34-operator',route:'/ops/api/users',at:3};
    const n={requestId:1,session:1,action:c.action,route:c.route,method:'GET',status:403,at:2};
    const e={session:1,action:c.action,route:c.route,status:403};
    assert.equal(assessRecordingConsole([c],[n],[e]).unapproved.length,0);
    for(const [messages,network,expected] of [[[c],[n],[]],[[{...c,session:2}],[n],[e]],[[c],[{...n,action:'other'}],[e]],[[c],[n,{...n,requestId:2}],[e]],[[{...c,type:'warning'}],[n],[e]],[[c,c],[n],[e]]])assert(assessRecordingConsole(messages,network,expected).unapproved.length>0);
  });
  check('AU10 C03는 신규 unknown의 독립 식별·동일 질의·전체 페이지를 요구한다',()=>{
    const old={id:'old',channelId:'1'},added={id:'new',segmentId:'segment-new',channelId:'3',startTimeNs:null,endTimeNs:null,timeProvenance:'unknown'};
    const first={snapshotId:'old-snapshot',knownCount:1,unplacedCount:0,nextCursor:null,items:[old]};
    const page={snapshotId:'new-snapshot',knownCount:1,unplacedCount:1,nextCursor:'next',items:[old]};
    const input={first,held:[first],fresh:[page,{...page,nextCursor:null,items:[added]}],before:{total:0,unplacedTotal:0},after:{total:0,unplacedTotal:1,unplacedItems:[{segmentId:'segment-new',channelId:'3',catalogState:'finalized',completeness:'complete',startTimeMs:null,endTimeMs:null,members:[{mappingProvenance:'unknown'}]}]},oldQuery:{includeUnplaced:'true',channelIds:'1,3',startTimeMs:'1',endTimeMs:'2',limit:'20'},newQuery:{includeUnplaced:'true',channelIds:'1,3',startTimeMs:'1',endTimeMs:'2',limit:'20'}};
    assert.deepEqual(validateC03Unplaced(input).newResultIds,['new']);
    for(const mutate of [x=>x.newQuery.includeUnplaced='false',x=>x.newQuery.endTimeMs='3',x=>x.after.unplacedItems[0].catalogState='writing',x=>x.after.unplacedItems[0].members[0].mappingProvenance='estimated',x=>x.fresh.pop(),x=>x.fresh[1].items[0].segmentId='unrelated',x=>x.fresh[1].items[0].startTimeNs='1',x=>x.fresh[1].items[0].channelId='4',x=>x.fresh[1].items[0].id='old',x=>x.fresh[1].snapshotId='other',x=>x.held[0].items[0].channelId='3']){const bad=structuredClone(input);mutate(bad);assert.throws(()=>validateC03Unplaced(bad));}
  });
} finally {fs.rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({pass,fail,actualUi:false}));process.exitCode=fail?1:0;
