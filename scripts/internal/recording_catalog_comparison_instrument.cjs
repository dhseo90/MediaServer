'use strict';
// 기반 비용 계측을 먼저 실행한 뒤, 소유 복제본만 exact-match 보완한다.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const [repo,out,mode]=process.argv.slice(2);
if(mode&&mode!=='query')throw Error('LP21_MODE');
if(!repo||!out||!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(out))||fs.lstatSync(out).isSymbolicLink())throw Error('LP17_ROOT');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const r=cp.spawnSync(process.execPath,[path.join(repo,'scripts/internal/recording_catalog_cost_probe_instrument.cjs'),repo,out],{encoding:'utf8'});
if(r.status!==0)throw Error('LP17_BASE_INSTRUMENT');
process.stdout.write(r.stdout);
let edits=0;
function exact(s,a,b){if(s.split(a).length!==2)throw Error('LP17_EXACT_MATCH');++edits;return s.replace(a,b);}
function save(file,s,original){fs.writeFileSync(file,s,{flag:'wx'});console.log('[lp17] '+JSON.stringify({kind:'instrument',file:path.basename(file),originalSha256:hash(original),instrumentedSha256:hash(s)}));}
fs.mkdirSync(path.join(out,'include/recording'),{recursive:true});
for(const name of ['recording_catalog.h','recording_journal.h']){const s=fs.readFileSync(path.join(repo,'include/recording',name),'utf8');save(path.join(out,'include/recording',name),exact(s,'private:','public: // LP17 owned-copy only'),s);}
for(const name of ['recording_catalog.cpp','recording_journal.cpp']){
 const file=path.join(out,name),original=fs.readFileSync(file,'utf8');let s=original;
 if(name==='recording_catalog.cpp'){
  if(mode==='query'){
   function queryFn(name,code){const re=new RegExp('bool RecordingCatalog::'+name+'\\([^;{}]*\\)\\s*(?:const\\s*)?\\{','g');const matches=[...s.matchAll(re)];if(matches.length!==1)throw Error('LP21_FUNCTION');const m=matches[0];++edits;s=s.slice(0,m.index+m[0].length)+code+s.slice(m.index+m[0].length);}
   queryFn('SnapshotDerivedSourcesWithWaitLease',' if(query_probe::observing)++query_probe::attempts;fc::Scope query_call("query.call");');
   queryFn('SnapshotDerivedSourcesLocked',' if(query_probe::observing)++query_probe::fallbacks;');
   queryFn('MaterializeSourceBinding',' query_probe::Materialize();fc::Scope query_materialize("query.materialize");');
   s=exact(s,'    DerivedWaitLease next=existing==derived_wait_leases_.end()?DerivedWaitLease{identity,{}}:existing->second;','    fc::Scope query_protection("query.protection");\n    DerivedWaitLease next=existing==derived_wait_leases_.end()?DerivedWaitLease{identity,{}}:existing->second;');
   s='#include "recording_catalog_query_counter.h"\n'+s;
  }
  s=exact(s,'auto cached=std::move(checkpoint_cache_);','auto cached=std::move(checkpoint_cache_); if(lp17::cache_off)cached.reset();');
  s=exact(s,'if(!recover_only&&detail::CheckpointCacheAdmissible(candidate)){','if(!lp17::cache_off&&!recover_only&&detail::CheckpointCacheAdmissible(candidate)){');
  s=exact(s,'const auto first=reuse?cached->prefix.size():0;','fc::Event(reuse?"cache.reused":"cache.fullReplay"); const auto first=reuse?cached->prefix.size():0;');
 } else {
  // 성공한 실제 행 읽기를 호출/바이트로 구분한다. 검사 복제본 전용이며 payload를 출력하지 않는다.
  s=exact(s,"       RawHash(raw)!=location->raw_sha256)return corrupt();\n    RecordingMutationV1 parsed;",
   "       RawHash(raw)!=location->raw_sha256)return corrupt();\n    if(fc::enabled){++fc::metrics[\"journal.locatedRawRead.calls\"].count;fc::metrics[\"journal.locatedRawRead.bytes\"].count+=raw.size();}\n    RecordingMutationV1 parsed;");
  s=exact(s,'                poisoned_=true;return Fail(error,"automatic checkpoint 원문 손상/읽기 실패");\n            }',
   '                poisoned_=true;return Fail(error,"automatic checkpoint 원문 손상/읽기 실패");\n            }\n            if(fc::enabled){++fc::metrics["journal.noopRawRead.calls"].count;fc::metrics["journal.noopRawRead.bytes"].count+=raw.size();}');
  s+=String.raw`
namespace lp17 {
Owned Journal(const recording::RecordingJournal& j,EnvelopeOwners* seen){
 Owned n;EnvelopeOwners local;if(!seen)seen=&local;if(!j.managed_state_)return n;
 const auto& state=*j.managed_state_;
 if(state.records.size()!=state.locations.size())throw std::runtime_error("LP18_JOURNAL_METRIC_INDEX");
 Vector(n,state.records);Vector(n,state.locations);Vector(n,state.refs);
 for(std::size_t i=0;i<state.records.size();++i){
  const auto& location=state.locations[i];if(!location||location->ordinal!=i)throw std::runtime_error("LP18_JOURNAL_METRIC_LOCATION");
  n.locationStorageBytes+=sizeof(*location);
  for(const auto* s:{&location->raw_sha256,&location->record_identity,&location->schema,&location->mutation_id,&location->entity_id})String(n,*s);
  if(state.records[i])Envelope(n,state.records[i],*seen);
  else{++n.records;++n.coldEnvelopes;n.logicalEnvelopeBytes+=location->logical_charge;}
 }
 for(const auto& v:state.identities){String(n,v.first);String(n,v.second);}return n;
}
void Provenance(const recording::RecordingJournal& j){
 if(!j.managed_state_)return;std::size_t i=0;
 for(const auto& row:j.managed_state_->locations){if(!row||row->ordinal!=i)throw std::runtime_error("LP18_JOURNAL_METRIC_LOCATION");
  std::cout<<"[lp17] {\"kind\":\"mutation\",\"index\":"<<i++<<",\"mutationId\":\""<<row->mutation_id<<"\",\"occurredAtMs\":"<<row->occurred_at_ms<<",\"type\":"<<static_cast<int>(row->type)<<"}\n";}
}
}
`;
 }
 s='#include "recording_catalog_comparison_ownership.h"\n'+s;
 fs.writeFileSync(file,s);console.log('[lp17] '+JSON.stringify({kind:'instrument',file:name,originalSha256:hash(original),instrumentedSha256:hash(s)}));
}
console.log('[lp17] '+JSON.stringify({kind:'instrumentSummary',exactEdits:edits,cacheChange:'retention-and-reuse-only'}));
if(mode==='query'){
 const original=fs.readFileSync(path.join(repo,'scripts/internal/recording_catalog_comparison_probe.cpp'),'utf8');
 if(original.split('int main(').length!==2)throw Error('LP21_SEED_HELPER');
 let helper=original.slice(0,original.indexOf('int main('))+'\n#undef Check\n';
 for(const name of ['Prepare','Scale','Recovery'])helper=exact(helper,'void '+name+'(','[[maybe_unused]] void '+name+'(');
 save(path.join(out,'recording_catalog_query_seed.h'),helper,original);
}
