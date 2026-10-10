// 파일 용도: 녹화 카탈로그 snapshot의 export와 직렬화 로직을 구현한다.
#include "recording/recording_catalog.h"
#include "recording/recording_catalog_snapshot.h"
#include <algorithm>
#include <map>
#include <set>
#include <tuple>
#include <stdexcept>
#include "recording_history_index.h"
#include "recording_catalog_history.h"

namespace recording {
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
thread_local std::uint64_t snapshot_export_calls=0,snapshot_spool_serializations=0;
#endif
namespace {
bool Fail(std::string* error, const char* message) {
    if (error) *error = message;
    return false;
}
std::string Quote(const std::string& value) {
    std::string result = "\"";
    for (const unsigned char c : value) {
        switch (c) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (c < 32) {
                    const char* hex = "0123456789abcdef";
                    result += "\\u00"; result += hex[c >> 4]; result += hex[c & 15];
                } else result += static_cast<char>(c);
        }
    }
    return result + '"';
}
// Two complete ordinal-ordered cursors commit to the exact fields previously compared
// per ID. Private to one locked export; never persisted or reused across a cut/owner.
class AppliedPrefixDigest {
public:
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    AppliedPrefixDigest():context_(EVP_MD_CTX_new(),EVP_MD_CTX_free) {
        if(!context_||EVP_DigestInit_ex(context_.get(),EVP_sha256(),nullptr)!=1)throw std::runtime_error("prefix digest init");
    }
    void Add(const RecordingIdentityFirstAcceptance& first) {
        const auto& r=first.first_row;
        for(const auto& value:{first.mutation_id,std::to_string(first.first_global_ordinal),RecordingMutationTypeName(r.type),
            r.entity_id,std::to_string(r.occurred_at_ms),r.identity,r.reservation?std::string("1"):std::string("0")})Field(value);
        if(r.reservation){const auto& o=*r.reservation;for(const auto& value:{o.schema,o.store_id,o.request_id,o.segment_id,o.channel_id,std::to_string(o.sequence)})Field(value);}
    }
    void Field(const std::string& value) {
            std::array<unsigned char,8> size{};auto n=static_cast<std::uint64_t>(value.size());
            for(unsigned i=0;i<8;++i){size[i]=n&255;n>>=8;}
            if(EVP_DigestUpdate(context_.get(),size.data(),size.size())!=1||
               EVP_DigestUpdate(context_.get(),value.data(),value.size())!=1)throw std::runtime_error("prefix digest update");
    }
    std::array<unsigned char,32> Finish(){std::array<unsigned char,32> result{};unsigned size=0;
        if(EVP_DigestFinal_ex(context_.get(),result.data(),&size)!=1||size!=result.size())throw std::runtime_error("prefix digest finish");
        return result;}
private:
    std::unique_ptr<EVP_MD_CTX,decltype(&EVP_MD_CTX_free)> context_;
#else
    void Add(const RecordingIdentityFirstAcceptance&){throw std::runtime_error("prefix digest unsupported");}
    std::array<unsigned char,32> Finish(){throw std::runtime_error("prefix digest unsupported");}
#endif
};
bool SameOrder(const RecordingOrderReservationV1& a, const RecordingOrderReservationV1& b) {
    return std::tie(a.schema,a.store_id,a.request_id,a.segment_id,a.channel_id,a.sequence) ==
           std::tie(b.schema,b.store_id,b.request_id,b.segment_id,b.channel_id,b.sequence);
}
bool JobType(RecordingMutationType type) {
    return type == RecordingMutationType::DerivedJobIntent || type == RecordingMutationType::DerivedJobFiles ||
        type == RecordingMutationType::DerivedJobReady || type == RecordingMutationType::DerivedJobCommitted ||
        type == RecordingMutationType::DerivedJobComplete || type == RecordingMutationType::DerivedJobFailed;
}
}

