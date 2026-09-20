import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedRed,expectedRecovery,expectedRealistic,baselineTimedOut} from './verify_recording_recovery_content.mjs';
import * as recoveryRunner from './verify_recording_recovery_content.mjs';

test('LP24-RH01 RED와 GREEN 판정 자체검사',()=>{
 const lines=[
  '[pass] recovery first preflight retains strict content validation',
  '[fail] recovery actual apply reuses validated content and preserves transitions',
  '[fail] recovery sqlite preflight and projection reuse exact validated content',
  '[pass] recovery sqlite and jsonl return identical public values and durable bytes',
  '[pass] recovery new open performs fresh strict validation',
  '[recovery-count] {"jobMutations":6,"firstPreflightParses":6,"actualApplyParses":6,"rebuildPreflightParses":6,"projectionParses":6,"projectionSerializes":6}',
  '[not-run] private recovery counterexamples and realistic fifteen-second fixture: 11',
  '[summary] pass=3 fail=2'];
 const result={code:1,signal:null,stopReason:null,groupClean:true,stdout:lines.join('\n')+'\n'};
 assert.equal(expectedRed(result),true);
 const output=values=>({...result,stdout:values.join('\n')+'\n'});
 for(let i=0;i<5;++i){
  assert.equal(expectedRed(output(lines.filter((_,j)=>j!==i))),false,`missing-title-${i}`);
  assert.equal(expectedRed(output([...lines,lines[i]])),false,`duplicate-title-${i}`);
  const changed=[...lines];changed[i]=changed[i].replace(/^\[(pass|fail)\]/,i===1||i===2?'[pass]':'[fail]');
  assert.equal(expectedRed(output(changed)),false,`wrong-outcome-${i}`);
 }
 const reordered=[...lines];[reordered[0],reordered[1]]=[reordered[1],reordered[0]];
 assert.equal(expectedRed(output(reordered)),false);
 for(const index of [5,6,7]){
  assert.equal(expectedRed(output(lines.filter((_,j)=>j!==index))),false,`missing-metadata-${index}`);
  assert.equal(expectedRed(output([...lines,lines[index]])),false,`duplicate-metadata-${index}`);
 }
 for(const summary of ['[summary] pass=5 fail=0','[summary] pass=4 fail=1','[summary] pass=3 fail=3'])
  assert.equal(expectedRed(output([...lines.slice(0,7),summary])),false);
 const counts=JSON.parse(lines[5].slice('[recovery-count] '.length));
 for(const key of Object.keys(counts)){
  for(const value of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'6']){
   const changed=[...lines];changed[5]='[recovery-count] '+JSON.stringify({...counts,[key]:value});
   assert.equal(expectedRed(output(changed)),false,`invalid-counter-${key}`);
  }
  const missing={...counts};delete missing[key];const changed=[...lines];changed[5]='[recovery-count] '+JSON.stringify(missing);
  assert.equal(expectedRed(output(changed)),false,`missing-counter-${key}`);
 }
 for(const row of ['[recovery-count] invalid','[recovery-count] '+JSON.stringify({...counts,extra:1}),
    '[recovery-count] '+JSON.stringify({...counts,firstPreflightParses:7}),
    '[recovery-count] '+JSON.stringify({...counts,actualApplyParses:5}),
    '[recovery-count] '+JSON.stringify({...counts,rebuildPreflightParses:5})]){
  const changed=[...lines];changed[5]=row;assert.equal(expectedRed(output(changed)),false);
 }
 for(const override of [{code:0},{code:2},{code:null},{signal:'SIGTERM'},{signal:'SIGKILL'},
    {stopReason:'timeout'},{stopReason:'output'},{groupClean:false},{groupClean:undefined}])
  assert.equal(expectedRed({...result,...override}),false);
 assert.equal(expectedRed({...result,stdout:'[fail] recovery fixed fixture preparation failure\n[summary] pass=0 fail=1\n'}),false);
 const greenLines=lines.map(x=>x.replace('[fail]','[pass]').replace('[summary] pass=3 fail=2','[summary] pass=5 fail=0'));
 greenLines[5]='[recovery-count] '+JSON.stringify({...counts,actualApplyParses:0,rebuildPreflightParses:0,projectionParses:0,projectionSerializes:0});
 const green={...result,code:0,stdout:greenLines.join('\n')+'\n'};
 assert.equal(expectedRecovery(green,'green'),true);assert.equal(expectedRecovery(green,'red'),false);
 for(let i=0;i<greenLines.length;++i){
  assert.equal(expectedRecovery({...green,stdout:greenLines.filter((_,j)=>j!==i).join('\n')},'green'),false);
  assert.equal(expectedRecovery({...green,stdout:[...greenLines,greenLines[i]].join('\n')},'green'),false);
 }
 for(const key of ['actualApplyParses','rebuildPreflightParses','projectionParses','projectionSerializes']){
  const changed=[...greenLines],value=JSON.parse(changed[5].slice('[recovery-count] '.length));value[key]=1;
  changed[5]='[recovery-count] '+JSON.stringify(value);assert.equal(expectedRecovery({...green,stdout:changed.join('\n')},'green'),false);
 }
 for(const override of [{code:1},{signal:'SIGKILL'},{stopReason:'timeout'},{groupClean:false}])assert.equal(expectedRecovery({...green,...override},'green'),false);
 const negatives=[
  'recovery proof rejects changed envelope identity and payload','recovery proof preserves physical ordinal and duplicate collision rules',
  'recovery proof never substitutes latest job for historical transition','recovery reused content preserves reservation source deletion and hold checks',
  'recovery journal change invalidates reuse and retains strict corruption rejection','recovery pending checkpoint uses strict fallback',
  'recovery budget exhaustion and admission exception preserve strict results','recovery proof ownership ends on success failure and exception',
  'recovery noncanonical binding preserves existing sqlite canonical bytes'];
 const fullLines=[...greenLines.slice(0,6),...negatives.map(x=>'[pass] '+x),'[not-run] realistic fifteen-second fixture: 2','[summary] pass=14 fail=0'];
 const full={...green,stdout:fullLines.join('\n')};assert.equal(expectedRecovery(full,'green',true),true);
 for(let i=0;i<negatives.length;++i){const at=6+i;
  assert.equal(expectedRecovery({...full,stdout:fullLines.filter((_,j)=>j!==at).join('\n')},'green',true),false);
  assert.equal(expectedRecovery({...full,stdout:[...fullLines,fullLines[at]].join('\n')},'green',true),false);
  const changed=[...fullLines];changed[at]=changed[at].replace('[pass]','[fail]');assert.equal(expectedRecovery({...full,stdout:changed.join('\n')},'green',true),false);
 }
 const observation={strictBaseline:false,sqlite:true,openUs:100,totalUs:200,coldBindings:6,coldJobs:4,proofReleased:true,jobCount:1,state:'complete',outputs:2,intentSha256:'a'.repeat(64),fullSemanticOracle:false};
 const diagnostic=value=>({...green,stdout:'[recovery-realistic-result] '+JSON.stringify(value)+'\n[summary] pass=0 fail=0\n'});
 assert.equal(expectedRealistic(diagnostic(observation),'recover-realistic'),true);
 assert.equal(expectedRealistic(diagnostic({...observation,sqlite:false}),'jsonl-realistic'),true);
 assert.equal(expectedRealistic(diagnostic({...observation,strictBaseline:true}),'strict-realistic'),true);
 for(const patch of [{totalUs:15000000},{jobCount:0},{coldJobs:3},{proofReleased:false},{intentSha256:'invalid'},{state:'ready'},{fullSemanticOracle:true}])
  assert.equal(expectedRealistic(diagnostic({...observation,...patch}),'recover-realistic'),false);
 for(const patch of [{signal:'SIGTERM'},{stopReason:'timeout'},{groupClean:false},{code:1}])assert.equal(expectedRealistic({...diagnostic(observation),...patch},'recover-realistic'),false);
 assert.equal(baselineTimedOut({groupClean:true,stopReason:'timeout'},'strict-realistic'),true);
 assert.equal(baselineTimedOut({groupClean:true,stopReason:'timeout'},'recover-realistic'),false);
 assert.equal(baselineTimedOut({groupClean:false,stopReason:'timeout'},'strict-realistic'),false);
 const shape={inputAU:1500,sources:6,samplesPerSource:250,sourceSamples:1500,sourceMappings:954,sourceFileEvidence:6,completeJobs:4,outputFiles:8,fullySatisfiedJobs:0,jobTransitions:24,journalBytes:100,historicalByteReproduction:false};
 const proofs=Array.from({length:4},(_,index)=>'[recovery-job-proof] '+JSON.stringify({index,state:'complete',verifiedOutput:true,outputs:2,requestFullySatisfied:false,unfulfilled:1,canonicalBytes:100,canonicalSha256:'b'.repeat(64)}));
 const preparation=['[pass] recovery realistic six-source four-complete-job fixture preserves output evidence','[recovery-realistic-shape] '+JSON.stringify(shape),...proofs,'[summary] pass=1 fail=0'];
 assert.equal(expectedRealistic({...green,stdout:preparation.join('\n')},'prepare-realistic'),true);
 assert.equal(expectedRealistic({...green,stdout:preparation.filter((_,i)=>i!==2).join('\n')},'prepare-realistic'),false);
 const verify=Array.from({length:3},(_,i)=>'[recovery-realistic-verification] '+JSON.stringify({strictBaseline:i===2,sqlite:i!==1,coldBindings:6,coldJobs:4,canonicalAndBytesEqual:true,proofReleased:true,openUs:100,totalUs:200}));
 assert.equal(expectedRealistic({...green,stdout:[...verify,'[summary] pass=0 fail=0'].join('\n')},'verify-realistic'),true);
 assert.equal(expectedRealistic({...green,stdout:[...verify.slice(1),'[summary] pass=0 fail=0'].join('\n')},'verify-realistic'),false);
});

