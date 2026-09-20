import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyReadContext,readContextLabels,readContextNegativeLabels} from './verify_recording_job_read_context.mjs';
const result=mode=>({code:mode==='red'?1:0,signal:null,stopReason:null,groupClean:true,stdout:(mode==='red'?readContextLabels:[...readContextLabels,...readContextNegativeLabels]).map((x,i)=>`[${mode==='red'&&i===2?'fail':'pass'}] ${x}`).join('\n')+`\n[read-context-count] {"firstParses":${mode==='red'?5:1},"secondParses":${mode==='red'?5:1}}\n[summary] pass=${mode==='red'?4:21} fail=${mode==='red'?1:0}\n`});
test('LP22-RH01 exact RED and GREEN bind every label summary and actual parse counts',()=>{
  assert(classifyReadContext(result('red'),'red'));assert(classifyReadContext(result('green'),'green'));
  assert(!classifyReadContext({...result('red'),stdout:result('red').stdout.replace('"firstParses":5','"firstParses":0')},'red'));
  assert(!classifyReadContext({...result('green'),stdout:result('green').stdout.replace('"secondParses":1','"secondParses":0')},'green'));
});
test('LP22-RH02 missing summary different failure stop signal and unclean group reject',()=>{
  const r=result('red');
  for(const change of [{stdout:r.stdout.replace('[summary] pass=4 fail=1','')},{stdout:r.stdout.replace('[fail] LP22-R03','[fail] LP22-R04')},{stopReason:'timeout'},{signal:'SIGTERM'},{groupClean:false}])assert(!classifyReadContext({...r,...change},'red'));
  const green=result('green'),line='[pass] '+readContextNegativeLabels[0]+'\n';
  for(const stdout of [green.stdout.replace(line,''),green.stdout.replace(line,line+line)])assert(!classifyReadContext({...green,stdout},'green'));
});
