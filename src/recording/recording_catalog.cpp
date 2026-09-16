// 파일 요약: 녹화 JSONL mutation을 memory/SQLite projection에 적용한다.
// 동작 요약: idempotent replay, FK 검증, 손상 DB 격리와 range query parity를 구현한다.
#include "recording/recording_catalog.h"
#include "recording_checkpoint_validation.h"
#include "recording/recording_finalize_recovery.h"

#include <algorithm>
#include <atomic>
#include <chrono>
#include <fstream>
#include <limits>
#include <sstream>

#if defined(__APPLE__) || defined(__linux__)
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

#include "domain/strict_json.h"

#ifndef MEDIA_SERVER_USE_SQLITE3
#define MEDIA_SERVER_USE_SQLITE3 0
#endif

#if MEDIA_SERVER_USE_SQLITE3
#include <sqlite3.h>
#endif

namespace recording {
namespace {

bool IsDerivedJobMutation(RecordingMutationType type) {
    return type==RecordingMutationType::DerivedJobIntent||type==RecordingMutationType::DerivedJobFiles||
        type==RecordingMutationType::DerivedJobReady||type==RecordingMutationType::DerivedJobCommitted||
        type==RecordingMutationType::DerivedJobComplete||type==RecordingMutationType::DerivedJobFailed;
}

std::int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

bool Fail(std::string* error, const std::string& message) {
    if (error != nullptr) *error = message;
    return false;
}

std::string Escape(const std::string& value) {
    std::string out;
    for (const char ch : value) {
        if (ch == '\\') out += "\\\\";
        else if (ch == '"') out += "\\\"";
        else if (ch == '\n') out += "\\n";
        else out.push_back(ch);
    }
    return out;
}

std::string NextMutationId() {
    static std::atomic<std::uint64_t> sequence{0};
    return "mut-" + std::to_string(NowMs()) + "-" + std::to_string(++sequence);
}

bool MergeObservation(const AnalysisObservationV2& previous, AnalysisObservationV2* next,
                      std::string* error) {
    if (previous.source_id != next->source_id || previous.channel_id != next->channel_id ||
        previous.analysis_namespace != next->analysis_namespace || previous.track_id != next->track_id ||
        previous.stream_epoch_id != next->stream_epoch_id || previous.pts != next->pts)
        return Fail(error, "observation-v2-identity-mismatch");
    const auto merge = [](const auto& first, auto* second) {
        auto values = first;
        for (const auto& value : *second)
            if (std::find(values.begin(), values.end(), value) == values.end()) values.push_back(value);
        *second = std::move(values);
    };
    merge(previous.selection_reasons, &next->selection_reasons);
    merge(previous.event_ids, &next->event_ids);
    merge(previous.zone_ids, &next->zone_ids); merge(previous.line_ids, &next->line_ids);
    merge(previous.rule_ids, &next->rule_ids); merge(previous.scenario_ids, &next->scenario_ids);
    if (previous.duration_ns && !next->duration_ns) {
        next->duration_ns = previous.duration_ns;
        next->ended_reason = previous.ended_reason;
        next->first_seen_pts = previous.first_seen_pts;
        next->last_seen_pts = previous.last_seen_pts;
    }
    next->created_at_ms = previous.created_at_ms;
    AnalysisObservationV2 validated;
    return ParseAnalysisObservationV2(SerializeAnalysisObservationV2(*next), &validated, error);
}

bool MergeReferenced(const ReferencedObservationV1& previous,ReferencedObservationV1* next,std::string* error) {
    next->reference.created_at_ms=previous.reference.created_at_ms;
    if(SerializeRecordingConsumerReferenceV1(previous.reference)!=SerializeRecordingConsumerReferenceV1(next->reference))
        return Fail(error,"referenced observation original identity 변경");
    // 새 경로에서는 분류/bbox/신뢰도를 재전달로 덮지 않고 선택·event·종료정보만 병합한다.
    const auto& p=previous.observation;auto& n=next->observation;
    if(p.class_label!=n.class_label||p.confidence!=n.confidence||p.bbox.x!=n.bbox.x||p.bbox.y!=n.bbox.y||
       p.bbox.width!=n.bbox.width||p.bbox.height!=n.bbox.height)return Fail(error,"referenced observation attributes 변경");
    return MergeObservation(p,&n,error)&&ValidateReferencedObservationV1(*next,error);
}

std::optional<std::string> ObjectField(const std::string& json, const std::string& key) {
    ingress::StrictJsonObjectDocument document;
    std::string error;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, &error)) return std::nullopt;
    return ingress::StrictJsonObjectField(document, key);
}

std::optional<std::string> StringField(const std::string& json, const std::string& key) {
    ingress::StrictJsonObjectDocument document;
    std::string error;
    if (!ingress::ParseStrictJsonObjectDocument(json, &document, &error)) return std::nullopt;
    return ingress::StrictJsonStringField(document, key);
}

bool IsRecognizedMedia(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    unsigned char bytes[12]{};
    input.read(reinterpret_cast<char*>(bytes), sizeof(bytes));
    const auto count = input.gcount();
    const bool mp4 = count >= 8 && bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p';
    const bool webm = count >= 4 && bytes[0] == 0x1a && bytes[1] == 0x45 && bytes[2] == 0xdf && bytes[3] == 0xa3;
    return mp4 || webm;
}

bool IsSafeMediaRelpath(const std::string& value) {
    if (value.empty()) return false;
    const std::filesystem::path path(value);
    if (path.is_absolute()) return false;
    const auto normalized = path.lexically_normal();
    if (normalized.empty() || normalized == ".") return false;
    for (const auto& part : normalized) {
        if (part == "..") return false;
    }
    return true;
}

enum class CleanupMarkerOwnership {
    Legacy,
    OwnedPartial,
    Invalid,
};

struct CleanupMarkerBinding {
    CleanupMarkerOwnership ownership{CleanupMarkerOwnership::Invalid};
    std::string partial_name;
};

CleanupMarkerBinding ReadCleanupMarkerBinding(
    const std::filesystem::path& marker,
    const std::string& final_name) {
#if defined(__APPLE__) || defined(__linux__)
    const int fd = ::open(marker.c_str(), O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) return {};
    struct stat status {};
    if (::fstat(fd, &status) != 0 || !S_ISREG(status.st_mode) || status.st_nlink != 1 ||
        status.st_size <= 0 || status.st_size > 512) {
        ::close(fd);
        return {};
    }
    std::string contents(static_cast<std::size_t>(status.st_size), '\0');
    std::size_t offset = 0;
    while (offset < contents.size()) {
        const ssize_t count = ::read(fd, contents.data() + offset, contents.size() - offset);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) {
            ::close(fd);
            return {};
        }
        offset += static_cast<std::size_t>(count);
    }
    ::close(fd);
#else
    std::ifstream input(marker, std::ios::binary);
    if (!input) return {};
    std::ostringstream buffer;
    buffer << input.rdbuf();
    const std::string contents = buffer.str();
    if (contents.empty() || contents.size() > 512) return {};
#endif
    if (contents == "recording-cleanup-pending-v1\n") {
        return {CleanupMarkerOwnership::Legacy, {}};
    }
    constexpr const char* kV2Prefix = "recording-cleanup-pending-v2\npartial=";
    if (contents.rfind(kV2Prefix, 0) != 0 || contents.back() != '\n') return {};
    const std::string partial_name = contents.substr(
        std::char_traits<char>::length(kV2Prefix),
        contents.size() - std::char_traits<char>::length(kV2Prefix) - 1);
    const std::string required_prefix = final_name + ".partial.";
    if (partial_name.size() <= required_prefix.size() || partial_name.size() > 255 ||
        partial_name.rfind(required_prefix, 0) != 0 ||
        std::filesystem::path(partial_name).filename().string() != partial_name) {
        return {};
    }
    const std::string nonce = partial_name.substr(required_prefix.size());
    if (nonce.size() != 36) return {};
    for (std::size_t index = 0; index < nonce.size(); ++index) {
        const bool hyphen_position =
            index == 8 || index == 13 || index == 18 || index == 23;
        const unsigned char ch = static_cast<unsigned char>(nonce[index]);
        const bool hex = (ch >= '0' && ch <= '9') ||
                         (ch >= 'a' && ch <= 'f') ||
                         (ch >= 'A' && ch <= 'F');
        if ((hyphen_position && ch != '-') || (!hyphen_position && !hex)) return {};
    }
    if (nonce[14] != '4' ||
        (nonce[19] != '8' && nonce[19] != '9' &&
         nonce[19] != 'a' && nonce[19] != 'A' &&
         nonce[19] != 'b' && nonce[19] != 'B')) {
        return {};
    }
    return {CleanupMarkerOwnership::OwnedPartial, partial_name};
}

bool ResolveContainedMediaPath(const std::filesystem::path& root,
                               const std::filesystem::path& relative,
                               std::filesystem::path* resolved) {
    if (resolved == nullptr || !IsSafeMediaRelpath(relative.generic_string())) return false;
    std::error_code root_error;
    std::error_code media_error;
    const auto canonical_root = std::filesystem::weakly_canonical(root, root_error);
    const auto canonical_media = std::filesystem::weakly_canonical(root / relative, media_error);
    if (root_error || media_error) return false;
    const auto containment = canonical_media.lexically_relative(canonical_root);
    if (containment.empty() || containment.is_absolute()) return false;
    for (const auto& part : containment) {
        if (part == "..") return false;
    }
    *resolved = canonical_media;
    return true;
}

#if MEDIA_SERVER_USE_SQLITE3
std::string LifecycleName(RecordingLifecycle value) {
    switch (value) {
        case RecordingLifecycle::Writing: return "writing";
        case RecordingLifecycle::Finalized: return "finalized";
        case RecordingLifecycle::DeletionPending: return "deletion_pending";
        case RecordingLifecycle::Deleted: return "deleted";
        case RecordingLifecycle::Corrupt: return "corrupt";
        case RecordingLifecycle::Unknown: return "unknown";
    }
    return "unknown";
}

std::string RetentionName(RecordingRetentionClass value) {
    switch (value) {
        case RecordingRetentionClass::Continuous: return "continuous";
        case RecordingRetentionClass::Event: return "event";
        case RecordingRetentionClass::Unknown: return "unknown";
    }
    return "unknown";
}

std::string EventStatusName(EventRecordingLinkStatus value) {
    switch (value) {
        case EventRecordingLinkStatus::Pending: return "pending";
        case EventRecordingLinkStatus::Complete: return "complete";
        case EventRecordingLinkStatus::Partial: return "partial";
        case EventRecordingLinkStatus::Failed: return "failed";
        case EventRecordingLinkStatus::Unknown: return "unknown";
    }
    return "unknown";
}

bool Exec(sqlite3* db, const std::string& sql, std::string* error) {
    char* raw_error = nullptr;
    const int rc = sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &raw_error);
    if (rc == SQLITE_OK) return true;
    const std::string message = raw_error != nullptr ? raw_error : sqlite3_errmsg(db);
    sqlite3_free(raw_error);
    return Fail(error, message);
}

void BindText(sqlite3_stmt* statement, int index, const std::string& value) {
    sqlite3_bind_text(statement, index, value.c_str(), -1, SQLITE_TRANSIENT);
}
#endif

}  // namespace

RecordingCatalog::RecordingCatalog(RecordingJournal& journal, Options options)
    : journal_(journal), options_(std::move(options)) {}

RecordingCatalog::~RecordingCatalog() {
    std::lock_guard lock(mu_);
    CloseSqliteLocked();
    journal_.DetachCatalog(this);
}

bool RecordingCatalog::Open(std::string* error) {
    std::lock_guard lock(mu_);
    if (opened_) return journal_.OwnsCatalog(this);
    if(!journal_.AttachCatalog(this,options_.media_root,options_.sqlite_path,options_.enable_v2_storage,error))return false;
    if(OpenLocked(error))return true;
    CloseSqliteLocked();journal_.DetachCatalog(this);return false;
}

bool RecordingCatalog::ValidateManagedWriterBinding(const RecordingJournal& journal,
        const std::filesystem::path& root,const std::string& store_id,std::string* error) const {
    std::lock_guard lock(mu_);
    if(&journal!=&journal_ || !opened_ || !options_.enable_v2_storage || !journal_.managed_ ||
       store_id.empty() || store_id!=journal_.managed_store_id_ || !CanWriteLocked(error) || !journal_.HasManagedLease())
        return Fail(error,"managed writer 소유권/옵션 결박 오류");
    std::error_code ec;const auto absolute=std::filesystem::absolute(root,ec);
    if(ec || absolute!=absolute.lexically_normal())return Fail(error,"managed writer root 정규 경로 필요");
    std::filesystem::path cursor;
    for(const auto& part:absolute) {
        cursor/=part;const auto status=std::filesystem::symlink_status(cursor,ec);
        if(ec || std::filesystem::is_symlink(status) || !std::filesystem::is_directory(status))
            return Fail(error,"managed writer root 안전 경로 오류");
    }
    const auto expected=std::filesystem::absolute(journal_.managed_root_,ec).lexically_normal();
    if(ec || absolute!=expected || absolute!=std::filesystem::absolute(options_.media_root,ec).lexically_normal())
        return Fail(error,"managed writer root 불일치");
    if(error)error->clear();return true;
}

bool RecordingCatalog::CanWriteLocked(std::string* error) const {
    if(!derived_job_state_authoritative_)return Fail(error,"derived job 원장 불확실: 재open 필요");
    if(journal_.managed_&&(!opened_||!journal_.OwnsCatalog(this)))return Fail(error,"managed catalog write 소유권 거부");
    return true;
}

bool RecordingCatalog::BindRetentionOwner(const RetentionCoordinator* owner) {
    std::lock_guard lock(mu_);
    if (!owner || (retention_owner_ && retention_owner_ != owner)) return false;
    retention_owner_ = owner;
    return true;
}

void RecordingCatalog::UnbindRetentionOwner(const RetentionCoordinator* owner) {
    std::lock_guard lock(mu_);
    if (retention_owner_ == owner) retention_owner_ = nullptr;
}

bool RecordingCatalog::IsRetentionOwner(const RetentionCoordinator* owner) const {
    std::lock_guard lock(mu_);
    return owner && retention_owner_ == owner;
}

bool RecordingCatalog::BindDerivedService(const void* owner) {
    std::lock_guard lock(mu_);
    if(!owner||derived_service_owner_)return false;
    derived_service_owner_=owner;return true;
}
void RecordingCatalog::UnbindDerivedService(const void* owner) {
    std::lock_guard lock(mu_);if(derived_service_owner_==owner)derived_service_owner_=nullptr;
}
bool RecordingCatalog::UpdateDerivedJob(const void* owner,const DerivedJobRecordV1& record,std::string* error) {
    std::lock_guard lock(mu_);
    if(!owner||derived_service_owner_!=owner||!opened_||!CanWriteLocked(error))return Fail(error,"derived service 소유권/원장 거부");
    const auto payload=SerializeDerivedJobRecord(record);
    const auto found=derived_jobs_.find(record.intent.job_id);
    if(payload.empty()||found==derived_jobs_.end())return Fail(error,"derived service record 거부");
    if(SerializeDerivedJobRecord(found->second)==payload)return true;
    RecordingMutationV1 mutation;mutation.entity_id=record.intent.job_id;mutation.payload_json=payload;
    switch(record.state) {
        case DerivedJobState::Intent:mutation.mutation_type=RecordingMutationType::DerivedJobFiles;break;
        case DerivedJobState::Ready:mutation.mutation_type=RecordingMutationType::DerivedJobReady;break;
        case DerivedJobState::Committed:mutation.mutation_type=RecordingMutationType::DerivedJobCommitted;break;
        case DerivedJobState::Complete:mutation.mutation_type=RecordingMutationType::DerivedJobComplete;break;
        case DerivedJobState::Failed:mutation.mutation_type=RecordingMutationType::DerivedJobFailed;break;
    }
    // ReserveRecordingOrder는 기존 journal에서 발급한다. 새 예약을 동일 catalog projection에 반영한다.
    if(record.ready)for(const auto& output:record.ready->outputs) {
        const auto& s=output.segment;RecordingOrderReservationV1 order{"media-server.recording-order.v1",s.store_id,s.order_request_id,s.segment_id,s.channel_id,s.order_sequence};
        if(!journal_.ManagedOrderMatches(order,error))return false;
        orders_v2_[order.request_id]=order;
    }
    // append 전에 전체 전이를 검증한다. catalog 전체 복제나 output 부분 적용은 하지 않는다.
    if(!ApplyDerivedJobMutationLocked(mutation,error,false))return false;
    if(!AppendAndApplyLocked(std::move(mutation),error)){derived_job_state_authoritative_=false;return false;}
    return true;
}

bool RecordingCatalog::Checkpoint(std::string* error) {
    std::lock_guard lock(mu_);
    return opened_ && CanWriteLocked(error) && CheckpointLocked(false,error);
}

