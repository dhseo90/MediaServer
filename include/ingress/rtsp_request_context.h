// 파일 요약: RTSP URI에서 route/query/client 정보를 추출하는 helper를 선언한다.
// 동작 요약: GStreamer RTSP server callback에서 내부 IngressRequest를 만들기 위한 계약이다.
// 동작 요약: 요청 path와 query parsing을 RTSP 구현 밖에서도 테스트 가능하게 분리한다.
#pragma once

#include <optional>
#include <string>
#include <unordered_map>

#include "media_types.h"

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
