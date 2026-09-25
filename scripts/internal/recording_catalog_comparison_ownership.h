#pragma once
// 파일 용도: LP17 검사 복제본 전용. 아래 수치는 부분 payload/capacity이며 heap/RSS 귀속 합계가 아니다.
#include "recording/recording_catalog.h"
#include "recording_process_memory_probe.h"
#include <iostream>
#include <unordered_set>
namespace lp17 {
inline bool cache_off=false;
struct Owned {
 std::uint64_t coldEnvelopes=0,residentBindings=0,coldBindings=0,residentJobs=0,coldJobs=0,entryStorageBytes=0,locationStorageBytes=0;
 std::uint64_t logicalLinkCount=0,logicalEnvelopeChargeBytes=0,weakLinkCount=0,residentFallbackLinkCount=0;
 std::uint64_t records=0,samples=0,fileSamples=0,mappings=0,stringBytes=0,stringCapacity=0,vectorCapacityBytes=0,jobs=0,segments=0,bindings=0,tombstones=0,accessUnits=0,uniqueEnvelopes=0,sharedEnvelopeReferences=0,logicalEnvelopeBytes=0,uniqueBindingObjects=0,sharedBindingReferences=0,logicalBindingSamples=0,uniqueJobObjects=0,sharedJobReferences=0;
};
inline void String(Owned& n,const std::string& s){n.stringBytes+=s.size();n.stringCapacity+=s.capacity();}
template<class T> inline void Vector(Owned& n,const std::vector<T>& v){n.vectorCapacityBytes+=v.capacity()*sizeof(T);}
inline void Segment(Owned& n,const recording::RecordingSegmentV2& s){++n.segments;n.mappings+=s.mappings.size();Vector(n,s.mappings);for(const auto& m:s.mappings)for(const auto* p:{&m.schema,&m.mapping_id,&m.provenance,&m.reason})String(n,*p);for(const auto* p:{&s.schema,&s.segment_id,&s.source_id,&s.channel_id,&s.store_id,&s.order_request_id,&s.media_epoch_id,&s.container,&s.checksum_sha256})String(n,*p);}
inline void Binding(Owned& n,const recording::RecordingSourceBindingV1& b){++n.bindings;n.samples+=b.samples.size();Vector(n,b.samples);for(const auto* p:{&b.schema,&b.segment_id,&b.source_id,&b.channel_id,&b.store_id,&b.media_epoch_id,&b.source_generation,&b.track_id,&b.incomplete_reason})String(n,*p);if(b.file_evidence){const auto& f=*b.file_evidence;n.fileSamples+=f.samples.size();Vector(n,f.samples);String(n,f.profile);String(n,f.file_sha256);for(const auto& s:f.samples){String(n,s.sample_sha256);String(n,s.vcl_sha256);}}}
inline void Mutations(Owned& n,const std::vector<recording::RecordingMutationV1>& v){n.records+=v.size();Vector(n,v);for(const auto& m:v){String(n,m.schema);String(n,m.mutation_id);String(n,m.entity_id);String(n,m.payload_json);}}
using EnvelopeOwners=std::unordered_set<const recording::RecordingMutationV1*>;
using BindingOwners=std::unordered_set<const recording::RecordingSourceBindingV1*>;
using JobOwners=std::unordered_set<const recording::DerivedJobRecordV1*>;
inline void SharedJob(Owned& n,const std::shared_ptr<const recording::DerivedJobRecordV1>& value,JobOwners& seen){if(!value)throw std::runtime_error("LP18_NULL_JOB");++n.jobs;if(!seen.insert(value.get()).second){++n.sharedJobReferences;return;}++n.uniqueJobObjects;const auto& j=*value;String(n,j.intent.selection_json);Vector(n,j.intent.sources);for(const auto& s:j.intent.sources){Segment(n,s.segment);Binding(n,s.binding);}if(j.ready){Vector(n,j.ready->outputs);for(const auto& output:j.ready->outputs){Segment(n,output.segment);const auto& p=output.provenance;n.accessUnits+=p.access_units.size();Vector(n,p.access_units);Vector(n,p.source_decoded_sha256);Vector(n,p.output_decoded_sha256);for(const auto& hash:p.source_decoded_sha256)String(n,hash);for(const auto& hash:p.output_decoded_sha256)String(n,hash);}}}
inline void SharedBinding(Owned& n,const std::shared_ptr<const recording::RecordingSourceBindingV1>& binding,BindingOwners& seen){if(!binding)throw std::runtime_error("LP18_NULL_BINDING");n.logicalBindingSamples+=binding->samples.size();if(seen.insert(binding.get()).second){++n.uniqueBindingObjects;Binding(n,*binding);}else{++n.bindings;++n.sharedBindingReferences;}}
// records/logicalEnvelopeBytes는 참조별 논리량, 실제 envelope 문자열은 한 관측의 journal 우선 단일 owner에만 센다.
inline void Envelope(Owned& n,const recording::RecordingMutationHandle& handle,EnvelopeOwners& seen){if(!handle)throw std::runtime_error("LP18_NULL_ENVELOPE");++n.records;const auto& m=*handle;n.logicalEnvelopeBytes+=sizeof(m)+m.schema.size()+m.mutation_id.size()+m.entity_id.size()+m.payload_json.size();if(seen.insert(handle.get()).second){++n.uniqueEnvelopes;String(n,m.schema);String(n,m.mutation_id);String(n,m.entity_id);String(n,m.payload_json);}else ++n.sharedEnvelopeReferences;}
// thin 논리 charge와 실제 strong fallback을 분리한다. weak 관측을 strong 소유로 합산하지 않는다.
inline void Envelope(Owned& n,const recording::RecordingMutationLink& link,EnvelopeOwners& seen){++n.logicalLinkCount;n.logicalEnvelopeChargeBytes+=link.LogicalCharge();if(link.IsWeakLink()){++n.weakLinkCount;++n.records;n.logicalEnvelopeBytes+=link.LogicalCharge();}else{const auto owned=link.ResidentOwned();if(!owned)throw std::runtime_error("LP18_NULL_LINK");++n.residentFallbackLinkCount;Envelope(n,owned,seen);}}
inline void Mutations(Owned& n,const recording::RecordingMutationLinks& v,EnvelopeOwners* seen=nullptr){EnvelopeOwners local;if(!seen)seen=&local;Vector(n,v);for(const auto& link:v)Envelope(n,link,*seen);}
inline void Mutations(Owned& n,const recording::RecordingMutationHandles& v,EnvelopeOwners* seen=nullptr){EnvelopeOwners local;if(!seen)seen=&local;Vector(n,v);for(const auto& handle:v)Envelope(n,handle,*seen);}
inline void Catalog(Owned& n,const recording::RecordingCatalog& c,EnvelopeOwners* seen=nullptr,BindingOwners* bindings=nullptr,JobOwners* jobs=nullptr){
 EnvelopeOwners local;if(!seen)seen=&local;BindingOwners local_bindings;if(!bindings)bindings=&local_bindings;JobOwners local_jobs;if(!jobs)jobs=&local_jobs;
 for(const auto& e:c.segments_v2_)Segment(n,e.second);
 for(const auto& e:c.source_bindings_){
  const auto& v=e.second;if(!v)throw std::runtime_error("LP18_NULL_BINDING_ENTRY");
  String(n,e.first);n.entryStorageBytes+=sizeof(v);
  for(const auto* s:{&v.id,&v.channel,&v.source,&v.generation,&v.track,&v.latest_mutation_id})String(n,*s);
  if(v.mutation.LogicalCharge())Envelope(n,v.mutation,*seen);
  // 외부 reader가 weak를 살려 놓아도 이 entry의 strong 보관으로 세지 않는다.
  if(const auto resident=v.ResidentOwned()){++n.residentBindings;SharedBinding(n,resident,*bindings);}
  else{++n.coldBindings;++n.bindings;n.logicalBindingSamples+=v.sample_count;}
 }
 for(const auto& id:c.mutation_ids_)String(n,id);
 for(const auto& e:c.accepted_segment_state_mutations_){String(n,e.first);Envelope(n,e.second,*seen);}
 n.tombstones=c.tombstones_v2_.size();for(const auto& e:c.tombstones_v2_){String(n,e.first);String(n,e.second.tombstone_id);String(n,e.second.deletion_reason);Segment(n,e.second.segment);}
 for(const auto& e:c.derived_jobs_){
  const auto& v=e.second;if(!v)throw std::runtime_error("LP18_NULL_JOB_ENTRY");
  String(n,e.first);n.entryStorageBytes+=sizeof(v);for(const auto* s:{&v.id,&v.channel,&v.reference,&v.latest_mutation_id})String(n,*s);
  Vector(n,v.source_ids);Vector(n,v.output_ids);for(const auto& s:v.source_ids)String(n,s);for(const auto& s:v.output_ids)String(n,s);
  if(v.mutation.LogicalCharge())Envelope(n,v.mutation,*seen);
  if(const auto resident=v.ResidentOwned()){++n.residentJobs;SharedJob(n,resident,*jobs);}
  else{++n.coldJobs;++n.jobs;}
 }
}
// owner-packed version 1: guard의 고정 31열과 같은 순서이며 모든 수치를 보존한다.
inline void Emit(const char* stage,const char* owner,const Owned& n){std::cout<<"[lp17] {\"kind\":\"owner-packed\",\"version\":1,\"stage\":\""<<stage<<"\",\"owner\":\""<<owner<<"\",\"values\":["<<n.records<<","<<n.samples<<","<<n.fileSamples<<","<<n.mappings<<","<<n.stringBytes<<","<<n.stringCapacity<<","<<n.vectorCapacityBytes<<","<<n.jobs<<","<<n.segments<<","<<n.bindings<<","<<n.tombstones<<","<<n.accessUnits<<","<<n.uniqueEnvelopes<<","<<n.sharedEnvelopeReferences<<","<<n.logicalEnvelopeBytes<<","<<n.uniqueBindingObjects<<","<<n.sharedBindingReferences<<","<<n.logicalBindingSamples<<","<<n.uniqueJobObjects<<","<<n.sharedJobReferences<<","<<n.logicalLinkCount<<","<<n.logicalEnvelopeChargeBytes<<","<<n.weakLinkCount<<","<<n.residentFallbackLinkCount<<","<<n.coldEnvelopes<<","<<n.residentBindings<<","<<n.coldBindings<<","<<n.residentJobs<<","<<n.coldJobs<<","<<n.entryStorageBytes<<","<<n.locationStorageBytes<<"]}\n";}
// 정의는 복제 journal.cpp의 ManagedJournalState 정의 뒤에 삽입한다. Replay/복사/직렬화 없음.
Owned Journal(const recording::RecordingJournal&,EnvelopeOwners* seen=nullptr);
void Provenance(const recording::RecordingJournal&);
inline void Observe(const char* stage,unsigned sources,const recording::RecordingCatalog* c=nullptr){recording_memory_probe::Sample s;if(!recording_memory_probe::Read(&s)||!s.current||!s.peak)throw std::runtime_error("LP17_MEMORY");std::cout<<"[lp17] {\"kind\":\"memory\",\"stage\":\""<<stage<<"\",\"sources\":"<<sources<<",\"currentRssBytes\":"<<s.current<<",\"peakRssBytes\":"<<s.peak<<"}\n";if(c){EnvelopeOwners seen;BindingOwners bindings;JobOwners jobs;Emit(stage,"journal",Journal(c->journal_,&seen));Owned live,shadow,prefix;Catalog(live,*c,&seen,&bindings,&jobs);if(c->checkpoint_cache_){Mutations(prefix,c->checkpoint_cache_->prefix,&seen);if(c->checkpoint_cache_->shadow)Catalog(shadow,*c->checkpoint_cache_->shadow,&seen,&bindings,&jobs);}Emit(stage,"live",live);Emit(stage,"shadow",shadow);Emit(stage,"prefix",prefix);if(cache_off&&(prefix.records||prefix.logicalLinkCount||shadow.bindings||shadow.jobs))throw std::runtime_error("LP17_CACHE_OFF");}}
}