bool RecordingCatalog::ExportGenerationSnapshot(const RecordingIdentityChainResult& chain,
    std::uint64_t generation, std::uint64_t cut, RecordingCatalogSnapshot* output, std::string* error) const {
    std::lock_guard<std::mutex> lock(mu_);
    return ExportGenerationSnapshotLocked(chain,generation,cut,output,error);
}
bool RecordingCatalog::ExportGenerationSnapshotLocked(const RecordingIdentityChainResult& chain,
    std::uint64_t generation,std::uint64_t cut,RecordingCatalogSnapshot* output,std::string* error) const {
    try {
        if (!output || !opened_ || !derived_job_state_authoritative_ || !journal_.managed_ ||
            !CanWriteLocked(error)) return Fail(error,"snapshot export authority unavailable");
        return ExportGenerationValuesLocked(journal_.ManagedStoreId(),chain,generation,cut,output,error);
    } catch (...) { return Fail(error,"snapshot export authority failure"); }
}
bool RecordingCatalog::ExportGenerationValuesLocked(const std::string& store,
    const RecordingIdentityChainResult& chain,std::uint64_t generation,std::uint64_t cut,
    RecordingCatalogSnapshot* output,std::string* error,const RecordingCatalogSnapshotRowVisitor& visitor) const {
    try {
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
        ++snapshot_export_calls;
#endif
        if (!output || !ValidateOpaqueId(store,error)) return Fail(error,"snapshot value store/output invalid");
        RecordingCatalogSnapshot result;
        result.store_id = store; result.generation = generation;
        result.cut_ordinal = cut; result.identity_head = chain.head;
        if (chain.store_id != result.store_id || !chain.shards ||
            (!chain.order_history.bound_store.empty() && chain.order_history.bound_store != result.store_id))
            return Fail(error,"snapshot chain store mismatch");
        std::string validated;
        if(!chain.history&&!SerializeRecordingOrderHistorySnapshot(chain.order_history,&validated,error))return false;
        std::map<std::string,const RecordingIdentityFirstAcceptance*> dto_first;
        std::map<std::string,const RecordingOrderHistoryReservation*> dto_orders;
        if(!chain.history){
            for(const auto& entry:chain.first_acceptances)
                if(!dto_first.emplace(entry.mutation_id,&entry).second)return Fail(error,"snapshot first identity duplicate");
            for(const auto& item:chain.order_history.reservations)dto_orders.emplace(item.order.request_id,&item);
        }
        const auto first=[&](const std::string& id){
            std::optional<RecordingIdentityFirstAcceptance> value;
            if(!chain.history){const auto found=dto_first.find(id);if(found!=dto_first.end())value=*found->second;return value;}
            if(!FindRecordingIdentityFirst(chain,id,&value,error))throw std::runtime_error("snapshot first lookup failed");
            return value;
        };
        const auto order=[&](const std::string& id)->std::optional<RecordingOrderHistoryReservation>{
            const auto value=first(id);
            if(!value||value->first_row.type!=RecordingMutationType::RecordingOrderReserved||!value->first_row.reservation)return {};
            return RecordingOrderHistoryReservation{*value->first_row.reservation,value->first_row.occurred_at_ms};
        };
        if((chain.physical_rows==0)!=!chain.maximum_global_ordinal.has_value()||
           (chain.maximum_global_ordinal&&*chain.maximum_global_ordinal>=cut))return Fail(error,"snapshot identity physical ordinal/cut mismatch");
        std::uint64_t physical=0;std::size_t required_accepted=0,first_count=0;
        // Product cross-checks the sealed candidate against the current applied prefix in one
        // Journal cursor below. DTO/oracle callers retain their independent map checks.
        const bool applied_cursor=completed_history_&&chain.history;
        AppliedPrefixDigest candidate_digest,current_digest;
        if(!VisitRecordingIdentityFirst(chain,[&](const auto& entry,std::string*){
            if(entry.mutation_id!=entry.first_row.mutation_id||entry.first_global_ordinal!=entry.first_row.global_ordinal||
               entry.first_global_ordinal>=cut||!entry.occurrences||entry.occurrences>chain.physical_rows-physical)
                return Fail(error,"snapshot first identity mismatch");
            physical+=entry.occurrences;++first_count;if(applied_cursor)candidate_digest.Add(entry);
            if(RecordingSnapshotRequiresAcceptedState(entry.first_row.type))++required_accepted;
            if(entry.first_row.type==RecordingMutationType::RecordingOrderReserved){
                const auto found=applied_cursor&&entry.first_row.reservation?
                    std::optional<RecordingOrderHistoryReservation>({*entry.first_row.reservation,entry.first_row.occurred_at_ms}):order(entry.mutation_id);
                if(!found||entry.first_row.entity_id!=found->order.segment_id)return Fail(error,"snapshot reservation identity mismatch");
                if(!chain.history){const auto original=dto_orders.find(entry.mutation_id);
                    if(original==dto_orders.end()||!SameOrder(found->order,original->second->order)||
                       found->occurred_at_ms!=original->second->occurred_at_ms)return Fail(error,"snapshot reservation identity mismatch");}

            }else if((!applied_cursor&&!MutationSeenLocked(entry.mutation_id))||entry.first_row.reservation)
                return Fail(error,"snapshot ordinary identity missing");
            return true;
        },error))return false;
        if(physical!=chain.physical_rows)return Fail(error,"snapshot physical count mismatch");
        for(const auto& id:mutation_ids_)if(!first(id))return Fail(error,"snapshot catalog ID missing");
        // DTO callers retain exact order-history cross checks; product history was sealed by Journal.
        if(!chain.history)for(const auto& item:chain.order_history.reservations){
            const auto found=order(item.order.request_id);
            if(!found||!SameOrder(found->order,item.order)||found->occurred_at_ms!=item.occurred_at_ms)
                return Fail(error,"snapshot reservation first ID missing");
        }
        if(!applied_cursor&&!VisitOrdersLocked([&](const RecordingOrderReservationV1& value,std::string*) {
            const auto found=order(value.request_id);
            return (found&&SameOrder(value,found->order))||Fail(error,"snapshot catalog order mismatch");
        },error))return false;
        for (const auto& item : segments_v2_) {
            const auto& segment = item.second;
            const auto found = order(segment.order_request_id);
            if (!found || segment.store_id != result.store_id ||
                found->order.segment_id != item.first || found->order.channel_id != segment.channel_id ||
                found->order.sequence != segment.order_sequence)
                return Fail(error,"snapshot finalized order mismatch");
        }
        const auto add = [&](const char* kind,const std::string& key,std::string bytes) {
            RecordingCatalogSnapshotRow row{kind,key,std::move(bytes)};
            if(visitor){if(!visitor(row,error))throw std::runtime_error("snapshot row consumer failed");}
            else result.rows.push_back(std::move(row));
        };
        for (const auto& v : segments_) add("segment-v1",v.first,SerializeRecordingSegmentV1(v.second));
        for (const auto& v : segments_v2_) add("segment-v2",v.first,SerializeRecordingSegmentV2(v.second));
        for (const auto& v : states_v2_) add("state-v2",v.first,SerializeRecordingSegmentStateV2(v.second));
        for (const auto& v : tombstones_) add("tombstone-v1",v.first,SerializeRecordingTombstoneV1(v.second));
        for (const auto& v : tombstones_v2_) add("tombstone-v2",v.first,SerializeRecordingTombstoneV2(v.second));
        if(!VisitRetiredLocked([&](const std::string& id,const RecordingRetiredV2Receipt& value,std::string*) {
            const auto origin=first(value.deletion_mutation_id);const auto reserved=order(value.order_request_id);
            if(!origin||origin->first_row.type!=RecordingMutationType::SegmentV2Deleted||origin->first_row.entity_id!=id||
               (!completed_history_&&retired_v2_links_.find(id)==retired_v2_links_.end())||
               !reserved||value.store_id!=result.store_id||reserved->order.segment_id!=id||
               reserved->order.channel_id!=value.channel_id||reserved->order.sequence!=value.order_sequence||
               !SerializeRecordingRetiredV2Receipt(value,&validated,error))return Fail(error,"snapshot retired V2 provenance mismatch");
            add("retired-v2",id,validated);return true;
        },error))return false;
        for (const auto& v : media_relpaths_) add("media-path",v.first,Quote(v.second));
        for (const auto& v : deletion_reasons_) add("deletion-reason",v.first,Quote(v.second));
        for (const auto& v : event_links_) add("event-link",v.first,SerializeEventRecordingLinkV1(v.second));
        for (const auto& v : observations_) add("observation-v1",v.first,SerializeAnalysisObservationV1(v.second));
        for (const auto& v : observations_v2_) add("observation-v2",v.first,SerializeAnalysisObservationV2(v.second));
        for (const auto& v : consumer_references_) add("consumer-reference",v.first,SerializeRecordingConsumerReferenceV1(v.second));
        for (const auto& v : referenced_observations_) add("referenced-observation",v.first,SerializeReferencedObservationV1(v.second));
        for (const auto& id : derived_accepted_references_) add("derived-reference-accepted",id,"true");
        if(!VisitSourcesLocked([&](const std::string& id,const SourceBindingEntry& v,std::string*) {
            const auto found=first(v.latest_mutation_id);
            if(id!=v.id||!found||found->first_row.entity_id!=v.id||found->first_row.type!=RecordingMutationType::SegmentV2BoundFinalized)
                return Fail(error,"snapshot source provenance mismatch");
            RecordingCatalogSourceSummary summary{v.id,v.channel,v.source,v.generation,v.track,v.order,v.sample_count,v.latest_mutation_id};
            if(!SerializeRecordingCatalogSourceSummary(summary,&validated,error))return false;
            add("source-binding",id,validated);return true;
        },error))return false;
        if(!VisitJobsLocked([&](const std::string& id,const DerivedJobEntry& v,std::string*) {
            const auto found = first(v.latest_mutation_id);
            if (id != v.id || !found || found->first_row.entity_id != v.id ||
                !JobType(found->first_row.type)) return Fail(error,"snapshot job provenance mismatch");
            RecordingCatalogJobSummary summary{v.id,v.channel,v.reference,v.state,v.files,v.reserved_bytes,v.output_ids,v.source_ids,v.latest_mutation_id};
            if (!SerializeRecordingCatalogJobSummary(summary,&validated,error)) return false;
            add("derived-job",id,validated);return true;
        },error))return false;
        // Catalog's applied prefix, not all Journal-parsed active rows, supplies accepted state.
        const auto accepted=[&](const RecordingIdentityFirstAcceptance& entry,std::string*) {
            if(!RecordingSnapshotRequiresAcceptedState(entry.first_row.type)||!required_accepted||entry.first_global_ordinal>=cut)
                return Fail(error,"snapshot accepted type/count mismatch");
            --required_accepted;
            add("accepted-state",entry.mutation_id,"{\"mutationId\":"+Quote(entry.mutation_id)+",\"globalOrdinal\":"+
                std::to_string(entry.first_global_ordinal)+",\"type\":"+Quote(RecordingMutationTypeName(entry.first_row.type))+"}");
            return true;
        };
        if(applied_cursor){
            std::size_t visible_count=0;
            if(!journal_.VisitGenerationFirst([&](const auto& current,std::string* detail){
                if(!generation_visible_ordinal_||current.first_global_ordinal>*generation_visible_ordinal_)return true;
                current_digest.Add(current);++visible_count;
                return !RecordingSnapshotRequiresAcceptedState(current.first_row.type)||accepted(current,detail);
            },error))return false;
            // A missing candidate or an extra candidate cannot become a successful absent lookup.
            if(visible_count!=first_count||current_digest.Finish()!=candidate_digest.Finish())return Fail(error,"snapshot candidate/applied coverage mismatch");
        }else if(completed_history_){if(!VisitAcceptedLocked(accepted,error))return false;}
        else for(const auto& item:accepted_segment_state_mutations_){
            const auto found=first(item.first);
            if(!found||!mutation_ids_.count(item.first))return Fail(error,"snapshot accepted ID missing");
            if(!accepted(*found,error))return false;
        }
        if(required_accepted)return Fail(error,"snapshot accepted-state first identity missing");
        std::sort(result.rows.begin(),result.rows.end(),[](const auto& a,const auto& b) {
            return std::tie(a.kind,a.key) < std::tie(b.kind,b.key);
        });
        if (!visitor&&!ValidateRecordingCatalogSnapshotAcceptedStates(result,chain,error)) return false;
        *output = std::move(result);
        if (error) error->clear();
        return true;
    } catch (...) { if(error&&error->empty())*error="snapshot export allocation/serialization failure";return false; }
}
bool RecordingCatalog::CaptureGenerationSnapshotViewLocked(GenerationSnapshotView* output,std::string* error) const {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!output||!completed_history_||!opened_||!CanWriteLocked(error))return Fail(error,"snapshot fixed view authority unavailable");
    auto cold=std::make_shared<RecordingCatalogHistoryRows>();
    auto rows=std::make_shared<RecordingHistoryIndex>();
    output->finish=[cold,rows](std::string* detail){bool ok=rows->Close(detail);std::string cleanup;
        if(!cold->Finish(&cleanup)){if(detail)*detail+="; fixed history cleanup: "+cleanup;ok=false;}return ok;};
    if(!cold->CloneFrom(*completed_history_,error)||!rows->Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),
        RecordingHistoryIndex::BytesForRows(0),error)||!rows->BeginSequentialBuild(error))return false;
    std::uint64_t chunks=0,total=0,row_count=0;
    const auto add=[&](const char* kind,const std::string& key,std::string value){
        std::string bytes;
        if(!SerializeRecordingCatalogSnapshotRow({kind,key,std::move(value)},&bytes,error)||bytes.size()>kRecordingCatalogSnapshotMaxBytes-total)
            throw std::runtime_error("fixed snapshot row admission");
        const auto added=bytes.size()/RecordingHistoryIndex::kValueBytes+(bytes.size()%RecordingHistoryIndex::kValueBytes!=0);
        if(added>UINT64_MAX-chunks||!rows->ReserveRows(chunks+added,error))throw std::runtime_error("fixed snapshot scratch admission");
        for(std::size_t offset=0,part=0;offset<bytes.size();offset+=RecordingHistoryIndex::kValueBytes,++part){
            const auto ordinal=std::to_string(row_count),digits=std::to_string(part);
            // Capture order is private; canonical kind/key ordering is done once by the outside-lock spool.
            if(!rows->Put(std::string(20-ordinal.size(),'0')+ordinal+std::string(1,'\0')+std::string(20-digits.size(),'0')+digits,
                bytes.substr(offset,RecordingHistoryIndex::kValueBytes),false,error))throw std::runtime_error("fixed snapshot write");
        }
        chunks+=added;total+=bytes.size();++row_count;
    };
    try {
        for(const auto& v:segments_)add("segment-v1",v.first,SerializeRecordingSegmentV1(v.second));
        for(const auto& v:segments_v2_)add("segment-v2",v.first,SerializeRecordingSegmentV2(v.second));
        for(const auto& v:states_v2_)add("state-v2",v.first,SerializeRecordingSegmentStateV2(v.second));
        for(const auto& v:tombstones_)add("tombstone-v1",v.first,SerializeRecordingTombstoneV1(v.second));
        for(const auto& v:tombstones_v2_)add("tombstone-v2",v.first,SerializeRecordingTombstoneV2(v.second));
        for(const auto& v:media_relpaths_)add("media-path",v.first,Quote(v.second));
        for(const auto& v:deletion_reasons_)add("deletion-reason",v.first,Quote(v.second));
        for(const auto& v:event_links_)add("event-link",v.first,SerializeEventRecordingLinkV1(v.second));
        for(const auto& v:observations_)add("observation-v1",v.first,SerializeAnalysisObservationV1(v.second));
        for(const auto& v:observations_v2_)add("observation-v2",v.first,SerializeAnalysisObservationV2(v.second));
        for(const auto& v:consumer_references_)add("consumer-reference",v.first,SerializeRecordingConsumerReferenceV1(v.second));
        for(const auto& v:referenced_observations_)add("referenced-observation",v.first,SerializeReferencedObservationV1(v.second));
        for(const auto& id:derived_accepted_references_)add("derived-reference-accepted",id,"true");
        for(const auto& item:derived_jobs_){const auto& v=item.second;std::string bytes;
            if(!SerializeRecordingCatalogJobSummary({v.id,v.channel,v.reference,v.state,v.files,v.reserved_bytes,v.output_ids,v.source_ids,v.latest_mutation_id},&bytes,error))return false;
            add("derived-job",item.first,std::move(bytes));}
        if(!rows->SealSequentialBuild(error))return false;
        AppliedPrefixDigest digest;const auto visible=generation_visible_ordinal_;
        if(!journal_.VisitGenerationFirst([&](const auto& first,std::string*){
            if(!visible||first.first_global_ordinal>*visible)return true;
            digest.Add(first);++output->applied_count;return true;
        },error))return false;
        output->applied_digest=digest.Finish();
        output->visit=[rows,cold,total,chunks,row_count](const RecordingCatalogSnapshotRowVisitor& visit,std::string* detail){
            std::string current,raw;std::uint64_t seen=0,bytes=0,emitted=0,part=0;
            const auto emit=[&](){if(raw.empty())return true;RecordingCatalogSnapshotRow row;
                if(!ParseRecordingCatalogSnapshotRow(raw,&row,detail))return false;
                raw.clear();++emitted;return visit(row,detail);};
            if(!rows->Visit([&](const std::string& key,const std::string& value,std::string*){
                const auto end=key.rfind('\0');if(end==std::string::npos)return false;
                const auto prefix=key.substr(0,end);
                if(current!=prefix){if(!emit())return false;current=prefix;part=0;}
                const auto ordinal=std::to_string(emitted),chunk=std::to_string(part++);
                if(prefix!=std::string(20-ordinal.size(),'0')+ordinal||
                   key.substr(end+1)!=std::string(20-chunk.size(),'0')+chunk)return Fail(detail,"fixed snapshot sequence coverage mismatch");
                if(value.size()>kRecordingCatalogSnapshotMaxBytes-raw.size()||value.size()>total-bytes)return false;
                raw+=value;bytes+=value.size();++seen;return true;
            },detail)||!emit()||seen!=chunks||bytes!=total||emitted!=row_count)return Fail(detail,"fixed snapshot row coverage mismatch");
            for(const std::string kind:{"retired-v2","source-binding","derived-job"})
                if(!cold->Visit(kind,[&](const auto& id,const auto& value,std::string* e){return visit({kind,id,value},e);},detail))return false;
            return true;
        };
        output->bytes=rows->usage().file_bytes+cold->Bytes();output->allocated=rows->usage().allocated_bytes+cold->Bytes(true);
        return true;
    }catch(...){return Fail(error,"fixed snapshot capture exception");}
