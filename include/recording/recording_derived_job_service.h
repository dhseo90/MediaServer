#pragma once
// 파일 용도: 내구 job의 실제 파일 생성·게시·복구를 내부 실행 경계에서 수행한다.
#include "recording/recording_derived_job.h"
#include <filesystem>
#include <functional>
#include <memory>

namespace recording {
class RecordingCatalog;
class RecordingJournal;
enum class DerivedJobProgress {
    BeforeCreate, CreatedBeforeReceipt, ReceiptDurable, ReadyDurable,
    PublishedLink, PublishedDurable, CommittedDurable, TemporaryRemoved,
    DirectoryRemoved, BeforeTerminal, CompleteDurable
};
struct DerivedJobRunResult {
    bool complete{false},blocked{false};
    std::string reason;
    std::optional<DerivedJobRecordV1> job;
};
class DerivedJobService {
public:
    struct Options {
        std::filesystem::path root;
        std::uint32_t max_work_ms{30000};
        // 내부 진행 관측용. 호출자는 비차단 callback을 제공한다.
        std::function<void(DerivedJobProgress,std::size_t)> progress;
    };
    DerivedJobService(RecordingCatalog&,RecordingJournal&,Options);
    ~DerivedJobService();
    DerivedJobService(const DerivedJobService&)=delete;
    DerivedJobService& operator=(const DerivedJobService&)=delete;
    // 기본 구성의 전용 worker에서 실행한다. source callback에서 직접 실행하지 않는다.
    // 동일 catalog의 실행 소유는 하나이며 동시 Run은 대기열 없이 명시 거부한다.
    DerivedJobRunResult Run(const std::string& job_id,std::function<bool()> cancelled={});
    std::vector<DerivedJobRunResult> Reconcile(std::function<bool()> cancelled={});
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};
} // namespace recording
