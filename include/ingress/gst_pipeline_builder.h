// 파일 요약: GStreamer launch 문자열 생성 API를 선언한다.
// 동작 요약: RTSP egress route와 source decode 경로에 필요한 pipeline builder 함수를 제공한다.
// 동작 요약: codec별 pipeline 조합 정책을 ingress 구현에서 분리한다.
#pragma once

#include <string>

#include "ingress/rtsp_request_context.h"
#include "media_types.h"

namespace ingress {

std::string BuildFactoryLaunch(VideoCodec video_codec, media::CodecId audio_codec);
std::string BuildSourceUriForDecodeBin(const media::SourceSpec& spec);
bool ShouldLoopOnEos(const media::SourceSpec& spec);

}  // namespace ingress
