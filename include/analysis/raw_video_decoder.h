// 파일 요약: compressed video packet을 RawVideoFrame으로 디코딩하는 인터페이스를 선언한다.
// 동작 요약: decoder callback, start/stop, decode packet API로 analysis 전용 raw frame 흐름을 제공한다.
// 동작 요약: GStreamer 미사용 빌드에서는 생성 실패를 명확히 반환한다.
#pragma once

#include <functional>
#include <memory>

#include "analysis/analysis_types.h"
#include "core/media_packet_contract.h"

namespace analysis {

class RawVideoDecoder {
public:
    struct Config {
        std::string source_key;
        media::TrackInfo track;
    };

    using FrameCallback = std::function<void(RawVideoFrame)>;

    virtual ~RawVideoDecoder() = default;

    virtual bool Start(std::string* error_message) = 0;
    virtual void Stop() = 0;
    virtual bool PushPacket(const media::Packet& packet, std::string* error_message) = 0;
    virtual bool IsRunning() const = 0;
};

std::unique_ptr<RawVideoDecoder> CreateRawVideoDecoder(RawVideoDecoder::Config config,
                                                       RawVideoDecoder::FrameCallback callback);

}  // namespace analysis
