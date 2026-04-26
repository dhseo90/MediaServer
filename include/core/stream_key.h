// 파일 요약: SourceSpec을 dedup 가능한 canonical key로 바꾸는 함수를 선언한다.
// 동작 요약: 파일/URL/WebRTC/YouTube source 표현을 안정적인 문자열 key로 정규화한다.
// 동작 요약: StreamRegistry의 map key 정책을 외부에 노출한다.
#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace core {

using StreamKey = std::string;

std::string CanonicalizeSourceUri(media::SourceSpec::Kind kind, const std::string& uri);
StreamKey BuildStreamKey(const media::SourceSpec& spec);

}  // namespace core
