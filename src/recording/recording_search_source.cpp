// 파일 용도: 카탈로그의 검증된 resident/cold 행에서 일관된 검색 snapshot/관측 변화분을 내보낸다.
#include "recording/recording_catalog.h"
#include "recording/recording_search_diagnostic.h"
#include "recording/recording_latency_trace.h"
#include <algorithm>
#include "domain/strict_json.h"
#include <limits>
#include <new>
#include <stdexcept>
#if MEDIA_SERVER_USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace recording {
namespace {
// Narrow verification record, emitted only after the Catalog lock is released.
// Counts are per capture, not the whole HTTP request or a CPU-time estimate.
struct OptionalCaptureCapacity {};
struct CaptureCost {
    bool attribution=(latency::SearchAttributionEnabled()||SearchDiagnostic::Enabled())&&SearchDiagnostic::active;
    bool enabled=latency::SubcostEnabled()||attribution,complete=false;
    SearchDiagnostic* diagnostic=attribution?SearchDiagnostic::active:nullptr;
    unsigned slot=0,parent=0;
    latency::CaptureLockCost catalog_lock;
    std::array<std::uint64_t,latency::CaptureFields> history_cost=latency::capture_cost,history_calls=latency::capture_calls;
    std::uint64_t shared=0,materialized=0,captured=0,current=0;
    std::array<std::uint64_t,12> raw=latency::catalog_row_cost;
    explicit CaptureCost(std::mutex& mutex):catalog_lock(&mutex,enabled) {
        if(enabled)++latency::capture_depth;
        if(!diagnostic)return;
        parent=diagnostic->capture_parent;
        if(diagnostic->capture_count==diagnostic->captures.size()){diagnostic->capture_loss=true;return;}
        slot=++diagnostic->capture_count;diagnostic->capture_parent=slot;
        auto& c=diagnostic->captures[slot-1];c.begin=SearchDiagnostic::Tick();c.attempt=diagnostic->attempt;c.parent=parent;
        c.rejected_before=diagnostic->resources?diagnostic->resources->rejected():0;
    }
    std::uint64_t rows=0,excluded=0,memo=0,reused=0,begin=enabled?latency::Now():0;
    std::uint64_t vector_hint=0,growths=0,relocated=0;
    std::uint64_t cut_rows=0,raw_bytes=0,cut_charge=0,read_ns=0,outside_ns=0;
    bool read_observed=false,outside_observed=false;
    struct Interval {std::uint64_t& value;bool& observed;std::uint64_t start;
        Interval(std::uint64_t& v,bool& o,bool enabled):value(v),observed(o),start(enabled?latency::Now():0){if(start)observed=true;}
        ~Interval(){if(start)value+=latency::Now()-start;}
    };
    std::array<std::uint64_t,4> decode=latency::segment_decode_cost;
    ~CaptureCost() {
        if(enabled)--latency::capture_depth;
        if(diagnostic&&slot){
            auto& c=diagnostic->captures[slot-1];c.end=SearchDiagnostic::Tick();c.rows=rows;c.cut_rows=cut_rows;
            c.raw_bytes=raw_bytes;c.read_ns=read_ns;c.outside_ns=outside_ns;c.catalog_lock=catalog_lock.ns;
            c.observed=(catalog_lock.acquisitions?1:0)|(catalog_lock.acquisitions>1?2:0)|(read_observed?4:0)|(outside_observed?8:0);
            for(unsigned i=0;i<history_cost.size();++i){c.history_cost[i]=latency::capture_cost[i]-history_cost[i];if(latency::capture_calls[i]!=history_calls[i])c.observed|=1U<<(8+i);}
            c.decode_calls=latency::segment_decode_cost[0]-decode[0];c.decode_hits=latency::segment_decode_cost[1]-decode[1];
            c.parse_ns=latency::segment_decode_cost[2]-decode[2];
            for(unsigned i=1;i<raw.size();i+=2)c.raw_read_ns+=latency::catalog_row_cost[i]-raw[i];
            c.shared=shared;c.materialized=materialized;c.captured=captured;c.current=current;c.complete=complete;
            c.rejected_after=diagnostic->resources?diagnostic->resources->rejected():0;diagnostic->capture_parent=parent;
        }
        if(!latency::SubcostEnabled())return;
        static std::atomic<unsigned> records{0};if(records.fetch_add(1)>=12)return;
        char line[1024];const int n=std::snprintf(line,sizeof(line),
            "[search-capture-cost] {\"rows\":%llu,\"excluded\":%llu,\"memoExcluded\":%llu,\"reusedSegments\":%llu,\"decodeCalls\":%llu,\"decodeHits\":%llu,\"parseNs\":%llu,\"elapsedNs\":%llu,\"cutRows\":%llu,\"rawBytes\":%llu,\"cutCharge\":%llu,\"cutReadNs\":%llu,\"outsideNs\":%llu,\"vectorHint\":%llu,\"vectorGrowths\":%llu,\"relocatedDocuments\":%llu,\"complete\":%s}\n",
            (unsigned long long)rows,(unsigned long long)excluded,(unsigned long long)memo,(unsigned long long)reused,
            (unsigned long long)(latency::segment_decode_cost[0]-decode[0]),
            (unsigned long long)(latency::segment_decode_cost[1]-decode[1]),
            (unsigned long long)(latency::segment_decode_cost[2]-decode[2]),
            (unsigned long long)(latency::Now()-begin),
            (unsigned long long)cut_rows,(unsigned long long)raw_bytes,(unsigned long long)cut_charge,
            (unsigned long long)read_ns,(unsigned long long)outside_ns,(unsigned long long)vector_hint,(unsigned long long)growths,(unsigned long long)relocated,complete?"true":"false");
        if(n>0&&n<int(sizeof(line)))SearchDiagnostic::Write(line,static_cast<std::size_t>(n));
    }
};
bool Fail(std::string* error, const char* value) { if (error) *error = value; return false; }
std::string Key(const std::string& value) { return std::to_string(value.size()) + ":" + value; }
std::optional<std::int64_t> Ns(std::int64_t ms) {
    if (ms < 0 || ms > std::numeric_limits<std::int64_t>::max() / 1000000) return {};
    return ms * 1000000;
}
void Point(SearchDocument& d, std::optional<std::int64_t> value) {
    if (value && *value >= 0 && *value < std::numeric_limits<std::int64_t>::max()) {
        d.start_ns = value; d.end_ns = *value + 1;
    }
}
SearchDocument Observation(const AnalysisObservationV2& o, const std::string& prefix) {
    SearchDocument d; d.kind = SearchDocumentKind::Observation;
    d.id = prefix + Key(o.observation_id); d.observation_id = o.observation_id; d.channel_id = o.channel_id;
    d.analysis_namespace = o.analysis_namespace; d.stream_epoch_id = o.stream_epoch_id;
    d.track_id = o.track_id; d.object = o.class_label;d.source_id=o.source_id;
    d.zone_ids = o.zone_ids; d.rule_ids = o.rule_ids; d.event_ids = o.event_ids;
    d.media_pts = o.pts; d.unavailable_reason = o.locator_reason;
    return d;
}
const char* State(RecordingLifecycle state) {
    switch (state) {
    case RecordingLifecycle::Finalized: return "media-not-checked";
    case RecordingLifecycle::Deleted: return "deleted";
    case RecordingLifecycle::DeletionPending: return "deletion-pending";
    case RecordingLifecycle::Corrupt: return "corrupt";
    default: return "pending";
    }
}
}

