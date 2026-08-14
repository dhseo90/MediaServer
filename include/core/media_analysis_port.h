// 파일 요약: core-media가 analysis 구현을 알지 않고 pipeline 분석 기능을 요청하는 port를 선언한다.
// 동작 요약: opaque pipeline attachment와 RTSP prepare/release 수명만 core 계약으로 노출한다.
#pragma once

#include <cstdint>
#include <functional>
#include <string>

#include "media_types.h"

namespace core {

using SourcePtsResolver = std::function<std::int64_t(std::int64_t normalized_pts)>;
using MediaPipelineAttachment = std::function<bool(void* pipeline, std::string* error_message)>;
using MediaPipelineAttachmentFactory = std::function<MediaPipelineAttachment(SourcePtsResolver)>;

struct RtspAnalysisBinding {
    bool requested{false};
    bool ok{true};
    std::string message;
    std::string tap_id;
    MediaPipelineAttachmentFactory make_pipeline_attachment;
};

class MediaAnalysisPort {
public:
    virtual ~MediaAnalysisPort() = default;

    virtual bool PrepareRtspRequest(media::IngressRequest* request,
                                    std::string* error_message) = 0;
    virtual RtspAnalysisBinding PrepareRtsp(const media::IngressRequest& request) = 0;
    virtual void DetachRtsp(const std::string& tap_id) = 0;
};

}  // namespace core
