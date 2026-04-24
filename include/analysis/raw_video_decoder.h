// 파일 용도: 분석 전용으로 compressed video packet을 raw frame으로 변환하는 decoder 인터페이스를 선언한다.
#pragma once

#include "analysis/analysis_types.h"
#include "media_types.h"

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
