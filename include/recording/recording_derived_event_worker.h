// 파일 용도: 내부 opt-in 이벤트 작업 실행기. 공개 route/default 구성과 독립적이다.
#pragma once
#include "analysis/analysis_types.h"
#include "recording/recording_catalog.h"
#include "recording/recording_derived_selection.h"
#include <array>
#include <atomic>
#include <condition_variable>
#include <deque>
#include <functional>
#include <list>
#include <memory>
#include <thread>

namespace recording {
class DerivedJobService;
struct DerivedEventEvidenceUpdate {
    std::string source_id,channel_id;
    std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence;
};
enum class DerivedEventDiagnosticReason {
    MultipleTimeCandidates, UnconfirmedInterval, OriginalDeleted, OriginalCoverageUnconfirmed,
    DirectTimeInterval, MultipleUtcCandidates, UnconfirmedUtcMapping, PiecewiseUtc,
    MissingOriginalIdentity, Other, Count
};
struct DerivedEventSourceDiagnostic {
    std::string segment_id,media_epoch_id,source_generation,track_id;
    std::uint64_t generation_order{0};
    std::int64_t start_pts{0};std::optional<std::int64_t> end_pts;
    std::int32_t time_base_num{0},time_base_den{0};
    RecordingLifecycle lifecycle{RecordingLifecycle::Unknown};
    bool deleted{false},binding_present{false},binding_valid{false},available_for_selection{false};
};
struct DerivedEventDecodedDiagnostic {
    // 여기서는 UTC 요청 좌표와 디코딩된 미디어 PTS를 비교할 수 없다.
    bool namespace_valid{false},range_comparable{false},incomplete{false},frames_truncated{false};
    std::size_t frame_count{0},relevant_count{0},identity_matched{0},identity_rejected{0},
        generation_mismatch{0},pts_mismatch{0},duration_invalid{0};
    std::optional<std::int64_t> minimum_pts_ns,maximum_pts_ns,maximum_valid_end_ns;
};
struct DerivedEventUnknownDiagnostic {
    std::int64_t start_ns{0},end_ns{0};
    DerivedEventDiagnosticReason reason{DerivedEventDiagnosticReason::Other};
};
struct DerivedEventAttemptDiagnostic {
    // 판정 시점 스냅샷. 콜백 시간은 포함하지 않으며 대기 예산에도 더하지 않는다.
    std::size_t attempt{0},attempt_limit{0};std::int64_t elapsed_ms{0},wait_ms{0};
    bool deadline_exhausted{false},attempt_exhausted{false},selection_complete{false};
    std::int64_t expanded_start_ns{0},expanded_end_ns{0};
    std::size_t source_count{0},unknown_count{0};bool sources_truncated{false},unknown_truncated{false};
    std::vector<DerivedEventSourceDiagnostic> sources;
    DerivedEventDecodedDiagnostic decoded;
    std::array<std::size_t,6> slice_state_counts{};
    std::array<std::size_t,static_cast<std::size_t>(DerivedEventDiagnosticReason::Count)> reason_counts{};
    std::vector<DerivedEventUnknownDiagnostic> unknown_ranges;
};
// 크기가 제한된 값 전용 요약이며 입장 API가 아니다. ID는 내부에 남기고 외부 출력기는 해시해야 한다.
DerivedEventAttemptDiagnostic BuildDerivedEventAttemptDiagnostic(
    const std::vector<RecordingDerivedSourceSnapshotEntry>&,
    const std::vector<DerivedSourceEvidence>&,const std::vector<bool>& binding_valid,
    const analysis::DecodedIntervalSnapshot&,const DerivedRecordingSelection&);
std::string SerializeDerivedEventAttemptDiagnostic(const RecordingConsumerReferenceV1&,
    const DerivedEventAttemptDiagnostic&);
struct DerivedEventWorkerOptions {
    std::size_t queue_capacity{16},max_attempts{16};
    std::int64_t wait_ms{1000},retry_ms{100};
    std::uint64_t reserved_bytes{32*1024*1024};
    // 매 평가 전에 잠금 밖 호출(대기 중 만료된 요청 포함). 기한/시도 수를 연장하지 않는다.
    // 주입자는 thread-safe/nonblocking이어야 하며 강제 중단 thread를 만들지 않는다.
    std::function<DerivedEventEvidenceUpdate(const RecordingConsumerReferenceV1&)> latest_evidence;
    std::function<std::int64_t()> now_ms;
    std::string budget_reason;
    // 명시적 활성화 전용이며 집계·콜백 예외를 모두 격리한다. 스레드 안전하며 비차단이어야 한다.
    // 작업자·카탈로그 잠금 밖에서 실제 선택 판정 입력 그대로 호출한다.
    std::function<void(const RecordingConsumerReferenceV1&,const DerivedEventAttemptDiagnostic&)> diagnostic{};
    std::int64_t source_wait_ms{0};
    std::size_t source_max_attempts{121};
};
DerivedEventWorkerOptions RecordingRuntimeEventBudget(std::int64_t segment_ms,std::int64_t post_ms);
namespace detail {
// 이미 준비된 대기 작업에만 적용한다. 같은 접수 시각은 기존 순서를 보존하고
// 활성 렌더를 선점하거나 아직 준비되지 않은 오래된 요청 때문에 대기하지 않는다.
template <class Ready> void OrderRenderReadyTail(std::list<Ready>& queue) noexcept {
    if(queue.empty())return;
    auto newest=queue.end();--newest;
    for(auto it=queue.begin();it!=newest;++it)if(newest->pending.submitted<it->pending.submitted){
        queue.splice(it,queue,newest);return;
    }
}
}
class DerivedEventWorker {
public:
    DerivedEventWorker(RecordingCatalog&,RetentionCoordinator&,DerivedJobService&,DerivedEventWorkerOptions);
    ~DerivedEventWorker();
    bool Submit(const RecordingConsumerReferenceV1&,std::shared_ptr<const analysis::DecodedIntervalSnapshot>,std::string*);
    RecordingDerivedReferenceResult Query(const std::string&);
    void StopAndDrain();
private:
    struct Pending {
        RecordingConsumerReferenceV1 reference;
        std::shared_ptr<const analysis::DecodedIntervalSnapshot> evidence;
        std::chrono::steady_clock::time_point deadline;
        std::chrono::steady_clock::time_point submitted;
        std::chrono::steady_clock::time_point next_due;
        std::chrono::steady_clock::time_point source_deadline;
        std::size_t attempts{0};
        std::uint64_t lease{0};
    };
    struct RenderPending {Pending pending;DerivedJobIntentV1 intent;};
    enum class Evaluation {Done,Retry,Ready};
    void Loop();
    void RenderLoop();
    Evaluation Process(Pending&,DerivedJobIntentV1*);
    void Finish(Pending&);
    void Status(const std::string&,const std::string&);
    RecordingCatalog& catalog_;
    RetentionCoordinator& retention_;
    DerivedJobService& service_;
    DerivedEventWorkerOptions options_;
    std::mutex mu_,stop_mu_,admission_mu_;
    std::condition_variable cv_;
    std::deque<Pending> queue_;
    std::list<RenderPending> render_queue_;
    std::unordered_set<std::string> inflight_;
    std::unordered_map<std::string,std::string> statuses_;
    std::deque<std::string> status_order_;
    std::string startup_error_;
    std::atomic<bool> stopped_{false};
    std::thread worker_;
    std::thread renderer_;
};
}
