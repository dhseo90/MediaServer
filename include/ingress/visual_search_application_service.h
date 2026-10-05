// 파일 용도: Ops 영상 검색의 bounded 모델·worker 수명과 정제된 응답.
#pragma once
#include "ingress/application_service_result.h"
#include "recording/recording_visual_source.h"
#include "recording/visual_index_worker.h"
#include <atomic>
#include <unordered_map>
namespace ingress {
class EvidenceApplicationService;
class VisualSearchApplicationService {
public:
    struct Options {
        bool enabled{false};
        std::string model_directory, cache_directory;
        std::string snapshot_directory;
        unsigned scan_seconds{60}, sample_seconds{10};
    };
    using Channels = std::function<bool(std::vector<std::string>*)>;
    using Authorize = std::function<bool(const std::string&)>;
    using Query = std::unordered_map<std::string,std::string>;
    VisualSearchApplicationService(recording::RecordingCatalog&,recording::RecordingReadService&,Options,Channels);
    ~VisualSearchApplicationService();
    void Stop(); // HTTP 요청 drain 뒤 호출. Start/Stop 제어는 application thread 소유.
    ApplicationServiceResult Status(const Authorize&) const;
    ApplicationServiceResult Search(const Query&,const Authorize&);
    ApplicationServiceResult Seek(const Query&,const Authorize&);
    ApplicationServiceResult Evidence(const Query&,const Authorize&,EvidenceApplicationService&);
private:
    Options options_;
    Channels channels_;
    recording::RecordingVisualSource source_;
    std::unique_ptr<analysis::Siglip2Encoder> encoder_;
    std::unique_ptr<recording::VisualIndexWorker> worker_;
    std::atomic<unsigned> requests_{0};
    std::atomic<bool> stopped_{false};
    std::timed_mutex inference_;
    mutable std::mutex coverage_mutex_;
    std::map<std::string,recording::VisualSourceCoverage> coverage_;
};
} // namespace ingress
