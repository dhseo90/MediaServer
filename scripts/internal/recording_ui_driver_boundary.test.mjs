#!/usr/bin/env node
// 파일 용도: 녹화 UI driver callback의 메모리 전달, 취소, 오류 전파 경계를 단위 검증한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runRecordingUiDriverBoundary,runVerifier} from './verify_v410_recording_ui_contract.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-ui-driver-boundary-'));
const secret='A!aa-b7-driver-secret';
let pass=0,fail=0;
async function check(title,run){try{await run();pass++;console.log(`PASS: ${title}`);}catch(error){fail++;console.log(`FAIL: ${title}: ${error.message}`);}}

try {
  await check('DB01 성공 driver는 비밀을 파일 없이 메모리 context로만 받는다',async()=>{
    const seen=[];
    const originalLog=console.log,originalError=console.error;
    console.log=(...values)=>seen.push(values.join(' '));console.error=(...values)=>seen.push(values.join(' '));
    try {
      await runRecordingUiDriverBoundary(async context=>{
        assert.equal(context.accounts[0].password,secret);
        assert.equal(context.signal.aborted,false);
        assert.equal(Object.isFrozen(context),true);
      },{baseUrl:'http://127.0.0.1:1',root,seed:{id:'seed'},accounts:[{username:'driver',password:secret}],observationPath:path.join(root,'observe.ndjson'),serverLogPath:path.join(root,'server-private.log')},100);
    } finally {console.log=originalLog;console.error=originalError;}
    assert.equal(fs.existsSync(path.join(root,'ui-login-once.json')),false);
    assert.equal(seen.some(line=>line.includes(secret)),false);
  });
  await check('DB02 driver 오류는 성공으로 바꾸지 않고 비밀 없는 오류로 caller에게 전파한다',async()=>{
    await assert.rejects(()=>runRecordingUiDriverBoundary(async()=>{throw new Error(`driver-failure ${secret}`);},{accounts:[]},100),/UI driver failed/);
  });
  await check('DB03 timeout은 AbortSignal을 전달하고 browser cleanup 완료를 기다린다',async()=>{
    let aborted=false,cleaned=false;
    await assert.rejects(()=>runRecordingUiDriverBoundary(context=>new Promise(resolve=>{
      context.signal.addEventListener('abort',()=>{aborted=true;setTimeout(()=>{cleaned=true;resolve();},5);},{once:true});
    }),{accounts:[]},10),/UI driver timeout/);
    assert.equal(aborted,true);assert.equal(cleaned,true);
  });
  await check('DB04 UI 외 mode와 비함수 driver는 시작 전에 거부한다',async()=>{
    await assert.rejects(()=>runVerifier('--full',{uiDriver:async()=>{}}),/UI driver는 ui-direct\/ui-auth-direct mode에서만 허용됨/);
    await assert.rejects(()=>runVerifier('--ui-direct',{uiArgs:[],uiDriver:'invalid'}),/UI driver는 ui-direct\/ui-auth-direct mode에서만 허용됨/);
  });
  await check('DB05 driver 경로는 handoff 없이 공통 cleanup try 범위에서 실행된다',async()=>{
    const source=fs.readFileSync(path.join(repo,'scripts/internal/verify_v410_recording_ui_contract.mjs'),'utf8');
    const driverBranch=source.slice(source.indexOf('if (uiDriver) {'),source.indexOf("} else if (mode === '--http-auth')"));
    assert(driverBranch.includes('runRecordingUiDriverBoundary(uiDriver'));
    assert.equal(driverBranch.includes('writeUiLoginHandoff('),true);
    assert(driverBranch.indexOf('writeUiLoginHandoff(')>driverBranch.indexOf('} else {'));
    assert(source.includes('finishRecordingUiProxy(uiProxy, () => cleanupHarnessResources({ child, rtspPort, httpPort, root }))'));
    assert(source.includes("uiAuth ? {MEDIA_SERVER_ENABLE_LAB:'1',MEDIA_SERVER_WEBRTC_STUN_SERVER:"));
  });
  await check('DB06 관측 실패는 driver를 취소하고 정리 후 실패로 남긴다',async()=>{
    let cleaned=false;
    await assert.rejects(()=>runRecordingUiDriverBoundary(context=>new Promise(resolve=>{
      context.signal.addEventListener('abort',()=>{cleaned=true;resolve();},{once:true});
    }),{},2000,()=>false),/UI observation unavailable/);
    assert(cleaned);
    await assert.rejects(()=>runRecordingUiDriverBoundary(async()=>{}, {},100,()=>false),/UI driver failed/);
  });
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
console.log(JSON.stringify({pass,fail,actualUi:false,scope:'recording-ui-driver-boundary'}));
process.exitCode=fail?1:0;
