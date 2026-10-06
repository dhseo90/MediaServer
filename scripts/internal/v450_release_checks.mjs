// 파일 용도: 출시의 제한된 단기 명령/ID 연결. 독립 승인이나 모델 품질 실행 계획이 아니다.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function v450ReleaseCommands(){
  return [
    {id:'v450-search',file:'python3',args:['scripts/internal/verify_v450_search.py'],featureIds:['V450-T01','V450-S02','V450-S03','V450-R01','V450-R02','V450-R03'],owner:'ingress/recording',proof:'scripts/internal/visual_search_application_smoke.cpp',action:'--scope-only'},
    {id:'v450-evidence',file:'bash',args:['scripts/internal/verify_evidence_package.sh'],featureIds:[],owner:'recording',proof:'scripts/internal/evidence_package_smoke.cpp',action:'main'},
    {id:'v450-search-lifetime',file:'bash',args:['scripts/internal/verify_recording_search_lifetime.sh'],featureIds:[],owner:'recording',proof:'scripts/internal/recording_search_cursor_smoke.cpp',action:'main'},
    {id:'v450-review-release',file:'bash',args:['scripts/internal/verify_va_review.sh'],featureIds:['V450-E01','V450-I01','V450-C01','V450-S01','V450-Q01','V450-G01','V450-N01','V450-N02','V450-N03'],owner:'ingress/recording',proof:'scripts/internal/va_review_smoke.cpp',action:'ReleaseAdmissionChecks'},
    {id:'v450-A-confirmed',file:'python3',args:['scripts/internal/verify_va_review_confirmed.py'],featureIds:['V450-K09','V450-A02'],owner:'ingress/recording',proof:'scripts/internal/va_review_confirmed_checks.h',action:'ConfirmedChecks'},
    {id:'v450-materials',file:'bash',args:['scripts/internal/verify_va_review.sh','--materials-only'],featureIds:['V450-K11'],owner:'recording',proof:'scripts/internal/va_review_material_checks.h',action:'MaterialChecks'},
    {id:'v450-release-http',file:'bash',args:['scripts/internal/verify_va_review.sh','--http-only'],featureIds:['V450-E02','V450-A01','V450-U01','V450-A03','V450-U03'],owner:'ingress',proof:'scripts/internal/va_review_http_checks.mjs',action:'verifyReleaseUi'},
  ].map(x=>({...x,env:{},scope:'release-short',qualityModelCalls:0}));
}
export const v450ExplicitModelExperiments=['--local','--diagnostic-text','--diagnostic-text-uncertain','--diagnostic-text-decisive','--diagnostic-inversion','--cause-ab','--observe-local','--questions-local','--rephrase-local','--visual-local','--local-lifecycle'];
export const v450OfflineModelSafety=['--contract-only','--core-only','--observer-only','--questions-only','--rephrase-only','--visual-only','--visual-regression'];
export function validateV450ReleaseRegistration(root,inventory=fs.readFileSync(path.join(root,'docs/project-feature-test-inventory.md'),'utf8'),commands=v450ReleaseCommands()){
  const rows=inventory.split('\n').filter(x=>/^\| V450-[A-Z]\d+(?:\/[A-Z]\d+)* \|/.test(x));
  const ids=rows.flatMap(x=>x.split('|')[1].trim().replace('V450-','').split('/').map(id=>'V450-'+id));
  assert.equal(new Set(ids).size,ids.length,'duplicate V450 ID');
  // 오래된 표 밖의 K/A/U 정의도 실제 정의 머리말에서 읽는다. 본문 참조만으로 누락을 감추지 않는다.
  const prose=inventory.split('\n').filter(x=>/^V450-[A-Z]\d+(?: \/ V450-[A-Z]\d+)*\(/.test(x))
    .flatMap(x=>x.slice(0,x.indexOf('(')).match(/V450-[A-Z]\d+/g));
  const declared=new Set([...ids,...prose]);
  const canonical=v450ReleaseCommands();assert.deepEqual(commands,canonical,'release command/owner/action/proof mismatch');
  const linked=commands.flatMap(x=>x.featureIds);
  for(const id of linked)assert(declared.has(id),`missing V450 definition ${id}`);
  const byId=id=>rows.find(x=>x.startsWith('| '+id+' |'))||'';
  assert(byId('V450-S01').includes('record 원자 저장'),'storage ID meaning changed');
  assert(byId('V450-T01').includes('InspectText'),'search ID meaning changed');
  for(const item of commands){
    assert(fs.existsSync(path.join(root,item.args[0])),`missing dispatch ${item.id}`);
    assert(fs.readFileSync(path.join(root,item.proof),'utf8').includes(item.action),`missing action/proof ${item.id}`);
    assert(!item.args.some(x=>v450ExplicitModelExperiments.includes(x)),'quality experiment in release');
  }
  const wrapper=fs.readFileSync(path.join(root,'scripts/internal/verify_va_review.sh'),'utf8');
  const smoke=fs.readFileSync(path.join(root,'scripts/internal/va_review_smoke.cpp'),'utf8');
  for(const mode of [...v450ExplicitModelExperiments,...v450OfflineModelSafety])assert(wrapper.includes(mode)&&smoke.includes(mode),`missing explicit dispatch ${mode}`);
  const defaultBody=smoke.slice(smoke.indexOf('else if(std::string(argv[2])=="--protocol")'));
  for(const fn of ['ReleaseAdmissionChecks','InputChecks','RecordChecks','QueueChecks','ProviderChecks','ConnectionChecks'])assert(defaultBody.includes(fn+'(argv[1]'),'missing default safety '+fn);
  assert(!/QualityChecks|VisualLocal|QuestionsLocal|RephraseLocal|CoreObserve/.test(defaultBody),'default quality invocation');
  return {currentV450Rows:rows.length,tableIds:ids,currentDefinedIds:[...declared].sort(),linkedIds:[...new Set(linked)],scope:'registration-not-independent-approval',explicitExperiments:v450ExplicitModelExperiments,offlineSafety:v450OfflineModelSafety};
}
export function testV450ReleaseRegistration(root){
  const inventory=fs.readFileSync(path.join(root,'docs/project-feature-test-inventory.md'),'utf8');const result=validateV450ReleaseRegistration(root,inventory);
  for(const bad of [inventory+'\n'+inventory.split('\n').find(x=>x.startsWith('| V450-S01 |')),
    inventory+'\n| V450-A04 | duplicate combined ID |',
    inventory.replace(/^\| V450-T01 \|.*\n/m,'')])assert.throws(()=>validateV450ReleaseRegistration(root,bad));
  const bad=v450ReleaseCommands();bad[0].args=['scripts/internal/verify_va_review.sh','--visual-local'];assert.throws(()=>validateV450ReleaseRegistration(root,inventory,bad));
  console.log(JSON.stringify({status:'PASS',...result,negativeChecks:['duplicate','missing','wrong-command'],modelCalls:0}));return result;
}