bool RecordingCatalog::FindDerivedJob(const std::string& id,
    std::optional<DerivedJobRecordV1>* result,std::string* error) const {
    std::lock_guard lock(mu_);
    if(result)result->reset();
    if(!result||!opened_||!derived_job_state_authoritative_||!CanWriteLocked(error))return Fail(error,"derived job snapshot 미확인");
    const auto found=derived_jobs_.find(id);
    if(found!=derived_jobs_.end())*result=found->second;
    if(error)error->clear();return true;
}
bool RecordingCatalog::SnapshotDerivedJobs(std::vector<DerivedJobRecordV1>* result,std::string* error) const {
    std::lock_guard lock(mu_);
    if(result)result->clear();
    if(!result||!opened_||!derived_job_state_authoritative_||!CanWriteLocked(error))return Fail(error,"derived job snapshot 미확인");
    for(const auto& [_,job]:derived_jobs_)result->push_back(job);
    std::sort(result->begin(),result->end(),[](const auto& a,const auto& b){return a.intent.job_id<b.intent.job_id;});
    if(error)error->clear();return true;
}
bool RecordingCatalog::SnapshotActiveDerivedJobs(std::size_t limit,std::vector<DerivedJobRecordV1>* result,bool* more,std::string* error) const {
    std::lock_guard lock(mu_);
    if(result)result->clear();if(more)*more=false;
    if(!result||!more||limit==0||limit>8||!opened_||!derived_job_state_authoritative_||!CanWriteLocked(error))return Fail(error,"derived active snapshot 미확인/상한");
    for(const auto& [_,job]:derived_jobs_)if(DerivedJobActive(job)){
        if(result->size()==limit){*more=true;break;}
        result->push_back(job);
    }
    if(error)error->clear();return true;
}
bool RecordingCatalog::DerivedJobProtectsLocked(const std::string& id) const {
    for(const auto& [_,job]:derived_jobs_)if(DerivedJobActive(job)) {
        for(const auto& source:job.intent.sources)if(source.segment.segment_id==id)return true;
        for(const auto& output:job.intent.outputs)if(output.output_id==id)return true;
    }
    return false;
}
bool RecordingCatalog::ValidateDerivedJobSourcesLocked(const DerivedJobIntentV1& job,std::string* error) const {
    const auto binding_matches=[](const RecordingSourceBindingV1& live,const RecordingSourceBindingV1& saved) {
        if(saved.file_evidence)return SerializeRecordingSourceBindingV1(live)==SerializeRecordingSourceBindingV1(saved);
        // 기존 job은 file_evidence 비소비 snapshot이다. 원본 identity의 모든 기존 필드는 동일해야 한다.
        return live.schema==saved.schema&&live.segment_id==saved.segment_id&&live.source_id==saved.source_id&&
            live.channel_id==saved.channel_id&&live.store_id==saved.store_id&&live.media_epoch_id==saved.media_epoch_id&&
            live.source_generation==saved.source_generation&&live.generation_order==saved.generation_order&&live.track_id==saved.track_id&&
            live.index_complete==saved.index_complete&&live.last_accepted_ordinal==saved.last_accepted_ordinal&&live.incomplete_reason==saved.incomplete_reason&&
            live.samples.size()==saved.samples.size()&&std::equal(live.samples.begin(),live.samples.end(),saved.samples.begin(),
                [](const auto& a,const auto& b){return a.ordinal==b.ordinal&&a.pts_ns==b.pts_ns;});
    };
    for(const auto& source:job.sources) {
        const auto segment=segments_v2_.find(source.segment.segment_id);
        const auto binding=source_bindings_.find(source.segment.segment_id);
        if(segment==segments_v2_.end()||binding==source_bindings_.end()||
           EffectiveLifecycleV2Locked(source.segment.segment_id)!=RecordingLifecycle::Finalized||
           SerializeRecordingSegmentV2(segment->second)!=SerializeRecordingSegmentV2(source.segment)||
           !binding_matches(binding->second,source.binding)||
           !media_relpaths_.count(source.segment.segment_id))return Fail(error,"derived job live source 결박 거부");
    }
    for(const auto& output:job.outputs) {
        if(segments_v2_.count(output.output_id)||segments_.count(output.output_id)||tombstones_v2_.count(output.output_id)||tombstones_.count(output.output_id))
            return Fail(error,"derived job output ID 재사용 거부");
    }
    return true;
}
bool RecordingCatalog::ApplyDerivedJobMutationLocked(const RecordingMutationV1& mutation,std::string* error,bool apply) {
    DerivedJobRecordV1 record;
    if(!journal_.managed_||!options_.enable_v2_storage||!ParseDerivedJobRecord(mutation.payload_json,&record,error)||
       record.intent.job_id!=mutation.entity_id)return Fail(error,"derived job mutation 계약 거부");
    const auto type=mutation.mutation_type;
    const bool initial=type==RecordingMutationType::DerivedJobIntent;
    const bool files=type==RecordingMutationType::DerivedJobFiles;
    const bool ready=type==RecordingMutationType::DerivedJobReady;
    const bool committed=type==RecordingMutationType::DerivedJobCommitted;
    const bool complete=type==RecordingMutationType::DerivedJobComplete;
    const bool failed=type==RecordingMutationType::DerivedJobFailed;
    if(((initial||files)&&record.state!=DerivedJobState::Intent)||(ready&&record.state!=DerivedJobState::Ready)||
       (committed&&record.state!=DerivedJobState::Committed)||(complete&&record.state!=DerivedJobState::Complete)||
       (failed&&record.state!=DerivedJobState::Failed))return Fail(error,"derived job mutation state 불일치");
    const auto old=derived_jobs_.find(mutation.entity_id);
    if(old==derived_jobs_.end()) {
        if(!initial||!record.files.empty()||record.ready||!ValidateDerivedJobSourcesLocked(record.intent,error))
            return Fail(error,"derived job 최초 전이 거부");
        if(apply)derived_jobs_.emplace(mutation.entity_id,std::move(record));return true;
    }
    const auto& prior=old->second;
    if(SerializeDerivedJobIntent(prior.intent)!=SerializeDerivedJobIntent(record.intent))return Fail(error,"derived job immutable 충돌");
    if(SerializeDerivedJobRecord(prior)==SerializeDerivedJobRecord(record))return true;
    if(initial)return Fail(error,"derived job Intent 재기록 충돌");
    for(std::size_t i=0;i<prior.files.size();++i)
        if(i>=record.files.size()||SerializeDerivedJobFile(prior.files[i])!=SerializeDerivedJobFile(record.files[i]))
            return Fail(error,"derived job receipt 변경");
    const auto prior_state=prior.state;
    if(files) {
        if(prior_state!=DerivedJobState::Intent||record.files.size()!=prior.files.size()+1)return Fail(error,"derived job receipt 전이 거부");
    } else {
        if(prior.files.size()!=record.files.size())return Fail(error,"derived job receipt 누락");
        if((ready&&prior_state!=DerivedJobState::Intent)||(committed&&prior_state!=DerivedJobState::Ready)||
           (complete&&prior_state!=DerivedJobState::Committed)||(failed&&prior_state!=DerivedJobState::Intent))
            return Fail(error,"derived job 상태 전이 거부");
        if(prior.ready&&(!record.ready||SerializeDerivedJobReady(*prior.ready)!=SerializeDerivedJobReady(*record.ready)))
            return Fail(error,"derived job Ready 변경");
    }
    if(ready||committed) {
        if(!ValidateDerivedJobSourcesLocked(record.intent,error))return false;
        for(std::size_t i=0;i<record.ready->outputs.size();++i) {
            const auto& s=record.ready->outputs[i].segment;
            const auto order=orders_v2_.find(s.order_request_id);
            if(order==orders_v2_.end()||order->second.store_id!=s.store_id||order->second.segment_id!=s.segment_id||
               order->second.channel_id!=s.channel_id||order->second.sequence!=s.order_sequence)
                return Fail(error,"derived output 예약 결박 오류");
        }
    }
    if(!apply)return true;
    if(committed) {
        // 하나의 mutation 아래 전체 결과와 provenance/job state를 함께 적용한다.
        for(std::size_t i=0;i<record.ready->outputs.size();++i) {
            const auto& s=record.ready->outputs[i].segment;
            segments_v2_.emplace(s.segment_id,s);
            media_relpaths_[s.segment_id]=record.intent.outputs[i].final_relpath;
        }
    }
    old->second=std::move(record);return true;
}
bool RecordingCatalog::BeginDerivedJobIntent(const DerivedJobIntentV1& value,bool* inserted,std::string* error) {
    std::lock_guard lock(mu_);if(inserted)*inserted=false;
    if(!opened_||!journal_.managed_||!derived_job_state_authoritative_||!CanWriteLocked(error)||!ValidateDerivedJobIntent(value,error))return false;
    const auto old=derived_jobs_.find(value.job_id);
    if(old!=derived_jobs_.end()) {
        auto same=value;same.created_at_ms=old->second.intent.created_at_ms;
        if(SerializeDerivedJobIntent(same)!=SerializeDerivedJobIntent(old->second.intent))return Fail(error,"derived job immutable 충돌");
        if(error)error->clear();return true;
    }
    if(!ValidateDerivedJobSourcesLocked(value,error))return false;
    DerivedJobRecordV1 record;record.intent=value;
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::DerivedJobIntent;
    mutation.entity_id=value.job_id;mutation.payload_json=SerializeDerivedJobRecord(record);
    if(mutation.payload_json.empty())return Fail(error,"derived job envelope 상한");
    if(!AppendAndApplyLocked(std::move(mutation),error)){derived_job_state_authoritative_=false;return false;}
    if(inserted)*inserted=true;return true;
}
bool RecordingCatalog::FailDerivedJobAfterCleanup(const std::string& id,const std::string& attempt,
    const std::string& reason,std::int64_t cleaned,std::string* error) {
    std::lock_guard lock(mu_);
    if(derived_service_owner_)return Fail(error,"derived service 실행 소유 중 외부 terminal release 거부");
    if(!opened_||!derived_job_state_authoritative_||!CanWriteLocked(error))return Fail(error,"derived job cleanup snapshot 미확인");
    const auto found=derived_jobs_.find(id);
    if(found==derived_jobs_.end()||found->second.intent.attempt_id!=attempt)return Fail(error,"derived job cleanup 소유권 거부");
    auto record=found->second;record.state=DerivedJobState::Failed;record.failure_reason=reason;record.cleaned_at_ms=cleaned;
    const auto payload=SerializeDerivedJobRecord(record);
    if(payload.empty())return Fail(error,"derived job cleanup payload 거부");
    if(found->second.state==DerivedJobState::Failed)return SerializeDerivedJobRecord(found->second)==payload;
    if(found->second.state!=DerivedJobState::Intent)return Fail(error,"derived job cleanup 전이 거부");
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::DerivedJobFailed;mutation.entity_id=id;mutation.payload_json=payload;
    if(!AppendAndApplyLocked(std::move(mutation),error)){derived_job_state_authoritative_=false;return false;}return true;
}

std::vector<std::string> RecordingCatalog::ProjectionSignatureLocked() const {
    std::vector<std::string> result;
    const auto add=[&](const std::string& type,const std::string& key,const std::string& value){
        result.push_back(type+std::to_string(key.size())+":"+key+value);
    };
    for(const auto& id:mutation_ids_)add("id",id,"");
    for(const auto& [id,v]:segments_)add("v1",id,SerializeRecordingSegmentV1(v));
    for(const auto& [id,v]:segments_v2_)add("v2",id,SerializeRecordingSegmentV2(v));
    for(const auto& [id,v]:source_bindings_)add("source-binding",id,SerializeRecordingSourceBindingV1(v));
    for(const auto& [id,v]:derived_jobs_)add("derived-job",id,SerializeDerivedJobRecord(v));
    for(const auto& [id,v]:consumer_references_)add("consumer-reference",id,SerializeRecordingConsumerReferenceV1(v));
    for(const auto& id:derived_accepted_references_)add("derived-reference-accepted",id,id);
    for(const auto& [id,v]:referenced_observations_)add("referenced-observation",id,SerializeReferencedObservationV1(v));
    for(const auto& [id,v]:states_v2_)add("v2-state",id,SerializeRecordingSegmentStateV2(v));
    for(const auto& [id,v]:tombstones_v2_)add("v2-deleted",id,SerializeRecordingTombstoneV2(v));
    for(const auto& [id,v]:orders_v2_) {
        add("order-store",id,v.store_id);add("order-segment",id,v.segment_id);
        add("order-channel",id,v.channel_id);add("order-sequence",id,std::to_string(v.sequence));
    }
    for(const auto& [id,v]:event_links_)add("link",id,SerializeEventRecordingLinkV1(v));
    for(const auto& [id,v]:observations_)add("obs1",id,SerializeAnalysisObservationV1(v));
    for(const auto& [id,v]:observations_v2_)add("obs2",id,SerializeAnalysisObservationV2(v));
    for(const auto& [id,v]:tombstones_)add("deleted",id,SerializeRecordingTombstoneV1(v));
    for(const auto& [id,v]:media_relpaths_)add("path",id,v);
    for(const auto& [id,v]:deletion_reasons_)add("reason",id,v);
    std::sort(result.begin(),result.end());return result;
}

bool RecordingCatalog::CheckpointLocked(bool recover_only,std::string* error) {
    if(!journal_.managed_||!options_.enable_v2_storage||!journal_.OwnsCatalog(this))
        return Fail(error,"managed checkpoint 소유권/지원 없음");
    const auto original=journal_.Replay();
    if(original.io_error_count||original.corrupt_line_count||original.unsupported_record_count||original.truncated_tail_count)
        return Fail(error,"checkpoint 원장 불완전");
    std::vector<RecordingMutationV1> candidate;
    if(!journal_.PrepareCheckpoint(this,&candidate,error))return false;
    RecordingCatalog before(journal_,options_),after(journal_,options_);
    for(const auto& m:original.mutations)if(!before.ApplyMutationLocked(m,false,error))return false;
    const bool identical=detail::SameCheckpointSequence(original.mutations,candidate);
    // 원본 semantic replay는 위에서 항상 수행한다. byte-exact 같은 입력만
    // 동일 projection 결과를 재사용하며 다른 후보는 기존 양방향 검증을 유지한다.
    if(!identical){
        for(const auto& m:candidate)if(!after.ApplyMutationLocked(m,false,error))return false;
        if(before.ProjectionSignatureLocked()!=after.ProjectionSignatureLocked())return Fail(error,"checkpoint 투영 불일치");
    }
    return journal_.CommitCheckpoint(this,candidate,recover_only,error);
}

bool RecordingCatalog::OpenLocked(std::string* error) {
    const auto replay = journal_.Replay();
    if (replay.io_error_count != 0) return Fail(error, "journal replay I/O 오류로 catalog open 거부");
    if (replay.unsupported_record_count != 0) return Fail(error, "미지원 journal record로 catalog open 거부");
    if (!PreflightV2Locked(replay,error)) return false;
    if(journal_.managed_&&journal_.CheckpointPending()&&!CheckpointLocked(true,error))return false;
    recovery_report_.corrupt_line_count = replay.corrupt_line_count;
    recovery_report_.truncated_tail_count = replay.truncated_tail_count;
    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {
        const auto& mutation = replay.mutations[ordinal];
        const bool already_applied = mutation_ids_.count(mutation.mutation_id) != 0;
        std::string apply_error;
        if (!ApplyMutationLocked(mutation, true, &apply_error)) ++recovery_report_.projection_error_count;
        else {
            ++recovery_report_.replayed_mutation_count;
            if (!already_applied && (mutation.mutation_type == RecordingMutationType::SegmentFinalized ||
                mutation.mutation_type == RecordingMutationType::CorruptionDetected ||
                mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
                mutation.mutation_type == RecordingMutationType::SegmentV2BoundFinalized ||
                mutation.mutation_type == RecordingMutationType::SegmentV2State ||
                mutation.mutation_type == RecordingMutationType::SegmentV2Deleted))
                accepted_segment_state_replay_ordinals_.insert(ordinal);
        }
    }
    if (options_.prefer_sqlite && OpenSqliteLocked(error)) {
        catalog_mode_ = "sqlite-primary";
        if (!RebuildSqliteLocked(error)) return false;
    } else {
        CloseSqliteLocked();
        catalog_mode_ = "jsonl-fallback";
        if (error != nullptr) error->clear();
    }
    if (!RecoverWriterCleanupMarkersLocked(error)) return false;
    // JSONL replay에는 일시 hold count를 직접 쓰지 않는다. terminal release 단계가
    // 아직 소유한다고 명시한 output/source hold만 link에서 재구성한다.
    const auto restore_hold = [&](const std::string& segment_id) {
        constexpr auto kMaxPersistentHoldCount =
            static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
        const std::uint64_t current = hold_counts_[segment_id];
        if (current >= kMaxPersistentHoldCount) {
            return Fail(error, "pending event hold_count 복구가 저장 범위를 넘음");
        }
        const std::uint64_t next = current + 1;
        hold_counts_[segment_id] = next;
#if MEDIA_SERVER_USE_SQLITE3
        if (sqlite_db_ != nullptr) {
            sqlite3_stmt* statement = nullptr;
            if (sqlite3_prepare_v2(sqlite_db_,
                                   "UPDATE recording_segments SET hold_count=? WHERE segment_id=?",
                                   -1, &statement, nullptr) != SQLITE_OK) {
                return Fail(error, sqlite3_errmsg(sqlite_db_));
            }
            sqlite3_bind_int64(statement, 1, static_cast<sqlite3_int64>(next));
            BindText(statement, 2, segment_id);
            const bool updated = sqlite3_step(statement) == SQLITE_DONE &&
                                 sqlite3_changes(sqlite_db_) == 1;
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement);
            if (!updated) return Fail(error, message);
        }
#endif
        return true;
    };
    for (const auto& [_, link] : event_links_) {
        if (link.status != EventRecordingLinkStatus::Pending ||
            !link.derived_segment_id.has_value()) continue;
        const auto segment = segments_.find(*link.derived_segment_id);
        if (segment == segments_.end() ||
            segment->second.lifecycle != RecordingLifecycle::Finalized ||
            segment->second.retention_class != RecordingRetentionClass::Event) continue;
        const bool output_hold_active =
            link.completeness_reason == "event-catalog-finalize-recovery-pending" ||
            link.completeness_reason == "event-marker-cleanup-recovery-pending" ||
            link.completeness_reason == "event-terminal-release-recovery-pending" ||
            link.completeness_reason == "event-terminal-output-release-pending";
        const bool source_hold_active = output_hold_active ||
            link.completeness_reason == "event-terminal-source-release-pending";
        if (output_hold_active && !restore_hold(segment->first)) return false;
        if (source_hold_active) {
            for (const auto& overlap : link.ordered_overlaps) {
                const auto source = segments_.find(overlap.segment_id);
                if (source == segments_.end() ||
                    source->second.lifecycle != RecordingLifecycle::Finalized ||
                    source->second.retention_class != RecordingRetentionClass::Continuous) {
                    return Fail(error, "pending event source hold 복구 대상이 유효하지 않음");
                }
                if (!restore_hold(source->first)) return false;
            }
        }
    }
    opened_ = true;
    return true;
}

std::string RecordingCatalog::catalog_mode() const {
    std::lock_guard lock(mu_);
    return catalog_mode_;
}

RecordingCatalogRecoveryReport RecordingCatalog::recovery_report() const {
    std::lock_guard lock(mu_);
    return recovery_report_;
}

