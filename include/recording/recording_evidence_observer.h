// 내부 분석 observer: sampling/history 복사 전 최신 immutable decoded 증거를 bounded 보관한다.
#pragma once
#include "recording/recording_derived_event_worker.h"

namespace recording {
class RecordingEvidenceObserver final:public analysis::AnalysisResultObserver {
public:
    explicit RecordingEvidenceObserver(std::shared_ptr<analysis::AnalysisResultObserver> downstream={},std::size_t capacity=64);
    analysis::AnalysisObservationContext CaptureContext(const std::string&,std::int64_t) override;
    void OnResult(const analysis::AnalysisResult&) override;
    void OnStopped(const std::string&,const std::string&) override;
    DerivedEventEvidenceUpdate Latest(const RecordingConsumerReferenceV1&) const;
    void Stop();
private:
    std::shared_ptr<analysis::AnalysisResultObserver> downstream_;
    std::size_t capacity_;
    mutable std::mutex mu_;
    std::deque<DerivedEventEvidenceUpdate> entries_;
    std::atomic<bool> stopped_{false};
};
}
