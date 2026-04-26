// 파일 요약: URL query를 IngressRequest와 SourceSpec으로 바꾸는 파서를 선언한다.
// 동작 요약: file/url/source 파라미터, route codec, 경로 안전성 검증 계약을 제공한다.
// 동작 요약: RTSP와 HTTP/WebRTC endpoint가 같은 요청 해석 로직을 쓰게 한다.
#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace ingress {

std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request,
                                                std::string* error_message = nullptr);
bool IsSupportedPath(const std::string& path);
std::optional<media::SourceSpec> ParseSourceSpecFromPath(const std::string& path);

}  // namespace ingress
