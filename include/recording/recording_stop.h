// 파일 용도: Recorder 내부 종료 결과와 소유권 계약을 선언하며 timeout을 작업 완료·소유권 반환과 구분한다.
#pragma once
#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
namespace recording {
struct StopContext {
    using Clock = std::chrono::steady_clock;
    const Clock::time_point deadline;
    const std::uint64_t id;
    mutable std::atomic<bool> cancel_before_accept{false};
    explicit StopContext(Clock::time_point end) : deadline(end), id(Next()) {}
    bool Expired() const { return Clock::now() >= deadline; }
    bool CancelBeforeAccept() const { return cancel_before_accept.load() || Expired(); }
    static std::shared_ptr<const StopContext> Grace() {
        return std::make_shared<const StopContext>(Clock::now() + std::chrono::seconds(5));
    }
private:
    static std::uint64_t Next() { static std::atomic<std::uint64_t> next{0}; return ++next; }
};
enum class StopOutcome { Completed, CompletedWithCancellation, DeadlineUnconfirmed, Failed };
inline const char* StopOutcomeName(StopOutcome value) {
    switch(value) {
    case StopOutcome::Completed: return "Completed";
    case StopOutcome::CompletedWithCancellation: return "CompletedWithCancellation";
    case StopOutcome::DeadlineUnconfirmed: return "DeadlineUnconfirmed";
    case StopOutcome::Failed: return "Failed";
    }
    return "Failed";
}
struct WriterStopResult {
    StopOutcome outcome{StopOutcome::Failed};
    std::uint64_t accepted{0}, cancelled_before_accept{0}, finalized{0};
    bool durable_ready{false}, catalog_applied{false}, reservation_retained{false};
    bool operation_complete{false}, accepted_known{false};
};
struct RecorderStopResult {
    StopOutcome outcome{StopOutcome::Failed};
    std::uint64_t stop_id{0}, enqueued{0}, dequeued{0}, overflow{0}, cancelled{0};
    std::uint64_t recorder_admitted{0}, rejected_before_accept{0}, failed_after_accept{0};
    std::size_t unfinished{0};
    bool joined{false}, owner_released{false};
    WriterStopResult writer;
    bool Succeeded() const { return outcome==StopOutcome::Completed || outcome==StopOutcome::CompletedWithCancellation; }
};
enum class PacketOutcome { RejectedBeforeAccept, Accepted, CancelledBeforeAccept, FailedBeforeAccept, AcceptedThenFailed, Unobserved };
struct PacketResult { PacketOutcome outcome{PacketOutcome::Unobserved}; };
// 실패 파일이 남으면 기존 Retention 예약으로 소유권을 이전한다. release와 구별한다.
enum class ReservationDisposition { Release, RetainedForRecovery, RetainedNotRecoverable };
struct ReservationCompletion {
    ReservationDisposition disposition{ReservationDisposition::Release};
    std::uint64_t bytes{0};
};
} // namespace recording
