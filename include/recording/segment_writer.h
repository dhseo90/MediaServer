// 파일 요약: encoded packet을 녹화 segment로 만드는 기술 중립 port를 선언한다.
// 동작 요약: GStreamer 세부를 숨기고 descriptor·packet·finalize callback만 노출한다.
#pragma once

#include <cstdint>
#include <functional>
#include <string>

#include "media_types.h"
#include "recording/recording_contracts.h"

namespace recording {

class SegmentWriter {
public:
    using FinalizedCallback = std::function<void(RecordingSegmentV1, std::string media_path)>;
    virtual ~SegmentWriter() = default;
    virtual bool Start(const std::string& channel_id,
                       const std::string& stream_epoch_id,
                       const media::StreamDescriptor& descriptor,
                       FinalizedCallback on_finalized,
                       std::string* error) = 0;
    virtual void Push(const media::Packet& packet, std::int64_t observed_utc_ms) = 0;
    virtual void Stop() = 0;
};

}  // namespace recording