std::string SearchSourceIdentity(std::uint64_t instance, std::vector<std::string> channels) {
    std::sort(channels.begin(), channels.end());
    channels.erase(std::unique(channels.begin(), channels.end()), channels.end());
    std::string result = "catalog-" + std::to_string(instance) + ":";
    for (const auto& channel : channels) result += Key(channel);
    return result;
}

bool RecordingCatalog::SearchChangedLocked(const std::vector<std::string>& channels,
    std::uint64_t since,bool structural_only) const {
    if(!search_invalidations_ || since<search_invalidations_->floor || since>source_snapshot_revision_)return true;
    for(const auto& entry:search_invalidations_->entries) {
        if(entry.revision<=since || (structural_only&&!entry.structural))continue;
        if(!entry.channel[0] || std::find(channels.begin(),channels.end(),entry.channel)!=channels.end())return true;
    }
    return false;
}

bool RecordingCatalog::ValidateSearchSource(const SearchSourceBatch& batch, std::string* error) const {
    SearchDiagnostic::Phase currentness("SourceCurrentness");
    latency::Lock lock(mu_,latency::Source::Catalog,__LINE__,false,__func__);
    SearchDiagnostic::Stage("validate-source");
    const bool readable=opened_&&CanReadLocked(error);
    SearchDiagnostic::Source(batch.catalog_instance,batch.resolution_revision,source_snapshot_revision_,search_instance_,readable,batch.rebuild,batch.delta.upserts.size()+batch.shared_documents_.size(),batch.pending.size());
    if (!readable || !source_snapshot_revision_valid_ ||
        batch.catalog_instance != search_instance_ || batch.channels.empty() ||
        SearchChangedLocked(batch.channels,batch.resolution_revision,false))
        return Fail(error, "search-source-changed");
    if (error) error->clear();
    return true;
}

