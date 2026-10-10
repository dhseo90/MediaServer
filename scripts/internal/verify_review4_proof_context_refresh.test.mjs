// 파일 용도: 독립 문맥 재결속의 source/ID/검토 거부 경계를 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { proofFiles, prepareRefresh, reviewedReplacements } from './review4_proof_context_refresh.mjs';
import { sha256, stableStringify } from './feature_semantic_review4_trust_lib.mjs';

function fixture(fn) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'review4-refresh-test-'));
  const write=(p,text)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),text);};
  try {
    write('docs/project-feature-test-inventory.md','fixed inventory');
    const candidate={candidateDigest:'a'.repeat(64),items:proofFiles.map((_,i)=>({id:`TEST-00${i}`}))};
    proofFiles.forEach((file,i)=>{
      write(`src/${i}.cpp`,`before\nanchor-${i}\nafter\n`);
      const role={file:`src/${i}.cpp`,symbol:`function${i}`,anchor:`anchor-${i}`,line:2,contextSha256:i===0?'b'.repeat(64):sha256(`before\nanchor-${i}\nafter`)};
      write(file,JSON.stringify({items:[{id:`TEST-00${i}`,roles:{owner:role},edges:[]}]}));
    });
    const proposal=prepareRefresh(root,candidate);
    const decisions={schema:proposal.schema+'.independent-decision',independent:true,reviewer:'independent-fixture-reviewer',implementationAuthor:'fixture-author',verdict:'approved',candidateDigest:proposal.candidateDigest,proposalSha256:sha256(stableStringify(proposal)),decisions:proposal.changes.map(c=>({id:c.id,role:c.role,decision:'approved',reason:'fixture test reviewed exact context',oldContextSha256:c.old.contextSha256,currentContextSha256:c.next.contextSha256,sourceSha256:proposal.sources[c.next.file]}))};
    fn({root,write,candidate,proposal,decisions,apply:()=>reviewedReplacements(root,candidate,proposal,decisions)});
  } finally {fs.rmSync(root,{recursive:true,force:true});}
}
test('MEM86 proof exact reviewed replacement without approval ledger',()=>fixture(f=>{
  const result=f.apply();assert.equal(result.length,1);assert.equal(result[0][1].items[0].roles.owner.contextSha256,sha256('before\nanchor-0\nafter'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,proofFiles[0]),'utf8')).items[0].roles.owner.contextSha256,'b'.repeat(64));
}));
test('MEM86 changed source even outside context rejected',()=>fixture(f=>{f.write('src/0.cpp','before\nanchor-0\nafter\nchanged body');assert.throws(f.apply,/drift/);}));
test('MEM86 stale candidate rejected',()=>fixture(f=>{f.candidate.candidateDigest='c'.repeat(64);assert.throws(f.apply,/drift/);}));
test('MEM86 wrong ID and missing independent decision rejected',()=>fixture(f=>{f.decisions.decisions[0].id='TEST-999';assert.throws(f.apply,/coverage/);f.decisions.decisions=[];assert.throws(f.apply,/coverage/);}));
test('MEM86 self-review or rejection cannot refresh',()=>fixture(f=>{f.decisions.reviewer='fixture-author';assert.throws(f.apply,/independent/);f.decisions.reviewer='separate';f.decisions.verdict='rejected';assert.throws(f.apply,/independent/);}));
test('MEM86 hash-only unreviewed context rejected',()=>fixture(f=>{f.decisions.decisions[0].sourceSha256='d'.repeat(64);assert.throws(f.apply,/unreviewed/);}));
test('MEM86 absent and ambiguous locator rejected',()=>fixture(f=>{f.write('src/0.cpp','absent');assert.throws(()=>prepareRefresh(f.root,f.candidate),/missing or ambiguous/);f.write('src/0.cpp','anchor-0\nanchor-0');assert.throws(()=>prepareRefresh(f.root,f.candidate),/missing or ambiguous/);}));
test('MEM86 inventory drift rejected',()=>fixture(f=>{f.write('docs/project-feature-test-inventory.md','other');assert.throws(f.apply,/drift/);}));
test('MEM86 proof payload drift rejected',()=>fixture(f=>{const p=path.join(f.root,proofFiles[0]);const x=JSON.parse(fs.readFileSync(p));x.items[0].rationale='unreviewed change';f.write(proofFiles[0],JSON.stringify(x));assert.throws(f.apply,/drift/);}));
