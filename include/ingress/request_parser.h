// 파일 용도: RTSP/WebRTC URL query를 IngressRequest와 SourceSpec으로 변환하는 파서를 선언한다.
#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace ingress {

std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request,
                                                std::string* error_message = nullptr);
bool IsSupportedPath(const std::string& path);
std::optional<media::SourceSpec> ParseSourceSpecFromPath(const std::string& path);

}  // namespace ingress
