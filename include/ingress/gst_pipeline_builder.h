// 파일 용도: RTSP egress와 source decode용 GStreamer launch 문자열 생성 함수를 선언한다.
#pragma once

#include <string>

#include "ingress/rtsp_request_context.h"
#include "media_types.h"

namespace ingress {

std::string BuildFactoryLaunch(VideoCodec video_codec, media::CodecId audio_codec);
std::string BuildSourceUriForDecodeBin(const media::SourceSpec& spec);
bool ShouldLoopOnEos(const media::SourceSpec& spec);

}  // namespace ingress
