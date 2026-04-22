// 파일 용도: SourceSpec에 맞는 File/RTSP/WebRTC/URI SourceWorker 생성 함수를 선언한다.
#pragma once

#include <memory>

#include "core/source_worker.h"

namespace core {

std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& source_spec);

}  // namespace core
