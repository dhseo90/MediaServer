#pragma once

#include "stdafx.h"

namespace media {

struct IngressRequest {
    std::string protocol;
    std::string path;
    std::unordered_map<std::string, std::string> query;
    std::string client_id;
};

struct SourceSpec {
    enum class Kind { Rtsp, File, WebRtc, Hls, Http, Youtube };
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
    std::vector<TrackInfo> tracks;
    bool is_live{false};
};

struct MediaSample {
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
