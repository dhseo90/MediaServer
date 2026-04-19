#pragma once

#include <string>

#include "ingress/rtsp_request_context.h"
#include "media_types.h"

namespace ingress {

std::string BuildFactoryLaunch(VideoCodec video_codec, media::CodecId audio_codec);
std::string BuildSourceUriForDecodeBin(const media::SourceSpec& spec);
bool ShouldLoopOnEos(const media::SourceSpec& spec);

}  // namespace ingress
