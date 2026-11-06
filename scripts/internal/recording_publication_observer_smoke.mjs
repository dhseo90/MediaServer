// 파일 용도: 호출마다 실제 writer publication 한 번을 관측하며 제한된 테스트 latch는 전체 HTTP 실행에 사용하지 않는다.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {measureCurrentRootStable,createWorkspaceFailureCapture} from './recording_current_observer.mjs';
const [root,binary,mode]=process.argv.slice(2);assert(['baseline','candidate'].includes(mode));
const env=JSON.parse(fs.readFileSync(path.join(root,'env.json'),'utf8'));const sink=createWorkspaceFailureCapture(root);
const child=spawn(binary,[root],{cwd:root,env,stdio:['pipe','pipe','pipe']});let buffer='',output='',handled=false,problem=null,measurement=null;
const timer=setTimeout(()=>{problem??=Error('direct-timeout');child.kill('SIGTERM');},20000);
child.stderr.on('data',b=>{output+=b;if(output.length>65536){problem??=Error('direct-log-cap');child.kill('SIGTERM');}});
child.stdout.on('data',b=>{output+=b;buffer+=b;if(output.length>65536){problem??=Error('direct-log-cap');child.kill('SIGTERM');}let pos;
 while((pos=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,pos);buffer=buffer.slice(pos+1);if(!line.startsWith('[R135-linked]'))continue;
  try{
   assert(!handled);handled=true;assert.equal(line,'[R135-linked] same=1 nlink=2');
   if(mode==='baseline'){
    assert.throws(()=>measureCurrentRootStable(root),e=>{sink.capture(e);const d=e.collectorDiagnostic;assert.equal(e.message,'root-unsafe-file');assert.equal(d.top,'recording');assert.equal(d.category,'other');assert.equal(d.nlink,2);assert(d.counterpart.sameDev&&d.counterpart.sameIno);console.log('[R135-native-rejection] '+JSON.stringify(d));return true;});
   }else{
    let reads=0,released=false;
    measurement=measureCurrentRootStable(root,{recordingTop:'recording',lstat:file=>{
     const stat=fs.lstatSync(file);
     if(stat.isFile()&&stat.nlink===2&&/\.mp4(?:\.partial\.)?/.test(file)&&++reads===3){
      released=true;child.stdin.write('g');const start=performance.now();
      // 실제 native unlink만 기다리며 재시도 판단에 사용할 unlink 직전의 실제 stat를 보유한다.
      while(performance.now()-start<2000){try{if(fs.lstatSync(file).nlink===1)break;}catch(e){if(e.code==='ENOENT')break;throw e;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2);}
     }
     return stat;
    }});assert(released);assert(measurement.transientTreeRetries>=1);assert.equal(measurement.categories.media.files,1);assert.equal(measurement.categories.mediaPartial.files,0);assert(measurement.ownership.productRecording.bytes>=measurement.categories.media.bytes);console.log('[R135-native-measurement] '+JSON.stringify(measurement));
   }
  }catch(e){problem=e;}finally{try{child.stdin.end('g');}catch{}}
 }
});
const result=await new Promise(resolve=>{child.once('error',e=>{problem=e;resolve({code:null,signal:null});});child.once('close',(code,signal)=>resolve({code,signal}));});clearTimeout(timer);
try{assert.ifError(problem);assert(handled);assert.equal(result.code,0);assert.equal(result.signal,null);assert(output.includes('[R135-writer] input=30 publications=1 durable=1 finish=1 latchTimeout=0'));console.log('[R135-direct] '+JSON.stringify({mode,...result,handled,pass:true}));}
catch(e){console.log('[R135-direct] '+JSON.stringify({mode,...result,handled,pass:false,error:e.message}));process.exitCode=1;}
finally{sink.close();fs.writeFileSync(path.join(root,'writer-output.log'),output);}
