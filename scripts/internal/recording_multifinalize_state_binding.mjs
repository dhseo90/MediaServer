// 파일 용도: 검증된 과거 바이트와 현재 clean HEAD를 결속하며 과거 실행의 HEAD·결과는 재작성하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
export const MULTIFINALIZE_SCHEMA='multifinalize-state-binding-v1';
export const MULTIFINALIZE_ANCHORS=Object.freeze({
 base:'d25e0fd3614e424a1ad17680e557f98af01733de311cd506f084efa134ef3df7',
 native:'f7db282d76aea58f989310a833b1f68b760b2107b8e885e909283e2fb7e96a23',
 smoke:'5da30373d488bda5404ba9a2ce3a1b800a54563b86abe0a9172110cdf68309c5',
 shutdown:'751c01633a934ea1aae1704477cf11d4221bb9b8b0b89d5d81668282aad995b4',
});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const need=(v,c)=>assert(v,c),hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const git=(repo,args,options={})=>execFileSync('git',args,{cwd:repo,encoding:'utf8',...options});
const relative=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.split('/').some(v=>v==='..'||v==='.'||!v);
export function boundArtifact(entry){
 need(entry&&path.isAbsolute(entry.path)&&fs.realpathSync(entry.path)===entry.path&&hex(entry.sha256),'multi-artifact-path');
 const s=fs.lstatSync(entry.path);need(s.isFile()&&s.uid===process.getuid()&&s.nlink===1,'multi-artifact-owner');
 const bytes=fs.readFileSync(entry.path);need(hash(bytes)===entry.sha256&&bytes.length===entry.bytes,'multi-artifact-sha');return bytes;
}
export function validateCandidateIdentity(repo,result){
 need(result.schema===MULTIFINALIZE_SCHEMA,'multi-schema');
 need(git(repo,['status','--porcelain=v1','--untracked-files=all']).length===0,'multi-dirty-index-or-worktree');
 need(git(repo,['rev-parse','HEAD']).trim()===result.head,'multi-head');
 need(git(repo,['branch','--show-current']).trim()===result.branch,'multi-branch');
 need(/^[a-f0-9]{40}$/.test(result.productHead)&&git(repo,['merge-base','--is-ancestor',result.productHead,result.head])==='','multi-product-ancestor');
 const sources=JSON.parse(boundArtifact(result.sourceManifest));
 const names=git(repo,['ls-tree','-r','--name-only','HEAD','--','CMakeLists.txt','src','include']).trim().split('\n').sort();
 assert.deepEqual(Object.keys(sources).sort(),names,'multi-source-coverage');
 const raw=execFileSync('git',['cat-file','--batch'],{cwd:repo,input:names.map(p=>`HEAD:${p}\n`).join(''),maxBuffer:32*1024*1024});let offset=0;
 for(const p of names){need(relative(p)&&hex(sources[p]),'multi-source-path');const end=raw.indexOf(10,offset),m=/^[a-f0-9]{40} blob (\d+)$/.exec(raw.subarray(offset,end).toString());need(m,'multi-head-blob');offset=end+1;const size=Number(m[1]);need(hash(raw.subarray(offset,offset+size))===sources[p]&&hash(fs.readFileSync(path.join(repo,p)))===sources[p],'multi-source-bytes:'+p);offset+=size;need(raw[offset++]===10,'multi-head-blob');}need(offset===raw.length,'multi-head-blob');
 return sources;
}
export function verifyEvidenceManifest(root,expected){
 need(path.isAbsolute(root)&&fs.realpathSync(root)===root,'multi-evidence-root');const bytes=fs.readFileSync(path.join(root,'artifact-manifest.json'));need(hash(bytes)===expected,'multi-evidence-manifest');const m=JSON.parse(bytes),seen=new Set();need(Array.isArray(m.files)&&m.files.length>0,'multi-evidence-files');
 for(const e of m.files){need(relative(e.path)&&!seen.has(e.path)&&hex(e.sha256),'multi-evidence-entry');seen.add(e.path);boundArtifact({path:path.join(root,e.path),sha256:e.sha256,bytes:e.bytes});}return m;
}
export function bindMultifinalizeStateProduct(env,product,runtime,result,api){
 const {repo,assertVerifiedStateFreshness,stateHelperBytes,STATE_PRODUCT_SMOKE_SHA}=api;
 const sources=validateCandidateIdentity(repo,result);need(product===result.build.product.path&&runtime===result.build.runtime.path,'multi-product-selection');boundArtifact(result.build.product);boundArtifact(result.build.runtime);
 const base=verifyEvidenceManifest(result.lineage.base.root,MULTIFINALIZE_ANCHORS.base),smoke=verifyEvidenceManifest(result.lineage.smoke.root,MULTIFINALIZE_ANCHORS.smoke),shutdown=verifyEvidenceManifest(result.lineage.shutdown.root,MULTIFINALIZE_ANCHORS.shutdown);
 for(const name of ['base','native','smoke','shutdown'])need(result.lineage[name].sha256===MULTIFINALIZE_ANCHORS[name],'multi-lineage-anchor');
 const baseRoot=result.lineage.base.root,smokeRoot=result.lineage.smoke.root,sdRoot=result.lineage.shutdown.root;
 const nativePath=path.join(baseRoot,'preserved/native-evidence/manifest.json');need(result.lineage.native.root===path.dirname(nativePath),'multi-native-selection');need(hash(fs.readFileSync(nativePath))===MULTIFINALIZE_ANCHORS.native,'multi-native-manifest');const native=JSON.parse(fs.readFileSync(nativePath));need(native.verdict==='MULTI_FINALIZE_BOUNDED_NATIVE_VERIFIED','multi-native-verdict');
 for(const e of native.evidence){need(relative(e.path),'multi-native-path');boundArtifact({path:path.join(path.dirname(nativePath),e.path),sha256:e.sha256,bytes:e.bytes});}
 const preservation=JSON.parse(fs.readFileSync(path.join(baseRoot,'preservation.json'))),original=new Map(preservation.sourceFiles.map(e=>[e.path,e]));
 const overlay=new Map(smoke.files.filter(e=>e.path.startsWith('validation-source/')).map(e=>[e.path.slice(18),e]));
 const oldNames=git(repo,['ls-tree','-r','--name-only',result.productHead,'--','CMakeLists.txt','src','include']).trim().split('\n').sort();
 const old=JSON.parse(boundArtifact(result.verifiedProductSources));assert.deepEqual(Object.keys(old).sort(),oldNames,'multi-product-coverage');
 for(const p of oldNames){const entry=overlay.get(p)??original.get(p);need(entry&&old[p]===entry.sha256,'multi-smoke-source:'+p);const file=overlay.has(p)?path.join(smokeRoot,'validation-source',p):path.join(baseRoot,'preserved/source',p);need(hash(fs.readFileSync(file))===old[p]&&hash(execFileSync('git',['show',`${result.productHead}:${p}`],{cwd:repo}))===old[p],'multi-product-commit:'+p);}
 const provenance=JSON.parse(fs.readFileSync(path.join(smokeRoot,'provenance.json'))),observed=JSON.parse(fs.readFileSync(path.join(smokeRoot,'phase-results/observations.json'))),oldExecution=JSON.parse(fs.readFileSync(path.join(smokeRoot,'http/execution.json')));
 need(provenance.newProductSha256===provenance.sourceBinding.binarySha256&&oldExecution.source.binarySha256===provenance.newProductSha256,'multi-smoke-binary');assert.deepEqual(oldExecution.source,oldExecution.sourceEnd,'multi-smoke-source-end');need(oldExecution.exit===0&&observed.status==='PASS','multi-smoke-result');
 const sd=JSON.parse(fs.readFileSync(path.join(sdRoot,'phase-results/observations.json')));need(sd.verdict==='SHUTDOWN_BOUNDED_NONREPRO_P0_OPEN'&&sd.productRuns===5&&sd.runs.every(r=>r.assertionsFail===0&&r.clientStopElapsedMs<5000&&r.groupsAbsent),'multi-shutdown-evidence');
 // 명시적으로 검토된 진단 overlay만 검증된 제품 C++와 다를 수 있다.
 const diagnostic=JSON.parse(boundArtifact(result.diagnosticManifest));const changed=Object.keys(sources).filter(p=>sources[p]!==old[p]).sort();assert.deepEqual(Object.keys(diagnostic).sort(),changed,'multi-diagnostic-coverage');need(changed.length===17,'multi-diagnostic-scope');
 const sdFiles=new Set(JSON.parse(fs.readFileSync(path.join(sdRoot,'phase-results/final-verification.json'))).changesAgainstPriorProductSmoke.filter(x=>x.path.startsWith('src/')||x.path.startsWith('include/')).map(x=>x.path));need(changed.every(p=>sdFiles.has(p)),'multi-diagnostic-path');for(const p of changed)need(diagnostic[p]===sources[p],'multi-diagnostic-bytes');
 for(const spec of result.patches){const bytes=boundArtifact(spec);const actual=execFileSync('git',['diff','--binary',spec.from,spec.to,'--'],{cwd:repo,maxBuffer:8*1024*1024});need(Buffer.compare(actual,bytes)===0,'multi-patch');}
 need(result.patches.length===2&&result.patches[0].from==='5a3b7b9a0890e2a7950c644ed398092e378a5da5'&&result.patches[0].to===result.productHead&&result.patches[1].from===result.productHead&&result.patches[1].to===result.head,'multi-patch-chain');
 const shortExecution=JSON.parse(boundArtifact(result.short.execution)),shortReport=JSON.parse(boundArtifact(result.short.report));need(shortExecution.exit===0&&shortExecution.childExit===0&&!shortExecution.timedOut&&shortExecution.processGroupAbsent&&shortExecution.registeredGroupsAbsent&&shortReport.failed===0&&shortReport.blockerResults,'multi-new-short');assert.deepEqual(shortExecution.source,shortExecution.sourceEnd,'multi-short-source-end');need(shortExecution.source.head===result.head&&shortExecution.source.binarySha256===result.build.product.sha256,'multi-short-binding');
 const shortFiles=git(repo,['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(p=>p&&!p.startsWith('docs/release-artifacts/')).sort();const shortRows=[...new Set(shortFiles)].map(p=>[p,hash(fs.readFileSync(path.join(repo,p)))]);need(hash(JSON.stringify(shortRows).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')))===shortExecution.source.sourceSha256,'multi-short-source-bytes');
 need(result.shutdownPreflight.mode==='stop'&&result.shutdownPreflight.normalProcesses===3&&result.shutdownPreflight.signalReceipts===3&&result.shutdownPreflight.loss===false,'multi-shutdown-preflight');const stopCheck=JSON.parse(boundArtifact(result.shutdownPreflight.artifact));assert.deepEqual(stopCheck.summary,{mode:'stop',normalProcesses:3,signalReceipts:3,loss:false},'multi-shutdown-result');
 const baselineDir=env.MEDIA_SERVER_STATE_PRODUCT_SMOKE;need(baselineDir===result.dependencies.baseline,'multi-model-baseline');const baselineBytes=fs.readFileSync(path.join(baselineDir,'result.json'));need(hash(baselineBytes)===STATE_PRODUCT_SMOKE_SHA.result,'multi-baseline');const baseline=JSON.parse(baselineBytes),modelBytes=fs.readFileSync(path.join(baselineDir,'model-sha256.json'));need(hash(modelBytes)===STATE_PRODUCT_SMOKE_SHA.models,'multi-model-manifest');const models=JSON.parse(modelBytes);
 for(const [p,h]of Object.entries(models)){need(relative(p)&&hash(fs.readFileSync(path.join(repo,p)))===h,'multi-model:'+p);}
 assert.deepEqual(result.dependencies.dynamicLibraries,baseline.binding.dynamicLibrariesSHA256,'multi-libraries');for(const [p,h]of Object.entries(result.dependencies.dynamicLibraries))need(hash(fs.readFileSync(p))===h,'multi-library');
 const dependency=JSON.parse(fs.readFileSync(path.join(repo,'models/v430-siglip2/preparation.json'))).sentencepiece_cpp,external={};for(const rel of ['sentencepiece/include/sentencepiece_processor.h','sentencepiece/lib/libsentencepiece.a']){const entries=dependency.artifacts.filter(a=>a.file===rel);need(entries.length===1,'multi-vendor');const p='third_party/v430-embedding/'+rel;need(hash(fs.readFileSync(path.join(repo,p)))===entries[0].sha256,'multi-vendor-sha');external[p]=entries[0].sha256;}
 const checked=JSON.parse(execFileSync('python3',['-B','-c',`import sys,json\nfrom pathlib import Path\nr,b=map(Path,sys.argv[1:3]);sys.path.insert(0,str(r/'scripts/internal'))\nimport recording_build_freshness as f\ni=set();v=f.check(r,b,sys.argv[3],sys.argv[4],repository_inputs=i)\nprint(json.dumps({'freshness':v,'repoInputs':sorted(str(p.relative_to(r)) for p in i)}))`,repo,path.dirname(product),result.build.product.sha256,result.build.runtime.sha256],{encoding:'utf8',timeout:20000,maxBuffer:65536}));need(checked.repoInputs.length>0&&checked.repoInputs.every(p=>hex(sources[p]??external[p])),'multi-build-coverage');assertVerifiedStateFreshness(checked.freshness,JSON.parse(boundArtifact(result.build.freshness)),result.build.product.sha256,result.build.runtime.sha256);
 const helpers={};for(const name of ['normalize','process-metrics','review-seed']){boundArtifact(result.helpers[name]);helpers[name]={path:result.helpers[name].path,sha256:result.helpers[name].sha256};}
 const generated=result.helpers['catalog-instrumented.cpp'];boundArtifact(generated);helpers['catalog-instrumented.cpp']={path:path.join(repo,'src/recording/recording_catalog.cpp'),generator:'instrumentCatalog',bytes:generated.bytes,sha256:generated.sha256};stateHelperBytes(helpers['catalog-instrumented.cpp']);
 need(git(repo,['status','--porcelain=v1','--untracked-files=all']).length===0&&git(repo,['rev-parse','HEAD']).trim()===result.head,'multi-source-changed');
 return {helpers,matched:Object.keys(sources).length,sha256:{product:result.build.product.sha256,runtime:result.build.runtime.sha256},verifiedResult:env.MEDIA_SERVER_STATE_VERIFIED_RESULT,verifiedResultSha256:env.MEDIA_SERVER_STATE_VERIFIED_RESULT_SHA256,freshness:checked.freshness,sourceBinding:{head:result.head,branch:result.branch,productHead:result.productHead,manifestSha256:result.sourceManifest.sha256},evidenceSchema:MULTIFINALIZE_SCHEMA,priorEvidenceNotRerun:true,shutdownMode:'stop'};
}
