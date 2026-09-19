// 검증 전용. compiler와 fixture의 측정 경계를 분리한다.
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const expectedStages=Object.freeze([
 [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,1],[7,1],
 [6,16],[7,16],[8,16],[9,16],[10,16],[11,16],
 [6,32],[7,32],[8,32],[9,32],[10,32],[11,32],[12,32],
 [13,32],[14,32],[15,32],[16,32],[17,32],[18,32],[19,32]
]);
export function validateMemoryStages(text){
 if(typeof text!=='string'||text.includes('[memory-error]'))return false;
 const lines=text.split('\n').filter(line=>line.startsWith('[memory] '));
 if(lines.length!==expectedStages.length)return false;
 let peak=0;
 for(let i=0;i<lines.length;i++){
  let row;try{row=JSON.parse(lines[i].slice(9));}catch{return false;}
  if(!row||Object.keys(row).sort().join(',')!=='currentRssBytes,peakRssBytes,peakScope,sources,stage,unit'||
   row.stage!==expectedStages[i][0]||row.sources!==expectedStages[i][1]||row.unit!=='bytes'||row.peakScope!=='process-lifetime'||
   !Number.isSafeInteger(row.currentRssBytes)||row.currentRssBytes<=0||!Number.isSafeInteger(row.peakRssBytes)||row.peakRssBytes<peak||row.peakRssBytes<=0)return false;
  peak=row.peakRssBytes;
 }
 return true;
}
export function phaseSummary({phase,platform,code,signal,timeText}) {
 const allowed=['compiler','fixture'].includes(phase);
 const lines=typeof timeText==='string'?timeText.split('\n').filter(line=>line.includes('maximum resident set size')):[];
 const match=lines.length===1?lines[0].match(/^\s*([1-9][0-9]*)\s+maximum resident set size\s*$/):null;
 const number=match?Number(match[1]):null;
 const peakRssBytes=platform==='darwin'&&Number.isSafeInteger(number)&&number>0?number:null;
 const exitCode=Number.isInteger(code)&&code>=0&&code<=255?code:null;
 const signalCode=['SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGBUS','SIGINT'].includes(signal)?signal:null;
 const measured=allowed&&peakRssBytes!==null;
 const capPass=measured&&(phase==='compiler'||peakRssBytes<=536870912);
 const pass=measured&&capPass&&exitCode===0&&signal===null;
 return {phase:allowed?phase:'unknown',status:!measured?'unknown':pass?'complete':'failed',exitCode,signal:signalCode,
  peakRssBytes,unit:'bytes',scope:'timed-command',fixtureLimitBytes:phase==='fixture'?536870912:null,pass};
}
export function combinedPhaseSummary(input,stdout){
 const summary=phaseSummary(input);
 const stagesValid=input.phase==='fixture'?validateMemoryStages(stdout):null;
 const selfPeakRssBytes=stagesValid?Math.max(...stdout.split('\n').filter(x=>x.startsWith('[memory] ')).map(x=>JSON.parse(x.slice(9)).peakRssBytes)):null;
 const effectivePeakRssBytes=summary.peakRssBytes===null?null:Math.max(summary.peakRssBytes,selfPeakRssBytes??0);
 if(input.phase==='fixture'){
  if(!stagesValid){summary.status='unknown';summary.pass=false;}
  else if(effectivePeakRssBytes!==null&&effectivePeakRssBytes>536870912){summary.status='failed';summary.pass=false;}
 }
 return {...summary,stagesValid,selfPeakRssBytes,effectivePeakRssBytes};
}
export function runPhase(phase,command,args=[]){
 return new Promise(resolve=>{
  if(!['compiler','fixture'].includes(phase)||!command){resolve({summary:phaseSummary({phase,platform:process.platform}),exitCode:2});return;}
  // detached하지 않아 바깥 bounded runner의 소유 process group을 상속한다.
  const child=spawn('/usr/bin/time',['-l',command,...args],{stdio:['ignore','pipe','pipe']});
  let stderr='',stdout='',bytes=0,overflow=false,spawnFailed=false;
  const collect=(b,isError)=>{bytes+=b.length;if(bytes>2*1024*1024){overflow=true;return;}if(isError)stderr+=b.toString();else stdout+=b.toString();process.stdout.write(b);};
  child.stdout.on('data',b=>collect(b,false));child.stderr.on('data',b=>collect(b,true));
  child.on('error',()=>{spawnFailed=true;});
  child.on('close',(code,signal)=>{
   const summary=combinedPhaseSummary({phase,platform:process.platform,code,signal,timeText:overflow||spawnFailed?'':stderr},stdout);
   console.log('[memory-phase] '+JSON.stringify({...summary,outputOverflow:overflow,spawnFailed}));
   resolve({summary,exitCode:code!==null&&code!==0?code:summary.pass&&!overflow&&!spawnFailed?0:2});
  });
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [phase,command,...args]=process.argv.slice(2);const result=await runPhase(phase,command,args);process.exitCode=result.exitCode;
}
