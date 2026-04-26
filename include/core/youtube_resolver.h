// 파일 요약: YouTube URL을 GStreamer가 읽을 수 있는 media URL로 해석하는 resolver를 선언한다.
// 동작 요약: yt-dlp 실행 결과와 timeout/error 정보를 구조화한다.
// 동작 요약: 실험실 기능에서만 opt-in으로 사용하는 외부 의존 경로다.
#pragma once

#include <string>

#include "media_types.h"

namespace core {

bool ValidateYouTubeWatchUrl(const std::string& raw_uri, std::string* error_message);
bool ResolveYouTubeSource(const media::SourceSpec& youtube_spec,
                          media::SourceSpec* resolved_source,
                          std::string* error_message);

}  // namespace core
