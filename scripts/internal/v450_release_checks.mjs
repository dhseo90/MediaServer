// 파일 용도: 출시의 제한된 단기 명령/ID 연결. 독립 승인이나 모델 품질 실행 계획이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function withV450ArtifactOutput(spec,{artifactRoot,runDir}){
  if(!['v450-A-http','v450-release-http'].includes(spec.id))return spec;
  assert(path.isAbsolute(artifactRoot)&&path.isAbsolute(runDir)&&runDir.startsWith(artifactRoot+path.sep),'invalid parent run root');
  return {...spec,env:{...spec.env,MEDIA_SERVER_TEST_ARTIFACT_ROOT:artifactRoot,MEDIA_SERVER_TEST_OUTPUT_DIR:path.join(runDir,spec.id)}};
}
export function v450ReleaseCommands(){
  return [
    {id:'v450-search',file:'python3',args:['scripts/internal/verify_v450_search.py'],featureIds:['V450-T01','V450-S02','V450-S03','V450-R01','V450-R02','V450-R03'],owner:'ingress/recording',proof:'scripts/internal/visual_search_application_smoke.cpp',action:'--scope-only'},
    {id:'v450-evidence',file:'bash',args:['scripts/internal/verify_evidence_package.sh'],featureIds:[],owner:'recording',proof:'scripts/internal/evidence_package_smoke.cpp',action:'main'},
    {id:'v450-journal-residency',file:'bash',args:['scripts/internal/verify_recording_generation_checkpoint.sh','residency'],featureIds:['V450-M01'],owner:'recording',proof:'scripts/internal/recording_generation_checkpoint_smoke.cpp',action:'IdentityResidency'},
    {id:'v450-search-lifetime',file:'bash',args:['scripts/internal/verify_recording_search_lifetime.sh'],featureIds:[],owner:'recording',proof:'scripts/internal/recording_search_cursor_smoke.cpp',action:'main'},
    {id:'v450-review-release',file:'bash',args:['scripts/internal/verify_va_review.sh'],featureIds:['V450-E01','V450-I01','V450-C01','V450-S01','V450-Q01','V450-G01','V450-N01','V450-N02','V450-N03'],owner:'ingress/recording',proof:'scripts/internal/va_review_smoke.cpp',action:'ReleaseAdmissionChecks'},
    {id:'v450-A-confirmed',file:'python3',args:['scripts/internal/verify_va_review_confirmed.py'],featureIds:['V450-K09','V450-A02'],owner:'ingress/recording',proof:'scripts/internal/va_review_confirmed_checks.h',action:'ConfirmedChecks'},
    {id:'v450-A-observations',file:'bash',args:['scripts/internal/verify_evidence_package.sh','--observations'],featureIds:['V450-K07'],owner:'recording',proof:'scripts/internal/evidence_observation_smoke.cpp',action:'main'},
    {id:'v450-A-bound',file:'python3',args:['scripts/internal/verify_va_review_bound_record.py'],featureIds:['V450-K05','V450-K08'],owner:'recording',proof:'scripts/internal/va_review_bound_record_checks.h',action:'BoundRead'},
    {id:'v450-A-http',file:'python3',args:['scripts/internal/verify_va_review_confirmed.py','--http'],featureIds:['V450-U02'],owner:'ingress',proof:'scripts/internal/va_review_confirmed_http.mjs',action:'uiCheck'},
    {id:'v450-A-ui-state',file:'node',args:['--test','scripts/internal/evidence_ui_state.test.mjs'],featureIds:[],owner:'ingress',proof:'scripts/internal/evidence_ui_state.test.mjs',action:'R55-F1'},
    {id:'v450-registration',file:'node',args:['scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs','--v450-plan-only'],featureIds:['V450-E03'],owner:'verification',proof:'scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs',action:'testV450ReleaseRegistration'},
    {id:'v450-materials',file:'bash',args:['scripts/internal/verify_va_review.sh','--materials-only'],featureIds:['V450-K11'],owner:'recording',proof:'scripts/internal/va_review_material_checks.h',action:'MaterialChecks'},
    {id:'v450-release-http',file:'bash',args:['scripts/internal/verify_va_review.sh','--http-only'],featureIds:['V450-E02','V450-A01','V450-U01','V450-A03','V450-U03'],owner:'ingress',proof:'scripts/internal/va_review_http_checks.mjs',action:'verifyReleaseUi'},
  ].map(x=>({...x,env:{},scope:'release-short',qualityModelCalls:0}));
}
export const v450ExplicitModelExperiments=['--local','--diagnostic-text','--diagnostic-text-uncertain','--diagnostic-text-decisive','--diagnostic-inversion','--cause-ab','--observe-local','--questions-local','--rephrase-local','--visual-local','--local-lifecycle'];
export const v450OfflineModelSafety=['--contract-only','--core-only','--observer-only','--questions-only','--rephrase-only','--visual-only','--visual-regression'];
export function validateV450ReleaseRegistration(root,inventory=fs.readFileSync(path.join(root,'docs/project-feature-test-inventory.md'),'utf8'),commands=v450ReleaseCommands(),readSource=file=>fs.readFileSync(path.join(root,file),'utf8')){
  const rows=inventory.split('\n').filter(x=>/^\| V450-[A-Z]\d+(?:\/[A-Z]\d+)* \|/.test(x));
  const ids=rows.flatMap(x=>x.split('|')[1].trim().replace('V450-','').split('/').map(id=>'V450-'+id));
  assert.equal(new Set(ids).size,ids.length,'duplicate V450 ID');
  // 오래된 표 밖의 K/A/U 정의도 실제 정의 머리말에서 읽는다. 본문 참조만으로 누락을 감추지 않는다.
  const prose=inventory.split('\n').filter(x=>/^V450-[A-Z]\d+(?: \/ V450-[A-Z]\d+)*\(/.test(x))
    .flatMap(x=>x.slice(0,x.indexOf('(')).match(/V450-[A-Z]\d+/g));
  const declared=new Set([...ids,...prose]);
  const groups={};for(const kind of ['current-product','safety-compat','unassigned','historical-experiment']){
    const matches=[...inventory.matchAll(new RegExp('<!-- v450-'+kind+': ([A-Z0-9 ]+) -->','g'))];
    assert.equal(matches.length,1,'missing/duplicate current classification '+kind);groups[kind]=matches[0][1].split(' ').map(x=>'V450-'+x);
  }
  const classified=Object.values(groups).flat();assert.equal(new Set(classified).size,classified.length,'duplicate classified ID');
  assert.deepEqual([...classified].sort(),[...declared].sort(),'classification/definition mismatch');
  const required=[...groups['current-product'],...groups['safety-compat']];
  const linked=commands.flatMap(x=>x.featureIds);
  assert.equal(new Set(commands.map(x=>x.id)).size,commands.length,'duplicate command ID');
  assert.equal(new Set(linked).size,linked.length,'duplicate linked feature ID');
  for(const id of linked)assert(declared.has(id),`missing V450 definition ${id}`);
  for(const id of required)assert(linked.includes(id),`missing mandatory scope ${id}`);
  for(const id of linked)assert(required.includes(id),`non-release scope ${id}`);
  // 필수 전용 실행 계약은 전달된 계획에서 역산하지 않는다. K08의 기존 core 전체 호출을 K05에 재사용한다.
  for(const [ids,file,args] of [
    [['V450-K05','V450-K08'],'python3',['scripts/internal/verify_va_review_bound_record.py']],
    [['V450-M01'],'bash',['scripts/internal/verify_recording_generation_checkpoint.sh','residency']],
    [['V450-K07'],'bash',['scripts/internal/verify_evidence_package.sh','--observations']],
    [['V450-U02'],'python3',['scripts/internal/verify_va_review_confirmed.py','--http']],
    [['V450-E03'],'node',['scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs','--v450-plan-only']],
  ])for(const id of ids){const item=commands.find(x=>x.featureIds.includes(id));assert(item.file===file&&JSON.stringify(item.args)===JSON.stringify(args),`missing dedicated command/options ${id}`);}
  const need=(file,text,reason)=>assert(readSource(file).includes(text),'missing transitive scope '+reason);
  need('scripts/internal/verify_va_review_bound_record.py',"run([str(root / 'smoke'), str(root / 'core'), '--core-only', 'unused'])",'K05 core invocation');
  need('scripts/internal/va_review_smoke.cpp','else if(std::string(argv[2])=="--core-only")CoreChecks(argv[1]);','K05 dispatch');
  for(const mode of ['--bound-seed','--bound-read','--records-only'])need('scripts/internal/verify_va_review_bound_record.py',mode,'K08 '+mode);
  need('scripts/internal/verify_evidence_package.sh',"observation_mode = sys.argv[3] == '--observations'",'K07 option');
  need('scripts/internal/verify_evidence_package.sh',"smoke = 'evidence_observation_smoke.cpp' if observation_mode else 'evidence_package_smoke.cpp'",'K07 fixture');
  for(const mode of ['seed','recover','readback'])need('scripts/internal/verify_evidence_package.sh',"subprocess.run([str(root/'evidence-smoke'), str(root), '"+mode+"'], check=True",'K07 '+mode);
  need('scripts/internal/verify_va_review_confirmed.py',"if '--http' in sys.argv or '--materials-http' in sys.argv:",'U02 option');
  need('scripts/internal/verify_va_review_confirmed.py',"run(['node',str(repo/'scripts/internal/va_review_confirmed_http.mjs')],timeout=240,env=env)",'U02 HTTP/browser');
  need('scripts/internal/va_review_confirmed_http.mjs','playwright.chromium.launch','U02 browser');
  need('scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs','testV450ReleaseRegistration(rootDir);','E03 registration');
  assert.deepEqual(commands,v450ReleaseCommands(),'release command/owner/action/proof mismatch');
  const byId=id=>rows.find(x=>x.startsWith('| '+id+' |'))||'';
  assert(byId('V450-S01').includes('record 원자 저장'),'storage ID meaning changed');
  assert(byId('V450-T01').includes('InspectText'),'search ID meaning changed');
  for(const item of commands){
    assert(fs.existsSync(path.join(root,item.args[0]==='--test'?item.args[1]:item.args[0])),`missing dispatch ${item.id}`);
    assert(fs.readFileSync(path.join(root,item.proof),'utf8').includes(item.action),`missing action/proof ${item.id}`);
    assert(!item.args.some(x=>v450ExplicitModelExperiments.includes(x)),'quality experiment in release');
  }
  const wrapper=fs.readFileSync(path.join(root,'scripts/internal/verify_va_review.sh'),'utf8');
  const smoke=fs.readFileSync(path.join(root,'scripts/internal/va_review_smoke.cpp'),'utf8');
  for(const mode of [...v450ExplicitModelExperiments,...v450OfflineModelSafety])assert(wrapper.includes(mode)&&smoke.includes(mode),`missing explicit dispatch ${mode}`);
  const defaultBody=smoke.slice(smoke.indexOf('else if(std::string(argv[2])=="--protocol")'));
  for(const fn of ['ReleaseAdmissionChecks','InputChecks','RecordChecks','QueueChecks','ProviderChecks','ConnectionChecks'])assert(defaultBody.includes(fn+'(argv[1]'),'missing default safety '+fn);
  assert(!/QualityChecks|VisualLocal|QuestionsLocal|RephraseLocal|CoreObserve/.test(defaultBody),'default quality invocation');
  return {currentV450Rows:rows.length,tableIds:ids,currentDefinedIds:[...declared].sort(),linkedIds:[...new Set(linked)],requiredIds:required,classification:groups,scope:'registration-not-independent-approval',explicitExperiments:v450ExplicitModelExperiments,offlineSafety:v450OfflineModelSafety};
}
export function testV450ReleaseRegistration(root){
  const inventory=fs.readFileSync(path.join(root,'docs/project-feature-test-inventory.md'),'utf8');const result=validateV450ReleaseRegistration(root,inventory);
  for(const bad of [inventory+'\n'+inventory.split('\n').find(x=>x.startsWith('| V450-S01 |')),
    inventory+'\n| V450-A04 | duplicate combined ID |',
    inventory.replace(/^\| V450-T01 \|.*\n/m,'')])assert.throws(()=>validateV450ReleaseRegistration(root,bad));
  const bad=v450ReleaseCommands();bad[0].args=['scripts/internal/verify_va_review.sh','--visual-local'];assert.throws(()=>validateV450ReleaseRegistration(root,inventory,bad));
  console.log(JSON.stringify({status:'PASS',...result,negativeChecks:['duplicate','missing','wrong-command'],modelCalls:0}));return result;
}