// 준비 전용 라우팅과 안전 진단은 기존 복구 PASS와 별도 계약이다.
const diagnosticRow=(phase,index=0)=>({phase,index,profile:'native',selectionNative:true,selectedSources:2,plannedOutputs:2,bindingProofs:2,
 complete:phase==='after'?true:null,blocked:phase==='after'?false:null,hasJob:phase==='after'?true:null,
 state:phase==='after'?'complete':null,hasReady:phase==='after'?true:null,verifiedOutput:phase==='after'?true:null,
 outputCount:phase==='after'?2:null,requestFullySatisfied:phase==='after'?false:null,reason:phase==='after'?'none':null});
const diagnosticResult=(rows,patch={})=>({code:0,signal:null,stopReason:null,groupClean:true,
 stdout:rows.map(row=>'[recovery-prepare-diagnostic] '+JSON.stringify(row)).join('\n')+'\n',...patch});
const nativeRows=()=>Array.from({length:4},(_,i)=>[diagnosticRow('before',i),diagnosticRow('after',i)]).flat();
function preparationInspector(){
 assert.equal(typeof recoveryRunner.inspectPreparationDiagnostics,'function','준비 진단의 안전성과 성공을 분리하는 판정이 필요하다');
 return recoveryRunner.inspectPreparationDiagnostics;
}

