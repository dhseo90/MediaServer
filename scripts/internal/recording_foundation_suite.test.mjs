// 파일 용도: 통합 검증 실행 순서와 실패 전파 검사.
import assert from 'node:assert/strict';
import {runSuite,boundedOutput,nativeExecute} from './recording_foundation_suite.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {authKeys} from './recording_foundation_auth_helpers.mjs';
const start=Date.now();let passed=0,failed=0;
const env=Object.fromEntries(authKeys.map((k,i)=>[k,`unit-only-secret-${i}`]));
const runtime={exit:0,stdout:'S09 runtime checks=519 failures=0\n[cleanup] path=/unit bytes=1 absent=true\n[pass] RT08 wrapper completed and cleanup absent\n'};
const app={exit:0,stdout:JSON.stringify({mode:'--app-auth',passed:1,failed:0,authAttempted:true,authSuiteCompleted:true,authRemaining:[],authRemainingCases:[],fullFoundationPass:false,coverage:'app-auth-partial'})+'\n[cleanup] path=/unit bytes=1 absent=true\n[pass] AP wrapper completed and cleanup absent\n'};
async function check(name,fn){try{await fn();passed++;console.log(`[pass] ${name}`);}catch(e){failed++;console.log(`[fail] ${name}`);throw e;}}
try{
  for(const args of [[],['--all']]) await check(`ALL04 direct internal ${args.length?'all':'default'} rejected before root`,async()=>{
    const absent=path.join(os.tmpdir(),`s09-suite-not-created-${process.pid}`);
    assert(!fs.existsSync(absent));
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./verify_v410_recording_foundation.mjs',import.meta.url)),...args],
      {env:{PATH:process.env.PATH,TMPDIR:absent},encoding:'utf8',timeout:5000});
    assert.equal(result.status,1);assert.match(result.stdout,/use foundation shell wrapper/);assert(!fs.existsSync(absent));
  });
  await check('ALL02 native overflow child cleanup and close before failure',async()=>{
    const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-suite-native-'))),file=path.join(root,'fixture.sh'),marker=path.join(root,'closed-marker');
    try {
      fs.writeFileSync(file,`${JSON.stringify(process.execPath)} -e 'process.stdout.write("x".repeat(9*1024*1024));setTimeout(()=>{require("fs").writeFileSync(process.argv[1],"done")},120)' "$1"\n`);
      const calls=[],output=[];
      const result=await runSuite(env,async step=>{calls.push(step.id);const native=await nativeExecute({...step,file,args:[marker],env:{PATH:process.env.PATH}},[],text=>output.push(text));assert.equal(native.exit,0);assert.equal(native.signal,null);return native;});
      assert.deepEqual(calls,['runtime']);assert.equal(result.integrationExecutionPass,false);
      assert.equal(fs.readFileSync(marker,'utf8'),'done');
      assert.equal(output.join(''),'[fail] child output withheld: capture limit\n');
    } finally {
      const size=fs.readdirSync(root).reduce((n,x)=>n+fs.lstatSync(path.join(root,x)).size,0);
      fs.rmSync(root,{recursive:true});
      let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
      assert(absent);console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
    }
  });
  await check('ALL04 native split multiline secret redacted before output',async()=>{
    const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-suite-redaction-'))),file=path.join(root,'fixture.sh');
    const secret='unit-only\nmultiline-secret';
    try {
      fs.writeFileSync(file,`${JSON.stringify(process.execPath)} -e 'process.stdout.write(process.env.FIXTURE_SECRET.slice(0,8));setTimeout(()=>process.stdout.write(process.env.FIXTURE_SECRET.slice(8)),10)'\n`);
      const output=[];
      const result=await nativeExecute({file,args:[],env:{PATH:process.env.PATH,FIXTURE_SECRET:secret}},[secret],x=>output.push(x));
      assert.equal(result.exit,0);assert.equal(result.error,null);assert.equal(output.join(''),'[secret-redacted]');
    } finally {
      const size=fs.statSync(file).size;fs.rmSync(root,{recursive:true});
      let absent=false;try{fs.lstatSync(root);}catch(e){absent=e.code==='ENOENT';}
      assert(absent);console.log(`[cleanup] path=${root} bytes=${size} absent=${absent}`);
    }
  });
  await check('ALL02 output overflow waits close then blocks app',async()=>{
    const capture=boundedOutput(8),calls=[];let close,finished=false;
    const pending=runSuite(env,async step=>{calls.push(step.id);return new Promise(resolve=>{close=resolve;});}).then(x=>{finished=true;return x;});
    capture.feed('123456789');capture.feed('ignored');
    await Promise.resolve();assert.equal(finished,false);assert.deepEqual(calls,['runtime']);
    assert.deepEqual(capture.result(),{stdout:'',error:'child-output-limit'});
    close({exit:0,...capture.result()});
    const result=await pending;assert.equal(result.integrationExecutionPass,false);assert.deepEqual(calls,['runtime']);
  });
  await check('ALL01 fixed runtime then app-auth order',async()=>{const calls=[];await runSuite(env,async step=>{calls.push(step.id);return step.id==='runtime'?runtime:app;});assert.deepEqual(calls,['runtime','app-auth']);});
  await check('ALL01 integration completion not full or resource pass',async()=>{const r=await runSuite(env,async s=>s.id==='runtime'?runtime:app);assert.equal(r.integrationExecutionPass,true);assert.equal(r.fullFoundationPass,false);assert.equal(r.resourceTrendPass,false);assert.deepEqual(r.remaining,['resource-trend','30min','120min','UI']);});
  for(const [name,bad] of [['missing',{}],['short',{...env,[authKeys[0]]:'short'}],['duplicate',{...env,[authKeys[0]]:env[authKeys[1]]}]])
    await check(`ALL04 ${name} preflight before executor`,async()=>{let calls=0;await assert.rejects(()=>runSuite(bad,async()=>{calls++;return runtime;}),/credentials/);assert.equal(calls,0);});
  await check('ALL04 runtime secrets removed app secrets retained fixed commands',async()=>{
    const result=await runSuite(env,async s=>{assert.equal(s.file.endsWith(s.id==='runtime'?'verify_v410_recording_foundation_runtime.sh':'verify_v410_recording_foundation.sh'),true);
      assert.deepEqual(s.args,s.id==='runtime'?[]:['--app-auth']);
      for(const k of authKeys) assert.equal(s.env[k],s.id==='runtime'?undefined:env[k]);return s.id==='runtime'?runtime:app;});
    assert.equal(result.integrationExecutionPass,true);
  });
  for(const [name,changes] of [['nonzero',{exit:1}],['null exit',{exit:null}],['signal',{signal:'SIGTERM'}],['spawn error',{error:'spawn'}],
    ['missing summary',{stdout:runtime.stdout.replace('S09 runtime checks=519 failures=0\n','')}],
    ['failed summary',{stdout:runtime.stdout.replace('failures=0','failures=1')}],
    ['missing completion',{stdout:runtime.stdout.replace('[pass] RT08 wrapper completed and cleanup absent\n','')}],
    ['missing cleanup',{stdout:runtime.stdout.replace('[cleanup] path=/unit bytes=1 absent=true\n','')}],
    ['failed cleanup',{stdout:runtime.stdout.replace('absent=true','absent=false')}]])
    await check(`ALL02 runtime ${name} stops app`,async()=>{const calls=[];const result=await runSuite(env,async s=>{calls.push(s.id);return {...runtime,...changes};});assert.deepEqual(calls,['runtime']);assert.equal(result.integrationExecutionPass,false);assert.deepEqual(result.notRun,['app-auth']);});
  await check('ALL02 executor exception stops app',async()=>{let calls=0;const r=await runSuite(env,async()=>{calls++;throw Error('fixture failure');});assert.equal(calls,1);assert.equal(r.integrationExecutionPass,false);});
  for(const [name,value] of [['nonzero',{...app,exit:1}],['null exit',{...app,exit:null}],['missing summary',{...app,stdout:app.stdout.slice(app.stdout.indexOf('\n')+1)}],
    ['incomplete auth',{...app,stdout:app.stdout.replace('"authSuiteCompleted":true','"authSuiteCompleted":false')}],
    ['remaining case',{...app,stdout:app.stdout.replace('"authRemainingCases":[]','"authRemainingCases":["missing"]')}],
    ['wrong mode',{...app,stdout:app.stdout.replace('--app-auth','--app-nonauth')}],
    ['missing completion',{...app,stdout:app.stdout.replace('[pass] AP wrapper completed and cleanup absent\n','')}],
    ['failed cleanup',{...app,stdout:app.stdout.replace('absent=true','absent=false')}]])
    await check(`ALL03 app ${name} rejected`,async()=>{const r=await runSuite(env,async s=>s.id==='runtime'?runtime:value);assert.equal(r.integrationExecutionPass,false);assert.equal(r.failedStage,'app-auth');});
}catch{}
console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start,scope:'orchestration-unit-only-no-runners',tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음',cleanup:'no temporary artifacts'}));
process.exitCode=failed?1:0;
