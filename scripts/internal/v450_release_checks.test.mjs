// 파일 용도: 현행 inventory의 필수 범위와 실제 출시 dispatch의 양방향 결속 반례.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {v450ReleaseCommands,validateV450ReleaseRegistration} from './v450_release_checks.mjs';
const root=new URL('../../',import.meta.url).pathname;
const inventory=fs.readFileSync(root+'docs/project-feature-test-inventory.md','utf8');
test('V450-E03 R55-F2 current required IDs have executed dedicated scopes',()=>{
  const current=['current-product','safety-compat'].flatMap(kind=>inventory.match(new RegExp('<!-- v450-'+kind+': ([A-Z0-9 ]+) -->'))[1].split(' ').map(id=>'V450-'+id));
  const result=validateV450ReleaseRegistration(root);
  assert.deepEqual(current.filter(id=>!result.linkedIds.includes(id)),[],'missing mandatory dedicated regression');
});
for(const id of ['V450-K05','V450-K07','V450-K08','V450-U02','V450-E03']){
  test('V450-E03 rejects omitted dedicated command '+id,()=>{
    const plan=v450ReleaseCommands().filter(c=>!c.featureIds.includes(id));
    assert.throws(()=>validateV450ReleaseRegistration(root,inventory,plan),/missing mandatory scope/);
  });
  test('V450-E03 rejects kept ID with another existing command '+id,()=>{
    const plan=v450ReleaseCommands();const row=plan.find(c=>c.featureIds.includes(id));row.args=['scripts/internal/verify_va_review.sh'];row.file='bash';
    assert.throws(()=>validateV450ReleaseRegistration(root,inventory,plan),/missing dedicated command\/options/);
  });
}
for(const [id,option] of [['V450-K07','--observations'],['V450-U02','--http'],['V450-E03','--v450-plan-only']])test('V450-E03 rejects missing '+option,()=>{
  const plan=v450ReleaseCommands();plan.find(c=>c.featureIds.includes(id)).args.pop();
  assert.throws(()=>validateV450ReleaseRegistration(root,inventory,plan),new RegExp('missing dedicated command/options '+id));
});
for(const [file,old,reason] of [
  ['verify_va_review_bound_record.py',"run([str(root / 'smoke'), str(root / 'core'), '--core-only', 'unused'])",'K05'],
  ['verify_va_review_bound_record.py','--bound-read','K08'],
  ['verify_evidence_package.sh',"subprocess.run([str(root/'evidence-smoke'), str(root), 'readback'], check=True",'K07'],
  ['verify_va_review_confirmed.py',"run(['node',str(repo/'scripts/internal/va_review_confirmed_http.mjs')],timeout=240,env=env)",'U02'],
  ['va_review_confirmed_http.mjs','playwright.chromium.launch','U02'],
  ['verify_v390_test_acceptance_bundle_contract.mjs','testV450ReleaseRegistration(rootDir);','E03']
])test('V450-E03 rejects removed actual subcall '+reason+' '+file,()=>{
  const read=path=>{const source=fs.readFileSync(root+path,'utf8');return path==='scripts/internal/'+file?source.replace(old,'removed-scope'):source;};
  assert.throws(()=>validateV450ReleaseRegistration(root,inventory,v450ReleaseCommands(),read),new RegExp('missing transitive scope '+reason));
});
for(const change of ['undefined','duplicate','bad-reference'])test('V450-E03 rejects '+change,()=>{
  const plan=v450ReleaseCommands();if(change==='undefined')plan[0].featureIds.push('V450-Z99');else if(change==='duplicate')plan[0].featureIds.push(plan[0].featureIds[0]);else plan[0].proof='README.md';
  assert.throws(()=>validateV450ReleaseRegistration(root,inventory,plan));
});
