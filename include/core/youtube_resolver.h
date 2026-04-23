// 파일 용도: YouTube watch/live URL을 GStreamer가 읽을 수 있는 HTTP/HLS media URL로 변환하는 resolver를 선언한다.
#pragma once

#include <string>

#include "media_types.h"

namespace core {

bool ResolveYouTubeSource(const media::SourceSpec& youtube_spec,
                          media::SourceSpec* resolved_source,
                          std::string* error_message);

}  // namespace core
