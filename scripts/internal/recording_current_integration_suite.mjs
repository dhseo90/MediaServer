// 현행 통합 실행 전용. legacy --all의 완료 의미와 분리한다.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {boundedOutput} from './recording_foundation_suite.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
export const currentSteps=Object.freeze([
  {id:'http-api',file:'verify_v410_recording_ui_contract.mjs',args:['--http-api'],checks:35},
  {id:'http-auth',file:'verify_v410_recording_ui_contract.mjs',args:['--http-auth'],checks:40},
  {id:'http-lifecycle',file:'verify_v410_recording_ui_contract.mjs',args:['--http-lifecycle'],checks:10},
  {id:'default-composition',file:'verify_recording_default_composition.sh',args:[],checks:46},
  {id:'actual-app',file:'verify_recording_current_app.mjs',args:[]}
]);
function requireValue(ok,reason){if(!ok)throw Error(reason);}
function one(lines,prefix){const selected=lines.filter(l=>l.startsWith(prefix));requireValue(selected.length===1,'summary-count');return selected[0];}
function normalActualProcess(p){
  // 실제 createProcessCleanup의 증거를 확인한다. HTTP fixture의 graceful 형식과 섞지 않는다.
  return p?.schema==='recording-process-cleanup-v1'&&p.attemptCount===1&&Number.isSafeInteger(p.pid)&&p.pid>0&&p.pid<=2147483647&&
    p.exitedObserved===true&&p.exitCode===0&&p.signalCode===null&&p.stopCode==='complete'&&p.forcedTermination==='not-used'&&
    p.normalExitPass===true&&p.normalShutdownPass===true&&p.archiveSafe===true&&Array.isArray(p.ports)&&p.ports.length===2&&
    ['http','rtsp'].every(kind=>p.ports.filter(v=>v?.kind===kind&&Number.isSafeInteger(v.port)&&v.port>0&&v.port<=65535&&
      v.status==='pass'&&v.code==='closed'&&v.closed===true).length===1);
}
export function completedCurrentStep(step,result){
  requireValue(currentSteps.some(s=>s.id===step.id),'unknown-stage');
  requireValue(result.exit===0&&!result.signal&&!result.error,'child-execution');
  const lines=result.stdout.trim().split('\n');
  requireValue(!lines.some(x=>x.startsWith('[fail]')||x.startsWith('[cleanup] FAIL')),'child-failed-check');
  if(step.id.startsWith('http-')){
    const tag={'http-api':'API','http-auth':'AUTH','http-lifecycle':'lifecycle'}[step.id];
    const summary=one(lines,`[S06 HTTP ${tag}]`);
    requireValue(summary.startsWith(`[S06 HTTP ${tag}] checks=${step.checks} fail=0 `),'http-summary');
    const cleanup=JSON.parse(one(lines,'[cleanup] PASS ').slice(15));
    requireValue(cleanup.rootAbsent===true&&cleanup.failureCount===0&&cleanup.process?.exitCode===0&&cleanup.process?.signalCode===null&&cleanup.process?.graceful===true,'http-cleanup');
    requireValue(Array.isArray(cleanup.ports)&&cleanup.ports.length===2&&['http','rtsp'].every(kind=>cleanup.ports.filter(p=>p.kind===kind&&p.closed===true).length===1),'http-ports');
    return {id:step.id,checks:step.checks,exit:0,cleanup:true};
  }
  if(step.id==='default-composition'){
    requireValue(JSON.stringify(lines.filter(x=>x.startsWith('[summary]')))==JSON.stringify(['[summary] pass=24 fail=0','[summary] pass=16 fail=0','[summary] pass=1 fail=0']),'composition-summary');
    requireValue(lines.filter(x=>x.startsWith('[pass]')).length===46,'composition-check-count');
    for(const kind of ['committed','blocked'])requireValue(lines.filter(x=>x===`[process] ${kind} child exit=23 expected=23`).length===1,'composition-recovery');
    requireValue(/^\[cleanup\] path=.+ bytes=\d+ removed=true$/.test(one(lines,'[cleanup]')),'composition-cleanup');
    return {id:step.id,checks:46,exit:0,cleanup:true};
  }
  const s=JSON.parse(one(lines,'{"mode":"current-actual-app"'));
  requireValue(s.actualEventPass===true&&s.restartPass===true&&s.expectedOutputCount===2&&Array.isArray(s.observedOutputCounts)&&s.observedOutputCounts.length===2&&s.observedOutputCounts.every(n=>n===2)&&s.failed===0&&s.passed===25,'actual-app-summary');
  requireValue(s.cleanup?.rootAbsent===true&&s.cleanup?.failureCount===0,'actual-app-cleanup');
  requireValue(Array.isArray(s.cleanup.processes)&&s.cleanup.processes.length===2&&s.cleanup.processes.every(normalActualProcess),'actual-app-process-cleanup');
  return {id:step.id,checks:s.passed,exit:0,cleanup:true};
}
export async function runCurrentIntegration(execute){
  const stages=[];
  const base={mode:'--current-integration',fullFoundationPass:false,resourceTrendPass:false,uiFulltestPass:false,remaining:['final-scope-and-evidence-freeze','30min','120min','UI','resource-trend']};
  for(let i=0;i<currentSteps.length;i++){
    const step=currentSteps[i];
    try{stages.push(completedCurrentStep(step,await execute(step)));}
    catch(error){return {...base,currentIntegrationExecutionPass:false,stages,failedStage:step.id,error:error.message,notRun:currentSteps.slice(i+1).map(s=>s.id)};}
  }
  return {...base,currentIntegrationExecutionPass:true,stages,notRun:[]};
}
export function executeCurrentStep(step,write=chunk=>process.stdout.write(chunk)){
  return new Promise(resolve=>{
    const child=spawn(step.file.endsWith('.sh')?'/bin/bash':process.execPath,[path.join(directory,step.file),...step.args],{cwd:directory,env:{PATH:process.env.PATH,HOME:process.env.HOME||'/tmp',TMPDIR:process.env.TMPDIR||'/tmp'},stdio:['ignore','pipe','pipe']});
    const capture=boundedOutput();let error=null;
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',capture.feed);child.stderr.on('data',capture.feed);
    child.on('error',()=>{error='spawn-failed';});
    child.on('close',(exit,signal)=>{const output=capture.result();if(!output.error)write(output.stdout);else write('[fail] current child output withheld: limit\n');resolve({exit,signal,error:error||output.error,stdout:output.stdout});});
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const start=performance.now();const result=await runCurrentIntegration(executeCurrentStep);
  console.log(JSON.stringify({...result,elapsedMs:Math.round(performance.now()-start),tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용집계없음'}));
  process.exitCode=result.currentIntegrationExecutionPass?0:1;
}