bool RecordingCatalog::RebaseRetentionSearchSource(SearchSourceBatch* batch,SearchModelLimits limits,std::string* error) const {
#ifdef RECORDING_SEARCH_TESTING
    ++search_retention_delta_work_test[0];
    bool applied=false;
    struct Count {bool& applied;~Count(){++search_retention_delta_work_test[applied?1:2];}} count{applied};
#endif
    const auto refused=[&]{return Fail(error,"search-source-changed");};
    // Only the reader's complete, private, recordings-only capture can advance.
    // Published models, observation resolution and shared document blocks remain
    // immutable and take the existing recapture path.
    if(!batch||!batch->rebuild||!batch->pending.empty()||!batch->shared_documents_.empty()||
       batch->sharing_memory_.bytes()||batch->retry_model_||!batch->delta.removed_ids.empty()||
       batch->delta.source_instance.rfind("recordings:",0)!=0||!limits.residency||
       batch->residency_!=limits.residency.get()||batch->memory.bytes()<limits.max_bytes||
       batch->delta.revision!=batch->resolution_revision)return refused();
    try {
        latency::Lock lock(mu_,latency::Source::Catalog,__LINE__,false,__func__);
        if(!opened_||!generation_backend_||!CanReadLocked(error)||!source_snapshot_revision_valid_||
           recovery_report_.projection_error_count||recovery_report_.corrupt_line_count||
           batch->catalog_instance!=search_instance_||!search_invalidations_||
           batch->resolution_revision<search_invalidations_->floor||batch->resolution_revision>source_snapshot_revision_)return refused();
        // Reuse the fixed invalidation ring; no persistent delta owner/log.
        // At most 32 distinct short identities, otherwise strictly recapture.
        std::array<SearchInvalidations::Entry,32> changes{};std::size_t count_changes=0;
        const auto id=[](const auto& entry){return entry.channel+std::strlen(entry.channel)+1;};
        for(const auto& entry:search_invalidations_->entries) {
            if(entry.revision<=batch->resolution_revision)continue;
            if(!entry.channel[0])return refused();
            if(std::find(batch->channels.begin(),batch->channels.end(),entry.channel)==batch->channels.end())continue;
            if(!entry.retention)return refused();
            std::size_t at=0;for(;at<count_changes;++at)if(!std::strcmp(id(changes[at]),id(entry)))break;
            if(at==count_changes){if(at==changes.size())return refused();++count_changes;}
            if(entry.revision>changes[at].revision)changes[at]=entry;
        }
        if(!count_changes)return refused();
        for(std::size_t i=0;i<count_changes;++i) {
            const auto& change=changes[i];const std::string key=id(change);
            const auto retired=RetiredLocked(key);
            const auto tomb=tombstones_v2_.find(key);
            if(change.retention==2) {
                // Same authenticated receipt/domain used by full source capture.
                if(retired){if(retired->channel_id!=change.channel)return refused();}
                else if(tomb==tombstones_v2_.end()||tomb->second.segment.channel_id!=change.channel)return refused();
            } else {
                const auto segment=segments_v2_.find(key);const auto state=states_v2_.find(key);
                if(retired||tomb!=tombstones_v2_.end()||tombstones_.count(key)||segment==segments_v2_.end()||
                   segment->second.channel_id!=change.channel||state==states_v2_.end()||
                   state->second.lifecycle!=RecordingLifecycle::DeletionPending)return refused();
            }
        }
        const auto revision=source_snapshot_revision_;
        // Optional retry spans are not needed for the new cut; release their
        // actual storage before budgeting the private edit/compaction workspace.
        batch->segment_spans_.clear();
        {
            // Document scanning/compaction never extends Catalog/History lock
            // hold time. Owned change identities survive ring wrap while unlocked.
            latency::Lock::Unlocked outside(lock);
            auto& docs=batch->delta.upserts;
            const auto change_for=[&](const SearchDocument& d)->std::size_t {
                for(std::size_t i=0;i<count_changes;++i)if(d.segment_id==id(changes[i]))return i;
                return count_changes;
            };
            std::array<bool,32> seen{};std::size_t removed=0,bytes=sizeof(SearchSourceBatch)+sizeof(changes)+1024;
            for(const auto& d:docs) {
                if(!AccountOwnedSearchDocument(d,&bytes,limits.max_bytes))return refused();
                const auto i=change_for(d);if(i==count_changes)continue;
                if(d.kind!=SearchDocumentKind::Recording||d.channel_id!=changes[i].channel)return refused();
                seen[i]=true;
                if(changes[i].retention==2)++removed;
                else if((d.unavailable_reason!="media-not-checked"&&d.unavailable_reason!="deletion-pending")||
                        d.unavailable_reason.capacity()<std::strlen("deletion-pending"))return refused();
            }
            for(std::size_t i=0;i<count_changes;++i)if(!seen[i])return refused();
            // Both vector buffers fit the already admitted capture envelope.
            // Exact compaction releases removed payload and slack before Build.
            const auto extra=docs.capacity()-docs.size()+(removed?docs.size()-removed:0);
            if(bytes>limits.max_bytes||extra>(limits.max_bytes-bytes)/sizeof(SearchDocument))return refused();
            std::vector<SearchDocument> compact;
            if(removed){compact.reserve(docs.size()-removed);if(compact.capacity()!=docs.size()-removed)return refused();}
            for(auto& d:docs) {
                const auto i=change_for(d);
                if(i<count_changes&&changes[i].retention==2)continue;
                if(i<count_changes)d.unavailable_reason="deletion-pending";
                if(removed)compact.push_back(std::move(d));
#ifdef RECORDING_SEARCH_TESTING
                if(search_retention_delta_apply_test)search_retention_delta_apply_test();
#endif
            }
            if(removed)docs.swap(compact);
            batch->segment_spans_.clear();batch->retry_model_.reset();batch->append_order_hint=false;
            batch->resolution_revision=revision;batch->delta.revision=revision;
        }
        if(!opened_||!CanReadLocked(error)||batch->catalog_instance!=search_instance_||!source_snapshot_revision_valid_||
           recovery_report_.projection_error_count||recovery_report_.corrupt_line_count||
           SearchChangedLocked(batch->channels,revision,false))return refused();
#ifdef RECORDING_SEARCH_TESTING
        applied=true;
#endif
        if(error)error->clear();return true;
    } catch(const RecordingRetainedReadError&) {*batch=SearchSourceBatch{};return Fail(error,"search-source-unavailable");}
      catch(const RecordingResourceUnavailable&) {*batch=SearchSourceBatch{};return Fail(error,"search-capacity-exceeded");}
      catch(const std::bad_alloc&) {*batch=SearchSourceBatch{};return Fail(error,"search-capacity-exceeded");}
      catch(const std::length_error&) {*batch=SearchSourceBatch{};return Fail(error,"search-capacity-exceeded");}
}

