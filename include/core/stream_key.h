// 파일 용도: 동일 원본 소스 dedup에 쓰는 canonical stream key 생성 함수를 선언한다.
#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace core {

using StreamKey = std::string;

std::string CanonicalizeSourceUri(media::SourceSpec::Kind kind, const std::string& uri);
StreamKey BuildStreamKey(const media::SourceSpec& spec);

}  // namespace core
