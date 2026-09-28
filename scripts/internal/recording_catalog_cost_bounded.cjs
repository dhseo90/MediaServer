'use strict';
// 검증 소유 프로세스 그룹만 종료한다. 파일 정리는 부모 runner의 EXIT trap 소유다.
const {spawn}=require('child_process');
const [seconds,command,...args]=process.argv.slice(2);const ms=Number(seconds)*1000;
if(!Number.isFinite(ms)||ms<=0||ms>180000||!command)throw Error('bounded arguments');
const child=spawn(command,args,{stdio:'inherit',detached:true});let timeout=false,force;
function signal(sig){try{process.kill(-child.pid,sig)}catch(e){if(e.code!=='ESRCH')throw e}}
const timer=setTimeout(()=>{timeout=true;console.log(`[resource-stop] timeout_seconds=${seconds}`);signal('SIGTERM');force=setTimeout(()=>signal('SIGKILL'),5000);},ms);
child.on('error',e=>{clearTimeout(timer);console.error('[bounded-error]',e.message);process.exitCode=1});
child.on('close',(code,signalName)=>{clearTimeout(timer);clearTimeout(force);console.log(`[bounded-exit] code=${code} signal=${signalName||'none'} timeout=${timeout}`);process.exitCode=timeout?124:(code??1)});
