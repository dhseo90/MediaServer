// 파일 용도: 원본 참조와 검색의 UTC/PTS를 결합한다. 검색 결과를 파일 재생 증명으로 사용하지 않는다.
#include "recording/recording_search_reader.h"
#include <limits>
#include <algorithm>
#include <map>
#include <set>
#include <tuple>
#include <sys/stat.h>
#include "recording/recording_file_evidence.h"
#include "recording/recording_derived_remux.h"
#include "ingress/event_storage_application_service.h"

namespace recording {
namespace {
bool NativeSeek(const RecordingFileEvidenceV1& evidence,std::int64_t ns,SearchSeekTarget* output,std::string* error,
    const std::function<bool()>& expired){
    const auto unavailable=[&](const char* reason){if(error)*error=reason;return false;};
    const RecordingFileSampleEvidenceV1* selected=nullptr;
    for(const auto& sample:evidence.samples)if(sample.original_pts_ns==ns){
        if(selected)return unavailable("seek-unavailable-ambiguous-sample");selected=&sample;
    }
    if(!selected)for(const auto& sample:evidence.samples){
        const __int128 position=(static_cast<__int128>(ns)-evidence.writer_origin_ns)*evidence.timescale;
        const __int128 start=static_cast<__int128>(sample.native_pts)*1000000000;
        const __int128 end=(static_cast<__int128>(sample.native_pts)+sample.native_duration)*1000000000;
        if(start<=position&&position<end){
            if(selected)return unavailable("seek-unavailable-ambiguous-sample");selected=&sample;
        }
    }
    if(!selected||selected->native_pts<evidence.edit_media_time)return unavailable("seek-unavailable-outside-file");
    SearchSeekTarget result;
    result.seconds=static_cast<double>(selected->native_pts-evidence.edit_media_time)/evidence.timescale;
    result.frame_duration_seconds=static_cast<double>(selected->native_duration)/evidence.timescale;
    result.sample_ordinal=selected->ordinal;result.basis="verified-native-file-presentation";
    if(expired())return unavailable("seek-cancelled");
    *output=std::move(result);if(error)error->clear();return true;
}
bool SameFileState(const struct stat& a,const struct stat& b){
    if(!S_ISREG(a.st_mode)||!S_ISREG(b.st_mode)||a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||a.st_size!=b.st_size||
        a.st_nlink!=b.st_nlink||a.st_mode!=b.st_mode||a.st_uid!=b.st_uid||a.st_gid!=b.st_gid)return false;
#ifdef __APPLE__
    return a.st_mtimespec.tv_sec==b.st_mtimespec.tv_sec&&a.st_mtimespec.tv_nsec==b.st_mtimespec.tv_nsec&&
        a.st_ctimespec.tv_sec==b.st_ctimespec.tv_sec&&a.st_ctimespec.tv_nsec==b.st_ctimespec.tv_nsec;
#else
    return a.st_mtim.tv_sec==b.st_mtim.tv_sec&&a.st_mtim.tv_nsec==b.st_mtim.tv_nsec&&
        a.st_ctim.tv_sec==b.st_ctim.tv_sec&&a.st_ctim.tv_nsec==b.st_ctim.tv_nsec;
#endif
}
void Locate(SearchDocument& d, const ConsumerReferenceResolution& resolution) {
    if (resolution.exact.size() != 1 || !resolution.unindexed.empty()) {
        d.unavailable_reason = resolution.exact.size() > 1 ? "ambiguous-original" :
            (!resolution.unindexed.empty() ? "sample-index-cap" : resolution.reason);
        if (d.unavailable_reason.empty()) d.unavailable_reason = "unresolved-original";
        return;
    }
    const auto& resolved = resolution.exact.front();
    const auto& location = resolved.location;
    if (location.state != RecordingLocationState::Single || location.candidates.size() != 1) {
        d.unavailable_reason = "unresolved-location";return;
    }
    const auto& candidate = location.candidates.front();
    d.source_id=resolved.original.segment.source_id;d.store_id=resolved.original.segment.store_id;
    d.media_epoch_id=resolved.original.segment.media_epoch_id;
    d.segment_id = candidate.segment_id;d.media_pts = candidate.media_pts;
    d.time_base_num = candidate.time_base_num;d.time_base_den = candidate.time_base_den;
    d.unavailable_reason = "media-not-checked";
    if (!candidate.mapping) return;
    const auto& mapping = *candidate.mapping;
    d.time_provenance = mapping.provenance;d.uncertainty_ns = mapping.uncertainty_ns;
    if (location.has_unknown || mapping.provenance == "unknown" || !mapping.utc_start_ns ||
        !mapping.utc_end_ns || !mapping.end_pts || candidate.time_base_num <= 0 || candidate.time_base_den <= 0) return;
    const __int128 numerator = (static_cast<__int128>(candidate.media_pts) - mapping.start_pts) *
        candidate.time_base_num * 1000000000;
    if (numerator % candidate.time_base_den) {d.unavailable_reason="unrepresentable-utc-time";return;}
    const auto ns = static_cast<__int128>(*mapping.utc_start_ns) + numerator / candidate.time_base_den;
    if (ns < 0 || ns < *mapping.utc_start_ns || ns >= *mapping.utc_end_ns ||
        ns >= std::numeric_limits<std::int64_t>::max()) return;
    d.start_ns = static_cast<std::int64_t>(ns);d.end_ns = *d.start_ns + 1;
}
}

bool RecordingSearchReader::Refresh(const std::vector<std::string>& channels,
    const std::shared_ptr<const RecordingSearchModel>& previous,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits, bool include_observations) const {
    if (!output) {if(error)*error="search-invalid-output";return false;}
    if(!limits.residency)limits.residency=catalog_.SearchResidency();
    auto workspace=limits.residency->Reserve(limits.max_bytes);
    if(!workspace){if(error)*error="search-capacity-exceeded";return false;}
    SearchSourceBatch batch;
    if (!catalog_.CaptureSearchSource(channels, previous.get(), &batch, error, limits, include_observations)) return false;
    // 준비 순서만 동일 원본 표본별로 묶는다. 출력 위치와 검색 정렬은 바꾸지 않는다.
    // 단일 entry만 유지하며 요청 간 재사용하지 않는다. 아래 revision 재검증은 그대로 수행한다.
    using OriginalKey=std::tuple<std::string,std::string,std::string,std::uint64_t,std::string,std::uint64_t,std::uint64_t>;
    const auto originalKey=[](const auto& pending)->std::optional<OriginalKey> {
        const auto& ref=pending.reference;
        if(ref.association_quality!="timestamp-match"||!ref.original)return std::nullopt;
        const auto& original=*ref.original;
        return OriginalKey{ref.channel_id,ref.source_id,original.source_generation,original.generation_order,
            original.track_id,original.ordinal,original.pts_ns};
    };
    std::sort(batch.pending.begin(),batch.pending.end(),[&](const auto& a,const auto& b){return originalKey(a)<originalKey(b);});
    std::optional<OriginalKey> last_original;ConsumerReferenceResolution resolution;
    for (const auto& pending : batch.pending) {
        const auto& ref=pending.reference;const auto key=originalKey(pending);
        if(!key||key!=last_original) {
            if (!reader_.ResolveConsumerReference(ref, &resolution, error)) return false;
            last_original=key;
        }
        Locate(batch.delta.upserts.at(pending.document_index), resolution);
    }
    if (!catalog_.ValidateSearchSource(batch, error)) return false;
    if (!batch.rebuild && previous && batch.delta.upserts.empty() && batch.delta.removed_ids.empty()) {
        *output = previous;if(error)error->clear();return true;
    }
    std::shared_ptr<const RecordingSearchModel> next;
    const bool built = batch.rebuild ? RecordingSearchModel::Build(batch.delta.upserts,
        batch.delta.source_instance, batch.delta.revision, &next, error, limits) :
        RecordingSearchModel::ApplyDelta(*previous, batch.delta, &next, error, limits);
    // 정렬/복사 동안 발생한 원본 상태 변경도 완료 직전에 거부한다.
    if (!built || !catalog_.ValidateSearchSource(batch, error)) return false;
    *output = std::move(next);if(error)error->clear();return true;
}
bool RecordingSearchReader::WithEventFacts(const RecordingSearchModel& source,
    std::shared_ptr<const RecordingSearchModel>* output, std::string* error, SearchModelLimits limits,
    const RecordingSearchQuery* query) {
    if (!output) {if(error)*error="search-invalid-output";return false;}
    if(!limits.residency)limits.residency=source.residency();
    try {
        auto workspace=limits.residency?limits.residency->Reserve(limits.max_bytes):std::shared_ptr<void>{};
        if(limits.residency&&!workspace){if(error)*error="search-capacity-exceeded";return false;}
        RecordingSearchMatches candidates;
        if(query) {
            if(!source.BehaviourCandidates(*query,&candidates,error))return false;
        } else for(std::size_t i=0;i<source.documents().size();++i)candidates.positions.push_back(i);
        // 질의가 배제한 행은 요청 전용 사본에 복사하지 않는다. 공유 source와 기존 snapshot은
        // 불변이며, query가 없는 기존 전체 enrichment 호출은 그대로 모든 행을 소비한다.
        std::vector<SearchDocument> documents;
        documents.reserve(candidates.positions.size());
        std::map<std::string,std::vector<std::size_t>> channels;
        for(const auto position:candidates.positions){
            documents.push_back(source.documents().at(position));
            auto& document=documents.back();document.event_facts.clear();
            if(!document.event_ids.empty())channels[document.channel_id].push_back(documents.size()-1);
        }
        for(const auto& channel:channels) {
            std::vector<ingress::EventSearchApplicationFact> facts;
            if(!ingress::ReadEventSearchFactsForApplication(channel.first,&facts,error))return false;
            std::map<std::string,const ingress::EventSearchApplicationFact*> by_id;
            for(const auto& fact:facts) {
                auto inserted=by_id.emplace(fact.event_id,&fact);
                if(!inserted.second) {
                    const auto& old=*inserted.first->second;
                    if(std::tie(old.channel_id,old.track_id,old.stream_epoch_id,old.event_type,old.scenario_name)!=
                       std::tie(fact.channel_id,fact.track_id,fact.stream_epoch_id,fact.event_type,fact.scenario_name)) {
                        if(error)*error="search-event-evidence-conflict";return false;
                    }
                }
            }
            for(const auto index:channel.second) {
                auto& d=documents[index];
                for(const auto& id:d.event_ids) {
                    const auto found=by_id.find(id);if(found==by_id.end())continue;
                    const auto& fact=*found->second;
                    if(fact.channel_id!=d.channel_id || (!d.track_id.empty()&&d.track_id!=std::to_string(fact.track_id)&&d.track_id!="track-"+std::to_string(fact.track_id)) ||
                        (!d.stream_epoch_id.empty()&&d.stream_epoch_id!=fact.stream_epoch_id))continue;
                    d.event_facts.push_back({fact.event_id,fact.event_type,fact.scenario_name});
                }
            }
        }
        return RecordingSearchModel::Build(documents,source.source_instance(),source.revision(),output,error,limits);
    } catch(const std::bad_alloc&) {if(error)*error="search-capacity-exceeded";return false;}
      catch(const std::length_error&) {if(error)*error="search-capacity-exceeded";return false;}
}
bool RecordingSearchReader::PlaybackCandidates(const RecordingSearchModel& model,const RecordingSearchQuery& input,
    std::vector<SearchPlaybackCandidate>* output,std::string* error) const {
    if(!output){if(error)*error="search-invalid-output";return false;}
    RecordingSearchQuery query;if(!NormalizeSearchQuery(input,&query,error))return false;
    SearchSourceBatch guard;
    if(!catalog_.CaptureSearchSource(query.channels,&model,&guard,error,{},model.source_instance().rfind("recordings:",0)!=0))return false;
    if(guard.rebuild){if(error)*error="search-source-changed";return false;}
    try {
        std::vector<SearchPlaybackCandidate> candidates;
        for(const auto& channel:query.channels) {
            RecordingTimelineResult timeline;
            if(!reader_.QuerySearchEventTimeline(channel,query.start_time_ms,query.end_time_ms,&timeline,error))return false;
            for(const auto& item:timeline.items) {
                if(item.kind!="event"||!item.playable||item.job_state!="complete"||item.event_id.empty())continue;
                for(const auto& proof:item.coverage) {
                    if(candidates.size()==4096){if(error)*error="search-playback-candidate-capacity";return false;}
                    // coverage는 기존 reader가 원본/요청/실제 파생 범위를 대조한 media-ns 축이다.
                    ConfirmedMediaInterval original{proof.source_id,proof.store_id,proof.epoch_id,proof.segment_id,
                        1,1000000000,proof.start_ns,proof.end_ns};
                    candidates.push_back({std::move(original),item.event_id,item.segment_id,true,true,item.job_id});
                }
            }
        }
        if(!catalog_.ValidateSearchSource(guard,error))return false;
        *output=std::move(candidates);if(error)error->clear();return true;
    }catch(const std::bad_alloc&){if(error)*error="search-playback-candidate-capacity";return false;}
     catch(const std::length_error&){if(error)*error="search-playback-candidate-capacity";return false;}
}
bool RecordingSearchReader::SourceSeek(const std::string& channel,const std::string& segment,
    std::int64_t pts,std::int32_t num,std::int32_t den,SearchSeekTarget* output,std::string* error,
    const ResolvedRecordingMedia* verified_media,const std::function<bool()>& cancelled,
    std::chrono::steady_clock::time_point deadline) const {
    const auto unavailable=[&](const char* reason){if(error)*error=reason;return false;};
    if(!output||pts<0||num<=0||den<=0)return unavailable("seek-unavailable-invalid-time");
    const __int128 scaled=static_cast<__int128>(pts)*num*1000000000;
    if(scaled%den||scaled/den>std::numeric_limits<std::int64_t>::max())return unavailable("seek-unavailable-unrepresentable-time");
    const auto ns=static_cast<std::int64_t>(scaled/den);
    const auto binding=catalog_.FindSourceBinding(segment);
    if(!binding||binding->channel_id!=channel||binding->segment_id!=segment||!binding->file_evidence)
        return unavailable("seek-unavailable-file-evidence");
    const auto expired=[&]{return std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled());};
    if(expired())return unavailable("seek-cancelled");
    std::unique_ptr<ResolvedRecordingMedia> owned;
    if(!verified_media){MediaInspectionOptions options;options.deadline=deadline;options.cancelled=cancelled;
        owned=reader_.ResolveMedia(channel,segment,std::move(options));verified_media=owned.get();}
    if(!verified_media)return unavailable(expired()?"seek-cancelled":"seek-unavailable-media");
    std::string evidence_error;
    if(!VerifyRecordingFileEvidenceFd(verified_media->fd(),*binding,&evidence_error,expired))
        return unavailable(expired()?"seek-cancelled":"seek-unavailable-file-evidence");
    return NativeSeek(*binding->file_evidence,ns,output,error,expired);
}
struct RecordingSearchReader::PreparedSource::Impl {
    RecordingCatalog* catalog{};
    RecordingSegmentV2 segment;
    std::pair<std::filesystem::path,std::filesystem::path> location;
    mutable RecordingCatalog::SourceBindingReadContext context;
    std::shared_ptr<const RecordingSourceBindingV1> binding;
    struct stat verified{};
    std::shared_ptr<ResolvedRecordingMedia> media;
};
RecordingSearchReader::PreparedSource::PreparedSource(std::unique_ptr<Impl> value):impl_(std::move(value)){}
RecordingSearchReader::PreparedSource::~PreparedSource()=default;
std::shared_ptr<const ResolvedRecordingMedia> RecordingSearchReader::PreparedSource::Hold() const{return impl_->media;}
bool RecordingSearchReader::PreparedSource::Matches(const std::string& channel,const std::string& segment,const std::string& sha) const {
    return impl_->segment.channel_id==channel&&impl_->segment.segment_id==segment&&impl_->segment.checksum_sha256==sha;
}
bool RecordingSearchReader::PreparedSource::MatchesFrame(std::int64_t pts,const std::string& sha) const {
    if(!impl_->binding||!impl_->binding->file_evidence)return false;unsigned found=0;
    for(const auto& sample:impl_->binding->file_evidence->samples)if(sample.original_pts_ns==pts&&sample.sample_sha256==sha)++found;
    return found==1;
}
std::size_t RecordingSearchReader::PreparedSource::retained_bytes() const {
    return sizeof(Impl)+impl_->context.retained_bytes+4*SerializeRecordingSegmentV2(impl_->segment).size()+
        4*(impl_->location.first.native().capacity()+impl_->location.second.native().capacity())+8192;
}
std::unique_ptr<RecordingSearchReader::PreparedSource> RecordingSearchReader::PrepareSource(
    const std::string& channel,const std::string& id,std::string* error,const std::function<bool()>& cancelled,
    std::chrono::steady_clock::time_point deadline) const {
    const auto expired=[&]{return std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled());};
    const auto fail=[&](const char* reason)->std::unique_ptr<PreparedSource>{if(error)*error=reason;return {};};
    if(expired())return fail("seek-cancelled");
    auto proof=std::make_unique<PreparedSource::Impl>();proof->catalog=&catalog_;
    if(!catalog_.AcquireMediaV2(channel,id,&proof->segment,&proof->location,error))return {};
    struct Release {RecordingCatalog& catalog;const std::string& id;~Release(){catalog.AdjustHoldCount(id,-1,nullptr);}} release{catalog_,id};
    const auto binding=catalog_.ReadSourceBinding(id,&proof->context,error);
    if(!binding||!binding->file_evidence||!ValidateRecordingSourceBindingForSegment(*binding,proof->segment,error))return fail("seek-unavailable-file-evidence");
    MediaInspectionOptions options;options.deadline=deadline;options.cancelled=cancelled;
    proof->media=reader_.ResolveMedia(channel,id,std::move(options));
    if(!proof->media)return fail(expired()?"seek-cancelled":"seek-unavailable-media");
    struct stat after{};
    if(::fstat(proof->media->fd(),&proof->verified)!=0||
        !VerifyRecordingFileEvidenceFd(proof->media->fd(),*binding,error,expired)||
        ::fstat(proof->media->fd(),&after)!=0||!SameFileState(proof->verified,after))return fail(expired()?"seek-cancelled":"seek-unavailable-file-evidence");
    proof->binding=binding;
    const auto current=catalog_.ReadSourceBinding(id,&proof->context,error);
    if(!current||current!=proof->binding||
        !reader_.RevalidateHeldMediaV2(*proof->media,proof->segment,proof->location))return fail("seek-unavailable-source-changed");
    if(expired())return fail("seek-cancelled");
    if(error)error->clear();return std::unique_ptr<PreparedSource>(new PreparedSource(std::move(proof)));
}
bool RecordingSearchReader::SourceSeekPrepared(const PreparedSource& prepared,std::int64_t pts,std::int32_t num,
    std::int32_t den,SearchSeekTarget* output,std::string* error,const std::function<bool()>& cancelled,
    std::chrono::steady_clock::time_point deadline) const {
    const auto fail=[&](const char* reason){if(error)*error=reason;return false;};
    const auto expired=[&]{return std::chrono::steady_clock::now()>=deadline||(cancelled&&cancelled());};
    if(!output||pts<0||num<=0||den<=0)return fail("seek-unavailable-invalid-time");
    if(expired())return fail("seek-cancelled");
    const __int128 scaled=static_cast<__int128>(pts)*num*1000000000;
    if(scaled%den||scaled/den>std::numeric_limits<std::int64_t>::max())return fail("seek-unavailable-unrepresentable-time");
    const auto& proof=*prepared.impl_;
    if(proof.catalog!=&catalog_)return fail("seek-unavailable-source-changed");
    const auto binding=catalog_.ReadSourceBinding(proof.segment.segment_id,&proof.context,error);struct stat current{};
    if(!binding||!binding->file_evidence||binding!=proof.binding||
        !reader_.RevalidateHeldMediaV2(*proof.media,proof.segment,proof.location)||
        ::fstat(proof.media->fd(),&current)!=0||!SameFileState(proof.verified,current))return fail("seek-unavailable-source-changed");
    return NativeSeek(*binding->file_evidence,static_cast<std::int64_t>(scaled/den),output,error,expired);
}
bool RecordingSearchReader::DerivedSeek(const std::string& channel,const std::string& job_id,
    const std::string& original_id,const std::string& output_id,std::int64_t original_ns,
    SearchSeekTarget* output,std::string* error) const {
    const auto unavailable=[&](const char* reason){if(error)*error=reason;return false;};
    if(!output||original_ns<0)return unavailable("seek-unavailable-invalid-time");
    std::optional<DerivedJobRecordV1> job;
    if(!catalog_.FindDerivedJob(job_id,&job,error)||!job||job->state!=DerivedJobState::Complete||
        !job->ready||!job->ready->verified_output||job->intent.reference.channel_id!=channel)
        return unavailable("seek-unavailable-derived-job");
    const DerivedJobReadyOutputV1* chosen=nullptr;
    for(const auto& candidate:job->ready->outputs)if(candidate.segment.segment_id==output_id){
        if(chosen)return unavailable("seek-unavailable-ambiguous-output");chosen=&candidate;
    }
    if(!chosen||chosen->source_index>=job->intent.sources.size()||chosen->segment.channel_id!=channel||
        chosen->segment.container!="mp4"||!chosen->provenance.verified_output)
        return unavailable("seek-unavailable-derived-output");
    const auto& source=job->intent.sources[chosen->source_index].segment;const auto& proof=chosen->provenance;
    if(source.segment_id!=original_id||source.channel_id!=channel||proof.segment_id!=source.segment_id||
        proof.source_id!=source.source_id||proof.store_id!=source.store_id||proof.media_epoch_id!=source.media_epoch_id)
        return unavailable("seek-unavailable-original-mismatch");
    const DerivedRemuxAu* selected=nullptr;
    for(const auto& au:proof.access_units)if(au.original_pts_ns==original_ns){
        if(selected)return unavailable("seek-unavailable-ambiguous-sample");selected=&au;
    }
    if(!selected)for(const auto& au:proof.access_units)if(au.original_pts_ns<=original_ns&&
        static_cast<__int128>(original_ns)<static_cast<__int128>(au.original_pts_ns)+au.file_duration_ns){
        if(selected)return unavailable("seek-unavailable-ambiguous-sample");selected=&au;
    }
    if(!selected)return unavailable("seek-unavailable-outside-file");
    auto media=reader_.ResolveMedia(channel,output_id);if(!media)return unavailable("seek-unavailable-media");
    std::int64_t stream=0,duration=0;std::string detail;
    if(!ResolveRecordingPresentationTime(media->fd(),chosen->segment.size_bytes,chosen->segment.checksum_sha256,
        selected->output_pts_ns,selected->output_vcl_sha256,&stream,&duration,&detail))
        return unavailable("seek-unavailable-output-presentation");
    SearchSeekTarget result;result.seconds=static_cast<double>(stream)/1000000000;
    result.frame_duration_seconds=static_cast<double>(duration)/1000000000;
    result.sample_ordinal=selected->ordinal;result.basis="verified-derived-file-presentation";
    *output=std::move(result);if(error)error->clear();return true;
}
bool RecordingSearchReader::WithPlayback(const RecordingSearchModel& model,const RecordingSearchQuery& query,
    std::shared_ptr<const RecordingSearchModel>* output,std::string* error,SearchModelLimits limits) const {
    if(!output){if(error)*error="search-invalid-output";return false;}
    if(!limits.residency)limits.residency=model.residency()?model.residency():catalog_.SearchResidency();
    auto workspace=limits.residency->Reserve(limits.max_bytes);
    if(!workspace){if(error)*error="search-capacity-exceeded";return false;}
    std::vector<SearchPlaybackCandidate> candidates;if(!PlaybackCandidates(model,query,&candidates,error))return false;
    try {
        std::vector<SearchDocument> documents;std::set<std::string> replaced_outputs;std::size_t bytes=0;
        const auto add=[&](SearchDocument document){
            if(documents.size()>=limits.max_documents||!AccountSearchDocument(document,&bytes,limits.max_bytes))return false;
            documents.push_back(std::move(document));return true;
        };
        const auto ns=[](std::int64_t pts,std::int32_t num,std::int32_t den)->std::optional<std::int64_t>{
            if(num<=0||den<=0)return {};const __int128 value=static_cast<__int128>(pts)*num*1000000000;
            if(value%den||value/den<0||value/den>std::numeric_limits<std::int64_t>::max())return {};
            return static_cast<std::int64_t>(value/den);
        };
        std::vector<std::size_t> positions;
        const bool metadata=!query.objects.empty()||!query.tracks.empty()||!query.events.empty()||
            !query.zones.empty()||!query.rules.empty()||!query.behaviours.empty();
        if(metadata) {
            RecordingSearchMatches matches;if(!model.Query(query,&matches,error))return false;
            positions=std::move(matches.positions);
        } else for(std::size_t i=0;i<model.documents().size();++i)
            if(model.documents()[i].kind==SearchDocumentKind::Recording)positions.push_back(i);
        // 관측은 점 위치이고 우선 선택이 필터 값을 바꾸지 않는다. 페이지를 자르기 전에 모든 일치를 선택한다.
        // 녹화 구간은 partial 분할/출력 대체가 끝난 뒤 필터링하는 기존 순서를 유지한다.
        for(const auto position:positions) {
            const auto& input=model.documents()[position];
            auto document=input;document.playback_segment_id=document.segment_id;
            document.playback_event_id.clear();document.playback_job_id.clear();
            const auto start=document.media_pts?ns(*document.media_pts,document.time_base_num,document.time_base_den):std::nullopt;
            const auto end=document.kind==SearchDocumentKind::Observation?
                (start&&*start<std::numeric_limits<std::int64_t>::max()?std::optional<std::int64_t>(*start+1):std::nullopt):
                (document.media_end_pts?ns(*document.media_end_pts,document.time_base_num,document.time_base_den):std::nullopt);
            // 시간 변환을 입증할 수 없는 행은 원본 참조를 보존한다.
            if(!start||!end||*start>=*end||document.segment_id.empty()||
                (document.kind==SearchDocumentKind::Recording&&document.start_ns&&*document.end_ns-*document.start_ns!=*end-*start)) {
                if(!add(std::move(document))){if(error)*error="search-capacity-exceeded";return false;}continue;
            }
            ConfirmedMediaInterval original{document.source_id,document.store_id,document.media_epoch_id,
                document.segment_id,1,1000000000,*start,*end};
            std::vector<SearchPlaybackSlice> slices;if(!SelectSearchPlayback(original,candidates,&slices,error))return false;
            for(const auto& slice:slices) {
                auto part=document;part.media_pts=slice.original.start_pts;part.media_end_pts=slice.original.end_pts;
                part.time_base_num=1;part.time_base_den=1000000000;
                part.playback_segment_id=slice.playback_segment_id;part.playback_event_id=slice.event_id;part.playback_job_id=slice.job_id;
                if(document.kind==SearchDocumentKind::Recording) {
                    if(!slice.event_id.empty())replaced_outputs.insert(slice.playback_segment_id);
                    if(slices.size()>1)part.id=document.id+":range:"+std::to_string(slice.original.start_pts)+":"+std::to_string(slice.original.end_pts);
                    if(document.start_ns){part.start_ns=*document.start_ns+(slice.original.start_pts-*start);part.end_ns=*document.start_ns+(slice.original.end_pts-*start);}
                }
                if(!add(std::move(part))){if(error)*error="search-capacity-exceeded";return false;}
            }
        }
        documents.erase(std::remove_if(documents.begin(),documents.end(),[&](const auto& document){
            return document.kind==SearchDocumentKind::Recording&&replaced_outputs.count(document.segment_id);
        }),documents.end());
        return RecordingSearchModel::Build(documents,model.source_instance(),model.revision(),output,error,limits);
    }catch(const std::bad_alloc&){if(error)*error="search-capacity-exceeded";return false;}
     catch(const std::length_error&){if(error)*error="search-capacity-exceeded";return false;}
}
} // namespace recording