#else
    (void)output;return Fail(error,"fixed snapshot unsupported");
#endif
}

bool RecordingCatalog::ExportFrozenGenerationValues(const RecordingIdentityChainResult& chain,std::uint64_t generation,
    std::uint64_t cut,const GenerationSnapshotView& view,RecordingCatalogSnapshot* output,
    const RecordingCatalogSnapshotRowVisitor& add,std::string* error) const {
    if(!output||!view.visit||!add||!chain.history||!chain.shards||
       (chain.physical_rows==0)!=!chain.maximum_global_ordinal.has_value()||
       (chain.maximum_global_ordinal&&*chain.maximum_global_ordinal>=cut))return Fail(error,"fixed snapshot candidate unavailable");
    std::uint64_t physical=0,count=0;AppliedPrefixDigest digest;
    if(!VisitRecordingIdentityFirst(chain,[&](const auto& first,std::string* detail){
        const auto& row=first.first_row;
        if(first.mutation_id!=row.mutation_id||first.first_global_ordinal!=row.global_ordinal||row.global_ordinal>=cut||
           !first.occurrences||first.occurrences>chain.physical_rows-physical)return Fail(detail,"fixed snapshot identity/physical mismatch");
        if(row.type==RecordingMutationType::RecordingOrderReserved){
            if(!row.reservation||row.entity_id!=row.reservation->segment_id)return Fail(detail,"fixed reservation identity mismatch");
        }else if(row.reservation)return Fail(detail,"fixed ordinary reservation mismatch");
        physical+=first.occurrences;++count;digest.Add(first);
        if(RecordingSnapshotRequiresAcceptedState(row.type))return add({"accepted-state",first.mutation_id,
            "{\"mutationId\":"+Quote(first.mutation_id)+",\"globalOrdinal\":"+std::to_string(first.first_global_ordinal)+
            ",\"type\":"+Quote(RecordingMutationTypeName(row.type))+"}"},detail);
        return true;
    },error)||physical!=chain.physical_rows||count!=view.applied_count||digest.Finish()!=view.applied_digest)
        return Fail(error,"fixed snapshot applied prefix coverage mismatch");
    const auto first=[&](const std::string& id){std::optional<RecordingIdentityFirstAcceptance> value;
        if(!FindRecordingIdentityFirst(chain,id,&value,error))throw std::runtime_error("fixed first lookup");
        return value;};
    try {
        if(!view.visit([&](const RecordingCatalogSnapshotRow& row,std::string* detail){
            if(row.kind=="segment-v2"){
                RecordingSegmentV2 s;if(!ParseRecordingSegmentV2(row.value_json,&s,detail))return false;
                const auto r=first(s.order_request_id);
                if(!r||!r->first_row.reservation||s.segment_id!=row.key||s.store_id!=chain.store_id||
                   r->first_row.reservation->segment_id!=s.segment_id||r->first_row.reservation->channel_id!=s.channel_id||
                   r->first_row.reservation->sequence!=s.order_sequence)return Fail(detail,"fixed segment order mismatch");
            }else if(row.kind=="retired-v2"){
                RecordingRetiredV2Receipt r;if(!ParseRecordingRetiredV2Receipt(row.value_json,&r,detail))return false;
                const auto origin=first(r.deletion_mutation_id),order=first(r.order_request_id);
                if(r.segment_id!=row.key||r.store_id!=chain.store_id||!origin||origin->first_row.type!=RecordingMutationType::SegmentV2Deleted||
                   origin->first_row.entity_id!=row.key||!order||!order->first_row.reservation||
                   order->first_row.reservation->segment_id!=row.key||order->first_row.reservation->channel_id!=r.channel_id||
                   order->first_row.reservation->sequence!=r.order_sequence)return Fail(detail,"fixed retired provenance mismatch");
            }else if(row.kind=="source-binding"){
                RecordingCatalogSourceSummary r;if(!ParseRecordingCatalogSourceSummary(row.value_json,&r,detail))return false;
                const auto origin=first(r.latest_mutation_id);
                if(r.id!=row.key||!origin||origin->first_row.entity_id!=r.id||origin->first_row.type!=RecordingMutationType::SegmentV2BoundFinalized)
                    return Fail(detail,"fixed source provenance mismatch");
            }else if(row.kind=="derived-job"){
                RecordingCatalogJobSummary r;if(!ParseRecordingCatalogJobSummary(row.value_json,&r,detail))return false;
                const auto origin=first(r.latest_mutation_id);
                if(r.id!=row.key||!origin||origin->first_row.entity_id!=r.id||!JobType(origin->first_row.type))return Fail(detail,"fixed job provenance mismatch");
            }
            return add(row,detail);
        },error))return false;
        output->store_id=chain.store_id;output->generation=generation;output->cut_ordinal=cut;output->identity_head=chain.head;return true;
    }catch(...){return Fail(error,"fixed snapshot validation exception");}
}

