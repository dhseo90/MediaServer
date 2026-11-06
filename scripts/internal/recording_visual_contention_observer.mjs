// 파일 용도: R101 native 직접 실행에서 기존 공간 피연산자와 process collector를 재사용한다.
// 순차 sample은 관측 범위를 제한할 뿐 순간 peak가 아니며 실패는 parent로 전달한다.
import fs from 'node:fs';
import {collectProcess} from './recording_foundation_observer.mjs';
import {measureCurrentRootStable,admitWorkspaceSnapshot,createWorkspaceFailureCapture,workspaceAnonymousBytes} from './recording_current_observer.mjs';
const [root,pidText,binary]=process.argv.slice(2),pid=Number(pidText);
const preparation=JSON.parse(fs.readFileSync(root+'/preparation-budget.json','utf8'));
if(!Number.isSafeInteger(preparation.fixedBytes)||preparation.fixedBytes<0)throw Error('preparation-budget-invalid');
const capture=createWorkspaceFailureCapture(root);let start=null,samples=0,acknowledged='initial';
try {
 for(;;){
  const phase=fs.readFileSync(root+'/resource-phase','utf8').trim();
  let metrics;
  try { metrics=await collectProcess(binary,pid); }
  catch(error){if(samples&&error.collectorDiagnostic?.measurement?.error==='process-exited-or-absent'){
   console.log('[R101-space-end] '+JSON.stringify({samples,endedObserved:true}));break;
  }throw error;}
  start??=metrics.startIdentity;
  const completedPhase=fs.readFileSync(root+'/resource-phase','utf8').trim();
  if(!['initial','model','live'].includes(phase))throw Error('resource-phase-invalid');
  const storage=measureCurrentRootStable(root,{recordingTop:'recording'});
  // 일반 실행 파일에는 모두 live448 허용 기준을 유지한다. 문서에 정의된 동기 model FD·session
  // 생성 중에만 기존 total8GiB를 사용한다.
  let bounds;
  if(phase==='model'){
   bounds=admitWorkspaceSnapshot({storage,baseline:{fixedBytes:0,capBytes:448*1024**2}},capture);
   const anonymous=workspaceAnonymousBytes(metrics,pid,start);
   const total=preparation.fixedBytes+storage.totalBytes+anonymous;
   if(!Number.isSafeInteger(total)||total>=8*1024**3){const e=Error('model-preparation-total-cap');capture.capture(e,{preparation,storage,metrics,total,capBytes:8*1024**3});throw e;}
   if(acknowledged!=='model'){
    const reservedTotal=total+preparation.temporaryModelReserve;
    if(!Number.isSafeInteger(reservedTotal)||reservedTotal>=8*1024**3){const e=Error('model-preparation-reservation-cap');capture.capture(e,{preparation,storage,metrics,reservedTotal,capBytes:8*1024**3});throw e;}
   }
   bounds={...bounds,preparationTotalBytes:total,preparationCapBytes:8*1024**3,anonymousUsedBytes:anonymous};
  }else bounds=admitWorkspaceSnapshot({storage,baseline:{fixedBytes:0,capBytes:448*1024**2},metrics,expectedPid:pid,expectedStart:start},capture);
  if(!Number.isSafeInteger(metrics.rssBytes)||metrics.rssBytes<=0||metrics.rssBytes>4*1024**3)throw Error('RSS-cap-or-measurement');
  console.log('[R101-space] '+JSON.stringify({sequence:samples++,phase,completedPhase,metrics,storage,bounds}));
  if(samples===1)console.log('[R101-space-ready]');
  if(phase===completedPhase&&phase!==acknowledged){console.log('[R101-space-phase] '+phase);acknowledged=phase;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
} catch(error){capture.capture(error);console.error('[R101-space-failure] '+error.message);process.exitCode=1;}
finally {capture.close();}
