#pragma once

#include "media_types.h"
#include "stdafx.h"

namespace ingress {

std::optional<media::SourceSpec> ParseSourceSpec(const media::IngressRequest& request);
bool IsSupportedPath(const std::string& path);
std::optional<media::SourceSpec> ParseSourceSpecFromPath(const std::string& path);

}  // namespace ingress
