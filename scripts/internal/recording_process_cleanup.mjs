// 파일 용도: 실제 앱 검증기의 종료 관측/복제본 안전 조건. 제품 종료 정책을 변경하지 않는다.
const signals=new Set(['SIGHUP','SIGINT','SIGQUIT','SIGILL','SIGTRAP','SIGABRT','SIGIOT','SIGBUS','SIGFPE','SIGKILL','SIGUSR1','SIGSEGV','SIGUSR2','SIGPIPE','SIGALRM','SIGTERM','SIGSTKFLT','SIGCHLD','SIGCONT','SIGSTOP','SIGTSTP','SIGTTIN','SIGTTOU','SIGURG','SIGXCPU','SIGXFSZ','SIGVTALRM','SIGPROF','SIGWINCH','SIGIO','SIGPOLL','SIGPWR','SIGSYS','SIGEMT','SIGINFO']);
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
function observation(child){
  const pid=integer(child.pid,2147483647)&&child.pid>0?child.pid:null;
  const exitCode=integer(child.exitCode,2147483647)?child.exitCode:null;
  const signalCode=signals.has(child.signalCode)?child.signalCode:null;
  return {pid,exitCode,signalCode,exitedObserved:exitCode!==null||signalCode!==null};
}
export function processStartEvidence(child,ports){
  if(!Array.isArray(ports)||ports.length!==2||new Set(ports.map(p=>p.kind)).size!==2||ports.some(p=>!['http','rtsp'].includes(p.kind)||!integer(p.port,65535)||p.port===0))throw Error('cleanup-port-definition');
  return {pid:observation(child).pid,ports:ports.map(({kind,port})=>({kind,port}))};
}
function stopFailure(error,observed){
  const message=typeof error?.message==='string'?error.message:'';
  const suffix=`(exit=${observed.exitCode}, signal=${observed.signalCode})`;
  if(message==='서버 비정상 종료'+suffix)return {stopCode:'abnormal-exit',forcedTermination:'unknown'};
  if(message==='서버 강제 종료(SIGKILL) 사용'+suffix)return {stopCode:'forced-termination',forcedTermination:'used'};
  if(message==='서버 강제 종료(SIGKILL) 후 exit 관찰 시간 초과')return {stopCode:'forced-exit-timeout',forcedTermination:'used'};
  if(message==='서버 SIGTERM 전달 실패')return {stopCode:'term-send-failed',forcedTermination:'unknown'};
  if(message==='서버 SIGKILL 전달 실패')return {stopCode:'kill-send-failed',forcedTermination:'unknown'};
  return {stopCode:'stop-error',forcedTermination:'unknown'};
}
function portFailure(error,port){
  if(error?.message===`cleanup 뒤에도 port ${port}가 열려 있음`)return 'port-open';
  if(error?.message===`port ${port} 부재 확인 timeout`)return 'port-timeout';
  return 'port-check-error';
}
export function createProcessCleanup({child,ports,stopServer,assertPortClosed}){
  const start=processStartEvidence(child,ports);let pending;
  return function stopOnce(){
    if(pending)return pending;
    pending=(async()=>{
      let stopCode='complete',forcedTermination='unknown',stopSucceeded=false;
      try{const r=await stopServer(child);stopSucceeded=true;forcedTermination=r?.forced===false?'not-used':r?.forced===true?'used':'unknown';}
      catch(error){({stopCode,forcedTermination}=stopFailure(error,observation(child)));}
      const observed=observation(child),results=[];
      for(const {kind,port} of start.ports){
        let status='not-run',code='process-exit-unobserved',closed=null;
        if(observed.exitedObserved){try{await assertPortClosed(port);status='pass';code='closed';closed=true;}catch(error){status='fail';code=portFailure(error,port);closed=false;}}
        results.push(Object.freeze({kind,port,status,code,closed}));
      }
      const normalExitPass=stopSucceeded&&observed.exitedObserved&&observed.exitCode===0&&observed.signalCode===null&&forcedTermination==='not-used';
      const archiveSafe=observed.exitedObserved&&results.every(p=>p.closed===true);
      return Object.freeze({schema:'recording-process-cleanup-v1',attemptCount:1,...observed,stopCode,forcedTermination,normalExitPass,normalShutdownPass:normalExitPass&&archiveSafe,archiveSafe,ports:Object.freeze(results)});
    })();
    return pending;
  };
}
