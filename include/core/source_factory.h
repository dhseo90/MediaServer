#pragma once

#include <memory>

#include "core/source_worker.h"

namespace core {

std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& source_spec);

}  // namespace core