bool RecordingCatalog::RecoverWriterCleanupMarkersLocked(std::string* error) {
    constexpr const char* kCleanupSuffix = ".cleanup-pending";
    std::vector<std::filesystem::path> markers;
    std::error_code scan_error;
    if (!std::filesystem::exists(options_.media_root, scan_error)) {
        if (scan_error) return Fail(error, "writer cleanup marker root 확인 실패");
        return true;
    }
    for (std::filesystem::recursive_directory_iterator iterator(
             options_.media_root, scan_error), end;
         !scan_error && iterator != end;
         iterator.increment(scan_error)) {
        const auto& entry = *iterator;
        const std::string path = entry.path().string();
        if (entry.is_regular_file(scan_error) && !scan_error &&
            path.size() > std::char_traits<char>::length(kCleanupSuffix) &&
            path.compare(path.size() - std::char_traits<char>::length(kCleanupSuffix),
                         std::char_traits<char>::length(kCleanupSuffix),
                         kCleanupSuffix) == 0) {
            markers.push_back(entry.path());
        }
    }
    if (scan_error) return Fail(error, "writer cleanup marker 순회 실패");

    for (const auto& marker : markers) {
        std::filesystem::path final_path = marker;
        std::string final_text = final_path.string();
        final_text.resize(final_text.size() - std::char_traits<char>::length(kCleanupSuffix));
        final_path = final_text;
        if (final_path.extension() != ".mp4" && final_path.extension() != ".ts" &&
            final_path.extension() != ".webm") {
            ++recovery_report_.writer_cleanup_error_count;
            return Fail(error, "writer cleanup marker 대상 확장자가 유효하지 않음");
        }
        const std::string segment_id = final_path.stem().string();
        const auto known = segments_.find(segment_id);
        const auto known_path = media_relpaths_.find(segment_id);
        const auto relative_final = final_path.lexically_relative(options_.media_root);
        const bool tracked_final =
            known != segments_.end() && known_path != media_relpaths_.end() &&
            known_path->second == relative_final.generic_string() &&
            (known->second.lifecycle == RecordingLifecycle::Finalized ||
             known->second.lifecycle == RecordingLifecycle::DeletionPending);
        const auto marker_binding =
            ReadCleanupMarkerBinding(marker, final_path.filename().string());
        if (marker_binding.ownership == CleanupMarkerOwnership::Invalid) {
            ++recovery_report_.writer_cleanup_error_count;
            return Fail(error, "writer cleanup marker 내용 또는 소유권이 유효하지 않음");
        }
        bool preserve_ready = false;
        if (!PreserveFinalizeReadyPartial(options_.media_root, relative_final,
                                          marker_binding.partial_name, &preserve_ready, error)) {
            ++recovery_report_.writer_cleanup_error_count;
            return false;
        }
        if (preserve_ready) continue;
        std::string cleanup_error;
        if (marker_binding.ownership == CleanupMarkerOwnership::OwnedPartial) {
            const auto owned_partial = marker.parent_path() / marker_binding.partial_name;
            if (!RemoveContainedMediaFile(
                    options_.media_root, owned_partial, &cleanup_error, {}, true)) {
                ++recovery_report_.writer_cleanup_error_count;
                return Fail(error, cleanup_error.empty()
                                       ? "writer 소유 partial 제거 실패"
                                       : cleanup_error);
            }
        } else if (!tracked_final) {
            // v1 marker만으로 final/partial 소유권을 증명할 수 없다. 둘 다 삭제하지 않고
            // orphan 진단에 남긴다. v2 event marker만 nonce partial을 좁게 삭제한다.
        }
        if (!RemoveContainedMediaFile(options_.media_root, marker, &cleanup_error)) {
            ++recovery_report_.writer_cleanup_error_count;
            return Fail(error, cleanup_error.empty()
                                   ? "writer cleanup marker 제거 실패"
                                   : cleanup_error);
        }
        ++recovery_report_.writer_cleanup_recovered_count;
    }
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingCatalog::ApplyMutationLocked(const RecordingMutationV1& mutation,
                                           bool count_duplicate,
                                           std::string* error) {
    const bool segment_state = mutation.mutation_type == RecordingMutationType::ReferencedObservationPut ||
                               mutation.mutation_type == RecordingMutationType::DerivedReferenceAccepted ||
                               IsDerivedJobMutation(mutation.mutation_type) ||
                               mutation.mutation_type == RecordingMutationType::ConsumerReferencePut ||
                               mutation.mutation_type == RecordingMutationType::SegmentFinalized ||
                               mutation.mutation_type == RecordingMutationType::SegmentV2State ||
                               mutation.mutation_type == RecordingMutationType::SegmentV2Deleted ||
                               mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
                               mutation.mutation_type == RecordingMutationType::SegmentV2BoundFinalized ||
                               mutation.mutation_type == RecordingMutationType::CorruptionDetected;
    if (!mutation_ids_.insert(mutation.mutation_id).second) {
        if (segment_state) {
            const auto accepted = accepted_segment_state_mutations_.find(mutation.mutation_id);
            if (accepted == accepted_segment_state_mutations_.end() ||
                accepted->second != SerializeRecordingMutationV1(mutation))
                return Fail(error, "segment state mutation ID envelope 불일치");
        }
        if (count_duplicate) ++recovery_report_.duplicate_mutation_count;
        if (error != nullptr) error->clear();
        return true;
    }
    bool ok = true;
    switch (mutation.mutation_type) {
        case RecordingMutationType::DerivedJobIntent:
        case RecordingMutationType::DerivedJobFiles:
        case RecordingMutationType::DerivedJobReady:
        case RecordingMutationType::DerivedJobCommitted:
        case RecordingMutationType::DerivedJobComplete:
        case RecordingMutationType::DerivedJobFailed:
            ok=ApplyDerivedJobMutationLocked(mutation,error);
            break;
        case RecordingMutationType::ReferencedObservationPut: {
            ReferencedObservationV1 pair;
            ok=options_.enable_v2_storage&&ParseReferencedObservationV1(mutation.payload_json,&pair,error)&&
               pair.observation.observation_id==mutation.entity_id;
            const auto old=referenced_observations_.find(mutation.entity_id);
            if(ok&&old!=referenced_observations_.end())ok=MergeReferenced(old->second,&pair,error);
            if(ok)referenced_observations_[mutation.entity_id]=std::move(pair);
            break;
        }
        case RecordingMutationType::DerivedReferenceAccepted:
        case RecordingMutationType::ConsumerReferencePut: {
            ingress::StrictJsonObjectDocument payload;
            RecordingConsumerReferenceV1 reference;
            const auto json=ObjectField(mutation.payload_json,"reference");
            ok=options_.enable_v2_storage&&
               ingress::ParseStrictJsonObjectDocument(mutation.payload_json,&payload,error)&&payload.members.size()==1&&
               json&&ParseRecordingConsumerReferenceV1(*json,&reference,error)&&reference.reference_id==mutation.entity_id;
            if(ok) {
                const auto old=consumer_references_.find(reference.reference_id);
                if(mutation.mutation_type==RecordingMutationType::DerivedReferenceAccepted) {
                    ok=old!=consumer_references_.end()&&reference.kind=="event"&&
                       SerializeRecordingConsumerReferenceV1(old->second)==SerializeRecordingConsumerReferenceV1(reference);
                    if(ok)derived_accepted_references_.insert(reference.reference_id);
                } else {
                    ok=old==consumer_references_.end()||SerializeRecordingConsumerReferenceV1(old->second)==SerializeRecordingConsumerReferenceV1(reference);
                    if(ok)consumer_references_.emplace(reference.reference_id,std::move(reference));
                }
            }
            if(!ok)Fail(error,"consumer reference payload/identity 충돌");
            break;
        }
        case RecordingMutationType::SegmentFinalized: {
            const auto segment_json = ObjectField(mutation.payload_json, "segment");
            const auto relpath = StringField(mutation.payload_json, "mediaRelpath");
            RecordingSegmentV1 segment;
            ok = segment_json && relpath && IsSafeMediaRelpath(*relpath) &&
                 ParseRecordingSegmentV1(*segment_json, &segment, error);
            if (ok && (segment.segment_id != mutation.entity_id ||
                       segment.lifecycle != RecordingLifecycle::Finalized)) {
                ok = Fail(error, "finalized envelope entity/lifecycle 불일치");
            }
            if (!ok && error != nullptr && error->empty()) {
                *error = "recording mediaRelpath가 안전한 상대 경로가 아님";
            }
            if (ok && tombstones_.find(segment.segment_id) != tombstones_.end()) {
                ok = Fail(error, "tombstone segment ID 재사용 금지");
            }
            if (ok && segments_v2_.count(segment.segment_id)) ok=Fail(error,"V1/V2 segment ID 충돌");
            if (ok) {
                const auto existing = segments_.find(segment.segment_id);
                if (existing != segments_.end()) {
                    auto identity = existing->second;
                    identity.lifecycle = RecordingLifecycle::Finalized;
                    const auto path = media_relpaths_.find(segment.segment_id);
                    if (path == media_relpaths_.end() || path->second != *relpath ||
                        SerializeRecordingSegmentV1(identity) != SerializeRecordingSegmentV1(segment)) {
                        ok = Fail(error, "finalized segment 최초 identity 불일치");
                    }
                    // 동일 identity는 재등록하지 않아 Corrupt/DeletionPending을 되살리지 않는다.
                } else {
                    segments_[segment.segment_id] = segment;
                    media_relpaths_[segment.segment_id] = *relpath;
                }
            }
            break;
        }
        case RecordingMutationType::EventLinkReceipt:
            ok=journal_.managed_&&options_.enable_v2_storage;
            if(!ok)Fail(error,"receipt managed 지원 필요");
            break;
        case RecordingMutationType::EventLinkCreated: {
            const auto link_json = ObjectField(mutation.payload_json, "link");
            EventRecordingLinkV1 link;
            ok = link_json && ParseEventRecordingLinkV1(*link_json, &link, error);
            if (ok) {
                for (const auto& [existing_link_id, existing] : event_links_) {
                    if (existing.event_id == link.event_id &&
                        existing_link_id != link.link_id) {
                        ok = Fail(error, "같은 event_id의 recording link ID 불일치");
                        break;
                    }
                }
            }
            if (ok) ok = ValidateEventLinkReferencesLocked(link, error);
            if (ok) event_links_[link.link_id] = link;
            break;
        }
        case RecordingMutationType::ObservationPut: {
            const auto observation_json = ObjectField(mutation.payload_json, "observation");
            AnalysisObservationV1 observation;
            ok = observation_json && ParseAnalysisObservationV1(*observation_json, &observation, error);
            if (ok && segments_.find(observation.frame_locator.segment_id) == segments_.end()) {
                ok = Fail(error, "observation segment foreign key 위반");
            }
            if (ok) observations_[observation.observation_id] = observation;
            break;
        }
        case RecordingMutationType::ObservationV2Put: {
            const auto json = ObjectField(mutation.payload_json, "observation");
            AnalysisObservationV2 observation;
            ok = json && ParseAnalysisObservationV2(*json, &observation, error);
            if (ok && observation.observation_id != mutation.entity_id)
                ok = Fail(error, "observation-v2-entity-mismatch");
            const auto previous = observations_v2_.find(observation.observation_id);
            if (ok && previous != observations_v2_.end())
                ok = MergeObservation(previous->second, &observation, error);
            if (ok) observations_v2_[observation.observation_id] = std::move(observation);
            break;
        }
        case RecordingMutationType::DeletionRequested: {
            const auto it = segments_.find(mutation.entity_id);
            const auto reason = StringField(mutation.payload_json, "reason");
            ok = it != segments_.end();
            if (ok) {
                it->second.lifecycle = RecordingLifecycle::DeletionPending;
                deletion_reasons_[mutation.entity_id] =
                    reason.value_or("manual-corrupt-cleanup");
            }
            else Fail(error, "삭제 요청 segment가 없음");
            break;
        }
        case RecordingMutationType::DeletionCompleted: {
            const auto tombstone_json = ObjectField(mutation.payload_json, "tombstone");
            RecordingTombstoneV1 tombstone;
            ok = tombstone_json && ParseRecordingTombstoneV1(*tombstone_json, &tombstone, error);
            if (ok) {
                tombstones_[tombstone.segment_id] = tombstone;
                const auto it = segments_.find(tombstone.segment_id);
                if (it != segments_.end()) it->second.lifecycle = RecordingLifecycle::Deleted;
                media_relpaths_.erase(tombstone.segment_id);
                hold_counts_.erase(tombstone.segment_id);
                deletion_reasons_.erase(tombstone.segment_id);
            }
            break;
        }
        case RecordingMutationType::CorruptionDetected: {
            const auto reason = StringField(mutation.payload_json, "reason");
            const auto it = segments_.find(mutation.entity_id);
            ok = reason && (*reason == "missing-media" || *reason == "checksum-mismatch" ||
                            *reason == "container-invalid" || *reason == "derived-media-missing") &&
                 it != segments_.end();
            if (!ok) Fail(error, "corruption known entity/reason 오류");
            else if (it->second.lifecycle == RecordingLifecycle::Finalized) {
                it->second.lifecycle = RecordingLifecycle::Corrupt;
            }
            // 이미 Corrupt와 삭제 pending/completed 상태는 단조적으로 보존한다.
            break;
        }
        case RecordingMutationType::RecordingOrderReserved: {
            RecordingOrderReservationV1 order;
            ok = ParseRecordingOrderReservationV1(mutation.payload_json, &order, error) &&
                 order.request_id == mutation.mutation_id && order.segment_id == mutation.entity_id;
            if (ok) orders_v2_[order.request_id]=order;
            break;
        }
        case RecordingMutationType::SegmentV2Finalized:
        case RecordingMutationType::SegmentV2BoundFinalized: {
            const bool bound=mutation.mutation_type==RecordingMutationType::SegmentV2BoundFinalized;
            ingress::StrictJsonObjectDocument payload;
            const bool parsed=ingress::ParseStrictJsonObjectDocument(mutation.payload_json,&payload,error);
            const auto segment_json=ingress::StrictJsonObjectField(payload,"segment");
            const auto relative=ingress::StrictJsonStringField(payload,"mediaRelpath");
            RecordingSegmentV2 v;
            ok=parsed && payload.members.size()==(bound?3U:2U) &&
               segment_json && relative && ParseRecordingSegmentV2(*segment_json,&v,error) && v.segment_id==mutation.entity_id &&
               ValidateV2Locked(v,*relative,error);
            const auto order=orders_v2_.find(v.order_request_id);
            if (ok && (order==orders_v2_.end() || order->second.store_id!=v.store_id || order->second.segment_id!=v.segment_id ||
                order->second.channel_id!=v.channel_id || order->second.sequence!=v.order_sequence)) ok=Fail(error,"V2 예약 결박 오류");
            RecordingSourceBindingV1 binding;
            if(ok&&bound) {
                const auto json=ingress::StrictJsonObjectField(payload,"sourceBinding");
                ok=json&&ParseRecordingSourceBindingV1(*json,&binding,error)&&
                   !segments_v2_.count(v.segment_id)&&ValidateRecordingSourceBindingForSegment(binding,v,error);
            }
            if(ok&&!bound&&source_bindings_.count(v.segment_id))ok=Fail(error,"bound downgrade 거부");
            if (ok) {segments_v2_.emplace(v.segment_id,v);media_relpaths_[v.segment_id]=*relative;
                if(bound)source_bindings_.emplace(v.segment_id,std::move(binding));}
            break;
        }
        case RecordingMutationType::SegmentV2State: {
            RecordingSegmentStateV2 state;
            ok=ParseRecordingSegmentStateV2(mutation.payload_json,&state,error) &&
               state.segment_id==mutation.entity_id && segments_v2_.count(state.segment_id)&&!DerivedJobProtectsLocked(state.segment_id);
            if(ok) {
                const auto old=EffectiveLifecycleV2Locked(state.segment_id);
                const auto previous=states_v2_.find(state.segment_id);
                const bool same=previous!=states_v2_.end() &&
                    SerializeRecordingSegmentStateV2(previous->second)==SerializeRecordingSegmentStateV2(state);
                ok=old!=RecordingLifecycle::Deleted && (same || old==RecordingLifecycle::Finalized ||
                    (old==RecordingLifecycle::Corrupt && state.lifecycle==RecordingLifecycle::DeletionPending &&
                     state.reason=="manual-corrupt-cleanup"));
                if(ok) {states_v2_[state.segment_id]=state;
                    if(state.lifecycle==RecordingLifecycle::DeletionPending)deletion_reasons_[state.segment_id]=state.reason;}
            }
            if(!ok)Fail(error,"V2 상태 전이 거부");
            break;
        }
        case RecordingMutationType::SegmentV2Deleted: {
            RecordingTombstoneV2 tombstone;
            ok=ParseRecordingTombstoneV2(mutation.payload_json,&tombstone,error) &&
               tombstone.segment.segment_id==mutation.entity_id&&!DerivedJobProtectsLocked(mutation.entity_id);
            const auto segment=segments_v2_.find(mutation.entity_id);
            const auto old=tombstones_v2_.find(mutation.entity_id);
            if(ok && old!=tombstones_v2_.end()) {
                ok=SerializeRecordingTombstoneV2(old->second)==SerializeRecordingTombstoneV2(tombstone);
            } else if(ok) {
                ok=segment!=segments_v2_.end() && EffectiveLifecycleV2Locked(mutation.entity_id)==RecordingLifecycle::DeletionPending &&
                   SerializeRecordingSegmentV2(segment->second)==SerializeRecordingSegmentV2(tombstone.segment) &&
                   deletion_reasons_[mutation.entity_id]==tombstone.deletion_reason;
                if(ok) {tombstones_v2_[mutation.entity_id]=tombstone;hold_counts_.erase(mutation.entity_id);}
            }
            if(!ok)Fail(error,"V2 삭제 완료 전이 거부");
            break;
        }
        case RecordingMutationType::Unknown:
            ok = Fail(error, "unknown mutation");
            break;
    }
    if (!ok) mutation_ids_.erase(mutation.mutation_id);
    else if (segment_state) accepted_segment_state_mutations_.emplace(
        mutation.mutation_id, SerializeRecordingMutationV1(mutation));
    return ok;
}

bool RecordingCatalog::AppendAndApplyLocked(RecordingMutationV1 mutation, std::string* error) {
    if(!CanWriteLocked(error))return false;
    mutation.mutation_id = mutation.mutation_id.empty() ? NextMutationId() : mutation.mutation_id;
    mutation.occurred_at_ms = mutation.occurred_at_ms == 0 ? NowMs() : mutation.occurred_at_ms;
    if (!journal_.AppendOwned(mutation, this, error)) return false;
    if (!ApplyMutationLocked(mutation, false, error)) return false;
    if (sqlite_db_ != nullptr) {
        std::string projection_error;
        if (!ProjectMutationSqliteLocked(mutation, &projection_error)) {
            ++recovery_report_.projection_error_count;
            CloseSqliteLocked();
            catalog_mode_ = "jsonl-fallback";
            if (error != nullptr) error->clear();
        }
    }
    return !journal_.CheckpointDue(this)||CheckpointLocked(false,error);
}

bool RecordingCatalog::PreflightV2Locked(const RecordingJournalReplayResult& replay,std::string* error,
                                       const RecordingSegmentV2* candidate,const std::string& relative,
                                       const RecordingSourceBindingV1* binding) const {
    bool orders=false,v2=false;
    std::unordered_set<std::string> v2_ids;
    for(const auto& m:replay.mutations) {
        if(m.mutation_type==RecordingMutationType::DerivedReferenceAccepted||m.mutation_type==RecordingMutationType::ConsumerReferencePut||m.mutation_type==RecordingMutationType::ReferencedObservationPut||
           IsDerivedJobMutation(m.mutation_type))v2=true;
        if(m.mutation_type==RecordingMutationType::EventLinkReceipt&&(!journal_.managed_||!options_.enable_v2_storage))
            return Fail(error,"receipt managed 지원 필요");
        orders=orders||m.mutation_type==RecordingMutationType::RecordingOrderReserved;
        if(m.mutation_type==RecordingMutationType::SegmentV2Finalized ||
           m.mutation_type==RecordingMutationType::SegmentV2BoundFinalized ||
           m.mutation_type==RecordingMutationType::SegmentV2State ||
           m.mutation_type==RecordingMutationType::SegmentV2Deleted){v2=true;v2_ids.insert(m.entity_id);}
    }
    if(v2&&!options_.enable_v2_storage)return Fail(error,"V2 storage opt-in 필요");
    if(!(options_.enable_v2_storage||orders||v2))return true;
    if(replay.io_error_count||replay.unsupported_record_count||replay.corrupt_line_count||replay.truncated_tail_count)
        return Fail(error,"V2/order 원장 불완전 상태");
    std::vector<RecordingOrderReservationV1> reservations;
    if(!ValidateRecordingOrderHistory(replay.mutations,&reservations,error))return false;
    // Open 실패가 live memory/SQLite/cleanup에 부분 상태를 남기지 않도록 임시 투영한다.
    RecordingCatalog scratch(journal_,options_);
    std::unordered_map<std::string,RecordingMutationV1> seen;
    for(const auto& m:replay.mutations) {
        const auto old=seen.find(m.mutation_id);
        if(old!=seen.end()&&(m.mutation_type==RecordingMutationType::ReferencedObservationPut||
           m.mutation_type==RecordingMutationType::DerivedReferenceAccepted||
           old->second.mutation_type==RecordingMutationType::DerivedReferenceAccepted||
           IsDerivedJobMutation(m.mutation_type)||
           IsDerivedJobMutation(old->second.mutation_type)||
           old->second.mutation_type==RecordingMutationType::ReferencedObservationPut||m.mutation_type==RecordingMutationType::ConsumerReferencePut||
           old->second.mutation_type==RecordingMutationType::ConsumerReferencePut||m.mutation_type==RecordingMutationType::SegmentV2Finalized||
           m.mutation_type==RecordingMutationType::SegmentV2BoundFinalized||
           old->second.mutation_type==RecordingMutationType::SegmentV2BoundFinalized||
           old->second.mutation_type==RecordingMutationType::SegmentV2Finalized)&&
           SerializeRecordingMutationV1(old->second)!=SerializeRecordingMutationV1(m))return Fail(error,"V2 mutation ID 충돌");
        seen.emplace(m.mutation_id,m);
        const bool accepted=scratch.ApplyMutationLocked(m,false,error);
        if(!accepted&&(journal_.managed_||m.mutation_type==RecordingMutationType::DerivedReferenceAccepted||m.mutation_type==RecordingMutationType::ReferencedObservationPut||m.mutation_type==RecordingMutationType::ConsumerReferencePut||m.mutation_type==RecordingMutationType::SegmentV2Finalized||v2_ids.count(m.entity_id)))return false;
    }
    if(candidate) {
        if(binding ? !scratch.ValidateBoundLocked(*candidate,*binding,relative,error) :
           (!scratch.ValidateV2Locked(*candidate,relative,error)||scratch.source_bindings_.count(candidate->segment_id)))return false;
        const auto order=scratch.orders_v2_.find(candidate->order_request_id);
        if(order==scratch.orders_v2_.end()||order->second.store_id!=candidate->store_id||
           order->second.segment_id!=candidate->segment_id||order->second.channel_id!=candidate->channel_id||
           order->second.sequence!=candidate->order_sequence)return Fail(error,"V2 예약 없음/tuple 불일치");
    }
    if(error)error->clear();return true;
}

bool RecordingCatalog::ValidateV2Locked(const RecordingSegmentV2& v,const std::string& relative,std::string* error) const {
    if(!options_.enable_v2_storage||!ValidateRecordingSegmentV2(v,error)||!IsSafeMediaRelpath(relative))
        return Fail(error,"V2 opt-in/metadata/path 오류");
    if(tombstones_.count(v.segment_id)||segments_.count(v.segment_id))return Fail(error,"V2 삭제/V1 ID 충돌");
    const auto found=segments_v2_.find(v.segment_id);
    if(found!=segments_v2_.end()) {
        if(EffectiveLifecycleV2Locked(v.segment_id)!=RecordingLifecycle::Finalized)
            return Fail(error,"V2 상태 변경 뒤 finalize 거부");
        const auto path=media_relpaths_.find(v.segment_id);
        if(SerializeRecordingSegmentV2(found->second)!=SerializeRecordingSegmentV2(v)||
           path==media_relpaths_.end()||path->second!=relative)return Fail(error,"V2 immutable identity/path 충돌");
    }
    return true;
}

bool RecordingCatalog::ValidateManagedCandidateLocked(const RecordingSegmentV2& v,const std::string& relative,std::string* error) const {
    RecordingOrderReservationV1 order;order.store_id=v.store_id;order.request_id=v.order_request_id;
    order.segment_id=v.segment_id;order.channel_id=v.channel_id;order.sequence=v.order_sequence;
    return CanWriteLocked(error)&&ValidateV2Locked(v,relative,error)&&journal_.ManagedOrderMatches(order,error);
}

bool RecordingCatalog::ValidateBoundLocked(const RecordingSegmentV2& s,const RecordingSourceBindingV1& b,
                                            const std::string& relative,std::string* error) const {
    if(!ValidateV2Locked(s,relative,error)||!ValidateRecordingSourceBindingForSegment(b,s,error))return false;
    const auto old=source_bindings_.find(s.segment_id);
    if(segments_v2_.count(s.segment_id) && old==source_bindings_.end())return Fail(error,"unbound 소급 결박 거부");
    if(old!=source_bindings_.end()&&SerializeRecordingSourceBindingV1(old->second)!=SerializeRecordingSourceBindingV1(b))
        return Fail(error,"source binding immutable 충돌");
    return true;
}
bool RecordingCatalog::ValidateBoundFinalizeRecoveryV2(const RecordingSegmentV2& s,const RecordingSourceBindingV1& b,
                                                       const std::string& path,std::string* error) const {
    std::lock_guard lock(mu_);
    if(!opened_||!CanWriteLocked(error))return Fail(error,"bound catalog 소유권/상태 오류");
    const auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    const auto absolute=std::filesystem::absolute(path);
    if(absolute!=absolute.lexically_normal())return Fail(error,"bound path 비정규");
    const auto relative=absolute.lexically_relative(root).generic_string();
    if(!ValidateBoundLocked(s,b,relative,error))return false;
    if(journal_.managed_)return ValidateManagedCandidateLocked(s,relative,error);
    return PreflightV2Locked(journal_.Replay(),error,&s,relative,&b);
}
bool RecordingCatalog::CommitBoundLocked(const RecordingSegmentV2& s,const RecordingSourceBindingV1& b,
                                         const std::string& path,bool recovery,bool* inserted,std::string* error) {
    if(inserted)*inserted=false;
    if(!opened_||!CanWriteLocked(error))return Fail(error,"bound catalog 소유권/상태 오류");
    const auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    const auto absolute=std::filesystem::absolute(path);
    if(absolute!=absolute.lexically_normal())return Fail(error,"bound path 비정규");
    const auto relative=absolute.lexically_relative(root).generic_string();
    if(!ValidateBoundLocked(s,b,relative,error))return false;
    if(journal_.managed_) {
        if(!ValidateManagedCandidateLocked(s,relative,error))return false;
    } else if(!PreflightV2Locked(journal_.Replay(),error,&s,relative,&b))return false;
    if(segments_v2_.count(s.segment_id)) {
        if(!recovery)return Fail(error,"bound ID 이미 존재");
        if(error)error->clear();return true;
    }
    // 등록 경로의 각 구성요소를 확인한다. 비협력 외부 writer와의 경쟁 원자성 보장은 아니다.
    std::filesystem::path current;
    for(const auto& part:absolute) {
        current/=part;
        std::error_code ec;const auto status=std::filesystem::symlink_status(current,ec);
        if(ec||std::filesystem::is_symlink(status))return Fail(error,"bound 실제 경로 오류");
    }
    std::error_code ec;
    if(!std::filesystem::is_regular_file(absolute,ec)||ec||std::filesystem::hard_link_count(absolute,ec)!=1||ec)
        return Fail(error,"bound 실제 파일 없음/형식 오류");
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::SegmentV2BoundFinalized;
    mutation.entity_id=s.segment_id;
    mutation.payload_json="{\"segment\":"+SerializeRecordingSegmentV2(s)+",\"mediaRelpath\":\""+Escape(relative)+
        "\",\"sourceBinding\":"+SerializeRecordingSourceBindingV1(b)+"}";
    if(journal_.managed_) {
        RecordingOrderReservationV1 order;order.store_id=s.store_id;order.request_id=s.order_request_id;
        order.segment_id=s.segment_id;order.channel_id=s.channel_id;order.sequence=s.order_sequence;
        orders_v2_[order.request_id]=order;
    } else {
        std::vector<RecordingOrderReservationV1> orders;
        if(!ValidateRecordingOrderHistory(journal_.Replay().mutations,&orders,error))return false;
        for(const auto& order:orders)orders_v2_[order.request_id]=order;
    }
    if(!AppendAndApplyLocked(std::move(mutation),error))return false;
    if(inserted)*inserted=true;return true;
}
bool RecordingCatalog::FinalizeBoundSegmentV2(const RecordingSegmentV2& s,const RecordingSourceBindingV1& b,
                                              const std::string& path,std::string* error) {
    std::lock_guard lock(mu_);return CommitBoundLocked(s,b,path,false,nullptr,error);
}
bool RecordingCatalog::RecoverBoundSegmentV2(const RecordingSegmentV2& s,const RecordingSourceBindingV1& b,
                                             const std::string& path,bool* inserted,std::string* error) {
    std::lock_guard lock(mu_);return CommitBoundLocked(s,b,path,true,inserted,error);
}
std::optional<RecordingSourceBindingV1> RecordingCatalog::FindSourceBinding(const std::string& id) const {
    std::lock_guard lock(mu_);
    const auto found=source_bindings_.find(id);
    if(!opened_||found==source_bindings_.end()||EffectiveLifecycleV2Locked(id)!=RecordingLifecycle::Finalized)return std::nullopt;
    return found->second;
}
bool RecordingCatalog::ResolveOriginalSample(const std::string& channel,const std::string& source,
    const std::string& generation,std::uint64_t order,const std::string& track,std::uint64_t ordinal,
    std::uint64_t pts,RecordingOriginalResult* result,std::string* error) const {
    if(result)*result={};
    if(!result||!ValidateRecordingReferenceId(channel,error)||!ValidateRecordingReferenceId(source,error)||!ValidateOpaqueId(generation,error)||
       order==0||ordinal==0||pts>static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max())||
       track.empty()||track.size()>1024||std::any_of(track.begin(),track.end(),[](unsigned char c){return c<32||c==127;}))
        return Fail(error,"source lookup 입력 오류");
    std::lock_guard lock(mu_);
    if(!opened_)return Fail(error,"source lookup 미open");
    for(const auto& [id,b]:source_bindings_) {
        const auto segment=segments_v2_.find(id);
        if(segment==segments_v2_.end()||EffectiveLifecycleV2Locked(id)!=RecordingLifecycle::Finalized||
           b.channel_id!=channel||b.source_id!=source||b.source_generation!=generation||b.generation_order!=order||b.track_id!=track)continue;
        const auto sample=std::lower_bound(b.samples.begin(),b.samples.end(),ordinal,[](const auto& value,auto key){return value.ordinal<key;});
        RecordingOriginalCandidate candidate{segment->second,b.source_generation,b.track_id,b.generation_order,b.last_accepted_ordinal,{},{}};
        if(sample!=b.samples.end()&&sample->ordinal==ordinal) {
            if(sample->pts_ns==pts){candidate.sample=*sample;result->exact.push_back(std::move(candidate));}
        } else if(!b.index_complete&&ordinal>b.samples.back().ordinal&&ordinal<=b.last_accepted_ordinal) {
            candidate.reason=b.incomplete_reason;result->unknown.push_back(std::move(candidate));
        }
    }
    const auto sorted=[](const auto& a,const auto& b) {
        return std::tie(a.segment.store_id,a.segment.order_sequence,a.segment.segment_id)<
               std::tie(b.segment.store_id,b.segment.order_sequence,b.segment.segment_id);
    };
    std::sort(result->exact.begin(),result->exact.end(),sorted);
    std::sort(result->unknown.begin(),result->unknown.end(),sorted);
    if(error)error->clear();return true;
}
bool RecordingCatalog::ValidateFinalizeRecoveryV2(const RecordingSegmentV2& v,const std::string& media_path,std::string* error) const {
    std::lock_guard lock(mu_);
    if(!opened_)return Fail(error,"V2 catalog 미open");
    if(source_bindings_.count(v.segment_id))return Fail(error,"bound downgrade 거부");
    const auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    const auto path=std::filesystem::absolute(media_path).lexically_normal();
    const auto relative=path.lexically_relative(root).generic_string();
    if(!ValidateV2Locked(v,relative,error))return false;
    if(journal_.managed_)return ValidateManagedCandidateLocked(v,relative,error);
    const auto replay=journal_.Replay();
    return PreflightV2Locked(replay,error,&v,relative);
}