test('LP24-RH02 준비 전용 실행계획',()=>{
 assert.equal(typeof recoveryRunner.recoveryPhasePlan,'function','준비 전용 실행계획은 복구를 자동 실행하지 않아야 한다');
 assert.deepEqual(recoveryRunner.recoveryPhasePlan('prepare-legacy'),['compile','prepare-legacy']);
 assert.deepEqual(recoveryRunner.recoveryPhasePlan('prepare-native'),['compile','prepare-native']);
 assert.deepEqual(recoveryRunner.recoveryPhasePlan('realistic'),['compile','prepare-realistic','recover-realistic','jsonl-realistic','strict-realistic','verify-realistic']);
 assert.throws(()=>recoveryRunner.recoveryPhasePlan('prepare-unknown'));
});

test('LP24-RH03 안전진단 필드·비밀 거부',()=>{
 const inspect=preparationInspector(),rows=nativeRows();
 assert.equal(inspect(diagnosticResult(rows),'native').diagnosticsPreserved,true);
 const change=patch=>rows.map((row,i)=>i===1?{...row,...patch}:row);
 assert.equal(inspect(diagnosticResult(change({reason:'unknown'})),'native').diagnosticsPreserved,true);
 assert.equal(inspect(diagnosticResult(change({reason:'unknown'})),'native').prepared,false);
 for(const patch of [{reason:'rtsp://diagnostic-canary.invalid/private'},{rawError:'diagnostic-secret-canary'},
   {profile:'arbitrary-profile'},{state:'arbitrary-state'},{index:-1},{outputCount:2.5}])
  assert.equal(inspect(diagnosticResult(change(patch)),'native').diagnosticsPreserved,false);
 for(const key of Object.keys(rows[1])){const changed=structuredClone(rows);delete changed[1][key];
  assert.equal(inspect(diagnosticResult(changed),'native').diagnosticsPreserved,false,`missing-${key}`);}
 assert.equal(inspect(diagnosticResult([...rows,rows[1]]),'native').diagnosticsPreserved,false);
 assert.equal(inspect(diagnosticResult(rows,{stdout:'[recovery-prepare-diagnostic] {broken\n'}),'native').diagnosticsPreserved,false);
});

