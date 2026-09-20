import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsePhases,ownedRoot,snapshotTree,copyVerified,cleanupAllowed,cleanupProfile,exact,instrumentCatalog,instrumentProbe,safeOutput,targetHash,selectReference} from './recording_archive_diagnostic_profile.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),parent=fs.realpathSync(os.tmpdir());
const line=(kind,phase,id,atUs,elapsedUs=0)=>'[archive-phase] '+JSON.stringify({kind,phase,id,atUs,elapsedUs})+'\n';
const complete=line('begin','catalog-open',1,0)+line('begin','open',2,1)+line('end','open',2,4,3)+line('end','catalog-open',1,5,5);
function owned(fn){const root=fs.realpathSync(fs.mkdtempSync(path.join(parent,'media-server-current-integration-')));fs.chmodSync(root,0o700);const identity=ownedRoot(root,parent);
  try{return fn(root,identity);}finally{if(fs.existsSync(root)){const result=cleanupProfile(root,parent,identity,{originalSame:true,sourceSame:true,groupClean:true,evidencePreserved:true});assert(result.removed);assert(!fs.existsSync(root));console.log('[profile-selftest-cleanup] '+JSON.stringify(result));}}}
test('LP23-DH01 phase nesting and completed diagnostic remain distinct from app PASS',()=>{
  const result=parsePhases(complete);assert(result.complete);assert.equal(result.rows.length,4);assert.deepEqual(result.openPhases,[]);assert(!Object.hasOwn(result,'applicationPass'));
  assert.throws(()=>parsePhases(line('begin','open',1,1)+line('end','query',1,2,1)));
  assert.throws(()=>parsePhases(line('begin','open',1,1)+line('end','open',1,4,2)));
});
test('LP23-DH02 timeout preserves last open phase without synthetic completion',()=>{
  const partial=line('begin','catalog-open',1,1)+line('begin','open',2,2)+line('begin','open-preflight',3,3);
  const result=parsePhases(partial,{timeout:true});assert.equal(result.complete,false);assert.equal(result.rows.filter(x=>x.kind==='end').length,0);
  assert.deepEqual(result.openPhases.map(x=>x.phase),['catalog-open','open','open-preflight']);assert.throws(()=>parsePhases(partial));
});
test('LP23-DH03 partial malformed unknown and secret-bearing trace rows reject',()=>owned(root=>{
  const secret='writer-secret-canary-not-for-output';
  for(const input of [complete.trimEnd(),'[archive-phase] {bad}\n',complete.replace('"open"','"unknown"'),complete.replace('"elapsedUs":0','"raw":"'+secret+'","elapsedUs":0')])assert.throws(()=>parsePhases(input));
  const redacted=parsePhases(secret+'\n'+complete);assert.equal(redacted.discardedLines,1);assert(!JSON.stringify(redacted).includes(secret));
  const value={state:'complete',managed:true,jobCount:1,referenceSha256:targetHash,capturedIntentSha256:'a'.repeat(64),sourceCount:2,outputCount:2,plannedOutputCount:2,fileReceiptCount:2,copyCatalogOpened:true,snapshotBasis:'offline-copy-at-query',failureTimeEquivalent:false,remuxPerformed:false};
  const dest=path.join(root,'state.json');assert.equal(safeOutput(JSON.stringify(value),true,dest).state,'complete');
  assert.throws(()=>safeOutput(JSON.stringify({...value,raw:secret}),true,path.join(root,'unsafe.json')));assert(!fs.existsSync(path.join(root,'unsafe.json')));
}));
test('LP23-DH04 owned nofollow copy preserves every byte and rejects foreign scope',()=>owned(root=>{
  const source=path.join(root,'recordings');fs.mkdirSync(source,{mode:0o700});fs.mkdirSync(path.join(source,'empty'),{mode:0o700});
  fs.writeFileSync(path.join(source,'input.bin'),Buffer.from([0,10,13,255]),{mode:0o600});const before=snapshotTree(source);
  const copy=copyVerified(source,path.join(root,'projection-copy-1/recordings'),before);assert.equal(copy.sha256,before.sha256);assert(fs.existsSync(path.join(root,'projection-copy-1/recordings/empty')));
  assert.throws(()=>ownedRoot(root,path.join(parent,'foreign')));fs.symlinkSync(path.join(source,'input.bin'),path.join(source,'alias'));assert.throws(()=>snapshotTree(source));fs.unlinkSync(path.join(source,'alias'));
  fs.linkSync(path.join(source,'input.bin'),path.join(source,'hard'));assert.throws(()=>snapshotTree(source));fs.unlinkSync(path.join(source,'hard'));
  const reference='fixture-reference',journal=path.join(source,'journal');fs.writeFileSync(journal,JSON.stringify({mutationType:'consumer_reference_put',entityId:reference,payload:{reference:{reference_id:reference}}})+'\n');
  assert.equal(selectReference(journal,crypto.createHash('sha256').update(reference).digest('hex')),reference);assert.throws(()=>selectReference(journal));
}));
test('LP23-DH05 changed original or unconfirmed child blocks cleanup',()=>owned((root,identity)=>{
  const source=path.join(root,'recordings');fs.mkdirSync(source,{mode:0o700});fs.writeFileSync(path.join(source,'row'),Buffer.from('a'),{mode:0o600});const before=snapshotTree(source);
  fs.writeFileSync(path.join(source,'row'),Buffer.from('b'));assert.notEqual(snapshotTree(source).sha256,before.sha256);
  const proof={originalSame:true,sourceSame:true,groupClean:true,evidencePreserved:true};
  for(const key of Object.keys(proof)){assert.equal(cleanupAllowed({...proof,[key]:false}),false);assert.throws(()=>cleanupProfile(root,parent,identity,{...proof,[key]:false}));assert(fs.existsSync(root));}
  assert.throws(()=>cleanupProfile(root,parent,{...identity,ino:identity.ino+1},proof));
}));
test('LP23-DH06 exact instrumentation drift and trace bounds fail closed',()=>owned(root=>{
  assert.throws(()=>exact('a a','a','b'));assert.throws(()=>exact('','a','b'));
  const catalog=fs.readFileSync(path.resolve(here,'../../src/recording/recording_catalog.cpp'),'utf8');
  const probe=fs.readFileSync(path.join(here,'recording_current_archive_probe.cpp'),'utf8');
  assert(instrumentCatalog(catalog).includes('Phase::RebuildProject'));assert(instrumentProbe(probe).includes('copy,true)'));assert(instrumentProbe(probe,{jsonl:true}).includes('copy,false)'));
  assert.throws(()=>instrumentCatalog(catalog.replace('bool RecordingCatalog::OpenLocked(std::string* error) {','changed')));
  const cpp=path.join(root,'collector.cpp'),binary=path.join(root,'collector');
  fs.writeFileSync(cpp,'#include "recording_archive_phase_trace.h"\nint main(){try{archive_phase::Scope s(archive_phase::Phase::Query);throw 1;}catch(...){}for(int i=0;i<200;++i){archive_phase::Scope s(archive_phase::Phase::Release);}return 0;}\n',{mode:0o600});
  const env={PATH:process.env.PATH,TMPDIR:root,LANG:'C',LC_ALL:'C'};
  const compile=spawnSync('c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I'+here,cpp,'-o',binary],{env,encoding:'utf8',timeout:30000,maxBuffer:131072});assert.equal(compile.status,0,'native collector compile');
  const run=spawnSync(binary,[],{env,encoding:'utf8',timeout:10000,maxBuffer:131072});assert.equal(run.status,0,'native collector exit');
  console.log('[profile-native] '+JSON.stringify({compileExit:compile.status,runExit:run.status,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(cpp)).digest('hex'),binarySha256:crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex')}));
  const trace=parsePhases(run.stderr,{timeout:true});assert.equal(trace.rows.length,256);assert(trace.loss);assert.equal(trace.rows[1].kind,'end');assert.equal(trace.rows[1].phase,'query');assert(Buffer.byteLength(run.stderr)<=131072);assert.equal(run.stdout,'');
}));