bool RecordingCatalog::FinalizeSegmentV2(const RecordingSegmentV2& v,const std::string& media_path,std::string* error) {
    if(!ValidateFinalizeRecoveryV2(v,media_path,error))return false;
    std::lock_guard lock(mu_);
    if(segments_v2_.count(v.segment_id))return Fail(error,"V2 ID 이미 존재");
    const auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    const auto path=std::filesystem::absolute(media_path).lexically_normal();
    const auto relative=path.lexically_relative(root);
    std::filesystem::path contained;
    std::error_code ec;
    if(!ValidateV2Locked(v,relative.generic_string(),error)||!ResolveContainedMediaPath(root,relative,&contained)||
       !std::filesystem::is_regular_file(contained,ec)||ec)
        return Fail(error,"V2 실제 media 경로 거부");
    // 실제 writer 활성화 전 단일 catalog 호출 경계. 외부 비협력 writer 직렬화는 별도다.
    if(journal_.managed_) {
        if(!ValidateManagedCandidateLocked(v,relative.generic_string(),error))return false;
        RecordingOrderReservationV1 order;order.store_id=v.store_id;order.request_id=v.order_request_id;
        order.segment_id=v.segment_id;order.channel_id=v.channel_id;order.sequence=v.order_sequence;
        orders_v2_[order.request_id]=order;
    } else {
        const auto replay=journal_.Replay();std::vector<RecordingOrderReservationV1> orders;
        if(!PreflightV2Locked(replay,error,&v,relative.generic_string())||!ValidateRecordingOrderHistory(replay.mutations,&orders,error))return false;
        for(const auto& order:orders)orders_v2_[order.request_id]=order;
    }
    RecordingMutationV1 m;m.mutation_type=RecordingMutationType::SegmentV2Finalized;m.entity_id=v.segment_id;
    m.payload_json="{\"segment\":"+SerializeRecordingSegmentV2(v)+",\"mediaRelpath\":\""+Escape(relative.generic_string())+"\"}";
    return AppendAndApplyLocked(std::move(m),error);
}

