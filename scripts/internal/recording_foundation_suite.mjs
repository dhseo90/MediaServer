// 파일 용도: 실제 runner 순서 연결. CLI에는 executor 교체 경로가 없다.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {authKeys,credentials,redactSecrets} from './recording_foundation_auth_helpers.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
function completed(id,result) {
  if(result.exit!==0||result.signal||result.error) throw Error(`${id}: child exit or execution failure`);
  const lines=result.stdout.trim().split('\n');
  if(lines.some(x=>x.startsWith('[fail]'))) throw Error(`${id}: failed check output`);
  const cleanups=lines.filter(x=>x.startsWith('[cleanup]'));
  if(!cleanups.length||cleanups.some(x=>!/^\[cleanup\] path=.+ bytes=\d+ absent=true$/.test(x))) throw Error(`${id}: cleanup evidence missing or failed`);
  const marker=id==='runtime'?'[pass] RT08 wrapper completed and cleanup absent':'[pass] AP wrapper completed and cleanup absent';
  if(lines.at(-1)!==marker) throw Error(`${id}: wrapper completion missing`);
  if(id==='runtime') {
    const summaries=lines.filter(x=>/^S09 runtime checks=/.test(x));
    const match=summaries.length===1&&/^S09 runtime checks=(\d+) failures=0$/.exec(summaries[0]);
    if(!match||Number(match[1])<1) throw Error('runtime: summary missing or failed');
    return {id,exit:0,checks:Number(match[1]),cleanup:true};
  }
  const summaries=lines.filter(x=>x.startsWith('{')).map(x=>{try{return JSON.parse(x);}catch{return null;}}).filter(x=>x?.mode==='--app-auth');
  const summary=summaries.length===1?summaries[0]:null;
  if(!summary||!Number.isSafeInteger(summary.passed)||summary.passed<1||summary.failed!==0||summary.authAttempted!==true||
    summary.authSuiteCompleted!==true||summary.coverage!=='app-auth-partial'||summary.fullFoundationPass!==false||
    !Array.isArray(summary.authRemaining)||summary.authRemaining.length||!Array.isArray(summary.authRemainingCases)||summary.authRemainingCases.length)
    throw Error('app-auth: required summary missing or incomplete');
  return {id,exit:0,checks:summary.passed,cleanup:true};
}
export async function runSuite(env,execute) {
  credentials(env); // 첫 child/임시root보다 앞선 필수 조건.
  const runtimeEnv={...env};
  for(const key of authKeys) delete runtimeEnv[key];
  const steps=[{id:'runtime',file:path.join(directory,'verify_v410_recording_foundation_runtime.sh'),args:[],env:runtimeEnv},
    {id:'app-auth',file:path.join(directory,'verify_v410_recording_foundation.sh'),args:['--app-auth'],env:{...env}}];
  const stages=[];
  for(const step of steps) {
    try { stages.push(completed(step.id,await execute(step))); }
    catch(e) {
      return {mode:'--all',integrationExecutionPass:false,fullFoundationPass:false,resourceTrendPass:false,
        stages,failedStage:step.id,error:e.message,notRun:steps.slice(stages.length+1).map(x=>x.id),remaining:['resource-trend','30min','120min','UI']};
    }
  }
  return {mode:'--all',integrationExecutionPass:true,fullFoundationPass:false,resourceTrendPass:false,
    stages,notRun:[],remaining:['resource-trend','30min','120min','UI']};
}
export function boundedOutput(limit=8*1024*1024) {
  let bytes=0,stdout='',error=null;
  return {
    feed(chunk) {
      if(error) return;
      bytes+=Buffer.byteLength(chunk);
      if(bytes>limit){error='child-output-limit';stdout='';return;}
      stdout+=chunk;
    },
    result(){return {stdout,error};}
  };
}
export function nativeExecute(step,secrets,write=text=>process.stdout.write(text)) {
  return new Promise(resolve=>{
    const child=spawn('/bin/bash',[step.file,...step.args],{cwd:directory,env:step.env,stdio:['ignore','pipe','pipe']});
    const capture=boundedOutput();
    let spawnError=null;
    // 외부 kill은 detached 앱 cleanup을 건너뛸 수 있다. 기존 runner 종료까지 drain한다.
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',capture.feed);child.stderr.on('data',capture.feed);
    child.on('error',()=>{spawnError='child-spawn-failed';});
    child.on('close',(exit,signal)=>{
      const {stdout,error}=capture.result();
      // 여러 chunk/줄에 걸친 secret도 전체 bounded 출력에서 먼저 가린다.
      if(error==='child-output-limit') write('[fail] child output withheld: capture limit\n');
      else write(redactSecrets(stdout,secrets));
      resolve({exit,signal,error:spawnError||error,stdout});
    });
  });
}
export async function runSuiteCli(env=process.env) {
  const start=Date.now();
  let result,secrets=[];
  try {
    secrets=credentials(env);
    result=await runSuite(env,step=>nativeExecute(step,secrets));
  } catch(e) {
    result={mode:'--all',integrationExecutionPass:false,fullFoundationPass:false,resourceTrendPass:false,
      stages:[],failedStage:'preflight',error:e.message,notRun:['runtime','app-auth'],remaining:['resource-trend','30min','120min','UI']};
  }
  console.log(redactSecrets(JSON.stringify({...result,elapsedMs:Date.now()-start,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'하위작업별자동집계없음'}),secrets));
  return result.integrationExecutionPass?0:1;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) process.exitCode=await runSuiteCli();