bool RecordingCatalog::CaptureSearchSource(const std::vector<std::string>& channels,
    const RecordingSearchModel* previous, SearchSourceBatch* result, std::string* error, SearchModelLimits limits, bool include_observations, SearchSourceBatch* retry_capture) const {
    return CaptureSearchSourceImpl(channels,previous,result,error,limits,include_observations,retry_capture,true,false);
}
bool RecordingCatalog::CaptureSearchSourceImpl(const std::vector<std::string>& channels,
    const RecordingSearchModel* previous, SearchSourceBatch* result, std::string* error, SearchModelLimits limits, bool include_observations, SearchSourceBatch* retry_capture,bool allow_raw_cut,bool allow_document_sharing) const {
    if (!result || result==retry_capture || channels.empty() || channels.size() > 32) return Fail(error, "search-invalid-channels");
    // Consume the prior attempt once, including exceptions/partial moves. It
    // cannot be offered again after an interrupted current namespace traversal.
    SearchSourceBatch prior_capture;
    if(retry_capture)prior_capture=std::move(*retry_capture);
    for (const auto& channel : channels)
        if (!ValidateRecordingReferenceId(channel, nullptr)) return Fail(error, "search-invalid-channels");
    SearchDiagnostic::Stage("capture-source");
    SearchCapacityBegin("capture-source",limits.max_documents,limits.max_bytes,0,0);
    CaptureCost costs(mu_);
    bool optional_cut_owned=false,optional_sharing_owned=false;
    try {
        latency::Lock lock(mu_,latency::Source::Catalog,__LINE__,false,__func__);
        if (!opened_ || !CanReadLocked(error) || !source_snapshot_revision_valid_ || !search_instance_ ||
            recovery_report_.projection_error_count || recovery_report_.corrupt_line_count)
            return Fail(error, "search-source-unavailable");
        if(!search_invalidations_) {
            auto reservation=SearchResidency()->ReserveOwned(sizeof(SearchInvalidations));
            if(!reservation)return Fail(error,"search-capacity-exceeded");
            auto log=std::make_unique<SearchInvalidations>();log->memory=std::move(*reservation);
            log->floor=source_snapshot_revision_;search_invalidations_=std::move(log);
        }
        SearchSourceBatch batch;batch.channels=channels;
        if(!limits.residency)limits.residency=SearchResidency();
        auto charge=limits.residency->ReserveOwned(limits.max_bytes,SearchModelResidency::Category::SourceBatch);
        if(!charge){SearchCapacityReject("shared-reservation",0,limits.max_bytes);return Fail(error,"search-capacity-exceeded");}
        batch.memory=std::move(*charge);
        // Valid SearchDocument의17개4096-byte text, 세64-entry 목록,64개3-text facts.
        // source adapter의 단일 DTO/복사 임시값은 vector envelope와 별도 예약한다.
        constexpr std::size_t temporary_bound=2*(sizeof(SearchDocument)+17*8192+
            3*64*(sizeof(std::string)+8192)+64*(sizeof(SearchEventFact)+3*8192));
        auto temporary=limits.residency->Reserve(temporary_bound,SearchModelResidency::Category::Preparation);
        if(!temporary){SearchCapacityReject("shared-temporary",0,temporary_bound);return Fail(error,"search-capacity-exceeded");}
        batch.catalog_instance = search_instance_;batch.resolution_revision = source_snapshot_revision_;
        costs.captured=batch.resolution_revision;costs.current=source_snapshot_revision_;
        batch.delta.source_instance = SearchSourceIdentity(search_instance_, channels);
        if(!include_observations)batch.delta.source_instance="recordings:"+batch.delta.source_instance;
        batch.delta.revision = source_snapshot_revision_;
        batch.delta.previous_revision = previous ? previous->revision() : 0;
        batch.rebuild = !previous || previous->source_instance() != batch.delta.source_instance ||
            previous->revision() < search_rebuild_revision_ ||
            SearchChangedLocked(channels,previous->revision(),true);
        if(batch.rebuild&&!include_observations&&previous&&
           previous->source_instance()==batch.delta.source_instance&&
           previous->revision()>=search_rebuild_revision_&&
           previous->revision()>=search_invalidations_->floor&&previous->revision()<batch.resolution_revision) {
            bool additions=false,covered=true;
            for(const auto& entry:search_invalidations_->entries) {
                if(entry.revision<=previous->revision()||!entry.structural)continue;
                if(entry.channel[0]&&std::find(channels.begin(),channels.end(),entry.channel)==channels.end())continue;
                if(!entry.channel[0]||!entry.new_bound_segment){covered=false;break;}
                additions=true;
            }
            batch.append_order_hint=covered&&additions;
        }
        const auto selected = [&](const std::string& channel) {
            return std::find(channels.begin(), channels.end(), channel) != channels.end();
        };
        batch.residency_=limits.residency.get();batch.max_documents_=limits.max_documents;batch.max_bytes_=limits.max_bytes;
        const bool remember=retry_capture&&!include_observations&&batch.rebuild;
        const bool reuse=remember&&prior_capture.rebuild&&prior_capture.pending.empty()&&
            prior_capture.catalog_instance==batch.catalog_instance&&
            prior_capture.delta.source_instance==batch.delta.source_instance&&
            prior_capture.resolution_revision<=batch.resolution_revision&&
            prior_capture.residency_==batch.residency_&&prior_capture.max_documents_==limits.max_documents&&
            prior_capture.max_bytes_==limits.max_bytes;
        std::array<unsigned char,32> raw_digest{};std::size_t raw_size=0;
        bool raw_valid=false;
        std::size_t bytes = sizeof(batch),span_bytes=0;
        bool remember_spans=remember,optional_vector=false;
        const RecordingSearchModel* shared_source=nullptr;
        // Sharing is optional, scoped to append-only invalidations. Capacity for
        // refs (including growth) is admitted before any document is omitted.
        if(allow_document_sharing&&!include_observations&&batch.append_order_hint&&previous&&
           previous->residency()==limits.residency&&
           !previous->shared_documents_.empty()&&limits.max_documents<=SIZE_MAX/(2*sizeof(std::shared_ptr<const SearchDocument>))) {
            const auto size=limits.max_documents*sizeof(std::shared_ptr<const SearchDocument>);
            if(limits.residency->used()<=limits.residency->limit()&&size<=limits.residency->limit()-limits.residency->used()) {
                auto reservation=limits.residency->ReserveOwned(size,SearchModelResidency::Category::Preparation);
                if(reservation){
                    // Allocate once: arbitrary vector growth can exceed a 2N
                    // transient envelope when max_documents is not a power of two.
                    try {batch.shared_documents_.reserve(limits.max_documents);}
                    catch(const std::bad_alloc&){}catch(const std::length_error&){}
                    if(batch.shared_documents_.capacity()!=limits.max_documents) {
                        std::vector<std::shared_ptr<const SearchDocument>>{}.swap(batch.shared_documents_);
                    } else {batch.sharing_memory_=std::move(*reservation);optional_sharing_owned=true;shared_source=previous;
                    if(reuse&&prior_capture.retry_model_)shared_source=prior_capture.retry_model_.get();
#ifdef RECORDING_SEARCH_TESTING
                    remember_spans=remember_spans&&search_retry_projection_test_enabled;
#endif
                    }
                }
            }
        }

        const auto drop_spans=[&] {batch.segment_spans_.clear();bytes-=span_bytes;span_bytes=0;remember_spans=false;};
        const auto remember_span=[&](const std::string& id,RecordingLifecycle lifecycle,std::size_t begin,std::size_t shared_begin) {
            if(!remember_spans||!raw_valid)return true;
            const auto charge=sizeof(std::pair<const std::string,SearchSourceBatch::SegmentSpan>)+4*sizeof(void*)+2*(id.size()+1);
            const auto slack=(batch.delta.upserts.capacity()-batch.delta.upserts.size())*sizeof(SearchDocument);
            if(bytes>limits.max_bytes||slack>limits.max_bytes-bytes||charge>limits.max_bytes-bytes-slack){drop_spans();return true;}
            bytes+=charge;span_bytes+=charge;
            batch.segment_spans_.emplace(id,SearchSourceBatch::SegmentSpan{raw_digest,raw_size,begin,batch.delta.upserts.size()-begin,lifecycle,
                shared_begin,batch.shared_documents_.size()-shared_begin});
            return true;
        };
        const auto add = [&](SearchDocument d) {
            // Validate/account once, then discard optional span ownership before
            // allocating if it would displace a valid document. The previous
            // implementation validated every field twice while spans existed.
            auto& documents=batch.delta.upserts;
            search_capacity_diagnostic.documents=documents.size();
            search_capacity_diagnostic.capacity=documents.capacity();
            search_capacity_diagnostic.index=documents.size();
            const auto refused=[&](){if(optional_vector||optional_sharing_owned)throw OptionalCaptureCapacity{};return false;};
            if(documents.size()+batch.shared_documents_.size()>=limits.max_documents){SearchCapacityReject("document-count",documents.size(),1);return refused();}
            auto next=bytes;
            if(!AccountOwnedSearchDocument(d,&next,SIZE_MAX))return refused();
            const auto required=documents.size()+1;
            const auto capacity=documents.capacity()<required?
                required+std::min({documents.capacity()?documents.capacity()-1:std::size_t{0},
                    std::size_t{1023},limits.max_documents-required}):documents.capacity();
            const auto extra=capacity-required+(documents.capacity()<required?documents.capacity():0);
            if(span_bytes&&(next>limits.max_bytes||extra>(limits.max_bytes-next)/sizeof(SearchDocument))){
                next-=span_bytes;drop_spans();
            }
            if(next>limits.max_bytes||extra>(limits.max_bytes-next)/sizeof(SearchDocument)){
                SearchCapacityReject("vector-relocation",next,extra>SIZE_MAX/sizeof(SearchDocument)?SIZE_MAX:extra*sizeof(SearchDocument));return refused();
            }
            if(documents.capacity()<required){
                if(costs.enabled){++costs.growths;costs.relocated+=documents.size();}
                documents.reserve(capacity);
            }
            if(documents.capacity()-required>(limits.max_bytes-next)/sizeof(SearchDocument)){
                SearchCapacityReject("vector-capacity",next,(documents.capacity()-required)*sizeof(SearchDocument));return refused();
            }
            documents.push_back(std::move(d));bytes=next;return true;
        };
        // 저장된 locator의 시각만 소비한다. 여기서 미확정 관측의 epoch/시각을 새로 추정하지 않는다.
        const auto locate = [&](SearchDocument& d, const FrameLocatorV1& locator) {
            d.segment_id = locator.segment_id;d.media_pts = locator.frame.pts;
            d.time_base_num = locator.frame.time_base_num;d.time_base_den = locator.frame.time_base_den;
            const auto found = segments_.find(locator.segment_id);
            if (found == segments_.end() || found->second.channel_id != d.channel_id) {
                d.unavailable_reason = "missing-original";return;
            }
            d.source_id=found->second.source_id;d.media_epoch_id=found->second.stream_epoch_id;
            d.unavailable_reason = State(found->second.lifecycle);
            Point(d, Ns(locator.frame.utc_ms));d.time_provenance = "legacy-locator";
        };
        const auto v1 = [&](const AnalysisObservationV1& o) {
            if (!selected(o.channel_id)) return true;
            SearchDocument d;d.id = "o1:" + Key(o.observation_id);d.kind = SearchDocumentKind::Observation;
            d.channel_id=o.channel_id;d.observation_id=o.observation_id;d.track_id=o.track_id;d.object=o.class_label;
            d.event_ids=o.event_ids;d.zone_ids=o.zone_ids;d.rule_ids=o.rule_ids;
            locate(d,o.frame_locator);return add(std::move(d));
        };
        const auto v2 = [&](const AnalysisObservationV2& o) {
            if (!selected(o.channel_id)) return true;
            auto d=Observation(o,"o2:");if(o.frame_locator)locate(d,*o.frame_locator);
            return add(std::move(d));
        };
        const auto referenced = [&](const ReferencedObservationV1& pair) {
            if (!selected(pair.observation.channel_id)) return true;
            auto d=Observation(pair.observation,"or:");d.reference_id=pair.reference.reference_id;
            // 참조는 고정 크기 필드/문자열 계약이다. 사본과 임시값의 비용을 먼저 계상한다.
            const auto size=SerializeRecordingConsumerReferenceV1(pair.reference).size();
            if (size > limits.max_bytes/4 || bytes > limits.max_bytes-size*4) return false;
            bytes+=size*4;
            const auto index=batch.delta.upserts.size();
            if(!add(std::move(d)))return false;
            batch.pending.push_back({index,pair.reference});return true;
        };
        if (batch.rebuild) {
            for (const auto& [id,s] : segments_) {
                if (!selected(s.channel_id) || s.lifecycle == RecordingLifecycle::Deleted || tombstones_.count(id)) continue;
                SearchDocument d;d.id="s1:"+Key(id);d.channel_id=s.channel_id;d.segment_id=id;
                d.source_id=s.source_id;d.media_epoch_id=s.stream_epoch_id;d.stream_epoch_id=s.stream_epoch_id;d.media_end_pts=s.end.pts;d.start_ns=Ns(s.start.utc_ms);d.end_ns=Ns(s.end.utc_ms);
                if (!d.start_ns || !d.end_ns || *d.start_ns>=*d.end_ns) {d.start_ns.reset();d.end_ns.reset();}
                d.media_pts=s.start.pts;d.time_base_num=s.start.time_base_num;d.time_base_den=s.start.time_base_den;
                d.time_provenance="legacy-segment";d.unavailable_reason=State(s.lifecycle);
                if(!add(std::move(d)))return Fail(error,"search-capacity-exceeded");
            }
            // The same Catalog cut protects the authenticated cursor and each
            // charged row. Do not repeat root/chunk traversal for iterator++ or
            // reacquire the segment merely to prove the presence just observed.
            // A bounded cut retains the already authenticated raw rows by move.
            // No history clone or second raw copy; each row releases its 64KiB
            // read workspace before retention. If the optional cut cannot fit,
            // use the original locked traversal and its unchanged admission.
            struct CutRow {SearchModelResidency::Reservation key_memory;std::string id;RecordingColdRow raw;RecordingLifecycle lifecycle;};
            SearchModelResidency::Reservation cut_memory;
            memory_diagnostic::Gauge diagnostic_cut_rows(memory_diagnostic::SourceCutRows);
            std::vector<CutRow> cut;
            std::optional<decltype(segments_v2_)> view;
            std::size_t cut_bytes=0;
            bool detached=false;
            if(allow_raw_cut&&!include_observations&&segments_v2_.cold()){
                const auto count=segments_v2_.size();
                if(count<=limits.max_bytes/sizeof(CutRow)){
                    const auto meta=count*sizeof(CutRow);
                    const auto used=limits.residency->used();
                    if(used<=limits.residency->limit()&&meta<=limits.residency->limit()-used){
                        auto ticket=limits.residency->ReserveOwned(meta,SearchModelResidency::Category::SourceCut);
                        if(ticket){
                            cut_memory=std::move(*ticket);cut.reserve(count);cut_bytes=meta;
                            { CaptureCost::Interval read(costs.read_ns,costs.read_observed,costs.enabled);
                            try { detached=segments_v2_.VisitRawOwned([&](const auto& id,RecordingColdRow& row){
                                latency::CaptureSubcost consumer_cost(latency::CutConsumer);
                                const auto retained=row.bytes.capacity()+1;
                                const auto key=2*(id.size()+1);
                                if(cut.size()==count||retained>limits.max_bytes-cut_bytes||key>limits.max_bytes-cut_bytes-retained)return false;
#ifdef RECORDING_SEARCH_TESTING
                                ++search_projection_work_test[0];
#endif
                                // Key/control storage is charged independently of raw workspace.
                                // Row workspace is already larger than raw + bounded ID.
                                auto key_owner=row.memory.Split(key);
                                auto owned=row.memory.Split(retained);
                                key_owner.DiagnosticCategory(SearchModelResidency::Category::SourceCut);owned.DiagnosticCategory(SearchModelResidency::Category::SourceCut);
                                row.memory=std::move(owned);
                                cut_bytes+=retained+key;costs.raw_bytes+=row.bytes.size();
                                const auto lifecycle=EffectiveLifecycleV2Locked(id,true);
                                cut.push_back({std::move(key_owner),id,std::move(row),lifecycle});diagnostic_cut_rows.Set(cut.size());
                                return true;
                            }); } catch(const RecordingResourceUnavailable&) { detached=false; }
                            }
                            if(detached){optional_cut_owned=true;view.emplace(segments_v2_.ColdReadView());costs.cut_rows=cut.size();costs.cut_charge=cut_bytes;}
                            else {std::vector<CutRow>{}.swap(cut);diagnostic_cut_rows.Set(0);cut_memory={};cut_bytes=0;}
                        }
                    }
                }
            }
            RecordingLifecycle cut_lifecycle=RecordingLifecycle::Unknown;
            const auto current_lifecycle=[&](const auto& id){return detached?cut_lifecycle:EffectiveLifecycleV2Locked(id,true);};
            const auto add_shared=[&](std::shared_ptr<const SearchDocument> document) {
                if(batch.delta.upserts.size()+batch.shared_documents_.size()>=limits.max_documents)return false;
                auto next=bytes;if(!AccountOwnedSearchDocument(*document,&next,limits.max_bytes))return false;
                batch.shared_documents_.push_back(std::move(document));bytes=next;if(costs.attribution)++costs.shared;
#ifdef RECORDING_SEARCH_TESTING
                ++search_projection_work_test[2];
#endif
                return true;
            };
            bool counted_current_raw=false;
            const auto consume=[&](const auto& id,const auto& s) {
                counted_current_raw=false;
                ++costs.rows;
                const auto lifecycle=current_lifecycle(id);
                const auto begin=batch.delta.upserts.size(),shared_begin=batch.shared_documents_.size();
                if (lifecycle==RecordingLifecycle::Deleted) return remember_span(id,lifecycle,begin,shared_begin);
                const auto segment = [&](const RecordingUtcMappingV1* m) {

                    const auto document_id="s2:"+Key(id)+Key(m?m->mapping_id:"");
                    if(shared_source) {
                        auto old=shared_source->SharedDocument(document_id);
                        const auto known=m&&m->provenance!="unknown"&&m->utc_start_ns&&m->utc_end_ns&&*m->utc_start_ns<*m->utc_end_ns;
                        // Compare the complete projection directly to the current
                        // authenticated DTO and separately resolved lifecycle.
                        // No SourceBinding acquisition or new authority boundary.
                        if(old&&old->kind==SearchDocumentKind::Recording&&old->id==document_id&&old->channel_id==s.channel_id&&old->segment_id==id&&
                           old->source_id==s.source_id&&old->store_id==s.store_id&&old->media_epoch_id==s.media_epoch_id&&old->stream_epoch_id==s.media_epoch_id&&
                           old->media_pts==std::optional<std::int64_t>(m?m->start_pts:s.media_start_pts)&&old->media_end_pts==(m?std::optional<std::int64_t>(m->end_pts):s.media_end_pts)&&
                           old->time_base_num==s.time_base_num&&old->time_base_den==s.time_base_den&&old->unavailable_reason==State(lifecycle)&&
                           old->start_ns==(known?m->utc_start_ns:std::nullopt)&&old->end_ns==(known?m->utc_end_ns:std::nullopt)&&
                           old->time_provenance==(m?m->provenance:std::string{})&&old->uncertainty_ns==(m?m->uncertainty_ns:std::nullopt)&&
                           old->playback_segment_id.empty()&&old->playback_event_id.empty()&&old->playback_job_id.empty()&&old->observation_id.empty()&&
                           old->reference_id.empty()&&old->analysis_namespace.empty()&&old->track_id.empty()&&old->object.empty()&&
                           old->event_ids.empty()&&old->zone_ids.empty()&&old->rule_ids.empty()&&old->event_facts.empty()) {
                            return add_shared(std::move(old));
                        }
                    }
#ifdef RECORDING_SEARCH_TESTING
                    ++search_projection_work_test[1];
#endif
                    if(costs.attribution)++costs.materialized;
                    SearchDocument d;d.id="s2:"+Key(id)+Key(m?m->mapping_id:"");d.channel_id=s.channel_id;d.segment_id=id;
                    d.source_id=s.source_id;d.store_id=s.store_id;d.media_epoch_id=s.media_epoch_id;d.stream_epoch_id=s.media_epoch_id;d.media_end_pts=m?m->end_pts:s.media_end_pts;d.media_pts=m?m->start_pts:s.media_start_pts;
                    d.time_base_num=s.time_base_num;d.time_base_den=s.time_base_den;d.unavailable_reason=State(lifecycle);
                    if(m){d.time_provenance=m->provenance;d.uncertainty_ns=m->uncertainty_ns;
                        if(m->provenance!="unknown"&&m->utc_start_ns&&m->utc_end_ns&&*m->utc_start_ns<*m->utc_end_ns){
                            d.start_ns=m->utc_start_ns;d.end_ns=m->utc_end_ns;}}
                    return add(std::move(d));
                };
                if (s.mappings.empty()) {if(!segment(nullptr))return false;}
                else for(const auto& mapping:s.mappings)if(!segment(&mapping))return false;
                return remember_span(id,lifecycle,begin,shared_begin);
            };
            const auto excluded=[&](const auto& id){
                // Channel exclusion never suppresses current lifecycle errors.
                ++costs.rows;++costs.excluded;
#ifdef RECORDING_SEARCH_TESTING
                if(!detached&&segments_v2_.cold()&&!counted_current_raw)++search_projection_work_test[0];
#endif
                counted_current_raw=false;
                (void)current_lifecycle(id);return true;
            };
            const auto raw_consumer=[&](const std::string& id,const std::string& raw)->std::optional<bool>{
#ifdef RECORDING_SEARCH_TESTING
                if(!detached&&segments_v2_.cold())++search_projection_work_test[0];
#endif
                counted_current_raw=true;
                raw_valid=false;
                if(!remember||(shared_source&&!remember_spans))return {};
#if MEDIA_SERVER_USE_OPENSSL
                unsigned digest_size=0;
                raw_valid=EVP_Digest(raw.data(),raw.size(),raw_digest.data(),&digest_size,EVP_sha256(),nullptr)==1&&digest_size==raw_digest.size();
#endif
                raw_size=raw.size();
                if(!raw_valid||!reuse)return {};
                const auto prior=prior_capture.segment_spans_.find(id);
                if(prior==prior_capture.segment_spans_.end())return {};
                const auto span=prior->second;
                if(span.raw_bytes!=raw_size||span.digest!=raw_digest)return {};
                const auto lifecycle=current_lifecycle(id);
                // State is separate from segment raw. A changed lifecycle takes
                // the strict path; deleted rows are never moved into the result.
                if(lifecycle!=span.lifecycle)return {};
                if(span.begin>prior_capture.delta.upserts.size()||span.count>prior_capture.delta.upserts.size()-span.begin)return {};
                // The current raw row was authenticated above. Shared spans
                // belong only to the consumed, unpublished pre-Build batch;
                // never treat a model revision or an old DTO as that proof.
                if(span.shared_count&&(!shared_source||span.shared_begin>prior_capture.shared_documents_.size()||
                   span.shared_count>prior_capture.shared_documents_.size()-span.shared_begin))return {};
                const auto begin=batch.delta.upserts.size(),shared_begin=batch.shared_documents_.size();
                for(std::size_t i=span.begin;i<span.begin+span.count;++i){
                    const auto& d=prior_capture.delta.upserts[i];
                    if(d.segment_id!=id||d.kind!=SearchDocumentKind::Recording||!selected(d.channel_id))return {};
                }
                for(std::size_t i=span.shared_begin;i<span.shared_begin+span.shared_count;++i){
                    const auto& d=prior_capture.shared_documents_[i];
                    if(!d||d->segment_id!=id||d->kind!=SearchDocumentKind::Recording||!selected(d->channel_id))return {};
                }
                for(std::size_t i=span.begin;i<span.begin+span.count;++i)
                    if(!add(std::move(prior_capture.delta.upserts[i])))return false;
                for(std::size_t i=span.shared_begin;i<span.shared_begin+span.shared_count;++i)
                    if(!add_shared(std::move(prior_capture.shared_documents_[i])))return false;
                prior_capture.segment_spans_.erase(prior);++costs.rows;++costs.reused;++batch.reused_segments_;
                return remember_span(id,lifecycle,begin,shared_begin);
            };
            bool complete=true;
            if(detached){
                latency::Lock::Unlocked outside(lock);
                CaptureCost::Interval outside_cost(costs.outside_ns,costs.outside_observed,costs.enabled);
#ifdef RECORDING_SEARCH_TESTING
                if(search_outside_raw_cut_test)search_outside_raw_cut_test();
#endif
                // All arrays include mappings plus codec metadata. This is only
                // an upper allocation hint, never a parser or document count.
                // It avoids repeatedly relocating the complete document vector.
                std::size_t hint=reuse?prior_capture.delta.upserts.size():batch.delta.upserts.size();
                // A retry already owns an authenticated previous vector size.
                // Use it only as an allocation hint; new/changed/deleted rows
                // still take the identical complete raw/lifecycle checks below.
                if(!reuse)for(const auto& row:cut){
                    const auto choice=view->RawChannelSelection(row.id,row.raw.bytes,channels);
                    if(choice&&!*choice)continue;
                    const auto n=std::max(std::size_t{1},ingress::InspectStrictJsonStorageShape(row.raw.bytes).array_elements);
                    if(n>limits.max_documents-hint){hint=0;break;}
                    hint+=n;
                }
                const auto old_capacity=batch.delta.upserts.capacity();
                if(!shared_source&&hint>old_capacity&&bytes<=limits.max_bytes&&
                   old_capacity<=(limits.max_bytes-bytes)/sizeof(SearchDocument)&&
                   hint<=(limits.max_bytes-bytes)/sizeof(SearchDocument)-old_capacity){
                    optional_vector=true;
                    batch.delta.upserts.reserve(hint);
                    if(batch.delta.upserts.capacity()>(limits.max_bytes-bytes)/sizeof(SearchDocument))
                        throw OptionalCaptureCapacity{};
                    costs.vector_hint=hint;
                }
                for(auto& row:cut){
                    cut_lifecycle=row.lifecycle;
                    if(!view->ConsumeOwnedChannelEntry(row.id,std::move(row.raw),channels,consume,excluded,&costs.memo,raw_consumer)){
                        complete=false;break;
                    }
                }
                if(complete&&optional_vector){
                    // Do not pass hint slack to BuildOwned's separate index
                    // admission. Compact with both buffers charged by this batch;
                    // if that cannot fit, unwind to the original streaming path.
                    auto& documents=batch.delta.upserts;
                    if(documents.capacity()>documents.size()){
                        if(bytes>limits.max_bytes||documents.capacity()>(limits.max_bytes-bytes)/sizeof(SearchDocument))
                            throw OptionalCaptureCapacity{};
                        std::vector<SearchDocument> compact;
                        compact.reserve(documents.size());
                        if(compact.capacity()!=documents.size())throw OptionalCaptureCapacity{};
                        for(auto& document:documents)compact.push_back(std::move(document));
                        documents.swap(compact);
                        if(costs.enabled){++costs.growths;costs.relocated+=documents.size();}
                    }
                }
            }else complete=segments_v2_.ForEachChannelEntry(channels,consume,excluded,&costs.memo,raw_consumer);
            if(!complete){if(optional_sharing_owned)throw OptionalCaptureCapacity{};return Fail(error,"search-capacity-exceeded");}
            if(include_observations&&(!observations_.ForEach(v1)||!observations_v2_.ForEach(v2)||!referenced_observations_.ForEach(referenced)))
                return Fail(error,"search-capacity-exceeded");
        } else if(include_observations) {
            std::set<std::pair<RecordingMutationType,std::string>> changed;
            for(const auto& change:search_changes_)if(change.revision>previous->revision())changed.emplace(change.type,change.id);
            for(const auto& [type,id]:changed) {
                if(type==RecordingMutationType::ObservationPut){const auto it=observations_.find(id);
                    if(it!=observations_.end()&&!v1(it->second))return Fail(error,"search-capacity-exceeded");}
                else if(type==RecordingMutationType::ObservationV2Put){const auto it=observations_v2_.find(id);
                    if(it!=observations_v2_.end()&&!v2(it->second))return Fail(error,"search-capacity-exceeded");}
                else {const auto it=referenced_observations_.find(id);
                    if(it!=referenced_observations_.end()&&!referenced(it->second))return Fail(error,"search-capacity-exceeded");}
            }
        }
        SearchDiagnostic::Source(batch.catalog_instance,batch.resolution_revision,source_snapshot_revision_,search_instance_,true,batch.rebuild,batch.delta.upserts.size()+batch.shared_documents_.size(),batch.pending.size());
        if(batch.shared_documents_.empty()) {
            std::vector<std::shared_ptr<const SearchDocument>>{}.swap(batch.shared_documents_);
            batch.sharing_memory_={};
        }
        costs.current=source_snapshot_revision_;
        *result=std::move(batch);costs.complete=true;if(error)error->clear();return true;
    } catch(const OptionalCaptureCapacity&) {
        prior_capture=SearchSourceBatch{};
#ifdef RECORDING_SEARCH_TESTING
        if(optional_sharing_owned)++search_projection_work_test[3];
#endif
        return CaptureSearchSourceImpl(channels,previous,result,error,limits,include_observations,nullptr,false,allow_document_sharing&&!optional_sharing_owned);
    } catch(const RecordingResourceUnavailable&) {
        if(!optional_cut_owned&&!optional_sharing_owned)throw;
        // All cut/batch owners and the Catalog lock have unwound. Optional
        // retained raw must not turn streaming headroom into a new rejection.
        // A partially consumed retry is discarded; one strict locked attempt.
        prior_capture=SearchSourceBatch{};
#ifdef RECORDING_SEARCH_TESTING
        if(optional_sharing_owned)++search_projection_work_test[3];
#endif
        return CaptureSearchSourceImpl(channels,previous,result,error,limits,include_observations,nullptr,false,allow_document_sharing&&!optional_sharing_owned);
    } catch(const RecordingRetainedReadError&) {return Fail(error,"search-source-unavailable");}
      catch(const std::bad_alloc&) {SearchCapacityReject("allocation-exception",0,0);return Fail(error,"search-capacity-exceeded");}
      catch(const std::length_error&) {SearchCapacityReject("length-exception",0,0);return Fail(error,"search-capacity-exceeded");}
}
} // namespace recording