std::optional<RecordingSegmentV2> RecordingCatalog::FindSegmentV2ById(const std::string& id) const {
    std::lock_guard lock(mu_);const auto found=segments_v2_.find(id);
    if(tombstones_.count(id)||tombstones_v2_.count(id)||found==segments_v2_.end())return std::nullopt;
    return found->second;
}
RecordingLifecycle RecordingCatalog::EffectiveLifecycleV2Locked(const std::string& id) const {
    if(!segments_v2_.count(id))return RecordingLifecycle::Unknown;
    if(tombstones_.count(id)||tombstones_v2_.count(id))return RecordingLifecycle::Deleted;
    const auto state=states_v2_.find(id);
    return state==states_v2_.end()?RecordingLifecycle::Finalized:state->second.lifecycle;
}
bool RecordingCatalog::MediaV2EligibleLocked(const std::string& channel,const std::string& id) const {
    const auto found=segments_v2_.find(id);
    if(!opened_||!derived_job_state_authoritative_||segments_.count(id)||found==segments_v2_.end()||
       found->second.channel_id!=channel||EffectiveLifecycleV2Locked(id)!=RecordingLifecycle::Finalized)return false;
    for(const auto& entry:event_links_)if(entry.second.derived_segment_id==id||entry.second.fallback_evidence_id==id)return false;
    const auto& segment=found->second;
    if(segment.retention_class==RecordingRetentionClass::Continuous)return true;
    if(segment.retention_class!=RecordingRetentionClass::Event)return false;
    const DerivedJobRecordV1* owner=nullptr;
    const DerivedJobReadyOutputV1* output=nullptr;
    std::size_t index=0;
    for(const auto& entry:derived_jobs_)for(std::size_t i=0;i<entry.second.intent.outputs.size();++i){
        if(entry.second.intent.outputs[i].output_id!=id)continue;
        if(owner)return false;
        owner=&entry.second;index=i;
    }
    if(!owner||owner->state!=DerivedJobState::Complete||!owner->ready||!owner->ready->verified_output||
       index>=owner->ready->outputs.size()||index>=owner->intent.sources.size())return false;
    output=&owner->ready->outputs[index];
    // strict record 검사로 source_index/선택/manifest/AU 출처 결박을 확인한다. 현재 원본 파일은 요구하지 않는다.
    if(output->source_index!=index||!output->provenance.verified_output||SerializeDerivedJobRecord(*owner).empty()||
       SerializeRecordingSegmentV2(output->segment)!=SerializeRecordingSegmentV2(segment))return false;
    const auto path=media_relpaths_.find(id);
    return path!=media_relpaths_.end()&&path->second==owner->intent.outputs[index].final_relpath;
}
bool RecordingCatalog::AcquireMediaV2(const std::string& channel,const std::string& id,RecordingSegmentV2* segment,
    std::pair<std::filesystem::path,std::filesystem::path>* location,std::string* error) {
    std::lock_guard lock(mu_);
    if(!segment||!location||!MediaV2EligibleLocked(channel,id))return Fail(error,"V2 media 결박/상태 거부");
    const auto path=media_relpaths_.find(id);
    if(path==media_relpaths_.end())return Fail(error,"V2 media 경로 없음");
    *segment=segments_v2_.at(id);*location={options_.media_root,path->second};
    return AdjustHoldCountLocked(id,1,error);
}
bool RecordingCatalog::ValidateMediaV2(const RecordingSegmentV2& segment,
    const std::pair<std::filesystem::path,std::filesystem::path>& location) const {
    std::lock_guard lock(mu_);
    if(!MediaV2EligibleLocked(segment.channel_id,segment.segment_id))return false;
    const auto path=media_relpaths_.find(segment.segment_id);
    return path!=media_relpaths_.end()&&location.first==options_.media_root&&location.second==path->second&&
        SerializeRecordingSegmentV2(segment)==SerializeRecordingSegmentV2(segments_v2_.at(segment.segment_id));
}
RecordingLifecycle RecordingCatalog::SegmentLifecycleV2(const std::string& id) const {
    std::lock_guard lock(mu_);return EffectiveLifecycleV2Locked(id);
}
bool RecordingCatalog::CompleteDeletionV2(const RecordingTombstoneV2& tombstone,std::string* error) {
    std::lock_guard lock(mu_);
    if(!opened_||!CanWriteLocked(error))return false;
    const auto payload=SerializeRecordingTombstoneV2(tombstone);
    const auto& id=tombstone.segment.segment_id;
    const auto prior=tombstones_v2_.find(id);
    if(prior!=tombstones_v2_.end()) {
        if(payload.empty()||SerializeRecordingTombstoneV2(prior->second)!=payload)return Fail(error,"V2 tombstone 재시도 충돌");
        if(error)error->clear();return true;
    }
    const auto segment=segments_v2_.find(id);
    if(payload.empty()||segment==segments_v2_.end()||EffectiveLifecycleV2Locked(id)!=RecordingLifecycle::DeletionPending||
       SerializeRecordingSegmentV2(segment->second)!=SerializeRecordingSegmentV2(tombstone.segment)||
       deletion_reasons_[id]!=tombstone.deletion_reason||hold_counts_.count(id)||DerivedJobProtectsLocked(id))return Fail(error,"V2 삭제 완료 상태 불일치");
    const auto path=media_relpaths_.find(id);
    if(path==media_relpaths_.end()||!IsSafeMediaRelpath(path->second))return Fail(error,"V2 삭제 경로 없음");
#if defined(__APPLE__) || defined(__linux__)
    const auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    int directory=::open("/",O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    for(const auto& part:root.relative_path()) {
        if(part.empty()||part==".")continue;
        if(directory<0)break;
        const int next=::openat(directory,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        ::close(directory);directory=next;
    }
    if(directory<0)return Fail(error,"V2 삭제 상위 경로 확인 실패");
    bool absent=false;
    for(const auto& part:std::filesystem::path(path->second).parent_path()) {
        if(part.empty()||part==".")continue;
        const int next=::openat(directory,part.c_str(),O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
        const int saved=errno;::close(directory);directory=next;
        if(next<0) {if(saved==ENOENT)absent=true;else return Fail(error,"V2 삭제 하위 경로 확인 실패");break;}
    }
    struct stat status{};
    if(!absent) {
        const int rc=::fstatat(directory,std::filesystem::path(path->second).filename().c_str(),&status,AT_SYMLINK_NOFOLLOW);
        const int saved_errno=errno;::close(directory);
        if(rc==0||saved_errno!=ENOENT)return Fail(error,"V2 등록 파일 부재 미확인");
    }
#else
    return Fail(error,"V2 안전 삭제 미지원");
#endif
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::SegmentV2Deleted;
    mutation.entity_id=id;mutation.payload_json=payload;
    return AppendAndApplyLocked(std::move(mutation),error);
}

bool RecordingCatalog::SnapshotLocationsV2(const std::string& channel, RecordingLocationCatalogSnapshot* result, std::string* error) const {
    if(result)*result={};
    if(!result||!ValidateRecordingReferenceId(channel,error))return Fail(error,"invalid location snapshot input");
    std::lock_guard lock(mu_);
    if(!opened_)return Fail(error,"catalog not open");
    RecordingLocationCatalogSnapshot snapshot;
    for(const auto& [id,segment]:segments_v2_)
        if(segment.channel_id==channel&&EffectiveLifecycleV2Locked(id)==RecordingLifecycle::Finalized)snapshot.segments.push_back(segment);
    for(const auto& [id,tombstone]:tombstones_v2_)
        if(tombstone.segment.channel_id==channel)snapshot.deleted_segment_ids.push_back(id);
    for(const auto& [id,tombstone]:tombstones_)
        if(tombstone.channel_id==channel)snapshot.deleted_segment_ids.push_back(id);
    std::sort(snapshot.segments.begin(),snapshot.segments.end(),[](const auto& a,const auto& b){
        if(a.store_id!=b.store_id)return a.store_id<b.store_id;
        if(a.order_sequence!=b.order_sequence)return a.order_sequence<b.order_sequence;
        return a.segment_id<b.segment_id;
    });
    std::sort(snapshot.deleted_segment_ids.begin(),snapshot.deleted_segment_ids.end());
    *result=std::move(snapshot);if(error)error->clear();return true;
}

bool RecordingCatalog::RecoverFinalizedSegmentV2(const RecordingSegmentV2& v,const std::string& path,bool* inserted,std::string* error) {
    if(inserted)*inserted=false;
    if(!ValidateFinalizeRecoveryV2(v,path,error))return false;
    if(FindSegmentV2ById(v.segment_id))return true;
    const bool ok=FinalizeSegmentV2(v,path,error);if(inserted)*inserted=ok;return ok;
}

bool RecordingCatalog::FinalizeSegment(const RecordingSegmentV1& segment,
                                       const std::string& media_path,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    return FinalizeSegmentLocked(segment, media_path, false, error);
}

bool RecordingCatalog::MarkSegmentCorrupt(const std::string& segment_id,
                                         const std::string& reason,
                                         std::string* error) {
    std::lock_guard lock(mu_);
    if (!opened_) return Fail(error, "catalog가 열리지 않음");
    if (reason != "missing-media" && reason != "checksum-mismatch" &&
        reason != "container-invalid" && reason != "derived-media-missing")
        return Fail(error, "지원하지 않는 corruption reason");
    const auto v2=segments_v2_.find(segment_id);
    if(v2!=segments_v2_.end()) {
        if(!CanWriteLocked(error)||v2->second.pinned||hold_counts_.count(segment_id)||DerivedJobProtectsLocked(segment_id))return Fail(error,"V2 corruption 보호 거부");
        const auto lifecycle=EffectiveLifecycleV2Locked(segment_id);
        if(lifecycle==RecordingLifecycle::Corrupt)return states_v2_.at(segment_id).reason==reason;
        if(lifecycle!=RecordingLifecycle::Finalized)return Fail(error,"V2 corruption 상태 거부");
        RecordingSegmentStateV2 state;state.segment_id=segment_id;state.lifecycle=RecordingLifecycle::Corrupt;state.reason=reason;
        RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::SegmentV2State;
        mutation.entity_id=segment_id;mutation.payload_json=SerializeRecordingSegmentStateV2(state);
        return AppendAndApplyLocked(std::move(mutation),error);
    }
    const auto segment = segments_.find(segment_id);
    if (segment == segments_.end()) return Fail(error, "corruption 대상 segment가 없음");
    if (segment->second.lifecycle == RecordingLifecycle::Corrupt) {
        if (error) error->clear();
        return true;
    }
    if (segment->second.lifecycle != RecordingLifecycle::Finalized)
        return Fail(error, "corruption 대상 finalized 상태가 아님");
    const auto hold = hold_counts_.find(segment_id);
    if (hold != hold_counts_.end() && hold->second > 0) return Fail(error, "held segment corruption 변경 거부");
    for (const auto& [_, link] : event_links_) {
        if (link.status != EventRecordingLinkStatus::Pending) continue;
        if (link.derived_segment_id == segment_id || std::any_of(link.ordered_overlaps.begin(),
            link.ordered_overlaps.end(), [&](const auto& overlap) { return overlap.segment_id == segment_id; }))
            return Fail(error, "pending event source/output corruption 변경 거부");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::CorruptionDetected;
    mutation.entity_id = segment_id;
    mutation.payload_json = "{\"reason\":\"" + reason + "\"}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::FinalizeSegmentWithHold(const RecordingSegmentV1& segment,
                                               const std::string& media_path,
                                               std::string* error) {
    std::lock_guard lock(mu_);
    return FinalizeSegmentLocked(segment, media_path, true, error);
}

bool RecordingCatalog::ValidateFinalizeRecovery(const RecordingSegmentV1& segment,
    const std::string& media_path,const std::optional<EventRecordingLinkV1>& event_link,std::string* error) const {
    std::lock_guard lock(mu_);
    if (!opened_ || !ValidateRecordingSegmentV1(segment,error) ||
        segment.lifecycle != RecordingLifecycle::Finalized || tombstones_.count(segment.segment_id))
        return Fail(error,"ready 복구 catalog/identity/삭제 경계 거부");
    const auto known=segments_.find(segment.segment_id);
    auto root=std::filesystem::absolute(options_.media_root).lexically_normal();
    auto path=std::filesystem::absolute(media_path).lexically_normal();
#ifdef __APPLE__
    for(auto* value:{&root,&path}){const auto text=value->string();
        if(text=="/tmp"||text.rfind("/tmp/",0)==0||text=="/var"||text.rfind("/var/",0)==0)*value="/private"+text;}
#endif
    const auto relative=path.lexically_relative(root).generic_string();
    if (!IsSafeMediaRelpath(relative)) return Fail(error,"ready 복구 상대경로 거부");
    if (known!=segments_.end()) {
        const auto path=media_relpaths_.find(segment.segment_id);
        if (known->second.lifecycle!=RecordingLifecycle::Finalized ||
            SerializeRecordingSegmentV1(known->second)!=SerializeRecordingSegmentV1(segment) ||
            path==media_relpaths_.end() || path->second!=relative)
            return Fail(error,"ready 복구 기존 segment 충돌");
    }
    if (segment.retention_class==RecordingRetentionClass::Event) {
        if (!event_link) return Fail(error,"ready event link 없음");
        const auto entry=event_links_.find(event_link->link_id);
        if (entry==event_links_.end()) return Fail(error,"ready durable event link 없음");
        const auto& actual=entry->second;const auto& expected=*event_link;
        auto canonical=actual;
        // fallback 갱신/terminal release 단계는 독립 진행하되 provenance 필드는 정확히 보존한다.
        canonical.updated_at_ms=expected.updated_at_ms;
        canonical.completeness_reason=expected.completeness_reason;
        canonical.derived_actual_range=expected.derived_actual_range;
        canonical.derivation_mode=expected.derivation_mode;
        canonical.fallback_evidence_id=expected.fallback_evidence_id;
        canonical.fallback_media_locator=expected.fallback_media_locator;
        if (actual.status!=EventRecordingLinkStatus::Pending ||
            actual.derived_segment_id!=std::optional<std::string>(segment.segment_id) ||
            SerializeEventRecordingLinkV1(canonical)!=SerializeEventRecordingLinkV1(expected) ||
            !ValidateEventLinkReferencesLocked(actual,error))
            return Fail(error,"ready event provenance/참조 충돌");
        for (const auto& overlap:actual.ordered_overlaps) {
            const auto hold=hold_counts_.find(overlap.segment_id);
            if (hold!=hold_counts_.end() && hold->second>=static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))
                return Fail(error,"ready event hold overflow");
        }
    } else if (event_link) return Fail(error,"continuous ready에 event provenance 혼입");
    return true;
}

bool RecordingCatalog::RecoverFinalizedSegment(const RecordingSegmentV1& segment,
    const std::string& media_path,const std::optional<EventRecordingLinkV1>& event_link,bool* inserted,std::string* error) {
    if (inserted) *inserted=false;
    if (!ValidateFinalizeRecovery(segment,media_path,event_link,error)) return false;
    // 호출 계약은 Open 직후 단일 startup coordinator이며 runtime 생산자가 아직 없다.
    if (FindSegmentById(segment.segment_id)) return true;
    if (!event_link) {
        const bool ok=FinalizeSegment(segment,media_path,error);
        if (inserted) *inserted=ok;
        return ok;
    }
    std::vector<std::string> source_ids;
    for (const auto& overlap:event_link->ordered_overlaps) source_ids.push_back(overlap.segment_id);
    EventSourceLease lease;
    if (!AcquireEventSourceLease(event_link->channel_id,event_link->stream_epoch_id,source_ids,&lease,error)) return false;
    if (!FinalizeSegmentWithHold(segment,media_path,error)) {
        ReleaseEventSourceLease(lease,nullptr);
        return false;
    }
    if (inserted) *inserted=true;
    return true;
}

bool RecordingCatalog::FinalizeSegmentLocked(const RecordingSegmentV1& segment,
                                             const std::string& media_path,
                                             bool acquire_hold,
                                             std::string* error) {
    if (!opened_) return Fail(error, "catalog가 열리지 않음");
    if (!ValidateRecordingSegmentV1(segment, error) || segment.lifecycle != RecordingLifecycle::Finalized) return false;
    if (segments_v2_.count(segment.segment_id)) return Fail(error,"V1/V2 ID 충돌");
    if (tombstones_.find(segment.segment_id) != tombstones_.end()) {
        return Fail(error, "tombstone segment ID 재사용 금지");
    }
    if (segments_.find(segment.segment_id) != segments_.end()) {
        return Fail(error, "segment ID가 이미 catalog에 존재함");
    }
    std::error_code fs_error;
    const auto root = std::filesystem::weakly_canonical(options_.media_root, fs_error);
    if (fs_error) return Fail(error, "recording root canonicalize 실패");
    const auto media = std::filesystem::weakly_canonical(media_path, fs_error);
    if (fs_error) return Fail(error, "recording media canonicalize 실패");
    const auto relative = media.lexically_relative(root);
    std::filesystem::path contained_media;
    if (!ResolveContainedMediaPath(root, relative, &contained_media) ||
        contained_media != media || !std::filesystem::is_regular_file(media)) {
        return Fail(error, "media path가 recording root 밖이거나 파일이 없음");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::SegmentFinalized;
    mutation.entity_id = segment.segment_id;
    mutation.payload_json = "{\"segment\":" + SerializeRecordingSegmentV1(segment) +
                            ",\"mediaRelpath\":\"" + Escape(relative.generic_string()) + "\"}";
    if (!AppendAndApplyLocked(std::move(mutation), error)) return false;
    if (!acquire_hold) return true;
    constexpr auto kMaxPersistentHoldCount =
        static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
    const std::uint64_t current = hold_counts_[segment.segment_id];
    if (current >= kMaxPersistentHoldCount) {
        return Fail(error, "event segment hold_count가 int64 저장 범위를 넘음");
    }
    hold_counts_[segment.segment_id] = current + 1;
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) {
        sqlite3_stmt* statement = nullptr;
        if (sqlite3_prepare_v2(sqlite_db_,
                               "UPDATE recording_segments SET hold_count=hold_count+1 "
                               "WHERE segment_id=? AND lifecycle='finalized'",
                               -1, &statement, nullptr) != SQLITE_OK) {
            CloseSqliteLocked();
            catalog_mode_ = "jsonl-fallback";
            if (error != nullptr) error->clear();
            return true;
        }
        BindText(statement, 1, segment.segment_id);
        const bool updated = sqlite3_step(statement) == SQLITE_DONE &&
                             sqlite3_changes(sqlite_db_) == 1;
        sqlite3_finalize(statement);
        if (!updated) {
            CloseSqliteLocked();
            catalog_mode_ = "jsonl-fallback";
            if (error != nullptr) error->clear();
            return true;
        }
    }
#endif
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingCatalog::ValidateEventLinkReferencesLocked(
    const EventRecordingLinkV1& link,
    std::string* error) const {
    if (!link.requested_range.has_value() && !link.ordered_overlaps.empty()) {
        return Fail(error, "UTC 미해석 link는 segment overlap을 가질 수 없음");
    }
    for (const auto& overlap : link.ordered_overlaps) {
        const auto segment = segments_.find(overlap.segment_id);
        if (segment == segments_.end() ||
            segment->second.lifecycle != RecordingLifecycle::Finalized ||
            segment->second.retention_class != RecordingRetentionClass::Continuous ||
            segment->second.channel_id != link.channel_id ||
            (!link.stream_epoch_id.empty() &&
             segment->second.stream_epoch_id != link.stream_epoch_id)) {
            return Fail(error, "event link overlap이 같은 channel/epoch의 finalized continuous segment가 아님");
        }
        const auto& requested = *link.requested_range;
        const UtcRangeV1 expected{
            std::max(segment->second.start.utc_ms, requested.start_ms),
            std::min(segment->second.end.utc_ms, requested.end_ms)};
        if (overlap.range.start_ms != expected.start_ms ||
            overlap.range.end_ms != expected.end_ms) {
            return Fail(error, "event link overlap이 source/requested range 교집합과 다름");
        }
    }
    if (link.status == EventRecordingLinkStatus::Complete) {
        const auto derived = segments_.find(*link.derived_segment_id);
        if (derived == segments_.end() ||
            derived->second.lifecycle != RecordingLifecycle::Finalized ||
            derived->second.retention_class != RecordingRetentionClass::Event ||
            derived->second.channel_id != link.channel_id ||
            derived->second.source_id != link.source_id ||
            derived->second.start.utc_ms != link.derived_actual_range->start_ms ||
            derived->second.end.utc_ms != link.derived_actual_range->end_ms) {
            return Fail(error, "complete event link의 derived segment가 유효하지 않음");
        }
    }
    return true;
}

bool RecordingCatalog::PutEventLink(const EventRecordingLinkV1& link, std::string* error) {
    std::lock_guard lock(mu_);
    if (!ValidateEventRecordingLinkV1(link, error)) return false;
    for (const auto& [existing_link_id, existing] : event_links_) {
        if (existing.event_id == link.event_id && existing_link_id != link.link_id) {
            return Fail(error, "같은 event_id에 다른 recording link ID를 사용할 수 없음");
        }
    }
    if (!ValidateEventLinkReferencesLocked(link, error)) return false;
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::EventLinkCreated;
    mutation.entity_id = link.link_id;
    mutation.payload_json = "{\"link\":" + SerializeEventRecordingLinkV1(link) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::PutObservation(const AnalysisObservationV1& observation, std::string* error) {
    std::lock_guard lock(mu_);
    if (segments_.find(observation.frame_locator.segment_id) == segments_.end()) return Fail(error, "observation segment foreign key 위반");
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::ObservationPut;
    mutation.entity_id = observation.observation_id;
    mutation.payload_json = "{\"observation\":" + SerializeAnalysisObservationV1(observation) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::RequestDeletion(const std::string& segment_id,
                                       const std::string& reason,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    const auto v2=segments_v2_.find(segment_id);
    if(v2!=segments_v2_.end()) {
        if(!opened_||!CanWriteLocked(error))return false;
        RecordingSegmentStateV2 state;state.segment_id=segment_id;
        state.lifecycle=RecordingLifecycle::DeletionPending;state.reason=reason;
        const auto payload=SerializeRecordingSegmentStateV2(state);
        const auto effective=EffectiveLifecycleV2Locked(segment_id);
        if(payload.empty()||v2->second.pinned||hold_counts_.count(segment_id)||DerivedJobProtectsLocked(segment_id))return Fail(error,"V2 삭제 보호/사유 거부");
        if(effective==RecordingLifecycle::DeletionPending)return deletion_reasons_[segment_id]==reason;
        if(effective!=RecordingLifecycle::Finalized &&
           !(effective==RecordingLifecycle::Corrupt&&reason=="manual-corrupt-cleanup"))return Fail(error,"V2 삭제 전이 거부");
        RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::SegmentV2State;
        mutation.entity_id=segment_id;mutation.payload_json=payload;
        return AppendAndApplyLocked(std::move(mutation),error);
    }
    const auto segment = segments_.find(segment_id);
    if (segment == segments_.end() ||
        segment->second.lifecycle != RecordingLifecycle::Finalized) {
        return Fail(error, "삭제 요청 가능한 finalized segment가 없음");
    }
    const auto hold = hold_counts_.find(segment_id);
    if (segment->second.pinned || (hold != hold_counts_.end() && hold->second > 0)) {
        return Fail(error, "pin 또는 hold가 있는 segment는 삭제 요청할 수 없음");
    }
    for (const auto& [_, link] : event_links_) {
        if (link.status != EventRecordingLinkStatus::Pending ||
            !link.derived_segment_id.has_value()) continue;
        const bool is_output = *link.derived_segment_id == segment_id;
        const bool is_source = std::any_of(
            link.ordered_overlaps.begin(), link.ordered_overlaps.end(),
            [&](const auto& overlap) { return overlap.segment_id == segment_id; });
        if (is_output || is_source) {
            return Fail(error, "terminal 미완료 event link의 source/output은 삭제 요청할 수 없음");
        }
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::DeletionRequested;
    mutation.entity_id = segment_id;
    mutation.payload_json = "{\"reason\":\"" + Escape(reason) + "\"}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

bool RecordingCatalog::PutReferencedObservation(const AnalysisObservationV2& observation, const RecordingConsumerReferenceV1& reference, std::string* error) {
    std::lock_guard lock(mu_);
    ReferencedObservationV1 pair;pair.observation=observation;pair.reference=reference;
    if(!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||!ValidateReferencedObservationV1(pair,error))return false;
    const auto old=referenced_observations_.find(observation.observation_id);
    if(old!=referenced_observations_.end()) {
        if(!MergeReferenced(old->second,&pair,error))return false;
        if(SerializeReferencedObservationV1(old->second)==SerializeReferencedObservationV1(pair)) {
            if(error)error->clear();return true;
        }
    }
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::ReferencedObservationPut;
    mutation.entity_id=observation.observation_id;mutation.payload_json=SerializeReferencedObservationV1(pair);
    return AppendAndApplyLocked(std::move(mutation),error);
}
std::vector<ReferencedObservationV1> RecordingCatalog::QueryReferencedObservations(const std::string& channel) const {
    std::lock_guard lock(mu_);std::vector<ReferencedObservationV1> result;
    if(!opened_||!options_.enable_v2_storage||!ValidateRecordingReferenceId(channel,nullptr))return result;
    for(const auto& [id,pair]:referenced_observations_) {
        (void)id;if(pair.observation.channel_id==channel)result.push_back(pair);
    }
    std::sort(result.begin(),result.end(),[](const auto& a,const auto& b){return a.observation.observation_id<b.observation.observation_id;});
    return result;
}

bool RecordingCatalog::PutConsumerReference(const RecordingConsumerReferenceV1& reference, std::string* error) {
    std::lock_guard lock(mu_);
    if(!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||!ValidateRecordingConsumerReferenceV1(reference,error))
        return Fail(error,"consumer reference 저장 상태/입력 거부");
    const auto old=consumer_references_.find(reference.reference_id);
    if(old!=consumer_references_.end()) {
        if(SerializeRecordingConsumerReferenceV1(old->second)!=SerializeRecordingConsumerReferenceV1(reference))return Fail(error,"consumer reference ID 충돌");
        if(error)error->clear();
        return true;
    }
    RecordingMutationV1 mutation;mutation.mutation_type=RecordingMutationType::ConsumerReferencePut;
    mutation.entity_id=reference.reference_id;
    mutation.payload_json="{\"reference\":"+SerializeRecordingConsumerReferenceV1(reference)+"}";
    return AppendAndApplyLocked(std::move(mutation),error);
}
bool RecordingCatalog::AcceptDerivedReference(const RecordingConsumerReferenceV1& reference, std::string* error) {
    std::lock_guard lock(mu_);
    if(!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||
       !ValidateRecordingConsumerReferenceV1(reference,error)||reference.kind!="event")
        return Fail(error,"derived reference 접수 상태/입력 거부");
    const auto stored=consumer_references_.find(reference.reference_id);
    if(stored==consumer_references_.end()||
       SerializeRecordingConsumerReferenceV1(stored->second)!=SerializeRecordingConsumerReferenceV1(reference))
        return Fail(error,"derived reference canonical 결박 불일치");
    if(derived_accepted_references_.count(reference.reference_id)) {
        if(error)error->clear();
        return true;
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type=RecordingMutationType::DerivedReferenceAccepted;
    mutation.entity_id=reference.reference_id;
    mutation.payload_json="{\"reference\":"+SerializeRecordingConsumerReferenceV1(reference)+"}";
    if(!AppendAndApplyLocked(std::move(mutation),error)) {
        derived_job_state_authoritative_=false;
        return false;
    }
    return true;
}
bool RecordingCatalog::IsDerivedReferenceAccepted(const std::string& id, bool* accepted, std::string* error) const {
    std::lock_guard lock(mu_);
    if(accepted)*accepted=false;
    if(!accepted||!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||!ValidateOpaqueId(id,error))
        return Fail(error,"derived reference 조회 상태/입력 거부");
    *accepted=derived_accepted_references_.count(id)!=0;
    if(error)error->clear();
    return true;
}
bool RecordingCatalog::SnapshotDerivedSources(const RecordingConsumerReferenceV1& reference,
    std::vector<RecordingDerivedSourceSnapshotEntry>* result, std::string* error) const {
    std::lock_guard lock(mu_);
    if(result)result->clear();
    if(!result||!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||
       !ValidateRecordingConsumerReferenceV1(reference,error)||!reference.request)
        return Fail(error,"derived source snapshot 상태/입력 거부");
    const auto& request=*reference.request;
    // 모든 중간 곱은 int64×int32×10^9 이하이며 __int128 범위 안이다.
    const __int128 begin=(static_cast<__int128>(request.start_ms)-request.pre_ms)*1000000;
    const __int128 end=(static_cast<__int128>(request.end_ms)+request.post_ms)*1000000;
    for(const auto& [id,segment]:segments_v2_) {
        if(segment.source_id!=reference.source_id||segment.channel_id!=reference.channel_id||
           segment.retention_class!=RecordingRetentionClass::Continuous)continue;
        const auto binding=source_bindings_.find(id);
        const bool valid_binding=binding!=source_bindings_.end()&&
            ValidateRecordingSourceBindingForSegment(binding->second,segment,nullptr);
        const bool valid_segment=ValidateRecordingSegmentV2(segment,nullptr);
        bool unrelated=false;
        if(request.time_basis=="media-pts-ms") {
            if(valid_binding&&reference.original) {
                const auto& original=*reference.original;
                unrelated=binding->second.source_generation!=original.source_generation||
                    binding->second.generation_order!=original.generation_order||binding->second.track_id!=original.track_id;
            }
            if(valid_segment&&segment.media_end_pts) {
                const __int128 scale=static_cast<__int128>(segment.time_base_num)*1000000000;
                unrelated=unrelated||static_cast<__int128>(*segment.media_end_pts)*scale<=begin*segment.time_base_den||
                    static_cast<__int128>(segment.media_start_pts)*scale>=end*segment.time_base_den;
            }
        } else if(request.time_basis=="utc-ms"&&valid_segment&&!segment.mappings.empty()) {
            unrelated=true;
            for(const auto& mapping:segment.mappings) {
                if(mapping.provenance=="unknown"||!mapping.utc_start_ns||!mapping.utc_end_ns||
                   !mapping.end_pts||!mapping.uncertainty_ns||*mapping.uncertainty_ns!=0||
                   (static_cast<__int128>(*mapping.utc_end_ns)>begin&&
                    static_cast<__int128>(*mapping.utc_start_ns)<end)) {
                    unrelated=false;
                    break;
                }
            }
        }
        if(unrelated)continue;
        if(result->size()==256) {
            result->clear();
            return Fail(error,"derived source relevant snapshot cap exceeded");
        }
        RecordingDerivedSourceSnapshotEntry entry;
        entry.segment=segment;
        if(binding!=source_bindings_.end())entry.binding=binding->second;
        entry.lifecycle=EffectiveLifecycleV2Locked(id);
        entry.deleted=tombstones_v2_.count(id)!=0||entry.lifecycle==RecordingLifecycle::Deleted;
        result->push_back(std::move(entry));
    }
    std::sort(result->begin(),result->end(),[](const auto& a,const auto& b){
        return std::tie(a.segment.store_id,a.segment.order_sequence,a.segment.segment_id)<
               std::tie(b.segment.store_id,b.segment.order_sequence,b.segment.segment_id);
    });
    if(error)error->clear();
    return true;
}
bool RecordingCatalog::QueryDerivedReferenceResult(const std::string& id,
    RecordingDerivedReferenceResult* result,std::string* error) const {
    std::lock_guard lock(mu_);
    if(result)*result={};
    if(!result||!opened_||!options_.enable_v2_storage||!CanWriteLocked(error)||!ValidateOpaqueId(id,error))
        return Fail(error,"derived reference result 조회 상태/입력 거부");
    result->managed=derived_accepted_references_.count(id)!=0;
    std::vector<const DerivedJobRecordV1*> selected;
    for(const auto& [_,job]:derived_jobs_)if(job.intent.reference.reference_id==id) {
        result->managed=true;
        selected.push_back(&job);
        std::sort(selected.begin(),selected.end(),[](const auto* a,const auto* b){return a->intent.job_id<b->intent.job_id;});
        if(selected.size()>8) {result->truncated=true;selected.pop_back();}
    }
    for(const auto* job:selected) {
        RecordingDerivedReferenceJob item;
        item.job=*job;
        if(job->ready)for(const auto& output:job->ready->outputs) {
            RecordingDerivedOutputAvailability availability;
            availability.segment_id=output.segment.segment_id;
            const auto path=media_relpaths_.find(availability.segment_id);
            if(path!=media_relpaths_.end())availability.relative_path=path->second;
            availability.lifecycle=EffectiveLifecycleV2Locked(availability.segment_id);
            availability.catalog_available=segments_v2_.count(availability.segment_id)!=0&&
                !tombstones_v2_.count(availability.segment_id)&&
                availability.lifecycle==RecordingLifecycle::Finalized&&path!=media_relpaths_.end();
            item.outputs.push_back(std::move(availability));
        }
        result->jobs.push_back(std::move(item));
    }
    if(result->truncated)result->reason="derived-reference-job-list-truncated";
    else if(result->jobs.empty())result->reason=result->managed?"evidence-not-durable":"derived-reference-not-accepted";
    else result->state="jobs";
    if(error)error->clear();
    return true;
}
std::vector<RecordingConsumerReferenceV1> RecordingCatalog::QueryConsumerReferences(
    const std::string& channel, const std::string& kind, const std::string& owner) const {
    std::lock_guard lock(mu_);
    std::vector<RecordingConsumerReferenceV1> result;
    if(!opened_||!options_.enable_v2_storage||!ValidateRecordingReferenceId(channel,nullptr)||!ValidateOpaqueId(owner,nullptr)||
       (kind!="observation"&&kind!="event"))return result;
    for(const auto& [id,reference]:consumer_references_) {
        (void)id;
        if(reference.channel_id==channel&&reference.kind==kind&&reference.owner_id==owner)result.push_back(reference);
    }
    std::sort(result.begin(),result.end(),[](const auto& a,const auto& b){return a.reference_id<b.reference_id;});
    return result;
}

void RecordingCatalog::ResolveObservationV2Locked(AnalysisObservationV2* o) const {
    const auto original = o->frame_locator;
    o->frame_locator.reset();
    if (o->stream_epoch_id.empty()) {
        if (o->locator_reason != "ambiguous-epoch") o->locator_reason = "missing-provenance";
        return;
    }
    if (original && tombstones_.count(original->segment_id)) {
        o->locator_reason = "deleted";
        return;
    }
    const RecordingSegmentV1* selected = nullptr;
    for (const auto& pair : segments_) {
        const auto& s = pair.second;
        if (s.channel_id != o->channel_id || s.source_id != o->source_id ||
            s.stream_epoch_id != o->stream_epoch_id || s.retention_class != RecordingRetentionClass::Continuous ||
            s.start.time_base_num != 1 || s.start.time_base_den != 1000000000 ||
            s.end.time_base_num != 1 || s.end.time_base_den != 1000000000 ||
            o->pts < s.start.pts || o->pts >= s.end.pts) continue;
        if (selected) { o->locator_reason = "ambiguous-epoch"; return; }
        selected = &s;
    }
    if (!selected) { o->locator_reason = "gap"; return; }
    const auto& s = *selected;
    if (s.lifecycle == RecordingLifecycle::Deleted || s.lifecycle == RecordingLifecycle::DeletionPending) {
        o->locator_reason = "deleted"; return;
    }
    if (s.lifecycle == RecordingLifecycle::Corrupt) { o->locator_reason = "corrupt"; return; }
    if (s.lifecycle != RecordingLifecycle::Finalized) { o->locator_reason = "pending"; return; }
    const auto relative = media_relpaths_.find(s.segment_id);
    std::filesystem::path contained;
    std::error_code media_error;
    if (relative == media_relpaths_.end() ||
        !ResolveContainedMediaPath(options_.media_root, relative->second, &contained) ||
        !std::filesystem::is_regular_file(contained, media_error) || media_error ||
        std::filesystem::file_size(contained, media_error) != s.size_bytes || media_error) {
        o->locator_reason = "missing-media"; return;
    }
    if (!IsRecognizedMedia(contained)) { o->locator_reason = "corrupt"; return; }
    const std::int64_t delta_ms = (o->pts - s.start.pts) / 1000000;
    if (delta_ms > std::numeric_limits<std::int64_t>::max() - s.start.utc_ms) {
        o->locator_reason = "out-of-range"; return;
    }
    const auto utc = s.start.utc_ms + delta_ms;
    if (utc < s.start.utc_ms || utc >= s.end.utc_ms) { o->locator_reason = "out-of-range"; return; }
    FrameLocatorV1 locator;
    locator.segment_id = s.segment_id;
    locator.frame = {utc, o->pts, 1, 1000000000};
    locator.keyframe_pts = s.start.pts;
    o->frame_locator = std::move(locator);
    o->locator_reason.clear();
}

AnalysisObservationV2 RecordingCatalog::ResolveObservationV2(AnalysisObservationV2 observation) const {
    std::lock_guard lock(mu_);
    ResolveObservationV2Locked(&observation);
    return observation;
}

bool RecordingCatalog::PutObservationV2(AnalysisObservationV2 observation, std::string* error) {
    // 검증과 segment lifecycle 확인 및 journal append를 동일 catalog lock 아래 수행한다.
    std::lock_guard lock(mu_);
    AnalysisObservationV2 checked;
    if (!ParseAnalysisObservationV2(SerializeAnalysisObservationV2(observation), &checked, error)) return false;
    const auto previous = observations_v2_.find(observation.observation_id);
    if (previous != observations_v2_.end() && !MergeObservation(previous->second, &observation, error)) return false;
    if (observation.frame_locator) {
        ResolveObservationV2Locked(&checked);
        if (!checked.frame_locator ||
            SerializeFrameLocatorV1(*checked.frame_locator) != SerializeFrameLocatorV1(*observation.frame_locator))
            return Fail(error, "observation-v2-locator-mismatch");
    }
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::ObservationV2Put;
    mutation.entity_id = observation.observation_id;
    mutation.payload_json = "{\"observation\":" + SerializeAnalysisObservationV2(observation) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

std::vector<AnalysisObservationV2> RecordingCatalog::QueryObservationsV2(const std::string& channel_id) const {
    std::lock_guard lock(mu_);
    std::vector<AnalysisObservationV2> output;
    for (const auto& pair : observations_v2_) {
        if (pair.second.channel_id != channel_id) continue;
        auto observation = pair.second;
        // 조회는 기존 locator를 revoke할 수 있지만 미확정 관측의 provenance를 새로 추정하지 않는다.
        if (observation.frame_locator) ResolveObservationV2Locked(&observation);
        output.push_back(std::move(observation));
    }
    std::sort(output.begin(), output.end(), [](const auto& a, const auto& b) {
        return a.observation_id < b.observation_id;
    });
    return output;
}

bool RecordingCatalog::CompleteDeletion(const RecordingTombstoneV1& tombstone, std::string* error) {
    std::lock_guard lock(mu_);
    RecordingMutationV1 mutation;
    mutation.mutation_type = RecordingMutationType::DeletionCompleted;
    mutation.entity_id = tombstone.segment_id;
    mutation.payload_json = "{\"tombstone\":" + SerializeRecordingTombstoneV1(tombstone) + "}";
    return AppendAndApplyLocked(std::move(mutation), error);
}

std::vector<RecordingSegmentV1> RecordingCatalog::QuerySegments(const std::string& channel_id,
                                                                std::int64_t start_ms,
                                                                std::int64_t end_ms) const {
    std::lock_guard lock(mu_);
    std::vector<RecordingSegmentV1> result;
    for (const auto& [_, segment] : segments_) {
        if (segment.channel_id == channel_id && segment.lifecycle != RecordingLifecycle::Deleted &&
            HalfOpenRangesOverlap(segment.start.utc_ms, segment.end.utc_ms, start_ms, end_ms)) result.push_back(segment);
    }
    std::sort(result.begin(), result.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.start.utc_ms != rhs.start.utc_ms) return lhs.start.utc_ms < rhs.start.utc_ms;
        return lhs.segment_id < rhs.segment_id;
    });
    return result;
}

std::vector<RecordingSegmentV1> RecordingCatalog::FinalizedSegmentsForStartup() const {
    std::lock_guard lock(mu_);
    std::vector<RecordingSegmentV1> result;
    for (const auto& [_, segment] : segments_) {
        if (segment.lifecycle == RecordingLifecycle::Finalized) result.push_back(segment);
    }
    std::sort(result.begin(), result.end(), [](const auto& left, const auto& right) {
        return left.segment_id < right.segment_id;
    });
    return result;
}

std::vector<std::string> RecordingCatalog::FinalizedSegmentIdsForStartup() const {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    for(const auto& [id,segment]:segments_)if(segment.lifecycle==RecordingLifecycle::Finalized)result.push_back(id);
    for(const auto& [id,segment]:segments_v2_) {
        (void)segment;
        if(EffectiveLifecycleV2Locked(id)==RecordingLifecycle::Finalized)result.push_back(id);
    }
    std::sort(result.begin(),result.end());
    return result;
}

RetentionSnapshot RecordingCatalog::RetentionSnapshot() const {
    std::lock_guard lock(mu_);
    struct RetentionSnapshot snapshot;
    snapshot.authoritative=opened_&&derived_job_state_authoritative_&&CanWriteLocked(nullptr);
    if(!snapshot.authoritative)snapshot.error="catalog reservation snapshot 미확인";
    for(const auto& [id,job]:derived_jobs_)if(DerivedJobActive(job))snapshot.durable_reservations.push_back({id,job.intent.reference.channel_id,job.intent.reserved_bytes});
    for(const auto& [id,v]:segments_v2_) {
        const auto lifecycle=EffectiveLifecycleV2Locked(id);
        const auto path=media_relpaths_.find(id);
        if(lifecycle==RecordingLifecycle::Deleted||path==media_relpaths_.end())continue;
        RetentionCandidate candidate;candidate.segment_v2=v;candidate.effective_lifecycle=lifecycle;
        candidate.media_path=options_.media_root/std::filesystem::path(path->second);
        const auto hold=hold_counts_.find(id);candidate.hold_count=hold==hold_counts_.end()?0:hold->second;
        if(DerivedJobProtectsLocked(id)&&candidate.hold_count<std::numeric_limits<std::uint64_t>::max())++candidate.hold_count;
        const auto reason=deletion_reasons_.find(id);if(reason!=deletion_reasons_.end())candidate.deletion_reason=reason->second;
        snapshot.candidates.push_back(std::move(candidate));
    }
    for (const auto& [segment_id, segment] : segments_) {
        if (segment.lifecycle != RecordingLifecycle::Finalized &&
            segment.lifecycle != RecordingLifecycle::DeletionPending) {
            continue;
        }
        const auto path = media_relpaths_.find(segment_id);
        if (path == media_relpaths_.end()) continue;
        std::filesystem::path contained_media;
        if (!ResolveContainedMediaPath(options_.media_root, path->second, &contained_media)) {
            if (segment.lifecycle == RecordingLifecycle::DeletionPending) {
                RetentionCandidate pending;
                pending.segment = segment;
                pending.media_path = options_.media_root / path->second;
                const auto reason = deletion_reasons_.find(segment_id);
                if (reason != deletion_reasons_.end()) {
                    pending.deletion_reason = reason->second;
                }
                snapshot.candidates.push_back(std::move(pending));
            }
            continue;
        }
        RetentionCandidate candidate;
        candidate.segment = segment;
        candidate.media_path = std::move(contained_media);
        const auto hold = hold_counts_.find(segment_id);
        candidate.hold_count = hold == hold_counts_.end() ? 0 : hold->second;
        const auto reason = deletion_reasons_.find(segment_id);
        if (reason != deletion_reasons_.end()) candidate.deletion_reason = reason->second;
        snapshot.candidates.push_back(std::move(candidate));
    }
    return snapshot;
}

std::optional<EventRecordingLinkV1> RecordingCatalog::FindEventLinkByEventId(
    const std::string& event_id) const {
    std::lock_guard lock(mu_);
    std::optional<EventRecordingLinkV1> result;
    for (const auto& [_, link] : event_links_) {
        if (link.event_id != event_id) continue;
        if (!result.has_value() || link.updated_at_ms > result->updated_at_ms ||
            (link.updated_at_ms == result->updated_at_ms && link.link_id < result->link_id)) {
            result = link;
        }
    }
    return result;
}

std::optional<RecordingSegmentV1> RecordingCatalog::FindSegmentById(
    const std::string& segment_id) const {
    std::lock_guard lock(mu_);
    const auto it = segments_.find(segment_id);
    if (it == segments_.end() || it->second.lifecycle == RecordingLifecycle::Deleted) {
        return std::nullopt;
    }
    return it->second;
}

std::optional<std::filesystem::path> RecordingCatalog::FindSegmentMediaPath(
    const std::string& segment_id) const {
    std::lock_guard lock(mu_);
    const auto segment = segments_.find(segment_id);
    const auto path = media_relpaths_.find(segment_id);
    if (segment == segments_.end() || path == media_relpaths_.end() ||
        segment->second.lifecycle == RecordingLifecycle::Deleted) {
        return std::nullopt;
    }
    std::filesystem::path contained;
    if (!ResolveContainedMediaPath(options_.media_root, path->second, &contained)) {
        return std::nullopt;
    }
    return contained;
}

bool RecordingCatalog::IsDeletedSegmentId(
    const std::string& segment_id) const {
    std::lock_guard lock(mu_);
    const auto segment = segments_.find(segment_id);
    return tombstones_v2_.count(segment_id) || tombstones_.find(segment_id) != tombstones_.end() ||
        (segment != segments_.end() && segment->second.lifecycle == RecordingLifecycle::Deleted);
}

std::optional<std::pair<std::filesystem::path, std::filesystem::path>>
RecordingCatalog::FindSegmentMediaLocation(const std::string& segment_id) const {
    std::lock_guard lock(mu_);
    const auto segment = segments_.find(segment_id);
    const auto path = media_relpaths_.find(segment_id);
    if(segments_v2_.count(segment_id)) {
        if(path==media_relpaths_.end()||EffectiveLifecycleV2Locked(segment_id)!=RecordingLifecycle::Finalized)return std::nullopt;
        return std::make_pair(options_.media_root,std::filesystem::path(path->second));
    }
    if (segment == segments_.end() || path == media_relpaths_.end() ||
        segment->second.lifecycle != RecordingLifecycle::Finalized) return std::nullopt;
    return std::make_pair(options_.media_root, std::filesystem::path(path->second));
}

std::vector<EventRecordingLinkV1> RecordingCatalog::ListEventLinks(
    EventRecordingLinkStatus status) const {
    std::lock_guard lock(mu_);
    std::vector<EventRecordingLinkV1> result;
    for (const auto& [_, link] : event_links_) {
        if (link.status == status) result.push_back(link);
    }
    std::sort(result.begin(), result.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.updated_at_ms != rhs.updated_at_ms) {
            return lhs.updated_at_ms < rhs.updated_at_ms;
        }
        return lhs.link_id < rhs.link_id;
    });
    return result;
}

bool RecordingCatalog::AcquireEventSourceLease(
    const std::string& channel_id,
    const std::string& stream_epoch_id,
    const std::vector<std::string>& segment_ids,
    EventSourceLease* lease,
    std::string* error) {
    if (lease == nullptr || channel_id.empty() || stream_epoch_id.empty() ||
        segment_ids.empty()) {
        return Fail(error, "event source lease 인자가 유효하지 않음");
    }
    std::lock_guard lock(mu_);
    std::unordered_set<std::string> unique;
    if(!CanWriteLocked(error))return false;
    std::vector<RetentionCandidate> acquired;
    acquired.reserve(segment_ids.size());
    for (const auto& segment_id : segment_ids) {
        if (!unique.insert(segment_id).second) {
            return Fail(error, "event source lease segment ID가 중복됨");
        }
        const auto segment = segments_.find(segment_id);
        const auto path = media_relpaths_.find(segment_id);
        if (segment == segments_.end() || path == media_relpaths_.end() ||
            segment->second.lifecycle != RecordingLifecycle::Finalized ||
            segment->second.retention_class != RecordingRetentionClass::Continuous ||
            segment->second.channel_id != channel_id ||
            segment->second.stream_epoch_id != stream_epoch_id) {
            return Fail(error, "event source lease 대상이 같은 epoch의 finalized continuous segment가 아님");
        }
        constexpr auto kMaxPersistentHoldCount =
            static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
        const auto hold = hold_counts_.find(segment_id);
        const std::uint64_t current_hold =
            hold == hold_counts_.end() ? 0 : hold->second;
        if (current_hold >= kMaxPersistentHoldCount) {
            return Fail(error, "event source hold_count가 int64 저장 범위를 넘음");
        }
        std::filesystem::path contained;
        if (!ResolveContainedMediaPath(options_.media_root, path->second, &contained) ||
            !std::filesystem::is_regular_file(contained)) {
            return Fail(error, "event source lease media 경로가 유효하지 않음");
        }
        RetentionCandidate candidate;
        candidate.segment = segment->second;
        candidate.media_path = std::move(contained);
        candidate.hold_count = current_hold + 1;
        acquired.push_back(std::move(candidate));
    }
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) {
        if (!Exec(sqlite_db_, "BEGIN IMMEDIATE", error)) return false;
        for (const auto& candidate : acquired) {
            sqlite3_stmt* statement = nullptr;
            if (sqlite3_prepare_v2(sqlite_db_,
                                   "UPDATE recording_segments SET hold_count=hold_count+1 WHERE segment_id=? AND lifecycle='finalized'",
                                   -1, &statement, nullptr) != SQLITE_OK) {
                Exec(sqlite_db_, "ROLLBACK", nullptr);
                return Fail(error, sqlite3_errmsg(sqlite_db_));
            }
            BindText(statement, 1, candidate.segment.segment_id);
            const bool ok = sqlite3_step(statement) == SQLITE_DONE &&
                            sqlite3_changes(sqlite_db_) == 1;
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement);
            if (!ok) {
                Exec(sqlite_db_, "ROLLBACK", nullptr);
                return Fail(error, message.empty() ? "event source hold 갱신 실패" : message);
            }
        }
        if (!Exec(sqlite_db_, "COMMIT", error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr);
            return false;
        }
    }
#endif
    for (const auto& candidate : acquired) {
        ++hold_counts_[candidate.segment.segment_id];
    }
    lease->sources = std::move(acquired);
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingCatalog::ReleaseEventSourceLease(const EventSourceLease& lease,
                                                std::string* error) {
    std::lock_guard lock(mu_);
    if(!CanWriteLocked(error))return false;
    if (lease.sources.empty()) {
        if (error != nullptr) error->clear();
        return true;
    }
    for (const auto& candidate : lease.sources) {
        const auto hold = hold_counts_.find(candidate.segment.segment_id);
        if (hold == hold_counts_.end() || hold->second == 0) {
            return Fail(error, "event source lease hold가 이미 해제됨");
        }
    }
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) {
        if (!Exec(sqlite_db_, "BEGIN IMMEDIATE", error)) return false;
        for (const auto& candidate : lease.sources) {
            sqlite3_stmt* statement = nullptr;
            if (sqlite3_prepare_v2(sqlite_db_,
                                   "UPDATE recording_segments SET hold_count=hold_count-1 WHERE segment_id=? AND hold_count>0",
                                   -1, &statement, nullptr) != SQLITE_OK) {
                Exec(sqlite_db_, "ROLLBACK", nullptr);
                return Fail(error, sqlite3_errmsg(sqlite_db_));
            }
            BindText(statement, 1, candidate.segment.segment_id);
            const bool ok = sqlite3_step(statement) == SQLITE_DONE &&
                            sqlite3_changes(sqlite_db_) == 1;
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement);
            if (!ok) {
                Exec(sqlite_db_, "ROLLBACK", nullptr);
                return Fail(error, message.empty() ? "event source hold 해제 실패" : message);
            }
        }
        if (!Exec(sqlite_db_, "COMMIT", error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr);
            return false;
        }
    }
#endif
    for (const auto& candidate : lease.sources) {
        auto hold = hold_counts_.find(candidate.segment.segment_id);
        if (--hold->second == 0) hold_counts_.erase(hold);
    }
    if (error != nullptr) error->clear();
    return true;
}

bool RecordingCatalog::AdjustHoldCount(const std::string& segment_id,
                                       std::int64_t delta,
                                       std::string* error) {
    std::lock_guard lock(mu_);
    return AdjustHoldCountLocked(segment_id,delta,error);
}
bool RecordingCatalog::AdjustHoldCountLocked(const std::string& segment_id,std::int64_t delta,std::string* error) {
    if(!CanWriteLocked(error))return false;
    const auto segment = segments_.find(segment_id);
    const bool v2=segments_v2_.count(segment_id)!=0;
    if ((v2&&EffectiveLifecycleV2Locked(segment_id)!=RecordingLifecycle::Finalized)||
        (!v2&&(segment == segments_.end() || segment->second.lifecycle != RecordingLifecycle::Finalized))) {
        return Fail(error, "hold 대상 finalized segment가 없음");
    }
    const std::uint64_t current = hold_counts_[segment_id];
    const std::uint64_t magnitude = delta < 0
                                        ? static_cast<std::uint64_t>(-(delta + 1)) + 1
                                        : static_cast<std::uint64_t>(delta);
    if (delta < 0 && magnitude > current) {
        return Fail(error, "hold_count는 음수가 될 수 없음");
    }
    constexpr auto kMaxPersistentHoldCount =
        static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
    if (delta >= 0 && magnitude > kMaxPersistentHoldCount - current) {
        return Fail(error, "hold_count가 int64 저장 범위를 넘음");
    }
    const std::uint64_t next = delta >= 0 ? current + magnitude : current - magnitude;
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) {
        sqlite3_stmt* statement = nullptr;
        if (sqlite3_prepare_v2(sqlite_db_,
                               v2?"UPDATE recording_segment_states_v2 SET hold_count=? WHERE segment_id=?":
                                  "UPDATE recording_segments SET hold_count=? WHERE segment_id=?",
                               -1, &statement, nullptr) != SQLITE_OK) {
            return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        sqlite3_bind_int64(statement, 1, static_cast<sqlite3_int64>(next));
        BindText(statement, 2, segment_id);
        const bool ok = sqlite3_step(statement) == SQLITE_DONE &&
                        sqlite3_changes(sqlite_db_) == 1;
        if (!ok) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement);
            return Fail(error, message);
        }
        sqlite3_finalize(statement);
    }
#endif
    if (next == 0) hold_counts_.erase(segment_id);
    else hold_counts_[segment_id] = next;
    if (error != nullptr) error->clear();
    return true;
}

RecordingOrphanReport RecordingCatalog::InspectOrphans() const {
    std::lock_guard lock(mu_);
    RecordingOrphanReport report;
    std::error_code error;
    if (!std::filesystem::exists(options_.media_root, error)) return report;
    for (const auto& entry : std::filesystem::recursive_directory_iterator(options_.media_root, error)) {
        if (error || !entry.is_regular_file()) continue;
        if (entry.path().extension() != ".mp4" && entry.path().extension() != ".ts" &&
            entry.path().extension() != ".webm") continue;
        bool known = false;
        const auto relative = entry.path().lexically_relative(options_.media_root).generic_string();
        for (const auto& [_, path] : media_relpaths_) if (path == relative) { known = true; break; }
        if (known) continue;
        if (IsRecognizedMedia(entry.path())) { ++report.normal_orphan_count; report.normal_orphans.push_back(entry.path()); }
        else { ++report.corrupt_orphan_count; report.corrupt_orphans.push_back(entry.path()); }
    }
    return report;
}

bool RecordingCatalog::OpenSqliteLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error;
    return false;
#else
    std::error_code fs_error;
    if (!options_.sqlite_path.parent_path().empty()) std::filesystem::create_directories(options_.sqlite_path.parent_path(), fs_error);
    if (fs_error) return false;
    const bool existed = std::filesystem::exists(options_.sqlite_path);
    if (sqlite3_open(options_.sqlite_path.string().c_str(), &sqlite_db_) != SQLITE_OK) {
        CloseSqliteLocked();
    } else {
        sqlite3_stmt* statement = nullptr;
        bool healthy = sqlite3_prepare_v2(sqlite_db_, "PRAGMA quick_check", -1, &statement, nullptr) == SQLITE_OK;
        if (healthy && sqlite3_step(statement) == SQLITE_ROW) {
            const auto* text = sqlite3_column_text(statement, 0);
            healthy = text != nullptr && std::string(reinterpret_cast<const char*>(text)) == "ok";
        } else healthy = false;
        if (statement != nullptr) sqlite3_finalize(statement);
        if (healthy) return InitializeSqliteSchemaLocked(error);
        CloseSqliteLocked();
    }
    if (existed) {
        const auto quarantine = options_.sqlite_path.string() + ".corrupt-" + std::to_string(NowMs());
        std::filesystem::rename(options_.sqlite_path, quarantine, fs_error);
        if (fs_error) return false;
        recovery_report_.sqlite_quarantined = true;
        recovery_report_.sqlite_quarantine_path = quarantine;
    }
    if (sqlite3_open(options_.sqlite_path.string().c_str(), &sqlite_db_) != SQLITE_OK) { CloseSqliteLocked(); return false; }
    return InitializeSqliteSchemaLocked(error);
#endif
}

