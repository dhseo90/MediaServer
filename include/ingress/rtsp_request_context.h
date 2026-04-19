#pragma once

#include <optional>
#include <string>
#include <unordered_map>

#include "media_types.h"
#include "stdafx.h"

#if MEDIA_SERVER_USE_GSTREAMER
struct _GstRTSPUrl;
using GstRTSPUrl = _GstRTSPUrl;
#endif

namespace ingress {

enum class VideoCodec {
    H264,
    H265,
};

const char* CodecName(VideoCodec codec);
VideoCodec CodecFromPath(const std::string& path, const std::string& route);
media::CodecId AudioCodecFromPath(const std::string& path, const std::string& route);
std::unordered_map<std::string, std::string> ParseRtspQuery(const char* query_raw);

#if MEDIA_SERVER_USE_GSTREAMER
std::optional<media::IngressRequest> BuildRequestFromRtspUrl(const GstRTSPUrl* uri, const std::string& route);
#endif

}  // namespace ingress
