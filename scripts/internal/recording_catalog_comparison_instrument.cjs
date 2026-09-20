'use strict';
// 기반 비용 계측을 먼저 실행한 뒤, 소유 복제본만 exact-match 보완한다.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const [repo,out]=process.argv.slice(2);
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
  s=exact(s,'auto cached=std::move(checkpoint_cache_);','auto cached=std::move(checkpoint_cache_); if(lp17::cache_off)cached.reset();');
  s=exact(s,'if(!recover_only&&detail::CheckpointCacheAdmissible(candidate)){','if(!lp17::cache_off&&!recover_only&&detail::CheckpointCacheAdmissible(candidate)){');
  s=exact(s,'const auto first=reuse?cached->prefix.size():0;','fc::Event(reuse?"cache.reused":"cache.fullReplay"); const auto first=reuse?cached->prefix.size():0;');
 } else {
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