bool RecordingCatalog::InitializeSqliteSchemaLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error; return false;
#else
    const char* schema = R"SQL(
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS recording_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_mutations(mutation_id TEXT PRIMARY KEY, type TEXT NOT NULL, occurred_at_ms INTEGER NOT NULL, entity_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_segments(segment_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, channel_id TEXT NOT NULL, stream_epoch_id TEXT NOT NULL, start_utc_ms INTEGER NOT NULL, end_utc_ms INTEGER NOT NULL, start_pts INTEGER NOT NULL, end_pts INTEGER NOT NULL, time_base_num INTEGER NOT NULL, time_base_den INTEGER NOT NULL, container TEXT NOT NULL, codecs_json TEXT NOT NULL, size_bytes INTEGER NOT NULL, checksum_sha256 TEXT NOT NULL, retention_class TEXT NOT NULL, lifecycle TEXT NOT NULL, pinned INTEGER NOT NULL, hold_count INTEGER NOT NULL DEFAULT 0, media_relpath TEXT NOT NULL, created_at_ms INTEGER NOT NULL, finalized_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recording_segments_v2(segment_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL,media_relpath TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_source_bindings(segment_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_derived_jobs(job_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_consumer_references(reference_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_derived_accepted_references(reference_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_referenced_observations(observation_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_segment_states_v2(segment_id TEXT PRIMARY KEY,lifecycle TEXT NOT NULL,reason TEXT NOT NULL,tombstone_json TEXT NOT NULL,hold_count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS recording_event_links(link_id TEXT PRIMARY KEY, event_id TEXT UNIQUE NOT NULL, channel_id TEXT NOT NULL, requested_start_ms INTEGER NOT NULL, requested_end_ms INTEGER NOT NULL, derived_segment_id TEXT, fallback_ref TEXT, completeness TEXT NOT NULL, missing_ranges_json TEXT NOT NULL, display_priority INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS recording_event_link_segments(link_id TEXT NOT NULL REFERENCES recording_event_links(link_id) ON DELETE CASCADE, segment_id TEXT NOT NULL REFERENCES recording_segments(segment_id), overlap_start_ms INTEGER NOT NULL, overlap_end_ms INTEGER NOT NULL, PRIMARY KEY(link_id, segment_id));
CREATE TABLE IF NOT EXISTS recording_observations(observation_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, segment_id TEXT NOT NULL REFERENCES recording_segments(segment_id), utc_ms INTEGER NOT NULL, pts INTEGER NOT NULL, track_id TEXT, class_id TEXT, class_name TEXT, confidence REAL, bbox_json TEXT, event_id TEXT, selection_reason TEXT, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_observations_v2(observation_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, segment_id TEXT, pts INTEGER NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recording_tombstones(entity_id TEXT PRIMARY KEY, entity_kind TEXT NOT NULL, channel_id TEXT, start_utc_ms INTEGER, end_utc_ms INTEGER, deleted_at_ms INTEGER, reason TEXT, retention_class TEXT, checksum_sha256 TEXT);
CREATE INDEX IF NOT EXISTS idx_recording_segments_channel_range ON recording_segments(channel_id,start_utc_ms,end_utc_ms);
CREATE INDEX IF NOT EXISTS idx_recording_segments_retention_end ON recording_segments(retention_class,end_utc_ms);
CREATE INDEX IF NOT EXISTS idx_recording_observations_channel_time_track ON recording_observations(channel_id,utc_ms,track_id);
CREATE INDEX IF NOT EXISTS idx_recording_event_links_event ON recording_event_links(event_id);
INSERT OR REPLACE INTO recording_meta(key,value) VALUES('schema_version','1');
)SQL";
    return Exec(sqlite_db_, schema, error);
#endif
}

bool RecordingCatalog::RebuildSqliteLocked(std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)error; return true;
#else
    const auto replay = journal_.Replay();
    if (replay.io_error_count != 0) return Fail(error, "journal replay I/O 오류로 SQLite rebuild 거부");
    if (replay.unsupported_record_count != 0) return Fail(error, "미지원 journal record로 SQLite rebuild 거부");
    if (!PreflightV2Locked(replay,error)) return false;
    if (!Exec(sqlite_db_, "BEGIN; DELETE FROM recording_derived_accepted_references; DELETE FROM recording_derived_jobs; DELETE FROM recording_referenced_observations; DELETE FROM recording_consumer_references; DELETE FROM recording_source_bindings; DELETE FROM recording_event_link_segments; DELETE FROM recording_event_links; DELETE FROM recording_observations; DELETE FROM recording_observations_v2; DELETE FROM recording_segment_states_v2; DELETE FROM recording_segments_v2; DELETE FROM recording_segments; DELETE FROM recording_tombstones; DELETE FROM recording_mutations; COMMIT;", error)) return false;
    for (std::size_t ordinal = 0; ordinal < replay.mutations.size(); ++ordinal) {
        const auto& mutation = replay.mutations[ordinal];
        if (mutation.mutation_type == RecordingMutationType::SegmentFinalized ||
            mutation.mutation_type == RecordingMutationType::SegmentV2State ||
            mutation.mutation_type == RecordingMutationType::SegmentV2Deleted ||
            mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
            mutation.mutation_type == RecordingMutationType::SegmentV2BoundFinalized ||
            mutation.mutation_type == RecordingMutationType::CorruptionDetected) {
            const auto accepted = accepted_segment_state_mutations_.find(mutation.mutation_id);
            if (accepted_segment_state_replay_ordinals_.count(ordinal) == 0 ||
                accepted == accepted_segment_state_mutations_.end() ||
                accepted->second != SerializeRecordingMutationV1(mutation)) continue;
        }
        if (!ProjectMutationSqliteLocked(mutation, error)) return false;
    }
    return true;
#endif
}

bool RecordingCatalog::ProjectMutationSqliteLocked(const RecordingMutationV1& mutation, std::string* error) {
#if !MEDIA_SERVER_USE_SQLITE3
    (void)mutation; (void)error; return true;
#else
    if (!Exec(sqlite_db_, "BEGIN", error)) return false;
    sqlite3_stmt* statement = nullptr;
    if (sqlite3_prepare_v2(sqlite_db_, "INSERT OR IGNORE INTO recording_mutations VALUES(?,?,?,?)", -1, &statement, nullptr) != SQLITE_OK) { Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_)); }
    BindText(statement, 1, mutation.mutation_id); BindText(statement, 2, RecordingMutationTypeName(mutation.mutation_type));
    sqlite3_bind_int64(statement, 3, mutation.occurred_at_ms); BindText(statement, 4, mutation.entity_id);
    const int mutation_step = sqlite3_step(statement);
    const bool inserted = mutation_step == SQLITE_DONE && sqlite3_changes(sqlite_db_) > 0;
    const std::string mutation_error =
        mutation_step == SQLITE_DONE ? std::string() : sqlite3_errmsg(sqlite_db_);
    sqlite3_finalize(statement);
    if (mutation_step != SQLITE_DONE) {
        Exec(sqlite_db_, "ROLLBACK", nullptr);
        return Fail(error, mutation_error);
    }
    if (!inserted) return Exec(sqlite_db_, "COMMIT", error);
    if(IsDerivedJobMutation(mutation.mutation_type)) {
        DerivedJobRecordV1 job;
        if(!ParseDerivedJobRecord(mutation.payload_json,&job,error)||
           sqlite3_prepare_v2(sqlite_db_,"INSERT OR REPLACE INTO recording_derived_jobs VALUES(?,?)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        BindText(statement,1,job.intent.job_id);BindText(statement,2,SerializeDerivedJobRecord(job));
        const bool ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,"derived job SQLite projection 실패");}
        if(mutation.mutation_type==RecordingMutationType::DerivedJobCommitted) {
            for(std::size_t i=0;i<job.ready->outputs.size();++i) {
                const auto& s=job.ready->outputs[i].segment;
                if(sqlite3_prepare_v2(sqlite_db_,"INSERT OR IGNORE INTO recording_segments_v2 VALUES(?,?,?)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
                BindText(statement,1,s.segment_id);BindText(statement,2,SerializeRecordingSegmentV2(s));BindText(statement,3,job.intent.outputs[i].final_relpath);
                const bool inserted=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
                if(!inserted){Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,"derived output SQLite 원자 INSERT 실패");}
                if(sqlite3_prepare_v2(sqlite_db_,"INSERT OR IGNORE INTO recording_segment_states_v2 VALUES(?,'finalized','','',0)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
                BindText(statement,1,s.segment_id);const bool state=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
                if(!state){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
            }
        }
    } else if (mutation.mutation_type == RecordingMutationType::ReferencedObservationPut) {
        ReferencedObservationV1 pair;
        if(!ParseReferencedObservationV1(mutation.payload_json,&pair,error)) {Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        const auto merged=referenced_observations_.find(pair.observation.observation_id);
        if(merged!=referenced_observations_.end())pair=merged->second;
        if(
           sqlite3_prepare_v2(sqlite_db_,"INSERT OR REPLACE INTO recording_referenced_observations VALUES(?,?)",-1,&statement,nullptr)!=SQLITE_OK) {
            Exec(sqlite_db_,"ROLLBACK",nullptr);return false;
        }
        BindText(statement,1,pair.observation.observation_id);BindText(statement,2,SerializeReferencedObservationV1(pair));
        const bool ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
    } else if (mutation.mutation_type == RecordingMutationType::ConsumerReferencePut ||
               mutation.mutation_type == RecordingMutationType::DerivedReferenceAccepted) {
        const auto json=ObjectField(mutation.payload_json,"reference");RecordingConsumerReferenceV1 reference;
        const char* sql=mutation.mutation_type==RecordingMutationType::DerivedReferenceAccepted
            ? "INSERT OR IGNORE INTO recording_derived_accepted_references VALUES(?,?)"
            : "INSERT OR IGNORE INTO recording_consumer_references VALUES(?,?)";
        if(!json||!ParseRecordingConsumerReferenceV1(*json,&reference,error)||
           sqlite3_prepare_v2(sqlite_db_,sql,-1,&statement,nullptr)!=SQLITE_OK) {
            Exec(sqlite_db_,"ROLLBACK",nullptr);return false;
        }
        BindText(statement,1,reference.reference_id);BindText(statement,2,SerializeRecordingConsumerReferenceV1(reference));
        const bool ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
    } else if (mutation.mutation_type == RecordingMutationType::SegmentFinalized) {
        const auto segment_json = ObjectField(mutation.payload_json, "segment");
        const auto relpath = StringField(mutation.payload_json, "mediaRelpath");
        RecordingSegmentV1 s;
        if (!segment_json || !relpath || !ParseRecordingSegmentV1(*segment_json, &s, error)) { Exec(sqlite_db_, "ROLLBACK", nullptr); return false; }
        const char* sql = "INSERT OR IGNORE INTO recording_segments VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) { Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_)); }
        int i=1; BindText(statement,i++,s.segment_id); BindText(statement,i++,s.source_id); BindText(statement,i++,s.channel_id); BindText(statement,i++,s.stream_epoch_id);
        sqlite3_bind_int64(statement,i++,s.start.utc_ms); sqlite3_bind_int64(statement,i++,s.end.utc_ms); sqlite3_bind_int64(statement,i++,s.start.pts); sqlite3_bind_int64(statement,i++,s.end.pts); sqlite3_bind_int(statement,i++,s.start.time_base_num); sqlite3_bind_int(statement,i++,s.start.time_base_den);
        BindText(statement,i++,s.container); BindText(statement,i++,SerializeRecordingSegmentV1(s)); sqlite3_bind_int64(statement,i++,static_cast<sqlite3_int64>(s.size_bytes)); BindText(statement,i++,s.checksum_sha256); BindText(statement,i++,RetentionName(s.retention_class)); BindText(statement,i++,LifecycleName(s.lifecycle)); sqlite3_bind_int(statement,i++,s.pinned?1:0); BindText(statement,i++,*relpath); sqlite3_bind_int64(statement,i++,s.created_at_ms); sqlite3_bind_int64(statement,i++,s.finalized_at_ms);
        if (sqlite3_step(statement) != SQLITE_DONE) { const std::string message=sqlite3_errmsg(sqlite_db_); sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error,message); }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::SegmentV2Finalized ||
               mutation.mutation_type == RecordingMutationType::SegmentV2BoundFinalized) {
        ingress::StrictJsonObjectDocument payload;
        if(!ingress::ParseStrictJsonObjectDocument(mutation.payload_json,&payload,error)){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        const auto json=ingress::StrictJsonObjectField(payload,"segment");
        const auto relative=ingress::StrictJsonStringField(payload,"mediaRelpath");RecordingSegmentV2 v;
        if(!json||!relative||!ParseRecordingSegmentV2(*json,&v,error)||
           sqlite3_prepare_v2(sqlite_db_,"INSERT OR IGNORE INTO recording_segments_v2 VALUES(?,?,?)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        BindText(statement,1,v.segment_id);BindText(statement,2,SerializeRecordingSegmentV2(v));BindText(statement,3,*relative);
        const bool ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,"V2 SQLite INSERT 실패");}
        if(sqlite3_prepare_v2(sqlite_db_,"INSERT OR IGNORE INTO recording_segment_states_v2 VALUES(?,'finalized','','',0)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        BindText(statement,1,v.segment_id);const bool state_ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!state_ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        if(mutation.mutation_type==RecordingMutationType::SegmentV2BoundFinalized) {
            const auto json=ingress::StrictJsonObjectField(payload,"sourceBinding");RecordingSourceBindingV1 binding;
            if(!json||!ParseRecordingSourceBindingV1(*json,&binding,error)||
               sqlite3_prepare_v2(sqlite_db_,"INSERT INTO recording_source_bindings VALUES(?,?)",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
            BindText(statement,1,v.segment_id);BindText(statement,2,SerializeRecordingSourceBindingV1(binding));
            const bool binding_ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
            if(!binding_ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        }
    } else if(mutation.mutation_type==RecordingMutationType::SegmentV2State ||
              mutation.mutation_type==RecordingMutationType::SegmentV2Deleted) {
        const bool deleted=mutation.mutation_type==RecordingMutationType::SegmentV2Deleted;
        RecordingSegmentStateV2 state;RecordingTombstoneV2 tombstone;
        if((deleted&&!ParseRecordingTombstoneV2(mutation.payload_json,&tombstone,error))||
           (!deleted&&!ParseRecordingSegmentStateV2(mutation.payload_json,&state,error))){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        if(sqlite3_prepare_v2(sqlite_db_,"UPDATE recording_segment_states_v2 SET lifecycle=?,reason=?,tombstone_json=? WHERE segment_id=?",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        BindText(statement,1,deleted?"deleted":LifecycleName(state.lifecycle));
        BindText(statement,2,deleted?tombstone.deletion_reason:state.reason);
        BindText(statement,3,deleted?SerializeRecordingTombstoneV2(tombstone):"");BindText(statement,4,mutation.entity_id);
        const bool state_ok=sqlite3_step(statement)==SQLITE_DONE&&sqlite3_changes(sqlite_db_)==1;sqlite3_finalize(statement);
        if(!state_ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        if(deleted) {
            if(sqlite3_prepare_v2(sqlite_db_,"DELETE FROM recording_segments_v2 WHERE segment_id=?",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
            BindText(statement,1,mutation.entity_id);const bool ok=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
            if(!ok){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        }
    } else if (mutation.mutation_type == RecordingMutationType::EventLinkCreated) {
        const auto link_json=ObjectField(mutation.payload_json,"link"); EventRecordingLinkV1 link;
        if(!link_json||!ParseEventRecordingLinkV1(*link_json,&link,error)){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        const char* sql="INSERT OR REPLACE INTO recording_event_links VALUES(?,?,?,?,?,?,?,?,?,0)";
        sqlite3_prepare_v2(sqlite_db_,sql,-1,&statement,nullptr); int i=1; BindText(statement,i++,link.link_id); BindText(statement,i++,link.event_id); BindText(statement,i++,link.channel_id); sqlite3_bind_int64(statement,i++,link.requested_range.has_value()?link.requested_range->start_ms:0); sqlite3_bind_int64(statement,i++,link.requested_range.has_value()?link.requested_range->end_ms:0); BindText(statement,i++,link.derived_segment_id.value_or("")); BindText(statement,i++,link.fallback_evidence_id.value_or("")); BindText(statement,i++,EventStatusName(link.status)); BindText(statement,i++,SerializeEventRecordingLinkV1(link));
        if(sqlite3_step(statement)!=SQLITE_DONE){const std::string message=sqlite3_errmsg(sqlite_db_);sqlite3_finalize(statement);Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,message);} sqlite3_finalize(statement);
        if(sqlite3_prepare_v2(sqlite_db_,"DELETE FROM recording_event_link_segments WHERE link_id=?",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,sqlite3_errmsg(sqlite_db_));}BindText(statement,1,link.link_id);if(sqlite3_step(statement)!=SQLITE_DONE){const std::string message=sqlite3_errmsg(sqlite_db_);sqlite3_finalize(statement);Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,message);}sqlite3_finalize(statement);
        for(const auto& overlap:link.ordered_overlaps){sqlite3_prepare_v2(sqlite_db_,"INSERT INTO recording_event_link_segments VALUES(?,?,?,?)",-1,&statement,nullptr);BindText(statement,1,link.link_id);BindText(statement,2,overlap.segment_id);sqlite3_bind_int64(statement,3,overlap.range.start_ms);sqlite3_bind_int64(statement,4,overlap.range.end_ms);if(sqlite3_step(statement)!=SQLITE_DONE){const std::string message=sqlite3_errmsg(sqlite_db_);sqlite3_finalize(statement);Exec(sqlite_db_,"ROLLBACK",nullptr);return Fail(error,message);}sqlite3_finalize(statement);}
    } else if (mutation.mutation_type == RecordingMutationType::ObservationV2Put) {
        const auto json = ObjectField(mutation.payload_json, "observation");
        AnalysisObservationV2 observation;
        if (!json || !ParseAnalysisObservationV2(*json, &observation, error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return false;
        }
        // V2 projection은 Apply가 identity검증·사유병합을 마친 유효상태에서만 생성한다.
        // 재구축 중 거부된 원장행을 다시 신뢰해 memory와 다른 SQLite행을 만들지 않는다.
        const auto valid = observations_v2_.find(mutation.entity_id);
        if (valid == observations_v2_.end()) {
            return Exec(sqlite_db_, "COMMIT", error);
        }
        observation = valid->second;
        if (sqlite3_prepare_v2(sqlite_db_, "INSERT OR REPLACE INTO recording_observations_v2 VALUES(?,?,?,?,?)", -1,
                              &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, observation.observation_id);
        BindText(statement, 2, observation.channel_id);
        if (observation.frame_locator) BindText(statement, 3, observation.frame_locator->segment_id);
        else sqlite3_bind_null(statement, 3);
        sqlite3_bind_int64(statement, 4, observation.pts);
        BindText(statement, 5, SerializeAnalysisObservationV2(observation));
        const bool ok = sqlite3_step(statement) == SQLITE_DONE;
        sqlite3_finalize(statement); statement = nullptr;
        if (!ok) { Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_)); }
    } else if (mutation.mutation_type == RecordingMutationType::ObservationPut) {
        const auto observation_json = ObjectField(mutation.payload_json, "observation");
        AnalysisObservationV1 observation;
        if (!observation_json || !ParseAnalysisObservationV1(*observation_json, &observation, error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return false;
        }
        const char* sql = "INSERT OR REPLACE INTO recording_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        int i = 1;
        BindText(statement, i++, observation.observation_id);
        BindText(statement, i++, observation.channel_id);
        BindText(statement, i++, observation.frame_locator.segment_id);
        sqlite3_bind_int64(statement, i++, observation.frame_locator.frame.utc_ms);
        sqlite3_bind_int64(statement, i++, observation.frame_locator.frame.pts);
        BindText(statement, i++, observation.track_id);
        BindText(statement, i++, observation.class_label);
        BindText(statement, i++, observation.class_label);
        sqlite3_bind_double(statement, i++, observation.confidence);
        std::ostringstream bbox;
        bbox << "{\"x\":" << observation.bbox.x << ",\"y\":" << observation.bbox.y
             << ",\"width\":" << observation.bbox.width << ",\"height\":"
             << observation.bbox.height << "}";
        BindText(statement, i++, bbox.str());
        BindText(statement, i++, observation.event_ids.empty() ? "" : observation.event_ids.front());
        BindText(statement, i++, observation.selection_reason);
        BindText(statement, i++, *observation_json);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::CorruptionDetected) {
        if (sqlite3_prepare_v2(sqlite_db_,
            "UPDATE recording_segments SET lifecycle='corrupt' WHERE segment_id=? AND lifecycle='finalized'",
            -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, mutation.entity_id);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::DeletionRequested) {
        if (sqlite3_prepare_v2(sqlite_db_,
                               "UPDATE recording_segments SET lifecycle='deletion_pending' WHERE segment_id=?",
                               -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, mutation.entity_id);
        if (sqlite3_step(statement) != SQLITE_DONE || sqlite3_changes(sqlite_db_) != 1) {
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr);
            return Fail(error, "SQLite 삭제 요청 대상 segment가 없음");
        }
        sqlite3_finalize(statement);
    } else if (mutation.mutation_type == RecordingMutationType::DeletionCompleted) {
        const auto tombstone_json = ObjectField(mutation.payload_json, "tombstone");
        RecordingTombstoneV1 tombstone;
        if (!tombstone_json || !ParseRecordingTombstoneV1(*tombstone_json, &tombstone, error)) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return false;
        }
        const char* sql = "INSERT OR REPLACE INTO recording_tombstones VALUES(?,?,?,?,?,?,?,?,?)";
        if (sqlite3_prepare_v2(sqlite_db_, sql, -1, &statement, nullptr) != SQLITE_OK) {
            Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, sqlite3_errmsg(sqlite_db_));
        }
        BindText(statement, 1, tombstone.segment_id);
        BindText(statement, 2, "segment");
        BindText(statement, 3, tombstone.channel_id);
        sqlite3_bind_int64(statement, 4, tombstone.recorded_range.start_ms);
        sqlite3_bind_int64(statement, 5, tombstone.recorded_range.end_ms);
        sqlite3_bind_int64(statement, 6, tombstone.deleted_at_ms);
        BindText(statement, 7, tombstone.deletion_reason);
        BindText(statement, 8, RetentionName(tombstone.retention_class));
        BindText(statement, 9, tombstone.checksum_sha256);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
        if(sqlite3_prepare_v2(sqlite_db_,"DELETE FROM recording_segments_v2 WHERE segment_id=?",-1,&statement,nullptr)!=SQLITE_OK){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        BindText(statement,1,tombstone.segment_id);
        const bool v2_deleted=sqlite3_step(statement)==SQLITE_DONE;sqlite3_finalize(statement);
        if(!v2_deleted){Exec(sqlite_db_,"ROLLBACK",nullptr);return false;}
        sqlite3_prepare_v2(sqlite_db_,
                           "UPDATE recording_segments SET lifecycle='deleted', media_relpath='' WHERE segment_id=?",
                           -1, &statement, nullptr);
        BindText(statement, 1, tombstone.segment_id);
        if (sqlite3_step(statement) != SQLITE_DONE) {
            const std::string message = sqlite3_errmsg(sqlite_db_);
            sqlite3_finalize(statement); Exec(sqlite_db_, "ROLLBACK", nullptr); return Fail(error, message);
        }
        sqlite3_finalize(statement);
    }
    return Exec(sqlite_db_, "COMMIT", error);
#endif
}

void RecordingCatalog::CloseSqliteLocked() {
#if MEDIA_SERVER_USE_SQLITE3
    if (sqlite_db_ != nullptr) sqlite3_close(sqlite_db_);
#endif
    sqlite_db_ = nullptr;
}

}  // namespace recording
