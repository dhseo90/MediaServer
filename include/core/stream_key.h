#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace core {

using StreamKey = std::string;

std::string CanonicalizeSourceUri(media::SourceSpec::Kind kind, const std::string& uri);
StreamKey BuildStreamKey(const media::SourceSpec& spec);

}  // namespace core