// One validated export under the caller's Catalog lock. Scratch keys provide canonical kind/key/chunk order.
// Only one canonical row and one fixed index value are live; no rows vector or whole snapshot string.
bool RecordingCatalog::PrepareGenerationSnapshotStreamLocked(const RecordingIdentityChainResult& chain,
    std::uint64_t generation,std::uint64_t cut,GenerationSnapshotStream* output,std::string* error,const GenerationSnapshotView* frozen) const {
#if MEDIA_SERVER_USE_OPENSSL && !defined(_WIN32)
    if(!output||(!frozen&&(!opened_||!derived_job_state_authoritative_||!journal_.managed_)))return Fail(error,"snapshot stream authority unavailable");
    auto sorted=std::make_shared<RecordingHistoryIndex>();
    output->finish=[sorted](std::string* detail){return sorted->Close(detail);};
    bool ok=false;
    try {ok=[&](){
        RecordingCatalogSnapshot header;std::uint64_t chunks=0,total=0;
        // Reserve derived storage for the actual admitted row chunks, not snapshot_bytes.
        // ReserveRows checks overflow/free space; it neither preallocates nor changes source admission.
        if(!sorted->Create(std::filesystem::canonical(std::filesystem::temp_directory_path()).string(),
            RecordingHistoryIndex::BytesForRows(0),error)||!sorted->BeginBufferedBuild(error))return false;
        const auto spool=[&](const RecordingCatalogSnapshotRow& row,std::string* detail){
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
            ++snapshot_spool_serializations;
#endif
            std::string bytes;if(!SerializeRecordingCatalogSnapshotRow(row,&bytes,detail))return false;
            if(bytes.size()>kRecordingCatalogSnapshotMaxBytes-total)return Fail(detail,"snapshot stream admission exceeded");
            const auto added=bytes.size()/RecordingHistoryIndex::kValueBytes+(bytes.size()%RecordingHistoryIndex::kValueBytes!=0);
            if(added>UINT64_MAX-chunks||!sorted->ReserveRows(chunks+added,detail))return false;
            for(std::size_t offset=0,part=0;offset<bytes.size();offset+=RecordingHistoryIndex::kValueBytes,++part){
                const auto digits=std::to_string(part);
                const auto key=row.kind+std::string(1,'\0')+row.key+std::string(1,'\0')+std::string(20-digits.size(),'0')+digits;
                if(!sorted->Put(key,bytes.substr(offset,RecordingHistoryIndex::kValueBytes),false,detail))return false;
            }
            total+=bytes.size();chunks+=added;return true;
        };
        if(!(frozen?ExportFrozenGenerationValues(chain,generation,cut,*frozen,&header,spool,error):
            ExportGenerationValuesLocked(chain.store_id,chain,generation,cut,&header,error,spool))||sorted->usage().rows!=chunks||
           !sorted->SealBufferedBuild(error))
            return Fail(error,"snapshot stream coverage mismatch");
        std::string prefix;if(!SerializeRecordingCatalogSnapshotHeader(header,&prefix,error)||prefix.size()>kRecordingCatalogSnapshotMaxBytes-total)return false;
        output->produce=[sorted,prefix,total](const RecordingGenerationByteSink& sink,std::string* detail){
            if(!sink||!sink(prefix,detail))return false;
            std::uint64_t emitted=0;
            if(!sorted->Visit([&](const std::string&,const std::string& value,std::string* row_error){
                if(value.size()>total-emitted)return Fail(row_error,"snapshot stream output overflow");
                emitted+=value.size();return sink(value,row_error);
            },detail))return false;
            return emitted==total||Fail(detail,"snapshot stream final size mismatch");
        };
        return true;
    }();}catch(...){Fail(error,"snapshot stream resource failure");}
    const auto usage=sorted->usage();
    {std::lock_guard lock(journal_.mu_);journal_.AccountGenerationScratchLocked(chain.history,usage.file_bytes+chain.checkpoint_archive_bytes+(frozen?frozen->bytes:0),usage.allocated_bytes+chain.checkpoint_archive_allocated+(frozen?frozen->allocated:0));}
    return ok;
#else
    (void)chain;(void)generation;(void)cut;(void)output;(void)frozen;return Fail(error,"snapshot stream unsupported");
#endif
}
} // namespace recording