test('LP24-RH04 native 준비 경로·증거 결박',()=>{
 const inspect=preparationInspector(),rows=nativeRows();
 assert.equal(inspect(diagnosticResult(rows),'native').prepared,true);
 for(const patch of [{profile:'legacy'},{selectionNative:false},{selectedSources:1},{plannedOutputs:1},{bindingProofs:0},{bindingProofs:1}]){
  const changed=rows.map((row,i)=>i<2?{...row,...patch}:row);
  assert.equal(inspect(diagnosticResult(changed),'native').prepared,false);
 }
 assert.equal(inspect(diagnosticResult(rows.slice(0,2)),'native').prepared,false);
 const legacy=rows.slice(0,2).map(row=>({...row,profile:'legacy',selectionNative:false,bindingProofs:0}));
 assert.equal(inspect(diagnosticResult(legacy),'legacy').diagnosticsPreserved,true);
 assert.equal(inspect(diagnosticResult(legacy),'legacy').prepared,false,'legacy 진단 완료는 native 준비 PASS가 아니다');
});

test('LP24-RH05 실패/진단 누락 판정',()=>{
 const inspect=preparationInspector(),before=diagnosticRow('before');
 assert.equal(typeof recoveryRunner.canCleanupPreparation,'function');
 const cleanup={groupClean:true,artifactPreserved:true,diagnosticsPreserved:true};
 assert.equal(recoveryRunner.canCleanupPreparation(cleanup),true);
 for(const key of Object.keys(cleanup))for(const value of [false,undefined])
  assert.equal(recoveryRunner.canCleanupPreparation({...cleanup,[key]:value}),false,`cleanup-${key}`);
 const failed={...diagnosticRow('after'),complete:false,blocked:true,state:'failed',hasReady:false,verifiedOutput:null,
  outputCount:null,requestFullySatisfied:null,reason:'job-remux: file-original-timestamp-mismatch'};
 const result=inspect(diagnosticResult([before,failed],{code:1}),'native');
 assert.equal(result.prepared,false);assert.equal(result.diagnosticsPreserved,true);
 for(const rows of [[],[before],[failed],[before,failed,failed]]){
  const actual=inspect(diagnosticResult(rows,{code:1}),'native');
  assert.equal(actual.prepared,false);assert.equal(actual.diagnosticsPreserved,false);
 }
 for(const patch of [{code:1},{signal:'SIGTERM'},{stopReason:'timeout'},{groupClean:false}])
  assert.equal(inspect(diagnosticResult(nativeRows(),patch),'native').prepared,false);
 const exceptional={...diagnosticRow('after'),complete:null,blocked:null,hasJob:null,state:null,hasReady:null,
  verifiedOutput:null,outputCount:null,requestFullySatisfied:null,reason:'exception'};
 assert.equal(inspect(diagnosticResult([before,exceptional],{code:1}),'native').diagnosticsPreserved,true);
 assert.equal(inspect(diagnosticResult([],{code:1,stdout:'[fail] recovery fixed fixture preparation failure\n'}),'native').diagnosticsPreserved,false);
});
