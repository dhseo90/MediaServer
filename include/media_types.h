// 파일 요약: 서버 전체가 공유하는 미디어/요청 타입을 정의한다.
// 동작 요약: codec, route, source spec, track descriptor, packet, ingress request 구조체를 담는다.
// 동작 요약: core/ingress/analysis 모듈 사이의 공통 계약 역할을 한다.
#pragma once

#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

namespace media {

struct IngressRequest {
    // 클라이언트가 MediaServer에 요청한 앞단 프로토콜/route/query/client id를 담는다.
    std::string protocol;
    std::string path;
    std::unordered_map<std::string, std::string> query;
    std::string client_id;
};

struct SourceSpec {
    // MediaServer가 원본 소스를 어떤 방식으로 읽을지 결정하는 뒷단 프로토콜 정보다.
    enum class Kind { Rtsp, File, WebRtc, Whep, Hls, Http, Youtube };
    Kind kind;
    std::string uri;
};

enum class MediaKind {
    Video,
    Audio,
    Data,
};

enum class CodecId {
    Unknown,
    VP8,
    H264,
    H265,
    AAC,
    Opus,
    PCMU,
    PCMALaw,
};

struct TrackInfo {
    std::string track_id;
    MediaKind kind{MediaKind::Video};
    CodecId codec{CodecId::Unknown};
    std::string codec_name;
    std::string caps_string;
    int clock_rate{0};
    int channels{0};
};

struct StreamDescriptor {
    // SourceWorker가 발견한 트랙 목록이다. egress는 이 정보로 appsrc caps와 변환 경로를 만든다.
    std::vector<TrackInfo> tracks;
    bool is_live{false};
};

struct MediaSample {
    // SourceWorker가 fan-out하는 최소 미디어 단위다. payload는 codec elementary stream 형태를 유지한다.
    MediaKind kind{MediaKind::Video};
    CodecId codec{CodecId::Unknown};
    std::string track_id;
    bool is_key_frame{false};
    std::int64_t pts{0};
    std::int64_t dts{0};
    std::vector<unsigned char> payload;
};

using Packet = MediaSample;

inline std::string ToString(SourceSpec::Kind kind) {
    switch (kind) {
        case SourceSpec::Kind::Rtsp:
            return "rtsp";
        case SourceSpec::Kind::File:
            return "file";
        case SourceSpec::Kind::WebRtc:
            return "webrtc";
        case SourceSpec::Kind::Whep:
            return "whep";
        case SourceSpec::Kind::Hls:
            return "hls";
        case SourceSpec::Kind::Http:
            return "http";
        case SourceSpec::Kind::Youtube:
            return "youtube";
    }
    return "unknown";
}

inline std::string ToString(MediaKind kind) {
    switch (kind) {
        case MediaKind::Video:
            return "video";
        case MediaKind::Audio:
            return "audio";
        case MediaKind::Data:
            return "data";
    }
    return "unknown";
}

inline std::string ToString(CodecId codec) {
    switch (codec) {
        case CodecId::Unknown:
            return "unknown";
        case CodecId::VP8:
            return "vp8";
        case CodecId::H264:
            return "h264";
        case CodecId::H265:
            return "h265";
        case CodecId::AAC:
            return "aac";
        case CodecId::Opus:
            return "opus";
        case CodecId::PCMU:
            return "pcmu";
        case CodecId::PCMALaw:
            return "pcma";
    }
    return "unknown";
}

}  // namespace media
