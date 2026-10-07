// 파일 용도: V450-E03/U02 출력 격리·조기 소스 결속·실패 전파의 모델 없는 반례.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {createReviewTestArtifacts,verifyReviewTestArtifacts} from './va_review_test_artifacts.mjs';
import {runReviewSeed} from './va_review_seed_process.mjs';
import {v450ReleaseCommands,withV450ArtifactOutput} from './v450_release_checks.mjs';
import {collectSourceProvenanceWithAllowedArtifacts as collect} from './evidence_integrity_lib.mjs';
const repo=fs.realpathSync(new URL('../../',import.meta.url).pathname);
const parentSource=fs.readFileSync(path.join(repo,'scripts/internal/verify_v390_test_acceptance_bundle.mjs'),'utf8');
function fixture(fn){const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-artifact-contract-'));try{return fn(root);}finally{fs.rmSync(root,{recursive:true});}}
async function asyncFixture(fn){const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-artifact-contract-'));try{return await fn(root);}finally{fs.rmSync(root,{recursive:true});}}
function env(root,name='check'){return {MEDIA_SERVER_TEST_ARTIFACT_ROOT:root,MEDIA_SERVER_TEST_OUTPUT_DIR:path.join(root,name)};}
function success(output,extra={}){const r={status:'PASS',exit:0,cleanup:{rootAbsent:true},browser:{screenshots:[]},...extra};output.checkpoint(r);return r;}
const png=Buffer.from('89504e470d0a1a0a0000000d494844520000000200000003','hex');
for(const outcome of ['success','failure','signal','timeout','spawn-error','throw'])test('seed single-call output retained before cleanup: '+outcome,()=>fixture(root=>{
 const fake=path.join(root,'repo');fs.mkdirSync(path.join(fake,'build-gst-onnx'),{recursive:true});
 fs.writeFileSync(path.join(fake,'build-gst-onnx/libmedia_server_runtime.a'),'runtime');
 const binary=path.join(root,'fixture');fs.writeFileSync(binary,'fixture');
 const store=path.join(root,'store');fs.mkdirSync(store);const output=createReviewTestArtifacts(repo,env(root));let calls=0;
 const launch=(command,args,options)=>{++calls;assert.equal(command,binary);assert.deepEqual(args,[store,'--confirmed-seed','unused']);
  assert.equal(options.cwd,fake);assert.equal(options.timeout,10000);assert.equal(options.maxBuffer,1024*1024);
  fs.writeFileSync(path.join(store,'partial.evp'),'incomplete');
  const error=Object.assign(new Error('seed '+store),{code:outcome==='timeout'?'ETIMEDOUT':'ENOENT'});
  if(outcome==='throw')throw error;
  return {status:outcome==='success'?0:outcome==='failure'?1:null,signal:outcome==='signal'?'SIGTERM':null,
   error:['timeout','spawn-error'].includes(outcome)?error:undefined,stdout:Buffer.from('created=0 error="actual-builder-error"'),stderr:Buffer.from('rtsp://test.invalid/source '+store)};};
 const call=()=>runReviewSeed({fixture:binary,root:store,mode:'--confirmed-seed',repo:fake,artifacts:output},launch);
 if(outcome==='success')call();else assert.throws(call,/preparation failed/);
 assert.equal(calls,1);const record=JSON.parse(fs.readFileSync(path.join(output.outputDir,'confirmed-seed.json')));
 assert(record.final.files.some(x=>x.path==='partial.evp'));assert.equal(record.initial.files.length,0);
 assert(fs.existsSync(path.join(store,'partial.evp')),'diagnostic helper never removes failure root');
 assert.equal(record.exitCode,outcome==='success'?0:outcome==='failure'?1:null);
 const stderr=fs.readFileSync(path.join(output.outputDir,'confirmed-seed.stderr'),'utf8');assert(!stderr.includes('rtsp://')&&!stderr.includes(store));
 if(outcome!=='throw')assert(fs.readFileSync(path.join(output.outputDir,'confirmed-seed.stdout'),'utf8').includes('actual-builder-error'));
 assert.throws(()=>output.write('../escape','x'));assert.throws(()=>output.write('confirmed-seed.json','overwrite'));
 assert.throws(()=>output.write('oversize.txt','x'.repeat(1024*1024+1)),/limit/);
}));
test('parent allocates distinct run/check roots and native screenshots/checkpoints keep bytes',()=>asyncFixture(async root=>{
  const runDir=path.join(root,'runs','current');fs.mkdirSync(runDir,{recursive:true});
  const specs=v450ReleaseCommands().map(s=>withV450ArtifactOutput(s,{artifactRoot:root,runDir})).filter(s=>s.env.MEDIA_SERVER_TEST_OUTPUT_DIR);
  assert.equal(specs.length,2);assert.notEqual(specs[0].env.MEDIA_SERVER_TEST_OUTPUT_DIR,specs[1].env.MEDIA_SERVER_TEST_OUTPUT_DIR);
  for(const spec of specs){const output=createReviewTestArtifacts(repo,spec.env);const shot=await output.screenshot({screenshot:async()=>png},'panel.png',{theme:'dark'});success(output,{browser:{screenshots:[shot]}});assert.equal(verifyReviewTestArtifacts(output.outputDir).screenshots,1);assert.equal(shot.pixelWidth,2);assert.equal(shot.pixelHeight,3);
    output.checkpoint({status:'RUNNING',progress:1});assert.throws(()=>verifyReviewTestArtifacts(output.outputDir),/child failed/);success(output);}
}));
test('standalone output is owned temporary and survives runtime cleanup',()=>{
 const output=createReviewTestArtifacts(repo,{});try{assert(output.outputDir.startsWith(fs.realpathSync(os.tmpdir())+'/media-server-review-artifacts-'));success(output);verifyReviewTestArtifacts(output.outputDir);}finally{fs.rmSync(output.outputDir,{recursive:true});}
});
for(const kind of ['missing-root','missing-output','traversal','outside','repository-source','version-root','collision','symlink-parent','write-failure'])test('reject before runner launch: '+kind,()=>fixture(root=>{
 const e=env(root);
 if(kind==='missing-root')delete e.MEDIA_SERVER_TEST_ARTIFACT_ROOT;
 if(kind==='missing-output')delete e.MEDIA_SERVER_TEST_OUTPUT_DIR;
 if(kind==='traversal')e.MEDIA_SERVER_TEST_OUTPUT_DIR=root+'/nested/../escape';
 if(kind==='outside')e.MEDIA_SERVER_TEST_OUTPUT_DIR=root+'-outside';
 if(kind==='repository-source'){e.MEDIA_SERVER_TEST_ARTIFACT_ROOT=repo;e.MEDIA_SERVER_TEST_OUTPUT_DIR=repo+'/src/should-not-exist';}
 if(kind==='version-root'){e.MEDIA_SERVER_TEST_ARTIFACT_ROOT=repo+'/docs/release-artifacts/v4.5.0';e.MEDIA_SERVER_TEST_OUTPUT_DIR=e.MEDIA_SERVER_TEST_ARTIFACT_ROOT+'/should-not-exist';}
 if(kind==='collision')fs.mkdirSync(e.MEDIA_SERVER_TEST_OUTPUT_DIR);
 if(kind==='symlink-parent'){fs.symlinkSync(root,path.join(root,'link'));e.MEDIA_SERVER_TEST_OUTPUT_DIR=root+'/link/check';}
 if(kind==='write-failure')fs.chmodSync(root,0o500);
 try{assert.throws(()=>createReviewTestArtifacts(repo,e));}finally{fs.chmodSync(root,0o700);}
}));
test('file escape, overwrite, symlink replacement and screenshot tamper rejected',()=>asyncFixture(async root=>{
 const o=createReviewTestArtifacts(repo,env(root));await assert.rejects(o.screenshot({screenshot:async()=>png},'../out.png'));
 const shot=await o.screenshot({screenshot:async()=>png},'panel.png');await assert.rejects(o.screenshot({screenshot:async()=>png},'panel.png'),/collision/);
 success(o,{browser:{screenshots:[shot]}});fs.appendFileSync(path.join(o.outputDir,shot.file),'tamper');assert.throws(()=>verifyReviewTestArtifacts(o.outputDir),/hash mismatch/);
 fs.unlinkSync(path.join(o.outputDir,'report.json'));fs.symlinkSync(path.join(root,'external'),path.join(o.outputDir,'report.json'));assert.throws(()=>success(o));assert(!fs.existsSync(path.join(root,'external')));
}));
for(const state of [{status:'FAIL',exit:1},{cleanup:{rootAbsent:false}},{failure:'SIGTERM',status:'FAIL',exit:1}])test('child failure/signal/cleanup cannot become success '+JSON.stringify(state),()=>fixture(root=>{
 const o=createReviewTestArtifacts(repo,env(root));success(o,state);assert.throws(()=>verifyReviewTestArtifacts(o.outputDir),/child failed/);
}));
test('real runners reject invalid output before runtime/server/browser',()=>fixture(root=>{
 for(const file of ['va_review_confirmed_http.mjs','va_review_http_checks.mjs','visual_search_ui_fixture.mjs']){
  const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal',file)],{env:{...process.env,...env(root),MEDIA_SERVER_TEST_OUTPUT_DIR:root+'/../escape'},encoding:'utf8',timeout:5000});
  assert.equal(r.status,1);assert.match(r.stderr,/output outside parent artifact root/);assert(!r.stdout.includes('[artifacts]'));
 }
}));
test('visual preparation rejects ambiguous parent and legacy report before startup',()=>fixture(root=>{
 const r=spawnSync(process.execPath,[path.join(repo,'scripts/internal/visual_search_ui_fixture.mjs'),'--report',path.join(root,'legacy.json')],
  {env:{...process.env,...env(root)},encoding:'utf8',timeout:5000});
 assert.equal(r.status,1);assert.match(r.stderr,/parent output and legacy report are exclusive/);
 assert(!fs.existsSync(path.join(root,'check'))&&!fs.existsSync(path.join(root,'legacy.json')));
}));
test('same existing provenance detects outside PNG/JSON/product/test/fixture and checkpoint-only escape; early gate prevents longrun/UI',()=>asyncFixture(async root=>{
 const git=args=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git(['init','-q']);git(['config','user.name','fixture']);git(['config','user.email','fixture@example.invalid']);
 for(const dir of ['src','scripts','test','allowed'])fs.mkdirSync(path.join(root,dir));
 for(const file of ['src/product.cpp','scripts/check.mjs','test/fixture.json'])fs.writeFileSync(path.join(root,file),'original\n');
 git(['add','.']);git(['commit','-qm','fixture']);const allowed=path.join(root,'allowed'),initial=collect(root,allowed);
 const body=parentSource.slice(parentSource.indexOf('function verifyFeatureSourceBinding()'),parentSource.indexOf('function runCommand(spec,'));
 const gate=()=>{const stages=[{id:'feature-gates',status:'PASS'}],ctx=vm.createContext({path,rootDir:root,outputDir:allowed,runDir:allowed,sourceProvenance:initial,stages,failedStage:'',collectSourceProvenanceWithAllowedArtifacts:collect,writeJson:(f,r)=>fs.writeFileSync(f,JSON.stringify(r)),replaceStageWithValidationFailure:(id,m)=>{ctx.failedStage=id;stages[0].status='FAIL';stages[0].message=m;}});vm.runInContext(body,ctx);ctx.verifyFeatureSourceBinding();return ctx;};
 fs.writeFileSync(path.join(allowed,'panel.png'),png);assert.equal(gate().failedStage,'');assert.equal(collect(root,allowed).sourcePatchSha256,initial.sourcePatchSha256);
 for(const file of ['outside.png','outside.json','checkpoint.json','src/product.cpp','scripts/check.mjs','test/fixture.json']){
  const target=path.join(root,file),previous=fs.existsSync(target)?fs.readFileSync(target):null;fs.writeFileSync(target,'changed');
  const ctx=gate();assert.equal(ctx.failedStage,'feature-gates');assert.match(ctx.stages[0].message,new RegExp(file.replaceAll('.','\\.')));
  // 원 parent loop를 사용한다. feature만 이미 수행한 상태로 제한하며 후속 실제 명령은 호출하지 않는다.
  const loop=parentSource.slice(parentSource.indexOf('async function runActualBundle()'),parentSource.indexOf('function assertFirstFailureClosure('));
  const calls=[];Object.assign(ctx,{stageIds:['server-longrun-30','ui-exact-424','server-longrun-120'],stageSelectedForSuite:()=>true,longrun120Decision:{executionDecision:'run'},notRunStage:(id,reason)=>({id,status:'not-run',reason}),printProgress:()=>{},normalizeTextArtifacts:()=>{},finalizeRetainedArtifactSecretScanner:async()=>({result:'FAIL'}),printSummary:()=>{},fixtureMode:false,runRealStage:async id=>calls.push(id),recordFailure:()=>{throw Error('unexpected');}});
  vm.runInContext(loop,ctx);await ctx.runActualBundle();assert.equal(calls.length,0);assert(ctx.stages.slice(1).every(x=>x.status==='not-run'));
  if(previous)fs.writeFileSync(target,previous);else fs.unlinkSync(target);
 }
}));
test('parent rejects lost wrapper output and propagates actual signal exit; real wrappers preserve env',()=>asyncFixture(async root=>{
 for(const file of ['verify_va_review_confirmed.py','verify_va_review.sh'])assert.match(fs.readFileSync(path.join(repo,'scripts/internal',file),'utf8'),/dict\(os.environ,MEDIA_SERVER_VA_REVIEW_FIXTURE_BIN/);
 const begin=parentSource.indexOf('async function runCommandListStage('),end=parentSource.indexOf('function childProcessEnv(');
 const ctx=vm.createContext({fs,path,Date,Number,Promise,spawn,process,runDir:root,rootDir:repo,failedStage:'',failedCommand:'',stages:[],commandText:s=>s.id,makeStage:x=>x,tailLines:s=>s.split(/\r?\n/).slice(-40),verifyReviewTestArtifacts,childProcessEnv:x=>({...process.env,...x})});vm.runInContext(parentSource.slice(begin,end),ctx);
 await ctx.runCommandListStage('feature-gates',[{id:'lost-output',file:process.execPath,args:['-e','process.exit(0)'],env:env(root,'missing')},{id:'after',file:process.execPath,args:['-e','process.exit(0)'],env:{}}]);
 assert.equal(ctx.stages[0].checks[0].status,'FAIL');assert.equal(ctx.stages[0].checks[1].status,'not-run');assert.match(ctx.stages[0].checks[0].tail.join(' '),/child artifact binding/);
 ctx.failedStage='';ctx.stages=[];await ctx.runCommandListStage('feature-gates',[{id:'signal',file:process.execPath,args:['-e',"process.kill(process.pid,'SIGTERM')"],env:{}}]);assert.equal(ctx.stages[0].status,'FAIL');assert.equal(ctx.stages[0].checks[0].exitCode,1);
}));
test('actual stage ordering wires early check once after feature-gates; final source policy remains',()=>{
 assert.match(parentSource,/else await runRealStage\(stageId\);\s*if \(stageId === "feature-gates" && !failedStage\) verifyFeatureSourceBinding\(\);/);
 assert.match(parentSource,/buildFeatureCommands\(\)\.map\(spec=>withV450ArtifactOutput/);
 assert.match(parentSource,/currentUiIntegritySource = collectSourceProvenanceWithAllowedArtifacts\(rootDir, outputDir\)/);
 for(const file of ['va_review_confirmed_http.mjs','va_review_http_checks.mjs','va_review_release_ui.mjs','va_review_material_http.mjs'])assert(!fs.readFileSync(path.join(repo,'scripts/internal',file),'utf8').includes('docs/release-artifacts/'),'fixed output remains '+file);
});
